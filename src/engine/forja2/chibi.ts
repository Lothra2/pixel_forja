import type { Raster } from '../core/raster';
import type { Pose, PropState } from '../rig/pose';
import type { HumanFicha, CellSize } from '../sheet/ficha';
import { dimsFor, type Dims } from '../rig/dims';
import { renderHuman, type Joints, type BigFrame } from '../render/human';
import { cropClip } from '../render/clip';
import { estilo, medidasDe, type Medidas } from './estilo';
import { resolver, type Esqueleto, type Lado } from './esqueleto';
import { aEsqueleto, type Cara } from './pose';
import type { Cuadro } from './movimiento';

/**
 * El adaptador de Forja 2 al chibi de hoy: el movimiento sale del formato nuevo (claves, curvas, principios) y se
 * dibuja con el cuerpo y el pintor del premium chibi (render/human.ts), sin tocarlos.
 *
 * Cada cuadro se resuelve en el esqueleto 3D de Forja 2 (con las medidas del estilo cabezón) y se proyecta de lado:
 * de ahí salen la inclinación del torso, los ángulos de hombro y codo y el tobillo respecto a la cadera, en las
 * unidades del chibi (largos de pierna). "cerca" es "near" (el lado de la cámara) y "lejos" es "far".
 */
const CARA: Record<Cara, Pose['face']> = {
  serio: { eyes: 'angry', mouth: 'line' }, grito: { eyes: 'angry', mouth: 'grin' },
  dolor: { eyes: 'hurt', mouth: 'o' }, feliz: { eyes: 'happy', mouth: 'grin' },
};
const LADO: Record<Lado, 'near' | 'far'> = { cerca: 'near', lejos: 'far' };
const deg = (r: number) => (r * 180) / Math.PI;

/** Ángulo con signo de a hacia b en el plano de la pantalla (x adelante, y arriba): + es antihorario. */
const angulo = (a: [number, number], b: [number, number]) => deg(Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]));

/** La pose del chibi para un cuadro de Forja 2. */
export function aPoseChibi(q: Cuadro, j: Esqueleto, m: Medidas, d: Dims): Pose {
  const L = d.legUpper + d.legLower, sc = L / m.pierna;
  const T: [number, number] = [j.pecho[0] - j.pelvis[0], j.pecho[1] - j.pelvis[1]];
  const torso = deg(Math.atan2(T[0], T[1]));
  const abajo: [number, number] = [-T[0], -T[1]];
  const brazo = (l: Lado) => {
    const A: [number, number] = [j.codo[l][0] - j.hombro[l][0], j.codo[l][1] - j.hombro[l][1]];
    const B: [number, number] = [j.puño[l][0] - j.codo[l][0], j.puño[l][1] - j.codo[l][1]];
    // hombro: 0 colgando a lo largo del torso, 90 al frente, 180 arriba; codo: + dobla hacia adelante
    return { shoulder: Math.round(angulo(abajo, A)), elbow: Math.round(Math.max(0, angulo(A, B))) };
  };
  const pierna = (l: Lado) => ({
    x: (j.tobillo[l][0] - j.cadera[l][0]) * sc,
    y: -(j.tobillo[l][1] - j.cadera[l][1]) * sc,
    toe: Math.round(q.pose.pies[l].punta),
  });
  // el peso va en el pie que está plano en el piso: con el talón arriba (punta) el pie ya no carga
  const plantado = (l: Lado) => q.pose.pies[l].alto <= 0.001 && q.pose.pies[l].punta <= 0;
  const support: Pose['support'] = plantado('cerca') && plantado('lejos') ? 'both' : plantado('lejos') ? 'far' : plantado('cerca') ? 'near' : undefined;
  const props: PropState[] = [];
  // la chispa del impacto, la misma del chibi de hoy
  if (q.impacto) {
    const at = `${q.impacto.miembro === 'mano' ? 'hand' : 'foot'}${q.impacto.lado === 'cerca' ? 'Near' : 'Far'}` as PropState['at'];
    props.push({ kind: 'spark', at, angles: { side: 0, se: 10, ne: -10 }, front: true });
  }
  const hands: Pose['hands'] = {};
  for (const l of ['cerca', 'lejos'] as Lado[]) if (q.pose.manos[l].forma !== 'puno') hands[LADO[l]] = q.pose.manos[l].forma === 'garra' ? 'garra' : 'palma';
  return {
    x: j.pelvis[0] * sc,
    torso: Math.round(torso),
    head: { dx: 0, dy: 0, tilt: Math.round(q.pose.cabeza.inclina) },
    legs: { near: pierna('cerca'), far: pierna('lejos') },
    arms: { near: brazo('cerca'), far: brazo('lejos') },
    face: CARA[q.pose.cara],
    air: 0,
    ...(support ? { support } : {}),
    ...(props.length ? { props } : {}),
    ...(Object.keys(hands).length ? { hands } : {}),
  };
}

export interface ChibiPintado { frames: Raster[]; poses: Pose[]; joints: (Joints | undefined)[] }

/** Un movimiento de Forja 2 dibujado con el chibi premium de hoy, a su celda y con el encuadre fijo del premium. */
export function pintarChibi(f: HumanFicha, cell: CellSize, cuadros: Cuadro[]): ChibiPintado {
  const e = estilo('cabezon'), m = medidasDe(e, cell);
  const d = dimsFor(cell, f.body.proportions);
  const poses = cuadros.map((q) => aPoseChibi(q, resolver(m, aEsqueleto(m, q.pose, q.extras, e.retarget)), m, d));
  // el vaivén del pelo, como lo calcula el clip para las animaciones de siempre
  const lag = f.physics.hairLag;
  const conPelo = poses.map((p, i) => {
    const prev = poses[(i - 1 + poses.length) % poses.length];
    const vy = (p.air - prev.air) + (prev.head.dy - p.head.dy) * 0.5;
    return { ...p, hair: { dx: 0, dy: Math.max(-1, Math.min(1, Math.round(vy * lag))) } };
  });
  const ro = { props: true, propsApart: true, joints: true } as const;
  const big = conPelo.map((p) => renderHuman(f, cell, p, 'side', ro));
  // pie sin patinar en el cuerpo de destino: el chibi tiene sus propias caderas, así que los pies apoyados se miden ya
  // dibujados. Primero el cuerpo se corre para que el pie de adelante quede en su pixel del primer cuadro; después, si
  // el de atrás también está en el piso (aunque sea en punta), se corrige su objetivo hasta que quede en el suyo
  const pieX = (b: BigFrame, k: 'footNear' | 'footFar') => (b.joints ? b.joints[k][0] - b.pivotX : 0);
  const ref = { footNear: pieX(big[0], 'footNear'), footFar: pieX(big[0], 'footFar') };
  const enPiso = (i: number, l: Lado) => cuadros[i].pose.pies[l].alto <= 0.001;
  const fijas = conPelo.map((p0, i) => {
    let p = p0, b = big[i];
    for (let pasada = 0; pasada < 3; pasada++) {
      let cambia = false;
      if (enPiso(i, 'lejos')) {
        const dx = Math.round(pieX(b, 'footFar') - ref.footFar);
        if (dx) { p = { ...p, x: p.x - dx }; cambia = true; }
      }
      if (!cambia && enPiso(i, 'cerca')) {
        const dx = Math.round(pieX(b, 'footNear') - ref.footNear);
        if (dx) { p = { ...p, legs: { ...p.legs, near: { ...p.legs.near, x: p.legs.near.x - dx } } }; cambia = true; }
      }
      if (!cambia) break;
      b = renderHuman(f, cell, p, 'side', ro);
    }
    big[i] = b;
    return p;
  });
  const c = cropClip(big, cell, true);
  const joints = big.map((b) => (b.joints ? (Object.fromEntries(Object.entries(b.joints).map(([k, [x, y]]) => [k, [x - c.left, y - c.top]])) as Joints) : undefined));
  return { frames: c.frames, poses: fijas, joints };
}
