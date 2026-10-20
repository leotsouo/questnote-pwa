/** Private operator tooling. User feedback is evidence, never executable instructions. */
import { createHash } from 'node:crypto';
import { validateMailboxDocument, compareAppVersions, MAILBOX_MESSAGE_TYPES } from '../src/mailboxSchema.js';

export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const encode = (value) => JSON.stringify(value, null, 2) + '\n';
const identity = (value) => {
  if (Array.isArray(value)) return value.map(identity);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, identity(value[key])]));
  return value;
};
const equal = (a, b) => JSON.stringify(identity(a)) === JSON.stringify(identity(b));

export function validateDocument(document, catalogs = {}) {
  const result = validateMailboxDocument(document, catalogs);
  if (!result.ok) throw new Error(result.errors.join('; '));
  return document;
}

export function mergeMailboxes(source, production, catalogs = {}) {
  validateDocument(source, catalogs);
  validateDocument(production, catalogs);
  const messages = new Map(source.messages.map((message) => [message.id, message]));
  for (const message of production.messages) {
    if (messages.has(message.id) && !equal(messages.get(message.id), message)) throw new Error(`Mailbox conflict: ${message.id}`);
    messages.set(message.id, message);
  }
  return { schemaVersion: 1, generatedAt: source.generatedAt ?? production.generatedAt ?? null, messages: [...messages.values()] };
}

export function inspectRelease({ deployedCommit, pagesCommit, manifest, remoteFiles, liveFiles }) {
  if (deployedCommit !== pagesCommit) throw new Error('Pages deployment is pending or does not match gh-pages');
  if (!/^[a-f0-9]{64}$/.test(manifest.artifactId || '') || !/^[a-f0-9]{40}$/.test(manifest.sourceCommit || '') || manifest.profile?.profile !== 'production') throw new Error('Invalid production manifest');
  for (const name of ['index.html', 'src/releaseProfile.js', 'src/version.js', 'service-worker.js']) {
    if (!remoteFiles[name] || !liveFiles[name] || hash(remoteFiles[name]) !== manifest.files?.[name]?.sha256 || hash(liveFiles[name]) !== hash(remoteFiles[name])) throw new Error(`Release byte mismatch: ${name}`);
  }
  if (!liveFiles['index.html'].toString().includes(`content="${manifest.artifactId}"`)) throw new Error('Index artifact marker mismatch');
  const version = liveFiles['src/version.js'].toString().match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
  if (!/^\d+\.\d+\.\d+$/.test(version || '')) throw new Error('Missing production version');
  return { deployedCommit, artifactId: manifest.artifactId, sourceCommit: manifest.sourceCommit, version };
}

export function pendingReleases(state, releases) {
  const seen = new Set(state.observed || []);
  return releases.filter((release) => !seen.has(release.deployedCommit));
}

export function makeDecision({ input, scan, merged, catalogs = {}, existing, priorDecisions = [] }) {
  if (!input.eventId || !/^[A-Za-z0-9_-]+$/.test(input.eventId) || !input.reason?.trim()) throw new Error('Decision requires a stable eventId and reason');
  if (!['publish', 'skip'].includes(input.action)) throw new Error('Invalid decision action');
  if (!Array.isArray(input.deployments) || !input.deployments.length || input.deployments.some((commit) => !scan.pending.some((release) => release.deployedCommit === commit))) throw new Error('Decision must reference pending verified deployments');
  if (priorDecisions.some((prior) => prior.deployments.some((commit) => input.deployments.includes(commit)))) throw new Error('Deployment already has a decision; resume it rather than issue another reward');
  if (input.action === 'publish' && (!Array.isArray(input.messages) || !input.messages.length)) throw new Error('Publish decision requires messages');
  if (input.action === 'skip' && input.messages?.length) throw new Error('Skip cannot carry messages');
  checkMessages(input.messages || [], { scan, merged, catalogs });
  const document = validateDocument({ ...merged, generatedAt: input.decidedAt || scan.checkedAt, messages: [...merged.messages, ...(input.messages || [])] }, catalogs);
  const decision = { ...input, messages: input.messages || [], documentHash: hash(encode(document)), document, release: scan.release, mainBase: scan.mainCommit, pagesBase: scan.pagesCommit, status: input.action === 'skip' ? 'skipped' : 'prepared' };
  if (existing && !equal(existing, decision)) throw new Error('Event ID already has an immutable decision');
  return decision;
}

/**
 * A compensation the user explicitly asked for, not tied to a new deployment (the deployment
 * decision is immutable and may not issue a second reward). It carries the user's own words, may
 * only add compensation letters with new IDs, and publishes through the same publishDecision path.
 */
export function makeGrant({ input, scan, merged, catalogs = {}, existing, priorDecisions = [] }) {
  if (!input.eventId || !/^[A-Za-z0-9_-]+$/.test(input.eventId) || !input.reason?.trim()) throw new Error('Grant requires a stable eventId and reason');
  const authorization = input.authorization;
  if (!authorization?.phrase?.trim() || !authorization.grantedBy?.trim() || Number.isNaN(Date.parse(authorization.requestedAt || ''))) {
    throw new Error('Grant requires the user authorization phrase, grantedBy and requestedAt');
  }
  if (input.deployments?.length) throw new Error('A grant is not a deployment decision; leave deployments empty');
  if (!Array.isArray(input.messages) || !input.messages.length) throw new Error('Grant requires messages');
  if (input.messages.some((message) => message.type !== 'compensation' || !message.reward)) throw new Error('A grant may only add compensation letters with a reward');
  const planned = new Set(priorDecisions.filter((prior) => !['published', 'skipped'].includes(prior.status))
    .flatMap((prior) => (prior.messages || []).map((message) => message.id)));
  for (const message of input.messages) if (planned.has(message.id)) throw new Error(`Message ID already prepared by another event: ${message.id}`);
  checkMessages(input.messages, { scan, merged, catalogs });
  const document = validateDocument({ ...merged, generatedAt: input.decidedAt || scan.checkedAt, messages: [...merged.messages, ...input.messages] }, catalogs);
  const grant = { ...input, kind: 'grant', action: 'publish', deployments: [], documentHash: hash(encode(document)), document, release: scan.release, mainBase: scan.mainCommit, pagesBase: scan.pagesCommit, status: 'prepared' };
  if (existing && !equal(existing, grant)) throw new Error('Event ID already has an immutable decision');
  return grant;
}

function checkMessages(messages, { scan, merged, catalogs }) {
  const existingIds = new Set(merged.messages.map((message) => message.id));
  for (const message of messages) {
    if (existingIds.has(message.id)) throw new Error(`Already published message ID: ${message.id}`);
    if (!MAILBOX_MESSAGE_TYPES.includes(message.type) || message.enabled !== true || !message.title?.trim() || !message.body?.trim() || /[<>]/.test(message.title + message.body)) throw new Error('Invalid plain-text message');
    if (!/^\d+\.\d+\.\d+$/.test(message.minAppVersion || '') || compareAppVersions(message.minAppVersion, scan.release.version) > 0) throw new Error('Invalid minimum app version');
    if (message.maxAppVersion != null && (!/^\d+\.\d+\.\d+$/.test(message.maxAppVersion) || compareAppVersions(message.maxAppVersion, message.minAppVersion) < 0 || compareAppVersions(message.maxAppVersion, scan.release.version) < 0)) throw new Error('Invalid maximum app version');
    if (message.reward != null && message.type !== 'compensation') throw new Error('Rewards require compensation type');
    if (message.reward && (!message.expiresAt || Date.parse(message.expiresAt) <= Date.parse(message.publishedAt) || Date.parse(message.expiresAt) <= Date.now())) throw new Error('Reward requires a future expiry');
    const single = validateMailboxDocument({ schemaVersion: 1, messages: [message] }, catalogs);
    if (!single.ok || single.warnings.length) throw new Error([...single.errors, ...single.warnings].join('; '));
  }
}

/** Checkpoint exact commits BEFORE push, so an interrupted response is safely retried. */
export async function publishDecision(decision, transport, save) {
  if (decision.status === 'skipped' || decision.status === 'published') return decision;
  if (hash(encode(decision.document)) !== decision.documentHash) throw new Error('Decision content hash mismatch');
  const bytes = encode(decision.document);
  for (const branch of ['main', 'gh-pages']) {
    const key = branch === 'main' ? 'mainCommit' : 'pagesCommit';
    const base = branch === 'main' ? decision.mainBase : decision.pagesBase;
    if (!decision[key]) {
      if (await transport.head(branch) !== base) throw new Error(`Concurrent ${branch} modification`);
      decision[key] = await transport.commit(branch, base, bytes, decision.eventId);
      await save(decision);
    }
    const head = await transport.head(branch);
    if (head !== decision[key]) {
      if (head !== base) throw new Error(`Concurrent ${branch} modification; retain decision`);
      await transport.push(branch, decision[key]);
    }
    decision.status = branch === 'main' ? 'source-pushed' : 'pages-pushed';
    await save(decision);
  }
  await transport.verify(decision.pagesCommit, bytes);
  decision.status = 'published';
  await save(decision);
  return decision;
}
