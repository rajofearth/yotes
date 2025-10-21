/**
 * Periodic Background Sync API utility for Yotes PWA
 * Provides fallback support for browsers that don't support Periodic Background Sync
 */

/**
 * Check if Periodic Background Sync is supported in the current browser
 * @returns {boolean} True if Periodic Background Sync is supported
 */
export function checkPeriodicSyncSupport() {
  return 'serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype;
}

/**
 * Register a periodic background sync event
 * @param {string} tag - Unique tag for the periodic sync event
 * @param {Object} options - Options for periodic sync
 * @param {number} options.minInterval - Minimum interval in milliseconds (default: 6 hours)
 * @returns {Promise<boolean>} True if registration was successful
 */
export async function registerPeriodicSync(tag, options = {}) {
  if (!checkPeriodicSyncSupport()) {
    console.warn('Periodic Background Sync not supported, using fallback');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (!registration.periodicSync) {
      console.warn('Periodic Background Sync not available in service worker registration');
      return false;
    }

    const { minInterval = 6 * 60 * 60 * 1000 } = options; // Default 6 hours

    await registration.periodicSync.register(tag, {
      minInterval
    });
    
    console.log(`Periodic background sync registered with tag: ${tag}, interval: ${minInterval}ms`);
    return true;
  } catch (error) {
    console.error('Failed to register periodic background sync:', error);
    return false;
  }
}

/**
 * Unregister a periodic background sync event
 * @param {string} tag - Tag of the periodic sync event to unregister
 * @returns {Promise<boolean>} True if unregistration was successful
 */
export async function unregisterPeriodicSync(tag) {
  if (!checkPeriodicSyncSupport()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (!registration.periodicSync) {
      return false;
    }

    await registration.periodicSync.unregister(tag);
    console.log(`Periodic background sync unregistered with tag: ${tag}`);
    return true;
  } catch (error) {
    console.error('Failed to unregister periodic background sync:', error);
    return false;
  }
}

/**
 * Get the status of a periodic background sync registration
 * @param {string} tag - Tag of the periodic sync event
 * @returns {Promise<Object|null>} Status object or null if not supported
 */
export async function getPeriodicSyncStatus(tag) {
  if (!checkPeriodicSyncSupport()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (!registration.periodicSync) {
      return null;
    }

    const state = await registration.periodicSync.getTags();
    return {
      registered: state.includes(tag),
      tags: state
    };
  } catch (error) {
    console.error('Failed to get periodic sync status:', error);
    return null;
  }
}

/**
 * Check if periodic background sync permissions are granted
 * @returns {Promise<string>} Permission state ('granted', 'denied', 'prompt', or 'unsupported')
 */
export async function checkPeriodicSyncPermission() {
  if (!checkPeriodicSyncSupport()) {
    return 'unsupported';
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (!registration.periodicSync) {
      return 'unsupported';
    }

    // Check if we can register a test sync
    try {
      await registration.periodicSync.register('test-permission', { minInterval: 24 * 60 * 60 * 1000 });
      await registration.periodicSync.unregister('test-permission');
      return 'granted';
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        return 'denied';
      }
      return 'prompt';
    }
  } catch (error) {
    console.error('Failed to check periodic sync permission:', error);
    return 'unsupported';
  }
}

/**
 * Request periodic background sync permission
 * @returns {Promise<string>} Permission state after request
 */
export async function requestPeriodicSyncPermission() {
  const currentPermission = await checkPeriodicSyncPermission();
  
  if (currentPermission === 'granted') {
    return 'granted';
  }

  if (currentPermission === 'unsupported') {
    return 'unsupported';
  }

  // For browsers that support it, we need to register a periodic sync to trigger permission
  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (!registration.periodicSync) {
      return 'unsupported';
    }

    // Try to register with a long interval to trigger permission
    await registration.periodicSync.register('permission-request', { 
      minInterval: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Immediately unregister since this was just for permission
    await registration.periodicSync.unregister('permission-request');
    
    return 'granted';
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      return 'denied';
    }
    return 'prompt';
  }
}

/**
 * Create a fallback timer for periodic tasks when Periodic Background Sync is not supported
 * @param {string} tag - Unique tag for the timer
 * @param {Function} callback - Function to call periodically
 * @param {number} interval - Interval in milliseconds
 * @returns {Object} Timer control object with start, stop, and isRunning methods
 */
export function createFallbackTimer(tag, callback, interval) {
  let timerId = null;
  let isRunning = false;

  return {
    start() {
      if (isRunning) {
        console.warn(`Timer ${tag} is already running`);
        return;
      }

      timerId = setInterval(callback, interval);
      isRunning = true;
      console.log(`Fallback timer ${tag} started with interval ${interval}ms`);
    },

    stop() {
      if (!isRunning) {
        console.warn(`Timer ${tag} is not running`);
        return;
      }

      clearInterval(timerId);
      timerId = null;
      isRunning = false;
      console.log(`Fallback timer ${tag} stopped`);
    },

    get isRunning() {
      return isRunning;
    },

    get tag() {
      return tag;
    }
  };
}

/**
 * Enhanced periodic sync manager that handles both native and fallback implementations
 * @param {string} tag - Unique tag for the periodic sync
 * @param {Function} callback - Function to call periodically
 * @param {Object} options - Options for periodic sync
 * @param {number} options.interval - Interval in milliseconds (default: 6 hours)
 * @param {boolean} options.autoStart - Whether to start automatically (default: true)
 * @returns {Object} Manager object with control methods
 */
export function createPeriodicSyncManager(tag, callback, options = {}) {
  const { interval = 6 * 60 * 60 * 1000, autoStart = true } = options;
  
  let nativeSyncRegistered = false;
  let fallbackTimer = null;
  let isActive = false;

  const manager = {
    async start() {
      if (isActive) {
        console.warn(`Periodic sync manager ${tag} is already active`);
        return;
      }

      // Try native periodic sync first
      const nativeSupported = await registerPeriodicSync(tag, { minInterval: interval });
      
      if (nativeSupported) {
        nativeSyncRegistered = true;
        console.log(`Using native periodic sync for ${tag}`);
      } else {
        // Fall back to timer-based approach
        fallbackTimer = createFallbackTimer(tag, callback, interval);
        fallbackTimer.start();
        console.log(`Using fallback timer for ${tag}`);
      }

      isActive = true;
    },

    async stop() {
      if (!isActive) {
        console.warn(`Periodic sync manager ${tag} is not active`);
        return;
      }

      if (nativeSyncRegistered) {
        await unregisterPeriodicSync(tag);
        nativeSyncRegistered = false;
      }

      if (fallbackTimer) {
        fallbackTimer.stop();
        fallbackTimer = null;
      }

      isActive = false;
      console.log(`Periodic sync manager ${tag} stopped`);
    },

    async restart() {
      await manager.stop();
      await manager.start();
    },

    get isActive() {
      return isActive;
    },

    get isNative() {
      return nativeSyncRegistered;
    },

    get isFallback() {
      return fallbackTimer !== null && fallbackTimer.isRunning;
    },

    get tag() {
      return tag;
    }
  };

  // Auto-start if requested
  if (autoStart) {
    manager.start();
  }

  return manager;
}

