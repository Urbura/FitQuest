// Local reset dates and shared Sunday–Saturday activity rules.
(function (root) {
  'use strict';
  function shiftDay(day, offset) {
    return new Date(Date.parse(day + 'T00:00:00Z') + offset * 86400000).toISOString().slice(0, 10);
  }
  function startOfWeek(day) {
    return shiftDay(day, -new Date(day + 'T00:00:00Z').getUTCDay());
  }
  function localDay(now = Date.now()) {
    const date = new Date(now);
    if (date.getHours() * 60 + date.getMinutes() < 210) date.setDate(date.getDate() - 1);
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }
  function nextReset(now = Date.now()) {
    const date = new Date(now);
    date.setHours(3, 30, 0, 0);
    if (date.getTime() <= now) date.setDate(date.getDate() + 1);
    return date.getTime();
  }
  function positiveDays(days, today) {
    return Object.keys(days).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key) && (!today || key <= today) &&
      days[key]?.scores?.some(score => score > 0)).sort();
  }
  function streakSummary(days, today) {
    const active = [...new Set(days)].filter(key => !today || key <= today).sort();
    if (!active.length) return { current: 0, longest: 0 };
    const checked = new Set(active), last = today || active[active.length - 1];
    let current = 0, longest = 0, week = null, missedThisWeek = 0, consecutiveMisses = 0;
    for (let date = active[0]; date <= last; date = shiftDay(date, 1)) {
      const sunday = startOfWeek(date);
      if (sunday !== week) { week = sunday; missedThisWeek = 0; }
      if (checked.has(date)) {
        current++;
        consecutiveMisses = 0;
        longest = Math.max(longest, current);
      } else if (date !== today) {
        missedThisWeek++;
        consecutiveMisses++;
        if (missedThisWeek >= 3 || consecutiveMisses >= 3) current = 0;
      }
    }
    return { current, longest };
  }
  const calendar = { shiftDay, startOfWeek, localDay, nextReset, positiveDays, streakSummary };
  root.FitQuestCalendar = calendar;
  if (typeof module !== 'undefined' && module.exports) module.exports = calendar;
})(globalThis);
