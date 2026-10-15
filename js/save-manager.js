// Coordinates browser saves without depending on the UI or owning app progress.
(function (root) {
  'use strict';
  function create({ storage, key, readSave, fresh, getState, setState, isPreview }) {
    let available = true;
    let loaded = false;
    let ready = false;
    let rejectedRaw = null;
    let lastRaw = null;

    function reject(raw) {
      rejectedRaw = raw;
      available = false;
    }

    function loadInitial() {
      try {
        const raw = storage.getItem(key);
        lastRaw = raw;
        loaded = true;
        if (raw !== null) {
          // Protect the original bytes if validation fails.
          rejectedRaw = raw;
          setState(readSave(raw));
          rejectedRaw = null;
        }
      } catch (_) {
        available = false;
      }
    }

    // Import and reset are explicit replacements, but must first read the latest
    // device snapshot so a subsequent write can detect intervening tab changes.
    function prepareReplacement() {
      try {
        lastRaw = storage.getItem(key);
        loaded = true;
        return true;
      } catch (_) {
        available = false;
        return false;
      }
    }

    function synchronize() {
      if (isPreview() || rejectedRaw !== null || !loaded) return 'unchanged';
      try {
        const raw = storage.getItem(key);
        if (raw === lastRaw) return 'unchanged';
        let incoming;
        try {
          incoming = raw === null ? fresh() : readSave(raw);
        } catch (_) {
          reject(raw);
          lastRaw = raw;
          return 'rejected';
        }
        setState(incoming);
        lastRaw = raw;
        available = true;
        return 'loaded';
      } catch (_) {
        available = false;
        return 'unavailable';
      }
    }

    function write() {
      if (!ready || isPreview() || rejectedRaw !== null || !loaded) return 'paused';
      try {
        // Do not overwrite a save changed by another tab since our last read.
        if (storage.getItem(key) !== lastRaw) {
          return synchronize() === 'loaded' ? 'conflict-loaded' : 'conflict';
        }
        const raw = JSON.stringify(getState());
        if (raw !== lastRaw) storage.setItem(key, raw);
        lastRaw = raw;
        available = true;
        return 'saved';
      } catch (_) {
        available = false;
        return 'unavailable';
      }
    }

    return {
      loadInitial, prepareReplacement, synchronize, write, reject,
      clearRejected() { rejectedRaw = null; },
      markReady() { ready = true; },
      get available() { return available; },
      get loaded() { return loaded; },
      get rejectedRaw() { return rejectedRaw; },
      get lastRaw() { return lastRaw; },
    };
  }
  root.FitQuestSaveManager = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = { create };
})(typeof globalThis !== 'undefined' ? globalThis : this);
