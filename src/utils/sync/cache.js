import { getFromDB, setInDB } from '../indexedDB';

export const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export async function shouldRefreshCache(storeName) {
  try {
    const timestamp = await getFromDB(storeName, `${storeName}_timestamp`);
    return !timestamp || Date.now() - timestamp > CACHE_DURATION;
  } catch (err) {
    console.warn(`Cache check error for ${storeName}:`, err);
    return true;
  }
}

export async function updateCacheTimestamp(storeName) {
  try {
    await setInDB(storeName, `${storeName}_timestamp`, Date.now());
  } catch (err) {
    console.error(`Error setting cache timestamp for ${storeName}:`, err);
  }
} 