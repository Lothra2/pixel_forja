import { MATERIALES } from './materiales';
import { palo, esfera, poliedro, masa, hueso, bulto, type Comp, type Pieza, type V3 } from './render';
import { BRILLO_ELEMENTO } from './elementos_arma';
import type { TipoArma, Encanto } from './cuerpo';

/**
 * La forja: las armas del arsenal elemental en cinco niveles, todas en masa (huesos y bultos que se funden, sin
 * cajas ni poliedros planos), para la mano y para el ícono 3D del inventario.
 *
 * Cada nivel se lee de un vistazo, más ornamentado y más amenazante:
 *  1. común: hierro picado, cuero gastado, guarda recta y pomo de bola, la hoja sin más;
 *  2. excepcional: acero claro, bronce, canal en la hoja, pomo de rueda, vendas del mango con su cordón;
 *  3. élite: acero pavonado, oro, guarda curva con gema, pomo de pera con gema, la hoja en hoja de laurel;
 *  4. legendaria: el metal del elemento con sus venas encendidas, gavilanes en cuerno, púas en el lomo y la base,
 *     pomo con púas, cabezas más grandes con ganchos;
 *  5. mítica: hoja flamígera con dientes y ganchos, alas de murciélago de hueso en la guarda, pomo de calavera con
 *     ojos que brillan, cuernos, y fragmentos de cristal que orbitan el arma.
 *
 * Las familias clásicas del motor (espada, mandoble, sable, daga, hachas, maza, martillo, mangual, lanza, alabarda,
 * guadaña, báculo, cetro, varita, garras y ballesta) y las nuevas (cesto y frasco) tienen forma propia acá
 * (`formaForjada`); las del arsenal épico (katana, estoque, tridente, lucero, arcos, jabalina, gran báculo, orbe,
 * katar y hoz) conservan su forma y suman los adornos del nivel (`adornosNivel`).
 */

// ------------------------------------------------------------------ vectores
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const nor = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mez = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rad = (g: number) => (g * Math.PI) / 180;

const M = MATERIALES;
M.ar_hueco = { rampa: ['#020102', '#060406', '#0b080a', '#120d0f'], ruido: 0.05, escala: 1 };
M.ar_cera = { rampa: ['#1d0405', '#360809', '#520e0e', '#701714', '#8e221c', '#a93127', '#c14735'], ruido: 0.12, escala: 0.6, brillo: 0.45 };
M.ar_cordon = { rampa: ['#140c06', '#24160b', '#382311', '#4e3219', '#664223', '#80552f'], ruido: 0.25, escala: 1.4 };

// ------------------------------------------------------------------ el marco y los materiales
export interface MarcoArma {
  /** la mano que empuña y el eje del arma (del puño a la punta) */
  m: V3; dd: V3;
  /** el frente del cuerpo (fija hacia dónde mira la cara de la hoja) */
  F: V3;
  S: number;
  /** báculo, cetro y gran báculo: [pie, tope, eje] de la vara */
  vara?: [V3, V3, V3];
  /** giro del remate de la vara (radianes) */
  giroVara?: number;
  /** el tramo vivo del arma (hoja, cabeza o gema) */
  filo: [V3, V3];
  /** ballesta: centro, hacia dónde apunta y su costado; arcos: el puño que lo sostiene, hacia dónde tira y su arriba */
  ballesta?: { c: V3; ap: V3; lado: V3 };
  arco?: { c: V3; tiro: V3; arriba: V3 };
  /** el cuadro (los fragmentos míticos orbitan) */
  f: number;
}
export type NivelForja = 1 | 2 | 3 | 4 | 5;
export interface OpcForja { tipo: TipoArma; nivel: NivelForja; encanto?: Encanto; mat: string; mango: string; gema?: string }

/** Guarniciones (guarda, pomo, virolas, aros) según el nivel y el elemento. */
export function guarnicionDe(nivel: NivelForja, el?: Encanto): string {
  if (nivel === 1) return 'ar_hierro';
  if (nivel === 2) return 'cu_bronce';
  if (nivel === 3) return 'ar_oro';
  if (el === 'sombra') return 'ar_plata_negra';
  if (el === 'hielo') return 'ar_plata';
  if (el === 'sagrado') return nivel === 5 ? 'cu_oro_blanco' : 'ar_oro';
  return nivel === 5 ? 'ar_oro_negro' : 'ar_oro';
}
/** Púas, cuernos y garfios de los niveles altos. */
const acentoDe = (nivel: NivelForja, el?: Encanto) => (el === 'sagrado' ? 'ar_oro' : el === 'hielo' ? 'ar_hielo' : nivel === 5 ? 'cu_hueso_demonio' : 'ar_acero_negro');
/** Lo que brilla del arma (gemas, ojos de la calavera, fragmentos). */
const luzDe = (o: OpcForja) => o.gema ?? (o.encanto ? BRILLO_ELEMENTO[o.encanto] : 'magia');

interface Cx {
  S: number; n: NivelForja; m: V3; dd: V3; canto: V3; plano: V3; F: V3; f: number;
  mat: string; mango: string; guarn: string; acento: string; luz: string; el?: Encanto;
  ps: Pieza[];
  /** punto en unidades de S: k a lo largo del arma, c hacia el canto (ancho de la hoja), p hacia la cara */
  P: (k: number, c?: number, p?: number) => V3;
}
function contexto(mc: MarcoArma, o: OpcForja): Cx {
  const { m, dd, F, S } = mc;
  let canto = cruz(dd, F); if (len(canto) < 0.2) canto = cruz(dd, [0, 0, 1]);
  canto = nor(canto);
  const plano = nor(cruz(canto, dd));
  return {
    S, n: o.nivel, m, dd, canto, plano, F, f: mc.f, mat: o.mat, mango: o.mango, guarn: guarnicionDe(o.nivel, o.encanto), acento: acentoDe(o.nivel, o.encanto), luz: luzDe(o), el: o.encanto, ps: [],
    P: (k, c = 0, p = 0) => add(add(add(m, dd, k * S), canto, c * S), plano, p * S),
  };
}
const un = (cx: Cx, cs: Comp[], mat: string, suave = 0.35) => { if (cs.length) cx.ps.push(masa(cs, { mat, suave: suave * cx.S })); };
/** Hash determinista para irregularidades (muescas, nudos). */
const hh = (i: number) => { const x = Math.sin(i * 91.7 + 13.1) * 43758.5453; return x - Math.floor(x); };

// ------------------------------------------------------------------ piezas comunes
interface Ctrl { p: V3; an: number; gr: number; w: V3 }
/** Lámina de masa: bultos chatos a lo largo de una línea media (ancho hacia `w`, grueso hacia la cara). */
function lamina(ctrl: Ctrl[], mat: string, paso: number, tono?: number): Comp[] {
  const cs: Comp[] = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const A = ctrl[i], B = ctrl[i + 1], d = sub(B.p, A.p), L = len(d), nn = Math.max(1, Math.round(L / paso)), t = nor(d);
    for (let j = 0; j < nn; j++) {
      const u = (j + 0.5) / nn, w0 = nor(mez(A.w, B.w, u)), w = nor(sub(w0, mul(t, dot(w0, t))));
      cs.push(bulto(mez(A.p, B.p, u), [(L / nn) * 1.1, A.an + (B.an - A.an) * u, A.gr + (B.gr - A.gr) * u], { ejes: [t, w, cruz(t, w)], mat, tono }));
    }
  }
  return cs;
}
const cadena = (pts: V3[], r0: number, r1: number, mat?: string, tono?: number): Comp[] =>
  pts.slice(1).map((q, i) => hueso(pts[i], q, r0 + (r1 - r0) * (i / (pts.length - 1)), r0 + (r1 - r0) * ((i + 1) / (pts.length - 1)), { mat, tono }));
/** Cuerno o garfio: nace en `b` hacia `d`, se dobla hacia `curva` y se afina. */
function cuerno(b: V3, d: V3, curva: V3, L: number, r: number, mat?: string, tramos = 5): Comp[] {
  const pts: V3[] = [];
  for (let i = 0; i <= tramos; i++) { const t = i / tramos; pts.push(add(add(b, d, L * t), curva, L * 0.55 * t * t)); }
  return cadena(pts, r, r * 0.12, mat);
}
/** Una calavera: cráneo, cara, pómulos y mandíbula de hueso, cuencas negras y ojos con brillo. */
function craneo(cx: Cx, c: V3, fr: V3, arriba: V3, r: number, conCuernos = false) {
  const lado = nor(cruz(arriba, fr)), up = nor(cruz(fr, lado));
  const Q = (a: number, b: number, z: number): V3 => add(add(add(c, fr, a * r), lado, b * r), up, z * r);
  const ej: [V3, V3, V3] = [fr, lado, up];
  const cs: Comp[] = [bulto(Q(-0.1, 0, 0.15), [1.0 * r, 0.92 * r, 0.95 * r], { ejes: ej }), bulto(Q(0.5, 0, -0.38), [0.5 * r, 0.66 * r, 0.5 * r], { ejes: ej }),
    bulto(Q(0.42, 0, -0.86), [0.42 * r, 0.52 * r, 0.24 * r], { ejes: ej, tono: -0.04 })];
  for (const s of [1, -1]) cs.push(bulto(Q(0.42, s * 0.58, -0.3), [0.3 * r, 0.24 * r, 0.22 * r], { ejes: ej }));
  if (conCuernos) for (const s of [1, -1]) cs.push(...cuerno(Q(0.0, s * 0.62, 0.62), nor(add(mul(lado, s), up, 0.7)), mul(fr, -1), 1.9 * r, 0.3 * r, 'cu_cuerno'));
  cx.ps.push(masa(cs, { mat: 'cu_hueso', suave: 0.25 * r }));
  for (const s of [1, -1]) {
    cx.ps.push(esfera(...Q(0.72, s * 0.34, 0.0), 0.25 * r, { mat: 'ar_hueco' }));
    cx.ps.push(esfera(...Q(0.86, s * 0.34, 0.0), 0.12 * r, { mat: cx.luz }));
  }
  cx.ps.push(esfera(...Q(0.92, 0, -0.32), 0.12 * r, { mat: 'ar_hueco' }));
  for (let i = -2; i <= 2; i++) cx.ps.push(esfera(...Q(0.82, i * 0.13, -0.68), 0.07 * r, { mat: 'cu_hueso' }));
}
/** Fragmentos de cristal que orbitan el tramo a→b (lo mítico). */
function fragmentos(cx: Cx, a: V3, b: V3, R: number, n = 4) {
  const eje = nor(sub(b, a));
  let lado = cruz(eje, [0, 0, 1]); if (len(lado) < 0.2) lado = cruz(eje, [1, 0, 0]);
  lado = nor(lado);
  const fr = cruz(lado, eje), S = cx.S;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + (cx.f / 8) * Math.PI * 0.5, c = add(add(mez(a, b, 0.2 + (0.6 * i) / Math.max(1, n - 1)), lado, Math.cos(ang) * R * S), fr, Math.sin(ang) * R * 0.55 * S);
    const l = (1.1 + hh(i) * 0.7) * S, w = 0.38 * S, d = nor(add(eje, lado, Math.cos(ang) * 0.4)), o1 = nor(cruz(d, fr)), o2 = cruz(d, o1);
    cx.ps.push(poliedro([add(c, d, l), add(c, d, -l * 0.7), add(c, o1, w), add(c, o1, -w), add(c, o2, w * 0.6), add(c, o2, -w * 0.6)], { mat: cx.luz }));
  }
}
/** Aros de metal alrededor del eje en las posiciones k. */
function aros(cx: Cx, ks: number[], r: number, mat = cx.guarn) {
  for (const k of ks) un(cx, [bulto(cx.P(k), [0.32 * cx.S, r * cx.S, r * cx.S], { eje: cx.dd, mat })], mat, 0.1);
}

/** Empuñadura forrada de k0 a k1, con vueltas de cuero (más y más finas al subir el nivel) y aros de oro desde élite. */
function empunadura(cx: Cx, k0: number, k1: number, r: number) {
  const { S, n } = cx;
  const cs: Comp[] = [hueso(cx.P(k0), cx.P(k1), r * S, r * 0.94 * S, { mat: cx.mango })];
  const vueltas = Math.round((k1 - k0) / (n >= 3 ? 0.85 : 1.15));
  for (let i = 0; i < vueltas; i++) cs.push(bulto(cx.P(k0 + ((i + 0.5) / vueltas) * (k1 - k0), 0, 0), [0.3 * S, (r + 0.12) * S, (r + 0.12) * S], { eje: add(cx.dd, cx.canto, 0.35), mat: cx.mango, tono: i % 2 ? 0.07 : -0.03 }));
  un(cx, cs, cx.mango, 0.18);
  if (n >= 3) aros(cx, [k0 + 0.15, k1 - 0.15], r + 0.22);
  if (n === 2) un(cx, cadena([cx.P(k0 + 0.4, 0, r), cx.P((k0 + k1) / 2, r * 0.2, r + 0.1), cx.P(k1 - 0.4, 0, r)], 0.12 * S, 0.12 * S, 'ar_cordon'), 'ar_cordon', 0.05);
}
/** Pomo según el nivel: bola, rueda, pera con gema, pera con púas, calavera con cuernos. */
function pomo(cx: Cx, k: number, r: number) {
  const { S, n, P } = cx;
  const ej: [V3, V3, V3] = [cx.dd, cx.canto, cx.plano];
  if (n === 1) { un(cx, [bulto(P(k), [0.85 * r * S, r * S, r * S], { ejes: ej })], cx.guarn); return; }
  if (n === 2) { un(cx, [bulto(P(k), [0.55 * r * S, 1.25 * r * S, 1.25 * r * S], { ejes: [cx.plano, cx.canto, cx.dd] }), bulto(P(k, 0, 0), [0.75 * r * S, 0.6 * r * S, 0.6 * r * S], { ejes: ej, tono: 0.06 }), bulto(P(k - 0.7 * r), [0.4 * r * S, 0.4 * r * S, 0.4 * r * S], {})], cx.guarn, 0.3); return; }
  if (n === 5) { craneo(cx, P(k - 0.6 * r, 0, 0), cx.plano, mul(cx.dd, -1), 1.35 * r * S, true); return; }
  const cs: Comp[] = [bulto(P(k), [1.1 * r * S, 0.95 * r * S, 0.95 * r * S], { ejes: ej }), hueso(P(k + 0.4 * r), P(k + 1.1 * r), 0.55 * r * S, 0.42 * r * S), bulto(P(k - 1.0 * r), [0.35 * r * S, 0.4 * r * S, 0.4 * r * S], {})];
  if (n === 4) for (let i = 0; i < 4; i++) { const a = rad(45 + i * 90), d = nor(add(add(mul(cx.dd, -0.55), cx.canto, Math.cos(a)), cx.plano, Math.sin(a))); cs.push(hueso(P(k), add(P(k), d, 2.1 * r * S), 0.42 * r * S, 0.04 * S, { mat: cx.acento })); }
  un(cx, cs, cx.guarn, 0.3);
  for (const s of [1, -1]) cx.ps.push(esfera(...P(k, 0, s * 0.82 * r), 0.42 * r * S, { mat: cx.luz }));
}
/**
 * Guarda de ancho `w`: barra recta, barra con remates y lengüeta, gavilanes curvos hacia la hoja con gema, gavilanes
 * en cuerno con púas, alas de murciélago de hueso con calavera.
 */
function guarda(cx: Cx, k: number, w: number) {
  const { S, n, P } = cx;
  const ej: [V3, V3, V3] = [cx.dd, cx.canto, cx.plano];
  if (n === 1) { un(cx, [hueso(P(k, -w), P(k, w), 0.42 * S, 0.42 * S), bulto(P(k), [0.5 * S, 0.9 * S, 0.62 * S], { ejes: ej })], cx.guarn, 0.25); return; }
  if (n === 2) {
    const cs: Comp[] = [...cadena([P(k + 0.35, -w), P(k, -w * 0.5), P(k, 0), P(k, w * 0.5), P(k + 0.35, w)], 0.42 * S, 0.42 * S), bulto(P(k + 0.25), [1.1 * S, 0.72 * S, 0.55 * S], { ejes: ej })];
    for (const s of [1, -1]) cs.push(bulto(P(k + 0.45, s * w * 1.04), [0.55 * S, 0.55 * S, 0.55 * S], {}));
    un(cx, cs, cx.guarn, 0.3); return;
  }
  const cs: Comp[] = [bulto(P(k + 0.1), [0.9 * S, 1.2 * S, 0.85 * S], { ejes: ej }), hueso(P(k - 0.3), P(k + 0.9), 0.7 * S, 0.45 * S)];
  for (const s of [1, -1]) {
    if (n === 3) cs.push(...cadena([P(k, s * 0.6), P(k - 0.1, s * w * 0.55), P(k + 0.4, s * w * 0.9), P(k + 1.4, s * w * 1.05)], 0.48 * S, 0.22 * S), bulto(P(k + 1.55, s * w * 1.05), [0.42 * S, 0.42 * S, 0.42 * S], {}));
    else cs.push(...cuerno(P(k, s * 0.6), cx.canto.map((v) => v * s) as V3, mul(cx.dd, n === 5 ? 1.5 : 1.1), w * S * (n === 5 ? 1.15 : 1), 0.62 * S, n === 5 ? cx.acento : undefined));
  }
  un(cx, cs, cx.guarn, 0.35);
  if (n >= 4) for (const s of [1, -1]) un(cx, [hueso(P(k - 0.1, s * w * 0.5), P(k - 1.4, s * w * 0.75), 0.32 * S, 0.04 * S)], cx.acento, 0.1);
  if (n === 5) {
    // alas de murciélago: tres dedos de hueso que se abren hacia la punta, con la membrana tendida entre ellos
    for (const s of [1, -1]) {
      const raiz = P(k + 0.2, s * w * 0.55), dedos = [0, 1, 2].map((i) => P(k + 2.2 + i * 1.9, s * (w * 1.15 - i * 0.55), 0));
      un(cx, dedos.flatMap((q, i) => cadena([raiz, mez(raiz, q, 0.55), q], (0.32 - i * 0.04) * S, 0.06 * S)), 'cu_hueso', 0.15);
      const mem: Comp[] = [];
      for (let i = 0; i < 2; i++) for (let j = 1; j <= 3; j++) { const t = j / 4, c = mez(mez(raiz, dedos[i], t), mez(raiz, dedos[i + 1], t), 0.5); mem.push(bulto(c, [0.75 * S * (1 - t * 0.3), 0.6 * S * (1 + t), 0.12 * S], { ejes: [nor(sub(dedos[i], raiz)), cx.canto, cx.plano] })); }
      un(cx, mem, 'cu_draco', 0.35);
    }
    craneo(cx, P(k + 0.3, 0, 0.55), cx.plano, cx.dd, 0.95 * S);
  } else for (const s of [1, -1]) cx.ps.push(esfera(...P(k + 0.1, 0, s * 0.82), 0.5 * S, { mat: cx.luz }));
}

/**
 * Hoja de dos filos o de un filo de k0 a k1 (en unidades de S), con su perfil según el nivel: recta; con canal;
 * en hoja de laurel con canal de oro; ondulada con dientes en la base; flamígera con dientes y ganchos.
 * `ancho` es el medio ancho en la base, `curva` corre la punta hacia el canto (sables), `unFilo` deja el lomo grueso.
 */
function hojaForjada(cx: Cx, k0: number, k1: number, ancho: number, grueso: number, o: { curva?: number; unFilo?: boolean; punta?: number } = {}) {
  const { S, n, P } = cx;
  const L = k1 - k0, curva = o.curva ?? 0, pasos = Math.max(8, Math.round(L / 1.1));
  const offs = (t: number) => curva * t * t;
  const ctrl: Ctrl[] = [];
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos, k = k0 + L * t;
    // perfil del ancho: recto que se afina, laurel que se ensancha a 2/3, ondas de la hoja flamígera
    let an = ancho * (1 - 0.22 * t);
    if (n >= 3) an = ancho * (1 + 0.16 * Math.sin(Math.PI * Math.min(1, t * 1.25)) - 0.18 * t);
    if (n >= 4 && !o.unFilo) an *= 1 + (n === 5 ? 0.16 : 0.09) * Math.sin(t * Math.PI * (n === 5 ? 7 : 5));
    const pt = o.punta ?? 0.13;
    if (t > 1 - pt) an *= Math.max(0.05, (1 - t) / pt) ** 0.8;
    if (n === 1) an *= 1 - 0.07 * hh(i);
    const gr = grueso * (1 - 0.45 * t) * (o.unFilo ? 1.2 : 1);
    ctrl.push({ p: P(k, offs(t) + (o.unFilo ? -an * 0.15 : 0)), an: an * S, gr: gr * S, w: cx.canto });
  }
  const cs = lamina(ctrl, cx.mat, 1.0 * S);
  // dientes de la base (legendaria) y ganchos cerca de la punta (mítica)
  if (n >= 4) for (const s of o.unFilo ? [-1] : [1, -1]) for (let i = 0; i < (n === 5 ? 4 : 3); i++) {
    const k = k0 + 0.6 + i * 1.0, base = P(k, s * ancho * 0.92 + offs((k - k0) / L));
    cs.push(hueso(base, P(k - 0.7, s * (ancho + 0.85) + offs((k - k0) / L)), 0.34 * S, 0.04 * S));
  }
  if (n === 5) for (const s of o.unFilo ? [-1] : [1, -1]) { const t = 0.72, k = k0 + L * t; cs.push(...cuerno(P(k, s * ancho * 0.75 + offs(t)), nor(add(mul(cx.canto, s), cx.dd, 0.3)), mul(cx.dd, -1), 1.9 * S, 0.42 * S)); }
  un(cx, cs, cx.mat, 0.22);
  // canal (desde excepcional): un surco oscuro en las dos caras; en élite con un hilo de oro
  if (n >= 2 && L > 6) for (const s of [1, -1]) {
    const a = P(k0 + 0.6, offs(0.03), s * grueso * 0.82), b = P(k0 + L * 0.68, offs(0.68), s * grueso * 0.55);
    un(cx, [hueso(a, b, 0.2 * S, 0.12 * S, { tono: -0.22 })], cx.mat, 0.08);
    if (n === 3) un(cx, [hueso(mez(a, b, 0.08), mez(b, a, 0.12), 0.07 * S, 0.06 * S)], cx.guarn, 0.04);
  }
}

// ------------------------------------------------------------------ las familias
/** Espada, mandoble, sable y daga: pomo, empuñadura, guarda y hoja con las medidas de cada una. */
function armaDeHoja(cx: Cx, tipo: TipoArma) {
  const crece = [0.92, 1, 1.04, 1.08, 1.14][cx.n - 1];
  const med: Record<string, { mango: number; r: number; hoja: number; ancho: number; gr: number; guarda: number; curva?: number; unFilo?: boolean }> = {
    espada: { mango: 4.4, r: 0.66, hoja: 22.5, ancho: 1.25, gr: 0.36, guarda: 3.4 },
    mandoble: { mango: 7.6, r: 0.72, hoja: 33, ancho: 1.65, gr: 0.44, guarda: 4.8 },
    cimitarra: { mango: 4.4, r: 0.66, hoja: 22, ancho: 1.2, gr: 0.36, guarda: 3.0, curva: 3.2, unFilo: true },
    daga: { mango: 3.0, r: 0.56, hoja: 9.5, ancho: 0.95, gr: 0.3, guarda: 2.0 },
  };
  const d = med[tipo];
  empunadura(cx, -d.mango, -0.25, d.r);
  pomo(cx, -d.mango - 0.55, tipo === 'daga' ? 0.85 : 1.0);
  guarda(cx, 0.25, d.guarda);
  // el sable con guardamano: un arco del gavilán al pomo (desde élite)
  if (tipo === 'cimitarra' && cx.n >= 3) un(cx, cadena(Array.from({ length: 7 }, (_, i) => { const t = i / 6; return cx.P(0.2 - (d.mango + 0.3) * t, 1.4 + Math.sin(Math.PI * t) * 1.6 - t * 1.2); }), 0.26 * cx.S, 0.24 * cx.S), cx.guarn, 0.2);
  // el mandoble con su recazo forrado y las orejas de parada
  let k0 = 0.75;
  if (tipo === 'mandoble' && cx.n >= 2) {
    un(cx, [hueso(cx.P(0.7), cx.P(3.6), 0.62 * cx.S, 0.6 * cx.S, { mat: cx.mango })], cx.mango, 0.1);
    un(cx, [...[1, -1].map((s) => hueso(cx.P(3.9, s * 0.9), cx.P(4.3, s * 1.9), 0.3 * cx.S, 0.12 * cx.S)), bulto(cx.P(3.9), [0.35 * cx.S, 1.0 * cx.S, 0.5 * cx.S], { ejes: [cx.dd, cx.canto, cx.plano] })], cx.guarn, 0.2);
    k0 = 3.6;
  }
  hojaForjada(cx, k0, k0 + (d.hoja - k0 + 0.75) * crece, d.ancho * (cx.n === 5 ? 1.1 : 1), d.gr, { curva: d.curva, unFilo: d.unFilo, punta: tipo === 'cimitarra' ? 0.22 : undefined });
  if (cx.n === 5) fragmentos(cx, cx.P(4), cx.P(d.hoja), d.ancho + 3.2, tipo === 'daga' ? 3 : 4);
}

/** Asta (madera, ébano o hueso) de k0 a k1 con su regatón, vendas abajo y aros desde excepcional. */
function astaDe(cx: Cx, k0: number, k1: number, r: number, agarre: [number, number] | null = [-3, 2]) {
  const { S, n } = cx;
  const cs: Comp[] = [];
  if (n === 5 && cx.mango === 'cu_hueso_demonio') {
    // el asta mítica: vértebras encadenadas
    const nn = Math.round((k1 - k0) / 1.5);
    for (let i = 0; i < nn; i++) { const k = k0 + ((i + 0.5) / nn) * (k1 - k0); cs.push(bulto(cx.P(k), [0.62 * S, (r + 0.12) * S, (r + 0.12) * S], { eje: cx.dd }), hueso(cx.P(k - 0.75), cx.P(k + 0.75), r * 0.8 * S, r * 0.8 * S)); if (i % 2 === 0) for (const s of [1, -1]) cs.push(hueso(cx.P(k), cx.P(k - 0.4, s * (r + 0.7)), 0.22 * S, 0.06 * S)); }
  } else {
    // nudos y una curva leve en lo de madera
    const madera = cx.mango.includes('madera') || cx.mango === 'ar_ebano' || cx.mango.includes('corteza');
    const nn = Math.max(4, Math.round((k1 - k0) / 4));
    const Q = (t: number) => cx.P(k0 + (k1 - k0) * t, madera ? Math.sin(t * 7.3) * 0.12 * Math.sin(Math.PI * t) : 0);
    for (let i = 0; i < nn; i++) cs.push(hueso(Q(i / nn), Q((i + 1) / nn), r * (1 - 0.06 * (i / nn)) * S, r * (1 - 0.06 * ((i + 1) / nn)) * S));
    if (madera && n <= 2) for (let i = 0; i < 3; i++) cs.push(bulto(Q(0.2 + hh(i + 3) * 0.6), [0.7 * S, (r + 0.18) * S, (r + 0.12) * S], { eje: cx.dd, tono: -0.05 }));
  }
  un(cx, cs, cx.mango, 0.25);
  // regatón
  un(cx, [hueso(cx.P(k0 + 0.2), cx.P(k0 - 1.2), (r + 0.12) * S, 0.15 * S)], n >= 3 ? cx.guarn : 'ar_hierro', 0.15);
  if (agarre) {
    const [a, b] = agarre, g: Comp[] = [];
    const vueltas = Math.round((b - a) / 0.95);
    for (let i = 0; i < vueltas; i++) g.push(bulto(cx.P(a + ((i + 0.5) / vueltas) * (b - a)), [0.34 * S, (r + 0.14) * S, (r + 0.14) * S], { eje: add(cx.dd, cx.canto, 0.3), tono: i % 2 ? 0.06 : -0.03 }));
    un(cx, g, n >= 3 ? 'cu_cuero_negro' : 'cu_cuero', 0.15);
  }
  if (n >= 2) aros(cx, n >= 4 ? [k0 + 1.4, k1 - 1.5, (k0 + k1) / 2] : [k1 - 1.5], r + 0.2);
}

/** Cabeza de hacha hacia el lado `lado` del plano (+1 / -1): ojo, mejilla y la hoja en media luna barbada. */
function cabezaHacha(cx: Cx, k: number, lado: 1 | -1, tam: number) {
  const { S, n, P } = cx;
  const ancho = [4.6, 5.4, 6.2, 7.0, 8.0][n - 1] * tam, sale = [7.2, 8.0, 8.8, 9.8, 11.0][n - 1] * tam;
  const barba = [1.0, 1.5, 2.0, 2.7, 3.4][n - 1] * tam;
  // la hoja: una lámina que sale del ojo hacia afuera y se abre en media luna (el filo es el canto de los bultos del final)
  const ctrl: Ctrl[] = [];
  const pasos = 7;
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos, x = 1.2 + (sale - 1.2) * t;
    const an = (1.4 + (ancho - 1.4) * Math.pow(t, 1.6)) * 0.5, centro = -barba * Math.pow(t, 2) * 0.55 + (n >= 4 ? 0.25 * Math.sin(t * Math.PI) : 0);
    ctrl.push({ p: P(k + centro, 0, lado * x), an: an * S, gr: (0.7 - 0.56 * t) * S, w: cx.dd });
  }
  const cs = lamina(ctrl, cx.mat, 0.8 * S);
  // el ojo que abraza el asta y el cogote
  cs.push(hueso(P(k - 2.4), P(k + 2.4), 1.25 * S, 1.15 * S), bulto(P(k, 0, lado * 1.2), [2.4 * S, 0.95 * S, 1.5 * S], { ejes: [cx.dd, cx.canto, cx.plano] }));
  // ganchos de la barba y el cuerno de arriba (legendaria y mítica)
  if (n >= 4) {
    cs.push(...cuerno(P(k - barba * 0.55 - ancho * 0.45, 0, lado * (sale - 0.6)), mul(cx.dd, -1), mul(cx.plano, -lado), 1.8 * S * tam, 0.38 * S));
    cs.push(...cuerno(P(k + ancho * 0.45, 0, lado * (sale - 0.8)), cx.dd, mul(cx.plano, -lado * 0.8), (n === 5 ? 2.6 : 1.6) * S * tam, 0.4 * S));
  }
  un(cx, cs, cx.mat, 0.3);
  // filo vivo: una línea más clara a lo largo del corte
  const filo: V3[] = [];
  for (let i = 0; i <= 6; i++) { const t = i / 6; filo.push(P(k - barba * 0.55 + (t - 0.5) * ancho * 0.95, 0, lado * (sale + 0.15 - Math.abs(t - 0.5) * 0.9))); }
  un(cx, cadena(filo, 0.16 * S, 0.16 * S, cx.mat, 0.12), cx.mat, 0.08);
  // remaches (excepcional) y la gema o la runa en la mejilla (élite)
  if (n >= 2) for (const s of [1, -1]) for (const dz of [-0.9, 0.9]) cx.ps.push(esfera(...P(k + dz, s * 0.6, lado * 2.0), 0.24 * S, { mat: cx.guarn }));
  if (n >= 3) for (const s of [1, -1]) cx.ps.push(esfera(...P(k - barba * 0.2, s * 0.45, lado * (sale * 0.55)), 0.42 * S, { mat: cx.luz }));
}
function hachaForjada(cx: Cx, doble: boolean) {
  const { n } = cx;
  const L = doble ? 30 : 20.5, k = L - 3.2;
  astaDe(cx, doble ? -6 : -4.2, L, doble ? 0.82 : 0.72, doble ? [-5, 3] : [-4, 1.6]);
  if (n >= 3) pomo(cx, (doble ? -6 : -4.2) - 0.8, 0.85);
  cabezaHacha(cx, k, 1, doble ? 1.15 : 1);
  if (doble) cabezaHacha(cx, k, -1, 1.15);
  else if (n >= 2) un(cx, [...cuerno(cx.P(k, 0, -1.0), mul(cx.plano, -1), mul(cx.dd, -0.5), (n >= 4 ? 4.2 : 2.8) * cx.S, 0.7 * cx.S)], n >= 4 ? cx.acento : cx.mat, 0.2);
  // la punta de arriba (desde élite) y la calavera mítica sobre el ojo
  if (n >= 3) un(cx, [hueso(cx.P(k + 1.8), cx.P(k + 1.8 + (n >= 4 ? 4.2 : 2.6)), 0.6 * cx.S, 0.05 * cx.S)], cx.mat, 0.1);
  if (n === 5) { craneo(cx, cx.P(k - 0.2, 0.9, 0), cx.canto, cx.dd, 1.15 * cx.S, true); fragmentos(cx, cx.P(k - 4), cx.P(k + 4), doble ? 10 : 8); }
}

/** Cabeza de maza: bola o pera con aletas (de 4 a 8), aletas en garfio, y la calavera de la mítica. */
function mazaForjada(cx: Cx) {
  const { S, n, P } = cx;
  astaDe(cx, -3.4, 14.6, 0.7, [-3, 2.4]);
  pomo(cx, -4.2, 0.85);
  const C = P(16.4), R = [2.0, 2.2, 2.35, 2.5, 2.6][n - 1];
  const cs: Comp[] = [bulto(C, [R * 1.15 * S, R * S, R * S], { eje: cx.dd }), hueso(P(13.6), P(15), 0.95 * S, 1.3 * S)];
  const aletas = [4, 6, 7, 8, 8][n - 1];
  for (let i = 0; i < aletas; i++) {
    const a = (i / aletas) * Math.PI * 2 + 0.3, d = nor(add(mul(cx.canto, Math.cos(a)), cx.plano, Math.sin(a)));
    const sale = (n === 1 ? 0.6 : 1.5 + n * 0.25) * S;
    if (n <= 3) cs.push(...lamina([{ p: add(add(C, cx.dd, -R * 1.0 * S), d, R * 0.7 * S), an: 0.25 * S, gr: 0.24 * S, w: d }, { p: add(add(C, cx.dd, 0), d, R * S + sale * 0.6), an: sale * 0.5, gr: 0.26 * S, w: d }, { p: add(add(C, cx.dd, R * 0.9 * S), d, R * 0.8 * S), an: 0.25 * S, gr: 0.2 * S, w: d }], cx.mat, 0.7 * S));
    else cs.push(...cuerno(add(C, d, R * 0.85 * S), d, mul(cx.dd, n === 5 ? 1.0 : 0.7), (2.2 + n * 0.3) * S, 0.55 * S));
  }
  if (n >= 3) cs.push(hueso(add(C, cx.dd, R * 0.9 * S), add(C, cx.dd, (R + (n >= 4 ? 3.6 : 2.0)) * S), 0.6 * S, 0.05 * S));
  un(cx, cs, cx.mat, 0.35);
  if (n >= 3) aros(cx, [13.6], 1.35);
  if (n === 5) craneo(cx, add(C, cx.plano, 0.9 * R * S), cx.plano, cx.dd, 1.3 * S, true);
  else if (n >= 3) for (const s of [1, -1]) cx.ps.push(esfera(...add(C, cx.plano, s * R * 0.95 * S), 0.5 * S, { mat: cx.luz }));
  if (n === 5) fragmentos(cx, P(12), P(20), 7);
}

/** Martillo de guerra a dos manos: asta larga, la cabeza con cara de golpe y pico (desde excepcional) y lengüetas. */
function martilloForjado(cx: Cx) {
  const { S, n, P } = cx;
  astaDe(cx, -5.4, 25.5, 0.86, [-5, 2.5]);
  const k = 24, tam = [1.15, 1.25, 1.35, 1.45, 1.6][n - 1];
  const cs: Comp[] = [];
  // el bloque: tres bultos que se funden en un mazo de cantos redondeados
  for (const t of [-1, 0, 1]) cs.push(bulto(P(k, 0, t * 1.6 * tam), [2.2 * tam * S, 1.9 * tam * S, 1.35 * tam * S], { ejes: [cx.dd, cx.canto, cx.plano] }));
  // la cara de golpe: una boca ancha y (desde élite) con puntas de diamante
  cs.push(bulto(P(k, 0, 3.0 * tam), [2.5 * tam * S, 2.2 * tam * S, 0.6 * S], { ejes: [cx.dd, cx.canto, cx.plano] }));
  if (n >= 3) for (const a of [-0.8, 0.8]) for (const b of [-0.8, 0.8]) cs.push(hueso(P(k + a * tam, b * tam, 3.2 * tam), P(k + a * tam, b * tam, 3.2 * tam + (n >= 4 ? 1.4 : 0.8)), 0.6 * S, 0.06 * S));
  // el pico de atrás: recto, curvo, o un cuerno ganchudo
  if (n >= 2) cs.push(...cuerno(P(k, 0, -2.4 * tam), mul(cx.plano, -1), mul(cx.dd, n >= 4 ? -0.9 : -0.4), (3.2 + n * 0.6) * S, 1.0 * S));
  if (n >= 3) cs.push(hueso(P(k + 1.8 * tam), P(k + 1.8 * tam + (n >= 4 ? 4 : 2.4)), 0.7 * S, 0.06 * S));
  un(cx, cs, cx.mat, 0.4);
  // lengüetas que bajan por el asta
  if (n >= 2) for (const s of [1, -1]) un(cx, [hueso(P(k - 1.8 * tam, s * 0.8), P(k - 6, s * 0.75), 0.3 * S, 0.22 * S)], cx.guarn, 0.1);
  if (n >= 3) { aros(cx, [k - 2.2 * tam], 1.25); for (const s of [1, -1]) cx.ps.push(esfera(...P(k, s * 1.85 * tam, 0), 0.5 * S, { mat: cx.luz })); }
  if (n === 5) { craneo(cx, P(k, 1.9 * tam, 0.4), cx.canto, cx.dd, 1.2 * S, true); fragmentos(cx, P(k - 5), P(k + 4), 8); }
}

/** Mangual: mango corto, cadena de eslabones que cuelga y la bola con púas (o la calavera con púas). */
function mangualForjado(cx: Cx) {
  const { S, n, P } = cx;
  empunadura(cx, -3.4, 1.8, 0.66);
  pomo(cx, -3.9, 0.8);
  un(cx, [hueso(P(1.8), P(9.6), 0.72 * S, 0.66 * S)], cx.mango === 'cu_hueso_demonio' ? cx.mango : 'ar_ebano', 0.2);
  un(cx, [hueso(P(9.2), P(10.6), 0.82 * S, 0.62 * S), bulto(P(10.7), [0.5 * S, 0.5 * S, 0.5 * S], {})], cx.guarn, 0.2);
  // la cadena cuelga hacia abajo del mundo con un vaivén y se aleja un poco hacia el frente
  const top = P(10.9), vai = Math.sin((cx.f / 8) * Math.PI * 2) * 0.8 * S;
  const fin = add(add(add(top, [0, 0, -6.4 * S]), cx.F, 2.4 * S), cx.canto, vai);
  const nE = 6, esl: Comp[] = [];
  for (let i = 0; i < nE; i++) {
    const t0 = i / nE, t1 = (i + 1) / nE, c0 = mez(top, fin, t0), c1 = mez(top, fin, t1), c = mez(c0, c1, 0.5);
    const d = nor(sub(c1, c0)), lado = i % 2 ? cx.canto : nor(cruz(d, cx.canto));
    esl.push(bulto(add(c, lado, 0.32 * S), [0.6 * S, 0.14 * S, 0.14 * S], { eje: d }), bulto(add(c, lado, -0.32 * S), [0.6 * S, 0.14 * S, 0.14 * S], { eje: d }));
  }
  un(cx, esl, 'ar_hierro', 0.15);
  const R = [1.8, 2.0, 2.2, 2.3, 2.4][n - 1], C = add(fin, [0, 0, -R * S]);
  const cs: Comp[] = [bulto(C, [R * S, R * S, R * S], {})];
  const N = [6, 10, 14, 16, 18][n - 1], Lp = [0.8, 1.6, 2.0, 2.6, 3.0][n - 1];
  for (let i = 0; i < N; i++) {
    const z = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - z * z), a = i * 2.39996;
    const d: V3 = [Math.cos(a) * r, Math.sin(a) * r, z];
    if (z > 0.8) continue;
    cs.push(hueso(add(C, d, R * 0.7 * S), add(C, d, (R + Lp) * S), 0.55 * S, 0.05 * S));
  }
  un(cx, cs, cx.mat, 0.4);
  if (n >= 3) un(cx, [bulto(add(C, [0, 0, R * 0.9 * S]), [1.2 * S, 1.2 * S, 0.45 * S], {})], cx.guarn, 0.2);
  if (n === 5) craneo(cx, add(C, cx.F, R * 0.95 * S), cx.F, [0, 0, 1], 1.0 * S, true);
  else if (n >= 4) cx.ps.push(esfera(...add(C, cx.F, R * 0.95 * S), 0.55 * S, { mat: cx.luz }));
}

/** Lanza y alabarda: asta larga, virola, la moharra en hoja de laurel; la alabarda suma la cuchilla y el pico. */
function astaForjada(cx: Cx, alabarda: boolean) {
  const { S, n, P } = cx;
  const tope = alabarda ? 29.5 : 27.8;
  astaDe(cx, -18, tope, 0.68, [-2.6, 2.6]);
  // la virola con sus aletas (desde excepcional) y la moharra
  const vir: Comp[] = [hueso(P(tope - 1.6), P(tope + 0.8), 0.86 * S, 0.62 * S)];
  if (n >= 2) for (const s of [1, -1]) vir.push(hueso(P(tope - 0.2, s * 0.6), P(tope - (n >= 4 ? 1.8 : 0.9), s * (n >= 4 ? 2.6 : 1.6)), 0.36 * S, 0.06 * S));
  un(cx, vir, cx.guarn, 0.25);
  const lg = [8.0, 9.2, 10.2, 11.2, 12.6][n - 1];
  hojaForjada(cx, tope + 0.6, tope + 0.6 + lg, alabarda ? 1.15 : 1.6, 0.38, { punta: 0.32 });
  if (alabarda) {
    // la cuchilla en media luna hacia el plano y el pico hacia atrás
    cabezaHacha(cx, tope - 3.6, 1, 1.0);
    un(cx, cuerno(P(tope - 3.6, 0, -1.0), mul(cx.plano, -1), mul(cx.dd, -0.6), (2.6 + n * 0.5) * S, 0.62 * S, n >= 4 ? cx.acento : undefined), n >= 4 ? cx.acento : cx.mat, 0.2);
  }
  if (n >= 3) cx.ps.push(esfera(...P(tope - 0.4, 0, 0.9), 0.48 * S, { mat: cx.luz }), esfera(...P(tope - 0.4, 0, -0.9), 0.48 * S, { mat: cx.luz }));
  if (n === 5) { craneo(cx, P(tope - 2.5, 0, 0.9), cx.plano, cx.dd, 0.95 * S, true); fragmentos(cx, P(tope), P(tope + lg), 4.5); }
}

/** Guadaña: mástil (con sus manijas), cuello y una hoja larga en media luna que se afina hacia la punta. */
function guadanaForjada(cx: Cx) {
  const { S, n, P } = cx;
  astaDe(cx, -14, 30, 0.7, null);
  // las dos manijas del mástil (desde excepcional)
  if (n >= 2) for (const k of [-6, 6]) un(cx, [hueso(P(k), P(k + 0.4, 0, 2.6), 0.38 * S, 0.34 * S), bulto(P(k + 0.4, 0, 2.8), [0.5 * S, 0.5 * S, 0.5 * S], {})], cx.mango, 0.2);
  un(cx, [hueso(P(28.4), P(30.8), 0.95 * S, 0.8 * S)], cx.guarn, 0.2);
  // la hoja: sale del cuello hacia la cara del arma y se curva hacia abajo
  const largo = [15, 16.5, 17.5, 18.5, 20][n - 1], t0 = P(30.4);
  const pts: V3[] = [];
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * 1.7; pts.push(add(add(t0, cx.plano, Math.sin(a) * largo * S), cx.dd, (Math.cos(a) - 1) * 4.6 * S + (i === 0 ? 0 : 0.4 * S))); }
  const ctrl: Ctrl[] = pts.map((p, i) => { const t = i / 10; return { p, an: (2.0 - t * 1.7) * S * (n >= 4 ? 1.15 : 1), gr: (0.44 - t * 0.32) * S, w: nor(add(cx.dd, cx.plano, -Math.sin(t * 1.7) * 0.3)) }; });
  const cs = lamina(ctrl, cx.mat, 0.9 * S);
  // dientes en el filo de adentro (legendaria) y ganchos (mítica)
  if (n >= 4) for (let i = 2; i < 9; i += 2) { const p = pts[i], d = nor(sub(pts[i + 1], pts[i - 1])); cs.push(hueso(add(p, cx.dd, -1.1 * S), add(add(p, cx.dd, -2.1 * S), d, -0.7 * S), 0.3 * S, 0.04 * S)); }
  if (n === 5) cs.push(...cuerno(add(pts[4], cx.dd, 1.0 * S), cx.dd, mul(cx.plano, -1), 2.4 * S, 0.45 * S));
  un(cx, cs, cx.mat, 0.25);
  if (n >= 3) cx.ps.push(esfera(...add(t0, cx.canto, 1.0 * S), 0.55 * S, { mat: cx.luz }), esfera(...add(t0, cx.canto, -1.0 * S), 0.55 * S, { mat: cx.luz }));
  if (n === 5) { craneo(cx, P(29.4, 0, -1.2), mul(cx.plano, -1), cx.dd, 1.1 * S, true); fragmentos(cx, pts[1], pts[8], 4); }
}

/** Báculo, cetro y varita: la vara (nudosa, tallada, de ébano o de vértebras) y el remate que crece con el nivel. */
function varaForjada(cx: Cx, mc: MarcoArma, tipo: TipoArma) {
  const { S, n } = cx;
  let pie: V3, tope: V3, up: V3;
  if (tipo === 'varita') { pie = cx.P(-1.6); tope = cx.P(9.6); up = cx.dd; }
  else [pie, tope, up] = mc.vara ?? [cx.P(-20), cx.P(26), cx.dd];
  let ex = cruz(up, cx.F); if (len(ex) < 0.2) ex = cruz(up, [1, 0, 0]);
  ex = nor(ex);
  const ey = cruz(up, ex), gv = mc.giroVara ?? 0;
  const Q = (h: number, x = 0, y = 0): V3 => add(add(add(tope, up, h * S), ex, x * S), ey, y * S);
  const r = tipo === 'varita' ? 0.48 : tipo === 'cetro' ? 0.72 : 0.82;
  // la vara
  const L = len(sub(tope, pie)), nn = Math.max(4, Math.round(L / (3.4 * S)));
  const cs: Comp[] = [];
  const W = (t: number) => add(mez(pie, tope, t), ex, (cx.mango.includes('madera') || cx.mango.includes('corteza') ? Math.sin(t * 9) * 0.25 * S * Math.sin(Math.PI * t) : 0));
  for (let i = 0; i < nn; i++) cs.push(hueso(W(i / nn), W((i + 1) / nn), r * (1 - 0.15 * (i / nn) * (tipo === 'varita' ? 1 : 0)) * S, r * (1 - 0.15 * ((i + 1) / nn) * (tipo === 'varita' ? 1 : 0)) * S));
  if (n === 5) for (let i = 1; i < nn * 2; i++) cs.push(bulto(W(i / (nn * 2)), [0.4 * S, (r + 0.16) * S, (r + 0.16) * S], { eje: up, tono: -0.04 }));
  else if (n <= 2 && tipo !== 'varita') for (const t of [0.33, 0.62]) cs.push(bulto(W(t), [1.0 * S, (r + 0.25) * S, (r + 0.25) * S], { eje: up, tono: -0.05 }));
  un(cx, cs, cx.mango, tipo === 'varita' ? 0.2 : 0.4);
  if (tipo !== 'varita') un(cx, [hueso(add(pie, up, 1.2 * S), add(pie, up, -0.4 * S), (r + 0.12) * S, 0.2 * S)], n >= 3 ? cx.guarn : 'ar_hierro', 0.15);
  if (n >= 2) for (const h of tipo === 'varita' ? [-0.8] : n >= 4 ? [-2.2, -L / S * 0.42] : [-2.2]) un(cx, [bulto(Q(h), [0.38 * S, (r + 0.22) * S, (r + 0.22) * S], { eje: up })], cx.guarn, 0.1);
  // el remate
  const g = tipo === 'varita' ? 0.55 : tipo === 'cetro' ? 0.8 : 1;
  const gemaC = Q((n === 1 ? 1.4 : 2.6 + n * 0.25) * g);
  const gr = (n === 1 ? 0.9 : 1.2 + n * 0.16) * g;
  if (n === 1) {
    un(cx, [bulto(Q(0.2 * g), [1.4 * g * S, (r + 0.5) * S, (r + 0.5) * S], { eje: up, tono: -0.04 })], cx.mango, 0.4);
  } else {
    // dedos o garras que suben y se cierran sobre la gema (4 en excepcional, 5 en élite, cuernos retorcidos arriba)
    const dedos = n === 2 ? 4 : n === 3 ? 5 : 3, rm: Comp[] = [bulto(Q(-0.2 * g), [0.9 * g * S, (r + 0.3) * S, (r + 0.3) * S], { eje: up })];
    for (let i = 0; i < dedos; i++) {
      const a = gv + (i / dedos) * Math.PI * 2, rx = Math.cos(a), ry = Math.sin(a);
      if (n <= 3) rm.push(...cadena([Q(0, rx * 0.4 * g, ry * 0.4 * g), Q(1.4 * g, rx * 1.9 * g, ry * 1.9 * g), Q(3.0 * g, rx * 2.2 * g, ry * 2.2 * g), Q(4.4 * g, rx * 1.0 * g, ry * 1.0 * g)], 0.5 * S * g, 0.1 * S));
      else {
        // cuernos que suben en espiral alrededor de la gema y se vuelven hacia afuera
        const pts: V3[] = [];
        for (let j = 0; j <= 7; j++) { const t = j / 7, aa = a + t * 2.4, rr = (0.5 + Math.sin(t * Math.PI) * 2.0 + (t > 0.8 ? (t - 0.8) * 6 : 0)) * g; pts.push(Q(t * 6.2 * g, Math.cos(aa) * rr, Math.sin(aa) * rr)); }
        rm.push(...cadena(pts, 0.62 * S * g, 0.06 * S));
      }
    }
    un(cx, rm, n >= 4 ? (n === 5 ? 'cu_hueso_demonio' : cx.acento) : cx.guarn, 0.3);
    if (n >= 3) un(cx, [bulto(Q(0.2 * g), [0.55 * S, (r + 0.6) * S, (r + 0.6) * S], { eje: up })], cx.guarn, 0.15);
  }
  if (n === 5) craneo(cx, Q(-1.6 * g, 0, 0), nor(add(cx.F, ey, 0.3)), up, 1.15 * S * g, true);
  cx.ps.push(esfera(...gemaC, gr * S, { mat: cx.luz }));
  if (n >= 4) fragmentos(cx, Q(0), Q(7 * g), 4.2 * g, n === 5 ? 5 : 3);
}

/** Garras de puño: un guantelete (puño de muñeca, placa del dorso y nudillos) del que salen cuchillas curvas en abanico. */
function garrasForjadas(cx: Cx) {
  const { S, n, P } = cx;
  const nn = n >= 3 ? 4 : 3, lg = [8, 9, 10, 11.5, 13][n - 1];
  guante(cx);
  for (let i = 0; i < nn; i++) {
    const c = (i / (nn - 1) - 0.5) * 2.6, abre = (i / (nn - 1) - 0.5) * (n >= 3 ? 1.6 : 1.0);
    // cada cuchilla sale del nudillo, se abre un poco y se curva de costado como una zarpa
    const ctrl: Ctrl[] = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ p: P(1.4 + lg * t, c + abre * t + (n >= 2 ? 1.6 : 0.6) * t * t, 0.4), an: (0.62 - 0.52 * t) * S, gr: 0.22 * S, w: cx.canto }));
    const cs = lamina(ctrl, cx.mat, 0.7 * S);
    if (n >= 4) cs.push(hueso(P(1.4 + lg * 0.42, c + abre * 0.4, 0.4), P(1.4 + lg * 0.3, c + abre * 0.3 - 1.3, 0.4), 0.26 * S, 0.04 * S));
    un(cx, cs, cx.mat, 0.18);
  }
  if (n >= 3) cx.ps.push(esfera(...P(-0.6, 0, 1.55), 0.55 * S, { mat: cx.luz }));
  if (n === 5) { craneo(cx, P(-1.8, 0, 1.6), cx.plano, cx.dd, 0.8 * S, true); fragmentos(cx, P(2), P(lg), 4, 3); }
}
/**
 * Guantelete o guante de pelea sobre el puño (el de garras y el cesto): puño de muñeca, el dorso de la mano, los
 * nudillos y los dedos cerrados; en la mano del personaje queda como un guante sobre la mano.
 */
function guante(cx: Cx, cuero = false) {
  const { S, n, P } = cx;
  const ej: [V3, V3, V3] = [cx.dd, cx.canto, cx.plano];
  const piel = cuero ? (n >= 3 ? 'cu_cuero_negro' : 'cu_cuero') : n >= 2 ? cx.mat : 'ar_hierro';
  const cs: Comp[] = [bulto(P(-0.7, 0, 0.35), [1.7 * S, 1.45 * S, 1.0 * S], { ejes: ej }), hueso(P(-3.2), P(-1.8), 1.0 * S, 1.15 * S)];
  // los dedos cerrados: cuatro rollos que doblan hacia la palma, y el pulgar cruzado
  for (let i = 0; i < 4; i++) { const c = (i / 3 - 0.5) * 2.1; cs.push(hueso(P(0.9, c, 0.5), P(1.4, c, -0.4), 0.42 * S, 0.38 * S), hueso(P(1.4, c, -0.4), P(0.6, c * 0.9, -1.0), 0.38 * S, 0.34 * S)); }
  cs.push(hueso(P(-0.6, -1.3, -0.4), P(0.6, -0.5, -1.0), 0.42 * S, 0.36 * S));
  un(cx, cs, piel, 0.35);
  // puño de la muñeca con su ribete y las placas del dorso
  un(cx, [bulto(P(-2.5), [0.95 * S, 1.35 * S, 1.2 * S], { ejes: ej }), bulto(P(-1.9), [0.3 * S, 1.45 * S, 1.3 * S], { ejes: ej, tono: 0.06 })], cuero ? piel : cx.guarn, 0.25);
  if (!cuero || n >= 2) un(cx, [bulto(P(-0.6, 0, 0.95), [1.3 * S, 1.15 * S, 0.3 * S], { ejes: ej }), bulto(P(0.6, 0, 0.9), [0.5 * S, 1.3 * S, 0.3 * S], { ejes: ej })], cuero ? cx.guarn : cx.mat, 0.2);
}

/** Katar: las dos barras del puño que abrazan el antebrazo (curvas, como costillas), los travesaños forrados y la hoja ancha en hoja de laurel. */
function katarForjado(cx: Cx) {
  const { S, n, P } = cx;
  const barras: Comp[] = [];
  for (const s of [1, -1]) {
    barras.push(...cadena(Array.from({ length: 6 }, (_, i) => { const t = i / 5; return P(-5 + t * 5.6, s * (1.55 + Math.sin(Math.PI * t) * 0.55), Math.sin(Math.PI * t) * 0.3); }), 0.42 * S, 0.34 * S));
    barras.push(bulto(P(-5.2, s * 1.55), [0.55 * S, 0.5 * S, 0.5 * S], {}));
    if (n >= 4) barras.push(...cuerno(P(-5.2, s * 1.55), nor(add(mul(cx.dd, -1), cx.canto, s * 0.6)), mul(cx.canto, s * 0.8), (n === 5 ? 2.4 : 1.6) * S, 0.34 * S));
  }
  un(cx, barras, cx.guarn, 0.25);
  un(cx, [hueso(P(-1.2, 1.7), P(-1.2, -1.7), 0.52 * S, 0.52 * S), hueso(P(-3.0, 1.85), P(-3.0, -1.85), 0.48 * S, 0.48 * S)], cx.mango, 0.2);
  // la base de la hoja: una placa que nace de las barras
  un(cx, [bulto(P(0.7), [0.7 * S, 2.2 * S, 0.62 * S], { ejes: [cx.dd, cx.canto, cx.plano] })], cx.guarn, 0.25);
  hojaForjada(cx, 1.1, [11.5, 12.5, 13.2, 14, 15][n - 1], 1.75, 0.44, { punta: 0.45 });
  if (n >= 3) for (const s of [1, -1]) cx.ps.push(esfera(...P(0.7, 0, s * 0.62), 0.5 * S, { mat: cx.luz }));
  if (n === 5) fragmentos(cx, P(3), P(13), 4, 3);
}

/** Cesto (puño de pelea): guante de cuero con correas cruzadas y la placa de nudillos con tachas, púas o cuchillas. */
function cestusForjado(cx: Cx) {
  const { S, n, P } = cx;
  guante(cx, true);
  // correas que cruzan el dorso en X y dan la vuelta a la muñeca
  const correa = n >= 3 ? 'cu_cuero_negro' : 'ar_cordon';
  for (const s of [1, -1]) un(cx, cadena([P(-2.4, s * 1.3, 0.9), P(-1.0, 0, 1.25), P(0.4, -s * 1.2, 1.05)], 0.2 * S, 0.2 * S), correa, 0.08);
  // la placa de los nudillos: un arco de metal sobre los cuatro nudillos
  const placa: Comp[] = [hueso(P(1.15, -1.55, 0.6), P(1.15, 1.55, 0.6), 0.52 * S, 0.52 * S)];
  for (let i = 0; i < 4; i++) { const c = (i / 3 - 0.5) * 2.4; placa.push(bulto(P(1.35, c, 0.6), [0.6 * S, 0.55 * S, 0.62 * S], {})); }
  un(cx, placa, n >= 2 ? cx.mat : 'ar_hierro', 0.3);
  for (let i = 0; i < 4; i++) {
    const c = (i / 3 - 0.5) * 2.4;
    if (n === 1) cx.ps.push(esfera(...P(1.95, c, 0.6), 0.3 * S, { mat: 'ar_hierro' }));
    else if (n <= 3) un(cx, [hueso(P(1.7, c, 0.6), P(n === 2 ? 2.7 : 3.3, c, 0.65), 0.4 * S, 0.06 * S)], n === 3 ? cx.guarn : cx.mat, 0.1);
    else un(cx, cuerno(P(1.7, c, 0.6), cx.dd, mul(cx.plano, n === 5 ? 0.9 : 0.4), (n === 5 ? 3.6 : 2.6) * S, 0.42 * S), cx.acento, 0.12);
  }
  if (n >= 3) cx.ps.push(esfera(...P(-0.4, 0, 1.4), 0.5 * S, { mat: cx.luz }));
  if (n === 5) { craneo(cx, P(-2.2, 0, 1.4), cx.plano, cx.dd, 0.75 * S, true); fragmentos(cx, P(0), P(4), 3.6, 3); }
}

/** Frasco del alquimista: el vidrio con el líquido del elemento, el corcho o el tapón, y la jaula que crece con el nivel. */
function frascoForjado(cx: Cx) {
  const { S, n, P } = cx;
  const liq = cx.el ? BRILLO_ELEMENTO[cx.el] : 'magia', R = [1.9, 2.0, 2.15, 2.3, 2.5][n - 1];
  const C = P(1.6 + R);
  // el vidrio (pera con cuello) y el líquido adentro que se mece
  cx.ps.push(masa([bulto(C, [R * 1.05 * S, R * S, R * S], { eje: cx.dd }), hueso(add(C, cx.dd, R * 0.5 * S), add(C, cx.dd, (R + 2.0) * S), 0.75 * S, 0.62 * S)], { mat: 'ar_vidrio', suave: 0.4 * S }));
  const meneo = Math.sin((cx.f / 8) * Math.PI * 2) * 0.25 * S;
  cx.ps.push(esfera(...add(add(C, cx.dd, -0.15 * R * S), cx.canto, meneo), R * 0.82 * S, { mat: liq }));
  // corcho (común), tapón de metal (excepcional), calavera (mítica)
  const boca = add(C, cx.dd, (R + 2.1) * S);
  if (n === 1) un(cx, [hueso(boca, add(boca, cx.dd, 1.0 * S), 0.66 * S, 0.72 * S)], 'madera', 0.1);
  else if (n < 5) un(cx, [hueso(add(boca, cx.dd, -0.3 * S), add(boca, cx.dd, 0.7 * S), 0.8 * S, 0.8 * S), bulto(add(boca, cx.dd, 1.1 * S), [0.6 * S, 0.6 * S, 0.6 * S], {})], cx.guarn, 0.2);
  else craneo(cx, add(boca, cx.dd, 1.0 * S), cx.plano, cx.dd, 0.9 * S, true);
  // cordel con sello (excepcional), jaula de metal (élite), con púas (legendaria)
  if (n === 2) un(cx, [...cadena([add(boca, cx.canto, 0.8 * S), add(add(C, cx.canto, R * 1.05 * S), cx.dd, 0.6 * S), add(add(C, cx.canto, R * 0.9 * S), cx.dd, -0.6 * S)], 0.14 * S, 0.14 * S), bulto(add(add(C, cx.canto, R * 0.9 * S), cx.dd, -0.9 * S), [0.45 * S, 0.45 * S, 0.2 * S], { mat: 'ar_cera' })], 'ar_cordon', 0.08);
  if (n >= 3) {
    const jaula: Comp[] = [];
    for (let i = 0; i < 4; i++) {
      const a = rad(45 + i * 90), d = nor(add(mul(cx.canto, Math.cos(a)), cx.plano, Math.sin(a)));
      const pts = [-1.05, -0.6, 0, 0.6, 1.0].map((t) => add(add(C, cx.dd, t * R * S), d, Math.sqrt(Math.max(0, 1 - t * t * 0.8)) * R * 1.08 * S));
      jaula.push(...cadena([add(C, cx.dd, -R * 1.1 * S), ...pts, add(boca, d, 0.6 * S)], 0.2 * S, 0.2 * S));
      if (n >= 4) jaula.push(hueso(pts[2], add(pts[2], d, (n === 5 ? 2.0 : 1.3) * S), 0.28 * S, 0.04 * S));
    }
    for (const t of [-0.6, 0.6]) for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, d = nor(add(mul(cx.canto, Math.cos(a)), cx.plano, Math.sin(a))); jaula.push(bulto(add(add(C, cx.dd, t * R * S), d, Math.sqrt(1 - t * t * 0.8) * R * 1.08 * S), [0.32 * S, 0.18 * S, 0.18 * S], { eje: cruz(cx.dd, d) })); }
    un(cx, jaula, cx.guarn, 0.12);
  }
  if (n >= 3) un(cx, [bulto(add(C, cx.dd, -R * 1.1 * S), [0.5 * S, 1.1 * S, 1.1 * S], { eje: cx.dd })], cx.guarn, 0.15);
  if (n === 5) fragmentos(cx, add(C, cx.dd, -R * S), add(C, cx.dd, R * 2 * S), R + 2.4, 3);
}

/** Ballesta: la caja (tablero) de madera, el arco de acero en media luna, la cuerda, el virote y la nuez. */
function ballestaForjada(cx: Cx, mc: MarcoArma) {
  const { S, n } = cx;
  const b = mc.ballesta ?? { c: cx.m, ap: cx.dd, lado: cx.canto };
  const { c, ap, lado } = b;
  const arriba = nor(cruz(lado, ap));
  const B = (a: number, l = 0, z = 0): V3 => add(add(add(c, ap, a * S), lado, l * S), arriba, z * S);
  // el tablero: de la culata al frente, con la culata que baja
  const caja: Comp[] = [hueso(B(-6), B(9.5), 0.85 * S, 0.75 * S), bulto(B(-6.2, 0, -1.6), [1.6 * S, 0.8 * S, 2.0 * S], { ejes: [ap, lado, arriba] }), hueso(B(-1.5, 0, -0.6), B(-1.2, 0, -2.6), 0.42 * S, 0.3 * S)];
  un(cx, caja, cx.mango, 0.4);
  // el arco: dos palas en media luna hacia adelante, de acero (o de hueso y cuerno en lo mítico)
  const ab = [7, 7.5, 8, 8.6, 9.4][n - 1];
  const palas: Comp[] = [];
  for (const s of [1, -1]) palas.push(...cadena([B(8.6), B(8.4, s * ab * 0.4, 0), B(7.6, s * ab * 0.75, 0), B(6.2, s * ab, 0)], 0.75 * S, 0.32 * S));
  un(cx, palas, n === 5 ? 'cu_hueso_demonio' : cx.mat, 0.3);
  if (n >= 4) for (const s of [1, -1]) un(cx, cuerno(B(6.2, s * ab, 0), nor(add(mul(lado, s), ap, 0.6)), mul(ap, 0.8), (n === 5 ? 2.6 : 1.6) * S, 0.36 * S), cx.acento, 0.1);
  // la cuerda tensa hasta la nuez y el virote
  for (const s of [1, -1]) cx.ps.push(palo(B(6.2, s * ab, 0), B(-0.8, 0, 0.6), 0.14 * S, { mat: 'cuerda' }));
  cx.ps.push(palo(B(-0.6, 0, 0.9), B(10.6, 0, 0.9), 0.24 * S, { mat: 'madera_lisa' }));
  un(cx, [hueso(B(10.4, 0, 0.9), B(12.0, 0, 0.9), 0.4 * S, 0.04 * S)], cx.mat, 0.1);
  if (n >= 2) for (const a of [-3.5, 3.5]) un(cx, [bulto(B(a), [0.32 * S, 1.0 * S, 1.0 * S], { eje: ap })], cx.guarn, 0.1);
  if (n >= 3) cx.ps.push(esfera(...B(8.6, 0, 0.8), 0.55 * S, { mat: cx.luz }));
  if (n === 5) { craneo(cx, B(-6.6, 0, -1.2), mul(ap, -1), arriba, 0.95 * S, true); fragmentos(cx, B(0), B(10), 6, 3); }
}

// ------------------------------------------------------------------ el marco del ícono
const KZ = Math.sqrt(1.5);
const CAM_X: V3 = nor([1, -1, 0]), CAM_Y: V3 = nor([1, 1, 1 / KZ]), CAM_Z: V3 = cruz(CAM_X, CAM_Y);
/** Gira v alrededor del eje unitario k. */
const girar = (v: V3, k: V3, a: number): V3 => { const c = Math.cos(a), s = Math.sin(a), kv = cruz(k, v), d = dot(k, v); return [v[0] * c + kv[0] * s + k[0] * d * (1 - c), v[1] * c + kv[1] * s + k[1] * d * (1 - c), v[2] * c + kv[2] * s + k[2] * d * (1 - c)]; };
/**
 * El eje y el frente de un arma suelta para el ícono del inventario: de pie en la pantalla, la punta un poco echada
 * hacia atrás y la cara girada hacia la luz (arriba a la izquierda), así la hoja de frente no queda en sombra.
 * `deLado`: las cabezas que se leen de perfil (hachas, martillo, guadaña) muestran la cara de la cabeza.
 */
export function marcoIcono(deLado: boolean, inclina = -8, giro = 8): [V3, V3] {
  const t = rad(inclina), eje = nor(add(mul(CAM_Z, Math.cos(t)), CAM_Y, Math.sin(t)));
  const cara = nor(add(mul(CAM_Y, Math.cos(t)), CAM_Z, -Math.sin(t)));
  const g = rad(giro);
  return [eje, deLado ? girar(CAM_X, eje, g) : girar(cara, eje, g)];
}

// ------------------------------------------------------------------ entrada
/** Las familias con forma propia de la forja (las demás conservan la del motor y suman `adornosNivel`). */
export const FORJADAS: TipoArma[] = ['katar', 'espada', 'mandoble', 'cimitarra', 'daga', 'hacha', 'hacha_doble', 'maza', 'martillo', 'mangual', 'lanza', 'alabarda', 'guadana', 'baculo', 'cetro', 'varita', 'garras', 'cestus', 'frasco', 'ballesta'];

/** La forma forjada de un arma con nivel, o null si su familia conserva la forma del motor. */
export function formaForjada(mc: MarcoArma, o: OpcForja): Pieza[] | null {
  if (!FORJADAS.includes(o.tipo)) return null;
  const cx = contexto(mc, o);
  switch (o.tipo) {
    case 'espada': case 'mandoble': case 'cimitarra': case 'daga': armaDeHoja(cx, o.tipo); break;
    case 'hacha': hachaForjada(cx, false); break;
    case 'hacha_doble': hachaForjada(cx, true); break;
    case 'maza': mazaForjada(cx); break;
    case 'martillo': martilloForjado(cx); break;
    case 'mangual': mangualForjado(cx); break;
    case 'lanza': astaForjada(cx, false); break;
    case 'alabarda': astaForjada(cx, true); break;
    case 'guadana': guadanaForjada(cx); break;
    case 'baculo': case 'cetro': case 'varita': varaForjada(cx, mc, o.tipo); break;
    case 'garras': garrasForjadas(cx); break;
    case 'cestus': cestusForjado(cx); break;
    case 'katar': katarForjado(cx); break;
    case 'frasco': frascoForjado(cx); break;
    case 'ballesta': ballestaForjada(cx, mc); break;
    default: return null;
  }
  return cx.ps;
}

/**
 * Los adornos del nivel para las familias que conservan la forma del motor (katana, estoque, falcata, katar, hoz,
 * tridente, jabalina, lucero, arcos, gran báculo, orbe y lanza del dragón): aros de oro en el mango (élite), púas en el
 * lomo o junto a la cabeza y una gema (legendaria), cuernos, calavera y fragmentos que orbitan (mítica).
 */
export function adornosNivel(mc: MarcoArma, o: OpcForja): Pieza[] {
  if (FORJADAS.includes(o.tipo) || o.nivel <= 2) return [];
  const cx = contexto(mc, o), { S, n, P } = cx;
  const [a, b] = mc.filo;
  const t = o.tipo;
  if (t === 'katana' || t === 'estoque' || t === 'falcata' || t === 'katar' || t === 'hoz') {
    // la empuñadura con aros de oro; púas en el lomo; cuernos en la guarda y la calavera en el pomo
    const mango = t === 'katana' ? 7.2 : t === 'katar' ? 0 : 4.4;
    if (mango) aros(cx, [-mango + 0.3, -0.6], 0.95);
    if (n >= 4) {
      const lado = t === 'katana' || t === 'falcata' ? -1 : 1;
      const k0 = t === 'katar' ? 2 : t === 'hoz' ? 3.5 : 3, k1 = t === 'hoz' ? 3.8 : len(sub(b, cx.m)) / S * 0.7;
      if (t === 'katar' || t === 'falcata') for (let i = 0; i < (n === 5 ? 5 : 3); i++) { const k = k0 + ((i + 0.5) / (n === 5 ? 5 : 3)) * (k1 - k0); un(cx, [hueso(P(k, lado * 0.85), P(k - 1.0, lado * 2.0), 0.32 * S, 0.04 * S)], cx.acento, 0.1); }
      for (const s of [1, -1]) un(cx, cuerno(P(0.3, s * 1.2), nor(add(mul(cx.canto, s), cx.dd, -0.5)), mul(cx.dd, 1.2), (n === 5 ? 3.0 : 2.0) * S, 0.42 * S), cx.acento, 0.12);
      cx.ps.push(esfera(...P(0.3, 0, 0.75), 0.5 * S, { mat: cx.luz }));
    }
    if (n === 5) { if (mango) craneo(cx, P(-mango - 1.2), cx.plano, mul(cx.dd, -1), 1.1 * S, true); fragmentos(cx, a, b, 3.6, t === 'katar' || t === 'hoz' ? 3 : 4); }
    return cx.ps;
  }
  if (t === 'tridente' || t === 'jabalina' || t === 'lanza_dragon') {
    // aros en el asta, garfios bajo la moharra, cuernos y fragmentos
    const kb = len(sub(a, cx.m)) / S;
    aros(cx, [kb - 2.2, -6, 6], 0.95);
    if (n >= 4) for (const s of [1, -1]) un(cx, cuerno(P(kb - 1.4, s * 0.6), nor(add(mul(cx.canto, s), cx.dd, -0.7)), mul(cx.dd, -0.6), (n === 5 ? 2.8 : 1.8) * S, 0.38 * S), cx.acento, 0.1);
    if (n >= 4) cx.ps.push(esfera(...P(kb - 2.2, 0, 1.0), 0.48 * S, { mat: cx.luz }));
    if (n === 5) { craneo(cx, P(kb - 3.6, 0, 0.9), cx.plano, cx.dd, 0.95 * S, true); fragmentos(cx, a, b, 4, 4); }
    return cx.ps;
  }
  if (t === 'maza_estrella') {
    aros(cx, [13.2, -2.6], 1.1);
    if (n >= 4) for (let i = 0; i < 4; i++) { const ang = rad(i * 90 + 45), d = nor(add(mul(cx.canto, Math.cos(ang)), cx.plano, Math.sin(ang))); un(cx, cuerno(add(P(13.6), d, 1.0 * S), nor(add(d, cx.dd, -0.3)), mul(cx.dd, -1.0), (n === 5 ? 4.6 : 3.6) * S, 0.55 * S), cx.acento, 0.12); }
    if (n === 5) { craneo(cx, P(-4.2), cx.plano, mul(cx.dd, -1), 1.0 * S, true); fragmentos(cx, a, b, 6, 4); }
    return cx.ps;
  }
  if (t === 'gran_baculo' || t === 'orbe_mano') {
    // cuernos que abrazan la gema y fragmentos que orbitan
    const eje = nor(sub(b, a)), cen = mez(a, b, 0.5);
    let ex = cruz(eje, cx.F); if (len(ex) < 0.2) ex = cruz(eje, [1, 0, 0]);
    ex = nor(ex);
    const ey = cruz(eje, ex), R = t === 'orbe_mano' ? 2.4 : 2.6;
    if (n >= 4) for (let i = 0; i < 3; i++) { const ang = (i / 3) * Math.PI * 2 + 0.5, d = nor(add(mul(ex, Math.cos(ang)), ey, Math.sin(ang))); un(cx, cuerno(add(add(cen, eje, -R * 0.9 * S), d, R * 0.8 * S), nor(add(mul(eje, 0.35), d, 1)), mul(eje, 1.1), (n === 5 ? 4.4 : 3.4) * S, 0.42 * S), cx.acento, 0.12); }
    if (n === 5) { craneo(cx, add(cen, eje, -R * 2.0 * S), nor(add(cx.F, ey, 0.3)), eje, 0.95 * S, true); fragmentos(cx, add(cen, eje, -3 * S), add(cen, eje, 4 * S), t === 'orbe_mano' ? 3.4 : 4.2, 5); }
    return cx.ps;
  }
  if (t === 'arco' || t === 'arco_corto' || t === 'arco_largo') {
    // arcos: puntas de oro (élite), cuchillas en el lomo de las palas (legendaria), cuernos en las puntas y calavera
    // en el agarre (mítica); el lomo mira hacia donde vuela la flecha. Las palas siguen el perfil del motor (cuerpo.ts).
    const ar = mc.arco ?? { c: mez(a, b, 0.5), tiro: cx.F, arriba: nor(sub(b, a)) };
    const perfil: [number, number][] = t === 'arco_largo' ? [[19.5, 4.4], [15.5, 3.1], [10, 1.4], [5, 0.2], [1.8, -0.35], [0, -0.45]] : t === 'arco_corto' ? [[12.8, 2.3], [11.4, 3.2], [8.6, 2.6], [5.2, 1.1], [2.2, -0.25], [0, -0.4]] : [[15, 3.6], [9, 1.2], [2.6, -0.3], [0, -0.3]];
    const kmax = perfil[0][0];
    const atras = (k: number) => { for (let i = 0; i < perfil.length - 1; i++) { const [k0, a0] = perfil[i], [k1, a1] = perfil[i + 1]; if (k <= k0 && k >= k1) return a1 + ((a0 - a1) * (k - k1)) / (k0 - k1); } return perfil[perfil.length - 1][1]; };
    const B = (u: number, fuera = 0): V3 => add(add(ar.c, ar.arriba, u * kmax * S), ar.tiro, (fuera - atras(Math.abs(u) * kmax)) * S);
    for (const s of [1, -1]) {
      un(cx, [bulto(B(s * 0.985), [0.85 * S, 0.68 * S, 0.68 * S], { eje: ar.arriba })], cx.guarn, 0.15);
      if (n >= 4) for (let i = 0; i < (n === 5 ? 3 : 2); i++) { const u = s * (0.36 + i * 0.17); un(cx, [hueso(B(u, 0.5), add(B(u - s * 0.06, 0.5), ar.tiro, (n === 5 ? 2.4 : 1.6) * S), 0.36 * S, 0.04 * S)], cx.acento, 0.1); }
      if (n === 5) un(cx, cuerno(B(s * 0.985), nor(add(mul(ar.arriba, s), ar.tiro, 0.5)), mul(ar.tiro, -1.2), 2.8 * S, 0.38 * S, 'cu_cuerno'), 'cu_cuerno', 0.1);
    }
    if (n >= 3) cx.ps.push(esfera(...B(0.16, 0.9), 0.5 * S, { mat: cx.luz }), esfera(...B(-0.16, 0.9), 0.5 * S, { mat: cx.luz }));
    if (n === 5) { craneo(cx, B(0, 1.6), ar.tiro, ar.arriba, 0.85 * S, false); fragmentos(cx, B(-0.6), B(0.6), 3.4, 3); }
    return cx.ps;
  }
  return cx.ps;
}

/**
 * Los tramos donde va la capa del elemento: el tramo vivo del arma, salvo los arcos (las dos palas, siguiendo su
 * perfil) y la ballesta (a lo largo del tablero y del virote), así el fuego o el hielo no hacen una columna en el puño.
 */
export function tramosVivos(mc: MarcoArma, tipo: TipoArma): [V3, V3][] {
  const S = mc.S;
  if (tipo === 'ballesta' && mc.ballesta) { const { c, ap } = mc.ballesta; return [[add(c, ap, -1 * S), add(c, ap, 10 * S)]]; }
  if ((tipo === 'arco' || tipo === 'arco_corto' || tipo === 'arco_largo') && mc.arco) {
    const { c, tiro, arriba } = mc.arco, kmax = tipo === 'arco_largo' ? 19.5 : tipo === 'arco_corto' ? 12.8 : 15, atras = tipo === 'arco_largo' ? 4.4 : tipo === 'arco_corto' ? 2.6 : 3.6;
    const Pp = (u: number): V3 => add(add(c, arriba, u * kmax * S), tiro, -atras * u * u * S);
    return [[Pp(0.2), Pp(0.92)], [Pp(-0.2), Pp(-0.92)]];
  }
  return [mc.filo];
}

/** Medio ancho de lo que envuelve la capa del elemento (hoja, cabeza o gema), en unidades de S. */
export function anchoVivo(tipo: TipoArma): number {
  switch (tipo) {
    case 'mandoble': return 1.7;
    case 'hacha': case 'hacha_doble': case 'martillo': return 2.6;
    case 'maza': case 'maza_estrella': case 'mangual': return 2.4;
    case 'daga': case 'estoque': case 'varita': return 0.8;
    case 'baculo': case 'cetro': case 'gran_baculo': case 'orbe_mano': case 'frasco': return 1.8;
    case 'cestus': case 'garras': return 1.6;
    default: return 1.25;
  }
}
