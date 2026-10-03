export const ANALYTICS_EVENTS = Object.freeze([
  'page_view', 'hero_cta', 'demo_start', 'quest_completed', 'demo_reset',
  'final_cta', 'sticky_cta', 'distribution_click', 'product_screen',
]);

/** @param {string} search */
export function getAttribution(search) {
  const params = new URLSearchParams(search);
  return Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign']
    .filter(key => params.has(key))
    .map(key => [key, (params.get(key) || '').slice(0, 100)]));
}

/** @param {string} url @param {Record<string, string>} attribution */
export function distributionUrl(url, attribution) {
  if (!url.startsWith('https://')) return url;
  const target = new URL(url);
  for (const [key, value] of Object.entries(attribution)) target.searchParams.set(key, value);
  return target.href;
}

/** @param {string} name @param {Record<string, unknown>} details @param {typeof import('./config.js').MARKETING_CONFIG} config */
export function track(name, details = {}, config) {
  if (!ANALYTICS_EVENTS.includes(name)) throw new Error('Unknown marketing event');
  if (navigator.globalPrivacyControl || navigator.doNotTrack === '1') return;
  const event = { name, ...details, attribution: getAttribution(location.search) };
  window.dispatchEvent(new CustomEvent('questnote:analytics', { detail: event }));
  // Explicit opt-in integration. Default is no collection and no persistent ID.
  const endpoint = config?.analytics.eventEndpoint;
  if (endpoint && new URL(endpoint).origin === location.origin) {
    navigator.sendBeacon(endpoint, new Blob([JSON.stringify(event)], { type: 'application/json' }));
  }
}
