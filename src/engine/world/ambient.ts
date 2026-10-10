import { createRaster, type Raster } from '../core/raster';

/**
 * Atmósfera del mundo: partículas chiquitas (luciérnagas, hojas, mariposas, polen, brasas, brillos, esporas, humo,
 * polvo, gotas) y dos texturas técnicas: la luz (degradado radial blanco, para sumar en modo aditivo con el color de
 * cada luz) y la sombra de nube (mancha suave que cruza el mapa despacio).
 */

export interface Particle { name: string; w: number; h: number; frames: Raster[]; fps: number }

const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
function put(r: Raster, x: number, y: number, hex: string, a = 255) {
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const i = (y * r.w + x) * 4, [R, G, B] = rgb(hex);
  r.data[i] = R; r.data[i + 1] = G; r.data[i + 2] = B; r.data[i + 3] = a;
}
const frame = (w: number, h: number, draw: (r: Raster) => void) => { const r = createRaster(w, h); draw(r); return r; };

function firefly(): Particle {
  const k = [0.4, 0.8, 1, 0.7];
  return {
    name: 'luciernaga', w: 8, h: 8, fps: 6,
    frames: k.map((v) => frame(8, 8, (r) => {
      put(r, 3, 3, '#fffbd0'); put(r, 4, 3, '#fffbd0'); put(r, 3, 4, '#fffbd0'); put(r, 4, 4, '#e8ff8a');
      const a = Math.round(90 * v);
      for (const [x, y] of [[2, 3], [5, 4], [3, 2], [4, 5], [2, 4], [5, 3], [3, 5], [4, 2]]) put(r, x, y, '#d8ff6a', a + 60);
      if (v > 0.9) for (const [x, y] of [[1, 3], [6, 4], [3, 1], [4, 6]]) put(r, x, y, '#d8ff6a', 70);
    })),
  };
}

function leaf(color: 'verde' | 'otono'): Particle {
  const c = color === 'verde' ? ['#5f9e3c', '#86bf4a', '#3f7432'] : ['#d8822a', '#f0b04a', '#a8541e'];
  const shapes: number[][][] = [
    [[1, 3], [2, 2], [3, 2], [4, 3], [5, 4], [2, 3], [3, 3], [4, 4]],
    [[3, 1], [3, 2], [4, 2], [3, 3], [4, 3], [4, 4], [3, 5]],
    [[1, 4], [2, 3], [3, 3], [4, 2], [5, 2], [3, 4], [4, 3], [2, 4]],
    [[2, 2], [3, 2], [3, 3], [4, 3], [4, 4], [3, 4]],
  ];
  return { name: `hoja_${color}`, w: 8, h: 8, fps: 6, frames: shapes.map((s) => frame(8, 8, (r) => s.forEach(([x, y], i) => put(r, x, y, c[i === 0 ? 2 : i % 3 === 1 ? 1 : 0])))) };
}

function butterfly(color: 'azul' | 'naranja' | 'rosa'): Particle {
  const c = { azul: ['#4a8aff', '#a8d0ff'], naranja: ['#ff8a1e', '#ffd27a'], rosa: ['#f06ab4', '#ffc0e0'] }[color];
  const open = frame(12, 12, (r) => {
    for (const [x, y] of [[2, 3], [3, 3], [2, 4], [3, 4], [4, 4], [3, 5], [4, 5], [8, 3], [9, 3], [7, 4], [8, 4], [9, 4], [7, 5], [8, 5]]) put(r, x, y, c[0]);
    for (const [x, y] of [[3, 6], [4, 6], [7, 6], [8, 6]]) put(r, x, y, c[1]);
    put(r, 2, 3, c[1]); put(r, 9, 3, c[1]);
    for (let y = 4; y <= 7; y++) { put(r, 5, y, '#2a1a1a'); put(r, 6, y, '#2a1a1a'); }
  });
  const closed = frame(12, 12, (r) => {
    for (const [x, y] of [[4, 3], [4, 4], [4, 5], [7, 3], [7, 4], [7, 5]]) put(r, x, y, c[0]);
    put(r, 4, 6, c[1]); put(r, 7, 6, c[1]);
    for (let y = 4; y <= 7; y++) { put(r, 5, y, '#2a1a1a'); put(r, 6, y, '#2a1a1a'); }
  });
  return { name: `mariposa_${color}`, w: 12, h: 12, fps: 8, frames: [open, closed] };
}

function dotParticle(name: string, cols: string[], size = 4, fps = 4): Particle {
  return {
    name, w: size, h: size, fps,
    frames: cols.map((c, i) => frame(size, size, (r) => {
      const m = Math.floor(size / 2);
      put(r, m, m, c); put(r, m - 1, m, c, 200); if (i % 2 === 0) put(r, m, m - 1, c, 160);
    })),
  };
}

function sparkle(): Particle {
  const k = [1, 2, 3, 2];
  return {
    name: 'brillo', w: 8, h: 8, fps: 8,
    frames: k.map((s) => frame(8, 8, (r) => {
      put(r, 3, 3, '#ffffff'); put(r, 4, 3, '#ffffff'); put(r, 3, 4, '#ffffff'); put(r, 4, 4, '#ffffff');
      for (let d = 1; d <= s; d++) { const a = 255 - d * 60; put(r, 3, 3 - d, '#ffffff', a); put(r, 4, 4 + d, '#ffffff', a); put(r, 3 - d, 4, '#ffffff', a); put(r, 4 + d, 3, '#ffffff', a); }
    })),
  };
}

function smoke(): Particle {
  return {
    name: 'humo', w: 16, h: 16, fps: 6,
    frames: [3, 4.5, 6, 7].map((rad, i) => frame(16, 16, (r) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x - 7.5, y - 7.5);
        if (d <= rad) put(r, x, y, d < rad - 1.5 ? '#b8b4b0' : '#8e8a88', Math.round(170 - i * 35));
      }
    })),
  };
}

function drop(): Particle {
  return { name: 'gota', w: 4, h: 6, fps: 8, frames: [frame(4, 6, (r) => { put(r, 1, 1, '#e8f6ff'); put(r, 1, 2, '#a8daf8'); put(r, 2, 2, '#a8daf8'); put(r, 1, 3, '#6cb4e4'); put(r, 2, 3, '#6cb4e4'); }), frame(4, 6, (r) => { put(r, 0, 4, '#cfeaff'); put(r, 3, 4, '#cfeaff'); put(r, 1, 5, '#a8daf8'); put(r, 2, 5, '#a8daf8'); })] };
}

/** Huella de Thor cuando olfatea: una patita dorada que brilla en el piso (el juego la desvanece). */
function pawPrint(): Particle {
  const C = '#ffd27a', B = '#fff0b8', S = '#a8741e';
  return {
    name: 'huella', w: 8, h: 8, fps: 1,
    frames: [frame(8, 8, (r) => {
      for (const [x, y] of [[2, 1], [5, 1], [0, 3], [7, 3]]) put(r, x, y, C);
      put(r, 2, 0, B); put(r, 5, 0, B);
      for (let x = 2; x <= 5; x++) put(r, x, 4, C);
      for (let x = 1; x <= 6; x++) put(r, x, 5, x === 1 || x === 6 ? S : C);
      for (let x = 2; x <= 5; x++) put(r, x, 6, S);
      put(r, 3, 4, B); put(r, 4, 4, B);
    })],
  };
}

/** Todas las partículas del mundo. */
export function particles(): Particle[] {
  return [
    firefly(), leaf('verde'), leaf('otono'), butterfly('azul'), butterfly('naranja'), butterfly('rosa'),
    dotParticle('polen', ['#fff6c0', '#ffe88a']), dotParticle('brasa', ['#ffd27a', '#ff8a1e', '#d8401a'], 4, 8),
    sparkle(), dotParticle('espora', ['#a8fff0', '#5ad8c8']), smoke(), dotParticle('polvo', ['#d8c8a8', '#bfae8e']), drop(), pawPrint(),
  ];
}

/** Luz: degradado radial blanco (se tiñe con el color de cada luz y se suma en modo aditivo). */
export function lightTexture(size = 128): Raster {
  const r = createRaster(size, size), c = (size - 1) / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.min(1, Math.hypot(x - c, y - c) / c);
    const a = Math.pow(1 - d, 2.2);
    const i = (y * size + x) * 4;
    r.data[i] = 255; r.data[i + 1] = 255; r.data[i + 2] = 255; r.data[i + 3] = Math.round(a * 255);
  }
  return r;
}

/** Sombra de nube: mancha suave y despareja (negra con poca opacidad). */
export function cloudShadow(w = 320, h = 200, seed = 3): Raster {
  const r = createRaster(w, h);
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const blobs = Array.from({ length: 9 }, () => [w * (0.25 + rnd() * 0.5), h * (0.3 + rnd() * 0.4), w * (0.12 + rnd() * 0.16), h * (0.18 + rnd() * 0.2)]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0;
    for (const [cx, cy, rx, ry] of blobs) v = Math.max(v, 1 - Math.hypot((x - cx) / rx, (y - cy) / ry));
    const a = Math.max(0, Math.min(1, v * 1.6));
    const i = (y * w + x) * 4;
    r.data[i] = 10; r.data[i + 1] = 20; r.data[i + 2] = 40; r.data[i + 3] = Math.round(a * 90);
  }
  return r;
}
