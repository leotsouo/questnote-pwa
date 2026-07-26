/**
 * 晨醒花庭解鎖動畫控制器 — V3.4.0
 *
 * 原則：
 * - 不抽卡、不扣星塵、不發獎、不改 pity
 * - 略過／錯誤／Reduced Motion 只改變展示
 * - animationSeen 由呼叫端在完成／略過／fallback 後寫入
 */
import { getPetImageSrc, preloadImage } from './imagePreloadService.js';

const AWAKENING_PETS = [
  { id: 'pet_r16', rarity: 'R', name: '曉露花蝟' },
  { id: 'pet_sr12', rarity: 'SR', name: '晨鈴花雀' },
  { id: 'pet_ssr07', rarity: 'SSR', name: '曦幕雲鶴' },
  { id: 'pet_ur06', rarity: 'UR', name: '曙綻花后兔' },
];

const SLUMBER_HERO_ID = 'pet_ur05';

const PHASE_MS = {
  full: {
    summonLight: 500,
    rippleStill: 450,
    dewDrop: 500,
    paletteShift: 700,
    reflection: 800,
    openEyes: 500,
    stepOut: 700,
    dualCrown: 600,
    crane: 450,
    songbird: 400,
    hedgehog: 450,
    silhouettes: 700,
    message: 500,
    title: 400,
    reward: 600,
  },
  reduced: {
    total: 700,
  },
};

let playing = false;
let activeAbort = null;
let activeOverlay = null;

export function isPoolAwakeningPlaying() {
  return playing;
}

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function isReduceMotion(flag) {
  return !!flag || prefersReducedMotion();
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      return;
    }
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function lockScroll() {
  const html = document.documentElement;
  const body = document.body;
  const prev = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
  };
  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  return () => {
    html.style.overflow = prev.htmlOverflow;
    body.style.overflow = prev.bodyOverflow;
  };
}

function resolvePetMap(allPets) {
  const map = new Map();
  for (const p of allPets || []) {
    if (p?.id) map.set(p.id, p);
  }
  return map;
}

function buildOverlay({ reduce, title, unlockMessage, rewardPet, allPets }) {
  const byId = resolvePetMap(allPets);
  const overlay = document.createElement('div');
  overlay.className = 'pool-awakening-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title || '晨醒花庭解鎖');
  if (reduce) overlay.classList.add('is-reduced');

  const live = document.createElement('div');
  live.className = 'pool-awakening-live';
  live.setAttribute('aria-live', 'polite');
  live.dataset.role = 'live';
  live.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';

  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'pool-awakening-skip';
  skip.textContent = '略過';
  skip.dataset.role = 'skip';

  const stage = document.createElement('div');
  stage.className = 'pool-awakening-stage';
  stage.dataset.role = 'stage';

  const mirror = document.createElement('div');
  mirror.className = 'pool-awakening-mirror';
  mirror.dataset.role = 'mirror';

  const slumber = byId.get(SLUMBER_HERO_ID);
  const dawn = byId.get('pet_ur06');
  const slumberImg = document.createElement('img');
  slumberImg.className = 'pool-awakening-mirror__slumber';
  slumberImg.alt = '';
  slumberImg.decoding = 'async';
  if (slumber) slumberImg.src = getPetImageSrc(slumber) || '';
  const dawnImg = document.createElement('img');
  dawnImg.className = 'pool-awakening-mirror__dawn';
  dawnImg.alt = '';
  dawnImg.decoding = 'async';
  if (dawn) dawnImg.src = getPetImageSrc(dawn) || '';
  mirror.append(slumberImg, dawnImg);

  const cast = document.createElement('div');
  cast.className = 'pool-awakening-cast';
  cast.dataset.role = 'cast';
  for (const meta of AWAKENING_PETS) {
    const pet = byId.get(meta.id);
    const item = document.createElement('div');
    item.className = 'pool-awakening-cast__item';
    item.dataset.rarity = meta.rarity;
    item.dataset.petId = meta.id;
    const img = document.createElement('img');
    img.alt = meta.name;
    img.decoding = 'async';
    if (pet) img.src = getPetImageSrc(pet) || '';
    const label = document.createElement('span');
    label.textContent = `${meta.rarity} ${meta.name}`;
    item.append(img, label);
    cast.appendChild(item);
  }

  const message = document.createElement('p');
  message.className = 'pool-awakening-message';
  message.dataset.role = 'message';
  message.textContent = unlockMessage || '沉眠有歸，甦醒有時。';

  const heading = document.createElement('h2');
  heading.className = 'pool-awakening-title';
  heading.dataset.role = 'title';
  heading.textContent = `${title || '晨醒花庭'}已解鎖`;

  const reward = document.createElement('div');
  reward.className = 'pool-awakening-reward';
  reward.dataset.role = 'reward';
  reward.hidden = true;
  const rewardImg = document.createElement('img');
  rewardImg.alt = rewardPet?.name || '曉露花蝟';
  rewardImg.decoding = 'async';
  if (rewardPet) rewardImg.src = getPetImageSrc(rewardPet) || '';
  const rewardText = document.createElement('p');
  rewardText.textContent = `固定獲得 R｜${rewardPet?.name || '曉露花蝟'}`;
  reward.append(rewardImg, rewardText);

  const confirm = document.createElement('button');
  confirm.type = 'button';
  confirm.className = 'pool-awakening-confirm';
  confirm.textContent = '繼續';
  confirm.dataset.role = 'confirm';
  confirm.hidden = true;

  stage.append(mirror, cast, message, heading, reward, confirm);
  overlay.append(live, skip, stage);
  return overlay;
}

function cleanup() {
  if (activeOverlay?.parentNode) {
    activeOverlay.parentNode.removeChild(activeOverlay);
  }
  activeOverlay = null;
  activeAbort = null;
  playing = false;
}

/**
 * @param {{
 *   allPets?: Array,
 *   expansion?: object|null,
 *   rewardPet?: object|null,
 *   reduceMotion?: boolean,
 *   forceFallback?: boolean,
 * }} options
 * @returns {Promise<{ ok: boolean, skipped: boolean, fallback: boolean, seen: boolean }>}
 */
export async function playMorningGardenUnlock(options = {}) {
  if (playing) {
    return { ok: false, skipped: false, fallback: true, seen: false };
  }

  playing = true;
  const reduce = isReduceMotion(options.reduceMotion);
  const expansion = options.expansion || {};
  const unlockUnlockScroll = lockScroll();
  const controller = new AbortController();
  activeAbort = controller;

  let skipped = false;
  let fallback = false;
  let seen = false;

  const markSkip = () => {
    skipped = true;
    if (!controller.signal.aborted) controller.abort();
  };

  try {
    if (options.forceFallback) {
      throw new Error('forced fallback');
    }

    const overlay = buildOverlay({
      reduce,
      title: expansion.title,
      unlockMessage: expansion.unlockMessage,
      rewardPet: options.rewardPet,
      allPets: options.allPets,
    });
    activeOverlay = overlay;
    document.body.appendChild(overlay);
    // 雙 rAF：先確認初始 hidden／opacity，再進場，避免閃現
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    overlay.classList.add('is-ready');

    const skipBtn = overlay.querySelector('[data-role="skip"]');
    const confirmBtn = overlay.querySelector('[data-role="confirm"]');
    const liveEl = overlay.querySelector('[data-role="live"]');
    const rewardEl = overlay.querySelector('[data-role="reward"]');
    const castEl = overlay.querySelector('[data-role="cast"]');

    skipBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      markSkip();
    });
    const onKey = (e) => {
      if (e.key === 'Escape') markSkip();
    };
    window.addEventListener('keydown', onKey);

    // 預載圖片（失敗不阻斷）
    const preloadTargets = [SLUMBER_HERO_ID, ...AWAKENING_PETS.map((p) => p.id)];
    const byId = resolvePetMap(options.allPets);
    await Promise.all(
      preloadTargets.map(async (id) => {
        const pet = byId.get(id);
        const src = pet ? getPetImageSrc(pet) : '';
        if (!src) return;
        try {
          await preloadImage(src, { eager: true });
        } catch {
          /* ignore */
        }
      }),
    );

    if (liveEl) liveEl.textContent = '晨醒花庭解鎖演出開始';

    const run = async (phase, ms) => {
      overlay.dataset.phase = phase;
      await wait(ms, controller.signal);
    };

    if (reduce) {
      overlay.classList.add('is-finale');
      castEl?.querySelectorAll('.pool-awakening-cast__item').forEach((el) => {
        el.classList.add('is-lit');
      });
      if (rewardEl) rewardEl.hidden = false;
      await wait(PHASE_MS.reduced.total, controller.signal);
    } else {
      const P = PHASE_MS.full;
      try {
        await run('summon-light', P.summonLight);
        await run('ripple-still', P.rippleStill);
        await run('dew-drop', P.dewDrop);
        await run('palette-shift', P.paletteShift);
        await run('reflection', P.reflection);
        await run('open-eyes', P.openEyes);
        await run('step-out', P.stepOut);
        await run('dual-crown', P.dualCrown);
        await run('crane', P.crane);
        await run('songbird', P.songbird);
        await run('hedgehog', P.hedgehog);
        await run('silhouettes', P.silhouettes);
        for (const el of castEl?.querySelectorAll('.pool-awakening-cast__item') || []) {
          el.classList.add('is-lit');
          await wait(120, controller.signal);
        }
        await run('message', P.message);
        await run('title', P.title);
        overlay.classList.add('is-finale');
        if (rewardEl) rewardEl.hidden = false;
        await run('reward', P.reward);
      } catch (err) {
        if (err?.name !== 'AbortError') throw err;
      }
    }

    // 略過或正常結束：顯示獎勵與確認
    overlay.classList.add('is-finale');
    castEl?.querySelectorAll('.pool-awakening-cast__item').forEach((el) => {
      el.classList.add('is-lit');
    });
    if (rewardEl) rewardEl.hidden = false;
    if (confirmBtn) confirmBtn.hidden = false;
    if (skipBtn) skipBtn.hidden = true;
    if (liveEl) liveEl.textContent = '晨醒花庭已解鎖';

    await new Promise((resolve) => {
      const done = () => resolve();
      confirmBtn?.addEventListener('click', done, { once: true });
      // 若已略過，短暫停留後也可自動繼續
      if (skipped) {
        setTimeout(done, reduce ? 200 : 400);
      }
    });

    seen = true;
    window.removeEventListener('keydown', onKey);
    return { ok: true, skipped, fallback: false, seen: true };
  } catch (err) {
    console.warn('[PoolAwakening] fallback', err);
    fallback = true;
    // 簡化解鎖結果
    try {
      const simple = document.createElement('div');
      simple.className = 'pool-awakening-fallback';
      simple.setAttribute('role', 'dialog');
      const h = document.createElement('h2');
      h.textContent = `${expansion.title || '晨醒花庭'}已解鎖`;
      const p = document.createElement('p');
      p.textContent = expansion.unlockMessage || '沉眠有歸，甦醒有時。';
      const r = document.createElement('p');
      r.textContent = `固定獲得 R｜${options.rewardPet?.name || '曉露花蝟'}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '繼續';
      simple.append(h, p, r, btn);
      document.body.appendChild(simple);
      await new Promise((resolve) => {
        btn.addEventListener('click', () => {
          simple.remove();
          resolve();
        }, { once: true });
      });
      seen = true;
    } catch {
      seen = true;
    }
    return { ok: true, skipped, fallback: true, seen: true };
  } finally {
    unlockUnlockScroll();
    cleanup();
  }
}

export function skipPoolAwakening() {
  if (activeAbort && !activeAbort.signal.aborted) {
    activeAbort.abort();
  }
}

export { AWAKENING_PETS, SLUMBER_HERO_ID };
