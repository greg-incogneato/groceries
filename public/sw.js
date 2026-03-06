// Minimal service worker — enables "Add to Home Screen" on iOS/Android
// No offline caching (app needs the server running to function)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
