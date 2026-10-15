// Bump this version whenever a cached app file changes.
// Updates wait for existing windows to close; never mix releases in an open session.
'use strict';
const CACHE_PREFIX = 'fitquest-shell-';
const CACHE_NAME = CACHE_PREFIX + '20261015-v10';
const APP_FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/fitville.css?v=20261015-legend",
  "js/config.js?v=20261015-rank-scenery",
  "js/progression.js?v=20261008-progression",
  "js/storage.js?v=20261014-two-swaps",
  "js/intro.js?v=20261013-intro-module",
  "js/achievements.js?v=20261015-legend",
  "js/save-manager.js?v=20261015-module",
  "js/developer.js?v=20261015-module",
  "js/celebrations.js?v=20261015-legend",
  "js/pwa.js?v=20261015-offline",
  "js/fitville.js?v=20261015-legend",
  "assets/app/icon-fq-180.png",
  "assets/app/icon-fq-192.png",
  "assets/app/icon-fq-512.png",
  "assets/app/icon.svg",
  "assets/backgrounds/ice.svg",
  "assets/backgrounds/lagoon.svg",
  "assets/backgrounds/lavender.svg",
  "assets/backgrounds/meadow.svg",
  "assets/backgrounds/ocean.svg",
  "assets/backgrounds/pearl.svg",
  "assets/backgrounds/rose.svg",
  "assets/backgrounds/sky.svg",
  "assets/backgrounds/sunrise.svg",
  "assets/fitquest-logo-v1.webp",
  "assets/icons/achievement-bronze.svg",
  "assets/icons/achievement-first-check-in.svg",
  "assets/icons/achievement-five-for-five.svg",
  "assets/icons/achievement-gold.svg",
  "assets/icons/achievement-legend.png",
  "assets/icons/achievement-grandmaster.svg",
  "assets/icons/achievement-silver.svg",
  "assets/icons/achievement-well-rounded.svg",
  "assets/icons/barbell.svg",
  "assets/icons/collection-locked.svg",
  "assets/icons/collection-trophy.svg",
  "assets/icons/mastery-barbell.svg",
  "assets/icons/mastery-moon.svg",
  "assets/icons/mastery-run.svg",
  "assets/icons/mastery-salad.svg",
  "assets/icons/mastery-stretching.svg",
  "assets/icons/moon.svg",
  "assets/icons/rank-bronze.svg",
  "assets/icons/rank-diamond.svg",
  "assets/icons/rank-emerald.svg",
  "assets/icons/rank-gold.svg",
  "assets/icons/rank-grandmaster.svg",
  "assets/icons/rank-master.svg",
  "assets/icons/rank-platinum.svg",
  "assets/icons/rank-silver.svg",
  "assets/icons/run.svg",
  "assets/icons/salad.svg",
  "assets/icons/settings.svg",
  "assets/icons/specialist-barbell.svg",
  "assets/icons/specialist-moon.svg",
  "assets/icons/specialist-run.svg",
  "assets/icons/specialist-salad.svg",
  "assets/icons/specialist-stretching.svg",
  "assets/icons/stretching.svg"
];
const scopeURL = new URL(self.registration.scope);
const appURL = path => new URL(path, scopeURL).href;
const cachedURLs = new Set(APP_FILES.map(appURL));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_FILES.map(path => new Request(appURL(path), { cache: 'reload' })));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Leave other apps' caches and all browser progress storage untouched.
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scopeURL.origin ||
      !url.pathname.startsWith(scopeURL.pathname)) return;
  const navigation = request.mode === 'navigate' &&
    (url.pathname === scopeURL.pathname || url.pathname === new URL('index.html', scopeURL).pathname);
  // Badges carry display-version queries. Their underlying paths are precached.
  // Keep script and CSS query versions exact to avoid serving an incompatible file.
  const asset = url.pathname.startsWith(new URL('assets/', scopeURL).pathname);
  const assetURL = new URL(url); assetURL.search = '';
  if (!navigation && !cachedURLs.has(url.href) && !(asset && cachedURLs.has(assetURL.href))) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const key = navigation ? appURL('index.html') : asset ? assetURL.href : request;
    const cached = await cache.match(key);
    return cached || fetch(request);
  })());
});
