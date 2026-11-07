import { objeto, herramientas as herr } from './objeto';
import { hash3, caja, palo, poliedro, cilindro, elipsoide, esfera, hueso, bulto, masa, baseCamara, proyectar, type Pieza, type V3, type Camara } from './render';
import { personaje, type Cuerpo, type Equipo } from './cuerpo';
import { MATERIALES } from './materiales';
import { EscenaCine, Terreno, hexLin, mezclar, escalar, moverPiezas, giroEje, type Atmosfera, type C3, type Capas, type Particula, type Pluma, type LuzPuntual } from './cine3d';
import { camaraBase, columna, arcoMedio, cadena, vela, fbm2, dirAz, muertoSeco, type PoseMuerto } from './cine3d_interior';
import { tiraDoom } from './cine3d_cuadros';
import { armarValle, deCat, type TipoFuego } from './cine3d_valle';
import type { Plano3D, Armado, Extras } from './cine3d_toma';
import type { C3 as _C3 } from './cine3d';
import './catalogo/jefes';
import './catalogo/abadia_oria';
import './catalogo/gore';
import './catalogo/paramo';
import './catalogo/nieve2';
import './catalogo/desierto';
import './catalogo/desierto2';
import './catalogo/horror';
import './catalogo/selva';
import './catalogo/selva2';
import './catalogo/templo_selva';
import './catalogo/hielo2';
import './catalogo/tumba';
import { HEROES } from './catalogo/personajes';

/**
 * Los cierres de los actos 1, 2 y 3 en 3D, con el método de la intro (cine3d.ts): cada plano es una escena entera con
 * UNA luz principal y la misma bruma en todo el cuadro, los personajes siempre a contraluz o en silueta (solo brillan
 * el fuego, la brasa, los ojos y la magia), frío en el ambiente y un solo foco cálido o mágico.
 * - acto_1: la Abadesa Ilvara cae sobre la boca del Pozo de la Brasa y la brasa le revienta el pecho; la brasa sale por
 *   el campanario de Santa Oria rumbo al sur; el héroe en el cruce del páramo, junto a la horca, y la estrella roja.
 * - acto_2: Khamer-Ul se deshace en arena bajo el haz de luz y cae la máscara de oro; el coloso enterrado se raja y la
 *   brasa huye por el camino de los empalados; de noche, el barco de Oyá baja el río y detrás camina algo pálido.
 * - acto_3: la Madre Ciénaga se abre y se hunde en su barro y los huevos revientan; al alba, la pirámide en la niebla,
 *   el río que arrastra muertos y el barco que espera; en la ventisca, el rey de escarcha camina y sus muertos lo siguen.
 * Medidas del taller: una persona mide 61 (una unidad ~3 cm). z hacia arriba.
 */

type _Sin = _C3;
const TAU = Math.PI * 2;
const sat = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const suave = (a: number, b: number, v: number) => { const t = sat((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
/** Azar estable 0..1. */
const az = (i: number, k = 0) => hash3(i * 31 + 7, k * 17 + 3, 1301);

// ================================================================== piezas del catálogo
function piezasDe(id: string, v: string, seed: number, f = 0): Pieza[] {
  const a = objeto(id).armar(v, f, herr(seed));
  // la niebla y el humo de utilería no van: acá la niebla es de verdad y el humo es volumen
  return (Array.isArray(a) ? a : a.piezas).filter((p) => !p.mat.includes('niebla') && p.mat !== 'jf_humo' && p.mat !== 'humo');
}
const variante0 = (id: string) => objeto(id).variantes[0];
/** Un jefe del catálogo en su acción y cuadro, mirando a +x (sin las llamas de utilería: el fuego es de Doom). */
const jefe = (id: string, acc: string, f: number, sinFuego = true) => piezasDe(`jefe_${id}_${acc}`, 'se', 7, f).filter((p) => !sinFuego || (p.mat !== 'fuego' && p.mat !== 'fuego_verde' && p.mat !== 'jf_niebla'));
/** Las piezas todas de un material (también los componentes de las masas): la figura pálida, los muertos de hielo. */
const teñir = (ps: Pieza[], mat: string): Pieza[] => ps.map((p) => (p.k === 'masa' ? { ...p, mat, comps: p.comps.map((c) => ({ ...c, mat })) } : { ...p, mat }) as Pieza);
/** Piezas giradas `ang` grados alrededor del eje e por el pivote. */
const girar = (ps: Pieza[], e: V3, ang: number, piv: V3 = [0, 0, 0], t: V3 = [0, 0, 0]) => moverPiezas(ps, giroEje(e, (ang * Math.PI) / 180), piv, t);

// ================================================================== cielo y aire
function gradiente(paradas: [number, C3][], e: number): C3 {
  let k = 0; while (k < paradas.length - 2 && e > paradas[k + 1][0]) k++;
  const [a, ca] = paradas[k], [b, cb] = paradas[k + 1];
  return mezclar(ca, cb, suave(a, b, e));
}
function h2(x: number, y: number, s: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Bancos de nubes (como los del valle): cobertura, luz del borde del lado de `luz` y espesor. */
function nubes(d: V3, s: number, esc: number, cubre: number, alto: number, luz: V3, estira = 1.7): { a: number; luz: number; espesor: number } {
  if (d[2] <= 0.005) return { a: 0, luz: 0, espesor: 0 };
  const k = alto / d[2], u = (d[0] * k) / (esc * estira), v = (d[1] * k) / esc;
  const den = (x: number, y: number) => {
    const wx = x + (fbm2(x * 0.6 + 3, y * 0.6, 3, s + 1) - 0.5) * 1.4, wy = y + (fbm2(x * 0.6, y * 0.6 + 7, 3, s + 2) - 0.5) * 1.4;
    return fbm2(wx, wy, 6, s) * 0.7 + fbm2(wx * 0.35, wy * 0.35, 2, s + 4) * 0.45 - 0.15;
  };
  const n = den(u, v), ll = Math.hypot(luz[0], luz[1]) || 1, n2 = den(u + (luz[0] / ll) * 0.12, v + (luz[1] / ll) * 0.12);
  return { a: suave(cubre, cubre + 0.07, n) * suave(0.01, 0.08, d[2]), luz: sat((n - n2) * 6 + 0.25) * (1 - suave(cubre + 0.05, cubre + 0.3, n) * 0.6), espesor: sat((n - cubre) * 4) };
}
interface OpcCielo {
  /** de dónde viene la luz principal (sol, luna, el foco) y su color e intensidad */
  luz: V3; luzC: C3; luzK: number; ancho?: number;
  /** degradé del cielo por elevación (radianes) */
  pars: [number, C3][];
  /** resplandor alrededor de la luz: color y fuerzas [lóbulo fino, medio, ancho] */
  halo?: { c: C3; k: [number, number, number]; disco?: number };
  estrellas?: number;
  nubes?: { s: number; esc: number; cubre: number; alto: number; c: C3; luzC: C3; k: number; a?: number }[];
  /** algo propio en el cielo (la estrella roja que cae, la brasa que huye): se suma */
  extra?: (d: V3, e: number) => C3;
  amb: [C3, C3]; niebla: Atmosfera['niebla']; borde: Atmosfera['borde']; nieve?: Atmosfera['nieve']; oclusion?: number; oclusionLargo?: number;
}
function atmCielo(o: OpcCielo): Atmosfera {
  const L = o.luz, hc = o.halo;
  const halo = (d: V3, e: number) => { if (!hc) return 0; const g = Math.max(0, dot3(d, L)); return (hc.k[0] * Math.pow(g, 300) + hc.k[1] * Math.pow(g, 30) + hc.k[2] * Math.pow(g, 4)) * Math.exp(-Math.max(0, e) * 2); };
  const kAire = (e: number) => 0.55 + 0.45 * suave(0, 0.12, e);
  const aire = (d: V3): C3 => { const e = Math.min(0.03, Math.max(0, d[2])), b = gradiente(o.pars, e), h = hc ? halo(norm([d[0], d[1], e]), e) * kAire(e) : 0; return hc ? [b[0] + hc.c[0] * h, b[1] + hc.c[1] * h, b[2] + hc.c[2] * h] : b; };
  const cielo = (d: V3): C3 => {
    const e = Math.asin(Math.max(-1, Math.min(1, d[2])));
    if (e < 0.03) return o.extra ? add(aire(d), o.extra(d, e)) : aire(d);
    const b = gradiente(o.pars, e), ka = kAire(e);
    let c: C3 = b;
    if (hc) { const h = halo(d, e) * ka, g = Math.max(0, dot3(d, L)), disco = (hc.disco ?? 0) * (Math.pow(g, 9000) > 0.5 ? 1 : 0); c = [c[0] + hc.c[0] * (h + disco), c[1] + hc.c[1] * (h + disco), c[2] + hc.c[2] * (h + disco)]; }
    if (o.estrellas) { const hs = h2(Math.floor(Math.atan2(d[1], d[0]) * 1100), Math.floor(e * 1100), 77), u = 1 - o.estrellas * 0.004; if (hs > u) { const k = ((hs - u) / (1 - u)) * 0.12 * suave(0.05, 0.3, e); c = [c[0] + k * 0.9, c[1] + k * 0.95, c[2] + k * 1.1]; } }
    for (const n of o.nubes ?? []) {
      const nb = nubes(d, n.s, n.esc, n.cubre, n.alto, [L[0], L[1], 0]); if (nb.a <= 0) continue;
      const g = Math.max(0, dot3(d, L)), lz = (0.25 + nb.luz) * (Math.pow(g, 6) * 2 + Math.pow(g, 2) * 0.2) * n.k, base = escalar(n.c, 1 - nb.espesor * 0.4);
      c = mezclar(c, [base[0] + n.luzC[0] * lz, base[1] + n.luzC[1] * lz, base[2] + n.luzC[2] * lz], nb.a * (n.a ?? 0.9));
    }
    return o.extra ? add(c, o.extra(d, e)) : c;
  };
  return {
    sol: { dir: L, c: o.luzC, k: o.luzK, ancho: o.ancho ?? 0.02 }, cielo, aire, ambCielo: o.amb[0], ambSuelo: o.amb[1],
    niebla: o.niebla, borde: o.borde, nieve: o.nieve, oclusion: o.oclusion ?? 0.85, oclusionLargo: o.oclusionLargo,
  };
}

// ================================================================== fuego y lo que se mueve
const NF = 16, FPS = 12;
type Fuego = { p: V3; ancho: number; alto: number; semilla: number; tipo: TipoFuego; k?: number };
type ArmadoA = Armado & { fuegos: Fuego[]; brasas?: (t: number) => Particula[] };
/** Cuánto late el fuego en el instante t; empalma cada NF / FPS segundos. */
const latido = (t: number) => { const u = ((t * FPS) / NF) * TAU; return 0.9 + 0.06 * Math.sin(u) + 0.04 * Math.sin(u * 3 + 1) + 0.03 * Math.sin(u * 5 + 2); };
/** Los carteles de Doom del cuadro, el latido de la luz (canal 1) y las chispas que suben. */
function fuegoDe(a: ArmadoA, t: number, late = true): Extras {
  const fi = Math.round(t * FPS) % NF;
  return { flick: late ? latido(t) : 1, carteles: a.fuegos.map((f) => ({ p: f.p, ancho: f.ancho, alto: f.alto, lam: tiraDoom(f.tipo, f.semilla)[(fi + f.semilla * 5) % NF], k: f.k ?? (f.tipo === 'vela' ? 2.2 : 2.4), fondo: f.ancho * 2 })), particulas: a.brasas ? a.brasas(t) : [] };
}
/** Una tira por fuego (con su luz alrededor); las que se pisan se juntan. */
function zonasFuegos(a: Armado, margen = 8, escala = 2, extra: [number, number, number, number][] = []) {
  const b = baseCamara(a.cam), out: { caja: [number, number, number, number]; escala: number }[] = extra.map((c) => ({ caja: c, escala }));
  for (const f of (a as ArmadoA).fuegos) {
    const q = [[f.p[0] - f.ancho, f.p[1], f.p[2] - 2], [f.p[0] + f.ancho, f.p[1], f.p[2] + f.alto * 1.1], [f.p[0], f.p[1] - f.ancho, f.p[2] + f.alto * 0.5], [f.p[0], f.p[1] + f.ancho, f.p[2] + f.alto * 0.5]].map((p) => proyectar(b, p as V3)).filter((p): p is [number, number, number] => !!p);
    if (q.length) out.push({ caja: [Math.min(...q.map((p) => p[0])) - margen, Math.min(...q.map((p) => p[1])) - margen, Math.max(...q.map((p) => p[0])) + margen, Math.max(...q.map((p) => p[1])) + margen], escala });
  }
  for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
    const A = out[i].caja, B = out[j].caja;
    if (A[0] < B[2] + 4 && B[0] < A[2] + 4 && A[1] < B[3] + 4 && B[1] < A[3] + 4) { out[i].caja = [Math.min(A[0], B[0]), Math.min(A[1], B[1]), Math.max(A[2], B[2]), Math.max(A[3], B[3])]; out.splice(j, 1); j = i; }
  }
  return out.filter((z) => z.caja[2] > 0 && z.caja[3] > 0 && z.caja[0] < a.cam.w && z.caja[1] < a.cam.h);
}
/** Chispas que suben de un punto (suman), en bucle de NF cuadros. */
function chispas(t: number, c: V3, n: number, abre: number, sube: number, col = '#ff7a2a', k = 5, deriva: V3 = [0.3, 0.1, 0]): Particula[] {
  const ps: Particula[] = [], na = hexLin(col), P = NF / FPS;
  for (let i = 0; i < n; i++) {
    const vida = P * (1 + Math.floor(az(i, 4) * 2)), f = ((t + az(i, 5) * vida) % vida) / vida, s = f * sube * (0.5 + az(i, 6));
    const p0: V3 = [c[0] + (az(i, 1) - 0.5) * abre, c[1] + (az(i, 2) - 0.5) * abre, c[2] + az(i, 3) * abre * 0.3];
    ps.push({ p: [p0[0] + s * deriva[0] + Math.sin(f * 6.28 + i) * 3, p0[1] + s * deriva[1], p0[2] + s], r: 0.4 + az(i, 7) * 0.7, c: escalar(na, k * Math.sin(f * Math.PI) * (0.3 + az(i, 8))), a: 1, suma: true, v: [sube * deriva[0], sube * deriva[1], sube / vida] });
  }
  return ps;
}
const memo = <T>(f: (w: number, h: number) => T) => { const m = new Map<string, T>(); return (w: number, h: number) => { const k = `${w}|${h}`; let v = m.get(k); if (!v) { v = f(w, h); m.set(k, v); } return v; }; };

// ================================================================== grados de color
/** Noche: negros hondos y fríos; lo cálido lo pone solo el fuego. */
function gradoNoche(c: C3): C3 {
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], fr = (1 - Math.min(1, l * 5)) ** 2;
  return [Math.pow(Math.max(0, c[0]), 1.08), Math.pow(Math.max(0, c[1]), 1.04) + 0.003 * fr, c[2] + 0.012 * fr];
}
/** Fondo de cripta: negros negros, apenas fríos. */
const gradoCripta = (c: C3): C3 => { const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], fr = (1 - Math.min(1, l * 6)) ** 2; return [Math.max(0, c[0]) ** 1.06, Math.max(0, c[1]) ** 1.04, Math.max(0, c[2]) ** 1.02 + 0.006 * fr]; };

// ================================================================== ACTO 1 · p1: la Abadesa en la boca del Pozo de la Brasa
MATERIALES.aa_brasa = { rampa: ['#3a0602', '#6a0e04', '#9a1c06', '#c8320a', '#e84c10', '#ff7a2a'], ruido: 0.4, escala: 0.3, emite: true };
MATERIALES.aa_sangre = { rampa: ['#0c0101', '#1c0202', '#2c0303', '#400606', '#560a08'], ruido: 0.25, escala: 0.6, brillo: 0.7 };
MATERIALES.aa_carne = { rampa: ['#140202', '#2a0504', '#420a07', '#5e110b', '#7a1a10'], ruido: 0.4, escala: 0.5, brillo: 0.5 };
MATERIALES.aa_losa = { rampa: ['#060606', '#0d0c0c', '#151413', '#1e1c1a', '#282522', '#33302c', '#3f3b36'], ruido: 0.3, escala: 0.08, brillo: 0.15, patron: (p) => { const j = Math.abs(((p[0] % 46) + 46) % 46 - 23) > 22 || Math.abs(((p[1] % 46) + 46) % 46 - 23) > 22; return j ? -0.3 : 0; } };
/** El pozo: el centro de la boca y su radio. La brasa sale de la Abadesa a la altura del pecho. */
const POZO_A1 = { r: 74, alto: 38 };
const ABADESA_A1: V3 = [0, -58, POZO_A1.alto - 26];

function armarAbadesa(w: number, h: number): ArmadoA {
  const esc = new EscenaCine(), fuegos: Fuego[] = [], plumas: Pluma[] = [], P = POZO_A1;
  // la sala: piso de losas, bóveda de cañón muy alta que se pierde en lo oscuro, filas de columnas que fugan hacia atrás
  esc.ponerMundo([caja(0, 200, -20, 1400, 1400, 20, { mat: 'aa_losa' })], { nieve: 0 });
  esc.ponerMundo([caja(0, 200, 330, 1400, 1400, 300, { mat: 'abo_sillar' }), cilindro(-700, 200, 330, 260, 1400, { mat: 'abo_sillar', eje: [1, 0, 0], resta: true })], { nieve: 0 });
  for (const x of [-210, 210]) for (let j = -1; j < 7; j++) {
    const y = j * 120 + 40; if (Math.abs(x) < 220 && y < -60) continue;
    esc.ponerMundo(columna(x, y, 0, 300, 15, 'abo_labra', (az(j, x) - 0.5) * 0.1), { nieve: 0 });
    esc.poner(arcoMedio(52, 10, 26, 'abo_labra'), { x, y: y + 60, z: 300, giro: 90 });
  }
  // primer plano: una columna gruesa a la izquierda del ojo (enmarca en negro) y una cadena que cuelga
  esc.frente.add(esc.ponerMundo(columna(92, -192, 0, 300, 17, 'abo_labra', -0.1), { nieve: 0 }));
  // muros del fondo y de los costados
  // (en el fondo, la boca de la escalera: un arco alto por donde baja la noche fría)
  esc.ponerMundo([caja(0, 860, -20, 1400, 40, 700, { mat: 'abo_sillar' }), caja(-60, 860, 0, 110, 120, 200, { mat: 'abo_sillar', resta: true }), cilindro(-60, 800, 200, 55, 120, { mat: 'abo_sillar', eje: [0, 1, 0], resta: true }),
    caja(-420, 300, -20, 40, 1400, 700, { mat: 'abo_sillar' }), caja(420, 300, -20, 40, 1400, 700, { mat: 'abo_sillar' })], { nieve: 0 });
  for (let i = 0; i < 8; i++) esc.ponerMundo([caja(-60, 900 + i * 22, i * 18, 110, 22, 18, { mat: 'aa_losa' })], { nieve: 0 });
  // el brocal: sillares, labra arriba, rajado por la explosión; la tapa partida en tres, tirada alrededor con sus cadenas
  const brocal: Pieza[] = [cilindro(0, 0, 0, P.r, P.alto - 4, { mat: 'abo_sillar' }), cilindro(0, 0, P.alto - 4, P.r + 3, 5, { mat: 'abo_labra' }), cilindro(0, 0, -400, P.r - 12, P.alto + 420, { mat: 'abo_sillar', resta: true })];
  for (let i = 0; i < 5; i++) { const a = az(i, 21) * TAU; brocal.push(caja(Math.cos(a) * P.r, Math.sin(a) * P.r, P.alto - 14 + az(i, 22) * 10, 22, 26, 30, { mat: 'abo_sillar', giro: (a * 180) / Math.PI, resta: true })); }
  esc.ponerMundo(brocal, { nieve: 0 });
  // adentro del pozo: el fondo que arde (la brasa que se va, lo que queda de su lecho)
  esc.ponerMundo([cilindro(0, 0, -60, P.r - 12, 4, { mat: 'aa_brasa' })], { nieve: 0 });
  const tapa = (x: number, y: number, a0: number, a1: number, giro: number, incl: number, s: number) => {
    const pts: V3[] = [];
    for (let i = 0; i <= 6; i++) { const a = a0 + ((a1 - a0) * i) / 6, r = (P.r - 6) * (0.92 + az(s, i) * 0.08); for (const z of [0, 6]) pts.push([Math.cos(a) * r, Math.sin(a) * r, z]); }
    for (const z of [0, 6]) pts.push([(az(s, 9) - 0.5) * 10, (az(s, 10) - 0.5) * 10, z]);
    esc.poner([poliedro(pts, { mat: 'abo_losa', tono: -0.1 }), caja(Math.cos((a0 + a1) / 2) * 30, Math.sin((a0 + a1) / 2) * 30, 6, 50, 8, 1.6, { mat: 'ci_hierro', giro: ((a0 + a1) / 2) * 57.3 })].map((p) => moverPiezas([p], giroEje([Math.cos(giro), Math.sin(giro), 0], (incl * Math.PI) / 180))[0]), { x, y, z: 0 });
  };
  tapa(-150, -40, 0.3, 2.2, 1.2, 14, 31); tapa(140, 70, 2.4, 4.3, 0.2, -10, 32); tapa(60, -150, 4.4, 6.2, 2.0, 22, 33);
  // cadenas rotas que cuelgan de las columnas hacia el pozo
  for (const [x, y, z, ex, ey] of [[-195, 40, 160, -60, 10], [195, 40, 170, 70, 30], [-195, 160, 150, -40, 120], [195, 160, 140, 60, 140]] as [number, number, number, number, number][]) esc.ponerMundo(cadena([x, y, z], [ex, ey, 2], 30, 3), { nieve: 0 });
  // velas apagadas en el piso alrededor del pozo (las de la Abadesa): cabos negros con su charco de cera
  for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + az(i, 40) * 0.3, r = P.r + 30 + az(i, 41) * 40, al = 4 + az(i, 42) * 12; esc.ponerMundo([cilindro(Math.cos(a) * r, Math.sin(a) * r, 0, 2.4, al, { mat: 'jf_cera_negra' }), cilindro(Math.cos(a) * r, Math.sin(a) * r, 0, 5, 0.6, { mat: 'jf_cera_negra', r1: 4 })], { nieve: 0 }); }
  // la Abadesa: se alza con los brazos abiertos, la cabeza atrás (el cuadro 2 de su muerte), tumbada hacia atrás sobre la boca
  // está en el borde de la boca que da al ojo, de frente, y se va de espaldas adentro del pozo
  const GA = -80, ab = girar(jefe('abadesa', 'morir', 2), [0, 1, 0], -34, [0, 0, 40]);
  esc.poner(ab, { x: ABADESA_A1[0], y: ABADESA_A1[1], z: ABADESA_A1[2], giro: GA, k: 1.15 }, { nieve: 0 });
  // el pecho reventado: la herida abierta (carne y costillas) de donde sale la brasa, en el mundo (el pecho quedó
  // mirando arriba y hacia el ojo)
  const giroA = (GA * Math.PI) / 180, fx = Math.cos(giroA), fy = Math.sin(giroA);
  const pecho: V3 = [ABADESA_A1[0] + fx * 4, ABADESA_A1[1] + fy * 4 + 26, ABADESA_A1[2] + 92];
  const herida: Pieza[] = [masa([bulto(pecho, [7, 9, 6], { mat: 'aa_carne' }), bulto(add(pecho, [fx * 3, fy * 3, 4]), [4, 6, 4], { mat: 'aa_carne' })], { mat: 'aa_carne', suave: 2 }), esfera(pecho[0] + fx * 4, pecho[1] + fy * 4, pecho[2] + 2, 4.5, { mat: 'aa_brasa' })];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU, d: V3 = norm([fx + Math.cos(a) * 0.9, fy + Math.sin(a) * 0.9, 0.8 + Math.sin(a) * 0.5]); herida.push(palo(add(pecho, d, 4), add(pecho, d, 12 + az(i, 51) * 5), 0.9, { mat: 'jf_costilla', r1: 0.4 })); }
  // la sangre que salta en abanico (gotas y chorros congelados en el instante) y la que ya mancha el brocal y el piso
  for (let i = 0; i < 70; i++) {
    const a = (az(i, 61) - 0.5) * 2.4 + giroA, e = 0.2 + az(i, 62) * 1.1, v = 10 + az(i, 63) * 70, d: V3 = [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)];
    const p = add(pecho, d, v), r = 0.5 + az(i, 64) * 1.6 * (1 - v / 90);
    herida.push(i % 3 ? esfera(p[0], p[1], p[2] - (v * v) / 260, r, { mat: 'aa_sangre' }) : palo(add(p, d, -4), p, r * 0.7, { mat: 'aa_sangre', r1: r * 0.4 }));
  }
  esc.ponerMundo(herida, { nieve: 0 });
  for (const [x, y, s] of [[-40, -70, 71], [30, -86, 72], [-90, -20, 73], [70, -40, 74]] as [number, number, number][]) esc.poner(piezasDe('gore_salpicadura', variante0('gore_salpicadura'), s), { x, y, z: x * x + y * y < P.r * P.r ? P.alto + 1 : 0.2, giro: az(s, 1) * 360, k: 0.9 }, { nieve: 0 });
  // la brasa que le revienta el pecho: fuego de Doom que sale del pecho hacia arriba, su luz (la principal del cuadro) y su humo
  fuegos.push({ p: add(pecho, [fx * 6, fy * 6, -6]), ancho: 22, alto: 150, semilla: 81, tipo: 'techo', k: 1.7 });
  fuegos.push({ p: add(pecho, [fx * 8, fy * 8, -4]), ancho: 13, alto: 70, semilla: 82, tipo: 'techo', k: 1.9 });
  // la luz del pozo: sube del fondo (sombras largas hacia arriba: las columnas en la bóveda) y la del pecho, que late
  esc.luces.push({ p: [0, 0, -30], c: hexLin('#ff4a14'), k: 14, r: 120, canal: 1, sombra: true, envuelve: 0.2, halo: 0.00002 });
  // lo frío: la escalera del fondo, por donde baja la noche (un filo azul en las columnas y en la niebla de atrás)
  esc.luces.push({ p: [-60, 1000, 230], c: hexLin('#6f8cc8'), k: 9, r: 260, sombra: true, envuelve: 0.1, halo: 0.00004 });
  esc.luces.push({ p: add(pecho, [fx * 10, fy * 10, 30]), c: hexLin('#ff6a22'), k: 6, r: 50, canal: 1, sombra: true, envuelve: 0.3, halo: 0.0001 });
  esc.emision.aa_brasa = { k: 3.5, canal: 1 }; esc.emision.luz_vela = { k: 0 }; esc.emision.fuego = { k: 0 };
  plumas.push({ base: add(pecho, [0, 0, 30]), alto: 520, r0: 10, r1: 140, viento: [0.2, 0.4, 0], dens: 0.05, humo: [0.03, 0.03, 0.034], abajo: hexLin('#ff4a14'), kAbajo: 0.7, decaeAbajo: 7, semilla: 83, sube: 26, escala: 1 / 26 });
  plumas.push({ base: [0, 0, P.alto], alto: 420, r0: 50, r1: 160, viento: [0.1, 0.3, 0], dens: 0.02, humo: [0.03, 0.03, 0.034], abajo: hexLin('#ff3a10'), kAbajo: 0.8, decaeAbajo: 6, semilla: 84, sube: 14, escala: 1 / 40 });
  // el aire: cripta fría (azul pizarra apenas), la niebla a ras del piso que el pozo enciende de abajo
  const aire: C3 = [0.004, 0.0048, 0.007];
  const atm: Atmosfera = {
    sol: { dir: [0, 0, 1], c: [0, 0, 0], k: 0 }, cielo: () => aire, aire: () => aire,
    ambCielo: [0.004, 0.005, 0.008], ambSuelo: [0.0015, 0.0012, 0.0012],
    niebla: { densidad: 1 / 4200, baja: 1 / 260, z0: 0, H: 18, ruido: 0.8, escalaRuido: 0.012 },
    borde: { c: hexLin('#ff6a30'), k: 1.6 }, oclusion: 0.9, oclusionLargo: 260,
  };
  // la cámara baja, de costado, un poco abajo de la Abadesa: ella se recorta contra el humo encendido y la sala que fuga
  const cam = camaraBase([230, -230, 36], [-40, 6, 104], 44, w, h);
  return { esc, atm, cam, plumas, fuegos, brasas: (t) => chispas(t, pecho, 90, 30, 260, '#ff7a2a', 6, [0.1, 0.25, 0]) };
}
const A1P1: Plano3D = {
  id: 'p1_abadesa', paralaje: 0.9, particulas: 'brasas', ss: 4, ao: 3,
  armar: memo(armarAbadesa),
  revelado: { t: 0, exposicion: 1.5, derrame: { k: 0.4, r: 4 }, bloom: { k: 0.45, umbral: 0.75 }, grado: gradoCripta },
  flickBase: 0.84, cuadros: NF, fps: FPS, extras: (a, _c, t) => fuegoDe(a as ArmadoA, t), zonas: (a) => zonasFuegos(a, 40, 2),
};

// ================================================================== ACTO 1 · p2: la brasa sale por el campanario de Santa Oria
/** La roca de la brasa (como la que cayó en la intro): obsidiana con las grietas al rojo y el núcleo que se ve adentro. */
function rocaBrasa(b: V3, R: number, s: number): Pieza[] {
  const roca: Pieza[] = [];
  for (let k = 0; k < 3; k++) {
    const pts: V3[] = [], rr = R * (k ? 0.6 : 1);
    for (let i = 0; i < 12; i++) { const a = az(i + k * 20, s + 1) * TAU, z = (az(i + k * 20, s + 2) * 2 - 1) * rr, r = Math.sqrt(Math.max(0, rr * rr - z * z)) * (0.75 + az(i + k * 20, s + 3) * 0.4); pts.push([b[0] + Math.cos(a) * r + (k ? (az(k, s + 4) - 0.5) * R : 0), b[1] + Math.sin(a) * r, b[2] + z + (k ? R * 0.45 : 0)]); }
    roca.push(poliedro(pts, { mat: 'jf_obsidiana', tono: -0.05 }));
  }
  for (let i = 0; i < 11; i++) { const a = az(i, s + 5) * TAU, e = (az(i, s + 6) - 0.5) * 2.4; roca.push(elipsoide(b[0] + Math.cos(a) * Math.cos(e) * R * 0.83, b[1] + Math.sin(a) * Math.cos(e) * R * 0.83, b[2] + Math.sin(e) * R * 0.83, R * 0.06, R * 0.06, R * (0.27 + az(i, s + 7) * 0.3), { mat: 'aa_brasa', giro: az(i, s + 8) * 180, incl: 40 + az(i, s + 9) * 80 })); }
  roca.push(esfera(b[0], b[1], b[2] - R * 0.13, R * 0.73, { mat: 'aa_brasa' }));
  return roca;
}
/** La brasa sale del campanario de la torre de la derecha (hacia el sur, lejos y arriba) y su estela de humo y chispas. */
const TORRE_A1 = deCat(53, 100, 292), BRASA_A1P2: V3 = add(TORRE_A1, [-300, -60, 360]);
function armarCampanas(w: number, h: number): ArmadoA {
  const v = armarValle('i08', { w, h }), esc = v.esc, fuegos: Fuego[] = [], plumas: Pluma[] = [];
  // la abadía ya no arde: lo que queda son rescoldos adentro (los vitrales apenas rojos) y el humo frío
  esc.luces = esc.luces.filter((l) => l.canal !== 1);
  esc.emision.abo_vitral = { k: 0.25, color: hexLin('#ff5a20') }; esc.emision.abo_brasa = { k: 0.5 }; esc.emision.abo_llama = { k: 0 }; esc.emision.abo_chispa = { k: 0 };
  esc.frente.clear();
  // la brasa, arriba y lejos, saliendo hacia el sur; su luz roja (la principal del cuadro) baña la torre desde arriba
  const B = BRASA_A1P2;
  esc.ponerMundo(rocaBrasa(B, 46, 600), { nieve: 0 });
  esc.emision.aa_brasa = { k: 3.6, canal: 1 };
  esc.luces.push({ p: add(B, [0, 0, -50]), c: hexLin('#ff4a1a'), k: 16, r: 220, canal: 1, sombra: true, envuelve: 0.2, halo: 0.0000008 });
  esc.luces.push({ p: add(TORRE_A1, [0, 0, 30]), c: hexLin('#ff5a20'), k: 3, r: 60, canal: 1, envuelve: 0.4 });
  fuegos.push({ p: add(B, [0, 0, -36]), ancho: 120, alto: 520, semilla: 91, tipo: 'techo', k: 2.2 }, { p: add(B, [6, 0, -40]), ancho: 70, alto: 280, semilla: 92, tipo: 'techo', k: 2.4 });
  // la estela: el humo que dejó al salir del campanario, torcido hacia donde se fue
  const d = norm([B[0] - TORRE_A1[0], B[1] - TORRE_A1[1], 0]), L = Math.hypot(B[0] - TORRE_A1[0], B[1] - TORRE_A1[1]), sube = B[2] - TORRE_A1[2];
  plumas.push({ base: TORRE_A1, alto: sube, r0: 14, r1: 70, viento: [d[0] * (L / sube) * 1.4, d[1] * (L / sube) * 1.4, 0], dens: 0.045, humo: [0.03, 0.028, 0.03], abajo: hexLin('#ff5a1a'), kAbajo: 0.8, decaeAbajo: 3, semilla: 93, sube: 40, escala: 1 / 40, sol: 0.1 });
  // el aire: noche de invierno con la ceniza todavía en el aire; la luna atrás de la abadía (filo frío en las agujas)
  const ter = esc.terreno!, ojo: V3 = [60, -900, ter.h(60, -900) + 40], luna = norm([Math.cos(1.2) * 0.95, Math.sin(1.2) * 0.95, 0.22]);
  const atm = atmCielo({
    luz: luna, luzC: hexLin('#9fb4e8'), luzK: 0.35, ancho: 0.02,
    pars: [[0, hexLin('#1d2230')], [0.06, hexLin('#161c2c')], [0.2, hexLin('#0f1424')], [0.5, hexLin('#080b16')], [1.2, hexLin('#04050a')]],
    halo: { c: hexLin('#9fb4e8'), k: [0.5, 0.08, 0.015], disco: 1.6 }, estrellas: 1.2,
    nubes: [{ s: 51.3, esc: 2200, cubre: 0.5, alto: 3200, c: hexLin('#0e1320'), luzC: hexLin('#7f94c8'), k: 0.12, a: 0.85 }],
    extra: (dd) => { const B2 = norm([B[0] - ojo[0], B[1] - ojo[1], B[2] - ojo[2]]), g = Math.max(0, dot3(dd, B2)); return escalar(hexLin('#ff3a14'), 0.25 * Math.pow(g, 1500) + 0.02 * Math.pow(g, 120)); },
    amb: [escalar(hexLin('#2c3c5e'), 0.3), escalar(hexLin('#141820'), 0.2)],
    niebla: { densidad: 1 / 15000, baja: 1 / 5000, z0: 0, H: 100, ruido: 0.7, escalaRuido: 0.0012 },
    borde: { c: hexLin('#ff6a3a'), k: 1.6 }, nieve: { albedo: [0.4, 0.42, 0.46], desde: 0.6 },
  });
  // la cámara: desde el valle, como en el alba de la intro (de lejos, con tele): la abadía negra en su colina y la brasa
  // que se va arriba a la izquierda
  const cam = camaraBase(ojo, add(TORRE_A1, [-170, 0, 150]), 22, w, h);
  return { esc, atm, cam, plumas, fuegos, brasas: (t) => chispas(t, add(B, [0, 0, -60]), 120, 70, -300, '#ff7a2a', 5, [-d[0] * 0.6, -d[1] * 0.6, 0]) };
}
const A1P2: Plano3D = {
  id: 'p2_campanas', paralaje: 0.85, particulas: 'ceniza',
  armar: memo(armarCampanas),
  revelado: { t: 0, exposicion: 1.3, derrame: { k: 0.45, r: 5 }, bloom: { k: 0.45, umbral: 0.75 }, grado: gradoNoche },
  flickBase: 0.84, cuadros: NF, fps: FPS, extras: (a, _c, t) => fuegoDe(a as ArmadoA, t), zonas: (a) => zonasFuegos(a, 60, 2),
};

// ================================================================== ACTO 1 · p3: el héroe en el cruce del páramo
MATERIALES.aa_marca = { rampa: ['#5a0a04', '#9a1c06', '#d8380c', '#ff6a1c', '#ffa050'], ruido: 0.3, escala: 0.5, emite: true };
/** El héroe: un caminante encapuchado con su capa y la espada (sin clase: es cualquiera de las ocho). */
const HEROE_CU: Cuerpo = { genero: 'h', alto: 1.02, ancho: 1.04, musculo: 0.6, piel: 'cu_piel', pelo: 'cu_pelo_negro', peinado: 'corto' };
const HEROE_EQ: Equipo = { torso: { tipo: 'cuero', mat: 'cu_cuero_negro' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_parda' }, pies: { tipo: 'botas_altas', mat: 'cu_cuero' }, manos: { tipo: 'guantes', mat: 'cu_cuero' }, cabeza: { tipo: 'capucha', mat: 'cu_tela_negra' }, capa: { mat: 'cu_tela_negra', largo: 1 }, cinturon: { mat: 'cu_cuero' }, arma: { tipo: 'espada', mat: 'hierro_oxido' } };
/** Las manos de un personaje puesto (las piezas de piel más bajas a cada lado): para la Marca en el antebrazo. */
function manosDe(esc: EscenaCine, g: number): V3[] {
  const cs = esc.piezas.filter((p, i) => esc.grupoDe[i] === g && p.mat === 'cu_piel').map((p) => (p.k === 'masa' ? (p.esf.slice(0, 3) as V3) : p.k === 'elip' ? p.c : p.k === 'cono' ? p.o : p.pts[0]));
  return cs.sort((a, b) => a[2] - b[2]).slice(0, 2);
}
/** La estrella roja: dónde está en el cielo (rumbo y elevación en grados) y su estela. */
const ESTRELLA_A1 = { az: 108, el: 6.5, largo: 7, inclina: -0.55 };
function cieloEstrella(d: V3, e: number): C3 {
  const a = Math.atan2(d[1], d[0]) * (180 / Math.PI), E = e * (180 / Math.PI), S = ESTRELLA_A1;
  const u = a - S.az, v = E - S.el, t = (-u * S.inclina + v) / (1 + S.inclina * S.inclina), q = Math.hypot(u - -S.inclina * t * 0 - (-t * S.inclina) * 0, 0);
  void q;
  // la estela: de la estrella hacia arriba y a la derecha, se afina y se apaga
  const k = Math.max(0, Math.min(S.largo, (v - u * S.inclina) / Math.hypot(1, S.inclina)));
  const px = u - (-S.inclina / Math.hypot(1, S.inclina)) * k * 0, py = v;
  void px; void py;
  const dx = u + (k * S.inclina) / Math.hypot(1, S.inclina), dy = v - k / Math.hypot(1, S.inclina), dd = Math.hypot(dx, dy);
  const estela = Math.exp(-dd / (0.05 + 0.02 * k)) * (1 - k / S.largo) * 0.8, cabeza = Math.exp(-Math.hypot(u, v) / 0.12) * 6 + Math.exp(-Math.hypot(u, v) / 1.2) * 0.25;
  return escalar(hexLin('#ff3a14'), estela + cabeza);
}
function armarCruce(w: number, h: number, estrella = false): ArmadoA {
  const esc = new EscenaCine(), fuegos: Fuego[] = [];
  // el páramo: lomadas bajas, el camino del sur (a lo largo de y) y el que lo cruza (a lo largo de x), con sus huellas
  const camino = (x: number, y: number) => Math.min(Math.abs(x - 6 * Math.sin(y / 300) * 4), Math.abs(y - 60 - 30 * Math.sin(x / 260)));
  const alto = (x: number, y: number) => {
    const d = Math.hypot(x, y), lomas = (fbm2(x / 900, y / 900, 4, 301) - 0.5) * 160 * suave(300, 1800, d) + (fbm2(x / 160, y / 160, 3, 302) - 0.5) * 10;
    const lejos = suave(3000, 14000, d) * (fbm2(x / 5000, y / 5000, 4, 303) * 900);
    return lomas + lejos - 6 * (1 - suave(6, 22, camino(x, y)));
  };
  esc.terreno = new Terreno({
    alto, techo: 1600, grillas: [[-1400, -600, 1400, 2600, 4], [-9000, -2000, 9000, 16000, 30], [-60000, -6000, 60000, 60000, 300]],
    superficie: (p, n) => {
      const c = camino(p[0], p[1]), r = fbm2(p[0] / 40, p[1] / 40, 3, 304);
      let alb: C3 = mezclar(hexLin('#141014'), hexLin('#221c1a'), r);
      // la escarcha en lo que mira al cielo, en manchas grandes
      alb = mezclar(alb, [0.22, 0.24, 0.29], suave(0.55, 0.75, fbm2(p[0] / 140, p[1] / 140, 3, 306)) * suave(0.93, 0.99, n[2]) * 0.5);
      if (c < 26) alb = mezclar(alb, mezclar(hexLin('#2c2622'), hexLin('#181412'), suave(0.5, 0.8, r)), (1 - suave(10, 24, c)) * 0.9);
      return { albedo: alb, brillo: c < 16 ? 0.12 : 0.01 };
    },
  });
  const ter = esc.terreno, pon = (ps: Pieza[], x: number, y: number, giro = 0, k = 1, frente = false) => { const g = esc.poner(ps, { x, y, z: ter.h(x, y) - 1, giro, k }, { nieve: 0.4 }); if (frente) esc.frente.add(g); return g; };
  // la horca del cruce, con su ahorcado, recortada contra el horizonte; el poste de los caminos y los cuervos
  pon(piezasDe('par_horca', 'ahorcado', 311), -190, 330, 20, 1.5);
  pon([palo([0, 0, 0], [0, 0, 92], 2.4, { mat: 'abo_madera_quemada', r1: 2 }), caja(10, 0, 76, 34, 2.4, 9, { mat: 'abo_madera_quemada', giro: 8, incl: 4 }), caja(-8, 0, 64, 30, 2.4, 8, { mat: 'abo_madera_quemada', giro: 100, incl: -6 }), caja(6, 0, 52, 26, 2.4, 7, { mat: 'abo_madera_quemada', giro: -30 })], 34, 70, 0, 1);
  pon(piezasDe('par_cuervos', 'posados', 312), -150, 360, 0, 1.2);
  // menhires y piedras lejos, brezo y pasto seco cerca (el primer plano oscuro que enmarca abajo)
  for (const [x, y, v, s, k] of [[260, 520, 'inclinado', 313, 1.6], [-420, 760, 'alto', 314, 1.8], [520, 1100, 'gemelos', 315, 2]] as [number, number, string, number, number][]) pon(piezasDe('par_menhir', v, s), x, y, az(s) * 360, k);
  for (let i = 0; i < 70; i++) {
    const x = (az(i, 321) - 0.5) * 1400, y = -120 + az(i, 322) * 1500;
    if (camino(x, y) < 40 || Math.hypot(x - 40, y + 150) < 70) continue;
    pon(piezasDe(az(i, 323) < 0.6 ? 'par_brezo' : 'par_pasto', az(i, 323) < 0.6 ? ['seco', 'morado', 'mezcla', 'grande'][Math.floor(az(i, 324) * 4)] : variante0('par_pasto'), 330 + i), x, y, az(i, 325) * 360, 1 + az(i, 326) * 0.8, y < 0);
  }
  for (let i = 0; i < 14; i++) { const x = (az(i, 341) - 0.5) * 1200, y = 100 + az(i, 342) * 1200; if (camino(x, y) < 40) continue; pon(piezasDe('par_roca', ['chica', 'mediana', 'grupo'][Math.floor(az(i, 343) * 3)], 350 + i), x, y, az(i, 344) * 360, 1.2); }
  // el héroe: parado en el cruce, de espaldas, mirando al sur; la Marca le late en el antebrazo
  const giroH = 90 + 8, gH = pon(personaje(HEROE_CU, HEROE_EQ, 's', 'quieto', 0), 22, 40, giroH - 45, 1, true);
  const manos = manosDe(esc, gH), mano = manos.sort((a, b) => a[0] - b[0])[0] ?? [16, 40, 30];
  esc.ponerMundo([elipsoide(mano[0], mano[1] - 1, mano[2] + 6, 1.4, 1.4, 4, { mat: 'aa_marca', incl: 10 })], { nieve: 0 });
  esc.emision.aa_marca = { k: 3 };
  esc.luces.push({ p: [mano[0] - 2, mano[1] - 3, mano[2] + 6], c: hexLin('#ff4a1a'), k: 0.25, r: 8, envuelve: 0.4, halo: 0.002 });
  // la luz: el último resto del crepúsculo al sur (frío) y, cuando cae, la estrella roja (el foco cálido del cuadro)
  const S = ESTRELLA_A1, dS = dirAz(S.az, S.el);
  if (estrella) esc.luces.push({ p: add([22, 40, 0], dS, 9000), c: hexLin('#ff3a14'), k: 0.22, r: 9000, envuelve: 0.05 });
  const atm = atmCielo({
    luz: dirAz(S.az, 11), luzC: hexLin('#8fa4c8'), luzK: 0.35, ancho: 0.05,
    pars: [[-0.02, hexLin('#2a3044')], [0.01, hexLin('#3c4660')], [0.06, hexLin('#26304a')], [0.18, hexLin('#161d33')], [0.5, hexLin('#0a0d1a')], [1.2, hexLin('#04050a')]],
    halo: { c: hexLin('#7f8fb0'), k: [0, 0.1, 0.06] }, estrellas: 1,
    nubes: [{ s: 61.3, esc: 2400, cubre: 0.5, alto: 3000, c: hexLin('#0e121c'), luzC: hexLin('#7080a8'), k: 0.14, a: 0.9 }],
    extra: estrella ? cieloEstrella : undefined,
    amb: [escalar(hexLin('#33405e'), 0.16), escalar(hexLin('#16141a'), 0.12)],
    niebla: { densidad: 1 / 16000, baja: 1 / 6000, z0: 0, H: 50, ruido: 0.7, escalaRuido: 0.002 },
    borde: { c: estrella ? hexLin('#ff6a3a') : hexLin('#a0b4d8'), k: 0.8 }, nieve: { albedo: [0.4, 0.42, 0.48], desde: 0.88 },
  });
  const z0 = ter.h(96, -170) + 46, cam = camaraBase([96, -170, z0], [-30, 420, z0 + 34], 40, w, h);
  return { esc, atm, cam, fuegos };
}
/** La estrella cae a los 2 s: se enciende de a poco, su luz roja llega al héroe y a la horca. */
const TIEMPO_ESTRELLA: [number, number][] = [[0, 0], [1.6, 0], [2.0, 0.6], [2.25, 0.35], [2.6, 0.9], [3.2, 1]];
const A1P3: Plano3D = {
  id: 'p3_camino', paralaje: 0.85, particulas: 'ceniza',
  armar: memo((w, h) => armarCruce(w, h)),
  revelado: { t: 0, exposicion: 1.35, derrame: { k: 0.5, r: 5 }, bloom: { k: 0.4, umbral: 0.8 }, grado: gradoNoche },
  variantes: [{ id: 'estrella', armar: memo((w, h) => armarCruce(w, h, true)), anim: { tipo: 'tiempo', claves: TIEMPO_ESTRELLA }, escala: 2 }],
  qa: [0.5, 2.2, 4, 7],
};

// ================================================================== ACTO 2 · p1: Khamer-Ul se deshace en arena bajo el haz de luz
/** El haz: entra por un hueco del techo, alto y detrás del rey (le da de espaldas: el ojo lo ve a contraluz). */
const SOL_A2P1 = norm([0.12, 0.5, 1]), HUECO_A2P1 = { z: 360, r: 34 };
function armarRey(w: number, h: number): Armado {
  const esc = new EscenaCine(), L = SOL_A2P1, Z = HUECO_A2P1.z;
  // dónde cruza el haz el techo (sobre el rey)
  const tz = (Z - 70) / L[2], hx = L[0] * tz, hy = L[1] * tz;
  // la cámara: piso de losas con arena, cuatro muros con signos, columnas papiro en dos filas, el techo con el hueco
  esc.ponerMundo([caja(0, 100, -20, 900, 900, 20, { mat: 'tumba_sillar' })], { nieve: 0 });
  esc.ponerMundo([caja(0, 100, Z, 900, 900, 60, { mat: 'tumba_liso' }), cilindro(hx, hy, Z - 10, HUECO_A2P1.r, 90, { mat: 'tumba_liso', resta: true, r1: HUECO_A2P1.r * 0.8 })], { nieve: 0 });
  // el cielo de afuera, arriba del hueco: un terreno lejano no hace falta, el cielo lo pone la atmósfera
  for (const [x, y, g] of [[0, 430, 0], [-330, 100, 90], [330, 100, 90], [0, -330, 0]] as [number, number, number][]) {
    for (let k = -2; k <= 2; k++) { const ox = g ? 0 : k * 80, oy = g ? k * 80 : 0; esc.poner(piezasDe('tum_muro', k % 2 ? 'signos' : 'nicho', 400 + k + x), { x: x + ox, y: y + oy, z: 0, giro: g, k: 1 }, { nieve: 0 }); }
    esc.ponerMundo([caja(x, y, 0, g ? 30 : 700, g ? 700 : 30, Z, { mat: 'tumba_sillar' })], { nieve: 0 });
  }
  for (const x of [-170, 170]) for (const y of [-120, 40, 200, 360]) esc.poner(piezasDe('tum_columna', y === 200 ? 'rota' : 'papiro', 420 + y + x), { x, y, z: 0, k: 1.6 }, { nieve: 0 });
  esc.ponerMundo([...[-170, 170].flatMap((x) => [-120, 40, 360].map((y) => cilindro(x, y, 150, 14, Z - 150, { mat: 'tumba_liso' })))], { nieve: 0 });
  // guardianes a los costados (siluetas que enmarcan), el sarcófago abierto detrás y los canopos
  esc.poner(piezasDe('tum_guardian', 'de_pie', 431), { x: -120, y: 250, z: 0, giro: -90, k: 1.8 }, { nieve: 0 });
  esc.poner(piezasDe('tum_guardian', 'sin_cabeza', 432), { x: 130, y: 260, z: 0, giro: -90, k: 1.8 }, { nieve: 0 });
  esc.poner(piezasDe('tum_sarcofago', 'momia_abierto', 433), { x: 10, y: 190, z: 0, giro: 90, k: 1.3 }, { nieve: 0 });
  for (const [x, y, s] of [[-90, 120, 434], [100, 110, 435], [70, 150, 436]] as [number, number, number][]) esc.poner(piezasDe('tum_canopos', s === 436 ? 'caidos' : 'canopos', s), { x, y, z: 0, giro: az(s) * 360, k: 1.2 }, { nieve: 0 });
  // arena en el piso: montones bajos que el viento del hueco fue dejando, y la del rey
  for (let i = 0; i < 9; i++) { const a = az(i, 441) * TAU, r = 60 + az(i, 442) * 200; esc.ponerMundo([masa([bulto([Math.cos(a) * r, Math.sin(a) * r + 40, -2], [30 + az(i, 443) * 40, 20 + az(i, 444) * 30, 5 + az(i, 445) * 5], { mat: 'arena', giro: az(i, 446) * 180 })], { mat: 'arena', suave: 6 })], { nieve: 0 }); }
  // Khamer-Ul: ya medio hecho arena (el cuadro 6 de su muerte), de frente al ojo; chorros de arena le caen del cuerpo
  const gK = esc.poner(jefe('rey_sin_sombra', 'morir', 6), { x: 0, y: 0, z: 0, giro: -90, k: 1.15 }, { nieve: 0 });
  void gK;
  const chorros: Pieza[] = [];
  for (let i = 0; i < 16; i++) { const a = az(i, 451) * TAU, r = 10 + az(i, 452) * 18, z0 = 40 + az(i, 453) * 50, x = Math.cos(a) * r, y = Math.sin(a) * r; chorros.push(palo([x, y, z0], [x * 1.1, y * 1.1, 6], 0.5 + az(i, 454) * 0.8, { mat: 'arena', r1: 0.3 })); }
  for (let i = 0; i < 60; i++) { const a = az(i, 455) * TAU, r = az(i, 456) * 40, z = 4 + az(i, 457) * 110; chorros.push(esfera(Math.cos(a) * r, Math.sin(a) * r, z, 0.4 + az(i, 458) * 0.7, { mat: 'arena' })); }
  esc.ponerMundo(chorros, { nieve: 0 });
  // la máscara de oro, cayendo: se le soltó de la cara y va de canto hacia la arena
  const masc: Pieza[] = [masa([bulto([0, 0, 0], [3.2, 7.5, 9.5], { mat: 'cu_oro' }), bulto([1.6, 0, 3], [1.2, 6, 2], { mat: 'cu_oro' })], { mat: 'cu_oro', suave: 1.2 })];
  for (const s of [1, -1]) masc.push(elipsoide(2.4, s * 3, 2.5, 0.8, 2, 1, { mat: 'jf_lapis' }));
  for (let k = 0; k < 5; k++) masc.push(elipsoide(-0.5, 0, -9 - k * 2.2, 1.6, 4.5 - k * 0.5, 1.1, { mat: k % 2 ? 'jf_lapis' : 'cu_oro' }));
  esc.ponerMundo(girar(masc, [1, 0.3, 0], 60).map((p) => girar([p], [0, 0, 1], -90)[0]).map((p) => girar([p], [0, 0, 1], 0, [0, 0, 0], [4, -24, 44])[0]), { nieve: 0 });
  // polvo en el haz: solo el que ve el sol por el hueco
  const polvo: Particula[] = [], bvh = esc.bvh;
  for (let i = 0; i < 9000 && polvo.length < 900; i++) {
    const u = az(i, 461) * 1.25 - 0.25, p: V3 = [L[0] * u * tz + (az(i, 462) - 0.5) * 80, L[1] * u * tz + (az(i, 463) - 0.5) * 80, 70 + u * (Z - 70) + (az(i, 464) - 0.5) * 60];
    if (p[2] < 2 || bvh.golpe(p, L, 0.1, 3000)) continue;
    polvo.push({ p, r: 0.1 + az(i, 465) * 0.12, c: escalar(hexLin('#ffd8a0'), 0.25 + az(i, 466) * 0.7), a: 1, suma: true });
  }
  // el haz mismo: polvo fino en suspensión que el sol enciende (una columna de humo muy rala, a lo largo del haz)
  const base: V3 = [-L[0] * (70 / L[2]), -L[1] * (70 / L[2]), 0], alto = Z;
  const plumas: Pluma[] = [{ base, alto, r0: 26, r1: 34, viento: [(hx - base[0]) / alto, (hy - base[1]) / alto, 0], dens: 0.006, humo: [0.45, 0.4, 0.34], semilla: 467, sube: 3, escala: 1 / 30, sol: 2 }];
  // un rebote cálido del piso iluminado (muy poco) y el frío de la sala
  esc.luces.push({ p: [hx * 0.1, hy * 0.1 - 20, 10], c: hexLin('#c09060'), k: 0.25, r: 120, envuelve: 0.3 });
  // del fondo, por la puerta de la cámara, la noche fría del desierto: despega los guardianes y las columnas de atrás
  esc.luces.push({ p: [-40, 400, 120], c: hexLin('#5f78b0'), k: 3, r: 220, envuelve: 0.2, sombra: true });
  esc.emision.cu_ojo_verde = { k: 0.08 };
  const atm = atmCielo({
    luz: L, luzC: hexLin('#ffd8a8'), luzK: 5.5, ancho: 0.03,
    pars: [[0, hexLin('#e8c8a0')], [0.5, hexLin('#c8a888')], [1.6, hexLin('#a89078')]], halo: { c: hexLin('#ffe0b0'), k: [3, 0.4, 0] },
    amb: [escalar(hexLin('#304868'), 0.14), escalar(hexLin('#141418'), 0.06)],
    niebla: { densidad: 1 / 2600, baja: 0, z0: 0, H: 1 }, borde: { c: hexLin('#ffd0a0'), k: 2.6 }, oclusion: 0.95, oclusionLargo: 500,
  });
  // el aire de adentro es oscuro y frío (no el cielo de afuera)
  const aire: C3 = [0.004, 0.005, 0.008];
  atm.aire = () => aire;
  const cam = camaraBase([34, -290, 40], [0, 20, 62], 42, w, h);
  return { esc, atm, cam, polvo, plumas };
}
const A2P1: Plano3D = {
  id: 'p1_rey', paralaje: 0.9, particulas: 'polvo', ss: 4, ao: 3,
  armar: memo(armarRey),
  revelado: { t: 0, exposicion: 1.3, rayos: { k: 0.55, c: [1, 0.85, 0.65], umbral: 0.45, decae: 0.975 }, derrame: { k: 0.5, r: 5 }, bloom: { k: 0.35, umbral: 0.8 }, grado: gradoCripta },
};

// ================================================================== ACTO 2 · p2: el coloso enterrado se raja; la brasa huye por el camino de los empalados
MATERIALES.aa_piedra_coloso = { rampa: ['#0e0806', '#1c110c', '#2c1b13', '#3e271b', '#523424', '#68432e', '#7e543a'], ruido: 0.3, escala: 0.04, brillo: 0.08, patron: (p) => (Math.abs(Math.sin(p[2] * 0.06 + Math.sin(p[0] * 0.02) * 1.5)) < 0.05 ? -0.2 : 0) };
/** El camino de los empalados va hacia el este (+y); el coloso queda a la izquierda, medio enterrado en la duna. */
const COLOSO = { x: -560, y: 1150, k: 1 }, BRASA_A2P2: V3 = [-170, 1900, 110];
/**
 * El coloso: cabeza de faraón con su nemes (el tocado de paños que se abre a los costados), la barba postiza y los
 * hombros, tallado en planos (piedra, no masa blanda) y partido en dos por la raja: cada mitad va en su grupo, recortada
 * a su lado del corte, y la de la derecha se abre unos grados. Adentro de la raja, la brasa al rojo.
 */
function coloso(): Pieza[][] {
  const m = 'aa_piedra_coloso', todo: Pieza[] = [];
  const bloque = (pts: V3[], tono = 0) => todo.push(poliedro(pts, { mat: m, tono }));
  // hombros y pecho: una losa ancha con la parte de arriba en pendiente
  bloque([[-280, -70, 0], [280, -70, 0], [-280, 90, 0], [280, 90, 0], [-250, -50, 190], [250, -50, 190], [-230, 70, 230], [230, 70, 230], [-120, -80, 240], [120, -80, 240]]);
  // el nemes: tronco de pirámide que se abre hacia abajo, con su remate atrás
  bloque([[-78, -56, 540], [78, -56, 540], [-82, 70, 530], [82, 70, 530], [-160, -40, 300], [160, -40, 300], [-170, 100, 290], [170, 100, 290]], 0.04);
  bloque([[-40, 60, 520], [40, 60, 520], [-30, 120, 300], [30, 120, 300], [-60, 90, 300], [60, 90, 300]], -0.03);
  // los paños que caen adelante, a los dos lados de la cara, hasta el pecho
  for (const sx of [-1, 1]) bloque([[sx * 70, -70, 420], [sx * 150, -60, 300], [sx * 70, -40, 420], [sx * 150, -20, 300], [sx * 100, -90, 170], [sx * 150, -80, 170], [sx * 100, -60, 170], [sx * 150, -50, 170]], 0.02);
  // la cara: el bloque, la frente con las cejas, la nariz (cuña), la boca y la barba postiza
  bloque([[-62, -98, 470], [62, -98, 470], [-60, -50, 480], [60, -50, 480], [-56, -92, 330], [56, -92, 330], [-56, -50, 320], [56, -50, 320]], 0.06);
  bloque([[-60, -104, 455], [60, -104, 455], [-60, -96, 470], [60, -96, 470], [-58, -102, 440], [58, -102, 440]], 0.08);
  bloque([[-12, -100, 440], [12, -100, 440], [0, -126, 380], [-16, -104, 372], [16, -104, 372], [0, -118, 370]], 0.1);
  bloque([[-26, -97, 355], [26, -97, 355], [-22, -97, 340], [22, -97, 340], [0, -104, 348]], 0.02);
  todo.push(cilindro(0, -88, 330, 17, 110, { mat: m, r1: 13, eje: [0, -0.15, -1], tono: 0.03 }));
  // la arena que se le juntó en los hombros y la duna que lo traga
  const mitades: Pieza[][] = [];
  for (const lado of [-1, 1]) {
    // la mitad: todo, menos lo del otro lado del corte (la raja se abre arriba: el corte es una cuña)
    const corte = poliedro(lado < 0 ? [[-2, -300, -10], [600, -300, -10], [-2, 300, -10], [600, 300, -10], [18, -300, 700], [600, -300, 700], [18, 300, 700], [600, 300, 700]] : [[2, -300, -10], [-600, -300, -10], [2, 300, -10], [-600, 300, -10], [-18, -300, 700], [-600, -300, 700], [-18, 300, 700], [-600, 300, 700]], { mat: m, resta: true });
    const ps = [...todo, corte];
    mitades.push(lado > 0 ? girar(ps, [0, 1, 0], -3, [0, 0, 0]) : ps);
  }
  // adentro de la raja: la brasa (una lámina al rojo en el medio) y trozos que se desprenden
  const raja: Pieza[] = [caja(0, 0, 40, 6, 180, 500, { mat: 'aa_brasa' })];
  for (let i = 0; i < 9; i++) { const pts: V3[] = [], c: V3 = [(az(i, 511) - 0.5) * 80, -110 - az(i, 512) * 40, 140 + az(i, 513) * 360], R = 6 + az(i, 514) * 14; for (let j2 = 0; j2 < 9; j2++) pts.push([c[0] + (az(i * 9 + j2, 515) - 0.5) * R * 2, c[1] + (az(i * 9 + j2, 516) - 0.5) * R * 2, c[2] + (az(i * 9 + j2, 517) - 0.5) * R * 2]); raja.push(poliedro(pts, { mat: m, tono: -0.05 })); }
  mitades.push(raja);
  return mitades;
}
function armarColoso(w: number, h: number): ArmadoA {
  const esc = new EscenaCine(), fuegos: Fuego[] = [], plumas: Pluma[] = [];
  const camino = (x: number, y: number) => Math.abs(x - 40 * Math.sin(y / 900) + 20);
  const alto = (x: number, y: number) => {
    // dunas: crestas filosas (el valor absoluto de una onda torcida) más lomadas, y el camino que las corta
    const wx = x + (fbm2(x / 1400, y / 1400, 3, 521) - 0.5) * 900, cresta = 1 - Math.abs(Math.sin((wx * 0.8 + y * 0.35) / 520 + fbm2(x / 700, y / 700, 2, 522) * 3));
    const d = Math.hypot(x, y - 400), dunas = (cresta * cresta * 120 + fbm2(x / 2200, y / 2200, 3, 523) * 180) * suave(150, 900, camino(x, y) + d * 0.1);
    const lejos = suave(6000, 20000, Math.hypot(x, y)) * fbm2(x / 6000, y / 6000, 3, 524) * 700;
    return dunas + lejos + (fbm2(x / 30, y / 30, 2, 525) - 0.5) * 1.6;
  };
  esc.terreno = new Terreno({
    alto, techo: 1500, grillas: [[-2400, -600, 2400, 4200, 6], [-14000, -3000, 14000, 24000, 40], [-80000, -8000, 80000, 80000, 400]],
    superficie: (p, n) => {
      const c = camino(p[0], p[1]), r = fbm2(p[0] / 60, p[1] / 60, 3, 526), rizo = 0.5 + 0.5 * Math.sin((p[0] * 0.8 + p[1] * 0.35) / 7 + r * 4);
      let alb: C3 = mezclar(hexLin('#4a1c10'), hexLin('#6a2c18'), r * 0.6 + rizo * 0.3);
      if (c < 40) alb = mezclar(alb, hexLin('#2a1810'), (1 - suave(20, 40, c)) * 0.8);
      void n;
      return { albedo: alb, brillo: 0.03 };
    },
  });
  const ter = esc.terreno, pon = (ps: Pieza[], x: number, y: number, giro = 0, k = 1, frente = false) => { const g = esc.poner(ps, { x, y, z: ter.h(x, y) - 2, giro, k }, { nieve: 0 }); if (frente) esc.frente.add(g); return g; };
  // los empalados a los dos lados del camino, cada vez más chicos hacia el horizonte
  for (let i = 0; i < 26; i++) {
    const y = -40 + i * 130 + az(i, 531) * 40;
    for (const lado of [-1, 1]) { if (az(i * 2 + lado, 532) < 0.18) continue; const x = 40 * Math.sin(y / 900) - 20 + lado * (70 + az(i, 533 + lado) * 30); pon(piezasDe(az(i * 3 + lado, 534) < 0.6 ? 'des_empalado' : 'hor_empalado', az(i * 3 + lado, 534) < 0.6 ? (az(i, 535 + lado) < 0.3 ? 'buitres' : 'envuelto') : 'viejo', 540 + i * 2 + lado), x, y, az(i, 536 + lado) * 360, 1.5, i < 2); }
  }
  // el coloso: la cabeza y los hombros afuera de la duna, de frente al camino, rajado de arriba abajo
  const zc = ter.h(COLOSO.x, COLOSO.y) - 60;
  for (const ps of coloso()) esc.poner(ps, { x: COLOSO.x, y: COLOSO.y, z: zc, giro: 30, k: COLOSO.k }, { nieve: 0 });
  const enMundo = (p: V3): V3 => { const a = (30 * Math.PI) / 180; return [COLOSO.x + p[0] * Math.cos(a) - p[1] * Math.sin(a), COLOSO.y + p[0] * Math.sin(a) + p[1] * Math.cos(a), zc + p[2]]; };
  esc.emision.aa_brasa = { k: 3.2, canal: 1 };
  for (const [i, z] of [[0, 140], [1, 260], [2, 380]] as [number, number][]) esc.luces.push({ p: enMundo([0, -150, z]), c: hexLin('#ff4a18'), k: 1.4 - i * 0.3, r: 110, canal: 1, sombra: true, envuelve: 0.3, halo: 0.00004 });
  for (const [z, al, s] of [[300, 120, 551], [180, 90, 552], [420, 70, 553]] as [number, number, number][]) fuegos.push({ p: enMundo([0, -70, z]), ancho: 22, alto: al, semilla: s, tipo: 'techo', k: 2 });
  plumas.push({ base: enMundo([0, -60, 480]), alto: 900, r0: 20, r1: 220, viento: [0.5, 0.3, 0], dens: 0.03, humo: [0.05, 0.035, 0.03], abajo: hexLin('#ff4a18'), kAbajo: 0.8, decaeAbajo: 4, semilla: 554, sube: 18, escala: 1 / 50, sol: 0.3 });
  // la brasa: va baja sobre el camino, lejos, hacia el este; su luz roja tira las sombras de los empalados hacia el ojo
  const B = BRASA_A2P2;
  B[2] = ter.h(B[0], B[1]) + 170;
  esc.ponerMundo(rocaBrasa(B, 24, 560), { nieve: 0 });
  esc.luces.push({ p: B, c: hexLin('#ff5a1a'), k: 20, r: 240, canal: 1, sombra: true, envuelve: 0.2, halo: 0.000015 });
  fuegos.push({ p: add(B, [0, 0, -18]), ancho: 64, alto: 300, semilla: 561, tipo: 'techo', k: 2.3 });
  // la noche del desierto: azul de tinta arriba, el horizonte apenas tibio y una luna baja detrás del coloso
  const luna = norm([-0.75, 0.5, 0.22]);
  const atm = atmCielo({
    luz: luna, luzC: hexLin('#8aa0d8'), luzK: 0.45, ancho: 0.02,
    pars: [[-0.02, hexLin('#2a1c22')], [0.01, hexLin('#3a2a34')], [0.05, hexLin('#24243a')], [0.18, hexLin('#121630')], [0.5, hexLin('#080a1a')], [1.2, hexLin('#04040a')]],
    halo: { c: hexLin('#8aa0d8'), k: [0.6, 0.06, 0.01], disco: 1.4 }, estrellas: 1.6,
    extra: (d) => { const g = Math.max(0, dot3(d, norm([B[0] - 60, B[1] + 260, B[2] - 60]))); return escalar(hexLin('#ff4a18'), 0.04 * Math.pow(g, 200)); },
    amb: [escalar(hexLin('#2c3a60'), 0.22), escalar(hexLin('#2a1410'), 0.12)],
    niebla: { densidad: 1 / 9000, baja: 1 / 3000, z0: 0, H: 60, ruido: 0.6, escalaRuido: 0.002 },
    borde: { c: hexLin('#ff6a3a'), k: 1.2 },
  });
  const z0 = ter.h(60, -260) + 40, cam = camaraBase([60, -260, z0], [-150, 900, z0 + 90], 42, w, h);
  return { esc, atm, cam, plumas, fuegos, brasas: (t) => chispas(t, B, 60, 40, -120, '#ff7a2a', 5, [0, -1.2, 0]) };
}
const A2P2: Plano3D = {
  id: 'p2_coloso', paralaje: 0.85, particulas: 'polvo',
  armar: memo(armarColoso),
  revelado: { t: 0, exposicion: 1.35, derrame: { k: 0.45, r: 5 }, bloom: { k: 0.45, umbral: 0.75 }, grado: gradoNoche },
  flickBase: 0.84, cuadros: NF, fps: FPS, extras: (a, _c, t) => fuegoDe(a as ArmadoA, t), zonas: (a) => zonasFuegos(a, 50, 2),
};

// ================================================================== ACTO 2 · p3: el barco de Oyá baja el río; detrás camina algo pálido
MATERIALES.aa_agua = { rampa: ['#010203', '#020406', '#04070a', '#060b10'], ruido: 0.1, escala: 0.2, brillo: 0.22 };
MATERIALES.aa_palida = { rampa: ['#3c4448', '#5a6468', '#7e888a', '#a4acaa', '#c8ceca', '#e2e6e0'], ruido: 0.15, escala: 0.6, emite: true };
MATERIALES.aa_junco = { rampa: ['#050604', '#0a0c07', '#10130b', '#171b10'], ruido: 0.3, escala: 1 };
/** El río corre a lo largo de x (baja hacia -x); la luna, baja sobre la otra orilla, detrás del barco. */
const RIO_A2 = { ancho: 340, barco: [40, 160] as [number, number], palida: [310, 130] as [number, number] };
/** Una mata de juncos (papiro): tallos finos que se abren, con su penacho. */
function juncos(s: number, n: number, alto: number): Pieza[] {
  const ps: Pieza[] = [];
  for (let i = 0; i < n; i++) { const a = az(i, s) * TAU, r = az(i, s + 1) * 10, al = alto * (0.6 + az(i, s + 2) * 0.5), inc: V3 = [Math.cos(a) * 0.25 * az(i, s + 3), Math.sin(a) * 0.25 * az(i, s + 3), 1], tope = add([Math.cos(a) * r, Math.sin(a) * r, 0], norm(inc), al); ps.push(palo([Math.cos(a) * r, Math.sin(a) * r, -2], tope, 0.5, { mat: 'aa_junco', r1: 0.3 }), elipsoide(tope[0], tope[1], tope[2] + 2, 4, 4, 3, { mat: 'aa_junco' })); }
  return ps;
}
function armarRio(w: number, h: number): ArmadoA {
  const esc = new EscenaCine(), R = RIO_A2;
  const orilla = (x: number, y: number) => { const d = Math.abs(y - 120 - 40 * Math.sin(x / 700)) - R.ancho; return d; };
  const alto = (x: number, y: number) => {
    const o = orilla(x, y), lejos = suave(3000, 16000, Math.hypot(x, y)) * fbm2(x / 5000, y / 5000, 3, 601) * 900;
    return o < 0 ? -1 : Math.min(40, o * 0.25) + (fbm2(x / 300, y / 300, 3, 602) - 0.4) * 40 * suave(0, 120, o) + lejos;
  };
  esc.terreno = new Terreno({
    alto, techo: 1200, grillas: [[-2000, -800, 2400, 2400, 4], [-12000, -4000, 12000, 20000, 40], [-80000, -8000, 80000, 80000, 400]],
    superficie: (p) => {
      if (p[2] < -0.5) return { albedo: [0.004, 0.006, 0.008], brillo: 0.95 };
      const r = fbm2(p[0] / 50, p[1] / 50, 3, 603);
      return { albedo: mezclar(hexLin('#1a120c'), hexLin('#2a1e14'), r), brillo: 0.04 };
    },
  });
  // el agua: una lámina quieta a z = 0 (refleja la luna y el cielo)
  esc.ponerMundo([caja(300, 120, -4, 20000, R.ancho * 2 + 400, 4, { mat: 'aa_agua' })], { nieve: 0 });
  const ter = esc.terreno, pon = (ps: Pieza[], x: number, y: number, giro = 0, k = 1, frente = false, z?: number) => { const g = esc.poner(ps, { x, y, z: z ?? ter.h(x, y) - 2, giro, k }, { nieve: 0 }); if (frente) esc.frente.add(g); return g; };
  // la otra orilla: palmeras y una ruina en silueta contra la luna; esta orilla: juncos negros que enmarcan abajo
  for (let i = 0; i < 26; i++) { const x = -1400 + i * 120 + az(i, 611) * 80, y = 120 + R.ancho + 60 + az(i, 612) * 300; if (az(i, 613) < 0.25) continue; pon(piezasDe('des2_palmera', variante0('des2_palmera'), 620 + i), x, y, az(i, 614) * 360, 1.4 + az(i, 615) * 0.8); }
  pon(piezasDe('des2_obelisco', 'inclinado', 631), 520, 120 + R.ancho + 140, 20, 2.4);
  pon(piezasDe('des2_columnas', variante0('des2_columnas'), 632), -380, 120 + R.ancho + 180, 0, 2);
  for (let i = 0; i < 14; i++) { const lado = i % 2 ? 1 : -1, x = 150 + lado * (150 + az(i, 641) * 160), y = -230 + az(i, 642) * 60; pon(juncos(650 + i * 7, 7 + Math.floor(az(i, 643) * 6), 18 + az(i, 644) * 22), x, y, 0, 1, true, -2); }
  // el barco: la falúa con su vela, de costado, bajando; un farol en la popa (el único fuego del cuadro) y su luz
  const [bx, by] = R.barco;
  const gB = pon(piezasDe('des_falua', 'agua', 661).filter((p) => p.mat !== 'agua'), bx, by, 180, 1.6, false, -3);
  void gB;
  const farol: V3 = [bx + 70, by - 6, 34];
  esc.ponerMundo([caja(farol[0], farol[1], farol[2] - 4, 5, 5, 8, { mat: 'luz_vela' }), palo([farol[0], farol[1], farol[2] + 4], [farol[0], farol[1], farol[2] + 10], 0.4, { mat: 'hierro' })], { nieve: 0 });
  esc.emision.luz_vela = { k: 4, canal: 1 };
  esc.luces.push({ p: add(farol, [0, -8, 0]), c: hexLin('#ffa050'), k: 2.6, r: 36, canal: 1, sombra: true, envuelve: 0.4, halo: 0.002 });
  // los que van en el barco, en silueta (Oyá al timón y dos más, sin hablar)
  for (const [dx, s, k] of [[56, 671, 0.95], [10, 672, 1], [-30, 673, 0.9]] as [number, number, number][]) pon(personaje({ genero: s === 671 ? 'm' : 'h', alto: k, ancho: 1, musculo: 0.4, piel: 'cu_piel', pelo: 'cu_pelo_negro', peinado: 'largo' }, { torso: { tipo: 'tunica', mat: 'cu_tela_negra' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_parda' }, capa: { mat: 'cu_tela_negra', largo: 0.9 }, cabeza: { tipo: 'capucha', mat: 'cu_tela_negra' } }, 's', 'quieto', 0), bx + dx, by + 4, 135 + (az(s) - 0.5) * 30, 1, false, 8);
  // la figura pálida: camina sobre el agua detrás del barco, el pelo largo, la boca abierta (canta); brilla apenas
  const [px, py] = R.palida;
  const palida = personaje({ genero: 'm', alto: 1.05, ancho: 0.82, musculo: 0.1, piel: 'cu_piel', pelo: 'cu_pelo_negro', peinado: 'largo' }, { torso: { tipo: 'vestido', mat: 'cu_tela_blanca' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_blanca' } }, 's', 'caminar', 2);
  pon(teñir(palida, 'aa_palida'), px, py, 180 - 45, 1, false, 0.5);
  esc.emision.aa_palida = { k: 0.22 };
  esc.luces.push({ p: [px - 10, py - 20, 40], c: hexLin('#a8c8c0'), k: 0.12, r: 40, envuelve: 0.3, halo: 0.0006 });
  // la luna baja sobre la otra orilla, detrás del barco: el camino de luz en el agua pasa entre el barco y la figura
  const luna = norm([0.05, 1, 0.15]);
  const atm = atmCielo({
    luz: luna, luzC: hexLin('#a8b8e8'), luzK: 0.9, ancho: 0.015,
    pars: [[-0.02, hexLin('#0e121c')], [0.01, hexLin('#1c2438')], [0.06, hexLin('#161d36')], [0.2, hexLin('#0e1430')], [0.5, hexLin('#070a1a')], [1.2, hexLin('#030409')]],
    halo: { c: hexLin('#b0c0f0'), k: [1.2, 0.2, 0.03], disco: 3 }, estrellas: 1.4,
    nubes: [{ s: 71.3, esc: 2000, cubre: 0.5, alto: 2600, c: hexLin('#0c1020'), luzC: hexLin('#a0b0e0'), k: 0.5, a: 0.85 }],
    amb: [escalar(hexLin('#2a3a62'), 0.18), escalar(hexLin('#0e1014'), 0.1)],
    niebla: { densidad: 1 / 14000, baja: 1 / 2600, z0: 0, H: 22, ruido: 0.8, escalaRuido: 0.004 },
    borde: { c: hexLin('#b8c8f0'), k: 0.6 },
  });
  const cam = camaraBase([150, -330, 34], [170, 300, 58], 40, w, h);
  // los destellos de la luna en el agua: puntos que se prenden y se apagan sobre el camino de luz
  const destellos = (t: number): Particula[] => {
    const ps: Particula[] = [], c = hexLin('#c8d4ff');
    for (let i = 0; i < 220; i++) {
      // a lo largo del camino de la luna: más juntos en el medio, se apagan hacia los costados
      const u = az(i, 681), y = -60 + u * 500, lat = (az(i, 682) + az(i, 685) - 1) * (12 + u * 70), x = 150 + (y + 330) * (luna[0] / luna[1]) + lat, f = (t * 12 / NF + az(i, 683)) % 1;
      const borde = Math.exp(-((lat / (12 + u * 70)) ** 2) * 3);
      ps.push({ p: [x, y, 0.3], r: 0.4 + az(i, 684) * 0.6, c: escalar(c, 1.8 * borde * Math.max(0, Math.sin(f * TAU * 2)) ** 3), a: 1, suma: true });
    }
    return ps;
  };
  return { esc, atm, cam, fuegos: [], brasas: destellos };
}
const A2P3: Plano3D = {
  id: 'p3_rio', paralaje: 0.85, particulas: 'polvo',
  armar: memo(armarRio),
  revelado: { t: 0, exposicion: 1.3, derrame: { k: 0.5, r: 5 }, bloom: { k: 0.4, umbral: 0.8 }, grado: gradoNoche },
  flickBase: 0.9, cuadros: NF, fps: FPS, extras: (a, _c, t) => fuegoDe(a as ArmadoA, t),
  // una tira con el farol y su luz, y otra con los destellos del agua (a media resolución)
  zonas: (a) => { const b = baseCamara(a.cam), q = proyectar(b, [RIO_A2.barco[0] + 70, RIO_A2.barco[1] - 6, 34]), z: { caja: [number, number, number, number]; escala: number }[] = [{ caja: [280, 420, 1130, 791], escala: 2 }]; if (q) z.push({ caja: [q[0] - 40, q[1] - 40, q[0] + 40, q[1] + 40], escala: 1 }); return z; },
};

// ================================================================== ACTO 3 · p1: la Madre Ciénaga se abre y se hunde; los huevos revientan
MATERIALES.aa_huevo = { rampa: ['#0c0f08', '#161c0e', '#222a16', '#303a20', '#3e4a2a', '#4e5a36'], ruido: 0.35, escala: 0.5, brillo: 0.5, patron: (p) => (Math.sin(p[0] * 0.7 + p[2] * 0.9) > 0.85 ? -0.12 : 0) };
MATERIALES.aa_bilis = { rampa: ['#2a4a08', '#4a7a10', '#7ab020', '#b0e040', '#d8ff80'], ruido: 0.3, escala: 0.4, emite: true };
MATERIALES.aa_charco_bilis = { rampa: ['#1a3006', '#2a4a08', '#4a7a10', '#6a9a18'], ruido: 0.4, escala: 0.4, emite: true };
MATERIALES.aa_lodo = { rampa: ['#030302', '#060504', '#0a0907', '#100e0b', '#16130f'], ruido: 0.3, escala: 0.3, brillo: 0.8 };
/** Un huevo de la Madre (cuero verdoso, del tamaño de un perro): entero, o reventado con su yema que brilla y se derrama. */
function huevo(s: number, r: number, roto: boolean): Pieza[] {
  const h = r * (1.25 + az(s, 1) * 0.2), ps: Pieza[] = [];
  if (!roto) return [elipsoide(0, 0, h * 0.85, r, r * 0.95, h, { mat: 'aa_huevo', tono: (az(s, 2) - 0.5) * 0.2, incl: (az(s, 3) - 0.5) * 30 })];
  // la cáscara abierta arriba, en jirones, con la yema adentro y lo que se derramó
  ps.push(elipsoide(0, 0, h * 0.85, r, r * 0.95, h, { mat: 'aa_huevo', tono: -0.1 }), elipsoide(0, 0, h * 1.5, r * 1.3, r * 1.3, h * 0.75, { mat: 'aa_huevo', resta: true }), elipsoide(0, 0, h * 0.85, r * 0.9, r * 0.85, h * 0.92, { mat: 'aa_huevo', resta: true }));
  ps.push(elipsoide(0, 0, h * 0.7, r * 0.82, r * 0.8, h * 0.5, { mat: 'aa_bilis' }));
  for (let i = 0; i < 5; i++) { const a = az(s, 10 + i) * TAU; ps.push(caja(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, h * 1.1, r * 0.4, 1, h * (0.3 + az(s, 20 + i) * 0.4), { mat: 'aa_huevo', giro: (a * 180) / Math.PI + 90, incl: 20 + az(s, 30 + i) * 30 })); }
  ps.push(elipsoide(r * 1.2, 0, 0.3, r * 1.4, r * 0.9, 0.8, { mat: 'aa_charco_bilis', giro: az(s, 40) * 360 }));
  return ps;
}
function armarMadre(w: number, h: number): ArmadoA {
  const esc = new EscenaCine(), plumas: Pluma[] = [];
  // el Vientre: una sala de piedra hundida, el charco de barro en el medio, muros con glifos, columnas de serpiente,
  // raíces que bajan del techo roto (por la grieta entra la noche, fría)
  esc.terreno = new Terreno({
    alto: (x, y) => { const d = Math.hypot(x / 1.2, y - 40); return -8 * (1 - suave(80, 180, d)) + (fbm2(x / 40, y / 40, 3, 701) - 0.5) * 3 * suave(100, 200, d); },
    techo: 40, grillas: [[-700, -600, 700, 800, 3]],
    superficie: (p) => { const d = Math.hypot(p[0] / 1.2, p[1] - 40), r = fbm2(p[0] / 30, p[1] / 30, 3, 702); return d < 170 ? { albedo: mezclar([0.004, 0.0035, 0.003], [0.012, 0.01, 0.007], r), brillo: 0.4 } : { albedo: mezclar(hexLin('#141810'), hexLin('#22261a'), r), brillo: 0.2 }; },
  });
  esc.ponerMundo([caja(0, 100, 380, 1400, 1400, 60, { mat: 'tumba_liso' }), poliedro([[-60, 120, 370], [80, 160, 370], [-20, 220, 370], [40, 260, 370], [-60, 120, 460], [80, 160, 460], [-20, 220, 460], [40, 260, 460]], { mat: 'tumba_liso', resta: true })], { nieve: 0 });
  for (const [x, y, g] of [[0, 520, 0], [-470, 150, 90], [470, 150, 90]] as [number, number, number][]) for (let k = -3; k <= 3; k++) esc.poner(piezasDe('tem_muro_glifos', k % 3 ? 'entero' : 'roto', 710 + k + x), { x: x + (g ? 0 : k * 80), y: y + (g ? k * 80 : 0), z: 0, giro: g, k: 1 }, { nieve: 0 });
  esc.ponerMundo([caja(0, 560, 0, 1100, 40, 400, { mat: 'tumba_liso' }), caja(-510, 150, 0, 40, 900, 400, { mat: 'tumba_liso' }), caja(510, 150, 0, 40, 900, 400, { mat: 'tumba_liso' })], { nieve: 0 });
  for (const [x, y] of [[-280, 300], [280, 300], [-300, 60], [300, 60]] as [number, number][]) esc.poner(piezasDe('tem_columna_serpiente', y < 100 ? 'rota' : 'entera', 720 + x + y), { x, y, z: 0, k: 2.2, giro: x < 0 ? 0 : 180 }, { nieve: 0 });
  for (let i = 0; i < 12; i++) { const x = -200 + az(i, 731) * 360, y = 120 + az(i, 732) * 180, z0 = 370, L = 120 + az(i, 733) * 200; esc.ponerMundo([palo([x, y, z0], [x + (az(i, 734) - 0.5) * 40, y + (az(i, 735) - 0.5) * 40, z0 - L], 2 + az(i, 736) * 3, { mat: 'corteza', r1: 0.6 })], { nieve: 0 }); }
  // la Madre: chilla con la boca abierta, se le abre el vientre y se hunde en el barro (cuadro 4 de su muerte)
  const gM = esc.poner(jefe('madre_cienaga', 'morir', 4), { x: 0, y: 60, z: -10, giro: -90, k: 1.3 }, { nieve: 0 });
  void gM;
  // el vientre abierto: una raja vertical al verde, con la bilis que se derrama al barro
  esc.ponerMundo([elipsoide(0, 12, 44, 2.6, 3, 20, { mat: 'aa_bilis' }), elipsoide(0, 8, 28, 1.8, 2, 10, { mat: 'aa_bilis' }), elipsoide(-6, -10, -7, 26, 18, 1, { mat: 'aa_charco_bilis' })], { nieve: 0 });
  // los huevos: en racimos a los costados; los de adelante revientan
  const huevos: [number, number, number, boolean][] = [[-150, -40, 13, true], [-120, -80, 10, false], [-175, 0, 11, false], [-95, -20, 9, true], [140, -50, 12, true], [175, -10, 10, false], [110, -95, 9, true], [200, -70, 11, false], [-60, -120, 8, true], [70, -130, 9, false], [-230, 60, 12, false], [235, 40, 12, true]];
  const verde = hexLin('#8ad030');
  huevos.forEach(([x, y, r, roto], i) => {
    const g = esc.poner(huevo(760 + i, r, roto), { x, y, z: -1, giro: az(i, 761) * 360 }, { nieve: 0 });
    if (y < -60) esc.frente.add(g);
    if (roto) esc.luces.push({ p: [x, y, r * 2.4], c: verde, k: 0.6, r: 22, canal: 1, envuelve: 0.4, halo: 0.0008 });
  });
  esc.emision.aa_bilis = { k: 2.2, canal: 1 }; esc.emision.aa_charco_bilis = { k: 0.7, canal: 1 }; esc.emision.cu_ojo_verde = { k: 1.2 };
  // la luz del vientre (el foco mágico) y la noche fría por la grieta del techo (filo azul en la Madre y las columnas)
  esc.luces.push({ p: [0, 4, 16], c: verde, k: 2.6, r: 50, canal: 1, sombra: true, envuelve: 0.2, halo: 0.0003 });
  esc.luces.push({ p: [0, 200, 330], c: hexLin('#7f9ad8'), k: 3.2, r: 260, sombra: true, envuelve: 0.15, halo: 0.00002 });
  // los vapores verdes del barro
  plumas.push({ base: [0, 30, -4], alto: 300, r0: 60, r1: 200, viento: [0.1, 0.2, 0], dens: 0.025, humo: [0.04, 0.05, 0.035], abajo: verde, kAbajo: 0.6, decaeAbajo: 6, semilla: 771, sube: 10, escala: 1 / 40 });
  const aire: C3 = [0.004, 0.0055, 0.005];
  const atm: Atmosfera = {
    sol: { dir: norm([0, -0.3, 1]), c: hexLin('#8aa0d8'), k: 0, ancho: 0.05 }, cielo: () => aire, aire: () => aire,
    ambCielo: [0.004, 0.006, 0.009], ambSuelo: [0.002, 0.0025, 0.0015],
    niebla: { densidad: 1 / 3600, baja: 1 / 160, z0: 0, H: 16, ruido: 0.8, escalaRuido: 0.012 },
    borde: { c: hexLin('#9ab8e0'), k: 1.4 }, oclusion: 0.9, oclusionLargo: 300,
  };
  const cam = camaraBase([30, -290, 30], [0, 60, 66], 46, w, h);
  return { esc, atm, cam, plumas, fuegos: [], brasas: (t) => chispas(t, [0, 0, 10], 50, 160, 90, '#a8f040', 1.2, [0, 0.2, 0]) };
}
const A3P1: Plano3D = {
  id: 'p1_madre', paralaje: 0.9, particulas: 'polvo', ss: 4, ao: 3,
  armar: memo(armarMadre),
  revelado: { t: 0, exposicion: 1.5, derrame: { k: 0.4, r: 4 }, bloom: { k: 0.45, umbral: 0.75 }, grado: gradoCripta },
  flickBase: 0.9, cuadros: NF, fps: FPS, extras: (a, _c, t) => fuegoDe(a as ArmadoA, t),
  zonas: (a) => { const b = baseCamara(a.cam), q = proyectar(b, [0, 0, 40]); return q ? [{ caja: [q[0] - 420, q[1] - 300, q[0] + 420, q[1] + 220], escala: 3 }] : []; },
};

// ================================================================== ACTO 3 · p2: al alba, la pirámide en la niebla, el río con sus muertos y el barco
/** El río (a lo largo de y, hacia la pirámide), el barco amarrado en esta orilla y el sol que sale detrás de la pirámide. */
const PIRAMIDE: V3 = [-120, 1900, 0];
function armarRioAlba(w: number, h: number): ArmadoA {
  const esc = new EscenaCine();
  const cauce = (x: number, y: number) => Math.abs(x - 60 * Math.sin(y / 500) + 30) - 170 - y * 0.02;
  const alto = (x: number, y: number) => {
    const o = cauce(x, y), lejos = suave(4000, 18000, Math.hypot(x, y)) * fbm2(x / 5000, y / 5000, 3, 801) * 1200;
    return o < 0 ? -2 : Math.min(26, o * 0.2) + (fbm2(x / 200, y / 200, 3, 802) - 0.4) * 24 * suave(0, 80, o) + lejos;
  };
  esc.terreno = new Terreno({
    alto, techo: 1600, grillas: [[-1600, -500, 1600, 3200, 4], [-12000, -3000, 12000, 22000, 40], [-80000, -8000, 80000, 80000, 400]],
    superficie: (p) => { const r = fbm2(p[0] / 40, p[1] / 40, 3, 803); return { albedo: mezclar(hexLin('#0c100a'), hexLin('#1a2014'), r), brillo: 0.1 }; },
  });
  esc.ponerMundo([caja(0, 1200, -5, 4000, 8000, 4, { mat: 'aa_agua' })], { nieve: 0 });
  const ter = esc.terreno, pon = (ps: Pieza[], x: number, y: number, giro = 0, k = 1, frente = false, z?: number) => { const g = esc.poner(ps, { x, y, z: z ?? ter.h(x, y) - 2, giro, k }, { nieve: 0 }); if (frente) esc.frente.add(g); return g; };
  // la pirámide, grande y lejos, comida por la selva; la selva a los dos lados del río, cada vez más gris en la niebla
  pon(piezasDe('tem_piramide', 'en_ruinas', 811), PIRAMIDE[0], PIRAMIDE[1], 200, 4.2, false, ter.h(PIRAMIDE[0], PIRAMIDE[1]) - 10);
  const arboles = ['sel2_arbol_gigante', 'sel_arbol', 'sel_palmera', 'sel2_manglar'];
  for (let i = 0; i < 90; i++) {
    const y = -100 + az(i, 821) * 2600, lado = az(i, 822) < 0.5 ? -1 : 1, x = 60 * Math.sin(y / 500) - 30 + lado * (190 + y * 0.02 + az(i, 823) * 500);
    if (Math.hypot(x - PIRAMIDE[0], y - PIRAMIDE[1]) < 650) continue;
    // lo que tapa la pirámide desde el ojo no va (un cono libre de selva hacia ella)
    { const ax = PIRAMIDE[0] + 40, ay = PIRAMIDE[1] + 260, a0 = Math.atan2(ay, ax + 40), a1 = Math.atan2(y + 260, x + 40); if (Math.abs(a1 - a0) < 0.2 && y > 300) continue; }
    const id = arboles[Math.floor(az(i, 824) * arboles.length)], v = objeto(id).variantes[Math.floor(az(i, 825) * objeto(id).variantes.length)];
    pon(piezasDe(id, v, 830 + i), x, y, az(i, 826) * 360, 1.2 + az(i, 827) * 0.8, y < 100);
  }
  // el primer plano: raíces y helechos negros a la izquierda, contra el agua
  for (let i = 0; i < 6; i++) pon(piezasDe(i % 2 ? 'sel2_helecho' : 'sel2_raices', variante0(i % 2 ? 'sel2_helecho' : 'sel2_raices'), 900 + i), -230 + az(i, 901) * 80, -120 + i * 30, az(i, 902) * 360, 1.4, true);
  // los muertos que el río arrastra: boca abajo, a medio hundir, en fila irregular con la corriente
  for (let i = 0; i < 9; i++) {
    const y = 20 + i * 110 + az(i, 911) * 60, x = 60 * Math.sin(y / 500) - 30 + (az(i, 912) - 0.5) * 240;
    const cu: Cuerpo = { genero: az(i, 913) < 0.4 ? 'm' : 'h', alto: 0.95 + az(i, 914) * 0.1, ancho: 1, musculo: 0.3, piel: 'cu_piel', pelo: 'cu_pelo_negro', peinado: 'largo' };
    pon(personaje(cu, { torso: { tipo: 'harapos', mat: 'cu_tela_parda' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_parda' } }, 's', 'morir', 7), x, y, az(i, 915) * 360, 1.1, false, -7);
  }
  // el barco de Oyá espera amarrado en esta orilla, a la derecha, con la vela recogida
  pon(piezasDe('des_falua', 'sin_vela', 921).filter((p) => p.mat !== 'agua'), 150, 150, 100, 1.6, false, -4);
  esc.ponerMundo([palo([210, 140, -6], [212, 142, 40], 2, { mat: 'madera_vieja' }), palo([212, 142, 30], [170, 148, 14], 0.5, { mat: 'cuerda' })], { nieve: 0 });
  // el alba: el sol sale detrás de la pirámide (el único foco tibio), todo lo demás es niebla verde gris
  const sol = norm([PIRAMIDE[0] + 360, PIRAMIDE[1] + 260, 420]);
  const atm = atmCielo({
    luz: sol, luzC: hexLin('#ffc890'), luzK: 1.4, ancho: 0.03,
    pars: [[-0.02, hexLin('#3a4440')], [0.02, hexLin('#5a6660')], [0.08, hexLin('#46525a')], [0.25, hexLin('#2a3446')], [0.7, hexLin('#141a2a')]],
    halo: { c: hexLin('#ffb880'), k: [2.5, 0.35, 0.08], disco: 4 },
    nubes: [{ s: 81.3, esc: 2600, cubre: 0.5, alto: 3000, c: hexLin('#3a4048'), luzC: hexLin('#ffb070'), k: 0.5, a: 0.7 }],
    amb: [escalar(hexLin('#4a5e6e'), 0.3), escalar(hexLin('#1a2018'), 0.18)],
    niebla: { densidad: 1 / 6500, baja: 1 / 900, z0: 0, H: 50, ruido: 0.6, escalaRuido: 0.0025 },
    borde: { c: hexLin('#ffc090'), k: 1.6 },
  });
  const cam = camaraBase([-40, -260, 74], [-90, 900, 120], 42, w, h);
  return { esc, atm, cam, fuegos: [] };
}
const A3P2: Plano3D = {
  id: 'p2_rio', paralaje: 0.85, particulas: 'polvo',
  armar: memo(armarRioAlba),
  revelado: { t: 0, exposicion: 1.1, rayos: { k: 0.35, c: [1, 0.85, 0.7], umbral: 0.4 }, derrame: { k: 0.5, r: 5 }, bloom: { k: 0.3, umbral: 0.85 }, grado: (c) => { const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], sm = (1 - Math.min(1, l * 4)) ** 2; return [Math.max(0, c[0] - 0.004 * sm), Math.max(0, c[1] + 0.002 * sm), Math.max(0, c[2] + 0.006 * sm)]; } },
};

// ================================================================== ACTO 3 · p3: en la ventisca, el rey de escarcha camina y sus muertos lo siguen
MATERIALES.aa_muerto_helado = { rampa: ['#05070a', '#0b0f14', '#121820', '#1b222c', '#26303a', '#334050', '#46566a'], ruido: 0.35, escala: 0.7, brillo: 0.4 };
MATERIALES.aa_runa_hielo = { rampa: ['#2a6a9a', '#4aa0d0', '#80d0f0', '#c0f0ff', '#f0ffff'], ruido: 0.2, escala: 0.5, emite: true };
/** El paso de la montaña baja hacia el ojo (a lo largo de -y); el rey viene adelante y la fila de muertos atrás, en la ventisca. */
function armarNorte(w: number, h: number): Armado {
  const esc = new EscenaCine();
  const sendaX = (y: number) => 220 * Math.sin((y - 100) / 520), senda = (x: number, y: number) => Math.abs(x - sendaX(y));
  const alto = (x: number, y: number) => {
    // la senda va por un lomo: cae a los dos lados (los muertos se recortan contra el cielo de la ventisca)
    const ladera = y * 0.12 - Math.pow(suave(50, 900, senda(x, y)), 1.15) * 380;
    const cr = 1 - Math.abs(2 * fbm2(x / 500, y / 500, 4, 901) - 1);
    return ladera + cr * cr * 50 * suave(100, 500, senda(x, y)) + (fbm2(x / 60, y / 60, 3, 902) - 0.5) * 10 + suave(2500, 12000, Math.hypot(x, y)) * fbm2(x / 3000, y / 3000, 3, 903) * 2400;
  };
  esc.terreno = new Terreno({
    alto, techo: 4000, grillas: [[-1600, -400, 1600, 3000, 4], [-10000, -3000, 10000, 20000, 40], [-80000, -8000, 80000, 80000, 400]],
    superficie: (p, n) => { const roca = suave(0.5, 0.7, 1 - n[2] + (fbm2(p[0] / 60, p[1] / 60, 3, 904) - 0.5) * 0.4); return { albedo: mezclar([0.5, 0.53, 0.6], [0.02, 0.022, 0.026], roca), brillo: 0.06 }; },
  });
  const ter = esc.terreno, pon = (ps: Pieza[], x: number, y: number, giro = 0, k = 1, frente = false) => { const g = esc.poner(ps, { x, y, z: ter.h(x, y) - 2, giro, k }, { nieve: 0.8 }); if (frente) esc.frente.add(g); return g; };
  // el rey: camina hacia el ojo, enorme, con su corona de púas que brilla (el foco mágico) y el hacha de hielo
  const gR = pon(jefe('rey_escarcha', 'caminar', 2), -60, 120, -90 + 40, 1.2);
  void gR;
  esc.emision.cu_ojo_hielo = { k: 5 }; esc.emision.aa_runa_hielo = { k: 3 };
  const corona: V3 = [-60, 120, ter.h(-60, 120) + 150 * 1.2 + 12];
  esc.luces.push({ p: add(corona, [0, -14, 6]), c: hexLin('#7ad0ff'), k: 2.2, r: 50, envuelve: 0.3, halo: 0.0012 });
  // los muertos de la montaña, en fila detrás de él por la senda, cada vez más grises en la ventisca
  const poses: PoseMuerto[] = ['parado', 'encorvado', 'parado', 'encorvado', 'parado'];
  for (let i = 0; i < 26; i++) {
    const y = 170 + i * 50 + az(i, 911) * 24, x = sendaX(y) + 30 + (az(i, 912) - 0.5) * 70, giro = -90 + (az(i, 913) - 0.5) * 30;
    if (az(i, 914) < 0.45) pon(piezasDe('nie2_soldado_hielo', az(i, 915) < 0.7 ? 'de_pie' : 'barbaro', 920 + i), x, y, giro, 1.3 + az(i, 916) * 0.15);
    else pon(teñir(muertoSeco(poses[i % 5], 930 + i, 72 + az(i, 917) * 10), 'aa_muerto_helado'), x, y, giro);
    // a algunos les brillan los ojos, apenas
    if (az(i, 918) < 0.3) { const z = ter.h(x, y) + 54; esc.ponerMundo([esfera(x - 2, y - 5, z, 0.8, { mat: 'aa_runa_hielo' }), esfera(x + 2, y - 5, z, 0.8, { mat: 'aa_runa_hielo' })], { nieve: 0 }); }
  }
  // primer plano: peñascos con nieve a los costados (enmarcan) y estacas de un viejo cerco tumbado
  for (const [x, y, R, s] of [[-150, -230, 40, 941], [240, -200, 52, 942], [-240, -80, 60, 943]] as [number, number, number, number][]) {
    const pts: V3[] = []; for (let j = 0; j < 12; j++) { const a = az(s * 3, j) * TAU, r = R * (0.6 + az(s * 5, j) * 0.4); pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.8, (az(s * 7, j) * 1.2 - 0.3) * R]); }
    pon([poliedro(pts, { mat: 'nie2_roca' })], x, y, 0, 1, true);
  }
  // la ventisca: copos quietos en el aire (los vivos los pone el juego), muchos, con su estela de viento
  const polvo: Particula[] = [];
  for (let i = 0; i < 1600; i++) { const p: V3 = [(az(i, 951) - 0.5) * 900, -100 + Math.pow(az(i, 952), 1.6) * 1600, 0]; p[2] = ter.h(p[0], p[1]) + az(i, 953) * 280; polvo.push({ p, r: 0.25 + az(i, 954) * 0.35, c: [0.55, 0.6, 0.7], a: 0.8, v: [160, -60, -40] }); }
  // la luz: un cielo de ventisca, gris azulado y parejo, con un resto de luna detrás de la montaña (contraluz)
  const luna = norm([-0.3, 1, 0.35]);
  const atm = atmCielo({
    luz: luna, luzC: hexLin('#9cb0d8'), luzK: 0.9, ancho: 0.12,
    pars: [[-0.05, hexLin('#3a4252')], [0.02, hexLin('#4a5468')], [0.1, hexLin('#343e54')], [0.35, hexLin('#1e2638')], [1.2, hexLin('#0c101c')]],
    halo: { c: hexLin('#a0b4e0'), k: [0.3, 0.25, 0.08] },
    amb: [escalar(hexLin('#4a5c80'), 0.17), escalar(hexLin('#2a3040'), 0.12)],
    niebla: { densidad: 1 / 4200, baja: 1 / 2600, z0: 0, H: 120, ruido: 0.85, escalaRuido: 0.004 },
    borde: { c: hexLin('#b0c8f0'), k: 1.4 }, nieve: { albedo: [0.5, 0.53, 0.6], desde: 0.55 },
  });
  const z0 = ter.h(-560, 120) + 330, cam = camaraBase([-560, 120, z0], [-90, 290, ter.h(-90, 290) + 120], 46, w, h);
  return { esc, atm, cam, polvo };
}
const A3P3: Plano3D = {
  id: 'p3_norte', paralaje: 0.85, particulas: 'nieve',
  armar: memo(armarNorte),
  revelado: { t: 0, exposicion: 1.2, derrame: { k: 0.5, r: 5 }, bloom: { k: 0.4, umbral: 0.8 }, grado: gradoNoche },
};

/** Los cierres de los actos 1, 2 y 3 en 3D (los planos de GUION.acto_1/2/3). */
export const PLANOS_ACTOS_A: Record<string, Plano3D[]> = {
  acto_1: [A1P1, A1P2, A1P3],
  acto_2: [A2P1, A2P2, A2P3],
  acto_3: [A3P1, A3P2, A3P3],
};
void [palo, elipsoide, hueso, bulto, masa, personaje, Terreno, dirAz, vela, HEROES, sat];
export type { Cuerpo, Equipo, LuzPuntual, Capas, Camara, _Sin };
