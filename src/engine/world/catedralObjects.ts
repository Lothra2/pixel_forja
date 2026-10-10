import { createRaster, type Raster } from '../core/raster';
import { IconCanvas, type MatDef, type P } from '../loot/canvas';
import { glowMat, metalMat } from '../loot/materials';
import type { WorldObject } from './objects';

/**
 * Objetos de la Catedral de las Raíces (mundo 2): columnas abrazadas por raíces, arcos rotos, el brasero de cobre de
 * los refugios, el pedestal de las tres brasas, raíces que respiran sobre los muros, escombros que tapan lo que todavía
 * no se abre y el haz de luz que baja por la escalera hundida.
 *
 * Paleta (PLAN.md F8): piedra azul grisácea, tierra oscura, raíces, cobre viejo y agua casi negra. Ámbar solo en
 * refugios y mecanismos encendidos, turquesa para la vida, violeta para la amenaza.
 */

export const CAT = {
  piedra: '#5c6678',
  piedraClara: '#7a8496',
  piedraOscura: '#3a4254',
  raiz: '#5a3e2a',
  raizOscura: '#3a281c',
  cobre: '#a0623a',
  verdin: '#4f8f80',
  turquesa: '#5ae0d0',
  ambar: '#ffb050',
  violeta: '#8a4ac8',
};

const stone = (hex: string): MatDef => ({ hex, kind: 'stone' });
const wood = (hex: string): MatDef => ({ hex, kind: 'wood' });
const canvas = (w: number, h: number, k = 2) => new IconCanvas(w, w / k, h);
const one = (fr: Raster) => ({ idle: { frames: [fr], fps: 1, loop: true } });

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Una raíz que baja serpenteando: tramos cortos que se van afinando. */
function root(c: IconCanvas, from: P, to: P, w: number, wob: number, seed: number, col = CAT.raiz) {
  const r = seeded(seed);
  const n = 7;
  let prev = from;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const p: P = [from[0] + (to[0] - from[0]) * t + (r() - 0.5) * wob * (i < n ? 1 : 0), from[1] + (to[1] - from[1]) * t];
    c.line(prev, p, Math.max(0.5, w * (1 - t * 0.6)), wood(col));
    prev = p;
  }
}

/** Columna de piedra azul con raíces que la abrazan desde el techo. Tapa: la copa se vuelve transparente en el juego. */
export function rootColumn(broken = false): WorldObject {
  const W = 48, H = broken ? 72 : 112;
  const c = canvas(W, H, 1.5); // 32 x H/1.5 unidades
  const U = H / 1.5, base = U - 3, top = broken ? 14 : 4;
  c.poly([[5, base + 1], [5, base - 3], [27, base - 3], [27, base + 1]], stone(CAT.piedraOscura)); // plinto
  c.poly([[9, base - 3], [9, top + 5], [23, top + 5], [23, base - 3]], stone(CAT.piedra));
  for (const x of [12, 16, 20]) c.px1([x, top + 6], [x, base - 4], stone(CAT.piedra), { tone: 1 }, true); // estrías
  if (broken) {
    c.poly([[9, top + 5], [12, top + 1], [15, top + 4], [18, top - 1], [21, top + 3], [23, top + 5]], stone(CAT.piedraClara), { bias: 1 });
    for (const [x, y, s] of [[3, base + 1, 2], [29, base + 1.5, 1.6]] as [number, number, number][]) c.ellipse([x, y], s, s * 0.7, stone(CAT.piedra));
  } else {
    c.poly([[6, top + 5], [6, top + 1], [26, top + 1], [26, top + 5]], stone(CAT.piedraClara), { bias: 1 }); // capitel
    c.poly([[8, top + 1], [9, top - 2], [23, top - 2], [24, top + 1]], stone(CAT.piedraClara), { bias: 1 });
  }
  // raíces: dos gruesas que bajan del techo y se abren en el piso
  root(c, [11, top - 2], [7, base + 1], 2.4, 3, 11);
  root(c, [21, top - 1], [26, base + 1], 2, 3, 12, CAT.raizOscura);
  root(c, [16, top + 8], [14, base], 1.2, 4, 13);
  // musgo turquesa: la vida que todavía queda
  const r = seeded(14);
  for (let i = 0; i < 5; i++) c.dot([10 + r() * 12, top + 10 + r() * (base - top - 14)], glowMat(CAT.turquesa), { tone: 3 }, true);
  // el musgo turquesa brilla un poco: puntos de vida que guían en la oscuridad
  return { name: broken ? 'columna_rota' : 'columna_raiz', w: W, h: H, anchor: [24, H - 4], solid: [-10, -6, 20, 6], anims: one(c.render({ shadow: [16, base, 13, 2] })), light: { color: CAT.turquesa, radius: broken ? 34 : 46, pulse: true, dy: broken ? 24 : 44 } };
}

/** Arco roto de la nave: se pasa por debajo, solo las patas chocan. */
export function brokenArch(): WorldObject {
  const c = canvas(128, 128, 4); // 32 x 32
  for (const x of [4, 24]) {
    c.poly([[x, 30], [x, 9], [x + 4, 9], [x + 4, 30]], stone(CAT.piedra));
    c.poly([[x - 1, 31], [x - 1, 28.5], [x + 5, 28.5], [x + 5, 31]], stone(CAT.piedraOscura), { bias: 1 });
  }
  c.ring([16, 10], 12, 7.6, 3.6, stone(CAT.piedra), {}, 180, 360);
  c.erase([[22, 0], [32, 0], [32, 7], [25, 8]]); // falta un pedazo arriba a la derecha
  c.poly([[14.4, 1.4], [17.6, 1.4], [17, 4.6], [15, 4.6]], stone(CAT.piedraClara), { bias: 1 });
  // raíces que cuelgan del arco y se agarran de la pata izquierda
  root(c, [9, 3], [5, 29], 1.4, 1.5, 21);
  root(c, [14, 2], [13, 9], 0.8, 1, 22, CAT.raizOscura);
  root(c, [20, 3.5], [20, 12], 0.7, 1, 23);
  c.dot([6, 16], glowMat(CAT.turquesa), { tone: 3 }, true);
  c.dot([26, 20], glowMat(CAT.turquesa), { tone: 3 }, true);
  return { name: 'arco_roto', w: 128, h: 128, anchor: [64, 122], solid: null, solids: [[-52, -8, 22, 8], [28, -8, 22, 8]], anims: one(c.render({ shadow: [16, 30.8, 14, 1.2] })) };
}

/** Brasero de cobre: el fuego de los refugios. Encendido late en ámbar; apagado es solo cobre frío. */
export function copperBrazier(lit: boolean): WorldObject {
  const frames: Raster[] = [];
  const n = lit ? 6 : 1;
  for (let f = 0; f < n; f++) {
    const c = canvas(32, 48, 1); // unidades = pixeles
    c.line([9, 44], [13, 30], 1.3, metalMat(CAT.cobre));
    c.line([23, 44], [19, 30], 1.3, metalMat(CAT.cobre));
    c.line([16, 45], [16, 31], 1.2, metalMat(CAT.cobre));
    c.ellipse([16, 29], 10, 3.4, metalMat(CAT.cobre));
    c.poly([[6, 28], [26, 28], [22, 33], [10, 33]], metalMat(CAT.cobre), { bias: -1 });
    c.dot([11, 31], metalMat(CAT.verdin), { tone: 3 }, true);
    c.dot([20, 32], metalMat(CAT.verdin), { tone: 3 }, true);
    if (lit) {
      // llama con lenguas que se mueven: base ancha naranja, cuerpo ámbar y corazón claro
      const k = [0, 1, 2, 1, 0, -1][f];
      const sw = (i: number) => Math.sin(f * 1.1 + i * 2.1) * 1.4;
      c.poly([[8, 28], [9 + sw(0), 21], [11.5 + sw(1), 14 - k], [14 + sw(2), 19], [16 + sw(3), 9 - k * 0.8], [18.5 + sw(4), 18], [21 + sw(5), 13 + k * 0.5], [23 + sw(6), 21], [24, 28]], glowMat('#ff7a24'), { tone: 3 });
      c.poly([[10.5, 28], [12 + sw(1) * 0.6, 20], [16 + sw(3) * 0.6, 13 - k * 0.6], [20 + sw(5) * 0.6, 20], [21.5, 28]], glowMat(CAT.ambar), { tone: 4 });
      c.poly([[13.5, 28], [16 + sw(2) * 0.4, 20 - k * 0.3], [18.5, 28]], glowMat('#ffe8a0'), { tone: 5 });
      if (f % 2 === 0) c.dot([12 + f, 8 - (f % 3)], glowMat(CAT.ambar), { tone: 4 }, true);
    } else {
      c.ellipse([16, 27.5], 7, 1.6, stone('#2a2a30'));
      c.dot([14, 27], glowMat('#7a3a1a'), { tone: 2 }, true);
    }
    frames.push(c.render({ glowK: lit ? [0.85, 1, 0.9, 1, 0.8, 0.95][f] : 0.2, shadow: [16, 45, 9, 1.6] }));
  }
  return {
    name: lit ? 'brasero_cobre' : 'brasero_apagado', w: 32, h: 48, anchor: [16, 45], solid: [-9, -5, 18, 5],
    anims: { idle: { frames, fps: lit ? 8 : 1, loop: true } },
    ...(lit ? { light: { color: CAT.ambar, radius: 200, flicker: true, dy: 24 } } : {}),
  };
}

/** El pedestal de la misión: tres huecos para las brasas (0 a 3 encendidas). */
export function emberPedestal(lit: 0 | 1 | 2 | 3): WorldObject {
  const c = canvas(48, 40, 1.5); // 32 x 26.7
  c.poly([[3, 25], [3, 18], [29, 18], [29, 25]], stone(CAT.piedraOscura));
  c.poly([[5, 18], [6, 10], [26, 10], [27, 18]], stone(CAT.piedra), { bias: 1 });
  c.poly([[4, 10], [4, 7.5], [28, 7.5], [28, 10]], stone(CAT.piedraClara), { bias: 1 });
  for (let i = 0; i < 3; i++) {
    const x = 9 + i * 7;
    c.ellipse([x, 8.6], 2.6, 1.3, stone('#1a1c24'));
    if (i < lit) {
      c.ellipse([x, 7], 2, 2.4, glowMat(CAT.ambar), { tone: 4 });
      c.dot([x, 6.4], glowMat('#ffe8a0'), { tone: 5 }, true);
    }
  }
  // tres marcas talladas en el frente: la misión se lee sin palabras
  for (let i = 0; i < 3; i++) c.ellipse([9 + i * 7, 14], 1.2, 1.6, i < lit ? glowMat(CAT.ambar) : stone('#2a3040'), { tone: i < lit ? 4 : 1 });
  return {
    name: `pedestal_brasas_${lit}`, w: 48, h: 40, anchor: [24, 37], solid: [-20, -8, 40, 8],
    anims: one(c.render({ glowK: 1, shadow: [16, 25, 14, 1.4] })),
    ...(lit ? { light: { color: CAT.ambar, radius: 50 + lit * 24, pulse: true, dy: 18 } } : {}),
  };
}

/** Raíces gruesas que respiran sobre el pie de un muro (capa suelo: no tapan a nadie). */
export function wallRoots(): WorldObject {
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const c = canvas(96, 64, 3); // 32 x 21.3
    const s = [0, 0.3, 0.5, 0.3][f];
    root(c, [4, 0], [2, 20], 2.4 + s, 2, 31);
    root(c, [12, 0], [16, 19], 2 + s, 3, 32, CAT.raizOscura);
    root(c, [22, 0], [28, 20], 2.6 + s, 2.5, 33);
    root(c, [16, 4], [9, 18], 1.2, 2, 34);
    c.dot([14, 12], glowMat(CAT.turquesa), { tone: 3 + (f % 2) }, true);
    frames.push(c.render({ glowK: 0.6 + f * 0.1 }));
  }
  return { name: 'raices_muro', w: 96, h: 64, anchor: [48, 60], solid: null, layer: 'suelo', anims: { idle: { frames, fps: 4, loop: true } } };
}

/** Escombros y raíces que cierran un paso (lo que todavía no se abre). */
export function rubble(): WorldObject {
  const c = canvas(64, 48, 2); // 32 x 24
  const r = seeded(41);
  for (let i = 0; i < 14; i++) {
    const x = 4 + r() * 24, y = 11 + r() * 10, s = 3.4 + r() * 3.6;
    c.ellipse([x, y], s, s * 0.75, stone(i % 3 ? CAT.piedra : CAT.piedraOscura), { bias: y < 16 ? 1 : 0 });
  }
  root(c, [3, 4], [12, 21], 2.6, 2, 42);
  root(c, [29, 3], [21, 22], 2.8, 2, 43, CAT.raizOscura);
  root(c, [16, 2], [15, 18], 2.2, 3, 44);
  return { name: 'escombros', w: 64, h: 48, anchor: [32, 44], solid: [-28, -14, 56, 14], anims: one(c.render({ shadow: [16, 22, 15, 1.6] })) };
}

/** Raíces gruesas que bajan del techo hasta el piso: muro vivo que no se cruza. */
export function rootCurtain(): WorldObject {
  const c = canvas(64, 96, 2); // 32 x 48
  // un manojo de raíces gruesas trenzadas, con nudos y brotes violetas (la corrupción)
  for (const [x0, x1, w, sd, col] of [[3, 2, 4.2, 51, CAT.raiz], [9, 11, 4.8, 52, CAT.raizOscura], [15, 14, 5.2, 53, CAT.raiz], [21, 23, 4.6, 54, CAT.raizOscura], [27, 29, 4, 55, CAT.raiz]] as [number, number, number, number, string][])
    root(c, [x0, 0], [x1, 46], w, 3.4, sd, col);
  for (const [a, b, sd] of [[[4, 14], [26, 22], 56], [[6, 30], [28, 36], 57], [[3, 40], [22, 44], 58]] as [P, P, number][]) root(c, a, b, 2.2, 2, sd, CAT.raizOscura);
  for (const [x, y] of [[8, 18], [20, 27], [13, 36], [25, 12]] as P[]) c.ellipse([x, y], 2.2, 1.6, wood(CAT.raiz), { bias: 1 });
  for (let i = 0; i < 5; i++) c.dot([6 + i * 5, 24 + (i % 2) * 10], glowMat(CAT.violeta), { tone: 3 }, true);
  return { name: 'raices_cortina', w: 64, h: 96, anchor: [32, 92], solid: [-30, -10, 60, 10], anims: one(c.render({ shadow: [16, 46, 15, 1.6] })) };
}

/** El haz de luz de afuera que entra por la escalera hundida: transparente, se apaga hacia abajo. */
export function lightShaft(): WorldObject {
  const W = 96, H = 160;
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const r = createRaster(W, H);
    for (let y = 0; y < H; y++) {
      const t = y / H;
      const half = 18 + t * 26;
      for (let x = 0; x < W; x++) {
        const dx = Math.abs(x - W / 2 - t * 10);
        if (dx > half) continue;
        const edge = 1 - dx / half;
        const a = Math.round(70 * edge * (1 - t * 0.85) * (0.9 + 0.1 * Math.sin(f * 1.6 + y * 0.08)));
        if (a <= 2) continue;
        // polvito que flota en el haz
        const mote = ((x * 7 + y * 13 + f * 29) % 97) === 0;
        const i = (y * W + x) * 4;
        r.data[i] = mote ? 255 : 255; r.data[i + 1] = mote ? 250 : 236; r.data[i + 2] = mote ? 220 : 196; r.data[i + 3] = mote ? Math.min(255, a * 3) : a;
      }
    }
    frames.push(r);
  }
  return { name: 'haz_luz', w: W, h: H, anchor: [48, 156], solid: null, layer: 'suelo', anims: { idle: { frames, fps: 3, loop: true } }, light: { color: '#ffe8c0', radius: 120, pulse: true, dy: 40 } };
}

export function catedralObjects(): WorldObject[] {
  return [
    rootColumn(false), rootColumn(true), brokenArch(), copperBrazier(true), copperBrazier(false),
    emberPedestal(0), emberPedestal(1), emberPedestal(2), emberPedestal(3), wallRoots(), rubble(), rootCurtain(), lightShaft(),
  ];
}
