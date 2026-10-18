import { createRaster, type Raster } from '../core/raster';
import { contactShadow } from './premium/contact';
import type { WorldObject } from './objects';
import { hash, put, glow, tone, outline, type Anim } from './puertoObjects';
import { CIUDAD, sleepDust, one, grounded, block } from './ciudadObjects';

/**
 * Mundo 5: La Ciudad Dormida (encargo F12, parte 2, segunda mitad): las fachadas de piedra, la puerta de la ciudad,
 * los puestos dormidos, el primer plano que se mece, las torres lejanas del fondo, el quinto pedazo del mural y la
 * Ladrona con su farolito.
 */

const P = CIUDAD.piedra, E = CIUDAD.estatua, I = CIUDAD.hierro;
const W5 = ['#2a3446', '#3a4660', '#4e5a78', '#68769a']; // pizarra de los techos

// colores de la ciudad despierta
const TOLDOS: [string, string][] = [['#c8483a', '#f0e0c8'], ['#4a8a4a', '#e8e0b0'], ['#d8b040', '#f4ecd0'], ['#3a6aa8', '#f0e8d8'], ['#a84a7a', '#f0d8e0']];
const MACETAS = ['#d84a4a', '#e8c84a', '#e88ac0', '#f4f0e8', '#8ad84a'];

interface CasaSpec {
  fw: number; wall: number; roof: number; floors: number;
  /** piedra: tono base (0 a 1) y tamaño de los sillares */
  stone: number; brick: [number, number];
  door: number; arch: boolean;
  windows: number; balcony: boolean; toldo: number | null; sign: 'pan' | 'nota' | 'llave' | 'flor' | null;
  chimney: number | null; dormer: boolean; seed: number;
}

/** Diez fachadas distintas: una pantalla de calle muestra varias a la vez y ninguna se repite. */
const CASAS: CasaSpec[] = [
  { fw: 112, wall: 88, roof: 50, floors: 2, stone: 0.55 + 0.16, brick: [14, 8], door: -30, arch: true, windows: 3, balcony: true, toldo: 0, sign: 'pan', chimney: 30, dormer: false, seed: 1 },
  { fw: 100, wall: 100, roof: 44, floors: 3, stone: 0.48 + 0.16, brick: [12, 7], door: 22, arch: false, windows: 2, balcony: false, toldo: null, sign: null, chimney: -28, dormer: true, seed: 2 },
  { fw: 120, wall: 78, roof: 56, floors: 2, stone: 0.6 + 0.16, brick: [18, 9], door: 0, arch: true, windows: 4, balcony: false, toldo: 2, sign: 'flor', chimney: null, dormer: true, seed: 3 },
  { fw: 94, wall: 92, roof: 48, floors: 2, stone: 0.5 + 0.16, brick: [10, 6], door: -18, arch: false, windows: 2, balcony: true, toldo: null, sign: 'nota', chimney: 22, dormer: false, seed: 4 },
  { fw: 116, wall: 84, roof: 52, floors: 2, stone: 0.57 + 0.16, brick: [16, 8], door: 28, arch: true, windows: 3, balcony: false, toldo: 1, sign: null, chimney: -34, dormer: false, seed: 5 },
  { fw: 104, wall: 104, roof: 40, floors: 3, stone: 0.46 + 0.16, brick: [12, 8], door: -24, arch: true, windows: 3, balcony: true, toldo: null, sign: 'llave', chimney: null, dormer: true, seed: 6 },
  { fw: 90, wall: 80, roof: 54, floors: 2, stone: 0.62 + 0.16, brick: [14, 7], door: 14, arch: false, windows: 2, balcony: false, toldo: 3, sign: null, chimney: 26, dormer: false, seed: 7 },
  { fw: 122, wall: 90, roof: 46, floors: 2, stone: 0.52 + 0.16, brick: [20, 10], door: -36, arch: true, windows: 4, balcony: true, toldo: null, sign: 'pan', chimney: 40, dormer: true, seed: 8 },
  { fw: 98, wall: 96, roof: 50, floors: 3, stone: 0.58 + 0.16, brick: [11, 7], door: 20, arch: false, windows: 2, balcony: true, toldo: 4, sign: 'nota', chimney: -20, dormer: false, seed: 9 },
  { fw: 108, wall: 82, roof: 58, floors: 2, stone: 0.5 + 0.16, brick: [15, 9], door: -8, arch: true, windows: 3, balcony: false, toldo: null, sign: 'flor', chimney: null, dormer: true, seed: 10 },
];

/** Una casa (128 x 160): fachada de sillares, ventanas con postigos, puerta, balcón, toldo, cartel y techo de pizarra. */
function casa(h: CasaSpec, awake: boolean): Raster {
  const W = 128, H = 160, r = createRaster(W, H), cx = 64, base = 154, hw = h.fw / 2;
  const wallTop = base - h.wall, roofTop = wallTop - h.roof;
  // zócalo
  for (let y = base - 8; y <= base; y++) for (let x = Math.floor(cx - hw - 1); x <= cx + hw + 1; x++) put(r, x, y, tone(P.slice(2), 0.5 - (x - cx) / (hw * 4) + (y === base - 8 ? 0.25 : 0) - (y === base ? 0.2 : 0), x, y));
  // la fachada de sillares
  const [bw, bh] = h.brick;
  for (let y = wallTop; y < base - 8; y++) {
    const row = Math.floor((y - wallTop) / bh), off = row % 2 ? bw / 2 : 0;
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
      const col = Math.floor((x - cx + hw + off) / bw);
      const joint = (y - wallTop) % bh === 0 || (x - cx + hw + off) % bw < 1;
      let l = h.stone - ((x - cx) / hw) * 0.14 + (hash(col, row, h.seed) - 0.5) * 0.16;
      // la humedad de abajo y la sombra del alero arriba
      if (y > base - 22) l -= ((y - (base - 22)) / 14) * 0.12;
      if (y < wallTop + 5) l -= 0.18;
      let c = joint ? P[2] : tone(P.slice(1), l, x, y);
      if (!joint && hash(x >> 1, y >> 1, h.seed + 3) > 0.988) c = CIUDAD.musgo;
      put(r, x, y, c);
    }
  }
  // esquinas con piedras grandes (cadenas)
  for (const s of [-1, 1]) for (let y = wallTop; y < base - 8; y++) { const big = Math.floor((y - wallTop) / 12) % 2; for (let k = 0; k < (big ? 8 : 5); k++) { const x = s < 0 ? cx - hw + k : cx + hw - k; put(r, x, y, (y - wallTop) % 12 === 0 ? P[2] : tone(E.slice(0, 4), 0.6 - s * 0.2 - k * 0.02, x, y)); } }
  // las ventanas por piso
  const floorH = (h.wall - 14) / h.floors;
  const lit = awake ? CIUDAD.ventana : null;
  for (let fl = 0; fl < h.floors; fl++) {
    const fy = wallTop + 6 + fl * floorH;
    for (let k = 0; k < h.windows; k++) {
      const wx = cx - hw + 10 + ((h.fw - 20) / h.windows) * (k + 0.5);
      // la planta baja deja lugar a la puerta
      if (fl === h.floors - 1 && Math.abs(wx - (cx + h.door)) < 18) continue;
      const ww = 10, wh = Math.min(18, floorH - 8), wy = fy + 3;
      for (let y = Math.floor(wy); y < wy + wh; y++) for (let x = Math.floor(wx - ww / 2); x < wx + ww / 2; x++) {
        const top = h.arch && y < wy + 4 && Math.hypot(x + 0.5 - wx, y - (wy + 4)) > ww / 2;
        if (top) continue;
        const frame = x === Math.floor(wx - ww / 2) || x === Math.floor(wx + ww / 2) - 1 || y === Math.floor(wy + wh) - 1 || Math.abs(x + 0.5 - wx) < 0.6 || y === Math.floor(wy + wh / 2);
        let c: string;
        if (frame) c = E[2];
        else if (lit) c = tone(['#c87830', '#e8a050', CIUDAD.ventana, '#ffe0a0'], 0.8 - (y - wy) / wh * 0.4 + (x < wx ? 0.1 : 0), x, y, true);
        else c = tone(CIUDAD.vidrioMuerto, 0.6 - (y - wy) / wh * 0.4, x, y);
        put(r, x, y, c);
      }
      // dintel claro y alféizar
      for (let x = Math.floor(wx - ww / 2 - 1); x <= wx + ww / 2; x++) { put(r, x, Math.floor(wy + wh), E[4]); if (!h.arch) put(r, x, Math.floor(wy) - 1, E[3]); }
      // postigos (abiertos) en las de los pisos de arriba
      if (fl < h.floors - 1 || h.floors === 1) for (const s of [-1, 1]) for (let y = Math.floor(wy); y < wy + wh; y++) for (let t = 0; t < 4; t++) {
        const x = wx + s * (ww / 2 + 1 + t);
        put(r, x, y, awake ? tone(['#2a4a3a', '#3a6a4a', '#4a8a5a'], 0.6 - t * 0.1 + ((y - wy) % 3 === 0 ? -0.3 : 0), x, y) : tone(E.slice(0, 4), 0.55 - t * 0.08 + ((y - wy) % 3 === 0 ? -0.25 : 0), x, y));
      }
      // maceta en el alféizar
      if ((k + fl + h.seed) % 2 === 0) for (let x = Math.floor(wx - 5); x <= wx + 5; x++) for (let y = 0; y < 3; y++) put(r, x, wy + wh + 1 + y, y === 0 && hash(x, 1, h.seed) > 0.35 ? (awake ? MACETAS[(x + k) % MACETAS.length] : E[4]) : awake ? '#8a4a2a' : E[2]);
      // ojitos de luz que se adivinan apagados: nada (dormida)
      if (lit) glow(r, wx, wy + wh / 2, 9, CIUDAD.ventana, 0.45);
    }
  }
  // el balcón del primer piso, con baranda de hierro
  if (h.balcony) {
    const by = wallTop + 6 + floorH - 2, bx0 = cx - 26, bx1 = cx + 26;
    for (let x = bx0; x <= bx1; x++) { put(r, x, by, E[4]); put(r, x, by + 1, E[2]); put(r, x, by - 9, I[4]); }
    for (let x = bx0; x <= bx1; x += 3) for (let y = by - 9; y < by; y++) put(r, x, y, I[3]);
  }
  // la puerta (en arco o recta), con su escalón
  const dx = cx + h.door, dTop = base - 36;
  for (let y = dTop; y < base - 8; y++) for (let x = dx - 9; x <= dx + 9; x++) {
    const inA = !h.arch || y > dTop + 9 || Math.hypot(x - dx, y - (dTop + 9)) < 9.5;
    if (!inA) continue;
    const edge = Math.abs(x - dx) > 7.5 || (h.arch && y <= dTop + 9 && Math.hypot(x - dx, y - (dTop + 9)) > 8);
    const plank = (x - dx + 9) % 5 === 0;
    put(r, x, y, edge ? E[3] : awake ? tone(['#3a2010', '#5a3418', '#7a4a24'], 0.6 - (x - dx) / 30 - (plank ? 0.25 : 0), x, y) : tone(P, 0.45 - (x - dx) / 40 - (plank ? 0.12 : 0), x, y));
  }
  put(r, dx + 5, base - 20, awake ? CIUDAD.oro[4] : E[4]);
  for (let x = dx - 11; x <= dx + 11; x++) { put(r, x, base - 8, E[4]); put(r, x, base - 7, E[2]); }
  // el toldo a rayas sobre la puerta o la vidriera (gris dormido, de colores despierto)
  if (h.toldo !== null) {
    const [a, b] = TOLDOS[h.toldo], tx = h.door > 0 ? cx - 34 : cx + 8, ty = base - 44;
    for (let y = 0; y < 10; y++) for (let x = 0; x < 30; x++) {
      const stripe = Math.floor((x + y * 0.2) / 4) % 2;
      const scal = y === 9 && x % 4 > 1;
      if (scal) continue;
      put(r, tx + x - y * 0.25, ty + y, awake ? (stripe ? a : b) : tone(E, (stripe ? 0.35 : 0.75) - y / 30, x, y));
    }
    // la vidriera de la tienda abajo del toldo
    for (let y = ty + 11; y < base - 10; y++) for (let x = tx + 2; x < tx + 26; x++) put(r, x, y, x === tx + 2 || x === tx + 25 || x === tx + 14 ? E[2] : awake ? tone(['#c87830', CIUDAD.ventana, '#ffe0a0'], 0.6 - (y - ty) / 40, x, y, true) : tone(CIUDAD.vidrioMuerto, 0.5, x, y));
  }
  // el cartel que cuelga de un brazo de hierro, con su dibujito (un pan, una nota, una llave o una flor)
  if (h.sign) {
    const sx = cx + h.door + (h.door > 0 ? -24 : 16), sy = base - 58;
    for (let x = 0; x < 12; x++) put(r, sx - 2 + x, sy - 4, I[3]);
    for (let y = sy - 3; y < sy; y++) for (const x of [sx + 1, sx + 8]) put(r, x, y, I[2]);
    for (let y = sy; y < sy + 10; y++) for (let x = sx; x < sx + 10; x++) put(r, x, y, x === sx || x === sx + 9 || y === sy || y === sy + 9 ? I[2] : awake ? '#c8a060' : E[3]);
    const ink = awake ? '#5a2a10' : E[1];
    const icon: Record<string, [number, number][]> = {
      pan: [[3, 4], [4, 3], [5, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 5], [4, 4], [5, 5]],
      nota: [[4, 2], [4, 3], [4, 4], [4, 5], [3, 6], [2, 6], [3, 5], [5, 2], [6, 3]],
      llave: [[2, 3], [3, 2], [4, 3], [3, 4], [4, 4], [5, 5], [6, 6], [6, 5], [7, 7]],
      flor: [[4, 2], [3, 3], [5, 3], [4, 4], [4, 5], [4, 6], [3, 5]],
    };
    for (const [ix, iy] of icon[h.sign]) put(r, sx + 1 + ix, sy + 1 + iy, ink);
  }
  // la cornisa
  for (let y = wallTop - 3; y < wallTop; y++) for (let x = Math.floor(cx - hw - 3); x <= cx + hw + 3; x++) put(r, x, y, tone(E, (y === wallTop - 3 ? 0.85 : 0.5) - (x - cx) / (hw * 4), x, y));
  // el techo de pizarra, a dos aguas visto desde arriba: el agua de atrás oscura, la cumbrera y el agua de adelante
  for (let y = roofTop; y < wallTop - 3; y++) {
    const t = (y - roofTop) / (wallTop - 3 - roofTop), half = hw + 5;
    for (let x = Math.floor(cx - half); x <= cx + half; x++) {
      const row = Math.floor((y - roofTop) / 4), sl = Math.floor((x + (row % 2) * 3 + 200) / 6);
      const ridge = t < 0.38;
      let l = (ridge ? 0.28 : 0.62) - (x - cx) / (half * 5) + (hash(sl, row, h.seed + 5) - 0.5) * 0.18 + ((y - roofTop) % 4 === 3 ? -0.22 : 0);
      if (Math.abs(t - 0.38) < 0.04) l = 0.9;
      let c = tone(W5, l, x, y);
      if (!ridge && hash(x >> 1, y >> 1, h.seed + 6) > 0.97) c = CIUDAD.musgo;
      put(r, x, y, c);
    }
  }
  // buhardilla con su ventanita (mira para adelante)
  if (h.dormer) {
    const ox = cx - 8 + (h.seed % 3) * 8, oy = roofTop + Math.round(h.roof * 0.45);
    for (let y = oy; y < oy + 16; y++) for (let x = ox - 9; x <= ox + 9; x++) { const tri = y < oy + 6 && Math.abs(x - ox) > (y - oy) * 1.6; if (!tri) put(r, x, y, y < oy + 6 ? tone(W5, 0.75 - (x - ox) / 30, x, y) : tone(E, 0.6 - (x - ox) / 30, x, y)); }
    for (let y = oy + 8; y < oy + 15; y++) for (let x = ox - 3; x <= ox + 3; x++) put(r, x, y, x === ox ? E[2] : awake ? CIUDAD.ventana : CIUDAD.vidrioMuerto[1]);
  }
  if (h.chimney !== null) for (let y = roofTop - 8; y < roofTop + 18; y++) for (let x = cx + h.chimney - 5; x <= cx + h.chimney + 5; x++) put(r, x, y, y < roofTop - 5 ? P[1] : tone(P.slice(2), 0.6 - (x - cx - h.chimney) / 14 + ((y >> 2) % 2 ? 0.04 : -0.04), x, y));
  outline(r, '#05070c');
  if (!awake) sleepDust(r, 0.3, h.seed * 7);
  else if (h.chimney !== null) for (let i = 0; i < 6; i++) put(r, cx + h.chimney + Math.sin(i) * 2, roofTop - 10 - i * 2, '#a8a8b8', 140 - i * 20); // humito de la chimenea
  return r;
}

function casas(): WorldObject[] {
  return CASAS.map((h, i) => {
    const dormida = casa(h, false), despierta = casa(h, true);
    const hw = Math.round(h.fw / 2);
    return {
      name: `casa_ciudad_${i}`, w: 128, h: 160, anchor: [64, 154] as [number, number], solid: [-hw, -28, hw * 2, 28] as [number, number, number, number],
      anims: { idle: { frames: [dormida], fps: 1, loop: true }, dormida: { frames: [dormida], fps: 1, loop: true }, despierta: { frames: [despierta], fps: 1, loop: true } },
      shadow: contactShadow(dormida, [64, 154], { rows: 5, spread: 3, tall: 3.4 }),
    };
  });
}

// ---------------------------------------------------------------- la puerta de la ciudad

/**
 * La Puerta de la Ciudad (192 x 192): dos torreones con almenas y entre ellos el arco grande, con el rastrillo
 * levantado arriba y el escudo de la ciudad (una luna dormida). Se pasa por el medio (64 px de luz).
 */
function cityGate(): WorldObject {
  const W = 192, H = 192, r = createRaster(W, H), cx = 96, base = 186;
  const towers = [[8, 62], [130, 184]];
  for (const [x0, x1] of towers) {
    for (let y = 30; y <= base; y++) for (let x = x0; x <= x1; x++) {
      const row = Math.floor(y / 10), off = row % 2 ? 7 : 0, joint = y % 10 === 0 || (x + off) % 14 === 0;
      let l = 0.78 - ((x - x0) / (x1 - x0)) * 0.34 + (hash(Math.floor((x + off) / 14), row, 111) - 0.5) * 0.14;
      if (y > base - 14) l -= 0.1;
      put(r, x, y, joint ? P[2] : tone(P.slice(1), l, x, y));
    }
    // almenas
    for (let k = 0; k < 4; k++) for (let y = 18; y < 30; y++) for (let x = x0 + k * 15; x < x0 + k * 15 + 9; x++) if (x <= x1) put(r, x, y, tone(P.slice(2), 0.65 - (x - x0) / 120 + (y === 18 ? 0.25 : 0), x, y));
    // tronera
    for (let y = 70; y < 92; y++) for (let x = (x0 + x1) / 2 - 2; x <= (x0 + x1) / 2 + 2; x++) put(r, x, y, '#04060a');
  }
  // el muro de arriba del arco y el arco
  for (let y = 40; y <= base; y++) for (let x = 62; x <= 130; x++) {
    const inArch = y > 110 || Math.hypot(x - cx, y - 110) < 32;
    if (inArch && Math.abs(x - cx) < 32) continue;
    const row = Math.floor(y / 10), off = row % 2 ? 7 : 0, joint = y % 10 === 0 || (x + off) % 14 === 0;
    put(r, x, y, joint ? P[2] : tone(P.slice(1), 0.7 - (x - 62) / 200 + (hash(Math.floor((x + off) / 14), row, 113) - 0.5) * 0.14, x, y));
  }
  // dovelas claras del arco y la clave
  for (let a = 0; a <= Math.PI; a += 0.004) for (let t = 32; t < 40; t++) { const x = cx + Math.cos(a) * t, y = 110 - Math.sin(a) * t; const k = Math.floor((a / Math.PI) * 11); put(r, x, y, Math.abs((a / Math.PI) * 11 - Math.round((a / Math.PI) * 11)) < 0.05 ? E[1] : tone(E, 0.75 - Math.cos(a) * 0.2 + (k === 5 ? 0.1 : 0), x, y)); }
  // las jambas del arco
  for (const s of [-1, 1]) for (let y = 110; y <= base; y++) for (let t = 32; t < 37; t++) put(r, cx + s * t, y, tone(E, 0.6 - s * 0.15, t, y));
  // el rastrillo levantado: puntas de hierro asomando arriba del hueco
  for (let x = cx - 28; x <= cx + 28; x += 6) for (let y = 80; y < 96; y++) put(r, x, y, y > 92 ? I[4] : I[2]);
  for (let x = cx - 29; x <= cx + 29; x++) put(r, x, 86, I[3]);
  // el escudo de la ciudad: una luna dormida en un óvalo
  for (let y = 46; y < 68; y++) for (let x = cx - 10; x <= cx + 10; x++) {
    const d = Math.hypot((x - cx) / 10, (y - 57) / 11);
    if (d < 1) put(r, x, y, d > 0.82 ? CIUDAD.oro[2] : E[3]);
    const m = Math.hypot(x - cx, y - 57), m2 = Math.hypot(x - cx - 4, y - 54);
    if (m < 7 && m2 > 6) put(r, x, y, E[5]);
  }
  outline(r, '#05070c');
  sleepDust(r, 0.3, 117);
  // los dos guardias de piedra van aparte (estatuas); el hueco del arco se camina
  return {
    name: 'puerta_ciudad', w: W, h: H, anchor: [cx, base], solid: null,
    solids: [[-88, -26, 56, 26], [34, -26, 56, 26]],
    anims: one(r), shadow: contactShadow(r, [cx, base], { rows: 6, spread: 2, tall: 3 }),
  };
}

// ---------------------------------------------------------------- los puestos dormidos del mercado

/** Puesto (96 x 80): mostrador de madera petrificada con el toldo, cajones con frutas y panes de piedra. */
function stall(v: number, awake: boolean): Raster {
  const W = 96, H = 80, r = createRaster(W, H), cx = 48;
  const [a, b] = TOLDOS[(v * 2) % TOLDOS.length];
  const wood = awake ? ['#3a2014', '#5a3420', '#7a4a2c', '#9a6a40'] : E.slice(0, 4);
  // postes
  for (const x of [12, 84]) for (let y = 14; y < 74; y++) put(r, x, y, wood[2]);
  // el mostrador
  for (let y = 46; y < 74; y++) for (let x = 10; x <= 86; x++) put(r, x, y, tone(wood, (y < 49 ? 0.95 : 0.55) - (x - 10) / 160 + ((x - 10) % 12 === 0 ? -0.25 : 0), x, y));
  // lo que vende: frutas, panes, flores (bolitas de colores despierto, de piedra dormido)
  const goods = [['#d84a3a', '#e8c040', '#8ac04a'], ['#d8a060', '#c88850', '#e8c080'], ['#e888c0', '#f4f0e8', '#d84a4a']][v % 3];
  for (let k = 0; k < 14; k++) {
    const gx = 18 + (k % 7) * 10 + (Math.floor(k / 7) % 2) * 5, gy = 42 - Math.floor(k / 7) * 4;
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y < 10) put(r, gx + x, gy + y, awake ? tone([goods[k % 3], goods[(k + 1) % 3]], 0.7 - (x + y) / 8, x, y) : tone(E, 0.8 - (x + y) / 10, x, y));
  }
  // el toldo a rayas con su volado
  for (let y = 6; y < 24; y++) for (let x = 4; x <= 92; x++) {
    const stripe = Math.floor((x + (y - 6) * 0.3) / 8) % 2;
    if (y === 23 && Math.floor(x / 4) % 2) continue;
    put(r, x, y, awake ? (stripe ? a : b) : tone(E, (stripe ? 0.35 : 0.78) - (y - 6) / 40, x, y));
  }
  outline(r, '#05070c');
  if (!awake) sleepDust(r, 0.3, 121 + v);
  void cx;
  return r;
}

function stalls(): WorldObject[] {
  return [0, 1, 2].map((v) => {
    const d = stall(v, false);
    return { name: `puesto_dormido_${v}`, w: 96, h: 80, anchor: [48, 74] as [number, number], solid: [-38, -10, 76, 10] as [number, number, number, number], anims: { idle: { frames: [d], fps: 1, loop: true }, dormida: { frames: [d], fps: 1, loop: true }, despierta: { frames: [stall(v, true)], fps: 1, loop: true } }, shadow: contactShadow(d, [48, 74], { rows: 4, spread: 2, tall: 2.6 }) };
  });
}

// ---------------------------------------------------------------- el puente y el palacio

/**
 * Farol muerto del puente (32 x 80): poste fino de hierro sobre su dado de piedra, con el farol negro colgando del
 * brazo. Cada uno roto distinto: 0 entero con una telita, 1 torcido con el vidrio partido, 2 sin farol (quedó el
 * gancho y la cadenita), 3 el brazo doblado hacia abajo y una enredadera de piedra que sube por el poste.
 */
function deadBridgeLamp(v: number): WorldObject {
  const r = createRaster(32, 80);
  block(r, 9, 70, 23, 76, E, 2, 131 + v);
  for (let y = 22; y < 70; y++) for (let x = 14; x <= 18; x++) put(r, x, y, tone(I.slice(1), 0.75 - (x - 14) / 5 * 0.6, x, y));
  const tilt = v === 1 ? 2 : 0, droop = v === 3 ? 6 : 0;
  for (let x = 16; x < 26; x++) put(r, x, 22 + Math.round(((x - 16) / 10) * droop), I[3]);
  if (v !== 2) for (let y = 23; y < 40; y++) for (let x = 20; x <= 28; x++) { const xx = x + Math.round((y - 23) * tilt * 0.1); const frame = x === 20 || x === 28 || y === 23 || y === 39; put(r, xx, y + droop, frame ? I[3] : tone(CIUDAD.vidrioMuerto, 0.5 - (y - 23) / 40, x, y)); }
  else { for (let y = 23; y < 30; y++) put(r, 25, y, y % 2 ? I[2] : I[4]); put(r, 24, 30, I[3]); put(r, 26, 30, I[3]); }
  if (v === 1) for (let t = 0; t < 5; t++) put(r, 22 + t, 30 + t * 1.4, CIUDAD.vidrioMuerto[3]);
  if (v === 0) for (let y = 40; y < 52; y++) put(r, 24 + Math.sin(y * 0.5) * 0.6, y, E[3], 160);
  if (v === 3) for (let y = 34; y < 70; y++) { const x = 16 + Math.sin(y * 0.4) * 3; put(r, x, y, E[2]); if (y % 5 === 0) { put(r, x + 1, y - 1, E[4]); put(r, x - 1, y - 1, E[3]); } }
  outline(r, '#05070c');
  sleepDust(r, 0.4, 133 + v);
  return grounded({ name: `farol_puente_${v}`, w: 32, h: 80, anchor: [16, 76], solid: [-6, -5, 12, 5], anims: one(r) }, { rows: 3, spread: 2, tall: 2.2 });
}

/** Columna del palacio (48 x 144): fuste liso de piedra clara, capitel con volutas y una guirnalda de oro. */
function palaceColumn(v: number): WorldObject {
  const W = 48, H = 144, r = createRaster(W, H), cx = 24;
  block(r, 8, 128, 40, 140, E, 3, 141 + v);
  for (let y = 24; y < 128; y++) for (let x = 13; x <= 35; x++) {
    const u = (x - 13) / 22;
    let l = 0.82 - u * 0.55 + Math.sin(u * Math.PI * (v ? 6 : 0)) * 0.05;
    if (v && Math.floor((x - 13) / 3) % 2) l -= 0.06;
    put(r, x, y, tone(E, l, x, y));
  }
  block(r, 6, 12, 42, 24, E, 3, 143 + v);
  for (const s of [-1, 1]) for (let a = 0; a < Math.PI * 2; a += 0.15) put(r, cx + s * 15 + Math.cos(a) * 3.4, 18 + Math.sin(a) * 3.4, E[2]);
  // la guirnalda de oro alrededor del fuste
  for (let x = 13; x <= 35; x++) { const y = 40 + Math.sin(((x - 13) / 22) * Math.PI) * 5; put(r, x, y, CIUDAD.oro[3]); put(r, x, y + 1, CIUDAD.oro[1]); }
  for (let y = 0; y < 12; y++) for (let x = 4; x <= 44; x++) put(r, x, y, tone(E, 0.6 - (x - 4) / 100 + (y === 0 ? 0.3 : 0), x, y));
  outline(r, '#05070c');
  sleepDust(r, 0.25, 145 + v);
  void cx;
  return grounded({ name: `columna_palacio_${v}`, w: W, h: H, anchor: [24, 140], solid: [-14, -10, 28, 10], anims: one(r) }, { rows: 4, spread: 2, tall: 2.6 });
}

/** La alfombra del palacio (64 x 64, capa suelo, pega de arriba abajo): roja apagada por el polvo, con borde de oro. */
function carpet(): WorldObject {
  const r = createRaster(64, 64);
  for (let y = 0; y < 64; y++) for (let x = 4; x < 60; x++) {
    const edge = x < 8 || x > 55, trim = x === 9 || x === 54;
    const motif = Math.abs(((y + 16) % 32) - 16) + Math.abs(x - 32) < 9 && Math.abs(((y + 16) % 32) - 16) + Math.abs(x - 32) > 6;
    let c = edge ? tone(['#4a3a20', '#7a6030', '#a8843a'], 0.5 + (x < 8 ? 0.2 : -0.1), x, y) : trim ? '#a8843a' : tone(['#3a1e2a', '#4e2836', '#5e3240'], 0.6 + (hash(x >> 2, y >> 2, 151) - 0.5) * 0.2, x, y);
    if (motif) c = '#7a6030';
    put(r, x, y, c);
    if (!edge && hash(x, y, 152) > 0.96) put(r, x, y, CIUDAD.lila, 150);
  }
  return { name: 'alfombra_palacio', w: 64, h: 64, anchor: [32, 32], solid: null, layer: 'suelo', anims: one(r) };
}

/**
 * El balcón del palacio (96 x 64): una baranda de piedra clara sobre ménsulas, pegada a la pared de la sala del trono.
 * Ahí se asoma la Ladrona (la `figura` con `alto: true`).
 */
function balcony(): WorldObject {
  const r = createRaster(96, 64);
  // el piso del balcón (visto de arriba) y su canto
  for (let y = 30; y < 44; y++) for (let x = 6; x < 90; x++) put(r, x, y, tone(E, (y < 33 ? 0.85 : y > 40 ? 0.35 : 0.6) - (x - 6) / 300, x, y));
  // las ménsulas de abajo
  for (const x0 of [12, 40, 68]) for (let y = 44; y < 62; y++) { const w = 7 - (y - 44) * 0.35; for (let x = 0; x < w * 2; x++) put(r, x0 + x + (y - 44) * 0.35, y, tone(E, 0.6 - x / 30, x, y)); }
  // la baranda: pasamanos y balaustres panzones
  for (let x = 6; x < 90; x++) { put(r, x, 6, E[5]); put(r, x, 7, E[4]); put(r, x, 8, E[2]); }
  for (let x0 = 9; x0 < 88; x0 += 7) for (let y = 9; y < 30; y++) { const w = 1.6 + Math.sin(((y - 9) / 21) * Math.PI) * 1.4; for (let x = -w; x <= w; x++) put(r, x0 + x, y, tone(E, 0.75 - x / 6, x, y)); }
  outline(r, '#05070c');
  sleepDust(r, 0.3, 155);
  return { name: 'balcon_palacio', w: 96, h: 64, anchor: [48, 62], solid: null, anims: one(r) };
}

/**
 * La glorieta de los músicos (128 x 128): plataforma redonda de piedra con escalones, seis columnas finas y el techo de
 * pizarra en cúpula con su remate. Ahí tocaba la banda. Polvo de sueño en las cornisas.
 */
function bandstand(): WorldObject {
  const W = 128, H = 128, r = createRaster(W, H), cx = 64;
  // la plataforma: dos escalones elípticos
  for (const [ry, rx, yc, l0] of [[14, 60, 108, 0.45], [12, 52, 102, 0.62]] as [number, number, number, number][]) for (let y = yc - ry; y <= yc + ry + 6; y++) for (let x = cx - rx; x <= cx + rx; x++) {
    const d = Math.hypot((x - cx) / rx, (y - yc) / ry), front = Math.hypot((x - cx) / rx, (y - yc - 6) / ry);
    if (d < 1) put(r, x, y, tone(E, l0 + 0.2 - (x - cx) / 300 + (hash(x >> 3, y >> 2, 231) - 0.5) * 0.06, x, y));
    else if (front < 1 && y > yc) put(r, x, y, tone(E, l0 - 0.15 - (x - cx) / 200, x, y));
  }
  // las columnas (las de atrás primero)
  const cols = [0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * Math.PI * 2 + Math.PI / 6; return { x: cx + Math.cos(a) * 44, y: 100 + Math.sin(a) * 9, back: Math.sin(a) < 0 }; });
  for (const c of [...cols.filter((q) => q.back), ...cols.filter((q) => !q.back)]) for (let y = 44; y < c.y; y++) for (let x = -3; x <= 3; x++) put(r, c.x + x, y, tone(E, 0.82 - (x + 3) / 7 * 0.55 - (c.back ? 0.15 : 0), x, y));
  // la cornisa y el techo en cúpula de pizarra con gajos
  for (let y = 38; y < 46; y++) { const rx = 56; for (let x = cx - rx; x <= cx + rx; x++) put(r, x, y, tone(E, (y < 40 ? 0.85 : 0.5) - (x - cx) / 300, x, y)); }
  for (let y = 6; y < 39; y++) {
    const hw = 54 * Math.sqrt(Math.max(0, 1 - ((39 - y) / 34) ** 2));
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
      const u = (x - cx) / Math.max(1, hw), gajo = Math.abs(Math.sin(Math.asin(Math.max(-1, Math.min(1, u))) * 4)) < 0.12;
      const row = Math.floor(y / 4);
      put(r, x, y, tone(['#2a3446', '#3a4660', '#4e5a78', '#68769a'], 0.7 - u * 0.4 - (gajo ? 0.3 : 0) + ((y % 4) === 3 ? -0.15 : 0) + (hash(Math.floor((x + row * 3) / 6), row, 233) - 0.5) * 0.1, x, y));
    }
  }
  for (let y = 0; y < 8; y++) put(r, cx, y, CIUDAD.oro[3]);
  for (let a = 0; a < Math.PI * 2; a += 0.4) put(r, cx + Math.cos(a) * 2, 2 + Math.sin(a) * 2, CIUDAD.oro[4]);
  // un atril tirado y una partitura adentro
  for (let t = 0; t < 8; t++) put(r, 52 + t, 92 - t * 0.5, I[3]);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) put(r, 70 + x, 92 + y, E[5]);
  outline(r, '#05070c');
  sleepDust(r, 0.35, 235);
  return { name: 'glorieta_musica', w: W, h: H, anchor: [cx, 120], solid: [-56, -26, 112, 26], anims: one(r), shadow: contactShadow(r, [cx, 120], { rows: 6, spread: 2, tall: 3.4 }) };
}

/**
 * El organillo (64 x 64): la caja de manivela del organillero sobre su carretilla de dos ruedas, con los tubos arriba,
 * el rosetón tallado al frente y la manivela al costado. `dormida` de piedra, `despierta` de madera roja y tubos de oro.
 */
function barrelOrgan(awake: boolean): Raster {
  const r = createRaster(64, 64);
  const WOOD = ['#3a1a14', '#5e2a1e', '#8a3e28', '#b05a38', '#d07a4e'], BOX = awake ? WOOD : E, PIPE = awake ? CIUDAD.oro : E;
  // las varas de empujar, atrás a la izquierda
  for (let t = 0; t < 14; t++) { put(r, 9 - t * 0.5, 40 - t * 0.9, BOX[2]); put(r, 10 - t * 0.5, 40 - t * 0.9, BOX[1]); }
  // los tubos (de atrás, más altos al medio)
  for (let k = 0; k < 7; k++) {
    const x0 = 19 + k * 4, top = 8 + Math.abs(k - 3) * 3;
    for (let y = top; y < 22; y++) for (let x = 0; x < 3; x++) put(r, x0 + x, y, tone(PIPE.slice(1), 0.85 - x * 0.28 - (y === top ? -0.1 : 0), x0 + x, y));
    put(r, x0 + 1, top + 3, PIPE[0]);
  }
  // la caja: tapa clara, cara de adelante con el rosetón y las molduras
  for (let y = 20; y < 46; y++) for (let x = 13; x < 52; x++) {
    const lid = y < 24, rim = x === 13 || x === 51 || y === 45;
    const d = Math.hypot(x - 32, y - 34), rose = d < 8 && (d > 6.6 || Math.abs(Math.sin(Math.atan2(y - 34, x - 32) * 4)) < 0.25 || d < 2);
    let l = lid ? 0.85 : 0.6 - (x - 13) / 120 + (hash(x >> 2, y >> 3, 291) - 0.5) * 0.06;
    if (rim) l -= 0.25;
    if (rose) l += awake ? 0.3 : 0.22;
    let c = tone(BOX, l, x, y);
    if (awake && rose) c = tone(CIUDAD.oro, 0.6, x, y);
    put(r, x, y, c);
  }
  for (const x of [17, 47]) for (let y = 26; y < 43; y++) put(r, x, y, awake ? CIUDAD.oro[3] : E[4]);
  // la manivela al costado derecho
  for (let t = 0; t < 6; t++) put(r, 52 + t, 32 - t * 0.4, I[4]);
  for (let y = 26; y < 31; y++) put(r, 57, y, I[3]);
  put(r, 57, 25, awake ? CIUDAD.oro[4] : E[5]); put(r, 58, 25, awake ? CIUDAD.oro[3] : E[4]);
  // las dos ruedas con sus rayos
  for (const wx of [20, 44]) for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) {
    const d = Math.hypot(x, y);
    if (d > 9.2) continue;
    const spoke = d < 8 && Math.abs(Math.sin(Math.atan2(y, x) * 3)) < 0.2;
    if (d > 7.4 || spoke || d < 1.8) put(r, wx + x, 52 + y, tone(awake ? WOOD : E, (d > 7.4 ? 0.55 : 0.75) - x / 30, x, y));
  }
  outline(r, '#05070c');
  if (!awake) sleepDust(r, 0.35, 293);
  return r;
}

function barrelOrganObject(): WorldObject {
  const d = barrelOrgan(false);
  return grounded({ name: 'organillo', w: 64, h: 64, anchor: [32, 61], solid: [-20, -8, 40, 8], anims: { idle: { frames: [d], fps: 1, loop: true }, dormida: { frames: [d], fps: 1, loop: true }, despierta: { frames: [barrelOrgan(true)], fps: 1, loop: true } } }, { rows: 4, spread: 2, tall: 2.4 });
}

/** El atril de piedra (32 x 48): tres patas, la bandeja inclinada y una partitura que se quedó dormida ahí. v0 derecho, v1 torcido. */
function musicStand(v: number): WorldObject {
  const r = createRaster(32, 48), lean = v ? 2.5 : 0;
  // las patas
  for (const [dx, dy] of [[-7, 0], [7, 0], [0, -2]] as [number, number][]) for (let t = 0; t <= 10; t++) put(r, 16 + lean + dx * (t / 10), 34 + (12 + dy) * (t / 10), t % 4 ? I[3] : I[4]);
  // el palo
  for (let y = 16; y < 35; y++) { put(r, 16 + lean * ((y - 16) / 19), y, I[4]); put(r, 17 + lean * ((y - 16) / 19), y, I[2]); }
  // la bandeja y la partitura con sus renglones
  for (let y = 5; y < 18; y++) for (let x = 6; x < 27; x++) {
    const tray = y > 15 || x < 8 || x > 24;
    const staff = !tray && (y - 7) % 3 === 0 && y < 15;
    const note = !tray && hash(x, y, 301 + v) > 0.86 && (y - 7) % 3 !== 0;
    put(r, x + (v ? (y - 11) * 0.15 : 0), y, tray ? tone(I.slice(1), 0.6 - x / 60, x, y) : staff ? E[2] : note ? E[0] : tone(E.slice(2), 0.8 - (x - 8) / 40, x, y));
  }
  if (v) for (let t = 0; t < 5; t++) put(r, 25 + t * 0.6, 17 + t * 1.6, E[4]); // una hoja que se le escapa
  outline(r, '#05070c');
  sleepDust(r, 0.3, 303 + v);
  return grounded({ name: `atril_piedra_${v}`, w: 32, h: 48, anchor: [16, 46], solid: [-6, -4, 12, 4], anims: one(r) }, { rows: 3, spread: 2, tall: 2 });
}

/**
 * Estandarte del palacio (48 x 112): cuelga de una vara con remates de oro desde lo alto de la pared de la sala del
 * trono. Tela morada apagada por el polvo, borde de oro y la luna del Rey bordada. v0 entero, v1 con la punta rota y
 * la tela torcida, v2 más corto con una estrella.
 */
function palaceBanner(v: number): WorldObject {
  const W = 48, H = 112, r = createRaster(W, H), cx = 24;
  const CLOTH = ['#1e1428', '#2c1e3c', '#3e2a54', '#523a6c', '#6a4e86'];
  const len = v === 2 ? 64 : 78, x0 = 12, x1 = 36;
  // la vara y los remates
  for (let x = 6; x <= 42; x++) { put(r, x, 4, CIUDAD.oro[3]); put(r, x, 5, CIUDAD.oro[1]); }
  for (const x of [5, 43]) for (let y = 2; y < 8; y++) put(r, x, y, CIUDAD.oro[y < 4 ? 4 : 2]);
  for (let t = 0; t < 4; t++) { put(r, cx - 6 + t * 0.4, t, I[3]); put(r, cx + 6 - t * 0.4, t, I[3]); }
  // la tela: cae de la vara, termina en punta (o rota), con pliegues verticales
  for (let y = 6; y < 6 + len + 10; y++) for (let x = x0; x <= x1; x++) {
    const sway = v === 1 ? Math.sin(((y - 6) / len) * 2.2) * 2 : 0, xx = x - sway;
    const tip = y - 6 - len, half = (x1 - x0) / 2;
    if (tip > 0 && tip > (half - Math.abs(xx - cx)) * 0.85) continue;
    if (v === 1 && tip > -8 && hash(Math.floor(xx / 3), 0, 311) > 0.5 && tip > -4 + (xx % 3)) continue; // la punta rota
    const fold = Math.sin((xx - x0) * 0.75) * 0.12, edge = xx < x0 + 2 || xx > x1 - 2;
    let c = edge ? tone(CIUDAD.oro, 0.45 + fold, x, y) : tone(CLOTH, 0.55 + fold - (y - 6) / 400 + (hash(x >> 1, y >> 2, 313 + v) - 0.5) * 0.05, x, y);
    if (!edge && y > 9 && y < 12) c = tone(CIUDAD.oro, 0.4, x, y);
    put(r, x, y, c);
  }
  // el bordado: la luna del Rey (o una estrella en el corto)
  const ey = v === 2 ? 34 : 40;
  if (v === 2) {
    for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) {
      const a = Math.atan2(y, x) + Math.PI / 2, u = Math.abs((((a * 5) / (Math.PI * 2)) % 1 + 1) % 1 * 2 - 1);
      if (Math.hypot(x, y) < 3.4 + (1 - u) * 5.4) put(r, cx + x, ey + y, tone(CIUDAD.oro, 0.75 - x / 30 - y / 40, x, y));
    }
  } else {
    for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) {
      const inA = Math.hypot(x, y) < 7.5, inB = Math.hypot(x - 3.4, y - 1.6) < 6.4;
      if (inA && !inB) put(r, cx + x + (v === 1 ? 1 : 0), ey + y, tone(CIUDAD.oro, 0.75 - x / 30, x, y));
    }
    for (const [sx, sy] of [[5, -6], [8, 3]]) put(r, cx + sx, ey + sy, CIUDAD.oro[5]);
  }
  // la borla de abajo
  if (v !== 1) for (let t = 0; t < 6; t++) put(r, cx, 6 + len + 10 + t - 1, t < 4 ? CIUDAD.oro[3] : CIUDAD.oro[1]);
  outline(r, '#05070c');
  sleepDust(r, 0.3, 315 + v);
  return { name: `estandarte_palacio_${v}`, w: W, h: H, anchor: [cx, H - 1], solid: null, anims: one(r) };
}

// ---------------------------------------------------------------- primer plano (capa frente)

/** Banderines rotos (128 x 96, 2 cuadros a 2 fps): un cordel de lado a lado con banderines de tela petrificada. */
function bunting(v: number): WorldObject {
  const frames = [0, 1].map((f) => {
    const r = createRaster(128, 96);
    const sag = 18 + v * 8, y0 = 8 + v * 6;
    const at = (x: number) => y0 + Math.sin((x / 127) * Math.PI) * sag + f * Math.sin((x / 127) * Math.PI) * 1.5;
    for (let x = 0; x < 128; x++) { put(r, x, at(x), '#2a2a36'); put(r, x, at(x) + 1, '#1a1a24', 160); }
    for (let k = 0; k < 9; k++) {
      const bx = 8 + k * 13.5, top = at(bx);
      if (hash(k, v, 161) < 0.22) continue; // falta
      const torn = hash(k, v, 162) < 0.35, len = torn ? 7 : 12, sw = Math.sin(k + f * 1.4) * 1.2;
      for (let y = 0; y < len; y++) { const w = (1 - y / 12) * 5; for (let x = -w; x <= w; x++) put(r, bx + x + sw * (y / 12), top + 2 + y, tone(E.slice(1), 0.75 - x / 12 - y / 30 + (k % 2 ? -0.12 : 0), x, y)); }
      if (torn) for (let x = -3; x <= 3; x += 2) put(r, bx + x + sw * 0.6, top + 2 + len, E[1]);
    }
    outline(r, '#05070c');
    return r;
  });
  return { name: `banderines_rotos_${v}`, w: 128, h: 96, anchor: [64, 0], solid: null, layer: 'frente', anims: { idle: { frames, fps: 2, loop: true } } };
}

/** Arco de calle (128 x 96, 2 cuadros a 2 fps): arco de piedra que cruza la calle por encima, con una enredadera de piedra que se mece apenas. */
function streetArch(v: number): WorldObject {
  const frames = [0, 1].map((f) => {
    const r = createRaster(128, 96), cy = v ? 96 : 84, R = v ? 70 : 60;
    for (let y = 0; y < 96; y++) for (let x = 0; x < 128; x++) {
      const d = Math.hypot(x - 64, (y - cy) * 1.4);
      if (d > R && d < R + 14 && y < 60) { const l = 0.5 - (x - 64) / 260 + (d > R + 11 ? -0.2 : d < R + 2 ? 0.15 : 0); put(r, x, y, tone(P.slice(1), l, x, y)); }
    }
    // la enredadera de piedra que cuelga del arco
    for (let k = 0; k < 7; k++) {
      const x0 = 20 + k * 14, top = cy - Math.sqrt(Math.max(0, (R + 6) ** 2 - (x0 - 64) ** 2)) / 1.4;
      for (let t = 0; t < 10 + (k % 3) * 6; t++) put(r, x0 + Math.sin(t * 0.5 + k + f) * 1.2, top + t, t % 3 ? E[2] : E[3]);
    }
    outline(r, '#05070c');
    return r;
  });
  return { name: `arco_calle_${v}`, w: 128, h: 96, anchor: [64, 0], solid: null, layer: 'frente', anims: { idle: { frames, fps: 2, loop: true } } };
}

/** Lámpara colgante (128 x 96, 2 cuadros a 2 fps): una lámpara apagada colgando de una cadena larga, que se mece. */
function hangingLamp(v: number): WorldObject {
  const frames = [0, 1].map((f) => {
    const r = createRaster(128, 96), ax = 40 + v * 48, sw = (f ? 1 : -1) * (2 + v);
    const len = 50 + v * 14;
    for (let t = 0; t < len; t++) { const x = ax + sw * (t / len); put(r, x, t, t % 4 < 2 ? I[3] : I[2]); }
    const lx = ax + sw, ly = len;
    for (let y = 0; y < 18; y++) { const hw = y < 4 ? 3 + y : y < 14 ? 8 - (y - 4) * 0.2 : 6 - (y - 14); for (let x = -hw; x <= hw; x++) put(r, lx + x, ly + y, y < 4 || y > 13 || Math.abs(x) > hw - 1.2 ? tone(I.slice(1), 0.7 - x / 16, x, y) : tone(CIUDAD.vidrioMuerto, 0.5 - x / 20, x, y)); }
    outline(r, '#05070c');
    return r;
  });
  return { name: `lampara_colgante_${v}`, w: 128, h: 96, anchor: [64, 0], solid: null, layer: 'frente', anims: { idle: { frames, fps: 2, loop: true } } };
}

// ---------------------------------------------------------------- el fondo: la ciudad que se pierde en la caverna

function tn(x: number, y: number, cell: number, Wp: number, seed: number): number {
  // ruido que pega de izquierda a derecha (período Wp)
  const gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, n = Math.round(Wp / cell);
  const h = (a: number, b: number) => hash(((a % n) + n) % n, b, seed);
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = h(x0, y0), b = h(x0 + 1, y0), c = h(x0, y0 + 1), d = h(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/**
 * La ciudad lejana (512 x 256, capa fondo, pega de lado a lado): torres, cúpulas y techos que se pierden en la bruma de
 * la caverna, en tres planos que se aclaran con la distancia, con alguna ventana muerta y polvo lila que flota.
 */
function farCity(v: 0 | 1 | 2): WorldObject {
  const W = 512, H = 256, r = createRaster(W, H);
  // el aire de la caverna: casi negro azulado arriba, un poco de bruma lila abajo
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = y / H;
    put(r, x, y, [Math.round(6 + t * 12), Math.round(8 + t * 12), Math.round(14 + t * 22)]);
  }
  const layers = [
    { base: 150, amp: 70, col: [44, 48, 70], win: 0.003, seed: 171 },
    { base: 180, amp: 60, col: [30, 34, 52], win: 0.005, seed: 173 },
    { base: 210, amp: 40, col: [16, 19, 32], win: 0.007, seed: 175 },
  ];
  for (const [li, L] of layers.entries()) {
    // edificios: columnas de ancho variable (período W), cada uno torre, cúpula o techo a dos aguas
    let x = 0;
    const seeds: { x0: number; x1: number; top: number; kind: number }[] = [];
    while (x < W) { const w = 18 + Math.floor(hash(x, li, L.seed + v) * 40); seeds.push({ x0: x, x1: Math.min(W, x + w), top: L.base - hash(x, li + 1, L.seed + v) * L.amp - (hash(x, 9, L.seed) > 0.85 ? 40 : 0), kind: Math.floor(hash(x, li + 2, L.seed + v) * 3) }); x += w + Math.floor(hash(x, 5, L.seed) * 6); }
    for (const b of seeds) {
      const mid = (b.x0 + b.x1) / 2, hw = (b.x1 - b.x0) / 2;
      for (let xx = b.x0; xx < b.x1; xx++) {
        const u = (xx - mid) / hw;
        let top = b.top;
        if (b.kind === 1) top = b.top - Math.sqrt(Math.max(0, 1 - u * u)) * hw * 0.8; // cúpula
        if (b.kind === 2) top = b.top - (1 - Math.abs(u)) * hw * 0.9; // techo en punta
        for (let y = Math.max(0, Math.floor(top)); y < H; y++) {
          const fog = Math.max(0, 1 - (y - top) / 160) * 0.0;
          const c = L.col.map((cv) => Math.round(cv + (u < -0.6 ? 6 : 0) + fog));
          put(r, xx, y, c);
          // alguna ventana muerta (apenas más clara) y, muy de vez en cuando, una con un resto de lila
          if (((xx - b.x0) % 6 === 2) && y > top + 8 && (y % 9 === 3) && tn(xx, y, 3, W, L.seed) > 1 - L.win * 120) put(r, xx, y, hash(xx, y, 177) > 0.85 ? [120, 100, 180] : [64, 72, 96]);
        }
        // la aguja de las torres altas
        if (b.kind === 2 && Math.abs(u) < 0.08 && b.top < L.base - 50) for (let y = Math.floor(top) - 14; y < top; y++) put(r, xx, y, L.col);
      }
    }
    // bruma entre los planos
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) { const n = tn(xx, y, 64, W, 179 + li); if (y > L.base - 20 && n > 0.55) put(r, xx, y, [44, 40, 70], Math.round((n - 0.55) * 120 * (y / H))); }
  }
  // motas de polvo de sueño que flotan
  for (let i = 0; i < 70; i++) { const px = Math.floor(hash(i, v, 181) * W), py = Math.floor(hash(v, i, 182) * H); put(r, px, py, hash(i, 3, 183) > 0.5 ? [184, 154, 255] : [120, 100, 180], 160); }
  return { name: `fondo_ciudad_lejos_${v}`, w: W, h: H, anchor: [0, 0], solid: null, layer: 'fondo', anims: one(r) };
}

/** Paralaje de cada plano del fondo (el más lejano se mueve menos). */
export const CIUDAD_PARALAJE = [0.25, 0.4, 0.55];

// ---------------------------------------------------------------- el mural 5

/**
 * El quinto pedazo del mural (128 x 96): pintado en una pared de piedra descascarada. La figura alta y oscura baja
 * por una escalera larga con la luz de la ciudad en un farolito (un chorro dorado que sale de las casas dormidas,
 * arriba), hacia una puerta grande abajo con fuego adentro. Sin texto.
 */
function mural5(): WorldObject {
  const r = createRaster(128, 96);
  for (let y = 0; y < 96; y++) for (let x = 0; x < 128; x++) put(r, x, y, tone(E.slice(0, 5), 0.5 + (hash(x >> 3, y >> 3, 191) - 0.5) * 0.2 + (y < 4 || y > 92 || x < 3 || x > 124 ? -0.3 : 0), x, y));
  const ink = '#1a1c28', gold = CIUDAD.dorado, fire = ['#8a2a10', '#d8601a', '#ffb050'];
  // arriba a la izquierda: la ciudad dormida (techitos y una torre con reloj), de donde sale la luz
  for (let k = 0; k < 6; k++) { const hx = 6 + k * 9, hy = 18 - (k % 2) * 3; for (let y = hy; y < 26; y++) for (let x = hx; x < hx + 7; x++) put(r, x, y, y < hy + 3 ? '#4a5268' : '#6a7488'); for (let t = 0; t < 4; t++) put(r, hx + 3 - t, hy - t * 0.6, '#3a4054'); }
  for (let y = 6; y < 26; y++) for (let x = 34; x < 39; x++) put(r, x, y, '#5a6278');
  for (let a = 0; a < Math.PI * 2; a += 0.3) put(r, 36.5 + Math.cos(a) * 2, 10 + Math.sin(a) * 2, gold);
  // la escalera que baja en diagonal hasta abajo a la derecha
  for (let s = 0; s < 14; s++) { const sx = 20 + s * 6.5, sy = 30 + s * 4; for (let x = 0; x < 9; x++) { put(r, sx + x, sy, '#3a3e50'); put(r, sx + x, sy + 1, '#2a2e3e'); } }
  // la puerta grande con fuego adentro (abajo a la derecha)
  for (let y = 54; y < 92; y++) for (let x = 96; x < 124; x++) {
    const inA = y > 66 || Math.hypot(x - 110, y - 66) < 14;
    if (!inA) continue;
    const edge = Math.abs(x - 110) > 12 || (y <= 66 && Math.hypot(x - 110, y - 66) > 12);
    put(r, x, y, edge ? ink : tone(fire, 1 - (y - 56) / 50 + Math.sin(x * 0.7) * 0.15, x, y, true));
  }
  // la figura alta bajando por la mitad de la escalera, con el farolito dorado en la mano
  const fx = 64, fy = 56;
  for (let y = fy - 26; y < fy; y++) { const w = y < fy - 18 ? 3 : 3 + (y - (fy - 18)) * 0.4; for (let x = -w; x <= w; x++) put(r, fx + x, y, ink); }
  for (const ex of [-1, 1]) put(r, fx + ex, fy - 22, '#ff4a32');
  for (let t = 0; t < 8; t++) put(r, fx + 4 + t * 0.8, fy - 14 + t * 0.5, ink);
  for (let y = 0; y < 5; y++) for (let x = -2; x <= 2; x++) put(r, fx + 12 + x, fy - 9 + y, y === 0 ? ink : gold);
  // el chorro de luz: de la ciudad al farolito (puntitos dorados en curva)
  for (let t = 0; t < 1; t += 0.03) { const x = 30 + t * 46 + Math.sin(t * 9) * 2, y = 24 + t * 22 - Math.sin(t * Math.PI) * 10; put(r, x, y, gold); if (hash(Math.round(t * 99), 0, 193) > 0.6) put(r, x + 1, y - 1, '#fff4d0'); }
  // descascarado y polvo de sueño
  for (let i = 0; i < 14; i++) { const cx = 8 + hash(i, 1, 194) * 112, cy = 8 + hash(i, 2, 194) * 80, s = 2 + hash(i, 3, 194) * 4; for (let y = -s; y <= s; y++) for (let x = -s; x <= s; x++) if (x * x + y * y <= s * s && hash(x, y + i, 195) > 0.3) put(r, cx + x, cy + y, E[3]); }
  for (let i = 0; i < 40; i++) put(r, hash(i, 4, 196) * 128, 90 + hash(i, 5, 196) * 5, CIUDAD.lila, 180);
  return { name: 'mural_5', w: 128, h: 96, anchor: [64, 95], solid: null, anims: one(r) };
}

// ---------------------------------------------------------------- la Ladrona

/**
 * La Ladrona (48 x 64): la figura de los ojos rojos (la de las Galerías y el Puerto), ahora con un farolito de hierro
 * en la mano. Los ojos y el farolito brillan; el farolito tiene la llamita fría cuando no tiene luz y dorada cuando
 * la robó. `idle` (4 a 4 fps), `robar` (8 a 8 fps, en bucle: levanta el farolito y la luz le llega en un hilo; el
 * juego dibuja el hilo hasta `farolito`) e `irse` (8 a 10 fps: se va en humo).
 *
 * `farolito`: por anim, el [x, y] del farolito en cada cuadro, en pixeles desde el apoyo (y hacia abajo).
 */
export interface Ladrona { objeto: WorldObject; farolito: Record<string, [number, number][]> }

export function thiefFigure(): Ladrona {
  const DARK = '#0e0b16', RIM = '#2a2240', EDGE = '#07060c';
  const shape = (y: number) => {
    if (y < 10) return -1;
    if (y < 24) { const t = (y - 17) / 7.5; return 7.5 * Math.sqrt(Math.max(0, 1 - t * t)) + (y > 20 ? 1 : 0); }
    if (y < 28) return 8 + (y - 24) * 0.9;
    return y >= 54 ? -1 : 11 + (y - 28) * 0.22;
  };
  const AX = 24, AY = 60;
  // dibuja la figura; k: cuánto se fue (humo), arm: brazo del farolito (0 abajo, 1 arriba), lamp: brillo (0 a 1)
  const draw = (k: number, f: number, arm: number, lamp: number, bob = 0): { r: Raster; l: [number, number] } => {
    const r = createRaster(48, 64);
    for (let y = 10; y < 62; y++) {
      const w = shape(y);
      if (w < 0 && y < 54) continue;
      const cx = 24 + (y < 26 ? -(26 - y) * 0.12 : 0);
      if (y >= 54) {
        for (let j = 0; j < 6; j++) {
          const jx = cx - 11 + j * 4.4 + Math.sin(f * 1.6 + j) * (y - 54) * 0.25, len = 3 + hash(j, 1, 54) * 6;
          if (y - 54 < len && !(k > 0 && hash(j, y, 55 + f) < k * 1.4)) for (let dx = 0; dx < 2; dx++) put(r, jx + dx, y - k * 10 + bob, DARK, Math.round(220 * (1 - (y - 54) / (len + 2)) * (1 - k * 0.6)));
        }
        continue;
      }
      for (let x = -w; x <= w; x++) {
        if (k > 0 && hash(Math.round(x), y, 51 + f) < k * (0.4 + (62 - y) / 80)) continue;
        const X = cx + x + Math.sin(y * 0.2 + f) * (k * 4), Y = y - k * 10 + bob;
        put(r, X, Y, x < -w + 1.2 && y < 40 ? RIM : x > w - 1.5 ? EDGE : DARK, Math.round(240 * (1 - k * 0.6)));
      }
    }
    if (k < 0.6) for (let y = 15; y < 22; y++) for (let x = -5; x <= 5; x++) if ((x / 5.5) ** 2 + ((y - 18.5) / 3.6) ** 2 <= 1) put(r, 24 - 1 + x - (26 - y) * 0.12, y - k * 10 + bob, '#040308', Math.round(255 * (1 - k)));
    // el brazo del farolito (sale del costado derecho): de abajo al costado hasta arriba
    const sx = 31, sy = 30 - k * 10 + bob, ang = 1.35 + (-1.4 - 1.35) * arm;
    const hx = sx + Math.cos(ang) * 12, hy = sy + Math.sin(ang) * 13;
    if (k < 0.8) for (let t = 0; t <= 1; t += 0.08) { put(r, sx + (hx - sx) * t, sy + (hy - sy) * t, DARK, Math.round(240 * (1 - k))); put(r, sx + (hx - sx) * t + 1, sy + (hy - sy) * t, RIM, Math.round(240 * (1 - k))); }
    // el farolito colgando de la mano: asita, jaula y vidrio
    const lx = Math.round(hx), ly = Math.round(hy + 3);
    if (k < 0.8) {
      put(r, lx, ly - 3, I[3]); put(r, lx, ly - 2, I[3]);
      for (let y = -1; y <= 4; y++) for (let x = -2; x <= 2; x++) {
        const frame = Math.abs(x) === 2 || y === -1 || y === 4;
        put(r, lx + x, ly + y, frame ? I[3] : lamp > 0.5 ? (y < 2 ? '#fff4d0' : CIUDAD.dorado) : lamp > 0 ? '#c8783a' : '#3a2a40', Math.round(255 * (1 - k)));
      }
      if (lamp > 0) glow(r, lx, ly + 1.5, 4 + lamp * 4, CIUDAD.dorado, lamp * (1 - k));
    }
    // los ojos rojos
    if (k < 0.7) { const ey = 18 - k * 10 + bob; for (const ex of [20, 27]) { put(r, ex, ey, '#ffd0b0'); put(r, ex + 1, ey, '#ff4a32'); put(r, ex, ey + 1, '#c01a1a'); put(r, ex + 1, ey + 1, '#c01a1a'); } }
    // humo al irse
    if (k > 0) for (let i = 0; i < 22; i++) { const hx2 = 24 + (hash(i, f, 52) - 0.5) * 34, hy2 = 54 - hash(f, i, 53) * 56 * k; put(r, hx2, hy2, '#2a2438', 150); if (i % 3 === 0) put(r, hx2 + 1, hy2, '#3a3250', 110); }
    return { r, l: [lx - AX, ly + 1 - AY] };
  };
  const idle = [0, 1, 2, 3].map((f) => draw(0, f, 0.05, 0.15 + (f === 2 ? 0.1 : 0), f === 1 || f === 2 ? -1 : 0));
  // robar: levanta el farolito (0 a 3), lo sostiene arriba mientras la luz le llega (4 a 7, el farolito se llena)
  const robar = [0.2, 0.5, 0.8, 1, 1, 1, 1, 1].map((a, f) => draw(0, f, a, Math.min(1, 0.2 + f * 0.14), f >= 4 ? (f % 2 ? -1 : 0) : 0));
  const irse = Array.from({ length: 8 }, (_, f) => draw((f + 1) / 8, f, 0.3, 0.9));
  const objeto: WorldObject = {
    name: 'figura_ladrona', w: 48, h: 64, anchor: [AX, AY], solid: null,
    light: { color: '#ff3a2a', radius: 36, pulse: true, dy: 42 },
    anims: { idle: { frames: idle.map((q) => q.r), fps: 4, loop: true }, robar: { frames: robar.map((q) => q.r), fps: 8, loop: true }, irse: { frames: irse.map((q) => q.r), fps: 10, loop: false } },
  };
  return { objeto, farolito: { idle: idle.map((q) => q.l), robar: robar.map((q) => q.l), irse: irse.map((q) => q.l) } };
}

export function ciudadObjectsB(): WorldObject[] {
  return [
    ...casas(), cityGate(), ...stalls(), deadBridgeLamp(0), deadBridgeLamp(1), deadBridgeLamp(2), deadBridgeLamp(3), palaceColumn(0), palaceColumn(1), carpet(), balcony(), bandstand(),
    barrelOrganObject(), musicStand(0), musicStand(1), palaceBanner(0), palaceBanner(1), palaceBanner(2),
    bunting(0), bunting(1), streetArch(0), streetArch(1), hangingLamp(0), hangingLamp(1), farCity(0), farCity(1), farCity(2), mural5(), thiefFigure().objeto,
  ];
}

void block; void grounded;
export type { Anim };
