'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../js/sounds.js');
function setup(blocked = false) {
  let flush, created = 0; const frequencies = [], peaks = [], values = new Map();
  const context = { state: 'running', currentTime: 0, destination: {},
    createOscillator() { return { type: '', frequency: { set value(v) { frequencies.push(v); } }, connect() {}, disconnect() {}, start() {}, stop() {} }; },
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime(value, at) { peaks.push({value, at}); }, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; },
  };
  const storage = { getItem: k => { if (blocked) throw Error('blocked'); return values.get(k); }, setItem: (k,v) => { if (blocked) throw Error('blocked'); values.set(k,v); } };
  const env = { storage, hidden: () => false, audioContext: () => { created++; return context; }, setTimeout: f => { flush = f; return 1; }, clearTimeout: () => { flush = null; } };
  const sound = create(env);
  return { sound, frequencies, peaks, env, created: () => created, flush: () => flush?.() };
}
test('sound waits for a gesture and coalesces rewards to the highest cue', () => {
  const h = setup(); h.sound.play('checkin'); h.flush(); assert.equal(h.created(),0);
  h.sound.unlock(); h.sound.play('checkin'); h.sound.play('rank'); h.sound.play('achievement'); h.flush();
  assert.deepEqual(h.frequencies,[392,523.25,659.25,783.99,523.25,659.25,1046.5]);
});
test('muting cancels pending audio and persists separately from progress', () => {
  const h=setup(); h.sound.unlock(); h.sound.play('rank'); h.sound.setEnabled(false); h.flush();
  assert.deepEqual(h.frequencies,[]); assert.equal(create(h.env).isEnabled(),false);
});
test('blocked storage and missing audio do not break app actions', () => {
  const h=setup(true); h.sound.setEnabled(false); h.sound.setEnabled(true);
  h.env.audioContext=()=>null; h.sound.unlock(); h.sound.play('level'); assert.doesNotThrow(h.flush);
});

test('rank finish shares the existing peak volume across its chord', () => {
  const h=setup(); h.sound.unlock(); h.sound.play('rank'); h.flush();
  const groups=new Map();
  for (const peak of h.peaks) groups.set(peak.at,(groups.get(peak.at)||0)+peak.value);
  assert.ok([...groups.values()].every(value => value <= .035 + 1e-10));
  assert.equal(h.peaks.length,7);
});
test('check-in, level, achievement, medal and rank melodies differ', () => {
  const melodies=['checkin','level','achievement','medal','rank'].map(kind => {
    const h=setup(); h.sound.unlock(); h.sound.play(kind); h.flush(); return JSON.stringify(h.frequencies);
  });
  assert.equal(new Set(melodies).size,melodies.length);
});
