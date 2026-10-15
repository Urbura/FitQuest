// Celebration markup is separate from XP awards and dialog sequencing.
(function (root) {
  'use strict';
  function create({ ranks, rewardBadge, safeText }) {
    function totalLevel(item) {
      const { l, milestone } = item;
      const rank = milestone && ranks[l];
      if (rank) {
        return '<span class="anime-tag">RANK UP</span>' +
          '<h2 id="level-heading"><span class="congratulations">Congratulations!</span>' +
          'You reached ' + safeText(rank) + '!</h2>' +
          '<div class="rank-reveal">' + rewardBadge(milestone, true) + '</div>' +
          '<h3 class="rank-reveal-title">' + safeText(rank) + ' rank unlocked</h3>' +
          '<p>Total Level ' + l + ' · Your new badge is now in the top bar.</p>';
      }
      return '<span class="anime-tag">TOTAL LEVEL UP</span>' +
        '<h2 id="level-heading"><span class="congratulations">Congratulations!</span>' +
        'You reached Total Level ' + l + '!</h2>' +
        (milestone
          ? rewardBadge(milestone, true) + '<h3>' + safeText(milestone.title) + ' unlocked</h3>' +
            '<p>Your new rank is displayed beside your Total Level.</p>'
          : '<h3>Your first total level-up!</h3>' +
            '<p>You’re building a healthy habit. Small, consistent steps add up—keep checking in toward your own goals.</p>' +
            '<p class="muted">Your Total Level adds up all five skill levels. Each skill level-up increases your Total Level.</p>');
    }
    return { totalLevel };
  }
  root.FitQuestCelebrations = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = { create };
})(typeof globalThis !== 'undefined' ? globalThis : this);
