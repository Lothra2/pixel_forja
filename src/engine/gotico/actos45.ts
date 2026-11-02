import type { Arma } from './objeto';
import { masa, hueso, bulto, ruido, type Comp, type Pieza, type V3 } from './render';
import { MATERIALES } from './materiales';
import { personaje, type Cuerpo, type Equipo } from './cuerpo';
import type { Accion, Dir } from './figura';

/**
 * Herramientas comunes de los actos 4 y 5 (catalogo/nieve2, hielo2, infierno2 y fortaleza2): rocas orgánicas de
 * masa con ruido, fuego de lenguas que cambian por cuadro, cráneos de persona y de bestia, huesos, cadenas que
 * cuelgan en catenaria, telas que flamean con jirones, cadáveres armados con el cuerpo de los personajes (cualquier
 * pose, girados y movidos) y el teñido de piezas (lo que se ve a través del hielo).
 */

MATERIALES.a45_carbon = { rampa: ['#060505', '#0d0b0a', '#161211', '#1f1a17', '#29221e', '#342b26', '#40352f'], ruido: 0.45, escala: 0.55, brillo: 0.1 };
MATERIALES.a45_brasa = { rampa: ['#1c0604', '#330b06', '#4d1208', '#6a1b0b', '#86270f'], ruido: 0.3, escala: 0.5 };
MATERIALES.a45_cuerno = { rampa: ['#070505', '#110d0b', '#1d1712', '#2b221b', '#3b3025', '#4e4031', '#64533f'], ruido: 0.2, escala: 0.9, brillo: 0.35, patron: (p) => (Math.sin((p[0] + p[1] + p[2]) * 2.4) > 0.6 ? -0.07 : 0) };
MATERIALES.a45_piel = { rampa: ['#1a140e', '#2c2218', '#403224', '#554433', '#6b5843', '#826d55'], ruido: 0.6, escala: 0.8 };

export const PI = Math.PI, TAU = PI * 2;
export const rad = (g: number) => (g * PI) / 180;
export const deg = (r: number) => (r * 180) / PI;
export const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const esc = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const nor = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const mez = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const ciclo = (f: number, n: number) => ((f % n) + n) % n / n;
export const onda = (f: number, n: number, fase = 0) => Math.sin(ciclo(f, n) * TAU + fase);
export const jit = (a: Arma, k: number) => (a.r() - 0.5) * 2 * k;
export const elegir = <T>(a: Arma, xs: T[]): T => xs[Math.floor(a.r() * xs.length) % xs.length];
/** Punto en el plano a `ang` grados y distancia `d` del centro. */
export const polar = (ang: number, d: number, z = 0, cx = 0, cy = 0): V3 => [cx + Math.cos(rad(ang)) * d, cy + Math.sin(rad(ang)) * d, z];
/** Corta todo lo que quedó bajo el piso (se arma al final). */
export const suelo = (a: Arma) => a.caja(0, 0, -80, 900, 900, 80, { mat: 'roca', resta: true });

// ------------------------------------------------------------------ giros y traslados de grupos de piezas
/** Matriz 3×3 por columnas: las imágenes de los ejes x, y, z. */
export type M3 = [V3, V3, V3];
export const ID: M3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
export const ap = (m: M3, v: V3): V3 => [m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2], m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2], m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2]];
export const mulM = (a: M3, b: M3): M3 => [ap(a, b[0]), ap(a, b[1]), ap(a, b[2])];
/** Giro alrededor del eje unitario `k` en grados (Rodrigues). */
export function ejeAng(k: V3, g: number): M3 {
  const u = nor(k), c = Math.cos(rad(g)), s = Math.sin(rad(g));
  const R = (v: V3): V3 => { const kv = cruz(u, v), d = dot(u, v); return [v[0] * c + kv[0] * s + u[0] * d * (1 - c), v[1] * c + kv[1] * s + u[1] * d * (1 - c), v[2] * c + kv[2] * s + u[2] * d * (1 - c)]; };
  return [R([1, 0, 0]), R([0, 1, 0]), R([0, 0, 1])];
}
/** Primero inclina sobre x (ix) y sobre y (iy), después gira sobre la vertical (giro), todo en grados. */
export const rotM = (giro = 0, ix = 0, iy = 0): M3 => mulM(ejeAng([0, 0, 1], giro), mulM(ejeAng([0, 1, 0], iy), ejeAng([1, 0, 0], ix)));

/** Lleva las piezas por la matriz `m`, las escala `s` (uniforme) y las mueve a `t`. */
export function transformar(ps: Pieza[], m: M3, t: V3 = [0, 0, 0], s = 1): Pieza[] {
  const P = (v: V3) => add(esc(ap(m, v), s), t), D = (v: V3) => ap(m, v);
  return ps.map((p): Pieza => {
    if (p.k === 'conv') return { ...p, planos: p.planos.map(([n, d]) => { const nn = D(n); return [nn, d * s + dot(nn, t)] as [V3, number]; }), pts: p.pts.map(P) };
    if (p.k === 'cono') return { ...p, o: P(p.o), ex: D(p.ex), ey: D(p.ey), ez: D(p.ez), h: p.h * s, r0: p.r0 * s, r1: p.r1 * s };
    if (p.k === 'elip') return { ...p, c: P(p.c), ex: D(p.ex), ey: D(p.ey), ez: D(p.ez), r: esc(p.r, s) };
    const comps = p.comps.map((q): Comp => (q.f === 'hueso'
      ? hueso(P(q.a), P(q.b), q.r0 * s, q.r1 * s, { mat: q.mat, tono: q.tono, k: q.k === undefined ? undefined : q.k * s })
      : { ...q, c: P(q.c), sc: P(q.sc), sr: q.sr * s, r: esc(q.r, s), ex: D(q.ex), ey: D(q.ey), ez: D(q.ez), k: q.k === undefined ? undefined : q.k * s }));
    return masa(comps, { mat: p.mat, tono: p.tono, suave: p.suave * s });
  });
}
/** Caja que envuelve las piezas (aproximada: centros y radios). */
export function envolver(ps: Pieza[]): [V3, V3] {
  const lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
  const meter = (c: V3, r = 0) => { for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], c[i] - r); hi[i] = Math.max(hi[i], c[i] + r); } };
  for (const p of ps) {
    if (p.resta) continue;
    if (p.k === 'conv') p.pts.forEach((q) => meter(q));
    else if (p.k === 'cono') { meter(p.o, Math.max(p.r0, p.r1)); meter(add(p.o, p.ez, p.h), Math.max(p.r0, p.r1)); }
    else if (p.k === 'elip') meter(p.c, Math.max(...p.r));
    else for (const c of p.comps) meter(c.sc, c.sr * 0.8);
  }
  return [lo, hi];
}

// ------------------------------------------------------------------ teñido (lo que se ve a través del hielo, lo quemado)
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const aHex = (c: number[]) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
/**
 * Copia de las piezas con cada material mezclado hacia el color `hacia` (k de 0 a 1) y aclarado `luz` (-1..1). Los
 * materiales nuevos se registran una vez con el prefijo. Así un guerrero metido en el hielo sale azulado y lavado.
 */
export function tenir(ps: Pieza[], pref: string, hacia: string, k: number, luz = 0, brillo?: number): Pieza[] {
  const h = hex(hacia);
  const mat = (m?: string) => {
    if (!m) return m;
    const id = `${pref}_${m}`;
    if (!MATERIALES[id]) {
      const o = MATERIALES[m] ?? MATERIALES.piedra;
      const rampa = o.rampa.map((c) => { const x = hex(c); return aHex(x.map((v, i) => { const w = v + (h[i] - v) * k; return luz >= 0 ? w + (255 - w) * luz : w * (1 + luz); })); });
      MATERIALES[id] = { ...o, rampa, emite: o.emite, brillo: brillo ?? o.brillo, ruido: o.ruido * (1 - k * 0.4) };
    }
    return id;
  };
  return ps.map((p): Pieza => (p.k === 'masa' ? masa(p.comps.map((q) => ({ ...q, mat: mat(q.mat) })), { mat: mat(p.mat)!, tono: p.tono, suave: p.suave }) : { ...p, mat: mat(p.mat)! }));
}

// ------------------------------------------------------------------ cuerpos (los mismos de los personajes, en cualquier pose)
export const CUERPOS: Record<string, Cuerpo> = {
  barbaro: { genero: 'h', ancho: 1.12, musculo: 0.9, piel: 'cu_piel', pelo: 'cu_pelo_castano', peinado: 'melena', barba: 'trenzada' },
  barbaro_rubio: { genero: 'h', ancho: 1.1, musculo: 0.85, piel: 'cu_piel_clara', pelo: 'cu_pelo_rubio', peinado: 'trenzas', barba: 'larga' },
  soldado: { genero: 'h', musculo: 0.5, piel: 'cu_piel_clara', pelo: 'cu_pelo_castano', peinado: 'corto', barba: 'corta' },
  soldado_moreno: { genero: 'h', musculo: 0.45, piel: 'cu_piel_morena', pelo: 'cu_pelo_negro', peinado: 'rapado', barba: 'bigote' },
  muerto: { genero: 'h', musculo: 0.2, demacrado: true, piel: 'cu_piel_gris', pelo: 'cu_pelo_negro', peinado: 'largo', ojos: 'cu_ojo' },
  palido: { genero: 'h', musculo: 0.3, demacrado: true, piel: 'cu_piel_palida', pelo: 'cu_pelo_blanco', peinado: 'largo', barba: 'larga' },
  mujer: { genero: 'm', ancho: 0.92, musculo: 0.3, piel: 'cu_piel_clara', pelo: 'cu_pelo_rojo', peinado: 'trenzas' },
  esqueleto: { oseo: true, piel: 'cu_hueso', ojos: 'cu_ojo', ancho: 0.95 },
  desollado: { piel: 'carne', parches: 'sangre', ojos: 'cu_ojo', demacrado: true, joroba: 0.3, musculo: 0.8, peinado: 'calvo', heridas: true },
  calcinado: { piel: 'a45_carbon', parches: 'a45_brasa', ojos: 'cu_ojo', demacrado: true, musculo: 0.4, peinado: 'calvo' },
  demonio: { boca: 'fauces', garras: true, alto: 1.25, ancho: 1.2, musculo: 1, piel: 'cu_piel_roja', ojos: 'cu_ojo', cuernos: 'demonio', cola: 'cu_piel_roja', orejas: 'puntiagudas', peinado: 'calvo' },
  diablillo: { boca: 'colmillos', alto: 0.62, ancho: 0.82, musculo: 0.6, piel: 'cu_piel_roja', ojos: 'cu_ojo', cuernos: 'cortos', orejas: 'puntiagudas', cola: 'cu_piel_roja', cabeza: 1.25 },
};
export const EQUIPOS: Record<string, Equipo> = {
  barbaro: { piernas: { tipo: 'pantalon', mat: 'cu_cuero_negro' }, pies: { tipo: 'botas', mat: 'cu_cuero' }, manos: { tipo: 'brazales', mat: 'cu_cuero' }, hombros: { tipo: 'pieles', mat: 'cu_pelaje' }, cinturon: { mat: 'cu_cuero', hebilla: 'hierro' } },
  barbaro_hacha: { piernas: { tipo: 'pantalon', mat: 'cu_tela_parda' }, pies: { tipo: 'vendas', mat: 'cu_pelaje_gris' }, hombros: { tipo: 'pieles', mat: 'cu_pelaje_gris' }, cinturon: { mat: 'cu_cuero' }, cabeza: { tipo: 'cuernos', mat: 'cu_placa_oscura' }, arma: { tipo: 'hacha', mat: 'hierro', mango: 'madera' } },
  barbaro_espada: { torso: { tipo: 'cuero', mat: 'cu_cuero' }, piernas: { tipo: 'pantalon', mat: 'cu_pelaje' }, pies: { tipo: 'botas', mat: 'cu_pelaje' }, hombros: { tipo: 'pieles', mat: 'cu_pelaje' }, cinturon: { mat: 'cu_cuero_negro' }, arma: { tipo: 'espada', mat: 'hierro', mango: 'cu_cuero' }, izq: { tipo: 'escudo_redondo', mat: 'madera_vieja', mat2: 'hierro' } },
  soldado: { torso: { tipo: 'malla', mat: 'cu_malla' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_parda' }, pies: { tipo: 'botas', mat: 'cu_cuero' }, cinturon: { mat: 'cu_cuero' }, cabeza: { tipo: 'casco', mat: 'cu_placa_oscura' }, tabardo: { mat: 'cu_tela_roja' } },
  soldado_lanza: { torso: { tipo: 'malla', mat: 'cu_malla' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_negra' }, pies: { tipo: 'botas', mat: 'cu_cuero_negro' }, cinturon: { mat: 'cu_cuero' }, cabeza: { tipo: 'casco', mat: 'hierro' }, tabardo: { mat: 'cu_tela_azul' }, arma: { tipo: 'lanza', mat: 'hierro', mango: 'madera' } },
  caballero: { torso: { tipo: 'placas', mat: 'cu_placa', mat2: 'cu_malla' }, piernas: { tipo: 'grebas', mat: 'cu_placa', mat2: 'cu_malla' }, pies: { tipo: 'sabatones', mat: 'cu_placa' }, manos: { tipo: 'guanteletes', mat: 'cu_placa' }, hombros: { tipo: 'placas', mat: 'cu_placa' }, cabeza: { tipo: 'yelmo', mat: 'cu_placa' }, tabardo: { mat: 'cu_tela_azul', borde: 'cu_oro' }, arma: { tipo: 'espada', mat: 'cu_placa' }, izq: { tipo: 'escudo_cometa', mat: 'cu_tela_azul', mat2: 'cu_oro' } },
  arquero: { torso: { tipo: 'cuero', mat: 'cu_cuero' }, piernas: { tipo: 'calzas', mat: 'cu_tela_verde' }, pies: { tipo: 'botas_altas', mat: 'cu_cuero' }, cinturon: { mat: 'cu_cuero_negro' }, cabeza: { tipo: 'capucha', mat: 'cu_tela_verde' }, arma: { tipo: 'arco', mango: 'madera' } },
  preso: { torso: { tipo: 'harapos', mat: 'cu_tela_parda' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_parda' } },
  harapos: { torso: { tipo: 'harapos', mat: 'cu_tela_negra' }, piernas: { tipo: 'taparrabo', mat: 'cu_tela_parda' } },
  nada: {},
  oxidado: { torso: { tipo: 'placas', mat: 'hierro_oxido', mat2: 'cu_malla' }, cabeza: { tipo: 'casco', mat: 'hierro_oxido' }, arma: { tipo: 'espada', mat: 'hierro_oxido', mango: 'cu_cuero' } },
  demonio: { piernas: { tipo: 'taparrabo', mat: 'cu_cuero_negro' }, hombros: { tipo: 'puas', mat: 'hierro_oxido' } },
};
export interface OpcCuerpo { cu: Cuerpo; eq: Equipo; acc?: Accion; f?: number; dir?: Dir; m?: M3; t?: V3; s?: number; centrar?: boolean }
/**
 * Un cuerpo de personaje en la pose de una acción y un cuadro (morir 7 tendido, morir 3 de rodillas, quieto 0 de pie,
 * atacar 5 con el arma arriba), centrado en el plano, girado por `m`, escalado y llevado a `t`.
 */
export function cuerpo(o: OpcCuerpo): Pieza[] {
  // tendido, el tabardo y la capa se pararían en el aire: se le sacan
  const eq = o.acc === 'morir' && (o.f ?? 0) >= 5 ? { ...o.eq, tabardo: undefined, capa: undefined } : o.eq;
  let ps = personaje(o.cu, eq, o.dir ?? 'se', o.acc ?? 'quieto', o.f ?? 0);
  if (o.centrar !== false) { const [lo, hi] = envolver(ps); ps = transformar(ps, ID, [-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, 0]); }
  return transformar(ps, o.m ?? ID, o.t ?? [0, 0, 0], o.s ?? 1);
}

// ------------------------------------------------------------------ roca orgánica
export interface OpcRoca { mat: string; n?: number; giro?: number; tono?: number; suave?: number; cubre?: string; cubreAlto?: number; aplasta?: number }
/**
 * Roca de masa: un bulto mayor con bultos de ruido pegados que la abollan y, si `cubre` (nieve, ceniza, escarcha), un
 * manto que se funde con ella arriba. `r` son los radios del bulto mayor.
 */
export function roca(a: Arma, c: V3, r: V3, o: OpcRoca): Pieza {
  const g = o.giro ?? a.r() * 360, cs: Comp[] = [];
  const L = (v: V3): V3 => { const cg = Math.cos(rad(g)), sg = Math.sin(rad(g)); return [c[0] + v[0] * cg - v[1] * sg, c[1] + v[0] * sg + v[1] * cg, c[2] + v[2]]; };
  cs.push(bulto(c, r, { giro: g, mat: o.mat }));
  const n = o.n ?? 7;
  for (let i = 0; i < n; i++) {
    const th = a.r() * TAU, w = -0.35 + a.r() * 1.2, q = Math.sqrt(Math.max(0, 1 - w * w)), k = 0.55 + a.r() * 0.3;
    const d: V3 = [Math.cos(th) * q * r[0] * k, Math.sin(th) * q * r[1] * k, w * r[2] * k * (o.aplasta ?? 1)];
    const s = 0.32 + a.r() * 0.3;
    cs.push(bulto(L(d), [r[0] * s * (0.8 + a.r() * 0.5), r[1] * s * (0.8 + a.r() * 0.5), r[2] * s * (0.7 + a.r() * 0.5)], { giro: a.r() * 180, mat: o.mat, tono: jit(a, 0.07) }));
  }
  if (o.cubre) {
    const h = o.cubreAlto ?? 0.32;
    cs.push(bulto(L([jit(a, r[0] * 0.12), jit(a, r[1] * 0.12), r[2] * 0.78]), [r[0] * 0.78, r[1] * 0.72, r[2] * h], { giro: a.r() * 180, mat: o.cubre, k: 2 }));
    for (let i = 0; i < 3; i++) { const th = a.r() * TAU; cs.push(bulto(L([Math.cos(th) * r[0] * 0.5, Math.sin(th) * r[1] * 0.5, r[2] * 0.55]), [r[0] * 0.4, r[1] * 0.35, r[2] * h * 0.6], { giro: deg(th), mat: o.cubre })); }
  }
  return masa(cs, { mat: o.mat, tono: o.tono, suave: o.suave ?? Math.min(r[0], r[1], r[2]) * 0.45 });
}
/** Peña facetada (cáscara convexa de puntos sobre un elipsoide): piedra quebrada, obsidiana, hielo. */
export function pena(a: Arma, x: number, y: number, z: number, rx: number, ry: number, rz: number, o: { mat: string; giro?: number; tono?: number; n?: number }): Pieza {
  const g = rad(o.giro ?? a.r() * 360), c = Math.cos(g), s = Math.sin(g);
  const loc: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (let i = 0; i < (o.n ?? 8); i++) { const th = a.r() * TAU, w = a.r() * 2 - 1, q = Math.sqrt(1 - w * w); loc.push([Math.cos(th) * q, Math.sin(th) * q, w]); }
  const pts: V3[] = loc.map(([lx, ly, lz]) => { const k = 0.84 + a.r() * 0.16; const px = lx * rx * k, py = ly * ry * k; return [x + px * c - py * s, y + px * s + py * c, z + Math.max(-0.8, Math.min(0.72, lz)) * rz * k]; });
  return a.poliedro(pts, { mat: o.mat, tono: o.tono });
}
/** Prisma de seis caras con punta, de `base` hacia `dir` (cristales, carámbanos, agujas). */
export function prisma(a: Arma, base: V3, dir: V3, largo: number, r: number, mat: string, tono = 0, lados = 6): Pieza {
  const d = nor(dir), t: V3 = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], u = nor(cruz(t, d)), w = cruz(d, u);
  const rot = a.r() * PI, pts: V3[] = [];
  for (let k = 0; k < lados; k++) {
    const an = rot + (k * TAU) / lados, o = add(esc(u, Math.cos(an) * r), w, Math.sin(an) * r);
    pts.push(add(add(base, o), d, -2), add(add(base, esc(o, 0.94)), d, largo * 0.72));
  }
  pts.push(add(base, d, largo));
  return a.poliedro(pts, { mat, tono });
}
/** Manto bajo e irregular en el piso (nieve, ceniza, escarcha, sangre): una masa de bultos chatos. */
export function manto(a: Arma, rx: number, ry: number, n: number, mat: string, alto = 2.2, o: { x?: number; y?: number; tono?: number } = {}): Pieza {
  const cs: Comp[] = [];
  for (let i = 0; i < n; i++) {
    const t = a.r() * TAU, q = Math.sqrt(a.r()) * 0.6;
    cs.push(bulto([(o.x ?? 0) + Math.cos(t) * rx * q, (o.y ?? 0) + Math.sin(t) * ry * q, 0], [rx * (0.35 + a.r() * 0.25), ry * (0.35 + a.r() * 0.25), alto * (0.5 + a.r() * 0.6)], { giro: a.r() * 180 }));
  }
  return masa(cs, { mat, tono: o.tono ?? -0.06, suave: Math.min(rx, ry) * 0.3 });
}
/** Tronco con la corteza abollada y los cortes claros en las puntas. */
export function tronco(a: Arma, ps: Pieza[], p: V3, q: V3, r: number, o: { mat?: string; corte?: string; cortes?: boolean; nudos?: number } = {}) {
  const m = mez(p, q, 0.5), d = nor(sub(q, p)), lat = nor(Math.abs(d[2]) > 0.9 ? cruz(d, [1, 0, 0]) : cruz(d, [0, 0, 1]));
  const mm = add(m, lat, jit(a, r * 0.25));
  const cs: Comp[] = [hueso(p, mm, r, r * 0.96), hueso(mm, q, r * 0.96, r * 0.9)];
  for (let i = 0; i < (o.nudos ?? 2); i++) { const t = 0.2 + a.r() * 0.6, c = mez(p, q, t), w = nor(add(esc(lat, Math.cos(i * 2.4)), cruz(d, lat), Math.sin(i * 2.4))); cs.push(bulto(add(c, w, r * 0.75), [r * 0.45, r * 0.4, r * 0.4], { eje: w })); }
  ps.push(masa(cs, { mat: o.mat ?? 'corteza', suave: r * 0.5 }));
  if (o.cortes !== false) for (const [e, s] of [[p, -1], [q, 1]] as [V3, number][]) ps.push(a.cilindro(...add(e, d, s * 0.1), r * (s < 0 ? 0.92 : 0.84), 0.6, { mat: o.corte ?? 'madera_lisa', eje: esc(d, s), tono: 0.12 }));
}

// ------------------------------------------------------------------ fuego
/**
 * Lengua de fuego orgánica (la de jefes.ts con material propio): tramos de hueso que se afinan y se tuercen con un
 * ruido que da la vuelta con el cuadro (el ciclo cierra sin salto); cambian de forma en cada cuadro.
 */
export function lengua(base: V3, dir: V3, alto: number, ancho: number, f: number, n: number, sem: number, o: { mat?: string; viento?: V3; tono?: number; tramos?: number } = {}): Pieza {
  const ph = (f / n) * TAU, cx = Math.cos(ph) * 1.4, cy = Math.sin(ph) * 1.4, mat = o.mat ?? 'fuego';
  const R = (i: number, c: number) => ruido(sem * 3.7 + cx + c * 5.3, sem * 1.9 + cy + i * 0.83, c * 2.9 + i * 0.31) - 0.5;
  const N = o.tramos ?? 5, tono = o.tono ?? 0, viento = o.viento ?? [0, 0, 0];
  const d = nor(dir), lat = nor(Math.abs(d[2]) > 0.9 ? cruz(d, [1, 0, 0]) : cruz(d, [0, 0, 1])), lat2 = cruz(d, lat);
  const comps: Comp[] = [];
  const tira = (p0: V3, d0: V3, h: number, w: number, nt: number, c0: number, t0: number) => {
    let p = p0, dd = d0;
    for (let i = 0; i < nt; i++) {
      const t = i / nt, r = w * Math.pow(1 - t, 0.85) * (0.85 + 0.4 * (R(i + c0, 1) + 0.5)), r1 = w * Math.pow(1 - (i + 1) / nt, 0.85) * 0.9 + 0.1;
      dd = nor(add(add(add(add(dd, lat, R(i + c0, 2) * (0.5 + t)), lat2, R(i + c0, 3) * (0.5 + t)), viento, 0.1 + t * 0.25), d, 0.45));
      const q = add(p, dd, h / nt);
      comps.push(hueso(p, q, r, r1, { mat, tono: tono + t0 - 0.05 - t * 0.5 }));
      p = q;
    }
  };
  const h = alto * (0.75 + 0.6 * (R(0, 0) + 0.5));
  tira(base, d, h, ancho, N, 0, 0);
  for (const sg of [1, -1]) {
    const hl = h * (0.4 + 0.3 * (R(7, sg + 4) + 0.5)), dl = nor(add(add(d, lat, sg * (0.45 + 0.3 * R(8, sg + 4))), lat2, R(9, sg + 4) * 0.6));
    tira(add(add(base, d, h * 0.12), lat, sg * ancho * 0.5), dl, hl, ancho * 0.62, Math.max(2, N - 3), 10 + sg * 5, -0.08);
  }
  return masa(comps, { mat, suave: Math.max(1, ancho * 0.7) });
}
/**
 * Fuego completo: un corazón muy claro, un anillo de lenguas que bailan cada una a su ritmo, una lengua central más
 * alta y chispas que suben y se apagan. `s` es la escala (1 = fogata de mano, 3 = hoguera grande).
 */
export function fuego(a: Arma, ps: Pieza[], c: V3, s: number, f: number, n: number, o: { mat?: string; lenguas?: number; sem?: number; chispas?: number; viento?: V3; alto?: number } = {}) {
  const mat = o.mat ?? 'fuego', sem = o.sem ?? a.r() * 50, k = o.lenguas ?? 4, alto = o.alto ?? 1;
  ps.push(a.elipsoide(c[0], c[1], c[2] + s * 0.6, s * 2.1, s * 2.1, s * 1.1, { mat, tono: 0.25 }));
  ps.push(lengua(add(c, [0, 0, s * 0.4]), [0, 0, 1], s * 6.5 * alto, s * 1.5, f, n, sem, { mat, viento: o.viento, tono: 0.08 }));
  for (let i = 0; i < k; i++) {
    const an = (i / k) * TAU + sem, b = add(c, [Math.cos(an) * s * 1.3, Math.sin(an) * s * 1.3, s * 0.2]);
    ps.push(lengua(b, [Math.cos(an) * 0.35, Math.sin(an) * 0.35, 1], s * (3.4 + (i % 3) * 0.6) * alto, s * 1.05, f, n, sem + i * 7.3 + 1, { mat, viento: o.viento, tramos: 4 }));
  }
  for (let i = 0; i < (o.chispas ?? 3); i++) {
    const u = ciclo(f + i * (n / (o.chispas ?? 3)), n), an = sem * 3 + i * 2.1;
    ps.push(a.esfera(c[0] + Math.cos(an + u * 2) * s * (0.8 + u * 1.5), c[1] + Math.sin(an + u * 2) * s * (0.8 + u * 1.5), c[2] + s * (4 + u * 9) * alto, s * 0.32 * (1 - u * 0.6), { mat, tono: 0.3 - u * 0.4 }));
  }
}
/** Brasas y ceniza al rojo (lo que queda debajo del fuego): masa de bultos de carbón con vetas encendidas. */
export function brasas(a: Arma, ps: Pieza[], c: V3, r: number, f = 0, n = 1, mat = 'lava') {
  const cs: Comp[] = [];
  for (let i = 0; i < 9; i++) { const t = a.r() * TAU, q = Math.sqrt(a.r()) * r * 0.75; cs.push(bulto([c[0] + Math.cos(t) * q, c[1] + Math.sin(t) * q, c[2] + 0.6], [r * 0.32, r * 0.24, r * 0.16 + a.r() * r * 0.1], { giro: a.r() * 180, mat: a.r() < 0.4 ? mat : 'a45_carbon', tono: a.r() < 0.4 ? -0.1 + onda(f, n, i) * 0.1 : 0 })); }
  ps.push(masa(cs, { mat: 'a45_carbon', suave: r * 0.2 }));
}

// ------------------------------------------------------------------ huesos
/** Cráneo de persona mirando hacia `phi` (grados), inclinado `incl` (hacia adelante), con o sin mandíbula. */
export function craneo(a: Arma, ps: Pieza[], c: V3, s: number, phi = 45, o: { mat?: string; incl?: number; mandibula?: boolean; ojos?: string; ladeo?: number } = {}) {
  const mat = o.mat ?? 'hueso', loc: Pieza[] = [];
  const cs: Comp[] = [bulto([0, 0, 0], [1.05, 0.88, 0.92]), bulto([0.62, 0, -0.38], [0.5, 0.62, 0.5]), hueso([0.55, 0, -0.62], [0.75, 0, -0.78], 0.42, 0.38)];
  for (const l of [-1, 1]) cs.push(bulto([0.6, l * 0.55, -0.35], [0.28, 0.2, 0.22]));
  if (o.mandibula !== false) cs.push(hueso([0.25, -0.5, -0.75], [0.78, 0, -1.08], 0.16, 0.2), hueso([0.25, 0.5, -0.75], [0.78, 0, -1.08], 0.16, 0.2));
  loc.push(masa(cs.map((q) => (q.f === 'hueso' ? hueso(esc(q.a, s), esc(q.b, s), q.r0 * s, q.r1 * s) : { ...q, c: esc(q.c, s), sc: esc(q.sc, s), sr: q.sr * s, r: esc(q.r, s) })), { mat, suave: s * 0.35 }));
  const neg = o.ojos ?? 'negro';
  for (const l of [-1, 1]) loc.push(a.elipsoide(0.78 * s, l * 0.36 * s, -0.12 * s, 0.26 * s, 0.24 * s, 0.24 * s, { mat: neg }));
  loc.push(a.elipsoide(1.0 * s, 0, -0.42 * s, 0.12 * s, 0.1 * s, 0.16 * s, { mat: 'negro' }));
  loc.push(a.caja(0.98 * s, 0, -0.84 * s, 0.16 * s, 0.7 * s, 0.1 * s, { mat: 'negro' }));
  ps.push(...transformar(loc, rotM(phi, o.ladeo ?? 0, o.incl ?? 0), c));
}
export type Cuernos = 'carnero' | 'toro' | 'demonio' | 'ciervo' | 'ninguno';
/**
 * Cráneo de bestia (largo, con hocico, cuencas a los costados y cuernos) mirando hacia `phi`. `s` ≈ media cabeza de
 * largo. Los cuernos son masa: espiral del carnero, curva del toro, astas del ciervo o púas del demonio.
 */
export function craneoBestia(a: Arma, ps: Pieza[], c: V3, s: number, phi = 45, o: { cuernos?: Cuernos; mat?: string; matCuerno?: string; colmillos?: boolean; ojos?: string; incl?: number } = {}) {
  const mat = o.mat ?? 'hueso', mc = o.matCuerno ?? 'a45_cuerno', loc: Pieza[] = [];
  const cs: Comp[] = [bulto([0, 0, 0], [0.9 * s, 0.75 * s, 0.7 * s], { mat }), hueso([0.3 * s, 0, -0.1 * s], [1.9 * s, 0, -0.35 * s], 0.5 * s, 0.28 * s, { mat }), bulto([1.1 * s, 0, 0.05 * s], [0.6 * s, 0.32 * s, 0.25 * s], { mat })];
  for (const l of [-1, 1]) cs.push(bulto([0.35 * s, l * 0.55 * s, -0.25 * s], [0.4 * s, 0.25 * s, 0.25 * s], { mat }));
  // mandíbula de abajo, un poco abierta
  for (const l of [-1, 1]) cs.push(hueso([-0.1 * s, l * 0.45 * s, -0.5 * s], [1.6 * s, l * 0.12 * s, -0.75 * s], 0.16 * s, 0.12 * s, { mat }));
  loc.push(masa(cs, { mat, suave: s * 0.25 }));
  for (const l of [-1, 1]) loc.push(a.elipsoide(0.45 * s, l * 0.6 * s, 0.12 * s, 0.26 * s, 0.18 * s, 0.22 * s, { mat: o.ojos ?? 'negro' }));
  loc.push(a.elipsoide(1.88 * s, 0, -0.22 * s, 0.1 * s, 0.16 * s, 0.12 * s, { mat: 'negro' }));
  if (o.colmillos) for (const l of [-1, 1]) loc.push(masa([hueso([1.4 * s, l * 0.25 * s, -0.45 * s], [1.6 * s, l * 0.3 * s, -1.1 * s], 0.09 * s, 0.03 * s)], { mat, suave: 0.3 }));
  const cu = o.cuernos ?? 'ninguno';
  for (const l of [-1, 1]) {
    const pts: V3[] = [];
    if (cu === 'carnero') for (let i = 0; i <= 7; i++) { const t = i / 7, an = t * 1.7 * PI; pts.push([-0.2 * s + Math.sin(an) * -0.8 * s * (1 - t * 0.35), l * (0.6 + t * 0.55) * s, 0.4 * s + Math.cos(an) * 0.8 * s * (1 - t * 0.35) - 0.5 * s * t]); }
    else if (cu === 'toro') for (let i = 0; i <= 5; i++) { const t = i / 5; pts.push([(-0.1 + t * 0.6 * t) * s, l * (0.6 + t * 1.5) * s, (0.3 + Math.sin(t * PI * 0.8) * 0.9) * s]); }
    else if (cu === 'demonio') for (let i = 0; i <= 5; i++) { const t = i / 5; pts.push([(-0.2 - t * 1.2) * s, l * (0.5 + t * 0.55) * s, (0.4 + t * 1.6 - t * t * 0.4) * s]); }
    else if (cu === 'ciervo') for (let i = 0; i <= 4; i++) { const t = i / 4; pts.push([(-0.2 - t * 0.6) * s, l * (0.5 + t * 0.9) * s, (0.5 + t * 2.0) * s]); }
    if (!pts.length) continue;
    const r0 = cu === 'ciervo' ? 0.16 * s : 0.32 * s, hs: Comp[] = [];
    for (let i = 0; i < pts.length - 1; i++) { const t0 = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1); hs.push(hueso(pts[i], pts[i + 1], r0 * (1 - t0 * 0.85), r0 * (1 - t1 * 0.85) + 0.15)); }
    if (cu === 'ciervo') for (let k = 1; k < 4; k++) { const p = pts[k]; hs.push(hueso(p, add(p, [0.5 * s, l * 0.15 * s, 0.7 * s]), r0 * 0.6, 0.12)); }
    loc.push(masa(hs, { mat: mc, suave: s * 0.12 }));
  }
  ps.push(...transformar(loc, rotM(phi, 0, o.incl ?? 0), c));
}
/** Hueso largo con las dos cabezas fundidas. */
export function huesoLargo(ps: Pieza[], p: V3, q: V3, r: number, mat = 'hueso') {
  const d = nor(sub(q, p)), l = nor(Math.abs(d[2]) > 0.9 ? cruz(d, [1, 0, 0]) : cruz(d, [0, 0, 1]));
  ps.push(masa([hueso(p, q, r, r * 0.85), bulto(add(p, l, r * 0.7), [r * 1.2, r * 1.2, r * 1.2]), bulto(add(p, l, -r * 0.7), [r * 1.1, r * 1.1, r * 1.1]), bulto(add(q, l, r * 0.6), [r * 1.1, r * 1.1, r * 1.1]), bulto(add(q, l, -r * 0.6), [r, r, r])], { mat, suave: r * 0.8 }));
}
/**
 * Costillar: columna de vértebras a lo largo de `phi` (grados) en `c` y costillas que bajan en arco a los dos lados
 * hasta `alto` más abajo (por defecto R). L es el largo de la columna y R lo que se abren las costillas.
 */
export function costillar(a: Arma, ps: Pieza[], c: V3, L: number, R: number, phi: number, o: { mat?: string; n?: number; grueso?: number; rotas?: number; alto?: number } = {}) {
  const mat = o.mat ?? 'hueso', n = o.n ?? 8, g = o.grueso ?? R * 0.07, loc: Pieza[] = [];
  const vs: Comp[] = [];
  for (let i = 0; i <= n + 2; i++) { const x = -L / 2 + (i / (n + 2)) * L; vs.push(bulto([x, 0, 0], [L / (n + 2) * 0.42, g * 1.7, g * 1.9])); vs.push(bulto([x, 0, g * 2.2], [g * 0.6, g * 0.5, g * 1.4])); }
  loc.push(masa(vs, { mat, suave: g * 0.8 }));
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + ((i + 1.5) / (n + 2)) * L, k = Math.sin(((i + 1) / (n + 1)) * PI) * 0.45 + 0.6;
    for (const l of [-1, 1]) {
      if (a.r() < (o.rotas ?? 0)) continue;
      const hs: Comp[] = [], m = 7, corte = a.r() < (o.rotas ?? 0) * 2 ? 0.6 : 1;
      let prev: V3 = [x, l * g, 0];
      const H = o.alto ?? R, am = PI * 0.62;
      for (let j = 1; j <= m * corte; j++) { const t = j / m, an = t * am; const q: V3 = [x - t * R * 0.2, l * (Math.sin(an) / Math.sin(am)) * R * k, -((1 - Math.cos(an)) / (1 - Math.cos(am))) * H * (0.75 + k * 0.25)]; hs.push(hueso(prev, q, g * (1 - t * 0.4), g * (1 - (t + 1 / m) * 0.4))); prev = q; }
      loc.push(masa(hs, { mat, suave: g * 0.5 }));
    }
  }
  ps.push(...transformar(loc, rotM(phi), c));
}

// ------------------------------------------------------------------ cadenas y telas
/** Puntos de una cuerda o cadena colgando de p a q con una caída (flecha) en el medio. */
export function catenaria(p: V3, q: V3, caida: number, n = 10): V3[] {
  return Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return add(mez(p, q, t), [0, 0, -caida * 4 * t * (1 - t)]); });
}
/** Eslabones a lo largo de una polilínea (se remuestrea al paso), alternando el plano de cada uno. */
export function cadena(a: Arma, ps: Pieza[], pts: V3[], paso = 2.6, grueso = 0.55, mat = 'hierro') {
  const largos = [0];
  for (let i = 1; i < pts.length; i++) largos.push(largos[i - 1] + len(sub(pts[i], pts[i - 1])));
  const total = largos[largos.length - 1], n = Math.max(1, Math.floor(total / paso));
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) * (total / n);
    while (j < pts.length - 2 && largos[j + 1] < s) j++;
    const t = (s - largos[j]) / Math.max(1e-6, largos[j + 1] - largos[j]), c = mez(pts[j], pts[j + 1], t), d = nor(sub(pts[j + 1], pts[j]));
    const lat = nor(Math.abs(d[2]) > 0.9 ? cruz(d, [1, 0, 0]) : cruz(d, [0, 0, 1])), w = i % 2 ? lat : cruz(d, lat);
    const L = total / n;
    // eslabón: un óvalo chato a lo largo de la cadena, cada uno en el plano cruzado del anterior
    ps.push(...transformar([a.elipsoide(0, 0, 0, L * 0.62, L * 0.36 + grueso * 0.5, grueso, { mat, tono: i % 2 ? 0.04 : -0.04 })], [d, w, cruz(d, w)], c));
  }
}
export interface OpcTela {
  /** esquina de arriba al principio de la barra, dirección de la barra, abajo (por defecto vertical) */
  p0: V3; u: V3; abajo?: V3;
  ancho: number; alto: number; nu?: number; nv?: number;
  f: number; n: number; mat: string; amp?: number; fase?: number;
  /** 0..1: cuánto se rompe el borde de abajo y cuántos agujeros tiene */
  jirones?: number; grosor?: number; viento?: number;
  /** material por celda (emblemas, franjas); undefined deja el de la tela */
  dibujo?: (u: number, v: number) => string | undefined;
  /** punta: la tela termina en pico (gallardete) */
  punta?: boolean;
}
/**
 * Tela que flamea: una grilla de celdas finas cuyas esquinas ondulan con el cuadro (más abajo, más se mueve) y se
 * corren con el viento; el borde de abajo sale desgarrado y con agujeros según la semilla.
 */
export function tela(a: Arma, ps: Pieza[], o: OpcTela) {
  const nu = o.nu ?? 5, nv = o.nv ?? 7, u = nor(o.u), ab = nor(o.abajo ?? [0, 0, -1]), nrm = nor(cruz(u, ab)), amp = o.amp ?? 3, gr = (o.grosor ?? 0.7) / 2, fase = o.fase ?? 0;
  const ph = ciclo(o.f, o.n) * TAU, vi = o.viento ?? 0.6;
  const corte = Array.from({ length: nu }, () => (o.jirones ? Math.floor(a.r() * a.r() * nv * o.jirones * 0.9) : 0));
  const agujero = Array.from({ length: nu * nv }, () => a.r() < (o.jirones ?? 0) * 0.1);
  const P = (i: number, j: number): V3 => {
    const tu = i / nu, tv = j / nv, k = Math.pow(tv, 1.1) * 0.8 + tu * 0.35;
    let ancho = o.ancho;
    if (o.punta) ancho *= 1 - tv * 0.85;
    const x = (tu - 0.5) * ancho + o.ancho / 2;
    const ola = Math.sin(ph + tu * 2.6 + tv * 1.9 + fase) * amp * k + Math.sin(ph * 2 + tu * 5 + fase) * amp * 0.25 * k;
    const corre = Math.sin(ph + tv * 2 + fase + 1) * amp * 0.35 * tv + vi * amp * tv * 0.6;
    return add(add(add(o.p0, u, x + corre), ab, tv * o.alto - Math.abs(ola) * 0.12), nrm, ola);
  };
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv - corte[i]; j++) {
    if (j > 0 && agujero[i * nv + j] && j < nv - corte[i] - 1) continue;
    const q = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
    // el borde roto: la última celda de cada columna se angosta en pico
    if (o.jirones && j === nv - corte[i] - 1) { const m = mez(q[3], q[2], 0.3 + a.r() * 0.4); q[2] = add(m, sub(q[2], q[3]), 0.08); q[3] = m; }
    const pts = q.flatMap((p) => [add(p, nrm, gr), add(p, nrm, -gr)]);
    ps.push(a.poliedro(pts, { mat: o.dibujo?.((i + 0.5) / nu, (j + 0.5) / nv) ?? o.mat, tono: (Math.sin(ph + i * 2.6 / nu + j * 1.9 / nv + fase) * 0.06) }));
  }
}
/** Piel de bestia estirada en un bastidor o colgada: una masa chata con patas que cuelgan. */
export function pellejo(a: Arma, c: V3, ancho: number, alto: number, normal: V3, mat = 'a45_piel'): Pieza {
  const n = nor(normal), u = nor(cruz([0, 0, 1], n)), w: V3 = [0, 0, 1], cs: Comp[] = [];
  const P = (x: number, z: number, e = 0): V3 => add(add(add(c, u, x), w, z), n, e);
  cs.push(bulto(P(0, 0), [ancho * 0.36, 0.8, alto * 0.42], { ejes: [u, n, w] }));
  for (const s of [-1, 1]) for (const t of [-1, 1]) cs.push(hueso(P(s * ancho * 0.25, t * alto * 0.28), P(s * ancho * 0.5, t * alto * 0.5 + jit(a, 2)), 1.6, 0.8));
  cs.push(hueso(P(0, alto * 0.38), P(jit(a, 2), alto * 0.55), 2.2, 1.6), hueso(P(0, -alto * 0.38), P(jit(a, 2), -alto * 0.6), 1.4, 0.4));
  return masa(cs, { mat, suave: 2 });
}
