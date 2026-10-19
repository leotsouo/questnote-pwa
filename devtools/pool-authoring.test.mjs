import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { buildPoolContent, authorPoolWorkspace, fillTemplate, AuthoringError } from '../scripts/lib/poolAuthoring.mjs';
import { renderCodexHandoff, writeCodexHandoff } from '../scripts/lib/poolWorkflow.mjs';

const repo = path.resolve(import.meta.dirname, '..');
const sunward = path.join(repo, 'content/pet-series/sunward_letters');
const fixture = path.join(import.meta.dirname, 'fixtures/pool-authoring/sunward_letters.authoring.json');
const read = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
const text = (value) => `${JSON.stringify(value, null, 2)}\n`;

async function inputs() {
  return {
    authoring: await read(fixture),
    plan: await read(path.join(sunward, 'plan.json')),
    brief: await read(path.join(sunward, 'brief.json')),
  };
}

test('generic authoring reproduces the released Sunward content byte for byte', async () => {
  const base = await inputs();
  const content = buildPoolContent({
    ...base,
    existingEcosystem: await read(path.join(sunward, 'ecosystem.json')),
    existingPrompts: await read(path.join(sunward, 'prompts.json')),
  });
  for (const name of ['pets.json', 'pets-lore.json', 'pool.json', 'ecosystem.json', 'prompts.json']) {
    assert.equal(text(content[name]), await fs.readFile(path.join(sunward, name), 'utf8'), name);
  }
});

test('fresh prompts carry the template provenance with the actual prompt filled in', async () => {
  const content = buildPoolContent(await inputs());
  const released = await read(path.join(sunward, 'prompts.json'));
  for (const [petId, entry] of Object.entries(content['prompts.json'].prompts)) {
    assert.equal(entry.prompt, released.prompts[petId].prompt, petId);
    assert.equal(entry.provenance.actualPrompt, entry.prompt);
    assert.equal(entry.provenance.status, 'prompt-reviewed');
  }
});

test('template errors, roster mismatches and a wrong pool filter are rejected', async () => {
  assert.equal(fillTemplate('{a}和{b}', { a: '甲', b: '乙' }, 'x'), '甲和乙');
  assert.throws(() => fillTemplate('{missing}', {}, 'x'), AuthoringError);

  const base = await inputs();
  const typo = structuredClone(base.authoring);
  typo.templates.description = '{titel}';
  assert.throws(() => buildPoolContent({ ...base, authoring: typo }), /unknown placeholder \{titel\}/);

  const missingPet = structuredClone(base.authoring);
  delete missingPet.pets[base.plan.pets[0].petId];
  assert.throws(() => buildPoolContent({ ...base, authoring: missingPet }), /must match plan\.pets/);

  const missingField = structuredClone(base.authoring);
  delete missingField.pets[base.plan.pets[0].petId].promise;
  assert.throws(() => buildPoolContent({ ...base, authoring: missingField }), /missing promise/);

  const wrongFilter = structuredClone(base.authoring);
  wrongFilter.pool.petFilter = { poolTags: ['standard'] };
  assert.throws(() => buildPoolContent({ ...base, authoring: wrongFilter }), /petFilter/);
});

test('author writes only changed files in a workspace and is idempotent', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'questnote-authoring-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const dir = path.join(root, 'content/pet-series/sunward_letters');
  await fs.mkdir(dir, { recursive: true });
  for (const name of ['brief.json', 'plan.json']) await fs.copyFile(path.join(sunward, name), path.join(dir, name));
  await fs.copyFile(fixture, path.join(dir, 'authoring.json'));

  const dry = await authorPoolWorkspace(root, 'sunward_letters', { dryRun: true });
  assert.deepEqual(dry.changed.sort(), ['ecosystem.json', 'pets-lore.json', 'pets.json', 'pool.json', 'prompts.json']);
  await assert.rejects(fs.access(path.join(dir, 'pets.json')));

  const first = await authorPoolWorkspace(root, 'sunward_letters');
  assert.equal(first.pets, 12);
  assert.equal(await fs.readFile(path.join(dir, 'pets.json'), 'utf8'), await fs.readFile(path.join(sunward, 'pets.json'), 'utf8'));
  assert.deepEqual((await authorPoolWorkspace(root, 'sunward_letters')).changed, []);
  await assert.rejects(authorPoolWorkspace(root, '../escape'), /snake_case/);
});

test('Codex handoff lists every card with its output path, prompt and the no-extra-cost rules', async (t) => {
  const base = await inputs();
  const prompts = await read(path.join(sunward, 'prompts.json'));
  const markdown = renderCodexHandoff({ id: 'sunward_letters', brief: base.brief, plan: base.plan, prompts, authoring: base.authoring });
  for (const pet of base.plan.pets) {
    assert.ok(markdown.includes(`content/pet-series/sunward_letters/images/${pet.petId}.png`), pet.petId);
    assert.ok(markdown.includes(prompts.prompts[pet.petId].prompt), pet.petId);
  }
  assert.match(markdown, /不要呼叫 API/);
  assert.match(markdown, /outputSha256/);
  assert.doesNotMatch(markdown, /新探險地區插畫/, 'reuse decision has no region section');

  const withRegion = structuredClone(base.authoring);
  withRegion.ecosystem.expedition = { decision: 'add', reason: 'x', areas: [{ id: 'rain_ford', name: '雨渡' }] };
  const regionMarkdown = renderCodexHandoff({ id: 'sunward_letters', brief: base.brief, plan: base.plan, prompts, authoring: withRegion });
  assert.match(regionMarkdown, /assets\/expeditions\/rain_ford\.webp/);
  assert.match(regionMarkdown, /缺少地區提示詞/);

  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'questnote-handoff-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const dir = path.join(root, 'content/pet-series/sunward_letters');
  await fs.mkdir(dir, { recursive: true });
  for (const name of ['brief.json', 'plan.json', 'prompts.json']) await fs.copyFile(path.join(sunward, name), path.join(dir, name));
  const written = await writeCodexHandoff(root, 'sunward_letters');
  assert.equal(written.ok, true);
  assert.equal(written.file, 'content/pet-series/sunward_letters/CODEX-IMAGES.md');
  assert.equal(written.cards, 12);
});

test('review-page builds a fixed-path folder that loads the App two levels up and never touches player services', async (t) => {
  const { writeReviewPage } = await import('../scripts/lib/poolWorkflow.mjs');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'questnote-review-page-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'devtools'));
  for (const name of ['pool-animation-review.html', 'pool-animation-review.js']) {
    await fs.copyFile(path.join(import.meta.dirname, name), path.join(root, 'devtools', name));
  }
  const result = await writeReviewPage(root, 'sunward_letters', { out: 'out/review' });
  assert.equal(result.dir, 'out/review');
  assert.equal(result.deploy, 'npm run preview:deploy -- --review-dir out/review');
  assert.deepEqual(await read(path.join(root, 'out/review/review-config.json')), { pool: 'sunward_letters', appRoot: '../..' });
  assert.match(await fs.readFile(path.join(root, 'out/review/index.html'), 'utf8'), /src="pool-animation-review\.js"/);
  await assert.rejects(writeReviewPage(root, '../x'), /pool ID/);

  const source = await fs.readFile(path.join(import.meta.dirname, 'pool-animation-review.js'), 'utf8');
  const imports = [...source.matchAll(/import\(`\$\{(?:config\.)?appRoot\}\/src\/([^`]+)`\)/g)].map((match) => match[1]).sort();
  assert.deepEqual(imports, ['encounterCeremony.js', 'loreService.js', 'petPoolFilter.js', 'releaseProfile.js',
    'summonRevealService.js', 'themeRegistry.js', 'themedSummonController.js']);
  assert.doesNotMatch(source, /gachaService|gachaTransaction|collectionService|walletService|db\.js/);
  assert.match(source, /indexedDB\.open = /);
});
