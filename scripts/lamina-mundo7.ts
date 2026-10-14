/**
 * Láminas de revisión del Mundo 7 (El Corazón Helado, encargo F13 de GG Abyss) en docs/entregas/:
 *   npx tsx scripts/lamina-mundo7.ts [mapa|objetos|trono|enemigos|diablo|iconos|todo]
 *
 * - mundo7_mapa.png: el mapa entero chiquito, con el hielo fino (en celeste) y los refugios de la ventisca (puntos).
 * - mundo7_postales.png: una postal por zona con la oscuridad de la zona y las luces como se ven en el juego (las
 *   hogueras de hueso, el trono, la Ladrona y la heroína con su farol). El hielo fino va dibujado como queda.
 * - mundo7_objetos.png: los objetos del encargo en estantes, con sus estados al lado.
 * - mundo7_trono.png: el trono, los braseros en sus cuatro estados, la Ladrona con la última llama, el mural 7 y el
 *   portal de hielo.
 * - mundo7_enemigos.png y mundo7_diablo.png: al lado de la heroína (el Diablo también al lado de la Dragona).
 * - mundo7_iconos.png: los íconos nuevos a 40 y a 80.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRaster, blit, type Raster } from '../src/engine/core/raster.ts';
import { encodePng } from '../src/engine/export/png.ts';
import { over } from '../src/engine/loot/canvas.ts';
import { drawShadow } from '../src/engine/world/premium/shadow.ts';

const what = process.argv[2] ?? 'todo';
const OUT = 'docs/entregas';
mkdirSync(OUT, { recursive: true });
const save = (name: string, r: Raster) => { writeFileSync(`${OUT}/${name}`, encodePng(r)); console.log(`  ${OUT}/${name} ${r.w}x${r.h}`); };
const up = (r: Raster, k: number) => { const o = createRaster(r.w * k, r.h * k); for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) { const s = ((y / k | 0) * r.w + (x / k | 0)) * 4; o.data.set(r.data.subarray(s, s + 4), (y * o.w + x) * 4); } return o; };
const fill = (r: Raster, c: number[]) => { for (let i = 0; i < r.w * r.h; i++) r.data.set([...c, 255], i * 4); return r; };
const down = (r: Raster, k: number) => { const o = createRaster(Math.floor(r.w / k), Math.floor(r.h / k)); for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) for (let c = 0; c < 4; c++) { let v = 0; for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) v += r.data[((y * k + j) * r.w + x * k + i) * 4 + c]; o.data[(y * o.w + x) * 4 + c] = v / (k * k); } return o; };
/** piso de nieve sucia (para que se lea lo oscuro) */
const floor = (w: number, h: number) => { const r = createRaster(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = ((x >> 3) + (y >> 3)) % 2 ? [58, 64, 74] : [48, 54, 64]; r.data.set([...v, 255], (y * w + x) * 4); } return r; };

type Light = { x: number; y: number; r: number; c: string; k: number };
/** La postal como se ve en el juego: la oscuridad de la zona y las luces que hay a la vista. */
function litPostal(img: Raster, zones: { x: number; y: number; w: number; h: number; props: Record<string, unknown> }[], cx: number, cy: number, lights: Light[], x0: number, y0: number) {
  const W = img.w, H = img.h;
  const z = zones.find((q) => cx >= q.x && cx < q.x + q.w && cy >= q.y && cy < q.y + q.h);
  const dark = Number(z?.props.oscuridad ?? 0.95) * 0.84;
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
    lr = Math.min(lr, 130); lg = Math.min(lg, 90); lb = Math.min(lb, 80);
    const keep = 1 - dark + dark * Math.min(1, L * 1.2);
    // lo que brilla solo (fuego, brasas, ojos) no se oscurece
    const self = img.data[i] > 220 && img.data[i + 2] < 140 ? 1 : 0;
    const kk = self ? 1 : keep;
    // el frío: lo oscuro tira a azul
    const cold = dark * (1 - Math.min(1, L * 1.5));
    out.data[i] = Math.min(255, img.data[i] * kk + 2 * cold + lr * (img.data[i] / 255 + 0.35));
    out.data[i + 1] = Math.min(255, img.data[i + 1] * kk + 6 * cold + lg * (img.data[i + 1] / 255 + 0.35));
    out.data[i + 2] = Math.min(255, img.data[i + 2] * kk + 14 * cold + lb * (img.data[i + 2] / 255 + 0.35));
    out.data[i + 3] = 255;
  }
  return out;
}

async function mapa() {
  const { corazonMap } = await import('../src/engine/world/corazonMap.ts');
  const { renderBigMap, cropView } = await import('../src/engine/world/bosqueMap.ts');
  const { renderClip } = await import('../src/engine/render/clip.ts');
  const { familyFicha } = await import('../src/engine/rpg/family.ts');
  const t0 = Date.now();
  const m = corazonMap();
  console.log(`  mapa en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  const byName = new Map(m.objects.map((o) => [o.name, o]));
  // el mapa entero, con el hielo fino y los refugios marcados
  const vista = renderBigMap(m, { entities: true });
  const dot = (x: number, y: number, c: number[], rr = 7) => { for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) { const dd = dx * dx + dy * dy; if (dd > rr * rr) continue; const k = ((y + dy) * vista.w + x + dx) * 4; if (k >= 0 && k < vista.data.length) vista.data.set(dd > (rr - 2) ** 2 ? [0, 0, 0, 255] : [...c, 255], k); } };
  for (const e of m.entities) if (e.tipo === 'hielo_fino') { const w = Number(e.props!.width), h = Number(e.props!.height); for (let y = e.y; y < e.y + h; y++) for (let x = e.x; x < e.x + w; x++) if (x - e.x < 3 || y - e.y < 3 || e.x + w - x <= 3 || e.y + h - y <= 3) vista.data.set([140, 210, 255, 255], (y * vista.w + x) * 4); }
  for (const e of m.entities) if (e.tipo === 'columna_hielo' || e.tipo === 'gigante') dot(e.x, e.y, [200, 230, 255], 8);
  for (const e of m.entities) if (e.tipo === 'enemigo') dot(e.x, e.y, e.props?.elite ? [255, 200, 40] : [255, 42, 26], e.props?.elite ? 12 : 6);
  save('mundo7_mapa.png', down(vista, 4));
  // las postales
  const hero = renderClip(familyFicha('sophie', true), 48, 'idle', 'se', { props: true }).frames[0];
  const full = renderBigMap(m);
  const tiles: Raster[] = [];
  for (const [pi, p] of m.postales.entries()) {
    const img = cropView(full, p.x, p.y);
    const x0 = Math.max(0, Math.min(full.w - 960, Math.round(p.x - 480))), y0 = Math.max(0, Math.min(full.h - 540, Math.round(p.y - 270)));
    const inV = (x: number, y: number, pad = 0) => x > x0 - pad && x < x0 + 960 + pad && y > y0 - pad && y < y0 + 540 + pad;
    // el hielo fino (lo dibuja el juego: acá va como queda, uno crujiendo)
    for (const e of m.entities) {
      if (e.tipo !== 'hielo_fino' || !inV(e.x, e.y, 140)) continue;
      const w = Number(e.props!.width), h = Number(e.props!.height);
      for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) {
        const v = (Math.floor((e.x + x) / 64) * 3 + Math.floor((e.y + y) / 64) * 5) % 4;
        const fr = e.props!.id === 'hielo_fino_3' ? byName.get(`hielo_fino_${v}`)!.anims.cruje.frames[3] : byName.get(`hielo_fino_${v}`)!.anims.quieto.frames[0];
        const c = createRaster(Math.min(64, w - x), Math.min(64, h - y));
        for (let yy = 0; yy < c.h; yy++) for (let xx = 0; xx < c.w; xx++) c.data.set(fr.data.subarray((yy * 64 + xx) * 4, (yy * 64 + xx) * 4 + 4), (yy * c.w + xx) * 4);
        over(img, c, e.x + x - x0, e.y + y - y0);
      }
    }
    // la heroína en el centro y la Ladrona en el trono
    const draws: { y: number; fr: Raster; x: number; yy: number }[] = [{ y: p.y + 40, fr: hero, x: p.x - x0 - 24, yy: p.y - y0 - 6 }];
    for (const e of m.entities) if (e.tipo === 'figura' && e.props?.objeto === 'figura_ultima_llama' && inV(e.x, e.y, 64)) draws.push({ y: e.y, fr: byName.get('figura_ultima_llama')!.anims.idle.frames[pi % 4], x: e.x - 24 - x0, yy: e.y - 60 - y0 });
    for (const dd of draws.sort((a, b) => a.y - b.y)) over(img, dd.fr, Math.round(dd.x), Math.round(dd.yy));
    const lights: Light[] = [{ x: p.x, y: p.y + 20, r: 170, c: '#ffe0b0', k: 0.65 }];
    // las luces compañeras que orbitan a la heroína (tres, de los colores de los pisos de arriba)
    for (const [k, c] of ['#9aff7a', '#8ae0ff', '#ffd890'].entries()) { const a = k * 2.1 + pi, lx = p.x + Math.cos(a) * 36, ly = p.y - 10 + Math.sin(a) * 18; lights.push({ x: lx, y: ly, r: 60, c, k: 0.7 }); const dot2 = createRaster(4, 4); for (let q = 0; q < 16; q++) dot2.data.set([parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), q === 0 || q === 3 || q === 12 || q === 15 ? 0 : 255], q * 4); over(img, dot2, Math.round(lx - x0 - 2), Math.round(ly - y0 - 2)); }
    for (const dd of m.decos) { const o = byName.get(dd.sprite); if (o?.light && inV(dd.x, dd.y, 360) && dd.sprite !== 'brasero_hueso') lights.push({ x: dd.x, y: dd.y - (o.light.dy ?? 0), r: Math.min(o.light.radius, 380), c: o.light.color, k: 0.95 }); }
    for (const e of m.entities) if (e.tipo === 'figura' && e.props?.objeto === 'figura_ultima_llama' && inV(e.x, e.y, 200)) lights.push({ x: e.x, y: e.y - 30, r: 70, c: '#ff2a1a', k: 0.9 });
    tiles.push(litPostal(img, m.zones, p.x, p.y, lights, x0, y0));
  }
  const g = createRaster(960 * 2, 540 * 4);
  tiles.forEach((t, i) => blit(g, t, (i % 2) * 960, Math.floor(i / 2) * 540));
  save('mundo7_postales.png', g);
}

async function objetos() {
  const { corazonMapObjects } = await import('../src/engine/world/corazonMap.ts');
  const byName = new Map(corazonMapObjects().map((o) => [o.name, o]));
  const names = ['hoguera_hueso', 'columna_hielo_0', 'columna_hielo_1', 'columna_hielo_2', 'columna_hielo_3', 'gigante_congelado_0', 'gigante_congelado_1', 'gigante_congelado_2', 'hielo_fino_0', 'hielo_fino_1', 'hielo_fino_2', 'hielo_fino_3', 'arbol_hielo_0', 'arbol_hielo_1', 'arbol_hielo_2', 'arbol_hielo_3', 'brasero_hueso', 'arma_congelada_0', 'arma_congelada_1', 'escudo_roto_0', 'escudo_roto_1', 'calavera_demonio_0', 'calavera_demonio_1', 'bandera_helada_0', 'bandera_helada_1', 'lapida_hielo_0', 'lapida_hielo_1', 'sarcofago_hielo', 'estalagmita_hielo_0', 'estalagmita_hielo_1', 'roca_hielo_0', 'roca_hielo_1', 'armadura_caida', 'cadena_helada_0', 'cadena_helada_1', 'cadena_helada_2', 'nieve_frente_0', 'nieve_frente_1', 'carambanos_frente_0', 'carambanos_frente_1', 'nieve_acumulada_0', 'grieta_hielo_1', 'huellas_lobo_0', 'escarcha_1', 'ceniza_negra_0'];
  const tilesO = names.map((n) => {
    const o = byName.get(n)!;
    const both = o.anims.cruje ? [o.anims.quieto.frames[0], o.anims.cruje.frames[4], o.anims.roto.frames[0]] : o.anims.prendido ? [o.anims.apagado.frames[0], o.anims.prendido.frames[2], o.anims.congelado.frames[0]] : o.anims.respira ? [o.anims.respira.frames[0]] : [(o.anims.idle ?? Object.values(o.anims)[0]).frames[0]];
    const t = floor(Math.max(o.w * both.length + 6 * (both.length - 1) + 8, 48), o.h + 8);
    both.forEach((fr, j) => { const ox = 4 + j * (o.w + 6), oy = 4; if (o.shadow) drawShadow(t, o.shadow, ox, oy); over(t, fr, ox, oy); });
    return t;
  });
  const MAXW = 1600, rowsO: Raster[][] = [[]];
  let rw = 0;
  for (const t of tilesO) { if (rw + t.w + 6 > MAXW && rowsO[rowsO.length - 1].length) { rowsO.push([]); rw = 0; } rowsO[rowsO.length - 1].push(t); rw += t.w + 6; }
  const r = fill(createRaster(MAXW, rowsO.reduce((a2, row) => a2 + Math.max(...row.map((t) => t.h)) + 8, 4)), [16, 18, 24]);
  let yo = 4;
  for (const row of rowsO) { const hh = Math.max(...row.map((t) => t.h)); let xo = 4; for (const t of row) { blit(r, t, xo, yo + hh - t.h); xo += t.w + 6; } yo += hh + 8; }
  save('mundo7_objetos.png', r);
}

async function trono() {
  const { corazonMapObjects } = await import('../src/engine/world/corazonMap.ts');
  const { premiumPortal } = await import('../src/engine/world/portales.ts');
  const A = new Map(corazonMapObjects().map((o) => [o.name, o]));
  const tr = A.get('trono_diablo')!, br = A.get('brasero_hueso')!, fig = A.get('figura_ultima_llama')!, mu = A.get('mural_7')!, p = premiumPortal('hielo');
  const r = fill(createRaster(1180, 280), [16, 18, 24]);
  const t = floor(270, 264); drawShadow(t, tr.shadow!, 7, 4); over(t, tr.anims.idle.frames[2], 7, 4); blit(r, t, 4, 8);
  [br.anims.apagado.frames[0], br.anims.prenderse.frames[2], br.anims.prenderse.frames[5], br.anims.prendido.frames[3], br.anims.congelado.frames[0]].forEach((fr, i) => { const q = floor(56, 88); drawShadow(q, br.shadow!, 4, 4); over(q, fr, 4, 4); blit(r, q, 290 + i * 60, 8); });
  fig.anims.idle.frames.forEach((fr, i) => { const q = floor(56, 72); over(q, fr, 4, 4); blit(r, q, 290 + i * 60, 104); });
  fig.anims.irse.frames.filter((_, i) => i % 2).forEach((fr, i) => { const q = floor(56, 72); over(q, fr, 4, 4); blit(r, q, 290 + i * 60, 182); });
  { const q = floor(136, 104); over(q, mu.anims.idle.frames[0], 4, 4); blit(r, q, 600, 8); }
  [p.anims.girar.frames[0], p.anims.girar.frames[6], p.anims.abrir.frames[4], p.anims.apagado.frames[0]].forEach((fr, i) => { const q = floor(104, 136); if (p.shadow) drawShadow(q, p.shadow, 4, 4); over(q, fr, 4, 4); blit(r, q, 600 + (i % 4) * 110 - (i > 3 ? 0 : 0), 120 + 0 * i); });
  save('mundo7_trono.png', up(r, 2));
}

async function iconos() {
  const { skillIcons } = await import('../src/engine/ui/icons2.ts');
  const ic = new Map(skillIcons().map((s) => [s.name, s.frames[0]]));
  const names = ['frio', 'compañeras', 'brasero', 'romper'];
  const r = fill(createRaster(48 * names.length + 92 * names.length + 16, 100), [16, 18, 24]);
  names.forEach((n, i) => { over(r, ic.get(n)!, 8 + i * 48, 8); over(r, up(ic.get(n)!, 2), 8 + names.length * 48 + i * 92, 8); });
  save('mundo7_iconos.png', up(r, 2));
}

const all = what === 'todo';
if (all || what === 'mapa') await mapa();
if (all || what === 'objetos') await objetos();
if (all || what === 'trono') await trono();
if (all || what === 'iconos') await iconos();
