import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { MARKETING_CONFIG, getDistribution } from '../config.js';
import { getLegalPages, LEGAL_VERSION, LEGAL_EFFECTIVE_DATE } from './legal-content.mjs';

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
const legal = getLegalPages(MARKETING_CONFIG, distribution);
for (const [slug, page] of Object.entries(legal)) {
  await fs.mkdir(path.join(output, slug));
  const publication = slug === 'support' ? '' : `<p class="policy-meta">版本 ${LEGAL_VERSION} · 生效及更新日期：${LEGAL_EFFECTIVE_DATE}</p>`;
  const html = `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${page.title}｜QuestNote</title><meta name="description" content="QuestNote 的${page.title}與資料使用說明。"><link rel="canonical" href="${MARKETING_CONFIG.canonicalUrl}/${slug}"><link rel="icon" href="/assets/favicon.png"><link rel="stylesheet" href="/styles.css"></head><body><header class="site-header wrap"><a class="brand" href="/"><img src="/assets/favicon.png" width="32" height="32" alt=""><span>QuestNote</span></a><a class="text-link" href="/">回到首頁 ↗</a></header><main class="legal wrap"><h1>${page.title}</h1>${publication}${page.body}</main><footer class="site-footer wrap"><nav aria-label="網站資訊"><a href="/privacy">隱私</a><a href="/terms">使用條款</a><a href="/support">支援</a></nav></footer></body></html>`;
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
