/**
 * QuestNote 版本資訊 — 單一來源
 * 發佈新版時請同步更新 service-worker.js 的 CACHE_NAME
 */
import { RELEASE_PROFILE } from './releaseProfile.js';

export const APP_VERSION = '3.8.8';
export const CACHE_NAME = 'questnote-production-app-af250b58a7a712856ce2b67d3df1eaac80242158fcde8b4e7d12ec37dc9e324a';
export const PET_IMAGE_CACHE = 'questnote-production-pet-images-v1';
export const MAILBOX_RUNTIME_CACHE = 'questnote-production-mailbox-runtime-v1';
/** ISO 8601 — 每次發佈請更新 */
export const BUILD_TIME = '2026-10-07T20:28:26.000Z';

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
  return './service-worker.js?artifact=af250b58a7a712856ce2b67d3df1eaac80242158fcde8b4e7d12ec37dc9e324a';
}


