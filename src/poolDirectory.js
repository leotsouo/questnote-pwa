// Display policy only. Draw rules and saved selection remain owned by gacha services.
export const POOL_NAVIGATION = Object.freeze({
  featuredPoolId: 'darkcrown_court_release',
  standardPoolId: 'standard',
});

export function poolNavigation(pools, policy = POOL_NAVIGATION) {
  const active = pools.filter((row) => row.active);
  return {
    featured: active.find((row) => row.id === policy.featuredPoolId) || null,
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
