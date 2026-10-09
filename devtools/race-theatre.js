import { mountRaceScene } from '../src/dailyRaceScene.js';
const stage = document.querySelector('#stage');
const play = document.querySelector('#play');
const shuffle = document.querySelector('#shuffle');
const escapeHtml = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const image = pet => `<img src="../${escapeHtml(pet.imageVariants?.card || pet.image)}" alt="${escapeHtml(pet.name)}">`;
let cast = [], scene = null, winner = null;
try {
  const response = await fetch('../data/pets.json');
  if (!response.ok) throw new Error('圖鑑載入失敗');
  const { pets } = await response.json();
  function changeCast() {
    scene?.dispose(); scene = null; winner = null;
    const available = [...pets];
    cast = Array.from({ length: 4 }, () => available.splice(Math.floor(Math.random() * available.length), 1)[0]);
    stage.innerHTML = `<div class="cast">${cast.map(p => `<div>${image(p)}<small>${escapeHtml(p.name)}</small></div>`).join('')}</div><p>四位選手都準備好了。<br>終點：我沒有。</p>`;
    play.textContent = '開始試玩';
  }
  function start() {
    scene?.dispose();
    winner ??= cast[Math.floor(Math.random() * 4)];
    play.textContent = '從頭再看一次';
    scene = mountRaceScene(stage, { pets: cast, winnerId: winner.id, imageHtml: image,
      reducedMotion: document.querySelector('#reduced').checked,
      onComplete() {
        scene = null;
        stage.innerHTML = `<div class="result"><span class="eyebrow">賽事結束 · 終點還在東張西望</span><h2 tabindex="-1">${escapeHtml(winner.name)} 獲勝！</h2>${image(winner)}<p>終於追上了！那顆眼睛看起來還不太服氣。</p><span class="badge">本場最佳逃跑獎：終點線 🏁</span></div>`;
        stage.querySelector('h2').focus(); play.textContent = '再看一次';
      },
    });
  }
  play.onclick = start; shuffle.onclick = changeCast;
  changeCast(); play.disabled = false; shuffle.disabled = false;
} catch (error) { stage.textContent = `無法準備試玩：${error.message}。請重新整理。`; }
