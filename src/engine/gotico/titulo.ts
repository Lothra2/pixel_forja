import type { Raster } from '../core/raster';
import { rng } from '../core/rng';
import {
  lamina, mascara, rellenar, trazo, desenfocar, desenfocada, distancia, pintar, brillo, aRaster, escalar, fbm, celdas, suave, sat,
  type Lamina, type Mascara, type P2, type C3,
} from './cine';

/**
 * El título de Réquiem de Ceniza, pintado por el motor: letras propias (no es una fuente), mayúsculas forjadas de
 * astas gruesas con las puntas en cuña y el corte de arriba en bisel, panzas ochavadas y púas en los remates. Góticas
 * de espíritu pero de lectura inmediata: nada de letra fraktur. Hierro ennegrecido con bisel que toma la luz fría de
 * arriba y la brasa de abajo, grietas de celdas por donde se ve el metal al rojo, el pie de cada letra más caliente,
 * contorno negro grueso y un halo de ascua detrás para que la silueta se lea sobre cualquier fondo.
 *
 * Composición en tres renglones: RÉQUIEM grande, DE chico entre dos barras forjadas con rombos, CENIZA grande (en
 * inglés REQUIEM / OF / ASH). Las medidas de los glifos están en unidades de un alto de mayúscula de 100.
 *
 * Animación en bucle (`cuadroTitulo`): la brasa de las grietas late y corre por las vetas, suben chispas de las
 * letras y una vez por vuelta pasa un barrido de luz lento en diagonal.
 */

// ------------------------------------------------------------------ glifos
interface Pieza { mas: P2[][]; menos?: P2[][] }
interface Glifo { a: number; piezas: Pieza[] }
const F = 5, S = 21, T = 10;

/** Asta vertical: las puntas se abren en cuña y el corte de arriba sube hacia la derecha (bisel de cincel). */
function asta(x: number, y0: number, y1: number, w: number, o: { arriba?: boolean; abajo?: boolean } = {}): P2[] {
  const a = o.arriba !== false, b = o.abajo !== false, l = x - w / 2, r = x + w / 2, c = 2.6 * F;
  const p: P2[] = [];
  if (a) p.push([l - F, y0 + 3], [r + F, y0 - 2], [r, y0 + c]); else p.push([l, y0], [r, y0]);
  if (b) p.push([r, y1 - c], [r + F, y1], [l - F, y1], [l, y1 - c]); else p.push([r, y1], [l, y1]);
  if (a) p.push([l, y0 + c]);
  return p;
}
/** Ochavado (octógono) de esquinas cortadas en `c`. */
const oct = (x0: number, y0: number, x1: number, y1: number, c: number): P2[] => [[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c]];
const una = (...p: P2[]): Pieza => ({ mas: [p] });

const O_EXT = oct(0, 0, 82, 100, 22), O_INT: P2[] = [[32, 11], [50, 11], [62, 24], [62, 76], [50, 89], [32, 89], [21, 76], [21, 24]];
const C_ARO: Pieza = { mas: [oct(0, 0, 76, 100, 22), [[31, 11], [48, 11], [60, 24], [60, 76], [48, 89], [31, 89], [21, 77], [21, 23]]], menos: [[[44, 30], [92, 20], [92, 80], [44, 70]]] };
const E_ARRIBA = una([12, 0], [60, -1], [66, 0], [66, 22], [58, 12], [12, 12]);
const E_MEDIO = una([12, 44], [50, 44], [57, 50], [50, 56], [12, 56]);
const E_ABAJO = una([12, 88], [58, 88], [68, 76], [68, 100], [12, 100]);
const ASTA_IZQ = una(...asta(15.5, 0, 100, S));

export const GLIFOS: Record<string, Glifo> = {
  A: { a: 86, piezas: [una([35, -10], [48, 0], [86, 100], [60, 100]), una([35, -10], [42, 8], [14, 100], [3, 100]), una([20, 62], [64, 62], [68, 74], [16, 74]), una([-2, 100], [20, 100], [10, 90]), una([56, 100], [90, 100], [80, 90])] },
  C: { a: 78, piezas: [C_ARO, una([54, 4], [74, 0], [74, 34], [63, 22]), una([63, 78], [74, 66], [74, 100], [54, 96])] },
  D: { a: 82, piezas: [ASTA_IZQ, { mas: [[[12, 0], [50, 0], [78, 24], [78, 76], [50, 100], [12, 100]], [[26, 12], [45, 12], [57, 26], [57, 74], [45, 88], [26, 88]]] }] },
  E: { a: 70, piezas: [ASTA_IZQ, E_ARRIBA, E_MEDIO, E_ABAJO] },
  // la tilde es una hoja inclinada
  É: { a: 70, piezas: [ASTA_IZQ, E_ARRIBA, E_MEDIO, E_ABAJO, una([28, -9], [39, -9], [57, -28], [44, -28])] },
  F: { a: 66, piezas: [ASTA_IZQ, E_ARRIBA, E_MEDIO] },
  G: { a: 80, piezas: [C_ARO, una([54, 4], [74, 0], [74, 34], [63, 22]), una([40, 54], [76, 54], [76, 100], [62, 94], [62, 66], [40, 66])] },
  H: { a: 82, piezas: [ASTA_IZQ, una(...asta(66.5, 0, 100, S)), una([12, 44], [70, 44], [70, 56], [12, 56])] },
  I: { a: 31, piezas: [ASTA_IZQ] },
  L: { a: 68, piezas: [ASTA_IZQ, E_ABAJO] },
  M: { a: 100, piezas: [una(...asta(10, 0, 100, T)), una([5, -1], [27, -1], [55, 100], [41, 100]), una([42, 100], [52, 100], [80, 2], [72, -1]), una(...asta(83, 0, 100, S))] },
  N: { a: 82, piezas: [una(...asta(10, 0, 100, T)), una([5, -1], [27, -1], [77, 100], [55, 100]), una(...asta(72, 0, 100, T))] },
  O: { a: 86, piezas: [{ mas: [O_EXT, O_INT] }] },
  Q: { a: 86, piezas: [{ mas: [O_EXT, O_INT] }, una([40, 86], [54, 80], [90, 108], [97, 117], [72, 112])] },
  R: { a: 82, piezas: [ASTA_IZQ, { mas: [[[12, 0], [52, 0], [70, 16], [70, 40], [54, 56], [12, 56]], [[26, 12], [48, 12], [56, 20], [56, 36], [48, 44], [26, 44]]] }, una([34, 50], [54, 50], [76, 92], [84, 100], [54, 100], [57, 95])] },
  S: { a: 72, piezas: [
    { mas: [oct(2, 0, 68, 54, 16), [[28, 12], [48, 12], [57, 21], [57, 33], [48, 42], [28, 42], [23, 37], [23, 17]]], menos: [[[52, 20], [80, 20], [80, 42], [52, 42]]] },
    { mas: [oct(2, 46, 68, 100, 16), [[22, 58], [42, 58], [47, 63], [47, 83], [42, 88], [22, 88], [12, 78], [12, 68]]], menos: [[[-6, 58], [18, 58], [18, 80], [-6, 80]]] },
    una([56, 10], [70, 4], [70, 30], [60, 20]), una([0, 96], [0, 70], [10, 80], [14, 90]),
  ] },
  U: { a: 78, piezas: [una(...asta(15.5, 0, 74, S, { abajo: false })), una(...asta(67, 0, 100, T)), una([5, 70], [26, 70], [26, 77], [37, 88], [62, 88], [62, 100], [33, 100], [5, 84])] },
  Z: { a: 78, piezas: [una([2, 24], [2, 0], [72, 0], [72, 13], [10, 13]), una([50, 0], [73, 0], [25, 100], [2, 100]), una([2, 87], [66, 87], [76, 74], [76, 100], [2, 100])] },
};

// ------------------------------------------------------------------ composición
export type IdiomaTitulo = 'es' | 'en';
/** Renglones del título: texto, escala y espacio entre letras (en unidades). */
export const RENGLONES: Record<IdiomaTitulo, { s: string; k: number; esp: number }[]> = {
  es: [{ s: 'RÉQUIEM', k: 1, esp: 8 }, { s: 'DE', k: 0.36, esp: 14 }, { s: 'CENIZA', k: 1, esp: 18 }],
  en: [{ s: 'REQUIEM', k: 1, esp: 8 }, { s: 'OF', k: 0.36, esp: 14 }, { s: 'ASH', k: 1, esp: 30 }],
};
const ancho = (s: string, esp: number) => [...s].reduce((t, ch, i) => t + (GLIFOS[ch]?.a ?? 40) + (i ? esp : 0), 0);
/** Lo que mide el título en unidades: de la punta de la tilde (y -28) al pie del último renglón. */
export function medidaTitulo(idioma: IdiomaTitulo = 'es') {
  const rs = RENGLONES[idioma];
  const w = Math.max(...rs.map((r) => ancho(r.s, r.esp) * r.k));
  return { w, y0: -30, y1: 268, base: [100, 152, 268] };
}

/** Polígonos de todo el título ya ubicados: (x, y) en unidades → pixeles con `k` y origen (ox, oy). */
function piezasTitulo(idioma: IdiomaTitulo, k: number, ox: number, oy: number): { pieza: Pieza; renglon: number }[] {
  const rs = RENGLONES[idioma], med = medidaTitulo(idioma), out: { pieza: Pieza; renglon: number }[] = [];
  const tr = (p: P2, x0: number, base: number, s: number): P2 => [ox + (x0 + p[0] * s) * k, oy + (base - (100 - p[1]) * s) * k];
  rs.forEach((r, ri) => {
    const w = ancho(r.s, r.esp) * r.k, base = med.base[ri];
    let x = (med.w - w) / 2;
    for (const ch of r.s) {
      const g = GLIFOS[ch];
      if (g) for (const pz of g.piezas) out.push({ renglon: ri, pieza: { mas: pz.mas.map((a) => a.map((p) => tr(p, x, base, r.k))), menos: pz.menos?.map((a) => a.map((p) => tr(p, x, base, r.k))) } });
      x += ((g?.a ?? 40) + r.esp) * r.k;
    }
    // el renglón chico va entre dos barras forjadas que terminan en rombo
    if (r.k < 0.5) {
      const yc = base - 50 * r.k, x0 = (med.w - w) / 2, x1 = x0 + w, hueco = 16, largo = Math.min(150, (med.w - w) / 2 - 30);
      for (const lado of [-1, 1]) {
        const xi = lado < 0 ? x0 - hueco : x1 + hueco, xr = xi + lado * 9, xp = xr + lado * largo;
        const q = (pts: P2[]): Pieza => ({ mas: [pts.map(([u, v]) => [ox + u * k, oy + v * k] as P2)] });
        out.push({ renglon: ri, pieza: q([[xi, yc], [xi + lado * 4.5, yc - 6], [xr, yc], [xi + lado * 4.5, yc + 6]]) });
        out.push({ renglon: ri, pieza: q([[xr + lado * 2, yc - 2.6], [xp, yc - 0.4], [xp, yc + 0.4], [xr + lado * 2, yc + 2.6]]) });
        out.push({ renglon: ri, pieza: q([[xr + lado * largo * 0.55, yc], [xr + lado * (largo * 0.55 + 3.5), yc - 4], [xr + lado * (largo * 0.55 + 7), yc], [xr + lado * (largo * 0.55 + 3.5), yc + 4]]) });
      }
    }
  });
  return out;
}

/** Máscara de cobertura del título en un lienzo de w x h, con el ancho del título igual a `anchoPx`. */
export function mascaraTitulo(idioma: IdiomaTitulo, w: number, h: number, anchoPx: number, cy = 0.53): { m: Mascara; k: number; ox: number; oy: number; renglon: Mascara } {
  const med = medidaTitulo(idioma), k = anchoPx / med.w, ox = (w - anchoPx) / 2, oy = h * cy - ((med.y0 + med.y1) / 2) * k;
  const m = mascara(w, h), renglon = mascara(w, h), tmp = mascara(w, h);
  for (const { pieza, renglon: ri } of piezasTitulo(idioma, k, ox, oy)) {
    tmp.d.fill(0);
    rellenar(tmp, pieza.mas, 1, 'max');
    if (pieza.menos) for (const a of pieza.menos) rellenar(tmp, a, 1, 'restar');
    for (let i = 0; i < tmp.d.length; i++) if (tmp.d[i] > m.d[i]) { m.d[i] = tmp.d[i]; renglon.d[i] = ri; }
  }
  return { m, k, ox, oy, renglon };
}

// ------------------------------------------------------------------ capas fijas (se calculan una vez por tamaño)
export interface CapasTitulo {
  w: number; h: number;
  /** cobertura de las letras */
  m: Mascara;
  /** las letras ya iluminadas (hierro con bisel, sin la brasa) */
  hierro: Lamina;
  /** grieta fina (núcleo blanco amarillo) y su resplandor dentro de la letra */
  grieta: Mascara; vena: Mascara;
  /** calor del pie de cada letra */
  calor: Mascara;
  /** fase del latido por pixel (0..1), para que la brasa corra por las vetas */
  fase: Mascara;
  /** cuánto refleja cada pixel el barrido de luz (biseles mucho, cara poco) */
  reflejo: Mascara;
  /** contorno negro y sombra proyectada */
  contorno: Mascara; sombra: Mascara;
  /** halo de ascua detrás (cerca y lejos) */
  halo: Mascara; haloLejos: Mascara;
  /** de dónde salen las chispas (pixeles de grieta en la mitad de arriba de las letras) */
  semillas: P2[];
}

const n3 = (x: number, y: number, z: number): [number, number, number] => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const LUNA = n3(-0.45, -0.75, 0.45), ASCUA = n3(0.12, 0.95, 0.22), MEDIO = n3(-0.45 * 0.5, -0.75 * 0.5, 1.45);

/**
 * Pinta todas las capas fijas del título en un lienzo de w x h (el título ocupa el 85 % del ancho). Se piensa para
 * 1600 x 960 (la maestra); los tamaños chicos salen achicando esta (`reducirCapas`).
 */
export function capasTitulo(idioma: IdiomaTitulo = 'es', w = 1600, h = 960, seed = 7): CapasTitulo {
  const { m, k } = mascaraTitulo(idioma, w, h, w * 0.85);
  const N = w * h, px = k; // pixeles por unidad
  const dentro = distancia(m, (v) => v < 0.5), fuera = distancia(m, (v) => v >= 0.5);
  const bis = 4.4 * px; // ancho del bisel
  // ---- grietas: bordes de celdas deformadas, solo en parte de la cara
  const grieta = mascara(w, h), alto = new Float32Array(N), fase = mascara(w, h), calor = mascara(w, h);
  const celda = 15 * px;
  // y de la mayúscula de cada renglón, para el calor del pie
  const med = medidaTitulo(idioma), oy = h * 0.53 - ((med.y0 + med.y1) / 2) * k;
  const renglones = [[0, 100], [116, 152], [168, 268]].map(([a, b]) => [oy + a * k, oy + b * k]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (m.d[i] <= 0) continue;
    const di = dentro[i];
    const wx = (fbm(x / (celda * 0.8), y / (celda * 0.8), 3, seed) - 0.5) * celda * 0.7, wy = (fbm(x / (celda * 0.8) + 9, y / (celda * 0.8), 3, seed + 3) - 0.5) * celda * 0.7;
    const [f1, f2] = celdas((x + wx) / celda, (y + wy) / celda, seed);
    const borde = (f2 - f1) * celda; // pixeles al borde de la celda
    const quiere = suave(0.38, 0.55, fbm(x / (celda * 2.2), y / (celda * 2.2), 2, seed + 11)); // no todas las celdas se abren
    const gw = 0.55 + 0.9 * fbm(x / 9, y / 9, 2, seed + 5);
    let g = (1 - suave(gw * 0.5, gw * 0.5 + 1.2, borde)) * quiere * suave(bis * 0.55, bis * 1.2, di);
    // vetas que bajan desde el pie (la letra se raja de abajo hacia arriba)
    const r = renglones.find(([a, b]) => y >= a - 40 && y <= b + 30) ?? renglones[0];
    const v = sat((y - r[0]) / (r[1] - r[0]));
    g = Math.max(g, (1 - suave(gw * 0.4, gw * 0.4 + 1, borde)) * suave(0.55, 0.85, v) * suave(bis * 0.4, bis, di));
    grieta.d[i] = g * m.d[i];
    calor.d[i] = suave(0.42, 1.0, v) * (0.55 + 0.45 * fbm(x / 30, y / 18, 3, seed + 21)) * m.d[i];
    fase.d[i] = fbm(x / 120, y / 60, 2, seed + 31) * 2 + (1 - v) * 0.6;
    // alto: bisel, un lomo suave hacia el centro del trazo, martillado y la grieta hundida
    alto[i] = 0.85 * suave(0, bis, di) + 0.15 * sat(di / (bis * 3)) + (fbm(x / (9 * px), y / (9 * px), 4, seed + 41) - 0.5) * 0.09 + (fbm(x / 2.5, y / 2.5, 2, seed + 43) - 0.5) * 0.03;
  }
  const hundida = desenfocada(grieta, 1.2);
  for (let i = 0; i < N; i++) alto[i] = alto[i] * m.d[i] - hundida.d[i] * 0.45;
  const vena = desenfocada(grieta, 2.4 * px / 2.4);
  for (let i = 0; i < N; i++) vena.d[i] = Math.min(1, vena.d[i] * 2.2) * m.d[i];
  // ---- luz del hierro
  const hierro = lamina(w, h), reflejo = mascara(w, h), esc = bis / 0.85;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, a = m.d[i]; if (a <= 0) continue;
    const nx = -(alto[i + 1] - alto[i - 1]) * 0.5 * esc, ny = -(alto[i + w] - alto[i - w]) * 0.5 * esc;
    const [Nx, Ny, Nz] = n3(nx, ny, 1);
    const dl = Math.max(0, Nx * LUNA[0] + Ny * LUNA[1] + Nz * LUNA[2]), da = Math.max(0, Nx * ASCUA[0] + Ny * ASCUA[1] + Nz * ASCUA[2]);
    const sp = Math.pow(Math.max(0, Nx * MEDIO[0] + Ny * MEDIO[1] + Nz * MEDIO[2]) / Math.hypot(...MEDIO), 22);
    const borde = 1 - suave(0, bis, dentro[i]);
    // hierro con óxido en manchas y el filo gastado (más claro) en el bisel
    const ox = fbm(x / (20 * px), y / (20 * px), 3, seed + 51);
    let c: C3 = [0.13 + ox * 0.07, 0.12 + ox * 0.035, 0.115 + ox * 0.01];
    c = [c[0] + borde * 0.14, c[1] + borde * 0.13, c[2] + borde * 0.125];
    const luz: C3 = [0.1 + dl * 0.85 + da * 1.6, 0.1 + dl * 0.9 + da * 0.62, 0.12 + dl * 1.05 + da * 0.22];
    const col: C3 = [c[0] * luz[0] + sp * 0.75, c[1] * luz[1] + sp * 0.72, c[2] * luz[2] + sp * 0.7];
    // la cara recibe un rebote cálido del halo (para que la letra no sea un agujero negro)
    const reb = 0.05 + 0.05 * sat(1 - (y / h - 0.2));
    const j = i * 4;
    hierro.d[j] = (col[0] + reb * 0.9) * a; hierro.d[j + 1] = (col[1] + reb * 0.4) * a; hierro.d[j + 2] = (col[2] + reb * 0.2) * a; hierro.d[j + 3] = a;
    reflejo.d[i] = a * (0.25 + 0.9 * borde * (0.4 + 0.6 * dl) + sp * 0.6);
  }
  // ---- contorno, sombra y halo
  const contorno = mascara(w, h), ancho = 2.6 * px;
  for (let i = 0; i < N; i++) contorno.d[i] = m.d[i] >= 0.5 ? 1 : 1 - suave(ancho - 1, ancho + 1, fuera[i]);
  const sombra = mascara(w, h), dy = Math.round(3 * px);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const sy = y - dy; if (sy >= 0) sombra.d[y * w + x] = contorno.d[sy * w + x]; }
  desenfocar(sombra.d, w, h, 7 * px);
  const halo = desenfocada(m, 14 * px), haloLejos = desenfocada(m, 40 * px);
  // ---- semillas de chispas: grietas en la mitad de arriba de las letras grandes y el borde de arriba
  const r = rng(seed * 31 + 5), semillas: P2[] = [];
  for (let t = 0; t < 200000 && semillas.length < 400; t++) {
    const x = Math.floor(r() * w), y = Math.floor(r() * h), i = y * w + x;
    if (m.d[i] < 0.5) continue;
    if (grieta.d[i] > 0.4 || (m.d[i - w * 3] < 0.5 && r() < 0.25)) semillas.push([x, y]);
  }
  return { w, h, m, hierro, grieta, vena, calor, fase, reflejo, contorno, sombra, halo, haloLejos, semillas };
}

/** Las capas a la mitad (o a 1/k): promedio por área. */
export function reducirCapas(c: CapasTitulo, f: number): CapasTitulo {
  const w = Math.round(c.w / f), h = Math.round(c.h / f);
  const red = (m: Mascara): Mascara => { const L = lamina(m.w, m.h); for (let i = 0; i < m.d.length; i++) L.d[i * 4 + 3] = m.d[i]; const o = escalar(L, w, h), out = mascara(w, h); for (let i = 0; i < w * h; i++) out.d[i] = o.d[i * 4 + 3]; return out; };
  return {
    w, h, m: red(c.m), hierro: escalar(c.hierro, w, h), grieta: red(c.grieta), vena: red(c.vena), calor: red(c.calor), fase: red(c.fase), reflejo: red(c.reflejo),
    contorno: red(c.contorno), sombra: red(c.sombra), halo: red(c.halo), haloLejos: red(c.haloLejos), semillas: c.semillas.map(([x, y]) => [x / f, y / f] as P2),
  };
}

// ------------------------------------------------------------------ cuadros
export const CUADROS_TITULO = 48;
export const FPS_TITULO = 12;
const BRASA: C3 = [1.0, 0.36, 0.07], NUCLEO: C3 = [1.0, 0.82, 0.45], ROJO: C3 = [0.62, 0.08, 0.02];

export interface OpcCuadro {
  /** fase del bucle 0..1 */
  t?: number;
  /** con chispas (default true) */
  chispas?: boolean;
  /** con el barrido de luz (default true) */
  barrido?: boolean;
  /** 0..1: aparición (para el revelado: las grietas se encienden primero, después el hierro) */
  aparicion?: number;
}

/** Un cuadro del título, transparente. El bucle dura CUADROS_TITULO / FPS_TITULO segundos. */
export function cuadroTitulo(c: CapasTitulo, o: OpcCuadro = {}): Lamina {
  const t = o.t ?? 0, ap = o.aparicion ?? 1, { w, h } = c, N = w * h, L = lamina(w, h), TAU = Math.PI * 2;
  const s = w / 1600; // escala respecto de la maestra
  const late = 0.82 + 0.18 * Math.sin(TAU * t * 2); // el halo respira dos veces por vuelta
  const apH = suave(0.35, 1, ap), apB = suave(0, 0.6, ap);
  // sombra, halo lejano y cercano
  pintar(L, c.sombra, [0, 0, 0], 0.9 * apH);
  brillo(L, c.haloLejos, [0.55, 0.11, 0.03], 0.75 * late * apB);
  brillo(L, c.halo, [0.95, 0.3, 0.06], 0.7 * late * apB);
  pintar(L, c.contorno, [0.02, 0.012, 0.01], apH);
  // hierro
  for (let i = 0; i < N; i++) {
    const a = c.m.d[i] * apH; if (a <= 0) continue;
    const j = i * 4, al = c.hierro.d[j + 3] || 1, b = a / al;
    L.d[j] = L.d[j] * (1 - a) + c.hierro.d[j] * b; L.d[j + 1] = L.d[j + 1] * (1 - a) + c.hierro.d[j + 1] * b; L.d[j + 2] = L.d[j + 2] * (1 - a) + c.hierro.d[j + 2] * b; L.d[j + 3] = L.d[j + 3] * (1 - a) + a;
  }
  // la brasa: grieta, vena y calor que laten con la fase de cada veta
  const emis = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const g = c.grieta.d[i], v = c.vena.d[i], q = c.calor.d[i]; if (g + v + q <= 0) continue;
    const p = 0.62 + 0.38 * Math.sin(TAU * (t * 2 - c.fase.d[i])), p2 = 0.75 + 0.25 * Math.sin(TAU * (t - c.fase.d[i] * 0.5));
    const kg = g * p * 2.2 * apB, kv = v * (0.5 + 0.5 * p) * 0.9 * apB, kq = q * p2 * 0.55 * apB;
    emis[i * 3] = NUCLEO[0] * kg + BRASA[0] * kv + ROJO[0] * kq;
    emis[i * 3 + 1] = NUCLEO[1] * kg + BRASA[1] * kv + ROJO[1] * kq;
    emis[i * 3 + 2] = NUCLEO[2] * kg + BRASA[2] * kv + ROJO[2] * kq;
  }
  // chispas que suben de las letras (en su propio buffer de luz)
  if (o.chispas !== false && ap > 0.5) chispasTitulo(c, t, emis, s);
  // resplandor de la brasa (también afuera de la letra, con alfa)
  const flor = new Float32Array(emis);
  desenfocar(flor, w, h, 5 * s * 2, 3);
  for (let i = 0; i < N; i++) {
    const j = i * 4, e0 = emis[i * 3], e1 = emis[i * 3 + 1], e2 = emis[i * 3 + 2], kf = 0.9 - 0.55 * c.m.d[i], f0 = flor[i * 3] * kf, f1 = flor[i * 3 + 1] * kf, f2 = flor[i * 3 + 2] * kf;
    L.d[j] += e0 + f0; L.d[j + 1] += e1 + f1; L.d[j + 2] += e2 + f2;
    L.d[j + 3] = Math.min(1, L.d[j + 3] + Math.max(e0 + f0, e1 + f1, e2 + f2) * 0.9);
  }
  // barrido de luz: una banda diagonal que cruza despacio entre t 0.08 y 0.62
  if (o.barrido !== false) {
    const u = sat((t - 0.08) / 0.54);
    if (u > 0 && u < 1) {
      const e = u * u * (3 - 2 * u), umin = -0.25 * w, umax = w * 1.25 + h * 0.35, centro = umin + (umax - umin) * e, ancho = 70 * s * 2, fuerza = Math.sin(Math.PI * u);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, rf = c.reflejo.d[i] * apH; if (rf <= 0) continue;
        const d = (x + y * 0.35 - centro) / ancho, k = Math.exp(-d * d) * fuerza * rf * 0.95;
        if (k < 0.002) continue;
        L.d[i * 4] += k * 1.0; L.d[i * 4 + 1] += k * 0.86; L.d[i * 4 + 2] += k * 0.62;
      }
    }
  }
  return L;
}

/** Chispas: nacen en grietas y bordes de arriba, suben frenando con un vaivén, pasan de blanco a rojo y se apagan. */
function chispasTitulo(c: CapasTitulo, t: number, emis: Float32Array, s: number) {
  const { w, h } = c, r = rng(4242), DUR = CUADROS_TITULO / FPS_TITULO, n = 70;
  const colores: [C3, Mascara][] = [[[1.0, 0.85, 0.5], mascara(w, h)], [[1.0, 0.45, 0.1], mascara(w, h)], [[0.7, 0.12, 0.03], mascara(w, h)]];
  for (let i = 0; i < n; i++) {
    const sem = c.semillas[Math.floor(r() * c.semillas.length)] ?? [w / 2, h / 2];
    const fase = r(), vida = 0.7 + r() * 1.3, v0 = (60 + r() * 120) * s * 2, frena = 0.35 + r() * 0.3, deriva = (r() - 0.5) * 30 * s * 2, vaiv = (4 + r() * 10) * s * 2, fr = 3 + r() * 5, ph = r() * 6, tam = (1.1 + r() * 1.4) * s * 2;
    const edad = ((t - fase) % 1 + 1) % 1 * DUR;
    if (edad > vida) continue;
    const pos = (a: number): P2 => [sem[0] + deriva * a + Math.sin(a * fr + ph) * vaiv * a, sem[1] - (v0 * a - v0 * frena * a * a / vida)];
    const [x1, y1] = pos(edad), [x0, y0] = pos(Math.max(0, edad - 0.06));
    const u = edad / vida, k = Math.pow(1 - u, 1.1) * (0.75 + 0.25 * Math.sin(edad * 40 + ph));
    const m = colores[u < 0.3 ? 0 : u < 0.65 ? 1 : 2][1];
    trazo(m, x0, y0, x1, y1, tam * 0.6, tam, k, 'max');
  }
  for (const [col, m] of colores) {
    const g = desenfocada(m, 2.5 * s * 2);
    for (let i = 0; i < w * h; i++) { const v = m.d[i] * 1.6 + g.d[i] * 2.5; if (v <= 0) continue; emis[i * 3] += col[0] * v; emis[i * 3 + 1] += col[1] * v; emis[i * 3 + 2] += col[2] * v; }
  }
}

/** Atajo: un cuadro del título a 8 bits. */
export const cuadroTituloRaster = (c: CapasTitulo, o: OpcCuadro = {}): Raster => aRaster(cuadroTitulo(c, o));
