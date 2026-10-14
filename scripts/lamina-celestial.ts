/**
 * Láminas de revisión de la heroína celestial (encargo F13 de GG Abyss, parte 3) en docs/entregas/:
 *   npx tsx scripts/lamina-celestial.ts [heroinas|vuelo|poderes|todo]
 *
 * - celestial_heroinas.png: las cuatro heroínas normales y celestiales (alas, aureola y túnica), lado a lado, en
 *   cuatro direcciones (abajo, abajo a la derecha, derecha y arriba), sobre pasto oscuro.
 * - celestial_vuelo.png: el vuelo cuadro por cuadro de las cuatro, de lado y de frente, subido con su `elevacion`
 *   sobre la sombra, y el ataque con las alas que se abren en el golpe.
 * - celestial_poderes.png: la lanza de luz repetida en línea con su impacto, la estela de plumas, el aura al pie,
 *   los íconos y los retratos celestiales.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRaster, type Raster } from '../src/engine/core/raster.ts';
import { encodePng } from '../src/engine/export/png.ts';
import { familyFicha, type FamilyId } from '../src/engine/rpg/family.ts';
import { renderClip, type ViewName } from '../src/engine/render/clip.ts';
import { capasAlas, tunicaFicha, retratoCelestial, VOLAR } from '../src/engine/celestial/kit.ts';
import { lanzaLuz, impactoLuz, estelaAlas, auraCelestial } from '../src/engine/celestial/fx.ts';
import { VOLAR_ELEVACION } from '../src/engine/anim/celestial.ts';
import { celestialSkillIcons } from '../src/engine/ui/icons2.ts';
import { EIGHT_VIEWS } from '../src/engine/render/clip.ts';

const what = process.argv[2] ?? 'todo';
const OUT = 'docs/entregas';
mkdirSync(OUT, { recursive: true });
const save = (name: string, r: Raster) => { writeFileSync(`${OUT}/${name}`, encodePng(r)); console.log(`  ${OUT}/${name} ${r.w}x${r.h}`); };
const up = (r: Raster, k: number) => { const o = createRaster(r.w * k, r.h * k); for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) { const s = ((y / k | 0) * r.w + (x / k | 0)) * 4; o.data.set(r.data.subarray(s, s + 4), (y * o.w + x) * 4); } return o; };
const grass = (w: number, h: number) => { const r = createRaster(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = ((x >> 3) + (y >> 3)) % 2 ? [38, 58, 44] : [33, 51, 39]; r.data.set([...v, 255], (y * w + x) * 4); } return r; };
const dark = (w: number, h: number) => { const r = createRaster(w, h); for (let i = 0; i < w * h; i++) r.data.set([22, 22, 34, 255], i * 4); return r; };
/** pega con alfa */
function over(dst: Raster, src: Raster, ox: number, oy: number, alpha = 1) {
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const X = ox + x, Y = oy + y;
    if (X < 0 || Y < 0 || X >= dst.w || Y >= dst.h) continue;
    const s = (y * src.w + x) * 4, a = (src.data[s + 3] / 255) * alpha;
    if (!a) continue;
    const d = (Y * dst.w + X) * 4;
    for (let c = 0; c < 3; c++) dst.data[d + c] = dst.data[d + c] * (1 - a) + src.data[s + c] * a;
    dst.data[d + 3] = Math.max(dst.data[d + 3], Math.round(a * 255));
  }
}
function shadow(dst: Raster, cx: number, cy: number, rx: number, k = 0.4) {
  for (let y = -3; y <= 3; y++) for (let x = -rx; x <= rx; x++) if ((x / rx) ** 2 + (y / 3) ** 2 < 1) { const d = ((cy + y) * dst.w + cx + x) * 4; for (let c = 0; c < 3; c++) dst.data[d + c] *= 1 - k; }
}
const HEROES: FamilyId[] = ['rick', 'steph', 'sophie', 'alana'];
const VISTAS: ViewName[] = ['front', 'se', 'side', 'back'];
const idx = (v: ViewName) => EIGHT_VIEWS.indexOf(v);

/** la heroína celestial armada como la arma el juego: alas detrás, cuerpo con túnica y equipo, alas delante, aureola */
function celestial(id: FamilyId, anim: string, cache: Map<string, ReturnType<typeof capasAlas>>) {
  const f = familyFicha(id, true);
  if (!cache.has(`${id}|${anim}`)) cache.set(`${id}|${anim}`, capasAlas(f, [anim]));
  const capas = cache.get(`${id}|${anim}`)!;
  const t = tunicaFicha(f);
  const cuerpo = { ...t, gear: f.gear };
  return (v: ViewName, i: number) => {
    const body = renderClip(cuerpo, 48, anim, v, { props: true }).frames[i];
    const r = createRaster(48, 48);
    for (const l of [capas.detras.get(anim)![idx(v)][i], body, capas.delante.get(anim)![idx(v)][i], capas.aura.get(anim)![idx(v)][i]]) over(r, l, 0, 0);
    return r;
  };
}

if (what === 'heroinas' || what === 'todo') {
  const cache = new Map<string, ReturnType<typeof capasAlas>>();
  const S = 3, cw = 48 * S + 8;
  const img = grass(cw * VISTAS.length * 2 + 16, (48 * S + 12) * HEROES.length + 8);
  HEROES.forEach((id, r) => {
    const f = familyFicha(id, true);
    const cel = celestial(id, 'idle', cache);
    VISTAS.forEach((v, c) => {
      const y = 8 + r * (48 * S + 12);
      const x0 = 8 + c * cw, x1 = 8 + (VISTAS.length + c) * cw + 8;
      shadow(img, x0 + 24 * S, y + 46 * S, 10 * S); shadow(img, x1 + 24 * S, y + 46 * S, 10 * S);
      over(img, up(renderClip(f, 48, 'idle', v, { props: true }).frames[0], S), x0, y);
      over(img, up(cel(v, 0), S), x1, y);
    });
  });
  save('celestial_heroinas.png', img);
}

if (what === 'vuelo' || what === 'todo') {
  const cache = new Map<string, ReturnType<typeof capasAlas>>();
  const S = 2, n = 8, cw = 48 * S + 4, rh = 48 * S + 34 * S / 2 + 10;
  const filas: [FamilyId, string, ViewName][] = [];
  for (const id of HEROES) { filas.push([id, VOLAR, 'side']); filas.push([id, VOLAR, 'front']); }
  filas.push(['sophie', 'attack', 'front'], ['rick', 'attack', 'se'], ['steph', 'hit', 'front'], ['alana', 'cast', 'se']);
  const img = grass(cw * n + 8, rh * filas.length + 8);
  filas.forEach(([id, anim, v], r) => {
    const cel = celestial(id, anim, cache);
    const frames = renderClip(familyFicha(id, true), 48, anim, v, { props: true }).frames.length;
    for (let i = 0; i < Math.min(n, frames); i++) {
      const x = 4 + i * cw, base = 8 + r * rh + 18 * S;
      const rise = anim === VOLAR ? VOLAR_ELEVACION[i] : 0;
      shadow(img, x + 24 * S, base + 46 * S, Math.round((10 - rise * 0.3) * S), 0.35);
      over(img, up(cel(v, i), S), x, base - rise * S);
    }
  });
  save('celestial_vuelo.png', img);
}

if (what === 'poderes' || what === 'todo') {
  const S = 3;
  const img = dark(820, 560);
  // la lanza: 8 tramos en línea y el impacto en la punta, en tres momentos del bucle
  const lz = lanzaLuz(), imp = impactoLuz();
  for (let row = 0; row < 3; row++) {
    const y = 10 + row * 40;
    for (let k = 0; k < 8; k++) over(img, lz[(row * 2) % lz.length], 10 + k * 32, y);
    over(img, imp[row * 3], 10 + 8 * 32 - 20, y - 8);
  }
  // el impacto entero
  imp.forEach((fr, i) => over(img, up(fr, 2), 320 + (i % 4) * 100, 6 + Math.floor(i / 4) * 100));
  // la estela de plumas y el aura al pie (con Sophie volando encima)
  estelaAlas().forEach((fr, i) => over(img, up(fr, S), 10 + i * 100, 220));
  const au = auraCelestial();
  const cache = new Map<string, ReturnType<typeof capasAlas>>();
  const cel = celestial('sophie', 'idle', cache);
  au.forEach((fr, i) => { if (i % 2) return; const x = 10 + (i / 2) * 200, y = 330; over(img, up(fr, S), x, y); over(img, up(cel('se', i % 8), S), x + 8 * S, y + 2 * S); });
  // los íconos a 40 y a 80, y los retratos
  celestialSkillIcons().forEach((s, i) => { over(img, s.frames[0], 620 + i * 48, 230); over(img, up(s.frames[0], 2), 600 + i * 70, 280); });
  HEROES.forEach((id, i) => over(img, up(retratoCelestial(familyFicha(id, true)), 2), 10 + i * 90, 470));
  save('celestial_poderes.png', img);
}
