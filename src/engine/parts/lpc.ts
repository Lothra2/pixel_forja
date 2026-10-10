import data from './lpc-data.json';
import { hexToLab, labToHex, labToLch, lchToLab, type Lab } from '../color/oklab';
import type { EyeExpr, MouthExpr } from '../head/stamps';
import type { ModelHeadImage, ModelHeadPal } from '../head3d/render';

/**
 * Piezas dibujadas a mano del proyecto LPC (Liberated Pixel Cup): cabezas, caras con expresiones, cejas,
 * narices, barbas, bigotes, lentes y 86 peinados, cada uno en tres direcciones.
 * Se recolorean de forma relativa (cada tono guarda su distancia al tono base que eligió el artista),
 * así el sombreado original se conserva con cualquier color de piel o de pelo.
 * Licencias: CC-BY-SA, GPL, OGA-BY, CC0 según la pieza. Hay que dar crédito: ver lpcCredits().
 */
interface PartDir { x: number; y: number; w: number; h: number; colors: string[]; px: string }
interface Part { file: string; dirs: Partial<Record<LpcDir, PartDir>> }
interface Credit { authors: string; licenses: string; urls: string }
const DATA = data as unknown as { source: string; parts: Record<string, Part>; credits: Record<string, Credit> };

export type LpcDir = 'down' | 'right' | 'up';
export type LpcHeadId = string;
export const LPC_HEADS: LpcHeadId[] = ['male', 'female', 'male_plump', 'male_gaunt', 'male_elderly', 'female_elderly'];
/** cabezas de monstruo para enemigos: traen sus propios ojos y colores (no se recolorean como piel humana) */


const keysOf = (prefix: string) => Object.keys(DATA.parts).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
export const LPC_HAIRS: string[] = keysOf('hair/');
export const LPC_BEARDS: string[] = keysOf('beard/');
export const LPC_MUSTACHES: string[] = keysOf('mustache/');
export const LPC_GLASSES: string[] = keysOf('glasses/');
export const LPC_NOSES: string[] = keysOf('nose/');
export const LPC_BROWS: string[] = keysOf('brows/');
export const LPC_HATS: string[] = keysOf('hat/');
/** cabezas de monstruo para enemigos: traen sus propios ojos y colores (no se recolorean como piel humana) */
export const LPC_MONSTERS: LpcHeadId[] = keysOf('head/').filter((k) => !LPC_HEADS.includes(k));
export const isMonsterHead = (head: string) => !LPC_HEADS.includes(head);
export const LPC_EARS: string[] = keysOf('ears/');
export const LPC_HORNS: string[] = keysOf('horns/');

export interface LpcLook {
  head: LpcHeadId;
  hair: string | null;
  brows: string | null;
  nose: string | null;
  beard: string | null;
  mustache: string | null;
  glasses: string | null;
  /** gorro, sombrero o casco */
  hat?: string | null;
  /** color del gorro (sin color se deja el del artista: metal, cuero, tela) */
  hatColor?: string | null;
  /** orejas de elfo, de bestia, de dragón */
  ears?: string | null;
  /** cuernos (demonios, bestias) */
  horns?: string | null;
}

export const DEFAULT_LPC: LpcLook = { head: 'male', hair: 'parted', brows: 'thin', nose: null, beard: null, mustache: null, glasses: null };

export interface LpcColors { skin: string; hair: string; eyes: string; beard: string; glasses: string }

// ---------- datos ----------

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const decoded = new Map<string, Uint8Array>();
function decode(s: string): Uint8Array {
  let out = decoded.get(s);
  if (out) return out;
  const clean = s.replace(/=+$/, '');
  out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buf = 0, bits = 0, j = 0;
  for (const ch of clean) {
    buf = (buf << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) { bits -= 8; out[j++] = (buf >> bits) & 255; }
  }
  decoded.set(s, out);
  return out;
}

// ---------- color relativo ----------

/** Color más repetido de una pieza (en la piel es el relleno de la cara). */
function modeColor(d: PartDir): string {
  const px = decode(d.px);
  const n = new Array(d.colors.length).fill(0);
  for (const v of px) if (v) n[v - 1]++;
  // el contorno casi negro no cuenta (en cabezas chicas de monstruo puede ser lo más repetido)
  d.colors.forEach((c, i) => { if (hexToLab(c)[0] < 0.3) n[i] = 0; });
  return d.colors[n.indexOf(Math.max(...n))];
}

/** Tono base del pelo o la barba: el promedio de sus pixeles (el más repetido puede ser el contorno). */
const baseCache = new Map<PartDir, string>();
function baseColor(d: PartDir): string {
  let b = baseCache.get(d);
  if (b) return b;
  const px = decode(d.px);
  const labs = d.colors.map(hexToLab);
  const acc = [0, 0, 0];
  let n = 0;
  for (const v of px) if (v) { const l = labs[v - 1]; acc[0] += l[0]; acc[1] += l[1]; acc[2] += l[2]; n++; }
  b = labToHex([acc[0] / n, acc[1] / n, acc[2] / n] as Lab);
  baseCache.set(d, b);
  return b;
}

/** Lleva un tono del artista al color pedido, guardando su distancia al tono base. */
function relative(c: string, base: string, target: string, kL = 1, hueKeep = 0.5): string {
  const [Lc, Cc, hc] = labToLch(hexToLab(c));
  const [Lb, Cb, hb] = labToLch(hexToLab(base));
  const [Lt, Ct, ht] = labToLch(hexToLab(target));
  let dh = hc - hb;
  while (dh > Math.PI) dh -= 2 * Math.PI;
  while (dh < -Math.PI) dh += 2 * Math.PI;
  // un color oscuro no aguanta el mismo rango de luces que el original: las distancias se achican
  const k = kL * Math.max(0.45, Math.min(1.15, Lb > 0.05 ? Lt / Lb : 1));
  const L = Math.max(0.08, Math.min(0.97, Lt + (Lc - Lb) * k));
  const C = Math.max(0, Math.min(0.18, Ct * (1 + (Cc / Math.max(0.01, Cb) - 1) * 0.35)));
  return labToHex(lchToLab([L, C, ht + dh * hueKeep] as Lab));
}

const isIris = (hex: string) => {
  const [L, C, h] = labToLch(hexToLab(hex));
  const deg = ((h * 180) / Math.PI + 360) % 360;
  return C > 0.035 && deg > 190 && deg < 270 && L < 0.85;
};

/** Color de piel de una cabeza de monstruo (para pintar el cuerpo igual). null en cabezas humanas. */
export function lpcSkinOf(head: string): string | null {
  if (!isMonsterHead(head)) return null;
  const d = DATA.parts[`head/${head}`]?.dirs.down;
  return d ? modeColor(d) : null;
}

// ---------- armado ----------

const EXPR: Record<EyeExpr, string> = { open: 'neutral', closed: 'closed', happy: 'happy', sad: 'sad', angry: 'anger', wide: 'shock', hurt: 'sad' };

interface Layer { key: string; mat: ModelHeadPal['mat']; map: (c: string, d: PartDir) => string }

const cache = new Map<string, ModelHeadImage>();
/** pixeles de pelo que pueden colgar por debajo de la barbilla */
const MAX_HAIR_DROP = 8;

/**
 * Cabeza armada con piezas LPC para una vista. side mira a la derecha (la izquierda la espeja el clip).
 * front34 es la de frente girada un poco a la derecha (vista isométrica): ojos, nariz, cejas, bigote, lentes
 * y boca se corren un pixel hacia donde mira, como lo haría un pixel artista. LPC no trae diagonales.
 * El ancla es el cuello: centro de la barbilla de la pieza de la cabeza.
 */
export function lpcHead(look: LpcLook, view: 'front' | 'side' | 'back' | 'front34', colors: LpcColors, eyes: EyeExpr = 'open', mouth?: MouthExpr): ModelHeadImage {
  const key = JSON.stringify([look, view, colors, eyes, mouth]);
  const hit = cache.get(key);
  if (hit) return hit;
  const dir: LpcDir = view === 'front' || view === 'front34' ? 'down' : view === 'side' ? 'right' : 'up';
  const turn = view === 'front34' ? 1 : 0;
  const turns = (k: string) => turn > 0 && /^(face|nose|brows|mustache|glasses)\//.test(k);
  const sex = look.head.startsWith('female') ? 'female' : 'male';
  const headPart = DATA.parts[`head/${look.head}`] ?? DATA.parts['head/male'];
  const headDir = headPart.dirs[dir]!;
  const skinBase = modeColor(headDir);
  const headColors = new Set(headDir.colors);
  const irisBase = '#5686ae';
  const monster = isMonsterHead(look.head);
  // monstruo: con su color de siempre queda igual; con otro color se tiñe (un esqueleto verde, un orco gris)
  const keepOwn = monster && colors.skin.toLowerCase() === (lpcSkinOf(look.head) ?? '').toLowerCase();
  const skin = (c: string) => (keepOwn ? c : relative(c, skinBase, colors.skin));
  // blanco del ojo: frío y casi sin color. Los tonos claros de la piel (cálidos) se recolorean como piel
  const eyeWhite = (c: string) => { const [L, C, h] = labToLch(hexToLab(c)); const deg = ((h * 180) / Math.PI + 360) % 360; return L > 0.9 && (C < 0.012 || (deg > 150 && deg < 280)); };
  const faceMap = (c: string) => (isIris(c) ? relative(c, irisBase, colors.eyes, 1, 0) : eyeWhite(c) ? c : headColors.has(c) || labToLch(hexToLab(c))[1] > 0.03 ? skin(c) : c);
  const tinted = (target: string, kL = 1) => (c: string, d: PartDir) => relative(c, baseColor(d), target, kL);
  const brow = labToHex((() => { const l = hexToLab(colors.hair); return [Math.min(0.3, l[0] * 0.75), l[1], l[2]] as Lab; })());
  // la expresión feliz de LPC no trae boca: con boca abierta o risa se usa la cara de sorpresa o feliz
  const exprName = mouth === 'o' && eyes === 'open' ? 'shock' : (mouth === 'grin' || mouth === 'open') && eyes === 'open' ? 'happy' : EXPR[eyes];
  const layers: Layer[] = [];
  if (look.hair) layers.push({ key: `hairbg/${look.hair}`, mat: 'hair', map: tinted(colors.hair) });
  const earMap = look.ears === 'cat' || look.ears === 'wolf' ? tinted(colors.hair) : skin;
  // las orejas llevan su propio material (con la rampa de la piel): así se pueden tratar como el pelo al encuadrar
  if (look.ears) layers.push({ key: `earsbg/${look.ears}`, mat: 'ears', map: earMap });
  if (look.horns) layers.push({ key: `hornsbg/${look.horns}`, mat: 'accessory', map: (c) => c });
  layers.push({
    key: `head/${look.head}`, mat: 'skin',
    map: monster ? (c) => (eyeWhite(c) || isIris(c) ? c : skin(c)) : (c) => (isIris(c) ? relative(c, irisBase, colors.eyes, 1, 0) : eyeWhite(c) ? c : skin(c)),
  });
  // las caras, narices, cejas y barbas humanas no calzan en una cabeza de monstruo
  if (!monster) {
    if (dir !== 'up') layers.push({ key: `face/${sex}/${exprName}`, mat: 'face', map: faceMap });
    if (look.nose && dir !== 'up') layers.push({ key: `nose/${look.nose}`, mat: 'skin', map: skin });
    if (look.brows && dir !== 'up') layers.push({ key: `brows/${look.brows}`, mat: 'hair', map: tinted(brow, 0.8) });
    if (look.beard) layers.push({ key: `beard/${look.beard}`, mat: 'beard', map: tinted(colors.beard) });
    if (look.mustache && dir !== 'up') layers.push({ key: `mustache/${look.mustache}`, mat: 'beard', map: tinted(colors.beard) });
  }
  if (look.ears) layers.push({ key: `ears/${look.ears}`, mat: 'ears', map: earMap });
  if (look.hair) layers.push({ key: `hair/${look.hair}`, mat: 'hair', map: tinted(colors.hair) });
  if (look.horns) layers.push({ key: `horns/${look.horns}`, mat: 'accessory', map: (c) => c });
  if (look.glasses && dir !== 'up') {
    layers.push({
      key: `glasses/${look.glasses}`, mat: 'accessory',
      map: (c, d) => (labToLch(hexToLab(c))[0] > 0.8 && d.colors.length > 1 ? c : relative(c, baseColor(d), colors.glasses, 0.6)),
    });
  }
  if (look.hat) {
    const hc = look.hatColor;
    // el gorro cuenta como pelo para el encuadre: un ala ancha puede recortarse en el borde en poses extremas
    layers.push({ key: `hat/${look.hat}`, mat: 'hair', map: (c, d) => (hc ? relative(c, baseColor(d), hc, 0.9) : c) });
  }

  const happyBrows = mouth === 'smile' || mouth === 'grin' || mouth === 'open';
  // caja común en coordenadas del cuadro LPC de 64x64
  const used = layers.map((l) => ({ l, d: DATA.parts[l.key]?.dirs[dir] })).filter((u): u is { l: Layer; d: PartDir } => !!u.d);
  let x0 = 64, y0 = 64, x1 = 0, y1 = 0;
  for (const { d } of used) { x0 = Math.min(x0, d.x); y0 = Math.min(y0, d.y); x1 = Math.max(x1, d.x + d.w); y1 = Math.max(y1, d.y + d.h); }
  const w = x1 - x0, h = y1 - y0;
  const idx = new Int16Array(w * h).fill(-1);
  const pal: ModelHeadPal[] = [];
  const palIdx = new Map<string, number>();
  const chinY = headDir.y + headDir.h - 1;
  const entry = (hex: string, mat: ModelHeadPal['mat'], back: boolean) => {
    const k = `${hex}|${mat}|${back}`;
    let i = palIdx.get(k);
    if (i === undefined) { i = pal.length; pal.push({ hex, mat, back, dark: '#1e1418' }); palIdx.set(k, i); }
    return i;
  };
  // al girar, la cara se corre: donde estaba queda piel (sin los ojos de la pieza de la cabeza)
  const faceDir = turn ? used.find((u) => u.l.key.startsWith('face/'))?.d : undefined;
  const inFace = (fx: number, fy: number) => !!faceDir && fx >= faceDir.x && fx < faceDir.x + faceDir.w && fy >= faceDir.y && fy < faceDir.y + faceDir.h;
  for (const { l, d } of used) {
    const px = decode(d.px);
    const sh = turns(l.key) ? turn : 0;
    // con lentes, las cejas suben por encima del marco (si no, el marco o el vidrio las tapan)
    // con boca contenta, las puntas de afuera de la ceja no caen (si caen, la cara se lee triste)
    const lift = happyBrows && l.key.startsWith('brows/') && d.h >= 2;
    let shy = 0;
    if (look.glasses && l.key.startsWith('brows/')) {
      const g = DATA.parts[`glasses/${look.glasses}`]?.dirs[dir];
      if (g) shy = Math.min(0, g.y - 1 - (d.y + d.h - 1));
    }
    const mapped = d.colors.map((c) => l.map(c, d));
    for (let yy = 0; yy < d.h; yy++)
      for (let xx = 0; xx < d.w; xx++) {
        const v = px[yy * d.w + xx];
        if (!v) continue;
        if (lift && yy === d.h - 1 && !px[(yy - 1) * d.w + xx]) continue;
        const fx = d.x + xx + sh, fy = d.y + yy + shy;
        if (fx >= x1) continue;
        // pelo larguísimo: en un sprite de juego se corta a la altura de la espalda (si no, barre el piso y no cabe)
        if (l.mat === 'hair' && fy > chinY + MAX_HAIR_DROP) continue;
        // el pelo que baja más que la barbilla va detrás del cuerpo (salvo de espalda)
        const back = l.mat === 'hair' && dir !== 'up' && fy > chinY;
        const hex = l.key.startsWith('head/') && inFace(fx, fy) ? skin(skinBase) : mapped[v - 1];
        idx[(fy - y0) * w + (fx - x0)] = entry(hex, l.mat, back);
      }
  }
  // boca: las caras LPC no traen boca. Se dibuja a mano, con el tono oscuro de la piel, debajo de la nariz
  const r1 = chinY - 3, r2 = chinY - 2;
  const c0 = Math.round(headDir.x + headDir.w / 2) - 2 + turn; // de frente, cuatro columnas: c0..c0+3
  const bearded = !!look.beard && dir === 'down' && !monster;
  if (bearded && mouth !== 'frown') {
    // la sombra de la barba LPC baja en V desde la boca y se lee como cara triste: alrededor de la boca se aclara
    const lum = (i: number) => hexToLab(pal[i].hex)[0];
    const tones = [...new Set(idx)].filter((i) => i >= 0 && pal[i].mat === 'beard').sort((a, b) => lum(a) - lum(b));
    const mid = tones[Math.floor(tones.length / 2)];
    for (let fy = r1; fy <= Math.min(r2 + 2, y1 - 1); fy++)
      for (let fx = c0 - 1; fx <= c0 + 4; fx++) {
        const i = (fy - y0) * w + (fx - x0);
        if (fx >= x0 && fx < x1 && idx[i] >= 0 && pal[idx[i]].mat === 'beard' && lum(idx[i]) < lum(mid)) idx[i] = mid;
      }
  }
  if (mouth && mouth !== 'line' && dir !== 'up' && !monster) {
    const lip = skin('#99423c'), dark = '#5a1f26', teeth = '#f4f1ea';
    const put = (fx: number, fy: number, hex: string) => {
      const i = (fy - y0) * w + (fx - x0);
      if (fx < x0 || fy < y0 || fx >= x1 || fy >= y1 || idx[i] < 0) return;
      idx[i] = entry(hex, 'face', false);
    };
    if (dir === 'down') {
      // con barba, la sonrisa es más ancha para que se vea entre el pelo
      const wide = bearded && (mouth === 'smile' || mouth === 'grin');
      const shapes: Record<string, [string, string]> = wide
        ? { smile: ['l....l', '.llll.'], grin: ['lttttl', '.llll.'] }
        : { smile: ['l..l', '.ll.'], grin: ['lttl', '.ll.'], open: ['.dd.', '.dd.'], o: ['.dd.', '....'], frown: ['.ll.', 'l..l'] };
      const [a, b] = shapes[mouth] ?? ['....', '.ll.'];
      const cx = wide ? c0 - 1 : c0;
      [a, b].forEach((row, j) => [...row].forEach((ch, i) => {
        if (ch !== '.') put(cx + i, j ? r2 : r1, ch === 'l' ? lip : ch === 't' ? teeth : dark);
      }));
    } else {
      // de lado: la boca queda junto al borde de la cara
      let xr = x0;
      for (let xx = x1 - 1; xx >= x0; xx--) { const v = idx[(r2 - y0) * w + (xx - x0)]; if (v >= 0 && pal[v].mat === 'skin') { xr = xx; break; } }
      if (mouth === 'smile' || mouth === 'grin') { put(xr - 1, r1, lip); put(xr - 2, r2, lip); put(xr - 3, r2, lip); if (mouth === 'grin') put(xr - 2, r1, teeth); }
      else if (mouth === 'open' || mouth === 'o') { put(xr - 1, r1, dark); put(xr - 1, r2, dark); }
      else if (mouth === 'frown') { put(xr - 1, r2, lip); put(xr - 2, r1, lip); }
    }
  }
  // cuello: debajo del centro de la cabeza; de lado, un poco hacia la nuca
  const neckX = headDir.x + headDir.w / 2 - (dir === 'right' ? 2 : 0);
  const out: ModelHeadImage = { img: { w, h, idx }, pal, anchor: { x: Math.round(neckX - x0), y: chinY - y0 } };
  if (cache.size > 400) cache.clear();
  cache.set(key, out);
  return out;
}

/** Créditos de las piezas usadas (obligatorios para usar el arte LPC). */
export function lpcCredits(look: LpcLook): string[] {
  const keys = [`head/${look.head}`];
  if (!isMonsterHead(look.head)) keys.push(`face/${look.head.startsWith('female') ? 'female' : 'male'}/neutral`);
  if (look.ears) keys.push(`ears/${look.ears}`, `earsbg/${look.ears}`);
  if (look.horns) keys.push(`horns/${look.horns}`, `hornsbg/${look.horns}`);
  if (look.hair) keys.push(`hair/${look.hair}`, `hairbg/${look.hair}`);
  for (const [p, v] of [['brows', look.brows], ['nose', look.nose], ['beard', look.beard], ['mustache', look.mustache], ['glasses', look.glasses], ['hat', look.hat]] as const) if (v) keys.push(`${p}/${v}`);
  const lines: string[] = [];
  for (const k of keys) {
    const part = DATA.parts[k];
    if (!part) continue;
    const rel = part.file.replace('spritesheets/', '');
    const c = DATA.credits[rel];
    if (c) lines.push(`${rel}: ${c.authors}. ${c.licenses}. ${c.urls}`);
  }
  return lines;
}

export const LPC_SOURCE = DATA.source;
