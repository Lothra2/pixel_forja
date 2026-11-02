import type { Raster } from '../core/raster';
import { rng } from '../core/rng';
import {
  lamina, mascara, rellenar, trazo, disco, polilinea, desenfocar, desenfocada, pintar, brillo, degradado, halo, aRaster, vineta, grano, hex,
  pintarTex, rayosDeLuz, mezcla, sat, suave, fbm, hash2, rayo,
  type Lamina, type Mascara, type C3, type P2,
} from './cine';
import { perfil, arbolMuerto, pino, cuervo, ahorcado, horca, empalado, encapuchado, suplicante, ruina, aguja, nubes, girar } from './siluetas';

/**
 * Las siete cartas de presentación de los actos de Réquiem de Ceniza: una ilustración de 1280 x 720 por acto, oscura
 * y de luz de cine, con el tema de cada uno (ver juego/src/mundo/actos.ts y actos67.ts). Cada carta deja libre una
 * franja arriba para el título y otra abajo, más oscura, para la narración: el juego escribe los textos encima
 * (ZONAS_CARTA). Hay sangre donde el acto la pide.
 *
 *   1 Velmora: páramo con lluvia, la horca en la loma con sus ahorcados, cabezas en picas y la abadía roja lejos.
 *   2 Sahrim: sol de sangre, el rey colosal medio enterrado con su tumba abierta y el camino de los empalados.
 *   3 Yhuantl: la pirámide escalonada en la niebla, sangre que baja por su escalinata y el río rojo.
 *   4 Hrimgard: picos helados con aurora, el trono del rey de escarcha, cuerpos atrapados en columnas de hielo.
 *   5 La Herida: el cielo abierto como una boca, ríos de lava, el Bastión del Último Coro y los empalados.
 *   6 Ysmeral: la catedral ahogada que sale del mar con luz verde, el mástil roto, costillas de ballena y ahogados.
 *   7 La Corona: el cielo roto como vidrio, la escalera de oro con estatuas de los que subieron y el trono sediento.
 */

export const W_CARTA = 1280, H_CARTA = 720;
/** Dónde escribe el juego: el título arriba y la narración abajo (pixeles de la carta). */
export const ZONAS_CARTA = { titulo: { x: 240, y: 52, w: 800, h: 132 }, narracion: { x: 160, y: 548, w: 960, h: 144 } };

export interface Acto { n: number; id: string; es: string; en: string; tema: string; luz: string }
export const ACTOS_CARTA: Acto[] = [
  { n: 1, id: 'velmora', es: 'El Valle de Velmora', en: 'The Vale of Velmora', tema: 'páramo, horcas y la abadía de Santa Oria', luz: '#d8c7a8' },
  { n: 2, id: 'sahrim', es: 'Las Arenas de Sahrim', en: 'The Sands of Sahrim', tema: 'desierto, reyes que duermen y tumbas', luz: '#f0c27a' },
  { n: 3, id: 'yhuantl', es: 'La Selva de Yhuantl', en: 'The Jungle of Yhuantl', tema: 'selva que respira, templo y río que sangra', luz: '#b8e0c8' },
  { n: 4, id: 'hrimgard', es: 'Los Picos de Hrimgard', en: 'The Peaks of Hrimgard', tema: 'nieve, hielo y el rey que juró no levantarse', luz: '#cfe6ff' },
  { n: 5, id: 'herida', es: 'La Herida', en: 'The Wound', tema: 'el cielo abierto, lava y el Último Coro', luz: '#ffb070' },
  { n: 6, id: 'ysmeral', es: 'Ysmeral, la Ciudad Ahogada', en: 'Ysmeral, the Drowned City', tema: 'mar, campanas y naufragios', luz: '#b0e8d8' },
  { n: 7, id: 'corona', es: 'La Corona del Dios Sediento', en: 'The Crown of the Thirsting God', tema: 'el cielo roto, oro y sed', luz: '#ffe2a0' },
];

// ------------------------------------------------------------------ herramientas de la carta
const W = W_CARTA, H = H_CARTA;
const M = () => mascara(W, H);
/** Borde iluminado: lo que queda de la silueta al correrla (dx, dy) hacia la luz. */
function contraluz(L: Lamina, m: Mascara, dx: number, dy: number, c: C3, k = 1, peso?: (x: number, y: number) => number) {
  const b = M();
  for (let y = Math.max(0, -dy); y < Math.min(H, H - dy); y++) for (let x = Math.max(0, -dx); x < Math.min(W, W - dx); x++) {
    const i = y * W + x, v = m.d[i] - m.d[i + dy * W + dx]; if (v > 0) b.d[i] = v * (peso ? peso(x, y) : 1);
  }
  desenfocar(b.d, W, H, 1);
  pintar(L, b, c, k, 'luz');
}
/** Banda de niebla con ruido entre y0 e y1. */
function niebla(L: Lamina, y0: number, y1: number, c: C3, k: number, s: number, esc = 160) {
  const m = M();
  for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = 0; x < W; x++) {
    const env = suave(y0, y0 + (y1 - y0) * 0.4, y) * (1 - suave(y0 + (y1 - y0) * 0.6, y1, y));
    m.d[y * W + x] = sat((fbm(x / esc, y / (esc * 0.3), 5, s) - 0.35) * 2) * env;
  }
  pintar(L, m, c, k);
}
/** Lluvia en diagonal (trazos finos claros). */
function lluvia(L: Lamina, n: number, ang: number, c: C3, k: number, s: number) {
  const m = M(), r = rng(s);
  for (let i = 0; i < n; i++) { const x = r() * (W + 200) - 100, y = r() * H, l = 14 + r() * 26; trazo(m, x, y, x + Math.sin(ang) * l, y + Math.cos(ang) * l, 1, 1, 0.3 + r() * 0.7, 'max', false); }
  pintar(L, m, c, k, 'luz');
}
/** Copos o motas que caen (nieve, ceniza, polvo de oro), con algunas desenfocadas cerca de la cámara. */
function motas(L: Lamina, n: number, c: C3, k: number, s: number, tam = 1.6, conLuz = true) {
  const m = M(), cerca = M(), r = rng(s);
  for (let i = 0; i < n; i++) { const x = r() * W, y = r() * H, t = r(); if (t > 0.93) disco(cerca, x, y, tam * (3 + r() * 3), 0.5); else disco(m, x, y, tam * (0.5 + t), 0.5 + r() * 0.5); }
  desenfocar(cerca.d, W, H, 4);
  pintar(L, m, c, k, conLuz ? 'luz' : 'normal'); pintar(L, cerca, c, k * 0.8, conLuz ? 'luz' : 'normal');
}
/** Reflejo en el agua desde la línea y0 hacia abajo, con ondas y el color del agua. */
function reflejo(L: Lamina, y0: number, agua: C3, k: number, s: number, x0 = 0, x1 = W, mas?: Mascara) {
  const src = new Float32Array(L.d);
  for (let y = y0; y < H; y++) for (let x = x0; x < x1; x++) {
    const i = y * W + x; if (mas && mas.d[i] <= 0) continue;
    const prof = (y - y0) / (H - y0), onda = (fbm(x / 60, y / 6, 3, s) - 0.5) * (6 + prof * 26);
    const sy = Math.round(y0 - (y - y0) * 0.9 - 1), sx = Math.round(x + onda);
    if (sy < 0 || sx < 0 || sx >= W) continue;
    const j = i * 4, q = (sy * W + sx) * 4, a = (mas ? mas.d[i] : 1), kk = k * (1 - prof * 0.6);
    const c: C3 = [src[q] * kk + agua[0] * (1 - kk), src[q + 1] * kk + agua[1] * (1 - kk), src[q + 2] * kk + agua[2] * (1 - kk)];
    // reflejos de la luz en las crestas
    const cresta = suave(0.62, 0.72, fbm(x / 40, y / 3.5, 3, s + 7)) * 0.4;
    L.d[j] = L.d[j] * (1 - a) + (c[0] + src[q] * cresta) * a; L.d[j + 1] = L.d[j + 1] * (1 - a) + (c[1] + src[q + 1] * cresta) * a; L.d[j + 2] = L.d[j + 2] * (1 - a) + (c[2] + src[q + 2] * cresta) * a;
  }
}
/** Sangre que chorrea: hilos que bajan desde (x, y) con gotas, en una máscara. */
function chorreado(m: Mascara, x: number, y: number, ancho: number, largo: number, s: number) {
  const r = rng(s);
  for (let k = 0; k < Math.max(2, ancho / 4); k++) {
    const cx = x + (r() - 0.5) * ancho, l = largo * (0.3 + r() * 0.7), g = 1.2 + r() * 2.2;
    trazo(m, cx, y, cx + (r() - 0.5) * 3, y + l, g, g * 0.7, 1, 'max', true);
    disco(m, cx, y + l + g, g * 1.1);
  }
}
/** Terminación común: franjas para el texto (arriba un poco, abajo bastante), viñeta y grano. */
function terminar(L: Lamina, s: number) {
  const z = ZONAS_CARTA;
  for (let y = 0; y < H; y++) {
    const arriba = 0.3 * (1 - suave(z.titulo.y + z.titulo.h * 0.4, z.titulo.y + z.titulo.h + 60, y));
    const abajo = 0.62 * suave(z.narracion.y - 40, z.narracion.y + 80, y);
    const f = 1 - Math.max(arriba, abajo);
    for (let x = 0; x < W; x++) { const j = (y * W + x) * 4; L.d[j] *= f; L.d[j + 1] *= f; L.d[j + 2] *= f; }
  }
  vineta(L, 0.65);
  grano(L, 0.03, s);
}

// ------------------------------------------------------------------ acto 1: Velmora
function acto1(L: Lamina) {
  degradado(L, [[0, hex('#05070b')], [0.35, hex('#101722')], [0.58, hex('#2a2a32')], [0.64, hex('#5a3226')], [0.68, hex('#1c1716')], [1, hex('#060506')]]);
  halo(L, 1010, 450, 380, [0.6, 0.12, 0.05], 0.5, 0.45);
  nubes(L, { y0: -30, y1: 430, seed: 101, escala: 200, cubre: 0.6, masa: [0.04, 0.05, 0.065], panza: [0.45, 0.16, 0.1], filo: [0.22, 0.25, 0.32], luzX: (x) => 0.2 + Math.exp(-(((x - 1010) / 260) ** 2)) * 1.2 });
  // lomas lejanas con la abadía de Santa Oria y sus vitrales rojos
  const lejos = M(), vit = M();
  rellenar(lejos, perfil(W, H, 462, 18, 11, { escala: 300 }));
  rellenar(lejos, [[930, 470], [930, 400], [1090, 400], [1090, 470]]);
  aguja(lejos, 955, 404, 26, 130); aguja(lejos, 1010, 404, 26, 110); aguja(lejos, 1070, 404, 18, 70);
  for (const [x, y] of [[955, 380], [1010, 390], [960, 430], [1000, 430], [1040, 430], [1065, 425]]) rellenar(vit, [[x - 2, y + 8], [x - 2, y], [x, y - 3], [x + 2, y], [x + 2, y + 8]]);
  pintar(L, lejos, [0.07, 0.075, 0.09]);
  brillo(L, vit, [1, 0.25, 0.08], 1.4); brillo(L, desenfocada(vit, 6), [1, 0.2, 0.05], 2);
  niebla(L, 430, 540, [0.2, 0.2, 0.24], 0.5, 12);
  // la loma de la horca, recortada contra el resplandor
  const loma = M();
  rellenar(loma, perfil(W, H, 560, 18, 13, { escala: 240 }).map(([x, y]) => [x, y - 70 * Math.exp(-(((x - 790) / 230) ** 2))] as P2));
  const cuelga = horca(loma, 760, 494, 210, 1);
  ahorcado(loma, cuelga[0], cuelga[1], 18, 96, 0.4);
  ahorcado(loma, cuelga[0] - 50, cuelga[1] + 2, 24, 90, -0.6);
  cuervo(loma, 760, 494 - 210 - 8, 7, 1); cuervo(loma, 800, 494 - 208, 6, -1);
  // cabezas en picas al pie de la loma (con su chorreado)
  const sangre = M(), picas = M();
  for (const [x, alto] of [[600, 110], [640, 130], [905, 120], [950, 96]] as [number, number][]) {
    const y = 528 + (x > 800 ? -6 : 0);
    trazo(picas, x, y, x + (hash2(x, 1) - 0.5) * 8, y - alto, 4, 2.4, 1, 'max', false);
    disco(loma, x + (hash2(x, 1) - 0.5) * 8, y - alto - 8, 8);
    rellenar(loma, [[x - 6 + (hash2(x, 1) - 0.5) * 8, y - alto - 6], [x + 6 + (hash2(x, 1) - 0.5) * 8, y - alto - 6], [x + 3 + (hash2(x, 1) - 0.5) * 8, y - alto + 3], [x - 3 + (hash2(x, 1) - 0.5) * 8, y - alto + 3]]);
    chorreado(sangre, x + (hash2(x, 1) - 0.5) * 8, y - alto + 2, 6, 26, x);
  }
  pintar(L, loma, [0.03, 0.03, 0.035]);
  contraluz(L, loma, 3, 2, [0.55, 0.22, 0.14], 0.45);
  pintar(L, picas, [0.025, 0.022, 0.025]);
  pintar(L, sangre, [0.25, 0.01, 0.01], 0.9);
  // el Bosque de los Ahorcados a la izquierda
  const bosque = M();
  arbolMuerto(bosque, 130, 720, 640, 41, { inclina: 0.1, grosor: 0.075 });
  arbolMuerto(bosque, 300, 690, 400, 43, { inclina: -0.12 });
  ahorcado(bosque, 205, 296, 40, 84, 0.3);
  rellenar(bosque, perfil(W, H, 650, 20, 15, { escala: 200 }).map(([x, y]) => [x, y - 92 * Math.exp(-(((x - 470) / 170) ** 2)) + 40 * sat((x - 600) / 600)] as P2));
  // el héroe camina hacia la horca
  encapuchado(bosque, 474, 566, 112, { arma: 'espada', capa: 0.35 });
  pintar(L, bosque, [0.012, 0.013, 0.016]);
  contraluz(L, bosque, 2, 1, [0.35, 0.38, 0.46], 0.25);
  lluvia(L, 1400, 0.22, [0.5, 0.55, 0.65], 0.22, 17);
  niebla(L, 600, 720, [0.1, 0.1, 0.12], 0.4, 19, 220);
}

// ------------------------------------------------------------------ acto 2: Sahrim
function acto2(L: Lamina) {
  degradado(L, [[0, hex('#120304')], [0.3, hex('#3e0b08')], [0.52, hex('#a3330f')], [0.62, hex('#e0701e')], [0.66, hex('#7a250e')], [1, hex('#150607')]]);
  const sx = 900, sy = 452;
  halo(L, sx, 440, 520, [1, 0.45, 0.12], 0.8, 0.5);
  // el sol de sangre, partido por el horizonte
  const sol = M(); disco(sol, sx, sy, 140); for (let y = 470; y < H; y++) for (let x = 0; x < W; x++) sol.d[y * W + x] = 0;
  pintar(L, sol, [1, 0.62, 0.3]); halo(L, sx, sy, 250, [1, 0.5, 0.15], 0.9);
  // franjas finas de nubes cruzando el sol
  nubes(L, { y0: 140, y1: 470, seed: 202, escala: 110, cubre: 0.38, estira: 7, masa: [0.2, 0.05, 0.04], panza: [1, 0.45, 0.15], filo: [0.4, 0.15, 0.08], luzX: (x) => 0.4 + Math.exp(-(((x - sx) / 300) ** 2)), alfa: 0.85 });
  // dunas lejanas en bruma
  const d1 = M(); rellenar(d1, perfil(W, H, 476, 14, 21, { escala: 320 })); pintar(L, d1, [0.42, 0.13, 0.07]);
  // el rey colosal enterrado hasta el mentón: tocado a rayas que cae a los hombros, cara de piedra rota, ojos con brasa
  const rey = M(), cara = M(), rayas = M(), sombraR = M(), ojos = M(), cx = 430, base = 540;
  rellenar(rey, [[cx - 200, base], [cx - 175, base - 90], [cx - 118, base - 170], [cx - 112, base - 290], [cx - 90, base - 350], [cx - 40, base - 380], [cx + 40, base - 380], [cx + 90, base - 350], [cx + 112, base - 290], [cx + 118, base - 170], [cx + 175, base - 90], [cx + 200, base]]);
  rellenar(rey, [[cx + 34, base - 392], [cx + 124, base - 330], [cx + 118, base - 276], [cx + 76, base - 318], [cx + 30, base - 350]], 1, 'restar');
  rellenar(cara, [[cx - 72, base - 300], [cx + 72, base - 300], [cx + 76, base - 210], [cx + 60, base - 140], [cx + 30, base - 112], [cx - 30, base - 112], [cx - 60, base - 140], [cx - 76, base - 210]]);
  rellenar(cara, [[cx - 22, base - 116], [cx + 22, base - 116], [cx + 18, base], [cx - 18, base]]);
  for (let y = base - 380; y < base; y += 16) rellenar(rayas, [[cx - 210, y], [cx + 210, y], [cx + 210, y + 7], [cx - 210, y + 7]]);
  for (let i = 0; i < W * H; i++) rayas.d[i] *= rey.d[i] * (1 - cara.d[i]);
  pintarTex(L, rey, [0.17, 0.065, 0.045], 0.35, 24, 211);
  pintar(L, rayas, [0.06, 0.02, 0.02], 0.6);
  pintarTex(L, cara, [0.32, 0.14, 0.085], 0.3, 18, 212);
  // modelado: cejas y cuencas, la nariz con su lado en sombra, la boca, la mejilla de la izquierda
  rellenar(sombraR, [[cx - 64, base - 258], [cx - 8, base - 250], [cx - 10, base - 236], [cx - 62, base - 240]]);
  rellenar(sombraR, [[cx + 64, base - 258], [cx + 8, base - 250], [cx + 10, base - 236], [cx + 62, base - 240]]);
  rellenar(sombraR, [[cx - 6, base - 236], [cx - 18, base - 174], [cx - 2, base - 170]]);
  rellenar(sombraR, [[cx - 26, base - 150], [cx + 26, base - 150], [cx + 22, base - 143], [cx - 22, base - 143]]);
  rellenar(sombraR, [[cx - 76, base - 210], [cx - 60, base - 140], [cx - 30, base - 112], [cx - 42, base - 205]]);
  rellenar(sombraR, [[cx - 22, base - 116], [cx - 4, base - 116], [cx - 6, base], [cx - 18, base]]);
  pintar(L, sombraR, [0.06, 0.02, 0.02], 0.85);
  for (const s2 of [-1, 1]) rellenar(ojos, [[cx + s2 * 34 - 14, base - 230], [cx + s2 * 34 + 14, base - 232], [cx + s2 * 34 + 10, base - 221], [cx + s2 * 34 - 10, base - 221]]);
  const cobra = M(); rellenar(cobra, [[cx - 8, base - 298], [cx - 3, base - 328], [cx + 4, base - 334], [cx + 8, base - 298]]); pintar(L, cobra, [0.38, 0.17, 0.07]);
  const grieta = M(); polilinea(grieta, [[cx + 32, base - 350], [cx + 20, base - 300], [cx + 34, base - 250], [cx + 14, base - 190], [cx + 30, base - 120], [cx + 20, base - 40]], 3, 1.5);
  pintar(L, grieta, [0.04, 0.01, 0.01]);
  contraluz(L, rey, 3, 0, [1, 0.5, 0.18], 1);
  // lágrimas de sangre de los ojos
  const lagrima = M(); for (const s2 of [-1, 1]) chorreado(lagrima, cx + s2 * 34, base - 222, 10, 60, 7 + s2);
  pintar(L, lagrima, [0.3, 0.02, 0.01], 0.9);
  brillo(L, ojos, [1, 0.3, 0.05], 1.6); brillo(L, desenfocada(ojos, 9), [1, 0.2, 0.05], 2.6);
  // la tumba abierta en la duna, al pie del rey, con luz adentro
  const tx = cx + 230, ty = base + 22;
  const puerta = M(); rellenar(puerta, [[tx - 26, ty + 8], [tx - 20, ty - 46], [tx, ty - 60], [tx + 20, ty - 46], [tx + 26, ty + 8]]);
  const marco = M(); rellenar(marco, [[tx - 40, ty + 8], [tx - 34, ty - 56], [tx, ty - 78], [tx + 34, ty - 56], [tx + 40, ty + 8]]);
  pintarTex(L, marco, [0.12, 0.045, 0.035], 0.3, 10, 213); contraluz(L, marco, 3, 0, [1, 0.5, 0.2], 0.8);
  pintar(L, puerta, [0.7, 0.22, 0.05]); halo(L, tx, ty - 10, 100, [1, 0.35, 0.08], 0.9, 0.7);
  // buitres
  const aves = M(), r = rng(29);
  for (let i = 0; i < 9; i++) { const x = 560 + r() * 380, y = 200 + r() * 140, t = 6 + r() * 7; polilinea(aves, [[x - t, y - t * 0.3], [x - t * 0.4, y], [x, y - t * 0.15], [x + t * 0.4, y], [x + t, y - t * 0.3]], 2, 1.2); }
  pintar(L, aves, [0.06, 0.02, 0.02]);
  // dunas cercanas con filo encendido y el camino de los empalados hacia la tumba
  const d2 = M(); rellenar(d2, perfil(W, H, 560, 34, 23, { escala: 260 }).map(([x, y]) => [x, y + 26 * Math.exp(-(((x - cx) / 160) ** 2))] as P2));
  const cam = M(), sangre = M();
  for (let k = 0; k < 9; k++) {
    const t = k / 8, x = 1130 - t * 450 + Math.sin(t * 3) * 40, y = 724 - t * 150, alto = 330 * (1 - t) ** 1.25 + 40;
    empalado(cam, x, y + 6, alto, 300 + k, (hash2(k, 3) - 0.5) * 0.25);
    if (k < 6) chorreado(sangre, x + (hash2(k, 3) - 0.5) * 0.25 * alto * 0.7, y - alto * 0.3, 12 * (1 - t), alto * 0.22, k);
  }
  pintarTex(L, d2, [0.1, 0.035, 0.04], 0.25, 60, 214);
  contraluz(L, d2, 2, 3, [0.9, 0.35, 0.1], 0.9);
  pintar(L, cam, [0.03, 0.01, 0.012]);
  contraluz(L, cam, 2, 0, [0.9, 0.3, 0.08], 0.6);
  pintar(L, sangre, [0.32, 0.02, 0.01], 0.85);
  // un cráneo en la arena de adelante
  const hueso = M(); disco(hueso, 170, 676, 20); rellenar(hueso, [[156, 684], [184, 684], [180, 700], [160, 700]]); disco(hueso, 162, 676, 5, 1, 'restar'); disco(hueso, 178, 676, 5, 1, 'restar');
  trazo(hueso, 120, 700, 230, 694, 5, 4);
  pintar(L, hueso, [0.32, 0.2, 0.15]);
  rayosDeLuz(L, sx, sy, 0.55, 0.5);
  motas(L, 500, [0.9, 0.5, 0.25], 0.18, 31, 1.1);
}

// ------------------------------------------------------------------ acto 3: Yhuantl
function acto3(L: Lamina) {
  degradado(L, [[0, hex('#020807')], [0.35, hex('#08201c')], [0.6, hex('#1b3a32')], [0.68, hex('#0c1a17')], [1, hex('#030606')]]);
  halo(L, 420, 130, 360, [0.4, 0.7, 0.55], 0.5);
  nubes(L, { y0: -20, y1: 320, seed: 303, escala: 180, cubre: 0.5, masa: [0.02, 0.05, 0.045], panza: [0.15, 0.3, 0.25], filo: [0.3, 0.5, 0.42], luzX: (x) => 0.3 + Math.exp(-(((x - 420) / 300) ** 2)) });
  // la pirámide escalonada con el templo arriba
  const pir = M(), luzT = M(), cx = 700, base = 500;
  for (let k = 0; k < 7; k++) { const w2 = 280 - k * 34, y1 = base - k * 34; rellenar(pir, [[cx - w2, y1], [cx - w2 + 10, y1 - 34], [cx + w2 - 10, y1 - 34], [cx + w2, y1]]); }
  rellenar(pir, [[cx - 50, base - 238], [cx - 50, base - 300], [cx - 60, base - 304], [cx, base - 330], [cx + 60, base - 304], [cx + 50, base - 300], [cx + 50, base - 238]]);
  rellenar(luzT, [[cx - 16, base - 238], [cx - 16, base - 276], [cx, base - 288], [cx + 16, base - 276], [cx + 16, base - 238]]);
  pintarTex(L, pir, [0.07, 0.11, 0.1], 0.4, 14, 301);
  const filos = M(); for (let k = 0; k < 7; k++) { const w2 = 280 - k * 34 - 10, y1 = base - k * 34 - 34; trazo(filos, cx - w2, y1, cx + w2, y1, 1.5, 1.5, 1, 'max', false); }
  pintar(L, filos, [0.25, 0.4, 0.35], 0.6, 'luz');
  // la escalinata (más clara) y la sangre que baja por ella
  const esc = M(); rellenar(esc, [[cx - 34, base], [cx - 18, base - 238], [cx + 18, base - 238], [cx + 34, base]]);
  for (let y = base - 238; y < base; y += 6) trazo(esc, cx - 40, y, cx + 40, y, 1.2, 1.2, 0.4, 'restar', false);
  pintar(L, esc, [0.12, 0.17, 0.15]);
  const sangre = M();
  for (let k = 0; k < 5; k++) { const pts: P2[] = []; let x = cx - 12 + k * 6; for (let y = base - 238; y <= base; y += 6) { x += (hash2(k, y) - 0.5) * 4; pts.push([x + (y - base + 238) * (k - 2) * 0.04, y]); } polilinea(sangre, pts, 1.5, 3.5); }
  rellenar(sangre, Array.from({ length: 20 }, (_, j) => { const t = (j / 20) * Math.PI * 2; return [cx + Math.cos(t) * 60, base + 6 + Math.sin(t) * 10] as P2; }));
  pintar(L, sangre, [0.42, 0.02, 0.02], 0.95);
  contraluz(L, pir, -3, 0, [0.35, 0.6, 0.5], 0.9);
  brillo(L, luzT, [1, 0.25, 0.06], 1.3); halo(L, cx, base - 260, 90, [1, 0.3, 0.06], 0.7, 1, true);
  niebla(L, 420, 560, [0.18, 0.3, 0.26], 0.65, 33);
  // el río de sangre que viene hacia la cámara
  const rio = M(), ri: P2[] = [], rd: P2[] = [];
  for (let k = 0; k <= 30; k++) { const t = k / 30, y = 520 + t * 200, x = cx + Math.sin(t * 4.2) * 160 * t, w2 = 20 + t * t * 260; ri.push([x - w2, y]); rd.push([x + w2, y]); }
  rellenar(rio, [...ri, ...rd.reverse()]);
  reflejo(L, 520, [0.22, 0.01, 0.015], 0.35, 34, 0, W, rio);
  pintar(L, rio, [0.35, 0.01, 0.01], 0.45, 'multiplicar');
  // selva: hojas grandes y lianas que enmarcan
  const selva = M(), r = rng(37);
  const hoja = (x: number, y: number, l: number, a: number) => { const pts: P2[] = []; for (let k = 0; k <= 12; k++) { const t = k / 12, ww = Math.sin(t * Math.PI) * l * 0.22; pts.push([t * l, -ww]); } for (let k = 12; k >= 0; k--) { const t = k / 12, ww = Math.sin(t * Math.PI) * l * 0.22; pts.push([t * l, ww]); } rellenar(selva, girar(pts.map(([u, v]) => [x + u, y + v] as P2), x, y, a)); };
  for (const lado of [-1, 1]) {
    const x0 = lado < 0 ? 0 : W;
    for (let k = 0; k < 26; k++) hoja(x0 - lado * r() * 120, 120 + r() * 600, 120 + r() * 160, lado < 0 ? -0.9 + r() * 1.4 : Math.PI - 0.5 + r() * 1.4);
    trazo(selva, x0 + lado * -60, 720, x0 + lado * -90, 0, 28, 18);
  }
  for (let k = 0; k < 9; k++) { const x = r() < 0.5 ? r() * 330 : W - r() * 330, l = 120 + r() * 260, pts: P2[] = []; for (let j = 0; j <= 10; j++) pts.push([x + Math.sin(j * 0.8 + k) * 10, (j / 10) * l]); polilinea(selva, pts, 4, 2); }
  // un ídolo de piedra a la izquierda, con ojos verdes
  const idolo = M(), ojos = M();
  rellenar(idolo, [[230, 720], [225, 520], [250, 470], [330, 470], [355, 520], [350, 720]]);
  rellenar(ojos, [[255, 540], [280, 536], [278, 546], [257, 548]]); rellenar(ojos, [[300, 536], [325, 540], [323, 548], [302, 546]]);
  const boca = M(); rellenar(boca, [[262, 590], [318, 590], [310, 612], [270, 612]]);
  pintar(L, idolo, [0.05, 0.07, 0.06]); pintar(L, boca, [0.01, 0.01, 0.01]); chorreado(sangre, 290, 610, 30, 60, 9); pintar(L, sangre, [0.3, 0.01, 0.01], 0.4);
  contraluz(L, idolo, 3, 0, [0.3, 0.55, 0.45], 0.8);
  brillo(L, ojos, [0.4, 1, 0.6], 1.4); brillo(L, desenfocada(ojos, 7), [0.2, 0.9, 0.5], 1.8);
  pintar(L, selva, [0.008, 0.02, 0.016]);
  contraluz(L, selva, 2, 2, [0.2, 0.4, 0.33], 0.45);
  rayosDeLuz(L, 420, 130, 0.45, 0.3);
  // luciérnagas
  const luc = M(), rl = rng(39); for (let k = 0; k < 60; k++) disco(luc, 200 + rl() * 880, 300 + rl() * 300, 1.4);
  brillo(L, luc, [0.6, 1, 0.5], 1.2); brillo(L, desenfocada(luc, 5), [0.4, 1, 0.4], 1.2);
}

// ------------------------------------------------------------------ acto 4: Hrimgard
function acto4(L: Lamina) {
  degradado(L, [[0, hex('#01030a')], [0.35, hex('#08142c')], [0.6, hex('#1a2c4a')], [0.7, hex('#0e1626')], [1, hex('#04060c')]]);
  const r = rng(41);
  for (let i = 0; i < 300; i++) halo(L, r() * W, r() * 380, 1.5, [0.85, 0.9, 1], r() * 0.5);
  // aurora: dos cortinas que ondulan, con el borde de abajo nítido y rayos suaves hacia arriba
  for (let y = 0; y < 380; y++) for (let x = 0; x < W; x++) {
    let k = 0;
    for (const [y0, amp, fase, f] of [[130, 50, 0.6, 1], [215, 32, 2.1, 0.55]] as const) {
      const ond = y0 + Math.sin(x / 230 + fase) * amp + Math.sin(x / 97 + fase * 2) * 14, d = (y - ond) / (y < ond ? 130 : 22);
      k += Math.exp(-d * d) * f * (0.5 + 0.5 * fbm(x / 160, fase, 3, 43)) * (0.7 + 0.3 * fbm(x / 7, y / 300, 2, 44));
    }
    const j = (y * W + x) * 4; L.d[j] += 0.04 * k; L.d[j + 1] += 0.4 * k; L.d[j + 2] += 0.28 * k + 0.12 * k * (1 - y / 380);
  }
  halo(L, 170, 120, 170, [0.6, 0.7, 0.9], 0.6);
  const luna = M(); disco(luna, 170, 120, 32); pintar(L, luna, [0.85, 0.9, 1]);
  // cordillera lejana y el pico del rey, con la fortaleza arriba
  const p1 = M(), cx = 880;
  rellenar(p1, perfil(W, H, 440, 60, 45, { escala: 150, picos: 0.9, rug: 0.5 }));
  const pico: P2[] = [[cx - 360, 480]];
  for (let k = 0; k <= 28; k++) { const t = k / 28, x = cx - 360 + t * 720, y = 296 + Math.abs(t - 0.5) * 2 * 200 + (hash2(k, 4) - 0.5) * 30 * (1 - Math.abs(t - 0.5)); pico.push([x, y]); }
  pico.push([cx + 360, 480]);
  rellenar(p1, pico);
  pintarTex(L, p1, [0.08, 0.1, 0.15], 0.3, 22, 401);
  // nieve en las caras que miran a la luna (a la izquierda) y en manchas
  const nieve = M();
  for (let y = 1; y < H; y++) for (let x = 4; x < W; x++) { const i = y * W + x; if (p1.d[i] > 0.5) nieve.d[i] = sat((p1.d[i] - p1.d[i + 4]) * 0.7 + (fbm(x / 9, y / 40, 4, 47) - 0.56) * 3.2) * (1 - sat((y - 300) / 170)); }
  desenfocar(nieve.d, W, H, 1);
  pintar(L, nieve, [0.6, 0.7, 0.85], 0.7);
  contraluz(L, p1, -3, -1, [0.6, 0.72, 0.95], 0.8);
  const fort = M(), luzF = M(), fy = 304;
  for (const [dx, hh, ww] of [[-46, 56, 22], [0, 84, 28], [44, 50, 20]] as [number, number, number][]) rellenar(fort, [[cx + dx - ww / 2, fy], [cx + dx - ww / 2, fy - hh], [cx + dx, fy - hh - ww * 1.5], [cx + dx + ww / 2, fy - hh], [cx + dx + ww / 2, fy]]);
  rellenar(fort, [[cx - 86, fy + 50], [cx - 66, fy - 30], [cx + 66, fy - 30], [cx + 86, fy + 50]]);
  for (let x = cx - 66; x < cx + 66; x += 12) rellenar(fort, [[x, fy - 30], [x, fy - 38], [x + 6, fy - 38], [x + 6, fy - 30]]);
  rellenar(luzF, [[cx - 4, fy - 50], [cx - 4, fy - 64], [cx, fy - 70], [cx + 4, fy - 64], [cx + 4, fy - 50]]);
  pintar(L, fort, [0.025, 0.035, 0.06]);
  contraluz(L, fort, -2, 0, [0.5, 0.6, 0.85], 0.8);
  brillo(L, luzF, [0.6, 0.85, 1], 1.4); halo(L, cx, fy - 58, 50, [0.4, 0.7, 1], 0.6, 1, true);
  niebla(L, 380, 520, [0.3, 0.38, 0.5], 0.5, 48);
  // picos cercanos oscuros
  const p2 = M(); rellenar(p2, perfil(W, H, 540, 70, 49, { escala: 150, picos: 0.7 }));
  pintarTex(L, p2, [0.06, 0.08, 0.12], 0.3, 20, 402);
  contraluz(L, p2, -2, 2, [0.5, 0.6, 0.8], 0.7);
  // suelo nevado de adelante
  const suelo = M(); rellenar(suelo, perfil(W, H, 606, 16, 51, { escala: 260 }));
  pintar(L, suelo, [0.4, 0.46, 0.58]);
  const sombraS = M(); for (let y = 560; y < H; y++) for (let x = 0; x < W; x++) sombraS.d[y * W + x] = suelo.d[y * W + x] * suave(0.4, 0.7, fbm(x / 120, y / 30, 4, 52)) * 0.6;
  pintar(L, sombraS, [0.12, 0.15, 0.24], 0.8);
  // columnas de hielo con alguien atrapado adentro
  for (const [x, hh, ww] of [[330, 260, 62], [560, 190, 48], [1130, 300, 70]] as [number, number, number][]) {
    const col = M(), dentro = M(), y = 626;
    rellenar(col, [[x - ww / 2, y], [x - ww * 0.55, y - hh * 0.7], [x - ww * 0.2, y - hh], [x + ww * 0.25, y - hh * 0.92], [x + ww * 0.55, y - hh * 0.6], [x + ww / 2, y]]);
    encapuchado(dentro, x, y - hh * 0.16, hh * 0.62, { capa: 0, arma: x > 600 ? 'lanza' : undefined });
    pintarTex(L, col, [0.32, 0.5, 0.65], 0.25, 12, x);
    pintar(L, dentro, [0.05, 0.07, 0.11], 0.75);
    const filo = M(); rellenar(filo, [[x - ww * 0.2, y - hh], [x - ww * 0.1, y - hh * 0.95], [x - ww * 0.35, y - hh * 0.3], [x - ww * 0.45, y - hh * 0.32]]);
    pintar(L, filo, [0.7, 0.9, 1], 0.6, 'luz');
    contraluz(L, col, -2, 0, [0.6, 0.85, 1], 0.7);
    halo(L, x, y - hh * 0.5, hh * 0.6, [0.2, 0.45, 0.6], 0.25, 1.2);
  }
  // huellas con sangre que suben hacia el trono
  const huellas = M();
  for (let k = 0; k < 18; k++) { const t = k / 17, x = 660 + t * 160 + Math.sin(t * 5) * 20 + (k % 2 ? 8 : -8) * (1 - t * 0.6), y = 716 - t * 104, s2 = 7 * (1 - t * 0.6); rellenar(huellas, [[x - s2 * 0.5, y], [x - s2 * 0.4, y - s2 * 1.6], [x + s2 * 0.4, y - s2 * 1.6], [x + s2 * 0.5, y]]); }
  pintar(L, huellas, [0.38, 0.02, 0.03], 0.85);
  const pinos = M();
  for (const [x, hh] of [[60, 400], [150, 300], [1220, 380], [1260, 300], [240, 210]] as [number, number][]) pino(pinos, x, 680 + (hh > 330 ? 30 : 0), hh, x);
  pintar(L, pinos, [0.01, 0.015, 0.025]);
  contraluz(L, pinos, -2, 0, [0.4, 0.5, 0.7], 0.5);
  // un caído medio enterrado con su lanza, y la nieve roja debajo
  const caido = M(); rellenar(caido, [[680, 694], [710, 680], [770, 684], [800, 698]]); disco(caido, 692, 686, 9); trazo(caido, 740, 694, 820, 604, 3, 2);
  const sg = M(); disco(sg, 740, 700, 34); for (let i = 0; i < W * H; i++) sg.d[i] *= suave(0.3, 0.7, fbm((i % W) / 8, Math.floor(i / W) / 4, 3, 53));
  pintar(L, sg, [0.32, 0.02, 0.02], 0.85); pintar(L, caido, [0.04, 0.04, 0.06]);
  rayosDeLuz(L, 170, 120, 0.35, 0.35);
  motas(L, 900, [0.85, 0.9, 1], 0.55, 54, 1.3, false);
}

// ------------------------------------------------------------------ acto 5: la Herida
function acto5(L: Lamina) {
  degradado(L, [[0, hex('#040102')], [0.4, hex('#1c0503')], [0.62, hex('#4a0e04')], [0.7, hex('#1a0503')], [1, hex('#050101')]]);
  // la Herida: una boca vertical en el cielo, con bordes dentados y luz por dentro
  const cx = 640, y0 = 200, y1 = 470, boca = M(), r = rng(57);
  const izq: P2[] = [], der: P2[] = [];
  for (let k = 0; k <= 40; k++) { const t = k / 40, y = y0 + (y1 - y0) * t, a = Math.sin(t * Math.PI) ** 0.8 * 70, j = (r() - 0.5) * 16 * Math.sin(t * Math.PI); izq.push([cx - a + j + Math.sin(t * 9) * 6, y]); der.push([cx + a + (r() - 0.5) * 16 * Math.sin(t * Math.PI) + Math.sin(t * 7) * 6, y]); }
  rellenar(boca, [...izq, ...der.reverse()]);
  halo(L, cx, (y0 + y1) / 2, 520, [0.9, 0.25, 0.05], 0.9, 0.85);
  nubes(L, { y0: -20, y1: 520, seed: 505, escala: 170, cubre: 0.62, masa: [0.05, 0.015, 0.012], panza: [1, 0.35, 0.08], filo: [0.5, 0.15, 0.05], luzX: (x) => 0.15 + 1.5 * Math.exp(-(((x - cx) / 260) ** 2)) });
  // por dentro: fuego que se mueve en vetas, más blanco en el centro
  for (let y = y0; y < y1; y++) for (let x = cx - 90; x < cx + 90; x++) {
    const i = y * W + x, a = boca.d[i]; if (a <= 0) continue;
    const u = Math.abs(x - cx) / 80, v = fbm(x / 14, y / 50, 4, 58), k = (1 - u) * 0.7 + v * 0.6, j = i * 4;
    const c = mezcla([0.9, 0.2, 0.03], [1.6, 1.1, 0.6], sat(k - 0.2));
    L.d[j] = L.d[j] * (1 - a) + c[0] * a; L.d[j + 1] = L.d[j + 1] * (1 - a) + c[1] * a; L.d[j + 2] = L.d[j + 2] * (1 - a) + c[2] * a;
  }
  // dientes oscuros en los bordes de la boca, que apuntan hacia adentro
  const dientes = M();
  for (let k = 2; k < 39; k += 2) for (const lado of [1, -1]) {
    const p = lado > 0 ? izq[k] : der[40 - k], q = lado > 0 ? izq[k + 1] : der[39 - k], l = (8 + hash2(k, lado + 2) * 20) * Math.sin((k / 40) * Math.PI);
    rellenar(dientes, [[p[0] - lado * 3, p[1] - 2], [q[0] - lado * 3, q[1] + 2], [p[0] + lado * l, (p[1] + q[1]) / 2 + 3]]);
  }
  pintar(L, dientes, [0.07, 0.015, 0.01]);
  brillo(L, desenfocada(boca, 20), [1, 0.4, 0.08], 1.1);
  // montes volcánicos con lava que baja
  const mo = M(); rellenar(mo, perfil(W, H, 490, 70, 59, { escala: 220, picos: 0.6 }));
  pintar(L, mo, [0.05, 0.015, 0.012]);
  contraluz(L, mo, 0, 3, [1, 0.3, 0.06], 0.9);
  const lava = M(); for (let k = 0; k < 7; k++) { const x = 80 + k * 180 + r() * 60, pts: P2[] = []; let y = 470 - r() * 40, xx = x; while (y < 560) { pts.push([xx, y]); xx += (r() - 0.5) * 14; y += 8; } polilinea(lava, pts, 1.5, 4); }
  for (let i = 0; i < W * H; i++) lava.d[i] *= mo.d[i];
  brillo(L, lava, [1, 0.45, 0.08], 1.3); brillo(L, desenfocada(lava, 6), [1, 0.25, 0.04], 1.4);
  // el Bastión del Último Coro a la derecha, con una sola ventana encendida
  const bas = M(), ven = M();
  rellenar(bas, [[930, 560], [930, 420], [960, 420], [960, 400], [990, 400], [990, 420], [1040, 420], [1040, 330], [1090, 300], [1140, 330], [1140, 420], [1200, 420], [1200, 390], [1240, 390], [1240, 560]]);
  for (let x = 930; x < 1240; x += 18) rellenar(bas, [[x, 420], [x, 408], [x + 9, 408], [x + 9, 420]]);
  aguja(bas, 1090, 304, 30, 110);
  rellenar(ven, [[1084, 380], [1084, 356], [1090, 348], [1096, 356], [1096, 380]]);
  pintar(L, bas, [0.02, 0.008, 0.008]);
  contraluz(L, bas, -3, 0, [0.9, 0.25, 0.06], 0.8);
  brillo(L, ven, [1, 0.85, 0.5], 1.4); halo(L, 1090, 366, 40, [1, 0.6, 0.2], 0.6, 1, true);
  // el río de lava que cruza
  const rio = M(), a1: P2[] = [], a2: P2[] = [];
  for (let k = 0; k <= 40; k++) { const t = k / 40, x = t * W, y = 560 + Math.sin(t * 5 + 1) * 18 + t * 10, w2 = 6 + 10 * Math.sin(t * 3) ** 2; a1.push([x, y - w2]); a2.push([x, y + w2]); }
  rellenar(rio, [...a1, ...a2.reverse()]);
  for (let i = 0; i < W * H; i++) { const v = rio.d[i]; if (v <= 0) continue; const x = i % W, y = Math.floor(i / W), k = 0.6 + 0.6 * fbm(x / 20, y / 6, 4, 61), j = i * 4; L.d[j] = L.d[j] * (1 - v) + 1.0 * k * v; L.d[j + 1] = L.d[j + 1] * (1 - v) + 0.4 * k * k * v; L.d[j + 2] = L.d[j + 2] * (1 - v) + 0.06 * v; }
  brillo(L, desenfocada(rio, 16), [1, 0.3, 0.05], 0.55);
  // primer plano: roca negra, estacas con empalados, cadenas y huesos
  const fr = M(); rellenar(fr, perfil(W, H, 640, 28, 63, { escala: 200, rug: 0.5 }).map(([x, y]) => [x, y - 50 * Math.abs((x - 640) / 640) ** 2] as P2));
  const sangre = M();
  for (const [x, alto, a] of [[150, 330, -0.12], [270, 230, 0.1], [1020, 260, -0.08], [1150, 340, 0.14], [880, 160, 0.05], [400, 150, -0.05]] as [number, number, number][]) {
    empalado(fr, x, 660, alto, x, a);
    chorreado(sangre, x + Math.sin(a) * alto * 0.4, 660 - alto * 0.38, 12, alto * 0.3, x);
  }
  pintar(L, fr, [0.015, 0.006, 0.006]);
  contraluz(L, fr, 0, -3, [1, 0.3, 0.06], 0.9);
  contraluz(L, fr, 2, 0, [0.8, 0.2, 0.04], 0.6, (x) => Math.exp(-(((x - cx) / 400) ** 2)));
  pintar(L, sangre, [0.35, 0.02, 0.01], 0.85);
  rayosDeLuz(L, cx, 335, 0.45, 0.55);
  motas(L, 260, [1, 0.45, 0.1], 0.9, 64, 1.1);
  motas(L, 500, [0.3, 0.25, 0.24], 0.5, 65, 1.3, false);
}

// ------------------------------------------------------------------ acto 6: Ysmeral
function acto6(L: Lamina) {
  degradado(L, [[0, hex('#030606')], [0.35, hex('#0d1817')], [0.6, hex('#22332f')], [0.64, hex('#2c403a')], [1, hex('#050909')]]);
  nubes(L, { y0: -30, y1: 420, seed: 606, escala: 210, cubre: 0.68, masa: [0.04, 0.055, 0.055], panza: [0.2, 0.45, 0.38], filo: [0.25, 0.3, 0.3], luzX: (x) => 0.2 + Math.exp(-(((x - 520) / 260) ** 2)) });
  const rr = rng(67), rel = rayo(980, 0, 1010, 430, rr, 0.28, 3), m0 = M(); for (const t of rel) polilinea(m0, t.pts, 2 * t.w, 0.8 * t.w);
  brillo(L, m0, [0.8, 0.9, 1], 1); brillo(L, desenfocada(m0, 10), [0.4, 0.5, 0.7], 1.2);
  const mar = 455;
  // la ciudad hundida asoma en el horizonte: agujas y muros rotos en la bruma
  const lejos = M();
  for (const [x, w2, h2] of [[70, 14, 90], [150, 10, 60], [760, 12, 84], [826, 18, 124], [1190, 12, 70], [1246, 16, 104]] as [number, number, number][]) aguja(lejos, x, mar + 2, w2, h2);
  ruina(lejos, null, 100, mar + 2, 80, 30, 5); ruina(lejos, null, 690, mar + 2, 100, 26, 6); ruina(lejos, null, 1150, mar + 2, 90, 34, 7);
  pintar(L, lejos, [0.075, 0.11, 0.105]);
  contraluz(L, lejos, -2, 0, [0.2, 0.35, 0.32], 0.5);
  // la catedral ahogada saliendo del agua, inclinada, con luz verde de mar en las ventanas y campanas
  const cat = M(), ven = M(), cx = 520;
  const cuerpo: P2[] = [[cx - 170, mar + 10], [cx - 170, mar - 140], [cx - 120, mar - 190], [cx + 120, mar - 190], [cx + 170, mar - 140], [cx + 170, mar + 10]];
  rellenar(cat, girar(cuerpo, cx, mar, -0.06));
  for (const [dx, hh] of [[-120, 300], [110, 260]] as [number, number][]) {
    const tw = 62, x = cx + dx;
    rellenar(cat, girar([[x - tw / 2, mar], [x - tw / 2, mar - hh], [x - tw * 0.6, mar - hh - 6], [x, mar - hh - 110], [x + tw * 0.6, mar - hh - 6], [x + tw / 2, mar - hh], [x + tw / 2, mar]], cx, mar, -0.06));
    // campanario abierto con su campana
    rellenar(ven, girar([[x - 16, mar - hh + 60], [x - 16, mar - hh + 20], [x, mar - hh + 6], [x + 16, mar - hh + 20], [x + 16, mar - hh + 60]], cx, mar, -0.06));
    const cam = M(); rellenar(cam, girar([[x - 11, mar - hh + 54], [x - 8, mar - hh + 34], [x, mar - hh + 28], [x + 8, mar - hh + 34], [x + 11, mar - hh + 54]], cx, mar, -0.06));
    pintar(L, cam, [0.03, 0.04, 0.04]);
  }
  for (let k = 0; k < 5; k++) { const x = cx - 100 + k * 50; rellenar(ven, girar([[x - 9, mar - 60], [x - 9, mar - 120], [x, mar - 134], [x + 9, mar - 120], [x + 9, mar - 60]], cx, mar, -0.06)); }
  const ros = M(); disco(ros, cx + 8, mar - 150 + 8, 26); pintarTex(L, cat, [0.05, 0.075, 0.075], 0.35, 14, 601);
  contraluz(L, cat, -3, 0, [0.35, 0.55, 0.5], 0.8);
  for (let i = 0; i < W * H; i++) ven.d[i] *= 0.55 + 0.45 * fbm((i % W) / 5, Math.floor(i / W) / 5, 2, 602);
  brillo(L, ven, [0.2, 0.62, 0.48], 0.75); brillo(L, ros, [0.16, 0.5, 0.4], 0.5); brillo(L, desenfocada(ven, 12), [0.12, 0.6, 0.45], 1.1);
  // mástil roto con la vela rota a la derecha
  const nave = M();
  rellenar(nave, girar([[850, mar + 20], [870, mar - 20], [900, mar - 50], [1060, mar - 56], [1100, mar - 82], [1122, mar - 40], [1110, mar + 20]], 980, mar, 0.08));
  trazo(nave, 980, mar - 30, 1010, 120, 9, 6, 1, 'max', false);
  trazo(nave, 940, 200, 1080, 190, 5, 4, 1, 'max', false);
  rellenar(nave, [[945, 205], [1075, 196], [1060, 300], [1010, 270], [990, 330], [960, 280]]);
  rellenar(nave, [[990, 240], [1010, 236], [1004, 262]], 1, 'restar'); rellenar(nave, [[1030, 250], [1050, 245], [1040, 275]], 1, 'restar');
  for (const [a, b] of [[[1010, 120], [880, mar - 30]], [[1010, 120], [1110, mar - 34]]] as [P2, P2][]) trazo(nave, a[0], a[1], b[0], b[1], 1.4, 1.4, 1, 'max', false);
  pintar(L, nave, [0.02, 0.03, 0.03]);
  contraluz(L, nave, -2, 0, [0.4, 0.55, 0.55], 0.6);
  // el mar: reflejo de todo con olas y espuma
  const agua = M(); for (let y = mar; y < H; y++) for (let x = 0; x < W; x++) agua.d[y * W + x] = 1;
  reflejo(L, mar, [0.03, 0.06, 0.06], 0.5, 68, 0, W, agua);
  const espuma = M(); for (let y = mar; y < H; y++) for (let x = 0; x < W; x++) espuma.d[y * W + x] = suave(0.68, 0.76, fbm(x / 70, y / 5, 4, 69)) * 0.5;
  pintar(L, espuma, [0.4, 0.5, 0.48], 0.5);
  // costa de adelante: rocas, costillas de ballena y ahogados boca abajo
  const costa = M(); rellenar(costa, perfil(W, H, 640, 22, 71, { escala: 180, rug: 0.5 }).map(([x, y]) => [x, y + 40 * sat((x - 500) / 400) - 20] as P2));
  const hueso = M();
  for (let k = 0; k < 7; k++) { const x = 90 + k * 46, alto = 240 - Math.abs(k - 3) * 30, pts: P2[] = []; for (let j = 0; j <= 12; j++) { const t = j / 12; pts.push([x + Math.sin(t * 1.4) * 70 * (1 - t * 0.3), 650 - t * alto]); } polilinea(hueso, pts, 12, 4); }
  trazo(hueso, 60, 652, 420, 640, 14, 10);
  const ahogados = M();
  for (const [x, y, s] of [[720, 590, 1], [860, 620, 1.2], [610, 560, 0.7], [1000, 600, 0.9]] as [number, number, number][]) {
    rellenar(ahogados, [[x - 30 * s, y], [x - 10 * s, y - 9 * s], [x + 26 * s, y - 7 * s], [x + 40 * s, y + 1]]); disco(ahogados, x - 34 * s, y - 2, 7 * s);
    trazo(ahogados, x - 20 * s, y, x - 46 * s, y + 10 * s, 4 * s, 3 * s); trazo(ahogados, x + 30 * s, y - 2, x + 62 * s, y + 4 * s, 4 * s, 3 * s);
  }
  pintar(L, ahogados, [0.1, 0.12, 0.1]);
  contraluz(L, ahogados, 0, -2, [0.35, 0.65, 0.55], 0.9);
  pintar(L, costa, [0.02, 0.025, 0.025]);
  pintar(L, hueso, [0.42, 0.44, 0.4]);
  contraluz(L, hueso, -2, -1, [0.4, 0.8, 0.65], 0.6);
  const sombraH = M(); for (let i = 0; i < W * H; i++) sombraH.d[i] = hueso.d[i] * suave(0.3, 0.7, (i % W) / W + fbm((i % W) / 30, Math.floor(i / W) / 30, 2, 72) * 0.6);
  pintar(L, sombraH, [0.05, 0.06, 0.06], 0.7);
  rayosDeLuz(L, 520, 330, 0.3, 0.3);
  lluvia(L, 1600, 0.3, [0.5, 0.65, 0.62], 0.22, 73);
  niebla(L, 400, 520, [0.18, 0.28, 0.26], 0.35, 74);
}

// ------------------------------------------------------------------ acto 7: la Corona
function acto7(L: Lamina) {
  degradado(L, [[0, hex('#020205')], [0.35, hex('#0d0b14')], [0.55, hex('#2a2018')], [0.7, hex('#100c0a')], [1, hex('#040303')]]);
  const cx = 640, ty = 300;
  halo(L, cx, ty - 20, 620, [1, 0.75, 0.35], 0.7, 0.8);
  // el cielo roto como vidrio: grietas que salen del trono, con ramas que las cruzan; algunos pedazos caídos
  // muestran la luz blanca de detrás
  const grietas = M(), huecos = M(), r = rng(77);
  const radiales: P2[][] = [];
  for (let k = 0; k < 18; k++) {
    const ang = (k / 18) * Math.PI * 2 + r() * 0.25, pts: P2[] = [[cx + Math.cos(ang) * 50, ty - 60 + Math.sin(ang) * 50]];
    let x = pts[0][0], y = pts[0][1], a = ang;
    for (let j = 0; j < 16; j++) { a += (r() - 0.5) * 0.3; const l = 30 + r() * 45; x += Math.cos(a) * l; y += Math.sin(a) * l * 0.85; pts.push([x, y]); if (y > 470 || x < -50 || x > W + 50) break; }
    radiales.push(pts); polilinea(grietas, pts, 2.6, 0.6);
  }
  // ramas: unen dos radiales vecinas a la misma distancia (como el vidrio de verdad)
  for (let k = 0; k < radiales.length; k++) for (let j = 2; j < 9; j += 2 + Math.floor(r() * 2)) {
    const a = radiales[k][j], b = radiales[(k + 1) % radiales.length][j + (r() < 0.5 ? 0 : 1)]; if (!a || !b) continue;
    const m: P2 = [(a[0] + b[0]) / 2 + (r() - 0.5) * 20, (a[1] + b[1]) / 2 + (r() - 0.5) * 20];
    polilinea(grietas, [a, m, b], 1.4, 1);
    if (r() < 0.22) { const c = radiales[k][j + 1], d = radiales[(k + 1) % radiales.length][j + 1]; if (c && d) rellenar(huecos, [a, m, b, d, c]); }
  }
  desenfocar(huecos.d, W, H, 1.5);
  for (let i = 0; i < W * H; i++) { const y = Math.floor(i / W); if (y > 480) { grietas.d[i] = 0; huecos.d[i] = 0; } }
  brillo(L, huecos, [1, 0.9, 0.7], 0.55);
  brillo(L, grietas, [1, 0.85, 0.5], 1.2); brillo(L, desenfocada(grietas, 6), [1, 0.6, 0.2], 1);
  // islas flotantes de borde dorado
  const islas = M(), oro = M();
  for (const [x, y, s] of [[200, 250, 1.1], [1080, 210, 1], [330, 400, 0.6], [960, 390, 0.7], [140, 470, 0.5], [1180, 460, 0.55]] as [number, number, number][]) {
    const w2 = 110 * s, pts: P2[] = [[x - w2, y]];
    for (let k = 1; k < 10; k++) pts.push([x - w2 + (2 * w2 * k) / 10, y + (Math.sin((k / 10) * Math.PI) * 140 + (r() - 0.5) * 30) * s]);
    pts.push([x + w2, y], [x + w2 * 0.6, y - 10 * s], [x - w2 * 0.5, y - 12 * s]);
    rellenar(islas, pts); trazo(oro, x - w2, y - 2, x + w2, y - 4, 3 * s, 3 * s); ruina(islas, null, x - w2 * 0.4, y - 8 * s, w2 * 0.5, 40 * s, Math.floor(x), { ventanas: 1 });
  }
  pintarTex(L, islas, [0.06, 0.045, 0.04], 0.35, 16, 701); brillo(L, oro, [1, 0.75, 0.3], 1.1);
  contraluz(L, islas, 0, -2, [1, 0.7, 0.3], 0.8);
  // el trono del Dios Sediento con el halo roto
  const trono = M(), halo2 = M();
  rellenar(trono, [[cx - 70, ty + 40], [cx - 60, ty - 70], [cx - 40, ty - 110], [cx, ty - 140], [cx + 40, ty - 110], [cx + 60, ty - 70], [cx + 70, ty + 40]]);
  for (const sg of [-1, 1]) rellenar(trono, [[cx + sg * 70, ty + 40], [cx + sg * 96, ty - 20], [cx + sg * 104, ty - 60], [cx + sg * 84, ty - 40], [cx + sg * 64, ty + 10]]);
  for (let k = 0; k < 72; k++) { const a = (k / 72) * Math.PI * 2; if ((k > 8 && k < 14) || (k > 44 && k < 49)) continue; disco(halo2, cx + Math.cos(a) * 124, ty - 60 + Math.sin(a) * 124, 3.6); }
  brillo(L, halo2, [1, 0.85, 0.45], 1.2); brillo(L, desenfocada(halo2, 8), [1, 0.7, 0.3], 1.2);
  pintar(L, trono, [0.03, 0.025, 0.025]);
  contraluz(L, trono, 0, -3, [1, 0.85, 0.5], 1);
  // la escalera de oro que baja hasta la cámara, con sangre que chorrea por los escalones
  const esc = M(), sombras = M(), sangre = M(), N = 34;
  const yEsc = (t: number) => ty + 40 + (720 - ty - 40) * t ** 1.6, wEsc = (t: number) => 40 + 560 * t ** 1.5;
  for (let k = 0; k < N; k++) {
    const t0 = k / N, t1 = (k + 1) / N;
    rellenar(esc, [[cx - wEsc(t0), yEsc(t0)], [cx + wEsc(t0), yEsc(t0)], [cx + wEsc(t1), yEsc(t1)], [cx - wEsc(t1), yEsc(t1)]]);
    const borde = yEsc(t0) + (yEsc(t1) - yEsc(t0)) * 0.35;
    rellenar(sombras, [[cx - wEsc(t0), borde], [cx + wEsc(t0), borde], [cx + wEsc(t1), yEsc(t1)], [cx - wEsc(t1), yEsc(t1)]]);
  }
  for (const [x, g] of [[-0.12, 1], [0.05, 0.7], [0.22, 0.85], [-0.3, 0.5]] as [number, number][]) {
    const pts: P2[] = []; for (let k = 0; k <= 30; k++) { const t = k / 30; pts.push([cx + x * wEsc(t) + Math.sin(t * 9 + x * 10) * 5, yEsc(t)]); }
    polilinea(sangre, pts, 1.5 * g, 16 * g);
  }
  pintarTex(L, esc, [0.72, 0.52, 0.24], 0.25, 30, 702);
  pintar(L, sombras, [0.16, 0.1, 0.05], 0.9);
  for (let i = 0; i < W * H; i++) if (esc.d[i] > 0) { const y = Math.floor(i / W), k = 1 - suave(ty, 720, y) * 0.6; L.d[i * 4] *= k; L.d[i * 4 + 1] *= k; L.d[i * 4 + 2] *= k; }
  pintar(L, sangre, [0.34, 0.02, 0.01], 0.95);
  // los que intentaron subir: estatuas de piedra pálida de rodillas, con la mano estirada hacia el trono
  const est = M();
  for (const [t, lado, s] of [[0.12, -1, 0.4], [0.22, 1, 0.5], [0.36, -1, 0.68], [0.5, 1, 0.85], [0.68, -1, 1.1], [0.8, 1, 1.3]] as [number, number, number][]) {
    const y = yEsc(t), x = cx + lado * wEsc(t) * 0.66;
    suplicante(est, x, y, 130 * s, -lado);
  }
  pintarTex(L, est, [0.46, 0.43, 0.39], 0.3, 6, 703);
  contraluz(L, est, 0, -2, [1, 0.85, 0.5], 0.9);
  // huesos y cráneos al pie de la escalera
  const huesos = M(), rh = rng(83);
  for (let k = 0; k < 60; k++) { const x = rh() * W, y = 680 + rh() * 40; if (Math.abs(x - cx) < wEsc(1) * 0.85) continue; if (rh() < 0.4) { disco(huesos, x, y, 6 + rh() * 6); } else trazo(huesos, x, y, x + (rh() - 0.5) * 50, y + (rh() - 0.5) * 10, 4, 3); }
  pintar(L, huesos, [0.4, 0.36, 0.3]);
  rayosDeLuz(L, cx, ty - 60, 0.4, 0.45);
  motas(L, 400, [1, 0.85, 0.5], 0.5, 85, 1.2);
}

const ESCENAS: ((L: Lamina) => void)[] = [acto1, acto2, acto3, acto4, acto5, acto6, acto7];

/** La carta del acto n (1 a 7), 1280 x 720 opaca, en flotantes. */
export function cartaActoLamina(n: number): Lamina {
  const L = lamina(W, H);
  ESCENAS[n - 1](L);
  for (let i = 0; i < W * H; i++) L.d[i * 4 + 3] = 1;
  terminar(L, n * 13);
  return L;
}
/** La carta del acto n (1 a 7) a 8 bits. */
export const cartaActo = (n: number): Raster => aRaster(cartaActoLamina(n), true);
