// src/utils/indexedDB.js
const DB_NAME = 'YotesDB';
const DB_VERSION = 2;
const NOTES_STORE = 'notes';
const TAGS_STORE = 'tags';
const SYNC_STORE = 'syncQueue';
const SESSION_STORE = 'sessions';

let dbPromise = null;
let activeConnections = new Set(); // Track all open connections

export const openDB = () => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        //console.log(`Upgrading DB from version ${oldVersion} to ${DB_VERSION}`);

        if (oldVersion < 1) {
          db.createObjectStore(NOTES_STORE, { keyPath: 'key' });
          db.createObjectStore(TAGS_STORE, { keyPath: 'key' });
          db.createObjectStore(SESSION_STORE, { keyPath: 'key' });
        }
        if (oldVersion < 2) {
          db.createObjectStore(SYNC_STORE, { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        activeConnections.add(db);
        db.onclose = () => activeConnections.delete(db);
        //console.log('Database opened successfully');
        resolve(db);
      };
      request.onerror = () => {
        console.error('Database open failed:', request.error);
        reject(request.error);
      };
    });
  }
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
    const request = store.add({ ...operation, timestamp: Date.now() });

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

    request.onsuccess = () => resolve(request.result || []);
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

export const deleteDB = async () => {
  // Close all active connections
  if (dbPromise) {
    const db = await dbPromise;
    activeConnections.forEach((connection) => {
      if (connection !== db) {
        connection.close();
      }
    });
    db.close();
    activeConnections.clear();
    dbPromise = null;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => {
      //console.log('YotesDB deleted successfully');
      resolve();
    };
    request.onerror = () => {
      console.error('Failed to delete YotesDB:', request.error);
      reject(request.error);
    };
    request.onblocked = () => {
      console.warn('Delete YotesDB blocked; attempting to resolve...');
      // Force close any lingering connections and retry
      activeConnections.forEach((connection) => connection.close());
      activeConnections.clear();
      setTimeout(() => {
        const retryRequest = indexedDB.deleteDatabase(DB_NAME);
        retryRequest.onsuccess = () => {
          //console.log('YotesDB deleted successfully on retry');
          resolve();
        };
        retryRequest.onerror = () => reject(retryRequest.error);
        retryRequest.onblocked = () => reject(new Error('Database deletion still blocked after retry'));
      }, 500); // Brief delay to allow connections to close
    };
  });
};

export const pullChangesFromDrive = async (driveApi, folderIds) => {
  if (!driveApi || !folderIds) {
    console.log('Drive API or folder IDs not available, skipping pull');
    return { notes: null, tags: null };
  }

  try {
    //console.log('Pulling changes from Google Drive...');
    const tagsResponse = await driveApi.listFiles(folderIds.tags);
    const tagsFile = tagsResponse.files.find((f) => f.name === 'tags.json');
    let remoteTags = [];
    if (tagsFile) {
      const [tagsBlob] = await driveApi.downloadFiles([tagsFile.id]);
      remoteTags = tagsBlob ? JSON.parse(await tagsBlob.text()) : [];
    }

    const notesResponse = await driveApi.listFiles(folderIds.notes);
    let remoteNotes = [];
    if (notesResponse.files.length) {
      const notesBlobs = await driveApi.downloadFiles(notesResponse.files.map((f) => f.id));
      const validBlobs = notesBlobs.filter((blob) => blob);
      remoteNotes = (await Promise.all(
        validBlobs.map((blob) => blob.text().then(JSON.parse).catch(() => null))
      )).filter((n) => n?.id && n.createdAt && n.updatedAt);
    }

    const localNotes = (await getFromDB(NOTES_STORE, 'notes_data')) || [];
    const localTags = (await getFromDB(TAGS_STORE, 'tags_data')) || [];

    const mergedNotes = mergeData(localNotes, remoteNotes, 'updatedAt');
    const mergedTags = mergeData(localTags, remoteTags, 'id');

    await setInDB(NOTES_STORE, 'notes_data', mergedNotes);
    await setInDB(TAGS_STORE, 'tags_data', mergedTags);
    await setInDB(NOTES_STORE, 'notes_timestamp', Date.now());
    await setInDB(TAGS_STORE, 'tags_timestamp', Date.now());

    //console.log('Pulled and merged changes from Drive:', { notes: mergedNotes.length, tags: mergedTags.length });
    return { notes: mergedNotes, tags: mergedTags };
  } catch (err) {
    console.error('Failed to pull changes from Drive:', err);
    return { notes: null, tags: null };
  }
};

const mergeData = (local, remote, timestampField) => {
  const combined = [...local];
  remote.forEach((remoteItem) => {
    const localIndex = combined.findIndex((localItem) => localItem.id === remoteItem.id);
    if (localIndex === -1) {
      combined.push(remoteItem);
    } else if (timestampField && new Date(remoteItem[timestampField]) > new Date(combined[localIndex][timestampField])) {
      combined[localIndex] = remoteItem;
    }
  });
  return combined;
};