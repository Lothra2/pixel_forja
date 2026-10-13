import { type Raster } from '../core/raster';
import { type HumanFicha, type CellSize, usesAvatar, ARMOR_DEFAULT_COLOR } from '../sheet/ficha';
import { dimsFor, type Dims } from '../rig/dims';
import { type Pose, type Arm, type Foot, type PropKind, solveTwoBone, WEAPON_KINDS } from '../rig/pose';

const WEAPON_SET = new Set<PropKind>(WEAPON_KINDS);
import { type Ramp, SHADOW, BASE, LIGHT, makeRamp } from '../color/ramp';
import { LayerCanvas, Layer, finalizeOutlines, toRaster, packHex } from './canvas';
import { Materials, PROP_COLORS } from './materials';
import { Part, stroke, blob, rot, polygon } from './part';
import { buildHeadImage, type View, type HeadImage } from './head';
import { renderHeadModel, HEAD_STYLES } from '../head3d/render';
import { modelFromAvatar } from '../head3d/avatar';
import { lpcHead } from '../parts/lpc';
import { rotSprite } from './rotsprite';
import { drawBall, drawHeld, drawGround, isBall, ballSize, drawHeldFloorProp, FLOOR_PROPS, type FloorPropKind } from './props';
import { findLoot } from '../loot/catalog';
import { handMaterials } from '../loot/render';

export type { View } from './head';

export interface RenderOptions {
  /** dibujar balones y implementos */
  props?: boolean;
  noOutline?: boolean;
  /** premium: los implementos nunca cuentan como cuerpo para encuadrar, aunque se dibujen en la capa del brazo */
  propsApart?: boolean;
  /** el arma del piso que va en la mano en las animaciones de armas (sin esto no se dibuja, solo se exporta dónde va) */
  held?: { kind: FloorPropKind; variant?: number };
  /**
   * sin pelotas (`sin_props` del kit a medida): el cuadro sale sin las pelotas, pero todo lo demás se mide con ellas
   * (el piso, las cajas, el encuadre), así el cuerpo queda en el mismo pixel. Dónde iba cada una sale en `pelotas`
   */
  sinPelotas?: boolean;
  /** uso interno de sinPelotas: el piso ya medido con las pelotas (fila del lienzo) */
  suelo?: number;
}

/** Una pelota dibujada: centro exacto (puede caer en medio pixel), diámetro sin el contorno y si va detrás del cuerpo. */
export interface BallAt { kind: PropKind; x: number; y: number; d: number; behind: boolean }

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
  /** todo lo que es persona, también el pelo que cuelga atrás (para centrar a alguien acostado) */
  whole?: { x0: number; y0: number; x1: number; y1: number } | null;
  /** articulaciones en coordenadas del cuadro grande (para el editor de poses) */
  joints?: Joints;
  /** el arma en la mano: agarre, ángulo en pantalla (0 = derecha, horario) y si va detrás del cuerpo */
  held?: { x: number; y: number; angle: number; behind: boolean };
  /** las pelotas del cuadro (dibujadas o no), en coordenadas continuas del cuadro grande */
  pelotas?: BallAt[];
  /** fila del lienzo donde quedó el piso (para dibujar el mismo cuadro sin pelotas) */
  suelo?: number;
}

export type JointName = 'hip' | 'hipNear' | 'hipFar' | 'footNear' | 'footFar' | 'shoulderNear' | 'shoulderFar' | 'handNear' | 'handFar' | 'neck' | 'head' | 'elbowNear' | 'elbowFar' | 'frente';
/** `carry`: dónde se apoya lo que se lleva (solo en las poses con `load`): entre las manos, arriba de las palmas */
export type Joints = Record<JointName, [number, number]> & { carry?: [number, number] };

/** Caja de lo que no es implemento, ya en coordenadas del cuadro grande. */
/** Implementos largos que se sostienen (garrocha, jabalina): nunca marcan el piso. */
export const LONG_HELD = new Set<string>(['pole', 'javelin']);

// las capas en constantes locales: leerlas del módulo en cada pixel pasaba por un getter
const L_PROP: number = Layer.Prop, L_PROPMID: number = Layer.PropMid, L_BEHIND: number = Layer.Behind, L_HAIRBACK: number = Layer.HairBack;

export function bodyBox(c: LayerCanvas, dx: number, dy: number, softMat = -99, withHairBack = false, skipMats?: Set<number>): BigFrame['body'] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const { w, h } = c;
  const layer = c.layer, mat = c.mat;
  // los materiales que se saltan, en una tabla (el Set por pixel pesaba): el índice es el material + 2 (el contorno es -2)
  let maxMat = 0;
  if (skipMats) for (const m of skipMats) if (m > maxMat) maxMat = m;
  const skip = new Uint8Array(maxMat + 3);
  if (skipMats) for (const m of skipMats) if (m >= -2) skip[m + 2] = 1;
  const salta = (m: number) => m >= -2 && m <= maxMat && skip[m + 2] === 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const l = layer[i];
      // lo vacío no cuenta: se descarta antes que nada porque es casi todo el lienzo
      if (!l) continue;
      const m = mat[i];
      if (m === softMat || (skipMats && salta(m))) continue;
      // contorno (-2) que solo toca implementos: también es del implemento
      if (m === -2 && skipMats) {
        let prop = false, other = false;
        for (let k = 0; k < 4; k++) {
          const ax = k === 0 ? x - 1 : k === 1 ? x + 1 : x, ay = k === 2 ? y - 1 : k === 3 ? y + 1 : y;
          if (ax < 0 || ay < 0 || ax >= w || ay >= h) continue;
          const n = mat[ay * w + ax];
          if (n < 0) continue;
          if (salta(n)) prop = true; else other = true;
        }
        if (prop && !other) continue;
      }
      // el pelo largo que cuelga detrás puede recortarse en el borde, como un balón
      if (l === L_PROP || l === L_PROPMID || l === L_BEHIND || (l === L_HAIRBACK && !withHairBack)) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  return isFinite(x0) ? { x0: x0 + dx, y0: y0 + dy, x1: x1 + dx, y1: y1 + dy } : null;
}

/** emblemas del pecho: # el color del emblema, o el fondo (óvalo), . la camisa */
const EMBLEMS: Record<'spider' | 'bat', { plain: string[]; oval: string[] }> = {
  spider: { plain: ['#.#.#', '.###.', '#.#.#'], oval: ['.ooooo.', 'o#o#o#o', 'oo###oo', 'o#o#o#o', '.ooooo.'] },
  bat: { plain: ['#.#.#', '#####', '.#.#.'], oval: ['.ooooooo.', 'o##o#o##o', 'o#######o', '.oo#o#oo.'] },
};

const DIGITS: Record<string, string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'], '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '..#', '.#.', '.#.'], '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
};

/** números bajitos (4 filas) para camisas cortas */
const DIGITS4: Record<string, string[]> = {
  '0': ['###', '#.#', '#.#', '###'], '1': ['##.', '.#.', '.#.', '###'], '2': ['##.', '..#', '.#.', '###'], '3': ['###', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#'], '5': ['###', '##.', '..#', '##.'], '6': ['#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.'],
  '8': ['###', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#'],
};

/** letras de 3 x 5 para el pecho (las iniciales de un equipo) */
const GLYPHS: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'], G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'], ...DIGITS,
};
/** la letra en 4 filas (camisas cortas): sin la cuarta fila; G, S y los números tienen la suya */
const GLYPHS4: Record<string, string[]> = { G: ['.##', '#..', '#.#', '.##'], S: ['.##', '#..', '..#', '##.'], ...DIGITS4 };
const compact = (ch: string) => GLYPHS4[ch] ?? GLYPHS[ch].filter((_, i) => i !== 3);

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
  if (opt.sinPelotas && opt.props !== false && pose.props?.some((q) => isBall(q.kind))) {
    // dos pasadas: con las pelotas se mide todo (piso, cajas, articulaciones); sin ellas, con el mismo piso, se pinta.
    // Así el cuerpo no se mueve ni un pixel: solo cambia donde estaba la pelota (y su contorno)
    const con = renderHuman(f, cell, pose, viewIn, { ...opt, sinPelotas: false });
    const sin = renderHuman(f, cell, { ...pose, props: pose.props.filter((q) => !isBall(q.kind)) }, viewIn, { ...opt, sinPelotas: false, suelo: con.suelo });
    return { ...con, raster: sin.raster };
  }
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
    shoes: ink(f.palette.shoes), accessory: ink(f.palette.accessory), face: ink(f.palette.skin), ears: ink(f.palette.skin),
  } as Record<string, Ramp>);
  const fo = f.outfit;
  if (fo.pattern && fo.pattern !== 'liso') mats.add('top2', ink(makeRamp(fo.pattern2 ?? '#f2f2f2')));
  if (fo.jacket) mats.add('jacket', ink(makeRamp(fo.jacket)));
  const gakuran = !!fo.jacket && fo.jacketCut === 'gakuran';
  if (gakuran) mats.add('jbutton', ink(makeRamp(fo.buttons ?? '#e2b23c')));
  if (fo.armband) mats.add('armband', ink(makeRamp(fo.armband)));
  if (fo.neck) mats.add('neck', ink(makeRamp(fo.neck.color)));
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
  const abierto = fo.shoes === 'chancletas' || fo.shoes === 'sandalias';
  const shoeMat = armor === 'placas' ? 'armor' : fo.shoes === 'descalzo' || abierto ? 'skin' : 'shoes';
  // chancletas: el pie descalzo y la suela de color abajo. Sandalias: además la tira de arriba
  const pieMat = (r: number) => (abierto && (r === 0 || (fo.shoes === 'sandalias' && r === 2)) ? 'shoes' : shoeMat);
  const side = view === 'side';
  const sign = view === 'back' ? -1 : 1; // de espalda, lo "cercano" queda a la izquierda
  // en vista lateral el torso se inclina. De frente o espalda, `torso` no rota (se ve igual) y `roll` sí
  const rawTheta = side ? pose.torso : diag ? (pose.roll ? pose.roll : pose.torso * (pose.flat ? 1 : DIAG_LEAN)) : pose.roll ?? 0;
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
    // con brazos libres se mide hacia dónde apunta el brazo en el mundo (acostado, 180 es al frente, no arriba)
    const world = pose.freeArms && (side || diag) ? shoulder - theta : shoulder;
    const up = ((world % 360) + 360) % 360;
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
    // chaqueta sin mangas (chaleco): se ven las mangas de la camiseta
    const jacketArms = !!fo.jacket && (fo.jacketSleeves ?? 'long') !== 'none';
    const sleeve = armor === 'tunica' ? 'long' : jacketArms ? fo.jacketSleeves ?? 'long' : f.outfit.sleeves;
    const sm = jacketArms ? 'jacket' : armor === 'tunica' ? 'armor' : 'top';
    // malla y placas cubren el brazo; con placas también el antebrazo y la mano (guantelete)
    const metalUp = armor === 'malla' || armor === 'placas', metalLow = armor === 'placas';
    // brazalete: una franja en la parte de arriba del brazo cercano (1 pixel en 32, 2 en 48 y 64)
    const upLen = Math.max(1, Math.hypot(p.mid[0] - p.root[0], p.mid[1] - p.root[1]));
    const band = fo.armband && !far && !metalUp ? [0.3, 0.3 + (cell >= 48 ? 2 : 1) / upLen] : null;
    stroke(part, p.root, p.mid, d.armT, (t) =>
      band && t >= band[0] && t < band[1] ? 'armband' : metalUp ? 'armor' : sleeve === 'long' || (sleeve === 'short' && t < 0.6) ? sm : 'skin');
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
      for (let r = 0; r < d.footH; r++) for (let x = x0; x < x0 + fw; x++) part.set(x, yb - r, pieMat(r), r === 0 && d.footH >= 2 ? SHADOW : BASE);
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
          part.set(x, y, pieMat(r), slot);
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

  // número de camiseta y letras del pecho: van al final, cuando ya está todo dibujado, para buscar dónde no los tapen
  // la cabeza ni los brazos
  let torsoPart: Part | null = null;
  const drawChestMarks = () => {
    if (!torsoPart) return;
    const numPx = new Set<number>();
    const txtPx = new Set<number>();
    const shirtRowsT = d.torsoH - d.pantsRows;
    const part = torsoPart!;
    // ya está todo dibujado: un pixel tapado es uno con algo de más adelante encima (barbilla, barba, pelo, brazos) o
    // pegado a eso (ahí va su contorno)
    const over = (X: number, Y: number) => X >= 0 && Y >= 0 && X < canvas.w && Y < canvas.h && canvas.layer[Y * canvas.w + X] > Layer.Torso;
    const covered = (px: number, py: number) => {
      const X = px + canvas.ox, Y = py + canvas.oy;
      return over(X, Y) || over(X, Y - 1) || over(X, Y + 1) || over(X - 1, Y) || over(X + 1, Y);
    };
    interface Spot { glyphs: string[][]; row: number; lean: boolean }
    const pixelsOf = ({ glyphs, row, lean }: Spot, shift: number) => {
      const w = glyphs.length * 4 - 1;
      const x0 = -Math.floor(w / 2) - (d.torsoW % 2 === 0 ? 1 : 0) + (w % 2 === 0 ? 1 : 0) + shift;
      const y0 = -d.torsoH + row;
      const keys: number[] = [];
      let total = 0, hiddenBelowTop = 0;
      const hidden = glyphs.map(() => 0);
      glyphs.forEach((g, k) => g.forEach((line, jj) => [...line].forEach((c, ii) => {
        if (c !== '#') return;
        total++;
        const px = x0 + k * 4 + ii + (lean ? Math.round(shear * (d.torsoH - 2 - jj)) : 0), py = y0 + jj;
        const m = part.get(px, py)?.mat;
        if ((m !== 'top' && m !== 'top2' && m !== 'jacket') || covered(px, py)) { hidden[k]++; if (jj > 0) hiddenBelowTop++; return; }
        keys.push(Part.key(px, py));
      })));
      return { keys, total, hidden: hidden.reduce((a, b) => a + b, 0), most: Math.max(...hidden), hiddenBelowTop };
    };
    // el primer lugar donde se ve completo (al medio o corrido un pixel). Si no hay, uno donde la barbilla o la barba
    // tapan como mucho un pixel de arriba de cada letra (se sigue leyendo). A medias no se dibuja
    const place = (spots: Spot[], set: Set<number>) => {
      const all = spots.flatMap((s) => [0, 1, -1].map((sh) => pixelsOf(s, sh)));
      const ok = all.find((r) => r.total && !r.hidden) ?? all.find((r) => r.total && !r.hiddenBelowTop && r.most <= 1);
      if (!ok) return false;
      for (const k of ok.keys) set.add(k);
      return true;
    };
    const rowsFrom = (h: number, first: number) => [first, ...Array.from({ length: Math.max(0, shirtRowsT - h + 1) }, (_, k) => k).filter((k) => k !== first)];
    const num = armor ? undefined : f.outfit.number;
    const text = armor ? undefined : f.outfit.chestText?.toUpperCase();
    if (num && !side && Math.abs(theta) < 20 && (!text || view === 'back')) {
      const digits = num.slice(0, 2).split('').filter((ch) => DIGITS[ch]);
      const wNum = digits.length * 4 - 1;
      if (digits.length && d.torsoW >= wNum + 1) {
        // primero donde iba siempre; si la cabeza lo tapa, más abajo o con los números bajitos
        const tall = digits.map((ch) => DIGITS[ch]), low = digits.map((ch) => DIGITS4[ch]);
        const spots: Spot[] = [];
        if (shirtRowsT >= 6) spots.push(...rowsFrom(5, Math.max(1, Math.floor((shirtRowsT - 5) / 2) + 1)).map((row) => ({ glyphs: tall, row, lean: false })));
        if (shirtRowsT >= 4) spots.push(...rowsFrom(4, shirtRowsT >= 5 ? 1 : 0).map((row) => ({ glyphs: low, row, lean: false })));
        place(spots, numPx);
      }
    }
    // letras en el pecho, de frente y en diagonal: todas si caben; si no, la primera. Abajo de la camisa primero
    if (text && !side && view !== 'back' && Math.abs(theta) < 20 && shirtRowsT >= 4) {
      const all = text.slice(0, 3).split('').filter((ch) => GLYPHS[ch]);
      const fit = (n: number) => d.torsoW >= n * 4 - 1 + 1;
      // todas las letras; si no se ven, solo la primera
      for (const use of [all, all.slice(0, 1)]) {
        if (!use.length || !fit(use.length) || txtPx.size) continue;
        const spots: Spot[] = [];
        if (shirtRowsT >= 7) spots.push(...rowsFrom(5, shirtRowsT - 5).map((row) => ({ glyphs: use.map((ch) => GLYPHS[ch]), row, lean: true })));
        spots.push(...rowsFrom(4, shirtRowsT - 4).map((row) => ({ glyphs: use.map(compact), row, lean: true })));
        place(spots, txtPx);
      }
      // si ninguna letra se ve entera (pecho chico o tapado por la barbilla): un parche del color al medio, abajo
      if (!txtPx.size) {
        const pw = d.torsoW >= 7 ? 3 : 2, x0 = -Math.floor(pw / 2) - (d.torsoW % 2 === 0 && pw % 2 === 1 ? 1 : 0);
        for (let j = 0; j < 2; j++) for (let i = 0; i < pw; i++) {
          const py = -d.torsoH + shirtRowsT - 2 + j, px = x0 + i + Math.round(shear * (d.torsoH - 2 - (shirtRowsT - 2 + j)));
          if (part.get(px, py)?.mat === 'top' && !covered(px, py)) txtPx.add(Part.key(px, py));
        }
      }
    }
    const numPaint = { color: packHex(f.outfit.numberColor ?? '#ffffff'), dark: mats.paint('top', 0).dark, mat: mats.id('top') };
    const txtPaint = { color: packHex(f.outfit.chestTextColor ?? '#f2c230'), dark: mats.paint('top', 0).dark, mat: mats.id('top') };
    for (const k of numPx) { const [x, y] = Part.unkey(k); canvas.put(x, y, Layer.Torso, numPaint); }
    for (const k of txtPx) { const [x, y] = Part.unkey(k); canvas.put(x, y, Layer.Torso, txtPaint); }
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
            // flores sueltas (la bata de casa): un punto cada tanto, corrido fila por fila
            : pat === 'flores' ? (col * 3 + row * 5) % 7 === 0 && row < shirtRows
            // guayabera: una alforza vertical a cada lado del pecho (dos si el torso es ancho); con torso par el medio cae entre pixeles
            : pat === 'guayabera' ? !side && (Math.abs(Math.abs(col - mid) - 1.75) <= 0.25 || (d.torsoW >= 10 && Math.abs(Math.abs(col - mid) - 3.75) <= 0.25)) && row >= 1 && row < shirtRows
            : false;
          if (on) mat = 'top2';
          // chaqueta abierta: de frente se ve la camiseta al medio; de lado y de espalda, casi toda chaqueta
          if (fo.jacket) {
            const open = fo.jacketClosed ? false : view === 'front' ? Math.abs(col - mid) < d.torsoW * 0.22 : side ? rr > tx1 - 1.5 : false;
            if (!open) mat = 'jacket';
            if (gakuran && !open) {
              // cuello alto: la fila de arriba sin brillo, pegada a la barbilla
              if (topRow) slot = BASE;
              // botones dorados, uno sí y otro no desde abajo (arriba los tapa la barbilla): cerrado, al medio (de lado, en el borde de adelante); abierto, en el borde de la abertura
              const btnCol = fo.jacketClosed
                ? view === 'front' ? col === Math.round(mid) : side ? rr > tx1 - 0.5 : false
                : view === 'front' && Math.abs(Math.abs(col - mid) - d.torsoW * 0.22) < 0.75 && col > mid;
              if (btnCol && row >= 1 && (shirtRows - 1 - row) % 2 === 0 && d.torsoW >= 6) { mat = 'jbutton'; slot = LIGHT; }
            }
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
          // al cuello: la bufanda da la vuelta arriba y cuelga una punta; la pañoleta es un triángulo al frente
          if (fo.neck && !armor) {
            if (fo.neck.kind === 'bufanda') {
              // la vuelta al cuello: las dos filas de arriba de lado a lado, y la punta de dos pixeles que cuelga
              if (row <= 1) { mat = 'neck'; slot = row === 0 ? LIGHT : BASE; }
              // la punta cuelga hacia un lado (al centro se lee como corbata); en un torso angosto no hay más lugar que cerca del medio
              const pc = Math.round(mid) + (d.torsoW >= 9 ? 2 : 1);
              const punta = view === 'front' || diag ? col === pc || col === pc + 1 : side ? rr > tx1 - 2.5 : false;
              if (punta && row >= 2 && row <= Math.min(5, shirtRows - 1)) { mat = 'neck'; slot = col === pc + 1 || row % 2 ? SHADOW : BASE; }
            } else if (view === 'front' || diag) {
              if (row <= 1 || (row === 2 && Math.abs(col - mid) <= 1.5) || (row === 3 && Math.abs(col - mid) <= 0.6)) { mat = 'neck'; slot = row === 0 ? LIGHT : BASE; }
            } else if (row === 0) { mat = 'neck'; slot = BASE; }
          }
          // cuello en V (piel) o de polo (puntas claras y la tapeta)
          if (view === 'front' && !fo.jacket && !armor && !fo.neck) {
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
    // número de camiseta, de frente o de espalda (contorno de la camisa). Con letras en el pecho, solo de espalda.
    // Cabe si sobra al menos un pixel; con pocas filas de camisa, los números bajitos (de 4 filas)
    const numPx = new Set<number>();
    const text = armor ? undefined : f.outfit.chestText?.toUpperCase();
    torsoPart = part;
    // estampado del pecho: un parche de color (la letra no cabe), de frente y de lado
    const print = f.outfit.print ?? (text && side ? f.outfit.chestTextColor ?? '#f2c230' : null);
    if (print && view !== 'back' && Math.abs(theta) < 20 && d.torsoW >= 7 && !(text && !side)) {
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
    // emblema (araña, murciélago): centrado arriba del pecho, de frente y en diagonal
    const embPx = new Map<number, 'fg' | 'bg'>();
    const emb = armor ? undefined : f.outfit.emblem;
    if (emb && !side && view !== 'back' && d.torsoW >= 7 && Math.abs(theta) < 20) {
      const rows = f.outfit.emblemBg && d.torsoW >= 9 ? EMBLEMS[emb].oval : EMBLEMS[emb].plain;
      const w = rows[0].length;
      const x0 = -Math.floor(w / 2) - (d.torsoW % 2 === 0 ? 1 : 0) + (w % 2 === 0 ? 1 : 0);
      const shirtRows = d.torsoH - d.pantsRows;
      const y0 = -d.torsoH + Math.max(1, Math.min(2, shirtRows - rows.length - 1));
      rows.forEach((row, j) => [...row].forEach((c, i) => {
        if (c === '.') return;
        const px = x0 + i + Math.round(shear * (d.torsoH - 2 - j)), py = y0 + j;
        const m = part.get(px, py)?.mat;
        if (m === 'top' || m === 'top2') embPx.set(Part.key(px, py), c === '#' ? 'fg' : 'bg');
      }));
    }
    const embPaint = { color: packHex(f.outfit.emblemColor ?? '#111111'), dark: mats.paint('top', 0).dark, mat: mats.id('top') };
    const embBgPaint = { color: packHex(f.outfit.emblemBg ?? '#f2c230'), dark: mats.paint('top', 0).dark, mat: mats.id('top') };
    const printPaint = { color: packHex(print ?? '#ffffff'), dark: mats.paint('top', 0).dark, mat: mats.id('top') };
    for (const [x, y, p] of part.entries()) {
      let slot = p.slot;
      if (!part.has(x - 1, y) && slot >= BASE) slot = SHADOW;
      const k = Part.key(x, y);
      const e = embPx.get(k);
      canvas.put(x, y, Layer.Torso, e ? (e === 'fg' ? embPaint : embBgPaint) : numPx.has(k + 0.5) ? printPaint : mats.paint(p.mat, slot));
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
    // la cara de base de la ficha (la malandra de los rivales) reemplaza la cara neutra de la animación
    const base = f.face.base;
    const face = base ? {
      eyes: pose.face.eyes === 'open' && base.eyes ? base.eyes : pose.face.eyes,
      mouth: (pose.face.mouth === undefined || pose.face.mouth === 'line' || pose.face.mouth === 'smile') && base.mouth ? base.mouth : pose.face.mouth,
    } : pose.face;
    const forward = side && !style ? Math.max(1, Math.round(d.u * 1.2)) : 0;
    const neck = local(forward, d.torsoH);
    const av = f.avatar;
    const useLpc = lpcBox;
    const hi: HeadImage & { pal: { dark?: string }[] } = useLpc
      ? lpcHead(av!.lpc!, viewIn === 'se' ? 'front34' : view, { skin: f.palette.skin[BASE], hair: f.palette.hair[BASE], eyes: f.palette.eyes, beard: av!.beard.color, glasses: av!.glasses.color }, face.eyes, face.mouth ?? f.face.mouth) as HeadImage & { pal: { dark?: string }[] }
      : avatarHead && style
      ? renderHeadModel(modelFromAvatar(f.avatar!), {
          width: d.headW, style,
          yaw: viewIn === 'se' ? 34 : viewIn === 'ne' ? 146 : view === 'front' ? 0 : view === 'back' ? 180 : SIDE_YAW - (pose.head.yaw ?? 0),
          eyes: face.eyes, mouth: face.mouth ?? (f.face.mouth === 'open' ? 'line' : f.face.mouth),
          skin: f.palette.skin[BASE], hair: f.palette.hair[BASE],
        }) as HeadImage & { pal: { dark?: string }[] }
      : buildHeadImage(f, set!, view, face.eyes, face.mouth);
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
  let heldAt: { p: [number, number]; angle: number; behind: boolean } | null = null;
  // las pelotas dibujadas: centro pedido (en el lienzo, desde la cadera) y si van detrás
  const pelotas: { kind: PropKind; c: [number, number]; behind: boolean }[] = [];
  const drawAttached = (behind: boolean) => {
    for (const raw of props) {
      if (raw.at === 'ground' || !!raw.behind !== behind) continue;
      const kind = gearKind(raw.kind);
      if (!kind) continue;
      const pr = { ...raw, kind };
      const part = new Part();
      const anchor: [number, number] =
        pr.at === 'handNear' ? arms.near.end : pr.at === 'handFar' ? arms.far.end : pr.at === 'footNear' ? legs.near.end : pr.at === 'footFar' ? legs.far.end : pr.at === 'elbowNear' ? arms.near.mid
        : pr.at === 'hands' ? [(arms.near.end[0] + arms.far.end[0]) / 2, Math.min(arms.near.end[1], arms.far.end[1])] : local(0, d.torsoH / 2);
      const p: [number, number] = [anchor[0] + (pr.x ?? 0) * (side ? 1 : diag ? DIAG_X : sign), anchor[1] + (pr.y ?? 0)];
      // sin ángulo dado, el implemento sigue al antebrazo
      const limb = pr.at === 'handFar' ? arms.far : pr.at === 'handNear' || pr.at === 'hands' ? arms.near : null;
      const auto = limb ? (Math.atan2(limb.end[1] - limb.mid[1], limb.end[0] - limb.mid[0]) * 180) / Math.PI : 0;
      // ángulo pensado para esta vista (premium): manda sobre todo lo automático
      const viewAng = pr.angles?.[viewIn];
      let ang = viewAng ?? (pr.angle !== undefined && side ? pr.angle : auto);
      if (kind === 'held') {
        // arma del piso en la mano: se exporta dónde va (el juego dibuja la que el personaje recogió) y, si se pide, se dibuja
        const layer = behind ? Layer.Behind : view === 'back' ? Layer.FarArm : Layer.Prop;
        heldAt = { p, angle: ang, behind: layer < Layer.Torso };
        if (opt.held) {
          const col = FLOOR_PROPS[opt.held.kind].colores?.[opt.held.variant ?? 0];
          if (col) mats.add('p_color0', makeRamp(col));
          drawHeldFloorProp(part, opt.held.kind, p, ang, d.u, { open: pr.open });
          commit(part, layer, false, false);
        }
        continue;
      }
      // armas largas con el brazo colgando: el báculo y la lanza van parados, el arco vertical
      const down = Math.sin((auto * Math.PI) / 180) > 0.5;
      const explicit = viewAng !== undefined || pr.angle !== undefined;
      const rest = !explicit && down && (kind === 'staff' || kind === 'spear' || kind === 'scythe');
      if (rest) {
        // parado al costado y más largo que el cuerpo, la punta asoma por encima de la cabeza
        ang = side ? -62 : -90;
        // la altura del arma no sigue el vaivén de la mano (la mano se desliza por el asta): así no "salta" al caminar
        p[1] = local(0, Math.round(d.torsoH * 0.25))[1];
        if (!side) { const cx = local(0, d.torsoH / 2)[0]; p[0] += Math.sign(p[0] - cx || 1) * Math.round(3 * d.u); }
      }
      if (!explicit && down && kind === 'bow') ang = 0;
      // armas cortas con el brazo colgando: hacia adelante y abajo, sin tocar el piso
      const hangs = !rest && !explicit && down && limb && WEAPON_SET.has(kind) && kind !== 'bow';
      if (hangs) {
        if (side) ang = 28;
        else { const cx = local(0, d.torsoH / 2)[0]; ang = p[0] >= cx ? (view === 'back' ? 12 : 32) : (view === 'back' ? 168 : 148); }
        // la mano casi en el piso (gatear): el arma se acuesta, si no se metería en el suelo
        const floor = Math.max(legs.near.end[1], legs.far.end[1]);
        if (p[1] > floor - 6 * d.u) ang = side ? 0 : p[0] >= local(0, d.torsoH / 2)[0] ? 0 : 180;
      }
      // un arma que apunta hacia afuera (el torbellino, un ataque largo) no puede salirse del cuadro: se levanta lo justo
      if (viewAng === undefined && !rest && !hangs && WEAPON_SET.has(kind) && kind !== 'bow') {
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
      if (isBall(pr.kind)) { drawBall(part, pr.kind, p, d.u); pelotas.push({ kind: pr.kind, c: [p[0], p[1]], behind }); }
      else drawHeld(part, pr.kind, p, ang, d.u, rest, pr.bend ?? 0);
      // estela del golpe: arco claro de dos pixeles a lo largo del recorrido del filo, sin contorno
      const sm = pr.smear?.[viewIn];
      if (sm) {
        const trail = new Part();
        const reach = (WEAPON_REACH[kind as keyof typeof WEAPON_REACH] ?? 10) * d.u;
        const [a0, a1] = sm, steps = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 3));
        for (let k = 0; k <= steps; k++) {
          const a = ((a0 + ((a1 - a0) * k) / steps) * Math.PI) / 180;
          // más gruesa al final del recorrido (donde está el filo ahora), fina al principio
          const thick = k / steps > 0.45 ? 2 : 1;
          for (let t = 0; t < thick; t++) {
            const r = reach * 0.9 - t;
            trail.set(Math.round(p[0] + Math.cos(a) * r), Math.round(p[1] + Math.sin(a) * r), 'p_white', t === 0 ? LIGHT : BASE);
          }
        }
        commit(trail, Layer.Prop, false, false);
      }
      const handUp = !!limb && view !== 'back' && (side ? limb === arms.near : true) && limb.end[1] < local(0, d.torsoH)[1] + 1;
      const pointsUp = !isBall(pr.kind) && view !== 'back' && Math.sin((ang * Math.PI) / 180) < -0.3;
      // delante de todo, salvo de espalda: ahí lo que va adelante del cuerpo queda tapado por él
      const front = Array.isArray(pr.front) ? pr.front.includes(viewIn) : !!pr.front && view !== 'back';
      commit(part, behind ? Layer.Behind : front || (rest && view !== 'back') ? Layer.Prop : (handUp || pointsUp) && !isBall(pr.kind) ? Layer.ArmUp : Layer.Prop, false, false);
    }
  };

  // cargando arriba (levantar, llevar): los brazos se dibujan después de la cabeza, cuando se sabe dónde termina el pelo
  const lifting = !!pose.load && Math.min(pose.arms.near.shoulder, pose.arms.far.shoulder) >= 140;
  // orden de dibujo: lo de atrás primero
  drawAttached(true);
  if (side) {
    if (!lifting) drawArm(true, L_FAR_ARM);
    drawLeg(true, L_FAR_LEG);
    drawLeg(false, Layer.NearLeg);
  } else if (diag) {
    // en diagonal el brazo y la pierna "far" quedan del lado de la cámara
    drawLeg(false, Layer.FarLeg);
    drawLeg(true, Layer.NearLeg);
    if (!lifting) drawArm(false, Layer.FarArm);
  } else {
    drawLeg(true, L_FAR_LEG);
    drawLeg(false, Layer.NearLeg);
    if (view === 'back' && !lifting) { drawArm(true, L_FAR_ARM); drawArm(false, L_NEAR_ARM); }
  }
  drawCape();
  drawSkirt();
  // la cabeza antes que el torso: el número y las letras del pecho buscan dónde no los tape (el orden no cambia
  // el dibujo, cada pieza tiene su capa)
  drawHead();
  drawTorso();
  // si la mano queda más arriba que la barbilla, el brazo va detrás de la cabeza
  const chinY = local(0, d.torsoH)[1];
  const carrying = !!pose.load;
  const upLayer = (p: { end: [number, number] }, normal: number) => (p.end[1] < chinY + 1 ? Layer.ArmUp : normal);
  if (lifting) {
    // Levantar con chibi (como en los Kunio): los brazos suben por los costados de la cabeza y se estiran lo justo
    // para que las palmas lleguen a lo más alto del pelo, donde se apoya la carga. Así las manos tocan lo cargado
    // y la cara queda a la vista. Solo en estas poses: en el resto los brazos miden lo de siempre.
    let hx0 = Infinity, hx1 = -Infinity, hy0 = Infinity;
    for (let y = 0; y < canvas.h; y++) for (let x = 0; x < canvas.w; x++) {
      const l = canvas.layer[y * canvas.w + x];
      if (l !== Layer.Head && l !== Layer.HairBack) continue;
      if (x < hx0) hx0 = x; if (x > hx1) hx1 = x; if (y < hy0) hy0 = y;
    }
    hx0 -= canvas.ox; hx1 -= canvas.ox; hy0 -= canvas.oy;
    const hr = Math.floor(d.hand / 2), cx = (hx0 + hx1) / 2;
    const reachTo = (root: [number, number], target: [number, number]): LimbPts => {
      const tx = target[0] - root[0], ty = target[1] - root[1];
      const dist = Math.hypot(tx, ty), len = d.armUpper + d.armLower;
      const k = Math.max(1, dist / (len * 0.97));
      // el codo se abre hacia afuera de la cabeza
      const out = root[0] < cx ? -1 : 1;
      const a = solveTwoBone(d.armUpper * k, d.armLower * k, tx, ty, 1), b = solveTwoBone(d.armUpper * k, d.armLower * k, tx, ty, -1);
      const ik = (a.mid[0] - b.mid[0]) * out > 0 ? a : b;
      return { root, mid: add(root, ik.mid), end: add(root, ik.end) };
    };
    // las palmas no se salen de la celda (un peinado en punta puede llegar al borde de arriba): como mucho a un pixel
    // del borde (más el contorno), medido desde el piso
    let feetY = -Infinity;
    for (let y = 0; y < canvas.h; y++) for (let x = 0; x < canvas.w; x++) if (canvas.layer[y * canvas.w + x] === Layer.NearLeg || canvas.layer[y * canvas.w + x] === Layer.FarLeg) feetY = Math.max(feetY, y - canvas.oy);
    const cellTop = feetY + 1 + 2 - C;
    const top = Math.max(hy0, cellTop + 2) + hr;
    if (side) {
      // de lado las dos palmas asoman arriba y adelante de la cabeza; los brazos pasan por detrás de ella
      arms.near = reachTo(arms.near.root, [hx1 + hr, top]);
      arms.far = reachTo(arms.far.root, [hx1 + hr - 2, top]);
      drawArm(true, Layer.ArmUp);
      drawArm(false, Layer.ArmUp);
    } else {
      // de frente, de espalda y en diagonal: una mano a cada costado de la cabeza, por fuera del pelo
      for (const k of ['near', 'far'] as const) {
        const root = arms[k].root;
        arms[k] = reachTo(root, [root[0] < cx ? hx0 - hr : hx1 + hr, top]);
      }
      drawArm(true, Layer.NearArm);
      drawArm(false, Layer.NearArm);
    }
  } else if (side) drawArm(false, upLayer(arms.near, Layer.NearArm));
  else if (diag) drawArm(true, upLayer(arms.far, Layer.NearArm));
  else if (view === 'front') { drawArm(true, upLayer(arms.far, L_FAR_ARM)); drawArm(false, upLayer(arms.near, L_NEAR_ARM)); }
  drawAttached(false);

  // ---------- piso: el punto más bajo toca el suelo (o queda a `air` pixeles) ----------
  // el piso lo toca el cuerpo: un hacha o un báculo que cuelgan más abajo que los pies no levantan al personaje
  const bbAll = canvas.bbox();
  // premium: el piso lo marca el cuerpo (una raqueta que apunta abajo no levanta al personaje)
  const groundMats = opt.propsApart ? new Set(Object.keys(PROP_COLORS).map((k) => mats.id(`p_${k}`))) : undefined;
  const bbBody = gear || opt.propsApart || props.some((q) => LONG_HELD.has(q.kind)) ? bodyBox(canvas, 0, 0, -99, false, groundMats) : null;
  const bb = bbBody ? { y1: bbBody.y1 } : bbAll;
  const hipH = pose.hipH;
  const groundCanvas = opt.suelo ?? (hipH !== undefined ? canvas.oy + Math.round(hipH) : (bb ? bb.y1 + 1 : canvas.oy) + Math.round(pose.air));
  for (const pr of props) {
    if (pr.at !== 'ground') continue;
    const part = new Part();
    const fx = (pr.x ?? 0) * (side ? 1 : diag ? DIAG_X : sign);
    // bajo la mano (el bote): la x de la mano en pantalla, la altura desde el piso
    const gx = Math.round(pr.under ? (pr.under === 'handFar' ? arms.far.end : arms.near.end)[0] + fx : fx);
    const gy = groundCanvas - canvas.oy;
    if (isBall(pr.kind)) {
      const s = ballSize(pr.kind, d.u);
      const c: [number, number] = [gx, gy - 1 - (s - 1) / 2 - (pr.y ?? 0)];
      drawBall(part, pr.kind, c, d.u);
      pelotas.push({ kind: pr.kind, c, behind: !!pr.behind });
    } else drawGround(part, pr.kind, gx, gy - 1 - (pr.y ?? 0), d.u, pr.angle ?? 0, pr.lay ?? 0);
    commit(part, pr.behind ? Layer.Behind : pr.kind === 'bike' || pr.kind === 'skate' ? Layer.PropMid : Layer.Prop, false, false);
  }

  // con piezas dibujadas, el pelo (colitas, melenas) puede recortarse en el borde de la celda en poses extremas:
  // la caja que decide el encuadre es la del cuerpo y la cara, más el contorno
  // materiales de implementos (raqueta, espada, pelota): fuera de la caja del cuerpo si se pide
  const propMats = opt.propsApart ? new Set(Object.keys(PROP_COLORS).map((k) => mats.id(`p_${k}`))) : undefined;
  // premium: las orejas (de gato, de lobo) son como el pelo: pueden recortarse en la punta en una pose extrema
  const softSkip = opt.propsApart ? new Set([...(propMats ?? []), mats.id('ears')]) : propMats;
  const soft = lpcBox ? bodyBox(canvas, 0, 0, mats.id('hair'), false, softSkip) : null;
  drawChestMarks();
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
    elbowNear: J(arms.near.mid), elbowFar: J(arms.far.mid),
    // la frente: de lado, adelante de la cabeza (lo que pega en un cabezazo); de frente o de espalda, el centro
    frente: J(add(neck, local(side ? d.headW * 0.42 : diag ? d.headW * 0.25 : 0, d.headW * 0.62))),
  };
  const body = soft ? { x0: soft.x0 - 1 + dx, y0: soft.y0 - 1 + dy, x1: soft.x1 + 1 + dx, y1: soft.y1 + 1 + dy } : bodyBox(canvas, dx, dy, -99, false, propMats);
  const full = soft ? bodyBox(canvas, dx, dy, -99, false, propMats) : body;
  const whole = bodyBox(canvas, dx, dy, -99, true, propMats);
  if (carrying) {
    // la carga se apoya en las palmas: entre las dos manos, en el borde de arriba de la más alta
    const top = Math.min(joints.handNear[1], joints.handFar[1]) - Math.floor(d.hand / 2);
    joints.carry = [(joints.handNear[0] + joints.handFar[0]) / 2, top];
  }
  const held = heldAt as { p: [number, number]; angle: number; behind: boolean } | null;
  // cada pelota como la pinta blob: de round(c - r) a round(c - r) + s - 1, así que su centro continuo es el borde + s / 2
  const balls = pelotas.map(({ kind, c, behind }): BallAt => {
    const s = ballSize(kind, d.u), r = (s - 1) / 2;
    const [x0, y0] = J([Math.round(c[0] - r), Math.round(c[1] - r)]);
    return { kind, x: x0 + s / 2, y: y0 + s / 2, d: s, behind };
  });
  return {
    raster: toRaster(canvas, 0, 0, W, H, dx, dy), pivotX: canvas.ox, groundRow, body, full, whole, joints, suelo: groundCanvas,
    ...(held ? { held: { x: J(held.p)[0], y: J(held.p)[1], angle: ((Math.round(held.angle) % 360) + 360) % 360, behind: held.behind } } : {}),
    ...(balls.length ? { pelotas: balls } : {}),
  };
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
