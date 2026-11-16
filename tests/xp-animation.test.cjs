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

function rewardView(reduced = false, customAwards = null) {
  const vm = require('node:vm'), fs = require('node:fs');
  let time = 0, callback, completed = 0;
  const celebrations = [];
  const nodes = [];
  const make = tag => {
    const classes = new Set();
    const node = { tag, style: {}, children: [], attrs: {},
      classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x) },
      setAttribute(k,v) { this.attrs[k]=v; }, append(...items) { this.children.push(...items); },
      appendChild(item) { this.children.push(item); }, addEventListener(k,fn) { this[k]=fn; }, removeEventListener(k) { delete this[k]; }, focus() {}, showModal() { this.open=true; }, close() { this.open=false; }, remove() { this.removed=true; }
    }; nodes.push(node); return node;
  };
  const context = { document: {createElement: make, body: make('body'), addEventListener() {}, removeEventListener() {}},
    requestAnimationFrame: fn => {callback=fn; return 1;}, cancelAnimationFrame: () => {callback=null;},
    performance: {now: () => time}, matchMedia: () => ({matches: reduced}) };
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../js/xp-animation.js'),'utf8'), context);
  const awards = customAwards || ['Drafting','Revising'].map((name,i)=>({name, delta: i+2, color:'#abc',before:{level:1,remaining:1,need:5},after:{level:1,remaining:i+3,need:5}}));
  context.QuestXPAnimation.showCheckinAwards(awards,()=>completed++, {
    onLevelUp: (award, level, resume) => celebrations.push({award, level, resume})
  });
  return {nodes, celebrations, rows: nodes.filter(n=>n.className==='checkin-reward-row'), button:nodes.find(n=>n.tag==='button'),
    reduce(value) { reduced=value; },
    tick(t) {time=t; const fn=callback;callback=null;fn?.(t);}, completed:()=>completed};
}
test('check-in rewards animate one skill at a time, retain XP amounts and finish once',()=>{
 const t=rewardView();
 assert(t.rows[0].classList.contains('is-awarding'));
 assert(!t.rows[1].classList.contains('is-awarding'));
 assert.deepEqual(t.nodes.filter(n=>n.className==='checkin-reward-gain').map(n=>n.textContent),['+2 XP','+3 XP']);
 t.tick(850);
 assert(t.rows[0].classList.contains('is-awarded'));
 assert(t.rows[1].classList.contains('is-awarding'));
 t.tick(1700);assert.equal(t.button.textContent,'Continue');
 t.button.click();t.button.click();assert.equal(t.completed(),1);
});
test('reduced-motion reward summary immediately displays final gauges',()=>{
 const t=rewardView(true);assert.equal(t.button.textContent,'Continue');
 assert(t.rows.every(n=>n.classList.contains('is-awarded')));
 assert.deepEqual(t.nodes.filter(n=>n.className==='xp-reward-fill').map(n=>n.style.width),['60%','80%']);
});
test('skip settles every gauge before continuing without replaying rewards',()=>{
 const t=rewardView();t.button.click();assert.equal(t.completed(),0);
 assert.equal(t.button.textContent,'Continue');t.tick(900);t.button.click();assert.equal(t.completed(),1);
});

test('a filled gauge celebrates immediately and pauses remaining XP until dismissal', () => {
  const t = rewardView(false, [
    {name:'Drafting',delta:2,before:{level:1,remaining:4,need:5},after:{level:2,remaining:1,need:5},levels:[{level:2,remaining:0,need:5}]},
    {name:'Editing',delta:1,before:{level:1,remaining:0,need:5},after:{level:1,remaining:1,need:5}}
  ]);
  t.tick(424); assert.equal(t.celebrations.length, 0);
  t.tick(425); assert.equal(t.celebrations.length, 1);
  assert.equal(t.celebrations[0].level, 2);
  assert.equal(t.nodes.filter(n=>n.className==='xp-reward-fill')[0].style.width,'100%');
  assert(!t.rows[1].classList.contains('is-awarding'));
  t.tick(5000); assert(!t.rows[1].classList.contains('is-awarding'));
  t.button.click(); assert.equal(t.button.textContent,'Skip animation');
  t.celebrations[0].resume(); t.celebrations[0].resume();
  t.tick(5425); assert(t.rows[1].classList.contains('is-awarding'));
  t.tick(6275); t.button.click();
  assert.equal(t.celebrations.length,1); assert.equal(t.completed(),1);
});

test('multiple gained levels fill and celebrate separately, including Level 50', () => {
  const t = rewardView(false, [{name:'Drafting',delta:18,
    before:{level:48,remaining:14,need:20},after:{level:50,remaining:0,need:0},
    levels:[{level:49,remaining:0,need:21},{level:50,remaining:0,need:0}]}]);
  t.tick(425); assert.equal(t.celebrations[0].level,49);
  t.celebrations[0].resume();
  assert.equal(t.nodes.find(n=>n.className==='xp-reward-fill').style.width,'0%');
  t.tick(850); assert.equal(t.celebrations[1].level,50);
  assert.equal(t.nodes.find(n=>n.className==='xp-reward-fill').style.width,'100%');
  t.celebrations[1].resume();
  assert.equal(t.button.textContent,'Continue');
  assert.equal(t.nodes.find(n=>n.className==='xp-reward-fill').style.width,'100%');
});

test('closing the XP summary settles its gauges once and reduced motion during a fill does not lose unseen levels', () => {
  const t=rewardView();
  const modal=t.nodes.find(n=>n.tag==='dialog');
  assert.equal(modal.open,true);
  let prevented=0;
  modal.cancel({preventDefault(){prevented++;}});
  assert.equal(prevented,1);
  assert.equal(t.completed(),1);
  assert.equal(modal.open,false);
  t.tick(5000);t.button.click();assert.equal(t.completed(),1);
  const reduced=rewardView(false,[{name:'Strength',delta:2,before:{level:1,remaining:4,need:5},after:{level:2,remaining:1,need:6},levels:[{level:2,remaining:0,need:6}]}]);
  reduced.reduce(true);reduced.tick(50);
  assert.equal(reduced.celebrations.length,0);
  assert.equal(reduced.button.textContent,'Continue');
  reduced.button.click();assert.equal(reduced.completed(),1);
});
