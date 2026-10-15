// Run with: node --test tests/achievements.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../js/achievements.js'), 'utf8');
const configSource = fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8');
const progression = require('../js/progression.js');

function fixture() {
  const context = vm.createContext({ globalThis: {}, Date, Set, Map });
  vm.runInContext(configSource, context);
  vm.runInContext(source, context);
  const config = context.globalThis.FitQuestConfig;
  const xp = progression.createProgression(config);
  const state = {
    skills: config.skills.map(() => ({ xp: 0 })),
    days: {},
    achievementsSeen: [],
  };
  const nav = {
    badge: { textContent: '', hidden: true },
    attributes: {},
    querySelector(selector) { return selector === '.collection-count' ? this.badge : null; },
    setAttribute(key, value) { this.attributes[key] = value; },
    title: '',
  };
  context.document = { querySelector: selector => selector === 'nav button[data-tab="collections"]' ? nav : null };
  let saves = 0;
  let dev = false;
  let today = '2026-10-14';
  const achievements = context.globalThis.FitQuestAchievements.create({
    SKILLS: config.skills,
    bonusForLevel: xp.bonusForLevel,
    SKILL_SYMBOLS: ['moon', 'salad', 'stretching', 'run', 'barbell'],
    level: xp.levelForXP,
    checkedCount: entry => entry.scores.filter(s => s !== null).length,
    day: () => today,
    currentTotalLevel: () => xp.calculateTotalLevel(state.skills),
    safeText: value => String(value),
    save: () => { saves++; },
    getState: () => state,
    isDev: () => dev,
  });
  const addDay = (date, scores) => { state.days[date] = { scores }; };
  const setLevel = (skill, level) => { state.skills[skill].xp = xp.xpThresholds[level]; };
  return { state, nav, achievements, addDay, setLevel, setToday: x => { today = x; }, setDev: x => { dev = x; }, saves: () => saves };
}

test('first check-in unlocks, shows notification count, and viewing clears it', () => {
  const f = fixture();
  f.addDay('2026-10-14', [3, null, null, null, null]);
  assert.ok(f.achievements.earnedAchievements().includes('first-check-in'));
  assert.ok(f.achievements.unseenAchievements().includes('first-check-in'));
  f.achievements.updateCollectionBadge();
  assert.equal(f.nav.badge.textContent, '1');
  assert.equal(f.nav.badge.hidden, false);
  assert.match(f.nav.attributes['aria-label'], /1 new achievement/);
  assert.equal(f.achievements.markAchievementViewed('first-check-in'), true);
  assert.equal(f.saves(), 1);
  f.achievements.updateCollectionBadge();
  assert.equal(f.nav.badge.hidden, true);
  assert.equal(f.nav.attributes['aria-label'], 'Collections');
});

test('locked achievements cannot be marked as viewed', () => {
  const f = fixture();
  assert.equal(f.achievements.markAchievementViewed('total-250'), false);
  assert.equal(f.saves(), 0);
});

test('three active days and consecutive streak unlock separately', () => {
  const f = fixture();
  ['2026-10-10', '2026-10-12', '2026-10-14'].forEach(d => f.addDay(d, [1, null, null, null, null]));
  assert.ok(f.achievements.earnedAchievements().includes('days-3'));
  assert.ok(!f.achievements.earnedAchievements().includes('streak-3'));
  f.addDay('2026-10-11', [1, null, null, null, null]);
  assert.ok(f.achievements.earnedAchievements().includes('streak-3'));
});

test('rank, specialist, mastery and all-skills achievements respect level thresholds', () => {
  const f = fixture();
  f.setLevel(0, 50);
  let earned = f.achievements.earnedAchievements();
  assert.ok(earned.includes('mastery-0'));
  assert.ok(earned.includes('specialist-0'));
  assert.ok(earned.includes('skill-any-50'));
  assert.ok(!earned.includes('all-skills-10'));
  for (let i = 1; i < 5; i++) f.setLevel(i, 50);
  earned = f.achievements.earnedAchievements();
  assert.ok(earned.includes('total-250'));
  assert.ok(earned.includes('all-skills-50'));
  assert.equal(f.achievements.achievementStats().total, 250);
});

test('perfect day requires five scores of exactly 5 and medals count each perfect day', () => {
  const f = fixture();
  f.addDay('2026-10-13', [5, 5, 5, 5, 4]);
  assert.ok(!f.achievements.earnedAchievements().includes('five-perfect-scores'));
  f.addDay('2026-10-14', [5, 5, 5, 5, 5]);
  assert.ok(f.achievements.earnedAchievements().includes('five-perfect-scores'));
  assert.equal(f.achievements.achievementStats().perfectDayMedals, 1);
  assert.match(f.achievements.renderCollections(), /×1<\/span>/);
});

test('notification caps at 9+ and viewing is idempotent', () => {
  const f = fixture();
  for (let i = 0; i < 5; i++) f.setLevel(i, 50);
  f.achievements.updateCollectionBadge();
  assert.equal(f.nav.badge.textContent, '9+');
  assert.equal(f.achievements.markAchievementViewed('total-250'), true);
  assert.equal(f.achievements.markAchievementViewed('total-250'), true);
  assert.equal(f.state.achievementsSeen.filter(x => x === 'total-250').length, 1);
});

test('developer preview does not persist viewed achievements', () => {
  const f = fixture();
  f.setLevel(0, 25);
  f.setDev(true);
  assert.equal(f.achievements.markAchievementViewed('specialist-0'), true);
  assert.equal(f.saves(), 0);
});

test('collection HTML shows new labels and hides them after viewing', () => {
  const f = fixture();
  f.addDay('2026-10-14', [2, null, null, null, null]);
  assert.match(f.achievements.renderCollections(), /1 new/);
  f.achievements.markAchievementViewed('first-check-in');
  assert.doesNotMatch(f.achievements.renderCollections(), /1 new/);
});

test('nearby milestones include only locked level goals within three levels, nearest first', () => {
  const f = fixture();
  const stats = { levels: [7, 7, 7, 7, 6], total: 22 };
  const nearby = f.achievements.nearbyLevelAchievements(stats);
  assert.ok(nearby.some(x => x.achievement.id === 'total-25' && x.remaining === 3));
  assert.ok(nearby.some(x => x.achievement.id === 'skill-any-10' && x.remaining === 3));
  assert.ok(!nearby.some(x => x.achievement.id === 'all-skills-10'));
  assert.ok(!nearby.some(x => x.achievement.id === 'total-10'));
  assert.ok(nearby.every(x => x.remaining > 0 && x.remaining <= 3));
  assert.ok(nearby.every((x, i) => i === 0 || nearby[i - 1].remaining <= x.remaining));
  stats.levels = [10, 10, 10, 10, 7];
  assert.ok(f.achievements.nearbyLevelAchievements(stats).some(x => x.achievement.id === 'all-skills-10'));
  stats.levels = [50, 50, 50, 50, 50];
  stats.total = 250;
  assert.equal(f.achievements.nearbyLevelAchievements(stats).length, 0);
  assert.match(f.achievements.renderNearbyMilestones(), /No level milestones within three levels/);
  f.setLevel(0, 7);
  assert.match(f.achievements.renderNearbyMilestones(), /3 levels away/);
  assert.match(f.achievements.renderCollections(), /data-nearby-milestones/);
});

test('Five for Five lives in the Collections toolbar rather than the Skills rows', () => {
  const f = fixture();
  let html = f.achievements.renderCollections();
  assert.match(html, /collections-toolbar/);
  assert.match(html, /id="bonuses-open"/);
  assert.match(html, /×0<\/span>/);
  assert.doesNotMatch(html, /data-view-achievement="five-perfect-scores"/);
  f.addDay('2026-10-14', [5,5,5,5,5]);
  html = f.achievements.renderCollections();
  assert.match(html, /×1<\/span>/);
  assert.match(html, /class="medal-new"/);
  assert.ok(f.achievements.earnedAchievements().includes('five-perfect-scores'));
  f.achievements.markAchievementViewed('five-perfect-scores');
  assert.doesNotMatch(f.achievements.renderCollections(), /class="medal-new"/);
});

test('bonus details distinguish active skill XP from repeatable medal payouts', () => {
  const f = fixture();
  assert.match(f.achievements.renderBonusesPanel(), /No skill bonuses unlocked/);
  f.setLevel(0,10);
  f.setLevel(4,40);
  let html = f.achievements.renderBonusesPanel();
  assert.match(html, /Sleep<\/strong><span>\+1 XP/);
  assert.match(html, /Strength<\/strong><span>\+4 XP/);
  assert.match(html, /one-time reward for each set of 5 medals/);
  f.addDay('2026-10-14', [5,5,5,5,5]);
  assert.match(f.achievements.renderBonusesPanel(), /4 more medals/);
  // Editing away a previous medal must not promise a duplicate paid reward.
  f.state.fiveForFivePaidMilestones = 1;
  assert.match(f.achievements.renderBonusesPanel(), /9 more medals/);
});
