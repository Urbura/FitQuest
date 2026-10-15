'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

function fixture({ search = '?dev', blocked = false } = {}) {
  const session = new Map(), nodes = new Map(), previews = [];
  let state = { skills: Array.from({ length: 5 }, () => ({ xp: 7 })) };
  let rejected = null, replacedURL = null;
  const context = vm.createContext({
    URL, URLSearchParams, Map,
    location: { search, href: 'https://example.com/?dev&keep=1#skills' },
    history: { replaceState: (_, __, url) => { replacedURL = url; } },
    sessionStorage: {
      getItem(key) { if (blocked) throw Error('blocked'); return session.get(key) ?? null; },
      setItem(key, value) { if (blocked) throw Error('blocked'); session.set(key, value); },
      removeItem(key) { if (blocked) throw Error('blocked'); session.delete(key); },
    },
    document: { getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, {});
      return nodes.get(id);
    } },
  });
  vm.runInContext(readFileSync(join(__dirname, '../js/developer.js'), 'utf8'), context);
  const developer = context.FitQuestDeveloper.create({
    SKILLS: Array(5).fill({ name: 'Skill' }), MAX_LEVEL: 50,
    MIN_TOTAL_LEVEL: 5, MAX_TOTAL_LEVEL: 250,
    XP: Array.from({ length: 51 }, (_, i) => i * 10), level: xp => xp / 10,
    getState: () => state, setState: value => { state = value; },
    fresh: () => ({ skills: Array.from({ length: 5 }, () => ({ xp: 0 })) }),
    readSave: JSON.parse, rejectSave: raw => { rejected = raw; },
    showDashboard() {}, showCollections() {}, render() {}, notify() {}, syncSharedSave() {},
    day: () => '2026-10-15', previewCelebration: item => previews.push(item),
    totalSkillLevel: () => 5, totalReward: () => ({ title: 'Rank' }),
  });
  return { developer, session, previews, node: id => nodes.get(id), setInput: (id, value) => { nodes.set(id, { value }); }, state: () => state, rejected: () => rejected,
    replacedURL: () => replacedURL, click: id => developer.handleClick({ id, dataset: {} }) };
}

test('normal sessions ignore developer actions and profile changes', () => {
  const f = fixture({ search: '' });
  assert.equal(f.developer.active, false);
  assert.equal(f.click('dev-exit'), false);
  assert.equal(f.developer.setProfileLevels([10, 10, 10, 10, 10]), false);
  assert.equal(f.state().skills[0].xp, 7);
});

for (const blocked of [false, true]) {
  test(`original progress survives preview, restore and exit with session storage ${blocked ? 'blocked' : 'available'}`, () => {
    const f = fixture({ blocked });
    const original = JSON.stringify(f.state());
    f.developer.backupOriginal(true, original);
    f.developer.setProfileLevels([10, 20, 30, 40, 50]);
    f.developer.backupOriginal(true, JSON.stringify(f.state()));
    assert.equal(f.state().skills[0].xp, 100);
    assert.equal(f.click('dev-restore'), true);
    assert.equal(JSON.stringify(f.state()), original);
    f.developer.setProfileLevels([50, 50, 50, 50, 50]);
    assert.equal(f.click('dev-exit'), true);
    assert.equal(JSON.stringify(f.state()), original);
    assert.equal(f.developer.active, false);
    assert.equal(f.developer.totalLevel, null);
    assert.equal(f.replacedURL(), '/?keep=1#skills');
    assert.equal(f.session.has('fitville-dev-backup'), false);
  });
}

test('exiting a new profile restores empty progress', () => {
  const f = fixture();
  f.developer.backupOriginal(true, null);
  f.developer.setProfileLevels([50, 50, 50, 50, 50]);
  f.click('dev-exit');
  assert.ok(f.state().skills.every(skill => skill.xp === 0));
});

test('an unreadable original backup is passed to save protection on exit', () => {
  const f = fixture();
  f.developer.backupOriginal(true, 'broken-save');
  f.click('dev-exit');
  assert.equal(f.rejected(), 'broken-save');
  assert.equal(f.developer.active, false);
});

test('new preview controls restore the complete original profile on exit', () => {
  const f=fixture();const original=JSON.stringify(f.state());
  f.developer.backupOriginal(true,original);
  f.click('dev-unlock-all');
  assert.equal(Object.keys(f.state().days).length,120);
  assert.ok(f.state().skills.every(s=>s.xp===500));
  f.setInput('dev-rank-preview','250');
  f.click('dev-play-rank');f.click('dev-play-legend');
  assert.equal(f.previews.length,2);
  assert.equal(f.previews[0].rank,250);assert.equal(f.previews[1].legend,true);
  f.click('dev-exit');
  assert.equal(JSON.stringify(f.state()),original);
  assert.equal(f.developer.active,false);
});


test('Developer Mode always exposes its launcher and Settings can open the panel', () => {
  const f=fixture();f.developer.setupUI();
  assert.equal(f.node('dev-tools').hidden,true);
  assert.equal(f.node('dev-open').hidden,false);
  assert.equal(f.click('dev-open-settings'),true);
  assert.equal(f.node('dev-tools').hidden,false);
  assert.equal(f.node('dev-open').hidden,false);
  f.click('dev-toggle');
  assert.equal(f.node('dev-tools').hidden,true);
  assert.equal(f.node('dev-open').hidden,false);
  const normal=fixture({search:''});normal.developer.setupUI();
  assert.equal(normal.node('dev-open').hidden,true);
  assert.equal(normal.click('dev-open-settings'),false);
});
