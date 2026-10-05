// Run: node tests/logic.test.js
const assert = require('assert');
const H = require('../js/logic.js');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('✓', name); }

test('exercise list: 5 exercises days 1-30, supermans from day 31', () => {
  assert.deepStrictEqual(H.exercisesForDay(1), ['pushups', 'situps', 'squats', 'snowangels', 'dolphinkicks']);
  assert.deepStrictEqual(H.exercisesForDay(30), ['pushups', 'situps', 'squats', 'snowangels', 'dolphinkicks']);
  assert.deepStrictEqual(H.exercisesForDay(31), ['pushups', 'situps', 'squats', 'supermans']);
  assert.deepStrictEqual(H.exercisesForDay(100), ['pushups', 'situps', 'squats', 'supermans']);
});

test('run distance boundaries 3/5/10 km', () => {
  const exp = { 1: 3, 10: 3, 11: 5, 20: 5, 21: 10, 50: 10, 100: 10 };
  for (const [d, km] of Object.entries(exp)) assert.strictEqual(H.runKmForDay(+d), km, 'day ' + d);
});

function simulate(day, repsFn) {
  let d = H.emptyDay(); const order = [];
  for (let guard = 0; guard < 1000; guard++) {
    const ex = H.nextExercise(d, day);
    if (!ex) break;
    order.push(ex);
    d = H.logSet(d, ex, repsFn ? repsFn(ex, order.length) : H.targetFor(d, day, ex));
  }
  return { d, order };
}

test('round-robin in sets of 10 until all 100 (day 1: 5 exercises, 50 sets)', () => {
  const { d, order } = simulate(1);
  assert.strictEqual(order.length, 50);
  assert.deepStrictEqual(order.slice(0, 7), ['pushups', 'situps', 'squats', 'snowangels', 'dolphinkicks', 'pushups', 'situps']);
  assert.ok(H.workoutDone(d, 1));
  assert.deepStrictEqual(H.totals(d, 1), { pushups: 100, situps: 100, squats: 100, snowangels: 100, dolphinkicks: 100 });
  assert.strictEqual(H.nextExercise(d, 1), null);
});

test('day 31 round-robin includes supermans (4 exercises, 40 sets)', () => {
  const { d, order } = simulate(31);
  assert.strictEqual(order.length, 40);
  assert.deepStrictEqual(order.slice(0, 5), ['pushups', 'situps', 'squats', 'supermans', 'pushups']);
  assert.ok(!order.includes('snowangels') && !order.includes('dolphinkicks'));
  assert.deepStrictEqual(H.totals(d, 31), { pushups: 100, situps: 100, squats: 100, supermans: 100 });
});

test('partial counts advance and completed exercises are skipped', () => {
  let d = H.emptyDay();
  d = H.logSet(d, 'pushups', 7);                          // partial
  assert.strictEqual(H.nextExercise(d, 1), 'situps');
  assert.strictEqual(H.targetFor(d, 1, 'pushups'), 10);
  d = H.setTotal(d, 1, 'squats', 100);                    // manual adjust: squats complete (doesn't move pointer)
  assert.strictEqual(H.nextExercise(d, 1), 'situps');
  d = H.logSet(d, 'situps', 10);
  assert.strictEqual(H.nextExercise(d, 1), 'snowangels'); // squats skipped
  d = H.setTotal(d, 1, 'pushups', 95);
  assert.strictEqual(H.targetFor(d, 1, 'pushups'), 5);    // last set target is the remainder
});

test('skip, undo, remove entry', () => {
  let d = H.logSet(H.emptyDay(), 'pushups', 10);
  assert.strictEqual(H.nextExercise(d, 1), 'situps');
  d = H.skip(d, 1);
  assert.strictEqual(H.nextExercise(d, 1), 'squats');
  d = H.logSet(d, 'squats', 10);
  assert.strictEqual(H.nextExercise(d, 1), 'snowangels');
  d = H.undo(d);
  assert.strictEqual(H.totals(d, 1).squats, 0);
  assert.strictEqual(H.nextExercise(d, 1), 'situps');
  d = H.removeEntry(d, 0);
  assert.strictEqual(d.entries.length, 0);
  assert.strictEqual(H.nextExercise(d, 1), 'pushups');
});

test('run, pace and day completion', () => {
  let d = simulate(11).d;
  assert.ok(!H.dayComplete(d, 11));
  d = H.setRun(d, 4.5, 1500);
  assert.ok(!H.runDone(d, 11));                           // 4.5 < 5 km
  d = H.setRun(d, 5, 1500);
  assert.ok(H.dayComplete(d, 11));
  assert.strictEqual(H.formatPace(H.paceSecPerKm(d.run)), '5:00 /km');
  assert.strictEqual(H.parseTime('52:30'), 3150);
  assert.strictEqual(H.parseTime('1:02:03'), 3723);
  assert.strictEqual(H.formatTime(3723), '1:02:03');
});

/* ---------- calendar, rest days & pauses (v2) ---------- */
const MON = '2026-10-05'; // a Monday
const full = (day) => H.setRun(simulate(day).d, H.runKmForDay(day), 1500);
function logDate(s, iso) { const info = H.dayInfo(s, iso); const d = full(info.day); d.day = info.day; s.log[iso] = d; return s; }
const numbers = (s, to) => H.buildCalendar(s, to).map((r) => r.date.slice(5) + '=' + (r.day || 'R')).join(' ');

test('default state: Saturday is the weekly rest day', () => {
  assert.deepStrictEqual(H.defaultState(MON).settings.restDays, [6]);
});

test('day numbering skips Saturday rest (Day N = non-paused days since start)', () => {
  const s = H.defaultState(MON);
  assert.strictEqual(numbers(s, '2026-10-12'), '10-05=1 10-06=2 10-07=3 10-08=4 10-09=5 10-10=R 10-11=6 10-12=7');
  assert.strictEqual(H.dayInfo(s, '2026-10-10').paused, true);
  assert.strictEqual(H.dayInfo(s, '2026-10-10').kind, 'rest');
  assert.strictEqual(H.dayInfo(s, '2026-10-10').nextDay, 6);
  assert.strictEqual(H.dayInfo(s, '2026-10-10').current, 5);
  // no rest days => plain calendar numbering
  const s0 = H.defaultState(MON); s0.settings.restDays = [];
  assert.strictEqual(H.dayInfo(s0, '2026-10-12').day, 8);
});

test('run 3/5/10 km and superman switch follow challenge day, not calendar day', () => {
  const s = H.defaultState(MON);
  const d10 = H.dateOfDay(s, 10), d11 = H.dateOfDay(s, 11), d20 = H.dateOfDay(s, 20), d21 = H.dateOfDay(s, 21), d30 = H.dateOfDay(s, 30), d31 = H.dateOfDay(s, 31);
  assert.deepStrictEqual([d10, d11, d20, d21, d30, d31], ['2026-10-15', '2026-10-16', '2026-10-27', '2026-10-28', '2026-11-08', '2026-11-09']);
  assert.strictEqual(H.runKmForDay(H.dayInfo(s, d10).day), 3);
  assert.strictEqual(H.runKmForDay(H.dayInfo(s, d11).day), 5);
  assert.strictEqual(H.runKmForDay(H.dayInfo(s, d20).day), 5);
  assert.strictEqual(H.runKmForDay(H.dayInfo(s, d21).day), 10);
  // calendar day 31 (Nov 4) is only challenge day 27 => still snow angels + dolphin kicks
  const cal31 = H.addDays(MON, 30);
  assert.strictEqual(H.dayInfo(s, cal31).day, 27);
  assert.ok(H.exercisesForDay(H.dayInfo(s, cal31).day).includes('dolphinkicks'));
  assert.ok(H.dayInfo(s, '2026-11-07').paused);                 // Sat Nov 7 (between day 29 and 30) is rest
  assert.deepStrictEqual(H.exercisesForDay(H.dayInfo(s, d31).day), ['pushups', 'situps', 'squats', 'supermans']);
  assert.deepStrictEqual(H.exercisesForDay(H.dayInfo(s, d30).day), ['pushups', 'situps', 'squats', 'snowangels', 'dolphinkicks']);
});

test('one-off pause and resume of a single day', () => {
  let s = H.setPaused(H.defaultState(MON), '2026-10-07', true, 'sick');
  assert.deepStrictEqual(H.dayInfo(s, '2026-10-07'), Object.assign({}, H.dayInfo(s, '2026-10-07'), { paused: true, kind: 'oneoff', reason: 'sick' }));
  assert.strictEqual(H.dayInfo(s, '2026-10-08').day, 3);
  assert.strictEqual(H.dayInfo(s, '2026-10-11').day, 5);
  s = H.setPaused(s, '2026-10-07', false);
  assert.strictEqual(H.dayInfo(s, '2026-10-08').day, 4);
  assert.deepStrictEqual(s.overrides, {});                       // clean: back to rule
  // "do the workout anyway" on a Saturday rest day
  s = H.setPaused(s, '2026-10-10', false);
  assert.strictEqual(H.dayInfo(s, '2026-10-10').day, 6);
  assert.strictEqual(H.dayInfo(s, '2026-10-11').day, 7);
});

test('pause range ("pause until") and resume early', () => {
  let s = H.pauseUntil(H.defaultState(MON), '2026-10-12', '2026-10-19', 'holiday'); // Mon 12 .. Sun 18 paused
  assert.deepStrictEqual(s.pauseRanges, [{ from: '2026-10-12', to: '2026-10-18', reason: 'holiday' }]);
  assert.strictEqual(H.dayInfo(s, '2026-10-14').kind, 'range');
  assert.strictEqual(H.dayInfo(s, '2026-10-19').day, 7);           // day 6 was Sun 11th
  assert.throws(() => H.pauseUntil(s, '2026-10-12', '2026-10-12'));
  s = H.resumeRanges(s, '2026-10-14');                              // resume on Wed 14th
  assert.deepStrictEqual(s.pauseRanges, [{ from: '2026-10-12', to: '2026-10-13', reason: 'holiday' }]);
  assert.strictEqual(H.dayInfo(s, '2026-10-14').day, 7);
  assert.strictEqual(H.activeRange(s, '2026-10-14'), null);
  // projected finish moves with pauses
  assert.strictEqual(H.projectedFinish(H.defaultState(MON)), '2027-01-28');
  assert.strictEqual(H.projectedFinish(H.pauseUntil(H.defaultState(MON), '2026-10-12', '2026-10-19')), '2027-02-04');
  const s0 = H.defaultState(MON); s0.settings.restDays = [];
  assert.strictEqual(H.projectedFinish(s0), '2027-01-12');
});

test('rest days do not break the streak; a missed challenge day does', () => {
  let s = H.defaultState(MON);
  for (const iso of ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-11']) logDate(s, iso); // Sat 10th rest
  assert.strictEqual(H.currentStreak(s, '2026-10-11'), 6);
  assert.strictEqual(H.currentStreak(s, '2026-10-12'), 6);         // today (Mon) in progress
  assert.strictEqual(H.currentStreak(s, '2026-10-13'), 0);         // Mon 12th missed
  s = H.setPaused(s, '2026-10-12', true, 'travel');
  assert.strictEqual(H.currentStreak(s, '2026-10-13'), 6);         // paused instead -> streak kept
  const st = H.computeStats(s, '2026-10-13');
  assert.strictEqual(st.daysCompleted, 6);
  assert.strictEqual(st.restDays, 2);
  assert.strictEqual(st.bestStreak, 6);
  assert.strictEqual(st.totalsByExercise.pushups, 600);
});

test('changing weekly rest days does not renumber the past', () => {
  let s = H.defaultState(MON);
  logDate(s, '2026-10-05'); logDate(s, '2026-10-06');
  const before = numbers(s, '2026-10-14');
  s = H.setRestDays(s, [3], '2026-10-14');                          // switch rest day to Wednesday on Wed 14th
  assert.strictEqual(numbers(s, '2026-10-13'), before.split(' ').slice(0, 9).join(' ')); // past unchanged (Sat 10th still rest)
  assert.ok(H.dayInfo(s, '2026-10-14').paused);                    // today: new rule applies
  assert.ok(!H.dayInfo(s, '2026-10-17').paused);                   // future Saturday now a challenge day
  assert.ok(H.dayInfo(s, '2026-10-21').paused);                    // future Wednesday rest
  assert.ok(s.overrides['2026-10-10'].paused && s.overrides['2026-10-10'].frozen); // per-date flag stored
});

test('logged days keep their stored day number when a past day is paused later', () => {
  let s = H.defaultState(MON);
  logDate(s, '2026-10-09');
  assert.strictEqual(s.log['2026-10-09'].day, 5);
  s = H.setPaused(s, '2026-10-07', true);
  assert.strictEqual(H.dayInfo(s, '2026-10-09').day, 5);
  assert.strictEqual(H.dayInfo(s, '2026-10-08').day, 3);
  assert.ok(!H.dayInfo(s, '2026-10-09').paused);
  // logged data on a rest day wins over the rest rule
  s.log['2026-10-10'] = Object.assign(H.logSet(H.emptyDay(), 'pushups', 10), { day: 6 });
  assert.strictEqual(H.dayInfo(s, '2026-10-10').day, 6);
});

test('derived schedule for reminders (workout vs rest dates) is in the export', () => {
  let s = H.pauseUntil(H.defaultState(MON), '2026-10-20', '2026-10-23', 'trip');
  s = H.setPaused(s, '2026-10-14', true, 'dentist');
  const sch = H.schedule(s, '2026-10-12');
  assert.deepStrictEqual(sch.weeklyRestDays, ['Saturday']);
  assert.deepStrictEqual(sch.pauseRanges, [{ from: '2026-10-20', to: '2026-10-22', reason: 'trip' }]);
  assert.deepStrictEqual(sch.oneOffPauses, ['2026-10-14']);
  assert.ok(sch.workoutDates.includes('2026-10-13') && !sch.workoutDates.includes('2026-10-14') && !sch.workoutDates.includes('2026-10-17') && !sch.workoutDates.includes('2026-10-21'));
  assert.ok(sch.restDates.includes('2026-10-17') && sch.restDates.includes('2026-10-21'));
  assert.strictEqual(sch.workoutDates[sch.workoutDates.length - 1], sch.projectedFinish);
  assert.strictEqual(sch.days[0].date, '2026-10-12');
  assert.strictEqual(sch.workoutDates.length, 94);                // today (Mon 12th) is day 7 -> days 7..100
});

test('export/import roundtrip (v2) and v1 migration', () => {
  let s = H.setPaused(H.pauseUntil(H.defaultState(MON), '2026-10-20', '2026-10-23', 'trip'), '2026-10-14', true, 'x');
  logDate(s, '2026-10-05');
  const wrapped = JSON.parse(JSON.stringify({ app: '100-day-challenge', version: 2, data: s, schedule: H.schedule(s, MON) }));
  assert.deepStrictEqual(H.validateImport(wrapped), s);
  const v1 = { version: 1, settings: { startDate: MON }, days: { 1: simulate(1).d, 2: H.logSet(H.emptyDay(), 'squats', 10) } };
  const m = H.validateImport(v1);
  assert.strictEqual(m.log['2026-10-06'].day, 2);
  assert.deepStrictEqual(m.settings.restDays, []);
  assert.throws(() => H.validateImport({ foo: 1 }));
});

console.log(`\n${passed} logic tests passed`);
