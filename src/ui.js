/**
 * UI 渲染與互動邏輯
 */
import {
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
  addToTodayPlan,
  removeFromTodayPlan,
  toggleSubtaskComplete,
} from './taskService.js';
import { getCategoryById } from './categoryService.js';
import {
  getTodayDateString,
  isInTodayPlan,
  isCompletedToday,
  formatDateBadgeText,
  getDateBadgeClass,
  getSubtaskProgress,
  SMART_LISTS,
  filterBySmartList,
  filterByCategory,
  filterCompletedTasksByRange,
  COMPLETED_RANGE_OPTIONS,
  getCompletedRangeEmptyMessage,
  sortTasks,
  getTodayViewSections,
  validateDateRange,
} from './taskFilterService.js';
import { GACHA_COST, GACHA_TEN_COST, calculateRewardAmount, calculateAdventureEnergyAmount } from './rewardService.js';
import { pullOnce, performTenPull, getActivePool } from './gachaService.js';
import {
  upgradeStar,
  setCompanion,
  STAR_UPGRADE_COST,
  getBondProgress,
  setPetNickname,
  clearPetNickname,
  validatePetNickname,
  getNicknameCharUnits,
  NICKNAME_MAX_UNITS,
  petCompanion,
  canPetCompanion,
  getPetCooldownRemaining,
  formatCooldown,
} from './collectionService.js';
import { getBondUpLine } from './companionService.js';
import {
  getCompanionDialogue,
  randomBubbleInterval,
  IDLE_THRESHOLD_MS,
} from './companionDialogueService.js';
import { setReduceMotion, setTheme, applyThemeToDocument, normalizeTheme } from './preferencesService.js';
import {
  pickStatusLine,
  randomStatusInterval,
  EXPEDITION_COMPLETE_MSG,
} from './expeditionStatusService.js';
import { getBondUnlockText } from './loreService.js';
import {
  downloadBackup,
  readBackupFile,
  validateBackup,
  normalizeBackupPayload,
  previewBackup,
  createAutoBackupBeforeImport,
  restoreBackup,
} from './backupService.js';
import {
  APP_VERSION,
  CACHE_NAME,
  BUILD_TIME,
  formatDisplayVersion,
  formatBuildTimeLocal,
} from './version.js';
import {
  getPetImageSrc,
  warmPetImageCache,
  preloadCompanionImage,
  preloadGachaResultImages,
  preloadOwnedPetImages,
  waitForPreloadWithTimeout,
} from './imagePreloadService.js';
import {
  claimAchievementReward,
  claimAllAchievementRewards,
  equipTitle,
  markTitlesSeen,
  markExportedBackup,
  getAchievementSummary,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  formatAchievementReward,
} from './achievementService.js';
import { isDevMode, unlockDevTestPets, unlockAllDevPets, grantDevStardust, devForceCompleteExpedition, resetDevDailyBlessing } from './devService.js';
import {
  escapeHtml,
  emptyStateHtml,
  errorStateHtml,
} from './uiHelpers.js';
import {
  startExpedition,
  claimExpeditionRewards,
  checkAreaUnlock,
  isExpeditionTimeComplete,
  getRemainingMs,
  formatRemainingTime,
  isPetOnExpedition,
} from './expeditionService.js';
import {
  createHabit,
  updateHabit,
  archiveHabit,
  completeHabitToday,
  uncompleteHabitToday,
  getTodayHabits,
  getWeeklyHabits,
  getArchivedHabits,
  getHabitPageStats,
  isCompletedToday as isHabitCompletedToday,
  isWeeklyGoalMet,
  getWeeklyCompletionCount,
  getHabitStreak,
  formatStreakLabel,
  getWeekMonday,
  hasWeeklyNearGoal,
} from './habitService.js';
import {
  craftItem,
  useBondItem,
  getCraftingPreview,
  getMaterialInfo,
  getCraftableInfo,
  getMaterialName,
  formatItemEffect,
  getFavoriteBonus,
  getDailyBondItemUsage,
  getEnabledCraftables,
  getMaterialInventory,
  getItemInventory,
  getFutureTagLabels,
  DAILY_BOND_ITEM_LIMIT,
  hasCraftableMaterials,
  hasBondItemsInInventory,
  companionLikesAnyGift,
  hasLowMaterials,
} from './workshopService.js';
import {
  performDailyCheckIn,
  prepareDailyWheelSpin,
  finalizeDailyWheelSpin,
  releaseWheelSpinLock,
  loadWheelRewards,
  hasCheckedInToday,
  hasSpunWheelToday,
  isWheelSpinning,
  calculateCheckInRewards,
  isYesterday,
} from './dailyCheckInService.js';
import { MATERIAL_LABELS } from './expeditionService.js';

/** 稀有度中文與色彩 */
export const RARITY_LABELS = {
  N: 'N',
  R: 'R',
  SR: 'SR',
  SSR: 'SSR',
  UR: 'UR',
};

export const PRIORITY_LABELS = {
  normal: '普通',
  important: '重要',
  urgent: '緊急',
};

/** App 狀態參考（由 app.js 注入） */
let state = null;
let pendingImportBackup = null;
let pendingImportFileName = '';
let pendingImportWarnings = [];
let onRefresh = null;
let onAchievementCheck = null;
let expeditionTimer = null;
let expeditionStatusTimer = null;
let expeditionStatusIndex = -1;
let companionDialogueTimer = null;
let lastCompanionId = null;
let lastUserActivity = Date.now();
let currentTasksView = 'tasks';
let selectedExpeditionAreaId = null;
let selectedExpeditionPetId = null;
let achievementFilter = 'all';
let collectionFilter = 'all';
let lastCollectionGridKey = null;
let taskViewMode = 'today';
let activeSmartListId = null;
let taskCategoryFilter = 'all';
let completedSectionCollapsed = true;
let completedRangeFilter = 'completed_1_month';
let archivedHabitsCollapsed = true;
let workshopTab = 'materials';
let dailyWheelRewards = null;
let dailyBlessingCollapsed = true;
let dailyBlessingCollapseDay = null;
let selectedGiftPetId = null;
let selectedGiftItemId = null;
const expandedTaskIds = new Set();
const recentlyCompletedTaskIds = new Set();

/** 全域 Toast 提示 */
/** 寵物顯示名稱（暱稱優先） */
function petDisplayName(pet) {
  return pet?.displayName || pet?.name || '';
}

/** 寵物原始名稱 */
function petOriginalName(pet) {
  return pet?.originalName || pet?.name || '';
}

/** 有暱稱時顯示「原名：」小字 */
function petOriginalNameHtml(pet) {
  if (!pet?.nickname) return '';
  return `<p class="pet-original-name">原名：${escapeHtml(petOriginalName(pet))}</p>`;
}

/** 圖鑑卡片名稱 HTML */
function petNameBlockHtml(pet, { owned = true, heading = 'h3', className = 'collection-card__name' } = {}) {
  if (!owned) {
    return `<${heading} class="${className}">???</${heading}>`;
  }
  if (pet.nickname) {
    return `
      <${heading} class="${className}">${escapeHtml(petDisplayName(pet))}</${heading}>
      <p class="pet-original-name pet-original-name--sm">原名：${escapeHtml(petOriginalName(pet))}</p>`;
  }
  return `<${heading} class="${className}">${escapeHtml(petDisplayName(pet))}</${heading}>`;
}

function openNicknameModal(petId) {
  const pet = state.enrichedCollection.find((p) => p.id === petId);
  if (!pet) {
    showToast('找不到這隻寵物資料。', 'error');
    return;
  }
  if (!pet.owned) {
    showToast('尚未獲得的寵物無法設定暱稱。', 'warning');
    return;
  }

  const currentNickname = pet.nickname || '';
  const originalName = petOriginalName(pet);
  const maxDisplay = Math.floor(NICKNAME_MAX_UNITS / 2);

  openModal(`
    <div class="nickname-modal">
      <h2 class="modal-title">設定寵物暱稱</h2>
      <div class="nickname-modal__pet">
        ${petImageHtml(pet, { size: 'md' })}
        <p class="nickname-modal__original">原始名稱：${escapeHtml(originalName)}</p>
        ${pet.nickname ? `<p class="nickname-modal__current">目前暱稱：${escapeHtml(pet.nickname)}</p>` : '<p class="nickname-modal__current nickname-modal__current--empty">尚未設定暱稱</p>'}
      </div>
      <label class="nickname-modal__field">
        <span class="nickname-modal__label">暱稱</span>
        <input type="text" id="nickname-input" class="nickname-modal__input" maxlength="24" value="${escapeHtml(currentNickname)}" autocomplete="off" enterkeyhint="done" />
        <span class="nickname-modal__counter" id="nickname-counter">0 / ${maxDisplay}</span>
      </label>
      <p class="nickname-modal__hint">暱稱只會影響顯示名稱，不會改變寵物原始資料。</p>
      <div class="nickname-modal__actions">
        <button type="button" class="btn btn--secondary" id="nickname-cancel">取消</button>
        ${pet.nickname ? '<button type="button" class="btn btn--ghost" id="nickname-clear">清除暱稱</button>' : ''}
        <button type="button" class="btn btn--primary" id="nickname-save">儲存</button>
      </div>
    </div>
  `);

  const input = document.getElementById('nickname-input');
  const counter = document.getElementById('nickname-counter');

  const updateCounter = () => {
    const units = getNicknameCharUnits(input?.value || '');
    const displayUsed = Math.ceil(units / 2);
    if (counter) {
      counter.textContent = `${displayUsed} / ${maxDisplay}`;
      counter.classList.toggle('nickname-modal__counter--over', units > NICKNAME_MAX_UNITS);
    }
  };
  updateCounter();
  input?.addEventListener('input', updateCounter);

  document.getElementById('nickname-cancel')?.addEventListener('click', closeModal);

  document.getElementById('nickname-clear')?.addEventListener('click', async () => {
    const result = await clearPetNickname(petId);
    if (!result.success) {
      showToast(result.message || '暱稱儲存失敗，請稍後再試。', 'error');
      return;
    }
    closeModal();
    await onRefresh({ renderMode: ['collection'] });
    openPetDetailModal(petId);
    showToast('暱稱已清除', 'success');
  });

  document.getElementById('nickname-save')?.addEventListener('click', async () => {
    const value = input?.value ?? '';
    const validation = validatePetNickname(value);
    if (!validation.valid) {
      showToast(validation.error || '暱稱太長，請重新輸入。', 'warning');
      return;
    }
    const result = await setPetNickname(petId, value);
    if (!result.success) {
      showToast(result.message || '暱稱儲存失敗，請稍後再試。', 'error');
      return;
    }
    closeModal();
    await onRefresh({ renderMode: ['collection'] });
    openPetDetailModal(petId);
    showToast(result.cleared ? '暱稱已清除' : '暱稱已更新', 'success');
    if (!result.cleared) {
      const card = document.querySelector(`.collection-card[data-pet-id="${petId}"]`);
      if (card && !state.userPreferences?.reduceMotion) {
        card.classList.add('collection-card--nickname-glow');
        setTimeout(() => card.classList.remove('collection-card--nickname-glow'), 800);
      }
    }
    await handleAchievementCheckAfterAction();
  });
}

export function showToast(message, type = 'info', duration = 2800) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ', reward: '✨' };
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.innerHTML = `<span class="toast__icon" aria-hidden="true">${icons[type] || icons.info}</span><span class="toast__message">${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/** Sweet 主題 toast 可讀性測試（僅開發模式） */
function bindSweetToastDevTest() {
  if (!isDevMode()) return;
  window.testSweetToasts = function testSweetToasts() {
    showToast('任務完成！星塵 +20', 'success');
    setTimeout(() => showRewardToast(20, 1), 800);
    setTimeout(() => showToast('今天已經完成這項任務', 'info'), 1600);
    setTimeout(() => showToast('材料不足，無法製作', 'warning'), 2400);
    setTimeout(() => showToast('操作失敗，請稍後再試', 'error'), 3200);
  };
}

export function initUI(appState, refreshCallback, achievementCheckCallback) {
  state = appState;
  onRefresh = refreshCallback;
  onAchievementCheck = achievementCheckCallback;
  bindNavigation();
  bindModals();
  bindDelegatedEvents();
  bindActivityTracking();
  bindAchievementClaimAll();

  document.getElementById('collection-filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    collectionFilter = btn.dataset.filter;
    renderCollectionView();
  });

  document.getElementById('achievement-filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    achievementFilter = btn.dataset.achFilter;
    renderAchievementsView();
  });

  document.getElementById('task-view-tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-task-view]');
    if (!btn) return;
    taskViewMode = btn.dataset.taskView;
    activeSmartListId = null;
    document.querySelectorAll('#task-view-tabs .segmented-control__btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.taskView === taskViewMode);
      b.setAttribute('aria-selected', b.dataset.taskView === taskViewMode ? 'true' : 'false');
    });
    renderTasksView();
  });

  document.getElementById('task-category-filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    taskCategoryFilter = btn.dataset.catFilter;
    renderTasksView();
  });

  document.getElementById('workshop-tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-workshop-tab]');
    if (!btn) return;
    workshopTab = btn.dataset.workshopTab;
    document.querySelectorAll('#workshop-tabs .segmented-control__btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.workshopTab === workshopTab);
      b.setAttribute('aria-selected', b.dataset.workshopTab === workshopTab ? 'true' : 'false');
    });
    renderWorkshopView();
  });

  renderVersionInfo();
  bindSweetToastDevTest();
}

/** 使用事件委派，避免重複渲染後按鈕失效 */
function bindDelegatedEvents() {
  document.getElementById('view-tasks')?.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const card = target.closest('.task-card');
    const id = card?.dataset.id;
    const action = target.dataset.action;

    if (action === 'toggle' && id) {
      const cardEl = target.closest('.task-card');
      const taskBefore = state.tasks.find((t) => t.id === id);
      const isCompleting = taskBefore && !taskBefore.completed;

      if (cardEl && isCompleting) {
        cardEl.classList.add('task-card--completing');
        cardEl.classList.add('task-card--done');
        const check = cardEl.querySelector('.task-check');
        if (check) {
          check.classList.add('checked');
          check.textContent = '✓';
        }
        cardEl.querySelector('.task-card__complete-btn')?.remove();
        cardEl.querySelector('.task-card__rewards')?.remove();
      }

      const result = await toggleTaskComplete(id);

      if (isCompleting) {
        recentlyCompletedTaskIds.add(id);
        setTimeout(() => recentlyCompletedTaskIds.delete(id), 2500);

        if (result.reward) {
          showRewardToast(result.reward.amount, result.reward.energy);
        } else {
          showToast('任務已完成', 'success');
        }
      }

      await onRefresh();

      if (isCompleting && taskViewMode === 'today') {
        requestAnimationFrame(() => {
          document.querySelector(`.task-card[data-id="${id}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }

      if (result.reward?.bond?.leveledUp) {
        const bondLine = getBondUpLine(state.companion);
        showBondLevelUpToast(result.reward.bond.newLevel, bondLine);
      }
      await handleAchievementCheckAfterAction();
    } else if (action === 'toggle-subtask' && id) {
      const subtaskId = target.dataset.subtaskId;
      if (!subtaskId) return;
      const result = await toggleSubtaskComplete(id, subtaskId);
      await onRefresh();
      if (result.justCompleted) {
        showToast('子任務完成', 'success', 1800);
      }
      if (result.allSubtasksDone) {
        showToast('子任務都完成了，要完成這個任務嗎？', 'info', 3500);
      }
      await handleAchievementCheckAfterAction();
    } else if (action === 'toggle-expand' && id) {
      if (expandedTaskIds.has(id)) expandedTaskIds.delete(id);
      else expandedTaskIds.add(id);
      renderTasksView();
    } else if (action === 'plan-today' && id) {
      await addToTodayPlan(id);
      await onRefresh();
      showToast('已加入今日計畫', 'success');
      await handleAchievementCheckAfterAction();
    } else if (action === 'unplan-today' && id) {
      await removeFromTodayPlan(id);
      await onRefresh();
      showToast('已移出今日計畫', 'info');
    } else if (action === 'smart-list') {
      activeSmartListId = target.dataset.listId;
      if (target.dataset.listId === 'completed') {
        completedRangeFilter = 'completed_1_month';
      }
      renderTasksView();
    } else if (action === 'smart-list-back') {
      activeSmartListId = null;
      renderTasksView();
    } else if (action === 'completed-range') {
      completedRangeFilter = target.dataset.range;
      renderTasksView();
    } else if (action === 'toggle-completed-section') {
      completedSectionCollapsed = !completedSectionCollapsed;
      renderTasksView();
    } else if (action === 'pick-unscheduled') {
      taskViewMode = 'all';
      taskCategoryFilter = 'all';
      document.querySelectorAll('#task-view-tabs .segmented-control__btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.taskView === 'all');
      });
      renderTasksView();
    } else if (action === 'go-achievements') {
      switchView('achievements');
    } else if (action === 'go-habits') {
      switchView('habits');
    } else if (action === 'toggle-daily-blessing') {
      dailyBlessingCollapsed = !dailyBlessingCollapsed;
      dailyBlessingCollapseDay = getTodayDateString();
      renderDailyBlessingSection();
    } else if (action === 'daily-check-in') {
      await handleDailyCheckIn();
    } else if (action === 'daily-open-wheel') {
      await openDailyWheelModal();
    } else if (action === 'companion-view-image') {
      if (state?.companion) {
        openCompanionImageModal(state.companion);
      }
    } else if (action === 'companion-talk') {
      showCompanionDialogue();
    } else if (action === 'companion-pet') {
      e.stopPropagation();
      await handleCompanionPet();
    } else if (action === 'empty-add-task') {
      openTaskForm();
    } else if (action === 'empty-go-gacha') {
      switchView('gacha');
    } else if (action === 'empty-go-collection') {
      switchView('collection');
    } else if (action === 'edit' && id) {
      openTaskForm(id);
    } else if (action === 'delete' && id) {
      openConfirmModal('刪除任務', '確定要刪除此任務嗎？刪除後無法復原。', async () => {
        await deleteTask(id);
        await onRefresh();
        showToast('任務已刪除', 'success');
      });
    }
  });

  document.getElementById('btn-add-task')?.addEventListener('click', () => openTaskForm());

  document.getElementById('view-gacha')?.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'go-home-daily-blessing') {
      switchView('tasks');
      requestAnimationFrame(() => {
        document.getElementById('homeDailyBlessingContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else if (action === 'daily-open-wheel') {
      await openDailyWheelModal();
    }
  });

  document.getElementById('btn-pull')?.addEventListener('click', handlePull);
  document.getElementById('btn-pull-ten')?.addEventListener('click', handleTenPull);

  document.getElementById('view-collection')?.addEventListener('click', async (e) => {
    const emptyBtn = e.target.closest('[data-action="empty-go-gacha"]');
    if (emptyBtn) {
      switchView('gacha');
      return;
    }

    const detailBtn = e.target.closest('[data-action="view-detail"]');
    if (detailBtn) {
      const card = detailBtn.closest('.collection-card');
      openPetDetailModal(card?.dataset.petId);
      return;
    }

    const setBtn = e.target.closest('[data-action="set-companion"]');
    if (setBtn) {
      const card = setBtn.closest('.collection-card');
      const petId = card?.dataset.petId;
      if (petId) {
        await setCompanion(petId);
        await onRefresh({ renderMode: ['collection', 'tasks'] });
        showToast('已設為陪伴寵物', 'success');
      }
      return;
    }

    const btn = e.target.closest('[data-action="upgrade"]');
    if (!btn) return;
    const card = btn.closest('.collection-card');
    const petId = card?.dataset.petId;
    if (!petId) return;

    const pet = state.enrichedCollection.find((p) => p.id === petId);
    const nextStar = (pet?.stars || 1) + 1;
    const cost = STAR_UPGRADE_COST[nextStar];

    const result = await upgradeStar(petId);
    if (result.success) {
      await onRefresh({ renderMode: ['collection', 'tasks'] });
      showToast(`${petDisplayName(pet)} 升級至 ${result.entry.stars} 星！`, 'success');
    } else {
      showToast(result.message || `升星需要 ${cost} 碎片`, 'warning');
    }
  });

  document.getElementById('btn-export')?.addEventListener('click', async () => {
    try {
      await downloadBackup();
      await markExportedBackup();
      await handleAchievementCheckAfterAction();
      showToast('JSON 備份已下載', 'success');
    } catch {
      showToast('匯出失敗，請稍後再試', 'error');
    }
  });

  initImportBackupHandlers();

  document.getElementById('btn-reset')?.addEventListener('click', handleReset);

  document.getElementById('toggle-reduce-motion')?.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    const prefs = await setReduceMotion(enabled);
    if (state) state.userPreferences = prefs;
    applyReduceMotionClass(enabled);
    showToast(enabled ? '已開啟減少動畫' : '已恢復動畫效果', 'info');
  });

  document.getElementById('btn-dev-unlock')?.addEventListener('click', handleDevUnlock);

  document.getElementById('btn-dev-unlock-all')?.addEventListener('click', handleDevUnlockAll);

  document.getElementById('btn-dev-stardust')?.addEventListener('click', handleDevStardust);

  document.getElementById('btn-dev-expedition')?.addEventListener('click', handleDevExpedition);
  document.getElementById('btn-dev-daily-blessing')?.addEventListener('click', handleDevResetDailyBlessing);

  document.getElementById('view-expedition')?.addEventListener('click', (e) => {
    const emptyBtn = e.target.closest('[data-action="empty-go-gacha"]');
    if (emptyBtn) {
      switchView('gacha');
      return;
    }
    handleExpeditionClick(e);
  });

  document.getElementById('view-more')?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-goto]');
    if (!item) return;
    switchView(item.dataset.goto);
    if (item.hasAttribute('data-scroll-daily-blessing')) {
      requestAnimationFrame(() => {
        document.getElementById('homeDailyBlessingContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  });

  document.getElementById('view-workshop')?.addEventListener('click', (e) => {
    handleWorkshopClick(e);
  });

  document.getElementById('view-achievements')?.addEventListener('click', async (e) => {
    const backBtn = e.target.closest('[data-goto]');
    if (backBtn) {
      switchView(backBtn.dataset.goto);
      return;
    }

    const titleBtn = e.target.closest('[data-action="open-titles"]');
    if (titleBtn) {
      openTitleManagementModal();
      return;
    }

    const claimAllBtn = e.target.closest('[data-action="claim-all-achievements"]');
    if (claimAllBtn) {
      e.preventDefault();
      await handleClaimAllAchievements();
      return;
    }

    const claimBtn = e.target.closest('[data-action="claim-achievement"]');
    if (claimBtn) {
      const achId = claimBtn.dataset.id;
      if (!achId || claimBtn.disabled) return;
      claimBtn.disabled = true;
      const result = await claimAchievementReward(achId);
      if (result.success) {
        await onRefresh({ renderMode: ['achievements', 'tasks'] });
        showToast(`已領取：${result.achievement.name}`, 'success');
        renderAchievementsView();
      } else {
        showToast(result.error || '領取失敗', 'error');
        claimBtn.disabled = false;
      }
    }
  });

  document.getElementById('view-settings')?.addEventListener('click', async (e) => {
    const backBtn = e.target.closest('[data-goto]');
    if (backBtn) {
      switchView(backBtn.dataset.goto);
      return;
    }

    const themeCard = e.target.closest('[data-action="select-theme"]');
    if (themeCard) {
      const theme = themeCard.dataset.theme;
      if (theme) await applyTheme(theme);
    }
  });

  document.getElementById('achievement-strip')?.addEventListener('click', () => {
    switchView('achievements');
  });
  document.getElementById('achievement-strip')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      switchView('achievements');
    }
  });

  document.getElementById('habit-summary')?.addEventListener('click', () => switchView('habits'));
  document.getElementById('habit-summary')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      switchView('habits');
    }
  });

  document.getElementById('btn-add-habit')?.addEventListener('click', () => openHabitForm());

  document.getElementById('view-habits')?.addEventListener('click', async (e) => {
    const backBtn = e.target.closest('[data-goto]');
    if (backBtn) {
      switchView(backBtn.dataset.goto);
      return;
    }

    const toggleArchived = e.target.closest('[data-action="toggle-archived-habits"]');
    if (toggleArchived) {
      archivedHabitsCollapsed = !archivedHabitsCollapsed;
      renderHabitsView();
      return;
    }

    const target = e.target.closest('[data-action]');
    if (!target) return;

    const card = target.closest('.habit-card');
    const id = card?.dataset.id;
    const action = target.dataset.action;

    if (action === 'habit-complete' && id) {
      const cardEl = target.closest('.habit-card');
      cardEl?.classList.add('habit-card--completing');
      const result = await completeHabitToday(id);
      if (result.success) {
        await onRefresh({ renderMode: ['habits', 'tasks'] });
        renderHabitsView();
        const parts = [];
        if (result.stardustGiven > 0) parts.push(`星塵 +${result.stardustGiven}`);
        if (result.energyGiven > 0) parts.push(`冒險能量 +${result.energyGiven}`);
        if (result.bondGiven > 0) parts.push('親密度 +1');
        if (parts.length > 0) {
          showToast(`習慣完成！${parts.join('、')}`, 'success');
        } else if (result.stardustCapped) {
          showToast('今日習慣星塵已達上限，仍已記錄完成。', 'warning');
        } else {
          showToast('習慣已記錄完成', 'success');
        }
        await handleAchievementCheckAfterAction();
      } else {
        cardEl?.classList.remove('habit-card--completing');
        showToast(result.error || '完成失敗', 'error');
      }
    } else if (action === 'habit-uncomplete' && id) {
      const result = await uncompleteHabitToday(id);
      if (result.success) {
        await onRefresh({ renderMode: ['habits', 'tasks'] });
        renderHabitsView();
        showToast('已取消今日完成', 'info');
      } else {
        showToast(result.error || '操作失敗', 'error');
      }
    } else if (action === 'habit-edit' && id) {
      openHabitForm(id);
    } else if (action === 'habit-archive' && id) {
      openConfirmModal('封存習慣', '封存後將不再顯示於今日習慣，紀錄會保留。', async () => {
        const result = await archiveHabit(id);
        if (result.success) {
          await onRefresh({ renderMode: ['habits', 'tasks'] });
          renderHabitsView();
          showToast('習慣已封存', 'success');
          await handleAchievementCheckAfterAction();
        } else {
          showToast(result.error || '封存失敗', 'error');
        }
      });
    } else if (action === 'habit-create-first') {
      openHabitForm();
    }
  });
}

function bindNavigation() {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      switchView(view);
    });
  });
}

export function switchView(viewName) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));

  const view = document.getElementById(`view-${viewName}`);
  const navView = viewName === 'achievements' || viewName === 'settings' || viewName === 'habits' || viewName === 'workshop' ? 'more' : viewName;
  const nav = document.querySelector(`.nav-item[data-view="${navView}"]`);
  if (view) view.classList.add('active');
  if (nav) nav.classList.add('active');

  trackUserActivity();

  if (viewName === 'expedition') {
    startExpeditionTimer();
  } else {
    stopExpeditionTimer();
  }

  if (viewName === 'tasks' && state?.companion) {
    refreshCompanionBubble({ isWelcome: true });
    startCompanionDialogueTimer();
  } else if (viewName !== 'tasks') {
    stopCompanionDialogueTimer();
  }

  if (viewName === 'achievements') {
    markTitlesSeen().then(() => {
      if (state?.achievementSummary) {
        state.achievementSummary.hasUnseenTitles = false;
      }
      renderNavBadges();
    });
    refreshAchievementsView();
  }

  if (viewName === 'habits') {
    renderHabitsView();
  }

  if (viewName === 'workshop') {
    renderWorkshopView();
  }

  if (viewName === 'settings') {
    renderSettingsView();
  }

  if (viewName === 'more') {
    renderMoreView();
  }

  if (viewName === 'collection') {
    preloadOwnedPetImages(state?.enrichedCollection, state?.allPets, 12).catch(() => {});
  }

  if (viewName === 'tasks' && state?.companion) {
    preloadCompanionImage(state).catch(() => {});
  }

  currentTasksView = viewName === 'achievements' || viewName === 'settings' || viewName === 'habits' || viewName === 'workshop' || viewName === 'more'
    ? currentTasksView
    : viewName;
  if (viewName === 'tasks' || viewName === 'gacha' || viewName === 'collection' || viewName === 'expedition' || viewName === 'more') {
    currentTasksView = viewName;
  }
  renderNavBadges();
}

function bindModals() {
  document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('modal-overlay')?.classList.contains('open')) {
      closeModal();
    }
  });
}

export function openModal(contentHtml) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  if (body) body.innerHTML = contentHtml;
  overlay?.classList.add('open');
  document.body.classList.add('modal-open');
}

export function closeModal() {
  document.getElementById('modal-overlay')?.classList.remove('open');
  document.body.classList.remove('modal-open');
}

/** 確認彈窗 */
function openConfirmModal(title, message, onConfirm, options = {}) {
  const { confirmLabel = '確定', danger = false, onCancel = null } = options;
  openModal(`
    <div class="confirm-modal">
      <div class="confirm-modal__icon">${danger ? '⚠️' : '❓'}</div>
      <h2 class="modal-title">${escapeHtml(title)}</h2>
      <p class="confirm-modal__text">${escapeHtml(message)}</p>
      <div class="confirm-modal__actions">
        <button class="btn btn--ghost" id="confirm-cancel">取消</button>
        <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" id="confirm-ok">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>
  `);

  document.getElementById('confirm-cancel')?.addEventListener('click', () => {
    closeModal();
    if (typeof onCancel === 'function') onCancel();
  });
  document.getElementById('confirm-ok')?.addEventListener('click', async () => {
    closeModal();
    await onConfirm();
  });
}

/** 寵物圖片含 fallback；preview 模式顯示模糊黑白預覽（未獲得） */
export function petImageHtml(pet, options = {}) {
  const {
    size = 'md',
    preview = false,
    loading = 'lazy',
    eager = false,
    framed = true,
  } = options;
  const cls = `pet-img pet-img--${size}`;
  const src = getPetImageSrc(pet);
  const loadAttr = eager || loading === 'eager' ? 'eager' : loading;
  const onload = "this.classList.add('is-loaded');this.closest('.pet-image-frame')?.classList.remove('is-loading')";
  const onerror = "this.onerror=null;this.classList.add('is-error');var f=this.closest('.pet-image-frame');if(f){f.classList.remove('is-loading');f.classList.add('is-error');}";
  const placeholder = framed
    ? `<div class="pet-image-frame pet-image-frame--${size} is-error" role="img" aria-label="圖片暫時無法載入"><span class="pet-image-frame__fallback" aria-hidden="true">?</span></div>`
    : `<div class="${cls} pet-img--placeholder"><span>?</span></div>`;

  if (!src) return placeholder;

  if (preview) {
    return `<div class="pet-img-wrap pet-img-wrap--preview pet-img-wrap--${size} pet-image-frame pet-image-frame--${size} is-loading">
      <img class="${cls} pet-img--preview is-loading" src="${src}" alt="" loading="${loadAttr}" decoding="async" onload="${onload}" onerror="${onerror}" />
      <span class="pet-image-frame__fallback" aria-hidden="true">圖片載入中</span>
    </div>`;
  }

  if (!framed) {
    const onErrorLegacy = `this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'${cls} pet-img--placeholder',innerHTML:'<span>?</span>'}))`;
    return `<img class="${cls} is-loading" src="${src}" alt="${escapeHtml(petDisplayName(pet))}" loading="${loadAttr}" decoding="async" onload="this.classList.add('is-loaded')" onerror="${onErrorLegacy}" />`;
  }

  return `<div class="pet-image-frame pet-image-frame--${size} is-loading">
    <img class="${cls} is-loading" src="${src}" alt="${escapeHtml(petDisplayName(pet))}" loading="${loadAttr}" decoding="async" onload="${onload}" onerror="${onerror}" />
    <span class="pet-image-frame__fallback" aria-hidden="true">圖片載入中</span>
  </div>`;
}

/** 星級顯示 */
export function renderStars(count, max = 5) {
  let html = '<span class="stars">';
  for (let i = 1; i <= max; i++) {
    html += `<span class="star ${i <= count ? 'star--filled' : ''}">★</span>`;
  }
  html += '</span>';
  return html;
}

/** 取得目前 active 的 view 名稱 */
function getCurrentViewName() {
  const active = document.querySelector('.view.active');
  if (active?.id?.startsWith('view-')) {
    return active.id.slice('view-'.length);
  }
  return currentTasksView || 'tasks';
}

/** 跨頁面共用的輕量 UI 更新（不重建整個 view） */
export function renderSharedUI() {
  if (!state) return;
  if (isWheelSpinning()) return;
  console.debug('[Render] renderSharedUI');
  const { wallet, todayCompleted, availablePulls, achievementSummary } = state;
  setText('stat-stardust', wallet.stardust ?? 0);
  setText('stat-energy', wallet.adventureEnergy ?? 0);
  setText('stat-today', todayCompleted);
  setText('stat-pulls', availablePulls);
  const claimable = achievementSummary?.claimable ?? 0;
  setText('stat-claimable', claimable);
  const claimableCard = document.getElementById('stat-claimable-card');
  if (claimableCard) {
    claimableCard.classList.toggle('stat-card--highlight', claimable > 0);
  }
  setText('gacha-stardust', wallet.stardust ?? 0);
  setText('settings-stardust', wallet.stardust ?? 0);
  setText('settings-energy', wallet.adventureEnergy ?? 0);
  renderAchievementStrip();
  renderNavBadges();
  renderGachaDailyBlessingEntry();
  maybeRefreshExpeditionBubble();
}

/** 渲染指定 view */
export function renderView(viewName) {
  if (!state) return;
  if (isWheelSpinning()) return;
  console.debug('[Render] renderView:', viewName);
  switch (viewName) {
    case 'tasks':
      renderTasksView();
      break;
    case 'gacha':
      renderGachaView();
      break;
    case 'collection':
      renderCollectionView();
      break;
    case 'expedition':
      renderExpeditionView();
      break;
    case 'workshop':
      renderWorkshopView();
      break;
    case 'achievements':
      renderAchievementsView();
      break;
    case 'habits':
      renderHabitsView();
      break;
    case 'settings':
      renderSettingsView();
      break;
    case 'more':
      renderMoreView();
      break;
    default:
      console.debug('[Render] renderAll fallback (unknown view:', viewName, ')');
      renderAll();
  }
}

/** 僅渲染目前 view + 共用 UI */
export function renderCurrentView() {
  if (!state) return;
  if (isWheelSpinning()) {
    console.debug('[Render] renderCurrentView skipped (wheel spinning)');
    return;
  }
  const viewName = getCurrentViewName();
  console.debug('[Render] renderCurrentView:', viewName);
  if (isModalOpen()) {
    renderSharedUI();
    return;
  }
  renderView(viewName);
  renderSharedUI();
}

/** 刷新多個 view + 共用 UI */
export function renderViews(viewNames) {
  if (!state || isWheelSpinning()) return;
  if (isModalOpen()) {
    console.debug('[Render] renderViews skipped view rebuild (modal open)');
    renderSharedUI();
    return;
  }
  const seen = new Set();
  for (const name of viewNames) {
    if (!name || seen.has(name)) continue;
    seen.add(name);
    renderView(name);
  }
  renderSharedUI();
}

/**
 * 資料刷新後的渲染入口
 * @param {'full' | 'current' | string[]} [mode]
 */
export async function renderAfterRefresh(mode = 'current') {
  if (mode === 'full') {
    await renderAll();
    return;
  }
  if (Array.isArray(mode)) {
    renderViews(mode);
    return;
  }
  renderCurrentView();
}

/** 渲染全部畫面（安全 fallback） */
export async function renderAll() {
  if (!state) return;
  if (isWheelSpinning()) {
    console.debug('[Render] renderAll skipped (wheel spinning)');
    return;
  }
  console.debug('[Render] renderAll fallback');
  applyThemeToDocument(state.userPreferences?.theme ?? 'default');
  applyReduceMotionClass(state.userPreferences?.reduceMotion ?? false);
  renderTasksView();
  renderGachaView();
  renderCollectionView();
  renderExpeditionView();
  renderSettingsView();
  renderMoreView();
  renderWorkshopView();
  renderHabitsView();
  if (document.getElementById('view-achievements')?.classList.contains('active')) {
    renderAchievementsView();
  }
  renderSharedUI();
}

function maybeRefreshExpeditionBubble() {
  if (!state?.companion || currentTasksView !== 'tasks') return;
  const exp = state.activeExpedition;
  if (!exp || !isExpeditionTimeComplete(exp) || exp.claimed) return;
  if (!document.getElementById('companion-bubble-text')) return;
  refreshCompanionBubble();
}

/* ─── 任務頁 ─── */

function renderTasksView() {
  const { tasks, wallet, todayCompleted, availablePulls, companion, companionLine, achievementSummary, categories } = state;
  const today = getTodayDateString();

  setText('stat-stardust', wallet.stardust ?? 0);
  setText('stat-energy', wallet.adventureEnergy ?? 0);
  setText('stat-today', todayCompleted);
  setText('stat-pulls', availablePulls);

  const claimable = achievementSummary?.claimable ?? 0;
  setText('stat-claimable', claimable);
  const claimableCard = document.getElementById('stat-claimable-card');
  if (claimableCard) {
    claimableCard.classList.toggle('stat-card--highlight', claimable > 0);
  }

  renderAchievementStrip();
  renderDailyBlessingSection();
  renderCompanionSection(companion, companionLine);
  renderTodayPlanSummary(tasks, today);
  renderHabitSummary();
  renderCategoryFilters(categories);

  const catFilterEl = document.getElementById('task-category-filters');
  if (catFilterEl) {
    catFilterEl.hidden = taskViewMode === 'smart' && !activeSmartListId;
  }

  const contentEl = document.getElementById('task-view-content');
  if (!contentEl) return;

  if (taskViewMode === 'today') {
    contentEl.innerHTML = renderTodayView(tasks, today);
  } else if (taskViewMode === 'all') {
    contentEl.innerHTML = renderAllTasksView(tasks, today);
  } else if (taskViewMode === 'smart') {
    contentEl.innerHTML = activeSmartListId
      ? renderSmartListDetail(tasks, activeSmartListId, today)
      : renderSmartListHub(tasks, today);
  }
}

function renderHabitSummary() {
  const el = document.getElementById('habit-summary');
  if (!el) return;

  const stats = state.habitStats;
  if (!stats?.hasHabits) {
    el.hidden = true;
    return;
  }

  el.hidden = false;
  const cta = stats.hasIncompleteToday
    ? '<span class="habit-summary__cta">前往習慣 ›</span>'
    : '';

  el.innerHTML = `
    <div class="habit-summary__inner">
      <div class="habit-summary__stats">
        <div class="habit-summary__row">
          <span class="habit-summary__label">今日習慣</span>
          <span class="habit-summary__value">${stats.todayCompleted} / ${stats.todayTotal}</span>
        </div>
        <div class="habit-summary__row">
          <span class="habit-summary__label">最長連續</span>
          <span class="habit-summary__value">${stats.maxStreak} 天</span>
        </div>
      </div>
      ${cta}
    </div>`;
}

function formatDailyRewardBundle(bundle) {
  if (!bundle) return '';
  const parts = [];
  if (bundle.stardust > 0) parts.push(`星塵 +${bundle.stardust}`);
  if (bundle.adventureEnergy > 0) parts.push(`冒險能量 +${bundle.adventureEnergy}`);
  if (bundle.materials) {
    for (const [id, amt] of Object.entries(bundle.materials)) {
      if (amt > 0) parts.push(`${getMaterialName(id) || MATERIAL_LABELS[id] || id} +${amt}`);
    }
  }
  if (bundle.items) {
    for (const [id, amt] of Object.entries(bundle.items)) {
      if (amt > 0) {
        const info = getCraftableInfo(id);
        parts.push(`${info?.name || id} +${amt}`);
      }
    }
  }
  return parts.join('、');
}

function getProjectedCheckInStreak(daily, today, checkedIn) {
  if (checkedIn) return daily?.streak ?? 0;
  if (daily?.lastCheckInDate && isYesterday(daily.lastCheckInDate, today)) {
    return (daily.streak ?? 0) + 1;
  }
  return 1;
}

function buildDailyRewardPreviewChips(projectedStreak) {
  const base = calculateCheckInRewards(1);
  const full = calculateCheckInRewards(projectedStreak);
  const chips = [];

  chips.push({ icon: '✨', text: `星塵 +${base.stardust}`, bonus: false });
  chips.push({ icon: '⚡', text: `冒險能量 +${base.adventureEnergy}`, bonus: false });

  const extraStardust = full.stardust - base.stardust;
  if (extraStardust > 0) {
    chips.push({ icon: '✨', text: `星塵 +${extraStardust}`, bonus: true });
  }
  const extraEnergy = full.adventureEnergy - base.adventureEnergy;
  if (extraEnergy > 0) {
    chips.push({ icon: '⚡', text: `冒險能量 +${extraEnergy}`, bonus: true });
  }
  if (full.materials) {
    for (const [id, amt] of Object.entries(full.materials)) {
      if (amt > 0) {
        chips.push({
          icon: '💎',
          text: `${getMaterialName(id) || MATERIAL_LABELS[id] || id} +${amt}`,
          bonus: true,
        });
      }
    }
  }
  if (full.items) {
    for (const [id, amt] of Object.entries(full.items)) {
      if (amt > 0) {
        const info = getCraftableInfo(id);
        chips.push({
          icon: '🎁',
          text: `${info?.name || id} +${amt}`,
          bonus: true,
        });
      }
    }
  }
  return chips;
}

function getSevenDayMilestoneProgress(projectedStreak) {
  const target = 7;
  const progress = Math.min(projectedStreak, target);
  const percent = Math.round((progress / target) * 100);
  let label;
  if (projectedStreak >= target) {
    label = projectedStreak === target
      ? '今日達成 7 天連續簽到獎勵！'
      : '已解鎖 7 天連續簽到獎勵';
  } else {
    const remaining = target - projectedStreak;
    label = `距離 7 天獎勵還差 ${remaining} 天`;
  }
  return { percent, label };
}

function showDailyBlessingRewardToast(text) {
  const toast = document.createElement('div');
  toast.className = 'reward-toast reward-toast--daily';
  toast.innerHTML = `<span class="reward-toast__icon">🌙</span><span>${escapeHtml(text)}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function resolveDailyBlessingCollapsed(allDone, today) {
  if (dailyBlessingCollapseDay !== today) {
    dailyBlessingCollapseDay = today;
    dailyBlessingCollapsed = allDone;
  }
  return dailyBlessingCollapsed;
}

function buildDailyBlessingCardData() {
  const daily = state.dailyCheckIn;
  const today = getTodayDateString();
  const checkedIn = daily ? hasCheckedInToday(daily, today) : false;
  const spun = daily ? hasSpunWheelToday(daily, today) : false;
  const allDone = checkedIn && spun;
  const hasPending = !allDone;
  const collapsed = resolveDailyBlessingCollapsed(allDone, today);
  const streak = daily?.streak ?? 0;
  const bestStreak = daily?.bestStreak ?? 0;
  const projectedStreak = getProjectedCheckInStreak(daily, today, checkedIn);
  const rewardChips = buildDailyRewardPreviewChips(projectedStreak);
  const milestone = getSevenDayMilestoneProgress(projectedStreak);

  const checkInBtnLabel = checkedIn ? '今日已簽到' : '今日簽到';
  const wheelBtnLabel = spun ? '今日已轉盤' : '幸運轉盤';

  let statusBadgeText = '今日已完成';
  let statusBadgeClass = 'daily-status-badge done';
  if (!allDone) {
    statusBadgeClass = 'daily-status-badge';
    if (!checkedIn && !spun) statusBadgeText = '待領取';
    else if (!checkedIn) statusBadgeText = '簽到待領';
    else statusBadgeText = '轉盤待領';
  }

  let footerHint = '今天的祝福已全部領取，明天再來吧～';
  if (!allDone) {
    if (!checkedIn && !spun) footerHint = '完成簽到與轉盤，領取今日全部祝福';
    else if (!checkedIn) footerHint = '轉盤已轉，別忘了領取今日簽到獎勵';
    else footerHint = '簽到完成！記得轉動幸運轉盤喔';
  }

  let compactSummary = `連續 ${streak} 天`;
  if (allDone) {
    compactSummary += ' · 今日已完成';
  } else {
    const pendingParts = [];
    if (!checkedIn) pendingParts.push('簽到');
    if (!spun) pendingParts.push('轉盤');
    compactSummary += ` · 待領取：${pendingParts.join('、')}`;
  }

  const rewardChipsHtml = rewardChips.map((chip) => `
    <span class="daily-reward-chip${chip.bonus ? ' daily-reward-chip--bonus' : ''}">
      <span class="daily-reward-chip__icon" aria-hidden="true">${chip.icon}</span>
      <span class="daily-reward-chip__text">${escapeHtml(chip.text)}</span>
    </span>`).join('');

  const quickActions = collapsed && hasPending
    ? `<div class="daily-blessing-card__quick-actions">
        ${!checkedIn ? '<button type="button" class="btn btn--secondary btn--sm daily-blessing-card__quick-btn" data-action="daily-check-in">簽到</button>' : ''}
        ${!spun ? '<button type="button" class="btn btn--primary btn--sm daily-blessing-card__quick-btn" data-action="daily-open-wheel">轉盤</button>' : ''}
      </div>`
    : '';

  const html = `
    <div class="daily-blessing-card${collapsed ? ' daily-blessing-card--collapsed' : ''}${hasPending ? ' daily-blessing-card--pending' : ''}">
      <header class="daily-blessing-card__header">
        <button type="button" class="daily-blessing-card__toggle" data-action="toggle-daily-blessing" aria-expanded="${!collapsed}">
          <span class="daily-blessing-card__icon daily-blessing-card__icon--default" aria-hidden="true">✦</span>
          <span class="daily-blessing-card__icon daily-blessing-card__icon--sweet" aria-hidden="true">🌸</span>
          <span class="daily-blessing-card__header-main">
            <span class="daily-blessing-title">每日祝福</span>
            <span class="daily-blessing-subtitle daily-blessing-subtitle--default">冒險者每日補給</span>
            <span class="daily-blessing-subtitle daily-blessing-subtitle--sweet">每日小祝福</span>
            <span class="daily-blessing-card__compact-summary">${escapeHtml(compactSummary)}</span>
          </span>
          <span class="${statusBadgeClass}">${escapeHtml(statusBadgeText)}</span>
          <span class="daily-blessing-card__chevron" aria-hidden="true">${collapsed ? '▼' : '▲'}</span>
        </button>
        ${quickActions}
      </header>

      <div class="daily-blessing-card__body" ${collapsed ? 'hidden' : ''}>
        <section class="daily-streak-section" aria-label="連續簽到">
          <div class="daily-streak-row">
            <div class="daily-streak-stat">
              <span class="daily-streak-stat__label">連續簽到</span>
              <span class="daily-streak-stat__value">連續簽到 <span class="daily-streak-number">${streak}</span> 天</span>
            </div>
            <div class="daily-streak-stat">
              <span class="daily-streak-stat__label">最高紀錄</span>
              <span class="daily-streak-stat__value">最高紀錄 ${bestStreak} 天</span>
            </div>
          </div>
          <div class="daily-milestone-progress">
            <div class="daily-milestone-progress__header">
              <span class="daily-milestone-progress__label">${escapeHtml(milestone.label)}</span>
              <span class="daily-milestone-progress__value">${Math.min(projectedStreak, 7)} / 7</span>
            </div>
            <div class="progress-bar daily-milestone-progress__bar">
              <div class="progress-bar__fill daily-milestone-progress__fill" style="width: ${milestone.percent}%"></div>
            </div>
          </div>
        </section>

        <section class="daily-reward-preview" aria-label="今日獎勵預覽">
          <h3 class="daily-reward-preview__title">今日獎勵預覽</h3>
          <div class="daily-reward-preview__chips">
            ${rewardChipsHtml}
          </div>
        </section>

        <div class="daily-blessing-card__actions">
          <button type="button" class="btn btn--secondary daily-blessing-card__btn"
            data-action="daily-check-in" ${checkedIn ? 'disabled' : ''}>
            ${escapeHtml(checkInBtnLabel)}
          </button>
          <button type="button" class="btn btn--primary daily-blessing-card__btn"
            data-action="daily-open-wheel" ${spun ? 'disabled' : ''}>
            ${escapeHtml(wheelBtnLabel)}
          </button>
        </div>

        <p class="daily-blessing-card__footer">${escapeHtml(footerHint)}</p>
      </div>
    </div>`;

  return { html, hasPending, allDone, checkedIn, spun, compactSummary, statusBadgeText };
}

function renderDailyBlessingSection() {
  const homeEl = document.getElementById('homeDailyBlessingContainer');
  if (!homeEl) return;

  const { html, hasPending } = buildDailyBlessingCardData();
  homeEl.innerHTML = html;

  if (hasPending) {
    homeEl.classList.add('daily-blessing-section--pending');
  } else {
    homeEl.classList.remove('daily-blessing-section--pending');
  }

  renderGachaDailyBlessingEntry();
}

function renderGachaDailyBlessingEntry() {
  const el = document.getElementById('gacha-daily-blessing-entry');
  if (!el) return;

  const { allDone, checkedIn, spun, compactSummary, statusBadgeText } = buildDailyBlessingCardData();

  let statusClass = 'daily-blessing-gacha-entry__status';
  if (allDone) statusClass += ' daily-blessing-gacha-entry__status--done';

  el.innerHTML = `
    <div class="daily-blessing-gacha-entry__card card">
      <div class="daily-blessing-gacha-entry__main">
        <span class="daily-blessing-gacha-entry__icon" aria-hidden="true">✦</span>
        <div class="daily-blessing-gacha-entry__text">
          <span class="daily-blessing-gacha-entry__title">每日祝福</span>
          <span class="daily-blessing-gacha-entry__summary">${escapeHtml(compactSummary)}</span>
        </div>
        <span class="${statusClass}">${escapeHtml(statusBadgeText)}</span>
      </div>
      <div class="daily-blessing-gacha-entry__actions">
        ${!checkedIn ? '<button type="button" class="btn btn--secondary btn--sm" data-action="go-home-daily-blessing">前往簽到</button>' : ''}
        ${!spun ? '<button type="button" class="btn btn--primary btn--sm" data-action="daily-open-wheel">幸運轉盤</button>' : ''}
        ${allDone ? '<button type="button" class="btn btn--ghost btn--sm" data-action="go-home-daily-blessing">查看紀錄</button>' : ''}
      </div>
    </div>`;
}

async function handleDailyCheckIn() {
  if (isWheelSpinning()) return;
  const result = await performDailyCheckIn();
  if (!result.success) {
    showToast(result.error || '簽到失敗', result.error?.includes('已經') ? 'info' : 'error');
    return;
  }
  const rewardText = formatDailyRewardBundle(result.rewards);
  const today = getTodayDateString();
  const willBeAllDone = hasSpunWheelToday(
    { ...state.dailyCheckIn, lastCheckInDate: today },
    today
  );
  if (willBeAllDone) dailyBlessingCollapsed = true;
  await onRefresh({ renderMode: ['tasks', 'gacha'] });
  showDailyBlessingRewardToast(`簽到成功！獲得 ${rewardText}`);
  if (result.streak >= 3) {
    showToast(`連續簽到 ${result.streak} 天！`, 'success');
  }
  await handleAchievementCheckAfterAction();
}

const WHEEL_CX = 150;
const WHEEL_CY = 150;
const WHEEL_R = 140;
const WHEEL_LABEL_R = 82;

const WHEEL_COLORS_DEFAULT = [
  '#2A1F4A', '#18304A', '#2B2340', '#3A2A18',
  '#1F3A35', '#251F3F', '#18364A', '#3A2030',
];

const WHEEL_COLORS_SWEET = [
  '#FFF0F7', '#EEE9FF', '#FFF1D8', '#E7F6F1',
  '#EAF3FF', '#FFE3EA', '#F9F3FF', '#FFF8EF',
];

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArcSector(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', cx, cy,
    'L', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
    'Z',
  ].join(' ');
}

function truncateWheelLabel(text, maxLen = 8) {
  const chars = Array.from(text || '');
  return chars.length <= maxLen ? chars.join('') : chars.slice(0, maxLen).join('');
}

function getWheelShortLabel(reward) {
  const amount = reward.amount ?? 1;
  const amtStr = `+${amount}`;

  if (reward.type === 'stardust') {
    return { name: '星塵', amount: amtStr };
  }
  if (reward.type === 'adventureEnergy') {
    return { name: '能量', amount: amtStr };
  }
  if (reward.type === 'material') {
    const matNames = {
      forest_leaf: '嫩葉',
      lava_core: '熔岩',
      machine_part: '齒輪',
      star_shard: '星界',
    };
    const name = matNames[reward.materialId];
    if (name) return { name, amount: amtStr };
  }
  if (reward.type === 'item' && reward.itemId === 'item_small_spirit_food') {
    return { name: '靈食', amount: amtStr };
  }

  const label = reward.label || '';
  const plusMatch = label.match(/^(.+?)\s*(\+\d+)\s*$/);
  if (plusMatch) {
    return {
      name: truncateWheelLabel(plusMatch[1].trim(), 8),
      amount: plusMatch[2],
    };
  }
  return { name: truncateWheelLabel(label, 8), amount: amtStr };
}

function getWheelSectorColors() {
  return isSweetTheme() ? WHEEL_COLORS_SWEET : WHEEL_COLORS_DEFAULT;
}

function getWheelSectorStroke() {
  return isSweetTheme() ? '#F0C9DA' : 'rgba(244, 247, 255, 0.16)';
}

function buildWheelSvgHtml(rewards) {
  const count = rewards.length || 8;
  const seg = 360 / count;
  const colors = getWheelSectorColors();
  const stroke = getWheelSectorStroke();

  const sectors = rewards.map((reward, i) => {
    const startAngle = i * seg;
    const endAngle = startAngle + seg;
    const midAngle = startAngle + seg / 2;
    const path = describeArcSector(WHEEL_CX, WHEEL_CY, WHEEL_R, startAngle, endAngle);
    const short = getWheelShortLabel(reward);
    const labelPoint = polarToCartesian(WHEEL_CX, WHEEL_CY, WHEEL_LABEL_R, midAngle);
    let textRotation = midAngle;
    if (midAngle > 90 && midAngle < 270) {
      textRotation = midAngle + 180;
    }

    return `
      <path class="daily-wheel-sector" d="${path}" fill="${colors[i % colors.length]}" stroke="${stroke}" stroke-width="1.5"/>
      <g class="daily-wheel-label-group" transform="translate(${labelPoint.x.toFixed(2)}, ${labelPoint.y.toFixed(2)}) rotate(${textRotation.toFixed(2)})">
        <text class="daily-wheel-label" text-anchor="middle" dominant-baseline="middle">
          <tspan x="0" dy="-0.35em" class="daily-wheel-label__name">${escapeHtml(short.name)}</tspan>
          <tspan x="0" dy="1.15em" class="daily-wheel-label__amount">${escapeHtml(short.amount)}</tspan>
        </text>
      </g>`;
  }).join('');

  return `
    <svg class="daily-wheel-svg" viewBox="0 0 300 300" aria-hidden="true">
      <circle class="daily-wheel-outer-ring" cx="${WHEEL_CX}" cy="${WHEEL_CY}" r="${WHEEL_R}" fill="none"/>
      ${sectors}
    </svg>`;
}

function buildWheelDiscHtml(rewards) {
  const previewItems = rewards.map((r) =>
    `<li class="daily-wheel-preview__item">${escapeHtml(r.label)}</li>`
  ).join('');

  return `
    <div class="daily-wheel-stage">
      <div class="daily-wheel-wrapper">
        <div class="daily-wheel-pointer" aria-hidden="true"></div>
        <div class="daily-wheel-rotor" id="daily-wheel-rotor">
          ${buildWheelSvgHtml(rewards)}
        </div>
        <button type="button" class="daily-wheel-center-button" id="daily-wheel-start" aria-label="開始轉盤">開始</button>
      </div>
    </div>
    <ul class="daily-wheel-preview" aria-label="轉盤獎勵清單">
      ${previewItems}
    </ul>`;
}

function waitForWheelRotorTransition(rotor, fallbackMs) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      rotor.removeEventListener('transitionend', onEnd);
      clearTimeout(timer);
      resolve();
    };
    const onEnd = (event) => {
      if (event.target !== rotor || event.propertyName !== 'transform') return;
      finish();
    };
    rotor.addEventListener('transitionend', onEnd);
    const timer = setTimeout(finish, fallbackMs);
  });
}

async function animateDailyWheel(rewardIndex, segmentCount) {
  const rotor = document.getElementById('daily-wheel-rotor');
  const startBtn = document.getElementById('daily-wheel-start');
  if (!rotor) return;

  const reduceMotion = state.userPreferences?.reduceMotion ?? false;
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.textContent = '轉動';
  }

  const extraSpins = reduceMotion ? 1 : 3 + Math.floor(Math.random() * 2);
  const rotation = computeWheelRotationDeg(rewardIndex, segmentCount, extraSpins);

  rotor.style.transition = reduceMotion
    ? 'transform 300ms ease-out'
    : 'transform 2800ms cubic-bezier(0.12, 0.72, 0.18, 1)';

  void rotor.offsetHeight;
  const transformValue = `translate3d(0, 0, 0) rotate(${rotation}deg)`;
  rotor.style.setProperty('--wheel-rotation', `${rotation}deg`);
  rotor.style.transform = transformValue;

  const fallbackMs = reduceMotion ? 400 : 3000;
  await waitForWheelRotorTransition(rotor, fallbackMs);

  if (startBtn) startBtn.textContent = '已轉';
}

function computeWheelRotationDeg(rewardIndex, segmentCount, extraSpins = 4) {
  const seg = 360 / segmentCount;
  const targetMidAngle = rewardIndex * seg + seg / 2;
  const jitter = (Math.random() - 0.5) * (seg * 0.2);
  return extraSpins * 360 + (360 - targetMidAngle + jitter);
}

async function openDailyWheelModal() {
  const daily = state.dailyCheckIn;
  const today = getTodayDateString();
  if (daily && hasSpunWheelToday(daily, today)) {
    showToast('今天已經轉過幸運轉盤了，明天再來吧。', 'info');
    return;
  }

  const rewards = dailyWheelRewards || await loadWheelRewards();
  dailyWheelRewards = rewards;
  const canSpin = !(daily && hasSpunWheelToday(daily, today));

  openModal(`
    <div class="wheel-modal daily-wheel-modal-body">
      <h2 class="modal-title">每日幸運轉盤</h2>
      <p class="wheel-modal__status">${canSpin ? '今天還可以轉 1 次' : '今天已經轉過了'}</p>
      <div class="wheel-container" id="daily-wheel-container">
        ${buildWheelDiscHtml(rewards)}
      </div>
      <p class="wheel-modal__hint">轉盤結果由系統先決定，動畫僅為展示效果。</p>
    </div>
  `);

  if (!canSpin) return;

  const startBtn = document.getElementById('daily-wheel-start');
  startBtn?.addEventListener('click', async () => {
    if (startBtn.disabled || isWheelSpinning()) return;
    startBtn.disabled = true;

    const prep = await prepareDailyWheelSpin();
    if (!prep.success) {
      showToast(prep.error || '無法轉盤', 'info');
      releaseWheelSpinLock();
      startBtn.disabled = false;
      return;
    }

    let wheelSpinFinished = false;
    const finishWheelSpin = async () => {
      if (wheelSpinFinished) return;
      wheelSpinFinished = true;

      const result = await finalizeDailyWheelSpin(prep.reward);
      if (!result.success) {
        showToast(result.error || '轉盤結算失敗', 'error');
        releaseWheelSpinLock();
        startBtn.disabled = false;
        return;
      }
      closeModal();
      dailyBlessingCollapsed = true;
      await onRefresh({ renderMode: ['tasks', 'gacha'] });
      showDailyBlessingRewardToast(`獲得：${prep.reward.label}`);
      await handleAchievementCheckAfterAction();
    };

    try {
      await animateDailyWheel(prep.rewardIndex, prep.segmentCount);
      await finishWheelSpin();
    } catch (err) {
      console.error('[QuestNote] 轉盤錯誤:', err);
      releaseWheelSpinLock();
      showToast('轉盤發生錯誤，請稍後再試', 'error');
      startBtn.disabled = false;
    }
  });
}

function renderTodayPlanSummary(tasks, today) {
  const el = document.getElementById('today-plan-summary');
  if (!el) return;

  const plannedIncomplete = tasks.filter((t) => !t.completed && isInTodayPlan(t, today));
  const plannedDone = tasks.filter((t) => isInTodayPlan(t, today) && isCompletedToday(t, today));
  const plannedTotal = plannedIncomplete.length + plannedDone.length;
  const overdue = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < today);

  const planValue = plannedTotal === 0
    ? '0 件'
    : plannedDone.length > 0
      ? `${plannedDone.length} / ${plannedTotal} 件`
      : `${plannedTotal} 件`;

  el.innerHTML = `
    <div class="today-plan-summary__inner">
      <div class="today-plan-summary__stat">
        <span class="today-plan-summary__label">今日計畫</span>
        <span class="today-plan-summary__value">${planValue}</span>
      </div>
      ${overdue.length > 0 ? `<div class="today-plan-summary__stat today-plan-summary__stat--warn">
        <span class="today-plan-summary__label">逾期</span>
        <span class="today-plan-summary__value">${overdue.length} 件</span>
      </div>` : ''}
    </div>`;
}

function renderCategoryFilters(categories) {
  const el = document.getElementById('task-category-filters');
  if (!el || !categories?.length) return;

  const btns = [
    `<button type="button" class="filter-btn ${taskCategoryFilter === 'all' ? 'active' : ''}" data-cat-filter="all">全部</button>`,
    ...categories.map(
      (c) => `<button type="button" class="filter-btn ${taskCategoryFilter === c.id ? 'active' : ''}" data-cat-filter="${c.id}">${formatCategoryLabel(c)}</button>`
    ),
  ];
  el.innerHTML = btns.join('');
  el.hidden = taskViewMode === 'smart' && !activeSmartListId;
}

function formatCategoryLabel(category) {
  return escapeHtml(category?.name || '一般');
}

function applyCategoryFilter(tasks) {
  return filterByCategory(tasks, taskCategoryFilter);
}

function renderCollapsibleTaskSection(title, taskList, collapsed = completedSectionCollapsed) {
  if (!taskList.length) return '';
  const arrow = collapsed ? '▶' : '▼';
  return `
    <section class="task-section completed-section page-section ${collapsed ? 'collapsed' : ''}">
      <button type="button" class="section-toggle" data-action="toggle-completed-section" aria-expanded="${!collapsed}">
        ${arrow} ${escapeHtml(title)} <span class="section-count">${taskList.length}</span>
      </button>
      <div class="task-list">${taskList.map(renderTaskCard).join('')}</div>
    </section>`;
}

function renderTaskListSection(title, taskList, emptyHtml = '') {
  if (!taskList.length) return emptyHtml;
  return `
    <section class="task-section page-section">
      <h2 class="section-title">${escapeHtml(title)} <span class="section-count">${taskList.length}</span></h2>
      <div class="task-list">${taskList.map(renderTaskCard).join('')}</div>
    </section>`;
}

function renderTodayView(tasks, today) {
  const filtered = applyCategoryFilter(tasks);
  const sections = getTodayViewSections(filtered, today);

  const plannedEmpty = sections.plannedIncomplete.length === 0
    ? emptyStateHtml(
        '📅',
        '今天還沒有安排任務',
        '挑 1～3 件最重要的事，讓你的夥伴陪你完成。',
        '從待排程任務選擇',
        'pick-unscheduled'
      )
    : '';

  let html = renderTaskListSection('今日計畫', sections.planned, plannedEmpty);
  html += renderTaskListSection('今天到期', sections.dueToday);
  html += renderTaskListSection('逾期未完成', sections.overdue,
    sections.overdue.length === 0 && taskCategoryFilter !== 'all' ? '' :
    sections.overdue.length === 0 ? emptyStateHtml('✓', '沒有逾期任務', '目前節奏保持得不錯。') : ''
  );
  html += renderCollapsibleTaskSection('今日已完成', sections.completedToday);

  if (!html.trim()) {
    return emptyStateHtml('📋', '目前沒有待辦任務', '新增一個小任務，讓你的夥伴開始累積能量吧。', '新增任務', 'empty-add-task');
  }
  return html;
}

function renderAllTasksView(tasks, today) {
  const filtered = applyCategoryFilter(tasks);
  const incomplete = sortTasks(filtered.filter((t) => !t.completed), today);

  const categoryEmpty = taskCategoryFilter !== 'all' && incomplete.length === 0;

  if (categoryEmpty) {
    return emptyStateHtml(
      '📂',
      '這個分類還沒有任務',
      '新增任務時可以把它放進這個分類。',
      '新增任務',
      'empty-add-task'
    );
  }

  return renderTaskListSection('進行中', incomplete,
    incomplete.length === 0
      ? emptyStateHtml('📋', '目前沒有待辦任務', '新增一個小任務，讓你的夥伴開始累積能量吧。', '新增任務', 'empty-add-task')
      : ''
  );
}

function renderSmartListHub(tasks, today) {
  const cards = SMART_LISTS.map((list) => {
    const count = filterBySmartList(list.id, tasks, today).length;
    return `
      <button type="button" class="smart-list-card card" data-action="smart-list" data-list-id="${list.id}">
        <span class="smart-list-card__icon" aria-hidden="true">${list.icon}</span>
        <div class="smart-list-card__body">
          <h3 class="smart-list-card__title">${escapeHtml(list.name)}</h3>
          <p class="smart-list-card__desc">${escapeHtml(list.desc)}</p>
        </div>
        <span class="smart-list-card__count">${count}</span>
        <span class="smart-list-card__arrow">›</span>
      </button>`;
  }).join('');

  return `<div class="smart-list-hub">${cards}</div>`;
}

function renderCompletedRangeFilter(tasks) {
  const rangeBtns = COMPLETED_RANGE_OPTIONS.map((opt) => {
    const count = filterCompletedTasksByRange(tasks, opt.id).length;
    const active = completedRangeFilter === opt.id;
    return `<button type="button" class="segmented-control__btn ${active ? 'active' : ''}" data-action="completed-range" data-range="${opt.id}" aria-pressed="${active}">${escapeHtml(opt.label)} <span class="section-count">${count}</span></button>`;
  }).join('');

  return `
    <div class="completed-range-filter">
      <div class="segmented-control completed-range-filter__control" role="group" aria-label="已完成時間篩選">
        ${rangeBtns}
      </div>
    </div>`;
}

function renderSmartListDetail(tasks, listId, today) {
  const list = SMART_LISTS.find((l) => l.id === listId);
  if (!list) return '';

  let filtered = filterBySmartList(listId, tasks, today);
  if (listId === 'completed') {
    filtered = filterCompletedTasksByRange(filtered, completedRangeFilter);
  }
  filtered = applyCategoryFilter(filtered);
  const sorted = sortTasks(filtered, today);

  const emptyMessages = {
    today: ['這裡目前沒有任務', '狀態很好，沒有需要處理的項目。'],
    due_soon: ['這裡目前沒有任務', '狀態很好，沒有需要處理的項目。'],
    overdue: ['沒有逾期任務', '目前節奏保持得不錯。'],
    urgent: ['這裡目前沒有任務', '狀態很好，沒有需要處理的項目。'],
    important: ['這裡目前沒有任務', '狀態很好，沒有需要處理的項目。'],
    no_date: ['這裡目前沒有任務', '狀態很好，沒有需要處理的項目。'],
    has_subtasks: ['這裡目前沒有任務', '可以把大型任務拆成幾個小步驟。'],
    completed: getCompletedRangeEmptyMessage(completedRangeFilter),
  };
  const [emptyTitle, emptyDesc] = emptyMessages[listId] || ['這裡目前沒有任務', '狀態很好，沒有需要處理的項目。'];

  const rangeFilterHtml = listId === 'completed' ? renderCompletedRangeFilter(tasks) : '';

  return `
    <div class="smart-list-detail">
      <button type="button" class="btn btn--ghost btn--sm smart-list-back" data-action="smart-list-back">‹ 智慧清單</button>
      <h2 class="section-title">${list.icon} ${escapeHtml(list.name)}</h2>
      <p class="section-desc">${escapeHtml(list.desc)}</p>
      ${rangeFilterHtml}
      ${sorted.length === 0
        ? emptyStateHtml(list.icon, emptyTitle, emptyDesc)
        : `<div class="task-list">${sorted.map(renderTaskCard).join('')}</div>`
      }
    </div>`;
}

function renderTaskCard(task) {
  const today = getTodayDateString();
  const priorityClass = `priority-${task.priority}`;
  const stardust = calculateRewardAmount(task);
  const energy = calculateAdventureEnergyAmount(task);
  const category = getCategoryById(task.categoryId || 'general', state.categories);
  const catClass = `badge--category badge--category-${category?.color || 'gray'}`;
  const dateClass = getDateBadgeClass(task, today);
  const dateText = formatDateBadgeText(task, today);
  const inPlan = isInTodayPlan(task, today);
  const subProgress = getSubtaskProgress(task);
  const isExpanded = expandedTaskIds.has(task.id);
  const hasSubtasks = subProgress.total > 0;

  let doneInfo = '';
  if (task.completed && task.completedAt) {
    doneInfo = `<p class="task-card__done-info">已完成 ${formatDateTime(task.completedAt)}${task.rewardClaimed || task.lastRewardClaimedAt ? ' · 已領取獎勵' : ''}</p>`;
  }

  const justCompleted = recentlyCompletedTaskIds.has(task.id);

  const subtasksHtml = hasSubtasks ? `
    <div class="task-card__subtasks ${isExpanded ? 'task-card__subtasks--open' : ''}">
      <div class="task-card__subtask-progress">
        <div class="progress-bar progress-bar--subtask">
          <div class="progress-bar__fill" style="width:${subProgress.percent}%"></div>
        </div>
        <span class="task-card__subtask-count">${subProgress.done} / ${subProgress.total}</span>
      </div>
      ${isExpanded ? `
        <ul class="subtask-list">
          ${(task.subtasks || []).map((s) => `
            <li class="subtask-item ${s.completed ? 'subtask-item--done' : ''}">
              <button type="button" class="subtask-check ${s.completed ? 'checked' : ''}" data-action="toggle-subtask" data-subtask-id="${s.id}" aria-label="完成子任務">
                ${s.completed ? '✓' : ''}
              </button>
              <span class="subtask-text">${escapeHtml(s.text)}</span>
            </li>
          `).join('')}
        </ul>
      ` : ''}
    </div>
  ` : '';

  const planBadge = inPlan
    ? `<span class="badge badge--today-plan">${task.completed ? '今日完成' : '今日'}</span>`
    : '';

  const planBtn = !task.completed
    ? inPlan
      ? `<button class="btn btn--ghost btn--sm" data-action="unplan-today">移出今日</button>`
      : `<button class="btn btn--ghost btn--sm" data-action="plan-today">加入今日</button>`
    : '';

  const expandBtn = hasSubtasks
    ? `<button class="btn btn--ghost btn--sm" data-action="toggle-expand">${isExpanded ? '收合' : '展開'}</button>`
    : '';

  return `
    <article class="task-card card-animate ${priorityClass} ${task.completed ? 'task-card--done' : ''} ${justCompleted ? 'task-card--just-done' : ''}" data-id="${task.id}">
      <div class="task-card__header">
        <button class="task-check ${task.completed ? 'checked' : ''}" data-action="toggle" aria-label="完成任務">
          ${task.completed ? '✓' : ''}
        </button>
        <div class="task-card__meta">
          <span class="badge ${catClass}">${formatCategoryLabel(category)}</span>
          <span class="badge ${priorityClass}">${PRIORITY_LABELS[task.priority]}</span>
          <span class="badge ${dateClass}">${escapeHtml(dateText)}</span>
          ${planBadge}
        </div>
      </div>
      <h3 class="task-card__title">${escapeHtml(task.title)}</h3>
      <p class="task-card__preview">${escapeHtml(task.content.split('\n').slice(0, 2).join(' '))}</p>
      ${subtasksHtml}
      ${
        !task.completed
          ? `<div class="task-card__rewards">
              <span class="task-reward-tag task-reward-tag--stardust">✦ ${stardust} 星塵</span>
              <span class="task-reward-tag task-reward-tag--energy">⚡ ${energy} 能量</span>
            </div>`
          : doneInfo
      }
      <div class="task-card__actions">
        ${
          !task.completed
            ? `<button class="btn btn--primary btn--sm task-card__complete-btn" data-action="toggle" aria-label="完成任務">完成</button>`
            : ''
        }
        ${planBtn}
        ${expandBtn}
        <button class="btn btn--ghost btn--sm" data-action="edit">編輯</button>
        <button class="btn btn--ghost btn--sm btn--danger" data-action="delete">刪除</button>
      </div>
    </article>`;
}

function openTaskForm(taskId = null) {
  const task = taskId ? state.tasks.find((t) => t.id === taskId) : null;
  const isEdit = !!task;
  const today = getTodayDateString();
  const categories = state.categories || [];
  const inPlan = task ? isInTodayPlan(task, today) : false;
  const subtasks = task?.subtasks || [];

  const categoryOptions = categories.map(
    (c) => `<option value="${c.id}" ${(task?.categoryId || 'general') === c.id ? 'selected' : ''}>${formatCategoryLabel(c)}</option>`
  ).join('');

  const subtaskListHtml = subtasks.map((s, i) => `
    <div class="subtask-form-item" data-index="${i}">
      <input type="text" class="form-input subtask-form-input" value="${escapeHtml(s.text)}" placeholder="子任務內容" maxlength="200" />
      <button type="button" class="btn btn--ghost btn--sm btn--danger subtask-form-remove" data-index="${i}" aria-label="刪除子任務">×</button>
    </div>
  `).join('');

  openModal(`
    <h2 class="modal-title">${isEdit ? '編輯任務' : '新增任務'}</h2>
    <form id="task-form" class="form task-form">
      <label class="form-label" for="task-content">任務內容</label>
      <textarea id="task-content" class="form-textarea" rows="4" placeholder="第一行將自動成為標題…" required>${task ? escapeHtml(task.content) : ''}</textarea>

      <label class="form-label" for="task-category">分類</label>
      <select id="task-category" class="form-select">${categoryOptions}</select>

      <label class="form-label">重要程度</label>
      <div class="segmented-control" id="task-priority-group">
        <button type="button" class="segmented-control__btn ${(!task || task.priority === 'normal') ? 'active' : ''}" data-value="normal">普通</button>
        <button type="button" class="segmented-control__btn segmented-control__btn--important ${task?.priority === 'important' ? 'active' : ''}" data-value="important">重要</button>
        <button type="button" class="segmented-control__btn segmented-control__btn--urgent ${task?.priority === 'urgent' ? 'active' : ''}" data-value="urgent">緊急</button>
      </div>
      <input type="hidden" id="task-priority" value="${task?.priority || 'normal'}" />

      ${!isEdit ? '<p class="form-hint">當天臨時任務可略過開始日與截止日；勾選「加入今日計畫」即可安排今天要做的事。</p>' : ''}

      <div class="form-row">
        <div class="form-field">
          <label class="form-label" for="task-start-date">開始日</label>
          <input type="date" id="task-start-date" class="form-input" value="${task?.startDate || ''}" />
        </div>
        <div class="form-field">
          <label class="form-label" for="task-due-date">截止日</label>
          <input type="date" id="task-due-date" class="form-input" value="${task?.dueDate || ''}" />
        </div>
      </div>
      <p class="form-error" id="task-date-error" hidden>開始日不可晚於截止日</p>

      <label class="settings-toggle form-toggle" for="task-plan-today">
        <span class="settings-toggle__text">
          <span class="settings-toggle__label">加入今日計畫</span>
          <span class="settings-toggle__desc">標記為今天打算完成的任務</span>
        </span>
        <input type="checkbox" id="task-plan-today" class="settings-toggle__input" ${inPlan ? 'checked' : ''} />
        <span class="settings-toggle__switch" aria-hidden="true"></span>
      </label>

      <label class="form-label">子任務</label>
      <div id="subtask-form-list" class="subtask-form-list">${subtaskListHtml}</div>
      <p class="form-hint subtask-form-empty" id="subtask-form-empty" ${subtasks.length ? 'hidden' : ''}>這個任務還沒有子任務，可以把大型任務拆成幾個小步驟。</p>
      <div class="subtask-form-add">
        <input type="text" id="subtask-new-input" class="form-input" placeholder="輸入子任務內容" maxlength="200" />
        <button type="button" class="btn btn--secondary btn--sm" id="subtask-add-btn">新增子任務</button>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn--ghost" id="form-cancel">取消</button>
        <button type="submit" class="btn btn--primary">${isEdit ? '儲存' : '新增'}</button>
      </div>
    </form>
  `);

  document.getElementById('form-cancel')?.addEventListener('click', closeModal);

  document.querySelectorAll('#task-priority-group .segmented-control__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#task-priority-group .segmented-control__btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('task-priority').value = btn.dataset.value;
    });
  });

  const formSubtasks = [...subtasks];

  function renderSubtaskFormList() {
    const list = document.getElementById('subtask-form-list');
    const emptyHint = document.getElementById('subtask-form-empty');
    if (!list) return;
    list.innerHTML = formSubtasks.map((s, i) => `
      <div class="subtask-form-item" data-index="${i}">
        <input type="text" class="form-input subtask-form-input" value="${escapeHtml(s.text)}" placeholder="子任務內容" maxlength="200" data-index="${i}" />
        <button type="button" class="btn btn--ghost btn--sm btn--danger subtask-form-remove" data-index="${i}" aria-label="刪除子任務">×</button>
      </div>
    `).join('');
    if (emptyHint) emptyHint.hidden = formSubtasks.length > 0;

    list.querySelectorAll('.subtask-form-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        formSubtasks.splice(idx, 1);
        renderSubtaskFormList();
      });
    });
    list.querySelectorAll('.subtask-form-input').forEach((input) => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.index);
        if (formSubtasks[idx]) formSubtasks[idx].text = input.value;
      });
    });
  }

  document.getElementById('subtask-add-btn')?.addEventListener('click', () => {
    const input = document.getElementById('subtask-new-input');
    const text = input?.value.trim();
    if (!text) {
      showToast('子任務文字不可為空', 'warning');
      return;
    }
    formSubtasks.push({ text, completed: false });
    if (input) input.value = '';
    renderSubtaskFormList();
  });

  document.getElementById('subtask-new-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('subtask-add-btn')?.click();
    }
  });

  renderSubtaskFormList();

  document.getElementById('task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('task-content').value.trim();
    const priority = document.getElementById('task-priority').value;
    const categoryId = document.getElementById('task-category').value;
    const startDate = document.getElementById('task-start-date').value || null;
    const dueDate = document.getElementById('task-due-date').value || null;
    const planToday = document.getElementById('task-plan-today').checked;
    const dateError = document.getElementById('task-date-error');

    if (!content) {
      showToast('請輸入任務內容', 'warning');
      return;
    }

    const dateCheck = validateDateRange(startDate, dueDate);
    if (!dateCheck.valid) {
      if (dateError) {
        dateError.textContent = dateCheck.message;
        dateError.hidden = false;
      }
      showToast(dateCheck.message, 'error');
      return;
    }
    if (dateError) dateError.hidden = true;

    const subtaskInputs = document.querySelectorAll('#subtask-form-list .subtask-form-input');
    const finalSubtasks = formSubtasks.map((s, i) => ({
      id: s.id,
      text: (subtaskInputs[i]?.value || s.text || '').trim(),
      completed: s.completed ?? false,
      createdAt: s.createdAt,
      completedAt: s.completedAt ?? null,
    })).filter((s) => s.text);

    for (const s of finalSubtasks) {
      if (!s.text) {
        showToast('子任務文字不可為空', 'warning');
        return;
      }
    }

    const payload = {
      content,
      priority,
      categoryId,
      startDate,
      dueDate,
      planToday,
      subtasks: finalSubtasks,
    };

    try {
      if (isEdit) {
        const todayStr = getTodayDateString();
        await updateTask(taskId, {
          content,
          priority,
          categoryId,
          startDate,
          dueDate,
          subtasks: finalSubtasks,
          isPlannedToday: planToday,
          plannedDate: planToday ? todayStr : null,
        });
        showToast('任務已更新', 'success');
      } else {
        await createTask(payload);
        showToast('任務已新增', 'success');
      }
      closeModal();
      await onRefresh();
      await handleAchievementCheckAfterAction();
    } catch (err) {
      showToast(err.message || '儲存失敗', 'error');
    }
  });
}

/** 渲染首頁成就 / 稱號摘要條 */
function renderAchievementStrip() {
  const strip = document.getElementById('achievement-strip');
  if (!strip) return;

  const summary = state.achievementSummary;
  if (!summary?.catalogLoaded) {
    strip.innerHTML = `
      <div class="achievement-strip__inner">
        <span class="achievement-strip__icon" aria-hidden="true">🏅</span>
        <div class="achievement-strip__text">
          <p class="achievement-strip__title">成就系統</p>
          <p class="achievement-strip__desc">成就資料暫時無法載入，請重新整理</p>
        </div>
      </div>`;
    return;
  }

  const titleText = summary.equippedTitle
    ? `稱號：${summary.equippedTitle.name}`
    : '尚未設定稱號';
  const titleEmptyClass = summary.equippedTitle ? '' : ' achievement-strip__title--empty';

  const claimable = summary.claimable ?? 0;
  const recent = summary.recentUnlocked?.[0];
  let subText = '';
  if (claimable > 0) {
    subText = `可領取成就：${claimable} 個`;
  } else if (recent) {
    subText = `最近解鎖：${recent.name}`;
  } else {
    subText = '完成任務可以解鎖更多成就。';
  }

  strip.innerHTML = `
    <div class="achievement-strip__inner">
      <span class="achievement-strip__icon">🏅</span>
      <div class="achievement-strip__text">
        <p class="achievement-strip__title${titleEmptyClass}">${escapeHtml(titleText)}</p>
        <p class="achievement-strip__desc">${escapeHtml(subText)}</p>
      </div>
      ${claimable > 0 ? '<span class="achievement-strip__badge" aria-hidden="true"></span>' : ''}
      <span class="achievement-strip__arrow">›</span>
    </div>`;
}

/** 渲染陪伴寵物區塊 */
function renderCompanionPetButton(companion) {
  const canPet = canPetCompanion(companion);
  const remaining = getPetCooldownRemaining(companion);
  const btnLabel = canPet ? '撫摸' : (remaining > 0 ? `還要 ${formatCooldown(remaining)}` : '冷卻中');
  const cooldownHint = canPet
    ? ''
    : `<p class="companion-card__cooldown">撫摸冷卻中，${escapeHtml(formatCooldown(remaining))}後可再次撫摸</p>`;

  return `
    <div class="companion-card__pet-row">
      <button type="button" class="btn btn--secondary btn--sm companion-pet-btn" data-action="companion-pet" ${canPet ? '' : 'disabled'}>${escapeHtml(btnLabel)}</button>
      ${cooldownHint}
    </div>`;
}

const PET_COMFORT_LINES = {
  N: ['牠開心地蹭了蹭你的手。', '牠看起來精神變好了。'],
  R: ['牠開心地蹭了蹭你的手。', '牠看起來精神變好了。'],
  SR: ['牠安靜地靠近你，似乎更信任你了。', '牠接受了你的撫摸。'],
  SSR: ['牠微微低下頭，默許了你的靠近。', '牠的氣息變得溫和了一些。'],
  UR: ['牠短暫收起威壓，接受了你的觸碰。', '星光在牠身旁輕輕流動。'],
};

function getPetComfortLine(companion) {
  const pool = PET_COMFORT_LINES[companion?.rarity] || PET_COMFORT_LINES.N;
  return pool[Math.floor(Math.random() * pool.length)];
}

function playHomeCompanionPetEffect() {
  const card = document.querySelector('.companion-card');
  const img = document.querySelector('.companion-card__image');
  triggerComfortVibration();
  if (!state?.userPreferences?.reduceMotion) {
    card?.classList.add('companion-card--bounce', 'companion-card--pet-glow');
    img?.classList.add('companion-img--bounce');
    setTimeout(() => {
      card?.classList.remove('companion-card--bounce', 'companion-card--pet-glow');
      img?.classList.remove('companion-img--bounce');
    }, 650);
  }
}

async function handleCompanionPet() {
  if (!state?.companion) {
    showToast('尚未設定陪伴寵物。', 'warning');
    return;
  }

  try {
    const result = await petCompanion();
    if (!result.success) {
      showToast(result.message, 'warning', 3500);
      await onRefresh();
      return;
    }

    playHomeCompanionPetEffect();
    showToast('你輕輕摸了摸牠，親密度 +5', 'success', 2800);
    if (result.leveledUp) {
      setTimeout(() => {
        const bondLine = getBondUpLine(state.companion);
        showBondLevelUpToast(result.newLevel, bondLine);
      }, 400);
    }

    await onRefresh();
    const comfortLine = getPetComfortLine(state.companion);
    setCompanionBubbleText(comfortLine, true);
  } catch (err) {
    showToast(err.message || '撫摸失敗', 'error');
  }
}

/** 渲染陪伴寵物區塊 */
function renderCompanionSection(companion, defaultLine) {
  const section = document.getElementById('companion-section');
  if (!section) return;

  if (!companion) {
    lastCompanionId = null;
    stopCompanionDialogueTimer();
    section.innerHTML = emptyStateHtml(
      '🐾',
      '尚未選擇陪伴寵物',
      '去圖鑑選一隻夥伴，讓牠陪你完成任務。',
      '前往圖鑑',
      'empty-go-collection'
    );
    return;
  }

  const sameCompanion = lastCompanionId === companion.id && section.querySelector('.companion-card');
  lastCompanionId = companion.id;

  if (sameCompanion) {
    updateCompanionBondDisplay(companion);
    updateCompanionImageIfNeeded(companion);
    return;
  }

  warmPetImageCache(getPetImageSrc(companion)).catch(() => {});

  const progress = getBondProgress(companion.bondExp ?? 0, companion.bondLevel ?? 1);
  const rarityClass = `rarity-${companion.rarity}`;
  const equippedTitle = state.achievementSummary?.equippedTitle;
  const titleHtml = equippedTitle
    ? `<p class="companion-card__player-title">稱號：${escapeHtml(equippedTitle.name)}</p>`
    : '';
  const petBtnHtml = renderCompanionPetButton(companion);

  section.innerHTML = `
    <div class="companion-wrap">
      <div class="companion-bubble companion-bubble--visible" id="companion-bubble" aria-live="polite">
        <p class="companion-bubble__text" id="companion-bubble-text">${escapeHtml(defaultLine)}</p>
      </div>
      <article class="companion-card card ${rarityClass} companion-card--breathe">
        <div class="companion-card__glow"></div>
        <button type="button" class="companion-card__image" data-action="companion-view-image" aria-label="放大查看 ${escapeHtml(petDisplayName(companion))}">
          ${petImageHtml(companion, { size: 'lg', loading: 'eager', eager: true, framed: true })}
        </button>
        <div class="companion-card__body" data-action="companion-talk" role="button" tabindex="0">
          <div class="companion-card__header">
            <div class="companion-card__name-wrap">
              <h2 class="companion-card__name">${escapeHtml(petDisplayName(companion))}</h2>
              ${petOriginalNameHtml(companion)}
            </div>
            <span class="badge badge--rarity ${rarityClass}">${companion.rarity}</span>
          </div>
          ${titleHtml}
          ${renderStars(companion.stars ?? 1)}
          <div class="companion-bond">
            <div class="companion-bond__label">
              <span>親密度 Lv.${companion.bondLevel ?? 1}</span>
              <span>${progress.current}/${progress.max || 'MAX'}</span>
            </div>
            <div class="progress-bar progress-bar--bond">
              <div class="progress-bar__fill" style="width:${progress.percent}%"></div>
            </div>
          </div>
          ${petBtnHtml}
          <p class="companion-card__hint">點擊與夥伴互動 · 點圖片可放大</p>
        </div>
      </article>
    </div>`;

  startCompanionDialogueTimer();
}

/** 輕柔震動（撫摸 / 餵食成功） */
function triggerComfortVibration() {
  if (state?.userPreferences?.reduceMotion) return;
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([12, 40, 18]);
    } catch {
      /* 部分瀏覽器不支援 */
    }
  }
}

/** 在預覽區跳出愛心 */
function spawnCompanionHearts(container, count = 4) {
  if (!container || state?.userPreferences?.reduceMotion) return;
  const symbols = ['💜', '💗', '❤️', '✨'];
  for (let i = 0; i < count; i += 1) {
    const heart = document.createElement('span');
    heart.className = 'companion-heart-float';
    heart.textContent = symbols[i % symbols.length];
    heart.style.left = `${28 + Math.random() * 44}%`;
    heart.style.animationDelay = `${i * 0.1}s`;
    heart.setAttribute('aria-hidden', 'true');
    container.appendChild(heart);
    setTimeout(() => heart.remove(), 1400);
  }
}

/** 撫摸 / 餵食成功的視覺回饋 */
function playCompanionComfortEffect() {
  const heartsEl = document.getElementById('companion-preview-hearts');
  const frame = document.querySelector('.companion-image-preview__frame');
  triggerComfortVibration();
  spawnCompanionHearts(heartsEl);
  if (frame && !state?.userPreferences?.reduceMotion) {
    frame.classList.add('companion-image-preview__frame--comfort');
    setTimeout(() => frame.classList.remove('companion-image-preview__frame--comfort'), 650);
  }
}

function buildCompanionFeedSection(companion) {
  const inventory = state.inventory || { items: {} };
  const itemCounts = getItemInventory(inventory);
  const bondItems = (state.craftablesCatalog || []).filter(
    (c) =>
      (c.type === 'bond_item' || c.type === 'favorite_bond_item') &&
      (itemCounts[c.id] || 0) > 0
  );
  const today = getTodayDateString();
  const dailyUsed = getDailyBondItemUsage(companion.id, today, inventory);
  const atLimit = dailyUsed >= DAILY_BOND_ITEM_LIMIT;
  const progress = getBondProgress(companion.bondExp ?? 0, companion.bondLevel ?? 1);

  if (bondItems.length === 0) {
    return `
      <section class="companion-preview-feed card">
        <h3 class="companion-preview-feed__title">餵食</h3>
        <p class="companion-preview-feed__empty">目前沒有親密度道具。<br>可到「更多 → 工坊」用探險材料製作。</p>
      </section>
      <p class="companion-preview-bond">親密度 Lv.${companion.bondLevel ?? 1} · ${progress.current}/${progress.max || 'MAX'}</p>`;
  }

  const options = bondItems
    .map((item) => {
      const stock = itemCounts[item.id] || 0;
      const fav = getFavoriteBonus(item, companion).isFavorite;
      const favMark = fav ? ' ★喜好' : '';
      return `<option value="${item.id}">${escapeHtml(item.name)} ×${stock}${favMark}</option>`;
    })
    .join('');

  return `
    <section class="companion-preview-feed card">
      <h3 class="companion-preview-feed__title">餵食</h3>
      <p class="companion-preview-feed__daily">今日已餵 ${dailyUsed} / ${DAILY_BOND_ITEM_LIMIT}</p>
      <label class="companion-preview-feed__picker">
        <span class="companion-preview-feed__label">工坊食物</span>
        <select id="companion-feed-select" class="companion-preview-feed__select">${options}</select>
      </label>
      <button type="button" class="btn btn--primary btn--block" id="companion-feed-btn" ${atLimit ? 'disabled' : ''}>餵食</button>
      ${atLimit ? '<p class="companion-preview-feed__limit">今天這隻寵物已經收到足夠多禮物了，明天再來吧。</p>' : ''}
    </section>
    <p class="companion-preview-bond">親密度 Lv.${companion.bondLevel ?? 1} · ${progress.current}/${progress.max || 'MAX'}</p>`;
}

function buildCompanionPetButtonHtml(companion) {
  const canPet = canPetCompanion(companion);
  const remaining = getPetCooldownRemaining(companion);
  const btnLabel = canPet ? '撫摸' : (remaining > 0 ? `還要 ${formatCooldown(remaining)}` : '冷卻中');
  return `<button type="button" class="btn btn--secondary btn--block" id="companion-pet-btn" ${canPet ? '' : 'disabled'}>${escapeHtml(btnLabel)}</button>`;
}

function bindCompanionPreviewInteractions(companion) {
  const stage = document.getElementById('companion-preview-stage');
  const img = stage?.querySelector('.companion-image-preview__img--interactive');
  const petBtn = document.getElementById('companion-pet-btn');
  const feedBtn = document.getElementById('companion-feed-btn');

  const onPet = async (e) => {
    e?.stopPropagation();
    if (!canPetCompanion(companion)) {
      const remaining = getPetCooldownRemaining(companion);
      showToast(`牠剛剛已經被摸過了，還要 ${formatCooldown(remaining)}才能再次撫摸。`, 'warning', 3500);
      return;
    }
    try {
      const result = await petCompanion();
      if (!result.success) {
        showToast(result.message, 'warning', 3500);
        return;
      }
      playCompanionComfortEffect();
      showToast('你輕輕摸了摸牠，親密度 +5', 'success', 2800);
      if (result.leveledUp) {
        setTimeout(() => showToast(`親密度提升到 Lv.${result.newLevel}`, 'success', 2800), 400);
      }
      await onRefresh({ renderMode: ['tasks'] });
      const updated = state.companion;
      if (updated) {
        openCompanionImageModal(updated);
      }
      const comfortLine = getPetComfortLine(updated || companion);
      setCompanionBubbleText(comfortLine, true);
    } catch (err) {
      showToast(err.message || '撫摸失敗', 'error');
    }
  };

  img?.addEventListener('click', (e) => {
    e.stopPropagation();
    onPet(e);
  });
  petBtn?.addEventListener('click', onPet);

  feedBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (feedBtn.disabled) return;
    const select = document.getElementById('companion-feed-select');
    const itemId = select?.value;
    if (!itemId) {
      showToast('請先選擇要餵食的食物', 'warning');
      return;
    }
    try {
      const result = await useBondItem(itemId, companion.id, state.allPets);
      if (!result.success) {
        showToast(result.message, 'warning');
        return;
      }
      playCompanionComfortEffect();
      await onRefresh({ renderMode: ['tasks', 'workshop'] });
      const updated = state.companion;
      if (updated) {
        openCompanionImageModal(updated);
      }
      if (result.isFavorite) {
        showToast(`牠很喜歡這份禮物！親密度 +${result.bondExp}`, 'success', 3200);
      } else {
        showToast(`親密度提升 +${result.bondExp}`, 'success');
      }
      if (result.leveledUp) {
        setTimeout(() => showToast(`親密度提升到 Lv.${result.newLevel}`, 'success', 2800), 400);
      }
      await handleAchievementCheckAfterAction();
    } catch (err) {
      showToast(err.message || '餵食失敗', 'error');
    }
  });
}

function openCompanionImageModal(companion) {
  if (!companion?.image) return;

  const src = getPetImageSrc(companion);
  warmPetImageCache(src).catch(() => {});

  const rarityClass = `rarity-${companion.rarity}`;
  const onError = `this.onerror=null;this.classList.add('companion-image-preview__img--error')`;
  const onload = "this.classList.add('is-loaded');this.closest('.pet-image-frame')?.classList.remove('is-loading')";
  const feedSection = buildCompanionFeedSection(companion);

  openModal(`
    <div class="companion-image-preview ${rarityClass}">
      <div class="companion-image-preview__stage" id="companion-preview-stage">
        <div class="companion-preview-hearts" id="companion-preview-hearts" aria-hidden="true"></div>
        <div class="companion-image-preview__frame pet-image-frame pet-image-frame--lg is-loading">
          <img
            class="companion-image-preview__img companion-image-preview__img--interactive is-loading"
            src="${src}"
            alt="${escapeHtml(petDisplayName(companion))}"
            loading="eager"
            decoding="async"
            onload="${onload}"
            onerror="${onError}"
          />
          <span class="pet-image-frame__fallback" aria-hidden="true">圖片載入中</span>
        </div>
      </div>
      <h2 class="companion-image-preview__name">${escapeHtml(petDisplayName(companion))}</h2>
      ${petOriginalNameHtml(companion)}
      <div class="companion-image-preview__meta">
        <span class="badge badge--rarity ${rarityClass}">${companion.rarity}</span>
        ${renderStars(companion.stars ?? 1)}
      </div>
      <div class="companion-preview-actions">
        ${buildCompanionPetButtonHtml(companion)}
      </div>
      ${feedSection}
      <p class="companion-image-preview__hint">點擊夥伴或按撫摸 · 餵食使用工坊食物</p>
    </div>
  `);

  bindCompanionPreviewInteractions(companion);
}

/** 陪伴寵物未變時只更新圖片 src（避免整卡重建） */
function updateCompanionImageIfNeeded(companion) {
  const img = document.querySelector('.companion-card__image img');
  const src = getPetImageSrc(companion);
  if (!img || !src) return;

  const currentSrc = img.getAttribute('src') || '';
  if (currentSrc === src) return;

  const frame = img.closest('.pet-image-frame');
  frame?.classList.add('is-loading');
  frame?.classList.remove('is-error');
  img.classList.remove('is-loaded', 'is-error');
  img.classList.add('is-loading');
  img.setAttribute('src', src);
  warmPetImageCache(src).catch(() => {});
}

function updateCompanionBondDisplay(companion) {
  const progress = getBondProgress(companion.bondExp ?? 0, companion.bondLevel ?? 1);
  const labels = document.querySelector('.companion-bond__label');
  if (labels) {
    const spans = labels.querySelectorAll('span');
    if (spans[0]) spans[0].textContent = `親密度 Lv.${companion.bondLevel ?? 1}`;
    if (spans[1]) spans[1].textContent = `${progress.current}/${progress.max || 'MAX'}`;
  }
  const fill = document.querySelector('.companion-bond .progress-bar__fill');
  if (fill) fill.style.width = `${progress.percent}%`;

  const petRow = document.querySelector('.companion-card__pet-row');
  if (petRow) {
    const canPet = canPetCompanion(companion);
    const remaining = getPetCooldownRemaining(companion);
    const btnLabel = canPet ? '撫摸' : (remaining > 0 ? `還要 ${formatCooldown(remaining)}` : '冷卻中');
    const btn = petRow.querySelector('.companion-pet-btn');
    if (btn) {
      btn.textContent = btnLabel;
      btn.disabled = !canPet;
    }
    let cooldownEl = petRow.querySelector('.companion-card__cooldown');
    if (!canPet) {
      const hint = `撫摸冷卻中，${formatCooldown(remaining)}後可再次撫摸`;
      if (cooldownEl) {
        cooldownEl.textContent = hint;
      } else {
        cooldownEl = document.createElement('p');
        cooldownEl.className = 'companion-card__cooldown';
        cooldownEl.textContent = hint;
        petRow.appendChild(cooldownEl);
      }
    } else if (cooldownEl) {
      cooldownEl.remove();
    }
  }
}

function buildDialogueContext(overrides = {}) {
  const isIdle = Date.now() - lastUserActivity >= IDLE_THRESHOLD_MS;
  return {
    tasks: state.tasks,
    todayCompleted: state.todayCompleted,
    companion: state.companion,
    wallet: state.wallet,
    activeExpedition: state.activeExpedition,
    expeditionAreas: state.expeditionAreas,
    habits: state.habits || [],
    inventory: state.inventory,
    dailyCheckIn: state.dailyCheckIn,
    craftables: state.craftablesCatalog || [],
    workshopHelpers: {
      hasCraftableMaterials,
      hasBondItemsInInventory,
      companionLikesAnyGift,
      hasLowMaterials,
    },
    isIdle,
    ...overrides,
  };
}

function isModalOpen() {
  return document.getElementById('modal-overlay')?.classList.contains('open') ?? false;
}

function setCompanionBubbleText(text, animate = true) {
  const bubbleText = document.getElementById('companion-bubble-text');
  if (!bubbleText) return;

  if (!animate) {
    bubbleText.textContent = text;
    return;
  }

  bubbleText.classList.add('companion-bubble__text--changing');
  setTimeout(() => {
    bubbleText.textContent = text;
    bubbleText.classList.remove('companion-bubble__text--changing');
    bubbleText.classList.add('companion-bubble__text--show');
    setTimeout(() => bubbleText.classList.remove('companion-bubble__text--show'), 350);
  }, 180);
}

function refreshCompanionBubble(overrides = {}) {
  if (!state?.companion) return;
  const line = getCompanionDialogue(buildDialogueContext(overrides));
  setCompanionBubbleText(line, !overrides.isWelcome);
}

function showCompanionDialogue() {
  const card = document.querySelector('.companion-card');
  const img = document.querySelector('.companion-card__image');
  if (!state.companion) return;

  trackUserActivity();
  refreshCompanionBubble();
  card?.classList.add('companion-card--bounce');
  img?.classList.add('companion-img--bounce');
  setTimeout(() => {
    card?.classList.remove('companion-card--bounce');
    img?.classList.remove('companion-img--bounce');
  }, 500);
  scheduleCompanionDialogueTimer();
}

function scheduleCompanionDialogueTimer() {
  stopCompanionDialogueTimer();
  if (!state?.companion || currentTasksView !== 'tasks') return;

  companionDialogueTimer = setTimeout(() => {
    if (!isModalOpen() && state?.companion && currentTasksView === 'tasks') {
      refreshCompanionBubble();
    }
    scheduleCompanionDialogueTimer();
  }, randomBubbleInterval());
}

function startCompanionDialogueTimer() {
  if (state?.companion && currentTasksView === 'tasks') {
    scheduleCompanionDialogueTimer();
  }
}

function stopCompanionDialogueTimer() {
  if (companionDialogueTimer) {
    clearTimeout(companionDialogueTimer);
    companionDialogueTimer = null;
  }
}

function bindActivityTracking() {
  const track = () => trackUserActivity();
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach((evt) => {
    document.addEventListener(evt, track, { passive: true });
  });
}

function trackUserActivity() {
  lastUserActivity = Date.now();
}

export function applyReduceMotionClass(enabled) {
  document.body.classList.toggle('reduce-motion', !!enabled);
}

/**
 * 套用美術風格主題
 * @param {string} theme
 * @param {{ silent?: boolean, skipSave?: boolean }} [options]
 */
export async function applyTheme(theme, options = {}) {
  const { silent = false, skipSave = false } = options;
  const valid = normalizeTheme(theme);
  const previous = state?.userPreferences?.theme ?? document.body.dataset.theme ?? 'default';

  applyThemeToDocument(valid);

  if (!skipSave) {
    const prefs = await setTheme(valid);
    if (state) state.userPreferences = prefs;
  } else if (state) {
    state.userPreferences = { ...state.userPreferences, theme: valid };
  }

  if (state) {
    applyReduceMotionClass(state.userPreferences?.reduceMotion ?? false);
    await renderAll();
  } else {
    renderThemePickerState(valid);
  }

  if (!silent && previous !== valid) {
    showToast('主題已切換', 'success');
  }

  return valid;
}

function renderThemePickerState(activeTheme) {
  const theme = normalizeTheme(activeTheme);
  document.querySelectorAll('[data-action="select-theme"]').forEach((card) => {
    const cardTheme = card.dataset.theme;
    const isActive = cardTheme === theme;
    card.classList.toggle('theme-card--active', isActive);
    card.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });
  document.querySelectorAll('[data-theme-badge]').forEach((badge) => {
    badge.hidden = badge.dataset.themeBadge !== theme;
  });
}

function renderNavBadges() {
  if (!state) return;

  const { wallet, activeExpedition, companion, achievementSummary } = state;
  const expeditionComplete =
    activeExpedition && isExpeditionTimeComplete(activeExpedition) && !activeExpedition.claimed;
  const stardust = wallet?.stardust ?? 0;
  const claimable = achievementSummary?.claimable ?? 0;
  const hasUnseenTitles = achievementSummary?.hasUnseenTitles ?? false;
  const habitIncomplete = state.habitStats?.hasIncompleteToday ?? false;
  const habitNearGoal = hasWeeklyNearGoal(state.habits || []);

  setNavBadge('expedition', !!expeditionComplete, 'alert');
  setNavBadge('gacha', stardust >= GACHA_TEN_COST, 'hint');
  setNavBadge('collection', !companion, 'hint');
  setNavBadge('more', claimable > 0 || hasUnseenTitles || habitIncomplete || habitNearGoal, 'alert');

  const moreBadge = document.getElementById('more-achievements-badge');
  if (moreBadge) {
    moreBadge.hidden = !(claimable > 0 || hasUnseenTitles);
  }

  const habitsBadge = document.getElementById('more-habits-badge');
  if (habitsBadge) {
    habitsBadge.hidden = !(habitIncomplete || habitNearGoal);
  }
}

function setNavBadge(view, show, type = 'alert') {
  const nav = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (!nav) return;

  let badge = nav.querySelector('.nav-badge');
  if (show) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = `nav-badge nav-badge--${type}`;
      badge.setAttribute('aria-hidden', 'true');
      nav.appendChild(badge);
    }
    badge.className = `nav-badge nav-badge--${type}`;
    badge.hidden = false;
  } else if (badge) {
    badge.hidden = true;
  }
}

function showBondLevelUpToast(level, customLine = null) {
  const toast = document.createElement('div');
  toast.className = 'reward-toast reward-toast--bond';
  const msg = customLine
    ? escapeHtml(customLine)
    : `你的夥伴提升到親密度 <strong>Lv.${level}</strong>！`;
  toast.innerHTML = `<span class="reward-toast__icon">💜</span><span>${msg}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showRewardToast(amount, energy = 0) {
  const toast = document.createElement('div');
  toast.className = 'reward-toast reward-toast--reward';
  let text = `<span class="reward-toast__icon">✨</span><span class="reward-toast__message">獲得 <strong class="toast-highlight">${amount}</strong> 星塵！</span>`;
  if (energy > 0) {
    text += `<span class="reward-toast__energy">＋<strong class="toast-highlight">${energy}</strong> 冒險能量</span>`;
  }
  toast.innerHTML = text;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, energy > 0 ? 3000 : 2500);
}

/* ─── 召喚頁 ─── */

function renderGachaView() {
  const pool = getActivePool(state.poolsData);
  const stats = state.gachaStats;
  const pity = pool.pity || { ssr: 30, ur: 100 };
  const stardust = state.wallet.stardust ?? 0;
  const singleCost = pool.cost ?? GACHA_COST;

  setText('gacha-pool-name', pool.name);
  setText('gacha-stardust', stardust);
  setText('gacha-cost', singleCost);
  setText('gacha-ten-cost', GACHA_TEN_COST);
  setText('gacha-ssr-pity', `${stats.ssrPity}/${pity.ssr}`);
  setText('gacha-ur-pity', `${stats.urPity}/${pity.ur}`);

  const ssrBar = document.getElementById('gacha-ssr-bar');
  const urBar = document.getElementById('gacha-ur-bar');
  if (ssrBar) ssrBar.style.width = `${Math.min(100, (stats.ssrPity / pity.ssr) * 100)}%`;
  if (urBar) urBar.style.width = `${Math.min(100, (stats.urPity / pity.ur) * 100)}%`;

  const ratesEl = document.getElementById('gacha-rates');
  if (ratesEl && pool.rates) {
    ratesEl.innerHTML = Object.entries(pool.rates)
      .map(
        ([r, rate]) =>
          `<span class="rate-tag rate-${r}">${RARITY_LABELS[r]} ${(rate * 100).toFixed(0)}%</span>`
      )
      .join('');
  }

  const btnSingle = document.getElementById('btn-pull');
  const btnTen = document.getElementById('btn-pull-ten');
  const hintSingle = document.getElementById('gacha-hint-single');
  const hintTen = document.getElementById('gacha-hint-ten');

  const canSingle = stardust >= singleCost;
  const canTen = stardust >= GACHA_TEN_COST;

  if (btnSingle) {
    btnSingle.disabled = !canSingle;
    btnSingle.textContent = '召喚 1 次';
  }
  if (btnTen) {
    btnTen.disabled = !canTen;
    btnTen.textContent = '召喚 10 次';
  }

  if (hintSingle) {
    if (!canSingle) {
      hintSingle.textContent = '星塵不足，完成任務可以獲得星塵。';
      hintSingle.hidden = false;
    } else {
      hintSingle.hidden = true;
    }
  }

  if (hintTen) {
    if (!canTen) {
      hintTen.textContent = '10 連抽需要 1000 星塵。';
      hintTen.hidden = false;
    } else {
      hintTen.hidden = true;
    }
  }

  renderGachaDailyBlessingEntry();
}

async function handlePull() {
  const pool = getActivePool(state.poolsData);
  const cost = pool.cost ?? GACHA_COST;

  if ((state.wallet.stardust ?? 0) < cost) {
    showToast('星塵不足，完成任務可以獲得星塵', 'warning');
    return;
  }

  const btn = document.getElementById('btn-pull');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '召喚中…';
  }

  try {
    const result = await pullOnce(state.allPets, state.poolsData);
    const preloadPromise = preloadGachaResultImages(result);
    await Promise.all([
      onRefresh({ renderMode: ['gacha', 'collection'] }),
      waitForPreloadWithTimeout(preloadPromise, 600),
    ]);
    showPullResult(result);
    showToast('召喚成功！', 'success', 2000);
    await handleAchievementCheckAfterAction();
  } catch (err) {
    showToast(err.message || '召喚失敗', 'error');
  } finally {
    renderGachaView();
  }
}

async function handleTenPull() {
  if ((state.wallet.stardust ?? 0) < GACHA_TEN_COST) {
    showToast('10 連抽需要 1000 星塵', 'warning');
    return;
  }

  const btn = document.getElementById('btn-pull-ten');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '召喚中…';
  }

  try {
    const result = await performTenPull(state.allPets, state.poolsData);
    if (!result.success) {
      showToast(result.error || '10 連抽失敗', 'warning');
      return;
    }
    const preloadPromise = preloadGachaResultImages(result.results);
    await Promise.all([
      onRefresh({ renderMode: ['gacha', 'collection'] }),
      waitForPreloadWithTimeout(preloadPromise, 600),
    ]);
    showTenPullResult(result);
    showToast('10 連抽完成！', 'success', 2000);
    await handleAchievementCheckAfterAction();
  } catch (err) {
    showToast(err.message || '10 連抽失敗', 'error');
  } finally {
    renderGachaView();
  }
}

function isSweetTheme() {
  return normalizeTheme(state?.userPreferences?.theme) === 'sweet';
}

function getGachaAffordability() {
  const pool = getActivePool(state.poolsData);
  const singleCost = pool.cost ?? GACHA_COST;
  const stardust = state.wallet.stardust ?? 0;
  return {
    singleCost,
    stardust,
    canSingle: stardust >= singleCost,
    canTen: stardust >= GACHA_TEN_COST,
  };
}

function sweetSummonRarityBadge(rarity, extraClass = '') {
  return `<span class="sweet-summon-badge sweet-summon-badge--rarity ${extraClass}" data-rarity="${rarity}">${rarity}</span>`;
}

function sweetSummonStatusBadge(isNew, amount) {
  if (isNew) {
    return '<span class="sweet-summon-badge sweet-summon-badge--new">NEW</span>';
  }
  return `<span class="sweet-summon-badge sweet-summon-badge--fragment">碎片 +${amount}</span>`;
}

function sweetSummonRarityDesc(rarity) {
  const labels = { N: '普通夥伴', R: '稀有夥伴', SR: '超稀有夥伴', SSR: '極稀有夥伴', UR: '傳說夥伴' };
  return labels[rarity] || rarity;
}

function renderSweetSinglePullResult(result) {
  const { pet, isNew, fragmentsGained, rarity, triggeredPity } = result;
  const { canSingle, canTen } = getGachaAffordability();

  openModal(`
    <div class="sweet-summon-result sweet-summon-result--single" data-rarity="${rarity}">
      <header class="sweet-summon-result__header">
        <div class="sweet-summon-result__header-row">
          <p class="sweet-summon-result__eyebrow">召喚結果</p>
          ${sweetSummonRarityBadge(rarity)}
        </div>
        <h2 class="sweet-summon-result__title">${isNew ? '新夥伴加入' : '獲得寵物'}</h2>
        ${triggeredPity ? '<p class="sweet-summon-result__pity">保底觸發</p>' : ''}
      </header>

      <div class="sweet-summon-result__scroll">
        <section class="sweet-summon-showcase" data-rarity="${rarity}" aria-label="召喚寵物展示">
          <div class="sweet-summon-showcase__frame">
            ${petImageHtml(pet, { size: 'lg', loading: 'eager', eager: true })}
          </div>
          <h3 class="sweet-summon-showcase__name">${escapeHtml(pet.name)}</h3>
          <div class="sweet-summon-showcase__badges">
            ${sweetSummonStatusBadge(isNew, fragmentsGained)}
            ${isNew ? '<span class="sweet-summon-badge sweet-summon-badge--status sweet-summon-badge--status-new">新夥伴加入</span>' : '<span class="sweet-summon-badge sweet-summon-badge--status sweet-summon-badge--status-dup">重複轉化</span>'}
          </div>
          ${pet.summonLine ? `<p class="sweet-summon-showcase__line">「${escapeHtml(pet.summonLine)}」</p>` : ''}
          <p class="sweet-summon-showcase__desc">${escapeHtml(pet.description)}</p>
        </section>

        <section class="sweet-summon-info" aria-label="召喚結果資訊">
          ${
            isNew
              ? `<div class="sweet-summon-info__row">
                  <span class="sweet-summon-info__label">圖鑑狀態</span>
                  <span class="sweet-summon-info__value sweet-summon-info__value--success">已加入圖鑑</span>
                </div>`
              : `<div class="sweet-summon-info__row">
                  <span class="sweet-summon-info__label">轉化結果</span>
                  <span class="sweet-summon-info__value sweet-summon-info__value--fragment">碎片 +${fragmentsGained}</span>
                </div>`
          }
          <div class="sweet-summon-info__row">
            <span class="sweet-summon-info__label">稀有度</span>
            <span class="sweet-summon-info__value">${sweetSummonRarityDesc(rarity)}</span>
          </div>
        </section>
      </div>

      <footer class="sweet-summon-result__actions">
        <button type="button" class="sweet-summon-btn sweet-summon-btn--primary" data-action="result-single-pull"${canSingle ? '' : ' disabled'}>再召喚 1 次</button>
        <button type="button" class="sweet-summon-btn sweet-summon-btn--secondary" data-action="result-ten-pull"${canTen ? '' : ' disabled'}>召喚 10 次</button>
        <button type="button" class="sweet-summon-btn sweet-summon-btn--ghost" id="pull-close">關閉</button>
      </footer>
    </div>
  `);

  bindGachaResultButtons('pull-close');
}

function renderSweetTenPullResult(result) {
  const { results, summary } = result;
  const { canSingle, canTen } = getGachaAffordability();

  const cardsHtml = results
    .map(
      (r, i) => `
      <article class="sweet-summon-grid-card" data-rarity="${r.rarity}" style="animation-delay:${i * 0.05}s">
        <div class="sweet-summon-grid-card__media">${petImageHtml(r.pet, { size: 'sm', loading: 'eager', eager: true })}</div>
        <div class="sweet-summon-grid-card__body">
          ${sweetSummonRarityBadge(r.rarity)}
          <p class="sweet-summon-grid-card__name">${escapeHtml(r.pet.name)}</p>
          <div class="sweet-summon-grid-card__footer">
            ${sweetSummonStatusBadge(r.isNew, r.duplicateFragments)}
            ${r.triggeredPity ? '<span class="sweet-summon-badge sweet-summon-badge--pity">保底</span>' : ''}
          </div>
        </div>
      </article>`
    )
    .join('');

  openModal(`
    <div class="sweet-summon-result sweet-summon-result--ten" data-highest-rarity="${summary.highestRarity}">
      <header class="sweet-summon-result__header">
        <div class="sweet-summon-result__header-row">
          <p class="sweet-summon-result__eyebrow">十連召喚結果</p>
          ${sweetSummonRarityBadge(summary.highestRarity, 'sweet-summon-badge--highest')}
        </div>
        <h2 class="sweet-summon-result__title">今天的召喚成果</h2>
      </header>

      <div class="sweet-summon-result__scroll">
        <section class="sweet-summon-summary" aria-label="十連召喚摘要">
          <div class="sweet-summon-summary__item sweet-summon-summary__item--new">
            <span class="sweet-summon-summary__label">新夥伴</span>
            <span class="sweet-summon-summary__value">${summary.newCount}</span>
          </div>
          <div class="sweet-summon-summary__item sweet-summon-summary__item--dup">
            <span class="sweet-summon-summary__label">重複</span>
            <span class="sweet-summon-summary__value">${summary.duplicateCount}</span>
          </div>
          <div class="sweet-summon-summary__item sweet-summon-summary__item--frag">
            <span class="sweet-summon-summary__label">碎片</span>
            <span class="sweet-summon-summary__value">+${summary.totalFragments}</span>
          </div>
          <div class="sweet-summon-summary__item sweet-summon-summary__item--highest">
            <span class="sweet-summon-summary__label">最高稀有</span>
            <span class="sweet-summon-summary__value">${summary.highestRarity}</span>
          </div>
        </section>

        <div class="sweet-summon-grid" role="list" aria-label="十連召喚卡片">${cardsHtml}</div>
      </div>

      <footer class="sweet-summon-result__actions">
        <button type="button" class="sweet-summon-btn sweet-summon-btn--secondary" data-action="result-ten-pull"${canTen ? '' : ' disabled'}>再召喚 10 次</button>
        <button type="button" class="sweet-summon-btn sweet-summon-btn--primary" data-action="result-single-pull"${canSingle ? '' : ' disabled'}>召喚 1 次</button>
        <button type="button" class="sweet-summon-btn sweet-summon-btn--ghost" id="ten-pull-close">關閉</button>
      </footer>
    </div>
  `);

  bindGachaResultButtons('ten-pull-close');
}

function defaultSummonRarityBadge(rarity, extraClass = '') {
  return `<span class="default-summon-badge default-summon-badge--rarity ${extraClass}" data-rarity="${rarity}">${rarity}</span>`;
}

function defaultSummonStatusBadge(isNew, amount) {
  if (isNew) {
    return '<span class="default-summon-badge default-summon-badge--new">NEW</span>';
  }
  return `<span class="default-summon-badge default-summon-badge--fragment">碎片 +${amount}</span>`;
}

function defaultSummonRarityDesc(rarity) {
  const labels = { N: '普通夥伴', R: '稀有夥伴', SR: '超稀有夥伴', SSR: '極稀有夥伴', UR: '傳說夥伴' };
  return labels[rarity] || rarity;
}

function defaultSummonRarityHint(rarity) {
  if (rarity === 'UR') return '<p class="default-summon-showcase__hint default-summon-showcase__hint--ur">傳說夥伴</p>';
  if (rarity === 'SSR') return '<p class="default-summon-showcase__hint default-summon-showcase__hint--ssr">稀有夥伴</p>';
  return '';
}

function renderDefaultSinglePullResult(result) {
  const { pet, isNew, fragmentsGained, rarity, triggeredPity } = result;
  const { canSingle, canTen } = getGachaAffordability();

  openModal(`
    <div class="default-summon-result default-summon-result--single" data-rarity="${rarity}">
      <header class="default-summon-result__header">
        <div class="default-summon-result__header-row">
          <p class="default-summon-result__eyebrow">召喚結果</p>
          ${defaultSummonRarityBadge(rarity)}
        </div>
        <h2 class="default-summon-result__title">${isNew ? '新夥伴降臨' : '召喚完成'}</h2>
        ${triggeredPity ? '<p class="default-summon-result__pity">保底觸發</p>' : ''}
      </header>

      <div class="default-summon-result__scroll">
        <section class="default-summon-showcase" data-rarity="${rarity}" aria-label="召喚祭壇展示">
          <div class="default-summon-showcase__altar" aria-hidden="true"></div>
          ${defaultSummonRarityHint(rarity)}
          <div class="default-summon-showcase__frame">
            ${petImageHtml(pet, { size: 'lg', loading: 'eager', eager: true })}
          </div>
          <h3 class="default-summon-showcase__name">${escapeHtml(pet.name)}</h3>
          <div class="default-summon-showcase__badges">
            ${defaultSummonStatusBadge(isNew, fragmentsGained)}
            ${isNew ? '<span class="default-summon-badge default-summon-badge--status default-summon-badge--status-new">新夥伴加入</span>' : '<span class="default-summon-badge default-summon-badge--status default-summon-badge--status-dup">重複轉化</span>'}
          </div>
          ${pet.summonLine ? `<p class="default-summon-showcase__line">「${escapeHtml(pet.summonLine)}」</p>` : ''}
          <p class="default-summon-showcase__desc">${escapeHtml(pet.description)}</p>
        </section>

        <section class="default-summon-info" aria-label="召喚結果資訊">
          ${
            isNew
              ? `<div class="default-summon-info__row">
                  <span class="default-summon-info__label">圖鑑狀態</span>
                  <span class="default-summon-info__value default-summon-info__value--success">已加入圖鑑</span>
                </div>`
              : `<div class="default-summon-info__row">
                  <span class="default-summon-info__label">轉化結果</span>
                  <span class="default-summon-info__value default-summon-info__value--fragment">碎片 +${fragmentsGained}</span>
                </div>`
          }
          <div class="default-summon-info__row">
            <span class="default-summon-info__label">稀有度</span>
            <span class="default-summon-info__value">${defaultSummonRarityDesc(rarity)}</span>
          </div>
        </section>
      </div>

      <footer class="default-summon-result__actions">
        <button type="button" class="default-summon-btn default-summon-btn--primary" data-action="result-single-pull"${canSingle ? '' : ' disabled'}>再召喚 1 次</button>
        <button type="button" class="default-summon-btn default-summon-btn--ten" data-action="result-ten-pull"${canTen ? '' : ' disabled'}>召喚 10 次</button>
        <button type="button" class="default-summon-btn default-summon-btn--ghost" id="pull-close">關閉</button>
      </footer>
    </div>
  `);

  bindGachaResultButtons('pull-close');
}

function renderDefaultTenPullResult(result) {
  const { results, summary } = result;
  const { canSingle, canTen } = getGachaAffordability();

  const cardsHtml = results
    .map(
      (r, i) => `
      <article class="default-summon-grid-card" data-rarity="${r.rarity}" style="animation-delay:${i * 0.05}s">
        <div class="default-summon-grid-card__media">${petImageHtml(r.pet, { size: 'sm', loading: 'eager', eager: true })}</div>
        <div class="default-summon-grid-card__body">
          ${defaultSummonRarityBadge(r.rarity)}
          <p class="default-summon-grid-card__name">${escapeHtml(r.pet.name)}</p>
          <div class="default-summon-grid-card__footer">
            ${defaultSummonStatusBadge(r.isNew, r.duplicateFragments)}
            ${r.triggeredPity ? '<span class="default-summon-badge default-summon-badge--pity">保底</span>' : ''}
          </div>
        </div>
      </article>`
    )
    .join('');

  openModal(`
    <div class="default-summon-result default-summon-result--ten" data-highest-rarity="${summary.highestRarity}">
      <header class="default-summon-result__header">
        <div class="default-summon-result__header-row">
          <p class="default-summon-result__eyebrow">十連召喚結果</p>
          ${defaultSummonRarityBadge(summary.highestRarity, 'default-summon-badge--highest')}
        </div>
        <h2 class="default-summon-result__title">召喚儀式完成</h2>
      </header>

      <div class="default-summon-result__scroll">
        <section class="default-summon-summary" aria-label="十連召喚摘要">
          <div class="default-summon-summary__item default-summon-summary__item--new">
            <span class="default-summon-summary__label">新夥伴</span>
            <span class="default-summon-summary__value">${summary.newCount}</span>
          </div>
          <div class="default-summon-summary__item default-summon-summary__item--dup">
            <span class="default-summon-summary__label">重複</span>
            <span class="default-summon-summary__value">${summary.duplicateCount}</span>
          </div>
          <div class="default-summon-summary__item default-summon-summary__item--frag">
            <span class="default-summon-summary__label">碎片</span>
            <span class="default-summon-summary__value">+${summary.totalFragments}</span>
          </div>
          <div class="default-summon-summary__item default-summon-summary__item--highest">
            <span class="default-summon-summary__label">最高稀有</span>
            <span class="default-summon-summary__value">${summary.highestRarity}</span>
          </div>
        </section>

        <div class="default-summon-grid" role="list" aria-label="十連召喚卡片">${cardsHtml}</div>
      </div>

      <footer class="default-summon-result__actions">
        <button type="button" class="default-summon-btn default-summon-btn--ten" data-action="result-ten-pull"${canTen ? '' : ' disabled'}>再召喚 10 次</button>
        <button type="button" class="default-summon-btn default-summon-btn--primary" data-action="result-single-pull"${canSingle ? '' : ' disabled'}>召喚 1 次</button>
        <button type="button" class="default-summon-btn default-summon-btn--ghost" id="ten-pull-close">關閉</button>
      </footer>
    </div>
  `);

  bindGachaResultButtons('ten-pull-close');
}

function bindGachaResultButtons(closeId = 'pull-close') {
  document.getElementById(closeId)?.addEventListener('click', closeModal);

  document.querySelector('[data-action="result-single-pull"]')?.addEventListener('click', async () => {
    closeModal();
    await handlePull();
  });

  document.querySelector('[data-action="result-ten-pull"]')?.addEventListener('click', async () => {
    closeModal();
    await handleTenPull();
  });
}

function showPullResult(result) {
  if (isSweetTheme()) {
    renderSweetSinglePullResult(result);
    return;
  }
  renderDefaultSinglePullResult(result);
}

function showTenPullResult(result) {
  if (isSweetTheme()) {
    renderSweetTenPullResult(result);
    return;
  }
  renderDefaultTenPullResult(result);
}

/* ─── 圖鑑頁 ─── */

function renderCollectionView() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === collectionFilter);
  });

  const enriched = state.enrichedCollection || [];
  let filtered = enriched;

  if (collectionFilter === 'owned') {
    filtered = enriched.filter((p) => p.owned);
  } else if (collectionFilter === 'unowned') {
    filtered = enriched.filter((p) => !p.owned);
  } else if (collectionFilter !== 'all') {
    filtered = enriched.filter((p) => p.rarity === collectionFilter);
  }

  const { owned, total } = state.collectionProgress;
  const rate = total > 0 ? Math.round((owned / total) * 100) : 0;

  setText('collection-count', `${owned}/${total}`);
  setText('collection-rate', `${rate}%`);

  const companionEl = document.getElementById('collection-companion');
  if (companionEl) {
    if (state.companion) {
      companionEl.innerHTML = `
        <div>${petImageHtml(state.companion, { size: 'sm' })}</div>
        <div>
          <p class="collection-companion__label">目前陪伴寵物</p>
          <p class="collection-companion__name">${escapeHtml(petDisplayName(state.companion))}</p>
          ${state.companion.nickname ? `<p class="pet-original-name pet-original-name--sm">原名：${escapeHtml(petOriginalName(state.companion))}</p>` : ''}
        </div>
        <span class="badge badge--rarity rarity-${state.companion.rarity}">${state.companion.rarity}</span>`;
      companionEl.classList.remove('collection-companion--empty');
    } else {
      companionEl.innerHTML = '<p class="collection-companion--empty">尚未設定陪伴寵物</p>';
    }
  }

  const grid = document.getElementById('collection-grid');
  if (grid) {
    if (owned === 0 && (collectionFilter === 'all' || collectionFilter === 'unowned')) {
      grid.innerHTML = emptyStateHtml(
        '📖',
        '圖鑑還是空的',
        '完成任務獲得星塵後，就可以召喚第一隻夥伴。',
        '前往召喚',
        'empty-go-gacha'
      );
      lastCollectionGridKey = null;
    } else if (filtered.length === 0) {
      grid.innerHTML = emptyStateHtml('🔍', '沒有符合的寵物', '試試其他稀有度或獲得狀態篩選。');
      lastCollectionGridKey = null;
    } else {
      const gridKey = `${collectionFilter}|${filtered.map((p) => `${p.id}:${p.owned}:${p.fragments}:${p.stars}:${p.isCompanion}:${p.nickname || ''}`).join(',')}`;
      if (gridKey !== lastCollectionGridKey || !grid.querySelector('.collection-card')) {
        let ownedEagerCount = 0;
        grid.innerHTML = filtered
          .map((pet) => {
            const eager = pet.owned && ownedEagerCount < 12;
            if (eager) ownedEagerCount += 1;
            return renderCollectionCard(pet, { eager });
          })
          .join('');
        lastCollectionGridKey = gridKey;
        preloadOwnedPetImages(filtered.filter((p) => p.owned), [], 12).catch(() => {});
      }
    }
  }
}

function renderCollectionCard(pet, imageOptions = {}) {
  const { eager = false } = imageOptions;
  const owned = pet.owned;
  const rarityClass = `rarity-${pet.rarity}`;
  const imgOpts = owned
    ? { size: 'md', loading: eager ? 'eager' : 'lazy', eager }
    : { size: 'md', preview: true, loading: 'lazy' };
  return `
    <article class="collection-card ${owned ? '' : 'collection-card--locked'} ${rarityClass}" data-pet-id="${pet.id}">
      <button class="collection-card__tap" data-action="view-detail" aria-label="查看詳情">
        <div class="collection-card__image">
          ${petImageHtml(pet, imgOpts)}
        </div>
        <div class="collection-card__info">
          ${petNameBlockHtml(pet, { owned, heading: 'h3', className: 'collection-card__name' })}
          ${owned && pet.title ? `<p class="collection-card__title">${escapeHtml(pet.title)}</p>` : ''}
          <span class="badge badge--rarity ${rarityClass}">${pet.rarity}</span>
          ${
            owned
              ? `${renderStars(pet.stars)}<span class="fragments">碎片 ${pet.fragments}</span><span class="fragments">親密度 Lv.${pet.bondLevel || 1}</span>${pet.isCompanion ? '<span class="companion-badge">陪伴中</span>' : ''}`
              : '<span class="locked-label">未獲得 · 點擊預覽</span>'
          }
        </div>
      </button>
      ${
        owned && !pet.isCompanion
          ? `<button class="btn btn--sm btn--companion" data-action="set-companion">設為陪伴</button>`
          : ''
      }
      ${
        owned && pet.stars < 5
          ? `<button class="btn btn--sm btn--upgrade" data-action="upgrade">升星</button>`
          : ''
      }
    </article>`;
}

/** 圖鑑詳情彈窗 */
function openPetDetailModal(petId) {
  const pet = state.enrichedCollection.find((p) => p.id === petId);
  if (!pet) return;

  const owned = pet.owned;
  const rarityClass = `rarity-${pet.rarity}`;
  const bondLevel = pet.bondLevel ?? 0;

  let bondSection = '';
  if (owned && pet.bondUnlocks && Object.keys(pet.bondUnlocks).length > 0) {
    const levels = [2, 3, 4, 5];
    bondSection = `
      <section class="pet-detail__bond">
        <h3 class="pet-detail__subtitle">親密度解鎖</h3>
        <ul class="bond-unlock-list">
          ${levels
            .map((lv) => {
              const text = getBondUnlockText(pet, lv);
              if (!text) return '';
              const unlocked = bondLevel >= lv;
              return `<li class="bond-unlock ${unlocked ? 'bond-unlock--open' : ''}">
                <span class="bond-unlock__lv">Lv.${lv}</span>
                <span class="bond-unlock__text">${unlocked ? escapeHtml(text) : '???'}</span>
              </li>`;
            })
            .join('')}
        </ul>
      </section>`;
  }

  const personalityTags =
    pet.personality?.length > 0
      ? pet.personality.map((p) => `<span class="tag">${escapeHtml(p)}</span>`).join('')
      : '';

  const nicknameSection = owned
    ? `
      <section class="pet-detail__nickname card">
        <h3 class="pet-detail__subtitle">暱稱</h3>
        ${
          pet.nickname
            ? `<p class="pet-detail__display-name">${escapeHtml(petDisplayName(pet))}</p>
               <p class="pet-original-name">原名：${escapeHtml(petOriginalName(pet))}</p>`
            : `<p class="pet-detail__display-name">${escapeHtml(petOriginalName(pet))}</p>
               <p class="pet-detail__nickname-empty">尚未設定暱稱</p>`
        }
        <div class="pet-detail__nickname-actions">
          <button type="button" class="btn btn--secondary btn--sm" data-action="edit-nickname" data-pet-id="${pet.id}">${pet.nickname ? '修改暱稱' : '設定暱稱'}</button>
          ${pet.nickname ? `<button type="button" class="btn btn--ghost btn--sm" data-action="clear-nickname" data-pet-id="${pet.id}">清除暱稱</button>` : ''}
        </div>
      </section>`
    : '';

  openModal(`
    <div class="pet-detail ${rarityClass}">
      <div class="pet-detail__hero">
        ${owned ? petImageHtml(pet, { size: 'lg', loading: 'eager', eager: true }) : petImageHtml(pet, { size: 'lg', preview: true, loading: 'lazy' })}
      </div>
      <h2 class="pet-detail__name">${owned ? escapeHtml(petDisplayName(pet)) : '???'}</h2>
      ${owned && pet.nickname ? `<p class="pet-original-name pet-original-name--center">原名：${escapeHtml(petOriginalName(pet))}</p>` : ''}
      ${owned && !pet.nickname ? '<p class="pet-detail__nickname-empty pet-detail__nickname-empty--center">尚未設定暱稱</p>' : ''}
      ${owned && pet.title ? `<p class="pet-detail__title">${escapeHtml(pet.title)}</p>` : ''}
      <div class="pet-detail__badges">
        <span class="badge badge--rarity ${rarityClass}">${pet.rarity}</span>
        ${pet.element ? `<span class="badge badge--element">${escapeHtml(pet.element)}</span>` : ''}
      </div>
      ${personalityTags ? `<div class="pet-detail__tags">${personalityTags}</div>` : ''}
      ${owned ? renderStars(pet.stars) : ''}
      ${owned ? `<p class="pet-detail__bond-lv">親密度 Lv.${bondLevel || 1}</p>` : ''}
      <p class="pet-detail__desc">${escapeHtml(pet.description)}</p>
      ${owned && pet.lore ? `<p class="pet-detail__lore">${escapeHtml(pet.lore)}</p>` : ''}
      ${!owned ? '<p class="pet-detail__locked">召喚解鎖後，可閱讀完整背景與親密度故事。</p>' : ''}
      ${bondSection}
      ${nicknameSection}
      ${
        owned && !pet.isCompanion
          ? `<button class="btn btn--companion btn--block" data-action="set-companion-detail" data-pet-id="${pet.id}">設為陪伴</button>`
          : ''
      }
      ${owned && pet.isCompanion ? '<p class="companion-badge companion-badge--detail">目前陪伴中</p>' : ''}
    </div>
  `);

  document.querySelector('[data-action="set-companion-detail"]')?.addEventListener('click', async (e) => {
    const id = e.target.dataset.petId;
    if (id) {
      await setCompanion(id);
      closeModal();
      await onRefresh({ renderMode: ['collection', 'tasks'] });
      showToast('已設為陪伴寵物', 'success');
    }
  });

  document.querySelector('[data-action="edit-nickname"]')?.addEventListener('click', (e) => {
    const id = e.target.dataset.petId;
    if (id) openNicknameModal(id);
  });

  document.querySelector('[data-action="clear-nickname"]')?.addEventListener('click', async (e) => {
    const id = e.target.dataset.petId;
    if (!id) return;
    const result = await clearPetNickname(id);
    if (!result.success) {
      showToast(result.message || '暱稱儲存失敗，請稍後再試。', 'error');
      return;
    }
    closeModal();
    await onRefresh({ renderMode: ['collection'] });
    openPetDetailModal(id);
    showToast('暱稱已清除', 'success');
  });
}

/* ─── 探險頁 ─── */

function getOwnedPets() {
  return (state.enrichedCollection || []).filter((p) => p.owned);
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDuration(minutes) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h} 小時 ${m} 分` : `${h} 小時`;
  }
  return `${minutes} 分鐘`;
}

function renderExpeditionView() {
  if (!state) return;

  const { wallet, expeditionAreas, activeExpedition } = state;
  const ownedPets = getOwnedPets();
  const hasActive = !!activeExpedition;
  const isComplete = activeExpedition && isExpeditionTimeComplete(activeExpedition);

  // 冒險能量卡片
  const energyEl = document.getElementById('expedition-energy');
  const energy = wallet.adventureEnergy ?? 0;
  if (energyEl) {
    energyEl.classList.toggle('expedition-energy--low', energy === 0);
    energyEl.innerHTML = `
      <div class="expedition-energy__header">
        <span class="expedition-energy__icon">⚡</span>
        <div>
          <p class="expedition-energy__label">冒險能量</p>
          <p class="expedition-energy__value">${energy}</p>
        </div>
      </div>
      ${
        energy === 0
          ? `<p class="expedition-energy__warning"><strong>冒險能量不足</strong><br>完成有效任務可以獲得冒險能量。</p>`
          : '<p class="expedition-energy__hint">完成任務可以獲得冒險能量</p>'
      }`;
  }

  // 進行中探險
  const activeEl = document.getElementById('expedition-active');
  if (activeEl) {
    if (!activeExpedition) {
      activeEl.innerHTML = '';
      stopExpeditionStatusRotation();
    } else {
      const pet = state.enrichedCollection.find((p) => p.id === activeExpedition.petId);
      const area = expeditionAreas.find((a) => a.id === activeExpedition.areaId);
      const remaining = getRemainingMs(activeExpedition);
      const complete = isExpeditionTimeComplete(activeExpedition);

      activeEl.innerHTML = `
        <article class="expedition-active-card card expedition-active-card--area-${area?.id || 'mist_forest'} ${complete ? 'expedition-active-card--ready' : 'expedition-active-card--glow'}">
          <div class="expedition-active-card__fx" aria-hidden="true"></div>
          <span class="expedition-status-badge ${complete ? 'expedition-status-badge--ready' : 'expedition-status-badge--active'}">${complete ? '可領取' : '進行中'}</span>
          <h2 class="section-title">進行中探險</h2>
          <div class="expedition-active-card__body">
            <div class="expedition-active-card__pet">
              <div class="expedition-active-card__pet-img ${complete ? 'expedition-pet-img--complete' : 'expedition-pet-img--float'}">
                ${pet ? petImageHtml(pet, { size: 'md' }) : ''}
              </div>
              <div>
                <p class="expedition-active-card__name">${pet ? escapeHtml(petDisplayName(pet)) : '未知寵物'}</p>
                ${pet?.nickname ? `<p class="pet-original-name pet-original-name--sm">原名：${escapeHtml(petOriginalName(pet))}</p>` : ''}
                <p class="expedition-active-card__area">${area ? escapeHtml(area.name) : ''}</p>
                <p class="expedition-active-card__status-label">${complete ? '探索完成' : '探索日誌'}</p>
              </div>
            </div>
            ${
              complete
                ? `<p class="expedition-complete-msg">${EXPEDITION_COMPLETE_MSG}</p>
                   <button class="btn btn--primary btn--block expedition-claim-btn expedition-claim-btn--glow" data-action="claim-expedition" data-id="${activeExpedition.id}">領取獎勵</button>`
                : `<p class="expedition-status-log" id="expedition-status-log"></p>
                   <div class="expedition-countdown-row">
                     <span class="expedition-pulse-dot" aria-hidden="true"></span>
                     <p class="expedition-countdown" id="expedition-countdown">${formatRemainingTime(remaining)}</p>
                   </div>
                   <p class="expedition-countdown__label">剩餘時間</p>`
            }
          </div>
        </article>`;

      if (!complete && area?.id) {
        startExpeditionStatusRotation(area.id);
      } else {
        stopExpeditionStatusRotation();
      }
    }
  }

  // 探險地區
  const areasEl = document.getElementById('expedition-areas');
  if (areasEl) {
    areasEl.innerHTML = `
      <h2 class="section-title">探險地區</h2>
      <div class="expedition-area-list">
        ${expeditionAreas
          .map((area) => {
            const { unlocked, hint } = checkAreaUnlock(area, ownedPets);
            const selected = selectedExpeditionAreaId === area.id;
            const mat = area.rewards.material;
            const locked = !unlocked;
            const disabled = hasActive || locked;

            return `
              <article class="expedition-area-card card expedition-area-card--${area.id} ${locked ? 'expedition-area-card--locked' : ''} ${selected ? 'expedition-area-card--selected' : ''}" data-area-id="${area.id}">
                <div class="expedition-area-card__header">
                  <h3>${escapeHtml(area.name)}</h3>
                  ${locked ? '<span class="expedition-lock">🔒</span>' : ''}
                </div>
                <p class="expedition-area-card__desc">${escapeHtml(area.description)}</p>
                <div class="expedition-area-card__meta">
                  <span>⚡ ${area.energyCost}</span>
                  <span>⏱ ${formatDuration(area.durationMinutes)}</span>
                </div>
                <p class="expedition-area-card__rewards">
                  星塵 ${area.rewards.stardust.min}～${area.rewards.stardust.max}
                  · ${escapeHtml(getMaterialName(mat.id))} ${mat.min}～${mat.max}
                  · 親密度 +${area.rewards.bondExp}
                </p>
                ${locked ? `<p class="expedition-area-card__unlock">${escapeHtml(hint)}</p>` : ''}
                <button
                  class="btn btn--secondary btn--sm btn--block"
                  data-action="select-area"
                  data-area-id="${area.id}"
                  ${disabled ? 'disabled' : ''}
                >${selected ? '已選擇' : locked ? '未解鎖' : '選擇地區'}</button>
              </article>`;
          })
          .join('')}
      </div>`;
  }

  // 寵物選擇
  const petsEl = document.getElementById('expedition-pets');
  if (petsEl) {
    if (ownedPets.length === 0) {
      petsEl.innerHTML = `
        <h2 class="section-title">派遣寵物</h2>
        ${emptyStateHtml(
          '🗺️',
          '還沒有可以派遣的寵物',
          '先去召喚夥伴，再讓牠出發探險。',
          '前往召喚',
          'empty-go-gacha'
        )}`;
    } else {
      petsEl.innerHTML = `
        <h2 class="section-title">派遣寵物</h2>
        <div class="expedition-pet-grid">
          ${ownedPets
            .map((pet) => {
              const onExp = isPetOnExpedition(pet.id, activeExpedition);
              const selected = selectedExpeditionPetId === pet.id;
              const rarityClass = `rarity-${pet.rarity}`;
              return `
                <button
                  class="expedition-pet-card ${rarityClass} ${selected ? 'expedition-pet-card--selected' : ''} ${onExp ? 'expedition-pet-card--busy' : ''}"
                  data-action="select-pet"
                  data-pet-id="${pet.id}"
                  ${hasActive || onExp ? 'disabled' : ''}
                >
                  ${petImageHtml(pet, { size: 'sm' })}
                  <span class="expedition-pet-card__name">${escapeHtml(petDisplayName(pet))}</span>
                  ${pet.nickname ? `<span class="pet-original-name pet-original-name--xs">原名：${escapeHtml(petOriginalName(pet))}</span>` : ''}
                  <span class="badge badge--rarity ${rarityClass}">${pet.rarity}</span>
                  <span class="expedition-pet-card__bond">Lv.${pet.bondLevel || 1}</span>
                  ${onExp ? '<span class="expedition-pet-card__status">探險中</span>' : ''}
                </button>`;
            })
            .join('')}
        </div>
        ${
          !hasActive
            ? `<button
                class="btn btn--primary btn--block expedition-start-btn"
                data-action="start-expedition"
                ${!selectedExpeditionAreaId || !selectedExpeditionPetId ? 'disabled' : ''}
              >開始探險</button>
              ${
                !selectedExpeditionAreaId || !selectedExpeditionPetId
                  ? `<p class="expedition-start-hint" id="expedition-start-hint">${
                      !selectedExpeditionAreaId && !selectedExpeditionPetId
                        ? '請先選擇探險地區與派遣寵物'
                        : !selectedExpeditionAreaId
                          ? '請先選擇探險地區'
                          : '請先選擇派遣寵物'
                    }</p>`
                  : ''
              }`
            : ''
        }`;
    }
  }
}

function startExpeditionTimer() {
  stopExpeditionTimer();
  expeditionTimer = setInterval(() => {
    const active = state?.activeExpedition;
    if (!active) return;

    if (isExpeditionTimeComplete(active)) {
      renderExpeditionView();
      renderNavBadges();
      return;
    }

    const el = document.getElementById('expedition-countdown');
    if (el) {
      el.textContent = formatRemainingTime(getRemainingMs(active));
    }
  }, 1000);
}

function stopExpeditionTimer() {
  if (expeditionTimer) {
    clearInterval(expeditionTimer);
    expeditionTimer = null;
  }
}

function startExpeditionStatusRotation(areaId) {
  stopExpeditionStatusRotation();
  expeditionStatusIndex = -1;

  const setInitial = () => {
    const el = document.getElementById('expedition-status-log');
    if (!el) return;
    const { text, index } = pickStatusLine(areaId, expeditionStatusIndex);
    expeditionStatusIndex = index;
    el.textContent = text;
  };

  setInitial();

  const scheduleNext = () => {
    expeditionStatusTimer = setTimeout(() => {
      const active = state?.activeExpedition;
      if (!active || isExpeditionTimeComplete(active)) {
        stopExpeditionStatusRotation();
        return;
      }

      const el = document.getElementById('expedition-status-log');
      if (el) {
        const { text, index } = pickStatusLine(areaId, expeditionStatusIndex);
        expeditionStatusIndex = index;
        el.classList.add('expedition-status-log--changing');
        setTimeout(() => {
          el.textContent = text;
          el.classList.remove('expedition-status-log--changing');
        }, 200);
      }

      scheduleNext();
    }, randomStatusInterval());
  };

  scheduleNext();
}

function stopExpeditionStatusRotation() {
  if (expeditionStatusTimer) {
    clearTimeout(expeditionStatusTimer);
    expeditionStatusTimer = null;
  }
  expeditionStatusIndex = -1;
}

async function handleExpeditionClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;

  if (action === 'select-area') {
    const areaId = target.dataset.areaId;
    const area = state.expeditionAreas.find((a) => a.id === areaId);
    const { unlocked, hint } = checkAreaUnlock(area, getOwnedPets());
    if (state.activeExpedition) {
      showToast('已有探險進行中', 'warning');
      return;
    }
    if (!unlocked) {
      showToast(hint || '此地區尚未解鎖', 'warning');
      return;
    }
    selectedExpeditionAreaId = areaId;
    renderExpeditionView();
    return;
  }

  if (action === 'select-pet') {
    if (state.activeExpedition) {
      showToast('已有探險進行中', 'warning');
      return;
    }
    selectedExpeditionPetId = target.dataset.petId;
    renderExpeditionView();
    return;
  }

  if (action === 'start-expedition') {
    if (!selectedExpeditionAreaId || !selectedExpeditionPetId) {
      showToast('請先選擇探險地區與寵物', 'warning');
      return;
    }
    try {
      await startExpedition(
        selectedExpeditionPetId,
        selectedExpeditionAreaId,
        state.expeditionAreas,
        state.allPets
      );
      selectedExpeditionAreaId = null;
      selectedExpeditionPetId = null;
      await onRefresh({ renderMode: ['expedition', 'tasks'] });
      startExpeditionTimer();
      showToast('探險已開始！', 'success');
    } catch (err) {
      showToast(err.message || '無法開始探險', 'warning');
    }
    return;
  }

  if (action === 'claim-expedition') {
    const expId = target.dataset.id;
    try {
      const result = await claimExpeditionRewards(
        expId,
        state.expeditionAreas,
        state.allPets
      );
      await onRefresh({ renderMode: ['expedition', 'tasks'] });
      showExpeditionRewardModal(result);
      const matEntries = Object.entries(result.rewards.materials || {}).filter(([, amt]) => amt > 0);
      if (matEntries.length > 0) {
        const matText = matEntries.map(([id, amt]) => `${getMaterialName(id)} x${amt}`).join('、');
        showToast(`獲得 ${matText}`, 'success', 3200);
      } else {
        showToast('探險獎勵已領取', 'success', 2000);
      }
      await handleAchievementCheckAfterAction();
    } catch (err) {
      showToast(err.message || '領取失敗', 'error');
    }
  }
}

function showExpeditionRewardModal(result) {
  const { rewards, pet, bond } = result;
  const displayPet = state.enrichedCollection?.find((p) => p.id === pet.id) || pet;
  const matEntries = Object.entries(rewards.materials || {});
  const rarityPct = Math.round((rewards.rarityBonus || 0) * 100);
  const bondPct = Math.round((rewards.bondBonus || 0) * 100);

  openModal(`
    <div class="expedition-reward-modal expedition-reward-modal--animate">
      <h2 class="modal-title">探險歸來！</h2>
      <div class="expedition-reward-modal__pet">
        ${petImageHtml(displayPet, { size: 'md' })}
        <p>${escapeHtml(petDisplayName(displayPet))}</p>
        ${displayPet.nickname ? `<p class="pet-original-name pet-original-name--sm">原名：${escapeHtml(petOriginalName(displayPet))}</p>` : ''}
      </div>
      <ul class="expedition-reward-list">
        <li>✦ 星塵 <strong>+${rewards.stardust}</strong>
          ${rewards.bonusStardust > 0 ? `<span class="expedition-bonus">（基礎 ${rewards.baseStardust} + 加成 ${rewards.bonusStardust}）</span>` : ''}
        </li>
        ${matEntries.map(([id, amt]) => `<li>📦 ${escapeHtml(getMaterialName(id))} <strong>+${amt}</strong></li>`).join('')}
        <li>💜 親密度 <strong>+${rewards.bondExp}</strong></li>
        ${rewards.fragmentGained > 0 ? `<li>💫 寵物碎片 <strong>+${rewards.fragmentGained}</strong></li>` : ''}
      </ul>
      <p class="expedition-reward-modal__workshop-hint">可在工坊製作親密度道具。</p>
      ${
        rewards.bonusStardust > 0
          ? `<p class="expedition-bonus-detail">加成：稀有度 +${rarityPct}% · 親密度 Lv.${bond?.oldLevel ?? pet.bondLevel ?? 1} +${bondPct}%</p>`
          : ''
      }
      ${bond?.leveledUp ? `<p class="expedition-levelup">親密度提升至 Lv.${bond.newLevel}！</p>` : ''}
      <button class="btn btn--primary btn--block" id="expedition-reward-close">確認</button>
    </div>
  `);

  document.getElementById('expedition-reward-close')?.addEventListener('click', closeModal);
}

/* ─── 習慣頁 ─── */

function renderHabitsView() {
  const statsEl = document.getElementById('habit-stats');
  const contentEl = document.getElementById('habit-view-content');
  if (!statsEl || !contentEl) return;

  if (state.habitsLoadError) {
    statsEl.innerHTML = '';
    contentEl.innerHTML = errorStateHtml(
      '習慣資料暫時無法載入',
      '請重新整理或稍後再試。',
      '重新整理',
      'habit-retry'
    );
    document.getElementById('habit-retry')?.addEventListener('click', () => location.reload());
    return;
  }

  const habits = state.habits || [];
  const today = getTodayDateString();
  const stats = state.habitStats || getHabitPageStats(habits, today);
  const reduceMotion = state.userPreferences?.reduceMotion ?? false;

  statsEl.innerHTML = `
    <div class="habit-stat-card">
      <span class="habit-stat-card__label">今日完成</span>
      <span class="habit-stat-card__value">${stats.todayCompleted} / ${stats.todayTotal}</span>
    </div>
    <div class="habit-stat-card">
      <span class="habit-stat-card__label">本週完成率</span>
      <span class="habit-stat-card__value">${stats.weekCompletionRate}%</span>
    </div>
    <div class="habit-stat-card">
      <span class="habit-stat-card__label">最長連續</span>
      <span class="habit-stat-card__value habit-stat-card__value--streak">${stats.maxStreak}${stats.maxStreak > 0 ? ' 天' : ''}</span>
    </div>
    <div class="habit-stat-card">
      <span class="habit-stat-card__label">今日習慣星塵</span>
      <span class="habit-stat-card__value">${stats.todayStardust} / 30</span>
    </div>`;

  if (habits.length === 0) {
    contentEl.innerHTML = emptyStateHtml(
      '🔄',
      '還沒有建立習慣',
      '從一個很小的習慣開始，例如每天背 10 個單字或睡前整理明天任務。',
      '建立第一個習慣',
      'habit-create-first'
    );
    return;
  }

  const todayHabits = getTodayHabits(habits, today);
  const weeklyHabits = getWeeklyHabits(habits);
  const archived = getArchivedHabits(habits);
  const nearGoal = hasWeeklyNearGoal(habits, today);

  let html = '';

  if (stats.allTodayDone && stats.todayTotal > 0) {
    html += `
      <div class="habit-done-banner">
        <p class="habit-done-banner__title">今日習慣都完成了</p>
        <p class="habit-done-banner__desc">穩定的節奏會慢慢累積成成果。</p>
      </div>`;
  }

  html += renderHabitSection(
    '今日習慣',
    todayHabits,
    today,
    reduceMotion,
    false,
    nearGoal
  );

  if (weeklyHabits.length > 0) {
    html += renderHabitSection('本週習慣', weeklyHabits, today, reduceMotion, true, nearGoal);
  }

  if (archived.length > 0) {
    html += `
      <button type="button" class="habit-archived-toggle" data-action="toggle-archived-habits">
        <span>已封存習慣（${archived.length}）</span>
        <span>${archivedHabitsCollapsed ? '展開' : '收合'}</span>
      </button>`;
    if (!archivedHabitsCollapsed) {
      html += `<div class="habit-list">${archived.map((h) => renderHabitCard(h, today, reduceMotion, true)).join('')}</div>`;
    }
  }

  contentEl.innerHTML = html;
}

function renderHabitSection(title, habitList, today, reduceMotion, weeklyOnly, showNearHint) {
  if (!habitList.length) {
    return '';
  }

  const nearHint = showNearHint && weeklyOnly && hasWeeklyNearGoal(habitList, today)
    ? '<span class="notification-dot notification-dot--hint" aria-hidden="true"></span>'
    : '';

  return `
    <section class="habit-section page-section">
      <div class="habit-section__header">
        <h2 class="habit-section__title">${escapeHtml(title)} <span class="section-count">${habitList.length}</span></h2>
        ${nearHint ? `<span class="habit-section__hint">${nearHint}</span>` : ''}
      </div>
      <div class="habit-list">${habitList.map((h) => renderHabitCard(h, today, reduceMotion, false)).join('')}</div>
    </section>`;
}

function renderHabitCard(habit, today, reduceMotion, isArchived) {
  const category = getCategoryById(habit.categoryId, state.categories);
  const catColor = category?.color || 'gray';
  const streak = getHabitStreak(habit, today);
  const streakLabel = formatStreakLabel(habit, streak);
  const doneToday = isHabitCompletedToday(habit, today);
  const monday = getWeekMonday(today);
  const weekCount = getWeeklyCompletionCount(habit, monday);
  const weekTarget = habit.targetPerWeek ?? 1;
  const weekMet = habit.frequency === 'weekly' && isWeeklyGoalMet(habit, monday);

  const freqLabel =
    habit.frequency === 'weekly' ? `每週 ${weekTarget} 次` : '每日';

  const streakHtml =
    streak > 0
      ? `<span class="habit-card__streak">${!reduceMotion ? '<span class="habit-card__streak-glow" aria-hidden="true"></span>' : ''}${escapeHtml(streakLabel)}</span>`
      : '';

  let statusHtml = '';
  let actionsHtml = '';

  if (!isArchived) {
    if (habit.frequency === 'daily') {
      if (doneToday) {
        statusHtml = '<p class="habit-card__status">今日已完成</p>';
        actionsHtml = `<button type="button" class="btn btn--secondary btn--sm" data-action="habit-uncomplete">取消完成</button>`;
      } else {
        actionsHtml = `<button type="button" class="btn btn--primary btn--sm" data-action="habit-complete">完成今日</button>`;
      }
    } else {
      const progressHtml = `<span class="habit-card__progress">本週進度：${weekCount} / ${weekTarget}</span>`;
      statusHtml = weekMet
        ? '<p class="habit-card__status">本週已達標</p>'
        : progressHtml;
      if (!doneToday) {
        actionsHtml = `<button type="button" class="btn btn--primary btn--sm" data-action="habit-complete">記錄今日完成</button>`;
      } else {
        statusHtml = '<p class="habit-card__status">今日已記錄</p>';
        actionsHtml = `<button type="button" class="btn btn--secondary btn--sm" data-action="habit-uncomplete">取消今日</button>`;
      }
    }

    actionsHtml += `
      <button type="button" class="btn btn--ghost btn--sm" data-action="habit-edit">編輯</button>
      <button type="button" class="btn btn--ghost btn--sm" data-action="habit-archive">封存</button>`;
  }

  return `
    <article class="habit-card ${doneToday ? 'habit-card--done' : ''}" data-id="${escapeHtml(habit.id)}">
      <div class="habit-card__header">
        <h3 class="habit-card__name">${escapeHtml(habit.name)}</h3>
        ${streakHtml}
      </div>
      ${habit.description ? `<p class="habit-card__desc">${escapeHtml(habit.description)}</p>` : ''}
      <div class="habit-card__badges">
        <span class="badge badge--category badge--category-${catColor}">${formatCategoryLabel(category)}</span>
        <span class="badge badge--habit-freq">${freqLabel}</span>
      </div>
      <div class="habit-card__meta">
        ${habit.frequency === 'weekly' && !isArchived ? `<span>本週：${weekCount} / ${weekTarget}</span>` : ''}
      </div>
      ${statusHtml}
      ${!isArchived ? `<div class="habit-card__actions">${actionsHtml}</div>` : ''}
    </article>`;
}

function openHabitForm(habitId = null) {
  const isEdit = !!habitId;
  const habit = isEdit ? (state.habits || []).find((h) => h.id === habitId) : null;
  const categories = state.categories || [];

  const freq = habit?.frequency || 'daily';
  const target = habit?.targetPerWeek ?? 3;

  const categoryOptions = categories
    .map(
      (c) =>
        `<option value="${escapeHtml(c.id)}" ${habit?.categoryId === c.id || (!habit && c.id === 'general') ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
    )
    .join('');

  const targetOptions = [1, 2, 3, 4, 5, 6, 7]
    .map((n) => `<option value="${n}" ${target === n ? 'selected' : ''}>每週 ${n} 次</option>`)
    .join('');

  openModal(`
    <h2 class="modal-title">${isEdit ? '編輯習慣' : '新增習慣'}</h2>
    <form id="habit-form" class="form task-form">
      <label class="form-label" for="habit-name">習慣名稱</label>
      <input class="form-input" id="habit-name" type="text" maxlength="80" value="${escapeHtml(habit?.name || '')}" required placeholder="例如：每天背單字" />

      <label class="form-label" for="habit-desc">習慣說明</label>
      <textarea class="form-textarea" id="habit-desc" rows="2" placeholder="可選填">${escapeHtml(habit?.description || '')}</textarea>

      <label class="form-label" for="habit-category">分類</label>
      <select class="form-select" id="habit-category">${categoryOptions}</select>

      <label class="form-label" for="habit-frequency">頻率</label>
      <select class="form-select" id="habit-frequency">
        <option value="daily" ${freq === 'daily' ? 'selected' : ''}>每日</option>
        <option value="weekly" ${freq === 'weekly' ? 'selected' : ''}>每週</option>
      </select>

      <div id="habit-target-wrap" ${freq === 'weekly' ? '' : 'hidden'}>
        <label class="form-label" for="habit-target">每週目標</label>
        <select class="form-select" id="habit-target">${targetOptions}</select>
      </div>

      <p id="habit-form-error" class="form-error" hidden></p>

      <div class="form-actions">
        <button type="button" class="btn btn--ghost" id="habit-form-cancel">取消</button>
        <button type="submit" class="btn btn--primary">${isEdit ? '儲存' : '建立'}</button>
      </div>
    </form>
  `);

  const freqSelect = document.getElementById('habit-frequency');
  const targetWrap = document.getElementById('habit-target-wrap');
  freqSelect?.addEventListener('change', () => {
    if (targetWrap) targetWrap.hidden = freqSelect.value !== 'weekly';
  });

  document.getElementById('habit-form-cancel')?.addEventListener('click', closeModal);

  document.getElementById('habit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('habit-form-error');
    const name = document.getElementById('habit-name')?.value?.trim();
    const description = document.getElementById('habit-desc')?.value?.trim();
    const categoryId = document.getElementById('habit-category')?.value;
    const frequency = document.getElementById('habit-frequency')?.value;
    const targetPerWeek = document.getElementById('habit-target')?.value;

    const payload = { name, description, categoryId, frequency, targetPerWeek: Number(targetPerWeek) };
    const result = isEdit
      ? await updateHabit(habitId, payload)
      : await createHabit(payload);

    if (result.success) {
      closeModal();
      await onRefresh();
      renderHabitsView();
      showToast(isEdit ? '習慣已更新' : '習慣已建立', 'success');
      await handleAchievementCheckAfterAction();
    } else {
      if (errEl) {
        errEl.textContent = result.error || '儲存失敗';
        errEl.hidden = false;
      } else {
        showToast(result.error || '儲存失敗', 'error');
      }
    }
  });
}

/* ─── 更多 / 成就頁 ─── */

function renderWorkshopView() {
  if (!state) return;

  const summaryEl = document.getElementById('workshop-summary');
  const contentEl = document.getElementById('workshop-content');
  if (!summaryEl || !contentEl) return;

  const wallet = state.wallet || {};
  const inventory = state.inventory || { items: {}, itemUsageLogs: {} };
  const materialsCatalog = state.materialsCatalog || [];
  const craftables = state.craftablesCatalog || getEnabledCraftables();
  const materialCounts = getMaterialInventory(wallet);
  const itemCounts = getItemInventory(inventory);

  const knownMaterialIds = new Set(materialsCatalog.map((m) => m.id));
  const extraMaterialIds = Object.keys(materialCounts).filter((id) => !knownMaterialIds.has(id));
  const allMaterialEntries = [
    ...materialsCatalog.map((m) => ({ ...m, amount: materialCounts[m.id] || 0 })),
    ...extraMaterialIds.map((id) => ({
      ...getMaterialInfo(id),
      amount: materialCounts[id] || 0,
    })),
  ];

  const totalMaterials = allMaterialEntries.reduce((sum, m) => sum + (m.amount || 0), 0);
  const bondItems = craftables.filter(
    (c) => c.type === 'bond_item' || c.type === 'favorite_bond_item'
  );
  const totalItems = bondItems.reduce((sum, c) => sum + (itemCounts[c.id] || 0), 0);

  summaryEl.innerHTML = `
    <div class="workshop-summary__grid">
      <div class="workshop-summary__stat">
        <span class="workshop-summary__label">材料總數</span>
        <span class="workshop-summary__value">${totalMaterials}</span>
      </div>
      <div class="workshop-summary__stat">
        <span class="workshop-summary__label">道具庫存</span>
        <span class="workshop-summary__value">${totalItems}</span>
      </div>
    </div>
    <p class="workshop-summary__hint">使用探險取得的材料製作禮物，提升寵物親密度。</p>`;

  if (workshopTab === 'materials') {
    if (allMaterialEntries.length === 0) {
      contentEl.innerHTML = emptyStateHtml(
        '目前還沒有材料',
        '派遣寵物探險，可以帶回製作禮物的材料。'
      );
      return;
    }

    contentEl.innerHTML = `
      <div class="workshop-material-list">
        ${allMaterialEntries
          .map((mat) => {
            const tags = getFutureTagLabels(mat.futureTags || []).slice(0, 3);
            const empty = (mat.amount || 0) === 0;
            return `
              <article class="workshop-material-card card ${empty ? 'workshop-material-card--empty' : ''}">
                <div class="workshop-material-card__header">
                  <h3>${escapeHtml(mat.name)}</h3>
                  <span class="rarity-badge rarity-badge--${(mat.rarity || 'n').toLowerCase()}">${escapeHtml(mat.rarity || '?')}</span>
                </div>
                <p class="workshop-material-card__qty">數量：<strong>${mat.amount || 0}</strong></p>
                <p class="workshop-material-card__desc">${escapeHtml(mat.description || '')}</p>
                ${mat.sourceArea ? `<p class="workshop-material-card__source">來源：${escapeHtml(mat.sourceArea)}</p>` : ''}
                ${tags.length ? `<div class="workshop-tag-row">${tags.map((t) => `<span class="workshop-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
              </article>`;
          })
          .join('')}
      </div>`;
    return;
  }

  if (workshopTab === 'craft') {
    const enabled = craftables.filter((c) => c.enabled);
    if (enabled.length === 0) {
      contentEl.innerHTML = emptyStateHtml(
        '目前沒有可製作的道具',
        '等取得更多材料後再回來看看。'
      );
      return;
    }

    contentEl.innerHTML = `
      <div class="workshop-craft-list">
        ${enabled
          .map((craftable) => {
            const preview = getCraftingPreview(craftable.id, 1, wallet);
            const maxQty = preview.maxQuantity;
            const enough = preview.canCraft;
            const favoriteHint =
              craftable.type === 'favorite_bond_item'
                ? `<p class="workshop-craft-card__favorite">喜歡的寵物可獲得 +${craftable.effect?.favoriteBonusBondExp ?? craftable.effect?.bondExp ?? 0}</p>`
                : '';

            return `
              <article class="workshop-craft-card card ${enough ? '' : 'workshop-craft-card--disabled'}">
                <div class="workshop-craft-card__header">
                  <h3>${escapeHtml(craftable.name)}</h3>
                  <span class="rarity-badge rarity-badge--${(craftable.rarity || 'n').toLowerCase()}">${escapeHtml(craftable.rarity || '?')}</span>
                </div>
                <p class="workshop-craft-card__effect">${escapeHtml(formatItemEffect(craftable))}</p>
                ${favoriteHint}
                <ul class="workshop-recipe-list">
                  ${preview.materials
                    .map(
                      (m) =>
                        `<li class="${m.enough ? '' : 'workshop-recipe-list__item--missing'}">${escapeHtml(m.name)} <span>${m.have} / ${m.need}</span></li>`
                    )
                    .join('')}
                </ul>
                <div class="workshop-craft-card__actions">
                  <button class="btn btn--primary btn--sm" data-action="craft-item" data-item-id="${craftable.id}" data-qty="1" ${enough ? '' : 'disabled'}>製作 x1</button>
                  ${maxQty >= 5 ? `<button class="btn btn--secondary btn--sm" data-action="craft-item" data-item-id="${craftable.id}" data-qty="5" ${maxQty >= 5 ? '' : 'disabled'}>x5</button>` : ''}
                  ${maxQty > 1 ? `<button class="btn btn--secondary btn--sm" data-action="craft-item" data-item-id="${craftable.id}" data-qty="${maxQty}" ${enough ? '' : 'disabled'}>最大 (${maxQty})</button>` : ''}
                </div>
              </article>`;
          })
          .join('')}
      </div>`;
    return;
  }

  // gift tab
  const ownedPets = (state.enrichedCollection || []).filter((p) => p.owned);
  const availableItems = bondItems.filter((c) => (itemCounts[c.id] || 0) > 0);

  if (ownedPets.length === 0) {
    contentEl.innerHTML = emptyStateHtml(
      '還沒有可以贈送的寵物',
      '先透過召喚獲得第一位夥伴。'
    );
    return;
  }

  if (availableItems.length === 0) {
    contentEl.innerHTML = emptyStateHtml(
      '目前沒有可贈送的道具',
      '先到製作頁使用探險材料製作親密度道具。'
    );
    return;
  }

  if (!selectedGiftPetId || !ownedPets.some((p) => p.id === selectedGiftPetId)) {
    selectedGiftPetId = ownedPets[0].id;
  }
  if (!selectedGiftItemId || !availableItems.some((c) => c.id === selectedGiftItemId)) {
    selectedGiftItemId = availableItems[0].id;
  }

  const selectedPet = ownedPets.find((p) => p.id === selectedGiftPetId);
  const selectedItem = getCraftableInfo(selectedGiftItemId);
  const today = getTodayDateString();
  const dailyUsed = getDailyBondItemUsage(selectedGiftPetId, today, inventory);
  const bonus = getFavoriteBonus(selectedItem, selectedPet);
  const bondProgress = getBondProgress(selectedPet.bondExp ?? 0, selectedPet.bondLevel ?? 1);
  const previewExp = (selectedPet.bondExp ?? 0) + bonus.bondExp;
  const previewLevel = previewExp >= 500 ? 5 : previewExp >= 300 ? 4 : previewExp >= 150 ? 3 : previewExp >= 50 ? 2 : 1;
  const willLevelUp = previewLevel > (selectedPet.bondLevel ?? 1);
  const atDailyLimit = dailyUsed >= DAILY_BOND_ITEM_LIMIT;
  const itemStock = itemCounts[selectedGiftItemId] || 0;

  contentEl.innerHTML = `
    <div class="workshop-gift-layout">
      <section class="workshop-gift-section card">
        <h2 class="section-title">選擇夥伴</h2>
        <div class="workshop-gift-pet-list">
          ${ownedPets
            .map((pet) => {
              const used = getDailyBondItemUsage(pet.id, today, inventory);
              const selected = pet.id === selectedGiftPetId;
              return `
                <button type="button" class="workshop-gift-pet ${selected ? 'workshop-gift-pet--selected' : ''}" data-action="select-gift-pet" data-pet-id="${pet.id}">
                  <div class="workshop-gift-pet__img">${petImageHtml(pet, { size: 'sm' })}</div>
                  <div class="workshop-gift-pet__info">
                    <span class="workshop-gift-pet__name">${escapeHtml(petDisplayName(pet))}</span>
                    ${pet.nickname ? `<span class="pet-original-name pet-original-name--xs">原名：${escapeHtml(petOriginalName(pet))}</span>` : ''}
                    <span class="workshop-gift-pet__meta">Lv.${pet.bondLevel ?? 1} · 今日 ${used}/${DAILY_BOND_ITEM_LIMIT}</span>
                    ${pet.isCompanion ? '<span class="workshop-gift-pet__companion">陪伴中</span>' : ''}
                  </div>
                </button>`;
            })
            .join('')}
        </div>
      </section>

      <section class="workshop-gift-section card">
        <h2 class="section-title">選擇道具</h2>
        <div class="workshop-gift-item-list">
          ${availableItems
            .map((item) => {
              const selected = item.id === selectedGiftItemId;
              const stock = itemCounts[item.id] || 0;
              return `
                <button type="button" class="workshop-gift-item ${selected ? 'workshop-gift-item--selected' : ''}" data-action="select-gift-item" data-item-id="${item.id}">
                  <span class="workshop-gift-item__name">${escapeHtml(item.name)}</span>
                  <span class="workshop-gift-item__stock">x${stock}</span>
                  <span class="workshop-gift-item__effect">${escapeHtml(formatItemEffect(item))}</span>
                </button>`;
            })
            .join('')}
        </div>
      </section>

      <section class="workshop-gift-preview card ${bonus.isFavorite ? 'workshop-gift-preview--favorite' : ''}">
        <h2 class="section-title">贈送預覽</h2>
        <ul class="workshop-gift-preview__list">
          <li>目前親密度：Lv.${selectedPet.bondLevel ?? 1}（${bondProgress.current}/${bondProgress.max || 'MAX'}）</li>
          <li>使用後增加：+${bonus.bondExp}${bonus.isFavorite ? '（喜好加成）' : ''}</li>
          <li>今日已使用：${dailyUsed} / ${DAILY_BOND_ITEM_LIMIT}</li>
          ${willLevelUp ? `<li class="workshop-gift-preview__levelup">預計升級至 Lv.${previewLevel}</li>` : ''}
        </ul>
        <button class="btn btn--primary btn--block" data-action="gift-item" data-item-id="${selectedGiftItemId}" data-pet-id="${selectedGiftPetId}" ${atDailyLimit || itemStock <= 0 ? 'disabled' : ''}>贈送</button>
        ${atDailyLimit ? '<p class="workshop-gift-preview__limit">今天這隻寵物已經收到足夠多禮物了，明天再來吧。</p>' : ''}
      </section>
    </div>`;
}

async function handleWorkshopClick(e) {
  const backBtn = e.target.closest('[data-goto]');
  if (backBtn) {
    switchView(backBtn.dataset.goto);
    return;
  }

  const target = e.target.closest('[data-action]');
  if (!target || !state) return;

  const action = target.dataset.action;

  if (action === 'select-gift-pet') {
    selectedGiftPetId = target.dataset.petId;
    renderWorkshopView();
    return;
  }

  if (action === 'select-gift-item') {
    selectedGiftItemId = target.dataset.itemId;
    renderWorkshopView();
    return;
  }

  if (action === 'craft-item') {
    const itemId = target.dataset.itemId;
    const qty = parseInt(target.dataset.qty, 10) || 1;
    if (target.disabled) {
      showToast('材料不足，無法製作。', 'warning');
      return;
    }
    try {
      const result = await craftItem(itemId, qty);
      if (!result.success) {
        showToast(result.message, 'warning');
        return;
      }
      await onRefresh({ renderMode: ['workshop', 'tasks'] });
      renderWorkshopView();
      showToast(result.message, 'success');
      const card = target.closest('.workshop-craft-card');
      if (card && !state.userPreferences?.reduceMotion) {
        card.classList.add('workshop-craft-card--success');
        setTimeout(() => card.classList.remove('workshop-craft-card--success'), 800);
      }
      await handleAchievementCheckAfterAction();
    } catch (err) {
      showToast(err.message || '製作失敗', 'error');
    }
    return;
  }

  if (action === 'gift-item') {
    const itemId = target.dataset.itemId;
    const petId = target.dataset.petId;
    if (target.disabled) return;
    try {
      const result = await useBondItem(itemId, petId, state.allPets);
      if (!result.success) {
        showToast(result.message, 'warning');
        return;
      }
      await onRefresh({ renderMode: ['workshop', 'tasks', 'collection'] });
      renderWorkshopView();
      if (result.isFavorite) {
        showToast(`牠很喜歡這份禮物！親密度 +${result.bondExp}`, 'success', 3200);
      } else {
        showToast(`親密度提升 +${result.bondExp}`, 'success');
      }
      if (result.leveledUp) {
        setTimeout(() => showToast(`親密度提升到 Lv.${result.newLevel}`, 'success', 2800), 400);
      }
      const petCard = document.querySelector(`.workshop-gift-pet[data-pet-id="${petId}"]`);
      if (petCard && !state.userPreferences?.reduceMotion) {
        petCard.classList.add('workshop-gift-pet--bounce');
        setTimeout(() => petCard.classList.remove('workshop-gift-pet--bounce'), 600);
      }
      await handleAchievementCheckAfterAction();
    } catch (err) {
      showToast(err.message || '贈送失敗', 'error');
    }
  }
}

function renderMoreView() {
  renderVersionInfo();

  const summary = state?.achievementSummary;
  const badge = document.getElementById('more-achievements-badge');
  if (badge) {
    const show = (summary?.claimable ?? 0) > 0 || summary?.hasUnseenTitles;
    badge.hidden = !show;
  }

  const dailyBadge = document.getElementById('more-daily-blessing-badge');
  if (dailyBadge) {
    const daily = state.dailyCheckIn;
    const today = getTodayDateString();
    const pending = daily
      ? !hasCheckedInToday(daily, today) || !hasSpunWheelToday(daily, today)
      : true;
    dailyBadge.hidden = !pending;
  }

  const habitsBadge = document.getElementById('more-habits-badge');
  if (habitsBadge) {
    const habitIncomplete = state.habitStats?.hasIncompleteToday ?? false;
    const habitNearGoal = hasWeeklyNearGoal(state.habits || []);
    habitsBadge.hidden = !(habitIncomplete || habitNearGoal);
  }
}

function bindAchievementClaimAll() {
  document.getElementById('achievement-summary')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="claim-all-achievements"]');
    if (!btn || btn.disabled) return;
    e.preventDefault();
    handleClaimAllAchievements();
  });
}

async function handleClaimAllAchievements() {
  const btn = document.querySelector('[data-action="claim-all-achievements"]');
  if (btn?.disabled) return;
  if (btn) btn.disabled = true;

  try {
    const result = await claimAllAchievementRewards(state?.allPets || []);
    if (!result.success) {
      showToast(
        result.error || '領取失敗',
        result.error === '目前沒有可領取的成就' ? 'info' : 'error'
      );
      state.achievementSummary = await getAchievementSummary(state?.allPets || []);
      renderAchievementsView();
      return;
    }

    await onRefresh({ renderMode: ['achievements', 'tasks'] });

    const rewards = result.rewards || {};
    const materialText = formatAchievementReward(rewards);
    const hasWalletReward = (rewards.stardust || 0) > 0 || (rewards.adventureEnergy || 0) > 0;

    if (hasWalletReward) {
      showRewardToast(rewards.stardust || 0, rewards.adventureEnergy || 0);
    }

    const detail = materialText && materialText !== '無' && !hasWalletReward
      ? `：${materialText}`
      : materialText && materialText !== '無' && hasWalletReward
        ? `（另含 ${materialText}）`
        : '';

    showToast(`已一次領取 ${result.count} 個成就獎勵${detail}`, 'success', 3500);

    state.achievementSummary = await getAchievementSummary(state?.allPets || []);
    renderAchievementsView();
    renderNavBadges();
  } catch (err) {
    showToast(err.message || '領取失敗', 'error');
    if (btn) btn.disabled = false;
  }
}

async function refreshAchievementsView() {
  if (!state) return;
  if (onAchievementCheck) {
    await onAchievementCheck();
  }
  state.achievementSummary = await getAchievementSummary(state.allPets || []);
  renderAchievementsView();
  renderNavBadges();
}

function renderAchievementsView() {
  const summary = state.achievementSummary;
  const summaryEl = document.getElementById('achievement-summary');
  const titleBarEl = document.getElementById('achievement-title-bar');
  const listEl = document.getElementById('achievement-list');

  document.querySelectorAll('#achievement-filters .filter-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.achFilter === achievementFilter);
  });

  if (!summary?.catalogLoaded) {
    if (summaryEl) {
      summaryEl.innerHTML = errorStateHtml(
        '成就資料無法載入',
        '請確認網路連線後重新整理，或稍後再試。',
        '重新整理',
        'achievement-retry'
      );
      document.getElementById('achievement-retry')?.addEventListener('click', () => location.reload());
    }
    if (titleBarEl) titleBarEl.innerHTML = '';
    if (listEl) listEl.innerHTML = '';
    return;
  }

  if (summaryEl) {
    const claimAllBtn = summary.claimable > 0
      ? `<div class="achievement-summary__actions">
          <button type="button" class="btn btn--primary btn--block btn--claim-all" data-action="claim-all-achievements">
            一次領取全部獎勵（${summary.claimable}）
          </button>
        </div>`
      : '';

    summaryEl.innerHTML = `
      <div class="achievement-summary__stats">
        <div class="achievement-summary__stat">
          <span class="achievement-summary__label">已解鎖</span>
          <span class="achievement-summary__value">${summary.unlocked} / ${summary.total}</span>
        </div>
        <div class="achievement-summary__stat">
          <span class="achievement-summary__label">完成率</span>
          <span class="achievement-summary__value">${summary.completionRate}%</span>
        </div>
        <div class="achievement-summary__stat">
          <span class="achievement-summary__label">可領取</span>
          <span class="achievement-summary__value achievement-summary__value--claimable">${summary.claimable}</span>
        </div>
      </div>
      <div class="achievement-summary__progress">
        <div class="progress-bar">
          <div class="progress-bar__fill progress-bar__fill--achievement" style="width:${summary.completionRate}%"></div>
        </div>
      </div>
      ${claimAllBtn}`;
  }

  const currentTitle = summary.equippedTitle?.name || '尚未設定稱號';
  const titleValueClass = summary.equippedTitle
    ? 'achievement-title-bar__value'
    : 'achievement-title-bar__value achievement-title-bar__value--empty';
  if (titleBarEl) {
    titleBarEl.innerHTML = `
      <div class="achievement-title-bar__row">
        <div>
          <p class="achievement-title-bar__label">目前稱號</p>
          <p class="${titleValueClass}">${escapeHtml(currentTitle)}</p>
        </div>
        <button class="btn btn--secondary btn--sm" data-action="open-titles" type="button">稱號管理</button>
      </div>`;
  }

  let items = summary.items || [];

  if (achievementFilter === 'done') {
    items = items.filter((i) => i.status === 'claimed');
  } else if (achievementFilter === 'pending') {
    items = items.filter((i) => i.status === 'locked');
  } else if (achievementFilter === 'claimable') {
    items = items.filter((i) => i.status === 'claimable');
  } else if (achievementFilter !== 'all') {
    items = items.filter((i) => i.achievement.category === achievementFilter);
  }

  if (listEl) {
    if (items.length === 0) {
      listEl.innerHTML = emptyStateHtml('🏅', '沒有符合的成就', '試試其他分類篩選。');
    } else {
      listEl.innerHTML = items.map(renderAchievementCard).join('');
    }
  }
}

function renderAchievementCard(item) {
  const { achievement, progress, target, percent, status } = item;
  const cat = achievement.category;
  const icon = CATEGORY_ICONS[cat] || '🏅';
  const catLabel = CATEGORY_LABELS[cat] || cat;
  const rewardText = formatAchievementReward(achievement.reward);
  const titleText = achievement.titleReward
    ? `稱號：${achievement.titleReward}`
    : '';

  let statusHtml = '';
  if (status === 'claimed') {
    statusHtml = '<span class="achievement-card__status achievement-card__status--done">已完成</span>';
  } else if (status === 'claimable') {
    statusHtml = `<button class="btn btn--primary btn--sm achievement-card__claim" data-action="claim-achievement" data-id="${achievement.id}" type="button">領取獎勵</button>`;
  } else {
    statusHtml = '<span class="achievement-card__status achievement-card__status--locked">未完成</span>';
  }

  return `
    <article class="achievement-card card achievement-card--${status}">
      <div class="achievement-card__header">
        <span class="achievement-card__icon">${icon}</span>
        <div class="achievement-card__titles">
          <h3 class="achievement-card__name">${escapeHtml(achievement.name)}</h3>
          <span class="achievement-card__category">${catLabel}</span>
        </div>
      </div>
      <p class="achievement-card__desc">${escapeHtml(achievement.description)}</p>
      <div class="achievement-card__progress">
        <div class="achievement-card__progress-label">
          <span>進度</span>
          <span>${Math.min(progress, target)} / ${target}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width:${percent}%"></div>
        </div>
      </div>
      <div class="achievement-card__rewards">
        <p><span class="achievement-card__reward-label">獎勵</span> ${escapeHtml(rewardText)}</p>
        ${titleText ? `<p><span class="achievement-card__reward-label">稱號</span> ${escapeHtml(titleText)}</p>` : ''}
      </div>
      <div class="achievement-card__footer">${statusHtml}</div>
    </article>`;
}

function openTitleManagementModal() {
  const summary = state.achievementSummary;
  if (!summary?.titlesLoaded) {
    showToast('稱號資料暫時無法載入', 'error');
    return;
  }

  const titles = summary.titles || [];
  const unlocked = new Set(summary.state?.unlockedTitleIds || []);
  const equipped = summary.state?.equippedTitleId;

  const listHtml = titles.map((t) => {
    const isUnlocked = unlocked.has(t.id);
    const isEquipped = equipped === t.id;
    return `
      <div class="title-item ${isUnlocked ? '' : 'title-item--locked'} ${isEquipped ? 'title-item--equipped' : ''}">
        <div class="title-item__info">
          <span class="title-item__name">${isUnlocked ? escapeHtml(t.name) : '？？？'}</span>
          ${isEquipped ? '<span class="title-item__badge">使用中</span>' : ''}
        </div>
        ${
          isUnlocked
            ? `<button class="btn btn--secondary btn--sm" data-title-id="${t.id}" type="button">${isEquipped ? '已裝備' : '裝備'}</button>`
            : '<span class="title-item__lock">🔒</span>'
        }
      </div>`;
  }).join('');

  openModal(`
    <div class="title-modal">
      <h2 class="modal-title">稱號管理</h2>
      <p class="title-modal__desc">稱號僅供展示，不影響遊戲數值。</p>
      <div class="title-list">${listHtml}</div>
      <button class="btn btn--ghost btn--block" id="btn-clear-title" type="button">清除稱號</button>
    </div>
  `);

  document.querySelectorAll('.title-item .btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const titleId = btn.dataset.titleId;
      if (!titleId || btn.textContent === '已裝備') return;
      const result = await equipTitle(titleId);
      if (result.success) {
        await onRefresh({ renderMode: ['achievements', 'collection', 'tasks'] });
        closeModal();
        showToast(`已設定稱號：${result.title.name}`, 'success');
      } else {
        showToast(result.error || '設定失敗', 'error');
      }
    });
  });

  document.getElementById('btn-clear-title')?.addEventListener('click', async () => {
    await equipTitle(null);
    await onRefresh({ renderMode: ['achievements', 'collection', 'tasks'] });
    closeModal();
    showToast('已清除稱號', 'info');
  });
}

async function handleAchievementCheckAfterAction() {
  if (!onAchievementCheck) return;
  const result = await onAchievementCheck();
  if (result.newlyUnlocked.length > 0) {
    showAchievementUnlockNotifications(result);
    if (isModalOpen()) {
      await onRefresh();
      return;
    }
    const viewName = getCurrentViewName();
    const modes = viewName === 'tasks' ? ['tasks'] : [viewName, 'tasks'];
    await onRefresh({ renderMode: modes });
  }
}

function showAchievementUnlockNotifications(result) {
  const reduceMotion = state?.userPreferences?.reduceMotion ?? false;
  const { newlyUnlocked, newTitles } = result;

  if (newlyUnlocked.length >= 2) {
    showToast(
      `解鎖 ${newlyUnlocked.length} 個新成就，前往成就頁領取獎勵。`,
      'success',
      3500
    );
    return;
  }

  const ach = newlyUnlocked[0];
  if (!ach) return;

  if (reduceMotion) {
    const title = newTitles[0];
    const msg = title
      ? `成就解鎖：${ach.name}（稱號：${title.name}）`
      : `成就解鎖：${ach.name}`;
    showToast(msg, 'success', 3500);
    return;
  }

  showToast(`成就解鎖：${ach.name}`, 'success', 3000);
  if (newTitles[0]) {
    setTimeout(() => {
      showToast(`你獲得了稱號：${newTitles[0].name}`, 'success', 3000);
    }, 800);
  }
}

/* ─── 設定頁 ─── */

function formatBackupDateTime(isoString) {
  if (!isoString) return '無資料';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '無資料';
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resetImportUI() {
  pendingImportBackup = null;
  pendingImportFileName = '';
  pendingImportWarnings = [];

  const fileInput = document.getElementById('import-file-input');
  if (fileInput) fileInput.value = '';

  setImportElementHidden('import-idle-hint', false);
  setImportElementHidden('import-loading-hint', true);
  setImportElementHidden('import-error-hint', true);
  setImportElementHidden('import-preview', true);
  setImportElementHidden('import-restoring-hint', true);
  setImportElementHidden('import-success-panel', true);
  setImportElementHidden('btn-import-select', false);

  const errorEl = document.getElementById('import-error-hint');
  if (errorEl) errorEl.textContent = '';

  const warningEl = document.getElementById('import-preview-warning');
  if (warningEl) {
    warningEl.textContent = '';
    warningEl.hidden = true;
  }
}

function setImportElementHidden(id, hidden) {
  const el = document.getElementById(id);
  if (el) el.hidden = hidden;
}

function renderImportPreview(preview, warnings = []) {
  setText('import-preview-filename', preview.fileName);
  setText('import-preview-version', preview.appVersion);
  setText('import-preview-exported-at', formatBackupDateTime(preview.exportedAt));
  setText('import-preview-tasks', preview.taskCount);
  setText('import-preview-completed-tasks', preview.completedTaskCount);
  setText('import-preview-habits', preview.habitCount);
  setText('import-preview-collection', preview.collectionCount);
  setText(
    'import-preview-total-pets',
    preview.totalPets != null ? String(preview.totalPets) : '無資料'
  );
  setText('import-preview-stardust', preview.stardust);
  setText('import-preview-energy', preview.adventureEnergy);
  setText('import-preview-expeditions', preview.expeditionCount);
  setText('import-preview-achievements', preview.unlockedAchievementCount);
  setText('import-preview-titles', preview.unlockedTitleCount);

  const warningEl = document.getElementById('import-preview-warning');
  if (warningEl) {
    if (warnings.length > 0) {
      warningEl.textContent = warnings.join(' ');
      warningEl.hidden = false;
    } else {
      warningEl.textContent = '';
      warningEl.hidden = true;
    }
  }

  setImportElementHidden('import-idle-hint', true);
  setImportElementHidden('import-loading-hint', true);
  setImportElementHidden('import-error-hint', true);
  setImportElementHidden('import-preview', false);
  setImportElementHidden('import-restoring-hint', true);
  setImportElementHidden('import-success-panel', true);
  setImportElementHidden('btn-import-select', false);
}

function showImportError(message) {
  const errorEl = document.getElementById('import-error-hint');
  if (errorEl) errorEl.textContent = message;

  setImportElementHidden('import-idle-hint', true);
  setImportElementHidden('import-loading-hint', true);
  setImportElementHidden('import-error-hint', false);
  setImportElementHidden('import-preview', true);
  setImportElementHidden('import-restoring-hint', true);
  setImportElementHidden('import-success-panel', true);
  setImportElementHidden('btn-import-select', false);
}

async function handleImportFileSelect(file) {
  if (!file) return;

  setImportElementHidden('import-idle-hint', true);
  setImportElementHidden('import-loading-hint', false);
  setImportElementHidden('import-error-hint', true);
  setImportElementHidden('import-preview', true);
  setImportElementHidden('import-success-panel', true);

  try {
    const rawBackup = await readBackupFile(file);
    const validation = validateBackup(rawBackup);

    if (!validation.valid) {
      showImportError(validation.error || '這不是有效的 QuestNote 備份檔。');
      showToast(validation.error || '這不是有效的 QuestNote 備份檔。', 'error');
      return;
    }

    const normalized = normalizeBackupPayload(rawBackup);
    pendingImportBackup = normalized;
    pendingImportFileName = file.name;
    pendingImportWarnings = validation.warnings || [];

    const preview = previewBackup(normalized, {
      fileName: file.name,
      totalPets: state?.allPets?.length ?? null,
    });

    renderImportPreview(preview, validation.warnings || []);
  } catch (err) {
    const message = err?.message || '讀取備份檔失敗';
    showImportError(message);
    showToast(message, 'error');
  }
}

function initImportBackupHandlers() {
  const fileInput = document.getElementById('import-file-input');
  const selectBtn = document.getElementById('btn-import-select');
  const restoreBtn = document.getElementById('btn-import-restore');
  const reloadBtn = document.getElementById('btn-import-reload');

  resetImportUI();

  selectBtn?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportFileSelect(file);
    }
  });

  restoreBtn?.addEventListener('click', () => {
    if (!pendingImportBackup) {
      showToast('請先選擇有效的備份檔', 'warning');
      return;
    }
    handleRestoreBackup();
  });

  reloadBtn?.addEventListener('click', () => {
    window.location.reload();
  });
}

async function handleRestoreBackup() {
  if (!pendingImportBackup) return;

  const hasNewerVersionWarning = pendingImportWarnings.some((w) => w.includes('較新的版本'));

  openConfirmModal(
    '恢復備份',
    '匯入後會覆蓋目前所有 QuestNote 資料，確定要繼續嗎？',
    () => {
      proceedRestoreAfterFirstConfirm(hasNewerVersionWarning);
    },
    { confirmLabel: '繼續', danger: true }
  );
}

async function proceedRestoreAfterFirstConfirm(hasNewerVersionWarning) {
  setImportElementHidden('import-preview', true);
  setImportElementHidden('btn-import-select', true);
  setImportElementHidden('import-restoring-hint', false);

  const autoBackup = await createAutoBackupBeforeImport();
  if (!autoBackup.success) {
    setImportElementHidden('import-restoring-hint', true);
    if (pendingImportBackup) {
      setImportElementHidden('import-preview', false);
    }
    setImportElementHidden('btn-import-select', false);
    showImportError('目前資料自動備份失敗，為了保護資料，本次匯入已取消。');
    showToast('目前資料自動備份失敗，為了保護資料，本次匯入已取消。', 'error');
    return;
  }

  setImportElementHidden('import-restoring-hint', true);

  const secondMessage = hasNewerVersionWarning
    ? '系統已自動下載目前資料備份。此備份來自較新版本，可能無法完全相容。請再次確認你選擇的是正確備份檔。'
    : '系統已自動下載目前資料備份。請確認你選擇的是正確備份檔，再執行恢復。';

  openConfirmModal(
    '最後確認',
    secondMessage,
    async () => {
      await executeRestoreBackup();
    },
    {
      confirmLabel: '確認恢復',
      danger: true,
      onCancel: () => {
        if (pendingImportBackup) {
          setImportElementHidden('import-preview', false);
        }
        setImportElementHidden('btn-import-select', false);
      },
    }
  );
}

async function executeRestoreBackup() {
  if (!pendingImportBackup) return;

  setImportElementHidden('import-preview', true);
  setImportElementHidden('btn-import-select', true);
  setImportElementHidden('import-restoring-hint', false);
  setImportElementHidden('import-success-panel', true);

  try {
    await restoreBackup(pendingImportBackup);
    await onRefresh({ renderMode: 'full' });
    await applyTheme(state?.userPreferences?.theme ?? 'default', { silent: true });
    applyReduceMotionClass(state?.userPreferences?.reduceMotion ?? false);
    await handleAchievementCheckAfterAction();

    setImportElementHidden('import-restoring-hint', true);
    setImportElementHidden('import-success-panel', false);
    setImportElementHidden('import-idle-hint', true);
    setImportElementHidden('import-error-hint', true);

    showToast('備份恢復完成', 'success');
    showToast('建議重新整理 App，確認資料已完整載入。', 'info', 4000);
  } catch (err) {
    console.error('[QuestNote] 恢復備份失敗:', err);
    setImportElementHidden('import-restoring-hint', true);
    setImportElementHidden('import-preview', true);
    setImportElementHidden('btn-import-select', false);
    showImportError('恢復失敗，資料未完整寫入。請重新整理後再試。');
    showToast('恢復失敗，請確認備份檔是否正確。', 'error');
  }
}

function buildVersionInfoHtml({ compact = false, serviceWorkerStatus = '檢查中' } = {}) {
  if (compact) {
    return `
      <dl class="stats-list settings-version__list version-info-list version-info-list--compact">
        <div class="version-info-row stats-row">
          <dt class="version-info-label">目前版本</dt>
          <dd class="version-info-value" data-version-app-value>${escapeHtml(formatDisplayVersion())}</dd>
        </div>
        <div class="version-info-row stats-row">
          <dt class="version-info-label">Service Worker</dt>
          <dd class="version-info-value" data-version-sw-status>${escapeHtml(serviceWorkerStatus)}</dd>
        </div>
      </dl>`;
  }

  return `
    <dl class="stats-list settings-version__list version-info-list">
      <div class="version-info-row stats-row">
        <dt class="version-info-label">目前版本</dt>
        <dd class="version-info-value" data-version-app-value>${escapeHtml(formatDisplayVersion())}</dd>
      </div>
      <div class="version-info-row stats-row">
        <dt class="version-info-label">Cache</dt>
        <dd class="version-info-value version-info-value--mono settings-version__mono" data-version-cache-value>${escapeHtml(CACHE_NAME)}</dd>
      </div>
      <div class="version-info-row stats-row">
        <dt class="version-info-label">更新時間</dt>
        <dd class="version-info-value" data-version-build-value>${escapeHtml(formatBuildTimeLocal())}</dd>
      </div>
      <div class="version-info-row stats-row">
        <dt class="version-info-label">Service Worker</dt>
        <dd class="version-info-value" data-version-sw-status>${escapeHtml(serviceWorkerStatus)}</dd>
      </div>
    </dl>
    <p class="settings-version__note version-info-note" data-version-update-hint>
      若手機仍看到舊版，請移除主畫面 App 後重新加入，或清除 Safari 網站資料。
    </p>`;
}

function updateVersionInfoServiceWorkerStatus(status) {
  document.querySelectorAll('[data-version-sw-status]').forEach((el) => {
    el.textContent = status;
  });
}

/** 同步渲染版本資訊，再非同步更新 Service Worker 狀態 */
export function renderVersionInfo() {
  const containers = document.querySelectorAll('[data-version-info]');
  console.debug('[VersionInfo] render', {
    appVersion: APP_VERSION,
    cacheName: CACHE_NAME,
    buildTime: BUILD_TIME,
    containers: containers.length,
  });

  if (!containers.length) {
    console.warn('[VersionInfo] No version info container found');
    return;
  }

  containers.forEach((container) => {
    const compact = container.hasAttribute('data-version-info-compact');
    container.innerHTML = buildVersionInfoHtml({ compact, serviceWorkerStatus: '檢查中' });
  });

  setText('settings-footer-note', `QuestNote ${formatDisplayVersion()} — 離線個人任務記事 App`);

  updateServiceWorkerStatusDisplay().catch((error) => {
    console.warn('[VersionInfo] Failed to check service worker:', error);
    updateVersionInfoServiceWorkerStatus('無法確認');
  });
}

function renderSettingsView() {
  renderVersionInfo();

  if (!state) return;

  const { tasks, wallet, collectionProgress, gachaStats, activeExpedition, userPreferences, achievementSummary } = state;
  const completedCount = tasks.filter((t) => t.completed).length;

  setText('settings-task-count', tasks.length);
  setText('settings-completed-count', completedCount);
  setText('settings-stardust', wallet.stardust ?? 0);
  setText('settings-energy', wallet.adventureEnergy ?? 0);
  setText('settings-collection', `${collectionProgress.owned}/${collectionProgress.total}`);
  setText('settings-active-expedition', activeExpedition ? 1 : 0);
  setText('settings-total-pulls', gachaStats.totalPulls ?? 0);

  const achUnlocked = achievementSummary?.unlocked ?? 0;
  const achTotal = achievementSummary?.total ?? 0;
  setText('settings-achievements', `${achUnlocked}/${achTotal}`);

  const reduceMotionToggle = document.getElementById('toggle-reduce-motion');
  if (reduceMotionToggle) {
    reduceMotionToggle.checked = userPreferences?.reduceMotion ?? false;
  }

  renderThemePickerState(userPreferences?.theme ?? 'default');

  const devSection = document.getElementById('dev-tools-section');
  if (devSection) devSection.hidden = !isDevMode();
}

async function updateServiceWorkerStatusDisplay() {
  let status = '無法確認';

  try {
    if (!('serviceWorker' in navigator)) {
      status = '未支援';
    } else {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        status = '未啟用';
      } else if (reg.waiting) {
        status = '有更新待套用';
      } else if (reg.active) {
        status = '已啟用';
      } else if (reg.installing) {
        status = '安裝中';
      } else {
        status = navigator.serviceWorker.controller ? '已啟用' : '未啟用';
      }
    }
  } catch (err) {
    console.warn('[VersionInfo] Failed to check service worker:', err);
    status = '無法確認';
  }

  updateVersionInfoServiceWorkerStatus(status);
}

async function handleDevUnlock() {
  if (!isDevMode()) return;
  if (!confirm('【開發測試】將 8 隻高稀有寵物加入圖鑑，確定？')) return;

  const added = await unlockDevTestPets();
  await onRefresh({ renderMode: 'full' });
  switchView('collection');
  alert(added > 0 ? `已解鎖 ${added} 隻新寵物（共 8 隻測試寵物已就緒）` : '8 隻測試寵物皆已在圖鑑中');
}

async function handleDevUnlockAll() {
  if (!isDevMode()) return;

  const petIds = (state?.allPets || []).map((p) => p.id);
  if (petIds.length === 0) {
    alert('寵物資料尚未載入，請稍後再試。');
    return;
  }

  if (!confirm(`【開發測試】將全部 ${petIds.length} 隻寵物加入圖鑑，確定？`)) return;

  const { newlyAdded, total } = await unlockAllDevPets(petIds);
  await onRefresh({ renderMode: 'full' });
  switchView('collection');
  alert(
    newlyAdded > 0
      ? `已解鎖 ${newlyAdded} 隻新寵物（全圖鑑 ${total} 隻已就緒）`
      : `全圖鑑 ${total} 隻皆已在圖鑑中`
  );
}

async function handleDevStardust() {
  if (!isDevMode()) return;

  const total = await grantDevStardust();
  await onRefresh({ renderMode: ['tasks', 'gacha'] });
  alert(`已獲得 100,000 星塵！目前共 ${total.toLocaleString()} 星塵`);
}

async function handleDevExpedition() {
  if (!isDevMode()) return;

  try {
    await devForceCompleteExpedition();
    await onRefresh({ renderMode: ['expedition', 'tasks'] });
    switchView('expedition');
    alert('探險已立即結束，可前往探險頁領取獎勵。');
  } catch (err) {
    alert(err.message || '沒有進行中的探險');
  }
}

async function handleDevResetDailyBlessing() {
  if (!isDevMode()) return;
  if (!confirm('【開發測試】重置今日每日祝福（簽到與轉盤），確定？')) return;

  const result = await resetDevDailyBlessing();
  dailyBlessingCollapsed = false;
  await onRefresh({ renderMode: ['tasks', 'gacha'] });
  switchView('tasks');
  alert(result.message);
}

async function handleReset() {
  openConfirmModal(
    '重置所有資料',
    '所有任務、星塵、圖鑑、抽卡紀錄都將被清除，此操作無法復原。',
    () => {
      openConfirmModal(
        '再次確認',
        '確定要清除所有資料嗎？',
        async () => {
          if (typeof state.onReset === 'function') {
            await state.onReset();
            await onRefresh({ renderMode: 'full' });
            showToast('資料已重置', 'success');
          }
        },
        { confirmLabel: '確定重置', danger: true }
      );
    },
    { confirmLabel: '繼續', danger: true }
  );
}

/* ─── 工具函式 ─── */

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

export { showRewardToast };
