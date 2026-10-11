import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';

/**
 * La arena juega con el kit deportivo publicado junto a la página (dist/kit_deportes). Si el build no lo trae
 * (se arma con `npm run build:sitio`), la prueba se salta y lo dice.
 */

const shots = 'out/screens';
mkdirSync(shots, { recursive: true });

type ArenaState = { sport: string; anim: string; busy: boolean; u: number; counts: Record<string, number>; score: number[]; hp: number[]; ball: boolean };

const state = (page: Page) => page.evaluate((): ArenaState => {
  const g = (window as unknown as { __arena: any }).__arena;
  return { sport: g.sport, anim: g.player.anim, busy: g.player.busy, u: (g.player.pos.x - g.player.pos.y) / Math.SQRT2, counts: { ...g.counts }, score: [...g.score], hp: [...g.hp], ball: !!g.ball };
});

async function ready(page: Page, sport: string) {
  await page.waitForFunction((s) => {
    const g = (window as unknown as { __arena?: { sport: string } }).__arena;
    return g?.sport === s && (document.getElementById('ar-loading') as HTMLElement).hidden;
  }, sport, { timeout: 60000 });
}

test('arena: el kit juega con pasos, saltos, clavado, saque y golpes', async ({ page, isMobile }, info) => {
  test.skip(!existsSync('dist/kit_deportes/manifest.json'), 'el build no trae el kit (npm run build:sitio)');
  test.setTimeout(180000);
  const tag = info.project.name;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/arena.html');
  await ready(page, 'atletismo');
  await expect(page.locator('#ar-view')).toBeVisible();

  // atletismo: correr mueve al atleta y avisa los pasos; el salto largo avanza, despega y aterriza
  if (isMobile) {
    const box = (await page.locator('#ar-stick').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2, { steps: 4 });
    await page.waitForTimeout(1200);
    await page.mouse.up();
  } else {
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1200);
    await page.keyboard.up('ArrowRight');
  }
  let s = await state(page);
  expect(s.u).toBeGreaterThan(-270);
  expect(s.counts.paso).toBeGreaterThan(1);
  const u0 = s.u;
  await page.getByRole('button', { name: /Salto largo|Long jump/ }).click();
  await page.waitForTimeout(1500);
  s = await state(page);
  expect(s.counts.despegue).toBeGreaterThanOrEqual(1);
  expect(s.counts.aterriza).toBeGreaterThanOrEqual(1);
  expect(s.u - u0).toBeGreaterThan(8);
  await page.screenshot({ path: `${shots}/${tag}_arena_atletismo.png` });

  // natación: el clavado entra al agua
  await page.locator('[data-s="natacion"]').click();
  await ready(page, 'natacion');
  await page.getByRole('button', { name: /Clavado|Dive/ }).click();
  await page.waitForTimeout(1300);
  s = await state(page);
  expect(s.counts.impacto).toBeGreaterThanOrEqual(1);
  await page.screenshot({ path: `${shots}/${tag}_arena_natacion.png` });
  // recién entrado, sigue pegado al borde: sale del agua y queda parado afuera
  await page.getByRole('button', { name: /Salir del agua|Climb out/ }).click();
  await page.waitForTimeout(1600);
  const fuera = await page.evaluate(() => { const g = (window as unknown as { __arena: any }).__arena; return { onBlock: g.onBlock, inWater: g.player.inWater, anim: g.player.anim }; });
  expect(fuera).toEqual({ onBlock: true, inWater: false, anim: 'idle' });

  // vóley: el saque se lanza (suelta) y se pega (impacto); la pelota queda en juego
  await page.locator('[data-s="voley"]').click();
  await ready(page, 'voley');
  await page.getByRole('button', { name: /Saque|Serve/ }).click();
  await page.waitForTimeout(1100);
  s = await state(page);
  expect(s.counts.suelta).toBe(1);
  expect(s.counts.impacto).toBeGreaterThanOrEqual(1);
  await page.waitForTimeout(4000);
  s = await state(page);
  // el rival la devolvió o alguien ganó el punto
  expect(s.counts.impacto >= 2 || s.score[0] + s.score[1] >= 1).toBe(true);
  await page.screenshot({ path: `${shots}/${tag}_arena_voley.png` });

  // tenis: la cámara sigue al jugador; él siempre se ve entero, también en el teléfono
  await page.locator('[data-s="tenis"]').click();
  await ready(page, 'tenis');
  await page.waitForTimeout(1500);
  const inView = await page.evaluate(() => {
    const g = (window as unknown as { __arena: any }).__arena;
    const v = (window as unknown as { __arenaView: { x: number; y: number; w: number; h: number } }).__arenaView;
    return [g.player].map((a: any) => {
      const sx = a.pos.x - a.pos.y, sy = (a.pos.x + a.pos.y) / 2;
      // el sprite: medio ancho de celda a cada lado y una celda hacia arriba desde los pies
      return sx - 20 >= v.x && sx + 20 <= v.x + v.w && sy - 44 >= v.y && sy + 2 <= v.y + v.h;
    });
  });
  expect(inView).toEqual([true]);
  // y de cerca: el atleta se ve tan grande como en vóley (el zoom no se aleja por la cancha)
  const close = await page.evaluate(() => (window as unknown as { __arenaView: { w: number } }).__arenaView.w);
  if (isMobile) expect(close).toBeLessThan(240);
  await page.getByRole('button', { name: /Saque|Serve/ }).click();
  await page.waitForTimeout(4500);
  s = await state(page);
  expect(s.counts.impacto >= 2 || s.score[0] + s.score[1] >= 1).toBe(true);
  await page.screenshot({ path: `${shots}/${tag}_arena_tenis.png` });

  // pelea: los golpes llegan y bajan la vida de alguno
  await page.locator('[data-s="pelea"]').click();
  await ready(page, 'pelea');
  for (let i = 0; i < 10; i++) {
    await page.getByRole('button', { name: /^(\d)?\s*(Directo|Cross)$/ }).click();
    await page.waitForTimeout(450);
  }
  s = await state(page);
  expect(s.hp[0] + s.hp[1]).toBeLessThan(200);
  await page.screenshot({ path: `${shots}/${tag}_arena_pelea.png` });

  expect(errors).toEqual([]);
});
