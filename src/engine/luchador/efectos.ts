import { createRaster, type Raster } from '../core/raster';
import { bayer } from '../fx/pix';

/**
 * Los efectos de la pelea, a pixel y sin alfa: la bola de energía, la chispa de bloqueo, el viento del remolino y el
 * polvo al caer. Todos miran a la derecha (el juego los voltea con el luchador) y en bucle o una vez, como se dice.
 */
type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function pintar(w: number, h: number, fn: (x: number, y: number) => string | null): Raster {
  const r = createRaster(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = fn(x, y);
      if (!c) continue;
      const [cr, cg, cb] = hex(c), i = (y * w + x) * 4;
      r.data[i] = cr; r.data[i + 1] = cg; r.data[i + 2] = cb; r.data[i + 3] = 255;
    }
  return r;
}

/**
 * La onda de energía: una bola de 48 x 32 con el centro blanco, el anillo celeste que gira y la cola que se deshace
 * atrás en rayas. 4 cuadros en bucle de 3 ticks. El centro de la bola va en (32, 16).
 */
export function ondaEnergia(): Raster[] {
  const W = 48, H = 32, cx = 32, cy = 16;
  return [0, 1, 2, 3].map((t) => pintar(W, H, (x, y) => {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx * 0.9, dy);
    const a = Math.atan2(dy, dx);
    const giro = Math.sin(a * 3 - t * 1.6) * 1.4;
    if (d < 4.5) return '#ffffff';
    if (d < 7 + giro * 0.4) return '#c8f4ff';
    if (d < 10 + giro) return (bayer(x, y) < 0.5 ? '#5ad0ff' : '#7adcff');
    if (d < 11.5 + giro) return '#2a70e0';
    // la cola: rayas que se abren hacia atrás y se cortan
    if (dx < 0 && Math.abs(dy) < 9 + dx * 0.15) {
      const raya = Math.abs(Math.sin(dy * 0.9 + t * 1.3)) > 0.55;
      const lejos = -dx / 32;
      if (raya && bayer(x + t, y) > lejos * 1.1) return lejos < 0.4 ? '#7adcff' : '#2a70e0';
    }
    return null;
  }));
}

/** La chispa de bloqueo: una estrella chica azul y blanca en 3 cuadros de 2 ticks. 28 x 28, centro en el medio. */
export function chispaBloqueo(): Raster[] {
  const S = 28, c = S / 2;
  return [5, 9, 11].map((r0, t) => pintar(S, S, (x, y) => {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const punta = Math.abs(Math.cos(a * 2)) ** 6 * r0 * 1.2 + r0 * 0.35;
    if (t === 2) return d > r0 - 2 && d < r0 && Math.abs(Math.cos(a * 2)) > 0.6 ? '#8ad8ff' : null;
    return d < punta * 0.45 ? '#ffffff' : d < punta ? '#8ad8ff' : null;
  }));
}

/**
 * El viento del remolino: un anillo achatado de rayas claras que gira alrededor de las piernas. 72 x 24, 4 cuadros de 2
 * ticks; el centro va en la cadera de quien gira.
 */
export function vientoRemolino(): Raster[] {
  const W = 72, H = 24, cx = W / 2, cy = H / 2;
  return [0, 1, 2, 3].map((t) => pintar(W, H, (x, y) => {
    const dx = (x + 0.5 - cx) / (W / 2), dy = (y + 0.5 - cy) / (H / 2);
    const d = Math.hypot(dx, dy);
    if (d < 0.78 || d > 1) return null;
    const a = Math.atan2(dy, dx);
    const raya = ((a / (Math.PI * 2)) * 6 + t * 0.25 + 10) % 1;
    if (raya > 0.55) return null;
    return dy < 0 ? (raya < 0.2 ? '#ffffff' : '#bff0ff') : '#7ad0f0';
  }));
}

/** El polvo al caer: dos nubecitas que salen a los lados y se deshacen. 40 x 12, 3 cuadros de 3 ticks; el centro abajo al medio. */
export function polvoCaida(): Raster[] {
  const W = 40, H = 12;
  return [0, 1, 2].map((t) => pintar(W, H, (x, y) => {
    for (const s of [-1, 1]) {
      const cx = W / 2 + s * (5 + t * 5), cy = H - 3 - t * 0.6, r = 3 + t * 1.2;
      const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.4);
      if (d < r && bayer(x, y) > t * 0.3) return d < r * 0.6 ? '#e8dccc' : '#b8a68e';
    }
    return null;
  }));
}

/**
 * La estrella mágica de Alana: una estrella dorada de cinco puntas que gira, con el centro rosado y una estela de
 * chispitas detrás. 48 x 32, 4 cuadros de 3 ticks; el centro de la estrella va en (32, 16).
 */
export function estrellaMagica(): Raster[] {
  const W = 48, H = 32, cx = 32, cy = 16;
  return [0, 1, 2, 3].map((t) => pintar(W, H, (x, y) => {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
    const a = Math.atan2(dy, dx) + t * (Math.PI / 10);
    // el borde de una estrella de cinco puntas: radio que va de 5 a 12
    const r = 6 + 6 * Math.abs(Math.cos((a * 5) / 2)) ** 3;
    if (d < 3) return '#ffffff';
    if (d < 5) return '#ff8fc8';
    if (d < r - 1.5) return d < r * 0.6 ? '#fff2a0' : '#ffd23a';
    if (d < r) return '#d9922a';
    // la estela: chispitas que quedan atrás y se apagan
    if (dx < -10 && Math.abs(dy) < 6) {
      const k = Math.floor((-dx - 10) / 4);
      if ((x + y * 3 + t * 5) % 11 === 0 && k < 5) return k < 2 ? '#fff2a0' : '#ff8fc8';
    }
    return null;
  }));
}

/**
 * La onda del ladrido de Thor: tres arcos que se abren hacia adelante, blancos y celestes. 48 x 48, 4 cuadros de 3
 * ticks; el centro de la onda va en (24, 24).
 */
export function ondaLadrido(): Raster[] {
  const S = 48, c = S / 2;
  return [0, 1, 2, 3].map((t) => pintar(S, S, (x, y) => {
    const dx = x + 0.5 - c + 10, dy = y + 0.5 - c, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    if (Math.abs(a) > 0.9 || dx < 0) return null;
    for (let k = 0; k < 3; k++) {
      const r = 8 + k * 8 + t * 2;
      if (Math.abs(d - r) < 1.6 - k * 0.3) return k === 0 ? '#ffffff' : k === 1 ? '#bff0ff' : '#6ac8ff';
    }
    return null;
  }));
}
