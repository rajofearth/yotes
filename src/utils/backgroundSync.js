/**
 * Background Sync API utility for Yotes PWA
 * Provides fallback support for browsers that don't support Background Sync
 */

/**
 * Check if Background Sync is supported in the current browser
 * @returns {boolean} True if Background Sync is supported
 */
export function checkSyncSupport() {
  return 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;
}

/**
 * Register a background sync event
 * @param {string} tag - Unique tag for the sync event
 * @returns {Promise<boolean>} True if registration was successful
 */
export async function registerSync(tag) {
  if (!checkSyncSupport()) {
    console.warn('Background Sync not supported, using fallback');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (!registration.sync) {
      console.warn('Background Sync not available in service worker registration');
      return false;
    }

    await registration.sync.register(tag);
    console.log(`Background sync registered with tag: ${tag}`);
    return true;
  } catch (error) {
    console.error('Failed to register background sync:', error);
    return false;
  }
}

/**
 * Get the current service worker registration
 * @returns {Promise<ServiceWorkerRegistration|null>} Service worker registration or null
 */
export async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch (error) {
    console.error('Failed to get service worker registration:', error);
    return null;
  }
}

/**
 * Send a message to the service worker
 * @param {Object} message - Message to send to service worker
 * @returns {Promise<boolean>} True if message was sent successfully
 */
export async function sendMessageToServiceWorker(message) {
  const registration = await getServiceWorkerRegistration();
  
  if (!registration || !registration.active) {
    console.warn('No active service worker to send message to');
    return false;
  }

  try {
    registration.active.postMessage(message);
    return true;
  } catch (error) {
    console.error('Failed to send message to service worker:', error);
    return false;
  }
}

/**
 * Listen for messages from the service worker
 * @param {Function} callback - Callback function to handle messages
 * @returns {Function} Cleanup function to remove the listener
 */
export function listenForServiceWorkerMessages(callback) {
  if (!('serviceWorker' in navigator)) {
    return () => {};
  }

  const handleMessage = (event) => {
    if (event.data && typeof event.data === 'object') {
      callback(event.data);
    }
  };

  navigator.serviceWorker.addEventListener('message', handleMessage);

  // Return cleanup function
  return () => {
    navigator.serviceWorker.removeEventListener('message', handleMessage);
  };
}

/**
 * Queue an operation for background sync when offline
 * @param {string} operation - Type of operation (create, update, delete)
 * @param {Object} data - Data to sync
 * @param {string} tag - Sync tag (defaults to 'sync-queue')
 * @returns {Promise<boolean>} True if queued successfully
 */
export async function queueForBackgroundSync(operation, data, tag = 'sync-queue') {
  try {
    // Import IndexedDB utilities
    const { addToSyncQueue } = await import('./indexedDB.js');
    
    // Add to sync queue
    await addToSyncQueue({
      operation,
      data,
      timestamp: Date.now()
    });

    // Register background sync if supported
    const syncRegistered = await registerSync(tag);
    
    if (!syncRegistered) {
      console.log('Background sync not available, operation queued for manual sync');
    }

    return true;
  } catch (error) {
    console.error('Failed to queue operation for background sync:', error);
    return false;
  }
}

/**
 * Check if the app is currently online
 * @returns {boolean} True if online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Listen for online/offline status changes
 * @param {Function} onlineCallback - Called when app comes online
 * @param {Function} offlineCallback - Called when app goes offline
 * @returns {Function} Cleanup function to remove listeners
 */
export function listenForOnlineStatus(onlineCallback, offlineCallback) {
  const handleOnline = () => {
    console.log('App is online');
    onlineCallback();
  };

  const handleOffline = () => {
    console.log('App is offline');
    offlineCallback();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Get sync queue status from IndexedDB
 * @returns {Promise<Array>} Array of queued sync operations
 */
export async function getSyncQueueStatus() {
  try {
    const { getSyncQueue } = await import('./indexedDB.js');
    return await getSyncQueue();
  } catch (error) {
    console.error('Failed to get sync queue status:', error);
    return [];
  }
}

/**
 * Clear all items from sync queue
 * @returns {Promise<boolean>} True if cleared successfully
 */
export async function clearSyncQueue() {
  try {
    const { getSyncQueue, clearSyncItem } = await import('./indexedDB.js');
    const items = await getSyncQueue();
    
    for (const item of items) {
      await clearSyncItem(item.id);
    }
    
    console.log(`Cleared ${items.length} items from sync queue`);
    return true;
  } catch (error) {
    console.error('Failed to clear sync queue:', error);
    return false;
  }
}

