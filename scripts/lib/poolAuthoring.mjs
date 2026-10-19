/**
 * Generic card-pool authoring: expands one `authoring.json` (per-pet notes plus pool-wide text
 * templates) into the workspace content files that each pool used to need a one-off script for:
 * pets.json, pets-lore.json (with bond stories), pool.json, ecosystem.json and prompts.json.
 * Deterministic: the same authoring.json and plan.json always produce the same bytes.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { validateBondStories } from '../../src/bondStoryCatalog.js';

export const AUTHORING_FILE = 'authoring.json';
const NOTE_FIELDS = ['species', 'element', 'role', 'tags', 'title', 'traits', 'incident', 'change', 'gift', 'line', 'mark', 'action'];
const STORY_FIELDS = ['keepsake', 'place', 'promise'];
const DIALOGUE_KEYS = ['normal', 'urgent', 'important', 'praise', 'idle', 'bondUp'];

export class AuthoringError extends Error {
  constructor(message) { super(message); this.code = 'AUTHORING_INVALID'; }
}

function fail(message) { throw new AuthoringError(message); }

/** Replace every `{key}`; an unknown key is an error so a typo never ships as literal text. */
export function fillTemplate(template, vars, where) {
  if (typeof template !== 'string') fail(`${where}: template must be a string`);
  return template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (match, key) => {
    if (!(key in vars)) fail(`${where}: unknown placeholder {${key}}`);
    return String(vars[key]);
  });
}

function fillAll(value, vars, where) {
  if (typeof value === 'string') return fillTemplate(value, vars, where);
  if (Array.isArray(value)) return value.map((item, index) => fillAll(item, vars, `${where}[${index}]`));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fillAll(item, vars, `${where}.${key}`)]));
  }
  return value;
}

function requireFields(object, fields, where) {
  for (const field of fields) if (object?.[field] === undefined) fail(`${where}: missing ${field}`);
}

function checkAuthoring(authoring, plan) {
  if (authoring?.schemaVersion !== 1) fail('authoring.json: schemaVersion must be 1');
  requireFields(authoring, ['visualTheme', 'templates', 'pets', 'pool', 'ecosystem', 'prompts'], 'authoring.json');
  requireFields(authoring.templates, ['description', 'lore', 'dialogues', 'bondUnlocks', 'specialtyReason', 'bondStory'], 'authoring.templates');
  requireFields(authoring.templates.dialogues, [...DIALOGUE_KEYS, 'summon'], 'authoring.templates.dialogues');
  requireFields(authoring.templates.bondStory, ['title', 'chapterTitles', 'chapterBodies', 'invitation', 'choices', 'ending', 'endingSuffix', 'keepsakeDescription'], 'authoring.templates.bondStory');
  requireFields(authoring.prompts, ['style', 'negative', 'template', 'provenance'], 'authoring.prompts');
  if (!Array.isArray(plan?.pets) || !plan.pets.length) fail('plan.json: pets must be a non-empty array');
  const planIds = plan.pets.map((pet) => pet.petId);
  const noteIds = Object.keys(authoring.pets);
  const missing = planIds.filter((id) => !noteIds.includes(id));
  const extra = noteIds.filter((id) => !planIds.includes(id));
  if (missing.length || extra.length) fail(`authoring.pets must match plan.pets exactly (missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'})`);
  for (const pet of plan.pets) {
    requireFields(pet, ['petId', 'name', 'rarity', 'design'], `plan.pets ${pet.petId}`);
    requireFields(authoring.pets[pet.petId], [...NOTE_FIELDS, ...STORY_FIELDS], `authoring.pets.${pet.petId}`);
  }
}

function buildBondStory(templates, vars, pet, dialogues) {
  const t = templates.bondStory;
  const chapters = [2, 3, 4, 5].map((level, index) => {
    const chapterVars = {
      ...vars,
      bondUnlock: dialogues.bondUnlocks[String(level)],
      praise: dialogues.praise[index],
      normalNext: dialogues.normal[(index + 1) % dialogues.normal.length],
    };
    const where = `bondStory ${pet.id} level ${level}`;
    return {
      level,
      title: fillTemplate(t.chapterTitles[index], chapterVars, where),
      paragraphs: [chapterVars.bondUnlock, fillTemplate(t.chapterBodies[index], chapterVars, where)],
      invitation: fillTemplate(t.invitation, chapterVars, where),
      choices: t.choices.map((choice) => ({ id: choice.id, label: choice.label, reply: fillTemplate(choice.reply, chapterVars, where) })),
      ending: fillTemplate(t.ending, chapterVars, where)
        + fillTemplate(level === 5 ? t.endingSuffix.final : t.endingSuffix.other, chapterVars, where),
    };
  });
  return {
    petId: pet.id,
    title: fillTemplate(t.title, vars, `bondStory ${pet.id}`),
    keepsake: { name: vars.keepsake, description: fillTemplate(t.keepsakeDescription, vars, `bondStory ${pet.id}`) },
    chapters,
  };
}

/** Pure: returns the five content documents. `existingEcosystem` and `existingPrompts` may be null. */
export function buildPoolContent({ authoring, plan, brief, existingEcosystem = null, existingPrompts = null }) {
  checkAuthoring(authoring, plan);
  const poolId = brief.poolId;
  const seriesId = brief.seriesId;
  const { templates } = authoring;
  const petRows = [];
  const loreRows = [];
  const affinities = {};
  const affinityNotes = {};
  const specialties = {};
  const prompts = {};

  for (const entry of plan.pets) {
    const note = authoring.pets[entry.petId];
    const vars = {
      ...note, tags: note.tags.join('、'), traits: note.traits.join('、'),
      petId: entry.petId, name: entry.name, rarity: entry.rarity, poolId, seriesId,
      seriesName: brief.seriesName, placeFirst: note.place.split('、')[0],
    };
    const where = `pet ${entry.petId}`;
    const pet = {
      id: entry.petId, name: entry.name, rarity: entry.rarity, image: `assets/pets/${entry.petId}.png`,
      description: fillTemplate(templates.description, vars, where), poolTags: [poolId], seriesId,
      speciesType: note.species, element: note.element, visualTheme: note.visualTheme || authoring.visualTheme,
      expeditionSpecialty: note.role,
    };
    const lists = fillAll(templates.dialogues, vars, `${where} dialogues`);
    const dialogues = Object.fromEntries([...DIALOGUE_KEYS.map((key) => [key, note.dialogues?.[key] || lists[key]]), ['summon', lists.summon]]);
    const bondUnlocks = fillAll(templates.bondUnlocks, vars, `${where} bondUnlocks`);
    const lore = {
      id: entry.petId, title: note.title, personality: note.traits, element: note.element,
      lore: fillTemplate(templates.lore, vars, where), dialogues, bondUnlocks,
    };
    const story = buildBondStory(templates, { ...vars, normal0: dialogues.normal[0], important0: dialogues.important[0], bondUp0: dialogues.bondUp[0] },
      pet, { ...dialogues, bondUnlocks });
    const storyErrors = validateBondStories({ schemaVersion: 1, stories: [story] }, [pet]);
    if (storyErrors.length) fail(`${entry.petId} bond story: ${storyErrors.join('; ')}`);
    lore.bondJourneyStory = story;
    petRows.push(pet);
    loreRows.push(lore);
    affinities[entry.petId] = note.tags;
    affinityNotes[entry.petId] = note.gift;
    specialties[entry.petId] = { role: note.role, reason: fillTemplate(templates.specialtyReason, vars, where) };

    const promptVars = { ...vars, style: authoring.prompts.style, negative: authoring.prompts.negative, design: entry.design };
    const prompt = fillTemplate(authoring.prompts.template, promptVars, `${where} prompt`);
    const previous = existingPrompts?.prompts?.[entry.petId];
    // Keep recorded generation provenance when the prompt itself did not change.
    prompts[entry.petId] = previous?.prompt === prompt && previous.negativePrompt === authoring.prompts.negative
      ? previous
      : { prompt, negativePrompt: authoring.prompts.negative, provenance: fillAll(authoring.prompts.provenance, { ...promptVars, prompt }, `${where} provenance`) };
  }

  const ecosystem = Object.assign(existingEcosystem ? structuredClone(existingEcosystem) : {}, {
    food: authoring.ecosystem.food,
    materials: authoring.ecosystem.materials || [],
    affinities, affinityNotes, specialties,
    expedition: authoring.ecosystem.expedition,
    releaseNotes: authoring.ecosystem.releaseNotes,
  });
  const pool = authoring.pool;
  if (pool.id !== poolId) fail('authoring.pool.id differs from brief.poolId');
  if (JSON.stringify(pool.petFilter) !== JSON.stringify({ poolTags: [poolId] })) fail(`authoring.pool.petFilter must be { "poolTags": ["${poolId}"] }`);
  return {
    'pets.json': { pets: petRows },
    'pets-lore.json': { version: 1, lore: loreRows },
    'pool.json': pool,
    'ecosystem.json': ecosystem,
    'prompts.json': { schemaVersion: 1, prompts },
  };
}

async function readJsonIfPresent(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

/** Read a workspace's authoring inputs and write the generated content files. */
export async function authorPoolWorkspace(root, id, { dryRun = false } = {}) {
  if (!/^[a-z][a-z0-9_]*$/.test(id || '')) fail('Series ID must be lowercase snake_case');
  const dir = path.join(root, 'content', 'pet-series', id);
  const [authoring, plan, brief] = await Promise.all(
    [AUTHORING_FILE, 'plan.json', 'brief.json'].map((name) => readJsonIfPresent(path.join(dir, name))),
  );
  if (!authoring) fail(`${AUTHORING_FILE} is missing in content/pet-series/${id}`);
  if (!plan || !brief) fail('plan.json and brief.json must exist (run card-pool init first)');
  const content = buildPoolContent({
    authoring, plan, brief,
    existingEcosystem: await readJsonIfPresent(path.join(dir, 'ecosystem.json')),
    existingPrompts: await readJsonIfPresent(path.join(dir, 'prompts.json')),
  });
  const changed = [];
  for (const [name, value] of Object.entries(content)) {
    const text = `${JSON.stringify(value, null, 2)}\n`;
    const file = path.join(dir, name);
    const before = await fs.readFile(file, 'utf8').catch(() => null);
    if (before === text) continue;
    changed.push(name);
    if (!dryRun) await fs.writeFile(file, text);
  }
  return { ok: true, id, dryRun, pets: content['pets.json'].pets.length, changed };
}
