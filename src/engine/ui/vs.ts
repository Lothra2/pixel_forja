import { createRaster, type Raster } from '../core/raster';
import { Pix, bayer } from '../fx/pix';
import { GLIFOS, anchoTexto, estallido } from '../fx/pelea';

/**
 * La pantalla del VS antes de pelear (lote P1): los colores de los dos equipos partidos en diagonal, rayos que salen
 * del centro, una costura de rayo entre los dos lados y franjas negras arriba y abajo. Las letras VS van aparte
 * (`vsLetras`), así el juego las estrella con su propio rebote encima de los retratos.
 */

type RGB = [number, number, number];
const rgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hex = ([r, g, b]: RGB) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const mezcla = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function hsv([r, g, b]: RGB) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const h = d === 0 ? 0 : mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: mx ? d / mx : 0, v: mx / 255 };
}
const distTono = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

/** Los colores neutros: azul contra rojo. */
export const VS_NEUTRO: [string, string] = ['#3d6fd6', '#d23c3c'];

/**
 * El color de cada lado: el primero del equipo, salvo que sea muy oscuro o gris (entonces el más vivo). Si los dos
 * quedan del mismo tono, el de la derecha usa otro color suyo. Así la Familia GG sale azul y el Instituto (azul marino
 * y rojo) sale rojo.
 */
export function coloresVs(a: readonly string[], b: readonly string[]): [string, string] {
  const viveza = (c: string) => hsv(rgb(c)).s * hsv(rgb(c)).v;
  const vivo = (l: readonly string[]) => [...l.filter((c) => viveza(c) >= 0.35), ...[...l].filter((c) => viveza(c) < 0.35).sort((x, y) => viveza(y) - viveza(x))];
  const ca = vivo(a)[0] ?? VS_NEUTRO[0];
  const hA = hsv(rgb(ca)).h;
  const cb = vivo(b).find((c) => distTono(hsv(rgb(c)).h, hA) > 40) ?? vivo(b)[0] ?? VS_NEUTRO[1];
  return [ca, cb];
}

/**
 * El fondo del VS de `w` x `h`. Izquierda el color `a`, derecha el `b`, partidos por una diagonal que baja hacia la
 * izquierda. Los rayos salen de (w / 2, h * 0.42), donde el juego pone la palabra VS.
 */
export function vsFondo(a: string, b: string, w = 640, h = 360): Raster {
  const p = new Pix(w, h);
  const A = rgb(a), B = rgb(b), negro: RGB = [16, 12, 22], blanco: RGB = [255, 255, 255];
  const cx = w / 2, cy = Math.round(h * 0.42), barra = Math.round(h * 0.07);
  // la diagonal: arriba en cx + 0.17 w y abajo en cx - 0.17 w
  const corte = (y: number) => cx + w * 0.17 * (1 - (2 * y) / h);
  const rayos = 28;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (y < barra || y >= h - barra) { p.px(x, y, hex(negro)); continue; }
    const lado = x < corte(y) ? A : B;
    // degradé hacia lo oscuro lejos del centro (en 4 tonos con tramado, sin mezcla suave)
    const d = Math.hypot((x - cx) / w, (y - cy) / h) * 2;
    const ang = Math.atan2(y - cy, x - cx), sector = Math.floor(((ang / (2 * Math.PI)) * rayos + rayos) % rayos);
    const claro = sector % 2 === 0;
    const tono = Math.min(3, Math.floor(d * 3 + bayer(x, y) * 0.9));
    let c = mezcla(lado, negro, [0.05, 0.25, 0.42, 0.58][tono]);
    if (claro) c = mezcla(c, blanco, 0.16 * (1 - Math.min(1, d)) + 0.06);
    // puntos de trama de cómic en las esquinas
    if (d > 0.95 && (x % 6 === 0 && y % 6 === 0 || x % 6 === 3 && y % 6 === 3)) c = mezcla(c, negro, 0.45);
    p.px(x, y, hex(c));
  }
  // la costura: un rayo blanco y amarillo en zigzag sobre la diagonal, con borde de tinta
  for (let y = barra; y < h - barra; y++) {
    const zig = ((Math.floor(y / 14) % 2 === 0 ? y % 14 : 14 - (y % 14)) - 7) * 0.9;
    const x0 = Math.round(corte(y) + zig);
    for (let dx = -5; dx <= 5; dx++) p.px(x0 + dx, y, Math.abs(dx) >= 4 ? '#1a1020' : Math.abs(dx) >= 2 ? '#f2c230' : '#ffffff');
  }
  // filo de las franjas negras
  for (let x = 0; x < w; x++) { p.px(x, barra, '#f2c230'); p.px(x, h - barra - 1, '#f2c230'); }
  return p.r;
}

/**
 * Las letras VS de cómic, para estrellarlas encima del fondo: estallido amarillo atrás y letras de bloques de `b` px
 * con contorno de tinta parejo de 3 px, sombra roja corrida y relleno en franjas de blanco a amarillo.
 */
export function vsLetras(b = 8): Raster {
  const t = 'VS', aw = anchoTexto(t) * b, borde = 3;
  const w = aw + 6 * b, h = 7 * b + 6 * b;
  const p = new Pix(w, h);
  estallido(p, w / 2, h / 2, h * 0.36, h * 0.5, 12, '#f2c230', '#ff8a2a');
  const ox = Math.round((w - aw) / 2) - 2, oy = Math.round((h - 7 * b) / 2) - 2;
  const lleno = new Uint8Array(w * h);
  let cx = 0;
  for (const ch of t) {
    const g = GLIFOS[ch];
    g.forEach((row, j) => [...row].forEach((v, i) => {
      if (v !== '#') return;
      for (let yy = 0; yy < b; yy++) for (let xx = 0; xx < b; xx++) lleno[(oy + j * b + yy) * w + ox + (cx + i) * b + xx] = 1;
    }));
    cx += g[0].length + 1;
  }
  const en = (x: number, y: number, dx = 0, dy = 0) => { const X = x - dx, Y = y - dy; return X >= 0 && Y >= 0 && X < w && Y < h && lleno[Y * w + X] === 1; };
  const cerca = (x: number, y: number, r: number, dx = 0, dy = 0) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + 1 && en(x + i, y + j, dx, dy)) return true; return false; };
  const sx = Math.round(b / 2), sy = Math.round(b / 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (en(x, y)) {
      const fila = Math.floor((y - oy) / b);
      p.px(x, y, !en(x, y - 1) || !en(x, y - 2) ? '#ffffff' : fila < 3 ? '#fff6c8' : fila < 5 ? '#ffd23a' : '#ff9a2a');
    } else if (cerca(x, y, borde)) p.px(x, y, '#1a1020');
    else if (en(x, y, sx, sy) || cerca(x, y, borde, sx, sy)) p.px(x, y, en(x, y, sx, sy) ? '#c8401c' : '#1a1020');
  }
  return p.r;
}

/** Recorta lo transparente alrededor (para entregar la hoja justa). */
export function recortar(r: Raster): Raster {
  let x0 = r.w, y0 = r.h, x1 = -1, y1 = -1;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.data[(y * r.w + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) return r;
  const out = createRaster(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    const s = ((y + y0) * r.w + x + x0) * 4, d = (y * out.w + x) * 4;
    for (let k = 0; k < 4; k++) out.data[d + k] = r.data[s + k];
  }
  return out;
}
