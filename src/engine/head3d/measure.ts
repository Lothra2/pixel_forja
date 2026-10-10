import type { WorkImage } from '../analyze/work';
import { labAt } from '../analyze/work';
import { ZONE_ID, type HeadSpec } from '../analyze/zones';
import { components } from '../analyze/background';
import { type Lab, labToHex, deltaE } from '../color/oklab';
import { kmeans } from '../color/kmeans';
import type { HeadModel, HeadRow } from './model';

/**
 * Mide la cabeza en la imagen ya separada por zonas y arma el modelo.
 * Trabaja en el marco de la cara: origen entre los ojos, girado según la inclinación de la cabeza,
 * así una cabeza ladeada no deforma las medidas de un lado.
 */
export interface MeasureInput {
  work: WorkImage;
  zone: Uint8Array;
  mask: Uint8Array;
  head: HeadSpec;
}

const HEADZ = new Set([ZONE_ID.hair, ZONE_ID.skin, ZONE_ID.face, ZONE_ID.beard]);
const ROWS = 48;
const asinDeg = (v: number) => (Math.asin(Math.max(-1, Math.min(1, v))) * 180) / Math.PI;

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
function medianLab(labs: Lab[], fallback: string): string {
  if (!labs.length) return fallback;
  return labToHex([median(labs.map((l) => l[0])), median(labs.map((l) => l[1])), median(labs.map((l) => l[2]))]);
}

export function measureHead({ work, zone, mask, head }: MeasureInput): HeadModel {
  const { w, h } = work.raster;
  const [e1, e2] = head.eyes[0].x <= head.eyes[1].x ? head.eyes : [head.eyes[1], head.eyes[0]];
  const ex = (e1.x + e2.x) / 2, ey = (e1.y + e2.y) / 2;
  const roll = Math.atan2(e2.y - e1.y, e2.x - e1.x);
  const ux = [Math.cos(roll), Math.sin(roll)], uy = [-Math.sin(roll), Math.cos(roll)];
  const idx = (u: number, v: number) => {
    const x = Math.round(ex + u * ux[0] + v * uy[0]), y = Math.round(ey + u * ux[1] + v * uy[1]);
    return x < 0 || y < 0 || x >= w || y >= h ? -1 : y * w + x;
  };
  const zAt = (u: number, v: number) => { const i = idx(u, v); return i < 0 || !mask[i] ? 0 : zone[i]; };
  const isHead = (u: number, v: number) => HEADZ.has(zAt(u, v));
  const W = head.box.w;

  // extensión vertical: del tope del pelo a la barbilla, en la columna central
  let vTop = 0, vBot = 0;
  for (let v = 0; v > -1.5 * W; v--) { let any = false; for (let u = -0.3 * W; u <= 0.3 * W; u += 1) if (isHead(u, v)) { any = true; break; } if (any) vTop = v; else if (v < -0.2 * W) break; }
  for (let v = 0; v < 1.5 * W; v++) { let any = false; for (let u = -0.15 * W; u <= 0.15 * W; u += 1) if (isHead(u, v)) { any = true; break; } if (any) vBot = v; else if (v > 0.3 * W) break; }

  // silueta por fila y por lado: el último pixel de cabeza antes de un hueco
  const outer = (v: number, sign: -1 | 1) => {
    let last = 0, gap = 0;
    for (let u = 0; u < 0.9 * W; u++) {
      if (isHead(u * sign, v)) { last = u; gap = 0; } else if (++gap > 4) break;
    }
    return last;
  };
  const inner = (v: number, sign: -1 | 1, z: number, lim: number) => {
    for (let u = 0; u <= lim; u++) if (zAt(u * sign, v) === z) return u;
    return -1;
  };
  const outerOf = (v: number, sign: -1 | 1, z: number, lim: number) => {
    for (let u = Math.round(lim); u >= 0; u--) if (zAt(u * sign, v) === z) return u;
    return -1;
  };

  const raw: { v: number; wl: number; wr: number; hl: number; hr: number; bf: number; bt: number; bLabs: Lab[] }[] = [];
  for (let k = 0; k < ROWS; k++) {
    const v = vTop + ((vBot - vTop) * k) / (ROWS - 1);
    const wl = outer(v, -1), wr = outer(v, 1);
    const hairAng = (sign: -1 | 1, wd: number) => {
      const i = inner(v, sign, ZONE_ID.hair, wd);
      return i < 0 ? 181 : i <= 1 ? 0 : asinDeg(i / Math.max(1, wd));
    };
    let bf = 999, bt = 0;
    const bLabs: Lab[] = [];
    for (const [sign, wd] of [[-1, wl], [1, wr]] as [-1 | 1, number][]) {
      const i = inner(v, sign, ZONE_ID.beard, wd), o = outerOf(v, sign, ZONE_ID.beard, wd);
      if (i < 0) continue;
      bf = Math.min(bf, i <= 1 ? 0 : asinDeg(i / Math.max(1, wd)));
      bt = Math.max(bt, o >= wd - 2 ? 90 : asinDeg(o / Math.max(1, wd)));
      for (let u = i; u <= o; u++) { const p = idx(u * sign, v); if (p >= 0 && zone[p] === ZONE_ID.beard && mask[p]) bLabs.push(labAt(work, p)); }
    }
    raw.push({ v, wl, wr, hl: hairAng(-1, wl), hr: hairAng(1, wr), bf: bt ? bf : 0, bt, bLabs });
  }

  // marcas: cejas, nariz, boca, nacimiento del pelo
  const faceRows = (v0: number, v1: number, u0: number, u1: number, z = ZONE_ID.face) => {
    const rows: { v: number; n: number; us: number[] }[] = [];
    for (let v = Math.round(v0); v <= v1; v++) {
      const us: number[] = [];
      for (let u = -u1; u <= u1; u++) if (Math.abs(u) >= u0 && zAt(u, v) === z) us.push(u);
      rows.push({ v, n: us.length, us });
    }
    return rows;
  };
  const eyeHalf = (e2.x - e1.x) / 2 / Math.cos(roll);
  const browRows = faceRows(-0.3 * W, -0.04 * W, eyeHalf * 0.35, eyeHalf * 1.9).filter((r) => r.n > eyeHalf * 0.5);
  const browV = browRows.length ? browRows.reduce((s, r) => s + r.v * r.n, 0) / browRows.reduce((s, r) => s + r.n, 0) : -0.14 * W;
  const browT = browRows.length;
  const browUs = browRows.flatMap((r) => r.us);
  const browOuter = browUs.length ? (Math.max(...browUs) - Math.min(...browUs)) / 2 : eyeHalf * 1.5;
  // inclinación de la ceja: altura del extremo de afuera menos el de adentro (+ = cae hacia afuera)
  const browLabs: Lab[] = [];
  let slant = 0;
  if (browRows.length) {
    const ends = (inner: boolean) => {
      const vs: number[] = [];
      for (const r of browRows) for (const u of r.us) { const a = Math.abs(u); if (inner ? a < eyeHalf * 0.75 : a > eyeHalf * 1.35) vs.push(r.v); const p = idx(u, r.v); if (p >= 0) browLabs.push(labAt(work, p)); }
      return vs.length ? vs.reduce((s, x) => s + x, 0) / vs.length : browV;
    };
    slant = ends(false) - ends(true);
  }
  // boca: la pieza de "cara" (labios) más grande abajo al centro. Nariz: las fosas encima de la boca
  const reg = new Uint8Array(w * h);
  for (let v = Math.round(0.12 * W); v <= 0.85 * W; v++)
    for (let u = -0.3 * W; u <= 0.3 * W; u++) { const p = idx(u, v); if (p >= 0 && mask[p] && zone[p] === ZONE_ID.face) reg[p] = 1; }
  const cc = components(reg, w, h, 1);
  const blobs = cc.sizes.map((size) => ({ size, u: 0, v: 0, u0: Infinity, u1: -Infinity }));
  for (let p = 0; p < w * h; p++) {
    const l = cc.labels[p];
    if (l < 0 || !reg[p]) continue;
    const dx = (p % w) - ex, dy = ((p / w) | 0) - ey;
    const u = dx * ux[0] + dy * ux[1], v = dx * uy[0] + dy * uy[1];
    const b = blobs[l];
    b.u += u; b.v += v; b.u0 = Math.min(b.u0, u); b.u1 = Math.max(b.u1, u);
  }
  blobs.forEach((b) => { b.u /= Math.max(1, b.size); b.v /= Math.max(1, b.size); });
  const mouthB = blobs.filter((b) => b.size > 0 && Math.abs(b.u) < 0.15 * W && b.v > 0.25 * W).sort((p, q) => q.size - p.size)[0];
  const mouthV = mouthB ? mouthB.v : 0.5 * W;
  const mouthW = mouthB ? (mouthB.u1 - mouthB.u0) / 2 : 0.15 * W;
  const lipLabs: Lab[] = [];
  if (mouthB) for (let p = 0; p < w * h; p++) if (reg[p] && blobs[cc.labels[p]] === mouthB) lipLabs.push(labAt(work, p));
  const nostrils = blobs.filter((b) => b !== mouthB && b.size > 0 && Math.abs(b.u) < 0.2 * W && b.v > 0.15 * W && b.v < mouthV - 0.04 * W);
  const noseV = nostrils.length ? Math.max(...nostrils.map((b) => b.v)) : mouthV * 0.72;
  let hairlineV = vTop;
  for (let v = Math.round(vTop); v < 0; v++) {
    let skin = 0;
    for (let u = -0.08 * W; u <= 0.08 * W; u++) if (zAt(u, v) === ZONE_ID.skin) skin++;
    if (skin > 0.08 * W) { hairlineV = v; break; }
  }

  // orejas: filas donde la silueta se abre de golpe entre ceja y boca
  const avgW = raw.map((r) => (r.wl + r.wr) / 2);
  const kAt = (v: number) => Math.round(((v - vTop) / (vBot - vTop)) * (ROWS - 1));
  const kb = Math.max(1, kAt(browV)), km = Math.min(ROWS - 2, kAt(noseV) + 2);
  let ears: HeadModel['ears'] = null;
  {
    const base = (k: number) => avgW[kb] + ((avgW[km] - avgW[kb]) * (k - kb)) / Math.max(1, km - kb);
    let y0 = -1, y1 = -1, size = 0;
    for (let k = kb; k <= km; k++) {
      const ex2 = avgW[k] - base(k);
      if (ex2 > base(k) * 0.05) { if (y0 < 0) y0 = k; y1 = k; size = Math.max(size, ex2); }
    }
    if (y0 >= 0 && y1 - y0 >= 1) {
      for (let k = y0; k <= y1; k++) {
        const b = base(k);
        raw[k].wl = Math.min(raw[k].wl, b); raw[k].wr = Math.min(raw[k].wr, b);
      }
      ears = { y0, y1, size };
    }
  }

  // R: media anchura a la altura de los ojos
  const kEye = kAt(0);
  const R = Math.max(4, (raw[kEye].wl + raw[kEye].wr) / 2);
  const toY = (v: number) => (v - vTop) / R;

  // colores
  const skinLabs: Lab[] = [], hairLabs: Lab[] = [], beardLabs: Lab[] = [];
  for (let v = Math.round(vTop); v <= vBot; v++)
    for (let u = -W; u <= W; u++) {
      const p = idx(u, v);
      if (p < 0 || !mask[p]) continue;
      const z = zone[p];
      if (z === ZONE_ID.hair) hairLabs.push(labAt(work, p));
      else if (z === ZONE_ID.beard) beardLabs.push(labAt(work, p));
      else if (z === ZONE_ID.skin) {
        const cheek = v > 0.06 * R && v < noseV && Math.abs(u) > 0.3 * R && Math.abs(u) < 0.7 * R;
        const forehead = v < browV - 0.12 * R && v > hairlineV + 0.1 * R && Math.abs(u) < 0.5 * R;
        if (cheek || forehead) skinLabs.push(labAt(work, p));
      }
    }
  let beardLight: string | null = null, beardDark: string | null = null;
  let lightL = 0.7, darkL = 0.35;
  if (beardLabs.length > 30) {
    const km2 = kmeans(beardLabs.filter((_, i) => i % 3 === 0), 2, 7);
    const [a, b] = km2.centers[0][0] > km2.centers[1][0] ? [km2.centers[0], km2.centers[1]] : [km2.centers[1], km2.centers[0]];
    beardLight = labToHex(a); beardDark = labToHex(b);
    lightL = a[0]; darkL = b[0];
  }
  // ojos hundidos: la franja entre ceja y ojo más oscura que la mejilla
  const skinL = median(skinLabs.map((l) => l[0]));
  const socket: number[] = [];
  for (let v = Math.round(browV + 0.04 * W); v < 0; v++)
    for (let u = -eyeHalf * 1.4; u <= eyeHalf * 1.4; u++) if (zAt(u, v) === ZONE_ID.skin) { const p = idx(u, v); socket.push(work.lab[p * 3]); }
  const deep = socket.length > 0 && median(socket) < skinL - 0.05;

  // el modelo se piensa casi simétrico: una cabeza un poco girada en la foto no debe quedar chueca.
  // Se guarda la mitad de la diferencia entre lados (un peinado de lado sí se nota)
  const rows: HeadRow[] = raw.map((r) => {
    const t = r.bLabs.length ? r.bLabs.filter((l) => deltaE(l, [lightL, 0, 0]) < deltaE(l, [darkL, 0, 0])).length / r.bLabs.length : 0;
    const avg = (r.wl + r.wr) / 2;
    const below = r.v > mouthV - 0.02 * W;
    let hl = below ? 181 : r.hl, hr = below ? 181 : r.hr;
    if (hl > 180 && hr <= 180) hl = hr;
    else if (hr > 180 && hl <= 180) hr = hl;
    else if (hl <= 180 && hr <= 180) hl = hr = (hl + hr) / 2;
    return {
      wl: (r.wl + avg) / 2 / R, wr: (r.wr + avg) / 2 / R, hairL: hl, hairR: hr,
      beardFrom: r.bf, beardTo: r.bt, beardLight: t,
    };
  });
  // mandíbula: debajo de la nariz la silueta es simétrica y solo se angosta hacia la barbilla
  // (una sombra del cuello o el cuello de la camisa no la ensanchan)
  const kNose = kAt(noseV);
  for (let i = kNose; i < rows.length; i++) {
    const r = rows[i];
    const avg = (r.wl + r.wr) / 2;
    r.wl = r.wr = i > kNose ? Math.min(avg, (rows[i - 1].wl + rows[i - 1].wr) / 2) : avg;
  }
  // suavizado de la silueta (sin escalones de un pixel)
  const wl0 = rows.map((r) => r.wl), wr0 = rows.map((r) => r.wr);
  rows.forEach((r, i) => {
    if (i === 0 || i === rows.length - 1) return;
    r.wl = (wl0[i - 1] + 2 * wl0[i] + wl0[i + 1]) / 4;
    r.wr = (wr0[i - 1] + 2 * wr0[i] + wr0[i + 1]) / 4;
  });
  // la claridad de la barba se suaviza entre filas vecinas (una fila suelta no cambia el tono)
  const bl = rows.map((r) => r.beardLight);
  rows.forEach((r, i) => {
    if (!r.beardTo) return;
    const ns = [-2, -1, 0, 1, 2].map((d) => rows[i + d]).filter((q) => q && q.beardTo > 0);
    r.beardLight = ns.reduce((s2, q) => s2 + bl[rows.indexOf(q)], 0) / ns.length;
  });
  const lastBeard = [...rows].reverse().findIndex((r) => r.beardTo > 0 && r.beardFrom < 20);
  return {
    version: 1,
    height: (vBot - vTop) / R,
    rows,
    marks: { hairline: toY(hairlineV), brow: toY(browV), eye: toY(0), nose: toY(noseV), mouth: toY(mouthV), chin: toY(vBot) },
    eyes: { x: eyeHalf / R, w: 0.26, color: '#3a2418', deep },
    brows: { x: eyeHalf / R, w: Math.max(0.3, (browOuter - eyeHalf * 0.3) / R), t: Math.max(0.06, browT / R), slant: slant / R, color: medianLab(browLabs, '#2b2018') },
    nose: { w: 0.17, len: 0.3 },
    mouth: { w: Math.min(0.6, mouthW / R) },
    ears: ears ? { y0: toY(raw[ears.y0].v), y1: toY(raw[ears.y1].v), size: ears.size / R } : null,
    colors: { skin: medianLab(skinLabs, '#e0ac8a'), hair: medianLab(hairLabs, '#3a2a20'), beardLight, beardDark, lip: medianLab(lipLabs, '#b06a64') },
    beardLen: lastBeard === 0 ? 0.12 : 0,
    hairLong: false,
  };
}
