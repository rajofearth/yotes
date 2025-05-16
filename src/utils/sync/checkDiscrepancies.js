// Module: src/utils/sync/checkDiscrepancies.js

export async function checkDiscrepancies(driveApi, folderIds, localNotes, localTags, forceDeep = false) {
  if (!navigator.onLine || !driveApi || !folderIds) return false;

  // 1) List remote tags file
  let remoteTags = [];
  try {
    const tagsRes = await driveApi.listFiles(folderIds.tags);
    const tagsFile = tagsRes.files.find(f => f.name === 'tags.json');
    if (tagsFile) {
      const [blob] = await driveApi.downloadFiles([tagsFile.id]);
      remoteTags = JSON.parse(await blob.text());
    }
  } catch (err) {
    console.error('Error checking remote tags:', err);
    return true; // assume discrepancy on error
  }

  // Quick comparison: count
  if (remoteTags.length !== localTags.length) return true;
  
  // Timestamp comparison if deep
  if (forceDeep) {
    const localMap = new Map(localTags.map(t => [t.id, t]));
    for (const rt of remoteTags) {
      const lt = localMap.get(rt.id);
      if (!lt || lt.updatedAt !== rt.updatedAt) return true;
    }
  }

  // 2) List remote note metadata
  let remoteNoteFiles = [];
  try {
    const notesRes = await driveApi.listFiles(folderIds.notes);
    remoteNoteFiles = notesRes.files.filter(f => f.name.endsWith('.json'));
  } catch (err) {
    console.error('Error checking remote notes:', err);
    return true;
  }

  // Quick count compare
  if (remoteNoteFiles.length !== localNotes.length) return true;

  // Deep sample compare timestamps if forced
  if (forceDeep && remoteNoteFiles.length > 0) {
    const localMap = new Map(localNotes.map(n => [n.id, n]));
    const samples = Math.min(5, remoteNoteFiles.length);
    const indices = new Set();
    while (indices.size < samples) indices.add(Math.floor(Math.random() * remoteNoteFiles.length));
    for (const idx of indices) {
      const file = remoteNoteFiles[idx];
      const noteId = file.name.replace('.json','');
      const lt = localMap.get(noteId);
      if (!lt) return true;
      try {
        const [blob] = await driveApi.downloadFiles([file.id]);
        const rt = JSON.parse(await blob.text());
        if (lt.updatedAt !== rt.updatedAt) return true;
      } catch (err) {
        console.error('Error deep-checking note:', noteId, err);
        return true;
      }
    }
  }

  // No discrepancies
  return false;
} 