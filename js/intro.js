/* Isolated first-run tutorial rendering. No saved progress is changed here. */
(function (root) {
  'use strict';
  function renderIntro({ introStep, introPracticeSkill, introPracticeRating, SKILL_DISPLAY_ORDER, SKILLS, skillIcon, safeText, RATING_GUIDANCE, checkInXP }) {
      const pages = [
        ['Welcome to FitQuest!', 'Your everyday adventure starts here. Build healthy habits at your own pace.'],
        ['Try a skill', 'Choose a skill and rate progress toward your own goal. Planned rest or recovery can count as meeting your goal. This is practice only.'],
        ['Level up', 'Real check-ins earn XP equal to your rating, plus any unlocked skill bonus. A 0/5 earns 0 XP. Watch your skill and Total Levels grow.'],
        ['Collect rewards', 'Earn achievements, titles, and backgrounds as you progress. Find them in Collections, then start your first real check-in!']
      ];
      const page = pages[introStep] || pages[0];
      let demo = '';
      if (introStep === 1) {
        demo = '<div class="intro-demo-skills" aria-label="Practice skill selection">' +
          SKILL_DISPLAY_ORDER.map(i => '<button class="intro-demo-skill" data-intro-skill="' + i +
          '">' + skillIcon(i) + '<span>' + safeText(SKILLS[i].name) + '</span></button>').join('') +
          '</div><div class="intro-practice" aria-live="polite">' +
          (introPracticeSkill === null
            ? '<p>Choose a skill to see how a daily check-in works.</p>'
            : '<strong>' + safeText(SKILLS[introPracticeSkill].name) +
              ' practice rating</strong><p class="muted">0 = No progress · 1 = Small start · 2 = Some progress · 3 = About halfway · 4 = Mostly met · 5 = Goal met</p><div class="intro-demo-ratings">' +
              [0,1,2,3,4,5].map(score => '<button data-intro-rating="' + score +
              '" aria-pressed="' + (introPracticeRating === score) + '">' + score + '</button>').join('') +
              '</div><p>' + (introPracticeRating === null
                ? 'Choose a score from 0 to 5.'
                : 'You chose ' + introPracticeRating + '/5 — ' + RATING_GUIDANCE[introPracticeRating] + '. Example at Level 1: +' + checkInXP(introPracticeRating, 1) + ' XP. Practice only: nothing saved.') +
              '</p>') + '</div>';
      } else if (introStep === 2) {
        demo = '<div class="intro-demo-highlight"><strong>Lv 1</strong><span>Skill progress → XP → Next level</span></div>';
      } else if (introStep === 3) {
        demo = '<div class="intro-demo-highlight"><img src="assets/icons/collection-trophy.svg" alt="" width="36" height="36"><span>Collections is in the top navigation bar.</span></div>';
      }
      return '<section class="card fitquest-intro" aria-label="FitQuest introduction">' +
        '<img src="assets/icons/collection-trophy.svg" alt="" width="64" height="64">' +
        '<h2>' + page[0] + '</h2><p>' + page[1] + '</p>' + demo +
        '<span class="intro-counter">' + (introStep === 0 ? 'Welcome' : 'Step ' + introStep + ' of 3') + '</span>' +
        '<div class="intro-actions"><button id="intro-skip">Skip</button>' +
        (introStep > 0 ? '<button id="intro-back">Back</button>' : '') +
        '<button id="intro-next">' + (introStep === 3 ? 'Start checking in' : introStep === 0 ? 'Begin adventure' : 'Next') + '</button></div></section>';
  }

  root.FitQuestIntro = Object.freeze({ renderIntro });
})(globalThis);
