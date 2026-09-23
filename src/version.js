/**
 * QuestNote 版本資訊 — 單一來源
 * 發佈新版時請同步更新 service-worker.js 的 CACHE_NAME
 */
import { RELEASE_PROFILE } from './releaseProfile.js';

export const APP_VERSION = '3.4.8';
export const CACHE_NAME = 'questnote-preview-cache-v348-ui-polish';
export const PET_IMAGE_CACHE = 'questnote-preview-pet-images-v235';
export const MAILBOX_RUNTIME_CACHE = 'questnote-preview-mailbox-runtime-v1';
/** ISO 8601 — 每次發佈請更新 */
export const BUILD_TIME = '2026-09-23T08:21:07Z';

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
  if (RELEASE_PROFILE) return `./service-worker.js?artifact=${RELEASE_PROFILE.artifactId}`;
  const buildTag = APP_VERSION.replace(/\./g, '');
  return `./service-worker.js?v=${buildTag}`;
}
