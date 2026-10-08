import type { Raster } from '../core/raster';
import { makeWorkImage, labAt, type WorkImage } from '../analyze/work';
import { removeBackground, maskBBox, hasTransparency, type BrushStroke, type Mask } from '../analyze/background';
import { analyzePortrait, type PortraitInfo } from '../analyze/portrait';
import { kmeans } from '../color/kmeans';
import { proposeZones, applyZoneEdits, ZONE_ID, type HeadSpec, type ZoneEdit, type ZoneAnalysis, type Zone } from '../analyze/zones';
import { type Lab, labToHex, deltaE } from '../color/oklab';
import { makeRamp } from '../color/ramp';
import { pixelateHead } from '../head/pixelate';
import { dimsFor } from '../rig/dims';
import {
  type HumanFicha as Ficha, type CellSize, type Proportions, type HeadBitmap, CELL_SIZES, FICHA_FORMAT, FICHA_VERSION, DEFAULT_PROPORTIONS,
} from './ficha';

export interface BuildInput {
  name: string;
  bgTolerance?: number;
  bgStrokes?: BrushStroke[];
  /** cabeza y ojos marcados por el usuario, en coordenadas de la imagen de trabajo */
  head?: HeadSpec;
  zoneEdits?: ZoneEdit[];
  outfit?: Partial<Ficha['outfit']>;
  face?: Partial<Ficha['face']>;
  sizes?: CellSize[];
  proportions?: Proportions;
  /** forzar cuerpo entero o busto (si no, se detecta) */
  mode?: ImageMode;
  /** vistas extra subidas por el usuario (imagen de lado mirando a la derecha, y de espalda) */
  extra?: { side?: Raster; back?: Raster };
  palette?: Partial<Ficha['palette']>;
}

export type ImageMode = 'full' | 'bust';

export interface Analysis {
  work: WorkImage;
  mask: Mask;
  zones: ZoneAnalysis;
  /** zona final por pixel, con las correcciones del usuario */
  zone: Uint8Array;
  /** cuerpo entero (dibujo) o busto (foto o retrato) */
  mode: ImageMode;
  portrait?: PortraitInfo;
}

/**
 * ¿Cuerpo entero o busto? Un dibujo de cuerpo entero tiene un borde casi de un solo color.
 * Una foto tiene un borde variado, y un busto además queda cortado por el borde de abajo.
 */
export function detectMode(work: WorkImage): ImageMode {
  if (hasTransparency(work)) return 'full';
  const { w, h } = work.raster;
  const lab = work.lab;
  const at = (i: number): Lab => [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]];
  const border: number[] = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) border.push(y * w, y * w + w - 1);
  const km = kmeans(border.map(at), 4, 3);
  const top = Math.max(...km.counts);
  const uniform = top / border.length;
  if (uniform < 0.55) return 'bust';
  const main = km.centers[km.counts.indexOf(top)];
  let cut = 0;
  for (let x = 0; x < w; x++) if (deltaE(at((h - 1) * w + x), main) > 0.1) cut++;
  return cut > w * 0.6 ? 'bust' : 'full';
}

export const DEFAULT_BG_TOLERANCE = 0.06;

export function analyzeImage(image: Raster, input: Pick<BuildInput, 'bgTolerance' | 'bgStrokes' | 'head' | 'zoneEdits' | 'mode'>, work0?: WorkImage): Analysis {
  const work = work0 ?? makeWorkImage(image);
  const mode = input.mode ?? detectMode(work);
  if (mode === 'bust') {
    const p = analyzePortrait(work, input.head);
    const mask = p.mask;
    for (const st of input.bgStrokes ?? []) applyStroke(mask, p.zones.zone, work.raster.w, work.raster.h, st);
    const zone = applyZoneEdits(p.zones, mask, input.zoneEdits ?? []);
    return { work, mask, zones: p.zones, zone, mode, portrait: p.info };
  }
  const mask = removeBackground(work, { tolerance: input.bgTolerance ?? DEFAULT_BG_TOLERANCE, strokes: input.bgStrokes });
  const zones = proposeZones(work, mask, input.head);
  const zone = applyZoneEdits(zones, mask, input.zoneEdits ?? []);
  return { work, mask, zones, zone, mode };
}

/** Pincel de fondo en modo busto: "es fondo" borra, "es personaje" agrega como piel/ropa según la altura. */
function applyStroke(mask: Mask, zone: Uint8Array, w: number, h: number, st: BrushStroke) {
  for (let y = Math.max(0, Math.floor(st.y - st.r)); y <= Math.min(h - 1, st.y + st.r); y++)
    for (let x = Math.max(0, Math.floor(st.x - st.r)); x <= Math.min(w - 1, st.x + st.r); x++) {
      if ((x - st.x) ** 2 + (y - st.y) ** 2 > st.r * st.r) continue;
      const i = y * w + x;
      if (st.mode === 'bg') { mask[i] = 0; zone[i] = 0; }
      else if (!mask[i]) { mask[i] = 1; zone[i] = ZONE_ID.skin; }
    }
}

const BUST_DEFAULTS = { bottom: '#2f3440', socks: '#f2f2f2', shoes: '#e8e8ec' };

const FALLBACK: Record<string, string> = {
  skin: '#f1c7a5', hair: '#4a3020', top: '#4a7bd0', bottom: '#2d3a5a', socks: '#f2f2f2', shoes: '#3a3a44', accessory: '#e04a6a',
};

/** Color base de una zona: promedio de la parte iluminada (sin las sombras del dibujo ni los brillos). */
export function zoneColor(a: Analysis, z: Zone): string | null {
  const id = ZONE_ID[z];
  const labs: Lab[] = [];
  const { w, h } = a.work.raster;
  for (let i = 0; i < w * h; i++) if (a.mask[i] && a.zone[i] === id) labs.push(labAt(a.work, i));
  if (labs.length < 6) return null;
  labs.sort((p, q) => p[0] - q[0]);
  const lo = Math.floor(labs.length * 0.4), hi = Math.max(lo + 1, Math.floor(labs.length * 0.9));
  const s = [0, 0, 0];
  for (let i = lo; i < hi; i++) { s[0] += labs[i][0]; s[1] += labs[i][1]; s[2] += labs[i][2]; }
  const n = hi - lo;
  return labToHex([s[0] / n, s[1] / n, s[2] / n]);
}

function eyeColor(a: Analysis): string {
  const { w } = a.work.raster;
  const [e1, e2] = a.zones.head.eyes;
  const ed = Math.max(4, Math.hypot(e2.x - e1.x, e2.y - e1.y));
  const r = Math.max(2, ed * 0.18);
  const cand: Lab[] = [];
  for (const e of [e1, e2])
    for (let y = Math.round(e.y - r); y <= e.y + r; y++)
      for (let x = Math.round(e.x - r); x <= e.x + r; x++) {
        if (x < 0 || y < 0 || x >= w || y >= a.work.raster.h) continue;
        const i = y * w + x;
        if (!a.mask[i]) continue;
        const lab = labAt(a.work, i);
        if (lab[0] > 0.18 && lab[0] < 0.75 && Math.hypot(lab[1], lab[2]) > 0.03) cand.push(lab);
      }
  if (cand.length < 3) return '#3b2a20';
  cand.sort((p, q) => Math.hypot(q[1], q[2]) - Math.hypot(p[1], p[2]));
  const top = cand.slice(0, Math.max(3, Math.floor(cand.length / 2)));
  const m = top.reduce((s, l) => [s[0] + l[0], s[1] + l[1], s[2] + l[2]], [0, 0, 0]).map((v) => v / top.length);
  return labToHex([m[0], m[1], m[2]]);
}

/** Adivina el tipo de ropa mirando dónde hay piel y dónde tela. El usuario lo puede cambiar con un toque. */
export function inferOutfit(a: Analysis): Ficha['outfit'] {
  const { w, h } = a.work.raster;
  const bb = maskBBox(a.mask, w, h);
  const hb = a.zones.head.box;
  const bodyTop = hb.y + hb.h, bodyH = Math.max(1, bb.y1 - bodyTop);
  const count = (y0: number, y1: number, z: Zone, cond?: (x: number) => boolean) => {
    let n = 0;
    for (let y = Math.max(0, Math.round(bodyTop + y0 * bodyH)); y < Math.min(h, bodyTop + y1 * bodyH); y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (a.mask[i] && a.zone[i] === ZONE_ID[z] && (!cond || cond(x))) n++;
      }
    return n;
  };
  // mangas: piel en los costados de la franja del torso
  const rowsMid = Math.round(bodyTop + 0.25 * bodyH);
  let x0 = w, x1 = 0;
  for (let x = 0; x < w; x++) if (a.mask[rowsMid * w + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  const side = (x: number) => x < x0 + (x1 - x0) * 0.2 || x > x1 - (x1 - x0) * 0.2;
  const armSkin = count(0.2, 0.45, 'skin', side), armTop = count(0.2, 0.45, 'top', side);
  const upperSkin = count(0.02, 0.15, 'skin', side), upperTop = count(0.02, 0.15, 'top', side);
  const sleeves = upperSkin > upperTop ? 'none' : armSkin > armTop * 0.6 ? 'short' : 'long';
  // pantalón largo si la tela del pantalón llega a la parte baja de la pierna
  const lowBottom = count(0.68, 0.86, 'bottom'), lowSkin = count(0.68, 0.86, 'skin');
  let bottom: Ficha['outfit']['bottom'] = lowBottom > lowSkin ? 'pants' : 'shorts';
  // falda: el ancho de la tela de abajo crece hacia abajo
  if (bottom === 'shorts') {
    const widthAt = (t: number) => {
      const y = Math.round(bodyTop + t * bodyH);
      let n = 0;
      for (let x = 0; x < w; x++) if (a.zone[y * w + x] === ZONE_ID.bottom) n++;
      return n;
    };
    // falda solo con evidencia clara: abajo es bastante más ancha que en la cintura
    // la prenda baja sin cortes desde la cintura; las rayitas de las medias no cuentan
    let lastT = 0.42;
    for (let t = 0.42; t < 0.9 && widthAt(t) > 0; t += 0.01) lastT = t;
    if (widthAt(lastT - 0.02) > widthAt(0.42) * 1.25) bottom = 'skirt';
  }
  const socksPx = count(0.6, 0.95, 'socks');
  let socks: Ficha['outfit']['socks'] = 'none';
  if (socksPx > 20) {
    const socksHigh = count(0.6, 0.78, 'socks');
    socks = socksHigh > socksPx * 0.3 ? 'knee' : 'low';
  }
  // vestido: no hay prenda de abajo aparte y la camisa baja hasta las piernas
  const dress = count(0.35, 0.8, 'bottom') < count(0.35, 0.8, 'top') * 0.15 && count(0.45, 0.7, 'top') > count(0.45, 0.7, 'skin') * 0.6;
  if (dress) bottom = 'skirt';
  // guantes: accesorio a los costados, a la altura de las manos
  let hx0 = w, hx1 = 0;
  const handRow = Math.round(bodyTop + 0.42 * bodyH);
  for (let x = 0; x < w; x++) if (a.mask[handRow * w + x]) { hx0 = Math.min(hx0, x); hx1 = Math.max(hx1, x); }
  const sideH = (x: number) => x < hx0 + (hx1 - hx0) * 0.22 || x > hx1 - (hx1 - hx0) * 0.22;
  const gloves = count(0.3, 0.55, 'accessory', sideH) > Math.max(30, count(0.3, 0.55, 'skin', sideH) * 0.8);
  return { sleeves, bottom, socks, ...(gloves ? { gloves: true } : {}), ...(dress ? { dress: true } : {}) } as Ficha['outfit'];
}

/**
 * Lentes: accesorio en un anillo alrededor de los dos ojos. Si los hay, se sacan de la imagen
 * (pasan a piel) y se dibujan después con un sello, porque reducidos se rompen.
 */
export function detectGlasses(a: Analysis): { color: string; zone: Uint8Array } | null {
  const { w, h } = a.work.raster;
  const [e1, e2] = a.zones.head.eyes;
  const ed = Math.max(4, Math.hypot(e2.x - e1.x, e2.y - e1.y));
  const r0 = ed * 0.18, r1 = ed * 0.62;
  const hits: number[] = [];
  let ringTotal = 0;
  const perEye = [0, 0];
  for (let y = Math.max(0, Math.floor(Math.min(e1.y, e2.y) - r1)); y <= Math.min(h - 1, Math.max(e1.y, e2.y) + r1); y++)
    for (let x = Math.max(0, Math.floor(e1.x - r1)); x <= Math.min(w - 1, e2.x + r1); x++) {
      const i = y * w + x;
      let k = -1;
      for (const [j, e] of [e1, e2].entries()) {
        const dx = Math.abs(x - e.x), dy = Math.abs(y - e.y);
        const d = Math.max(dx, dy * 1.25);
        if (d >= r0 && d <= r1) k = j;
      }
      if (k < 0) continue;
      ringTotal++;
      if (a.mask[i] && a.zone[i] === ZONE_ID.accessory) { hits.push(i); perEye[k]++; }
    }
  if (!ringTotal || hits.length < ringTotal * 0.08 || Math.min(...perEye) < hits.length * 0.25) return null;
  const labs = hits.map((i) => labAt(a.work, i)).sort((p, q) => p[0] - q[0]);
  const mid = labs[Math.floor(labs.length / 2)];
  const zone = new Uint8Array(a.zone);
  // el marco y el puente pasan a piel para que no queden pedazos sueltos
  const minY = Math.min(e1.y, e2.y) - r1, maxY = Math.max(e1.y, e2.y) + r1;
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(h - 1, maxY); y++)
    for (let x = Math.max(0, Math.floor(e1.x - r1)); x <= Math.min(w - 1, e2.x + r1); x++) {
      const i = y * w + x;
      if (a.mask[i] && a.zone[i] === ZONE_ID.accessory) zone[i] = ZONE_ID.skin;
    }
  return { color: labToHex(mid), zone };
}

export interface BuildReport {
  headGuessed: boolean;
  missingZones: Zone[];
  outfitGuessed: Ficha['outfit'];
}

export function buildFicha(image: Raster, input: BuildInput, analysis?: Analysis): { ficha: Ficha; analysis: Analysis; report: BuildReport } {
  const a = analysis ?? analyzeImage(image, input);
  const missing: Zone[] = [];
  const color = (z: Zone) => {
    const c = zoneColor(a, z);
    if (!c) { missing.push(z); return FALLBACK[z]; }
    return c;
  };
  const palette: Ficha['palette'] = {
    skin: makeRamp(color('skin')),
    hair: makeRamp(color('hair')),
    eyes: eyeColor(a),
    top: makeRamp(color('top')),
    bottom: makeRamp(color('bottom')),
    socks: makeRamp(color('socks')),
    shoes: makeRamp(color('shoes')),
    accessory: makeRamp(color('accessory')),
  };
  const bust = a.mode === 'bust';
  if (bust) {
    // en un busto no se ven las piernas: ropa deportiva por defecto, se cambia en el estudio
    for (const z of ['bottom', 'socks', 'shoes'] as Zone[]) {
      const i = missing.indexOf(z);
      if (i >= 0) missing.splice(i, 1);
    }
    palette.bottom = makeRamp(BUST_DEFAULTS.bottom);
    palette.socks = makeRamp(BUST_DEFAULTS.socks);
    palette.shoes = makeRamp(BUST_DEFAULTS.shoes);
    if (a.portrait?.print) palette.accessory = makeRamp(a.portrait.print);
  }
  const guessed: Ficha['outfit'] = bust ? { sleeves: 'short', bottom: 'shorts', socks: 'low', ...(a.portrait?.print ? { print: a.portrait.print } : {}) } : inferOutfit(a);
  const isDress = (guessed as { dress?: boolean }).dress;
  delete (guessed as { dress?: boolean }).dress;
  if (isDress && !input.palette?.bottom) palette.bottom = palette.top;
  const outfit = { ...guessed, ...input.outfit };
  if (missing.includes('socks') && !input.outfit?.socks) outfit.socks = 'none';
  const ficha: Ficha = {
    format: FICHA_FORMAT,
    version: FICHA_VERSION,
    name: input.name,
    body: { skeleton: 'human', proportions: { ...DEFAULT_PROPORTIONS } },
    palette,
    outfit,
    face: { eyes: 'round', mouth: bust ? 'line' : 'smile', blush: !a.portrait?.beard, brows: !!a.portrait?.brows, thickBrows: !!a.portrait?.brows, glasses: null, ...input.face },
    heads: {},
    physics: { hairLag: 1 },
  };
  const glasses = input.face?.glasses === null || bust ? null : detectGlasses(a);
  if (glasses && input.face?.glasses === undefined) ficha.face.glasses = glasses.color;
  const headZone = glasses && ficha.face.glasses ? glasses.zone : a.zone;
  if (input.proportions) ficha.body.proportions = { ...input.proportions };
  const extra = {
    side: input.extra?.side ? analyzeImage(input.extra.side, {}) : null,
    back: input.extra?.back ? analyzeImage(input.extra.back, {}) : null,
  };
  for (const cell of input.sizes ?? CELL_SIZES) {
    const d = dimsFor(cell, ficha.body.proportions);
    const front = pixelateHead(a.work, headZone, a.mask, a.zones.head, d.headW, palette.skin);
    const set: { front: HeadBitmap; side?: HeadBitmap; back?: HeadBitmap } = { front };
    if (extra.side) {
      const e = extra.side;
      const hb = pixelateHead(e.work, e.zone, e.mask, e.zones.head, d.headW, palette.skin);
      // de lado se ve un ojo: el que queda más adelante
      const eye = hb.eyes[1];
      set.side = { ...hb, eyes: [{ ...eye }, { ...eye }] };
    }
    if (extra.back) {
      const e = extra.back;
      set.back = pixelateHead(e.work, e.zone, e.mask, e.zones.head, d.headW, palette.skin);
    }
    ficha.heads[`${cell}`] = set;
  }
  return { ficha, analysis: a, report: { headGuessed: a.zones.headGuessed && !input.head, missingZones: missing, outfitGuessed: guessed } };
}
