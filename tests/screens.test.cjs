'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const screens = require('../js/screens.js');
const safeText = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

test('rank screen distinguishes current, earned, and locked ranks from explicit inputs', () => {
  const html = screens.renderRanks({ total:25, current:'Silver', ranks:{10:'Bronze',25:'Silver',50:'Gold'}, safeText });
  assert.match(html, /Bronze<\/strong>[\s\S]*?Unlocked/);
  assert.match(html, /current-rank[\s\S]*?Silver<\/strong>[\s\S]*?Current rank/);
  assert.match(html, /Gold<\/strong>[\s\S]*?Locked/);
});

test('Journey renderer escapes dynamic values and explains an unstarted profile', () => {
  const html = screens.renderJourney({ summary:{started:false,elapsedDays:0,checkIns:0,totalLevel:5,rank:'<Unranked>',medals:0}, weeklyText:'No check-ins',resetText:'Reset time',safeText });
  assert.match(html, /&lt;Unranked&gt;/);
  assert.match(html, /Your journey begins with your first check-in/);
  assert.match(html, /No check-ins/);
});


test('Settings offers explicit Developer Mode entry and active tools', () => {
  assert.doesNotMatch(screens.renderSettings(), /dev-open-settings/);
  assert.match(screens.renderSettings(), /dev-enter-settings/);
  assert.doesNotMatch(screens.renderSettings({developerMode:true}), /dev-enter-settings/);
  assert.match(screens.renderSettings({developerMode:true}), /id="dev-open-settings"/);
});
