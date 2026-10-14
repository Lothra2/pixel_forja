import { createRaster, type Raster } from '../core/raster';
import { contactShadow } from './premium/contact';
import type { WorldObject } from './objects';
import { hash, put, glow, tone, outline, type Anim } from './puertoObjects';

/**
 * Mundo 5: La Ciudad Dormida (encargo F12, parte 2). Una ciudad de piedra enorme y hermosa debajo del puerto, con toda
 * la gente dormida de piedra en medio de lo que hacía. Cae polvo de sueño lila. La luz es de los faroles de plaza
 * (dorada y cálida), de las lámparas del palacio y de la corona del Rey.
 *
 * Como en el Puerto: sin sombra horneada con dirección. Cada objeto trae solo su sombra de contacto al pie.
 */

export const CIUDAD = {
  piedra: ['#0c1018', '#161c26', '#202836', '#2c3546', '#3a4458', '#4e586e', '#6a7488'],
  estatua: ['#3a4050', '#525a6a', '#6c7484', '#8a91a0', '#a8aebb', '#c8ccd8'],
  musgo: '#9aa8b8',
  musgoOscuro: '#6e7c8e',
  lila: '#b89aff',
  lilaOscuro: '#6a52a8',
  dorado: '#ffd890',
  celeste: '#7ad0ff',
  ventana: '#ffc070',
  hierro: ['#0a0c12', '#161a22', '#242a36', '#363e4c', '#4c5666', '#68748a'],
  oro: ['#5a3e16', '#8a6224', '#c08a34', '#e8b858', '#ffd890', '#fff4d0'],
  fuego: ['#8a3a10', '#c8701a', '#ffb050', '#ffd890', '#fff4d0'],
  agua: ['#1a3a5a', '#2a5a88', '#4a8ac0', '#8ac0e8', '#d8f0ff'],
  vidrioMuerto: ['#06080e', '#0e121c', '#161c2a', '#20283a'],
};
const P = CIUDAD.piedra, E = CIUDAD.estatua, I = CIUDAD.hierro;

const one = (fr: Raster) => ({ idle: { frames: [fr], fps: 1, loop: true } });
const grounded = (o: WorldObject, opts?: Parameters<typeof contactShadow>[2]): WorldObject => {
  const fr = (o.anims.idle ?? Object.values(o.anims)[0]).frames[0];
  return { ...o, shadow: contactShadow(fr, o.anchor, opts) };
};

/** Polvo de sueño asentado: motas lilas sobre lo que mira para arriba (lo dibujado que tiene aire encima). */
export function sleepDust(r: Raster, amount: number, seed: number) {
  const W = r.w;
  for (let y = 1; y < r.h; y++) for (let x = 0; x < W; x++) {
    const k = (y * W + x) * 4;
    if (r.data[k + 3] < 200 || r.data[k - W * 4 + 3] > 0) continue;
    if (hash(x, y, seed) < amount) put(r, x, y, hash(x, y, seed + 1) > 0.5 ? CIUDAD.lila : '#8a74c8', 220);
  }
}

/** Un bloque de piedra iluminado de arriba a la izquierda: x0..x1, y0..y1, con la cara de arriba más clara. */
function block(r: Raster, x0: number, y0: number, x1: number, y1: number, pal: string[], top = 2, seed = 1) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const u = (x - x0) / Math.max(1, x1 - x0);
    let l = 0.62 - u * 0.4 + (hash(x >> 1, y >> 1, seed) - 0.5) * 0.12;
    if (y - y0 < top) l += 0.25;
    if (y === y1) l -= 0.25;
    put(r, x, y, tone(pal, l, x, y));
  }
}

// ---------------------------------------------------------------- el farol de plaza (la fogata del piso)

/**
 * Farol de plaza (48 x 128): pedestal de tres escalones, poste de hierro acanalado con dos anillos y volutas, y un
 * farol grande de cuatro vidrios con su cúpula y el remate. `lit` 0 apagado (vidrio negro, polvo lila encima) a 1
 * prendido (luz dorada). `ring`: el anillo de luz que sube al prenderse (0 a 1, o -1 sin anillo). `thread`: la luz que
 * se va en un hilo hacia arriba cuando la roban (0 a 1).
 */
function plazaLantern(lit: number, f: number, ring = -1, thread = 0): Raster {
  const W = 48, H = 128, r = createRaster(W, H), cx = 24;
  // el pedestal: tres escalones de piedra
  block(r, 11, 115, 37, 124, P.slice(2), 2, 3);
  block(r, 14, 107, 34, 114, P.slice(2), 2, 4);
  block(r, 18, 99, 30, 106, P.slice(2), 2, 5);
  // una moldura en el escalón del medio
  for (let x = 15; x <= 33; x++) put(r, x, 110, P[2]);
  // el poste de hierro acanalado
  for (let y = 44; y < 99; y++) for (let x = 21; x <= 27; x++) {
    const u = (x - 21) / 6;
    let l = 0.72 - u * 0.6;
    if (x === 23 || x === 26) l -= 0.18; // las acanaladuras
    put(r, x, y, tone(I.slice(1), l, x, y));
  }
  // anillos y el pie del poste
  for (const [y, hw] of [[95, 5], [96, 5], [74, 4], [75, 4], [52, 4], [53, 4]] as [number, number][]) for (let x = cx - hw; x <= cx + hw; x++) put(r, x, y, tone(I.slice(1), 0.8 - ((x - cx + hw) / (hw * 2)) * 0.6, x, y));
  // las volutas que sostienen el farol: dos rulos de hierro
  for (const s of [-1, 1]) for (let t = 0; t < 1; t += 0.02) {
    const a = t * Math.PI * 1.6, rr = 5 - t * 3;
    const x = cx + s * (5 + Math.sin(a) * rr), y = 47 - Math.cos(a) * rr;
    put(r, x, y, I[s < 0 ? 4 : 3]);
  }
  // la base del farol
  for (let y = 38; y < 44; y++) { const hw = 7 + (y - 38) * 0.4; for (let x = Math.floor(cx - hw); x <= cx + hw; x++) put(r, x, y, tone(I.slice(1), 0.75 - (x - cx + hw) / (hw * 2) * 0.6 + (y === 38 ? 0.2 : 0), x, y)); }
  // la jaula: más ancha arriba, cuatro vidrios (se ven tres) con sus barrotes
  const glass = (y: number) => 7 + ((38 - y) / 22) * 3;
  for (let y = 16; y < 38; y++) {
    const hw = glass(y);
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
      const u = (x - (cx - hw)) / (hw * 2);
      const bar = Math.abs(u - 0.5) < 0.05 || u < 0.08 || u > 0.92 || y === 16 || y === 37 || y === 27;
      let c: string;
      if (bar) c = tone(I.slice(1), 0.7 - u * 0.5, x, y);
      else if (lit > 0) {
        // vidrio con luz: más blanco donde está la llama, dorado hacia los bordes
        const d = Math.hypot((x - cx) / hw, (y - 29) / 12);
        c = tone(CIUDAD.fuego, Math.min(1, lit) * (1.05 - d * 0.55) + 0.05 * Math.sin(f * 1.9 + y * 0.3), x, y, true);
      } else c = tone(CIUDAD.vidrioMuerto, 0.75 - u * 0.5 + (y < 20 ? 0.1 : 0), x, y);
      put(r, x, y, c);
    }
  }
  // vidrio apagado: un reflejo frío diagonal (se ve que es vidrio)
  if (lit <= 0) for (let t = 0; t < 8; t++) put(r, cx - 6 + t * 0.6, 32 - t * 1.6, '#3a4660');
  // la llama
  if (lit > 0.12) {
    const fh = (4 + lit * 5) * (0.88 + 0.12 * Math.sin(f * 2.3));
    for (let y = 0; y < fh; y++) { const w = Math.max(0.5, (1 - y / fh) * 2.2 * Math.min(1, lit)); for (let x = -w; x <= w; x++) put(r, cx + x + Math.sin(f + y) * 0.3, 34 - y, y < fh * 0.4 ? '#fffaf0' : '#fff0c0'); }
  }
  // la cúpula: alero, domo con gajos y el remate con una bolita y una punta
  for (let y = 12; y < 17; y++) { const hw = 12 - (16 - y) * 0.3; for (let x = Math.floor(cx - hw); x <= cx + hw; x++) put(r, x, y, tone(I.slice(1), (y === 12 ? 0.85 : 0.6) - (x - cx + hw) / (hw * 2) * 0.5, x, y)); }
  for (let y = 4; y < 12; y++) {
    const hw = 9 * Math.sqrt(Math.max(0, 1 - ((12 - y) / 8.5) ** 2));
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
      const u = (x - cx) / Math.max(1, hw);
      const rib = Math.abs(Math.sin(Math.asin(Math.max(-1, Math.min(1, u))) * 3)) < 0.18;
      put(r, x, y, tone(I.slice(1), 0.78 - u * 0.4 - (rib ? 0.25 : 0), x, y));
    }
  }
  for (let y = 0; y < 4; y++) put(r, cx, y, I[4]);
  for (const [x, y] of [[cx - 1, 2], [cx + 1, 2]]) put(r, x, y, I[3]);
  outline(r, '#05070c');
  // apagado: polvo de sueño sobre el domo, el alero y los escalones
  if (lit <= 0 && thread <= 0) sleepDust(r, 0.35, 11);
  if (lit > 0) glow(r, cx, 27, 22, CIUDAD.dorado, Math.min(1.2, lit) * (0.92 + 0.08 * Math.sin(f * 1.7)));
  // el anillo de luz que nace en el farol y sube abriéndose
  if (ring >= 0 && ring <= 1) {
    const ry = 27 - ring * 24, rx = 8 + ring * 14, a = Math.round(230 * (1 - ring) ** 0.7);
    for (let t = 0; t < Math.PI * 2; t += 0.04) put(r, cx + Math.cos(t) * rx, ry + Math.sin(t) * rx * 0.3, Math.sin(t) > 0 ? '#fff4d0' : CIUDAD.dorado, a);
  }
  // la luz robada: un hilo dorado que sale del farol hacia arriba y se va
  if (thread > 0) {
    const top = 27 - thread * 40, bot = 27 - Math.max(0, thread - 0.45) * 50;
    for (let y = Math.max(0, Math.floor(top)); y <= bot; y++) { const k = (y - top) / Math.max(1, bot - top); put(r, cx + Math.sin(y * 0.5 + f) * 1.2, y, k < 0.3 ? '#fff4d0' : CIUDAD.dorado, Math.round(240 * (1 - k * 0.5))); }
    if (lit <= 0.05) for (let i = 0; i < 5; i++) put(r, cx - 3 + hash(i, f, 3) * 6, 30 - hash(f, i, 4) * 10 * thread, '#3a3a50', 160);
  }
  return r;
}

function plazaLanterns(): WorldObject[] {
  const base = { w: 48, h: 128, anchor: [24, 124] as [number, number], solid: [-8, -8, 16, 8] as [number, number, number, number] };
  const light = { color: CIUDAD.dorado, radius: 320, flicker: true, dy: 97 };
  const prendido: Anim = { frames: Array.from({ length: 8 }, (_, f) => plazaLantern(1, f)), fps: 7, loop: true };
  // prenderse: la chispa, la llama que crece, el vidrio que se llena de luz y el anillo que sube
  const lits = [0, 0.06, 0.14, 0.26, 0.4, 0.56, 0.72, 0.88, 1.05, 1.15, 1.05, 1];
  const prenderse: Anim = { frames: lits.map((k, f) => plazaLantern(k, f, f >= 5 ? (f - 5) / 6 : -1)), fps: 12, loop: false };
  // robado: la luz se va en un hilo para arriba y el vidrio queda negro
  const robado: Anim = { frames: Array.from({ length: 10 }, (_, f) => plazaLantern(Math.max(0, 1 - f / 6), f, -1, (f + 1) / 10)), fps: 9, loop: false };
  const apagado = plazaLantern(0, 0);
  return [
    grounded({ name: 'farol_plaza_apagado', ...base, anims: one(apagado) }, { rows: 4, spread: 3, tall: 3 }),
    grounded({ name: 'farol_plaza_prendido', ...base, light, anims: { idle: prendido } }, { rows: 4, spread: 3, tall: 3 }),
    grounded({ name: 'farol_plaza_prenderse', ...base, light, anims: { idle: prenderse } }, { rows: 4, spread: 3, tall: 3 }),
    grounded({ name: 'farol_plaza_robado', ...base, anims: { idle: robado } }, { rows: 4, spread: 3, tall: 3 }),
  ];
}

// ---------------------------------------------------------------- la chispa de la luz robada

/** Chispa (16 x 16, 8 cuadros a 7 fps): una estrellita dorada de cuatro puntas que flota y titila. */
function spark(): WorldObject {
  const frames: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const r = createRaster(16, 16), ph = (f / 8) * Math.PI * 2;
    const cy = 8 + Math.sin(ph) * 1.5, cx = 8, k = 0.75 + 0.25 * Math.sin(ph * 2);
    glow(r, cx, cy, 7, CIUDAD.dorado, 1.1 * k);
    const L = Math.round(2 + k * 3);
    for (let t = -L; t <= L; t++) { const a = Math.round(255 * (1 - Math.abs(t) / (L + 1))); put(r, cx + t, cy, Math.abs(t) < 2 ? '#fffaf0' : CIUDAD.dorado, a); put(r, cx, cy + t, Math.abs(t) < 2 ? '#fffaf0' : CIUDAD.dorado, a); }
    for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) put(r, cx + dx, cy + dy, '#ffe8a8', 200);
    // una motita que la sigue
    put(r, cx + Math.cos(ph) * 5, cy + Math.sin(ph) * 3, '#fff4d0', 180);
    frames.push(r);
  }
  return { name: 'chispa_luz', w: 16, h: 16, anchor: [8, 12], solid: null, light: { color: CIUDAD.dorado, radius: 50, pulse: true, dy: 4 }, anims: { idle: { frames, fps: 7, loop: true } } };
}

// ---------------------------------------------------------------- las lámparas del trono

/** Lámpara del trono (32 x 96): una columnita de piedra clara con capitel y un brasero de oro con llama dorada. */
function throneLamp(lit: number, f: number): Raster {
  const W = 32, H = 96, r = createRaster(W, H), cx = 16;
  block(r, 7, 86, 25, 92, E, 2, 21);
  block(r, 9, 81, 23, 85, E, 2, 22);
  // el fuste con estrías
  for (let y = 36; y < 81; y++) for (let x = 11; x <= 21; x++) {
    const u = (x - 11) / 10;
    let l = 0.78 - u * 0.55;
    if ((x - 11) % 3 === 2) l -= 0.15;
    put(r, x, y, tone(E, l, x, y));
  }
  // el capitel y el brasero de oro
  block(r, 8, 31, 24, 35, E, 2, 23);
  for (let y = 22; y < 31; y++) { const hw = 6 + (31 - y) * 0.55; for (let x = Math.floor(cx - hw); x <= cx + hw; x++) put(r, x, y, tone(CIUDAD.oro, 0.85 - (x - cx + hw) / (hw * 2) * 0.6 + (y === 22 ? 0.15 : 0), x, y)); }
  for (let x = cx - 11; x <= cx + 11; x++) put(r, x, 22, CIUDAD.oro[lit > 0 ? 5 : 3]);
  // la llama
  if (lit > 0.1) for (let k = 0; k < 3; k++) {
    const ox = (k - 1) * 4, fh = (8 + lit * 6 - Math.abs(k - 1) * 3) * (0.85 + 0.15 * Math.sin(f * 2.1 + k * 2));
    for (let y = 0; y < fh; y++) { const w = Math.max(0.5, (1 - y / fh) * 2.6 * Math.min(1, lit)); for (let x = -w; x <= w; x++) put(r, cx + ox + x + Math.sin(f * 1.3 + y * 0.4 + k) * (y / fh) * 1.6, 21 - y, tone(CIUDAD.fuego, 1 - y / fh + 0.25, x, y)); }
  } else for (let x = cx - 8; x <= cx + 8; x++) put(r, x, 21, x % 3 ? '#2a2a32' : '#3a3a44'); // las brasas frías
  outline(r, '#06070c');
  if (lit <= 0) sleepDust(r, 0.3, 27);
  if (lit > 0) glow(r, cx, 14, 15, CIUDAD.dorado, Math.min(1.2, lit));
  return r;
}

function throneLamps(): WorldObject[] {
  const base = { w: 32, h: 96, anchor: [16, 92] as [number, number], solid: [-6, -6, 12, 6] as [number, number, number, number] };
  const light = { color: CIUDAD.dorado, radius: 200, flicker: true, dy: 76 };
  return [
    grounded({ name: 'lampara_trono_apagada', ...base, anims: one(throneLamp(0, 0)) }),
    grounded({ name: 'lampara_trono_prendida', ...base, light, anims: { idle: { frames: Array.from({ length: 8 }, (_, f) => throneLamp(1, f)), fps: 7, loop: true } } }),
    grounded({ name: 'lampara_trono_prenderse', ...base, light, anims: { idle: { frames: [0, 0.08, 0.2, 0.35, 0.5, 0.68, 0.84, 1, 1.12, 1.04, 1].map((k, f) => throneLamp(k, f)), fps: 11, loop: false } } }),
  ];
}

// ---------------------------------------------------------------- la fuente de la plaza

/**
 * La fuente (96 x 96): pileta redonda de piedra clara (vista de arriba en 3/4), una columna con una taza en el medio
 * honda y un capullo de piedra arriba. `quieta`: seca, con grietas y polvo lila en el fondo. `corre` (8 cuadros a 7 fps):
 * el agua sale del capullo, cae de la taza en cortina y ondula en la pileta.
 */
function fountain(water: boolean, f: number): Raster {
  const W = 96, H = 96, r = createRaster(W, H), cx = 48, cy = 66, RX = 44, RY = 22;
  // el borde de la pileta: un anillo grueso con el canto de arriba claro y la cara de adelante
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x + 0.5 - cx) / RX, (y + 0.5 - cy) / RY);
    const dFront = Math.hypot((x + 0.5 - cx) / RX, (y + 0.5 - cy - 6) / RY);
    if (d < 1 && d > 0.78) {
      const a = Math.atan2(y - cy, x - cx);
      let l = 0.62 - Math.cos(a + 0.6) * 0.18 + (hash(Math.floor((a + Math.PI) * 9), 0, 31) - 0.5) * 0.1;
      if (d > 0.95 || d < 0.81) l -= 0.18;
      if (Math.abs(((a + Math.PI) * 9) % 1) < 0.07) l -= 0.25; // juntas de las piedras del borde
      put(r, x, y, tone(E, l, x, y));
    } else if (d >= 1 && dFront < 1 && y > cy) {
      // la cara de adelante del borde (alto 6)
      const l = 0.42 - ((x - cx) / RX) * 0.25 - ((y - cy) / 30) * 0.2;
      put(r, x, y, tone(E, l, x, y));
    } else if (d <= 0.78) {
      // el adentro de la pileta: seco (piedra con grietas) o con agua
      if (water) {
        const ph = (f / 8) * Math.PI * 2, rr = Math.hypot((x - cx) / RX, (y - cy) / RY);
        const wave = Math.sin(rr * 22 - ph * 2);
        let c = tone(CIUDAD.agua, 0.45 + wave * 0.12 + (y < cy ? 0.08 : 0), x, y, true);
        if (wave > 0.86 && hash(x, y, f) > 0.4) c = CIUDAD.agua[4];
        put(r, x, y, c, 235);
      } else {
        let l = 0.32 + (hash(x >> 2, y >> 2, 33) - 0.5) * 0.1 - (y < cy - 8 ? 0.08 : 0);
        if (Math.abs(Math.sin(x * 0.31 + y * 0.12) + Math.sin(y * 0.5 - x * 0.05)) < 0.05) l = 0.12; // grietas secas
        put(r, x, y, tone(E, l, x, y));
        if (hash(x, y, 35) > 0.93) put(r, x, y, CIUDAD.lila, 180);
      }
    }
  }
  // el pie (una base redonda), la columna torneada que se abre abajo y la taza honda vista desde arriba en 3/4
  for (let y = 58; y < 68; y++) {
    const hw = y < 64 ? 7 : 10 * Math.sqrt(Math.max(0, 1 - ((y - 64) / 4) ** 2));
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) put(r, x, y, tone(E, (y === 58 || y === 64 ? 0.8 : 0.66) - (x - cx + hw) / (hw * 2 + 1) * 0.5, x, y));
  }
  for (let y = 34; y < 58; y++) {
    const t = (y - 34) / 24, hw = 3 + t * 2.2 + Math.exp(-(((y - 45) / 2.5) ** 2)) * 2.2;
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) put(r, x, y, tone(E, 0.8 - (x - cx + hw) / (hw * 2 + 1) * 0.55 + (y === 43 ? 0.1 : 0) + (y === 47 ? -0.12 : 0), x, y));
  }
  const TR = 18, TY = 27, TRY = 5;
  for (let y = TY; y < TY + 11; y++) {
    const hw = TR * Math.cos(((y - TY) / 11) * Math.PI / 2) + 1;
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) put(r, x, y, tone(E, 0.62 - (x - cx + hw) / (hw * 2 + 1) * 0.5 - (y - TY) * 0.02, x, y));
  }
  for (let y = TY - TRY; y <= TY + TRY; y++) for (let x = cx - TR; x <= cx + TR; x++) {
    const d = Math.hypot((x - cx) / TR, (y - TY) / TRY);
    if (d > 1) continue;
    if (d > 0.72) put(r, x, y, tone(E, (y < TY ? 0.86 : 0.7) - (x - cx) / TR * 0.12, x, y));
    else put(r, x, y, water ? tone(CIUDAD.agua, 0.58 + Math.sin(x * 0.6 + f) * 0.14, x, y) : tone(E, 0.26 + (y > TY ? 0.06 : 0), x, y));
  }
  if (!water) for (let x = cx - 8; x <= cx + 8; x += 4) put(r, x, TY + 1, CIUDAD.lila, 170);
  // del medio de la taza sale un capullo de flor de piedra (tres pétalos) por donde sale el agua
  for (let y = 12; y < 27; y++) for (let x = cx - 7; x <= cx + 7; x++) {
    const t = (y - 12) / 15;
    const side = Math.abs(x - cx) - (y < 23 ? 6 * Math.sin(t * Math.PI * 0.85) : 2.5);
    if (side > 0) continue;
    const petal = Math.abs(Math.abs(x - cx) - 3.5) < 0.6 && y < 22;
    put(r, x, y, tone(E, 0.86 - (x - cx + 7) / 14 * 0.5 - (petal ? 0.2 : 0) - (y > 22 ? 0.15 : 0), x, y));
  }
  for (const s2 of [-1, 1]) for (let t = 0; t < 5; t++) put(r, cx + s2 * (5 + t), 25 - t * 0.6, E[3]);
  outline(r, '#06080e');
  if (water) {
    // el chorro que sube del capullo, abre en arco y cae en la taza; y la cortina que cae del borde de la taza a la pileta
    for (let t = 0; t < 1; t += 0.01) for (const s of [-1, 1]) {
      const x = cx + s * t * 15, y = 11 - Math.sin(t * Math.PI) * 7 + t * 15;
      if (hash(Math.round(t * 100), f, 41) > 0.25) put(r, x, y, (Math.round(t * 30) + f) % 4 ? CIUDAD.agua[3] : CIUDAD.agua[4], 230);
    }
    for (let x = cx - TR; x <= cx + TR; x++) {
      const dx = (x - cx) / TR, lip = TY + TRY * Math.sqrt(Math.max(0, 1 - dx * dx)) + 1, edge = Math.abs(dx) > 0.7;
      for (let y = Math.floor(lip); y < 46 + Math.abs(x - cx) * 0.35; y++) {
        if ((x + f * 2 + Math.floor(y / 3)) % (edge ? 3 : 5) === 0) put(r, x, y + ((f + x) % 3), CIUDAD.agua[4], edge ? 190 : 140);
        else if (hash(x, y + f * 7, 43) > (edge ? 0.6 : 0.85)) put(r, x, y, CIUDAD.agua[3], 120);
      }
    }
    // gotitas que saltan al caer
    for (let i = 0; i < 8; i++) { const a = hash(i, 1, 47) * Math.PI * 2, t = ((f + i) % 8) / 8; put(r, cx + Math.cos(a) * (18 + t * 6), 50 + Math.sin(a) * 6 - Math.sin(t * Math.PI) * 4, CIUDAD.agua[4], 200); }
  } else sleepDust(r, 0.25, 49);
  return r;
}

function fountainObject(): WorldObject {
  const quieta = fountain(false, 0);
  return {
    name: 'fuente_plaza', w: 96, h: 96, anchor: [48, 88], solid: [-32, -24, 64, 24],
    anims: { idle: { frames: [quieta], fps: 1, loop: true }, quieta: { frames: [quieta], fps: 1, loop: true }, corre: { frames: Array.from({ length: 8 }, (_, f) => fountain(true, f)), fps: 7, loop: true } },
    shadow: contactShadow(quieta, [48, 88], { rows: 6, spread: 2, tall: 3 }),
  };
}

// ---------------------------------------------------------------- la torre del reloj

/**
 * La torre del reloj (128 x 288): base ancha con la puerta en arco, el fuste con ventanitas, el cuerpo del reloj con
 * su esfera grande de números romanos (rayitas, sin letras), el campanario con la campana y el techo en punta.
 * `parado` (1 cuadro: las agujas paradas en las doce menos diez, polvo lila en las cornisas) y `andando` (4 cuadros a
 * 2 fps: las agujas avanzan y la campana se mece).
 */
function clockTower(going: boolean, f: number): Raster {
  const W = 128, H = 288, r = createRaster(W, H), cx = 64;
  const hwAt = (y: number) => (y > 230 ? 46 : y > 150 ? 36 : y > 70 ? 38 : 30);
  // sillares de la torre
  for (let y = 40; y < 282; y++) {
    const hw = hwAt(y), row = Math.floor(y / 10), off = row % 2 ? 6 : 0;
    for (let x = cx - hw; x <= cx + hw; x++) {
      const u = (x - cx) / hw;
      const joint = y % 10 === 0 || (x + off) % 12 === 0;
      let l = 0.66 - u * 0.36 + (hash(Math.floor((x + off) / 12), row, 51) - 0.5) * 0.14;
      if (y > 270) l -= 0.12;
      let c = joint ? P[3] : tone(P.slice(2), l, x, y);
      if (!joint && hash(x >> 1, y >> 1, 53) > 0.985) c = CIUDAD.musgo;
      put(r, x, y, c);
    }
  }
  // cornisas
  for (const [y, hw] of [[230, 48], [150, 40], [70, 40]] as [number, number][]) for (let yy = y - 3; yy <= y; yy++) for (let x = cx - hw; x <= cx + hw; x++) put(r, x, yy, tone(E, (yy === y - 3 ? 0.9 : 0.55) - (x - cx) / hw * 0.25, x, yy));
  // la puerta en arco y dos ventanitas
  for (let y = 246; y < 282; y++) for (let x = cx - 12; x <= cx + 12; x++) { const inA = y > 258 || Math.hypot(x - cx, y - 258) < 12; if (inA) put(r, x, y, Math.abs(x - cx) > 10.5 || (y < 258 && Math.hypot(x - cx, y - 258) > 10.5) ? E[3] : '#04060a'); }
  for (const [wx, wy] of [[cx - 22, 186], [cx + 16, 186], [cx - 3, 168]]) for (let y = wy; y < wy + 14; y++) for (let x = wx; x < wx + 7; x++) put(r, x, y, y === wy || x === wx ? E[2] : '#05070c');
  // el reloj: esfera clara con el borde de oro, las rayitas de las horas y las agujas
  const cy = 108, R = 30;
  for (let y = cy - R - 3; y <= cy + R + 3; y++) for (let x = cx - R - 3; x <= cx + R + 3; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d > R + 3) continue;
    if (d > R) put(r, x, y, tone(CIUDAD.oro, 0.8 - (x - cx) / R * 0.4 - (y - cy) / R * 0.2, x, y));
    else put(r, x, y, tone(E.slice(3), 0.85 - d / R * 0.4 - (x - cx + y - cy) / (R * 6), x, y));
  }
  for (let h = 0; h < 12; h++) { const a = (h / 12) * Math.PI * 2; for (let t = R - 6; t < R - 1; t++) { put(r, cx + Math.sin(a) * t, cy - Math.cos(a) * t, h % 3 ? E[1] : P[1]); if (h % 3 === 0) put(r, cx + Math.sin(a) * t + 1, cy - Math.cos(a) * t, P[1]); } }
  const minute = going ? (50 + f * 15) / 60 : 50 / 60, hour = going ? (11 + (50 + f * 15) / 60) / 12 : (11 + 50 / 60) / 12;
  for (const [ang, L, w] of [[minute * Math.PI * 2, R - 6, 1], [hour * Math.PI * 2, R - 13, 2]] as [number, number, number][]) for (let t = -3; t < L; t++) for (let k = -w + 1; k < w; k++) put(r, cx + Math.sin(ang) * t + Math.cos(ang) * k * 0.7, cy - Math.cos(ang) * t + Math.sin(ang) * k * 0.7, I[1]);
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y < 5) put(r, cx + x, cy + y, CIUDAD.oro[3]);
  // el campanario: arcos abiertos con la campana adentro
  for (let y = 40; y < 68; y++) for (let x = cx - 24; x <= cx + 24; x++) {
    const inArch = Math.abs(x - cx) < 18 && (y > 50 || Math.hypot(x - cx, y - 50) < 18);
    if (inArch) put(r, x, y, '#06080e');
  }
  const swing = going ? [0, 6, 0, -6][f % 4] : 0;
  for (let y = 46; y < 66; y++) { const hw = 3 + (y - 46) * 0.45; for (let x = -hw; x <= hw; x++) put(r, cx + x + ((y - 46) / 20) * swing, y, tone(CIUDAD.oro, 0.85 - (x + hw) / (hw * 2) * 0.6, x, y)); }
  // el techo en punta con tejas de pizarra y la veleta
  for (let y = 6; y < 41; y++) {
    const hw = ((y - 6) / 35) * 34;
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
      const row = Math.floor(y / 4), sh = Math.floor((x + (row % 2) * 3) / 6);
      let l = 0.55 - (x - cx) / Math.max(1, hw) * 0.3 + (hash(sh, row, 57) - 0.5) * 0.15 + (y % 4 === 3 ? -0.2 : 0);
      put(r, x, y, tone(P.slice(1), l, x, y));
    }
  }
  for (let y = 0; y < 8; y++) put(r, cx, y, I[4]);
  for (let x = -4; x <= 4; x++) put(r, cx + x, 3, I[3]);
  outline(r, '#05070c');
  if (!going) sleepDust(r, 0.3, 59);
  return r;
}

function clockTowerObject(): WorldObject {
  const parado = clockTower(false, 0);
  return {
    name: 'torre_reloj', w: 128, h: 288, anchor: [64, 280], solid: [-48, -32, 96, 32],
    anims: { idle: { frames: [parado], fps: 1, loop: true }, parado: { frames: [parado], fps: 1, loop: true }, andando: { frames: [0, 1, 2, 3].map((f) => clockTower(true, f)), fps: 2, loop: true } },
    shadow: contactShadow(parado, [64, 280], { rows: 6, spread: 4, tall: 4 }),
  };
}

// ---------------------------------------------------------------- el trono del Rey

/**
 * El trono (128 x 128): respaldo alto de piedra clara con un arco tallado y una luna dormida arriba, apoyabrazos con
 * leones de piedra dormidos, el almohadón gris (era rojo) y tres escalones adelante. Vacío: el Rey pelea delante.
 */
function throne(): Raster {
  const W = 128, H = 128, r = createRaster(W, H), cx = 64;
  // los escalones
  for (let k = 0; k < 3; k++) block(r, 18 + k * 6, 112 - k * 7, 110 - k * 6, 118 - k * 7, E, 2, 61 + k);
  // el asiento y el respaldo
  block(r, 34, 70, 94, 92, E, 3, 64);
  for (let y = 10; y < 72; y++) {
    const hw = 26 - Math.max(0, 30 - y) * 0.2;
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
      const u = (x - cx) / hw;
      let l = 0.7 - u * 0.35 + (hash(x >> 2, y >> 2, 65) - 0.5) * 0.08;
      // el arco tallado del respaldo (un hundido)
      const inner = Math.abs(x - cx) < 16 && (y > 34 || Math.hypot(x - cx, y - 34) < 16) && y < 68;
      if (inner) l -= 0.22;
      if (inner && (Math.abs(Math.abs(x - cx) - 16) < 1 || Math.abs(Math.hypot(x - cx, y - 34) - 16) < 0.8)) l -= 0.15;
      put(r, x, y, tone(E, l, x, y));
    }
  }
  // la luna dormida arriba del respaldo (una medialuna con un ojito cerrado)
  for (let y = 0; y < 22; y++) for (let x = cx - 12; x <= cx + 12; x++) {
    const d = Math.hypot(x - cx, y - 11), d2 = Math.hypot(x - cx - 5, y - 8);
    if (d < 10 && d2 > 8) put(r, x, y, tone(CIUDAD.oro, 0.8 - (x - cx) / 20, x, y));
  }
  for (let t = 0; t < 4; t++) put(r, cx - 6 + t, 12 + (t === 0 || t === 3 ? 0 : 1), CIUDAD.oro[0]);
  // el almohadón
  for (let y = 66; y < 76; y++) for (let x = 38; x <= 90; x++) put(r, x, y, tone(['#3a3e4c', '#4c5262', '#5e6476', '#727a8c'], 0.75 - (x - 38) / 52 * 0.4 - (y > 72 ? 0.2 : 0), x, y));
  // los apoyabrazos con un león dormido cada uno (la cabeza apoyada en las patas)
  for (const s of [-1, 1]) {
    const ax = cx + s * 36;
    block(r, ax - 8, 58, ax + 8, 92, E, 3, 66 + s);
    for (let y = 46; y < 62; y++) for (let x = ax - 9; x <= ax + 9; x++) {
      const d = Math.hypot((x - ax) / 8.5, (y - 54) / 7);
      if (d < 1) put(r, x, y, tone(E, 0.78 - (x - ax) / 18 - (y - 54) / 30, x, y));
      // la melena: anillo de rulos
      if (d > 0.72 && d < 1 && hash(x, y, 68) > 0.5) put(r, x, y, E[2]);
    }
    for (const ex of [-3, 3]) put(r, ax + ex, 53, E[0]);
    put(r, ax, 57, E[1]);
  }
  outline(r, '#05070c');
  sleepDust(r, 0.2, 69);
  return r;
}

function throneObject(): WorldObject {
  const fr = throne();
  return { name: 'trono_rey', w: 128, h: 128, anchor: [64, 120], solid: [-46, -40, 92, 40], anims: one(fr), shadow: contactShadow(fr, [64, 120], { rows: 6, spread: 2, tall: 3 }) };
}

// ---------------------------------------------------------------- la cajita de música

/**
 * La cajita de música (32 x 32, 6 cuadros a 6 fps): caja de madera con tapa abierta y espejito, y la bailarina que
 * gira en puntas. Es lo único de la ciudad que nunca se durmió: tiene un brillito lila.
 */
function musicBox(): WorldObject {
  const frames: Raster[] = [];
  for (let f = 0; f < 6; f++) {
    const r = createRaster(32, 32), wood = ['#2a1810', '#4a2a1a', '#6a3e24', '#8a5634', '#a8704a'];
    // la caja
    for (let y = 18; y < 29; y++) for (let x = 6; x <= 26; x++) put(r, x, y, tone(wood, y < 20 ? 0.9 : 0.6 - (x - 6) / 20 * 0.4, x, y));
    for (let x = 7; x <= 25; x++) put(r, x, 23, CIUDAD.oro[3]);
    // la tapa abierta con el espejito
    for (let y = 6; y < 18; y++) for (let x = 7; x <= 25; x++) put(r, x, y, x < 9 || x > 23 || y < 8 ? tone(wood, 0.7, x, y) : tone(['#4a5a7a', '#7a8aa8', '#b8c8e0'], 0.5 + (x - y) / 40, x, y));
    // la bailarina: gira (se angosta y se ensancha la falda, el brazo cambia de lado)
    const ph = (f / 6) * Math.PI * 2, wSk = 3.4 * Math.abs(Math.cos(ph)) + 1.2;
    for (let y = 12; y < 19; y++) put(r, 16, y, '#f0d8c8');
    for (let y = 14; y < 17; y++) for (let x = -wSk; x <= wSk; x++) put(r, 16 + x, y, x < 0 ? '#f8c8d8' : '#e8a8c0');
    put(r, 16, 10, '#f0d8c8'); put(r, 16, 11, '#f0d8c8'); put(r, 15, 10, '#5a3a22');
    const ax = Math.round(Math.sin(ph) * 3);
    put(r, 16 + ax, 11, '#f0d8c8'); put(r, 16 - ax, 12, '#f0d8c8');
    outline(r, '#0a0608');
    // las notas que se escapan
    const nx = 22 + ((f * 2) % 6), ny = 8 - (f % 3) * 2;
    put(r, nx, ny, CIUDAD.lila); put(r, nx, ny - 1, CIUDAD.lila); put(r, nx + 1, ny - 2, CIUDAD.lila);
    glow(r, 16, 14, 9, CIUDAD.lila, 0.5);
    frames.push(r);
  }
  return grounded({ name: 'cajita_musica', w: 32, h: 32, anchor: [16, 29], solid: [-9, -5, 18, 5], light: { color: CIUDAD.lila, radius: 40, pulse: true, dy: 12 }, anims: { idle: { frames, fps: 6, loop: true } } });
}

// ---------------------------------------------------------------- los jardines de piedra

/** Seto de piedra (64 x 64, sólido): arbusto tallado de piedra con hojitas en relieve, cada uno con otra forma. */
function hedge(v: number): WorldObject {
  const r = createRaster(64, 64), cx = 32;
  // la silueta de cada uno: 0 caja recortada con almenas de hojas, 1 domo, 2 domo bajo con una bola tallada, 3 dos pisos
  const inside = (x: number, y: number): number => {
    const bump = (hash(x >> 2, y >> 2, 71 + v) - 0.5) * 2.2;
    const ax = Math.abs(x + 0.5 - cx);
    if (y >= 60) return 0;
    if (v === 0) return ax < 29 && y > 20 + bump + (Math.floor(x / 8) % 2 ? 0 : -3) ? 1 : 0;
    if (v === 1) return (ax / 30) ** 2 + ((y - 60) / 46) ** 2 < 1 && y > 12 + bump ? 1 : 0;
    if (v === 2) return (ax / 29) ** 2 + ((y - 60) / 34) ** 2 < 1 && y > 26 + bump ? 1 : Math.hypot(x - cx, y - 17) < 9 + bump * 0.3 ? 2 : 0;
    return (ax < 29 && y > 36 + bump) || (ax < 19 && y > 18 + bump) ? (y > 36 ? 1 : 3) : 0;
  };
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const k = inside(x, y);
    if (!k) continue;
    const dx = (x + 0.5 - cx) / 30;
    // hojitas en relieve: celdas con luz arriba a la izquierda; la cara de adelante más oscura que la de arriba
    const lx = (x + (Math.floor(y / 5) % 2) * 3) % 6, ly = y % 5;
    const topFace = k === 1 ? !inside(x, y - 3) : k === 3 ? !inside(x, y - 3) : false;
    let l = (k === 2 ? 0.72 : 0.5) - dx * 0.25 + (topFace ? 0.18 : 0) + (lx < 2 && ly < 2 ? 0.14 : lx > 4 || ly > 3 ? -0.14 : 0);
    if (y > 54) l -= 0.2;
    if (k === 2) l = 0.78 - (x - cx) / 20 - (y - 17) / 30;
    let c = tone(E, l, x, y);
    if (k !== 2 && hash(x >> 1, y >> 1, 73 + v) > 0.88) c = CIUDAD.musgo;
    // florcitas de piedra y alguna mota lila entre las hojas
    if (k === 1 && hash(x, y, 79 + v) > 0.985) c = E[5];
    put(r, x, y, c);
  }
  outline(r, '#06080e');
  sleepDust(r, 0.3, 75 + v);
  return grounded({ name: `seto_piedra_${v}`, w: 64, h: 64, anchor: [32, 60], solid: [-30, -16, 60, 16], anims: one(r) }, { rows: 4, spread: 2, tall: 2.6 });
}

/** Flor de piedra (32 x 32): una flor grande tallada en piedra clara sobre su tallo, con pétalos de distinta forma. */
function stoneFlower(v: number): WorldObject {
  const r = createRaster(32, 32), cx = 16, cy = 12 + (v % 2) * 2, n = [5, 6, 8, 4][v], pr = [6, 5.5, 4.6, 7][v];
  for (let y = cy; y < 30; y++) put(r, cx + Math.sin(y * 0.3 + v) * 0.6, y, E[2]);
  for (const s of [-1, 1]) for (let t = 0; t < 5; t++) put(r, cx + s * (1 + t), 22 + v % 2 - t * 0.6 + t * t * 0.12, E[3]);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + v;
    for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) {
      const px = x * Math.cos(a) + y * Math.sin(a), py = -x * Math.sin(a) + y * Math.cos(a);
      if ((px - pr * 0.8) ** 2 / (pr * 0.8) ** 2 + py * py / (pr * 0.42) ** 2 < 1) put(r, cx + x, cy + y * 0.8, tone(E, 0.8 - (x + y) / 24 - (px > pr * 1.2 ? 0.15 : 0), x, y));
    }
  }
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y < 5) put(r, cx + x, cy + y * 0.8, E[1]);
  outline(r, '#06080e');
  sleepDust(r, 0.3, 77 + v);
  return { name: `flor_piedra_${v}`, w: 32, h: 32, anchor: [16, 29], solid: null, anims: one(r), shadow: contactShadow(r, [16, 29], { rows: 3, spread: 2, tall: 1.6 }) };
}

/**
 * Árbol de piedra (64 x 96): tronco y copa de piedra clara con hojas en relieve, musgo plateado y polvo lila. Cada uno
 * con otra forma. `dormida` (1 cuadro) y `despierta` (2 cuadros a 2 fps): vuelve el verde y la copa se mece apenas.
 */
function stoneTree(v: number, awake: boolean, f: number): Raster {
  const W = 64, H = 96, r = createRaster(W, H), cx = 32;
  const bark = awake ? ['#2a1a12', '#4a3020', '#6a4a30', '#8a6a48'] : E.slice(0, 4);
  const leafP = awake ? ['#1e3a22', '#2e5a32', '#4a8a46', '#7ab85a', '#a8d878'] : E.slice(1);
  // el tronco con dos raíces y una rama
  for (let y = 54; y < 92; y++) { const hw = 3.4 + Math.max(0, y - 82) * 0.5; for (let x = -hw; x <= hw; x++) put(r, cx + x + Math.sin(y * 0.15 + v) * 1.2, y, tone(bark, 0.7 - x / (hw * 2.4) + ((y + v) % 7 === 0 ? -0.2 : 0), x, y)); }
  for (const s of [-1, 1]) for (let t = 0; t < 7; t++) put(r, cx + s * (4 + t), 90 + t * 0.2, bark[1]);
  // la copa: racimos de hojas (bolas con hojitas en relieve), distinta en cada uno
  const clusters = ([
    [[32, 30, 18], [18, 40, 12], [46, 40, 12], [32, 48, 13], [24, 22, 10], [40, 22, 10]],
    [[32, 24, 13], [32, 40, 16], [20, 48, 10], [44, 48, 10], [32, 12, 8]],
    [[26, 34, 15], [42, 30, 14], [34, 46, 14], [20, 48, 9], [46, 46, 9], [32, 18, 11]],
  ] as [number, number, number][][])[v];
  const sway = awake ? (f ? 1 : 0) : 0;
  for (const [ccx, ccy, rad] of clusters) for (let y = Math.floor(ccy - rad); y <= ccy + rad; y++) for (let x = Math.floor(ccx - rad); x <= ccx + rad; x++) {
    const dx = (x - ccx) / rad, dy = (y - ccy) / (rad * 0.86), d = dx * dx + dy * dy + (hash(x >> 1, y >> 1, 211 + v) - 0.5) * 0.25;
    if (d > 1) continue;
    const lx = (x + (Math.floor(y / 4) % 2) * 2) % 4, ly = y % 4;
    let l = 0.6 - dx * 0.25 - dy * 0.3 + (lx < 2 && ly < 2 ? 0.14 : lx === 3 || ly === 3 ? -0.12 : 0);
    if (d > 0.8) l -= 0.15;
    let c = tone(leafP, l, x, y);
    if (!awake && hash(x >> 1, y >> 1, 213 + v) > 0.92) c = CIUDAD.musgo;
    if (awake && hash(x, y, 215 + v) > 0.985) c = ['#f0d8e8', '#ffe880', '#f4f0e8'][v];
    put(r, x + sway * (y < 40 ? 1 : 0), y, c);
  }
  outline(r, '#05070c');
  if (!awake) sleepDust(r, 0.3, 217 + v);
  return r;
}

function stoneTrees(): WorldObject[] {
  return [0, 1, 2].map((v) => {
    const d = stoneTree(v, false, 0);
    return { name: `arbol_piedra_${v}`, w: 64, h: 96, anchor: [32, 92] as [number, number], solid: [-8, -6, 16, 6] as [number, number, number, number], anims: { idle: { frames: [d], fps: 1, loop: true }, dormida: { frames: [d], fps: 1, loop: true }, despierta: { frames: [stoneTree(v, true, 0), stoneTree(v, true, 1)], fps: 2, loop: true } }, shadow: contactShadow(d, [32, 92], { rows: 4, spread: 3, tall: 2.6 }) };
  });
}

// ---------------------------------------------------------------- utilería de las calles

/** Utilería chica: banco, maceta, carretilla de pan, cajón de panes, cántaro y el aljibe. Todo de piedra dormida. */
function streetProps(): WorldObject[] {
  const out: WorldObject[] = [];
  const mk = (name: string, w: number, h: number, anchor: [number, number], solid: [number, number, number, number] | null, draw: (r: Raster) => void) => {
    const r = createRaster(w, h); draw(r); outline(r, '#06080e'); sleepDust(r, 0.25, name.length * 13);
    out.push(grounded({ name, w, h, anchor, solid, anims: one(r) }, { rows: 3, spread: 2, tall: 2.2 }));
  };
  mk('banco_piedra', 64, 32, [32, 28], [-26, -8, 52, 8], (r) => {
    block(r, 6, 10, 58, 15, E, 2, 81);
    for (const x0 of [10, 46]) block(r, x0, 16, x0 + 7, 27, E, 1, 82);
    block(r, 6, 3, 58, 7, E, 1, 83);
    for (const x0 of [8, 54]) block(r, x0, 3, x0 + 2, 10, E, 0, 84);
  });
  for (const v of [0, 1]) mk(`maceta_piedra_${v}`, 32, 32, [16, 29], [-8, -6, 16, 6], (r) => {
    for (let y = 16; y < 29; y++) { const hw = 7 - (y - 16) * 0.18 + (v ? 1 : 0); for (let x = -hw; x <= hw; x++) put(r, 16 + x, y, tone(E, 0.7 - x / (hw * 2) - (y > 26 ? 0.2 : 0) + (y < 18 ? 0.2 : 0), x, y)); }
    // la planta de piedra: hojas en abanico o una bola
    for (let k = 0; k < 7; k++) { const a = Math.PI * (0.15 + (k / 6) * 0.7); for (let t = 0; t < 9 + (k % 2) * 3; t++) put(r, 16 - Math.cos(a) * t * (v ? 0.7 : 1), 16 - Math.sin(a) * t, tone(E, 0.85 - t / 20, k, t)); }
  });
  mk('carretilla_pan', 64, 48, [32, 44], [-24, -10, 48, 10], (r) => {
    block(r, 10, 18, 50, 32, E, 3, 85);
    for (let k = 0; k < 6; k++) for (let y = 0; y < 5; y++) for (let x = 0; x < 9; x++) if ((x - 4) ** 2 / 20 + (y - 2) ** 2 / 6 < 1) put(r, 14 + (k % 3) * 11 + x, 12 + Math.floor(k / 3) * 5 + y, tone(E, 0.85 - x / 18, x, y));
    for (let y = 30; y < 44; y++) for (let x = 38; x < 52; x++) { const d = Math.hypot(x - 45, y - 37); if (d < 7 && d > 4.6) put(r, x, y, E[1]); if (d < 1.4) put(r, x, y, E[3]); }
    for (let t = 0; t < 12; t++) { put(r, 10 - t, 24 + t * 0.2, E[3]); put(r, 10 - t, 25 + t * 0.2, E[1]); }
  });
  mk('cajon_pan', 32, 32, [16, 29], [-11, -8, 22, 8], (r) => {
    block(r, 4, 14, 28, 28, E, 2, 86);
    for (let k = 0; k < 3; k++) for (let y = 0; y < 6; y++) for (let x = 0; x < 7; x++) if ((x - 3) ** 2 / 10 + (y - 3) ** 2 / 9 < 1) put(r, 6 + k * 7 + x, 9 + y, tone(E, 0.88 - x / 14, x, y));
  });
  mk('cantaro', 32, 32, [16, 29], [-6, -5, 12, 5], (r) => {
    for (let y = 8; y < 29; y++) { const hw = y < 12 ? 3 : 3 + Math.sin(((y - 12) / 17) * Math.PI) * 5; for (let x = -hw; x <= hw; x++) put(r, 16 + x, y, tone(E, 0.72 - x / (hw * 2.2) - (y > 26 ? 0.2 : 0), x, y)); }
    for (let t = 0; t < Math.PI; t += 0.1) put(r, 21 + Math.sin(t) * 4, 11 + t * 3, E[2]);
  });
  mk('aljibe', 64, 64, [32, 58], [-24, -14, 48, 14], (r) => {
    for (let y = 30; y < 58; y++) for (let x = 6; x < 58; x++) { const d = Math.hypot((x - 32) / 26, (y - 38) / 10); if (d < 1 || (y > 38 && Math.abs(x - 32) < 26)) put(r, x, y, d < 0.7 && y < 40 ? '#04060a' : tone(E, 0.66 - (x - 32) / 60 - (y > 50 ? 0.2 : 0) + (d < 1 && d > 0.85 && y < 38 ? 0.2 : 0), x, y)); }
    for (const x0 of [9, 51]) block(r, x0, 8, x0 + 4, 32, E, 0, 87);
    block(r, 7, 4, 57, 8, E, 2, 88);
    for (let y = 8; y < 26; y++) put(r, 32, y, I[3]);
    for (let y = 24; y < 30; y++) for (let x = 29; x <= 35; x++) put(r, x, y, tone(E, 0.5 - (x - 29) / 12, x, y));
  });
  return out;
}

// ---------------------------------------------------------------- calcomanías

/** Calcomanías (capa suelo): adoquines rotos, polvo de sueño acumulado, pétalos de piedra, charcos secos y la rayuela. */
function decals(): WorldObject[] {
  const out: WorldObject[] = [];
  const mk = (name: string, w: number, h: number, draw: (r: Raster) => void) => { const r = createRaster(w, h); draw(r); out.push({ name, w, h, anchor: [w >> 1, h >> 1], solid: null, layer: 'suelo', anims: one(r) }); };
  for (const v of [0, 1, 2]) mk(`adoquines_rotos_${v}`, 48, 32, (r) => {
    for (let k = 0; k < 3 + v; k++) {
      const cx = 8 + hash(k, v, 91) * 32, cy = 6 + hash(v, k, 92) * 20, s = 3 + hash(k, k, 93 + v) * 2.6, a = hash(k, 2, 94 + v) * 3;
      for (let y = -s; y <= s; y++) for (let x = -s; x <= s; x++) {
        const px = x * Math.cos(a) - y * Math.sin(a), py = x * Math.sin(a) + y * Math.cos(a);
        if (Math.abs(px) + Math.abs(py) * 1.3 < s) put(r, cx + x, cy + y * 0.7, py < -s * 0.3 ? P[6] : P[4]);
      }
    }
    // el hueco donde faltan
    for (let y = 10; y < 22; y++) for (let x = 14; x < 30; x++) if (Math.hypot((x - 22) / 8, (y - 16) / 5) < 1 && hash(x >> 1, y >> 1, 95 + v) > 0.25) put(r, x, y, P[1], 200);
  });
  for (const v of [0, 1, 2]) mk(`polvo_sueno_${v}`, 48, 24, (r) => {
    for (let i = 0; i < 70 + v * 20; i++) { const a = hash(i, v, 96) * Math.PI * 2, d = Math.sqrt(hash(v, i, 97)) * (10 + v * 3); put(r, 24 + Math.cos(a) * d * 1.6, 12 + Math.sin(a) * d * 0.6, hash(i, i, 98) > 0.6 ? CIUDAD.lila : '#7a64b8', Math.round(200 - d * 8)); }
  });
  for (const v of [0, 1]) mk(`petalos_piedra_${v}`, 32, 24, (r) => {
    for (let k = 0; k < 6 + v * 3; k++) { const x = 4 + hash(k, v, 99) * 24, y = 4 + hash(v, k, 100) * 16, a = hash(k, 1, 101); for (let t = 0; t < 4; t++) put(r, x + Math.cos(a * 6) * t * 0.6, y + Math.sin(a * 6) * t * 0.4, t < 2 ? E[4] : E[3]); put(r, x, y + 1, E[1]); }
  });
  for (const v of [0, 1]) mk(`charco_seco_${v}`, 48, 24, (r) => {
    const rx = 15 + v * 4, ry = 6 + v;
    for (let y = 0; y < 24; y++) for (let x = 0; x < 48; x++) {
      const d = Math.hypot((x - 24) / rx, (y - 12) / ry) + (hash(x >> 2, y >> 1, 102 + v) - 0.5) * 0.2;
      if (d > 1) continue;
      // barro seco cuarteado: placas con bordes levantados
      const crack = Math.abs(Math.sin(x * 0.7 + v) + Math.sin(y * 1.1 - x * 0.3)) < 0.12;
      put(r, x, y, crack ? P[1] : d > 0.85 ? P[2] : P[3], 220);
    }
  });
  mk('rayuela_0', 64, 96, (r) => {
    // la rayuela de tiza: casilleros de a uno y de a dos, y el cielo arriba; un poco borrada
    const chalk = (x: number, y: number) => { if (hash(x, y, 103) > 0.18) put(r, x, y, '#d8dce8', 200); };
    const boxes: [number, number][] = [[24, 78], [24, 64], [14, 50], [34, 50], [24, 36], [14, 22], [34, 22]];
    for (const [bx, by] of boxes) for (let t = 0; t < 16; t++) { chalk(bx + t, by); chalk(bx + t, by + 14); chalk(bx, by + t * 14 / 16); chalk(bx + 16, by + t * 14 / 16); }
    for (let t = 0; t < Math.PI; t += 0.05) chalk(Math.round(32 + Math.cos(t) * 16), Math.round(22 - Math.sin(t) * 14));
    // los números como rayitas (sin letras) y una piedrita tirada
    boxes.forEach(([bx, by], i) => { for (let k = 0; k <= i % 3; k++) chalk(bx + 6 + k * 2, by + 7); });
    put(r, 30, 40, E[4]); put(r, 31, 40, E[3]); put(r, 30, 41, E[2]);
  });
  return out;
}

export function ciudadObjectsA(): WorldObject[] {
  return [
    ...plazaLanterns(), spark(), ...throneLamps(), fountainObject(), clockTowerObject(), throneObject(), musicBox(),
    ...[0, 1, 2, 3].map(hedge), ...[0, 1, 2, 3].map(stoneFlower), ...stoneTrees(), ...streetProps(), ...decals(),
  ];
}

/** La partícula del piso: polvo de sueño (8 x 8, 4 cuadros a 4 fps), una mota lila suave que titila al caer. */
export function sleepParticle(): { name: string; w: number; h: number; frames: Raster[]; fps: number } {
  const frames = [0, 1, 2, 1].map((k) => {
    const r = createRaster(8, 8);
    put(r, 3, 3, k === 2 ? '#f0e8ff' : CIUDAD.lila); put(r, 4, 3, CIUDAD.lila, 200); put(r, 3, 4, CIUDAD.lila, 200); put(r, 4, 4, '#8a74c8', 180);
    if (k > 0) for (const [x, y] of [[2, 3], [5, 4], [3, 2], [4, 5]]) put(r, x, y, '#8a74c8', 70 + k * 40);
    return r;
  });
  return { name: 'polvo_sueno', w: 8, h: 8, frames, fps: 4 };
}

export { one, grounded, block };
