import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import { nueva, type Pieza } from './calle';
import { drawText, textWidth } from './letras';
import { MAS_CLARO, MAS_OSCURO, corre } from './inclinada';
import type { CtxCerca, PintorCerca } from './fachadas';
import { depthOf, type ObliqueLayout } from './layout';
import type { Luz, Particula, VidaEscena } from './escena';

/**
 * Hội An de noche en el estilo `vietnam_hoian`: el río Thu Bồn con el puente japonés (Chùa Cầu) encendido al fondo
 * (lejos), las casas amarillas de la ciudad vieja con sus tejas de barro, la madera oscura, un farol en cada puerta, la
 * buganvilla y los puestos de faroles (cerca), la calle de piedra con el muelle de madera y el río de adelante con las
 * velitas en flores de papel. Los dos postes de bambú del Tama-wari, las cuerdas de faroles de seda sobre la calle y
 * los postes de faroles. La luz es la de los faroles: tibia, de abajo y de los lados.
 */

/** Los fondos y temas de la capa cerca que son de Hội An. */
export const CERCA_HOIAN = 'casas_amarillas_hoian';
export const TEMAS_HOIAN = [CERCA_HOIAN, 'casas_amarillas_faroles'];
export const esHoian = (L: ObliqueLayout) => L.paralaje?.cerca === CERCA_HOIAN || L.ranuras_deco.some((r) => TEMAS_HOIAN.includes(r.tema));

/** Las pruebas que se juegan en el sitio: ahí `salida` y `meta` son el lado de cada equipo, no una carrera. */
export const PRUEBAS_EN_SITIO = new Set(['tamawari']);

// ---------------------------------------------------------------------------------------------------------------------
// Los faroles de seda

const NUCLEO: Partial<Record<Color, Color>> = { rojo: 'oro', oro: 'luz', amarillo: 'luz', canal: 'salmon', menta: 'luz', celeste: 'luz', salmon: 'crema' };
/** Los colores de los faroles, con el rojo y el dorado más seguido (como en la calle de verdad). */
export const COLORES_FAROL: Color[] = ['rojo', 'oro', 'rojo', 'canal', 'amarillo', 'menta', 'rojo', 'celeste', 'oro', 'salmon'];

/**
 * Un farol de seda colgado de (x, y): el cordón, la tapa dorada, el cuerpo ovalado del color con el corazón encendido,
 * la otra tapa y la borla. `dx` corre el cuerpo (el farol que se mece) sin mover el punto de donde cuelga.
 */
export function farol(C: Lienzo, x: number, y: number, w: number, h: number, c: Color, cordon = 3, dx = 0) {
  for (let j = 0; j < cordon; j++) C.p(x + Math.round((dx * j) / Math.max(1, cordon)), y + j, 'sombra');
  const cx = x + dx, top = y + cordon, rx = w / 2;
  C.hl(cx - Math.floor(rx) + 1, top, w - 2, 'oro');
  for (let j = 1; j < h - 1; j++) {
    const t = (j - (h - 1) / 2) / ((h - 1) / 2), ancho = Math.max(1, Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t * 0.8))));
    for (let i = -ancho; i < ancho; i++) {
      const borde = i === -ancho ? MAS_CLARO[c] : i === ancho - 1 ? MAS_OSCURO[c] : c;
      // el corazón encendido: la vela adentro se ve por la seda
      const nucleo = Math.abs(i + 0.5) < ancho * 0.45 && Math.abs(t) < 0.45;
      C.p(cx + i, top + j, nucleo ? NUCLEO[c] ?? 'luz' : borde);
    }
  }
  C.hl(cx - Math.floor(rx) + 1, top + h - 1, w - 2, 'oro');
  C.p(cx, top + h, c === 'rojo' ? 'oro' : 'rojo'); C.p(cx, top + h + 1, c === 'rojo' ? 'oro' : 'rojo');
}

// ---------------------------------------------------------------------------------------------------------------------
// Lo lejos: el río Thu Bồn y el puente japonés

/** Fila del agua en la capa lejos: el puente y la orilla de enfrente se paran ahí. */
export const AGUA_LEJOS = 158;
/** El puente japonés en la capa lejos. Con la capa en la fila franja.atras - 200, su techo cae en la fila 136 o más abajo. */
export const PUENTE = { x: 8, w: 136, techo: AGUA_LEJOS - 58 };

/** Chùa Cầu: la base de piedra con sus arcos, la galería de madera encendida, los dos techos de tejas y el templito. */
function puenteJapones(L: Lienzo, x: number, w: number) {
  const a = AGUA_LEJOS, cx = x + Math.floor(w / 2);
  // el resplandor tibio alrededor, primero (lo demás va encima)
  for (let j = a - 70; j < a - 4; j++) for (let i = x - 16; i < x + w + 16; i++) {
    const d = Math.hypot((i - cx) / (w * 0.68), (j - (a - 30)) / 34);
    if (d < 1 && bayer(i, j) < (1 - d) * 0.5) L.p(i, j, d < 0.55 ? 'bruma' : 'cielo');
  }
  // la base de piedra con tres arcos sobre el agua
  for (let j = a - 14; j < a + 1; j++) for (let i = x + 6; i < x + w - 6; i++) {
    const r = j - (a - 14), fila = r >> 2;
    L.p(i, j, r === 0 ? 'cemento_claro' : r % 4 === 0 || (i + fila * 5) % 11 === 0 ? 'asfalto' : grain(i >> 1, j, 3) < 0.15 ? 'cemento' : 'asfalto_claro');
  }
  for (const [ax, rx] of [[x + 26, 10], [cx, 14], [x + w - 26, 10]] as const) for (let j = 0; j < 11; j++) for (let i = -rx; i <= rx; i++) {
    if ((i / rx) ** 2 + ((11 - j) / 11) ** 2 >= 1) continue;
    L.p(ax + i, a - 10 + j, (i / rx) ** 2 + ((11 - j) / 11) ** 2 > 0.75 ? 'asfalto' : j > 7 && bayer(ax + i, j) < 0.4 ? 'oro' : 'azul_noche');
  }
  // la galería de madera, abierta y encendida, con su baranda y un farol rojo en cada vano
  for (let j = a - 34; j < a - 14; j++) for (let i = x + 4; i < x + w - 4; i++) {
    const k = (i - x - 4) % 10, poste = k < 2;
    L.p(i, j, poste ? (k === 0 ? 'terracota' : 'vino') : j < a - 28 ? 'oro' : j < a - 20 ? (bayer(i, j) < 0.5 ? 'oro' : 'amarillo') : bayer(i, j) < 0.5 ? 'ocre' : 'oro');
  }
  L.hl(x + 4, a - 20, w - 8, 'terracota'); L.hl(x + 4, a - 19, w - 8, 'vino'); L.hl(x + 4, a - 15, w - 8, 'vino');
  for (let i = x + 5; i < x + w - 5; i += 3) L.vl(i, a - 18, 3, 'vino');
  for (let i = x + 9; i < x + w - 6; i += 10) { L.f(i, a - 33, 2, 4, 'rojo'); L.p(i, a - 32, 'oro'); L.p(i, a - 29, 'oro'); }
  // un techo de tejas oscuras con su alero y las puntas curvas para arriba
  const techo = (x0: number, x1: number, y0: number, alto: number, vuelo: number) => {
    for (let j = 0; j < alto; j++) {
      const m = Math.round(((alto - 1 - j) / Math.max(1, alto - 1)) * vuelo * 0.8);
      for (let i = x0 - vuelo + m; i < x1 + vuelo - m; i++) L.p(i, y0 + j, j === alto - 1 ? 'tinta' : j === 0 ? 'terracota' : j === alto - 2 ? 'asfalto' : (i % 3 === 0 ? 'asfalto' : 'sombra'));
    }
    L.hl(x0 - vuelo + Math.round(vuelo * 0.8) + 1, y0 - 1, x1 - x0 + 2 * vuelo - 2 * Math.round(vuelo * 0.8) - 2, 'oro');
    for (const [sx, d] of [[x0 - vuelo - 1, -1], [x1 + vuelo, 1]] as const) { L.p(sx, y0 + alto - 2, 'sombra'); L.p(sx + d, y0 + alto - 3, 'sombra'); L.p(sx + d, y0 + alto - 4, 'terracota'); L.p(sx + 2 * d, y0 + alto - 5, 'terracota'); }
  };
  techo(x + 4, x + w - 4, a - 43, 9, 6);
  techo(x + 18, x + w - 18, a - 51, 8, 4);
  // el templito del medio, más alto: su pared roja, la puerta encendida y la placa dorada
  L.f(cx - 14, a - 58, 28, 8, 'vino'); L.vl(cx - 14, a - 58, 8, 'terracota'); L.f(cx - 4, a - 57, 8, 7, 'oro'); L.f(cx - 2, a - 56, 4, 5, 'luz');
  techo(cx - 15, cx + 15, a - 66, 8, 5);
  L.f(cx - 3, a - 68, 7, 2, 'oro');
  for (const fx of [cx - 11, cx + 10]) { L.vl(fx, a - 50, 2, 'sombra'); L.f(fx - 1, a - 48, 3, 4, 'rojo'); L.p(fx, a - 47, 'oro'); }
}

/** La luna llena de la noche de los faroles (el 14 de cada mes lunar), en la capa lejos: x, y del centro. */
export const LUNA = { x: 96, y: 26 };

/** La luna llena con sus mares y el halo tramado. */
function luna(L: Lienzo, cx: number, cy: number) {
  for (let j = -16; j <= 16; j++) for (let i = -16; i <= 16; i++) {
    const d = Math.hypot(i, j);
    if (d > 7 && d < 16 && bayer(cx + i, cy + j) < (1 - (d - 7) / 9) * 0.45) L.p(cx + i, cy + j, d < 11 ? 'bruma' : 'cielo');
  }
  L.d(cx, cy, 6.5, 'crema'); L.d(cx - 1, cy - 1, 5, 'luz');
  for (const [i, j] of [[2, -2], [3, -1], [-2, 2], [-1, 3], [1, 1], [3, 2]]) L.p(cx + i, cy + j, 'crema');
}

/** Una palma de lejos: el tronco curvo y la corona de hojas. Da la vuelta por el borde de la capa. */
function palma(L: Lienzo, x: number, base: number, alto: number, seed: number) {
  const R = rng(seed), X = (v: number) => ((v % L.w) + L.w) % L.w;
  const curva = (j: number) => Math.round(Math.sin((j / alto) * 1.4) * 3);
  for (let j = 0; j < alto; j++) L.p(X(x + curva(j)), base - j, 'sombra');
  const tx = x + curva(alto), ty = base - alto;
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.55 + (R() - 0.5) * 0.2, largo = 7 + Math.floor(R() * 4);
    for (let i = 1; i <= largo; i++) {
      const px = Math.round(tx + Math.cos(a) * i * 1.2), py = Math.round(ty + Math.sin(a) * i * 0.6 + (i * i) / 14);
      L.p(X(px), py, i < 3 ? 'verde_oscuro' : bayer(px, py) < 0.25 ? 'verde' : 'verde_oscuro');
    }
  }
}

/** Los colores encendidos que el agua refleja. */
const ENCENDIDO = new Set<Color>(['oro', 'amarillo', 'luz', 'rojo', 'crema']);

/**
 * El agua de noche con los reflejos: base azul que se oscurece hacia adelante, rayas verticales cortadas de la luz que
 * tiene encima (`luzArriba` dice de qué color, o nada) y rizos de cielo. `y0` es la primera fila del agua.
 */
function aguaNoche(L: Lienzo, x0: number, x1: number, y0: number, y1: number, seed: number, luzArriba: (x: number, y: number) => Color | undefined) {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0);
    for (let x = x0; x < x1; x++) {
      let c: Color = bayer(x, y) < 0.12 + t * 0.45 ? 'azul_noche' : 'azul';
      const luz = luzArriba(x, y);
      // la raya del reflejo: tiembla en bandas de 3 filas y se apaga hacia adelante
      if (luz && (y + (x >> 1)) % 3 !== 0 && grain(x >> 1, y, seed) > 0.15 + t * 0.55) c = luz === 'rojo' ? 'rojo' : t < 0.45 ? (luz === 'luz' ? 'amarillo' : 'oro') : 'ocre';
      else if ((x + y * 7) % 23 < 5 && grain(x >> 3, y, seed + 6) < 0.18) c = 'cielo';
      L.p(x, y, c);
    }
  }
}

/**
 * El río Thu Bồn de noche (capa lejos): la orilla de enfrente con la ciudad vieja encendida, palmas, el puente japonés
 * y el agua con los reflejos de los faroles y velitas sueltas. Lo de arriba queda transparente (el cielo). Todo da la
 * vuelta por el borde: la capa se repite sin costura.
 */
export function rioThuBon(pal: Paleta, w: number, h: number, seed: number): Lienzo {
  const L = new Lienzo(w, h, pal), a = AGUA_LEJOS, R = rng(seed + 3), X = (v: number) => ((v % w) + w) % w;
  // palmas detrás de las casas, unas pocas
  for (let x = 180; x < w + 100; x += 70 + Math.floor(R() * 90)) palma(L, x, a - 20, 22 + Math.floor(R() * 12), seed + x);
  // la orilla de enfrente: casas bajas de dos pisos. Arrancan corridas, así una casa cruza el borde y la vuelta no se nota
  const ofs = 11;
  for (let x = -ofs; x < w - ofs;) {
    let cw = 16 + Math.floor(R() * 20);
    if (w - ofs - (x + cw) < 16) cw = w - ofs - x;
    const alto = 18 + Math.floor(R() * 12), top = a - 2 - alto, amarilla = R() < 0.75;
    for (let j = top; j < a - 2; j++) for (let i = 0; i < cw; i++) L.p(X(x + i), j, i === 0 ? 'asfalto' : amarilla ? (bayer(x + i, j) < 0.2 ? 'ocre' : grain(x + i, j, seed) < 0.5 ? 'ocre' : 'terracota') : 'asfalto_claro');
    for (let j = 0; j < 4; j++) for (let i = -1 + j; i < cw + 1 - j; i++) L.p(X(x + i), top - 1 - j, j === 3 ? 'terracota' : 'vino');
    for (let i = 3; i < cw - 3; i += 5) {
      if (R() < 0.6) { L.p(X(x + i), top + 4, 'oro'); L.p(X(x + i + 1), top + 4, 'oro'); L.p(X(x + i), top + 5, 'amarillo'); }
      if (R() < 0.7) for (let j = 0; j < 5; j++) { L.p(X(x + i), a - 8 + j, j < 2 ? 'amarillo' : 'oro'); L.p(X(x + i + 1), a - 8 + j, 'oro'); }
      if (R() < 0.5) { L.p(X(x + i + 1), top + 1, 'rojo'); L.p(X(x + i + 1), top + 2, R() < 0.5 ? 'oro' : 'rojo'); }
    }
    x += cw;
  }
  // el malecón de enfrente con sus faroles
  for (let x = 0; x < w; x++) { L.p(x, a - 2, 'asfalto_claro'); L.p(x, a - 1, 'asfalto'); if (x % 32 === 7) { L.p(x, a - 3, 'oro'); L.p(x, a - 4, 'luz'); } }
  puenteJapones(L, PUENTE.x, PUENTE.w);
  luna(L, LUNA.x, LUNA.y);
  // el agua con el espejo de lo encendido: la fila de la orilla que cae en cada fila del agua, temblando
  const orilla = new Lienzo(w, a, pal);
  orilla.r.data.set(L.r.data.subarray(0, w * a * 4));
  aguaNoche(L, 0, w, a, h, seed + 5, (x, y) => {
    const sy = a - 2 - Math.round((y - a) * 1.3), sx = X(x + Math.round(Math.sin(y * 1.3 + x * 0.05) * 1.2));
    const c = sy >= 0 ? nombre(orilla, sx, sy) : undefined;
    return c && ENCENDIDO.has(c) ? c : undefined;
  });
  // el camino de la luna en el agua
  for (let y = a + 2; y < h; y++) for (let i = -3; i <= 3; i++) if ((y + i) % 3 !== 0 && grain(LUNA.x + i, y, seed + 8) < 0.55 - Math.abs(i) * 0.12) L.p(LUNA.x + i + Math.round(Math.sin(y * 1.1) * 1.5), y, Math.abs(i) < 2 ? 'crema' : 'cielo');
  // velitas sueltas en el agua
  for (let k = 0; k < w / 18; k++) {
    const x = Math.floor(R() * w), y = a + 6 + Math.floor(R() * (h - a - 8));
    L.p(x, y, 'oro'); L.p(x, y - 1, 'luz'); L.p(X(x - 1), y, 'salmon'); L.p(X(x + 1), y, 'salmon'); if (y + 2 < h) L.p(x, y + 2, 'ocre');
  }
  return L;
}

/** El nombre de paleta de un pixel de un lienzo (o undefined). */
function nombre(L: Lienzo, x: number, y: number): Color | undefined {
  const i = (y * L.w + x) * 4, d = L.r.data;
  if (x < 0 || y < 0 || x >= L.w || y >= L.h || !d[i + 3]) return undefined;
  const hx = '#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
  return (Object.keys(L.pal) as Color[]).find((k) => L.pal[k].toLowerCase() === hx);
}

// ---------------------------------------------------------------------------------------------------------------------
// Lo cerca: el río por la izquierda y las casas amarillas

/** El río que se ve por la izquierda, antes de las casas: hasta dónde llega y las filas del agua y del malecón. */
export const RIO = { x1: 166, agua: 216, malecon: 232 };
/** Filas de las casas: el techo de la planta baja (el alero de tejas) y el alero grande de arriba. */
const PB = 188, ALERO = 176, ARRIBA = 128;

/** Lo que hay en cada vano de la planta baja: tienda de faroles, sastrería, comedor de cao lầu o puertas cerradas. */
type Vano = 'faroles' | 'sastre' | 'comedor' | 'cerrado';
interface Casa { x: number; w: number; techo: number; balcon: boolean; madera?: boolean; letrero?: string; enLetrero?: 'pared' | 'balcon'; vanos: Vano[] }
/** Las cuatro casas de la ciudad vieja, de izquierda a derecha. La última sigue hasta el borde del ancho pintado. */
export const CASAS: Casa[] = [
  { x: 166, w: 122, techo: 102, balcon: true, letrero: 'MAY ĐO', enLetrero: 'balcon', vanos: ['sastre', 'cerrado', 'sastre'] },
  { x: 288, w: 104, techo: 108, balcon: false, madera: true, letrero: 'ĐÈN LỒNG', enLetrero: 'pared', vanos: ['faroles', 'faroles', 'faroles'] },
  { x: 392, w: 132, techo: 96, balcon: true, letrero: 'CAO LẦU', enLetrero: 'balcon', vanos: ['comedor', 'faroles', 'comedor', 'cerrado'] },
  { x: 524, w: 150, techo: 101, balcon: false, vanos: ['faroles', 'sastre', 'cerrado', 'comedor'] },
];
/** Los dos puestos de faroles: el de la vendedora (x 320 del layout) y el del final. */
export const PUESTOS = [{ x0: 292, x1: 374 }, { x0: 604, x1: 674 }];
/** Dónde está la gente en los balcones: x, ancho y fila de la baranda. */
export const BALCONES = CASAS.filter((c) => c.balcon).map((c) => ({ x: c.x + 10, w: c.w - 20, baranda: ALERO - 16 }));
/** El bote amarrado en el río de la izquierda: x de la proa y la fila del agua. */
export const BOTE = { x: 56, y: RIO.agua + 11, w: 50 };

/** Los faroles que alumbran las paredes: los de las puertas y los racimos debajo del alero grande. */
function lucesPared() {
  const out: { x: number; y: number; r: number }[] = [];
  for (const c of CASAS) {
    for (const bx of bahias(c)) out.push({ x: bx, y: PB + 8, r: 26 });
    out.push({ x: c.x + Math.floor(c.w / 2), y: ARRIBA + 10, r: 34 });
  }
  for (const p of PUESTOS) out.push({ x: Math.floor((p.x0 + p.x1) / 2), y: PB + 14, r: 44 });
  return out;
}
let LUCES_PARED: { x: number; y: number; r: number }[] | undefined;
/** Cuánta luz de farol le cae a un punto de pared (0 a 1). */
function luzEn(x: number, y: number) {
  LUCES_PARED ??= lucesPared();
  let t = 0;
  for (const l of LUCES_PARED) t = Math.max(t, 1 - Math.hypot((x - l.x) / 1.3, y - l.y) / l.r);
  return t;
}

/** El centro de cada vano de la planta baja de una casa. */
function bahias(c: Casa) {
  const n = Math.max(2, Math.round((c.w - 8) / 36)), bw = (c.w - 8) / n;
  return Array.from({ length: n }, (_, i) => Math.round(c.x + 4 + bw * (i + 0.5)));
}

/** La pared amarilla gastada: más clara donde le da un farol, con manchas de humedad y el pie más oscuro. */
function pared(C: Lienzo, x0: number, y0: number, w: number, h: number, seed: number) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const t = luzEn(x, y), b = bayer(x, y);
    let c: Color = t > 0.6 ? 'crema' : t > 0.42 ? (b < 0.5 ? 'crema' : 'amarillo') : 'amarillo';
    // manchas de humedad y moho, en manchones grandes, y la sombra de arriba (el alero)
    const mancha = grain(x >> 3, y >> 2, seed) < 0.22 && grain(x, y, seed + 1) < 0.55;
    if (t < 0.4 && mancha) c = 'ocre';
    if (y - y0 < 3) c = y - y0 === 0 ? 'terracota' : 'ocre';
    if (t < 0.12 && b < 0.5) c = 'ocre';
    C.p(x, y, c);
  }
  C.drips(x0, y0 + 3, w, 6, 'ocre', seed + 9, 0.12);
}

/** Tejas de barro vistas de frente: canales y lomos, con las hileras y unas manchas de musgo. */
function tejas(C: Lienzo, x0: number, x1: number, y0: number, y1: number, seed: number, angosta = 0) {
  for (let y = y0; y < y1; y++) {
    const m = Math.round(((y1 - y) / (y1 - y0)) * angosta);
    for (let x = x0 + m; x < x1 - m; x++) {
      const k = (x - x0) % 4;
      let c: Color = k === 0 ? 'vino' : k === 3 ? 'asfalto' : (y - y0) % 5 === 0 ? 'vino' : 'terracota';
      if (k === 1 && grain(x >> 2, y >> 2, seed) < 0.15) c = 'ocre';
      if (grain(x >> 2, y >> 1, seed + 3) < 0.02) c = 'verde_oscuro';
      C.p(x, y, c);
    }
  }
}

/** El alero de tejas entre la planta baja y el piso de arriba, con las tejas de punta y la sombra de abajo. */
function alero(C: Lienzo, x0: number, x1: number, seed: number) {
  tejas(C, x0 - 3, x1 + 3, ALERO, ALERO + 8, seed);
  C.hl(x0 - 3, ALERO, x1 - x0 + 6, 'asfalto');
  for (let x = x0 - 3; x < x1 + 3; x++) { C.p(x, ALERO + 8, (x >> 1) % 2 ? 'ocre' : 'terracota'); C.p(x, ALERO + 9, 'sombra'); C.p(x, ALERO + 10, bayer(x, 0) < 0.5 ? 'sombra' : 'asfalto'); }
}

/** El alero grande y el techo de tejas de la casa, con el caballete y las puntas curvas. */
function techoCasa(C: Lienzo, c: Casa, seed: number) {
  const x0 = c.x - 4, x1 = c.x + c.w + 4;
  tejas(C, x0, x1, c.techo, ARRIBA - 2, seed, 5);
  for (let x = x0; x < x1; x++) { C.p(x, ARRIBA - 2, (x >> 1) % 2 ? 'ocre' : 'terracota'); C.p(x, ARRIBA - 1, 'sombra'); C.p(x, ARRIBA, 'sombra'); C.p(x, ARRIBA + 1, bayer(x, 1) < 0.5 ? 'sombra' : 'ocre'); }
  // el caballete con las puntas que suben
  const y = c.techo - 3;
  C.f(x0 + 5, y, x1 - x0 - 10, 3, 'asfalto'); C.hl(x0 + 5, y, x1 - x0 - 10, 'terracota');
  for (const [sx, d] of [[x0 + 4, -1], [x1 - 5, 1]] as const) { C.p(sx, y + 1, 'asfalto'); C.p(sx + d, y, 'asfalto'); C.p(sx + d, y - 1, 'terracota'); C.p(sx + 2 * d, y - 2, 'terracota'); }
}

/** Una ventana del piso de arriba: marco de madera, las dos hojas abiertas y la luz de adentro con la celosía. */
function ventana(C: Lienzo, x: number, y: number, w: number, h: number, encendida: boolean) {
  C.f(x - 4, y, 4, h, 'asfalto'); C.f(x + w, y, 4, h, 'asfalto');
  for (let j = y + 1; j < y + h; j += 2) { C.hl(x - 4, j, 4, 'asfalto_claro'); C.hl(x + w, j, 4, 'sombra'); }
  C.box(x, y, w, h, encendida ? 'oro' : 'sombra', 'sombra');
  if (encendida) {
    for (let j = y + 1; j < y + h - 1; j++) for (let i = x + 1; i < x + w - 1; i++) if (bayer(i, j) < 0.3) C.p(i, j, 'amarillo');
    C.vl(x + Math.floor(w / 2), y + 1, h - 2, 'asfalto'); C.hl(x + 1, y + Math.floor(h / 2), w - 2, 'asfalto');
    for (let i = x + 2; i < x + w - 2; i += 3) C.p(i, y + 2, 'asfalto');
  }
}

/** Un vano de la planta baja: abierto con la tienda encendida (faroles, telas o el comedor) o cerrado con las puertas. */
function vano(C: Lienzo, x: number, w: number, que: Vano, seed: number) {
  const tipo = ({ faroles: 0, sastre: 1, comedor: 2, cerrado: 3 } as const)[que];
  const top = PB + 2, base = 246;
  // la celosía de arriba, con la luz de adentro
  for (let j = top; j < top + 6; j++) for (let i = x; i < x + w; i++) C.p(i, j, (i + j) % 3 === 0 || j === top ? 'asfalto' : tipo === 3 ? 'sombra' : 'oro');
  if (tipo === 3) {
    // cerrado: puertas plegables de madera, con la rendija de luz
    for (let j = top + 6; j < base - 2; j++) for (let i = x; i < x + w; i++) C.p(i, j, (i - x) % 4 === 0 ? 'vino' : (i - x) % 4 === 1 ? 'ocre' : 'terracota');
    C.vl(x + Math.floor(w / 2), top + 6, base - top - 8, 'oro');
    for (let j = top + 12; j < base - 4; j += 10) C.hl(x + 1, j, w - 2, 'vino');
    return;
  }
  // abierto: la luz tibia de adentro, más fuerte en el medio
  for (let j = top + 6; j < base - 2; j++) for (let i = x; i < x + w; i++) {
    const t = 1 - Math.abs(i - x - w / 2) / (w / 2);
    C.p(i, j, j > base - 6 ? 'ocre' : bayer(i, j) < t * 0.8 ? 'amarillo' : 'oro');
  }
  const R = rng(seed);
  if (tipo === 0) {
    // tienda de faroles: chiquitos colgados del techo y unos en el piso
    for (let i = x + 4; i < x + w - 3; i += 6) farol(C, i, top + 6, 5, 6, COLORES_FAROL[Math.floor(R() * COLORES_FAROL.length)], 1 + Math.floor(R() * 4));
    for (let i = x + 3; i < x + w - 3; i += 5) { const c = COLORES_FAROL[Math.floor(R() * COLORES_FAROL.length)]; C.f(i, base - 9, 4, 4, c); C.p(i + 1, base - 8, NUCLEO[c] ?? 'luz'); }
  } else if (tipo === 1) {
    // sastrería: rollos de tela en el estante y un áo dài en su maniquí
    for (let j = top + 10; j < base - 12; j += 7) { C.hl(x + 2, j + 5, w - 4, 'terracota'); for (let i = x + 3; i < x + w - 4; i += 3) C.f(i, j, 2, 5, (['rojo', 'celeste', 'menta', 'salmon', 'luz', 'canal'] as Color[])[Math.floor(R() * 6)]); }
    const mx = x + w - 8; C.f(mx, base - 26, 5, 18, 'rojo'); C.vl(mx + 4, base - 26, 18, 'vino'); C.f(mx + 1, base - 29, 3, 3, 'asfalto'); C.vl(mx + 2, base - 8, 6, 'sombra');
  } else {
    // comedor de cao lầu: mesitas bajas, banquitos y la olla con vapor
    for (let i = x + 3; i < x + w - 8; i += 12) { C.f(i, base - 12, 9, 2, 'terracota'); C.vl(i + 1, base - 10, 6, 'sombra'); C.vl(i + 7, base - 10, 6, 'sombra'); C.f(i + 2, base - 14, 2, 2, 'luz'); }
    C.f(x + w - 9, base - 16, 7, 10, 'asfalto'); C.hl(x + w - 9, base - 16, 7, 'asfalto_claro'); for (let j = 1; j < 6; j++) if (j % 2) C.p(x + w - 6 + (j % 3) - 1, base - 16 - j, 'crema');
  }
}

/** Una casa de la ciudad vieja completa: planta baja de madera con sus vanos, alero, piso de arriba amarillo y techo. */
function casa(C: Lienzo, c: Casa, seed: number, conPublico: boolean, f = 0) {
  const R = rng(seed);
  techoCasa(C, c, seed + 1);
  // el piso de arriba: pared amarilla o, en la casa de madera, tablas oscuras
  if (c.madera) {
    for (let y = ARRIBA + 2; y < ALERO; y++) for (let x = c.x; x < c.x + c.w; x++) C.p(x, y, (x - c.x) % 5 === 0 ? 'sombra' : luzEn(x, y) > 0.5 && bayer(x, y) < 0.5 ? 'terracota' : 'asfalto');
  } else pared(C, c.x, ARRIBA + 2, c.w, ALERO - ARRIBA - 2, seed + 2);
  // ventanas
  const nv = c.w > 125 ? 3 : 2;
  for (let i = 0; i < nv; i++) {
    const vw = 16, vx = Math.round(c.x + ((i + 0.5) * c.w) / nv - vw / 2);
    if (c.letrero && c.enLetrero === 'pared' && i === Math.floor(nv / 2) && nv === 3) continue;
    ventana(C, vx, ARRIBA + 8, vw, 24, R() < 0.75);
  }
  // el letrero de la casa en la pared: tabla oscura con letras doradas
  if (c.letrero && c.enLetrero === 'pared') {
    const tw = textWidth(c.letrero), bx = Math.round(c.x + c.w / 2 - tw / 2) - 4, by = nv === 3 ? ARRIBA + 12 : ARRIBA + 8;
    C.box(bx, by, tw + 8, 13, 'sombra', 'asfalto'); C.hl(bx, by, tw + 8, 'terracota');
    drawText(C, bx + 4, by + 1, c.letrero, 'oro');
  }
  // la gente del balcón (detrás de la baranda), la baranda y las matas
  if (c.balcon) {
    const b = { x: c.x + 10, w: c.w - 20, baranda: ALERO - 16 };
    if (conPublico) publicoBalcon(C, b, seed + 40, f);
    baranda(C, c.x + 4, c.x + c.w - 4, ALERO - 16, seed + 5);
    if (c.letrero && c.enLetrero === 'balcon') {
      const tw = textWidth(c.letrero), bx = Math.round(c.x + c.w / 2 - tw / 2) - 4;
      C.box(bx, ALERO - 13, tw + 8, 12, 'vino', 'sombra'); drawText(C, bx + 4, ALERO - 14, c.letrero, 'oro');
    }
  }
  // la planta baja: columnas de madera y los vanos
  for (let y = PB; y < 246; y++) for (let x = c.x; x < c.x + c.w; x++) C.p(x, y, 'sombra');
  const bs = bahias(c), n = bs.length, bw = Math.floor((c.w - 8) / n);
  for (let i = 0; i < n; i++) {
    const vx = c.x + 4 + i * bw + 2;
    vano(C, vx, bw - 4, c.vanos[i % c.vanos.length], seed + i);
  }
  for (let i = 0; i <= n; i++) { const px = c.x + i * bw + (i === n ? c.w - n * bw - 4 : 0); C.f(px, PB, 4, 246 - PB, 'sombra'); C.vl(px, PB, 246 - PB, 'asfalto'); }
  // el escalón de piedra del frente
  C.f(c.x, 243, c.w, 3, 'cemento'); C.hl(c.x, 243, c.w, 'cemento_claro');
  alero(C, c.x, c.x + c.w, seed + 7);
  // un farol en cada puerta
  for (const [i, bx] of bs.entries()) farol(C, bx, ALERO + 10, 8, 11, (['rojo', 'oro', 'rojo', 'canal'] as Color[])[(i + (c.x >> 5)) % 4], 3);
  // el racimo de faroles debajo del alero grande
  const cx = c.x + Math.floor(c.w / 2);
  racimo(C, cx, ARRIBA + 2, seed + 11);
}

/** Un racimo de faroles de colores colgando a distintas alturas. */
function racimo(C: Lienzo, cx: number, y: number, seed: number) {
  const R = rng(seed);
  const n = 3 + Math.floor(R() * 2);
  for (let i = 0; i < n; i++) {
    const x = cx + Math.round((i - (n - 1) / 2) * 11), big = i === Math.floor(n / 2);
    farol(C, x, y, big ? 11 : 8, big ? 15 : 11, COLORES_FAROL[Math.floor(R() * COLORES_FAROL.length)], 2 + ((i * 3) % 5));
  }
}

/** La baranda de madera del balcón: el pasamanos con luz, los balaustres y unas materas con flores. */
function baranda(C: Lienzo, x0: number, x1: number, y: number, seed: number) {
  C.hl(x0, y, x1 - x0, 'ocre'); C.hl(x0, y + 1, x1 - x0, 'terracota');
  for (let x = x0; x < x1; x += 3) C.vl(x, y + 2, 10, 'sombra');
  C.hl(x0, y + 12, x1 - x0, 'terracota'); C.hl(x0, y + 13, x1 - x0, 'sombra');
  const R = rng(seed);
  for (let x = x0 + 6; x < x1 - 8; x += 22 + Math.floor(R() * 14)) { C.f(x, y - 3, 5, 3, 'terracota'); C.p(x + 1, y - 5, 'verde'); C.p(x + 3, y - 5, 'verde'); C.p(x + 2, y - 6, 'salmon'); C.p(x + 1, y - 4, 'salmon'); C.p(x + 3, y - 4, 'verde_oscuro'); }
}

/** Los vecinos asomados al balcón: cabeza, hombros, nón lá, abanicos y celulares. Dos cuadros (brazos arriba y abajo). */
export function publicoBalcon(C: Lienzo, b: { x: number; w: number; baranda: number }, seed: number, f = 0) {
  const R = rng(seed);
  for (let px = b.x + 4, n = 0; px < b.x + b.w - 6; n++) {
    // todo lo de cada persona sale antes de dibujar: los dos cuadros tienen la misma gente
    const ropa = (['luz', 'rojo', 'celeste', 'crema', 'menta', 'salmon'] as Color[])[Math.floor(R() * 6)], sombrero = R() < 0.35, cosa = R(), paso = 12 + Math.floor(R() * 10);
    const cab = b.baranda - 9, arriba = (n + f) % 2 === 0;
    C.f(px, cab + 4, 6, 6, ropa); C.vl(px + 5, cab + 4, 6, MAS_OSCURO[ropa]);
    C.f(px + 1, cab, 4, 4, 'terracota'); C.p(px + 4, cab + 2, 'vino');
    if (sombrero) { C.hl(px - 1, cab, 8, 'crema'); C.hl(px + 1, cab - 1, 4, 'crema'); C.p(px + 2, cab - 2, 'luz'); C.hl(px - 1, cab + 1, 8, 'ocre'); }
    else { C.hl(px + 1, cab, 4, 'tinta'); C.p(px + 1, cab + 1, 'tinta'); }
    if (arriba) {
      C.vl(px - 1, cab - 2, 6, ropa); C.vl(px + 6, cab - 2, 6, ropa);
      if (cosa < 0.4) { C.f(px + 6, cab - 5, 4, 3, 'salmon'); C.p(px + 7, cab - 5, 'crema'); }
      else if (cosa < 0.7) { C.p(px - 1, cab - 3, 'luz'); C.p(px - 1, cab - 4, 'celeste'); }
      else { C.p(px - 1, cab - 3, 'rojo'); C.p(px + 6, cab - 3, 'rojo'); }
    } else C.vl(px - 1, cab + 5, 4, ropa);
    px += paso;
  }
}

/** Una mata de buganvilla: hojas en manchones y racimos de flores fucsia, que cae por la pared. */
function buganvilla(C: Lienzo, cx: number, cy: number, rx: number, ry: number, caida: number, seed: number) {
  const R = rng(seed);
  const n = Math.round(rx * ry * 0.18);
  const bolas = Array.from({ length: n }, () => { const a = R() * Math.PI * 2, t = Math.sqrt(R()); return [Math.round(cx + Math.cos(a) * t * rx), Math.round(cy + Math.sin(a) * t * ry), 1.2 + R() * 1.6] as const; });
  // las guías que cuelgan
  for (let k = 0; k < Math.round(rx / 3); k++) { const x = Math.round(cx - rx + R() * rx * 2), largo = Math.floor(R() * caida); for (let j = 0; j < largo; j++) { C.p(x + Math.round(Math.sin(j * 0.4 + k) * 0.8), cy + j, j % 3 ? 'verde_oscuro' : 'salmon'); } }
  for (const [x, y, r] of bolas) C.d(x, y + 1, r + 0.5, 'verde_oscuro');
  for (const [x, y, r] of bolas) C.d(x, y, r, R() < 0.35 ? 'verde' : 'salmon');
  for (const [x, y, r] of bolas) if (r > 1.8 && R() < 0.5) { C.p(x - 1, y - 1, 'crema'); C.p(x, y - 1, 'salmon'); }
  for (const [x, y] of bolas) if (R() < 0.2) C.p(x + 1, y + 1, 'vino');
}

/** El árbol de la esquina del río, con la buganvilla enredada y dos faroles colgando de las ramas. */
function arbol(C: Lienzo, seed: number) {
  const tx = 176;
  for (let y = 176; y < 246; y++) { const w = y > 236 ? 7 : 5; for (let i = 0; i < w; i++) C.p(tx - (w >> 1) + i, y, i === 0 ? 'asfalto' : i === w - 1 ? 'tinta' : 'sombra'); }
  C.ln(tx, 186, tx - 18, 168, 'sombra'); C.ln(tx + 1, 190, tx + 20, 172, 'sombra');
  const R = rng(seed);
  for (let k = 0; k < 26; k++) {
    const a = R() * Math.PI * 2, t = Math.sqrt(R());
    const x = Math.round(tx + Math.cos(a) * t * 34), y = Math.round(150 + Math.sin(a) * t * 22), r = 4 + R() * 4;
    C.d(x, y + 2, r, 'verde_oscuro');
  }
  for (let k = 0; k < 30; k++) {
    const a = R() * Math.PI * 2, t = Math.sqrt(R());
    const x = Math.round(tx + Math.cos(a) * t * 30), y = Math.round(148 + Math.sin(a) * t * 18), r = 2 + R() * 3;
    C.d(x, y, r, 'verde');
    if (R() < 0.4) C.p(x - 1, y - 1, 'menta');
  }
  buganvilla(C, tx + 14, 160, 16, 9, 18, seed + 3);
  farol(C, tx - 16, 168, 7, 9, 'rojo', 4);
  farol(C, tx + 18, 171, 7, 9, 'oro', 3);
}

/** Un puesto de faroles: techito de tejas sobre palos, los faroles colgando en dos filas y el mostrador con los de vender. */
function puestoFaroles(C: Lienzo, x0: number, x1: number, seed: number) {
  const R = rng(seed), w = x1 - x0, top = PB - 4;
  for (const px of [x0 + 2, x1 - 4]) { C.f(px, top + 8, 2, 246 - top - 8, 'sombra'); C.vl(px, top + 8, 246 - top - 8, 'asfalto'); }
  tejas(C, x0 - 2, x1 + 2, top, top + 6, seed);
  C.hl(x0 - 2, top, w + 4, 'asfalto'); for (let x = x0 - 2; x < x1 + 2; x++) { C.p(x, top + 6, (x >> 1) % 2 ? 'ocre' : 'terracota'); C.p(x, top + 7, 'sombra'); }
  for (let fila = 0; fila < 2; fila++) for (let x = x0 + 6 + fila * 4; x < x1 - 5; x += 8) {
    const big = R() < 0.3;
    farol(C, x, top + 8 + fila * 13, big ? 7 : 6, big ? 10 : 8, COLORES_FAROL[Math.floor(R() * COLORES_FAROL.length)], 1 + fila * 2 + Math.floor(R() * 2));
  }
  // el mostrador de madera y los faroles plegados encima
  C.f(x0 + 4, 246 - 16, w - 8, 16, 'asfalto'); for (let x = x0 + 4; x < x1 - 4; x += 5) C.vl(x, 246 - 15, 15, 'sombra'); C.hl(x0 + 4, 246 - 16, w - 8, 'terracota');
  for (let x = x0 + 6; x < x1 - 8; x += 6) { const c = COLORES_FAROL[Math.floor(R() * COLORES_FAROL.length)]; C.f(x, 246 - 21, 5, 5, c); C.p(x + 2, 246 - 19, NUCLEO[c] ?? 'luz'); C.hl(x, 246 - 21, 5, 'oro'); }
}

/** Una velita en su flor de papel, sobre el agua: los pétalos, la llama y su reflejo. `f` mueve la llama. */
export function velita(C: Lienzo, x: number, y: number, c: Color, f = 0) {
  C.p(x - 2, y - 1, c); C.p(x + 2, y - 1, c); C.hl(x - 2, y, 5, c); C.hl(x - 1, y + 1, 3, MAS_OSCURO[c]);
  C.p(x - 1, y - 1, MAS_CLARO[c]); C.p(x + 1, y - 1, MAS_CLARO[c]);
  C.p(x, y - 1, 'luz'); C.p(x, y - 2, f === 1 ? 'luz' : 'oro'); if (f !== 2) C.p(x, y - 3, f === 1 ? 'oro' : 'amarillo');
  C.p(x, y + 2, 'oro'); if (f !== 1) C.p(x, y + 3, 'ocre');
}
const VELA_COLORES: Color[] = ['salmon', 'rojo', 'crema', 'amarillo', 'salmon', 'menta'];

/** El bote con faroles: casco de madera con la franja roja, el techito de bambú, faroles en la proa y adentro, y su reflejo. */
export function boteFaroles(C: Lienzo, x: number, y: number, w: number, f = 0) {
  const dy = f === 1 ? 1 : 0, yy = y + dy;
  // el reflejo
  for (let i = 4; i < w - 4; i++) for (let j = 1; j < 5; j++) if (bayer(x + i, yy + j) < 0.5 - j * 0.1) C.p(x + i, yy + j, 'sombra');
  for (const lx of [x + 6, x + 20, x + 28]) { C.p(lx, yy + 2, 'oro'); C.p(lx, yy + 4, 'rojo'); }
  // el casco con las puntas que suben
  for (let i = 0; i < w; i++) {
    const t = Math.abs(i - w / 2) / (w / 2), sube = Math.round(t * t * 4);
    for (let j = 0; j < 5; j++) C.p(x + i, yy - 5 + j - sube + (j > 2 ? sube : 0), j === 0 ? 'terracota' : j === 1 ? 'rojo' : j > 3 ? 'sombra' : 'asfalto');
  }
  // el techito de bambú en arco
  for (let i = 14; i < 34; i++) { const h = Math.round(Math.sin(((i - 14) / 20) * Math.PI) * 3); C.p(x + i, yy - 13 - h, 'ocre'); C.p(x + i, yy - 12 - h, 'terracota'); for (let j = yy - 11 - h; j < yy - 5; j++) C.p(x + i, j, i % 4 === 0 ? 'terracota' : 'sombra'); }
  // faroles: uno en la proa, colgado de su vara, y dos adentro
  C.vl(x + 5, yy - 14, 9, 'ocre'); farol(C, x + 5, yy - 14, 5, 6, 'rojo', 1);
  farol(C, x + 19, yy - 11, 5, 5, 'oro', 1); farol(C, x + 28, yy - 11, 5, 5, 'canal', 1);
  // el que rema atrás, con su nón lá
  const rx = x + w - 10;
  C.f(rx, yy - 12, 4, 7, 'celeste'); C.vl(rx + 3, yy - 12, 7, 'azul'); C.hl(rx - 2, yy - 14, 8, 'crema'); C.hl(rx, yy - 15, 4, 'crema'); C.p(rx + 1, yy - 16, 'luz');
  C.ln(rx + 5, yy - 10, rx + 10, yy + 2, 'ocre');
}

/** El río de la izquierda: el agua con los reflejos, las velitas, el bote y el malecón de piedra con sus bolardos. */
function rioCerca(C: Lienzo, seed: number, conBote: boolean, boteF = 0) {
  const { x1, agua, malecon } = RIO, R = rng(seed + 13);
  // los reflejos del puente y la orilla de enfrente siguen hasta aquí: rayas por grupos de columnas
  aguaNoche(C, 0, x1, agua, malecon, seed + 5, (x) => {
    // debajo de la galería del puente: una raya por vano encendido, y los faroles rojos
    const i = x - PUENTE.x - 4;
    if (i >= 0 && i < PUENTE.w - 8) return i % 10 === 5 ? 'rojo' : i % 10 > 2 && i % 10 < 8 ? 'oro' : undefined;
    return grain(x >> 1, 0, seed + 4) < 0.1 ? 'oro' : undefined;
  });
  for (let k = 0; k < 7; k++) { const x = 6 + Math.floor(R() * (x1 - 20)); if (x > BOTE.x - 6 && x < BOTE.x + BOTE.w + 6) continue; velita(C, x, agua + 4 + Math.floor(R() * 9), VELA_COLORES[k % VELA_COLORES.length]); }
  if (conBote) boteFaroles(C, BOTE.x, BOTE.y, BOTE.w, boteF);
  // el malecón: piedra con el canto encendido y los bolardos
  for (let y = malecon; y < 246; y++) for (let x = 0; x < x1 + 4; x++) {
    const r = y - malecon, fila = Math.floor(r / 5), jx = (x + fila * 9) % 18;
    C.p(x, y, r === 0 ? 'crema' : r === 1 ? 'cemento_claro' : r % 5 === 0 || jx === 0 ? 'asfalto' : grain(x >> 1, y, seed) < 0.1 ? 'asfalto_claro' : 'cemento');
  }
  for (let x = 12; x < x1; x += 38) { C.f(x, malecon - 7, 6, 7, 'cemento'); C.vl(x, malecon - 7, 7, 'cemento_claro'); C.hl(x, malecon - 7, 6, 'crema'); C.vl(x + 5, malecon - 7, 7, 'asfalto_claro'); }
}

/** Para la vida: sin la gente o sin el bote, y en qué cuadro van la gente (`f`) y el bote (`boteF`). */
export interface OpcionesHoian { publico?: boolean; bote?: boolean; f?: number; boteF?: number }

/** La capa cerca completa de Hội An, sobre un lienzo de la capa (base = franja.atras). */
export function pintarHoian(C: Lienzo, seed: number, o: OpcionesHoian = {}) {
  rioCerca(C, seed, o.bote ?? true, o.boteF ?? 0);
  for (const [i, c] of CASAS.entries()) casa(C, { ...c, w: i === CASAS.length - 1 ? Math.max(c.w, C.w - c.x) : c.w }, seed + i * 31, o.publico ?? true, o.f ?? 0);
  // la buganvilla que cae del techo y de los balcones
  buganvilla(C, CASAS[0].x + 22, ARRIBA - 4, 22, 9, 26, seed + 61);
  buganvilla(C, CASAS[2].x + CASAS[2].w - 16, ALERO - 18, 18, 7, 14, seed + 62);
  buganvilla(C, CASAS[3].x + 20, ARRIBA - 6, 14, 6, 20, seed + 63);
  arbol(C, seed + 71);
  for (const [i, p] of PUESTOS.entries()) puestoFaroles(C, p.x0, Math.min(C.w, p.x1), seed + 80 + i);
  // matas en materas al pie de las casas
  for (const x of [196, 382, 516, 590]) { C.f(x, 236, 8, 8, 'terracota'); C.hl(x, 236, 8, 'ocre'); C.hl(x, 243, 8, 'vino'); for (let k = 0; k < 9; k++) C.d(x + 1 + ((k * 5) % 7), 231 - (k % 3) * 2, 2, k % 3 ? 'verde' : 'verde_oscuro'); C.p(x + 3, 228, 'menta'); }
}

export const casasHoian: PintorCerca = (C, _x0, _x1, _base, ctx: CtxCerca) => pintarHoian(C, ctx.seed);
export const PINTORES_HOIAN: Record<string, PintorCerca> = { casas_amarillas_faroles: casasHoian };
export const FONDO_HOIAN: Record<string, PintorCerca> = { [CERCA_HOIAN]: casasHoian };

// ---------------------------------------------------------------------------------------------------------------------
// El piso: la calle de piedra, la acera, el muelle y el río de adelante

/** Las luces que tiñen la piedra de la calle: debajo de cada farol de puerta, de los puestos, de los postes y de las cuerdas. */
let CHARCOS_LUZ: { x: number; y: number; rx: number; ry: number }[] | undefined;
function luzPiso(x: number, y: number) {
  CHARCOS_LUZ ??= [
    ...CASAS.flatMap((c) => bahias(c).map((bx) => ({ x: bx, y: 2, rx: 30, ry: 26 }))),
    ...PUESTOS.map((p) => ({ x: (p.x0 + p.x1) / 2 - 8, y: 4, rx: 64, ry: 40 })),
    ...[118, 222, 330, 436, 538].map((x) => ({ x, y: 46, rx: 40, ry: 22 })),
  ];
  let t = 0;
  for (const l of CHARCOS_LUZ) t = Math.max(t, 1 - Math.hypot((x - l.x) / l.rx, (y - l.y) / l.ry));
  return t;
}

/** La piedra de la calle: losas grandes trabadas, cada una de su tono, con el canto gastado y la luz tibia de los faroles. */
export function piedraHoian(x: number, y: number, s: number): Color {
  const fila = Math.floor(y / 9), jy = y % 9, off = Math.floor(grain(fila, 0, s + 3) * 30);
  const col = Math.floor((x + off) / 26), jx = (x + off) % 26;
  if (jy === 8 || jx === 25) return 'asfalto';
  const t = grain(col, fila, s + 11), luz = luzPiso(x, y), b = bayer(x, y);
  // el canto de arriba de cada losa
  if (jy === 0 && jx < 24) return luz > 0.5 ? 'crema' : t > 0.3 ? 'cemento_claro' : 'cemento';
  if (jx === 24) return 'asfalto_claro';
  // la luz de los faroles: la piedra se pone tibia y clara
  if (luz > 0.62) return b < 0.2 && luz > 0.8 ? 'crema' : 'cemento_claro';
  if (luz > 0.38 && b < (luz - 0.38) * 2.6) return 'cemento_claro';
  // cada losa con su tono: unas más oscuras, unas más claras, y hacia adelante se apaga
  if (t < 0.22 && b < 0.5) return 'asfalto_claro';
  if (t > 0.85 && b < 0.25) return 'cemento_claro';
  if (luz < 0.05 && b < Math.max(0, (y - 50) / 90)) return 'asfalto_claro';
  return grain(x >> 1, y, s + 23) < 0.02 ? 'asfalto_claro' : 'cemento';
}

/** La acera de enfrente de las casas: losas grandes y más claras, pisadas. */
export function aceraHoian(x: number, y: number, s: number): Color {
  const jx = x % 40;
  if (jx === 39 || y === 0) return 'asfalto_claro';
  // pétalos de buganvilla caídos debajo de las matas
  if (((x > 176 && x < 214) || (x > 492 && x < 530)) && grain(x, y, s + 33) < 0.035) return 'salmon';
  const luz = luzPiso(x, y);
  if (luz > 0.45 && bayer(x, y) < (luz - 0.45) * 2.2) return 'crema';
  return grain(x >> 2, y >> 1, s + 31) < 0.08 ? 'cemento' : 'cemento_claro';
}

/** El muelle del río: tablas a lo largo, con juntas trabadas, clavos y la luz de los faroles. */
export function maderaHoian(x: number, y: number, s: number): Color {
  const tb = Math.floor(y / 4), jy = y % 4, jx = (x + tb * 37) % 56;
  if (jy === 3 || jx === 0) return 'asfalto';
  if (jx === 2 && jy === 1) return 'sombra';
  const tono = grain(Math.floor((x + tb * 37) / 56), tb, s + 43);
  if (jy === 0) return tono > 0.4 ? 'cemento_claro' : 'cemento';
  return grain(x >> 2, y, s + 41) < 0.1 ? 'asfalto' : tono > 0.6 ? 'cemento' : 'asfalto_claro';
}

/** Las velitas del río de adelante (x de la orilla, fila desde el canto). */
let VELITAS_FRENTE: { x: number; r: number; c: Color }[] | undefined;
export function velitasFrente() {
  if (!VELITAS_FRENTE) {
    const R = rng(907);
    VELITAS_FRENTE = [];
    // lejos de los pilotes del muelle (cada 40, de 8 a 11)
    for (let x = 14; x < 960; x += 44 + Math.floor(R() * 40)) VELITAS_FRENTE.push({ x: x % 40 >= 5 && x % 40 < 15 ? x + 10 : x, r: 9 + Math.floor(R() * 4), c: VELA_COLORES[Math.floor(R() * VELA_COLORES.length)] });
  }
  return VELITAS_FRENTE;
}

/** Lo que se ve debajo de la franja: el canto del muelle, los pilotes y el río con los reflejos y las velitas. */
export function orillaHoian(_P: Lienzo, x: number, r: number, s: number): Color {
  if (r === 0) return 'cemento_claro';
  if (r < 4) return r === 3 ? 'sombra' : (x % 24 === 6 && r === 2) ? 'oro' : 'asfalto';
  const pil = x % 40;
  if (pil >= 8 && pil < 12 && r < 14) return pil === 8 ? 'asfalto_claro' : pil === 11 ? 'tinta' : 'asfalto';
  // las velitas
  for (const v of velitasFrente()) {
    const dx = x - v.x, dr = r - v.r;
    if (Math.abs(dx) > 2 || dr < -3 || dr > 3) continue;
    const c = v.c;
    if (dr === 0) return c;
    if (dr === -1) return dx === 0 ? 'luz' : Math.abs(dx) === 2 ? c : MAS_CLARO[c];
    if (dr === 1 && Math.abs(dx) < 2) return MAS_OSCURO[c];
    if (dx === 0 && dr === -2) return 'oro';
    if (dx === 0 && dr === -3) return 'amarillo';
    if (dx === 0 && dr === 2) return 'oro';
    if (dx === 0 && dr === 3) return 'ocre';
  }
  // el agua: los reflejos de los faroles del muelle en rayas cortadas que tiemblan, y los rizos
  const t = (r - 4) / 26, g = x >> 1;
  if (grain(x >> 2, 0, s + 51) < 0.14 && (r + g) % 3 !== 0 && grain(g, r, s + 52) > 0.2 + t) return grain(x >> 2, 2, s) < 0.35 ? 'rojo' : t < 0.3 ? 'oro' : 'ocre';
  if ((x + r * 7) % 23 < 5 && grain(x >> 3, r, s + 53) < 0.18) return 'cielo';
  return bayer(x, r) < 0.12 + t * 0.45 ? 'azul_noche' : 'azul';
}

// ---------------------------------------------------------------------------------------------------------------------
// Las piezas: los postes del Tama-wari, los postes de faroles, la base y las cuerdas

/** El color del equipo que defiende cada poste (el de su bola): la Familia azul y el Instituto rojo. */
export const COLOR_EQUIPO: Record<string, Color> = { familia_gg: 'celeste', instituto_nekketsu: 'rojo' };
const CINTAS: Color[] = ['rojo', 'oro', 'menta', 'celeste', 'canal', 'salmon', 'amarillo', 'luz'];

/**
 * El poste del Tama-wari: caña de bambú con sus nudos, el yugo arriba donde se cuelga la bola (la pone el juego, es la
 * entidad `bola_tama`), el collar del color del equipo con las cintas que caen y el trípode de bambú amarrado abajo.
 * `gancho` es el punto del yugo, en el dibujo: ahí va el ancla de la bola (el hilo).
 */
export function posteTamawari(pal: Paleta, alto: number, equipo: Color = 'rojo'): { pieza: Pieza; cx: number; gancho: [number, number] } {
  const W = 46, cx = 22, base = alto + 5, P = nueva(pal, W, 0, alto + 18), L = P.img;
  // las patas del trípode de atrás (detrás de la caña)
  const pata = (fx: number, fy: number, luz: boolean) => {
    const x0 = cx, y0 = base - 46;
    L.ln(x0 - 1, y0, fx - 1, fy, 'tinta'); L.ln(x0 + 1, y0, fx + 1, fy, 'tinta');
    L.ln(x0, y0, fx, fy, luz ? 'amarillo' : 'ocre');
    L.f(fx - 2, fy, 5, 2, 'asfalto');
  };
  pata(cx - 17, base, true);
  pata(cx + 9, base - 9, false);
  // la caña: amarilla con luz a la izquierda, nudos cada 16 y el contorno
  for (let y = 2; y < base; y++) {
    const nudo = (base - y) % 16 === 0, sobreNudo = (base - y) % 16 === 1;
    L.p(cx - 4, y, 'tinta'); L.p(cx + 4, y, 'tinta');
    for (let i = -3; i <= 3; i++) L.p(cx + i, y, nudo ? (i < 1 ? 'terracota' : 'vino') : sobreNudo ? (i < 1 ? 'crema' : 'ocre') : i === -3 ? 'ocre' : i < 0 ? (i === -2 ? 'crema' : 'amarillo') : i === 0 ? (bayer(cx, y) < 0.5 ? 'amarillo' : 'ocre') : i === 1 ? 'ocre' : i === 2 ? 'terracota' : 'vino');
  }
  // el yugo de arriba, con el hilo de la bola en el medio
  L.hl(cx - 6, 0, 13, 'tinta'); L.f(cx - 6, 1, 13, 3, 'ocre'); L.hl(cx - 6, 1, 13, 'amarillo'); L.hl(cx - 6, 4, 13, 'tinta'); L.p(cx - 7, 2, 'tinta'); L.p(cx + 7, 2, 'tinta');
  // el collar del equipo y las cintas de colores que caen, justo debajo de donde termina la bola
  const cy = 36;
  L.f(cx - 4, cy, 9, 3, equipo); L.hl(cx - 4, cy, 9, MAS_CLARO[equipo]); L.hl(cx - 4, cy + 3, 9, 'tinta');
  for (let k = 0; k < 9; k++) {
    const x = cx - 4 + k, largo = 26 + ((k * 7) % 15), c = CINTAS[k % CINTAS.length];
    for (let j = 0; j < largo; j++) L.p(x + Math.round(Math.sin(j * 0.22 + k) * (j / 10) + (k - 4) * (j / 40)), cy + 4 + j, j === largo - 1 ? MAS_OSCURO[c] : c);
  }
  // las amarras de cabuya donde se juntan las patas
  for (let j = 0; j < 4; j++) L.hl(cx - 4, base - 47 + j * 2, 9, j % 2 ? 'cemento_claro' : 'cemento');
  // la pata de adelante, delante de la caña
  pata(cx + 4, base + 9, true);
  return { pieza: P, cx: cx + 2, gancho: [cx, 5] };
}

/**
 * El poste de faroles: palo de madera oscura con su cruceta arriba. Sin `faroles` va pelado (los faroles van en la vida
 * `faroles_meciendose`, que los mece).
 */
export function posteFaroles(pal: Paleta, alto: number, faroles = true): { pieza: Pieza; cx: number } {
  const W = 34, cx = 17, base = alto + 5, P = nueva(pal, W, 0, alto + 6), L = P.img;
  for (let y = 4; y < base; y++) { L.p(cx - 2, y, 'tinta'); L.p(cx - 1, y, 'asfalto_claro'); L.p(cx, y, 'asfalto'); L.p(cx + 1, y, 'sombra'); L.p(cx + 2, y, 'tinta'); }
  L.f(cx - 4, base - 3, 9, 3, 'asfalto'); L.hl(cx - 4, base - 3, 9, 'asfalto_claro');
  // la cruceta y el remate
  L.f(cx - 14, 6, 29, 3, 'asfalto'); L.hl(cx - 14, 6, 29, 'asfalto_claro'); L.hl(cx - 14, 9, 29, 'tinta');
  L.f(cx - 2, 0, 5, 5, 'oro'); L.p(cx, 1, 'luz'); L.hl(cx - 2, 5, 5, 'vino');
  if (faroles) for (const [x, c, cord] of FAROLES_POSTE) farol(L, cx + x, 10, 7, 9, c, cord);
  return { pieza: P, cx: cx + 2 };
}
/** Los faroles del poste de faroles: x desde el palo, color y largo del cordón. */
export const FAROLES_POSTE: [number, Color, number][] = [[-11, 'rojo', 2], [-4, 'oro', 6], [4, 'canal', 3], [11, 'rojo', 5]];

/** Los faroles del poste que se mecen: el mismo dibujo sin el palo, 4 cuadros. */
export function posteFarolesVida(pal: Paleta): Lienzo[] {
  return [0, 1, 0, -1].map((d, f) => { const L = new Lienzo(34, 30, pal); for (const [i, [x, c, cord]] of FAROLES_POSTE.entries()) farol(L, 17 + x, 10, 7, 9, c, cord, i % 2 ? -d : d); void f; return L; });
}

/** La base del poste del Tama-wari: un cajón de madera lleno de piedras, con flejes. */
export function baseTamawari(pal: Paleta, w: number, d: number, z: number): Pieza {
  const P = nueva(pal, w, d, z), L = P.img;
  for (let y = 0; y < d; y++) for (let x = 0; x < w; x++) {
    const borde = x === 0 || y === 0 || x === w - 1 || y === d - 1;
    L.p(x, y, borde ? (y === 0 ? 'cemento' : 'asfalto_claro') : grain(x >> 1, y >> 1, 5) < 0.45 ? 'cemento_claro' : grain(x, y, 6) < 0.5 ? 'cemento' : 'asfalto_claro');
  }
  for (let y = d; y < d + z; y++) for (let x = 0; x < w; x++) L.p(x, y, y === d ? 'cemento' : x % 5 === 0 ? 'sombra' : y === d + Math.floor(z / 2) ? 'asfalto_claro' : 'asfalto');
  L.hl(0, d + z - 1, w, 'tinta');
  return P;
}

/** Las piezas de Hội An. null si el tipo no es de aquí. */
export function piezaHoian(pal: Paleta, tipo: string | undefined, w: number, d: number, z: number): Pieza | null {
  if (tipo === 'base_poste') return baseTamawari(pal, w, d, z);
  return null;
}

/** Los postes de Hội An. null si el tipo no es de aquí. */
export function posteHoian(pal: Paleta, tipo: string | undefined, alto: number, o: { equipo?: string; faroles?: boolean } = {}): { pieza: Pieza; cx: number; gancho?: [number, number] } | null {
  if (tipo === 'poste_tamawari') return posteTamawari(pal, alto, COLOR_EQUIPO[o.equipo ?? ''] ?? 'rojo');
  if (tipo === 'poste_faroles') return posteFaroles(pal, alto, o.faroles ?? true);
  return null;
}

/** Un farol en una cuerda: dónde cuelga (en el dibujo de las cuerdas), su tamaño, color y cordón. */
interface FarolCuerda { x: number; y: number; w: number; h: number; c: Color; cordon: number }

/**
 * Las cuerdas de faroles sobre la calle (`bajo` tipo `cuerdas_faroles`): van de poste en poste (los que caen en su rango,
 * de izquierda a derecha), amarradas a la altura `z` del bajo, o más abajo si el poste es más bajo. Si no hay dos postes,
 * una sola cuerda a lo largo, en el medio de su fondo. Devuelve el dibujo de las cuerdas, dónde va (x, fila de pantalla)
 * y los faroles que cuelgan (que van en el dibujo, o en la vida si se mecen).
 */
export function cuerdasFaroles(pal: Paleta, L: ObliqueLayout, b: { x0: number; x1: number; y0?: number; y1?: number; z: number }, k: number, seed: number, conFaroles: boolean) {
  const FT = L.franja.atras, D = depthOf(L);
  const postes = L.postes.filter((p) => p.x >= b.x0 && p.x <= b.x1).sort((p, q) => p.x - q.x);
  const ym = Math.round(((b.y0 ?? 0) + (b.y1 ?? D)) / 2);
  const puntos: [number, number][] = postes.length >= 2
    ? postes.map((p) => [p.x + corre(k, p.y), FT + p.y - Math.min(b.z, p.alto + 2)])
    : [[b.x0 + corre(k, ym), FT + ym - b.z], [b.x1 + corre(k, ym), FT + ym - b.z]];
  const x0 = Math.min(...puntos.map((p) => p[0])) - 2, x1 = Math.max(...puntos.map((p) => p[0])) + 2;
  const y0 = Math.min(...puntos.map((p) => p[1])) - 2, R = rng(seed);
  const tramos = puntos.slice(1).map((p, i) => { const a = puntos[i], sag = Math.round(Math.min(14, Math.max(4, Math.abs(p[0] - a[0]) / 30))); return { a, p, sag }; });
  const alto = Math.max(...tramos.map((t) => Math.max(t.a[1], t.p[1]) + t.sag)) - y0 + 20;
  const img = new Lienzo(x1 - x0, alto, pal), faroles: FarolCuerda[] = [];
  for (const { a, p, sag } of tramos) {
    const n = Math.max(2, Math.abs(p[0] - a[0]));
    let antes = -1;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = Math.round(a[0] + (p[0] - a[0]) * t), y = Math.round(a[1] + (p[1] - a[1]) * t + sag * 4 * t * (1 - t));
      img.p(x - x0, y - y0, 'sombra');
      if (antes >= 0 && Math.abs(y - antes) > 1) for (let j = Math.min(y, antes) + 1; j < Math.max(y, antes); j++) img.p(x - x0, j - y0, 'sombra');
      antes = y;
    }
    // un farol cada 14 a 20 px, lejos de los amarres
    for (let x = Math.min(a[0], p[0]) + 9; x < Math.max(a[0], p[0]) - 7; x += 14 + Math.floor(R() * 7)) {
      const t = (x - a[0]) / (p[0] - a[0]), y = Math.round(a[1] + (p[1] - a[1]) * t + sag * 4 * t * (1 - t));
      const big = R() < 0.3;
      faroles.push({ x: x - x0, y: y - y0 + 1, w: big ? 10 : 8, h: big ? 13 : 10, c: COLORES_FAROL[Math.floor(R() * COLORES_FAROL.length)], cordon: 1 + Math.floor(R() * 4) });
    }
  }
  if (conFaroles) for (const f of faroles) farol(img, f.x, f.y, f.w, f.h, f.c, f.cordon);
  return { img, x: x0, y: y0, faroles };
}

/** Los faroles de las cuerdas que se mecen: 4 cuadros (quieto, a un lado, quieto, al otro), cada farol con su fase. */
export function cuerdasVida(pal: Paleta, w: number, h: number, faroles: FarolCuerda[]): Lienzo[] {
  return [0, 1, 0, -1].map((d) => {
    const L = new Lienzo(w, h, pal);
    faroles.forEach((f, i) => farol(L, f.x, f.y, f.w, f.h, f.c, f.cordon, i % 3 === 0 ? -d : i % 3 === 1 ? d : 0));
    return L;
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// La vida y las luces

/** Recorta un pedazo opaco de una capa (para la vida que se dibuja encima y la tapa entera). */
function recorte(src: Lienzo, x: number, y: number, w: number, h: number): Lienzo {
  const out = new Lienzo(w, h, src.pal);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const sx = x + i, sy = y + j;
    if (sx < 0 || sy < 0 || sx >= src.w || sy >= src.h) continue;
    const k = (sy * src.w + sx) * 4;
    if (src.r.data[k + 3]) out.r.data.set(src.r.data.subarray(k, k + 4), (j * w + i) * 4);
  }
  return out;
}

/**
 * La vida de Hội An: los faroles que se mecen (los de las cuerdas y los de los postes), las velitas del río de adelante
 * que titilan, el bote con faroles que se mece en el río de la izquierda y el que cruza lejos, y los vecinos de los
 * balcones. Cada pieza que va sobre lo pintado lo tapa entero (es un recorte de la capa con lo que se mueve), así no
 * queda nada doble.
 */
export function vidaHoian(pal: Paleta, L: ObliqueLayout, k: number, seed: number, capas: { cerca: Lienzo; piso: Lienzo }, cuerdas: { x: number; y: number; img: Lienzo; faroles: FarolCuerda[]; orden: number }[], postes: { x: number; y: number; orden: number }[]): VidaEscena[] {
  if (!esHoian(L)) return [];
  const out: VidaEscena[] = [], FT = L.franja.atras, D = depthOf(L), quiere = (t: string) => L.vida.includes(t);
  if (quiere('faroles_meciendose')) {
    cuerdas.forEach((c, i) => out.push({ id: `faroles_cuerda_${i}`, tipo: 'faroles_meciendose', capa: 'objeto', x: c.x, y: c.y, cuadros: cuerdasVida(pal, c.img.w, c.img.h, c.faroles), fps: 3, orden: c.orden + 0.05 }));
    postes.forEach((p, i) => out.push({ id: `faroles_poste_${i}`, tipo: 'faroles_meciendose', capa: 'objeto', x: p.x, y: p.y, cuadros: posteFarolesVida(pal), fps: 3, orden: p.orden + 0.05 }));
  }
  if (quiere('velitas_rio')) {
    // las velitas de adelante: un recorte del río del bordillo donde la llama titila, 3 cuadros
    const r0 = 5, h = 11, x0 = 0, w = capas.piso.w, sD = corre(k, D);
    const base = recorte(capas.piso, x0, D + r0, w, h);
    const cuadros = [0, 1, 2].map((f) => {
      const c = recorte(base, 0, 0, w, h);
      for (const v of velitasFrente()) {
        const sx = v.x + sD;
        if (sx < 2 || sx >= w - 2) continue;
        velita(c, sx, v.r - r0, v.c, f);
      }
      return c;
    });
    out.push({ id: 'velitas_rio', tipo: 'velitas_rio', capa: 'objeto', x: x0, y: FT + D + r0, cuadros, fps: 4, orden: D + 20 });
  }
  if (quiere('botes_con_faroles')) {
    // el bote del río de la izquierda: recorte de la capa pintada con el bote en cada cuadro (se mece)
    const bx = BOTE.x - 2, by = BOTE.y - 18, bw = BOTE.w + 6, bh = 24;
    const cuadros = [0, 1].map((f) => { const c = new Lienzo(capas.cerca.w, capas.cerca.h, pal); pintarHoian(c, seed, { boteF: f }); return recorte(c, bx, by, bw, bh); });
    out.push({ id: 'bote_rio', tipo: 'botes_con_faroles', capa: 'cerca', x: bx, y: by, cuadros, fps: 1 });
    // y uno que cruza lejos, delante de la orilla de enfrente
    const lejos = [0, 1].map((f) => { const c = new Lienzo(BOTE.w + 4, 24, pal); boteFaroles(c, 2, 18, BOTE.w - 14, f); return c; });
    out.push({ id: 'bote_lejos', tipo: 'botes_con_faroles', capa: 'lejos', x: 260, y: AGUA_LEJOS - 6, cuadros: lejos, fps: 1, recorrido: { desde: [260, AGUA_LEJOS - 6], hasta: [-60, AGUA_LEJOS - 4], segundos: 45, desfase: 0.55 } });
  }
  if (quiere('publico')) {
    // los vecinos de los balcones: recorte de la casa con la gente en cada cuadro (brazos arriba y abajo)
    const cuadrosDe = [0, 1].map((f) => { const c = new Lienzo(capas.cerca.w, capas.cerca.h, pal); pintarHoian(c, seed, { f }); return c; });
    BALCONES.forEach((b, i) => {
      const bx = b.x - 2, by = b.baranda - 16, bw = b.w + 4, bh = 30;
      out.push({ id: `publico_${i}`, tipo: 'publico', capa: 'cerca', x: bx, y: by, cuadros: cuadrosDe.map((c) => recorte(c, bx, by, bw, bh)), fps: 2 });
    });
  }
  return out;
}

/** Las luces de Hội An: los faroles de las puertas, los puestos, los postes de faroles, las cuerdas y el bote. */
export function lucesHoian(pal: Paleta, L: ObliqueLayout, k: number, cuerdas: { x: number; y: number; faroles: FarolCuerda[] }[]): Luz[] {
  if (!esHoian(L)) return [];
  const FT = L.franja.atras, out: Luz[] = [];
  for (const c of CASAS.slice(0, 3)) { const bx = bahias(c)[0]; out.push({ x: bx, y: ALERO + 18, color: pal.oro, radio: 24, latido: 0.6, encendida: true, nota: 'el farol de la puerta: alumbra la pared amarilla y la piedra' }); }
  for (const p of PUESTOS) out.push({ x: Math.round((p.x0 + Math.min(p.x1, 640)) / 2), y: PB + 16, color: pal.oro, radio: 40, encendida: true, nota: 'el puesto de faroles' });
  for (const p of L.postes.filter((q) => q.tipo === 'poste_faroles')) out.push({ x: p.x + corre(k, p.y), y: FT + p.y - p.alto + 12, color: pal.rojo, radio: 32, latido: 0.8, encendida: true, nota: 'los faroles del poste' });
  for (const c of cuerdas) {
    const fs = c.faroles.filter((_, i) => i % Math.max(1, Math.floor(c.faroles.length / 3)) === 1).slice(0, 3);
    for (const f of fs) out.push({ x: c.x + f.x, y: c.y + f.y + f.cordon + 4, color: pal[f.c], radio: 26, latido: 0.7, encendida: true, nota: 'farol de seda de la cuerda: se mece con su vida' });
  }
  return out.slice(0, 12);
}

/** Las partículas de Hội An: los pétalos de la buganvilla y los brillos del río de adelante. */
export function particulasHoian(pal: Paleta, L: ObliqueLayout, k: number, Wp: number): Particula[] {
  if (!esHoian(L)) return [];
  const FT = L.franja.atras, D = depthOf(L);
  return [
    { tipo: 'petalo', fx: 'petalo_buganvilla', x0: CASAS[0].x + 4, x1: CASAS[0].x + 40, y0: ARRIBA, y1: ARRIBA + 10, cada: 3, nota: 'pétalos que caen de la buganvilla de la esquina' },
    { tipo: 'petalo', fx: 'petalo_buganvilla', x0: CASAS[2].x + CASAS[2].w - 30, x1: CASAS[2].x + CASAS[2].w, y0: ALERO - 18, y1: ALERO - 10, cada: 4, nota: 'pétalos que caen de la buganvilla del balcón' },
    { tipo: 'brillo', x0: corre(k, D), x1: Wp, y0: FT + D + 5, y1: 360, color: [pal.oro, pal.luz], cada: 0.6, vida: 0.4, nota: 'brillitos de los faroles en el río de adelante' },
  ];
}
