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
  assert.match(f.achievements.renderCollections(), /<details class="achievement-in-reach">/);
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


test('Achievements in reach is a collapsed disclosure with at most three nearby goals', () => {
  const f = fixture();
  for (let i=0; i<5; i++) f.setLevel(i,24);
  const html = f.achievements.renderCollections();
  const disclosure = html.match(/<details class="achievement-in-reach">([\s\S]*?)<\/details>/)[1];
  assert.match(disclosure, /<summary>Achievements in reach/);
  assert.equal((disclosure.match(/class="nearby-milestone"/g) || []).length, 3);
  assert.doesNotMatch(html, /data-nearby-milestones/);
  for (let i=0; i<5; i++) f.setLevel(i,50);
  assert.match(f.achievements.renderCollections(), /No level milestones within three levels/);
});

test('all-skills mastery stays secret until every skill reaches level 50', () => {
  const f = fixture();
  for (let i=0; i<5; i++) f.setLevel(i,49);
  let html = f.achievements.renderCollections();
  assert.doesNotMatch(html, /All Skills Level 50|achievement-grandmaster|data-view-achievement="all-skills-50"/);
  assert.ok(!f.achievements.nearbyLevelAchievements().some(x => x.achievement.id === 'all-skills-50'));
  assert.doesNotMatch(f.achievements.renderNearbyMilestones(), /All Skills Level 50|achievement-grandmaster/);
  const beforeTotal = Number(html.match(/progress max="(\d+)" value="\d+" aria-label="Collection completion"/)[1]);
  for (let i=0; i<4; i++) f.setLevel(i,50);
  assert.doesNotMatch(f.achievements.renderCollections(), /All Skills Level 50/);
  f.setLevel(4,50);
  html = f.achievements.renderCollections();
  assert.match(html, /data-view-achievement="all-skills-50"/);
  assert.match(html, /achievement-grandmaster/);
  assert.ok(f.achievements.unseenAchievements().includes('all-skills-50'));
  const afterTotal = Number(html.match(/progress max="(\d+)" value="\d+" aria-label="Collection completion"/)[1]);
  assert.equal(afterTotal, beforeTotal + 1);
});

function completeLegendProfile(f) {
  for (let i=0;i<5;i++) f.setLevel(i,50);
  for(let i=0;i<120;i++) {
    const d=new Date('2026-06-10T00:00:00Z'); d.setUTCDate(d.getUTCDate()+i);
    f.addDay(d.toISOString().slice(0,10), i===0 ? [5,5,5,5,5] : [1,1,1,1,1]);
  }
}

test('Legend is hidden until every other achievement including secret mastery is earned', () => {
  const f=fixture();
  assert.doesNotMatch(f.achievements.renderCollections(), /FitQuest Legend|achievement-legend/);
  completeLegendProfile(f);
  let earned=f.achievements.earnedAchievements();
  assert.equal(earned.length,f.achievements.ACHIEVEMENTS.length);
  assert.ok(earned.includes('fitquest-legend'));
  assert.match(f.achievements.renderCollections(), /data-view-achievement="fitquest-legend"/);
  assert.match(f.achievements.renderCollections(), /achievement-legend.png/);
  assert.ok(f.achievements.unseenAchievements().includes('fitquest-legend'));
  f.setLevel(0,49);
  assert.ok(!f.achievements.earnedAchievements().includes('fitquest-legend'));
  assert.doesNotMatch(f.achievements.renderCollections(), /FitQuest Legend/);
});

test('Legend requires consistency and a Five for Five medal, not just maxed levels', () => {
  const f=fixture();
  for(let i=0;i<5;i++)f.setLevel(i,50);
  assert.ok(!f.achievements.earnedAchievements().includes('fitquest-legend'));
  completeLegendProfile(f);
  assert.equal(f.achievements.achievementStats().perfectDayMedals,1);
  f.state.days['2026-06-10'].scores=[4,5,5,5,5];
  assert.ok(!f.achievements.earnedAchievements().includes('fitquest-legend'));
});

test('100 Active Days uses platinum while 30 Active Days retains gold', () => {
  const f=fixture();completeLegendProfile(f);
  const html=f.achievements.renderCollections();
  const rows=[...html.matchAll(/<button type="button" data-view-achievement="([^"]+)"[\s\S]*?<\/button>/g)];
  const day100=rows.find(m=>m[1]==='days-100')[0];
  const day30=rows.find(m=>m[1]==='days-30')[0];
  assert.match(day100,/achievement-platinum.svg/);
  assert.match(day100,/platinum medal/);
  assert.match(day30,/achievement-active-30.svg/);
  assert.match(day30,/gold medal/);
});

test('adjacent active-day and streak milestones have distinct medal artwork', () => {
  const f=fixture();completeLegendProfile(f);
  const rows=[...f.achievements.renderCollections().matchAll(/<button type="button" data-view-achievement="([^"]+)"[\s\S]*?<\/button>/g)];
  const row=id=>rows.find(m=>m[1]===id)[0];
  assert.match(row('days-3'),/achievement-active-3.svg/);
  assert.match(row('days-7'),/achievement-active-7.svg/);
  assert.match(row('streak-14'),/achievement-streak-14.svg/);
  assert.match(row('streak-30'),/achievement-streak-30.svg/);
  assert.match(row('streak-30'),/platinum medal/);
});

test('all-skills tiers have distinct artwork and the final medal remains secret', () => {
  const f=fixture();completeLegendProfile(f);
  const rows=[...f.achievements.renderCollections().matchAll(/<button type="button" data-view-achievement="([^"]+)"[\s\S]*?<\/button>/g)];
  for(const n of [10,20,30,40,50]){
    const row=rows.find(m=>m[1]==='all-skills-'+n)[0];
    const asset=n===10?'achievement-well-rounded':n===50?'achievement-grandmaster':'achievement-all-skills-'+n;
    assert.ok(row.includes(asset+'.svg'));
  }
  f.setLevel(0,49);
  assert.doesNotMatch(f.achievements.renderCollections(),/achievement-grandmaster|All Skills Level 50/);
});

test('generic single-skill milestones use their own tiered crests', () => {
  const f=fixture();completeLegendProfile(f);
  const rows=[...f.achievements.renderCollections().matchAll(/<button type="button" data-view-achievement="([^"]+)"[\s\S]*?<\/button>/g)];
  for(const n of [10,25,50]){
    const row=rows.find(m=>m[1]==='skill-any-'+n)[0];
    assert.ok(row.includes('achievement-skill-'+n+'.svg'));
  }
  assert.ok(f.achievements.earnedAchievements().includes('fitquest-legend'));
});

test('all streak milestones use the coherent numbered flame-medal series', () => {
  const f=fixture();completeLegendProfile(f);
  const rows=[...f.achievements.renderCollections().matchAll(/<button type="button" data-view-achievement="([^"]+)"[\s\S]*?<\/button>/g)];
  for(const n of [3,7,14,30]){
    const row=rows.find(m=>m[1]==='streak-'+n)[0];
    assert.ok(row.includes('achievement-streak-'+n+'.svg'));
  }
});

test('Personal Bests medals match their individual achievements', () => {
  const f=fixture();completeLegendProfile(f);
  const rows=[...f.achievements.renderCollections().matchAll(/<button type="button" data-view-achievement="([^"]+)"[\s\S]*?<\/button>/g)];
  assert.match(rows.find(m=>m[1]==='weekly-best')[0],/achievement-weekly-best.svg/);
  assert.match(rows.find(m=>m[1]==='weekly-improvement')[0],/achievement-on-the-rise.svg/);
});

test('all Active Days milestones use the matching numbered series', () => {
  const f=fixture();completeLegendProfile(f);
  const rows=[...f.achievements.renderCollections().matchAll(/<button type="button" data-view-achievement="([^"]+)"[\s\S]*?<\/button>/g)];
  for(const n of [3,7,14,30,100]){
    const row=rows.find(m=>m[1]==='days-'+n)[0];
    assert.ok(row.includes(n===100?'achievement-platinum.svg':'achievement-active-'+n+'.svg'));
  }
});
