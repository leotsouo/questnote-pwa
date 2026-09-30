// Presentation-only state. No App imports, IndexedDB, account, or production write.
// Verified against src/rewardService.js at source commit 23d8cdc (normal priority).
export const DEMO_REWARD = Object.freeze({ stardust: 20, energy: 1, bond: 5 });
export const INITIAL_DEMO = Object.freeze({ completed: false, progress: 2, total: 5, bond: 10, bondMax: 50 });

/** @param {{ completed: boolean, progress: number, total: number, bond: number, bondMax: number }} state */
export function completeQuest(state) {
  if (state.completed) return state;
  return { ...state, completed: true, progress: state.progress + 1, bond: state.bond + DEMO_REWARD.bond };
}

/** @returns {{ completed: boolean, progress: number, total: number, bond: number, bondMax: number }} */
export function resetQuest() {
  return { ...INITIAL_DEMO };
}
