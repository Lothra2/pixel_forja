/**
 * Láminas de revisión del Mundo 6 (La Fragua de las Luces, encargo F12 de GG Abyss) en docs/entregas/:
 *   npx tsx scripts/lamina-mundo6.ts [mapa|jaulas|objetos|enemigos|jefe|puerta|iconos|todo]
 *
 * - mundo6_mapa.png: el mapa entero chiquito, con las jaulas (puntos de su color) y las grietas (rectángulos naranjas).
 * - mundo6_postales.png: una postal por zona con la oscuridad de la zona y las luces como se ven en el juego (la
 *   lava alumbra sus orillas, los braseros, las fuentes frías, las jaulas y la heroína con un poquito de luz propia).
 *   Las jaulas y las grietas las dibuja el juego: acá van dibujadas como quedarían (las grietas en aviso o al rojo).
 * - mundo6_jaulas.png: las cinco jaulas cerradas, abriéndose, vacías y su luz libre, lado a lado. Y las grietas.
 * - mundo6_objetos.png: los objetos del encargo en estantes, con su versión apagada al lado.
 * - mundo6_enemigos.png y mundo6_dragona.png: al lado de la heroína.
 * - mundo6_puerta.png: la Puerta Negra, la Ladrona cargando jaulas y el portal brasa.
 * - mundo6_iconos.png: los íconos nuevos a 40 y a 80.
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
/** piso de roca volcánica (para que se lea lo oscuro) */
const floor = (w: number, h: number) => { const r = createRaster(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = ((x >> 3) + (y >> 3)) % 2 ? [56, 44, 40] : [46, 36, 33]; r.data.set([...v, 255], (y * w + x) * 4); } return r; };
const bossCache = () => { const cd = '.cache/jefes'; mkdirSync(cd, { recursive: true }); return { get: (k: string) => (existsSync(`${cd}/${k}.png`) ? decodePng(new Uint8Array(readFileSync(`${cd}/${k}.png`))) : null), set: (k: string, r: Raster) => writeFileSync(`${cd}/${k}.png`, encodePng(r)) }; };

type Light = { x: number; y: number; r: number; c: string; k: number };
/** La postal como se ve en el juego: la oscuridad de la zona y las luces que hay a la vista. */
function litPostal(img: Raster, zones: { x: number; y: number; w: number; h: number; props: Record<string, unknown> }[], cx: number, cy: number, lights: Light[], x0: number, y0: number, emisivo?: (x: number, y: number) => boolean) {
  const W = img.w, H = img.h;
  const z = zones.find((q) => cx >= q.x && cx < q.x + q.w && cy >= q.y && cy < q.y + q.h);
  const dark = Number(z?.props.oscuridad ?? 0.88) * 0.86;
  const out = createRaster(W, H);
  const cols = lights.map((l) => [parseInt(l.c.slice(1, 3), 16), parseInt(l.c.slice(3, 5), 16), parseInt(l.c.slice(5, 7), 16)]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    let L = 0, lr = 0, lg = 0, lb = 0;
    for (let j = 0; j < lights.length; j++) {
      const l = lights[j], dx = x + x0 - l.x, dy = (y + y0 - l.y) * 1.15;
      if (Math.abs(dx) > l.r || Math.abs(dy) > l.r) continue;
      const d = Math.hypot(dx, dy) / l.r;
      if (d >= 1) continue;
      const k = (1 - d) ** 1.6 * l.k;
      L = Math.max(L, k);
      lr += cols[j][0] * k * 0.4; lg += cols[j][1] * k * 0.4; lb += cols[j][2] * k * 0.4;
    }
    lr = Math.min(lr, 90); lg = Math.min(lg, 60); lb = Math.min(lb, 70);
    // la lava brilla sola: no la tiñen las luces ni la oscuridad
    if (emisivo?.(x + x0, y + y0)) { out.data.set([img.data[i], img.data[i + 1], img.data[i + 2], 255], i); continue; }
    const keep = 1 - dark + dark * Math.min(1, L * 1.2);
    // lo que brilla solo (lava, fuego, luces) no se oscurece
    const self = img.data[i] > 230 && img.data[i + 1] > 90 ? 1 : 0;
    const kk = self ? 1 : keep;
    out.data[i] = Math.min(255, img.data[i] * kk + 8 * dark + lr * (img.data[i] / 255 + 0.25));
    out.data[i + 1] = Math.min(255, img.data[i + 1] * kk + 3 * dark + lg * (img.data[i + 1] / 255 + 0.25));
    out.data[i + 2] = Math.min(255, img.data[i + 2] * kk + 4 * dark + lb * (img.data[i + 2] / 255 + 0.25));
    out.data[i + 3] = 255;
  }
  return out;
}

async function mapa() {
  const { fraguaMap } = await import('../src/engine/world/fraguaMap.ts');
  const { renderBigMap, cropView } = await import('../src/engine/world/bosqueMap.ts');
  const { renderClip } = await import('../src/engine/render/clip.ts');
  const { familyFicha } = await import('../src/engine/rpg/family.ts');
  const { LUCES, JAULA_CANDADO } = await import('../src/engine/world/fraguaObjects.ts');
  const t0 = Date.now();
  const m = fraguaMap();
  console.log(`  mapa en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  const byName = new Map(m.objects.map((o) => [o.name, o]));
  // el mapa entero, con las jaulas (de su color) y las grietas marcadas
  const vista = renderBigMap(m, { entities: true });
  const dot = (x: number, y: number, c: string, rr = 7) => { const v = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) { const dd = dx * dx + dy * dy; if (dd > rr * rr) continue; const k = ((y + dy) * vista.w + x + dx) * 4; vista.data.set(dd > (rr - 2) ** 2 ? [0, 0, 0, 255] : [...v, 255], k); } };
  for (const e of m.entities) if (e.tipo === 'grieta') { const w = Number(e.props!.width), h = Number(e.props!.height); for (let y = e.y; y < e.y + h; y++) for (let x = e.x; x < e.x + w; x++) if (x - e.x < 3 || y - e.y < 3 || e.x + w - x <= 3 || e.y + h - y <= 3) vista.data.set([255, 112, 32, 255], (y * vista.w + x) * 4); }
  for (const e of m.entities) if (e.tipo === 'jaula') dot(e.x, e.y, LUCES[e.props!.luz as keyof typeof LUCES], e.props?.carcel ? 9 : 7);
  save('mundo6_mapa.png', down(vista, 4));
  // las postales
  const hero = renderClip(familyFicha('sophie', true), 48, 'idle', 'se', { props: true }).frames[0];
  const full = renderBigMap(m);
  const jaula = (luz: string, f: number) => byName.get(`jaula_luz_${luz}`)!.anims.cerrada.frames[f % 6];
  const tiles: Raster[] = [];
  for (const [pi, p] of m.postales.entries()) {
    const img = cropView(full, p.x, p.y);
    const x0 = Math.max(0, Math.min(full.w - 960, Math.round(p.x - 480))), y0 = Math.max(0, Math.min(full.h - 540, Math.round(p.y - 270)));
    const inV = (x: number, y: number, pad = 0) => x > x0 - pad && x < x0 + 960 + pad && y > y0 - pad && y < y0 + 540 + pad;
    // las grietas (unas en aviso y otras al rojo, según su fase)
    for (const e of m.entities) {
      if (e.tipo !== 'grieta' || !inV(e.x, e.y, 100)) continue;
      const w = Number(e.props!.width), h = Number(e.props!.height), st = Number(e.props!.fase) > 0.5 ? 'caliente' : Number(e.props!.fase) > 0.2 ? 'aviso' : 'apagada';
      for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) {
        const g = byName.get(`grieta_brasa_${(Math.floor((e.x + x) / 64) * 3 + Math.floor((e.y + y) / 64) * 5) % 4}`)!.anims[st].frames; const gf = g[pi % g.length];
        const c = createRaster(Math.min(64, w - x), Math.min(64, h - y));
        for (let yy = 0; yy < c.h; yy++) for (let xx = 0; xx < c.w; xx++) c.data.set(gf.data.subarray((yy * 64 + xx) * 4, (yy * 64 + xx) * 4 + 4), (yy * c.w + xx) * 4);
        over(img, c, e.x + x - x0, e.y + y - y0);
      }
    }
    // la heroína en el centro, las jaulas colgando y las figuras
    const draws: { y: number; fr: Raster; x: number; yy: number }[] = [{ y: p.y + 40, fr: hero, x: p.x - x0 - 24, yy: p.y - y0 - 6 }];
    for (const e of m.entities) if (e.tipo === 'jaula' && inV(e.x, e.y, 64)) draws.push({ y: e.y, fr: jaula(String(e.props!.luz), pi + e.x), x: e.x - JAULA_CANDADO[0] - 16 - x0, yy: e.y - JAULA_CANDADO[1] - 4 - y0 });
    for (const d of draws.sort((a, b) => a.y - b.y)) over(img, d.fr, Math.round(d.x), Math.round(d.yy));
    const lights: Light[] = [{ x: p.x, y: p.y + 20, r: 110, c: '#ffe8c0', k: 0.55 }];
    for (const d of m.decos) { const o = byName.get(d.sprite); if (o?.light && inV(d.x, d.y, 360)) lights.push({ x: d.x, y: d.y - (o.light.dy ?? 0), r: Math.min(o.light.radius, 380), c: o.light.color, k: 0.95 }); }
    for (const e of m.entities) if (e.tipo === 'jaula' && inV(e.x, e.y, 100)) lights.push({ x: e.x, y: e.y - 24, r: 90, c: LUCES[e.props!.luz as keyof typeof LUCES], k: 0.9 });
    for (const e of m.entities) if (e.tipo === 'grieta' && Number(e.props!.fase) > 0.5 && inV(e.x, e.y, 100)) lights.push({ x: e.x + Number(e.props!.width) / 2, y: e.y + Number(e.props!.height) / 2, r: 110, c: '#ff7020', k: 0.7 });
    // la lava alumbra sus orillas
    for (let ty = Math.floor(y0 / 32) - 4; ty < (y0 + 540) / 32 + 4; ty += 2) for (let tx = Math.floor(x0 / 32) - 4; tx < (x0 + 960) / 32 + 4; tx += 2) {
      const k = ty * m.w + tx;
      if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h || !m.terrain.waterTiles[k]) continue;
      const shore = [1, -1, m.w, -m.w, 2, -2, 2 * m.w, -2 * m.w].some((dd) => !m.terrain.waterTiles[k + dd]);
      if (shore) lights.push({ x: tx * 32 + 16, y: ty * 32 + 16, r: 190, c: '#ff7020', k: 0.7 });
    }
    const terr = m.terrain;
    tiles.push(litPostal(img, m.zones, p.x, p.y, lights, x0, y0, (x, y) => terr.kind[y * terr.img.w + x] === 4 && terr.img.data[(y * terr.img.w + x) * 4 + 3] < 128));
  }
  const g = createRaster(960 * 2, 540 * 4);
  tiles.forEach((t, i) => blit(g, t, (i % 2) * 960, Math.floor(i / 2) * 540));
  save('mundo6_postales.png', g);
}

async function jaulas() {
  const { fraguaObjectsA, LUZ_IDS } = await import('../src/engine/world/fraguaObjects.ts');
  const A = new Map(fraguaObjectsA().map((o) => [o.name, o]));
  // una fila por luz: cerrada (2), abriéndose (5), vacía y la luz libre
  const rows = LUZ_IDS.map((l) => { const j = A.get(`jaula_luz_${l}`)!; return [j.anims.cerrada.frames[0], j.anims.cerrada.frames[3], ...[1, 3, 5, 7, 9].map((f) => j.anims.abrir.frames[f]), j.anims.vacia.frames[0]]; });
  const r = floor(40 * 9 + 8, 72 * 5 + 96 + 8);
  rows.forEach((row, j) => { row.forEach((f, i) => over(r, f, 4 + i * 40, 4 + j * 72)); const ll = A.get(`luz_libre_${LUZ_IDS[j]}`)!.anims.idle.frames[2]; over(r, ll, 4 + 8 * 40 + 4, 4 + j * 72 + 20); });
  // las grietas en sus tres estados (un parche de 3 x 1 de 64 por estado)
  ['apagada', 'aviso', 'caliente'].forEach((st, s) => { for (let v = 0; v < 2; v++) over(r, A.get(`grieta_brasa_${(v + s) % 4}`)!.anims[st].frames.at(-1)!, 4 + s * 120 + v * 56, 72 * 5 + 16); });
  save('mundo6_jaulas.png', up(r, 3));
}

async function objetos() {
  const { fraguaMapObjects } = await import('../src/engine/world/fraguaMap.ts');
  const byName = new Map(fraguaMapObjects().map((o) => [o.name, o]));
  const names = ['fuente_fria', 'charco_frio', 'fuelle_gigante_0', 'fuelle_gigante_1', 'brasero_0', 'brasero_1', 'brasero_2', 'surtidor', 'surtidor_chorro', 'palanca', 'cadena_dragona', 'boca_horno', 'arbol_ceniza_0', 'arbol_ceniza_1', 'arbol_ceniza_2', 'arbol_ceniza_3', 'yunque', 'pila_carbon_0', 'pila_carbon_1', 'molde_0', 'molde_1', 'carretilla_fragua', 'crisol', 'pila_jaulas_0', 'pila_jaulas_1', 'columna_basalto_0', 'columna_basalto_1', 'columna_basalto_2', 'celda_jaula_0', 'celda_jaula_1', 'mural_6', 'figura_cargadora', 'cadena_colgante_0', 'cadena_colgante_1', 'cadena_colgante_2', 'jaulas_frente_0', 'jaulas_frente_1', 'humo_frente_0', 'humo_frente_1', 'escoria_0', 'ceniza_1', 'marcas_carretilla_0', 'metal_frio_0', 'eslabones_1'];
  const tilesO = names.map((n) => {
    const o = byName.get(n)!;
    const main = o.anims.soplar ? o.anims.soplar.frames[6] : o.anims.chorro ? o.anims.chorro.frames[4] : (o.anims.idle ?? o.anims.quieto ?? o.anims.cerrada ?? Object.values(o.anims)[0]).frames[0];
    const off = o.anims.dormido ?? o.anims.apagado;
    const both = off ? [main, off.frames[0]] : o.anims.soplar ? [o.anims.quieto.frames[0], main] : [main];
    const t = floor(Math.max(o.w * both.length + 6 * (both.length - 1) + 8, 48), o.h + 8);
    both.forEach((fr, j) => { const ox = 4 + j * (o.w + 6), oy = 4; if (o.shadow) drawShadow(t, o.shadow, ox, oy); over(t, fr, ox, oy); });
    return t;
  });
  const MAXW = 1600, rowsO: Raster[][] = [[]];
  let rw = 0;
  for (const t of tilesO) { if (rw + t.w + 6 > MAXW && rowsO[rowsO.length - 1].length) { rowsO.push([]); rw = 0; } rowsO[rowsO.length - 1].push(t); rw += t.w + 6; }
  const r = fill(createRaster(MAXW, rowsO.reduce((a2, row) => a2 + Math.max(...row.map((t) => t.h)) + 8, 4)), [20, 14, 14]);
  let yo = 4;
  for (const row of rowsO) { const hh = Math.max(...row.map((t) => t.h)); let xo = 4; for (const t of row) { blit(r, t, xo, yo + hh - t.h); xo += t.w + 6; } yo += hh + 8; }
  save('mundo6_objetos.png', r);
}

async function puerta() {
  const { fraguaObjectsA } = await import('../src/engine/world/fraguaObjects.ts');
  const { fraguaObjectsB } = await import('../src/engine/world/fraguaObjectsB.ts');
  const { premiumPortal } = await import('../src/engine/world/portales.ts');
  const A = new Map([...fraguaObjectsA(), ...fraguaObjectsB()].map((o) => [o.name, o]));
  const pn = A.get('puerta_negra')!, fig = A.get('figura_cargadora')!, p = premiumPortal('brasa');
  const r = fill(createRaster(1100, 280), [20, 14, 14]);
  const t = floor(270, 264); drawShadow(t, pn.shadow!, 7, 4); over(t, pn.anims.latido.frames[2], 7, 4); blit(r, t, 4, 8);
  fig.anims.idle.frames.forEach((fr, i) => { const q = floor(56, 72); over(q, fr, 4, 4); blit(r, q, 290 + i * 60, 8); });
  fig.anims.irse.frames.filter((_, i) => i % 2).forEach((fr, i) => { const q = floor(56, 72); over(q, fr, 4, 4); blit(r, q, 290 + i * 60, 90); });
  [p.anims.girar.frames[0], p.anims.girar.frames[6], p.anims.abrir.frames[4], p.anims.cerrar.frames[2], p.anims.apagado.frames[0]].forEach((fr, i) => { const q = floor(104, 136); if (p.shadow) drawShadow(q, p.shadow, 4, 4); over(q, fr, 4, 4); blit(r, q, 540 + i * 110, 8); });
  save('mundo6_puerta.png', up(r, 2));
}

void bossCache; // la usan las láminas de los enemigos y del jefe

const all = what === 'todo';
if (all || what === 'mapa') await mapa();
if (all || what === 'jaulas') await jaulas();
if (all || what === 'objetos') await objetos();
if (all || what === 'puerta') await puerta();
