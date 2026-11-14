import { rng } from '../core/rng';
import { claveBaja } from './clave_baja';
import { pintarEscena, medirEscena, calidad, girarPiezas, masa, hueso, type Comp, type Escena, type Pieza, type Render, type Ambiente, type V3, caja, cilindro, elipsoide, esfera, palo, poliedro } from './render';

/**
 * Cómo se define un asset del taller gótico: una función que arma las piezas 3D para una variante, un cuadro de
 * animación y una semilla. El catálogo se arma por temas (campamento, cementerio, cueva, templo...), cada objeto
 * dice qué celdas de juego pisa (huella en celdas de 32×16) y si bloquea el paso o la vista.
 */
export type Tema =
  | 'campamento' | 'campo' | 'cementerio' | 'cueva' | 'monasterio' | 'catacumbas' | 'pueblo' | 'desierto' | 'tumba' | 'cloaca'
  | 'selva' | 'templo_selva' | 'infierno' | 'nieve' | 'hielo' | 'fortaleza' | 'arcano' | 'comun' | 'armas' | 'muebles' | 'arboles' | 'casas'
  | 'personajes' | 'monstruos' | 'misterio' | 'mina' | 'abismo' | 'cripta' | 'paramo' | 'ahogada' | 'celestial';

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
  ['mina', 'Minas', 'Mines'], ['abismo', 'El abismo', 'The abyss'], ['cripta', 'Criptas', 'Crypts'], ['paramo', 'Páramo', 'Moor'],
  ['ahogada', 'La Ciudad Ahogada', 'The Drowned City'], ['celestial', 'El Cielo Roto', 'The Broken Sky'],
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
  /**
   * Pintor propio por pixel (agua, suelos, portales): si está, `pintarObjeto` lo usa en lugar de pintar las piezas de
   * `armar` (que queda para las cinemáticas, el mapa y la luz). Todos los cuadros salen del mismo tamaño y ancla.
   */
  pintar?: (v: string, f: number, seed: number) => Render;
}

/** Herramientas que recibe cada armado: las piezas y un azar con semilla. */
export interface Arma { r: () => number; seed: number; caja: typeof caja; cilindro: typeof cilindro; elipsoide: typeof elipsoide; esfera: typeof esfera; palo: typeof palo; poliedro: typeof poliedro }
export const herramientas = (seed: number): Arma => ({ r: rng(seed * 7919 + 13), seed, caja, cilindro, elipsoide, esfera, palo, poliedro });
export type { V3, Pieza };

const cache = new Map<string, Render>();
export const REGISTRO: ObjetoDef[] = [];
export function registrar(...defs: ObjetoDef[]) { for (const d of defs) { if (!REGISTRO.some((x) => x.id === d.id)) REGISTRO.push(conEscala(conClaveBaja(d))); } }
/**
 * Personajes y monstruos (héroes, bestias, jefes, Thor) se pintan en clave baja (clave_baja.ts): su armado devuelve
 * siempre una escena con su `luz`, así cualquiera que lo pinte (el catálogo, el horneado del juego) la recibe.
 */
/**
 * Las edificaciones a escala de la gente: casas, chozas, carpas y pabellones salían con puertas más bajas que una persona.
 * Se agrandan enteras (piezas y huella) al registrarlas, sin tocar cada armado.
 */
const ESCALA_OBRA: [RegExp, number][] = [[/^casa_/, 1.55], [/^camp_(carpa|carpa_grande|pabellon)$/, 1.5], [/^pue_(casa_en_llamas|casa_calcinada|ruina_derrumbada|puesto)$/, 1.5]];
function escalarPiezas(ps: Pieza[], s: number): Pieza[] {
  const P = (v: V3): V3 => [v[0] * s, v[1] * s, v[2] * s];
  return ps.map((p): Pieza => {
    if (p.k === 'conv') return { ...p, planos: p.planos.map(([n, d]) => [n, d * s] as [V3, number]), pts: p.pts.map(P) };
    if (p.k === 'cono') return { ...p, o: P(p.o), h: p.h * s, r0: p.r0 * s, r1: p.r1 * s };
    if (p.k === 'elip') return { ...p, c: P(p.c), r: P(p.r) };
    const comps = p.comps.map((q): Comp => (q.f === 'hueso'
      ? hueso(P(q.a), P(q.b), q.r0 * s, q.r1 * s, { mat: q.mat, tono: q.tono, k: q.k === undefined ? undefined : q.k * s })
      : { ...q, c: P(q.c), sc: P(q.sc), sr: q.sr * s, r: P(q.r), k: q.k === undefined ? undefined : q.k * s }));
    return masa(comps, { mat: p.mat, tono: p.tono, suave: p.suave * s });
  });
}
function conEscala(d: ObjetoDef): ObjetoDef {
  const s = ESCALA_OBRA.find(([re]) => re.test(d.id))?.[1]; if (!s) return d;
  const base = d.armar, H = (h: [number, number]): [number, number] => [Math.round(h[0] * s), Math.round(h[1] * s)];
  d.armar = (v, f, a) => { const r = base(v, f, a); return Array.isArray(r) ? escalarPiezas(r, s) : { ...r, piezas: escalarPiezas(r.piezas, s) }; };
  if (d.huella) d.huella = H(d.huella);
  if (d.huellaPor) for (const k of Object.keys(d.huellaPor)) d.huellaPor[k] = H(d.huellaPor[k]);
  return d;
}
function conClaveBaja(d: ObjetoDef): ObjetoDef {
  if (d.tema !== 'personajes' && d.tema !== 'monstruos') return d;
  const base = d.armar;
  d.armar = (v, f, a) => { const r = base(v, f, a); const e: Escena = Array.isArray(r) ? { piezas: r } : r; return e.luz ? e : { ...e, luz: claveBaja(e.piezas) }; };
  return d;
}
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
  if (d.pintar) { r = d.pintar(vv, f, seed); cache.set(k, r); return r; }
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
  if ((d.cuadros ?? 1) === 1 || d.pintar) return pintarObjeto(id, vv, d.pintar ? f : 0, seed, amb);
  const k = `cuadro|${id}|${vv}|${f}|${seed}|${amb ? JSON.stringify(amb) : ''}|${calidad()}`;
  let r = cache.get(k);
  if (!r) { const a = d.armar(vv, f, herramientas(seed)); r = pintarEscena(Array.isArray(a) ? { piezas: a, sinSombra: d.plano } : { sinSombra: d.plano, ...a }, amb); cache.set(k, r); }
  return r;
}

/** Variantes que ya unen los dos ejes (los codos): no se giran ni llevan su `_y`. */
export const esCodo = (v: string) => v.startsWith('codo_');
/**
 * Agrega a un objeto ya registrado las variantes que corren a lo largo de y (<variante>_y): la misma pieza girada
 * 90 grados, con la huella girada sola por el sufijo. Los codos quedan sin girar y al final de la lista, así las
 * variantes de antes conservan su lugar.
 */
export function conVarianteY(...ids: string[]) {
  for (const id of ids) {
    const d = REGISTRO.find((x) => x.id === id);
    if (!d || d.variantes.some((v) => v.endsWith('_y'))) continue;
    const base = d.armar, vs = d.variantes.filter((v) => !esCodo(v)), codos = d.variantes.filter(esCodo);
    d.variantes = [...vs, ...vs.map((v) => v + '_y'), ...codos];
    d.armar = (v, f, a) => {
      if (!v.endsWith('_y')) return base(v, f, a);
      const r = base(v.slice(0, -2), f, a);
      if (Array.isArray(r)) return girarPiezas(r, 90);
      const res = r.resplandor ? { ...r.resplandor, c: [-r.resplandor.c[1], r.resplandor.c[0], r.resplandor.c[2]] as V3 } : undefined;
      return { ...r, piezas: girarPiezas(r.piezas, 90), resplandor: res };
    };
  }
}

/**
 * Codo de una baldosa de 80×80 (ríos, vías): el centro del arco va en una esquina y el arco, de radio 40, une los
 * puntos medios de dos lados. `codo_n` une -x con -y, `codo_e` +x con -y, `codo_s` +x con +y y `codo_o` -x con +y.
 * El recorrido va río abajo (de norte a sur): entra por -y en n y e, y en s y o entra por el lado x y sale por +y.
 * `en(t)` (t de 0 a 1) da el punto, la tangente río abajo y la normal a su izquierda.
 */
export function codoArco(v: string, R = 40) {
  const k = v.replace(/^codo_/, '');
  const [c, ent, sal] = ({ n: [[-1, -1], [0, -1], [-1, 0]], e: [[1, -1], [0, -1], [1, 0]], s: [[1, 1], [1, 0], [0, 1]], o: [[-1, 1], [-1, 0], [0, 1]] } as Record<string, [number, number][]>)[k] ?? [[-1, -1], [0, -1], [-1, 0]];
  const cx = c[0] * R, cy = c[1] * R, a0 = Math.atan2(ent[1] * R - cy, ent[0] * R - cx);
  let d = Math.atan2(sal[1] * R - cy, sal[0] * R - cx) - a0;
  if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
  const sg = Math.sign(d);
  const en = (t: number) => {
    const an = a0 + d * t, dx = -Math.sin(an) * sg, dy = Math.cos(an) * sg;
    return { p: [cx + Math.cos(an) * R, cy + Math.sin(an) * R] as [number, number], d: [dx, dy] as [number, number], l: [-dy, dx] as [number, number] };
  };
  return { centro: [cx, cy] as [number, number], R, largo: Math.abs(d) * R, en };
}
