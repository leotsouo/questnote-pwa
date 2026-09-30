import fs from 'node:fs/promises';
import path from 'node:path';

const tools = path.resolve(import.meta.dirname, '../../devtools');
let server = await fs.readFile(path.join(tools, 'app-update-browser-server.mjs'), 'utf8');
server = server.replace("import { createHash, randomUUID } from 'node:crypto';", "import { createHash, randomUUID } from 'node:crypto';\nimport { isDeepStrictEqual } from 'node:util';");
const guard = "if (artifacts.old.manifest.profile.contentBundleSha256 !== artifacts.new.manifest.profile.contentBundleSha256) throw Error('Rollback content must match');";
if (!server.includes(guard)) throw new Error('Update server guard changed');
server = server.replace(guard, `const oldBundle = JSON.parse(artifacts.old.files.get(artifacts.old.manifest.profile.contentBundleUrl));
const newBundle = JSON.parse(artifacts.new.files.get(artifacts.new.manifest.profile.contentBundleUrl));
for (const [key, rows] of [['petsData','pets'], ['loreData','lore'], ['poolsData','pools'], ['seriesCatalog','series']]) {
  for (const old of oldBundle[key][rows]) if (!isDeepStrictEqual(old, newBundle[key][rows].find(item => item.id === old.id))) throw Error('Published content changed: ' + old.id);
}
if (oldBundle.petsData.pets.length !== 84 || newBundle.petsData.pets.length !== 96) throw Error('Expected actual 84 to 96 content update');`);
server = server.replace("new URL('./app-update-browser-test.js', import.meta.url)", "new URL('./update-browser-test.js', import.meta.url)");
await fs.writeFile(path.join(import.meta.dirname, 'update-browser-server.mjs'), server);
let suite = await fs.readFile(path.join(tools, 'app-update-browser-test.js'), 'utf8');
const end = "  note('Real icon decodes; backup settings opens without reset, reinstall or changing app identity');";
if (!suite.includes(end)) throw new Error('Update suite changed');
suite = suite.replace(end, end + `
  newUi.switchView('gacha');
  const select = doc().getElementById('gacha-pool-select');
  assert(select.options.length === 4 && Array.from(select.options).some(option => option.value === 'honeylight_sugar_garden_v2'), 'New pool did not appear after update');
  select.value = 'honeylight_sugar_garden_v2'; select.dispatchEvent(new (win().Event)('change', {bubbles:true}));
  await until(() => doc().getElementById('gacha-pool-name').textContent === '蜜光糖庭', 'new pool selected');
  const data = await win().fetch(new URL(config.profiles.new.contentBundleUrl, win().location.href)).then(response => response.json());
  const cast = data.petsData.pets.filter(pet => pet.poolTags.includes('honeylight_sugar_garden_v2'));
  assert(cast.length === 12 && cast.filter(pet => pet.rarity === 'UR').length === 2, 'Wrong new pool roster');
  assert(doc().getElementById('gacha-theme-name').textContent === '蜜光糖庭', 'New pool hero title missing');
  note('Actual V3.4.33 84-pet release updates to V3.4.34 96-pet release; all old saved rows survive and the dual-UR Honeylight pool is available');`);
// Bind eval imports to this exact fresh origin, including when IAB reuses a tab.
for (const name of ['db.js', 'taskService.js', 'collectionService.js', 'preferencesService.js', 'ui.js', 'updateActivity.js']) {
  suite = suite.replaceAll(`win().eval('import("/questnote-pwa/src/${name}")')`,
    `win().eval('import(' + JSON.stringify(location.origin + '/questnote-pwa/src/${name}') + ')')`);
}
await fs.writeFile(path.join(import.meta.dirname, 'update-browser-test.js'), suite);
