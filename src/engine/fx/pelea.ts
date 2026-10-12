import { createRaster, type Raster } from '../core/raster';
import { Pix, rng } from './pix';
import type { EffectDef } from './catalog';

/**
 * Efectos de la pelea (lote P1): onomatopeyas de cómic con su estallido, el K.O. de pantalla completa, el destello de la
 * guardia y las líneas de esfuerzo del agarre. Letras dibujadas a mano en bloques, sin fuentes de nadie.
 */

const INK = '#1a1020';
const TAU = Math.PI * 2;

/** Letras de cómic de 5 x 7 (gruesas, para leerse chicas). */
export const GLIFOS: Record<string, string[]> = {
  P: ['####.', '##.##', '##.##', '####.', '##...', '##...', '##...'],
  O: ['.###.', '##.##', '##.##', '##.##', '##.##', '##.##', '.###.'],
  W: ['##.##', '##.##', '##.##', '##.##', '#####', '#####', '##.##'],
  A: ['.###.', '##.##', '##.##', '#####', '##.##', '##.##', '##.##'],
  F: ['#####', '##...', '##...', '####.', '##...', '##...', '##...'],
  C: ['.####', '##...', '##...', '##...', '##...', '##...', '.####'],
  R: ['####.', '##.##', '##.##', '####.', '##.##', '##.##', '##.##'],
  K: ['##.##', '##.##', '####.', '###..', '####.', '##.##', '##.##'],
  M: ['##.##', '#####', '#####', '##.##', '##.##', '##.##', '##.##'],
  V: ['##...##', '##...##', '.##.##.', '.##.##.', '..###..', '..###..', '...#...'],
  S: ['.####', '##...', '##...', '.###.', '...##', '...##', '####.'],
  N: ['##.##', '###.#', '#####', '#####', '##.##', '##.##', '##.##'],
  Ñ: ['.####', '.....', '##.##', '###.#', '#####', '##.##', '##.##'],
  '!': ['.##', '.##', '.##', '.##', '.##', '...', '.##'],
  '¡': ['.##', '...', '.##', '.##', '.##', '.##', '.##'],
  '.': ['...', '...', '...', '...', '...', '.##', '.##'],
};

/** Ancho de un texto en bloques (letras de 5 con 1 de espacio). */
export const anchoTexto = (t: string) => [...t].reduce((s, ch) => s + (GLIFOS[ch]?.[0].length ?? 3) + 1, -1);

/**
 * Escribe un texto en bloques de `b` px con contorno y sombra: relleno con degradé de `arriba` a `abajo`, contorno de
 * tinta y la sombra corrida abajo a la derecha. (x, y) es la esquina de arriba a la izquierda.
 */
export function letras(p: Pix, t: string, x: number, y: number, b: number, arriba: string, abajo: string, sombra: string) {
  const celdas: [number, number][] = [];
  let cx = 0;
  for (const ch of t) {
    const g = GLIFOS[ch];
    if (g) g.forEach((row, j) => [...row].forEach((v, i) => { if (v === '#') celdas.push([cx + i, j]); }));
    cx += (g?.[0].length ?? 3) + 1;
  }
  const lleno = new Set(celdas.map(([i, j]) => `${i},${j}`));
  const pintaBloque = (i: number, j: number, ox: number, oy: number, c: string) => p.rect(x + i * b + ox, y + j * b + oy, b, b, c);
  // sombra y contorno: un bloque de tinta alrededor de cada bloque, después la sombra corrida
  for (const [i, j] of celdas) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) if (!lleno.has(`${i + dx},${j + dy}`)) p.rect(x + i * b + dx * Math.ceil(b / 2), y + j * b + dy * Math.ceil(b / 2), b, b, INK);
  for (const [i, j] of celdas) pintaBloque(i, j, Math.max(1, Math.round(b / 2)), Math.max(1, Math.round(b / 2)), sombra);
  for (const [i, j] of celdas) pintaBloque(i, j, 0, 0, j < 3 ? arriba : abajo);
  // brillo arriba a la izquierda de cada letra
  for (const [i, j] of celdas) if (!lleno.has(`${i},${j - 1}`) && b >= 2) p.rect(x + i * b, y + j * b, Math.max(1, b - 1), 1, '#ffffff');
}

/** Estallido de cómic: estrella dentada de `puntas` puntas, con borde de tinta. */
export function estallido(p: Pix, cx: number, cy: number, r0: number, r1: number, puntas: number, fondo: string, borde: string, giro = 0) {
  const dentro = (x: number, y: number) => {
    const a = Math.atan2(y - cy, (x - cx) * 0.8) - giro, d = Math.hypot((x - cx) * 0.8, y - cy);
    const t = ((a / TAU) * puntas % 1 + 1) % 1, rr = r0 + (r1 - r0) * Math.abs(1 - 2 * t);
    return d <= rr;
  };
  for (let y = Math.floor(cy - r1 - 2); y <= cy + r1 + 2; y++) for (let x = Math.floor(cx - r1 * 1.3 - 2); x <= cx + r1 * 1.3 + 2; x++) {
    if (!dentro(x, y)) continue;
    const edge = !dentro(x - 1, y) || !dentro(x + 1, y) || !dentro(x, y - 1) || !dentro(x, y + 1);
    p.px(x, y, edge ? INK : fondo);
  }
  // segundo borde de color adentro
  for (let y = Math.floor(cy - r1); y <= cy + r1; y++) for (let x = Math.floor(cx - r1 * 1.3); x <= cx + r1 * 1.3; x++) {
    const a = Math.atan2(y - cy, (x - cx) * 0.8) - giro, d = Math.hypot((x - cx) * 0.8, y - cy);
    const t = ((a / TAU) * puntas % 1 + 1) % 1, rr = r0 + (r1 - r0) * Math.abs(1 - 2 * t);
    if (d <= rr - 1 && d > rr - 3) p.px(x, y, borde);
  }
}

/** Escala un cuadro dibujado (vecino más cercano) alrededor de su centro: para el rebote de entrada. */
function escalado(src: Raster, k: number): Raster {
  const out = createRaster(src.w, src.h), cx = src.w / 2, cy = src.h / 2;
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const sx = Math.floor(cx + (x + 0.5 - cx) / k), sy = Math.floor(cy + (y + 0.5 - cy) / k);
    if (sx < 0 || sy < 0 || sx >= src.w || sy >= src.h) continue;
    const i = (sy * src.w + sx) * 4;
    if (src.data[i + 3]) out.data.set(src.data.subarray(i, i + 4), (y * src.w + x) * 4);
  }
  return out;
}

/** Copia un raster al lienzo del efecto. */
function pega(p: Pix, r: Raster) { p.r.data.set(r.data); }

/**
 * Onomatopeya de cómic: el estallido con las letras encima. Entra con rebote (chica, grande, se acomoda) y en el último
 * cuadro se empieza a ir. 6 cuadros.
 */
function onomatopeya(texto: string, colores: { fondo: string; borde: string; arriba: string; abajo: string; sombra: string }, puntas = 12): EffectDef['draw'] {
  const ESC = [0.45, 1.2, 0.92, 1.04, 1, 0.94];
  return (p, k) => {
    const base = new Pix(p.w, p.h), b = 2, tw = anchoTexto(texto) * b, th = 7 * b;
    estallido(base, p.w / 2, p.h / 2, p.h * 0.32, p.h * 0.48, puntas, colores.fondo, colores.borde, k * 0.08);
    letras(base, texto, Math.round((p.w - tw) / 2), Math.round((p.h - th) / 2) - 1, b, colores.arriba, colores.abajo, colores.sombra);
    pega(p, escalado(base.r, ESC[k] ?? 1));
    // el último cuadro se rompe en bloques para irse
    if (k === 5) { const R = rng(7); for (let i = 0; i < p.w * p.h * 0.12; i++) p.clear(Math.floor(R() * p.w), Math.floor(R() * p.h)); }
  };
}

/**
 * K.O. de pantalla completa: un destello blanco, las letras que caen desde grandes y se clavan, rayos que giran detrás
 * y astillas que salen volando. Se queda quieto los últimos cuadros. 12 cuadros.
 */
function koGrande(p: Pix, k: number) {
  const W = p.w, H = p.h, cx = W / 2, cy = H * 0.45, R = rng(31);
  // rayos detrás: cuñas alternadas que giran despacio
  if (k >= 1) {
    const n = 18, giro = k * 0.05, rmax = Math.hypot(W, H) * (k < 3 ? 0.3 + k * 0.2 : 0.75);
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      const dx = x - cx, dy = (y - cy) * 1.4, d = Math.hypot(dx, dy);
      // solo un anillo alrededor de las letras, con tramado abierto: los que pelean se siguen viendo
      if (d > rmax || d < 125 || d > 300) continue;
      const a = Math.atan2(dy, dx) + giro, s = Math.floor(((a / TAU) * n % 1 + 1) % 1 * 2);
      const dens = d < 200 ? 2 : 4;
      if (s === 0 && (x % dens === 0) && (y % 2 === (x / dens) % 2)) p.px(x, y, d < 200 ? '#ffd84a' : '#ff9a1f');
    }
  }
  // destello en el cuadro 0 y 1
  if (k === 0) for (let y = 0; y < H; y += 2) for (let x = (y >> 1) % 2; x < W; x += 2) p.px(x, y, '#ffffff');
  // estallido grande detrás de las letras
  if (k >= 2) estallido(p, cx, cy, 70, 118, 16, '#ffffff', '#ffd84a', k * 0.04);
  // las letras: caen desde muy grandes y se clavan en el cuadro 4, con un temblor
  if (k >= 2) {
    const b = k === 2 ? 22 : k === 3 ? 16 : 12, texto = 'K.O.', tw = anchoTexto(texto) * b, th = 7 * b;
    const temblor = k === 4 ? 3 : k === 5 ? -2 : 0;
    letras(p, texto, Math.round(cx - tw / 2) + temblor, Math.round(cy - th / 2), b, '#ff4a3a', '#c0261a', '#5a0f0f');
  }
  // astillas que salen volando desde el centro
  if (k >= 4) for (let i = 0; i < 26; i++) {
    const a = R() * TAU, v = 30 + R() * 90, t = (k - 4) / 7, d = 60 + v * t * 2.2, sz = 2 + Math.floor(R() * 4);
    const x = cx + Math.cos(a) * d * 1.4, y = cy + Math.sin(a) * d + t * t * 60;
    const c = ['#ffffff', '#ffd84a', '#ff9a1f', '#8e8e9e'][i % 4];
    for (let j = 0; j < sz; j++) p.rect(x + j, y - j * Math.sign(Math.cos(a)), 2, 1, c);
    p.px(x, y, INK);
  }
}

/** El destello de la guardia: un escudo azul de luz que se abre delante y se apaga, con chispitas. 5 cuadros. */
function bloqueo(p: Pix, k: number, n: number) {
  const cx = p.w / 2, cy = p.h / 2, t = k / (n - 1), r = 4 + t * 9, R = rng(5);
  const pal = ['#1d4f8c', '#3a8ee0', '#8fd6ff', '#ffffff'];
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const dx = (x - cx) * 1.6, dy = y - cy, d = Math.hypot(dx, dy);
    if (d > r || d < r - 3 || dx < -2) continue;
    p.px(x, y, pal[Math.min(3, Math.max(0, Math.round(3 - t * 3 + (d - r + 3) / 2)))]);
  }
  if (k < 2) p.disc(cx, cy, 3 - k, '#ffffff');
  for (let i = 0; i < 6; i++) { const a = R() * Math.PI - Math.PI / 2, d = r + 1 + t * 4; if (k > 0 && k < n - 1) p.px(cx + Math.cos(a) * d * 0.6, cy + Math.sin(a) * d, pal[2 + (i % 2)]); }
}

/** Líneas de esfuerzo del agarre: rayitas que salen y laten alrededor del punto, en dos tonos. 4 cuadros en bucle. */
function agarre(p: Pix, k: number) {
  const cx = p.w / 2, cy = p.h / 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + (k % 2) * 0.2, r0 = 6 + (k % 2) * 2, r1 = r0 + 3 + ((i + k) % 2);
    for (let r = r0; r <= r1; r++) p.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r === r0 ? '#ffffff' : INK);
  }
  if (k % 2 === 0) { p.px(cx - 9, cy - 9, '#ffd84a'); p.px(cx + 9, cy - 8, '#ffd84a'); }
}

const u = (es: string, en: string) => ({ es, en });
const COMIC = { pow: { fondo: '#ffd84a', borde: '#ff9a1f', arriba: '#ff4a3a', abajo: '#c0261a', sombra: '#5a0f0f' }, paf: { fondo: '#ffffff', borde: '#8fd6ff', arriba: '#3a6aff', abajo: '#0c1f5a', sombra: '#0c1f5a' }, crack: { fondo: '#ff8ad8', borde: '#ff4f6d', arriba: '#ffd84a', abajo: '#e0a020', sombra: '#5a3a08' }, nam: { fondo: '#a8f0a0', borde: '#2fb04a', arriba: '#ffffff', abajo: '#ffd84a', sombra: '#0d3a1a' } };

export const PELEA_FX: EffectDef[] = [
  { id: 'onomatopeya_pow', base: 'onomatopeya', grupo: 'golpe', w: 64, h: 40, cuadros: 6, fps: 14, loop: false, ancla: [32, 20], se_pega_a: 'mano', capa: 'frente', draw: onomatopeya('¡POW!', COMIC.pow),
    uso: u('¡POW! en el `punto` del golpe fuerte (gancho, cabezazo, pisotón). Entra con rebote y se va en el último cuadro.', 'POW! at the `punto` of a strong hit (hook, headbutt, stomp). Bounces in and breaks away on the last frame.') },
  { id: 'onomatopeya_paf', base: 'onomatopeya', grupo: 'golpe', w: 64, h: 40, cuadros: 6, fps: 14, loop: false, ancla: [32, 20], se_pega_a: 'mano', capa: 'frente', draw: onomatopeya('¡PAF!', COMIC.paf, 10),
    uso: u('¡PAF! para el combo de jabs y las patadas.', 'PAF! for the jab combo and kicks.') },
  { id: 'onomatopeya_crack', base: 'onomatopeya', grupo: 'golpe', w: 80, h: 40, cuadros: 6, fps: 14, loop: false, ancla: [40, 20], se_pega_a: 'mano', capa: 'frente', draw: onomatopeya('CRACK!', COMIC.crack, 14),
    uso: u('CRACK! cuando se rompe la guardia, o un lanzamiento contra el piso.', 'CRACK! when a guard breaks, or a throw into the ground.') },
  { id: 'onomatopeya_nam', base: 'onomatopeya', grupo: 'golpe', w: 64, h: 40, cuadros: 6, fps: 14, loop: false, ancla: [32, 20], se_pega_a: 'cabeza', capa: 'frente', draw: onomatopeya('¡ÑAM!', COMIC.nam, 8),
    uso: u('¡ÑAM! sobre la cabeza al comer (`eat`, último cuadro).', 'ÑAM! over the head when eating (`eat`, last frame).') },
  { id: 'ko_grande', base: 'ko_grande', grupo: 'pantalla', w: 640, h: 360, cuadros: 12, fps: 12, loop: false, ancla: [0, 0], se_pega_a: 'pantalla', capa: 'frente', pantalla: true, draw: koGrande,
    uso: u('El K.O. del final: destello, letras que se clavan, rayos y astillas. Se queda en el último cuadro. Va con cámara lenta.', 'The final K.O.: flash, letters slamming in, rays and splinters. Holds on the last frame. Goes with slow motion.') },
  { id: 'bloqueo', base: 'bloqueo', grupo: 'golpe', w: 24, h: 32, cuadros: 5, fps: 18, loop: false, ancla: [12, 16], se_pega_a: 'mano', capa: 'frente', draw: bloqueo,
    uso: u('El destello azul de la guardia, delante del que bloquea, en el `punto` del golpe que paró. Mira a la derecha: espejar con flipX.', 'The blue guard flash in front of the blocker, at the blocked hit `punto`. Faces right: mirror with flipX.') },
  { id: 'agarre', base: 'agarre', grupo: 'golpe', w: 24, h: 24, cuadros: 4, fps: 10, loop: true, ancla: [12, 12], se_pega_a: 'mano', capa: 'frente', draw: agarre,
    uso: u('Líneas de esfuerzo mientras dura el agarre (`grab_hold`), entre las manos de quien agarra.', 'Effort lines while the grab lasts (`grab_hold`), between the grabber hands.') },
];
