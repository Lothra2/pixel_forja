import { base, enBase, ik2, girar, add, sub, mul, norm, type V3, type Base, type Articulaciones } from '../luchador/esqueleto';
import type { Medidas } from './estilo';

/**
 * El esqueleto común de Forja 2: el del luchador (luchador/esqueleto.ts), con las medidas sacadas del estilo en vez de
 * fijas para 7 cabezas. Ejes: x adelante (mira a la derecha), y arriba desde el piso, z hacia la cámara. El pivote es
 * x = 0 en el piso. "cerca" es el lado de la cámara.
 *
 * La pose va en pixeles ya resueltos (pose.ts la arma desde la pose normalizada de un movimiento).
 */
export type { V3, Base, Articulaciones };
export type Lado = 'cerca' | 'lejos';
export type FormaMano = 'puno' | 'abierta' | 'garra';

export interface PoseEsq {
  cadera: V3;
  giroCadera: number;
  giroPecho: number;
  /** inclinación de la columna: + hacia adelante */
  inclina: number;
  ladeo: number;
  cabeza: { giro: number; inclina: number };
  /** mano: centro del puño. codo: hacia dónde dobla */
  manos: Record<Lado, { mano: V3; codo: V3; forma: FormaMano; escala: number; /** huesos más largos (el estirón del impacto) */ largo?: number }>;
  /** pie: tobillo, rodilla: hacia dónde dobla, punta: la punta baja (+) o sube (-) en grados, giro del pie */
  pies: Record<Lado, { tobillo: V3; rodilla: V3; punta: number; giro: number; escala: number; largo?: number }>;
  /** respiración: cuánto suben el pecho y los hombros (pixeles) */
  respira: number;
  rueda?: number;
  vuelta?: number;
}

/** Las articulaciones de Forja 2: las del luchador más el ancho de los hombros ya girado. */
export type Esqueleto = Articulaciones;

export function resolver(m: Medidas, p: PoseEsq): Esqueleto {
  const bp = base(p.giroCadera, p.inclina * 0.35);
  const bc = base(p.giroPecho, p.inclina, p.ladeo);
  const pelvis = p.cadera;
  const pecho = add(add(pelvis, mul(bc.u, m.columna)), [0, p.respira, 0]);
  const cuello = enBase(pecho, bc, 0.03 * m.H, m.cuello, 0);
  const bh = base(p.giroPecho * 0.35 + p.cabeza.giro, p.inclina * 0.3 + p.cabeza.inclina);
  const cabeza = enBase(cuello, bh, 0.01 * m.H, m.cabeza * 0.5, 0);
  const hombro = {
    cerca: add(enBase(pecho, bc, -0.004 * m.H, m.hombroAlto, m.hombros), [0, p.respira * 0.5, 0]),
    lejos: add(enBase(pecho, bc, -0.004 * m.H, m.hombroAlto, -m.hombros), [0, p.respira * 0.5, 0]),
  };
  const caderaJ = { cerca: enBase(pelvis, bp, 0, -0.01 * m.H, m.caderas), lejos: enBase(pelvis, bp, 0, -0.01 * m.H, -m.caderas) };
  const brazo = (lado: Lado) => {
    const b = p.manos[lado];
    const k = b.largo ?? 1;
    const sol = ik2(hombro[lado], b.mano, m.brazo * k, (m.antebrazo + m.puno) * k, b.codo);
    const dir = norm(sub(sol.fin, sol.medio));
    return { codo: sol.medio, muñeca: sub(sol.fin, mul(dir, m.puno)), puño: sol.fin };
  };
  const pierna = (lado: Lado) => {
    const q = p.pies[lado];
    const pt = (q.punta * Math.PI) / 180;
    // con el talón arriba el pie gira sobre la punta: el tobillo sube para que la punta siga en el piso
    const tob = add(q.tobillo, [0, pt > 0 ? Math.sin(pt) * m.pie * 0.75 : 0, 0]);
    const k = q.largo ?? 1;
    const sol = ik2(caderaJ[lado], tob, m.muslo * k, m.canilla * k, q.rodilla);
    const fb = base(q.giro, 0);
    const dir = norm(add(mul(fb.f, Math.cos(pt)), mul([0, -1, 0], Math.sin(pt))));
    const punta = add(sol.fin, add(mul(dir, m.pie * 0.75), [0, -m.tobillo * 0.7, 0]));
    const talon = add(sol.fin, add(mul(dir, -m.pie * 0.25), [0, -m.tobillo * 0.7, 0]));
    return { rodilla: sol.medio, tobillo: sol.fin, punta, talon };
  };
  const bC = brazo('cerca'), bL = brazo('lejos'), pC = pierna('cerca'), pL = pierna('lejos');
  const j: Esqueleto = {
    pelvis, basePelvis: bp, pecho, basePecho: bc, cuello, cabeza, baseCabeza: bh, hombro,
    codo: { cerca: bC.codo, lejos: bL.codo }, muñeca: { cerca: bC.muñeca, lejos: bL.muñeca }, puño: { cerca: bC.puño, lejos: bL.puño },
    cadera: caderaJ, rodilla: { cerca: pC.rodilla, lejos: pL.rodilla }, tobillo: { cerca: pC.tobillo, lejos: pL.tobillo },
    punta: { cerca: pC.punta, lejos: pL.punta }, talon: { cerca: pC.talon, lejos: pL.talon },
  };
  return girar(j, p.rueda ?? 0, p.vuelta ?? 0, pelvis);
}
