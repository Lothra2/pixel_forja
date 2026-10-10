import { chromium, devices } from '@playwright/test';
const base = process.argv[2], tag = process.argv[3];
const browser = await chromium.launch();
for (const mode of ['desktop', 'phone']) {
  const ctx = await browser.newContext(mode === 'phone' ? { ...devices['Pixel 7'], locale: 'es-VE' } : { viewport: { width: 1280, height: 900 }, locale: 'es-VE' });
  const page = await ctx.newPage();
  await page.goto(base + '/arena.html');
  await page.waitForFunction(() => window.__arena && document.getElementById('ar-loading').hidden, null, { timeout: 60000 });
  await page.click('[data-s="tenis"]');
  await page.waitForFunction(() => window.__arena?.sport === 'tenis' && document.getElementById('ar-loading').hidden, null, { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.locator('#ar-stage').screenshot({ path: `out/screens/tenis_${tag}_${mode}_0.png` });
  await page.getByRole('button', { name: /Saque/ }).click();
  await page.waitForTimeout(1400);
  await page.locator('#ar-stage').screenshot({ path: `out/screens/tenis_${tag}_${mode}_1.png` });
}
await browser.close();
