/**
 * Minimal in-memory IndexedDB for Node tests of db.js: open/upgrade, keyPath stores,
 * get/getAll/put/delete/clear and transactions that commit all-or-nothing. Tests never
 * touch a browser's real IndexedDB.
 */
const clone = (value) => structuredClone(value);

export function createMemoryIndexedDB() {
  const databases = new Map();
  let failingStore = null;

  function request(tx, run) {
    const req = { result: undefined, error: null, onsuccess: null, onerror: null };
    tx.pending += 1;
    queueMicrotask(() => {
      if (tx.finished) return;
      try {
        req.result = run();
        req.onsuccess?.({ target: req });
      } catch (error) {
        req.error = error;
        req.onerror?.({ target: req });
        tx.abort(error);
      } finally {
        tx.pending -= 1;
        tx.settle();
      }
    });
    return req;
  }

  function createTransaction(db, names) {
    const working = new Map([...db.stores].map(([name, store]) => [name, { keyPath: store.keyPath, rows: new Map(store.rows) }]));
    const tx = {
      pending: 0, finished: false, error: null, oncomplete: null, onerror: null, onabort: null,
      objectStore(name) {
        if (!names.includes(name)) throw new Error(`Store ${name} is not in this transaction`);
        const store = working.get(name);
        return {
          get: (key) => request(tx, () => clone(store.rows.get(key))),
          getAll: () => request(tx, () => [...store.rows.values()].map(clone)),
          put(value) {
            if (failingStore === name) {
              failingStore = null;
              throw new DOMException('Simulated write failure', 'DataCloneError');
            }
            const row = clone(value);
            return request(tx, () => { store.rows.set(row[store.keyPath], row); return row[store.keyPath]; });
          },
          delete: (key) => request(tx, () => { store.rows.delete(key); }),
          clear: () => request(tx, () => { store.rows.clear(); }),
        };
      },
      abort(error = new DOMException('Transaction aborted', 'AbortError')) {
        if (tx.finished) return;
        tx.finished = true;
        tx.error = error;
        queueMicrotask(() => { tx.onerror?.({ target: tx }); tx.onabort?.({ target: tx }); });
      },
      settle() {
        if (tx.finished || tx.pending > 0) return;
        // Let request callbacks queue follow-up requests before committing.
        setTimeout(() => {
          if (tx.finished || tx.pending > 0) return;
          tx.finished = true;
          for (const name of names) db.stores.set(name, working.get(name));
          tx.oncomplete?.({ target: tx });
        }, 0);
      },
    };
    queueMicrotask(() => tx.settle());
    return tx;
  }

  function createDatabase() {
    const db = {
      stores: new Map(),
      objectStoreNames: { contains: (name) => db.stores.has(name) },
      createObjectStore(name, { keyPath }) { db.stores.set(name, { keyPath, rows: new Map() }); },
      transaction(storeNames) {
        return createTransaction(db, Array.isArray(storeNames) ? storeNames : [storeNames]);
      },
      close() {},
    };
    return db;
  }

  const indexedDB = {
    open(name) {
      const req = { result: null, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
      setTimeout(() => {
        let db = databases.get(name);
        if (!db) {
          db = createDatabase();
          databases.set(name, db);
          req.result = db;
          req.onupgradeneeded?.({ target: req });
        }
        req.result = db;
        req.onsuccess?.({ target: req });
      }, 0);
      return req;
    },
  };

  return {
    indexedDB,
    /** Empty every store of every database, like a fresh install. */
    wipe() {
      for (const db of databases.values()) for (const store of db.stores.values()) store.rows.clear();
    },
    /** Committed rows per store of the single open database. */
    dump() {
      const [db] = databases.values();
      return Object.fromEntries([...db.stores].map(([name, store]) => [name, [...store.rows.values()].map(clone)]));
    },
    /** Make the next put into this store throw synchronously, as a DataCloneError would. */
    failNextPut(storeName) { failingStore = storeName; },
  };
}
