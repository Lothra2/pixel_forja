import { rng } from '../core/rng';
import { pintarEscena, medirEscena, calidad, type Escena, type Pieza, type Render, type Ambiente, type V3, caja, cilindro, elipsoide, esfera, palo, poliedro } from './render';

/**
 * Cómo se define un asset del taller gótico: una función que arma las piezas 3D para una variante, un cuadro de
 * animación y una semilla. El catálogo se arma por temas (campamento, cementerio, cueva, templo...), cada objeto
 * dice qué celdas de juego pisa (huella en celdas de 32×16) y si bloquea el paso o la vista.
 */
export type Tema =
  | 'campamento' | 'campo' | 'cementerio' | 'cueva' | 'monasterio' | 'catacumbas' | 'pueblo' | 'desierto' | 'tumba' | 'cloaca'
  | 'selva' | 'templo_selva' | 'infierno' | 'nieve' | 'hielo' | 'fortaleza' | 'arcano' | 'comun' | 'armas' | 'muebles' | 'arboles' | 'casas'
  | 'personajes' | 'monstruos' | 'misterio';

export const TEMAS: [Tema, string, string][] = [
  ['personajes', 'Personajes (8 direcciones)', 'Characters (8 directions)'], ['monstruos', 'Monstruos (8 direcciones)', 'Monsters (8 directions)'],
  ['misterio', 'Misterio y terror', 'Mystery & horror'],
  ['comun', 'Lo de siempre (cofres, portales, pozos)', 'Shared (chests, portals, wells)'],
  ['campamento', 'Campamento', 'Encampment'], ['campo', 'Campo y páramo', 'Wilderness'], ['arboles', 'Árboles y plantas', 'Trees & plants'],
  ['casas', 'Casas y edificios', 'Houses & buildings'], ['pueblo', 'Pueblo en ruinas', 'Ruined village'], ['muebles', 'Muebles y mesas', 'Furniture & tables'],
  ['armas', 'Armas y armaduras', 'Weapons & armor'], ['cementerio', 'Cementerio y criptas', 'Graveyard & crypts'], ['cueva', 'Cuevas', 'Caves'],
  ['monasterio', 'Monasterio y catedral', 'Monastery & cathedral'], ['catacumbas', 'Catacumbas y cárcel', 'Catacombs & jail'],
  ['desierto', 'Desierto', 'Desert'], ['tumba', 'Tumbas del desierto', 'Desert tombs'], ['cloaca', 'Cloacas', 'Sewers'], ['arcano', 'Santuario arcano', 'Arcane sanctuary'],
  ['selva', 'Selva y pantano', 'Jungle & marsh'], ['templo_selva', 'Templos de la selva', 'Jungle temples'],
  ['infierno', 'Infierno', 'Hell'], ['fortaleza', 'Fortaleza del cielo', 'Heavenly fortress'], ['nieve', 'Montaña nevada', 'Snowy mountain'], ['hielo', 'Cuevas de hielo', 'Ice caves'],
];

export interface ObjetoDef {
  id: string;
  nombre: [string, string];
  tema: Tema;
  variantes: string[];
  /** Cuadros de animación (1 = quieto) y ticks por cuadro a 25 cuadros por segundo. */
  cuadros?: number;
  t?: number;
  /** Celdas de juego que pisa (ancho, fondo) y si tapa el paso. */
  huella?: [number, number];
  /** Huella propia de alguna variante (si no está, la de una variante del eje y es la huella girada). */
  huellaPor?: Record<string, [number, number]>;
  bloquea?: boolean;
  /** Para los pisos y lo que va pegado al piso: sin sombra. */
  plano?: boolean;
  armar: (v: string, f: number, a: Arma) => Pieza[] | Escena;
}

/** Herramientas que recibe cada armado: las piezas y un azar con semilla. */
export interface Arma { r: () => number; seed: number; caja: typeof caja; cilindro: typeof cilindro; elipsoide: typeof elipsoide; esfera: typeof esfera; palo: typeof palo; poliedro: typeof poliedro }
export const herramientas = (seed: number): Arma => ({ r: rng(seed * 7919 + 13), seed, caja, cilindro, elipsoide, esfera, palo, poliedro });
export type { V3, Pieza };

const cache = new Map<string, Render>();
export const REGISTRO: ObjetoDef[] = [];
export function registrar(...defs: ObjetoDef[]) { for (const d of defs) { if (!REGISTRO.some((x) => x.id === d.id)) REGISTRO.push(d); } }
/** Las celdas que pisa una variante: la propia si la tiene; las variantes que corren a lo largo de y giran la huella. */
export function huellaDe(d: ObjetoDef, v: string): [number, number] {
  if (d.huellaPor?.[v]) return d.huellaPor[v];
  const h = d.huella ?? [1, 1];
  const ejeY = ['y', 'der', 'largo_y', 'lado'].some((t) => v === t || v.startsWith(t + '_') || v.endsWith('_' + t));
  return ejeY ? [h[1], h[0]] : h;
}
export const objeto = (id: string) => { const d = REGISTRO.find((x) => x.id === id); if (!d) throw new Error(`No hay objeto "${id}"`); return d; };

/** Pinta un objeto (con caché). Todos los cuadros de una animación salen del mismo tamaño y ancla. */
export function pintarObjeto(id: string, v?: string, f = 0, seed = 1, amb?: Ambiente): Render {
  const d = objeto(id);
  const vv = v ?? d.variantes[0];
  const q = calidad();
  const k = `${id}|${vv}|${f}|${seed}|${amb ? JSON.stringify(amb) : ''}|${q}`;
  let r = cache.get(k);
  if (r) return r;
  const escena = (ff: number): Escena => { const a = d.armar(vv, ff, herramientas(seed)); return Array.isArray(a) ? { piezas: a, sinSombra: d.plano } : { sinSombra: d.plano, ...a }; };
  const n = d.cuadros ?? 1;
  if (n > 1) {
    // tamaño común: el primero que salga más grande manda
    // tamaño común: se mide cada cuadro (sin pintarlo) y se pinta una sola vez cada uno
    const escenas = Array.from({ length: n }, (_, i) => escena(i));
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const e of escenas) { const q = medirEscena(e); if (!q) continue; x0 = Math.min(x0, q.x0); y0 = Math.min(y0, q.y0); x1 = Math.max(x1, q.x1); y1 = Math.max(y1, q.y1); }
    const fijo = { w: Math.ceil(x1 - x0) + 4, h: Math.ceil(y1 - y0) + 4, ax: Math.floor(-x0) + 2, ay: Math.floor(-y0) + 2 };
    escenas.forEach((e, i) => cache.set(`${id}|${vv}|${i}|${seed}|${amb ? JSON.stringify(amb) : ''}|${q}`, pintarEscena(e, amb, fijo)));
    return cache.get(k)!;
  }
  r = pintarEscena(escena(f), amb);
  cache.set(k, r);
  return r;
}
export const limpiarCache = () => cache.clear();
/** Un solo cuadro sin pintar el resto de la animación (para miniaturas): su tamaño es el propio, no el común. */
export function pintarCuadro(id: string, v?: string, f = 0, seed = 1, amb?: Ambiente): Render {
  const d = objeto(id);
  const vv = v ?? d.variantes[0];
  if ((d.cuadros ?? 1) === 1) return pintarObjeto(id, vv, 0, seed, amb);
  const k = `cuadro|${id}|${vv}|${f}|${seed}|${amb ? JSON.stringify(amb) : ''}|${calidad()}`;
  let r = cache.get(k);
  if (!r) { const a = d.armar(vv, f, herramientas(seed)); r = pintarEscena(Array.isArray(a) ? { piezas: a, sinSombra: d.plano } : { sinSombra: d.plano, ...a }, amb); cache.set(k, r); }
  return r;
}
