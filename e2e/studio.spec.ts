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
  await expect(page.getByTestId('from-scratch')).toHaveText('Create character');
});

test('foto: solo toma los colores y abre el creador', async ({ page }, info) => {
  test.setTimeout(120000);
  const tag = info.project.name;
  await page.goto('/');
  await page.getByTestId('photo-colors').setInputFiles('samples/selfie.png');
  await expect(page.getByTestId('av-lpcHair')).toBeVisible({ timeout: 60000 });
  await idle(page);
  await expect(page.getByTestId('preview-big')).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: `${shots}/${tag}_10_foto_colores.png`, fullPage: true });
});

test('crear desde cero: avatar por piezas y animar', async ({ page }, info) => {
  test.setTimeout(180000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('from-scratch').click();
  // piezas dibujadas (LPC): 86 peinados con miniatura
  await expect(page.getByTestId('av-lpcHair').locator('button')).toHaveCount(86, { timeout: 30000 });
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
  // isométrica: diagonal abajo a la derecha, sin errores de calidad
  await page.getByTestId('view').getByRole('button', { name: 'Diagonal ↘' }).click();
  await idle(page);
  await expect(page.getByTestId('qa').locator('td.error')).toHaveCount(0);
  await page.screenshot({ path: `${shots}/${tag}_22_isometrica.png`, fullPage: true });
  // exportar en 8 direcciones
  await page.getByTestId('step-export').click();
  await page.getByTestId('views-eight').click();
  await page.getByTestId('fmt-sheet').check();
  await expect(page.getByTestId('qa-summary')).toBeVisible({ timeout: 60000 });
  expect(errors).toEqual([]);
});

test('familia GG: avatares listos para abrir y modificar', async ({ page }, info) => {
  test.setTimeout(180000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByTestId('family').locator('canvas')).toHaveCount(10, { timeout: 60000 });
  await page.screenshot({ path: `${shots}/${tag}_25_familia.png`, fullPage: true });
  // Rick casual: abre en el creador con su peinado y lentes, y se puede cambiar
  await page.getByTestId('family-rick-casual').click();
  await expect(page.getByTestId('av-lpcHair-swept_back')).toHaveAttribute('aria-pressed', 'true', { timeout: 30000 });
  await page.getByTestId('av-skin').locator('button').nth(2).click();
  await idle(page);
  await expect(page.getByTestId('preview-big')).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: `${shots}/${tag}_26_familia_rick.png`, fullPage: true });
  // Sophie amazona: abre en el estilo con su arco
  await page.getByTestId('step-image').click();
  await page.getByTestId('family-sophie-rpg').click();
  await expect(page.getByTestId('rpg-weapon')).toHaveValue('bow', { timeout: 30000 });
  await page.getByTestId('step-animate').click();
  await idle(page);
  await expect(page.getByTestId('qa').locator('td.error')).toHaveCount(0);
  await page.screenshot({ path: `${shots}/${tag}_27_familia_sophie.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('Thor mascota: armadura por nivel, 8 direcciones y animaciones de RPG', async ({ page }, info) => {
  test.setTimeout(180000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('family-thor-armor').click();
  await expect(page.getByTestId('pet-armor')).toContainText('Égida de Thor', { timeout: 30000 });
  await page.getByTestId('barding-3').click();
  await expect(page.getByTestId('pet-armor')).toContainText('Cota del guardián');
  await idle(page);
  await expect(page.getByTestId('preview-big')).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: `${shots}/${tag}_38_thor.png`, fullPage: true });
  await page.getByTestId('step-animate').click();
  await page.getByTestId('pack').selectOption('pet');
  await page.getByTestId('anim').selectOption('howl');
  await page.getByTestId('view').getByRole('button', { name: 'Diagonal ↘' }).click();
  await idle(page);
  await expect(page.getByTestId('qa').locator('td.error')).toHaveCount(0);
  await page.screenshot({ path: `${shots}/${tag}_39_thor_aullido.png`, fullPage: true });
  await page.getByTestId('step-export').click();
  await page.getByTestId('views-eight').click();
  await expect(page.getByTestId('qa-summary')).toBeVisible({ timeout: 60000 });
  expect(errors).toEqual([]);
});

test('taller RPG: héroe con clase, enemigos, poderes y objetos', async ({ page }, info) => {
  test.setTimeout(180000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  // héroe: entra vestido de paladín, se cambia a hechicera y se anima en diagonal
  await page.getByTestId('rpg-hero').click();
  await expect(page.getByTestId('rpg-gear')).toBeVisible({ timeout: 30000 });
  await page.getByTestId('class-hechicera').click();
  await idle(page);
  await expect(page.getByTestId('rpg-weapon')).toHaveValue('staff');
  await page.getByTestId('step-animate').click();
  await page.getByTestId('pack').selectOption('skills');
  await page.getByTestId('anim').selectOption('cast');
  await page.getByTestId('view').getByRole('button', { name: 'Diagonal ↘' }).click();
  await idle(page);
  await expect(page.getByTestId('qa').locator('td.error')).toHaveCount(0);
  await page.screenshot({ path: `${shots}/${tag}_30_heroe_rpg.png`, fullPage: true });
  // enemigos
  await page.getByTestId('step-image').click();
  await page.getByTestId('rpg-enemies').click();
  await page.getByTestId('enemy-esqueleto').click();
  await idle(page);
  await expect(page.getByTestId('preview-big')).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('qa').locator('td.error')).toHaveCount(0);
  await page.screenshot({ path: `${shots}/${tag}_31_enemigo.png`, fullPage: true });
  // poderes: exportar
  await page.getByTestId('step-image').click();
  await page.getByTestId('rpg-fx').click();
  await page.getByTestId('fx-el-hielo').click();
  await page.getByTestId('fx-kind-nova').click();
  await expect(page.getByTestId('fx-preview')).toBeVisible();
  await page.screenshot({ path: `${shots}/${tag}_32_poderes.png`, fullPage: true });
  let dl = page.waitForEvent('download');
  await page.getByTestId('fx-export').click();
  expect((await dl).suggestedFilename()).toBe('poderes.zip');
  expect(errors).toEqual([]);
});

test('botín: legendarios, armas, armaduras que evolucionan, cofres y exportar', async ({ page }, info) => {
  test.setTimeout(180000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('rpg-items').click();
  // legendarios y set: el detalle con nombre y estadísticas
  await expect(page.getByTestId('loot-grid').locator('canvas').first()).toBeVisible({ timeout: 30000 });
  expect(await page.getByTestId('loot-grid').locator('canvas').count()).toBeGreaterThanOrEqual(40);
  await page.getByTestId('loot-juramento_de_rick').click();
  await expect(page.getByTestId('loot-name')).toHaveText('Juramento de Rick');
  await page.screenshot({ path: `${shots}/${tag}_33_botin_legendarios.png`, fullPage: true });
  let dl = page.waitForEvent('download');
  await page.getByTestId('loot-export').click();
  expect((await dl).suggestedFilename()).toBe('botin_legend.zip');
  // equipar: la legendaria va a la mano de Rick y la armadura sube de nivel
  await page.getByTestId('loot-hoja_del_vacio').click();
  await page.getByTestId('loot-equip').click();
  await expect(page.getByTestId('rpg-loot')).toContainText('Hoja del Vacío', { timeout: 30000 });
  await page.getByTestId('rpg-armor').getByRole('button', { name: 'Placas' }).click();
  await page.getByTestId('tier-5').click();
  await expect(page.getByTestId('rpg-tier')).toContainText('Égida Celestial');
  await idle(page);
  await expect(page.getByTestId('preview-big')).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: `${shots}/${tag}_37_botin_equipado.png`, fullPage: true });
  await page.getByTestId('step-image').click();
  await page.getByTestId('rpg-items').click();
  // armas raras al azar
  await page.getByTestId('loot-tab-weapons').click();
  await page.getByTestId('loot-grade').getByRole('button', { name: 'Raro' }).click();
  await page.getByTestId('loot-reroll').click();
  await expect(page.getByTestId('loot-grid').locator('canvas')).toHaveCount(36);
  await page.screenshot({ path: `${shots}/${tag}_34_botin_armas.png`, fullPage: true });
  // armaduras: 140 piezas
  await page.getByTestId('loot-tab-armor').click();
  await expect(page.getByTestId('loot-grid').locator('canvas')).toHaveCount(140, { timeout: 30000 });
  await page.screenshot({ path: `${shots}/${tag}_35_botin_armaduras.png`, fullPage: true });
  // cofres y oro
  await page.getByTestId('loot-tab-world').click();
  await expect(page.getByTestId('chest-legendario').locator('canvas')).toHaveCount(2);
  await page.screenshot({ path: `${shots}/${tag}_36_botin_mundo.png`, fullPage: true });
  dl = page.waitForEvent('download');
  await page.getByTestId('loot-export-world').click();
  expect((await dl).suggestedFilename()).toBe('botin_world.zip');
  expect(errors).toEqual([]);
});

test('movimiento premium: perfil, comparar, pausar y cuadro a cuadro', async ({ page }, info) => {
  test.setTimeout(180000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('family-rick-rpg').click();
  await page.getByTestId('step-animate').click();
  await idle(page);
  await expect(page.getByTestId('preview-big')).toBeVisible({ timeout: 30000 });
  await page.getByTestId('motion').getByRole('button', { name: 'Premium' }).click();
  await idle(page);
  // la caminata premium marca sus dos pasos en la línea de tiempo
  await expect(page.getByTestId('pb-timeline').locator('.ev-paso')).toHaveCount(2, { timeout: 30000 });
  await expect(page.getByTestId('qa').locator('td.error')).toHaveCount(0);
  await page.getByTestId('motion-compare').check();
  await expect(page.getByTestId('preview-compare')).toBeVisible({ timeout: 30000 });
  // pausa y cuadro a cuadro: el contador avanza de a uno
  await page.getByTestId('pb-toggle').click();
  const at = Number((await page.getByTestId('frame-count').textContent())!.split('/')[0]);
  await page.getByRole('button', { name: 'Cuadro siguiente' }).click();
  await expect(page.getByTestId('frame-count')).toHaveText(`${(at % 8) + 1}/8`);
  await page.getByTestId('pb-timeline').locator('button').first().click();
  await expect(page.getByTestId('event-flash')).toHaveText('Paso');
  await page.screenshot({ path: `${shots}/${tag}_40_premium_comparar.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('editor de poses: deshacer, rehacer y borrador que se recupera', async ({ page }, info) => {
  test.setTimeout(120000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const openEditor = async () => {
    await page.goto('/');
    await page.getByTestId('family-rick-rpg').click();
    await page.getByTestId('step-editor').click();
    await expect(page.getByTestId('editor-canvas')).toBeVisible({ timeout: 30000 });
  };
  await openEditor();
  const hand = page.getByTestId('joint-handNear');
  // la mano medida desde el canvas (los botones mueven la página)
  const handY = async () => Math.round((await hand.boundingBox())!.y - (await page.getByTestId('editor-canvas').boundingBox())!.y);
  const start = await handY();
  const drag = async () => {
    const b = (await hand.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + 30, b.y - 50, { steps: 6 });
    await page.mouse.up();
  };
  await expect(page.getByTestId('ed-undo')).toBeDisabled();
  await drag();
  const moved = await handY();
  expect(Math.abs(moved - start)).toBeGreaterThan(10);
  // un arrastre entero se deshace de una vez
  await page.getByTestId('ed-undo').click();
  await expect.poll(handY).toBe(start);
  await page.keyboard.press('Control+Shift+Z');
  await expect.poll(handY).toBe(moved);
  // sin guardar: al volver queda el borrador y se recupera
  await page.waitForTimeout(800);
  await openEditor();
  await expect(page.getByTestId('ed-draft')).toBeVisible();
  await page.getByTestId('ed-recover').click();
  await expect.poll(handY).toBe(moved);
  await page.screenshot({ path: `${shots}/${tag}_41_editor_borrador.png`, fullPage: true });
  // guardar borra el borrador
  await page.getByTestId('ed-save').click();
  await openEditor();
  await expect(page.getByTestId('ed-draft')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('atletismo: la garrocha sube sobre su sombra en la vista previa', async ({ page }, info) => {
  test.setTimeout(120000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('family-rick-casual').click();
  await page.getByTestId('step-animate').click();
  await idle(page);
  await page.getByTestId('motion').getByRole('button', { name: 'Premium' }).click();
  await page.getByTestId('pack').selectOption('athletics');
  await page.getByTestId('anim').selectOption('pole_vault');
  await idle(page);
  // el lienzo es más alto que ancho: el salto no cabe en la celda y se dibuja arriba
  await expect.poll(async () => { const b = (await page.getByTestId('preview-big').boundingBox())!; return b.height > b.width * 1.4; }, { timeout: 30000 }).toBe(true);
  await expect(page.getByTestId('pb-timeline').locator('.ev-despegue')).toHaveCount(1);
  await expect(page.getByTestId('qa').locator('td.error')).toHaveCount(0);
  await page.getByTestId('pb-toggle').click();
  await page.getByTestId('pb-timeline').locator('button').nth(6).click();
  await page.screenshot({ path: `${shots}/${tag}_42_garrocha.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('superhéroes: aparecen en el inicio y se abren listos para animar', async ({ page }, info) => {
  test.setTimeout(120000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByTestId('heroes').locator('canvas')).toHaveCount(6, { timeout: 60000 });
  await page.screenshot({ path: `${shots}/${tag}_43_heroes.png`, fullPage: true });
  await page.getByTestId('hero-blackpanther').click();
  await idle(page);
  await expect(page.getByTestId('preview-big')).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('qa').locator('td.error')).toHaveCount(0);
  // Hulk va en celda grande
  await page.getByTestId('step-image').click();
  await page.getByTestId('hero-hulk').click();
  await idle(page);
  await expect(page.getByTestId('qa').locator('td.error')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('ver datos y vestuario: cajas, manos y puntos encima del personaje, y cada variante de ropa', async ({ page }, info) => {
  test.setTimeout(180000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  // una ficha con vestuario por pack (el ejemplo de docs/ejemplos/nekketsu)
  await page.getByTestId('open-ficha').setInputFiles('docs/ejemplos/nekketsu/rick.ficha.json');
  await idle(page);
  await expect(page.getByTestId('preview-big')).toBeVisible({ timeout: 30000 });
  const ward = page.getByTestId('wardrobe');
  await expect(ward.getByRole('button')).toHaveText(['Ropa de la ficha', 'Calle', 'Bañador', 'Judogi', 'Camiseta']);
  const before = await page.getByTestId('preview-big').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await ward.getByRole('button', { name: 'Judogi' }).click();
  await idle(page);
  await expect(ward.getByRole('button', { name: 'Judogi' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.getByTestId('preview-big').evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(before);
  // ver datos: la leyenda y la caja del cuadro, en pixeles desde el pivote
  await page.getByTestId('pb-toggle').click();
  await page.getByTestId('show-data').click();
  await expect(page.getByTestId('show-data')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('data-legend')).toContainText('Manos');
  await expect(page.getByTestId('data-box')).toHaveText(/Caja: \[-?\d+, -\d+, \d+, \d+\]/);
  // un golpe de artes marciales: se va al cuadro del impacto, donde se dibuja el punto
  await page.getByTestId('pack').selectOption('martial');
  await page.getByTestId('anim').selectOption('jab');
  await idle(page);
  await page.getByTestId('pb-timeline').locator('button:has(.ev-impacto)').first().click();
  await expect(page.getByTestId('event-flash')).toHaveText('Golpe');
  await expect(page.getByTestId('data-box')).toBeVisible();
  await page.screenshot({ path: `${shots}/${tag}_50_ver_datos.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('pelea callejera: levantar con carga, arma en la mano y sus datos', async ({ page }, info) => {
  test.setTimeout(180000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('family-rick-rpg').click();
  await page.getByTestId('step-animate').click();
  await idle(page);
  await page.getByTestId('pack').selectOption('brawl');
  await page.getByTestId('anim').selectOption('lift');
  await idle(page);
  await expect(page.getByTestId('preview-big')).toBeVisible({ timeout: 30000 });
  // levantar: la carga se ve en "Ver datos"
  await page.getByTestId('pb-toggle').click();
  await page.getByTestId('show-data').click();
  await page.getByTestId('pb-timeline').locator('button').last().click();
  await expect(page.getByTestId('data-legend')).toContainText('Carga');
  await expect(page.getByTestId('data-legend')).toContainText('Cuerpo');
  // batazo: el arma en la mano se elige y cambia el dibujo
  await page.getByTestId('anim').selectOption('weapon_swing');
  await idle(page);
  await expect(page.getByTestId('held')).toHaveValue('tubo');
  const before = await page.getByTestId('preview-big').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.getByTestId('held').selectOption('escoba');
  await idle(page);
  await expect.poll(() => page.getByTestId('preview-big').evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(before);
  await expect(page.getByTestId('data-legend')).toContainText('Arma');
  await page.screenshot({ path: `${shots}/${tag}_60_pelea_callejera.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('equipos: gakuran, brazalete y letras en el pecho en Estilo, y el gigante abre en su celda', async ({ page }, info) => {
  test.setTimeout(180000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  // Kenji (Instituto Nekketsu): gakuran abierto con brazalete
  await page.getByTestId('open-ficha').setInputFiles('docs/ejemplos/nekketsu/fichas/kenji.ficha.json');
  await idle(page);
  await expect(page.getByTestId('preview-big')).toBeVisible({ timeout: 30000 });
  const before = await page.getByTestId('preview-big').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.getByTestId('step-style').click();
  const cut = page.getByTestId('jacket-cut');
  await expect(cut.getByRole('button', { name: /Gakuran/ })).toHaveAttribute('aria-pressed', 'true');
  await cut.getByRole('button', { name: 'Casual' }).click();
  await idle(page);
  await page.getByTestId('step-animate').click();
  await idle(page);
  await expect.poll(() => page.getByTestId('preview-big').evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(before);
  // Rick (Familia GG): "GG" en el pecho (Abrir ficha está en Inicio)
  await page.goto('/');
  await page.getByTestId('open-ficha').setInputFiles('docs/ejemplos/nekketsu/fichas/rick.ficha.json');
  await idle(page);
  await page.getByTestId('step-style').click();
  await expect(page.getByTestId('chest-text')).toHaveValue('GG');
  await page.getByTestId('chest-text').fill('NK');
  await expect(page.getByTestId('chest-text')).toHaveValue('NK');
  await page.screenshot({ path: `${shots}/${tag}_70_equipos_estilo.png`, fullPage: true });
  // Goro, el gigante: abre en celda 64
  await page.goto('/');
  await page.getByTestId('open-ficha').setInputFiles('docs/ejemplos/nekketsu/fichas/goro.ficha.json');
  await idle(page);
  await expect(page.getByTestId('cell-size').getByRole('button', { name: '64' })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('fuentes del juego: vietnamita en las tres fuentes y descarga', async ({ page }, info) => {
  test.setTimeout(120000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('tool-fonts').click();
  const ui = page.getByTestId('font-fuente_ui');
  await expect(ui).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('font-fuente_titulo')).toBeVisible();
  await expect(page.getByTestId('fonts-viet')).toContainText('ồ');
  const w0 = await ui.evaluate((c: HTMLCanvasElement) => c.width);
  await page.getByTestId('fonts-text').fill('Trời ơi');
  await expect.poll(() => ui.evaluate((c: HTMLCanvasElement) => c.width)).toBeLessThan(w0);
  const dl = page.waitForEvent('download');
  await page.getByTestId('fonts-export').click();
  expect((await dl).suggestedFilename()).toBe('fuentes.zip');
  await page.screenshot({ path: `${shots}/${tag}_80_fuentes.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('efectos del juego: el catálogo animado por grupo y la descarga', async ({ page }, info) => {
  test.setTimeout(120000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('tool-effects').click();
  const grid = page.getByTestId('effects-grid');
  await expect(grid.getByTestId('effect-chispa_golpe_pesado')).toBeVisible({ timeout: 30000 });
  await expect(grid.getByTestId('effect-estrellas_mareo')).toBeVisible();
  // la chispa se anima: el lienzo cambia entre una mirada y otra
  const canvas = grid.getByTestId('effect-chispa_golpe_pesado').locator('canvas');
  const snap = () => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const a = await snap();
  await expect.poll(snap, { timeout: 5000 }).not.toBe(a);
  // cada grupo filtra; todos son 64 (56 del lote F, 7 de la pelea y el rayo del cielo)
  await page.getByTestId('effects-groups').getByRole('button', { name: /Reacciones|Reactions/ }).click();
  await expect(grid.locator('figure')).toHaveCount(7);
  await expect(grid.getByTestId('effect-vena_enojo')).toBeVisible();
  await page.getByTestId('effects-groups').getByRole('button', { name: /Todos|All/ }).click();
  await expect(grid.locator('figure')).toHaveCount(64);
  await page.getByTestId('effects-groups').getByRole('button', { name: /Pantalla|Screen/ }).click();
  await expect(grid.getByTestId('effect-lineas_velocidad')).toBeVisible();
  await page.screenshot({ path: `${shots}/${tag}_81_efectos.png`, fullPage: true });
  const dl = page.waitForEvent('download');
  await page.getByTestId('effects-export').click();
  expect((await dl).suggestedFilename()).toBe('efectos.zip');
  expect(errors).toEqual([]);
});

test('interfaz del juego: logo desde el texto, caja de diálogo armada y descarga', async ({ page }, info) => {
  test.setTimeout(120000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('tool-interface').click();
  const logo = page.getByTestId('ui-logo');
  await expect(logo).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('ui-dialog-demo')).toBeVisible();
  await expect(page.getByTestId('ui-banner_meta')).toBeVisible();
  await expect(page.getByTestId('ui-control_especial')).toBeVisible();
  // otro texto, otro logo
  const before = await logo.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.getByTestId('ui-logo-text').fill('NEKKETSU OLYMPIC GG');
  await expect.poll(() => logo.evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(before);
  await page.screenshot({ path: `${shots}/${tag}_82_interfaz.png`, fullPage: true });
  const dl = page.waitForEvent('download');
  await page.getByTestId('ui-export').click();
  expect((await dl).suggestedFilename()).toBe('interfaz.zip');
  expect(errors).toEqual([]);
});

test('audio del juego: secciones, un sonido que suena y la voz en blips', async ({ page }, info) => {
  test.setTimeout(120000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('tool-audio').click();
  await expect(page.getByTestId('sound-marcha_nekketsu')).toBeVisible({ timeout: 30000 });
  await page.getByTestId('audio-sections').getByRole('button', { name: /Efectos|Effects/ }).click();
  await expect(page.getByTestId('sound-silbato')).toBeVisible();
  await expect(page.getByTestId('sound-publico_grito')).toBeVisible();
  await page.getByTestId('sound-silbato').click();
  await expect(page.getByTestId('sound-silbato')).toHaveClass(/on/);
  await page.getByTestId('voice-say').click();
  await expect(page.getByTestId('audio-stop')).toBeVisible();
  await page.screenshot({ path: `${shots}/${tag}_83_audio.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('escena: el layout pintado, el personaje corriendo, la colisión y las 9 pruebas', async ({ page }, info) => {
  test.setTimeout(120000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('tool-escena').click();
  const canvas = page.getByTestId('scene-canvas');
  await expect(canvas).toBeVisible({ timeout: 60000 });
  // las 9 pruebas del pedido, todas en verde
  const tests = page.getByTestId('scene-tests');
  await expect(tests.locator('tr')).toHaveCount(9);
  await expect(tests.locator('tr.ok')).toHaveCount(9);
  await expect(page.getByTestId('scene-name')).toContainText('3840');
  // corre solo: el lienzo cambia
  const snap = () => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const a = await snap();
  await expect.poll(snap, { timeout: 5000 }).not.toBe(a);
  await page.screenshot({ path: `${shots}/${tag}_85_escena.png`, fullPage: true });
  // la colisión del layout encima y el aguacero
  await page.getByTestId('scene-collision').check();
  await page.getByTestId('scene-weather').getByRole('button', { name: /Aguacero|Downpour/ }).click();
  await page.screenshot({ path: `${shots}/${tag}_86_escena_colision.png`, fullPage: true });
  // un layout con errores lo dice claro y no deja descargar
  await page.getByTestId('scene-file').setInputFiles({ name: 'malo.layout.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ id: 'malo', pais: 'vietnam' })) });
  await expect(page.getByTestId('scene-errors')).toContainText(/largo/, { timeout: 20000 });
  await expect(page.getByTestId('scene-export')).toBeDisabled();
  expect(errors).toEqual([]);
});
