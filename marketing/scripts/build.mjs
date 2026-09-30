import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { MARKETING_CONFIG, getDistribution } from '../config.js';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist');
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Unsafe build output');
const distribution = getDistribution();
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
for (const file of ['index.html', 'styles.css', 'main.js', 'config.js', 'demo.js', 'analytics.js', 'robots.txt', 'sitemap.xml', '_headers']) {
  if (['index.html', 'robots.txt', 'sitemap.xml'].includes(file)) {
    let content = await fs.readFile(path.join(root, file), 'utf8');
    content = content.replaceAll('https://questnote.taste-compare.com', MARKETING_CONFIG.canonicalUrl);
    if (file === 'index.html') {
      content = content.replace(/(data-distribution="[^"]+" href=")#start/g, '$1' + distribution.url)
        .replace(/(data-cta-label>)[^<]+/g, '$1' + distribution.label)
        .replace(/(data-distribution-note>)[^<]+/g, '$1' + distribution.note);
    }
    await fs.writeFile(path.join(output, file), content);
  } else await fs.copyFile(path.join(root, file), path.join(output, file));
}
await fs.cp(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
const legal = {
  privacy: {
    title: '隱私說明',
    body: '<h2>這個產品介紹網站</h2><p>互動任務只保存在當次頁面記憶體；重新整理就會重設。不讀取 QuestNote App 的任務、收藏或帳號，不需要登入，也沒有收集 Email 的表單。</p><h2>分析與分享來源</h2><p>目前未啟用遠端網站分析。頁面具備不使用 Cookie、持續識別碼或指紋的事件整合介面；若日後啟用 Cloudflare Web Analytics 或匿名事件統計，必須同步更新這份說明。網址中的 utm_source、utm_medium、utm_campaign 會隨開啟 App 的連結保留；請勿把個人資料放進這些參數。</p><h2>QuestNote App 的資料</h2><p>目前的網頁 App 主要將任務、習慣與收藏保存在裝置的 IndexedDB。主動送出意見回報時，內容會送到開發者的私密服務；啟用推播提醒時，提醒排程與訂閱資料也會傳送到提醒服務。這些選用功能與本介紹頁的互動示範分開。</p><h2>外部服務</h2><p>Cloudflare 提供網站傳輸服務，GitHub Pages 提供目前 App。服務供應商可能為安全與營運處理連線資訊。離開本網站後，請參考對應服務的隱私規範。</p><h2>聯絡與資料問題</h2><p>請從<a href="/support">支援入口</a>聯絡開發者。不要在公開 Issue 裡提供任務內容、備份、Email 或其他個人資料。</p>',
  },
  terms: {
    title: '使用說明與條款',
    body: '<h2>從一件小事開始</h2><p>QuestNote 目前以網頁 App 提供。介紹頁的互動、數字與截圖使用示範資料；頁面上的示範獎勵不會送進你的 App。</p><h2>保存自己的旅程</h2><p>App 資料主要儲存在目前裝置與瀏覽器，沒有保證跨裝置自動同步。更換裝置、清除瀏覽資料或重新安裝前，請先使用 App 的匯出備份功能。</p><h2>目前提供的體驗</h2><p>產品功能可能隨版本調整。請將 QuestNote 當作整理日常與陪伴成長的工具；沒有保證任務成果、抽到特定角色或永久可用性。本頁不提供付費訂閱或購買。</p><h2>圖片與使用</h2><p>網站角色插畫、品牌素材與程式碼的使用權利應以專案實際授權與創作者約定為準。這份草稿不另行授予素材商用權利。</p><h2>需要協助</h2><p>若遇到資料或使用問題，請先保留備份，再前往<a href="/support">支援入口</a>。正式服務條款、經營者資料與素材權利範圍仍待 Owner 確認。</p>',
  },
  support: {
    title: '需要幫忙？先把旅程留好。',
    body: '<h2>資料與備份</h2><p>任務與收藏主要儲存在裝置上。若畫面異常，先不要清除網站資料；能操作時，請在 App 的設定裡匯出备份。</p><h2>回報問題</h2><p>已在使用 App：從 App 內的「意見回報」送出問題。開發者會私下收到你主動提供的內容。</p><p>也可以<a href="' + MARKETING_CONFIG.supportUrl + '">查看或建立 GitHub Issue</a>；GitHub Issue 是公開的，請不要貼個人資料、任務、Email 或備份。建立 Issue 需要 GitHub 帳號。</p><h2>在手機上開始</h2><p>直接用瀏覽器<a href="' + getDistribution().url + '">開啟 QuestNote</a>。想放到手機主畫面，可以在瀏覽器選單使用「加入主畫面」。目前沒有正式 App Store listing。</p><p><a href="' + MARKETING_CONFIG.sourceUrl + '">查看 QuestNote 專案</a></p>',
  },
};
if (MARKETING_CONFIG.analytics.cloudflareToken) {
  legal.privacy.body = legal.privacy.body.replace('目前未啟用遠端網站分析。頁面具備不使用 Cookie、持續識別碼或指紋的事件整合介面；若日後啟用 Cloudflare Web Analytics 或匿名事件統計，必須同步更新這份說明。',
    '正式網域使用免費的 Cloudflare Web Analytics 統計頁面瀏覽與載入速度；Preview 不啟用。互動事件目前只提供當次頁面的整合介面，沒有遠端彙總，也不使用 Cookie、持續識別碼或指紋。網站尊重 Do Not Track 與 Global Privacy Control；未來若接上互動事件統計，會同步更新本頁。');
}
for (const [slug, page] of Object.entries(legal)) {
  await fs.mkdir(path.join(output, slug));
  const review = slug === 'support' ? '' : '<p class="review-label">OWNER REVIEW REQUIRED · 此頁為待確認草稿，非已核定的正式法律文件。</p>';
  const html = `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${page.title}｜QuestNote</title><meta name="description" content="QuestNote 的${page.title}與資料使用說明。"><link rel="canonical" href="${MARKETING_CONFIG.canonicalUrl}/${slug}"><link rel="icon" href="/assets/favicon.png"><link rel="stylesheet" href="/styles.css"></head><body><header class="site-header wrap"><a class="brand" href="/"><img src="/assets/favicon.png" width="32" height="32" alt=""><span>QuestNote</span></a><a class="text-link" href="/">回到首頁 ↗</a></header><main class="legal wrap"><h1>${page.title}</h1>${review}<p>更新日期：2026 年 10 月 1 日</p>${page.body}</main><footer class="site-footer wrap"><nav aria-label="網站資訊"><a href="/privacy">隱私</a><a href="/terms">使用說明與條款</a><a href="/support">支援</a></nav></footer></body></html>`;
  await fs.writeFile(path.join(output, slug, 'index.html'), html);
}
await fs.writeFile(path.join(output, '404.html'), '<!doctype html><html lang="zh-Hant-TW"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>這條小徑還沒有開放｜QuestNote</title><link rel="stylesheet" href="/styles.css"><main class="legal wrap"><h1>這條小徑還沒有開放。</h1><p><a class="button button-primary" href="/">回到 QuestNote 首頁</a></p></main></html>');
async function inventory(dir) {
  const entries = [];
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, item.name);
    if (item.isDirectory()) entries.push(...await inventory(absolute));
    else {
      const bytes = await fs.readFile(absolute);
      entries.push({ path: path.relative(output, absolute).replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
  return entries;
}
const files = await inventory(output);
await fs.writeFile(path.join(root, '..', 'reports/marketing/build-manifest.json'), JSON.stringify({ mode: MARKETING_CONFIG.distributionMode, files, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0) }, null, 2));
console.log(`Built ${files.length} static files, ${(files.reduce((sum, file) => sum + file.bytes, 0) / 1024).toFixed(0)} KiB. No Functions or database.`);
