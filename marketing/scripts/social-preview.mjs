import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const reports = path.resolve(root, '../reports/marketing/share-preview');
await fs.mkdir(reports, { recursive: true });
const scene = 'data:image/webp;base64,' + (await fs.readFile(path.join(root, 'assets/night-1179.webp'))).toString('base64');
const browser = await chromium.launch({ channel: process.env.QA_BROWSER_CHANNEL || 'msedge' });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const poster = `<!doctype html><html lang="zh-Hant-TW"><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#0c1929;color:#faf3e5;font-family:'Microsoft JhengHei',sans-serif}
    .poster{width:1200px;height:630px;position:relative;overflow:hidden}
    .scene{position:absolute;width:1260px;height:840px;left:-90px;top:-45px}
    .shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,20,34,.72),rgba(8,20,34,.28) 49%,transparent 68%),linear-gradient(0deg,#0c1929,transparent 32%)}
    .brand{position:absolute;left:325px;top:154px;font:30px Georgia,serif;letter-spacing:-.02em;color:#ead8b8}
    h1{position:absolute;left:319px;top:257px;margin:0;font-size:76px;line-height:1.18;font-weight:700;letter-spacing:-.025em;text-shadow:0 2px 18px #081422}
    .quest{position:absolute;left:325px;top:482px;display:flex;align-items:center;gap:14px;font-size:28px;letter-spacing:.01em}
    .check{color:#e9c897;font-size:38px;line-height:1}
    .growth{position:absolute;left:325px;top:537px;display:flex;align-items:center;gap:15px;font-size:24px;color:#e9c897}
    .path{display:flex;gap:6px}.path i{width:29px;height:4px;border-radius:9px;background:#435364}.path i:nth-child(-n+3){background:#e9c897}
    .growth b{font-weight:400;color:#c6ced0;font-size:22px}
  </style><main class="poster"><img class="scene" src="${scene}" alt="原有灰影幼狼與森林夜色"><div class="shade"></div><div class="brand">QuestNote</div><h1>小事完成，<br>冒險繼續。</h1><div class="quest"><span class="check">✓</span><span>讀書 30 分鐘</span></div><div class="growth"><span class="path"><i></i><i></i><i></i><i></i><i></i></span><b>3 / 5</b><span>+5 親密度</span></div></main></html>`;
  await fs.writeFile(path.join(reports, 'poster-source.html'), poster);
  await page.setContent(poster);
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
  const safeArea = await page.locator('.brand, h1, .quest, .growth').evaluateAll(nodes => nodes.map(node => {
    const { left, right, top, bottom } = node.getBoundingClientRect();
    return { element: node.className || node.tagName, left, right, top, bottom };
  }));
  if (safeArea.some(box => box.left < 285 || box.right > 915 || box.top < 48 || box.bottom > 582)) throw new Error('Campaign content leaves the central square safe area');
  await fs.writeFile(path.join(reports, 'safe-area.json'), JSON.stringify({ image: '1200×630', centralSquare: { left: 285, right: 915 }, text: safeArea, character: 'Existing scene preserved; face inspected in the square crop and 96px thumbnail.' }, null, 2));
  await page.screenshot({ path: path.join(reports, 'og-master.png') });
  await sharp(path.join(reports, 'og-master.png')).jpeg({ quality: 92, mozjpeg: true }).toFile(path.join(root, 'assets/questnote-og-v2.jpg'));
  const encoded = 'data:image/jpeg;base64,' + (await fs.readFile(path.join(root, 'assets/questnote-og-v2.jpg'))).toString('base64');
  const title = 'QuestNote｜小事完成，冒險繼續';
  const description = '把生活裡的待辦變成冒險的 App。完成一件小事，和你的夥伴一起成長。';
  const common = `*{box-sizing:border-box}body{margin:0;padding:28px;background:#f4f1e8;color:#213b37;font-family:'Microsoft JhengHei',sans-serif}h1{font-size:16px;margin:0 0 20px}h2,p{margin:0}.label{font-size:12px;margin:24px 0 10px;color:#53665c}.card{background:#fffdf7;border:1px solid #cfd5c7;border-radius:14px;overflow:hidden}.card img{display:block;width:100%;aspect-ratio:1200/630}.copy{padding:16px}.copy h2{font-size:18px;line-height:1.5;margin-bottom:8px}.copy p{font-size:14px;line-height:1.6;color:#506059}.domain{font-size:11px;margin-top:12px;color:#637167}.compact{padding:14px;display:grid;grid-template-columns:1fr 96px;gap:12px}.compact img{width:96px;height:96px;object-fit:cover;border-radius:9px}.compact h2{font-size:16px;line-height:1.45;margin-bottom:8px}.compact p{font-size:13px;line-height:1.6;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.square{width:240px;height:240px;object-fit:cover;border-radius:12px}.small{width:288px}.safe-note{font-size:12px;line-height:1.6;margin-top:10px}`;
  const card = (width, label) => `<p class="label">${label}・${width}px 模擬</p><article class="card" style="width:${width}px"><img src="${encoded}" alt="QuestNote campaign poster"><div class="copy"><h2>${title}</h2><p>${description}</p><div class="domain">questnote.taste-compare.com</div></div></article>`;
  await page.setViewportSize({ width: 393, height: 1050 });
  await page.setContent(`<html lang="zh-Hant-TW"><meta charset="utf-8"><style>${common}</style><h1>LINE 類型分享預覽・模擬</h1><p class="label">小縮圖卡・非 LINE 實機畫面</p><article class="card compact"><div><h2>${title}</h2><p>${description}</p></div><img src="${encoded}" alt="中央方形裁切"></article>${card(288, '小型完整卡')}<p class="label">中央方形裁切・角色臉與 Headline 安全區</p><img class="square" src="${encoded}" alt="方形裁切檢查"><p class="safe-note">只有一個官網 URL。平台排版與快取由收件 App 決定。</p></html>`);
  await page.screenshot({ path: path.join(reports, 'line-simulation-393.png'), fullPage: true });
  await page.setViewportSize({ width: 600, height: 1050 });
  await page.setContent(`<html lang="zh-Hant-TW"><meta charset="utf-8"><style>${common}</style><h1>X / Discord 類型分享預覽・模擬</h1>${card(510, 'X 大型卡')}${card(430, 'Discord 大型卡')}</html>`);
  await page.screenshot({ path: path.join(reports, 'x-discord-simulation.png'), fullPage: true });
  console.log('Rendered static 1200×630 campaign JPEG, LINE compact/full simulations, central square crop and X/Discord simulations.');
} finally { await browser.close(); }
