// Real IndexedDB in an isolated test namespace, shared only by the two harness frames.
const databaseName = new URL(location.href).searchParams.get('db');
if (!/^QuestNoteTest-M2A-[a-f0-9-]+$/.test(databaseName || '')) throw new Error('Invalid test database name');
if (navigator.serviceWorker?.controller) throw new Error('Use a fresh localhost origin without an app SW');
const nativeOpen = indexedDB.open.bind(indexedDB);
indexedDB.open = (name, version) => {
  if (!['QuestNoteDB', 'QuestNotePreviewDB'].includes(name)) throw new Error('Unexpected database request');
  return nativeOpen(databaseName, version);
};
const [storage, gacha, rewards, collection, unlock, backup] = await Promise.all([
  import('../src/db.js'), import('../src/gachaService.js'), import('../src/rewardService.js'),
  import('../src/collectionService.js'), import('../src/poolUnlockService.js'), import('../src/backupService.js'),
]);
const db = await storage.openDB();
if (db.name !== databaseName) throw new Error('Isolation failed');
const nativePut = IDBObjectStore.prototype.put;
let fault = null;
let putCount = 0;
let sawRequestSuccess = false;
IDBObjectStore.prototype.put = function (...args) {
  if (this.transaction.db.name !== databaseName) throw new Error('Test attempted to write outside isolated DB');
  const selected = fault && ++putCount === fault.at;
  if (selected && fault.kind === 'throw') throw new DOMException('Injected put failure', 'DataCloneError');
  const request = nativePut.apply(this, args);
  if (selected && fault.kind === 'abort') {
    request.addEventListener('success', () => { sawRequestSuccess = true; this.transaction.abort(); });
  }
  return request;
};
globalThis.questnoteTestClient = {
  storage, gacha, rewards, collection, unlock, backup, databaseName,
  random(value) { Math.random = () => value; },
  fault(value) { fault = value; putCount = 0; sawRequestSuccess = false; },
  get requestSucceeded() { return sawRequestSuccess; },
  close() { db.close(); IDBObjectStore.prototype.put = nativePut; },
};
parent.postMessage({ type: 'M2A_CLIENT_READY', databaseName }, location.origin);
