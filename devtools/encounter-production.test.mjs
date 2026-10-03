import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { encounterResults, duplicateNote } from '../src/encounterViewModel.js';
test('Native single and ten fragment outcomes remain separate and ordered', () => {
  const pet = { id:'owned', rarity:'UR' };
  const results = [{ pet, isNew:true, duplicateFragments:0 }, { pet, isNew:false, duplicateFragments:20 }, { pet, isNew:false, fragmentsGained:20 }];
  const save = new Map([['owned', { legacySpecialtyFloor:5, bondLevel:2 }]]);
  const before = JSON.stringify([...save]);
  assert.deepEqual(encounterResults(results, save).map((row) => [row.isNew,row.fragmentsGained]), [[true,0],[false,20],[false,20]]);
  assert.equal(JSON.stringify([...save]), before);
  assert.match(duplicateNote(encounterResults(results, save)[1]), /新的相遇更靠近/);
});
test('Production presentation cannot seed, clear, or replay collection writes', () => {
  for (const file of ['src/encounterView.js','src/encounterViewModel.js','src/encounterCeremony.js']) {
    const source = fs.readFileSync(new URL('../' + file, import.meta.url),'utf8');
    assert.doesNotMatch(source, /seedDisplayCollection|prepareDisplayBatch|commitCollection|store\.clear\(|dbMutateRecords|identity-demo|updateDemoSelect|companion-session-db/);
  }
});
