import { createRaster, type Raster } from '../core/raster';
import { IconCanvas, type MatDef, type P } from '../loot/canvas';
import { glowMat, metalMat } from '../loot/materials';
import { contactShadow } from './premium/contact';
import type { WorldObject } from './objects';

/**
 * Mundo 4: El Puerto Ahogado (encargo F12, parte 2). Un mar negro bajo tierra con un pueblo de pescadores medio
 * hundido: piedra mojada gris verde, madera podrida, redes y sogas, y la luz que se mueve (el farol de Thor, los
 * faroles del muelle y el faro al final).
 *
 * Luz de arriba a la izquierda como todo el kit, pero SIN sombra horneada con dirección: cada objeto trae solo su
 * sombra de contacto al pie (premium/contact.ts). La sombra larga la hace el juego, lejos de la luz que la alumbra.
 */

export const PUERTO = {
  agua: ['#03080a', '#071214', '#0c1c1e', '#132a2a', '#1c3a3a'],
  brillo: '#6fb8a8',
  piedra: ['#0d1414', '#172120', '#222e2c', '#2f3c39', '#3e4c48', '#4e5e58', '#5c6e68'],
  madera: ['#1a120c', '#2a1e14', '#3a2b1d', '#4c3a28', '#5e4834', '#6a5038'],
  red: ['#3a3226', '#5e523c', '#8a7a5a', '#a8986e'],
  ambar: '#ffc070',
  fatuo: '#7affc8',
  violeta: '#8a5aff',
  hierro: ['#121214', '#22242a', '#363a42', '#4e535c', '#6e747e'],
  oxido: '#6a3a22',
  alga: ['#0e1e14', '#16301e', '#24442a'],
};

const wood = (hex: string): MatDef => ({ hex, kind: 'wood' });
const stone = (hex: string): MatDef => ({ hex, kind: 'stone' });
const cloth = (hex: string): MatDef => ({ hex, kind: 'cloth' });
const one = (fr: Raster) => ({ idle: { frames: [fr], fps: 1, loop: true } });
type Anim = { frames: Raster[]; fps: number; loop: boolean };

export function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const rgbCache = new Map<string, number[]>();
export const rgb = (h: string) => { let v = rgbCache.get(h); if (!v) { v = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; rgbCache.set(h, v); } return v; };
export function put(r: Raster, x: number, y: number, c: number[] | string, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const k = (y * r.w + x) * 4, v = typeof c === 'string' ? rgb(c) : c;
  if (a >= 255 || !r.data[k + 3]) { r.data[k] = v[0]; r.data[k + 1] = v[1]; r.data[k + 2] = v[2]; r.data[k + 3] = Math.max(a, r.data[k + 3]); return; }
  const t = a / 255;
  for (let i = 0; i < 3; i++) r.data[k + i] = Math.round(r.data[k + i] * (1 - t) + v[i] * t);
  r.data[k + 3] = Math.max(r.data[k + 3], a);
}
/** brillo suave alrededor de un punto (solo donde no hay nada dibujado): lo prendido */
export function glow(r: Raster, cx: number, cy: number, rad: number, c: string, k: number) {
  const v = rgb(c);
  for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
    if (x < 0 || y < 0 || x >= r.w || y >= r.h) continue;
    const d = Math.hypot(x - cx, y - cy) / rad;
    if (d >= 1) continue;
    const a = Math.round((1 - d) ** 2 * 90 * k), i = (y * r.w + x) * 4;
    if (a > 2 && !r.data[i + 3]) { r.data[i] = v[0]; r.data[i + 1] = v[1]; r.data[i + 2] = v[2]; r.data[i + 3] = a; }
  }
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
/** tono de una paleta para una luz de 0 a 1 (con tramado si `dither`) */
export function tone(pal: string[], l: number, x: number, y: number, dither = false): string {
  const t = Math.max(0, Math.min(1, l)) * (pal.length - 1), b = Math.floor(t);
  return pal[Math.min(pal.length - 1, t - b > (dither ? BAYER[(y & 3) * 4 + (x & 3)] : 0.5) ? b + 1 : b)];
}
/** contorno de 1 px alrededor de lo dibujado (el tono más oscuro) */
export function outline(r: Raster, c = '#05080a') {
  const W = r.w, H = r.h, a0 = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a0[i] = r.data[i * 4 + 3] > 100 ? 1 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (a0[y * W + x]) continue;
    if ((x > 0 && a0[y * W + x - 1]) || (x < W - 1 && a0[y * W + x + 1]) || (y > 0 && a0[(y - 1) * W + x]) || (y < H - 1 && a0[(y + 1) * W + x])) put(r, x, y, c);
  }
}
/** con la sombra de contacto */
const grounded = (o: WorldObject, opts?: Parameters<typeof contactShadow>[2]): WorldObject => {
  const fr = (o.anims.idle ?? Object.values(o.anims)[0]).frames[0];
  return { ...o, shadow: contactShadow(fr, o.anchor, opts) };
};

// ---------------------------------------------------------------- faroles del muelle (la fogata del piso)

/**
 * Farol del muelle (32 x 80): poste de hierro sobre una base de piedra, con un farol de vidrio arriba bajo su techito.
 * `farol_muelle_apagado` (1 cuadro, con ceniza en el techo), `farol_muelle_prendido` (8 cuadros a 7 fps, luz ámbar
 * de 180) y `farol_muelle_prenderse` (12 cuadros a 12 fps: la chispa, la llama que crece y la luz que se abre).
 */
function dockLantern(lit: number, f: number): Raster {
  const c = new IconCanvas(32, 32, 80);
  const H = PUERTO.hierro;
  // base de piedra mojada
  c.ellipse([16, 75], 8, 3, stone(PUERTO.piedra[3]));
  c.poly([[9, 75], [10, 66], [22, 66], [23, 75]], stone(PUERTO.piedra[4]));
  c.ellipse([16, 66], 6, 2, stone(PUERTO.piedra[5]), { bias: 1 });
  // poste con dos anillos y un gancho para la soga
  c.poly([[14.4, 66], [14.6, 26], [17.4, 26], [17.6, 66]], metalMat(H[2]));
  for (const y of [44, 58]) c.poly([[13.4, y], [18.6, y], [18.6, y + 2], [13.4, y + 2]], metalMat(H[3]), { bias: 1 });
  c.line([18, 50], [21, 52], 0.7, metalMat(H[3]));
  // la soga mojada que cuelga del gancho
  c.line([21, 52], [20, 60], 0.8, cloth(PUERTO.red[1]));
  // el farol: base, jaula con vidrio, techito a dos aguas y argolla
  c.poly([[10, 26], [22, 26], [21, 23], [11, 23]], metalMat(H[3]));
  const g = lit > 0 ? glowMat(['#ffd890', '#ffc070', '#ffcc80', '#ffb860', '#ffd088', '#ffbe68', '#ffd48c', '#ffc474'][f % 8]) : { hex: '#2a2a20', kind: 'glass' as const };
  c.poly([[11, 23], [21, 23], [22, 11], [10, 11]], g, { tone: lit > 0 ? 4 : 2 });
  if (lit <= 0) c.px1([12, 21], [13, 13], { hex: '#4a4a3a', kind: 'glass' }, { tone: 4 }, true);
  for (const x of [10.5, 16, 21.5]) c.px1([x, 11], [x, 23], metalMat(H[1]), { tone: 1 });
  c.poly([[8, 11], [24, 11], [16, 4]], metalMat(H[2]), { bias: 1 });
  c.ring([16, 3], 1.6, 1.6, 0.7, metalMat(H[3]), {}, 0, 360);
  // la llama adentro
  if (lit > 0.15) {
    const fh = (3 + lit * 4) * (0.85 + 0.15 * Math.sin(f * 2.1));
    c.ellipse([16, 20 - fh / 2], 1.6 * Math.min(1, lit), fh / 2, glowMat('#fff4c8'), { tone: 5 });
  }
  const r = c.render({ glowK: Math.min(1, lit) });
  if (lit > 0) glow(r, 16, 17, 14, PUERTO.ambar, Math.min(1.2, lit) * (0.9 + 0.1 * Math.sin(f * 1.7)));
  // ceniza sobre el techo cuando está apagado
  if (lit <= 0) for (let i = 0; i < 6; i++) put(r, 12 + i * 1.5, 9 - Math.abs(i - 2.5) * 1.1, '#8a8a88', 200);
  return r;
}

function dockLanterns(): WorldObject[] {
  const base = { w: 32, h: 80, anchor: [16, 76] as [number, number], solid: [-6, -6, 12, 6] as [number, number, number, number] };
  const light = { color: PUERTO.ambar, radius: 180, flicker: true, dy: 60 };
  const prenderse: Anim = { frames: [0, 0.05, 0.12, 0.2, 0.32, 0.45, 0.6, 0.78, 0.95, 1.15, 1.05, 1].map((k, f) => dockLantern(k, f)), fps: 12, loop: false };
  const prendido: Anim = { frames: Array.from({ length: 8 }, (_, f) => dockLantern(1, f)), fps: 7, loop: true };
  return [
    grounded({ name: 'farol_muelle_apagado', ...base, anims: one(dockLantern(0, 0)) }),
    grounded({ name: 'farol_muelle_prendido', ...base, light, anims: { idle: prendido } }),
    grounded({ name: 'farol_muelle_prenderse', ...base, light, anims: { idle: prenderse } }),
  ];
}

// ---------------------------------------------------------------- el faro

/**
 * El faro (128 x 320): torre de piedra mojada que se angosta hacia arriba, con la puerta abajo, ventanitas en espiral,
 * el balcón de hierro, la sala de la luz con vidrios y la cúpula. `apagado` (1 cuadro) y `prendido` (8 cuadros a 8
 * fps: la luz gira arriba y barre con dos haces). Luz de radio 420 (solo cuando está prendido).
 */
function lighthouse(lit: boolean, f: number): Raster {
  const W = 128, H = 320, r = createRaster(W, H), P = PUERTO.piedra, I = PUERTO.hierro;
  const cx = 64, top = 92, base = 300;
  const halfAt = (y: number) => 26 + ((y - top) / (base - top)) * 16; // 26 arriba, 42 abajo
  // las rocas del pie
  for (let y = 286; y < 316; y++) for (let x = 0; x < W; x++) {
    const dx = (x - cx) / 58, dy = (y - 304) / 12;
    const n = hash(x >> 3, y >> 2, 7) * 0.25;
    if (dx * dx + dy * dy < 1 - n) {
      const l = 0.45 + (y < 300 ? 0.25 : 0) - dx * 0.25 + (hash(x >> 2, y >> 2, 9) - 0.5) * 0.3;
      put(r, x, y, tone(P.slice(1), l, x, y));
    }
  }
  // la torre: sillares que se curvan con el cilindro, luz a la izquierda
  for (let y = top; y < base; y++) {
    const hw = halfAt(y), row = Math.floor((y - top) / 9), off = row % 2 ? 0.5 : 0;
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
      const u = (x - cx) / hw; // -1 a 1
      const a = Math.asin(Math.max(-1, Math.min(1, u)));
      const col = Math.floor((a / Math.PI) * 8 + off + 8);
      const joint = (y - top) % 9 === 0 || Math.abs(((a / Math.PI) * 8 + off + 8) - col) < 0.08 * (1 / Math.max(0.3, Math.cos(a)));
      let l = 0.62 - u * 0.42 + (hash(col, row, 11) - 0.5) * 0.16;
      // franja oscura de musgo y humedad abajo
      if (y > base - 40) l -= ((y - (base - 40)) / 40) * 0.25;
      let c = joint ? P[1] : tone(P.slice(1), l, x, y);
      if (!joint && hash(x, y, 13) > 0.992) c = PUERTO.brillo; // gotitas que brillan
      if (!joint && y > base - 30 && hash(x >> 1, y >> 1, 15) > 0.82) c = PUERTO.alga[2];
      put(r, x, y, c);
    }
  }
  // la puerta (arco oscuro) y las ventanitas
  for (let y = base - 34; y < base; y++) for (let x = cx - 10; x <= cx + 10; x++) {
    const inArch = y > base - 24 || Math.hypot(x - cx, y - (base - 24)) < 10;
    if (inArch) put(r, x, y, Math.abs(x - cx) > 8.5 || y < base - 32.5 ? P[2] : '#020405');
  }
  for (const [wx, wy] of [[cx - 12, 228], [cx + 9, 182], [cx - 6, 138]]) for (let y = wy; y < wy + 9; y++) for (let x = wx; x < wx + 5; x++) put(r, x, y, y === wy || x === wx ? P[1] : '#030607');
  // el balcón de hierro
  for (let y = top - 6; y < top + 2; y++) for (let x = cx - 36; x <= cx + 36; x++) put(r, x, y, y < top - 4 ? I[4] : y < top ? I[3] : I[1]);
  for (let x = cx - 34; x <= cx + 34; x += 4) for (let y = top - 18; y < top - 6; y++) put(r, x, y, I[x < cx ? 3 : 2]);
  for (let x = cx - 35; x <= cx + 35; x++) { put(r, x, top - 19, I[4]); put(r, x, top - 18, I[2]); }
  // la sala de la luz: marcos de hierro y vidrio
  const roomTop = 34, roomBot = top - 6;
  for (let y = roomTop; y < roomBot; y++) for (let x = cx - 22; x <= cx + 22; x++) {
    const u = (x - cx) / 22, frame = Math.abs(((u + 1) * 3) % 1) < 0.12 || y < roomTop + 3 || y > roomBot - 4;
    let c: string;
    if (frame) c = I[u < 0 ? 3 : 1];
    else if (lit) c = tone(['#c8701a', '#ffb050', '#ffd890', '#fff4d0'], 0.75 - Math.abs(u) * 0.5 + 0.15 * Math.sin(f + u * 3), x, y, true);
    else c = tone(['#0a1414', '#142424', '#1e3434'], 0.5 - u * 0.4, x, y);
    put(r, x, y, c);
  }
  // la lámpara adentro: apagada se ve el lente
  if (!lit) for (let y = 50; y < 74; y++) for (let x = cx - 7; x <= cx + 7; x++) if (Math.hypot((x - cx) / 7, (y - 62) / 12) < 1) put(r, x, y, (x + y) % 3 ? '#2a3a38' : '#3e5450');
  // la cúpula y la veleta
  for (let y = 12; y < roomTop; y++) {
    const hw = 25 * Math.sqrt(Math.max(0, 1 - ((roomTop - y) / 22) ** 2));
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) put(r, x, y, tone([I[1], I[2], I[3], I[4]], 0.7 - ((x - cx) / Math.max(1, hw)) * 0.5 - (y < 18 ? 0 : 0.1), x, y));
  }
  for (let y = 2; y < 13; y++) put(r, cx, y, I[3]);
  put(r, cx - 1, 6, I[4]); put(r, cx + 1, 6, I[2]);
  outline(r);
  if (lit) {
    // los dos haces que giran: se alargan cuando apuntan a los costados y se acortan cuando miran a la cámara
    const ang = (f / 8) * Math.PI * 2;
    for (const k of [0, Math.PI]) {
      const a = ang + k, dir = Math.cos(a), len = 60 * Math.abs(dir), front = Math.sin(a) > 0;
      for (let t = 4; t < len; t++) {
        const x = cx + dir * t * 1.05, spread = 3 + t * 0.32;
        for (let s = -spread; s <= spread; s++) {
          const y = 62 + s, alpha = Math.round((1 - t / Math.max(1, len)) * (1 - Math.abs(s) / (spread + 1)) * (front ? 150 : 90));
          const i = (Math.round(y) * W + Math.round(x)) * 4;
          if (x < 0 || x >= W || y < 0 || y >= H || alpha < 6) continue;
          if (!r.data[i + 3] || front) put(r, x, y, '#fff0c0', alpha);
        }
      }
    }
    glow(r, cx, 62, 40, '#ffd890', 1);
  }
  return r;
}

function lighthouseObject(): WorldObject {
  const apagado = lighthouse(false, 0);
  const prendido: Anim = { frames: Array.from({ length: 8 }, (_, f) => lighthouse(true, f)), fps: 8, loop: true };
  return {
    name: 'faro', w: 128, h: 320, anchor: [64, 312], solid: [-40, -24, 80, 24],
    light: { color: '#ffd890', radius: 420, pulse: true, dy: 250 },
    anims: { idle: { frames: [apagado], fps: 1, loop: true }, apagado: { frames: [apagado], fps: 1, loop: true }, prendido },
    shadow: contactShadow(apagado, [64, 312], { rows: 8, spread: 4, tall: 4 }),
  };
}

// ---------------------------------------------------------------- muelles

/**
 * Tablones del muelle (32 x 32, capa suelo, se caminan). Entre tabla y tabla queda una rendija transparente: se ve el
 * agua negra que corre debajo. `muelle_h` (el muelle corre de este a oeste: las tablas van atravesadas),
 * `muelle_v` y las esquinas `muelle_esquina_ne/no/se/so` (con el pilote en la punta de afuera).
 */
function plankTile(dir: 'h' | 'v', seed: number, edges: { n?: boolean; s?: boolean; e?: boolean; w?: boolean } = {}, post?: [number, number]): Raster {
  const r = createRaster(32, 32), M = PUERTO.madera;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    // a lo largo de la tabla (a) y de través (b)
    const a = dir === 'h' ? y : x, b = dir === 'h' ? x : y;
    const board = Math.floor(b / 6.4), inB = b - board * 6.4;
    if (inB < 0.9) continue; // rendija: se ve el agua
    const broken = hash(board, seed, 21) > 0.86 && a > 20 + hash(board, seed, 22) * 8;
    if (broken) continue;
    const grain = hash(board * 7 + (a >> 2), seed, 23) * 0.18 + (Math.sin(a * 0.7 + board * 3) > 0.85 ? -0.12 : 0);
    let l = 0.48 + (inB < 1.9 ? 0.18 : inB > 5.4 ? -0.2 : 0) + grain + (hash(board, seed, 24) - 0.5) * 0.25;
    // mojado y podrido en las puntas
    if (hash(x >> 1, y >> 1, seed + 25) > 0.9) l -= 0.18;
    let c = tone(M, l, x, y);
    if ((a === 3 || a === 28) && (inB > 2.5 && inB < 3.6)) c = PUERTO.hierro[3]; // clavos
    put(r, x, y, c);
  }
  // vigas de borde (más oscuras) donde el muelle termina
  const beam = (horizontal: boolean, at: number) => { for (let t = 0; t < 32; t++) for (let k = 0; k < 3; k++) put(r, horizontal ? t : at + k, horizontal ? at + k : t, M[k === 0 ? 3 : k === 1 ? 2 : 1]); };
  if (edges.n) beam(true, 0);
  if (edges.s) beam(true, 29);
  if (edges.w) beam(false, 0);
  if (edges.e) beam(false, 29);
  if (post) {
    // el pilote: un tronco redondo que asoma, con su sombrero de algas
    const [px, py] = post;
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const d = Math.hypot(x, y); if (d < 4.6) put(r, px + x, py + y, d > 3.6 ? M[0] : tone(M, 0.62 - (x + y) * 0.05, px + x, py + y)); }
    put(r, px - 1, py - 1, M[5]); put(r, px + 2, py - 4, PUERTO.alga[2]); put(r, px + 3, py - 3, PUERTO.alga[1]);
  }
  return r;
}

function docks(): WorldObject[] {
  const tile = (name: string, fr: Raster): WorldObject => ({ name, w: 32, h: 32, anchor: [16, 16], solid: null, layer: 'suelo', anims: one(fr) });
  return [
    tile('muelle_h', plankTile('h', 1, { n: true, s: true })),
    tile('muelle_v', plankTile('v', 2, { e: true, w: true })),
    tile('muelle_ancho', plankTile('h', 3)),
    tile('muelle_esquina_no', plankTile('h', 4, { n: true, w: true }, [4, 4])),
    tile('muelle_esquina_ne', plankTile('h', 5, { n: true, e: true }, [27, 4])),
    tile('muelle_esquina_so', plankTile('h', 6, { s: true, w: true }, [4, 27])),
    tile('muelle_esquina_se', plankTile('h', 7, { s: true, e: true }, [27, 27])),
    // los bordes de un muelle ancho (dos cuadros): una viga de un solo lado
    tile('muelle_borde_n', plankTile('h', 8, { n: true })),
    tile('muelle_borde_s', plankTile('h', 9, { s: true })),
    tile('muelle_borde_o', plankTile('v', 10, { w: true })),
    tile('muelle_borde_e', plankTile('v', 11, { e: true })),
  ];
}

/**
 * Muelle flotante (64 x 32, capa suelo): tablas sobre barriles. `abajo` (1 cuadro: hundido, tapado de agua),
 * `subir` (8 cuadros a 8 fps: el agua se escurre y las tablas se secan) y `arriba` (2 cuadros a 2 fps: se mece).
 */
function floatingDock(up: number, f: number): Raster {
  const r = createRaster(64, 32), M = PUERTO.madera, A = PUERTO.agua;
  const bob = up >= 1 ? f % 2 : 0;
  // barriles debajo (asoman por los costados cuando está arriba)
  if (up > 0.5) for (const bx of [8, 30, 52]) for (const by of [2, 28]) for (let y = -2; y <= 2; y++) for (let x = -4; x <= 4; x++) if (Math.hypot(x / 4, y / 2) < 1) put(r, bx + x, by + y + bob, y < 0 ? PUERTO.oxido : '#3a2014');
  for (let y = 4; y < 28; y++) for (let x = 2; x < 62; x++) {
    const board = Math.floor(x / 6), inB = x - board * 6;
    if (inB < 1) continue;
    let l = 0.5 + (inB < 2 ? 0.16 : inB > 4.6 ? -0.18 : 0) + (hash(board, y >> 2, 31) - 0.5) * 0.2;
    if (y === 4 || y === 27) l -= 0.25;
    let c = rgb(tone(M, l * (0.55 + 0.45 * up), x, y + bob));
    // el agua encima cuando está abajo: un velo negro verdoso que se escurre de afuera hacia adentro
    const wet = 1 - up, edge = Math.min(x - 2, 61 - x, y - 4, 27 - y) / 12;
    const cover = Math.max(0, Math.min(1, wet * 1.4 - edge * up * 0.6));
    if (cover > 0) c = c.map((v, i) => Math.round(v * (1 - cover * 0.85) + rgb(A[3])[i] * cover * 0.85));
    put(r, x, y + bob, c);
    if (cover > 0.3 && hash(x, y, 33 + f) > 0.96) put(r, x, y + bob, PUERTO.brillo, 180);
  }
  // sogas en las puntas
  for (const x of [3, 60]) for (let y = 6; y < 26; y += 2) put(r, x, y + bob, PUERTO.red[2]);
  return r;
}

function floatingDockObject(): WorldObject {
  return {
    name: 'muelle_flotante', w: 64, h: 32, anchor: [32, 16], solid: null, layer: 'suelo',
    anims: {
      idle: { frames: [floatingDock(0, 0)], fps: 1, loop: true },
      abajo: { frames: [floatingDock(0, 0)], fps: 1, loop: true },
      subir: { frames: [0.1, 0.22, 0.36, 0.5, 0.64, 0.78, 0.9, 1].map((u, f) => floatingDock(u, f)), fps: 8, loop: false },
      arriba: { frames: [floatingDock(1, 0), floatingDock(1, 1)], fps: 2, loop: true },
    },
  };
}

/**
 * El agua de la marea (32 x 32, capa suelo, 6 cuadros a 6 fps): lo que se dibuja en los cuadros que la marea tapa. Agua
 * negra verdosa poco honda, semitransparente (se adivinan las piedras), con un borde de espuma oscura que avanza y
 * se retira y brillos sueltos.
 */
function tideWater(): WorldObject {
  const frames: Raster[] = [];
  for (let f = 0; f < 6; f++) {
    const r = createRaster(32, 32), A = PUERTO.agua;
    const ph = (f / 6) * Math.PI * 2;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      // pega por los cuatro lados: todo con senos de período 32
      const w = Math.sin((x / 32) * Math.PI * 2 + ph) * 0.5 + Math.sin(((y + x) / 32) * Math.PI * 2 - ph) * 0.5;
      const band = Math.sin((y / 32) * Math.PI * 4 + ph + Math.sin((x / 32) * Math.PI * 2) * 1.2);
      let c = A[w > 0.4 ? 3 : w > -0.3 ? 2 : 1], a = 205;
      if (band > 0.92) { c = '#2a4a46'; a = 225; }
      if (band > 0.97 && (x + f) % 3 === 0) { c = PUERTO.brillo; a = 200; }
      put(r, x, y, c, a);
    }
    frames.push(r);
  }
  return { name: 'agua_marea', w: 32, h: 32, anchor: [16, 16], solid: null, layer: 'suelo', anims: { idle: { frames, fps: 6, loop: true } } };
}

/**
 * El muelle redondo de la arena del Pez Farol (352 x 352, capa suelo, apoyo en el centro): un anillo de tablas
 * radiales que asoma sobre el borde de la poza, con doce pilotes en el borde de adentro y sogas que cuelgan entre
 * ellos. Entre tabla y tabla queda la rendija por donde se ve el agua o la piedra. Se camina entero.
 */
function poolRing(): WorldObject {
  const S = 352, c = S / 2, r = createRaster(S, S), M = PUERTO.madera;
  const R0 = 118, R1 = 164, N = 84;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy);
    if (d < R0 || d > R1) continue;
    const a = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2), u = a * N, board = Math.floor(u), inB = u - board;
    const edge = d < R0 + 3 || d > R1 - 3;
    if (!edge && inB < 0.12) continue; // rendija
    if (!edge && hash(board, 3, 41) > 0.93 && d > R0 + 18 && d < R0 + 30) continue; // una tabla rota
    let l = 0.48 + (inB < 0.3 ? 0.14 : inB > 0.85 ? -0.16 : 0) + (hash(board, 0, 42) - 0.5) * 0.24 - (dy > 0 ? 0.06 : 0);
    if (edge) l = d < R0 + 3 ? 0.3 : 0.22;
    if (hash(x >> 1, y >> 1, 43) > 0.93) l -= 0.15; // humedad
    put(r, x, y, tone(M, l, x, y));
    if (!edge && Math.abs(d - (R0 + R1) / 2) < 0.6 && board % 3 === 0) put(r, x, y, PUERTO.hierro[3]); // clavos
  }
  // las sogas entre pilote y pilote, colgando hacia la poza
  const posts = 12, pr = R0 + 3;
  for (let k = 0; k < posts; k++) {
    const a0 = (k / posts) * Math.PI * 2, a1 = ((k + 1) / posts) * Math.PI * 2;
    for (let t = 0; t <= 1; t += 0.01) {
      const a = a0 + (a1 - a0) * t, rr = pr - 2 - Math.sin(t * Math.PI) * 7;
      put(r, c + Math.cos(a) * rr, c + Math.sin(a) * rr, PUERTO.red[t > 0.5 ? 1 : 2]);
    }
  }
  // los pilotes
  for (let k = 0; k < posts; k++) {
    const a = (k / posts) * Math.PI * 2, px = c + Math.cos(a) * pr, py = c + Math.sin(a) * pr;
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
      const dd = Math.hypot(x, y);
      if (dd < 5.6) put(r, px + x, py + y, dd > 4.4 ? M[0] : tone(M, 0.66 - (x + y) * 0.05, px + x, py + y));
    }
    put(r, px - 1, py - 2, M[5]); put(r, px + 2, py - 4, PUERTO.alga[2]);
  }
  return { name: 'anillo_poza', w: S, h: S, anchor: [c, c], solid: null, layer: 'suelo', anims: one(r) };
}

export function puertoObjectsA(): WorldObject[] {
  return [...dockLanterns(), lighthouseObject(), ...docks(), floatingDockObject(), tideWater(), poolRing()];
}

export { wood, stone, cloth, one, grounded, type Anim, type P };
