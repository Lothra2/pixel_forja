import { createRaster } from '../core/raster';
import type { AnimalFicha, CellSize } from '../sheet/ficha';
import { animalDims, type QPose, type AnimalDims } from '../rig/animal';
import { solveTwoBone } from '../rig/pose';
import { makeRamp, OUTLINE, SHADOW, BASE, LIGHT, type Ramp } from '../color/ramp';
import type { BigFrame } from './human';

/**
 * Mascota en 3D chiquito: el cuerpo se arma con elipsoides y cápsulas, se mira desde arriba en 3/4 (como el
 * juego isométrico) y se pinta a pixel con luz por volumen. Así sale en las 8 direcciones (las de la izquierda
 * son espejo) con la misma pose que de lado, y puede llevar armadura encima (la barda de Thor).
 */

export type PetView = 'side' | 'se' | 'front' | 'ne' | 'back';
const YAW: Record<PetView, number> = { side: 0, se: 45, front: 90, ne: -45, back: -90 };

/** escala de dibujo sobre el esqueleto */
const K48 = 1.22;

type V3 = [number, number, number];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

interface Prim {
  kind: 'ell' | 'cap';
  /** elipsoide: centro y radios en el marco del perro (x adelante, y arriba, z a la derecha del perro) */
  c: V3; r?: V3;
  /** giro en el plano x-y (grados, + sube la punta) */
  rot?: number;
  /** cápsula: de a a b con radio rad */
  a?: V3; b?: V3; rad?: number;
  mat: string;
  /** recorte: solo la parte con y local (normalizado) > min (para bardas y cascos) */
  clipY?: number;
  /** recorte: solo la parte con x local > min (peto) */
  clipX?: number;
  /** ribete: banda junto al recorte */
  trim?: string;
  /** del lado lejano (un poco más oscuro) */
  far?: boolean;
  /** grupo para los contornos de adentro */
  g: number;
}

interface Hit { t: number; n: V3; mat: string; far: boolean; g: number }

/** Barda (armadura de mascota) por nivel. */
export interface PetArmorLook { name: { es: string; en: string }; main: string; trim: string | null; cloth: string | null; gem: string | null; glow: string | null; helm: boolean; chest: boolean; defense: number; level: number }
export const PET_ARMOR: PetArmorLook[] = [
  { name: { es: 'Arnés de cuero', en: 'Leather Harness' }, main: '#7a4a2a', trim: null, cloth: null, gem: null, glow: null, helm: false, chest: false, defense: 6, level: 1 },
  { name: { es: 'Peto tachonado', en: 'Studded Vest' }, main: '#6e4228', trim: '#b87a3e', cloth: null, gem: null, glow: null, helm: false, chest: true, defense: 14, level: 8 },
  { name: { es: 'Cota del guardián', en: "Guardian's Mail" }, main: '#9aa4b0', trim: '#cfd6e0', cloth: '#2f4f9a', gem: null, glow: null, helm: true, chest: true, defense: 26, level: 18 },
  { name: { es: 'Placas del campeón', en: "Champion's Barding" }, main: '#aeb8c6', trim: '#e3ae3c', cloth: '#7a1f2b', gem: '#d8243e', glow: null, helm: true, chest: true, defense: 40, level: 30 },
  { name: { es: 'Égida de Thor', en: "Thor's Aegis" }, main: '#d9dfe8', trim: '#e3ae3c', cloth: '#1e3a7a', gem: '#ffd86a', glow: '#ffd86a', helm: true, chest: true, defense: 60, level: 45 },
];

function rayEll(o: V3, d: V3, p: Prim, toLocal: (v: V3) => V3, toLocalDir: (v: V3) => V3): { t: number; n: V3 } | null {
  const r = p.r!;
  const lo = toLocal(o), ld = toLocalDir(d);
  // al marco del elipsoide (girado) y escalado a esfera unidad
  const rad = ((p.rot ?? 0) * Math.PI) / 180, ca = Math.cos(-rad), sa = Math.sin(-rad);
  const rx = (v: V3): V3 => [v[0] * ca - v[1] * sa, v[0] * sa + v[1] * ca, v[2]];
  const O = rx(sub(lo, p.c)), D = rx(ld);
  const Os: V3 = [O[0] / r[0], O[1] / r[1], O[2] / r[2]], Ds: V3 = [D[0] / r[0], D[1] / r[1], D[2] / r[2]];
  const A = dot(Ds, Ds), B = 2 * dot(Os, Ds), C = dot(Os, Os) - 1;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  for (const t of [(-B - sq) / (2 * A), (-B + sq) / (2 * A)]) {
    const h: V3 = add(Os, mul(Ds, t));
    if (p.clipY !== undefined && h[1] < p.clipY) continue;
    if (p.clipX !== undefined && h[0] < p.clipX) continue;
    // normal en el marco local, de vuelta al del perro
    const nl: V3 = [h[0] / r[0], h[1] / r[1], h[2] / r[2]];
    const cb = Math.cos(rad), sb = Math.sin(rad);
    const n: V3 = [nl[0] * cb - nl[1] * sb, nl[0] * sb + nl[1] * cb, nl[2]];
    let mat = p.mat;
    if (p.trim && ((p.clipY !== undefined && h[1] < p.clipY + 0.16) || (p.clipX !== undefined && h[0] < p.clipX + 0.16))) mat = p.trim;
    (p as Prim & { _m?: string })._m = mat;
    return { t, n };
  }
  return null;
}

function rayCap(o: V3, d: V3, p: Prim): { t: number; n: V3 } | null {
  // cápsula (Inigo Quilez)
  const pa = p.a!, pb = p.b!, ra = p.rad!;
  const ba = sub(pb, pa), oa = sub(o, pa);
  const baba = dot(ba, ba), bard = dot(ba, d), baoa = dot(ba, oa), rdoa = dot(d, oa), oaoa = dot(oa, oa);
  let a = baba - bard * bard, b = baba * rdoa - baoa * bard, c = baba * oaoa - baoa * baoa - ra * ra * baba;
  let h = b * b - a * c;
  if (h >= 0) {
    const t = (-b - Math.sqrt(h)) / a;
    const y = baoa + t * bard;
    if (y > 0 && y < baba) {
      const hit = add(o, mul(d, t));
      const q = add(pa, mul(ba, y / baba));
      return { t, n: norm(sub(hit, q)) };
    }
    const oc = y <= 0 ? oa : sub(o, pb);
    b = dot(d, oc); c = dot(oc, oc) - ra * ra;
    h = b * b - c;
    if (h > 0) {
      const t2 = -b - Math.sqrt(h);
      const hit = add(o, mul(d, t2));
      return { t: t2, n: norm(sub(hit, y <= 0 ? pa : pb)) };
    }
  }
  void a;
  return null;
}

/** Arma las piezas del perro para una pose (en el marco del perro, y arriba). */
function build(f: AnimalFicha, d: AnimalDims, pose: QPose, armor: number): { prims: Prim[]; eyes: V3[]; nose: V3; mouth: [V3, V3]; headC: V3 } {
  const prims: Prim[] = [];
  let g = 1;
  const L = d.legUpper + d.legLower;
  const len = d.bodyLen, ch = d.chest, wa = d.waist, s = d.head.size;
  const yb = L + ch * 0.18;
  // inclinación del cuerpo alrededor de su centro (pitch + baja el frente)
  const pr = (-pose.pitch * Math.PI) / 180;
  const P = (x: number, y: number, z = 0): V3 => {
    const dy = y - yb;
    return [x * Math.cos(pr) - dy * Math.sin(pr), yb + x * Math.sin(pr) + dy * Math.cos(pr), z];
  };
  const look = armor > 0 ? PET_ARMOR[armor - 1] : null;
  // cuerpo: pecho, vientre y anca
  const chestC = P(len / 2 - ch * 0.42, yb + ch * 0.06), midC = P(-len * 0.02, yb - 0.3), rumpC = P(-len / 2 + wa * 0.52, yb + 0.2);
  prims.push({ kind: 'ell', c: chestC, r: [ch * 0.5, ch * 0.52, ch * 0.5], rot: -pose.pitch, mat: 'chest', g: g++ });
  prims.push({ kind: 'ell', c: midC, r: [len * 0.4, (ch + wa) * 0.26, ch * 0.44], rot: -pose.pitch, mat: 'fur', g: 1 });
  prims.push({ kind: 'ell', c: rumpC, r: [wa * 0.58, wa * 0.58, wa * 0.55], rot: -pose.pitch, mat: 'fur', g: 1 });
  // patas: raíz, rodilla y pata con el mismo IK que de lado
  const roots = { front: P(len / 2 - ch * 0.38, yb - ch * 0.22), rear: P(-len / 2 + wa * 0.5, yb - wa * 0.15) };
  const w = ch * 0.33;
  const leg = (front: boolean, near: boolean, foot: { x: number; y: number }) => {
    const r0 = front ? roots.front : roots.rear;
    const z = near ? w : -w;
    const ik = solveTwoBone(d.legUpper, d.legLower, foot.x, foot.y, front ? -1 : 1);
    const knee: V3 = [r0[0] + ik.mid[0], r0[1] - ik.mid[1], z];
    const paw: V3 = [r0[0] + ik.end[0], r0[1] - ik.end[1], z];
    const gg = g++;
    const t = d.legT * 0.55;
    prims.push({ kind: 'cap', c: [0, 0, 0], a: [r0[0], r0[1], z * 0.85], b: knee, rad: t + (front ? 0.1 : 0.45), mat: 'fur', far: !near, g: gg });
    prims.push({ kind: 'cap', c: [0, 0, 0], a: knee, b: paw, rad: t * 0.85, mat: 'leg', far: !near, g: gg });
    prims.push({ kind: 'ell', c: [paw[0] + t * 0.5, paw[1] + t * 0.15, z], r: [t * 1.25, t * 0.75, t * 1.0], mat: 'paw', far: !near, g: gg });
  };
  leg(true, false, pose.legs.ff); leg(false, false, pose.legs.rf); leg(true, true, pose.legs.fn); leg(false, true, pose.legs.rn);
  // cola
  {
    const root = P(-len / 2 - wa * 0.02, yb + wa * 0.32);
    const a = ((pose.tail + 180 - pose.pitch) * Math.PI) / 180;
    const tl = d.tail.len, tt = Math.max(0.9, d.tail.t * 0.5);
    const tip: V3 = [root[0] + Math.cos(a) * tl, root[1] + Math.sin(a) * tl, 0];
    prims.push({ kind: 'cap', c: [0, 0, 0], a: root, b: tip, rad: tt, mat: 'fur', g: g++ });
  }
  // cuello y cabeza
  const neckBase = P(len / 2 - ch * 0.3, yb + ch * 0.28);
  const na = ((50 - pose.pitch * 0.5) * Math.PI) / 180;
  const neckEnd: V3 = [neckBase[0] + Math.cos(na) * d.neckLen + pose.head.dx, neckBase[1] + Math.sin(na) * d.neckLen - pose.head.dy, 0];
  prims.push({ kind: 'cap', c: [0, 0, 0], a: neckBase, b: neckEnd, rad: ch * 0.3, mat: 'fur', g: 1 });
  const hang = (-(pose.pitch + pose.head.angle) * Math.PI) / 180;
  const H = (x: number, y: number, z = 0): V3 => [neckEnd[0] + s * 0.18 + x * Math.cos(hang) - y * Math.sin(hang), neckEnd[1] + s * 0.22 + x * Math.sin(hang) + y * Math.cos(hang), z];
  const headC = H(0, 0);
  const hg = g++;
  prims.push({ kind: 'ell', c: headC, r: [s * 0.5, s * 0.48, s * 0.5], mat: 'fur', g: hg });
  // hocico (la máscara oscura del bóxer)
  const mz = d.head.muzzleLen, mh = d.head.muzzleH;
  const mC = H(s * 0.36 + mz * 0.35, -s * 0.16);
  prims.push({ kind: 'ell', c: mC, r: [s * 0.18 + mz * 0.5, mh * 0.42, s * 0.34], rot: (hang * 180) / Math.PI, mat: d.mask === 'muzzle' ? 'dark' : 'muzzle', g: hg });
  // orejas
  for (const zs of [-1, 1]) {
    if (d.ear === 'fold') prims.push({ kind: 'ell', c: H(-s * 0.04, s * 0.3, zs * s * 0.4), r: [s * 0.22, s * 0.16, s * 0.1], rot: -25, mat: 'ear', far: zs < 0, g: hg });
    else if (d.ear === 'up') prims.push({ kind: 'ell', c: H(-s * 0.08, s * 0.52, zs * s * 0.26), r: [s * 0.14, s * 0.26, s * 0.08], mat: 'ear', far: zs < 0, g: hg });
    else if (d.ear === 'round') prims.push({ kind: 'ell', c: H(-s * 0.1, s * 0.44, zs * s * 0.32), r: [s * 0.18, s * 0.18, s * 0.08], mat: 'ear', far: zs < 0, g: hg });
    else prims.push({ kind: 'ell', c: H(-s * 0.18, s * 0.05, zs * s * 0.45), r: [s * 0.16, s * 0.34, s * 0.08], mat: 'ear', far: zs < 0, g: hg });
  }
  // lengua y lo que lleva en la boca
  const mouthTip = H(s * 0.42 + mz * 0.75, -s * 0.36);
  if (pose.mouth === 'tongue') prims.push({ kind: 'ell', c: H(s * 0.42 + mz * 0.35, -s * 0.5), r: [Math.max(1, s * 0.13), Math.max(1.1, s * 0.16), Math.max(0.9, s * 0.12)], mat: 'tongue', g: hg });
  if (pose.ball || pose.coin) prims.push({ kind: 'ell', c: H(s * 0.52 + mz * 0.75, -s * 0.38), r: pose.coin ? [s * 0.08, s * 0.2, s * 0.2] : [s * 0.2, s * 0.2, s * 0.2], mat: pose.coin ? 'coin' : 'ball', g: g++ });
  // collar con chapa
  if (f.palette.collar || look) {
    const cc = add(neckBase, mul(sub(neckEnd, neckBase), 0.38));
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const rr = ch * 0.33;
      prims.push({ kind: 'ell', c: [cc[0] + Math.cos(a) * rr * 0.35, cc[1] + Math.sin(a) * rr * 0.2, Math.sin(a + Math.PI / 2) * rr], r: [0.75, 0.75, 0.75], mat: 'collar', g: 900 });
    }
    prims.push({ kind: 'ell', c: [cc[0] + ch * 0.22, cc[1] - ch * 0.25, 0], r: [0.8, 0.9, 0.8], mat: 'tag', g: 901 });
  }
  // barda por nivel: arnés, manta con tachas, malla y casco, placas con ribete y gema, égida con runas que brillan
  if (look) {
    const am = 'armor';
    if (armor === 1) {
      for (const xx of [len / 2 - ch * 0.62, -len * 0.05]) {
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const c0 = P(xx, yb);
          prims.push({ kind: 'ell', c: [c0[0], c0[1] + Math.sin(a) * ch * 0.5, Math.cos(a) * ch * 0.4], r: [0.9, 0.9, 0.9], mat: am, g: 950 });
        }
      }
    } else {
      // manta sobre el lomo
      prims.push({ kind: 'ell', c: P(-len * 0.04, yb), r: [len * 0.44, (ch + wa) * 0.31, ch * 0.5], rot: -pose.pitch, mat: look.cloth ? 'cloth' : am, clipY: 0.05, trim: look.trim ? 'trim' : undefined, g: 960 });
      if (look.cloth) prims.push({ kind: 'ell', c: P(-len * 0.04, yb + 0.5), r: [len * 0.36, (ch + wa) * 0.3, ch * 0.49], rot: -pose.pitch, mat: am, clipY: 0.35, trim: look.trim ? 'trim' : undefined, g: 961 });
      if (look.chest) prims.push({ kind: 'ell', c: chestC, r: [ch * 0.56, ch * 0.57, ch * 0.55], rot: -pose.pitch, mat: am, clipX: 0.25, trim: look.trim ? 'trim' : undefined, g: 962 });
      // casco: una gorra de metal arriba de la cabeza (la cara y el hocico quedan a la vista), con ribete de frente
      if (look.helm) prims.push({ kind: 'ell', c: H(-s * 0.04, s * 0.04), r: [s * 0.56, s * 0.54, s * 0.56], mat: am, clipY: 0.32, trim: look.trim ? 'trim' : undefined, g: 963 });
      // cimera: una cresta de adelante hacia atrás (no una bola)
      if (armor >= 4) prims.push({ kind: 'ell', c: H(-s * 0.1, s * 0.56), r: [s * 0.42, s * 0.14, s * 0.07], rot: (hang * 180) / Math.PI - 8, mat: 'trim', g: 964 });
      // égida: aletas doradas a los lados del casco, hacia atrás y arriba
      if (look.glow) for (const zs of [-1, 1]) prims.push({ kind: 'ell', c: H(-s * 0.32, s * 0.42, zs * s * 0.5), r: [s * 0.3, s * 0.09, s * 0.05], rot: (hang * 180) / Math.PI + 32, mat: 'glow', far: zs < 0, g: 967 });
      if (look.gem) prims.push({ kind: 'ell', c: add(chestC, [ch * 0.53, 0, 0]), r: [0.9, 1.1, 1.1], mat: look.glow ? 'glow' : 'gem', g: 965 });
    }
  }
  const eyes: V3[] = [H(s * 0.3, s * 0.1, s * 0.27), H(s * 0.3, s * 0.1, -s * 0.27)];
  const nose = H(s * 0.42 + mz * 0.95, -s * 0.1);
  return { prims, eyes, nose, mouth: [H(s * 0.3, -s * 0.4), mouthTip], headC };
}

/** Pinta la mascota en una vista. Mismo formato que el renderer de lado (cuadro grande con piso y pivote). */
export function renderPet3d(f: AnimalFicha, cell: CellSize, pose: QPose, view: PetView = 'side', armor = 0): BigFrame {
  const prem = f.movementProfile === 'premium';
  const d = animalDims(f.body.species, cell, f.body.size, prem);
  const W = cell * 3, Hh = cell * 2;
  // premium: cámara un poco más baja, así en la diagonal de atrás el lomo no se apila y no parece parado de manos
  const ELV = ((prem ? 24 : 35) * Math.PI) / 180;
  const SIN = Math.sin(ELV), COS = Math.cos(ELV);
  // a 32 px no hay lugar: sin agrandar
  const K = cell >= 48 ? K48 : 1;
  const phi = (YAW[view] * Math.PI) / 180, cp = Math.cos(phi), sp = Math.sin(phi);
  const built = build(f, d, pose, armor);
  // de frente y de espaldas un perro real se ve angosto y, desde arriba, el lomo se apila como una columna.
  // Como hace un pixel artist: en esas vistas se ensancha (z) y se acorta (x). De lado no cambia nada
  const fr = sp * sp;
  const zK = 1 + 0.5 * fr, xK = 1 - (prem ? 0.4 : 0.3) * fr;
  const squash = (v: V3): V3 => [v[0] * xK, v[1], v[2] * zK];
  const prims = built.prims.map((p) => p.kind === 'cap'
    ? { ...p, a: squash(p.a!), b: squash(p.b!), rad: p.rad! * (1 + 0.25 * fr) }
    : { ...p, c: squash(p.c), r: [p.r![0] * (1 - 0.15 * fr), p.r![1], p.r![2] * zK] as V3 });
  const eyes = built.eyes.map(squash), nose = squash(built.nose), mouth: [V3, V3] = [squash(built.mouth[0]), squash(built.mouth[1])];
  const look = armor > 0 ? PET_ARMOR[armor - 1] : null;
  const ramps: Record<string, Ramp> = {
    fur: f.palette.fur, chest: f.palette.fur, leg: f.palette.fur, paw: f.markings.paws ? f.palette.fur2 : f.palette.fur, dark: f.palette.dark,
    muzzle: f.markings.chest ? f.palette.fur2 : f.palette.fur, ear: d.ear === 'round' || d.ear === 'flop' ? f.palette.dark : f.palette.fur,
    tongue: makeRamp('#e86a7a'), collar: f.palette.collar ?? makeRamp('#b8242c'), tag: makeRamp('#e2b23c'), ball: makeRamp('#cfe83a'), coin: makeRamp('#e3ae3c'),
    armor: makeRamp(look?.main ?? '#7a4a2a'), trim: makeRamp(look?.trim ?? '#b87a3e'), cloth: makeRamp(look?.cloth ?? '#2f4f9a'), gem: makeRamp(look?.gem ?? '#d8243e'),
    glow: (() => { const r = makeRamp(look?.glow ?? '#ffd86a'); return [r[2], r[3], r[3], '#ffffff'] as Ramp; })(),
    fur2: f.palette.fur2,
  };
  // del marco del perro al del mundo (giro) y al revés
  const toWorld = (v: V3): V3 => [v[0] * cp - v[2] * sp, v[1], v[0] * sp + v[2] * cp];
  const toLocal = (v: V3): V3 => [v[0] * cp + v[2] * sp, v[1], -v[0] * sp + v[2] * cp];
  const view3: V3 = [0, -SIN, -COS];
  const up: V3 = [0, COS, -SIN];
  const ox = Math.round(W / 2), oy = cell + d.groundY;
  // las cápsulas se pasan al mundo (son simétricas, alcanza con mover los extremos)
  const capW = prims.map((p) => (p.kind === 'cap' ? { ...p, a: toWorld(p.a!), b: toWorld(p.b!) } : p));
  // caja en pantalla de cada pieza (proyección ortográfica: una esfera de radio R es un círculo de radio R)
  const boxes = capW.map((p) => {
    const pts: [V3, number][] = p.kind === 'cap' ? [[p.a!, p.rad!], [p.b!, p.rad!]] : [[toWorld(p.c), Math.max(...p.r!)]];
    let x0 = Infinity, x1 = -Infinity, u0 = Infinity, u1 = -Infinity;
    for (const [w, R] of pts) {
      const su = w[1] * COS - w[2] * SIN;
      x0 = Math.min(x0, w[0] - R); x1 = Math.max(x1, w[0] + R); u0 = Math.min(u0, su - R); u1 = Math.max(u1, su + R);
    }
    return { x0, x1, u0, u1 };
  });
  const depth = new Float32Array(W * Hh).fill(-Infinity);
  const hits: (Hit | null)[] = new Array(W * Hh).fill(null);
  for (let py = 0; py < Hh; py++)
    for (let px = 0; px < W; px++) {
      // la mascota se dibuja un poco más grande que su esqueleto (K), como el de lado
      const sx = (px + 0.5 - ox) / K, su = (oy - (py + 0.5)) / K;
      const o: V3 = add(add(mul([1, 0, 0], sx), mul(up, su)), mul(view3, -400));
      let best: Hit | null = null;
      for (let pi = 0; pi < capW.length; pi++) {
        const bx = boxes[pi];
        if (sx < bx.x0 || sx > bx.x1 || su < bx.u0 || su > bx.u1) continue;
        const p = capW[pi];
        const h = p.kind === 'cap' ? rayCap(o, view3, p) : rayEll(o, view3, p, toLocal, toLocal);
        if (!h || (best && h.t >= best.t)) continue;
        const n = p.kind === 'cap' ? h.n : toWorld(norm(h.n));
        best = { t: h.t, n, mat: (p as Prim & { _m?: string })._m ?? p.mat, far: !!p.far, g: p.g };
      }
      if (best) { hits[py * W + px] = best; depth[py * W + px] = 400 - best.t; }
    }
  // luz de arriba a la izquierda y de frente
  const Ld = norm([-0.55, 0.78, 0.4]);
  const out = createRaster(W, Hh);
  const put = (i: number, hex: string) => { out.data[i * 4] = parseInt(hex.slice(1, 3), 16); out.data[i * 4 + 1] = parseInt(hex.slice(3, 5), 16); out.data[i * 4 + 2] = parseInt(hex.slice(5, 7), 16); out.data[i * 4 + 3] = 255; };
  const colorAt = (i: number): string => {
    const h = hits[i]!;
    const r = ramps[h.mat] ?? ramps.fur;
    if (h.mat === 'glow') return r[2];
    const b = dot(h.n, Ld);
    let slot = b > 0.55 ? LIGHT : b > -0.05 ? BASE : SHADOW;
    if (h.far) slot = Math.max(SHADOW, slot - 1);
    // pecho claro del bóxer: la parte de adelante y abajo del pecho
    if (h.mat === 'chest' && f.markings.chest && h.n[1] < 0.35 && dot(h.n, toWorld([1, 0, 0])) > 0.15) return ramps.fur2[Math.max(SHADOW, slot)];
    return r[slot];
  };
  for (let i = 0; i < W * Hh; i++) if (hits[i]) put(i, colorAt(i));
  // contornos de adentro: donde una pieza tapa a otra (pata delante del cuerpo) se oscurece el borde de atrás
  const inner: number[] = [];
  for (let py = 1; py < Hh - 1; py++)
    for (let px = 1; px < W - 1; px++) {
      const i = py * W + px, h = hits[i];
      if (!h) continue;
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        const o = hits[j];
        if (o && o.g !== h.g && depth[j] - depth[i] > 2) { inner.push(i); break; }
      }
    }
  for (const i of inner) put(i, (ramps[hits[i]!.mat] ?? ramps.fur)[OUTLINE]);
  // ojos, nariz y boca: puntos de la cara que se ven (prueba de profundidad)
  const proj = (v: V3): { x: number; y: number; dep: number } => {
    const w = toWorld(v);
    return { x: Math.floor(ox + w[0] * K), y: Math.floor(oy - (w[1] * COS - w[2] * SIN) * K), dep: w[1] * SIN + w[2] * COS };
  };
  const visible = (p: { x: number; y: number; dep: number }) => p.x >= 0 && p.y >= 0 && p.x < W && p.y < Hh && hits[p.y * W + p.x] && depth[p.y * W + p.x] - p.dep < 1.6;
  const darkHex = f.palette.dark[OUTLINE];
  const ew = d.head.size >= 10 ? 2 : 1;
  for (const e of eyes) {
    const p = proj(e);
    if (!visible(p)) continue;
    const i = p.y * W + p.x;
    if (pose.eyes === 'closed') { put(i + W, darkHex); continue; }
    if (pose.eyes === 'happy') { put(i, darkHex); if (ew > 1) put(i + 1 - W, darkHex); continue; }
    put(i, darkHex); put(i + W, darkHex);
    if (ew > 1) { put(i + 1, '#ffffff'); put(i + 1 + W, f.palette.eyes); }
  }
  const np = proj(nose);
  if (visible(np)) { put(np.y * W + np.x, darkHex); if (ew > 1) put(np.y * W + np.x + (cp >= 0 ? -1 : 1), darkHex); }
  if (pose.mouth !== 'closed') {
    const a = proj(mouth[0]), b = proj(mouth[1]);
    for (let k = 0; k <= 4; k++) {
      const x = Math.round(a.x + ((b.x - a.x) * k) / 4), y = Math.round(a.y + ((b.y - a.y) * k) / 4);
      if (x > 0 && y > 0 && x < W && y < Hh && hits[y * W + x] && hits[y * W + x]!.mat !== 'tongue') put(y * W + x, darkHex);
    }
  }
  // contorno de afuera, del color oscuro de la pieza vecina
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < Hh && out.data[(y * W + x) * 4 + 3] > 0;
  const edge: [number, string][] = [];
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      if (filled(x, y)) continue;
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const X = x + dx, Y = y + dy;
        if (!filled(X, Y)) continue;
        const h = hits[Y * W + X];
        edge.push([y * W + x, h ? (h.mat === 'glow' ? ramps.glow[1] : (ramps[h.mat] ?? ramps.fur)[OUTLINE]) : darkHex]);
        break;
      }
    }
  for (const [i, hex] of edge) put(i, hex);
  // apoya en el piso: lo más bajo va a la fila del piso (menos lo que esté en el aire)
  let y1 = -1, x0 = Infinity, x1 = -1, y0 = Infinity;
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (out.data[(y * W + x) * 4 + 3]) { y1 = Math.max(y1, y); y0 = Math.min(y0, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  const dy = y1 < 0 ? 0 : oy - y1 - Math.round(pose.air);
  // premium: el perro se corre hacia la cola (lo mismo en todas las animaciones, así el pivote no salta): estira más
  // hacia adelante (cabeza, pelota, mordida) que hacia atrás y si no la cabeza pega contra el borde de la celda
  const lead = prem ? Math.round(3 * d.u * Math.cos(phi)) : 0;
  const dx = Math.round(pose.x) - lead;
  const shifted = createRaster(W, Hh);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const X = x - dx, Y = y - dy;
    if (X < 0 || Y < 0 || X >= W || Y >= Hh) continue;
    const s = (Y * W + X) * 4, t = (y * W + x) * 4;
    for (let c = 0; c < 4; c++) shifted.data[t + c] = out.data[s + c];
  }
  const body = y1 < 0 ? null : { x0: x0 + dx, y0: y0 + dy, x1: x1 + dx, y1: y1 + dy };
  void BASE;
  return { raster: shifted, pivotX: ox, groundRow: oy, body };
}
