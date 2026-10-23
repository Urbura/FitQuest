'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../js/xp-animation.js');
function setup(native = false) {
  let time = 0, reduce = false, id = 0;
  const frames = new Map();
  const bar = { tagName: native ? 'PROGRESS' : 'SPAN', dataset: { questXp: 'strength', xpLevel: '1', xpFraction: '.4' }, style: {}, value: .4 };
  const animator = create({
    now: () => time, reducedMotion: () => reduce,
    requestFrame: fn => { frames.set(++id, fn); return id; },
    cancelFrame: key => frames.delete(key),
  });
  return {
    bar, animate: () => animator.animate({ querySelectorAll: () => [bar] }),
    reduce: value => { reduce = value; },
    tick(value) { time = value; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); },
    value: () => native ? bar.value : parseFloat(bar.style.width) / 100,
    queued: () => frames.size,
  };
}
for (const native of [false, true]) {
  test((native ? 'native' : 'CSS') + ' bar smoothly reaches final progress and does not replay unchanged values', () => {
    const t = setup(native); t.animate(); assert.equal(t.value(), 0);
    t.tick(300); assert(t.value() > 0 && t.value() < .4);
    t.tick(600); assert.equal(t.value(), .4);
    t.animate(); assert.equal(t.queued(), 0);
    t.bar.dataset.xpFraction = '.8'; t.animate(); assert.equal(t.value(), .4);
    t.tick(900); assert(t.value() > .4 && t.value() < .8);
    t.tick(1200); assert.equal(t.value(), .8);
  });
}
test('level-up fills the old bar before filling the next level', () => {
  const t = setup(); t.reduce(true); t.bar.dataset.xpFraction = '.8'; t.animate();
  t.reduce(false); t.bar.dataset.xpLevel = '2'; t.bar.dataset.xpFraction = '.2'; t.animate();
  t.tick(290); assert(t.value() > .99);
  t.tick(310); assert(t.value() < .1);
  t.tick(600); assert.equal(t.value(), .2);
});
test('corrections animate downward and maximum level reaches a full bar', () => {
  const t = setup(); t.reduce(true); t.animate(); t.reduce(false);
  t.bar.dataset.xpFraction = '.1'; t.animate(); t.tick(300);
  assert(t.value() > .1 && t.value() < .4); t.tick(600); assert.equal(t.value(), .1);
  t.bar.dataset.xpLevel = '50'; t.bar.dataset.xpFraction = '1'; t.animate(); t.tick(1200); assert.equal(t.value(), 1);
});
test('reduced motion skips animation, including when changed mid-animation', () => {
  const t = setup(); t.reduce(true); t.animate(); assert.equal(t.value(), .4); assert.equal(t.queued(), 0);
  t.reduce(false); t.bar.dataset.xpFraction = '.8'; t.animate(); t.reduce(true); t.tick(100); assert.equal(t.value(), .8);
});
test('a rerender cancels old animation frames and settles unchanged progress', () => {
  const t = setup(); t.animate(); assert.equal(t.queued(), 1); t.animate();
  assert.equal(t.queued(), 0); assert.equal(t.value(), .4);
});
