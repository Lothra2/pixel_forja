import type { HeadModel, HeadRow, HairBlob, EyeStyleId, BrowStyleId, BeardStyleId, GlassesStyleId } from './model';
import { hexToLab, labToHex, labToLch, lchToLab } from '../color/oklab';
import { rng } from '../core/rng';
import { stylizeSkin, liftHair } from './render';
import { DEFAULT_LPC, LPC_HAIRS, LPC_BEARDS, LPC_MUSTACHES, LPC_GLASSES, LPC_NOSES, LPC_HEADS, type LpcLook } from '../parts/lpc';

/**
 * Avatar: la cabeza armada por piezas. Cada pieza es un parámetro, no un dibujo, así sirve en cualquier
 * ángulo y en cualquier tamaño. Una foto propone el avatar de partida (fitAvatar) y la persona lo ajusta.
 */
export type HairStyleId =
  | 'corto' | 'rapado' | 'calvo' | 'copete' | 'flequillo' | 'raya' | 'rulos' | 'afro'
  | 'melena' | 'largo' | 'cola' | 'colitas' | 'mono';

export interface HairParams {
  /** grosor arriba, a los lados y atrás (unidades de R) */
  top: number;
  side: number;
  back: number;
  /** entradas: 0 nada, 1 muy marcadas */
  recede: number;
  /** largo: 0 rapado arriba de las orejas, 1 corto, 1.5 a la mandíbula, 2 a la barbilla, 3 a los hombros, 4 largo */
  length: number;
  /** flequillo: 0 nada, 1 hasta las cejas */
  fringe: number;
  /** raya: -1 izquierda, 0 al medio, 1 derecha */
  part: number;
  /** copete hacia arriba y adelante */
  sweep: number;
  /** rulos */
  curl: number;
  tail: 'none' | 'pony' | 'bun' | 'pigtails';
}

export interface FaceParams {
  /** del tope del cráneo a la ceja */
  dome: number;
  /** del nacimiento del pelo a la ceja */
  forehead: number;
  eyeNose: number;
  noseMouth: number;
  mouthChin: number;
  /** media anchura de las mejillas y de la mandíbula */
  cheek: number;
  jaw: number;
  /** forma de la barbilla: 2 redonda, 4 cuadrada */
  chin: number;
  /** media distancia entre ojos */
  eyeX: number;
  ears: number;
  /** ancho de la boca */
  mouth: number;
}

export type NoseId = 'chica' | 'normal' | 'grande';
export type LookId = 'stardew' | 'fiel' | 'megaman' | 'caricatura';

export interface Avatar {
  version: 1;
  look: LookId;
  skin: string;
  face: FaceParams;
  hair: { style: HairStyleId; color: string; params: HairParams };
  eyes: { style: EyeStyleId; color: string };
  brows: { style: BrowStyleId };
  nose: NoseId;
  beard: { style: BeardStyleId; color: string; gray: number };
  glasses: { style: GlassesStyleId; color: string };
  /**
   * kit de dibujo: 'lpc' = piezas dibujadas a mano (LPC), 'volumen' = piezas generadas en 3D por el motor.
   * Las piezas LPC se usan desde 48 px; a 32 px se dibuja la versión en volumen.
   */
  kit?: 'lpc' | 'volumen';
  lpc?: LpcLook;
}

// ---------- catálogos ----------

const HP = (p: Partial<HairParams>): HairParams => ({ top: 0.2, side: 0.08, back: 0.1, recede: 0, length: 1, fringe: 0, part: 0, sweep: 0, curl: 0, tail: 'none', ...p });

export const HAIR_STYLES: Record<HairStyleId, HairParams> = {
  corto: HP({ top: 0.22, side: 0.08, back: 0.1, sweep: 0.3 }),
  rapado: HP({ top: 0.06, side: 0.03, back: 0.04, length: 0.6 }),
  calvo: HP({ top: 0, side: 0.05, back: 0.06, recede: 1 }),
  copete: HP({ top: 0.42, side: 0.05, back: 0.08, sweep: 1 }),
  flequillo: HP({ top: 0.22, side: 0.12, back: 0.12, fringe: 1 }),
  raya: HP({ top: 0.26, side: 0.1, back: 0.1, fringe: 0.55, part: 1, sweep: 0.2 }),
  rulos: HP({ top: 0.32, side: 0.2, back: 0.2, curl: 1, length: 1.2 }),
  afro: HP({ top: 0.62, side: 0.5, back: 0.5, curl: 1, length: 1.4 }),
  melena: HP({ top: 0.2, side: 0.16, back: 0.2, length: 2, fringe: 0.7 }),
  largo: HP({ top: 0.18, side: 0.14, back: 0.18, length: 3.4, fringe: 0.3, part: 0.6 }),
  cola: HP({ top: 0.16, side: 0.06, back: 0.1, length: 1, tail: 'pony' }),
  colitas: HP({ top: 0.16, side: 0.08, back: 0.1, length: 1, fringe: 0.8, tail: 'pigtails' }),
  mono: HP({ top: 0.14, side: 0.06, back: 0.1, length: 1, tail: 'bun' }),
};
export const HAIR_STYLE_IDS = Object.keys(HAIR_STYLES) as HairStyleId[];
export const EYE_STYLE_IDS: EyeStyleId[] = ['brillo', 'punto', 'serios', 'grandes', 'pestanas'];
export const BROW_STYLE_IDS: BrowStyleId[] = ['normal', 'gruesa', 'fina', 'arqueada', 'ninguna'];
export const BEARD_STYLE_IDS: BeardStyleId[] = ['ninguna', 'sombra', 'bigote', 'candado', 'corta', 'completa', 'larga'];
export const GLASSES_STYLE_IDS: GlassesStyleId[] = ['ninguno', 'cuadrados', 'redondos', 'sol'];
export const NOSE_IDS: NoseId[] = ['chica', 'normal', 'grande'];
export const LOOK_IDS: LookId[] = ['stardew', 'fiel', 'megaman', 'caricatura'];

export const SKIN_SWATCHES = ['#ffe3cc', '#f6cdb0', '#eab894', '#d9a079', '#c08158', '#9a6342', '#77482e', '#52311f'];
export const HAIR_SWATCHES = ['#1d1916', '#36271f', '#5a3a24', '#86562f', '#b47a43', '#dcb46c', '#efdca6', '#a8401f', '#8f8f94', '#e6e3dc', '#3d64c8', '#d0508c'];
export const EYE_SWATCHES = ['#3a2418', '#6a4426', '#3f7a3c', '#2f5aa8', '#6e8c99', '#1b1b1f'];
export const GLASSES_SWATCHES = ['#1d1d24', '#e2e7ea', '#6a4328', '#c9a24a', '#b0283a', '#2f5aa8'];

const NOSE_LEN: Record<NoseId, number> = { chica: 0.16, normal: 0.28, grande: 0.42 };
const BROW_T: Record<BrowStyleId, number> = { ninguna: 0, fina: 0.06, normal: 0.11, gruesa: 0.2, arqueada: 0.11 };

export const DEFAULT_FACE: FaceParams = {
  dome: 1.12, forehead: 0.58, eyeNose: 0.6, noseMouth: 0.3, mouthChin: 0.52, cheek: 0.97, jaw: 0.84, chin: 2.6, eyeX: 0.42, ears: 0.18, mouth: 0.3,
};

export function defaultAvatar(): Avatar {
  return {
    version: 1,
    look: 'stardew',
    skin: SKIN_SWATCHES[2],
    face: { ...DEFAULT_FACE },
    hair: { style: 'corto', color: HAIR_SWATCHES[1], params: { ...HAIR_STYLES.corto } },
    eyes: { style: 'brillo', color: EYE_SWATCHES[0] },
    brows: { style: 'normal' },
    nose: 'normal',
    beard: { style: 'ninguna', color: HAIR_SWATCHES[1], gray: 0 },
    glasses: { style: 'ninguno', color: GLASSES_SWATCHES[0] },
    kit: 'lpc',
    lpc: { ...DEFAULT_LPC },
  };
}

/** Cambia el peinado conservando el color (y las entradas, que son de la persona y no del peinado). */
export function withHairStyle(a: Avatar, style: HairStyleId): Avatar {
  const params = { ...HAIR_STYLES[style] };
  if (style !== 'calvo') params.recede = Math.max(params.recede, a.hair.params.recede);
  return { ...a, hair: { ...a.hair, style, params } };
}

export function randomAvatar(seed: number): Avatar {
  const r = rng(seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
  const a = defaultAvatar();
  const style = pick(HAIR_STYLE_IDS);
  const hairColor = pick(HAIR_SWATCHES.slice(0, 10));
  return {
    ...withHairStyle({ ...a, hair: { ...a.hair, color: hairColor } }, style),
    skin: pick(SKIN_SWATCHES),
    face: { ...a.face, jaw: 0.76 + r() * 0.16, chin: 2.2 + r() * 1.6, eyeX: 0.38 + r() * 0.08, forehead: 0.45 + r() * 0.3 },
    eyes: { style: pick(EYE_STYLE_IDS), color: pick(EYE_SWATCHES) },
    brows: { style: pick(BROW_STYLE_IDS.slice(0, 4)) },
    nose: pick(NOSE_IDS),
    beard: r() < 0.35 ? { style: pick(BEARD_STYLE_IDS.slice(1)), color: hairColor, gray: r() < 0.3 ? 0.6 : 0 } : a.beard,
    glasses: r() < 0.25 ? { style: pick(GLASSES_STYLE_IDS.slice(1)), color: pick(GLASSES_SWATCHES) } : a.glasses,
    kit: 'lpc',
    lpc: {
      head: pick(LPC_HEADS.slice(0, 4)),
      hair: pick(LPC_HAIRS),
      brows: pick(['thin', 'thick', null]),
      nose: pick([null, null, ...LPC_NOSES.filter((n) => n !== 'elderly')]),
      beard: r() < 0.3 ? pick(LPC_BEARDS) : null,
      mustache: r() < 0.15 ? pick(LPC_MUSTACHES) : null,
      glasses: r() < 0.2 ? pick(LPC_GLASSES) : null,
    },
  };
}

// ---------- del avatar al volumen ----------

function darkerHex(hex: string, k = 0.7): string {
  const l = hexToLab(hex);
  return labToHex([Math.min(0.26, l[0] * k), l[1], l[2]]);
}
function mixHex(a: string, b: string, t: number): string {
  const p = hexToLab(a), q = hexToLab(b);
  return labToHex([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]);
}
function lipOf(skin: string): string {
  const [L, C, h] = labToLch(hexToLab(skin));
  return labToHex(lchToLab([L - 0.12, Math.max(0.08, C * 1.5), h - 0.35]));
}

interface BeardShape { cheek: 'none' | 'low' | 'high'; mustache: boolean; chin: boolean; sides: boolean; thick: number; len: number; down: number }
const BEARD: Record<BeardStyleId, BeardShape> = {
  ninguna: { cheek: 'none', mustache: false, chin: false, sides: false, thick: 0, len: 0, down: 0 },
  sombra: { cheek: 'low', mustache: true, chin: true, sides: true, thick: 0, len: 0, down: 0 },
  bigote: { cheek: 'none', mustache: true, chin: false, sides: false, thick: 0.02, len: 0, down: 0 },
  candado: { cheek: 'none', mustache: true, chin: true, sides: false, thick: 0.03, len: 0.04, down: 0.04 },
  corta: { cheek: 'low', mustache: true, chin: true, sides: true, thick: 0.04, len: 0.05, down: 0.04 },
  completa: { cheek: 'high', mustache: true, chin: true, sides: true, thick: 0.09, len: 0.13, down: 0.14 },
  larga: { cheek: 'high', mustache: true, chin: true, sides: true, thick: 0.1, len: 0.18, down: 0.75 },
};

const cache = new Map<string, HeadModel>();

export function modelFromAvatar(a: Avatar): HeadModel {
  const key = JSON.stringify(a);
  const hit = cache.get(key);
  if (hit) return hit;
  const m = build(a);
  if (cache.size > 200) cache.clear();
  cache.set(key, m);
  return m;
}

function build(a: Avatar): HeadModel {
  const f = a.face, hp = a.hair.params;
  const bald = a.hair.style === 'calvo';
  const T = bald ? 0.02 : hp.top + hp.sweep * 0.06;
  const brow = T + f.dome;
  const hairline = brow - f.forehead * (1 + hp.recede * 0.25);
  const eye = brow + 0.18;
  const nose = eye + f.eyeNose;
  const mouth = nose + f.noseMouth;
  const chin = mouth + f.mouthChin;
  const bs = BEARD[a.beard.style];
  const long = hp.length >= 2;
  const hairDown = hp.length > 2 ? (hp.length - 2) * 0.9 : 0;
  const sideBottom = hp.length < 0.8 ? eye : hp.length < 1.3 ? nose + 0.05 : hp.length < 1.8 ? mouth : hp.length < 2.5 ? chin + 0.05 : chin + hairDown;
  const nape = hp.length < 0.8 ? nose : hp.length < 1.3 ? mouth + 0.15 : hp.length < 1.8 ? chin - 0.1 : 99;

  // piezas extra
  const extras: HairBlob[] = [];
  const backZ = -(1.12 + hp.back);
  if (!bald && hp.tail === 'pony') {
    extras.push({ a: [0, brow - 0.15, backZ - 0.02], r: 0.24 });
    extras.push({ a: [0, brow - 0.05, backZ - 0.1], b: [0, brow + 1.25, backZ + 0.05], r: 0.2 });
  } else if (!bald && hp.tail === 'bun') {
    extras.push({ a: [0, T + 0.08, -0.62], r: 0.4 });
  } else if (!bald && hp.tail === 'pigtails') {
    for (const s of [-1, 1]) {
      extras.push({ a: [s * 1.08, brow - 0.12, -0.3], r: 0.2 });
      extras.push({ a: [s * 1.12, brow - 0.05, -0.3], b: [s * 1.22, brow + 1.05, -0.2], r: 0.19 });
    }
  }
  let H = chin + Math.max(bs.down, long ? hairDown + 0.05 : 0);
  for (const e of extras) H = Math.max(H, (e.b ?? e.a)[1] + e.r);

  const sk = (y: number): number => {
    if (y < T) return 0;
    if (y < brow) { const u = (brow - y) / f.dome; return 1.02 * Math.sqrt(Math.max(0, 1 - u * u)); }
    if (y < eye) return 1.02 - 0.02 * ((y - brow) / (eye - brow));
    if (y < nose) return 1 + (f.cheek - 1) * ((y - eye) / (nose - eye));
    if (y < mouth) return f.cheek + (f.jaw - f.cheek) * ((y - nose) / (mouth - nose));
    if (y < chin) { const t = (y - mouth) / (chin - mouth); return f.jaw * Math.pow(Math.max(0, 1 - Math.pow(t, f.chin)), 1 / f.chin); }
    return 0;
  };
  const browOuter = 1.02 + hp.side;
  const N = 72;
  const rows: HeadRow[] = [];
  const cheekTop = bs.cheek === 'high' ? eye + (nose - eye) * 0.55 : bs.cheek === 'low' ? nose - 0.04 : 99;
  for (let k = 0; k < N; k++) {
    const y = (k / (N - 1)) * H;
    const s = sk(y);
    // silueta del pelo
    let ho = 0;
    let hairFrom = 181, peak: number | undefined;
    if (bald) {
      if (y > brow - 0.3 && y < nose + 0.05) { ho = s + hp.side; hairFrom = 86; }
    } else {
      if (y < brow) { const u = (brow - y) / brow; ho = browOuter * Math.sqrt(Math.max(0, 1 - Math.pow(u, 2 + hp.sweep * 1.2))); }
      else if (y <= sideBottom) {
        const fall = long ? browOuter * (1 - 0.04 * (y - brow)) : 0;
        const taper = long ? 1 : Math.max(0, 1 - (y - brow) / Math.max(0.1, sideBottom - brow));
        ho = Math.max(s + hp.side * (0.3 + 0.7 * taper), fall);
      }
      // ángulo desde donde hay pelo
      const band = 0.06 + hp.recede * 0.18;
      if (y < hairline - band) hairFrom = 0;
      else if (y < hairline) {
        if (hp.recede < 0.1) hairFrom = 0;
        else { peak = 30 - hp.recede * 12; hairFrom = 30 + hp.recede * 26; }
      } else if (y < eye) hairFrom = 60 + hp.recede * 12;
      else if (y <= sideBottom) hairFrom = long ? 66 : 82;
      else if (y < nape) hairFrom = 100;
      if (y > chin) hairFrom = long && y <= sideBottom ? 70 : 181;
    }
    // barba
    let beardFrom = 0, beardTo = 0;
    if (bs.cheek !== 'none' || bs.mustache || bs.chin) {
      if (bs.sides && y >= cheekTop && y < nose - 0.02) { beardFrom = bs.cheek === 'high' ? 30 + 18 * (1 - (y - cheekTop) / Math.max(0.05, nose - cheekTop)) : 46; beardTo = 112; }
      else if (y >= nose - 0.02 && y < mouth - 0.04) {
        if (bs.mustache && bs.sides) { beardFrom = 0; beardTo = 112; }
        else if (bs.mustache) { beardFrom = 0; beardTo = a.beard.style === 'bigote' ? 36 : 40; }
      } else if (y >= mouth - 0.04 && y <= chin + bs.down) {
        if (bs.sides) { beardFrom = 0; beardTo = 112; }
        else if (bs.chin && y > mouth + 0.05) { beardFrom = 0; beardTo = 34; }
        else if (bs.chin) { beardFrom = 20; beardTo = 36; }
      }
    }
    let bo = 0;
    if (beardTo >= 90 && y >= nose && y <= chin) bo = s + bs.thick;
    if (y > chin && y <= chin + bs.down && beardTo > 0) {
      const t = (y - chin) / Math.max(0.05, bs.down);
      bo = f.jaw * 0.62 * Math.pow(Math.max(0, 1 - t * t), 0.5);
    }
    const w = Math.max(s, ho, bo);
    const gray = a.beard.gray;
    const tb = Math.max(0, Math.min(1, (y - nose) / Math.max(0.1, chin + bs.down - nose)));
    rows.push({
      wl: w, wr: w,
      hairL: hairFrom, hairR: hairFrom,
      beardFrom, beardTo,
      beardLight: Math.min(1, gray * (0.45 + 0.7 * tb)),
      ...(peak !== undefined ? { peak } : {}),
      ...(y > chin ? { hollow: true } : {}),
    });
  }

  const fringe = !bald && hp.fringe > 0 ? { y0: hairline - 0.15, y1: hairline + (brow - 0.05 - hairline) * hp.fringe, part: hp.part } : undefined;
  const beardOn = a.beard.style !== 'ninguna';
  const grayBeard = mixHex(a.beard.color, '#dad7d1', 0.55 + a.beard.gray * 0.3);
  return {
    version: 1,
    height: H,
    rows,
    marks: { hairline, brow, eye, nose, mouth, chin },
    eyes: { x: f.eyeX, w: 0.26, color: a.eyes.color, deep: a.eyes.style === 'serios' },
    brows: { x: f.eyeX, w: a.brows.style === 'fina' ? 0.42 : a.brows.style === 'gruesa' ? 0.6 : 0.52, t: BROW_T[a.brows.style], slant: 0, color: darkerHex(a.hair.color) },
    nose: { w: 0.17, len: NOSE_LEN[a.nose] },
    mouth: { w: f.mouth },
    ears: hp.length >= 1.5 && hp.side >= 0.1 ? null : { y0: eye - 0.04, y1: nose + 0.02, size: f.ears },
    colors: {
      skin: a.skin, hair: a.hair.color,
      beardDark: beardOn ? a.beard.color : null,
      beardLight: beardOn ? (a.beard.gray > 0.05 ? grayBeard : a.beard.color) : null,
      lip: lipOf(a.skin),
    },
    beardLen: bs.len,
    hairLong: long,
    nape,
    depth: { front: hp.top * 0.35 + hp.sweep * 0.22, back: hp.back },
    ...(fringe ? { fringe } : {}),
    ...(extras.length ? { extras } : {}),
    curl: hp.curl,
    quiff: hp.sweep > 0.5 ? hp.sweep : 0,
    look: {
      eyes: a.eyes.style,
      brows: a.brows.style,
      glasses: a.glasses.style !== 'ninguno' ? { style: a.glasses.style, color: a.glasses.color } : null,
      beard: a.beard.style,
    },
  };
}

// ---------- de la foto al avatar ----------

/** Propone un avatar desde la cabeza medida en una foto. Lo que no se puede medir queda en su valor típico. */
export function fitAvatar(m: HeadModel): Avatar {
  const a = defaultAvatar();
  const { hairline, brow, eye, nose, mouth, chin } = m.marks;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const rowW = (y: number) => {
    const n = m.rows.length;
    const r = m.rows[Math.max(0, Math.min(n - 1, Math.round((y / m.height) * (n - 1))))];
    return (r.wl + r.wr) / 2;
  };
  // pelo: grosor arriba = lo que sobra sobre un cráneo típico
  const top = clamp(brow - DEFAULT_FACE.dome, 0.04, 0.5);
  const side = clamp(rowW(brow - 0.35) - 1.02, 0.02, 0.4);
  const temple = m.rows.find((r, i) => (i / (m.rows.length - 1)) * m.height > hairline && r.hairL > 0 && r.hairL < 90);
  const recede = clamp(temple ? (temple.hairL - 40) / 30 : 0.2, 0, 1);
  const hairRowsBelowChin = m.rows.some((r, i) => (i / (m.rows.length - 1)) * m.height > chin - 0.05 && r.hairL <= 100);
  const style: HairStyleId = hairRowsBelowChin ? 'largo' : top < 0.08 ? 'rapado' : 'corto';
  const params: HairParams = { ...HAIR_STYLES[style], top, side, recede, sweep: top > 0.25 ? 0.4 : 0.2 };
  // cara
  const forehead = clamp(brow - hairline, 0.35, 1.0);
  const eyeNose = clamp(nose - eye, 0.45, 0.8);
  const noseMouth = clamp(mouth - nose, 0.22, 0.4);
  // la barba alarga la barbilla medida
  const beardRows = m.rows.filter((r) => r.beardTo > 0);
  const hasBeard = beardRows.length > 2 && !!m.colors.beardDark;
  const mouthChin = clamp(chin - mouth - (hasBeard ? 0.14 : 0), 0.4, 0.75);
  const jaw = clamp(rowW(mouth) / Math.max(0.5, rowW(eye)), 0.72, 0.98);
  // barba
  let beard: Avatar['beard'] = { style: 'ninguna', color: m.colors.hair, gray: 0 };
  if (hasBeard) {
    const sides = beardRows.some((r) => r.beardTo >= 85);
    const cheekHigh = m.rows.some((r, i) => { const y = (i / (m.rows.length - 1)) * m.height; return r.beardTo > 0 && r.beardFrom > 30 && y < nose - 0.1; });
    const lightAvg = beardRows.reduce((s, r) => s + r.beardLight, 0) / beardRows.length;
    beard = {
      style: sides ? (cheekHigh || m.beardLen > 0 ? 'completa' : 'corta') : 'candado',
      color: m.colors.beardDark ?? m.colors.hair,
      gray: clamp((lightAvg - 0.15) * 1.6, 0, 1),
    };
  }
  // piezas dibujadas equivalentes
  const lpcBeard: Record<string, string | null> = { ninguna: null, sombra: '5oclock_shadow', bigote: null, candado: null, corta: 'trimmed', completa: 'basic', larga: 'medium' };
  const lpc: LpcLook = {
    head: 'male',
    hair: style === 'largo' ? 'long' : style === 'rapado' ? 'buzzcut' : 'parted2',
    brows: m.brows.t > 0.15 ? 'thick' : 'thin',
    nose: 'straight',
    beard: lpcBeard[beard.style] ?? null,
    mustache: beard.style === 'bigote' || beard.style === 'candado' ? 'basic' : null,
    glasses: null,
  };
  return {
    ...a,
    kit: 'lpc',
    lpc,
    skin: stylizeSkin(m.colors.skin),
    face: { ...a.face, forehead, eyeNose, noseMouth, mouthChin, jaw, eyeX: clamp(m.eyes.x, 0.34, 0.5), ears: m.ears ? clamp(m.ears.size, 0.1, 0.28) : 0.16 },
    hair: { style, color: liftHair(m.colors.hair), params },
    eyes: { style: m.eyes.deep ? 'serios' : 'brillo', color: m.eyes.color },
    brows: { style: m.brows.t > 0.15 ? 'gruesa' : m.brows.t < 0.07 ? 'fina' : 'normal' },
    beard,
  };
}
