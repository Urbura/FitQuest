// Installation and offline readiness are optional enhancements to the browser app.
(() => {
  'use strict';
  let installPrompt = null;
  let offlineReady = false;
  let updateWaiting = false;
  let unavailable = false;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  function refresh() {
    const status = document.getElementById('offline-status');
    if (status) status.textContent = offlineReady
      ? (updateWaiting ? 'Available offline. An update is ready; close all FitQuest windows and reopen to apply it.' : 'Available offline on this device.')
      : unavailable ? 'Offline setup is unavailable. You can continue using FitQuest online.'
        : 'Preparing offline access. Keep FitQuest open while connected.';
    const button = document.getElementById('install-app');
    if (button) button.hidden = !installPrompt || standalone();
    const help = document.getElementById('install-help');
    if (help) help.textContent = standalone()
      ? 'FitQuest is running as an installed app.'
      : 'Use your browser’s Install app or Add to Home Screen option. On iPhone, open in Safari and choose Share → Add to Home Screen.';
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    refresh();
  });
  window.addEventListener('appinstalled', () => { installPrompt = null; refresh(); });
  document.addEventListener('click', async event => {
    if (!event.target.closest('#install-app') || !installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    refresh();
    try { await prompt.prompt(); await prompt.userChoice; }
    catch (_) { /* The browser's own installation option remains available. */ }
  });

  async function register() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      unavailable = true;
      refresh();
      return;
    }
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      function checkReadiness() {
        offlineReady = registration.active?.state === 'activated';
        updateWaiting = Boolean(registration.waiting);
        refresh();
      }
      function watchInstaller() {
        const installer = registration.installing;
        installer?.addEventListener('statechange', () => {
          if (installer.state === 'redundant' && !registration.active) unavailable = true;
          checkReadiness();
        });
        checkReadiness();
      }
      registration.addEventListener('updatefound', watchInstaller);
      watchInstaller();
      navigator.serviceWorker.ready.then(checkReadiness);
    } catch (error) {
      unavailable = true;
      refresh();
      console.warn('FitQuest offline setup failed', error);
    }
  }
  globalThis.FitQuestPWA = { refresh };
  window.addEventListener('load', register, { once: true });
})();
