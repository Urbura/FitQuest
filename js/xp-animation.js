// Shared visual-only XP animation. Saved XP and level calculations remain authoritative.
(function (root) {
  'use strict';
  function create({ requestFrame, cancelFrame, now, reducedMotion, duration = 600 }) {
    const previous = new Map();
    let pending = [];
    function animate(container) {
      pending.forEach(cancelFrame);
      pending = [];
      container.querySelectorAll('[data-quest-xp]').forEach(bar => {
        const key = bar.dataset.questXp;
        const fraction = Math.max(0, Math.min(1, Number(bar.dataset.xpFraction)));
        const level = Number(bar.dataset.xpLevel);
        if (!Number.isFinite(fraction) || !Number.isFinite(level)) return;
        const prior = previous.get(key);
        previous.set(key, { fraction, level });
        const set = value => {
          if (bar.tagName === 'PROGRESS') bar.value = value;
          else bar.style.width = (100 * value) + '%';
        };
        if (reducedMotion() || !requestFrame ||
            (prior && prior.fraction === fraction && prior.level === level)) {
          set(fraction);
          return;
        }
        const from = prior ? prior.fraction : 0;
        const gainedLevel = prior && level > prior.level;
        const started = now();
        const ease = t => 1 - Math.pow(1 - t, 3);
        function step() {
          const t = Math.min(1, Math.max(0, (now() - started) / duration));
          if (reducedMotion() || t === 1) { set(fraction); return; }
          const value = gainedLevel
            ? t < .5 ? from + (1 - from) * ease(t * 2) : fraction * ease((t - .5) * 2)
            : from + (fraction - from) * ease(t);
          set(value);
          pending.push(requestFrame(step));
        }
        set(from);
        pending.push(requestFrame(step));
      });
    }
    return { animate };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { create };
  if (root.document) root.QuestXPAnimation = create({
    requestFrame: root.requestAnimationFrame?.bind(root),
    cancelFrame: root.cancelAnimationFrame?.bind(root) || (() => {}),
    now: () => root.performance.now(),
    reducedMotion: () => root.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });
})(globalThis);
