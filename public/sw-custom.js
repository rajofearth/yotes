// Custom Service Worker for Yotes PWA
// Handles Background Sync, Periodic Background Sync, and Push Notifications

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkOnly } from 'workbox-strategies';

// Precache and route static assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Runtime caching strategies
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-googleapis',
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => `${request.url}`,
        cacheWillUpdate: async ({ response }) => response.status === 200 ? response : null,
      },
    ],
  })
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-gstatic',
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => `${request.url}`,
        cacheWillUpdate: async ({ response }) => response.status === 200 ? response : null,
      },
    ],
  })
);

// Do NOT cache app shell routes that may render decrypted content
registerRoute(
  ({ url }) => url.origin === self.location.origin && /^\/(?:$|note|settings|create|section)/.test(url.pathname),
  new NetworkOnly()
);

// Background Sync Event Handler
self.addEventListener('sync', event => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'sync-queue') {
    event.waitUntil(processSyncQueue());
  }
});

// Periodic Background Sync Event Handler
self.addEventListener('periodicsync', event => {
  console.log('Periodic sync event:', event.tag);
  
  if (event.tag === 'auto-backup') {
    event.waitUntil(processAutoBackup());
  }
});

// Push Notification Event Handler
self.addEventListener('push', event => {
  console.log('Push notification received:', event);
  
  const options = {
    body: 'You have a new notification from Yotes',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-96x96.png',
    tag: 'yotes-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open Yotes',
        icon: '/android-chrome-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/favicon-96x96.png'
      }
    ]
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.title = data.title || 'Yotes';
      options.tag = data.tag || options.tag;
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification('Yotes', options)
  );
});

// Notification Click Event Handler
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Default action or 'open' action
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === self.location.origin && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no existing window, open a new one
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Message Event Handler for communication with main thread
self.addEventListener('message', event => {
  console.log('Service worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    // Return a simple version identifier
    event.ports[0].postMessage({ version: '1.0.0' });
  }
});

// Process sync queue from IndexedDB
async function processSyncQueue() {
  try {
    console.log('Processing sync queue...');
    
    // Open IndexedDB
    const db = await openIndexedDB();
    const transaction = db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const items = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!items || items.length === 0) {
      console.log('No items in sync queue');
      return;
    }

    console.log(`Processing ${items.length} sync queue items`);

    // Process each item
    for (const item of items) {
      try {
        await processSyncItem(item);
        
        // Remove successful item from queue
        const deleteTransaction = db.transaction(['syncQueue'], 'readwrite');
        const deleteStore = deleteTransaction.objectStore('syncQueue');
        deleteStore.delete(item.id);
        
        console.log(`Successfully processed sync item ${item.id}`);
      } catch (error) {
        console.error(`Failed to process sync item ${item.id}:`, error);
        // Keep failed items in queue for retry
      }
    }

    // Notify main thread of sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        success: true
      });
    });

  } catch (error) {
    console.error('Error processing sync queue:', error);
    
    // Notify main thread of sync failure
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        success: false,
        error: error.message
      });
    });
  }
}

// Process individual sync item
async function processSyncItem(item) {
  console.log('Processing sync item:', item);
  
  // This would integrate with your Convex API
  // For now, we'll simulate the API call
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operation: item.operation,
      data: item.data,
      timestamp: item.timestamp
    })
  });

  if (!response.ok) {
    throw new Error(`Sync API call failed: ${response.status}`);
  }

  return response.json();
}

// Process auto backup
async function processAutoBackup() {
  try {
    console.log('Processing auto backup...');
    
    // Notify main thread to trigger backup
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'TRIGGER_BACKUP',
        source: 'periodic-sync'
      });
    });

    // Show notification about backup
    await self.registration.showNotification('Yotes', {
      body: 'Automatic backup completed',
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-96x96.png',
      tag: 'backup-complete',
      requireInteraction: false
    });

  } catch (error) {
    console.error('Error processing auto backup:', error);
    
    // Show error notification
    await self.registration.showNotification('Yotes', {
      body: 'Automatic backup failed',
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-96x96.png',
      tag: 'backup-error',
      requireInteraction: false
    });
  }
}

// Helper function to open IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('YotesDB', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Service Worker Installation
self.addEventListener('install', event => {
  console.log('Service worker installing...');
  self.skipWaiting();
});

// Service Worker Activation
self.addEventListener('activate', event => {
  console.log('Service worker activating...');
  event.waitUntil(self.clients.claim());
});

