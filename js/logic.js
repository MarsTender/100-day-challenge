/* 100 Days Challenge – pure logic (no DOM). Works in the browser (window.HDC) and in Node (require). */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HDC = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TOTAL_DAYS = 100;
  var REPS_GOAL = 100;
  var SET_SIZE = 10;
  var SUPERMAN_FROM_DAY = 31;
  var DAY_MS = 86400000;

  var EXERCISES = {
    pushups:      { name: 'Push-ups',      color: '#ff6a3d' },
    situps:       { name: 'Sit-ups',       color: '#ffc531' },
    squats:       { name: 'Squats',        color: '#3ee07f' },
    snowangels:   { name: 'Snow angels',   color: '#46b9ff' },
    dolphinkicks: { name: 'Dolphin kicks', color: '#a685ff' },
    supermans:    { name: 'Supermans',     color: '#ff5fae' }
  };
  var PHASE1 = ['pushups', 'situps', 'squats', 'snowangels', 'dolphinkicks'];
  var PHASE2 = ['pushups', 'situps', 'squats', 'supermans'];

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  /* ---------- plan ---------- */
  function exercisesForDay(day) { return (day >= SUPERMAN_FROM_DAY ? PHASE2 : PHASE1).slice(); }
  function runKmForDay(day) { return day <= 10 ? 3 : day <= 20 ? 5 : 10; }

  /* ---------- dates (local calendar dates as YYYY-MM-DD) ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toISODate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function isISODate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
  function parseISODate(s) { var p = s.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); }
  function addDays(iso, n) { return new Date(parseISODate(iso) + n * DAY_MS).toISOString().slice(0, 10); }

  /* ---------- per-day workout state ---------- */
  function emptyDay() { return { entries: [], run: null, current: null }; }
  function norm(d) { return d || emptyDay(); }

  function totals(dayData, day) {
    var t = {};
    exercisesForDay(day).forEach(function (k) { t[k] = 0; });
    norm(dayData).entries.forEach(function (e) { if (e.ex in t) t[e.ex] += Number(e.reps) || 0; });
    Object.keys(t).forEach(function (k) { t[k] = Math.max(0, t[k]); });
    return t;
  }
  function totalReps(dayData, day) {
    var t = totals(dayData, day);
    return Object.keys(t).reduce(function (s, k) { return s + Math.min(REPS_GOAL, t[k]); }, 0);
  }
  function workoutDone(dayData, day) {
    var t = totals(dayData, day);
    return Object.keys(t).every(function (k) { return t[k] >= REPS_GOAL; });
  }

  /** Round-robin: next incomplete exercise after the one last logged (or explicitly chosen via skip). null => all done. */
  function nextExercise(dayData, day) {
    var d = norm(dayData), list = exercisesForDay(day), t = totals(d, day);
    if (list.every(function (k) { return t[k] >= REPS_GOAL; })) return null;
    if (d.current && list.indexOf(d.current) >= 0 && t[d.current] < REPS_GOAL) return d.current;
    var sets = d.entries.filter(function (e) { return !e.adj && list.indexOf(e.ex) >= 0; });
    var start = sets.length ? (list.indexOf(sets[sets.length - 1].ex) + 1) % list.length : 0;
    for (var i = 0; i < list.length; i++) {
      var k = list[(start + i) % list.length];
      if (t[k] < REPS_GOAL) return k;
    }
    return null;
  }
  function targetFor(dayData, day, ex) {
    var t = totals(dayData, day);
    return clamp(REPS_GOAL - (t[ex] || 0), 0, SET_SIZE);
  }
  function roundNumber(dayData, day) {
    var sets = norm(dayData).entries.filter(function (e) { return !e.adj; }).length;
    return Math.floor(sets / exercisesForDay(day).length) + 1;
  }

  function clone(d) { var n = norm(d), o = { entries: n.entries.slice(), run: n.run ? Object.assign({}, n.run) : null, current: n.current || null }; if (n.day) o.day = n.day; return o; }

  function logSet(dayData, ex, reps, now) {
    var d = clone(dayData);
    reps = Math.round(Number(reps) || 0);
    if (reps <= 0) return d;
    d.entries.push({ ex: ex, reps: reps, t: now || Date.now() });
    d.current = null;
    return d;
  }
  /** move to the next incomplete exercise without logging */
  function skip(dayData, day) {
    var d = clone(dayData), list = exercisesForDay(day), t = totals(d, day);
    var cur = nextExercise(d, day);
    if (!cur) return d;
    var i0 = list.indexOf(cur);
    for (var i = 1; i <= list.length; i++) {
      var k = list[(i0 + i) % list.length];
      if (t[k] < REPS_GOAL) { d.current = k; break; }
    }
    return d;
  }
  function undo(dayData) {
    var d = clone(dayData);
    d.entries.pop();
    d.current = null;
    return d;
  }
  function removeEntry(dayData, index) {
    var d = clone(dayData);
    d.entries.splice(index, 1);
    d.current = null;
    return d;
  }
  /** manual adjustment: set exercise total to an exact value (stored as an adjustment entry) */
  function setTotal(dayData, day, ex, newTotal, now) {
    var d = clone(dayData);
    var delta = Math.round(Number(newTotal) || 0) - totals(d, day)[ex];
    if (delta !== 0) d.entries.push({ ex: ex, reps: delta, adj: true, t: now || Date.now() });
    return d;
  }
  function setRun(dayData, km, sec, now) {
    var d = clone(dayData);
    km = Number(km);
    if (!(km > 0)) { d.run = null; return d; }
    d.run = { km: Math.round(km * 100) / 100, sec: sec > 0 ? Math.round(sec) : null, t: now || Date.now() };
    return d;
  }
  function runDone(dayData, day) { var r = norm(dayData).run; return !!(r && r.km >= runKmForDay(day) - 1e-9); }
  function dayComplete(dayData, day) { return workoutDone(dayData, day) && runDone(dayData, day); }

  /* ---------- time & pace ---------- */
  function formatTime(sec) {
    if (sec == null || !isFinite(sec)) return '–';
    sec = Math.round(sec);
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s);
  }
  function parseTime(str) {
    if (str == null) return null;
    var parts = String(str).trim().split(':');
    if (!parts.length || parts.length > 3 || parts.some(function (p) { return !/^\d+$/.test(p); })) return null;
    var n = parts.map(Number), sec = 0;
    if (n.length === 1) sec = n[0] * 60;
    else if (n.length === 2) sec = n[0] * 60 + n[1];
    else sec = n[0] * 3600 + n[1] * 60 + n[2];
    return sec > 0 ? sec : null;
  }
  function paceSecPerKm(run) { return run && run.sec && run.km > 0 ? run.sec / run.km : null; }
  function formatPace(p) { return p ? formatTime(p) + ' /km' : '–'; }

  /* ---------- calendar: rest days, pauses, challenge-day numbering ---------- */
  var WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MAX_SCAN = 2000; // safety limit for date walks
  function weekday(iso) { return new Date(parseISODate(iso)).getUTCDay(); }
  function hasData(d) { return !!(d && ((d.entries && d.entries.length) || d.run)); }

  /** pause status from weekly rest days + pause ranges (ignores per-date overrides) */
  function basePause(state, iso, restDays) {
    var ranges = state.pauseRanges || [];
    for (var i = 0; i < ranges.length; i++) {
      var r = ranges[i];
      if (r.from <= iso && iso <= r.to) return { paused: true, kind: 'range', reason: r.reason || '', until: r.to };
    }
    var rd = restDays || (state.settings && state.settings.restDays) || [];
    if (rd.indexOf(weekday(iso)) >= 0) return { paused: true, kind: 'rest', reason: WEEKDAY_NAMES[weekday(iso)] + ' rest day' };
    return { paused: false, kind: null, reason: '' };
  }
  /** effective pause status of a date. Logged workout data always wins (a day with reps/run is a challenge day). */
  function pauseInfo(state, iso) {
    if (hasData((state.log || {})[iso])) return { paused: false, kind: null, reason: '', logged: true };
    var o = (state.overrides || {})[iso];
    if (o) return o.paused ? { paused: true, kind: o.kind || 'oneoff', reason: o.reason || '' } : { paused: false, kind: null, reason: '', forced: true };
    return basePause(state, iso);
  }

  /**
   * Walk the calendar from the start date. Day N = count of non-paused dates from start (inclusive).
   * Dates that already have logged data keep their stored day number (anchors), so later rule changes don't renumber them.
   * Stops at toISO (inclusive) or once stopAtDay is reached.
   */
  function buildCalendar(state, toISO, stopAtDay) {
    var out = [], n = 0, iso = state.settings.startDate, log = state.log || {};
    for (var guard = 0; guard < MAX_SCAN && (!toISO || iso <= toISO); guard++, iso = addDays(iso, 1)) {
      var L = log[iso], row;
      if (hasData(L) && L.day) { n = L.day; row = { date: iso, day: n, paused: false, logged: true }; }
      else {
        var p = pauseInfo(state, iso);
        if (p.paused) row = { date: iso, day: null, paused: true, kind: p.kind, reason: p.reason, until: p.until, nextDay: n + 1, logged: false };
        else { n++; row = { date: iso, day: n, paused: false, logged: hasData(L) }; }
      }
      out.push(row);
      if (stopAtDay && row.day && row.day >= stopAtDay) break;
    }
    return out;
  }
  /** info for one date: {date, day|null, paused, kind, reason, ...} plus `current` = challenge days elapsed (capped 100) */
  function dayInfo(state, iso) {
    if (iso < state.settings.startDate) return { date: iso, before: true, day: null, paused: false, current: 0 };
    var cal = buildCalendar(state, iso), row = cal[cal.length - 1], cur = 0;
    for (var i = cal.length - 1; i >= 0; i--) if (cal[i].day) { cur = cal[i].day; break; }
    row = Object.assign({}, row);
    row.current = Math.min(TOTAL_DAYS, cur);
    row.finished = cur > TOTAL_DAYS || (cur === TOTAL_DAYS && !row.day);
    return row;
  }
  /** date of challenge day 100, assuming every non-paused future date is a challenge day */
  function projectedFinish(state) {
    var cal = buildCalendar(state, null, TOTAL_DAYS), last = cal[cal.length - 1];
    return last && last.day >= TOTAL_DAYS ? last.date : null;
  }
  function dateOfDay(state, day) {
    var cal = buildCalendar(state, null, day);
    for (var i = 0; i < cal.length; i++) if (cal[i].day === day) return cal[i].date;
    return null;
  }

  /* ---------- pause editing (all return a new state) ---------- */
  function copyState(state) { return JSON.parse(JSON.stringify(state)); }
  /** one-off pause / resume of a single date */
  function setPaused(state, iso, paused, reason) {
    var s = copyState(state), base = basePause(s, iso);
    s.overrides = s.overrides || {};
    if (paused) {
      if (base.paused && !reason) delete s.overrides[iso];
      else s.overrides[iso] = { paused: true, kind: 'oneoff', reason: (reason || '').trim() };
    } else {
      if (!base.paused) delete s.overrides[iso];
      else s.overrides[iso] = { paused: false };
    }
    return s;
  }
  /** change weekly rest days; past dates (before today) are frozen as per-date flags so history doesn't renumber */
  function setRestDays(state, days, todayISO) {
    var s = copyState(state), oldDays = (s.settings.restDays || []).slice();
    days = days.map(Number).filter(function (d) { return d >= 0 && d <= 6; }).sort();
    s.overrides = s.overrides || {};
    for (var iso = s.settings.startDate, g = 0; iso < todayISO && g < MAX_SCAN; iso = addDays(iso, 1), g++) {
      if (s.overrides[iso] || hasData(s.log[iso])) continue;
      var before = basePause(s, iso, oldDays), after = basePause(s, iso, days);
      if (before.paused !== after.paused) s.overrides[iso] = before.paused ? { paused: true, kind: before.kind, reason: before.reason, frozen: true } : { paused: false, frozen: true };
    }
    s.settings.restDays = days;
    return s;
  }
  /** pause the whole challenge from today; resumeISO = first day back */
  function pauseUntil(state, todayISO, resumeISO, reason) {
    if (!isISODate(resumeISO) || resumeISO <= todayISO) throw new Error('Pick a date after today');
    var s = resumeRanges(state, todayISO);
    s.pauseRanges.push({ from: todayISO, to: addDays(resumeISO, -1), reason: (reason || '').trim() });
    return s;
  }
  /** end any pause range that covers today or the future */
  function resumeRanges(state, todayISO) {
    var s = copyState(state), yest = addDays(todayISO, -1);
    s.pauseRanges = (s.pauseRanges || []).filter(function (r) { return r.from < todayISO || r.to < todayISO; })
      .map(function (r) { if (r.to >= todayISO) r.to = yest; return r; });
    return s;
  }
  function activeRange(state, todayISO) {
    var rs = (state.pauseRanges || []).filter(function (r) { return r.to >= todayISO; });
    return rs.length ? rs[rs.length - 1] : null;
  }

  /* ---------- stats ---------- */
  function computeStats(state, todayISO) {
    var cal = todayISO < state.settings.startDate ? [] : buildCalendar(state, todayISO);
    var perDay = [], totalsAll = {}, totalKm = 0, bestPace = null, completed = 0, best = 0, run = 0, rest = 0;
    Object.keys(EXERCISES).forEach(function (k) { totalsAll[k] = 0; });
    cal.forEach(function (row, idx) {
      if (row.paused) { rest++; perDay.push(Object.assign({ rest: true }, row)); return; }
      if (row.day > TOTAL_DAYS) return;
      var d = state.log[row.date], day = row.day, t = totals(d, day), r = d && d.run, p = paceSecPerKm(r), c = dayComplete(d, day);
      var isToday = row.date === todayISO;
      Object.keys(t).forEach(function (k) { totalsAll[k] += t[k]; });
      if (r) totalKm += r.km;
      if (p && (bestPace == null || p < bestPace)) bestPace = p;
      if (c) { completed++; run++; best = Math.max(best, run); } else if (!isToday) run = 0;
      perDay.push({ date: row.date, day: day, totals: t, reps: totalReps(d, day), workoutDone: workoutDone(d, day), km: r ? r.km : 0, sec: r ? r.sec : null, pace: p, complete: c, logged: hasData(d), today: isToday });
    });
    return {
      perDay: perDay, challengeDays: perDay.filter(function (p) { return !p.rest; }), totalsByExercise: totalsAll,
      totalKm: Math.round(totalKm * 100) / 100, bestPace: bestPace, daysCompleted: completed, restDays: rest,
      streak: currentStreak(state, todayISO), bestStreak: best, projectedFinish: projectedFinish(state),
      totalReps: Object.keys(totalsAll).reduce(function (s, k) { return s + totalsAll[k]; }, 0)
    };
  }
  /** consecutive completed challenge days ending today (today may still be in progress); paused days are skipped, not breaks */
  function currentStreak(state, todayISO) {
    if (todayISO < state.settings.startDate) return 0;
    var cal = buildCalendar(state, todayISO), n = 0;
    for (var i = cal.length - 1; i >= 0; i--) {
      var row = cal[i];
      if (row.paused) continue;
      if (dayComplete(state.log[row.date], row.day)) n++;
      else if (row.date === todayISO) continue;
      else break;
    }
    return n;
  }

  /* ---------- derived schedule (for external reminders) ---------- */
  function schedule(state, todayISO) {
    var from = todayISO > state.settings.startDate ? todayISO : state.settings.startDate;
    var cal = buildCalendar(state, null, TOTAL_DAYS).filter(function (r) { return r.date >= from; });
    var rd = (state.settings.restDays || []).slice().sort();
    return {
      generatedAt: new Date().toISOString(),
      note: 'Challenge days from today until day 100. A reminder should fire on workoutDates only.',
      startDate: state.settings.startDate,
      projectedFinish: projectedFinish(state),
      weeklyRestDays: rd.map(function (d) { return WEEKDAY_NAMES[d]; }),
      pauseRanges: (state.pauseRanges || []).map(function (r) { return { from: r.from, to: r.to, reason: r.reason || '' }; }),
      oneOffPauses: Object.keys(state.overrides || {}).filter(function (k) { return state.overrides[k].paused && state.overrides[k].kind === 'oneoff'; }).sort(),
      workoutDates: cal.filter(function (r) { return !r.paused; }).map(function (r) { return r.date; }),
      restDates: cal.filter(function (r) { return r.paused; }).map(function (r) { return r.date; }),
      days: cal.map(function (r) { return r.paused ? { date: r.date, rest: true, reason: r.reason || '' } : { date: r.date, day: r.day, runKm: runKmForDay(r.day), exercises: exercisesForDay(r.day) }; })
    };
  }

  /* ---------- state / backup ---------- */
  var DEFAULT_REST = [6]; // Saturday
  function defaultState(todayISO) { return { version: 2, settings: { startDate: todayISO, restDays: DEFAULT_REST.slice() }, overrides: {}, pauseRanges: [], log: {} }; }
  function normDay(d, dayNum) {
    var o = {
      entries: (Array.isArray(d.entries) ? d.entries : []).filter(function (e) { return e && EXERCISES[e.ex] && isFinite(e.reps); })
        .map(function (e) { var x = { ex: e.ex, reps: Number(e.reps), t: Number(e.t) || 0 }; if (e.adj) x.adj = true; return x; }),
      run: d.run && Number(d.run.km) > 0 ? { km: Number(d.run.km), sec: Number(d.run.sec) || null, t: Number(d.run.t) || 0 } : null,
      current: EXERCISES[d.current] ? d.current : null
    };
    if (dayNum >= 1) o.day = Math.round(dayNum);
    return o;
  }
  /** accepts a v2 state, a v1 state (days keyed by number), or a wrapped export {app, data} */
  function validateImport(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('Not a JSON object');
    var s = obj.data && obj.app === '100-day-challenge' ? obj.data : obj;
    if (!s.settings || !isISODate(s.settings.startDate)) throw new Error('Missing settings.startDate');
    var out = defaultState(s.settings.startDate);
    if (Array.isArray(s.settings.restDays)) out.settings.restDays = s.settings.restDays.map(Number).filter(function (d) { return d >= 0 && d <= 6; });
    if (s.log && typeof s.log === 'object') {
      Object.keys(s.log).forEach(function (k) { if (isISODate(k) && s.log[k]) out.log[k] = normDay(s.log[k], Number(s.log[k].day)); });
    } else if (s.days && typeof s.days === 'object') { // v1 migration: day N was startDate + N - 1, no rest days back then
      Object.keys(s.days).forEach(function (k) {
        var n = Number(k);
        if (n >= 1 && n <= TOTAL_DAYS && s.days[k]) out.log[addDays(s.settings.startDate, n - 1)] = normDay(s.days[k], n);
      });
      if (!Array.isArray(s.settings.restDays)) out.settings.restDays = [];
    } else throw new Error('Missing log');
    Object.keys(s.overrides || {}).forEach(function (k) {
      var o = s.overrides[k]; if (!isISODate(k) || !o) return;
      out.overrides[k] = o.paused ? { paused: true, kind: o.kind || 'oneoff', reason: String(o.reason || '') } : { paused: false };
      if (o.frozen) out.overrides[k].frozen = true;
    });
    (Array.isArray(s.pauseRanges) ? s.pauseRanges : []).forEach(function (r) {
      if (r && isISODate(r.from) && isISODate(r.to) && r.from <= r.to) out.pauseRanges.push({ from: r.from, to: r.to, reason: String(r.reason || '') });
    });
    return out;
  }

  return {
    TOTAL_DAYS: TOTAL_DAYS, REPS_GOAL: REPS_GOAL, SET_SIZE: SET_SIZE, SUPERMAN_FROM_DAY: SUPERMAN_FROM_DAY, EXERCISES: EXERCISES, WEEKDAY_NAMES: WEEKDAY_NAMES,
    exercisesForDay: exercisesForDay, runKmForDay: runKmForDay,
    toISODate: toISODate, isISODate: isISODate, addDays: addDays, weekday: weekday,
    emptyDay: emptyDay, hasData: hasData, totals: totals, totalReps: totalReps, workoutDone: workoutDone, nextExercise: nextExercise, targetFor: targetFor,
    roundNumber: roundNumber, logSet: logSet, skip: skip, undo: undo, removeEntry: removeEntry, setTotal: setTotal, setRun: setRun,
    runDone: runDone, dayComplete: dayComplete, formatTime: formatTime, parseTime: parseTime, paceSecPerKm: paceSecPerKm, formatPace: formatPace,
    basePause: basePause, pauseInfo: pauseInfo, buildCalendar: buildCalendar, dayInfo: dayInfo, projectedFinish: projectedFinish, dateOfDay: dateOfDay,
    setPaused: setPaused, setRestDays: setRestDays, pauseUntil: pauseUntil, resumeRanges: resumeRanges, activeRange: activeRange,
    computeStats: computeStats, currentStreak: currentStreak, schedule: schedule, defaultState: defaultState, validateImport: validateImport
  };
});
