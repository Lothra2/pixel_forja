/**
 * Convierte las ilustraciones SVG de prueba en PNG usando Chromium (Playwright).
 * Son imágenes sintéticas hechas a mano para probar el flujo; NO reemplazan las imágenes reales de Rick.
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(import.meta.dirname, '..', 'samples');
const names = ['sofi', 'gabo', 'papa', 'mama', 'nena', 'portero', 'thor'];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const n of names) {
  const svg = readFileSync(join(dir, 'src', `${n}.svg`), 'utf8');
  const m = svg.match(/width="(\d+)" height="(\d+)"/)!;
  await page.setViewportSize({ width: +m[1], height: +m[2] });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  const png = await page.locator('svg').screenshot({ omitBackground: true });
  writeFileSync(join(dir, `${n}.png`), png);
  console.log('ok', n);
}
await browser.close();
