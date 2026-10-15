globalThis.FitQuestAchievements = {
  create(context) {
    const { SKILLS, SKILL_SYMBOLS, level, checkedCount, day, currentTotalLevel, safeText, save, getState, isDev, bonusForLevel } = context;
    const state = new Proxy({}, { get: (_, key) => getState()[key], set: (_, key, value) => { getState()[key] = value; return true; } });
    // Collections: achievements are derived from existing levels and check-in history.
    // Only the list of viewed badge IDs is saved; earned achievements cannot be lost.
    const TOTAL_LEVEL_RANKS = {
      10: 'Bronze', 25: 'Silver', 50: 'Gold', 75: 'Platinum',
      100: 'Emerald', 150: 'Diamond', 200: 'Master', 250: 'Grandmaster',
    };
    const ACHIEVEMENTS = [
      { id: 'first-check-in', category: 'Consistency', name: 'First Check-In', description: 'Complete your first check-in in any skill', goal: 1, kind: 'days' },
      ...[3, 7, 14, 30, 100].map(n => ({ id: 'days-' + n, category: 'Consistency', name: n + ' Active Days', description: 'Check in on ' + n + ' different days', goal: n, kind: 'days' })),
      ...[3, 7, 14, 30].map(n => ({ id: 'streak-' + n, category: 'Consistency', name: n + '-Day Streak', description: 'Check in ' + n + ' days in a row', goal: n, kind: 'streak' })),
      ...[10, 25, 50, 75, 100, 150, 200, 250].map(n => ({ id: 'total-' + n, category: 'Levels', name: TOTAL_LEVEL_RANKS[n], description: 'Reach Total Level ' + n, goal: n, kind: 'total' })),
      ...[10, 25, 50].map(n => ({ id: 'skill-any-' + n, category: 'Skills', name: 'Skill Level ' + n, description: 'Reach Level ' + n + ' in any skill', goal: n, kind: 'skill' })),
      ...SKILLS.map((skill, i) => ({ id: 'specialist-' + i, category: 'Skills', name: skill.name + ' Specialist', description: 'Reach Level 25 in ' + skill.name, goal: 25, kind: 'specialist', skill: i })),
      ...SKILLS.map((skill, i) => ({ id: 'mastery-' + i, category: 'Skills', name: skill.name + ' Mastery', description: 'Reach Level 50 in ' + skill.name, goal: 50, kind: 'mastery', skill: i })),
      { id: 'five-perfect-scores', category: 'Skills', name: 'Five for Five', description: 'Earn a 5/5 rating in all five skills on the same day', goal: 5, kind: 'perfect-day' },
      { id: 'all-skills-10', category: 'Skills', name: 'Well Rounded', description: 'Reach Level 10 in all five skills', goal: 10, kind: 'all' },
      ...[20, 30, 40, 50].map(n => ({ id: 'all-skills-' + n, category: 'Skills', hiddenUntilEarned: n === 50, name: 'All Skills Level ' + n, description: 'Reach Level ' + n + ' in all five skills', goal: n, kind: 'all' })),
      { id: 'weekly-best', category: 'Personal Bests', name: 'New Weekly Best', description: 'Exceed your previous best number of active days in a completed week', goal: 1, kind: 'weekly' },
      { id: 'weekly-improvement', category: 'Personal Bests', name: 'On the Rise', description: 'Check in on more days than the previous completed week', goal: 1, kind: 'improved' },
      { id: 'fitquest-legend', category: 'Legend', hiddenUntilEarned: true, name: 'FitQuest Legend', description: 'Earn every other achievement', goal: 1, kind: 'completionist' },
    ];
    function achievementStats() {
      const active = Object.keys(state.days).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k) && checkedCount(state.days[k]) > 0).sort();
      const activeSet = new Set(active);
      let longest = 0;
      for (const key of active) {
        const prior = new Date(key + 'T00:00:00Z');
        prior.setUTCDate(prior.getUTCDate() - 1);
        const previous = prior.toISOString().slice(0, 10);
        let length = 1;
        for (let d = previous; activeSet.has(d);) {
          length++;
          const date = new Date(d + 'T00:00:00Z');
          date.setUTCDate(date.getUTCDate() - 1);
          d = date.toISOString().slice(0, 10);
        }
        longest = Math.max(longest, length);
      }
      const weekly = new Map();
      for (const key of active) {
        const date = new Date(key + 'T00:00:00Z');
        date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
        const monday = date.toISOString().slice(0, 10);
        weekly.set(monday, (weekly.get(monday) || 0) + 1);
      }
      const current = new Date(day() + 'T00:00:00Z');
      current.setUTCDate(current.getUTCDate() - (current.getUTCDay() + 6) % 7);
      const currentMonday = current.toISOString().slice(0, 10);
      const completeWeeks = [...weekly].filter(([m]) => m < currentMonday).sort(([a], [b]) => a.localeCompare(b));
      let weeklyBest = false, improved = false, best = 0, previous = null;
      for (const [, count] of completeWeeks) {
        if (previous !== null) {
          if (count > best) weeklyBest = true;
          if (count > previous) improved = true;
        }
        best = Math.max(best, count);
        previous = count;
      }
      const perfectDayScores = Object.values(state.days).map(entry =>
        Array.isArray(entry && entry.scores) ? entry.scores.filter(score => score === 5).length : 0);
      const bestPerfectDay = Math.max(0, ...perfectDayScores);
      const perfectDayMedals = perfectDayScores.filter(count => count === SKILLS.length).length;
      return { activeDays: active.length, longest, weeklyBest, improved, bestPerfectDay, perfectDayMedals, levels: state.skills.map(s => level(s.xp)), total: currentTotalLevel() };
    }
    function achievementProgress(a, s) {
      switch (a.kind) {
        case 'days': return s.activeDays;
        case 'perfect-day': return s.bestPerfectDay;
        case 'streak': return s.longest;
        case 'total': return s.total;
        case 'skill': return Math.max(...s.levels);
        case 'specialist':
        case 'mastery': return s.levels[a.skill];
        case 'all': return Math.min(...s.levels);
        case 'weekly': return s.weeklyBest ? 1 : 0;
        case 'improved': return s.improved ? 1 : 0;
        case 'completionist':
          // Exclude completionist rewards to avoid circular unlock requirements.
          return ACHIEVEMENTS.filter(other => other.kind !== 'completionist')
            .every(other => achievementProgress(other, s) >= other.goal) ? 1 : 0;
        default: return 0;
      }
    }
    // Secret rewards enter the visible collection only after their requirement is met.
    function visibleAchievements(stats) {
      return ACHIEVEMENTS.filter(a => !a.hiddenUntilEarned || achievementProgress(a, stats) >= a.goal);
    }
    function earnedAchievements() {
      const stats = achievementStats();
      return ACHIEVEMENTS.filter(a => achievementProgress(a, stats) >= a.goal).map(a => a.id);
    }
    function unseenAchievements() {
      const viewed = Array.isArray(state.achievementsSeen) ? state.achievementsSeen : [];
      return earnedAchievements().filter(id => !viewed.includes(id));
    }
    function updateCollectionBadge() {
      const button = document.querySelector('nav button[data-tab="collections"]');
      if (!button) return;
      const count = unseenAchievements().length;
      const badge = button.querySelector('.collection-count');
      if (badge) {
        badge.textContent = count > 9 ? '9+' : String(count);
        badge.hidden = count === 0;
      }
      button.setAttribute('aria-label', count ? 'Collections, ' + count + ' new achievements' : 'Collections');
      button.title = count ? 'Collections · ' + count + ' new' : 'Collections';
    }
    function achievementMedalTier(achievement) {
      const goal = achievement.goal;
      switch (achievement.kind) {
        case 'days': return goal >= 100 ? 'platinum' : goal >= 30 ? 'gold' : goal >= 14 ? 'silver' : 'bronze';
        case 'streak': return goal >= 30 ? 'platinum' : goal >= 14 ? 'gold' : goal >= 7 ? 'silver' : 'bronze';
        case 'total': return goal >= 150 ? 'gold' : goal >= 50 ? 'silver' : 'bronze';
        case 'skill': return goal >= 50 ? 'gold' : goal >= 25 ? 'silver' : 'bronze';
        case 'specialist': return 'silver';
        case 'all': return 'gold';
        case 'perfect-day': return 'gold';
        case 'weekly': return 'gold';
        default: return 'silver';
      }
    }
    function achievementBadge(achievement) {
      if (achievement.kind === 'skill') return 'achievement-skill-' + achievement.goal;
      if (achievement.id === 'days-7') return 'achievement-active-7';
      if (achievement.id === 'streak-30') return 'achievement-streak-30';
      if (achievement.kind === 'completionist') return 'achievement-legend';
      if (achievement.id === 'all-skills-50') return 'achievement-grandmaster';
      if (achievement.id === 'five-perfect-scores') return 'achievement-five-for-five';
      if (achievement.id === 'first-check-in') return 'achievement-first-check-in';
      if (achievement.kind === 'specialist') return 'specialist-' + SKILL_SYMBOLS[achievement.skill];
      if (achievement.kind === 'mastery') return 'mastery-' + SKILL_SYMBOLS[achievement.skill];
      if (achievement.kind === 'all') return achievement.goal === 10
        ? 'achievement-well-rounded' : 'achievement-all-skills-' + achievement.goal;
      if (achievement.kind === 'total') return 'rank-' + TOTAL_LEVEL_RANKS[achievement.goal].toLowerCase();
      return 'achievement-' + achievementMedalTier(achievement);
    }
    function achievementImage(achievement) {
      return achievementBadge(achievement) + (achievement.kind === 'completionist' ? '.png' : '.svg');
    }
    function achievementRewardLabel(achievement) {
      if (achievement.kind === 'total') return TOTAL_LEVEL_RANKS[achievement.goal] + ' rank';
      if (achievement.kind === 'completionist' || achievement.kind === 'specialist' || achievement.kind === 'mastery' || achievement.kind === 'all' || achievement.id === 'first-check-in')
        return 'Badge earned';
      return achievementMedalTier(achievement) + ' medal';
    }
    const expandedAchievementCategories = new Set();
    function nearbyLevelAchievements(stats = achievementStats()) {
      return visibleAchievements(stats).filter(a => ['total', 'skill', 'specialist', 'mastery', 'all'].includes(a.kind))
        .map(achievement => {
          const progress = achievementProgress(achievement, stats);
          return { achievement, progress, remaining: achievement.goal - progress };
        })
        .filter(item => item.remaining > 0 && item.remaining <= 3)
        .sort((a, b) => a.remaining - b.remaining || a.achievement.name.localeCompare(b.achievement.name));
    }
    function renderNearbyMilestones(stats = achievementStats()) {
      const nearby = nearbyLevelAchievements(stats).slice(0, 3);
      if (!nearby.length) return '<p>No level milestones within three levels yet. Keep checking in to bring the next milestone closer.</p>';
      return '<div class="nearby-milestones">' + nearby.map(({ achievement: a, remaining }) => {
        const requirement = a.kind === 'total' ? 'Reach Total Level ' + a.goal :
          a.kind === 'all' ? 'Reach Level ' + a.goal + ' in every skill' :
          a.kind === 'skill' ? 'Reach Level ' + a.goal + ' in any skill' :
          'Reach Level ' + a.goal + ' in ' + SKILLS[a.skill].name;
        const distance = a.kind === 'total' ? remaining + ' Total Level' + (remaining === 1 ? '' : 's') + ' away' :
          a.kind === 'all' ? 'Every skill within ' + remaining + ' level' + (remaining === 1 ? '' : 's') :
          remaining + ' level' + (remaining === 1 ? '' : 's') + ' away';
        return '<article class="nearby-milestone"><img src="assets/icons/' + achievementImage(a) +
          '?v=20261015-all-skills-tiers" alt="" width="48" height="48"><div><strong>' + safeText(a.name) +
          '</strong><small>' + safeText(requirement) + '</small><small>' + distance + '</small></div></article>';
      }).join('') + '</div>';
    }
    function achievementInReach(stats) {
      const count = Math.min(3, nearbyLevelAchievements(stats).length);
      return '<details class="achievement-in-reach"><summary>Achievements in reach' +
        (count ? ' <span class="nearby-count">' + count + '</span>' : '') +
        '</summary>' + renderNearbyMilestones(stats) + '</details>';
    }
    function renderMedalCounter(stats, unseen) {
      return '<button type="button" class="medal-counter" id="bonuses-open" aria-haspopup="dialog" aria-controls="bonuses-dialog" aria-label="' +
        stats.perfectDayMedals + ' Five for Five medals. View active bonuses">' +
        '<img src="assets/icons/achievement-five-for-five.svg" alt="" width="32" height="38">' +
        '<span>×' + stats.perfectDayMedals + '</span>' +
        (unseen.has('five-perfect-scores') ? '<span class="medal-new" aria-label="New medal"></span>' : '') + '</button>';
    }
    function renderBonusesPanel() {
      const stats = achievementStats();
      const paid = Number.isInteger(state.fiveForFivePaidMilestones) && state.fiveForFivePaidMilestones >= 0
        ? state.fiveForFivePaidMilestones : Math.floor(stats.perfectDayMedals / 5);
      const remaining = Math.max(0, (paid + 1) * 5 - stats.perfectDayMedals);
      const active = SKILLS.map((skill, i) => ({ name: skill.name, xp: bonusForLevel(stats.levels[i]) }))
        .filter(skill => skill.xp > 0);
      return '<h3>Active skill bonuses</h3>' +
        (active.length ? '<ul class="active-bonuses">' + active.map(skill =>
          '<li><strong>' + safeText(skill.name) + '</strong><span>+' + skill.xp + ' XP</span></li>').join('') +
          '</ul><p class="muted">Added to check-ins rated 1–5. A 0 rating earns 0 XP.</p>' :
          '<p>No skill bonuses unlocked yet. Reach Level 10 in a skill to earn +1 XP on its check-ins rated 1–5.</p>') +
        '<h3>Five for Five</h3><p><strong>' + stats.perfectDayMedals + ' medals earned</strong></p>' +
        '<p>Earn a medal by rating all five skills 5/5 on the same day.</p>' +
        '<p>Every 5 medals awards <strong>+5 XP to each skill</strong>, automatically. This is a one-time reward for each set of 5 medals.</p>' +
        '<p class="muted">' + remaining + ' more medal' + (remaining === 1 ? '' : 's') + ' to the next reward.</p>';
    }
    function renderCollections() {
      const stats = achievementStats(), earned = earnedAchievements(), unseen = new Set(unseenAchievements());
      const visible = visibleAchievements(stats);
      return '<section class="card collections"><button class="back-button" data-tab="dashboard">← Back</button>' +
        '<div class="collections-toolbar"><h2 class="collections-heading"><img src="assets/icons/collection-trophy.svg?v=20261014-lowered" alt="" width="36" height="36">Collections</h2>' + renderMedalCounter(stats, unseen) + '</div><p><strong>' + earned.length + ' / ' + visible.length +
        '</strong> achievements unlocked</p><progress max="' + visible.length + '" value="' + earned.length +
        '" aria-label="Collection completion"></progress>' +
        (isDev() ? '<p class="muted">Developer preview. Click badges to test notifications; your normal save is unchanged.</p>' : '') +
        achievementInReach(stats) +
        ['Consistency', 'Levels', 'Personal Bests', 'Skills', 'Legend'].map((category, index) => {
          const achievements = visible.filter(a => a.category === category && a.id !== 'five-perfect-scores');
          if (!achievements.length) return '';
          const unlockedCount = achievements.filter(a => achievementProgress(a, stats) >= a.goal).length;
          const newCount = achievements.filter(a => unseen.has(a.id)).length;
          const expanded = expandedAchievementCategories.has(category);
          return '<section class="achievement-category"><h3><button class="category-toggle" data-achievement-category="' +
            category + '" aria-expanded="' + expanded + '" aria-controls="achievement-category-' + index +
            '"><span class="category-arrow" aria-hidden="true">' + (expanded ? '▾' : '▸') +
            '</span><span>' + category + '</span>' + (newCount ? '<span class="achievement-new">' + newCount + ' new</span>' : '') + '<span class="category-count">' + unlockedCount +
            ' / ' + achievements.length + ' unlocked</span></button></h3><div id="achievement-category-' +
            index + '" class="achievement-list"' + (expanded ? '' : ' hidden') + '>' +
          achievements.map(a => {
            const progress = achievementProgress(a, stats), unlocked = progress >= a.goal;
            const isNew = unseen.has(a.id);
            const tag = unlocked ? 'button' : 'div';
            return '<' + tag + (unlocked ? ' type="button" data-view-achievement="' + a.id + '"' : '') + ' class="achievement ' + (unlocked ? 'unlocked' : 'locked') + '">' +
              '<span class="achievement-symbol" aria-hidden="true">' +
              '<img src="assets/icons/' + (unlocked ? achievementImage(a) : 'collection-locked.svg') +
                '?v=20261015-all-skills-tiers" alt="" width="56" height="56"></span>' +
              '<div><strong>' + safeText(a.name) + '</strong>' +
               (isNew ? ' <span class="achievement-new">New</span>' : '') + '<small>' + safeText(a.description) +
              '</small><progress max="' + a.goal + '" value="' + Math.min(a.goal, progress) +
              '" aria-label="' + safeText(a.name) + ' progress"></progress><small>' +
              Math.min(a.goal, progress) + ' / ' + a.goal + (unlocked ? ' · ' + achievementRewardLabel(a) + ' · Unlocked!' : '') +
              '</small></div></' + tag + '>';
          }).join('') + '</div></section>';
        }).join('') + '</section>';
    }
    function markAchievementViewed(id) {
      if (!earnedAchievements().includes(id)) return false;
      state.achievementsSeen = [...new Set([...(Array.isArray(state.achievementsSeen) ? state.achievementsSeen : []), id])];
      if (!isDev()) save();
      return true;
    }


    return { TOTAL_LEVEL_RANKS, ACHIEVEMENTS, achievementStats, earnedAchievements, unseenAchievements, updateCollectionBadge, expandedAchievementCategories, renderCollections, renderBonusesPanel, markAchievementViewed, nearbyLevelAchievements, renderNearbyMilestones };
  }
};
