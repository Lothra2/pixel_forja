import { type Raster } from '../core/raster';
import { type HumanFicha, type CellSize, usesAvatar, ARMOR_DEFAULT_COLOR } from '../sheet/ficha';
import { dimsFor, type Dims } from '../rig/dims';
import { type Pose, type Arm, type Foot, type PropKind, solveTwoBone, WEAPON_KINDS } from '../rig/pose';

const WEAPON_SET = new Set<PropKind>(WEAPON_KINDS);
import { type Ramp, SHADOW, BASE, LIGHT, makeRamp } from '../color/ramp';
import { LayerCanvas, Layer, finalizeOutlines, toRaster, packHex } from './canvas';
import { Materials } from './materials';
import { Part, stroke, blob, rot, polygon } from './part';
import { buildHeadImage, type View, type HeadImage } from './head';
import { renderHeadModel, HEAD_STYLES } from '../head3d/render';
import { modelFromAvatar } from '../head3d/avatar';
import { lpcHead } from '../parts/lpc';
import { rotSprite } from './rotsprite';
import { drawBall, drawHeld, drawGround, isBall, ballSize } from './props';
import { findLoot } from '../loot/catalog';
import { handMaterials } from '../loot/render';

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
  /** caja con el pelo incluido: se prefiere para encuadrar si cabe en la celda */
  full?: { x0: number; y0: number; x1: number; y1: number } | null;
  /** articulaciones en coordenadas del cuadro grande (para el editor de poses) */
  joints?: Joints;
}

export type JointName = 'hip' | 'hipNear' | 'hipFar' | 'footNear' | 'footFar' | 'shoulderNear' | 'shoulderFar' | 'handNear' | 'handFar' | 'neck' | 'head';
export type Joints = Record<JointName, [number, number]>;

/** Caja de lo que no es implemento, ya en coordenadas del cuadro grande. */
export function bodyBox(c: LayerCanvas, dx: number, dy: number, softMat = -99): BigFrame['body'] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const l = c.layer[y * c.w + x];
      if (c.mat[y * c.w + x] === softMat) continue;
      // el pelo largo que cuelga detrás puede recortarse en el borde, como un balón
      if (!l || l === Layer.Prop || l === Layer.PropMid || l === Layer.Behind || l === Layer.HairBack) continue;
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
/** largo de cada arma desde la mano hasta la punta (en unidades de 48 px) */
const WEAPON_REACH = { sword: 13, dagger: 7, greatsword: 18, axe: 12, mace: 10, club: 11, hammer: 13, spear: 21, staff: 17, scythe: 18, wand: 8, claws: 7 } as const;
/** vistas en diagonal (isométrica, tipo Diablo): lo que va hacia adelante se ve corrido a la derecha y un poco más abajo */
const DIAG_X = 0.7, DIAG_Z = 0.7, DIAG_LEAN = 0.6;
/** se = de frente mirando abajo a la derecha, ne = de espalda mirando arriba a la derecha (las otras dos son espejos) */
export type RenderView = View | 'se' | 'ne';
/** giro de la cabeza en la vista lateral: 3/4 tirando a perfil */
export const SIDE_YAW = 62;

export function renderHuman(f: HumanFicha, cell: CellSize, pose: Pose, viewIn: RenderView, opt: RenderOptions = {}): BigFrame {
  // en diagonal se arma como de frente (o de espalda) y lo que va hacia adelante se proyecta hacia la derecha
  const diag = viewIn === 'se' || viewIn === 'ne';
  const view: View = viewIn === 'se' ? 'front' : viewIn === 'ne' ? 'back' : viewIn;
  const d = dimsFor(cell, f.body.proportions);
  const avatarHead = usesAvatar(f);
  const set = f.heads[`${cell}`];
  if (!set && !avatarHead) throw new Error(`La ficha no tiene cabeza para ${cell}px`);
  const C = cell;
  const W = C * 3, H = C * 2;
  const canvas = new LayerCanvas(W, H, Math.round(1.5 * C), C);
  const style = avatarHead ? HEAD_STYLES[f.avatar!.look] ?? HEAD_STYLES.stardew : null;
  const lpcBox = avatarHead && f.avatar?.kit === 'lpc' && !!f.avatar.lpc && cell >= 48;
  // estilo Megaman: todo el contorno negro
  const ink = (r: Ramp): Ramp => (style?.outline === 'black' ? ['#16121c', r[1], r[2], r[3]] : r);
  const mats = new Materials({
    skin: ink(f.palette.skin), hair: ink(f.palette.hair), top: ink(f.palette.top), bottom: ink(f.palette.bottom), socks: ink(f.palette.socks),
    shoes: ink(f.palette.shoes), accessory: ink(f.palette.accessory), face: ink(f.palette.skin),
  } as Record<string, Ramp>);
  const fo = f.outfit;
  if (fo.pattern && fo.pattern !== 'liso') mats.add('top2', ink(makeRamp(fo.pattern2 ?? '#f2f2f2')));
  if (fo.jacket) mats.add('jacket', ink(makeRamp(fo.jacket)));
  // armaduras y trajes de RPG
  const armor = fo.armor ?? null;
  if (armor) mats.add('armor', ink(makeRamp(fo.armorColor ?? ARMOR_DEFAULT_COLOR[armor])));
  if (fo.trim) mats.add('trim', ink(makeRamp(fo.trim)));
  if (fo.cape) mats.add('cape', ink(makeRamp(fo.cape)));
  if (fo.belt) mats.add('belt', ink(makeRamp(fo.belt)));
  if (f.gear?.glow) mats.add('p_glow', makeRamp(f.gear.glow));
  if (f.gear?.shield) mats.add('p_shieldc', makeRamp(f.gear.shield));
  // armas del botín: el arma en la mano toma los colores del objeto (primero la mano libre, después la principal)
  for (const id of [f.gear?.offLoot, f.gear?.mainLoot]) {
    const it = id ? findLoot(id) : undefined;
    if (it) for (const [k, r] of Object.entries(handMaterials(it))) mats.add(k, r);
  }
  if (armor && fo.armorGem) mats.add('agem', makeRamp(fo.armorGem));
  if (armor && fo.armorGlow) { const g = makeRamp(fo.armorGlow); mats.add('aglow', [g[1], g[3], g[3], '#ffffff']); }
  const shoeMat = armor === 'placas' ? 'armor' : fo.shoes === 'descalzo' ? 'skin' : 'shoes';
  const side = view === 'side';
  const sign = view === 'back' ? -1 : 1; // de espalda, lo "cercano" queda a la izquierda
  // en vista lateral el torso se inclina. De frente o espalda, `torso` no rota (se ve igual) y `roll` sí
  const rawTheta = side ? pose.torso : diag ? (pose.roll ? pose.roll : pose.torso * DIAG_LEAN) : pose.roll ?? 0;
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
    // el pie apoyado no se corre con la profundidad (si se corriera, el cuerpo daría un saltito cada medio paso);
    // solo el pie en el aire lleva la perspectiva, y nunca baja del piso
    const ymax = Math.max(pose.legs.near.y, pose.legs.far.y);
    const lifted = Math.max(0, Math.min(1, (ymax - foot.y) / (0.15 * (d.legUpper + d.legLower))));
    const proj = (p: [number, number], k: number): [number, number] => {
      const depth = p[0] * P * lifted * (diag ? DIAG_Z : 1);
      const y = Math.min(ymax, p[1] + depth);
      const v = rot(diag ? [z * k * DIAG_Z + p[0] * DIAG_X, k === 1 ? y : p[1] + depth] : [z * k, k === 1 ? y : p[1] + depth], theta);
      return add(root, v);
    };
    return { root, mid: proj(ik.mid, 0.5), end: proj(ik.end, 1), foot };
  };
  const armPts = (far: boolean): LimbPts => {
    const a = far ? pose.arms.far : pose.arms.near;
    const sx = side ? (far ? tx0 - 1 : tx1 + 1) : (far ? tx0 - 1 : tx1 + 1) * sign;
    const root = local(sx, shoulderU);
    const r = Math.PI / 180;
    // chibi: los brazos no superan la cabeza. Un brazo alzado se abre hacia el costado (de frente)
    // o se adelanta (de lado), así la mano asoma junto a la cabeza en vez de esconderse detrás
    let shoulder = a.shoulder, spreadDeg = a.spread ?? 0;
    const chibi = d.headW > 1.5 * (d.armUpper + d.armLower);
    const up = ((shoulder % 360) + 360) % 360;
    if (chibi && up > 115 && up < 245) {
      if (side) shoulder = 115 + (up - 115) * 0.25 + (shoulder - up);
      else spreadDeg = Math.max(spreadDeg, 50 + (Math.min(up, 180) - 115) * 0.2);
    }
    const sp = spreadDeg * r;
    const seg = (ang: number, len: number) => {
      const fwd = Math.sin(ang * r) * Math.cos(sp) * len, down = Math.cos(ang * r) * Math.cos(sp) * len, out = Math.sin(sp) * len;
      if (side) return local(fwd, -down);
      const P = view === 'front' ? P_FRONT : -P_FRONT;
      const outSign = (far ? -1 : 1) * sign;
      return rot(diag ? [out * outSign * DIAG_Z + fwd * DIAG_X, down + fwd * P * DIAG_Z] : [out * outSign, down + fwd * P], theta);
    };
    const mid = add(root, seg(shoulder, d.armUpper));
    const end = add(mid, seg(shoulder + a.elbow, d.armLower));
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
    const sleeve = fo.jacket || armor === 'tunica' ? 'long' : f.outfit.sleeves;
    const sm = fo.jacket ? 'jacket' : armor === 'tunica' ? 'armor' : 'top';
    // malla y placas cubren el brazo; con placas también el antebrazo y la mano (guantelete)
    const metalUp = armor === 'malla' || armor === 'placas', metalLow = armor === 'placas';
    stroke(part, p.root, p.mid, d.armT, (t) => (metalUp ? 'armor' : sleeve === 'long' || (sleeve === 'short' && t < 0.6) ? sm : 'skin'));
    stroke(part, p.mid, p.end, d.armT, () => (metalLow ? 'armor' : sleeve === 'long' ? sm : 'skin'));
    blob(part, p.end, d.hand + (f.outfit.gloves || metalLow ? 1 : 0), metalLow ? 'armor' : handMat);
    if (fo.pauldrons && armor) blob(part, [p.root[0], p.root[1] - 0.5], d.armT + 2, fo.trim ? 'trim' : 'armor', BASE);
    commit(part, layer, (side && far) || (diag && !far));
  };

  const drawLeg = (far: boolean, layer: number) => {
    const p = far ? legs.far : legs.near;
    const part = new Part();
    const bottom = f.outfit.bottom, socks = f.outfit.socks;
    stroke(part, p.root, p.mid, d.legT, () => (bottom === 'skirt' ? 'skin' : 'bottom'));
    const socksFrom = socks === 'knee' ? 0.2 : socks === 'low' ? 0.8 : 2;
    const boots = fo.shoes === 'botas';
    stroke(part, p.mid, p.end, d.legT, (t) => (armor === 'placas' && t >= 0.3 ? 'armor' : boots && t >= 0.6 ? 'shoes' : bottom === 'pants' ? 'bottom' : bottom === 'shorts' && t < 0.2 ? 'bottom' : t >= socksFrom ? 'socks' : 'skin'));
    const an: [number, number] = [Math.round(p.end[0]), Math.round(p.end[1])];
    const off = Math.floor((d.legT - 1) / 2);
    const toe = p.foot?.toe ?? 0;
    if (!side) {
      // zapato visto de frente o de atrás: un bloque bajo el tobillo
      const fw = d.legT + (d.footLen > 3 ? 1 : 0) + (diag ? Math.max(1, Math.round(d.footLen / 3)) : 0);
      const x0 = an[0] - off - (fw > d.legT ? (far ? 1 : 0) * sign : 0);
      const yb = an[1] + (d.legT - 1 - off);
      for (let r = 0; r < d.footH; r++) for (let x = x0; x < x0 + fw; x++) part.set(x, yb - r, shoeMat, r === 0 && d.footH >= 2 ? SHADOW : BASE);
    } else if (Math.abs(toe) < 30 && Math.abs(theta) < 30) {
      // zapato plano: punta hacia adelante, esquina de arriba redondeada
      const fx0 = an[0] - off;
      const fyBottom = an[1] + (d.legT - 1 - off);
      for (let r = 0; r < d.footH; r++) {
        const y = fyBottom - r;
        const len = r === d.footH - 1 && d.footH > 1 ? d.footLen - 1 : d.footLen;
        for (let x = fx0; x < fx0 + len; x++) {
          let slot = d.footH >= 3 && r === 0 ? SHADOW : r === d.footH - 1 && x === fx0 + len - 1 ? LIGHT : BASE;
          // guayos: tacos oscuros en la suela
          if (fo.shoes === 'guayos' && r === 0 && (x - fx0) % 2 === 1) slot = SHADOW;
          part.set(x, y, shoeMat, slot);
        }
      }
    } else {
      // pie en punta o cuerpo rotado: el zapato es un trazo en la dirección de la punta
      const ang = toe + theta;
      const tip = rot([d.footLen - 1, 0], ang);
      stroke(part, an, [an[0] + tip[0], an[1] + tip[1]], Math.max(d.footH, d.legT - 1), () => shoeMat);
    }
    commit(part, layer, (side && far) || (diag && !far));
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
        let mat = isPants ? 'bottom' : 'top';
        let slot = !isPants && topRow ? LIGHT : BASE;
        if (!isPants) {
          const col = Math.round(rr - tx0), row = Math.round(d.torsoH - u);
          const shirtRows = Math.max(1, d.torsoH - d.pantsRows);
          const mid = (d.torsoW - 1) / 2;
          const pat = fo.pattern ?? 'liso';
          const on =
            pat === 'rayas' ? (col >> 1) % 2 === 1
            : pat === 'rayas_h' ? (row >> 1) % 2 === 1 && row < shirtRows
            : pat === 'banda' ? !side && Math.abs(col - (row * (d.torsoW - 1)) / shirtRows) <= 1
            : pat === 'mitades' ? !side && col < d.torsoW / 2
            : pat === 'cuadros' ? ((col >> 1) + (row >> 1)) % 2 === 1
            : false;
          if (on) mat = 'top2';
          // chaqueta abierta: de frente se ve la camiseta al medio; de lado y de espalda, casi toda chaqueta
          if (fo.jacket) {
            const open = view === 'front' ? Math.abs(col - mid) < d.torsoW * 0.22 : side ? rr > tx1 - 1.5 : false;
            if (!open) mat = 'jacket';
          }
          // armadura encima: cuero con correa cruzada, malla tejida, placas con juntas, túnica con ribete al centro
          if (armor) {
            if (armor === 'cuero') {
              mat = 'armor';
              // sin mangas: chaleco abierto (el pecho del bárbaro)
              if (f.outfit.sleeves === 'none' && view === 'front' && Math.abs(col - mid) < d.torsoW * 0.2) mat = 'skin';
              if (!side && Math.abs(col - (row * (d.torsoW - 1)) / shirtRows) <= 0.5) { mat = 'armor'; slot = SHADOW; }
            } else if (armor === 'malla') { mat = 'armor'; slot = topRow ? LIGHT : (col + row) % 2 ? SHADOW : BASE; }
            else if (armor === 'placas') { mat = 'armor'; slot = topRow ? LIGHT : row % 3 === 2 ? SHADOW : !side && Math.abs(col - mid) < 0.6 ? LIGHT : BASE; }
            else { mat = 'armor'; if (fo.trim && view === 'front' && Math.abs(col - mid) < 0.6) mat = 'trim'; }
            if (fo.trim && topRow && armor !== 'tunica') mat = 'trim';
            // nivel 4 y 5: gema en el pecho y runas que brillan
            if (!side && view !== 'back' && fo.armorGem && row === 2 && Math.abs(col - mid) < 0.6) { mat = 'agem'; slot = LIGHT; }
            if (fo.armorGlow && !side && row >= 3 && row < shirtRows - 1 && Math.abs(Math.abs(col - mid) - 2) < 0.6 && (row + (col > mid ? 1 : 0)) % 2 === 0) { mat = 'aglow'; slot = BASE; }
            if (fo.armorGlow && topRow && armor !== 'tunica') { mat = 'aglow'; slot = BASE; }
          }
          // cuello en V (piel) o de polo (puntas claras y la tapeta)
          if (view === 'front' && !fo.jacket && !armor) {
            if (fo.collar === 'v' && ((row === 0 && Math.abs(col - mid) <= 1) || (row === 1 && Math.abs(col - mid) < 0.6))) mat = 'skin';
            if (fo.collar === 'polo') {
              if (row === 0 && Math.abs(Math.abs(col - mid) - 1.5) <= 0.6) { mat = 'top'; slot = LIGHT; }
              if (row >= 1 && row <= 2 && Math.abs(col - mid) < 0.6) { mat = 'top'; slot = SHADOW; }
            }
          }
        }
        if (isPants && armor === 'tunica') mat = 'armor';
        // cinturón: la fila de arriba del pantalón, con hebilla al centro de frente
        if (isPants && fo.belt && u > d.pantsRows - 0.5) {
          const col = Math.round(rr - tx0), mid = (d.torsoW - 1) / 2;
          mat = view === 'front' && Math.abs(col - mid) < 0.6 ? (fo.trim ? 'trim' : 'belt') : 'belt';
          slot = view === 'front' && Math.abs(col - mid) < 0.6 ? LIGHT : BASE;
        }
        part.set(x, y, mat, slot);
      }
    // número de camiseta, de frente o de espalda (contorno de la camisa)
    const numPx = new Set<number>();
    const num = armor ? undefined : f.outfit.number;
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
            if (c === '#' && (part.get(px, py)?.mat === 'top' || part.get(px, py)?.mat === 'top2')) numPx.add(Part.key(px, py));
          }),
        ),
      );
    }
    // estampado del pecho: un parche de color (la letra no cabe), de frente y de lado
    const print = f.outfit.print;
    if (print && view !== 'back' && Math.abs(theta) < 20 && d.torsoW >= 7) {
      const pw = d.torsoW >= 12 ? 3 : 2, ph = d.torsoH - d.pantsRows >= 7 ? 3 : 2;
      const x0 = side ? tx1 - pw : tx1 - pw - 1;
      const y0 = -d.torsoH + 2;
      for (let j = 0; j < ph; j++)
        for (let i = 0; i < pw; i++) {
          const px = x0 + i + Math.round(shear * (d.torsoH - 2 - j)), py = y0 + j;
          // un patrón de letras: pixeles alternos en la fila del medio
          if (j === 1 && i % 2 === 1 && ph >= 3) continue;
          if (part.get(px, py)?.mat === 'top') numPx.add(Part.key(px, py) + 0.5);
        }
    }
    const numPaint = { color: packHex(f.outfit.numberColor ?? '#ffffff'), dark: mats.paint('top', 0).dark, mat: mats.id('top') };
    const printPaint = print ? { color: packHex(print), dark: mats.paint('top', 0).dark, mat: mats.id('top') } : numPaint;
    for (const [x, y, p] of part.entries()) {
      let slot = p.slot;
      if (!part.has(x - 1, y) && slot >= BASE) slot = SHADOW;
      const k = Part.key(x, y);
      canvas.put(x, y, Layer.Torso, numPx.has(k) ? numPaint : numPx.has(k + 0.5) ? printPaint : mats.paint(p.mat, slot));
    }
  };

  // capa: detrás del cuerpo; de espalda va encima del torso. Se va hacia atrás con el movimiento (como el pelo)
  const drawCape = () => {
    if (!fo.cape) return;
    const part = new Part();
    const bot = -(d.legUpper + Math.round(d.legLower * 0.6));
    const sway = Math.round((pose.hair?.dx ?? 0) * 2);
    const top = d.torsoH - 1;
    const pts: [number, number][] = side
      ? [[tx0 - 1, top], [tx0 + 3, top], [tx0 + 1 + sway, bot], [tx0 - 4 + sway, bot]]
      : [[tx0, top], [tx1, top], [tx1 + 2, bot], [tx0 - 2, bot]];
    polygon(part, pts.map(([r, uu]) => local(side ? r : r * sign, uu)), 'cape');
    commit(part, view === 'back' ? Layer.ArmUp : Layer.Behind);
  };

  const drawSkirt = () => {
    const robe = armor === 'tunica';
    if (f.outfit.bottom !== 'skirt' && !robe) return;
    const part = new Part();
    // túnica: larga hasta los tobillos, del color de la armadura y con ribete abajo
    const len = robe ? d.legUpper + d.legLower - 1 : Math.max(2, Math.round(d.legUpper * 0.9));
    for (let v = -d.pantsRows; v <= len; v++) {
      const grow = v > 0 ? Math.min(2, Math.ceil((v / len) * 2)) : 0;
      for (let r = tx0 - grow; r <= tx1 + grow; r++) {
        const [x, y] = local(side ? r : r * sign, -v);
        if (robe) part.set(Math.round(x), Math.round(y), v === len && fo.trim ? 'trim' : 'armor', v === len && !fo.trim ? SHADOW : BASE);
        else part.set(Math.round(x), Math.round(y), 'bottom', v === len ? SHADOW : BASE);
      }
    }
    commit(part, Layer.Skirt);
  };

  // ---------- cabeza ----------
  const drawHead = () => {
    const forward = side && !style ? Math.max(1, Math.round(d.u * 1.2)) : 0;
    const neck = local(forward, d.torsoH);
    const av = f.avatar;
    const useLpc = lpcBox;
    const hi: HeadImage & { pal: { dark?: string }[] } = useLpc
      ? lpcHead(av!.lpc!, viewIn === 'se' ? 'front34' : view, { skin: f.palette.skin[BASE], hair: f.palette.hair[BASE], eyes: f.palette.eyes, beard: av!.beard.color, glasses: av!.glasses.color }, pose.face.eyes, pose.face.mouth ?? f.face.mouth) as HeadImage & { pal: { dark?: string }[] }
      : avatarHead && style
      ? renderHeadModel(modelFromAvatar(f.avatar!), {
          width: d.headW, style,
          yaw: viewIn === 'se' ? 34 : viewIn === 'ne' ? 146 : view === 'front' ? 0 : view === 'back' ? 180 : SIDE_YAW - (pose.head.yaw ?? 0),
          eyes: pose.face.eyes, mouth: pose.face.mouth ?? (f.face.mouth === 'open' ? 'line' : f.face.mouth),
          skin: f.palette.skin[BASE], hair: f.palette.hair[BASE],
        }) as HeadImage & { pal: { dark?: string }[] }
      : buildHeadImage(f, set!, view, pose.face.eyes, pose.face.mouth);
    // tilt es cabeceo (se piensa de lado): de frente o de espalda no gira la cabeza, solo le da un toque de vida
    const angle = Math.round(rawTheta * (Math.abs(rawTheta) > 45 ? 1 : 0.6) + (side ? pose.head.tilt : Math.max(-6, Math.min(6, pose.head.tilt * 0.15))));
    let img = hi.img, px = hi.anchor.x, py = hi.anchor.y;
    if (Math.abs(angle) >= 8) {
      const r = rotSprite(hi.img, angle, hi.anchor.x + 0.5, hi.anchor.y + 0.5);
      img = r.img; px = r.px - 0.5; py = r.py - 0.5;
    }
    // en diagonal la cabeza de frente o de espalda se corre un poco hacia donde mira
    const lean = diag ? Math.max(1, Math.round(d.u * 1.5)) : 0;
    const ox = Math.round(neck[0] - px + pose.head.dx + lean), oy = Math.round(neck[1] - py + pose.head.dy);
    const hair = pose.hair ?? { dx: 0, dy: 0 };
    for (let y = 0; y < img.h; y++)
      for (let x = 0; x < img.w; x++) {
        const i = img.idx[y * img.w + x];
        if (i < 0) continue;
        const e = hi.pal[i];
        const matName = e.mat === 'face' ? 'skin' : e.mat === 'beard' ? 'hair' : e.mat;
        const dk = hi.pal[i].dark;
        const paint = dk ? { color: packHex(e.hex), dark: packHex(dk), mat: mats.id(matName) } : mats.custom(e.hex, matName);
        if (e.back) canvas.put(ox + x + Math.round(hair.dx), oy + y + Math.round(hair.dy), Layer.HairBack, paint);
        else canvas.put(ox + x, oy + y, Layer.Head, paint);
      }
  };

  // ---------- implementos en manos y pies ----------
  const props = opt.props === false ? [] : pose.props ?? [];
  // el equipo de la ficha reemplaza la espada y el escudo de las animaciones
  const gear = f.gear;
  const gearKind = (k: PropKind): PropKind | null =>
    k === 'sword' && gear && gear.main !== undefined ? gear.main : k === 'shield' && gear && gear.off !== undefined ? gear.off : k;
  const drawAttached = (behind: boolean) => {
    for (const raw of props) {
      if (raw.at === 'ground' || !!raw.behind !== behind) continue;
      const kind = gearKind(raw.kind);
      if (!kind) continue;
      const pr = { ...raw, kind };
      const part = new Part();
      const anchor: [number, number] =
        pr.at === 'handNear' ? arms.near.end : pr.at === 'handFar' ? arms.far.end : pr.at === 'footNear' ? legs.near.end : pr.at === 'footFar' ? legs.far.end : local(0, d.torsoH / 2);
      const p: [number, number] = [anchor[0] + (pr.x ?? 0) * (side ? 1 : diag ? DIAG_X : sign), anchor[1] + (pr.y ?? 0)];
      // sin ángulo dado, el implemento sigue al antebrazo
      const limb = pr.at === 'handFar' ? arms.far : pr.at === 'handNear' ? arms.near : null;
      const auto = limb ? (Math.atan2(limb.end[1] - limb.mid[1], limb.end[0] - limb.mid[0]) * 180) / Math.PI : 0;
      let ang = pr.angle !== undefined && side ? pr.angle : auto;
      // armas largas con el brazo colgando: el báculo y la lanza van parados, el arco vertical
      const down = Math.sin((auto * Math.PI) / 180) > 0.5;
      const rest = pr.angle === undefined && down && (kind === 'staff' || kind === 'spear' || kind === 'scythe');
      if (rest) {
        // parado al costado y más largo que el cuerpo, la punta asoma por encima de la cabeza
        ang = side ? -62 : -90;
        // la altura del arma no sigue el vaivén de la mano (la mano se desliza por el asta): así no "salta" al caminar
        p[1] = local(0, Math.round(d.torsoH * 0.25))[1];
        if (!side) { const cx = local(0, d.torsoH / 2)[0]; p[0] += Math.sign(p[0] - cx || 1) * Math.round(3 * d.u); }
      }
      if (pr.angle === undefined && down && kind === 'bow') ang = 0;
      // armas cortas con el brazo colgando: hacia adelante y abajo, sin tocar el piso
      const hangs = !rest && pr.angle === undefined && down && limb && WEAPON_SET.has(kind) && kind !== 'bow';
      if (hangs) {
        if (side) ang = 28;
        else { const cx = local(0, d.torsoH / 2)[0]; ang = p[0] >= cx ? (view === 'back' ? 12 : 32) : (view === 'back' ? 168 : 148); }
        // la mano casi en el piso (gatear): el arma se acuesta, si no se metería en el suelo
        const floor = Math.max(legs.near.end[1], legs.far.end[1]);
        if (p[1] > floor - 6 * d.u) ang = side ? 0 : p[0] >= local(0, d.torsoH / 2)[0] ? 0 : 180;
      }
      // un arma que apunta hacia afuera (el torbellino, un ataque largo) no puede salirse del cuadro: se levanta lo justo
      if (!rest && !hangs && WEAPON_SET.has(kind) && kind !== 'bow') {
        const reach = (WEAPON_REACH[kind as keyof typeof WEAPON_REACH] ?? 10) * d.u;
        const lim = C / 2 - 3;
        const hx = p[0]; // las piezas se dibujan con el pivote en 0
        const cos = Math.cos((ang * Math.PI) / 180);
        if (Math.abs(hx + reach * cos) > lim) {
          const room = Math.max(-1, Math.min(1, (Math.sign(cos) * lim - hx) / reach));
          const a = (Math.acos(room) * 180) / Math.PI;
          ang = -a;
        }
      }
      if (isBall(pr.kind)) drawBall(part, pr.kind, p, d.u);
      else drawHeld(part, pr.kind, p, ang, d.u, rest);
      const handUp = !!limb && view !== 'back' && (side ? limb === arms.near : true) && limb.end[1] < local(0, d.torsoH)[1] + 1;
      const pointsUp = !isBall(pr.kind) && view !== 'back' && Math.sin((ang * Math.PI) / 180) < -0.3;
      commit(part, behind ? Layer.Behind : rest && view !== 'back' ? Layer.Prop : (handUp || pointsUp) && !isBall(pr.kind) ? Layer.ArmUp : Layer.Prop, false, false);
    }
  };

  // orden de dibujo: lo de atrás primero
  drawAttached(true);
  if (side) {
    drawArm(true, L_FAR_ARM);
    drawLeg(true, L_FAR_LEG);
    drawLeg(false, Layer.NearLeg);
  } else if (diag) {
    // en diagonal el brazo y la pierna "far" quedan del lado de la cámara
    drawLeg(false, Layer.FarLeg);
    drawLeg(true, Layer.NearLeg);
    drawArm(false, Layer.FarArm);
  } else {
    drawLeg(true, L_FAR_LEG);
    drawLeg(false, Layer.NearLeg);
    if (view === 'back') { drawArm(true, L_FAR_ARM); drawArm(false, L_NEAR_ARM); }
  }
  drawCape();
  drawSkirt();
  drawTorso();
  drawHead();
  // si la mano queda más arriba que la barbilla, el brazo va detrás de la cabeza
  const chinY = local(0, d.torsoH)[1];
  const upLayer = (p: { end: [number, number] }, normal: number) => (p.end[1] < chinY + 1 ? Layer.ArmUp : normal);
  if (side) drawArm(false, upLayer(arms.near, Layer.NearArm));
  else if (diag) drawArm(true, upLayer(arms.far, Layer.NearArm));
  else if (view === 'front') { drawArm(true, upLayer(arms.far, L_FAR_ARM)); drawArm(false, upLayer(arms.near, L_NEAR_ARM)); }
  drawAttached(false);

  // ---------- piso: el punto más bajo toca el suelo (o queda a `air` pixeles) ----------
  // el piso lo toca el cuerpo: un hacha o un báculo que cuelgan más abajo que los pies no levantan al personaje
  const bbAll = canvas.bbox();
  const bbBody = gear ? bodyBox(canvas, 0, 0) : null;
  const bb = bbBody ? { y1: bbBody.y1 } : bbAll;
  const hipH = pose.hipH;
  const groundCanvas = hipH !== undefined ? canvas.oy + Math.round(hipH) : (bb ? bb.y1 + 1 : canvas.oy) + Math.round(pose.air);
  for (const pr of props) {
    if (pr.at !== 'ground') continue;
    const part = new Part();
    const gx = Math.round((pr.x ?? 0) * (side ? 1 : diag ? DIAG_X : sign));
    const gy = groundCanvas - canvas.oy;
    if (isBall(pr.kind)) {
      const s = ballSize(pr.kind, d.u);
      drawBall(part, pr.kind, [gx, gy - 1 - (s - 1) / 2 - (pr.y ?? 0)], d.u);
    } else drawGround(part, pr.kind, gx, gy - 1 - (pr.y ?? 0), d.u, pr.angle ?? 0);
    commit(part, pr.behind ? Layer.Behind : pr.kind === 'bike' || pr.kind === 'skate' ? Layer.PropMid : Layer.Prop, false, false);
  }

  // con piezas dibujadas, el pelo (colitas, melenas) puede recortarse en el borde de la celda en poses extremas:
  // la caja que decide el encuadre es la del cuerpo y la cara, más el contorno
  const soft = lpcBox ? bodyBox(canvas, 0, 0, mats.id('hair')) : null;
  if (!opt.noOutline)
    finalizeOutlines(canvas, {
      fused: [[Layer.FarLeg, Layer.Torso], [Layer.NearLeg, Layer.Torso], [Layer.Skirt, Layer.Torso]],
    });

  const groundRow = C + d.groundY;
  const dy = groundRow - groundCanvas;
  const dx = Math.round(pose.x * (side ? 1 : diag ? DIAG_X : sign));
  const J = (p: [number, number]): [number, number] => [p[0] + canvas.ox + dx, p[1] + canvas.oy + dy];
  const neck = local(side ? Math.max(1, Math.round(d.u * 1.2)) : 0, d.torsoH);
  const joints: Joints = {
    hip: J([0, 0]), hipNear: J(legs.near.root), hipFar: J(legs.far.root), footNear: J(legs.near.end), footFar: J(legs.far.end),
    shoulderNear: J(arms.near.root), shoulderFar: J(arms.far.root), handNear: J(arms.near.end), handFar: J(arms.far.end),
    neck: J(neck), head: J(add(neck, local(0, d.headW * 0.5))),
  };
  const body = soft ? { x0: soft.x0 - 1 + dx, y0: soft.y0 - 1 + dy, x1: soft.x1 + 1 + dx, y1: soft.y1 + 1 + dy } : bodyBox(canvas, dx, dy);
  const full = soft ? bodyBox(canvas, dx, dy) : body;
  return { raster: toRaster(canvas, 0, 0, W, H, dx, dy), pivotX: canvas.ox, groundRow, body, full, joints };
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
