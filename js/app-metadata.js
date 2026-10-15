// Runs in the head so home-screen previews use the correct app identity.
// Only explicit developer URLs install the developer shortcut.
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  if (!params.has('dev') && params.get('test') !== '1') return;
  document.title = 'FitQuest Dev';
  document.querySelector('link[rel="manifest"]').href = 'manifest-dev.webmanifest';
  document.querySelector('link[rel="icon"]').href = 'assets/app/icon-dev-192.png';
  document.querySelector('link[rel="apple-touch-icon"]').href = 'assets/app/icon-dev-180.png';
  document.querySelector('meta[name="apple-mobile-web-app-title"]').content = 'FitQuest Dev';
  document.querySelector('meta[name="theme-color"]').content = '#6639ac';
})();
