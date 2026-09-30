/** Freeze the official Lucide icon family locally. No runtime CDN dependency. */
import fs from 'node:fs/promises';
const tag = '1.49.0';
const aliases = { book: 'book-open', spark: 'sparkles', cards: 'layers-2', compass: 'compass', more: 'ellipsis', mail: 'mail', heart: 'heart', energy: 'zap', arrow: 'arrow-right', check: 'check', sun: 'sun', map: 'map', award: 'medal', habit: 'repeat-2', workshop: 'hammer', settings: 'sliders-horizontal', palette: 'palette', share: 'share-2', feedback: 'message-circle', star: 'star', clock: 'clock-3', calendar: 'calendar-days', alert: 'circle-alert', warning: 'triangle-alert', error: 'circle-x', success: 'circle-check', shield: 'shield-check', gift: 'gift', fire: 'flame', leaf: 'leaf', flower: 'flower-2', mountain: 'mountain', eye: 'eye', lock: 'lock-keyhole', down: 'chevron-down', close: 'x', plus: 'plus', menu: 'menu', sprout: 'sprout', sound: 'volume-2', cloud: 'cloud', moon: 'moon', scroll: 'scroll-text', trail: 'footprints', trash: 'trash', edit: 'pencil', help: 'circle-question-mark' };
const paths = {};
for (const [key, file] of Object.entries(aliases)) {
  const url = `https://raw.githubusercontent.com/lucide-icons/lucide/${tag}/icons/${file}.svg`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  const svg = await response.text();
  const inner = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)?.[1].trim();
  if (!inner || /script|onload|onclick|href=/i.test(inner)) throw new Error(`Unexpected SVG: ${file}`);
  paths[key] = inner;
}
const license = await (await fetch(`https://raw.githubusercontent.com/lucide-icons/lucide/${tag}/LICENSE`)).text();
await fs.mkdir('assets/icons/lucide', { recursive: true });
await fs.writeFile('assets/icons/lucide/LICENSE', license);
await fs.writeFile('assets/icons/lucide/provenance.json', JSON.stringify({ library: 'Lucide', tag, source: 'https://github.com/lucide-icons/lucide', aliases }, null, 2) + '\n');
await fs.writeFile('src/questIcons.js', `/** Official Lucide ${tag}; local paths. See assets/icons/lucide/LICENSE. */\nconst PATHS = ${JSON.stringify(paths, null, 2)};\n\nexport function questIcon(name) {\n  return '<span class="qn-icon twilight-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">' + (PATHS[name] || PATHS.spark) + '</svg></span>';\n}\n`);
console.log(`Vendored ${Object.keys(paths).length} Lucide icons at ${tag}.`);
