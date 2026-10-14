import { createRaster, type Raster } from '../core/raster';
import { renderCitizen, STAND, STRETCH, WAVE, type CitizenLook } from '../boss/ciudadano';
import { over, type DeepPartial } from '../boss/anim';
import type { BossPose } from '../boss/rig';
import { contactShadow } from './premium/contact';
import type { WorldObject } from './objects';

/**
 * Mundo 5: los ciudadanos dormidos de piedra (encargo F12, parte 2). Toda la ciudad quedó de piedra en medio de lo
 * que hacía. Cada estatua es una persona de verdad dibujada con el motor de volúmenes (ciudadano.ts), en una sola
 * vista y mirando a distintos lados.
 *
 * - `dormida` (1 cuadro): piedra clara con musgo plateado, los ojos cerrados, en plena tarea.
 * - `despertar` (12 cuadros a 12 fps): se estira y bosteza, la piedra se le cae como polvo y queda la persona de
 *   colores, que abre los ojos.
 * - `despierta` (4 cuadros a 4 fps): respira y saluda.
 *
 * Del encargo son las 8 primeras (0 a 7). Van dos más (8: el otro guardia, con escudo, y 9: la señora que riega las
 * flores) para que la puerta de la ciudad tenga dos guardias distintos y ninguna pantalla repita una estatua.
 */

interface StatueSpec {
  nombre: string;
  look: CitizenLook;
  yaw: number;
  accion: DeepPartial<BossPose>;
  /** el estirón y el saludo (si no, los de siempre) */
  estira?: DeepPartial<BossPose>;
  saluda?: DeepPartial<BossPose>;
}

// colores de la ciudad despierta: rojos, verdes y amarillos suaves
const ROJO = '#c8483a', VERDE = '#5a9a5a', AMARILLO = '#e8c860', AZUL = '#4a6aa8', CREMA = '#f0e8d4', MARRON = '#6a4a32', VIOLETA = '#8a5a9a';
const PIEL = ['#f0c8a0', '#d8a078', '#b07850', '#e8b890'];

/** Para los que tienen algo largo en la mano (pala, lanza): se estiran con un solo brazo y saludan con el otro. */
const ESTIRA_UNO: DeepPartial<BossPose> = { arms: { near: { pitch: 26, spread: 12, elbow: 62 }, far: { pitch: 166, spread: 24, elbow: 22, open: 1 } } };
/** saluda con la mano de atrás y deja la otra como está */
const SALUDA_LEJOS = (arms: DeepPartial<BossPose['arms']>): DeepPartial<BossPose> => ({ arms: { ...arms, far: { pitch: 150, spread: 34, elbow: 40, open: 1 } } });
const SALUDA_UNO: DeepPartial<BossPose> = { arms: { near: { pitch: 22, spread: 12, elbow: 62 }, far: { pitch: 150, spread: 34, elbow: 40, open: 1 } } };

export const ESTATUAS: StatueSpec[] = [
  {
    nombre: 'panadero', yaw: 55,
    look: { skin: PIEL[0], hair: '#5a3a22', top: CREMA, bottom: MARRON, shoe: '#3a2418', apron: true, accent: '#ffffff', hairStyle: 'corto', hat: 'panadero', hatHex: '#ffffff', prop: 'pala', propHex: '#a8784a', belly: 0.9, beard: '#5a3a22' },
    accion: { root: { lean: 8, y: -2 }, spine: { bend: 6 }, head: { pitch: 4 }, arms: { near: { pitch: 62, spread: 8, elbow: 26 }, far: { pitch: 52, spread: 10, elbow: 40 } }, legs: { near: { x: 6 }, far: { x: -5 } }, weapon: { angle: 72, twoHand: true } },
    estira: { ...ESTIRA_UNO, weapon: { angle: 12 } }, saluda: { ...SALUDA_UNO, weapon: { angle: 12 } },
  },
  {
    nombre: 'senora_canasta', yaw: 115,
    look: { skin: PIEL[1], hair: '#3a2a20', top: VERDE, bottom: '#3a5a3a', shoe: '#2a1a12', hairStyle: 'mono', hat: 'panuelo', hatHex: ROJO, skirt: 1, prop: 'canasta', accent: AMARILLO },
    accion: { root: { lean: 4 }, head: { pitch: 2, yaw: -10 }, arms: { far: { pitch: 58, spread: 14, elbow: 20, open: 1 }, near: { pitch: 14, spread: 18, elbow: 92 } }, legs: { near: { x: 6, z: 1 }, far: { x: -6, z: 1, toe: 20 } } },
    estira: { arms: { far: { pitch: 166, spread: 24, elbow: 22, open: 1 }, near: { pitch: 14, spread: 18, elbow: 92 } } },
    saluda: SALUDA_LEJOS({ near: { pitch: 14, spread: 18, elbow: 92 } }),
  },
  {
    nombre: 'nino_ronda', yaw: 30,
    look: { skin: PIEL[2], hair: '#2a1a12', top: ROJO, bottom: AZUL, shoe: '#2a2a2a', hairStyle: 'rizos', hat: 'gorra', hatHex: AMARILLO, child: true },
    accion: { root: { lean: -4, roll: -6, y: 1 }, head: { pitch: -10, roll: 8 }, arms: { near: { pitch: 60, spread: 72, elbow: 10, open: 1 }, far: { pitch: 58, spread: 70, elbow: 12, open: 1 } }, legs: { near: { x: 4, y: 6, z: 2, toe: 30 }, far: { x: -2, y: 0, z: 1 } } },
  },
  {
    nombre: 'nina_ronda', yaw: 150,
    look: { skin: PIEL[3], hair: '#8a4a22', top: AMARILLO, bottom: '#e88a6a', shoe: '#6a2a2a', hairStyle: 'trenzas', skirt: 0.5, child: true },
    accion: { root: { lean: -4, roll: 6, y: 1 }, head: { pitch: -12, roll: -8 }, arms: { near: { pitch: 58, spread: 70, elbow: 12, open: 1 }, far: { pitch: 62, spread: 72, elbow: 10, open: 1 } }, legs: { near: { x: -2, y: 0, z: 1 }, far: { x: 4, y: 6, z: 2, toe: 30 } } },
  },
  {
    nombre: 'violinista', yaw: 70,
    look: { skin: PIEL[0], hair: '#8a8a88', top: '#7a3a4a', bottom: '#2a2a3a', shoe: '#1a1a1a', hairStyle: 'corto', hat: 'boina', hatHex: '#3a3a5a', prop: 'violin', propHex: '#a8582a', beard: '#9a9a98', accent: AMARILLO },
    accion: { root: { lean: -2 }, head: { pitch: 12, roll: 16 }, arms: { near: { pitch: 104, spread: 44, elbow: 64 }, far: { pitch: 72, spread: 30, elbow: 84 } }, legs: { near: { x: 4 }, far: { x: -4 } }, extra: { bow: 0.5 } },
    estira: { arms: { near: { pitch: 104, spread: 44, elbow: 64 }, far: { pitch: 166, spread: 26, elbow: 22, open: 1 } } },
    saluda: { arms: { near: { pitch: 104, spread: 44, elbow: 64 }, far: { pitch: 150, spread: 34, elbow: 40, open: 1 } } },
  },
  {
    nombre: 'tamborilero', yaw: 100,
    look: { skin: PIEL[2], hair: '#1a1a1a', top: AZUL, bottom: CREMA, shoe: '#2a1a12', hairStyle: 'corto', hat: 'gorra', hatHex: ROJO, prop: 'tambor', propHex: ROJO, accent: AMARILLO },
    accion: { root: { lean: 2, y: -1 }, head: { pitch: -6 }, arms: { near: { pitch: 46, spread: 18, elbow: 74 }, far: { pitch: 70, spread: 18, elbow: 56 } }, legs: { near: { x: 3, z: 2 }, far: { x: -3, z: 2 } } },
  },
  {
    nombre: 'guardia_lanza', yaw: 72,
    look: { skin: PIEL[1], hair: '#2a1a12', top: '#3a5a8a', bottom: '#2a3a5a', shoe: '#1a1a1a', hairStyle: 'corto', hat: 'casco', hatHex: '#b8b8c0', prop: 'lanza', propHex: '#c8c8d0', accent: ROJO, beard: '#2a1a12' },
    // dormido de pie, apoyado en la lanza, la cabeza que se le cae
    accion: { root: { lean: 4, y: -1 }, spine: { bend: 6 }, head: { pitch: 26, roll: 6 }, arms: { near: { pitch: 26, spread: 14, elbow: 64 }, far: { pitch: 6, spread: 8, elbow: 12 } }, weapon: { angle: 6 } },
    estira: { ...ESTIRA_UNO, weapon: { angle: 6 } }, saluda: { ...SALUDA_UNO, weapon: { angle: 6 } },
  },
  {
    nombre: 'senor_leyendo', yaw: 95,
    look: { skin: PIEL[0], hair: '#c8c8c0', top: '#5a4a6a', bottom: '#3a3a3a', shoe: '#1a1a1a', hairStyle: 'calvo', glasses: true, beard: '#e0e0d8', prop: 'libro', propHex: VERDE, accent: CREMA, belly: 0.4 },
    accion: { root: { lean: 2 }, spine: { bend: 8 }, head: { pitch: 26 }, arms: { near: { pitch: 46, spread: 6, elbow: 70 }, far: { pitch: 46, spread: 6, elbow: 72 } } },
    estira: { arms: { near: { pitch: 166, spread: 24, elbow: 22, open: 1 }, far: { pitch: 46, spread: 6, elbow: 72 } } },
    saluda: { arms: { far: { pitch: 46, spread: 6, elbow: 72 } } },
  },
  {
    nombre: 'guardia_escudo', yaw: 108,
    look: { skin: PIEL[2], hair: '#3a2418', top: '#8a3a3a', bottom: '#2a2a3a', shoe: '#1a1a1a', hairStyle: 'corto', hat: 'casco', hatHex: '#c8b070', prop: 'escudo', propHex: '#b89a50', accent: AZUL },
    accion: { root: { lean: 3, y: -1 }, spine: { bend: 6 }, head: { pitch: 28, roll: -8 }, arms: { near: { pitch: 10, spread: 10, elbow: 20 }, far: { pitch: 36, spread: 16, elbow: 72 } } },
    estira: { arms: { near: { pitch: 166, spread: 24, elbow: 22, open: 1 }, far: { pitch: 36, spread: 16, elbow: 72 } } },
    saluda: { arms: { far: { pitch: 36, spread: 16, elbow: 72 } } },
  },
  {
    nombre: 'senora_regando', yaw: 62,
    look: { skin: PIEL[3], hair: '#a8a8a0', top: VIOLETA, bottom: '#6a4a7a', shoe: '#2a1a2a', hairStyle: 'mono', skirt: 1, prop: 'regadera', propHex: '#7a9aa8', accent: CREMA },
    accion: { root: { lean: 10, y: -1 }, spine: { bend: 8 }, head: { pitch: 18 }, arms: { near: { pitch: 58, spread: 12, elbow: 14 }, far: { pitch: 20, spread: 14, elbow: 60 } }, legs: { near: { x: 5 }, far: { x: -5 } } },
    estira: { arms: { near: { pitch: 30, spread: 12, elbow: 40 }, far: { pitch: 166, spread: 24, elbow: 22, open: 1 } } },
    saluda: { arms: { near: { pitch: 30, spread: 12, elbow: 40 }, far: { pitch: 150, spread: 34, elbow: 40, open: 1 } } },
  },
];

const hash = (x: number, y: number, s: number) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function put(r: Raster, x: number, y: number, c: number[], a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const k = (y * r.w + x) * 4;
  if (a >= 255 || !r.data[k + 3]) { r.data[k] = c[0]; r.data[k + 1] = c[1]; r.data[k + 2] = c[2]; r.data[k + 3] = Math.max(a, r.data[k + 3]); return; }
  const t = a / 255;
  for (let i = 0; i < 3; i++) r.data[k + i] = Math.round(r.data[k + i] * (1 - t) + c[i] * t);
}

/**
 * Polvo de piedra que se cae del cuerpo al despertar (k de 0 a 1): granitos claros que bajan desde la silueta y se
 * juntan en un montoncito al pie. Unas chispitas lilas del polvo de sueño que se va.
 */
function dust(r: Raster, k: number, f: number) {
  if (k <= 0) return;
  const W = r.w, H = r.h, pts: [number, number][] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (r.data[(y * W + x) * 4 + 3] > 200) pts.push([x, y]);
  if (!pts.length) return;
  const n = Math.round(60 * Math.sin(Math.min(1, k) * Math.PI) + 10);
  for (let i = 0; i < n; i++) {
    const [px, py] = pts[Math.floor(hash(i, f, 7) * pts.length)];
    const fall = (hash(i, 3, 9) * 0.6 + 0.4) * k * 26;
    const y = Math.min(60, py + fall), x = px + (hash(i, 5, 11) - 0.5) * 6 * k;
    put(r, x, y, hash(i, 1, 13) > 0.5 ? [200, 204, 216] : [138, 145, 160], 230);
    if (hash(i, 2, 17) > 0.86) put(r, x + 1, y - 2, [184, 154, 255], 200);
  }
  // el montoncito de polvo al pie
  const pile = Math.min(1, k * 1.4);
  for (let x = 14; x < 34; x++) { const h = Math.sin(((x - 14) / 20) * Math.PI) * 2.2 * pile; for (let y = 0; y < h; y++) put(r, x, 60 - y, y > h - 1 ? [168, 174, 187] : [108, 116, 132], 220); }
}

/** Grietas finas que se abren en la piedra justo antes de moverse (un pixel claro, una raya oscura al lado). */
function cracks(r: Raster, k: number, seed: number) {
  if (k <= 0) return;
  const W = r.w;
  for (let c = 0; c < Math.round(5 * k); c++) {
    let x = 14 + hash(c, seed, 21) * 20, y = 16 + hash(seed, c, 23) * 34;
    for (let t = 0; t < 6; t++) {
      const i = (Math.round(y) * W + Math.round(x)) * 4;
      if (r.data[i + 3] > 200) { r.data[i] = 40; r.data[i + 1] = 46; r.data[i + 2] = 60; put(r, x + 1, y, [220, 224, 236]); }
      x += hash(c, t, 25) - 0.5; y += 1;
    }
  }
}

const ease = (t: number) => t * t * (3 - 2 * t);

/** Las tres animaciones de una estatua. */
export function statueAnims(sp: StatueSpec): { dormida: Raster; despertar: Raster[]; despierta: Raster[] } {
  const base = over(STAND, sp.accion);
  const accion: BossPose = { ...base, freed: 0, face: { eyes: 'closed' } };
  const estira = over(over(STRETCH, sp.accion.weapon ? { weapon: sp.accion.weapon } : {}), sp.estira ?? {});
  const saluda = over(over(WAVE, sp.accion.weapon ? { weapon: sp.accion.weapon } : {}), sp.saluda ?? {});
  const relax = over(STAND, { ...(sp.accion.weapon ? { weapon: sp.accion.weapon } : {}), ...(sp.saluda?.arms ? { arms: { near: sp.saluda.arms.near?.pitch && sp.saluda.arms.near.pitch < 100 ? sp.saluda.arms.near : STAND.arms.near, far: sp.saluda.arms.far?.pitch && sp.saluda.arms.far.pitch < 100 ? sp.saluda.arms.far : STAND.arms.far } } : {}) }) as BossPose;
  const lerp = (a: BossPose, b: BossPose, t: number): BossPose => blend(a, b, ease(Math.max(0, Math.min(1, t))));
  const r = (p: BossPose) => renderCitizen(sp.look, p, sp.yaw);
  const dormida = r(accion);
  // despertar: 0-1 la piedra se agrieta, 2-5 se estira y bosteza (todavía de piedra), 5-8 se le cae la piedra y
  // aparece el color, 9-11 baja los brazos, abre los ojos y sonríe
  const keysF = [0, 0, 0.25, 0.55, 0.85, 1, 1, 1, 0.7, 0.4, 0.15, 0];
  const freedF = [0, 0, 0, 0, 0.05, 0.3, 0.55, 0.8, 1, 1, 1, 1];
  const despertar = keysF.map((t, f) => {
    const p0 = f < 8 ? lerp(accion, estira, t) : lerp(relax, estira, t);
    const p: BossPose = { ...p0, freed: freedF[f], face: { eyes: f >= 10 ? 'open' : 'closed', mouth: f >= 10 ? 0.5 : 0 }, extra: { ...(p0.extra ?? {}), yawn: f >= 3 && f <= 8 ? [0, 0, 0, 0.5, 1, 1, 0.8, 0.5, 0.2][f] : 0 } };
    const fr = r(p);
    if (f <= 2) cracks(fr, f / 2, 31 + f);
    dust(fr, f >= 4 && f <= 10 ? (f - 3) / 6 : 0, f);
    return fr;
  });
  // despierta: respira y saluda (la mano va y vuelve)
  const despierta = [0, 1, 2, 1].map((k) => {
    const p = blend(relax, saluda, [0.55, 0.85, 1][k]);
    return r({ ...p, freed: 1, root: { ...p.root, y: (p.root.y ?? 0) + (k === 2 ? 0.6 : 0) }, face: { eyes: k === 2 ? 'happy' : 'open', mouth: 0.5 } });
  });
  return { dormida, despertar, despierta };
}

/** Mezcla dos poses (números interpolados, lo demás del segundo pasada la mitad). */
function blend(a: BossPose, b: BossPose, t: number): BossPose {
  const mix = (x: unknown, y: unknown): unknown => {
    if (typeof x === 'number' && typeof y === 'number') return x + (y - x) * t;
    if (x && y && typeof x === 'object' && typeof y === 'object') {
      const o: Record<string, unknown> = {};
      for (const k of new Set([...Object.keys(x as object), ...Object.keys(y as object)])) {
        const vx = (x as Record<string, unknown>)[k], vy = (y as Record<string, unknown>)[k];
        o[k] = vx === undefined ? vy : vy === undefined ? vx : mix(vx, vy);
      }
      return o;
    }
    return t < 0.5 ? x ?? y : y ?? x;
  };
  return mix(a, b) as BossPose;
}

export function statueObjects(): WorldObject[] {
  return ESTATUAS.map((sp, i) => {
    const a = statueAnims(sp);
    return {
      name: `estatua_ciudadano_${i}`, w: 48, h: 64, anchor: [24, 60] as [number, number], solid: [-8, -8, 16, 8] as [number, number, number, number],
      anims: {
        idle: { frames: [a.dormida], fps: 1, loop: true },
        dormida: { frames: [a.dormida], fps: 1, loop: true },
        despertar: { frames: a.despertar, fps: 12, loop: false },
        despierta: { frames: a.despierta, fps: 4, loop: true },
      },
      shadow: contactShadow(a.dormida, [24, 60], { rows: 4, spread: 2, tall: 2.4 }),
    };
  });
}

void createRaster;
