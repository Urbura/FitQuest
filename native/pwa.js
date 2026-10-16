// Native builds already include every app asset; no browser installation or SW.
(() => {
  'use strict';
  function refresh() {
    const status = document.getElementById('offline-status');
    if (status) status.textContent = 'Available offline on this device.';
    const button = document.getElementById('install-app');
    if (button) button.hidden = true;
    const help = document.getElementById('install-help');
    if (help) help.textContent = 'FitQuest is installed. Updates are delivered through the App Store.';
  }
  globalThis.FitQuestPWA = { refresh };
  window.addEventListener('load', refresh, { once: true });
})();
