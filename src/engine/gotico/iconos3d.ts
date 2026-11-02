import { createRaster, type Raster } from '../core/raster';
import type { LootItem } from '../loot/catalog';
import { MATERIALES } from './materiales';
import { KZ, VISTA, pintarEscena, palo, poliedro, masa, hueso, bulto, ruido, type Comp, type Pieza, type V3 } from './render';

/**
 * Íconos 3D del inventario: cada objeto (armaduras, escudos, joyas, pociones, gemas, runas, pergaminos, llaves, oro,
 * libros, orbes y carcajes) se arma con piezas del motor gótico y se pinta como arte de botín prerenderizado, con la
 * misma luz de arriba a la izquierda que las armas 3D de `iconoArma3D`.
 *
 * Se modela en un marco alineado con la cámara (x a la derecha de la pantalla, y hacia quien mira, z hacia arriba de
 * la pantalla), así cada objeto se posa de tres cuartos y de frente aunque la cámara del motor sea isométrica. Se
 * pinta al doble de tamaño y se reduce (bordes suaves de verdad), se le suma el resplandor de lo que brilla y se
 * recorta al rectángulo de su casilla.
 *
 * Nueve líneas de estilo (tela, cuero, tachonado, malla, placas, hueso, sagrado, oscuro, legendario) y cinco niveles:
 * a más nivel, más remaches, ribetes de oro, filigrana, gemas engastadas y runas que brillan (4 y 5).
 */

export type Linea = 'tela' | 'cuero' | 'tachonado' | 'malla' | 'placas' | 'hueso' | 'sagrado' | 'oscuro' | 'legendario';
export type Pieza3D = 'casco' | 'capucha' | 'corona' | 'pecho' | 'guantes' | 'botas' | 'cinturon' | 'hombreras' | 'grebas'
  | 'escudo_redondo' | 'escudo_cometa' | 'escudo_torre' | 'escudo_calavera'
  | 'anillo' | 'amuleto' | 'talisman' | 'pocion' | 'gema' | 'runa' | 'pergamino' | 'llave' | 'oro' | 'libro' | 'orbe' | 'flecha_carcaj';
export const PIEZAS_3D: Pieza3D[] = ['casco', 'capucha', 'corona', 'pecho', 'guantes', 'botas', 'cinturon', 'hombreras', 'grebas',
  'escudo_redondo', 'escudo_cometa', 'escudo_torre', 'escudo_calavera', 'anillo', 'amuleto', 'talisman', 'pocion', 'gema', 'runa',
  'pergamino', 'llave', 'oro', 'libro', 'orbe', 'flecha_carcaj'];
export const LINEAS: Linea[] = ['tela', 'cuero', 'tachonado', 'malla', 'placas', 'hueso', 'sagrado', 'oscuro', 'legendario'];

/**
 * Qué objeto pintar. `variante`: tipo de poción (health, mana, rejuv, antidote, stamina, thawing), de gema (ruby,
 * sapphire, emerald, amethyst, topaz, diamond, skull), de talismán (hueso, cera, ceniza, badajo, brasa, cabeza, craneo),
 * de escudo (heater, rodela), de anillo (banda), de amuleto (colgante), de pergamino (portal, identificar, mapa), de
 * llave (jefe), de libro (portal) o el número de la runa. `gema` y `color` aceptan nombre o color #rrggbb; `encanto`
 * tiñe el brillo (fuego, hielo, rayo, veneno, sombra, sagrado, sangre).
 */
export interface Icono3D { pieza: Pieza3D; linea?: Linea; nivel?: 1 | 2 | 3 | 4 | 5; variante?: string; gema?: string; encanto?: string; color?: string }

// ------------------------------------------------------------------ vectores
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const nor = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mez = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rad = (g: number) => (g * Math.PI) / 180;
type M3 = [V3, V3, V3];
const aplicar = (m: M3, v: V3): V3 => [m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2], m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2], m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2]];
const componer = (a: M3, b: M3): M3 => [aplicar(a, b[0]), aplicar(a, b[1]), aplicar(a, b[2])];
/**
 * Giro (alrededor de z: positivo lleva el frente +y hacia la izquierda), cabeceo (alrededor de x: positivo trae la
 * parte de arriba hacia quien mira, se ve más la cara de arriba; negativo la echa atrás y el frente mira hacia la luz)
 * y alabeo (alrededor de y: positivo inclina la parte de arriba hacia la izquierda).
 */
function rot(giro = 0, cabeceo = 0, alabeo = 0): M3 {
  const g = rad(giro), c = rad(cabeceo), a = rad(alabeo);
  const Rz: M3 = [[Math.cos(g), Math.sin(g), 0], [-Math.sin(g), Math.cos(g), 0], [0, 0, 1]];
  const Rx: M3 = [[1, 0, 0], [0, Math.cos(c), -Math.sin(c)], [0, Math.sin(c), Math.cos(c)]];
  const Ry: M3 = [[Math.cos(a), 0, -Math.sin(a)], [0, 1, 0], [Math.sin(a), 0, Math.cos(a)]];
  return componer(Rz, componer(Rx, Ry));
}
const I3: M3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

/** El marco de la cámara en el mundo del motor: derecha de la pantalla, hacia quien mira y arriba de la pantalla. */
const CAM_X: V3 = nor([1, -1, 0]);
const CAM_Y: V3 = nor([1, 1, 1 / KZ]);
const CAM_Z: V3 = cruz(CAM_X, CAM_Y);

// ------------------------------------------------------------------ el taller: arma piezas en el marco del objeto
type Rot = [number, number, number];
interface OpI { mat: string; tono?: number; resta?: boolean; rot?: Rot }
class Taller {
  ps: Pieza[] = [];
  /** luz que tiñe lo cercano (poción, brasa, orbe) */
  resp?: { c: V3; r: number; color: string };
  private pila: { m: M3; t: V3 }[] = [{ m: I3, t: [0, 0, 0] }];
  constructor(public s: number, private zoff: number) {}
  private get top() { return this.pila[this.pila.length - 1]; }
  /** Punto del objeto al mundo. */
  P(p: V3): V3 {
    const q = add(this.top.t, aplicar(this.top.m, p));
    const w = add(add(mul(CAM_X, q[0]), CAM_Y, q[1]), CAM_Z, q[2]);
    return [w[0] * this.s, w[1] * this.s, w[2] * this.s + this.zoff];
  }
  /** Dirección del objeto al mundo. */
  D(v: V3): V3 { const q = aplicar(this.top.m, v); return nor(add(add(mul(CAM_X, q[0]), CAM_Y, q[1]), CAM_Z, q[2])); }
  /** Arma lo de `fn` movido a `t` y girado. */
  en(t: V3, r: Rot | M3, fn: () => void) {
    const m = (typeof r[0] === 'number' ? rot(...(r as Rot)) : r) as M3;
    this.pila.push({ m: componer(this.top.m, m), t: add(this.top.t, aplicar(this.top.m, t)) });
    fn();
    this.pila.pop();
  }
  private ejes(r?: Rot): M3 { const m = r ? rot(...r) : I3; return [this.D(m[0]), this.D(m[1]), this.D(m[2])]; }
  /** Caja con centro `c` y medidas completas. */
  caja(c: V3, tam: V3, o: OpI) {
    const [ex, ey, ez] = this.ejes(o.rot), C = this.P(c), h = [tam[0] * this.s / 2, tam[1] * this.s / 2, tam[2] * this.s / 2];
    const planos: [V3, number][] = [];
    const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    [ex, ey, ez].forEach((n, i) => { planos.push([n, dot(n, C) + h[i]]); const m: V3 = [-n[0], -n[1], -n[2]]; planos.push([m, dot(m, C) + h[i]]); });
    const pts: V3[] = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) pts.push(add(add(add(C, ex, sx * h[0]), ey, sy * h[1]), ez, sz * h[2]));
    this.ps.push({ k: 'conv', planos, pts, mat: o.mat, tono: o.tono, resta: o.resta } as Pieza);
  }
  /** Cilindro o cono truncado de `a` a `b`. */
  cil(a: V3, b: V3, r0: number, r1: number, o: OpI) { this.ps.push(palo(this.P(a), this.P(b), Math.max(0.02, r0 * this.s), { mat: o.mat, r1: Math.max(0.01, r1 * this.s), tono: o.tono, resta: o.resta })); }
  /** Elipsoide con centro y radios (girado con `rot`). */
  elip(c: V3, r: V3, o: OpI) { const [ex, ey, ez] = this.ejes(o.rot); this.ps.push({ k: 'elip', c: this.P(c), ex, ey, ez, r: [r[0] * this.s, r[1] * this.s, r[2] * this.s], mat: o.mat, tono: o.tono, resta: o.resta } as Pieza); }
  esf(c: V3, r: number, o: OpI) { this.elip(c, [r, r, r], o); }
  poli(pts: V3[], o: OpI) { this.ps.push(poliedro(pts.map((p) => this.P(p)), { mat: o.mat, tono: o.tono, resta: o.resta })); }
  /** Una luz que tiñe lo que tiene cerca (centro y radio en el marco del objeto). */
  luz(c: V3, r: number, color: string) { this.resp = { c: this.P(c), r: r * this.s, color }; }
  /** Componentes de masa en el marco del objeto. */
  hue(a: V3, b: V3, r0: number, r1: number, mat?: string, k?: number, tono?: number): Comp { return hueso(this.P(a), this.P(b), r0 * this.s, r1 * this.s, { mat, k: k === undefined ? undefined : k * this.s, tono }); }
  bul(c: V3, r: V3, mat?: string, rr?: Rot, k?: number, tono?: number): Comp { return bulto(this.P(c), [r[0] * this.s, r[1] * this.s, r[2] * this.s], { ejes: this.ejes(rr), mat, k: k === undefined ? undefined : k * this.s, tono }); }
  masa(comps: Comp[], mat: string, suave = 1.5, tono?: number) { this.ps.push(masa(comps, { mat, suave: suave * this.s, tono })); }
  /** Aro (toro) de radio R y grosor r en el plano perpendicular a `eje` (eje del objeto), con n tramos. */
  aro(c: V3, R: number, r: number, o: OpI & { eje?: 'x' | 'y' | 'z'; n?: number; desde?: number; hasta?: number; suave?: boolean }) {
    const n = o.n ?? 16, a0 = o.desde ?? 0, a1 = o.hasta ?? 360, cerrado = a1 - a0 >= 360;
    const pt = (a: number): V3 => {
      const x = Math.cos(rad(a)) * R, y = Math.sin(rad(a)) * R;
      return o.eje === 'x' ? add(c, [0, x, y]) : o.eje === 'y' ? add(c, [x, 0, y]) : add(c, [x, y, 0]);
    };
    const pts = Array.from({ length: n + (cerrado ? 0 : 1) }, (_, i) => pt(a0 + ((a1 - a0) * i) / n));
    if (o.suave) {
      const comps: Comp[] = [];
      for (let i = 0; i < n; i++) comps.push(this.hue(pts[i], pts[(i + 1) % pts.length], r, r));
      this.masa(comps, o.mat, r * 0.3, o.tono);
      return;
    }
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], d = add(b, a, -1);
      this.cil(add(a, d, -0.12), add(b, d, 0.12), r, r, o);
    }
  }
}

// ------------------------------------------------------------------ materiales propios (ic_*)
const M = MATERIALES;
const hex = (h: string): V3 => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const aHex = (c: V3) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mezC = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lum = (c: V3) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
/**
 * Rampa de 9 tonos desde un color: sombras frías y profundas, el color en el medio y luces que se van al blanco tibio
 * (más en los metales y las gemas, que brillan).
 */
function rampaDe(base: string, luz = 0.55, sombra = 0.1): string[] {
  const c = hex(base), fria: V3 = [c[0] * 0.75 + 6, c[1] * 0.8 + 6, c[2] * 1.05 + 12], blanco: V3 = [255, 246, 228];
  const out: string[] = [];
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    let col: V3;
    if (t < 0.55) { const u = t / 0.55; col = mezC(mul(fria, sombra) as V3, c, Math.pow(u, 0.9)); }
    else { const u = (t - 0.55) / 0.45; col = mezC(c, blanco, Math.pow(u, 1.4) * luz); }
    out.push(aHex(col));
  }
  return out;
}
const grano = (p: V3) => (ruido(p[0] * 1.3, p[1] * 1.3, p[2] * 1.3) - 0.5) * 0.14 + (ruido(p[0] * 0.25, p[1] * 0.25, p[2] * 0.25) - 0.5) * 0.18;
const tejido = (p: V3) => ((Math.sin(p[0] * 3.1 + p[2] * 0.4) * Math.sin(p[1] * 3.1 - p[2] * 3.0)) > 0.3 ? 0.04 : -0.02) + (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3) - 0.5) * 0.12;
const cepillado = (p: V3) => (ruido(p[0] * 0.15, p[1] * 0.15, p[2] * 3) - 0.5) * 0.08;
/** Reflejo de entorno falso para lo pulido: cielo claro arriba del horizonte, suelo oscuro abajo, una línea nítida. */
const reflejo = (n: V3, k = 1) => {
  const d = VISTA[0] * n[0] + VISTA[1] * n[1] + VISTA[2] * n[2], rz = VISTA[2] - 2 * d * n[2];
  return (rz > 0.12 ? 0.1 + Math.min(0.12, (rz - 0.12) * 0.3) : rz > -0.05 ? -0.16 : -0.06) * k;
};
const anillas = (p: V3) => { const a = Math.sin(p[0] * 2.9 + p[1] * 2.9) * Math.sin(p[2] * 3.4 + (p[0] - p[1]) * 1.45); return a > 0.3 ? 0.13 : a < -0.5 ? -0.24 : -0.02; };
/** Un material con rampa desde un color (se registra una vez por color y tipo). */
function tinte(base: string, tipo: 'tela' | 'cuero' | 'metal' | 'esmalte' | 'gema' | 'liquido' | 'luz' | 'mate'): string {
  const id = `ic_${tipo}_${base.slice(1)}`;
  if (M[id]) return id;
  switch (tipo) {
    case 'tela': M[id] = { rampa: rampaDe(base, 0.35), ruido: 0.1, escala: 0.9, patron: tejido }; break;
    case 'cuero': M[id] = { rampa: rampaDe(base, 0.42), ruido: 0.14, escala: 0.7, brillo: 0.14, patron: grano }; break;
    case 'metal': M[id] = { rampa: rampaDe(base, 0.85, 0.08), ruido: 0.05, escala: 0.5, brillo: 0.75, patron: (p, n) => cepillado(p) + reflejo(n) }; break;
    case 'esmalte': M[id] = { rampa: rampaDe(base, 0.6), ruido: 0.04, escala: 0.5, brillo: 0.5, patron: (_p, n) => reflejo(n, 0.6) }; break;
    case 'gema': M[id] = { rampa: rampaDe(base, 0.95, 0.06), ruido: 0.04, escala: 0.6, brillo: 1.1, patron: (_p, n) => reflejo(n, 1.2) }; break;
    case 'liquido': M[id] = { rampa: rampaDe(base, 0.8, 0.14), ruido: 0.1, escala: 0.4, brillo: 1.0 }; break;
    case 'mate': M[id] = { rampa: rampaDe(base, 0.3), ruido: 0.25, escala: 0.6, patron: grano }; break;
    case 'luz': { const c = hex(base); M[id] = { rampa: [aHex(mul(c, 0.45) as V3), aHex(mul(c, 0.7) as V3), base, aHex(mezC(c, [255, 255, 255], 0.4)), aHex(mezC(c, [255, 255, 250], 0.8))], ruido: 0.35, escala: 0.5, emite: true }; break; }
  }
  return id;
}
M.ic_acero = { patron: (p, n) => cepillado(p) + reflejo(n), rampa: ['#0c0d10', '#171a1f', '#252930', '#353b44', '#48505b', '#5e6874', '#78838f', '#96a1ac', '#b9c2ca', '#e2e7eb'], ruido: 0.05, escala: 0.5, brillo: 0.85 };
M.ic_hierro = { rampa: ['#0b0b0c', '#161719', '#232427', '#323438', '#43464b', '#575a60', '#6e7177', '#8a8d92'], ruido: 0.22, escala: 0.6, brillo: 0.4 };
M.ic_hierro_negro = { patron: (p, n) => cepillado(p) + reflejo(n), rampa: ['#050506', '#0b0b0e', '#131318', '#1c1c23', '#26262f', '#33333d', '#44444f', '#5e5e6a', '#868694'], ruido: 0.1, escala: 0.6, brillo: 0.7 };
M.ic_oro = { patron: (_p, n) => reflejo(n, 0.8), rampa: ['#1a0e03', '#331f07', '#54360d', '#785015', '#9c6c1f', '#bd8a2c', '#d8a943', '#ecc865', '#f8e39a', '#fff6d6'], ruido: 0.04, escala: 0.5, brillo: 0.95 };
M.ic_oro_viejo = { rampa: ['#140b04', '#281808', '#42290d', '#5f3d14', '#7d531c', '#9a6b27', '#b48636', '#cca24c'], ruido: 0.12, escala: 0.6, brillo: 0.6 };
M.ic_bronce = { patron: (_p, n) => reflejo(n, 0.8), rampa: ['#150b05', '#29170a', '#412511', '#5b3519', '#764623', '#91592f', '#ab703f', '#c58c58', '#ddb084'], ruido: 0.08, escala: 0.5, brillo: 0.7 };
M.ic_plata = { patron: (_p, n) => reflejo(n, 0.8), rampa: ['#121417', '#23272c', '#383d44', '#50565e', '#6b727b', '#8890999', '#a8afb7', '#ccd2d8', '#f0f3f6'].map((c) => c.slice(0, 7)), ruido: 0.04, escala: 0.5, brillo: 0.95 };
M.ic_malla = { rampa: ['#0b0c0e', '#17191c', '#25282c', '#363a3f', '#4a4f55', '#61676e', '#7c838a', '#9ca3aa', '#c4cad0'], ruido: 0.06, escala: 1, brillo: 0.6, patron: anillas };
M.ic_malla_oro = { rampa: ['#140b03', '#2b1a07', '#47300d', '#674816', '#896221', '#a97e30', '#c69c46', '#dfbd68'], ruido: 0.06, escala: 1, brillo: 0.7, patron: anillas };
M.ic_esmalte = { patron: (_p, n) => reflejo(n, 0.5), rampa: ['#2a2724', '#47423c', '#665f56', '#877e72', '#a89e90', '#c5bcae', '#ddd6ca', '#efeae1', '#fbf9f4'], ruido: 0.03, escala: 0.5, brillo: 0.55 };
M.ic_hueso = { rampa: ['#17130e', '#2b241a', '#433829', '#5e5039', '#7a6a4c', '#978761', '#b2a37b', '#cbbe98', '#e1d7b8'], ruido: 0.2, escala: 0.9, patron: (p) => (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 2.2) - 0.5) * 0.16 };
M.ic_pelaje = { rampa: ['#0f0a06', '#1c140c', '#2b1f13', '#3c2c1b', '#4f3a25', '#634a30', '#795c3d', '#90714e', '#a88a66'], ruido: 0.55, escala: 2.2, patron: (p) => (ruido(p[0] * 3.4, p[1] * 3.4, p[2] * 0.9) - 0.5) * 0.45 };
M.ic_pelaje_gris = { rampa: ['#0d0d0d', '#1a1a1a', '#2a2928', '#3b3a38', '#4f4d4a', '#65625e', '#7c7974', '#95918b', '#b1ada6'], ruido: 0.55, escala: 2.2, patron: (p) => (ruido(p[0] * 3.4, p[1] * 3.4, p[2] * 0.9) - 0.5) * 0.45 };
M.ic_pelaje_blanco = { rampa: ['#2a2826', '#45423e', '#625e58', '#807b73', '#9d978e', '#b8b2a8', '#d0cbc2', '#e6e2da', '#f6f3ee'], ruido: 0.5, escala: 2.2, patron: (p) => (ruido(p[0] * 3.4, p[1] * 3.4, p[2] * 0.9) - 0.5) * 0.4 };
M.ic_costura = { rampa: ['#3a3226', '#5e5240', '#867860', '#ab9d80', '#cdc0a0', '#e6dbbd'], ruido: 0.05, escala: 1 };
M.ic_papel = { rampa: ['#2c2418', '#4a3d29', '#6b5a3e', '#8c7855', '#ab966d', '#c6b387', '#dccba2', '#ece0be', '#f7efd8'], ruido: 0.16, escala: 0.6, patron: (p) => (ruido(p[0] * 0.8, p[1] * 0.8, p[2] * 0.8) - 0.5) * 0.12 };
M.ic_vidrio = { patron: (_p, n) => reflejo(n, 0.8), rampa: ['#0d1216', '#18222a', '#25343f', '#364955', '#4b616d', '#647b86', '#83989f', '#a9bbc0', '#d4e2e4', '#f6fbfb'], ruido: 0.04, escala: 0.4, brillo: 1.2 };
M.ic_madera = { rampa: ['#120a05', '#21140a', '#331f10', '#462b17', '#5a381f', '#6f4728', '#855833', '#9b6a40'], ruido: 0.18, escala: 0.35, patron: (p, n) => { const u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0]; return (ruido(u * 0.6, p[2] * 0.06, 1) - 0.5) * 0.3 + ((((u % 5) + 5) % 5) < 0.6 ? -0.25 : 0); } };
M.ic_corcho = { rampa: ['#1e140b', '#352414', '#4f371f', '#6a4b2b', '#856139', '#9d784b', '#b38f60'], ruido: 0.5, escala: 1.5 };
M.ic_cera_roja = { rampa: ['#1d0405', '#360809', '#520e0e', '#701714', '#8e221c', '#a93127', '#c14735', '#d6644d'], ruido: 0.12, escala: 0.6, brillo: 0.45 };
M.ic_cera = { rampa: ['#3a3226', '#5c5040', '#807058', '#a29074', '#c0b092', '#d8cbb0', '#ebe2cc'], ruido: 0.1, escala: 0.4, brillo: 0.3 };
M.ic_roca = { rampa: ['#0d0d0e', '#19191b', '#26262a', '#35353a', '#45454b', '#57575e', '#6b6b72', '#828289', '#9c9ca3'], ruido: 0.4, escala: 0.45, patron: (p) => (ruido(p[0] * 1.6, p[1] * 1.6, p[2] * 1.6) - 0.5) * 0.18 };
M.ic_barro = { rampa: ['#170c07', '#2a170d', '#402315', '#57311e', '#6f4029', '#875136', '#9f6445'], ruido: 0.3, escala: 0.5 };
M.ic_hueco = { rampa: ['#030203', '#070608', '#0c0a0d', '#120f13'], ruido: 0.05, escala: 1 };
M.ic_brillo = { rampa: ['#d8d0c0', '#efe8da', '#fbf8f0', '#ffffff'], ruido: 0.05, escala: 1, emite: true };

const GEMAS: Record<string, string> = {
  ruby: '#d8243e', rubi: '#d8243e', sapphire: '#2f62e6', zafiro: '#2f62e6', emerald: '#1fb35e', esmeralda: '#1fb35e', amethyst: '#9a3ad8', amatista: '#9a3ad8',
  topaz: '#f2b21e', topacio: '#f2b21e', diamond: '#dfe8f0', diamante: '#dfe8f0', skull: '#cfc6b0', calavera: '#cfc6b0',
};
const ENCANTO: Record<string, string> = { fuego: '#ff7a20', hielo: '#80c8ff', rayo: '#a0c0ff', veneno: '#60e040', sombra: '#a050e0', sagrado: '#ffe080', sangre: '#e82020' };
const colorDe = (s: string | undefined, def: string, tabla: Record<string, string> = GEMAS) => (!s ? def : s.startsWith('#') && s.length === 7 ? s : tabla[s] ?? def);

// ------------------------------------------------------------------ estilo por línea y nivel
interface Estilo {
  linea: Linea; n: number;
  base: string; base2: string; borde: string; remache: string; correa: string; hebilla: string; costura: string;
  forro: string | null; gema: string; gemaHex: string; luz: string | null; luzHex: string;
  tachas: boolean; puas: boolean; duro: boolean; metal: boolean;
  /** ribete de metal en los bordes, remaches, filigrana */
  ribete: boolean; remaches: boolean; filigrana: boolean;
}
function estilo(d: Icono3D): Estilo {
  const linea = d.linea ?? 'cuero', n = d.nivel ?? 2;
  const gemaHex = colorDe(d.gema, linea === 'oscuro' ? '#d8243e' : linea === 'sagrado' ? '#ffd86a' : linea === 'hueso' ? '#1fb35e' : linea === 'legendario' ? '#ff8a1e' : '#2f62e6');
  const luzHex = colorDe(d.encanto, linea === 'oscuro' ? '#ff3020' : linea === 'sagrado' ? '#ffe9a0' : linea === 'hueso' ? '#7aff9a' : linea === 'legendario' ? '#ffb040' : gemaHex, ENCANTO);
  const e: Estilo = {
    linea, n, base: 'ic_acero', base2: 'ic_malla', borde: 'ic_acero', remache: 'ic_acero', correa: tinte('#3a2416', 'cuero'), hebilla: n >= 3 ? 'ic_oro' : n >= 2 ? 'ic_bronce' : 'ic_hierro',
    costura: 'ic_costura', forro: null, gema: tinte(gemaHex, 'gema'), gemaHex, luz: n >= 5 ? tinte(luzHex, 'luz') : null, luzHex,
    tachas: false, puas: false, duro: false, metal: false, ribete: n >= 3, remaches: n >= 2, filigrana: n >= 4,
  };
  switch (linea) {
    case 'tela': e.base = tinte(d.color ?? '#3d4fa0', 'tela'); e.base2 = tinte(aHex(mul(hex(d.color ?? '#3d4fa0'), 0.6) as V3), 'tela'); e.borde = n >= 3 ? 'ic_oro' : tinte('#b8a070', 'tela'); e.remache = 'ic_oro'; e.correa = tinte('#5a3a5a', 'tela'); e.hebilla = 'ic_oro'; break;
    case 'cuero': e.base = tinte(d.color ?? '#7a4a2a', 'cuero'); e.base2 = tinte('#4a2c18', 'cuero'); e.borde = n >= 3 ? (n >= 4 ? 'ic_oro' : 'ic_bronce') : tinte('#9a6a42', 'cuero'); e.remache = 'ic_bronce'; e.forro = n >= 2 ? 'ic_pelaje' : null; break;
    case 'tachonado': e.base = tinte(d.color ?? '#5e3822', 'cuero'); e.base2 = tinte('#3a2214', 'cuero'); e.borde = n >= 4 ? 'ic_oro' : 'ic_hierro'; e.remache = n >= 4 ? 'ic_oro' : 'ic_acero'; e.tachas = true; e.forro = n >= 3 ? 'ic_pelaje' : null; break;
    case 'malla': e.base = 'ic_malla'; e.base2 = tinte('#4a2c18', 'cuero'); e.borde = n >= 3 ? 'ic_oro' : 'ic_acero'; e.remache = n >= 3 ? 'ic_oro' : 'ic_acero'; e.metal = true; break;
    case 'placas': e.base = 'ic_acero'; e.base2 = 'ic_malla'; e.borde = n >= 3 ? 'ic_oro' : 'ic_acero'; e.remache = n >= 3 ? 'ic_oro' : 'ic_acero'; e.duro = true; e.metal = true; break;
    case 'hueso': e.base = 'ic_hueso'; e.base2 = tinte('#3a2a1e', 'cuero'); e.borde = 'ic_hierro'; e.remache = 'ic_hierro'; e.forro = 'ic_pelaje_gris'; e.puas = true; e.correa = tinte('#2e1e14', 'cuero'); break;
    case 'sagrado': e.base = 'ic_esmalte'; e.base2 = tinte('#d8d0c0', 'tela'); e.borde = 'ic_oro'; e.remache = 'ic_oro'; e.hebilla = 'ic_oro'; e.duro = true; e.metal = true; e.ribete = true; e.forro = 'ic_pelaje_blanco'; e.luz = n >= 3 ? tinte(luzHex, 'luz') : null; break;
    case 'oscuro': e.base = 'ic_hierro_negro'; e.base2 = tinte('#1e1418', 'cuero'); e.borde = n >= 4 ? 'ic_oro_viejo' : 'ic_hierro_negro'; e.remache = 'ic_hierro'; e.hebilla = 'ic_hierro_negro'; e.correa = tinte('#1a1214', 'cuero'); e.puas = true; e.duro = true; e.metal = true; e.luz = n >= 2 ? tinte(luzHex, 'luz') : null; break;
    case 'legendario': e.base = tinte(d.color ?? '#7a1f2b', 'esmalte'); e.base2 = 'ic_malla_oro'; e.borde = 'ic_oro'; e.remache = 'ic_oro'; e.hebilla = 'ic_oro'; e.duro = true; e.metal = true; e.ribete = true; e.remaches = true; e.filigrana = true; e.luz = tinte(luzHex, 'luz'); e.forro = 'ic_pelaje'; break;
  }
  return e;
}
/** El material del cuerpo de una pieza blanda (botas, guantes, cinturón): cuero salvo en las líneas de tela. */
const blando = (e: Estilo) => (e.linea === 'tela' ? e.base : e.linea === 'malla' || e.linea === 'placas' || e.linea === 'sagrado' || e.linea === 'oscuro' || e.linea === 'legendario' ? (e.linea === 'sagrado' ? tinte('#d8cbb0', 'cuero') : e.linea === 'oscuro' ? tinte('#24181a', 'cuero') : e.linea === 'legendario' ? tinte('#4a1a1e', 'cuero') : tinte('#4a2c18', 'cuero')) : e.base);

// ------------------------------------------------------------------ el estado de la animación (para lo legendario)
let CUADRO = 0;
const late = (fase = 0) => Math.sin(((CUADRO % 8) / 8) * Math.PI * 2 + fase);
/** Tono de lo que brilla: lo legendario late con el cuadro. */
const tonoLuz = (e: Estilo, fase = 0) => (e.linea === 'legendario' ? 0.12 * late(fase) : 0);

// ------------------------------------------------------------------ detalles comunes
/** Gema engastada: un brillante facetado en un engaste de metal con su chispa de luz. */
function gemaEngastada(t: Taller, c: V3, r: number, e: Estilo, o: { engaste?: string; normal?: Rot; luz?: boolean } = {}) {
  t.en(c, o.normal ?? [0, 0, 0], () => {
    t.cil([0, -0.2 * r, 0], [0, 0.35 * r, 0], r * 1.3, r * 1.15, { mat: o.engaste ?? e.borde });
    brillante(t, [0, 0.35 * r, 0], r, e.gema, [-90, 0, 0]);
    if (o.luz || e.n >= 4) t.elip([-0.35 * r, 0.95 * r, 0.35 * r], [0.22 * r, 0.12 * r, 0.22 * r], { mat: 'ic_brillo' });
  });
}
/** Talla brillante: mesa, corona, filetín y pabellón (poliedro convexo). `rr` orienta la mesa (por omisión hacia arriba). */
function brillante(t: Taller, c: V3, r: number, mat: string, rr: Rot = [0, 0, 0], alto = 1) {
  t.en(c, rr, () => {
    const pts: V3[] = [];
    for (let i = 0; i < 8; i++) { const a = rad(i * 45 + 22.5); pts.push([Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.42 * alto]); }
    for (let i = 0; i < 8; i++) { const a = rad(i * 45); pts.push([Math.cos(a) * r, Math.sin(a) * r, r * 0.08]); }
    pts.push([0, 0, -r * 0.75 * alto]);
    for (let i = 0; i < 8; i++) { const a = rad(i * 45 + 22.5); pts.push([Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, -r * 0.45 * alto]); }
    t.poli(pts, { mat });
  });
}
/** Remaches en fila de `a` a `b`. */
function filaRemaches(t: Taller, a: V3, b: V3, n: number, r: number, mat: string) {
  for (let i = 0; i < n; i++) t.esf(mez(a, b, n === 1 ? 0.5 : i / (n - 1)), r, { mat });
}
/** Púa cónica de `a` hacia `dir` con largo L. */
function pua(t: Taller, a: V3, dir: V3, L: number, r: number, mat: string) { t.cil(a, add(a, nor(dir), L), r, 0.04, { mat }); }

// ------------------------------------------------------------------ botas
/** Túnel convexo con sección de arco (láminas de escarpe, guardas): de x0 a x1, ancho `w`, alto `h` sobre `zb`. */
function arco(t: Taller, x0: number, x1: number, w: number, h: number, zb: number, o: OpI, w1 = w, h1 = h) {
  const pts: V3[] = [];
  for (let i = 0; i <= 6; i++) { const a = rad(-90 + i * 30); pts.push([x0, Math.sin(a) * w, zb + Math.cos(a) * h], [x1, Math.sin(a) * w1, zb + Math.cos(a) * h1]); }
  t.poli(pts, o);
}
/** Una bota con la punta hacia +x, el talón en -x, la caña hacia arriba; el costado +y es el que se ve. */
function bota(t: Taller, e: Estilo) {
  const L = e.linea, cuero = blando(e), suela = tinte('#1c130d', 'cuero');
  const placa = L === 'placas' || L === 'sagrado' || L === 'oscuro' || L === 'legendario';
  const top = L === 'tela' ? 12.5 : placa ? 16 : 15.5;
  const cx = -1.5; // eje de la caña
  // suela y tacón (aparte, para que se lea el canto oscuro)
  t.masa([t.bul([1.4, 0, 0.75], [7.4, 3.35, 0.75], suela), t.bul([-3.0, 0, 0.8], [3.0, 3.1, 0.85], suela)], suela, 0.8);
  t.caja([-3.1, 0, 0.55], [3.8, 5.6, 1.1], { mat: suela, tono: -0.04 });
  const mCaña = L === 'malla' ? 'ic_malla' : cuero;
  if (!placa) {
    t.masa([
      t.bul([-2.7, 0, 3.1], [2.8, 2.95, 2.4], cuero),
      t.bul([1.4, 0, 2.7], [5.0, 2.95, 2.0], cuero),
      t.bul([5.4, 0, 2.25], [2.6, 2.7, 1.65], cuero),
      t.hue([2.0, 0, 3.4], [-0.8, 0, 7.5], 2.4, 3.1, cuero),
      t.hue([cx + 0.2, 0, 5], [cx, 0, top - 3.8], 3.0, 3.55, mCaña),
    ], cuero, 1.6);
    t.cil([cx, 0, top - 4.4], [cx, 0, top], 3.55, 3.85, { mat: mCaña });
    // puntera: la costura en arco y los puntitos del ribete
    t.aro([3.2, 0, 1.4], 2.8, 0.2, { mat: e.base2, eje: 'x', desde: 0, hasta: 180, n: 6 });
    for (let k = 0; k < 8; k++) t.esf([-4 + k * 1.35, 3.08 - Math.max(0, k - 5) * 0.25, 1.55], 0.26, { mat: e.costura });
    if (L === 'tela') {
      t.cil([cx, 0, top - 2.6], [cx, 0, top + 0.6], 3.85, 4.3, { mat: e.base2 });
      if (e.ribete) t.cil([cx, 0, top + 0.3], [cx, 0, top + 0.9], 4.35, 4.4, { mat: e.borde });
      t.elip([cx, 0, top + 0.75], [3.4, 3.4, 0.5], { mat: 'ic_hueco' });
      t.cil([cx, 0, 7], [cx, 0, 7.8], 3.42, 3.42, { mat: e.borde });
      t.esf([cx + 0.5, 3.4, 7.4], 0.7, { mat: e.borde });
    } else {
      // la vuelta de la caña: piel o el cuero doblado
      if (e.forro) { for (let k = 0; k < 10; k++) { const a = rad(k * 36); t.elip([cx + Math.cos(a) * 3.7, Math.sin(a) * 3.7, top + 0.3 + (k % 2) * 0.2], [1.5, 1.5, 1.35], { mat: e.forro, rot: [k * 36, 0, 0] }); } }
      else { t.cil([cx, 0, top - 2.4], [cx, 0, top + 0.6], 3.85, 4.3, { mat: e.base2 }); if (e.ribete) t.cil([cx, 0, top - 2.5], [cx, 0, top - 2.0], 3.9, 3.9, { mat: e.borde }); }
      t.elip([cx, 0, top + (e.forro ? 0.95 : 0.65)], [2.9, 2.9, 0.45], { mat: 'ic_hueco' });
      // correas con hebilla en el costado que se ve
      const nCorreas = L === 'cuero' ? Math.min(3, 1 + Math.floor(e.n / 2)) : 2;
      for (let i = 0; i < nCorreas; i++) {
        const z = 6.4 + i * 2.8;
        t.cil([cx, 0, z], [cx, 0, z + 1.1], 3.5, 3.55, { mat: e.correa });
        t.caja([cx - 0.4, 3.6, z + 0.55], [1.7, 0.5, 1.6], { mat: e.hebilla });
        t.caja([cx - 0.4, 3.8, z + 0.55], [0.8, 0.3, 0.7], { mat: 'ic_hueco' });
        t.caja([cx - 1.6, 3.4, z + 0.55], [1.2, 0.5, 1.0], { mat: e.correa, tono: 0.06 });
      }
      // cordones al frente (cuero, hueso) o tachas (tachonado)
      if (L === 'cuero' || L === 'hueso') for (let i = 0; i < 3; i++) {
        const z = 6.2 + i * 2.1;
        t.cil([cx + 3.35, -1.3, z], [cx + 3.35, 1.3, z + 1.4], 0.3, 0.3, { mat: e.costura });
        t.cil([cx + 3.35, 1.3, z], [cx + 3.35, -1.3, z + 1.4], 0.3, 0.3, { mat: e.costura });
      }
      if (e.tachas) {
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) t.esf([cx - 1.6 + j * 1.6, 3.2 - Math.abs(j - 1) * 0.35, 7.0 + i * 2.6], 0.55, { mat: e.remache });
        for (let k = 0; k < 5; k++) t.esf([0.2 + k * 1.3, 2.75 - Math.max(0, k - 2) * 0.35, 3.3 - Math.max(0, k - 2) * 0.25], 0.5, { mat: e.remache });
      }
      if (L === 'malla') { arco(t, 3.6, 6.6, 2.9, 2.4, 1.0, { mat: 'ic_acero' }, 2.5, 1.6); t.poli([[6.4, 2.4, 1.0], [6.4, -2.4, 1.0], [6.4, 0, 2.6], [8.4, 0, 1.2]], { mat: 'ic_acero' }); }
      if (L === 'hueso') {
        // espinillera de hueso, garras en la punta y una púa
        t.elip([cx + 2.9, 0.4, 10], [1.3, 1.5, 4.4], { mat: 'ic_hueso' });
        t.esf([cx + 2.7, 0.4, 14.3], 1.2, { mat: 'ic_hueso' });
        for (const y of [-1.5, 0, 1.5]) t.cil([7.4, y, 1.9], [9.8, y * 1.25, 0.7], 0.62, 0.06, { mat: 'ic_hueso' });
        pua(t, [cx + 3, 1, 12], [1, 0.3, 0.7], 3.2, 0.65, 'ic_hueso');
      }
    }
  } else {
    // escarpe y greba de placas: lámina sobre lámina hacia la punta
    const pl = e.base;
    t.elip([-2.6, 0, 3.0], [2.8, 3.15, 2.5], { mat: pl, tono: -0.02 });
    for (let k = 0; k < 4; k++) arco(t, -1.2 + k * 1.75, 1.1 + k * 1.75, 3.25 - k * 0.12, 3.3 - k * 0.42, 0.95, { mat: pl, tono: k % 2 ? -0.05 : 0.04 }, 3.15 - k * 0.12, 3.0 - k * 0.42);
    t.poli([[6.0, 2.85, 0.95], [6.0, -2.85, 0.95], [6.0, 2.2, 2.4], [6.0, -2.2, 2.4], [6.0, 0, 2.75], [9.6, 0, 1.15], [8.6, 0, 1.9], [8.4, 1.0, 0.95], [8.4, -1.0, 0.95]], { mat: pl, tono: 0.03 });
    if (e.ribete) for (let k = 0; k < 4; k++) t.aro([-1.2 + k * 1.75, 0, 0.95], 3.22 - k * 0.12, 0.2, { mat: e.borde, eje: 'x', desde: 0, hasta: 180, n: 6 });
    // greba
    t.cil([cx, 0, 2.6], [cx, 0, top], 3.55, 4.05, { mat: pl });
    t.caja([cx + 3.75, 0, (3 + top) / 2], [0.9, 1.2, top - 3.4], { mat: pl, tono: 0.1 });
    t.cil([cx, 0, top - 0.6], [cx, 0, top + 0.5], 4.25, 4.35, { mat: e.borde });
    t.elip([cx, 0, top + 0.55], [3.3, 3.3, 0.4], { mat: 'ic_hueco' });
    if (e.ribete) t.cil([cx, 0, 9.4], [cx, 0, 10.2], 4.0, 4.0, { mat: e.borde, tono: -0.03 });
    // tobillera con remache
    t.esf([cx - 0.2, 3.3, 4.4], 1.65, { mat: pl, tono: 0.05 });
    t.esf([cx - 0.2, 4.85, 4.4], 0.5, { mat: e.remache });
    if (e.remaches) filaRemaches(t, [cx - 1.4, 3.75, 6.4], [cx - 1.4, 3.85, top - 1.6], 3, 0.42, e.remache);
    if (L === 'sagrado') {
      // alitas en el talón y la cruz de oro al frente
      for (let k = 0; k < 3; k++) t.elip([cx - 4.4 - k * 0.8, 2.0, top - 3.2 + k * 1.4], [2.9 - k * 0.45, 0.45, 0.95], { mat: k % 2 ? 'ic_oro' : 'ic_esmalte', rot: [20, 0, 35 + k * 12] });
      t.caja([cx + 4.2, 0, top - 4.6], [0.5, 0.6, 4.6], { mat: 'ic_oro' });
      t.caja([cx + 4.2, 0, top - 3.6], [0.5, 2.6, 0.6], { mat: 'ic_oro' });
    }
    if (L === 'oscuro') {
      pua(t, [cx + 3.9, 0, top - 1.8], [1, 0.25, 0.9], 4.2, 0.95, 'ic_hierro_negro');
      pua(t, [6.6, 0, 2.6], [0.8, 0, 1], 2.6, 0.7, 'ic_hierro_negro');
      pua(t, [cx - 1, 3.6, 8], [-0.4, 1, 0.5], 2.6, 0.6, 'ic_hierro_negro');
      if (e.luz) for (let k = 0; k < 3; k++) t.caja([cx + 4.25, 0.1, 6.3 + k * 2.5], [0.3, 0.8, 1.1], { mat: e.luz, tono: 0.1 });
    }
    if (L === 'legendario') for (let k = 0; k < 3; k++) t.caja([cx + 4.25, 0, 6.4 + k * 2.4], [0.3, 0.75, 1.3], { mat: e.luz!, tono: tonoLuz(e, k) });
  }
  // gema en el costado (nivel 4 y 5) y runas (5)
  if (e.n >= 4 || L === 'sagrado' || L === 'legendario') gemaEngastada(t, [cx - 0.3, placa ? 4.05 : 3.85, top - 3.2], 1.15, e, { engaste: L === 'oscuro' ? 'ic_hierro_negro' : 'ic_oro' });
  if (e.n >= 5 && !placa && e.luz) for (let k = 0; k < 2; k++) t.caja([cx + 1.0 + k * 0.2, 3.3, top - 6 - k * 1.6], [1.0, 0.3, 0.35], { mat: e.luz });
}
function botas(t: Taller, e: Estilo) {
  t.en([0, 0, 0], [0, -8, 0], () => {
    t.en([5, -7, 2.6], [30, 0, 0], () => bota(t, e));
    t.en([-2.5, 2, 0], [22, 0, 0], () => bota(t, e));
  });
}

// ------------------------------------------------------------------ utilidades de forma
/** Anillo de puntos (para poliedros): radio en x y en y, a la altura z. */
const anilloPts = (rx: number, ry: number, z: number, n = 10, fase = 0, cx = 0, cy = 0): V3[] => Array.from({ length: n }, (_, i) => { const a = rad(fase + (i * 360) / n); return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, z]; });
/** Casquete (domo convexo) de radio R y alto h sobre z0, estirado `kx` en x. */
function casquete(t: Taller, c: V3, R: number, h: number, o: OpI & { kx?: number; ky?: number }) {
  const kx = o.kx ?? 1, ky = o.ky ?? 1, pts: V3[] = [];
  for (const [f, z] of [[1, 0], [0.92, 0.38], [0.72, 0.72], [0.4, 0.94]] as [number, number][]) pts.push(...anilloPts(R * f * kx, R * f * ky, z * h, 10).map((q) => add(q, c)));
  pts.push(add(c, [0, 0, h]));
  t.poli(pts, o);
}
/** Material de metal de las joyas y adornos según línea y nivel. */
function metalJoya(e: Estilo): string {
  if (e.linea === 'oscuro') return 'ic_hierro_negro';
  if (e.linea === 'hueso') return 'ic_hueso';
  if (e.linea === 'sagrado' || e.linea === 'legendario') return 'ic_oro';
  return e.n >= 3 ? 'ic_oro' : e.n === 2 ? 'ic_plata' : 'ic_bronce';
}
/** Material de metal duro (llaves, jaulas, soportes). */
function metalDuro(e: Estilo): string {
  if (e.linea === 'oscuro') return 'ic_hierro_negro';
  if (e.linea === 'sagrado' || e.linea === 'legendario') return 'ic_oro';
  return e.n >= 4 ? 'ic_oro' : e.n === 3 ? 'ic_acero' : e.n === 2 ? 'ic_bronce' : 'ic_hierro';
}

// ------------------------------------------------------------------ pecho
function pecho(t: Taller, e: Estilo) {
  const L = e.linea;
  const duro = L === 'placas' || L === 'sagrado' || L === 'oscuro' || L === 'legendario';
  const blandoMat = L === 'malla' ? 'ic_malla' : duro ? (L === 'sagrado' ? tinte('#d8d0c0', 'tela') : L === 'oscuro' ? 'ic_malla' : L === 'legendario' ? 'ic_malla_oro' : 'ic_malla') : e.base;
  t.en([0, 0, 0], [16, -6, 0], () => {
    const comps: Comp[] = [
      t.bul([0, 0.3, 11], [8.0, 4.6, 5.8], blandoMat),
      t.bul([0, 0.2, 4.6], [6.4, 4.2, 5.4], blandoMat),
      t.hue([0, 0, -1], [0, 0, 3], 6.0, 6.3, blandoMat),
    ];
    for (const sx of [-1, 1]) {
      comps.push(t.bul([sx * 3.4, 2.0, 11.6], [3.8, 2.6, 3.6], blandoMat), t.bul([sx * 8.0, 0, 14.2], [3.4, 3.8, 3.0], blandoMat));
      if (!duro) comps.push(t.hue([sx * 8.6, 0, 13.6], [sx * 11.0, 0.6, L === 'tela' ? 4 : 7.5], 3.1, L === 'tela' ? 3.6 : 2.7, blandoMat));
    }
    if (L === 'tela' || L === 'malla') comps.push(t.hue([0, 0, 0], [0, 0, L === 'tela' ? -13 : -7], 6.3, L === 'tela' ? 8.8 : 7.6, blandoMat));
    if (L === 'tela') for (let k = -2; k <= 2; k++) { const a = rad(90 + k * 32); comps.push(t.hue([Math.cos(a) * 5.8, Math.sin(a) * 5.8, -1], [Math.cos(a) * 8.6, Math.sin(a) * 8.6, -13], 1.0, 1.7, blandoMat, 0.8)); }
    t.masa(comps, blandoMat, 2);
    // cuello
    t.elip([0, 0.3, 16.7], [3.6, 2.6, 1.0], { mat: 'ic_hueco' });
    if (L === 'tela') {
      // túnica: escote en V con ribete, faja y capucha caída atrás
      for (const sx of [-1, 1]) t.cil([sx * 3.6, 1.6, 16.4], [0, 4.7, 9], 0.55, 0.45, { mat: e.borde });
      t.cil([0, 0, 0.4], [0, 0, 2.2], 6.55, 6.6, { mat: e.correa });
      t.masa([t.hue([2.5, 5.5, 1.3], [3.2, 6.6, -6], 0.9, 0.6, e.correa), t.bul([2.2, 6.0, 1.3], [1.4, 1.0, 1.2], e.correa)], e.correa, 0.8);
      t.masa([t.bul([0, -4.2, 15.6], [5.6, 2.8, 2.6], e.base2)], e.base2, 1);
      if (e.ribete) t.aro([0, 0, -13], 8.75, 0.45, { mat: e.borde, n: 18 });
      if (e.filigrana) for (let k = 0; k < 5; k++) { const a = rad(60 + k * 15); t.esf([Math.cos(a) * 8.9, Math.sin(a) * 8.9, -11.6], 0.5, { mat: e.borde }); }
      if (e.luz) { t.poli([[0, 4.75, 12.5], [-1.2, 4.6, 10.6], [1.2, 4.6, 10.6], [0, 4.75, 8.8], [0, 5.3, 10.6]], { mat: e.luz, tono: tonoLuz(e) }); }
      if (e.n >= 4) gemaEngastada(t, [0, 4.9, 1.3], 1.1, e, { engaste: 'ic_oro' });
      return;
    }
    if (!duro) {
      if (L === 'malla') {
        // cota: cinturón de cuero, gorjal y faldón
        t.cil([0, 0, 0], [0, 0, 1.8], 6.55, 6.6, { mat: e.base2 });
        t.caja([0, 6.5, 0.9], [2.0, 0.6, 2.0], { mat: e.hebilla });
        t.cil([0, 0.2, 15.6], [0, 0.2, 17.6], 4.6, 3.9, { mat: e.n >= 3 ? 'ic_acero' : e.base2 });
        if (e.ribete) t.aro([0, 0.2, 17.5], 3.95, 0.35, { mat: e.borde, n: 14 });
        if (e.n >= 3) for (const sx of [-1, 1]) { casquete(t, [sx * 8.6, 0, 13.6], 4.2, 3.2, { mat: 'ic_acero', kx: 1.1, rot: [0, 0, sx * -28] }); }
        if (e.n >= 4) {
          // sobreveste con la cruz
          t.poli([[-3.6, 4.4, 14], [3.6, 4.4, 14], [-3.8, 4.6, -1], [3.8, 4.6, -1], [-3.4, 6.2, -7], [3.4, 6.2, -7], [-3.4, 5.8, 14], [3.4, 5.8, 14]], { mat: tinte(e.linea === 'malla' ? '#7a1f2b' : '#2f4f9a', 'tela') });
          t.caja([0, 6.2, 5], [1.2, 0.4, 9], { mat: 'ic_oro' }); t.caja([0, 6.2, 7.8], [5, 0.4, 1.2], { mat: 'ic_oro' });
        }
        return;
      }
      // jubón de cuero: cordones, costuras, cinturón, cuello de piel, faldones
      t.cil([0, 0, 0.2], [0, 0, 2.2], 6.55, 6.6, { mat: e.correa });
      t.caja([0, 6.45, 1.2], [2.2, 0.6, 2.2], { mat: e.hebilla }); t.caja([0, 6.75, 1.2], [1.1, 0.3, 1.1], { mat: e.correa });
      for (let k = 0; k < 4; k++) { const z = 12.8 - k * 2.4; t.cil([-0.9, 4.9, z], [0.9, 4.75, z - 1.6], 0.28, 0.28, { mat: e.costura }); t.cil([0.9, 4.9, z], [-0.9, 4.75, z - 1.6], 0.28, 0.28, { mat: e.costura }); }
      for (const sx of [-1, 1]) t.cil([sx * 4.6, 4.0, 14], [sx * 4.0, 4.3, 2.5], 0.22, 0.22, { mat: e.base2 });
      for (let k = -2; k <= 2; k++) { const a = rad(90 + k * 30); t.caja([Math.cos(a) * 6.4, Math.sin(a) * 6.4, -3], [3.0, 0.8, 5.4], { mat: k % 2 ? e.base2 : e.base, rot: [k * 30, 6, 0] }); }
      if (e.forro) for (let k = 0; k < 12; k++) { const a = rad(k * 30); t.elip([Math.cos(a) * 4.6, Math.sin(a) * 3.4, 16.4 + Math.abs(Math.sin(a)) * 0.2], [1.8, 1.6, 1.4], { mat: e.forro, rot: [k * 30, 0, 0] }); }
      if (e.n >= 3) for (const sx of [-1, 1]) { casquete(t, [sx * 8.4, 0, 13.4], 4.0, 3.0, { mat: e.base2, kx: 1.1, rot: [0, 0, sx * -26] }); if (e.ribete) t.aro([sx * 8.4, 0, 13.4], 4.1, 0.3, { mat: e.borde, rot: [0, 0, sx * -26], n: 12 }); }
      if (e.tachas) for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) for (let j = 0; j < 2; j++) t.esf([sx * (2.3 + j * 2.2), 4.75 - j * 0.6, 13 - i * 2.6], 0.5, { mat: e.remache });
      if (L === 'hueso') {
        for (let k = 0; k < 4; k++) for (const sx of [-1, 1]) t.aro([sx * 0.5, 0.5, 13 - k * 2.4], 5.0 - k * 0.3, 0.55, { mat: 'ic_hueso', desde: sx > 0 ? 10 : 100, hasta: sx > 0 ? 80 : 170, n: 4, rot: [0, 0, 0] });
        t.cil([0, 4.9, 14.5], [0, 4.9, 5], 0.7, 0.6, { mat: 'ic_hueso' });
        for (const sx of [-1, 1]) { casquete(t, [sx * 8.4, 0, 13.6], 3.8, 3.0, { mat: 'ic_hueso', rot: [0, 0, sx * -26] }); pua(t, [sx * 9.4, 0.5, 15.8], [sx * 0.5, 0.2, 1], 4.5, 0.75, 'ic_hueso'); }
      }
      if (e.n >= 4) gemaEngastada(t, [0, 6.6, 1.2], 0.9, e);
      return;
    }
    // ---- coraza de placas (placas, sagrado, oscuro, legendario)
    const pl = e.base;
    t.masa([t.bul([0, 1.0, 11.2], [7.6, 4.6, 5.6], pl), t.bul([0, 0.9, 5.4], [6.6, 4.4, 4.8], pl), t.bul([0, 0.6, 1.4], [6.4, 4.2, 2.2], pl)], pl, 2.6);
    t.caja([0, 5.3, 9.5], [0.9, 0.9, 10], { mat: pl, tono: 0.08, rot: [0, -4, 0] }); // arista
    // gorjal y hombreras de láminas
    t.cil([0, 0.4, 15.0], [0, 0.4, 17.6], 5.0, 4.0, { mat: pl, tono: 0.04 });
    t.elip([0, 0.4, 17.6], [3.5, 2.6, 0.5], { mat: 'ic_hueco' });
    for (const sx of [-1, 1]) {
      t.en([sx * 8.6, 0, 13.4], [0, 0, sx * -24], () => {
        casquete(t, [0, 0, 0], 4.8, 3.8, { mat: pl, kx: 1.15 });
        casquete(t, [sx * 0.8, 0, -2.0], 4.5, 2.6, { mat: pl, kx: 1.1, tono: -0.04 });
        casquete(t, [sx * 1.4, 0, -3.6], 4.0, 2.0, { mat: pl, kx: 1.05, tono: -0.07 });
        if (e.ribete) { t.aro([0, 0, 0.05], 4.85, 0.32, { mat: e.borde, n: 14, rot: [0, 0, 0] }); t.aro([sx * 0.8, 0, -1.95], 4.55, 0.28, { mat: e.borde, n: 14 }); }
        if (e.remaches) filaRemaches(t, [-2, 3.2, 2.2], [2, 3.2, 2.2], 3, 0.38, e.remache);
        if (e.puas) for (let k = 0; k < 3; k++) pua(t, [sx * (k - 1) * 1.6, 0, 3.2], [sx * 0.35, 0.1, 1], 4.5 - Math.abs(k - 1) * 1.2, 0.8, L === 'oscuro' ? 'ic_hierro_negro' : 'ic_hueso');
      });
    }
    // faldar de láminas
    for (let k = 0; k < 3; k++) t.cil([0, 0, -0.4 - k * 2.3], [0, 0, 1.4 - k * 2.3], 6.7 + k * 0.45, 6.5 + k * 0.45, { mat: pl, tono: k % 2 ? -0.05 : 0.02 });
    if (e.ribete) {
      t.aro([0, 0.4, 15.1], 5.0, 0.35, { mat: e.borde, n: 14 });
      t.aro([0, 0, -6.4], 7.6, 0.32, { mat: e.borde, n: 18 });
      for (const sx of [-1, 1]) t.cil([sx * 6.8, 2.4, 14.2], [sx * 4.0, 5.0, 6.2], 0.35, 0.3, { mat: e.borde });
    }
    if (e.remaches) for (const sx of [-1, 1]) filaRemaches(t, [sx * 5.2, 4.6, 3.2], [sx * 6.2, 3.8, 12], 3, 0.36, e.remache);
    if (L === 'sagrado') { t.caja([0, 5.9, 9.4], [1.3, 0.5, 8.4], { mat: 'ic_oro' }); t.caja([0, 5.9, 11.4], [6.2, 0.5, 1.3], { mat: 'ic_oro' }); t.poli([[-3.6, 5.6, -0.8], [3.6, 5.6, -0.8], [-3.2, 6.6, -10], [3.2, 6.6, -10], [-3.6, 4.6, -0.8], [3.6, 4.6, -0.8], [0, 6.9, -10.6]], { mat: tinte('#e8e0d0', 'tela') }); t.caja([0, 6.75, -5.5], [1.1, 0.4, 8.2], { mat: 'ic_oro', rot: [0, -7, 0] }); }
    if (L === 'oscuro' && e.luz) { for (const [x, z, l] of [[-2.2, 10.5, 3.4], [2.6, 7.4, 2.8], [-1.4, 5.2, 2.2]] as V3[]) t.caja([x, 5.15, z], [0.4, 0.4, l], { mat: e.luz, tono: 0.05, rot: [0, 0, 25 * Math.sign(x)] }); t.esf([0, 5.6, 12.8], 1.1, { mat: e.luz }); }
    if (L === 'legendario') { for (let k = 0; k < 3; k++) t.caja([-3.6 + k * 3.6, 5.05, 3.6], [1.6, 0.35, 0.45], { mat: e.luz!, tono: tonoLuz(e, k) }); t.aro([0, 5.0, 11.2], 2.2, 0.3, { mat: 'ic_oro', eje: 'y', n: 12 }); }
    if (e.n >= 4 || L === 'legendario' || L === 'sagrado') gemaEngastada(t, [0, 5.6, 11.4], 1.3, e, { engaste: L === 'oscuro' ? 'ic_hierro_negro' : 'ic_oro' });
    if (e.n >= 5 && e.luz && L === 'placas') for (let k = 0; k < 3; k++) t.caja([-3.6 + k * 3.6, 5.05, 3.6], [1.6, 0.35, 0.45], { mat: e.luz });
  });
}

// ------------------------------------------------------------------ cascos, capuchas y coronas
function capucha(t: Taller, e: Estilo) {
  const mat = e.linea === 'cuero' || e.linea === 'tachonado' || e.linea === 'hueso' ? e.base : e.linea === 'tela' ? e.base : e.linea === 'sagrado' ? tinte('#e0d8c8', 'tela') : e.linea === 'oscuro' ? tinte('#1c1620', 'tela') : e.linea === 'legendario' ? tinte('#5a1420', 'tela') : tinte('#4a4a52', 'tela');
  t.en([0, 0, 0], [24, -4, 0], () => {
    t.masa([
      t.bul([0, 0, 2], [6.2, 6.4, 6.8], mat),
      t.bul([0, -2.6, 6.8], [3.6, 4.2, 3.2], mat),
      t.hue([0, -4.2, 8.6], [0, -7.0, 11.0], 1.8, 0.4, mat),
      t.hue([0, -0.5, -4], [0, -0.6, -9.5], 7.0, 10.0, mat),
      t.bul([0, 2.4, -5.6], [8.4, 4.8, 3.4], mat),
    ], mat, 1.8);
    // la cara: un hueco oscuro con el borde del paño
    t.elip([0, 6.4, 0.6], [3.7, 3.2, 4.6], { mat: 'ic_hueco', resta: true });
    t.elip([0, 3.4, 0.6], [3.6, 1.4, 4.4], { mat: 'ic_hueco' });
    if (e.ribete) for (let k = 0; k < 14; k++) { const a = rad(k * 25.7); t.esf([Math.cos(a) * 4.05, 4.9 + Math.abs(Math.cos(a)) * 0.6, 0.6 + Math.sin(a) * 4.95], 0.42, { mat: e.borde }); }
    if (e.forro) for (let k = 0; k < 9; k++) { const a = rad(-80 + k * 20); t.elip([Math.cos(a) * 4.4, 5.2 - Math.abs(Math.sin(a)) * 0.8, 0.6 + Math.sin(a) * 5.0], [1.3, 1.3, 1.3], { mat: e.forro }); }
    const ojos = e.linea === 'oscuro' || e.linea === 'hueso' || e.linea === 'legendario' || e.n >= 5 ? e.luz ?? tinte(e.luzHex, 'luz') : null;
    if (ojos) for (const sx of [-1, 1]) t.elip([sx * 1.4, 4.6, 1.2], [0.75, 0.4, 0.45], { mat: ojos, tono: tonoLuz(e) });
    if (e.n >= 4) gemaEngastada(t, [0, 3.6, -4.8], 1.0, e, { engaste: metalJoya(e) });
    if (e.linea === 'hueso') for (const sx of [-1, 1]) t.masa([t.hue([sx * 4.2, 0, 5.5], [sx * 7.0, 0.6, 9.5], 1.2, 0.8, 'ic_hueso'), t.hue([sx * 7.0, 0.6, 9.5], [sx * 6.6, 2.0, 12.8], 0.8, 0.12, 'ic_hueso')], 'ic_hueso', 0.6);
  });
}
function casco(t: Taller, e: Estilo) {
  const L = e.linea;
  if (L === 'tela') return capucha(t, e);
  t.en([0, 0, 0], [26, -4, 0], () => {
    if (L === 'cuero' || L === 'tachonado') {
      // gorro de cuero con orejeras, banda y ribete de piel
      t.masa([t.bul([0, 0, 1.2], [6.2, 6.4, 6.6], e.base), t.bul([0, 2.2, 1.0], [5.0, 4.6, 5.2], e.base)], e.base, 1.4);
      t.elip([0, 0, -4.6], [5.9, 6.1, 1.6], { mat: 'ic_hueco', resta: true });
      t.elip([0, 0.6, -2.8], [5.4, 5.6, 0.8], { mat: 'ic_hueco' });
      for (const sx of [-1, 1]) t.masa([t.bul([sx * 5.6, 0.6, -3.8], [1.2, 2.6, 3.8], e.base2)], e.base2, 1);
      t.cil([0, 0, 0.6], [0, 0, 2.0], 6.25, 6.2, { mat: e.n >= 3 ? e.borde : e.base2 });
      for (const sx of [-1, 1]) t.cil([sx * 1.4, 0, 1.6], [sx * 1.4, 0, 7.6], 0.35, 0.35, { mat: e.base2, rot: [0, 0, 0] });
      t.masa([t.hue([0, -6.4, 1.6], [0, 6.4, 1.6], 0.5, 0.5, e.base2), t.hue([0, 0, 7.6], [0, 6.0, 4.2], 0.45, 0.45, e.base2), t.hue([0, 0, 7.6], [0, -6.0, 4.2], 0.45, 0.45, e.base2)], e.base2, 0.3);
      if (e.forro) for (let k = 0; k < 12; k++) { const a = rad(k * 30); t.elip([Math.cos(a) * 6.2, Math.sin(a) * 6.4, -0.6], [1.6, 1.6, 1.3], { mat: e.forro, rot: [k * 30, 0, 0] }); }
      if (e.tachas) for (let i = 0; i < 2; i++) for (let k = -2; k <= 2; k++) { const a = rad(90 + k * 28), r = 6.1 - i * 1.5; t.esf([Math.cos(a) * r, Math.sin(a) * r, 3.4 + i * 2.6], 0.5, { mat: e.remache }); }
      if (e.n >= 3) t.caja([0, 6.5, -1.6], [1.0, 0.7, 4.2], { mat: e.borde });
      if (e.n >= 4) gemaEngastada(t, [0, 6.6, 1.3], 0.95, e);
      return;
    }
    if (L === 'malla') {
      // yelmo cónico de segmentos con nasal y almófar de malla
      const pts: V3[] = [...anilloPts(5.7, 5.9, -0.8, 8, 22.5), ...anilloPts(4.9, 5.1, 3.4, 8, 22.5), [0, 0, 8.6]];
      t.poli(pts, { mat: 'ic_acero' });
      for (let k = 0; k < 4; k++) { const a = rad(22.5 + k * 90 + 45); t.cil([Math.cos(a) * 5.75, Math.sin(a) * 5.95, -0.7], [0, 0, 8.4], 0.4, 0.3, { mat: e.borde }); }
      t.cil([0, 0, -1.4], [0, 0, 0.2], 5.95, 5.9, { mat: e.borde });
      t.caja([0, 6.1, -3.0], [1.1, 0.8, 5.0], { mat: 'ic_acero', tono: 0.08 });
      t.masa([t.bul([0, -0.8, -4.4], [6.6, 6.4, 4.6], 'ic_malla'), t.bul([0, -1.0, -8.2], [7.6, 6.4, 2.4], 'ic_malla')], 'ic_malla', 1.4);
      t.elip([0, 4.2, -4.0], [3.3, 3.0, 3.4], { mat: 'ic_hueco', resta: true });
      t.elip([0, 2.6, -4.0], [3.2, 1.2, 3.2], { mat: 'ic_hueco' });
      if (e.remaches) filaRemaches(t, [-4.5, 3.9, -0.6], [4.5, 3.9, -0.6], 5, 0.38, e.remache);
      if (e.n >= 4) gemaEngastada(t, [0, 5.8, 1.2], 0.85, e);
      if (e.n >= 5 && e.luz) t.esf([0, 0, 9.2], 0.9, { mat: e.luz });
      return;
    }
    if (L === 'hueso') {
      // cráneo de bestia con cuernos de carnero
      const h = 'ic_hueso';
      t.masa([t.bul([0, -0.6, 2.4], [5.8, 6.4, 5.6], h), t.bul([0, 3.8, 0.4], [4.8, 3.4, 3.6], h), t.bul([0, 6.2, -2.4], [2.6, 2.4, 2.6], h), t.bul([0, 3.6, 3.4], [5.0, 2.2, 1.4], h)], h, 1.4);
      for (const sx of [-1, 1]) { t.elip([sx * 2.1, 6.0, 1.5], [1.25, 1.2, 1.15], { mat: 'ic_hueco', resta: true }); t.elip([sx * 2.1, 5.2, 1.5], [1.1, 0.6, 1.0], { mat: e.n >= 4 ? (e.luz ?? tinte(e.luzHex, 'luz')) : 'ic_hueco' }); }
      t.elip([0, 8.3, -2.2], [0.7, 0.8, 0.8], { mat: 'ic_hueco', resta: true });
      for (let k = -2; k <= 2; k++) t.cil([k * 0.9, 7.6 - Math.abs(k) * 0.5, -4.2], [k * 0.95, 7.8 - Math.abs(k) * 0.5, -5.8], 0.42, 0.08, { mat: h });
      for (const sx of [-1, 1]) {
        const pts: V3[] = []; for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI * 1.5; pts.push([sx * (5.2 + i * 0.55), -1 - Math.sin(a) * 4.6, 3.6 + Math.cos(a) * 4.2 - 2.6]); }
        t.masa(pts.slice(1).map((q, i) => t.hue(pts[i], q, 1.7 - i * 0.22, 1.5 - i * 0.22, tinte('#8a7a5a', 'mate'))), tinte('#8a7a5a', 'mate'), 0.6);
      }
      if (e.n >= 3) t.cil([0, 0, -2.8], [0, 0, -1.6], 6.0, 6.1, { mat: e.correa });
      return;
    }
    // yelmos de placas (placas, sagrado, oscuro, legendario)
    const pl = e.base;
    const pts: V3[] = [...anilloPts(5.9, 6.1, -5.2, 10), ...anilloPts(6.2, 6.4, 0, 10), ...anilloPts(5.5, 5.7, 4.4, 10), ...anilloPts(3.4, 3.6, 7.2, 10), [0, -0.4, 8.3]];
    t.poli(pts, { mat: pl });
    // visera en pico y ranura de los ojos
    t.poli([[-4.4, 4.0, 2.6], [4.4, 4.0, 2.6], [-4.0, 4.4, -4.8], [4.0, 4.4, -4.8], [0, 7.6, -0.8], [0, 6.8, 2.5], [0, 6.4, -4.6], [-3.0, 5.6, 1.2], [3.0, 5.6, 1.2]], { mat: pl, tono: 0.05 });
    t.caja([0, 6.4, 1.15], [8.4, 4.0, 0.9], { mat: 'ic_hueco', resta: true });
    const ojos = (e.n >= 5 || L === 'oscuro') && e.luz ? e.luz : 'ic_hueco';
    t.caja([0, 4.6, 1.15], [7.6, 1.0, 0.85], { mat: ojos, tono: tonoLuz(e) });
    for (let k = 0; k < 4; k++) for (let j = 0; j < 2; j++) t.caja([1.0 + k * 0.85, 6.4 - k * 0.45, -2.0 - j * 1.1], [0.35, 3, 0.45], { mat: 'ic_hueco', resta: true });
    // cresta, gola y bordes
    t.poli([[0, 4.0, 6.6], [0, -5.6, 5.2], [0, -1, 9.0], [0, 2.8, 8.0], [0.5, 0, 7.6], [-0.5, 0, 7.6], [0.5, -4, 5.6], [-0.5, -4, 5.6]], { mat: e.ribete ? e.borde : pl, tono: 0.06 });
    t.cil([0, 0, -5.2], [0, 0, -7.2], 6.0, 6.9, { mat: pl, tono: -0.05 });
    if (e.ribete) { t.aro([0, 0, -5.2], 5.95, 0.35, { mat: e.borde, n: 16 }); t.aro([0, 0, -7.2], 6.9, 0.32, { mat: e.borde, n: 18 }); }
    if (e.remaches) for (let k = 0; k < 6; k++) { const a = rad(30 + k * 24); t.esf([Math.cos(a) * 6.1, Math.sin(a) * 6.3, -4.2], 0.42, { mat: e.remache }); }
    if (L === 'sagrado') {
      for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) t.elip([sx * (6.4 + k * 0.4), -1.6 - k * 0.9, 3.4 + k * 1.5], [0.5, 3.8 - k * 0.5, 1.1], { mat: k % 2 ? 'ic_oro' : 'ic_esmalte', rot: [0, 30 + k * 10, sx * 10] });
      t.caja([0, 6.85, -1.6], [0.9, 0.6, 5.6], { mat: 'ic_oro', rot: [0, -20, 0] });
      if (e.luz) t.aro([0, -0.5, 10.6], 4.4, 0.35, { mat: e.luz, n: 16 });
    }
    if (L === 'oscuro') {
      for (const sx of [-1, 1]) t.masa([t.hue([sx * 5.4, 0.5, 2.6], [sx * 9.0, 2.0, 5.6], 1.5, 1.0, 'ic_hierro_negro'), t.hue([sx * 9.0, 2.0, 5.6], [sx * 9.6, 3.6, 10.4], 1.0, 0.1, 'ic_hierro_negro')], 'ic_hierro_negro', 0.7);
      for (let k = 0; k < 3; k++) pua(t, [0, -1 - k * 2.2, 8.0 - k * 1.0], [0, -0.4, 1], 3.2 - k * 0.6, 0.7, 'ic_hierro_negro');
    }
    if (L === 'legendario') for (let k = 0; k < 7; k++) { const a = rad(30 + k * 20); t.cil([Math.cos(a) * 5.8, Math.sin(a) * 6.0, 4.4], [Math.cos(a) * 5.0, Math.sin(a) * 5.2, 7.6 + (k % 2) * 1.4], 0.65, 0.15, { mat: 'ic_oro' }); }
    if (e.filigrana && L === 'placas') t.masa([t.hue([0, 0.5, 8.0], [0, -4.5, 9.5], 1.2, 1.6, tinte('#a01e24', 'tela')), t.hue([0, -4.5, 9.5], [0, -8.5, 5.5], 1.6, 0.6, tinte('#a01e24', 'tela'))], tinte('#a01e24', 'tela'), 1);
    if (e.n >= 4 || L === 'sagrado' || L === 'legendario') gemaEngastada(t, [0, 6.6, 3.6], 0.9, e, { engaste: L === 'oscuro' ? 'ic_hierro_negro' : 'ic_oro', normal: [0, 0, 0] });
  });
}
function corona(t: Taller, e: Estilo) {
  const met = e.linea === 'oscuro' ? 'ic_hierro_negro' : e.linea === 'hueso' ? 'ic_hueso' : e.n <= 1 && e.linea !== 'legendario' && e.linea !== 'sagrado' ? 'ic_bronce' : e.n === 2 && e.linea !== 'legendario' && e.linea !== 'sagrado' ? 'ic_plata' : 'ic_oro';
  t.en([0, 0, 0], [12, 34, 0], () => {
    if (e.n >= 3 && e.linea !== 'oscuro' && e.linea !== 'hueso') t.masa([t.bul([0, 0, 2.4], [5.6, 5.6, 4.2], tinte(e.linea === 'sagrado' ? '#e8e0d0' : '#7a1020', 'tela'))], tinte(e.linea === 'sagrado' ? '#e8e0d0' : '#7a1020', 'tela'), 1);
    else t.cil([0, 0, 0.4], [0, 0, 0.5], 5.6, 5.6, { mat: 'ic_hueco' });
    t.cil([0, 0, 0], [0, 0, 3.0], 6.4, 6.5, { mat: met });
    t.cil([0, 0, -0.5], [0, 0, 3.6], 5.7, 5.7, { mat: met, resta: true });
    if (e.n >= 3 && e.linea !== 'oscuro' && e.linea !== 'hueso') t.masa([t.bul([0, 0, 2.4], [5.6, 5.6, 4.2], tinte(e.linea === 'sagrado' ? '#e8e0d0' : '#7a1020', 'tela'))], tinte(e.linea === 'sagrado' ? '#e8e0d0' : '#7a1020', 'tela'), 1);
    t.aro([0, 0, 0.1], 6.55, 0.4, { mat: met, n: 18 });
    t.aro([0, 0, 2.95], 6.55, 0.4, { mat: met, n: 18 });
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = rad(i * (360 / n) + 22.5), c: V3 = [Math.cos(a) * 6.1, Math.sin(a) * 6.1, 2.6], alto = i % 2 ? 3.4 : 5.8;
      if (e.linea === 'hueso') t.cil(c, add(c, [Math.cos(a) * 1.4, Math.sin(a) * 1.4, alto + 1]), 1.0, 0.1, { mat: 'ic_hueso' });
      else if (e.linea === 'oscuro') t.cil(c, add(c, [Math.cos(a) * 0.6, Math.sin(a) * 0.6, alto + 1.4]), 0.9, 0.05, { mat: met });
      else {
        const u: V3 = [-Math.sin(a), Math.cos(a), 0];
        t.poli([add(c, u, 1.5), add(c, u, -1.5), add(add(c, u, 1.3), [Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0]), add(add(c, u, -1.3), [Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0]), add(c, [0, 0, alto])], { mat: met });
        t.esf(add(c, [0, 0, alto + 0.5]), i % 2 ? 0.6 : 0.85, { mat: i % 2 ? met : e.n >= 4 ? 'ic_plata' : met });
      }
    }
    // gemas del aro
    const colores = [e.gemaHex, '#2f62e6', '#1fb35e', e.gemaHex];
    for (let i = 0; i < 8; i++) {
      const a = rad(i * 45 + 22.5), c: V3 = [Math.cos(a) * 6.55, Math.sin(a) * 6.55, 1.5];
      if (Math.sin(a) < -0.2) continue;
      t.en(c, [i * 45 + 22.5 - 90, 0, 0], () => brillante(t, [0, 0.2, 0], i % 2 ? 0.75 : 1.0, i % 2 ? tinte(colores[(i >> 1) % 4], 'gema') : e.gema, [-90, 0, 0]));
    }
    if (e.luz && (e.linea === 'sagrado' || e.linea === 'legendario' || e.n >= 5)) t.aro([0, 0, 11], 4.0, 0.3, { mat: e.luz, n: 16, tono: tonoLuz(e) });
  });
}

// ------------------------------------------------------------------ guantes
function guante(t: Taller, e: Estilo, lado: 1 | -1) {
  const L = e.linea, duro = L === 'placas' || L === 'sagrado' || L === 'oscuro' || L === 'legendario';
  const mano = L === 'malla' ? tinte('#4a2c18', 'cuero') : duro ? (L === 'sagrado' ? tinte('#d8cbb0', 'cuero') : L === 'legendario' ? tinte('#4a1a1e', 'cuero') : tinte('#2a2020', 'cuero')) : e.base;
  const dorso = L === 'malla' ? 'ic_malla' : duro ? e.base : e.base;
  const comps: Comp[] = [t.bul([0, 0, 9.6], [3.5, 1.7, 3.6], mano), t.bul([0, 0.6, 10.2], [3.4, 1.4, 3.2], dorso)];
  for (let i = 0; i < 4; i++) {
    const x = -2.4 + i * 1.6, largo = 5.6 - Math.abs(i - 1.3) * 0.8;
    comps.push(t.hue([x, 0.2, 12.4], [x * 1.08, 0.9, 12.4 + largo], 0.95, 0.78, mano));
  }
  comps.push(t.hue([lado * 3.0, 0.3, 8.6], [lado * 4.9, 1.2, 11.6], 1.15, 0.95, mano), t.hue([lado * 4.9, 1.2, 11.6], [lado * 5.2, 2.0, 13.8], 0.95, 0.8, mano));
  t.masa(comps, mano, 1.0);
  // puño (manopla abierta hacia abajo)
  const puno = duro ? e.base : L === 'malla' ? 'ic_acero' : L === 'tela' ? e.base2 : e.base2;
  t.cil([0, 0, 0], [0, 0.2, 7.2], 4.3, 3.1, { mat: puno });
  t.elip([0, 0, 0], [4.0, 4.0, 0.3], { mat: 'ic_hueco' });
  if (e.ribete) t.aro([0, 0, 0.2], 4.3, 0.35, { mat: e.borde, n: 14 });
  if (duro) {
    // láminas de los dedos, dorso y nudillos
    for (let i = 0; i < 4; i++) { const x = -2.4 + i * 1.6, largo = 5.6 - Math.abs(i - 1.3) * 0.8; for (let k = 0; k < 3; k++) { const z0 = 12.6 + k * largo / 3; t.cil([x * 1.03, 0.45 + k * 0.2, z0], [x * 1.05, 0.55 + k * 0.2, z0 + largo / 3 - 0.3], 1.05, 0.95, { mat: e.base, tono: k % 2 ? -0.05 : 0.03 }); } }
    t.elip([0, 1.3, 10.2], [3.6, 1.2, 3.4], { mat: e.base, tono: 0.04 });
    t.caja([0, 1.7, 12.4], [6.6, 1.3, 1.3], { mat: e.base, tono: 0.08 });
    for (let k = 0; k < 2; k++) t.cil([0, 0.2, 5.6 + k * 1.3], [0, 0.3, 7.0 + k * 1.3], 3.25 - k * 0.1, 3.3 - k * 0.1, { mat: e.base, tono: k ? 0.05 : -0.03 });
    if (e.ribete) t.caja([0, 2.4, 12.4], [6.4, 0.3, 0.4], { mat: e.borde });
    if (e.remaches) filaRemaches(t, [-2.4, 2.4, 12.4], [2.4, 2.4, 12.4], 4, 0.36, e.remache);
    if (e.puas) for (let i = 0; i < 4; i++) pua(t, [-2.4 + i * 1.6, 2.1, 12.4], [0, 1, 0.3], 2.4, 0.5, L === 'oscuro' ? 'ic_hierro_negro' : 'ic_hueso');
    if (L === 'oscuro') for (let i = 0; i < 4; i++) { const x = -2.4 + i * 1.6, largo = 5.6 - Math.abs(i - 1.3) * 0.8; t.cil([x * 1.08, 1.0, 12.2 + largo], [x * 1.1, 2.2, 13.4 + largo], 0.6, 0.05, { mat: 'ic_hierro_negro' }); }
    if (L === 'oscuro' && e.luz) t.caja([0, 2.1, 9.6], [0.4, 0.4, 3], { mat: e.luz });
    if (L === 'legendario') for (let k = 0; k < 2; k++) t.caja([-1.2 + k * 2.4, 2.25, 9.4], [0.4, 0.3, 2.4], { mat: e.luz!, tono: tonoLuz(e, k) });
    if (e.n >= 4 || L === 'sagrado' || L === 'legendario') gemaEngastada(t, [0, 3.0, 4.6], 0.95, e, { engaste: L === 'oscuro' ? 'ic_hierro_negro' : 'ic_oro' });
  } else {
    // costuras del dorso, correa en la muñeca, piel o tachas
    for (let i = 0; i < 3; i++) t.cil([-1.6 + i * 1.6, 1.85, 7.8], [-1.8 + i * 1.8, 1.75, 12.2], 0.2, 0.2, { mat: e.costura });
    t.cil([0, 0.1, 6.6], [0, 0.1, 7.8], 3.25, 3.25, { mat: e.correa });
    t.caja([lado * -1.6, 3.2, 7.2], [1.4, 0.5, 1.4], { mat: e.hebilla });
    if (e.forro) for (let k = 0; k < 10; k++) { const a = rad(k * 36); t.elip([Math.cos(a) * 4.0, Math.sin(a) * 4.0, 0.6], [1.5, 1.5, 1.3], { mat: e.forro, rot: [k * 36, 0, 0] }); }
    if (e.tachas) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) t.esf([-1.6 + i * 1.6, 2.3, 9 + j * 2.4], 0.45, { mat: e.remache });
    if (L === 'malla') for (let i = 0; i < 4; i++) t.esf([-2.4 + i * 1.6, 1.5, 12.6], 0.75, { mat: 'ic_acero' });
    if (L === 'hueso') for (let i = 0; i < 4; i++) { const x = -2.4 + i * 1.6, largo = 5.6 - Math.abs(i - 1.3) * 0.8; t.elip([x, 1.6, 12.6], [0.75, 0.6, 0.75], { mat: 'ic_hueso' }); t.cil([x * 1.08, 0.9, 12.0 + largo], [x * 1.1, 2.0, 13.8 + largo], 0.62, 0.06, { mat: 'ic_hueso' }); }
    if (L === 'tela' && e.ribete) t.aro([0, 0.1, 3.4], 3.75, 0.35, { mat: e.borde, n: 14 });
    if (e.n >= 4) gemaEngastada(t, [0, 3.0, 4.0], 0.9, e, { engaste: metalJoya(e) });
  }
}
function guantes(t: Taller, e: Estilo) {
  t.en([0, 0, 0], [0, -14, 0], () => {
    t.en([4.6, -3, 1.2], [-18, 0, -12], () => guante(t, e, -1));
    t.en([-4.6, 2, 0], [16, 0, 10], () => guante(t, e, 1));
  });
}

// ------------------------------------------------------------------ cinturón
function cinturon(t: Taller, e: Estilo) {
  const L = e.linea, banda = L === 'tela' ? e.base : L === 'malla' || L === 'placas' || L === 'sagrado' || L === 'oscuro' || L === 'legendario' ? blando(e) : e.base;
  const rx = 10.5, ry = 6.5, alto = L === 'tela' ? 3.6 : 3.2;
  t.en([0, 0, 0], [8, 48, 0], () => {
    const n = 22, gap = 0.55; // hueco al frente (la hebilla)
    for (let i = 0; i < n; i++) {
      const a0 = rad(90 + gap * 57.3 / 1.6 + (i * (360 - gap * 57.3 * 1.25)) / n), a1 = rad(90 + gap * 57.3 / 1.6 + ((i + 1.05) * (360 - gap * 57.3 * 1.25)) / n);
      const p0: V3 = [Math.cos(a0) * rx, Math.sin(a0) * ry, 0], p1: V3 = [Math.cos(a1) * rx, Math.sin(a1) * ry, 0];
      const m = mez(p0, p1, 0.5), d = add(p1, p0, -1), g = Math.atan2(d[1], d[0]) * 180 / Math.PI;
      t.caja(m, [Math.hypot(d[0], d[1]) + 0.05, 0.75, alto], { mat: banda, rot: [g, 0, 0], tono: (i % 3) * 0.015 });
      const plancha = L === 'placas' || L === 'sagrado' || L === 'oscuro' || L === 'legendario' || (L === 'hueso' && i % 2 === 0);
      if (plancha && i % 2 === 0) {
        const out: V3 = nor([Math.cos((a0 + a1) / 2) / rx, Math.sin((a0 + a1) / 2) / ry, 0]);
        t.caja(add(m, out, 0.5), [Math.hypot(d[0], d[1]) * 1.6, 0.55, alto + 0.8], { mat: L === 'hueso' ? 'ic_hueso' : e.base, rot: [g, 0, 0] });
        if (e.remaches) t.esf(add(m, out, 0.95), 0.4, { mat: e.remache });
      }
      if (e.tachas && i % 2) { const out: V3 = nor([Math.cos((a0 + a1) / 2) / rx, Math.sin((a0 + a1) / 2) / ry, 0]); t.esf(add(m, out, 0.4), 0.5, { mat: e.remache }); }
      if ((L === 'cuero' || L === 'hueso' || L === 'tela') && e.n >= 2) { const out: V3 = nor([Math.cos((a0 + a1) / 2) / rx, Math.sin((a0 + a1) / 2) / ry, 0]); for (const z of [-1.1, 1.1]) t.caja(add(add(m, out, 0.38), [0, 0, z]), [Math.hypot(d[0], d[1]) * 0.6, 0.1, 0.18], { mat: e.costura, rot: [g, 0, 0] }); }
    }
    // hebilla al frente, con la punta del cinto que sale
    const hb = L === 'tela' ? null : e.hebilla;
    if (hb) {
      t.en([0, ry + 0.5, 0], [0, 0, 0], () => {
        const W = 4.6, H = alto + 1.8, g = 0.85;
        t.caja([-W / 2 + g / 2, 0, 0], [g, 0.9, H], { mat: hb }); t.caja([W / 2 - g / 2, 0, 0], [g, 0.9, H], { mat: hb });
        t.caja([0, 0, H / 2 - g / 2], [W, 0.9, g], { mat: hb }); t.caja([0, 0, -H / 2 + g / 2], [W, 0.9, g], { mat: hb });
        t.caja([0.4, 0.35, 0], [W - 1.2, 0.4, alto], { mat: banda, tono: 0.05 });
        t.caja([-0.3, 0.6, 0], [W * 0.8, 0.4, 0.5], { mat: hb, tono: 0.08 });
        t.caja([W / 2 + 2.2, 0.2, 0], [4.4, 0.6, alto], { mat: banda, rot: [8, 0, -8] });
        if (L === 'hueso') t.masa([t.bul([0, 1.0, 0], [2.2, 1.4, 2.4], 'ic_hueso')], 'ic_hueso', 1);
        if (e.n >= 4 || L === 'legendario' || L === 'sagrado') gemaEngastada(t, [0, 1.0, 0], 1.05, e, { engaste: hb });
      });
    } else {
      // faja: nudo y dos colas
      t.masa([t.bul([0, ry + 0.4, 0], [2.2, 1.2, 2.2], e.base), t.hue([0.4, ry + 0.9, -0.6], [1.6, ry + 2.6, -7], 1.3, 1.6, e.base), t.hue([-0.4, ry + 0.9, -0.6], [-1.8, ry + 2.2, -6], 1.2, 1.5, e.base)], e.base, 1.2);
      if (e.ribete) for (const sx of [-1, 1]) t.aro([sx * 1.7, ry + 2.4, -6.6], 1.5, 0.3, { mat: e.borde, n: 8 });
    }
    // bolsa de cuero colgando a un costado
    const ap = rad(28), pc: V3 = [Math.cos(ap) * (rx + 1.2), Math.sin(ap) * (ry + 1.2), -1.2];
    t.en(pc, [-62, 0, 0], () => {
      const bm = L === 'tela' ? e.base2 : tinte('#5a3a22', 'cuero');
      t.masa([t.bul([0, 0, -1], [2.8, 1.6, 3.0], bm)], bm, 1);
      t.poli([[-2.7, 1.5, 2.0], [2.7, 1.5, 2.0], [-2.6, 1.9, -0.6], [2.6, 1.9, -0.6], [0, 2.2, -1.6], [-2.7, 0.6, 2.2], [2.7, 0.6, 2.2]], { mat: bm, tono: 0.06 });
      t.esf([0, 2.3, -1.0], 0.55, { mat: e.hebilla });
    });
    if (e.n >= 3) {
      // un frasco en el cinto
      const av = rad(150), vc: V3 = [Math.cos(av) * (rx + 0.9), Math.sin(av) * (ry + 0.9), 0];
      t.esf(add(vc, [0, 0, -0.2]), 1.9, { mat: tinte('#c02030', 'liquido') });
      t.cil(add(vc, [0, 0, 1.4]), add(vc, [0, 0, 3.2]), 0.7, 0.7, { mat: 'ic_vidrio' });
      t.cil(add(vc, [0, 0, 3.0]), add(vc, [0, 0, 3.9]), 0.75, 0.8, { mat: 'ic_corcho' });
    }
    if (L === 'oscuro') for (let k = 0; k < 5; k++) { const a = rad(-150 + k * 30); pua(t, [Math.cos(a) * (rx + 0.6), Math.sin(a) * (ry + 0.6), 0], [Math.cos(a) / rx, Math.sin(a) / ry, 0.4], 2.4, 0.55, 'ic_hierro_negro'); }
    if (e.luz && L !== 'tela') for (let k = 0; k < 3; k++) { const a = rad(200 + k * 40); t.caja([Math.cos(a) * (rx + 1.05), Math.sin(a) * (ry + 1.05), 0], [1.2, 0.3, 0.5], { mat: e.luz, rot: [Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx) * 180 / Math.PI, 0, 0], tono: tonoLuz(e, k) }); }
  });
}

// ------------------------------------------------------------------ hombreras
function hombrera(t: Taller, e: Estilo, lado: 1 | -1) {
  const L = e.linea, blanda = L === 'tela' || L === 'cuero' || L === 'tachonado';
  const m = L === 'hueso' ? 'ic_hueso' : L === 'malla' ? 'ic_acero' : e.base;
  casquete(t, [0, 0, 0], 5.6, 4.6, { mat: m, kx: 1.12 });
  casquete(t, [lado * 1.0, 0.2, -2.4], 5.4, 3.2, { mat: m, kx: 1.08, tono: -0.05 });
  casquete(t, [lado * 1.8, 0.4, -4.4], 4.9, 2.6, { mat: m, kx: 1.04, tono: -0.09 });
  if (L === 'malla') t.masa([t.bul([lado * 0.6, 0, -5.4], [5.6, 5.0, 2.4], 'ic_malla')], 'ic_malla', 1);
  if (e.ribete || blanda) for (const [x, z, r] of [[0, 0.02, 5.65], [lado * 1.0, -2.38, 5.45], [lado * 1.8, -4.38, 4.95]] as V3[]) t.aro([x, 0, z], r, 0.32, { mat: blanda && !e.ribete ? e.base2 : e.borde, n: 16, rot: [0, 0, 0] });
  if (e.forro) for (let k = 0; k < 9; k++) { const a = rad(200 + k * 20); t.elip([Math.cos(a) * 6.0 - lado * 0.4, Math.sin(a) * 5.2 + 0.2, 0.2], [1.5, 1.5, 1.5], { mat: e.forro }); }
  if (e.remaches) for (let k = 0; k < 5; k++) { const a = rad(40 + k * 25); t.esf([Math.cos(a) * 5.1, Math.sin(a) * 4.6, 1.0], 0.4, { mat: e.remache }); }
  if (e.tachas) for (let k = 0; k < 6; k++) { const a = rad(30 + k * 24); t.esf([Math.cos(a) * 3.6, Math.sin(a) * 3.2, 3.2], 0.5, { mat: e.remache }); }
  if (L === 'hueso') { pua(t, [0, 0, 3.6], [lado * 0.4, 0, 1], 6, 1.2, 'ic_hueso'); pua(t, [lado * -2.2, 1.0, 2.6], [lado * -0.2, 0.2, 1], 4, 0.9, 'ic_hueso'); }
  if (L === 'oscuro') for (let k = 0; k < 3; k++) pua(t, [lado * (k - 1) * 1.8, 0, 3.8 - Math.abs(k - 1) * 0.6], [lado * 0.3 * (k - 1), 0, 1], 5.6 - Math.abs(k - 1) * 1.5, 1.0, 'ic_hierro_negro');
  if (L === 'oscuro' && e.luz) t.caja([0, 4.2, 1.6], [3, 0.4, 0.4], { mat: e.luz });
  if (L === 'sagrado') { for (let k = 0; k < 3; k++) t.elip([lado * -1.2, -1.2 - k * 1.0, 3.6 + k * 1.6], [0.5, 3.0 - k * 0.5, 1.0], { mat: k % 2 ? 'ic_oro' : 'ic_esmalte', rot: [0, 35 + k * 10, lado * 8] }); }
  if (L === 'legendario') { t.aro([0, 0, 2.0], 3.6, 0.3, { mat: e.luz!, n: 12, tono: tonoLuz(e) }); }
  if (e.n >= 4 || L === 'sagrado' || L === 'legendario') gemaEngastada(t, [0, 3.6, 2.8], 1.0, e, { engaste: L === 'oscuro' ? 'ic_hierro_negro' : 'ic_oro', normal: [0, 30, 0] });
}
function hombreras(t: Taller, e: Estilo) {
  t.en([0, 0, 0], [0, 12, 0], () => {
    t.en([5.6, -3, 1.8], [-14, 0, -18], () => hombrera(t, e, 1));
    t.en([-5.6, 2, 0], [14, 0, 18], () => hombrera(t, e, -1));
  });
}

// ------------------------------------------------------------------ grebas (piernas)
function grebas(t: Taller, e: Estilo) {
  const L = e.linea, duro = L === 'placas' || L === 'sagrado' || L === 'oscuro' || L === 'legendario';
  const tela = L === 'malla' ? 'ic_malla' : duro ? (L === 'sagrado' ? tinte('#d8d0c0', 'tela') : 'ic_malla') : e.base;
  t.en([0, 0, 0], [18, -6, 0], () => {
    const comps: Comp[] = [t.hue([0, 0, 22], [0, 0, 19.5], 6.8, 6.9, tela)];
    for (const sx of [-1, 1]) comps.push(t.hue([sx * 3.4, 0, 19.5], [sx * 3.9, 0.6, 10.4], 3.7, 2.9, tela), t.hue([sx * 3.9, 0.6, 10.4], [sx * 4.1, 0, 1.0], 2.8, 2.2, tela));
    t.masa(comps, tela, 2);
    t.cil([0, 0, 21.6], [0, 0, 23.4], 6.95, 7.0, { mat: e.correa });
    t.caja([0, 6.95, 22.5], [2.0, 0.6, 2.2], { mat: e.hebilla });
    if (duro) for (const sx of [-1, 1]) {
      t.cil([sx * 3.6, 0.3, 18.6], [sx * 3.9, 0.7, 12.0], 3.9, 3.3, { mat: e.base });
      t.esf([sx * 3.95, 1.4, 10.6], 2.5, { mat: e.base, tono: 0.06 });
      t.elip([sx * 5.2, 1.4, 10.6], [0.6, 2.2, 2.2], { mat: e.base, tono: 0.02, rot: [0, 0, sx * -12] });
      t.cil([sx * 4.0, 0.5, 9.0], [sx * 4.1, 0.1, 1.2], 3.0, 2.5, { mat: e.base });
      t.caja([sx * 4.05, 3.1, 5.2], [0.8, 0.8, 7.0], { mat: e.base, tono: 0.08, rot: [0, -4, 0] });
      if (e.ribete) { t.aro([sx * 3.6, 0.3, 18.6], 3.95, 0.3, { mat: e.borde, n: 14 }); t.aro([sx * 4.1, 0.1, 1.3], 2.55, 0.3, { mat: e.borde, n: 12 }); }
      if (e.remaches) t.esf([sx * 3.95, 3.9, 10.6], 0.5, { mat: e.remache });
      if (L === 'oscuro') pua(t, [sx * 3.95, 3.6, 10.8], [0, 1, 0.3], 3, 0.8, 'ic_hierro_negro');
      if (L === 'legendario' || (L === 'oscuro' && e.luz)) t.caja([sx * 4.05, 3.6, 5.2], [0.3, 0.3, 4.2], { mat: e.luz!, tono: tonoLuz(e) });
    } else {
      for (const sx of [-1, 1]) {
        if (L === 'cuero' || L === 'tachonado' || L === 'hueso') t.masa([t.bul([sx * 3.95, 1.2, 10.6], [2.4, 1.6, 2.4], e.base2)], e.base2, 1);
        if (e.tachas) for (let k = 0; k < 3; k++) t.esf([sx * 3.6, 3.3, 17 - k * 2.4], 0.5, { mat: e.remache });
        if (L === 'hueso') t.elip([sx * 4.0, 2.4, 5.4], [1.3, 1.0, 4.0], { mat: 'ic_hueso' });
        for (let k = 0; k < 3; k++) t.cil([sx * 4.1, 0.1, 2.0 + k * 1.6], [sx * 4.1, 0.1, 2.6 + k * 1.6], 2.4, 2.4, { mat: e.correa });
        if (L === 'tela' && e.ribete) t.aro([sx * 4.1, 0, 1.2], 2.3, 0.3, { mat: e.borde, n: 12 });
      }
    }
    if (e.n >= 4) gemaEngastada(t, [0, 7.4, 22.5], 0.95, e, { engaste: e.hebilla });
  });
}

// ------------------------------------------------------------------ escudos
/** La cara del escudo según la línea: madera pintada, cuero, acero, esmalte o hierro negro. */
function caraEscudo(e: Estilo, color?: string): string {
  switch (e.linea) {
    case 'tela': return tinte(color ?? '#2a3a7a', 'esmalte');
    case 'cuero': case 'tachonado': return color ? tinte(color, 'cuero') : e.base;
    case 'hueso': return 'ic_madera';
    case 'malla': return color ? tinte(color, 'esmalte') : 'ic_acero';
    case 'placas': return color ? tinte(color, 'esmalte') : 'ic_acero';
    case 'sagrado': return 'ic_esmalte';
    case 'oscuro': return 'ic_hierro_negro';
    case 'legendario': return e.base;
  }
}
/** Emblema al frente (en el plano x-z, sobresale hacia +y desde `y0`). */
function emblema(t: Taller, e: Estilo, y0: number, k = 1, z0 = 0) {
  const L = e.linea;
  const oro = L === 'oscuro' ? 'ic_hierro_negro' : e.n >= 3 || L === 'sagrado' || L === 'legendario' ? 'ic_oro' : e.n === 2 ? 'ic_plata' : 'ic_bronce';
  if (L === 'sagrado') {
    // sol de rayos con la gema al centro
    for (let i = 0; i < 12; i++) { const a = i * 30; t.caja([Math.cos(rad(a)) * 4.2 * k, y0 + 0.2, z0 + Math.sin(rad(a)) * 4.2 * k], [(i % 2 ? 2.2 : 3.4) * k, 0.5, 0.7 * k], { mat: 'ic_oro', rot: [0, 0, -a] }); }
    t.cil([0, y0 - 0.3, z0], [0, y0 + 0.7, z0], 2.6 * k, 2.4 * k, { mat: 'ic_oro' });
    gemaEngastada(t, [0, y0 + 0.6, z0], 1.5 * k, e, { engaste: 'ic_oro' });
    return;
  }
  if (L === 'oscuro') {
    t.masa([t.bul([0, y0 + 0.4, z0 + 0.6 * k], [2.8 * k, 1.6, 2.6 * k], 'ic_hueso'), t.bul([0, y0 + 0.4, z0 - 2.0 * k], [1.7 * k, 1.3, 1.3 * k], 'ic_hueso')], 'ic_hueso', 1);
    for (const sx of [-1, 1]) t.elip([sx * 1.1 * k, y0 + 1.7, z0 + 0.6 * k], [0.7 * k, 0.4, 0.75 * k], { mat: e.luz ?? 'ic_hueco' });
    return;
  }
  if (L === 'legendario') {
    // alas de oro abiertas con la gema
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) t.elip([sx * (2.2 + i * 1.1) * k, y0 + 0.2, z0 + (1.6 - i * 0.6) * k], [2.4 * k, 0.45, 0.7 * k], { mat: 'ic_oro', rot: [0, 0, sx * (20 + i * 14)] });
    gemaEngastada(t, [0, y0 + 0.5, z0], 1.6 * k, e, { engaste: 'ic_oro' });
    return;
  }
  if (L === 'hueso') { t.masa([t.bul([0, y0 + 0.4, z0], [2.6 * k, 1.4, 2.4 * k], 'ic_hueso')], 'ic_hueso', 1); for (const sx of [-1, 1]) { t.elip([sx * 1.0 * k, y0 + 1.4, z0 + 0.4 * k], [0.6 * k, 0.4, 0.7 * k], { mat: 'ic_hueco' }); t.cil([sx * 2.0 * k, y0 + 0.4, z0 + 1.6 * k], [sx * 4.6 * k, y0 + 0.6, z0 + 4.4 * k], 0.8 * k, 0.1, { mat: 'ic_hueso' }); } return; }
  if (L === 'tela') { t.caja([0, y0, z0], [1.8 * k, 0.6, 20 * k], { mat: tinte('#c8a040', 'esmalte') }); t.caja([0, y0, z0 + 2 * k], [20 * k, 0.6, 1.8 * k], { mat: tinte('#c8a040', 'esmalte') }); return; }
  // cruz o estrella de metal
  if (e.n >= 3) { for (let i = 0; i < 5; i++) { const a = 90 + i * 72; t.poli([[0, y0, z0], [Math.cos(rad(a)) * 4 * k, y0 + 0.3, z0 + Math.sin(rad(a)) * 4 * k], [Math.cos(rad(a + 36)) * 1.6 * k, y0 + 0.3, z0 + Math.sin(rad(a + 36)) * 1.6 * k], [Math.cos(rad(a - 36)) * 1.6 * k, y0 + 0.3, z0 + Math.sin(rad(a - 36)) * 1.6 * k], [0, y0 + 1.0, z0]], { mat: oro }); } if (e.n >= 4) gemaEngastada(t, [0, y0 + 0.8, z0], 1.0 * k, e, { engaste: oro }); }
  else { t.caja([0, y0, z0], [1.4 * k, 0.6, 8 * k], { mat: oro }); t.caja([0, y0, z0 + 1.4 * k], [6 * k, 0.6, 1.4 * k], { mat: oro }); }
}
function escudoRedondo(t: Taller, e: Estilo, d: Icono3D) {
  const R = d.variante === 'rodela' ? 8 : 11, cara = caraEscudo(e, d.color);
  t.en([0, 0, 0], [22, -16, 0], () => {
    t.cil([0, -1.4, 0], [0, -0.2, 0], R - 0.4, R, { mat: e.linea === 'hueso' ? 'ic_madera' : cara, tono: -0.05 });
    t.elip([0, -0.2, 0], [R - 0.2, 1.9, R - 0.2], { mat: cara });
    const borde = e.linea === 'tela' || e.linea === 'cuero' || e.linea === 'hueso' ? (e.n >= 3 ? 'ic_bronce' : 'ic_hierro') : e.borde;
    t.aro([0, -0.4, 0], R, 0.85, { mat: borde, eje: 'y', n: 22 });
    if (e.remaches || e.tachas) for (let k = 0; k < 12; k++) { const a = rad(k * 30 + 15), r = R - 1.7; t.esf([Math.cos(a) * r, -0.2 + 1.9 * Math.sqrt(Math.max(0, 1 - (r / R) ** 2)) + 0.1, Math.sin(a) * r], 0.5, { mat: e.remache }); }
    if (e.linea === 'hueso') for (let k = 0; k < 6; k++) { const a = rad(k * 60); t.cil([Math.cos(a) * 3, 1.4, Math.sin(a) * 3], [Math.cos(a) * (R - 1.5), 0.6, Math.sin(a) * (R - 1.5)], 0.7, 0.5, { mat: 'ic_hueso' }); }
    // umbo
    const um = e.linea === 'oscuro' ? 'ic_hierro_negro' : e.linea === 'tela' || e.linea === 'cuero' || e.linea === 'tachonado' ? (e.n >= 3 ? 'ic_bronce' : 'ic_hierro') : e.borde;
    if (e.linea === 'sagrado' || e.linea === 'legendario' || e.linea === 'oscuro') emblema(t, e, 1.6, d.variante === 'rodela' ? 0.7 : 1);
    else {
      t.cil([0, 1.0, 0], [0, 1.8, 0], 3.6, 3.4, { mat: um });
      t.elip([0, 1.8, 0], [3.0, 2.0, 3.0], { mat: um, tono: 0.05 });
      if (e.n >= 4) gemaEngastada(t, [0, 3.4, 0], 1.0, e, { engaste: um });
      if (e.linea === 'tela') emblema(t, e, 1.3, 0.5, 0);
    }
    if (e.linea === 'oscuro') for (let k = 0; k < 6; k++) { const a = rad(k * 60 + 30); pua(t, [Math.cos(a) * (R - 2.6), 1.0, Math.sin(a) * (R - 2.6)], [0, 1, 0], 2.6, 0.6, 'ic_hierro_negro'); }
    if (e.linea === 'legendario' || (e.luz && e.linea !== 'oscuro')) t.aro([0, 0.6, 0], R - 2.2, 0.3, { mat: e.luz ?? tinte(e.luzHex, 'luz'), eje: 'y', n: 20, tono: tonoLuz(e) });
  });
}
function escudoCometa(t: Taller, e: Estilo, d: Icono3D) {
  const heater = d.variante === 'heater', cara = caraEscudo(e, d.color);
  // contorno en x-z: arriba recto, costados que bajan a la punta
  const top = heater ? 10 : 12, W = heater ? 9.5 : 9, punta = heater ? -12 : -17;
  const cont: [number, number][] = [];
  for (let i = 0; i <= 8; i++) { const u = i / 8; const z = top - (top - punta) * u, w = heater ? W * Math.cos(Math.pow(u, 1.6) * Math.PI / 2) : W * (u < 0.3 ? 1 - u * 0.15 : (1 - u) / 0.7 * 0.955); cont.push([w, z]); }
  t.en([0, 0, 0], [22, -14, 0], () => {
    const pts: V3[] = [];
    for (const [w, z] of cont) for (const sx of [-1, 1]) { pts.push([sx * w, -0.8, z], [sx * w, 0.3, z]); pts.push([sx * w * 0.5, 0.3 + 1.3 * (w / W), z]); }
    pts.push([0, 1.7, top - 1]);
    t.poli(pts, { mat: cara });
    const borde = e.linea === 'tela' || e.linea === 'cuero' || e.linea === 'hueso' ? (e.n >= 3 ? 'ic_bronce' : 'ic_hierro') : e.borde;
    for (const sx of [-1, 1]) for (let i = 0; i < cont.length - 1; i++) t.cil([sx * cont[i][0], 0.3, cont[i][1]], [sx * cont[i + 1][0], 0.3, cont[i + 1][1]], 0.7, 0.7, { mat: borde });
    t.cil([-W, 0.3, top], [W, 0.3, top], 0.75, 0.75, { mat: borde });
    if (e.remaches || e.tachas) for (const sx of [-1, 1]) for (let i = 1; i < cont.length - 1; i += 2) t.esf([sx * (cont[i][0] - 1.3), 0.9 + 0.8 * (cont[i][0] / W), cont[i][1]], 0.45, { mat: e.remache });
    emblema(t, e, 1.4, heater ? 0.85 : 0.95, (top + punta) / 2 + 2);
    if (e.linea === 'oscuro') { for (const sx of [-1, 1]) pua(t, [sx * W * 0.95, 0.4, top - 0.4], [sx * 0.7, 0.3, 1], 4, 0.7, 'ic_hierro_negro'); pua(t, [0, 0.3, punta + 0.6], [0, 0.2, -1], 3.5, 0.7, 'ic_hierro_negro'); }
    if (e.linea === 'legendario' || (e.luz && e.linea === 'sagrado')) for (const sx of [-1, 1]) t.cil([sx * (W - 2), 1.2, top - 2], [sx * 1.6, 1.4, punta + 5], 0.3, 0.3, { mat: e.luz ?? tinte(e.luzHex, 'luz'), tono: tonoLuz(e) });
  });
}
function escudoTorre(t: Taller, e: Estilo, d: Icono3D) {
  const cara = caraEscudo(e, d.color), W = 9, top = 15, bot = -15;
  t.en([0, 0, 0], [24, -12, 0], () => {
    const pts: V3[] = [];
    for (let i = 0; i <= 6; i++) { const a = rad(-60 + i * 20), x = Math.sin(a) * W / Math.sin(rad(60)), y = Math.cos(a) * 3.2 - 1.6; for (const z of [bot, top - Math.abs(x) * 0.25]) pts.push([x, y, z], [x, y - 1.0, z]); }
    t.poli(pts, { mat: cara });
    const borde = e.linea === 'tela' || e.linea === 'cuero' || e.linea === 'hueso' ? (e.n >= 3 ? 'ic_bronce' : 'ic_hierro') : e.borde;
    for (let i = 0; i < 6; i++) { const a0 = rad(-60 + i * 20), a1 = rad(-40 + i * 20); const x0 = Math.sin(a0) * W / Math.sin(rad(60)), x1 = Math.sin(a1) * W / Math.sin(rad(60)); for (const zf of [(x: number) => top - Math.abs(x) * 0.25, () => bot]) t.cil([x0, Math.cos(a0) * 3.2 - 1.5, zf(x0)], [x1, Math.cos(a1) * 3.2 - 1.5, zf(x1)], 0.7, 0.7, { mat: borde }); }
    for (const sx of [-1, 1]) t.cil([sx * W, -1.5, bot], [sx * W, -1.5, top - W * 0.25], 0.75, 0.75, { mat: borde });
    // dos bandas verticales con remaches
    for (const sx of [-1, 1]) { t.caja([sx * 4.6, 1.15, 0], [1.6, 0.6, top - bot - 1], { mat: borde, rot: [sx * -9, 0, 0] }); if (e.remaches || e.tachas) filaRemaches(t, [sx * 4.6, 1.55, bot + 2], [sx * 4.6, 1.55, top - 3], 6, 0.42, e.remache); }
    emblema(t, e, 1.7, 0.95, 1);
    if (e.linea === 'oscuro') for (const z of [-8, 8]) pua(t, [0, 1.6, z], [0, 1, 0], 3, 0.8, 'ic_hierro_negro');
  });
}
function escudoCalavera(t: Taller, e: Estilo, d: Icono3D) {
  const cara = d.linea === undefined || e.linea === 'cuero' || e.linea === 'tela' ? 'ic_hierro_negro' : caraEscudo(e, d.color);
  t.en([0, 0, 0], [22, -14, 0], () => {
    t.cil([0, -1.4, 0], [0, -0.2, 0], 10.6, 11, { mat: cara, tono: -0.05 });
    t.elip([0, -0.2, 0], [10.8, 1.6, 10.8], { mat: cara });
    t.aro([0, -0.4, 0], 11, 0.9, { mat: e.linea === 'sagrado' || e.linea === 'legendario' ? 'ic_oro' : 'ic_hierro', eje: 'y', n: 22 });
    for (let k = 0; k < 8; k++) { const a = rad(k * 45 + 22.5); pua(t, [Math.cos(a) * 10.4, -0.4, Math.sin(a) * 10.4], [Math.cos(a), 0, Math.sin(a)], 3, 0.8, 'ic_hierro_negro'); }
    // la calavera grande en relieve
    const h = 'ic_hueso';
    t.masa([t.bul([0, 1.6, 1.4], [5.4, 2.6, 5.0], h), t.bul([0, 1.8, -3.2], [3.4, 2.2, 2.6], h), t.bul([0, 2.2, -0.6], [4.6, 2.0, 1.6], h)], h, 1.4);
    for (const sx of [-1, 1]) { t.elip([sx * 2.0, 3.9, 0.4], [1.35, 1.1, 1.3], { mat: 'ic_hueco', resta: true }); t.elip([sx * 2.0, 3.0, 0.4], [1.2, 0.6, 1.1], { mat: e.luz ?? (e.n >= 3 ? tinte('#ff3020', 'luz') : 'ic_hueco'), tono: tonoLuz(e) }); }
    t.elip([0, 4.0, -1.6], [0.6, 1.0, 0.9], { mat: 'ic_hueco', resta: true });
    for (let k = -2; k <= 2; k++) t.caja([k * 0.95, 3.6, -4.0], [0.7, 0.8, 1.4], { mat: h, tono: 0.05 });
    for (const sx of [-1, 1]) t.masa([t.hue([sx * 4.2, 1.6, 4.4], [sx * 7.6, 2.4, 7.6], 1.3, 0.8, h), t.hue([sx * 7.6, 2.4, 7.6], [sx * 7.0, 3.4, 11.2], 0.8, 0.1, h)], h, 0.6);
  });
}

// ------------------------------------------------------------------ joyas
function anillo(t: Taller, e: Estilo, d: Icono3D) {
  const met = metalJoya(e), banda = d.variante === 'banda';
  t.en([0, 0, 0], [32, 18, 0], () => {
    if (banda) {
      t.cil([0, -1.6, 0], [0, 1.6, 0], 4.9, 4.9, { mat: met });
      t.cil([0, -2, 0], [0, 2, 0], 3.7, 3.7, { mat: met, resta: true });
      t.aro([0, -1.6, 0], 4.95, 0.35, { mat: met, eje: 'y', n: 16, tono: 0.06 }); t.aro([0, 1.6, 0], 4.95, 0.35, { mat: met, eje: 'y', n: 16, tono: 0.06 });
      const runa = e.luz ?? (e.n >= 3 ? tinte(e.gemaHex, 'luz') : null);
      for (let k = 0; k < 7; k++) { const a = rad(30 + k * 20); t.caja([Math.cos(a) * 5.0, 0, Math.sin(a) * 5.0], [0.5, 1.6, 0.3], { mat: runa ?? 'ic_hueco', rot: [0, 0, -(30 + k * 20) + 90], tono: tonoLuz(e, k) }); }
      if (e.n >= 2) gemaEngastada(t, [0, 0, 5.2], 1.0, e, { engaste: met, normal: [0, -90, 0] });
      return;
    }
    t.aro([0, 0, 0], 4.2, 0.85, { mat: met, eje: 'y', n: 14, suave: true });
    // engaste con garras y la gema arriba
    t.cil([0, 0, 3.6], [0, 0, 5.4], 1.4, 2.1, { mat: met });
    for (let k = 0; k < 4; k++) { const a = rad(45 + k * 90); t.cil([Math.cos(a) * 1.8, Math.sin(a) * 1.8, 5.0], [Math.cos(a) * 2.1, Math.sin(a) * 2.1, 6.9], 0.35, 0.22, { mat: met }); }
    brillante(t, [0, 0, 6.4], 2.2, e.gema, [0, 0, 0], 1.1);
    t.elip([-0.8, 0.9, 7.4], [0.4, 0.25, 0.3], { mat: 'ic_brillo' });
    if (e.filigrana) for (const sx of [-1, 1]) { t.esf([sx * 2.5, 0, 3.9], 0.8, { mat: tinte(sx > 0 ? '#2f62e6' : '#1fb35e', 'gema') }); t.aro([sx * 2.6, 0, 3.9], 1.0, 0.25, { mat: met, eje: 'x', n: 8 }); }
    if (e.luz && e.n >= 5) t.aro([0, 0, 0], 4.2, 0.25, { mat: e.luz, eje: 'x', n: 14, tono: tonoLuz(e) });
  });
  t.luz([0, 0, 6.4], 6, e.gemaHex);
}
/** Cadena de eslabones a lo largo de una polilínea. */
function cadena(t: Taller, pts: V3[], r: number, mat: string) {
  let k = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], d = add(b, a, -1), L = Math.hypot(...d), n = Math.max(1, Math.round(L / (r * 2.2)));
    const g = Math.atan2(d[1], d[0]) * 180 / Math.PI, inc = Math.atan2(d[2], Math.hypot(d[0], d[1])) * 180 / Math.PI;
    for (let j = 0; j < n; j++, k++) t.elip(mez(a, b, (j + 0.5) / n), [r * 1.25, r * 0.5, r * 0.75], { mat, rot: [g, 0, 0], tono: k % 2 ? -0.08 : 0.04 }), void inc;
  }
}
function amuleto(t: Taller, e: Estilo, d: Icono3D) {
  const met = metalJoya(e), gota = d.variante === 'colgante';
  t.en([0, 0, 0], [10, -10, 0], () => {
    // cadena en V que sube desde el colgante
    const curva = (sx: number): V3[] => Array.from({ length: 7 }, (_, i) => { const u = i / 6; return [sx * (Math.sin(u * Math.PI * 0.55) * 8.2), -1.5 * u, 4.6 + u * u * 11.5 + u * 1.5]; });
    for (const sx of [-1, 1]) cadena(t, curva(sx), 0.62, met);
    cadena(t, [[-7.2, -1.5, 17.6], [-4, -3.4, 19.4], [0, -4, 20], [4, -3.4, 19.4], [7.2, -1.5, 17.6]], 0.62, met);
    t.aro([0, 0, 4.4], 0.9, 0.3, { mat: met, eje: 'x', n: 8 });
    if (gota) {
      t.cil([0, -0.4, 2.5], [0, 0.6, 2.5], 1.5, 1.5, { mat: met });
      brillante(t, [0, 0.4, -1.8], 2.6, e.gema, [0, -90, 0], 1.6);
      t.elip([0, 0.5, -1.8], [2.9, 1.2, 4.2], { mat: met, tono: -0.05 });
      t.elip([-0.9, 1.8, -0.6], [0.45, 0.25, 0.6], { mat: 'ic_brillo' });
    } else {
      t.cil([0, -0.6, 0], [0, 0.7, 0], 3.9, 3.7, { mat: met });
      t.aro([0, 0.6, 0], 3.75, 0.45, { mat: met, eje: 'y', n: 16, tono: 0.08 });
      brillante(t, [0, 0.8, 0], 2.6, e.gema, [0, -90, 0]);
      t.elip([-1.0, 2.4, 0.9], [0.5, 0.3, 0.45], { mat: 'ic_brillo' });
      if (e.n >= 2) for (let k = 0; k < 8; k++) { const a = rad(k * 45); t.esf([Math.cos(a) * 4.4, 0.4, Math.sin(a) * 4.4], k % 2 ? 0.5 : 0.7, { mat: met }); }
      if (e.n >= 3) { t.cil([0, 0, -4.6], [0, 0, -6.4], 0.3, 0.3, { mat: met }); brillante(t, [0, 0.3, -7.6], 1.2, e.gema, [0, -90, 0], 1.4); }
      if (e.filigrana) for (const sx of [-1, 1]) { t.elip([sx * 5.3, 0.2, 1.6], [1.4, 0.5, 0.6], { mat: met, rot: [0, 0, sx * 30] }); t.elip([sx * 5.3, 0.2, -1.6], [1.4, 0.5, 0.6], { mat: met, rot: [0, 0, sx * -30] }); }
      if (e.luz && e.n >= 5) t.aro([0, 0.9, 0], 3.2, 0.25, { mat: e.luz, eje: 'y', n: 14, tono: tonoLuz(e) });
    }
  });
  t.luz([0, 2, 0], 7, e.gemaHex);
}
function talisman(t: Taller, e: Estilo, d: Icono3D) {
  const v = d.variante ?? 'hueso', met = metalJoya(e);
  t.en([0, 0, 0], [16, -6, 0], () => {
    switch (v) {
      case 'cera': {
        // vela de cera en su platillo de hierro, con la llama viva
        t.cil([0, 0, 0], [0, 0, 0.9], 5.2, 5.0, { mat: met });
        t.aro([0, 0, 0.9], 5.0, 0.4, { mat: met, n: 16 });
        t.aro([5.6, 0, 1.0], 1.5, 0.4, { mat: met, eje: 'y', n: 10 });
        t.cil([0, 0, 0.8], [0, 0, 10], 2.8, 2.6, { mat: 'ic_cera' });
        for (const [x, y, z, l] of [[-2.2, 1.7, 8.4, 2.6], [2.6, 0.5, 7.8, 3.6], [0.4, 2.7, 6.8, 4.2]] as number[][]) t.elip([x, y, z], [0.6, 0.6, l], { mat: 'ic_cera', tono: 0.05 });
        t.masa([t.bul([1.5, 1.6, 1.4], [2.6, 2.2, 0.9], 'ic_cera')], 'ic_cera', 1);
        t.cil([0, 0, 10], [0, 0, 11], 0.18, 0.15, { mat: 'ic_hueco' });
        t.elip([0, 0, 12.6], [0.95, 0.95, 2.1], { mat: tinte('#ffa030', 'luz') });
        t.elip([0, 0.3, 12.2], [0.45, 0.45, 1.0], { mat: 'ic_brillo' });
        t.luz([0, 0, 12.6], 9, '#ffa040');
        if (e.n >= 3) for (let k = 0; k < 3; k++) t.caja([Math.cos(rad(60 + k * 30)) * 2.75, Math.sin(rad(60 + k * 30)) * 2.75, 5], [0.6, 0.3, 0.8], { mat: tinte(e.luzHex, 'luz'), rot: [60 + k * 30 - 90, 0, 0] });
        break;
      }
      case 'ceniza': {
        // urna de barro con tapa y asas, el fulgor de la ceniza en las grietas
        const b = 'ic_barro';
        t.masa([t.bul([0, 0, 5], [4.6, 4.6, 5.0], b), t.hue([0, 0, 8], [0, 0, 11], 2.4, 2.0, b), t.hue([0, 0, 0.2], [0, 0, 1.6], 3.0, 3.2, b)], b, 1.4);
        t.cil([0, 0, 11], [0, 0, 12], 2.7, 2.5, { mat: met });
        t.cil([0, 0, 12], [0, 0, 13.2], 1.8, 0.8, { mat: b });
        t.esf([0, 0, 13.6], 0.8, { mat: met });
        for (const sx of [-1, 1]) t.aro([sx * 4.4, 0, 7.6], 1.6, 0.45, { mat: b, eje: 'y', n: 10, desde: sx > 0 ? -90 : 90, hasta: sx > 0 ? 90 : 270 });
        t.cil([0, 0, 4.4], [0, 0, 5.4], 4.75, 4.75, { mat: met });
        const ceniza = tinte('#ff6020', 'luz');
        for (const [x, z, r] of [[-1.6, 6.8, 30], [1.2, 3.0, -40], [2.6, 7.6, 70]] as number[][]) t.caja([x, 4.45 - Math.abs(x) * 0.25, z], [0.3, 0.3, 2.2], { mat: ceniza, rot: [0, 0, r] });
        t.luz([0, 3, 5], 8, '#ff7030');
        if (e.n >= 4) gemaEngastada(t, [0, 4.8, 4.9], 0.8, e, { engaste: met });
        break;
      }
      case 'badajo': {
        // campanilla con el badajo colgando
        const br = e.linea === 'oscuro' ? 'ic_hierro_negro' : 'ic_bronce';
        t.aro([0, 0, 12.4], 1.4, 0.45, { mat: br, eje: 'y', n: 10 });
        t.masa([t.hue([0, 0, 3], [0, 0, 10], 4.8, 2.6, br), t.bul([0, 0, 10], [2.7, 2.7, 1.8], br)], br, 1.2);
        t.cil([0, 0, 2.2], [0, 0, 3.4], 5.2, 4.8, { mat: br, tono: 0.05 });
        t.cil([0, 0, 2.0], [0, 0, 5.5], 4.2, 3.4, { mat: br, resta: true });
        t.elip([0, 0, 2.6], [4.1, 4.1, 0.3], { mat: 'ic_hueco' });
        t.cil([0, 0, 6], [0.4, 0.6, 0.6], 0.35, 0.35, { mat: 'ic_hierro' });
        t.esf([0.4, 0.6, 0.0], 1.2, { mat: 'ic_hierro' });
        if (e.n >= 3) for (let k = 0; k < 3; k++) t.aro([0, 0, 4.4 + k * 2], 4.4 - k * 0.6, 0.25, { mat: 'ic_oro', n: 14 });
        if (e.luz) t.caja([0, 4.1, 6], [1.6, 0.3, 0.4], { mat: e.luz });
        break;
      }
      case 'brasa': {
        // brasa viva en una jaula de hierro
        const fe = e.linea === 'legendario' || e.linea === 'sagrado' ? 'ic_oro' : 'ic_hierro';
        t.esf([0, 0, 5.6], 3.4, { mat: tinte(colorDe(d.encanto, '#ff6a18', ENCANTO), 'luz'), tono: tonoLuz(e) });
        for (let k = 0; k < 6; k++) { const a = k * 60; t.aro([0, 0, 5.6], 4.0, 0.42, { mat: fe, eje: 'x', desde: -95, hasta: 95, n: 6, rot: [a, 0, 0] }); }
        t.cil([0, 0, 9.4], [0, 0, 10.2], 1.6, 1.2, { mat: fe });
        t.aro([0, 0, 11.6], 1.3, 0.4, { mat: fe, eje: 'y', n: 10 });
        t.cil([0, 0, 1.4], [0, 0, 2.2], 1.6, 2.0, { mat: fe });
        t.luz([0, 0, 5.6], 10, colorDe(d.encanto, '#ff7a20', ENCANTO));
        break;
      }
      case 'cabeza': case 'craneo': {
        if (v === 'craneo') {
          const h = 'ic_hueso';
          t.masa([t.bul([0, -0.4, 6.4], [4.4, 5.0, 4.4], h), t.bul([0, 2.8, 3.8], [3.4, 2.4, 2.6], h), t.bul([0, 3.0, 6.6], [3.8, 1.8, 1.2], h)], h, 1.4);
          for (const sx of [-1, 1]) { t.elip([sx * 1.5, 4.5, 5.2], [1.05, 0.9, 1.0], { mat: 'ic_hueco', resta: true }); t.elip([sx * 1.5, 3.8, 5.2], [0.8, 0.5, 0.7], { mat: e.n >= 3 ? tinte(e.luzHex, 'luz') : 'ic_hueco' }); }
          t.elip([0, 4.9, 3.6], [0.5, 0.6, 0.6], { mat: 'ic_hueco', resta: true });
          for (let k = -2; k <= 2; k++) t.caja([k * 0.75, 4.1 - Math.abs(k) * 0.4, 2.2], [0.55, 0.6, 1.0], { mat: h, tono: 0.05 });
        } else {
          const p = tinte('#5e4a34', 'cuero');
          t.masa([t.bul([0, 0, 6], [3.8, 4.0, 4.4], p), t.bul([0, 2.6, 4.6], [2.6, 1.8, 3.2], p), t.bul([0, 3.8, 5.4], [0.8, 1.2, 1.2], p)], p, 1.6);
          for (const sx of [-1, 1]) t.caja([sx * 1.4, 4.0, 6.4], [1.4, 0.4, 0.25], { mat: 'ic_hueco' });
          for (let k = -2; k <= 2; k++) t.cil([k * 0.5, 4.0, 3.6], [k * 0.5, 4.1, 2.6], 0.14, 0.14, { mat: 'ic_costura' });
          for (let k = 0; k < 7; k++) { const a = rad(200 + k * 20); t.cil([Math.cos(a) * 3.2, Math.sin(a) * 3.0, 9.4], [Math.cos(a) * 3.8, Math.sin(a) * 3.4 - 0.6, -2 - (k % 3)], 0.4, 0.25, { mat: tinte('#1a1410', 'mate') }); }
        }
        t.cil([0, 0, 10], [0, 0, 13.5], 0.3, 0.3, { mat: e.correa });
        t.aro([0, 0, 14.2], 1.0, 0.3, { mat: met, eje: 'y', n: 8 });
        break;
      }
      default: {
        // fetiche de hueso: colmillo atado con cuero, plumas y cuentas
        const h = 'ic_hueso';
        t.masa([t.hue([0, 0, 13], [0.6, 0.4, 7], 1.7, 1.5, h), t.hue([0.6, 0.4, 7], [0, 0.8, 1.5], 1.5, 0.9, h), t.hue([0, 0.8, 1.5], [-1.4, 1.2, -1.6], 0.9, 0.15, h)], h, 1.0);
        for (const z of [10.6, 8.8]) t.cil([0.3, 0.2, z], [0.4, 0.3, z + 0.9], 1.85, 1.75, { mat: e.correa });
        t.aro([0, 0, 14.8], 1.4, 0.35, { mat: e.correa, eje: 'y', n: 10 });
        for (const [sx, col] of [[-1, '#7a2a1a'], [1, '#1a1a22']] as [number, string][]) {
          t.cil([sx * 1.4, 0.6, 9.4], [sx * 2.4, 1.0, 5.6], 0.2, 0.2, { mat: e.correa });
          t.elip([sx * 2.8, 1.0, 3.4], [0.7, 0.3, 2.6], { mat: tinte(col, 'tela'), rot: [0, 0, sx * -10] });
          t.esf([sx * 2.4, 1.1, 6.0], 0.75, { mat: sx > 0 ? e.gema : tinte('#c8a040', 'esmalte') });
        }
        if (e.n >= 3) for (let k = 0; k < 3; k++) t.caja([0.45, 2.1 - k * 0.1, 6.0 - k * 1.6], [0.9, 0.3, 0.35], { mat: tinte(e.luzHex, 'luz') });
      }
    }
  });
}

// ------------------------------------------------------------------ pociones
const POCIONES: Record<string, string> = { health: '#d8243e', vida: '#d8243e', mana: '#2f62e6', rejuv: '#9a3ad8', stamina: '#f2b21e', aguante: '#f2b21e', antidote: '#3fbf5a', antidoto: '#3fbf5a', thawing: '#ff8a3a', esencia: '#b48cff' };
function pocion(t: Taller, e: Estilo, d: Icono3D) {
  const col = colorDe(d.variante, POCIONES[d.variante ?? 'health'] ?? '#d8243e', POCIONES), liq = tinte(col, 'liquido');
  const n = e.n, met = n >= 5 ? 'ic_oro' : n >= 4 ? 'ic_bronce' : 'ic_hierro';
  t.en([0, 0, 0], [14, 8, 0], () => {
    let cuello: number, rc: number;
    if (n <= 1) {
      // frasquito de vidrio largo
      t.cil([0, 0, 1.4], [0, 0, 10], 2.5, 2.4, { mat: 'ic_vidrio' });
      t.caja([0, 0, 9.0], [6, 6, 3.2], { mat: 'ic_vidrio', resta: true });
      t.esf([0, 0, 1.6], 2.45, { mat: liq });
      t.cil([0, 0, 1.4], [0, 0, 7.6], 2.38, 2.38, { mat: liq });
      t.elip([-1.0, 1.7, 6.0], [0.35, 0.3, 2.2], { mat: 'ic_brillo' });
      cuello = 10; rc = 1.4;
    } else {
      const R = n === 2 ? 4.0 : n === 3 ? 4.8 : 5.3, cz = R;
      // el vidrio solo arriba del nivel del líquido; abajo se ve el líquido
      t.esf([0, 0, cz], R + 0.15, { mat: 'ic_vidrio' });
      t.caja([0, 0, cz + R * 0.18 - R * 1.2], [R * 3, R * 3, R * 2.4], { mat: 'ic_vidrio', resta: true });
      t.esf([0, 0, cz], R, { mat: liq });
      t.cil([0, 0, cz + R * 0.6], [0, 0, cz + R + 2.6], 1.7, 1.5, { mat: 'ic_vidrio' });
      t.elip([-R * 0.45, R * 0.62, cz + R * 0.42], [R * 0.22, R * 0.1, R * 0.32], { mat: 'ic_brillo', rot: [0, 0, 35] });
      t.elip([R * 0.55, R * 0.6, cz - R * 0.35], [R * 0.08, R * 0.05, R * 0.18], { mat: 'ic_brillo', rot: [0, 0, -30] });
      cuello = cz + R + 2.6; rc = 1.5;
      if (n >= 4) { t.cil([0, 0, cz + R * 0.85], [0, 0, cz + R + 0.6], 2.3, 1.9, { mat: met }); t.aro([0, 0, cz - R * 0.86], R * 0.52, 0.45, { mat: met, n: 14 }); }
      if (n >= 5) {
        for (let k = 0; k < 4; k++) t.aro([0, 0, cz], R + 0.45, 0.32, { mat: met, eje: 'x', desde: -60, hasta: 60, n: 6, rot: [45 + k * 90, 0, 0] });
        for (let k = 0; k < 3; k++) { const a = rad(k * 120 + 30); t.cil([Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6, 0.6], [Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9, -0.9], 0.5, 0.3, { mat: met }); }
      }
      t.luz([0, 0, cz], R * 2.2, col);
    }
    // boca, corcho y el sello que brilla
    t.aro([0, 0, cuello], rc + 0.2, 0.4, { mat: 'ic_vidrio', n: 12 });
    t.cil([0, 0, cuello - 1.2], [0, 0, cuello + 1.6], rc - 0.1, rc + 0.15, { mat: 'ic_corcho' });
    t.cil([0, 0, cuello + 1.3], [0, 0, cuello + 2.0], rc + 0.45, rc + 0.3, { mat: tinte(col, 'luz'), tono: -0.15 });
    t.cil([0, 0, cuello - 0.4], [0, 0, cuello + 0.3], rc + 0.35, rc + 0.35, { mat: n >= 3 ? met : 'ic_cera_roja' });
  });
}

// ------------------------------------------------------------------ gemas
function gema(t: Taller, e: Estilo, d: Icono3D) {
  const tipo = d.variante ?? 'ruby', col = colorDe(tipo, colorDe(d.gema, '#d8243e')), mat = tinte(col, 'gema'), n = e.n;
  const R = [3.6, 4.4, 5.0, 5.5, 6.0][n - 1];
  t.en([0, 0, 0], [18, 34, -8], () => {
    if (tipo === 'skull' || tipo === 'calavera') {
      t.masa([t.bul([0, 0, 0.6], [R * 0.82, R * 0.9, R * 0.78], mat), t.bul([0, R * 0.55, -R * 0.45], [R * 0.55, R * 0.42, R * 0.4], mat)], mat, 1.2);
      for (const sx of [-1, 1]) { t.elip([sx * R * 0.32, R * 0.85, R * 0.02], [R * 0.24, R * 0.2, R * 0.22], { mat: 'ic_hueco', resta: true }); t.elip([sx * R * 0.32, R * 0.7, R * 0.02], [R * 0.2, R * 0.1, R * 0.18], { mat: n >= 4 ? tinte('#80ff90', 'luz') : 'ic_hueco' }); }
      return;
    }
    if (n <= 2) {
      // sin tallar: un canto rodado facetado al azar
      const pts: V3[] = [];
      for (let i = 0; i < (n === 1 ? 8 : 12); i++) { const a = rad(i * 137.5), z = ((i * 0.618) % 1) * 2 - 1, r = Math.sqrt(1 - z * z); pts.push([Math.cos(a) * r * R * (0.8 + 0.3 * ((i * 7) % 3) / 2), Math.sin(a) * r * R * 0.7, z * R * 0.85]); }
      t.poli(pts, { mat });
    } else if (tipo === 'emerald' || tipo === 'esmeralda') {
      const w = R * 0.75, h = R * 1.05, pts: V3[] = [];
      for (const [f, z] of [[0.62, R * 0.45], [1, R * 0.12], [1, -R * 0.02], [0.55, -R * 0.5]] as [number, number][]) for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { pts.push([sx * w * f, sy * (h * f - w * f * 0.3), z], [sx * (w * f - w * f * 0.3), sy * h * f, z]); }
      t.poli(pts, { mat });
    } else if (tipo === 'amethyst' || tipo === 'amatista') {
      // drusa: tres prismas con punta
      for (const [x, y, ang, L] of [[0, 0, 0, R * 1.5], [R * 0.6, -R * 0.2, 28, R * 1.05], [-R * 0.55, 0.2, -24, R * 1.1]] as number[][]) t.en([x, y, -R * 0.6], [0, 0, ang], () => { const rr = R * 0.36; t.poli([...anilloPts(rr, rr, 0, 6), ...anilloPts(rr, rr, L * 0.72, 6), [0, 0, L]], { mat }); });
      t.masa([t.bul([0, 0, -R * 0.7], [R * 0.9, R * 0.6, R * 0.35], 'ic_roca')], 'ic_roca', 1);
    } else {
      const kx = tipo === 'topaz' || tipo === 'topacio' ? 1.3 : 1;
      t.en([0, 0, 0], [0, 0, 0], () => { brillante(t, [0, 0, 0], R, mat, [0, 0, 0], 1.2); });
      if (kx !== 1) { /* óvalo: un segundo brillante corrido lo alarga */ brillante(t, [R * 0.35, 0, 0], R * 0.92, mat, [0, 0, 0], 1.2); brillante(t, [-R * 0.35, 0, 0], R * 0.92, mat, [0, 0, 0], 1.2); }
    }
    if (n >= 3) {
      // destello: cruz de luz en una faceta
      t.elip([-R * 0.25, R * 0.15, R * 0.55], [R * 0.42, 0.12, 0.12], { mat: 'ic_brillo' });
      t.elip([-R * 0.25, R * 0.15, R * 0.55], [0.12, R * 0.42, 0.12], { mat: 'ic_brillo' });
    }
    if (n >= 5) t.esf([-R * 0.25, R * 0.15, R * 0.55], 0.35, { mat: 'ic_brillo' });
  });
  t.luz([0, 0, 0], R * 2.4, col);
}

// ------------------------------------------------------------------ runas
/** Trazos de los 12 glifos (x0, z0, x1, z1) en una tablilla de 6×9. */
const GLIFOS: [number, number, number, number][][] = [
  [[0, -3.6, 0, 3.6], [0, 1.6, 2.2, 3.4], [0, 0, 2.2, 1.8]],
  [[-1, -3.6, -1, 3.6], [-1, 3.6, 1.8, 1.4], [1.8, 1.4, -1, -0.4], [-1, -0.4, 1.8, -2.6]],
  [[0, -3.6, 0, 3.6], [-2, 2.6, 2, -0.6], [2, 2.6, -2, -0.6]],
  [[-1.8, -3.6, -1.8, 3.6], [1.8, -3.6, 1.8, 3.6], [-1.8, 1.4, 1.8, -1.4]],
  [[0, -3.6, 0, 3.6], [-2.2, 3.4, 0, 1.2], [2.2, 3.4, 0, 1.2]],
  [[-1, -3.6, -1, 3.6], [-1, 2.6, 2, 3.6], [-1, 0.6, 2, 1.6]],
  [[-2, 3.4, 2, -3.4], [2, 3.4, -2, -3.4]],
  [[0, -3.6, 0, 3.6], [-2, 0, 0, 2.2], [2, 0, 0, 2.2], [-2, 0, 0, -2.2], [2, 0, 0, -2.2]],
  [[0, -3.6, 0, 3.6]],
  [[-1.2, 3.4, -1.2, -0.4], [-1.2, -0.4, 1.2, -3.4], [1.2, -3.4, 1.2, 0.4]],
  [[0, -3.6, 0, 3.6], [0, 1.0, 2.2, -1.2], [0, 1.0, -2.2, -1.2]],
  [[-2, -3.4, 0, 3.4], [0, 3.4, 2, -3.4], [-1.2, -0.4, 1.2, -0.4]],
];
function runa(t: Taller, e: Estilo, d: Icono3D) {
  const idx = Math.abs(parseInt(d.variante ?? '0', 10) || 0) % GLIFOS.length;
  const piedra = e.linea === 'oscuro' ? 'ic_hierro_negro' : e.linea === 'sagrado' ? 'ic_esmalte' : e.linea === 'hueso' ? 'ic_hueso' : 'ic_roca';
  const brillo = tinte(colorDe(d.encanto ?? d.gema, e.n >= 4 ? '#ffb040' : '#5ac8f0', { ...ENCANTO, ...GEMAS }), 'luz');
  t.en([0, 0, 0], [16, -12, 6], () => {
    // tablilla con los cantos biselados
    const oct = (w: number, h: number, c: number, y: number): V3[] => [[-w + c, y, h], [w - c, y, h], [w, y, h - c], [w, y, -h + c], [w - c, y, -h], [-w + c, y, -h], [-w, y, -h + c], [-w, y, h - c]];
    t.poli([...oct(4.4, 6.2, 1.6, 1.3), ...oct(4.9, 6.7, 1.8, 0.4), ...oct(4.9, 6.7, 1.8, -0.8), ...oct(4.4, 6.2, 1.6, -1.6)], { mat: piedra });
    // muescas del tiempo
    t.caja([4.6, 0.4, 3.2], [1.6, 3, 1.4], { mat: piedra, resta: true, rot: [0, 0, 30] });
    t.caja([-4.4, 0.4, -4.4], [1.4, 3, 1.2], { mat: piedra, resta: true, rot: [0, 0, -20] });
    // el glifo tallado y encendido
    for (const [x0, z0, x1, z1] of GLIFOS[idx]) {
      const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0) * 180 / Math.PI, c: V3 = [(x0 + x1) / 2, 1.3, (z0 + z1) / 2];
      t.caja(c, [L + 1.0, 1.0, 1.0], { mat: piedra, resta: true, rot: [0, 0, -ang] });
      t.caja(add(c, [0, -0.25, 0]), [L + 0.6, 0.6, 0.6], { mat: brillo, rot: [0, 0, -ang], tono: tonoLuz(e) });
    }
    if (e.n >= 4) for (let k = 0; k < 4; k++) { const [x, z] = [[-3.4, 5], [3.4, 5], [-3.4, -5], [3.4, -5]][k]; t.esf([x, 1.25, z], 0.45, { mat: 'ic_oro' }); }
  });
  t.luz([0, 3, 0], 9, MATERIALES[brillo].rampa[2]);
}

// ------------------------------------------------------------------ pergaminos, llaves, oro, libros, orbes y carcajes
function pergamino(t: Taller, e: Estilo, d: Icono3D) {
  const v = d.variante ?? 'portal', sello = v === 'identificar' ? '#ff9a3a' : v === 'mapa' ? null : '#5ac8f0';
  t.en([0, 0, 0], [-24, 16, 14], () => {
    t.cil([-8, 0, 0], [8, 0, 0], 2.5, 2.5, { mat: 'ic_papel' });
    for (const sx of [-1, 1]) { t.elip([sx * 8.05, 0, 0], [0.25, 2.45, 2.45], { mat: 'ic_papel', tono: -0.08 }); t.aro([sx * 8.1, 0, 0], 1.6, 0.18, { mat: tinte('#6b5a3e', 'mate'), eje: 'x', n: 10 }); t.esf([sx * 8.2, 0, 0], 0.5, { mat: 'ic_hueco' }); }
    // la hoja que cuelga a medio desenrollar
    t.poli([[-7.6, 2.0, -0.6], [7.6, 2.0, -0.6], [-7.6, 2.5, -1.8], [7.6, 2.5, -1.8], [-7.2, 3.4, -5.4], [7.2, 3.4, -5.4], [-7.2, 3.0, -5.4], [7.2, 3.0, -5.4]], { mat: 'ic_papel', tono: 0.04 });
    for (let k = 0; k < 3; k++) t.caja([-2 + k * 0.8, 3.2, -2.6 - k * 0.9], [7 - k * 2, 0.2, 0.25], { mat: tinte('#4a3020', 'mate') });
    // varillas de madera con perillas
    const pom = e.n >= 4 ? 'ic_oro' : e.n >= 2 ? 'ic_bronce' : 'ic_madera';
    for (const sx of [-1, 1]) { t.cil([sx * 8, 0, 0], [sx * 9.6, 0, 0], 0.7, 0.7, { mat: 'ic_madera' }); t.esf([sx * 10.0, 0, 0], 0.95, { mat: pom }); }
    // cinta y sello de lacre
    if (sello) {
      t.cil([-0.9, 0, 0], [0.9, 0, 0], 2.62, 2.62, { mat: tinte('#8a1a1a', 'tela') });
      t.cil([0, 2.3, -0.4], [0, 3.2, -0.4], 1.7, 1.5, { mat: 'ic_cera_roja' });
      t.cil([0, 3.15, -0.4], [0, 3.35, -0.4], 0.8, 0.7, { mat: tinte(sello, 'luz') });
      t.masa([t.hue([0.4, 2.6, -1.4], [0.9, 3.0, -4.4], 0.5, 0.4, tinte('#8a1a1a', 'tela')), t.hue([-0.4, 2.6, -1.4], [-1.1, 2.9, -4.0], 0.5, 0.4, tinte('#8a1a1a', 'tela'))], tinte('#8a1a1a', 'tela'), 0.4);
      t.luz([0, 4, -0.4], 5, sello);
    } else t.cil([-0.6, 0, 0], [0.6, 0, 0], 2.6, 2.6, { mat: 'ic_corcho' });
  });
}
function llave(t: Taller, e: Estilo, d: Icono3D) {
  const jefe = d.variante === 'jefe', met = jefe ? 'ic_oro' : metalDuro(e);
  t.en([0, 0, 0], [10, -10, 42], () => {
    if (jefe) {
      const h = 'ic_hueso';
      t.masa([t.bul([0, 0, 4.4], [3.4, 2.4, 3.2], h), t.bul([0, 0.9, 2.0], [2.2, 1.6, 1.6], h)], h, 1);
      for (const sx of [-1, 1]) t.elip([sx * 1.2, 2.0, 4.4], [0.75, 0.5, 0.7], { mat: tinte('#ff3020', 'luz') });
      t.aro([0, 0, 4.4], 4.0, 0.5, { mat: met, eje: 'y', n: 14, desde: 200, hasta: 340 });
    } else {
      t.aro([0, 0, 3.6], 3.0, 0.75, { mat: met, eje: 'y', n: 12 });
      for (const [x, z] of [[0, 5.4], [0, 1.8], [-1.8, 3.6], [1.8, 3.6]]) t.aro([x, 0, z], 0.95, 0.35, { mat: met, eje: 'y', n: 8 });
      if (e.n >= 3) gemaEngastada(t, [0, 0.2, 3.6], 0.8, e, { engaste: met, normal: [0, 0, 0] });
    }
    t.cil([0, 0, 0.6], [0, 0, -13], 0.75, 0.7, { mat: met });
    for (const z of [-0.6, -2.0]) t.cil([0, 0, z], [0, 0, z - 0.8], 1.15, 1.15, { mat: met, tono: 0.05 });
    // paletón con dientes
    t.caja([1.6, 0, -11.6], [2.4, 0.8, 2.8], { mat: met });
    t.caja([2.4, 0, -11.6], [1.2, 1.2, 0.8], { mat: met, resta: true });
    t.caja([1.2, 0, -13.2], [1.6, 0.8, 0.9], { mat: met, tono: 0.04 });
    if (jefe) t.cil([0, 0, -13], [0, 0, -14.4], 0.7, 0.1, { mat: met });
  });
  if (jefe) t.luz([0, 2, 4.4], 6, '#ff4020');
}
function oro(t: Taller, e: Estilo) {
  const n = 6 + e.n * 4;
  t.en([0, 0, 0], [0, 40, 0], () => {
    let sem = 7;
    const r = () => { sem = (sem * 16807) % 2147483647; return sem / 2147483647; };
    const monedas: [V3, V3][] = [];
    for (let i = 0; i < n; i++) {
      const capa = i < n * 0.5 ? 0 : i < n * 0.82 ? 1 : 2, R = [6.5, 4.2, 2.0][capa], a = r() * Math.PI * 2, rr = Math.sqrt(r()) * R;
      monedas.push([[Math.cos(a) * rr * 1.2, Math.sin(a) * rr, capa * 0.9 + 0.3 + r() * 0.3], nor([(r() - 0.5) * 0.7, (r() - 0.5) * 0.7, 1])]);
    }
    monedas.push([[-2.5, 6.4, 2.4], nor([0.2, 1, 0.6])], [[3.6, 5.8, 2.0], nor([-0.3, 1, 0.9])]);
    for (const [c, ax] of monedas) {
      t.cil(add(c, ax, -0.3), add(c, ax, 0.3), 2.3, 2.3, { mat: 'ic_oro', tono: (r() - 0.5) * 0.08 });
      t.cil(add(c, ax, 0.2), add(c, ax, 0.38), 1.6, 1.5, { mat: 'ic_oro', tono: 0.06 });
    }
    if (e.n >= 4) brillante(t, [0.6, 1.6, 3.4], 1.4, e.gema, [0, 20, 0]);
  });
}
function libro(t: Taller, e: Estilo, d: Icono3D) {
  const L = e.linea;
  const tapa = L === 'tela' ? e.base : L === 'oscuro' ? tinte('#1e1418', 'cuero') : L === 'sagrado' ? 'ic_esmalte' : L === 'legendario' ? e.base : L === 'hueso' ? tinte('#6e5a44', 'cuero') : tinte(d.color ?? '#5a2a1e', 'cuero');
  const met = L === 'oscuro' ? 'ic_hierro_negro' : L === 'hueso' ? 'ic_hueso' : e.n >= 3 || L === 'sagrado' || L === 'legendario' ? 'ic_oro' : 'ic_bronce';
  const portal = d.variante === 'portal';
  t.en([0, 0, 0], [30, -14, 0], () => {
    for (const y of [-1.75, 1.75]) t.caja([0, y, 0], [10.6, 0.7, 13.6], { mat: tapa });
    t.cil([-5.3, 0, -6.8], [-5.3, 0, 6.8], 2.1, 2.1, { mat: tapa });
    t.caja([0.4, 0, 0], [10.0, 2.9, 12.8], { mat: 'ic_papel' });
    for (let k = 0; k < 3; k++) t.caja([5.42, 0, -4 + k * 4], [0.05, 2.7, 3.4], { mat: tinte('#8c7855', 'mate') });
    for (const z of [-4.5, 0, 4.5]) t.cil([-5.3, 0, z - 0.5], [-5.3, 0, z + 0.5], 2.35, 2.35, { mat: tapa, tono: 0.08 });
    // esquineras, broche y emblema
    if (e.n >= 2 || L !== 'tela') for (const [x, z] of [[5.3, 6.8], [5.3, -6.8]]) t.poli([[x, 2.2, z], [x - 2.6, 2.2, z], [x, 2.2, z - Math.sign(z) * 2.6], [x + 0.2, -2.2, z], [x - 2.6, -2.2, z], [x + 0.2, -2.2, z - Math.sign(z) * 2.6], [x + 0.35, 0, z]], { mat: met });
    t.caja([5.6, 0, 0], [0.6, 4.4, 2.0], { mat: tapa, tono: -0.05 });
    t.caja([4.2, 2.25, 0], [1.8, 0.4, 1.6], { mat: met });
    t.cil([0.4, 2.0, 0.4], [0.4, 2.6, 0.4], 2.8, 2.6, { mat: met });
    if (portal) t.cil([0.4, 2.55, 0.4], [0.4, 2.85, 0.4], 1.9, 1.9, { mat: tinte('#5ac8f0', 'luz') });
    else if (L === 'oscuro') { t.masa([t.bul([0.4, 2.9, 0.8], [1.8, 0.8, 1.7], 'ic_hueso'), t.bul([0.4, 2.9, -0.8], [1.1, 0.7, 0.9], 'ic_hueso')], 'ic_hueso', 0.8); for (const sx of [-1, 1]) t.esf([0.4 + sx * 0.7, 3.5, 0.9], 0.45, { mat: e.luz ?? 'ic_hueco' }); }
    else gemaEngastada(t, [0.4, 2.6, 0.4], 1.3, e, { engaste: met });
    if (L === 'sagrado') { t.caja([0.4, 2.2, 0.4], [1.0, 0.4, 10], { mat: 'ic_oro' }); t.caja([0.4, 2.2, 2.2], [6.6, 0.4, 1.0], { mat: 'ic_oro' }); }
    if (e.luz && !portal && L !== 'oscuro') for (let k = 0; k < 4; k++) t.caja([-3.2 + (k % 2) * 7.2, 2.2, -5 + Math.floor(k / 2) * 10], [0.9, 0.3, 0.9], { mat: e.luz, tono: tonoLuz(e, k) });
  });
  if (portal) t.luz([0, 4, 0], 8, '#5ac8f0');
}
function orbe(t: Taller, e: Estilo, d: Icono3D) {
  const col = colorDe(d.gema ?? d.encanto, e.linea === 'oscuro' ? '#d02020' : e.linea === 'sagrado' ? '#ffd86a' : '#9a6ad8', { ...GEMAS, ...ENCANTO });
  const met = metalDuro(e);
  t.en([0, 0, 0], [8, -6, 0], () => {
    const cz = 11, R = 6;
    t.esf([0, 0, cz], R, { mat: tinte(col, 'gema') });
    t.esf([-0.4, 2.2, cz + 0.3], 4.2, { mat: tinte(col, 'luz'), tono: tonoLuz(e) });
    t.elip([-2.6, 4.2, cz + 3.0], [1.0, 0.5, 0.7], { mat: 'ic_brillo', rot: [0, 0, 35] });
    // garras que lo sostienen y el pie
    for (let k = 0; k < 4; k++) {
      const a = rad(45 + k * 90), c = Math.cos(a), sn = Math.sin(a);
      const p0: V3 = [c * 2.4, sn * 2.4, 3.2], p1: V3 = [c * 5.6, sn * 5.6, cz - 3.6], p2: V3 = [c * 6.1, sn * 6.1, cz + 0.6], p3: V3 = [c * 4.4, sn * 4.4, cz + 3.2];
      t.cil(p0, p1, 0.75, 0.6, { mat: met }); t.cil(p1, p2, 0.6, 0.45, { mat: met }); t.cil(p2, p3, 0.45, 0.1, { mat: met });
    }
    t.cil([0, 0, 0], [0, 0, 1.6], 4.2, 3.6, { mat: met });
    t.cil([0, 0, 1.6], [0, 0, 3.6], 1.6, 2.6, { mat: met });
    t.aro([0, 0, 0.8], 4.0, 0.4, { mat: met, n: 16, tono: 0.05 });
    if (e.n >= 4 || e.linea === 'legendario') for (let k = 0; k < 3; k++) { const a = rad(k * 120 + 20 + CUADRO * 15); t.esf([Math.cos(a) * 8, Math.sin(a) * 8, cz + Math.sin(a * 2) * 2.5], 0.55, { mat: tinte(col, 'luz') }); }
    if (e.linea === 'oscuro') for (let k = 0; k < 4; k++) { const a = rad(k * 90); pua(t, [Math.cos(a) * 3.8, Math.sin(a) * 3.8, 1.2], [Math.cos(a), Math.sin(a), 0.4], 2.4, 0.5, met); }
  });
  t.luz([0, 0, 11], 14, col);
}
function carcaj(t: Taller, e: Estilo) {
  const L = e.linea, cuero = L === 'tela' ? e.base : L === 'oscuro' ? tinte('#1e1418', 'cuero') : L === 'sagrado' ? tinte('#d8cbb0', 'cuero') : L === 'legendario' ? e.base : blando(e);
  const met = metalDuro(e);
  const plumas = L === 'oscuro' ? '#1a1418' : L === 'sagrado' ? '#ece6d8' : L === 'legendario' ? '#c02020' : L === 'hueso' ? '#4a3a2a' : '#8a2a1a';
  t.en([0, 0, 0], [12, -6, -16], () => {
    // flechas (asoman las plumas)
    for (let k = 0; k < 6; k++) {
      const a = rad(k * 60 + 20), r = k ? 1.6 : 0, x = Math.cos(a) * r, y = Math.sin(a) * r, alto = 21 + ((k * 7) % 3) * 0.9;
      t.cil([x, y, 14], [x * 1.3, y * 1.3, alto], 0.3, 0.3, { mat: 'ic_madera' });
      for (let j = 0; j < 3; j++) { const b = rad(j * 120 + k * 25); t.elip([x * 1.3 + Math.cos(b) * 0.55, y * 1.3 + Math.sin(b) * 0.55, alto - 1.9], [0.6, 0.12, 1.9], { mat: tinte(j ? plumas : '#d8d0c0', 'tela'), rot: [j * 120 + k * 25 + 90, 0, 0] }); }
    }
    t.cil([0, 0, 0], [0, 0, 16], 3.0, 3.5, { mat: cuero });
    t.elip([0, 0, 16], [3.0, 3.0, 0.35], { mat: 'ic_hueco' });
    t.cil([0, 0, -0.6], [0, 0, 1.4], 2.9, 3.1, { mat: met });
    t.aro([0, 0, 16], 3.5, 0.45, { mat: L === 'tela' || L === 'cuero' ? e.base2 : met, n: 14 });
    for (const z of [5, 11]) t.cil([0, 0, z], [0, 0, z + 1.1], 3.18 + z * 0.03, 3.2 + z * 0.03, { mat: e.n >= 3 ? met : e.correa });
    t.masa([t.hue([2.8, -1.2, 15], [4.4, -0.8, 7.5], 0.6, 0.6, e.correa), t.hue([4.4, -0.8, 7.5], [2.8, -1.2, 1.5], 0.6, 0.6, e.correa)], e.correa, 0.3);
    if (e.tachas || e.remaches) for (let k = 0; k < 4; k++) t.esf([-0.2 + k * 0.1, 3.3, 3 + k * 3], 0.45, { mat: e.remache });
    if (e.n >= 4 || L === 'legendario') gemaEngastada(t, [0, 3.5, 8.4], 0.95, e, { engaste: met });
    if (e.luz) t.caja([0, 3.4, 13.6], [1.6, 0.3, 0.4], { mat: e.luz, tono: tonoLuz(e) });
  });
}

// ------------------------------------------------------------------ armar
function armar(d: Icono3D, t: Taller) {
  const e = estilo(d);
  switch (d.pieza) {
    case 'botas': botas(t, e); break;
    case 'pecho': pecho(t, e); break;
    case 'casco': casco(t, e); break;
    case 'capucha': capucha(t, e); break;
    case 'corona': corona(t, e); break;
    case 'guantes': guantes(t, e); break;
    case 'cinturon': cinturon(t, e); break;
    case 'hombreras': hombreras(t, e); break;
    case 'grebas': grebas(t, e); break;
    case 'escudo_redondo': escudoRedondo(t, e, d); break;
    case 'escudo_cometa': escudoCometa(t, e, d); break;
    case 'escudo_torre': escudoTorre(t, e, d); break;
    case 'escudo_calavera': escudoCalavera(t, e, d); break;
    case 'anillo': anillo(t, e, d); break;
    case 'amuleto': amuleto(t, e, d); break;
    case 'talisman': talisman(t, e, d); break;
    case 'pocion': pocion(t, e, d); break;
    case 'gema': gema(t, e, d); break;
    case 'runa': runa(t, e, d); break;
    case 'pergamino': pergamino(t, e, d); break;
    case 'llave': llave(t, e, d); break;
    case 'oro': oro(t, e); break;
    case 'libro': libro(t, e, d); break;
    case 'orbe': orbe(t, e, d); break;
    case 'flecha_carcaj': carcaj(t, e); break;
  }
  return e;
}

// ------------------------------------------------------------------ pintar
/** Cuándo un ícono se anima (cambia con el cuadro). */
const animado = (d: Icono3D) => d.linea === 'legendario' || !!d.encanto;

function escena(d: Icono3D, s: number): { piezas: Pieza[]; resplandor?: { c: V3; r: number; color: string } } {
  const t = new Taller(s, 60 * s);
  armar(d, t);
  return { piezas: t.ps, resplandor: t.resp };
}
const emite = (m?: string) => !!(m && MATERIALES[m]?.emite);
/**
 * Lo que ocupa la escena en pantalla, medido sobre la geometría (sin pintar): el contorno exacto de cada caja,
 * elipsoide, disco de cilindro y componente de masa a lo largo de los ejes de la pantalla.
 */
function medir(ps: Pieza[]): [number, number, number, number] | null {
  const AX: V3 = [1, -1, 0], AY: V3 = [0.5, 0.5, -KZ];
  const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const pon = (c: V3, ex: number, ey: number) => { const sx = dot(AX, c), sy = dot(AY, c); x0 = Math.min(x0, sx - ex); x1 = Math.max(x1, sx + ex); y0 = Math.min(y0, sy - ey); y1 = Math.max(y1, sy + ey); };
  const elip = (c: V3, e: V3[], r: number[]) => pon(c, Math.hypot(...e.map((v, i) => r[i] * dot(AX, v))), Math.hypot(...e.map((v, i) => r[i] * dot(AY, v))));
  const disco = (c: V3, n: V3, r: number) => pon(c, r * Math.sqrt(Math.max(0, dot(AX, AX) - dot(AX, n) ** 2)), r * Math.sqrt(Math.max(0, dot(AY, AY) - dot(AY, n) ** 2)));
  for (const p of ps) {
    if (p.resta) continue;
    if (p.k === 'conv') for (const q of p.pts) pon(q, 0, 0);
    else if (p.k === 'elip') elip(p.c, [p.ex, p.ey, p.ez], p.r);
    else if (p.k === 'cono') { disco(p.o, p.ez, p.r0); disco(add(p.o, p.ez, p.h), p.ez, p.r1); }
    else for (const c of p.comps) {
      const m = p.suave * 0.25;
      if (c.f === 'hueso') { pon(c.a, (c.r0 + m) * Math.SQRT2, (c.r0 + m) * Math.hypot(...AY)); pon(c.b, (c.r1 + m) * Math.SQRT2, (c.r1 + m) * Math.hypot(...AY)); }
      else elip(c.c, [c.ex, c.ey, c.ez], c.r.map((v) => v + m));
    }
  }
  return isFinite(x0) ? [x0, y0, x1, y1] : null;
}
function cajaAlfa(r: Raster): [number, number, number, number] | null {
  let x0 = r.w, y0 = r.h, x1 = -1, y1 = -1;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.data[(y * r.w + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : [x0, y0, x1, y1];
}
/** Reduce a la mitad promediando con alfa (bordes suaves de verdad). */
function mitad(r: Raster): Raster {
  const o = createRaster(Math.ceil(r.w / 2), Math.ceil(r.h / 2));
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    let a = 0, R = 0, G = 0, B = 0;
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const sx = x * 2 + i, sy = y * 2 + j;
      if (sx >= r.w || sy >= r.h) continue;
      const q = (sy * r.w + sx) * 4, al = r.data[q + 3] / 255;
      R += r.data[q] * al; G += r.data[q + 1] * al; B += r.data[q + 2] * al; a += al;
    }
    const k = (y * o.w + x) * 4;
    if (a > 0) { o.data[k] = R / a; o.data[k + 1] = G / a; o.data[k + 2] = B / a; o.data[k + 3] = Math.round((a / 4) * 255); }
  }
  return o;
}
/**
 * Acabado de arte de botín: realce de detalle (máscara de enfoque), un filo de luz en el borde que mira a la luz
 * (arriba a la izquierda), el borde contrario un poco más oscuro y algo más de contraste y color.
 */
function pulir(r: Raster): Raster {
  const o = createRaster(r.w, r.h);
  o.data.set(r.data);
  const A = (x: number, y: number) => (x < 0 || y < 0 || x >= r.w || y >= r.h ? 0 : r.data[(y * r.w + x) * 4 + 3] / 255);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const i = (y * r.w + x) * 4, a = r.data[i + 3] / 255;
    if (a < 0.05) continue;
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
      if (!j && !k) continue;
      const xx = x + k, yy = y + j;
      if (A(xx, yy) < 0.5) continue;
      const q = (yy * r.w + xx) * 4; sr += r.data[q]; sg += r.data[q + 1]; sb += r.data[q + 2]; n++;
    }
    let c: V3 = [r.data[i], r.data[i + 1], r.data[i + 2]];
    if (n) { const kk = 0.55; c = [c[0] + (c[0] - sr / n) * kk, c[1] + (c[1] - sg / n) * kk, c[2] + (c[2] - sb / n) * kk]; }
    const hacia = (1 - A(x - 1, y)) * 0.35 + (1 - A(x, y - 1)) * 0.45 + (1 - A(x - 1, y - 1)) * 0.2;
    const contra = (1 - A(x + 1, y)) * 0.4 + (1 - A(x, y + 1)) * 0.4 + (1 - A(x + 1, y + 1)) * 0.2;
    if (hacia > 0.05) c = mezC(c, [c[0] * 1.35 + 30, c[1] * 1.3 + 26, c[2] * 1.22 + 18], Math.min(1, hacia) * 0.55);
    if (contra > 0.05) c = mul(c, 1 - Math.min(1, contra) * 0.22) as V3;
    const l = lum(c);
    c = [l + (c[0] - l) * 1.15, l + (c[1] - l) * 1.15, l + (c[2] - l) * 1.15];
    c = c.map((v) => 255 * Math.pow(Math.max(0, v) / 255, 0.94) * 1.03) as V3;
    o.data[i] = c[0]; o.data[i + 1] = c[1]; o.data[i + 2] = c[2];
  }
  return o;
}
/** Desenfoque de caja separable sobre un mapa RGB en flotantes. */
function desenfocar(v: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(v.length), d = 2 * r + 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
    let s = 0;
    for (let i = -r; i <= r; i++) { const xx = x + i; if (xx >= 0 && xx < w) s += v[(y * w + xx) * 3 + c]; }
    tmp[(y * w + x) * 3 + c] = s / d;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
    let s = 0;
    for (let j = -r; j <= r; j++) { const yy = y + j; if (yy >= 0 && yy < h) s += tmp[(yy * w + x) * 3 + c]; }
    v[(y * w + x) * 3 + c] = s / d;
  }
}
/** Suma el resplandor de lo que emite (máscara `rm` del mismo tamaño que `img`): luz sobre el objeto y halo afuera. */
function resplandecer(img: Raster, rm: Raster, fuerza: number, pad = 3): Raster {
  const W = img.w + pad * 2, H = img.h + pad * 2;
  const g = new Float32Array(W * H * 3);
  for (let y = 0; y < rm.h; y++) for (let x = 0; x < rm.w; x++) {
    const q = (y * rm.w + x) * 4, a = rm.data[q + 3] / 255;
    if (!a) continue;
    const col: V3 = [rm.data[q], rm.data[q + 1], rm.data[q + 2]];
    if (lum(col) < 40) continue;
    const o = ((y + pad) * W + x + pad) * 3;
    g[o] = col[0] * a; g[o + 1] = col[1] * a; g[o + 2] = col[2] * a;
  }
  desenfocar(g, W, H, 1); desenfocar(g, W, H, 2);
  const o = createRaster(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gi = (y * W + x) * 3, G: V3 = [g[gi] * fuerza, g[gi + 1] * fuerza, g[gi + 2] * fuerza];
    const sx = x - pad, sy = y - pad, d = (y * W + x) * 4;
    const dentro = sx >= 0 && sy >= 0 && sx < img.w && sy < img.h;
    const si = dentro ? (sy * img.w + sx) * 4 : -1, sa = dentro ? img.data[si + 3] / 255 : 0;
    const gl = Math.max(G[0], G[1], G[2]) / 255;
    const ga = Math.min(0.85, gl * 1.5);
    const base: V3 = dentro ? [img.data[si], img.data[si + 1], img.data[si + 2]] : [0, 0, 0];
    const lit: V3 = [base[0] + G[0] * 0.45, base[1] + G[1] * 0.45, base[2] + G[2] * 0.45];
    const halo: V3 = gl > 0 ? [G[0] / gl, G[1] / gl, G[2] / gl] : [0, 0, 0];
    const a = sa + ga * (1 - sa);
    if (a <= 0.01) continue;
    for (let ch = 0; ch < 3; ch++) o.data[d + ch] = (lit[ch] * sa + halo[ch] * ga * (1 - sa)) / a;
    o.data[d + 3] = Math.round(a * 255);
  }
  return o;
}

const cache = new Map<string, Raster>();
/**
 * Pinta el objeto solo, de tres cuartos y de frente, del tamaño justo para llenar `w`×`h` (sin salirse). Lo legendario
 * y lo encantado laten con `cuadro` (8 cuadros); lo demás es fijo. Queda en caché por descripción, tamaño y cuadro.
 *
 * Calidad: se pinta al doble con calidad 1 (sombras suaves y oclusión) y se reduce promediando, que equivale a 2×2
 * rayos por pixel (como `ss: 2`) pero además deja el borde con alfa parcial.
 */
export function iconoObjeto3D(desc: Icono3D, w: number, h: number, cuadro = 0): Raster {
  const anim = animado(desc), f = anim ? ((cuadro % 8) + 8) % 8 : 0;
  const clave = `${JSON.stringify(desc)}|${w}|${h}|${f}`;
  const c = cache.get(clave);
  if (c) return c;
  CUADRO = f;
  w = Math.max(4, Math.floor(w)); h = Math.max(4, Math.floor(h));
  // 1) medir la geometría a escala 1 y elegir la escala que llena el rectángulo
  const m1 = medir(escena(desc, 1).piezas);
  const margen = w < 40 || h < 40 ? 1 : 2;
  const k = m1 ? Math.min((w - margen) / (m1[2] - m1[0]), (h - margen) / (m1[3] - m1[1])) : 1;
  // 2) pintar al doble y reducir
  const S = k * 2;
  const e2 = escena(desc, S);
  const rg = pintarEscena({ piezas: e2.piezas, resplandor: e2.resplandor, sinSombra: true, ss: 1 });
  let img = pulir(mitad(rg.img));
  // 3) resplandor de lo que brilla: una pasada rápida (a tamaño final) solo con lo que emite, desenfocada y sumada
  const hayLuz = e2.piezas.some((p) => emite(p.mat) || (p.k === 'masa' && p.comps.some((q) => emite(q.mat))));
  if (hayLuz) {
    const negro = (p: Pieza): Pieza => (p.k === 'masa' ? { ...p, mat: emite(p.mat) ? p.mat : 'ic_hueco', comps: p.comps.map((q) => (emite(q.mat) ? q : { ...q, mat: 'ic_hueco' })) } : emite(p.mat) ? p : { ...p, mat: 'ic_hueco' });
    const rm = pintarEscena({ piezas: escena(desc, k).piezas.map(negro), sinSombra: true, ss: 0 }, {}, { w: img.w, h: img.h, ax: rg.ancla[0] / 2, ay: rg.ancla[1] / 2 }).img;
    img = resplandecer(img, rm, desc.linea === 'legendario' ? 1.15 + 0.35 * late() : 1);
  }
  // 4) recortar a lo visible y centrar en el rectángulo pedido (sin salirse)
  const b = cajaAlfa(img);
  let out: Raster;
  if (!b) out = createRaster(1, 1);
  else {
    const bw = Math.min(w, b[2] - b[0] + 1), bh = Math.min(h, b[3] - b[1] + 1);
    const ox = b[0] + Math.floor((b[2] - b[0] + 1 - bw) / 2), oy = b[1] + Math.floor((b[3] - b[1] + 1 - bh) / 2);
    out = createRaster(bw, bh);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const s = ((y + oy) * img.w + x + ox) * 4; out.data.set(img.data.subarray(s, s + 4), (y * bw + x) * 4); }
  }
  cache.set(clave, out);
  return out;
}

// ------------------------------------------------------------------ del botín a la descripción 3D
/** La descripción 3D de un objeto del botín (null si no tiene ícono 3D: armas y mascotas van por su camino). */
export function iconoDeLoot(it: LootItem): Icono3D | null {
  const b = it.base;
  if (b.cat === 'armor') return { pieza: 'botas', linea: 'cuero', nivel: b.tier };
  return null;
}
