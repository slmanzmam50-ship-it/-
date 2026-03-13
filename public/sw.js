// Basic Service Worker to satisfy PWA requirements
const CACHE_NAME = 'zamam-khaldy-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through strategy for now as we use Firestore/Cloud
  event.respondWith(fetch(event.request));
});
