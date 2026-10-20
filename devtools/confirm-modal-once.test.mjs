/**
 * openConfirmModal (modalHost) runs onConfirm once even when the confirm button is tapped twice.
 * The overlay only fades out after closeModal(), so a double tap used to reach the handler twice and
 * delete / archive / spend twice ("任務已刪除" toast twice, 2026-10-20 audit).
 *
 * `MODAL_HOST_MODULE` points the harness at another copy of the module (used to prove a regression).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const noop = () => {};
function fakeClassList() {
  const set = new Set();
  return { add: (name) => set.add(name), remove: (name) => set.delete(name), contains: (name) => set.has(name), toggle: noop };
}
function fakeElement(id) {
  const listeners = {};
  return {
    id, listeners, classList: fakeClassList(), dataset: {}, style: {}, innerHTML: '', scrollTop: 0, disabled: false, hidden: false,
    addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); }, removeEventListener: noop,
    querySelector: () => fakeElement('q'), querySelectorAll: () => [], getAnimations: () => [], matches: () => false,
    focus: noop, setAttribute: noop, getAttribute: () => null, removeAttribute: noop, hasAttribute: () => false,
    contains: () => false, closest: () => null, append: noop, appendChild: noop, prepend: noop, remove: noop,
    insertBefore: noop, replaceChildren: noop, after: noop, before: noop,
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }),
    async click() { for (const fn of listeners.click || []) await fn({ currentTarget: this, target: this, preventDefault: noop }); },
  };
}

function installBrowserStubs() {
  const elements = {};
  globalThis.window = globalThis;
  globalThis.addEventListener = noop;
  globalThis.removeEventListener = noop;
  globalThis.location = { href: 'http://127.0.0.1:8000/', hostname: '127.0.0.1', origin: 'http://127.0.0.1:8000', pathname: '/', search: '' };
  globalThis.history = { replaceState: noop, pushState: noop };
  globalThis.sessionStorage = { getItem: () => null, setItem: noop, removeItem: noop };
  globalThis.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
  globalThis.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options?.detail; } };
  globalThis.Image = class { constructor() { this.decode = async () => {}; } };
  globalThis.matchMedia = () => ({ matches: false, addEventListener: noop });
  globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node' }, configurable: true });
  globalThis.document = {
    getElementById: (id) => (id === 'global-mailbox-modal' ? null : (elements[id] ||= fakeElement(id))),
    querySelector: () => fakeElement('q'), querySelectorAll: () => [],
    body: fakeElement('body'), documentElement: fakeElement('html'), activeElement: null,
    addEventListener: noop, createElement: () => fakeElement('created'),
  };
  return elements;
}

test('a double tap on the confirm button runs onConfirm once', async () => {
  const elements = installBrowserStubs();
  const modulePath = process.env.MODAL_HOST_MODULE || 'src/ui/modalHost.js';
  const modalHost = await import(pathToFileURL(path.resolve(import.meta.dirname, '..', modulePath)).href);
  modalHost.connectModalHost({ petDisplayName: (pet) => pet?.name, petOriginalName: (pet) => pet?.name, showToast: noop, state: {} });
  let runs = 0;
  modalHost.openConfirmModal('刪除任務', '確定？', async () => {
    runs += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
  });
  const ok = elements['confirm-ok'];
  await Promise.all([ok.click(), ok.click()]);
  await ok.click();
  assert.equal(runs, 1);
  assert.equal(ok.disabled, true);
});
