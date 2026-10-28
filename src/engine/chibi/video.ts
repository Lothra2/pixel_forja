import { createRaster, type Raster } from '../core/raster';
import type { ChibiLook, Contextura, Silueta } from './look';
import type { Gesto } from './head';
import { MARGEN } from './cabezaMolde';
import { recolorMolde, VACIO_RC } from './recolor';
import { hex, sombra, mezcla } from './paint';
import type { Clip, Cuadro, Punto } from './clips';
import DATA from './video/moldes.json';
import { posesDibujadas } from './posesDibujadas';

/**
 * Los moldes del video: cada pose de Ryu y Ken calcada pixel por pixel del video de referencia (@DAVE.XP, chibis de
 * Street Fighter), a su resolución real (un pixel del juego eran 4 del video) y con los tiempos reales de cada
 * movimiento. Cada pixel del molde dice qué es (contorno, piel del brazo, ropa de arriba, cinturón, guante, pie,
 * pelo, cara...). Para vestir a la familia se pinta cada parte con los colores del muñeco, se quita la cabeza del
 * molde y se pone la cabeza del familiar en el mismo lugar y girada igual. Los puños quedan por delante de la cara.
 */

interface InfoCabeza { k: number; chin: [number, number]; top: number; ancho: number; espalda: boolean; cara: number; frente?: boolean; recto?: boolean }
export interface Molde { w: number; h: number; filas: string[]; cabeza: InfoCabeza | null; espejo: boolean }
type CuadroMolde = [string, number, number, number, boolean];
interface Datos { poses: Record<string, Molde>; clips: Record<string, { loop: boolean; cuadros: CuadroMolde[] }>; nombres: Record<string, string>; golpes: Record<string, string[]>; extra: { poder_suelta: string } }
const D = DATA as unknown as Datos;

export const MOLDES = D.poses;

/**
 * Las extremidades de goma de Dhalsim: a un molde de golpe o de patada se le repite la columna del antebrazo o de la
 * pierna `n` veces, así el puño o el pie llegan más lejos con el mismo dibujo. `banda` son las filas del miembro y
 * `x0` la columna que se repite; `mas` son otros trozos (el pie que va de punta) que viajan enteros con la punta.
 * Se rellena el mismo ancho a la izquierda para que el cuerpo no se corra al centrar el molde.
 */
interface Estirada { banda: [number, number]; x0: number; mas?: [number, number, number][] }
export const ESTIRADAS: Record<string, Estirada> = {
  h56: { banda: [10, 14], x0: 15 }, // puño de pie
  h24: { banda: [18, 20], x0: 17, mas: [[13, 17, 21]] }, // patada de pie: la pierna y el pie en punta
  h54: { banda: [17, 22], x0: 20 }, // patada agachado
};
export function estirarMolde(m: Molde, e: Estirada, n: number): Molde {
  const filas = m.filas.map((f, y) => {
    const dentro = (y >= e.banda[0] && y <= e.banda[1]) ? e.x0 : (e.mas ?? []).find(([a, b]) => y >= a && y <= b)?.[2] ?? -1;
    const cuerpo = dentro < 0 ? f + '.'.repeat(n) : f.slice(0, dentro) + (y >= e.banda[0] && y <= e.banda[1] ? f[e.x0].repeat(n) : '.'.repeat(n)) + f.slice(dentro);
    return '.'.repeat(n) + cuerpo;
  });
  const cabeza = m.cabeza ? { ...m.cabeza, chin: [m.cabeza.chin[0] + n, m.cabeza.chin[1]] as [number, number] } : null;
  return { w: m.w + 2 * n, h: m.h, filas, cabeza, espejo: m.espejo };
}
/** Cuánto se estira: hasta 16 columnas, lo que cabe en la celda del video. */
export const ESTIRES = [4, 8, 12, 16];
for (const [id, e] of Object.entries(ESTIRADAS)) for (const n of ESTIRES) MOLDES[`${id}_e${n}`] = estirarMolde(MOLDES[id], e, n);
// las poses dibujadas para los estilos (torpedo, sonic boom, lariat, bola, palmas, electricidad, patada giratoria)
Object.assign(MOLDES, posesDibujadas(MOLDES));
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
  const m = moldeDeSilueta(moldeDeTalla(m0, look.contextura).molde, look.silueta);
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
  // el pie que pega: el pixel de pie, piel o pantalón que más adelante llega (el pie de apoyo nunca es el que patea);
  // se toma el medio de esa columna
  const punta = (): [number, number] => {
    let bx = -1, ya = 0, yb = 0;
    for (let x = m.w - 1; x >= 0 && bx < 0; x--) for (let y = 0; y < m.h; y++) if ('PAdD'.includes(m.filas[y][x])) { if (bx < 0) { bx = x; ya = y; } yb = y; }
    if (bx < 0) return busca('P', true);
    const p: [number, number] = [ox + bx, oy + Math.round((ya + yb) / 2)];
    return espejo ? [W - p[0], p[1]] : p;
  };
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (img.data[(y * W + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const cabeza = busca('HhRrSE', true);
  return {
    img, ancla: [Math.floor(W / 2), PISO_VIDEO],
    puntos: { manoD: busca('BM', true), manoT: busca('BM', false), pieD: punta(), pieT: busca('P', false), cabeza, centro: [(x0 + x1) / 2, (y0 + y1) / 2], util: busca('BM', true) },
    hurt: [x0, y0, Math.max(1, x1 - x0 + 1), Math.max(1, y1 - y0 + 1)],
  };
}

/**
 * La silueta de un estilo: ancho (Zangief, Honda) repite dos veces la columna del medio de cada fila, flaco (Dhalsim)
 * quita las dos del medio. Donde el medio es un hueco entre las piernas, el hueco se abre o se cierra. Solo con el
 * cuerpo de pie bajo la cabeza; acostado o de cabeza el molde queda igual.
 */
const siluetas = new WeakMap<Molde, Map<Silueta, Molde>>();
export function moldeDeSilueta(m: Molde, s?: Silueta): Molde {
  if (!s || !m.cabeza || m.cabeza.recto) return m;
  let c = siluetas.get(m);
  if (!c) { c = new Map(); siluetas.set(m, c); }
  const hecho = c.get(s);
  if (hecho) return hecho;
  // de pie: la cabeza (pelo) arriba del cuerpo
  let yCab = -1, yCue = m.h;
  for (let y = 0; y < m.h; y++) for (const ch of m.filas[y]) { if (ch === 'H') yCab = Math.max(yCab, y); if ('CDLP'.includes(ch)) yCue = Math.min(yCue, y); }
  if (yCab < 0 || yCue <= yCab - 6) { c.set(s, m); return m; }
  const filas = m.filas.map((f) => {
    const a = f.search(/[^.]/), b = f.length - 1 - [...f].reverse().findIndex((ch) => ch !== '.');
    if (a < 0) return s === 'fornido' ? f + '..' : f.slice(2);
    const mid = Math.floor((a + b) / 2);
    // una fila angosta (la punta del pelo) solo se corre un pixel hacia el medio
    if (b - a < 4) return s === 'fornido' ? '.' + f + '.' : b < f.length - 1 && a > 0 ? f.slice(1, -1) : f.slice(2);
    return s === 'fornido' ? f.slice(0, mid) + f[mid] + f[mid] + f.slice(mid) : f.slice(0, mid - 1) + f.slice(mid + 1);
  });
  const w = Math.max(...filas.map((f) => f.length));
  const out: Molde = { ...m, w, filas: filas.map((f) => f.padEnd(w, '.')) };
  c.set(s, out);
  return out;
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
      if (id === 'poder' && pose === D.extra.poder_suelta && !c.cuadros.slice(0, i).some((x) => x[0] === pose)) { q.fx = { id: 'poder', en: 'manoD', dx: 4 }; q.sonido = 'poder'; }
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
  // ---- los estilos de los otros luchadores clásicos, armados con las poses limpias de Ryu (h#) y de Ken (kc#)
  type Ex = Partial<Cuadro>;
  const P = (pose: string, t: number, extra?: Ex): [string, number, Ex?] => [pose, t, extra];
  const rep = (n: number, fr: [string, number, Ex?][]) => Array.from({ length: n }, () => fr).flat();
  const copia = (de: string, id: string, es: string, en: string, f: (q: Cuadro, i: number) => Cuadro) => { const c = out.find((x) => x.id === de); if (c) out.push({ ...c, id, nombre: [es, en], cuadros: c.cuadros.map(f) }); };
  // Ken: el shoryuken con chispas de fuego en el puño
  copia('uppercut', 'shoryuken_ken', 'Shoryuken de fuego', 'Fire shoryuken', (q, i) => (q.golpe ? { ...q, fx: { id: 'fuego_puno', en: 'manoD', dx: 1 } } : i === 4 ? { ...q, sonido: 'whoosh_fuerte' } : q));
  // Chun-Li
  A('kikoken', 'Kikoken', 'Kikoken', false, [P('h33', 4), P('h34', 4), P('h35', 4), P('h36', 6, { fx: { id: 'kikoken', en: 'manoD', dx: 4 }, sonido: 'poder' }), P('h37', 14), P('h47', 4)], 'golpe');
  A('patadas_relampago', 'Patadas relámpago', 'Lightning legs', false, [P('h22', 3), ...rep(4, [P('h23', 2, { golpe: 'pieD' }), P('h24', 2, { golpe: 'pieD', fx: { id: 'estela_patada', en: 'pieD' } }), P('h25', 2, { golpe: 'pieD', sonido: 'whoosh' }), P('h24', 2, { golpe: 'pieD' })]), P('h22', 4)], 'golpe');
  A('patada_giratoria', 'Patada giratoria', 'Spinning bird kick', false, [P('kc19', 3), P('kc15', 3, { dy: 8, dx: 2 }), ...rep(4, [P('giratoria1', 3, { dy: 16, dx: 5, golpe: 'pieD', fx: { id: 'estela_patada', en: 'pieD' }, sonido: 'whoosh' }), P('giratoria2', 3, { dy: 17, dx: 5, golpe: 'pieD' })]), P('kc17', 3, { dy: 8, dx: 2 }), P('kc56', 4, { dy: 0 }), P('h47', 3)], 'golpe');
  A('patada_alta', 'Patada alta', 'High kick', false, [P('h22', 3), P('h23', 3), P('h24', 8, { golpe: 'pieD', sonido: 'whoosh_fuerte' }), P('h25', 4), P('h27', 4)], 'golpe');
  // Guile
  A('sonic_boom', 'Sonic Boom', 'Sonic Boom', false, [P('h33', 3), P('h34', 3), P('sonic_brazo', 5, { fx: { id: 'sonic', en: 'manoD', dx: 5 }, sonido: 'poder' }), P('sonic_brazo', 8), P('h37', 4), P('h47', 4)], 'golpe');
  copia('antiaereo', 'flash_kick', 'Flash Kick', 'Flash Kick', (q, i) => ({ ...q, dy: (q.dy ?? 0) + (i > 2 && i < 12 ? 10 : 0), fx: q.golpe ? { id: 'estela_patada', en: 'pieD' } : q.fx }));
  // Blanka
  A('electricidad', 'Electricidad', 'Electricity', false, [P('electrico', 3, { fx: { id: 'rayo_blanka', en: 'centro' }, sonido: 'poder' }), ...rep(3, [P('electrico', 3, { dx: 1 }), P('electrico', 3, { dx: -1 })]), P('h47', 4)], 'bravo');
  A('rodar', 'Rodar', 'Rolling attack', false, [P('bola1', 3), ...rep(6, [P('bola1', 3, { dx: 8, dy: 2, golpe: 'cuerpo' }), P('bola2', 3, { dx: 8, dy: 0, golpe: 'cuerpo', fx: { id: 'polvo', en: 'centro', dx: -6 } })]), P('bola1', 3), P('h47', 4)], 'golpe');
  A('rodar_alto', 'Rodar hacia arriba', 'Vertical roll', false, [P('bola1', 3), P('bola2', 4, { dy: 14, dx: 2, golpe: 'cuerpo' }), P('bola1', 4, { dy: 30, dx: 2, golpe: 'cuerpo' }), P('bola2', 4, { dy: 36, dx: 2, golpe: 'cuerpo' }), P('bola1', 4, { dy: 30, dx: 2 }), P('bola2', 4, { dy: 14, dx: 2 }), P('bola1', 6, { dy: 0, fx: { id: 'polvo', en: 'centro' } }), P('h47', 4)], 'golpe');
  A('mordida', 'Mordida', 'Bite', false, [P('h50', 4), P('h51', 6, { golpe: 'manoD' }), P('h52', 8), P('h47', 4)], 'esfuerzo');
  // E. Honda
  A('cien_manos', 'Cien manos', 'Hundred hand slap', false, [P('h55', 2), ...rep(5, [P('palma1', 2, { golpe: 'manoD', fx: { id: 'estela_manos', en: 'manoD', dx: 3 } }), P('palma2', 2, { golpe: 'manoD' })]), P('h47', 4)], 'golpe');
  A('cabezazo', 'Cabezazo', 'Headbutt', false, [P('kc19', 4), ...rep(3, [P('torpedo_honda', 3, { dx: 14, dy: 8, golpe: 'cabeza', sonido: 'whoosh_fuerte', fx: { id: 'estela_manos', en: 'centro', dx: -14 } }), P('torpedo_honda', 3, { dx: 14, dy: 7, golpe: 'cabeza' })]), P('torpedo_honda', 4, { dx: 6, dy: 3 }), P('h9', 5, { dy: 0, fx: { id: 'polvo', en: 'centro' } }), P('h47', 5)], 'golpe');
  A('sumo_pisoton', 'Pisotón de sumo', 'Sumo stomp', false, [P('h53', 5), P('kc17', 6, { dy: 18 }), P('kc17', 6, { dy: 30 }), P('kc17', 6, { dy: 18 }), P('h53', 8, { dy: 0, golpe: 'cuerpo', fx: { id: 'polvo', en: 'centro' }, sonido: 'caer' }), P('h47', 4)], 'golpe');
  // Zangief
  A('lariat', 'Lariat', 'Lariat', false, [...rep(5, [P('lariat1', 3, { dx: 2, golpe: 'manoD', fx: { id: 'estela_manos', en: 'manoD' }, sonido: 'whoosh' }), P('kc4', 3, { dx: 2 }), P('lariat2', 3, { dx: 2, golpe: 'manoD', fx: { id: 'estela_manos', en: 'manoT' } }), P('kc7', 3, { dx: 2 })]), P('h47', 4)], 'golpe');
  A('golpe_oso', 'Golpe de oso', 'Bear punch', false, [P('h15', 4), P('h16', 4), P('h17', 8, { dy: 8, golpe: 'manoD', sonido: 'whoosh_fuerte' }), P('h18', 6, { dy: 10 }), P('h21', 6, { dy: 0 }), P('h47', 4)], 'golpe');
  A('piledriver', 'Piledriver', 'Piledriver', false, [P('h50', 4), P('h51', 4), P('kc15', 5, { dy: 12 }), P('kc16', 5, { dy: 26 }), P('kc17', 5, { dy: 30 }), P('kc16', 5, { dy: 18 }), P('kc15', 4, { dy: 6 }), P('h9', 10, { dy: 0, fx: { id: 'polvo', en: 'centro' }, sonido: 'caer' }), P('h47', 4)], 'esfuerzo');
  // Dhalsim
  A('yoga_fire', 'Yoga Fire', 'Yoga Fire', false, [P('h33', 4), P('h34', 4), P('h36', 6, { fx: { id: 'yoga_fire', en: 'manoD', dx: 4 }, sonido: 'poder' }), P('h37', 12), P('h47', 4)], 'golpe');
  const est = (base: string, n: number) => `${base}_e${n}`;
  A('yoga_golpe', 'Puño estirado', 'Stretch punch', false, [P('h55', 2), P(est('h56', 4), 2), P(est('h56', 12), 2, { golpe: 'manoD' }), P(est('h56', 16), 6, { golpe: 'manoD', sonido: 'whoosh' }), P(est('h56', 8), 2), P('h55', 3)], 'golpe');
  A('yoga_golpe_fuerte', 'Puño estirado fuerte', 'Strong stretch punch', false, [P('h55', 3), P(est('h56', 8), 2), P(est('h56', 16), 10, { golpe: 'manoD', sonido: 'whoosh_fuerte' }), P(est('h56', 12), 2), P(est('h56', 4), 2), P('h55', 4)], 'golpe');
  A('yoga_patada', 'Patada estirada', 'Stretch kick', false, [P('h22', 3), P('h23', 2), P(est('h24', 8), 2, { golpe: 'pieD' }), P(est('h24', 16), 8, { golpe: 'pieD', sonido: 'whoosh_fuerte' }), P(est('h24', 8), 2), P('h25', 3), P('h27', 3)], 'golpe');
  A('yoga_patada_baja', 'Patada baja estirada', 'Low stretch kick', false, [P('h53', 3), P(est('h54', 8), 2, { golpe: 'pieD' }), P(est('h54', 16), 8, { golpe: 'pieD', sonido: 'whoosh_fuerte' }), P(est('h54', 8), 2), P('h53', 4)], 'golpe');
  A('yoga_flame', 'Yoga Flame', 'Yoga Flame', false, [P('h33', 4), P('h34', 3), P('h36', 4, { fx: { id: 'yoga_flame', en: 'manoD', dx: 12 }, sonido: 'poder' }), P('h37', 18), P('h47', 4)], 'golpe');
  // Balrog
  A('puno_carrera', 'Puño con carrera', 'Dash straight', false, [P('h38', 2, { dx: 8 }), P('h39', 2, { dx: 8 }), P('h40', 2, { dx: 8 }), P('h41', 2, { dx: 8 }), P(N.golpef1, 2, { dx: 4 }), P(N.golpef2, 8, { dx: 6, golpe: 'manoD', sonido: 'whoosh_fuerte' }), P(N.golpef3, 6), P('h47', 3)], 'golpe');
  A('gancho_giro', 'Gancho con giro', 'Turn punch', false, [P('kc3', 3), P('kc5', 3), P('kc7', 3), P('kc2', 3), P(N.golpef2, 10, { dx: 8, golpe: 'manoD', sonido: 'whoosh_fuerte' }), P(N.golpef3, 6)], 'golpe');
  A('gancho_subida', 'Gancho', 'Dash upper', false, [P('h15', 4), P('h16', 5, { dy: 6, golpe: 'manoD', sonido: 'whoosh_fuerte' }), P('h17', 8, { dy: 12, golpe: 'manoD' }), P('h20', 6, { dy: 6 }), P('h21', 6, { dy: 0 }), P('h47', 3)], 'golpe');
  // Vega
  A('garra', 'Garra', 'Claw', false, [P('h55', 3), P('h56', 8, { golpe: 'manoD', fx: { id: 'garra', en: 'manoD', dx: 7 }, sonido: 'whoosh_fuerte' }), P('h56', 3), P('h55', 4)], 'golpe');
  A('rodar_vega', 'Rodar', 'Roll', false, [P('kc19', 2), P('h6', 3, { dx: 10 }), P('h7', 3, { dx: 10 }), P('h8', 3, { dx: 10 }), P('h9', 4, { dx: 4 }), P('h47', 4)]);
  A('clavado', 'Clavado', 'Dive', false, [P('kc19', 3), P('kc15', 5, { dy: 26, dx: 4 }), P('kc15', 5, { dy: 44, dx: 6 }), P('kc47', 4, { dy: 40, dx: 8 }), P('kc48', 7, { dy: 26, dx: 14, golpe: 'pieD', sonido: 'whoosh_fuerte' }), P('kc48', 6, { dy: 10, dx: 10, golpe: 'pieD' }), P('kc56', 6, { dy: 0 }), P('h47', 4)], 'golpe');
  // Sagat
  A('tiger_shot', 'Tiger Shot', 'Tiger Shot', false, [P('h33', 3), P('h34', 3), P('h36', 6, { fx: { id: 'tiger', en: 'manoD', dx: 4 }, sonido: 'poder' }), P('h37', 12), P('h47', 4)], 'golpe');
  A('tiger_shot_bajo', 'Tiger Shot bajo', 'Low Tiger Shot', false, [P('h53', 4), P('h54', 6, { fx: { id: 'tiger_bajo', en: 'manoD', dx: 4 }, sonido: 'poder' }), P('h54', 10), P('h53', 4), P('h47', 3)], 'golpe');
  copia('uppercut', 'tiger_uppercut', 'Tiger Uppercut', 'Tiger Uppercut', (q) => q);
  A('tiger_knee', 'Tiger Knee', 'Tiger Knee', false, [P('kc19', 3), P('kc47', 8, { dy: 12, dx: 16, golpe: 'pieD', sonido: 'whoosh_fuerte' }), P('kc48', 8, { dy: 8, dx: 10, golpe: 'pieD' }), P('kc56', 5, { dy: 0 }), P('h47', 3)], 'golpe');
  // M. Bison
  A('psycho_crusher', 'Psycho Crusher', 'Psycho Crusher', false, [P('kc15', 4, { dy: 6, sonido: 'poder' }), ...rep(4, [P('torpedo_bison', 4, { dy: 10, dx: 14, golpe: 'manoD', fx: { id: 'llama_psycho', en: 'centro', dx: -10 } }), P('torpedo_bison', 4, { dy: 11, dx: 14, golpe: 'manoD', fx: { id: 'llama_psycho', en: 'centro', dx: 2 } })]), P('h9', 6, { dy: 0, fx: { id: 'polvo', en: 'centro' } }), P('h47', 4)], 'golpe');
  A('patada_tijera', 'Patada tijera', 'Scissor kick', false, [P('kc19', 3), P('kc47', 5, { dy: 14, dx: 10, golpe: 'pieD', sonido: 'whoosh_fuerte' }), P('h24', 6, { dy: 18, dx: 12, golpe: 'pieD' }), P('kc48', 6, { dy: 12, dx: 10, golpe: 'pieD' }), P('kc56', 6, { dy: 0 }), P('h47', 4)], 'golpe');
  A('cabezazo_bison', 'Pisotón de cabeza', 'Head stomp', false, [P('kc19', 3), P('kc15', 4, { dy: 16, dx: 6, sonido: 'whoosh' }), P('kc16', 4, { dy: 30, dx: 8 }), P('kc17', 6, { dy: 22, dx: 10, golpe: 'pieD' }), P('kc17', 6, { dy: 8, dx: 8, golpe: 'pieD' }), P('kc56', 5, { dy: 0, fx: { id: 'polvo', en: 'centro' } }), P('h47', 3)], 'golpe');
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
