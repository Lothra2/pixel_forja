import { createRaster, blit, type Raster } from '../core/raster';
import { Pix, rng } from '../fx/pix';

/**
 * El público de las azoteas de al lado (lote P1): una fila de gente asomada detrás del muro de otra azotea, que mira
 * la pelea. Tres estados de 4 cuadros: `quieto` (respiran, alguno con el celular), `celebra` (brazos arriba, saltan,
 * sacuden una toalla) y `abuchea` (señalan, pulgar abajo, puño que sube y baja). Va en una capa del escenario de la
 * azotea: el juego la pone sobre la azotea vecina de su fondo y cambia el estado según lo que pase.
 *
 * Son figuras chiquitas (unos 18 px de cabeza a cintura) porque están lejos. De noche salen más oscuras y con la
 * luz de los celulares.
 */

export const PUBLICO_ESTADOS = ['quieto', 'celebra', 'abuchea'] as const;
export type PublicoEstado = (typeof PUBLICO_ESTADOS)[number];
export const PUBLICO_CUADROS = 4;
export const PUBLICO_FPS = 6;

export interface PublicoOpts {
  /** ancho de la tira en pixeles (sin valor: 320) */
  ancho?: number;
  /** cuánta gente (sin valor: 1 cada 20 px) */
  gente?: number;
  /** de noche: más oscuros y con celulares prendidos */
  noche?: boolean;
  /** con el muro de la azotea adelante (sin valor: sí) */
  muro?: boolean;
  seed?: number;
}

const ALTO = 40;
const MURO = 9;
const PIELES = ['#f1c7a0', '#d9a273', '#b97a4e', '#8a5634', '#5e3a22'];
const PELOS = ['#1d1612', '#3a2618', '#5a3a1e', '#2a2a30', '#8a6a3a'];
const CAMISAS = ['#d23c3c', '#3d6fd6', '#f2c230', '#4caf50', '#e8e4da', '#8a4fd6', '#2bb3a3', '#e0466a', '#2a2a30', '#ff8a2a'];
const TINTA = '#1a1020';

type RGB = [number, number, number];
const rgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hex = ([r, g, b]: RGB) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
/** De noche: más oscuro y corrido al azul. */
const deNoche = (c: string) => { const [r, g, b] = rgb(c); return hex([r * 0.5, g * 0.52, b * 0.62 + 14]); };
const sombra = (c: string) => { const [r, g, b] = rgb(c); return hex([r * 0.72, g * 0.72, b * 0.78]); };

interface Persona { x: number; piel: string; pelo: string; camisa: string; alto: number; gorra: boolean; fase: number; toalla: string | null; celular: boolean; pose: number }

function gente(o: Required<PublicoOpts>): Persona[] {
  const r = rng(o.seed), n = o.gente, paso = o.ancho / n, out: Persona[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: Math.round(paso * (i + 0.5) + (r() - 0.5) * paso * 0.5),
      piel: PIELES[Math.floor(r() * PIELES.length)], pelo: PELOS[Math.floor(r() * PELOS.length)], camisa: CAMISAS[Math.floor(r() * CAMISAS.length)],
      alto: r() < 0.25 ? 2 : r() < 0.5 ? -2 : 0, gorra: r() < 0.3, fase: Math.floor(r() * 4),
      toalla: r() < 0.3 ? CAMISAS[Math.floor(r() * CAMISAS.length)] : null, celular: r() < 0.35, pose: Math.floor(r() * 3),
    });
  }
  // de atrás para adelante: los más bajos al final (quedan delante)
  return out.sort((a, b) => b.alto - a.alto);
}

/** Una línea de 1 px entre dos puntos. */
function linea(p: Pix, x0: number, y0: number, x1: number, y1: number, c: string, grosor = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
    p.rect(x, y, grosor, grosor, c);
  }
}

function persona(p: Pix, q: Persona, estado: PublicoEstado, k: number, noche: boolean, centro: number) {
  // señalan hacia el medio de la tira, donde está la pelea
  const dir = q.x < centro ? 1 : -1;
  const t = (k + q.fase) % 4;
  const col = (c: string) => (noche ? deNoche(c) : c);
  const piel = col(q.piel), pelo = col(q.pelo), camisa = col(q.camisa), camisaS = sombra(camisa);
  // salto al celebrar, cabeceo al abuchear, respiración quieto
  const dy = estado === 'celebra' ? (t === 1 ? -3 : t === 2 ? -2 : 0) : estado === 'abuchea' ? (t % 2 ? 1 : 0) : (t === 2 ? 1 : 0);
  const base = ALTO - MURO + 2 + dy - q.alto, x = q.x;
  const hombro = base - 9, cabeza = hombro - 4;
  // torso
  p.rect(x - 3, hombro, 7, base - hombro + 4, camisa);
  p.rect(x + 2, hombro + 1, 2, base - hombro + 3, camisaS);
  // brazos: [mano izquierda, mano derecha] relativas al hombro
  const hi: [number, number] = [x - 4, hombro + 1], hd: [number, number] = [x + 4, hombro + 1];
  let mi: [number, number], md: [number, number];
  let toallaEn: [number, number] | null = null;
  if (estado === 'celebra') {
    const sube = t % 2 === 0;
    mi = [x - 7, hombro - (sube ? 8 : 6)]; md = [x + 7, hombro - (sube ? 6 : 8)];
    if (q.toalla) toallaEn = md;
  } else if (estado === 'abuchea') {
    if (q.pose === 0) { mi = [x - 4 * dir, hombro + 7]; md = [x + 9 * dir, hombro + (t % 2 ? 1 : 0)]; } // señala
    else if (q.pose === 1) { mi = [x - 4 * dir, hombro + 7]; md = [x + 5 * dir, hombro - (t % 2 ? 6 : 3)]; } // puño que sube y baja
    else { mi = [x - 6, hombro + 3]; md = [x + 6, hombro + 3]; } // pulgares abajo
  } else {
    mi = [x - 4, hombro + 7];
    md = q.celular ? [x + 1, hombro + 3] : [x + 4, hombro + 7];
  }
  // cada mano sale del hombro de su lado
  for (const m of [mi, md]) { const h = m[0] < x ? hi : hd; linea(p, h[0], h[1], m[0], m[1], camisa, 2); }
  p.rect(mi[0], mi[1], 2, 2, piel);
  p.rect(md[0], md[1], 2, 2, piel);
  if (estado === 'abuchea' && q.pose === 0) p.px(dir > 0 ? md[0] + 2 : md[0] - 1, md[1], piel); // el dedo que señala
  if (estado === 'abuchea' && q.pose === 2) { p.px(mi[0], mi[1] + 2, piel); p.px(md[0] + 1, md[1] + 2, piel); } // pulgares abajo
  if (estado === 'quieto' && q.celular) {
    p.rect(md[0] - 1, md[1] - 2, 2, 3, '#2a2a30');
    if (noche) { p.px(md[0] - 1, md[1] - 2, '#bfe6ff'); p.px(md[0], md[1] - 2, '#9ad0ff'); p.px(md[0] - 1, md[1] - 1, '#9ad0ff'); }
  }
  if (toallaEn) {
    // la toalla que se sacude encima de la cabeza
    const [tx, ty] = toallaEn, ondea = t % 2 ? 1 : -1;
    for (let i = 0; i < 6; i++) p.rect(tx + i - 1, ty - 2 + Math.round(Math.sin(i * 0.9 + t) * ondea), 1, 3, col(q.toalla!));
  }
  // cabeza
  p.disc(x + 0.5, cabeza, 3.2, piel);
  p.rect(x - 3, cabeza - 4, 7, 3, pelo);
  p.px(x - 3, cabeza - 1, pelo); p.px(x + 3, cabeza - 1, pelo);
  if (q.gorra) { p.rect(x - 3, cabeza - 4, 7, 2, camisaS); p.rect(x + 1, cabeza - 2, 4, 1, camisaS); }
  // la boca: abierta gritando al celebrar o abuchear
  if (estado !== 'quieto') p.rect(x, cabeza + 1, 2, t % 2 ? 2 : 1, noche ? '#2a0e14' : '#5a1a22');
}

/** El muro de la azotea vecina: concreto con la tapa más clara, juntas y manchas de agua. */
function muro(p: Pix, ancho: number, noche: boolean, seed: number) {
  const r = rng(seed + 99);
  const c = (h: string) => (noche ? deNoche(h) : h);
  const y0 = ALTO - MURO;
  for (let x = 0; x < ancho; x++) {
    p.px(x, y0, c('#c9c2b4'));
    p.px(x, y0 + 1, c('#b3ab9c'));
    for (let y = y0 + 2; y < ALTO; y++) p.px(x, y, c(x % 32 === 0 ? '#7d7668' : y > ALTO - 3 ? '#8a8374' : '#9d9586'));
  }
  for (let i = 0; i < ancho / 40; i++) {
    const x = Math.floor(r() * ancho), h = 2 + Math.floor(r() * 4);
    for (let y = 0; y < h; y++) p.px(x, y0 + 2 + y, c('#857d6e'));
  }
}

/** Un cuadro de la tira. */
export function publicoCuadro(estado: PublicoEstado, k: number, opts: PublicoOpts = {}): Raster {
  // los campos sin valor (undefined) no pisan los de fábrica
  const dado = Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)) as PublicoOpts;
  const o: Required<PublicoOpts> = { ancho: 320, gente: 0, noche: false, muro: true, seed: 7, ...dado };
  if (!o.gente) o.gente = Math.max(1, Math.round(o.ancho / 20));
  const p = new Pix(o.ancho, ALTO);
  for (const q of gente(o)) persona(p, q, estado, k, o.noche, o.ancho / 2);
  // contorno de tinta a la gente (no al muro)
  const marcas: [number, number][] = [];
  for (let y = 0; y < ALTO; y++) for (let x = 0; x < o.ancho; x++) if (!p.has(x, y) && (p.has(x - 1, y) || p.has(x + 1, y) || p.has(x, y - 1) || p.has(x, y + 1))) marcas.push([x, y]);
  for (const [x, y] of marcas) p.px(x, y, o.noche ? '#0c0812' : TINTA);
  if (o.muro) muro(p, o.ancho, o.noche, o.seed);
  return p.r;
}

/**
 * La hoja del público: una fila por estado (quieto, celebra, abuchea) y 4 cuadros por fila, cada uno de
 * `ancho` x 40. El muro ocupa las 9 filas de abajo: la gente se asoma por encima.
 */
export function publicoHoja(opts: PublicoOpts = {}) {
  const ancho = opts.ancho ?? 320;
  const png = createRaster(ancho * PUBLICO_CUADROS, ALTO * PUBLICO_ESTADOS.length);
  PUBLICO_ESTADOS.forEach((e, fila) => {
    for (let k = 0; k < PUBLICO_CUADROS; k++) blit(png, publicoCuadro(e, k, opts), k * ancho, fila * ALTO);
  });
  return {
    png, w: ancho, h: ALTO, cuadros: PUBLICO_CUADROS, fps: PUBLICO_FPS, muro: opts.muro === false ? 0 : MURO,
    estados: Object.fromEntries(PUBLICO_ESTADOS.map((e, i) => [e, i])) as Record<PublicoEstado, number>,
  };
}

export { MURO as PUBLICO_MURO, ALTO as PUBLICO_ALTO };
