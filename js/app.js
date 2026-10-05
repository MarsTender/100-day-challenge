/* 100 Days Challenge – UI */
(function () {
  'use strict';
  var H = window.HDC, C = window.HDCCharts, INFO = window.HDCInfo;
  var KEY = 'hdc100.state.v1';
  var VERSION = '1.1.0';
  var params = new URLSearchParams(location.search);
  var $ = function (s) { return document.querySelector(s); };

  function todayISO() { var o = params.get('today'); return H.isISODate(o) ? o : H.toISODate(new Date()); }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s || state)); }
    catch (e) { toast('⚠️ Could not save: storage full or blocked'); }
  }
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) { var s0 = H.validateImport(JSON.parse(raw)); save(s0); return s0; } }
    catch (e) { console.warn('Bad saved state', e); }
    var s = H.defaultState(todayISO()); // start date defaults to the first day the app is opened; Saturday rest by default
    save(s);
    return s;
  }

  var state = load();
  var today = todayISO(), viewDate = today, tab = params.get('tab') || 'workout';
  var pending = { key: '', reps: 10 };
  var chartEx = 'pushups';

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});

  function refreshToday() {
    var wasToday = viewDate === today;
    today = todayISO();
    if (wasToday || viewDate > today) viewDate = today;
    if (viewDate < state.settings.startDate && today >= state.settings.startDate) viewDate = state.settings.startDate;
  }
  function getLog(iso) { return state.log[iso] || H.emptyDay(); }
  function setLog(iso, d, dayNum) {
    var prev = state.log[iso];
    if (H.hasData(d) || d.current) {
      d.day = (prev && H.hasData(prev) && prev.day) || dayNum; // keep the stored day number once data exists
      state.log[iso] = d;
    } else delete state.log[iso];
    save(); render();
  }
  function setState(s) { state = s; save(); render(); }

  /* ---------- helpers ---------- */
  function fmtDate(iso, opts) {
    if (!iso) return '–';
    var p = iso.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString(undefined, opts || { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pct(v, max) { return Math.max(0, Math.min(100, v / max * 100)).toFixed(1) + '%'; }
  function exName(k) { return H.EXERCISES[k].name; }
  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1900);
  }
  function infoBtn(key, label) { return '<button class="infobtn" data-act="info" data-ex="' + key + '" aria-label="About ' + label + '">i</button>'; }
  function restLabel(row) {
    if (row.kind === 'range') return 'Challenge paused' + (row.until ? ' until ' + fmtDate(row.until) : '') + (row.reason ? ' · ' + row.reason : '');
    if (row.kind === 'oneoff') return 'Paused' + (row.reason ? ' · ' + row.reason : '');
    return row.reason || 'Rest day';
  }

  /* ---------- workout view ---------- */
  function renderWorkout() {
    var info = H.dayInfo(state, viewDate), isToday = viewDate === today, h = '';
    var canPrev = viewDate > state.settings.startDate, canNext = viewDate < today;

    if (info.before) {
      $('#view-workout').innerHTML = '<div class="card rest-card"><div class="rest-emoji">🗓️</div><div class="big">Starts ' + fmtDate(state.settings.startDate) + '</div>' +
        '<p class="muted">Your 100 days begin on the start date set in Settings.</p><button class="btn good block" data-act="startnow">Start today instead</button></div>';
      return;
    }

    var n = info.day, d = getLog(viewDate), complete = !info.paused && n <= 100 && H.dayComplete(d, n);
    h += '<div class="dayhead">' +
      '<button class="daynav" data-act="prev" ' + (canPrev ? '' : 'disabled') + ' aria-label="Previous day">‹</button>' +
      '<div class="daytitle"><div class="big">' + (info.paused ? 'REST DAY' : n > 100 ? 'FINISHED' : 'DAY ' + n + ' <span>/ 100</span>') + '</div>' +
      '<div class="sub">' + fmtDate(viewDate) +
      (info.paused ? ' <span class="badge rest">' + (info.kind === 'rest' ? 'REST' : 'PAUSED') + '</span>' : complete ? ' <span class="badge done">DONE</span>' : isToday ? ' <span class="badge">TODAY</span>' : ' <span class="badge past">PAST</span>') + '</div></div>' +
      '<button class="daynav" data-act="next" ' + (canNext ? '' : 'disabled') + ' aria-label="Next day">›</button></div>';
    if (!isToday) h += '<div style="text-align:center;margin-top:8px"><button class="btn" data-act="today" style="min-height:40px;font-size:14px">Jump to today</button></div>';

    if (info.paused) { $('#view-workout').innerHTML = h + restCard(info, isToday); return; }
    if (n > 100) { $('#view-workout').innerHTML = h + '<div class="card complete-banner"><div class="big">🏁 100 days done!</div><div class="muted">Check your Stats to see how far you came.</div></div>'; return; }

    var list = H.exercisesForDay(n), t = H.totals(d, n), next = H.nextExercise(d, n), wDone = H.workoutDone(d, n), rDone = H.runDone(d, n), km = H.runKmForDay(n);
    var reps = H.totalReps(d, n), maxReps = list.length * H.REPS_GOAL;

    h += '<div class="overall"><div class="bar"><i style="width:' + pct(reps, maxReps) + '"></i></div>' +
      '<div class="overall-meta"><span>' + reps + ' / ' + maxReps + ' reps</span><span>Run ' + (d.run ? d.run.km : 0) + ' / ' + km + ' km</span></div></div>';
    if (!H.hasData(d)) h += '<div class="pauserow"><button class="btn ghost" data-act="pause">⏸ Pause ' + (isToday ? 'today' : 'this day') + '</button></div>';

    if (next) {
      var target = H.targetFor(d, n, next);
      var key = viewDate + ':' + next + ':' + d.entries.length;
      if (pending.key !== key) pending = { key: key, reps: target };
      h += '<div class="card setcard">' +
        '<div class="round">ROUND ' + H.roundNumber(d, n) + ' · ' + (list.indexOf(next) + 1) + ' OF ' + list.length + '</div>' +
        '<div class="exname-wrap"><div class="exname">' + exName(next) + '</div>' + infoBtn(next, exName(next)) + '</div>' +
        '<div class="target">Target <b>' + target + '</b> reps · ' + t[next] + '/100 done</div>' +
        '<div class="stepper"><button class="stepbtn" data-act="minus" aria-label="One less">−</button>' +
        '<input id="repInput" class="repinput" type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="100" value="' + pending.reps + '" aria-label="Reps done">' +
        '<button class="stepbtn" data-act="plus" aria-label="One more">+</button></div>' +
        '<button class="btn primary" data-act="log">✓ Log ' + pending.reps + ' ' + exName(next).toLowerCase() + '</button>' +
        '<div class="btnrow"><button class="btn" data-act="undo" ' + (d.entries.length ? '' : 'disabled') + '>↶ Undo last</button>' +
        '<button class="btn" data-act="skip">Skip ›</button></div></div>';
    } else if (!rDone) {
      h += '<div class="card complete-banner"><div class="big">💪 Reps done!</div><div class="muted">Now finish with your ' + km + ' km run.</div></div>';
    } else {
      h += '<div class="card complete-banner"><div class="big">🏆 Day ' + n + ' complete!</div><div class="muted">All reps and the ' + km + ' km run are logged.' + (n === H.SUPERMAN_FROM_DAY - 1 ? ' Next challenge day: supermans replace snow angels and dolphin kicks.' : n === 10 ? ' Next challenge day the run goes up to 5 km.' : n === 20 ? ' Next challenge day the run goes up to 10 km.' : '') + '</div></div>';
    }

    if (d.run || wDone) h += runCard(d, n, wDone);

    h += '<div class="card"><h2>' + (isToday ? 'Today\'s' : 'Day ' + n) + ' progress' + (n >= H.SUPERMAN_FROM_DAY ? ' · phase 2' : '') + '</h2>';
    list.forEach(function (k) {
      var v = t[k];
      h += '<div class="exrow' + (v >= 100 ? ' done' : '') + (k === next ? ' cur' : '') + '">' +
        '<button class="exmain" data-act="adjust" data-ex="' + k + '" aria-label="Adjust ' + exName(k) + '">' +
        '<span class="nm"><span class="dot" style="background:' + H.EXERCISES[k].color + '"></span>' + exName(k) + '</span>' +
        '<span class="ct">' + (v >= 100 ? '✓ ' : '') + v + ' <small>/ 100</small></span>' +
        '<span class="bar"><i style="width:' + pct(v, 100) + ';background:' + H.EXERCISES[k].color + '"></i></span></button>' +
        infoBtn(k, exName(k)) + '</div>';
    });
    h += '<p class="small muted" style="margin:8px 0 0">Tap an exercise to correct its total.</p></div>';

    if (!d.run && !wDone) h += runCard(d, n, wDone);

    if (d.entries.length) {
      h += '<div class="card"><details class="entries"><summary>Log entries (' + d.entries.length + ')</summary>';
      d.entries.slice().reverse().forEach(function (e, ri) {
        var i = d.entries.length - 1 - ri, tm = new Date(e.t);
        h += '<div class="entry"><span class="t">' + (e.t ? tm.getHours() + ':' + ('0' + tm.getMinutes()).slice(-2) : '') + '</span>' +
          '<span><b>' + (e.reps > 0 ? '+' : '') + e.reps + '</b> ' + exName(e.ex) + (e.adj ? ' <span class="muted small">(adjust)</span>' : '') + '</span>' +
          '<button class="x" data-act="delentry" data-i="' + i + '" aria-label="Delete entry">✕</button></div>';
      });
      h += '</details></div>';
    }
    $('#view-workout').innerHTML = h;
  }

  function restCard(info, isToday) {
    var nextDay = info.nextDay, nextDate = nextDay <= 100 ? H.dateOfDay(state, nextDay) : null;
    var emoji = info.kind === 'range' ? '🏖️' : info.kind === 'oneoff' ? '⏸️' : '😴';
    var title = info.kind === 'rest' ? 'Rest day' : info.kind === 'range' ? 'Challenge paused' : 'Day paused';
    var btn = info.kind === 'oneoff' ? '▶ Resume ' + (isToday ? 'today' : 'this day') : '💪 Do the workout anyway';
    return '<div class="card rest-card"><div class="rest-emoji">' + emoji + '</div><div class="big">' + title + '</div>' +
      '<div class="rest-reason">' + esc(restLabel(info)) + '</div>' +
      '<p class="muted small">Rest days don\'t count as challenge days and don\'t break your streak.</p>' +
      (nextDate ? '<div class="rest-next">Next up: <b>Day ' + nextDay + '</b> · ' + fmtDate(nextDate) + ' · ' + H.exercisesForDay(nextDay).length + ' exercises + ' + H.runKmForDay(nextDay) + ' km</div>' : '') +
      '<button class="btn good block" data-act="unpause" style="margin-top:14px">' + btn + '</button>' +
      (info.kind === 'range' ? '<p class="small muted" style="margin:10px 0 0;text-align:center">End the pause early in Settings → Pause challenge.</p>' : '') +
      (info.kind === 'rest' ? '<p class="small muted" style="margin:10px 0 0;text-align:center">Change weekly rest days in Settings.</p>' : '') + '</div>';
  }

  function runCard(d, n, wDone) {
    var km = H.runKmForDay(n), r = d.run, p = H.paceSecPerKm(r);
    var mins = r && r.sec ? Math.floor(r.sec / 60) : '', secs = r && r.sec ? r.sec % 60 : '';
    return '<div class="card runcard' + (wDone && !H.runDone(d, n) ? ' ready' : '') + '">' +
      '<div class="row"><h2 style="margin:0">' + (wDone ? 'Run' : 'Then: run') + '</h2><span class="spacer"></span>' + infoBtn('run', 'the run') + '</div>' +
      '<div class="runtarget">🏃 ' + km + ' km</div>' +
      (!wDone && !r ? '<div class="small muted">Unlocks after all reps (you can still log it early).</div>' : '') +
      '<div class="fields">' +
      '<div class="field"><label for="runKm">Distance km</label><input id="runKm" type="number" inputmode="decimal" step="0.01" min="0" placeholder="' + km + '" value="' + (r ? r.km : '') + '"></div>' +
      '<div class="field"><label for="runMin">Min</label><input id="runMin" type="number" inputmode="numeric" pattern="[0-9]*" min="0" placeholder="mm" value="' + mins + '"></div>' +
      '<div class="field"><label for="runSec">Sec</label><input id="runSec" type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="59" placeholder="ss" value="' + secs + '"></div></div>' +
      (r ? '<div class="runres"><span>Distance <b>' + r.km + ' km</b></span>' + (r.sec ? '<span>Time <b>' + H.formatTime(r.sec) + '</b></span><span>Pace <b>' + H.formatPace(p) + '</b></span>' : '') + '</div>' : '') +
      '<div class="btnrow"><button class="btn good" data-act="saverun" style="flex:2">' + (r ? 'Update run' : 'Save run') + '</button>' +
      (r ? '<button class="btn danger" data-act="clearrun">Clear</button>' : '<button class="btn" data-act="fillrun">' + km + ' km ✓</button>') + '</div></div>';
  }

  /* ---------- stats view ---------- */
  function renderStats() {
    var st = H.computeStats(state, today), ch = st.challengeDays, curDay = ch.length ? ch[ch.length - 1].day : 0, h = '';
    var xMax = Math.max(2, curDay);
    h += '<div class="tiles">' +
      tile(st.daysCompleted + '<small>/100</small>', 'Days done') +
      tile('🔥' + st.streak, 'Streak') +
      tile(st.bestStreak, 'Best streak') +
      tile(st.totalReps.toLocaleString(), 'Total reps') +
      tile(st.totalKm + '<small> km</small>', 'Total run') +
      tile(st.bestPace ? H.formatTime(st.bestPace) : '–', 'Best pace /km') + '</div>';

    h += '<div class="card"><h2>Challenge calendar</h2>' +
      '<div class="finish">🏁 Projected finish (Day 100): <b>' + fmtDate(st.projectedFinish, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + '</b><br><span class="muted small">' + st.restDays + ' rest/paused day' + (st.restDays === 1 ? '' : 's') + ' so far · rest days push the finish back</span></div>' +
      calendarMap(st) +
      '<div class="legend"><span><i style="background:#3ee07f"></i>Complete</span><span><i style="background:#6b4f1d"></i>Partial</span><span><i style="background:#3a2026"></i>Missed</span><span><i style="background:#24476a"></i>Rest</span><span><i style="background:#1d242d"></i>Upcoming</span></div></div>';

    var exKeys = Object.keys(H.EXERCISES);
    h += '<div class="card"><h2>Daily reps (stacked, by challenge day)</h2>' + C.stackedBarChart(ch.map(function (p) {
      return { x: p.day, target: H.exercisesForDay(p.day).length * 100, segs: exKeys.filter(function (k) { return k in p.totals; }).map(function (k) { return { v: Math.min(100, p.totals[k]), color: H.EXERCISES[k].color }; }) };
    }), { xMin: 1, xMax: xMax, yMax: 500, label: 'Daily reps per exercise', empty: 'No challenge days yet' }) +
      '<div class="legend">' + exKeys.filter(function (k) { return k !== 'supermans' || curDay >= H.SUPERMAN_FROM_DAY; }).map(function (k) { return '<span><i style="background:' + H.EXERCISES[k].color + '"></i>' + exName(k) + '</span>'; }).join('') + '</div></div>';

    var series = exKeys.map(function (k) {
      return { key: k, color: H.EXERCISES[k].color, points: ch.filter(function (p) { return k in p.totals; }).map(function (p) { return [p.day, p.totals[k]]; }) };
    }).filter(function (s) { return s.points.length; });
    if (!series.some(function (s) { return s.key === chartEx; }) && series.length) chartEx = series[0].key;
    h += '<div class="card"><h2>Reps per exercise by day</h2><div class="chips">' +
      series.map(function (s) { return '<button class="chip' + (s.key === chartEx ? ' on' : '') + '" data-act="chartex" data-ex="' + s.key + '" style="--c:' + s.color + '">' + exName(s.key) + '</button>'; }).join('') + '</div>' +
      C.lineChart(series.filter(function (s) { return s.key === chartEx; }), { xMin: 1, xMax: xMax, yMax: Math.max(100, niceTop(ch)), goal: 100, label: exName(chartEx) + ' per day', empty: 'No data for this exercise yet' }) + '</div>';

    h += '<div class="card"><h2>Run distance (km)</h2>' + C.barChart(ch.map(function (p) { return { x: p.day, y: p.km, target: H.runKmForDay(p.day), color: p.km >= H.runKmForDay(p.day) ? '#3ee07f' : '#ffb03d' }; }), { xMin: 1, xMax: xMax, label: 'Run distance', empty: 'No challenge days yet' }) +
      '<div class="legend"><span><i style="background:#3ee07f"></i>Target hit</span><span><i style="background:#ffb03d"></i>Short</span><span><i style="background:#ffffff20;border:1px dashed #ffffff60"></i>Target</span></div></div>';

    var pacePts = ch.filter(function (p) { return p.pace; }).map(function (p) { return [p.day, p.pace]; });
    h += '<div class="card"><h2>Run pace (min/km · lower is faster)</h2>' + C.lineChart([{ color: '#46b9ff', points: pacePts }], { xMin: 1, xMax: xMax, autoMin: true, yFmt: H.formatTime, empty: 'Log a run time to see your pace', label: 'Pace' }) + '</div>';

    h += '<div class="card"><h2>Total reps per exercise</h2>';
    exKeys.forEach(function (k) {
      h += '<div class="totrow"><span><span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;background:' + H.EXERCISES[k].color + '"></span>' + exName(k) + '</span><b>' + st.totalsByExercise[k].toLocaleString() + '</b></div>';
    });
    h += '</div>';

    h += '<div class="card"><h2>History</h2>';
    st.perDay.slice().reverse().forEach(function (p) {
      var dateLbl = fmtDate(p.date, { day: 'numeric', month: 'short' });
      if (p.rest) {
        h += '<button class="hist rest" data-act="goto" data-date="' + p.date + '"><span class="dn">R<small>' + dateLbl + '</small></span>' +
          '<span class="info">' + esc(restLabel(p)) + '<br>Doesn\'t count · streak safe</span><span class="st restst">☾</span></button>';
        return;
      }
      var list = H.exercisesForDay(p.day);
      h += '<button class="hist" data-act="goto" data-date="' + p.date + '">' +
        '<span class="dn">' + p.day + '<small>' + dateLbl + '</small></span>' +
        '<span class="info"><b>' + p.reps + '</b>/' + list.length * 100 + ' reps · ' + list.map(function (k) { return p.totals[k]; }).join('/') + '<br>' +
        '🏃 <b>' + p.km + '</b>/' + H.runKmForDay(p.day) + ' km' + (p.sec ? ' · ' + H.formatTime(p.sec) + ' · ' + H.formatPace(p.pace) : '') + '</span>' +
        '<span class="st ' + (p.complete ? 'ok' : p.logged ? 'part' : '') + '">' + (p.complete ? '✓' : p.logged ? '…' : '–') + '</span></button>';
    });
    if (!st.perDay.length) h += '<p class="muted small">Nothing yet.</p>';
    h += '</div>';
    $('#view-stats').innerHTML = h;
  }
  /** weekly calendar (Mon–Sun) from start date to projected finish */
  function calendarMap(st) {
    var cal = H.buildCalendar(state, null, H.TOTAL_DAYS);
    var last = cal.length ? cal[cal.length - 1].date : today;
    if (today > last) cal = H.buildCalendar(state, today);
    var byDate = {}; st.perDay.forEach(function (p) { byDate[p.date] = p; });
    var h = '<div class="cal"><b>M</b><b>T</b><b>W</b><b>T</b><b>F</b><b>S</b><b>S</b>';
    var lead = (H.weekday(state.settings.startDate) + 6) % 7;
    for (var i = 0; i < lead; i++) h += '<i class="blank"></i>';
    cal.forEach(function (r) {
      var p = byDate[r.date], cls = r.paused ? 'rest' : r.date > today ? 'future' : p && p.complete ? 'ok' : p && p.logged ? 'part' : r.date === today ? '' : 'miss';
      h += '<i class="' + cls + (r.date === today ? ' today' : '') + '" title="' + r.date + (r.day ? ' · Day ' + r.day : ' · rest') + '">' + (r.day && (r.day === 1 || r.day % 10 === 0) ? '<span>' + r.day + '</span>' : '') + '</i>';
    });
    return h + '</div>';
  }
  function niceTop(perDay) { var m = 0; perDay.forEach(function (p) { Object.keys(p.totals).forEach(function (k) { m = Math.max(m, p.totals[k]); }); }); return Math.ceil(m / 20) * 20; }
  function tile(v, l) { return '<div class="tile"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>'; }

  /* ---------- settings view ---------- */
  function renderSettings() {
    var info = H.dayInfo(state, today), fin = H.projectedFinish(state), ar = H.activeRange(state, today);
    var todayLbl = info.before ? 'Not started' : info.paused ? 'Rest day (' + info.current + ' done so far)' : info.day > 100 ? 'Finished' : 'Day ' + info.day;
    var h = '<div class="card"><h2>Challenge</h2>' +
      '<div class="setrow"><label for="startDate"><b>Start date</b><div class="small muted">Day 1 of 100</div></label>' +
      '<input id="startDate" type="date" value="' + state.settings.startDate + '"></div>' +
      '<div class="setrow"><span>Today</span><b>' + todayLbl + '</b></div>' +
      '<div class="setrow"><span>Projected finish (Day 100)</span><b>' + fmtDate(fin, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + '</b></div>' +
      '<div class="setrow"><span>Plan</span><span class="small muted" style="text-align:right">Days 1–30: push-ups, sit-ups, squats, snow angels, dolphin kicks<br>Days 31–100: push-ups, sit-ups, squats, supermans<br>Run: 3 km (1–10), 5 km (11–20), 10 km (21–100)<br>Day numbers count challenge days only (rest days skipped)</span></div></div>';

    var order = [1, 2, 3, 4, 5, 6, 0], rd = state.settings.restDays || [];
    h += '<div class="card"><h2>Weekly rest days</h2><div class="weekdays">' + order.map(function (d) {
      return '<label class="wd' + (rd.indexOf(d) >= 0 ? ' on' : '') + '"><input type="checkbox" class="restday" value="' + d + '"' + (rd.indexOf(d) >= 0 ? ' checked' : '') + '><span>' + H.WEEKDAY_NAMES[d].slice(0, 3) + '</span></label>';
    }).join('') + '</div><p class="note" style="margin:10px 0 0">Rest days don\'t count as challenge days and don\'t break your streak. Changes apply from today on; past days keep their day numbers.</p></div>';

    h += '<div class="card"><h2>Pause challenge</h2>';
    if (ar) {
      h += '<p class="note" style="margin-top:0">' + (ar.from > today ? 'Pause scheduled from <b>' + fmtDate(ar.from) + '</b>' : 'Paused since <b>' + fmtDate(ar.from) + '</b>') + ', back on <b>' + fmtDate(H.addDays(ar.to, 1)) + '</b>' + (ar.reason ? ' · ' + esc(ar.reason) : '') + '.</p>' +
        '<button class="btn good block" data-act="resume">▶ Resume challenge now</button>';
    } else {
      h += '<p class="note" style="margin-top:0">For longer breaks (holiday, illness). Paused days don\'t count and don\'t break your streak.</p>' +
        '<div class="fields2"><div class="field"><label for="resumeDate">Back on</label><input id="resumeDate" type="date" min="' + H.addDays(today, 1) + '" value="' + H.addDays(today, 7) + '"></div>' +
        '<div class="field"><label for="pauseReason">Reason (optional)</label><input id="pauseReason" type="text" maxlength="60" placeholder="e.g. holiday"></div></div>' +
        '<button class="btn block" data-act="pauserange">⏸ Pause challenge from today</button>';
    }
    h += '</div>';

    h += '<div class="card"><h2>Backup</h2>' +
      '<p class="note">Your data is stored <b>on this iPhone</b> (in the app\'s local storage). Export a backup now and then (save it to Files / iCloud Drive) so you never lose your progress, and to move it to a new device. The export also contains your rest days, pauses and the upcoming workout schedule.</p>' +
      '<div class="btnrow"><button class="btn" data-act="export">⬇︎ Export JSON</button><button class="btn" data-act="import">⬆︎ Import JSON</button></div>' +
      '<input id="importFile" type="file" accept="application/json,.json,text/plain" hidden></div>';
    h += '<div class="card"><h2>Danger zone</h2><button class="btn danger block" data-act="reset">Reset all data</button></div>';
    h += '<div class="card note"><b>Tip:</b> In Safari tap Share → <b>Add to Home Screen</b> to install. Works offline once loaded. Note the Home Screen app keeps its own storage, separate from Safari tabs.<br><br>100 Days v' + VERSION + '</div>';
    $('#view-settings').innerHTML = h;
  }

  /* ---------- dialogs ---------- */
  var dlg = $('#dlg');
  function openDialog(html, cls) {
    dlg.className = 'sheet ' + (cls || '');
    dlg.innerHTML = html;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    dlg.scrollTop = 0;
  }
  function closeDialog() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDialog(); });

  function openInfo(key) {
    var I = INFO[key]; if (!I) return;
    openDialog('<h3>' + I.title + '</h3><div class="musc">' + I.muscles + '</div>' + I.svg +
      '<p>' + I.desc + '</p><h4>How to</h4><ol>' + I.steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>' +
      '<h4>Form tips</h4><ul>' + I.tips.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>' +
      '<div class="btnrow" style="margin-top:16px"><button class="btn block" data-act="close">Got it</button></div>', 'infosheet');
  }
  function openAdjust(key) {
    var n = H.dayInfo(state, viewDate).day, cur = H.totals(getLog(viewDate), n)[key];
    openDialog('<h3>' + exName(key) + '</h3><p class="muted small" style="margin:0 0 6px">Day ' + n + ' · set the correct total</p>' +
      '<div class="stepper"><button class="stepbtn" data-act="adj-step" data-v="-10">−10</button>' +
      '<input id="adjInput" class="repinput" type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="999" value="' + cur + '">' +
      '<button class="stepbtn" data-act="adj-step" data-v="10">+10</button></div>' +
      '<div class="btnrow"><button class="btn" data-act="close">Cancel</button><button class="btn good" data-act="adj-save" data-ex="' + key + '" style="flex:2">Save total</button></div>');
  }
  function openPause() {
    openDialog('<h3>Pause ' + (viewDate === today ? 'today' : fmtDate(viewDate)) + '?</h3>' +
      '<p class="muted small" style="margin:4px 0 10px">It won\'t count as a challenge day and won\'t break your streak. Day numbers after it shift by one.</p>' +
      '<div class="field"><label for="pauseDayReason">Reason (optional)</label><input id="pauseDayReason" type="text" maxlength="60" placeholder="e.g. sick, travel" style="text-align:left;padding:0 12px;font-size:17px"></div>' +
      '<div class="btnrow" style="margin-top:14px"><button class="btn" data-act="close">Cancel</button><button class="btn good" data-act="pause-confirm" style="flex:2">⏸ Pause day</button></div>');
  }

  /* ---------- actions ---------- */
  function readReps() { var v = parseInt(($('#repInput') || {}).value, 10); return isNaN(v) ? 0 : Math.max(0, Math.min(100, v)); }
  function curDay() { return H.dayInfo(state, viewDate).day; }
  function syncLogLabel() {
    var b = document.querySelector('[data-act="log"]'), next = H.nextExercise(getLog(viewDate), curDay());
    if (b && next) b.textContent = '✓ Log ' + pending.reps + ' ' + exName(next).toLowerCase();
  }

  var actions = {
    prev: function () { if (viewDate > state.settings.startDate) { viewDate = H.addDays(viewDate, -1); render(); } },
    next: function () { if (viewDate < today) { viewDate = H.addDays(viewDate, 1); render(); } },
    today: function () { viewDate = today; render(); },
    startnow: function () { state.settings.startDate = today; viewDate = today; save(); render(); toast('Day 1 starts today 💪'); },
    minus: function () { pending.reps = Math.max(0, readReps() - 1); $('#repInput').value = pending.reps; syncLogLabel(); },
    plus: function () { pending.reps = Math.min(100, readReps() + 1); $('#repInput').value = pending.reps; syncLogLabel(); },
    log: function () {
      var n = curDay(), d = getLog(viewDate), ex = H.nextExercise(d, n), reps = readReps();
      if (!ex) return;
      if (reps <= 0) { toast('Enter how many reps you did'); return; }
      var nd = H.logSet(d, ex, reps);
      setLog(viewDate, nd, n);
      var nx = H.nextExercise(nd, n);
      toast('+' + reps + ' ' + exName(ex).toLowerCase() + (nx ? ' · next: ' + exName(nx) : ' · reps done! 🏃'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    undo: function () {
      var d = getLog(viewDate), last = d.entries[d.entries.length - 1];
      if (!last) return;
      setLog(viewDate, H.undo(d), curDay()); toast('Undid ' + (last.reps > 0 ? '+' : '') + last.reps + ' ' + exName(last.ex).toLowerCase());
    },
    skip: function () { setLog(viewDate, H.skip(getLog(viewDate), curDay()), curDay()); },
    delentry: function (el) { setLog(viewDate, H.removeEntry(getLog(viewDate), Number(el.dataset.i)), curDay()); toast('Entry deleted'); },
    adjust: function (el) { openAdjust(el.dataset.ex); },
    'adj-step': function (el) { var i = $('#adjInput'); i.value = Math.max(0, (parseInt(i.value, 10) || 0) + Number(el.dataset.v)); },
    'adj-save': function (el) {
      var v = parseInt($('#adjInput').value, 10);
      if (isNaN(v) || v < 0) { toast('Enter a number'); return; }
      closeDialog(); setLog(viewDate, H.setTotal(getLog(viewDate), curDay(), el.dataset.ex, v), curDay()); toast(exName(el.dataset.ex) + ' set to ' + v);
    },
    info: function (el) { openInfo(el.dataset.ex); },
    close: closeDialog,
    pause: openPause,
    'pause-confirm': function () {
      var reason = ($('#pauseDayReason') || {}).value || '';
      closeDialog(); setState(H.setPaused(state, viewDate, true, reason)); toast('Day paused · streak is safe');
    },
    unpause: function () {
      setState(H.setPaused(state, viewDate, false)); toast("Let's go! It's Day " + curDay());
    },
    pauserange: function () {
      try {
        setState(H.pauseUntil(state, today, $('#resumeDate').value, $('#pauseReason').value));
        toast('Challenge paused · back on ' + fmtDate($('#resumeDate') ? $('#resumeDate').value : H.addDays(H.activeRange(state, today).to, 1)));
      } catch (err) { toast(err.message); }
    },
    resume: function () { setState(H.resumeRanges(state, today)); toast('Challenge resumed 💪'); },
    fillrun: function () { $('#runKm').value = H.runKmForDay(curDay()); $('#runMin').focus(); },
    saverun: function () {
      var km = parseFloat(String($('#runKm').value).replace(',', '.'));
      var m = parseInt($('#runMin').value, 10) || 0, s = parseInt($('#runSec').value, 10) || 0, n = curDay();
      if (!(km > 0)) { toast('Enter the distance you ran'); return; }
      if (s > 59) { toast('Seconds must be 0–59'); return; }
      setLog(viewDate, H.setRun(getLog(viewDate), km, m * 60 + s), n);
      toast(H.dayComplete(getLog(viewDate), n) ? '🏆 Day ' + n + ' complete!' : 'Run saved');
    },
    clearrun: function () { if (confirm('Clear this run?')) setLog(viewDate, H.setRun(getLog(viewDate), 0), curDay()); },
    goto: function (el) { viewDate = el.dataset.date; switchTab('workout'); },
    chartex: function (el) { chartEx = el.dataset.ex; renderStats(); },
    export: exportData,
    import: function () { $('#importFile').click(); },
    reset: function () {
      if (!confirm('Delete ALL challenge data on this device? Export a backup first!')) return;
      if (!confirm('Really delete everything?')) return;
      state = H.defaultState(today); save(); viewDate = today; render(); toast('All data reset');
    }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (el && !el.disabled && actions[el.dataset.act]) { e.preventDefault(); actions[el.dataset.act](el); }
    var tb = e.target.closest('.tab');
    if (tb) switchTab(tb.dataset.tab);
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'repInput') { pending.reps = readReps(); syncLogLabel(); }
  });
  document.addEventListener('change', function (e) {
    if (e.target.classList.contains('restday')) {
      var days = Array.prototype.map.call(document.querySelectorAll('.restday:checked'), function (c) { return Number(c.value); });
      setState(H.setRestDays(state, days, today));
      toast(days.length ? 'Rest days: ' + days.map(function (d) { return H.WEEKDAY_NAMES[d].slice(0, 3); }).join(', ') : 'No weekly rest days');
    }
    if (e.target.id === 'startDate') {
      var v = e.target.value;
      if (!H.isISODate(v)) return;
      if (!confirm('Change start date to ' + fmtDate(v) + '? Days with logged data keep their day numbers.')) { e.target.value = state.settings.startDate; return; }
      state.settings.startDate = v; save(); viewDate = today; render(); toast('Start date updated');
    }
    if (e.target.id === 'importFile') {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var s = H.validateImport(JSON.parse(rd.result));
          var n = Object.keys(s.log).length;
          if (!confirm('Replace current data with backup (' + n + ' logged days, start ' + s.settings.startDate + ')?')) return;
          state = s; save(); viewDate = today; render(); toast('Backup imported ✓');
        } catch (err) { alert('Could not import: ' + err.message); }
        e.target.value = '';
      };
      rd.readAsText(f);
    }
  });

  function exportPayload() {
    return { app: '100-day-challenge', version: 2, exportedAt: new Date().toISOString(), data: state, schedule: H.schedule(state, today) };
  }
  function exportData() {
    var payload = JSON.stringify(exportPayload(), null, 2);
    var name = '100days-backup-' + today + '.json';
    var blob = new Blob([payload], { type: 'application/json' });
    try {
      var file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: '100 Days backup' }).catch(function () {});
        return;
      }
    } catch (e) { /* fall through to download */ }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    toast('Backup exported');
  }

  /* ---------- render ---------- */
  function switchTab(t) {
    tab = t;
    document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === t); });
    document.querySelectorAll('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + t); });
    render(); window.scrollTo(0, 0);
  }
  function render() {
    var info = H.dayInfo(state, today);
    $('#topbarRight').innerHTML = '<span class="pill"><span class="fire">🔥</span>' + H.currentStreak(state, today) + '</span> <span class="pill">' +
      (info.before ? 'Starts ' + fmtDate(state.settings.startDate, { day: 'numeric', month: 'short' }) : info.paused ? '☾ Rest' : info.day > 100 ? 'Done' : 'Day ' + info.day) + '</span>';
    if (tab === 'workout') renderWorkout();
    else if (tab === 'stats') renderStats();
    else renderSettings();
  }

  document.addEventListener('visibilitychange', function () { if (!document.hidden) { refreshToday(); render(); } });

  refreshToday(); viewDate = today;
  if (H.isISODate(params.get('date'))) viewDate = params.get('date') > today ? today : params.get('date');
  switchTab(['workout', 'stats', 'settings'].indexOf(tab) >= 0 ? tab : 'workout');

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('SW failed', e); }); });
  }
  window.__hdc = { getState: function () { return state; }, actions: actions, exportPayload: exportPayload, schedule: function () { return H.schedule(state, today); } };
})();
