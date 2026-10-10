import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const reports = path.resolve(root, '../reports/marketing');
await fs.mkdir(path.join(reports, 'social'), { recursive: true });
const image = 'data:image/webp;base64,' + (await fs.readFile(path.join(root, 'assets/night-1179.webp'))).toString('base64');
const twilight = 'data:image/webp;base64,' + (await fs.readFile(path.join(root, 'assets/twilight-1179.webp'))).toString('base64');
const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || 'msedge' });
const page = await browser.newPage();
const base = `*{box-sizing:border-box}body{margin:0;color:#263d37;background:#f4f1e8;font-family:'Microsoft JhengHei',sans-serif}p,h1{margin:0}h1{font-family:'PMingLiU',Georgia,serif;font-weight:500;letter-spacing:-.025em;line-height:1.4}.eyebrow{font-size:20px;letter-spacing:.15em;color:#466950}.brand{font-size:24px;font-weight:600;letter-spacing:-.03em}.quest{background:#101d2b;color:#f4eee1;padding:24px 30px}.quest-title{font-size:27px}.quest-title b{color:#e4c38c;margin-right:16px;font-weight:400}.reward{font-size:17px;color:#e4c38c;margin-top:12px}.rule{height:3px;background:#3e4d5b;margin:20px 0}.rule span{display:block;width:60%;height:100%;background:#e4c38c}.url{font-size:17px;color:#5c6c62}.scene{background-size:cover;background-position:65% 40%}.micro{font-size:15px;line-height:1.7;color:#cbd1da}`;
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<html lang="zh-Hant-TW"><meta charset="utf-8"><style>${base}.layout{display:grid;grid-template-columns:510px 690px;height:630px}.copy{padding:58px 48px;display:flex;flex-direction:column;justify-content:space-between}.copy h1{font-size:47px;margin:22px 0}.copy .description{font-size:20px;line-height:1.8}.scene{position:relative;background-image:url('${image}')}.quest{position:absolute;bottom:32px;left:32px;right:32px}.label{font-size:14px;color:#cbd1da;display:flex;justify-content:space-between;margin-bottom:12px}</style><div class="layout"><div class="copy"><div class="brand">QuestNote</div><div><p class="eyebrow">小事，有回音。</p><h1>今天的待辦，<br>成了你們的冒險。</h1><p class="description">把生活任務，變成<br>與夥伴一起成長的冒險。</p></div><p class="url">questnote.taste-compare.com ↗</p></div><div class="scene"><div class="quest"><div class="label"><span>今日任務 · 完成</span><span>3 / 5</span></div><p class="quest-title"><b>✓</b>讀書 30 分鐘</p><div class="rule"><span></span></div><p class="reward">+20 星塵　+1 冒險能量　+5 親密度</p></div></div></div></html>`);
await page.evaluate(() => Promise.all([...document.images].map(img => img.decode().catch(() => {}))));
await page.screenshot({ path: path.join(reports, 'social/og-master.png') });
await sharp(path.join(reports, 'social/og-master.png')).jpeg({ quality: 90 }).toFile(path.join(root, 'assets/og-questnote.jpg'));
const concepts = [
  { id: 'a-todays-quest', kicker: '今天的 Quest', headline: '讀完這幾頁，<br>牠也靠近了一點。', sub: '把生活任務，變成與夥伴同行的冒險。', art: image, task: '讀書 30 分鐘', reward: '親密度 10 → 15　·　今日進度 2 / 5 → 3 / 5' },
  { id: 'b-small-step', kicker: '小事，有回音。', headline: '今天沒有大事。<br>有一件小事做完了。', sub: '不必很厲害，也能和夥伴一起往前。', art: twilight, task: '出門走走', reward: '「你的腳步，我聽得見。」' },
  { id: 'c-after-check', kicker: '不只是一個勾', headline: '打勾以後，<br>還有牠的回應。', sub: '在 QuestNote，你的日常連著另一個世界。', art: image, task: '整理書桌', reward: '+20 星塵　+1 冒險能量　+5 親密度' },
];
for (const concept of concepts) {
  await page.setViewportSize({ width: 1080, height: 1350 });
  await page.setContent(`<html lang="zh-Hant-TW"><meta charset="utf-8"><style>${base}.top{height:470px;padding:50px 70px}.brand{font-size:30px;margin-bottom:30px}.top h1{font-size:66px;margin:20px 0}.sub{font-size:25px}.scene{height:740px;position:relative;background-image:url('${concept.art}')}.quest{position:absolute;bottom:35px;left:70px;right:70px;border-top:1px solid #65776d}.quest-title{font-size:34px}.reward{font-size:21px}.bottom{height:140px;padding:40px 70px;display:flex;align-items:center;justify-content:space-between}.url{font-size:19px}.cta{font-size:22px}</style><div class="top"><div class="brand">QuestNote</div><p class="eyebrow">${concept.kicker}</p><h1>${concept.headline}</h1><p class="sub">${concept.sub}</p></div><div class="scene"><div class="quest"><p class="quest-title"><b>✓</b>${concept.task}</p><div class="rule"><span></span></div><p class="reward">${concept.reward}</p></div></div><div class="bottom"><p class="url">questnote.taste-compare.com</p><p class="cta">完成一件小事，看看牠的回應 ↗</p></div></html>`);
  await page.screenshot({ path: path.join(reports, `social/${concept.id}.png`) });
}
await browser.close();
console.log('Rendered 1200 × 630 OG and three 1080 × 1350 campaign concepts using preserved QuestNote art.');
