import { createRaster, type Raster } from '../../core/raster';

/**
 * Un escenario de pelea por capas con paralaje, para capas pintadas (PNG con fondo transparente).
 *
 * Las coordenadas del mundo son las de la capa del piso (`factor` 1). La vista mide 384 x 224 y la cámara
 * es su esquina de arriba a la izquierda en el mundo. Cada capa se corre `factor` veces lo que se corre la
 * cámara desde el centro: el cielo casi nada, el muro un poco menos que el piso y el frente más que el piso.
 *
 * - **El piso en perspectiva:** cada fila del piso tiene su propio factor. La fila donde pisan los luchadores
 *   va a 1, así el piso no resbala bajo los pies. Las filas del fondo van más lento y las de abajo más rápido.
 * - **Los faroles titilan:** los tonos de luz cálida pasan a un tono vecino de la misma paleta, más oscuro o
 *   más claro, por grupos de 24 columnas con su propio ritmo. No aparece ningún color nuevo.
 * - **Los pétalos caen** en dos profundidades: detrás de los luchadores y delante de ellos.
 */
export interface CapaParallax {
  nombre: string;
  img: Raster;
  /** Cuánto se corre en x con la cámara (el piso es 1). */
  factor: number;
  /** El piso en perspectiva: el factor de su fila de arriba, el de la fila de los pies y el de la de abajo los saca la pendiente. */
  perspectiva?: { arriba: number };
  /** Cuánto se corre en y con la cámara. Por omisión el mismo `factor`, con tope 1. El muro va a 1 para no despegarse del piso. */
  factorY?: number;
  /** Corre la capa hacia abajo (negativo) o hacia arriba en la vista. El cielo baja para que la luna se vea entera. */
  dy?: number;
  /** Va delante de los luchadores. */
  frente?: boolean;
  /** Sus faroles titilan. */
  luces?: boolean;
}

export interface EscenarioParallax {
  w: number;
  h: number;
  /** La fila del mundo donde pisan los luchadores. */
  piso: number;
  capas: CapaParallax[];
  /** Los tonos de todas las capas. */
  paleta: [number, number, number][];
  /** Para cada tono de luz: su vecino más oscuro y su vecino más claro, en la paleta. */
  titila: Map<number, [number, number]>;
  /** Los tonos rosados de los pétalos, del más oscuro al más claro. */
  rosas: [number, number, number][];
  /** Hasta dónde va la cámara. */
  camara: { x0: number; x1: number; y0: number; y1: number };
}

export const VISTA = { w: 384, h: 224 };

const clave = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b;
const esLuz = (r: number, g: number, b: number) => r > 200 && g > 110 && b < 140 && r - b > 90;
const luz = (c: [number, number, number]) => 0.3 * c[0] + 0.55 * c[1] + 0.15 * c[2];

/** Lee las capas, junta la paleta, arma la tabla de los faroles y el rango de la cámara. */
export function prepararEscenario(capas: CapaParallax[], piso: number): EscenarioParallax {
  const { w, h } = capas[0].img;
  for (const c of capas) if (c.img.w !== w || c.img.h !== h) throw new Error(`la capa ${c.nombre} no mide ${w} x ${h}`);
  const vistos = new Map<number, [number, number, number]>();
  for (const c of capas) {
    const d = c.img.data;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3]) vistos.set(clave(d[i], d[i + 1], d[i + 2]), [d[i], d[i + 1], d[i + 2]]);
  }
  const paleta = [...vistos.values()];
  // el vecino de un tono de luz: el más parecido en matiz con un brillo un 15 % más bajo o más alto
  const vecino = (c: [number, number, number], f: number) => {
    const meta = c.map((v) => v * f);
    let mejor = c, dm = Infinity;
    for (const p of paleta) {
      if ((f < 1 ? luz(p) >= luz(c) : luz(p) <= luz(c)) || p[0] < p[2]) continue;
      const dd = (p[0] - meta[0]) ** 2 + (p[1] - meta[1]) ** 2 + (p[2] - meta[2]) ** 2;
      if (dd < dm) { dm = dd; mejor = p; }
    }
    return clave(...mejor);
  };
  const titila = new Map<number, [number, number]>();
  for (const c of paleta) if (esLuz(...c)) titila.set(clave(...c), [vecino(c, 0.82), vecino(c, 1.15)]);
  const rosas = paleta.filter(([r, g, b]) => r > 200 && b > 150 && g < r - 30 && g > 90).sort((a, b) => luz(a) - luz(b));
  // la cámara llega hasta donde la capa más rápida todavía cubre la vista
  const cx = (w - VISTA.w) / 2, rapido = Math.max(...capas.map((c) => c.factor));
  const r = cx / rapido;
  return { w, h, piso, capas, paleta, titila, rosas, camara: { x0: Math.ceil(cx - r), x1: Math.floor(cx + r), y0: 0, y1: h - VISTA.h } };
}

/** Dónde empieza una capa (o una fila del piso) para la cámara dada. */
function origen(e: EscenarioParallax, f: number, fy: number, cam: { x: number; y: number }) {
  const cx = (e.w - VISTA.w) / 2, cy = e.h - VISTA.h;
  return [Math.round(cx + (cam.x - cx) * f), Math.round(cy + (cam.y - cy) * fy)];
}

const primeraFila = new WeakMap<Raster, number>();

/** El factor de una fila del piso: 1 en la fila de los pies y `arriba` en la primera fila con piso. */
export function factorFila(e: EscenarioParallax, c: CapaParallax, y: number): number {
  if (!c.perspectiva) return c.factor;
  let top = primeraFila.get(c.img);
  if (top === undefined) {
    const d = c.img.data;
    top = 0;
    while (top < e.h && !d[(top * e.w + (e.w >> 1)) * 4 + 3]) top++;
    primeraFila.set(c.img, top);
  }
  const pendiente = (1 - c.perspectiva.arriba) / Math.max(1, e.piso - top);
  return c.factor + (y - e.piso) * pendiente;
}

/** El estado de un grupo de faroles en el tick `t`: -1 se apaga un poco, 0 normal, 1 se aviva. */
export function estadoFarol(grupo: number, t: number): number {
  const ritmo = [0, 0, 1, 0, -1, 0, 0, 1, 1, 0, -1, -1, 0, 0, 1, 0];
  return ritmo[(Math.floor(t / 5) + grupo * 7) % ritmo.length];
}

/** Pinta una capa en la vista. */
function pintarCapa(e: EscenarioParallax, c: CapaParallax, cam: { x: number; y: number }, t: number, dst: Raster) {
  const fy = c.factorY ?? Math.min(1, c.factor);
  const oy = origen(e, c.factor, fy, cam)[1] + (c.dy ?? 0);
  const s = c.img.data;
  for (let y = 0; y < VISTA.h; y++) {
    const sy = y + oy;
    if (sy < 0 || sy >= e.h) continue;
    const [ox] = origen(e, factorFila(e, c, sy), fy, cam);
    for (let x = 0; x < VISTA.w; x++) {
      const sx = x + ox;
      if (sx < 0 || sx >= e.w) continue;
      const si = (sy * e.w + sx) * 4;
      if (!s[si + 3]) continue;
      let r = s[si], g = s[si + 1], b = s[si + 2];
      if (c.luces) {
        const vec = e.titila.get(clave(r, g, b));
        if (vec) {
          const est = estadoFarol(Math.floor(sx / 24), t);
          if (est) { const k = vec[est < 0 ? 0 : 1]; r = k >> 16; g = (k >> 8) & 255; b = k & 255; }
        }
      }
      const di = (y * VISTA.w + x) * 4;
      dst.data[di] = r; dst.data[di + 1] = g; dst.data[di + 2] = b; dst.data[di + 3] = 255;
    }
  }
}

/** Un pétalo en el tick `t`: dónde está en la vista y qué forma tiene. */
interface Petalo { x: number; y: number; forma: number; tono: number }

/** Los pétalos de una profundidad: `atras` va al 0.8 detrás de los luchadores, `frente` al 1.2 delante. */
export function petalos(e: EscenarioParallax, cam: { x: number; y: number }, t: number, capa: 'atras' | 'frente'): Petalo[] {
  const f = capa === 'atras' ? 0.8 : 1.2, n = capa === 'atras' ? 18 : 10, semilla = capa === 'atras' ? 11 : 29;
  const [ox, oy] = origen(e, f, Math.min(1, f), cam);
  const ancho = VISTA.w + 40, alto = VISTA.h + 30;
  const out: Petalo[] = [];
  for (let i = 0; i < n; i++) {
    const azar = (k: number) => { const v = Math.sin((i + 1) * 12.9898 + (k + semilla) * 78.233) * 43758.5453; return v - Math.floor(v); };
    const vy = 0.25 + azar(1) * 0.35, amp = 3 + azar(2) * 6, fase = azar(3) * 6.28;
    const mx = azar(4) * e.w * 1.4 - t * (0.2 + azar(5) * 0.2) + Math.sin(t * 0.035 + fase) * amp;
    const my = azar(6) * alto + t * vy;
    const x = ((((mx - ox) % ancho) + ancho) % ancho) - 20;
    const y = ((((my - oy) % alto) + alto) % alto) - 15;
    out.push({ x: Math.round(x), y: Math.round(y), forma: Math.floor(t / 8 + i) % 4, tono: i % 2 });
  }
  return out;
}

/** Dibuja pétalos en una imagen de la vista, con los rosas de la paleta. */
export function pintarPetalos(e: EscenarioParallax, ps: Petalo[], dst: Raster) {
  const formas = [[[0, 0, 1], [1, 0, 0]], [[0, 0, 1], [0, 1, 0]], [[0, 0, 0], [1, 0, 1]], [[0, 0, 1]]];
  const oscuro = e.rosas[0] ?? [220, 120, 170], claro = e.rosas[e.rosas.length - 1] ?? [255, 200, 225];
  for (const p of ps)
    for (const [dx, dy, k] of formas[p.forma]) {
      const x = p.x + dx, y = p.y + dy;
      if (x < 0 || y < 0 || x >= dst.w || y >= dst.h) continue;
      const c = k ^ p.tono ? claro : oscuro, i = (y * dst.w + x) * 4;
      dst.data[i] = c[0]; dst.data[i + 1] = c[1]; dst.data[i + 2] = c[2]; dst.data[i + 3] = 255;
    }
}

/** Lo que va detrás de los luchadores: todas las capas menos el frente, y los pétalos de atrás. */
export function pintarFondo(e: EscenarioParallax, cam: { x: number; y: number }, t: number): Raster {
  const r = createRaster(VISTA.w, VISTA.h);
  for (const c of e.capas) if (!c.frente) pintarCapa(e, c, cam, t, r);
  pintarPetalos(e, petalos(e, cam, t, 'atras'), r);
  return r;
}

/** Lo que va delante de los luchadores: las capas del frente y los pétalos de adelante, con fondo transparente. */
export function pintarFrente(e: EscenarioParallax, cam: { x: number; y: number }, t: number): Raster {
  const r = createRaster(VISTA.w, VISTA.h);
  for (const c of e.capas) if (c.frente) pintarCapa(e, c, cam, t, r);
  pintarPetalos(e, petalos(e, cam, t, 'frente'), r);
  return r;
}

/** La cámara que sigue a los dos luchadores (en coordenadas del mundo) y sube con el que salta. */
export function seguirCamara(e: EscenarioParallax, xs: number[], alturaSalto: number): { x: number; y: number } {
  const medio = (Math.min(...xs) + Math.max(...xs)) / 2;
  const x = Math.min(e.camara.x1, Math.max(e.camara.x0, medio - VISTA.w / 2));
  const y = Math.min(e.camara.y1, Math.max(e.camara.y0, e.camara.y1 - alturaSalto * 0.4));
  return { x, y };
}

/** El manifest de un escenario por capas, como va en `public/escenarios/<id>/manifest.json`. */
export interface ManifestEscenario {
  id: string;
  w: number;
  h: number;
  piso: number;
  capas: { img: string; factor: number; factorY?: number; dy?: number; luces?: boolean; perspectiva?: { arriba: number } }[];
  frente: { img: string; factor: number; luces?: boolean }[];
}

/** Arma el escenario desde su manifest y sus imágenes ya leídas (por nombre de archivo). */
export function escenarioDesdeManifest(m: ManifestEscenario, imgs: Record<string, Raster>): EscenarioParallax {
  const capa = (c: ManifestEscenario['capas'][number], frente: boolean): CapaParallax => {
    const img = imgs[c.img];
    if (!img) throw new Error(`falta la imagen ${c.img}`);
    return { nombre: c.img.replace(/\.png$/, ''), img, factor: c.factor, factorY: 'factorY' in c ? c.factorY : undefined, dy: 'dy' in c ? c.dy : undefined, luces: c.luces, perspectiva: 'perspectiva' in c ? c.perspectiva : undefined, frente };
  };
  return prepararEscenario([...m.capas.map((c) => capa(c, false)), ...m.frente.map((c) => capa(c, true))], m.piso);
}
