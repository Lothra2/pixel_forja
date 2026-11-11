import { esfera, palo, poliedro, masa, hueso, distMasa, type Pieza, type V3, type Comp } from './render';
import type { Cuerpo, Equipo, Esqueleto } from './cuerpo';

/**
 * El vestuario que dice el oficio, a escala de juego (el héroe mide ~75 px): lo que se suma sobre la ropa base para
 * que cada clase se lea de un ARPG gótico y no moderna.
 * - faja: la faja ancha de tela del monje, con el nudo al costado y las puntas colgando;
 * - cruce: la solapa de la túnica cruzada, del hombro a la cadera contraria, con la sombra de la tela de abajo;
 * - rosario: cuentas de oración alrededor del cuello que caen sobre el pecho, con una cuenta grande abajo;
 * - estola: dos bandas que bajan de la nuca por el pecho y cuelgan por delante, con runas del color de acento;
 * - libro: un libro de tapas de cuero colgado del cinto a la izquierda; fanal: un farol chico a la derecha;
 * - delantal: el delantal de cuero del alquimista, con su peto, las correas al cuello y el faldón que pasa por
 *   delante de las piernas al andar;
 * - frascos: tres frascos al cinto, uno con la poción que brilla;
 * - carcaj: a la espalda, cruzado, con las flechas asomando por arriba del hombro;
 * - brazal_arco: el brazal de cuero en el antebrazo del arco, con sus cordones;
 * - mangas: mangas largas de otra tela con el puño marcado (la camisa de lino bajo el jubón, las mangas de la arcanista);
 * - ataduras: el pantalón ancho atado sobre el tobillo;
 * - gafas: gafas de latón sobre la frente, con su correa.
 * Todo mate salvo los metales viejos; el color fuerte solo en un acento chico (runas, poción, fanal).
 */
export type TipoPrenda = 'faja' | 'cruce' | 'rosario' | 'estola' | 'libro' | 'fanal' | 'delantal' | 'frascos' | 'carcaj' | 'brazal_arco' | 'mangas' | 'ataduras' | 'gafas';
export interface Prenda { tipo: TipoPrenda; mat: string; mat2?: string }

/** Lo que el cuerpo le pasa al vestuario: el esqueleto, la masa del torso (para apoyar sobre ella) y sus partes. */
export interface CtxVestuario {
  e: Esqueleto; cu: Cuerpo; eq: Equipo; torso?: Pieza;
  /** la falda larga (vestido o túnica larga): lo que cuelga del cinto va por fuera de ella */
  falda?: Pieza;
  /** el tamaño de la cabeza (unidades de cabeza) */
  H: number;
  /** las partes del cuerpo (anatomía del juego) en una tela, con un grosor */
  partes: (que: ('brazo' | 'antebrazo')[], grosor: number, mat: string) => Comp[];
}

type Fn = (fw: number, rt: number, up: number) => V3;
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const nor = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mez = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** El punto de la superficie de `m` que se ve desde `q` mirando en -d (llega de afuera), separado `holg` hacia afuera. */
function apoyar(m: Pieza | undefined, q: V3, d: V3, holg = 0): V3 {
  if (!m) return add(q, d, holg);
  let r = 12;
  if (distMasa(m, add(q, d, r)) < 0) return add(q, d, r + holg);
  for (; r > -6; r -= 0.4) if (distMasa(m, add(q, d, r)) < 0) break;
  if (r <= -6) return add(q, d, holg);
  let lo = r, hi = r + 0.4;
  for (let k = 0; k < 6; k++) { const mm = (lo + hi) / 2; if (distMasa(m, add(q, d, mm)) < 0) lo = mm; else hi = mm; }
  return add(q, d, lo + holg);
}
/** Una tira de tela (prisma) por una lista de puntos, de ancho `w` en la dirección `lado` y grueso `g` hacia `fuera`. */
function tira(pts: V3[], lado: V3[], fuera: V3[], w: number, g: number, mat: string, tono = 0): Pieza[] {
  const ps: Pieza[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const q: V3[] = [];
    for (const j of [i, i + 1]) for (const s of [-1, 1]) { const b = add(pts[j], lado[j], (s * w) / 2); q.push(b, add(b, fuera[j], -g)); }
    ps.push(poliedro(q, { mat, tono }));
  }
  return ps;
}
/** Un bloque orientado (centro, ejes y medias medidas). */
function bloque(c: V3, ex: V3, ey: V3, ez: V3, hx: number, hy: number, hz: number, mat: string, tono = 0): Pieza {
  const q: V3[] = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const k of [-1, 1]) q.push(add(add(add(c, ex, a * hx), ey, b * hy), ez, k * hz));
  return poliedro(q, { mat, tono });
}
/**
 * Dónde cae a plomo una tela que cuelga de `arriba` un largo `caeZ`, adelantada lo justo para pasar por delante de los
 * muslos, rodillas y canillas (la pierna que avanza al andar no la atraviesa).
 */
function colgar(e: Esqueleto, arriba: V3, caeZ: number, fH: V3): V3 {
  const { S, A } = e;
  let adel = 0;
  for (const p of e.piernas) for (const [q, r] of [[mez(p.cad, p.rod, 0.5), 2.9 * A], [p.rod, 2.7 * A], [mez(p.rod, p.tob, 0.4), 2.4 * A]] as [V3, number][]) {
    const t = (arriba[2] - q[2]) / caeZ;
    if (t < 0.15 || t > 1.15) continue;
    adel = Math.max(adel, (dot(sub(q, arriba), fH) + r + 0.6) / Math.min(1, t));
  }
  return add(add(arriba, [0, 0, -caeZ]), fH, Math.min(adel, 14 * S));
}

/** Si `q` quedó adentro de la falda, lo saca hasta su superficie (más `holg`) en la dirección horizontal `d`. */
function porFuera(c: CtxVestuario, q: V3, d: V3, holg: number): V3 {
  if (!c.falda || distMasa(c.falda, q) > holg) return q;
  const s = apoyar(c.falda, q, d, holg);
  return dot(sub(s, q), d) > 0 ? s : q;
}

export function prendas(c: CtxVestuario, lista: Prenda[]): Pieza[] {
  const ps: Pieza[] = [];
  for (const p of lista) ps.push(...prenda(c, p));
  return ps;
}

function prenda(c: CtxVestuario, p: Prenda): Pieza[] {
  const { e, cu } = c, { S, A, T, zc } = e;
  const Pv = e.Pv ?? e.W, PP: Fn = (fw, rt, up) => Pv(fw * A, rt * A, zc + up * S);
  const g = (cu.grasa ?? 0) * 1.5, ps: Pieza[] = [];
  const fT = e.ejesT[0], lT = e.ejesT[1], uT = e.ejesT[2];
  const fH = nor([fT[0], fT[1], 0]);
  const rF = 4.75 + g, rB = 4.6 + g, ry = 5.15 + g * 0.6;
  switch (p.tipo) {
    case 'faja': {
      // la faja ancha: más alta que un cinto, apoyada por fuera del torso (y de la falda de la túnica), con dos
      // pliegues oscuros a lo largo, el nudo al costado y las puntas
      const N = 12, r = 0.45;
      const radio = (a: number, up: number) => {
        const d: V3 = nor(sub(PP(Math.cos(a), Math.sin(a), up), PP(0, 0, up)));
        const q = apoyar(c.torso, PP(0, 0, up), d, 0), rr = dot(sub(q, PP(0, 0, up)), d) / A;
        return Math.max(rr, Math.hypot(Math.cos(a) * (Math.cos(a) >= 0 ? rF : rB), Math.sin(a) * ry)) + r;
      };
      const R = Array.from({ length: N }, (_, k) => { const a = ((k + 0.5) / N) * Math.PI * 2; return Math.max(radio(a, -1.2), radio(a, 1.0), radio(a, 3.2)); });
      const aro = (up: number, mas: number) => R.map((rr, k) => { const a = ((k + 0.5) / N) * Math.PI * 2; return PP(Math.cos(a) * (rr + mas), Math.sin(a) * (rr + mas), up); });
      ps.push(poliedro([...aro(-1.6, 0), ...aro(3.6, 0.1)], { mat: p.mat }));
      for (const u of [-0.2, 1.9]) ps.push(poliedro([...aro(u, 0.2), ...aro(u + 0.35, 0.2)], { mat: p.mat, tono: -0.22 }));
      const rA = R[Math.round(((-0.75 + Math.PI * 2) / (Math.PI * 2)) * N - 0.5) % N];
      // el nudo a la izquierda del frente y dos puntas que caen (una más larga), un poco abiertas
      const a = -0.75, n = PP((rA + 0.8) * Math.cos(a), (rA + 0.8) * Math.sin(a), 1.0);
      ps.push(masa([hueso(PP(rA * Math.cos(a), rA * Math.sin(a), 1.0), n, 1.3 * S, 1.0 * S, { mat: p.mat, tono: 0.05 })], { mat: p.mat, suave: 0.3 * S, tono: 0.05 }));
      for (const [da, l] of [[-0.12, 6.5], [0.14, 5.0]] as const) {
        const b0 = PP((rA + 0.6) * Math.cos(a + da), (rA + 0.6) * Math.sin(a + da), 0.2);
        const b1 = add(add(b0, [0, 0, -l * S]), fH, 0.6 * S);
        ps.push(...tira([b0, mez(b0, b1, 0.5), b1], [0, 1, 2].map(() => nor(cruz([0, 0, 1], fH))), [0, 1, 2].map(() => fH), 1.3 * A, 0.45, p.mat, da < 0 ? 0 : -0.1));
      }
      break;
    }
    case 'cruce': {
      // la solapa: del hombro izquierdo (junto al cuello) a la cadera derecha, apoyada sobre el pecho; al lado, la
      // sombra de la tela que queda debajo
      const pts: V3[] = [], lados: V3[] = [], fuera: V3[] = [];
      for (let i = 0; i <= 5; i++) {
        const t = i / 5, rt = (2.2 - 5.4 * t) * A, up = e.hombroZ + 0.6 * S + (zc + 2.4 * S - e.hombroZ - 0.6 * S) * t;
        const q = T(-1 * A, rt, up), s = apoyar(c.torso, q, fT, 0.15);
        pts.push(s); fuera.push(fT);
      }
      for (let i = 0; i < pts.length; i++) { const d = nor(sub(pts[Math.min(pts.length - 1, i + 1)], pts[Math.max(0, i - 1)])); lados.push(nor(cruz(fT, d))); }
      ps.push(...tira(pts, lados, fuera, 1.8 * A, 0.4, p.mat, 0.12));
      ps.push(...tira(pts.map((q, i) => add(add(q, lados[i], -1.25 * A), fT, -0.12)), lados, fuera, 0.7 * A, 0.3, p.mat2 ?? p.mat, -0.5));
      break;
    }
    case 'rosario': {
      // las cuentas: un lazo del cuello que baja hasta el pecho, apoyado sobre el torso, y una cuenta grande abajo
      const N = 15;
      for (let i = 0; i <= N; i++) {
        const t = i / N, a = Math.PI * t, rt = Math.cos(a) * 2.9 * A, up = e.hombroZ + 0.4 * S - Math.sin(a) * (e.hombroZ - zc - 9.5 * S);
        const q = apoyar(c.torso, T(-1 * A, rt, up), fT, 0.42 * S);
        ps.push(esfera(...q, 0.5 * S, { mat: p.mat, tono: i % 2 ? -0.06 : 0.06 }));
      }
      const fin = apoyar(c.torso, T(-1 * A, 0, zc + 8.0 * S), fT, 0.7 * S);
      ps.push(esfera(...fin, 0.85 * S, { mat: p.mat2 ?? p.mat, tono: 0.1 }));
      ps.push(palo(fin, add(apoyar(c.torso, T(-1 * A, 0, zc + 5.6 * S), fT, 0.5 * S), [0, 0, 0]), 0.3 * S, { mat: p.mat2 ?? p.mat, r1: 0.12 * S }));
      break;
    }
    case 'estola': {
      // dos bandas que bajan de la nuca por el pecho hasta el cinto y de ahí cuelgan, con tres runas cada una
      for (const s of [1, -1]) {
        const pts: V3[] = [], fuera: V3[] = [];
        for (let i = 0; i <= 4; i++) {
          const t = i / 4, rt = s * (2.6 - 0.6 * t) * A, up = e.hombroZ + 1.0 * S + (zc + 1.5 * S - e.hombroZ - 1.0 * S) * t;
          pts.push(apoyar(c.torso, T(-1 * A, rt, up), fT, 0.2)); fuera.push(fT);
        }
        // lo que cuelga: a plomo desde el cinto, por delante de las piernas
        const arriba = pts[pts.length - 1], abajo0 = colgar(e, arriba, 9 * S, fH);
        const medio = porFuera(c, mez(arriba, abajo0, 0.5), fH, 0.35), abajo = porFuera(c, abajo0, fH, 0.35);
        pts.push(medio, abajo); fuera.push(fH, fH);
        const lados = pts.map((_, i) => nor(cruz(fuera[i], nor(sub(pts[Math.min(pts.length - 1, i + 1)], pts[Math.max(0, i - 1)])))));
        ps.push(...tira(pts, lados, fuera, 1.5 * A, 0.4, p.mat, 0.04));
        // el ruedo de la banda, más oscuro, y las runas
        ps.push(...tira([mez(pts[pts.length - 2], abajo, 0.85), abajo], [lados[lados.length - 1], lados[lados.length - 1]], [fH, fH], 1.6 * A, 0.5, p.mat, -0.3));
        for (const i of [2, 4, 5]) ps.push(esfera(...add(mez(pts[i], pts[Math.min(pts.length - 1, i + 1)], 0.4), fuera[i], 0.18), 0.42 * S, { mat: p.mat2 ?? 'cu_oro' }));
      }
      break;
    }
    case 'libro': {
      // el libro: tapas de cuero y el canto de las hojas, colgado del cinto a la izquierda por una correa
      const a = -1.75, base0 = PP((rF + 1.3) * Math.cos(a), (ry + 1.3) * Math.sin(a), -3.4), ex = nor(sub(base0, Pv(0, 0, base0[2]))), ez: V3 = [0, 0, 1], ey = nor(cruz(ez, ex));
      const base = porFuera(c, porFuera(c, add(base0, ez, 3.4 * S), ex, 0.9 * A), ex, 0.9 * A), b2 = porFuera(c, base0, ex, 0.9 * A);
      void b2;
      // (base sube y baja con la falda: el centro del libro queda por fuera de la tela a su altura)
      const cen = porFuera(c, add(base, ez, -1.6 * S), ex, 1.0 * A);
      ps.push(bloque(cen, ex, ey, ez, 0.75 * A, 1.4 * A, 1.8 * S, p.mat));
      ps.push(bloque(add(cen, ey, 0.15 * A), ex, ey, ez, 0.55 * A, 1.35 * A, 1.62 * S, p.mat2 ?? 'cu_lino', 0.1));
      ps.push(palo(PP(rF * Math.cos(a), ry * Math.sin(a), 0.8), add(cen, ez, 1.8 * S), 0.3 * S, { mat: 'cu_cuero_negro' }));
      break;
    }
    case 'fanal': {
      // el farol: tapa y base de metal viejo, cuatro varillas y la luz adentro (el único brillo)
      const a = 1.6, top0 = PP((rF + 1.4) * Math.cos(a), (ry + 1.4) * Math.sin(a), -1.2), ez: V3 = [0, 0, 1], dr = nor(sub(top0, Pv(0, 0, top0[2])));
      const top = add(porFuera(c, add(top0, ez, -2.0 * S), dr, 1.2 * A), ez, 2.0 * S);
      ps.push(palo(PP(rF * Math.cos(a), ry * Math.sin(a), 0.8), top, 0.25 * S, { mat: p.mat }));
      ps.push(palo(top, add(top, ez, -0.6 * S), 0.95 * S, { mat: p.mat, r1: 0.7 * S }));
      const fondo = add(top, ez, -3.4 * S);
      ps.push(palo(add(fondo, ez, 0.4 * S), fondo, 0.85 * S, { mat: p.mat }));
      for (let k = 0; k < 4; k++) { const d: V3 = [Math.cos(k * 1.57 + 0.6) * 0.75 * S, Math.sin(k * 1.57 + 0.6) * 0.75 * S, 0]; ps.push(palo(add(add(top, ez, -0.6 * S), d), add(add(fondo, ez, 0.4 * S), d), 0.14 * S, { mat: p.mat })); }
      ps.push(esfera(...add(top, ez, -2.0 * S), 0.6 * S, { mat: p.mat2 ?? 'fuego' }));
      break;
    }
    case 'delantal': {
      // el peto sobre el pecho, apoyado en el torso
      const lado = nor(cruz([0, 0, 1], fT)), filaP = (up: number, w: number): [V3, V3] => [apoyar(c.torso, T(-1 * A, w * A, up), fT, 0.25), apoyar(c.torso, T(-1 * A, -w * A, up), fT, 0.25)];
      const ups = [e.hombroZ - 3.2 * S, zc + 7 * S, zc + 2 * S];
      const filas = ups.map((u, i) => filaP(u, [2.4, 3.0, 3.6][i]));
      for (let i = 0; i + 1 < filas.length; i++) {
        const [a0, b0] = filas[i], [a1, b1] = filas[i + 1];
        ps.push(poliedro([a0, b0, a1, b1, add(a0, fT, -0.45), add(b0, fT, -0.45), add(a1, fT, -0.45), add(b1, fT, -0.45)], { mat: p.mat, tono: i ? -0.03 : 0.04 }));
      }
      // las correas: de las puntas del peto al cuello y por detrás
      for (const q of filas[0]) ps.push(palo(q, T(-1.2 * A, dot(sub(q, T(0, 0, e.hombroZ)), lT) > 0 ? 1.6 * A : -1.6 * A, e.hombroZ + 1.6 * S), 0.32 * S, { mat: p.mat2 ?? 'cu_cuero_negro' }));
      // el faldón: cuelga a plomo del cinto y pasa por delante de las piernas; un bolsillo con su costura
      const arriba = apoyar(c.torso, T(-1 * A, 0, zc + 0.5 * S), fT, 0.6), caeZ = 12 * S, abajo = colgar(e, arriba, caeZ, fH);
      const lH = nor(cruz([0, 0, 1], fH)), haciaFuera = nor(cruz(nor(sub(abajo, arriba)), lH));
      const pts = [arriba, mez(arriba, abajo, 0.5), abajo];
      ps.push(...tira(pts, pts.map(() => lH), pts.map(() => haciaFuera), 7.4 * A, 0.5, p.mat, 0));
      ps.push(...tira([mez(arriba, abajo, 0.92), abajo], [lH, lH], [haciaFuera, haciaFuera], 7.6 * A, 0.6, p.mat, -0.28));
      ps.push(...tira([add(mez(arriba, abajo, 0.3), lH, -1.8 * A), add(mez(arriba, abajo, 0.55), lH, -1.8 * A)], [lH, lH], [haciaFuera, haciaFuera].map((v) => v), 2.6 * A, 0.7, p.mat, -0.12));
      void lado;
      break;
    }
    case 'frascos': {
      // tres frascos colgando del cinto, a la derecha del frente: el del medio con la poción que brilla
      [0.55, 0.95, 1.35].forEach((a, i) => {
        const top0 = PP((rF + 0.9) * Math.cos(a), (ry + 0.9) * Math.sin(a), 0.3), ez: V3 = [0, 0, 1], dr = nor(sub(top0, Pv(0, 0, top0[2])));
        const top = add(porFuera(c, add(top0, ez, -1.4 * S), dr, 0.8 * A), ez, 1.4 * S);
        const bot = add(top, ez, -(2.4 - (i % 2) * 0.5) * S);
        ps.push(palo(bot, add(top, ez, -0.4 * S), 0.75 * S, { mat: i === 1 ? p.mat2 ?? 'cu_vidrio' : p.mat, r1: 0.45 * S }));
        ps.push(palo(add(top, ez, -0.45 * S), add(top, ez, 0.25 * S), 0.38 * S, { mat: 'cu_cuero' }));
      });
      break;
    }
    case 'carcaj': {
      // a la espalda, cruzado de la cadera izquierda al hombro derecho; boca con borde y flechas que asoman
      const atras: V3 = [-fT[0], -fT[1], -fT[2]];
      const a0 = apoyar(c.torso, T(1 * A, -2.4 * A, zc + 3 * S), atras, 1.5 * A), a1 = apoyar(c.torso, T(1 * A, 2.6 * A, e.hombroZ + 0.5 * S), atras, 1.6 * A);
      const d = nor(sub(a1, a0)), boca = add(a1, d, 3 * S);
      ps.push(palo(a0, boca, 1.35 * A, { mat: p.mat, r1: 1.5 * A }));
      ps.push(palo(add(boca, d, -0.7 * S), add(boca, d, 0.1 * S), 1.7 * A, { mat: p.mat2 ?? 'cu_cuero_negro' }));
      ps.push(palo(add(a0, d, -0.2 * S), add(a0, d, 0.6 * S), 1.55 * A, { mat: p.mat2 ?? 'cu_cuero_negro' }));
      const l1 = nor(cruz(d, fT)), l2 = cruz(d, l1);
      for (let k = 0; k < 5; k++) {
        const o = add(add(boca, l1, Math.cos(k * 1.3) * 0.7 * A), l2, Math.sin(k * 1.3) * 0.7 * A), pt = add(o, d, (2.6 + (k % 3) * 0.5) * S);
        ps.push(palo(add(o, d, -0.5 * S), pt, 0.16 * S, { mat: 'madera' }));
        ps.push(poliedro([add(pt, d, -1.6 * S), pt, add(add(pt, d, -1.2 * S), l1, 0.55 * S), add(add(pt, d, -1.2 * S), l1, -0.55 * S)], { mat: 'cu_pluma', tono: -0.25 + (k % 2) * 0.08 }));
      }
      break;
    }
    case 'brazal_arco': {
      // el brazal del brazo del arco (el que empuña): una vaina de cuero del codo a la muñeca, con dos cordones
      for (const b of e.brazos) {
        if (b.s <= 0) continue;
        const a = mez(b.codo, b.mun, 0.28), z = mez(b.codo, b.mun, 0.9);
        ps.push(masa([hueso(a, z, 2.15 * A + 0.35, 1.8 * A + 0.35, { mat: p.mat })], { mat: p.mat }));
        for (const t of [0.42, 0.72]) ps.push(masa([hueso(mez(b.codo, b.mun, t - 0.03), mez(b.codo, b.mun, t + 0.03), 2.1 * A + 0.55, 2.0 * A + 0.55, { mat: p.mat2 ?? 'cu_cuero_negro' })], { mat: p.mat2 ?? 'cu_cuero_negro' }));
      }
      break;
    }
    case 'mangas': {
      // mangas largas de otra tela y el puño marcado (más ancho y de otro valor)
      ps.push(masa(c.partes(['brazo', 'antebrazo'], 0.5, p.mat), { mat: p.mat, suave: 1.2 }));
      for (const b of e.brazos) ps.push(masa([hueso(mez(b.codo, b.mun, 0.8), mez(b.codo, b.mun, 0.97), 1.85 * A + 0.75, 1.95 * A + 0.8, { mat: p.mat2 ?? p.mat, tono: p.mat2 ? 0 : -0.2 })], { mat: p.mat2 ?? p.mat, tono: p.mat2 ? 0 : -0.2 }));
      break;
    }
    case 'ataduras': {
      // el pantalón ancho atado arriba del tobillo: dos vueltas de cinta
      for (const pi of e.piernas) for (const t of [0.7, 0.8]) ps.push(masa([hueso(mez(pi.rod, pi.tob, t - 0.035), mez(pi.rod, pi.tob, t + 0.035), 2.0 * A + 0.85, 1.95 * A + 0.85, { mat: p.mat, tono: t > 0.75 ? -0.08 : 0.04 })], { mat: p.mat }));
      break;
    }
    case 'gafas': {
      // gafas de latón subidas a la frente, con la correa de cuero alrededor de la cabeza
      const H = c.H, cz = e.cz, cab = e.cab, P = (fw: number, rt: number, up: number) => cab(fw * H, rt * H, cz + up * H);
      const N = 10, aro: V3[] = [];
      for (let k = 0; k < N; k++) { const a = (k / N) * Math.PI * 2; aro.push(P(Math.cos(a) * 4.35 - 0.2, Math.sin(a) * 3.9, 2.35 + Math.cos(a) * 0.4)); }
      for (let k = 0; k < N; k++) ps.push(palo(aro[k], aro[(k + 1) % N], 0.32 * H, { mat: p.mat2 ?? 'cu_cuero_negro' }));
      for (const s of [1, -1]) {
        const a = P(3.7, s * 1.35, 2.45), b = P(4.45, s * 1.35, 2.75);
        ps.push(palo(a, b, 0.85 * H, { mat: p.mat }));
        ps.push(esfera(...P(4.45, s * 1.35, 2.75), 0.55 * H, { mat: 'cu_vidrio', tono: 0.15 }));
      }
      break;
    }
  }
  void uT;
  return ps;
}
