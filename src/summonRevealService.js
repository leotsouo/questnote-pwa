/**
 * SSR / UR 抽卡演出特效 — V2.4.0
 *
 * 重要原則：
 * 1. 演出只根據「已經產生」的抽卡結果播放。
 * 2. 演出不影響中獎結果、不重新抽卡、不扣星塵、不寫入任何資料。
 * 3. 只使用 CSS / DOM 動畫，不使用 canvas、不引入外部動畫庫。
 */
import { getPetImageSrc, preloadImage, delay } from './imagePreloadService.js';

const RARITY_RANK = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };

/** 演出時間（毫秒） */
const DURATION = {
  SSR: 1400,
  UR: 2100,
  reduced: 450,
};

/** 圖片預載最長等待（毫秒），逾時就先播放 */
const PRELOAD_TIMEOUT = 550;

/** 粒子數量（控制在 24 以內，避免手機卡頓） */
const PARTICLE_COUNT = { SSR: 14, UR: 20 };

let summonRevealPlaying = false;
let reduceMotionEnabled = false;
let activeOverlay = null;
let activeFinish = null;

/**
 * 由 App 設定同步 reduce motion 狀態（設定頁切換時呼叫）。
 * @param {boolean} value
 */
export function setSummonRevealReduceMotion(value) {
  reduceMotionEnabled = !!value;
}

/** 演出是否正在播放中 */
export function isSummonRevealPlaying() {
  return summonRevealPlaying;
}

/** 該稀有度是否需要播放大型演出 */
export function shouldPlayReveal(rarity) {
  return rarity === 'SSR' || rarity === 'UR';
}

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function isReduceMotion(override) {
  const app = override ?? reduceMotionEnabled;
  return !!app || prefersReducedMotion();
}

/**
 * 取得一組結果中的最高稀有度。
 * @param {Array<{ rarity?: string, pet?: { rarity?: string } }>} results
 * @returns {string}
 */
export function getHighestRarity(results) {
  const list = Array.isArray(results) ? results : [];
  let best = 'N';
  for (const item of list) {
    const rarity = item?.rarity ?? item?.pet?.rarity;
    if (rarity && (RARITY_RANK[rarity] ?? -1) > (RARITY_RANK[best] ?? -1)) {
      best = rarity;
    }
  }
  return best;
}

/**
 * 從結果中挑出代表寵物：優先該稀有度第一個「新獲得」，否則第一個。
 * @param {Array} results
 * @param {string} rarity
 * @returns {object|null}
 */
export function getRevealPetFromResults(results, rarity) {
  const list = Array.isArray(results) ? results : [];
  const matches = list.filter((item) => (item?.rarity ?? item?.pet?.rarity) === rarity);
  if (matches.length === 0) return null;
  const fresh = matches.find((item) => item?.isNew);
  const chosen = fresh || matches[0];
  return chosen?.pet ?? (chosen && chosen.rarity ? chosen : null);
}

/**
 * Debug 專用：從已載入 pets 中找該稀有度第一隻（找不到回傳 null）。
 * 不會寫入任何資料。
 * @param {string} rarity
 * @param {Array<{ rarity?: string }>} allPets
 * @returns {object|null}
 */
export function pickDebugPetByRarity(rarity, allPets) {
  const list = Array.isArray(allPets) ? allPets : [];
  return list.find((pet) => pet?.rarity === rarity) || null;
}

/**
 * 建立演出 overlay DOM。
 * @param {{ rarity: string, pet: object|null, reduceMotion: boolean }} options
 * @returns {HTMLDivElement}
 */
export function createSummonRevealOverlay({ rarity, pet, reduceMotion }) {
  const isUR = rarity === 'UR';
  const overlay = document.createElement('div');
  overlay.className = `summon-reveal-overlay ${isUR ? 'is-ur' : 'is-ssr'}`;
  if (reduceMotion) overlay.classList.add('is-reduced');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', isUR ? '傳說召喚演出' : '稀有召喚演出');

  const caption = isUR ? '傳說夥伴降臨' : '稀有夥伴降臨';
  const petName = pet?.name ? String(pet.name) : '';
  const imgSrc = getPetImageSrc(pet);

  const particlesHtml = reduceMotion
    ? ''
    : Array.from({ length: PARTICLE_COUNT[rarity] ?? 14 }, (_, i) => {
        const left = Math.round(Math.random() * 100);
        const dxDeg = Math.round(Math.random() * 360);
        const dist = 30 + Math.round(Math.random() * 45);
        const dx = Math.round(Math.cos((dxDeg * Math.PI) / 180) * dist);
        const dy = Math.round(Math.sin((dxDeg * Math.PI) / 180) * dist);
        const delayMs = Math.round(Math.random() * 500);
        const durMs = 900 + Math.round(Math.random() * 700);
        const size = 4 + Math.round(Math.random() * 5);
        return `<span class="summon-reveal-particle" style="left:${left}%;--p-dx:${dx}px;--p-dy:${dy}px;--p-delay:${delayMs}ms;--p-dur:${durMs}ms;--p-size:${size}px;--p-i:${i}"></span>`;
      }).join('');

  overlay.innerHTML = `
    <div class="summon-reveal-bg"></div>
    <div class="summon-reveal-stage">
      <div class="summon-reveal-aura" aria-hidden="true"></div>
      <div class="summon-reveal-ring" aria-hidden="true"></div>
      <div class="summon-reveal-particles" aria-hidden="true">${particlesHtml}</div>
      <div class="summon-reveal-card">
        <div class="summon-reveal-rarity">${isUR ? 'UR' : 'SSR'}</div>
        <div class="summon-reveal-pet-frame"></div>
        <div class="summon-reveal-caption"></div>
      </div>
    </div>
    <div class="summon-reveal-continue" aria-hidden="true">點擊畫面繼續</div>
    <button class="summon-reveal-skip" type="button" aria-label="跳過演出">跳過</button>
  `;

  overlay.querySelector('.summon-reveal-caption').textContent = caption;

  const frame = overlay.querySelector('.summon-reveal-pet-frame');
  if (frame && imgSrc) {
    const img = document.createElement('img');
    img.className = 'summon-reveal-pet-image';
    img.alt = petName;
    img.decoding = 'async';
    img.loading = 'eager';
    img.addEventListener('load', () => img.classList.add('is-loaded'));
    img.addEventListener('error', () => {
      // 圖片失敗不破版：移除 img，保留光影 / rarity
      img.remove();
    });
    img.src = imgSrc;
    frame.appendChild(img);
  }

  return overlay;
}

/** 移除 overlay，並清掉任何殘留的 overlay，避免黑幕殘留 */
export function removeSummonRevealOverlay() {
  if (activeOverlay && activeOverlay.parentNode) {
    activeOverlay.parentNode.removeChild(activeOverlay);
  }
  document.querySelectorAll('.summon-reveal-overlay').forEach((el) => el.remove());
  activeOverlay = null;
}

/** 立即跳過目前演出 */
export function skipSummonReveal() {
  if (typeof activeFinish === 'function') activeFinish();
}

/**
 * 播放 SSR / UR 抽卡演出。
 * 回傳 Promise，resolve 後由呼叫端顯示原本結果 Modal。
 * @param {{ rarity: string, pet?: object|null, mode?: string, results?: Array, reduceMotion?: boolean }} options
 * @returns {Promise<void>}
 */
export async function playSummonReveal({ rarity, pet = null, mode = 'single', results = [], reduceMotion } = {}) {
  void mode;
  void results;

  if (!shouldPlayReveal(rarity)) return;
  // 演出中不重複開啟另一個演出
  if (summonRevealPlaying) return;

  summonRevealPlaying = true;
  const reduce = isReduceMotion(reduceMotion);
  let overlay = null;

  try {
    // 圖片預載（最多等待 PRELOAD_TIMEOUT，逾時先播）
    const src = getPetImageSrc(pet);
    if (src) {
      await Promise.race([preloadImage(src, { eager: true }), delay(PRELOAD_TIMEOUT)]);
    }

    overlay = createSummonRevealOverlay({ rarity, pet, reduceMotion: reduce });
    activeOverlay = overlay;
    document.body.appendChild(overlay);
    document.body.classList.add('summon-reveal-active');

    // 觸發進場動畫
    void overlay.offsetWidth;
    overlay.classList.add('is-active');

    const duration = reduce ? DURATION.reduced : DURATION[rarity] ?? DURATION.SSR;

    await new Promise((resolve) => {
      let done = false;
      let ready = false;
      const skipBtn = overlay.querySelector('.summon-reveal-skip');

      const cleanup = () => {
        clearTimeout(readyTimer);
        skipBtn?.removeEventListener('click', onButton);
        overlay.removeEventListener('click', onOverlayClick);
        document.removeEventListener('keydown', onKey, true);
      };
      const finish = () => {
        if (done) return;
        done = true;
        cleanup();
        resolve();
      };
      // 動畫播完後不自動關閉，改為停在最終畫面等待使用者點擊（方便截圖）
      const enterReady = () => {
        if (done) return;
        ready = true;
        overlay.classList.add('is-ready');
        if (skipBtn) skipBtn.textContent = '繼續';
      };
      const onButton = (e) => {
        e.stopPropagation();
        finish();
      };
      const onOverlayClick = () => {
        if (ready) finish();
      };
      const onKey = (e) => {
        if (e.key === 'Escape') {
          // 隨時可略過並結束
          e.preventDefault();
          finish();
        } else if (e.key === 'Enter' && ready) {
          e.preventDefault();
          finish();
        }
      };

      skipBtn?.addEventListener('click', onButton);
      overlay.addEventListener('click', onOverlayClick);
      document.addEventListener('keydown', onKey, true);
      const readyTimer = setTimeout(enterReady, duration);
      activeFinish = finish;
    });
  } catch (err) {
    console.warn('[SummonReveal] 演出發生錯誤，直接進入結果', err);
  } finally {
    removeSummonRevealOverlay();
    document.body.classList.remove('summon-reveal-active');
    activeFinish = null;
    summonRevealPlaying = false;
  }
}

/** SSR 演出（薄封裝） */
export function playSSRReveal(options = {}) {
  return playSummonReveal({ ...options, rarity: 'SSR' });
}

/** UR 演出（薄封裝） */
export function playURReveal(options = {}) {
  return playSummonReveal({ ...options, rarity: 'UR' });
}
