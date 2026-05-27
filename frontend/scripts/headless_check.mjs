import { chromium } from 'playwright';

(async () => {
  const url = process.env.URL || 'http://localhost:5174/';
  console.log('Visiting', url);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('[PAGE]', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('[PAGEERROR]', err && err.stack ? err.stack : String(err)));
  page.on('response', (res) => {
    if (res.status() >= 400) console.log('[RESPONSE]', res.status(), res.url());
  });
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle' , timeout: 10000});
    console.log('goto status', resp && resp.status());
    const html = await page.content();
    console.log('HTML length:', html.length);
    // snapshot a small portion
    console.log('HTML head snippet:\n', html.slice(0, 800));
    // wait a bit for runtime logs
    await page.waitForTimeout(1500);
  } catch (e) {
    console.log('[ERROR]', e && e.stack ? e.stack : String(e));
  } finally {
    await browser.close();
  }
})();
