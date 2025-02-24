// src/utils/indexedDB.js
const DB_NAME = 'YotesDB';
const DB_VERSION = 2; // Unified version across the app
const NOTES_STORE = 'notes';
const TAGS_STORE = 'tags';
const SYNC_STORE = 'syncQueue';
const SESSION_STORE = 'sessions';

let dbPromise = null;

export const openDB = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;
      console.log(`Upgrading DB from version ${oldVersion} to ${DB_VERSION}`);

      if (oldVersion < 1) {
        // Initial setup for version 1
        db.createObjectStore(NOTES_STORE, { keyPath: 'key' });
        db.createObjectStore(TAGS_STORE, { keyPath: 'key' });
        db.createObjectStore(SESSION_STORE, { keyPath: 'key' });
      }
      if (oldVersion < 2) {
        // Upgrade to version 2
        db.createObjectStore(SYNC_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => {
      console.log('Database opened successfully');
      resolve(request.result);
    };
    request.onerror = () => {
      console.error('Database open failed:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
};

export const getFromDB = async (storeName, key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result ? request.result.value : null);
    request.onerror = () => reject(request.error);
  });
};

export const setInDB = async (storeName, key, value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put({ key, value });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const addToSyncQueue = async (operation) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_STORE, 'readwrite');
    const store = transaction.objectStore(SYNC_STORE);
    const request = store.add(operation);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getSyncQueue = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_STORE, 'readonly');
    const store = transaction.objectStore(SYNC_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const clearSyncItem = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_STORE, 'readwrite');
    const store = transaction.objectStore(SYNC_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearDB = async () => {
  const db = await openDB();
  const stores = [SESSION_STORE, NOTES_STORE, TAGS_STORE, SYNC_STORE];
  stores.forEach((store) => {
    const transaction = db.transaction(store, 'readwrite');
    const objectStore = transaction.objectStore(store);
    objectStore.clear();
  });
  sessionStorage.clear();
};