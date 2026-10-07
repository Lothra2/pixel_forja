import { type Raster, createRaster } from '../core/raster';
import type { HumanFicha, CellSize } from '../sheet/ficha';
import { dimsFor } from '../rig/dims';
import { type Pose, solveTwoBone } from '../rig/pose';
import { renderHuman, type Joints, type JointName } from './human';

/**
 * Ayudas del editor de poses: dibujar una pose suelta con sus articulaciones
 * y convertir el arrastre de una articulación en la pose nueva. Trabaja de lado.
 */
export interface EditorFrame {
  frame: Raster;
  /** articulaciones en coordenadas de la celda */
  joints: Joints;
}

export function editorFrame(f: HumanFicha, cell: CellSize, pose: Pose): EditorFrame {
  const b = renderHuman(f, cell, pose, 'side');
  const left = b.pivotX - cell / 2, top = b.groundRow - (cell - 2);
  const frame = createRaster(cell, cell);
  const r = b.raster;
  for (let y = 0; y < cell; y++)
    for (let x = 0; x < cell; x++) {
      const si = ((y + top) * r.w + x + left) * 4, di = (y * cell + x) * 4;
      for (let k = 0; k < 4; k++) frame.data[di + k] = r.data[si + k];
    }
  const joints = Object.fromEntries(Object.entries(b.joints!).map(([k, [x, y]]) => [k, [x - left, y - top]])) as Joints;
  return { frame, joints };
}

export const DRAGGABLE: JointName[] = ['footNear', 'footFar', 'handNear', 'handFar', 'head', 'hip'];

export function dragJoint(f: HumanFicha, cell: CellSize, pose: Pose, joint: JointName, to: [number, number], joints: Joints): Pose {
  const d = dimsFor(cell, f.body.proportions);
  const p: Pose = structuredClone(pose);
  if (joint === 'footNear' || joint === 'footFar') {
    const hip = joints[joint === 'footNear' ? 'hipNear' : 'hipFar'];
    const which = joint === 'footNear' ? 'near' : 'far';
    p.legs[which] = { ...p.legs[which], x: to[0] - hip[0], y: to[1] - hip[1] };
  } else if (joint === 'handNear' || joint === 'handFar') {
    const sh = joints[joint === 'handNear' ? 'shoulderNear' : 'shoulderFar'];
    const t = ((Math.abs(p.torso) < 12 ? 0 : p.torso) * Math.PI) / 180;
    const vx = to[0] - sh[0], vy = to[1] - sh[1];
    const fwd = vx * Math.cos(t) + vy * Math.sin(t);
    const down = -(vx * Math.sin(t) - vy * Math.cos(t));
    const ik = solveTwoBone(d.armUpper, d.armLower, fwd, down, -1);
    const a1 = Math.atan2(ik.mid[0], ik.mid[1]);
    const a2 = Math.atan2(ik.end[0] - ik.mid[0], ik.end[1] - ik.mid[1]);
    const which = joint === 'handNear' ? 'near' : 'far';
    p.arms[which] = { ...p.arms[which], shoulder: Math.round((a1 * 180) / Math.PI), elbow: Math.round(((a2 - a1) * 180) / Math.PI) };
  } else if (joint === 'head') {
    const cur = joints.head;
    p.head = { ...p.head, dx: Math.max(-3, Math.min(3, p.head.dx + Math.round(to[0] - cur[0]))), dy: Math.max(-3, Math.min(3, p.head.dy + Math.round(to[1] - cur[1]))) };
  } else if (joint === 'hip') {
    const cur = joints.hip;
    p.x = Math.round(p.x + to[0] - cur[0]);
    p.air = Math.max(0, Math.round(p.air - (to[1] - cur[1])));
  }
  return p;
}
