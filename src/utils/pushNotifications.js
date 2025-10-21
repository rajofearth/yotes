/**
 * Push Notifications utility for Yotes PWA
 * Handles notification permissions, subscription, and management
 */

/**
 * Check if push notifications are supported
 * @returns {boolean} True if push notifications are supported
 */
export function checkPushNotificationSupport() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Get current notification permission status
 * @returns {string} Permission status ('default', 'granted', 'denied')
 */
export function getNotificationPermission() {
  if (!checkPushNotificationSupport()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request notification permission from the user
 * @returns {Promise<string>} Permission status after request
 */
export async function requestNotificationPermission() {
  if (!checkPushNotificationSupport()) {
    throw new Error('Push notifications not supported');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Subscribe to push notifications
 * @param {string} userId - User ID for the subscription
 * @returns {Promise<PushSubscription|null>} Push subscription or null if failed
 */
export async function subscribeToPush(userId) {
  if (!checkPushNotificationSupport()) {
    throw new Error('Push notifications not supported');
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    throw new Error(`Notification permission denied: ${permission}`);
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: getVapidPublicKey()
    });

    // Store subscription in backend
    await storeSubscription(userId, subscription);
    
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 * @returns {Promise<boolean>} True if unsubscribed successfully
 */
export async function unsubscribeFromPush() {
  if (!checkPushNotificationSupport()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      await removeStoredSubscription();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

/**
 * Get current push subscription
 * @returns {Promise<PushSubscription|null>} Current subscription or null
 */
export async function getCurrentSubscription() {
  if (!checkPushNotificationSupport()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Failed to get current subscription:', error);
    return null;
  }
}

/**
 * Show a local notification
 * @param {string} title - Notification title
 * @param {Object} options - Notification options
 * @returns {Promise<boolean>} True if notification was shown
 */
export async function showNotification(title, options = {}) {
  if (!checkPushNotificationSupport()) {
    return false;
  }

  const permission = getNotificationPermission();
  if (permission !== 'granted') {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-96x96.png',
      tag: 'yotes-notification',
      requireInteraction: false,
      ...options
    });
    return true;
  } catch (error) {
    console.error('Failed to show notification:', error);
    return false;
  }
}

/**
 * Get VAPID public key for push notifications
 * @returns {string} VAPID public key
 */
function getVapidPublicKey() {
  // This should be replaced with your actual VAPID public key
  // For now, return a placeholder
  return 'BEl62iUYgUivxIkv69yViEuiBIa40HI0F8HwQmU3Q3Y';
}

/**
 * Store push subscription in backend
 * @param {string} userId - User ID
 * @param {PushSubscription} subscription - Push subscription
 */
async function storeSubscription(userId, subscription) {
  try {
    // This would integrate with your Convex backend
    // For now, store locally
    localStorage.setItem('yotes-push-subscription', JSON.stringify({
      userId,
      subscription: subscription.toJSON(),
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Failed to store subscription:', error);
  }
}

/**
 * Remove stored push subscription
 */
async function removeStoredSubscription() {
  try {
    localStorage.removeItem('yotes-push-subscription');
  } catch (error) {
    console.error('Failed to remove stored subscription:', error);
  }
}

/**
 * Get stored push subscription
 * @returns {Object|null} Stored subscription data or null
 */
export function getStoredSubscription() {
  try {
    const stored = localStorage.getItem('yotes-push-subscription');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to get stored subscription:', error);
    return null;
  }
}

