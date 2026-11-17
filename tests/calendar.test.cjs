'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');
const dates = require('../js/calendar.js');

function inZone(zone, code) {
  const source = `const assert = require('node:assert/strict'); const dates = require(${JSON.stringify(join(__dirname, '../js/calendar.js'))}); ${code}`;
  execFileSync(process.execPath, ['-e', source], { env: { ...process.env, TZ: zone } });
}

test('local reset follows Winnipeg, Toronto, Vancouver and UTC at 03:30, not one UTC instant', () => {
  for (const zone of ['America/Winnipeg', 'America/Toronto', 'America/Vancouver', 'UTC']) inZone(zone, `
    for (const [year, month, day, previous] of [[2026, 10, 17, '2026-11-16'], [2027, 0, 1, '2026-12-31'], [2028, 2, 1, '2028-02-29']]) {
      const before = new Date(year, month, day, 3, 29, 59).getTime();
      const boundary = new Date(year, month, day, 3, 30).getTime();
      assert.equal(dates.localDay(before), previous);
      assert.notEqual(dates.localDay(boundary), previous);
      assert.equal(dates.nextReset(before), boundary);
      const tomorrow = new Date(year, month, day + 1, 3, 30).getTime();
      assert.equal(dates.nextReset(boundary), tomorrow);
    }
  `);
});

test('local reset scheduling spans 23- and 25-hour daylight saving days', () => {
  inZone('America/Winnipeg', `
    for (const [month, day, hours] of [[2, 8, 23], [10, 1, 25]]) {
      const now = new Date(2025, month, day, 3, 30).getTime();
      const next = dates.nextReset(now);
      assert.equal((next - now) / 3600000, hours);
      assert.equal(new Date(next).getHours(), 3);
      assert.equal(new Date(next).getMinutes(), 30);
      assert.equal(dates.localDay(next - 1), dates.localDay(now));
      assert.equal(dates.localDay(next), dates.shiftDay(dates.localDay(now), 1));
    }
  `);
});

test('calendar starts Sunday and date arithmetic crosses months and years', () => {
  assert.equal(dates.startOfWeek('2026-11-15'), '2026-11-15');
  assert.equal(dates.startOfWeek('2026-11-21'), '2026-11-15');
  assert.equal(dates.startOfWeek('2027-01-01'), '2026-12-27');
  assert.equal(dates.shiftDay('2028-03-01', -1), '2028-02-29');
});

test('two missed days preserve a streak; a third weekly miss breaks it', () => {
  assert.deepEqual(dates.streakSummary(['2026-11-15', '2026-11-17', '2026-11-19'], '2026-11-19'), { current: 3, longest: 3 });
  // Missed Mon, Wed and Fri: no three consecutive misses, but third weekly miss ends it.
  assert.deepEqual(dates.streakSummary(['2026-11-15', '2026-11-17', '2026-11-19'], '2026-11-21'), { current: 0, longest: 3 });
});

test('three consecutive misses break a streak across a Sunday week boundary', () => {
  assert.deepEqual(dates.streakSummary(['2026-11-19'], '2026-11-22'), { current: 1, longest: 1 });
  assert.deepEqual(dates.streakSummary(['2026-11-19'], '2026-11-23'), { current: 0, longest: 1 });
  assert.deepEqual(dates.streakSummary(['2026-11-19', '2026-11-23'], '2026-11-23'), { current: 1, longest: 1 });
});

test('weekly miss allowance resets on Sunday while active-day points continue', () => {
  const days = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-22', '2026-11-24'];
  assert.deepEqual(dates.streakSummary(days, '2026-11-24'), { current: 6, longest: 6 });
});

test('all-zero, quest-only and future days do not count; today remains open', () => {
  const days = {'2026-11-15': {scores:[1,0,0,0,0]}, '2026-11-16': {scores:[0,0,0,0,0]},
    '2026-11-17': {quest:{completed:true},scores:[null,null,null,null,null]}, '2026-11-20': {scores:[5,5,5,5,5]}};
  assert.deepEqual(dates.positiveDays(days, '2026-11-18'), ['2026-11-15']);
  assert.deepEqual(dates.streakSummary(['2026-11-15'], '2026-11-18'), {current:1,longest:1});
  assert.deepEqual(dates.streakSummary(['2026-11-15'], '2026-11-19'), {current:0,longest:1});
});
