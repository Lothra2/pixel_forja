import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const shots = 'out/screens';
mkdirSync(shots, { recursive: true });

test('flujo completo: ejemplo, fondo, zonas, cabeza, estilo, vista previa y exportar', async ({ page }, info) => {
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'PixelForja' })).toBeVisible();
  await page.screenshot({ path: `${shots}/${tag}_1_imagen.png`, fullPage: true });

  await page.getByTestId('sample-gabo').click();
  await expect(page.getByTestId('stage')).toBeVisible();
  await expect(page.getByText('Trabajando...')).toHaveCount(0, { timeout: 20000 });
  await page.screenshot({ path: `${shots}/${tag}_2_fondo.png`, fullPage: true });

  await page.getByTestId('next').click();
  await expect(page.getByText('Trabajando...')).toHaveCount(0, { timeout: 20000 });
  await page.screenshot({ path: `${shots}/${tag}_3_zonas.png`, fullPage: true });

  await page.getByTestId('next').click();
  await page.screenshot({ path: `${shots}/${tag}_4_cabeza.png`, fullPage: true });

  await page.getByTestId('next').click();
  await expect(page.getByTestId('preview-big')).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: `${shots}/${tag}_5_estilo.png`, fullPage: true });

  await page.getByTestId('next').click();
  await expect(page.getByTestId('qa')).toBeVisible();
  await expect(page.getByTestId('qa').locator('td.error')).toHaveCount(0);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${shots}/${tag}_6_vista.png`, fullPage: true });

  await page.getByTestId('next').click();
  const dl = page.waitForEvent('download');
  await page.getByTestId('export-ffgg').click();
  const file = await dl;
  expect(file.suggestedFilename()).toMatch(/gabo_48\.png|gabo_ffgg\.json/);
  await page.screenshot({ path: `${shots}/${tag}_7_exportar.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('cambia a inglés', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByText('Upload image')).toBeVisible();
});
