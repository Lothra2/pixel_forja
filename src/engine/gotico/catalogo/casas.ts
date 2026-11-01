import { registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';

/**
 * Casas y edificios del pueblo: casas de entramado, cabañas de piedra con techo de paja, posada, herrería,
 * capilla, atalayas, molino, establo, granero, torre de guardia, choza y mercado. Son los assets más grandes del
 * taller (huella de 2×2 a 3×3 baldosas, 90–170 de alto). Las caras que se ven son las que miran a +x (abajo a la
 * derecha, en sombra) y a +y (abajo a la izquierda, con luz): ahí van puertas y ventanas.
 */

MATERIALES.casas_revoque = { rampa: ['#1b1915', '#2e2a23', '#433d33', '#5a5244', '#716855', '#887e68', '#9e937c'], ruido: 0.3, escala: 0.18 };
MATERIALES.casas_vidrio = { rampa: ['#060709', '#0c0e13', '#14171e', '#1d2129', '#282d37'], ruido: 0.3, escala: 0.3, brillo: 0.6 };
MATERIALES.casas_ventana_luz = { rampa: ['#4a2410', '#6e3a16', '#93561f', '#b5742c', '#d09440', '#e4b45e'], ruido: 0.35, escala: 0.3, emite: true };
MATERIALES.casas_brasa = { rampa: ['#3a0c04', '#62180a', '#8e2a0c', '#b84612', '#dc6e1e', '#f4a03a'], ruido: 0.6, escala: 0.5, emite: true };

// ------------------------------------------------------------------ herramientas compartidas (también las usa pueblo.ts)
export type Op = { mat: string; tono?: number; resta?: boolean };
type OpG = Op & { giro?: number; incl?: number };
const sub = (p: V3, q: V3): V3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const mas = (p: V3, q: V3, k = 1): V3 => [p[0] + q[0] * k, p[1] + q[1] * k, p[2] + q[2] * k];
const cruz = (p: V3, q: V3): V3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
const unit = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
export const rnd = (a: Arma, lo: number, hi: number) => lo + a.r() * (hi - lo);

/** Viga o tabla recta de p0 a p1, de ancho `w`, que crece `t` hacia la normal `nv` (sirve para riostras y tablas tiradas). */
export function viga(a: Arma, p0: V3, p1: V3, w: number, t: number, nv: V3, o: Op): Pieza {
  const s = unit(cruz(nv, sub(p1, p0)));
  const pts: V3[] = [];
  for (const k of [-w / 2, w / 2]) for (const q of [p0, p1]) for (const e of [0, t]) pts.push(mas(mas(q, s, k), nv, e));
  return a.poliedro(pts, o);
}

/** Una cara visible de un edificio: normal +x o +y en el plano `p`. `u` corre a lo largo de la cara, `d` hacia afuera. */
export interface Cara { nv: V3; bx: (u: number, d: number, z: number, w: number, dep: number, h: number, o: OpG) => Pieza; pt: (u: number, d: number, z: number) => V3; cil: (u: number, d: number, z: number, r: number, h: number, o: Op & { r1?: number }) => Pieza }
export function cara(a: Arma, n: 'x' | 'y', p: number): Cara {
  return n === 'y'
    ? { nv: [0, 1, 0], bx: (u, d, z, w, dep, h, o) => a.caja(u, p + d, z, w, dep, h, { ...o, inclEje: 'y' }), pt: (u, d, z) => [u, p + d, z], cil: (u, d, z, r, h, o) => a.cilindro(u, p + d, z, r, h, { ...o, eje: [0, 1, 0] }) }
    : { nv: [1, 0, 0], bx: (u, d, z, w, dep, h, o) => a.caja(p + d, u, z, w, dep, h, { ...o, giro: 90 + (o.giro ?? 0), inclEje: 'y' }), pt: (u, d, z) => [p + d, u, z], cil: (u, d, z, r, h, o) => a.cilindro(p + d, u, z, r, h, { ...o, eje: [1, 0, 0] }) };
}

/** Piso de tierra irregular bajo el edificio. */
export function base(a: Arma, ps: Pieza[], w: number, d: number, mat = 'tierra') {
  ps.push(a.caja(0, 0, 0, w, d, 1, { mat }));
  for (let i = 0; i < 6; i++) {
    const lado = i % 4, t = rnd(a, -0.45, 0.45);
    const x = lado === 0 ? w / 2 : lado === 1 ? -w / 2 : t * w, y = lado === 2 ? d / 2 : lado === 3 ? -d / 2 : t * d;
    ps.push(a.elipsoide(x, y, 0, rnd(a, 8, 18), rnd(a, 6, 12), 1.6, { mat: a.r() < 0.5 ? 'pasto' : mat, giro: a.r() * 180 }));
  }
}

/** Techo de dos aguas: `z` es el alto de los muros, `L` y `W` el largo y el ancho de los muros, `H` lo que sube la cumbrera. */
export interface Techo { eje: 'x' | 'y'; cx: number; cy: number; z: number; L: number; W: number; H: number; al: number; alL: number; g: number }
export const tp = (t: Techo, s: number, u: number, z: number): V3 => (t.eje === 'x' ? [t.cx + s, t.cy + u, z] : [t.cx + u, t.cy + s, z]);
export function techo(a: Arma, ps: Pieza[], t: Techo, mat: string, hastial?: string, o: { tono?: number; cumbrera?: string; sinCumbrera?: boolean } = {}) {
  const sl = t.H / (t.W / 2), ue = t.W / 2 + t.al, ze = t.z - t.al * sl, zr = t.z + t.H, Ls = t.L / 2 + t.alL;
  if (hastial) ps.push(a.poliedro([tp(t, -t.L / 2, -t.W / 2, t.z), tp(t, t.L / 2, -t.W / 2, t.z), tp(t, -t.L / 2, t.W / 2, t.z), tp(t, t.L / 2, t.W / 2, t.z), tp(t, -t.L / 2, 0, zr), tp(t, t.L / 2, 0, zr)], { mat: hastial }));
  for (const sg of [-1, 1]) {
    const pts: V3[] = [];
    for (const s of [-Ls, Ls]) for (const e of [0, t.g]) pts.push(tp(t, s, sg * ue, ze + e), tp(t, s, 0, zr + e));
    ps.push(a.poliedro(pts, { mat, tono: (o.tono ?? 0) + (sg < 0 ? 0 : 0) }));
  }
  if (!o.sinCumbrera) ps.push(a.palo(tp(t, -Ls - 1, 0, zr + t.g * 0.8), tp(t, Ls + 1, 0, zr + t.g * 0.8), t.g * 0.75, { mat: o.cumbrera ?? mat, tono: -0.08 }));
}
/** Agujeros en un techo de dos aguas: `[s, u, largo, ancho]`; adentro se ve oscuro y las vigas quedan a la vista. */
export function agujeros(a: Arma, ps: Pieza[], t: Techo, hs: [number, number, number, number][], vigas = 'madera_vieja') {
  const sl = t.H / (t.W / 2), zr = t.z + t.H, ze = t.z - t.al * sl;
  for (const [s, u, ls, lu] of hs) for (let i = 0; i < 3; i++) {
    const k = i ? 0.55 : 1, c = tp(t, s + (i ? rnd(a, -0.4, 0.4) * ls : 0), u + (i ? rnd(a, -0.4, 0.4) * lu : 0), t.z + 3), g = i ? rnd(a, -35, 35) : rnd(a, -10, 10);
    ps.push(t.eje === 'x' ? a.caja(c[0], c[1], c[2], ls * k, lu * k, t.H + t.g + 8, { mat: 'negro', resta: true, giro: g }) : a.caja(c[0], c[1], c[2], lu * k, ls * k, t.H + t.g + 8, { mat: 'negro', resta: true, giro: g }));
  }
  const k = 4, L = t.L / 2 - 3;
  ps.push(a.poliedro([tp(t, -L, -t.W / 2 + k, t.z), tp(t, L, -t.W / 2 + k, t.z), tp(t, -L, t.W / 2 - k, t.z), tp(t, L, t.W / 2 - k, t.z), tp(t, -L, 0, zr - k * 1.4), tp(t, L, 0, zr - k * 1.4)], { mat: 'negro' }));
  for (const [s, u, ls] of hs) {
    const sg = u < 0 ? -1 : 1;
    for (let q = s - ls / 2 + 3; q < s + ls / 2; q += 9) ps.push(a.palo(tp(t, q, sg * (t.W / 2 + t.al - 1), ze - 1.6), tp(t, q, 0, zr - 1.6), 1.5, { mat: vigas }));
  }
}

/** Ventana tallada en la cara: hueco, vidrio oscuro o con luz, parteluz, alféizar y postigos o tablas clavadas. */
export interface VentOpc { luz?: boolean; marco?: string; postigos?: 'abiertos' | 'rotos'; tablas?: boolean; arco?: boolean; rota?: boolean; vidrio?: string; sinCruz?: boolean; alfeizar?: string }
export function ventana(a: Arma, ps: Pieza[], f: Cara, u: number, z: number, w: number, h: number, o: VentOpc = {}) {
  const m = o.marco ?? 'madera', hr = o.arco ? h - w / 2 : h;
  ps.push(f.bx(u, 0.5, z - 2, w + 5, 1, hr + 4, { mat: m, tono: -0.05 }));
  if (o.arco) ps.push(f.cil(u, 0, z + hr, w / 2 + 2.5, 1, { mat: m, tono: -0.05 }));
  ps.push(f.bx(u, -1, z, w, 8, hr, { mat: 'negro', resta: true }));
  if (o.arco) ps.push(f.cil(u, -5, z + hr, w / 2, 8, { mat: 'negro', resta: true }));
  const vid = o.luz ? 'casas_ventana_luz' : o.vidrio ?? 'casas_vidrio', tv = o.luz ? -0.22 + a.r() * 0.1 : 0;
  ps.push(f.bx(u, -4.5, z, w, 1, hr, { mat: vid, tono: tv }));
  if (o.arco) ps.push(f.cil(u, -5, z + hr, w / 2, 1, { mat: vid, tono: tv }));
  if (!o.rota && !o.sinCruz) ps.push(f.bx(u, -3.6, z, 1.6, 1.6, h, { mat: m }), f.bx(u, -3.6, z + hr * 0.52, w, 1.6, 1.6, { mat: m }));
  if (o.rota) ps.push(f.bx(u - w / 4, -3.6, z, 1.6, 1.6, hr * 0.6, { mat: m, incl: 12 }));
  ps.push(f.bx(u, 1.5, z - 3, w + 6, 4, 2.5, { mat: o.alfeizar ?? m, tono: 0.05 }));
  if (o.postigos === 'abiertos') for (const s of [-1, 1]) ps.push(f.bx(u + s * (w * 0.75 + 3), 1.4, z, w / 2, 1.2, hr, { mat: 'madera_vieja', tono: 0.05 }));
  if (o.postigos === 'rotos') ps.push(f.bx(u - (w * 0.75 + 3), 1.4, z - 2, w / 2, 1.2, hr, { mat: 'madera_vieja', incl: 14 }));
  if (o.tablas) for (const s of [-1, 1]) ps.push(viga(a, f.pt(u - w / 2 - 2, 1.2, z + (s < 0 ? 2 : hr - 2)), f.pt(u + w / 2 + 2, 1.2, z + (s < 0 ? hr - 3 : 3)), 3.5, 1.2, f.nv, { mat: 'madera_vieja', tono: a.r() * 0.15 }));
}

/** Puerta con marco: cerrada, abierta (oscuro adentro), con luz adentro o rota. */
export type EstPuerta = 'cerrada' | 'abierta' | 'luz' | 'rota';
export function puerta(a: Arma, ps: Pieza[], f: Cara, u: number, w: number, h: number, est: EstPuerta, o: { marco?: string; arco?: boolean; z?: number; hoja?: string } = {}) {
  const z = o.z ?? 0, m = o.marco ?? 'madera', hr = o.arco ? h - w / 2 : h;
  ps.push(f.bx(u, 0.75, z, w + 8, 1.5, hr + 4, { mat: m }));
  if (o.arco) ps.push(f.cil(u, 0, z + hr, w / 2 + 4, 1.5, { mat: m }));
  ps.push(f.bx(u, -2, z, w, 10, hr, { mat: 'negro', resta: true }));
  if (o.arco) ps.push(f.cil(u, -7, z + hr, w / 2, 10, { mat: 'negro', resta: true }));
  const fondo = est === 'luz' ? 'casas_ventana_luz' : 'negro';
  ps.push(f.bx(u, -6.5, z, w, 1, hr, { mat: fondo, tono: est === 'luz' ? -0.3 : 0 }));
  if (o.arco) ps.push(f.cil(u, -7, z + hr, w / 2, 1, { mat: fondo, tono: est === 'luz' ? -0.3 : 0 }));
  const hoja = o.hoja ?? 'madera';
  if (est === 'cerrada') {
    ps.push(f.bx(u, -3.5, z, w, 2, hr, { mat: hoja }));
    if (o.arco) ps.push(f.cil(u, -3.5, z + hr, w / 2, 2, { mat: hoja }));
    for (const zz of [8, hr - 12]) ps.push(f.bx(u, -2.1, z + zz, w - 3, 0.8, 2.5, { mat: 'hierro' }));
    ps.push(a.esfera(...f.pt(u + w / 4, -1.5, z + hr * 0.5), 1.5, { mat: 'hierro' }));
  } else if (est === 'abierta' || est === 'luz') {
    ps.push(f.bx(u - w / 2 + 1.5, -3, z, 3, 7, hr, { mat: hoja, tono: 0.08 }));
  } else {
    ps.push(f.bx(u + w / 4, -3.5, z, w / 2 - 1, 2, hr * 0.75, { mat: 'madera_vieja', incl: 7 }));
    ps.push(viga(a, f.pt(u - w / 2, 6, 0.3), f.pt(u + w / 3, 14, 0.3), 6, 1.5, [0, 0, 1], { mat: 'madera_vieja', tono: -0.05 }));
  }
}

/** Entramado de madera sobre una cara: postes, soleras, travesaño y riostras en diagonal (el hueco de puertas y ventanas lo corta). */
export function entramado(a: Arma, ps: Pieza[], f: Cara, u0: number, u1: number, z0: number, z1: number, n: number, o: { mat: string; mitad?: number; diag?: number; tono?: number }) {
  const m = { mat: o.mat, tono: o.tono }, w = (u1 - u0) / n;
  for (let i = 0; i <= n; i++) ps.push(f.bx(u0 + i * w + (i === 0 ? 1.75 : i === n ? -1.75 : 0), 0.75, z0, 3.5, 1.5, z1 - z0, m));
  for (const z of [z0, ...(o.mitad ? [o.mitad] : []), z1 - 3.5]) ps.push(f.bx((u0 + u1) / 2, 0.75, z, u1 - u0, 1.5, 3.5, m));
  for (let i = 0; i < n; i++) if (a.r() < (o.diag ?? 0.6)) {
    const ua = u0 + i * w + 3, ub = ua + w - 6, zt = (o.mitad ?? z1 - 3.5) - 0.5, izq = a.r() < 0.5;
    ps.push(viga(a, f.pt(izq ? ua : ub, 0, z0 + 3.5), f.pt(izq ? ub : ua, 0, zt), 3, 1.5, f.nv, m));
  }
}
/** Entramado del hastial (el triángulo bajo el techo). */
export function entramadoHastial(a: Arma, ps: Pieza[], f: Cara, W: number, z: number, H: number, mat: string) {
  const m = { mat };
  ps.push(viga(a, f.pt(0, 0, z), f.pt(0, 0, z + H - 2), 3.5, 1.5, f.nv, m));
  for (const s of [-1, 1]) {
    ps.push(viga(a, f.pt((s * W) / 2, 0, z), f.pt(0, 0, z + H), 3.5, 1.5, f.nv, m));
    ps.push(viga(a, f.pt((s * W) / 4, 0, z + 1), f.pt((s * W) / 4, 0, z + H / 2 - 1), 3, 1.5, f.nv, m));
  }
}
/** Chimenea de `z0` a `z1` con su remate. */
export function chimenea(a: Arma, ps: Pieza[], x: number, y: number, z0: number, z1: number, mat = 'piedra_bloques', w = 13) {
  ps.push(a.caja(x, y, z0, w, w, z1 - z0, { mat }), a.caja(x, y, z1, w + 3, w + 3, 3, { mat: 'piedra_gris' }), a.caja(x, y, z1 + 2.2, w - 5, w - 5, 1, { mat: 'negro' }));
}
/** Barril parado. */
export function barril(a: Arma, ps: Pieza[], x: number, y: number, z = 0) {
  ps.push(a.cilindro(x, y, z, 7, 9, { mat: 'madera', r1: 8 }), a.cilindro(x, y, z + 9, 8, 9, { mat: 'madera', r1: 7 }), a.cilindro(x, y, z + 2, 7.5, 1.5, { mat: 'hierro', r1: 7.7 }), a.cilindro(x, y, z + 14, 7.6, 1.5, { mat: 'hierro', r1: 7.4 }), a.cilindro(x, y, z + 18, 6.6, 0.5, { mat: 'madera_vieja' }));
}
/** Caja de madera. */
export function cajon(a: Arma, ps: Pieza[], x: number, y: number, z = 0, s = 16) {
  const g = rnd(a, -20, 20);
  ps.push(a.caja(x, y, z, s, s, s * 0.8, { mat: 'madera', giro: g }), a.caja(x, y, z + s * 0.35, s + 0.6, s + 0.6, 2, { mat: 'madera_vieja', giro: g }));
}
/** Pila de leña contra una pared. */
export function lena(a: Arma, ps: Pieza[], x: number, y: number, largo: number, eje: 'x' | 'y', filas = 3) {
  for (let f = 0; f < filas; f++) for (let i = 0; i < 5 - f; i++) {
    const o = (i - (4 - f) / 2) * 6.5, z = 3 + f * 5.6;
    const p0: V3 = eje === 'x' ? [x - largo / 2, y + o, z] : [x + o, y - largo / 2, z], p1: V3 = eje === 'x' ? [x + largo / 2 + rnd(a, -3, 3), y + o, z] : [x + o, y + largo / 2 + rnd(a, -3, 3), z];
    ps.push(a.palo(p0, p1, 3, { mat: 'corteza', tono: rnd(a, -0.1, 0.1) }));
  }
}

const LUZ_CALIDA = '#e0a050';
const conLuz = (ps: Pieza[], luz: boolean, c: V3, r = 80) => (luz ? { piezas: ps, resplandor: { c, r, color: LUZ_CALIDA } } : ps);

// ------------------------------------------------------------------ casas
registrar(
  {
    id: 'casa_entramado', nombre: ['Casa de entramado', 'Timber-frame house'], tema: 'casas', variantes: ['intacta', 'iluminada', 'abandonada'], huella: [9, 7], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const ab = v === 'abandonada', luz = v === 'iluminada';
      const LX = 124, LY = 84, Z = 70, mad = ab ? 'madera_vieja' : 'madera';
      base(a, ps, LX + 40, LY + 44);
      ps.push(a.caja(0, 0, 0, LX + 3, LY + 3, 8, { mat: 'piedra_bloques' }));
      ps.push(a.caja(0, 0, 8, LX, LY, Z - 8, { mat: 'casas_revoque', tono: ab ? -0.12 : 0 }));
      const t: Techo = { eje: 'x', cx: 0, cy: 0, z: Z, L: LX, W: LY, H: 40, al: 7, alL: 8, g: 4 };
      techo(a, ps, t, 'teja', 'casas_revoque', { tono: ab ? -0.16 : -0.08 });
      const fy = cara(a, 'y', LY / 2), fx = cara(a, 'x', LX / 2);
      entramado(a, ps, fy, -LX / 2, LX / 2, 8, Z, 6, { mat: mad, mitad: 36 });
      entramado(a, ps, fx, -LY / 2, LY / 2, 8, Z, 4, { mat: mad, mitad: 36 });
      ps.push(fx.bx(0, 0.75, Z - 2, LY, 1.5, 3.5, { mat: mad }));
      entramadoHastial(a, ps, fx, LY, Z, 40, mad);
      chimenea(a, ps, -36, -16, 60, 126, 'piedra_bloques');
      puerta(a, ps, fy, -28, 28, 52, ab ? 'rota' : luz ? 'luz' : 'cerrada');
      ps.push(fy.bx(-28, 4, 0, 38, 8, 2, { mat: 'piedra_gris' }));
      for (const u of [12, 40]) ventana(a, ps, fy, u, 28, 16, 22, { luz, postigos: ab ? 'rotos' : 'abiertos', tablas: ab && u > 20, rota: ab });
      for (const u of [-20, 20]) ventana(a, ps, fx, u, 28, 14, 20, { luz, tablas: ab && u < 0, rota: ab });
      ventana(a, ps, fx, 0, Z + 7, 12, 14, { luz: luz, rota: ab });
      if (ab) {
        agujeros(a, ps, t, [[rnd(a, 10, 30), 22, 30, 20], [rnd(a, -50, -30), 14, 16, 12]]);
        for (let i = 0; i < 3; i++) ps.push(viga(a, [rnd(a, -40, 40), LY / 2 + rnd(a, 8, 20), 0.5], [rnd(a, -40, 40), LY / 2 + rnd(a, 8, 20), 0.5], 4, 1.5, [0, 0, 1], { mat: 'teja', tono: -0.05 }));
        for (let i = 0; i < 5; i++) ps.push(a.caja(rnd(a, -LX / 2, LX / 2), LY / 2 + 2, rnd(a, 12, 50), rnd(a, 5, 10), 1, rnd(a, 3, 6), { mat: 'ladrillo' }));
      } else {
        barril(a, ps, -54, LY / 2 + 12);
        cajon(a, ps, 56, LY / 2 + 12, 0, 14);
      }
      lena(a, ps, LX / 2 + 10, 8, 40, 'y');
      return conLuz(ps, luz, [0, LY / 2 + 18, 30]);
    },
  },
);

/** Faldón de techo (losa) de perfil (u0,z0)→(u1,z1) a lo largo de `s` en ±Ls, con grosor `g` hacia arriba. */
export function losa(a: Arma, t: Techo, Ls: number, u0: number, z0: number, u1: number, z1: number, g: number, o: Op) {
  const pts: V3[] = [];
  for (const s of [-Ls, Ls]) for (const e of [0, g]) pts.push(tp(t, s, u0, z0 + e), tp(t, s, u1, z1 + e));
  return a.poliedro(pts, o);
}
/** Pirámide de base cuadrada (chapiteles, techos de torre). */
export const piramide = (a: Arma, x: number, y: number, z: number, w: number, h: number, o: Op, d = w) =>
  a.poliedro([[x - w / 2, y - d / 2, z], [x + w / 2, y - d / 2, z], [x - w / 2, y + d / 2, z], [x + w / 2, y + d / 2, z], [x, y, z + h]], o);
/** Techo a cuatro aguas macizo. */
export const techo4 = (a: Arma, x: number, y: number, z: number, L: number, W: number, H: number, o: Op) =>
  a.poliedro([[x - L / 2, y - W / 2, z], [x + L / 2, y - W / 2, z], [x - L / 2, y + W / 2, z], [x + L / 2, y + W / 2, z], [x - L / 2 + W / 2, y, z + H], [x + L / 2 - W / 2, y, z + H]], o);
/** Esquinas de sillería (piedras alternadas) en la arista vertical (x,y) de un muro. */
function esquinas(a: Arma, ps: Pieza[], x: number, y: number, z0: number, z1: number, mat = 'piedra_gris') {
  for (let z = z0, i = 0; z < z1 - 4; z += 9, i++) {
    const l = i % 2 ? 14 : 9;
    ps.push(a.caja(x - (i % 2 ? 0 : l / 2 - 4.5), y - (i % 2 ? l / 2 - 4.5 : 0), z, i % 2 ? 9 : l, i % 2 ? l : 9, 8.5, { mat, tono: rnd(a, -0.08, 0.08) }));
  }
}
/** Mata de pasto o yuyo. */
export function matas(a: Arma, ps: Pieza[], n: number, x0: number, x1: number, y0: number, y1: number) {
  for (let i = 0; i < n; i++) ps.push(a.elipsoide(rnd(a, x0, x1), rnd(a, y0, y1), 1, rnd(a, 3, 6), rnd(a, 3, 6), rnd(a, 2.5, 5), { mat: a.r() < 0.6 ? 'pasto' : 'hojas', tono: rnd(a, -0.1, 0.1) }));
}

registrar(
  {
    id: 'casa_piedra', nombre: ['Cabaña de piedra', 'Stone cottage'], tema: 'casas', variantes: ['intacta', 'iluminada', 'musgosa'], huella: [8, 6], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const mus = v === 'musgosa', luz = v === 'iluminada';
      const LX = 100, LY = 74, Z = 56, pie = mus ? 'piedra_musgo' : 'piedra_bloques';
      base(a, ps, LX + 40, LY + 40);
      ps.push(a.caja(0, 0, 0, LX, LY, Z, { mat: pie }));
      esquinas(a, ps, LX / 2, LY / 2, 0, Z);
      esquinas(a, ps, -LX / 2 + 4.5, LY / 2, 0, Z);
      esquinas(a, ps, LX / 2, -LY / 2 + 4.5, 0, Z);
      const t: Techo = { eje: 'x', cx: 0, cy: 0, z: Z, L: LX, W: LY, H: 46, al: 9, alL: 7, g: 8 };
      techo(a, ps, t, 'paja', pie, { tono: mus ? -0.3 : -0.18 });
      const fy = cara(a, 'y', LY / 2), fx = cara(a, 'x', LX / 2);
      // chimenea de piedra pegada al hastial
      ps.push(fx.bx(16, 7, 0, 22, 14, 44, { mat: pie, tono: 0.04 }), fx.bx(16, 5, 44, 15, 10, 70, { mat: pie, tono: 0.04 }), fx.bx(16, 5, 114, 18, 13, 3, { mat: 'piedra_gris' }), fx.bx(16, 5, 116.5, 9, 6, 1, { mat: 'negro' }));
      puerta(a, ps, fy, -18, 26, 50, luz ? 'luz' : 'cerrada', { marco: 'piedra_gris', arco: true });
      ps.push(fy.bx(-18, 5, 0, 34, 10, 2.5, { mat: 'piedra_gris' }));
      ventana(a, ps, fy, 24, 24, 13, 16, { luz, marco: 'madera_vieja', alfeizar: 'piedra_gris', postigos: 'abiertos' });
      ventana(a, ps, fx, -18, 24, 12, 15, { luz, marco: 'madera_vieja', alfeizar: 'piedra_gris' });
      ventana(a, ps, fx, -8, Z + 10, 10, 12, { luz, marco: 'madera_vieja', alfeizar: 'piedra_gris', sinCruz: true });
      if (mus) {
        for (let i = 0; i < 7; i++) { const s = rnd(a, -55, 50), u = rnd(a, 6, 44); ps.push(a.elipsoide(s, u, Z + 46 - u * (46 / 37) + 8.5, rnd(a, 6, 14), rnd(a, 5, 10), 2.5, { mat: 'musgo' })); }
        matas(a, ps, 10, -LX / 2, LX / 2 + 10, LY / 2, LY / 2 + 14);
        ps.push(fy.bx(30, 1, 0, 30, 2, 18, { mat: 'hojas', tono: -0.1 }));
      } else {
        lena(a, ps, -38, LY / 2 + 9, 30, 'x', 3);
        barril(a, ps, LX / 2 + 10, -18);
        matas(a, ps, 4, -LX / 2, LX / 2, LY / 2 + 6, LY / 2 + 18);
      }
      return conLuz(ps, luz, [0, LY / 2 + 16, 26], 66);
    },
  },
  {
    id: 'casa_dos_pisos', nombre: ['Casa de dos pisos', 'Two-story house'], tema: 'casas', variantes: ['intacta', 'iluminada', 'abandonada'], huella: [9, 7], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const ab = v === 'abandonada', luz = v === 'iluminada';
      const LX = 116, LY = 84, Z1 = 50, Z2 = 98, J = 6, mad = ab ? 'madera_vieja' : 'madera';
      base(a, ps, LX + 40, LY + 40);
      ps.push(a.caja(0, 0, 0, LX, LY, Z1, { mat: 'piedra_bloques', tono: ab ? -0.06 : 0 }));
      esquinas(a, ps, LX / 2, LY / 2, 0, Z1);
      // piso alto volado sobre las dos caras visibles
      ps.push(a.caja(J / 2, J / 2, Z1 + 3, LX + J, LY + J, Z2 - Z1 - 3, { mat: 'casas_revoque', tono: ab ? -0.12 : 0 }));
      ps.push(a.caja(J / 2, J / 2, Z1, LX + J + 2, LY + J + 2, 3, { mat: mad }));
      for (let u = -LX / 2 + 4; u < LX / 2; u += 10) ps.push(a.caja(u, LY / 2 + J / 2, Z1 - 3, 3, J + 1, 3, { mat: mad }));
      for (let u = -LY / 2 + 4; u < LY / 2; u += 10) ps.push(a.caja(LX / 2 + J / 2, u, Z1 - 3, J + 1, 3, 3, { mat: mad }));
      const t: Techo = { eje: 'x', cx: J / 2, cy: J / 2, z: Z2, L: LX + J, W: LY + J, H: 46, al: 7, alL: 7, g: 4 };
      techo(a, ps, t, 'pizarra', 'casas_revoque', { tono: ab ? -0.1 : 0 });
      const fy = cara(a, 'y', LY / 2), fx = cara(a, 'x', LX / 2), gy = cara(a, 'y', LY / 2 + J), gx = cara(a, 'x', LX / 2 + J);
      entramado(a, ps, gy, -LX / 2, LX / 2 + J, Z1 + 3, Z2, 6, { mat: mad, mitad: 74 });
      entramado(a, ps, gx, -LY / 2, LY / 2 + J, Z1 + 3, Z2, 4, { mat: mad, mitad: 74 });
      ps.push(gx.bx(J / 2, 0.75, Z2 - 2, LY + J, 1.5, 3.5, { mat: mad }));
      entramadoHastial(a, ps, gx, LY + J, Z2, 46, mad);
      chimenea(a, ps, -30, -22, 80, 168, 'ladrillo', 12);
      puerta(a, ps, fy, -30, 28, 52, ab ? 'rota' : luz ? 'luz' : 'cerrada', { marco: 'piedra_gris', arco: true });
      ps.push(fy.bx(-30, 5, 0, 36, 10, 2.5, { mat: 'piedra_gris' }));
      const so = { marco: 'piedra_gris', alfeizar: 'piedra_gris', luz, tablas: ab, rota: ab };
      ventana(a, ps, fy, 14, 22, 14, 18, so);
      ventana(a, ps, fy, 40, 22, 14, 18, { ...so, tablas: false });
      ventana(a, ps, fx, 0, 22, 14, 18, so);
      for (const u of [-38, -8, 22, 50]) ventana(a, ps, gy, u, 64, 14, 20, { luz: luz && u !== 22, postigos: ab ? 'rotos' : 'abiertos', rota: ab && u < 0 });
      for (const u of [-22, 26]) ventana(a, ps, gx, u, 64, 14, 20, { luz, rota: ab, postigos: ab ? undefined : 'abiertos' });
      ventana(a, ps, gx, J / 2, Z2 + 8, 12, 14, { luz: luz, rota: ab });
      if (ab) {
        agujeros(a, ps, t, [[rnd(a, -20, 20), 26, 34, 22]]);
        for (let i = 0; i < 4; i++) ps.push(viga(a, [rnd(a, -50, 50), LY / 2 + rnd(a, 10, 22), 0.5], [rnd(a, -50, 50), LY / 2 + rnd(a, 10, 22), 0.5], 4, 1.4, [0, 0, 1], { mat: 'pizarra' }));
        matas(a, ps, 8, -LX / 2, LX / 2, LY / 2 + 2, LY / 2 + 18);
      } else {
        barril(a, ps, -52, LY / 2 + 12);
        barril(a, ps, LX / 2 + 12, 30);
        cajon(a, ps, LX / 2 + 13, 10, 0, 14);
      }
      return conLuz(ps, luz, [0, LY / 2 + 18, 36], 80);
    },
  },
  {
    id: 'casa_alargada', nombre: ['Casa alargada', 'Longhouse'], tema: 'casas', variantes: ['intacta', 'abandonada'], huella: [13, 6], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const ab = v === 'abandonada';
      const LX = 196, LY = 70, Z = 42;
      base(a, ps, LX + 40, LY + 40);
      ps.push(a.caja(0, 0, 0, LX + 4, LY + 4, 7, { mat: 'piedra' }));
      ps.push(a.caja(0, 0, 7, LX, LY, Z - 7, { mat: 'madera_vieja', tono: ab ? -0.08 : 0.02 }));
      const t: Techo = { eje: 'x', cx: 0, cy: 0, z: Z, L: LX, W: LY, H: 54, al: 12, alL: 6, g: 8 };
      techo(a, ps, t, 'paja', 'madera_vieja', { tono: ab ? -0.3 : -0.18 });
      const fy = cara(a, 'y', LY / 2), fx = cara(a, 'x', LX / 2);
      for (let u = -LX / 2 + 2; u <= LX / 2; u += 24) ps.push(fy.bx(u, 1.5, 7, 5, 3, Z - 7, { mat: 'corteza' }));
      for (const u of [-LY / 2 + 2, 0, LY / 2 - 2]) ps.push(fx.bx(u, 1.5, 7, 5, 3, Z - 7, { mat: 'corteza' }));
      // cuernos de madera cruzados en las puntas de la cumbrera
      for (const s of [-1, 1]) for (const k of [-1, 1]) ps.push(a.palo([s * (LX / 2 + 6), k * 10, Z + 44], [s * (LX / 2 + 9), -k * 8, Z + 76], 2.2, { mat: 'madera', r1: 1.2 }));
      // respiradero de humo sobre la cumbrera
      ps.push(a.caja(-30, 0, Z + 50, 16, 14, 10, { mat: 'negro' }), techo4(a, -30, 0, Z + 60, 22, 22, 9, { mat: 'paja', tono: -0.25 }));
      // porche con su techito sobre la puerta
      puerta(a, ps, fy, 10, 28, 50, ab ? 'rota' : 'cerrada', { hoja: 'madera' });
      for (const s of [-1, 1]) ps.push(a.caja(10 + s * 20, LY / 2 + 18, 0, 4, 4, 48, { mat: 'corteza' }));
      ps.push(a.poliedro([[-16, LY / 2, 58], [36, LY / 2, 58], [-16, LY / 2 + 24, 46], [36, LY / 2 + 24, 46], [-16, LY / 2, 63], [36, LY / 2, 63], [-16, LY / 2 + 24, 50], [36, LY / 2 + 24, 50]], { mat: 'paja', tono: ab ? -0.3 : -0.2 }));
      for (const u of [-58, 62]) ventana(a, ps, fy, u, 22, 12, 12, { marco: 'madera_vieja', tablas: ab, sinCruz: true });
      ventana(a, ps, fx, 0, 22, 12, 12, { marco: 'madera_vieja', sinCruz: true });
      if (ab) {
        agujeros(a, ps, t, [[rnd(a, -70, -40), 20, 30, 20], [rnd(a, 40, 70), 26, 22, 16]]);
        matas(a, ps, 10, -LX / 2, LX / 2, LY / 2 + 4, LY / 2 + 20);
      } else {
        lena(a, ps, -60, LY / 2 + 10, 40, 'x', 3);
        barril(a, ps, 60, LY / 2 + 12);
        ps.push(a.cilindro(78, LY / 2 + 12, 0, 6, 10, { mat: 'corteza' }), a.palo([78, LY / 2 + 12, 10], [82, LY / 2 + 16, 18], 1, { mat: 'madera' }), a.caja(82, LY / 2 + 16, 16, 2, 6, 5, { mat: 'hierro', giro: 45 }));
      }
      return ps;
    },
  },
  {
    id: 'casa_posada', nombre: ['Posada', 'Inn'], tema: 'casas', variantes: ['iluminada', 'de_dia', 'abandonada'], huella: [10, 8], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const ab = v === 'abandonada', luz = v === 'iluminada';
      const LX = 148, LY = 94, Z1 = 50, Z2 = 98, mad = ab ? 'madera_vieja' : 'madera';
      base(a, ps, LX + 44, LY + 50);
      ps.push(a.caja(0, 0, 0, LX, LY, Z1, { mat: 'piedra_bloques', tono: ab ? -0.06 : 0 }));
      esquinas(a, ps, LX / 2, LY / 2, 0, Z1);
      ps.push(a.caja(0, 0, Z1, LX + 2, LY + 2, 3, { mat: mad }));
      ps.push(a.caja(0, 0, Z1 + 3, LX, LY, Z2 - Z1 - 3, { mat: 'casas_revoque', tono: ab ? -0.12 : 0.03 }));
      const t: Techo = { eje: 'x', cx: 0, cy: 0, z: Z2, L: LX, W: LY, H: 48, al: 8, alL: 8, g: 4 };
      techo(a, ps, t, 'teja', 'casas_revoque', { tono: ab ? -0.18 : -0.1 });
      const fy = cara(a, 'y', LY / 2), fx = cara(a, 'x', LX / 2);
      entramado(a, ps, fy, -LX / 2, LX / 2, Z1 + 3, Z2, 7, { mat: mad, mitad: 74 });
      entramado(a, ps, fx, -LY / 2, LY / 2, Z1 + 3, Z2, 4, { mat: mad, mitad: 74 });
      ps.push(fx.bx(0, 0.75, Z2 - 2, LY, 1.5, 3.5, { mat: mad }));
      entramadoHastial(a, ps, fx, LY, Z2, 48, mad);
      chimenea(a, ps, -44, -20, 80, 170, 'piedra_bloques', 14);
      chimenea(a, ps, 40, -24, 90, 160, 'ladrillo', 11);
      // puerta doble bajo el alero, ventanas
      puerta(a, ps, fy, -20, 32, 54, ab ? 'rota' : luz ? 'luz' : 'cerrada', { marco: 'madera' });
      ps.push(fy.bx(-20, 6, 0, 42, 12, 3, { mat: 'piedra_gris' }));
      const vb = { marco: 'madera', alfeizar: 'piedra_gris', luz, tablas: ab, rota: ab };
      for (const u of [-56, 18, 50]) ventana(a, ps, fy, u, 20, 18, 20, vb);
      for (const u of [-18, 22]) ventana(a, ps, fx, u, 20, 16, 20, vb);
      for (const u of [-52, -20, 12, 44]) ventana(a, ps, fy, u, 62, 14, 20, { luz: luz && u !== 12, rota: ab, postigos: ab ? 'rotos' : 'abiertos' });
      for (const u of [-20, 20]) ventana(a, ps, fx, u, 62, 14, 20, { luz, rota: ab });
      ventana(a, ps, fx, 0, Z2 + 8, 12, 14, { luz, rota: ab });
      // alero sobre la puerta
      const yA = LY / 2;
      for (const s of [-1, 1]) ps.push(a.caja(-20 + s * 22, yA + 20, 0, 3.5, 3.5, 44, { mat: mad }));
      ps.push(a.caja(-20, yA + 20, 44, 50, 4, 3.5, { mat: mad }));
      ps.push(a.poliedro([[-48, yA, 56], [8, yA, 56], [-48, yA + 25, 45], [8, yA + 25, 45], [-48, yA, 59], [8, yA, 59], [-48, yA + 25, 48], [8, yA + 25, 48]], { mat: 'teja', tono: ab ? -0.18 : -0.1 }));
      // cartel colgante en su brazo de hierro
      const ux = 62, ys = yA + 26, inc = ab ? 22 : rnd(a, -4, 4);
      ps.push(a.palo([ux, yA, 66], [ux, ys + 2, 66], 1.2, { mat: 'hierro' }), a.palo([ux, yA, 54], [ux, yA + 16, 66], 0.9, { mat: 'hierro' }));
      ps.push(a.palo([ux - 8, ys, 66], [ux - 8 + (ab ? 3 : 0), ys, ab ? 56 : 60], 0.5, { mat: 'hierro' }));
      if (!ab) ps.push(a.palo([ux + 8, ys, 66], [ux + 8, ys, 60], 0.5, { mat: 'hierro' }));
      ps.push(a.caja(ux, ys, 45, 20, 2, 15, { mat: 'madera', incl: inc, inclEje: 'y', tono: 0.05 }));
      ps.push(a.caja(ux, ys, 44, 22, 2.4, 1.5, { mat: 'madera_vieja', incl: inc, inclEje: 'y' }));
      ps.push(a.cilindro(ux - 1, ys + 1.2, 48, 3, 7, { mat: 'bronce', incl: inc, inclEje: 'y' }), a.cilindro(ux + 3, ys + 1.2, 51, 1.8, 1, { mat: 'bronce', eje: [0, 1, 0] }));
      if (!ab) {
        barril(a, ps, -62, yA + 12); barril(a, ps, -46, yA + 10); barril(a, ps, LX / 2 + 12, -30);
        ps.push(a.caja(30, yA + 10, 9, 26, 7, 2, { mat: 'madera_lisa' }), a.caja(20, yA + 10, 0, 3, 6, 9, { mat: 'madera' }), a.caja(40, yA + 10, 0, 3, 6, 9, { mat: 'madera' }));
      } else {
        matas(a, ps, 8, -LX / 2, LX / 2, yA + 2, yA + 20);
        agujeros(a, ps, t, [[rnd(a, 10, 40), 22, 30, 22]]);
        cajon(a, ps, -56, yA + 14, 0, 14);
      }
      return conLuz(ps, luz, [-20, LY / 2 + 22, 30], 90);
    },
  },
);

/** Llamas sueltas (conos de fuego que cambian con el cuadro). */
export function llamas(a: Arma, ps: Pieza[], x: number, y: number, z: number, r: number, h: number, f: number, n = 3, cuadros = 6, mat = 'fuego', tn = 0) {
  for (let k = 0; k < n; k++) {
    const ang = (k / n) * Math.PI * 2 + f * 0.9 + k, d = k ? r * 0.45 : 0;
    const hh = h * (0.65 + 0.35 * Math.sin((f / cuadros) * Math.PI * 2 + k * 2.3)) * (k ? 0.75 : 1);
    ps.push(a.cilindro(x + Math.cos(ang) * d, y + Math.sin(ang) * d, z, r * (k ? 0.6 : 1), hh, { mat, r1: 0.3, tono: tn + (k ? -0.12 : 0.05) }));
  }
}
/** Escombros de piedra sueltos. */
export function piedras(a: Arma, ps: Pieza[], n: number, x0: number, x1: number, y0: number, y1: number, mat = 'piedra_bloques') {
  for (let i = 0; i < n; i++) { const s = rnd(a, 4, 9); ps.push(a.caja(rnd(a, x0, x1), rnd(a, y0, y1), 0, s, s * rnd(a, 0.6, 1), s * rnd(a, 0.5, 0.8), { mat, giro: rnd(a, 0, 90), incl: rnd(a, -12, 12), tono: rnd(a, -0.1, 0.08) })); }
}

registrar(
  {
    id: 'casa_herreria', nombre: ['Herrería', 'Blacksmith workshop'], tema: 'casas', variantes: ['encendida', 'apagada'], cuadros: 4, t: 3, huella: [8, 6], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const on = v === 'encendida';
      const LX = 120, LY = 90, ZB = 86, ZF = 62, YF = -6;
      base(a, ps, LX + 40, LY + 40);
      ps.push(a.caja(0, 0, 0, LX, LY, 2, { mat: 'piedra_gris', tono: -0.12 }));
      // muro de atrás, muro izquierdo y un murete al costado; techo de una sola agua sobre la mitad de atrás
      ps.push(a.caja(0, -LY / 2 + 5, 0, LX, 10, ZB, { mat: 'piedra_bloques' }));
      ps.push(a.poliedro([[-LX / 2, -LY / 2, 0], [-LX / 2 + 10, -LY / 2, 0], [-LX / 2, YF, 0], [-LX / 2 + 10, YF, 0], [-LX / 2, -LY / 2, ZB], [-LX / 2 + 10, -LY / 2, ZB], [-LX / 2, YF, ZF], [-LX / 2 + 10, YF, ZF]], { mat: 'piedra_bloques' }));
      ps.push(a.caja(-LX / 2 + 5, (YF + LY / 2) / 2, 0, 10, LY / 2 - YF, 24, { mat: 'piedra_bloques', tono: 0.03 }));
      ps.push(a.caja(LX / 2 - 3, -14, 0, 6, LY - 30, 20, { mat: 'piedra_bloques', tono: 0.03 }));
      for (const x of [-10, LX / 2 - 3]) ps.push(a.caja(x, YF, 0, 5, 5, ZF, { mat: 'madera' }));
      ps.push(a.caja(0, YF, ZF - 5, LX, 5, 5, { mat: 'madera' }));
      const t: Techo = { eje: 'x', cx: 0, cy: 0, z: 0, L: LX, W: LY, H: 0, al: 0, alL: 0, g: 4 };
      ps.push(losa(a, t, LX / 2 + 6, -LY / 2 - 6, ZB + 3, YF + 12, ZF - 6, 4, { mat: 'pizarra', tono: -0.04 }));
      // fragua, campana y chimenea
      const FX = -28, FY = -24;
      ps.push(a.caja(FX, FY, 0, 36, 28, 24, { mat: 'piedra_bloques', tono: 0.05 }), a.caja(FX, FY, 23.5, 28, 20, 1, { mat: 'negro' }));
      ps.push(a.poliedro([[FX - 18, FY - 14, 46], [FX + 18, FY - 14, 46], [FX - 18, FY + 14, 46], [FX + 18, FY + 14, 46], [FX - 7, FY - 7, 70], [FX + 7, FY - 7, 70], [FX - 7, FY + 7, 70], [FX + 7, FY + 7, 70]], { mat: 'piedra_bloques', tono: -0.04 }));
      ps.push(a.caja(FX, FY, 43, 38, 30, 3, { mat: 'hierro_oxido' }));
      chimenea(a, ps, FX, FY, 68, 126, 'piedra_bloques', 14);
      if (on) {
        ps.push(a.elipsoide(FX, FY, 24, 12, 8, 3 + (f % 2), { mat: 'casas_brasa', tono: f % 2 ? 0.1 : 0 }));
        llamas(a, ps, FX, FY, 25, 4, 10, f, 3, 4);
      } else ps.push(a.elipsoide(FX, FY, 24, 12, 8, 2.5, { mat: 'piedra_gris', tono: -0.25 }), a.elipsoide(FX + 2, FY + 2, 25, 3, 2, 1.5, { mat: 'casas_brasa', tono: -0.3 }));
      // fuelle
      ps.push(a.poliedro([[-6, -30, 14], [-6, -16, 14], [18, -25, 16], [18, -21, 16], [-6, -30, 22], [-6, -16, 22], [18, -25, 18], [18, -21, 18]], { mat: 'cuero' }), a.caja(6, -23, 12, 24, 14, 2, { mat: 'madera' }), a.caja(0, -23, 0, 4, 4, 12, { mat: 'madera' }), a.palo([18, -23, 17], [28, -23, 26], 1.2, { mat: 'madera' }));
      // yunque sobre su tronco
      ps.push(a.cilindro(18, 10, 0, 8, 12, { mat: 'corteza', r1: 7 }), a.caja(18, 10, 12, 11, 7, 3, { mat: 'hierro' }), a.caja(18, 10, 15, 6, 4, 4, { mat: 'hierro' }), a.caja(18, 10, 19, 18, 7, 4.5, { mat: 'hierro', tono: 0.05 }), a.cilindro(27, 10, 21, 3.4, 9, { mat: 'hierro', r1: 0.6, eje: [1, 0, 0] }));
      ps.push(a.caja(14, 11, 23.5, 9, 2, 2, { mat: 'madera', giro: 30 }), a.caja(18, 9, 23.5, 3, 3, 3, { mat: 'hierro', giro: 30 }));
      if (on && f % 2 === 0) ps.push(a.elipsoide(18, 10, 24.5, 4, 2, 1, { mat: 'casas_brasa', tono: 0.2 }));
      // tina de templar, herramientas en la pared, piedra de afilar
      ps.push(a.cilindro(-6, 10, 0, 9, 14, { mat: 'madera' }), a.cilindro(-6, 10, 3, 9.3, 1.5, { mat: 'hierro' }), a.cilindro(-6, 10, 11, 9.3, 1.5, { mat: 'hierro' }), a.cilindro(-6, 10, 13.5, 8, 0.6, { mat: 'agua' }));
      ps.push(a.caja(20, -LY / 2 + 10.5, 34, 44, 1.5, 16, { mat: 'madera_vieja' }));
      for (let i = 0; i < 6; i++) { const x = 3 + i * 7; ps.push(a.caja(x, -LY / 2 + 12, 30 + rnd(a, 0, 6), i % 2 ? 2 : 1.5, 1.2, rnd(a, 12, 18), { mat: i % 3 ? 'hierro' : 'acero' }), a.caja(x, -LY / 2 + 12, 42, 3.5, 1.4, 2.5, { mat: i % 2 ? 'madera' : 'hierro' })); }
      ps.push(a.cilindro(42, 14, 8, 8, 3, { mat: 'piedra_gris', eje: [1, 0, 0] }), a.caja(43.5, 14, 0, 8, 12, 6, { mat: 'madera' }), a.palo([40, 14, 8], [48, 14, 8], 1, { mat: 'hierro' }));
      for (let i = 0; i < 3; i++) ps.push(a.caja(LX / 2 + 2, -20 + i * 7, 0, 2, 4, 30, { mat: 'acero', incl: -14 + i * 3, inclEje: 'x', tono: rnd(a, -0.1, 0.1) }));
      ps.push(a.cilindro(LX / 2 + 1, -36, 14, 14, 3, { mat: 'madera', eje: [1, 0, 0.3], r1: 14 }), a.cilindro(LX / 2 + 0.8, -36, 14, 10, 3.4, { mat: 'negro', eje: [1, 0, 0.3] }));
      cajon(a, ps, -LX / 2 + 20, LY / 2 - 8, 0, 13);
      ps.push(a.caja(-LX / 2 + 20, LY / 2 - 8, 10.4, 10, 3, 2, { mat: 'hierro', giro: 20 }), a.caja(-LX / 2 + 22, LY / 2 - 6, 12.4, 3, 9, 1.5, { mat: 'acero', giro: -30 }));
      return on ? { piezas: ps, resplandor: { c: [FX + 4, FY + 12, 30], r: 85 - (f % 2) * 6, color: '#ff8a30' } } : ps;
    },
  },
  {
    id: 'casa_capilla', nombre: ['Capilla', 'Chapel'], tema: 'casas', variantes: ['intacta', 'iluminada', 'ruinosa'], huella: [10, 6], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const ru = v === 'ruinosa', luz = v === 'iluminada';
      const LX = 120, LY = 62, Z = 64, TX = -LX / 2 + 8, TW = 36, TZ = 132;
      base(a, ps, LX + 50, LY + 44);
      ps.push(a.caja(0, 0, 0, LX, LY, Z, { mat: 'piedra_bloques', tono: ru ? -0.06 : 0 }));
      const t: Techo = { eje: 'x', cx: 0, cy: 0, z: Z, L: LX, W: LY, H: 40, al: 6, alL: 6, g: 4 };
      techo(a, ps, t, 'pizarra', 'piedra_bloques', { tono: ru ? -0.06 : 0 });
      // contrafuertes en el costado
      for (const u of [-34, 0, 34]) ps.push(a.poliedro([[u - 4, LY / 2, 0], [u + 4, LY / 2, 0], [u - 4, LY / 2 + 11, 0], [u + 4, LY / 2 + 11, 0], [u - 4, LY / 2 + 11, 26], [u + 4, LY / 2 + 11, 26], [u - 4, LY / 2, Z - 6], [u + 4, LY / 2, Z - 6]], { mat: 'piedra_gris' }));
      for (const y of [-LY / 2 + 4, LY / 2 - 4]) ps.push(a.poliedro([[LX / 2, y - 4, 0], [LX / 2, y + 4, 0], [LX / 2 + 11, y - 4, 0], [LX / 2 + 11, y + 4, 0], [LX / 2 + 11, y - 4, 26], [LX / 2 + 11, y + 4, 26], [LX / 2, y - 4, Z - 6], [LX / 2, y + 4, Z - 6]], { mat: 'piedra_gris' }));
      // campanario
      ps.push(a.caja(TX, 0, 0, TW + 4, TW + 4, 10, { mat: 'piedra_gris' }), a.caja(TX, 0, 0, TW, TW, ru ? TZ - 14 : TZ, { mat: 'piedra_bloques', tono: 0.03 }));
      ps.push(a.caja(TX, 0, 72, TW + 3, TW + 3, 3, { mat: 'piedra_gris' }));
      const fy = cara(a, 'y', LY / 2), fx = cara(a, 'x', LX / 2), ty = cara(a, 'y', TW / 2), tx = cara(a, 'x', TX + TW / 2);
      if (!ru) ps.push(a.caja(TX, 0, TZ, TW + 6, TW + 6, 4, { mat: 'piedra_gris' }), piramide(a, TX, 0, TZ + 4, TW + 4, 62, { mat: 'pizarra' }), a.palo([TX, 0, TZ + 64], [TX, 0, TZ + 82], 1.2, { mat: 'hierro' }), a.palo([TX, -5, TZ + 76], [TX, 5, TZ + 76], 1.1, { mat: 'hierro' }));
      else for (let i = 0; i < 4; i++) ps.push(a.caja(TX + rnd(a, -14, 14), rnd(a, -14, 14), TZ - 22, rnd(a, 16, 26), rnd(a, 16, 26), 30, { mat: 'negro', resta: true, giro: rnd(a, 0, 90), incl: rnd(a, 10, 30) }));
      // vanos del campanario (pasan de lado a lado)
      const zc = ru ? 96 : 104;
      ps.push(a.caja(TX, 0, zc, TW + 10, 14, 18, { mat: 'negro', resta: true }), a.cilindro(TX - TW, 0, zc + 18, 7, TW * 2, { mat: 'negro', resta: true, eje: [1, 0, 0] }));
      ps.push(a.caja(TX, 0, zc, 14, TW + 10, 18, { mat: 'negro', resta: true }), a.cilindro(TX, -TW, zc + 18, 7, TW * 2, { mat: 'negro', resta: true, eje: [0, 1, 0] }));
      ps.push(a.caja(TX, 0, zc - 2, TW - 8, TW - 8, 24, { mat: 'negro', resta: true }));
      if (!ru) ps.push(a.cilindro(TX, 0, zc + 3, 7, 11, { mat: 'bronce', r1: 3.5 }), a.esfera(TX, 0, zc + 14, 3.6, { mat: 'bronce' }), a.palo([TX - 14, 0, zc + 18], [TX + 14, 0, zc + 18], 1.6, { mat: 'madera' }));
      for (const z of [26, 50]) ventana(a, ps, ty, TX, z, 5, 14, { marco: 'piedra_gris', arco: true, sinCruz: true, luz: luz && z > 40, alfeizar: 'piedra_gris' });
      ventana(a, ps, tx, 0, 86, 5, 14, { marco: 'piedra_gris', arco: true, sinCruz: true, alfeizar: 'piedra_gris' });
      // ventanales en arco y fachada
      for (const u of [-17, 17, 48]) ventana(a, ps, fy, u, 20, 12, 34, { marco: 'piedra_gris', alfeizar: 'piedra_gris', arco: true, vidrio: 'vidrio', luz, rota: ru && u > 0, sinCruz: true });
      puerta(a, ps, fx, 0, 30, 58, ru ? 'rota' : luz ? 'luz' : 'cerrada', { marco: 'piedra_gris', arco: true });
      for (let i = 0; i < 2; i++) ps.push(fx.bx(0, 5 + (1 - i) * 5, i * 2.5, 44 - i * 8, 10 + i * 0, 2.5, { mat: 'piedra_gris' }));
      // rosetón
      const zr = Z + 14;
      ps.push(fx.cil(0, 0, zr, 11, 1.5, { mat: 'piedra_gris' }), fx.cil(0, -5, zr, 8, 8, { mat: 'negro', resta: true }), fx.cil(0, -4.5, zr, 8, 1, { mat: luz ? 'casas_ventana_luz' : 'vidrio', tono: luz ? -0.2 : 0 }));
      if (!ru) for (let k = 0; k < 4; k++) ps.push(viga(a, fx.pt(Math.cos((k * Math.PI) / 4) * 8, -3.5, zr + Math.sin((k * Math.PI) / 4) * 8), fx.pt(-Math.cos((k * Math.PI) / 4) * 8, -3.5, zr - Math.sin((k * Math.PI) / 4) * 8), 1.4, 1.2, fx.nv, { mat: 'piedra_gris' }));
      ps.push(a.palo([LX / 2 + 6, 0, Z + 40], [LX / 2 + 6, 0, Z + 54], 1.2, { mat: 'hierro' }), a.palo([LX / 2 + 6, -4.5, Z + 49], [LX / 2 + 6, 4.5, Z + 49], 1.1, { mat: 'hierro' }));
      if (ru) {
        agujeros(a, ps, t, [[rnd(a, -10, 30), 16, 34, 24], [rnd(a, -40, -30), -10, 16, 14]]);
        piedras(a, ps, 10, -LX / 2, LX / 2 + 10, LY / 2 + 4, LY / 2 + 22);
        ps.push(a.cilindro(TX + 30, LY / 2 + 14, 0, 7, 10, { mat: 'bronce', r1: 3.5, incl: 70, tono: -0.1 }));
        matas(a, ps, 8, -LX / 2, LX / 2, LY / 2 + 2, LY / 2 + 20);
      } else matas(a, ps, 4, -LX / 2, LX / 2, LY / 2 + 12, LY / 2 + 20);
      return conLuz(ps, luz, [LX / 2 + 16, 0, 30], 80);
    },
  },
  {
    id: 'casa_atalaya', nombre: ['Atalaya', 'Watchtower'], tema: 'casas', variantes: ['madera', 'piedra', 'madera_rota'], huella: [4, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      base(a, ps, 76, 76);
      if (v === 'piedra') {
        ps.push(a.cilindro(0, 0, 0, 29, 10, { mat: 'piedra', r1: 26 }), a.cilindro(0, 0, 8, 25, 112, { mat: 'piedra_bloques', r1: 22 }));
        ps.push(a.cilindro(0, 0, 118, 25, 4, { mat: 'piedra_gris' }), a.cilindro(0, 0, 122, 26, 14, { mat: 'piedra_bloques' }));
        ps.push(a.cilindro(0, 0, 127, 21, 12, { mat: 'negro', resta: true }));
        for (let k = 0; k < 8; k++) { const g = k * 45 + 22.5, r = (g * Math.PI) / 180; ps.push(a.caja(Math.cos(r) * 24, Math.sin(r) * 24, 130, 12, 9, 8, { mat: 'negro', resta: true, giro: g + 90 })); }
        for (const [g, z] of [[45, 52], [10, 86], [80, 86], [45, 104]]) { const r = (g * Math.PI) / 180; ps.push(a.caja(Math.cos(r) * 23, Math.sin(r) * 23, z, 3, 12, 15, { mat: 'negro', resta: true, giro: g + 90 })); }
        const gd = (70 * Math.PI) / 180, cx = Math.cos(gd) * 25, cy = Math.sin(gd) * 25;
        ps.push(a.caja(cx, cy, 0, 22, 14, 34, { mat: 'negro', resta: true, giro: 160 }), a.cilindro(cx - Math.cos(gd) * 7, cy - Math.sin(gd) * 7, 34, 11, 14, { mat: 'negro', resta: true, eje: [Math.cos(gd), Math.sin(gd), 0] }));
        ps.push(a.caja(cx - Math.cos(gd) * 4, cy - Math.sin(gd) * 4, 0, 22, 2, 44, { mat: 'madera', giro: 160 }), a.caja(cx + Math.cos(gd) * 4, cy + Math.sin(gd) * 4, 0, 28, 8, 2, { mat: 'piedra_gris', giro: 160 }));
        ps.push(a.palo([-8, -8, 124], [-8, -8, 176], 1.2, { mat: 'madera' }), a.caja(-8, -1, 158, 1.5, 14, 18, { mat: 'tela_roja', giro: 0, incl: 4 }));
        piedras(a, ps, 5, -34, 34, 20, 36, 'piedra');
        return ps;
      }
      const rota = v === 'madera_rota';
      const P = 27, Q = 19, ZP = 106;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) ps.push(a.palo([sx * P, sy * P, 0], [sx * Q, sy * Q, ZP + 2], 3, { mat: 'corteza', r1: 2.6 }), a.cilindro(sx * P, sy * P, 0, 5, 3, { mat: 'piedra' }));
      const lv = [3, 40, 74, ZP];
      const at = (z: number) => P - (P - Q) * (z / (ZP + 2));
      for (let i = 0; i < 3; i++) for (const lado of [0, 1, 2, 3]) {
        if (rota && (i + lado) % 3 === 0) continue;
        const z0 = lv[i], z1 = lv[i + 1], r0 = at(z0), r1 = at(z1);
        const p = (s: number, r: number, z: number): [number, number, number] => (lado < 2 ? [(lado ? 1 : -1) * r, s * r, z] : [s * r, (lado === 2 ? 1 : -1) * r, z]);
        ps.push(a.palo(p(-1, r0, z0), p(1, r1, z1 - 2), 1.4, { mat: 'madera' }), a.palo(p(1, r0, z0), p(-1, r1, z1 - 2), 1.4, { mat: 'madera' }));
      }
      for (const z of [40, 74]) for (const lado of [0, 1, 2, 3]) { const r = at(z); const p = (s: number): [number, number, number] => (lado < 2 ? [(lado ? 1 : -1) * r, s * r, z] : [s * r, (lado === 2 ? 1 : -1) * r, z]); ps.push(a.palo(p(-1), p(1), 1.6, { mat: 'madera_vieja' })); }
      ps.push(a.caja(0, 0, ZP, 52, 52, 4, { mat: 'madera' }));
      for (let i = -3; i <= 3; i++) ps.push(a.caja(i * 7.4, 24, ZP - 3, 6, 6, 3, { mat: 'madera_vieja' }));
      // parapeto de tablas
      const ZT = ZP + 4;
      for (const [x, y, w, d] of [[0, 25, 52, 2], [25, 0, 2, 52], [0, -25, 52, 2], [-25, 0, 2, 52]] as const) {
        if (rota && x > 0) { ps.push(a.caja(x, y - 12, ZT, w, d / 2.4, 12, { mat: 'madera_vieja', incl: 18 })); continue; }
        ps.push(a.caja(x, y, ZT, w, d, 13, { mat: 'madera_vieja', tono: rnd(a, -0.05, 0.05) }));
      }
      if (!rota) {
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) ps.push(a.caja(sx * 24, sy * 24, ZT, 3.5, 3.5, 30, { mat: 'madera' }));
        ps.push(piramide(a, 0, 0, ZT + 30, 66, 32, { mat: 'paja', tono: -0.22 }), a.cilindro(0, 0, ZT + 58, 3, 8, { mat: 'paja', r1: 0.5, tono: -0.3 }));
        ps.push(a.cilindro(-12, -12, ZT, 5, 4, { mat: 'hierro', r1: 6 }), a.elipsoide(-12, -12, ZT + 4, 4, 4, 2, { mat: 'casas_brasa', tono: -0.2 }));
      } else {
        ps.push(a.caja(-24, -24, ZT, 3.5, 3.5, 30, { mat: 'madera' }), a.caja(-24, 24, ZT, 3.5, 3.5, 18, { mat: 'madera', incl: 10 }));
        ps.push(viga(a, [20, 30, 0.5], [44, 10, 0.5], 4, 1.5, [0, 0, 1], { mat: 'madera_vieja' }), viga(a, [24, 34, 2], [40, 40, 0.5], 4, 1.5, [0, 0, 1], { mat: 'madera_vieja' }));
      }
      // escalera
      for (const s of [-1, 1]) ps.push(a.palo([s * 7, 40, 0], [s * 7, 27, ZP + 12], 1.3, { mat: 'madera' }));
      for (let z = 8; z < ZP + 6; z += 8) { if (rota && (z === 40 || z === 72)) continue; const yy = 40 - 13 * (z / (ZP + 12)); ps.push(a.palo([-7, yy, z], [7, yy, z], 0.9, { mat: 'madera' })); }
      return ps;
    },
  },
);

/** Las cuatro aspas de un molino, en el plano que mira a la cámara (normal (1,1,0)), giradas `ang` grados. */
function aspas(a: Arma, ps: Pieza[], hub: V3, ang: number, L: number, rotas = false) {
  for (let k = 0; k < 4; k++) {
    const g = ang + k * 90, r = (g * Math.PI) / 180, s = Math.SQRT1_2;
    const dir: V3 = [-s * Math.sin(r), s * Math.sin(r), Math.cos(r)], lado: V3 = [s * Math.cos(r), -s * Math.cos(r), Math.sin(r)];
    const LL = rotas && k === 1 ? L * 0.45 : L;
    ps.push(a.palo(hub, mas(hub, dir, LL), 1.7, { mat: 'madera' }));
    const b = mas(mas(hub, dir, 12), lado, 7.5);
    if (!(rotas && k > 1)) ps.push(a.caja(b[0], b[1], b[2], 13, 1, LL - 14, { mat: rotas ? 'tela' : 'tela', giro: -45, incl: g, inclEje: 'y', tono: rotas ? -0.15 : -0.02 }));
    else for (let q = 18; q < LL; q += 12) ps.push(a.palo(mas(hub, dir, q), mas(mas(hub, dir, q), lado, 14), 0.8, { mat: 'madera_vieja' }));
    ps.push(a.palo(mas(mas(hub, dir, 12), lado, 14.5), mas(mas(hub, dir, LL), lado, 14.5), 0.9, { mat: 'madera_vieja' }));
  }
}

registrar(
  {
    id: 'casa_molino', nombre: ['Molino de viento', 'Windmill'], tema: 'casas', variantes: ['piedra', 'madera', 'abandonado'], cuadros: 6, t: 3, huella: [5, 5], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const ab = v === 'abandonado';
      base(a, ps, 90, 90);
      if (v === 'madera') {
        ps.push(a.cilindro(0, 0, 0, 33, 24, { mat: 'piedra_bloques', r1: 31 }), a.cilindro(0, 0, 24, 29, 80, { mat: 'madera_vieja', r1: 21 }));
        ps.push(a.cilindro(0, 0, 40, 38, 2.5, { mat: 'madera' }));
        for (let k = 0; k < 10; k++) { const r = (k / 10) * Math.PI * 2; ps.push(a.palo([Math.cos(r) * 37, Math.sin(r) * 37, 42], [Math.cos(r) * 37, Math.sin(r) * 37, 52], 0.9, { mat: 'madera' }), a.palo([Math.cos(r) * 37, Math.sin(r) * 37, 26], [Math.cos(r) * 27, Math.sin(r) * 27, 40], 1, { mat: 'madera' })); }
        ps.push(a.cilindro(0, 0, 50, 37.5, 2, { mat: 'madera', r1: 37.5 }), a.cilindro(0, 0, 50.5, 36, 3, { mat: 'negro', resta: true }));
      } else ps.push(a.cilindro(0, 0, 0, 33, 6, { mat: 'piedra' }), a.cilindro(0, 0, 0, 30, 104, { mat: ab ? 'piedra_musgo' : 'piedra_bloques', r1: 21 }));
      const roof = v === 'madera' ? 'paja' : 'pizarra';
      ps.push(a.cilindro(0, 0, 104, 24, 4, { mat: 'madera' }), a.cilindro(0, 0, 108, 25, 30, { mat: roof, r1: 1.5, tono: roof === 'paja' ? -0.22 : 0 }), a.esfera(0, 0, 139, 2.5, { mat: 'hierro' }));
      // puerta y ventanitas hacia la cámara
      const pv = (g: number, z: number, w: number, h: number, luz?: boolean) => {
        const r = (g * Math.PI) / 180, R = 30 - 9 * (z / 104), x = Math.cos(r) * R, y = Math.sin(r) * R;
        ps.push(a.caja(x, y, z, w, 14, h, { mat: 'negro', resta: true, giro: g + 90 }), a.caja(x - Math.cos(r) * 4, y - Math.sin(r) * 4, z, w, 2, h, { mat: luz ? 'casas_ventana_luz' : 'casas_vidrio', giro: g + 90, tono: -0.2 }));
      };
      const gd = 75, r = (gd * Math.PI) / 180;
      ps.push(a.caja(Math.cos(r) * 30, Math.sin(r) * 30, 0, 24, 14, 46, { mat: 'negro', resta: true, giro: gd + 90 }));
      ps.push(a.caja(Math.cos(r) * 26, Math.sin(r) * 26, 0, 24, 2, 46, { mat: ab ? 'negro' : 'madera', giro: gd + 90 }), a.caja(Math.cos(r) * 33, Math.sin(r) * 33, 0, 30, 8, 2, { mat: 'piedra_gris', giro: gd + 90 }));
      pv(20, 62, 8, 12); pv(70, 80, 8, 12);
      // eje y aspas que giran
      const hub: V3 = [23, 23, 100];
      ps.push(a.palo([10, 10, 101], hub, 3.2, { mat: 'madera' }), a.esfera(hub[0], hub[1], hub[2], 4, { mat: 'hierro' }));
      aspas(a, ps, hub, ab ? 18 : 10 + f * 15, 66, ab);
      if (!ab) { ps.push(a.caja(-28, 30, 0, 14, 10, 12, { mat: 'tela', giro: 20, tono: -0.05 }), a.elipsoide(-14, 34, 6, 7, 6, 7, { mat: 'tela', tono: 0.03 }), a.elipsoide(-24, 40, 5, 6, 5, 5.5, { mat: 'tela' })); }
      else { matas(a, ps, 8, -40, 40, 20, 42); piedras(a, ps, 4, -30, 30, 26, 40); }
      return ps;
    },
  },
  {
    id: 'casa_establo', nombre: ['Establo', 'Stable'], tema: 'casas', variantes: ['con_heno', 'abandonado'], huella: [9, 5], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const ab = v === 'abandonado';
      const LX = 140, LY = 66, Z = 54;
      base(a, ps, LX + 36, LY + 44);
      ps.push(a.caja(0, 0, 0, LX - 8, LY - 6, 1.5, { mat: 'paja', tono: -0.3 }));
      ps.push(a.caja(0, -LY / 2 + 3, 0, LX, 6, Z, { mat: 'madera_vieja' }));
      for (const s of [-1, 1]) ps.push(a.caja(s * (LX / 2 - 3), 0, 0, 6, LY, Z, { mat: 'madera_vieja', tono: 0.03 }));
      const t: Techo = { eje: 'x', cx: 0, cy: 0, z: Z, L: LX, W: LY, H: 34, al: 7, alL: 6, g: 6 };
      techo(a, ps, t, 'paja', 'madera_vieja', { tono: ab ? -0.32 : -0.2 });
      const fx = cara(a, 'x', LX / 2);
      entramadoHastial(a, ps, fx, LY, Z, 34, 'madera');
      for (const x of [-35, 0, 35]) ps.push(a.caja(x, -4, 0, 3, LY - 14, 34, { mat: 'madera' }), a.caja(x, -4, 34, 3, LY - 14, 2.5, { mat: 'madera_vieja' }));
      for (const x of [-LX / 2 + 3, -35, 0, 35, LX / 2 - 3]) ps.push(a.caja(x, LY / 2 - 2, 0, 5, 5, Z, { mat: 'madera' }));
      ps.push(a.caja(0, LY / 2 - 2, Z - 5, LX, 6, 5, { mat: 'madera' }));
      for (const x of [-35, 0, 35]) ps.push(viga(a, [x - 12, LY / 2 + 0.5, Z - 5], [x, LY / 2 + 0.5, Z - 17], 3, 1.6, [0, 1, 0], { mat: 'madera' }), viga(a, [x + 12, LY / 2 + 0.5, Z - 5], [x, LY / 2 + 0.5, Z - 17], 3, 1.6, [0, 1, 0], { mat: 'madera' }));
      const bah = [-52.5, -17.5, 17.5, 52.5];
      bah.forEach((x, i) => {
        if (ab) {
          if (i === 1) ps.push(a.caja(x + 4, LY / 2 + 6, 0, 26, 2.5, 22, { mat: 'madera_vieja', incl: 82, giro: 8 }));
          if (i === 3) ps.push(a.caja(x, LY / 2 - 1, 6, 28, 2.5, 22, { mat: 'madera_vieja', incl: 6, inclEje: 'y' }));
          return;
        }
        if (i === 2) { ps.push(a.caja(x - 14, LY / 2 + 12, 6, 2.5, 26, 22, { mat: 'madera' })); return; }
        ps.push(a.caja(x, LY / 2 - 1, 6, 30, 2.5, 22, { mat: 'madera' }), viga(a, [x - 13, LY / 2 + 0.3, 8], [x + 13, LY / 2 + 0.3, 26], 3, 1.2, [0, 1, 0], { mat: 'madera_vieja' }));
        ps.push(a.elipsoide(x + rnd(a, -6, 6), -8, 4, 11, 13, rnd(a, 8, 14), { mat: 'paja', tono: -0.15 }));
      });
      if (!ab) {
        ps.push(a.caja(-30, LY / 2 + 14, 0, 30, 10, 8, { mat: 'madera' }), a.caja(-30, LY / 2 + 14, 6, 26, 6, 2.3, { mat: 'agua' }));
        for (let i = 0; i < 3; i++) { const x = 50 + (i % 2) * 18, y = LY / 2 + 14, z = i === 2 ? 12 : 0, g = rnd(a, -8, 8); ps.push(a.caja(x - (i === 2 ? 9 : 0), y, z, 16, 11, 12, { mat: 'paja', giro: g, tono: -0.28 }), a.caja(x - (i === 2 ? 9 : 0), y, z, 1.5, 11.6, 12.4, { mat: 'cuerda', giro: g })); }
        ps.push(a.palo([22, LY / 2 + 6, 0], [24, LY / 2 + 1, 40], 0.9, { mat: 'madera' }), a.caja(24, LY / 2 + 1, 38, 6, 1, 8, { mat: 'hierro' }));
        ps.push(a.caja(0, -4, 30, 8, 14, 6, { mat: 'cuero' }));
      } else {
        agujeros(a, ps, t, [[rnd(a, -40, -10), 18, 32, 20], [rnd(a, 30, 50), 12, 18, 14]]);
        matas(a, ps, 10, -LX / 2, LX / 2, LY / 2 + 2, LY / 2 + 22);
      }
      return ps;
    },
  },
  {
    id: 'casa_granero', nombre: ['Granero', 'Barn'], tema: 'casas', variantes: ['cerrado', 'abierto', 'abandonado'], huella: [7, 10], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const ab = v === 'abandonado', abierto = v === 'abierto' || ab;
      const W = 100, L = 150, Z = 58, H = 64;
      base(a, ps, W + 40, L + 40);
      ps.push(a.caja(0, 0, 0, W + 3, L + 3, 8, { mat: 'piedra' }), a.caja(0, 0, 8, W, L, Z - 8, { mat: 'madera_vieja', tono: ab ? -0.08 : 0.02 }));
      const t: Techo = { eje: 'y', cx: 0, cy: 0, z: Z, L, W, H, al: 8, alL: 7, g: 4 };
      const uk = W * 0.29, zk = Z + H * 0.66, sl = (zk - Z) / (W / 2 - uk), ue = W / 2 + 8, ze = Z - 8 * sl, Ls = L / 2 + 7, zr = Z + H;
      const pts: V3[] = [];
      for (const s of [-L / 2, L / 2]) pts.push(tp(t, s, -W / 2, Z), tp(t, s, W / 2, Z), tp(t, s, -uk, zk), tp(t, s, uk, zk), tp(t, s, 0, zr));
      ps.push(a.poliedro(pts, { mat: 'madera_vieja', tono: 0.04 }));
      const tt = ab ? -0.12 : 0;
      for (const sg of [-1, 1]) ps.push(losa(a, t, Ls, sg * ue, ze, sg * uk, zk, 4, { mat: 'teja', tono: tt - 0.12 }), losa(a, t, Ls, sg * (uk + 1), zk - 0.5, 0, zr, 4, { mat: 'teja', tono: tt - 0.08 }));
      ps.push(a.palo(tp(t, -Ls - 1, 0, zr + 3), tp(t, Ls + 1, 0, zr + 3), 3, { mat: 'teja', tono: -0.2 }));
      const fy = cara(a, 'y', L / 2), fx = cara(a, 'x', W / 2);
      for (const u of [-W / 2 + 2, -16, 16, W / 2 - 2]) ps.push(fy.bx(u, 1, 8, 4, 2, Z - 8, { mat: 'madera' }));
      ps.push(fy.bx(0, 1, Z - 4, W, 2, 4, { mat: 'madera' }));
      for (let u = -L / 2 + 2; u <= L / 2; u += 37) ps.push(fx.bx(u, 1, 8, 4, 2, Z - 8, { mat: 'madera' }));
      ps.push(fx.bx(0, 1, Z - 4, L, 2, 4, { mat: 'madera' }), fx.bx(0, 1, 30, L, 2, 3, { mat: 'madera' }));
      // portón doble
      const DW = 44, DH = 52;
      ps.push(fy.bx(0, 1, 0, DW + 8, 2, DH + 4, { mat: 'madera' }), fy.bx(0, -2, 0, DW, 12, DH, { mat: 'negro', resta: true }), fy.bx(0, -7, 0, DW, 1, DH, { mat: 'negro' }));
      if (!abierto) for (const s of [-1, 1]) {
        const u = (s * DW) / 4;
        ps.push(fy.bx(u, -3, 0, DW / 2 - 0.5, 2, DH, { mat: 'madera', tono: 0.06 }));
        for (const z of [2, DH / 2 - 1.5, DH - 5]) ps.push(fy.bx(u, -1.5, z, DW / 2 - 2, 1.2, 3, { mat: 'madera', tono: -0.04 }));
        ps.push(viga(a, fy.pt(u - (s * DW) / 4 + s * 2, -1.5, 5), fy.pt(u + (s * DW) / 4 - s * 2, -1.5, DH / 2 - 2), 3, 1.2, fy.nv, { mat: 'madera', tono: -0.04 }), viga(a, fy.pt(u - (s * DW) / 4 + s * 2, -1.5, DH / 2 + 2), fy.pt(u + (s * DW) / 4 - s * 2, -1.5, DH - 5), 3, 1.2, fy.nv, { mat: 'madera', tono: -0.04 }));
      } else {
        ps.push(a.elipsoide(-6, L / 2 - 14, 2, 14, 10, 14, { mat: 'paja', tono: -0.2 }), a.elipsoide(10, L / 2 - 10, 2, 9, 8, 9, { mat: 'paja', tono: -0.25 }));
        ps.push(fy.bx(-DW / 2 - 12, 3.5, 0, DW / 2, 2, DH, { mat: 'madera', tono: 0.06, giro: ab ? 0 : 0 }));
        if (!ab) ps.push(fy.bx(DW / 2 + 12, 3.5, 0, DW / 2, 2, DH, { mat: 'madera', tono: 0.06 }));
        else ps.push(viga(a, [DW / 2, L / 2 + 8, 0.5], [DW / 2 + 10, L / 2 + 30, 0.5], DW / 2 - 4, 2, [0, 0, 1], { mat: 'madera' }));
      }
      // puerta del pajar, viga con polea
      ps.push(fy.bx(0, 1, 74, 26, 2, 26, { mat: 'madera' }), fy.bx(0, -2, 76, 20, 10, 22, { mat: 'negro', resta: true }), fy.bx(0, -6.5, 76, 20, 1, 22, { mat: 'negro' }));
      ps.push(fy.bx(-6, 6, 76, 2, 12, 22, { mat: 'madera', tono: 0.05 }));
      ps.push(a.palo([0, L / 2 - 4, 108], [0, L / 2 + 20, 108], 2.2, { mat: 'madera' }), a.cilindro(-2, L / 2 + 16, 104, 3, 4, { mat: 'hierro', eje: [1, 0, 0] }));
      ps.push(a.palo([0, L / 2 + 16, 104], [0, L / 2 + 16, ab ? 60 : 50], 0.5, { mat: 'cuerda' }));
      if (!ab) ps.push(a.caja(0, L / 2 + 16, 38, 14, 10, 12, { mat: 'paja', tono: -0.28 }), a.caja(0, L / 2 + 16, 38, 1.5, 10.5, 12.5, { mat: 'cuerda' }));
      for (const u of [-38, 38]) ventana(a, ps, fx, u, 28, 12, 12, { marco: 'madera', sinCruz: true, tablas: ab });
      if (ab) {
        agujeros(a, ps, t, [[rnd(a, -40, 0), 20, 36, 22], [rnd(a, 30, 50), 12, 20, 14]]);
        for (let i = 0; i < 4; i++) { const u = rnd(a, -L / 2 + 10, L / 2 - 10), z = rnd(a, 12, 30); ps.push(fx.bx(u, -2, z, 4, 8, rnd(a, 12, 24), { mat: 'negro', resta: true }), fx.bx(u, -4, z, 4, 1, 24, { mat: 'negro' })); }
        matas(a, ps, 10, W / 2, W / 2 + 16, -L / 2, L / 2);
      } else {
        for (let i = 0; i < 4; i++) { const y = rnd(a, -40, 40), z = i === 3 ? 12 : 0, g = rnd(a, -10, 10), x = W / 2 + 12; ps.push(a.caja(x, y, z, 11, 16, 12, { mat: 'paja', giro: g, tono: -0.28 }), a.caja(x, y, z, 11.5, 1.5, 12.4, { mat: 'cuerda', giro: g })); }
      }
      return ps;
    },
  },
);

registrar(
  {
    id: 'casa_torre_guardia', nombre: ['Torre de guardia', 'Guard tower'], tema: 'casas', variantes: ['intacta', 'en_ruinas'], huella: [5, 5], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const ru = v === 'en_ruinas', S = 56, HT = 150;
      base(a, ps, 96, 96);
      ps.push(a.poliedro([[-S / 2 - 6, -S / 2 - 6, 0], [S / 2 + 6, -S / 2 - 6, 0], [-S / 2 - 6, S / 2 + 6, 0], [S / 2 + 6, S / 2 + 6, 0], [-S / 2, -S / 2, 22], [S / 2, -S / 2, 22], [-S / 2, S / 2, 22], [S / 2, S / 2, 22]], { mat: 'piedra_gris', tono: -0.04 }));
      ps.push(a.caja(0, 0, 0, S, S, HT, { mat: 'piedra_gris' }), a.caja(0, 0, 70, S + 3, S + 3, 3, { mat: 'piedra_gris', tono: 0.08 }));
      const fy = cara(a, 'y', S / 2), fx = cara(a, 'x', S / 2);
      if (!ru) {
        for (const f of [fy, fx]) for (let u = -S / 2 + 4; u <= S / 2; u += 8) ps.push(f.bx(u, 2.5, HT - 8, 4, 5, 8, { mat: 'piedra_gris', tono: 0.05 }));
        ps.push(a.caja(0, 0, HT, S + 10, S + 10, 18, { mat: 'piedra_gris', tono: 0.03 }), a.caja(0, 0, HT + 6, S - 2, S - 2, 14, { mat: 'negro', resta: true }));
        for (let u = -S / 2 + 6; u < S / 2; u += 15) for (const [x, y, w, d] of [[u, S / 2 + 3, 7, 10], [u, -S / 2 - 3, 7, 10], [S / 2 + 3, u, 10, 7], [-S / 2 - 3, u, 10, 7]]) ps.push(a.caja(x, y, HT + 11, w, d, 8, { mat: 'negro', resta: true }));
        ps.push(a.caja(0, 0, HT + 6, S - 2, S - 2, 1, { mat: 'piedra_bloques', tono: -0.1 }));
        ps.push(a.caja(-12, -12, HT, 18, 18, 30, { mat: 'piedra_gris' }), piramide(a, -12, -12, HT + 30, 24, 22, { mat: 'pizarra' }));
        ps.push(a.palo([-12, -12, HT + 50], [-12, -12, HT + 74], 1, { mat: 'madera' }), a.caja(-5, -12, HT + 58, 14, 1, 14, { mat: 'tela_roja', incl: 3 }));
      } else {
        for (let i = 0; i < 4; i++) ps.push(a.caja(rnd(a, -10, 30), rnd(a, -10, 30), HT - rnd(a, 10, 40), rnd(a, 30, 50), rnd(a, 30, 50), 80, { mat: 'negro', resta: true, giro: rnd(a, 0, 90), incl: rnd(a, 15, 35), inclEje: a.r() < 0.5 ? 'x' : 'y' }));
        ps.push(a.caja(0, 0, HT - 50, S - 12, S - 12, 60, { mat: 'negro', resta: true }));
        piedras(a, ps, 16, -10, 46, S / 2 + 4, S / 2 + 30, 'piedra_gris');
        piedras(a, ps, 8, S / 2 + 4, S / 2 + 30, -20, 30, 'piedra_gris');
        matas(a, ps, 8, -40, 40, S / 2 + 2, S / 2 + 24);
      }
      // saeteras
      for (const f of [fy, fx]) for (const [u, z] of [[-12, 44], [12, 90], [-8, 122]]) { if (ru && z > 110) continue; ps.push(f.bx(u, 0.4, z - 2, 8, 1, 20, { mat: 'piedra_gris', tono: 0.06 }), f.bx(u, -1, z, 3, 10, 16, { mat: 'negro', resta: true }), f.bx(u, -5, z, 3, 1, 16, { mat: 'negro' })); }
      puerta(a, ps, fy, 8, 26, 50, ru ? 'rota' : 'cerrada', { marco: 'piedra_gris', arco: true, z: 0 });
      for (let i = 0; i < 3; i++) ps.push(fy.bx(8, 10 - i * 2.5, 0, 36 - i * 4, 18 - i * 5, 2 + i * 0.01, { mat: 'piedra_gris', tono: -i * 0.04 }));
      if (!ru) ps.push(a.palo([S / 2 + 6, 26, 36], [S / 2, 26, 36], 1, { mat: 'hierro' }), a.cilindro(S / 2 + 6, 26, 36, 1.8, 7, { mat: 'madera' }), a.cilindro(S / 2 + 6, 26, 43, 2.6, 4, { mat: 'fuego', r1: 0.4 }));
      return ru ? ps : { piezas: ps, resplandor: { c: [S / 2 + 8, 26, 45], r: 30, color: '#ff9a3a' } };
    },
  },
  {
    id: 'casa_caseta_piedra', nombre: ['Caseta de piedra', 'Small stone house'], tema: 'casas', variantes: ['intacta', 'iluminada', 'ruinosa'], huella: [4, 5], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const ru = v === 'ruinosa', luz = v === 'iluminada';
      const LX = 62, LY = 72, Z = 44;
      base(a, ps, LX + 32, LY + 36);
      ps.push(a.caja(0, 0, 0, LX + 4, LY + 4, 6, { mat: 'piedra_gris' }), a.caja(0, 0, 6, LX, LY, Z - 6, { mat: ru ? 'piedra_musgo' : 'piedra_bloques' }));
      esquinas(a, ps, LX / 2, LY / 2, 6, Z);
      const t: Techo = { eje: 'y', cx: 0, cy: 0, z: Z, L: LY, W: LX, H: 36, al: 5, alL: 5, g: 6 };
      techo(a, ps, t, 'pizarra', ru ? 'piedra_musgo' : 'piedra_bloques', { tono: ru ? -0.08 : 0.02, cumbrera: 'piedra_gris' });
      const fy = cara(a, 'y', LY / 2), fx = cara(a, 'x', LX / 2);
      puerta(a, ps, fy, 0, 26, 52, ru ? 'rota' : luz ? 'luz' : 'cerrada', { marco: 'piedra_gris', arco: true });
      ps.push(fy.bx(0, 6, 0, 34, 12, 2.5, { mat: 'piedra_gris' }));
      ps.push(fy.cil(0, 0, Z + 22, 4, 1.5, { mat: 'piedra_gris' }), fy.cil(0, -3, Z + 22, 2.5, 5, { mat: 'negro', resta: true }));
      ventana(a, ps, fx, 12, 22, 9, 14, { marco: 'piedra_gris', alfeizar: 'piedra_gris', arco: true, luz, sinCruz: true, tablas: ru });
      ventana(a, ps, fx, -20, 22, 9, 14, { marco: 'piedra_gris', alfeizar: 'piedra_gris', arco: true, luz, sinCruz: true });
      chimenea(a, ps, -14, -20, 40, 96, 'piedra_bloques', 11);
      if (ru) {
        agujeros(a, ps, t, [[rnd(a, -14, 10), 14, 26, 16]]);
        piedras(a, ps, 7, -30, 30, LY / 2 + 6, LY / 2 + 18, 'pizarra');
        matas(a, ps, 8, -LX / 2, LX / 2 + 10, LY / 2, LY / 2 + 16);
        ps.push(fx.bx(-30, 1, 6, 22, 2, 30, { mat: 'hojas', tono: -0.1 }));
      } else { barril(a, ps, LX / 2 - 4, LY / 2 + 10); matas(a, ps, 3, -LX / 2, LX / 2, LY / 2 + 8, LY / 2 + 16); }
      return conLuz(ps, luz, [0, LY / 2 + 16, 26], 56);
    },
  },
  {
    id: 'casa_choza', nombre: ['Choza redonda', 'Round hut'], tema: 'casas', variantes: ['intacta', 'con_fogata', 'abandonada'], huella: [4, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const ab = v === 'abandonada';
      base(a, ps, 84, 84);
      ps.push(a.cilindro(0, 0, 0, 27, 34, { mat: 'casas_revoque', r1: 26, tono: ab ? -0.18 : -0.08 }));
      for (let k = 0; k < 12; k++) { const r = (k / 12) * Math.PI * 2 + 0.2; ps.push(a.palo([Math.cos(r) * 27.4, Math.sin(r) * 27.4, 0], [Math.cos(r) * 26.4, Math.sin(r) * 26.4, 32], 1.4, { mat: 'madera_vieja' })); }
      ps.push(a.cilindro(0, 0, 10, 27.8, 2, { mat: 'madera_vieja', r1: 27.6 }), a.cilindro(0, 0, 22, 27.5, 2, { mat: 'madera_vieja', r1: 27.2 }));
      const tt = ab ? -0.32 : -0.2;
      ps.push(a.cilindro(0, 0, 25, 37, 8, { mat: 'paja', r1: 33, tono: tt }), a.cilindro(0, 0, 32, 33.5, 46, { mat: 'paja', r1: 2, tono: tt }));
      // puerta hacia la cámara con cortina de cuero
      const g = 62, r = (g * Math.PI) / 180, cx = Math.cos(r) * 27, cy = Math.sin(r) * 27;
      ps.push(a.caja(cx, cy, 0, 20, 14, 30, { mat: 'negro', resta: true, giro: g + 90 }), a.caja(cx - Math.cos(r) * 5, cy - Math.sin(r) * 5, 0, 20, 1, 30, { mat: 'negro', giro: g + 90 }));
      if (!ab) ps.push(a.caja(cx - Math.cos(r) * 3 - Math.sin(r) * -4, cy - Math.sin(r) * 3 + Math.cos(r) * -4, 0, 12, 1.4, 30, { mat: 'cuero', giro: g + 90 }));
      ps.push(a.palo([cx - Math.sin(r) * 11, cy + Math.cos(r) * 11, 0], [cx - Math.sin(r) * 11, cy + Math.cos(r) * 11, 32], 1.8, { mat: 'corteza' }), a.palo([cx + Math.sin(r) * 11, cy - Math.cos(r) * 11, 0], [cx + Math.sin(r) * 11, cy - Math.cos(r) * 11, 32], 1.8, { mat: 'corteza' }));
      if (ab) {
        for (const [gg, z] of [[30, 48], [80, 40]]) { const q = (gg * Math.PI) / 180; ps.push(a.caja(Math.cos(q) * 22, Math.sin(q) * 22, z, 16, 16, 18, { mat: 'negro', resta: true, giro: gg + rnd(a, -20, 20) })); }
        ps.push(a.cilindro(0, 0, 30, 29, 40, { mat: 'negro', r1: 2 }));
        for (let k = 0; k < 8; k++) { const q = (k / 8) * Math.PI * 2; ps.push(a.palo([0, 0, 76], [Math.cos(q) * 33, Math.sin(q) * 33, 30], 1.1, { mat: 'madera_vieja' })); }
        matas(a, ps, 8, -40, 40, 20, 40);
      } else {
        // atado de la punta, herramientas y fuego afuera
        ps.push(a.cilindro(0, 0, 74, 4, 6, { mat: 'cuerda', r1: 3 }), a.palo([0, 0, 76], [1, 1, 86], 1.6, { mat: 'paja', tono: -0.2 }));
        ps.push(a.caja(-30, 26, 0, 16, 10, 2, { mat: 'cuero', giro: 30, tono: 0.05 }), a.cilindro(32, -12, 0, 5, 9, { mat: 'tierra', r1: 6, tono: 0.15 }));
        lena(a, ps, -24, 30, 22, 'x', 2);
      }
      if (v === 'con_fogata') {
        for (let k = 0; k < 7; k++) { const q = (k / 7) * Math.PI * 2; ps.push(a.caja(Math.cos(q) * 7 + 34, Math.sin(q) * 7 + 30, 0, 4, 3, 3, { mat: 'piedra', giro: (q * 180) / Math.PI })); }
        ps.push(a.elipsoide(34, 30, 1, 5, 5, 2, { mat: 'casas_brasa', tono: -0.1 }), a.palo([28, 26, 3], [40, 34, 3], 1.4, { mat: 'corteza', tono: -0.2 }), a.palo([36, 24, 3], [31, 36, 3], 1.4, { mat: 'corteza', tono: -0.25 }));
        llamas(a, ps, 34, 30, 2, 3.5, 9, 1, 3, 6);
        return { piezas: ps, resplandor: { c: [34, 30, 6], r: 34, color: '#ff8a30' } };
      }
      return ps;
    },
  },
  {
    id: 'casa_mercado', nombre: ['Mercado techado', 'Market hall'], tema: 'casas', variantes: ['con_mercancia', 'vacio'], huella: [10, 7], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const lleno = v === 'con_mercancia';
      const LX = 150, LY = 96, Z1 = 50, Z2 = 92;
      base(a, ps, LX + 40, LY + 40);
      ps.push(a.caja(0, 0, 0, LX, LY, 2, { mat: 'piedra_gris', tono: -0.06 }));
      ps.push(a.caja(0, 0, 0, LX, LY, Z1, { mat: 'piedra_bloques' }));
      // arcada: se vacía por dentro y se abren arcos en las dos caras visibles y en las de atrás
      ps.push(a.caja(0, 0, 0, LX - 18, LY - 18, Z1 - 7, { mat: 'negro', resta: true }));
      for (const u of [-50, 0, 50]) for (const sy of [-1, 1]) ps.push(a.caja(u, (sy * LY) / 2, 0, 30, 24, 28, { mat: 'negro', resta: true }), a.cilindro(u, (sy * LY) / 2 - 12, 28, 15, 24, { mat: 'negro', resta: true, eje: [0, 1, 0] }));
      for (const u of [-22, 22]) for (const sx of [-1, 1]) ps.push(a.caja((sx * LX) / 2, u, 0, 24, 30, 28, { mat: 'negro', resta: true }), a.cilindro((sx * LX) / 2 - 12, u, 28, 15, 24, { mat: 'negro', resta: true, eje: [1, 0, 0] }));
      ps.push(a.caja(0, 0, 0, LX - 2, LY - 2, 1.5, { mat: 'piedra_gris', tono: -0.08 }));
      const fy = cara(a, 'y', LY / 2), fx = cara(a, 'x', LX / 2);
      ps.push(a.caja(0, 0, Z1 - 4, LX + 3, LY + 3, 4, { mat: 'piedra_gris', tono: 0.05 }));
      ps.push(a.caja(0, 0, Z1, LX + 4, LY + 4, Z2 - Z1, { mat: 'casas_revoque' }));
      const gy = cara(a, 'y', LY / 2 + 2), gx = cara(a, 'x', LX / 2 + 2);
      entramado(a, ps, gy, -LX / 2 - 2, LX / 2 + 2, Z1, Z2, 8, { mat: 'madera', mitad: 70 });
      entramado(a, ps, gx, -LY / 2 - 2, LY / 2 + 2, Z1, Z2, 5, { mat: 'madera', mitad: 70 });
      const t: Techo = { eje: 'x', cx: 0, cy: 0, z: Z2, L: LX + 4, W: LY + 4, H: 46, al: 8, alL: 8, g: 4 };
      techo(a, ps, t, 'teja', 'casas_revoque', { tono: -0.1 });
      entramadoHastial(a, ps, gx, LY + 4, Z2, 46, 'madera');
      for (const u of [-54, -18, 18, 54]) ventana(a, ps, gy, u, 60, 14, 18, { postigos: 'abiertos', luz: lleno && u === 18 });
      for (const u of [-24, 24]) ventana(a, ps, gx, u, 60, 14, 18, {});
      ventana(a, ps, gx, 0, Z2 + 8, 12, 14, {});
      // torrecita con campana sobre la cumbrera
      ps.push(a.caja(0, 0, Z2 + 34, 18, 18, 26, { mat: 'madera' }), a.caja(0, 0, Z2 + 44, 20, 8, 12, { mat: 'negro', resta: true }), a.caja(0, 0, Z2 + 44, 8, 20, 12, { mat: 'negro', resta: true }));
      ps.push(a.cilindro(0, 0, Z2 + 46, 3.5, 7, { mat: 'bronce', r1: 1.8 }), piramide(a, 0, 0, Z2 + 60, 24, 20, { mat: 'teja', tono: -0.12 }), a.palo([0, 0, Z2 + 78], [0, 0, Z2 + 90], 0.8, { mat: 'hierro' }));
      // mercancía bajo los arcos
      if (lleno) {
        barril(a, ps, -50, 20); barril(a, ps, -36, 28);
        cajon(a, ps, 0, 22, 0, 14); cajon(a, ps, 2, 22, 11.2, 11);
        ps.push(a.caja(46, 18, 12, 30, 14, 2, { mat: 'madera_lisa' }), a.caja(34, 18, 0, 3, 12, 12, { mat: 'madera' }), a.caja(58, 18, 0, 3, 12, 12, { mat: 'madera' }));
        for (let i = 0; i < 5; i++) ps.push(a.esfera(36 + i * 5, 18 + rnd(a, -3, 3), 16, 2.6, { mat: i % 2 ? 'hojas_otono' : 'carne', tono: 0.05 }));
        for (let i = 0; i < 4; i++) ps.push(a.elipsoide(-12 + i * 9, -18 + rnd(a, -4, 4), 6, 6, 5, 7, { mat: 'tela', tono: rnd(a, -0.1, 0.05) }));
        for (const [u, m] of [[-50, 'tela_roja'], [50, 'tela_azul']] as const) ps.push(fy.bx(u, 4, 34, 22, 1, 8, { mat: m, incl: 0 }));
        cajon(a, ps, LX / 2 + 12, -30, 0, 14);
        ps.push(a.caja(-60, LY / 2 + 12, 0, 18, 12, 1.5, { mat: 'tela', giro: 15 }));
        for (let i = 0; i < 3; i++) ps.push(a.cilindro(-64 + i * 6, LY / 2 + 12, 1.5, 2.6, 4, { mat: 'tierra', r1: 3, tono: 0.2 }));
      } else {
        ps.push(a.caja(46, 18, 0, 30, 14, 2, { mat: 'madera_vieja', giro: 12 }), a.caja(30, -10, 0, 3, 12, 12, { mat: 'madera', incl: 80 }));
        piedras(a, ps, 5, -60, 60, LY / 2 + 4, LY / 2 + 16, 'teja');
      }
      void fx;
      return conLuz(ps, lleno, [20, LY / 2 + 10, 66], 50);
    },
  },
);
