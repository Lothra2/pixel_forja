/**
 * Láminas de revisión del Mundo 5 (La Ciudad Dormida, encargo F12 de GG Abyss) en docs/entregas/:
 *   npx tsx scripts/lamina-mundo5.ts [mapa|estatuas|objetos|enemigos|jefe|ladrona|pendientes|todo]
 *
 * - mundo5_mapa.png: el mapa entero chiquito, con las entidades.
 * - mundo5_postales.png: una postal por zona con la oscuridad de la zona y las luces como se ven en el juego (el farol
 *   de plaza del barrio prendido, la heroína con un poquito de luz propia, las lámparas y la cajita).
 * - mundo5_estatuas.png: cada ciudadano dormido, despertando y despierto, lado a lado.
 * - mundo5_objetos.png: los objetos del encargo.
 * - mundo5_enemigos.png: los enemigos y el Relojero al lado de la heroína.
 * - mundo5_rey.png: el Rey de Piedra al lado de la heroína, con la luz de la corona.
 * - mundo5_ladrona.png: la Ladrona robando un farol (el hilo de luz hasta el farolito) y el portal plata.
 * - mundo5_iconos.png: los íconos de prender y de las chispas a 40 y a 80.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { createRaster, blit, type Raster } from '../src/engine/core/raster.ts';
import { encodePng, decodePng } from '../src/engine/export/png.ts';
import { over } from '../src/engine/loot/canvas.ts';
import { drawShadow } from '../src/engine/world/premium/shadow.ts';

const what = process.argv[2] ?? 'todo';
const OUT = 'docs/entregas';
mkdirSync(OUT, { recursive: true });
const save = (name: string, r: Raster) => { writeFileSync(`${OUT}/${name}`, encodePng(r)); console.log(`  ${OUT}/${name} ${r.w}x${r.h}`); };
const up = (r: Raster, k: number) => { const o = createRaster(r.w * k, r.h * k); for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) { const s = ((y / k | 0) * r.w + (x / k | 0)) * 4; o.data.set(r.data.subarray(s, s + 4), (y * o.w + x) * 4); } return o; };
const fill = (r: Raster, c: number[]) => { for (let i = 0; i < r.w * r.h; i++) r.data.set([...c, 255], i * 4); return r; };
const down = (r: Raster, k: number) => { const o = createRaster(Math.floor(r.w / k), Math.floor(r.h / k)); for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) for (let c = 0; c < 4; c++) { let v = 0; for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) v += r.data[((y * k + j) * r.w + x * k + i) * 4 + c]; o.data[(y * o.w + x) * 4 + c] = v / (k * k); } return o; };
/** piso de piedra gris azulada (para que se lea lo oscuro) */
const floor = (w: number, h: number) => { const r = createRaster(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = ((x >> 3) + (y >> 3)) % 2 ? [52, 62, 80] : [44, 53, 70]; r.data.set([...v, 255], (y * w + x) * 4); } return r; };
const bossCache = () => { const cd = '.cache/jefes'; mkdirSync(cd, { recursive: true }); return { get: (k: string) => (existsSync(`${cd}/${k}.png`) ? decodePng(new Uint8Array(readFileSync(`${cd}/${k}.png`))) : null), set: (k: string, r: Raster) => writeFileSync(`${cd}/${k}.png`, encodePng(r)) }; };

type Light = { x: number; y: number; r: number; c: string; k: number };
/** La postal como se ve en el juego: la oscuridad de la zona y las luces que hay a la vista. */
function litPostal(img: Raster, zones: { x: number; y: number; w: number; h: number; props: Record<string, unknown> }[], cx: number, cy: number, lights: Light[], x0 = Math.max(0, Math.round(cx - img.w / 2)), y0 = Math.max(0, Math.round(cy - img.h / 2))) {
  const W = img.w, H = img.h;
  const z = zones.find((q) => cx >= q.x && cx < q.x + q.w && cy >= q.y && cy < q.y + q.h);
  const dark = Number(z?.props.oscuridad ?? 0.85) * 0.88;
  const out = createRaster(W, H);
  const cols = lights.map((l) => [parseInt(l.c.slice(1, 3), 16), parseInt(l.c.slice(3, 5), 16), parseInt(l.c.slice(5, 7), 16)]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    let L = 0, lr = 0, lg = 0, lb = 0;
    lights.forEach((l, j) => {
      const d = Math.hypot(x + x0 - l.x, (y + y0 - l.y) * 1.15) / l.r;
      if (d >= 1) return;
      const k = (1 - d) ** 1.6 * l.k;
      L = Math.max(L, k);
      lr += cols[j][0] * k * 0.45; lg += cols[j][1] * k * 0.45; lb += cols[j][2] * k * 0.45;
    });
    const keep = 1 - dark + dark * Math.min(1, L * 1.2);
    out.data[i] = Math.min(255, img.data[i] * keep + 6 * dark + lr * (img.data[i] / 255 + 0.25));
    out.data[i + 1] = Math.min(255, img.data[i + 1] * keep + 6 * dark + lg * (img.data[i + 1] / 255 + 0.25));
    out.data[i + 2] = Math.min(255, img.data[i + 2] * keep + 12 * dark + lb * (img.data[i + 2] / 255 + 0.25));
    out.data[i + 3] = 255;
  }
  return out;
}

async function mapa() {
  const { ciudadMap } = await import('../src/engine/world/ciudadMap.ts');
  const { renderBigMap, cropView } = await import('../src/engine/world/bosqueMap.ts');
  const { renderClip } = await import('../src/engine/render/clip.ts');
  const { familyFicha } = await import('../src/engine/rpg/family.ts');
  const t0 = Date.now();
  const m = ciudadMap();
  console.log(`  mapa en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  save('mundo5_mapa.png', down(renderBigMap(m, { entities: true }), 4));
  // las postales: el farol de plaza del barrio prendido (como lo deja la heroína), las lámparas del trono prendidas
  // en la sala, y la heroína en el centro con su lucecita
  const byName = new Map(m.objects.map((o) => [o.name, o]));
  const hero = renderClip(familyFicha('sophie', true), 48, 'idle', 'se', { props: true }).frames[0];
  const tiles: Raster[] = [];
  for (const p of m.postales) {
    const swap = (s: string) => (s === 'farol_plaza_apagado' ? 'farol_plaza_prendido' : s === 'lampara_trono_apagada' && p.nombre === 'palacio_dormido' ? 'lampara_trono_prendida' : s);
    const decos = m.decos.map((d) => (Math.abs(d.x - p.x) < 700 && Math.abs(d.y - p.y) < 420 ? { ...d, sprite: swap(d.sprite) } : d));
    const full = renderBigMap({ ...m, decos });
    const img = cropView(full, p.x, p.y);
    const x0 = Math.max(0, Math.min(full.w - 960, Math.round(p.x - 480))), y0 = Math.max(0, Math.min(full.h - 540, Math.round(p.y - 270)));
    // la heroína parada en el centro
    over(img, hero, Math.round(p.x - x0 - 24), Math.round(p.y - y0 - 46 + 60));
    const lights: Light[] = [{ x: p.x, y: p.y + 40, r: 120, c: '#ffe8c0', k: 0.6 }];
    for (const d of decos) { const o = byName.get(d.sprite); if (o?.light && Math.abs(d.x - p.x) < 800 && Math.abs(d.y - p.y) < 500) lights.push({ x: d.x, y: d.y - (o.light.dy ?? 0), r: Math.min(o.light.radius, 360), c: o.light.color, k: 1 }); }
    tiles.push(litPostal(img, m.zones, p.x, p.y, lights, x0, y0));
  }
  const g = createRaster(960 * 2, 540 * 4);
  tiles.forEach((t, i) => blit(g, t, (i % 2) * 960, Math.floor(i / 2) * 540));
  save('mundo5_postales.png', g);
  // los objetos del encargo
  const names = ['farol_plaza_apagado', 'farol_plaza_prendido', 'farol_plaza_robado', 'chispa_luz', 'casa_ciudad_0', 'casa_ciudad_3', 'casa_ciudad_7', 'fuente_plaza', 'torre_reloj', 'trono_rey', 'lampara_trono_apagada', 'lampara_trono_prendida', 'cajita_musica', 'seto_piedra_0', 'seto_piedra_2', 'flor_piedra_0', 'flor_piedra_2', 'puerta_ciudad', 'puesto_dormido_0', 'farol_puente_1', 'columna_palacio_0', 'balcon_palacio', 'banderines_rotos_0', 'arco_calle_0', 'lampara_colgante_1', 'fondo_ciudad_lejos_0', 'mural_5', 'figura_ladrona', 'portal_plata', 'aljibe', 'carretilla_pan', 'banco_piedra'];
  const cols = 8, cw = 200, chh = 300;
  const r = fill(createRaster(cols * cw, Math.ceil(names.length / cols) * chh), [16, 18, 26]);
  names.forEach((n, i) => {
    const o = byName.get(n)!;
    const awake = o.anims.despierta ?? o.anims.corre ?? o.anims.andando;
    const fr0 = (o.anims.idle ?? o.anims.girar ?? Object.values(o.anims)[0]).frames[0];
    const both = awake && o.w * 2 + 8 <= cw - 8 ? [fr0, awake.frames[0]] : [fr0];
    const tw = Math.min(cw - 8, Math.max(o.w * both.length + 4 * (both.length - 1), 64)), th = Math.min(chh - 8, o.h + 8);
    const t = floor(tw, th);
    both.forEach((fr, j) => { const ox = j * (o.w + 4) + Math.round((tw - o.w * both.length - 4 * (both.length - 1)) / 2), oy = Math.max(0, t.h - o.h - 4); if (o.shadow) drawShadow(t, o.shadow, ox, oy); over(t, fr, ox, oy); });
    blit(r, t, (i % cols) * cw + 4, Math.floor(i / cols) * chh + 4);
  });
  save('mundo5_objetos.png', r);
}

async function estatuas() {
  const { ESTATUAS, statueAnims } = await import('../src/engine/world/ciudadEstatuas.ts');
  const rows = ESTATUAS.map((s) => { const a = statueAnims(s); return [a.dormida, ...a.despertar.filter((_, i) => i % 2 === 1), a.despierta[0], a.despierta[2]]; });
  const n = rows[0].length;
  const r = floor(48 * n + 16, 64 * rows.length);
  rows.forEach((row, j) => row.forEach((f, i) => over(r, f, i * 48 + (i > 0 ? 8 : 0) + (i > n - 3 ? 8 : 0), j * 64)));
  save('mundo5_estatuas.png', up(r, 2));
}

async function enemigos(conJefe: boolean) {
  const { renderBossSheets } = await import('../src/engine/boss/sheet.ts');
  const { renderClip } = await import('../src/engine/render/clip.ts');
  const { familyFicha } = await import('../src/engine/rpg/family.ts');
  const ciudad = await import('../src/engine/boss/ciudad.ts');
  const hero = renderClip(familyFicha('sophie', true), 48, 'idle', 'se', { props: true }).frames[0];
  const specs = [ciudad.SONAMBULO_SPEC, ciudad.GARGOLA_SPEC, ciudad.DUENDE_SPEC, ciudad.RELOJERO_SPEC];
  const rows: { cell: number; pivot: [number, number]; frames: Raster[] }[] = [];
  for (const s of specs) {
    const { clips, pivot } = renderBossSheets(s, bossCache());
    const pickF = (c: (typeof clips)[number]) => { const n = c.def.frames; return c.def.name === 'die' ? [Math.floor(n * 0.45), n - 1] : c.def.windup ? [c.def.windup[1], Math.min(n - 1, c.def.windup[1] + 2)] : [0]; };
    rows.push({ cell: s.cell, pivot, frames: clips.flatMap((c) => pickF(c).map((f) => c.frames[7][f])) });
    console.log(`  ${s.id}: ${clips.map((c) => `${c.def.name} ${c.def.frames}`).join(', ')}`);
  }
  const W = Math.max(...rows.map((q) => 60 + q.frames.length * q.cell)), H = rows.reduce((a, q) => a + q.cell + 8, 0);
  const r = floor(W, H);
  let y = 0;
  for (const q of rows) {
    over(r, hero, 4, y + q.pivot[1] - 46);
    q.frames.forEach((f, i) => over(r, f, 56 + i * q.cell, y));
    y += q.cell + 8;
  }
  save(conJefe ? 'mundo5_rey.png' : 'mundo5_enemigos.png', up(r, conJefe ? 1 : 2));
}

async function ladrona() {
  const { thiefFigure } = await import('../src/engine/world/ciudadObjectsB.ts');
  const { ciudadObjectsA } = await import('../src/engine/world/ciudadObjects.ts');
  const { premiumPortal } = await import('../src/engine/world/portales.ts');
  const L = thiefFigure(), A = new Map(ciudadObjectsA().map((o) => [o.name, o]));
  const robado = A.get('farol_plaza_robado')!.anims.idle.frames, prendido = A.get('farol_plaza_prendido')!.anims.idle.frames;
  // ocho cuadros: el farol prendido, la Ladrona levanta el farolito y la luz se va en un hilo hasta ahí
  const cw = 160, chh = 160, r = createRaster(cw * 8, chh * 2 + 140);
  fill(r, [14, 16, 24]);
  for (let f = 0; f < 8; f++) {
    const t = floor(cw, chh), fa = f < 2 ? prendido[f] : robado[Math.min(robado.length - 1, f - 1)];
    over(t, fa, 16, chh - 132);
    const fr = L.objeto.anims.robar.frames[f], [lx, ly] = L.farolito.robar[f];
    const ax = 110, ay = chh - 8;
    over(t, fr, ax - 24, ay - 60);
    // el hilo de luz del farol de plaza al farolito (lo dibuja el juego)
    if (f >= 2) { const sx = 40, sy = chh - 8 - 97, ex = ax + lx, ey = ay + ly; for (let k = 0; k <= 40; k++) { const u = k / 40, x = sx + (ex - sx) * u, y = sy + (ey - sy) * u - Math.sin(u * Math.PI) * 18; const i = (Math.round(y) * t.w + Math.round(x)) * 4; t.data.set([255, 216, 144, 255], i); } }
    blit(r, t, f * cw, 0);
  }
  // irse y el portal plata
  L.objeto.anims.irse.frames.forEach((fr, f) => { const t = floor(cw, chh); over(t, fr, 56, chh - 70); blit(r, t, f * cw, chh); });
  const p = premiumPortal('plata');
  [p.anims.girar.frames[0], p.anims.girar.frames[6], p.anims.abrir.frames[3], p.anims.abrir.frames[6], p.anims.cerrar.frames[2], p.anims.apagado.frames[0], p.anims.arco.frames[0], p.anims.remolino.frames[0]].forEach((fr, i) => { const t = floor(cw, 136); if (p.shadow && i < 7) drawShadow(t, p.shadow, 32, 4); over(t, fr, 32, 4); blit(r, t, i * cw, chh * 2 + 2); });
  save('mundo5_ladrona.png', r);
}

const all = what === 'todo';
if (all || what === 'mapa') await mapa();
if (all || what === 'estatuas') await estatuas();
if (all || what === 'enemigos') await enemigos(false);
if (all || what === 'ladrona') await ladrona();
