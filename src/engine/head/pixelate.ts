import type { WorkImage } from '../analyze/work';
import { labAt } from '../analyze/work';
import { type HeadSpec, ZONE_ID } from '../analyze/zones';
import type { Mask } from '../analyze/background';
import { kmeans } from '../color/kmeans';
import { type Lab, labToHex, deltaE } from '../color/oklab';
import { type Ramp, SHADOW, BASE, LIGHT } from '../color/ramp';
import { type HeadBitmap, type HeadZone, PIXEL_CHARS } from '../sheet/ficha';
import { EYES } from './stamps';
import { stampClass } from '../rig/dims';

const HEAD_ZONES: HeadZone[] = ['hair', 'skin', 'accessory'];
const TONES: Record<HeadZone, number> = { hair: 4, skin: 3, accessory: 3 };

/**
 * Pixela la cabeza zona por zona:
 * 1. cada celda del destino vota qué zona gana (la línea negra del dibujo no vota),
 * 2. dentro de la zona, toma el tono que MÁS se repite en el bloque (no el promedio, que ensucia),
 * 3. limpia pixeles sueltos y bordes,
 * 4. sombrea la frente bajo el flequillo.
 * Los ojos y la boca NO salen de aquí: son sellos que se ponen al dibujar cada cuadro.
 */
export function pixelateHead(
  img: WorkImage,
  zone: Uint8Array,
  mask: Mask,
  head: HeadSpec,
  headW: number,
  skinRamp: Ramp,
): HeadBitmap {
  const { w: W, h: H } = img.raster;
  const { box } = head;
  const k = box.w / headW;
  const [e1, e2] = head.eyes[0].x <= head.eyes[1].x ? head.eyes : [head.eyes[1], head.eyes[0]];
  const mx = (e1.x + e2.x) / 2;

  // la cuadrícula se centra en el punto medio de los ojos: misma plantilla siempre
  const halfCols = Math.ceil(Math.max(mx - box.x, box.x + box.w - mx) / k);
  const left = mx - halfCols * k;
  const top = box.y;
  const cols = halfCols * 2;
  // pelo largo: se extiende hacia abajo mientras haya pelo en el ancho de la cabeza
  let rows = Math.ceil(box.h / k);
  const maxRows = Math.ceil((box.h * 1.8) / k);
  while (rows < maxRows) {
    let hair = 0, tot = 0;
    for (let y = Math.floor(top + rows * k); y < top + (rows + 1) * k && y < H; y++)
      for (let x = Math.max(0, Math.floor(left)); x < left + cols * k && x < W; x++) {
        tot++;
        if (mask[y * W + x] && zone[y * W + x] === ZONE_ID.hair) hair++;
      }
    if (tot === 0 || hair / tot < 0.08) break;
    rows++;
  }
  const boxRows = Math.ceil(box.h / k);

  // tonos por zona (k-means en los pixeles de esa zona dentro de la cabeza)
  const zonePixels: Record<HeadZone, Lab[]> = { hair: [], skin: [], accessory: [] };
  for (let y = Math.max(0, Math.floor(top)); y < Math.min(H, top + rows * k); y++)
    for (let x = Math.max(0, Math.floor(left)); x < Math.min(W, left + cols * k); x++) {
      const p = y * W + x;
      if (!mask[p]) continue;
      const z = zone[p];
      if (z === ZONE_ID.hair) zonePixels.hair.push(labAt(img, p));
      else if (z === ZONE_ID.skin) zonePixels.skin.push(labAt(img, p));
      else if (z === ZONE_ID.accessory) zonePixels.accessory.push(labAt(img, p));
    }
  const toneCenters: Record<HeadZone, Lab[]> = { hair: [], skin: [], accessory: [] };
  for (const z of HEAD_ZONES) {
    const pts = zonePixels[z];
    if (pts.length < 4) continue;
    const km = kmeans(pts, TONES[z], 5);
    // tonos con poca presencia (antialias del dibujo) no ganan un lugar en la paleta
    const minShare = z === 'skin' ? 0.1 : 0.04;
    const cs = km.centers.filter((_, i) => km.counts[i] > pts.length * minShare).sort((a, b) => a[0] - b[0]);
    // fusionar tonos casi iguales
    const merged: Lab[] = [];
    for (const c of cs) if (!merged.length || deltaE(merged[merged.length - 1], c) > 0.035) merged.push(c);
    toneCenters[z] = merged;
  }
  const nearestTone = (z: HeadZone, lab: Lab) => {
    const cs = toneCenters[z];
    let best = 0, bd = Infinity;
    cs.forEach((c, i) => { const d = deltaE(c, lab); if (d < bd) { bd = d; best = i; } });
    return best;
  };

  // 1 y 2: votación por celda
  const Z_NONE = -1;
  const cz = new Int8Array(cols * rows).fill(Z_NONE);
  const ct = new Int8Array(cols * rows);
  const pending = new Uint8Array(cols * rows);
  for (let gy = 0; gy < rows; gy++)
    for (let gx = 0; gx < cols; gx++) {
      const votes = [0, 0, 0];
      const toneVotes = HEAD_ZONES.map((z) => new Array(toneCenters[z].length).fill(0));
      let n = 0, line = 0;
      const y0 = top + gy * k, x0 = left + gx * k;
      for (let y = Math.floor(y0); y < y0 + k; y++)
        for (let x = Math.floor(x0); x < x0 + k; x++) {
          n++;
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const p = y * W + x;
          if (!mask[p]) continue;
          const z = zone[p];
          let zi = -1;
          if (z === ZONE_ID.hair) zi = 0;
          else if (z === ZONE_ID.skin || z === ZONE_ID.face) zi = 1;
          else if (z === ZONE_ID.accessory) zi = 2;
          else if (z === ZONE_ID.line) { line++; continue; }
          if (zi < 0) continue;
          // debajo del recuadro solo cuenta el pelo largo
          if (gy >= boxRows && zi !== 0) continue;
          votes[zi]++;
          if (z === ZONE_ID.face) { if (toneVotes[1].length) toneVotes[1][Math.min(1, toneVotes[1].length - 1)]++; }
          else if (toneVotes[zi].length) toneVotes[zi][nearestTone(HEAD_ZONES[zi], labAt(img, p))]++;
        }
      const filled = votes[0] + votes[1] + votes[2];
      const i = gy * cols + gx;
      if (filled + line * 0.6 < n * 0.45) continue;
      if (filled === 0) { pending[i] = 1; continue; }
      // el pelo gana empates: la silueta de la cabeza es el pelo
      let zi = 0;
      if (votes[1] > votes[zi]) zi = 1;
      // accesorios delgados (lentes, cintillo) ganan con menos cobertura: son rasgos que identifican
      if (votes[2] >= n * 0.22) zi = 2;
      cz[i] = zi;
      const tv = toneVotes[zi];
      let bt = 0;
      tv.forEach((v: number, t: number) => { if (v > tv[bt]) bt = t; });
      ct[i] = bt;
    }

  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= cols || y >= rows ? Z_NONE : cz[y * cols + x]);
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // celdas de pura línea: toman la zona de sus vecinos
  for (let pass = 0; pass < 2; pass++)
    for (let i = 0; i < cols * rows; i++) {
      if (!pending[i] || cz[i] !== Z_NONE) continue;
      const x = i % cols, y = (i / cols) | 0;
      const nb = N4.map(([dx, dy]) => at(x + dx, y + dy)).filter((z) => z !== Z_NONE);
      if (nb.length >= 2) { cz[i] = mode(nb); ct[i] = 0; }
    }

  // 3: limpieza de silueta y de pixeles sueltos
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const nb = N4.map(([dx, dy]) => at(x + dx, y + dy));
        const filled = nb.filter((z) => z !== Z_NONE);
        if (cz[i] !== Z_NONE && filled.length <= 1) cz[i] = Z_NONE; // pico suelto
        else if (cz[i] === Z_NONE && filled.length >= 3) { cz[i] = mode(filled); ct[i] = 1; } // hueco
        else if (cz[i] !== Z_NONE && filled.length >= 3 && filled.every((z) => z !== cz[i])) cz[i] = mode(filled); // zona suelta
      }
    // tonos sueltos dentro de una zona (salvo brillos, que se permiten)
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        if (cz[i] === Z_NONE) continue;
        const same = N4.map(([dx, dy]) => [x + dx, y + dy]).filter(([xx, yy]) => at(xx, yy) === cz[i]).map(([xx, yy]) => ct[yy * cols + xx]);
        const maxTone = toneCenters[HEAD_ZONES[cz[i]]].length - 1;
        if (same.length >= 3 && same.every((t) => t !== ct[i]) && !(ct[i] === maxTone && cz[i] === 0)) ct[i] = mode(same);
      }
  }

  // paleta final
  const palette: HeadBitmap['palette'] = [];
  const palIndex = new Map<string, number>();
  const colorOf = (zi: number, t: number): number => {
    const z = HEAD_ZONES[zi];
    let hex: string;
    if (z === 'skin') {
      // la piel de la cabeza usa la misma rampa que la del cuerpo: cara y brazos combinan
      const n = toneCenters.skin.length;
      const slot = n <= 1 ? BASE : t === 0 ? SHADOW : t === n - 1 ? LIGHT : BASE;
      hex = skinRamp[slot];
      t = slot;
    } else {
      const cs = toneCenters[z];
      hex = cs.length ? labToHex(cs[Math.min(t, cs.length - 1)]) : '#808080';
    }
    const key = `${z}:${hex}`;
    let idx = palIndex.get(key);
    if (idx === undefined) { idx = palette.length; palette.push({ hex, zone: z, tone: t }); palIndex.set(key, idx); }
    return idx;
  };
  const shadowSkin = () => colorOf(1, 0);
  const pix = new Int16Array(cols * rows).fill(-1);
  for (let i = 0; i < cols * rows; i++) if (cz[i] !== Z_NONE) pix[i] = colorOf(cz[i], ct[i]);
  // 4: sombra del flequillo sobre la frente
  if (toneCenters.skin.length) {
    const sh = shadowSkin();
    for (let y = 1; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        if (cz[i] === 1 && cz[i - cols] === 0) pix[i] = sh;
      }
  }

  // recortar filas y columnas vacías y ubicar ojos y cuello
  let minX = cols, maxX = -1, minY = rows, maxY = -1;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      if (pix[y * cols + x] >= 0) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  if (maxX < 0) { minX = 0; maxX = 0; minY = 0; maxY = 0; }
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const outRows: string[] = [];
  for (let y = minY; y <= maxY; y++) {
    let s = '';
    for (let x = minX; x <= maxX; x++) {
      const v = pix[y * cols + x];
      s += v < 0 ? '.' : PIXEL_CHARS[v];
    }
    outRows.push(s);
  }

  const eyeY = Math.round(((e1.y + e2.y) / 2 - top) / k) - minY;
  const cxHead = halfCols - minX; // el punto medio de los ojos cae entre cxHead-1 y cxHead
  const eyeW = EYES[stampClass(headW)].round[0].length;
  let half = ((e2.x - e1.x) / k) / 2;
  half = Math.max(half, eyeW + 0.5);
  const ex1 = Math.round(cxHead - half - 0.5);
  const ex2 = 2 * cxHead - 1 - ex1;
  // cuello: fila más baja con piel cerca del centro
  let chin = eyeY + 2;
  for (let y = 0; y < bh; y++)
    for (let x = Math.max(0, cxHead - 3); x <= Math.min(bw - 1, cxHead + 2); x++) {
      const c = outRows[y][x];
      if (c !== '.' && palette[PIXEL_CHARS.indexOf(c)].zone === 'skin') chin = Math.max(chin, y);
    }
  return {
    w: bw,
    h: bh,
    palette,
    rows: outRows,
    anchor: { x: cxHead, y: chin },
    eyes: [{ x: ex1, y: eyeY }, { x: ex2, y: eyeY }],
  };
}

function mode(v: number[]): number {
  const c = new Map<number, number>();
  let best = v[0], bc = 0;
  for (const x of v) {
    const n = (c.get(x) ?? 0) + 1;
    c.set(x, n);
    if (n > bc) { bc = n; best = x; }
  }
  return best;
}
