import { fromScreen, toScreen, SQRT2, type Direction, type Vec } from './iso';

/**
 * Canchas de la arena. El piso se pinta pixel por pixel una sola vez (material por punto del mundo, con un poco de
 * ruido para que no sea plano) y los objetos con altura (red, postes, cuerdas) se dibujan aparte con su profundidad.
 */

export type SceneId = 'atletismo' | 'natacion' | 'voley' | 'tenis' | 'pelea';

type RGB = [number, number, number];

export interface Spot { pos: Vec; facing: Direction }

export interface Scene {
  id: SceneId;
  /** color del fondo más allá del piso pintado (césped, piso del club, tribuna) */
  bg: string;
  /** caja del piso en el mundo */
  bounds: { x0: number; y0: number; x1: number; y1: number };
  ground: HTMLCanvasElement;
  /** esquina de arriba a la izquierda del piso, en pantalla */
  origin: Vec;
  player: Spot;
  rival?: Spot;
  /** hasta dónde puede ir un atleta */
  clamp(p: Vec, side?: -1 | 1): Vec;
  /** objetos con altura: se dibujan detrás o delante según `depth` (x + y del mundo) */
  props(g: CanvasRenderingContext2D, cam: Vec, t: number, layer: 'back' | 'mid' | 'front'): void;
  /** canchas: medio largo y medio ancho de la cancha (lo que es adentro) */
  court?: { X: number; Y: number };
  /** ancho mínimo de la vista en pixeles de arte: en una cancha larga tienen que entrar los dos jugadores */
  span?: number;
  /** red: los atletas de un lado se dibujan antes que la red y los del otro después */
  netX?: number;
  netTop?: number;
  /** natación: el agua de la piscina */
  pool?: { u0: number; u1: number; v0: number; v1: number };
  /** pista de atletismo: dónde está la arena del salto largo */
  pit?: { u0: number; u1: number; v0: number; v1: number };
}

// coordenadas de pista: u a lo largo de la pantalla (derecha), v hacia abajo de la pantalla
export const toUV = (p: Vec) => ({ u: (p.x - p.y) / SQRT2, v: (p.x + p.y) / SQRT2 });
export const fromUV = (u: number, v: number): Vec => ({ x: (u + v) / SQRT2, y: (v - u) / SQRT2 });

function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function paint(bounds: Scene['bounds'], mat: (p: Vec) => RGB | null): { ground: HTMLCanvasElement; origin: Vec } {
  const corners = [toScreen(bounds.x0, bounds.y0), toScreen(bounds.x1, bounds.y0), toScreen(bounds.x0, bounds.y1), toScreen(bounds.x1, bounds.y1)];
  const sx0 = Math.floor(Math.min(...corners.map((c) => c.x))), sx1 = Math.ceil(Math.max(...corners.map((c) => c.x)));
  const sy0 = Math.floor(Math.min(...corners.map((c) => c.y))), sy1 = Math.ceil(Math.max(...corners.map((c) => c.y)));
  const W = sx1 - sx0, H = sy1 - sy0;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = x + sx0 + 0.5, sy = y + sy0 + 0.5;
    const p = fromScreen(sx, sy);
    if (p.x < bounds.x0 || p.x > bounds.x1 || p.y < bounds.y0 || p.y > bounds.y1) continue;
    const c = mat(p);
    if (!c) continue;
    const n = (hash(x, y) - 0.5) * 10;
    const i = (y * W + x) * 4;
    img.data[i] = c[0] + n; img.data[i + 1] = c[1] + n; img.data[i + 2] = c[2] + n; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return { ground: cv, origin: { x: sx0, y: sy0 } };
}

const GRASS: RGB = [74, 128, 70], GRASS2: RGB = [68, 119, 64], WHITE: RGB = [236, 234, 226];
const near = (v: number, k: number, w = 0.9) => Math.abs(v - k) < w;

/** línea vertical (poste) con sombra, de z0 a z1 */
function post(g: CanvasRenderingContext2D, cam: Vec, p: Vec, h: number, color: string, w = 1) {
  const s = toScreen(p.x, p.y);
  const x = Math.round(s.x - cam.x), y = Math.round(s.y - cam.y);
  g.fillStyle = color;
  g.fillRect(x, y - h, w, h);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(x, y - h, 1, 1);
}

function line3(g: CanvasRenderingContext2D, cam: Vec, a: Vec, za: number, b: Vec, zb: number, color: string) {
  const s = toScreen(a.x, a.y, za), e = toScreen(b.x, b.y, zb);
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(e.x - s.x), Math.abs(e.y - s.y))));
  g.fillStyle = color;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    g.fillRect(Math.round(s.x + (e.x - s.x) * t - cam.x), Math.round(s.y + (e.y - s.y) * t - cam.y), 1, 1);
  }
}

function athletics(): Scene {
  const U0 = -420, U1 = 1060, V0 = -260, V1 = 260;
  const pit = { u0: 470, u1: 560, v0: -22, v1: 22 };
  const mat = { u0: 700, u1: 760, v0: -30, v1: 30 };
  const bounds = { x0: -500, y0: -940, x1: 940, y1: 500 };
  const inUV = (u: number, v: number) => u >= U0 && u <= U1 && v >= V0 && v <= V1;
  const { ground, origin } = paint(bounds, (p) => {
    const { u, v } = toUV(p);
    if (!inUV(u, v)) return null;
    const lane = v / SQRT2; // en pantalla
    if (u >= pit.u0 && u <= pit.u1 && v >= pit.v0 && v <= pit.v1) return [222, 196, 140];
    if (u >= mat.u0 && u <= mat.u1 && v >= mat.v0 && v <= mat.v1) return near(u, mat.u0, 1.2) ? [30, 60, 140] : [52, 96, 196];
    if (Math.abs(lane) <= 30) {
      // pista de tartán con 4 andariveles, salida y llegada
      if (near(lane, -30, 0.6) || near(lane, -15, 0.5) || near(lane, 0, 0.5) || near(lane, 15, 0.5) || near(lane, 30, 0.6)) return WHITE;
      if (near(u, -260, 1) || near(u, 340, 1)) return WHITE;
      return [178, 82, 60];
    }
    // césped con franjas y marcas de lanzamiento cada 50
    if (u > 780 && near(u % 50, 0, 1)) return [200, 220, 196];
    return Math.floor(u / 40) % 2 ? GRASS : GRASS2;
  });
  return {
    id: 'atletismo', bg: '#4a7f46', bounds, ground, origin, pit,
    player: { pos: fromUV(-280, 0), facing: 'right' },
    clamp: (p) => { const { u, v } = toUV(p); return fromUV(Math.max(U0 + 60, Math.min(U1 - 60, u)), Math.max(-110, Math.min(110, v))); },
    props: (g, cam, _t, layer) => {
      if (layer !== 'back') return;
      // tablón de pique
      const a = fromUV(455, -21), b = fromUV(455, 21);
      line3(g, cam, a, 0, b, 0, '#f4f1e8');
      // saltómetros de la garrocha y la varilla
      const l = fromUV(700, -32), r = fromUV(700, 32);
      post(g, cam, l, 30, '#e4e4ea'); post(g, cam, r, 30, '#e4e4ea');
      line3(g, cam, l, 28, r, 28, '#ffd34d');
    },
  };
}
function swimming(): Scene {
  const pool = { u0: -75, u1: 75, v0: -64, v1: 64 };
  const bounds = { x0: -260, y0: -260, x1: 260, y1: 260 };
  const { ground, origin } = paint(bounds, (p) => {
    const { u, v } = toUV(p);
    if (Math.abs(u) > 360 || Math.abs(v) > 360) return null;
    if (u >= pool.u0 && u <= pool.u1 && v >= pool.v0 && v <= pool.v1) {
      // agua: azulejos del fondo y la línea negra de cada carril
      const sv = v / SQRT2;
      if (near(((sv + 64) % 22), 11, 1.1) && u > pool.u0 + 20 && u < pool.u1 - 20) return [30, 70, 130];
      if (near(u % 24, 0, 0.6) || near(((sv + 64) % 11), 0, 0.5)) return [56, 140, 196];
      return [64, 156, 210];
    }
    // borde de la piscina y piso del club
    if (u >= pool.u0 - 6 && u <= pool.u1 + 6 && v >= pool.v0 - 6 && v <= pool.v1 + 6) return [228, 232, 236];
    return (Math.floor(u / 12) + Math.floor(v / 12)) % 2 ? [196, 204, 212] : [186, 194, 204];
  });
  const lanes = [-45, -15, 15, 45];
  return {
    id: 'natacion', bg: '#bec6cf', bounds, ground, origin, pool,
    player: { pos: fromUV(pool.u0 - 4, -15), facing: 'right' },
    clamp: (p) => { const { u, v } = toUV(p); return fromUV(Math.max(pool.u0 + 8, Math.min(pool.u1 - 8, u)), Math.max(pool.v0 + 8, Math.min(pool.v1 - 6, v))); },
    props: (g, cam, t, layer) => {
      if (layer === 'back') {
        // brillo del agua que se mueve
        for (let i = 0; i < 90; i++) {
          const u = pool.u0 + ((i * 97.3 + t * 18) % (pool.u1 - pool.u0));
          const v = pool.v0 + 4 + ((i * 53.1) % (pool.v1 - pool.v0 - 8));
          const s = toScreen(fromUV(u, v).x, fromUV(u, v).y);
          g.fillStyle = 'rgba(255,255,255,0.55)';
          g.fillRect(Math.round(s.x - cam.x), Math.round(s.y - cam.y), 2 + (i % 3), 1);
        }
        // corcheras entre carriles
        for (const v of [-30, 0, 30]) {
          for (let u = pool.u0; u < pool.u1; u += 3) {
            const s = toScreen(fromUV(u, v).x, fromUV(u, v).y);
            g.fillStyle = Math.floor(u / 9) % 2 ? '#e8455a' : '#f4f1e8';
            g.fillRect(Math.round(s.x - cam.x), Math.round(s.y - cam.y), 2, 1);
          }
        }
        // bancos de salida
        for (const v of lanes) {
          const s = toScreen(fromUV(pool.u0 - 6, v).x, fromUV(pool.u0 - 6, v).y);
          g.fillStyle = '#f4f1e8'; g.fillRect(Math.round(s.x - cam.x) - 5, Math.round(s.y - cam.y) - 4, 9, 4);
          g.fillStyle = '#3b6cd8'; g.fillRect(Math.round(s.x - cam.x) - 5, Math.round(s.y - cam.y) - 4, 9, 1);
        }
      }
    },
  };
}

function court(id: 'voley' | 'tenis'): Scene {
  const volley = id === 'voley';
  // el tenis va en una cancha compacta, estilo arcade: con la de verdad los jugadores quedan chiquitos y lejos
  const X = volley ? 90 : 80, Y = volley ? 45 : 36;
  const bounds = volley ? { x0: -150, y0: -100, x1: 150, y1: 100 } : { x0: -130, y0: -76, x1: 130, y1: 76 };
  const netTop = volley ? 26 : 11;
  const { ground, origin } = paint(bounds, (p) => {
    const { x, y } = p;
    const inC = Math.abs(x) <= X && Math.abs(y) <= Y;
    if (volley) {
      if (inC && (near(Math.abs(x), X) || near(Math.abs(y), Y) || near(x, 0) || near(Math.abs(x), 30))) return WHITE;
      return inC ? [214, 168, 112] : [226, 196, 140];
    }
    const singles = 28, service = 44;
    if (inC && (near(Math.abs(x), X) || near(Math.abs(y), Y) || near(Math.abs(y), singles) || (Math.abs(x) <= service && (near(Math.abs(x), service) || near(y, 0))))) return WHITE;
    return inC ? [52, 112, 168] : [70, 140, 96];
  });
  const sideSign = (p: Vec) => (p.x < 0 ? -1 : 1);
  return {
    id, bg: volley ? '#e2c48c' : '#468c60', bounds, ground, origin, netX: 0, netTop,
    court: { X, Y: volley ? Y : 28 }, span: volley ? 200 : 250,
    player: { pos: volley ? { x: -60, y: 0 } : { x: -90, y: 8 }, facing: 'down_right' },
    rival: { pos: volley ? { x: 60, y: 0 } : { x: 90, y: -8 }, facing: 'up_left' },
    clamp: (p, side) => {
      const s = side ?? sideSign(p);
      const x = s < 0 ? Math.max(bounds.x0 + 12, Math.min(-6, p.x)) : Math.min(bounds.x1 - 12, Math.max(6, p.x));
      return { x, y: Math.max(bounds.y0 + 10, Math.min(bounds.y1 - 10, p.y)) };
    },
    props: (g, cam, _t, layer) => {
      if (layer !== 'mid') return;
      const a = { x: 0, y: -Y - 6 }, b = { x: 0, y: Y + 6 };
      post(g, cam, a, netTop + 2, '#3a3a44', 2); post(g, cam, b, netTop + 2, '#3a3a44', 2);
      // la red: malla de puntos y la faja blanca de arriba
      const low = volley ? netTop - 10 : 0;
      for (let z = low; z <= netTop; z += 2) for (let y = a.y; y <= b.y; y += 2) {
        const s = toScreen(0, y, z);
        g.fillStyle = 'rgba(20,20,28,0.55)';
        g.fillRect(Math.round(s.x - cam.x), Math.round(s.y - cam.y), 1, 1);
      }
      line3(g, cam, a, netTop, b, netTop, '#f4f1e8');
      line3(g, cam, a, netTop - 1, b, netTop - 1, '#f4f1e8');
    },
  };
}

function ring(): Scene {
  const R = 64;
  const bounds = { x0: -110, y0: -110, x1: 110, y1: 110 };
  const { ground, origin } = paint(bounds, (p) => {
    const { x, y } = p;
    if (Math.abs(x) <= R && Math.abs(y) <= R) {
      if (Math.hypot(x, y) < 12 && Math.hypot(x, y) > 10.5) return [200, 60, 72];
      return [226, 222, 210];
    }
    if (Math.abs(x) <= R + 8 && Math.abs(y) <= R + 8) return [176, 44, 58];
    return (Math.floor(x / 14) + Math.floor(y / 14)) % 2 ? [42, 38, 56] : [36, 32, 48];
  });
  const corners: Vec[] = [{ x: -R, y: -R }, { x: R, y: -R }, { x: R, y: R }, { x: -R, y: R }];
  const ropes = (g: CanvasRenderingContext2D, cam: Vec, front: boolean) => {
    // de atrás: los lados de arriba de la pantalla (y = -R y x = -R); de adelante: los otros dos
    const sides: [Vec, Vec][] = front ? [[corners[1], corners[2]], [corners[2], corners[3]]] : [[corners[3], corners[0]], [corners[0], corners[1]]];
    for (const [a, b] of sides) for (const [z, c] of [[8, '#e8455a'], [14, '#f4f1e8'], [20, '#3b6cd8']] as const) line3(g, cam, a, z, b, z, c);
  };
  return {
    id: 'pelea', bg: '#221f30', bounds, ground, origin,
    player: { pos: fromUV(-16, 0), facing: 'right' },
    rival: { pos: fromUV(16, 0), facing: 'left' },
    clamp: (p) => ({ x: Math.max(-R + 8, Math.min(R - 8, p.x)), y: Math.max(-R + 8, Math.min(R - 8, p.y)) }),
    props: (g, cam, _t, layer) => {
      if (layer === 'back') {
        for (const c of [corners[3], corners[0], corners[1]]) post(g, cam, c, 24, '#c9c9d2', 2);
        ropes(g, cam, false);
      }
      if (layer === 'front') {
        post(g, cam, corners[2], 24, '#c9c9d2', 2);
        ropes(g, cam, true);
      }
    },
  };
}

export function makeScene(id: SceneId): Scene {
  switch (id) {
    case 'atletismo': return athletics();
    case 'natacion': return swimming();
    case 'voley': return court('voley');
    case 'tenis': return court('tenis');
    case 'pelea': return ring();
  }
}
