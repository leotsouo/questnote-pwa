import test from 'node:test';
import assert from 'node:assert/strict';
import { createInvitationController } from '../src/invitationPresentation.js';

const deferred = () => { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const tick = () => new Promise((resolve) => setImmediate(resolve));
const selected = () => ({ pet:{ id:'invited-ur', name:'同行者', title:'旅程', rarity:'UR', image:'assets/test.webp' }, seriesId:'own-pool', available:true, owned:false });
function fixture(actions, route = 'confirm', reduceMotion = false) {
  const previousDocument = globalThis.document;
  globalThis.document = { activeElement:{ isConnected:true, focus() {} } };
  const events = new Map();
  const host = {
    open:false, hidden:false, innerHTML:'', focused:'',
    addEventListener(name, callback) { events.set(name, callback); },
    setAttribute() {},
    querySelector(selector) { return { focus:() => { host.focused = selector; } }; },
    showModal() { this.open = true; },
    close() { this.open = false; queueMicrotask(() => events.get('close')()); },
    click(action) { return events.get('click')({ target:{ closest:() => ({ dataset:{ invitationAction:action } }) } }); },
  };
  const row = selected();
  const controller = createInvitationController(host, actions);
  controller.open({ route, balance:242, selected:row, rows:[row], reduceMotion });
  return { host, row, controller, restore:() => { globalThis.document = previousDocument; } };
}

test('commit completes once before the pool arrival; native dialog suspension does not cancel the result', async () => {
  const save = deferred(); const movie = deferred(); let charges = 0; const calls = [];
  const f = fixture({ invite:() => { charges++; return save.promise; }, playArrival:(input) => { calls.push(input); return movie.promise; } });
  try {
    const pending = f.host.click('commit');
    await f.host.click('commit');
    assert.equal(charges, 1); assert.equal(calls.length, 0); assert.equal(f.host.open, true);
    save.resolve({ balance:42 }); await tick();
    assert.equal(calls[0].selected.seriesId, 'own-pool'); assert.equal(calls[0].selected.pet.id, 'invited-ur');
    assert.equal(f.host.open, false); assert.equal(f.host.hidden, true); assert.equal(f.row.owned, true);
    await f.host.click('commit'); assert.equal(charges, 1);
    movie.resolve(); await pending;
    assert.equal(f.host.open, true); assert.equal(f.host.hidden, false);
    assert.match(f.host.innerHTML, /剩餘 42 枚/); assert.match(f.host.innerHTML, /接受了你的邀請，已加入收藏/);
    assert.match(f.host.focused, /companion/); assert.equal(charges, 1);
  } finally { f.restore(); }
});

test('replay awaits the existing reveal without another invite or charge', async () => {
  let charges = 0; let plays = 0;
  const f = fixture({ invite:async () => { charges++; return { balance:42 }; }, playArrival:async () => { plays++; } });
  try {
    await f.host.click('commit'); await f.host.click('replay');
    assert.equal(charges, 1); assert.equal(plays, 2);
    assert.match(f.host.innerHTML, /剩餘 42 枚/); assert.equal(f.host.open, true);
  } finally { f.restore(); }
});

test('storage failure never starts a winning reveal', async () => {
  let plays = 0;
  const f = fixture({ invite:async () => { throw Object.assign(new Error('storage'), { name:'QuotaExceededError' }); }, playArrival:async () => { plays++; } });
  try {
    await f.host.click('commit'); assert.equal(plays, 0); assert.equal(f.row.owned, false);
    assert.match(f.host.innerHTML, /尚未扣除相遇碎片/); assert.equal(f.host.open, true);
  } finally { f.restore(); }
});

test('a reveal failure preserves the committed companion and balance with truthful retry copy', async () => {
  let charges = 0; let plays = 0;
  const f = fixture({ invite:async () => { charges++; return { balance:42 }; }, playArrival:async () => { if (++plays === 1) throw new Error('art unavailable'); } });
  try {
    await f.host.click('commit');
    assert.equal(charges, 1); assert.equal(f.row.owned, true); assert.equal(f.host.open, true);
    assert.match(f.host.innerHTML, /登場演出暫時無法播放/); assert.match(f.host.innerHTML, /剩餘 42 枚/);
    assert.doesNotMatch(f.host.innerHTML, /尚未扣除/);
    await f.host.click('replay'); assert.equal(charges, 1);
    assert.doesNotMatch(f.host.innerHTML, /登場演出暫時無法播放/);
  } finally { f.restore(); }
});

test('reduced motion announces the acquired character without opening a full reveal', async () => {
  let plays = 0;
  const f = fixture({ invite:async () => ({ balance:42 }), playArrival:async () => { plays++; } }, 'confirm', true);
  try {
    await f.host.click('commit'); await f.host.click('replay');
    assert.equal(plays, 0); assert.equal(f.host.open, true); assert.equal(f.host.hidden, false);
    assert.match(f.host.innerHTML, /接受了你的邀請，已加入收藏/);
  } finally { f.restore(); }
});

test('completion of an older reveal cannot overwrite a newly opened invitation model', async () => {
  const movie = deferred();
  const f = fixture({ invite:async () => ({ balance:42 }), playArrival:() => movie.promise });
  try {
    const pending = f.host.click('commit'); await tick();
    f.controller.open({ route:'gallery', balance:100, rows:[selected()] });
    movie.resolve(); await pending;
    assert.equal(f.host.open, true); assert.equal(f.host.hidden, false);
    assert.match(f.host.innerHTML, /你想與誰同行/); assert.doesNotMatch(f.host.innerHTML, /本次邀請 200/);
  } finally { f.restore(); }
});
