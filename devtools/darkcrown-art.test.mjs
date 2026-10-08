import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateAwakeningCatalog} from '../src/petAwakeningCatalog.js';
import {DARKCOURT_AWAKENING_IDS,SWORDWILD_AWAKENING_IDS} from '../src/petAwakeningProfiles.js';
import {initialAwakeningPortrait,awakeningPortrait} from '../src/petAwakeningView.js';
import {createPetAwakening} from '../src/petAwakeningCore.js';
const root=new URL('../',import.meta.url);
const catalog=JSON.parse(fs.readFileSync(new URL('data/pet-awakening.json',root)));
const authored=JSON.parse(fs.readFileSync(new URL('content/pet-series/darkcrown_court_release/pets.json',root))).pets;
const hash=b=>createHash('sha256').update(b).digest('hex');
test('actual seven complete pairs keep original beast bytes, names and controlled rarity',()=>{
 assert.deepEqual(validateAwakeningCatalog(catalog),[]);
 assert.equal(catalog.pets.length,27);
 const dark=catalog.pets.filter(p=>DARKCOURT_AWAKENING_IDS.includes(p.petId));assert.equal(dark.length,7);
 for(const field of ['tokenName','title','trialTitle'])assert.equal(new Set(dark.map(p=>p[field])).size,7);
 for(const p of dark){
  const pet=authored.find(x=>x.id===p.petId);assert.ok(pet);assert.equal(p.name,pet.name);assert.equal(p.rarity,pet.rarity);
  assert.equal(hash(fs.readFileSync(new URL('content/pet-series/darkcrown_court_release/images/'+p.petId+'.png',root))),p.initialSha256);
  for(const form of ['initial','awakened']){assert.equal(hash(fs.readFileSync(new URL(p[form+'Image'].original,root))),p[form+'Sha256']);for(const k of ['card','stage'])assert.ok(fs.statSync(new URL(p[form+'Image'][k],root)).size>1000);}
  const state={byPet:{[p.petId]:{awakenedAt:'2026-10-08T00:00:00Z',form:'awakened'}}};
  assert.equal(awakeningPortrait({...pet,owned:true},createPetAwakening(),catalog).image,p.initialImage.original);
  assert.equal(awakeningPortrait({...pet,owned:false},state,catalog).image,p.initialImage.original);
  assert.equal(initialAwakeningPortrait(pet,catalog).image,p.initialImage.original);
  assert.equal(awakeningPortrait({...pet,owned:true},state,catalog).image,p.awakenedImage.original);
  state.byPet[p.petId].form='initial';assert.equal(awakeningPortrait({...pet,owned:true},state,catalog).image,p.initialImage.original);
 }
 assert.equal(authored.filter(p=>!DARKCOURT_AWAKENING_IDS.includes(p.id)).length,13);
});
test('Swordwild twenty catalog values and original art remain exactly the reviewed main baseline',()=>{
 const baseline=JSON.parse(execFileSync('git',['show','e53fc8358445c3fb2a23a8d2c3bbe2eab55c2056:data/pet-awakening.json'],{cwd:new URL('../',import.meta.url),encoding:'utf8'}));
 assert.deepEqual(catalog.pets.filter(p=>SWORDWILD_AWAKENING_IDS.includes(p.petId)),baseline.pets);
});
