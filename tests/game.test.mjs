import assert from 'node:assert/strict';
import { demoKeys, demoStep, initial, step } from '../src/game.ts';

function simulate(stop, script) {
  let state = initial,
    keys = [];
  const history = [];
  for (let f = 0; f <= stop; f++) {
    if (script[f]) keys = script[f];
    state = step(state, { keys }, f);
    history.push(state);
  }
  return history;
}
const demo = simulate(749, demoKeys);
assert.equal(demo[285].perch, 1);
assert.equal(demo[285].bestPerch, 47);
assert.equal(demo[285].isRecord, true);
assert.equal(demo[650].carp, 1);
assert.equal(demo[650].bestCarp, 80);
assert.equal(demo.at(-1).phase, 'row');
assert.equal(demo[200].size, 47);
assert.notEqual(demo[320].z, 0);
assert.deepEqual(
  demo.at(-1),
  demo.reduce((s, _, f) => demoStep(s, { keys: [] }, f), initial),
);

const tooSoon = simulate(90, { 3: [' '], 6: [], 40: [' '], 42: [] });
assert.equal(tooSoon[40].miss, '提竿太早了，再等等浮漂');
assert.equal(tooSoon.at(-1).phase, 'row');
const missed = simulate(210, { 3: [' '], 6: [] });
assert(missed.some((s) => s.miss === '鱼儿悄悄溜走了'));
const slack = simulate(245, { 3: [' '], 6: [], 123: [' '], 125: [] });
assert(slack.some((s) => s.miss === '鱼线松了，鱼儿脱钩了'));
const cancel = simulate(120, { 0: [' '], 12: [], 45: ['x'], 46: [] });
assert.equal(cancel[45].miss, '已收回鱼线');
assert.equal(cancel.at(-1).phase, 'row');
const journalToggle = simulate(10, { 2: ['j'], 4: [], 6: ['j'], 8: [] });
assert.equal(journalToggle[2].journal, true);
assert.equal(journalToggle[6].journal, false);
const bounded = simulate(400, { 0: ['ArrowUp'] }).at(-1);
assert(bounded.x <= 12 && bounded.x > 11.9);
assert.equal(initial.perch + initial.carp, 0);
console.log(
  'Passed: real input, two species, both catches, records, journal toggle, missed bite, early strike, slack, cancel, boundary and replay.',
);
