'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../js/save-manager.js');

function fixture(raw = null) {
  let state = { xp: 0 }, blocked = false, preview = false, writes = 0, silentKey = null;
  const device = new Map([['test-save', raw]]);
  const saves = create({
    key: 'test-save',
    storage: {
      getItem(key) { if (blocked) throw Error('blocked'); return device.get(key) ?? null; },
      setItem(key, value) { if (blocked) throw Error('blocked'); if (key !== silentKey) device.set(key, value); writes++; },
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
  return { saves, data: device, silence: key => { silentKey = key; }, state: () => state, device: () => device.get('test-save'), writes: () => writes,
    setDevice: value => { device.set('test-save', value); }, block: value => { blocked = value; },
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

test('Manual Save is independent of autosave and restores its complete snapshot', () => {
  const f = fixture('{"xp":12}'); f.saves.markReady();
  assert.equal(f.saves.saveManual(null), 'saved');
  const manual = f.saves.readSlot('manual');
  assert.equal(manual.data.xp, 12); assert.ok(manual.savedAt);
  f.state().xp = 27; assert.equal(f.saves.write(), 'saved');
  assert.equal(f.saves.readSlot('autosave').data.xp, 27);
  assert.equal(f.saves.readSlot('manual').raw, manual.raw);
  assert.equal(f.saves.loadSlot({...manual, data:{xp:999}}), 'loaded');
  assert.equal(f.state().xp, 12, 'load revalidates device bytes instead of trusting the UI snapshot');
  assert.equal(f.saves.readSlot('manual').raw, manual.raw);
  assert.equal(JSON.parse(f.data.get('test-save-backup')).xp, 27);
});

test('stale slot selections and competing tabs cannot overwrite newer saves', () => {
  const f = fixture('{"xp":5}'); f.saves.markReady();
  f.saves.saveManual(null);
  const manual = f.saves.readSlot('manual'), auto = f.saves.readSlot('autosave');
  f.setDevice('{"xp":50}');
  assert.equal(f.saves.loadSlot(manual), 'stale');
  assert.equal(f.saves.loadSlot(auto), 'stale');
  assert.equal(f.saves.saveManual(manual.raw), 'stale');
  assert.equal(f.device(), '{"xp":50}');
  const latest = f.saves.readSlot('autosave');
  assert.equal(f.saves.loadSlot(latest), 'loaded');
  assert.equal(f.state().xp, 50);
});

test('failed writes are detected by readback and do not report a successful save', () => {
  const f = fixture('{"xp":5}'); f.saves.markReady();
  f.silence('test-save-manual');
  assert.equal(f.saves.saveManual(null), 'unavailable');
  assert.equal(f.saves.readSlot('manual'), null);
  f.silence('test-save'); f.state().xp = 12;
  assert.equal(f.saves.write(), 'unavailable');
  assert.equal(f.device(), '{"xp":5}');
  f.silence(null);
  assert.equal(f.saves.write(), 'saved');
  assert.equal(f.saves.readSlot('autosave').data.xp, 12);
});

test('damaged or missing autosaves recover the previous valid copy with saving paused', () => {
  for (const original of ['broken', null]) {
    const f = fixture(original);
    f.data.set('test-save-backup','{"xp":24}'); f.saves.loadInitial(); f.saves.markReady();
    assert.equal(f.state().xp, 24);
    assert.equal(f.saves.recoveryPending, true);
    assert.equal(f.saves.write(), 'paused');
    assert.equal(f.device(), original);
    assert.equal(f.saves.saveManual(null), 'saved');
    assert.equal(f.saves.loadSlot(f.saves.readSlot('manual')), 'loaded');
    assert.equal(f.saves.recoveryPending, false);
    assert.equal(JSON.parse(f.device()).xp, 24);
  }
});

test('invalid slots and preview sessions cannot replace normal progress', () => {
  const f = fixture('{"xp":9}'); f.saves.markReady();
  f.data.set('test-save-manual','broken');
  assert.throws(() => f.saves.readSlot('manual'));
  assert.equal(f.saves.loadSlot({kind:'manual',raw:'broken'}), 'unavailable');
  assert.equal(f.state().xp, 9);
  f.preview(true);
  assert.equal(f.saves.saveManual('broken'), 'preview');
  assert.equal(f.saves.loadSlot({kind:'autosave',raw:f.device()}), 'preview');
  assert.equal(f.device(), '{"xp":9}');
});
