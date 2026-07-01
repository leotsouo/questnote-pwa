/**
 * 寵物圖片預載與記憶體快取 — 降低手機 PWA 重複下載 / decode
 */

const loadedUrls = new Set();
const failedUrls = new Set();

/**
 * 取得寵物圖片 URL（與 img src 一致）
 * @param {{ image?: string } | null | undefined} pet
 * @returns {string | null}
 */
export function getPetImageSrc(pet) {
  if (!pet?.image) return null;
  const raw = String(pet.image).trim();
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
    return raw;
  }
  if (raw.startsWith('./')) return raw;
  if (raw.startsWith('/')) return raw;
  return raw;
}

/**
 * @param {string | null | undefined} src
 * @param {{ eager?: boolean }} [options]
 * @returns {Promise<{ src: string, ok: boolean, cached?: boolean }>}
 */
export function preloadImage(src, options = {}) {
  const { eager = false } = options;
  return new Promise((resolve) => {
    const resolved = getPetImageSrc({ image: src });
    if (!resolved) {
      resolve({ src: '', ok: false });
      return;
    }
    if (loadedUrls.has(resolved)) {
      resolve({ src: resolved, ok: true, cached: true });
      return;
    }
    if (failedUrls.has(resolved)) {
      resolve({ src: resolved, ok: false });
      return;
    }

    const img = new Image();
    img.decoding = 'async';
    if (eager) {
      img.loading = 'eager';
    }
    img.onload = () => {
      loadedUrls.add(resolved);
      resolve({ src: resolved, ok: true });
    };
    img.onerror = () => {
      failedUrls.add(resolved);
      resolve({ src: resolved, ok: false });
    };
    img.src = resolved;
  });
}

/**
 * 限制並發的批次預載
 * @param {string[]} srcList
 * @param {number} [limit=4]
 */
export async function preloadImages(srcList, limit = 4) {
  const unique = [...new Set((srcList || []).map((s) => getPetImageSrc({ image: s })).filter(Boolean))];
  if (unique.length === 0) return [];

  const results = new Array(unique.length);
  let cursor = 0;

  async function worker() {
    while (cursor < unique.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await preloadImage(unique[index], { eager: true });
    }
  }

  const workers = Math.min(Math.max(1, limit), unique.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

/** @param {string} src */
export function warmPetImageCache(src) {
  return preloadImage(src, { eager: true });
}

/**
 * @param {{ companion?: { image?: string } } | null | undefined} state
 */
export function preloadCompanionImage(state) {
  const src = getPetImageSrc(state?.companion);
  if (!src) return Promise.resolve([]);
  return preloadImage(src, { eager: true }).then((r) => [r]);
}

/**
 * @param {object | object[]} results 單抽結果或十連 results 陣列
 */
export function preloadGachaResultImages(results) {
  const list = Array.isArray(results) ? results : [results];
  const srcs = list
    .map((item) => {
      const pet = item?.pet ?? item;
      return getPetImageSrc(pet);
    })
    .filter(Boolean);
  return preloadImages(srcs, 4);
}

/**
 * @param {Array<{ owned?: boolean, image?: string }>} collection
 * @param {Array<{ image?: string }>} [_pets]
 * @param {number} [limit=12]
 */
export function preloadOwnedPetImages(collection, _pets, limit = 12) {
  const owned = (collection || []).filter((p) => p.owned);
  const srcs = owned.slice(0, limit).map((p) => getPetImageSrc(p)).filter(Boolean);
  return preloadImages(srcs, 4);
}

/** @param {number} ms */
export function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * 等待預載完成，或逾時後繼續（避免 Modal 卡住）
 * @param {Promise<unknown>} promise
 * @param {number} [ms=600]
 */
export async function waitForPreloadWithTimeout(promise, ms = 600) {
  try {
    await Promise.race([promise, delay(ms)]);
  } catch {
    /* 預載失敗不阻斷 UI */
  }
}

/** @param {string} src */
export function isImagePreloaded(src) {
  const resolved = getPetImageSrc({ image: src });
  return resolved ? loadedUrls.has(resolved) : false;
}

export function getPreloadStats() {
  return { loaded: loadedUrls.size, failed: failedUrls.size };
}
