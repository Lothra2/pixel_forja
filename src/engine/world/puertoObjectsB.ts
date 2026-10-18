import { createRaster, type Raster } from '../core/raster';
import { IconCanvas, type P } from '../loot/canvas';
import { glowMat, metalMat } from '../loot/materials';
import { contactShadow } from './premium/contact';
import type { WorldObject } from './objects';
import type { Creature } from './atmosphere';
import { PUERTO, hash, put, glow, tone, outline, wood, stone, cloth, one, grounded, type Anim } from './puertoObjects';

/**
 * Mundo 4: El Puerto Ahogado (encargo F12, parte 2, segunda mitad): las casas de los pescadores, los botes, las redes,
 * la iglesia de la campana ahogada, la utilería del mercado, el primer plano, el mar lejano y el cuarto pedazo del
 * mural. Todo con sombra de contacto nomás.
 */

const M = PUERTO.madera, S = PUERTO.piedra;

// ---------------------------------------------------------------- casas de los pescadores

interface HouseSpec {
  /** ancho de la fachada, alto de la pared, alto del techo */
  fw: number; wall: number; roof: number;
  /** inclinación (px que se corre arriba respecto de abajo) */
  tilt: number;
  /** tono del techo y de las tablas */
  roofHex: string[]; plank: number;
  door: number; window: number | null; lit: boolean;
  chimney?: boolean; porch?: boolean; missing: number; seed: number;
}

const HOUSES: HouseSpec[] = [
  // las 4 del encargo (0 a 3) y seis más (4 a 9) para que ninguna pantalla repita una casa igual
  { fw: 92, wall: 46, roof: 52, tilt: 4, roofHex: ['#141a1a', '#1e2828', '#2a3636', '#364442'], plank: 0, door: -18, window: 18, lit: true, chimney: true, missing: 3, seed: 1 },
  { fw: 104, wall: 40, roof: 48, tilt: -5, roofHex: ['#1a1410', '#2a2018', '#3a2c20', '#4a3a2a'], plank: 1, door: 22, window: -20, lit: false, porch: true, missing: 5, seed: 2 },
  { fw: 80, wall: 58, roof: 46, tilt: 6, roofHex: ['#121618', '#1c2226', '#283036', '#343e44'], plank: 2, door: 0, window: null, lit: false, missing: 4, seed: 3 },
  { fw: 98, wall: 44, roof: 56, tilt: -3, roofHex: ['#16120e', '#241c16', '#32281e', '#423428'], plank: 1, door: -24, window: 14, lit: true, chimney: true, missing: 6, seed: 4 },
  { fw: 86, wall: 50, roof: 50, tilt: -6, roofHex: ['#101616', '#1a2424', '#243232', '#2e3e3e'], plank: 0, door: 16, window: -16, lit: false, porch: true, missing: 7, seed: 5 },
  { fw: 100, wall: 42, roof: 54, tilt: 3, roofHex: ['#18120e', '#261c14', '#34261a', '#443222'], plank: 1, door: 26, window: -14, lit: false, chimney: true, missing: 2, seed: 6 },
  { fw: 76, wall: 54, roof: 52, tilt: -7, roofHex: ['#141818', '#1e2626', '#2a3434', '#364242'], plank: 2, door: -12, window: 14, lit: false, missing: 5, seed: 7 },
  { fw: 108, wall: 40, roof: 50, tilt: 2, roofHex: ['#1a1612', '#28201a', '#382c22', '#48382c'], plank: 0, door: -30, window: 20, lit: true, porch: true, missing: 4, seed: 8 },
  { fw: 90, wall: 48, roof: 58, tilt: 5, roofHex: ['#121414', '#1c2020', '#282e2e', '#343c3c'], plank: 1, door: 20, window: -22, lit: false, chimney: true, missing: 8, seed: 9 },
  { fw: 84, wall: 46, roof: 48, tilt: -4, roofHex: ['#181410', '#261e16', '#342a1e', '#443628'], plank: 2, door: -6, window: null, lit: false, porch: true, missing: 3, seed: 10 },
];

/** Una casa (128 x 128): fachada de tablas con la puerta abierta, techo a dos aguas visto desde arriba, inclinada. */
function house(h: HouseSpec, f: number): Raster {
  const W = 128, H = 128, r = createRaster(W, H);
  const base = 122, cx = 64, wallTop = base - h.wall, roofTop = wallTop - h.roof;
  const skew = (y: number) => ((base - y) / (base - roofTop)) * h.tilt;
  const hw = h.fw / 2;
  // pilotes cortos de piedra abajo (casa sobre la orilla)
  for (let y = base - 2; y < base + 3; y++) for (let x = Math.floor(cx - hw - 2); x <= cx + hw + 2; x++) put(r, x, y, tone(S.slice(1), 0.45 - (x - cx) / 200 + (hash(x >> 2, y, h.seed) - 0.5) * 0.3, x, y));
  // la pared: tablas verticales podridas, algunas faltan (se ve el negro de adentro)
  for (let y = wallTop; y < base - 2; y++) {
    const sx = skew(y);
    for (let x = Math.floor(cx - hw + sx); x <= cx + hw + sx; x++) {
      const lx = x - sx - (cx - hw), board = Math.floor(lx / 7), inB = lx - board * 7;
      const gone = hash(board, h.seed, 41) < h.missing / 14 && y > wallTop + 6 + hash(board, h.seed, 42) * (h.wall - 14);
      let c: string;
      if (gone) c = '#030405';
      else {
        let l = 0.45 - (lx / h.fw) * 0.2 + (inB < 1 ? -0.3 : inB < 2 ? 0.12 : 0) + (hash(board, h.seed, 43) - 0.5) * 0.2;
        l -= Math.max(0, (y - (base - 14)) / 14) * 0.25; // humedad de abajo
        c = tone(M.slice(h.plank === 2 ? 0 : 0, 6), l, x, y);
        if (hash(x >> 1, y >> 1, h.seed + 44) > 0.94 && y > base - 20) c = PUERTO.alga[1];
      }
      put(r, x, y, c);
    }
  }
  // la puerta abierta: el hueco negro y la hoja de la puerta colgando hacia afuera
  const dx0 = cx + h.door - 9, dTop = base - 34;
  for (let y = dTop; y < base - 2; y++) { const sx = skew(y); for (let x = dx0; x < dx0 + 18; x++) put(r, x + sx, y, y === dTop || x === dx0 || x === dx0 + 17 ? M[4] : '#010203'); }
  for (let y = dTop + 2; y < base - 1; y++) { const sx = skew(y); for (let x = 0; x < 5; x++) put(r, dx0 - 5 + x + sx, y + (x < 2 ? 1 : 0), tone(M, 0.6 - x * 0.06 + (hash(x, y >> 3, h.seed) - 0.5) * 0.1, x, y)); }
  // la ventana: marco y vidrio; en dos casas titila apenas, verde frío como un fuego fatuo
  if (h.window !== null) {
    const wx = cx + h.window - 7, wy = wallTop + 10;
    const flick = h.lit ? [0.35, 0.5, 0.3, 0.55][f % 4] : 0;
    for (let y = wy; y < wy + 14; y++) for (let x = wx; x < wx + 14; x++) {
      const sx = skew(y), frame = x === wx || x === wx + 13 || y === wy || y === wy + 13 || x === wx + 7 || y === wy + 7;
      let c = frame ? M[4] : '#040808';
      if (!frame && flick > 0) c = tone(['#062018', '#0e3a2a', '#1e6a4e', '#3aa880'], flick + (y > wy + 7 ? 0.1 : 0), x, y, true);
      put(r, x + sx, y, c);
    }
    // un tablón cruzado (clavaron la ventana)
    for (let t = 0; t < 16; t++) put(r, wx - 1 + t + skew(wy + 2 + t * 0.7), wy + 2 + t * 0.7, M[3]);
  }
  // alero: la sombra del techo sobre la pared
  for (let y = wallTop; y < wallTop + 3; y++) for (let x = Math.floor(cx - hw); x <= cx + hw; x++) put(r, x + skew(y), y, '#020304', 140);
  // el techo: tejas de madera a dos aguas vistas desde arriba (la cumbrera horizontal), con algún hueco
  for (let y = roofTop; y < wallTop + 2; y++) {
    const sx = skew(y), t = (y - roofTop) / (wallTop + 2 - roofTop);
    const over = 6, half = hw + over;
    for (let x = Math.floor(cx - half + sx); x <= cx + half + sx; x++) {
      const lx = x - sx - cx;
      const ridge = t < 0.42; // agua de atrás (más oscura) y de adelante (más clara)
      const row = Math.floor((y - roofTop) / 5), shingle = Math.floor((lx + (row % 2) * 4 + 100) / 8);
      const hole = hash(shingle, row, h.seed + 51) > 0.975 && t > 0.15 && t < 0.9;
      let l = (ridge ? 0.32 : 0.62) - lx / (half * 4) + (hash(shingle, row, h.seed + 52) - 0.5) * 0.22 + ((y - roofTop) % 5 === 4 ? -0.25 : 0);
      if (Math.abs(t - 0.42) < 0.03) l = 0.85;
      let c = hole ? '#020304' : tone(h.roofHex, l, x, y);
      // musgo en los bordes del techo y ceniza arriba
      if (!hole && (t > 0.88 || Math.abs(lx) > half - 5) && hash(x >> 1, y >> 1, h.seed + 53) > 0.6) c = PUERTO.alga[2];
      if (!hole && ridge && hash(x >> 1, y, h.seed + 54) > 0.97) c = '#5a5e5c';
      put(r, x, y, c);
    }
  }
  if (h.chimney) for (let y = roofTop - 10; y < roofTop + 14; y++) for (let x = cx + 20; x < cx + 30; x++) put(r, x + skew(y), y, y < roofTop - 7 ? S[1] : tone(S.slice(1), 0.6 - (x - cx - 20) / 14 + ((y >> 2) % 2 ? 0.05 : -0.05), x, y));
  if (h.porch) for (let y = base - 30; y < base - 26; y++) for (let x = Math.floor(cx + h.door - 16); x < cx + h.door + 16; x++) put(r, x + skew(y), y, M[y === base - 30 ? 4 : 2]);
  // tablas sueltas que cuelgan de la pared
  for (let k = 0; k < 2; k++) { const x0 = cx - hw + 10 + hash(k, h.seed, 55) * (h.fw - 20), y0 = wallTop + 6 + k * 12; for (let t = 0; t < 12; t++) for (let w = 0; w < 3; w++) put(r, x0 + t + w * 0.3 + skew(y0), y0 + t * 0.55 + w, M[w === 0 ? 5 : 3]); }
  outline(r);
  if (h.lit && h.window !== null) glow(r, cx + h.window + skew(wallTop + 16), wallTop + 16, 12, PUERTO.fatuo, [0.3, 0.45, 0.25, 0.5][f % 4]);
  return r;
}

function houses(): WorldObject[] {
  return HOUSES.map((h, i) => {
    const frames = h.lit ? [0, 1, 2, 3].map((f) => house(h, f)) : [house(h, 0)];
    const hw = Math.round(h.fw / 2);
    return {
      name: `casa_pescador_${i}`, w: 128, h: 128, anchor: [64, 122] as [number, number], solid: [-hw, -30, hw * 2, 30] as [number, number, number, number],
      anims: { idle: { frames, fps: h.lit ? 3 : 1, loop: true } },
      ...(h.lit ? { light: { color: PUERTO.fatuo, radius: 40, flicker: true, dy: 76 } } : {}),
      shadow: contactShadow(frames[0], [64, 122], { rows: 5, spread: 4, tall: 3.4 }),
    };
  });
}

// ---------------------------------------------------------------- botes

/** Bote volteado (96 x 48, sólido): el casco boca abajo, tablas, quilla y algún agujero. */
function overturned(v: number): WorldObject {
  const r = createRaster(96, 48);
  const L = [40, 44, 36][v], Wd = [15, 14, 13][v], cx = 48, cy = 28, rot = [-0.08, 0.06, 0.14][v];
  for (let y = 0; y < 48; y++) for (let x = 0; x < 96; x++) {
    const dx = x - cx, dy = y - cy, u = dx * Math.cos(rot) + dy * Math.sin(rot), w = -dx * Math.sin(rot) + dy * Math.cos(rot);
    // forma de bote: punta a la derecha (la proa) y popa recta a la izquierda
    const halfW = Wd * (u > 0 ? Math.sqrt(Math.max(0, 1 - (u / L) ** 2)) : 1 - Math.max(0, -u - L * 0.82) / (L * 0.18));
    if (Math.abs(u) > L || Math.abs(w) > halfW) continue;
    const nrm = w / halfW; // -1 arriba (luz) a 1 abajo
    const plank = Math.floor((nrm + 1) * 3.5), seam = Math.abs(((nrm + 1) * 3.5) - Math.round((nrm + 1) * 3.5)) < 0.12;
    let l = 0.62 - nrm * 0.4 + (hash(plank, Math.floor(u / 6), v + 61) - 0.5) * 0.15;
    if (seam) l -= 0.25;
    let c = tone(M, l, x, y);
    if (Math.abs(nrm) < 0.12) c = M[5]; // la quilla
    if (hash(x >> 1, y >> 1, v + 62) > 0.93) c = PUERTO.alga[1 + (v % 2)];
    if (v === 1 && Math.hypot(u - 10, w - 4) < 4) c = '#020304'; // el agujero
    put(r, x, y, c);
  }
  // el borde de abajo: la sombra donde el casco toca el piso
  outline(r);
  const o: WorldObject = { name: `bote_volteado_${v}`, w: 96, h: 48, anchor: [48, 42], solid: [-36, -14, 72, 14], anims: one(r) };
  return grounded(o, { rows: 10, spread: 2, tall: 3 });
}

/** Bote hundido (96 x 64, no sólido, en el agua): la proa asoma inclinada y se mece (4 cuadros a 3 fps). */
function sunkBoat(): WorldObject {
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const r = createRaster(96, 64), bob = [0, 1, 1, 0][f], tilt = [0, 0.03, 0, -0.03][f];
    const water = 44 + bob;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 96; x++) {
      // la proa: un triángulo de casco que sale del agua apuntando arriba a la derecha
      const a = -0.55 + tilt, dx = x - 22, dy = y - 47;
      const u = dx * Math.cos(a) + dy * Math.sin(a), w = -dx * Math.sin(a) + dy * Math.cos(a);
      const halfW = 13 * Math.sqrt(Math.max(0, 1 - (u / 52) ** 2));
      if (u < 0 || u > 52 || Math.abs(w) > halfW || y > water) continue;
      const inside = w > halfW * 0.25 && u < 44;
      let c = inside ? tone(['#020304', '#0a0c0c', '#141a18'], 0.3 + (u / 44) * 0.4, x, y) : tone(M, 0.55 - (w / halfW) * 0.35 + (hash(Math.floor(u / 5), 0, 71) - 0.5) * 0.15, x, y);
      if (!inside && Math.abs(w / halfW + 0.75) < 0.08) c = M[5];
      if (y > water - 6 && hash(x, y, 72) > 0.6) c = PUERTO.alga[1];
      put(r, x, y, c);
    }
    outline(r);
    // el agua alrededor: un anillo de onditas que se abre y se cierra
    for (let x = 6; x < 80; x++) { const k = Math.sin(x * 0.35 + f * 1.6); if (k > 0.2) put(r, x, water + (k > 0.7 ? 0 : 1), PUERTO.brillo, Math.round(120 + k * 80)); }
    // un mástil roto y su soga
    for (let t = 0; t < 22; t++) put(r, 54 + t * 0.15 + bob * 0.2, 30 - t + bob, M[t < 2 ? 2 : 4]);
    for (let t = 0; t < 14; t++) put(r, 57 + t, 12 + t * 0.9 + Math.sin(t * 0.5 + f) * 0.6, PUERTO.red[1]);
    frames.push(r);
  }
  return { name: 'bote_hundido', w: 96, h: 64, anchor: [44, 58], solid: null, anims: { idle: { frames, fps: 3, loop: true } } };
}

// ---------------------------------------------------------------- redes

/**
 * Red colgando (64 x 96, 4 cuadros a 4 fps): malla en rombos que cae de un travesaño, con corchos y algas enredadas,
 * y se mece con el viento. `red_colgando_0` y `_1` son primer plano (capa frente, cuelgan del borde de arriba de la
 * pantalla); `red_colgando_2` va en el mapa, colgada entre dos postes.
 */
function net(v: number, f: number): Raster {
  const r = createRaster(64, 96), N = PUERTO.red;
  const standing = v === 2;
  const top = standing ? 14 : 0, bottom = [90, 78, 82][v];
  const ph = (f / 4) * Math.PI * 2;
  const sway = (y: number) => Math.sin(ph + y * 0.04) * ((y - top) / (bottom - top)) * 4;
  const halfAt = (y: number) => 26 - Math.max(0, (y - top) / (bottom - top)) * [10, 14, 6][v];
  // la malla
  for (let y = top + 2; y < bottom; y++) {
    const hw = halfAt(y), cx = 32 + sway(y);
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
      const u = x - cx + 40, w = y - top;
      const a = (u + w) % 7, b = (u - w + 700) % 7;
      const knot = a < 1 && b < 1;
      if (a < 1 || b < 1) put(r, x, y, knot ? N[3] : (x - cx) < 0 ? N[2] : N[1]);
    }
    // el borde de abajo se deshilacha
    if (y > bottom - 4) for (let x = Math.floor(cx - hw); x <= cx + hw; x += 3) if (hash(x, y, v + 81) > 0.5) put(r, x, y + 2, N[1]);
  }
  // los corchos y las algas
  for (let k = 0; k < 5; k++) { const y = top + 16 + k * 14, x = 32 + sway(y) + (k % 2 ? 10 : -12); for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 4; dx++) put(r, x + dx, y + dy, dy === 0 ? '#c89a5a' : '#8a6038'); }
  for (let k = 0; k < 3; k++) { const x0 = 22 + k * 9, y0 = top + 30 + k * 11; for (let t = 0; t < 12; t++) put(r, x0 + sway(y0 + t) + Math.sin(t * 0.8 + ph) * 1.2, y0 + t, PUERTO.alga[t % 2 ? 1 : 2]); }
  // el travesaño
  for (let x = 2; x < 62; x++) for (let k = 0; k < 4; k++) put(r, x, top + k, M[k === 0 ? 5 : k === 3 ? 1 : 3]);
  if (standing) for (const px of [4, 58]) for (let y = top; y < 94; y++) for (let k = 0; k < 4; k++) put(r, px + k - 1, y, M[k === 0 ? 5 : k === 3 ? 1 : 3]);
  outline(r, '#060708');
  return r;
}

function nets(): WorldObject[] {
  return [0, 1, 2].map((v) => {
    const frames = [0, 1, 2, 3].map((f) => net(v, f));
    const front = v < 2;
    const o: WorldObject = { name: `red_colgando_${v}`, w: 64, h: 96, anchor: front ? [32, 0] : [32, 93], solid: front ? null : [-30, -5, 60, 5], anims: { idle: { frames, fps: 4, loop: true } }, ...(front ? { layer: 'frente' as const } : {}) };
    return front ? o : { ...o, solid: null, solids: [[-30, -5, 6, 5], [24, -5, 6, 5]] as [number, number, number, number][], shadow: contactShadow(frames[0], [32, 93]) };
  });
}

// ---------------------------------------------------------------- utilería del mercado y del muelle

function marketProps(): WorldObject[] {
  // cajones apilados con pescado seco
  const crates = new IconCanvas(48, 48, 40);
  const box = (x: number, y: number, w: number, h: number, hex: string) => {
    crates.poly([[x, y + h], [x, y], [x + w, y], [x + w, y + h]], wood(hex));
    crates.poly([[x, y], [x + 4, y - 4], [x + w + 4, y - 4], [x + w, y]], wood(M[5]), { bias: 1 });
    crates.poly([[x + w, y], [x + w + 4, y - 4], [x + w + 4, y + h - 4], [x + w, y + h]], wood(M[1]));
    crates.px1([x + 1, y + h / 2], [x + w - 1, y + h / 2], wood(M[1]), { tone: 1 }, true);
  };
  box(3, 22, 22, 15, M[3]); box(22, 26, 20, 11, M[4]); box(8, 10, 18, 12, M[4]);
  for (const [x, y] of [[11, 8], [16, 7], [21, 8]] as P[]) crates.ellipse([x, y], 2, 4, { hex: '#7a8a84', kind: 'metal' }, {}, 20);
  const puesto = new IconCanvas(64, 64, 48);
  // el puesto volteado: la mesa de costado, el toldo roto y el cajón tirado
  puesto.poly([[6, 40], [6, 18], [44, 12], [44, 34]], wood(M[3]));
  puesto.poly([[44, 12], [50, 14], [50, 36], [44, 34]], wood(M[1]));
  for (let k = 0; k < 4; k++) puesto.px1([6, 22 + k * 5], [44, 16 + k * 5], wood(M[1]), { tone: 1 }, true);
  puesto.poly([[20, 44], [30, 26], [60, 28], [56, 44]], cloth('#3a4a3e'));
  for (let k = 0; k < 4; k++) puesto.poly([[30 + k * 8, 27], [34 + k * 8, 27], [33 + k * 7, 43], [29 + k * 7, 43]], cloth('#5a3a2a'));
  puesto.erase([[46, 30], [52, 31], [50, 38]]);
  puesto.line([8, 40], [4, 46], 1.4, wood(M[2]));
  const barril = new IconCanvas(32, 32, 32);
  barril.poly([[8, 29], [7, 20], [8, 10], [24, 10], [25, 20], [24, 29]], wood(M[3]));
  barril.ellipse([16, 10], 8, 2.6, wood(M[2]), { bias: 1 });
  for (const y of [13, 26]) barril.line([7.5, y], [24.5, y], 0.8, metalMat(PUERTO.oxido));
  for (const [x, a] of [[12, -30], [18, 20], [15, -5]] as P[]) { barril.ellipse([x, 6], 1.6, 4, { hex: '#6a7a76', kind: 'metal' }, {}, a); barril.poly([[x - 2, 2], [x + 2, 2], [x, 4]], { hex: '#4a5a56', kind: 'metal' }); }
  const ancla = new IconCanvas(48, 48, 48);
  const rust = metalMat('#4a3a30');
  ancla.line([24, 8], [24, 38], 3, rust);
  ancla.line([16, 13], [32, 13], 2, rust);
  ancla.ring([24, 8], 3, 3, 1.4, rust, {}, 0, 360);
  ancla.ring([24, 30], 14, 10, 2.6, rust, {}, 10, 170);
  ancla.poly([[8, 32], [12, 27], [13, 34]], rust); ancla.poly([[40, 32], [36, 27], [35, 34]], rust);
  ancla.ellipse([30, 22], 3, 2, { hex: PUERTO.oxido, kind: 'stone' });
  const cuerda = new IconCanvas(32, 32, 24);
  for (let k = 0; k < 4; k++) cuerda.ring([16, 13], 12 - k * 2.6, 8 - k * 1.8, 1.8, cloth(PUERTO.red[2 - (k % 2)]), {}, 0, 360);
  cuerda.line([27, 14], [31, 20], 1.4, cloth(PUERTO.red[2]));
  const mk = (name: string, c: IconCanvas, w: number, h: number, solid: [number, number, number, number]): WorldObject => grounded({ name, w, h, anchor: [Math.round(w / 2), h - 3], solid, anims: one(c.render()) });
  return [
    mk('cajones_mercado', crates, 48, 40, [-20, -8, 40, 8]),
    mk('puesto_volteado', puesto, 64, 48, [-26, -8, 52, 8]),
    mk('barril_pescado', barril, 32, 32, [-8, -6, 16, 6]),
    mk('ancla_vieja', ancla, 48, 48, [-14, -6, 28, 6]),
    mk('cuerda_enrollada', cuerda, 32, 24, [-10, -5, 20, 5]),
  ];
}

/** Utilería extra para que ninguna pantalla repita lo mismo: pilote, boya, nasa, remos y otro cajón. */
function dockProps(): WorldObject[] {
  const pilote = new IconCanvas(16, 16, 40);
  pilote.poly([[4, 38], [4, 6], [12, 6], [12, 38]], wood(M[3]));
  pilote.ellipse([8, 6], 4, 1.6, wood(M[4]), { bias: 1 });
  for (const y of [14, 22]) pilote.line([3, y], [13, y + 1], 0.9, cloth(PUERTO.red[2]));
  pilote.ellipse([8, 34], 4.4, 2, { hex: PUERTO.alga[2], kind: 'cloth' });
  const boya = new IconCanvas(32, 32, 32);
  boya.ellipse([16, 18], 9, 9, cloth('#6a2a24'));
  boya.ellipse([16, 18], 9, 3, cloth('#c8b8a0'));
  boya.line([16, 9], [16, 3], 1, metalMat(PUERTO.hierro[3]));
  const nasa = new IconCanvas(32, 32, 32);
  nasa.poly([[5, 26], [5, 12], [27, 12], [27, 26]], wood(M[2]));
  for (let k = 0; k < 6; k++) nasa.px1([6 + k * 4, 12], [6 + k * 4, 26], wood(M[4]), { tone: 3 });
  nasa.ring([16, 19], 5, 5, 1.4, cloth(PUERTO.red[2]), {}, 0, 360);
  nasa.eraseCircle([16, 19], 3.4);
  const remos = new IconCanvas(48, 48, 24);
  remos.line([4, 18], [40, 8], 1.4, wood(M[4])); remos.ellipse([42, 7], 5, 2.2, wood(M[3]), {}, -15);
  remos.line([8, 21], [42, 17], 1.4, wood(M[3])); remos.ellipse([44, 16.5], 5, 2.2, wood(M[2]), {}, -6);
  const cajon = new IconCanvas(32, 32, 32);
  cajon.poly([[5, 29], [5, 13], [25, 13], [25, 29]], wood(M[2]));
  cajon.poly([[5, 13], [9, 9], [29, 9], [25, 13]], wood(M[4]), { bias: 1 });
  cajon.poly([[25, 13], [29, 9], [29, 25], [25, 29]], wood(M[1]));
  cajon.line([6, 14], [24, 28], 0.8, wood(M[1])); cajon.line([24, 14], [6, 28], 0.8, wood(M[1]));
  const mk = (name: string, c: IconCanvas, w: number, h: number, solid: [number, number, number, number] | null): WorldObject => grounded({ name, w, h, anchor: [Math.round(w / 2), h - 3], solid, anims: one(c.render()) });
  return [
    mk('pilote_muelle', pilote, 16, 40, [-4, -4, 8, 4]),
    mk('boya_vieja', boya, 32, 32, [-8, -5, 16, 5]),
    mk('nasa_rota', nasa, 32, 32, [-10, -5, 20, 5]),
    { ...mk('remos_tirados', remos, 48, 24, null), layer: 'suelo' as const },
    mk('cajon_puerto', cajon, 32, 32, [-10, -6, 20, 6]),
  ];
}

/** Rocas mojadas del puerto (sólidas), tres tamaños, con algas al pie y brillo de agua arriba. */
function wetRock(v: number): WorldObject {
  const [w, h] = ([[32, 32], [48, 40], [64, 48]] as [number, number][])[v];
  const c = new IconCanvas(w, w, h);
  const R = (hex: string) => stone(hex);
  if (v === 0) { c.poly([[4, 29], [6, 17], [14, 10], [24, 12], [29, 21], [27, 29]], R(S[4])); c.poly([[8, 18], [14, 11], [21, 13], [15, 19]], R(S[5]), { bias: 1 }); }
  else if (v === 1) {
    c.poly([[3, 37], [5, 22], [15, 12], [30, 10], [42, 18], [45, 31], [43, 37]], R(S[4]));
    c.poly([[9, 22], [16, 14], [28, 12], [22, 21]], R(S[5]), { bias: 1 });
    c.line([26, 22], [33, 33], 0.6, R(S[2]));
  } else {
    c.poly([[3, 45], [4, 30], [12, 18], [26, 12], [42, 14], [56, 24], [61, 38], [58, 45]], R(S[3]));
    c.poly([[10, 30], [16, 20], [28, 14], [36, 18], [24, 26]], R(S[5]), { bias: 1 });
    c.poly([[40, 22], [52, 28], [50, 36], [42, 32]], R(S[4]));
    c.line([30, 28], [36, 42], 0.7, R(S[1]));
  }
  for (let k = 0; k < 3 + v; k++) c.ellipse([6 + (k * (w - 12)) / (2 + v), h - 4], 3.4, 1.6, cloth(PUERTO.alga[1 + (k % 2)]));
  const r = c.render();
  for (let i = 0; i < 4 + v * 2; i++) put(r, Math.round(w * 0.3 + hash(i, v, 181) * w * 0.3), Math.round(h * 0.3 + hash(v, i, 182) * h * 0.2), PUERTO.brillo, 200);
  const solid: [number, number, number, number] = v === 0 ? [-10, -6, 20, 6] : v === 1 ? [-18, -8, 36, 8] : [-26, -10, 52, 10];
  return grounded({ name: `roca_puerto_${v}`, w, h, anchor: [Math.round(w / 2), h - 3], solid, anims: one(r) });
}

// ---------------------------------------------------------------- la iglesia y su campana

/**
 * La campana de la iglesia (64 x 96): marco de dos postes y travesaño con la campana de bronce verde. `quieta` (1) y
 * `sonar` (8 cuadros a 10 fps: se mece de un lado al otro y el badajo pega).
 */
function bell(swing: number): Raster {
  const c = new IconCanvas(64, 64, 96);
  for (const x of [8, 52]) { c.poly([[x, 92], [x, 14], [x + 5, 14], [x + 5, 92]], wood(M[3])); c.px1([x + 1, 16], [x + 1, 90], wood(M[5]), { tone: 4 }, true); }
  c.poly([[4, 18], [4, 10], [60, 10], [60, 18]], wood(M[3]), { bias: 1 });
  c.poly([[20, 10], [32, 2], [44, 10]], wood(M[2]));
  // la campana colgada del centro, girando alrededor del travesaño
  const a = (swing * 22 * Math.PI) / 180, pv: P = [32, 18];
  const R = (x: number, y: number): P => [pv[0] + (x - pv[0]) * Math.cos(a) - (y - pv[1]) * Math.sin(a), pv[1] + (x - pv[0]) * Math.sin(a) + (y - pv[1]) * Math.cos(a)];
  const bronze = metalMat('#4a6a52');
  c.poly([R(28, 18), R(36, 18), R(38, 24), R(26, 24)], metalMat('#3a4a3e'));
  c.poly([R(25, 24), R(39, 24), R(42, 40), R(46, 54), R(18, 54), R(22, 40)], bronze);
  c.poly([R(16, 54), R(48, 54), R(48, 58), R(16, 58)], metalMat('#5a7a60'), { bias: 1 });
  c.px1(R(27, 27), R(23, 52), metalMat('#8aa890'), { tone: 5 }, true);
  // óxido verde que chorrea
  for (const x of [30, 36, 41]) c.px1(R(x, 30), R(x - 1, 48), metalMat('#6a9a7a'), { tone: 3 }, true);
  const clap = (swing * -0.6 * 22 * Math.PI) / 180;
  c.line(R(32, 40), [R(32, 40)[0] + Math.sin(-clap) * 14, R(32, 40)[1] + Math.cos(clap) * 14], 1.2, metalMat('#2a2e2a'));
  // la soga que baja hasta abajo
  c.line(R(33, 56), [33 + swing * 6, 90], 0.8, cloth(PUERTO.red[2]));
  c.ellipse([32, 93], 26, 3, stone(S[3]));
  return c.render();
}

function bellObject(): WorldObject {
  const sonar = [0.4, 0.9, 1, 0.5, -0.4, -0.9, -1, -0.5].map(bell);
  return grounded({ name: 'campana_iglesia', w: 64, h: 96, anchor: [32, 92], solid: [-15, -10, 30, 10], anims: { idle: { frames: [bell(0)], fps: 1, loop: true }, quieta: { frames: [bell(0)], fps: 1, loop: true }, sonar: { frames: sonar, fps: 10, loop: false } } });
}

/**
 * La iglesia en ruinas (192 x 192): sin techo. La pared de atrás (la cara que se ve es la de adentro), con la torre
 * rota y la ventana redonda, las paredes de los costados bajas y rotas, el piso de lajas de la nave y la pared de
 * adelante caída con el hueco de la puerta. El apoyo es el pie de la pared de atrás: lo que está adentro de la nave se
 * dibuja delante. Sólida en las paredes (con `solidos`), con el hueco de la puerta libre.
 */
export const IGLESIA = { backBase: 112, frontY: 180, side: 10, door: 64 };

function church(): Raster {
  const W = 192, H = 192, r = createRaster(W, H);
  const { backBase, frontY, side, door } = IGLESIA;
  const cx = 96;
  // el piso de la nave: lajas mojadas con charcos y ceniza
  for (let y = backBase; y < frontY; y++) for (let x = side; x < W - side; x++) {
    const bx = Math.floor((x + ((Math.floor(y / 12) % 2) * 9)) / 18), by = Math.floor(y / 12);
    const joint = (y % 12 === 0) || ((x + ((by % 2) * 9)) % 18 === 0);
    let l = 0.42 + (hash(bx, by, 91) - 0.5) * 0.2 - Math.abs(x - cx) / 600;
    if (hash(bx, by, 92) > 0.82) l -= 0.15; // laja hundida
    let c = joint ? S[1] : tone(S.slice(1), l, x, y);
    if (!joint && hash(x >> 2, y >> 2, 93) > 0.93) c = PUERTO.agua[3];
    if (!joint && hash(x, y, 94) > 0.985) c = '#7a7c7a';
    put(r, x, y, c);
  }
  // la pared de atrás: sillares con la ventana redonda (rosetón roto) y la torre del campanario rota
  const wallTop = 16;
  for (let y = 0; y < backBase; y++) for (let x = 0; x < W; x++) {
    const tower = x > cx - 22 && x < cx + 22;
    const top = tower ? Math.abs(Math.sin(x * 0.4)) * 3 + (x > cx + 10 ? 6 : 0) : wallTop + Math.abs(Math.sin(x * 0.13) * 8) + hash(x >> 3, 0, 95) * 10;
    if (y < top) continue;
    const row = Math.floor(y / 8), bx = Math.floor((x + (row % 2) * 7) / 14);
    const joint = y % 8 === 0 || (x + (row % 2) * 7) % 14 === 0;
    let l = 0.5 - (x / W) * 0.25 + (hash(bx, row, 96) - 0.5) * 0.16 - Math.max(0, (y - (backBase - 18)) / 18) * 0.2;
    if (tower) l += 0.06;
    let c = joint ? S[1] : tone(S.slice(1), l, x, y);
    if (!joint && hash(x >> 1, y >> 1, 97) > 0.95) c = PUERTO.alga[2];
    put(r, x, y, c);
  }
  // el hueco del campanario arriba (la campana se cayó: está abajo, en la nave) y dos ventanas altas a los costados
  for (let y = 0; y < backBase; y++) for (let x = 0; x < W; x++) {
    if (x > cx - 8 && x < cx + 8 && y > 4 && y < 16 && (y > 10 || Math.hypot(x - cx, y - 10) < 8)) put(r, x, y, '#020405');
    for (const wx of [22, W - 22]) if (Math.abs(x - wx) < 5 && y > 30 && y < 58 && (y > 36 || Math.hypot(x - wx, y - 36) < 5)) put(r, x, y, Math.abs(x - wx) > 3.6 ? S[4] : '#020405');
  }
  // el canto de arriba de la pared (con luz) y la línea donde la pared toca el piso
  for (let x = 0; x < W; x++) for (let y = 0; y < backBase; y++) { const k = (y * W + x) * 4; if (r.data[k + 3]) { put(r, x, y, S[6]); put(r, x, y + 1, S[5]); break; } }
  for (let x = side; x < W - side; x++) { put(r, x, backBase, '#020304'); put(r, x, backBase + 1, '#020304', 160); }
  // paredes de los costados: bajas, rotas (se ve su lomo desde arriba)
  for (const left of [true, false]) for (let y = backBase - 8; y < frontY + 8; y++) for (let k = 0; k < side; k++) {
    const x = left ? k : W - 1 - k;
    const broken = hash(Math.floor(y / 10), left ? 1 : 2, 98) > 0.82;
    if (broken && k > 3) continue;
    put(r, x, y, tone(S.slice(1), (left ? 0.75 : 0.45) - (k / side) * 0.15 + (hash(Math.floor(y / 6), k >> 2, 99) - 0.5) * 0.15, x, y));
  }
  // la pared de adelante: caída, solo unas hiladas con el hueco de la puerta en el medio y escombros
  for (let y = frontY - 6; y < frontY + 10; y++) for (let x = 0; x < W; x++) {
    if (Math.abs(x - cx) < door / 2) continue;
    const top = frontY - 6 + Math.abs(Math.sin(x * 0.2)) * 5 + hash(x >> 2, 1, 100) * 3;
    if (y < top) continue;
    put(r, x, y, tone(S.slice(1), (y < top + 2 ? 0.8 : 0.4) + (hash(x >> 2, y >> 2, 101) - 0.5) * 0.2, x, y));
  }
  // los escalones de la puerta
  for (let y = frontY + 2; y < frontY + 10; y++) for (let x = cx - door / 2; x < cx + door / 2; x++) put(r, x, y, S[y < frontY + 5 ? 4 : 3]);
  outline(r, '#030506');
  return r;
}

function churchObject(): WorldObject {
  const fr = church();
  const { backBase, frontY, side, door } = IGLESIA;
  const ay = backBase;
  // las paredes sólidas: la de atrás, los costados y la de adelante a los dos lados de la puerta
  const solids: [number, number, number, number][] = [
    [-96, -16, 192, 16],
    [-96, 0, side, frontY - backBase + 8],
    [96 - side, 0, side, frontY - backBase + 8],
    [-96, frontY - backBase - 4, 96 - door / 2, 12],
    [door / 2, frontY - backBase - 4, 96 - door / 2, 12],
  ];
  return { name: 'iglesia_ruina', w: 192, h: 192, anchor: [96, ay], solid: null, solids, anims: one(fr), shadow: contactShadow(fr, [96, ay], { rows: 6, spread: 2, tall: 3 }) };
}

// ---------------------------------------------------------------- primer plano y mar lejano

/** Rocas del primer plano (128 x 96, capa frente, suben del borde de abajo): siluetas mojadas casi negras. */
function frontRocks(v: number): WorldObject {
  const r = createRaster(128, 96);
  const peaks = Array.from({ length: 5 }, (_, i) => ({ x: 8 + i * 28 + hash(i, v, 111) * 12, h: 30 + hash(v, i, 112) * 60, w: 18 + hash(i, v, 113) * 16 }));
  for (let x = 0; x < 128; x++) {
    let top = 96;
    for (const p of peaks) { const d = Math.abs(x - p.x) / p.w; if (d < 1) top = Math.min(top, 96 - p.h * (1 - d * d) - hash(x >> 2, v, 114) * 4); }
    top = Math.min(top, 80 + hash(x >> 3, v, 115) * 8);
    for (let y = Math.floor(top); y < 96; y++) {
      const edge = y - top < 2;
      put(r, x, y, edge ? (x < 64 ? S[3] : S[2]) : y - top < 5 && hash(x, y, 116) > 0.7 ? PUERTO.brillo : S[y - top < 10 ? 1 : 0]);
    }
  }
  return { name: `rocas_frente_${v}`, w: 128, h: 96, anchor: [64, 96], solid: null, layer: 'frente', anims: one(r) };
}

/** Vigas del primer plano (128 x 96, capa frente, cuelgan del borde de arriba): maderos rotos de un muelle viejo con sogas que gotean. */
function frontBeams(v: number): WorldObject {
  const r = createRaster(128, 96);
  const beams: [number, number, number, number, number][] = v === 0 ? [[0, 8, 128, 14, 0.04], [30, 0, 10, 70, 0], [96, 0, 12, 52, 0.06]] : [[0, 16, 128, 12, -0.05], [12, 0, 12, 46, -0.03], [70, 0, 10, 80, 0.02]];
  for (const [x0, y0, w, h, rot] of beams) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X = x0 + x + (w > h ? 0 : y * rot), Y = y0 + y + (w > h ? x * rot : 0);
    const along = w > h ? y / h : x / w;
    put(r, X, Y, along < 0.15 ? M[2] : along > 0.8 ? '#08060a' : hash(Math.floor(X / 3), Math.floor(Y / 9), 121 + v) > 0.8 ? M[2] : M[1]);
  }
  // sogas que cuelgan
  for (let k = 0; k < 3; k++) { const x0 = 20 + k * 40 + v * 7; for (let t = 0; t < 20 + k * 12; t++) put(r, x0 + Math.sin(t * 0.3) * 1.2, 20 + t, PUERTO.red[1]); put(r, x0, 21 + 20 + k * 12, PUERTO.brillo); }
  return { name: `vigas_frente_${v}`, w: 128, h: 96, anchor: [64, 0], solid: null, layer: 'frente', anims: one(r) };
}

/** ruido de valor que pega por los lados (período px en x e y) */
function tnoise(x: number, y: number, cell: number, Wp: number, Hp: number, seed: number): number {
  const nx = Math.round(Wp / cell), ny = Math.round(Hp / cell), gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = gx - x0, fy = gy - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const v = (i: number, j: number) => hash(((i % nx) + nx) % nx, ((j % ny) + ny) % ny, seed);
  const a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/**
 * El mar negro que se pierde a lo lejos (512 x 256, capa fondo, pegan por los 4 lados). El 0 es lo más lejano: agua
 * casi negra con mástiles de barcos hundidos en silueta y el faro chiquito; el 1 son olas lentas (4 cuadros a 3 fps);
 * el 2, lo más cerca, motas de ceniza que flotan en el agua.
 */
function farSea(v: 0 | 1 | 2): WorldObject {
  const Wp = 512, Hp = 256, A = PUERTO.agua;
  const frame = (f: number) => {
    const r = createRaster(Wp, Hp);
    if (v === 0) {
      for (let y = 0; y < Hp; y++) for (let x = 0; x < Wp; x++) {
        const n = tnoise(x, y, 64, Wp, Hp, 131) * 0.6 + tnoise(x, y, 16, Wp, Hp, 132) * 0.4;
        const swell = Math.sin((y / Hp) * Math.PI * 2 * 8 + n * 3);
        put(r, x, y, swell > 0.85 ? A[1] : n > 0.62 ? '#04090b' : '#020506');
      }
      // mástiles en silueta: palos con verga y algún jirón de vela
      for (let k = 0; k < 7; k++) {
        const mx = Math.floor(hash(k, 1, 133) * Wp), my = Math.floor(hash(k, 2, 133) * Hp), h = 18 + Math.floor(hash(k, 3, 133) * 26), lean = (hash(k, 4, 133) - 0.5) * 0.3;
        for (let t = 0; t < h; t++) put(r, (mx + Math.round(t * lean) + Wp) % Wp, (my - t + Hp) % Hp, '#0c1616');
        for (let t = -6; t <= 6; t++) put(r, (mx + t + Math.round(h * 0.7 * lean) + Wp) % Wp, (my - Math.round(h * 0.7) + Hp) % Hp, '#0c1616');
        if (k % 2) for (let t = 0; t < 6; t++) put(r, (mx + 2 + t + Wp) % Wp, (my - Math.round(h * 0.7) + 1 + t + Hp) % Hp, '#101c1c');
      }
      // el faro chiquito, lejos, con su luz apagada
      const fx = 380, fy = 150;
      for (let y = 0; y < 22; y++) for (let x = -2 - Math.floor(y / 8); x <= 2 + Math.floor(y / 8); x++) put(r, fx + x, fy - 22 + y, '#0e1a1a');
      for (let x = -3; x <= 3; x++) put(r, fx + x, fy - 24, '#142222');
      put(r, fx, fy - 26, '#1c3030');
    } else if (v === 1) {
      const ph = (f / 4) * Math.PI * 2;
      for (let y = 0; y < Hp; y++) for (let x = 0; x < Wp; x++) {
        const n = tnoise(x, y, 64, Wp, Hp, 134);
        // crestas largas y lentas que corren de lado
        const crest = Math.sin((x / Wp) * Math.PI * 2 * 3 + (y / Hp) * Math.PI * 2 * 10 + n * 4 + ph);
        if (crest > 0.9) put(r, x, y, A[3], Math.round((crest - 0.9) * 10 * 140));
        else if (crest > 0.75 && n > 0.55) put(r, x, y, A[2], 70);
        if (crest > 0.985 && hash(x >> 2, y, 135 + f) > 0.7) put(r, x, y, PUERTO.brillo, 140);
      }
    } else {
      for (let i = 0; i < 260; i++) {
        const x = Math.floor(hash(i, 1, 136) * Wp), y = Math.floor(hash(i, 2, 136) * Hp);
        put(r, x, y, hash(i, 3, 136) > 0.85 ? '#8a8e8c' : '#4a5250', 180);
      }
    }
    return r;
  };
  const anims = v === 1 ? { idle: { frames: [0, 1, 2, 3].map(frame), fps: 3, loop: true } } : one(frame(0));
  return { name: `fondo_mar_lejos_${v}`, w: Wp, h: Hp, anchor: [0, 0], solid: null, layer: 'fondo', anims };
}

/** Paralaje de cada fondo del mar (el 0 es el más lejano). */
export const MAR_PARALAJE = [0.55, 0.72, 0.88];

// ---------------------------------------------------------------- el cuarto pedazo del mural

/**
 * `mural_4` (128 x 96, en la pared de adentro de la iglesia): dibujos sin texto. La figura de los ojos rojos, alta y
 * oscura, con los faroles del pueblo colgando de sus manos (las lucecitas ámbar que se lleva), y los pescadores que
 * miran desde sus botes en el agua. Pintura vieja descascarada sobre la piedra mojada.
 */
function mural4(): WorldObject {
  const r = createRaster(128, 96);
  for (let y = 0; y < 96; y++) for (let x = 0; x < 128; x++) {
    const edge = x < 3 || y < 3 || x > 124 || y > 92;
    put(r, x, y, edge ? S[2] : hash(x >> 2, y >> 2, 141) > 0.8 ? S[5] : S[4]);
  }
  const ink = '#d0c4a0', dark = '#0a0c10', red = '#e04a3a', amber = PUERTO.ambar, sea = '#2a5a58';
  // el mar abajo: líneas de olas
  for (let x = 6; x < 122; x++) for (const y0 of [74, 82]) put(r, x, y0 + Math.round(Math.sin(x * 0.3 + y0) * 1.4), sea);
  // la figura: silueta alta en el medio, capucha, brazos abiertos
  for (let y = 12; y < 74; y++) {
    const w = y < 26 ? 7 * Math.sqrt(Math.max(0, 1 - ((y - 19) / 7.5) ** 2)) : 8 + (y - 26) * 0.25;
    for (let x = -w; x <= w; x++) put(r, 64 + x, y, dark);
  }
  for (const s of [-1, 1]) for (let t = 0; t < 26; t++) for (let k = 0; k < 2; k++) put(r, 64 + s * (8 + t), 30 + t * 0.35 + k, dark);
  for (const ex of [61, 67]) { put(r, ex, 19, red); put(r, ex + 1, 19, red); }
  // los faroles del pueblo colgando de sus manos (se los lleva)
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const hx = 64 + s * (30 + k * 3), hy = 40 + k * 6;
    for (let t = 0; t < 4; t++) put(r, hx, hy - 4 + t, ink);
    for (let y = 0; y < 4; y++) for (let x = -1; x <= 1; x++) put(r, hx + x, hy + y, y === 0 ? ink : amber);
  }
  // los pescadores en sus botes, mirando
  const boat = (bx: number, by: number) => {
    for (let x = -9; x <= 9; x++) { put(r, bx + x, by, ink); if (Math.abs(x) < 8) put(r, bx + x, by + 1, ink); }
    for (const px of [-3, 3]) { for (let y = 0; y < 6; y++) put(r, bx + px, by - 1 - y, ink); for (let a = 0; a < 360; a += 45) put(r, bx + px + Math.cos((a * Math.PI) / 180) * 1.6, by - 9 + Math.sin((a * Math.PI) / 180) * 1.6, ink); }
  };
  boat(20, 76); boat(104, 74); boat(40, 84);
  // descascarado
  for (let i = 0; i < 16; i++) { const cx = 8 + hash(i, 1, 143) * 112, cy = 8 + hash(i, 2, 143) * 80, s = 2 + hash(i, 3, 143) * 4; for (let y = -s; y <= s; y++) for (let x = -s; x <= s; x++) if (x * x + y * y <= s * s && hash(x, y + i, 144) > 0.3) put(r, cx + x, cy + y, S[3]); }
  // chorretes de humedad que bajan
  for (let k = 0; k < 6; k++) { const x0 = 10 + k * 21; for (let t = 0; t < 20 + hash(k, 0, 145) * 50; t++) put(r, x0, 4 + t, S[2], 150); }
  return { name: 'mural_4', w: 128, h: 96, anchor: [64, 95], solid: null, anims: one(r) };
}

// ---------------------------------------------------------------- calcomanías del puerto

/** Calcomanías (capa suelo): charcos con brillo, algas, tablas sueltas, escamas y conchas, ceniza y piedritas mojadas. */
function decals(): WorldObject[] {
  const out: WorldObject[] = [];
  const mk = (name: string, w: number, h: number, draw: (r: Raster) => void) => { const r = createRaster(w, h); draw(r); out.push({ name, w, h, anchor: [w >> 1, h >> 1], solid: null, layer: 'suelo', anims: one(r) }); };
  for (const v of [0, 1, 2]) mk(`charco_puerto_${v}`, 48, 24, (r) => {
    const rx = 14 + v * 4, ry = 5 + v;
    for (let y = 0; y < 24; y++) for (let x = 0; x < 48; x++) {
      const d = Math.hypot((x - 24) / rx, (y - 12) / ry) + (hash(x >> 2, y >> 1, 151 + v) - 0.5) * 0.25;
      if (d < 1) put(r, x, y, d > 0.85 ? '#0a1414' : y < 11 && x < 22 ? PUERTO.agua[4] : PUERTO.agua[2], 230);
    }
    for (let x = 18; x < 24; x++) put(r, x, 9, PUERTO.brillo, 200);
  });
  for (const v of [0, 1, 2]) mk(`algas_${v}`, 32, 16, (r) => {
    for (let k = 0; k < 4 + v; k++) { const x0 = 4 + hash(k, v, 152) * 22, y0 = 4 + hash(v, k, 153) * 8; for (let t = 0; t < 8; t++) put(r, x0 + Math.sin(t * 0.7 + k) * 2 + t * 0.5, y0 + t * 0.4, PUERTO.alga[(t + k) % 3]); }
  });
  for (const v of [0, 1]) mk(`tablas_sueltas_${v}`, 48, 24, (r) => {
    for (let k = 0; k < 2 + v; k++) { const x0 = 4 + k * 12, y0 = 6 + k * 4, a = (hash(k, v, 154) - 0.5) * 0.6; for (let t = 0; t < 24; t++) for (let w = 0; w < 4; w++) put(r, x0 + t * Math.cos(a) - w * Math.sin(a), y0 + t * Math.sin(a) + w * Math.cos(a), M[w === 0 ? 4 : w === 3 ? 1 : 3]); }
  });
  for (const v of [0, 1]) mk(`escamas_conchas_${v}`, 24, 16, (r) => {
    for (let k = 0; k < 7; k++) { const x = 3 + hash(k, v, 155) * 18, y = 3 + hash(v, k, 156) * 10; put(r, x, y, k % 3 ? '#8a9a96' : '#c8c0a8'); put(r, x + 1, y, '#5a6a66'); }
  });
  for (const v of [0, 1]) mk(`ceniza_suelo_${v}`, 32, 24, (r) => {
    for (let i = 0; i < 30; i++) { const a = hash(i, v, 157) * Math.PI * 2, d = Math.sqrt(hash(v, i, 158)) * 11; put(r, 16 + Math.cos(a) * d * 1.3, 12 + Math.sin(a) * d * 0.7, hash(i, i, 159) > 0.6 ? '#6a6e6c' : '#3a3e3c', 200); }
  });
  for (const v of [0, 1, 2]) mk(`piedras_mojadas_${v}`, 32, 24, (r) => {
    for (let k = 0; k < 3 + v; k++) { const cx = 6 + hash(k, v, 160) * 20, cy = 6 + hash(v, k, 161) * 12, s = 2 + hash(k, k, 162 + v) * 2.4; for (let y = -s; y <= s; y++) for (let x = -s * 1.3; x <= s * 1.3; x++) if ((x / (s * 1.3)) ** 2 + (y / s) ** 2 < 1) put(r, cx + x, cy + y, y < -s * 0.3 ? S[5] : S[3]); put(r, cx - 1, cy - s + 1, PUERTO.brillo); }
  });
  return out;
}

// ---------------------------------------------------------------- criaturas y la figura mojada

/** Los ojos del marinero de niebla fuera de la luz (16 x 8): dos linternitas verdes, parpadeo de 4 cuadros a 3 fps. */
export function marinerEyes(): Creature {
  const frame = (o: number) => {
    const r = createRaster(16, 8);
    for (const ex of [4, 10]) {
      if (o >= 1) { put(r, ex, 3, '#e0fff0'); put(r, ex + 1, 3, PUERTO.fatuo); put(r, ex, 4, '#3ac890'); put(r, ex + 1, 4, '#3ac890'); put(r, ex, 2, PUERTO.fatuo, 120); put(r, ex + 1, 5, '#1a6a4a', 140); }
      else if (o > 0) { put(r, ex, 4, PUERTO.fatuo); put(r, ex + 1, 4, PUERTO.fatuo); }
    }
    return r;
  };
  return { name: 'marinero_ojos', w: 16, h: 8, anims: { parpadeo: { frames: [frame(1), frame(1), frame(0.5), frame(0)], fps: 3, loop: true } } };
}

/** La figura de los ojos rojos, mojada: la de las Galerías con gotas que le caen del manto y un charquito al pie. */
export function wetFigure(base: WorldObject): WorldObject {
  const anims: Record<string, Anim> = {};
  for (const [name, a] of Object.entries(base.anims)) {
    anims[name] = {
      ...a, frames: a.frames.map((fr, f) => {
        const r = createRaster(fr.w, fr.h);
        r.data.set(fr.data);
        // el manto se oscurece abajo (empapado) y brilla en los bordes
        for (let y = 36; y < fr.h; y++) for (let x = 0; x < fr.w; x++) { const k = (y * fr.w + x) * 4; if (r.data[k + 3] > 100 && hash(x, y, 171) > 0.9) put(r, x, y, '#1c3a3a'); }
        if (name === 'idle') {
          // gotas que caen del ruedo, una por cuadro en distinto lugar, y el charquito
          for (let k = 0; k < 3; k++) { const x = 16 + ((k * 7 + f * 5) % 18), y = 56 + ((f + k) % 4) * 2; put(r, x, y, PUERTO.brillo, 220); put(r, x, y - 1, '#2a5a58', 160); }
          for (let x = 13; x < 36; x++) put(r, x, 61, PUERTO.agua[3], 200);
          for (let x = 17; x < 31; x++) put(r, x, 62, PUERTO.agua[2], 180);
        }
        return r;
      }),
    };
  }
  return { ...base, name: 'figura_ojos_mojada', anims, base: 'figura_ojos' };
}

/**
 * Variantes `_b` de la utilería chica: el mismo objeto visto del otro lado (espejado), con otro tono de madera o de
 * piedra. Así una pantalla llena de cosas no repite ninguna igual.
 */
function variantB(o: WorldObject, tint: [number, number, number]): WorldObject {
  const flip = (fr: Raster) => {
    const r = createRaster(fr.w, fr.h);
    for (let y = 0; y < fr.h; y++) for (let x = 0; x < fr.w; x++) {
      const si = (y * fr.w + x) * 4, di = (y * fr.w + (fr.w - 1 - x)) * 4;
      for (let c = 0; c < 3; c++) r.data[di + c] = Math.max(0, Math.min(255, Math.round(fr.data[si + c] * tint[c])));
      r.data[di + 3] = fr.data[si + 3];
    }
    return r;
  };
  const anims: Record<string, Anim> = {};
  for (const [k, a] of Object.entries(o.anims)) anims[k] = { ...a, frames: a.frames.map(flip) };
  const mirrorBox = (b: [number, number, number, number]): [number, number, number, number] => [-(b[0] + b[2]) + (o.w - 2 * o.anchor[0]), b[1], b[2], b[3]];
  const anchor: [number, number] = [o.w - 1 - o.anchor[0], o.anchor[1]];
  return { ...o, name: `${o.name}_b`, anchor, solid: o.solid ? mirrorBox(o.solid) : null, ...(o.solids ? { solids: o.solids.map(mirrorBox) } : {}), anims, ...(o.shadow ? { shadow: flip(o.shadow) } : {}) };
}

const VARIANTES: Record<string, [number, number, number]> = {
  cajon_puerto: [0.82, 0.86, 0.9], barril_pescado: [1.08, 1.0, 0.9], nasa_rota: [0.85, 0.9, 0.95], cuerda_enrollada: [0.9, 0.95, 0.92],
  boya_vieja: [0.55, 0.85, 1.05], pilote_muelle: [0.85, 0.85, 0.9], puesto_volteado: [0.9, 1.0, 1.05], cajones_mercado: [1.08, 1.02, 0.92],
  ancla_vieja: [0.85, 1.0, 0.95], roca_puerto_0: [0.9, 1.0, 1.0], roca_puerto_1: [0.88, 0.95, 1.0], roca_puerto_2: [0.92, 1.0, 0.98], remos_tirados: [0.86, 0.9, 0.95],
};

export function puertoObjectsB(): WorldObject[] {
  const base = puertoObjectsBase();
  return [...base, ...base.filter((o) => VARIANTES[o.name]).map((o) => variantB(o, VARIANTES[o.name]))];
}

function puertoObjectsBase(): WorldObject[] {
  return [
    ...houses(), overturned(0), overturned(1), overturned(2), sunkBoat(), ...nets(), ...marketProps(), ...dockProps(),
    wetRock(0), wetRock(1), wetRock(2), bellObject(), churchObject(), frontRocks(0), frontRocks(1), frontBeams(0), frontBeams(1), farSea(0), farSea(1), farSea(2),
    mural4(), ...decals(),
  ];
}

void glowMat;
