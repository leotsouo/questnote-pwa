import { loadPresentation, readLocalSave, resetBaseline } from './snapshot.js';
import { APP_VERSION } from '../../src/version.js';

const comparison = document.querySelector('.comparison');
const frame = document.getElementById('concept-frame');
const savedAtStart = JSON.stringify(await readLocalSave());
const baseline = await loadPresentation();
document.getElementById('source-version').textContent = `V${APP_VERSION} · 原有 renderer`;
document.getElementById('source-note').textContent = `任務：${baseline.source.tasks}。夥伴：${baseline.source.pet}。數值：${baseline.source.wallet}。`;
function setMode(mode) {
  if (mode === 'split' && innerWidth < 851) mode = 'concept';
  comparison.dataset.mode = mode;
  document.querySelectorAll('button[data-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
}
document.querySelectorAll('button[data-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
setMode(innerWidth >= 851 ? 'split' : 'concept');
window.addEventListener('resize', () => {
  if (innerWidth < 851 && comparison.dataset.mode === 'split') setMode('concept');
});
document.getElementById('reset-study').addEventListener('click', () => {
  resetBaseline();
  location.reload();
});
function updateMotion() { frame.contentWindow?.postMessage({ type: 'questnote-study-motion', reduced: document.getElementById('motion-toggle').checked }, location.origin); }
document.getElementById('motion-toggle').addEventListener('change', updateMotion);
frame.addEventListener('load', updateMotion);
document.getElementById('verify-save').addEventListener('click', async () => {
  const unchanged = savedAtStart === JSON.stringify(await readLocalSave());
  document.getElementById('save-verification').textContent = unchanged ? 'PASS · tasks、meta、collection 與開啟比較前完全一致。' : '存檔與開啟時不同；請檢查是否有另一個目前版本分頁正在操作。';
});
