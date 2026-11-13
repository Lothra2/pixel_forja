import { createRaster, type Raster } from '../core/raster';
import { KZ, hash3, caja, poliedro, pintarEscena, type Pieza, type Render, type V3 } from './render';

/**
 * Portales vivos: un arco gótico de piedra (o una grieta en el aire con los bordes rotos) y adentro un vórtice
 * animado con profundidad, chispas que salen y la luz que derrama sobre las piedras; aparte, un decal de luz para el
 * piso que el juego suma en 'screen'.
 *
 * El portal mira a la cámara: su plano corre a lo largo de U = (1, -1)/√2 y sube en z, así en pantalla una unidad de
 * U son √2 px de ancho y una de z son KZ px de alto. El arco se arma con piezas (render.ts) en dos mitades, la de
 * atrás y la de adelante del plano; el vórtice se pinta por pixel en el plano y va entre las dos. Todo es un bucle
 * de 16 cuadros sin costura: los brazos del vórtice tienen simetría de k vueltas y giran 1/k de vuelta por bucle,
 * su fase en el radio corre una vuelta entera por bucle, el detalle fino se arrastra con tres fases (pesos sen² que
 * suman siempre lo mismo) y cada chispa vive en una fase propia módulo 1.
 *
 * Tipos: `pueblo` (arco de piedra clara y gastada, vórtice cálido de ámbar con el centro luminoso: la vuelta a casa),
 * `mazmorra` (grieta en el aire con costra negra y esquirlas que flotan, vórtice frío verde mar con el centro que se
 * hunde en negro) e `infierno` (arco ennegrecido y roto con grietas que arden, vórtice rojo sangre con el centro
 * oscuro y rescoldos).
 */

export const CUADROS_PORTAL = 16;
export const TIPOS_PORTAL = ['pueblo', 'mazmorra', 'infierno'] as const;
export type TipoPortal = (typeof TIPOS_PORTAL)[number];

const PI = Math.PI, PI2 = PI * 2, R2 = Math.SQRT2;
const cl = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const sm = (a: number, b: number, v: number) => { const t = cl((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
type C3 = [number, number, number];
const hex = (h: string): C3 => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mixC = (a: C3, b: C3, t: number): C3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
/** Ruido de valor con período `pa` en a (el ángulo) y libre en b. */
function vn(a: number, b: number, pa: number, s: number): number {
  const ai = Math.floor(a), bi = Math.floor(b), fa = a - ai, fb = b - bi, u = fa * fa * (3 - 2 * fa), v = fb * fb * (3 - 2 * fb);
  const a0 = ((ai % pa) + pa) % pa, a1 = (a0 + 1) % pa;
  const h = (i: number, j: number) => hash3(i, j, s);
  return (h(a0, bi) * (1 - u) + h(a1, bi) * u) * (1 - v) + (h(a0, bi + 1) * (1 - u) + h(a1, bi + 1) * u) * v;
}

// ------------------------------------------------------------------ paletas (un acento por portal, el resto piedra)
interface Paleta { rampa: C3[]; nucleo: C3; centroLuz: boolean; chispa: [C3, C3]; luz: string; piedra: string; borde: C3 }
const PAL: Record<TipoPortal, Paleta> = {
  pueblo: {
    rampa: ['#120a05', '#3a1d0b', '#7a3e12', '#b8681e', '#e09a3e', '#f4cf86', '#fff1d2'].map(hex), nucleo: hex('#fff6e0'), centroLuz: true,
    chispa: [hex('#ffb24a'), hex('#ffe9b0')], luz: '#ffae55', piedra: 'piedra_gris', borde: hex('#ffcf80'),
  },
  mazmorra: {
    rampa: ['#010306', '#041318', '#0b2e33', '#155a5e', '#2a8a86', '#6cc4b8', '#d2f4ec'].map(hex), nucleo: hex('#000000'), centroLuz: false,
    chispa: [hex('#5fd0c4'), hex('#e0fff8')], luz: '#4ab8b0', piedra: 'marmol_negro', borde: hex('#9ff0e4'),
  },
  infierno: {
    rampa: ['#050000', '#1e0303', '#4e0807', '#8a1209', '#c42d10', '#f06a26', '#ffc07a'].map(hex), nucleo: hex('#000000'), centroLuz: false,
    chispa: [hex('#ff5a1e'), hex('#ffc070')], luz: '#e0401a', piedra: 'marmol_negro', borde: hex('#ff8040'),
  },
};
const rampa = (p: Paleta, t: number): C3 => { const x = cl(t) * (p.rampa.length - 1), i = Math.min(p.rampa.length - 2, Math.floor(x)); return mixC(p.rampa[i], p.rampa[i + 1], x - i); };

// ------------------------------------------------------------------ geometría del arco (en el plano: u de lado, z arriba)
const U: V3 = [1 / R2, -1 / R2, 0], D: V3 = [1 / R2, 1 / R2, 0];
const enMundo = (u: number, d: number, z: number): V3 => [U[0] * u + D[0] * d, U[1] * u + D[1] * d, z];
/** Medidas del arco: ancho del vano, arranque del arco, espesor del anillo, fondo (de atrás a adelante). */
const ARCO = { vano: 30, arranque: 32, anillo: 7, fondo: 10 };
const cumbre = ARCO.arranque + ARCO.vano * 0.866;
/** Dentro del vano ojival (u, z), con su distancia al borde (positiva adentro). */
function enVano(u: number, z: number): number {
  const w = ARCO.vano, h = w / 2;
  if (z < 0) return -1;
  if (z <= ARCO.arranque) return Math.min(h - Math.abs(u), z + 2);
  // dos arcos de radio w con centro en (±w/2, arranque): adentro de los dos
  const d1 = w - Math.hypot(u - h, z - ARCO.arranque), d2 = w - Math.hypot(u + h, z - ARCO.arranque);
  return Math.min(d1, d2);
}
/** La grieta: un huso vertical con el borde roto (picos), centrado en z = 34. */
const GRIETA = { zc: 35, ru: 14, rz: 31 };
function enGrieta(u: number, z: number, seed = 3): number {
  const du = u / GRIETA.ru, dz = (z - GRIETA.zc) / GRIETA.rz, r = Math.hypot(du, dz), th = Math.atan2(dz, du);
  // huso: más fino arriba y abajo; picos que entran y salen (ruido del ángulo con período entero)
  const a = (th / PI2 + 1) * 28, pico = Math.abs(vn(a, 0.5, 28, seed) - 0.5) * 2, fino = vn(a * 3, 3.5, 84, seed + 1);
  const borde = 1 - 0.32 * pico - 0.08 * fino;
  return (borde - r) * Math.min(GRIETA.ru, GRIETA.rz * 0.6);
}

function piezasArco(tipo: TipoPortal, mitad: 'atras' | 'adelante' | 'todo', seed: number): Pieza[] {
  const ps: Pieza[] = [], { vano: w, arranque: zs, anillo: A, fondo: F } = ARCO, h = w / 2;
  let k = 0; const r = () => hash3(k++, seed, 17);
  const mat = PAL[tipo].piedra, roto = tipo === 'infierno';
  const capas: [number, number][] = mitad === 'atras' ? [[-F / 2, 0]] : mitad === 'adelante' ? [[0, F / 2]] : [[-F / 2, F / 2]];
  const bloque = (u0: number, u1: number, z0: number, z1: number, d0: number, d1: number, m = mat, tono = 0) => {
    const pts: V3[] = [];
    for (const u of [u0, u1]) for (const z of [z0, z1]) for (const d of [d0, d1]) pts.push(enMundo(u, d, z));
    ps.push(poliedro(pts, { mat: m, tono }));
  };
  for (const [d0, d1] of capas) {
    // basas: un escalón más ancho al pie de cada jamba
    for (const s of [-1, 1]) {
      const u0 = s * h, u1 = s * (h + A + 3);
      bloque(Math.min(u0, u1) - (s < 0 ? 0 : 0), Math.max(u0, u1), 0, 4, d0 - (d0 < 0 ? 1.5 : 0), d1 + (d1 > 0 ? 1.5 : 0), mat, -0.06);
      // jambas: sillares alternados (uno largo hacia afuera, uno corto)
      let z = 4, i = 0;
      while (z < zs) {
        const alto = Math.min(zs - z, 6 + r() * 2.5), ancho = A + (i % 2 ? 2.2 : 0) + (r() - 0.5);
        const a0 = s * h, a1 = s * (h + ancho);
        bloque(Math.min(a0, a1), Math.max(a0, a1), z + 0.25, z + alto - 0.25, d0, d1, mat, (r() - 0.5) * 0.12);
        z += alto; i++;
      }
    }
    // dovelas del arco ojival: dos arcos de radio w, del arranque a la clave
    const n = 7;
    for (const s of [-1, 1]) for (let j = 0; j < n; j++) {
      if (roto && s > 0 && j >= n - 2) continue; // al infierno le falta un pedazo del arco
      const a0 = PI - (j / n) * (PI / 3), a1 = PI - ((j + 1) / n) * (PI / 3) + 0.012;
      // el arco de la izquierda (s = -1) tiene su centro en (+h, arranque); el de la derecha es su espejo
      const pts: V3[] = [];
      for (const a of [a0, a1]) for (const R of [w, w + A + (j % 2 ? 1.2 : 0)]) for (const d of [d0, d1]) pts.push(enMundo(-s * (h + Math.cos(a) * R), d, zs + Math.sin(a) * R));
      ps.push(poliedro(pts, { mat, tono: (r() - 0.5) * 0.1 }));
    }
    // clave: un bloque que sobresale arriba
    if (!roto) bloque(-3, 3, cumbre - 1, cumbre + A + 3, d0 - (d0 < 0 ? 1 : 0), d1 + (d1 > 0 ? 1 : 0), mat, 0.04);
  }
  if (mitad !== 'atras') {
    // musgo o grietas que arden, por delante
    if (tipo === 'pueblo') for (let i = 0; i < 5; i++) { const s = r() < 0.5 ? -1 : 1, z = 3 + r() * 20; ps.push(caja(...enMundo(s * (h + 1 + r() * A), F / 2 + 0.2, z), 2.5 + r() * 2, 1, 1.4 + r(), { mat: 'piedra_musgo', giro: -45 })); }
    if (tipo === 'infierno') for (let i = 0; i < 7; i++) { const s = r() < 0.5 ? -1 : 1, z = 2 + r() * 28; ps.push(caja(...enMundo(s * (h + 1.5 + r() * (A - 2)), F / 2 + 0.15, z), 0.7, 0.5, 3 + r() * 5, { mat: 'portal_rojo', giro: -45 + (r() - 0.5) * 40 })); }
  }
  return ps;
}
/** Esquirlas de la grieta: piedras negras que flotan alrededor del borde y suben y bajan (bucle). */
function esquirlas(f: number, seed: number): Pieza[] {
  const ps: Pieza[] = [], t = f / CUADROS_PORTAL;
  for (let i = 0; i < 9; i++) {
    const th = (i / 9) * PI2 + hash3(i, seed, 1) * 0.5, rr = 1.18 + hash3(i, seed, 2) * 0.3;
    const u = Math.cos(th) * GRIETA.ru * rr * 1.25, z = GRIETA.zc + Math.sin(th) * GRIETA.rz * rr + Math.sin(PI2 * (t + hash3(i, seed, 3))) * 1.6;
    const s = 1.4 + hash3(i, seed, 4) * 2.2, c = enMundo(u, (hash3(i, seed, 5) - 0.5) * 4, z);
    const pts: V3[] = [];
    for (let j = 0; j < 5; j++) pts.push([c[0] + (hash3(i, j, seed + 6) - 0.5) * s * 2, c[1] + (hash3(i, j, seed + 7) - 0.5) * s * 2, c[2] + (hash3(i, j, seed + 8) - 0.5) * s * 2.6]);
    ps.push(poliedro(pts, { mat: 'marmol_negro', tono: -0.1 }));
  }
  return ps;
}

/** Las piezas del portal entero (para el mapa, las cinemáticas y la luz del juego). */
export function piezasPortal(tipo: TipoPortal, seed = 1): { piezas: Pieza[]; resplandor: { c: V3; r: number; color: string } } {
  const piezas = tipo === 'mazmorra' ? esquirlas(0, seed) : piezasArco(tipo, 'todo', seed);
  // el vano lleno de luz (para que la luz del juego lo cuente como fuente)
  piezas.push(caja(...enMundo(0, 0, 4), tipo === 'mazmorra' ? 14 : 20, 1, 40, { mat: tipo === 'pueblo' ? 'fuego' : tipo === 'mazmorra' ? 'magia' : 'portal_rojo', giro: -45 }));
  return { piezas, resplandor: { c: [0, 0, 36], r: 60, color: PAL[tipo].luz } };
}

// ------------------------------------------------------------------ el vórtice
/**
 * Brillo del vórtice en (u, z) del plano: brazos en espiral de dos capas (k = 3 y 5, giran en sentidos contrarios),
 * detalle que se arrastra hacia el centro y el núcleo (luz o vacío). Devuelve la intensidad 0..1+ y cuánto es núcleo.
 */
function vortice(tipo: TipoPortal, u: number, z: number, t: number): [number, number] {
  const zc = tipo === 'mazmorra' ? GRIETA.zc : ARCO.arranque + 4, ru = tipo === 'mazmorra' ? GRIETA.ru : ARCO.vano / 2, rz = tipo === 'mazmorra' ? GRIETA.rz : (cumbre - 4) / 2;
  const du = u / ru, dz = (z - zc) / rz, rho = Math.hypot(du, dz) + 1e-4, th = Math.atan2(dz, du);
  const L = Math.log(rho + 0.04);
  // brazos en espiral logarítmica: 3 brazos que giran 1/3 de vuelta por bucle y se enroscan hacia el centro
  const b1 = sm(0.25, 0.95, 0.5 + 0.5 * Math.cos(3 * (th - PI2 * t / 3) + 5.2 * L - PI2 * t));
  // capa rápida, al revés y más fina: 5 brazos, 2/5 de vuelta por bucle
  const b2 = sm(0.45, 1, 0.5 + 0.5 * Math.cos(5 * (th + (PI2 * 2 * t) / 5) - 8 * L + PI2 * 2 * t));
  // anillos del túnel que se meten hacia el centro (dos por bucle): dan la profundidad
  const an = 0.5 + 0.5 * Math.cos(9 * L + PI2 * 2 * t);
  // detalle: ruido en (ángulo, log radio) que cae hacia el centro, con tres fases
  let det = 0;
  for (let i = 0; i < 3; i++) {
    const ph = (t + i / 3) % 1, w = Math.sin(PI * ph) ** 2 / 1.5;
    det += w * vn((th / PI2 + 1) * 20 + i * 7.3 + ph * 2, (L + ph * 1.6) * 5 + i * 3.1, 20, 90 + i);
  }
  let I = 0.5 * b1 * (0.75 + 0.25 * an) + 0.2 * b2 + 0.16 * an * sm(1.1, 0.3, rho) + 0.26 * det * (0.6 + 0.4 * b1);
  // profundidad: el túnel se aclara (o se apaga) hacia el centro y se oscurece hacia el borde de afuera
  const nucleo = Math.exp(-((rho / 0.2) ** 2));
  if (PAL[tipo].centroLuz) I = I * (0.45 + 0.75 * sm(1.1, 0.15, rho)) + nucleo * 0.9;
  else I = I * sm(0.08, 0.6, rho) * (0.7 + 0.5 * sm(1.15, 0.5, rho)) - nucleo * 0.4;
  return [I, nucleo];
}

// ------------------------------------------------------------------ chispas
interface Chispa { th: number; r0: number; b: number; v: number; sube: number; tam: number; c: number }
function chispas(tipo: TipoPortal, seed: number): Chispa[] {
  const out: Chispa[] = [];
  for (let i = 0; i < 46; i++) out.push({ th: hash3(i, seed, 21) * PI2, r0: 0.35 + hash3(i, seed, 22) * 0.6, b: hash3(i, seed, 23), v: 0.6 + hash3(i, seed, 24) * 0.9, sube: tipo === 'mazmorra' ? -0.2 + hash3(i, seed, 25) * 0.5 : 0.4 + hash3(i, seed, 25) * 0.9, tam: hash3(i, seed, 26), c: hash3(i, seed, 27) });
  return out;
}

// ------------------------------------------------------------------ pintar
export const LIENZO_PORTAL = { w: 132, h: 150, ax: 66, ay: 118 };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const cacheArco = new Map<string, { atras: Raster | null; adelante: Raster | null }>();

/** Pinta el portal (cuadro f de CUADROS_PORTAL). El ancla es el centro de su base en el piso. */
export function pintarPortal(tipo: TipoPortal, f: number, seed = 1): Render {
  const L = LIENZO_PORTAL, pal = PAL[tipo], t = (((f % CUADROS_PORTAL) + CUADROS_PORTAL) % CUADROS_PORTAL) / CUADROS_PORTAL;
  const fijo = { w: L.w, h: L.h, ax: L.ax, ay: L.ay };
  let arco = cacheArco.get(tipo + seed);
  if (!arco) {
    const res = { c: [0, 2, 36] as V3, r: tipo === 'infierno' ? 30 : 46, color: pal.luz };
    // abajo el arco entero con su sombra en el piso; el vórtice encima; y encima la mitad de adelante sin sombra
    arco = tipo === 'mazmorra' ? { atras: null, adelante: null } : {
      atras: pintarEscena({ piezas: piezasArco(tipo, 'todo', seed), resplandor: res }, {}, fijo).img,
      adelante: pintarEscena({ piezas: piezasArco(tipo, 'adelante', seed), resplandor: res, sinSombra: true }, {}, fijo).img,
    };
    cacheArco.set(tipo + seed, arco);
  }
  const img = createRaster(L.w, L.h), d = img.data;
  const sobre = (src: Raster | null) => { if (!src) return; const s = src.data; for (let i = 0; i < d.length; i += 4) { const a = s[i + 3] / 255; if (!a) continue; const ad = d[i + 3] / 255, ao = a + ad * (1 - a); for (let k = 0; k < 3; k++) d[i + k] = (s[i + k] * a + d[i + k] * ad * (1 - a)) / ao; d[i + 3] = ao * 255; } };
  sobre(arco.atras);
  // la grieta: esquirlas de atrás (las que quedan detrás del plano se pintan antes)
  if (tipo === 'mazmorra') sobre(pintarEscena({ piezas: esquirlas(f, seed), resplandor: { c: [0, 0, GRIETA.zc], r: 44, color: pal.luz } }, {}, fijo).img);
  // el vórtice (con 2×2 muestras por pixel en el borde)
  const pulso = 0.9 + 0.1 * Math.sin(PI2 * t);
  for (let py = 0; py < L.h; py++) for (let px = 0; px < L.w; px++) {
    let R = 0, G = 0, B = 0, A = 0;
    for (let q = 0; q < 4; q++) {
      const sx = px - L.ax + ((q % 2) + 0.5) / 2, sy = py - L.ay + (Math.floor(q / 2) + 0.5) / 2;
      const u = sx / R2, z = -sy / KZ;
      const dv = tipo === 'mazmorra' ? enGrieta(u, z, seed) : enVano(u, z);
      if (dv <= 0) continue;
      const [I0, nuc] = vortice(tipo, u, z, t);
      // borde del vano: un hilo de luz donde el vórtice toca la piedra (o la costa de la grieta)
      const filo = Math.exp(-dv / (tipo === 'mazmorra' ? 1.1 : 1.6));
      const I = cl((I0 + filo * 0.55) * pulso, 0, 1.2);
      let c = rampa(pal, I);
      if (pal.centroLuz) c = mixC(c, pal.nucleo, cl(nuc * 0.85));
      else c = mixC(c, pal.nucleo, cl(nuc * 0.9));
      c = mixC(c, pal.borde, filo * 0.45 * pulso);
      // la grieta: costra negra en el borde de afuera, con grietas de luz
      if (tipo === 'mazmorra' && dv < 1.4) c = mixC(c, [0.02, 0.03, 0.035], sm(1.4, 0.3, dv) * 0.85);
      R += c[0]; G += c[1]; B += c[2]; A += 1;
    }
    if (!A) continue;
    const o = (py * L.w + px) * 4, a = A / 4, ad = d[o + 3] / 255, ao = a + ad * (1 - a);
    const tr = (BAYER[(py & 3) * 4 + (px & 3)] - 0.5) * 2;
    const nr = cl((R / A) * 255 + tr, 0, 255), ng = cl((G / A) * 255 + tr, 0, 255), nb = cl((B / A) * 255 + tr, 0, 255);
    d[o] = (nr * a + d[o] * ad * (1 - a)) / ao; d[o + 1] = (ng * a + d[o + 1] * ad * (1 - a)) / ao; d[o + 2] = (nb * a + d[o + 2] * ad * (1 - a)) / ao; d[o + 3] = ao * 255;
  }
  sobre(arco.adelante);
  // la luz del vórtice sobre las piedras: más cerca del vano, más luz; late con el vórtice
  const lc = hex(pal.luz);
  if (tipo !== 'mazmorra') for (let py = 0; py < L.h; py++) for (let px = 0; px < L.w; px++) {
    const o = (py * L.w + px) * 4; if (!d[o + 3]) continue;
    const u = (px - L.ax + 0.5) / R2, z = -(py - L.ay + 0.5) / KZ, dv = enVano(u, z);
    if (dv > 0) continue;
    const k = Math.exp(dv / 5) * (tipo === 'infierno' ? 0.28 : 0.5) * pulso;
    for (let c = 0; c < 3; c++) d[o + c] = Math.min(255, d[o + c] + lc[c] * 255 * k * (1 - d[o + c] / 400));
  }
  // chispas: salen del vórtice, se abren y suben (brasas) o se esparcen (escarcha); cada una con su fase
  const zc = tipo === 'mazmorra' ? GRIETA.zc : ARCO.arranque + 4, ru = tipo === 'mazmorra' ? GRIETA.ru : ARCO.vano / 2, rz = tipo === 'mazmorra' ? GRIETA.rz : (cumbre - 4) / 2;
  for (const ch of chispas(tipo, seed)) {
    const edad = (t - ch.b + 1) % 1; if (edad > 0.7) continue;
    const e = edad / 0.7, r = ch.r0 + e * ch.v * 0.9;
    const u = Math.cos(ch.th + e * 0.8) * ru * r, z = zc + Math.sin(ch.th + e * 0.8) * rz * r * 0.8 + e * ch.sube * 26;
    const dd = e * 14 * ch.v; // hacia la cámara: en pantalla baja un poco
    const sx = u * R2 + L.ax, sy = -z * KZ + dd * 0.35 + L.ay;
    const brillo = Math.sin(PI * Math.min(1, e * 1.4)) * (1 - e * 0.5), tam = 0.7 + ch.tam * 0.9;
    const col = mixC(pal.chispa[0], pal.chispa[1], ch.c * (1 - e));
    for (let y = Math.floor(sy - 2); y <= sy + 2; y++) for (let x = Math.floor(sx - 2); x <= sx + 2; x++) {
      if (x < 0 || y < 0 || x >= L.w || y >= L.h) continue;
      const q = Math.max(0, 1 - Math.hypot(x + 0.5 - sx, y + 0.5 - sy) / (tam + 0.6)) * brillo; if (q <= 0.02) continue;
      const o = (y * L.w + x) * 4, ad = d[o + 3] / 255, ao = q + ad * (1 - q);
      for (let c = 0; c < 3; c++) d[o + c] = Math.min(255, (col[c] * 255 * q + d[o + c] * ad * (1 - q)) / ao + (ad > 0 ? col[c] * 255 * q * 0.5 : 0));
      d[o + 3] = Math.max(d[o + 3], ao * 255);
    }
  }
  return { img, ancla: [L.ax, L.ay] };
}

// ------------------------------------------------------------------ la luz en el piso (para sumar en 'screen')
export const LIENZO_LUZ = { w: 240, h: 124, ax: 120, ay: 56 };
/**
 * La luz que el portal derrama en el piso: una mancha 2:1 delante del portal que late con el vórtice y lleva cinco
 * haces tenues que giran (los brazos del vórtice proyectados). Color con alfa = intensidad: sumada en 'screen' (o
 * 'lighter') tiñe el piso y lo que haya encima; en modo normal sería un velo, no un rectángulo negro.
 */
export function pintarLuzPortal(tipo: TipoPortal, f: number): Render {
  const L = LIENZO_LUZ, img = createRaster(L.w, L.h), t = (((f % CUADROS_PORTAL) + CUADROS_PORTAL) % CUADROS_PORTAL) / CUADROS_PORTAL;
  const c = hex(PAL[tipo].luz), pulso = 0.86 + 0.14 * Math.sin(PI2 * t);
  for (let py = 0; py < L.h; py++) for (let px = 0; px < L.w; px++) {
    const sx = px - L.ax + 0.5, sy = py - L.ay + 0.5;
    // del pixel al piso (z = 0), con el centro de la mancha corrido hacia la cámara (+x+y)
    const x = (2 * sy + sx) / 2 - 10, y = (2 * sy - sx) / 2 - 10, r = Math.hypot(x, y) / 62;
    if (r >= 1) continue;
    const th = Math.atan2(y, x);
    const haz = 1 + 0.22 * Math.cos(5 * (th - (PI2 * t) / 5)) * sm(0.15, 0.6, r);
    // detrás del portal (−x−y) casi nada: la luz sale por delante
    const frente = sm(-0.9, 0.4, (x + y) / 62 + 0.35);
    const I = Math.pow(1 - r, 2.2) * haz * pulso * (0.35 + 0.65 * frente);
    const o = (py * L.w + px) * 4, tr = (BAYER[(py & 3) * 4 + (px & 3)] - 0.5) * 2;
    img.data[o] = cl(c[0] * 255 + tr, 0, 255); img.data[o + 1] = cl(c[1] * 255 + tr, 0, 255); img.data[o + 2] = cl(c[2] * 255 + tr, 0, 255);
    // el centro satura (alfa lleno): es la luz más fuerte, al pie del vano
    img.data[o + 3] = cl(Math.round(Math.min(1, I * 1.35) * 255 + tr), 0, 255);
  }
  return { img, ancla: [L.ax, L.ay] };
}
