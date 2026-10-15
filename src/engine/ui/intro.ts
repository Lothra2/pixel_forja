import { Pix, bayer, rng } from '../fx/pix';
import { createRaster, type Raster } from '../core/raster';
import { mixHex, type UiPiece } from './retro';
import { renderHuman } from '../render/human';
import { posesFor } from '../render/clip';
import { aTresConMaterial } from '../kit/portraits';
import type { HumanFicha } from '../sheet/ficha';
import { monserrateLlovizna } from '../world/oblique/candelaria';
import { saigonAmanecer } from '../world/oblique/taodan';
import { COLOMBIA_CANDELARIA_TARDE, VIETNAM_TAODAN_AMANECER } from '../world/oblique/lugaresPaleta';

/**
 * Las escenas de la intro (lote intro): fondos de 800 x 360 (la parte de 640 de x 80 a 720) para las tomas que pide la
 * intro del juego, y las capas que van encima:
 * - la azotea de Tokio al atardecer, y el atleta de espaldas, redibujado a 3, con el gakuran al hombro ondeando;
 * - Bogotá con lluvia, la buseta parada y la lluvia aparte, en bucle;
 * - Maracaibo con calor: el sol, el lago con el puente y la calle que reverbera, en bucle;
 * - el desayuno de la familia en Saigón: la pared con la ventana, la mesa adelante con el café sữa đá y las arepas, y
 *   los huecos para los retratos grandes de 96 sentados detrás de la mesa.
 * Las personas las pone el juego: los retratos en `huecos` y los sprites donde quiera. Lo de aquí es el lugar.
 */

export const INTRO = { w: 800, h: 360, margen: 80 };
const W = INTRO.w, H = INTRO.h;
const INK = '#14101e';

/** Un degradé vertical de colores con el borde entre tono y tono tramado. */
function degrade(p: Pix, y0: number, y1: number, tonos: string[], x0 = 0, x1 = p.w) {
  for (let y = y0; y < y1; y++) {
    const t = ((y - y0) / Math.max(1, y1 - y0)) * (tonos.length - 1), k = Math.floor(t), f = t - k;
    for (let x = x0; x < x1; x++) p.px(x, y, f > 0.5 && bayer(x, y) < (f - 0.5) * 2 && k + 1 < tonos.length ? tonos[k + 1] : tonos[k]);
  }
}

/** Un rectángulo con su borde oscuro. */
function caja(p: Pix, x: number, y: number, w: number, h: number, c: string, borde = INK) {
  p.rect(x, y, w, h, borde);
  if (w > 2 && h > 2) p.rect(x + 1, y + 1, w - 2, h - 2, c);
}

/** El color más repetido de un material en un cuadro. */
function colorDe(r: Raster, mat: (i: number) => string, cual: string): string | null {
  const n = new Map<number, number>();
  for (let i = 0; i < r.w * r.h; i++) if (r.data[i * 4 + 3] && mat(i) === cual) { const c = (r.data[i * 4] << 16) | (r.data[i * 4 + 1] << 8) | r.data[i * 4 + 2]; n.set(c, (n.get(c) ?? 0) + 1); }
  let best = -1, bc = 0;
  for (const [c, k] of n) if (k > best) { best = k; bc = c; }
  return best < 0 ? null : '#' + bc.toString(16).padStart(6, '0');
}

// ---------------------------------------------------------------- el atleta de espaldas

/**
 * El atleta de espaldas, redibujado a 3 desde el cuadro de 64 (como el retrato grande), con el gakuran echado sobre
 * los hombros ondeando hacia la derecha: la tela flamea, la manga de la derecha vuela y la de la izquierda cuelga con
 * su brazalete. Cuatro cuadros en bucle (respira con el `idle`). El ancla es el medio de los pies.
 */
export function espaldas(f: HumanFicha, cuadros = 4): UiPiece {
  const poses = posesFor(f, 64, 'idle', 'back');
  const salida: { r: Raster; pie: [number, number] }[] = [];
  let ancho = 0, alto = 0;
  const brutos = Array.from({ length: cuadros }, (_, k) => {
    const b = renderHuman(f, 64, poses[k % poses.length], 'back', { noOutline: true, materiales: true });
    const bb = (b.whole ?? b.full ?? b.body)!;
    return { b, bb };
  });
  // el mismo recorte para todos, con lugar a la derecha para el gakuran que vuela
  const X0 = Math.min(...brutos.map(({ bb }) => bb.x0)) - 3, Y0 = Math.min(...brutos.map(({ bb }) => bb.y0)) - 3;
  const X1 = Math.max(...brutos.map(({ bb }) => bb.x1)) + 3, Y1 = Math.max(...brutos.map(({ bb }) => bb.y1)) + 2;
  const vuelo = 30;
  brutos.forEach(({ b }, k) => {
    const { r: cuerpo, mat } = aTresConMaterial(b, X0, Y0, X1 - X0 + 1, Y1 - Y0 + 1);
    const out = createRaster(cuerpo.w + vuelo + 8, cuerpo.h);
    const p = new Pix(out.w, out.h);
    // el cuerpo, corrido 8 para que la manga de la izquierda tenga lugar
    for (let y = 0; y < cuerpo.h; y++) for (let x = 0; x < cuerpo.w; x++) { const i = (y * cuerpo.w + x) * 4; if (cuerpo.data[i + 3]) p.r.data.set(cuerpo.data.subarray(i, i + 4), (y * out.w + x + 8) * 4); }
    const matEn = (x: number, y: number) => (x - 8 < 0 || x - 8 >= cuerpo.w ? '' : mat(y * cuerpo.w + x - 8));
    // la chaqueta: dónde están los hombros y la cadera, y su color
    let sy0 = 9999, sy1 = -1, sx0 = 9999, sx1 = -1;
    for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) if (matEn(x, y) === 'jacket' || matEn(x, y) === 'top') { sy0 = Math.min(sy0, y); sy1 = Math.max(sy1, y); sx0 = Math.min(sx0, x); sx1 = Math.max(sx1, x); }
    const base = colorDe(cuerpo, mat, 'jacket') ?? colorDe(cuerpo, mat, 'top') ?? '#2a3050';
    const osc = mixHex(base, '#000000', 0.45), luz = mixHex(base, '#ffffff', 0.16), linea = mixHex(base, '#000000', 0.7);
    const banda = '#b81c2a';
    const fase = (k / cuadros) * Math.PI * 2;
    const hombro = sy0 + 2, cad = sy1 + 4;
    // lo que queda encima del gakuran: la cabeza y el cuello (las manos quedan debajo de la tela)
    const cabeza = (x: number, y: number) => { const m = matEn(x, y); return m === 'hair' || m === 'ears' || m === 'face' || ((m === 'skin' || m === 'neck') && y < hombro + 3); };
    const capa = new Uint8Array(out.w * out.h), u = new Float32Array(out.w * out.h);
    for (let y = hombro; y < out.h; y++) {
      const t = (y - hombro) / Math.max(1, cad - hombro);
      if (t > 1.3) break;
      const izq = sx0 - 2 - Math.round(2 * t + Math.sin(fase + t * 3) * 1.5 * t);
      const der = sx1 + 2 + Math.round(t ** 1.3 * vuelo * 0.75 + Math.sin(fase + t * 4) * 5 * t);
      for (let x = izq; x <= der; x++) {
        // el ruedo ondea, y donde la tela vuela se levanta
        const ruedo = cad + Math.round(Math.sin(fase * 1.3 + x * 0.14) * 2.5 - Math.max(0, x - sx1) * 0.45);
        if (y > ruedo || x < 0 || x >= out.w || cabeza(x, y)) continue;
        capa[y * out.w + x] = 1;
        u[y * out.w + x] = (x - izq) / Math.max(1, der - izq);
      }
    }
    // una manga: un tubo de `largo` desde (ax, ay) con ángulo `ang`, más angosto en el puño
    const manga = (ax: number, ay: number, ang: number, largo: number, conBanda: boolean) => {
      const cs = Math.cos(ang), sn = Math.sin(ang);
      for (let s = 0; s <= largo; s += 0.5) for (let w = -5.5; w <= 5.5; w += 0.5) {
        if (Math.abs(w) > 5.5 - (s / largo) * 1.5) continue;
        const x = Math.round(ax + cs * s - sn * w), y = Math.round(ay + sn * s + cs * w);
        if (x < 0 || y < 0 || x >= out.w || y >= out.h || cabeza(x, y)) continue;
        const i = y * out.w + x;
        capa[i] = conBanda && s > largo * 0.3 && s < largo * 0.42 ? 3 : s > largo - 3 ? 4 : 2;
        u[i] = 0.5 + w / 22;
      }
    };
    manga(sx1 + 1, hombro + 7, 0.42 - 0.22 * Math.sin(fase), 30, false);
    manga(sx0 + 1, hombro + 7, Math.PI / 2 + 0.05 + 0.05 * Math.sin(fase + 1), 30, true);
    // pintar: tres pliegues anchos que corren con el viento, tramados en el borde; luz arriba, contorno oscuro
    for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
      const i = y * out.w + x, v = capa[i];
      if (!v) continue;
      const borde = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X < 0 || Y < 0 || X >= out.w || Y >= out.h || (!capa[Y * out.w + X] && !cabeza(X, Y)); });
      if (borde) { p.px(x, y, linea); continue; }
      if (v === 3) { p.px(x, y, banda); continue; }
      if (v === 4) { p.px(x, y, osc); continue; }
      const t = (y - hombro) / Math.max(1, cad - hombro);
      const pl = Math.sin(u[i] * Math.PI * 2 * 2.5 - fase - t * 1.8) + (bayer(x, y) - 0.5) * 0.5;
      p.px(x, y, y < hombro + 3 ? osc : pl > 0.62 ? osc : pl < -0.62 && t < 0.8 ? luz : base);
    }
    // el cuello alto del gakuran, oscuro, justo debajo del pelo
    for (let x = sx0 + 10; x < sx1 - 10; x++) for (let y = hombro - 3; y < hombro + 1; y++) if (!cabeza(x, y)) p.px(x, y, linea);
    out.data.set(p.r.data);
    ancho = Math.max(ancho, out.w); alto = Math.max(alto, out.h);
    let fondo = out.h - 1;
    while (fondo > 0 && !Array.from({ length: out.w }, (_, x) => out.data[(fondo * out.w + x) * 4 + 3]).some(Boolean)) fondo--;
    salida.push({ r: out, pie: [8 + Math.round((b.pivotX - X0) * 3), fondo] });
  });
  return {
    name: 'intro_espaldas', frames: salida.map((s) => s.r), w: ancho, h: alto, fps: 6, loop: true,
    extra: { ancla: salida[0].pie, nota: 'El atleta de espaldas a 3, con el gakuran ondeando. `ancla` es el medio de los pies: el juego lo pone ahí en la azotea (`pie` de intro_azotea).' },
  };
}

// ---------------------------------------------------------------- la azotea de Tokio

/** Dónde va cada cosa en la azotea (coordenadas de la imagen). */
export const AZOTEA = { pie: [460, 334] as [number, number], texto: [180, 18, 440, 40] as [number, number, number, number] };

/** Una torre de celosía (la Torre de Tokio) de alto `h` con la base en (cx, base). */
function torreTokio(p: Pix, cx: number, base: number, h: number, rojo: string, blanco: string, luz: string) {
  for (let y = 0; y < h; y++) {
    const t = y / h, a = Math.round(2 + (1 - t) ** 2.2 * h * 0.28);
    const c = Math.floor(t * 7) % 2 ? blanco : rojo;
    p.px(cx - a, base - y, c); p.px(cx + a, base - y, c);
    if (y % 6 === 0) for (let x = -a; x <= a; x++) p.px(cx + x, base - y, c);
    if (y % 6 < 3) { p.px(cx - a + ((y % 6) * a) / 3, base - y, c); p.px(cx + a - ((y % 6) * a) / 3, base - y, c); }
    if (Math.abs(y - h * 0.38) < 2 || Math.abs(y - h * 0.62) < 1.5) for (let x = -a - 2; x <= a + 2; x++) p.px(cx + x, base - y, luz);
  }
  for (let y = 0; y < 10; y++) p.px(cx, base - h - y, blanco);
}

/** La azotea del instituto en Tokio, al atardecer: el sol bajando entre la ciudad, la torre roja, la reja y el tanque. */
export function azotea(): UiPiece {
  const p = new Pix(W, H), r = rng(51);
  // el cielo de atardecer en bandas
  degrade(p, 0, 230, ['#20183e', '#3a2256', '#6a2c62', '#b04a5e', '#ee7a52', '#ffb35a']);
  // el sol grande con las rayas de arcade
  const [sx, sy, sr] = [520, 214, 58];
  for (let y = sy - sr; y < sy + sr; y++) for (let x = sx - sr; x < sx + sr; x++) {
    const d = Math.hypot(x - sx, y - sy);
    if (d > sr) continue;
    const raya = y > sy - 6 && (y - sy) % 7 < Math.min(4, 1 + (y - sy) / 12);
    if (raya) continue;
    p.px(x, y, y < sy - sr * 0.45 ? '#fff0a8' : y < sy ? '#ffd46a' : '#ffaa4a');
  }
  // nubes largas de atardecer
  for (const [cx, cy, l] of [[150, 70, 180], [640, 52, 140], [380, 118, 220], [720, 150, 120]]) for (let x = -l / 2; x < l / 2; x++) {
    const g = Math.round(3 - Math.abs(x) / (l / 5));
    for (let y = -Math.max(1, g); y <= 0; y++) p.px(cx + x, cy + y, y === 0 ? '#ffb08a' : '#d06a7a');
  }
  // la ciudad lejos: siluetas violetas con ventanas, la torre y la torre alta
  const lejos = '#3c2a58', cerca = '#2a1e44', vent = '#ffc86a';
  p.rect(0, 226, W, 20, cerca);
  for (let x = 0, h = 0; x < W; x += 6 + Math.floor(r() * 14)) {
    h = 30 + Math.floor(r() * 60);
    const w = 10 + Math.floor(r() * 18);
    for (let y = 232 - h; y < 232; y++) for (let k = 0; k < w; k++) p.px(x + k, y, lejos);
  }
  torreTokio(p, 170, 232, 120, '#d83a2a', '#f4e6d8', '#ffe28a');
  // la torre alta (Skytree), fina y gris
  for (let y = 0; y < 170; y++) { const a = y < 120 ? 3 - Math.floor(y / 50) : 1; for (let k = -a; k <= a; k++) p.px(640 + k, 232 - y, y > 120 && y < 126 ? '#e8e0f0' : '#6c6a8c'); }
  for (let x = 0, h = 0; x < W; x += 10 + Math.floor(r() * 16)) {
    h = 18 + Math.floor(r() * 44);
    const w = 14 + Math.floor(r() * 22);
    for (let y = 244 - h; y < 244; y++) for (let k = 0; k < w; k++) p.px(x + k, y, cerca);
    for (let y = 244 - h + 4; y < 240; y += 6) for (let k = 3; k < w - 3; k += 5) if (r() < 0.35) { p.px(x + k, y, vent); p.px(x + k + 1, y, vent); }
  }
  // la azotea: el piso de concreto con sus juntas en perspectiva hacia el sol
  degrade(p, 244, H, ['#5a4a62', '#6e5c6c', '#7e6a70', '#8a7470']);
  for (let k = -12; k <= 12; k++) { const x0 = sx + k * 20; for (let y = 244; y < H; y++) { const x = Math.round(x0 + ((y - 244) / (H - 244)) * k * 90); if (x >= 0 && x < W && bayer(x, y) < 0.5) p.px(x, y, '#4c3e56'); } }
  for (const y of [258, 278, 306, 342]) for (let x = 0; x < W; x++) if ((x + y) % 2 === 0) p.px(x, y, '#4c3e56');
  // el reflejo del sol en el piso
  for (let y = 246; y < H; y++) { const a = 4 + (y - 246) * 0.25; for (let x = Math.round(sx - a); x <= sx + a; x++) if ((x + y * 3) % 7 === 0 && bayer(x, y) < 0.35 - (y - 246) / 300) p.px(x, y, '#a07a72'); }
  // la reja de la azotea: postes y malla en rombos, contra el cielo
  const reja = '#1c1428';
  for (let x = 0; x < W; x++) for (let y = 196; y < 246; y++) {
    const malla = ((x + y) % 8 === 0) || ((x - y + 800) % 8 === 0);
    if (malla && y > 198) p.px(x, y, reja);
  }
  for (let x = 20; x < W; x += 96) caja(p, x, 188, 5, 60, '#3a2c44', reja);
  for (const y of [190, 196, 244]) p.rect(0, y, W, 2, reja);
  // el tanque de agua a la izquierda y la caseta de la escalera a la derecha
  caja(p, 30, 210, 90, 70, '#8a8aa0'); p.rect(31, 211, 88, 6, '#a8a8bc');
  for (let x = 40; x < 116; x += 12) p.rect(x, 218, 2, 60, '#6c6c84');
  caja(p, 50, 280, 6, 30, '#3a2c44'); caja(p, 96, 280, 6, 30, '#3a2c44');
  caja(p, 680, 200, 110, 110, '#7a6a7c'); caja(p, 704, 238, 32, 72, '#4a3a52'); p.rect(728, 270, 3, 3, '#e0c060');
  p.rect(681, 201, 108, 5, '#9a8a98');
  // el letrero de salida verde sobre la puerta
  caja(p, 702, 226, 36, 9, '#3ac06a');
  return {
    name: 'intro_azotea', frames: [p.r], w: W, h: H,
    extra: { margen: INTRO.margen, pie: AZOTEA.pie, texto: AZOTEA.texto, nota: 'La azotea de Tokio al atardecer. El atleta de espaldas (intro_espaldas) va con su `ancla` en `pie`, mirando el sol. `texto` es el cielo tranquilo para el diálogo o el título.' },
  };
}

// ---------------------------------------------------------------- Bogotá con lluvia

/**
 * La presentación de un equipo en Bogotá y en Maracaibo: cuatro huecos de 96 para los retratos, sobre la capa
 * `intro_presentacion` (una franja con un marco por hueco y el fondo claro, para que la silueta se lea y el retrato
 * no quede flotando sobre la buseta o la baranda). `nombres` es la fila del nombre bajo cada hueco.
 */
export const PRESENTA = {
  huecos: [[188, 132, 96, 96], [296, 132, 96, 96], [404, 132, 96, 96], [512, 132, 96, 96]] as [number, number, number, number][],
  marco: 6,
  franja: [164, 116, 472, 152] as [number, number, number, number],
  nombres: 252,
  /** el ancho de cada placa del nombre, centrada en su hueco: a 1,5 caben 108 px de texto (DON HERNANDO) */
  placa: 112,
};

/** Dónde va cada cosa en Bogotá (coordenadas de la imagen). */
export const BOGOTA = {
  /** el andén donde se paran las personas (y de los pies) */
  anden: 300,
  /** los huecos de la presentación (los mismos de Maracaibo, sobre intro_presentacion) */
  huecos: PRESENTA.huecos,
  texto: [180, 14, 440, 34] as [number, number, number, number],
};

/** Un edificio de ladrillo bogotano: el ladrillo a la vista con sus hiladas, ventanas blancas y el zócalo. */
function ladrillo(p: Pix, x0: number, y0: number, w: number, h: number, seed: number) {
  const r = rng(seed);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const fila = Math.floor((y - y0) / 3), junta = (y - y0) % 3 === 2 || (x + (fila % 2) * 4) % 8 === 0;
    p.px(x, y, junta ? '#7a4a3a' : r() < 0.15 ? '#a8604a' : '#9a5442');
  }
  for (let y = y0 + 10; y < y0 + h - 40; y += 34) for (let x = x0 + 10; x + 26 < x0 + w; x += 38) {
    caja(p, x, y, 26, 24, '#3a4a5a', '#e8e2d8');
    p.rect(x + 12, y + 1, 2, 22, '#e8e2d8'); p.rect(x + 1, y + 11, 24, 2, '#e8e2d8');
    p.rect(x - 2, y + 24, 30, 3, '#d8d2c4');
  }
  p.rect(x0, y0, w, 3, '#5a3a30');
  p.rect(x0, y0 + h - 16, w, 16, '#6a6a6a');
}

/** La buseta: blanca con franjas verde y amarilla, parabrisas grande adelante (a la derecha) y su letrero de ruta. */
function buseta(p: Pix, x0: number, piso: number) {
  const L = 236, A = 92, y0 = piso - A;
  const cuerpo = '#eeeae0', sombra = '#c8c2b4';
  // la carrocería con la trompa redonda
  for (let y = y0; y < piso - 10; y++) for (let x = x0; x < x0 + L; x++) {
    const tr = x > x0 + L - 14 && y < y0 + 14 && Math.hypot(x - (x0 + L - 14), y - (y0 + 14)) > 14;
    const tl = x < x0 + 8 && y < y0 + 8 && Math.hypot(x - (x0 + 8), y - (y0 + 8)) > 8;
    if (tr || tl) continue;
    p.px(x, y, y > piso - 30 ? sombra : cuerpo);
  }
  // franjas
  p.rect(x0, y0 + 52, L, 6, '#2a9a4a'); p.rect(x0, y0 + 58, L, 4, '#f2c230'); p.rect(x0, y0 + 62, L, 2, '#d8282a');
  // ventanas de los lados con gente adentro, y el parabrisas
  for (let k = 0; k < 6; k++) {
    const vx = x0 + 10 + k * 30;
    caja(p, vx, y0 + 12, 26, 32, '#5a7a90', '#2a2a30');
    if (k % 2 === 0 || k === 3) { p.disc(vx + 13, y0 + 30, 5, '#3a2a26'); p.rect(vx + 7, y0 + 34, 12, 10, ['#c03a3a', '#3a5ac0', '#8a6a3a'][k % 3]); }
    p.rect(vx + 2, y0 + 14, 6, 2, '#9ab8cc');
  }
  caja(p, x0 + L - 36, y0 + 8, 34, 40, '#7a9ab0', '#2a2a30');
  p.rect(x0 + L - 34, y0 + 10, 10, 3, '#b8d4e4');
  // el letrero de la ruta encima del parabrisas, y la puerta
  caja(p, x0 + L - 70, y0 - 12, 60, 12, '#f2c230', '#2a2a30');
  for (let x = x0 + L - 64; x < x0 + L - 16; x += 5) p.rect(x, y0 - 8, 3, 4, '#2a2a30');
  caja(p, x0 + L - 60, y0 + 48, 20, 34, '#9ab0c0', '#2a2a30');
  // el bómper, las luces y las llantas
  p.rect(x0 - 2, piso - 16, L + 4, 6, '#2a2a30'); p.rect(x0 + L - 6, piso - 28, 6, 6, '#ffe08a'); p.rect(x0, piso - 28, 4, 6, '#d8282a');
  for (const cx of [x0 + 44, x0 + L - 48]) { p.disc(cx, piso - 8, 12, '#1a1a1e'); p.disc(cx, piso - 8, 6, '#8a8a90'); p.disc(cx, piso - 8, 2, '#1a1a1e'); }
  p.rect(x0 + 8, y0, L - 22, 1, '#2a2a30');
}

/** Bogotá en la tarde con lluvia: Monserrate en la neblina, la calle de ladrillo, el andén mojado y la buseta. */
export function bogota(): UiPiece {
  const p = new Pix(W, H), r = rng(77);
  // Monserrate con su llovizna, la capa lejos de la cancha de tejo de La Candelaria
  const monserrate = monserrateLlovizna(COLOMBIA_CANDELARIA_TARDE, W, 170, 3).r;
  degrade(p, 0, 240, ['#6e7a8c', '#7e8a9a', '#929caa', '#a6aeb8']);
  for (let y = 0; y < monserrate.h; y++) for (let x = 0; x < Math.min(W, monserrate.w); x++) { const i = (y * monserrate.w + x) * 4; if (monserrate.data[i + 3]) p.r.data.set(monserrate.data.subarray(i, i + 4), ((y + 70) * W + x) * 4); }
  // la neblina sobre los cerros
  for (let y = 60; y < 200; y++) for (let x = 0; x < W; x++) if (bayer(x, y) < 0.18 + Math.sin(x * 0.02 + y * 0.05) * 0.06) p.px(x, y, '#b8c0c8');
  // la cuadra de enfrente: casas de dos pisos con sus tiendas, toldos y avisos, de 230 al andén
  const fachadas = ['#e8dcc4', '#c8d8c0', '#f0c890', '#d8c8d8', '#e8e4d8', '#c0d0dc'];
  for (let x = 0, k = 0; x < W; k++) {
    const w = 70 + ((k * 37) % 40), c = fachadas[k % fachadas.length];
    for (let y = 226; y < 290; y++) for (let q = 0; q < w && x + q < W; q++) p.px(x + q, y, q === 0 ? '#8a7e70' : c);
    p.rect(x, 226, w, 4, '#a8503a');
    // la ventana de arriba con su balconcito y la tienda abajo con su toldo y su aviso
    caja(p, x + 10, 234, 20, 16, '#4a5a6a', '#5a3a2a'); p.rect(x + 8, 250, 24, 2, '#5a3a2a');
    if (w > 60) caja(p, x + w - 30, 234, 20, 16, '#4a5a6a', '#5a3a2a');
    caja(p, x + 8, 262, w - 20, 28, '#2e3a46', '#3a2a22');
    for (let q = 0; q < w - 16; q++) p.px(x + 6 + q, 258 + (q % 6 < 3 ? 0 : 1), Math.floor(q / 6) % 2 ? '#f4f0e6' : ['#d8282a', '#2a9a4a', '#2a5ad0'][k % 3]);
    caja(p, x + 14, 252, Math.min(36, w - 28), 6, ['#f2c230', '#d8282a', '#f4f0e6'][k % 3]);
    x += w;
  }
  // los edificios de ladrillo a los lados, enmarcando
  ladrillo(p, 0, 90, 150, 210, 3); ladrillo(p, 650, 70, 150, 230, 5);
  ladrillo(p, 140, 170, 90, 130, 9);
  // el andén y la calle mojada
  degrade(p, 290, 304, ['#8a8c90', '#7a7c80']);
  for (let x = 0; x < W; x += 16) p.rect(x, 290, 1, 14, '#6a6c70');
  p.rect(0, 303, W, 3, '#c8c8c0');
  degrade(p, 306, H, ['#3a3e46', '#30343c', '#2a2e36']);
  // las rayas del carril y los reflejos en el asfalto mojado
  for (let x = 0; x < W; x += 60) p.rect(x, 334, 30, 3, '#d8d4c0');
  for (let x = 0; x < W; x++) for (let y = 308; y < H; y++) {
    const fuente = 304 - (y - 306) * 2; // lo que se refleja: la fila de arriba del andén, estirada
    if (fuente < 0 || bayer(x, y) > 0.35 || (y + Math.floor(x / 3)) % 3) continue;
    const i = (fuente * W + x) * 4;
    p.px(x, y, mixHex('#' + [p.r.data[i], p.r.data[i + 1], p.r.data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join(''), '#30343c', 0.55));
  }
  // charcos
  for (const [cx, cy, rx] of [[120, 340, 40], [520, 352, 56], [700, 326, 30]]) for (let y = -4; y <= 4; y++) for (let x = -rx; x <= rx; x++) if ((x / rx) ** 2 + (y / 4) ** 2 <= 1) p.px(cx + x, cy + y, (x + y) % 5 === 0 ? '#8a96a6' : '#4a5260');
  // la buseta parada en el andén
  buseta(p, 330, 330);
  // un poste de luz y la chaza del vendedor con su sombrilla de rayas
  caja(p, 600, 140, 4, 166, '#3a3e46'); caja(p, 586, 136, 32, 6, '#3a3e46'); p.rect(588, 142, 8, 3, '#ffe8a8');
  caja(p, 232, 272, 40, 24, '#c8a060', '#5a3a1a'); p.rect(234, 276, 36, 4, '#d8282a'); p.rect(234, 284, 36, 3, '#f2c230');
  for (const dx of [236, 266]) p.rect(dx, 296, 2, 6, '#3a2a1a');
  p.rect(251, 226, 2, 46, INK);
  for (let y = 0; y < 14; y++) { const a = 30 - y * 1.9; for (let x = -a; x <= a; x++) p.px(Math.round(252 + x), 214 + y, y === 13 ? INK : Math.floor((x + 30) / 10) % 2 ? '#c8282a' : '#f2c230'); }
  void r;
  return {
    name: 'intro_bogota', frames: [p.r], w: W, h: H,
    extra: { margen: INTRO.margen, anden: BOGOTA.anden, huecos: BOGOTA.huecos, nombres: PRESENTA.nombres, texto: BOGOTA.texto, nota: 'Bogotá con lluvia. La lluvia va aparte en intro_bogota_lluvia, encima de todo. `huecos` sirve para presentar a un equipo con sus retratos de 96 (en silueta y después de color).' },
  };
}

/** La lluvia de Bogotá: rayas finas en diagonal y gotas que salpican en la calle, en 4 cuadros que dan la vuelta. */
export function lluvia(cuadros = 4): UiPiece {
  const frames: Raster[] = [];
  const P = 48; // el patrón se repite cada P filas: cada cuadro baja P / cuadros
  for (let k = 0; k < cuadros; k++) {
    const p = new Pix(W, H), r = rng(91);
    const gotas = Array.from({ length: 520 }, () => [Math.floor(r() * W), Math.floor(r() * P), 4 + Math.floor(r() * 5)] as const);
    for (const [gx, gy, l] of gotas) for (let rep = -1; rep < H / P + 1; rep++) {
      const y0 = gy + rep * P + (k * P) / cuadros;
      for (let s = 0; s < l; s++) { const x = Math.round(gx - (y0 + s) * 0.18), y = Math.round(y0 + s); if (x >= 0 && x < W && y >= 0 && y < H) p.px(x, y, s === l - 1 ? '#e4ecf4' : '#a8b8c8'); }
    }
    // salpicaduras en la calle: cada una vive un cuadro
    const rs = rng(200 + k);
    for (let n = 0; n < 40; n++) { const x = Math.floor(rs() * W), y = 308 + Math.floor(rs() * 50); p.px(x - 1, y, '#c8d4e0'); p.px(x + 1, y, '#c8d4e0'); p.px(x, y - 1, '#e4ecf4'); }
    frames.push(p.r);
  }
  return { name: 'intro_bogota_lluvia', frames, w: W, h: H, fps: 10, loop: true, extra: { nota: 'Capa transparente encima de intro_bogota (y de la gente). 4 cuadros en bucle.' } };
}

// ---------------------------------------------------------------- Maracaibo con calor

export const MARACAIBO = { malecon: 292, huecos: PRESENTA.huecos, texto: [180, 14, 440, 34] as [number, number, number, number] };

/** La reverberación: las filas de y0 a y1 se corren un poco, distinto en cada cuadro. */
function temblor(p: Pix, y0: number, y1: number, amp: number, fase: number) {
  const copia = p.r.data.slice();
  for (let y = y0; y < y1; y++) {
    const dx = Math.round(Math.sin(y * 0.55 + fase * 2) * amp * ((y - y0) / (y1 - y0) + 0.3));
    if (!dx) continue;
    for (let x = 0; x < p.w; x++) { const sx = Math.min(p.w - 1, Math.max(0, x - dx)); p.r.data.set(copia.subarray((y * p.w + sx) * 4, (y * p.w + sx) * 4 + 4), (y * p.w + x) * 4); }
  }
}

/** Una palmera de coco con el tronco curvo y la base en (x, y). */
function palmera(p: Pix, x: number, y: number, alto: number, curva: number, fase: number) {
  let tx = x, ty = y;
  for (let s = 0; s < alto; s++) { const t = s / alto; tx = x + curva * t * t; ty = y - s; for (let w = -2; w <= 2; w++) p.px(Math.round(tx + w), ty, w === -2 ? '#4a3a2a' : s % 5 === 0 ? '#6a5236' : '#8a6c48'); }
  for (let h = 0; h < 7; h++) {
    const a = -Math.PI / 2 + (h - 3) * 0.55 + Math.sin(fase + h) * 0.05;
    for (let s = 0; s < 34; s++) {
      const cx = tx + Math.cos(a) * s, cy = ty + Math.sin(a) * s + (s * s) / 60;
      for (let w = -1; w <= 1; w++) p.px(Math.round(cx), Math.round(cy + w), w === 1 ? '#2a6a2a' : '#3a8a34');
      if (s % 3 === 0) for (let q = 1; q < 6 - s / 8; q++) { p.px(Math.round(cx - Math.sin(a) * q), Math.round(cy + q), '#3a8a34'); p.px(Math.round(cx + Math.sin(a) * q * 0.5), Math.round(cy + q), '#2a6a2a'); }
    }
  }
  p.disc(tx - 2, ty + 3, 3, '#6a4a1a'); p.disc(tx + 3, ty + 4, 3, '#7a5a2a');
}

/** El puente sobre el lago, lejos y en la calina: el tablero largo y sus cinco torres con los tirantes. */
function puenteLejos(p: Pix, x0: number, x1: number, y: number, c: string, c2: string) {
  for (let x = x0; x < x1; x++) { p.px(x, y, c); p.px(x, y + 1, c2); if (x % 9 === 0) for (let k = 2; k < 9; k++) p.px(x, y + k, c2); }
  for (let t = 0; t < 5; t++) {
    const tx = Math.round(x0 + (x1 - x0) * (0.22 + t * 0.14));
    for (let k = 0; k < 34; k++) { p.px(tx - Math.round(k * 0.12), y - k, c); p.px(tx + Math.round(k * 0.12), y - k, c); }
    for (let s = 1; s < 5; s++) { for (let u = 0; u < 1; u += 0.02) { p.px(Math.round(tx + u * s * 9), Math.round(y - 30 + u * 30), c2); p.px(Math.round(tx - u * s * 9), Math.round(y - 30 + u * 30), c2); } }
  }
}

/** Un balancín petrolero en el lago: la plataforma y el caballito. */
function balancin(p: Pix, x: number, y: number, k: number) {
  const c = '#4a5a62';
  p.rect(x - 10, y, 22, 2, c); for (const dx of [-8, 8]) p.rect(x + dx, y + 2, 1, 5, c);
  for (let s = 0; s < 8; s++) p.px(x - 2 + Math.round(s * 0.3), y - s, c);
  const a = Math.sin(k) * 0.25;
  for (let s = -8; s <= 8; s++) p.px(Math.round(x + s), Math.round(y - 8 + s * a), c);
  p.rect(x + 7, Math.round(y - 8 + 8 * a), 3, 4, c);
}

/**
 * Maracaibo con calor, en 4 cuadros: el cielo blanco del mediodía, el sol que quema con su halo, el lago con el
 * puente y los balancines en la calina, las palmeras del malecón y la calle que reverbera (las filas tiemblan).
 */
export function maracaibo(cuadros = 4): UiPiece {
  const frames: Raster[] = [];
  for (let k = 0; k < cuadros; k++) {
    const fase = (k / cuadros) * Math.PI * 2;
    const p = new Pix(W, H);
    degrade(p, 0, 196, ['#86c4dc', '#a8d6e6', '#cfe8ea', '#f0f0dc', '#fff4d0']);
    // el sol con su halo que late
    const [sx, sy] = [620, 64];
    for (let y = 0; y < 196; y++) for (let x = 440; x < W; x++) {
      const d = Math.hypot(x - sx, y - sy);
      if (d < 30) p.px(x, y, '#ffffff');
      else if (d < 36) p.px(x, y, '#fffbe0');
      else if (d < 70 + Math.sin(fase) * 3 && bayer(x, y) < (70 - d) / 50) p.px(x, y, '#fff8c8');
    }
    for (let a = 0; a < 16; a++) {
      const an = (a / 16) * Math.PI * 2 + fase / 16;
      for (let s = 40; s < 40 + (a % 2 ? 26 : 44); s++) if (s % 3) p.px(Math.round(sx + Math.cos(an) * s), Math.round(sy + Math.sin(an) * s), '#fff2a8');
    }
    // el lago: lejos claro y lechoso, cerca más verde, con brillos
    degrade(p, 196, 262, ['#b8ccc4', '#98b8b0', '#7aa4a0', '#5e8e8c']);
    for (let y = 198; y < 262; y++) for (let x = 0; x < W; x++) if ((x * 3 + y * 7 + k * 5) % 41 === 0) { p.px(x, y, '#fffbe0'); p.px(x + 1, y, '#e8f0e0'); }
    puenteLejos(p, 40, 470, 192, '#9aaab0', '#aab8bc');
    for (const [bx, by] of [[540, 220], [610, 232], [700, 214], [150, 238]]) balancin(p, bx, by, fase + bx);
    // el malecón: el borde de concreto, la baranda y el piso caliente
    p.rect(0, 262, W, 6, '#d8ccb0'); p.rect(0, 268, W, 3, '#b0a488');
    degrade(p, 271, 296, ['#e8dcc0', '#dccfae']);
    for (let x = 0; x < W; x += 24) { p.rect(x, 248, 3, 20, '#f4f0e6'); }
    p.rect(0, 246, W, 3, '#f4f0e6'); p.rect(0, 256, W, 2, '#e4ddcc');
    // la calle de asfalto que quema
    degrade(p, 296, H, ['#6a6460', '#5e5854', '#544e4a']);
    p.rect(0, 296, W, 3, '#f2c230');
    for (let x = 20; x < W; x += 80) p.rect(x, 330, 40, 3, '#f4f0e6');
    // la reverberación del fondo: el horizonte y la calle tiemblan; las palmeras y el carrito no
    temblor(p, 176, 206, 1.4, fase); temblor(p, 300, H, 1.2, fase);
    // las palmeras con su sombra en el piso
    for (const [px, alto, cur] of [[70, 150, 18], [210, 120, -12], [730, 160, -20]] as const) {
      for (let x = -24; x < 24; x++) for (let y = 0; y < 6; y++) if (bayer(px + x, 288 + y) < 0.5) p.px(px + x + 12, 288 + y, '#b8ab8c');
      palmera(p, px, 290, alto, cur, fase);
    }
    // el carrito de raspados con su sombrilla
    const cx = 560, cy = 290;
    caja(p, cx - 30, cy - 34, 60, 30, '#f4f0e6'); p.rect(cx - 29, cy - 20, 58, 4, '#d8282a');
    for (let b = 0; b < 5; b++) { const c = ['#d8282a', '#f2c230', '#3ac06a', '#3a7ad0', '#c03ad0'][b]; caja(p, cx - 26 + b * 11, cy - 46, 6, 12, c); }
    for (const dx of [-22, 22]) { p.disc(cx + dx, cy - 2, 5, '#2a2a30'); p.disc(cx + dx, cy - 2, 2, '#9a9aa0'); }
    p.rect(cx - 1, cy - 96, 2, 50, '#4a4a50');
    for (let y = 0; y < 16; y++) { const a = 40 - y * 2.4; for (let x = -a; x <= a; x++) p.px(Math.round(cx + x), cy - 112 + y, y === 15 ? '#9a1a1a' : Math.floor((x + 40) / 10) % 2 ? '#d8282a' : '#f4f0e6'); }
    frames.push(p.r);
  }
  return {
    name: 'intro_maracaibo', frames, w: W, h: H, fps: 6, loop: true,
    extra: { margen: INTRO.margen, malecon: MARACAIBO.malecon, huecos: MARACAIBO.huecos, nombres: PRESENTA.nombres, texto: MARACAIBO.texto, nota: 'Maracaibo con calor, 4 cuadros en bucle: el halo del sol late, los balancines cabecean y el horizonte y la calle reverberan. La gente va parada en el malecón (y `malecon`).' },
  };
}

// ---------------------------------------------------------------- el desayuno en Saigón

/** Dónde van los retratos de la familia (96 x 96, detrás de la mesa) y la mesa. */
export const DESAYUNO = {
  huecos: [[190, 178, 96, 96], [298, 178, 96, 96], [406, 178, 96, 96], [514, 178, 96, 96]] as [number, number, number, number][],
  mesa: 266,
  texto: [180, 8, 440, 26] as [number, number, number, number],
};

/** Un vaso de café sữa đá: la leche condensada abajo, el café arriba, el hielo, y el phin encima goteando. */
function caféSuaDa(p: Pix, cx: number, base: number, gota: number) {
  for (let y = 0; y < 26; y++) {
    const a = 7 + Math.round(y * 0.12);
    for (let x = -a; x <= a; x++) {
      const borde = Math.abs(x) === a;
      p.px(cx + x, base - y, borde ? '#c8d8e0' : y < 6 ? '#f2e8cc' : y < 8 ? '#c8a070' : '#5a3218');
    }
  }
  for (const [ix, iy] of [[-3, 14], [2, 18], [-1, 21]]) caja(p, cx + ix - 2, base - iy - 2, 5, 4, '#9a6a48', '#c8a888');
  // el phin de aluminio y su gota
  caja(p, cx - 9, base - 30, 18, 4, '#c8ccd4', '#7a7e88'); caja(p, cx - 6, base - 38, 12, 9, '#d8dce4', '#7a7e88'); p.rect(cx - 7, base - 40, 14, 2, '#9a9ea8');
  if (gota >= 0) p.px(cx, base - 25 + gota, '#3a2010');
}

/** Un plato de arepas doradas, con sus rayitas de la plancha, del que sale humito. */
function arepas(p: Pix, cx: number, base: number) {
  for (let y = -6; y <= 6; y++) for (let x = -30; x <= 30; x++) if ((x / 30) ** 2 + (y / 6) ** 2 <= 1) p.px(cx + x, base + y, (x / 30) ** 2 + (y / 6) ** 2 > 0.8 ? '#c8c0b0' : '#f4f0e8');
  for (const [dx, dy] of [[-12, -6], [10, -5], [0, -11]]) {
    for (let y = -5; y <= 5; y++) for (let x = -11; x <= 11; x++) if ((x / 11) ** 2 + (y / 5) ** 2 <= 1) p.px(cx + dx + x, base + dy + y, (x / 11) ** 2 + (y / 5) ** 2 > 0.75 ? '#a8742a' : y < -1 ? '#f0c870' : '#e0a848');
    p.px(cx + dx - 4, base + dy - 1, '#8a5a1a'); p.px(cx + dx + 2, base + dy + 1, '#8a5a1a'); p.px(cx + dx + 5, base + dy - 2, '#8a5a1a');
  }
}

/**
 * La mesa del desayuno, adelante, en 4 cuadros: la madera, los cuatro cafés sữa đá frente a cada hueco con el phin
 * goteando, el plato de arepas con su humito, el pan y el azúcar. Lo de arriba de la mesa es transparente: los
 * retratos de la familia van entre el fondo y esta capa, así la mesa les tapa los hombros.
 */
export function desayunoMesa(cuadros = 4): UiPiece {
  const frames: Raster[] = [];
  const top = DESAYUNO.mesa;
  for (let k = 0; k < cuadros; k++) {
    const p = new Pix(W, H);
    // la tabla vista un poquito desde arriba, el canto y las patas
    for (let y = top; y < 312; y++) for (let x = 110; x < 690; x++) p.px(x, y, (y - top) % 9 === 0 || (x * 7 + y) % 97 < 2 ? '#8a5a34' : y < top + 3 ? '#c48a54' : '#a8703e');
    p.rect(104, 312, 592, 12, '#6a4224'); p.rect(104, 312, 592, 2, '#8a5a34');
    for (const x of [130, 660]) p.rect(x, 324, 12, H - 324, '#5a3820');
    p.rect(110, top, 580, 1, '#5a3820');
    // un mantelito de cuadros en el medio
    for (let y = top + 6; y < 306; y++) for (let x = 330; x < 470; x++) p.px(x, y, (Math.floor((x - 330) / 8) + Math.floor((y - top) / 6)) % 2 ? '#e8e0d0' : '#d84a4a');
    // los cafés frente a cada retrato, con la gota que baja en cada cuadro
    DESAYUNO.huecos.forEach(([hx, , hw], i) => caféSuaDa(p, hx + hw / 2 + (i < 2 ? 18 : -18), top + 30, (k + i) % 4 === 3 ? -1 : ((k + i) % 4) * 3));
    arepas(p, 400, top + 20);
    // el pan, el azucarero y la jarra de té
    for (let x = -18; x <= 18; x++) for (let y = -4; y <= 4; y++) if ((x / 18) ** 2 + (y / 4) ** 2 <= 1) p.px(160 + x, top + 24 + y, y < -1 ? '#f0c070' : '#d89a48');
    caja(p, 620, top + 10, 18, 20, '#e8f0f4', '#7a8a96'); p.rect(621, top + 8, 16, 3, '#c8d4dc');
    // el humito de las arepas: tres hilos que suben y se mecen
    for (let h = 0; h < 3; h++) for (let s = 0; s < 22; s++) {
      const x = 388 + h * 12 + Math.round(Math.sin(s * 0.35 + k * (Math.PI / 2) + h) * 2.5), y = top + 8 - s;
      if ((s + k + h) % 7 < 5) p.px(x, y, s < 10 ? '#ffffff' : '#e8eef4');
    }
    frames.push(p.r);
  }
  return { name: 'intro_desayuno_mesa', frames, w: W, h: H, fps: 6, loop: true, extra: { mesa: DESAYUNO.mesa, nota: 'Capa de adelante del desayuno, 4 cuadros en bucle (el phin gotea y las arepas echan humito). Va encima de los retratos.' } };
}

/**
 * El fondo del desayuno en un apartamento de Saigón en la mañana: la pared verde clarito, la ventana grande con la
 * reja de flores de hierro y la ciudad amaneciendo afuera, el calendario de hojas, la mata, el abanico de techo y la
 * repisa con las latas de café. Los cuatro `huecos` son para los retratos de 96 de la familia, sentados a la mesa.
 */
export function desayuno(): UiPiece {
  const p = new Pix(W, H);
  // Saigón amaneciendo afuera: la capa lejos del parque Tao Đàn
  const ventana = saigonAmanecer(VIETNAM_TAODAN_AMANECER, W, 170, 3).r;
  degrade(p, 0, H, ['#cfe6d2', '#c2dcc6', '#b4d0b8']);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x * 13 + y * 7) % 53 === 0) p.px(x, y, '#aac6ae');
  p.rect(0, 0, W, 12, '#e8e4d8'); p.rect(0, 12, W, 2, '#a8a498');
  // la ventana con la ciudad afuera
  const [vx, vy, vw, vh] = [250, 34, 300, 150];
  for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) {
    const sx = Math.floor((x / vw) * ventana.w * 0.62) + Math.floor(ventana.w * 0.2), sy = Math.floor(ventana.h - vh + y);
    if (sy < 0) { p.px(vx + x, vy + y, '#f4d2a8'); continue; }
    const i = (sy * ventana.w + sx) * 4;
    if (ventana.data[i + 3]) p.r.data.set(ventana.data.subarray(i, i + 4), ((vy + y) * W + vx + x) * 4); else p.px(vx + x, vy + y, '#f4d2a8');
  }
  // la reja de hierro con flores, el marco y las cortinas
  for (let y = vy; y < vy + vh; y++) for (let x = vx; x < vx + vw; x++) {
    const gx = (x - vx) % 50, gy = (y - vy) % 50, flor = ((Math.floor((x - vx) / 50) + Math.floor((y - vy) / 50)) % 2 === 0);
    if (gx === 0 || gy === 0 || (flor && Math.abs(Math.hypot(gx - 25, gy - 25) - 6) < 0.6) || (flor && (Math.abs(gx - 25) + Math.abs(gy - 25) === 14))) p.px(x, y, '#f0ece2');
  }
  caja(p, vx - 6, vy - 6, vw + 12, 6, '#f0ece2'); caja(p, vx - 6, vy + vh, vw + 12, 8, '#f0ece2'); caja(p, vx - 6, vy, 6, vh, '#f0ece2'); caja(p, vx + vw, vy, 6, vh, '#f0ece2');
  for (const [cx0, dir] of [[vx - 30, 1], [vx + vw + 4, -1]] as const) for (let y = vy - 10; y < vy + vh + 30; y++) for (let x = 0; x < 28; x++) {
    const pl = Math.sin((x + y * 0.02) * 0.6) > 0.3;
    p.px(cx0 + x, y, x === 0 || x === 27 ? '#a8486a' : pl ? '#d87a98' : '#e898b0');
    void dir;
  }
  // el calendario de hojas rojo con su día grande
  caja(p, 90, 60, 60, 80, '#f8f4ec', '#8a2a2a'); p.rect(91, 61, 58, 18, '#d8282a'); p.rect(104, 92, 32, 30, '#d8282a'); p.rect(110, 98, 20, 18, '#f8f4ec');
  // la repisa con las latas de café y la foto de la familia
  p.rect(620, 120, 120, 6, '#8a5a34');
  for (let k = 0; k < 3; k++) caja(p, 630 + k * 22, 98, 16, 22, ['#c8a028', '#2a6a3a', '#b8282a'][k], '#3a2a1a');
  caja(p, 700, 86, 30, 34, '#3a2a1a', '#3a2a1a'); p.rect(703, 89, 24, 28, '#f2c230'); p.rect(703, 98, 24, 10, '#2a5ad0'); p.rect(703, 108, 24, 9, '#d8282a');
  // la mata en su matero
  caja(p, 40, 214, 40, 40, '#b8603a', '#6a3a24');
  for (let h = 0; h < 9; h++) { const a = -Math.PI / 2 + (h - 4) * 0.3; for (let s = 0; s < 46; s++) p.px(Math.round(60 + Math.cos(a) * s), Math.round(214 + Math.sin(a) * s + (s * s) / 90), s % 6 < 4 ? '#3a8a3a' : '#2a6a2a'); }
  // el zócalo de baldosas abajo, detrás de la mesa
  for (let y = 250; y < H; y++) for (let x = 0; x < W; x++) p.px(x, y, (x % 20 === 0 || y % 20 === 10) ? '#9ab0a0' : (Math.floor(x / 20) + Math.floor((y - 10) / 20)) % 2 ? '#e8e0cc' : '#d8ceb8');
  return {
    name: 'intro_desayuno', frames: [p.r], w: W, h: H,
    extra: { margen: INTRO.margen, huecos: DESAYUNO.huecos, mesa: DESAYUNO.mesa, texto: DESAYUNO.texto, nota: 'El fondo del desayuno. Orden: este fondo, los 4 retratos de 96 en `huecos` (sentados: la mesa les tapa los hombros) y encima intro_desayuno_mesa.' },
  };
}

// ---------------------------------------------------------------- la presentación de un equipo

/**
 * La capa de la presentación, transparente salvo la franja: una franja oscura con borde de oro y rayas de velocidad
 * y, en cada hueco, un marco dorado con el fondo claro y rayos de manga desde el centro. Así la silueta (el retrato
 * teñido de oscuro) se lee, y el retrato de color queda enmarcado en vez de flotar sobre la escena. Debajo de cada
 * hueco, una placa para el nombre. Sirve igual en Bogotá y en Maracaibo: los huecos son los mismos.
 */
export function presentacion(): UiPiece {
  const p = new Pix(W, H);
  const [fx, fy, fw, fh] = PRESENTA.franja, M = PRESENTA.marco;
  const ORO = ['#fff6c2', '#ffd84a', '#e0a020', '#9a6410'];
  // la franja
  for (let y = fy; y < fy + fh; y++) for (let x = fx; x < fx + fw; x++) {
    const d = Math.min(x - fx, y - fy, fx + fw - 1 - x, fy + fh - 1 - y);
    const raya = (x - y * 2 + 2000) % 22 < 3;
    p.px(x, y, d === 0 ? INK : d === 1 ? ORO[1] : d === 2 ? ORO[3] : raya ? '#232050' : '#181638');
  }
  for (const [hx, hy, hw, hh] of PRESENTA.huecos) {
    const cx = hx + hw / 2, cy = hy + hh / 2;
    // el marco
    for (let y = hy - M; y < hy + hh + M; y++) for (let x = hx - M; x < hx + hw + M; x++) {
      const d = Math.min(x - (hx - M), y - (hy - M), hx + hw + M - 1 - x, hy + hh + M - 1 - y);
      if (d >= M) continue;
      p.px(x, y, d === 0 ? INK : d === M - 1 ? INK : ORO[Math.min(3, d - 1 + (x + y > hx + hy + hw ? 1 : 0))]);
    }
    // el fondo claro con rayos desde el centro, para que la silueta oscura se lea
    for (let y = hy; y < hy + hh; y++) for (let x = hx; x < hx + hw; x++) {
      const a = Math.atan2(y - cy, x - cx), r = Math.hypot(x - cx, y - cy);
      const rayo = Math.sin(a * 12) > 0.35;
      p.px(x, y, r < 18 ? '#fffbe8' : rayo ? (bayer(x, y) < 0.5 ? '#ffe9a8' : '#fff2c8') : '#ffd98a');
    }
  }
  // las placas del nombre: a 112 se tocan con la vecina (los huecos van cada 108), así que forman una sola barra
  // y cada placa se marca con una muesca arriba y abajo en el medio de cada separación, sin tocar la fila del texto
  const h0 = PRESENTA.huecos[0], hN = PRESENTA.huecos[PRESENTA.huecos.length - 1], ny = PRESENTA.nombres;
  const bx0 = h0[0] + h0[2] / 2 - PRESENTA.placa / 2, bx1 = hN[0] + hN[2] / 2 + PRESENTA.placa / 2;
  const cortes = PRESENTA.huecos.slice(1).map(([hx], i) => (PRESENTA.huecos[i][0] + PRESENTA.huecos[i][2] + hx) / 2);
  for (let y = ny - 9; y < ny + 9; y++) for (let x = bx0; x < bx1; x++) {
    const d = Math.min(x - bx0, y - (ny - 9), bx1 - 1 - x, ny + 8 - y);
    const muesca = (y <= ny - 7 || y >= ny + 6) && cortes.some((c) => x === c - 1 || x === c);
    p.px(x, y, d === 0 ? INK : d === 1 || muesca ? ORO[2] : '#0b0a1c');
  }
  return {
    name: 'intro_presentacion', frames: [p.r], w: W, h: H,
    extra: { huecos: PRESENTA.huecos, marco: PRESENTA.marco, franja: PRESENTA.franja, nombres: PRESENTA.nombres, placa: PRESENTA.placa, nota: 'Va entre intro_bogota o intro_maracaibo y los retratos. Los retratos de 96 en `huecos` (en silueta con setTintFill y después de color), el nombre de cada uno centrado en x hueco + 48 y en y `nombres`. Cada placa mide `placa` de ancho: a 1,5 caben 108 px de texto.' },
  };
}

/** Todas las piezas de la intro. El atleta de espaldas sale si se pasa su ficha. */
export function piezasIntro(espaldasDe?: HumanFicha): UiPiece[] {
  return [azotea(), ...(espaldasDe ? [espaldas(espaldasDe)] : []), bogota(), lluvia(), maracaibo(), presentacion(), desayuno(), desayunoMesa()];
}
