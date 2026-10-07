import type { WorkImage } from './work';
import { labAt } from './work';
import { type Mask, components, maskBBox } from './background';
import { thinParts } from './morph';
import { kmeans } from '../color/kmeans';
import { type Lab, deltaE, labToLch } from '../color/oklab';

/** Zonas que el motor reconoce. `face` son ojos, cejas y boca: se borran y se reemplazan por sellos. */
export const ZONES = ['bg', 'hair', 'skin', 'face', 'top', 'bottom', 'socks', 'shoes', 'accessory', 'line'] as const;
export type Zone = (typeof ZONES)[number];
export const ZONE_ID: Record<Zone, number> = Object.fromEntries(ZONES.map((z, i) => [z, i])) as Record<Zone, number>;

export interface Point { x: number; y: number }
export interface Box { x: number; y: number; w: number; h: number }

/** Lo que el usuario marca sobre la cabeza: el recuadro (del tope del pelo a la barbilla) y los dos ojos. */
export interface HeadSpec {
  box: Box;
  eyes: [Point, Point];
}

export interface ZoneEdit {
  /** wand: toda la región conectada del mismo grupo de color. brush: un círculo. */
  mode: 'wand' | 'brush';
  x: number;
  y: number;
  r?: number;
  zone: Zone;
}

export interface ZoneAnalysis {
  w: number;
  h: number;
  /** grupo de color por pixel (-1 fondo) */
  cluster: Int32Array;
  centers: Lab[];
  /** zona por pixel (índice en ZONES) */
  zone: Uint8Array;
  head: HeadSpec;
  /** true si el recuadro y los ojos fueron adivinados por el motor */
  headGuessed: boolean;
}

const K = 12;

interface Clustering {
  cluster: Int32Array;
  centers: Lab[];
  /** 1 = línea del dibujo (oscura y delgada) */
  line: Uint8Array;
}

function clusterImage(img: WorkImage, mask: Mask): Clustering {
  const { w, h } = img.raster;
  const fgIdx: number[] = [];
  for (let i = 0; i < w * h; i++) if (mask[i]) fgIdx.push(i);
  const km = kmeans(fgIdx.map((i) => labAt(img, i)), K, 11);
  const remap = km.centers.map((_, i) => i);
  for (let i = 0; i < km.centers.length; i++)
    for (let j = 0; j < i; j++)
      if (remap[j] === j && deltaE(km.centers[i], km.centers[j]) < 0.035) { remap[i] = j; break; }
  const cluster = new Int32Array(w * h).fill(-1);
  fgIdx.forEach((p, k) => (cluster[p] = remap[km.assign[k]]));
  // líneas: pixeles oscuros que forman trazos delgados (la apertura los borra; el pelo negro grueso sobrevive)
  const bb = maskBBox(mask, w, h);
  const r = Math.max(2, Math.round((bb.y1 - bb.y0) / 260));
  const line = new Uint8Array(w * h);
  km.centers.forEach((c, ci) => {
    // la línea del dibujo es oscura y casi gris; un trazo azul oscuro (lentes) es accesorio
    if (remap[ci] !== ci || c[0] > 0.42 || Math.hypot(c[1], c[2]) > 0.06) return;
    const m = new Uint8Array(w * h);
    for (const p of fgIdx) if (cluster[p] === ci) m[p] = 1;
    const thin = thinParts(m, w, h, r);
    // por pixel: un trazo con color propio (lentes azules) no es línea aunque caiga en el grupo oscuro
    for (let i = 0; i < w * h; i++) if (thin[i] && Math.hypot(img.lab[i * 3 + 1], img.lab[i * 3 + 2]) < 0.06) line[i] = 1;
  });
  return { cluster, centers: km.centers, line };
}

function isSkinLike(lab: Lab): boolean {
  const [L, C, hRad] = labToLch(lab);
  const hue = ((hRad * 180) / Math.PI + 360) % 360;
  return L > 0.45 && L < 0.94 && C > 0.02 && C < 0.2 && hue > 15 && hue < 100;
}

export function proposeZones(img: WorkImage, mask: Mask, head?: HeadSpec): ZoneAnalysis {
  const { w, h } = img.raster;
  const cl = clusterImage(img, mask);
  const { cluster, centers, line } = cl;
  const nC = centers.length;
  const fgIdx: number[] = [];
  for (let i = 0; i < w * h; i++) if (mask[i]) fgIdx.push(i);

  const guessed = !head;
  const hs = head ?? guessHead(img, mask, cl);
  const hb = hs.box;

  const clusterAt = (x: number, y: number, r: number): number => {
    const votes = new Map<number, number>();
    for (let yy = Math.round(y - r); yy <= Math.round(y + r); yy++)
      for (let xx = Math.round(x - r); xx <= Math.round(x + r); xx++) {
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const p = yy * w + xx;
        const c = cluster[p];
        if (c < 0 || line[p] || centers[c][0] < 0.3) continue;
        votes.set(c, (votes.get(c) ?? 0) + 1);
      }
    let best = -1, bv = 0;
    votes.forEach((v, c) => { if (v > bv) { bv = v; best = c; } });
    return best;
  };

  // piel: debajo de los ojos (mejillas) y entre los ojos
  const [e1, e2] = hs.eyes;
  const ed = Math.max(4, Math.hypot(e2.x - e1.x, e2.y - e1.y));
  const mx = (e1.x + e2.x) / 2, my = (e1.y + e2.y) / 2;
  const skinVotes = new Map<number, number>();
  for (const [x, y] of [[mx, my + ed * 0.55], [e1.x, e1.y + ed * 0.45], [e2.x, e2.y + ed * 0.45], [mx, my + ed * 0.2]]) {
    const c = clusterAt(x, y, ed * 0.1);
    if (c >= 0) skinVotes.set(c, (skinVotes.get(c) ?? 0) + 1);
  }
  let skin = -1, sv = 0;
  skinVotes.forEach((v, c) => { if (v > sv) { sv = v; skin = c; } });

  // pelo: lo que más hay en la franja alta de la cabeza (sin contar líneas)
  const hairVotes = new Array(nC).fill(0);
  for (let y = Math.max(0, Math.round(hb.y)); y < Math.min(h, hb.y + hb.h * 0.3); y++)
    for (let x = Math.max(0, Math.round(hb.x)); x < Math.min(w, hb.x + hb.w); x++) {
      const p = y * w + x;
      const c = cluster[p];
      if (c >= 0 && c !== skin && !line[p]) hairVotes[c]++;
    }
  const hair = argmax(hairVotes);

  // cuerpo por franjas, debajo de la cabeza
  const bb = maskBBox(mask, w, h);
  const bodyTop = hb.y + hb.h;
  const bodyH = Math.max(1, bb.y1 - bodyTop);
  const band = (y: number) => (y - bodyTop) / bodyH;
  const inBand = (lo: number, hi: number) => {
    const v = new Array(nC).fill(0);
    for (const p of fgIdx) {
      if (line[p]) continue;
      const t = band((p / w) | 0);
      if (t >= lo && t < hi) v[cluster[p]]++;
    }
    return v;
  };
  const taken = new Set<number>([skin].filter((c) => c >= 0));
  const pick = (votes: number[], minShare: number, allowHair = false): number => {
    const total = votes.reduce((a, b) => a + b, 0) || 1;
    let best = -1, bv = 0;
    votes.forEach((v, c) => { if (!taken.has(c) && (allowHair || c !== hair) && v > bv) { bv = v; best = c; } });
    if (best >= 0 && bv / total >= minShare) { taken.add(best); return best; }
    return -1;
  };
  const top = pick(inBand(0, 0.4), 0.15);
  const bottom = pick(inBand(0.4, 0.75), 0.12);
  const shoes = pick(inBand(0.92, 1.01), 0.15, true);
  const socks = pick(inBand(0.72, 0.93), 0.12);

  const zoneOfCluster = new Array<Zone>(nC).fill('accessory');
  const set = (c: number, z: Zone) => { if (c >= 0) zoneOfCluster[c] = z; };
  set(top, 'top'); set(bottom, 'bottom'); set(socks, 'socks'); set(hair, 'hair'); set(skin, 'skin');
  if (shoes !== hair) set(shoes, 'shoes');

  const zone = new Uint8Array(w * h);
  for (const p of fgIdx) zone[p] = line[p] ? ZONE_ID.line : ZONE_ID[zoneOfCluster[cluster[p]]];

  // Por pieza conectada: el mismo color puede ser camisa arriba y medias abajo (uniforme),
  // o pelo arriba y zapatos abajo. La posición decide.
  const expected: Partial<Record<Zone, [number, number]>> = { top: [-0.2, 0.55], bottom: [0.3, 0.88], socks: [0.55, 0.98], shoes: [0.85, 1.1] };
  const byBand = (t: number): Zone => (t >= 0.9 ? 'shoes' : t >= 0.62 ? 'socks' : t >= 0.4 ? 'bottom' : 'top');
  const solid = new Uint8Array(w * h);
  for (const p of fgIdx) if (!line[p]) solid[p] = 1;
  // componentes por grupo de color
  const compOf = new Int32Array(w * h).fill(-1);
  const comps: { c: number; size: number; sy: number; x0: number; x1: number; y0: number; y1: number }[] = [];
  for (const start of fgIdx) {
    if (!solid[start] || compOf[start] >= 0) continue;
    const c = cluster[start];
    const id = comps.length;
    const info = { c, size: 0, sy: 0, x0: w, x1: 0, y0: h, y1: 0 };
    const stack = [start];
    compOf[start] = id;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w, y = (p / w) | 0;
      info.size++; info.sy += y;
      if (x < info.x0) info.x0 = x; if (x > info.x1) info.x1 = x;
      if (y < info.y0) info.y0 = y; if (y > info.y1) info.y1 = y;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1])
        if (q >= 0 && solid[q] && compOf[q] < 0 && cluster[q] === c) { compOf[q] = id; stack.push(q); }
    }
    comps.push(info);
  }
  const minSize = fgIdx.length * 0.002;
  const compZone = comps.map((k) => {
    const z = zoneOfCluster[k.c];
    const t = band(k.sy / k.size);
    if (z === 'hair') {
      // pelo solo si toca la cabeza (el pelo largo cuelga desde ahí)
      const touchesHead = k.y0 <= hb.y + hb.h && k.x1 >= hb.x && k.x0 <= hb.x + hb.w;
      return touchesHead ? 'hair' : k.size >= minSize ? byBand(t) : 'line';
    }
    const ex = expected[z];
    if (ex && k.size >= minSize && (t < ex[0] || t > ex[1])) return byBand(t);
    return z;
  });
  for (const p of fgIdx) if (compOf[p] >= 0) zone[p] = ZONE_ID[compZone[compOf[p]]];

  // detalles pegados a una prenda con el mismo tono (pliegues, sombras del dibujo) toman esa prenda
  for (let k = 0; k < comps.length; k++) {
    if (compZone[k] !== 'accessory') continue;
    const ck = centers[comps[k].c];
    const touch = new Map<Zone, number>();
    for (let y = comps[k].y0; y <= comps[k].y1; y++)
      for (let x = comps[k].x0; x <= comps[k].x1; x++) {
        const p = y * w + x;
        if (compOf[p] !== k) continue;
        for (const q of [p - 1, p + 1, p - w, p + w, p - 2, p + 2, p - 2 * w, p + 2 * w]) {
          if (q < 0 || q >= w * h || compOf[q] === k || !mask[q]) continue;
          const zq = ZONES[zone[q]];
          if (zq === 'line' || zq === 'accessory' || zq === 'face') continue;
          touch.set(zq, (touch.get(zq) ?? 0) + 1);
        }
      }
    let bestZ: Zone | null = null, bc = 0;
    touch.forEach((v, z) => { if (v > bc) { bc = v; bestZ = z; } });
    if (!bestZ) continue;
    // ¿mismo tono que esa prenda, solo más claro u oscuro?
    const zc = zoneMeanCenter(bestZ);
    if (zc && hueClose(ck, zc)) {
      for (let y = comps[k].y0; y <= comps[k].y1; y++)
        for (let x = comps[k].x0; x <= comps[k].x1; x++) if (compOf[y * w + x] === k) zone[y * w + x] = ZONE_ID[bestZ];
    }
  }
  function zoneMeanCenter(z: Zone): Lab | null {
    const cs = centers.filter((_, i) => zoneOfCluster[i] === z);
    return cs.length ? cs[0] : null;
  }

  // rasgos de la cara: lo que no es piel ni pelo dentro del rectángulo de la cara
  const face = { x0: Math.min(e1.x, e2.x) - ed * 0.55, x1: Math.max(e1.x, e2.x) + ed * 0.55, y0: my - ed * 0.6, y1: my + ed * 1.05 };
  const notSkinHair = new Uint8Array(w * h);
  for (const p of fgIdx) {
    const z = zone[p];
    if (z !== ZONE_ID.skin && z !== ZONE_ID.hair) notSkinHair[p] = 1;
  }
  const comp = components(notSkinHair, w, h, 1);
  const sx = new Float64Array(comp.sizes.length), sy = new Float64Array(comp.sizes.length);
  for (const p of fgIdx) {
    const l = comp.labels[p];
    if (l >= 0) { sx[l] += p % w; sy[l] += (p / w) | 0; }
  }
  const faceArea = (face.x1 - face.x0) * (face.y1 - face.y0);
  // ancho de cada pieza: algo que cruza de un ojo al otro (lentes) no es un rasgo, es accesorio
  const cx0 = new Float64Array(comp.sizes.length).fill(w), cx1 = new Float64Array(comp.sizes.length);
  for (const p of fgIdx) {
    const l = comp.labels[p];
    if (l >= 0) { const x = p % w; if (x < cx0[l]) cx0[l] = x; if (x > cx1[l]) cx1[l] = x; }
  }
  const cw = Array.from(cx0, (v, i) => cx1[i] - v + 1);
  for (const p of fgIdx) {
    const l = comp.labels[p];
    if (l < 0) continue;
    const cx = sx[l] / comp.sizes[l], cy = sy[l] / comp.sizes[l];
    if (cx >= face.x0 && cx <= face.x1 && cy >= face.y0 && cy <= face.y1 && comp.sizes[l] < faceArea * 0.35 && cw[l] < ed * 0.9) zone[p] = ZONE_ID.face;
  }
  // dentro de la cabeza no hay ropa: lo que quede ahí es accesorio (cintillo, lentes, gorra)
  for (let y = Math.max(0, Math.floor(hb.y)); y < Math.min(h, hb.y + hb.h * 0.85); y++)
    for (let x = Math.max(0, Math.floor(hb.x)); x < Math.min(w, hb.x + hb.w); x++) {
      const p = y * w + x;
      if (!mask[p]) continue;
      const z = ZONES[zone[p]];
      if (z === 'top' || z === 'bottom' || z === 'socks' || z === 'shoes') zone[p] = ZONE_ID.accessory;
    }

  return { w, h, cluster, centers, zone, head: hs, headGuessed: guessed };
}

function hueClose(a: Lab, b: Lab): boolean {
  const la = labToLch(a), lb = labToLch(b);
  if (la[1] < 0.03 && lb[1] < 0.03) return true; // dos grises
  if (la[1] < 0.03 || lb[1] < 0.03) return false;
  let d = Math.abs(la[2] - lb[2]);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d < 0.35;
}

/** Aplica las correcciones del usuario (varita y pincel) en orden. */
export function applyZoneEdits(z: ZoneAnalysis, mask: Mask, edits: ZoneEdit[]): Uint8Array {
  const { w, h } = z;
  const zone = new Uint8Array(z.zone);
  for (const e of edits) {
    const id = ZONE_ID[e.zone];
    if (e.mode === 'brush') {
      const r = e.r ?? 4;
      for (let y = Math.max(0, Math.floor(e.y - r)); y <= Math.min(h - 1, Math.ceil(e.y + r)); y++)
        for (let x = Math.max(0, Math.floor(e.x - r)); x <= Math.min(w - 1, Math.ceil(e.x + r)); x++)
          if (mask[y * w + x] && (x - e.x) ** 2 + (y - e.y) ** 2 <= r * r) zone[y * w + x] = id;
      continue;
    }
    const sx = Math.round(e.x), sy = Math.round(e.y);
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
    const start = sy * w + sx;
    const c = z.cluster[start];
    if (c < 0) continue;
    const startZone = zone[start];
    const seen = new Uint8Array(w * h);
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      zone[p] = id;
      const x = p % w, y = (p / w) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1])
        if (q >= 0 && !seen[q] && z.cluster[q] === c && zone[q] === startZone) { seen[q] = 1; stack.push(q); }
    }
  }
  return zone;
}

/**
 * Adivina la cabeza desde la cara: la pieza de color piel más grande en la mitad de arriba.
 * La barbilla es donde esa pieza se angosta (cuello). Los ojos son los dos huecos oscuros dentro de la cara.
 * Si no hay piel reconocible, usa el perfil de ancho de la silueta.
 */
export function guessHead(img: WorkImage, mask: Mask, cl?: Clustering): HeadSpec {
  const { w, h } = img.raster;
  const bb = maskBBox(mask, w, h);
  const H = bb.y1 - bb.y0 + 1;
  const c = cl ?? clusterImage(img, mask);
  // 1. pieza de piel
  let best: { pixels: number[]; size: number } | null = null;
  c.centers.forEach((center, ci) => {
    if (!isSkinLike(center)) return;
    const m = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) if (c.cluster[i] === ci && !c.line[i]) m[i] = 1;
    const comp = components(m, w, h, 1);
    const sy = new Float64Array(comp.sizes.length);
    for (let i = 0; i < w * h; i++) if (comp.labels[i] >= 0) sy[comp.labels[i]] += (i / w) | 0;
    comp.sizes.forEach((size, l) => {
      if (sy[l] / size > bb.y0 + H * 0.5) return;
      if (!best || size > best.size) {
        const pixels: number[] = [];
        for (let i = 0; i < w * h; i++) if (comp.labels[i] === l) pixels.push(i);
        best = { pixels, size };
      }
    });
  });
  if (!best) return guessHeadByProfile(img, mask);
  const face = best as { pixels: number[]; size: number };
  const rowW = new Map<number, { n: number; x0: number; x1: number }>();
  for (const p of face.pixels) {
    const y = (p / w) | 0, x = p % w;
    const r = rowW.get(y) ?? { n: 0, x0: w, x1: 0 };
    r.n++; r.x0 = Math.min(r.x0, x); r.x1 = Math.max(r.x1, x);
    rowW.set(y, r);
  }
  const ys = [...rowW.keys()].sort((a, b) => a - b);
  let maxRow = ys[0];
  for (const y of ys) if (rowW.get(y)!.n > rowW.get(maxRow)!.n) maxRow = y;
  const maxN = rowW.get(maxRow)!.n;
  let chin = ys[ys.length - 1];
  for (const y of ys) if (y > maxRow && rowW.get(y)!.n < maxN * 0.55) { chin = y - 1; break; }
  let fx0 = w, fx1 = 0;
  for (const y of ys) if (y <= chin) { fx0 = Math.min(fx0, rowW.get(y)!.x0); fx1 = Math.max(fx1, rowW.get(y)!.x1); }
  const faceTop = ys[0];
  const fw = fx1 - fx0 + 1, fcx = (fx0 + fx1) / 2;
  // 2. recuadro: del tope de la silueta (pelo) a la barbilla
  let top = faceTop;
  for (let y = bb.y0; y < faceTop; y++) {
    let hit = false;
    for (let x = Math.round(fx0); x <= fx1 && !hit; x++) if (mask[y * w + x]) hit = true;
    if (hit) { top = y; break; }
  }
  let x0 = fx0, x1 = fx1;
  const lim0 = fcx - fw * 0.85, lim1 = fcx + fw * 0.85;
  for (let y = top; y <= chin; y++)
    for (let x = Math.max(0, Math.round(lim0)); x <= Math.min(w - 1, lim1); x++)
      if (mask[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
  const box: Box = { x: x0, y: top, w: x1 - x0 + 1, h: chin - top + 1 };
  // 3. ojos: huecos dentro de la cara, en la franja media
  const inFace = new Uint8Array(w * h);
  for (const p of face.pixels) inFace[p] = 1;
  const holes = new Uint8Array(w * h);
  const fh = chin - faceTop + 1;
  for (let y = Math.round(faceTop + fh * 0.2); y < chin - fh * 0.12; y++) {
    const r = rowW.get(y);
    if (!r) continue;
    for (let x = r.x0 + 1; x < r.x1; x++) {
      const p = y * w + x;
      if (!inFace[p] && mask[p] && img.lab[p * 3] < 0.55) holes[p] = 1;
    }
  }
  const eyes = pickEyePair(holes, w, h, { x: fx0, y: faceTop, w: fw, h: fh });
  return { box, eyes: eyes ?? [{ x: fcx - fw * 0.22, y: faceTop + fh * 0.55 }, { x: fcx + fw * 0.22, y: faceTop + fh * 0.55 }] };
}

function pickEyePair(m: Uint8Array, w: number, h: number, box: Box): [Point, Point] | null {
  const comp = components(m, w, h, 1);
  const blobs = comp.sizes.map((size) => ({ size, x: 0, y: 0 }));
  for (let p = 0; p < w * h; p++) {
    const l = comp.labels[p];
    if (l >= 0) { blobs[l].x += p % w; blobs[l].y += (p / w) | 0; }
  }
  blobs.forEach((b) => { b.x /= b.size; b.y /= b.size; });
  const area = box.w * box.h;
  const cand = blobs.filter((b) => b.size >= area * 0.002 && b.size < area * 0.08);
  let best: [Point, Point] | null = null, bestScore = Infinity;
  for (let i = 0; i < cand.length; i++)
    for (let j = i + 1; j < cand.length; j++) {
      const a = cand[i], b = cand[j];
      const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
      if (dx < box.w * 0.15 || dx > box.w * 0.7 || dy > box.h * 0.08) continue;
      const score = dy / box.h + Math.abs(a.size - b.size) / Math.max(a.size, b.size) + (2 * Math.abs((a.x + b.x) / 2 - (box.x + box.w / 2))) / box.w;
      if (score < bestScore) {
        bestScore = score;
        best = a.x < b.x ? [{ x: a.x, y: a.y }, { x: b.x, y: b.y }] : [{ x: b.x, y: b.y }, { x: a.x, y: a.y }];
      }
    }
  return best;
}

/** Plan B: la silueta crece (cabeza) y luego se angosta (cuello). */
function guessHeadByProfile(img: WorkImage, mask: Mask): HeadSpec {
  const { w, h } = img.raster;
  const bb = maskBBox(mask, w, h);
  const H = bb.y1 - bb.y0 + 1;
  const widths: { x0: number; x1: number; n: number }[] = [];
  for (let y = bb.y0; y <= bb.y1; y++) {
    let x0 = w, x1 = -1, n = 0;
    for (let x = 0; x < w; x++) if (mask[y * w + x]) { n++; if (x < x0) x0 = x; x1 = x; }
    widths.push({ x0, x1, n });
  }
  let maxSoFar = 0, bottom = Math.round(H * 0.3);
  for (let r = 0; r < H * 0.6; r++) {
    maxSoFar = Math.max(maxSoFar, widths[r].n);
    if (r > H * 0.08 && widths[r].n < maxSoFar * 0.7) { bottom = r; break; }
  }
  let x0 = w, x1 = 0;
  for (let r = 0; r < bottom; r++) { x0 = Math.min(x0, widths[r].x0); x1 = Math.max(x1, widths[r].x1); }
  const box: Box = { x: x0, y: bb.y0, w: x1 - x0 + 1, h: bottom };
  const dark = new Uint8Array(w * h);
  for (let y = Math.round(box.y + box.h * 0.35); y < box.y + box.h * 0.85; y++)
    for (let x = box.x + Math.round(box.w * 0.12); x < box.x + box.w * 0.88; x++) {
      const p = y * w + x;
      if (mask[p] && img.lab[p * 3] < 0.4) dark[p] = 1;
    }
  const eyes = pickEyePair(dark, w, h, box) ?? [
    { x: box.x + box.w * 0.36, y: box.y + box.h * 0.6 },
    { x: box.x + box.w * 0.64, y: box.y + box.h * 0.6 },
  ];
  return { box, eyes };
}

function argmax(v: number[]): number {
  let best = -1, bv = 0;
  v.forEach((x, i) => { if (x > bv) { bv = x; best = i; } });
  return best;
}
