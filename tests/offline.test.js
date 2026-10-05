// Verifies the service worker caches the app and it loads offline. Needs a server on :8765.
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8765/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); await page.waitForTimeout(500);
  await ctx.setOffline(true);
  await page.reload();
  const title = await page.textContent('.daytitle .big');
  const charts = await page.evaluate(() => !!window.HDCCharts && !!window.HDCInfo);
  console.log(title.includes('DAY') && charts ? '✓ app loads offline via service worker: ' + title : 'OFFLINE FAILED');
  await browser.close();
  process.exit(title.includes('DAY') && charts ? 0 : 1);
})().catch((e) => { console.error('OFFLINE FAILED', e); process.exit(1); });
