// Pure screen markup: inputs describe the view; no browser storage or app state is changed.
(function (root) {
  'use strict';
  function renderDashboard({ entry, skills, skillState, displayOrder, maxLevel, xp, levelForXP, skillIcon, nextReward, dailyQuestHTML, safeText }) {
    const doneCount = entry ? entry.scores.filter(Number.isInteger).length : 0,
      complete = doneCount === skills.length;
    return (
      '<section class="tracker-intro" aria-live="polite"><h2>' +
      (complete ? 'Today’s check-in is complete.' : 'Your daily check-in') +
      '</h2><p class="muted">' +
      (complete ? 'Every small step adds up.' : 'Tap a skill and rate your day out of 5.') +
      '</p><p class="next-reward">' +
      safeText(nextReward) +
      '</p></section><div class="skill-star" aria-label="Five fitness skills"><button type="button" class="star-summary' +
      (complete ? ' is-complete' : '') + '" data-open-checkin aria-haspopup="dialog" aria-controls="check-dialog" aria-label="' +
      (complete ? 'All five skills checked in. Review today’s ratings.' : 'Daily check-in. ' + doneCount + ' of 5 skills checked in.') +
      '"><span class="central-checkin-title">Fitness Skills</span><strong>' +
      doneCount +
      ' / 5</strong><span>' + (complete ? 'Checked In' : 'Check In') + '</span></button>' +
      displayOrder.map((i, position) => {
        const s = skills[i],
          totalXP = skillState[i].xp,
          l = levelForXP(totalXP),
          maxed = l === maxLevel,
          progress = maxed ? 1 : (totalXP - xp[l]) / (xp[l + 1] - xp[l]),
          done = entry && Number.isInteger(entry.scores[i]);
        return (
          '<button class="star-skill star-position-' +
          position +
          (done ? ' is-complete' : '') +
          '" data-open-skill="' +
          i +
          '" style="--skill:' +
          s.color +
          '" aria-label="' +
          s.name +
          ', level ' +
          l +
          ', ' +
          (maxed ? 'maximum level' : xp[l + 1] - totalXP + ' XP to next level') +
          ', ' +
          (done ? 'checked in today, ' + entry.scores[i] + ' out of 5' : 'check in out of 5') +
          '"><span class="star-level">Lv ' +
          l +
          '</span>' +
          skillIcon(i) +
          (done ? '<span class="star-check" aria-hidden="true">✓</span>' : '') +
          '<strong>' +
          s.name +
          '</strong>' +
          '<progress class="star-progress" max="1" value="' +
          progress +
          '" aria-label="' +
          s.name +
          ' XP progress"></progress>' +
          '<span class="star-xp">' +
          (maxed
            ? 'MAX'
            : (totalXP - xp[l]).toLocaleString() +
              ' / ' +
              (xp[l + 1] - xp[l]).toLocaleString() +
              ' XP') +
          '</span>' +
          (done ? '<span class="star-score">Done · ' + entry.scores[i] + '/5</span>' : '') +
          '</button>'
        );
      }).join('') +
      '</div>' + dailyQuestHTML
    );
  }

  function renderDailyCheckin({ entry, skills, displayOrder, skillIcon, safeText }) {
    const doneCount = entry ? entry.scores.filter(Number.isInteger).length : 0;
    return '<div class="row"><h2 id="check-heading">Daily Check-In</h2>' +
      '<button id="check-close" class="popup-close" aria-label="Close check-in">×</button></div>' +
      '<p>' + doneCount + ' / ' + skills.length + ' skills checked in today. ' +
      (doneCount === skills.length ? 'Choose a skill to review or edit its rating.' : 'Choose a skill to rate your day.') +
      '</p><div class="daily-checkin-skills">' + displayOrder.map(i => {
        const done = entry && Number.isInteger(entry.scores[i]);
        return '<button type="button" class="daily-checkin-skill" data-open-skill="' + i + '">' +
          skillIcon(i) + '<strong>' + safeText(skills[i].name) + '</strong><span>' +
          (done ? '✓ ' + entry.scores[i] + '/5' : 'Check In') + '</span></button>';
      }).join('') + '</div>';
  }

  function renderTotalRewards({ current, index, rewards, next, minTotal, maxTotal, preview, rewardBadge, safeText }) {
    index = Math.max(0, Math.min(rewards.length - 1, index));
    const milestone = rewards[index], unlocked = current >= milestone.level;
    const needed = Math.max(1, milestone.level - minTotal);
    const progress = unlocked ? needed : Math.max(0, current - minTotal);
    return '<p class="total-current"><strong>Total Level ' + current + '</strong> / ' +
      maxTotal + '</p><progress class="total-progress" max="' +
      (maxTotal - minTotal) + '" value="' + (current - minTotal) +
      '" aria-label="Progress from starting Total Level to maximum"></progress>' +
      (preview ? '<p class="muted">Developer preview.</p>' : '') +
      '<section class="total-milestone' + (unlocked ? ' is-unlocked' : '') +
      (next && next.level === milestone.level ? ' is-next' : '') +
      '" aria-live="polite"><div class="row"><strong>Level ' + milestone.level +
      '</strong><span class="milestone-status">' +
      (unlocked ? '✓ Unlocked' : next && next.level === milestone.level ? 'Next reward' : 'Locked') +
      '</span></div><div class="reward-title">' + rewardBadge(milestone, true) +
      '<h3>' + safeText(milestone.title) + '</h3></div><progress max="' + needed +
      '" value="' + progress + '" aria-label="' + safeText(milestone.title) +
      ' unlock progress"></progress><small>' +
      (unlocked ? 'Reward unlocked' : (milestone.level - current) + ' Total Levels remaining') +
      '</small></section><div class="reward-navigation">' +
      '<button id="reward-previous"' + (index === 0 ? ' disabled' : '') + '>Previous</button>' +
      '<span>' + (index + 1) + ' / ' + rewards.length + '</span>' +
      '<button id="reward-next"' + (index === rewards.length - 1 ? ' disabled' : '') +
      '>Next</button></div>' +
      (!next ? '<p class="muted">All Total Level rewards unlocked!</p>' : '');
  }

  function renderSettings({ developerMode = false, soundEnabled = true } = {}) {
    return `<button class="back-button" data-tab="dashboard">← Back to Dashboard</button>
<section class="card tools">
<h2>⚙ Settings</h2>
<button id="sound-toggle" class="wide" aria-pressed="${soundEnabled}">Sound effects: ${soundEnabled ? 'On' : 'Off'}</button>
<p class="muted">Soft check-in and reward chimes. No background music.</p>
<p class="muted">Progress stays in this browser. Export before switching devices or clearing browser data.</p>
<button id="export">Export FitQuest backup</button>
<p>
<label>Import FitQuest backup<br>
<input id="import" type="file" accept=".json,application/json" style="max-width:100%;margin-top:10px" aria-label="Import FitQuest backup">
</label>
</p>
<button id="restart" class="restart wide">Reset tracker progress</button>
</section>
<section class="card">
<h3>Help</h3>
${developerMode ? '<button id="dev-open-settings" class="wide">Open test tools</button>' : ''}
<button id="intro-replay" class="wide">Replay tutorial</button>
<p class="muted">Practise using FitQuest without changing your progress.</p>
</section>
<section class="card">
<h3>Install and offline access</h3>
<p id="offline-status" role="status">Preparing offline access.</p>
<button id="install-app" hidden>Install FitQuest</button>
<p id="install-help" class="muted">
</p>
<p class="muted">Progress stays on this device. Keep a backup before clearing browser data or switching devices.</p>
</section>`;
  }

  function renderJourney({ summary, weeklyText, resetText, safeText }) {
    const items = [
      [summary.started ? String(summary.elapsedDays) : 'Not started', 'Days since first check-in'],
      [String(summary.checkIns), 'Total check-ins'],
      [summary.rank, 'Total Level ' + summary.totalLevel],
      [String(summary.medals), 'Five for Five medals'],
    ];
    return '<div class="journey-grid">' + items.map(([value, label]) =>
      '<div class="journey-stat"><strong>' + safeText(value) + '</strong><span>' + label + '</span></div>').join('') +
      '</div><p class="weekly-check-ins" aria-live="polite">' + weeklyText +
      '</p><p class="muted">' + resetText + '</p>' +
      (summary.started ? '' : '<p class="muted">Your journey begins with your first check-in.</p>');
  }

  function renderRanks({ total, current, ranks, safeText }) {
    return '<div class="rank-progression-list">' + Object.entries(ranks).map(([threshold, rank]) => {
      const unlocked = total >= Number(threshold);
      const status = rank === current ? 'Current rank' : unlocked ? 'Unlocked' : 'Locked';
      return '<article class="rank-progression-item' + (rank === current ? ' current-rank' : '') + '">' +
        '<img src="assets/icons/rank-' + rank.toLowerCase() + '.svg?v=20261015-evolved-ranks" alt="" width="48" height="48">' +
        '<div><strong>' + safeText(rank) + '</strong><small>Total Level ' + threshold + '</small></div>' +
        '<small class="rank-status">' + status + '</small></article>';
    }).join('') + '</div>';
  }
  const screens = { renderDashboard, renderDailyCheckin, renderTotalRewards, renderSettings, renderJourney, renderRanks };
  root.FitQuestScreens = screens;
  if (typeof module !== 'undefined' && module.exports) module.exports = screens;
})(typeof globalThis !== 'undefined' ? globalThis : this);

