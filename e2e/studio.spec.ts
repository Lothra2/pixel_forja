import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const shots = 'out/screens';
mkdirSync(shots, { recursive: true });

async function idle(page: Page) {
  await expect(page.getByText('Trabajando...')).toHaveCount(0, { timeout: 30000 });
}

test('persona: imagen, fondo, zonas, cabeza, estilo, animar, galería, editor y exportar', async ({ page }, info) => {
  test.setTimeout(180000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'PixelForja' })).toBeVisible();
  await page.screenshot({ path: `${shots}/${tag}_1_imagen.png`, fullPage: true });

  await page.getByTestId('sample-gabo').click();
  await expect(page.getByTestId('stage')).toBeVisible();
  await idle(page);
  await page.screenshot({ path: `${shots}/${tag}_2_fondo.png`, fullPage: true });
  await page.getByTestId('next').click();
  await idle(page);
  await page.screenshot({ path: `${shots}/${tag}_3_zonas.png`, fullPage: true });
  await page.getByTestId('next').click();
  await page.screenshot({ path: `${shots}/${tag}_4_cabeza.png`, fullPage: true });

  // avatar: el dibujo trae su cabeza, el avatar queda como opción
  await page.getByTestId('next').click();
  await expect(page.getByTestId('head-mode')).toBeVisible({ timeout: 30000 });
  // estilo: número de camiseta y sorpréndeme
  await page.getByTestId('next').click();
  await expect(page.getByTestId('preview-big')).toBeVisible({ timeout: 30000 });
  await page.getByTestId('number').fill('10');
  await page.getByTestId('surprise').click();
  await idle(page);
  await expect(page.locator('.variants button')).toHaveCount(6);
  await page.screenshot({ path: `${shots}/${tag}_5_estilo.png`, fullPage: true });

  // animar: fútbol, chilena, de frente
  await page.getByTestId('next').click();
  await page.getByTestId('pack').selectOption('football');
  await page.getByTestId('anim').selectOption('chilena');
  await idle(page);
  await expect(page.getByTestId('qa').locator('td.error')).toHaveCount(0);
  await page.screenshot({ path: `${shots}/${tag}_6_animar.png`, fullPage: true });
  await page.getByTestId('view').getByRole('button', { name: 'Frente ↓' }).click();
  await page.getByTestId('pack').selectOption('rpg');
  await idle(page);
  await page.screenshot({ path: `${shots}/${tag}_6b_rpg_frente.png`, fullPage: true });
  await page.getByTestId('save-gallery').click();
  await expect(page.getByText('Guardado')).toBeVisible();

  // editor de poses: arrastrar la mano y guardar
  await page.getByTestId('next').click();
  const canvas = page.getByTestId('editor-canvas');
  await expect(canvas).toBeVisible();
  const hand = page.getByTestId('joint-handNear');
  const box = await hand.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 30, box.y - 60, { steps: 5 });
    await page.mouse.up();
  }
  await page.getByTestId('ed-name').fill('saludo');
  await page.getByTestId('ed-save').click();
  await expect(page.getByText('Guardada en la ficha')).toBeVisible();
  await page.screenshot({ path: `${shots}/${tag}_7_editor.png`, fullPage: true });

  // exportar: preajuste del juego y Godot
  await page.getByTestId('next').click();
  await page.getByTestId('fmt-ffgg').check();
  let dl = page.waitForEvent('download');
  await page.getByTestId('export-go').click();
  expect((await dl).suggestedFilename()).toBe('gabo_ffgg.zip');
  await page.getByTestId('fmt-godot').check();
  await expect(page.getByTestId('qa-summary')).toContainText('Todo en verde', { timeout: 60000 });
  dl = page.waitForEvent('download');
  await page.getByTestId('export-go').click();
  expect((await dl).suggestedFilename()).toBe('gabo_godot.zip');
  await page.screenshot({ path: `${shots}/${tag}_8_exportar.png`, fullPage: true });

  // la galería guarda el personaje
  await page.getByTestId('step-image').click();
  await expect(page.getByTestId('gallery')).toContainText('gabo');
  expect(errors).toEqual([]);
});

test('animal: Thor de imagen a hoja', async ({ page }, info) => {
  test.setTimeout(120000);
  const tag = info.project.name;
  await page.goto('/');
  await page.getByTestId('sample-thor').click();
  await idle(page);
  await page.getByTestId('next').click();
  await expect(page.getByTestId('preview-big')).toBeVisible({ timeout: 30000 });
  await page.getByTestId('next').click();
  await page.getByTestId('anim').selectOption('fetch');
  await idle(page);
  await page.screenshot({ path: `${shots}/${tag}_9_thor.png`, fullPage: true });
  await page.getByTestId('next').click();
  await page.getByTestId('fmt-sheet').check();
  await expect(page.getByTestId('qa-summary')).toContainText('Todo en verde', { timeout: 60000 });
  const dl = page.waitForEvent('download');
  await page.getByTestId('export-go').click();
  expect((await dl).suggestedFilename()).toBe('thor_sheet.zip');
});

test('cambia a inglés', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByText('Upload image')).toBeVisible();
});

test('foto de busto: detecta el modo, la barba y arma el personaje', async ({ page }, info) => {
  test.setTimeout(120000);
  const tag = info.project.name;
  await page.goto('/');
  await page.getByTestId('sample-selfie').click();
  await idle(page);
  await expect(page.getByTestId('img-mode').getByRole('button', { name: 'Busto (foto o retrato)' })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: `${shots}/${tag}_10_busto.png`, fullPage: true });
  await page.getByTestId('next').click();
  await idle(page);
  await page.screenshot({ path: `${shots}/${tag}_11_busto_zonas.png`, fullPage: true });
  await page.getByTestId('step-animate').click();
  await expect(page.getByTestId('preview-big')).toBeVisible({ timeout: 30000 });
  await idle(page);
  await expect(page.getByTestId('qa').locator('td.error')).toHaveCount(0);
  await page.screenshot({ path: `${shots}/${tag}_12_busto_animar.png`, fullPage: true });
});

test('crear desde cero: avatar por piezas y animar', async ({ page }, info) => {
  test.setTimeout(180000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('from-scratch').click();
  // piezas dibujadas (LPC): 85 peinados con miniatura
  await expect(page.getByTestId('av-lpcHair').locator('button')).toHaveCount(85, { timeout: 30000 });
  await page.getByTestId('av-lpcHair-pigtails').click();
  await idle(page);
  await expect(page.getByTestId('av-lpcHair-pigtails')).toHaveAttribute('aria-pressed', 'true', { timeout: 30000 });
  await page.getByTestId('av-skin').locator('button').nth(4).click();
  await page.getByText('Lentes', { exact: true }).click();
  await expect(page.getByTestId('av-lpcGlasses').locator('button')).toHaveCount(8, { timeout: 30000 });
  await page.getByTestId('av-lpcGlasses-round').click();
  await idle(page);
  await expect(page.getByTestId('preview-big')).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: `${shots}/${tag}_19_avatar_lpc.png`, fullPage: true });
  // volumen: las piezas generadas siguen disponibles
  await page.getByTestId('av-kit').getByRole('button', { name: 'Volumen' }).click();
  await expect(page.getByTestId('av-hair').locator('button')).toHaveCount(13, { timeout: 30000 });
  await page.getByTestId('av-hair-colitas').click();
  await idle(page);
  await expect(page.getByTestId('preview-big')).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: `${shots}/${tag}_20_avatar.png`, fullPage: true });
  await page.getByTestId('step-animate').click();
  await idle(page);
  await expect(page.getByTestId('qa').locator('td.error')).toHaveCount(0);
  await page.screenshot({ path: `${shots}/${tag}_21_avatar_animar.png`, fullPage: true });
  expect(errors).toEqual([]);
});
