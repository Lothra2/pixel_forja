import { bayer, grain, rng } from '../fx/pix';
import type { UiPiece } from './retro';
import { Lienzo } from '../world/oblique/lienzo';
import type { Color } from '../world/oblique/paleta';
import { VIETNAM_DALAT_MANANA } from '../world/oblique/lugaresPaleta';
import { lagoXuanHuong, arcilla, pino, hortensias } from '../world/oblique/dalat';
import { malla, personita, sentadita, sombraOval, textoGrande, anchoTexto } from '../world/oblique/pinceles';

/**
 * La cancha de tenis de arcilla de Đà Lạt vista desde atrás de tu equipo (lote TENIS_V), para el Tenis de dobles en
 * vertical: la cancha en profundidad, tú abajo y ellos arriba, más chicos, como el tenis del Switch Sports en 2D.
 *
 * Mide 800 x 360 (la parte de 640 va de x 80 a 720; en los celulares anchos se ve hasta 80 más a cada lado). Es la misma
 * mañana con neblina del escenario de lado (`cancha_arcilla_dalat`, paleta `vietnam_montana`): el lago Xuân Hương con la
 * catedral y la villa en las lomas, la malla del club con su lona al fondo, los pinos altísimos a los costados, las gradas
 * de tres escalones con la gente abrigada, las vallas de publicidad paradas entre la cancha y las gradas, las macetas de
 * hortensias, la silla del juez a la derecha de la red, la banca de los jugadores a la izquierda y los faroles viejos
 * en las esquinas. La arcilla va barrida, con sus rayas blancas con polvo. La red va aparte (`tenis_red`), para
 * dibujarla entre los jugadores de atrás y los de adelante.
 *
 * La perspectiva es la del juego, en unidades de la cancha (x de -100 a 100, d de 0, tu fondo, a 400, el de ellos):
 *   s(d) = 480 / (480 + d);  x_imagen = 400 + x * s * 1.35;  y_imagen = -135.6 + 457.6 * s
 * Tu línea de fondo cae en la fila 322 y la de ellos en la 114; la red, en la 211.
 */

export const TENIS_V = { w: 800, h: 360, margen: 80, ancho: 200, largo: 400, red: 200, saque: 95, redAlto: 24 };
const W = TENIS_V.w, H = TENIS_V.h;
const D0 = 480, CX = 400, KX = 1.35, KY = 457.6, HOR = -135.6;
const ANCHO = TENIS_V.ancho, LARGO = TENIS_V.largo, RED_D = TENIS_V.red, SAQUE = TENIS_V.saque;
const esc = (d: number) => D0 / (D0 + d);
/** Un punto de la cancha (x, d, z) en la imagen: [x, y, escala]. */
export const pant = (x: number, d: number, z = 0): [number, number, number] => { const s = esc(d); return [CX + x * s * KX, HOR + KY * s - z * s, s]; };
/** La profundidad que cae en una fila de la imagen. */
const dEn = (y: number) => D0 / ((y - HOR) / KY) - D0;
/** Las cuatro esquinas de la cancha de dobles en la imagen: tu fondo izquierda y derecha, el de ellos derecha e izquierda. */
export const ESQUINAS: [number, number][] = [pant(-ANCHO / 2, 0), pant(ANCHO / 2, 0), pant(ANCHO / 2, LARGO), pant(-ANCHO / 2, LARGO)].map(([x, y]) => [Math.round(x), Math.round(y)] as [number, number]);
/** La red en la imagen: la fila de su base, de qué x a qué x y lo alto. */
export const RED = (() => { const [x0, y] = pant(-ANCHO / 2 - 8, RED_D), [x1, , s] = pant(ANCHO / 2 + 8, RED_D); return { fila: Math.round(y), x0: Math.round(x0), x1: Math.round(x1), alto: Math.round(TENIS_V.redAlto * s) }; })();

type P = { x: number; y: number };
/** Rellena un polígono convexo (lista de puntos en la imagen) con un color, por filas. */
function poligono(C: Lienzo, pts: P[], c: Color | ((x: number, y: number) => Color)) {
  const y0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.y)))), y1 = Math.min(H - 1, Math.ceil(Math.max(...pts.map((p) => p.y))));
  for (let y = y0; y <= y1; y++) {
    let xa = Infinity, xb = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((y < Math.min(a.y, b.y)) || (y > Math.max(a.y, b.y)) || a.y === b.y) continue;
      const x = a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x);
      xa = Math.min(xa, x); xb = Math.max(xb, x);
    }
    if (xa === Infinity) continue;
    for (let x = Math.max(0, Math.round(xa)); x <= Math.min(W - 1, Math.round(xb)); x++) C.p(x, y, typeof c === 'string' ? c : c(x, y));
  }
}
/** Un cuadrilátero de la cancha (x0..x1, d0..d1) a la altura z, en la imagen. */
const cuadro = (x0: number, d0: number, x1: number, d1: number, z = 0): P[] => [pant(x0, d0, z), pant(x1, d0, z), pant(x1, d1, z), pant(x0, d1, z)].map(([x, y]) => ({ x, y }));

// ---------------------------------------------------------------- el fondo

/** El cielo de la mañana: del celeste de arriba a la bruma del horizonte, tramado. */
function cielo(C: Lienzo) {
  const tonos: Color[] = ['cielo', 'celeste', 'bruma'];
  for (let y = 0; y < 100; y++) for (let x = 0; x < W; x++) {
    const t = (y / 100) * (tonos.length - 1), k = Math.floor(t), f = t - k;
    C.p(x, y, f > 0.5 && bayer(x, y) < (f - 0.5) * 2 && k + 1 < tonos.length ? tonos[k + 1] : tonos[k]);
  }
}

/**
 * La malla del club al fondo, detrás de la línea de ellos: los parales, el alambre en rombos (deja ver el pasto y los
 * pinos de atrás), el tubo de arriba y la lona verde con el letrero en el medio. Va de la fila `top` a la `base`.
 */
function mallaFondo(C: Lienzo, top: number, base: number) {
  malla(C, 0, top, W, base, 'asfalto_claro', 5);
  for (let x = 0; x < W; x++) { C.p(x, top - 1, 'asfalto'); C.p(x, top, 'cemento'); }
  for (let px = 20; px < W; px += 60) { C.f(px - 1, top - 2, 2, base - top + 2, 'asfalto'); C.vl(px - 1, top - 2, base - top + 2, 'cemento'); }
  // la lona con el letrero, centrada detrás de la cancha
  const t = 'SÂN QUẦN VỢT ĐÀ LẠT', w = anchoTexto(t, 1), x0 = Math.round(CX - w / 2) - 10, x1 = x0 + w + 20, y0 = top + 10, y1 = y0 + 14;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) C.p(x, y, y === y0 || y === y1 - 1 ? 'verde_oscuro' : (x + y) % 11 === 0 ? 'verde_oscuro' : 'verde');
  textoGrande(C, x0 + 10, y0 + 4, t, 'luz', 1);
}

/** El pasto alrededor, más oscuro y liso lejos, con agujas de pino caídas cerca. */
function pasto(C: Lienzo, y0: number, seed: number) {
  for (let y = y0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = (y - y0) / (H - y0), n = grain(x, y, seed);
    C.p(x, y, n < 0.03 + t * 0.03 ? 'ocre' : n > 0.95 ? 'menta' : bayer(x, y) < 0.2 + t * 0.35 ? 'verde' : 'verde_oscuro');
  }
}

// ---------------------------------------------------------------- la cancha

/** La arcilla con las rayas: el rectángulo de la cancha de dobles y la zona de afuera, en perspectiva. */
function canchaArcilla(C: Lienzo, seed: number) {
  // la arcilla de afuera, más oscura, y la de la cancha
  poligono(C, cuadro(-ANCHO / 2 - 72, -46, ANCHO / 2 + 72, LARGO + 46), (x, y) => (arcilla(x, Math.round(dEn(y) / 2), seed) === 'terracota' ? 'vino' : 'terracota'));
  poligono(C, cuadro(-ANCHO / 2 - 5, -5, ANCHO / 2 + 5, LARGO + 5), (x, y) => arcilla(x, Math.round(dEn(y) / 2), seed));
  // las marcas del rastrillo: arcos de polvo claro cada tanto, en profundidad
  for (let d = 12; d < LARGO; d += 16) poligono(C, cuadro(-ANCHO / 2, d, ANCHO / 2, d + 4), (x, y) => (bayer(x, y) < 0.3 ? 'ocre' : arcilla(x, Math.round(dEn(y) / 2), seed)));
  // las rayas blancas, con el polvo de arcilla encima
  const polvo = (x: number, y: number) => grain(x >> 1, y, seed + 7) < 0.08;
  const raya = (x0: number, d0: number, x1: number, d1: number, grueso: number) => {
    poligono(C, [pant(x0, d0), pant(x1, d1), pant(x1 + grueso, d1), pant(x0 + grueso, d0)].map(([x, y]) => ({ x, y })), (x, y) => (polvo(x, y) ? 'ocre' : 'luz'));
  };
  // las de fondo y de saque van de lado a lado (el grueso en d); las laterales y la del medio, en x
  for (const [d, g] of [[0, 3.2], [LARGO, 3.2], [RED_D - SAQUE, 2.4], [RED_D + SAQUE, 2.4]] as const) {
    const xa = d === 0 || d === LARGO ? -ANCHO / 2 : -ANCHO / 2 + 26, xb = d === 0 || d === LARGO ? ANCHO / 2 : ANCHO / 2 - 26;
    poligono(C, cuadro(xa, d - g / 2, xb, d + g / 2), (x, y) => (polvo(x, y) ? 'ocre' : 'luz'));
  }
  for (const x of [-ANCHO / 2, ANCHO / 2 - 1.8, -ANCHO / 2 + 26, ANCHO / 2 - 26 - 1.8]) raya(x, 0, x, LARGO, 1.8);
  raya(-0.9, RED_D - SAQUE, -0.9, RED_D + SAQUE, 1.8);
  // una deslizada en la arcilla de cada lado
  for (const [cx, cd] of [[-40, 60], [50, 330]] as const) { const [px, py, ps] = pant(cx, cd); for (let i = 0; i < 22 * ps; i++) { C.p(Math.round(px + i), Math.round(py + i / 11), 'ocre'); if (i % 3) C.p(Math.round(px + i), Math.round(py + 1 + i / 11), 'vino'); } }
}

// ---------------------------------------------------------------- lo que rodea la cancha

/**
 * Las vallas de publicidad entre la cancha y las gradas: una pared seguida de tableros parados que miran a la cancha,
 * cada uno con su color y su franja, los parales entre tablero y tablero, el canto de arriba y la sombra en el pasto.
 */
function vallas(C: Lienzo, lado: -1 | 1, seed: number) {
  const colores: [Color, Color][] = [['rojo', 'luz'], ['azul', 'amarillo'], ['amarillo', 'azul_noche'], ['verde', 'luz'], ['luz', 'rojo'], ['azul_noche', 'luz']];
  const xv = lado * (ANCHO / 2 + 58), alto = 22, n = 6, largo = 64, d0 = 8;
  const q = (pts: [number, number, number][]) => pts.map(([x, y]) => ({ x, y }));
  poligono(C, cuadro(xv, d0, xv - lado * 3, d0 + n * largo), (x, y) => (bayer(x, y) < 0.5 ? 'vino' : 'sombra'));
  for (let k = 0; k < n; k++) {
    const a = d0 + k * largo, b = a + largo, [fondo, franja] = colores[(k + (lado > 0 ? 3 : 0)) % colores.length];
    poligono(C, q([pant(xv, a), pant(xv, b), pant(xv, b, alto), pant(xv, a, alto)]), fondo);
    poligono(C, q([pant(xv, a + 8), pant(xv, b - 8), pant(xv, b - 8, 14), pant(xv, a + 8, 9)]), franja);
    void grain(k, lado, seed);
  }
  // el canto de arriba, el borde de abajo y los parales
  poligono(C, q([pant(xv, d0, alto), pant(xv, d0 + n * largo, alto), pant(xv + lado * 2, d0 + n * largo, alto + 1), pant(xv + lado * 2, d0, alto + 1)]), 'asfalto');
  poligono(C, q([pant(xv, d0), pant(xv, d0 + n * largo), pant(xv, d0 + n * largo, 1.5), pant(xv, d0, 1.5)]), 'luz');
  for (let k = 0; k <= n; k++) { const [px, py, ps] = pant(xv, d0 + k * largo); C.f(Math.round(px) - 1, Math.round(py - (alto + 2) * ps), 2, Math.round((alto + 2) * ps), 'asfalto'); }
}

/** Las gradas de tres escalones a un costado, que suben alejándose de la cancha, con la gente abrigada sentada. */
function gradas(C: Lienzo, lado: -1 | 1, seed: number) {
  const R = rng(seed + lado), xg = lado * (ANCHO / 2 + 100);
  const ropa: Color[] = ['rojo', 'azul', 'amarillo', 'luz', 'verde', 'salmon', 'celeste', 'crema'];
  // el lateral del fondo va primero: los escalones lo tapan casi entero y solo asoma lo que sube sobre ellos
  poligono(C, [pant(xg, 382), pant(xg + lado * 66, 382), pant(xg + lado * 66, 382, 30), pant(xg, 382, 8)].map(([x, y]) => ({ x, y })), 'asfalto');
  for (let k = 2; k >= 0; k--) {
    const x0 = xg + lado * k * 22, x1 = x0 + lado * 22, z = 8 + k * 11;
    poligono(C, cuadro(x0, 20, x1, 380, z), k % 2 ? 'cemento' : 'cemento_claro');
    poligono(C, [pant(x0, 20, z), pant(x0, 380, z), pant(x0, 380, z - 11), pant(x0, 20, z - 11)].map(([x, y]) => ({ x, y })), 'asfalto_claro');
    for (let d = 30; d < 374; d += 15) {
      if (R() < 0.15) continue;
      const [px, py, ps] = pant(x0 + lado * 11, d, z);
      const alto = Math.max(9, Math.round(19 * ps));
      sentadita(C, Math.round(px - 4), Math.round(py), { ropa: ropa[Math.floor(R() * ropa.length)], pant: R() < 0.5 ? 'azul_noche' : 'sombra', pelo: R() < 0.7 ? 'tinta' : 'ocre', piel: R() < 0.6 ? 'salmon' : 'ocre', alto, sombrero: R() < 0.25 ? 'crema' : undefined }, R() < 0.2);
    }
  }
  // el lateral de adelante, de concreto, con su borde claro
  poligono(C, [pant(xg, 18), pant(xg + lado * 66, 18), pant(xg + lado * 66, 18, 30), pant(xg, 18, 8)].map(([x, y]) => ({ x, y })), 'asfalto');
  poligono(C, [pant(xg, 18, 8), pant(xg + lado * 66, 18, 30), pant(xg + lado * 66, 18, 31.5), pant(xg, 18, 9.5)].map(([x, y]) => ({ x, y })), 'asfalto_claro');
}

/** Una maceta de barro con hortensias, a su profundidad: el trapecio de la maceta con su borde y las flores encima. */
function maceta(C: Lienzo, x: number, d: number, flor: [Color, Color], seed: number) {
  const [px, py, s] = pant(x, d), w = Math.round(20 * s), h = Math.max(4, Math.round(9 * s)), X = Math.round(px), piso = Math.round(py);
  sombraOval(C, px, piso, w / 2 + 2, 2, 'verde_oscuro', 0.5);
  for (let j = 0; j < h; j++) { const ww = w - Math.round((j / h) * 4); C.hl(X - Math.round(ww / 2), piso - h + j, ww, j === 0 ? 'ocre' : j === 1 ? 'salmon' : 'terracota'); C.p(X - Math.round(ww / 2), piso - h + j, 'vino'); }
  hortensias(C, X - Math.round(w / 2) + 1, piso - h - 1, Math.max(6, w - 2), flor, seed);
}

/** La silla del juez de silla a la derecha de la red: la escalera, el asiento alto con la sombrilla y el juez con gorra. */
function sillaJuez(C: Lienzo) {
  const [px, py, s] = pant(ANCHO / 2 + 46, RED_D), x = Math.round(px - 6 * s), base = Math.round(py), top = base - Math.round(44 * s), w = Math.round(13 * s);
  sombraOval(C, px, base, 10 * s + 3, 2, 'vino', 0.4);
  for (const q of [x, x + w]) { C.vl(q, top, base - top, 'luz'); C.vl(q + 1, top, base - top, 'cemento_claro'); }
  for (let y = top + 6; y < base; y += Math.max(4, Math.round(6 * s))) C.hl(x, y, w + 1, 'cemento_claro');
  C.f(x - 1, top - 3, w + 3, 3, 'verde'); C.hl(x - 1, top - 3, w + 3, 'menta');
  sentadita(C, x + Math.round(2 * s), top - 3, { ropa: 'crema', pant: 'azul_noche', pelo: 'tinta', piel: 'salmon', sombrero: 'luz', alto: Math.round(18 * s) });
  C.f(x - 4, top - Math.round(26 * s), w + 9, 2, 'verde'); C.vl(x + Math.round(w / 2), top - Math.round(24 * s), Math.round(6 * s), 'asfalto_claro');
}

/** La banca de los jugadores a la izquierda: tablas verdes, dos que esperan, el bolso de las raquetas, la toalla y el termo. */
function banca(C: Lienzo, d: number, f: number) {
  const [px, py, s] = pant(-ANCHO / 2 - 46, d), w = Math.round(48 * s), x0 = Math.round(px - w / 2), asiento = Math.round(py - 10 * s), piso = Math.round(py);
  sombraOval(C, px, piso, w / 2 + 2, 2, 'vino', 0.4);
  C.f(x0, asiento, w, 3, 'verde'); C.hl(x0, asiento, w, 'menta'); C.hl(x0, asiento + 3, w, 'verde_oscuro');
  for (const q of [x0 + 3, x0 + w - 6]) C.f(q, asiento + 3, 3, piso - asiento - 3, 'asfalto');
  sentadita(C, x0 + Math.round(6 * s), asiento, { ropa: 'luz', pant: 'luz', pelo: 'tinta', piel: 'salmon', alto: Math.round(20 * s) }, f % 2 === 1);
  sentadita(C, x0 + Math.round(20 * s), asiento, { ropa: 'azul', pant: 'luz', pelo: 'sombra', piel: 'ocre', alto: Math.round(20 * s), sombrero: 'luz' }, f % 2 === 0);
  C.f(x0 + Math.round(32 * s), asiento - 5, Math.round(14 * s), 5, 'rojo'); C.hl(x0 + Math.round(32 * s), asiento - 5, Math.round(14 * s), 'salmon');
  C.f(x0 - 2, asiento - 1, 5, 7, 'crema');
}

/** Un farol de hierro de los viejos de Đà Lạt, a su profundidad. */
function farol(C: Lienzo, x: number, d: number) {
  const [px, py, s] = pant(x, d), X = Math.round(px), piso = Math.round(py), top = piso - Math.round(66 * s);
  C.f(X - 3, piso - 5, 7, 5, 'sombra'); C.hl(X - 3, piso - 5, 7, 'asfalto');
  C.f(X - 1, top + 7, 3, piso - top - 12, 'sombra'); C.vl(X - 1, top + 7, piso - top - 12, 'asfalto');
  C.f(X - 4, top + 5, 9, 2, 'sombra');
  C.f(X - 3, top - 4, 7, 9, 'crema'); C.vl(X, top - 4, 9, 'asfalto'); C.vl(X - 3, top - 4, 9, 'sombra'); C.vl(X + 3, top - 4, 9, 'sombra'); C.p(X - 2, top - 2, 'luz');
  for (let j = 0; j < 4; j++) C.hl(X - 4 + j, top - 5 - j, 9 - 2 * j, 'sombra');
}

/** Los pinos de Đà Lạt a los costados, detrás de las gradas, del tamaño que les toca por la distancia. */
function pinos(C: Lienzo, seed: number) {
  const lista: [number, number, number, boolean][] = [
    [-ANCHO / 2 - 232, 80, 190, false], [-ANCHO / 2 - 225, 205, 160, false], [-ANCHO / 2 - 245, 335, 150, true], [-ANCHO / 2 - 300, 150, 170, true],
    [ANCHO / 2 + 232, 70, 190, false], [ANCHO / 2 + 228, 195, 160, false], [ANCHO / 2 + 245, 330, 150, true], [ANCHO / 2 + 300, 150, 170, true],
  ];
  // de atrás hacia adelante, para que los de cerca tapen a los de lejos
  for (const [x, d, alto, lejos] of lista.sort((a, b) => b[1] - a[1])) {
    const [px, py, s] = pant(x, d);
    if (px < -30 || px > W + 30) continue;
    pino(C, { x: Math.round(px), w: Math.max(3, Math.round(11 * s)), base: Math.round(py), top: Math.round(py - alto * s), lejos }, seed + Math.round(px));
  }
}

/** Los recogepelotas, uno en cada esquina del fondo, agachados con las manos en las rodillas. */
function recogepelotas(C: Lienzo) {
  for (const lado of [-1, 1]) {
    const [px, py, s] = pant(lado * (ANCHO / 2 + 30), LARGO + 18);
    personita(C, Math.round(px - 4), Math.round(py), { ropa: 'rojo', pant: 'sombra', pelo: 'tinta', piel: 'salmon', alto: Math.max(10, Math.round(22 * s)), pose: 3 });
  }
}

// ---------------------------------------------------------------- las piezas

/** El fondo entero: todo lo quieto de la cancha vista desde atrás. */
export function fondoTenis(seed = 7): UiPiece {
  const C = new Lienzo(W, H, VIETNAM_DALAT_MANANA);
  cielo(C);
  // lo lejos: las lomas con la catedral y la villa, y el lago, con el agua en la fila 84
  const lejos = lagoXuanHuong(VIETNAM_DALAT_MANANA, W, 170, seed);
  C.paste(lejos, 0, 84 - 128);
  // la orilla de este lado del lago: los pinos de la neblina detrás de la malla del club
  for (let x = 6; x < W; x += 34 + Math.floor(grain(x, 1, seed) * 22)) pino(C, { x, w: 3, base: 112, top: 112 - 40 - Math.floor(grain(x, 2, seed) * 22), lejos: true }, seed + x);
  // el pasto desde la base de la malla hasta abajo, y la malla del club
  pasto(C, 108, seed);
  mallaFondo(C, 70, 112);
  // la cancha, con la arcilla de afuera
  canchaArcilla(C, seed);
  // las gradas y las vallas a los dos lados, las macetas entre ellas
  for (const lado of [-1, 1] as const) { gradas(C, lado, seed); vallas(C, lado, seed); }
  const flores: [Color, Color][] = [['azul', 'celeste'], ['salmon', 'crema'], ['celeste', 'luz']];
  for (const lado of [-1, 1]) for (let k = 4; k >= 0; k--) maceta(C, lado * (ANCHO / 2 + 80), 46 + k * 76, flores[(k + (lado > 0 ? 1 : 0)) % 3], seed + k * 3 + lado);
  // los pinos detrás de las gradas, los faroles en las esquinas, la silla del juez, las bancas y los recogepelotas
  pinos(C, seed);
  for (const [x, d] of [[-ANCHO / 2 - 82, 8], [ANCHO / 2 + 82, 8], [-ANCHO / 2 - 82, 392], [ANCHO / 2 + 82, 392]]) farol(C, x, d);
  recogepelotas(C);
  sillaJuez(C);
  banca(C, RED_D - 62, 0); banca(C, RED_D + 62, 1);
  return {
    name: 'tenis_fondo', frames: [C.r], w: W, h: H,
    extra: {
      cancha: ESQUINAS, red: RED, proyeccion: { d0: D0, cx: CX, kx: KX, ky: KY, hor: HOR },
      nota: 'La cancha vista desde atrás de tu equipo, para el Tenis en vertical. Va en (-80, 0) con el cuadro de 640 centrado. `cancha` son las 4 esquinas de la cancha de dobles en la imagen (tu fondo izquierda y derecha, el de ellos derecha e izquierda). La red va aparte en `tenis_red`, en la fila `red.fila`, encima de los de atrás y debajo de los de adelante.',
    },
  };
}

/** La red sola, transparente: la malla entre los dos palos, con la cinta blanca arriba y su sombra en la arcilla. */
export function redTenis(): UiPiece {
  const C = new Lienzo(W, H, VIETNAM_DALAT_MANANA);
  const { fila, x0, x1, alto } = RED;
  malla(C, x0, fila - alto, x1, fila, 'sombra', 3);
  for (let x = x0; x <= x1; x += 2) C.p(x, fila - alto, 'luz');
  C.hl(x0, fila - alto + 1, x1 - x0 + 1, 'cemento_claro');
  for (const px of [x0 - 1, x1 - 1]) { C.f(px - 1, fila - alto - 4, 4, alto + 4, 'asfalto'); C.vl(px - 1, fila - alto - 4, alto + 4, 'cemento'); C.hl(px - 2, fila - alto - 5, 6, 'asfalto'); }
  for (let x = x0; x <= x1; x++) if ((x + fila) & 1) C.p(x, fila + 1, 'vino');
  return { name: 'tenis_red', frames: [C.r], w: W, h: H, extra: { fila, x0, x1, alto, nota: 'Encima de los jugadores del fondo y debajo de los de adelante: su profundidad es la fila `fila`.' } };
}

export function piezasTenis(): UiPiece[] { return [fondoTenis(), redTenis()]; }
