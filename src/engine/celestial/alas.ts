import { createRaster, type Raster } from '../core/raster';
import type { Joints } from '../render/human';
import type { ViewName } from '../render/clip';
import { VOLAR_ALETEO } from '../anim/celestial';

/**
 * Las alas y la aureola de la heroína celestial (encargo F13, parte 3), cuadro por cuadro.
 *
 * Las alas se piensan en 3D sencillo: un hueso de tres tramos (hombro del ala, codo, muñeca) que sale de la espalda, y
 * de él cuelgan las plumas como cápsulas: las primarias en abanico desde la muñeca, las secundarias desde el antebrazo
 * y las terciarias cerca de la espalda, con las cobertoras doradas tapando la base. Cada cuadro se arma con las
 * articulaciones del cuerpo (el cuello, la cadera y la cabeza) y se proyecta según hacia dónde mira la heroína.
 *
 * Lo que queda detrás del cuerpo va a `alas_detras` (el juego lo dibuja debajo de la base) y lo que queda delante a
 * `alas_delante` (encima de todo). Nada de lo de delante tapa la cabeza: donde el ala pasaría por la cara o el pelo,
 * queda detrás.
 */

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** paleta de las alas: blanco que tira a perla en la sombra, oro en el borde y en las puntas */
export const ALA = {
  luz: hex('#ffffff'),
  pluma: hex('#f4f2fb'),
  sombra: hex('#d6d8ee'),
  hondo: hex('#b4b6d8'),
  oro: hex('#ffd45a'),
  oroLuz: hex('#fff2b0'),
  oroHondo: hex('#c8902a'),
  borde: hex('#5a4630'),
};

/** Cómo va el ala en un cuadro */
export interface PoseAla {
  /** 0 plegada contra la espalda, 1 abierta del todo */
  abre: number;
  /** aleteo en grados: + las puntas suben */
  aleteo: number;
  /** las puntas caen (morir) */
  cae?: number;
}

/** hacia dónde mira cada vista: x a la derecha de la pantalla, z hacia la cámara */
const FACING: Record<ViewName, [number, number]> = {
  front: [0, 1], back: [0, -1], side: [1, 0], left: [-1, 0],
  se: [Math.SQRT1_2, Math.SQRT1_2], sw: [-Math.SQRT1_2, Math.SQRT1_2], ne: [Math.SQRT1_2, -Math.SQRT1_2], nw: [-Math.SQRT1_2, -Math.SQRT1_2],
};
/** lo que se acerca a la cámara baja en la pantalla (la cámara mira un poco desde arriba) */
const DEPTH_Y = 0.32;

/** Huesos del ala abierta, en pixeles a celda 48: [lateral, arriba] */
const HUESO: [number, number][] = [[2, 1], [8, 8], [15, 13], [20, 11]];
/** Plumas: [desde (índice del hueso, fracción hasta el siguiente), punta, ancho, clase] */
type Clase = 'primaria' | 'secundaria' | 'terciaria';
const PLUMAS: { b: number; t: number; tip: [number, number]; w: number; c: Clase }[] = [
  // terciarias (cerca de la espalda), de adentro hacia afuera
  { b: 0, t: 0.3, tip: [2, -5], w: 1.7, c: 'terciaria' },
  { b: 0, t: 0.8, tip: [5, -6], w: 1.8, c: 'terciaria' },
  // secundarias (del antebrazo)
  { b: 1, t: 0.2, tip: [8, -7], w: 1.9, c: 'secundaria' },
  { b: 1, t: 0.55, tip: [11, -7], w: 1.9, c: 'secundaria' },
  { b: 1, t: 0.9, tip: [14, -5], w: 1.9, c: 'secundaria' },
  // primarias (de la muñeca a la punta): las más largas, en abanico
  { b: 2, t: 0.2, tip: [17, -3], w: 1.8, c: 'primaria' },
  { b: 2, t: 0.6, tip: [20, 0], w: 1.7, c: 'primaria' },
  { b: 2, t: 1, tip: [22, 4], w: 1.6, c: 'primaria' },
  { b: 3, t: 0.4, tip: [23, 8], w: 1.4, c: 'primaria' },
];

interface Pt { x: number; y: number; z: number }

/** El ala de un lado (s = 1 la derecha de la heroína, -1 la izquierda), en coordenadas locales [lateral, atrás, arriba] */
function alaLocal(p: PoseAla, k: number, barrido = 0): { huesos: [number, number, number][]; plumas: { a: [number, number, number]; b: [number, number, number]; w: number; c: Clase }[] } {
  const abre = Math.max(0, Math.min(1, p.abre));
  const fi = (p.aleteo * Math.PI) / 180;
  const cs = Math.cos(fi), sn = Math.sin(fi);
  const cae = p.cae ?? 0;
  const map = ([lat, up]: [number, number]): [number, number, number] => {
    lat *= k; up *= k;
    // plegada: se cierra hacia atrás y las puntas bajan pegadas a la espalda
    let L = lat * (0.42 + 0.58 * abre);
    let B = 1 + lat * (0.45 - 0.2 * abre + barrido) + (1 - abre) * lat * 0.3;
    let U = up * (0.72 + 0.28 * abre) - (1 - abre) * 2 * k;
    // aleteo: gira el ala alrededor de la raíz (en el plano lateral y arriba)
    const L2 = L * cs - U * sn * 0.6, U2 = L * sn + U * cs;
    L = L2; U = U2 - cae * lat * 0.5;
    B += Math.max(0, -p.aleteo) * 0.02 * lat;
    return [L, B, U];
  };
  const huesos = HUESO.map(map);
  const plumas = PLUMAS.map((q) => {
    const h0 = HUESO[q.b], h1 = HUESO[Math.min(HUESO.length - 1, q.b + 1)];
    const base: [number, number] = [h0[0] + (h1[0] - h0[0]) * q.t, h0[1] + (h1[1] - h0[1]) * q.t];
    return { a: map(base), b: map(q.tip), w: q.w * k, c: q.c };
  });
  return { huesos, plumas };
}

/** Ejes en la pantalla para una vista y un torso: lateral (derecha de la heroína), atrás y arriba, con su profundidad */
function ejes(view: ViewName, j: Joints) {
  const [fx, fz] = FACING[view];
  const lat = { x: -fz, z: fx };
  const back = { x: -fx, z: -fz };
  // el torso puede ir inclinado o acostado: se gira todo con él
  const tx = j.neck[0] - j.hip[0], ty = j.neck[1] - j.hip[1];
  const tl = Math.hypot(tx, ty) || 1;
  const ang = Math.atan2(tx / tl, -ty / tl); // 0 = derecho
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const rot = (x: number, y: number) => ({ x: x * ca - y * sa, y: x * sa + y * ca });
  return {
    L: { ...rot(lat.x, lat.z * DEPTH_Y), z: lat.z },
    B: { ...rot(back.x, back.z * DEPTH_Y), z: back.z },
    U: { ...rot(0, -1), z: 0 },
    ang,
  };
}

/** de lado puro el ala se ve de canto: se barre más hacia atrás para que no quede encima del cuerpo */
function barridoVista(view: ViewName): number {
  const lz = Math.abs(FACING[view][0]);
  return 0.4 * Math.max(0, lz - 0.75) / 0.25;
}

export interface CapasAla { detras: Raster; delante: Raster }

/**
 * Las dos capas de las alas en un cuadro. `base` es el cuadro de la heroína (para no tapar la cabeza), `j` sus
 * articulaciones en la celda y `view` hacia dónde mira el cuerpo en ese cuadro.
 */
export function alasCuadro(base: Raster, j: Joints, view: ViewName, pose: PoseAla, k = 1): CapasAla {
  const W = base.w, H = base.h;
  const E = ejes(view, j);
  // la raíz: entre los omóplatos, un poco debajo del cuello y metida en la espalda
  const rx = j.neck[0] + (j.hip[0] - j.neck[0]) * 0.28, ry = j.neck[1] + (j.hip[1] - j.neck[1]) * 0.28;
  const proj = ([L, B, U]: [number, number, number], s: number): Pt => {
    const l = L * s;
    return {
      x: rx + l * E.L.x + (B + 1.5) * E.B.x + U * E.U.x,
      y: ry + l * E.L.y + (B + 1.5) * E.B.y + U * E.U.y,
      // profundidad respecto del centro del cuerpo (que está 3 px delante de la raíz): + hacia la cámara
      z: l * E.L.z + (B + 4.5) * E.B.z,
    };
  };
  // buffers: qué pluma pinta cada pixel, su profundidad y si es del ala lejana
  const N = W * H;
  const id = new Int16Array(N).fill(-1), zb = new Float32Array(N).fill(-1e9), tpar = new Float32Array(N), lado = new Int8Array(N);
  const plumaInfo: { c: Clase | 'cobertora'; s: number }[] = [];
  const stamp = (x: number, y: number, z: number, pid: number, t: number, s: number) => {
    const X = Math.round(x), Y = Math.round(y);
    if (X < 0 || Y < 0 || X >= W || Y >= H) return;
    const i = Y * W + X;
    if (z < zb[i] - 0.01) return;
    zb[i] = z; id[i] = pid; tpar[i] = t; lado[i] = s;
  };
  const local = alaLocal(pose, k, barridoVista(view));
  // las dos alas: primero la que queda más lejos (para que en la misma profundidad gane la cercana)
  const sides = [1, -1].sort((a, b) => proj(local.huesos[3], a).z - proj(local.huesos[3], b).z);
  for (const s of sides) {
    // plumas: de las primarias a las terciarias (las de adentro quedan encima, como en un ala de verdad)
    for (let q = local.plumas.length - 1; q >= 0; q--) {
      const f = local.plumas[q];
      const A = proj(f.a, s), B = proj(f.b, s);
      const pid = plumaInfo.length;
      plumaInfo.push({ c: f.c, s });
      const len = Math.hypot(B.x - A.x, B.y - A.y);
      const steps = Math.max(2, Math.ceil(len * 2));
      for (let st = 0; st <= steps; st++) {
        const t = st / steps;
        const cx = A.x + (B.x - A.x) * t, cy = A.y + (B.y - A.y) * t, cz = A.z + (B.z - A.z) * t;
        // la pluma es más ancha al medio y termina en punta redonda
        const w = f.w * (t < 0.75 ? 1 : Math.max(0.45, 1 - (t - 0.75) * 2.2));
        for (let dy = -Math.ceil(w); dy <= Math.ceil(w); dy++) for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++) {
          if (dx * dx + dy * dy > w * w + 0.3) continue;
          stamp(cx + dx, cy + dy, cz + 0.02 * q, pid, t, s);
        }
      }
    }
    // cobertoras: la banda dorada que cubre el hueso y la base de las plumas
    const pid = plumaInfo.length;
    plumaInfo.push({ c: 'cobertora', s });
    for (let b = 0; b < local.huesos.length - 1; b++) {
      const A = proj(local.huesos[b], s), B = proj(local.huesos[b + 1], s);
      const steps = Math.max(2, Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) * 2));
      const grosor = (b === 0 ? 2.2 : b === 1 ? 2 : 1.4) * k;
      for (let st = 0; st <= steps; st++) {
        const t = st / steps;
        const cx = A.x + (B.x - A.x) * t, cy = A.y + (B.y - A.y) * t, cz = A.z + (B.z - A.z) * t;
        for (let dy = -Math.ceil(grosor); dy <= Math.ceil(grosor); dy++) for (let dx = -Math.ceil(grosor); dx <= Math.ceil(grosor); dx++) {
          if (dx * dx + dy * dy > grosor * grosor + 0.3) continue;
          stamp(cx + dx, cy + dy + 0.5, cz + 0.5, pid, (b + t) / 3, s);
        }
      }
    }
  }
  // color de cada pixel
  const color = new Array<RGB | null>(N).fill(null);
  const nearZ = Math.max(...[1, -1].map((s) => proj(local.huesos[3], s).z));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (id[i] < 0) continue;
    const info = plumaInfo[id[i]];
    const t = tpar[i];
    let c: RGB;
    if (info.c === 'cobertora') {
      // el borde de arriba del ala es oro claro; adentro, oro; la base de las plumas que asoma debajo, en sombra
      const up = y > 0 ? id[i - W] : -1;
      const dn = y + 1 < H ? id[i + W] : -1;
      c = up < 0 || plumaInfo[up]?.s !== info.s ? ALA.oroLuz : ALA.oro;
      if (dn >= 0 && plumaInfo[dn]?.c !== 'cobertora' && up >= 0) c = ALA.oroHondo;
    } else {
      // plumas: blancas, en sombra cerca de la base (debajo de las cobertoras) y las puntas de las primarias doradas
      c = t < 0.35 ? ALA.sombra : ALA.pluma;
      if (t > 0.65) c = ALA.luz;
      if (info.c === 'primaria' && t > 0.88) c = ALA.oroLuz;
      // separación: solo entre las primarias (las largas, que se leen) y una sola línea entre grupos
      const otra = (q: number) => q >= 0 && q < N && id[q] >= 0 && id[q] !== id[i] && plumaInfo[id[q]].s === info.s && plumaInfo[id[q]].c !== 'cobertora';
      const sep = [i + 1, i - 1].some((q) => otra(q) && zb[q] > zb[i] && (info.c === 'primaria' || plumaInfo[id[q]].c !== info.c));
      if (sep && t > 0.3) c = ALA.sombra;
    }
    // el ala lejana un poco más apagada
    const z = zb[i];
    if (z < nearZ - 3) c = [c[0] * 0.88, c[1] * 0.88, c[2] * 0.93];
    color[i] = c;
  }
  // contorno: un borde oscuro cálido alrededor de toda el ala (como el de los personajes)
  const detras = createRaster(W, H), delante = createRaster(W, H);
  const headTop = j.neck[1] - 1;
  // cada ala va entera delante o detrás según dónde queda su raíz (si no, se ve una costura donde cruza el cuerpo)
  const alaDelante = (s: number) => proj(local.huesos[0], s).z > 0;
  const put = (i: number, c: RGB, s: number) => {
    const y = (i / W) | 0;
    const o = i * 4;
    // delante: el ala del lado de la cámara, salvo donde taparía la cabeza o el pelo
    const frente = alaDelante(s) && !(y < headTop + 2 && base.data[o + 3] > 0);
    const r = frente ? delante : detras;
    r.data[o] = Math.round(c[0]); r.data[o + 1] = Math.round(c[1]); r.data[o + 2] = Math.round(c[2]); r.data[o + 3] = 255;
  };
  for (let i = 0; i < N; i++) {
    if (color[i]) { put(i, color[i]!, lado[i]); continue; }
    // borde: pixel vacío pegado a un pixel de ala (en cruz)
    const x = i % W, y = (i / W) | 0;
    let best = -1;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const q = Y * W + X;
      if (color[q] && (best < 0 || zb[q] > zb[best])) best = q;
    }
    if (best >= 0) put(i, ALA.borde, lado[best]);
  }
  return { detras, delante };
}

// ---------------------------------------------------------------- cómo van las alas en cada animación

/** Cuánto se abren y cuánto aletean en el cuadro i de n, según la animación. `golpe` = cuadro del impacto o la suelta. */
export function poseAla(anim: string, i: number, n: number, golpe?: number): PoseAla {
  const u = n > 1 ? i / n : 0;
  const ola = Math.sin(u * Math.PI * 2);
  const g = golpe ?? Math.floor(n * 0.5);
  // se abre de golpe en el impacto y se va cerrando de a poco; justo antes se recoge un poco (anticipación)
  const estallido = (i0: number, pico = 1, reposo = 0.5) => {
    if (i < i0 - 1) return { abre: reposo - 0.12 * Math.min(1, (i + 1) / Math.max(1, i0 - 1)), aleteo: -4 };
    if (i === i0 - 1) return { abre: reposo - 0.2, aleteo: -10 };
    const d = i - i0;
    return { abre: reposo + (pico - reposo) * Math.exp(-d * 0.45), aleteo: 22 * Math.exp(-d * 0.6) };
  };
  switch (anim) {
    case 'idle': return { abre: 0.72, aleteo: 3 * ola };
    case 'walk': return { abre: 0.68, aleteo: 7 * Math.sin(u * Math.PI * 4) };
    case 'run': return { abre: 0.5, aleteo: 10 * Math.sin(u * Math.PI * 4) - 6 };
    case 'attack': case 'attack_heavy': case 'attack_thrust': case 'throw': return estallido(g, 1, 0.68);
    case 'cast': case 'nova': case 'summon': case 'warcry': return estallido(g, 1, 0.7);
    case 'channel': return { abre: 0.92, aleteo: 8 + 6 * ola };
    case 'whirlwind': return { abre: 0.95, aleteo: 4 };
    case 'leap': return { abre: 0.6 + 0.4 * Math.sin(u * Math.PI), aleteo: 26 * Math.cos(u * Math.PI * 2) };
    case 'charge': return { abre: 0.3, aleteo: -8 };
    case 'dodge': return { abre: 0.35 + 0.3 * Math.sin(u * Math.PI), aleteo: 12 * Math.sin(u * Math.PI) };
    case 'shoot_bow': case 'use_item': return { abre: 0.7, aleteo: i === g ? 10 : 2 * ola };
    case 'block_shield': return { abre: 0.22, aleteo: -6 };
    // se pliegan con el golpe y se vuelven a abrir
    case 'hit': { const k = Math.min(1, i / Math.max(1, n * 0.25)), back = i > n * 0.6 ? (i - n * 0.6) / (n * 0.4) : 0; return { abre: 0.5 - 0.42 * k + 0.35 * back, aleteo: -12 * k + 8 * back }; }
    case 'die': return { abre: Math.max(0.05, 0.45 - u * 0.6), aleteo: -10 * Math.min(1, u * 2), cae: Math.min(1, u * 1.4) };
    case 'volar': return { abre: 1, aleteo: 30 * VOLAR_ALETEO[i % VOLAR_ALETEO.length] };
    default: return { abre: 0.7, aleteo: 0 };
  }
}

// ---------------------------------------------------------------- la aureola

/**
 * La aureola dorada sobre la cabeza y un brillo suave alrededor. `cima` es el pixel más alto de la cabeza en ese
 * cuadro; si el cuerpo va acostado (morir) la aureola se apaga de a poco.
 */
export function aureolaCuadro(W: number, H: number, j: Joints, cima: number, i: number, n: number, apagando = 0): Raster {
  const r = createRaster(W, H);
  const tx = j.neck[0] - j.hip[0], ty = j.neck[1] - j.hip[1];
  const tl = Math.hypot(tx, ty) || 1;
  const ux = tx / tl, uy = ty / tl; // hacia arriba del cuerpo
  // de pie: arriba de la cabeza. Acostado: sigue al eje del cuerpo
  const dHead = Math.max(6, j.head[1] - cima);
  // apoyada en la coronilla: la celda no deja aire arriba de la cabeza
  const cx = j.head[0] + ux * (dHead - 0.5), cy = j.head[1] + uy * (dHead - 0.5);
  const vertical = Math.abs(uy) < 0.6;
  const RX = vertical ? 1.6 : 5.2, RY = vertical ? 5.2 : 1.6;
  const vida = Math.max(0, 1 - apagando);
  if (vida <= 0) return r;
  const set = (x: number, y: number, c: RGB, a: number) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const o = (y * W + x) * 4;
    if (r.data[o + 3] >= a) return;
    r.data[o] = c[0]; r.data[o + 1] = c[1]; r.data[o + 2] = c[2]; r.data[o + 3] = Math.round(a);
  };
  const tw = Math.sin((i / Math.max(1, n)) * Math.PI * 2);
  // brillo suave: un halo apenas visible alrededor del aro
  for (let y = -6; y <= 6; y++) for (let x = -9; x <= 9; x++) {
    const d = Math.hypot(x / (RX + 2.6), y / (RY + 2.4));
    if (d < 1 && Math.hypot(x / (RX + 0.6), y / (RY + 0.6)) > 1) set(cx + x, cy + y, ALA.oroLuz, (1 - d) * 120 * vida);
  }
  // el aro: grueso arriba (la parte de atrás se ve por arriba), brillante adelante
  for (let a = 0; a < 360; a += 4) {
    const t = (a * Math.PI) / 180;
    const x = cx + Math.cos(t) * RX, y = cy + Math.sin(t) * RY;
    const front = Math.sin(t) > 0;
    set(x, y, front ? ALA.oroLuz : ALA.oro, 255 * vida);
  }
  // un destello que pasa por el aro
  const sa = (i / Math.max(1, n)) * Math.PI * 2;
  set(cx + Math.cos(sa) * RX, cy + Math.sin(sa) * RY, hex('#ffffff'), 255 * vida);
  if (tw > 0.6) { set(cx + Math.cos(sa) * RX, cy + Math.sin(sa) * RY - 1, hex('#fffbe8'), 180 * vida); }
  return r;
}

/**
 * El tamaño del ala en una vista: el ala abierta del todo, con el aleteo más alto y el más bajo, tiene que caber en
 * la celda (un pixel de aire). Se calcula una vez por heroína y por vista con el reposo, así el ala no cambia de
 * tamaño entre cuadros ni entre animaciones.
 */
export function escalaVista(W: number, H: number, j: Joints, view: ViewName, k: number): number {
  let esc = k;
  for (let iter = 0; iter < 12; iter++) {
    const E = ejes(view, j);
    const rx = j.neck[0] + (j.hip[0] - j.neck[0]) * 0.28, ry = j.neck[1] + (j.hip[1] - j.neck[1]) * 0.28;
    let ok = true;
    for (const aleteo of [-30, 0, 30]) {
      const l = alaLocal({ abre: 1, aleteo }, esc, barridoVista(view));
      for (const s of [1, -1]) for (const p of [...l.huesos, ...l.plumas.map((q) => q.b)]) {
        const x = rx + p[0] * s * E.L.x + (p[1] + 1.5) * E.B.x + p[2] * E.U.x;
        const y = ry + p[0] * s * E.L.y + (p[1] + 1.5) * E.B.y + p[2] * E.U.y;
        // la punta lleva su ancho y el borde: 2 px y medio de margen
        if (x < 2.5 || x > W - 3.5 || y < 2.5 || y > H - 2) ok = false;
      }
    }
    if (ok) break;
    esc *= 0.95;
  }
  return esc;
}
