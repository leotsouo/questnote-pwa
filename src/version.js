/**
 * QuestNote 版本資訊 — 單一來源
 * 發佈新版時請同步更新 service-worker.js 的 CACHE_NAME
 */
export const APP_VERSION = '2.3.5';
export const CACHE_NAME = 'questnote-cache-v235-pet-image-optimization';
export const PET_IMAGE_CACHE = 'questnote-pet-images-v235';
/** ISO 8601 — 每次發佈請更新 */
export const BUILD_TIME = '2026-07-02T20:00:00+08:00';

export function formatDisplayVersion() {
  return `V${APP_VERSION}`;
}

export function formatBuildTimeLocal() {
  try {
    return new Intl.DateTimeFormat('zh-Hant-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(BUILD_TIME));
  } catch {
    return BUILD_TIME;
  }
}

export function getServiceWorkerRegisterUrl() {
  const buildTag = APP_VERSION.replace(/\./g, '');
  return `./service-worker.js?v=${buildTag}`;
}
