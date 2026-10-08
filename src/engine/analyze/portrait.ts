import type { WorkImage } from './work';
import { labAt } from './work';
import { type Mask, components } from './background';
import { ZONE_ID, clusterImage, type HeadSpec, type ZoneAnalysis, type Point } from './zones';
import { type Lab, labToLch, labToHex, deltaE } from '../color/oklab';

/**
 * Modo busto, para fotos y retratos: la figura está cortada por el borde de abajo y el fondo puede ser
 * cualquier cosa (un parque, una pared). En vez de quitar el fondo desde los bordes, se parte de la cara:
 * la pieza grande de color piel cerca del centro. Desde ahí se buscan ojos, cejas, pelo (oscuro, arriba),
 * barba (gris u oscura, en la mandíbula) y camisa (debajo de la barbilla), siempre dentro de un óvalo de cabeza.
 */

export interface PortraitInfo {
  /** cejas gruesas y oscuras: se dibujan con sello */
  brows: boolean;
  beard: boolean;
  /** color de un estampado chillón en la camisa, si hay */
  print: string | null;
}

/** La figura toca el borde de abajo en buena parte del ancho: es un busto, no un cuerpo entero. */
export function isBust(work: WorkImage, mask: Mask): boolean {
  const { w, h } = work.raster;
  let n = 0;
  for (let x = 0; x < w; x++) if (mask[(h - 1) * w + x]) n++;
  return n > w * 0.4;
}

function lch(work: WorkImage, i: number): Lab {
  return labToLch(labAt(work, i));
}
const deg = (r: number) => ((r * 180) / Math.PI + 360) % 360;

function skinLike(work: WorkImage, i: number): boolean {
  const [L, C, h] = lch(work, i);
  const hue = deg(h);
  return L > 0.35 && L < 0.9 && C > 0.025 && C < 0.15 && hue > 20 && hue < 85;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

export function analyzePortrait(work: WorkImage, given?: HeadSpec): { zones: ZoneAnalysis; mask: Mask; info: PortraitInfo } {
  const { w, h } = work.raster;
  const N = w * h;
  // 1. cara: la pieza de piel más grande y centrada
  const skin = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (skinLike(work, i)) skin[i] = 1;
  const comp = components(skin, w, h, 1);
  const cx = new Float64Array(comp.sizes.length), cy = new Float64Array(comp.sizes.length);
  for (let i = 0; i < N; i++) { const l = comp.labels[i]; if (l >= 0) { cx[l] += i % w; cy[l] += (i / w) | 0; } }
  let face = -1, best = 0;
  comp.sizes.forEach((s, l) => {
    const mx = cx[l] / s, my = cy[l] / s;
    const central = 1 - Math.min(1, Math.abs(mx - w / 2) / (w / 2));
    const upper = my < h * 0.75 ? 1 : 0.3;
    const score = s * central * central * upper;
    if (score > best) { best = score; face = l; }
  });
  if (face < 0) throw new Error('No encontré una cara en la imagen. Prueba con la imagen de cuerpo entero o marca la cabeza a mano.');
  let fx0 = w, fx1 = 0, fy0 = h, fy1 = 0;
  const faceL: number[] = [];
  for (let i = 0; i < N; i++)
    if (comp.labels[i] === face) {
      const x = i % w, y = (i / w) | 0;
      fx0 = Math.min(fx0, x); fx1 = Math.max(fx1, x); fy0 = Math.min(fy0, y); fy1 = Math.max(fy1, y);
      faceL.push(work.lab[i * 3]);
    }
  const skinL = median(faceL);
  // ancho de cara: la fila más ancha de la pieza de piel en su mitad de arriba
  let W = 0;
  for (let y = fy0; y < fy0 + (fy1 - fy0) * 0.6; y++) {
    let a = w, b = -1;
    for (let x = fx0; x <= fx1; x++) if (comp.labels[y * w + x] === face) { a = Math.min(a, x); b = Math.max(b, x); }
    if (b - a > W) W = b - a;
  }
  // 2. ojos y cejas: manchas oscuras dentro de la cara, en la franja media alta
  const dark = new Uint8Array(N);
  for (let y = Math.round(fy0 + (fy1 - fy0) * 0.12); y < fy0 + (fy1 - fy0) * 0.62; y++)
    for (let x = fx0 + Math.round(W * 0.08); x <= fx1 - W * 0.08; x++) {
      const i = y * w + x;
      if (comp.labels[i] !== face && work.lab[i * 3] < skinL - 0.16) dark[i] = 1;
    }
  const dc = components(dark, w, h, 1);
  const blobs = dc.sizes.map((size) => ({ size, x: 0, y: 0, x0: w, x1: 0 }));
  for (let i = 0; i < N; i++) {
    const l = dc.labels[i];
    if (l < 0) continue;
    const x = i % w, y = (i / w) | 0;
    blobs[l].x += x; blobs[l].y += y; blobs[l].x0 = Math.min(blobs[l].x0, x); blobs[l].x1 = Math.max(blobs[l].x1, x);
  }
  blobs.forEach((b) => { b.x /= b.size; b.y /= b.size; });
  const big = blobs.filter((b) => b.size > W * W * 0.002);
  // por lado: la mancha de abajo es el ojo, la de arriba que lo solapa es la ceja
  // (así una cabeza inclinada no cruza la ceja de un lado con el ojo del otro)
  const fcx = (fx0 + fx1) / 2;
  const side = (sign: -1 | 1) => {
    const c = big.filter((b) => (b.x - fcx) * sign > W * 0.06 && (b.x - fcx) * sign < W * 0.48).sort((p, q) => q.y - p.y);
    const eye = c[0] ?? null;
    const brow = eye ? c.find((b) => b !== eye && eye.y - b.y > W * 0.03 && eye.y - b.y < W * 0.25 && b.x0 <= eye.x1 && b.x1 >= eye.x0) ?? null : null;
    return { eye, brow };
  };
  const L = side(-1), R = side(1);
  if (typeof process !== 'undefined' && process.env?.PF_DEBUG) console.log('W', W, 'skinL', skinL.toFixed(2), 'ojos', L.eye?.y, R.eye?.y, 'cejas', L.brow?.x1, L.brow?.x0, R.brow?.x1, R.brow?.x0);
  let eyes: [Point, Point] = L.eye && R.eye
    ? [{ x: L.eye.x, y: L.eye.y }, { x: R.eye.x, y: R.eye.y }]
    : [{ x: fcx - W * 0.2, y: fy0 + (fy1 - fy0) * 0.42 }, { x: fcx + W * 0.2, y: fy0 + (fy1 - fy0) * 0.42 }];
  const browW = (b: (typeof big)[number] | null) => (b ? b.x1 - b.x0 : 0);
  const brows = !!L.brow && !!R.brow && (browW(L.brow) + browW(R.brow)) / 2 > W * 0.14;
  if (given) eyes = given.eyes;
  const ex = (eyes[0].x + eyes[1].x) / 2, ey = (eyes[0].y + eyes[1].y) / 2;

  // 3. pelo: oscuro, encima de la frente, dentro del óvalo de cabeza
  const inHead = (x: number, y: number) => {
    const dx = (x - ex) / (W * 0.62);
    const dy = y < ey ? (y - ey) / (W * 0.95) : (y - ey) / (W * 1.0);
    return dx * dx + dy * dy <= 1;
  };
  const hairSeeds: number[] = [];
  const hairLabs: Lab[] = [];
  for (let y = Math.max(0, Math.round(fy0 - W * 0.3)); y < fy0 + W * 0.04; y++)
    for (let x = Math.round(ex - W * 0.3); x <= ex + W * 0.3; x++) {
      const i = y * w + x;
      if (x < 0 || x >= w || !inHead(x, y)) continue;
      if (work.lab[i * 3] < skinL - 0.12 && comp.labels[i] !== face) { hairSeeds.push(i); hairLabs.push(labAt(work, i)); }
    }
  const hairMean: Lab = hairLabs.length ? (hairLabs.reduce((s, l) => [s[0] + l[0], s[1] + l[1], s[2] + l[2]], [0, 0, 0]).map((v) => v / hairLabs.length) as Lab) : [0.3, 0.01, 0.02];
  const zone = new Uint8Array(N);
  const mask = new Uint8Array(N);
  const grow = (seeds: number[], ok: (i: number, x: number, y: number) => boolean, z: number) => {
    const stack = seeds.filter((i) => !mask[i]);
    for (const i of stack) { mask[i] = 1; zone[i] = z; }
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w, y = (p / w) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q < 0 || mask[q]) continue;
        if (ok(q, q % w, (q / w) | 0)) { mask[q] = 1; zone[q] = z; stack.push(q); }
      }
    }
  };
  // cara: piel conectada dentro del óvalo
  const faceSeeds: number[] = [];
  for (let i = 0; i < N; i++) if (comp.labels[i] === face && inHead(i % w, (i / w) | 0)) faceSeeds.push(i);
  grow(faceSeeds, (i, x, y) => inHead(x, y) && skinLike(work, i), ZONE_ID.skin);
  const hairOk = (i: number, x: number, y: number) =>
    inHead(x, y) && y < ey + W * 0.35 && deltaE(labAt(work, i), hairMean) < 0.13 && work.lab[i * 3] < skinL - 0.05;
  grow(hairSeeds, hairOk, ZONE_ID.hair);

  // 4. barba: gris u oscura en la mandíbula, debajo de la nariz
  const jawTop = ey + W * 0.28;
  const beardOk = (i: number, x: number, y: number) => {
    if (y < jawTop || !inHead(x, y)) return false;
    const [L, C] = lch(work, i);
    if (L > 0.86 && C < 0.03) return false; // blanco del fondo
    return !skinLike(work, i) && L < 0.82 && C < 0.07;
  };
  const beardSeeds: number[] = [];
  for (let y = Math.round(jawTop); y < ey + W * 0.85 && y < h; y++)
    for (let x = Math.round(ex - W * 0.35); x <= ex + W * 0.35; x++) {
      const i = y * w + x;
      if (x >= 0 && x < w && !mask[i] && beardOk(i, x, y)) beardSeeds.push(i);
    }
  const beardArea = (W * 0.7) * (W * 0.55);
  const beard = beardSeeds.length > beardArea * 0.12;
  if (beard) {
    grow(beardSeeds, beardOk, ZONE_ID.beard);
    // barba de sal y pimienta: pixel a pixel parece piel. Se mira el promedio de la zona:
    // más gris u oscuro que la piel limpia de la frente = barba
    const foreheadC: number[] = [];
    for (let y = Math.round(fy0 + (fy1 - fy0) * 0.05); y < ey - W * 0.18; y++)
      for (let x = Math.round(ex - W * 0.2); x <= ex + W * 0.2; x++) if (zone[y * w + x] === ZONE_ID.skin) foreheadC.push(lch(work, y * w + x)[1]);
    const skinC = median(foreheadC);
    const r = Math.max(2, Math.round(W * 0.03));
    const sumC = new Float64Array(N), sumL = new Float64Array(N);
    for (let i = 0; i < N; i++) { sumC[i] = lch(work, i)[1]; sumL[i] = work.lab[i * 3]; }
    const avg = (arr: Float64Array, x: number, y: number) => {
      let s2 = 0, n = 0;
      for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) if (xx >= 0 && yy >= 0 && xx < w && yy < h) { s2 += arr[yy * w + xx]; n++; }
      return s2 / n;
    };
    for (let y = Math.round(jawTop); y < ey + W * 0.95 && y < h; y++)
      for (let x = Math.round(ex - W * 0.5); x <= ex + W * 0.5; x++) {
        const i = y * w + x;
        if (x < 0 || x >= w || !mask[i] || zone[i] !== ZONE_ID.skin || !inHead(x, y)) continue;
        if (avg(sumC, x, y) < skinC * 0.78 || avg(sumL, x, y) < skinL - 0.09) zone[i] = ZONE_ID.beard;
      }
  }

  // 5. rasgos (ojos, cejas, boca) y huecos dentro de la cabeza
  const headMask = new Uint8Array(mask);
  const holes = components(headMask, w, h, 0);
  const borderLabel = new Set<number>();
  for (let x = 0; x < w; x++) { borderLabel.add(holes.labels[x]); borderLabel.add(holes.labels[(h - 1) * w + x]); }
  for (let y = 0; y < h; y++) { borderLabel.add(holes.labels[y * w]); borderLabel.add(holes.labels[y * w + w - 1]); }
  for (let i = 0; i < N; i++) {
    if (mask[i]) continue;
    const l = holes.labels[i];
    const x = i % w, y = (i / w) | 0;
    if (borderLabel.has(l) || holes.sizes[l] > W * W * 0.08 || !inHead(x, y)) continue;
    mask[i] = 1;
    zone[i] = y > fy0 + (fy1 - fy0) * 0.1 && y < ey + W * 0.7 ? ZONE_ID.face : ZONE_ID.hair;
  }
  // barbilla: la fila más baja de la cabeza en la columna central
  let chin = Math.round(ey + W * 0.5);
  for (let y = Math.round(ey); y < h; y++) {
    let any = false;
    for (let x = Math.round(ex - W * 0.15); x <= ex + W * 0.15; x++) if (mask[y * w + x]) any = true;
    if (!any) break;
    chin = y;
  }
  chin = Math.min(chin, Math.round(ey + W * 0.95));
  // lo que quedó debajo de la barbilla en el óvalo (cuello) no es cabeza
  for (let i = 0; i < N; i++) if (mask[i] && ((i / w) | 0) > chin) { mask[i] = 0; zone[i] = 0; }

  // 6. camisa: el color que domina abajo al centro, conectado
  const shirtLabs: Lab[] = [];
  const shirtSeeds: number[] = [];
  for (let y = Math.round(h * 0.88); y < h; y++)
    for (let x = Math.round(w * 0.3); x < w * 0.7; x++) { shirtSeeds.push(y * w + x); shirtLabs.push(labAt(work, y * w + x)); }
  const shirtMean = shirtLabs.reduce((s, l) => [s[0] + l[0], s[1] + l[1], s[2] + l[2]], [0, 0, 0]).map((v) => v / shirtLabs.length) as Lab;
  grow(shirtSeeds.filter((i) => deltaE(labAt(work, i), shirtMean) < 0.1), (i, _x, y) => y > chin && deltaE(labAt(work, i), shirtMean) < 0.1, ZONE_ID.top);
  // estampado: algo chillón dentro de la camisa
  let print: string | null = null;
  const shirtRows = (() => { let a = h, b = 0; for (let i = 0; i < N; i++) if (zone[i] === ZONE_ID.top) { const y = (i / w) | 0; a = Math.min(a, y); b = Math.max(b, y); } return [a, b]; })();
  const loud: Lab[] = [];
  for (let y = shirtRows[0]; y <= shirtRows[1]; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (mask[i]) continue;
      const [L, C] = lch(work, i);
      if (C > 0.12 && L > 0.6) {
        // rodeado de camisa
        let near = 0;
        for (const d of [-4, 4, -4 * w, 4 * w]) if (zone[i + d] === ZONE_ID.top) near++;
        if (near >= 2) { loud.push(labAt(work, i)); mask[i] = 1; zone[i] = ZONE_ID.accessory; }
      }
    }
  if (loud.length > 30) {
    const m = loud.reduce((s, l) => [s[0] + l[0], s[1] + l[1], s[2] + l[2]], [0, 0, 0]).map((v) => v / loud.length);
    print = labToHex([m[0], m[1], m[2]]);
  }

  // recuadro de la cabeza: del tope del pelo a la barbilla
  let hx0 = w, hx1 = 0, hy0 = h;
  for (let i = 0; i < N; i++) {
    if (!mask[i] || zone[i] === ZONE_ID.top || zone[i] === ZONE_ID.accessory) continue;
    const x = i % w, y = (i / w) | 0;
    hx0 = Math.min(hx0, x); hx1 = Math.max(hx1, x); hy0 = Math.min(hy0, y);
  }
  const head: HeadSpec = given ?? { box: { x: hx0, y: hy0, w: hx1 - hx0 + 1, h: chin - hy0 + 1 }, eyes };
  const cl = clusterImage(work, mask);
  return {
    zones: { w, h, cluster: cl.cluster, centers: cl.centers, zone, head, headGuessed: !given },
    mask,
    info: { brows, beard, print },
  };
}
