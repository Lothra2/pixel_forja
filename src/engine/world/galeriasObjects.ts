import { createRaster, type Raster } from '../core/raster';
import { IconCanvas, ramp6, type MatDef, type P } from '../loot/canvas';
import { glowMat, metalMat } from '../loot/materials';
import { withShadow } from './premium/shadow';
import type { WorldObject } from './objects';
import type { Creature } from './atmosphere';

/**
 * Mundo 3: Las Galerías del Eco (encargo 3.2). Minas de cristal abandonadas debajo de la Catedral: piedra azul gris
 * fría, cristales cian, violeta y ámbar, madera vieja de mina. La luz es el progreso: los cristales se prenden al
 * pegarles y quedan prendidos.
 *
 * Misma luz que el resto del kit (arriba a la izquierda), rampas con cambio de tono y sombra horneada en lo que se
 * para en el piso.
 */

export const GAL = {
  piedra: ['#0b0f17', '#151b26', '#202836', '#2c3646', '#3a4658', '#4a586c', '#5a6a7e'],
  madera: ['#2a1d14', '#3a2a1c', '#4c3824', '#5e4630', '#7a5a3c'],
  cian: '#5ae8ff',
  violeta: '#b07aff',
  ambar: '#ffb35a',
};
/** forma y color de cada cristal chico: 0 cian, 1 violeta, 2 ámbar */
export const CRISTAL_COLOR = [GAL.cian, GAL.violeta, GAL.ambar];

const stone = (hex: string): MatDef => ({ hex, kind: 'stone' });
const wood = (hex: string): MatDef => ({ hex, kind: 'wood' });
const one = (fr: Raster) => ({ idle: { frames: [fr], fps: 1, loop: true } });
type Anim = { frames: Raster[]; fps: number; loop: boolean };

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function put(r: Raster, x: number, y: number, c: number[] | string, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const k = (y * r.w + x) * 4, v = typeof c === 'string' ? rgb(c) : c;
  if (a >= 255 || !r.data[k + 3]) { r.data[k] = v[0]; r.data[k + 1] = v[1]; r.data[k + 2] = v[2]; r.data[k + 3] = Math.max(a, r.data[k + 3]); return; }
  const t = a / 255; for (let i = 0; i < 3; i++) r.data[k + i] = r.data[k + i] * (1 - t) + v[i] * t;
}
/** brillo aditivo alrededor de un punto (para lo prendido) */
function glow(r: Raster, cx: number, cy: number, rad: number, c: string, k: number) {
  const v = rgb(c);
  for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
    if (x < 0 || y < 0 || x >= r.w || y >= r.h) continue;
    const d = Math.hypot(x - cx, y - cy) / rad;
    if (d >= 1) continue;
    const a = Math.round((1 - d) ** 2 * 90 * k), i = (y * r.w + x) * 4;
    if (!r.data[i + 3]) { r.data[i] = v[0]; r.data[i + 1] = v[1]; r.data[i + 2] = v[2]; r.data[i + 3] = a; }
  }
}

// ---------------------------------------------------------------- cristales

/** Las puntas de cada forma: [x de la base, ancho, alto, inclinación] en un lienzo de 32 x 48. */
const SHAPES: [number, number, number, number][][] = [
  [[16, 7, 30, -2], [9, 5, 18, -6], [23, 5, 20, 5], [13, 3, 10, -9]],
  [[14, 6, 26, 3], [21, 6, 32, -3], [8, 4, 14, -8], [26, 3, 11, 8]],
  [[17, 8, 22, 0], [10, 5, 28, -5], [24, 4, 16, 6], [19, 3, 12, -2]],
];

function crystalFrame(v: number, color: string, lit: number, f: number): Raster {
  const c = new IconCanvas(32, 32, 48);
  // la roca de donde salen
  c.ellipse([16, 43], 12, 4, stone(GAL.piedra[3]));
  c.ellipse([13, 41.5], 7, 2.4, stone(GAL.piedra[4]), { bias: 1 });
  const base = lit > 0 ? color : ramp6(color, 'stone')[1];
  const mat: MatDef = lit > 0 ? glowMat(base) : { hex: base, kind: 'crystal' };
  for (const [x, w, h, lean] of SHAPES[v]) {
    const top: P = [x + lean * 0.5, 43 - h], tip: P = [x + lean, 43 - h - w * 0.8];
    c.poly([[x - w / 2, 43], [top[0] - w / 2, top[1]], tip, [top[0] + w / 2, top[1]], [x + w / 2, 43]], mat);
    // la cara con luz (a la izquierda) y un brillo duro
    c.px1([x - w / 2 + 1, 42], [top[0] - w / 2 + 1, top[1] + 1], lit > 0 ? glowMat('#ffffff') : { hex: ramp6(color, 'stone')[3], kind: 'crystal' }, { tone: 4 }, true);
  }
  const r = c.render({ glowK: lit });
  if (lit > 0) {
    glow(r, 16, 26, 15, color, lit * (0.8 + 0.2 * Math.sin((f / 6) * Math.PI * 2)));
    // destellos que suben
    for (let k = 0; k < 2; k++) { const y = 30 - ((f * 4 + k * 13) % 26); put(r, 9 + k * 13 + (f % 2), y, '#ffffff', 200); }
  }
  return r;
}

function crystals(): WorldObject[] {
  const out: WorldObject[] = [];
  for (const v of [0, 1, 2]) {
    const color = CRISTAL_COLOR[v];
    const base = { w: 32, h: 48, anchor: [16, 44] as [number, number], solid: [-7, -6, 14, 6] as [number, number, number, number] };
    out.push(withShadow({ name: `cristal_apagado_${v}`, ...base, anims: one(crystalFrame(v, color, 0, 0)) }, { length: 0.4, drop: 0.2 }));
    const prenderse: Anim = { frames: [0.1, 0.25, 0.45, 0.7, 1.2, 1.5, 1.2, 1].map((k, f) => crystalFrame(v, color, k, f)), fps: 14, loop: false };
    out.push(withShadow({
      name: `cristal_prendido_${v}`, ...base, light: { color, radius: 80, pulse: true, dy: 20 },
      anims: { idle: { frames: [0, 1, 2, 3, 4, 5].map((f) => crystalFrame(v, color, 1, f)), fps: 6, loop: true }, prenderse },
    }, { length: 0.4, drop: 0.2 }));
    if (v === 0) out.push(withShadow({ name: 'cristal_prenderse', ...base, light: { color, radius: 80, pulse: true, dy: 20 }, anims: { idle: prenderse } }, { length: 0.4, drop: 0.2 }));
  }
  return out;
}

/** Los cuatro cristales grandes de la arena de la reina (64 x 112, luz de 180). */
function bigCrystal(lit: boolean): WorldObject {
  const frame = (f: number) => {
    const c = new IconCanvas(64, 64, 112);
    c.ellipse([32, 104], 26, 7, stone(GAL.piedra[3]));
    c.ellipse([26, 101], 15, 4, stone(GAL.piedra[4]), { bias: 1 });
    const col = lit ? GAL.cian : ramp6(GAL.cian, 'stone')[1];
    const mat: MatDef = lit ? glowMat(col) : { hex: col, kind: 'crystal' };
    for (const [x, w, h, lean] of [[32, 16, 84, -2], [19, 10, 52, -9], [45, 10, 60, 8], [27, 6, 30, -14], [40, 6, 34, 12]] as [number, number, number, number][]) {
      const top: P = [x + lean * 0.5, 104 - h], tip: P = [x + lean, 104 - h - w];
      c.poly([[x - w / 2, 104], [top[0] - w / 2, top[1]], tip, [top[0] + w / 2, top[1]], [x + w / 2, 104]], mat);
      c.px1([x - w / 2 + 2, 102], [top[0] - w / 2 + 2, top[1] + 2], lit ? glowMat('#ffffff') : { hex: ramp6(GAL.cian, 'stone')[3], kind: 'crystal' }, { tone: 4 }, true);
    }
    const r = c.render({ glowK: lit ? 1 : 0 });
    if (lit) glow(r, 32, 56, 30, GAL.cian, 0.8 + 0.2 * Math.sin((f / 6) * Math.PI * 2));
    return r;
  };
  const o: WorldObject = { name: lit ? 'cristal_grande_prendido' : 'cristal_grande_apagado', w: 64, h: 112, anchor: [32, 106], solid: [-15, -10, 30, 10], anims: lit ? { idle: { frames: [0, 1, 2, 3, 4, 5].map(frame), fps: 6, loop: true } } : one(frame(0)), ...(lit ? { light: { color: GAL.cian, radius: 180, pulse: true, dy: 50 } } : {}) };
  return withShadow(o);
}

// ---------------------------------------------------------------- la mina

/** Farol de minero en su poste (32 x 64): la fogata del Mundo 3. Luz ámbar de 200. */
function minerLantern(): WorldObject {
  const frame = (f: number, lit: boolean) => {
    const c = new IconCanvas(32, 32, 64);
    c.line([16, 61], [16, 14], 1.8, wood(GAL.madera[3]));
    c.line([16, 14], [24, 14], 1.4, wood(GAL.madera[3]));
    c.ellipse([16, 61], 6, 2, stone(GAL.piedra[4]));
    c.line([24, 14], [24, 19], 0.6, metalMat('#5a5a66'));
    c.poly([[19, 20], [29, 20], [28, 33], [20, 33]], metalMat('#4a4e5a'));
    c.poly([[21, 22], [27, 22], [26.5, 31], [21.5, 31]], lit ? glowMat(['#ffcf7a', '#ffb35a', '#ffd88a', '#ffbf6a', '#ffcf7a', '#ffa84a'][f]) : { hex: '#3a3020', kind: 'glass' }, { tone: lit ? 4 : 2 });
    c.poly([[18, 20], [30, 20], [24, 16]], metalMat('#5a5e6a'), { bias: 1 });
    const r = c.render({ glowK: lit ? 1 : 0 });
    if (lit) glow(r, 24, 27, 12, GAL.ambar, [1, 0.85, 1.05, 0.9, 1, 0.8][f]);
    return r;
  };
  return withShadow({
    name: 'farol_minero', w: 32, h: 64, anchor: [16, 60], solid: [-6, -6, 12, 6], light: { color: GAL.ambar, radius: 200, flicker: true, dy: 36 },
    anims: { idle: { frames: [0, 1, 2, 3, 4, 5].map((f) => frame(f, true)), fps: 8, loop: true }, apagada: { frames: [frame(0, false)], fps: 1, loop: true }, prender: { frames: [0, 1, 2, 3, 4, 5].map((f) => (f < 2 ? frame(0, false) : frame(f, true))), fps: 8, loop: false } },
  });
}

/** Rieles (32 x 32, capa suelo): durmientes de madera y dos vías de hierro con brillo duro. */
function rails(): WorldObject[] {
  const W = GAL.madera, IRON = rgb('#4a4e58'), IRONL = rgb('#8a8e98');
  const make = (name: string, path: (t: number) => [number, number], dir: (t: number) => [number, number]) => {
    const r = createRaster(32, 32);
    // durmientes
    for (let t = 0.1; t < 1; t += 0.22) {
      const [x, y] = path(t), [dx, dy] = dir(t), nx = -dy, ny = dx;
      for (let s = -11; s <= 11; s++) for (let w = -1.5; w <= 1.5; w += 0.5) put(r, x + nx * s + dx * w, y + ny * s + dy * w, w < -0.5 ? W[4] : w > 0.5 ? W[1] : W[3]);
    }
    // vías
    for (let t = 0; t <= 1; t += 0.01) {
      const [x, y] = path(t), [dx, dy] = dir(t), nx = -dy, ny = dx;
      for (const s of [-7, 7]) { put(r, x + nx * s, y + ny * s, IRONL); put(r, x + nx * s + 0.6, y + ny * s + 0.6, IRON); }
    }
    return { name, w: 32, h: 32, anchor: [16, 16] as [number, number], solid: null, layer: 'suelo' as const, anims: one(r) };
  };
  const arc = (cx: number, cy: number, a0: number, a1: number) => [(t: number) => [cx + Math.cos(a0 + (a1 - a0) * t) * 16, cy + Math.sin(a0 + (a1 - a0) * t) * 16] as [number, number], (t: number) => { const a = a0 + (a1 - a0) * t, s = Math.sign(a1 - a0); return [-Math.sin(a) * s, Math.cos(a) * s] as [number, number]; }] as const;
  return [
    make('rieles_h', (t) => [t * 32, 16], () => [1, 0]),
    make('rieles_v', (t) => [16, t * 32], () => [0, 1]),
    make('rieles_curva_ne', ...arc(32, 0, Math.PI, Math.PI / 2)), // del oeste al norte... de la izquierda a arriba
    make('rieles_curva_no', ...arc(0, 0, 0, Math.PI / 2)),
    make('rieles_curva_se', ...arc(32, 32, Math.PI, Math.PI * 1.5)),
    make('rieles_curva_so', ...arc(0, 32, 0, -Math.PI / 2)),
  ];
}

/** Carrito de mina (48 x 48): `quieto` y `rodar` (4 cuadros a 10 fps, las ruedas giran). */
function mineCart(): WorldObject {
  const frame = (f: number) => {
    const c = new IconCanvas(48, 48, 48);
    c.poly([[6, 18], [42, 18], [38, 38], [10, 38]], metalMat('#5a4a3a'));
    c.poly([[6, 18], [42, 18], [41, 22], [7, 22]], metalMat('#7a6a54'), { bias: 1 });
    c.poly([[9, 19], [39, 19], [37, 23], [11, 23]], stone(GAL.piedra[2]));
    for (const [x, y] of [[14, 15], [22, 13], [30, 15], [19, 17]] as P[]) c.ellipse([x, y], 3.4, 2.4, stone(GAL.piedra[4]), { bias: 1 });
    c.dot([24, 14], glowMat(GAL.cian), { tone: 4 }, true);
    for (const x of [13, 35]) {
      c.ellipse([x, 40], 4.6, 4.6, metalMat('#2a2a30'));
      const a = (f / 4) * Math.PI;
      c.line([x - Math.cos(a) * 3.6, 40 - Math.sin(a) * 3.6], [x + Math.cos(a) * 3.6, 40 + Math.sin(a) * 3.6], 0.8, metalMat('#6a6a74'));
    }
    return c.render();
  };
  return withShadow({ name: 'carrito_mina', w: 48, h: 48, anchor: [24, 44], solid: [-16, -10, 32, 10], anims: { idle: { frames: [frame(0)], fps: 1, loop: true }, quieto: { frames: [frame(0)], fps: 1, loop: true }, rodar: { frames: [0, 1, 2, 3].map(frame), fps: 10, loop: true } } }, { length: 0.4, drop: 0.2 });
}

/** Marco de madera de la galería (96 x 96): dos patas sólidas y el travesaño por arriba (se pasa por debajo). */
function mineBeam(): WorldObject {
  const c = new IconCanvas(96, 96, 96);
  for (const x of [8, 82]) {
    c.poly([[x, 92], [x, 14], [x + 7, 14], [x + 7, 92]], wood(GAL.madera[3]));
    c.px1([x + 1, 16], [x + 1, 90], wood(GAL.madera[4]), { tone: 4 }, true);
    c.px1([x + 5, 16], [x + 5, 90], wood(GAL.madera[1]), { tone: 1 }, true);
  }
  c.poly([[3, 20], [3, 9], [93, 9], [93, 20]], wood(GAL.madera[3]), { bias: 1 });
  c.px1([4, 10], [92, 10], wood(GAL.madera[4]), { tone: 4 }, true);
  // cuñas y clavos
  for (const x of [15, 76]) c.poly([[x, 20], [x + 5, 20], [x + (x < 50 ? -3 : 8), 28]], wood(GAL.madera[2]));
  for (const x of [11, 85]) c.dot([x, 14], metalMat('#8a8a94'), { tone: 4 }, true);
  return withShadow({ name: 'viga_mina', w: 96, h: 96, anchor: [48, 92], solid: null, solids: [[-44, -8, 12, 8], [32, -8, 12, 8]], anims: one(c.render()) });
}

/** Puente colgante (32 x 32, capa suelo, se camina): tablas con sogas, se mece (2 cuadros a 2 fps). */
function ropeBridge(): WorldObject[] {
  const make = (vertical: boolean) => {
    const frames = [0, 1].map((f) => {
      const r = createRaster(32, 32);
      for (let i = 0; i < 4; i++) {
        const off = i * 8 + (f ? 1 : 0) * (i % 2);
        for (let a = 4; a < 28; a++) for (let b = 0; b < 6; b++) {
          const x = vertical ? a : off + b, y = vertical ? off + b : a;
          put(r, x, y, b === 0 ? GAL.madera[4] : b === 5 ? GAL.madera[0] : (a + b) % 7 === 0 ? GAL.madera[2] : GAL.madera[3]);
        }
      }
      for (const s of [3, 28]) for (let t = 0; t < 32; t++) {
        const sag = Math.round(Math.sin((t / 32) * Math.PI) * (f ? 1 : 0));
        put(r, vertical ? s : t, vertical ? t : s + sag, '#a8946a');
      }
      return r;
    });
    return { name: vertical ? 'puente_colgante_v' : 'puente_colgante_h', w: 32, h: 32, anchor: [16, 16] as [number, number], solid: null, layer: 'suelo' as const, anims: { idle: { frames, fps: 2, loop: true } } };
  };
  return [make(false), make(true)];
}

/** Pistas de que los mineros huyeron (32 x 32, capa suelo). */
function clues(): WorldObject[] {
  const pick = new IconCanvas(32, 32, 32);
  pick.line([6, 26], [24, 10], 1.4, wood(GAL.madera[3]));
  pick.poly([[17, 6], [31, 14], [28, 16], [20, 11], [14, 10]], metalMat('#6a6e78'));
  const helmet = new IconCanvas(32, 32, 32);
  helmet.ellipse([16, 20], 11, 7, metalMat('#c8a040'));
  helmet.ellipse([16, 24], 13, 3, metalMat('#a88430'));
  helmet.ellipse([10, 17], 3, 2.4, { hex: '#e8e0c0', kind: 'glass' }, { bias: 1 });
  const lamp = new IconCanvas(32, 32, 32);
  lamp.poly([[9, 26], [11, 13], [21, 13], [23, 26]], metalMat('#4a4e5a'));
  lamp.poly([[12, 24], [13, 15], [19, 15], [20, 24]], { hex: '#2a2a24', kind: 'glass' });
  lamp.line([12, 17], [20, 23], 0.6, { hex: '#d8d8c8', kind: 'glass' });
  lamp.line([11, 13], [16, 8], 0.6, metalMat('#6a6a74')); lamp.line([21, 13], [16, 8], 0.6, metalMat('#6a6a74'));
  for (const c of [pick, helmet, lamp]) c.ellipse([16, 28], 10, 2, stone('#06080c'));
  return [
    { name: 'pico_tirado', w: 32, h: 32, anchor: [16, 26], solid: null, layer: 'suelo', anims: one(pick.render()) },
    { name: 'casco_minero', w: 32, h: 32, anchor: [16, 26], solid: null, layer: 'suelo', anims: one(helmet.render()) },
    { name: 'linterna_rota', w: 32, h: 32, anchor: [16, 26], solid: null, layer: 'suelo', anims: one(lamp.render()) },
  ];
}

/** La carpa del campamento abandonado (96 x 80, sólida). */
function minerTent(): WorldObject {
  const c = new IconCanvas(96, 96, 80);
  c.poly([[8, 74], [48, 14], [88, 74]], { hex: '#7a6a4e', kind: 'cloth' });
  c.poly([[48, 14], [88, 74], [70, 74]], { hex: '#5e5038', kind: 'cloth' });
  c.poly([[36, 74], [48, 40], [60, 74]], { hex: '#120e0a', kind: 'cloth' });
  c.poly([[48, 40], [60, 74], [64, 74], [52, 44]], { hex: '#8e7e5e', kind: 'cloth' }, { bias: 1 });
  c.line([48, 14], [48, 8], 1.2, wood(GAL.madera[3]));
  for (const [x, y] of [[20, 50], [72, 56], [30, 62]] as P[]) c.ellipse([x, y], 4, 3, { hex: '#5a4a36', kind: 'cloth' }); // parches
  c.line([8, 74], [2, 78], 0.6, { hex: '#a8946a', kind: 'cloth' }); c.line([88, 74], [94, 78], 0.6, { hex: '#a8946a', kind: 'cloth' });
  return withShadow({ name: 'carpa_minero', w: 96, h: 80, anchor: [48, 76], solid: [-40, -12, 80, 12], anims: one(c.render()) });
}

/** Estalactitas desde el techo (128 x 96, capa frente). */
function stalactites(v: number): WorldObject {
  const r = createRaster(128, 96), P = GAL.piedra;
  for (let k = 0; k < 9; k++) {
    const x0 = 6 + k * 14 + hash(k, v, 31) * 8, w = 5 + hash(k, v, 32) * 8, h = 20 + hash(v, k, 33) * 70;
    for (let y = 0; y < h; y++) {
      const hw = w * (1 - y / h);
      for (let x = -hw; x <= hw; x++) put(r, x0 + x, y, P[x < -hw + 1.5 ? 4 : x > hw - 1.5 ? 1 : y > h - 6 ? 3 : 2]);
    }
    if (hash(k, v, 34) > 0.6) put(r, x0, h, '#8ad8e8', 220); // gota
  }
  for (let x = 0; x < 128; x++) for (let y = 0; y < 6 + hash(x >> 3, v, 35) * 4; y++) put(r, x, y, P[1]);
  return { name: `estalactitas_frente_${v}`, w: 128, h: 96, anchor: [64, 0], solid: null, layer: 'frente', anims: one(r) };
}

/**
 * El tercer pedazo del mural (128 x 96, en la pared): dibujos sin texto. Mineros con faroles huyendo de dos ojos rojos
 * que se llevan la luz. Pintura vieja sobre piedra, con partes descascaradas.
 */
function mural(): WorldObject {
  const r = createRaster(128, 96), P = GAL.piedra;
  for (let y = 0; y < 96; y++) for (let x = 0; x < 128; x++) {
    const edge = x < 3 || y < 3 || x > 124 || y > 92;
    put(r, x, y, edge ? P[1] : P[hash(x >> 2, y >> 2, 41) > 0.8 ? 4 : 3]);
  }
  const ink = '#d8c8a0', red = '#e04a3a', amber = GAL.ambar;
  const miner = (x: number, y: number, s: number) => {
    // cabeza, cuerpo inclinado corriendo, piernas abiertas y el farol en la mano de atrás
    for (let a = 0; a < 360; a += 30) put(r, x + Math.cos((a * Math.PI) / 180) * 2, y + Math.sin((a * Math.PI) / 180) * 2, ink);
    for (let t = 0; t < 10; t++) put(r, x + 1 + t * 0.3 * s, y + 3 + t, ink);
    for (let t = 0; t < 7; t++) { put(r, x + 4 * s + t * 0.6 * s, y + 13 + t, ink); put(r, x + 4 * s - t * 0.5 * s, y + 13 + t, ink); }
    for (let t = 0; t < 6; t++) put(r, x + 2 - t * 0.8 * s, y + 6 + t * 0.4, ink);
    put(r, x - 4 * s, y + 9, amber); put(r, x - 4 * s, y + 10, amber); put(r, x - 5 * s, y + 9, amber);
  };
  miner(30, 46, 1); miner(52, 42, 1); miner(18, 56, 1);
  // los ojos rojos, grandes, a la derecha; las luces que se van hacia ellos
  for (const ex of [94, 110]) for (let y = -4; y <= 4; y++) for (let x = -6; x <= 6; x++) if ((x / 6) ** 2 + (y / 4) ** 2 <= 1) put(r, ex + x, 34 + y, Math.abs(x) < 2 && Math.abs(y) < 2 ? '#ffe0c0' : red);
  for (let k = 0; k < 6; k++) { const t = k / 5; put(r, 40 + t * 50, 52 - t * 16 + Math.sin(k) * 2, amber, 220); }
  // descascarado: manchas donde se ve la piedra de abajo
  for (let i = 0; i < 14; i++) { const cx = 8 + hash(i, 1, 43) * 112, cy = 8 + hash(i, 2, 43) * 80, s = 2 + hash(i, 3, 43) * 4; for (let y = -s; y <= s; y++) for (let x = -s; x <= s; x++) if (x * x + y * y <= s * s && hash(x, y + i, 44) > 0.3) put(r, cx + x, cy + y, P[2]); }
  return { name: 'mural_3', w: 128, h: 96, anchor: [64, 95], solid: null, anims: one(r) };
}

/**
 * La figura que mira de lejos (48 x 64, no sólida): silueta oscura con ojos rojos. No da miedo, da curiosidad: es
 * chica, quieta, con la cabeza un poco ladeada. Capucha redonda, hombros caídos y un manto que se deshilacha abajo en
 * jirones que se mecen. `idle` (4 a 4 fps) e `irse` (8 a 10 fps): se deshace en humo de abajo hacia arriba.
 */
function eyesFigure(): WorldObject {
  const DARK = '#0e0b16', RIM = '#2a2240', EDGE = '#07060c';
  const shape = (y: number) => {
    // medio ancho de la silueta a la altura y (cabeza 10-24, hombros 26, manto que se abre hasta 58)
    if (y < 10) return -1;
    if (y < 24) { const t = (y - 17) / 7.5; return 7.5 * Math.sqrt(Math.max(0, 1 - t * t)) + (y > 20 ? 1 : 0); }
    if (y < 28) return 8 + (y - 24) * 0.9;
    return y >= 54 ? -1 : 11 + (y - 28) * 0.22; // hasta el ruedo
  };
  const body = (r: Raster, k: number, f: number) => {
    const lean = -1; // la cabeza ladeada, como quien mira con curiosidad
    for (let y = 10; y < 62; y++) {
      const w = shape(y);
      if (w < 0 && y < 54) continue;
      const cx = 24 + (y < 26 ? lean * (26 - y) * 0.12 : 0);
      if (y >= 54) {
        // jirones del ruedo: tiras que cuelgan y se mecen
        for (let j = 0; j < 6; j++) {
          const jx = cx - 11 + j * 4.4 + Math.sin(f * 1.6 + j) * (y - 54) * 0.25, len = 3 + hash(j, 1, 54) * 6;
          if (y - 54 < len && !(k > 0 && hash(j, y, 55 + f) < k * 1.4)) for (let dx = 0; dx < 2; dx++) put(r, jx + dx, y - k * 10, DARK, Math.round(220 * (1 - (y - 54) / (len + 2)) * (1 - k * 0.6)));
        }
        continue;
      }
      for (let x = -w; x <= w; x++) {
        const gone = k > 0 && hash(Math.round(x), y, 51 + f) < k * (0.4 + (62 - y) / 80);
        if (gone) continue;
        const X = cx + x + Math.sin(y * 0.2 + f) * (k * 4), Y = y - k * 10;
        // borde de luz violeta muy tenue arriba a la izquierda (la luz del kit), resto casi negro
        const c = x < -w + 1.2 && y < 40 ? RIM : x > w - 1.5 ? EDGE : DARK;
        put(r, X, Y, c, Math.round(240 * (1 - k * 0.6)));
      }
    }
    // el hueco de la capucha, donde brillan los ojos
    if (k < 0.6) for (let y = 15; y < 22; y++) for (let x = -5; x <= 5; x++) if ((x / 5.5) ** 2 + ((y - 18.5) / 3.6) ** 2 <= 1) put(r, 24 - 1 + x - (26 - y) * 0.12, y - k * 10, '#040308', Math.round(255 * (1 - k)));
    // humo que sube al irse
    if (k > 0) for (let i = 0; i < 22; i++) { const hx = 24 + (hash(i, f, 52) - 0.5) * 34, hy = 54 - hash(f, i, 53) * 56 * k; put(r, hx, hy, '#2a2438', 150); if (i % 3 === 0) put(r, hx + 1, hy, '#3a3250', 110); }
  };
  const eyes = (r: Raster, open: number, k: number) => {
    if (open <= 0 || k >= 0.7) return;
    const ey = 18 - k * 10;
    for (const ex of [20, 27]) {
      put(r, ex, ey, '#ff4a32'); put(r, ex + 1, ey, '#ff4a32');
      if (open > 0.5) { put(r, ex, ey + 1, '#c01a1a'); put(r, ex + 1, ey + 1, '#c01a1a'); put(r, ex, ey, '#ffd0b0'); }
    }
  };
  const idle = [1, 1, 0.4, 1].map((o, f) => { const r = createRaster(48, 64); body(r, 0, f); eyes(r, o, 0); glowEyes(r, o); return r; });
  const irse = Array.from({ length: 8 }, (_, f) => { const r = createRaster(48, 64); const k = (f + 1) / 8; body(r, k, f); eyes(r, 1, k); return r; });
  return { name: 'figura_ojos', w: 48, h: 64, anchor: [24, 60], solid: null, anims: { idle: { frames: idle, fps: 4, loop: true }, irse: { frames: irse, fps: 10, loop: false } }, light: { color: '#ff3a2a', radius: 36, pulse: true, dy: 42 } };
}
function glowEyes(r: Raster, o: number) { if (o > 0.5) for (const ex of [20.5, 27.5]) glow(r, ex, 18.5, 4, '#ff3a2a', 0.6); }

/** Lo único que se ve de la sombra fuera de la luz: dos ojos (16 x 8), parpadeo de 4 cuadros a 3 fps. */
export function shadowEyes(): Creature {
  const frame = (o: number) => {
    const r = createRaster(16, 8);
    for (const ex of [4, 11]) {
      if (o >= 1) { put(r, ex, 3, '#d8b0ff'); put(r, ex + 1, 3, '#b07aff'); put(r, ex, 4, '#8a4ac8'); put(r, ex + 1, 4, '#8a4ac8'); }
      else if (o > 0) { put(r, ex, 4, '#b07aff'); put(r, ex + 1, 4, '#b07aff'); }
    }
    return r;
  };
  return { name: 'sombra_ojos', w: 16, h: 8, anims: { parpadeo: { frames: [frame(1), frame(1), frame(0.5), frame(0)], fps: 3, loop: true } } };
}

// ---------------------------------------------------------------- utilería de la mina, calcomanías y fondo

/** Rocas sueltas de la galería (sólidas), tres formas. */
function mineRock(v: number): WorldObject {
  const sizes: [number, number][] = [[32, 32], [48, 40], [32, 32]];
  const [w, h] = sizes[v];
  const c = new IconCanvas(w, w, h);
  const P2 = GAL.piedra;
  if (v === 0) { c.poly([[5, 28], [7, 17], [14, 11], [23, 12], [28, 20], [27, 28]], stone(P2[4])); c.poly([[8, 18], [14, 12], [20, 13], [15, 18]], stone(P2[5]), { bias: 1 }); }
  else if (v === 1) {
    c.poly([[4, 36], [6, 22], [16, 12], [30, 10], [41, 18], [44, 30], [42, 36]], stone(P2[4]));
    c.poly([[10, 22], [17, 14], [28, 12], [22, 20]], stone(P2[5]), { bias: 1 });
    c.line([24, 22], [31, 31], 0.5, stone(P2[2])); // grieta
    c.poly([[34, 24], [38, 17], [40, 25]], { hex: GAL.violeta, kind: 'crystal' }); // un cristalito pegado
  } else { c.ellipse([12, 25], 8, 5, stone(P2[4])); c.ellipse([22, 26], 7, 4.5, stone(P2[3])); c.ellipse([16, 20], 6, 4.5, stone(P2[5]), { bias: 1 }); }
  const solid: [number, number, number, number] = v === 1 ? [-18, -8, 36, 8] : [-10, -6, 20, 6];
  return withShadow({ name: `roca_mina_${v}`, w, h, anchor: [Math.round(w / 2), h - 3], solid, anims: one(c.render()) }, { length: 0.4, drop: 0.2 });
}

/** Cajón de madera de la mina (sólido). */
function mineCrate(): WorldObject {
  const c = new IconCanvas(32, 32, 32);
  c.poly([[5, 29], [5, 11], [27, 11], [27, 29]], wood(GAL.madera[3]));
  c.poly([[5, 11], [9, 7], [31, 7], [27, 11]], wood(GAL.madera[4]), { bias: 1 });
  c.poly([[27, 11], [31, 7], [31, 25], [27, 29]], wood(GAL.madera[1]));
  for (const y of [16, 22]) c.px1([6, y], [26, y], wood(GAL.madera[1]), { tone: 1 }, true);
  c.line([6, 12], [26, 28], 0.7, wood(GAL.madera[2]));
  for (const [x, y] of [[7, 13], [25, 13], [7, 27], [25, 27]] as P[]) c.dot([x, y], metalMat('#7a7e88'), { tone: 4 }, true);
  return withShadow({ name: 'cajon_mina', w: 32, h: 32, anchor: [16, 29], solid: [-11, -6, 24, 6], anims: one(c.render()) }, { length: 0.4, drop: 0.2 });
}

/** Barril de la mina (sólido). */
function mineBarrel(): WorldObject {
  const c = new IconCanvas(32, 32, 32);
  c.poly([[8, 29], [7, 20], [8, 9], [24, 9], [25, 20], [24, 29]], wood(GAL.madera[3]));
  c.ellipse([16, 9], 8, 2.6, wood(GAL.madera[2]), { bias: 1 });
  for (const y of [12, 26]) c.line([7.5, y], [24.5, y], 0.8, metalMat('#4a4e58'));
  c.px1([10, 11], [10, 28], wood(GAL.madera[4]), { tone: 4 }, true);
  return withShadow({ name: 'barril_mina', w: 32, h: 32, anchor: [16, 29], solid: [-8, -6, 16, 6], anims: one(c.render()) }, { length: 0.4, drop: 0.2 });
}

/** La olla fría del campamento sobre su fogata apagada (sólida). */
function coldPot(): WorldObject {
  const c = new IconCanvas(32, 32, 32);
  // anillo de piedras de la fogata apagada, con tizones y ceniza
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; c.ellipse([16 + Math.cos(a) * 11, 25 + Math.sin(a) * 4.2], 2.8, 2.1, stone(GAL.piedra[k % 2 ? 4 : 5])); }
  c.ellipse([16, 25], 8, 3, stone('#1a1714'));
  c.line([10, 26], [21, 24], 0.9, wood('#2a2018'));
  // la olla, ancha y baja, con la tapa corrida y el asa
  c.poly([[8, 15], [24, 15], [23, 23], [9, 23]], metalMat('#3a3e48'));
  c.ellipse([16, 23], 7, 1.6, metalMat('#2a2e36'));
  c.ellipse([16, 15], 8, 2.2, metalMat('#5a5e68'), { bias: 1 });
  c.ellipse([18, 14], 5, 1.4, metalMat('#6a6e78'), { bias: 1 });
  c.ring([16, 15], 7, 6, 0.5, metalMat('#6a6e78'), {}, 200, 340);
  return withShadow({ name: 'olla_fria', w: 32, h: 32, anchor: [16, 29], solid: [-9, -5, 18, 5], anims: one(c.render()) }, { length: 0.35, drop: 0.2 });
}

/** Poste del puente colgante, donde se atan las sogas (no sólido: está al costado del tablero). */
function bridgePost(): WorldObject {
  const c = new IconCanvas(16, 16, 40);
  c.poly([[5, 38], [5, 6], [11, 6], [11, 38]], wood(GAL.madera[3]));
  c.px1([6, 7], [6, 37], wood(GAL.madera[4]), { tone: 4 }, true);
  c.ellipse([8, 6], 3, 1.2, wood(GAL.madera[2]), { bias: 1 });
  for (const y of [12, 15]) c.line([4, y], [12, y + 1], 0.7, { hex: '#a8946a', kind: 'cloth' });
  return withShadow({ name: 'poste_puente', w: 16, h: 40, anchor: [8, 37], solid: null, anims: one(c.render()) }, { length: 0.45, drop: 0.2 });
}

/** Calcomanías del piso de la mina (capa suelo): grava, astillas de madera y esquirlas de cristal. */
function mineDecals(): WorldObject[] {
  const out: WorldObject[] = [];
  const P2 = GAL.piedra;
  for (const v of [0, 1, 2]) {
    const r = createRaster(32, 24);
    const n = 26 + v * 8;
    for (let i = 0; i < n; i++) {
      const a = hash(i, v, 61) * Math.PI * 2, d = Math.sqrt(hash(v, i, 62)) * (9 + v * 2);
      const x = 16 + Math.cos(a) * d * 1.3, y = 12 + Math.sin(a) * d * 0.7, big = hash(i, i, 63 + v) > 0.75;
      put(r, x, y, P2[big ? 5 : 4]); if (big) { put(r, x + 1, y, P2[4]); put(r, x, y + 1, P2[2]); }
      else put(r, x, y + 1, P2[1], 180);
    }
    out.push({ name: `grava_mina_${v}`, w: 32, h: 24, anchor: [16, 12], solid: null, layer: 'suelo', anims: one(r) });
  }
  for (const v of [0, 1]) {
    const r = createRaster(32, 16);
    for (let i = 0; i < 5 + v * 2; i++) {
      const x0 = 4 + hash(i, v, 64) * 22, y0 = 4 + hash(v, i, 65) * 8, a = (hash(i, 9, 66 + v) - 0.5) * 1.6, len = 3 + hash(i, v, 67) * 6;
      for (let t = 0; t < len; t++) { put(r, x0 + Math.cos(a) * t, y0 + Math.sin(a) * t, GAL.madera[t < 1 ? 4 : 3]); put(r, x0 + Math.cos(a) * t, y0 + Math.sin(a) * t + 1, GAL.madera[1], 200); }
    }
    out.push({ name: `astillas_${v}`, w: 32, h: 16, anchor: [16, 8], solid: null, layer: 'suelo', anims: one(r) });
  }
  for (const v of [0, 1, 2]) {
    const col = CRISTAL_COLOR[v], R6 = ramp6(col, 'stone');
    const r = createRaster(16, 16);
    for (let i = 0; i < 4; i++) {
      const x = 3 + hash(i, v, 68) * 10, y = 5 + hash(v, i, 69) * 8, h = 2 + Math.floor(hash(i, v, 70) * 3);
      for (let t = 0; t < h; t++) { put(r, x, y - t, R6[t === h - 1 ? 4 : 2]); put(r, x + 1, y - t, R6[1]); }
      put(r, x, y + 1, P2[0], 160);
    }
    put(r, 6, 4, '#ffffff', 170);
    out.push({ name: `esquirlas_cristal_${v}`, w: 16, h: 16, anchor: [8, 8], solid: null, layer: 'suelo', anims: one(r) });
  }
  return out;
}

/** ruido de valor que pega por los 4 lados de un cuadrado de S (para los fondos) */
function tnoise(x: number, y: number, cell: number, S: number, seed: number): number {
  const n = Math.round(S / cell), gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = gx - x0, fy = gy - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const v = (i: number, j: number) => hash(((i % n) + n) % n, ((j % n) + n) % n, seed);
  const a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/**
 * El fondo de abismo en tonos de mina (512 x 512, pega por los 4 lados, capa fondo), para el Puente Colgante. El 0 son
 * vetas de roca lejana con algún cristal que brilla apenas, el 1 bruma azul y el 2 las brasas frías (motas azules).
 */
function mineAbyss(v: 0 | 1 | 2): WorldObject {
  const S = 512, r = createRaster(S, S);
  if (v === 0) {
    const FAR = ['#06080e', '#0a0e18', '#0e1420', '#141b2a', '#1a2234'];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      // estratos inclinados de roca, quebrados por ruido grueso: paredes que bajan lejos
      const n = tnoise(x, y, 64, S, 71) * 0.6 + tnoise(x, y, 16, S, 72) * 0.4;
      const strata = Math.sin(((y + x * 0.5 + n * 64) / S) * Math.PI * 2 * 6); // 3 vueltas en x y 6 en y: pega
      put(r, x, y, FAR[strata > 0.75 ? 2 : strata > 0.3 && n > 0.55 ? 1 : 0]);
      if (strata > 0.92 && n > 0.6) put(r, x, y, FAR[3]);
    }
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(hash(i, 1, 73) * S), y = Math.floor(hash(i, 2, 73) * S), col = CRISTAL_COLOR[i % 3];
      const c = rgb(col).map((q) => Math.round(q * 0.35 + 10 * 0.65));
      put(r, x, y, c); put(r, x, (y + 1) % S, c.map((q) => Math.round(q * 0.7)));
    }
  } else if (v === 1) {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const n = tnoise(x, y, 128, S, 74) * 0.55 + tnoise(x, y, 48, S, 75) * 0.3 + tnoise(x, y, 16, S, 76) * 0.15;
      const a = Math.round(Math.max(0, n - 0.44) * 240);
      if (a > 4) put(r, x, y, '#2a3a5a', Math.min(100, a));
    }
  } else {
    for (let i = 0; i < 220; i++) {
      const x = Math.floor(hash(i, 1, 77) * S), y = Math.floor(hash(i, 2, 77) * S), big = hash(i, 3, 77) > 0.8;
      put(r, x, y, '#8ac8ff', 220);
      if (big) { put(r, (x + 1) % S, y, '#4a7ad8', 150); put(r, x, (y + 1) % S, '#4a7ad8', 150); }
    }
  }
  return { name: `fondo_mina_${v}`, w: S, h: S, anchor: [0, 0], solid: null, layer: 'fondo', anims: one(r) };
}

/** Paralaje de cada fondo de la mina (el 0 es el más lejano). */
export const MINA_PARALAJE = [0.6, 0.75, 0.9];

/**
 * Cristales enormes que cuelgan del techo de la Sala del Eco (128 x 112, capa frente): racimos violeta y cian que
 * brillan apenas (4 cuadros a 4 fps).
 */
function ceilingCrystals(v: number): WorldObject {
  const frames: Raster[] = [];
  const spikes = Array.from({ length: 6 }, (_, i) => ({ x: 10 + i * 20 + hash(i, v, 81) * 10, w: 5 + hash(i, v, 82) * 7, h: 30 + hash(v, i, 83) * 70, col: CRISTAL_COLOR[(i + v) % 2 ? 1 : 0] }));
  for (let f = 0; f < 4; f++) {
    const r = createRaster(128, 112), P2 = GAL.piedra;
    for (let x = 0; x < 128; x++) for (let y = 0; y < 8 + tnoise(x, 0, 16, 128, 84 + v) * 8; y++) put(r, x, y, P2[y < 3 ? 0 : 1]);
    for (const sp of spikes) {
      // en primer plano y a contraluz: el cuerpo oscuro y facetado, solo el filo y la punta toman el color
      const dim = (q: number) => rgb(sp.col).map((c, i) => Math.round(c * q + rgb(P2[1])[i] * (1 - q)));
      const L = dim(0.42), M = dim(0.28), D = dim(0.16), RIDGE = dim(0.62);
      for (let y = 4; y < sp.h; y++) {
        const hw = sp.w * (1 - (y - 4) / (sp.h - 4)) ** 0.8;
        for (let dx = -hw; dx <= hw; dx++) {
          const c = dx < -hw + 1 ? RIDGE : Math.abs(dx) < 0.6 ? RIDGE : dx < 0 ? L : dx > hw - 1 ? D : M;
          put(r, sp.x + dx, y, c);
        }
      }
      // la punta brilla y late
      const k = 0.6 + 0.4 * Math.sin((f / 4) * Math.PI * 2 + sp.x);
      glow(r, sp.x, sp.h - 6, 9, sp.col, k * 0.8);
      put(r, sp.x, sp.h - 2, sp.col, Math.round(170 + 60 * k));
      put(r, sp.x, sp.h - 1, '#ffffff', Math.round(120 + 80 * k));
    }
    frames.push(r);
  }
  return { name: `cristales_techo_frente_${v}`, w: 128, h: 112, anchor: [64, 0], solid: null, layer: 'frente', anims: { idle: { frames, fps: 4, loop: true } } };
}

// ---------------------------------------------------------------- los avisos de la Polilla Reina

/**
 * `aviso_polvo` (96 x 96, 8 cuadros, capa suelo): la mancha donde va a caer el polvo. Un anillo violeta que se cierra
 * y una mancha gris que se llena, con motas que ya empiezan a caer. Se lee bien sobre la piedra oscura.
 */
export function dustWarning(): Raster[] {
  const out: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const r = createRaster(96, 96), t = f / 7;
    const R = 44 - t * 6;
    for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
      const dx = x - 47.5, dy = (y - 47.5) * 1.6, d = Math.hypot(dx, dy);
      if (d > R + 1.5) continue;
      // el anillo: dos pixeles, late
      if (d > R - 1.5) { put(r, x, y, f % 2 ? '#d8b0ff' : GAL.violeta, 230); continue; }
      // la mancha se llena de afuera hacia adentro
      const fill = d > R * (1 - t) ? 1 : 0;
      if (fill && hash(x >> 1, y >> 1, 91) > 0.35) put(r, x, y, '#4a4458', Math.round(90 + t * 70));
    }
    for (let i = 0; i < 6 + f * 3; i++) { const a = hash(i, f, 92) * Math.PI * 2, d = Math.sqrt(hash(f, i, 93)) * R * 0.9; put(r, 47.5 + Math.cos(a) * d, 47.5 + (Math.sin(a) * d) / 1.6, '#b0a8c0', 200); }
    out.push(r);
  }
  return out;
}

/**
 * `nube_polvo` (96 x 96, 10 cuadros a 12 fps): el polvo que cae y apaga la luz donde cae. Una cortina de motas grises
 * que baja, golpea el piso, se abre en una nube y se asienta.
 */
export function dustCloud(): Raster[] {
  const out: Raster[] = [];
  for (let f = 0; f < 10; f++) {
    const r = createRaster(96, 96), t = f / 9;
    // la cortina que cae (primeros cuadros)
    if (f < 5) for (let i = 0; i < 120; i++) {
      const x = 14 + hash(i, 1, 94) * 68, y = (hash(i, 2, 94) * 60 + f * 16) % 70;
      put(r, x, y, hash(i, 3, 94) > 0.7 ? '#d0c8d8' : '#8a8494', 220);
    }
    // la nube en el piso: crece, se aclara y se asienta
    const k = Math.max(0, (f - 3) / 6);
    if (k > 0) for (let i = 0; i < 26; i++) {
      const a = hash(i, 4, 95) * Math.PI * 2, d = (0.3 + hash(i, 5, 95) * 0.7) * 38 * Math.min(1, k * 1.4);
      const cx = 48 + Math.cos(a) * d, cy = 70 + Math.sin(a) * d * 0.45 - k * 6 * hash(i, 6, 95), rad = 5 + hash(i, 7, 95) * 7 * (1 - k * 0.3);
      for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
        const q = Math.hypot(x - cx, (y - cy) * 1.2) / rad;
        if (q < 1 && hash(x, y, 96 + f) > 0.25) put(r, x, y, q < 0.5 ? '#9a94a6' : '#6a6476', Math.round((1 - t * 0.7) * (q < 0.5 ? 200 : 140)));
      }
    }
    out.push(r);
  }
  return out;
}

export function galeriasObjects(): WorldObject[] {
  return [
    ...crystals(), bigCrystal(false), bigCrystal(true), minerLantern(), ...rails(), mineCart(), mineBeam(), ...ropeBridge(),
    ...clues(), minerTent(), stalactites(0), stalactites(1), mural(), eyesFigure(),
    mineRock(0), mineRock(1), mineRock(2), mineCrate(), mineBarrel(), coldPot(), bridgePost(), ...mineDecals(),
    mineAbyss(0), mineAbyss(1), mineAbyss(2), ceilingCrystals(0), ceilingCrystals(1),
  ];
}
