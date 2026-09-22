const output = document.getElementById('results');
const results = [];
const registrations = [];
const frames = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, message, timeout = 15000) {
  const start = Date.now();
  while (!check()) { if (Date.now() - start > timeout) throw new Error(message); await delay(40); }
}
async function control(scope, version, options = {}) {
  const response = await fetch('./control', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope, version, ...options }) });
  assert(response.ok, 'Fixture control failed');
}
async function client(scope) {
  const frame = document.createElement('iframe');
  const loaded = new Promise((resolve) => { frame.onload = resolve; });
  frame.src = `/${scope}/`; frames.push(frame); document.getElementById('clients').appendChild(frame);
  await loaded;
  await until(() => frame.contentWindow.loadedGeneration, 'Fixture client did not load');
  assert(frame.contentWindow.navigator.serviceWorker.controller, 'Client is not controlled');
  return frame;
}
async function installUpdate(registration) {
  let worker;
  const found = new Promise((resolve) => registration.addEventListener('updatefound', () => {
    worker = registration.installing; resolve();
  }, { once: true }));
  await registration.update();
  await Promise.race([found, delay(10000).then(() => { throw new Error('No update worker'); })]);
  await until(() => ['installed', 'redundant', 'activated'].includes(worker.state), 'Update did not settle');
  return worker;
}
async function test(name, run) {
  try { await run(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.stack || error.message }); }
  output.textContent = JSON.stringify(results, null, 2);
}
try {
  assert(!navigator.serviceWorker.controller, 'Parent test page must remain uncontrolled');
  const unrelated = `native-sw-test-unrelated-${crypto.randomUUID()}`;
  await caches.open(unrelated);
  let preview; let production; let first; let second;
  await test('native preview and production workers install without claiming the test page', async () => {
    for (const scope of ['preview', 'production']) {
      const registration = await navigator.serviceWorker.register(`/${scope}/service-worker.js`, { scope: `/${scope}/`, updateViaCache: 'none' });
      registrations.push(registration);
      await until(() => registration.active?.state === 'activated', `Initial ${scope} worker not activated`);
      if (scope === 'preview') preview = registration; else production = registration;
    }
    assert(!navigator.serviceWorker.controller, 'Worker claimed unrelated parent');
    first = await client('preview'); second = await client('preview');
    assert(first.contentWindow.loadedGeneration === 1 && second.contentWindow.loadedGeneration === 1, 'Initial generation mismatch');
    first.contentDocument.getElementById('edit').value = 'unsaved-one';
    second.contentDocument.getElementById('edit').value = 'unsaved-two';
  });
  await test('native required-file 503 rejects the new worker and retains old offline shell', async () => {
    await control('preview', 2, { fail: 'main.js' });
    const update = await installUpdate(preview);
    assert(update.state === 'redundant', 'Broken update was accepted');
    assert(!preview.waiting, 'Broken update is waiting to activate');
    assert(first.contentWindow.loadedGeneration === 1, 'Old client changed');
    const fresh = await client('preview');
    assert(fresh.contentWindow.loadedGeneration === 1, 'Old cached shell unavailable'); fresh.remove();
  });
  await test('native digest mismatch also rejects activation without replacing the old catalog', async () => {
    await control('preview', 3, { corrupt: 'catalog.json' });
    const update = await installUpdate(preview);
    assert(update.state === 'redundant', 'Corrupt update was accepted');
    assert(JSON.parse(await first.contentWindow.readCatalog()).version === 1, 'Old catalog replaced');
  });
  await test('two native controlled clients hold a good update; legacy skip message cannot interrupt inputs', async () => {
    await control('preview', 4);
    const update = await installUpdate(preview);
    assert(preview.waiting === update && update.state === 'installed', 'Good update did not wait');
    update.postMessage({ type: 'SKIP_WAITING' }); await delay(120);
    assert(update.state === 'installed', 'Legacy message forced activation');
    assert(first.contentDocument.getElementById('edit').value === 'unsaved-one', 'First input interrupted');
    assert(second.contentDocument.getElementById('edit').value === 'unsaved-two', 'Second input interrupted');
    first.remove(); await delay(120);
    assert(update.state === 'installed', 'Update activated while another client remained');
    second.remove();
    await until(() => update.state === 'activated', 'Update did not naturally activate after both clients closed');
    const next = await client('preview');
    assert(next.contentWindow.loadedGeneration === 4, 'New client received old runtime');
    assert(JSON.parse(await next.contentWindow.readCatalog()).version === 4, 'New runtime received old catalog');
    next.remove();
  });
  await test('native active shell and catalog remain usable when every network asset returns 503', async () => {
    await control('preview', 4, { fail: '*' });
    const offline = await client('preview');
    assert(offline.contentWindow.loadedGeneration === 4, 'Cached runtime unavailable');
    assert(JSON.parse(await offline.contentWindow.readCatalog()).version === 4, 'Cached catalog unavailable');
    offline.remove();
  });
  await test('both native namespace activations preserve the other environment and unrelated cache', async () => {
    assert((await caches.keys()).some((name) => name.startsWith('questnote-production-shell-native-')), 'Preview deleted production cache');
    await control('production', 2);
    const update = await installUpdate(production);
    await until(() => update.state === 'activated', 'Production update did not activate');
    const names = await caches.keys();
    assert(names.some((name) => name.startsWith('questnote-preview-shell-native-')), 'Production deleted preview cache');
    assert(names.includes(unrelated), 'Unrelated cache deleted');
    const previewClient = await client('preview');
    assert(previewClient.contentWindow.loadedGeneration === 4, 'Other scope changed preview runtime'); previewClient.remove();
  });
  await caches.delete(unrelated);
} catch (error) { results.push({ name: 'harness', ok: false, error: error.stack || error.message }); }
finally {
  frames.forEach((frame) => frame.remove());
  for (const registration of registrations) await registration.unregister();
  // Only generated fixture caches on this ephemeral loopback origin are removed.
  for (const name of await caches.keys()) if (/^questnote-(preview|production)-(shell|images|mailbox)-native-/.test(name)) await caches.delete(name);
  output.textContent = JSON.stringify({ passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length, results }, null, 2);
  document.title = results.every((result) => result.ok) ? 'PASS — Native SW' : 'FAIL — Native SW';
}
