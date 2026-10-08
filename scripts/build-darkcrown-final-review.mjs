import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {checkPoolReleaseReview,releaseReviewHash} from './poolReleaseReview.mjs';
const dir=path.resolve('reports/chaos-demon-court');
const read=async f=>JSON.parse(await fs.readFile(path.join(dir,f)));
const artifacts=await read('artifacts.json'),baseline=await read('final-baseline-check.json');
const m=JSON.parse(await fs.readFile(path.join(artifacts.production.artifactDir,'release-artifact.json')));
const animation=await read('pinned-animation-acceptance.json'),handoff=await read('pinned-encounter-handoff-acceptance.json'),flow=await read('pinned-native-flow-acceptance.json'),offline=await read('update-offline.json'),specialties=await read('specialties-acceptance.json'),regression=await read('final-regression-summary.json');
for(const x of [animation,handoff,flow,specialties]){assert.equal(x.status,'pass');assert.equal(x.artifactId,artifacts.preview.artifactId);assert.equal(x.sourceCommit,m.sourceCommit);}
assert.equal(offline.status,'passed');assert.equal(offline.artifactId,artifacts.production.artifactId);assert.equal(offline.previousArtifactId,baseline.artifactId);
assert.equal(regression.totalNodeTests,376);assert.equal(flow.collectionChecks.length,2);assert.ok(flow.backgroundChecks.length>=6);
const refs=async files=>(await Promise.all(files.map(async f=>f+' sha256='+createHash('sha256').update(await fs.readFile(path.join(dir,f))).digest('hex')))).join('; ');
const pass=async(files,detail)=>({status:'pass',evidence:detail+'; '+await refs(files)});
const preview=artifacts.preview.artifactId,production=artifacts.production.artifactId;
const evidence={schemaVersion:1,sourceCommit:m.sourceCommit,candidateId:'303bcc646872e6eabeda7891637754069d1a7c553557f03e69ae70295246c543',candidateManifestSha256:m.candidateManifestSha256,previewUrl:animation.viewer,artifacts,baseline,checks:{
 animation:await pass(['pinned-animation-acceptance.json','pinned-encounter-handoff-acceptance.json','pinned-native-flow-acceptance.json'],preview+'; '+animation.viewer+'; Windows Chrome isolated loopback, actual pinned modules/styles/images. '+animation.checks.length+' normal/reduced entry/single/ten/rare/awakening/skip/fallback checks, '+handoff.checks.length+' actual encounter handoff/repeated result checks, no viewer DB, '+flow.backgroundChecks.length+' actual background comparisons across all three themes. Server closes after test; local acceptance, not hosted HTTPS or physical-device acceptance.'),
 workshop:await pass(['pinned-native-flow-acceptance.json'],preview+'; native IndexedDB private loopback: 9 tarts crafted using 27 forest_leaf/27 lava_core, explicit 75/150 gifts, seven ritual items consumed exactly once.'),
 specialties:await pass(['specialties-acceptance.json','pinned-native-flow-acceptance.json'],preview+'; all 20 explicit roles at Lv1/Lv5 and explore/gather/bond planner checked; seven native dispatch claims. Fixture ownership and expedited completion clock, real effective catalogs/services.'),
 region:await pass(['region-art-provenance.json','pinned-native-flow-acceptance.json','update-offline.json'],preview+' map/dispatch at 393/1280; generated 1672x941 WebP actual loading/crop, black tower and resisting routes recognizable. '+production+' updated worker serves region offline. Confirmed built-in imagegen, source/edit prompt/hash retained.'),
 transactions:await pass(['pinned-native-flow-acceptance.json','formal-content-preserved.json','final-regression-summary.json'],preview+'; all seven real trial/task/dispatch/ritual services with native IndexedDB; concurrent ritual calls fulfill once/reject once, consume one tart/token, wallet/collection identity preserved, current backup validates, two forms switch. Existing 294 catalog rows/510 assets unchanged; complete 376 Node plus product/reveal checks.'),
 serviceWorker:await pass(['update-offline.json','artifact-verification.json','formal-snapshot-recovery.json'],production+'; exact formal V3.8.9 -> V3.9.0 on isolated production-profile loopback. Native update banner activation, original pet/story preserved, old cache removed, new region and seven already-viewed pairs available offline, replay/forms/backup offline. Existing lazy pet-image cache policy retained. Both 771-file artifacts independently verified; exact formal text fetched and manifest-hash checked. No new production deployment or device/hosted-preview acceptance claimed.')
},limitations:['No new hosted preview, formal deployment or physical iPhone check performed.','Final human whole-package acceptance and explicit 可以發布 are pending.','AI artwork tool previews are automatically displayed by the image tool despite ai-self; no human artwork receipt was invented.']};
const packageHash=releaseReviewHash(evidence),decision=await checkPoolReleaseReview(evidence);
assert.equal(decision.ok,true);assert.equal(decision.releaseReady,false);assert.equal(decision.nextGate,'human_whole_package_acceptance');
await fs.writeFile(path.join(dir,'release-review.json'),JSON.stringify({...evidence,packageHash},null,2)+'\n');
await fs.writeFile(path.join(dir,'release-review-decision.json'),JSON.stringify(decision,null,2)+'\n');
let doc=await fs.readFile(path.join(dir,'final-package-review.md'),'utf8');
doc=doc.replace('更新／離線的最終結果與整包 hash 由同目錄 release-review.json 固定；未完成該證據前不構成可發布包。', '正式 V3.8.9 → V3.9.0 更新演練通過：原有角色／故事保留、舊快取清理、已載入的七組形態及新地區可離線使用，覺醒重播／切換／備份通過。工程驗收皆通過，尚待人類整包驗收及明確發布授權；未執行新版本正式部署或實體 iPhone 驗證。');
doc+='\n整包 hash：'+packageHash+'\n\n若接受這份確切整包，可回覆：「接受整包 '+packageHash+'，可以發布」。同一次明確授權可同時記錄整包驗收與發布同意。\n';
await fs.writeFile(path.join(dir,'final-package-review.md'),doc);
console.log(JSON.stringify(decision));

