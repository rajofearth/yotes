import { getFromDB, setInDB, NOTES_STORE, TAGS_STORE } from '../indexedDB';
import { shouldRefreshCache, updateCacheTimestamp } from './cache';
import { mergeData } from '../indexedDB';

export async function pullChangesFromDrive(driveApi, folderIds, force = false) {
  const isOnline = navigator.onLine;
  if (!isOnline) {
    const cachedNotes = (await getFromDB(NOTES_STORE, 'notes_data')) || [];
    const cachedTags = (await getFromDB(TAGS_STORE, 'tags_data')) || [];
    return { notes: cachedNotes, tags: cachedTags, cacheUsed: true, offline: true };
  }
  if (!driveApi || !folderIds) return { notes: null, tags: null, cacheUsed: false, offline: false };

  // Load local cache
  let mergedNotes = (await getFromDB(NOTES_STORE, 'notes_data')) || [];
  let mergedTags = (await getFromDB(TAGS_STORE, 'tags_data')) || [];

  const notesCacheFresh = !force && !(await shouldRefreshCache(NOTES_STORE));
  const tagsCacheFresh = !force && !(await shouldRefreshCache(TAGS_STORE));

  // If both caches are fresh and not forced, return early
  if (notesCacheFresh && tagsCacheFresh) {
    return { notes: mergedNotes, tags: mergedTags, cacheUsed: true, offline: false };
  }

  // Fetch remote tags if needed
  if (force || !tagsCacheFresh) {
    let remoteTags = [];
    try {
      const res = await driveApi.listFiles(folderIds.tags);
      const file = res.files.find(f => f.name === 'tags.json');
      if (file) {
        const [blob] = await driveApi.downloadFiles([file.id]);
        if (blob) remoteTags = JSON.parse(await blob.text());
      }
    } catch (e) {
      console.error('Error fetching remote tags:', e);
      if (!navigator.onLine) return { notes: mergedNotes, tags: mergedTags, cacheUsed: true, offline: true };
    }
    mergedTags = mergeData(mergedTags, remoteTags, 'id');
    await setInDB(TAGS_STORE, 'tags_data', mergedTags);
    await updateCacheTimestamp(TAGS_STORE);
  }

  // Fetch remote notes if needed
  if (force || !notesCacheFresh) {
    let remoteNotes = [];
    try {
      const res = await driveApi.listFiles(folderIds.notes);
      const fileIds = res.files.filter(f => f.name.endsWith('.json')).map(f => f.id);
      if (fileIds.length) {
        const blobs = await driveApi.downloadFiles(fileIds);
        const notesData = await Promise.all(
          blobs.map(async (blob) => {
            try { return JSON.parse(await blob.text()); } catch { return null; }
          })
        );
        remoteNotes = notesData.filter(n => n !== null);
      }
    } catch (e) {
      console.error('Error fetching remote notes:', e);
      if (!navigator.onLine) return { notes: mergedNotes, tags: mergedTags, cacheUsed: true, offline: true };
    }
    mergedNotes = mergeData(mergedNotes, remoteNotes, 'id');
    await setInDB(NOTES_STORE, 'notes_data', mergedNotes);
    await updateCacheTimestamp(NOTES_STORE);
  }

  return { notes: mergedNotes, tags: mergedTags, cacheUsed: false, offline: false };
} 