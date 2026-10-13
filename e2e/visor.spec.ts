import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';

/**
 * El visor del kit lee el kit a medida de ejemplo publicado junto a la página (dist/kit_nekketsu, lo arma
 * `npm run build:sitio`). Si el build no lo trae, la prueba se salta y lo dice.
 */

const shots = 'out/screens';
mkdirSync(shots, { recursive: true });

type Hook = { ready: boolean; error: string; char: string; pack: string; anim: string; frame: number; playing: boolean; rows: number; drawn: number };
const hook = (page: Page) => page.evaluate(() => (window as unknown as { __visor: Hook }).__visor);
/** Pixeles opacos del lienzo de una fila: que el sprite se dibujó de verdad. */
const opaque = (page: Page, fila: string) => page.evaluate((f) => {
  const c = document.querySelector<HTMLCanvasElement>(`canvas[data-fila="${f}"]`)!;
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
  return { n, w: c.width };
}, fila);

test('visor del kit: atletas, packs y animaciones con sus datos dibujados', async ({ page, isMobile }, info) => {
  test.skip(!existsSync('dist/kit_nekketsu/manifest.json'), 'el build no trae el kit a medida (npm run build:sitio)');
  test.setTimeout(120000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/visor.html');
  await page.waitForFunction(() => (window as unknown as { __visor?: Hook }).__visor?.ready, null, { timeout: 60000 });

  // los seis equipos y Thor, agrupados en el orden de equipos.json: arranca con el primero de la Familia GG
  const sel = page.getByTestId('visor-char');
  await expect(sel.locator('optgroup')).toHaveCount(7);
  // 24 atletas, Thor, los 5 animales de la calle (lote C7) y el gallo y la paloma (lote C7b)
  await expect(sel.locator('option')).toHaveCount(32);
  await expect(sel.locator('optgroup').first()).toHaveAttribute('label', 'Familia GG');
  await expect(sel.locator('optgroup').last().locator('option')).toHaveText(['Thor', 'Canelo', 'Negrito', 'Manchas', 'Mango', 'Sombra', 'Gallo', 'Paloma']);
  let h = await hook(page);
  expect(h).toMatchObject({ char: 'rick', rows: 5 });
  expect(h.drawn).toBe(5);

  // Rick, pack pelea, carry_walk: trae carga y lo dice el panel
  await sel.selectOption('rick');
  await page.getByTestId('visor-packs').getByRole('tab', { name: /pelea/ }).click();
  await page.getByTestId('visor-board').getByRole('button', { name: 'carry_walk' }).click();
  await expect.poll(async () => (await hook(page)).anim).toBe('carry_walk');
  await expect(page.getByTestId('visor-toggles').locator('input[data-o="carga"]')).toBeChecked();
  await expect(page.getByTestId('visor-stats')).toContainText('carga');
  // zoom x3 en la computadora, x2 en el teléfono
  const z = +(await page.locator('#vk-zoom').inputValue());
  expect(z).toBe(isMobile ? 2 : 3);
  const right = await opaque(page, 'right');
  expect(right.w).toBe(48 * z);
  expect(right.n).toBeGreaterThan(40 * z * z);

  // cuadro a cuadro
  await page.getByTestId('visor-play').click();
  h = await hook(page);
  expect(h.playing).toBe(false);
  const f0 = h.frame;
  await page.getByRole('button', { name: /Cuadro siguiente|Next frame/ }).click();
  expect((await hook(page)).frame).toBe((f0 + 1) % 8);
  await page.screenshot({ path: `${shots}/${tag}_visor_carga.png`, fullPage: true });

  // armas: el arma se compone en la mano desde el atlas de objetos
  await page.getByTestId('visor-packs').getByRole('tab', { name: /armas/ }).click();
  await page.getByTestId('visor-board').getByRole('button', { name: 'weapon_swing', exact: true }).click();
  await expect(page.getByTestId('visor-weapon')).toBeVisible();
  await page.getByTestId('visor-weapon').selectOption('');
  const sin = await opaque(page, 'right');
  await page.getByTestId('visor-weapon').selectOption('paraguas');
  const con = await opaque(page, 'right');
  expect(con.n).toBeGreaterThan(sin.n);
  await page.screenshot({ path: `${shots}/${tag}_visor_arma.png`, fullPage: true });

  // Goro, el gigante: su celda es de 64
  await sel.selectOption('goro');
  await expect.poll(async () => (await hook(page)).char).toBe('goro');
  expect((await opaque(page, 'right')).w).toBe(64 * z);

  // Thor: un solo pack, sin pestañas
  await sel.selectOption('thor');
  await expect.poll(async () => (await hook(page)).pack).toBe('animal');
  await expect(page.getByTestId('visor-packs')).toBeHidden();
  expect((await hook(page)).drawn).toBe(5);

  // el gallo: una tira de lado, una sola fila, celda de 32, con el canto
  await sel.selectOption('gallo');
  await expect.poll(async () => (await hook(page)).pack).toBe('ave');
  await page.getByTestId('visor-board').getByRole('button', { name: 'cantar', exact: true }).click();
  await expect.poll(async () => (await hook(page)).anim).toBe('cantar');
  expect((await hook(page)).rows).toBe(1);
  const gallo = await opaque(page, 'lado');
  expect(gallo.w).toBe(32 * z);
  expect(gallo.n).toBeGreaterThan(150 * z * z);
  await page.screenshot({ path: `${shots}/${tag}_visor_gallo.png`, fullPage: true });

  // el enlace guarda dónde estabas
  await sel.selectOption('thor');
  await expect.poll(async () => (await hook(page)).char).toBe('thor');
  expect(page.url()).toContain('p=thor');
  expect(errors).toEqual([]);
});

test('visor del kit: sin kit lo dice claro', async ({ page }) => {
  await page.goto('/visor.html?kit=no_existe/');
  await page.waitForFunction(() => !!(window as unknown as { __visor?: Hook }).__visor?.error);
  await expect(page.locator('#vk-loading')).toContainText(/npm run kit-a-medida/);
});
