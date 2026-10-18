import { Body, along } from '../boss/build';
import { type V3, type M3, add, sub, mul, norm, len, cross } from '../boss/sdf';
import type { Base } from '../luchador/esqueleto';
import type { EstiloDef, Medidas } from './estilo';
import type { Esqueleto, PoseEsq, Lado } from './esqueleto';

/**
 * El cuerpo de Forja 2: piezas SDF (las de los jefes) armadas sobre el esqueleto común. Dentro de cada grupo la unión es
 * suave (el músculo se funde con el hueso de al lado); entre grupos es dura (un brazo pasa delante del pecho con su
 * borde). Los grosores salen del estilo y los materiales del vestuario: un cuerpo nuevo es un JSON, no código.
 */
export interface Vestuario {
  id: string;
  torso: string; pechoAbierto?: string; hombros: string; brazos: string; manos: string; piernas: string; pies: string;
  /** cuánto más ancho el pantalón que la pierna, y hasta dónde llega (fracción de la canilla) */
  pantalonHolgado?: number; pantalonLargo?: number;
  cinturon?: { mat: string; ancho: number; colas: number };
  vendas?: { mat: string; manos: boolean; pies: boolean };
  cinta?: { mat: string; colas: number };
}

/** Los grupos: dentro de uno la unión es suave. */
export const G = {
  torso: 1, cinturon: 2, brazoCerca: 3, brazoLejos: 4, manoCerca: 5, manoLejos: 6,
  piernaCerca: 7, piernaLejos: 8, pieCerca: 9, pieLejos: 10, cinta: 11, colaCinturon: 12,
} as const;

/** Partes del cuerpo por grupo (para las cajas que reciben del contrato de pelea). */
export const ZONA: Record<number, 'cuerpo' | 'brazo' | 'piernas'> = {
  [G.torso]: 'cuerpo', [G.cinturon]: 'cuerpo', [G.colaCinturon]: 'cuerpo', [G.cinta]: 'cuerpo',
  [G.brazoCerca]: 'brazo', [G.brazoLejos]: 'brazo', [G.manoCerca]: 'brazo', [G.manoLejos]: 'brazo',
  [G.piernaCerca]: 'piernas', [G.piernaLejos]: 'piernas', [G.pieCerca]: 'piernas', [G.pieLejos]: 'piernas',
};

/** Suavidad de la unión por grupo, en fracción de H. */
export function suavidad(m: Medidas): Record<number, number> {
  const k = (f: number) => Math.max(0.6, f * m.H);
  return {
    [G.torso]: k(0.03), [G.brazoCerca]: k(0.018), [G.brazoLejos]: k(0.018), [G.piernaCerca]: k(0.02), [G.piernaLejos]: k(0.02),
    [G.pieCerca]: k(0.01), [G.pieLejos]: k(0.01), [G.manoCerca]: k(0.01), [G.manoLejos]: k(0.01),
  };
}

/** Orientación con columnas = ejes de una base (f, u, r). */
const rotDe = (b: Base): M3 => [[b.f[0], b.u[0], b.r[0]], [b.f[1], b.u[1], b.r[1]], [b.f[2], b.u[2], b.r[2]]];
/** Orientación con el eje x a lo largo de un hueso y el y lo más cerca de `up`. */
function rotHueso(dir: V3, up: V3 = [0, 1, 0]): M3 {
  const x = norm(dir);
  let z = cross(x, up);
  if (len(z) < 1e-4) z = cross(x, [0, 0, 1]);
  z = norm(z);
  const y = cross(z, x);
  return [[x[0], y[0], z[0]], [x[1], y[1], z[1]], [x[2], y[2], z[2]]];
}

/** Movimiento secundario: hacia dónde se va la tela suelta (velocidad de su ancla, en pixeles por cuadro). */
export interface Secundario { cabeza: V3; cintura: V3 }

export function armarCuerpo(e: EstiloDef, m: Medidas, j: Esqueleto, p: PoseEsq, v: Vestuario, sec: Secundario = { cabeza: [0, 0, 0], cintura: [0, 0, 0] }): Body {
  const H = m.H, vol = e.volumen;
  const r = (f: number) => Math.max(0.55, f * H);
  const b = new Body();
  const bc = j.basePecho, bp = j.basePelvis;

  // ---------- torso ----------
  const pecho = vol.pecho, cint = vol.cintura, pel = vol.pelvis;
  b.ell(j.pecho, [r(pecho[0]), r(pecho[1]), r(pecho[2])], v.torso, G.torso, { rot: rotDe(bc) });
  const medio = along(j.pelvis, j.pecho, 0.5);
  b.ell(medio, [r(cint[0]), r(cint[1]), r(cint[2])], v.torso, G.torso, { rot: rotDe(bc) });
  b.ell(add(j.pelvis, mul(bp.u, -0.015 * H)), [r(pel[0]), r(pel[1]), r(pel[2])], v.piernas, G.torso, { rot: rotDe(bp) });
  // pecho abierto (el gi cruzado deja ver el pecho en V): una franja de piel que sale por delante, angosta abajo
  if (v.pechoAbierto) {
    const c = add(j.pecho, add(mul(bc.f, r(pecho[0]) * 0.55), mul(bc.u, 0.02 * H)));
    b.ell(c, [r(pecho[0] * 0.5), r(pecho[1] * 0.95), r(pecho[2] * 0.3)], v.pechoAbierto, G.torso, { rot: rotDe(bc) });
  }
  // cuello y trapecios
  b.cone(add(j.cuello, mul(bc.u, -0.05 * H)), add(j.cuello, mul(j.baseCabeza.u, 0.02 * H)), r(vol.cuello), r(vol.cuello * 0.9), v.pechoAbierto ?? v.torso, G.torso);
  if (vol.trapecio > 0) for (const l of ['cerca', 'lejos'] as Lado[]) b.cone(along(j.cuello, j.hombro[l], 0.1), along(j.cuello, j.hombro[l], 0.85), r(vol.trapecio), r(vol.trapecio * 0.8), v.hombros, G.torso);

  // ---------- brazos ----------
  for (const l of ['cerca', 'lejos'] as Lado[]) {
    const g = l === 'cerca' ? G.brazoCerca : G.brazoLejos, gm = l === 'cerca' ? G.manoCerca : G.manoLejos;
    const hom = j.hombro[l], codo = j.codo[l], mu = j.muñeca[l], pu = j.puño[l];
    // el hombro (deltoide) con la manga del gi, el brazo de piel
    b.ell(hom, [r(vol.hombro), r(vol.hombro * 0.95), r(vol.hombro)], v.hombros, g, { rot: rotHueso(sub(codo, hom)) });
    b.cone(hom, codo, r(vol.brazo[0]), r(vol.brazo[1]), v.brazos, g);
    if (vol.biceps > 0) {
      // el bíceps sale hacia el lado de adentro del codo
      const lado = norm(sub(along(hom, codo, 0.5), along(hom, pu, 0.5)));
      b.ell(add(along(hom, codo, 0.48), mul(lado, -0.006 * H)), [r(vol.biceps * 1.25), r(vol.biceps * 0.85), r(vol.biceps * 0.9)], v.brazos, g, { rot: rotHueso(sub(codo, hom)) });
    }
    b.cone(codo, mu, r(vol.antebrazo[0]), r(vol.antebrazo[1]), v.brazos, g);
    // la mano: puño o abierta, del tamaño del estilo (y agrandada en el impacto)
    const k = p.manos[l].escala, dir = norm(sub(pu, mu));
    const rm = r(vol.mano) * k;
    if (p.manos[l].forma === 'puno') b.ell(pu, [rm * 1.12, rm * 0.95, rm * 0.9], v.manos, gm, { rot: rotHueso(dir) });
    else b.ell(add(pu, mul(dir, rm * 0.3)), [rm * 1.3, rm * 0.95, rm * 0.5], v.manos, gm, { rot: rotHueso(dir) });
    b.cone(mu, along(mu, pu, 0.4), r(vol.antebrazo[1]) * 1.05, rm * 0.8, v.manos, gm);
  }

  // ---------- piernas ----------
  const holg = v.pantalonHolgado ?? 1, largo = v.pantalonLargo ?? 1;
  for (const l of ['cerca', 'lejos'] as Lado[]) {
    const g = l === 'cerca' ? G.piernaCerca : G.piernaLejos, gp = l === 'cerca' ? G.pieCerca : G.pieLejos;
    const cad = j.cadera[l], rod = j.rodilla[l], tob = j.tobillo[l];
    b.cone(cad, rod, r(vol.muslo[0] * holg), r(vol.muslo[1] * holg), v.piernas, g);
    const fin = along(rod, tob, largo);
    b.cone(rod, fin, r(vol.canilla[0] * holg), r(vol.canilla[1] * holg * 1.12), v.piernas, g);
    // la pierna de piel debajo del pantalón (el tobillo)
    b.cone(along(rod, tob, 0.7), tob, r(vol.canilla[1]), r(vol.canilla[1] * 0.85), v.pies, gp);
    // el pie: de talón a punta, plano abajo
    const ta = j.talon[l], pt = j.punta[l], k = p.pies[l].escala;
    const c = along(ta, pt, 0.55), d = sub(pt, ta);
    b.ell(c, [len(d) * 0.55 * k, r(vol.pie[1]) * k, r(vol.pie[0]) * k], v.pies, gp, { rot: rotHueso(d) });
    if (v.vendas?.pies) b.cone(along(tob, c, 0.05), along(tob, c, 0.55), r(vol.canilla[1] * 0.98), r(vol.pie[1] * 1.05), v.vendas.mat, gp);
  }

  // ---------- cinturón, con sus colas sueltas ----------
  if (v.cinturon) {
    const w = r(v.cinturon.ancho), cc = along(j.pelvis, j.pecho, 0.22);
    b.band({ kind: 'ell', c: cc, r: [r(cint[0]), r(cint[1]), r(cint[2])], m: transpuesta(rotDe(bc)) }, 0.012 * H, bc.u, dotp(cc, bc.u), w, v.cinturon.mat, G.cinturon);
    const nudo = add(cc, mul(bc.f, r(cint[0]) * 1.02));
    b.ell(nudo, [w * 0.9, w * 1.1, w * 1.3], v.cinturon.mat, G.cinturon);
    colas(b, nudo, bc, v.cinturon.colas * H, w * 0.75, v.cinturon.mat, G.colaCinturon, sec.cintura, [0.35, -1, 0.3]);
  }
  // ---------- las colas de la cinta (la cinta misma es la de la cabeza LPC) ----------
  if (v.cinta) {
    const atras = add(j.cabeza, add(mul(j.baseCabeza.f, -m.cabeza * 0.42), mul(j.baseCabeza.u, m.cabeza * 0.12)));
    colas(b, atras, j.baseCabeza, v.cinta.colas * H, Math.max(0.6, 0.007 * H), v.cinta.mat, G.cinta, sec.cabeza, [-1, -0.45, 0.15]);
  }
  return b;
}

/** Dos colas de tela que cuelgan de un nudo y se quedan atrás cuando el ancla se mueve (retraso y rebote). */
function colas(b: Body, ancla: V3, base: Base, largo: number, grosor: number, mat: string, g: number, vel: V3, caida: V3) {
  const segs = 3, l = largo / segs;
  for (const [s, abre] of [[0, 0.18], [1, -0.12]] as const) {
    let p = ancla;
    for (let i = 0; i < segs; i++) {
      // la caída de reposo, más el arrastre: cuanto más lejos del nudo, más se queda atrás
      const arr = mul(vel, -0.35 * (i + 1));
      const d = norm(add(add(add(mul(base.f, caida[0]), mul([0, 1, 0], caida[1] - 0.15 * i)), mul(base.r, caida[2] + abre)), arr));
      const q = add(p, mul(d, l * (s ? 0.85 : 1)));
      b.cone(p, q, grosor, grosor * 0.85, mat, g);
      p = q;
    }
  }
}

const dotp = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const transpuesta = (m: M3): M3 => [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]];
