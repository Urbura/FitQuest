globalThis.FitQuestAchievements = {
  create(context) {
    const { SKILLS, SKILL_SYMBOLS, level, day, currentTotalLevel, safeText, save, getState, isDev, bonusForLevel } = context;
    const state = new Proxy({}, { get: (_, key) => getState()[key], set: (_, key, value) => { getState()[key] = value; return true; } });
    // Collections: achievements are derived from existing levels and check-in history.
    // Viewed badges and one-time XP claims are saved separately from unlock progress.
    const TOTAL_LEVEL_RANKS = {
      10: 'Bronze', 25: 'Silver', 50: 'Gold', 75: 'Platinum',
      100: 'Emerald', 150: 'Diamond', 200: 'Master', 250: 'Grandmaster',
    };
    const ACHIEVEMENTS = [
      { id: 'first-check-in', category: 'Consistency', name: 'First Check-In', description: 'Complete your first check-in in any skill', goal: 1, kind: 'days' },
      ...[3, 7, 14, 30, 100].map(n => ({ id: 'days-' + n, category: 'Consistency', name: n + ' Active Days', description: 'Check in on ' + n + ' different days', goal: n, kind: 'days' })),
      ...[3, 7, 14, 30].map(n => ({ id: 'streak-' + n, category: 'Consistency', name: n + '-Day Streak', description: 'Reach ' + n + ' positive check-in days in one streak. Two missed days per Sunday–Saturday week are allowed; a third miss that week or three in a row resets it.', goal: n, kind: 'streak' })),
      ...[10, 25, 50, 75, 100, 150, 200, 250].map(n => ({ id: 'total-' + n, category: 'Levels', name: TOTAL_LEVEL_RANKS[n], description: 'Reach Total Level ' + n, goal: n, kind: 'total' })),
      ...[10, 25, 50].map(n => ({ id: 'skill-any-' + n, category: 'Skills', name: 'Skill Level ' + n, description: 'Reach Level ' + n + ' in any skill', goal: n, kind: 'skill' })),
      ...SKILLS.map((skill, i) => ({ id: 'specialist-' + i, category: 'Skills', name: skill.name + ' Specialist', description: 'Reach Level 25 in ' + skill.name, goal: 25, kind: 'specialist', skill: i })),
      ...SKILLS.map((skill, i) => ({ id: 'mastery-' + i, category: 'Skills', name: skill.name + ' Mastery', description: 'Reach Level 50 in ' + skill.name, goal: 50, kind: 'mastery', skill: i })),
      ...[1, 5, 25].map(n => ({ id: n === 1 ? 'five-perfect-scores' : 'five-perfect-days-' + n, category: 'Skills', name: 'Well-Rounded Day · ' + n + (n === 1 ? ' Day' : ' Days'), description: 'Optional: rate all five skills 5/5 on ' + n + (n === 1 ? ' day.' : ' separate days. Consecutive days are not required.'), goal: n, kind: 'perfect-day' })),
      { id: 'all-skills-10', category: 'Skills', name: 'Well Rounded', description: 'Reach Level 10 in all five skills', goal: 10, kind: 'all' },
      ...[20, 30, 40, 50].map(n => ({ id: 'all-skills-' + n, category: 'Skills', hiddenUntilEarned: n === 50, name: 'All Skills Level ' + n, description: 'Reach Level ' + n + ' in all five skills', goal: n, kind: 'all' })),
      { id: 'weekly-best', category: 'Personal Bests', name: 'New Weekly Best', description: 'Exceed your previous best number of active days in a completed week', goal: 1, kind: 'weekly' },
      { id: 'weekly-improvement', category: 'Personal Bests', name: 'On the Rise', description: 'Check in on more days than the previous completed week', goal: 1, kind: 'improved' },
      { id: 'fitquest-legend', category: 'Legend', hiddenUntilEarned: true, name: 'FitQuest Legend', description: 'Earn every other achievement', goal: 1, kind: 'completionist' },
    ];
    function achievementStats() {
      const { positiveDays, streakSummary, startOfWeek } = globalThis.FitQuestCalendar;
      const active = positiveDays(state.days, day());
      const { longest } = streakSummary(active, day());
      const weekly = new Map();
      for (const key of active) {
        const sunday = startOfWeek(key);
        weekly.set(sunday, (weekly.get(sunday) || 0) + 1);
      }
      const currentSunday = startOfWeek(day());
      const completeWeeks = [...weekly].filter(([s]) => s < currentSunday).sort(([a], [b]) => a.localeCompare(b));
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
        case 'perfect-day': return s.perfectDayMedals;
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
            .every(other => (state.earnedAchievements || []).includes(other.id) || achievementProgress(other, s) >= other.goal) ? 1 : 0;
        default: return 0;
      }
    }
    // Secret rewards enter the visible collection only after their requirement is met.
    function visibleAchievements(stats) {
      const earned = new Set(earnedAchievements());
      return ACHIEVEMENTS.filter(a => !a.hiddenUntilEarned || earned.has(a.id));
    }
    function earnedAchievements() {
      const stats = achievementStats();
      return ACHIEVEMENTS.filter(a => achievementProgress(a, stats) >= a.goal ||
        (state.earnedAchievements || []).includes(a.id) ||
        (a.id === 'fitquest-legend' && state.legendCelebrated)).map(a => a.id);
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
      if (achievement.id === 'first-check-in') return 'achievement-first-check-in';
      if (achievement.id === 'weekly-best') return 'achievement-weekly-best';
      if (achievement.id === 'weekly-improvement') return 'achievement-on-the-rise';
      if (achievement.kind === 'skill') return 'achievement-skill-' + achievement.goal;
      if (achievement.kind === 'days') return achievement.goal === 100
        ? 'achievement-platinum' : 'achievement-active-' + achievement.goal;
      if (achievement.kind === 'streak') return 'achievement-streak-' + achievement.goal;
      if (achievement.kind === 'completionist') return 'achievement-legend';
      if (achievement.id === 'all-skills-50') return 'achievement-grandmaster';
      if (achievement.kind === 'perfect-day') return 'achievement-five-for-five';
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
    function renderNextMilestone() {
      const stats = achievementStats();
      const next = visibleAchievements(stats)
        .filter(a => ['days', 'total', 'skill', 'specialist', 'mastery', 'all'].includes(a.kind))
        .map(achievement => ({ achievement, progress: achievementProgress(achievement, stats) }))
        .filter(({ achievement: a, progress }) => progress < a.goal)
        .sort((a, b) => Number(b.achievement.id === 'first-check-in') - Number(a.achievement.id === 'first-check-in') ||
          b.progress / b.achievement.goal - a.progress / a.achievement.goal ||
          a.achievement.goal - a.progress - (b.achievement.goal - b.progress))[0];
      if (!next) return '<section class="milestone-preview"><h3>Your next milestone</h3><p>Every fitness day adds to your journey.</p></section>';
      const { achievement: a, progress } = next;
      const remaining = a.goal - progress;
      const unit = a.kind === 'days' ? 'active day' : a.kind === 'total' ? 'total level' : 'skill level';
      return '<section class="milestone-preview" aria-labelledby="milestone-heading"><h3 id="milestone-heading">Your next milestone</h3>' +
        '<div class="milestone-preview-heading"><img src="assets/icons/' + achievementImage(a) +
        '" alt="" width="64" height="64"><div><strong>' + safeText(a.name) + '</strong><p class="muted">' +
        safeText(a.description) + '</p></div></div><progress max="' + a.goal + '" value="' + progress +
        '" aria-label="' + safeText(a.name + ': ' + progress + ' of ' + a.goal) + '"></progress><p>' +
        (a.kind === 'all' ? 'Lowest skill: ' + progress + ' of ' + a.goal + '. Bring every skill to Level ' + a.goal :
          progress + ' of ' + a.goal + ' · ' + remaining + ' more ' + unit + (remaining === 1 ? '' : 's') + ' to unlock') +
        '</p><button type="button" data-tab="collections">View Achievements</button></section>';
    }
    function achievementInReach(stats) {
      const count = Math.min(3, nearbyLevelAchievements(stats).length);
      return '<details class="achievement-in-reach"><summary>Achievements in reach' +
        (count ? ' <span class="nearby-count">' + count + '</span>' : '') +
        '</summary>' + renderNearbyMilestones(stats) + '</details>';
    }
    function renderMedalCounter(stats, unseen) {
      return '<button type="button" class="medal-counter" id="bonuses-open" aria-haspopup="dialog" aria-controls="bonuses-dialog" aria-label="' +
        stats.perfectDayMedals + ' perfect days. View active bonuses">' +
        '<img src="assets/icons/achievement-five-for-five.svg" alt="" width="32" height="38">' +
        '<span>×' + stats.perfectDayMedals + '</span>' +
        (unseen.has('five-perfect-scores') ? '<span class="medal-new" aria-label="New medal"></span>' : '') + '</button>';
    }
    function renderBonusesPanel() {
      const stats = achievementStats();
      const active = SKILLS.map((skill, i) => ({ name: skill.name, xp: bonusForLevel(stats.levels[i]) }))
        .filter(skill => skill.xp > 0);
      return '<h3>Active skill bonuses</h3>' +
        (active.length ? '<ul class="active-bonuses">' + active.map(skill =>
          '<li><strong>' + safeText(skill.name) + '</strong><span>+' + skill.xp + ' XP</span></li>').join('') +
          '</ul><p class="muted">Added to check-ins rated 1–5. A 0 rating earns 0 XP.</p>' :
          '<p>No skill bonuses unlocked yet. Reach Level 10 in a skill to earn +1 XP on its check-ins rated 1–5.</p>') +
        '<h3>Well-Rounded Days</h3><p><strong>' + stats.perfectDayMedals + ' perfect ' + (stats.perfectDayMedals === 1 ? 'day' : 'days') + '</strong></p>' +
        '<p>Optional: rate all five skills 5/5 on 1, 5, and 25 separate days. Each milestone offers +3 XP to a chosen skill.</p>' +
        '<p class="muted">No recurring all-skill XP bonus. Previously awarded XP stays in your progress.</p>';

    }
    function pendingAchievementRewards() {
      const earned = new Set(earnedAchievements());
      return ACHIEVEMENTS.filter(a => earned.has(a.id) && !Object.hasOwn(state.achievementRewards || {}, a.id));
    }
    function renderAchievementRewards() {
      const pending = pendingAchievementRewards();
      return '<section class="achievement-rewards" aria-label="Achievement XP rewards"><h3>Achievement rewards</h3>' +
        '<p>Each achievement awards <strong>+3 XP to a skill of your choice</strong>, once. Previously earned achievements count too.</p>' +
        (pending.length ? '<details open><summary>' + pending.length + ' reward' + (pending.length === 1 ? '' : 's') + ' ready to claim</summary>' +
          pending.map(a => '<div class="achievement-reward-row"><strong>' + safeText(a.name) + '</strong>' +
            '<button type="button" data-claim-achievement="' + a.id + '" aria-haspopup="dialog" aria-controls="achievement-reward-dialog" aria-label="Claim +3 XP for ' + safeText(a.name) + '">Claim +3 XP</button></div>').join('') + '</details>' :
          '<p class="muted">No rewards waiting. Unlock an achievement to earn +3 XP.</p>') + '</section>';
    }
    function recentAchievement() {
      const earned = new Set(earnedAchievements());
      const id = (state.recentAchievements || []).find(id => earned.has(id)) || [...earned].pop();
      return ACHIEVEMENTS.find(a => a.id === id);
    }
    function renderRecentAchievement() {
      const a = recentAchievement();
      return a ? '<button type="button" class="recent-achievement" id="open-recent-achievement"><img src="assets/icons/' +
        achievementImage(a) + '" width="64" height="64" alt=""><span><small>Most recent unlock</small><strong>' +
        safeText(a.name) + '</strong><small>' + safeText(a.description) + '</small></span></button>' : '';
    }
    function renderCollections() {
      const stats = achievementStats(), earned = earnedAchievements(), unseen = new Set(unseenAchievements());
      const visible = visibleAchievements(stats);
      return '<section class="card collections"><button class="back-button" data-tab="dashboard">← Back</button>' +
        '<div class="collections-toolbar"><h2 class="collections-heading"><img src="assets/icons/collection-trophy.svg?v=20261014-lowered" alt="" width="36" height="36">Collections</h2>' + renderMedalCounter(stats, unseen) + '</div><p><strong>' + earned.length + ' / ' + visible.length +
        '</strong> achievements unlocked</p>' + renderRecentAchievement() +
        '<button type="button" id="clear-achievement-notifications"' + (unseen.size ? '' : ' disabled') + '>Clear all notifications</button>' +
        '<p id="achievement-notifications-status" class="muted" role="status">' + (unseen.size ? unseen.size + ' new achievement notification' + (unseen.size === 1 ? '' : 's') : 'All notifications cleared.') + '</p><progress max="' + visible.length + '" value="' + earned.length +
        '" aria-label="Collection completion"></progress>' +
        (isDev() ? '<p class="muted">Developer preview. Click badges to test notifications; your normal save is unchanged.</p>' : '') +
        renderAchievementRewards() + achievementInReach(stats) +
        ['Consistency', 'Levels', 'Personal Bests', 'Skills', 'Legend'].map((category, index) => {
          const achievements = visible.filter(a => a.category === category);
          if (!achievements.length) return '';
          const unlockedCount = achievements.filter(a => earned.includes(a.id)).length;
          const newCount = achievements.filter(a => unseen.has(a.id)).length;
          const expanded = expandedAchievementCategories.has(category);
          return '<section class="achievement-category' + (['Consistency', 'Personal Bests'].includes(category) ? ' large-medal-achievements' : '') + '"><h3><button class="category-toggle" data-achievement-category="' +
            category + '" aria-expanded="' + expanded + '" aria-controls="achievement-category-' + index +
            '"><span class="category-arrow" aria-hidden="true">' + (expanded ? '▾' : '▸') +
            '</span><span>' + category + '</span>' + (newCount ? '<span class="achievement-new">' + newCount + ' new</span>' : '') + '<span class="category-count">' + unlockedCount +
            ' / ' + achievements.length + ' unlocked</span></button></h3><div id="achievement-category-' +
            index + '" class="achievement-list"' + (expanded ? '' : ' hidden') + '>' +
          achievements.map(a => {
            const unlocked = earned.includes(a.id), progress = unlocked ? a.goal : achievementProgress(a, stats);
            const isNew = unseen.has(a.id);
            const tag = unlocked ? 'button' : 'div';
            return '<' + tag + (unlocked ? ' type="button" data-view-achievement="' + a.id + '"' : '') + ' id="achievement-' + a.id + '" class="achievement ' + (unlocked ? 'unlocked' : 'locked') + '">' +
              '<span class="achievement-symbol" aria-hidden="true">' +
              '<img src="assets/icons/' + (unlocked ? achievementImage(a) : 'collection-locked.svg') +
                '?v=20261015-all-skills-tiers" alt="" width="56" height="56"></span>' +
              '<div><strong>' + safeText(a.name) + '</strong>' +
               (isNew ? ' <span class="achievement-new">New</span>' : '') + '<small>' + safeText(a.description) +
              '</small><progress max="' + a.goal + '" value="' + Math.min(a.goal, progress) +
              '" aria-label="' + safeText(a.name) + ' progress"></progress><small>' +
              Math.min(a.goal, progress) + ' / ' + a.goal + (unlocked ? ' · ' + achievementRewardLabel(a) + ' · Unlocked!' : '') +
              '</small><small>' + (Object.hasOwn(state.achievementRewards || {}, a.id)
                ? '+3 XP claimed · ' + safeText(SKILLS[state.achievementRewards[a.id]].name)
                : unlocked ? '+3 XP ready to claim' : 'Reward: +3 XP to a chosen skill') + '</small></div></' + tag + '>';
          }).join('') + '</div></section>';
        }).join('') + '</section>';
    }
    function markAchievementViewed(id) {
      if (!earnedAchievements().includes(id)) return false;
      return markAchievementsSeen([id]);
    }
    function markAchievementsSeen(ids) {
      const profile = getState(), before = profile.achievementsSeen;
      profile.achievementsSeen = [...new Set([...(before || []), ...ids])];
      if (!isDev() && save() === false) {
        if (getState() === profile) profile.achievementsSeen = before;
        return false;
      }
      return true;
    }
    function clearAchievementNotifications() { return markAchievementsSeen(earnedAchievements()); }


    return { TOTAL_LEVEL_RANKS, ACHIEVEMENTS, achievementStats, earnedAchievements, unseenAchievements, updateCollectionBadge, expandedAchievementCategories, renderCollections, renderBonusesPanel, markAchievementViewed, nearbyLevelAchievements, renderNearbyMilestones, renderNextMilestone, pendingAchievementRewards, achievementImage, recentAchievement, clearAchievementNotifications };
  }
};
