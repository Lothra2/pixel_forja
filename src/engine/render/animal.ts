import type { AnimalFicha, CellSize } from '../sheet/ficha';
import { animalDims, type QPose } from '../rig/animal';
import { solveTwoBone } from '../rig/pose';
import { makeRamp, SHADOW, BASE, LIGHT, type Ramp } from '../color/ramp';
import { LayerCanvas, Layer, finalizeOutlines, toRaster, packHex } from './canvas';
import { Materials } from './materials';
import { Part, stroke, blob, polygon, rot } from './part';
import { drawBall } from './props';
import { type BigFrame, bodyBox } from './human';

/**
 * Cuadrúpedo de lado, todo con código: cuerpo, patas con pincel fijo, cabeza con formas rotadas
 * (nunca se rota una imagen), cola, collar y manchas. Los colores salen de la ficha.
 */
export function renderAnimal(f: AnimalFicha, cell: CellSize, pose: QPose): BigFrame {
  const d = animalDims(f.body.species, cell, f.body.size);
  const C = cell;
  const W = C * 3, H = C * 2;
  const canvas = new LayerCanvas(W, H, Math.round(1.5 * C), C);
  const mats = new Materials({
    fur: f.palette.fur, fur2: f.palette.fur2, dark: f.palette.dark, collar: f.palette.collar ?? f.palette.dark,
    tongue: makeRamp('#e86a7a'), eye: makeRamp(f.palette.eyes),
  } as Record<string, Ramp>);
  const T = Math.round(d.chest * 0.45);
  const len = d.bodyLen;
  const P = (x: number, y: number): [number, number] => rot([x, y], pose.pitch);
  const commit = (part: Part, layer: number, far = false) => {
    for (const [x, y, p] of part.entries()) {
      let slot = p.slot;
      if (slot === BASE) {
        if (!part.has(x, y - 1)) slot = LIGHT;
        else if (!part.has(x, y + 1) || !part.has(x - 1, y)) slot = SHADOW;
      }
      if (far) slot = Math.max(SHADOW, Math.min(slot, BASE) - 1);
      canvas.put(x, y, layer, mats.paint(p.mat, slot));
    }
  };

  // ---------- cuerpo ----------
  const body = new Part();
  const outline: [number, number][] = [
    [-len / 2, -T + 1], [-len / 2 + 2, -T], [len / 2 - 3, -T - 0.5], [len / 2, -T + 1],
    [len / 2 + 1, -T + 3], [len / 2 + 1, -T + d.chest * 0.75], [len / 2 - 2, -T + d.chest], [len * 0.1, -T + d.chest - 1],
    [-len / 4, -T + d.waist], [-len / 2 + 1, -T + d.waist + 1], [-len / 2 - 1, -T + d.waist * 0.6],
  ];
  polygon(body, outline.map(([x, y]) => P(x, y)), 'fur');
  blob(body, P(-len / 2 + d.waist / 2, -T + d.waist / 2), d.waist + 1, 'fur');
  blob(body, P(len / 2 - d.chest / 2 + 1, -T + d.chest / 2), d.chest, 'fur');
  if (f.markings.chest) {
    const patch: [number, number][] = [[len / 2 - 1, -T + d.chest * 0.35], [len / 2 + 1.5, -T + d.chest * 0.55], [len / 2 - 1, -T + d.chest + 0.5], [len / 2 - 4, -T + d.chest]];
    polygon(body, patch.map(([x, y]) => P(x, y)), 'fur2');
  }

  // ---------- patas ----------
  const L = d.legUpper + d.legLower;
  const roots = {
    front: P(len / 2 - d.chest * 0.35, -T + d.chest * 0.75),
    rear: P(-len / 2 + d.waist * 0.45, -T + d.waist * 0.7),
  };
  const drawLeg = (root: [number, number], foot: { x: number; y: number }, front: boolean, far: boolean) => {
    const part = new Part();
    const r: [number, number] = [root[0] + (far ? -1 : 1), root[1]];
    const ik = solveTwoBone(d.legUpper, d.legLower, foot.x, foot.y, front ? -1 : 1);
    const knee: [number, number] = [r[0] + ik.mid[0], r[1] + ik.mid[1]];
    const paw: [number, number] = [r[0] + ik.end[0], r[1] + ik.end[1]];
    stroke(part, r, knee, d.legT + (front ? 0 : 1), () => 'fur');
    stroke(part, knee, paw, d.legT, (t) => (f.markings.paws && t > 0.6 ? 'fur2' : 'fur'));
    const pw = d.legT + 1;
    const px0 = Math.round(paw[0]) - Math.floor((d.legT - 1) / 2), py = Math.round(paw[1]) + Math.ceil((d.legT - 1) / 2);
    for (let i = 0; i < pw; i++) part.set(px0 + i, py, f.markings.paws ? 'fur2' : 'fur', i === pw - 1 ? LIGHT : BASE);
    part.set(px0 + pw - 1, py, 'dark', SHADOW);
    void L;
    return part;
  };
  commit(drawLeg(roots.front, pose.legs.ff, true, true), Layer.FarLeg, true);
  commit(drawLeg(roots.rear, pose.legs.rf, false, true), Layer.FarLeg, true);

  // ---------- cola ----------
  {
    const part = new Part();
    const root = P(-len / 2, -T + 1);
    const a = ((pose.tail + 180 - pose.pitch) * Math.PI) / 180;
    const dir = (k: number, extra = 0): [number, number] => {
      const aa = a + (extra * Math.PI) / 180;
      return [root[0] + Math.cos(aa) * k, root[1] - Math.sin(aa) * k];
    };
    const tl = d.tail.len, tt = d.tail.t;
    if (d.tail.style === 'stub') stroke(part, root, dir(tl), tt, () => 'fur');
    else if (d.tail.style === 'fluffy') {
      for (let k = 0; k < tl; k++) stroke(part, dir(k), dir(k + 1, 8), tt, () => (Math.floor(k / Math.max(2, Math.round(2 * d.u))) % 2 ? 'dark' : 'fur'));
    } else {
      const mid = dir(tl / 2);
      stroke(part, root, mid, tt, () => 'fur');
      const aa = a + (d.tail.style === 'thin' ? 40 : 20) * (Math.PI / 180);
      stroke(part, mid, [mid[0] + Math.cos(aa) * (tl / 2), mid[1] - Math.sin(aa) * (tl / 2)], Math.max(1, tt - (d.tail.style === 'thin' ? 0 : 1)), () => 'fur');
    }
    commit(part, Layer.Behind);
  }
  commit(body, Layer.Torso);

  // ---------- cuello y cabeza ----------
  const s = d.head.size;
  const neckBase = P(len / 2 - 2, -T + 1);
  const neckAng = -50 + pose.pitch * 0.5;
  const neckEnd: [number, number] = [neckBase[0] + Math.cos((neckAng * Math.PI) / 180) * d.neckLen + pose.head.dx, neckBase[1] + Math.sin((neckAng * Math.PI) / 180) * d.neckLen + pose.head.dy];
  const neck = new Part();
  stroke(neck, neckBase, neckEnd, Math.max(3, Math.round(d.chest * 0.55)), () => 'fur');
  commit(neck, Layer.Torso);

  const hang = pose.pitch + pose.head.angle;
  const HP = (x: number, y: number): [number, number] => {
    const [rx, ry] = rot([x, y], hang);
    return [neckEnd[0] + rx + s * 0.2, neckEnd[1] + ry - s * 0.25];
  };
  const head = new Part();
  blob(head, HP(0, 0), s, 'fur');
  const mz: [number, number][] = [[s * 0.15, s * 0.5 - d.head.muzzleH], [s * 0.5 + d.head.muzzleLen, s * 0.5 - d.head.muzzleH + 0.5], [s * 0.5 + d.head.muzzleLen, s * 0.5 - 0.5], [s * 0.15, s * 0.5]];
  const muzzleMat = d.mask === 'muzzle' ? 'dark' : f.markings.chest && d.mask === 'none' ? 'fur' : 'fur';
  polygon(head, mz.map(([x, y]) => HP(x, y)), muzzleMat);
  if (d.mask === 'eyes') {
    const band: [number, number][] = [[-s * 0.1, -s * 0.25], [s * 0.55, -s * 0.2], [s * 0.55, s * 0.12], [-s * 0.1, s * 0.12]];
    polygon(head, band.map(([x, y]) => HP(x, y)), 'dark');
  }
  if (f.markings.chest && d.mask !== 'muzzle') {
    // hocico claro
    const tip: [number, number][] = [[s * 0.45, s * 0.5 - d.head.muzzleH + 1], [s * 0.5 + d.head.muzzleLen, s * 0.5 - d.head.muzzleH + 1], [s * 0.5 + d.head.muzzleLen, s * 0.5 - 0.5], [s * 0.45, s * 0.5]];
    polygon(head, tip.map(([x, y]) => HP(x, y)), 'fur2');
  }
  // orejas
  const ear = new Part();
  if (d.ear === 'fold') polygon(ear, ([[-s * 0.15, -s * 0.45], [s * 0.2, -s * 0.55], [s * 0.25, -s * 0.2], [s * 0.05, -s * 0.25]] as [number, number][]).map(([x, y]) => HP(x, y)), 'fur');
  else if (d.ear === 'up') polygon(ear, ([[-s * 0.3, -s * 0.3], [-s * 0.15, -s * 0.85], [s * 0.1, -s * 0.35]] as [number, number][]).map(([x, y]) => HP(x, y)), 'fur');
  else if (d.ear === 'round') blob(ear, HP(-s * 0.2, -s * 0.45), Math.max(3, Math.round(s * 0.4)), 'dark');
  else polygon(ear, ([[-s * 0.35, -s * 0.3], [-s * 0.05, -s * 0.35], [-s * 0.1, s * 0.45], [-s * 0.35, s * 0.35]] as [number, number][]).map(([x, y]) => HP(x, y)), 'dark');
  commit(head, Layer.Head);
  commit(ear, Layer.NearArm);
  // ojo, nariz y boca (sellos que no se rotan)
  const put = (p: [number, number], hex: string, mat = 'fur') => canvas.put(Math.round(p[0]), Math.round(p[1]), Layer.NearArm, { color: packHex(hex), dark: mats.paint(mat, 0).dark, mat: mats.id(mat) });
  const eyeC = HP(s * 0.18, -s * 0.12);
  const dark = f.palette.dark[0];
  const ew = s >= 10 ? 2 : 1;
  for (let i = 0; i < ew; i++) {
    if (pose.eyes === 'closed') put([eyeC[0] + i, eyeC[1] + 1], dark);
    else if (pose.eyes === 'happy') { put([eyeC[0] + i, eyeC[1] + (i === 0 ? 1 : 0)], dark); }
    else {
      put([eyeC[0] + i, eyeC[1]], i === ew - 1 && ew > 1 ? '#ffffff' : dark);
      put([eyeC[0] + i, eyeC[1] + 1], i === 0 ? dark : f.palette.eyes);
    }
  }
  const nose = HP(s * 0.5 + d.head.muzzleLen, s * 0.5 - d.head.muzzleH + 0.5);
  put(nose, dark, 'dark');
  if (s >= 9) put([nose[0] - 1, nose[1]], dark, 'dark');
  if (pose.mouth !== 'closed') {
    const m0 = HP(s * 0.35, s * 0.5), m1 = HP(s * 0.5 + d.head.muzzleLen - 1, s * 0.5);
    const mp = new Part();
    stroke(mp, [m0[0], m0[1] + 1], [m1[0], m1[1] + 1], Math.max(1, Math.round(d.u)), () => 'dark');
    if (pose.mouth === 'tongue') blob(mp, [m0[0] + 1, m0[1] + 2.5], Math.max(2, Math.round(2 * d.u)), 'tongue');
    commit(mp, Layer.Head);
  }
  // collar
  if (f.palette.collar) {
    const cp = new Part();
    const a = ((neckAng + 90) * Math.PI) / 180;
    const half = Math.max(2, Math.round(d.chest * 0.32));
    const c0 = [neckBase[0] + (neckEnd[0] - neckBase[0]) * 0.35, neckBase[1] + (neckEnd[1] - neckBase[1]) * 0.35];
    stroke(cp, [c0[0] - Math.cos(a) * half, c0[1] - Math.sin(a) * half], [c0[0] + Math.cos(a) * half, c0[1] + Math.sin(a) * half], Math.max(1, Math.round(1.5 * d.u)), () => 'collar');
    commit(cp, Layer.Head);
    canvas.put(Math.round(c0[0] + Math.cos(a) * half) + 1, Math.round(c0[1] + Math.sin(a) * half), Layer.NearArm, mats.paint('p_gold', BASE));
  }
  if (pose.ball) {
    const bp = new Part();
    const at = HP(s * 0.5 + d.head.muzzleLen, s * 0.5 + 1);
    drawBall(bp, 'tennisball', at, d.u);
    commit(bp, Layer.Prop);
  }

  commit(drawLeg(roots.front, pose.legs.fn, true, false), Layer.NearArm);
  commit(drawLeg(roots.rear, pose.legs.rn, false, false), Layer.NearArm);

  const bb = canvas.bbox();
  const groundCanvas = (bb ? bb.y1 + 1 : canvas.oy) + Math.round(pose.air);
  finalizeOutlines(canvas, { fused: [[Layer.Torso, Layer.Head], [Layer.Torso, Layer.NearArm], [Layer.Head, Layer.NearArm]] });
  const groundRow = C + d.groundY;
  const dx = Math.round(pose.x), dy = groundRow - groundCanvas;
  return { raster: toRaster(canvas, 0, 0, W, H, dx, dy), pivotX: canvas.ox, groundRow, body: bodyBox(canvas, dx, dy) };
}
