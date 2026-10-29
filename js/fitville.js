(() => {
  try {
    // Editable names, progression settings, and rewards live in config.js.
    const CONFIG = globalThis.FitQuestConfig;
    if (!CONFIG) throw Error('FitQuest configuration did not load');
    const SKILLS = CONFIG.skills;
    const SKILL_DISPLAY_ORDER = CONFIG.skillDisplayOrder;
    const SKILL_SYMBOLS = SKILLS.map((skill) => skill.icon);
    function skillIcon(i) {
      return (
        '<span class="skill-symbol" style="--symbol:url(../assets/icons/' +
        SKILL_SYMBOLS[i] +
        '.svg);--skill:' +
        COLORS[i] +
        '" aria-hidden="true"><span></span></span>'
      );
    }
    // Historical XP rates are retained only to read older backups.
    const LEGACY_RATES = [1, 3, 6, 12, 20, 35];
    // Keep the original storage key and legacy fields so existing progress remains readable.
    const KEY = 'fitville-v1';
    // Pure progression rules are shared with direct Node tests.
    const {
      maxSkillLevel: MAX_LEVEL,
      minTotalLevel: MIN_TOTAL_LEVEL,
      maxTotalLevel: MAX_TOTAL_LEVEL,
      xpThresholds: XP,
      levelForXP: level,
      bonusForLevel: skillBonus,
      experienceForCheckIn: checkInXP,
      calculateTotalLevel,
      rewardForTotalLevel: totalReward,
      nextRewardForTotalLevel,
    } = globalThis.FitQuestProgression.createProgression(CONFIG);
    function fresh() {
      return {
        coins: 0,
        skills: SKILLS.map(() => ({ xp: 0, tier: 0 })),
        days: {},
        last: Date.now(),
        bank: 0,
      };
    }
    // Save parsing and compatibility checks live in storage.js.
    const { readSave } = globalThis.FitQuestStorage.createStorage(CONFIG);
    let state = fresh();
    const saves = globalThis.FitQuestSaveManager.create({
      // Resolve localStorage inside operations so restricted browsers can still start.
      storage: {
        getItem: key => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
      },
      key: KEY, readSave, fresh,
      getState: () => state,
      setState: value => { state = value; },
      isPreview: () => developer.active,
    });
    saves.loadInitial();
    const developer = globalThis.FitQuestDeveloper.create({
      SKILLS, MAX_LEVEL, MIN_TOTAL_LEVEL, MAX_TOTAL_LEVEL, XP, level,
      getState: () => state,
      setState: value => { state = value; },
      fresh, readSave,
      rejectSave: saves.reject,
      showDashboard: () => { tab = 'dashboard'; },
      showCollections: () => { tab = 'collections'; },
      day, previewCelebration,
      render, notify, totalSkillLevel, totalReward, syncSharedSave,
    });
    developer.backupOriginal(saves.loaded, saves.lastRaw);
    // Daily reset and shared-save synchronization
    let tab = 'dashboard',
      timer,
      renderedDay = null,
      dailyResetTimer;
    let draftRatings = null, draftDay = null;
    const RESET_UTC_HOUR = CONFIG.dailyReset.utcHour,
      RESET_UTC_MINUTE = CONFIG.dailyReset.utcMinute,
      RESET_SHIFT = (RESET_UTC_HOUR * 60 + RESET_UTC_MINUTE) * 60 * 1000;
    function day(now = Date.now()) {
      return new Date(now - RESET_SHIFT).toISOString().slice(0, 10);
    }
    function nextReset(now = Date.now()) {
      const d = new Date(now),
        reset = Date.UTC(
          d.getUTCFullYear(),
          d.getUTCMonth(),
          d.getUTCDate(),
          RESET_UTC_HOUR,
          RESET_UTC_MINUTE,
        );
      return now < reset ? reset : reset + 86400000;
    }
    function checkedCount(entry) {
      return entry && Array.isArray(entry.scores)
        ? entry.scores.filter(Number.isInteger).length
        : 0;
    }
    function dailyEntry() {
      const key = day();
      let e = state.days[key];
      if (e) {
        state.dailyResetVersion = 2;
        return e;
      }
      // Old versions stored local calendar dates. Preserve any skill check-ins already completed during migration.
      const local = new Date(),
        oldKey =
          local.getFullYear() +
          '-' +
          String(local.getMonth() + 1).padStart(2, '0') +
          '-' +
          String(local.getDate()).padStart(2, '0');
      if ((state.dailyResetVersion || 0) < 2) {
        state.dailyResetVersion = 2;
        const old = state.days[oldKey];
        if (old && old.scores.some(Number.isInteger)) {
          if (oldKey !== key) {
            state.days[key] = old;
            delete state.days[oldKey];
          }
          e = old;
        }
        save();
      }
      return e;
    }
    function resetText() {
      const remaining = Math.max(0, nextReset() - Date.now()),
        hours = Math.floor(remaining / 3600000),
        minutes = Math.floor((remaining % 3600000) / 60000);
      return 'Resets at ' + CONFIG.dailyReset.label + ' · ' + hours + 'h ' + minutes + 'm remaining';
    }

    function refreshDayIfNeeded() {
      if (renderedDay === null || renderedDay === day()) return false;
      document.getElementById('check-dialog').close();
      render(false);
      notify('A new check-in day has started. All five skills are available.');
      return true;
    }
    function scheduleDailyReset() {
      clearTimeout(dailyResetTimer);
      dailyResetTimer = setTimeout(
        () => {
          if (document.visibilityState === 'visible') refreshDayIfNeeded();
          scheduleDailyReset();
        },
        Math.max(50, nextReset() - Date.now() + 50),
      );
    }
    function refreshResetCountdown() {
      document.querySelectorAll('.star-reset').forEach((el) => (el.textContent = resetText()));
    }

    // Save coordination returns outcomes; this layer handles dialogs and notices.
    function prepareReplacement() {
      if (saves.prepareReplacement()) return true;
      notify('Device saving is blocked. Export your progress before reloading.');
      return false;
    }
    function syncSharedSave() {
      const outcome = saves.synchronize();
      if (outcome === 'loaded') document.getElementById('check-dialog').close();
      return outcome === 'loaded' || outcome === 'rejected';
    }
    function save() {
      const outcome = saves.write();
      if (outcome === 'conflict-loaded') document.getElementById('check-dialog').close();
      if (outcome === 'conflict' || outcome === 'conflict-loaded') {
        render(false);
        notify('Progress changed in another tab. The latest save has been loaded.');
      } else if (outcome === 'unavailable') {
        notify('Saving is unavailable. Keep this page open or export a backup.');
      }
      return outcome === 'saved';
    }

    function dismissNotice() {
      clearTimeout(timer);
      const notice = document.getElementById('notice');
      notice.textContent = '';
      notice.removeAttribute('tabindex');
      if (document.activeElement === notice) notice.blur();
    }
    function notify(t) {
      const notice = document.getElementById('notice');
      clearTimeout(timer);
      notice.textContent = t;
      if (t) notice.setAttribute('tabindex', '0');
      else notice.removeAttribute('tabindex');
      timer = setTimeout(dismissNotice, 5000);
    }
    function setupNoticeDismissal() {
      const notice = document.getElementById('notice');
      notice.title = 'Tap or swipe up to dismiss';
      notice.addEventListener('click', dismissNotice);
      notice.addEventListener('keydown', (event) => {
        if (['Enter', ' ', 'Escape'].includes(event.key)) {
          event.preventDefault();
          dismissNotice();
        }
      });
      let swipeStart = null;
      notice.addEventListener(
        'touchstart',
        (event) => {
          swipeStart =
            event.touches.length === 1
              ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
              : null;
        },
        { passive: true },
      );
      notice.addEventListener(
        'touchend',
        (event) => {
          if (swipeStart && event.changedTouches.length === 1) {
            const touch = event.changedTouches[0];
            const upward = swipeStart.y - touch.clientY;
            const sideways = Math.abs(swipeStart.x - touch.clientX);
            if (upward >= 35 && upward > sideways * 1.5) dismissNotice();
          }
          swipeStart = null;
        },
        { passive: true },
      );
      notice.addEventListener(
        'touchcancel',
        () => {
          swipeStart = null;
        },
        { passive: true },
      );
    }

    // Achievement UI and tracking are isolated from the main app coordinator.
    const { TOTAL_LEVEL_RANKS, ACHIEVEMENTS, achievementStats, earnedAchievements,
      unseenAchievements, updateCollectionBadge, expandedAchievementCategories,
      renderCollections, renderBonusesPanel, markAchievementViewed } = globalThis.FitQuestAchievements.create({
        SKILLS, SKILL_SYMBOLS, level, checkedCount, day, currentTotalLevel, safeText, save, bonusForLevel: skillBonus,
        getState: () => state, isDev: () => developer.active,
      });

    // Dashboard and level celebrations
    const COLORS = SKILLS.map((skill) => skill.color);
    // Count distinct check-in days in the Monday–Sunday week, using the daily reset boundary.
    function weeklyCheckInCount(now = Date.now()) {
      const today = day(now),
        date = new Date(today + 'T00:00:00Z'),
        weekday = (date.getUTCDay() + 6) % 7;
      date.setUTCDate(date.getUTCDate() - weekday);
      const monday = date.toISOString().slice(0, 10);
      return Object.entries(state.days).filter(
        ([key, entry]) => key >= monday && key <= today && checkedCount(entry) > 0,
      ).length;
    }
    function weeklyCheckInText() {
      const count = weeklyCheckInCount();
      return count === 0
        ? 'Your first check-in this week starts here.'
        : 'You checked in ' + count + ' ' + (count === 1 ? 'day' : 'days') + ' this week!';
    }
    // Small local SVG badges stay crisp at header size without extra image downloads.
    const BADGE_PATHS = {
      shoe: 'M5 10H12L15 17L26 21C28 22 29 24 28 26H4V20L5 10ZM4 23H28M15 17L12 20M19 19L16 22',
      bottle: 'M12 5H20V9L23 13V26H9V13L12 9ZM12 9H20M9 16H23M13 20H19',
      apple: 'M16 12C7 5 3 13 6 22C8 28 13 29 16 26C19 29 24 28 26 22C29 13 25 5 16 12M16 11V7M16 8C18 3 23 4 24 5C23 9 19 10 16 8',
      stretch: 'M16 5C20 5 20 11 16 11C12 11 12 5 16 5ZM16 12V20M16 14L6 8M16 14L26 8M16 20L8 28M16 20L24 28',
      rope: 'M7 9V16H11V9ZM21 9V16H25V9ZM9 9C9 1 23 1 23 9M9 16V20C9 29 23 29 23 20V16',
      dumbbell: 'M4 11H8V21H4ZM8 8H12V24H8ZM12 14H20V18H12ZM20 8H24V24H20ZM24 11H28V21H24Z',
      heart: 'M16 26L5 16C-1 9 8 2 16 10C24 2 33 9 27 16ZM5 16H11L14 12L18 20L21 16H27',
      kettlebell: 'M10 12V9C10 1 22 1 22 9V12M13 11V9C13 5 19 5 19 9V11M16 11C3 11 1 28 16 28C31 28 29 11 16 11Z',
      trophy: 'M10 5H22V13C22 22 10 22 10 13ZM10 8H5V12C5 17 10 17 11 17M22 8H27V12C27 17 22 17 21 17M16 20V26M10 28H22M13 10H15V15H13ZM17 10H19V15H17ZM15 12H17',
    };
    function rewardBadge(milestone, large = false) {
      const rank = TOTAL_LEVEL_RANKS[milestone.level];
      if (rank) return '<img class="reward-badge' + (large ? ' reward-badge-large' : '') +
        '" src="assets/icons/rank-' + rank.toLowerCase() + '.svg?v=20261015-evolved-ranks" alt="" width="40" height="40">';
      const path = BADGE_PATHS[milestone.badge] || BADGE_PATHS.dumbbell;
      return '<svg class="reward-badge' + (large ? ' reward-badge-large' : '') +
        '" viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
        '<circle cx="20" cy="20" r="18" fill="#fff2b8" stroke="#be8a28" stroke-width="2"/>' +
        '<path d="' + path + '" transform="translate(4 4)" fill="none" stroke="#235f90" ' +
        'stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    function nextRewardText() {
      const current = currentTotalLevel(),
        next = nextRewardForTotalLevel(current);
      if (!next) return 'All Total Level rewards unlocked!';
      return 'Next rank at Total Level ' + next.level + ': ' + next.title;
    }
    // A day-derived random seed keeps the suggested quest stable across reloads.
    // Saved swaps and completion live beside that day's check-ins.
    function dailyQuest() {
      const key = day();
      const saved = state.days[key] && state.days[key].quest;
      if (saved) return saved;
      let seed = 2166136261;
      for (const character of key) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
      const skill = seed % SKILLS.length;
      return { skill, index: Math.floor(seed / SKILLS.length) % CONFIG.dailyQuests[skill].length, completed: false, everCompleted: false, swaps: 0 };
    }
    function storeDailyQuest(quest) {
      if (!state.days[day()]) state.days[day()] = { scores: Array(SKILLS.length).fill(null), rates: Array(SKILLS.length).fill(null) };
      state.days[day()].quest = quest;
    }
    function setQuestCompleted(completed, expectedDay) {
      if (expectedDay !== day()) return { status: 'expired' };
      if (typeof completed !== 'boolean') return { status: 'invalid' };
      const quest = { ...dailyQuest() };
      if (quest.completed === completed) return { status: 'unchanged' };
      const before = level(state.skills[quest.skill].xp), totalBefore = totalSkillLevel();
      const firstCompletion = completed && !quest.everCompleted;
      state.skills[quest.skill].xp = Math.max(0, state.skills[quest.skill].xp + (completed ? 2 : -2));
      quest.completed = completed;
      quest.everCompleted = quest.everCompleted || completed;
      storeDailyQuest(quest);
      return { status: 'updated', skill: quest.skill, firstCompletion, before, after: level(state.skills[quest.skill].xp), totalBefore, totalAfter: totalSkillLevel() };
    }
    function swapDailyQuest(expectedDay) {
      if (expectedDay !== day()) return false;
      const quest = { ...dailyQuest() };
      if (quest.everCompleted || (quest.swaps || 0) >= 2) return false;
      quest.swaps = (quest.swaps || 0) + 1;
      // Cycle skills and tasks so an unsuitable activity can always be replaced.
      quest.skill = (quest.skill + 1) % SKILLS.length;
      quest.index = (quest.index + 1) % CONFIG.dailyQuests[quest.skill].length;
      storeDailyQuest(quest);
      return true;
    }
    function dailyQuestPanel() {
      const quest = dailyQuest();
      return '<section class="daily-quest"><div><strong>Daily Quest</strong><small>+2 XP · ' + safeText(SKILLS[quest.skill].name) + '</small></div>' +
        '<label><input type="checkbox" id="daily-quest-check" data-quest-day="' + day() + '"' + (quest.completed ? ' checked' : '') + '>' +
        '<span>' + safeText(CONFIG.dailyQuests[quest.skill][quest.index]) + '</span></label>' +
        (quest.everCompleted ? '' : '<button type="button" data-swap-quest="' + day() + '"' + ((quest.swaps || 0) >= 2 ? ' disabled' : '') + '>Swap · ' + (2 - (quest.swaps || 0)) + ' left</button>') + '</section>';
    }
    function dashboard() {
      return globalThis.FitQuestScreens.renderDashboard({
        entry: dailyEntry(), skills: SKILLS, skillState: state.skills,
        displayOrder: SKILL_DISPLAY_ORDER, maxLevel: MAX_LEVEL,
        xp: XP, levelForXP: level, skillIcon,
        nextReward: nextRewardText(), dailyQuestHTML: dailyQuestPanel(), safeText,
      });
    }

    function reward(text) {
      let el = document.createElement('div');
      el.className = 'reward';
      el.textContent = text;
      document.body.append(el);
      setTimeout(() => el.remove(), 1900);
    }

    function safeText(s) {
      return String(s).replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
      );
    }
    const TITLES = SKILLS.map((skill) => skill.titles);
    const CROWNS = SKILLS.map((skill) => skill.crown);
    const SYMBOLS = SKILLS.map((skill) => skill.crownSymbol);
    function titleFor(i, l) {
      return l === MAX_LEVEL ? SKILLS[i].masteryTitle : l < 7 ? 'Novice' : TITLES[i][Math.floor(l / 7) - 1];
    }
    function crown(i) {
      return (
        '<svg class="skill-crown" viewBox="0 0 120 85" role="img" aria-label="' +
        CROWNS[i] +
        '"><path d="M15 62L7 22L34 39L60 7L86 39L113 22L105 62Z" fill="' +
        COLORS[i] +
        '" stroke="#d6a642" stroke-width="5" stroke-linejoin="round"/><rect x="15" y="62" width="90" height="14" rx="4" fill="#f0c965" stroke="#b6892e" stroke-width="3"/><circle cx="60" cy="43" r="15" fill="#fff2bd"/><text x="60" y="49" text-anchor="middle" fill="' +
        COLORS[i] +
        '" font-size="21">' +
        SYMBOLS[i] +
        '</text></svg>'
      );
    }
    const celebrationMarkup = globalThis.FitQuestCelebrations.create({
      ranks: TOTAL_LEVEL_RANKS, rewardBadge, safeText,
    });
    let celebrations = [],
      celebrationFocus;
    function queueLevels(i, before, after, totalBefore, totalAfter) {
      // Show the skill that earned the level before its Total Level rewards.
      for (let l = before + 1; l <= after; l++) celebrations.push({ i, l });
      if (totalBefore === MIN_TOTAL_LEVEL && totalAfter > MIN_TOTAL_LEVEL)
        celebrations.push({ total: true, l: MIN_TOTAL_LEVEL + 1 });
      for (const milestone of TOTAL_REWARDS) {
        if (milestone.level > totalBefore && milestone.level <= totalAfter)
          celebrations.push({ total: true, l: milestone.level, milestone });
      }
      if (celebrations.length && !document.getElementById('level-dialog').open) {
        celebrationFocus = document.activeElement;
        showLevel();
      }
    }
    function previewCelebration({ rank, legend = false }) {
      if (!developer.active) return false;
      const milestone = TOTAL_REWARDS.find(reward => reward.level === rank && TOTAL_LEVEL_RANKS[rank]);
      if (!legend && !milestone) return false;
      // Explicit previews can replay freely without touching the earned-reveal marker.
      celebrations = [legend ? { legend: true } : { total: true, l: rank, milestone }];
      celebrationFocus = document.activeElement;
      showLevel();
      return true;
    }
    function queueLegendCelebration() {
      if (developer.active || saves.rejectedRaw !== null || state.legendCelebrated ||
          !earnedAchievements().includes('fitquest-legend')) return;
      const profile = state;
      state.legendCelebrated = true;
      save();
      if (state !== profile) return;
      celebrations.push({ legend: true });
      if (!document.getElementById('level-dialog').open) {
        celebrationFocus = document.activeElement;
        showLevel();
      }
    }
    function showLevel() {
      const item = celebrations[0];
      if (!item) return;
      const { i, l, total, milestone } = item;
      globalThis.FitQuestSounds?.play(item.legend ? 'legend' : total && milestone ? 'rank' : 'level');
      if (item.legend) {
        document.getElementById('level-content').innerHTML = celebrationMarkup.legend();
      } else if (total) {
        document.getElementById('level-content').innerHTML = celebrationMarkup.totalLevel(item);
      } else {
        const unlock =
          l === MAX_LEVEL
            ? 'Mastery title: ' + titleFor(i, l) + ' · ' + CROWNS[i]
            : CONFIG.bonusMilestones.some((milestone) => milestone.level === l)
              ? 'New bonus: +' + skillBonus(l) + ' XP on each check-in rated 1–5.'
              : l % 7 === 0
              ? 'New title: ' + titleFor(i, l)
              : 'No new item at this level. Next title at level ' +
                Math.min(MAX_LEVEL, Math.ceil(l / 7) * 7) +
                '.';
        document.getElementById('level-content').innerHTML =
          '<span class="anime-tag">' + SKILLS[i].name +
          ' · LEVEL UP!</span><h2 id="level-heading"><span class="congratulations">Congratulations!</span>' + SKILLS[i].name + ' reached Level ' +
          l + '!</h2>' +
          (l === MAX_LEVEL ? crown(i) : '<div class="level-emblem">' + skillIcon(i) + '</div>') +
          '<p><b>' + safeText(unlock) + '</b></p><p class="muted">' +
          (l === MAX_LEVEL
            ? 'Your skill crown is displayed in your skill check-in.'
            : 'Current title: ' + titleFor(i, l)) + '</p>';
      }
      document.getElementById('level-next').textContent =
        celebrations.length > 1
          ? 'Next celebration (' + (celebrations.length - 1) + ' remaining)'
          : 'Continue adventure';
      const dialog = document.getElementById('level-dialog');
      if (!dialog.open) dialog.showModal();
      document.getElementById('level-next').focus();
      fireworks(item.legend ? 1 : 4);
    }
    function fireworks(burstCount = 4) {
      const field = document.getElementById('fireworks');
      field.innerHTML = '';
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      for (let burst = 0; burst < burstCount; burst++) {
        const x = 15 + Math.random() * 70,
          y = 15 + Math.random() * 40;
        for (let j = 0; j < 16; j++) {
          const p = document.createElement('span'),
            angle = (j * Math.PI) / 8;
          p.className = 'spark';
          p.style.cssText =
            'left:' +
            x +
            '%;top:' +
            y +
            '%;background:' +
            ['#ffd35d', '#69d9ff', '#ff8aca', '#96f06c'][burst % 4] +
            ';--dx:' +
            Math.cos(angle) * 110 +
            'px;--dy:' +
            Math.sin(angle) * 110 +
            'px;animation-delay:' +
            burst * 0.2 +
            's';
          field.append(p);
        }
      }
    }
    function nextCelebration() {
      celebrations.shift();
      if (celebrations.length) showLevel();
      else {
        document.getElementById('level-dialog').close();
        document.getElementById('fireworks').innerHTML = '';
        if (celebrationFocus && celebrationFocus.isConnected) celebrationFocus.focus();
      }
    }

    // Header, settings, and screen rendering
    const TOTAL_REWARDS = CONFIG.totalRewards;
    function totalSkillLevel() {
      return calculateTotalLevel(state.skills);
    }
    function currentTotalLevel() {
      return developer.active && developer.totalLevel !== null
        ? developer.totalLevel
        : totalSkillLevel();
    }
    function rankForTotalLevel(totalLevel) {
      let rank = null;
      for (const [milestone, name] of Object.entries(TOTAL_LEVEL_RANKS)) {
        if (totalLevel >= Number(milestone)) rank = name;
      }
      return rank;
    }
    function renderHUD() {
      const totalLevel = currentTotalLevel(),
        reward = totalReward(totalLevel);
      const rank = rankForTotalLevel(totalLevel);
      const rankBadge = document.getElementById('header-rank-badge');
      if (rankBadge) {
        rankBadge.hidden = !rank;
        if (rank) {
          rankBadge.src = 'assets/icons/rank-' + rank.toLowerCase() + '.svg?v=20261015-evolved-ranks';
          rankBadge.alt = rank + ' rank';
          rankBadge.title = rank + ' rank';
        }
      }
      document.getElementById('overall-level-value').textContent = 'Total Level ' + totalLevel;
      document.getElementById('overall-level').setAttribute('aria-label', (rank || 'Unranked') + ', Total Level ' + totalLevel + '. View rank progression.');
      if (document.getElementById('total-dialog').open)
        document.getElementById('total-content').innerHTML = totalRewardsPanel();
      updateCollectionBadge();
      document.body.dataset.theme = reward.theme;
      const artwork = CONFIG.themeArtwork[reward.theme];
      const background = CONFIG.themes[reward.theme] + (artwork
        ? ', url("' + new URL(artwork, document.baseURI).href + '") center / cover no-repeat'
        : '');
      document.body.style.setProperty('--tracker-background', background);
    }

    let totalRewardIndex = null;
    function selectedRewardIndex() {
      if (totalRewardIndex !== null) return totalRewardIndex;
      const next = nextRewardForTotalLevel(currentTotalLevel());
      return next ? TOTAL_REWARDS.indexOf(next) : TOTAL_REWARDS.length - 1;
    }
    function totalRewardsPanel(index = selectedRewardIndex()) {
      const current = currentTotalLevel();
      return globalThis.FitQuestScreens.renderTotalRewards({
        current, index, rewards: TOTAL_REWARDS, next: nextRewardForTotalLevel(current),
        minTotal: MIN_TOTAL_LEVEL, maxTotal: MAX_TOTAL_LEVEL,
        preview: developer.active && developer.totalLevel !== null,
        rewardBadge, safeText,
      }) + '<h3>Rank progression</h3>' + rankProgressionPanel();
    }
    function openTotalRewards() {
      totalRewardIndex = null;
      document.getElementById('total-content').innerHTML = totalRewardsPanel();
      document.getElementById('total-dialog').showModal();
    }

    // A one-time, skippable introduction. Existing players go straight to the dashboard.
    const INTRO_KEY = 'fitquest-intro-seen-v1';
    let introStep = -1;
    function rememberIntro() {
      try { localStorage.setItem(INTRO_KEY, '1'); } catch (_) { /* Browsers may block storage. */ }
    }
    function introScreen() {
      return globalThis.FitQuestIntro.renderIntro({
        introStep, introPracticeSkill, introPracticeRating,
        SKILL_DISPLAY_ORDER, SKILLS, skillIcon, safeText, RATING_GUIDANCE, checkInXP
      });
    }
    let introPracticeSkill = null;
    let introPracticeRating = null;
    function finishIntro() {
      introStep = -1;
      introPracticeSkill = null;
      introPracticeRating = null;
      rememberIntro();
      tab = 'dashboard';
      render(false);
    }
    function renderScreen() {
      if (introStep >= 0) return introScreen();
      if (tab === 'collections') return renderCollections();
      if (tab === 'settings') return globalThis.FitQuestScreens.renderSettings({ developerMode: developer.active, soundEnabled: globalThis.FitQuestSounds?.isEnabled() ?? true });
      return dashboard();
    }

    function render(persist = true) {
      document.body.classList.remove('map-home');
      document.body.classList.toggle('tracker-home', tab === 'dashboard' && introStep < 0);
      renderHUD();
      document
        .querySelectorAll('nav button')
        .forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));

      document.querySelector('nav').hidden = false;
      let html =
        saves.rejectedRaw !== null
          ? '<section class="card" role="alert"><h2>Your original save is protected</h2><p>We could not read your saved progress. Automatic saving is paused so the original data stays untouched.</p><p>Export the original save first. Then use Settings to import a working backup or explicitly reset progress. Check-ins made while recovery is pending are temporary.</p><button id="export">Export original save</button><button data-tab="settings">Recovery settings</button></section>'
          : saves.available
            ? ''
            : '<p class="card">Device saving is unavailable. Use Settings to export a backup before closing this page.</p>';
      html += renderScreen();
      document.getElementById('view').innerHTML = html;
      globalThis.QuestXPAnimation?.animate(document.getElementById('view'));
      globalThis.FitQuestPWA?.refresh();
      renderedDay = day();
      scheduleDailyReset();
      if (persist) save();
      queueLegendCelebration();
    }

    // Rating XP plus the current skill bonus; zero ratings earn zero XP.
    // Daily check-in updates
    function recordCheckIn(i, score) {
      if (
        !Number.isInteger(i) ||
        i < 0 ||
        i >= SKILLS.length ||
        !Number.isInteger(score) ||
        score < 0 ||
        score > 5
      )
        return { status: 'invalid' };
      const key = day(),
        existing = dailyEntry();
      if (existing && Number.isInteger(existing.scores[i])) return { status: 'duplicate' };
      const before = level(state.skills[i].xp),
        totalBefore = totalSkillLevel();
      const entry = existing || {
        scores: Array(SKILLS.length).fill(null),
        rates: Array(SKILLS.length).fill(null),
      };
      const earned = checkInXP(score, before);
      if (entry.bonuses === undefined) entry.bonuses = Array(SKILLS.length).fill(null);
      entry.scores[i] = score;
      entry.rates[i] = 1;
      entry.bonuses[i] = earned - score;
      if (!entry.bonusBases) entry.bonusBases = Array(SKILLS.length).fill(null);
      entry.bonusBases[i] = skillBonus(before);
      state.days[key] = entry;
      state.skills[i].xp += earned;
      const after = level(state.skills[i].xp);
      const totalAfter = totalSkillLevel();
      return { status: 'recorded', earned, before, after, totalBefore, totalAfter, state };
    }
    // Corrections replace today's XP contribution, retaining its original bonus and rate.
    function correctionTerms(entry, i) {
      const score = entry.scores[i];
      const modern = Number.isInteger(entry.bonuses?.[i]);
      const rate = modern ? 1 : (entry.rates[i] ?? 1);
      const bonus = modern ? entry.bonuses[i] : 0;
      const originalXP = score * rate + bonus;
      const base = entry.bonusBases?.[i] ??
        (modern ? (score > 0 ? bonus : skillBonus(level(state.skills[i].xp))) : 0);
      return { rate, base, originalXP };
    }
    function editCheckIn(i, score, expectedDay) {
      if (!Number.isInteger(i) || i < 0 || i >= SKILLS.length ||
          !Number.isInteger(score) || score < 0 || score > 5)
        return { status: 'invalid' };
      if (expectedDay !== day()) return { status: 'expired' };
      const entry = dailyEntry();
      if (!entry || !Number.isInteger(entry.scores[i])) return { status: 'missing' };
      const { rate, base, originalXP } = correctionTerms(entry, i);
      const earned = score === 0 ? 0 : score * rate + base;
      const delta = earned - originalXP;
      if (state.skills[i].xp + delta < 0) return { status: 'invalid' };
      if (!entry.bonusBases) entry.bonusBases = Array(SKILLS.length).fill(null);
      entry.bonusBases[i] = base;
      entry.scores[i] = score;
      if (Number.isInteger(entry.bonuses?.[i])) entry.bonuses[i] = score > 0 ? base : 0;
      state.skills[i].xp += delta;
      return { status: 'updated', delta, state };
    }
    function submitCorrection(i, score, expectedDay, keepDailyOpen = false) {
      const before = level(state.skills[i]?.xp || 0), totalBefore = totalSkillLevel();
      const result = editCheckIn(i, score, expectedDay);
      if (!keepDailyOpen) document.getElementById('check-dialog').close();
      if (result.status !== 'updated') {
        notify('This rating could not be changed. Open the skill again to check its current status.');
        return;
      }
      const persisted = save();
      render(false);
      if (state !== result.state) return;
      if (keepDailyOpen) openDailyCheck(i, score);
      if (persisted || developer.active)
        queueLevels(i, before, level(state.skills[i].xp), totalBefore, totalSkillLevel());
      notify(SKILLS[i].name + ' · corrected to ' + score + '/5 · ' +
        (result.delta > 0 ? '+' : '') + result.delta + ' XP' +
        (developer.active ? ' · preview only.' : persisted ? ' · saved.' : ' · temporary; export a backup.'));
    }
    // The first bonus-enabled session establishes a baseline for older saves.
    // A paid milestone is never paid twice, even if today's ratings are edited.
    function initializeFiveForFiveRewards() {
      if (!Number.isInteger(state.fiveForFivePaidMilestones) || state.fiveForFivePaidMilestones < 0)
        state.fiveForFivePaidMilestones = Math.floor(achievementStats().perfectDayMedals / 5);
    }
    function awardFiveForFiveBonus(queueCelebrations = true) {
      const medals = achievementStats().perfectDayMedals;
      const reached = Math.floor(medals / 5);
      if (reached <= state.fiveForFivePaidMilestones) return null;
      const before = state.skills.map(skill => level(skill.xp));
      const totalBefore = totalSkillLevel();
      // Catch up at most one new milestone per check-in. No retroactive bulk payouts.
      state.fiveForFivePaidMilestones = reached;
      state.skills.forEach(skill => { skill.xp += 5; });
      const after = state.skills.map(skill => level(skill.xp));
      const totalAfter = totalSkillLevel();
      let priorTotal = totalBefore;
      SKILLS.forEach((_, index) => {
        const nextTotal = priorTotal + after[index] - before[index];
        if (queueCelebrations) queueLevels(index, before[index], after[index], priorTotal, nextTotal);
        priorTotal = nextTotal;
      });
      return { medals };
    }
    function submitCheckIn(i, score, keepDailyOpen = false) {
      const earnedBefore = developer.active ? [] : earnedAchievements();
      initializeFiveForFiveRewards();
      const result = recordCheckIn(i, score);
      if (result.status === 'invalid') return;
      if (!keepDailyOpen) document.getElementById('check-dialog').close();
      if (result.status === 'duplicate') {
        notify(SKILLS[i].name + ' is already checked in today.');
        return;
      }
      queueLevels(i, result.before, result.after, result.totalBefore, result.totalAfter);
      const bonus = awardFiveForFiveBonus();
      const persisted = save();
      render(false);
      // A newer shared save can replace this state during saving.
      if (state !== result.state) return;
      if (keepDailyOpen) openDailyCheck(i, score);
      if (result.earned > 0) reward('+' + result.earned + ' XP');
      notify(
        SKILLS[i].name +
          ' · ' +
          score +
          '/5' +
          (developer.active
            ? ' · preview only.'
            : persisted
              ? ' · saved.'
              : ' · temporary; export a backup to keep this progress.'),
      );
      if (bonus) { reward('+5 XP to all five skills'); notify('🏅 Five for Five! ' + bonus.medals + ' medals · +5 XP to every skill!'); }
      const newBadges = developer.active ? [] : earnedAchievements().filter(id => !earnedBefore.includes(id));
      if (persisted && !developer.active && !celebrations.length) globalThis.FitQuestSounds?.play(bonus ? 'medal' : newBadges.length ? 'achievement' : 'checkin');
      if (newBadges.length) notify('🏆 ' + newBadges.length + ' achievement' + (newBadges.length === 1 ? '' : 's') + ' unlocked! Check Collections at the top.');
    }

    // User actions and backup import
    function journeySummary() {
      const today = day();
      const dates = Object.keys(state.days).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key) && key <= today && checkedCount(state.days[key]) > 0).sort();
      const elapsedDays = dates.length ? Math.floor((Date.parse(today + 'T00:00:00Z') - Date.parse(dates[0] + 'T00:00:00Z')) / 86400000) : 0;
      return {
        started: dates.length > 0,
        elapsedDays,
        checkIns: dates.reduce((sum, key) => sum + checkedCount(state.days[key]), 0),
        totalLevel: currentTotalLevel(),
        rank: rankForTotalLevel(currentTotalLevel()) || 'Unranked',
        medals: achievementStats().perfectDayMedals,
      };
    }
    function journeyPanel() {
      return globalThis.FitQuestScreens.renderJourney({
        summary: journeySummary(), weeklyText: weeklyCheckInText(), resetText: resetText(), safeText,
      });
    }
    function rankProgressionPanel() {
      const total = currentTotalLevel();
      return globalThis.FitQuestScreens.renderRanks({ total, current: rankForTotalLevel(total), ranks: TOTAL_LEVEL_RANKS, safeText });
    }
    function handleTrackerClick(e) {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.id === 'dev-enter-settings') {
        if (syncSharedSave()) {
          render(false);
          notify('Progress changed in another tab. Please open Developer Mode again.');
          return;
        }
        if (!save() || !developer.enter(saves.loaded, saves.lastRaw)) {
          notify('Save your progress or export a backup before opening Developer Mode.');
          return;
        }
        render(false);
        developer.handleClick({ id: 'dev-open-settings', dataset: {} });
        notify('Developer Mode opened. Your normal save is protected.');
        return;
      }
      if (b.id === 'sound-toggle') {
        const sounds = globalThis.FitQuestSounds;
        if (sounds) { sounds.setEnabled(!sounds.isEnabled()); sounds.unlock(); sounds.play('checkin'); }
        render(false);
        return;
      }
      if (b.id === 'bonuses-close') {
        document.getElementById('bonuses-dialog').close();
        return;
      }
      if (b.id === 'bonuses-open') {
        syncSharedSave();
        refreshDayIfNeeded();
        markAchievementViewed('five-perfect-scores');
        render(false);
        document.getElementById('bonuses-content').innerHTML = renderBonusesPanel();
        document.getElementById('bonuses-dialog').showModal();
        return;
      }
      if (b.id === 'journey-close') {
        document.getElementById('journey-dialog').close();
        return;
      }
      if (b.id === 'journey-open') {
        if (syncSharedSave()) render(false);
        refreshDayIfNeeded();
        document.getElementById('journey-content').innerHTML = journeyPanel();
        document.getElementById('journey-dialog').showModal();
        return;
      }
      if (b.dataset.achievementCategory !== undefined) {
        const category = b.dataset.achievementCategory;
        const expanded = !expandedAchievementCategories.has(category);
        if (expanded) expandedAchievementCategories.add(category);
        else expandedAchievementCategories.delete(category);
        b.setAttribute('aria-expanded', String(expanded));
        b.querySelector('.category-arrow').textContent = expanded ? '▾' : '▸';
        document.getElementById(b.getAttribute('aria-controls')).hidden = !expanded;
        return;
      }
      if (syncSharedSave()) render(false);
      refreshDayIfNeeded();
      if (b.dataset.swapQuest !== undefined) {
        if (swapDailyQuest(b.dataset.swapQuest)) { save(); render(false); }
        return;
      }
      if (b.dataset.viewAchievement !== undefined) {
        markAchievementViewed(b.dataset.viewAchievement);
        render(false);
        return;
      }
      if (b.id === 'overall-level') {
        openTotalRewards();
        return;
      }
      if (b.id === 'reward-previous' || b.id === 'reward-next') {
        totalRewardIndex = Math.max(0, Math.min(TOTAL_REWARDS.length - 1,
          selectedRewardIndex() + (b.id === 'reward-next' ? 1 : -1)));
        document.getElementById('total-content').innerHTML = totalRewardsPanel();
        const control = document.getElementById(b.id);
        (control.disabled ? document.getElementById(
          b.id === 'reward-next' ? 'reward-previous' : 'reward-next') : control).focus();
        return;
      }
      if (b.dataset.skillProgress !== undefined) {
        openSkillCheck(Number(b.dataset.skillProgress), b.dataset.editing === 'true', true);
        return;
      }
      if (b.dataset.skillRating !== undefined) {
        openSkillCheck(Number(b.dataset.skillRating), b.dataset.editing === 'true');
        return;
      }
      if (b.id === 'total-close') {
        document.getElementById('total-dialog').close();
        return;
      }
      if (b.id === 'recovery-reload') {
        location.reload();
        return;
      }
      if (developer.handleClick(b)) return;

      if (b.id === 'intro-replay') { introStep = 0; introPracticeSkill = null; introPracticeRating = null; render(false); return; }
      if (introStep >= 0 && b.dataset.introSkill !== undefined) { introPracticeSkill = Number(b.dataset.introSkill); introPracticeRating = null; render(false); return; }
      if (introStep >= 0 && b.dataset.introRating !== undefined) { introPracticeRating = Number(b.dataset.introRating); render(false); return; }
      if (b.id === 'intro-skip') { finishIntro(); return; }
      if (b.id === 'intro-next') { if (introStep >= 3) finishIntro(); else { introStep++; render(false); } return; }
      if (b.id === 'intro-back') { introStep = Math.max(0, introStep - 1); render(false); return; }
      if (b.id === 'level-next') {
        nextCelebration();
        return;
      }
      if (b.id === 'restart') {
        if (
          !confirm(
            'Start fresh? This removes all XP and check-ins on this device. Export a backup first if you want to keep them.',
          )
        )
          return;
        if (!prepareReplacement()) return;
        saves.clearRejected();
        state = fresh();
        tab = 'dashboard';
        const persisted = save();
        render(false);
        notify(
          persisted
            ? 'Tracker reset. Every skill starts at 0 XP.'
            : 'Progress reset in this page only. Device saving is unavailable.',
        );
      }
      if (b.dataset.openCheckin !== undefined) {
        openDailyCheck();
        return;
      }
      if (b.dataset.openSkill !== undefined) {
        openSkillCheck(Number(b.dataset.openSkill), false, true);
        return;
      }
      if (b.dataset.tab) {
        const targetTab = b.dataset.tab;
        tab = b.closest('nav') && tab === targetTab ? 'dashboard' : targetTab;

        render();
        window.scrollTo(0, 0);
        return;
      }
      if (b.id === 'check-close' || b.dataset.closeCheckin !== undefined) {
        document.getElementById('check-dialog').close();
        return;
      }
      if (b.id === 'save-daily-checkin') {
        saveDailyCheckin(b.dataset.day);
        return;
      }
      if (b.dataset.dailyScore !== undefined) {
        submitDailyRating(Number(b.dataset.skill), Number(b.dataset.dailyScore), b.dataset.day);
        return;
      }
      if (b.dataset.editSkill !== undefined) {
        openSkillCheck(Number(b.dataset.editSkill), true);
        return;
      }
      if (b.dataset.editScore !== undefined) {
        submitCorrection(Number(b.dataset.skill), Number(b.dataset.editScore), b.dataset.day);
        return;
      }
      if (b.dataset.quickScore !== undefined) {
        submitCheckIn(Number(b.dataset.skill), Number(b.dataset.quickScore));
        return;
      }
      if (b.id === 'export') {
        save();
        const url = URL.createObjectURL(
          new Blob([saves.rejectedRaw !== null ? saves.rejectedRaw : JSON.stringify(state, null, 2)], {
            type: 'application/json',
          }),
        );
        const a = document.createElement('a');
        a.href = url;
        a.download =
          (saves.rejectedRaw !== null ? 'fitquest-original-save-' : 'fitquest-save-') +
          day() +
          '.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    }
    // Confirmation captures the exact task; a changed day or task cannot receive its XP.
    function commitDailyQuest(completed, expectedDay, expectedQuest) {
      syncSharedSave();
      const current = dailyQuest();
      if (expectedDay !== day() || current.skill !== expectedQuest.skill ||
          current.index !== expectedQuest.index || current.swaps !== expectedQuest.swaps)
        return { status: 'expired' };
      const original = readSave(JSON.stringify(state));
      const result = setQuestCompleted(completed, expectedDay);
      if (result.status !== 'updated') return result;
      const working = state;
      const persisted = save();
      if (state !== working) return { status: 'expired' };
      if (!persisted && !developer.active) {
        state = original;
        return { status: 'failed' };
      }
      return result;
    }
    function showQuestXP(skill) {
      const card = document.querySelector('[data-open-skill="' + skill + '"]');
      if (!card) return;
      const label = document.createElement('span');
      label.className = 'daily-quest-xp-reward';
      label.setAttribute('role', 'status');
      label.setAttribute('aria-label', '+2 XP to ' + SKILLS[skill].name);
      label.textContent = '+2 XP';
      card.append(label);
      setTimeout(() => label.remove(), 1800);
    }
    function confirmDailyQuest() {
      const dialog = document.getElementById('daily-quest-confirm');
      if (dialog.open) return Promise.resolve(false);
      return new Promise(resolve => {
        const finish = accepted => {
          dialog.close();
          dialog.removeEventListener('cancel', cancel);
          dialog.removeEventListener('close', closed);
          yes.onclick = no.onclick = null;
          resolve(accepted);
        };
        const yes = document.getElementById('daily-quest-yes');
        const no = document.getElementById('daily-quest-no');
        const cancel = event => { event.preventDefault(); finish(false); };
        const closed = () => finish(false);
        yes.onclick = () => finish(true);
        no.onclick = () => finish(false);
        dialog.addEventListener('cancel', cancel);
        dialog.addEventListener('close', closed);
        dialog.showModal();
        no.focus();
      });
    }
    document.addEventListener('change', async (event) => {
      if (event.target.id !== 'daily-quest-check') return;
      const completed = event.target.checked, expectedDay = event.target.dataset.questDay;
      const expectedQuest = { ...dailyQuest() };
      event.target.checked = expectedQuest.completed;
      if (completed && !await confirmDailyQuest()) return;
      globalThis.FitQuestSounds?.unlock();
      const apply = () => {
        const result = commitDailyQuest(completed, expectedDay, expectedQuest);
        render(false);
        if (result.status !== 'updated') {
          if (result.status !== 'unchanged') notify(result.status === 'failed'
            ? 'Quest was not saved. Please try again.' : 'Your Daily Quest changed. Please review it before submitting.');
          return;
        }
        notify(SKILLS[result.skill].name + (completed ? ' · +2 XP' : ' · quest reward removed') +
          (developer.active ? ' · preview only.' : ' · saved.'));
        if (completed) {
          showQuestXP(result.skill);
          globalThis.FitQuestSounds?.play('checkin');
          // Let the skill bar finish its 600 ms animation before opening fireworks.
          setTimeout(() => {
            queueLevels(result.skill, result.before, result.after, result.totalBefore, result.totalAfter);
          }, 1000);
        }
      };
      if (typeof navigator !== 'undefined' && navigator.locks)
        navigator.locks.request('fitness-level-up-save', apply).catch(() => notify('Could not save the quest. Please try again.'));
      else apply();
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('button')) return;
      if (typeof navigator !== 'undefined' && navigator.locks) {
        navigator.locks
          .request('fitness-level-up-save', () => handleTrackerClick(e))
          .catch((err) => {
            console.error(err);
            notify('Could not update progress. Please try again.');
          });
      } else {
        handleTrackerClick(e);
      }
    });
    document.addEventListener('change', async (e) => {
      if (e.target.id !== 'import' || !e.target.files[0]) return;
      try {
        const s = readSave(await e.target.files[0].text());
        if (!confirm('Replace progress on this device with this backup?')) return;
        if (!prepareReplacement()) return;
        state = s;
        saves.clearRejected();
        const persisted = save();
        render(false);
        notify(
          persisted
            ? 'Backup restored.'
            : 'Backup loaded in this page only. Export before closing; device saving is unavailable.',
        );
      } catch (err) {
        notify('This file is not a valid FitQuest save.');
      }
    });
    document.getElementById('level-dialog').addEventListener('cancel', (e) => {
      e.preventDefault();
      nextCelebration();
    });

    // Check-in dialog
    const RATING_GUIDANCE = [
      'No progress',
      'Small start',
      'Some progress',
      'About halfway',
      'Mostly met',
      'Goal met',
    ];
    // Daily ratings are a draft until the user saves the complete form.
    function submitDailyRating(i, score, expectedDay) {
      if (!Number.isInteger(i) || i < 0 || i >= SKILLS.length ||
          !Number.isInteger(score) || score < 0 || score > 5) return;
      if (expectedDay !== day() || draftDay !== day()) {
        draftRatings = null;
        openDailyCheck();
        notify('A new check-in day has started. Please review your ratings.');
        return;
      }
      draftRatings[i] = score;
      renderDailyDraft(i, score);
    }

    function renderDailyDraft(focusSkill, focusScore) {
      document.getElementById('check-content').innerHTML = globalThis.FitQuestScreens.renderDailyCheckin({
        ratings: draftRatings, skills: SKILLS, displayOrder: SKILL_DISPLAY_ORDER, safeText, day: draftDay,
      });
      if (Number.isInteger(focusSkill))
        document.getElementById('daily-rate-' + focusSkill + '-' + focusScore)?.focus({ preventScroll: true });
    }

    function openDailyCheck() {
      // Opening again discards an abandoned draft and loads the saved ratings.
      draftDay = day();
      draftRatings = (dailyEntry()?.scores || Array(SKILLS.length).fill(0)).map(score => score ?? 0);
      renderDailyDraft();
      const dialog = document.getElementById('check-dialog');
      if (!dialog.open) dialog.showModal();
    }

    function saveDailyCheckin(expectedDay) {
      if (!draftRatings || expectedDay !== day() || draftDay !== day()) {
        openDailyCheck();
        notify('A new check-in day has started. Please review your ratings.');
        return false;
      }
      // Refuse a stale draft rather than applying it to a newer shared save.
      if (syncSharedSave()) {
        openDailyCheck();
        notify('Progress changed in another tab. Review the latest ratings before saving.');
        return false;
      }
      const original = state;
      const earnedBefore = developer.active ? [] : earnedAchievements();
      const before = state.skills.map(skill => level(skill.xp));
      const totalBefore = totalSkillLevel();
      state = readSave(JSON.stringify(state));
      const working = state;
      initializeFiveForFiveRewards();
      for (let i = 0; i < SKILLS.length; i++) {
        const entry = dailyEntry();
        const result = entry && Number.isInteger(entry.scores[i])
          ? editCheckIn(i, draftRatings[i], expectedDay)
          : recordCheckIn(i, draftRatings[i]);
        if (!['recorded', 'updated'].includes(result.status)) {
          state = original;
          notify('Ratings could not be saved. Please review and try again.');
          return false;
        }
      }
      awardFiveForFiveBonus(false);
      const persisted = developer.active || save();
      if (!persisted) {
        if (state === working) state = original;
        notify('Ratings were not saved. Keep this form open and try again, or export a backup.');
        return false;
      }
      const earned = state.skills.reduce((sum, skill, i) => sum + skill.xp - original.skills[i].xp, 0);
      const after = state.skills.map(skill => level(skill.xp));
      draftRatings = null;
      document.getElementById('check-dialog').close();
      render(false);
      let runningTotal = totalBefore;
      SKILLS.forEach((_, i) => {
        const nextTotal = runningTotal + after[i] - before[i];
        queueLevels(i, before[i], after[i], runningTotal, nextTotal);
        runningTotal = nextTotal;
      });
      const newBadges = developer.active ? [] : earnedAchievements().filter(id => !earnedBefore.includes(id));
      if (!developer.active && !celebrations.length) globalThis.FitQuestSounds?.play(newBadges.length ? 'achievement' : 'checkin');
      if (earned > 0) reward('+' + earned + ' XP');
      notify('Today’s check-in saved' + (developer.active ? ' · preview only' : '') +
        '. ' + (earned > 0 ? '+' : '') + earned + ' XP.' +
        (newBadges.length ? ' ' + newBadges.length + ' achievements unlocked.' : ''));
      return true;
    }

    function openSkillCheck(i, editing = false, viewingProgress = false) {
      if (!Number.isInteger(i) || i < 0 || i >= SKILLS.length) return;
      const s = SKILLS[i],
        x = state.skills[i],
        l = level(x.xp),
        entry = dailyEntry(),
        done = entry && Number.isInteger(entry.scores[i]);
      const maxed = l === MAX_LEVEL,
        earned = x.xp - XP[l],
        needed = maxed ? 0 : XP[l + 1] - XP[l],
        progress = maxed ? 1 : earned / needed,
        nextTitleLevel = Math.min(MAX_LEVEL, (Math.floor(l / 7) + 1) * 7);
      const xpPanel =
        '<section class="popup-progress" aria-label="' +
        s.name +
        ' experience"><div class="row"><strong>Skill Level ' +
        l +
        '</strong><span>' +
        titleFor(i, l) +
        '</span></div><progress max="1" value="' +
        progress +
        '" aria-label="' +
        s.name +
        ' progress to next level"></progress><div class="row muted"><span>' +
        x.xp.toLocaleString() +
        ' total XP</span><span>' +
        (maxed
          ? 'Level ' + MAX_LEVEL + ' · MAX'
          : earned.toLocaleString() + ' / ' + needed.toLocaleString() + ' XP to Level ' + (l + 1)) +
        '</span></div>' +
        (maxed ? '<p>Mastery achieved — ' + CROWNS[i] + '</p>' : '') +
        (maxed
          ? crown(i)
          : '<p class="muted">Next title: <strong>' +
            titleFor(i, nextTitleLevel) +
            '</strong> at level ' +
            nextTitleLevel +
            '</p>') +
        (CONFIG.bonusMilestones.some((milestone) => milestone.level > l)
          ? '<p class="muted">+' +
            CONFIG.bonusMilestones.find((milestone) => milestone.level > l).xp +
            ' XP Bonus at Level ' +
            CONFIG.bonusMilestones.find((milestone) => milestone.level > l).level + '</p>'
          : '') +
        '</section>';
      if (viewingProgress) {
        document.getElementById('check-content').innerHTML =
          '<div class="row"><h2 id="check-heading">' + skillIcon(i) + ' ' + s.name +
          '</h2><button id="check-close" class="popup-close" aria-label="Close check-in">×</button></div>' +
          xpPanel + '<p>' + safeText(s.hint) + '</p><button class="wide" data-open-checkin>Go to Daily Check-In</button>';
        if (!document.getElementById('check-dialog').open)
          document.getElementById('check-dialog').showModal();
        return;
      }
      document.getElementById('check-content').innerHTML =
        '<div class="row"><h2 id="check-heading">' +
        skillIcon(i) +
        ' ' +
        s.name +
        '</h2><button id="check-close" class="popup-close" aria-label="Close check-in">×</button></div>' +
        (done && !editing
          ? '<div class="saved-score">✓ Checked in today · ' +
            entry.scores[i] +
            '/5 — ' +
            RATING_GUIDANCE[entry.scores[i]] +
            '</div><button class="wide" data-edit-skill="' + i +
            '">Edit today’s rating</button><p class="muted">' +
            resetText() +
            '</p>'
          : '<p>' +
            (editing ? 'Choose your corrected rating.' : s.hint) +
            '</p><div class="scores guided-scores" role="group" aria-label="' +
            s.name +
            ' score">' +
            RATING_GUIDANCE.map(
              (label, v) =>
                '<button ' + (editing ? 'data-edit-score="' : 'data-quick-score="') +
                v +
                '" data-skill="' +
                i +
                '" data-day="' + day() + '"' +
                (editing ? ' aria-pressed="' + (entry.scores[i] === v) + '"' : '') +
                ' aria-label="' +
                v +
                ' out of 5: ' +
                label +
                '"><strong>' +
                v +
                '</strong><span>' +
                label +
                '</span><span>' + (editing
                  ? ((v === 0 ? 0 : v * correctionTerms(entry, i).rate + correctionTerms(entry, i).base) + ' XP total')
                  : ('+' + checkInXP(v, l) + ' XP')) + '</span></button>',
            ).join('') +
            '</div><p class="muted rating-save-note">' +
            (editing ? 'Tap to save your correction.' :
              'Tap to save. You can edit today’s rating.') + '</p><details class="rating-help"><summary>How ratings work</summary><p class="rating-intro">Rate progress toward your own goal. Planned rest or recovery can count as meeting your goal. One check-in per skill each day; corrections replace its rating and adjust XP.</p></details>') +
        '<button class="wide view-progress" data-skill-progress="' + i +
        '" data-editing="' + editing + '">View progress</button>';
      if (!document.getElementById('check-dialog').open)
        document.getElementById('check-dialog').showModal();
    }

    // Tests can inspect tracker logic without modifying this source file.
    // Normal browsers never provide this hook, so startup is unchanged.
    if (typeof globalThis.__fitQuestTestHook === 'function') {
      globalThis.__fitQuestTestHook({
        enableSaving: () => saves.markReady(),
        XP, MAX_LEVEL, MAX_TOTAL_LEVEL, fresh, level, readSave, recordCheckIn,
        achievementStats, earnedAchievements, setProfileLevels: developer.setProfileLevels, journeySummary, journeyPanel, dailyQuest, setQuestCompleted, swapDailyQuest, commitDailyQuest,
        unseenAchievements, markAchievementViewed,
        editCheckIn, skillBonus, checkInXP, totalSkillLevel, totalReward,
        TOTAL_REWARDS, weeklyCheckInCount, day, nextReset, nextRewardText,
        queueLevels, queueLegendCelebration, previewCelebration,
        setPreviewHistory: developer.setHistory, unlockPreviewAchievements: developer.unlockAllAchievements, dashboard, openDailyCheck, submitDailyRating, saveDailyCheckin, openSkillCheck, totalRewardsPanel, rewardBadge,
        dialogHTML: () => document.getElementById('check-content').innerHTML,
        state: () => state,
        setState: (value) => { state = value; },
        preview: developer.preview,
        queued: () => celebrations,
      });
      return;
    }

    // Startup and browser lifecycle
    function updateHeaderHeight() {
      const header = document.querySelector('header');
      if (header)
        document.documentElement.style.setProperty(
          '--hud-height',
          header.getBoundingClientRect().height + 'px',
        );
    }
    const topNav = document.querySelector('nav'),
      headerContent = document.querySelector('header>div');
    if (topNav && headerContent) {
      headerContent.appendChild(topNav);
      const devOpen = document.getElementById('dev-open');
      if (devOpen) headerContent.appendChild(devOpen);
      topNav.querySelectorAll('button').forEach((b) => {
        const label = b.textContent.trim();
        b.setAttribute('aria-label', label);
        b.title = label;
      });
    }
    updateHeaderHeight();
    if (typeof ResizeObserver === 'function') {
      try {
        const observer = new ResizeObserver(updateHeaderHeight);
        observer.observe(document.querySelector('header'));
      } catch (err) {
        window.addEventListener('resize', updateHeaderHeight);
      }
    } else {
      window.addEventListener('resize', updateHeaderHeight);
    }
    document.getElementById('check-dialog').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        const r = e.currentTarget.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
          e.currentTarget.close();
      }
    });
    setupNoticeDismissal();
    developer.setupUI();
    if (!developer.active && saves.rejectedRaw === null) initializeFiveForFiveRewards();
    try {
      // Do not interrupt returning players or developer/test sessions.
      if (!developer.active && saves.rejectedRaw === null && !saves.lastRaw && localStorage.getItem(INTRO_KEY) !== '1') introStep = 0;
    } catch (_) { /* Continue directly to the dashboard if storage is unavailable. */ }
    render(false);
    saves.markReady();
    save();
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshDayIfNeeded();
        refreshResetCountdown();
        renderHUD();
      }
    }, 60000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (syncSharedSave()) render(false);
        refreshDayIfNeeded();
        refreshResetCountdown();
        renderHUD();
      }
    });
    window.addEventListener('pagehide', () => {
      save();
    });

    window.addEventListener('storage', (e) => {
      if ((e.key === KEY || e.key === null) && syncSharedSave()) {
        render(false);
        notify('Progress updated from another tab.');
      }
    });
  } catch (err) {
    console.error('FitQuest startup error', err);
    const view = document.getElementById('view');
    if (view) {
      view.innerHTML =
        '<section class="card"><h2>FitQuest needs a refresh</h2><p>Startup could not finish. Reload to try again. Avoid clearing browser data if you have progress saved here.</p><button id="startup-reload" class="wide">Reload FitQuest</button></section>';
      document.getElementById('startup-reload').addEventListener('click', () => location.reload());
    }
    const nav = document.querySelector('nav');
    if (nav) nav.hidden = true;
  }
})();
