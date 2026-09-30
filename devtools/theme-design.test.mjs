import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { SUPPORTED_THEMES, THEME_DIRECTIONS } from '../src/themeRegistry.js';
import { getCompanionScene } from '../src/twilightPresentation.js';
const root = new URL('../', import.meta.url);
const read = (file) => fs.readFile(new URL(file, root), 'utf8');
const luminance = (hex) => {
  const c = hex.slice(1).match(/../g).map((v) => parseInt(v,16)/255).map((v) => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
  return c[0]*.2126+c[1]*.7152+c[2]*.0722;
};
const contrast = (a,b) => { const values=[luminance(a),luminance(b)].sort((x,y)=>y-x); return (values[0]+.05)/(values[1]+.05); };
test('three save-compatible worlds only use authored wolf scenes for the actual wolf', () => {
  assert.deepEqual(SUPPORTED_THEMES,['default','sweet','twilight']);
  for(const theme of SUPPORTED_THEMES) {
    assert.equal(getCompanionScene({id:'pet_n01'},theme),THEME_DIRECTIONS[theme].hero);
    const other={id:'pet_ur01',image:'./actual-dragon.png'};
    assert.ok(!getCompanionScene(other,theme).includes('graywolf'));
    assert.ok(!getCompanionScene(null,theme).includes('graywolf'));
  }
});
test('text, status and action tokens retain AA contrast on their solid surfaces', async () => {
  const source=await read('src/themeTokens.css');
  for(const theme of SUPPORTED_THEMES) {
    const block=source.split('body[data-theme="'+theme+'"] {')[1].split('\n}')[0];
    const tokens=Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/g)].map((m)=>[m[1],m[2]]));
    for(const background of ['color-bg-main','color-bg-card']) for(const role of ['color-text-main','color-text-muted','color-accent','color-success','color-warning','color-danger']) {
      assert.ok(contrast(tokens[role],tokens[background])>=4.5,theme+' '+role+' on '+background+': '+contrast(tokens[role],tokens[background]));
    }
    assert.ok(contrast(tokens['color-primary'],tokens['color-text-inverse'])>=4.5,theme+' primary button');
    assert.ok(contrast(tokens['qn-scene-text'],tokens['qn-scene'])>=4.5,theme+' solid scene copy');
  }
});
test('three mobile scene assets decode, preserve 3:2 composition and fit the offline art budget', async () => {
  let total=0;
  for(const direction of Object.values(THEME_DIRECTIONS)) {
    const bytes=await fs.readFile(new URL(direction.hero.slice(2),root));total+=bytes.length;
    const info=await sharp(bytes).metadata();
    assert.equal(info.format,'webp');assert.equal(info.width,1179);assert.equal(info.height,786);
    assert.ok(bytes.length<200000);
  }
  assert.ok(total<500000,'Three worlds should not impose a multi-megabyte App Shell image load.');
});
test('one fixed primary icon has a real 1024 master and separate maskable safe margin', async () => {
  const manifest=JSON.parse(await read('manifest.webmanifest'));
  for(const size of [32,180,192,512,1024]) {
    const name=size===1024?'questnote-icon-master-1024.png':'questnote-icon-'+size+'.png';
    const info=await sharp(await fs.readFile(new URL('assets/brand/'+name,root))).metadata();
    assert.equal(info.width,size);assert.equal(info.height,size);
  }
  const mask=manifest.icons.find((icon)=>icon.purpose==='maskable');
  assert.ok(mask.src.includes('maskable'));
  const {data}=await sharp(await fs.readFile(new URL(mask.src,root))).removeAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual([...data.slice(0,3)],[16,30,49]);
  assert.ok(manifest.icons.every((icon)=>icon.src.startsWith('assets/brand/')));
});
test('new presentation dependencies and home art are included in the verified offline closure', async () => {
  const worker=await read('service-worker.js');const version=await read('src/version.js');
  const cache=worker.match(/const CACHE_NAME = '([^']+)'/)[1];assert.ok(version.includes(cache));
  for(const file of ['src/themeTokens.css','src/theme-system.css','src/theme-refinements.css','src/iconPresentation.js','src/questIcons.js',...Object.values(THEME_DIRECTIONS).map((d)=>d.hero.slice(2))]) assert.ok(worker.includes("'"+file+"'"),file);
});
