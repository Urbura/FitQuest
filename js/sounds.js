// Quiet, locally synthesized cues. No downloads, music, or third-party audio.
(function (root) {
  'use strict';
  const KEY = 'fitquest-sound-enabled';
  const cues = {
    checkin: [1, [523.25, 659.25]],
    achievement: [2, [659.25, 783.99, 1046.5]],
    medal: [3, [523.25, 659.25, 783.99, 1046.5]],
    level: [4, [523.25, 659.25, 880]],
    rank: [5, [523.25, 659.25, 783.99, 1046.5]],
    legend: [6, [659.25, 783.99, 1046.5, 1318.51]],
  };
  function create(env) {
    let enabled = true, context, pending, timer, voices = [], generation = 0;
    try { enabled = env.storage.getItem(KEY) !== '0'; } catch (_) { /* Session setting still works. */ }
    function stop() {
      for (const voice of voices) { try { voice.stop(); } catch (_) {} }
      voices = [];
    }
    function setEnabled(value) {
      enabled = Boolean(value);
      generation++;
      pending = null;
      if (timer !== undefined) env.clearTimeout(timer);
      timer = undefined;
      stop();
      try { env.storage.setItem(KEY, enabled ? '1' : '0'); } catch (_) {}
    }
    // Called from a user gesture, before any asynchronous save lock is acquired.
    function unlock() {
      if (!enabled || env.hidden()) return;
      try {
        context ||= env.audioContext();
        if (context?.state === 'suspended') context.resume().catch(() => {});
      } catch (_) { /* Audio must never interfere with check-ins or saving. */ }
    }
    function play(kind) {
      if (!enabled || !cues[kind] || env.hidden()) return;
      if (!pending || cues[kind][0] > cues[pending][0]) pending = kind;
      if (timer !== undefined) return;
      timer = env.setTimeout(() => {
        timer = undefined;
        const selected = pending, token = generation;
        pending = null;
        if (!enabled || !selected || env.hidden() || context?.state !== 'running') return;
        try {
          stop();
          const start = context.currentTime + .01;
          cues[selected][1].forEach((frequency, index) => {
            if (generation !== token) return;
            const oscillator = context.createOscillator(), gain = context.createGain();
            const at = start + index * .085;
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0, at);
            gain.gain.linearRampToValueAtTime(.035, at + .012);
            gain.gain.exponentialRampToValueAtTime(.0001, at + .22);
            oscillator.connect(gain); gain.connect(context.destination);
            oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); voices = voices.filter(v => v !== oscillator); };
            voices.push(oscillator);
            oscillator.start(at); oscillator.stop(at + .24);
          });
        } catch (_) { stop(); }
      }, 50); // Collapse simultaneous rewards to their most significant cue.
    }
    return { isEnabled: () => enabled, setEnabled, unlock, play };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { create };
  if (root.document) {
    root.FitQuestSounds = create({
      storage: { getItem: key => root.localStorage.getItem(key), setItem: (key, value) => root.localStorage.setItem(key, value) },
      audioContext: () => { const Audio = root.AudioContext || root.webkitAudioContext; return Audio ? new Audio() : null; },
      hidden: () => root.document.hidden,
      setTimeout: root.setTimeout.bind(root), clearTimeout: root.clearTimeout.bind(root),
    });
    root.document.addEventListener('pointerdown', () => root.FitQuestSounds.unlock(), { capture: true });
    root.document.addEventListener('keydown', () => root.FitQuestSounds.unlock(), { capture: true });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
