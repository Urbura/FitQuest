'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../js/save-manager.js');

function fixture(raw = null) {
  let state = { xp: 0 }, device = raw, blocked = false, preview = false, writes = 0;
  const saves = create({
    key: 'test-save',
    storage: {
      getItem() { if (blocked) throw Error('blocked'); return device; },
      setItem(_, value) { if (blocked) throw Error('blocked'); device = value; writes++; },
    },
    readSave: raw => {
      const value = JSON.parse(raw);
      if (!Number.isFinite(value.xp)) throw Error('invalid');
      return value;
    },
    fresh: () => ({ xp: 0 }), getState: () => state,
    setState: value => { state = value; }, isPreview: () => preview,
  });
  saves.loadInitial();
  return { saves, state: () => state, device: () => device, writes: () => writes,
    setDevice: value => { device = value; }, block: value => { blocked = value; },
    preview: value => { preview = value; } };
}

test('startup and developer previews cannot write normal progress', () => {
  const f = fixture('{"xp":7}');
  f.state().xp = 10;
  assert.equal(f.saves.write(), 'paused');
  f.saves.markReady();
  f.preview(true);
  assert.equal(f.saves.write(), 'paused');
  f.setDevice('{"xp":12}');
  assert.equal(f.saves.synchronize(), 'unchanged');
  assert.equal(f.device(), '{"xp":12}');
});

test('normal saving round-trips and avoids redundant device writes', () => {
  const f = fixture();
  f.saves.markReady();
  f.state().xp = 20;
  assert.equal(f.saves.write(), 'saved');
  assert.equal(f.saves.write(), 'saved');
  assert.equal(f.writes(), 1);
  assert.equal(fixture(f.device()).state().xp, 20);
});

test('unreadable startup data is preserved until explicit replacement', () => {
  const f = fixture('broken');
  f.saves.markReady();
  assert.equal(f.saves.rejectedRaw, 'broken');
  assert.equal(f.saves.write(), 'paused');
  assert.equal(f.device(), 'broken');
  assert.equal(f.saves.prepareReplacement(), true);
  f.saves.clearRejected();
  f.state().xp = 5;
  assert.equal(f.saves.write(), 'saved');
  assert.equal(fixture(f.device()).state().xp, 5);
});

test('a competing tab save is loaded instead of overwritten', () => {
  const f = fixture('{"xp":5}');
  f.saves.markReady();
  f.state().xp = 10;
  f.setDevice('{"xp":30}');
  assert.equal(f.saves.write(), 'conflict-loaded');
  assert.equal(f.state().xp, 30);
  assert.equal(f.writes(), 0);
  f.setDevice(null);
  assert.equal(f.saves.synchronize(), 'loaded');
  assert.equal(f.state().xp, 0);
});

test('a malformed competing save is protected and pauses further writes', () => {
  const f = fixture('{"xp":5}');
  f.saves.markReady();
  f.setDevice('broken');
  assert.equal(f.saves.write(), 'conflict');
  assert.equal(f.saves.rejectedRaw, 'broken');
  assert.equal(f.saves.write(), 'paused');
  assert.equal(f.state().xp, 5);
  assert.equal(f.device(), 'broken');
});

test('blocked storage reports failure without discarding in-memory progress', () => {
  const f = fixture();
  f.saves.markReady();
  f.state().xp = 40;
  f.block(true);
  assert.equal(f.saves.write(), 'unavailable');
  assert.equal(f.saves.prepareReplacement(), false);
  assert.equal(f.saves.available, false);
  assert.equal(f.state().xp, 40);
  f.block(false);
  assert.equal(f.saves.write(), 'saved');
  assert.equal(f.saves.available, true);
});
