import type { PaintedTerrain } from '../paint';
import { hash, rgb } from '../puertoObjects';
import { suave } from './escultor';

/**
 * Pisos con vida (abyss premium): repinta la imagen del suelo horneada encima de lo que ya hay, sin cambiar su
 * tamaño, su alfa (el agua sigue transparente) ni la colisión. Cada mundo trae su receta:
 *
 * - variación grande de luz y tono (manchas de 100 a 300 px): ningún cuadro se ve igual a otro
 * - manchas de material con borde tramado: musgo, hollín, escarcha, humedad, arena
 * - desgaste de los caminos: el centro más claro y liso, las orillas pisoteadas
 * - bordes suaves entre materiales caminables (los pixeles se mezclan en 2 o 3 px)
 * - grietas con el canto claro, raíces que cruzan, charcos con brillo
 * - cosas sueltas chicas: piedritas, hojas, ramitas, huesitos, carbón, esquirlas de cristal o de hielo
 *
 * Todo con semilla: el mismo mapa da siempre los mismos pixeles.
 */

/** Tipos de piso (los de `PaintedTerrain.kind`): 0 pasto, 1 camino, 2 plaza, 3 acantilado, 4 agua, 5 escalera, 6 muro o abismo. */
export type Kind = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Mancha { color: string; kinds: Kind[]; cantidad: number; escala: number; fuerza: number }
export interface Suelto { kinds: Kind[]; densidad: number; dibujo: 'piedrita' | 'hoja' | 'ramita' | 'hueso' | 'carbon' | 'esquirla' | 'petalo' | 'clavo' | 'concha' | 'papel'; colores: string[] }

export interface RecetaPiso {
  semilla: number;
  /** variación grande: hacia `claro` en las manchas de luz y hacia `oscuro` en las de sombra */
  macro: { claro: string; oscuro: string; fuerza: number };
  manchas: Mancha[];
  grietas?: { kinds: Kind[]; densidad: number; oscuro: string; canto: string };
  raices?: { kinds: Kind[]; densidad: number; colores: [string, string, string] };
  charcos?: { kinds: Kind[]; densidad: number; fondo: string; brillo: string };
  sueltos: Suelto[];
  desgaste?: { claro: string; fuerza: number };
  /** tipos entre los que el borde se mezcla */
  bordes?: Kind[];
}

/** Cuántos de cada cosa se pusieron (para la entrega y los tests). */
export interface InformePiso { manchas: number; grietas: number; raices: number; charcos: number; sueltos: number; px: number }

export function pisoVivo(t: PaintedTerrain, rc: RecetaPiso): InformePiso {
  const img = t.img, W = img.w, H = img.h, d = img.data, K = t.kind, S = rc.semilla;
  const inf: InformePiso = { manchas: 0, grietas: 0, raices: 0, charcos: 0, sueltos: 0, px: W * H };
  const opaco = (i: number) => d[i * 4 + 3] === 255;
  const mezcla = (i: number, c: number[], a: number) => { const k = i * 4; d[k] += (c[0] - d[k]) * a; d[k + 1] += (c[1] - d[k + 1]) * a; d[k + 2] += (c[2] - d[k + 2]) * a; };
  const ok = (x: number, y: number, kinds: Kind[]) => x >= 0 && y >= 0 && x < W && y < H && opaco(y * W + x) && kinds.includes(K[y * W + x] as Kind);
  const pon = (x: number, y: number, c: string | number[], kinds: Kind[], a = 1) => { x = Math.round(x); y = Math.round(y); if (ok(x, y, kinds)) mezcla(y * W + x, typeof c === 'string' ? rgb(c) : c, a); };

  // ---------- bordes suaves: los pixeles se cruzan entre materiales caminables (sobre una copia) ----------
  if (rc.bordes?.length) {
    const src = new Uint8ClampedArray(d);
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      const i = y * W + x, k = K[i];
      if (!rc.bordes.includes(k as Kind) || !opaco(i)) continue;
      const dx = Math.round((hash(x, y, S + 1) - 0.5) * 5), dy = Math.round((hash(x, y, S + 2) - 0.5) * 5), j = (y + dy) * W + x + dx;
      if (K[j] === k || !rc.bordes.includes(K[j] as Kind) || d[j * 4 + 3] !== 255) continue;
      if (hash(x, y, S + 3) < 0.55) { d[i * 4] = src[j * 4]; d[i * 4 + 1] = src[j * 4 + 1]; d[i * 4 + 2] = src[j * 4 + 2]; }
    }
  }

  // ---------- desgaste de los caminos: distancia a la orilla (dos pasadas) ----------
  if (rc.desgaste) {
    const dist = new Uint16Array(W * H);
    for (let i = 0; i < W * H; i++) dist[i] = K[i] === 1 ? 999 : 0;
    for (let y = 1; y < H; y++) for (let x = 1; x < W; x++) { const i = y * W + x; if (dist[i]) dist[i] = Math.min(dist[i], dist[i - 1] + 1, dist[i - W] + 1); }
    for (let y = H - 2; y >= 0; y--) for (let x = W - 2; x >= 0; x--) { const i = y * W + x; if (dist[i]) dist[i] = Math.min(dist[i], dist[i + 1] + 1, dist[i + W] + 1); }
    const cl = rgb(rc.desgaste.claro);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, dd = dist[i];
      if (!dd || !opaco(i)) continue;
      // el centro gastado y liso (huellas de ruedas a los dos lados), la orilla pisoteada y oscura
      const n = suave(x / 40, y / 40, S + 9);
      if (dd > 6) mezcla(i, cl, rc.desgaste.fuerza * Math.min(1, (dd - 6) / 10) * (0.5 + n * 0.6));
      else if (dd <= 2) mezcla(i, [0, 0, 0], 0.12 * (hash(x >> 1, y >> 1, S + 4) < 0.5 ? 1 : 0.4));
      if ((dd === 9 || dd === 10) && hash(x >> 2, y >> 2, S + 5) < 0.7) mezcla(i, [0, 0, 0], 0.1);
    }
  }

  // ---------- variación grande de luz y tono ----------
  const mc = rgb(rc.macro.claro), mo = rgb(rc.macro.oscuro), mf = rc.macro.fuerza;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!opaco(i)) continue;
    const n = suave(x / 220, y / 220, S + 11) * 0.6 + suave(x / 70, y / 70, S + 12) * 0.4 - 0.5;
    // en escalones (pixel art): la mancha no es un degradado liso
    const q = Math.round(n * 8) / 8;
    if (q > 0) mezcla(i, mc, q * mf * 1.6); else if (q < 0) mezcla(i, mo, -q * mf * 1.6);
  }

  // ---------- manchas de material (musgo, hollín, escarcha...) con borde tramado ----------
  for (const [mi, m] of rc.manchas.entries()) {
    const c = rgb(m.color);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!opaco(i) || !m.kinds.includes(K[i] as Kind)) continue;
      const n = suave(x / m.escala, y / m.escala, S + 20 + mi) * 0.75 + suave(x / (m.escala / 4), y / (m.escala / 4), S + 40 + mi) * 0.25;
      const borde = 1 - m.cantidad;
      if (n < borde) continue;
      const t = Math.min(1, (n - borde) / 0.06);
      if (t < 1 && hash(x, y, S + 60 + mi) > t) continue;
      // conserva la textura de abajo: se tiñe, no se tapa
      mezcla(i, c, m.fuerza * (0.75 + hash(x >> 1, y >> 1, S + mi) * 0.25));
      inf.manchas++;
    }
  }

  // ---------- grietas ----------
  const caminar = (x0: number, y0: number, largo: number, sem: number, fn: (x: number, y: number, k: number) => void, giro = 1.1) => {
    let x = x0, y = y0, a = hash(x0, y0, sem) * Math.PI * 2;
    for (let k = 0; k < largo; k++) { fn(x, y, k); a += (hash(k, sem, 1) - 0.5) * giro; x += Math.cos(a); y += Math.sin(a); }
  };
  const cada = (densidad: number, sem: number, fn: (x: number, y: number, n: number) => void) => {
    // `densidad` = cuántos por cada 100 x 100 px; repartidos al azar pero sin amontonarse (rejilla con salto)
    const paso = Math.max(8, Math.round(100 / Math.sqrt(densidad)));
    let n = 0;
    for (let gy = 0; gy < H; gy += paso) for (let gx = 0; gx < W; gx += paso) fn(Math.floor(gx + hash(gx, gy, sem) * paso), Math.floor(gy + hash(gy, gx, sem + 1) * paso), n++);
  };
  if (rc.grietas) {
    const g = rc.grietas;
    cada(g.densidad, S + 70, (x, y, n) => {
      if (!ok(x, y, g.kinds)) return;
      inf.grietas++;
      const largo = 8 + Math.floor(hash(n, 1, S) * 26);
      caminar(x, y, largo, S + n * 7, (px, py, k) => {
        pon(px, py, g.oscuro, g.kinds, 0.75);
        pon(px + 1, py + 1, g.canto, g.kinds, 0.35);
        // ramita de la grieta
        if (k === 6 && hash(n, 2, S) < 0.5) caminar(px, py, 6, S + n * 11, (qx, qy) => pon(qx, qy, g.oscuro, g.kinds, 0.55));
      });
    });
  }

  // ---------- raíces que cruzan (cápsulas finas con luz arriba) ----------
  if (rc.raices) {
    const r = rc.raices, [os, me, cl] = r.colores;
    cada(r.densidad, S + 80, (x, y, n) => {
      if (!ok(x, y, r.kinds)) return;
      inf.raices++;
      // raíz: casi recta, gruesa al nacer y fina en la punta, luz arriba, sombra abajo; a veces una raicilla
      const largo = 22 + Math.floor(hash(n, 3, S) * 34);
      caminar(x, y, largo, S + n * 13, (px, py, k) => {
        const g = k < largo * 0.35 ? 2 : k < largo * 0.75 ? 1 : 0;
        for (let t = -g; t <= g; t++) pon(px, py + t, t < 0 ? cl : t === g && g ? os : me, r.kinds, 0.95);
        pon(px, py - g - 1, cl, r.kinds, 0.35);
        pon(px + 1, py + g + 1, [0, 0, 0], r.kinds, 0.3);
        if (k === Math.floor(largo * 0.4) && hash(n, 6, S) < 0.6) caminar(px, py, 10, S + n * 17, (qx, qy) => { pon(qx, qy, me, r.kinds, 0.9); pon(qx, qy - 1, cl, r.kinds, 0.4); pon(qx, qy + 1, os, r.kinds, 0.6); }, 0.5);
      }, 0.32);
    });
  }

  // ---------- charcos (fondo oscuro que refleja, brillo arriba a la izquierda, borde mojado) ----------
  if (rc.charcos) {
    const c = rc.charcos, fo = rgb(c.fondo), br = rgb(c.brillo);
    cada(c.densidad, S + 90, (x, y, n) => {
      if (!ok(x, y, c.kinds)) return;
      const rx = 8 + hash(n, 4, S) * 12, ry = rx * (0.4 + hash(n, 5, S) * 0.15);
      // todo el charco tiene que caer en piso válido
      for (let a = 0; a < 8; a++) if (!ok(Math.round(x + Math.cos(a * 0.785) * (rx + 2)), Math.round(y + Math.sin(a * 0.785) * (ry + 2)), c.kinds)) return;
      inf.charcos++;
      for (let yy = Math.floor(y - ry - 2); yy <= y + ry + 2; yy++) for (let xx = Math.floor(x - rx - 2); xx <= x + rx + 2; xx++) {
        const dd = ((xx - x) / rx) ** 2 + ((yy - y) / ry) ** 2 + (suave(xx / 3, yy / 3, n) - 0.5) * 0.5;
        if (dd < 0.75) pon(xx, yy, fo, c.kinds, 0.78);
        else if (dd < 1.0) pon(xx, yy, fo, c.kinds, 0.45);
        else if (dd < 1.6) pon(xx, yy, [0, 0, 0], c.kinds, 0.16);
        if (dd < 0.7 && yy < y - ry * 0.25 && xx < x && hash(xx, yy, n) < 0.35) pon(xx, yy, br, c.kinds, 0.7);
      }
      pon(x - rx * 0.4, y - ry * 0.3, br, c.kinds); pon(x - rx * 0.4 + 1, y - ry * 0.3, br, c.kinds, 0.6);
    });
  }

  // ---------- cosas sueltas ----------
  for (const [si, s] of rc.sueltos.entries()) {
    const cols = s.colores.map(rgb);
    cada(s.densidad, S + 100 + si, (x, y, n) => {
      if (!ok(x, y, s.kinds)) return;
      inf.sueltos++;
      const c = cols[n % cols.length], h = (k: number) => hash(n, k, S + si);
      const osc = [c[0] * 0.55, c[1] * 0.55, c[2] * 0.6], cl = [Math.min(255, c[0] * 1.35 + 20), Math.min(255, c[1] * 1.35 + 20), Math.min(255, c[2] * 1.35 + 20)];
      const p = (dx: number, dy: number, col: number[], a = 1) => pon(x + dx, y + dy, col, s.kinds, a);
      switch (s.dibujo) {
        case 'piedrita': {
          const r = h(1) < 0.7 ? 1 : 2;
          for (let dy = -r; dy <= r; dy++) for (let dx = -r - 1; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 1) p(dx, dy, dy < 0 || dx < 0 ? cl : c);
          for (let dx = -r; dx <= r + 1; dx++) p(dx, r + 1, [0, 0, 0], 0.4);
          break;
        }
        case 'hoja': { const f = h(2) < 0.5; p(0, 0, c); p(1, 0, c); p(f ? 1 : -1, -1, cl); p(f ? -1 : 2, 1, osc); p(2, f ? 1 : -1, c, 0.8); break; }
        case 'petalo': { p(0, 0, cl); p(1, 0, c); break; }
        case 'ramita': { const dx = h(3) < 0.5 ? 1 : -1; for (let k = 0; k < 5 + h(4) * 4; k++) { p(k * dx, Math.round(k * (h(5) - 0.5)), k % 3 ? c : osc); } p(2 * dx, -1, c); p(0, 1, [0, 0, 0], 0.3); break; }
        case 'hueso': { for (let k = -2; k <= 2; k++) p(k, 0, cl); p(-3, -1, c); p(-3, 1, c); p(3, -1, c); p(3, 1, c); for (let k = -3; k <= 3; k++) p(k, 2, [0, 0, 0], 0.3); break; }
        case 'carbon': { p(0, 0, c); p(1, 0, osc); p(0, 1, osc); p(1, 1, c); if (h(6) < 0.3) p(0, 0, [255, 120, 40], 0.7); break; }
        case 'esquirla': { p(0, 0, c); p(0, -1, cl); p(1, -2, cl); p(1, 0, osc); p(0, 1, [0, 0, 0], 0.3); break; }
        case 'clavo': { p(0, 0, cl); p(1, 1, c); p(2, 2, c); p(3, 3, osc); break; }
        case 'concha': { p(-1, 0, c); p(0, -1, cl); p(1, 0, c); p(0, 0, cl); p(-1, 1, osc); p(1, 1, osc); break; }
        case 'papel': { for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 4; xx++) p(xx, yy, yy === 0 ? cl : c, 0.9); p(1, 1, osc); p(2, 1, osc); p(0, 3, [0, 0, 0], 0.3); break; }
      }
    });
  }
  return inf;
}

/**
 * Cuánto se repite el suelo: toma `n` cuadros de 32 x 32 de los tipos caminables y devuelve la diferencia media
 * más chica entre dos de ellos (0 = hay dos cuadros idénticos). Para el test de "ninguna repetición evidente".
 */
export function repeticion(t: PaintedTerrain, n = 10, semilla = 1, kinds: Kind[] = [0, 1, 2, 5]): number {
  const img = t.img, W = img.w, H = img.h, T = 32;
  const cuadros: [number, number][] = [];
  for (let k = 0; cuadros.length < n && k < 20000; k++) {
    const x = Math.floor(hash(k, 1, semilla) * (W / T - 1)) * T, y = Math.floor(hash(k, 2, semilla) * (H / T - 1)) * T;
    let bien = true;
    for (let yy = 0; yy < T && bien; yy += 4) for (let xx = 0; xx < T; xx += 4) { const i = (y + yy) * W + x + xx; if (img.data[i * 4 + 3] !== 255 || !kinds.includes(t.kind[i] as Kind)) { bien = false; break; } }
    if (bien) cuadros.push([x, y]);
  }
  let min = Infinity;
  for (let a = 0; a < cuadros.length; a++) for (let b = a + 1; b < cuadros.length; b++) {
    let s = 0;
    for (let yy = 0; yy < T; yy++) for (let xx = 0; xx < T; xx++) {
      const i = ((cuadros[a][1] + yy) * W + cuadros[a][0] + xx) * 4, j = ((cuadros[b][1] + yy) * W + cuadros[b][0] + xx) * 4;
      s += Math.abs(img.data[i] - img.data[j]) + Math.abs(img.data[i + 1] - img.data[j + 1]) + Math.abs(img.data[i + 2] - img.data[j + 2]);
    }
    min = Math.min(min, s / (T * T * 3));
  }
  return min;
}
