/** Deterministic art prompts; generated PNGs and tool receipts are recorded separately. */
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('content/pet-series/sunward_letters');
const plan = JSON.parse(await fs.readFile(path.join(root, 'plan.json'), 'utf8'));
const style = 'Create one square collectible companion illustration for a gentle storybook fantasy game. Painterly naturalism with soft watercolor texture, rain-washed teal and wheat gold, small restrained coral accents, crisp realistic species anatomy and expressive but non-human animal behavior. A fresh post-rain sky and handmade wayfinding details distinguish this pool from icy seas, sugar gardens, ink mountains and machinery. The animal is the clear focal point, occupying roughly 65–75% of the frame, with a complete readable silhouette at 160px card size. Show one exact story moment: signature anatomy/object, purposeful action, and visible environmental consequence. Keep face, relevant prop, wings, horns, limbs and tail comfortably within an 8% safety margin. No words, numbers, letter shapes, logos, watermark, card frame or interface.';
const negative = 'cropped wing or tail or horn, extra limbs, hybrid anatomy, human hands or face, clothing, armor, duplicate focal animal, unreadable tiny prop, generic static portrait, heavy glitter, floating text, gore, battle, gloomy catastrophe, literal postcard lettering, existing copyrighted characters';
const costBasis = 'Built-in Codex image_gen.imagegen tool needs no OPENAI_API_KEY. OpenAI Codex plan documentation says Codex uses included plan allowance before optional credits (https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan and https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans). Session usage check on 2026-10-08: ordinaryUsageAllowed true, 13% included weekly usage consumed, purchased credits unavailable and balance 0. Use built-in tool only; no API, third-party provider, purchase or credit top-up. Stop if the included allowance cannot complete generation.';
const prompts = {};
for (const pet of plan.pets) {
  const actualPrompt = `${style} Character: ${pet.name} (${pet.rarity}). Exact visual design and story scene: ${pet.design} The result should feel like one coherent collectible card illustration, with no typography. Avoid: ${negative}.`;
  prompts[pet.petId] = {
    prompt: actualPrompt,
    negativePrompt: negative,
    provenance: { tool: 'image_gen.imagegen (built-in)', noExtraCost: true, costBasis,
      costCheckedAt: '2026-10-07T18:44:37Z', imageReviewMode: 'ai-self', status: 'prompt-reviewed',
      references: [], model: null, seed: null, actualPrompt,
      note: 'No model or seed has been returned; record actual outputs and hashes after generation.' },
  };
}
await fs.writeFile(path.join(root, 'prompts.json'), `${JSON.stringify({ schemaVersion: 1, prompts }, null, 2)}\n`);
console.log(JSON.stringify({ prompts: Object.keys(prompts).length }));
