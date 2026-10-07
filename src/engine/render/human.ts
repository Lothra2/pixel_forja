import { type Raster } from '../core/raster';
import { type HumanFicha, type CellSize } from '../sheet/ficha';
import { dimsFor, type Dims } from '../rig/dims';
import { type Pose, type Arm, type Foot, solveTwoBone } from '../rig/pose';
import { type Ramp, SHADOW, BASE, LIGHT } from '../color/ramp';
import { LayerCanvas, Layer, finalizeOutlines, toRaster, packHex } from './canvas';
import { Materials } from './materials';
import { Part, stroke, blob, rot } from './part';
import { buildHeadImage, type View } from './head';
import { rotSprite } from './rotsprite';
import { drawBall, drawHeld, drawGround, isBall, ballSize } from './props';

export type { View } from './head';

export interface RenderOptions {
  /** dibujar balones y implementos */
  props?: boolean;
  noOutline?: boolean;
}

/**
 * Cuadro "grande": 3 celdas de ancho y 2 de alto, con el pie de apoyo en (1.5C, C + groundY).
 * El clip recorta la celda final (y puede correr todo el clip si una pose se sale).
 */
export interface BigFrame {
  raster: Raster;
  pivotX: number;
  groundRow: number;
  /** caja del cuerpo sin implementos (un balón puede salirse del cuadro, el cuerpo no) */
  body: { x0: number; y0: number; x1: number; y1: number } | null;
}

/** Caja de lo que no es implemento, ya en coordenadas del cuadro grande. */
export function bodyBox(c: LayerCanvas, dx: number, dy: number): BigFrame['body'] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const l = c.layer[y * c.w + x];
      if (!l || l === Layer.Prop || l === Layer.PropMid || l === Layer.Behind) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  return isFinite(x0) ? { x0: x0 + dx, y0: y0 + dy, x1: x1 + dx, y1: y1 + dy } : null;
}

const DIGITS: Record<string, string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'], '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '..#', '.#.', '.#.'], '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
};

const P_FRONT = 0.3;

export function renderHuman(f: HumanFicha, cell: CellSize, pose: Pose, view: View, opt: RenderOptions = {}): BigFrame {
  const d = dimsFor(cell, f.body.proportions);
  const set = f.heads[`${cell}`];
  if (!set) throw new Error(`La ficha no tiene cabeza para ${cell}px`);
  const C = cell;
  const W = C * 3, H = C * 2;
  const canvas = new LayerCanvas(W, H, Math.round(1.5 * C), C);
  const mats = new Materials({
    skin: f.palette.skin, hair: f.palette.hair, top: f.palette.top, bottom: f.palette.bottom, socks: f.palette.socks,
    shoes: f.palette.shoes, accessory: f.palette.accessory, face: f.palette.skin,
  } as Record<string, Ramp>);
  const side = view === 'side';
  const sign = view === 'back' ? -1 : 1; // de espalda, lo "cercano" queda a la izquierda
  // en vista lateral el torso se inclina. De frente o espalda, `torso` no rota (se ve igual) y `roll` sí
  const rawTheta = side ? pose.torso : pose.roll ?? 0;
  // inclinación chica: no se rota (quedaría dentado), se corren las filas de arriba (como en el piloto)
  const SMALL = 12;
  const shear = Math.abs(rawTheta) < SMALL ? Math.tan((rawTheta * Math.PI) / 180) : 0;
  const theta = Math.abs(rawTheta) < SMALL ? 0 : rawTheta;
  const R: [number, number] = [Math.cos((theta * Math.PI) / 180), Math.sin((theta * Math.PI) / 180)]; // adelante
  const U: [number, number] = [Math.sin((theta * Math.PI) / 180), -Math.cos((theta * Math.PI) / 180)]; // arriba
  const local = (r: number, u: number): [number, number] => [r * R[0] + u * U[0] + Math.round(shear * u), r * R[1] + u * U[1]];
  const add = (a: [number, number], b: [number, number]): [number, number] => [a[0] + b[0], a[1] + b[1]];

  const commit = (part: Part, layer: number, far = false, shade = true) => {
    for (const [x, y, p] of part.entries()) {
      let slot = p.slot;
      if (shade && !part.has(x - 1, y) && slot >= BASE) slot = SHADOW;
      if (far) slot = Math.max(SHADOW, Math.min(slot, BASE) - 1);
      canvas.put(x, y, layer, mats.paint(p.mat, slot));
    }
  };

  const tx0 = -Math.floor(d.torsoW / 2), tx1 = tx0 + d.torsoW - 1;
  const shoulderU = d.torsoH - Math.max(1, Math.round(d.u * 1.5)) + 1;
  const nearHipX = Math.floor(d.hipSpread / 2), farHipX = nearHipX - d.hipSpread;

  // ---------- puntos de brazos y piernas ----------
  interface LimbPts { root: [number, number]; mid: [number, number]; end: [number, number]; foot?: Foot }
  const legPts = (far: boolean): LimbPts => {
    const foot = far ? pose.legs.far : pose.legs.near;
    const hx = (far ? farHipX : nearHipX) * (side ? 1 : sign);
    const root = local(hx, 1);
    const ik = solveTwoBone(d.legUpper, d.legLower, foot.x, foot.y, 1);
    if (side) return { root, mid: add(root, ik.mid), end: add(root, ik.end), foot };
    // de frente: adelante se ve como un poco más abajo (de espalda, más arriba)
    const P = view === 'front' ? P_FRONT : -P_FRONT;
    const z = (foot.z ?? 0) * (far ? -1 : 1) * sign;
    const proj = (p: [number, number], k: number): [number, number] => {
      const v = rot([z * k, p[1] + p[0] * P], theta);
      return add(root, v);
    };
    return { root, mid: proj(ik.mid, 0.5), end: proj(ik.end, 1), foot };
  };
  const armPts = (far: boolean): LimbPts => {
    const a = far ? pose.arms.far : pose.arms.near;
    const sx = side ? (far ? tx0 - 1 : tx1 + 1) : (far ? tx0 - 1 : tx1 + 1) * sign;
    const root = local(sx, shoulderU);
    const r = Math.PI / 180;
    const sp = (a.spread ?? 0) * r;
    const seg = (ang: number, len: number) => {
      const fwd = Math.sin(ang * r) * Math.cos(sp) * len, down = Math.cos(ang * r) * Math.cos(sp) * len, out = Math.sin(sp) * len;
      if (side) return local(fwd, -down);
      const P = view === 'front' ? P_FRONT : -P_FRONT;
      const outSign = (far ? -1 : 1) * sign;
      return rot([out * outSign, down + fwd * P], theta);
    };
    const mid = add(root, seg(a.shoulder, d.armUpper));
    const end = add(mid, seg(a.shoulder + a.elbow, d.armLower));
    return { root, mid, end };
  };

  const legs = { near: legPts(false), far: legPts(true) };
  const arms = { near: armPts(false), far: armPts(true) };

  // ---------- capas según la vista ----------
  const L_FAR_ARM = side ? Layer.FarArm : view === 'front' ? Layer.NearArm : Layer.FarArm;
  const L_NEAR_ARM = side ? Layer.NearArm : view === 'front' ? Layer.NearArm : Layer.FarArm;
  const L_FAR_LEG = side ? Layer.FarLeg : Layer.NearLeg;

  const handMat = f.outfit.gloves ? 'accessory' : 'skin';
  const drawArm = (far: boolean, layer: number) => {
    const p = far ? arms.far : arms.near;
    const part = new Part();
    const sleeve = f.outfit.sleeves;
    stroke(part, p.root, p.mid, d.armT, (t) => (sleeve === 'long' || (sleeve === 'short' && t < 0.6) ? 'top' : 'skin'));
    stroke(part, p.mid, p.end, d.armT, () => (sleeve === 'long' ? 'top' : 'skin'));
    blob(part, p.end, d.hand + (f.outfit.gloves ? 1 : 0), handMat);
    commit(part, layer, side && far);
  };

  const drawLeg = (far: boolean, layer: number) => {
    const p = far ? legs.far : legs.near;
    const part = new Part();
    const bottom = f.outfit.bottom, socks = f.outfit.socks;
    stroke(part, p.root, p.mid, d.legT, () => (bottom === 'skirt' ? 'skin' : 'bottom'));
    const socksFrom = socks === 'knee' ? 0.2 : socks === 'low' ? 0.8 : 2;
    stroke(part, p.mid, p.end, d.legT, (t) => (bottom === 'pants' ? 'bottom' : bottom === 'shorts' && t < 0.2 ? 'bottom' : t >= socksFrom ? 'socks' : 'skin'));
    const an: [number, number] = [Math.round(p.end[0]), Math.round(p.end[1])];
    const off = Math.floor((d.legT - 1) / 2);
    const toe = p.foot?.toe ?? 0;
    if (!side) {
      // zapato visto de frente o de atrás: un bloque bajo el tobillo
      const fw = d.legT + (d.footLen > 3 ? 1 : 0);
      const x0 = an[0] - off - (fw > d.legT ? (far ? 1 : 0) * sign : 0);
      const yb = an[1] + (d.legT - 1 - off);
      for (let r = 0; r < d.footH; r++) for (let x = x0; x < x0 + fw; x++) part.set(x, yb - r, 'shoes', r === 0 && d.footH >= 2 ? SHADOW : BASE);
    } else if (Math.abs(toe) < 30 && Math.abs(theta) < 30) {
      // zapato plano: punta hacia adelante, esquina de arriba redondeada
      const fx0 = an[0] - off;
      const fyBottom = an[1] + (d.legT - 1 - off);
      for (let r = 0; r < d.footH; r++) {
        const y = fyBottom - r;
        const len = r === d.footH - 1 && d.footH > 1 ? d.footLen - 1 : d.footLen;
        for (let x = fx0; x < fx0 + len; x++) {
          const slot = d.footH >= 3 && r === 0 ? SHADOW : r === d.footH - 1 && x === fx0 + len - 1 ? LIGHT : BASE;
          part.set(x, y, 'shoes', slot);
        }
      }
    } else {
      // pie en punta o cuerpo rotado: el zapato es un trazo en la dirección de la punta
      const ang = toe + theta;
      const tip = rot([d.footLen - 1, 0], ang);
      stroke(part, an, [an[0] + tip[0], an[1] + tip[1]], Math.max(d.footH, d.legT - 1), () => 'shoes');
    }
    commit(part, layer, side && far);
  };

  const drawTorso = () => {
    const part = new Part();
    const cos = R[0], sin = R[1];
    const ext = Math.ceil(Math.hypot(d.torsoW, d.torsoH)) + 2;
    for (let y = -ext; y <= ext; y++)
      for (let x = -ext; x <= ext; x++) {
        const u0 = x * sin - y * cos;
        const xs = x - Math.round(shear * Math.max(0, u0));
        const r = xs * cos + y * sin, u = xs * sin - y * cos;
        const rr = side ? r : r * sign;
        if (rr < tx0 - 0.5 || rr > tx1 + 0.5 || u < 0.5 || u > d.torsoH + 0.5) continue;
        const topRow = u > d.torsoH - 0.5;
        if (topRow && (rr < tx0 + 0.5 || rr > tx1 - 0.5)) continue;
        const isPants = u < d.pantsRows + 0.5;
        const mat = isPants ? 'bottom' : 'top';
        const slot = !isPants && topRow ? LIGHT : side && rr > tx1 - 0.5 && !isPants ? LIGHT : BASE;
        part.set(x, y, mat, slot);
      }
    // número de camiseta, de frente o de espalda (contorno de la camisa)
    const numPx = new Set<number>();
    const num = f.outfit.number;
    if (num && !side && d.torsoW >= 9 && Math.abs(theta) < 20) {
      const digits = num.slice(0, 2).split('').filter((ch) => DIGITS[ch]);
      const wNum = digits.length * 4 - 1;
      const shirtRows = d.torsoH - d.pantsRows;
      const x0 = -Math.floor(wNum / 2) - (d.torsoW % 2 === 0 ? 1 : 0) + (wNum % 2 === 0 ? 1 : 0);
      const y0 = -d.torsoH + Math.max(1, Math.floor((shirtRows - 5) / 2) + 1);
      digits.forEach((ch, k) =>
        DIGITS[ch].forEach((row, j) =>
          [...row].forEach((c, i) => {
            const px = x0 + k * 4 + i, py = y0 + j;
            if (c === '#' && part.get(px, py)?.mat === 'top') numPx.add(Part.key(px, py));
          }),
        ),
      );
    }
    const numPaint = { color: packHex(f.outfit.numberColor ?? '#ffffff'), dark: mats.paint('top', 0).dark, mat: mats.id('top') };
    for (const [x, y, p] of part.entries()) {
      let slot = p.slot;
      if (!part.has(x - 1, y) && slot >= BASE) slot = SHADOW;
      canvas.put(x, y, Layer.Torso, numPx.has(Part.key(x, y)) ? numPaint : mats.paint(p.mat, slot));
    }
  };

  const drawSkirt = () => {
    if (f.outfit.bottom !== 'skirt') return;
    const part = new Part();
    const len = Math.max(2, Math.round(d.legUpper * 0.9));
    for (let v = -d.pantsRows; v <= len; v++) {
      const grow = v > 0 ? Math.min(2, Math.ceil((v / len) * 2)) : 0;
      for (let r = tx0 - grow; r <= tx1 + grow; r++) {
        const [x, y] = local(side ? r : r * sign, -v);
        part.set(Math.round(x), Math.round(y), 'bottom', v === len ? SHADOW : BASE);
      }
    }
    commit(part, Layer.Skirt);
  };

  // ---------- cabeza ----------
  const drawHead = () => {
    const forward = side ? Math.max(1, Math.round(d.u * 1.2)) : 0;
    const neck = local(forward, d.torsoH);
    const hi = buildHeadImage(f, set, view, pose.face.eyes, pose.face.mouth);
    const angle = Math.round(rawTheta * (Math.abs(rawTheta) > 45 ? 1 : 0.6) + pose.head.tilt);
    let img = hi.img, px = hi.anchor.x, py = hi.anchor.y;
    if (Math.abs(angle) >= 8) {
      const r = rotSprite(hi.img, angle, hi.anchor.x + 0.5, hi.anchor.y + 0.5);
      img = r.img; px = r.px - 0.5; py = r.py - 0.5;
    }
    const ox = Math.round(neck[0] - px + pose.head.dx), oy = Math.round(neck[1] - py + pose.head.dy);
    const hair = pose.hair ?? { dx: 0, dy: 0 };
    for (let y = 0; y < img.h; y++)
      for (let x = 0; x < img.w; x++) {
        const i = img.idx[y * img.w + x];
        if (i < 0) continue;
        const e = hi.pal[i];
        const matName = e.mat === 'face' ? 'skin' : e.mat;
        const paint = mats.custom(e.hex, matName);
        if (e.back) canvas.put(ox + x + Math.round(hair.dx), oy + y + Math.round(hair.dy), Layer.HairBack, paint);
        else canvas.put(ox + x, oy + y, Layer.Head, paint);
      }
  };

  // ---------- implementos en manos y pies ----------
  const props = opt.props === false ? [] : pose.props ?? [];
  const drawAttached = (behind: boolean) => {
    for (const pr of props) {
      if (pr.at === 'ground' || !!pr.behind !== behind) continue;
      const part = new Part();
      const anchor: [number, number] =
        pr.at === 'handNear' ? arms.near.end : pr.at === 'handFar' ? arms.far.end : pr.at === 'footNear' ? legs.near.end : pr.at === 'footFar' ? legs.far.end : local(0, d.torsoH / 2);
      const p: [number, number] = [anchor[0] + (pr.x ?? 0) * (side ? 1 : sign), anchor[1] + (pr.y ?? 0)];
      // sin ángulo dado, el implemento sigue al antebrazo
      const limb = pr.at === 'handFar' ? arms.far : pr.at === 'handNear' ? arms.near : null;
      const auto = limb ? (Math.atan2(limb.end[1] - limb.mid[1], limb.end[0] - limb.mid[0]) * 180) / Math.PI : 0;
      const ang = pr.angle !== undefined && side ? pr.angle : auto;
      if (isBall(pr.kind)) drawBall(part, pr.kind, p, d.u);
      else drawHeld(part, pr.kind, p, ang, d.u);
      const handUp = !!limb && limb === arms.near && side && limb.end[1] < local(0, d.torsoH)[1] + 1;
      const pointsUp = !isBall(pr.kind) && side && Math.sin((ang * Math.PI) / 180) < -0.3;
      commit(part, behind ? Layer.Behind : (handUp || pointsUp) && !isBall(pr.kind) ? Layer.ArmUp : Layer.Prop, false, false);
    }
  };

  // orden de dibujo: lo de atrás primero
  drawAttached(true);
  if (side) {
    drawArm(true, L_FAR_ARM);
    drawLeg(true, L_FAR_LEG);
    drawLeg(false, Layer.NearLeg);
  } else {
    drawLeg(true, L_FAR_LEG);
    drawLeg(false, Layer.NearLeg);
    if (view === 'back') { drawArm(true, L_FAR_ARM); drawArm(false, L_NEAR_ARM); }
  }
  drawSkirt();
  drawTorso();
  drawHead();
  if (side) {
    // si la mano queda más arriba que la barbilla, el brazo va detrás de la cabeza
    const chinY = local(0, d.torsoH)[1];
    drawArm(false, arms.near.end[1] < chinY + 1 ? Layer.ArmUp : Layer.NearArm);
  }
  else if (view === 'front') { drawArm(true, L_FAR_ARM); drawArm(false, L_NEAR_ARM); }
  drawAttached(false);

  // ---------- piso: el punto más bajo toca el suelo (o queda a `air` pixeles) ----------
  const bb = canvas.bbox();
  const hipH = pose.hipH;
  const groundCanvas = hipH !== undefined ? canvas.oy + Math.round(hipH) : (bb ? bb.y1 + 1 : canvas.oy) + Math.round(pose.air);
  for (const pr of props) {
    if (pr.at !== 'ground') continue;
    const part = new Part();
    const gx = Math.round((pr.x ?? 0) * (side ? 1 : sign));
    const gy = groundCanvas - canvas.oy;
    if (isBall(pr.kind)) {
      const s = ballSize(pr.kind, d.u);
      drawBall(part, pr.kind, [gx, gy - 1 - (s - 1) / 2 - (pr.y ?? 0)], d.u);
    } else drawGround(part, pr.kind, gx, gy - 1 - (pr.y ?? 0), d.u, pr.angle ?? 0);
    commit(part, pr.behind ? Layer.Behind : pr.kind === 'bike' || pr.kind === 'skate' ? Layer.PropMid : Layer.Prop, false, false);
  }

  if (!opt.noOutline)
    finalizeOutlines(canvas, {
      fused: [[Layer.FarLeg, Layer.Torso], [Layer.NearLeg, Layer.Torso], [Layer.Skirt, Layer.Torso]],
    });

  const groundRow = C + d.groundY;
  const dy = groundRow - groundCanvas;
  const dx = Math.round(pose.x * (side ? 1 : sign));
  return { raster: toRaster(canvas, 0, 0, W, H, dx, dy), pivotX: canvas.ox, groundRow, body: bodyBox(canvas, dx, dy) };
}

/** Distancia del hombro a la cadera y ángulos del brazo para llegar a un punto (para manubrios, barras). */
export function reachArm(d: Dims, torsoDeg: number, target: [number, number]): Arm {
  const tx1 = -Math.floor(d.torsoW / 2) + d.torsoW - 1;
  const shoulderU = d.torsoH - Math.max(1, Math.round(d.u * 1.5)) + 1;
  const t = (torsoDeg * Math.PI) / 180;
  const sh: [number, number] = [(tx1 + 1) * Math.cos(t) + shoulderU * Math.sin(t), (tx1 + 1) * Math.sin(t) - shoulderU * Math.cos(t)];
  // al marco del torso: adelante y abajo
  const vx = target[0] - sh[0], vy = target[1] - sh[1];
  const fwd = vx * Math.cos(t) + vy * Math.sin(t);
  const down = -(vx * Math.sin(t) - vy * Math.cos(t));
  const ik = solveTwoBone(d.armUpper, d.armLower, fwd, down, -1);
  const a1 = Math.atan2(ik.mid[0], ik.mid[1]);
  const a2 = Math.atan2(ik.end[0] - ik.mid[0], ik.end[1] - ik.mid[1]);
  return { shoulder: (a1 * 180) / Math.PI, elbow: ((a2 - a1) * 180) / Math.PI };
}
