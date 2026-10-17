// Serviços Angola - keeps the app on the phone so it opens fast on slow internet.
//
// - After the first visit, all app files (code, images, fonts) are on the phone
//   and the app opens from there: almost instant, even on 2G or offline.
// - Each version is saved complete (list filled in automatically when the app
//   is built), so old and new files are never mixed.
// - A new version downloads in the background; it is used the next time the app
//   is opened, or straight away when the person taps "Atualizar".
// - Data from Supabase (professionals, messages...) is NOT saved here: it always
//   comes fresh from the internet.
const VERSION = '46cbb8c50c05';
const FILES = [
".last_build_id",
"assets/AssetManifest.bin",
"assets/AssetManifest.bin.json",
"assets/FontManifest.json",
"assets/assets/images/app_icon.png",
"assets/assets/images/eco_logo.png",
"assets/fonts/MaterialIcons-Regular.otf",
"assets/packages/cupertino_icons/assets/CupertinoIcons.ttf",
"assets/shaders/ink_sparkle.frag",
"assets/shaders/stretch_effect.frag",
"favicon.png",
"flutter.js",
"flutter_bootstrap.js",
"icons/Icon-192.png",
"icons/Icon-512.png",
"icons/Icon-maskable-192.png",
"icons/Icon-maskable-512.png",
"icons/apple-touch-icon.png",
"index.html",
"main.dart.js",
"main.dart.js_1.part.js",
"manifest.json",
"version.json"
]; // every file of this version (relative to the app address)
const APP_CACHE = 'sa-app-' + VERSION;
const CDN_CACHE = 'sa-cdn-v1'; // Flutter engine + fonts from Google: their addresses never change
const CDN = ['https://www.gstatic.com/flutter-canvaskit/', 'https://fonts.gstatic.com/'];

const scope = () => new URL(self.registration.scope);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    await cache.addAll(FILES.map((f) => new Request(new URL(f, scope()), { cache: 'reload' })));
  })());
  // No skipWaiting here: the running app keeps its own (complete) version.
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting(); // person tapped "Atualizar"
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('sa-app-') && key !== APP_CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

async function fromCache(request, cacheName, key) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(key || request, { ignoreSearch: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && request.method === 'GET') cache.put(key || request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (CDN.some((prefix) => request.url.startsWith(prefix))) {
    event.respondWith(fromCache(request, CDN_CACHE));
    return;
  }
  const url = new URL(request.url);
  const base = scope();
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return; // Supabase etc.: online
  const path = url.pathname.slice(base.pathname.length);
  if (path.startsWith('download/') || path === 'sa_sw.js') return; // big Android files: never saved here

  if (request.mode === 'navigate' || path === '') {
    event.respondWith(fromCache(request, APP_CACHE, new URL('index.html', base).toString()));
    return;
  }
  event.respondWith(fromCache(request, APP_CACHE));
});
