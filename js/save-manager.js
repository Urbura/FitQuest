// Device autosaves, recovery, and a separate manual checkpoint.
(function (root) {
  'use strict';
  function create({ storage, key, readSave, fresh, getState, setState, isPreview }) {
    const backupKey = key + '-backup', manualKey = key + '-manual';
    let available = true, loaded = false, ready = false, rejectedRaw = null, lastRaw = null, recoveryPending = false;
    function reject(raw) { rejectedRaw = raw; recoveryPending = true; available = false; }
    function verifiedWrite(target, raw) {
      storage.setItem(target, raw);
      if (storage.getItem(target) !== raw) throw Error('The browser could not verify the save.');
    }
    function recoverPrevious() {
      const raw = storage.getItem(backupKey);
      if (raw === null) return false;
      setState(readSave(raw)); recoveryPending = true; available = false;
      return true;
    }
    function loadInitial() {
      try {
        lastRaw = storage.getItem(key); loaded = true;
        if (lastRaw === null) { recoverPrevious(); return; }
        try { setState(readSave(lastRaw)); }
        catch (_) { reject(lastRaw); recoverPrevious(); }
      } catch (_) { available = false; }
    }
    function prepareReplacement() {
      try { lastRaw = storage.getItem(key); loaded = true; return true; }
      catch (_) { available = false; return false; }
    }
    function synchronize() {
      if (isPreview() || recoveryPending || !loaded) return 'unchanged';
      try {
        const raw = storage.getItem(key);
        if (raw === lastRaw) return 'unchanged';
        try {
          if (raw === null && recoverPrevious()) { lastRaw = null; return 'loaded'; }
          setState(raw === null ? fresh() : readSave(raw));
        } catch (_) {
          reject(raw); lastRaw = raw;
          try { recoverPrevious(); } catch (_) { /* Keep current in-memory progress. */ }
          return 'rejected';
        }
        lastRaw = raw; available = true; return 'loaded';
      } catch (_) { available = false; return 'unavailable'; }
    }
    function persist(data) {
      if (lastRaw !== null) {
        let valid = false;
        try { readSave(lastRaw); valid = true; } catch (_) { /* Keep a valid recovery copy. */ }
        if (valid) verifiedWrite(backupKey, lastRaw);
      }
      const clean = readSave(JSON.stringify(data));
      clean.autosavedAt = new Date().toISOString();
      const raw = JSON.stringify(clean);
      verifiedWrite(key, raw);
      lastRaw = raw; available = true; rejectedRaw = null; recoveryPending = false;
      return clean;
    }
    function write() {
      if (!ready || isPreview() || recoveryPending || !loaded) return 'paused';
      try {
        if (storage.getItem(key) !== lastRaw)
          return synchronize() === 'loaded' ? 'conflict-loaded' : 'conflict';
        if (JSON.stringify(getState()) === lastRaw) return 'saved';
        const clean = persist(getState());
        // Preserve identity: app transactions use it to detect competing saves.
        getState().autosavedAt = clean.autosavedAt;
        return 'saved';
      } catch (_) { available = false; return 'unavailable'; }
    }
    function readSlot(kind) {
      if (kind !== 'manual' && kind !== 'autosave') throw Error('Unknown save slot.');
      const raw = storage.getItem(kind === 'manual' ? manualKey : key);
      if (raw === null) return null;
      if (kind === 'autosave') {
        const data = readSave(raw);
        return { kind, raw, data, savedAt: data.autosavedAt || null };
      }
      const payload = JSON.parse(raw);
      if (!payload || payload.app !== 'FitQuest' || payload.version !== 1 ||
          typeof payload.savedAt !== 'string' || !Number.isFinite(Date.parse(payload.savedAt)))
        throw Error('The manual save could not be read.');
      return { kind, raw, data: readSave(JSON.stringify(payload.data)), savedAt: payload.savedAt };
    }
    function saveManual(expectedManualRaw) {
      if (isPreview()) return 'preview';
      try {
        if (storage.getItem(key) !== lastRaw || storage.getItem(manualKey) !== expectedManualRaw) return 'stale';
        const data = readSave(JSON.stringify(getState()));
        verifiedWrite(manualKey, JSON.stringify({ app: 'FitQuest', version: 1, savedAt: new Date().toISOString(), data }));
        return 'saved';
      } catch (_) { return 'unavailable'; }
    }
    function manualRaw() { return storage.getItem(manualKey); }
    function loadSlot(snapshot) {
      if (isPreview()) return 'preview';
      if (!snapshot || !['manual','autosave'].includes(snapshot.kind)) return 'invalid';
      try {
        const current = readSlot(snapshot.kind);
        if (!current || current.raw !== snapshot.raw) return 'stale';
        // Re-parse the device bytes; UI snapshots cannot supply altered progress.
        if (snapshot.kind === 'autosave') {
          setState(current.data); lastRaw = current.raw;
          recoveryPending = false; rejectedRaw = null; available = true;
        } else {
          if (storage.getItem(key) !== lastRaw) return 'stale';
          const clean = persist(current.data); setState(clean);
        }
        return 'loaded';
      } catch (_) { return 'unavailable'; }
    }
    return {
      loadInitial, prepareReplacement, synchronize, write, reject, readSlot, saveManual, loadSlot, manualRaw,
      clearRejected() { rejectedRaw = null; recoveryPending = false; },
      markReady() { ready = true; },
      get available() { return available; }, get loaded() { return loaded; },
      get rejectedRaw() { return rejectedRaw; }, get lastRaw() { return lastRaw; },
      get recoveryPending() { return recoveryPending; },
    };
  }
  root.FitQuestSaveManager = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = { create };
})(typeof globalThis !== 'undefined' ? globalThis : this);
