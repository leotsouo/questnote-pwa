/** Contact sheets are evidence layouts assembled from actual saved runtime screenshots. */
import fs from 'node:fs/promises';
import sharp from 'sharp';
const dir = 'reports/theme-round-two';
const themes = ['default', 'sweet', 'twilight'];
const labels = { default: 'NIGHT JOURNEY', sweet: 'MORNING GARDEN', twilight: 'TWILIGHT JOURNAL' };
const screens = ['home', 'collection', 'gacha', 'expedition'];
const cellWidth = 393, cellHeight = 852, gap = 18, labelHeight = 38;
const title = (text) => Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="393" height="38"><rect width="393" height="38" fill="#ebe8df"/><text x="10" y="25" font-family="sans-serif" font-size="14" fill="#27362f">' + text + '</text></svg>');
async function sheet(name, rows) {
  const width = cellWidth * 3 + gap * 4;
  const height = (cellHeight + labelHeight + gap) * rows.length + gap;
  const layers = [];
  for (const [y, row] of rows.entries()) for (const [x, item] of row.entries()) {
    const left = gap + x * (cellWidth + gap), top = gap + y * (cellHeight + labelHeight + gap);
    layers.push({ input: title(item.label), left, top });
    layers.push({ input: await sharp(dir + '/' + item.file).resize(cellWidth, cellHeight).toBuffer(), left, top: top + labelHeight });
  }
  await sharp({ create: { width, height, channels: 3, background: '#ebe8df' } }).composite(layers).jpeg({ quality: 90 }).toFile(dir + '/' + name);
}
// Preserve original pixels; normalize .jpg file encoding without changing composition.
for (const file of await fs.readdir(dir)) if (/^(before|after|narrow)-.*\.jpg$/.test(file)) {
  const original = await fs.readFile(dir + '/' + file);
  if ((await sharp(original).metadata()).format === 'jpeg') continue;
  const bytes = await sharp(original).jpeg({ quality: 94 }).toBuffer();
  await fs.writeFile(dir + '/' + file, bytes);
}
for (const phase of ['before','after']) await sheet(phase + '-matrix.jpg', screens.map(screen => themes.map(theme => ({ file: phase + '-' + theme + '-' + screen + '.jpg', label: phase.toUpperCase() + ' / ' + labels[theme] + ' / ' + screen.toUpperCase() }))));
await sheet('home-before-after.jpg', ['before','after'].map(phase => themes.map(theme => ({ file: phase + '-' + theme + '-home.jpg', label: phase.toUpperCase() + ' / ' + labels[theme] }))));
await sheet('home-after.jpg', [themes.map(theme => ({ file: 'after-' + theme + '-home.jpg', label: labels[theme] }))]);
for (const screen of screens) await sheet('after-row-' + screen + '.jpg', [themes.map(theme => ({ file: 'after-' + theme + '-' + screen + '.jpg', label: labels[theme] + ' / ' + screen }))]);
const secondary = ['more','settings','habits','achievements','workshop','handbook'];
if ((await fs.readdir(dir)).includes('after-twilight-handbook.jpg')) {
  for (const screen of secondary) await sheet('after-row-' + screen + '.jpg', [themes.map(theme => ({ file: 'after-' + theme + '-' + screen + '.jpg', label: labels[theme] + ' / ' + screen }))]);
}
const names = { default:'星夜遠行', sweet:'晨光花園', twilight:'暮光冒險手帳' };
const viewNames = {home:'首頁',collection:'圖鑑',gacha:'召喚',expedition:'探險'};
const rows = screens.map(screen => '<h2>' + viewNames[screen] + '</h2><div class="grid">' + themes.map(theme => '<article><h3>' + names[theme] + '</h3><div class="pair"><figure><figcaption>CURRENT</figcaption><img src="before-' + theme + '-' + screen + '.jpg" alt="' + names[theme] + viewNames[screen] + ' Before"></figure><figure><figcaption>UPGRADED</figcaption><img src="after-' + theme + '-' + screen + '.jpg" alt="' + names[theme] + viewNames[screen] + ' After"></figure></div></article>').join('') + '</div>').join('') + '<h2>其他頁面延伸</h2>' + secondary.map(screen=>'<h3>'+screen+'</h3><img style="max-width:1250px" src="after-row-'+screen+'.jpg" alt="三套 '+screen+' 延伸">').join('');
await fs.writeFile(dir + '/gallery.html', '<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QuestNote Before / After Matrix</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#ebe8df;color:#27362f;font:15px/1.6 system-ui}h1{font-size:28px}h2{margin-top:32px}h3{font-size:17px}a{color:#476952}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.pair{display:flex;gap:10px}figure{margin:0;width:50%}figcaption{font-size:11px;margin-bottom:8px}img{width:100%;border-radius:10px;display:block}@media(max-width:1000px){.grid{grid-template-columns:1fr}.pair{max-width:820px}}@media(min-width:1800px){body{max-width:1900px;margin:auto}}</style><h1>同一份 QuestNote，三種同行氣氛。</h1><p>Before V3.4.25 / After V3.4.26；393×852 CSS viewport。隔離驗證資料：灰影幼狼 Lv.1 / 0 EXP、0/2 今日完成、9/72 收藏、0 星塵、0 能量。UI 測試任務名稱如實保留，沒有假 KPI。</p><p><a href="../../devtools/theme-worlds/index.html">互動三套比較</a> · <a href="home-before-after.jpg">三套首頁合圖</a> · <a href="after-matrix.jpg">12 張 After 矩陣</a> · <a href="before-matrix.jpg">12 張 Before 矩陣</a></p>' + rows + '</html>');
console.log('Built real screenshot matrices, homepage comparison and gallery.');
