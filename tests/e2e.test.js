// Headless browser test + screenshots. Run with: NODE_PATH=/workspace/pwtools/node_modules node tests/e2e.test.js  (needs a server on :8765)
const { chromium } = require('playwright-core');
const assert = require('assert');
const H = require('../js/logic.js');
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const OUT = __dirname + '/../screenshots/';
const KEY = 'hdc100.state.v1';

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  const ok = (m) => console.log('✓', m);
  const getState = () => page.evaluate(() => window.__hdc.getState());
  const text = (sel) => page.textContent(sel).then((t) => t.trim());
  const go = (q) => page.goto(BASE + q);

  // 1. fresh start (Tue 2026-10-06): start date = first open, Saturday rest by default
  await go('?today=2026-10-06');
  let st = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  assert.strictEqual(st.settings.startDate, '2026-10-06');
  assert.deepStrictEqual(st.settings.restDays, [6]);
  assert.match(await text('.daytitle .big'), /DAY 1/);
  ok('start date defaults to first open (Day 1), Saturday rest by default');

  // 2. round-robin through the UI incl. a partial set
  const seen = [];
  for (let i = 0; i < 6; i++) {
    seen.push(await text('.exname'));
    if (i === 1) { await page.click('[data-act="minus"]'); await page.click('[data-act="minus"]'); }
    await page.click('[data-act="log"]');
  }
  assert.deepStrictEqual(seen, ['Push-ups', 'Sit-ups', 'Squats', 'Snow angels', 'Dolphin kicks', 'Push-ups']);
  st = await getState();
  assert.deepStrictEqual(H.totals(st.log['2026-10-06'], 1), { pushups: 20, situps: 8, squats: 10, snowangels: 10, dolphinkicks: 10 });
  assert.strictEqual(st.log['2026-10-06'].day, 1);
  ok('UI round-robin advances and logs partial reps (8 sit-ups); log stores day number');

  await page.click('[data-act="undo"]');
  assert.strictEqual(H.totals((await getState()).log['2026-10-06'], 1).pushups, 10); ok('undo removes last set');

  await page.reload();
  st = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  assert.strictEqual(st.log['2026-10-06'].entries.length, 5); ok('data persists in localStorage across reload');

  await page.click('.setcard .infobtn');
  assert.match(await text('#dlg h3'), /Push-ups/);
  await page.click('#dlg [data-act="close"]'); ok('info sheet opens/closes');

  // 3. one-off pause toggle on Wed 7th (Day 2, nothing logged)
  await go('?today=2026-10-07');
  assert.match(await text('.daytitle .big'), /DAY 2/);
  await page.click('[data-act="pause"]');
  await page.fill('#pauseDayReason', 'sick');
  await page.click('[data-act="pause-confirm"]');
  assert.match(await text('.daytitle .big'), /REST DAY/);
  assert.match(await text('.rest-card .big'), /Day paused/);
  assert.match(await text('.rest-reason'), /sick/);
  assert.match(await text('.rest-next'), /Day 2/);
  assert.match(await text('#topbarRight'), /Rest/);
  await go('?today=2026-10-08');
  assert.match(await text('.daytitle .big'), /DAY 2/); ok('Pause today → rest card with reason; next calendar day becomes Day 2');
  await go('?today=2026-10-07');
  assert.match(await text('[data-act="unpause"]'), /Resume today/);
  await page.click('[data-act="unpause"]');
  assert.match(await text('.daytitle .big'), /DAY 2/);
  assert.deepStrictEqual((await getState()).overrides, {}); ok('Resume today → back to Day 2, override cleared');

  // 4. Saturday weekly rest card + "do the workout anyway"
  await go('?today=2026-10-10');
  assert.match(await text('.rest-card .big'), /Rest day/);
  assert.match(await text('.rest-reason'), /Saturday rest day/);
  assert.match(await text('.rest-next'), /Day 5/);   // Tue6=1 .. Fri9=4, Sat rest, Sun11=5
  await page.click('[data-act="unpause"]');
  assert.match(await text('.daytitle .big'), /DAY 5/);
  assert.ok(await page.$('.setcard'));
  await page.click('[data-act="pause"]'); await page.click('[data-act="pause-confirm"]'); // back to rest
  assert.match(await text('.rest-card .big'), /Rest day/);
  ok('Saturday shows Rest day card; "Do the workout anyway" unpauses it (Day 5)');

  // 5. run / superman thresholds follow the challenge day in the UI
  st = await getState();
  for (const [day, km] of [[10, 3], [11, 5], [20, 5], [21, 10]]) {
    await go('?today=' + H.dateOfDay(st, day));
    assert.match(await text('.daytitle .big'), new RegExp('DAY ' + day + ' '));
    assert.match(await text('.runtarget'), new RegExp(' ' + km + ' km'));
  }
  await go('?today=' + H.dateOfDay(st, 30));
  assert.strictEqual((await page.$$('.exmain')).length, 5);
  await go('?today=' + H.dateOfDay(st, 31));
  assert.deepStrictEqual(await page.$$eval('.exmain .nm', (els) => els.map((e) => e.textContent.trim())), ['Push-ups', 'Sit-ups', 'Squats', 'Supermans']);
  ok('UI: 3/5/10 km at challenge days 10/11/20/21 and supermans from challenge day 31 (dates ' + H.dateOfDay(st, 31) + ')');

  // 6. settings: weekly rest picker + pause range + resume
  await go('?today=2026-10-08&tab=settings');
  await page.click('.wd:has(input[value="0"])');                 // add Sunday
  assert.deepStrictEqual((await getState()).settings.restDays, [0, 6]);
  await page.click('.wd:has(input[value="0"])');                 // remove again
  assert.deepStrictEqual((await getState()).settings.restDays, [6]);
  await page.fill('#resumeDate', '2026-10-12');
  await page.fill('#pauseReason', 'trip');
  await page.click('[data-act="pauserange"]');
  assert.deepStrictEqual((await getState()).pauseRanges, [{ from: '2026-10-08', to: '2026-10-11', reason: 'trip' }]);
  assert.match(await text('#view-settings'), /back on/);
  const payload = await page.evaluate(() => window.__hdc.exportPayload());
  assert.deepStrictEqual(payload.data.settings.restDays, [6]);
  assert.strictEqual(payload.data.pauseRanges.length, 1);
  assert.ok(payload.schedule.workoutDates.length && payload.schedule.restDates.includes('2026-10-10') && payload.schedule.projectedFinish);
  await page.click('[data-act="resume"]');
  assert.deepStrictEqual((await getState()).pauseRanges, []);
  ok('settings: rest-day checkboxes, pause-until range, resume; export includes restDays, pauseRanges and schedule');

  // 7. seed realistic history for screenshots: start Mon 2026-09-21, today Tue 2026-10-06
  const start = '2026-09-21';
  let seed = H.defaultState(start);
  seed = H.setPaused(seed, '2026-09-30', true, 'sick');
  const rnd = (i) => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
  for (let iso = start; iso < '2026-10-06'; iso = H.addDays(iso, 1)) {
    const info = H.dayInfo(seed, iso);
    if (info.paused || iso === '2026-10-02') continue;              // Fri 2nd missed
    const day = info.day; let d = H.emptyDay(), t = Date.parse(iso + 'T06:30:00+10:00');
    for (let g = 0; g < 200; g++) { const ex = H.nextExercise(d, day); if (!ex) break; d = H.logSet(d, ex, H.targetFor(d, day, ex), t += 60000); }
    const km = H.runKmForDay(day), pace = 350 - day * 3 + rnd(day) * 25;
    d = H.setRun(d, iso === '2026-09-25' ? 2.5 : km, (iso === '2026-09-25' ? 2.5 : km) * pace, t);
    d.day = day; seed.log[iso] = d;
  }
  const todayDay = H.dayInfo(seed, '2026-10-06').day;
  let d14 = H.emptyDay();
  for (let i = 0; i < 17; i++) { const ex = H.nextExercise(d14, todayDay); d14 = H.logSet(d14, ex, i === 4 ? 8 : 10); }
  d14.day = todayDay; seed.log['2026-10-06'] = d14;
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, seed]);

  await go('?today=2026-10-06'); await page.waitForTimeout(300);
  assert.match(await text('.daytitle .big'), new RegExp('DAY ' + todayDay + ' '));
  await page.screenshot({ path: OUT + 'main.png' });
  await page.screenshot({ path: OUT + 'main-full.png', fullPage: true });

  await page.click('.tab[data-tab="stats"]'); await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + 'stats.png' });
  await page.screenshot({ path: OUT + 'stats-full.png', fullPage: true });
  const s2 = H.computeStats(seed, '2026-10-06');
  assert.match(await text('.tile .v'), new RegExp('^' + s2.daysCompleted + '/'));
  assert.ok((await page.$$('.cal i.rest')).length >= 3);
  assert.ok((await page.$$('.hist.rest')).length === 3);         // Sat 26, Wed 30 (sick), Sat 3
  assert.match(await text('.finish'), new RegExp(String(new Date(H.projectedFinish(seed)).getFullYear())));
  ok('stats: ' + s2.daysCompleted + ' days done, streak ' + s2.streak + ', rest cells on calendar, rest rows in history, projected finish ' + H.projectedFinish(seed));

  await page.click('.tab[data-tab="settings"]'); await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + 'settings.png' });
  await page.screenshot({ path: OUT + 'settings-full.png', fullPage: true });

  // rest.png: complete Tue 6 – Fri 9, then view Saturday 10th (weekly rest day)
  const seedRest = JSON.parse(JSON.stringify(seed));
  for (const iso of ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']) {
    const day = H.dayInfo(seedRest, iso).day; let d = H.emptyDay();
    for (let g = 0; g < 200; g++) { const ex = H.nextExercise(d, day); if (!ex) break; d = H.logSet(d, ex, H.targetFor(d, day, ex)); }
    d = H.setRun(d, H.runKmForDay(day), H.runKmForDay(day) * 320); d.day = day; seedRest.log[iso] = d;
  }
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, seedRest]);
  await go('?today=2026-10-10'); await page.waitForTimeout(300);   // Saturday = rest day
  assert.match(await text('#topbarRight'), /6/);                    // streak Sun 4 .. Fri 9 = 6, unaffected by the rest day
  assert.match(await text('.rest-card .big'), /Rest day/);
  await page.screenshot({ path: OUT + 'rest.png' });

  // info sheets for every exercise + run render
  await go('?today=2026-10-06');
  for (const k of ['pushups', 'situps', 'squats', 'snowangels', 'dolphinkicks', 'supermans', 'run']) {
    await page.evaluate((k) => window.__hdc.actions.info({ dataset: { ex: k } }), k);
    assert.ok((await text('#dlg h3')).length && (await page.$('#dlg svg.illus')));
    await page.locator('#dlg').screenshot({ path: OUT + 'info-' + k + '.png' });
    await page.evaluate(() => window.__hdc.actions.close());
  }
  ok('info sheets render for all 6 exercises + run');

  assert.deepStrictEqual(errors, []); ok('no JS errors');
  await browser.close();
  console.log('\nE2E passed');
})().catch((e) => { console.error('E2E FAILED:', e); process.exit(1); });
