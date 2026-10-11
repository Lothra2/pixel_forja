import { createRaster, type Raster } from '../core/raster';
import { IconCanvas, type MatDef, type P } from '../loot/canvas';
import { metalMat } from '../loot/materials';
import { withShadow } from './premium/shadow';
import type { WorldObject } from './objects';
import type { Creature } from './atmosphere';

/**
 * Un mundo que reacciona (encargo 2.9). Cada reacción es una animación más del objeto, con el mismo formato de
 * siempre: el juego la conecta. Se sacan del dibujo del objeto (la misma luz, los mismos colores):
 *
 * - `sacudir` (todos los arbustos): se sacude y suelta dos hojitas.
 * - `sin_moras` (arbustos de moras): el mismo arbusto sin las moras.
 * - `rebotar` (hongos y hongos gigantes): se aplasta y vuelve.
 * - `cerrar` y `abrir` (flores grandes).
 * - `mecer` (nenúfares y juncos).
 * - `salpicar` (charcos): onda y gotitas.
 * - `apagada` y `prender` (antorcha y farol; el candelabro de la Catedral ya las trae).
 * - `romper` (telarañas): se cortan y quedan colgando.
 *
 * Más los objetos nuevos (palanca, puerta de madera, reja de la Catedral, piedra que empuja Thor, campana chica) y las
 * criaturas chicas que huyen (rana, pez, ardilla).
 */

type Anim = { frames: Raster[]; fps: number; loop: boolean };

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const px = (r: Raster, x: number, y: number) => (x < 0 || y < 0 || x >= r.w || y >= r.h ? -1 : (y * r.w + x) * 4);
function copyPx(dst: Raster, x: number, y: number, src: Raster, sx: number, sy: number) {
  const s = px(src, sx, sy), d = px(dst, x, y);
  if (s < 0 || d < 0 || !src.data[s + 3]) return;
  for (let c = 0; c < 4; c++) dst.data[d + c] = src.data[s + c];
}
function put(r: Raster, x: number, y: number, rgb: number[], a = 255) {
  const d = px(r, Math.round(x), Math.round(y));
  if (d < 0) return;
  r.data[d] = rgb[0]; r.data[d + 1] = rgb[1]; r.data[d + 2] = rgb[2]; r.data[d + 3] = a;
}
const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Inclina lo que está arriba del apoyo (la base queda quieta): dx en px en la punta. */
function shear(f: Raster, anchor: [number, number], dx: number): Raster {
  const o = createRaster(f.w, f.h), top = Math.max(1, anchor[1]);
  for (let y = 0; y < f.h; y++) { const s = Math.round((dx * Math.max(0, anchor[1] - y)) / top); for (let x = 0; x < f.w; x++) copyPx(o, x, y, f, x - s, y); }
  return o;
}
/** Escala alrededor del apoyo (vecino más cercano: no inventa colores). */
function scaleAbout(f: Raster, anchor: [number, number], sx: number, sy: number, rowsAbove = Infinity): Raster {
  const o = createRaster(f.w, f.h);
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    const inside = anchor[1] - y <= rowsAbove;
    const X = inside ? x : Math.round(anchor[0] + (x - anchor[0]) / sx), Y = Math.round(anchor[1] + (y - anchor[1]) / sy);
    copyPx(o, x, y, f, inside && rowsAbove !== Infinity ? x : X, Y);
  }
  return o;
}
/** El color más repetido del dibujo (para las hojitas que vuelan). */
function mainColor(f: Raster): number[] {
  const n = new Map<number, number>();
  for (let i = 0; i < f.w * f.h; i++) if (f.data[i * 4 + 3] > 200) { const k = (f.data[i * 4] << 16) | (f.data[i * 4 + 1] << 8) | f.data[i * 4 + 2]; n.set(k, (n.get(k) ?? 0) + 1); }
  let best = 0, bn = 0;
  for (const [k, v] of n) if (v > bn) { bn = v; best = k; }
  return [best >> 16, (best >> 8) & 255, best & 255];
}
const first = (o: WorldObject) => (o.anims.idle ?? Object.values(o.anims)[0]).frames[0];

function shake(o: WorldObject): Anim {
  const f = first(o), leaf = mainColor(f);
  const frames = [3, -3, 2, -1.5, 0.8, 0].map((dx, i) => {
    const r = shear(f, o.anchor, dx);
    // dos hojitas que salen volando hacia arriba y a los costados
    if (i > 0 && i < 5) for (const s of [-1, 1]) put(r, o.anchor[0] + s * (6 + i * 3), o.anchor[1] - 18 - i * 2 + (i * i) / 2, leaf);
    return r;
  });
  return { frames, fps: 12, loop: false };
}
function noBerries(o: WorldObject): Anim {
  const f = first(o), r = createRaster(f.w, f.h);
  r.data.set(f.data);
  const berry = (i: number) => { const R = f.data[i], G = f.data[i + 1], B = f.data[i + 2]; return f.data[i + 3] > 0 && ((R > G + 35 && R > B) || (B > G + 25 && R > G + 10)); };
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    const i = px(f, x, y);
    if (!berry(i)) continue;
    // la hoja de al lado tapa el hueco de la mora
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-3, 1], [3, -1]]) { const j = px(f, x + dx, y + dy); if (j >= 0 && f.data[j + 3] > 0 && !berry(j)) { for (let c = 0; c < 4; c++) r.data[i + c] = f.data[j + c]; break; } }
  }
  return { frames: [r], fps: 1, loop: true };
}
function bounce(o: WorldObject): Anim {
  const f = first(o);
  const frames = [0.72, 1.14, 0.9, 1.05, 0.97, 1].map((sy) => scaleAbout(f, o.anchor, 1 + (1 - sy) * 0.6, sy));
  return { frames, fps: 12, loop: false };
}
function closeFlower(o: WorldObject, open: boolean): Anim {
  const f = first(o);
  // los pétalos (arriba del tallo) se juntan hacia el centro; el tallo y las hojas de abajo quedan
  const ks = [0.85, 0.66, 0.5, 0.4];
  const frames = (open ? [...ks].reverse().slice(1).concat([1]) : ks).map((k) => {
    const r = createRaster(f.w, f.h);
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      const petals = o.anchor[1] - y > 8;
      copyPx(r, x, y, f, petals ? Math.round(o.anchor[0] + (x - o.anchor[0]) / k) : x, y);
    }
    return r;
  });
  return { frames, fps: 8, loop: false };
}
function sway(o: WorldObject, water: boolean): Anim {
  const f = first(o);
  const frames = water
    ? [0, 1, 1, 0, -1, 0].map((dy) => { const r = createRaster(f.w, f.h); for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) copyPx(r, x, y, f, x - (dy > 0 ? 1 : 0), y - dy); return r; })
    : [2, -2, 1.5, -1, 0.5, 0].map((dx) => shear(f, o.anchor, dx));
  return { frames, fps: 8, loop: false };
}
function splash(o: WorldObject): Anim {
  const f = first(o), W = f.w, H = f.h, [cx, cy] = o.anchor;
  const frames = [0, 1, 2, 3, 4, 5].map((i) => {
    const r = createRaster(W, H);
    r.data.set(f.data);
    // onda que se abre
    const R = 3 + i * 3;
    for (let a = 0; a < 360; a += 6) { const t = (a * Math.PI) / 180; put(r, cx + Math.cos(t) * R, cy + Math.sin(t) * R * 0.45, [210, 230, 240], Math.max(0, 200 - i * 34)); }
    // gotitas que suben y caen
    for (const s of [-1, 1, 0]) { const h = 10 * Math.sin(((i + 1) / 6) * Math.PI); if (i < 5) put(r, cx + s * (3 + i * 1.5), cy - h, [220, 238, 245]); }
    return r;
  });
  return { frames, fps: 12, loop: false };
}
/** Llama: lo cálido y claro del dibujo (para apagar y prender antorchas y faroles). */
function flameMask(f: Raster): boolean[] {
  const m: boolean[] = [];
  for (let i = 0; i < f.w * f.h; i++) { const R = f.data[i * 4], G = f.data[i * 4 + 1], B = f.data[i * 4 + 2]; m.push(f.data[i * 4 + 3] > 0 && R > 190 && G > 80 && B < 150 && R > B + 70); }
  return m;
}
function lightUp(o: WorldObject): { apagada: Anim; prender: Anim } {
  const f = first(o), mask = flameMask(f);
  let top = f.h, bottom = 0;
  mask.forEach((v, i) => { if (v) { const y = Math.floor(i / f.w); top = Math.min(top, y); bottom = Math.max(bottom, y); } });
  const frame = (k: number) => {
    const r = createRaster(f.w, f.h);
    for (let i = 0; i < f.w * f.h; i++) {
      const y = Math.floor(i / f.w);
      if (mask[i] && bottom - y > k * (bottom - top + 1)) continue;
      for (let c = 0; c < 4; c++) r.data[i * 4 + c] = f.data[i * 4 + c];
    }
    // apagada: una brasa oscura donde estaba la llama
    if (k === 0) { const x = mask.findIndex((v, i) => v && Math.floor(i / f.w) === bottom) % f.w; put(r, x, bottom, [90, 40, 24]); put(r, x + 1, bottom, [60, 30, 22]); }
    return r;
  };
  return { apagada: { frames: [frame(0)], fps: 1, loop: true }, prender: { frames: [0.15, 0.3, 0.5, 0.7, 0.85, 1].map(frame), fps: 10, loop: false } };
}
function tear(o: WorldObject): Anim {
  const f = first(o);
  const frames = [0.15, 0.3, 0.45, 0.6, 0.7, 0.75].map((t, i) => {
    const r = createRaster(f.w, f.h);
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      const k = px(f, x, y);
      if (!f.data[k + 3] || hash(x >> 1, y >> 1, 77) < t) continue;
      // lo que queda cuelga: baja más cuanto más lejos del punto donde está agarrada
      const sag = Math.round(((x + y) / (f.w + f.h)) * i * 1.5);
      const d = px(r, x, y + sag);
      if (d >= 0) for (let c = 0; c < 4; c++) r.data[d + c] = f.data[k + c];
    }
    return r;
  });
  return { frames, fps: 12, loop: false };
}

/** Agrega las reacciones a los objetos que las tienen (no cambia el reposo ni el tamaño). */
export function withReactions(objs: WorldObject[]): WorldObject[] {
  return objs.map((o) => {
    const n = o.name, add: Record<string, Anim> = {};
    if (/^arbusto/.test(n)) add.sacudir = shake(o);
    if (/^arbusto_moras/.test(n)) add.sin_moras = noBerries(o);
    if (/^(hongos|hongo_gigante|tocon_hongos)/.test(n)) add.rebotar = bounce(o);
    if (/^flores_grandes/.test(n)) { add.cerrar = closeFlower(o, false); add.abrir = closeFlower(o, true); }
    if (/^(nenufar|juncos)/.test(n)) add.mecer = sway(o, n.startsWith('nenufar'));
    if (/^(charco|charco_chico)/.test(n)) add.salpicar = splash(o);
    if (/^(antorcha|farol)$/.test(n) && !o.anims.apagada) Object.assign(add, lightUp(o));
    if (n === 'telarana') add.romper = tear(o);
    return Object.keys(add).length ? { ...o, anims: { ...o.anims, ...add } } : o;
  });
}

// ---------------------------------------------------------------- objetos nuevos

const stone = (hex: string): MatDef => ({ hex, kind: 'stone' });
const wood = (hex: string): MatDef => ({ hex, kind: 'wood' });

/** Palanca (32 x 32, sólida 12 x 6): `arriba`, `bajar` (8 cuadros a 10 fps) y `abajo`. */
function lever(): WorldObject {
  const frame = (deg: number) => {
    const c = new IconCanvas(32, 32, 32);
    c.poly([[8, 30], [8, 24], [24, 24], [24, 30]], stone('#5a6070'));
    c.poly([[9, 24], [10, 21], [22, 21], [23, 24]], stone('#6e7686'), { bias: 1 });
    const t = (deg * Math.PI) / 180, base: P = [16, 22], tip: P = [16 + Math.sin(t) * 13, 22 - Math.cos(t) * 13];
    c.line(base, tip, 1.6, wood('#7a5234'));
    c.ellipse(tip, 2.6, 2.2, { hex: '#b03a2e', kind: 'leather' }, { bias: 1 });
    c.ellipse(base, 2.2, 1.4, metalMat('#5a5a66'));
    return c.render();
  };
  const bajar = Array.from({ length: 8 }, (_, i) => frame(-50 + (100 * (i + 1)) / 8));
  return withShadow({ name: 'palanca', w: 32, h: 32, anchor: [16, 30], solid: [-6, -6, 12, 6], anims: { idle: { frames: [frame(-50)], fps: 1, loop: true }, arriba: { frames: [frame(-50)], fps: 1, loop: true }, bajar: { frames: bajar, fps: 10, loop: false }, abajo: { frames: [frame(50)], fps: 1, loop: true } } }, { length: 0.4, drop: 0.2 });
}

/** Puerta de madera en su marco (64 x 64, sólida cerrada): `cerrada`, `abrir` (9 cuadros a 10 fps) y `abierta`. */
function woodDoor(): WorldObject {
  const frame = (open: number) => {
    const c = new IconCanvas(64, 64, 64);
    // marco de piedra
    c.poly([[6, 62], [6, 8], [58, 8], [58, 62], [52, 62], [52, 14], [12, 14], [12, 62]], stone('#6a6458'));
    c.poly([[4, 10], [4, 4], [60, 4], [60, 10]], stone('#7e786a'), { bias: 1 });
    // el hueco oscuro
    c.poly([[12, 62], [12, 14], [52, 14], [52, 62]], stone('#141210'));
    // la hoja gira sobre la bisagra izquierda: se angosta a medida que abre
    const w = 40 * (1 - open);
    if (w > 1) {
      c.poly([[12, 62], [12, 14], [12 + w, 14], [12 + w, 62]], wood('#6e4a2e'));
      for (let k = 1; k < 4; k++) c.px1([12 + (w * k) / 4, 15], [12 + (w * k) / 4, 61], wood('#4e3220'), { tone: 1 }, true);
      for (const y of [22, 50]) c.line([12, y], [12 + w * 0.9, y], 1.4, metalMat('#3a3a42'));
      if (w > 30) c.ellipse([12 + w - 5, 38], 1.4, 1.4, metalMat('#a08a50'), { bias: 1 });
    }
    return c.render();
  };
  return {
    name: 'puerta_madera', w: 64, h: 64, anchor: [32, 62], solid: [-26, -8, 52, 8],
    anims: { idle: { frames: [frame(0)], fps: 1, loop: true }, cerrada: { frames: [frame(0)], fps: 1, loop: true }, abrir: { frames: Array.from({ length: 9 }, (_, i) => frame((i + 1) / 9)), fps: 10, loop: false }, abierta: { frames: [frame(1)], fps: 1, loop: true } },
  };
}

/** Reja de la Catedral (64 x 64, sólida cerrada): los barrotes suben al abrir (9 cuadros a 9 fps). */
function cathedralGate(): WorldObject {
  const frame = (open: number) => {
    const c = new IconCanvas(64, 64, 64);
    c.poly([[6, 62], [6, 12], [58, 12], [58, 62], [52, 62], [52, 18], [12, 18], [12, 62]], stone('#5c6678'));
    c.ring([32, 18], 26, 12, 4, stone('#6e7890'), {}, 180, 360);
    c.poly([[12, 62], [12, 18], [52, 18], [52, 62]], stone('#0c0e14'));
    const lift = open * 44;
    for (let x = 15; x < 52; x += 6) c.line([x, 18], [x, Math.max(18, 61 - lift)], 1.4, metalMat('#3e4250'));
    for (const y of [28, 46]) if (y < 61 - lift) c.line([13, y], [51, y], 1.2, metalMat('#4a4e5c'));
    return c.render();
  };
  return {
    name: 'reja_catedral', w: 64, h: 64, anchor: [32, 62], solid: [-26, -8, 52, 8],
    anims: { idle: { frames: [frame(0)], fps: 1, loop: true }, cerrada: { frames: [frame(0)], fps: 1, loop: true }, abrir: { frames: Array.from({ length: 9 }, (_, i) => frame((i + 1) / 9)), fps: 9, loop: false }, abierta: { frames: [frame(1)], fps: 1, loop: true } },
  };
}

/** Piedra que empuja Thor (32 x 32): `quieta` y `arrastrar` (6 cuadros a 6 fps: tiembla y levanta polvo). */
function pushStone(): WorldObject {
  const frame = (i: number) => {
    const c = new IconCanvas(32, 32, 32);
    const dx = i < 0 ? 0 : [0, 1, 0, -1, 0, 1][i];
    c.poly([[4 + dx, 29], [5 + dx, 12], [10 + dx, 7], [24 + dx, 7], [28 + dx, 13], [28 + dx, 29]], stone('#7a7466'));
    c.poly([[6 + dx, 13], [11 + dx, 8], [23 + dx, 8], [26 + dx, 12]], stone('#968e7c'), { bias: 1 });
    c.px1([12 + dx, 14], [14 + dx, 22], stone('#4e4a42'), { tone: 1 }, true);
    for (const [x, y] of [[22, 24], [24, 26], [25, 22]] as P[]) c.dot([x + dx, y], { hex: '#3f6e5a', kind: 'fur' }, { tone: 3 }, true);
    if (i >= 0) for (let k = 0; k < 3; k++) c.dot([3 - k * 1.5 + (i % 2), 28 - k], stone('#a89e88'), { tone: 4 }, true);
    return c.render();
  };
  return withShadow({ name: 'piedra_empujable', w: 32, h: 32, anchor: [16, 29], solid: [-12, -8, 24, 8], anims: { idle: { frames: [frame(-1)], fps: 1, loop: true }, quieta: { frames: [frame(-1)], fps: 1, loop: true }, arrastrar: { frames: [0, 1, 2, 3, 4, 5].map(frame), fps: 6, loop: true } } }, { length: 0.4, drop: 0.2 });
}

/** Campana chica de la Catedral en su soporte (32 x 48): `sonar` (8 cuadros a 10 fps), se mueve y vibra. */
function smallBell(): WorldObject {
  const frame = (deg: number, ring: number) => {
    const c = new IconCanvas(32, 32, 48);
    c.line([6, 46], [6, 8], 1.6, wood('#5e4434')); c.line([26, 46], [26, 8], 1.6, wood('#5e4434'));
    c.line([5, 8], [27, 8], 1.8, wood('#6e5040'));
    const t = (deg * Math.PI) / 180, R = (x: number, y: number): P => [16 + (x - 16) * Math.cos(t) - (y - 9) * Math.sin(t), 9 + (x - 16) * Math.sin(t) + (y - 9) * Math.cos(t)];
    c.poly([R(13, 10), R(19, 10), R(22, 22), R(24, 26), R(8, 26), R(10, 22)], metalMat('#b0803a'));
    c.dot(R(16, 27), metalMat('#6a4a24'), { tone: 2 }, true);
    for (let k = 0; k < ring; k++) for (const s of [-1, 1]) c.dot([16 + s * (11 + k * 2), 18 - k], { hex: '#e8d8a0', kind: 'glow' }, { tone: 4 }, true);
    return c.render({ glowK: 0.6 });
  };
  const sonar = [22, -18, 14, -10, 7, -4, 2, 0].map((d, i) => frame(d, i < 6 ? 1 + (i % 2) : 0));
  return withShadow({ name: 'campana_chica', w: 32, h: 48, anchor: [16, 46], solid: [-11, -4, 22, 4], anims: { idle: { frames: [frame(0, 0)], fps: 1, loop: true }, sonar: { frames: sonar, fps: 10, loop: false } } }, { length: 0.4, drop: 0.2 });
}

export function reactiveObjects(): WorldObject[] {
  return [lever(), woodDoor(), cathedralGate(), pushStone(), smallBell()];
}

// ---------------------------------------------------------------- criaturas chicas que huyen

function critter(name: string, w: number, h: number, draw: (r: Raster, f: number, run: boolean) => void, quietoN: number, huirN: number): Creature {
  const make = (n: number, run: boolean) => Array.from({ length: n }, (_, f) => { const r = createRaster(w, h); draw(r, f, run); return r; });
  return { name, w, h, anims: { quieto: { frames: make(quietoN, false), fps: 4, loop: true }, huir: { frames: make(huirN, true), fps: run2fps(huirN), loop: !name.startsWith('pez') } } };
}
const run2fps = (n: number) => (n >= 8 ? 12 : 10);
const ell = (r: Raster, cx: number, cy: number, rx: number, ry: number, c: number[], shadeC?: number[]) => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d > 1) continue;
    put(r, x, y, shadeC && x - cx + (y - cy) > 0.6 * rx ? shadeC : c);
  }
};

/** Rana de 16 x 16: `quieto` (infla el cuello) y `huir` (salto en arco, 6 cuadros). */
function frog(): Creature {
  const G = rgb('#4e8a3a'), GD = rgb('#2e5a2a'), GL = rgb('#7ab45a'), K = rgb('#0c1208'), Y = rgb('#e8d870');
  return critter('rana', 16, 16, (r, f, run) => {
    const h = run ? Math.round(Math.sin((f / 5) * Math.PI) * 6) : 0, x = run ? 3 + f * 1.6 : 8;
    ell(r, x, 12 - h, 4.5, 3, G, GD);
    ell(r, x - 1, 10.5 - h, 2.4, 1.3, GL);
    put(r, x - 3, 9 - h, Y); put(r, x + 2, 9 - h, Y); put(r, x - 3, 8 - h, K); put(r, x + 2, 8 - h, K);
    if (!run && f % 2) ell(r, x, 13.5, 2, 1, Y);
    if (run && h > 2) { put(r, x - 5, 14 - h, GD); put(r, x + 5, 14 - h, GD); }
    else { put(r, x - 4, 15, GD); put(r, x + 4, 15, GD); }
  }, 4, 6);
}
/** Pez de 16 x 16 que salta del lago: `quieto` (brillo bajo el agua) y `huir` (salta y vuelve a entrar, 8 cuadros). */
function fish(): Creature {
  const B = rgb('#c8d8e8'), BD = rgb('#7a90a8'), O = rgb('#e88a3a'), W = rgb('#e8f4f8');
  return critter('pez', 16, 16, (r, f, run) => {
    if (!run) { const a = [60, 90, 60, 30][f]; for (let x = 5; x < 11; x++) put(r, x, 12, BD, a); put(r, 6 + f, 11, W, a + 60); return; }
    const t = f / 7, y = 13 - Math.sin(t * Math.PI) * 10, x = 3 + t * 10;
    if (f > 0 && f < 7) { ell(r, x, y, 3.4, 1.6, B, BD); put(r, x - 4, y - 1, O); put(r, x - 4, y + 1, O); put(r, x + 2, y - 1, rgb('#101418')); }
    if (f === 0 || f === 7) for (let k = -3; k <= 3; k++) put(r, (f ? 13 : 3) + k, 13 - Math.abs(k) % 2, W);
  }, 4, 8);
}
/** Ardilla de 16 x 16: `quieto` (mueve la cola) y `huir` (corre, 8 cuadros). */
function squirrel(): Creature {
  const R = rgb('#a8642e'), RD = rgb('#6e3e1e'), RL = rgb('#d89a5a'), K = rgb('#120a06');
  return critter('ardilla', 16, 16, (r, f, run) => {
    const bob = run ? (f % 2) : 0, x = run ? 4 + (f % 4) * 0.5 : 6;
    ell(r, x + 4, 11 - bob, 3.2, 2.6, R, RD);
    ell(r, x + 7, 8.5 - bob, 2, 1.8, R, RD);
    put(r, x + 8, 8 - bob, K); put(r, x + 7, 6 - bob, RD);
    put(r, x + 5, 12 - bob, RL);
    // la cola: grande y peluda, se mueve
    const tw = run ? 0 : [0, 1, 0, -1][f];
    ell(r, x + 0.5 + tw * 0.5, 7.5 - bob, 2.4, 4, RL, R);
    put(r, x + 2, 14, RD); put(r, x + 6, 14, RD);
    if (run) { put(r, x + (f % 2 ? 1 : 3), 14, RD); put(r, x + (f % 2 ? 7 : 5), 14, RD); }
  }, 4, 8);
}

export function smallCreatures(): Creature[] {
  return [frog(), fish(), squirrel()];
}
