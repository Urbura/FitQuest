'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../js/sounds.js');
function setup(blocked = false) {
  let flush, created = 0; const frequencies = [], values = new Map();
  const context = { state: 'running', currentTime: 0, destination: {},
    createOscillator() { return { type: '', frequency: { set value(v) { frequencies.push(v); } }, connect() {}, disconnect() {}, start() {}, stop() {} }; },
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; },
  };
  const storage = { getItem: k => { if (blocked) throw Error('blocked'); return values.get(k); }, setItem: (k,v) => { if (blocked) throw Error('blocked'); values.set(k,v); } };
  const env = { storage, hidden: () => false, audioContext: () => { created++; return context; }, setTimeout: f => { flush = f; return 1; }, clearTimeout: () => { flush = null; } };
  const sound = create(env);
  return { sound, frequencies, env, created: () => created, flush: () => flush?.() };
}
test('sound waits for a gesture and coalesces rewards to the highest cue', () => {
  const h = setup(); h.sound.play('checkin'); h.flush(); assert.equal(h.created(),0);
  h.sound.unlock(); h.sound.play('checkin'); h.sound.play('rank'); h.sound.play('achievement'); h.flush();
  assert.deepEqual(h.frequencies,[523.25,659.25,783.99,1046.5]);
});
test('muting cancels pending audio and persists separately from progress', () => {
  const h=setup(); h.sound.unlock(); h.sound.play('rank'); h.sound.setEnabled(false); h.flush();
  assert.deepEqual(h.frequencies,[]); assert.equal(create(h.env).isEnabled(),false);
});
test('blocked storage and missing audio do not break app actions', () => {
  const h=setup(true); h.sound.setEnabled(false); h.sound.setEnabled(true);
  h.env.audioContext=()=>null; h.sound.unlock(); h.sound.play('level'); assert.doesNotThrow(h.flush);
});
