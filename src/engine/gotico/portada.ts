import { createRaster, type Raster } from '../core/raster';
import { rng } from '../core/rng';
import { objeto, herramientas } from './objeto';
import { pintarEscena } from './render';
import './catalogo/abadia_oria';
import {
  lamina, mascara, rellenar, trazo, disco, polilinea, desenfocar, desenfocada, pintar, brillo, degradado, halo, encima, escalar, desdeRaster,
  aRaster, recortar, grano, rayo, hex, mezcla, sat, suave, fbm, grilla,
  type Lamina, type Mascara, type C3, type P2,
} from './cine';
import { perfil, arbolMuerto, lapida, verja, cuervo, ruina, aguja, llamas, humo, nubes, campoNubes, type TipoLapida } from './siluetas';
import { fuegoTrasVidrios } from './cine_fuego';

/**
 * La portada de Réquiem de Ceniza en capas de paralaje: cielo de tormenta con las nubes encendidas desde abajo,
 * ruinas que arden en el horizonte, la catedral de Santa Oria (el mismo modelo del juego, `abo_catedral_*`, herida)
 * con la luz roja que sale por su puerta, niebla baja, el camposanto en primer plano con árboles muertos, ceniza que
 * cae (hoja de sprites) y relámpagos (cuadros que se suman).
 *
 * Pantalla base 1280 x 720. Cada capa mide 1536 x 800: la base va centrada con 128 px de margen a los lados y 40
 * arriba y abajo, así la cámara puede derivar sin que se vea el borde. Una capa con paralaje p se corre p veces lo
 * que se corre la cámara.
 */

export const BASE = { w: 1280, h: 720 };
export const CAPA = { w: 1536, h: 800, mx: 128, my: 40 };
/** Línea del horizonte y suelo de la catedral, en coordenadas de la capa. */
const HORIZONTE = 505, SUELO_CATEDRAL = 600, CATEDRAL_X = 900, ALTO_CATEDRAL = 330;
/** Centro de la catedral en la pantalla base: donde centrar la vista en pantallas angostas. */
export const FOCO_X = CATEDRAL_X - CAPA.mx;
/** Dónde caen los incendios del horizonte (x de la capa, fuerza). */
const FUEGOS: [number, number, number][] = [[250, 470, 1], [420, 482, 0.7], [610, 492, 0.5], [1240, 476, 0.9], [1420, 486, 0.8]];
const ROJO_PUERTA: C3 = [1.0, 0.16, 0.05];

export interface CapaPortada {
  id: string;
  /** orden de dibujo (de atrás para adelante) */
  z: number;
  img: Raster;
  /** cuánto se corre con la cámara (0 = fija, 1 = como el primer plano) */
  paralaje: number;
  /** normal o sumar (globalCompositeOperation 'lighter') */
  mezcla: 'normal' | 'sumar';
  /** animación que hace el juego sobre la capa */
  anim?: Record<string, unknown>;
  notas?: string;
  /** esquina de la capa en la capa de 1536 x 800 si no la cubre entera (las tiras de cuadros) */
  x?: number;
  y?: number;
}

const luzIncendios = (x: number) => {
  let v = 0.08;
  for (const [fx, , k] of FUEGOS) v += k * Math.exp(-(((x - fx) / 170) ** 2)) * 1.1;
  v += 1.3 * Math.exp(-(((x - CATEDRAL_X) / 210) ** 2));
  return v;
};

// ------------------------------------------------------------------ cielo
/** Cielo de tormenta (opaco): degradado, resplandor del horizonte y nubes iluminadas desde abajo. */
export function capaCielo(): Lamina {
  const { w, h } = CAPA, L = lamina(w, h);
  degradado(L, [[0, hex('#030307')], [0.3, hex('#0a0a11')], [0.5, hex('#1a0d12')], [0.6, hex('#3a130d')], [0.655, hex('#5e1b0c')], [0.7, hex('#240a07')], [1, hex('#0a0505')]]);
  // el resplandor de los incendios contra el cielo
  for (const [fx, fy, k] of FUEGOS) halo(L, fx, fy, 300, [0.5, 0.13, 0.03], 0.45 * k, 0.45);
  halo(L, CATEDRAL_X, SUELO_CATEDRAL - 120, 380, [0.55, 0.07, 0.03], 0.5, 0.6);
  // estrellas apenas, en los claros de arriba
  const r = rng(91);
  for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h * 0.35, k = r() * 0.35 * (1 - y / (h * 0.35)); halo(L, x, y, 1.6, [0.8, 0.82, 0.95], k); }
  // tres bancos de nubes: altas y oscuras, medias, bajas y encendidas
  nubes(L, { y0: -40, y1: 300, seed: 11, escala: 260, cubre: 0.62, masa: [0.035, 0.035, 0.05], panza: [0.3, 0.09, 0.06], filo: [0.2, 0.22, 0.3], luzX: (x) => luzIncendios(x) * 0.45 });
  nubes(L, { y0: 140, y1: 420, seed: 23, escala: 190, cubre: 0.55, masa: [0.045, 0.038, 0.048], panza: [0.8, 0.22, 0.07], filo: [0.2, 0.2, 0.26], luzX: luzIncendios });
  nubes(L, { y0: 330, y1: 500, seed: 37, escala: 120, cubre: 0.45, estira: 3.4, masa: [0.12, 0.05, 0.035], panza: [1.0, 0.36, 0.1], filo: [0.25, 0.15, 0.12], luzX: luzIncendios, alfa: 0.8 });
  return L;
}

/** Nubes bajas sueltas que se enrollan (la capa se repite cada 1536 px). */
export function capaNubes(): Lamina {
  const { w, h } = CAPA, L = lamina(w, h);
  nubes(L, { y0: 60, y1: 380, seed: 53, escala: 160, cubre: 0.36, estira: 3, per: w, masa: [0.03, 0.025, 0.03], panza: [0.7, 0.2, 0.06], filo: [0.14, 0.14, 0.18], luzX: () => 0.9, alfa: 0.9 });
  return L;
}

// ------------------------------------------------------------------ ruinas del horizonte
/** Ruinas lejanas que arden: devuelve la silueta (con humo) y la luz del fuego aparte (para que titile). */
export function capaRuinas(): { capa: Lamina; fuego: Lamina } {
  const { w, h } = CAPA, sil = mascara(w, h), luzV = mascara(w, h), llama = mascara(w, h), hum = mascara(w, h), humBase = mascara(w, h);
  // lomas y ruinas sobre la línea del horizonte
  rellenar(sil, perfil(w, h, HORIZONTE, 14, 61, { escala: 300 }));
  const r = rng(77);
  let x = 20;
  while (x < w - 20) {
    const ww = 26 + r() * 60, hh = 18 + r() * 34, cerca = Math.abs(x - CATEDRAL_X) < 230;
    if (!cerca || r() < 0.3) ruina(sil, luzV, x, HORIZONTE + 6, ww, cerca ? hh * 0.5 : hh, Math.floor(r() * 1000), { torre: r() < 0.25, techo: r() < 0.35, ventanas: r() < 0.6 ? 2 : 1 });
    x += ww + r() * 40;
  }
  aguja(sil, 140, HORIZONTE + 4, 16, 120); aguja(sil, 1330, HORIZONTE + 4, 14, 96); aguja(sil, 520, HORIZONTE + 4, 10, 70);
  // incendios: humo que sube y se inclina, llamas en la base
  for (const [fx, fy, k] of FUEGOS) {
    humo(hum, fx, fy, 260 + k * 160, 40 + k * 30, 0.35, Math.floor(fx), humBase);
    llamas(llama, fx, fy + 8, 22 + k * 24, 12 + k * 16, Math.floor(fx));
  }
  const capa = lamina(w, h);
  // humo oscuro con la panza teñida del fuego
  desenfocar(hum.d, w, h, 3);
  pintar(capa, hum, [0.06, 0.045, 0.05], 0.6);
  pintar(capa, humBase, [0.55, 0.16, 0.05], 0.55);
  const silC: C3 = [0.07, 0.035, 0.035];
  pintar(capa, sil, silC);
  // borde de arriba de la silueta encendido por el resplandor
  const borde = mascara(w, h);
  for (let y = 1; y < h; y++) for (let x2 = 0; x2 < w; x2++) { const i = y * w + x2; borde.d[i] = Math.max(0, sil.d[i] - sil.d[i - w]); }
  desenfocar(borde.d, w, h, 1.5);
  for (let i = 0; i < w * h; i++) borde.d[i] *= luzIncendios(i % w) * 0.5;
  pintar(capa, borde, [0.9, 0.3, 0.08], 0.9, 'luz');
  // luz del fuego: ventanas, llamas y su resplandor (capa que se suma y titila)
  const fuego = lamina(w, h);
  brillo(fuego, luzV, [1.0, 0.55, 0.15], 0.9);
  brillo(fuego, llama, [1.0, 0.48, 0.13], 1.15);
  const fl = desenfocada(llama, 12);
  brillo(fuego, fl, [1.0, 0.3, 0.06], 1.6);
  for (const [fx, fy, k] of FUEGOS) halo(fuego, fx, fy, 110 * (0.6 + k * 0.5), [0.8, 0.25, 0.05], 0.5 * k, 0.5, true);
  return { capa, fuego };
}

// ------------------------------------------------------------------ la catedral
/** El modelo de la catedral de Santa Oria armado con sus tres piezas, sin sombra. Lento (unos 80 s). */
export function renderCatedral(variante = 'herida'): { img: Lamina; puerta: P2 } {
  const piezas: [string, number][] = [['abo_catedral_cabecera', -9], ['abo_catedral_nave', 0], ['abo_catedral_fachada', 7]];
  const rs = piezas.map(([id, dy]) => {
    const a = objeto(id).armar(variante, 0, herramientas(1));
    const e = Array.isArray(a) ? { piezas: a } : a;
    return { r: pintarEscena({ ...e, sinSombra: true }), dx: -16 * dy, dy: 8 * dy };
  });
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const { r, dx, dy } of rs) { x0 = Math.min(x0, dx - r.ancla[0]); y0 = Math.min(y0, dy - r.ancla[1]); x1 = Math.max(x1, dx - r.ancla[0] + r.img.w); y1 = Math.max(y1, dy - r.ancla[1] + r.img.h); }
  const out = lamina(Math.ceil(x1 - x0), Math.ceil(y1 - y0));
  for (const { r, dx, dy } of rs) encima(out, desdeRaster(r.img), Math.round(dx - r.ancla[0] - x0), Math.round(dy - r.ancla[1] - y0));
  // la puerta central queda en la celda (cx, cy + 8)
  return { img: out, puerta: [-16 * 8 - x0, 8 * 8 - y0] };
}
/** Un reemplazo rápido (para pruebas): silueta de dos torres con agujas, sin el modelo. */
function catedralRapida(): { img: Lamina; puerta: P2 } {
  const w = 700, h = 760, m = mascara(w, h), luz = mascara(w, h);
  rellenar(m, [[60, 740], [60, 330], [660, 330], [660, 740]]);
  aguja(m, 150, 420, 110, 420); aguja(m, 300, 420, 110, 360); aguja(m, 520, 400, 60, 300);
  disco(luz, 225, 470, 40); rellenar(luz, [[200, 740], [200, 640], [225, 610], [250, 640], [250, 740]]);
  const L = lamina(w, h); pintar(L, m, [0.2, 0.2, 0.24]); pintar(L, luz, [1, 0.3, 0.1]);
  return { img: L, puerta: [225, 740] };
}

/** Vitrales y puerta: rojo o naranja saturado y claro. */
const esLuz = (c: C3) => c[0] > 0.42 && c[0] > c[1] * 1.7 && c[0] > c[2] * 2.2;

/**
 * La catedral en la colina: modelo oscurecido y enfriado (noche de tormenta), la luz roja de vitrales y puerta en
 * una capa aparte que late, el cono de luz que sale por la puerta y baja por la escalinata hacia el que mira.
 */
export function capaCatedral(cat: { img: Lamina; puerta: P2 }): { capa: Lamina; luz: Lamina; puerta: P2; vitrales: Mascara } {
  const { w, h } = CAPA, k = ALTO_CATEDRAL / cat.img.h;
  const im = escalar(cat.img, Math.round(cat.img.w * k), Math.round(cat.img.h * k));
  const px = Math.round(CATEDRAL_X - im.w * 0.45), py = Math.round(SUELO_CATEDRAL - im.h + 6);
  const puerta: P2 = [px + cat.puerta[0] * k, py + cat.puerta[1] * k];
  const capa = lamina(w, h), luz = lamina(w, h), vitrales = mascara(w, h);
  // la colina y el atrio
  const colina = mascara(w, h);
  rellenar(colina, perfil(w, h, SUELO_CATEDRAL + 30, 16, 5, { escala: 420 }).map(([x, y]) => [x, y + 40 * ((x - CATEDRAL_X) / 600) ** 2 - 10] as P2));
  pintar(capa, colina, [0.035, 0.025, 0.03]);
  // el modelo: oscuro y frío; la luz roja va aparte
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
    const s = (y * im.w + x) * 4, a = im.d[s + 3]; if (a <= 0.01) continue;
    const c: C3 = [im.d[s] / a, im.d[s + 1] / a, im.d[s + 2] / a], tx = x + px, ty = y + py;
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
    const alto = y / im.h, lum = c[0] * 0.3 + c[1] * 0.55 + c[2] * 0.15;
    let o: C3 = mezcla([c[0] * 0.42, c[1] * 0.42, c[2] * 0.45], [lum * 0.36, lum * 0.4, lum * 0.55], 0.55);
    // luz roja que sube del suelo y de la puerta por la fachada
    const cerca = Math.exp(-((tx - puerta[0]) ** 2 + ((ty - puerta[1]) * 1.4) ** 2) / (2 * 110 ** 2));
    o = [o[0] + (0.12 * alto ** 3 + 0.5 * cerca) * lum * 1.3, o[1] + 0.02 * alto, o[2]];
    const j = (ty * w + tx) * 4;
    capa.d[j] = capa.d[j] * (1 - a) + o[0] * a; capa.d[j + 1] = capa.d[j + 1] * (1 - a) + o[1] * a; capa.d[j + 2] = capa.d[j + 2] * (1 - a) + o[2] * a; capa.d[j + 3] = capa.d[j + 3] * (1 - a) + a;
    // el vidrio queda más tenue: detrás arde el fuego de Doom (capa catedral_fuego) y el resplandor lo pone el halo
    if (esLuz(c)) { const e = sat((c[0] - 0.35) * 1.6) * a; luz.d[j] += 0.55 * e; luz.d[j + 1] += 0.12 * e; luz.d[j + 2] += 0.035 * e; luz.d[j + 3] = Math.min(1, luz.d[j + 3] + e * 0.55); vitrales.d[ty * w + tx] = Math.max(vitrales.d[ty * w + tx], e); }
  }
  // el hueco de la puerta abierta (22 x 64 px en el sprite de la fachada, a la escala de la catedral): ahí también arde
  { const pw = 22 * k, ph = 64 * k, [dx, dy] = puerta;
    rellenar(vitrales, [[dx - pw / 2, dy - 2], [dx - pw / 2, dy - ph * 0.7], [dx, dy - ph], [dx + pw / 2, dy - ph * 0.7], [dx + pw / 2, dy - 2]], 0.9); }
  // tierra y escombros delante del pie del modelo (la planta isométrica no queda flotando); se abre en la puerta
  const frente = mascara(w, h), pie = new Float32Array(im.w).fill(-1);
  for (let x = 0; x < im.w; x++) for (let y = im.h - 1; y >= 0; y--) if (im.d[(y * im.w + x) * 4 + 3] > 0.5) { pie[x] = y + py; break; }
  // el monte sigue el pie del modelo y baja suave a los lados (no un bloque)
  let xa = 0, xb = im.w - 1; while (xa < im.w - 1 && pie[xa] < 0) xa++; while (xb > 0 && pie[xb] < 0) xb--;
  const borde: P2[] = [[px - 400, h + 2]];
  for (let x = -400; x < im.w + 400; x += 3) {
    const tx = px + x, suelo = SUELO_CATEDRAL + 24 + Math.abs(tx - CATEDRAL_X) * 0.05;
    let y = x < xa ? pie[xa] - 16 + (xa - x) * 0.42 : x > xb ? pie[xb] - 16 + (x - xb) * 0.42 : (pie[x] > 0 ? pie[x] - 16 : suelo);
    y = Math.min(y, suelo) + (fbm(tx / 14, 2, 3, 61) - 0.5) * 12 + 14 * Math.exp(-(((tx - puerta[0]) / 34) ** 2));
    borde.push([tx, y]);
  }
  borde.push([px + im.w + 400, h + 2]);
  rellenar(frente, borde);
  pintar(capa, frente, [0.035, 0.025, 0.03]);
  // resplandor de los vitrales
  const v = lamina(w, h); v.d.set(luz.d); desenfocar(v.d, w, h, 9, 4);
  for (let i = 0; i < v.d.length; i++) luz.d[i] += v.d[i] * 2.4;
  // la puerta: luz que se derrama por la escalinata hacia abajo a la izquierda (hacia el que mira) y un charco en el suelo
  const cono = mascara(w, h), [dx, dy] = puerta;
  rellenar(cono, [[dx - 9, dy - 30], [dx + 8, dy - 28], [dx + 60, dy + 150], [dx - 250, dy + 210]], 1);
  desenfocar(cono.d, w, h, 14);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (cono.d[i] > 0) cono.d[i] *= Math.exp(-Math.max(0, y - dy) / 150) * (0.7 + 0.3 * fbm(x / 22, y / 60, 3, 4)); }
  brillo(luz, cono, ROJO_PUERTA, 0.8);
  halo(luz, dx, dy - 10, 70, [1, 0.35, 0.12], 1.2, 1, true);
  halo(luz, dx - 40, dy + 50, 230, [0.8, 0.1, 0.03], 0.55, 0.35, true);
  return { capa, luz, puerta, vitrales };
}

// ------------------------------------------------------------------ niebla
/** Niebla baja que se arrastra (se repite cada 1536 px), teñida de rojo por la puerta. */
export function capaNiebla(puerta: P2): Lamina {
  const { w, h } = CAPA, L = lamina(w, h), per = 1536 / 192;
  for (let y = 470; y < 700; y++) for (let x = 0; x < w; x++) {
    const n = fbm(x / 192, y / 40, 5, 71, per), env = suave(470, 560, y) * (1 - suave(610, 700, y));
    const a = sat((n - 0.38) * 2.2) * env * 0.55; if (a <= 0) continue;
    const roja = Math.exp(-(((x - puerta[0]) / 260) ** 2)) * 0.8;
    const c: C3 = [0.16 + roja * 0.45, 0.1 + roja * 0.06, 0.11 + roja * 0.03], j = (y * w + x) * 4;
    L.d[j] = c[0] * a; L.d[j + 1] = c[1] * a; L.d[j + 2] = c[2] * a; L.d[j + 3] = a;
  }
  return L;
}

// ------------------------------------------------------------------ el camposanto
/** Primer plano: suelo, tumbas, cruces, verja y dos árboles muertos que enmarcan; borde rojo de la puerta. */
export function capaCementerio(puerta: P2): Lamina {
  const { w, h } = CAPA, sil = mascara(w, h), lejos = mascara(w, h);
  // segunda fila de tumbas (más chicas y más claras por la niebla)
  rellenar(lejos, perfil(w, h, 640, 10, 81, { escala: 200 }));
  const r = rng(303);
  for (let i = 0; i < 26; i++) {
    const x = 150 + r() * (w - 300), t = (['redonda', 'ojiva', 'cruz', 'celta', 'rota'] as TipoLapida[])[Math.floor(r() * 5)];
    if (Math.abs(x - (puerta[0] - 100)) < 90) continue;
    lapida(lejos, x, 642 + r() * 8, 22 + r() * 20, t, (r() - 0.5) * 0.3);
  }
  // suelo de adelante: sube hacia los lados (enmarca), con montículos de tumbas
  rellenar(sil, perfil(w, h, 702, 14, 83, { escala: 240 }).map(([x, y]) => [x, y - 90 * Math.abs((x - 768) / 768) ** 3] as P2));
  for (let i = 0; i < 9; i++) { const x = 100 + r() * (w - 200), rw = 50 + r() * 50; rellenar(sil, Array.from({ length: 16 }, (_, k) => { const t = Math.PI + (k / 15) * Math.PI; return [x + Math.cos(t) * rw, 702 - 90 * Math.abs((x - 768) / 768) ** 3 + Math.sin(t) * rw * 0.22] as P2; })); }
  // tumbas grandes, más grandes cuanto más a los lados (enmarcan el centro y dejan libre el sendero de luz)
  const tumbas: [number, number, TipoLapida, number][] = [
    [250, 200, 'celta', -0.07], [360, 110, 'redonda', 0.12], [455, 128, 'cruz', -0.2], [548, 78, 'ojiva', 0.06], [622, 58, 'rota', -0.1],
    [1000, 66, 'redonda', 0.08], [1078, 104, 'cruz', 0.18], [1170, 92, 'ojiva', -0.06], [1262, 186, 'celta', 0.09], [1360, 120, 'redonda', -0.15],
    [178, 90, 'rota', 0.2], [920, 44, 'cruz', -0.3], [690, 40, 'redonda', 0.1],
  ];
  const sueloEn = (x: number) => 708 - 90 * Math.abs((x - 768) / 768) ** 3;
  for (const [x, alto, t, a] of tumbas) lapida(sil, x, sueloEn(x) + (alto > 150 ? 8 : 2), alto, t, a);
  // cuervos en las cruces grandes
  cuervo(sil, 250, sueloEn(250) + 8 - 200 - 3, 9, 1);
  cuervo(sil, 1262 + 14, sueloEn(1262) + 8 - 186 - 3, 8, -1);
  verja(sil, 1400, 1536, sueloEn(1450), 80, 9);
  verja(sil, -10, 140, sueloEn(60), 74, 4);
  // árboles muertos que enmarcan
  arbolMuerto(sil, 96, sueloEn(96) + 10, 600, 17, { inclina: 0.12, grosor: 0.075 });
  arbolMuerto(sil, 1452, sueloEn(1452) + 10, 520, 29, { inclina: -0.16, grosor: 0.07 });
  // pasto seco
  for (let i = 0; i < 900; i++) { const x = r() * w, y = sueloEn(x) - 14 + r() * 26, l = 6 + r() * 18; trazo(sil, x, y, x + (r() - 0.5) * 8, y - l, 1.6, 0.4, 1, 'max', false); }
  const capa = lamina(w, h);
  pintar(capa, lejos, [0.1, 0.06, 0.065]);
  pintar(capa, sil, [0.018, 0.012, 0.014]);
  // borde encendido: la luz roja de la puerta y un poco de la tormenta en los bordes de arriba
  const bordeL = mascara(w, h), bordeR = mascara(w, h);
  for (let y = 1; y < h - 1; y++) for (let x = 2; x < w - 2; x++) {
    const i = y * w + x, a = sil.d[i]; if (a <= 0) continue;
    const hacia = Math.sign(puerta[0] - x);
    bordeR.d[i] = Math.max(0, a - sil.d[i + hacia * 2]) * Math.exp(-(((x - puerta[0]) / 520) ** 2)) * (0.4 + 0.6 * (y / h));
    bordeL.d[i] = Math.max(0, a - sil.d[i - w * 2]) * 0.6;
    const l2 = Math.max(0, lejos.d[i] - lejos.d[i - w]) * 0.6; if (l2 > bordeL.d[i]) bordeL.d[i] = l2;
  }
  pintar(capa, bordeR, [0.9, 0.12, 0.04], 1.1, 'luz');
  pintar(capa, bordeL, [0.3, 0.16, 0.14], 0.8, 'luz');
  // el sendero que recibe la luz de la puerta entre las tumbas
  const charco = mascara(w, h);
  rellenar(charco, [[puerta[0] - 60, 660], [puerta[0] + 20, 660], [puerta[0] - 120, 800], [puerta[0] - 420, 800]]);
  desenfocar(charco.d, w, h, 24);
  for (let i = 0; i < w * h; i++) charco.d[i] *= sil.d[i] * (0.5 + 0.5 * fbm((i % w) / 30, Math.floor(i / w) / 12, 3, 5));
  pintar(capa, charco, [0.35, 0.05, 0.02], 0.7, 'luz');
  return capa;
}

// ------------------------------------------------------------------ ceniza (hoja de sprites)
/** Hoja de 8 x 4 celdas de 32 px: dos copos de ceniza que giran, una brasa que titila y una chispa chica. */
export function hojaCeniza(): Raster {
  const C = 32, cuadros: Raster[] = [];
  for (let fila = 0; fila < 4; fila++) for (let f = 0; f < 8; f++) {
    const L = lamina(C, C), m = mascara(C, C), t = f / 8, a = t * Math.PI * 2;
    if (fila < 2) {
      // copo: polígono irregular que gira en 3D (se aplana con el coseno)
      const r = rng(fila * 31 + 5), n = 7, pts: P2[] = [];
      for (let k = 0; k < n; k++) { const an = (k / n) * Math.PI * 2, rr = (fila ? 6 : 8.5) * (0.6 + r() * 0.5); pts.push([Math.cos(an) * rr, Math.sin(an) * rr]); }
      const sx = Math.max(0.2, Math.abs(Math.cos(a))), rot = a * 0.5 + fila;
      rellenar(m, pts.map(([x, y]) => { const u = x * sx, c = Math.cos(rot), s = Math.sin(rot); return [C / 2 + u * c - y * s, C / 2 + u * s + y * c] as P2; }));
      const g = 0.4 + 0.25 * Math.abs(Math.cos(a)) + fila * 0.12;
      pintar(L, m, [g, g * 0.95, g * 0.9], 0.9);
    } else {
      const big = fila === 2, pul = 0.65 + 0.35 * Math.sin(a + (big ? 0 : 1.7)) * Math.sin(a * 3);
      halo(L, C / 2, C / 2, big ? 11 : 7, [1.0, 0.4, 0.08], 0.9 * pul, 1, true);
      disco(m, C / 2, C / 2, big ? 2.2 : 1.3); brillo(L, m, [1.0, 0.8, 0.45], 1.2 * pul);
    }
    cuadros.push(aRaster(L));
  }
  return grilla(cuadros, 8);
}

// ------------------------------------------------------------------ relámpago
export const CUADROS_RELAMPAGO = 6;
/** Intensidad de cada cuadro y el destello blanco que el juego pone sobre toda la pantalla. */
export const RELAMPAGO_SEC = { fuerza: [0.25, 1, 0.55, 0.9, 0.35, 0.12], destello: [0.015, 0.06, 0.03, 0.05, 0.02, 0.008], fps: 15 };
/** Cuadros del relámpago (1536 x 560, se suman encima de las nubes): rayo con ramas y nubes encendidas a su alrededor. */
export function cuadrosRelampago(): Raster[] {
  const w = CAPA.w, h = 560, r = rng(808), bx = 330;
  const tramos = rayo(bx, 120, bx + 70, HORIZONTE - 10, r, 0.3, 5), tramos2 = rayo(bx, 120, bx - 40, HORIZONTE - 30, rng(809), 0.32, 3);
  const { D } = campoNubes(w, { y0: 140, y1: 420, seed: 23, escala: 190, cubre: 0.55 });
  const { D: D0 } = campoNubes(w, { y0: -40, y1: 300, seed: 11, escala: 260, cubre: 0.62 });
  const out: Raster[] = [];
  for (let f = 0; f < CUADROS_RELAMPAGO; f++) {
    const k = RELAMPAGO_SEC.fuerza[f], L = lamina(w, h), m = mascara(w, h);
    const usa = f === 3 ? tramos2 : tramos;
    if (f >= 1 && f <= 3) for (const t of usa) polilinea(m, t.pts, 3.2 * t.w * (f === 2 ? 0.6 : 1), 1.2 * t.w);
    const g1 = desenfocada(m, 3), g2 = desenfocada(m, 18);
    brillo(L, m, [0.95, 0.95, 1.0], 1.3 * k);
    brillo(L, g1, [0.6, 0.65, 1.0], 1.4 * k);
    brillo(L, g2, [0.4, 0.42, 0.75], 1.6 * k);
    // las nubes alrededor del rayo se encienden por dentro
    const nube = mascara(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const yd = y - 140, yd0 = y + 40, dd = yd >= 0 && yd < D.length / w ? D[yd * w + x] : 0, d0 = yd0 >= 0 && yd0 < D0.length / w ? D0[yd0 * w + x] : 0;
      const dist = Math.hypot((x - bx) / 420, (y - 200) / 260);
      nube.d[y * w + x] = Math.max(dd, d0 * 0.8) * Math.exp(-dist * dist * 2.2);
    }
    brillo(L, nube, [0.5, 0.52, 0.7], 0.9 * k);
    out.push(aRaster(L));
  }
  return out;
}

// ------------------------------------------------------------------ viñeta
/** Viñeta fija de 1280 x 720 (negro con alfa) y una franja más oscura abajo para los botones del menú. */
export function capaVineta(): Lamina {
  const { w, h } = BASE, L = lamina(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const q = Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2)), j = (y * w + x) * 4;
    const a = sat(0.75 * suave(0.6, 1.45, q) + 0.35 * suave(0.72, 1, y / h) + 0.25 * (1 - suave(0, 0.12, y / h)));
    L.d[j + 3] = a;
  }
  return L;
}

// ------------------------------------------------------------------ todo junto
export interface Portada { capas: CapaPortada[]; ceniza: Raster; relampago: Raster[]; puerta: P2 }

/** Arma todas las capas. `rapida` usa una catedral de reemplazo (para pruebas: el modelo tarda). */
export function pintarPortada(o: { rapida?: boolean; aviso?: (s: string) => void } = {}): Portada {
  const av = o.aviso ?? (() => {});
  av('cielo'); const cielo = capaCielo();
  av('nubes'); const nub = capaNubes();
  av('ruinas'); const ru = capaRuinas();
  av('catedral'); const cat = capaCatedral(o.rapida ? catedralRapida() : renderCatedral('herida'));
  av('fuego de los vitrales'); const fuego = capaFuegoCatedral(cat.vitrales);
  av('niebla'); const nie = capaNiebla(cat.puerta);
  av('camposanto'); const cem = capaCementerio(cat.puerta);
  grano(cem, 0.02, 3);
  const deriva = { tipo: 'deriva', px_por_segundo: -6, enrollar: true };
  const capas: CapaPortada[] = [
    { id: 'cielo', z: 0, img: aRaster(cielo, true), paralaje: 0.05, mezcla: 'normal' },
    { id: 'nubes', z: 1, img: aRaster(nub), paralaje: 0.12, mezcla: 'normal', anim: deriva, notas: 'Se repite cada 1536 px en x: dibujarla dos veces para enrollarla.' },
    { id: 'relampago', z: 2, img: createRaster(1, 1), paralaje: 0.12, mezcla: 'sumar', anim: { tipo: 'cuadros', archivo: 'relampago.png' } },
    { id: 'ruinas', z: 3, img: aRaster(ru.capa), paralaje: 0.2, mezcla: 'normal' },
    { id: 'ruinas_fuego', z: 4, img: aRaster(ru.fuego), paralaje: 0.2, mezcla: 'sumar', anim: { tipo: 'titilar', alfa: [0.7, 1], hz: 7, notas: 'alfa con ruido suave (no un seno): suma de dos senos de 5.3 y 8.9 Hz' } },
    { id: 'catedral', z: 5, img: aRaster(cat.capa), paralaje: 0.45, mezcla: 'normal' },
    { id: 'catedral_luz', z: 6, img: aRaster(cat.luz), paralaje: 0.45, mezcla: 'sumar', anim: { tipo: 'latir', alfa: [0.7, 1], periodo_s: 2.4, notas: 'late con los vitrales; durante un relámpago bajarla a 0.5' } },
    ...(fuego ? [fuego] : []),
    { id: 'niebla', z: 7, img: aRaster(nie), paralaje: 0.6, mezcla: 'normal', anim: { tipo: 'deriva', px_por_segundo: 9, enrollar: true } },
    { id: 'cementerio', z: 9, img: aRaster(cem), paralaje: 1, mezcla: 'normal' },
  ];
  av('ceniza y relámpagos');
  return { capas, ceniza: hojaCeniza(), relampago: cuadrosRelampago(), puerta: cat.puerta };
}

/**
 * Fuego de Doom detrás de los vitrales y de la puerta de la catedral: una tira de 12 cuadros a 12 por segundo que
 * empalma (anim 'cuadros', se suma), recortada a la caja de los vitrales (x, y en la capa). Va encima de catedral_luz.
 */
export function capaFuegoCatedral(vit: Mascara, cuadros = 12): CapaPortada | null {
  const { w, h } = vit;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (vit.d[y * w + x] > 0.05) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(w - 1, x1 + 2); y1 = Math.min(h - 1, y1 + 2);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, m = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) m[y * cw + x] = Math.min(1, vit.d[(y + y0) * w + x + x0] * 1.4);
  const cs = fuegoTrasVidrios(m, cw, ch, { cuadros, celda: 1, paleta: 'infierno', semilla: 6301, alto_px: 26, fondo: { c: [0.55, 0.1, 0.03], k: 0.35 }, k: 1.1, pasos: 2 });
  const cols = Math.min(cuadros, Math.max(1, Math.floor(4096 / cw)));
  return {
    id: 'catedral_fuego', z: 6.5, img: grilla(cs.map((L) => aRaster(L)), cols), paralaje: 0.45, mezcla: 'sumar', x: x0, y: y0,
    anim: { tipo: 'cuadros', columnas: cols, cuadros, fps: 12, w: cw, h: ch },
    notas: 'Fuego de Doom horneado detrás de los vitrales y en la puerta: tira en grilla, cuadro = floor(t * fps) % cuadros, en (x, y) de la capa, se suma, empalma. Durante un relámpago bajarla a 0.6 como catedral_luz.',
  };
}

/** Compone las capas en la pantalla base (cámara en el centro, corrida `cam` px) para vistas previas. */
export function componerPortada(p: Portada, o: { cam?: [number, number]; relampago?: number } = {}): Lamina {
  const [cx, cy] = o.cam ?? [0, 0], out = lamina(CAPA.w, CAPA.h);
  for (const c of [...p.capas].sort((a, b) => a.z - b.z)) {
    if (c.img.w < 2) { if (o.relampago !== undefined) encima(out, desdeRaster(p.relampago[o.relampago]), Math.round(-cx * c.paralaje), Math.round(-cy * c.paralaje), 1, true); continue; }
    if (c.anim?.tipo === 'cuadros' && c.x !== undefined) {
      // tira: el cuadro 0 en su lugar
      const a = c.anim as { w: number; h: number }, r = createRaster(a.w, a.h);
      for (let y = 0; y < a.h; y++) r.data.set(c.img.data.subarray(y * c.img.w * 4, (y * c.img.w + a.w) * 4), y * a.w * 4);
      encima(out, desdeRaster(r), Math.round((c.x ?? 0) - cx * c.paralaje), Math.round((c.y ?? 0) - cy * c.paralaje), 1, c.mezcla === 'sumar');
      continue;
    }
    encima(out, desdeRaster(c.img), Math.round(-cx * c.paralaje), Math.round(-cy * c.paralaje), 1, c.mezcla === 'sumar');
  }
  const base = recortar(out, CAPA.mx, CAPA.my, BASE.w, BASE.h);
  encima(base, desdeRaster(aRaster(capaVineta())));
  if (o.relampago !== undefined) { const d = RELAMPAGO_SEC.destello[o.relampago]; for (let i = 0; i < base.w * base.h; i++) { base.d[i * 4] += d * 0.8; base.d[i * 4 + 1] += d * 0.82; base.d[i * 4 + 2] += d; } }
  return base;
}
