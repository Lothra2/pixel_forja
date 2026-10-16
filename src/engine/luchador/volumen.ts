import { type V3, type Base, type Articulaciones, type Medidas, add, sub, mul, dot, norm, cross, lerp3, enBase } from './esqueleto';
import { type LuchadorFicha, type Ropa, TRAJES } from './ficha';

/**
 * Las piezas del cuerpo como volúmenes con distancia (SDF): conos redondeados para brazos y piernas, elipsoides para el
 * pecho, la cadera, la cabeza y los músculos. Las piezas del mismo grupo se funden suave entre sí (el deltoides con el
 * brazo, el pecho con el abdomen), y los grupos distintos se cortan en seco: ahí el render dibuja la línea de adentro,
 * como en los sprites de Capcom.
 *
 * El cuerpo es de peleador de SF2: hombros anchos, trapecios, pectorales, abdominales, dorsales, cintura angosta y
 * muslos grandes. La ropa va por piezas encima (ver `Ropa`), con pliegues de tela pintados.
 */
export type Grupo =
  | 'torso' | 'cabeza' | 'cinto' | 'cintillo' | 'cola'
  | 'brazoC' | 'antebrazoC' | 'brazoL' | 'antebrazoL'
  | 'musloC' | 'piernaC' | 'musloL' | 'piernaL';

/** Los grupos del lado lejano van un tono más oscuros. */
export const LEJOS: ReadonlySet<Grupo> = new Set(['brazoL', 'antebrazoL', 'musloL', 'piernaL']);

export type Material =
  | 'piel' | 'pliegue' | 'tela' | 'ribete' | 'cuello' | 'tela2' | 'bolsillo' | 'calzado' | 'suela'
  | 'cinturon' | 'cintillo' | 'guante' | 'venda' | 'lazo'
  | 'pelo' | 'canas' | 'barba' | 'barbaCanas';

/** Un material, o un material con un corrimiento de tono (los pliegues de la tela: -2 la línea, +1 el filo con luz). */
export type MatRes = Material | [Material, number];

export interface Prim {
  t: 'cono' | 'eli';
  /** cono: de a a b, con radios ra y rb */
  a?: V3; b?: V3; ra?: number; rb?: number;
  /** elipsoide: centro, radios sobre la base (f, u, r) */
  c?: V3; rad?: V3; base?: Base;
  /** corte: solo la rebanada a menos de h del plano por c con normal n (el cintillo, el cinturón) */
  corte?: { c: V3; n: V3; h: number };
  mat: Material | ((p: V3) => MatRes);
  g: Grupo;
  /** para descartar rápido: caja en x e y */
  caja?: [number, number, number, number];
  zMax?: number;
  zMin?: number;
}

/** Distancia a un cono redondeado (Inigo Quilez). */
export function sdCono(p: V3, a: V3, b: V3, r1: number, r2: number): number {
  const ba = sub(b, a), l2 = dot(ba, ba);
  if (l2 < 1e-6) return Math.hypot(p[0] - a[0], p[1] - a[1], p[2] - a[2]) - Math.max(r1, r2);
  const rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pa = sub(p, a), y = dot(pa, ba), z = y - l2;
  const x = sub(mul(pa, l2), mul(ba, y)), x2 = dot(x, x), y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

/** Distancia (aproximada, la cota de Quilez) a un elipsoide con base propia. */
export function sdEli(p: V3, c: V3, r: V3, b: Base): number {
  const q = sub(p, c);
  const l: V3 = [dot(q, b.f), dot(q, b.u), dot(q, b.r)];
  const k0 = Math.hypot(l[0] / r[0], l[1] / r[1], l[2] / r[2]);
  const k1 = Math.hypot(l[0] / (r[0] * r[0]), l[1] / (r[1] * r[1]), l[2] / (r[2] * r[2]));
  return k1 < 1e-6 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
}

export function sdPrim(p: V3, q: Prim): number {
  const d = q.t === 'cono' ? sdCono(p, q.a!, q.b!, q.ra!, q.rb!) : sdEli(p, q.c!, q.rad!, q.base!);
  return q.corte ? Math.max(d, Math.abs(dot(sub(p, q.corte.c), q.corte.n)) - q.corte.h) : d;
}

/** Una base con f en una dirección dada y u lo más parecido posible a `arriba`. */
export function baseDe(f: V3, arriba: V3 = [0, 1, 0]): Base {
  const ff = norm(f);
  let r = cross(ff, arriba);
  if (Math.hypot(...r) < 1e-4) r = cross(ff, [1, 0, 0]);
  r = norm(r);
  return { f: ff, u: norm(cross(r, ff)), r };
}

const cono = (a: V3, b: V3, ra: number, rb: number, mat: Prim['mat'], g: Grupo): Prim => ({ t: 'cono', a, b, ra, rb, mat, g });
const eli = (c: V3, rad: V3, base: Base, mat: Prim['mat'], g: Grupo): Prim => ({ t: 'eli', c, rad, base, mat, g });

/** Las coordenadas de un punto en la base de la cabeza (desde su centro). */
export function enCabeza(j: Articulaciones, p: V3): V3 {
  const q = sub(p, j.cabeza), b = j.baseCabeza;
  return [dot(q, b.f), dot(q, b.u), dot(q, b.r)];
}

const frac = (x: number) => x - Math.floor(x);

/**
 * Los pliegues de la tela a lo largo de un eje: líneas en diagonal alrededor de la pierna o el torso, con el filo de
 * arriba con luz. `s` es la posición a lo largo (0 a 1), `th` el ángulo alrededor del eje, `n` cuántos pliegues.
 */
function pliegues(m: Material, s: number, th: number, n: number, tuerce = 0.22): MatRes {
  // en espiral: cada pliegue cruza la tela en diagonal, como en el gi de SF2, y se curva un poco
  const v = frac(s * n + th / Math.PI * 0.9 + tuerce * Math.sin(th * 2 + s * 4));
  return v < 0.09 ? [m, -2] : v < 0.16 ? [m, 1] : m;
}

/** Posición a lo largo de un segmento (0 a 1) y ángulo alrededor de él. */
function sobreEje(p: V3, a: V3, b: V3, ref: V3): [number, number] {
  const ab = sub(b, a), l2 = dot(ab, ab) || 1;
  const s = Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
  const bs = baseDe(ab, ref);
  const q = sub(p, add(a, mul(ab, s)));
  return [s, Math.atan2(dot(q, bs.r), dot(q, bs.u))];
}

/** Arma las piezas de un luchador en una pose ya resuelta. */
export function piezas(f: LuchadorFicha, m: Medidas, j: Articulaciones, viento = 0, ropa: Ropa = f.ropa ?? TRAJES.casual): Prim[] {
  const P: Prim[] = [];
  const s = m.grosor, k = m.H / 104, hs = m.cabeza / 13.9;
  const bc = j.basePecho, bp = j.basePelvis, bh = j.baseCabeza;
  const cin = (0.8 + 0.2 * s); // la cintura engorda menos que el resto

  // ---- el torso: caja del pecho, pectorales, dorsales, abdomen con sus cuadros, la cadera
  const enPecho = (p: V3): V3 => { const q = sub(p, j.pecho); return [dot(q, bc.f), dot(q, bc.u), dot(q, bc.r)]; };
  const torsoMat = (p: V3): MatRes => {
    const [fx, uy, rz] = enPecho(p);
    const az = Math.abs(rz);
    switch (ropa.torso) {
      case 'nada': return 'piel';
      case 'gi': {
        // el gi sin mangas, abierto en V en el pecho: la solapa es una banda más oscura en el borde
        const ancho = (uy + 10 * k) * 0.62;
        if (fx > 0.2 * k && uy > -10 * k) {
          if (az < ancho - 1.6 * k) return 'piel';
          if (az < ancho + 0.6 * k) return 'ribete';
        }
        // pliegues: diagonales hacia el cinturón, y en bolsa justo encima de él
        if (uy < -9.5 * k) return pliegues('tela', (uy + 30 * k) / (6 * k), rz * 0.4, 1, 0.5);
        return frac((uy * 0.3 + rz * 0.22 * Math.sign(fx + 0.1)) / k * 0.42) < 0.1 && fx > -2 * k ? ['tela', -2] : 'tela';
      }
      case 'kimono': {
        // el kimono corto: cruzado, con la solapa de un color claro en diagonal y un escote chico en V
        if (fx > 0.2 * k && uy > 3 * k && az < (uy - 3 * k) * 0.55) return 'piel';
        if (fx > -0.5 * k && Math.abs(rz - (uy * 0.6 - 1.5 * k)) < 1.0 * k && uy > -8 * k) return 'ribete';
        return frac((uy * 0.3 - rz * 0.18) / k * 0.45) < 0.09 ? ['tela', -2] : 'tela';
      }
      case 'franelilla':
        // la franelilla: escote redondo y los hombros afuera
        if (uy > 6.5 * k && fx > 1 * k && az < 5 * k) return 'piel';
        if (uy > 8.5 * k && az > 5.5 * k) return 'piel';
        return frac((uy * 0.25 - az * 0.12) / k * 0.5) < 0.08 ? ['tela', -2] : 'tela';
      default:
        return 'tela';
    }
  };
  P.push(eli(enBase(j.pecho, bc, -0.5 * k, 1.5 * k, 0), [6.0 * s * k, 9.4 * k, 8.2 * s * k], bc, torsoMat, 'torso'));
  for (const lado of [1, -1]) {
    P.push(eli(enBase(j.pecho, bc, 2.6 * k, 3.6 * k, lado * 3.9 * k), [3.5 * s * k, 4.0 * k, 4.7 * s * k], bc, torsoMat, 'torso'));
    P.push(eli(enBase(j.pecho, bc, -1.4 * k, 0.2 * k, lado * 7.0 * s * k), [4.2 * k, 7.6 * k, 2.6 * s * k], bc, torsoMat, 'torso'));
  }
  const abd = lerp3(j.pelvis, j.pecho, 0.45);
  P.push(eli(abd, [5.0 * s * k, 7.8 * k, 6.7 * cin * k], bc, torsoMat, 'torso'));
  for (let fila = 0; fila < 3; fila++)
    for (const lado of [1, -1])
      P.push(eli(enBase(j.pecho, bc, 4.4 * s * k - fila * 0.25 * k, (-4.6 - fila * 3.1) * k, lado * 1.75 * k), [1.7 * k, 1.6 * k, 1.75 * k], bc, torsoMat, 'torso'));
  // la cadera con lo de abajo
  const pelvisMat = (p: V3): MatRes => {
    const q = sub(p, j.pelvis);
    return pliegues('tela2', dot(q, bp.u) / (8 * k) + 0.5, dot(q, bp.r) * 0.3, ropa.piernas === 'gi' ? 2 : 1);
  };
  P.push(eli(enBase(j.pelvis, bp, 0, 0.6 * k, 0), [6.0 * k, 5.8 * k, 7.8 * cin * k], bp, pelvisMat, 'torso'));
  // trapecios: del cuello a los hombros, en pendiente
  for (const lado of ['cerca', 'lejos'] as const) {
    const tr = enBase(j.pecho, bc, -1.0 * k, 9.6 * k, (lado === 'cerca' ? 1 : -1) * 2.6 * k);
    P.push(cono(tr, j.hombro[lado], 3.6 * s * k, 3.7 * s * k, ropa.torso === 'franelilla' || ropa.torso === 'nada' ? 'piel' : torsoMat, 'torso'));
  }
  if (ropa.torso === 'polo') P.push(eli(enBase(j.cuello, bc, 0.4 * k, -0.6 * k, 0), [4.1 * k, 1.5 * k, 4.6 * k], bc, 'cuello', 'torso'));

  // ---- el cinturón, con el nudo y las dos puntas que cuelgan
  if (ropa.colores.cinturon) {
    const cc = lerp3(j.pelvis, j.pecho, 0.17);
    P.push({ ...eli(cc, [5.6 * s * k, 4 * k, 7.4 * cin * k], bp, 'cinturon', 'cinto'), corte: { c: cc, n: bp.u, h: 1.5 * k } });
    if (ropa.piernas === 'gi' || ropa.piernas === 'cargo') {
      const nudo = enBase(cc, bp, 5.4 * s * k, -0.2 * k, 1.6 * k);
      P.push(eli(nudo, [1.4 * k, 1.6 * k, 1.7 * k], bp, 'cinturon', 'cinto'));
      if (ropa.piernas === 'gi')
        for (const [i, lado] of [[0, 1], [1, -1]] as const) {
          const vaiven = Math.sin(viento + i * 0.9);
          const punta = add(nudo, add(mul(bp.f, (1.2 + 1.6 * vaiven) * k), add(mul(bp.u, -9.5 * k), mul(bp.r, (lado * 1.6 + 0.6 * vaiven) * k))));
          P.push(cono(nudo, lerp3(nudo, punta, 0.55), 1.0 * k, 1.05 * k, 'cinturon', 'cinto'));
          P.push(cono(lerp3(nudo, punta, 0.5), punta, 1.05 * k, 0.95 * k, 'cinturon', 'cinto'));
        }
    }
  }

  // ---- los brazos
  for (const lado of ['cerca', 'lejos'] as const) {
    const gB: Grupo = lado === 'cerca' ? 'brazoC' : 'brazoL', gA: Grupo = lado === 'cerca' ? 'antebrazoC' : 'antebrazoL';
    const h = j.hombro[lado], c = j.codo[lado], w = j.muñeca[lado], pu = j.puño[lado];
    const dirB = norm(sub(c, h));
    const piel: Material = 'piel';
    // el deltoides (con la manga del polo, o el hombro del gi roto)
    // en el gi la manga está arrancada: la tela tapa solo la punta del hombro, con el borde deshilachado
    const roto = (p: V3): MatRes => {
      const [sx, th] = sobreEje(p, add(h, mul(dirB, -2 * k)), c, bc.u);
      const borde = 0.2 + 0.035 * Math.sin(th * 6);
      return sx < borde - 0.04 ? 'tela' : sx < borde ? 'ribete' : 'piel';
    };
    const manga = ropa.torso === 'polo' || ropa.torso === 'kimono';
    const hombroMat: Prim['mat'] = manga ? torsoMat : ropa.torso === 'gi' ? roto : piel;
    P.push(eli(add(h, mul(dirB, 1.4 * k)), [5.0 * s * k, 5.0 * s * k, 4.8 * s * k], baseDe(dirB, bc.u), manga ? 'tela' : hombroMat, gB));
    if (manga) P.push(cono(h, lerp3(h, c, 0.5), 4.9 * s * k, 4.5 * s * k, ropa.torso === 'kimono' ? (p: V3): MatRes => (sobreEje(p, h, c, bc.u)[0] > 0.42 ? 'ribete' : 'tela') : 'tela', gB));
    P.push(cono(h, c, 3.7 * s * k, 3.0 * s * k, piel, gB));
    // el bíceps adelante y el tríceps atrás
    P.push(eli(add(lerp3(h, c, 0.58), mul(baseDe(dirB, bc.f).u, 0.7 * k)), [5.4 * k, 3.4 * s * k, 3.2 * s * k], baseDe(dirB, bc.f), piel, gB));
    P.push(eli(add(lerp3(h, c, 0.42), mul(baseDe(dirB, bc.f).u, -1.0 * k)), [5.2 * k, 3.0 * s * k, 3.0 * s * k], baseDe(dirB, bc.f), piel, gB));
    const dirA = norm(sub(w, c));
    P.push(cono(c, w, 3.4 * s * k, 2.5 * k, piel, gA));
    P.push(eli(lerp3(c, w, 0.3), [5.0 * k, 3.8 * s * k, 3.4 * s * k], baseDe(dirA, bc.u), piel, gA));
    const guante = ropa.colores.guantes;
    if (guante) P.push(cono(lerp3(c, w, 0.8), add(w, mul(dirA, 0.8 * k)), 2.95 * k, 2.9 * k, 'guante', gA));
    // el puño, con los dedos doblados
    const bPu = baseDe(dirA, [0, 1, 0]);
    const dedos = (p: V3): MatRes => {
      const q = sub(p, pu), fx = dot(q, bPu.f) / k, uy = dot(q, bPu.u) / k;
      const surco = fx > 0.4 && uy < 2.4 && frac((uy + 8) / 1.9) < 0.22;
      if (guante) return surco ? ['guante', -2] : 'guante';
      return surco ? 'pliegue' : 'piel';
    };
    const e = m.extremidad / 1.15;
    P.push(eli(pu, [4.4 * k * e, 4.0 * k * e, 3.6 * k * e], bPu, dedos, gA));
  }

  // ---- las piernas
  for (const lado of ['cerca', 'lejos'] as const) {
    const gM: Grupo = lado === 'cerca' ? 'musloC' : 'musloL', gP: Grupo = lado === 'cerca' ? 'piernaC' : 'piernaL';
    const ca = j.cadera[lado], ro = j.rodilla[lado], to = j.tobillo[lado], pt = j.punta[lado], ta = j.talon[lado];
    const pieF = norm(sub(pt, ta));
    const ejeCan = norm(sub(to, ro));
    const atras = norm(sub(mul(pieF, -1), mul(ejeCan, dot(mul(pieF, -1), ejeCan))));
    const adelante = mul(atras, -1);
    // el muslo, el cuádriceps adelante, la rodilla, la canilla y la pantorrilla (con licra, la tela pegada)
    const pielP: Prim['mat'] = ropa.piernas === 'licra' ? (p: V3): MatRes => { const [sx, th] = sobreEje(p, ca, to, [0, 0, 1]); return pliegues('tela2', sx, th, 2.5, 0.1); } : 'piel';
    P.push(cono(ca, ro, 5.6 * s * k, 3.7 * k, pielP, gM));
    P.push(eli(add(lerp3(ca, ro, 0.5), mul(adelante, 1.4 * k)), [9.5 * k, 3.6 * s * k, 3.8 * s * k], baseDe(norm(sub(ro, ca)), adelante), pielP, gM));
    P.push(cono(ro, to, 3.4 * k, 2.2 * k, pielP, gP));
    P.push(eli(add(lerp3(ro, to, 0.3), mul(atras, 1.3 * k)), [6.0 * k, 3.1 * s * k, 3.0 * s * k], baseDe(norm(sub(ro, to)), atras), pielP, gP));
    // lo de abajo
    const telaPierna = (a: V3, b: V3, n: number) => (p: V3): MatRes => { const [sx, th] = sobreEje(p, a, b, [0, 0, 1]); return pliegues('tela2', sx, th, n); };
    if (ropa.piernas === 'short') P.push(cono(ca, lerp3(ca, ro, 0.5), 6.4 * s * k, 5.8 * s * k, telaPierna(ca, ro, 1.5), gM));
    if (ropa.piernas === 'gi') {
      // el pantalón del gi: ancho y suelto, se abre un poco abajo y termina sobre el tobillo
      P.push(cono(ca, ro, 7.0 * s * k, 5.6 * s * k, telaPierna(ca, ro, 2.2), gM));
      const ruedo = lerp3(ro, to, 0.9);
      P.push(cono(ro, ruedo, 5.5 * s * k, 4.8 * k, telaPierna(ro, ruedo, 1.8), gP));
    }
    if (ropa.piernas === 'cargo') {
      const bolsa = (p: V3): MatRes => {
        const [sx, th] = sobreEje(p, ca, ro, [0, 0, 1]);
        const lat = Math.abs(Math.sin(th));
        if (sx > 0.45 && sx < 0.8 && lat > 0.75) return sx < 0.5 ? ['bolsillo', -1] : 'bolsillo';
        return pliegues('tela2', sx, th, 2);
      };
      P.push(cono(ca, ro, 6.4 * s * k, 4.8 * s * k, bolsa, gM));
      const baja = lerp3(ro, to, 0.62);
      P.push(cono(ro, baja, 4.5 * k, 4.0 * k, telaPierna(ro, baja, 2), gP));
    }
    // los pies
    const ex = m.extremidad / 1.15;
    if (ropa.pies === 'zapatillas') {
      P.push(cono(add(ta, [0, 2.3 * k * ex, 0]), add(pt, [0, 1.6 * k * ex, 0]), 2.9 * k * ex, 2.3 * k * ex, 'calzado', gP));
      P.push(cono(add(to, [0, 0.4 * k, 0]), add(lerp3(ta, pt, 0.35), [0, 2.8 * k * ex, 0]), 2.7 * k * ex, 2.8 * k * ex, 'calzado', gP));
      P.push(cono(add(ta, [0, 1.15 * k * ex, 0]), add(pt, [0, 1.0 * k * ex, 0]), 1.35 * k * ex, 1.2 * k * ex, 'suela', gP));
    } else if (ropa.pies === 'botas') {
      P.push(cono(lerp3(ro, to, 0.55), add(to, [0, 0.6 * k, 0]), 4.1 * k, 3.6 * k, (p: V3) => (frac(dot(sub(p, to), [0, 1, 0]) / (2.6 * k)) < 0.18 ? ['calzado', -1] : 'calzado'), gP));
      P.push(cono(add(ta, [0, 2.4 * k * ex, 0]), add(pt, [0, 1.8 * k * ex, 0]), 3.0 * k * ex, 2.5 * k * ex, 'calzado', gP));
      P.push(cono(add(ta, [0, 1.0 * k * ex, 0]), add(pt, [0, 0.9 * k * ex, 0]), 1.4 * k * ex, 1.3 * k * ex, 'suela', gP));
    } else {
      // descalzo, con las vendas en el tobillo
      P.push(cono(add(ta, [0, 2.0 * k * ex, 0]), add(pt, [0, 1.3 * k * ex, 0]), 2.4 * k * ex, 1.7 * k * ex, (p: V3) => {
        const sx = dot(sub(p, ta), pieF) / (m.pie || 1);
        return sx > 0.82 && frac(dot(sub(p, ta), cross(pieF, [0, 1, 0])) / (1.3 * k)) < 0.3 ? 'pliegue' : 'piel';
      }, gP));
      P.push(cono(add(to, [0, 0.2 * k, 0]), add(lerp3(ta, pt, 0.4), [0, 1.9 * k, 0]), 2.4 * k, 2.3 * k, 'piel', gP));
      if (ropa.colores.vendas) {
        const vb = add(to, mul(ejeCan, -4.2 * k));
        P.push(cono(vb, add(to, [0, 0.4 * k, 0]), 2.9 * k, 2.8 * k, (p: V3) => (frac(dot(sub(p, to), norm(add(ejeCan, mul(pieF, 0.4)))) / (1.4 * k)) < 0.25 ? ['venda', -1] : 'venda'), gP));
      }
    }
  }

  // ---- la cabeza
  const H = j.cabeza;
  const niña = f.cabeza.forma === 'niña', cola = f.cabeza.peinado === 'cola';
  const matCabeza = (p: V3): Material => {
    const [x, y, z] = enCabeza(j, p).map((v) => v / hs) as V3;
    const az = Math.abs(z);
    if (cola) {
      // el flequillo hasta las cejas con puntas, mechones a los lados hasta la mejilla, y la nuca
      const fleco = 1.2 + 0.7 * Math.abs(Math.sin(z * 1.7));
      const pelo = x > 2.2 ? y > fleco : x > -0.8 ? y > (az > 3.9 ? -2.6 : 0.4) : y > -3.6;
      return pelo ? 'pelo' : 'piel';
    }
    const entr = f.cabeza.entradas;
    // el pelo: la frente con entradas, los lados sobre la oreja y la nuca
    const frente = 4.1 + entr * 1.4 * Math.min(1, Math.max(0, (az - 1.2) / 2.6));
    const pelo = x > 1.6 ? y > frente - (x > 3.6 ? 0 : 0.6) : x > -1.2 ? y > 1.3 : y > -2.6;
    if (pelo) return az > 3.6 && y < 2.8 && y > -1.6 && x > -2.6 ? 'canas' : 'pelo';
    if (f.cabeza.barba > 0) {
      const bigote = x > 3.4 && y < -1.2 && y > -2.4;
      const patilla = x > -1.0 && x < 1.8 && y > -1.4 && y < 1.4 && az > 3.6;
      const mandibula = y < -1.5 && x > -1.2;
      if (bigote || patilla || mandibula) return y < -4.1 && x > 2.2 ? 'barbaCanas' : 'barba';
    }
    return 'piel';
  };
  const skull = enBase(H, bh, -0.3 * hs, 0.9 * hs, 0), skullR: V3 = niña ? [6.0 * hs, 6.4 * hs, 5.5 * hs] : [5.9 * hs, 6.5 * hs, 5.0 * hs];
  P.push(eli(skull, skullR, bh, matCabeza, 'cabeza'));
  if (niña) {
    // la cara redonda de anime: cachetes llenos, barbilla chica, naricita
    P.push(eli(enBase(H, bh, 2.2 * hs, -2.2 * hs, 0), [3.8 * hs, 3.3 * hs, 4.3 * hs], bh, matCabeza, 'cabeza'));
    P.push(eli(enBase(H, bh, 3.4 * hs, -3.9 * hs, 0), [1.9 * hs, 1.4 * hs, 2.1 * hs], bh, matCabeza, 'cabeza'));
    P.push(cono(enBase(H, bh, 5.3 * hs, -0.6 * hs, 0), enBase(H, bh, 6.0 * hs, -1.6 * hs, 0), 0.6 * hs, 0.7 * hs, 'piel', 'cabeza'));
  } else {
    // la mandíbula ancha de peleador
    P.push(eli(enBase(H, bh, 2.0 * hs, -2.6 * hs, 0), [4.1 * hs, 3.8 * hs, 4.3 * hs], bh, matCabeza, 'cabeza'));
    P.push(eli(enBase(H, bh, 3.7 * hs, -4.6 * hs, 0), [2.2 * hs, 1.9 * hs, 2.5 * hs], bh, matCabeza, 'cabeza'));
    P.push(eli(enBase(H, bh, 4.7 * hs, 1.5 * hs, 0), [1.4 * hs, 1.2 * hs, 3.6 * hs], bh, 'piel', 'cabeza'));
    P.push(cono(enBase(H, bh, 4.9 * hs, 0.6 * hs, 0), enBase(H, bh, 6.3 * hs, -1.4 * hs, 0), 0.9 * hs, 1.05 * hs, 'piel', 'cabeza'));
  }
  P.push(eli(enBase(H, bh, -0.6 * hs, -0.3 * hs, (niña ? 5.6 : 5.3) * hs), [1.5 * hs, 2.3 * hs, 1.1 * hs], bh, 'piel', 'cabeza'));
  P.push(eli(enBase(H, bh, -0.7 * hs, (2.4 + f.cabeza.volumen) * hs, 0), [6.1 * hs, (4.4 + f.cabeza.volumen * 1.2) * hs, (niña ? 5.8 : 5.1) * hs], bh, matCabeza, 'cabeza'));
  // el cuello
  P.push(cono(enBase(j.cuello, bc, 0, -1 * k, 0), enBase(H, bh, -0.2 * hs, -3.4 * hs, 0), (niña ? 2.6 : 3.9 * s) * k, (niña ? 2.4 : 3.3) * k, 'piel', 'cabeza'));

  // ---- la cola de caballo alta, con el lazo, que se mece con el viento
  if (cola) {
    const raiz = enBase(H, bh, -5.9 * hs, 4.4 * hs, 0);
    const v = viento;
    const p1 = enBase(raiz, bh, (-4.2 - 0.6 * Math.sin(v)) * hs, (-1.0 + 0.8 * Math.sin(v + 0.6)) * hs, 0.3 * Math.sin(v) * hs);
    const p2 = enBase(raiz, bh, (-7.0 - 1.4 * Math.sin(v + 0.8)) * hs, (-5.0 + 1.4 * Math.sin(v + 1.4)) * hs, 0.5 * Math.sin(v + 0.5) * hs);
    const p3 = enBase(raiz, bh, (-7.4 - 2.4 * Math.sin(v + 1.6)) * hs, (-10.0 + 1.8 * Math.sin(v + 2.2)) * hs, 0.6 * Math.sin(v + 1) * hs);
    const mechon = (a: V3, b: V3) => (p: V3): MatRes => { const [sx, th] = sobreEje(p, a, b, bh.r); return frac(sx * 2 + th * 0.35) < 0.12 ? ['pelo', -1] : 'pelo'; };
    P.push(cono(raiz, p1, 2.2 * hs, 2.8 * hs, mechon(raiz, p1), 'cola'));
    P.push(cono(p1, p2, 2.8 * hs, 2.2 * hs, mechon(p1, p2), 'cola'));
    P.push(cono(p2, p3, 2.2 * hs, 0.7 * hs, mechon(p2, p3), 'cola'));
    if (f.colores.lazo) {
      P.push(eli(raiz, [1.2 * hs, 1.3 * hs, 1.6 * hs], bh, 'lazo', 'cola'));
      P.push(eli(enBase(raiz, bh, 0.4 * hs, 2.0 * hs, 0), [1.4 * hs, 1.9 * hs, 1.0 * hs], baseDe(add(bh.u, mul(bh.f, 0.4)), bh.r), 'lazo', 'cola'));
      P.push(eli(enBase(raiz, bh, -0.6 * hs, -1.9 * hs, 0), [1.3 * hs, 1.8 * hs, 1.0 * hs], baseDe(add(bh.u, mul(bh.f, -0.5)), bh.r), 'lazo', 'cola'));
    }
  }

  // ---- el cintillo, con el nudo atrás y las dos colas al viento
  if (ropa.colores.cintillo) {
    const cy = enBase(H, bh, -0.3 * hs, 3.9 * hs, 0);
    P.push({ ...eli(skull, [skullR[0] + 0.9 * hs, skullR[1] + 0.9 * hs, skullR[2] + 0.9 * hs], bh, 'cintillo', 'cintillo'), corte: { c: cy, n: norm(add(bh.u, mul(bh.f, -0.3))), h: 0.95 * hs } });
    const nudo = enBase(H, bh, -6.4 * hs, 4.0 * hs, 0);
    P.push(eli(nudo, [1.3 * hs, 1.5 * hs, 1.4 * hs], bh, 'cintillo', 'cintillo'));
    for (const [i, lado] of [[0, 1], [1, -1]] as const) {
      const a = viento * 1.3 + i * 1.1;
      const mitad = enBase(nudo, bh, (-4.5 - 0.8 * Math.sin(a)) * hs, (-2.2 + 1.2 * Math.sin(a + 0.7)) * hs, lado * 1.2 * hs);
      const punta = enBase(nudo, bh, (-8.5 - 1.2 * Math.sin(a + 1.2)) * hs, (-4.8 + 2.2 * Math.sin(a + 2.0) - i * 1.2) * hs, lado * 1.8 * hs);
      P.push(cono(nudo, mitad, 0.95 * hs, 0.9 * hs, 'cintillo', 'cintillo'));
      P.push(cono(mitad, punta, 0.9 * hs, 0.7 * hs, 'cintillo', 'cintillo'));
    }
  }

  for (const q of P) cajaDe(q);
  return P;
}

function cajaDe(q: Prim) {
  if (q.t === 'cono') {
    const R = Math.max(q.ra!, q.rb!) + 1;
    q.caja = [Math.min(q.a![0], q.b![0]) - R, Math.max(q.a![0], q.b![0]) + R, Math.min(q.a![1], q.b![1]) - R, Math.max(q.a![1], q.b![1]) + R];
    q.zMax = Math.max(q.a![2], q.b![2]) + R;
    q.zMin = Math.min(q.a![2], q.b![2]) - R;
  } else {
    const R = Math.max(...q.rad!) + 1;
    q.caja = [q.c![0] - R, q.c![0] + R, q.c![1] - R, q.c![1] + R];
    q.zMax = q.c![2] + R;
    q.zMin = q.c![2] - R;
  }
}
