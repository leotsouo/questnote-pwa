// This harness never opens the production database, even when hosted on its origin.
const databaseName = `QuestNoteTest-M1-${crypto.randomUUID()}`;
const nativeOpen = indexedDB.open.bind(indexedDB);
indexedDB.open = (name, version) => {
  if (!['QuestNoteDB', 'QuestNotePreviewDB'].includes(name)) throw new Error('Unexpected database request');
  return nativeOpen(databaseName, version);
};
const output = document.getElementById('test-results');
const results = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
async function test(name, run) {
  try { await run(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.stack || error.message }); }
  output.textContent = JSON.stringify(results, null, 2);
}
async function rejects(run) {
  try { await run(); } catch { return; }
  throw new Error('Expected rejection');
}
let db;
try {
  assert(!navigator.serviceWorker?.controller, 'Use a fresh localhost port without an app service worker');
  const storage = await import('../src/db.js');
  const backup = await import('../src/backupService.js');
  db = await storage.openDB();
  assert(db.name === databaseName, 'Database isolation failed');
  const fixtures = await Promise.all(['1.8.1', '3.0.1', '3.4.4'].map(async (version) => {
    const response = await fetch(`./fixtures/backups/legacy-${version}.json`);
    assert(response.ok, `Missing fixture ${version}`);
    return response.json();
  }));
  if (new URL(location.href).searchParams.has('external')) {
    output.textContent = 'Select the saved legacy-3.4.4.json recovery fixture from disk.';
    const file = await new Promise((resolve) => {
      document.getElementById('recovery-file').addEventListener('change', (event) => resolve(event.target.files[0]), { once: true });
    });
    await test('external saved backup is re-read, validated and restored through native IndexedDB', async () => {
      const external = await backup.readBackupFile(file);
      assert(same(external, fixtures[2]), 'Selected recovery file differs from the saved fixture');
      await backup.importBackup(external);
      const expected = backup.migrateImportedData(backup.normalizeBackupPayload(external));
      const restored = await storage.readAllStoresSnapshot();
      const wallet = restored.meta.find((entry) => entry.key === 'wallet');
      assert(same(wallet, expected.wallet) && same(restored.tasks, expected.tasks), 'External recovery changed saved state');
      await storage.replaceAllStores({});
    });
  }
  await test('fresh profile exports a complete valid backup', async () => {
    assert(backup.validateBackup(await backup.exportBackup()).valid, 'Empty profile export invalid');
  });
  for (const fixture of fixtures) {
    await test(`historical ${fixture.appVersion}: restore and current backup round-trip`, async () => {
      assert(backup.validateBackup(fixture).valid, 'Historical fixture rejected');
      await backup.importBackup(fixture);
      const first = await backup.exportBackup();
      assert(backup.validateBackup(first).valid, 'Export invalid');
      await backup.importBackup(first);
      const second = await backup.exportBackup();
      assert(same(first.data, second.data), 'Snapshot changed during round-trip');
      assert(first.wallet.stardust === fixture.data.wallet.stardust, 'Wallet not preserved');
      assert(first.tasks[0].id === fixture.data.tasks[0].id, 'Task identity not preserved');
    });
  }
  const valid = await backup.exportBackup();
  const unchanged = async (run) => {
    const before = await storage.readAllStoresSnapshot();
    await rejects(run);
    assert(same(before, await storage.readAllStoresSnapshot()), 'Database changed after rejection');
  };
  await test('partial backup and direct partial restore cause zero writes', async () => {
    await unchanged(() => backup.importBackup({ app: 'QuestNote', version: 2, appVersion: '3.4.4', tasks: [] }));
    await unchanged(() => backup.restoreBackup({ tasks: [] }));
  });
  await test('conflicting aliases and duplicate IDs cause zero writes', async () => {
    // A real JSON file has separate aliases; structuredClone preserves shared references.
    const conflict = JSON.parse(JSON.stringify(valid)); conflict.wallet.stardust += 1;
    await unchanged(() => backup.importBackup(conflict));
    const duplicate = structuredClone(valid); delete duplicate.data;
    duplicate.tasks.push(structuredClone(duplicate.tasks[0]));
    await unchanged(() => backup.importBackup(duplicate));
  });
  await test('incomplete nested state and catalog overrides cause zero writes', async () => {
    for (const [key, value] of [['poolUnlockState', {}], ['inventory', {}],
      ['collectionMilestones', {}], ['questProgress', { daily: 'broken', weekly: 'broken' }]]) {
      const incomplete = structuredClone(valid); delete incomplete.data;
      incomplete[key] = value;
      await unchanged(() => backup.importBackup(incomplete));
    }
    const injected = structuredClone(valid); delete injected.data;
    injected.collection[0].rarity = 'N"><span data-audit-injected="true"></span>';
    await unchanged(() => backup.importBackup(injected));
  });
  await test('synchronous DataCloneError aborts queued clears', async () => {
    await unchanged(() => storage.replaceAllStores({ tasks: [{ id: 'cannot-clone', fn() {} }] }));
  });
  await test('request-success followed by abort rolls back the entire restore', async () => {
    const nativePut = IDBObjectStore.prototype.put;
    let count = 0;
    IDBObjectStore.prototype.put = function (...args) {
      const request = nativePut.apply(this, args);
      if (this.transaction.db.name === databaseName && ++count === 4) {
        request.addEventListener('success', () => this.transaction.abort());
      }
      return request;
    };
    try { await unchanged(() => backup.importBackup(valid)); }
    finally { IDBObjectStore.prototype.put = nativePut; }
  });
  await test('dbPut resolves on transaction completion, never request success', async () => {
    const nativePut = IDBObjectStore.prototype.put;
    let prematurelyResolved = false;
    let settled = false;
    IDBObjectStore.prototype.put = function (...args) {
      const request = nativePut.apply(this, args);
      request.addEventListener('success', () => {
        queueMicrotask(() => { prematurelyResolved = settled; });
        this.transaction.abort();
      });
      return request;
    };
    try {
      const pending = storage.dbPut(storage.STORES.META, { key: 'probe', value: 1 });
      pending.then(() => { settled = true; }, () => {});
      await rejects(() => pending);
      assert(!prematurelyResolved, 'Resolved before commit');
    } finally { IDBObjectStore.prototype.put = nativePut; }
  });
  await test('snapshot uses one readonly transaction and performs no migration writes', async () => {
    const nativeTransaction = IDBDatabase.prototype.transaction;
    const calls = [];
    IDBDatabase.prototype.transaction = function (...args) {
      if (this.name === databaseName) calls.push(args);
      return nativeTransaction.apply(this, args);
    };
    try {
      await backup.exportBackup();
      assert(calls.length === 1 && calls[0][1] === 'readonly' && calls[0][0].length === 5,
        'Export did not read one complete database snapshot');
    } finally { IDBDatabase.prototype.transaction = nativeTransaction; }
  });
  await test('exported JSON can be re-read as a backup file before recovery', async () => {
    const exported = await backup.exportBackup();
    const file = new File([JSON.stringify(exported)], 'recovery.json', { type: 'application/json' });
    const reread = await backup.readBackupFile(file);
    assert(backup.validateBackup(reread).valid && same(exported.data, reread.data), 'Recovery file differs');
  });
  await test('export refuses to silently default malformed stored state', async () => {
    const original = await storage.dbGet(storage.STORES.META, 'poolUnlockState');
    await storage.dbPut(storage.STORES.META, { key: 'poolUnlockState' });
    try { await unchanged(() => backup.exportBackup()); }
    finally { await storage.dbPut(storage.STORES.META, original); }
  });
  await test('imported task/subtask IDs remain literal text in the real renderer', async () => {
    const html = await (await fetch('../index.html')).text();
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    parsed.querySelectorAll('script').forEach((node) => node.remove());
    document.getElementById('app-fixture').append(...parsed.body.childNodes);
    const state = backup.migrateImportedData(backup.normalizeBackupPayload(valid));
    const marker = 'audit"><span data-audit-injected="true"></span><i data-x="';
    state.tasks = [{ ...state.tasks[0], id: marker, completed: false, plannedDate: new Date().toLocaleDateString('en-CA'),
      subtasks: [{ id: marker, text: 'Safe subtask', completed: false }] }];
    Object.assign(state, { categories: [], allPets: [], enrichedCollection: [], todayCompleted: 0,
      availablePulls: 0, achievementSummary: {}, habitSummary: {}, questSummary: null });
    const ui = await import('../src/ui.js');
    ui.initUI(state, async () => {}, async () => {});
    ui.renderView('tasks');
    const card = document.querySelector(`.task-card[data-id="${CSS.escape(marker)}"]`);
    assert(card && card.dataset.id === marker, 'Task card missing or ID changed');
    card.querySelector('[data-action="toggle-expand"]').click();
    const subtask = document.querySelector('[data-subtask-id]');
    assert(subtask?.dataset.subtaskId === marker, 'Subtask ID changed');
    assert(!document.querySelector('[data-audit-injected]'), 'Injected DOM node found');
    // Exercise a previously stored override too: catalog values must win at read time.
    const collection = await import('../src/collectionService.js');
    const entry = (await collection.getCollection())[0];
    await storage.dbPut(storage.STORES.COLLECTION, { ...entry, isCompanion: true,
      rarity: marker, image: 'javascript:alert(1)', name: marker, id: marker });
    const catalogPet = { id: entry.petId, name: 'Catalog pet', rarity: 'N', image: '' };
    const companion = await collection.getCompanion([catalogPet]);
    assert(companion.id === entry.petId && companion.rarity === 'N' && companion.image === '',
      `Persisted state overrode trusted catalog: ${JSON.stringify({ id: companion.id, rarity: companion.rarity, image: companion.image })}`);
    state.companion = companion;
    ui.renderView('tasks');
    assert(document.querySelector('.companion-card'), 'Companion renderer was not exercised');
    assert(!document.querySelector('[data-audit-injected]'), 'Companion created injected DOM');
    await storage.dbPut(storage.STORES.COLLECTION, entry);
  });
} catch (error) {
  results.push({ name: 'harness setup', ok: false, error: error.stack || error.message });
} finally {
  db?.close();
  // Keep the isolation guard installed for late UI callbacks for this tab's lifetime.
  // The generated test name is the only deletion target. Never delete QuestNoteDB.
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Test cleanup blocked'));
  }).catch((error) => results.push({ name: 'cleanup', ok: false, error: error.message }));
  output.textContent = JSON.stringify({ passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length, databaseName, results }, null, 2);
  document.title = results.every((r) => r.ok) ? 'PASS — QuestNote M1' : 'FAIL — QuestNote M1';
}
