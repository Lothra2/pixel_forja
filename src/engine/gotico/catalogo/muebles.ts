import { registrar, type Arma, type ObjetoDef, type Pieza, type V3 } from '../objeto';
import type { Escena } from '../render';
import { MATERIALES } from '../materiales';

/**
 * Muebles y mesas: mesas (de banquete, redonda, de alquimista, de mapas, rota), sillas, bancos, taburetes, tronos,
 * camas, estantes, atriles, escritorios, armarios, cómodas, bancos de iglesia, alfombras, velas y candelabros,
 * caldero, fogón, repisas con frascos, jaula colgante, potro, doncella de hierro y piedra de afilar.
 * Lo que va contra una pared se arma a lo largo de x con el frente hacia +y; la versión `_y` lo gira (frente a +x).
 */

MATERIALES.muebles_pergamino = { rampa: ['#2b2418', '#463b28', '#62553b', '#7e6f50', '#998966', '#b2a27e', '#c7b994'], ruido: 0.15, escala: 0.3 };
MATERIALES.muebles_barro = { rampa: ['#1d120c', '#321e14', '#48301e', '#5f3f28', '#774f33', '#8f6140'], ruido: 0.2, escala: 0.35 };
MATERIALES.muebles_vidrio = { rampa: ['#0b1210', '#13201c', '#1e302a', '#2c443b', '#3d5a4e', '#557566', '#7a9a88'], ruido: 0.08, escala: 0.2, brillo: 0.9 };
MATERIALES.muebles_piel = { rampa: ['#17120d', '#2a2018', '#3e3124', '#544331', '#6b5640', '#826a50'], ruido: 0.6, escala: 0.7 };

// ------------------------------------------------------------------ marcos (piezas en un sistema local)
interface Marco { o: V3; x: V3; y: V3; z: V3 }
interface Op { tono?: number; resta?: boolean }
const RAD = Math.PI / 180;
const nr = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cr = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

class Pz {
  constructor(readonly a: Arma, readonly ps: Pieza[], readonly k: Marco = { o: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }) {}
  p(v: V3): V3 { const k = this.k; return [k.o[0] + k.x[0] * v[0] + k.y[0] * v[1] + k.z[0] * v[2], k.o[1] + k.x[1] * v[0] + k.y[1] * v[1] + k.z[1] * v[2], k.o[2] + k.x[2] * v[0] + k.y[2] * v[1] + k.z[2] * v[2]]; }
  d(v: V3): V3 { const k = this.k; return [k.x[0] * v[0] + k.y[0] * v[1] + k.z[0] * v[2], k.x[1] * v[0] + k.y[1] * v[1] + k.z[1] * v[2], k.x[2] * v[0] + k.y[2] * v[1] + k.z[2] * v[2]]; }
  en(o: V3, x: V3 = [1, 0, 0], y: V3 = [0, 1, 0]): Pz { const X = nr(this.d(x)); const Z = nr(cr(X, this.d(y))); const Y = cr(Z, X); return new Pz(this.a, this.ps, { o: this.p(o), x: X, y: Y, z: Z }); }
  gira(o: V3, g: number): Pz { const c = Math.cos(g * RAD), s = Math.sin(g * RAD); return this.en(o, [c, s, 0], [-s, c, 0]); }
  /** Inclina `g` grados alrededor del eje x local (positivo levanta +y). */
  inclX(o: V3, g: number): Pz { const c = Math.cos(g * RAD), s = Math.sin(g * RAD); return this.en(o, [1, 0, 0], [0, c, s]); }
  /** Inclina `g` grados alrededor del eje y local (positivo levanta +x). */
  inclY(o: V3, g: number): Pz { const c = Math.cos(g * RAD), s = Math.sin(g * RAD); return this.en(o, [c, 0, s], [0, 1, 0]); }
  /** Como inclY pero las coordenadas siguen siendo las del padre (gira alrededor del punto o). */
  pivY(o: V3, g: number): Pz { return this.inclY(o, g).en([-o[0], -o[1], -o[2]]); }
  caja(c: V3, l: V3, mat: string, o: Op = {}) { const pts: V3[] = []; for (const sx of [-0.5, 0.5]) for (const sy of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) pts.push(this.p([c[0] + sx * l[0], c[1] + sy * l[1], c[2] + sz * l[2]])); this.ps.push(this.a.poliedro(pts, { mat, ...o })); return this; }
  base(x: number, y: number, z: number, an: number, pr: number, al: number, mat: string, o: Op = {}) { return this.caja([x, y, z + al / 2], [an, pr, al], mat, o); }
  poli(pts: V3[], mat: string, o: Op = {}) { this.ps.push(this.a.poliedro(pts.map((q) => this.p(q)), { mat, ...o })); return this; }
  palo(p0: V3, p1: V3, r0: number, mat: string, o: Op & { r1?: number } = {}) { this.ps.push(this.a.palo(this.p(p0), this.p(p1), r0, { mat, ...o })); return this; }
  cil(x: number, y: number, z: number, r0: number, h: number, mat: string, o: Op & { r1?: number } = {}) { return this.palo([x, y, z], [x, y, z + h], r0, mat, o); }
  bola(c: V3, r: number, mat: string, o: Op = {}) { return this.elip(c, [r, r, r], mat, o); }
  elip(c: V3, r: V3, mat: string, o: Op = {}) { const k = this.k; this.ps.push({ k: 'elip', c: this.p(c), ex: k.x, ey: k.y, ez: k.z, r, mat, ...o } as Pieza); return this; }
}

type ArmarG = (v: string, f: number, a: Arma, g: number) => Pieza[] | Escena;
/** Registra el mueble a lo largo de x (frente a +y) y su versión girada `_y` (frente a +x). */
function dos(d: Omit<ObjetoDef, 'armar'> & { armarG: ArmarG }) {
  const { armarG, ...r } = d;
  registrar(
    { ...r, armar: (v, f, a) => armarG(v, f, a, 0) },
    { ...r, id: r.id + '_y', nombre: [r.nombre[0] + ' (eje y)', r.nombre[1] + ' (y axis)'], huella: r.huella ? [r.huella[1], r.huella[0]] : undefined, armar: (v, f, a) => armarG(v, f, a, -90) },
  );
}
const raiz = (a: Arma, ps: Pieza[], g = 0) => new Pz(a, ps).gira([0, 0, 0], g);

// ------------------------------------------------------------------ cosas chicas que van encima
function vela(b: Pz, x: number, y: number, z: number, h: number, f = 0, on = true, r = 1.0) {
  b.cil(x, y, z, r, h, 'cera', { r1: r * 0.9 });
  b.elip([x + r * 0.7, y + 0.2, z + h - 0.8], [0.5, 0.5, 1.3], 'cera', { tono: -0.06 });
  b.palo([x, y, z + h], [x, y, z + h + 0.7], 0.3, 'negro');
  if (!on) return;
  const k = Math.sin(f * 2.3 + x * 0.7 + y * 1.3);
  b.elip([x + k * 0.3, y - k * 0.2, z + h + 1.8 + k * 0.2], [0.8, 0.8, 1.6 + k * 0.4], 'luz_vela');
  b.elip([x, y, z + h + 1.0], [0.55, 0.55, 0.6], 'fuego');
}
function candelero(b: Pz, x: number, y: number, z: number, h: number, f = 0, on = true, mat = 'hierro') {
  b.cil(x, y, z, 1.9, 0.7, mat, { r1: 1.4 }).cil(x, y, z + 0.7, 0.5, 2.4, mat).cil(x, y, z + 3, 1.5, 0.6, mat);
  vela(b, x, y, z + 3.6, h, f, on, 0.9);
}
function copa(b: Pz, x: number, y: number, z: number, mat = 'bronce', vino = true) {
  b.cil(x, y, z, 1.3, 0.5, mat).cil(x, y, z + 0.5, 0.45, 2, mat).cil(x, y, z + 2.5, 1.0, 2, mat, { r1: 1.5 });
  if (vino) b.cil(x, y, z + 4.3, 1.35, 0.25, 'sangre');
}
function jarro(b: Pz, x: number, y: number, z: number) {
  b.cil(x, y, z, 1.6, 4, 'madera_lisa', { r1: 1.5 }).cil(x, y, z + 0.8, 1.7, 0.6, 'hierro').cil(x, y, z + 3, 1.6, 0.6, 'hierro');
  b.palo([x + 1.5, y, z + 3.2], [x + 2.6, y, z + 2], 0.45, 'madera_lisa').palo([x + 2.6, y, z + 2], [x + 1.5, y, z + 0.8], 0.45, 'madera_lisa');
}
function jarra(b: Pz, x: number, y: number, z: number, s = 1) {
  b.cil(x, y, z, 2 * s, 4 * s, 'muebles_barro', { r1: 2.6 * s }).cil(x, y, z + 4 * s, 2.6 * s, 2 * s, 'muebles_barro', { r1: 1.4 * s }).cil(x, y, z + 6 * s, 1.3 * s, 1.6 * s, 'muebles_barro', { r1: 1.6 * s, tono: 0.05 });
  b.palo([x - 2.4 * s, y, z + 6.4 * s], [x - 3.4 * s, y, z + 4 * s], 0.5 * s, 'muebles_barro').palo([x - 3.4 * s, y, z + 4 * s], [x - 2.3 * s, y, z + 2 * s], 0.5 * s, 'muebles_barro');
}
function plato(b: Pz, x: number, y: number, z: number, mat = 'madera_lisa') { b.cil(x, y, z, 2.8, 0.5, mat, { r1: 3.1 }); }
function pan(b: Pz, x: number, y: number, z: number, g = 0) { b.gira([x, y, z], g).elip([0, 0, 1.2], [2.6, 1.6, 1.4], 'hongo', { tono: 0.1 }).caja([0.4, 0, 2.4], [0.4, 2.4, 0.4], 'hongo', { tono: -0.2 }); }
function libro(b: Pz, x: number, y: number, z: number, g: number, mat: string, grueso = 1.8, an = 6, la = 8) {
  const s = b.gira([x, y, z], g);
  s.base(0, 0, 0, la, an, grueso, mat).base(0.4, 0.3, 0.25, la - 0.6, an - 0.4, grueso - 0.5, 'muebles_pergamino');
}
function libroAbierto(b: Pz, x: number, y: number, z: number, g: number, runas = false) {
  const s = b.gira([x, y, z], g);
  s.base(0, 0, 0, 8, 12, 0.6, 'cuero');
  s.inclX([0, 0.2, 0.5], 6).base(0, 2.9, 0, 7.4, 5.6, 1.1, 'muebles_pergamino');
  s.inclX([0, -0.2, 0.5], -6).base(0, -2.9, 0, 7.4, 5.6, 1.1, 'muebles_pergamino', { tono: -0.06 });
  if (runas) for (const y of [-3.2, 2.8]) for (const x of [-2, 0.3, 2.4]) s.base(x, y + (x * 0.1), 1.65 + Math.abs(y) * 0.08, 1.2, 3, 0.3, 'runa', { tono: -0.1 });
  else for (const y of [-2.9, 2.9]) for (const x of [-2.2, 0, 2.2]) s.base(x, y, 1.65 + Math.abs(y) * 0.08, 0.7, 4, 0.2, 'negro', { tono: 0.15 });
}
function rollo(b: Pz, x: number, y: number, z: number, g: number, L = 9, r = 1.1) {
  const c = Math.cos(g * RAD), s = Math.sin(g * RAD);
  b.palo([x - (c * L) / 2, y - (s * L) / 2, z + r], [x + (c * L) / 2, y + (s * L) / 2, z + r], r, 'muebles_pergamino');
  b.palo([x - (c * L) / 2 - c * 0.6, y - (s * L) / 2 - s * 0.6, z + r], [x - (c * L) / 2, y - (s * L) / 2, z + r], r * 0.45, 'madera');
  b.palo([x + (c * L) / 2, y + (s * L) / 2, z + r], [x + (c * L) / 2 + c * 0.6, y + (s * L) / 2 + s * 0.6, z + r], r * 0.45, 'madera');
  b.palo([x - c * 0.5, y - s * 0.5, z + r], [x + c * 0.5, y + s * 0.5, z + r], r + 0.15, 'tela_roja');
}
function calavera(b: Pz, x: number, y: number, z: number, g = 0, s = 1) {
  const q = b.gira([x, y, z], g);
  q.elip([0, 0, 2.6 * s], [2.6 * s, 2.2 * s, 2.4 * s], 'hueso').elip([1.4 * s, 0, 1.2 * s], [1.6 * s, 1.6 * s, 1.2 * s], 'hueso', { tono: -0.04 });
  q.bola([2.1 * s, 0.9 * s, 2.3 * s], 0.75 * s, 'negro').bola([2.1 * s, -0.9 * s, 2.3 * s], 0.75 * s, 'negro').bola([2.5 * s, 0, 1.3 * s], 0.4 * s, 'negro');
}
/** Frasco: panza que brilla (poción) y cuello de vidrio con tapón. */
function frasco(b: Pz, x: number, y: number, z: number, liq: string, r = 2.2, cuello = 3) {
  b.bola([x, y, z + r], r, liq, { tono: -0.4 });
  b.cil(x, y, z + r * 1.6, 0.7, cuello, 'muebles_vidrio').cil(x, y, z + r * 1.6 + cuello, 0.85, 0.9, 'corteza');
}
function botella(b: Pz, x: number, y: number, z: number, mat: string, h = 6) {
  b.cil(x, y, z, 1.4, h * 0.6, mat).cil(x, y, z + h * 0.6, 1.4, h * 0.2, mat, { r1: 0.6 }).cil(x, y, z + h * 0.8, 0.55, h * 0.25, mat).cil(x, y, z + h * 1.05, 0.65, 0.6, 'corteza');
}
/** Patas torneadas. */
function pata(b: Pz, x: number, y: number, z: number, h: number, mat = 'madera', r = 1.2) {
  b.cil(x, y, z, r, h, mat).elip([x, y, z + h * 0.3], [r * 1.5, r * 1.5, r * 1.2], mat, { tono: 0.04 }).elip([x, y, z + h * 0.75], [r * 1.35, r * 1.35, r], mat, { tono: 0.04 });
}
const tela = (a: Arma) => ['tela_roja', 'tela_azul', 'tela_verde', 'tela_morada', 'cuero', 'cuero', 'tela'][Math.floor(a.r() * 7)];

// ------------------------------------------------------------------ mesas
dos({
  id: 'mue_mesa_banquete', nombre: ['Mesa de banquete', 'Feast table'], tema: 'muebles', variantes: ['servida', 'vacia', 'restos'], huella: [4, 2], bloquea: true,
  armarG: (v, _f, a, g) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, g);
    const L = 64, W = 22, H = 15;
    b.base(0, 0, H - 2.5, L, W, 2.5, 'madera').base(0, 0, H - 4.5, L - 6, W - 4, 2, 'madera', { tono: -0.12 });
    for (const x of [-L / 2 + 8, L / 2 - 8]) { b.base(x, 0, 0, 3, W - 8, H - 4, 'madera_vieja'); b.base(x, 0, 0, 5, W - 3, 2.4, 'madera'); b.base(x, 0, H - 6, 4, W - 4, 2, 'madera'); }
    b.base(0, 0, 5, L - 18, 2.5, 2.5, 'madera_vieja');
    const z = H;
    if (v !== 'vacia') b.base(0, 0, z, L - 10, 9, 0.3, 'tela_roja', { tono: -0.05 });
    if (v === 'servida') {
      b.cil(0, 0, z, 6.5, 0.8, 'bronce', { r1: 7 });
      b.elip([0, 0, z + 3], [5.2, 3.4, 2.6], 'carne').elip([4.5, 1.6, z + 2.4], [2.2, 1.2, 1.2], 'carne', { tono: 0.05 }).elip([4.5, -1.6, z + 2.4], [2.2, 1.2, 1.2], 'carne', { tono: 0.05 });
      b.palo([6.2, 1.8, z + 2.4], [8.5, 2.4, z + 2.6], 0.6, 'hueso').palo([6.2, -1.8, z + 2.4], [8.5, -2.4, z + 2.6], 0.6, 'hueso');
      for (const t of [0, 1.6, 3.2, 4.8]) b.bola([Math.cos(t) * 5.5, Math.sin(t) * 5.5 * 0.7, z + 1.4], 0.9, 'tela_verde');
      for (const x of [-24, -12, 12, 24]) for (const s of [-1, 1]) {
        if (a.r() < 0.2) continue;
        plato(b, x + (a.r() - 0.5) * 2, s * 7.2, z, a.r() < 0.5 ? 'madera_lisa' : 'hierro');
        if (a.r() < 0.5) pan(b, x, s * 7.2, z + 0.5, a.r() * 180); else b.elip([x, s * 7.2, z + 1], [1.6, 1.2, 0.9], 'carne', { tono: 0.05 });
        if (a.r() < 0.7) copa(b, x + 3.5, s * 5, z, a.r() < 0.3 ? 'oro' : 'bronce');
        else jarro(b, x + 3.5, s * 5, z);
      }
      for (const x of [-18, 18]) candelero(b, x, 0, z, 4 + a.r() * 2);
      jarra(b, 9, -1.5, z);
      pan(b, -8, 1.5, z, 30); pan(b, -9.5, -1.5, z, 100);
      b.cil(-30, 1, z, 3, 1.5, 'madera_lisa').bola([-30, 1.6, z + 1.8], 1.1, 'tela_roja').bola([-29.3, -0.4, z + 1.8], 1.1, 'tela_verde').bola([-30.8, 0.3, z + 2.4], 1.1, 'tela_roja');
    } else if (v === 'restos') {
      plato(b, -20, 6, z); plato(b, 14, -6, z, 'hierro'); b.elip([14, -6, z + 0.8], [1.6, 1.2, 0.6], 'carne', { tono: -0.1 });
      b.palo([-2, 3, z + 1.3], [3, 5, z + 1.3], 1.3, 'bronce').cil(3, 5, z, 1.2, 0.2, 'sangre');
      b.elip([5, 6, z], [4, 2.5, 0.35], 'sangre');
      candelero(b, 22, 1, z, 1.5, 0, false);
      for (let i = 0; i < 4; i++) b.palo([(a.r() - 0.5) * 50, (a.r() - 0.5) * 14, z + 0.6], [(a.r() - 0.5) * 50, (a.r() - 0.5) * 14, z + 0.6], 0.6, 'hueso');
      b.palo([28, 12, 1.3], [24, 15, 1.3], 1.3, 'bronce');
    } else {
      b.base(-14, 2, z, 12, 0.6, 0.15, 'negro', { tono: 0.1 });
      candelero(b, 0, 0, z, 2, 0, false);
    }
    return ps;
  },
});

registrar(
  {
    id: 'mue_mesa_redonda', nombre: ['Mesa redonda', 'Round table'], tema: 'muebles', variantes: ['servida', 'vacia', 'rota'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = []; const b = raiz(a, ps, a.r() * 90);
      for (let i = 0; i < 4; i++) b.gira([0, 0, 0], i * 90 + 45).base(5, 0, 0, 10, 3, 2.4, 'madera');
      b.cil(0, 0, 0, 3.5, 3, 'madera', { r1: 2.4 }).cil(0, 0, 3, 2.2, 10, 'madera').elip([0, 0, 7], [3, 3, 2], 'madera', { tono: 0.04 }).cil(0, 0, 12, 2.4, 1.5, 'madera', { r1: 4 });
      const t = v === 'rota' ? b.inclY([0, 0, 13.5], 9) : b.en([0, 0, 13.5]);
      t.cil(0, 0, 0, 16, 2, 'madera_lisa').cil(0, 0, -0.4, 16.4, 1.2, 'madera', { tono: -0.1 });
      const z = 2;
      if (v === 'servida') {
        candelero(t, 0, 0, z, 4.5);
        jarro(t, 7, 3, z); jarro(t, -6, 6, z); copa(t, 3, -8, z); plato(t, -7, -4, z); pan(t, -7, -4, z + 0.5, 40); pan(t, 8, -4, z, 100);
        t.base(-1, 8, z, 4, 2.6, 0.2, 'hueso', { tono: 0.1 }).base(1.5, 9.2, z, 4, 2.6, 0.2, 'hueso');
      } else if (v === 'rota') {
        t.poli([[6, 8, -2], [6, 8, 4], [18, 3, -2], [18, 3, 4], [18, 18, -2], [18, 18, 4], [10, 18, 4], [10, 18, -2]], 'negro', { resta: true });
        b.gira([13, 14, 0], 30).base(0, 0, 0, 9, 6, 2, 'madera_lisa').base(4, 3, 0, 5, 1.2, 1.2, 'madera_vieja');
        jarro(b.gira([-14, 10, 1.6], 0).inclY([0, 0, 0], 90), 0, 0, 0);
      } else t.base(-4, 3, z, 7, 5, 0.2, 'tela', { tono: -0.1 });
      return ps;
    },
  },
  {
    id: 'mue_mesita', nombre: ['Mesita', 'Side table'], tema: 'muebles', variantes: ['vela', 'jarra', 'vacia'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = []; const b = raiz(a, ps, (a.r() - 0.5) * 20);
      for (const [x, y] of [[-4.5, -4.5], [4.5, -4.5], [-4.5, 4.5], [4.5, 4.5]]) pata(b, x, y, 0, 13, 'madera', 0.9);
      b.base(0, 0, 4, 10, 10, 1, 'madera_vieja');
      b.base(0, 0, 13, 13, 13, 1.6, 'madera_lisa').base(0, 0, 11.8, 11, 11, 1.2, 'madera', { tono: -0.1 });
      const z = 14.6;
      if (v === 'vela') { candelero(b, -1.5, -1, z, 4); libro(b, 2, 2, z, 25, 'tela_roja', 1.6, 5, 6.5); }
      else if (v === 'jarra') { jarra(b, -1, -1, z, 0.9); copa(b, 3, 3, z, 'hierro', false); }
      else b.base(0, 0, z, 9, 6, 0.2, 'tela', { tono: -0.12 });
      return ps;
    },
  },
);

dos({
  id: 'mue_mesa_alquimista', nombre: ['Mesa de alquimista', 'Alchemist table'], tema: 'muebles', variantes: ['ordenada', 'desastre'], huella: [3, 2], bloquea: true,
  armarG: (v, _f, a, g) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, g);
    const L = 42, W = 18, H = 15;
    b.base(0, 0, H - 2.5, L, W, 2.5, 'madera_vieja');
    for (const [x, y] of [[-19, -7], [19, -7], [-19, 7], [19, 7]]) b.base(x, y, 0, 2.6, 2.6, H - 2.5, 'madera');
    b.base(0, 0, 3, L - 4, W - 4, 1.2, 'madera_vieja', { tono: -0.08 });
    // debajo: un barril chico y libros
    libro(b, -12, 0, 4.2, 10, 'cuero', 2.2); libro(b, -11, 0.5, 6.4, -15, 'tela_morada', 2);
    jarra(b, 10, 1, 4.2, 0.9);
    const z = H;
    // quemador con llama verde y matraz encima
    b.cil(-8, -2, z, 2.4, 2.4, 'hierro', { r1: 2 }).elip([-8, -2, z + 3.2], [1.2, 1.2, 1.6], 'fuego_verde');
    for (const t of [0, 2.1, 4.2]) b.palo([-8 + Math.cos(t) * 3.4, -2 + Math.sin(t) * 3.4, z], [-8 + Math.cos(t) * 2.6, -2 + Math.sin(t) * 2.6, z + 5], 0.4, 'hierro');
    frasco(b, -8, -2, z + 4.6, 'magia', 3, 3.5);
    // retorta que gotea en otro frasco
    b.bola([4, -4, z + 3], 3, 'portal_rojo', { tono: -0.42 });
    b.palo([5.5, -4, z + 5], [12, -3, z + 7], 0.8, 'muebles_vidrio', { r1: 0.5 }).palo([12, -3, z + 7], [14, -3, z + 4.5], 0.5, 'muebles_vidrio');
    b.cil(14, -3, z, 2.4, 3.6, 'muebles_vidrio', { r1: 1.6 }).cil(14, -3, z + 0.2, 2.3, 1.5, 'portal_rojo', { tono: -0.3 });
    // gradilla con tubos
    b.base(15, 4, z, 9, 3, 1, 'madera').base(15, 4, z + 4, 9, 3, 0.8, 'madera');
    for (let i = 0; i < 4; i++) b.cil(11.8 + i * 2.1, 4, z + 0.8, 0.7, 5.2, ['fuego_verde', 'runa', 'magia', 'portal_rojo'][i], { tono: -0.42 });
    // mortero, calavera, vela, libro
    b.cil(-17, 4, z, 2.2, 2.6, 'piedra', { r1: 2.6 }).cil(-17, 4, z + 1.2, 1.7, 2, 'negro', { resta: true }).palo([-17, 4, z + 1], [-15, 6, z + 5], 0.6, 'piedra', { tono: 0.1 });
    calavera(b, -18, -4, z, 30, 0.9);
    vela(b, -18.5, -4.5, z + 4.3, 2.5);
    if (v === 'ordenada') {
      libroAbierto(b, 2, 4, z, -10);
      botella(b, 8, 5.5, z, 'muebles_vidrio', 6); botella(b, -2, -6, z, 'muebles_barro', 5);
      frasco(b, 0, -7, z, 'fuego_verde', 1.8, 2);
    } else {
      // frascos volcados, charcos que brillan y vidrio roto
      b.palo([0, 4, z + 1.4], [5, 6, z + 1.4], 1.4, 'muebles_vidrio');
      b.elip([4, 6, z], [5, 3, 0.25], 'fuego_verde', { tono: -0.3 }).elip([-3, -5, z], [3, 2, 0.25], 'magia', { tono: -0.3 });
      ps.push(...[0, 1].map((i) => a.elipsoide(i ? -6 : 8, i ? 13 : 14, 0, 6 - i * 2, 3.5, 0.3, { mat: i ? 'magia' : 'fuego_verde', tono: -0.35 })));
      for (let i = 0; i < 6; i++) { const x = (a.r() - 0.5) * 30, y = 10 + a.r() * 6; b.poli([[x, y, 0], [x + 1.6, y + 0.4, 0], [x + 0.6, y + 1.5, 0], [x + 0.7, y + 0.6, 1]], 'muebles_vidrio', { tono: 0.2 }); }
      b.elip([-3, 1, z], [6, 4, 0.2], 'negro');
      libro(b, 6, 18, 0, 70, 'tela_azul', 1.8);
    }
    return { piezas: ps, resplandor: { c: b.p([-8, -2, z + 6]), r: 13, color: '#8af06a' } };
  },
});

dos({
  id: 'mue_mesa_mapas', nombre: ['Mesa de mapas', 'Map table'], tema: 'muebles', variantes: ['mapa', 'guerra'], huella: [3, 2], bloquea: true,
  armarG: (v, _f, a, g) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, g);
    const L = 38, W = 26, H = 15;
    b.base(0, 0, H - 3, L, W, 3, 'madera').base(0, 0, H - 4, L - 4, W - 4, 1.2, 'madera', { tono: -0.12 });
    for (const [x, y] of [[-16, -10], [16, -10], [-16, 10], [16, 10]]) { pata(b, x, y, 0, H - 4, 'madera', 1.5); b.base(x, y, 0, 4, 4, 1.4, 'madera'); }
    b.base(0, -10, 3, 30, 2, 2, 'madera_vieja').base(0, 10, 3, 30, 2, 2, 'madera_vieja');
    const z = H;
    const m = b.gira([0, 0, z], (a.r() - 0.5) * 8);
    m.base(0, 0, 0, 32, 21, 0.4, 'muebles_pergamino');
    // mar, costa, montes y caminos
    m.base(-10, -5, 0.05, 11, 10, 0.45, 'tela_azul', { tono: 0.12 }).base(-13, 3, 0.05, 6, 8, 0.45, 'tela_azul', { tono: 0.12 }).poli([[-5, -10, 0.05], [-1, -10, 0.05], [-4, -2, 0.05], [-5, -10, 0.5], [-1, -10, 0.5], [-4, -2, 0.5]], 'tela_azul', { tono: 0.12 });
    for (const [x, y] of [[6, -4], [8, -2], [10, -5], [4, 5]]) m.poli([[x - 1.4, y - 1, 0.4], [x + 1.4, y - 1, 0.4], [x - 1.4, y + 1, 0.4], [x + 1.4, y + 1, 0.4], [x, y, 2]], 'madera_vieja', { tono: 0.08 });
    m.base(2, 2, 0.05, 14, 0.6, 0.45, 'negro', { tono: 0.25 }).base(9, 6, 0.05, 0.6, 7, 0.45, 'negro', { tono: 0.25 });
    m.cil(-14, 9, 0, 1.2, 1.8, 'muebles_pergamino', { r1: 1 }).cil(14, -9, 0, 1.2, 1.8, 'muebles_pergamino');
    // fichas
    const n = v === 'guerra' ? 9 : 4;
    for (let i = 0; i < n; i++) { const x = (a.r() - 0.5) * 26, y = (a.r() - 0.5) * 16, mt = i % 2 ? 'tela_roja' : 'tela_azul'; m.cil(x, y, 0.4, 0.9, 1.8, mt).bola([x, y, 2.6], 0.95, mt); }
    // daga clavada y brújula
    m.palo([3, -1, 0.4], [3, -1, 7], 0.6, 'acero').base(3, -1, 7, 0.9, 4.4, 0.9, 'hierro').cil(3, -1, 7.9, 0.6, 3.4, 'cuero').bola([3, -1, 11.6], 0.8, 'hierro');
    m.cil(11, 7, 0.4, 2, 0.8, 'bronce');
    candelero(b, -16, -10, z, 3);
    if (v === 'guerra') {
      b.cil(15, -8, z, 4.6, 6, 'hierro').elip([15, -8, z + 6], [4.6, 4.6, 3.4], 'hierro');
      rollo(b, -6, 13, 0, 20, 10); rollo(b, 4, 15, 0, -10, 9);
    } else rollo(b, 14, 9, z, 80, 9);
    return ps;
  },
});

registrar({
  id: 'mue_mesa_rota', nombre: ['Mesa rota', 'Broken table'], tema: 'muebles', variantes: ['partida', 'volcada'], huella: [3, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, (a.r() - 0.5) * 20);
    if (v === 'partida') {
      for (const s of [-1, 1]) {
        const q = b.inclY([s * 17, 0, 13], s * 30);
        q.base(-s * 9, 0, 0, 18, 16, 2.4, 'madera');
        q.poli([[0, -8, 0], [0, 8, 0], [0, -8, 2.4], [0, 8, 2.4], [-s * 3, 2, 1.2]], 'madera_vieja');
        for (const y of [-6, 6]) b.base(s * 16, y, 0, 2.4, 2.4, 13, 'madera');
      }
      for (let i = 0; i < 6; i++) b.gira([(a.r() - 0.5) * 12, (a.r() - 0.5) * 14, 0], a.r() * 180).base(0, 0, 0, 4 + a.r() * 4, 0.9, 0.9, 'madera_vieja', { tono: 0.1 });
      jarro(b.inclY([4, 10, 1.6], 90), 0, 0, 0);
    } else {
      // de lado: el tablero parado y las patas hacia adelante
      b.base(0, -6, 0, 36, 2.6, 16, 'madera');
      for (const [x, z] of [[-15, 2.5], [15, 2.5], [-15, 13.5], [15, 13.5]]) b.palo([x, -5, z], [x, x > 0 && z > 10 ? 2 : 8, z], 1.2, 'madera');
      b.palo([15, 2, 13.5], [16, 6, 12.8], 1.2, 'madera_vieja', { tono: 0.15 });
      b.gira([16, 8, 0], 60).base(0, 0, 0, 6, 2.4, 2.4, 'madera');
      plato(b.inclY([-6, 6, 3], 70), 0, 0, 0); plato(b, -12, 8, 0, 'hierro');
      pan(b, 6, 9, 0, 20);
    }
    return ps;
  },
});

// ------------------------------------------------------------------ sillas, bancos, taburetes, tronos
/** Silla que mira a +x (el respaldo en -x). */
function silla(b: Pz, v: string, a: Arma) {
  const alto = v === 'respaldo_alto';
  const m = alto ? 'madera' : 'madera_vieja';
  if (v === 'rota') {
    // asiento caído en el piso, dos patas que siguen clavadas y el respaldo tirado al lado
    b.inclX([0, 0, 0.9], 7).base(0, 0, -0.9, 11, 11, 1.6, m);
    b.palo([4, 4, 1.5], [6.5, 6, 9.5], 0.8, m).palo([4, -4, 2], [5.5, -6.5, 9], 0.8, m).palo([-4, 4, 1], [-4.5, 6, 3.5], 0.8, m, { tono: 0.12 });
    const q = b.gira([-9, -2, 0], 75 + a.r() * 20);
    for (const y of [-4.5, 4.5]) q.base(0, y, 0, 24, 1.8, 1.8, m);
    for (const x of [-6, 0]) q.base(x, 0, 0.2, 2.2, 8, 1.4, m, { tono: 0.04 });
    b.gira([9, -6, 0], a.r() * 180).base(0, 0, 0, 8, 1.6, 1.6, m, { tono: 0.08 });
    return;
  }
  for (const [x, y] of [[4.5, -4.5], [4.5, 4.5]]) b.base(x, y, 0, 1.6, 1.6, 9, m);
  for (const y of [-4.5, 4.5]) b.base(-4.5, y, 0, 1.8, 1.8, alto ? 34 : 24, m);
  b.base(0, 0, 9, 11, 11, 1.5, m).base(0, 0, 3, 9, 1.2, 1.2, m, { tono: -0.1 });
  if (alto) {
    b.base(-4.6, 0, 11, 1.2, 8, 20, 'madera_lisa', { tono: -0.05 });
    b.poli([[-5.4, -5.4, 34], [-5.4, 5.4, 34], [-3.8, -5.4, 34], [-3.8, 5.4, 34], [-4.6, 0, 40]], m);
    for (const y of [-4.5, 4.5]) b.cil(-4.5, y, 34, 1.1, 2.4, m, { r1: 0 });
    b.base(0, 0, 10.5, 9.4, 9.4, 1.2, 'tela_roja');
  } else for (const z of [15, 21]) b.base(-4.5, 0, z, 1.4, 8, 2.2, m, { tono: 0.04 });
}
registrar(
  {
    id: 'mue_silla', nombre: ['Silla', 'Chair'], tema: 'muebles', variantes: ['simple', 'respaldo_alto', 'rota', 'volcada'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = []; const g = [0, 90, 180, 270][Math.floor(a.r() * 4)] + (a.r() - 0.5) * 16;
      const b = raiz(a, ps, g);
      if (v === 'volcada') silla(b.en([0, 0, 5.4], [0, 0, 1], [0, 1, 0]), 'simple', a); else silla(b, v, a);
      return ps;
    },
  },
);
dos({
  id: 'mue_banco', nombre: ['Banco', 'Bench'], tema: 'muebles', variantes: ['simple', 'largo', 'roto'], huella: [3, 1], bloquea: true,
  armarG: (v, _f, a, g) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, g);
    const L = v === 'largo' ? 46 : 36;
    const s = v === 'roto' ? b.pivY([L / 2 - 4, 0, 11], 19) : b.en([0, 0, 0]);
    s.base(0, 0, 9, L, 8, 2, 'madera');
    for (const x of [-L / 2 + 4, L / 2 - 4]) {
      if (v === 'roto' && x < 0) { b.gira([-L / 2 + 1, 6, 0], 70).base(0, 0, 0, 9, 6, 2.4, 'madera_vieja'); continue; }
      s.base(x, 0, 0, 2.4, 7, 9, 'madera_vieja').base(x, 0, 0, 2.5, 3, 3.2, 'negro', { resta: true });
    }
    if (v !== 'roto') s.base(0, 0, 4, L - 10, 1.8, 1.8, 'madera_vieja');
    return ps;
  },
});
registrar({
  id: 'mue_taburete', nombre: ['Taburete', 'Stool'], tema: 'muebles', variantes: ['tres_patas', 'cuadrado', 'volcado'], huella: [1, 1], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = []; const r = raiz(a, ps, a.r() * 120);
    const b = v === 'volcado' ? r.en([0, 0, 5.2], [0.2, 0, 1], [0, 1, 0]) : r;
    if (v === 'cuadrado') {
      for (const [x, y] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]]) b.base(x, y, 0, 1.6, 1.6, 9, 'madera_vieja');
      b.base(0, 0, 9, 9.5, 9.5, 1.6, 'madera').base(0, -3.5, 3, 7, 1, 1, 'madera_vieja').base(-3.5, 0, 5, 1, 7, 1, 'madera_vieja');
    } else {
      for (let i = 0; i < 3; i++) { const t = (i / 3) * Math.PI * 2; b.palo([Math.cos(t) * 5.5, Math.sin(t) * 5.5, 0], [Math.cos(t) * 3, Math.sin(t) * 3, 9.5], 0.9, 'madera_vieja'); }
      b.cil(0, 0, 9.3, 5.6, 1.8, 'madera');
    }
    return ps;
  },
});

dos({
  id: 'mue_trono', nombre: ['Trono', 'Throne'], tema: 'muebles', variantes: ['piedra', 'dorado', 'ruina'], huella: [3, 3], bloquea: true,
  armarG: (v, _f, a, g) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, g);
    const dor = v === 'dorado', rui = v === 'ruina';
    const m = dor ? 'madera_lisa' : rui ? 'piedra_musgo' : 'marmol_negro', adorno = dor ? 'oro' : rui ? 'piedra' : 'piedra_gris';
    b.base(0, 0, 0, 46, 44, 4, rui ? 'piedra_musgo' : 'piedra_bloques').base(0, -3, 4, 36, 32, 4, rui ? 'piedra' : 'piedra_gris');
    if (dor) b.base(0, 4, 4.05, 10, 20, 4, 'tela_roja').base(0, 12, 0.05, 10, 10, 4, 'tela_roja');
    const z = 8;
    b.base(0, -5, z, 22, 18, 10, m).base(0, -4, z + 10, 19, 16, 2.4, dor ? 'tela_roja' : m, { tono: dor ? 0 : 0.05 });
    // respaldo con remate en punta
    b.base(0, -15, z, 24, 5, 38, m).poli([[-12, -17.5, z + 38], [12, -17.5, z + 38], [-12, -12.5, z + 38], [12, -12.5, z + 38], [0, -17.5, z + 50], [0, -12.5, z + 50]], m);
    b.base(0, -12.3, z + 13, 15, 0.8, 22, dor ? 'tela_roja' : m, { tono: dor ? 0 : -0.12 });
    b.poli([[-7.5, -12.4, z + 35], [7.5, -12.4, z + 35], [-7.5, -11.8, z + 35], [7.5, -11.8, z + 35], [0, -12.4, z + 43], [0, -11.8, z + 43]], dor ? 'oro' : m, { tono: dor ? 0 : -0.12 });
    for (const x of [-12, 12]) { b.base(x, -15, z, 4, 6, 44, adorno); b.cil(x, -15, z + 44, 2.2, 6, adorno, { r1: 0 }); b.bola([x, -15, z + 44], 2.4, adorno); }
    for (const x of [-10.5, 10.5]) { b.base(x, -4, z + 10, 3.4, 18, 7, m); b.base(x, -4, z + 17, 4.4, 19, 1.6, adorno); b.bola([x, 5.2, z + 19], 2.4, adorno); b.base(x, 4, z, 3.8, 3.8, 10, adorno, { tono: -0.05 }); }
    if (dor) for (const x of [-8, 0, 8]) b.bola([x, -12, z + 37], 1.1, 'portal_rojo', { tono: -0.25 });
    if (rui) {
      b.poli([[2, -20, z + 30], [16, -20, z + 30], [16, -10, z + 30], [2, -10, z + 30], [16, -20, z + 52], [16, -10, z + 52]], 'negro', { resta: true });
      b.poli([[9, 6, z + 17], [16, 6, z + 17], [16, -14, z + 17], [9, -14, z + 30], [16, -14, z + 30]], 'negro', { resta: true });
      b.base(-3, -12.2, z + 6, 0.8, 0.8, 26, 'negro', { tono: 0.1 });
      for (let i = 0; i < 6; i++) b.gira([10 + a.r() * 12, 6 + a.r() * 14, i < 3 ? 8 : 4], a.r() * 90).base(0, 0, 0, 3 + a.r() * 4, 3 + a.r() * 3, 2 + a.r() * 3, i % 2 ? 'piedra_musgo' : 'marmol_negro');
      b.elip([-14, 12, 4], [6, 4, 0.6], 'musgo').elip([12, -16, 8], [5, 4, 0.6], 'musgo');
    }
    return ps;
  },
});

// ------------------------------------------------------------------ camas
dos({
  id: 'mue_jergon', nombre: ['Jergón de paja', 'Straw bed'], tema: 'muebles', variantes: ['con_manta', 'paja', 'revuelto'], huella: [2, 1], bloquea: false,
  armarG: (v, _f, a, g) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, g + (a.r() - 0.5) * 8);
    b.base(0, 0, 0, 30, 15, 2.6, 'paja').elip([0, 7, 1.2], [15, 1.6, 1.6], 'paja', { tono: 0.05 }).elip([0, -7, 1.2], [15, 1.6, 1.6], 'paja', { tono: -0.03 });
    for (let i = 0; i < 6; i++) b.elip([(a.r() - 0.5) * 24, (a.r() - 0.5) * 10, 2.4], [3 + a.r() * 3, 2 + a.r() * 2, 1 + a.r()], 'paja', { tono: (a.r() - 0.5) * 0.1 });
    if (v !== 'paja') b.elip([-11, 0, 3.2], [3.6, 5.5, 1.8], 'tela', { tono: 0.1 });
    if (v === 'con_manta') { b.base(4, 0, 2.4, 20, 15.6, 1.4, 'tela_roja', { tono: -0.1 }).base(-5.6, 0, 3.4, 2.4, 15.8, 1.2, 'tela_roja', { tono: -0.02 }); }
    if (v === 'revuelto') { b.elip([3, 2, 3.6], [8, 6, 2.2], 'tela_roja', { tono: -0.12 }).elip([9, -4, 2.8], [5, 4, 1.6], 'tela_roja', { tono: -0.18 }).elip([12, 9, 0.8], [5, 3, 1.4], 'tela_roja', { tono: -0.15 }); jarro(b.inclY([-14, 11, 1.6], 90), 0, 0, 0); }
    for (let i = 0; i < 5; i++) b.gira([(a.r() - 0.5) * 36, (a.r() < 0.5 ? -1 : 1) * (9 + a.r() * 3), 0], a.r() * 180).base(0, 0, 0, 3 + a.r() * 2, 0.8, 0.6, 'paja');
    return ps;
  },
});
dos({
  id: 'mue_cama_dosel', nombre: ['Cama con dosel', 'Four-poster bed'], tema: 'muebles', variantes: ['roja', 'azul', 'rasgada'], huella: [3, 2], bloquea: true,
  armarG: (v, _f, a, g) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, g);
    const t = v === 'azul' ? 'tela_azul' : v === 'rasgada' ? 'tela_morada' : 'tela_roja', ton = v === 'rasgada' ? -0.1 : 0;
    const L = 42, W = 26, H = 62;
    for (const [x, y] of [[-L / 2, -W / 2], [L / 2, -W / 2], [-L / 2, W / 2], [L / 2, W / 2]]) { b.base(x, y, 0, 3, 3, H, 'madera'); b.elip([x, y, 22], [2.2, 2.2, 2.4], 'madera', { tono: 0.05 }); b.elip([x, y, 40], [2, 2, 2], 'madera', { tono: 0.05 }); }
    b.base(0, 0, 5, L - 1, W - 1, 5, 'madera');
    b.base(-L / 2, 0, 5, 2.4, W - 2, 22, 'madera_lisa').poli([[-L / 2 - 1.2, -11, 27], [-L / 2 - 1.2, 11, 27], [-L / 2 + 1.2, -11, 27], [-L / 2 + 1.2, 11, 27], [-L / 2, 0, 33]], 'madera_lisa');
    b.base(L / 2, 0, 5, 2.4, W - 2, 10, 'madera_lisa');
    b.base(0, 0, 10, L - 3, W - 3, 4, 'tela').elip([0, 0, 13], [19, 11.5, 1.6], 'tela', { tono: 0.04 });
    b.elip([-16, -5.5, 15.6], [3, 4.6, 1.8], 'tela', { tono: 0.12 }).elip([-16, 5.5, 15.6], [3, 4.6, 1.8], 'tela', { tono: 0.12 });
    b.base(5, 0, 14, 28, W - 1.6, 1.4, t, { tono: ton }).base(-8.5, 0, 14.6, 3, W - 1.4, 1.4, 'tela', { tono: 0.08 });
    b.base(5, W / 2 - 0.1, 5, 28, 0.6, 10, t, { tono: ton - 0.05 });
    // dosel
    b.base(0, 0, H, L + 3, W + 3, 2.4, 'madera').base(0, 0, H + 2.4, L, W, 1, t, { tono: ton });
    const rasg = v === 'rasgada';
    for (const [x, y, an, pr] of [[0, W / 2 + 1.2, L, 0.8], [0, -W / 2 - 1.2, L, 0.8], [L / 2 + 1.2, 0, 0.8, W], [-L / 2 - 1.2, 0, 0.8, W]] as [number, number, number, number][]) {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const fx = an > 1 ? -an / 2 + (i + 0.5) * an / n : 0, fy = pr > 1 ? -pr / 2 + (i + 0.5) * pr / n : 0;
        const h = rasg ? 2 + a.r() * 7 : 5 + (i % 2) * 1.2;
        b.base(x + fx, y + fy, H - h + 0.5, an > 1 ? an / n + 0.1 : 0.8, pr > 1 ? pr / n + 0.1 : 0.8, h, t, { tono: ton + (i % 2) * 0.05 });
      }
    }
    // cortinas recogidas en los postes del fondo y de la cabecera
    const cort: [number, number][] = rasg ? [[-L / 2 + 2, -W / 2 + 2], [L / 2 - 2, -W / 2 + 2]] : [[-L / 2 + 2, -W / 2 + 2], [L / 2 - 2, -W / 2 + 2], [-L / 2 + 2, W / 2 - 2]];
    for (const [x, y] of cort) {
      const largo = rasg ? 20 + a.r() * 16 : H - 6;
      b.elip([x, y, H - largo / 2 - 1], [2.6, 2.6, largo / 2], t, { tono: ton - 0.04 }).cil(x, y, 30, 2.8, 1.2, 'oro', { tono: -0.1 });
    }
    if (rasg) for (let i = 0; i < 4; i++) b.base(-L / 2 + 6 + a.r() * L * 0.8, W / 2 + 1.2, H - 10 - a.r() * 10, 2, 0.6, 6 + a.r() * 8, t, { tono: -0.15 });
    return ps;
  },
});
dos({
  id: 'mue_catre', nombre: ['Catre', 'Cot'], tema: 'muebles', variantes: ['simple', 'con_manta', 'roto'], huella: [2, 1], bloquea: true,
  armarG: (v, _f, a, g) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, g + (a.r() - 0.5) * 6);
    const roto = v === 'roto';
    for (const [x, y] of [[-16, -6], [16, -6], [-16, 6], [16, 6]]) b.base(x, y, 0, 1.8, 1.8, roto && x > 0 ? 3 : 8, 'madera_vieja');
    const s = roto ? b.pivY([-16, 0, 8.5], -10) : b.en([0, 0, 0]);
    s.base(0, -6, 6.5, 35, 1.8, 2, 'madera_vieja').base(0, 6, 6.5, 35, 1.8, 2, 'madera_vieja').base(-16, 0, 6.5, 1.8, 13, 2, 'madera_vieja').base(16, 0, 6.5, 1.8, 13, 2, 'madera_vieja');
    s.base(0, 0, 7.6, 31, 10.6, 0.8, 'tela', { tono: -0.05 });
    if (roto) s.base(4, 1, 7, 9, 5, 3, 'negro', { resta: true });
    if (v === 'con_manta') { s.base(3, 0, 8.4, 20, 12.4, 1, 'tela_verde', { tono: -0.05 }).elip([-12, 0, 9.4], [3, 4.4, 1.4], 'tela', { tono: 0.12 }); s.base(3, 6.4, 3.4, 20, 0.5, 6, 'tela_verde', { tono: -0.1 }); }
    if (roto) b.elip([8, 10, 0], [6, 3.5, 0.9], 'tela', { tono: -0.15 });
    return ps;
  },
});

// ------------------------------------------------------------------ estantes, atriles, escritorios, armarios
function libros(b: Pz, a: Arma, x0: number, x1: number, z: number, hmax: number, lleno: number) {
  let x = x0;
  while (x < x1 - 1.4) {
    const w = 1.5 + a.r() * 1.2;
    if (a.r() > lleno) { x += w + a.r() * 3; continue; }
    if (a.r() < 0.08 && x + 7 < x1) { const n = 2 + Math.floor(a.r() * 3); for (let k = 0; k < n; k++) libro(b, x + 3.5, 0.5, z + k * 1.6, (a.r() - 0.5) * 20, tela(a), 1.6, 5.5, 6.5); x += 8; continue; }
    const h = hmax * (0.62 + a.r() * 0.36), mt = tela(a);
    const inc = x + w + 3 > x1 && a.r() < 0.5 ? 14 : 0;
    const q = inc ? b.inclY([x + w, 0, z], inc) : b;
    q.base(inc ? -w / 2 : x + w / 2, 0.6, inc ? 0 : z, w - 0.15, 6.4 + a.r() * 0.6, h, mt, { tono: (a.r() - 0.5) * 0.18 });
    q.base(inc ? -w / 2 : x + w / 2, 3.95, (inc ? 0 : z) + h * 0.8, w - 0.05, 0.2, 0.7, 'oro', { tono: -0.25 });
    x += w;
  }
}
function estante(b: Pz, a: Arma, v: string) {
  const W = 32, D = 9, H = 52;
  for (const x of [-W / 2 + 1, W / 2 - 1]) b.base(x, 0, 0, 2.2, D, H, 'madera');
  b.base(0, -D / 2 + 0.6, 0, W - 2, 1, H, 'madera_vieja', { tono: -0.12 });
  b.base(0, 0, 0, W - 2, D, 3, 'madera').base(0, 0.5, H, W + 3, D + 1.4, 2.4, 'madera').base(0, 0.8, H + 2.4, W + 1, D + 0.6, 1.2, 'madera', { tono: -0.06 });
  const niv = [3, 15.5, 28, 40.5];
  for (const z of niv.slice(1)) b.base(0, 0, z - 1.5, W - 2, D - 0.5, 1.5, 'madera', { tono: 0.03 });
  const lleno = v === 'lleno' ? 0.93 : v === 'medio' ? 0.5 : 0.12;
  for (const z of niv) libros(b, a, -W / 2 + 2.2, W / 2 - 2.2, z, 10, lleno);
  if (v === 'medio') { calavera(b, 9, 0.5, 28, 50, 0.9); vela(b, -11, 1, 40.5, 3); }
  if (v === 'vacio') { libro(b, 4, 8, 0, 30, 'cuero'); libro(b, -6, 9, 0, -50, 'tela_roja'); b.inclY([-9, 0.5, 28], 70).base(0, 0, 0, 1.8, 6.4, 8, 'tela_azul'); }
}
dos({
  id: 'mue_estante_libros', nombre: ['Estante de libros', 'Bookshelf'], tema: 'muebles', variantes: ['lleno', 'medio', 'vacio'], huella: [2, 1], bloquea: true,
  armarG: (v, _f, a, g) => { const ps: Pieza[] = []; estante(raiz(a, ps, g), a, v); return ps; },
});
registrar({
  id: 'mue_estante_caido', nombre: ['Estante caído', 'Fallen bookshelf'], tema: 'muebles', variantes: ['libros', 'astillado'], huella: [3, 4], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = []; const r = raiz(a, ps, (a.r() - 0.5) * 16);
    const b = r.en([0, -26, 5.2], [1, 0, 0], [0, 0, -1]);
    const W = 32, D = 9, H = 52;
    for (const x of [-W / 2 + 1, W / 2 - 1]) b.base(x, 0, 0, 2.2, D, H, 'madera');
    b.base(0, -D / 2 + 0.6, 0, W - 2, 1, H, 'madera_vieja', { tono: -0.05 });
    b.base(0, 0, 0, W - 2, D, 3, 'madera').base(0, 0.5, H, W + 3, D + 1.4, 2.4, 'madera');
    if (v === 'astillado') { b.base(-4, -4, 18, 10, 3, 14, 'negro', { resta: true }); for (let i = 0; i < 3; i++) r.gira([-4 + a.r() * 8, -6 + a.r() * 10, 6.5], a.r() * 60).base(0, 0, 0, 7, 1.6, 0.8, 'madera_vieja', { tono: 0.1 }); }
    for (let i = 0; i < 14; i++) {
      const lado = a.r() < 0.5 ? -1 : 1, x = lado * (18 + a.r() * 6), y = -24 + a.r() * 48;
      const q = r.gira([i < 5 ? (a.r() - 0.5) * 30 : x, i < 5 ? 28 + a.r() * 5 : y, 0], a.r() * 360);
      if (i === 3) { libroAbierto(q, 0, 0, 0, 0); continue; }
      q.inclX([0, 0, 0], a.r() < 0.3 ? 30 : 0).base(0, 0, 0, 6.5, 5, 1.8, tela(a)).base(0.3, 0.3, 0.3, 5.9, 4.6, 1.2, 'muebles_pergamino');
    }
    return ps;
  },
});

registrar({
  id: 'mue_atril', nombre: ['Atril con libro', 'Lectern'], tema: 'muebles', variantes: ['libro', 'grimorio', 'piedra', 'vacio'], huella: [1, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, (a.r() - 0.5) * 10);
    const m = v === 'piedra' ? 'piedra_gris' : 'madera';
    if (v === 'piedra') { b.base(0, 0, 0, 12, 12, 3, 'piedra_bloques').cil(0, 0, 3, 3.6, 25, m, { r1: 3 }).cil(0, 0, 26, 3.6, 3, m, { r1: 5 }); }
    else {
      b.base(0, 0, 0, 14, 2.6, 2.4, m).base(0, 0, 0, 2.6, 14, 2.4, m);
      b.cil(0, 0, 2, 2, 26, m).elip([0, 0, 10], [2.8, 2.8, 2], m, { tono: 0.05 }).elip([0, 0, 22], [2.6, 2.6, 1.6], m, { tono: 0.05 }).cil(0, 0, 27, 2, 2.5, m, { r1: 4 });
    }
    // tablero inclinado que mira a la cámara (+x+y)
    const n = 25 * RAD;
    const up: V3 = [-Math.cos(n) * Math.SQRT1_2, -Math.cos(n) * Math.SQRT1_2, Math.sin(n)];
    const t = b.en([0, 0, 32], up, [Math.SQRT1_2, -Math.SQRT1_2, 0]);
    t.caja([0, 0, -0.6], [14, 18, 1.4], m).caja([-7, 0, 0.4], [1.2, 18, 1.4], m, { tono: 0.08 });
    if (v !== 'vacio') {
      t.caja([0, 0, 0.4], [12, 17, 0.6], 'cuero');
      t.inclX([0, 0, 0.7], 5).caja([0, 4.2, 0.55], [11, 8, 1.1], 'muebles_pergamino');
      t.inclX([0, 0, 0.7], -5).caja([0, -4.2, 0.55], [11, 8, 1.1], 'muebles_pergamino', { tono: -0.05 });
      const run = v === 'grimorio';
      for (const y of [-4.3, 4.3]) for (const x of [-3, -0.5, 2, 4.2]) t.caja([x, y, 1.6 + Math.abs(y) * 0.09], [run ? 1.1 : 0.6, run ? 2.4 : 6, 0.2], run ? 'runa' : 'negro', { tono: run ? -0.1 : 0.15 });
      t.caja([-6.5, 1, -0.5], [2, 1, 6], 'tela_roja', { tono: -0.05 });
      if (!run) t.caja([3.6, 2.3, 1.85], [2, 2, 0.2], 'tela_roja');
    } else t.caja([2, 0, 0.1], [6, 8, 0.2], 'tela', { tono: -0.2 });
    if (v === 'grimorio') { vela(b, 6, -4, 0, 6); vela(b, -5, 5, 0, 4); vela(b, 4, 6, 0, 3); return { piezas: ps, resplandor: { c: b.p([0, 0, 34]), r: 20, color: '#5ac8f0' } }; }
    return ps;
  },
});

dos({
  id: 'mue_escritorio', nombre: ['Escritorio', 'Writing desk'], tema: 'muebles', variantes: ['pergaminos', 'ordenado', 'revuelto'], huella: [2, 1], bloquea: true,
  armarG: (v, _f, a, g) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, g);
    const H = 15;
    b.base(0, 0, H - 2, 34, 15, 2, 'madera_lisa');
    b.base(10.5, 0, 0, 12, 13, H - 2, 'madera');
    for (const z of [1.5, 5.5, 9.5]) { b.base(10.5, 6.6, z, 10.5, 0.6, 3.4, 'madera_lisa', { tono: 0.05 }); b.bola([10.5, 7, z + 1.7], 0.7, 'bronce'); }
    for (const y of [-5.5, 5.5]) pata(b, -15, y, 0, H - 2, 'madera', 1.1);
    b.base(-15, 0, 3, 1.6, 10, 1.6, 'madera');
    b.base(0, -7, H, 34, 1.4, 4, 'madera').base(0, -6.6, H + 4, 34, 2, 1, 'madera', { tono: 0.05 });
    const z = H;
    b.cil(9, -3.5, z, 1.4, 1.8, 'negro', { tono: 0.2 }).poli([[9, -3.5, z + 1.5], [9.4, -3.5, z + 1.5], [12, -1, z + 8], [11.3, -0.6, z + 8.4], [12.3, -1.5, z + 7.2]], 'hueso');
    if (v === 'ordenado') { libroAbierto(b, -3, 1, z, 5); candelero(b, -13, -3.5, z, 4); libro(b, 13, 0, z, 10, 'tela_verde', 2); libro(b, 13, 0, z + 2, -5, 'cuero', 1.8); }
    else {
      b.base(-2, 1.5, z, 10, 7, 0.3, 'muebles_pergamino', { tono: 0.05 });
      rollo(b, -7, 1.5, z, 90, 7.4, 0.9); rollo(b, 3.2, 1.5, z, 90, 7.4, 0.9);
      rollo(b, -12, -2, z, 15, 8); rollo(b, -11, 2, z, 5, 9);
      vela(b, 14, -4, z, 3);
      if (v === 'pergaminos') { for (let i = 0; i < 4; i++) rollo(b, -6 + i * 4, 12 + a.r() * 3, 0, a.r() * 180, 8 + a.r() * 3); b.base(-10, 11, 0, 8, 6, 2.4, 'madera_vieja'); rollo(b, -10, 11, 2.4, 20, 7); }
      if (v === 'revuelto') { for (let i = 0; i < 6; i++) b.gira([(a.r() - 0.5) * 34, 10 + a.r() * 8, 0], a.r() * 180).base(0, 0, 0, 7, 5, 0.3, 'muebles_pergamino', { tono: (a.r() - 0.5) * 0.15 }); b.elip([6, 0, z], [3, 2, 0.25], 'negro'); }
    }
    return ps;
  },
});

dos({
  id: 'mue_armario', nombre: ['Armario', 'Wardrobe'], tema: 'muebles', variantes: ['cerrado', 'abierto', 'roto'], huella: [2, 1], bloquea: true,
  armarG: (v, _f, a, g) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, g);
    const W = 28, D = 13, H = 52;
    for (const [x, y] of [[-12, -5], [12, -5], [-12, 5], [12, 5]]) b.bola([x, y, 1.5], 1.8, 'madera');
    b.base(0, 0, 2.5, W, D, H - 5, 'madera').base(0, 0.4, H - 2.5, W + 3, D + 1.6, 2, 'madera').base(0, 0.6, H - 0.5, W + 1, D + 1, 1.4, 'madera', { tono: -0.06 });
    b.poli([[-8, -6, H + 0.9], [8, -6, H + 0.9], [-8, 7, H + 0.9], [8, 7, H + 0.9], [0, -6, H + 5], [0, 7, H + 5]], 'madera');
    b.base(0, 0.3, 2.5, W + 1, D + 0.6, 2.4, 'madera', { tono: -0.06 });
    const puerta = (q: Pz, x: number, mat = 'madera_lisa') => {
      q.base(x, 0, 0, 13, 0.9, 42, mat);
      q.base(x, 0.5, 4, 9.5, 0.5, 15, mat, { tono: 0.06 }).base(x, 0.5, 23, 9.5, 0.5, 15, mat, { tono: 0.06 });
    };
    if (v === 'cerrado') { puerta(b.en([0, D / 2 + 0.3, 5]), -6.8); puerta(b.en([0, D / 2 + 0.3, 5]), 6.8); }
    else {
      b.base(0, 1.5, 5, W - 3, D - 1, 42, 'negro', { resta: true });
      b.palo([-12, 0, 41], [12, 0, 41], 0.6, 'hierro');
      for (const [x, mt, l] of [[-8, 'tela_roja', 22], [-3, 'tela', 28], [3, 'cuero', 18], [8, 'tela_verde', 25]] as [number, string, number][]) { b.palo([x, 0, 41], [x, 0, 39.5], 0.3, 'hierro'); b.base(x, 0, 39.5 - l, 4.6, 6, l, mt, { tono: -0.12 }); }
      if (v === 'abierto') { puerta(b.en([0, D / 2 + 0.3, 5]), -6.8); puerta(b.gira([W / 2, D / 2 + 0.4, 5], -100), -6.8); }
      else {
        puerta(b.gira([-W / 2, D / 2 + 0.4, 5], 20).inclY([0, 0, 0], -6), 6.8);
        puerta(b.en([2, D / 2 + 10, 0.5], [1, 0, 0], [0, 0, -1]), 0, 'madera_vieja');
        b.base(9, D / 2, 18, 0.8, 0.8, 30, 'negro', { tono: 0.1 });
        b.elip([6, 13, 0], [4, 3, 1.2], 'tela', { tono: -0.1 });
      }
    }
    for (const z of [10, 38]) b.base(-W / 2 + 0.5, D / 2 + 0.6, 5 + z - 5, 2, 0.8, 2.5, 'hierro');
    if (v === 'cerrado') { b.bola([-1.2, D / 2 + 1.2, 28], 0.7, 'hierro').bola([1.2, D / 2 + 1.2, 28], 0.7, 'hierro'); }
    return ps;
  },
});

dos({
  id: 'mue_comoda', nombre: ['Cómoda', 'Chest of drawers'], tema: 'muebles', variantes: ['cerrada', 'abierta'], huella: [2, 1], bloquea: true,
  armarG: (v, _f, a, g) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, g);
    const W = 26, D = 12;
    for (const x of [-12, 12]) for (const y of [-5, 5]) b.base(x, y, 0, 2, 2, 2.5, 'madera');
    b.base(0, 0, 2, W, D, 21, 'madera').base(0, 0.4, 23, W + 2, D + 1.4, 1.6, 'madera_lisa');
    for (let i = 0; i < 3; i++) {
      const z = 3 + i * 6.6, d = v === 'abierta' ? [6, 0, 3][i] : 0;
      if (d) {
        b.base(0, D / 2 + d / 2 - 0.5, z, W - 3, d + 1, 5.6, 'madera_lisa', { tono: -0.04 });
        b.base(0, D / 2 + d / 2, z + 1, W - 4.6, d, 6, 'negro', { resta: true });
        b.elip([-4, D / 2 + d / 2, z + 4.6], [5, 3, 1.4], i ? 'tela_azul' : 'tela_roja', { tono: -0.1 });
        if (i === 0) b.base(-6, D / 2 + d + 0.2, z - 3, 4, 0.5, 8, 'tela_roja', { tono: -0.15 });
      }
      b.base(0, D / 2 + d + 0.3, z, W - 2.4, 0.8, 5.8, 'madera_lisa', { tono: 0.05 });
      for (const x of [-6.5, 6.5]) b.bola([x, D / 2 + d + 0.9, z + 2.9], 0.75, 'bronce');
    }
    candelero(b, 9, 1, 24.6, 3, 0, v === 'cerrada');
    b.base(-6, -1, 24.6, 7, 5, 4, 'madera_lisa').base(-6, -1, 28.6, 7.4, 5.4, 1, 'bronce');
    return ps;
  },
});

dos({
  id: 'mue_banco_iglesia', nombre: ['Banco de iglesia', 'Church pew'], tema: 'muebles', variantes: ['entero', 'viejo', 'roto'], huella: [3, 1], bloquea: true,
  armarG: (v, _f, a, g) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, g);
    const L = 46, m = v === 'entero' ? 'madera' : 'madera_vieja';
    const lado = (x: number) => { b.base(x, -0.5, 0, 2.2, 11, 22, m); b.palo([x, -6, 22], [x, 5, 22], 1.1, m).cil(x, -4.5, 22, 2.4, 3, m, { r1: 0 }); b.palo([x - 1.2, 4, 12], [x - 1.2, 4, 18], 0.9, m, { tono: 0.06 }); };
    lado(-L / 2); lado(L / 2);
    if (v === 'roto') {
      b.base(-L / 4, 0, 9, L / 2, 9, 1.6, m).base(-L / 4, -4.6, 10.6, L / 2, 1.4, 12, m).base(-L / 4, -4.8, 22.4, L / 2, 2, 1.4, m, { tono: 0.05 });
      const q = b.inclY([L / 2, 0, 10.6], 24);
      q.base(-L / 4 - 1, 0, -1.6, L / 2 - 2, 9, 1.6, m).base(-L / 4 - 1, -4.6, 0, L / 2 - 4, 1.4, 9, m);
      for (let i = 0; i < 4; i++) b.gira([(a.r() - 0.2) * 14, 7 + a.r() * 5, 0], a.r() * 180).base(0, 0, 0, 4 + a.r() * 4, 1, 0.8, m, { tono: 0.1 });
    } else {
      b.base(0, 0, 9, L, 9, 1.6, m).base(0, -4.6, 10.6, L, 1.4, 12, m).base(0, -4.8, 22.4, L, 2, 1.4, m, { tono: 0.05 });
      b.base(0, -6.2, 16, L - 2, 3, 0.8, m, { tono: -0.06 }).base(0, -7.6, 16, L - 2, 0.6, 2, m, { tono: -0.06 });
      b.base(0, 3, 2, L - 2, 1.6, 1.6, m, { tono: -0.05 });
      if (v === 'viejo') { libro(b, 6, 0, 10.6, 15, 'cuero', 1.6, 5, 6.5); b.base(-12, 0, 10.6, 9, 7, 0.15, 'tela', { tono: -0.15 }); vela(b, -14, -6.2, 16.8, 1.5, 0, false); }
    }
    return ps;
  },
});

dos({
  id: 'mue_alfombra', nombre: ['Alfombra', 'Rug'], tema: 'muebles', variantes: ['roja', 'azul', 'raida', 'piel'], huella: [3, 2], bloquea: false, plano: true,
  armarG: (v, _f, a, g) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, g);
    if (v === 'piel') {
      const p = b.gira([0, 0, 0], (a.r() - 0.5) * 30);
      p.elip([0, 0, 0], [16, 10, 0.9], 'muebles_piel');
      for (const [x, y, gg] of [[-12, 9, 40], [-12, -9, -40], [11, 9, -30], [11, -9, 30]]) p.gira([x, y, 0], gg).elip([0, 0, 0], [3, 6, 0.7], 'muebles_piel', { tono: -0.04 });
      p.elip([18, 0, 0.6], [5, 4, 2.4], 'muebles_piel', { tono: 0.05 }).elip([22, 0, 0.8], [2.6, 2, 1.6], 'muebles_piel', { tono: -0.05 }).bola([24.2, 0, 1.2], 0.8, 'negro');
      p.bola([19.5, 2.5, 2.4], 0.6, 'negro').bola([19.5, -2.5, 2.4], 0.6, 'negro').elip([16.5, 3.5, 3], [1, 1.3, 1], 'muebles_piel').elip([16.5, -3.5, 3], [1, 1.3, 1], 'muebles_piel');
      p.gira([-17, 0, 0], 0).elip([-3, 0, 0], [4, 1.4, 0.6], 'muebles_piel', { tono: -0.06 });
      return ps;
    }
    const W = 50, D = 32, base = v === 'azul' ? 'tela_azul' : v === 'raida' ? 'tela' : 'tela_roja', bor = v === 'azul' ? 'tela' : v === 'raida' ? 'tela_roja' : 'tela_azul';
    b.base(0, 0, 0, W, D, 0.5, base, { tono: v === 'raida' ? -0.12 : -0.08 });
    const z = 0.5, t = 0.12;
    // borde: dos franjas y una banda dorada
    for (const [w, d, o, mat, tn] of [[W - 2, D - 2, 2.6, bor, 0], [W - 9, D - 9, 1, 'oro', -0.3], [W - 13, D - 13, 0.8, bor, 0.05]] as [number, number, number, string, number][]) {
      b.base(0, d / 2 - o / 2, z, w, o, t, mat, { tono: tn }).base(0, -d / 2 + o / 2, z, w, o, t, mat, { tono: tn });
      b.base(w / 2 - o / 2, 0, z, o, d - 2 * o, t, mat, { tono: tn }).base(-w / 2 + o / 2, 0, z, o, d - 2 * o, t, mat, { tono: tn });
    }
    // medallón y rombos
    b.poli([[-10, 0, z], [10, 0, z], [0, -7, z], [0, 7, z], [-10, 0, z + t], [10, 0, z + t], [0, -7, z + t], [0, 7, z + t]], bor, { tono: -0.05 });
    b.poli([[-6, 0, z], [6, 0, z], [0, -4, z], [0, 4, z], [-6, 0, z + t * 2], [6, 0, z + t * 2], [0, -4, z + t * 2], [0, 4, z + t * 2]], 'oro', { tono: -0.3 });
    for (const x of [-15, 15]) b.poli([[x - 3, 0, z], [x + 3, 0, z], [x, -3, z], [x, 3, z], [x - 3, 0, z + t], [x + 3, 0, z + t], [x, -3, z + t], [x, 3, z + t]], 'oro', { tono: -0.35 });
    // flecos
    for (const x of [-W / 2 - 1, W / 2 + 1]) for (let y = -D / 2 + 1.5; y < D / 2 - 1; y += 2.4) b.base(x, y, 0, 2, 1.1, 0.3, 'tela', { tono: 0.12 });
    if (v === 'raida') {
      for (let i = 0; i < 4; i++) b.cil((a.r() - 0.5) * 40, (a.r() - 0.5) * 24, -1, 1.5 + a.r() * 2.5, 3, 'negro', { resta: true });
      b.poli([[W / 2 - 8, D / 2 + 1, -1], [W / 2 + 2, D / 2 + 1, -1], [W / 2 + 2, D / 2 - 9, -1], [W / 2 - 8, D / 2 + 1, 2], [W / 2 + 2, D / 2 + 1, 2], [W / 2 + 2, D / 2 - 9, 2]], 'negro', { resta: true });
      for (let i = 0; i < 6; i++) b.base((a.r() - 0.5) * 44, (a.r() - 0.5) * 28, z, 3 + a.r() * 6, 2 + a.r() * 4, 0.1, 'tierra', { tono: 0.05 });
    }
    return ps;
  },
});

// ------------------------------------------------------------------ velas y candelabros (animados)
registrar(
  {
    id: 'mue_velas', nombre: ['Velas', 'Candles'], tema: 'muebles', variantes: ['una', 'grupo', 'calavera', 'derretidas'], cuadros: 4, t: 3, huella: [1, 1], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = []; const b = raiz(a, ps, a.r() * 90);
      let alto = 12;
      if (v === 'una') { b.elip([0, 0, 0], [3, 2.6, 0.6], 'cera'); vela(b, 0, 0, 0, 9, f, true, 1.4); alto = 11; }
      else if (v === 'calavera') { calavera(b, 0, 0, 0, 30, 1.6); vela(b, 0.5, 0, 7.2, 4, f, true, 1); b.elip([0.5, 0, 7.4], [1.8, 1.8, 0.6], 'cera'); b.elip([3.5, 0.5, 4], [0.6, 0.6, 1.6], 'cera'); alto = 13; }
      else {
        const n = v === 'grupo' ? 6 : 5;
        b.elip([0, 0, 0], [7, 6, 0.8], 'cera');
        for (let i = 0; i < n; i++) {
          const t = i * 2.4 + a.r(), r = i ? 3 + a.r() * 2.5 : 0;
          const h = v === 'grupo' ? 3 + a.r() * 9 : 1 + a.r() * 2.5;
          vela(b, Math.cos(t) * r, Math.sin(t) * r, 0, h, f + i, v === 'grupo' || i % 2 === 0, 1 + a.r() * 0.4);
        }
        if (v === 'derretidas') for (let i = 0; i < 4; i++) b.elip([(a.r() - 0.5) * 10, (a.r() - 0.5) * 10, 0.4], [2, 1.6, 0.8], 'cera', { tono: 0.05 });
        alto = 10;
      }
      return { piezas: ps, resplandor: { c: [0, 0, alto], r: 22 + Math.sin(f * 1.7) * 2, color: '#ffc870' } };
    },
  },
  {
    id: 'mue_candelabro', nombre: ['Candelabro de pie', 'Standing candelabra'], tema: 'muebles', variantes: ['hierro', 'oro', 'apagado'], cuadros: 4, t: 3, huella: [1, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = []; const b = raiz(a, ps, -45 + (a.r() - 0.5) * 20);
      const m = v === 'oro' ? 'oro' : v === 'apagado' ? 'hierro_oxido' : 'hierro';
      for (let i = 0; i < 3; i++) { const t = (i / 3) * Math.PI * 2; b.palo([0, 0, 6], [Math.cos(t) * 7, Math.sin(t) * 7, 0.6], 0.8, m).bola([Math.cos(t) * 7, Math.sin(t) * 7, 0.8], 1.1, m); }
      b.cil(0, 0, 4, 1.8, 3, m, { r1: 1 }).cil(0, 0, 6, 0.9, 34, m);
      for (const z of [14, 26]) b.elip([0, 0, z], [1.6, 1.6, 1.2], m, { tono: 0.06 });
      b.cil(0, 0, 38, 1.4, 2, m, { r1: 2.6 });
      const on = v !== 'apagado';
      const tops: V3[] = [[0, 0, 40]];
      for (const s of [-1, 1]) { b.palo([0, 0, 37], [s * 5, 0, 35.5], 0.7, m).palo([s * 5, 0, 35.5], [s * 9, 0, 38.5], 0.7, m); tops.push([s * 9, 0, 38.5]); }
      for (const [x, y, z] of tops) { b.cil(x, y, z, 1.8, 1, m, { r1: 2.2 }); vela(b, x, y, z + 1, x ? 4.5 : 6.5, f + x, on, 1.0); }
      if (!on) b.elip([2, 2, 0], [3, 2.4, 0.5], 'cera');
      return on ? { piezas: ps, resplandor: { c: [0, 0, 46], r: 24 + Math.sin(f * 1.7) * 2, color: '#ffc870' } } : ps;
    },
  },
);

// ------------------------------------------------------------------ caldero (animado) y fogón (animado)
registrar({
  id: 'mue_caldero', nombre: ['Caldero', 'Cauldron'], tema: 'muebles', variantes: ['verde', 'sangre', 'agua', 'apagado'], cuadros: 6, t: 3, huella: [2, 2], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, a.r() * 60);
    const on = v !== 'apagado';
    // leños y brasas
    b.elip([0, 0, 0], [13, 12, 0.8], on ? 'tierra' : 'negro', { tono: on ? -0.05 : 0.15 });
    for (let i = 0; i < 4; i++) { const t = i * 1.57 + 0.4; b.palo([Math.cos(t) * 10, Math.sin(t) * 10, 1.4], [-Math.cos(t) * 2, -Math.sin(t) * 2, 2], 1.4, i % 2 ? 'corteza' : 'corteza_muerta'); }
    for (let i = 0; i < 7; i++) { const t = (i / 7) * Math.PI * 2; b.elip([Math.cos(t) * 12.5, Math.sin(t) * 12, 1], [2.4, 2, 1.8], 'piedra', { tono: (i % 3) * 0.05 }); }
    // patas y olla
    for (let i = 0; i < 3; i++) { const t = (i / 3) * Math.PI * 2 + 0.5; b.palo([Math.cos(t) * 7, Math.sin(t) * 7, 10], [Math.cos(t) * 10, Math.sin(t) * 10, 0], 1.0, 'hierro'); }
    b.elip([0, 0, 14], [11, 11, 9], 'hierro').base(0, 0, 19, 30, 30, 10, 'negro', { resta: true });
    b.cil(0, 0, 18.4, 11.4, 1.8, 'hierro', { tono: 0.06 }).cil(0, 0, 17, 9.4, 4, 'negro', { resta: true });
    for (const s of [-1, 1]) b.palo([s * 11.4, -2, 19], [s * 13, 0, 18.4], 0.7, 'hierro').palo([s * 13, 0, 18.4], [s * 11.4, 2, 19], 0.7, 'hierro');
    const liq = v === 'verde' ? 'baba' : v === 'sangre' ? 'sangre' : v === 'agua' ? 'agua_sucia' : 'agua_sucia';
    const burb = v === 'verde' ? 'fuego_verde' : v === 'sangre' ? 'portal_rojo' : liq;
    const tl = v === 'verde' || v === 'sangre' ? -0.5 : 0;
    b.cil(0, 0, 16.6, 9.5, 0.8, liq);
    // burbujas: tres que crecen y revientan con el cuadro
    if (v !== 'apagado') for (let i = 0; i < 3; i++) {
      const ph = ((f + i * 2) % 6) / 6, t = i * 2.1 + Math.floor((f + i * 2) / 6) * 1.3, r = 2 + i * 1.8;
      if (ph < 0.85) b.bola([Math.cos(t) * r, Math.sin(t) * r, 17.1], 0.6 + ph * 1.5, burb, { tono: tl + 0.05 + ph * 0.1 });
    }
    if (on) {
      const fr = (k: number) => Math.sin((f / 6) * Math.PI * 2 + k * 2.1);
      for (let k = 0; k < 4; k++) { const ang = (k / 4) * Math.PI * 2 + f * 0.4; b.cil(Math.cos(ang) * 4, Math.sin(ang) * 4, 1.5, 2.6 - (k % 2) * 0.6, 5 + fr(k) * 1.6, 'fuego', { r1: 0.3 }); }
      b.elip([0, 0, 2.5], [5, 5, 2], 'fuego', { tono: 0.15 });
      return { piezas: ps, resplandor: { c: [0, 0, 3], r: 18, color: '#ff9a3a' } };
    }
    return ps;
  },
});

dos({
  id: 'mue_fogon', nombre: ['Fogón de cocina', 'Kitchen hearth'], tema: 'muebles', variantes: ['encendido', 'con_olla', 'apagado'], cuadros: 6, t: 3, huella: [3, 2], bloquea: true,
  armarG: (v, f, a, g) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, g);
    const W = 44, D = 20;
    b.base(0, -2, 0, W, D, 34, 'piedra_bloques');
    b.base(0, 4, 0, 24, 20, 22, 'negro', { resta: true }).cil(0, 14, 22, 12, 20, 'negro', { resta: true, r1: 12 });
    b.palo([0, -12, 22], [0, 14, 22], 12, 'negro', { resta: true });
    // repisa y campana de la chimenea
    b.base(0, 0, 34, W + 4, D + 3, 3, 'piedra_gris');
    b.poli([[-W / 2, -12, 37], [W / 2, -12, 37], [-W / 2, 8, 37], [W / 2, 8, 37], [-12, -12, 62], [12, -12, 62], [-12, -2, 62], [12, -2, 62]], 'piedra_bloques');
    b.base(0, -7, 62, 24, 10, 22, 'ladrillo').base(0, -7, 84, 27, 13, 2.4, 'piedra_gris');
    // cosas en la repisa
    jarra(b, -16, 2, 37, 0.8); botella(b, 16, 3, 37, 'muebles_barro', 5); b.cil(10, 3, 37, 2.2, 3, 'bronce', { r1: 2.8 });
    // leños y fuego
    b.base(0, 4, 0, 26, 12, 1.2, 'piedra', { tono: -0.15 });
    for (const [y, gg] of [[1, 8], [5, -6], [3, 0]] as [number, number][]) b.gira([0, y, 1.2 + (gg ? 0 : 2)], gg).palo([-8, 0, 1.2], [8, 0, 1.2], 1.6, 'corteza');
    const on = v !== 'apagado';
    if (on) {
      const fr = (k: number) => Math.sin((f / 6) * Math.PI * 2 + k * 1.9);
      for (let k = 0; k < 5; k++) b.cil(-6 + k * 3, 4 + (k % 2) * 2, 2.6, 2.4 - (k % 2) * 0.5, 7 + fr(k) * 2.5 + (k === 2 ? 3 : 0), 'fuego', { r1: 0.3 });
      b.elip([0, 4, 3], [8, 4, 2], 'fuego', { tono: 0.1 });
    } else for (let i = 0; i < 5; i++) b.elip([(a.r() - 0.5) * 14, 3 + a.r() * 4, 1.5], [1.6, 1.2, 0.8], 'lava', { tono: -0.35 });
    // olla colgada del gancho
    if (v === 'con_olla') {
      b.palo([0, 4, 21], [0, 4, 15], 0.5, 'hierro');
      b.elip([0, 4, 10], [5.5, 5.5, 4.6], 'hierro').base(0, 4, 13, 14, 14, 6, 'negro', { resta: true });
      b.cil(0, 4, 12.4, 5.4, 1, 'hierro', { tono: 0.06 }).cil(0, 4, 12, 4.6, 0.8, 'agua_sucia');
      b.palo([-5.4, 4, 13], [0, 4, 15.5], 0.35, 'hierro').palo([5.4, 4, 13], [0, 4, 15.5], 0.35, 'hierro');
    }
    // leña al costado y herramientas
    b.palo([W / 2 + 0.5, 8, 0], [W / 2 + 0.5, 6, 20], 0.5, 'hierro').base(W / 2 + 0.5, 8.2, 0, 3, 0.5, 4, 'hierro');
    for (let i = 0; i < 5; i++) b.palo([W / 2 + 2 + (i % 2) * 3, -2 + i * 2.2, 1.4 + (i > 2 ? 2.6 : 0)], [W / 2 + 12 + (i % 2) * 3, -2 + i * 2.2, 1.4 + (i > 2 ? 2.6 : 0)], 1.3, i % 2 ? 'corteza' : 'corteza_muerta');
    return on ? { piezas: ps, resplandor: { c: b.p([0, 6, 6]), r: 30, color: '#ff9a3a' } } : ps;
  },
});

dos({
  id: 'mue_repisa_frascos', nombre: ['Repisa con frascos', 'Shelves with jars'], tema: 'muebles', variantes: ['llena', 'saqueada'], huella: [2, 1], bloquea: true,
  armarG: (v, _f, a, g) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, g);
    const W = 30;
    for (const x of [-W / 2 + 1.2, W / 2 - 1.2]) b.base(x, -2, 0, 2.2, 3, 46, 'madera_vieja');
    const niv = [10, 22, 34, 45];
    for (const z of niv) { b.base(0, 0, z, W + 2, 7, 1.4, 'madera'); for (const x of [-8, 8]) b.poli([[x - 0.6, -3.4, z], [x + 0.6, -3.4, z], [x - 0.6, 2.5, z], [x + 0.6, 2.5, z], [x - 0.6, -3.4, z - 4], [x + 0.6, -3.4, z - 4]], 'hierro_oxido'); }
    const llena = v === 'llena';
    niv.forEach((z0, k) => {
      const z = z0 + 1.4;
      let x = -W / 2 + 3;
      while (x < W / 2 - 3) {
        const r = a.r();
        const w = r < 0.35 ? 4.4 : r < 0.7 ? 3.2 : 2.6;
        if (!llena && a.r() < 0.6) { x += w + 1; continue; }
        if (r < 0.35) jarra(b, x + 2, 0.5, z, 0.75);
        else if (r < 0.7) botella(b, x + 1.5, 0.5, z, ['muebles_vidrio', 'muebles_barro', 'muebles_vidrio'][Math.floor(a.r() * 3)], 5 + a.r() * 3);
        else frasco(b, x + 1.3, 0.5, z, ['fuego_verde', 'magia', 'portal_rojo', 'runa'][Math.floor(a.r() * 4)], 1.3, 1.5);
        x += w + 0.4 + a.r();
      }
      if (k === 3 && llena) calavera(b, 0, 0, z, 60, 0.8);
    });
    // manojos de hierbas colgando
    for (const x of [-9, 1, 10]) { b.palo([x, 2, 10], [x, 2.5, 7], 0.3, 'cuerda'); b.cil(x, 2.5, 2, 1.6, 5.5, 'hojas', { r1: 0.5 }); }
    if (!llena) {
      for (let i = 0; i < 7; i++) { const x = (a.r() - 0.5) * 30, y = 6 + a.r() * 8; b.poli([[x, y, 0], [x + 1.6, y + 0.4, 0], [x + 0.6, y + 1.5, 0], [x + 0.7, y + 0.6, 1.2]], i % 2 ? 'muebles_barro' : 'muebles_vidrio', { tono: 0.1 }); }
      b.elip([4, 9, 0], [5, 3, 0.25], 'baba');
      jarra(b.inclY([-8, 10, 2.6], 85), 0, 0, 0, 0.75);
    }
    return ps;
  },
});

// ------------------------------------------------------------------ cosas de mazmorra
registrar(
  {
    id: 'mue_jaula_colgante', nombre: ['Jaula colgante', 'Hanging cage'], tema: 'muebles', variantes: ['vacia', 'esqueleto', 'abierta'], huella: [3, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = []; const b = raiz(a, ps, -45 + (a.r() - 0.5) * 10);
      // horca: poste, brazo y tornapunta
      b.base(-16, 0, 0, 12, 12, 3, 'piedra_bloques').base(-16, 0, 0, 4, 4, 92, 'madera_vieja');
      b.base(-4, 0, 88, 30, 3.6, 3.6, 'madera_vieja').palo([-16, 0, 72], [-6, 0, 89], 1.4, 'madera_vieja');
      const cx = 8, top = 82;
      b.palo([cx, 0, 88], [cx, 0, top + 6], 0.5, 'hierro');
      for (let z = top + 6; z > top; z -= 1.5) b.bola([cx, 0, z], 0.7, 'hierro');
      // jaula
      const zc = 34, H = 34, R = 9;
      b.cil(cx, 0, zc, R + 0.6, 1.6, 'hierro').cil(cx, 0, zc + H, R + 0.6, 1.4, 'hierro').cil(cx, 0, zc + H + 1.4, R, 4, 'hierro', { r1: 1 });
      b.cil(cx, 0, zc + H / 2, R + 0.4, 1, 'hierro');
      for (let i = 0; i < 12; i++) {
        const t = (i / 12) * Math.PI * 2;
        const abierta = v === 'abierta' && i >= 0 && i <= 2;
        if (abierta) continue;
        b.palo([cx + Math.cos(t) * R, Math.sin(t) * R, zc], [cx + Math.cos(t) * R, Math.sin(t) * R, zc + H], 0.6, i % 3 ? 'hierro' : 'hierro_oxido');
      }
      if (v === 'abierta') {
        const pu = b.gira([cx + R, -2, zc], 70);
        for (let k = 0; k < 3; k++) pu.palo([0, k * 3.4, 0], [0, k * 3.4, H], 0.6, 'hierro');
        pu.palo([0, 0, 2], [0, 7, 2], 0.6, 'hierro').palo([0, 0, H - 2], [0, 7, H - 2], 0.6, 'hierro');
      }
      b.cil(cx, 0, zc - 0.6, R - 0.4, 1, 'hierro_oxido');
      if (v === 'esqueleto') {
        const s = b.en([cx, 0, zc + 1]);
        calavera(s, 1, 0, 14, 30, 1.2);
        s.palo([0, 0, 1], [-1, 0, 13], 1, 'hueso');
        for (let k = 0; k < 4; k++) s.elip([0.4, 0, 6 + k * 1.8], [2.6 - k * 0.1, 3.6 - k * 0.2, 0.5], 'hueso', { tono: -0.05 });
        s.palo([0, 3, 12], [4, 5, 4], 0.8, 'hueso').palo([0, -3, 12], [5, -4, 8], 0.8, 'hueso').palo([5, -4, 8], [7, -4, 16], 0.7, 'hueso');
        s.palo([1, 2, 1.5], [7, 3, 1.5], 1, 'hueso').palo([1, -2, 1.5], [6, -5, 1.5], 1, 'hueso').palo([7, 3, 1.5], [8, 4, 6], 0.9, 'hueso');
        s.elip([0, 0, 1.4], [3, 4, 1.2], 'hueso', { tono: -0.06 });
      }
      ps.push(a.elipsoide(-16, 0, 0, 10, 10, 1, { mat: 'tierra' }));
      return ps;
    },
  },
);

dos({
  id: 'mue_potro', nombre: ['Potro de tormento', 'Torture rack'], tema: 'muebles', variantes: ['vacio', 'cadenas', 'viejo'], huella: [3, 1], bloquea: true,
  armarG: (v, _f, a, g) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, g);
    const m = v === 'viejo' ? 'madera_vieja' : 'madera';
    const L = 44;
    for (const [x, y] of [[-L / 2 + 2, -7], [L / 2 - 2, -7], [-L / 2 + 2, 7], [L / 2 - 2, 7]]) b.base(x, y, 0, 3, 3, 18, m);
    b.base(0, -7, 12, L, 2.6, 3, m).base(0, 7, 12, L, 2.6, 3, m);
    for (let x = -L / 2 + 7; x <= L / 2 - 7; x += 4) b.base(x, 0, 13, 3, 12, 1.6, m, { tono: (x % 8 ? 0.03 : -0.03) });
    // rodillos con radios
    for (const s of [-1, 1]) {
      const x = s * (L / 2 - 2);
      b.palo([x, -9, 16], [x, 9, 16], 2.2, m, { tono: 0.05 });
      for (let k = 0; k < 4; k++) { const t = k * (Math.PI / 2) + 0.3; b.palo([x, 9.5, 16], [x + Math.cos(t) * 7, 9.5, 16 + Math.sin(t) * 7], 0.8, m); }
      for (const y of [-3, 3]) b.palo([x, y, 16 + 2.2], [s * 9, y, 15.4], 0.5, 'cuerda');
      if (v !== 'viejo') for (const y of [-3, 3]) b.cil(s * 9, y, 14.6, 1.4, 1.4, 'hierro');
    }
    if (v === 'cadenas') for (const s of [-1, 1]) for (let k = 0; k < 5; k++) b.bola([s * (12 + k * 1.6), 9, 14 - k * 2.4], 0.8, 'hierro');
    if (v !== 'vacio') { b.elip([2, 0, 14.4], [6, 3, 0.25], 'sangre'); b.elip([3, 10, 0], [5, 3, 0.4], 'sangre'); }
    return ps;
  },
});

registrar(
  {
    id: 'mue_doncella_hierro', nombre: ['Doncella de hierro', 'Iron maiden'], tema: 'muebles', variantes: ['cerrada', 'abierta', 'oxidada'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = []; const r = raiz(a, ps, 45 + (a.r() - 0.5) * 10);
      const m = v === 'oxidada' ? 'hierro_oxido' : 'hierro';
      r.base(0, 0, 0, 22, 22, 3, 'piedra_bloques');
      const b = r.en([0, 0, 3]);
      // cuerpo: sarcófago parado que mira a +x
      const perfil = (x0: number, x1: number): V3[] => [[x0, -8, 0], [x0, 8, 0], [x1, -8, 0], [x1, 8, 0], [x0, -9.5, 34], [x0, 9.5, 34], [x1, -9.5, 34], [x1, 9.5, 34], [x0, -6, 46], [x0, 6, 46], [x1, -6, 46], [x1, 6, 46], [x0, -4, 56], [x0, 4, 56], [x1, -4, 56], [x1, 4, 56]];
      b.poli(perfil(-6, 0), m, { tono: -0.05 });
      const frente = (q: Pz, abierto: boolean) => {
        q.poli(perfil(0, 5), m);
        if (!abierto) {
          q.elip([5.5, 0, 50], [1.8, 3.6, 4.6], m, { tono: 0.08 }).elip([6.4, 0, 50], [1.4, 0.8, 1.6], m, { tono: 0.12 });
          q.bola([6.4, 1.4, 52], 0.6, 'negro').bola([6.4, -1.4, 52], 0.6, 'negro');
          q.caja([5.4, 0, 30], [0.8, 15, 1.4], m, { tono: 0.1 }).caja([5.4, 0, 14], [0.8, 14, 1.4], m, { tono: 0.1 });
          q.caja([5.2, 0, 25], [0.6, 0.5, 40], 'negro', { tono: 0.1 });
          for (const z of [10, 30]) q.bola([5.6, 0, z], 1, m, { tono: 0.15 });
        }
      };
      if (v === 'abierta') {
        b.poli(perfil(-6, 4.5).map(([x, y, z]) => [x + 1.5, y * 0.8, z * 0.9 + 3] as V3), 'negro', { resta: true });
        for (let i = 0; i < 9; i++) b.palo([-4.2, (i % 3 - 1) * 4, 12 + Math.floor(i / 3) * 12], [-0.5, (i % 3 - 1) * 4, 12 + Math.floor(i / 3) * 12], 0.7, 'acero', { r1: 0 });
        // dos puertas abiertas
        for (const s of [-1, 1]) {
          const q = b.gira([0, s * 9, 0], s * 140);
          q.poli(perfil(0, 2.4).map(([x, y, z]) => [x, (y - s * 9.5) * 0.5 + 0, z] as V3), m);
          for (let i = 0; i < 4; i++) q.palo([-0.1, -s * 4.5 + (i % 2) * s * 1, 12 + i * 9], [-3.5, -s * 4.5 + (i % 2) * s * 1, 12 + i * 9], 0.7, 'acero', { r1: 0 });
        }
        b.elip([3, 0, 1], [4, 3, 0.3], 'sangre');
      } else frente(b, false);
      if (v === 'oxidada') { b.elip([5, 3, 6], [1.6, 3, 4], 'sangre', { tono: -0.05 }); r.elip([10, 2, 3], [4, 3, 0.4], 'sangre'); }
      return ps;
    },
  },
  {
    id: 'mue_piedra_afilar', nombre: ['Piedra de afilar', 'Grindstone'], tema: 'muebles', variantes: ['simple', 'con_espada', 'rota'], huella: [2, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = []; const b = raiz(a, ps, (a.r() - 0.5) * 12);
      // bastidor en A a cada lado de la muela, muela de piedra con eje a lo largo de y
      for (const y of [-5, 5]) { b.palo([-8, y, 0], [0, y, 16], 1.2, 'madera').palo([8, y, 0], [0, y, 16], 1.2, 'madera').base(0, y, 5, 14, 1.8, 1.8, 'madera'); }
      b.base(0, 0, 0, 20, 14, 1.6, 'madera_vieja');
      const rota = v === 'rota';
      if (rota) {
        b.palo([0, -2, 14], [0, 2, 14], 9, 'piedra').poli([[2, -3, 14], [12, -3, 30], [12, 3, 30], [2, 3, 14], [-6, -3, 30], [-6, 3, 30]], 'negro', { resta: true });
        b.inclX([6, 8, 0], 80).palo([0, 0, 0], [0, 0, 3.6], 6, 'piedra', { tono: 0.05 });
      } else b.palo([0, -2, 15], [0, 2, 15], 10, 'piedra');
      b.palo([0, -8, 15], [0, 8, 15], 0.8, 'hierro').palo([0, 8, 15], [0, 8, 9], 0.6, 'hierro').palo([0, 8, 9], [0, 11, 9], 0.8, 'madera_lisa');
      b.palo([0, -7, 15], [0, -7, 15.6], 1.6, 'hierro');
      // cubo de agua y pedal
      b.cil(-11, -6, 0, 3.4, 5, 'madera', { r1: 3.8 }).cil(-11, -6, 4.6, 3.2, 0.3, 'agua');
      for (const z of [1, 3.6]) b.cil(-11, -6, z, 3.6, 0.6, 'hierro');
      b.palo([10, 0, 1], [3, 0, 8], 0.8, 'madera_vieja');
      if (v === 'con_espada') {
        const s = b.en([3, 3, 0.5], [0.15, 0.25, 1], [1, -0.3, 0]);
        s.bola([46, 0, 0], 1.6, 'hierro').palo([39, 0, 0], [45, 0, 0], 1, 'cuero').caja([38, 0, 0], [1.8, 11, 1.8], 'hierro');
        s.poli([[37, 1.7, 0], [37, -1.7, 0], [37, 0, 0.6], [37, 0, -0.6], [6, 1.5, 0], [6, -1.5, 0], [0, 0, 0]], 'acero');
      }
      return ps;
    },
  },
);

dos({
  id: 'mue_barril_mesa', nombre: ['Barril de mesa', 'Barrel table'], tema: 'muebles', variantes: ['jarras', 'dados', 'vela'], huella: [1, 1], bloquea: true,
  armarG: (v, _f, a, g) => {
    const ps: Pieza[] = []; const b = raiz(a, ps, g + a.r() * 90);
    b.cil(0, 0, 0, 7, 8, 'madera', { r1: 8 }).cil(0, 0, 8, 8, 8, 'madera', { r1: 7 });
    for (const z of [2, 13]) b.cil(0, 0, z, z < 8 ? 7.4 : 7.6, 1.5, 'hierro', { r1: z < 8 ? 7.6 : 7.4 });
    b.cil(0, 0, 16, 10.5, 1.6, 'madera_vieja');
    const z = 17.6;
    if (v === 'jarras') { jarro(b, -3, -2, z); jarro(b, 3, 3, z); b.cil(4, -4, z, 1.6, 0.2, 'agua_sucia'); }
    else if (v === 'dados') {
      for (const [x, y, gg] of [[-1, 1, 20], [1.5, -1, 50], [3, 2, 10]]) b.gira([x, y, z], gg).base(0, 0, 0, 2, 2, 2, 'hueso').bola([0, 1.05, 1], 0.35, 'negro').bola([1.05, 0, 1.4], 0.35, 'negro');
      b.cil(-4, -3, z, 2.2, 3.5, 'cuero', { r1: 1.8 });
      for (let i = 0; i < 4; i++) b.cil(5 + (a.r() - 0.5) * 3, -5 + (a.r() - 0.5) * 3, z + i * 0.3, 0.9, 0.3, 'oro');
      jarro(b, -5, 4, z);
    } else { candelero(b, 0, 0, z, 4.5); copa(b, 5, -3, z, 'hierro', false); }
    return ps;
  },
});
