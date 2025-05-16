const DB_NAME = 'YotesDB';
const DB_VERSION = 2;
export const NOTES_STORE = 'notes';
export const TAGS_STORE = 'tags';
const SYNC_STORE = 'syncQueue';
const SESSION_STORE = 'sessions';

let dbPromise = null;
let activeConnections = new Set();

export const openDB = () => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') { return reject(new Error('IndexedDB not supported')); }
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = event.target.result; const oldVersion = event.oldVersion;
                if (oldVersion < 1) {
                    if (!db.objectStoreNames.contains(NOTES_STORE)) db.createObjectStore(NOTES_STORE, { keyPath: 'key' });
                    if (!db.objectStoreNames.contains(TAGS_STORE)) db.createObjectStore(TAGS_STORE, { keyPath: 'key' });
                    if (!db.objectStoreNames.contains(SESSION_STORE)) db.createObjectStore(SESSION_STORE, { keyPath: 'key' });
                }
                if (oldVersion < 2) {
                    if (!db.objectStoreNames.contains(SYNC_STORE)) db.createObjectStore(SYNC_STORE, { keyPath: 'id', autoIncrement: true });
                }
            };
            request.onsuccess = () => {
                const db = request.result; activeConnections.add(db);
                db.onclose = () => activeConnections.delete(db); resolve(db);
            };
            request.onerror = () => reject(request.error);
            request.onblocked = () => { console.warn("IndexedDB open blocked, maybe due to other tabs?"); reject(new Error("IndexedDB blocked")); };
        });
    }
    return dbPromise;
};

const performTransaction = async (storeName, mode, action) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        try {
            if (!db.objectStoreNames.contains(storeName)) { return reject(new Error(`Store ${storeName} not found`)); }
            const transaction = db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            action(store, resolve, reject);
            transaction.onerror = (event) => reject(transaction.error || event.target.error);
            transaction.onabort = (event) => reject(transaction.error || event.target.error || new Error("Transaction aborted"));
        } catch (err) { reject(err) }
    });
};

export const getFromDB = (storeName, key) => performTransaction(storeName, 'readonly', (store, resolve, reject) => {
    try {
        const request = store.get(key);
        request.onsuccess = () => {
            const result = request.result ? request.result.value : null;
            if (storeName === NOTES_STORE && key === 'notes_data') {
                console.log(`IndexedDB: Retrieved ${result ? (Array.isArray(result) ? result.length : 1) : 0} items from ${storeName}/${key}`);
            }
            resolve(result);
        };
        request.onerror = (event) => {
            console.error(`IndexedDB: Error getting ${key} from ${storeName}:`, request.error || event.target.error);
            reject(request.error || event.target.error || new Error(`Failed to get ${key} from ${storeName}`));
        };
    } catch (err) {
        console.error(`IndexedDB: Exception getting ${key} from ${storeName}:`, err);
        reject(err);
    }
});

export const setInDB = (storeName, key, value) => performTransaction(storeName, 'readwrite', (store, resolve) => {
    store.put({ key, value }).onsuccess = resolve;
});

export const addToSyncQueue = (operation) => performTransaction(SYNC_STORE, 'readwrite', (store, resolve, reject) => {
    const request = store.add({ ...operation, timestamp: Date.now() });
    request.onsuccess = () => resolve(request.result); // Return the new ID
});

export const getSyncQueue = () => performTransaction(SYNC_STORE, 'readonly', (store, resolve) => {
    store.getAll().onsuccess = (event) => resolve(event.target.result || []);
});

export const clearSyncItem = (id) => performTransaction(SYNC_STORE, 'readwrite', (store, resolve) => {
    store.delete(id).onsuccess = resolve;
});

export const clearDB = async () => {
    try {
        const db = await openDB(); const stores = Array.from(db.objectStoreNames);
        await performTransaction(stores, 'readwrite', (store, resolve, reject, transaction) => {
             Promise.all(stores.map(name => new Promise((res, rej) => {
                 const req = transaction.objectStore(name).clear();
                 req.onsuccess = res; req.onerror = rej;
             }))).then(resolve).catch(reject);
        });
        sessionStorage.clear();
    } catch (err) { console.error("Error clearing DB:", err) }
};

export const deleteDB = async () => {
    if (dbPromise) {
        try {
            const db = await dbPromise; activeConnections.forEach(c => { try { c.close() } catch{} });
            activeConnections.clear(); dbPromise = null;
        } catch (err) { console.error("Error closing connections before delete:", err)}
    }
    if (typeof indexedDB === 'undefined') return;
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = resolve; request.onerror = reject;
        request.onblocked = () => {
            console.warn("IndexedDB deletion blocked, trying closing connections again.");
            activeConnections.forEach(c => { try { c.close() } catch{} }); activeConnections.clear();
            setTimeout(() => {
                const retry = indexedDB.deleteDatabase(DB_NAME);
                retry.onsuccess = resolve; retry.onerror = reject;
                retry.onblocked = () => reject(new Error('DB deletion still blocked'));
            }, 500);
        };
    });
};

const CACHE_DURATION = 15 * 60 * 1000;

const shouldRefreshCache = async (storeName) => {
    try { const timestamp = await getFromDB(storeName, `${storeName}_timestamp`); return !timestamp || Date.now() - timestamp > CACHE_DURATION; }
    catch (err) { console.warn(`Cache check error for ${storeName}:`, err); return true; }
};

export const mergeData = (localData = [], remoteData = [], idKey = 'id') => {
    // Create a map for quick lookup
    const dataMap = new Map();
    
    // Add all local data to map
    localData.forEach(item => dataMap.set(item[idKey], item));
    
    // Check remote data - keep newer versions
    remoteData.forEach(remoteItem => {
        const localItem = dataMap.get(remoteItem[idKey]);
        
        // If no local item or remote item is newer, use remote
        if (!localItem || new Date(remoteItem.updatedAt) > new Date(localItem.updatedAt)) {
            dataMap.set(remoteItem[idKey], remoteItem);
        }
    });
    
    // Convert map back to array
    return Array.from(dataMap.values());
};