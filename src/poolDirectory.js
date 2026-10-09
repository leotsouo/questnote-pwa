// Display policy only. Draw rules and saved selection remain owned by gacha services.
import { recommendationState } from './poolRecommendation.js';

export const POOL_NAVIGATION = Object.freeze({
  featuredPoolId: 'aurora_fairy_feast',
  standardPoolId: 'standard',
  // Set explicit ISO timestamps with timezone only when the launch date is confirmed.
  // First rollout begins at this feature's formal launch, not the series' old release date.
  recommendation: null,
});

export function poolNavigation(pools, policy = POOL_NAVIGATION, now = Date.now()) {
  const active = pools.filter((row) => row.active);
  const { status } = recommendationState(policy.recommendation, now);
  return {
    featured: status === 'ended' || status === 'invalid' ? null : active.find((row) => row.id === policy.featuredPoolId) || null,
    standard: active.find((row) => row.id === policy.standardPoolId) || null,
    entries: active,
  };
}

export function searchPoolDirectory(pools, query = '') {
  const terms = String(query).normalize('NFKC').trim().toLocaleLowerCase('zh-TW').split(/\s+/).filter(Boolean);
  return pools.filter((row) => {
    const text = `${row.name} ${row.presentation?.tagline || ''}`.normalize('NFKC').toLocaleLowerCase('zh-TW');
    return terms.every((term) => text.includes(term));
  });
}
