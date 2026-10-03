/** Shared clock: Honeylight short switches; Lionheart full ceremonies and reveals. */
export const SUMMON_TIMING = Object.freeze({
  prelude: Object.freeze([650, 750, 900, 700]),
  reducedPrelude: Object.freeze([100, 100, 150, 150]),
  debutFull: 6000,
  debutShort: 900,
  debutReduced: 500,
  debutShortReduced: 240,
  debutDissolve: 550,
  debutShortDissolve: 240,
  debutReducedDissolve: 240,
  debutShortReducedDissolve: 120,
  ssr: 2500,
  ur: 4500,
  reducedSsr: 550,
  reducedUr: 750,
  nextCharacter: 240,
});

export function summonPreludeDurations(reduced = false) {
  return [...(reduced ? SUMMON_TIMING.reducedPrelude : SUMMON_TIMING.prelude)];
}

export function poolDebutDuration(full = true, reduced = false) {
  return reduced ? (full ? SUMMON_TIMING.debutReduced : SUMMON_TIMING.debutShortReduced) : full ? SUMMON_TIMING.debutFull : SUMMON_TIMING.debutShort;
}

export function poolDebutDissolveDuration(full = true, reduced = false) {
  return reduced ? (full ? SUMMON_TIMING.debutReducedDissolve : SUMMON_TIMING.debutShortReducedDissolve) : full ? SUMMON_TIMING.debutDissolve : SUMMON_TIMING.debutShortDissolve;
}

export function summonRevealDuration(rarity, reduced = false) {
  return reduced ? (rarity === 'UR' ? SUMMON_TIMING.reducedUr : SUMMON_TIMING.reducedSsr) : rarity === 'UR' ? SUMMON_TIMING.ur : SUMMON_TIMING.ssr;
}
