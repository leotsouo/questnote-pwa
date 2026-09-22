/** Unpublished synthetic content. Calling the factory returns independent mutable fixtures. */
export function createPoolContentFixtures() {
  const pets = [];
  const makePool = (id, seed, cost, threshold, rewardRarity, themed) => {
    const prefix = (rarity) => `pet_${rarity.toLowerCase()}`;
    const base = ['N', 'R', 'SR', 'SSR', 'UR'].map((rarity) => ({
      id: `${prefix(rarity)}${seed}`, name: `${id} ${rarity}`, rarity, poolTags: [id],
    }));
    const reward = { id: `${prefix(rewardRarity)}${seed + 1}`, name: `${id} reward`, rarity: rewardRarity, poolTags: [`${id}_expanded`] };
    const hero = { id: `pet_ur${seed + 1}`, name: `${id} expanded hero`, rarity: 'UR', poolTags: [`${id}_expanded`], presentation: { revealKey: 'petal' } };
    pets.push(...base, reward, hero);
    return {
      id, name: `${id}召喚`, active: true, cost,
      rates: { N: 0.55, R: 0.30, SR: 0.10, SSR: 0.03, UR: 0.02 },
      pity: { ssr: 30, ur: 100 },
      petFilter: { poolTags: [id] },
      ...(themed ? { presentation: {
        themeKey: 'dream_bloom', animationKey: 'dream_bloom',
        heroPetId: base[4].id, featuredPetIds: [base[3].id],
        debutLines: [id, '新夥伴', '登場'],
      } } : {}),
      unlockExpansion: {
        key: 'first_expansion', threshold, progressScope: 'lifetime_pool_draws',
        extraPoolTags: [`${id}_expanded`], rewardPetId: reward.id,
        animationKey: 'pool_unlock', title: `${id}擴充`, unlockMessage: '新的夥伴已加入。',
        presentation: { heroPetId: hero.id, featuredPetIds: [reward.id] },
      },
    };
  };
  const alpha = makePool('fixture_alpha', 900, 100, 20, 'R', true);
  const beta = makePool('fixture_beta', 910, 75, 3, 'SSR', false);
  return { catalog: { schemaVersion: 1, pools: [alpha, beta] }, pets, alpha, beta };
}
