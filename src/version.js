/**
 * QuestNote 版本資訊 — 單一來源
 * 發佈新版時請同步更新 service-worker.js 的 CACHE_NAME
 */
import { RELEASE_PROFILE } from './releaseProfile.js';

export const APP_VERSION = '3.5.22';
export const CACHE_NAME = 'questnote-production-app-0d93c6aa6a1c6ce427723d957e1b30f07e61ef3dbcd5f79fc3a7313cc8ceee34';
export const PET_IMAGE_CACHE = 'questnote-production-pet-images-v1';
export const MAILBOX_RUNTIME_CACHE = 'questnote-production-mailbox-runtime-v1';
/** ISO 8601 — 每次發佈請更新 */
export const BUILD_TIME = '2026-10-03T08:57:33.000Z';

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
  return './service-worker.js?artifact=0d93c6aa6a1c6ce427723d957e1b30f07e61ef3dbcd5f79fc3a7313cc8ceee34';
}
