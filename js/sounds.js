// Quiet, locally synthesized cues. No downloads, music, or third-party audio.
(function (root) {
  'use strict';
  const KEY = 'fitquest-sound-enabled';
  // Each step is [frequency or chord, start offset, decay].
  // A chord shares one note's gain budget rather than adding volume.
  const cues = {
    checkin: [1, [[440, 0, .13], [554.37, .15, .18]]],
    achievement: [2, [[783.99, 0, .13], [659.25, .15, .13], [987.77, .30, .20]]],
    medal: [3, [[659.25, 0, .11], [783.99, .13, .11], [659.25, .26, .11], [1046.5, .39, .22]]],
    level: [4, [[523.25, 0, .14], [698.46, .16, .14], [880, .32, .23]]],
    rank: [5, [[392, 0, .12], [523.25, .14, .12], [659.25, .28, .12],
      [783.99, .42, .12], [[523.25, 659.25, 1046.5], .56, .38]]],
    legend: [6, [[659.25, 0, .13], [783.99, .15, .13], [1046.5, .30, .13], [1318.51, .45, .26]]],
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
          cues[selected][1].forEach(([pitch, offset, decay]) => {
            const pitches = Array.isArray(pitch) ? pitch : [pitch];
            pitches.forEach(frequency => {
              if (generation !== token) return;
              const oscillator = context.createOscillator(), gain = context.createGain();
              const at = start + offset;
              oscillator.type = 'sine';
              oscillator.frequency.value = frequency;
              gain.gain.setValueAtTime(0, at);
              gain.gain.linearRampToValueAtTime(.035 / pitches.length, at + .018);
              gain.gain.exponentialRampToValueAtTime(.0001, at + decay);
              oscillator.connect(gain); gain.connect(context.destination);
              oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); voices = voices.filter(v => v !== oscillator); };
              voices.push(oscillator);
              oscillator.start(at); oscillator.stop(at + decay + .01);
            });
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
