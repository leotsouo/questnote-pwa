// Presentation only: the caller supplies an already settled winner.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const RACE_SCENE_MS = 10000;
const beats = [
  [0, 'ready', '各就各位', '四位選手已就位。終點看起來也很安分。'],
  [0.10, 'run', '比賽開始！', '起跑！目前一切正常——目前。'],
  [0.29, 'escape', '等一下，終點在動？', '終點：「今天不想上班！」'],
  [0.43, 'chase', '請終點遵守比賽規則', '選手們反應過來了！現在領先的是……終點。'],
  [0.64, 'rescue', '工作人員進場！', '拿網子的那位不是第五位選手，謝謝。'],
  [0.79, 'sprint', '終點已被逮捕', '已確認終點恢復上班。最後衝刺！'],
  [0.94, 'photo', '這張照片，終點也有份', '裁判確認：選手有效，終點逃班無效。'],
];
// Four different chase trajectories. Roles rotate with the saved winner, never the bet.
const keys = [
  [0, [0, 0, 0, 0], .70], [.10, [.01, .01, .01, .01], .70],
  [.29, [.27, .42, .33, .22], .70], [.38, [.27, .42, .33, .22], .96],
  [.43, [.29, .43, .34, .25], .96], [.60, [.55, .49, .61, .45], .96],
  [.73, [.66, .70, .64, .72], .96], [.79, [.72, .73, .69, .71], .90],
  [.88, [.84, .76, .71, .74], .90], [.94, [.96, .79, .74, .77], .90],
  [1, [.96, .79, .74, .77], .90],
];

export function raceSceneFrame(progress, winnerIndex) {
  if (!Number.isInteger(winnerIndex) || winnerIndex < 0 || winnerIndex > 3) throw new Error('Invalid race scene winner');
  const t = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const next = keys.findIndex(key => key[0] > t);
  const a = keys[next < 0 ? keys.length - 1 : Math.max(0, next - 1)];
  const b = keys[next < 0 ? keys.length - 1 : next];
  const ratio = a === b ? 0 : (t - a[0]) / (b[0] - a[0]);
  const ease = ratio * ratio * (3 - 2 * ratio);
  const lerp = (x, y) => x + (y - x) * ease;
  const beat = beats.findLast(item => item[0] <= t);
  return { phase: beat[1], title: beat[2], line: beat[3], finish: lerp(a[2], b[2]),
    positions: Array.from({ length: 4 }, (_, index) => {
      const role = (index - winnerIndex + 4) % 4;
      return lerp(a[1][role], b[1][role]);
    }) };
}

export function mountRaceScene(root, { pets, winnerId, imageHtml, onComplete, reducedMotion = false }) {
  const winnerIndex = pets.findIndex(p => p.id === winnerId);
  if (pets.length !== 4 || winnerIndex < 0) throw new Error('Race scene requires four entrants and a saved winner');
  let frame = 0, disposed = false, phase = '';
  const reduced = reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.innerHTML = `<section class="race-show" data-phase="ready" aria-label="終點今天不想上班：賽跑小劇場">
    <header class="race-show__heading"><span class="race-kicker">星辰體育台 · 今日特別轉播</span><h2 tabindex="-1">終點今天不想上班</h2><p>十秒小劇場 · 賽果已保存</p></header>
    <div class="race-show__arena" aria-label="四位夥伴追趕逃跑的終點">
      <div class="race-show__sky" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span><span>✧</span></div>
      <div class="race-show__notice" aria-hidden="true">各就各位</div>
      <div class="race-show__track">${pets.map((pet, i) => `<div class="race-show__lane"><span class="race-show__name">0${i + 1} · ${esc(pet.name)}</span><div class="race-show__path">
        <div class="race-show__runner" data-scene-runner="${i}"><span class="race-show__reaction" aria-hidden="true">？！</span><span class="race-show__portrait">${imageHtml(pet)}</span><span class="race-show__dust" aria-hidden="true">···</span></div>
        <span class="race-show__finish" aria-hidden="true"><span>🏁</span><i>╱╲</i></span>
      </div></div>`).join('')}</div>
      <div class="race-show__marshal" aria-hidden="true">🧑‍🔧 <span>╲◯</span><small>終點，站住！</small></div>
      <div class="race-show__capture" aria-hidden="true">✦ PHOTO FINISH ✦</div>
    </div>
    <div class="race-show__broadcast"><span class="race-show__live">● 現場播報</span><p role="status" aria-live="polite"></p></div>
    <button class="btn btn--secondary" type="button" data-scene-skip>略過動畫，查看賽果</button>
  </section>`;
  const show = root.querySelector('.race-show');
  const runners = [...root.querySelectorAll('[data-scene-runner]')];
  const finishes = [...root.querySelectorAll('.race-show__finish')];
  const line = root.querySelector('[role="status"]');
  const notice = root.querySelector('.race-show__notice');
  const button = root.querySelector('[data-scene-skip]');
  function dispose() { disposed = true; cancelAnimationFrame(frame); button.removeEventListener('click', finish); }
  function finish() { if (disposed) return; dispose(); onComplete(); }
  function render(t) {
    const state = raceSceneFrame(t, winnerIndex);
    runners.forEach((runner, i) => {
      runner.style.left = `${state.positions[i] * 100}%`;
      runner.classList.toggle('is-winner', state.phase === 'photo' && i === winnerIndex);
    });
    finishes.forEach(el => { el.style.left = `${state.finish * 100}%`; });
    if (state.phase !== phase) {
      phase = state.phase; show.dataset.phase = phase; notice.textContent = state.title;
      line.textContent = state.phase === 'photo' ? `${pets[winnerIndex].name} 第一個衝線！${state.line}` : state.line;
    }
  }
  button.addEventListener('click', finish);
  root.querySelector('h2').focus();
  const start = performance.now();
  function step(now) {
    if (disposed) return;
    if (!root.isConnected) { dispose(); return; }
    const t = Math.min(1, (now - start) / RACE_SCENE_MS);
    render(t);
    if (t === 1) finish(); else frame = requestAnimationFrame(step);
  }
  if (reduced) { render(1); button.textContent = '查看賽果'; }
  else { render(0); frame = requestAnimationFrame(step); }
  return { dispose, skip: finish };
}
