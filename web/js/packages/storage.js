/** IndexedDB completes a package replacement in one transaction, including quota failures. */
export function createPackageStorage(indexedDB = globalThis.indexedDB, name = 'learn-language.packages.v1') {
  let connection;
  function open() {
    if (!connection) {
      connection = new Promise((resolve, reject) => {
        const request = indexedDB.open(name, 2);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('versionedPackages')) {
            request.result.createObjectStore('versionedPackages', {keyPath: ['id', 'version']});
          }
        };
        request.onerror = () => {connection = undefined; reject(request.error);};
        request.onblocked = () => {connection = undefined; reject(new Error('Close other app windows and retry.'));};
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {db.close(); connection = undefined;};
          resolve(db);
        };
      });
    }
    return connection;
  }
  async function transaction(mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('versionedPackages', mode);
      const request = action(tx.objectStore('versionedPackages'));
      tx.oncomplete = () => resolve(request?.result);
      tx.onabort = () => reject(tx.error || new Error('Package storage transaction aborted.'));
      tx.onerror = () => reject(tx.error || new Error('Package storage failed.'));
    });
  }
  return {
    get: (id, version) => transaction('readonly', store => store.get([id, version])),
    put: data => transaction('readwrite', store => store.put(data)),
    replaceMany: (records, keys=[]) => transaction('readwrite', store => {for(const [id,version] of keys)store.delete([id,version]);for(const record of records)store.put(record);}),
    list: async () => {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('versionedPackages', 'readonly');
        const request = tx.objectStore('versionedPackages').openCursor(), rows = [];
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          const {id, version, kind, targetLanguage, explanationLanguage, studyVersion, download} = cursor.value;
          rows.push({id, version, kind, targetLanguage, explanationLanguage, studyVersion, download, entryCount:cursor.value.entries?.length});
          cursor.continue();
        };
        tx.oncomplete = () => resolve(rows);
        tx.onabort = () => reject(tx.error || new Error('Could not read downloaded packages.'));
        tx.onerror = () => reject(tx.error || new Error('Could not read downloaded packages.'));
      });
    },
    removeMany: keys => transaction('readwrite', store => {for (const key of keys) store.delete(key);}),
  };
}
