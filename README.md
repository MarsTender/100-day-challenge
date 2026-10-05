# 100 Days Challenge (iPhone PWA)

Static, offline-capable web app: plain HTML/CSS/JS, no build step.

## Plan encoded
- Days 1–30: push-ups, sit-ups, squats, snow angels, dolphin kicks (100 each)
- Days 31–100: push-ups, sit-ups, squats, supermans (100 each)
- Reps are done round-robin in sets of 10 until each exercise hits 100 (partial sets allowed)
- Then a run: 3 km (days 1–10), 5 km (days 11–20), 10 km (days 21–100)
- Rest/pause days (weekly rest days, Saturday by default; one-off "Pause today"; "Pause challenge until") don't count:
  Day N = number of non-paused calendar days from the start date. Run distance and the day-31 superman switch follow
  the challenge day number. Rest days don't break the streak. A projected finish date (Day 100) is shown in Stats/Settings.

## Files
- `index.html`, `css/styles.css`
- `js/logic.js` (pure logic, also `require`-able from Node), `js/app.js` (UI), `js/charts.js` (hand-rolled SVG charts), `js/info.js` (exercise how-tos + SVG illustrations)
- `manifest.webmanifest`, `sw.js` (offline cache), `icons/`
- `tests/logic.test.js` (`node tests/logic.test.js`), `tests/e2e.test.js` (headless Chrome via playwright-core)

## Data
Stored on the device in `localStorage` (key `hdc100.state.v1`, schema version 2). Settings → Export/Import JSON for backups.

```
data.settings      { startDate, restDays: [6] }        // weekdays 0=Sun … 6=Sat
data.overrides     { "YYYY-MM-DD": { paused, kind, reason, frozen? } }   // per-date pause flags (one-off pauses,
                                                       // "do it anyway" unpauses, and past dates frozen when rest days change)
data.pauseRanges   [ { from, to, reason } ]            // "pause challenge until", inclusive
data.log           { "YYYY-MM-DD": { day, entries, run, current } }      // stored day number never changes once logged
schedule           (export only, derived) { projectedFinish, weeklyRestDays, pauseRanges, oneOffPauses,
                                            workoutDates[], restDates[], days[] } // today → Day 100, for reminders
```
Old v1 backups (days keyed by number) are migrated on import.
On iPhone the Home Screen app has its own storage, separate from Safari tabs; install first, then use it from the Home Screen icon.

## Deploy to GitHub Pages
```bash
gh auth login                                   # once
cd 100-day-challenge
git init -b main && git add -A && git commit -m "100 Days Challenge PWA"
gh repo create 100-day-challenge --public --source . --push
gh api -X POST repos/{owner}/100-day-challenge/pages -f "source[branch]=main" -f "source[path]=/"
# → https://<user>.github.io/100-day-challenge/
```
Then on iPhone: open the URL in Safari → Share → Add to Home Screen.

Any static HTTPS host works (Netlify drop, Cloudflare Pages, Vercel): upload the folder as-is.

## Testing helpers
`?today=YYYY-MM-DD` overrides today's date, `?date=YYYY-MM-DD` opens a specific date, `?tab=stats|settings` opens a tab.
