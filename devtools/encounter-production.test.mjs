import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { encounterResults, duplicateNote, MAX_DISPLAY_STARS } from '../src/encounterViewModel.js';
test('Native single and ten fragment outcomes remain separate and ordered', () => {
  const pet = { id:'owned', rarity:'UR' };
  const results = [{ pet, isNew:true, duplicateFragments:0 }, { pet, isNew:false, duplicateFragments:30 }, { pet, isNew:false, fragmentsGained:30 }];
  const save = new Map([['owned', { stars:MAX_DISPLAY_STARS, fragments:60 }]]);
  const before = JSON.stringify([...save]);
  assert.deepEqual(encounterResults(results, save).map((row) => [row.isNew,row.fragmentsGained]), [[true,0],[false,30],[false,30]]);
  assert.equal(JSON.stringify([...save]), before);
  assert.match(duplicateNote(encounterResults(results, save)[1]), /最高星級/);
});
test('Production presentation cannot seed, clear, or replay collection writes', () => {
  for (const file of ['src/encounterView.js','src/encounterViewModel.js','src/encounterCeremony.js']) {
    const source = fs.readFileSync(new URL('../' + file, import.meta.url),'utf8');
    assert.doesNotMatch(source, /seedDisplayCollection|prepareDisplayBatch|commitCollection|store\.clear\(|dbMutateRecords|identity-demo|updateDemoSelect|companion-session-db/);
  }
});
