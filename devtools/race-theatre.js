import { mountRaceScene, RACE_SCRIPTS, pickRaceScript } from '../src/dailyRaceScene.js';
const stage = document.querySelector('#stage');
const play = document.querySelector('#play');
const shuffle = document.querySelector('#shuffle');
const scriptSelect = document.querySelector('#script');
scriptSelect.innerHTML = '<option value="random">隨機四選一（每種 25%）</option>' + RACE_SCRIPTS.map(s => `<option value="${s.id}">${s.label}</option>`).join('');
const escapeHtml = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const image = pet => `<img src="../${escapeHtml(pet.imageVariants?.card || pet.image)}" alt="${escapeHtml(pet.name)}">`;
let cast = [], scene = null, winner = null, activeScript = null;
try {
  const response = await fetch('../data/pets.json');
  if (!response.ok) throw new Error('圖鑑載入失敗');
  const { pets } = await response.json();
  function changeCast() {
    scene?.dispose(); scene = null; winner = null; activeScript = null;
    const available = [...pets];
    cast = Array.from({ length: 4 }, () => available.splice(Math.floor(Math.random() * available.length), 1)[0]);
    lobby();
  }
  function lobby() {
    stage.innerHTML = `<div class="cast">${cast.map(p => `<div>${image(p)}<small>${escapeHtml(p.name)}</small></div>`).join('')}</div><p>四位選手準備好了。<br>${scriptSelect.value === 'random' ? '本場劇本會在開始時隨機選出。' : escapeHtml(RACE_SCRIPTS.find(s => s.id === scriptSelect.value).title)}</p>`;
    play.textContent = '開始試玩';
  }
  function start() {
    scene?.dispose();
    winner ??= cast[Math.floor(Math.random() * 4)];
    activeScript ??= scriptSelect.value === 'random' ? pickRaceScript() : scriptSelect.value;
    const script = RACE_SCRIPTS.find(s => s.id === activeScript);
    play.textContent = '從頭再看一次';
    scene = mountRaceScene(stage, { pets: cast, winnerId: winner.id, imageHtml: image, scriptId: activeScript,
      reducedMotion: document.querySelector('#reduced').checked,
      onComplete() {
        scene = null;
        stage.innerHTML = `<div class="result"><span class="eyebrow">${escapeHtml(script.label)} · 賽事結束</span><h2 tabindex="-1">${escapeHtml(winner.name)} 獲勝！</h2>${image(winner)}<p>${escapeHtml(script.ending)}</p><span class="badge">再看一次保留本場劇本與冠軍</span></div>`;
        stage.querySelector('h2').focus(); play.textContent = '再看一次';
      },
    });
  }
  play.onclick = start; shuffle.onclick = changeCast;
  scriptSelect.onchange = () => { scene?.dispose(); scene = null; activeScript = null; lobby(); };
  changeCast(); play.disabled = false; shuffle.disabled = false;
} catch (error) { stage.textContent = `無法準備試玩：${error.message}。請重新整理。`; }
