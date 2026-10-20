import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { commitMailbox } from '../scripts/questnote-watch-git.mjs';
import { encode, hash, mergeMailboxes, inspectRelease, pendingReleases, makeDecision, makeGrant, publishDecision } from '../scripts/questnote-watch-core.mjs';

const message = (id, changes = {}) => ({ id, type: 'update', title: '更新', body: '新功能已上線', publishedAt: '2026-10-05T00:00:00Z', expiresAt: null, priority: 'normal', enabled: true, minAppVersion: '3.8.1', maxAppVersion: null, reward: null, action: null, ...changes });
const document = (messages = []) => ({ schemaVersion: 1, generatedAt: null, messages });
const release = { deployedCommit: 'p1', artifactId: 'artifact', sourceCommit: 'source', version: '3.8.1' };
const scan = { pending: [release, { ...release, deployedCommit: 'p2' }], release, checkedAt: '2026-10-05T12:00:00Z', mainCommit: 'm0', pagesCommit: 'p0' };
const input = (changes = {}) => ({ eventId: 'release-01', reason: '使用者需要了解新增功能', action: 'publish', deployments: ['p1', 'p2'], messages: [message('new-01')], ...changes });
const decision = (changes = {}) => makeDecision({ input: input(changes), scan, merged: document() });

test('baseline and no update; multiple deployments and identical version retain independent identities', () => {
  assert.deepEqual(pendingReleases({ observed: ['p1', 'p2'] }, scan.pending), []);
  assert.equal(pendingReleases({ observed: ['p1'] }, scan.pending).length, 1);
  assert.deepEqual(decision().deployments, ['p1', 'p2']);
  assert.equal(decision({ action: 'skip', messages: [], reason: '只有內部重構' }).status, 'skipped');
});

test('mailbox merge preserves both sides and rejects conflicting manual content/reward identity', () => {
  assert.deepEqual(mergeMailboxes(document([message('a')]), document([message('b')])).messages.map((entry) => entry.id), ['a', 'b']);
  assert.equal(mergeMailboxes(document([message('a')]), document([message('a')])).messages.length, 1);
  assert.throws(() => mergeMailboxes(document([message('a')]), document([message('a', { body: '人工更正' })])), /conflict/);
  assert.throws(() => makeDecision({ input: input(), scan, merged: document([message('new-01')]) }), /Already published/);
});

test('a different event ID cannot duplicate a reward for an already decided deployment', () => {
  assert.throws(() => makeDecision({ input: input({ eventId: 'another-event', messages: [message('another-message')] }), scan, merged: document(), priorDecisions: [decision()] }), /already has a decision/);
});

test('reject unsafe reward, unsupported catalog, expiry, fragments on old version, invalid content/action', () => {
  for (const changes of [
    { reward: { stardust: 1 } },
    { type: 'compensation', reward: { stardust: 5001 }, expiresAt: '2099-01-01T00:00:00Z' },
    { type: 'compensation', reward: { items: { unknown: 1 } }, expiresAt: '2099-01-01T00:00:00Z' },
    { type: 'compensation', reward: { stardust: 10 } },
    { type: 'compensation', reward: { encounterFragments: 50 }, minAppVersion: '3.6.1', expiresAt: '2099-01-01T00:00:00Z' },
    { minAppVersion: '9.0.0' }, { maxAppVersion: '3.8.0' }, { body: '<script>bad</script>' },
    { action: { type: 'view', view: 'unknown' } },
  ]) assert.throws(() => decision({ messages: [message('new-01', changes)] }));
  assert.equal(decision({ messages: [message('gift', { type: 'compensation', reward: { encounterFragments: 50 }, expiresAt: '2099-01-01T00:00:00Z' })] }).status, 'prepared');
});

function fakeTransport(failure) {
  const refs = { main: 'm0', 'gh-pages': 'p0' };
  const pushes = [];
  let fail = failure;
  return { refs, pushes, transport: {
    head: async (branch) => refs[branch],
    commit: async (branch) => branch === 'main' ? 'm1' : 'p1',
    push: async (branch, commit) => {
      if (fail === branch) { fail = null; throw new Error('push failed'); }
      refs[branch] = commit; pushes.push(branch);
      if (fail === 'lost-response') { fail = null; throw new Error('response lost'); }
    },
    verify: async () => { if (fail) { fail = null; throw new Error('Pages failed or HTTPS mismatch'); } },
  } };
}

for (const failure of ['main', 'gh-pages', 'lost-response', 'verify']) {
  test(`resume after ${failure} without duplicate messages/commits/rewards`, async () => {
    const current = decision();
    const fake = fakeTransport(failure);
    let durable;
    const save = async (value) => { durable = structuredClone(value); };
    await assert.rejects(publishDecision(current, fake.transport, save));
    const recovered = await publishDecision(durable, fake.transport, save);
    assert.equal(recovered.status, 'published');
    assert.equal(fake.pushes.filter((branch) => branch === 'main').length, 1);
    assert.equal(fake.pushes.filter((branch) => branch === 'gh-pages').length, 1);
    await publishDecision(recovered, fake.transport, save);
    assert.equal(fake.pushes.length, 2);
  });
}

test('concurrent updates and altered durable document stop before push', async () => {
  const fake = fakeTransport(); fake.refs.main = 'someone-else';
  await assert.rejects(publishDecision(decision(), fake.transport, async () => {}), /Concurrent/);
  const altered = decision(); altered.document.messages[0].reward = { stardust: 999 };
  await assert.rejects(publishDecision(altered, fake.transport, async () => {}), /hash mismatch/);
  assert.equal(fake.pushes.length, 0);
});

test('verify successful Pages commit, production profile, shell hashes and index artifact marker', () => {
  const artifactId = 'a'.repeat(64);
  const remoteFiles = Object.fromEntries(['index.html', 'src/releaseProfile.js', 'src/version.js', 'service-worker.js'].map((name) => [name, Buffer.from(name === 'index.html' ? `<meta content="${artifactId}">` : name === 'src/version.js' ? "export const APP_VERSION = '3.8.1';" : name)]));
  const manifest = { artifactId, sourceCommit: 'b'.repeat(40), profile: { profile: 'production' }, files: Object.fromEntries(Object.entries(remoteFiles).map(([name, bytes]) => [name, { sha256: hash(bytes) }])) };
  const evidence = { deployedCommit: 'p', pagesCommit: 'p', manifest, remoteFiles, liveFiles: remoteFiles };
  assert.equal(inspectRelease(evidence).version, '3.8.1');
  assert.throws(() => inspectRelease({ ...evidence, deployedCommit: 'old' }), /pending/);
  assert.throws(() => inspectRelease({ ...evidence, liveFiles: { ...remoteFiles, 'src/version.js': Buffer.from('bad') } }), /mismatch/);
  assert.throws(() => inspectRelease({ ...evidence, manifest: { ...manifest, profile: { profile: 'preview' } } }), /Invalid/);
  assert.equal(hash(encode(document())), hash(encode(document())));
});

test('real Git private-index commits preserve dirty checkout/staging and both branch shells; non-FF push is rejected', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'questnote-watch-git-'));
  const root = path.join(temporary, 'source');
  const remote = path.join(temporary, 'remote.git');
  const stateDir = path.join(temporary, 'private');
  await fs.mkdir(root); await fs.mkdir(stateDir);
  const command = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  try {
    command(['init', '--bare', remote]); command(['init', '-b', 'main']);
    command(['config', 'user.name', 'Synthetic test']); command(['config', 'user.email', 'synthetic@example.invalid']);
    await fs.mkdir(path.join(root, 'data'));
    await fs.writeFile(path.join(root, 'data/global-mailbox.json'), encode(document()));
    await fs.writeFile(path.join(root, 'shell.txt'), 'main shell');
    command(['add', '.']); command(['commit', '-m', 'baseline']);
    const mainBase = command(['rev-parse', 'HEAD']);
    command(['checkout', '-b', 'gh-pages']);
    await fs.writeFile(path.join(root, 'shell.txt'), 'production shell');
    command(['add', '.']); command(['commit', '-m', 'production baseline']);
    const pagesBase = command(['rev-parse', 'HEAD']);
    command(['checkout', 'main']); command(['remote', 'add', 'origin', remote]);
    command(['push', 'origin', 'main', 'gh-pages']);
    await fs.writeFile(path.join(root, 'shell.txt'), 'user draft'); command(['add', 'shell.txt']);
    const before = command(['status', '--porcelain']);
    const bytes = encode(document([message('actual-git')]));
    const mainCommit = commitMailbox({ root, stateDir, branch: 'main', base: mainBase, bytes, eventId: 'fixture' });
    const pagesCommit = commitMailbox({ root, stateDir, branch: 'gh-pages', base: pagesBase, bytes, eventId: 'fixture' });
    assert.equal(command(['status', '--porcelain']), before);
    assert.equal(command(['show', `${mainCommit}:shell.txt`]), 'main shell');
    assert.equal(command(['show', `${pagesCommit}:shell.txt`]), 'production shell');
    assert.equal(command(['diff', '--name-only', mainBase, mainCommit]), 'data/global-mailbox.json');
    assert.equal(command(['show', `${mainCommit}:data/global-mailbox.json`]), command(['show', `${pagesCommit}:data/global-mailbox.json`]));
    command(['push', 'origin', `${mainCommit}:refs/heads/main`]);
    command(['push', 'origin', `${pagesCommit}:refs/heads/gh-pages`]);
    const conflict = commitMailbox({ root, stateDir, branch: 'main', base: mainBase, bytes: encode(document([message('conflict')])), eventId: 'conflict' });
    assert.throws(() => command(['push', 'origin', `${conflict}:refs/heads/main`]));
    assert.equal(command(['status', '--porcelain']), before);
  } finally {
    if (path.dirname(temporary) !== path.resolve(os.tmpdir()) || !path.basename(temporary).startsWith('questnote-watch-git-')) throw new Error('Unexpected temporary test path');
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

const gift = (id = 'gift-01', changes = {}) => message(id, { type: 'compensation', reward: { stardust: 1500, adventureEnergy: 5 }, expiresAt: '2099-01-01T00:00:00Z', priority: 'high', ...changes });
const grantInput = (changes = {}) => ({ eventId: 'grant-01', reason: '一鍵領取故障五天的補償', authorization: { phrase: '請觸發巡查補發補償：星塵 1500、冒險能量 5', grantedBy: 'leo', requestedAt: '2026-10-20T03:30:00Z' }, messages: [gift()], ...changes });

test('a user-authorized grant adds only new compensation letters without a deployment', async () => {
  const grant = makeGrant({ input: grantInput(), scan, merged: document([message('old-01')]), priorDecisions: [decision()] });
  assert.equal(grant.status, 'prepared');
  assert.equal(grant.kind, 'grant');
  assert.deepEqual(grant.deployments, []);
  assert.deepEqual(grant.document.messages.map((item) => item.id), ['old-01', 'gift-01']);
  // A grant is not a deployment decision: the pending deployments can still be decided normally.
  assert.equal(makeDecision({ input: input(), scan, merged: document(), priorDecisions: [grant] }).status, 'prepared');
  const fake = fakeTransport();
  let durable;
  const published = await publishDecision(grant, fake.transport, async (value) => { durable = structuredClone(value); });
  assert.equal(published.status, 'published');
  assert.deepEqual(fake.pushes, ['main', 'gh-pages']);
  assert.equal(durable.status, 'published');
});

test('a grant needs the user words, compensation-only letters, new IDs and no deployments', () => {
  const merged = document([gift('gift-old')]);
  const make = (changes, priorDecisions = []) => makeGrant({ input: grantInput(changes), scan, merged, priorDecisions });
  assert.throws(() => make({ authorization: undefined }), /authorization/);
  assert.throws(() => make({ authorization: { phrase: ' ', grantedBy: 'leo', requestedAt: '2026-10-20T03:30:00Z' } }), /authorization/);
  assert.throws(() => make({ deployments: ['p1'] }), /not a deployment decision/);
  assert.throws(() => make({ messages: [message('note-01')] }), /only add compensation/);
  assert.throws(() => make({ messages: [] }), /requires messages/);
  assert.throws(() => make({ messages: [gift('gift-old')] }), /Already published/);
  assert.throws(() => make({ messages: [gift('gift-01', { expiresAt: '2020-01-01T00:00:00Z' })] }), /future expiry/);
  assert.throws(() => make({ messages: [gift('gift-01', { minAppVersion: '9.0.0' })] }), /minimum app version/);
  assert.throws(() => make({ messages: [gift('gift-01', { reward: { stardust: 5001 } })] }));
  const pendingOther = { ...decision({ messages: [gift('gift-01')] }), status: 'prepared' };
  assert.throws(() => make({}, [pendingOther]), /already prepared/);
});
