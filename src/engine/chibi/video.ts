import { createRaster, type Raster } from '../core/raster';
import type { ChibiLook, Contextura } from './look';
import type { Gesto } from './head';
import { MARGEN } from './cabezaMolde';
import { recolorMolde, VACIO_RC } from './recolor';
import { hex, sombra, mezcla } from './paint';
import type { Clip, Cuadro, Punto } from './clips';
import DATA from './video/moldes.json';

/**
 * Los moldes del video: cada pose de Ryu y Ken calcada pixel por pixel del video de referencia (@DAVE.XP, chibis de
 * Street Fighter), a su resolución real (un pixel del juego eran 4 del video) y con los tiempos reales de cada
 * movimiento. Cada pixel del molde dice qué es (contorno, piel del brazo, ropa de arriba, cinturón, guante, pie,
 * pelo, cara...). Para vestir a la familia se pinta cada parte con los colores del muñeco, se quita la cabeza del
 * molde y se pone la cabeza del familiar en el mismo lugar y girada igual. Los puños quedan por delante de la cara.
 */

interface InfoCabeza { k: number; chin: [number, number]; top: number; ancho: number; espalda: boolean; cara: number; frente?: boolean }
export interface Molde { w: number; h: number; filas: string[]; cabeza: InfoCabeza | null; espejo: boolean }
type CuadroMolde = [string, number, number, number, boolean];
interface Datos { poses: Record<string, Molde>; clips: Record<string, { loop: boolean; cuadros: CuadroMolde[] }>; nombres: Record<string, string>; golpes: Record<string, string[]>; extra: { poder_suelta: string } }
const D = DATA as unknown as Datos;

export const MOLDES = D.poses;
/** Celda de los moldes a 32 (ancho, alto) y la línea del piso. */
export const CELDA_VIDEO: [number, number] = [56, 48];
export const PISO_VIDEO = 44;

const CABEZA = new Set(['H', 'h', 'R', 'r', 'S', 'E', 'k']);

/** Gestos de la cara por animación (el molde no trae cara: la pone el familiar). */
const GESTOS: Record<string, Gesto> = {
  golpe_debil: 'golpe', antiaereo: 'golpe', poder: 'golpe', barrida: 'golpe', agarrar: 'esfuerzo', uppercut_corto: 'golpe', uppercut: 'golpe',
  torbellino: 'golpe', golpeado_aire: 'dolor', recibir_poder: 'dolor', salto_patada: 'golpe', patada_agachado: 'golpe', caer: 'dolor', ko: 'ko',
  victoria: 'feliz', festejo: 'feliz', levantarse: 'dolor',
  hoja_golpe: 'golpe', hoja_patada: 'golpe', hoja_agarrar: 'esfuerzo', hoja_agachado: 'golpe', hoja_barrida: 'golpe', hoja_hadouken: 'golpe', hoja_shoryuken: 'golpe',
  hoja_antiaereo: 'golpe', hoja_golpeado: 'dolor', hoja_caida: 'dolor', hoja_victoria: 'feliz',
  golpe_agachado: 'golpe', golpe_barril: 'golpe', patada_giro: 'golpe', shoryuken_barril: 'golpe', perfect: 'feliz',
};

export interface PintadoMolde { img: Raster; ancla: [number, number]; puntos: Record<Punto, [number, number]>; hurt: [number, number, number, number] }

/** Borra los grupos de pixeles de menos de `min` que no tocan al grupo más grande. */
function quitarIslas(img: Raster, min: number): void {
  const { w, h, data } = img;
  const grupo = new Int32Array(w * h).fill(-1);
  const tam: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!data[i * 4 + 3] || grupo[i] >= 0) continue;
    const g = tam.length; let n = 0; const pila = [i]; grupo[i] = g;
    while (pila.length) {
      const j = pila.pop()!; n++;
      const x = j % w, y = (j - x) / w;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const k = yy * w + xx;
        if (data[k * 4 + 3] && grupo[k] < 0) { grupo[k] = g; pila.push(k); }
      }
    }
    tam.push(n);
  }
  const mayor = tam.indexOf(Math.max(...tam));
  for (let i = 0; i < w * h; i++) if (grupo[i] >= 0 && grupo[i] !== mayor && tam[grupo[i]] < min) data[i * 4 + 3] = 0;
}

/** Tapa los grupos de pixeles transparentes encerrados por el muñeco de hasta `max` pixeles. */
function taparHuecos(img: Raster, max: number): void {
  const { w, h, data } = img;
  const fuera = new Uint8Array(w * h);
  const pila: number[] = [];
  for (let x = 0; x < w; x++) pila.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) pila.push(y * w, y * w + w - 1);
  while (pila.length) {
    const i = pila.pop()!;
    if (fuera[i] || data[i * 4 + 3]) continue;
    fuera[i] = 1;
    const x = i % w, y = (i - x) / w;
    if (x > 0) pila.push(i - 1); if (x < w - 1) pila.push(i + 1); if (y > 0) pila.push(i - w); if (y < h - 1) pila.push(i + w);
  }
  const visto = new Uint8Array(w * h);
  for (let s0 = 0; s0 < w * h; s0++) {
    if (fuera[s0] || data[s0 * 4 + 3] || visto[s0]) continue;
    const grupo: number[] = []; const q = [s0]; visto[s0] = 1;
    while (q.length) {
      const i = q.pop()!; grupo.push(i);
      const x = i % w, y = (i - x) / w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1])
        if (j >= 0 && !visto[j] && !data[j * 4 + 3] && !fuera[j]) { visto[j] = 1; q.push(j); }
    }
    if (grupo.length > max) continue;
    for (const i of grupo) {
      const x = i % w, y = (i - x) / w;
      const cuenta = new Map<number, number>();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = (yy * w + xx) * 4; if (!data[j + 3]) continue;
        const v = (data[j] << 16) | (data[j + 1] << 8) | data[j + 2]; cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
      }
      let mejor = 0, n = -1; for (const [v, c] of cuenta) if (c > n) { n = c; mejor = v; }
      data[i * 4] = (mejor >> 16) & 255; data[i * 4 + 1] = (mejor >> 8) & 255; data[i * 4 + 2] = mejor & 255; data[i * 4 + 3] = 255;
    }
  }
}

/** Pinta un molde del video vestido con el muñeco, mirando a la derecha (o espejado). */
export function pintarMolde(look: ChibiLook, id: string, espejo = false, _gesto: Gesto = 'normal'): PintadoMolde {
  const m0 = MOLDES[id];
  if (!m0) throw new Error(`No hay molde "${id}"`);
  const m = moldeDeTalla(m0, look.contextura).molde;
  const [W, H] = CELDA_VIDEO;
  const ox = Math.round(W / 2 - m.w / 2), oy = PISO_VIDEO - m.h;
  const img = vestirMolde(look, m, W, H, ox, oy);
  if (espejo) espejar(img);
  // puntos: manos (guantes), pies y cabeza
  const busca = (chs: string, masDer: boolean): [number, number] => {
    let best: [number, number] | null = null;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (chs.includes(m.filas[y][x])) {
      if (!best || (masDer ? x > best[0] : x < best[0])) best = [x, y];
    }
    const p: [number, number] = best ? [ox + best[0], oy + best[1]] : [W / 2, PISO_VIDEO - 10];
    return espejo ? [W - p[0], p[1]] : p;
  };
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (img.data[(y * W + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const cabeza = busca('HhRrSE', true);
  return {
    img, ancla: [Math.floor(W / 2), PISO_VIDEO],
    puntos: { manoD: busca('B', true), manoT: busca('B', false), pieD: busca('P', true), pieT: busca('P', false), cabeza, centro: [(x0 + x1) / 2, (y0 + y1) / 2], util: busca('B', true) },
    hurt: [x0, y0, Math.max(1, x1 - x0 + 1), Math.max(1, y1 - y0 + 1)],
  };
}

/** Cuántas líneas de cuerpo pierden las niñas y los niños (la cabeza queda del mismo tamaño). */
const ACORTAR: Partial<Record<Contextura, number>> = { nino: 2, pequena: 4 };
const tallas = new WeakMap<Molde, Map<number, { molde: Molde; dx: number; dy: number }>>();

/**
 * El molde con el cuerpo más corto para los niños: se quitan las líneas más repetidas del torso y las piernas (nunca
 * el cinturón, los pies ni el borde), en la dirección en que va el cuerpo desde la cabeza (de pie, de cabeza o
 * acostado). `dx`/`dy` dicen cuánto correr el molde para que los pies queden donde estaban.
 */
export function moldeDeTalla(m: Molde, contextura: Contextura): { molde: Molde; dx: number; dy: number } {
  const n = ACORTAR[contextura] ?? 0;
  if (!n || !m.cabeza) return { molde: m, dx: 0, dy: 0 };
  let porN = tallas.get(m);
  if (!porN) { porN = new Map(); tallas.set(m, porN); }
  const hecho = porN.get(n);
  if (hecho) return hecho;
  const g = m.filas.map((f) => [...f]);
  let hx = 0, hy = 0, hn = 0, bx = 0, by = 0, bn = 0, h0x = m.w, h1x = -1, h0y = m.h, h1y = -1;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const c = g[y][x];
    if (c === '.') continue;
    if (CABEZA.has(c) && c !== 'k') { hx += x; hy += y; hn++; h0x = Math.min(h0x, x); h1x = Math.max(h1x, x); h0y = Math.min(h0y, y); h1y = Math.max(h1y, y); }
    else if (!CABEZA.has(c)) { bx += x; by += y; bn++; }
  }
  if (!hn || !bn) { const r = { molde: m, dx: 0, dy: 0 }; porN.set(n, r); return r; }
  const vx = bx / bn - hx / hn, vy = by / bn - hy / hn;
  const vertical = Math.abs(vy) >= Math.abs(vx);
  const largo = vertical ? m.h : m.w, ancho = vertical ? m.w : m.h;
  const en = (i: number, j: number) => (vertical ? g[i][j] : g[j][i]);
  // líneas candidatas: del lado del cuerpo, lejos de la cabeza y de la punta (pies)
  const desde = vertical ? (vy > 0 ? h1y + 2 : 2) : (vx > 0 ? h1x + 2 : 2);
  const hasta = vertical ? (vy > 0 ? m.h - 3 : h0y - 2) : (vx > 0 ? m.w - 3 : h0x - 2);
  const cand: [number, number][] = [];
  for (let i = desde; i < Math.min(hasta, largo - 1); i++) {
    let pies = 0, cinto = 0, dif = 0;
    for (let j = 0; j < ancho; j++) { const c = en(i, j); if (c === 'P') pies++; if (c === 'L') cinto++; if (c !== en(i + 1, j)) dif++; }
    if (pies || cinto >= 2) continue;
    cand.push([dif, i]);
  }
  cand.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const quitar: number[] = [];
  for (const [, i] of cand) { if (quitar.length >= n) break; if (quitar.every((q) => Math.abs(q - i) > 1)) quitar.push(i); }
  if (quitar.length < n) for (const [, i] of cand) { if (quitar.length >= n) break; if (!quitar.includes(i)) quitar.push(i); }
  const fuera = new Set(quitar), k = quitar.length;
  const filas = vertical
    ? m.filas.filter((_, y) => !fuera.has(y))
    : m.filas.map((f) => [...f].filter((_, x) => !fuera.has(x)).join(''));
  // si se quitó antes de la cabeza, la cabeza se corre
  const antes = quitar.filter((i) => i < (vertical ? h0y : h0x)).length;
  const cab = { ...m.cabeza, chin: [...m.cabeza.chin] as [number, number] };
  if (vertical) { cab.chin[1] -= antes; cab.top -= antes; } else cab.chin[0] -= antes;
  const molde: Molde = { ...m, filas, w: vertical ? m.w : m.w - k, h: vertical ? m.h - k : m.h, cabeza: cab };
  // los pies quedan quietos: de pie bajan las líneas quitadas; acostado hacia la derecha se corre igual
  const r = { molde, dx: !vertical && vx > 0 ? k : 0, dy: vertical && vy > 0 ? k : 0 };
  porN.set(n, r);
  return r;
}

/** Da vuelta una imagen de izquierda a derecha. */
export function espejar(img: Raster): void {
  const { w: W, h: H } = img;
  for (let y = 0; y < H; y++) for (let x = 0; x < W / 2; x++) for (let c = 0; c < 4; c++) { const a = (y * W + x) * 4 + c, b = (y * W + W - 1 - x) * 4 + c; const t = img.data[a]; img.data[a] = img.data[b]; img.data[b] = t; }
}

/**
 * Viste un molde con el muñeco en una imagen de `W`×`H` con el molde en (ox, oy), mirando a la derecha: cada parte con
 * los colores del muñeco y la cabeza del familiar en el lugar y con el giro de la del molde.
 */
export function vestirMolde(look: ChibiLook, m: Molde, W: number, H: number, ox: number, oy: number): Raster {
  // estampados de la ropa de arriba: rayas y cuadros siguen la grilla del molde
  const pat = look.arriba.estampado ?? 'liso';
  const c2 = hex(look.arriba.color2 ?? '#f4f2ee');
  // los estampados con dibujo (gg, número, corazón...) van como un solo emblema en el pecho: sembrados por pixel
  // salen como puntos sueltos que bailan de un cuadro a otro
  let emblema: Set<number> | null = null;
  if (pat !== 'liso' && pat !== 'rayas' && pat !== 'cuadros') {
    const pecho: [number, number][] = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.filas[y][x] === 'C') pecho.push([x, y]);
    if (pecho.length >= 8) {
      const y0 = Math.min(...pecho.map((p) => p[1]));
      const arriba = pecho.filter((p) => p[1] <= y0 + 3);
      const cx = Math.round(arriba.reduce((s, p) => s + p[0], 0) / arriba.length), cy = y0 + 1;
      emblema = new Set([[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx, dy]) => (cy + dy) * m.w + cx + dx));
    }
  }
  const tinte = (x: number, y: number, ch: string, v: number) => {
    if ((ch === 'C' || ch === 'c') && pat !== 'liso') {
      if (pat === 'rayas' && y % 3 === 0) return ch === 'c' ? sombra(c2) : c2;
      if (pat === 'cuadros' && (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0) return mezcla(v, c2, 0.5);
      if (emblema?.has(y * m.w + x)) return ch === 'c' ? sombra(c2) : c2;
    }
    return v;
  };
  // el sprite tal cual con los colores del muñeco y sus rasgos encima (ver recolor.ts)
  const rc = recolorMolde(look, m, tinte);
  const img = createRaster(W, H);
  const pon1 = (i: number, v: number) => { img.data[i * 4] = (v >> 16) & 255; img.data[i * 4 + 1] = (v >> 8) & 255; img.data[i * 4 + 2] = v & 255; img.data[i * 4 + 3] = 255; };
  for (let Y = 0; Y < rc.h; Y++) for (let X = 0; X < rc.w; X++) {
    const v = rc.col[Y][X];
    if (v === VACIO_RC) continue;
    const x = ox + X - MARGEN, y = oy + Y - MARGEN;
    if (x >= 0 && y >= 0 && x < W && y < H) pon1(y * W + x, v);
  }
  quitarIslas(img, 40);
  // huequitos encerrados (entre el mentón y los hombros, o donde el calco dejó un pixel vacío): se tapan con el color de al lado
  taparHuecos(img, 4);
  return img;
}

/** Animaciones calcadas del video, en el formato de clips del motor (dx avance, dy altura, ticks a 60). */
export const CLIPS_VIDEO_NOMBRES: Record<string, [string, string]> = {
  reposo: ['Reposo', 'Idle'], caminar: ['Caminar', 'Walk'], caminar_guardia: ['Avanzar en guardia', 'Guard step'], caminar_atras: ['Retroceder', 'Walk back'],
  golpe_debil: ['Golpe', 'Punch'], antiaereo: ['Patada antiaérea', 'Anti-air kick'], poder: ['Poder', 'Fireball'], barrida: ['Barrida', 'Sweep'],
  agarrar: ['Agarrar y lanzar', 'Throw'], uppercut_corto: ['Gancho y patada', 'Uppercut and kick'], uppercut: ['Uppercut volador', 'Rising uppercut'],
  torbellino: ['Patada torbellino', 'Hurricane kick'], golpeado_aire: ['Golpeado en el aire', 'Juggled'], saltar: ['Saltar', 'Jump'], salto_atras: ['Salto atrás', 'Back jump'], golpe_aire: ['Golpe en el aire', 'Jumping punch'],
  salto_adelante: ['Salto adelante', 'Forward jump'], salto_patada: ['Salto con patada', 'Jump kick'], recibir_poder: ['Recibe el poder', 'Hit by fireball'],
  patada_agachado: ['Patada agachado', 'Crouching kick'], caer: ['Caer', 'Knockdown'], levantarse: ['Levantarse', 'Get up'], ko: ['KO', 'KO'],
  victoria: ['Victoria', 'Victory'], festejo: ['Festejo', 'Celebrate'],
  // la hoja de sprites de Ryu: cada fila es una animación limpia, cuadro por cuadro
  hoja_reposo: ['Hoja · Reposo', 'Sheet · Idle'], hoja_victoria: ['Hoja · Victoria', 'Sheet · Victory'], hoja_caminar: ['Hoja · Caminar', 'Sheet · Walk'],
  hoja_golpe: ['Hoja · Golpe', 'Sheet · Punch'], hoja_agarrar: ['Hoja · Agarrar', 'Sheet · Grab'], hoja_patada: ['Hoja · Patada alta', 'Sheet · High kick'],
  hoja_agachado: ['Hoja · Agachado', 'Sheet · Crouch'], hoja_barrida: ['Hoja · Barrida', 'Sheet · Sweep'], hoja_hadouken: ['Hoja · Hadouken', 'Sheet · Hadouken'],
  hoja_shoryuken: ['Hoja · Shoryuken', 'Sheet · Shoryuken'], hoja_antiaereo: ['Hoja · Patada antiaérea', 'Sheet · Anti-air kick'], hoja_golpeado: ['Hoja · Golpeado', 'Sheet · Hit'],
  hoja_caida: ['Hoja · Caída', 'Sheet · Knockdown'],
  // del segundo video (el bonus de los barriles)
  golpe_agachado: ['Golpe agachado', 'Crouching punch'], golpe_barril: ['Golpe al barril', 'Barrel punch'],
  patada_giro: ['Patada con giro', 'Spin kick'], shoryuken_barril: ['Uppercut al barril', 'Barrel uppercut'], perfect: ['¡Perfect!', 'Perfect!'],
};
const GOLPES = D.golpes, N = D.nombres;

let clipsCache: Clip[] | null = null;
export function clipsVideo(): Clip[] {
  if (clipsCache) return clipsCache;
  const out: Clip[] = [];
  for (const [id, c] of Object.entries(D.clips)) {
    let prevX = 0;
    const cuadros: Cuadro[] = c.cuadros.map(([pose, t, x, dy, esp], i) => {
      const dx = i === 0 ? 0 : x - prevX;
      prevX = x;
      const q: Cuadro = { p: { molde: pose, espejo: esp, gesto: GESTOS[id] }, t, dx, dy };
      if (GOLPES[id]?.includes(pose)) q.golpe = ['golpe_debil', 'uppercut', 'golpe_fuerte', 'golpe_agachado', 'golpe_barril', 'shoryuken_barril'].includes(id) || (id === 'uppercut_corto' && GOLPES[id][0] === pose) ? 'manoD' : 'pieD';
      if (id === 'poder' && pose === D.extra.poder_suelta && !c.cuadros.slice(0, i).some((x) => x[0] === pose)) q.fx = { id: 'poder', en: 'manoD', dx: 4 };
      if ((id === 'caer' || id === 'ko') && i === c.cuadros.length - 1) q.fx = { id: 'polvo', en: 'centro' };
      return q;
    });
    // en los bucles el primer cuadro devuelve lo avanzado por el ciclo
    if (c.loop && cuadros.length > 1) cuadros[0].dx = Math.max(0, c.cuadros[c.cuadros.length - 1][2] - c.cuadros[0][2]) / (c.cuadros.length - 1) || 0;
    out.push({ id, nombre: CLIPS_VIDEO_NOMBRES[id] ?? [id, id], grupo: 'pelea', loop: c.loop, cuadros });
  }
  // los que faltan en el video se arman con poses del video
  const A = (id: string, es: string, en: string, loop: boolean, fr: [string, number, Partial<Cuadro>?][], gesto?: Gesto, grupo: Clip['grupo'] = 'pelea') =>
    out.push({ id, nombre: [es, en], grupo, loop, cuadros: fr.map(([pose, t, extra]) => ({ p: { molde: pose, gesto }, t, ...(extra ?? {}) })) });
  A('agacharse', 'Agacharse', 'Crouch', false, [[N.agacharse, 4], [N.agachado, 8]]);
  A('agachado', 'Agachado', 'Crouching', true, [[N.agachado, 30]]);
  A('bloquear', 'Bloquear', 'Block', true, [[N.bloquear, 30]], 'bravo');
  A('recibir_alto', 'Recibe golpe', 'Hit', false, [[N.recibe1, 8, { dx: -2, sonido: 'golpe' }], [N.recibe2, 4, { dx: -1 }], [N.recibe3, 6]], 'dolor');
  A('golpe_fuerte', 'Golpe fuerte', 'Strong punch', false, [[N.golpef1, 4], [N.golpef2, 8, { golpe: 'manoD', sonido: 'whoosh_fuerte' }], [N.golpef3, 6]], 'golpe');
  A('patada_fuerte', 'Patada fuerte', 'Strong kick', false, [[N.patadaf1, 4], [N.patadaf2, 10, { golpe: 'pieD', sonido: 'whoosh_fuerte' }], [N.patadaf3, 6]], 'golpe');
  A('mareado', 'Mareado', 'Dizzy', true, [[N.recibe1, 10, { fx: { id: 'mareo', en: 'cabeza', dy: -6 } }], [N.recibe3, 10]], 'ko');
  A('lanzado', 'Lo lanzan', 'Thrown', false, [[N.lanz1, 6, { dy: 10, dx: -3 }], [N.lanz2, 4, { dy: 18, dx: -4 }], [N.lanz3, 4, { dy: 18, dx: -4 }], [N.lanz4, 4, { dy: 10, dx: -4 }], [N.lanz5, 20, { apoyar: true, fx: { id: 'polvo', en: 'centro' } }]], 'dolor');
  // correr: la caminata del video a doble ritmo
  const cam = out.find((c) => c.id === 'caminar');
  if (cam) out.push({ id: 'correr', nombre: ['Correr', 'Run'], grupo: 'beat', loop: true, cuadros: cam.cuadros.map((q) => ({ ...q, t: Math.max(2, Math.round(q.t / 2)), dx: (q.dx ?? 0) * 1.6 })) });
  clipsCache = out;
  return out;
}

declare module './body' {
  interface Pose { molde?: string }
}

/** Escala 2x limpia (Scale2x / EPX): para la talla grande sin perder los bordes del pixel art. */
export function escala2x(r: Raster): Raster {
  const out = createRaster(r.w * 2, r.h * 2);
  const px = (x: number, y: number) => {
    x = Math.max(0, Math.min(r.w - 1, x)); y = Math.max(0, Math.min(r.h - 1, y));
    const i = (y * r.w + x) * 4;
    return (r.data[i] << 24 | r.data[i + 1] << 16 | r.data[i + 2] << 8 | r.data[i + 3]) >>> 0;
  };
  const put = (x: number, y: number, v: number) => { const i = (y * out.w + x) * 4; out.data[i] = v >>> 24; out.data[i + 1] = (v >>> 16) & 255; out.data[i + 2] = (v >>> 8) & 255; out.data[i + 3] = v & 255; };
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const P = px(x, y), A = px(x, y - 1), B = px(x + 1, y), C = px(x - 1, y), Dd = px(x, y + 1);
    let e0 = P, e1 = P, e2 = P, e3 = P;
    if (C === A && C !== Dd && A !== B) e0 = A;
    if (A === B && A !== C && B !== Dd) e1 = B;
    if (Dd === C && Dd !== B && C !== A) e2 = C;
    if (B === Dd && B !== A && Dd !== C) e3 = Dd;
    put(x * 2, y * 2, e0); put(x * 2 + 1, y * 2, e1); put(x * 2, y * 2 + 1, e2); put(x * 2 + 1, y * 2 + 1, e3);
  }
  return out;
}
