import { createRaster, type Raster } from '../core/raster';
import { pnoise } from './tiles';

/**
 * Atmósfera sombría: bruma en capas que se mueve (texturas que pegan por todos lados), fuegos fatuos, cuervos,
 * murciélagos, ojos que parpadean entre los arbustos y telarañas. Las criaturas chicas están dibujadas a mano,
 * pixel por pixel, con mapas de caracteres (así se hace el pixel art clásico).
 */

type RGBA = [number, number, number, number];
const hexA = (h: string, a = 255): RGBA => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), a];

/** Sprite desde un mapa de caracteres. '.' = vacío. */
function sprite(map: string[], pal: Record<string, RGBA>): Raster {
  const h = map.length, w = map[0].length;
  const r = createRaster(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = pal[map[y][x]];
    if (!c) continue;
    r.data.set(c, (y * w + x) * 4);
  }
  return r;
}
function mirror(r: Raster): Raster {
  const o = createRaster(r.w, r.h);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) o.data.set(r.data.subarray((y * r.w + x) * 4, (y * r.w + x) * 4 + 4), (y * r.w + (r.w - 1 - x)) * 4);
  return o;
}

// ---------- bruma ----------

/**
 * Textura de bruma que pega por los 4 lados (para hacerla correr en capas).
 * nubes: manchas grandes y suaves. jirones: hilos largos y horizontales que se arrastran por el suelo.
 */
export function fogTexture(kind: 'nubes' | 'jirones', size = 256): Raster {
  const r = createRaster(size, size);
  const col = kind === 'nubes' ? [176, 190, 214] : [196, 206, 226];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v: number;
    if (kind === 'nubes') v = pnoise(x, y, 64, size, 11) * 0.55 + pnoise(x, y, 32, size, 13) * 0.3 + pnoise(x, y, 16, size, 17) * 0.15;
    else v = pnoise(x * 0.5, y * 2, 32, size, 21) * 0.6 + pnoise(x * 0.5, y * 2, 16, size, 23) * 0.4; // estirado en x
    const t = Math.max(0, Math.min(1, (v - 0.42) / 0.36));
    const a = Math.round(t * t * (3 - 2 * t) * (kind === 'nubes' ? 150 : 120));
    // pixelado suave: alfa en escalones de 16 (se ve pixel art, no gradiente liso)
    r.data.set([col[0], col[1], col[2], Math.round(a / 16) * 16], (y * size + x) * 4);
  }
  return r;
}

// ---------- criaturas ----------

export interface Creature { name: string; w: number; h: number; anims: Record<string, { frames: Raster[]; fps: number; loop: boolean }> }

const CROW: Record<string, RGBA> = { K: hexA('#07060a'), D: hexA('#17151e'), M: hexA('#262333'), L: hexA('#3e3a52'), B: hexA('#8a7e64'), E: hexA('#f0e8ff'), F: hexA('#4a4038') };

export function crow(): Creature {
  const idle1 = [
    '................',
    '................',
    '..........KKK...',
    '.........KDDDK..',
    '.........KDEDKBB',
    '.........KDDDKB.',
    '.....KKKKKMDDK..',
    '...KKMMMMLMMDK..',
    '..KDMMLLLMMMDK..',
    '.KDDMMMMMMMDK...',
    'KDDDDMMMMMDK....',
    '.KKDDDDDDKK.....',
    '....KKKKK.......',
    '.....F..F.......',
    '.....F..F.......',
    '....FF.FF.......',
  ];
  const idle2 = idle1.map((l, i) => (i >= 2 && i <= 5 ? '.' + l.slice(0, 15) : l));
  const peck1 = [
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....KKKKK......',
    '...KKMMMMLKK....',
    '..KDMMLLLMMDKKK.',
    '.KDDMMMMMMMDDDK.',
    'KDDDDMMMMMDKEDKB',
    '.KKDDDDDDKK.KDKBB',
    '....KKKKK....K..',
    '................',
    '.....F..F.......',
    '.....F..F.......',
    '....FF.FF.......',
  ].map((l) => l.slice(0, 16));
  const fly = (up: number) => {
    const wing = up === 0 ? ['..KKK.......KKK.', '.KMMLK.....KLMMK', 'KMMMMLK...KLMMMK'] : up === 1 ? ['................', 'KKKKKK....KKKKKK', 'KMMMMLKKKKLMMMMK'] : ['................', '................', 'KKKK........KKKK'];
    const body = ['...KDDDDDDDDK...', '..KDDMMMMMMDDKBB', '...KDDDDDDDDKE..', '....KKKKKKKK....'];
    const low = up === 2 ? ['.KMMMK....KMMMK.', '..KKK......KKK..'] : ['................', '................'];
    return [...['................', '................'], ...wing, ...body, ...low, '................', '................', '................', '................', '................'].slice(0, 16);
  };
  const toR = (m: string[]) => sprite(m.map((l) => l.padEnd(16, '.').slice(0, 16)), CROW);
  return {
    name: 'cuervo', w: 16, h: 16,
    anims: {
      quieto: { frames: [toR(idle1), toR(idle1), toR(idle2), toR(idle1)], fps: 3, loop: true },
      picotear: { frames: [toR(idle1), toR(peck1), toR(idle1), toR(peck1), toR(idle1)], fps: 8, loop: false },
      volar: { frames: [0, 1, 2, 1].map((u) => toR(fly(u))), fps: 12, loop: true },
    },
  };
}

export function bat(): Creature {
  const P: Record<string, RGBA> = { K: hexA('#07060a'), D: hexA('#1e1826'), M: hexA('#3a2e48'), E: hexA('#ff5a5a') };
  const up = [
    'KK............KK',
    'KMK..........KMK',
    'KMMK...KK...KMMK',
    '.KMMK.KDDK.KMMK.',
    '..KMMKDEEDKMMK..',
    '...KKKDDDDKKK...',
    '......KDDK......',
    '.......KK.......',
  ];
  const down = [
    '................',
    '................',
    '.......KK.......',
    '......KDDK......',
    '...KKKDEEDKKK...',
    '..KMMKDDDDKMMK..',
    '.KMMK..KK..KMMK.',
    'KMK..........KMK',
  ];
  return { name: 'murcielago', w: 16, h: 8, anims: { volar: { frames: [sprite(up, P), sprite(down, P)], fps: 10, loop: true } } };
}

/** Ojos entre los arbustos: dos pares que miran y parpadean (no dan miedo de verdad: son curiosos). */
export function bushEyes(): Creature {
  const P: Record<string, RGBA> = { Y: hexA('#ffd25a'), W: hexA('#fff6c8'), G: hexA('#ffd25a', 90), K: hexA('#07060a', 0) };
  const open = ['.G.G.....G.G....', 'GYWYG...GYWYG...', '.GYG.....GYG....', '................', '......G.G.......', '.....GYWYG......', '......GYG.......', '................'];
  const half = ['................', '.GYG.....GYG....', '................', '................', '................', '.....GYYYG......', '................', '................'];
  const shut = ['................', '..Y.......Y.....', '................', '................', '................', '......YYY.......', '................', '................'];
  const look = open.map((l) => '.' + l.slice(0, 15));
  return {
    name: 'ojos', w: 16, h: 8,
    anims: {
      mirar: { frames: [sprite(open, P), sprite(open, P), sprite(look, P), sprite(look, P)], fps: 2, loop: true },
      parpadeo: { frames: [sprite(open, P), sprite(half, P), sprite(shut, P), sprite(half, P), sprite(open, P)], fps: 14, loop: false },
    },
  };
}

/** Fuego fatuo: lucecita que flota y titila (6 cuadros). */
export function wisp(color = '#8af8ff'): Creature {
  const frames: Raster[] = [];
  const c = hexA(color);
  for (let f = 0; f < 6; f++) {
    const r = createRaster(16, 16);
    const put = (x: number, y: number, a: number, k: RGBA = c) => { if (x < 0 || y < 0 || x >= 16 || y >= 16) return; r.data.set([k[0], k[1], k[2], a], (y * 16 + x) * 4); };
    const cy = 9 + Math.round(Math.sin((f / 6) * Math.PI * 2) * 0.6);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, (y - cy) * 1.1);
      if (d < 6.5) put(x, y, Math.round(Math.max(0, 1 - d / 6.5) ** 2 * 140 / 16) * 16);
    }
    // cola de llama que sube
    const tip = [3, 4, 2, 5, 3, 4][f];
    for (let k = 0; k < tip; k++) put(7 + (k % 2 && f % 2 ? 1 : 0), cy - 3 - k, 200 - k * 30);
    for (const [x, y] of [[7, cy - 1], [8, cy - 1], [6, cy], [7, cy], [8, cy], [9, cy], [7, cy + 1], [8, cy + 1]]) put(x, y, 255);
    put(7, cy - 1, 255, hexA('#ffffff')); put(7, cy, 255, hexA('#ffffff'));
    frames.push(r);
  }
  return { name: 'fuego_fatuo', w: 16, h: 16, anims: { flotar: { frames, fps: 8, loop: true } } };
}

/** Telaraña entre ramas (se pone pegada a un tronco). */
export function cobweb(): Raster {
  const W = 40, H = 36, r = createRaster(W, H);
  const put = (x: number, y: number, a: number) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; r.data.set([214, 220, 232, a], (y * W + x) * 4); };
  const cx = 6, cy = 5;
  const spokes = 7;
  for (let s = 0; s < spokes; s++) {
    const a = (s / (spokes - 1)) * Math.PI * 0.5;
    for (let d = 0; d < 34; d++) put(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9, 150);
  }
  for (let ring = 6; ring < 34; ring += 5) for (let s = 0; s < spokes - 1; s++) {
    const a0 = (s / (spokes - 1)) * Math.PI * 0.5, a1 = ((s + 1) / (spokes - 1)) * Math.PI * 0.5;
    for (let k = 0; k <= 6; k++) {
      const t = k / 6, a = a0 + (a1 - a0) * t, sag = Math.sin(t * Math.PI) * 1.2;
      put(cx + Math.cos(a) * (ring - sag), cy + Math.sin(a) * (ring - sag) * 0.9, 110);
    }
  }
  return r;
}

export function creatures(): Creature[] {
  const c = crow();
  return [c, { ...c, name: 'cuervo_izq', anims: Object.fromEntries(Object.entries(c.anims).map(([k, a]) => [k, { ...a, frames: a.frames.map(mirror) }])) }, bat(), bushEyes(), wisp('#8af8ff'), { ...wisp('#c8a0ff'), name: 'fuego_fatuo_violeta' }];
}
