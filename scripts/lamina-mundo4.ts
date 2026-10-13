/**
 * Láminas de revisión del Mundo 4 (encargo F12 de GG Abyss) en docs/entregas/:
 *   npx tsx scripts/lamina-mundo4.ts [pendientes|farol|mapa|enemigos|jefe|todo]
 *
 * - pendientes.png: el ícono de ataque (x1 y x2 al lado de nova_fuego), el cinturón, el casillero de poción y los
 *   portales de cada mundo (girar, abrir y cerrar).
 * - thor_farol.png: Thor con el farol en las 8 direcciones caminando (todos los cuadros), alzando el farol (howl) y
 *   con el farol apagado.
 * - mundo4_mapa.png: el mapa entero chiquito, con las entidades.
 * - mundo4_postales.png: una postal por zona, con la oscuridad de la zona y las luces (el farol de Thor en el centro,
 *   el farol del muelle más cercano prendido, las ventanas que titilan): como se ve en el juego, no a pleno día.
 * - mundo4_objetos.png: los objetos del encargo sobre piedra mojada, x2.
 * - mundo4_enemigos.png: los enemigos y el Pez Farol al lado de la heroína (para la escala).
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
/** fondo de piedra mojada (para que se lea lo oscuro) */
const floor = (w: number, h: number) => { const r = createRaster(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = ((x >> 3) + (y >> 3)) % 2 ? [34, 46, 44] : [28, 38, 37]; r.data.set([...v, 255], (y * w + x) * 4); } return r; };

async function pendientes() {
  const { skillIcons } = await import('../src/engine/ui/icons2.ts');
  const { hudSprites } = await import('../src/engine/ui/hud.ts');
  const { premiumPortals } = await import('../src/engine/world/portales.ts');
  const ic = new Map(skillIcons().map((s) => [s.name, s.frames[0]]));
  const ui = new Map(hudSprites().map((s) => [s.name, s.frames[0]]));
  const P = premiumPortals();
  const W = 96 * 9, H = 120 + 128 * P.length;
  const r = fill(createRaster(W, H), [20, 24, 30]);
  over(r, ic.get('ataque')!, 8, 8); over(r, ic.get('nova_fuego')!, 56, 8); over(r, ic.get('rayo_canalizado')!, 104, 8); over(r, up(ic.get('ataque')!, 2), 152, 8);
  over(r, ui.get('cinturon')!, 250, 20); over(r, ui.get('casillero_pocion')!, 450, 24);
  P.forEach((p, i) => {
    const y = 120 + i * 128;
    const frames = [p.anims.girar.frames[0], p.anims.girar.frames[4], p.anims.girar.frames[8], ...[1, 3, 5, 7].map((f) => p.anims.abrir.frames[f]), p.anims.cerrar.frames[2], p.anims.arco.frames[0]];
    frames.forEach((f, j) => { const t = floor(96, 128); if (p.shadow) drawShadow(t, p.shadow, 0, 0); over(t, f); blit(r, t, j * 96, y); });
  });
  save('pendientes.png', up(r, 2));
}

async function farol() {
  const { lanternClip } = await import('../src/engine/render/petLantern.ts');
  const { thorFicha } = await import('../src/engine/rpg/family.ts');
  const { EIGHT_VIEWS } = await import('../src/engine/render/clip.ts');
  const f = thorFicha(0);
  const rows: Raster[][] = [];
  const row = (a: string, v: (typeof EIGHT_VIEWS)[number], lit: boolean) => { const c = lanternClip(f, 48, a, v, lit); rows.push(c.frames.map((l, i) => { const t = floor(48, 48); over(t, c.thor[i]); over(t, l); return t; })); };
  for (const v of EIGHT_VIEWS) row('walk', v, true);
  row('howl', 'se', true); row('howl', 'sw', true); row('run', 'side', true); row('walk', 'se', false);
  const n = Math.max(...rows.map((q) => q.length));
  const r = fill(createRaster(n * 48, rows.length * 48), [20, 24, 30]);
  rows.forEach((q, j) => q.forEach((fr, i) => blit(r, fr, i * 48, j * 48)));
  save('thor_farol.png', up(r, 3));
}

/** La postal como se ve en el juego: la oscuridad de la zona y las luces que hay a la vista. */
function litPostal(img: Raster, m: { zones: { x: number; y: number; w: number; h: number; props: Record<string, unknown> }[]; decos: { sprite: string; x: number; y: number }[]; objects: { name: string; light?: { color: string; radius: number; dy?: number } }[] }, cx: number, cy: number, lights: { x: number; y: number; r: number; c: string; k: number }[]) {
  const W = img.w, H = img.h, x0 = Math.max(0, Math.round(cx - W / 2)), y0 = Math.max(0, Math.round(cy - H / 2));
  const z = m.zones.find((q) => cx >= q.x && cx < q.x + q.w && cy >= q.y && cy < q.y + q.h);
  const dark = Number(z?.props.oscuridad ?? 0.8) * 0.88;
  const out = createRaster(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    let L = 0, lr = 0, lg = 0, lb = 0;
    for (const l of lights) {
      const d = Math.hypot(x + x0 - l.x, (y + y0 - l.y) * 1.15) / l.r;
      if (d >= 1) continue;
      const k = (1 - d) ** 1.6 * l.k;
      L = Math.max(L, k);
      const c = [parseInt(l.c.slice(1, 3), 16), parseInt(l.c.slice(3, 5), 16), parseInt(l.c.slice(5, 7), 16)];
      lr += c[0] * k * 0.45; lg += c[1] * k * 0.45; lb += c[2] * k * 0.45;
    }
    const keep = 1 - dark + dark * Math.min(1, L * 1.2);
    out.data[i] = Math.min(255, img.data[i] * keep + 4 * dark + lr * (img.data[i] / 255 + 0.25));
    out.data[i + 1] = Math.min(255, img.data[i + 1] * keep + 8 * dark + lg * (img.data[i + 1] / 255 + 0.25));
    out.data[i + 2] = Math.min(255, img.data[i + 2] * keep + 10 * dark + lb * (img.data[i + 2] / 255 + 0.25));
    out.data[i + 3] = 255;
  }
  return out;
}

async function mapa() {
  const { puertoMap } = await import('../src/engine/world/puertoMap.ts');
  const { renderBigMap, cropView } = await import('../src/engine/world/bosqueMap.ts');
  const m = puertoMap();
  save('mundo4_mapa.png', down(renderBigMap(m, { entities: true }), 4));
  // las postales: el farol del muelle más cercano prendido (como lo deja Thor) y el farol de Thor en el centro
  const byName = new Map(m.objects.map((o) => [o.name, o]));
  const faroles = m.decos.filter((d) => d.sprite === 'farol_muelle_apagado');
  const tiles: Raster[] = [];
  for (const p of m.postales) {
    const near = faroles.filter((f) => Math.abs(f.x - p.x) < 480 && Math.abs(f.y - p.y) < 270);
    const decos = m.decos.map((d) => (near.includes(d) ? { ...d, sprite: 'farol_muelle_prendido' } : d));
    const img = cropView(renderBigMap({ ...m, decos }), p.x, p.y);
    const lights: { x: number; y: number; r: number; c: string; k: number }[] = [{ x: p.x + 40, y: p.y + 30, r: 200, c: '#ffc070', k: 1 }];
    for (const d of decos) { const o = byName.get(d.sprite); if (o?.light && Math.abs(d.x - p.x) < 600 && Math.abs(d.y - p.y) < 400) lights.push({ x: d.x, y: d.y - (o.light.dy ?? 0), r: Math.min(o.light.radius, 420), c: o.light.color, k: d.sprite === 'faro' ? 0.5 : 1 }); }
    tiles.push(litPostal(img, m, p.x, p.y, lights));
  }
  const g = createRaster(960 * 2, 540 * 4);
  tiles.forEach((t, i) => blit(g, t, (i % 2) * 960, Math.floor(i / 2) * 540));
  save('mundo4_postales.png', g);
  // los objetos del encargo
  const names = ['farol_muelle_apagado', 'farol_muelle_prendido', 'faro', 'casa_pescador_0', 'casa_pescador_1', 'casa_pescador_2', 'casa_pescador_3', 'iglesia_ruina', 'campana_iglesia', 'bote_volteado_0', 'bote_volteado_1', 'bote_volteado_2', 'bote_hundido', 'red_colgando_0', 'red_colgando_1', 'red_colgando_2', 'cajones_mercado', 'puesto_volteado', 'barril_pescado', 'ancla_vieja', 'cuerda_enrollada', 'muelle_flotante', 'agua_marea', 'muelle_h', 'muelle_v', 'muelle_esquina_ne', 'rocas_frente_0', 'vigas_frente_0', 'mural_4', 'figura_ojos_mojada'];
  const cols = 8, cw = 200, chh = 330;
  const r = fill(createRaster(cols * cw, Math.ceil(names.length / cols) * chh), [20, 24, 30]);
  names.forEach((n, i) => {
    const o = byName.get(n)!;
    const t = floor(Math.min(cw - 8, Math.max(o.w, 64)), Math.min(chh - 8, o.h + 8));
    const fr = (o.anims.idle ?? Object.values(o.anims)[0]).frames[0];
    const ox = Math.round((t.w - o.w) / 2), oy = t.h - o.h - 4;
    if (o.shadow) drawShadow(t, o.shadow, ox, oy);
    over(t, fr, ox, oy);
    blit(r, t, (i % cols) * cw + 4, Math.floor(i / cols) * chh + 4);
  });
  save('mundo4_objetos.png', up(r, 1));
}

async function enemigos() {
  const { renderBossSheets } = await import('../src/engine/boss/sheet.ts');
  const { MARINERO_NIEBLA_SPEC, CANGREJO_CENIZA_SPEC, MEDUSA_NEGRA_SPEC, CAPITAN_AHOGADO_SPEC } = await import('../src/engine/boss/puerto.ts');
  const { PEZ_FAROL_SPEC } = await import('../src/engine/boss/pez.ts');
  const { renderClip } = await import('../src/engine/render/clip.ts');
  const { familyFicha } = await import('../src/engine/rpg/family.ts');
  const hero = renderClip(familyFicha('sophie', true), 48, 'idle', 'se', { props: true }).frames[0];
  const specs = [MARINERO_NIEBLA_SPEC, CANGREJO_CENIZA_SPEC, MEDUSA_NEGRA_SPEC, CAPITAN_AHOGADO_SPEC, PEZ_FAROL_SPEC];
  const rows: { cell: number; pivot: [number, number]; frames: Raster[] }[] = [];
  for (const s of specs) {
    // la misma caché que el kit (.cache/jefes): dibujar al Pez Farol tarda
    const cd = '.cache/jefes';
    const cache = existsSync(cd) ? { get: (k: string) => (existsSync(`${cd}/${k}.png`) ? decodePng(new Uint8Array(readFileSync(`${cd}/${k}.png`))) : null), set: (k: string, r: Raster) => writeFileSync(`${cd}/${k}.png`, encodePng(r)) } : undefined;
    const { clips, pivot } = renderBossSheets(s, cache);
    // abajo a la derecha (dirección 7): el primer cuadro de cada animación
    rows.push({ cell: s.cell, pivot, frames: clips.map((c) => c.frames[7][Math.min(c.frames[7].length - 1, Math.floor(c.def.frames * (c.def.name === 'die' ? 0.99 : c.def.name.startsWith('attack') ? 0.55 : 0)))]) });
    console.log(`  ${s.id}: ${clips.map((c) => c.def.name).join(', ')}`);
  }
  const W = Math.max(...rows.map((q) => 60 + q.frames.length * q.cell)), H = rows.reduce((a, q) => a + q.cell + 8, 0);
  const r = floor(W, H);
  let y = 0;
  for (const q of rows) {
    // la heroína parada al lado, con los pies en el mismo piso que el pivote
    over(r, hero, 4, y + q.pivot[1] - 46);
    q.frames.forEach((f, i) => over(r, f, 56 + i * q.cell, y));
    y += q.cell + 8;
  }
  save('mundo4_enemigos.png', up(r, 2));
}

const all = what === 'todo';
if (all || what === 'pendientes') await pendientes();
if (all || what === 'farol') await farol();
if (all || what === 'mapa') await mapa();
if (all || what === 'enemigos' || what === 'jefe') await enemigos();
