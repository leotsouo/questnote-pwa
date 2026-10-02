/** In-memory store for the dedicated local App review server. Never shipped as db.js. */
export const STORES = { TASKS: 'tasks', META: 'meta', COLLECTION: 'collection', EXPEDITIONS: 'expeditions', HABITS: 'habits' };
const keys = { tasks: 'id', meta: 'key', collection: 'petId', expeditions: 'id', habits: 'id' };
const copy = (value) => value === undefined ? undefined : structuredClone(value);
let stores = Object.fromEntries(Object.keys(keys).map((name) => [name, new Map()]));
let queue = Promise.resolve();

function seed() {
  stores.meta.set('wallet', { key: 'wallet', stardust: 30000, adventureEnergy: 300, materials: {} });
  stores.meta.set('gachaStats', { key: 'gachaStats', selectedPoolId: 'lionheart_inverse_oath' });
  stores.meta.set('onboardingV1', { key: 'onboardingV1', schemaVersion: 2, status: 'dismissed' });
  for (const petId of ['pet_n01', 'pet_n09', 'pet_n39', 'pet_r41', 'pet_ssr25', 'pet_ur20']) {
    stores.collection.set(petId, { petId, stars: petId === 'pet_ur20' ? 5 : 1, bondLevel: 1, bondExp: 0,
      fragments: 0, isCompanion: petId === 'pet_n01', nickname: petId === 'pet_n01' ? '小灰' : null,
      lastPettedAt: null, obtainedAt: '2026-10-02T00:00:00.000Z' });
  }
}
seed();

/** Minimal request/transaction semantics used by the App's direct reward transactions. */
function transaction(names, mode = 'readonly') {
  names = typeof names === 'string' ? [names] : names;
  if (names.some((name) => !keys[name])) throw new Error('Unknown session store');
  const previous = queue;
  let release;
  queue = new Promise((resolve) => { release = resolve; });
  let draft;
  let pending = 0;
  let ready = false;
  let finished = false;
  let timer;
  const operations = [];
  const tx = { error: null, oncomplete: null, onerror: null, onabort: null, objectStore, abort };
  function abort(error = new Error('Session transaction aborted')) {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    tx.error = error;
    queueMicrotask(() => { tx.onabort?.(); release(); });
  }
  function settle() {
    clearTimeout(timer);
    if (pending || !ready || finished) return;
    timer = setTimeout(() => {
      if (pending || finished) return;
      finished = true;
      if (mode === 'readwrite') for (const name of names) stores[name] = draft[name];
      tx.oncomplete?.();
      release();
    }, 0);
  }
  function request(operation) {
    if (finished) throw new Error('Session transaction is inactive');
    clearTimeout(timer);
    pending += 1;
    const result = { result: undefined, error: null, onsuccess: null, onerror: null };
    const run = () => queueMicrotask(() => {
      if (finished) return;
      try { result.result = copy(operation()); result.onsuccess?.({ target: result }); }
      catch (error) { result.error = error; result.onerror?.({ target: result }); abort(error); }
      pending -= 1;
      settle();
    });
    ready ? run() : operations.push(run);
    return result;
  }
  function objectStore(name) {
    if (!names.includes(name)) throw new Error('Store is outside the transaction');
    const write = (operation) => {
      if (mode !== 'readwrite') throw new Error('Readonly session transaction');
      return request(operation);
    };
    return {
      get: (key) => request(() => draft[name].get(key)),
      getAll: () => request(() => [...draft[name].values()]),
      put: (value) => {
        const snapshot = copy(value);
        return write(() => {
          const key = snapshot?.[keys[name]];
          if (key == null) throw new Error('Missing session record key');
          draft[name].set(key, snapshot);
          return key;
        });
      },
      delete: (key) => write(() => { draft[name].delete(key); }),
      clear: () => write(() => { draft[name].clear(); }),
    };
  }
  previous.then(() => {
    if (finished) return;
    draft = Object.fromEntries(names.map((name) => [name, new Map([...stores[name]].map(([key, value]) => [key, copy(value)]))]));
    ready = true;
    operations.forEach((run) => run());
    settle();
  });
  return tx;
}

export async function openDB() { return { transaction, close() {} }; }
function reminderChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('questnote-reminder-change'));
}
function read(store, method, key) {
  return new Promise((resolve, reject) => {
    const tx = transaction(store);
    const req = tx.objectStore(store)[method](key);
    req.onsuccess = () => resolve(req.result ?? (method === 'getAll' ? [] : null));
    tx.onabort = () => reject(tx.error);
  });
}
function write(store, method, value) {
  return new Promise((resolve, reject) => {
    const tx = transaction(store, 'readwrite');
    tx.objectStore(store)[method](value);
    tx.oncomplete = () => { reminderChanged(); resolve(value); };
    tx.onabort = () => reject(tx.error);
  });
}
export const dbGet = (store, key) => read(store, 'get', key);
export const dbGetAll = (store) => read(store, 'getAll');
export const dbPut = (store, value) => write(store, 'put', value);
export const dbDelete = (store, key) => write(store, 'delete', key);
export const dbClear = (store) => write(store, 'clear');
export function dbMutateRecords(reads, reduce) {
  if (!Array.isArray(reads) || !reads.length || typeof reduce !== 'function') throw new TypeError('Invalid session mutation');
  return new Promise((resolve, reject) => {
    const names = [...new Set(reads.map((item) => item.store))];
    const tx = transaction(names, 'readwrite');
    const rows = [];
    let remaining = reads.length;
    let result;
    tx.oncomplete = () => { reminderChanged(); resolve(result); };
    tx.onabort = () => reject(tx.error);
    reads.forEach((item, index) => {
      const req = item.all ? tx.objectStore(item.store).getAll() : tx.objectStore(item.store).get(item.key);
      req.onsuccess = () => {
        rows[index] = req.result ?? (item.all ? [] : null);
        if (--remaining) return;
        try {
          const update = reduce(rows);
          if (!update || typeof update.then === 'function') {
            if (update?.then) Promise.resolve(update).catch(() => {});
            throw new TypeError('Session reducer must be synchronous');
          }
          for (const entry of update.puts || []) tx.objectStore(entry.store).put(entry.value);
          result = update.result;
        } catch (error) { tx.abort(error); }
      };
    });
  });
}
export function dbUpdateRecord(store, key, reduce) {
  return dbMutateRecords([{ store, key }], ([raw]) => {
    const value = reduce(raw);
    if (value?.then) { Promise.resolve(value).catch(() => {}); throw new TypeError('Updater must be synchronous'); }
    return { puts: value == null ? [] : [{ store, value }], result: value };
  });
}
export async function clearAllData() { for (const name of Object.keys(keys)) await dbClear(name); }
export async function readAllStoresSnapshot() {
  return dbMutateRecords(Object.keys(keys).map((store) => ({ store, all: true })), (rows) => ({
    puts: [], result: Object.fromEntries(Object.keys(keys).map((name, index) => [name, rows[index]])),
  }));
}
export async function replaceAllStores(payload) {
  const meta = Object.values(payload).filter((row) => row && !Array.isArray(row) && typeof row.key === 'string');
  const rows = { tasks: payload.tasks || [], collection: payload.collection || [], expeditions: payload.expeditions || [], habits: payload.habits || [], meta };
  return new Promise((resolve, reject) => {
    const tx = transaction(Object.keys(keys), 'readwrite');
    tx.oncomplete = () => { reminderChanged(); resolve(); };
    tx.onabort = () => reject(tx.error);
    for (const name of Object.keys(keys)) {
      const store = tx.objectStore(name);
      store.clear();
      for (const value of rows[name]) store.put(value);
    }
  });
}
