'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../js/celebrations.js');
const ranks = { 10:'Bronze',25:'Silver',50:'Gold',75:'Platinum',100:'Emerald',150:'Diamond',200:'Master',250:'Grandmaster' };
const markup = create({ ranks, safeText: s => s,
  rewardBadge: milestone => '<img src="rank-' + ranks[milestone.level].toLowerCase() + '.svg">' });

test('every rank celebration names the rank and displays its new badge', () => {
  for (const [level, rank] of Object.entries(ranks)) {
    const html = markup.totalLevel({ l: Number(level), milestone: { level: Number(level), title: rank } });
    assert.ok(html.includes('Congratulations!'));
    assert.ok(html.includes('You reached ' + rank + '!'));
    assert.ok(html.includes('rank-' + rank.toLowerCase() + '.svg'));
    assert.ok(html.includes('class="rank-reveal rank-reveal-' + rank.toLowerCase()));
    assert.ok(html.includes('Total Level ' + level));
  }
});

test('the first Total Level celebration does not falsely announce a rank', () => {
  const html = markup.totalLevel({ l: 6 });
  assert.ok(html.includes('You reached Total Level 6!'));
  assert.ok(!html.includes('RANK UP'));
  assert.ok(!html.includes('rank-reveal'));
});
