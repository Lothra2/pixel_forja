import { createRaster, type Raster } from '../core/raster';
import { objeto, registrar, herramientas, pintarObjeto, type ObjetoDef } from './objeto';
import { pintarEscena, type Escena, type Render } from './render';
import * as D from './fuego_doom';

/**
 * Fuegos del mundo con el fuego de Doom (lado Forja): quitar la llama horneada de un objeto, medir dónde está su boca
 * (la base de la llama) en px desde el ancla, y componer un fuego de Doom encima para las hojas de control.
 *
 * Por qué una variante sin llama: el sprite de una antorcha o un brasero trae sus llamas pintadas (piezas de material
 * fuego, fuego_azul, fuego_verde o luz_vela, animadas en 4 a 8 cuadros). Si el juego corre un fuego de Doom vivo
 * encima, se ven dos fuegos. Cada objeto de la tabla de fuegos de Doom tiene su gemelo `<id>_sin_llama`: las mismas
 * variantes y la misma semilla, un solo cuadro (sin la llama no hay nada que animar), con las brasas, el carbón y el
 * resplandor que tiñe la madera y el hierro. El juego dibuja el gemelo y encima el fuego vivo en la boca.
 */

/** Materiales que son llama (se quitan); la lava y las brasas se quedan (son la boca encendida). */
export const MATS_LLAMA = new Set(['fuego', 'fuego_azul', 'fuego_verde', 'luz_vela']);
export const SUFIJO_SIN_LLAMA = '_sin_llama';

export function escenaDe(d: ObjetoDef, v: string, f: number, seed = 1): Escena {
  const a = d.armar(v, f, herramientas(seed));
  return Array.isArray(a) ? { piezas: a, sinSombra: d.plano } : { sinSombra: d.plano, ...a };
}
export function quitarLlama(esc: Escena): Escena {
  return { ...esc, piezas: esc.piezas.filter((p) => p.resta || !MATS_LLAMA.has(p.mat)) };
}
/** Materiales de llama de una variante (cuántas piezas de cada uno), en el cuadro 0. */
export function llamasDe(id: string, v: string): Record<string, number> {
  const m: Record<string, number> = {};
  for (const p of escenaDe(objeto(id), v, 0).piezas) if (!p.resta && MATS_LLAMA.has(p.mat)) m[p.mat] = (m[p.mat] ?? 0) + 1;
  return m;
}

/** Vitrales que brillan solos (la catedral de Santa Oria): en el gemelo sin llama quedan de vidrio apagado. */
export const VITRAL = 'abo_vitral', VITRAL_APAGADO = 'abo_vidrio_muerto';
export function apagarVitrales(esc: Escena): Escena {
  return { ...esc, piezas: esc.piezas.map((p) => (p.mat === VITRAL && !p.resta ? { ...p, mat: VITRAL_APAGADO, tono: (p.tono ?? 0) * 0.3 } : p)) };
}
/** El gemelo: sin las llamas y con los vitrales apagados (el fuego vivo los enciende desde atrás). */
export const sinFuegoHorneado = (esc: Escena) => apagarVitrales(quitarLlama(esc));

/** Registra el gemelo sin llama de un objeto (si no estaba). Devuelve su id. */
export function registrarSinLlama(id: string): string {
  const d = objeto(id), nid = id + SUFIJO_SIN_LLAMA;
  registrar({
    id: nid, nombre: [`${d.nombre[0]} (sin llama)`, `${d.nombre[1]} (no flame)`], tema: d.tema, variantes: [...d.variantes],
    huella: d.huella, huellaPor: d.huellaPor, bloquea: d.bloquea, plano: d.plano, cuadros: 1, t: d.t,
    // misma semilla y mismo cuadro 0 que el original: la misma geometría, sin las piezas de llama
    armar: (v, _f, a) => sinFuegoHorneado(escenaDe(d, v, 0, a.seed)),
  });
  return nid;
}

// ---------------------------------------------------------------------------------------------------------------
// medir la boca

export interface MedidaLlama {
  /** base de la llama (centro de abajo), en px desde el ancla del sprite (x a la derecha, y hacia abajo) */
  boca: [number, number];
  /** caja de la llama horneada (unión de sus cuadros), en px */
  ancho: number;
  alto: number;
  /** bases de cada llama separada (velas de un candelabro), px desde el ancla */
  focos: [number, number][];
}

/** Mide la llama horneada de una variante comparando el sprite con su gemelo sin llama (cuadros 0, n/3 y 2n/3). */
export function medirLlama(id: string, v: string): MedidaLlama | null {
  const d = objeto(id), n = d.cuadros ?? 1;
  const sin = pintarEscena(sinFuegoHorneado(escenaDe(d, v, 0)));
  const cuadros = [...new Set([0, Math.floor(n / 3), Math.floor((2 * n) / 3)])].map((f) => pintarObjeto(id, v, f));
  // máscara de llama en coordenadas desde el ancla
  const X0 = -256, Y0 = -400, MW = 512, MH = 480, m = new Uint8Array(MW * MH);
  for (const r of cuadros) {
    for (let y = 0; y < r.img.h; y++) for (let x = 0; x < r.img.w; x++) {
      const i = (y * r.img.w + x) * 4, a = r.img.data[i + 3];
      if (a < 60) continue;
      const R = r.img.data[i], G = r.img.data[i + 1], B = r.img.data[i + 2];
      if (Math.max(R, G, B) < 80) continue;
      const sx = x - r.ancla[0] + sin.ancla[0], sy = y - r.ancla[1] + sin.ancla[1];
      let dif = 255;
      if (sx >= 0 && sy >= 0 && sx < sin.img.w && sy < sin.img.h) {
        const j = (sy * sin.img.w + sx) * 4;
        dif = sin.img.data[j + 3] < 40 ? 255 : Math.max(Math.abs(R - sin.img.data[j]), Math.abs(G - sin.img.data[j + 1]), Math.abs(B - sin.img.data[j + 2]));
      }
      if (dif < 70) continue;
      const mx = x - r.ancla[0] - X0, my = y - r.ancla[1] - Y0;
      if (mx >= 0 && my >= 0 && mx < MW && my < MH) m[my * MW + mx] = 1;
    }
  }
  // componentes (8 vecinos, con un px de tolerancia)
  const comp = new Int32Array(MW * MH).fill(-1), grupos: number[][] = [];
  for (let i = 0; i < MW * MH; i++) {
    if (!m[i] || comp[i] >= 0) continue;
    const g: number[] = [], pila = [i]; comp[i] = grupos.length;
    while (pila.length) {
      const k = pila.pop()!; g.push(k);
      const kx = k % MW, ky = (k - kx) / MW;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const x = kx + dx, y = ky + dy; if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
        const j = y * MW + x; if (m[j] && comp[j] < 0) { comp[j] = grupos.length; pila.push(j); }
      }
    }
    grupos.push(g);
  }
  grupos.sort((a, b) => b.length - a.length);
  // fuera las chispas sueltas: cuentan las llamas de al menos un 15 % de la mayor
  const buenos = grupos.filter((g) => g.length >= Math.max(4, grupos[0]?.length * 0.15));
  if (!buenos.length) return null;
  /** base de un grupo: y en el percentil 90 (no el pixel más bajo, que es el borde de adelante), x en su franja de abajo */
  const base = (g: number[]): [number, number] => {
    const ys = g.map((k) => Math.floor(k / MW)).sort((a, b) => a - b), ymin = ys[0], ymax = ys[ys.length - 1];
    const yb = ys[Math.min(ys.length - 1, Math.floor(ys.length * 0.9))], franja = Math.max(1, (ymax - ymin) * 0.2);
    let sx = 0, c = 0; for (const k of g) if (Math.floor(k / MW) >= yb - franja) { sx += k % MW; c++; }
    return [Math.round(sx / c) + X0, yb + Y0 + 1];
  };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const g of buenos) for (const k of g) { const x = k % MW, y = Math.floor(k / MW); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const focos = buenos.slice(0, 8).map(base).sort((a, b) => a[0] - b[0]);
  return { boca: base(buenos.flat()), ancho: x1 - x0 + 1, alto: y1 - y0 + 1, focos };
}

/**
 * Máscara (0..255 por px) de lo que el fuego vivo reemplaza, alineada con el sprite del gemelo sin llama del cuadro 0:
 * los vitrales y las llamas horneadas. Sirve para enmascarar el fuego de Doom (los vitrales arden desde atrás).
 */
export function mascaraFuego(id: string, v: string, original?: Render, gemelo?: Render): { mascara: Uint8Array; w: number; h: number; ancla: [number, number] } {
  const d = objeto(id);
  const sin = gemelo ?? pintarEscena(sinFuegoHorneado(escenaDe(d, v, 0)));
  const r = original ?? pintarObjeto(id, v, 0);
  const m = new Uint8Array(sin.img.w * sin.img.h);
  for (let y = 0; y < r.img.h; y++) for (let x = 0; x < r.img.w; x++) {
    const i = (y * r.img.w + x) * 4; if (r.img.data[i + 3] < 60) continue;
    const sx = x - r.ancla[0] + sin.ancla[0], sy = y - r.ancla[1] + sin.ancla[1];
    if (sx < 0 || sy < 0 || sx >= sin.img.w || sy >= sin.img.h) continue;
    const j = (sy * sin.img.w + sx) * 4;
    const dif = Math.max(Math.abs(r.img.data[i] - sin.img.data[j]), Math.abs(r.img.data[i + 1] - sin.img.data[j + 1]), Math.abs(r.img.data[i + 2] - sin.img.data[j + 2]));
    m[sy * sin.img.w + sx] = Math.max(0, Math.min(255, (dif - 30) * 3));
  }
  return { mascara: m, w: sin.img.w, h: sin.img.h, ancla: sin.ancla };
}

// ---------------------------------------------------------------------------------------------------------------
// componer (hojas de control)

/** Pega un sprite (alfa normal) con su ancla en (x, y) de un raster opaco. */
export function pegar(dst: Raster, r: Render, x: number, y: number): void {
  const ox = Math.round(x - r.ancla[0]), oy = Math.round(y - r.ancla[1]);
  for (let j = 0; j < r.img.h; j++) {
    const Y = oy + j; if (Y < 0 || Y >= dst.h) continue;
    for (let i = 0; i < r.img.w; i++) {
      const X = ox + i; if (X < 0 || X >= dst.w) continue;
      const s = (j * r.img.w + i) * 4, a = r.img.data[s + 3] / 255; if (!a) continue;
      const d = (Y * dst.w + X) * 4;
      dst.data[d] += (r.img.data[s] - dst.data[d]) * a; dst.data[d + 1] += (r.img.data[s + 1] - dst.data[d + 1]) * a; dst.data[d + 2] += (r.img.data[s + 2] - dst.data[d + 2]) * a;
    }
  }
}

let tmp = new Uint8ClampedArray(0);
/**
 * Dibuja un fuego de Doom sobre un raster opaco como lo haría el juego: el humo con alfa normal y la llama sumando luz
 * (o con alfa si la paleta es oscura), con el pie de la grilla en (x, y).
 */
export function dibujarFuego(dst: Raster, f: D.Fuego, x: number, y: number, escala: number, o: { filtro?: number; trama?: boolean; alfa?: number } = {}): void {
  const [pw, ph] = D.tamanoPintado(f, escala), [px, py] = D.pieFuego(f, escala);
  if (tmp.length < pw * ph * 4) tmp = new Uint8ClampedArray(pw * ph * 4);
  const ox = Math.round(x - px), oy = Math.round(y - py);
  const sumar = f.paleta.mezcla === 'sumar';
  for (const capa of sumar ? (['humo', 'llama'] as const) : (['todo'] as const)) {
    D.pintar(f, tmp, pw, ph, escala, { capa, filtro: o.filtro ?? 0.5, trama: o.trama, alfa: o.alfa });
    const aditiva = capa === 'llama';
    for (let j = 0; j < ph; j++) {
      const Y = oy + j; if (Y < 0 || Y >= dst.h) continue;
      for (let i = 0; i < pw; i++) {
        const X = ox + i; if (X < 0 || X >= dst.w) continue;
        const s = (j * pw + i) * 4, a = tmp[s + 3] / 255; if (a <= 0) continue;
        const d = (Y * dst.w + X) * 4;
        if (aditiva) { dst.data[d] += tmp[s] * a; dst.data[d + 1] += tmp[s + 1] * a; dst.data[d + 2] += tmp[s + 2] * a; }
        else { dst.data[d] += (tmp[s] - dst.data[d]) * a; dst.data[d + 1] += (tmp[s + 1] - dst.data[d + 1]) * a; dst.data[d + 2] += (tmp[s + 2] - dst.data[d + 2]) * a; }
      }
    }
  }
}

/** Luz de un fuego sobre lo pintado (como las luces del juego): multiplica y suma un tinte que cae con la distancia. */
export function alumbrar(dst: Raster, x: number, y: number, r: number, color: string, k: number): void {
  const c = [parseInt(color.slice(1, 3), 16) / 255, parseInt(color.slice(3, 5), 16) / 255, parseInt(color.slice(5, 7), 16) / 255];
  const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(dst.w - 1, Math.ceil(x + r)), y0 = Math.max(0, Math.floor(y - r / 2)), y1 = Math.min(dst.h - 1, Math.ceil(y + r / 2));
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
    const q = Math.hypot((i - x) / r, ((j - y) * 2) / r); if (q >= 1) continue;
    const f = (1 - q) * (1 - q) * k, d = (j * dst.w + i) * 4;
    for (let ch = 0; ch < 3; ch++) dst.data[d + ch] += dst.data[d + ch] * c[ch] * f * 1.4 + c[ch] * 18 * f;
  }
}

/** Raster opaco relleno con baldosas de un piso (fondo de las hojas). */
export function fondoPiso(w: number, h: number, piso: (bx: number, by: number) => Raster, oscuro = 0.55): Raster {
  const R = createRaster(w, h);
  for (let i = 0; i < w * h; i++) { R.data[i * 4] = 8; R.data[i * 4 + 1] = 7; R.data[i * 4 + 2] = 8; R.data[i * 4 + 3] = 255; }
  for (let by = -1; by < h / 40 + 2; by++) for (let bx = -1; bx < w / 160 + 2; bx++) {
    const t = piso(bx, by), cx = bx * 160 + (by & 1 ? 80 : 0), cy = by * 40;
    for (let j = 0; j < t.h; j++) for (let i = 0; i < t.w; i++) {
      const X = cx + i - t.w / 2, Y = cy + j - t.h / 2; if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      const s = (j * t.w + i) * 4, a = t.data[s + 3] / 255; if (!a) continue;
      const d = (Y * w + X) * 4;
      for (let ch = 0; ch < 3; ch++) R.data[d + ch] += (t.data[s + ch] * oscuro - R.data[d + ch]) * a;
    }
  }
  return R;
}
