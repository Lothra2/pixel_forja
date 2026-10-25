import { createRaster, type Raster } from '../core/raster';
import type { ChibiLook, Poder, Talla } from './look';
import { capa, elipse, poligono, pon, juntar, hex, sombra, luz, mezcla, rect, barra, type Capa } from './paint';

/**
 * Efectos del chibi: el poder de cada personaje (con sus colores), la chispa del golpe como la del video (estrella
 * verde agua que crece y se abre), el polvo, las estrellas del mareo, el chapuzón y los emotes de la vista de arriba.
 * Todos se dibujan mirando a la derecha y con su centro en el medio de la imagen.
 */

export interface Efecto {
  id: string;
  frames: Raster[];
  /** Ticks por cuadro (60 por segundo). */
  t: number;
  loop: boolean;
  /** Velocidad sugerida en px por tick (proyectiles). */
  vel?: number;
  /** Centro del efecto dentro de la imagen. */
  centro: [number, number];
}

const px = (r: Raster, x: number, y: number, v: number, a = 255) => {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const i = (y * r.w + x) * 4;
  r.data[i] = (v >> 16) & 255; r.data[i + 1] = (v >> 8) & 255; r.data[i + 2] = v & 255; r.data[i + 3] = a;
};
const disco = (r: Raster, cx: number, cy: number, rad: number, v: number, a = 255) => {
  for (let y = Math.floor(cy - rad - 1); y <= cy + rad + 1; y++) for (let x = Math.floor(cx - rad - 1); x <= cx + rad + 1; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    if (dx * dx + dy * dy <= rad * rad) px(r, x, y, v, a);
  }
};
const deCapa = (c: Capa, contorno = true): Raster => { c.contorno = contorno; return juntar([c], c.w, c.h, -1); };

/** El proyectil del poder: 4 cuadros en bucle. */
export function poder(look: Pick<ChibiLook, 'poder'>, talla: Talla): Efecto {
  const k = talla === 32 ? 1 : 1.45;
  const W = Math.round(26 * k), H = Math.round(16 * k);
  const c1 = hex(look.poder.color), c2 = hex(look.poder.color2);
  const est: Poder = look.poder.estilo;
  const cx = W * 0.62, cy = H / 2;
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const r = createRaster(W, H);
    switch (est) {
      case 'bola': case 'fuego': {
        const oscuro = sombra(sombra(c1)), medio = c1, claro = c2;
        // la cola se estira hacia atrás y titila
        const cola = (8 + (f % 2) * 2) * k;
        for (let i = 0; i < cola; i++) {
          const t = i / cola;
          const rad = (5.2 * k) * (1 - t * 0.85);
          const off = Math.sin((i + f * 2) * 0.9) * (est === 'fuego' ? 1.4 : 0.8) * k;
          disco(r, cx - i, cy + off, rad, t < 0.4 ? medio : oscuro, t > 0.75 ? 160 : 255);
        }
        disco(r, cx, cy, 5.6 * k, oscuro);
        disco(r, cx + 0.5, cy, 4.6 * k, medio);
        disco(r, cx + 1, cy - 0.5, 3 * k, claro);
        // remolino: dos rayitas que giran dentro de la bola (como el video)
        const ang = f * (Math.PI / 2);
        for (let j = 0; j < 2; j++) {
          const a = ang + j * Math.PI;
          for (let s = 1; s <= 3 * k; s++) px(r, cx + 1 + Math.cos(a + s * 0.5) * s, cy + Math.sin(a + s * 0.5) * s, est === 'fuego' ? hex('#c03010') : oscuro);
        }
        if (est === 'fuego') for (let i = 0; i < 4; i++) px(r, cx - 2 - i * 2 * k, cy - 4 * k + ((f + i) % 3), hex('#ffe060'));
        break;
      }
      case 'estrella': {
        const rot = f * 18 * (Math.PI / 180);
        const pts: [number, number][] = [];
        for (let i = 0; i < 10; i++) { const rr = (i % 2 ? 2.2 : 5.5) * k; const a = rot - Math.PI / 2 + (i * Math.PI) / 5; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
        const c = capa(W, H);
        poligono(c, pts, c1, 0);
        pon(c, cx, cy - 1, c2, 0); pon(c, cx - 1, cy - 1, c2, 0);
        const s = deCapa(c);
        r.data.set(s.data);
        for (let i = 0; i < 4; i++) px(r, cx - 6 * k - i * 3, cy + ((i + f) % 3) - 1, i % 2 ? c2 : c1);
        break;
      }
      case 'corazon': {
        const c = capa(W, H);
        const s = (f % 2 ? 1.1 : 1) * k;
        elipse(c, cx - 2 * s, cy - 1.5 * s, 2.6 * s, 2.4 * s, c1, 0); elipse(c, cx + 2 * s, cy - 1.5 * s, 2.6 * s, 2.4 * s, c1, 0);
        poligono(c, [[cx - 4.6 * s, cy - 1], [cx + 4.6 * s, cy - 1], [cx, cy + 5 * s]], c1, 0);
        pon(c, cx - 2 * s, cy - 2 * s, c2, 0);
        r.data.set(deCapa(c).data);
        for (let i = 0; i < 3; i++) px(r, cx - 7 * k - i * 3, cy + (i % 2 ? -2 : 2), c2);
        break;
      }
      case 'balon': {
        const c = capa(W, H);
        const rad = 4.5 * k;
        elipse(c, cx, cy, rad, rad, hex('#f4f2ee'), 0);
        // gajos negros que giran
        for (let i = 0; i < 3; i++) { const a = f * (Math.PI / 6) + (i * 2 * Math.PI) / 3; elipse(c, cx + Math.cos(a) * rad * 0.55, cy + Math.sin(a) * rad * 0.55, 1.1 * k, 1.1 * k, hex('#141014'), 0); }
        elipse(c, cx, cy, 1.1 * k, 1.1 * k, hex('#141014'), 0);
        r.data.set(deCapa(c).data);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3 * k; j++) px(r, cx - rad - 3 - j - i * 0, cy - 3 + i * 3, hex('#f4f2ee'), 180);
        break;
      }
      case 'arepa': {
        const c = capa(W, H);
        const rx = (4.8 - [0, 1.6, 3, 1.6][f]) * k, ry = 4.2 * k;
        elipse(c, cx, cy, Math.max(1, rx), ry, c1, 0);
        if (rx > 2) { pon(c, cx - 1, cy - 1, c2, 0); pon(c, cx + 1, cy + 1, c2, 0); pon(c, cx + 2 * k, cy - 2, c2, 0); }
        r.data.set(deCapa(c).data);
        break;
      }
      case 'rayo': {
        const pts: [number, number][] = [[cx + 6 * k, cy], [cx + 1 * k, cy - 3 * k], [cx + 2 * k, cy - 0.5], [cx - 4 * k, cy - 3 * k], [cx - 1 * k, cy + 0.5], [cx - 8 * k, cy + 2 * k], [cx - 2 * k, cy + 3 * k], [cx - 3 * k, cy + 1]];
        const c = capa(W, H);
        poligono(c, pts.map(([x, y]) => [x, y + (f % 2 ? 1 : 0)]), c1, 0);
        const s = deCapa(c);
        // brillo alrededor
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (!s.data[i + 3] && Math.hypot(x - cx, (y - cy) * 2) < 9 * k && (x + y + f) % 3 === 0) px(r, x, y, c2, 150); }
        for (let i = 0; i < s.data.length; i += 4) if (s.data[i + 3]) r.data.set(s.data.subarray(i, i + 4), i);
        break;
      }
      case 'burbuja': {
        const rad = (4.6 + (f % 2) * 0.4) * k;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * (f % 2 ? 1.06 : 0.96));
          if (d <= rad && d > rad - 1.2) px(r, x, y, c1);
          else if (d <= rad - 1.2) px(r, x, y, c2, 90);
        }
        px(r, cx - rad * 0.4, cy - rad * 0.5, hex('#ffffff')); px(r, cx - rad * 0.4 + 1, cy - rad * 0.5, hex('#ffffff'));
        break;
      }
      case 'nota': {
        const c = capa(W, H);
        for (const [ox, oy] of [[0, f % 2], [-6 * k, -(f % 2) + 1]] as [number, number][]) {
          elipse(c, cx + ox - 1, cy + oy + 2 * k, 1.8 * k, 1.4 * k, c1, 0);
          rect(c, Math.round(cx + ox + 0.5 * k), Math.round(cy + oy - 3 * k), 1, Math.round(5 * k), c1, 0);
          rect(c, Math.round(cx + ox + 0.5 * k), Math.round(cy + oy - 3 * k), Math.round(2 * k), 1, c1, 0);
        }
        r.data.set(deCapa(c).data);
        break;
      }
      case 'hoja': {
        const c = capa(W, H);
        const ang = (f * 45 * Math.PI) / 180;
        const ex = Math.cos(ang) * 4.5 * k, ey = Math.sin(ang) * 4.5 * k;
        poligono(c, [[cx - ex, cy - ey], [cx + ey * 0.45, cy - ex * 0.45], [cx + ex, cy + ey], [cx - ey * 0.45, cy + ex * 0.45]], c1, 0);
        barra(c, cx - ex, cy - ey, cx + ex, cy + ey, 1, () => sombra(c1), 0);
        r.data.set(deCapa(c).data);
        break;
      }
    }
    frames.push(r);
  }
  return { id: `poder_${est}`, frames, t: 4, loop: true, vel: est === 'arepa' || est === 'balon' ? 3 : 2.4, centro: [Math.round(cx), Math.round(cy)] };
}

/** El poder deshaciéndose al chocar (3 cuadros: se aplasta, se abre en blanco y se apaga). */
export function poderDisipa(look: Pick<ChibiLook, 'poder'>, talla: Talla): Efecto {
  const k = talla === 32 ? 1 : 1.45;
  const W = Math.round(20 * k), H = Math.round(20 * k);
  const c1 = hex(look.poder.color), c2 = hex(look.poder.color2);
  const frames = [0, 1, 2].map((f) => {
    const r = createRaster(W, H);
    const cx = W / 2, cy = H / 2;
    if (f === 0) { disco(r, cx, cy, 6 * k, c1); disco(r, cx, cy, 4 * k, c2); }
    if (f === 1) { disco(r, cx, cy, 7.5 * k, c2); disco(r, cx, cy, 4.5 * k, hex('#ffffff')); }
    if (f === 2) for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; disco(r, cx + Math.cos(a) * 7 * k, cy + Math.sin(a) * 7 * k, 1.3 * k, c2, 200); }
    return r;
  });
  return { id: 'poder_disipa', frames, t: 4, loop: false, centro: [Math.round(W / 2), Math.round(H / 2)] };
}

/** La chispa del golpe: estrella de 8 puntas que crece y se abre (verde agua y blanco, como el video). */
export function chispa(talla: Talla, tipo: 'golpe' | 'bloqueo' = 'golpe'): Efecto {
  const k = talla === 32 ? 1 : 1.45;
  const W = Math.round(20 * k), H = W;
  const borde = hex(tipo === 'golpe' ? '#1fa88a' : '#5a7ad8'), med = hex(tipo === 'golpe' ? '#5fe0c0' : '#a8c8ff'), claro = hex('#f4fff8');
  const frames = [0.45, 0.8, 1, 0.9].map((s, f) => {
    const c = capa(W, H);
    const cx = W / 2, cy = H / 2;
    const pts: [number, number][] = [];
    for (let i = 0; i < 16; i++) { const rr = (i % 2 ? 3 : 9) * k * s; const a = -Math.PI / 2 + (i * Math.PI) / 8 + (f % 2 ? 0.2 : 0); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    poligono(c, pts, f === 3 ? borde : med, 0);
    if (f < 3) elipse(c, cx, cy, 2.4 * k * s, 2.4 * k * s, claro, 0);
    const r = juntar([{ ...c, contorno: false }], W, H, 1);
    // borde oscuro de la estrella (sin negro: un verde profundo)
    const d = r.data;
    const out = createRaster(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (d[i + 3]) { out.data.set(d.subarray(i, i + 4), i); continue; }
      const vecino = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const xx = x + dx, yy = y + dy; return xx >= 0 && yy >= 0 && xx < W && yy < H && d[(yy * W + xx) * 4 + 3]; });
      if (vecino) px(out, x, y, borde);
    }
    if (f === 3) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < 3.2 * k) out.data[i + 3] = 0; }
    return out;
  });
  return { id: tipo === 'golpe' ? 'chispa' : 'chispa_bloqueo', frames, t: 3, loop: false, centro: [W / 2, H / 2] };
}

/** Polvo al aterrizar, barrer o caer. */
export function polvo(talla: Talla): Efecto {
  const k = talla === 32 ? 1 : 1.45;
  const W = Math.round(24 * k), H = Math.round(10 * k);
  const c = hex('#d8ccb4'), cs = hex('#b0a088');
  const frames = [0, 1, 2, 3].map((f) => {
    const r = createRaster(W, H);
    for (const s of [-1, 1]) {
      const x = W / 2 + s * (2 + f * 2.5) * k, y = H - 3 * k - f * 0.6 * k;
      const rad = (2.6 - f * 0.45) * k;
      disco(r, x, y, rad + 0.6, cs, f === 3 ? 140 : 255);
      disco(r, x - 0.4, y - 0.4, rad, c, f === 3 ? 140 : 255);
    }
    if (f < 2) disco(r, W / 2, H - 2.5 * k, (2 - f) * k, c);
    return r;
  });
  return { id: 'polvo', frames, t: 4, loop: false, centro: [W / 2, H - 1] };
}

/** Estrellitas del mareo girando sobre la cabeza. */
export function mareo(talla: Talla): Efecto {
  const k = talla === 32 ? 1 : 1.45;
  const W = Math.round(22 * k), H = Math.round(10 * k);
  const amarillo = hex('#f8d838');
  const frames = [0, 1, 2, 3].map((f) => {
    const c = capa(W, H);
    for (let i = 0; i < 3; i++) {
      const a = f * (Math.PI / 6) + (i * 2 * Math.PI) / 3;
      const x = W / 2 + Math.cos(a) * 8 * k, y = H / 2 + Math.sin(a) * 2.5 * k;
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) pon(c, x + dx, y + dy, Math.sin(a) > 0 ? amarillo : mezcla(amarillo, hex('#ffffff'), 0.5), 0);
    }
    return deCapa(c);
  });
  return { id: 'mareo', frames, t: 8, loop: true, centro: [W / 2, H / 2] };
}

/** Estela del uppercut: un arco blanco que se apaga. */
export function estela(talla: Talla): Efecto {
  const k = talla === 32 ? 1 : 1.45;
  const W = Math.round(12 * k), H = Math.round(20 * k);
  const frames = [0, 1, 2].map((f) => {
    const r = createRaster(W, H);
    for (let y = 0; y < H; y++) { const x = W / 2 + Math.sin((y / H) * Math.PI) * 3 * k; px(r, x, y, hex('#ffffff'), 230 - f * 70); px(r, x + 1, y, hex('#bfe8ff'), 180 - f * 60); }
    return r;
  });
  return { id: 'estela', frames, t: 4, loop: false, centro: [W / 2, H / 2] };
}

/** Chapuzón del agua. */
export function salpica(talla: Talla): Efecto {
  const k = talla === 32 ? 1 : 1.45;
  const W = Math.round(18 * k), H = Math.round(14 * k);
  const agua = hex('#8fd8ff'), blanco = hex('#f4fbff');
  const frames = [0, 1, 2, 3].map((f) => {
    const r = createRaster(W, H);
    for (let i = 0; i < 6; i++) {
      const a = Math.PI + (i / 5) * Math.PI;
      const d = (2 + f * 2) * k;
      const x = W / 2 + Math.cos(a) * d, y = H - 2 + Math.sin(a) * d * 1.1 + f * f * 0.4;
      disco(r, x, y, (1.4 - f * 0.25) * k, i % 2 ? agua : blanco, f === 3 ? 150 : 255);
    }
    return r;
  });
  return { id: 'salpica', frames, t: 4, loop: false, centro: [W / 2, H - 2] };
}

export type Emote = 'exclamacion' | 'pregunta' | 'corazon' | 'enojo' | 'zzz' | 'gota' | 'nota' | 'idea';
export const EMOTES: Emote[] = ['exclamacion', 'pregunta', 'corazon', 'enojo', 'zzz', 'gota', 'nota', 'idea'];
const GLIFOS: Record<Emote, [string, string[]]> = {
  exclamacion: ['#e8455a', ['.##.', '.##.', '.##.', '.##.', '....', '.##.']],
  pregunta: ['#3a6ad8', ['.##.', '#..#', '..#.', '.#..', '....', '.#..']],
  corazon: ['#e8455a', ['##.##', '#####', '#####', '.###.', '..#..']],
  enojo: ['#d82020', ['#.#.', '.#.#', '#.#.', '.#.#']],
  zzz: ['#5a7ad8', ['####', '..#.', '.#..', '####']],
  gota: ['#5ac8ff', ['..#.', '.##.', '####', '####', '.##.']],
  nota: ['#8a4fd8', ['..##', '..#.', '..#.', '###.', '##..']],
  idea: ['#f4c430', ['.##.', '####', '####', '.##.', '.##.', '.##.']],
};
/** Emote en globito, dos cuadros que rebotan. */
export function emote(e: Emote, talla: Talla): Efecto {
  const s = talla === 32 ? 1 : 2;
  const [col, rows] = GLIFOS[e];
  const gw = rows[0].length * s, gh = rows.length * s;
  const W = gw + 6, H = gh + 8;
  const frames = [0, 1].map((f) => {
    const c = capa(W, H);
    // globo blanco
    rect(c, 1, 1 + f, W - 2, gh + 4, hex('#fbfaf6'), 0);
    pon(c, W / 2 - 1, gh + 5 + f, hex('#fbfaf6'), 0); pon(c, W / 2, gh + 5 + f, hex('#fbfaf6'), 0); pon(c, W / 2 - 1, gh + 6 + f, hex('#fbfaf6'), 0);
    rows.forEach((row, y) => row.split('').forEach((ch, x) => { if (ch === '#') for (let a = 0; a < s; a++) for (let b2 = 0; b2 < s; b2++) pon(c, 3 + x * s + a, 3 + f + y * s + b2, hex(col), 0); }));
    return deCapa(c);
  });
  return { id: `emote_${e}`, frames, t: 12, loop: true, centro: [Math.floor(W / 2), H - 1] };
}

/** Sombra en el piso (va en el escenario, no se mueve cuando el muñeco salta). */
export function sombraPiso(talla: Talla, ancho = 1): Raster {
  const k = talla === 32 ? 1 : 1.45;
  const W = Math.round(18 * k * ancho), H = Math.round(4 * k);
  const r = createRaster(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x + 0.5 - W / 2) / (W / 2), dy = (y + 0.5 - H / 2) / (H / 2);
    if (dx * dx + dy * dy <= 1) px(r, x, y, hex('#3a2418'), 110);
  }
  return r;
}

/** Busca un efecto por id para un muñeco. */
export function efecto(id: string, look: Pick<ChibiLook, 'poder'>, talla: Talla): Efecto | null {
  if (id === 'poder') return poder(look, talla);
  if (id === 'poder_disipa') return poderDisipa(look, talla);
  if (id === 'chispa') return chispa(talla, 'golpe');
  if (id === 'chispa_bloqueo') return chispa(talla, 'bloqueo');
  if (id === 'polvo') return polvo(talla);
  if (id === 'mareo') return mareo(talla);
  if (id === 'estela') return estela(talla);
  if (id === 'salpica') return salpica(talla);
  if (id.startsWith('emote_')) return emote(id.slice(6) as Emote, talla);
  return null;
}
export const EFECTOS = ['poder', 'poder_disipa', 'chispa', 'chispa_bloqueo', 'polvo', 'mareo', 'estela', 'salpica', ...EMOTES.map((e) => `emote_${e}`)];
void luz;
