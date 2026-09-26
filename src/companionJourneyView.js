import { escapeHtml } from './uiHelpers.js';
import { getTaskMemories, getMemoryHeading, getCompletionLine, getMemoryProgress } from './companionJourneyService.js';

const nameOf = (pet) => pet?.displayName || pet?.nickname || pet?.name || '當時的夥伴';
const dateOf = (date) => new Date(date).toLocaleDateString('zh-TW', { year: 'numeric', month: 'short', day: 'numeric' });

export function buildCompletionFeedback(memory, pet, reward, imageHtml = '') {
  const progress = getMemoryProgress(memory);
  const celebration = memory.meaningful || memory.milestone || reward.bond?.leveledUp;
  return `<div class="journey-feedback ${celebration ? 'journey-feedback--celebrate' : ''}">
    <div class="journey-feedback__heading">
      <span class="journey-eyebrow">${memory.petId ? '與夥伴一起走過' : '記住自己的努力'}</span>
      <button type="button" class="btn btn--ghost btn--sm" data-action="dismiss-task-feedback" aria-label="收起完成回應">收起</button>
    </div>
    ${celebration ? `<h3>${escapeHtml(getMemoryHeading(memory))}</h3>` : ''}
    <p class="journey-feedback__task">✓ ${escapeHtml(memory.taskTitle)}</p>
    <div class="journey-feedback__companion">
      ${imageHtml ? `<div class="journey-feedback__portrait" aria-hidden="true">${imageHtml}</div>` : ''}
      <div>${memory.petId ? `<strong>${escapeHtml(nameOf(pet))}</strong>` : ''}
        <p class="journey-feedback__line">${escapeHtml(getCompletionLine(pet, memory))}</p>
      </div>
    </div>
    ${memory.petId ? `<div class="journey-feedback__progress">
      <span>親密度 +${progress.gained} · Lv.${progress.level}</span>
      ${celebration ? `<progress max="100" value="${progress.percent}" aria-label="親密度等級進度"></progress>` : ''}
      ${progress.unlocked ? `<p><strong>${escapeHtml(progress.unlocked)}</strong></p>` : ''}
      <p>${escapeHtml(progress.next)}</p>
    </div>` : ''}
    <p class="journey-feedback__rewards">星塵 +${reward.amount} · 冒險能量 +${reward.energy}</p>
    ${celebration ? '<p class="journey-feedback__saved">已收進「一起走過的事」，隨時可以回看。</p>' : ''}
  </div>`;
}

export function buildJourneyHtml(tasks, pets, petId = undefined) {
  const memories = getTaskMemories(tasks, petId);
  const title = petId ? '我們一起走過的事' : '一起走過的事';
  const rows = memories.map((memory) => {
    const pet = (pets || []).find((candidate) => candidate.id === memory.petId);
    return `<li class="journey-memory ${memory.meaningful || memory.milestone ? 'journey-memory--special' : ''}">
      <div class="journey-memory__meta"><time datetime="${escapeHtml(memory.completedAt)}">${escapeHtml(dateOf(memory.completedAt))}</time>
        ${memory.meaningful ? '<span>值得紀念</span>' : memory.milestone ? `<span>${escapeHtml(getMemoryHeading(memory))}</span>` : ''}
      </div>
      <p class="journey-memory__title">${escapeHtml(memory.taskTitle)}</p>
      <p class="journey-memory__companion">${memory.petId ? `與 ${escapeHtml(nameOf(pet))} 一起完成` : '你為自己踏出的一步'}</p>
    </li>`;
  });
  const recent = rows.slice(0, 3).join('');
  const rest = rows.slice(3).join('');
  return `<section class="journey-log card" aria-label="${title}">
    <h2>${title}</h2>
    <p class="journey-log__intro">${memories.length ? `這裡留下了 ${memories.length} 件已完成的事。` : '從下一次完成任務開始，留下你的努力與夥伴的共同紀錄。'}</p>
    ${recent ? `<ol class="journey-memories">${recent}</ol>` : ''}
    ${rest ? `<details><summary>回看更早的 ${rows.length - 3} 件事</summary><ol class="journey-memories">${rest}</ol></details>` : ''}
  </section>`;
}
