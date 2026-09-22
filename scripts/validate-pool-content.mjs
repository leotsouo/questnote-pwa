/** Read-only merged pool content validation. */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePoolContent } from '../src/poolContentContract.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/validate-pool-content.mjs [pools.json] [pets.json] [previous-pools.json]');
} else {
  try {
    if (args.length > 3) throw new Error('Expected at most three file paths; use --help');
    const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
    const pools = await readJson(args[0] ? resolve(args[0]) : resolve(root, 'data/pools.json'));
    const pets = await readJson(args[1] ? resolve(args[1]) : resolve(root, 'data/pets.json'));
    const previousPoolsData = args[2] ? await readJson(resolve(args[2])) : undefined;
    const result = validatePoolContent(pools, { pets: pets.pets, previousPoolsData });
    console.log(JSON.stringify({ ok: result.ok, errors: result.errors, warnings: result.warnings, previews: result.previews }, null, 2));
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  }
}
