import type { Raster } from '../core/raster';
import { NesCell, NES_INK, rgb, nesShade, type NesView } from './draw';
import type { NesLook, NesHair, NesMark } from './look';
import { rotateNearest, packNes, NES_DIRS, type NesSheetMeta } from './sheet';

/**
 * Chibi Nekketsu pixel por pixel (Kunio-kun, Nintendo World Cup): la cabeza es casi la mitad del cuerpo, el pelo un bloque,
 * ojos de rayita con cejas gruesas, torso corto, puños cuadrados y piernitas. Nada se traza con líneas ni elipses: cada
 * pieza es una plantilla de pixeles (como los tiles de la NES) y una pose dice qué pieza va en cada articulación.
 * El contorno negro de un pixel lo pone NesCell.raster alrededor de la silueta; las líneas de adentro van en las plantillas.
 *
 * Letras de las plantillas: S piel, s piel sombra, H pelo, h pelo luz, T camisa, t camisa sombra, P short, p short sombra,
 * W media, w media sombra, B zapato, F puño (piel, o guante blanco si es portero), K tinta, E blanco del ojo, M boca,
 * X acento (cintillo, ligas, cuernos, plumas), D antifaz. Un punto es transparente.
 */
type Grid = string[];
const G = (s: string): Grid => s.replace(/^\n+|\n+$/g, '').split('\n');

// ------------------------------------------------------------------------------------------------ colors
type Pal = Record<string, [number, number, number, number]>;
function palette(L: NesLook, dim = false): Pal {
  const S = rgb(L.piel), H = rgb(L.pelo), T = rgb(L.camisa), P = rgb(L.short), W = rgb(L.medias), B = rgb(L.zapatos), X = rgb(L.acento ?? '#ffd447');
  const glove: [number, number, number, number] = [244, 244, 236, 255];
  const lift = (c: typeof S, k: number): typeof S => [Math.round(c[0] + (255 - c[0]) * k), Math.round(c[1] + (255 - c[1]) * k), Math.round(c[2] + (255 - c[2]) * k), 255];
  const p: Pal = {
    S, s: nesShade(S, 0.8), H, h: lift(H, 0.28), T, t: nesShade(T, 0.72), P, p: nesShade(P, 0.8), W, w: nesShade(W, 0.72), B, b: lift(B, 0.25),
    F: L.guantes ? glove : S, f: L.guantes ? nesShade(glove, 0.82) : nesShade(S, 0.8), K: NES_INK, E: [255, 255, 255, 255], M: [176, 40, 48, 255],
    X, x: nesShade(X, 0.75), D: [40, 32, 48, 255],
  };
  if (dim) for (const [a, b] of [['T', 't'], ['S', 's'], ['F', 'f'], ['W', 'w'], ['P', 'p']]) p[a] = p[b];
  return p;
}

function stamp(c: NesCell, g: Grid, x: number, y: number, pal: Pal, flip = false, contour = false): void {
  const mine = new Set<number>();
  g.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.' || !pal[ch]) return;
    const X = x + (flip ? row.length - 1 - i : i), Y = y + j;
    c.put(X, Y, pal[ch]); mine.add(Y * 64 + X);
  }));
  // a limb over the body gets its own ink line where it meets the body, so it reads (the NES way)
  if (contour) for (const k of mine) {
    const X = k % 64, Y = Math.floor(k / 64);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = X + dx, ny = Y + dy, key = ny * 64 + nx;
      if (!mine.has(key) && nx >= 0 && ny >= 0 && nx < 32 && ny < 32 && c.px.has(ny * 32 + nx)) c.put(nx, ny, NES_INK);
    }
  }
}

// ------------------------------------------------------------------------------------------------ heads (skull 14 x 13)
const SKULL = G(`
...SSSSSSSS...
.SSSSSSSSSSSS.
SSSSSSSSSSSSSS
SSSSSSSSSSSSSS
SSSSSSSSSSSSSS
SSSSSSSSSSSSSS
SSSSSSSSSSSSSS
SSSSSSSSSSSSSS
SSSSSSSSSSSSSS
SSSSSSSSSSSSSS
SSSSSSSSSSSSSS
.SSSSSSSSSSSS.
...ssssssss...`);

/** The hair cap on the skull, for each kind of cut and view (side looks right). `o` marks where the cap starts on the skull. */
const CAP: Record<'normal' | 'tazon' | 'rapado', Record<NesView, Grid>> = {
  normal: {
    side: G(`
...HHHHHHHH...
.HHHHHHHHHHHH.
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
HHHHHHHHHHHH..
HHHHHHHHH.....
HHHHHH........
HHHHH.........
HHHHH.........
HHHHH.........
HHHH..........
.HHH..........`),
    front: G(`
...HHHHHHHH...
.HHHHHHHHHHHH.
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
HHH.HHHH.HH.HH
HH..H.......HH
H............H
H............H`),
    back: G(`
...HHHHHHHH...
.HHHHHHHHHHHH.
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
.HHHHHHHHHHHH.`),
  },
  tazon: {
    side: G(`
...HHHHHHHH...
.HHHHHHHHHHHH.
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
HHHHHHH.......
HHHHHH........
HHHHH.........
HHHHH.........
HHHH..........
.HHH..........`),
    front: G(`
...HHHHHHHH...
.HHHHHHHHHHHH.
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
HH..........HH
H............H
H............H`),
    back: [] as Grid,
  },
  rapado: {
    side: G(`
...hhhhhhhh...
.hhhhhhhhhhhh.
hhhhhhhhhhhhh.
hhhhhhhh......
hhhhh.........
hhhh..........
hhh...........`),
    front: G(`
...hhhhhhhh...
.hhhhhhhhhhhh.
hhhhhhhhhhhhhh
hh..........hh
h............h`),
    back: G(`
...hhhhhhhh...
.hhhhhhhhhhhh.
hhhhhhhhhhhhhh
hhhhhhhhhhhhhh
hhhhhhhhhhhhhh
hhhhhhhhhhhhhh
hhhhhhhhhhhhhh
.hhhhhhhhhhhh.`),
  },
};
CAP.tazon.back = CAP.normal.back;

/** What a style adds around the cap: [grid, x, y] on skull coordinates (it may stick out of the skull: long hair, spikes, pigtails). */
type Extra = [Grid, number, number];
const EXTRAS: Partial<Record<NesHair, Record<NesView, Extra[]>>> = {
  liso: {
    side: [[G(`
HHHHH
HHHHH
HHHHH
HHHHH
HHHHH
HHHH.
HHHH.
HHH..
HHH..
HH...`), -1, 6]],
    front: [[G(`
HH
HH
HH
HH
HH
HH
HH
HH
H.`), 0, 7], [G(`
HH
HH
HH
HH
HH
HH
HH
HH
.H`), 12, 7]],
    back: [[G(`
HHHHHHHHHHHH
HHHHHHHHHHHH
HHHHHhHHHHHH
.HHHHHHHHHH.
..HHHHHHHH..`), 1, 12]],
  },
  largo: {
    side: [[G(`
.HHHHH
HHHHHH
HHHHHH
HHHHHH
HHHHHH
HHHHH.
HHHHH.
HHHH..
HHHH..
.HHH..
..HH..`), -2, 5]],
    front: [[G(`
.HH
HHH
HHH
HHH
HHH
HHH
HHH
HHH
HHH
.HH`), -1, 6], [G(`
HH.
HHH
HHH
HHH
HHH
HHH
HHH
HHH
HHH
HH.`), 12, 6]],
    back: [[G(`
HHHHHHHHHHHHHH
HHHHHHHHHHHHHH
HHHHHHhHHHHHHH
HHHHHHHHHHHHHH
.HHHHHHHHHHHH.
..HHHHHHHHHH..`), 0, 12]],
  },
  colitas: {
    side: [[G(`
.HH.
HHHH
HHHH
HHHH
.HH.`), -4, 4]],
    front: [[G(`
.HH
HHH
HHH
HHH
.HH`), -3, 4], [G(`
HH.
HHH
HHH
HHH
HH.`), 14, 4]],
    back: [[G(`
.HH
HHH
HHH
HHH
.HH`), -3, 4], [G(`
HH.
HHH
HHH
HHH
HH.`), 14, 4]],
  },
  despeinado: {
    side: [[G(`
..H...H..H....
.HHH.HHHHHH...`), 0, -2], [G(`
H.
HH
H.`), -1, 6]],
    front: [[G(`
..H...H...H...
.HHH.HHH.HHH..`), 0, -2]],
    back: [[G(`
..H...H...H...
.HHH.HHH.HHH..`), 0, -2]],
  },
  puntas: {
    side: [[G(`
...H...H...H..
..HH..HH..HH..
.HHHHHHHHHHH..`), -1, -3]],
    front: [[G(`
..H...H...H...
.HH..HHH..HH..
.HHHHHHHHHHHH.`), 0, -3]],
    back: [[G(`
..H...H...H...
.HH..HHH..HH..
.HHHHHHHHHHHH.`), 0, -3]],
  },
  moño: {
    side: [[G(`
.HHH
HHHH
HHHH`), 1, -2]],
    front: [[G(`
.HHHH.
HHHHHH
HHHHHH`), 4, -3]],
    back: [[G(`
.HHHH.
HHHHHH
HHHHHH`), 4, -3]],
  },
  raya: {
    side: [[G(`hhhh`), 2, 1]],
    front: [[G(`
h
h
h`), 4, 1]],
    back: [[G(`
h
h`), 4, 1]],
  },
};

/** Marks: beard, moustache, headband, glasses and the ones of the kingdoms (horns, fin, feathers, mask). */
function marks(m: NesMark, view: NesView): Extra[] {
  const side = view === 'side', back = view === 'back';
  switch (m) {
    case 'cintillo': return [[G(side ? 'XXXXXXXXXXXXX' : 'XXXXXXXXXXXXXX'), 0, 2]];
    case 'barba': return back ? [] : side ? [[G(`
HHHHHHH.
HHHHH..H
.HHHHHH.`), 6, 9]] : [[G(`
H..........H
HHHH....HHHH
HHHHHHHHHHHH
.HHHHHHHHHH.`), 1, 9]];
    case 'bigote': return back ? [] : side ? [[G('HHH'), 11, 8]] : [[G('HHHHHH'), 4, 9]];
    case 'lentes': return back ? [] : side ? [[G('KKKKK'), 8, 6]] : [[G('KKKKKKKKKKKK'), 1, 6]];
    case 'cuernos': return side ? [[G(`
.X
XX
XX`), 6, -3]] : [[G(`
X........X
XX......XX
XX......XX`), 2, -3]];
    case 'aleta': return side ? [[G(`
X....
XX...
XXX..
XXXX.`), 3, -4]] : [[G(`
.X.
.X.
XXX
XXX`), 5, -4]];
    case 'plumas': return side ? [[G(`
X..X
XX.XX`), 1, -2]] : [[G(`
X...X...X
XX.XXX.XX`), 2, -2]];
    case 'antifaz': return back ? [] : side ? [[G('DDDDDDDD'), 6, 7], [G('DDDDDDDD'), 6, 8]] : [[G('DDDDDDDDDDDDDD'), 0, 7], [G('DDDDDDDDDDDDDD'), 0, 8]];
    default: return [];
  }
}

export type ChibiFace = 'normal' | 'grito' | 'dolor' | 'ko' | 'feliz' | 'triste';
/** The features drawn on the skull: [x, y, letter]. Side looks right. */
function face(view: NesView, f: ChibiFace, malandro: boolean): [number, number, string][] {
  if (view === 'back') return [];
  const out: [number, number, string][] = [];
  const P = (pts: number[][], ch = 'K'): void => { for (const [x, y] of pts) out.push([x, y, ch]); };
  if (view === 'front') {
    const eyes = (): void => { P([[3, 7], [3, 8], [10, 7], [10, 8]], 'E'); P([[4, 7], [4, 8], [9, 7], [9, 8]]); };
    const brows = (): void => malandro ? P([[2, 6], [3, 6], [4, 7], [9, 7], [10, 6], [11, 6]]) : P([[2, 6], [3, 6], [4, 6], [9, 6], [10, 6], [11, 6]]);
    switch (f) {
      case 'grito': brows(); eyes(); P([[5, 10], [6, 10], [7, 10], [8, 10], [5, 11], [8, 11]]); P([[6, 11], [7, 11]], 'M'); break;
      case 'dolor': P([[2, 6], [3, 7], [11, 6], [10, 7]]); P([[2, 8], [3, 8], [4, 8], [9, 8], [10, 8], [11, 8]]); P([[5, 11], [6, 10], [7, 11], [8, 10]]); break;
      case 'ko': P([[2, 7], [4, 7], [3, 8], [2, 9], [4, 9], [9, 7], [11, 7], [10, 8], [9, 9], [11, 9]]); P([[6, 10], [7, 10], [6, 11], [7, 11]]); break;
      case 'feliz': brows(); P([[2, 8], [3, 7], [4, 8], [9, 8], [10, 7], [11, 8]]); P([[5, 10], [6, 10], [7, 10], [8, 10], [6, 11], [7, 11]]); out.push([6, 11, 'M'], [7, 11, 'M']); break;
      case 'triste': P([[2, 7], [3, 6], [4, 6], [9, 6], [10, 6], [11, 7]]); P([[3, 8], [4, 8], [9, 8], [10, 8]]); P([[6, 10], [7, 10], [5, 11], [8, 11]]); break;
      default: brows(); eyes(); P([[6, 10], [7, 10]]);
    }
    return out;
  }
  // side, looking right: the ear, the nose that sticks out, one eye
  out.push([6, 6, 's'], [6, 7, 's'], [14, 7, 'S'], [14, 8, 's']);
  const eye = (): void => { P([[10, 6], [10, 7]], 'E'); P([[11, 6], [11, 7]]); };
  const brow = (): void => malandro ? P([[9, 5], [10, 5], [11, 6], [12, 6]]) : P([[9, 5], [10, 5], [11, 5], [12, 5]]);
  switch (f) {
    case 'grito': brow(); eye(); P([[11, 9], [12, 9], [13, 9], [11, 10], [13, 10]]); out.push([12, 10, 'M']); break;
    case 'dolor': P([[9, 5], [10, 6], [10, 7], [11, 7], [12, 7]]); P([[11, 10], [12, 9]]); break;
    case 'ko': P([[10, 6], [12, 6], [11, 7], [10, 8], [12, 8]]); P([[12, 10], [13, 10], [12, 11]]); break;
    case 'feliz': brow(); P([[10, 7], [11, 6], [12, 7]]); P([[11, 9], [12, 9], [13, 9], [12, 10]]); break;
    case 'triste': P([[10, 4], [11, 5], [12, 5]]); P([[10, 7], [11, 7]]); P([[11, 10], [12, 10]]); break;
    default: brow(); eye(); P([[12, 9], [13, 9]]);
  }
  return out;
}

const CUT: Partial<Record<NesHair, keyof typeof CAP>> = { tazon: 'tazon', rapado: 'rapado' };

/** A whole head on the cell: skull at (x, y), its cap, the extras of its style, its marks and its face. */
function head(c: NesCell, L: NesLook, view: NesView, x: number, y: number, f: ChibiFace): void {
  const pal = palette(L), cap = CAP[CUT[L.peinado] ?? 'normal'][view];
  const back = (L.peinado === 'liso' || L.peinado === 'largo') && view === 'side';
  // long hair hangs behind the head: drawn first so the skull covers its top
  if (back) for (const [g, ex, ey] of EXTRAS[L.peinado]?.side ?? []) stamp(c, g, x + ex, y + ey, pal);
  stamp(c, SKULL, x, y, pal);
  stamp(c, cap, x, y, pal);
  if (!back) for (const [g, ex, ey] of EXTRAS[L.peinado]?.[view] ?? []) stamp(c, g, x + ex, y + ey, pal);
  for (const m of L.marcas ?? []) for (const [g, ex, ey] of marks(m, view)) stamp(c, g, x + ex, y + ey, pal);
  for (const [fx, fy, ch] of face(view, f, !!L.malandro)) if (pal[ch]) c.put(x + fx, y + fy, pal[ch]);
  // ties on the pigtails
  if (L.peinado === 'colitas' && (L.marcas ?? []).includes('ligas')) {
    const X = pal.X;
    if (view === 'side') { c.put(x - 1, y + 5, X); c.put(x - 1, y + 6, X); }
    else { for (const tx of [-1, 14]) { c.put(x + tx, y + 5, X); c.put(x + tx, y + 6, X); } }
  }
}

// ------------------------------------------------------------------------------------------------ body pieces
const TORSO: Record<NesView, Grid> = {
  side: G(`
.TTTTTTTT.
TTTTTTTTTT
TTTTTTTTTT
TTTTTTTTTT
tTTTTTTTTT
PPPPPPPPPP
PPPPPPPPPp`),
  front: G(`
.TTTTTTTTT.
TTTTTTTTTTT
TTTTTTTTTTT
TTTTTTTTTTT
tTTTTTTTTTt
PPPPPPPPPPP
PPPPPKPPPPP`),
  back: G(`
.TTTTTTTTT.
TTTTTTTTTTT
TTTTTtTTTTT
TTTTTtTTTTT
tTTTTTTTTTt
PPPPPPPPPPP
PPPPPKPPPPP`),
};
/** Pieces of arms and legs: the grid and which of its pixels sits on the joint. Side ones look right. */
type Piece = [Grid, number, number];
const ARM: Record<string, Piece> = {
  down: [G(`
tt
SS
FF`), 0, 0],
  fwd: [G(`
ttSSFF
ttSSFF`), 0, 0],
  back: [G(`
FFSStt
FFSStt`), 5, 0],
  up: [G(`
FF
SS
tt`), 0, 2],
  swingf: [G(`
tt..
.SS.
..FF
..FF`), 0, 0],
  swingb: [G(`
..tt
.SS.
FF..
FF..`), 3, 0],
  bent: [G(`
tt...
tSSFF
...FF`), 0, 0],
  upf: [G(`
...FF
..SSF
tt...`), 0, 2],
  // front view
  fdown: [G(`
TT
SS
FF`), 0, 0],
  fup: [G(`
FF
SS
TT`), 0, 2],
  fout: [G(`
FFSSTT
FFSSTT`), 5, 0],
  fhead: [G(`
FF
SS
SS
TT`), 0, 3],
  ffwd: [G(`
TT.
SFF
.FF`), 0, 0],
};
const LEG: Record<string, Piece> = {
  down: [G(`
SSS.
WWW.
WWW.
BBBB
BBBB`), 0, 0],
  fwd: [G(`
SSS...
.WWW..
.WWW..
..BBBB
..BBBB`), 0, 0],
  back: [G(`
..SSS
.WWW.
WWW..
BBBB.
BBB..`), 2, 0],
  bentb: [G(`
.SSS
WWWW
BBB.
BBB.`), 1, 0],
  knee: [G(`
SSSSS
...WW
...WW
...BBB`), 0, 0],
  kick: [G(`
SSSWWWBB
SSSWWWBB`), 0, 0],
  kickup: [G(`
......BB
....WWBB
..WWW...
SSS.....`), 0, 3],
  tuck: [G(`
SSSS
.WWW
.BBB`), 0, 0],
  // front view
  fdown: [G(`
SSS
WWW
WWW
BBBB
BBBB`), 0, 0],
  fup: [G(`
SSS
WWW
BBBB
BBBB`), 0, 0],
  fwide: [G(`
.SSS
WWW.
WWW.
BBBB
BBBB`), 1, 0],
};

// ------------------------------------------------------------------------------------------------ poses
export interface ChibiPose {
  /** front arm and back arm (side), or left and right (front and back views) */
  arms?: [string, string];
  legs?: [string, string];
  /** the body goes up (a hop, a jump) or down (kneeling) */
  bob?: number;
  /** the head moves on the shoulders (a lean into a punch, a header) */
  hx?: number; hy?: number;
  face?: ChibiFace;
  /** the whole frame turns (falls, dives, the bicycle kick) and moves */
  rot?: number; tx?: number; ty?: number;
}
const FOOT = 30;

/** One frame of a person in the chibi Nekketsu style. */
export function chibiFrame(L: NesLook, view: NesView, p: ChibiPose): Raster {
  const c = new NesCell(), pal = palette(L), dim = palette(L, true);
  const bob = p.bob ?? 0, ty = FOOT - 4 - 7 - bob;   // the top of the torso: legs of 5 rows end on the foot line
  const side = view === 'side';
  const tx = side ? 11 : 10;
  const hipY = ty + 7;
  const legs = p.legs ?? (side ? ['down', 'down'] : ['fdown', 'fdown']);
  const arms = p.arms ?? (side ? ['down', 'down'] : ['fdown', 'fdown']);
  const put = (pc: Piece, jx: number, jy: number, pl: Pal, flip = false, contour = false): void => {
    const [g, ax, ay] = pc, w = g[0].length;
    stamp(c, g, flip ? jx - (w - 1 - ax) : jx - ax, jy - ay, pl, flip, contour);
  };
  const hx = p.hx ?? 0, hy = p.hy ?? 0, f = p.face ?? 'normal';
  if (side) {
    // far limbs first and a shade darker, like the NES
    put(ARM[arms[1]] ?? ARM.down, tx + 3, ty + 1, dim);
    put(LEG[legs[1]] ?? LEG.down, tx + 1, hipY, dim);
    stamp(c, TORSO.side, tx, ty, pal);
    put(LEG[legs[0]] ?? LEG.down, tx + 5, hipY, pal, false, true);
    head(c, L, 'side', tx - 2 + hx, ty - 13 + hy, f);
    put(ARM[arms[0]] ?? ARM.down, tx + 6, ty + 1, pal, false, true);
  } else {
    put(LEG[legs[0]] ?? LEG.fdown, tx + 1, hipY, pal);
    put(LEG[legs[1]] ?? LEG.fdown, tx + 9, hipY, pal, true);
    stamp(c, TORSO[view], tx, ty, pal);
    const handsOnHead = arms[0] === 'fhead';
    if (!handsOnHead) { put(ARM[arms[0]] ?? ARM.fdown, tx - 2, ty + 1, pal); put(ARM[arms[1]] ?? ARM.fdown, tx + 12, ty + 1, pal, true); }
    head(c, L, view, tx - 2 + hx, ty - 13 + hy, f);
    if (handsOnHead) { put(ARM.fhead, tx - 3, ty - 4, pal, false, true); put(ARM.fhead, tx + 13, ty - 4, pal, true, true); }
    else for (const [k, jx, fl] of [[0, tx - 2, false], [1, tx + 12, true]] as const) if (arms[k] === 'ffwd') put(ARM.ffwd, jx, ty + 1, pal, fl, true);
  }
  const r = c.raster();
  return p.rot ? rotateNearest(r, p.rot, 16, 22, p.tx ?? 0, p.ty ?? 0) : r;
}

// the poses of every animation the games ask for (football and fighting): side, and front and back where they look different
const S = (o: ChibiPose = {}): ChibiPose => o;
const IDLE = [S(), S({ hy: 1 })];
const IDLE_F = [S(), S({ hy: 1 })];
const RUN = [
  S({ legs: ['fwd', 'back'], arms: ['swingb', 'swingf'] }),
  S({ legs: ['down', 'bentb'], arms: ['down', 'down'], bob: 1 }),
  S({ legs: ['back', 'fwd'], arms: ['swingf', 'swingb'] }),
  S({ legs: ['bentb', 'down'], arms: ['down', 'down'], bob: 1 }),
];
const RUN_F = [
  S({ legs: ['fdown', 'fup'], arms: ['ffwd', 'fdown'] }), S({ bob: 1 }),
  S({ legs: ['fup', 'fdown'], arms: ['fdown', 'ffwd'] }), S({ bob: 1 }),
];
const SHOT = [
  S({ legs: ['back', 'down'], arms: ['swingf', 'back'] }),
  S({ legs: ['knee', 'down'], arms: ['swingb', 'swingf'] }),
  S({ legs: ['kickup', 'down'], arms: ['back', 'upf'], face: 'grito', hx: -1 }),
  S({ legs: ['fwd', 'down'], arms: ['down', 'swingf'] }),
  S(),
];
const PASS = [S({ legs: ['back', 'down'], arms: ['swingf', 'swingb'] }), S({ legs: ['kick', 'down'], arms: ['swingb', 'swingf'], bob: 1 }), S()];
const HEADER = [
  S({ bob: 3, legs: ['tuck', 'tuck'], arms: ['back', 'back'] }),
  S({ bob: 5, legs: ['tuck', 'bentb'], arms: ['back', 'back'], hx: 2, hy: 1, face: 'grito' }),
  S({ bob: 1 }),
];
const VOLLEY = [S({ bob: 3, legs: ['kickup', 'tuck'], arms: ['back', 'upf'] }), S({ bob: 3, legs: ['kick', 'tuck'], arms: ['back', 'up'], face: 'grito' }), S({ bob: 1 })];
const SLIDE = [
  S({ legs: ['kick', 'fwd'], arms: ['back', 'swingf'], rot: -25, ty: 4 }),
  S({ legs: ['kick', 'kick'], arms: ['back', 'fwd'], rot: -32, ty: 5, face: 'grito' }),
];
const PUNCH = [
  S({ legs: ['fwd', 'back'], arms: ['bent', 'bent'] }),
  S({ legs: ['fwd', 'back'], arms: ['fwd', 'bent'], hx: 1, face: 'grito' }),
  S({ legs: ['fwd', 'back'], arms: ['bent', 'bent'] }),
];
const KICK = [
  S({ legs: ['knee', 'down'], arms: ['bent', 'bent'] }),
  S({ legs: ['kick', 'down'], arms: ['back', 'bent'], hx: -1, face: 'grito', bob: 1 }),
  S({ legs: ['fwd', 'down'], arms: ['bent', 'bent'] }),
];
const STAGGER = [S({ legs: ['back', 'fwd'], arms: ['up', 'upf'], hx: -1, face: 'dolor' }), S({ legs: ['back', 'down'], arms: ['upf', 'up'], hx: -2, face: 'dolor' })];
const HURT = S({ legs: ['fwd', 'back'], arms: ['up', 'upf'], hx: -1, face: 'dolor' });
const TUMBLE = [S({ ...HURT, rot: 25, ty: -1 }), S({ ...HURT, rot: 70, ty: -2 }), S({ ...HURT, rot: 120, ty: -3 }), S({ ...HURT, rot: 165, ty: -4 }), S({ ...HURT, rot: 90, ty: 1, tx: -2, face: 'ko' })];
const LIE = [S({ arms: ['fwd', 'fwd'], rot: 90, ty: 1, tx: -2, face: 'ko' })];
const GETUP = [S({ bob: -4, legs: ['tuck', 'tuck'], arms: ['swingf', 'down'], face: 'dolor' }), S({ bob: -1, legs: ['fwd', 'down'] })];
const DIZZY = [S({ face: 'ko', hx: -1, arms: ['fdown', 'fup'] }), S({ face: 'ko', hx: 1, arms: ['fup', 'fdown'] })];
const CELEB = [S({ arms: ['up', 'upf'], face: 'feliz' }), S({ bob: 4, arms: ['upf', 'up'], legs: ['tuck', 'bentb'], face: 'grito' })];
const CELEB_F = [S({ arms: ['fup', 'fup'], face: 'feliz' }), S({ bob: 4, arms: ['fup', 'fup'], legs: ['fup', 'fup'], face: 'grito' })];
const SAD_F = [S({ arms: ['fhead', 'fhead'], face: 'triste', hy: 1 }), S({ arms: ['fhead', 'fhead'], face: 'triste', hy: 1, bob: 1 })];
const JUMP = [S({ bob: 2, legs: ['tuck', 'tuck'], arms: ['up', 'up'] }), S({ bob: 6, legs: ['tuck', 'bentb'], arms: ['upf', 'up'] })];
const THROW = [S({ arms: ['up', 'up'], hy: 1 }), S({ arms: ['upf', 'upf'], legs: ['fwd', 'back'] })];
const GK_READY = [S({ bob: -1, legs: ['fwide', 'fwide'], arms: ['fout', 'fout'] }), S({ bob: -2, legs: ['fwide', 'fwide'], arms: ['fout', 'fout'] })];
const GK_DIVE = [S({ bob: 2, legs: ['back', 'back'], arms: ['upf', 'upf'], rot: -35, ty: -2, face: 'grito' }), S({ legs: ['back', 'back'], arms: ['upf', 'upf'], rot: -80, ty: 1, face: 'grito' })];
const GK_CATCH = [S({ arms: ['fwd', 'fwd'] })];
const GK_THROW = [S({ arms: ['up', 'up'] }), S({ arms: ['upf', 'fwd'], legs: ['fwd', 'back'] })];
const CHILENA = [60, 140, 200].map((r, i) => S({ ...HURT, legs: ['tuck', 'kickup'], rot: r, ty: [-2, -4, -2][i], face: 'grito' }));

/** name: frames per second, loop, and the poses from the side, the front and the back (without front or back the side one is used). */
export const CHIBI_ANIMS: Record<string, { fps: number; loop: boolean; side: ChibiPose[]; front?: ChibiPose[]; back?: ChibiPose[]; keeper?: boolean }> = {
  idle: { fps: 5, loop: true, side: IDLE, front: IDLE_F, back: IDLE_F },
  run: { fps: 12, loop: true, side: RUN, front: RUN_F, back: RUN_F },
  run_ball: { fps: 12, loop: true, side: RUN, front: RUN_F, back: RUN_F },
  shot: { fps: 16, loop: false, side: SHOT },
  pass: { fps: 14, loop: false, side: PASS },
  chip: { fps: 14, loop: false, side: SHOT },
  header: { fps: 10, loop: false, side: HEADER },
  volley: { fps: 12, loop: false, side: VOLLEY },
  chilena: { fps: 10, loop: false, side: CHILENA },
  slide: { fps: 10, loop: false, side: SLIDE },
  tackle: { fps: 14, loop: false, side: PUNCH },
  punch: { fps: 14, loop: false, side: PUNCH },
  kick_hit: { fps: 14, loop: false, side: KICK },
  stagger: { fps: 10, loop: false, side: STAGGER },
  tumble: { fps: 12, loop: false, side: TUMBLE },
  lie: { fps: 2, loop: true, side: LIE },
  fall_getup: { fps: 8, loop: false, side: GETUP },
  dizzy: { fps: 6, loop: true, side: DIZZY, front: DIZZY, back: DIZZY },
  celebrate: { fps: 8, loop: true, side: CELEB, front: CELEB_F, back: CELEB_F },
  dance: { fps: 8, loop: true, side: CELEB, front: CELEB_F, back: CELEB_F },
  sad: { fps: 4, loop: true, side: SAD_F, front: SAD_F, back: SAD_F },
  jump: { fps: 10, loop: false, side: JUMP },
  throw_in: { fps: 8, loop: false, side: THROW },
  keeper_ready: { fps: 6, loop: true, side: GK_READY, front: GK_READY, back: GK_READY, keeper: true },
  keeper_dive: { fps: 10, loop: false, side: GK_DIVE, keeper: true },
  keeper_catch: { fps: 6, loop: false, side: GK_CATCH, keeper: true },
  keeper_throw: { fps: 10, loop: false, side: GK_THROW, keeper: true },
  keeper_punt: { fps: 12, loop: false, side: SHOT, keeper: true },
};
// poses meant for the front view (sad, dizzy, the keeper ready) are drawn from the front even in the side rows
const FRONT_ONLY = new Set(['sad', 'dizzy', 'keeper_ready']);

/** The whole sheet of a person: every football and fighting animation in the five rows (the keeper ones only for keepers). */
export function chibiSheet(L: NesLook, opts: { keeper?: boolean } = {}): { png: Raster; meta: NesSheetMeta } {
  const frames: Raster[] = [], anims: NesSheetMeta['anims'] = {};
  for (const [name, a] of Object.entries(CHIBI_ANIMS)) {
    if (a.keeper && !opts.keeper) continue;
    for (const [dir, view] of Object.entries(NES_DIRS)) {
      const own = view === 'front' ? a.front : view === 'back' ? a.back : a.side;
      const poses = own ?? a.side, v: NesView = FRONT_ONLY.has(name) ? (view === 'back' ? 'back' : 'front') : own ? view : 'side';
      const start = frames.length;
      for (const p of poses) frames.push(chibiFrame(L, v, p));
      anims[`${name}_${dir}`] = { start, frames: poses.length, fps: a.fps, loop: a.loop };
    }
  }
  return packNes(frames, anims);
}
