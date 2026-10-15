// Developer previews own their session backup and never write normal progress.
(function (root) {
  'use strict';
  function create(context) {
    const { SKILLS, MAX_LEVEL, MIN_TOTAL_LEVEL, MAX_TOTAL_LEVEL, XP, level,
      getState, setState, fresh, readSave, rejectSave, showDashboard,
      render, notify, totalSkillLevel, totalReward, syncSharedSave, day, showCollections, previewCelebration } = context;
    // Browser storage and developer session
    const sessionFallback = new Map();
    // Session storage is optional (for example, in restricted browser modes).
    // Keep the in-memory fallback authoritative for writes in this tab.
    function sessionOperation(action, key, value) {
      if (action === 'read' && sessionFallback.has(key))
        return sessionFallback.get(key);
      if (action === 'write') sessionFallback.set(key, value);
      if (action === 'remove') sessionFallback.set(key, null);
      try {
        if (action === 'read') return sessionStorage.getItem(key);
        if (action === 'write') sessionStorage.setItem(key, value);
        if (action === 'remove') sessionStorage.removeItem(key);
      } catch (err) {
        // Browser storage may be unavailable; the fallback remains usable.
      }
      return null;
    }
    function readSession(key) {
      return sessionOperation('read', key);
    }
    function writeSession(key, value) {
      sessionOperation('write', key, value);
    }
    function removeSession(key) {
      sessionOperation('remove', key);
    }
    const DEV_PARAMS = new URLSearchParams(location.search),
      DEV_REQUESTED = DEV_PARAMS.has('dev') || DEV_PARAMS.get('test') === '1',
      DEV_BACKUP = 'fitville-dev-backup';
    let DEV = DEV_REQUESTED || readSession('fitville-dev-active') === '1';
    let devTotalLevel = null;
    function setupDevUI() {
      const panel = document.getElementById('dev-tools'),
        open = document.getElementById('dev-open');
      if (!panel || !open) return;
      if (DEV) {
        syncDevProfileInputs();
        writeSession('fitville-dev-active', '1');
        panel.hidden = false;
        open.hidden = true;
      } else {
        panel.hidden = true;
        open.hidden = true;
      }
    }
    function setProfileLevels(levels) {
      if (!DEV || !Array.isArray(levels) || levels.length !== SKILLS.length ||
          levels.some(value => !Number.isInteger(value) || value < 1 || value > MAX_LEVEL))
        return false;
      levels.forEach((value, i) => { getState().skills[i].xp = XP[value]; });
      devTotalLevel = null;
      return true;
    }
    function syncDevProfileInputs() {
      SKILLS.forEach((skill, i) => {
        const input = document.getElementById('dev-profile-' + i);
        if (input) input.value = level(getState().skills[i].xp);
      });
    }

    // Build real check-in history so previews use the production achievement rules.
    // Older active days are separated by gaps; the newest run has the chosen streak.
    function setHistory({ activeDays, streakDays, perfectDays }) {
      if (!DEV || ![activeDays, streakDays, perfectDays].every(Number.isInteger) ||
          activeDays < 0 || activeDays > 365 || streakDays < 0 || streakDays > activeDays ||
          perfectDays < 0 || perfectDays > activeDays || (activeDays > 0 && streakDays < 1)) return false;
      const dates = [];
      const today = new Date(day() + 'T00:00:00Z');
      function dateBefore(offset) {
        const date = new Date(today);
        date.setUTCDate(date.getUTCDate() - offset);
        return date.toISOString().slice(0, 10);
      }
      for (let i = 0; i < streakDays; i++) dates.push(dateBefore(i));
      for (let i = 0; i < activeDays - streakDays; i++) dates.push(dateBefore(streakDays + 1 + i * 2));
      const profile = getState();
      profile.days = Object.fromEntries(dates.map((date, i) => [date, {
        scores: Array(SKILLS.length).fill(i < perfectDays ? 5 : 1),
        rates: Array(SKILLS.length).fill(1),
      }]));
      profile.dailyResetVersion = 2;
      // Previewing medal counts does not award XP to the normal or preview profile.
      profile.fiveForFivePaidMilestones = Math.floor(perfectDays / 5);
      profile.achievementsSeen = [];
      return true;
    }
    function unlockAllAchievements() {
      if (!DEV) return false;
      setProfileLevels(Array(SKILLS.length).fill(MAX_LEVEL));
      setHistory({ activeDays: 120, streakDays: 30, perfectDays: 5 });
      syncDevProfileInputs();
      return true;
    }
    function hideTools() {
      document.getElementById('dev-tools').hidden = true;
      document.getElementById('dev-open').hidden = false;
    }
    function backupOriginal(storageLoaded, raw) {
      if (DEV && readSession(DEV_BACKUP) === null && storageLoaded)
        writeSession(DEV_BACKUP, raw === null ? '__EMPTY__' : raw);
    }
    function handleClick(b) {
      if (DEV && b.id === 'dev-set-history') {
        const values = Object.fromEntries(['activeDays', 'streakDays', 'perfectDays'].map(key =>
          [key, Number(document.getElementById('dev-' + key).value)]));
        if (!setHistory(values)) {
          notify('Use whole numbers from 0–365. Streak and medal days cannot exceed active days; an active profile needs a streak of at least 1.');
          return true;
        }
        showCollections(); render(false); hideTools();
        notify('Test history applied. XP and your normal save are unchanged.');
        return true;
      }
      if (DEV && b.id === 'dev-unlock-all') {
        unlockAllAchievements();
        showCollections(); render(false); hideTools();
        notify('All achievements unlocked in this preview, including FitQuest Legend.');
        return true;
      }
      if (DEV && b.id === 'dev-play-rank') {
        const rank = Number(document.getElementById('dev-rank-preview').value);
        devTotalLevel = rank;
        render(false); hideTools();
        previewCelebration({ rank });
        return true;
      }
      if (DEV && b.id === 'dev-play-legend') {
        hideTools();
        previewCelebration({ legend: true });
        return true;
      }
      if (DEV && b.id === 'dev-toggle') {
        hideTools();
        return true;
      }
      if (DEV && b.id === 'dev-open') {
        syncDevProfileInputs();
        document.getElementById('dev-tools').hidden = false;
        document.getElementById('dev-open').hidden = true;
        return true;
      }
      if (DEV && b.dataset.devLevel !== undefined) {
        const input = document.getElementById('dev-level');
        if (input) input.value = b.dataset.devLevel;
        return true;
      }
      if (DEV && (b.id === 'dev-set-total' || b.dataset.devTotal !== undefined)) {
        const input = document.getElementById('dev-total-level'),
          value = b.dataset.devTotal !== undefined ? b.dataset.devTotal : input.value;
        devTotalLevel = Math.max(MIN_TOTAL_LEVEL, Math.min(MAX_TOTAL_LEVEL, Math.floor(Number(value) || MIN_TOTAL_LEVEL)));
        input.value = devTotalLevel;
        render(false);
        notify('Total Level ' + devTotalLevel + ' · ' + totalReward(devTotalLevel).title + ' · preview only.');
        return true;
      }
      if (DEV && b.id === 'dev-total-auto') {
        devTotalLevel = null;
        render(false);
        notify('Total Level follows the sum of your skill levels again.');
        return true;
      }
      if (DEV && b.id === 'dev-apply-profile') {
        const levels = SKILLS.map((skill, i) =>
          Number(document.getElementById('dev-profile-' + i).value));
        if (!setProfileLevels(levels)) {
          notify('Enter a whole-number level from 1 to ' + MAX_LEVEL + ' for every skill.');
          return true;
        }
        document.getElementById('dev-total-level').value = totalSkillLevel();
        render(false);
        notify('Profile applied · Total Level ' + totalSkillLevel() + ' · preview only.');
        return true;
      }
      if (DEV && b.id === 'dev-set-level') {
        const select = document.getElementById('dev-skill'),
          input = document.getElementById('dev-level'),
          target = Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(input && input.value) || 1))),
          indices =
            select && select.value === 'all' ? [0, 1, 2, 3, 4] : [Number(select && select.value)];
        for (const i of indices) {
          if (Number.isInteger(i) && i >= 0 && i < 5) getState().skills[i].xp = XP[target];
        }
        render();
        notify(
          (indices.length === 5 ? 'All skills' : SKILLS[indices[0]].name) +
            ' set to Level ' +
            target +
            ' for testing.',
        );
        return true;
      }
      if (DEV && b.id === 'dev-restore') {
        devTotalLevel = null;
        const raw = readSession(DEV_BACKUP);
        if (raw === null) {
          notify('No original save backup is available in this session.');
          return true;
        }
        if (raw === '__EMPTY__') {
          setState(fresh());
        } else {
          try {
            setState(readSave(raw));
          } catch (err) {
            notify('Could not restore the original save.');
            return true;
          }
        }
        showDashboard();
        render();
        notify('Original save restored in the preview.');
        return true;
      }
      if (DEV && b.id === 'dev-exit') {
        const raw = readSession(DEV_BACKUP);
        if (raw !== null) {
          try {
            setState(raw === '__EMPTY__' ? fresh() : readSave(raw));
          } catch (err) {
            setState(fresh());
            rejectSave(raw);
          }
        }
        removeSession(DEV_BACKUP);
        removeSession('fitville-dev-active');
        DEV = false;
        devTotalLevel = null;
        const u = new URL(location.href);
        u.searchParams.delete('dev');
        u.searchParams.delete('test');
        history.replaceState(null, '', u.pathname + u.search + u.hash);
        setupDevUI();
        showDashboard();
        syncSharedSave();
        render(false);
        notify('Developer Mode closed. Original progress preserved.');
        return true;
      }

      return false;
    }
    return {
      get active() { return DEV; },
      get totalLevel() { return devTotalLevel; },
      setupUI: setupDevUI, backupOriginal, handleClick, setProfileLevels, setHistory, unlockAllAchievements,
      // Used by the isolated tracker test harness; normal UI uses validated controls.
      preview(value) { DEV = value !== null; devTotalLevel = value; },
    };
  }
  root.FitQuestDeveloper = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = { create };
})(typeof globalThis !== 'undefined' ? globalThis : this);
