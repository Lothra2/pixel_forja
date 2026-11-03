import { rng } from '../core/rng';
import { objeto, herramientas } from './objeto';
import { pintarEscena, hueso, bulto, masa, type Pieza, type Escena, type V3 } from './render';
import { personajeEscena, type Cuerpo, type Equipo } from './cuerpo';
import type { Dir, Accion } from './figura';
import {
  lamina, mascara, rellenar, trazo, disco, polilinea, desenfocar, desenfocada, pintar, brillo, halo, escalar, desdeRaster, mezcla, sat, suave,
  fbm, hash2, type Lamina, type Mascara, type C3, type P2,
} from './cine';

/**
 * El estudio: lo que comparten las cartas de los actos y las cinemáticas de cierre. Saca modelos del motor 3D (jefes,
 * monstruos, utilería de horror, personajes) a la escala que pida la toma, los ilumina como en una pintura (luz
 * principal de costado, contraluz en el filo, fuego desde abajo, perspectiva aérea) y separa su luz propia (ojos,
 * brasas, vitrales) para que el juego la haga latir. Además trae las herramientas de pintura de ambiente que sirven
 * a cualquier tamaño de lámina: contraluz de siluetas, niebla, lluvia, motas, reflejos, sangre, rayos de luz.
 */

// ------------------------------------------------------------------ modelos del motor a escala de cine
const ev = (v: V3, k: number): V3 => [v[0] * k, v[1] * k, v[2] * k];
/** Las piezas agrandadas k veces (el render del motor mide un pixel por unidad: así salen más grandes y nítidas). */
export function escalarPiezas(ps: Pieza[], k: number): Pieza[] {
  return ps.map((p): Pieza => {
    if (p.k === 'conv') return { ...p, planos: p.planos.map(([n, d]) => [n, d * k] as [V3, number]), pts: p.pts.map((q) => ev(q, k)) };
    if (p.k === 'cono') return { ...p, o: ev(p.o, k), h: p.h * k, r0: p.r0 * k, r1: p.r1 * k };
    if (p.k === 'elip') return { ...p, c: ev(p.c, k), r: ev(p.r, k) };
    const comps = p.comps.map((q) => (q.f === 'hueso'
      ? hueso(ev(q.a, k), ev(q.b, k), q.r0 * k, q.r1 * k, { mat: q.mat, tono: q.tono, k: q.k !== undefined ? q.k * k : undefined })
      : bulto(ev(q.c, k), ev(q.r, k), { ejes: [q.ex, q.ey, q.ez], mat: q.mat, tono: q.tono, k: q.k !== undefined ? q.k * k : undefined })));
    return masa(comps, { mat: p.mat, tono: p.tono, suave: p.suave * k });
  });
}

/** Un render del motor en flotantes y dónde cae el origen del mundo (el piso bajo el centro) en esa imagen. */
export interface Modelo { img: Lamina; ancla: P2 }
const cacheModelos = new Map<string, Modelo>();
let RAPIDO = false;
/** Modo rápido (pruebas): los modelos salen a un tercio de la escala y sin submuestreo. */
export const fijarEstudioRapido = (si: boolean) => { RAPIDO = si; };
export const estudioRapido = () => RAPIDO;
export const vaciarModelos = () => cacheModelos.clear();

function pintarModelo(clave: string, esc: Escena, k: number): Modelo {
  const kk = RAPIDO ? k / 3 : k, ck = `${clave}|${kk}`;
  const hit = cacheModelos.get(ck); if (hit) return hit;
  const r = pintarEscena({
    ...esc, sinSombra: true, ss: RAPIDO ? 1 : 2, piezas: escalarPiezas(esc.piezas, kk),
    resplandor: esc.resplandor ? { ...esc.resplandor, c: ev(esc.resplandor.c, kk), r: esc.resplandor.r * kk } : undefined,
  });
  let img = desdeRaster(r.img), ancla: P2 = [r.ancla[0], r.ancla[1]];
  // en rápido se agranda al tamaño que tendría (así las tomas componen igual, solo que borrosas)
  if (RAPIDO) { img = escalar(img, r.img.w * 3, r.img.h * 3); ancla = [ancla[0] * 3, ancla[1] * 3]; }
  // recortado a lo que se ve: así el alto que pide una toma es el de la figura
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.d[(y * img.w + x) * 4 + 3] > 0.02) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 >= 0 && (x0 > 0 || y0 > 0 || x1 < img.w - 1 || y1 < img.h - 1)) {
    const w = x1 - x0 + 1, h = y1 - y0 + 1, c = lamina(w, h);
    for (let y = 0; y < h; y++) c.d.set(img.d.subarray(((y + y0) * img.w + x0) * 4, ((y + y0) * img.w + x1 + 1) * 4), y * w * 4);
    img = c; ancla = [ancla[0] - x0, ancla[1] - y0];
  }
  const m = { img, ancla };
  cacheModelos.set(ck, m);
  return m;
}
/** Un objeto del catálogo (jefe, monstruo, utilería) en su variante y cuadro, k veces más grande, sin sombra. */
export function modelo(id: string, v: string, f = 0, k = 2, seed = 1): Modelo {
  const a = objeto(id).armar(v, f, herramientas(seed));
  return pintarModelo(`${id}|${v}|${f}|${seed}`, Array.isArray(a) ? { piezas: a } : a, k);
}
/** Un personaje armado con su cuerpo y su equipo (héroe, Vigdis, Auren, Mira...). */
export function modeloPersonaje(clave: string, cu: Cuerpo, eq: Equipo, dir: Dir, acc: Accion, f: number, k = 3): Modelo {
  return pintarModelo(`per|${clave}|${dir}|${acc}|${f}`, personajeEscena(cu, eq, dir, acc, f), k);
}

// ------------------------------------------------------------------ iluminar un modelo como en una pintura
export interface Luz {
  /** multiplica el color del render (tinte y exposición de la escena) */
  amb: C3;
  /** cuánto se lleva a gris antes de teñir (0 = colores del modelo, 1 = solo valores) */
  desat?: number;
  /** luz principal: dirección hacia la luz en pantalla (x, y) y cuánto pesa el degradado de costado */
  clave?: { dir: P2; k: number; c?: C3 };
  /** contraluces: el filo de la silueta del lado (dx, dy) se enciende de color c */
  bordes?: { dx: number; dy: number; c: C3; k: number; ancho?: number }[];
  /** fuego desde abajo: tiñe la parte baja */
  abajo?: { c: C3; k: number };
  /** perspectiva aérea: se acerca al color de la niebla */
  niebla?: { c: C3; k: number };
  /** cuánto de cada pixel del render es luz propia (va a la capa de luz, que late) */
  emite?: (c: C3) => number;
  cEmite?: C3; kEmite?: number;
}
export interface Pose { cuerpo: Lamina; luz: Lamina; alfa: Mascara; ax: number; ay: number }

/** Luz propia típica: rojos y naranjas saturados y claros (brasas, vitrales, ojos). */
export const emiteFuego = (c: C3) => (c[0] > 0.45 && c[0] > c[1] * 1.6 && c[0] > c[2] * 2 ? sat((c[0] - 0.4) * 2.2) : 0);
/** Verdes y celestes saturados (luz de mar, anémonas, fuego fatuo). */
export const emiteMar = (c: C3) => (c[1] > 0.4 && c[1] > c[0] * 1.5 && c[2] > c[0] * 1.2 ? sat((c[1] - 0.35) * 2.4) : 0);
/** Dorados muy claros (oro que brilla, halos). */
export const emiteOro = (c: C3) => (c[0] > 0.7 && c[1] > 0.5 && c[2] < c[1] * 0.7 ? sat((c[0] + c[1] - 1.3) * 2.5) : 0);

/**
 * El modelo escalado a `alto` px (alto de la imagen entera) e iluminado. `espejo` lo da vuelta. Devuelve el cuerpo,
 * su luz propia (ya con resplandor), su alfa y dónde queda el ancla (el pie) en esa imagen.
 */
export function iluminar(m: Modelo, alto: number, luz: Luz, o: { espejo?: boolean } = {}): Pose {
  const s = alto / m.img.h, w = Math.max(2, Math.round(m.img.w * s)), h = Math.max(2, Math.round(alto));
  let im = escalar(m.img, w, h);
  if (o.espejo) { const e = lamina(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) e.d.set(im.d.subarray((y * w + x) * 4, (y * w + x) * 4 + 4), (y * w + w - 1 - x) * 4); im = e; }
  const ax = o.espejo ? w - m.ancla[0] * s : m.ancla[0] * s, ay = m.ancla[1] * s;
  const A = mascara(w, h);
  let top = h, bot = 0, x0 = w, x1 = 0;
  for (let i = 0; i < w * h; i++) { const a = im.d[i * 4 + 3]; A.d[i] = a; if (a > 0.3) { const x = i % w, y = (i - x) / w; top = Math.min(top, y); bot = Math.max(bot, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); } }
  const cx = (x0 + x1) / 2, cy = (top + bot) / 2, tam = Math.max(1, Math.max(x1 - x0, bot - top) / 2);
  const cuerpo = lamina(w, h), luzL = lamina(w, h), em = mascara(w, h);
  const de = luz.desat ?? 0.35, amb = luz.amb, cl = luz.clave, ce = luz.cEmite ?? [1, 0.35, 0.08];
  for (let i = 0; i < w * h; i++) {
    const a = A.d[i]; if (a <= 0.003) continue;
    const j = i * 4, c: C3 = [im.d[j] / a, im.d[j + 1] / a, im.d[j + 2] / a];
    const lum = c[0] * 0.3 + c[1] * 0.55 + c[2] * 0.15;
    let o2: C3 = mezcla(c, [lum, lum, lum], de);
    o2 = [o2[0] * amb[0], o2[1] * amb[1], o2[2] * amb[2]];
    const x = i % w, y = (i - x) / w;
    if (cl) {
      const t = sat(0.5 + (((x - cx) * cl.dir[0] + (y - cy) * cl.dir[1]) / tam) * 0.75), f = 1 - cl.k + cl.k * 1.9 * t * t;
      const cc = cl.c ?? [1, 1, 1];
      o2 = [o2[0] * f * cc[0], o2[1] * f * cc[1], o2[2] * f * cc[2]];
    }
    if (luz.abajo) { const t = sat((y - top) / Math.max(1, bot - top)) ** 2.2 * luz.abajo.k * (0.4 + lum); o2 = [o2[0] + luz.abajo.c[0] * t, o2[1] + luz.abajo.c[1] * t, o2[2] + luz.abajo.c[2] * t]; }
    if (luz.niebla) o2 = mezcla(o2, luz.niebla.c, luz.niebla.k);
    const e = luz.emite ? luz.emite(c) : 0;
    if (e > 0) em.d[i] = e * a;
    cuerpo.d[j] = o2[0] * a; cuerpo.d[j + 1] = o2[1] * a; cuerpo.d[j + 2] = o2[2] * a; cuerpo.d[j + 3] = a;
  }
  // contraluces: lo que queda de la silueta corrida hacia la luz, ancho y fino
  for (const b of luz.bordes ?? []) for (const [mul, kk, bl] of [[1, 1, 0.8], [1.8, 0.3, 1.6]] as [number, number, number][]) {
    const an = (b.ancho ?? 1) * mul, dx = Math.round(b.dx * an), dy = Math.round(b.dy * an), r = mascara(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, a = A.d[i]; if (a <= 0) continue;
      const xx = x + dx, yy = y + dy, a2 = xx >= 0 && yy >= 0 && xx < w && yy < h ? A.d[yy * w + xx] : 0;
      r.d[i] = sat(a - a2);
    }
    desenfocar(r.d, w, h, bl);
    for (let i = 0; i < w * h; i++) r.d[i] *= A.d[i];
    pintar(cuerpo, r, b.c, b.k * kk, 'luz');
  }
  if (luz.emite) {
    const ke = luz.kEmite ?? 1.3;
    brillo(luzL, em, ce, ke);
    brillo(luzL, desenfocada(em, Math.max(2, alto / 90)), ce, ke * 1.2);
    pintar(cuerpo, em, ce, ke * 0.6, 'luz');
  }
  return { cuerpo, luz: luzL, alfa: A, ax, ay };
}
/** Pone la pose con su pie en (x, y) de la capa (y su luz en la capa de luz, si hay). */
export function poner(capa: Lamina, p: Pose, x: number, y: number, capaLuz?: Lamina, k = 1) {
  const ox = Math.round(x - p.ax), oy = Math.round(y - p.ay);
  componer(capa, p.cuerpo, ox, oy, k);
  if (capaLuz) componer(capaLuz, p.luz, ox, oy, k, true);
}
/** b encima de a (alfa premultiplicado), o sumado. */
export function componer(a: Lamina, b: Lamina, ox: number, oy: number, k = 1, sumar = false) {
  const y0 = Math.max(0, -oy), y1 = Math.min(b.h, a.h - oy), x0 = Math.max(0, -ox), x1 = Math.min(b.w, a.w - ox);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const s = (y * b.w + x) * 4, t = ((y + oy) * a.w + x + ox) * 4, al = b.d[s + 3] * k;
    if (sumar) { a.d[t] += b.d[s] * k; a.d[t + 1] += b.d[s + 1] * k; a.d[t + 2] += b.d[s + 2] * k; a.d[t + 3] = Math.min(1, a.d[t + 3] + al); continue; }
    if (al <= 0) continue;
    a.d[t] = a.d[t] * (1 - al) + b.d[s] * k; a.d[t + 1] = a.d[t + 1] * (1 - al) + b.d[s + 1] * k; a.d[t + 2] = a.d[t + 2] * (1 - al) + b.d[s + 2] * k; a.d[t + 3] = a.d[t + 3] * (1 - al) + al;
  }
}
/** La silueta de la pose como máscara en coordenadas de la capa (para sangre, sombras, recortes). */
export function mascaraPose(w: number, h: number, p: Pose, x: number, y: number): Mascara {
  const m = mascara(w, h), ox = Math.round(x - p.ax), oy = Math.round(y - p.ay), pw = p.alfa.w;
  for (let yy = 0; yy < p.alfa.h; yy++) { const ty = yy + oy; if (ty < 0 || ty >= h) continue; for (let xx = 0; xx < pw; xx++) { const tx = xx + ox; if (tx >= 0 && tx < w) m.d[ty * w + tx] = p.alfa.d[yy * pw + xx]; } }
  return m;
}
/** Caja de lo visible de la pose (alfa > 0.4) en coordenadas de la capa si su pie va en (x, y). */
export function cajaPose(p: Pose, x: number, y: number): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let yy = 0; yy < p.alfa.h; yy++) for (let xx = 0; xx < p.alfa.w; xx++) if (p.alfa.d[yy * p.alfa.w + xx] > 0.4) { x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); }
  const ox = Math.round(x - p.ax), oy = Math.round(y - p.ay);
  return { x0: x0 + ox, y0: y0 + oy, x1: x1 + ox, y1: y1 + oy };
}
/** Sombra de contacto: elipse oscura y suave en el piso. */
export function sombraPie(L: Lamina, x: number, y: number, rx: number, ry: number, k = 0.75) {
  const m = mascara(L.w, L.h);
  rellenar(m, Array.from({ length: 28 }, (_, i) => { const t = (i / 28) * Math.PI * 2; return [x + Math.cos(t) * rx, y + Math.sin(t) * ry] as P2; }));
  desenfocar(m.d, L.w, L.h, Math.max(2, ry * 0.6));
  pintar(L, m, [0, 0, 0], k);
}

// ------------------------------------------------------------------ ambiente (a cualquier tamaño)
/** Borde iluminado: lo que queda de la silueta al correrla (dx, dy) hacia la luz. */
export function contraluz(L: Lamina, m: Mascara, dx: number, dy: number, c: C3, k = 1, peso?: (x: number, y: number) => number, blur = 1) {
  const { w, h } = L, b = mascara(w, h);
  for (let y = Math.max(0, -dy); y < Math.min(h, h - dy); y++) for (let x = Math.max(0, -dx); x < Math.min(w, w - dx); x++) {
    const i = y * w + x, v = m.d[i] - m.d[i + dy * w + dx]; if (v > 0) b.d[i] = v * (peso ? peso(x, y) : 1);
  }
  desenfocar(b.d, w, h, blur);
  pintar(L, b, c, k, 'luz');
}
/** Banda de niebla con ruido entre y0 e y1 (con `per` se enrolla en x: sirve para una capa que deriva). */
export function niebla(L: Lamina, y0: number, y1: number, c: C3, k: number, s: number, esc = 160, per = 0) {
  const { w, h } = L, m = mascara(w, h), pr = per ? per / esc : 0;
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(h, y1); y++) for (let x = 0; x < w; x++) {
    const env = suave(y0, y0 + (y1 - y0) * 0.4, y) * (1 - suave(y0 + (y1 - y0) * 0.6, y1, y));
    m.d[y * w + x] = sat((fbm(x / esc, y / (esc * 0.3), 5, s, pr) - 0.35) * 2) * env;
  }
  pintar(L, m, c, k);
}
/** Lluvia en diagonal (trazos finos claros que suman luz). */
export function lluvia(L: Lamina, n: number, ang: number, c: C3, k: number, s: number) {
  const m = mascara(L.w, L.h), r = rng(s);
  for (let i = 0; i < n; i++) { const x = r() * (L.w + 200) - 100, y = r() * L.h, l = 14 + r() * 26; trazo(m, x, y, x + Math.sin(ang) * l, y + Math.cos(ang) * l, 1, 1, 0.3 + r() * 0.7, 'max', false); }
  pintar(L, m, c, k, 'luz');
}
/** Motas que caen o flotan (nieve, ceniza, polvo de oro, brasas), algunas desenfocadas cerca de la cámara. */
export function motas(L: Lamina, n: number, c: C3, k: number, s: number, tam = 1.6, modo: 'luz' | 'normal' | 'brillo' = 'luz', zona?: [number, number, number, number]) {
  const m = mascara(L.w, L.h), cerca = mascara(L.w, L.h), r = rng(s), [zx, zy, zw, zh] = zona ?? [0, 0, L.w, L.h];
  for (let i = 0; i < n; i++) { const x = zx + r() * zw, y = zy + r() * zh, t = r(); if (t > 0.93) disco(cerca, x, y, tam * (3 + r() * 3), 0.5); else disco(m, x, y, tam * (0.5 + t), 0.5 + r() * 0.5); }
  desenfocar(cerca.d, L.w, L.h, 4);
  if (modo === 'brillo') { brillo(L, m, c, k); brillo(L, cerca, c, k * 0.8); return; }
  pintar(L, m, c, k, modo); pintar(L, cerca, c, k * 0.8, modo);
}
/** Reflejo en el agua desde la línea y0 hacia abajo, con ondas, crestas encendidas y el color del agua. */
export function reflejo(L: Lamina, y0: number, agua: C3, k: number, s: number, mas?: Mascara, onda = 1) {
  const { w, h } = L, src = new Float32Array(L.d);
  for (let y = Math.max(0, y0); y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, a = mas ? mas.d[i] : 1; if (a <= 0) continue;
    const prof = (y - y0) / Math.max(1, h - y0), on = (fbm(x / 60, y / 6, 3, s) - 0.5) * (6 + prof * 26) * onda;
    const sy = Math.round(y0 - (y - y0) * 0.9 - 1), sx = Math.round(x + on);
    if (sy < 0 || sx < 0 || sx >= w) continue;
    const j = i * 4, q = (sy * w + sx) * 4, kk = k * (1 - prof * 0.6);
    const c: C3 = [src[q] * kk + agua[0] * (1 - kk), src[q + 1] * kk + agua[1] * (1 - kk), src[q + 2] * kk + agua[2] * (1 - kk)];
    const cresta = suave(0.62, 0.72, fbm(x / 40, y / 3.5, 3, s + 7)) * 0.45;
    L.d[j] = L.d[j] * (1 - a) + (c[0] + src[q] * cresta) * a; L.d[j + 1] = L.d[j + 1] * (1 - a) + (c[1] + src[q + 1] * cresta) * a; L.d[j + 2] = L.d[j + 2] * (1 - a) + (c[2] + src[q + 2] * cresta) * a; L.d[j + 3] = Math.max(L.d[j + 3], a);
  }
}

// ------------------------------------------------------------------ sangre
/** Hilos de sangre que bajan desde (x, y) con su gota al final. */
export function chorreado(m: Mascara, x: number, y: number, ancho: number, largo: number, s: number) {
  const r = rng(s);
  for (let k = 0; k < Math.max(2, ancho / 4); k++) {
    const cx = x + (r() - 0.5) * ancho, l = largo * (0.3 + r() * 0.7), g = 1.2 + r() * 2.2;
    const pts: P2[] = []; for (let t = 0; t <= 6; t++) pts.push([cx + Math.sin(t * 0.9 + k) * 1.2, y + (l * t) / 6]);
    polilinea(m, pts, g, g * 0.7);
    disco(m, cx, y + l + g, g * 1.15);
  }
}
/** Charco de sangre de borde irregular (elipse aplastada por la perspectiva) con salpicaduras alrededor. */
export function charco(m: Mascara, x: number, y: number, rx: number, ry: number, s: number, gotas = 14) {
  const r = rng(s), pts: P2[] = [];
  for (let k = 0; k < 40; k++) { const t = (k / 40) * Math.PI * 2, q = 0.72 + 0.4 * fbm(Math.cos(t) * 1.6 + 5, Math.sin(t) * 1.6 + 5, 3, s); pts.push([x + Math.cos(t) * rx * q, y + Math.sin(t) * ry * q]); }
  rellenar(m, pts);
  for (let k = 0; k < gotas; k++) { const t = r() * Math.PI * 2, d = 1.05 + r() * 0.8; disco(m, x + Math.cos(t) * rx * d, y + Math.sin(t) * ry * d, 1 + r() * Math.max(1.5, rx * 0.05)); }
}
/** Salpicadura: gotas en abanico desde (x, y) hacia el ángulo `ang`. */
export function salpicar(m: Mascara, x: number, y: number, largo: number, ang: number, n: number, s: number) {
  const r = rng(s);
  for (let k = 0; k < n; k++) {
    const a = ang + (r() - 0.5) * 1.3, d = largo * (0.2 + r() * 0.8), g = 0.8 + r() * 2.6 * (1 - d / largo);
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    trazo(m, px, py, px - Math.cos(a) * g * 3, py - Math.sin(a) * g * 3, g * 0.5, g * 1.3, 1, 'max', true);
  }
}
/** Pinta la sangre de la máscara: casi negra, con el filo de arriba encendido por la luz (se ve mojada). */
export function pintarSangre(L: Lamina, m: Mascara, luz: C3 = [0.9, 0.3, 0.2], k = 0.95, brilloK = 0.5) {
  pintar(L, m, [0.2, 0.008, 0.01], k);
  const g = mascara(L.w, L.h);
  for (let y = 2; y < L.h; y++) for (let x = 0; x < L.w; x++) { const i = y * L.w + x; g.d[i] = sat(m.d[i] - m.d[i - 2 * L.w]) * m.d[i]; }
  pintar(L, g, luz, brilloK, 'luz');
}

// ------------------------------------------------------------------ luz
/**
 * Haces de luz (volumétrica): un abanico de rayos desde (x, y) hacia el ángulo `ang`, con `abre` de apertura, cortados
 * con ruido para que se vean entre polvo. En una lámina transparente (para la capa que se suma).
 */
export function haces(L: Lamina, x: number, y: number, ang: number, abre: number, largo: number, c: C3, k: number, s: number, rayas = 26) {
  const m = mascara(L.w, L.h);
  for (let yy = 0; yy < L.h; yy++) for (let xx = 0; xx < L.w; xx++) {
    const dx = xx - x, dy = yy - y, d = Math.hypot(dx, dy); if (d < 1 || d > largo) continue;
    let da = Math.atan2(dy, dx) - ang; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    const u = da / abre; if (Math.abs(u) > 1) continue;
    const raya = 0.45 + 0.55 * fbm(u * rayas, 0.5, 3, s) ** 1.5 * 1.6, polvo = 0.75 + 0.5 * fbm(xx / 50, yy / 50, 3, s + 3);
    m.d[yy * L.w + xx] = (1 - u * u) ** 1.5 * raya * polvo * Math.exp(-d / (largo * 0.45)) * suave(0, largo * 0.05, d);
  }
  brillo(L, m, c, k);
}
/** Estela de una brasa que vuela: cabeza brillante y cola que se abre y se apaga (en una capa transparente). */
export function estela(L: Lamina, pts: P2[], ancho: number, c: C3, k = 1) {
  const m = mascara(L.w, L.h), n = pts.length;
  for (let i = 0; i + 1 < n; i++) { const t = i / (n - 1); trazo(m, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], ancho * (0.15 + t * 0.85), ancho * (0.15 + (i + 1) / (n - 1) * 0.85), t * t, 'max'); }
  brillo(L, desenfocada(m, ancho * 1.5), c, k * 0.8);
  brillo(L, desenfocada(m, ancho * 0.4), mezcla(c, [1, 1, 1], 0.4), k);
  const [hx, hy] = pts[n - 1];
  halo(L, hx, hy, ancho * 9, c, k * 0.9, 1, true); halo(L, hx, hy, ancho * 2.5, [1, 0.95, 0.8], k * 1.4, 1, true);
}
/** Grietas que salen de (x, y): ramas quebradas con hijos (hielo, piedra, vidrio, piel). En una máscara. */
export function grietas(m: Mascara, x: number, y: number, largo: number, n: number, s: number, grueso = 2.2, aplasta = 1) {
  const r = rng(s);
  const rama = (px: number, py: number, a: number, l: number, g: number, prof: number) => {
    const pts: P2[] = [[px, py]]; let cx = px, cy = py, aa = a;
    const pasos = 5 + Math.floor(r() * 4);
    for (let i = 0; i < pasos; i++) { aa += (r() - 0.5) * 0.7; const st = l / pasos; cx += Math.cos(aa) * st; cy += Math.sin(aa) * st * aplasta; pts.push([cx, cy]); if (prof < 2 && r() < 0.3) rama(cx, cy, aa + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), l * 0.45, g * 0.6, prof + 1); }
    polilinea(m, pts, g, g * 0.25);
  };
  for (let k = 0; k < n; k++) rama(x, y, (k / n) * Math.PI * 2 + r() * 0.5, largo * (0.6 + r() * 0.5), grueso, 0);
}
/** Piso de cueva o cripta en perspectiva: baldosas o losas que se achican hacia el fondo, con su textura. */
export function losas(L: Lamina, y0: number, y1: number, c: C3, s: number, fuga: P2, filas = 9) {
  const { w } = L, m = mascara(L.w, L.h), juntas = mascara(L.w, L.h);
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(L.h, y1); y++) for (let x = 0; x < w; x++) m.d[y * w + x] = 1;
  for (let k = 0; k <= filas; k++) { const t = (k / filas) ** 2.1, y = y0 + (y1 - y0) * t; trazo(juntas, 0, y, w, y, 1 + t * 2.5, 1 + t * 2.5, 0.8, 'max', false); }
  for (let k = -12; k <= 12; k++) { const xb = fuga[0] + k * 150; trazo(juntas, fuga[0] + (xb - fuga[0]) * 0.18, y0, xb, y1 + 40, 1, 4, 0.8, 'max', false); }
  for (let i = 0; i < w * L.h; i++) juntas.d[i] *= m.d[i];
  const r0 = mascara(L.w, L.h); r0.d.set(m.d);
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(L.h, y1); y++) for (let x = 0; x < w; x++) r0.d[y * w + x] *= 0.75 + 0.5 * fbm(x / 40, y / 14, 4, s);
  pintar(L, m, [0, 0, 0], 1);
  pintar(L, r0, c, 1, 'luz');
  pintar(L, juntas, [0, 0, 0], 0.6);
}
/** Muro de cráneos (osario): filas de calaveras con las cuencas negras, en una máscara de relieve y otra de huecos. */
export function osario(fig: Mascara, huecos: Mascara, x0: number, y0: number, x1: number, y1: number, r: number, s: number) {
  const rr = rng(s);
  for (let y = y0, fila = 0; y < y1; y += r * 1.75, fila++) for (let x = x0 + (fila % 2) * r; x < x1; x += r * 2.05) {
    const q = r * (0.85 + rr() * 0.3), cx = x + (rr() - 0.5) * r * 0.3, cy = y + (rr() - 0.5) * r * 0.2;
    disco(fig, cx, cy, q); rellenar(fig, [[cx - q * 0.55, cy + q * 0.5], [cx + q * 0.55, cy + q * 0.5], [cx + q * 0.4, cy + q * 1.05], [cx - q * 0.4, cy + q * 1.05]]);
    disco(huecos, cx - q * 0.38, cy + q * 0.12, q * 0.27); disco(huecos, cx + q * 0.38, cy + q * 0.12, q * 0.27);
    rellenar(huecos, [[cx, cy + q * 0.4], [cx - q * 0.12, cy + q * 0.62], [cx + q * 0.12, cy + q * 0.62]]);
    if (rr() < 0.5) for (let d = -2; d <= 2; d++) trazo(huecos, cx + d * q * 0.16, cy + q * 0.8, cx + d * q * 0.16, cy + q * 1.02, q * 0.07, q * 0.07, 1, 'max', false);
  }
}
/** Bloques de piedra (muro, columna): juntas oscuras en una máscara; la textura la pone quien pinta. */
export function sillares(m: Mascara, x0: number, y0: number, x1: number, y1: number, alto: number, ancho: number, s: number) {
  const r = rng(s);
  for (let y = y0, f = 0; y < y1; y += alto, f++) {
    trazo(m, x0, y, x1, y, 1.6, 1.6, 1, 'max', false);
    for (let x = x0 + (f % 2) * ancho * 0.5 + r() * 10; x < x1; x += ancho * (0.7 + r() * 0.6)) trazo(m, x, y, x, y + alto, 1.4, 1.4, 1, 'max', false);
  }
}
/** Cuerpos de fondo (siluetas de muertos amontonados): bultos con brazos y cabezas que asoman. */
export function montonCuerpos(m: Mascara, x0: number, x1: number, y: number, alto: number, s: number) {
  const r = rng(s);
  for (let x = x0; x < x1; x += alto * (0.35 + r() * 0.3)) {
    const hh = alto * (0.4 + r() * 0.6) * Math.sin(Math.PI * sat((x - x0) / (x1 - x0)) * 0.9 + 0.15);
    rellenar(m, Array.from({ length: 14 }, (_, k) => { const t = Math.PI + (k / 13) * Math.PI; return [x + Math.cos(t) * alto * 0.4, y + Math.sin(t) * hh] as P2; }));
    if (r() < 0.55) disco(m, x + (r() - 0.5) * alto * 0.4, y - hh * (0.8 + r() * 0.3), alto * 0.09);
    if (r() < 0.6) { const a = -Math.PI / 2 + (r() - 0.5) * 1.6, l = alto * (0.3 + r() * 0.4), bx = x + (r() - 0.5) * alto * 0.3, by = y - hh * 0.7; trazo(m, bx, by, bx + Math.cos(a) * l, by + Math.sin(a) * l, alto * 0.05, alto * 0.035); for (let d = -1; d <= 1; d++) trazo(m, bx + Math.cos(a) * l, by + Math.sin(a) * l, bx + Math.cos(a + d * 0.4) * l * 1.18, by + Math.sin(a + d * 0.4) * l * 1.18, alto * 0.015, alto * 0.01); }
  }
}
/** Haz de ruido de nubes bajas y humo pintado con alfa (para capas de niebla y humo que derivan). */
export function bruma(w: number, h: number, y0: number, y1: number, c: C3, k: number, s: number, esc = 180, per = 0): Lamina {
  const L = lamina(w, h); niebla(L, y0, y1, c, k, s, esc, per); return L;
}
/** Hash de un pixel útil para dispersión de detalles. */
export const azar = (x: number, y: number, s: number) => hash2(x, y, s);
