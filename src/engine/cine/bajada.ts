import { createRaster, type Raster } from '../core/raster';
import { renderClip } from '../render/clip';
import { familyFicha, thorFicha, FAMILY, type FamilyId } from '../rpg/family';
import { hex, mixc, clamp01, hash, vnoise, fbm, bayer, setPx, alphaAt, addLight, vgrad, glow, halo, fillPoly, stroke, curva, ellipse, contorno, canto, pegar } from './pintura';
import { caraDiablo, garra, cuerno, DIABLO } from './diablo';

/**
 * La cinemática de la bajada al infierno (encargo F13, parte 1). Seis paneles en el formato del intro: 480 x 270 (la
 * escalera 480 x 540, la cámara baja), cada uno con sus capas para el paralaje. Es lo más oscuro del juego: frío,
 * negro y azul, con la brasa roja del Diablo como única luz caliente. Sin sangre y sin sustos de golpe: todo lo que
 * da miedo aparece de a poco.
 *
 * Una capa puede traer `por_heroina`: la misma capa dibujada para cada heroína (la escalera). El juego usa la de la
 * heroína del perfil.
 */

export const CW = 480, CH = 270;

export interface CineCapa { nombre: string; frames: Raster[]; fps: number; paralaje: number; por_heroina?: Record<string, Raster[]>; bucle?: boolean }
export interface CinePanel { id: string; w: number; h: number; capas: CineCapa[]; notas: string }

const HIELO = { negro: hex('#03050a'), noche: hex('#070b16'), hondo: hex('#0c1628'), azul: hex('#1a3050'), medio: hex('#2e5478'), claro: hex('#6a9cc8'), luz: hex('#b8e0ff'), blanco: hex('#eef8ff') };

/**
 * Un helecho de escarcha: un tallo curvo con ramitas a los dos lados que se achican hacia la punta (como el hielo
 * que crece en un vidrio). `crece` de 0 a 1 corta el largo.
 */
export function helecho(r: Raster, x: number, y: number, ang: number, largo: number, seed: number, crece = 1, alfa = 255, achata = 1) {
  const L = largo * crece;
  if (L < 2) return;
  const curv = (hash(seed, 1, 390) - 0.5) * 0.02;
  let px = x, py = y, a = ang;
  for (let s = 0; s < L; s += 1) {
    a += curv;
    const nx = px + Math.cos(a), ny = py + Math.sin(a) * achata;
    const t = s / largo;
    setPx(r, nx, ny, t < 0.7 ? HIELO.luz : HIELO.blanco, alfa);
    // ramitas cada tanto, a los dos lados, más cortas hacia la punta
    if (s > 2 && Math.round(s) % 4 === 0) for (const side of [-1, 1]) {
      const b = a + side * 1.0, bl = (1 - t) * largo * 0.22 * (0.6 + hash(seed, s * side, 391) * 0.6);
      for (let q = 1; q < bl; q++) setPx(r, nx + Math.cos(b) * q, ny + Math.sin(b) * q * achata, q < bl * 0.6 ? HIELO.claro : HIELO.luz, Math.round(alfa * 0.85));
    }
    px = nx; py = ny;
  }
  setPx(r, px, py, HIELO.blanco, alfa);
}

// ---------------------------------------------------------------- 1. la Puerta Negra se abre

function puerta(): CinePanel {
  const W = CW, H = CH, PX = 240, BOT = 198, PW = 78, TOP = 22; // la puerta: centro, piso, media anchura y la punta del arco
  // el arco ojival: la altura del borde de arriba en cada x
  const arco = (x: number, pw = PW) => { const u = Math.abs(x - PX) / pw; return u >= 1 ? BOT : TOP + u ** 1.6 * 70; };
  // fondo: la sala de la Fragua, paredes de basalto con brasas, el piso
  const fondo = createRaster(W, H);
  vgrad(fondo, [[0, '#040203'], [0.55, '#120705'], [0.74, '#261008'], [1, '#100504']]);
  for (const cx of [36, 112, 368, 444]) {
    fillPoly(fondo, [[cx - 20, 0], [cx + 20, 0], [cx + 24, BOT], [cx - 24, BOT]], (x, y) => mixc(hex('#090505'), hex('#2a120c'), clamp01((y - 70) / 140) * 0.7 + (x > cx + 12 ? -0.25 : x < cx - 14 ? 0.1 : 0)));
    for (let y = 18; y < BOT; y += 30) stroke(fondo, [cx - 22, y], [cx + 22, y + 2], 0.6, hex('#040202'));
  }
  for (let y = BOT; y < H; y++) for (let x = 0; x < W; x++) {
    const t = (y - BOT) / (H - BOT);
    // losas en perspectiva
    const u = (x - PX) / (1 + t * 3), junta = Math.abs(((u / 22) % 1 + 1) % 1 - 0.5) > 0.47 || Math.abs((((t * 6) ** 1.4) % 1) - 0.5) > 0.46;
    setPx(fondo, x, y, junta ? hex('#0a0504') : mixc(hex('#160806'), hex('#2e140c'), clamp01(t * 0.8)));
  }
  // medio: la puerta, los braseros, la niebla y la escarcha (8 cuadros)
  const abre = [0, 0.05, 0.12, 0.2, 0.3, 0.4, 0.5, 0.58];
  const fuego = [1, 0.95, 0.82, 0.62, 0.4, 0.18, 0, 0];
  const helada = [0, 0.06, 0.16, 0.3, 0.46, 0.64, 0.82, 1];
  const medio: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const r = createRaster(W, H);
    // el marco: obsidiana con dientes de hueso a lo largo del arco
    const MW = PW + 26;
    fillPoly(r, [[PX - MW, BOT + 2], ...Array.from({ length: 41 }, (_, i) => { const x = PX - MW + (i / 40) * MW * 2; return [x, arco(x, MW) - 26] as [number, number]; }), [PX + MW, BOT + 2]], (x, y) => mixc(hex('#050306'), hex('#1c1418'), clamp01(vnoise(x, y, 14, 303) * 0.5 + (y - TOP) / 400)));
    for (let i = 1; i < 14; i++) {
      const x = PX - MW + (i / 14) * MW * 2, y = arco(x, MW) - 26;
      const ang = Math.atan2(y - (TOP + 90), x - PX);
      fillPoly(r, [[x - 4, y + 2], [x + Math.cos(ang) * 16, y + Math.sin(ang) * 16], [x + 4, y + 2]], hex('#3a2e2a'));
      setPx(r, x + Math.cos(ang) * 12, y + Math.sin(ang) * 12, hex('#6a5a50'));
    }
    // canales tallados en el marco, con la brasa que se apaga
    for (const side of [-1, 1]) for (let y = arco(PX + side * (MW - 12), MW) - 10; y < BOT; y += 3) setPx(r, PX + side * (MW - 12), y, mixc(hex('#1a0806'), hex('#ff5a1a'), fuego[f] * 0.9));
    // adentro: rendija de luz de hielo; las hojas de hierro negro con bandas y la escarcha que las cubre
    const gap = abre[f] * PW;
    for (let y = TOP; y < BOT; y++) for (let x = PX - PW; x <= PX + PW; x++) {
      if (y < arco(x)) continue;
      const dx = Math.abs(x - PX);
      if (dx < gap) {
        const t = dx / Math.max(1, gap), n = vnoise(x + f * 5, y * 0.5, 16, 304);
        setPx(r, x, y, mixc(HIELO.blanco, HIELO.claro, clamp01(t * 0.7 + n * 0.35)));
      } else {
        const borde = dx - gap < 2 && gap > 0;
        const lx = (dx - gap) / (PW - gap);
        const banda = (y - TOP) % 34 < 4;
        const panel = Math.abs(((lx * 3) % 1) - 0.5) > 0.44;
        let c = borde ? HIELO.luz : banda ? hex('#1e1c24') : panel ? hex('#040306') : mixc(hex('#09080c'), hex('#15131a'), clamp01(1 - lx) * 0.8);
        if (banda && (Math.round(x) % 9 === 0)) c = hex('#3a3644');
        // escarcha en las hojas, desde el borde que se abre
        if (!borde && helada[f] > 0 && vnoise(x, y, 6, 312) * 0.6 + (1 - lx) * 0.6 > 1.15 - helada[f] * 0.5) c = mixc(c, HIELO.claro, 0.6);
        setPx(r, x, y, c);
      }
    }
    // la luz que sale de la rendija: halo y una cuña de luz y niebla en el piso
    if (gap > 0) {
      halo(r, PX, (TOP + BOT) / 2 + 20, gap * 2.5 + 30, 120, HIELO.claro, 0.4 * Math.min(1, gap / 24));
      for (let y = BOT; y < H; y++) {
        const t = (y - BOT) / (H - BOT), half = gap * (1 + t * 3.5) + t * 30;
        for (let x = PX - half; x <= PX + half; x++) {
          const n = vnoise(x * 0.5 - f * 4, y * 2, 10, 313);
          setPx(r, x, y, mixc(HIELO.luz, HIELO.blanco, n), Math.round(clamp01((0.55 - t * 0.3) * (1 - Math.abs(x - PX) / half) + n * 0.15) * 230 * Math.min(1, gap / 20)));
        }
      }
    }
    // los braseros: el fuego se achica y se apaga; queda humo
    for (const bx of [86, 394]) {
      fillPoly(r, [[bx - 14, 168], [bx + 14, 168], [bx + 8, 184], [bx - 8, 184]], hex('#1a1214'));
      stroke(r, [bx, 184], [bx, 200], 2.4, hex('#141016'));
      stroke(r, [bx - 10, 200], [bx + 10, 200], 1.4, hex('#141016'));
      const fz = fuego[f];
      if (fz > 0) {
        for (let y = 0; y < 26 * fz; y++) {
          const w = 11 * (1 - y / (26 * fz)) * fz + 1;
          for (let x = -w; x <= w; x++) {
            const t = y / (26 * fz) + Math.abs(x) / 14 + (vnoise(bx + x, y - f * 8, 4, 307) - 0.5) * 0.4;
            setPx(r, bx + x, 167 - y, t < 0.35 ? hex('#fff0b0') : t < 0.6 ? hex('#ffb040') : t < 0.85 ? hex('#ff6a1a') : hex('#a02a0a'));
          }
        }
        halo(r, bx, 158, 60 * fz, 50 * fz, hex('#ff7a2a'), 0.6 * fz);
      } else for (let i = 0; i < 12; i++) { const y = 164 - i * 5 - (f % 2) * 2, x = bx + Math.sin(i * 0.8 + f) * (2 + i * 0.5); ellipse(r, x, y, 2 + i * 0.25, 1.6 + i * 0.2, hex('#3a3440'), Math.round(150 * (1 - i / 12))); }
    }
    // la escarcha: helechos de hielo que salen del umbral y crecen por el piso hacia la cámara
    for (let k = 0; k < 22; k++) {
      const a = Math.PI / 2 + (k / 21 - 0.5) * 2.6;
      const x0 = PX + (k / 21 - 0.5) * PW * 1.6, y0 = BOT + 1;
      helecho(r, x0, y0, a, 60 + hash(k, 1, 314) * 110, k, helada[f], 230, 0.5);
    }
    // y una capa de hielo pálida debajo, que avanza con ellos
    const R = helada[f] * 230;
    if (R > 0) for (let y = BOT; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - PX) / 2.2, (y - BOT) * 1.4) + (vnoise(x, y, 18, 308) - 0.5) * 30;
      if (d < R && !alphaAt(r, x, y)) setPx(r, x, y, HIELO.claro, Math.round(clamp01(1 - d / R) * 90 + 30));
    }
    medio.push(r);
  }
  // frente: el viento helado que sale hacia la cámara y dos columnas negras en los bordes
  const frente: Raster[] = [];
  for (let f = 0; f < 6; f++) {
    const r = createRaster(W, H);
    for (let i = 0; i < 60; i++) {
      const fase = (hash(i, 1, 312) + f / 6) % 1;
      const ang = (hash(i, 2, 312) - 0.5) * 2.4;
      const d = fase * 300;
      const x = PX + Math.sin(ang) * d * 1.3, y = 130 + Math.cos(ang) * d * 0.4 + fase * 50;
      const big = fase > 0.6 && hash(i, 3, 312) > 0.5;
      setPx(r, x, y, HIELO.blanco, Math.round(230 * Math.sin(fase * Math.PI)));
      if (big) { setPx(r, x + 1, y, HIELO.luz, 170); setPx(r, x, y + 1, HIELO.luz, 170); }
    }
    for (const side of [-1, 1]) fillPoly(r, side < 0 ? [[0, 0], [26, 0], [20, H], [0, H]] : [[W, 0], [W - 26, 0], [W - 20, H], [W, H]], hex('#030203'));
    frente.push(r);
  }
  return { id: 'bajada_puerta', w: W, h: H, notas: 'La Puerta Negra se abre de a poco (8 cuadros a 5 fps, sin bucle: quedarse en el último). Por la rendija sale luz de hielo y niebla; los braseros de la Fragua y la brasa del marco se apagan y la escarcha crece en helechos por el piso. Delante, el viento helado viene hacia la cámara.', capas: [
    { nombre: 'fondo', frames: [fondo], fps: 1, paralaje: 0.4 },
    { nombre: 'medio', frames: medio, fps: 5, paralaje: 0.7, bucle: false },
    { nombre: 'frente', frames: frente, fps: 10, paralaje: 1 },
  ] };
}

// ---------------------------------------------------------------- 2. la escalera interminable

function escalera(): CinePanel {
  const W = CW, H = 540;
  // fondo: el abismo de hielo, que se aclara hacia abajo (la luz fría del lago), columnas lejanas y niebla
  const fondo = createRaster(W, H);
  vgrad(fondo, [[0, '#020306'], [0.35, '#050a14'], [0.75, '#0c1a2e'], [1, '#2a4a70']]);
  for (let k = 0; k < 11; k++) {
    const x = 10 + k * 46 + hash(k, 1, 320) * 20, w = 5 + hash(k, 2, 320) * 12;
    for (let y = 0; y < H; y++) { const ww = w * (0.75 + 0.25 * Math.sin(y * 0.02 + k)); for (let dx = -ww; dx <= ww; dx++) setPx(fondo, x + dx, y, mixc(hex('#060c16'), hex('#2a4a6a'), clamp01((y - 200) / 500) * (dx > ww * 0.4 ? 0.9 : 0.35))); }
  }
  for (let y = 260; y < H; y++) for (let x = 0; x < W; x++) { const n = fbm(x, y * 1.5, 321); if (n > 0.42) addLight(fondo, x, y, HIELO.azul, (n - 0.42) * 1.4 * ((y - 260) / 280)); }
  glow(fondo, 240, H, 260, 120, HIELO.claro, 0.35);
  // medio: los acantilados a los costados y la escalera tallada en la cresta
  const medio = createRaster(W, H);
  for (const side of [-1, 1]) {
    const borde = (y: number) => 240 + side * (110 + y * 0.18 + Math.sin(y * 0.03 + side) * 18 + (fbm(y, side * 50, 322) - 0.5) * 30);
    for (let y = 0; y < H; y++) {
      const b = borde(y);
      for (let x = side < 0 ? 0 : Math.floor(b); side < 0 ? x <= b : x < W; x++) {
        const d = Math.abs(x - b);
        // hielo: vetas verticales, el borde que da al abismo más claro
        const veta = vnoise(x * 3, y * 0.15, 8, 323 + side);
        setPx(medio, x, y, mixc(hex('#0a1626'), hex('#3a6488'), clamp01((d < 6 ? 0.7 : 0.15) + veta * 0.35 - y / 1400)));
      }
    }
  }
  // la escalera: tramos en zigzag que bajan por la pared, cada uno más chico (más lejos) y más tapado por la niebla.
  // De costado se ve el perfil de cada escalón: la huella clara con escarcha arriba, la contrahuella y la roca abajo
  const tramos: { x0: number; y0: number; x1: number; y1: number; k: number }[] = [];
  let tx = 410, ty = 92, k = 1.45, dir = -1;
  for (let i = 0; i < 9; i++) {
    const largo = 230 * k, x1 = Math.max(46, Math.min(434, tx + dir * largo));
    const y1 = ty + Math.abs(x1 - tx) * 0.55;
    tramos.push({ x0: tx, y0: ty, x1, y1, k });
    tx = x1 - dir * 8 * k; ty = y1 + 10 * k; dir = -dir; k *= 0.72;
    tx = 240 + (tx - 240) * 0.9;
  }
  tramos.forEach((t, i) => {
    const niebla = clamp01(i / 7);
    const huella = mixc(hex('#7aa0c8'), hex('#1e3a58'), niebla), contra = mixc(hex('#2a4a6a'), hex('#12263c'), niebla), roca = mixc(hex('#0a1626'), hex('#0e2034'), niebla), filo = mixc(HIELO.blanco, HIELO.claro, niebla);
    const sx = Math.sign(t.x1 - t.x0), run = 9 * t.k, rise = run * 0.55, prof = 7 * t.k, cuerpo = 24 * t.k;
    const n = Math.max(1, Math.round(Math.abs(t.x1 - t.x0) / run));
    // el cuerpo de roca debajo de todo el tramo
    fillPoly(medio, [[t.x0, t.y0], [t.x1, t.y1], [t.x1, t.y1 + cuerpo], [t.x0, t.y0 + cuerpo]], (x, y) => mixc(roca, contra, vnoise(x, y, 6 * t.k + 1, 330) * 0.3));
    for (let j = 0; j < n; j++) {
      const xa = t.x0 + sx * j * run, ya = t.y0 + j * rise, xb = xa + sx * run;
      // la huella: vista un poco desde arriba, una franja de `prof` de alto
      fillPoly(medio, [[xa, ya - prof], [xb, ya - prof], [xb, ya], [xa, ya]], (_x, y) => (y < ya - prof + 1.2 ? filo : huella));
      // la contrahuella que baja al escalón siguiente
      fillPoly(medio, [[xb, ya], [xb + sx * 0.01, ya], [xb, ya + rise], [xb - sx * Math.max(1, run * 0.12), ya + rise]], contra);
      stroke(medio, [xb, ya - prof], [xb, ya + rise - prof], 0.5, contra);
      // escarcha en algunos escalones
      if (hash(i, j, 331) > 0.6) setPx(medio, xa + sx * run * 0.5, ya - prof + 1, HIELO.blanco);
    }
    // el descanso entre tramos
    fillPoly(medio, [[t.x1 - 12 * t.k, t.y1 - prof], [t.x1 + 12 * t.k, t.y1 - prof], [t.x1 + 12 * t.k, t.y1 + 8 * t.k], [t.x1 - 12 * t.k, t.y1 + 8 * t.k]], huella);
  });
  const t0 = tramos[0];
  const hx = t0.x0 + (t0.x1 - t0.x0) * 0.3, hy = t0.y0 + Math.abs(t0.x1 - t0.x0) * 0.3 * 0.55 - 7;
  // la heroína y Thor: chiquitos, de espaldas, bajando, con su luz (una capa por heroína)
  const thor = renderClip(thorFicha(0), 48, 'walk', 'sw').frames;
  const porHeroina: Record<string, Raster[]> = {};
  for (const id of FAMILY as readonly FamilyId[]) {
    const walk = renderClip(familyFicha(id, true), 48, 'walk', 'nw', { props: true }).frames;
    porHeroina[id] = Array.from({ length: 8 }, (_, f) => {
      const r = createRaster(W, H);
      halo(r, hx, hy - 16, 56, 40, hex('#ffd890'), 0.42);
      pegar(r, walk[f % walk.length], Math.round(hx - 14), Math.round(hy - 46));
      pegar(r, thor[f % thor.length], Math.round(hx - 40), Math.round(hy - 36));
      return r;
    });
  }
  // frente: carámbanos colgando arriba, una cadena con escarcha a la izquierda y copos que caen
  const frente: Raster[] = [];
  for (let f = 0; f < 6; f++) {
    const r = createRaster(W, H);
    for (let k = 0; k < 22; k++) {
      const x0 = hash(k, 1, 326) * W, len = 14 + hash(k, 2, 326) * 50, w = 2 + hash(k, 3, 326) * 5;
      fillPoly(r, [[x0 - w, 0], [x0 + w, 0], [x0 + w * 0.2, len]], (xx) => (xx > x0 ? hex('#16304a') : hex('#3a6488')));
      stroke(r, [x0 - w + 1, 0], [x0, len * 0.8], 0.5, HIELO.luz);
    }
    for (let i = 0; i < 90; i++) {
      const fase = (hash(i, 1, 327) + f / 6) % 1;
      const xx = (hash(i, 2, 327) * W + fase * 30) % W, yy = fase * H;
      const big = hash(i, 3, 327) > 0.85;
      setPx(r, xx, yy, HIELO.blanco, big ? 230 : 150); if (big) { setPx(r, xx + 1, yy, HIELO.luz, 160); setPx(r, xx, yy + 1, HIELO.luz, 160); }
    }
    frente.push(r);
  }
  return { id: 'bajada_escalera', w: W, h: H, notas: 'Una escalera tallada en la pared de hielo baja en zigzag, tramo tras tramo, cada vez más chica, hasta perderse en la niebla y la luz fría del lago (480 x 540: la cámara baja de arriba a abajo). La heroína y Thor, chiquitos y de espaldas, bajan el primer tramo con su luz: la capa `heroina` trae `por_heroina` (rick, steph, sophie, alana), usar la del perfil.', capas: [
    { nombre: 'fondo', frames: [fondo], fps: 1, paralaje: 0.5 },
    { nombre: 'medio', frames: [medio], fps: 1, paralaje: 0.8 },
    { nombre: 'heroina', frames: porHeroina.sophie, fps: 8, paralaje: 0.8, por_heroina: porHeroina },
    { nombre: 'frente', frames: frente, fps: 8, paralaje: 1 },
  ] };
}

// ---------------------------------------------------------------- 3. el lago congelado con los gigantes

/**
 * La cara de un gigante atrapado bajo el hielo, de frente y mirando hacia arriba (hacia la cámara): frente, cejas,
 * nariz, barba de escarcha y los ojos abiertos con una luz pálida. Todo en azules: se ve a través del hielo.
 */
function gigante(r: Raster, cx: number, cy: number, k: number, seed: number) {
  const piel = (x: number, y: number, l: number) => mixc(hex('#081424'), hex('#4a7aa0'), clamp01(l + (vnoise(x, y, 5 * k, seed) - 0.5) * 0.15));
  // los hombros y el pecho, más hondos (más oscuros)
  ellipse(r, cx, cy + 58 * k, 82 * k, 30 * k, (x, y, d) => piel(x, y, 0.12 * (1 - d)));
  // el pelo abierto alrededor de la cabeza, flotando
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * (0.9 + i / 10 * 1.2) + (hash(i, 1, seed) - 0.5) * 0.2, L = 0.8 + hash(i, 2, seed) * 0.5, tw = (hash(i, 3, seed) - 0.5) * 0.8;
    curva(r, [[cx + Math.cos(a) * 24 * k, cy + Math.sin(a) * 30 * k], [cx + Math.cos(a + tw * 0.5) * 40 * k * L, cy + Math.sin(a + tw * 0.5) * 44 * k * L], [cx + Math.cos(a + tw) * 54 * k * L, cy + Math.sin(a + tw) * 56 * k * L]], (t) => 5 * k * (1 - t) + 0.8, (t) => mixc(hex('#0e2034'), hex('#1e3a58'), (1 - t) * 0.5));
  }
  // la cabeza: luz de arriba (la que pasa por el hielo), más clara en la frente, la nariz y los pómulos
  ellipse(r, cx, cy, 30 * k, 38 * k, (x, y, d) => {
    const u = (x - cx) / (30 * k), v = (y - cy) / (38 * k);
    let l = 0.42 * (1 - d * d) + 0.08;
    if (v > -0.55 && v < -0.3) l += 0.12 * (1 - Math.abs(u)); // la frente
    if (Math.abs(u) < 0.14 && v > -0.2 && v < 0.25) l += 0.18; // la nariz
    if (Math.abs(Math.abs(u) - 0.45) < 0.15 && v > 0.0 && v < 0.2) l += 0.1; // pómulos
    if (v > 0.32) l -= 0.1;
    return piel(x, y, l);
  });
  // las cuencas: sombra debajo de las cejas
  for (const side of [-1, 1]) {
    ellipse(r, cx + side * 12 * k, cy - 6 * k, 9 * k, 5 * k, hex('#06101c'));
    // los ojos abiertos, mirando arriba: blanco pálido y la pupila arriba
    ellipse(r, cx + side * 12 * k, cy - 5.5 * k, 6 * k, 3 * k, hex('#b8dcf4'));
    ellipse(r, cx + side * 12 * k, cy - 7 * k, 2.2 * k, 1.8 * k, hex('#0a1626'));
    setPx(r, cx + side * 12 * k - 1, cy - 7.5 * k, hex('#ffffff'));
    // la ceja
    stroke(r, [cx + side * 4 * k, cy - 12 * k], [cx + side * 20 * k, cy - 14 * k], 1.6 * k, hex('#0e2034'));
  }
  // la boca un poco abierta (como si gritara sin voz) y la barba de escarcha
  ellipse(r, cx, cy + 17 * k, 7 * k, 3 * k, hex('#04080e'));
  for (let i = 0; i < 5; i++) { const bx = cx - 14 * k + i * 7 * k, bend = (i - 2) * 2 * k; curva(r, [[bx, cy + 21 * k], [bx + bend * 0.5, cy + 34 * k], [bx + bend, cy + 48 * k - Math.abs(i - 2) * 4 * k]], (t) => 3.2 * k * (1 - t) + 0.6, (t) => mixc(hex('#7aa8d0'), hex('#2a4a6a'), t)); }
}

/** Una mano enorme apretada contra el hielo desde abajo, con los dedos abiertos */
function manoGigante(r: Raster, cx: number, cy: number, k: number, rot: number) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const P = (x: number, y: number): [number, number] => [cx + (x * c - y * s) * k, cy + (x * s + y * c) * k];
  ellipse(r, cx, cy, 15 * k, 17 * k, (x, y, d) => mixc(hex('#0e2034'), hex('#5a8ab0'), clamp01(0.5 * (1 - d) + 0.1 + (vnoise(x, y, 4, 345) - 0.5) * 0.1)));
  for (let d = 0; d < 4; d++) curva(r, [P(-10 + d * 6.5, -12), P(-12 + d * 7.5, -26), P(-13 + d * 8, -36 + Math.abs(d - 1.5) * 3)], (t) => 3.4 * k * (1 - t * 0.3), (t) => mixc(hex('#3a6488'), hex('#7aa8d0'), 0.4 + t * 0.3));
  curva(r, [P(14, 2), P(24, -6), P(30, -14)], (t) => 3.6 * k * (1 - t * 0.3), hex('#4a7aa0'));
  // el hielo blanco donde aprieta
  for (const [x, y] of [P(-13, -36), P(-4, -37), P(5, -36), P(13, -33), P(30, -14)]) halo(r, x, y, 5 * k, 5 * k, HIELO.blanco, 0.5);
}

function lago(): CinePanel {
  const W = CW, H = CH, HZ = 100;
  // fondo: el techo de la caverna con carámbanos, acantilados de hielo y, muy lejos, la luz roja del trono
  const fondo = createRaster(W, H);
  vgrad(fondo, [[0, '#010204'], [0.32, '#04070e'], [0.37, '#0a0c16'], [1, '#04070e']]);
  glow(fondo, 360, HZ - 6, 120, 26, hex('#ff2a10'), 0.55);
  glow(fondo, 360, HZ - 4, 30, 10, hex('#ff8a3a'), 0.6);
  // acantilados de hielo todo a lo ancho, más bajos donde está el trono
  for (let x = 0; x < W; x++) {
    const alto = 44 - 30 * Math.exp(-(((x - 360) / 60) ** 2)) + (x < 200 ? 6 : 0);
    const top = HZ - alto * (0.45 + fbm(x * 2, 0, 331) * 0.8);
    for (let y = Math.floor(top); y < HZ; y++) setPx(fondo, x, y, mixc(hex('#060c16'), hex('#1a3048'), clamp01((HZ - y) / alto) * 0.6));
  }
  fillPoly(fondo, [[350, HZ], [352, HZ - 22], [356, HZ - 30], [360, HZ - 24], [364, HZ - 30], [368, HZ - 22], [370, HZ]], hex('#05030a'));
  setPx(fondo, 359, HZ - 14, hex('#ff3a14')); setPx(fondo, 361, HZ - 14, hex('#ff3a14'));
  for (let k = 0; k < 30; k++) { const x0 = hash(k, 1, 334) * W, len = 6 + hash(k, 2, 334) * 28; fillPoly(fondo, [[x0 - 3, 0], [x0 + 3, 0], [x0, len]], hex('#0e1a2a')); }
  // medio: el hielo negro hasta el horizonte, con los gigantes adentro, el reflejo del trono y las grietas
  const medio = createRaster(W, H);
  for (let y = HZ; y < H; y++) for (let x = 0; x < W; x++) {
    const t = (y - HZ) / (H - HZ);
    // reflejos horizontales largos (el hielo pulido)
    const brillo = vnoise(x * 0.08, y * 1.2, 3, 335);
    setPx(medio, x, y, mixc(hex('#03070d'), hex('#0e1c2e'), clamp01(t * 0.6 + (brillo - 0.5) * 0.3)));
  }
  const bajo = createRaster(W, H);
  gigante(bajo, 150, 196, 1.45, 336);
  gigante(bajo, 384, 150, 0.62, 337);
  gigante(bajo, 262, 122, 0.32, 338);
  manoGigante(bajo, 330, 232, 1.2, -0.3);
  // lo de abajo del hielo se ve azul y apagado, con la escarcha de la superficie encima
  pegar(medio, bajo, 0, 0, 0.8);
  for (let y = HZ; y < H; y++) { const t = (y - HZ) / (H - HZ); for (let x = 340 - t * 30; x < 380 + t * 30; x++) if (hash(Math.round(x), y, 340) > 0.62 + t * 0.33) addLight(medio, x, y, hex('#ff2a10'), 0.2 * (1 - t)); }
  // grietas: pocas, finas, que se abren desde un punto cerca de la cámara, con ramitas
  const grieta = (pts: [number, number][]) => { curva(medio, pts, () => 0.5, HIELO.luz); for (const [x, y] of pts) setPx(medio, x, y - 1, HIELO.blanco); };
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k / 4 - 0.5) * 2.4;
    const pts: [number, number][] = [[250, 266]];
    let x = 250, y = 266, ang = a;
    for (let s2 = 0; s2 < 5; s2++) { ang += (hash(k, s2, 342) - 0.5) * 0.5; const step = 26 - s2 * 2.5; x += Math.cos(ang) * step * 1.8; y += Math.sin(ang) * step * 0.6; pts.push([x, y]); if (y < HZ + 6) break; }
    grieta(pts);
    // una ramita
    const m = pts[Math.min(3, pts.length - 1)];
    grieta([m, [m[0] + 20 * Math.sign(Math.cos(a) || 1), m[1] - 6], [m[0] + 34 * Math.sign(Math.cos(a) || 1), m[1] - 14]]);
  }
  for (let y = HZ; y < H; y++) for (let x = 0; x < W; x++) if (hash(x, y, 343) > 0.995) setPx(medio, x, y, HIELO.luz, 160);
  // frente: la nieve negra (copos oscuros con un canto de luz) que cae en diagonal
  const frente: Raster[] = [];
  for (let f = 0; f < 6; f++) {
    const r = createRaster(W, H);
    for (let i = 0; i < 120; i++) {
      const fase = (hash(i, 1, 344) + f / 6) % 1;
      const big = hash(i, 3, 344) > 0.8;
      const xx = (hash(i, 2, 344) * W + fase * 60) % W, yy = fase * H;
      const sz = big ? 2 : 1;
      for (let dy = 0; dy < sz; dy++) for (let dx = 0; dx < sz; dx++) setPx(r, xx + dx, yy + dy, hex('#05050a'), 230);
      setPx(r, xx - 1, yy - 1, hex('#5a6a80'), big ? 160 : 90);
    }
    frente.push(r);
  }
  return { id: 'bajada_lago', w: W, h: H, notas: 'El lago congelado, enorme, de hielo negro pulido. Adentro hay gigantes atrapados mirando hacia arriba, con los ojos abiertos (uno de cerca, dos lejos, y una mano apretada contra el hielo). Lejos, la luz roja del trono. Delante cae nieve negra.', capas: [
    { nombre: 'fondo', frames: [fondo], fps: 1, paralaje: 0.3 },
    { nombre: 'medio', frames: [medio], fps: 1, paralaje: 0.7 },
    { nombre: 'frente', frames: frente, fps: 8, paralaje: 1 },
  ] };
}

// ---------------------------------------------------------------- 4. la Ladrona con la última llama

/** La Ladrona caminando (de costado, hacia la derecha): capucha, ojos rojos, capa con el borde roto, la llama en las manos */
function ladrona(f: number, k: number): { r: Raster; llama: [number, number] } {
  const W = Math.round(64 * k), H = Math.round(90 * k);
  const r = createRaster(W, H);
  const DARK = hex('#0e0b16'), RIM = hex('#2a2240');
  const paso = Math.sin((f / 8) * Math.PI * 2);
  const cx = W * 0.45, base = H - 4 * k;
  // la capa: un triángulo largo con el borde de abajo en jirones que se mueven
  const pts: [number, number][] = [[cx - 4 * k, 16 * k], [cx + 8 * k, 18 * k], [cx + 16 * k + paso * 2 * k, base - 8 * k], [cx - 22 * k - paso * 3 * k, base - 6 * k]];
  fillPoly(r, pts, (x) => (x < cx - 14 * k ? RIM : DARK));
  for (let j = 0; j < 7; j++) {
    const jx = cx - 20 * k + j * 5.5 * k - paso * 2 * k, len = (4 + hash(j, f, 350) * 8) * k;
    stroke(r, [jx, base - 8 * k], [jx - 3 * k + Math.sin(f + j) * 2 * k, base - 8 * k + len], 1.6 * k, DARK, 0.5 * k);
  }
  // los pies apenas asoman
  ellipse(r, cx - 4 * k + paso * 4 * k, base, 3 * k, 1.5 * k, hex('#05040a'));
  ellipse(r, cx + 6 * k - paso * 4 * k, base, 3 * k, 1.5 * k, hex('#05040a'));
  // la capucha
  ellipse(r, cx + 2 * k, 14 * k, 10 * k, 12 * k, DARK);
  fillPoly(r, [[cx - 6 * k, 6 * k], [cx - 12 * k, 0], [cx - 2 * k, 4 * k]], DARK);
  ellipse(r, cx + 6 * k, 15 * k, 5 * k, 6 * k, hex('#040308'));
  // los ojos rojos, de costado (uno)
  setPx(r, cx + 8 * k, 14 * k, hex('#ff4a32')); setPx(r, cx + 8 * k + 1, 14 * k, hex('#ffd0b0'));
  // los brazos hacia adelante, con la llama entre las manos
  const lx = cx + 20 * k, ly = 40 * k + paso * 0.8 * k;
  stroke(r, [cx + 4 * k, 28 * k], [lx - 2 * k, ly + 2 * k], 2.4 * k, DARK);
  contorno(r, hex('#05040a'));
  // canto frío en la espalda (la luz del hielo) para que se recorte contra lo oscuro
  canto(r, [-1, 0], HIELO.medio, 0.6);
  canto(r, [0, -1], HIELO.azul, 0.5);
  // la llama: dorada y blanca, viva
  const fl = 0.9 + 0.1 * Math.sin(f * 1.7);
  for (let y = 0; y < 12 * k * fl; y++) {
    const w = 4 * k * (1 - y / (12 * k * fl)) + 0.5;
    for (let x = -w; x <= w; x++) { const t = y / (12 * k) + Math.abs(x) / (6 * k) + (vnoise(lx + x, y - f * 5, 2 * k, 351) - 0.5) * 0.3; setPx(r, lx + x, ly - y, t < 0.35 ? hex('#ffffff') : t < 0.6 ? hex('#fff0a0') : hex('#ffb83a')); }
  }
  // la luz de la llama en la capa
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x - lx, y - ly) / (26 * k); if (d < 1) addLight(r, x, y, hex('#ffb040'), (1 - d) ** 2 * 0.6); }
  return { r, llama: [lx, ly] };
}

function ladronaPanel(): CinePanel {
  const W = CW, H = CH, HZ = 150;
  const fondo = createRaster(W, H);
  vgrad(fondo, [[0, '#010103'], [0.5, '#05070e'], [0.56, '#0c0a14'], [1, '#03050a']]);
  // el trono lejos, con su brasa, a la derecha
  glow(fondo, 400, HZ - 20, 120, 50, hex('#ff2a10'), 0.6);
  fillPoly(fondo, [[370, HZ], [374, HZ - 40], [382, HZ - 58], [392, HZ - 44], [400, HZ - 70], [408, HZ - 44], [418, HZ - 58], [426, HZ - 40], [430, HZ]], hex('#040208'));
  // en el trono, una figura enorme sentada (solo la silueta y dos brasas: los ojos todavía cerrados)
  fillPoly(fondo, [[388, HZ - 6], [390, HZ - 32], [395, HZ - 40], [405, HZ - 40], [410, HZ - 32], [412, HZ - 6]], hex('#0a0306'));
  for (const s of [-1, 1]) curva(fondo, [[400 + s * 4, HZ - 40], [400 + s * 10, HZ - 48], [400 + s * 14, HZ - 58]], (t) => 1.6 * (1 - t) + 0.5, hex('#0a0306'));
  setPx(fondo, 398, HZ - 34, hex('#5a1408')); setPx(fondo, 402, HZ - 34, hex('#5a1408'));
  // el hielo hasta el horizonte, con columnas de hielo a los costados
  for (let y = HZ; y < H; y++) for (let x = 0; x < W; x++) setPx(fondo, x, y, mixc(hex('#06101c'), hex('#101e30'), clamp01((y - HZ) / 120 + vnoise(x / 3, y, 8, 352) * 0.2)));
  for (const [x, w, h] of [[30, 16, 120], [120, 8, 70], [250, 6, 40], [460, 18, 140]] as [number, number, number][]) fillPoly(fondo, [[x - w, HZ + h * 0.2], [x - w * 0.6, HZ - h], [x + w * 0.4, HZ - h * 0.9], [x + w, HZ + h * 0.2]], (xx) => (xx < x ? hex('#2a4a6a') : hex('#0e1c2e')));
  // medio: el camino de luz que deja la llama en el hielo hacia el trono, y el reflejo rojo
  const medio = createRaster(W, H);
  for (let y = HZ; y < H; y++) {
    const t = (y - HZ) / (H - HZ);
    const x0 = 400 - (400 - 150) * t, w = 4 + t * 40;
    for (let x = x0 - w; x <= x0 + w; x++) if (hash(Math.round(x), y, 353) > 0.55) setPx(medio, x, y, hex('#ff6a2a'), Math.round(60 * (1 - t) * (1 - Math.abs(x - x0) / w)));
  }
  // frente: la Ladrona caminando hacia el trono (8 cuadros), su luz en el hielo y su sombra larga hacia atrás
  const frente: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const r = createRaster(W, H);
    const { r: fig, llama } = ladrona(f, 1.7);
    const ox = 96, oy = 250 - fig.h;
    // reflejo cálido de la llama en el hielo y la sombra larga hacia la izquierda
    halo(r, ox + llama[0], 252, 90, 18, hex('#ffb040'), 0.35);
    fillPoly(r, [[ox + 24, 250], [ox + 64, 250], [ox - 90, 266], [ox - 140, 266]], hex('#020306'), 160);
    pegar(r, fig, ox, oy);
    halo(r, ox + llama[0], oy + llama[1] - 6, 70, 60, hex('#ffc860'), 0.25);
    // fragmentos de hielo delante, abajo
    for (let k = 0; k < 8; k++) { const x = hash(k, 1, 354) * W, y = 258 + hash(k, 2, 354) * 12; fillPoly(r, [[x - 10, H], [x - 3, y], [x + 6, y + 3], [x + 12, H]], hex('#0a1626')); stroke(r, [x - 3, y], [x + 6, y + 3], 0.5, HIELO.claro); }
    frente.push(r);
  }
  return { id: 'bajada_ladrona', w: W, h: H, notas: 'La Ladrona camina por el hielo con la última llama en las manos (8 cuadros de paso a 8 fps, camina en el lugar: el juego desliza la capa un poco hacia la derecha si quiere). Lejos, el trono con el Diablo sentado, todavía dormido. La llama deja un camino tibio en el hielo.', capas: [
    { nombre: 'fondo', frames: [fondo], fps: 1, paralaje: 0.4 },
    { nombre: 'medio', frames: [medio], fps: 1, paralaje: 0.7 },
    { nombre: 'frente', frames: frente, fps: 8, paralaje: 1 },
  ] };
}

// ---------------------------------------------------------------- 5. el Diablo despierta

export const DIABLO_OJOS = [0, 0, 0.08, 0.25, 0.5, 0.75, 1, 1];
export const DIABLO_ESCARCHA = [1, 1, 1, 0.85, 0.62, 0.42, 0.3, 0.3];

function diabloPanel(): CinePanel {
  const W = CW, H = CH;
  // fondo: el respaldo del trono, mitad hielo y mitad brasa, con cadenas
  const fondo = createRaster(W, H);
  vgrad(fondo, [[0, '#03050a'], [0.5, '#070a12'], [1, '#160604']]);
  for (let k = 0; k < 13; k++) {
    const x = 20 + k * 36, alto = 120 + Math.sin(k * 1.3) * 60 + (Math.abs(k - 6) < 2 ? 60 : 0);
    fillPoly(fondo, [[x - 16, H], [x - 10, H - alto], [x, H - alto - 30], [x + 10, H - alto], [x + 16, H]], (xx, yy) => (k % 3 === 1 ? mixc(hex('#0e1c2e'), hex('#3a6488'), clamp01((xx - x + 16) / 32) * 0.5 * (1 - (yy - (H - alto)) / alto)) : mixc(hex('#120806'), hex('#3a1208'), clamp01((yy - (H - alto)) / alto) * 0.7)));
  }
  for (const [x0, y0, x1, y1] of [[0, 40, 140, 120], [480, 30, 340, 110]] as [number, number, number, number][]) {
    const n = 18;
    for (let i = 0; i < n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 18; ellipse(fondo, x, y, 3.5, 2.5, null as never); stroke(fondo, [x - 3, y], [x + 3, y], 1.2, i % 2 ? hex('#1a1c24') : hex('#2c303c')); setPx(fondo, x, y - 1, HIELO.claro); }
  }
  glow(fondo, 240, H, 300, 120, hex('#ff3a10'), 0.35);
  // medio: el Diablo, de cerca (8 cuadros a 5 fps, sin bucle): se le abren los ojos y la escarcha se le rompe de los cuernos
  const medio: Raster[] = [];
  const caras = DIABLO_OJOS.map((o, f) => caraDiablo(W, H, o, DIABLO_ESCARCHA[f], 1));
  for (let f = 0; f < 8; f++) {
    const r = createRaster(W, H);
    pegar(r, caras[f].cara, 0, 0);
    garra(r, 66, 238, -1, 1, DIABLO_ESCARCHA[f]);
    garra(r, 414, 238, 1, 1, DIABLO_ESCARCHA[f]);
    // las grietas del brazo del trono brillan más cuando despierta
    if (DIABLO_OJOS[f] > 0.4) for (const gx of [66, 414]) halo(r, gx, 236, 50, 18, hex('#ff5a1a'), 0.2 * DIABLO_OJOS[f]);
    medio.push(r);
  }
  // frente: humo de la nariz (sale al exhalar), pedazos de escarcha que caen de los cuernos, ceniza
  const frente: Raster[] = [];
  const narices = caras[0].narices;
  for (let f = 0; f < 8; f++) {
    const r = createRaster(W, H);
    // humo: dos chorros que bajan y se abren (exhala en los cuadros 3 a 7)
    const exh = f >= 3 ? (f - 3) / 4 : 0;
    if (exh > 0) for (const [nx, ny] of narices) for (let i = 0; i < 14; i++) {
      const t = i / 14, side = nx < W / 2 ? -1 : 1;
      const x = nx + side * t * 40 * exh + Math.sin(i + f) * 3, y = ny + 4 + t * 34 * exh;
      ellipse(r, x, y, 2 + t * 9 * exh, 1.6 + t * 6 * exh, (xx, yy, d) => (d < 1 ? mixc(hex('#3a3036'), hex('#6a5a5a'), vnoise(xx, yy, 4, 355 + f)) : null), Math.round(170 * (1 - t) * Math.min(1, exh * 2)));
    }
    // escarcha que cae de los cuernos (después de que se rompe)
    for (let i = 0; i < 26; i++) {
      const roto = 1 - DIABLO_ESCARCHA[f];
      if (hash(i, 7, 356) > roto * 1.6) continue;
      const side = i % 2 ? 1 : -1;
      const x0 = 240 + side * (60 + hash(i, 1, 356) * 150), y0 = 20 + hash(i, 2, 356) * 80;
      const caida = ((f - 3 + hash(i, 3, 356) * 3) / 5) * 140;
      if (caida < 0) continue;
      const x = x0 + side * caida * 0.15, y = y0 + caida;
      const s = 1 + hash(i, 4, 356) * 2.5;
      fillPoly(r, [[x - s, y], [x, y - s * 1.3], [x + s, y + 0.4], [x + 0.2, y + s]], hash(i, 5, 356) > 0.5 ? HIELO.blanco : HIELO.luz);
    }
    // ceniza que sube con la luz de abajo
    for (let i = 0; i < 40; i++) { const fase = (hash(i, 1, 357) + f / 8) % 1; setPx(r, hash(i, 2, 357) * W + Math.sin(fase * 6 + i) * 6, H - fase * H, hex('#ff8a4a'), Math.round(200 * Math.sin(fase * Math.PI))); }
    frente.push(r);
  }
  return { id: 'bajada_diablo', w: W, h: H, notas: 'El Diablo en su trono, de cerca: el primer plano más terrorífico del juego. 8 cuadros a 5 fps sin bucle (quedarse en el último): los ojos se abren de a poco (cuadro 2 a 6), la escarcha se le rompe de los cuernos y cae (capa frente), y exhala humo por la nariz. Las garras agarran los brazos del trono. Con `cine_rugido` en el cuadro 6.', capas: [
    { nombre: 'fondo', frames: [fondo], fps: 1, paralaje: 0.5 },
    { nombre: 'medio', frames: medio, fps: 5, paralaje: 0.85, bucle: false },
    { nombre: 'frente', frames: frente, fps: 5, paralaje: 1, bucle: false },
  ] };
}

// ---------------------------------------------------------------- 6. el título

function tituloPanel(): CinePanel {
  const W = CW, H = CH;
  // fondo: negro, con escarcha que crece desde los bordes (helechos) y un velo azul que no tapa el logo
  const fondo = createRaster(W, H);
  vgrad(fondo, [[0, '#010103'], [1, '#03040a']]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.min(x, y, W - 1 - x, H - 1 - y);
    if (d < 40) addLight(fondo, x, y, HIELO.azul, (1 - d / 40) ** 2 * 0.5);
  }
  for (let k = 0; k < 40; k++) {
    const lado = k % 4, t = hash(k, 1, 360);
    const [x, y, a] = lado === 0 ? [t * W, 0, Math.PI / 2] : lado === 1 ? [t * W, H - 1, -Math.PI / 2] : lado === 2 ? [0, t * H, 0] : [W - 1, t * H, Math.PI];
    helecho(fondo, x, y, a + (hash(k, 2, 360) - 0.5) * 0.9, 18 + hash(k, 3, 360) * 34, k + 50, 1, 150);
  }
  glow(fondo, W / 2, H / 2, 200, 70, hex('#ff2a10'), 0.12);
  const frente: Raster[] = [];
  for (let f = 0; f < 6; f++) {
    const r = createRaster(W, H);
    for (let i = 0; i < 60; i++) { const fase = (hash(i, 1, 362) + f / 6) % 1; const big = hash(i, 3, 362) > 0.85; setPx(r, (hash(i, 2, 362) * W + fase * 20) % W, fase * H, HIELO.blanco, big ? 220 : 120); }
    frente.push(r);
  }
  return { id: 'bajada_titulo', w: W, h: H, notas: 'El título sobre negro con un marco de escarcha. El logo va aparte (`logo_hielo`, centrado) y cae con el rugido.', capas: [
    { nombre: 'fondo', frames: [fondo], fps: 1, paralaje: 0.6 },
    { nombre: 'frente', frames: frente, fps: 8, paralaje: 1 },
  ] };
}

export function bajadaPanels(): CinePanel[] {
  return [puerta(), escalera(), lago(), ladronaPanel(), diabloPanel(), tituloPanel()];
}

// ---------------------------------------------------------------- la nieve de adelante y el logo de hielo

/** `nieve_frente` (128 x 128, 8 cuadros en bucle): copos que caen en diagonal; pega por los cuatro lados */
export function nieveFrente(): Raster[] {
  const S = 128, out: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const r = createRaster(S, S);
    for (let i = 0; i < 34; i++) {
      const big = hash(i, 3, 370) > 0.75;
      // cada copo baja 128 px y se corre 64 en los 8 cuadros (vuelve igual): pega arriba con abajo y de lado a lado
      const x = (hash(i, 1, 370) * S + (f / 8) * 64) % S, y = (hash(i, 2, 370) * S + (f / 8) * S) % S;
      const c = big ? HIELO.blanco : HIELO.luz;
      const put = (dx: number, dy: number, a: number) => setPx(r, (x + dx + S) % S, (y + dy + S) % S, c, a);
      if (big) { put(0, 0, 240); put(1, 0, 200); put(0, 1, 200); put(1, 1, 160); put(-1, 0, 90); put(0, -1, 90); put(2, 1, 70); put(1, 2, 70); }
      else put(0, 0, 200);
    }
    out.push(r);
  }
  return out;
}

/**
 * `logo_hielo` (16 cuadros, grilla de 4 x 4): "EL CORAZÓN HELADO" en letras de hielo. Se arma cuadro por cuadro: el
 * hielo sube por las letras (0 a 7), se rajan con grietas rojas de brasa (8 a 11) y después late (12 a 15, en bucle).
 */
export function logoHielo(lineas: { w: number; h: number; mask: Uint8Array }[]): Raster[] {
  const gap = 10, pad = 20;
  const W = Math.max(...lineas.map((l) => l.w)) + pad * 2, H = lineas.reduce((a, l) => a + l.h, 0) + gap * (lineas.length - 1) + pad * 2;
  const M = new Uint8Array(W * H), Yrel = new Float32Array(W * H);
  let yy = pad;
  for (const l of lineas) {
    const ox = Math.round((W - l.w) / 2);
    for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) if (l.mask[y * l.w + x]) { M[(yy + y) * W + ox + x] = 1; Yrel[(yy + y) * W + ox + x] = y / l.h; }
    yy += l.h + gap;
  }
  const isM = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && M[y * W + x] === 1;
  // las grietas: rajaduras en zigzag que bajan por las letras; cada pixel guarda en qué punto de su raja está (0 a 1)
  const raja = new Float32Array(W * H).fill(-1);
  for (let k = 0; k < 16; k++) {
    let x = pad + hash(k, 1, 380) * (W - pad * 2), y = pad - 4;
    const largo = H - pad * 2 + 8;
    for (let s2 = 0; s2 < largo; s2++) {
      x += (hash(k, Math.floor(s2 / 3), 381) - 0.5) * 2.2;
      y += 1;
      const u = s2 / largo;
      for (const dx of [0, hash(k, s2, 382) > 0.7 ? 1 : 0]) { const X = Math.round(x + dx), Y = Math.round(y); if (X >= 0 && Y >= 0 && X < W && Y < H && (raja[Y * W + X] < 0 || u < raja[Y * W + X])) raja[Y * W + X] = u; }
    }
  }
  const grieta = (x: number, y: number) => raja[y * W + x];
  const out: Raster[] = [];
  for (let f = 0; f < 16; f++) {
    const r = createRaster(W, H);
    const sube = clamp01((f + 1) / 8); // el hielo llena las letras de abajo para arriba
    const rajado = clamp01((f - 7) / 4);
    const late = f >= 12 ? 0.75 + 0.25 * Math.sin(((f - 12) / 4) * Math.PI * 2) : rajado;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!isM(x, y)) {
        // contorno oscuro y una sombra abajo a la derecha
        if (isM(x - 1, y) || isM(x + 1, y) || isM(x, y - 1) || isM(x, y + 1) || isM(x - 1, y - 1)) setPx(r, x, y, hex('#02040a'));
        else if (isM(x - 2, y - 2)) setPx(r, x, y, hex('#000000'), 180);
        continue;
      }
      const lleno = 1 - Yrel[y * W + x] <= sube + (vnoise(x, y, 5, 382) - 0.5) * 0.2;
      if (!lleno) { setPx(r, x, y, hex('#0c1626')); continue; }
      // hielo: facetas (ruido grande), claro arriba, borde de luz arriba a la izquierda
      const fac = vnoise(x, y, 6, 383);
      let c = mixc(HIELO.medio, HIELO.luz, clamp01(1 - Yrel[y * W + x] * 0.8 + (fac - 0.5) * 0.6));
      if (!isM(x - 1, y) || !isM(x, y - 1)) c = HIELO.blanco;
      if (!isM(x + 1, y) || !isM(x, y + 1)) c = HIELO.azul;
      if (fac > 0.72 && bayer(x & 3, y & 3) > 0.5) c = mixc(c, HIELO.blanco, 0.5);
      const g = grieta(x, y);
      // la raja avanza de arriba a abajo; el centro (donde está la brasa más viva) en amarillo
      if (rajado > 0 && g >= 0 && g <= rajado) c = mixc(c, (x + y) % 3 === 0 ? hex('#ffd06a') : hex('#ff3a14'), clamp01(late * 1.4));
      setPx(r, x, y, c);
    }
    // la brasa de las grietas se ve también afuera, un poco
    if (rajado > 0) for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const g = grieta(x, y); if (isM(x, y) && g >= 0 && g <= rajado) halo(r, x, y, 6, 6, hex('#ff3a14'), 0.22 * late); }
    // destellos de escarcha
    for (let i = 0; i < 6; i++) if (hash(i, f, 384) > 0.5) { const x = hash(i, 1, 385) * W, y = hash(i, 2, 385) * H; if (isM(Math.round(x), Math.round(y))) { setPx(r, x, y, hex('#ffffff')); setPx(r, x + 1, y, HIELO.luz); setPx(r, x - 1, y, HIELO.luz); setPx(r, x, y + 1, HIELO.luz); setPx(r, x, y - 1, HIELO.luz); } }
    out.push(r);
  }
  return out;
}

export { cuerno, DIABLO, fbm };
