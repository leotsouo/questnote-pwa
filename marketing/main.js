import { MARKETING_CONFIG, getDistribution } from './config.js';
import { completeQuest, resetQuest } from './demo.js';
import { getAttribution, distributionUrl, track } from './analytics.js';

const distribution = getDistribution();
const attribution = getAttribution(location.search);
document.querySelectorAll('[data-distribution]').forEach(element => {
  if (!(element instanceof HTMLAnchorElement)) return;
  element.href = distributionUrl(distribution.url, attribution);
  const label = element.querySelector('[data-cta-label]');
  if (label) label.textContent = distribution.label;
  element.addEventListener('click', () => {
    const placement = element.dataset.distribution || 'hero';
    track(`${placement}_cta`, { mode: MARKETING_CONFIG.distributionMode }, MARKETING_CONFIG);
    track('distribution_click', { mode: MARKETING_CONFIG.distributionMode, placement }, MARKETING_CONFIG);
  });
});
document.querySelectorAll('[data-distribution-note]').forEach(element => { element.textContent = distribution.note; });

let state = resetQuest();
const questButton = document.querySelector('button#complete-quest');
const resetButton = document.querySelector('button#reset-quest');
const scene = document.querySelector('#quest-demo');
const status = document.querySelector('#demo-status');
const progress = document.querySelector('#daily-progress');
const bond = document.querySelector('#bond-progress');

function renderDemo() {
  if (!(questButton instanceof HTMLButtonElement) || !(resetButton instanceof HTMLButtonElement)) return;
  questButton.disabled = state.completed;
  questButton.setAttribute('aria-label', state.completed ? '讀書 30 分鐘，已完成' : '完成示範任務：讀書 30 分鐘');
  questButton.querySelector('.quest-check').textContent = state.completed ? '✓' : '';
  questButton.querySelector('.quest-action').textContent = state.completed ? '已完成' : '點一下完成';
  scene?.classList.toggle('is-complete', state.completed);
  document.querySelector('#progress-count').textContent = `${state.progress} / ${state.total}`;
  document.querySelector('#bond-count').textContent = `${state.bond} / ${state.bondMax}`;
  progress?.setAttribute('aria-valuenow', String(state.progress));
  progress?.setAttribute('aria-valuetext', `今日 ${state.total} 件任務已完成 ${state.progress} 件`);
  bond?.setAttribute('aria-valuenow', String(state.bond));
  progress?.setAttribute('style', `--progress:${state.progress / state.total * 100}%`);
  bond?.setAttribute('style', `--progress:${state.bond / state.bondMax * 100}%`);
  const reward = document.querySelector('#demo-reward');
  if (reward instanceof HTMLElement) reward.hidden = !state.completed;
  resetButton.hidden = !state.completed;
  document.querySelector('#companion-says').textContent = state.completed ? '「做得好，我為你驕傲。」' : '「今天也一起完成吧。」';
  if (status) status.textContent = state.completed ? '你的小事，牠收到了。' : '先試一件小事，看看牠的回應。';
  const announcement = document.querySelector('#demo-announcement');
  if (announcement) announcement.textContent = state.completed
    ? '任務完成。今日進度 3 / 5。獲得 20 星塵、1 冒險能量、5 親密度。你的小事，牠收到了。'
    : '示範已重設，今日進度 2 / 5。';
}

questButton?.addEventListener('click', () => {
  if (state.completed) return;
  track('demo_start', {}, MARKETING_CONFIG);
  state = completeQuest(state);
  renderDemo();
  track('quest_completed', { quest: 'read-30', reward: 'normal' }, MARKETING_CONFIG);
  // Completing the demo leaves a keyboard user at a usable next action.
  if (document.activeElement === questButton && resetButton instanceof HTMLElement) resetButton.focus({ preventScroll: true });
});
resetButton?.addEventListener('click', () => {
  state = resetQuest();
  renderDemo();
  if (questButton instanceof HTMLElement) questButton.focus({ preventScroll: true });
  track('demo_reset', {}, MARKETING_CONFIG);
});
renderDemo();

const tabs = [...document.querySelectorAll('button[role="tab"]')];
/** @param {HTMLButtonElement} tab */
function activateTab(tab) {
  tabs.forEach(item => {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.setAttribute('tabindex', active ? '0' : '-1');
    const panel = document.getElementById(item.getAttribute('aria-controls'));
    if (panel) panel.hidden = !active;
  });
  track('product_screen', { screen: tab.dataset.screen }, MARKETING_CONFIG);
}
tabs.forEach((tab, index) => {
  if (!(tab instanceof HTMLButtonElement)) return;
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    const target = tabs[next];
    if (target instanceof HTMLButtonElement) { activateTab(target); target.focus(); }
  });
});

const sticky = document.querySelector('#mobile-cta');
let heroVisible = true;
let finalVisible = false;
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.target.id === 'hero') heroVisible = entry.isIntersecting;
    if (entry.target.id === 'start') finalVisible = entry.isIntersecting;
  });
  if (sticky instanceof HTMLElement) sticky.hidden = heroVisible || finalVisible;
});
observer.observe(document.querySelector('#hero'));
observer.observe(document.querySelector('#start'));

if (location.hostname === new URL(MARKETING_CONFIG.canonicalUrl).hostname
  && MARKETING_CONFIG.analytics.cloudflareToken && navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl) {
  const script = document.createElement('script');
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.defer = true;
  script.dataset.cfBeacon = JSON.stringify({ token: MARKETING_CONFIG.analytics.cloudflareToken });
  document.head.appendChild(script);
}
track('page_view', {}, MARKETING_CONFIG);
