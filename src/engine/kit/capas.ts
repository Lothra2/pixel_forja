import { createRaster, blit, type Raster } from '../core/raster';
import { renderClip, EIGHT_VIEWS, hasAnim, type RenderedClip } from '../render/clip';
import type { HumanFicha } from '../sheet/ficha';
import { WEAPON_KINDS, OFFHAND_KINDS } from '../rig/pose';
import { ARMOR_EVOLUTION, ARMOR_LINES, ARMOR_TIERS } from '../loot/armor';
import { applyArmorTier } from '../rpg/presets';

/**
 * Capas de equipo de una heroína (el muñeco de papel de un Diablo). La hoja base va sin arma ni mano libre; cada capa
 * guarda solo los pixeles que cambian cuando se pone una pieza: el arma por tipo, la mano libre, la armadura del pecho
 * (línea y nivel) y el casco. El juego las apila encima de la base, cuadro a cuadro, en este orden: pecho, casco,
 * arma, mano. Así se ve todo lo que se pone sin hornear cada combinación.
 *
 * Una capa se arma comparando la heroína sin la pieza y con la pieza, con la misma pose y el mismo encuadre (el
 * encuadre lo decide el cuerpo, no el arma). Donde la pieza tapa menos que el cuerpo de base (una túnica sobre una
 * falda más ancha) el pixel de base quedaría a la vista: se pinta con el color vecino de la pieza.
 */

export type TipoCapa = 'pecho' | 'casco' | 'arma' | 'mano';
export const ORDEN_CAPAS: TipoCapa[] = ['pecho', 'casco', 'arma', 'mano'];

/** Sube esto si cambia cómo se arman las capas (invalida la caché) */
export const CAPAS_VERSION = 1;

export interface Variante {
  tipo: TipoCapa;
  clave: string;
  ficha: HumanFicha;
}

/** La heroína sin arma ni mano libre (con los colores de su brillo y su escudo, que usan las capas) */
export function sinEquipo(f: HumanFicha): HumanFicha {
  return { ...f, gear: { ...(f.gear ?? {}), main: null, off: null, mainLoot: null, offLoot: null } };
}

/** Todas las piezas que se pueden ver puestas, cada una sobre la heroína sin equipo */
export function variantes(f: HumanFicha): Variante[] {
  const base = sinEquipo(f);
  const out: Variante[] = [];
  for (const k of WEAPON_KINDS) out.push({ tipo: 'arma', clave: k, ficha: { ...base, gear: { ...base.gear, main: k } } });
  for (const k of OFFHAND_KINDS) out.push({ tipo: 'mano', clave: k, ficha: { ...base, gear: { ...base.gear, off: k } } });
  for (const line of ARMOR_LINES) for (const tier of ARMOR_TIERS) {
    // la armadura del pecho no le quita lo que lleva en la cabeza (la vincha de Sophie): eso es del casco
    const pecho = applyArmorTier(base, line, tier, false);
    out.push({ tipo: 'pecho', clave: `${line}_${tier}`, ficha: base.avatar && pecho.avatar ? { ...pecho, avatar: { ...pecho.avatar, lpc: base.avatar.lpc } } : pecho });
    // el casco solo: el sombrero LPC del nivel, sin tocar la ropa
    if (!ARMOR_EVOLUTION[line][tier - 1].helm || !base.avatar?.lpc) continue;
    const lpc = applyArmorTier(base, line, tier, true).avatar!.lpc!;
    out.push({ tipo: 'casco', clave: `${line}_${tier}`, ficha: { ...base, avatar: { ...base.avatar!, kit: 'lpc', lpc: { ...base.avatar!.lpc!, hat: lpc.hat, hatColor: lpc.hatColor } } } });
  }
  return out;
}

/** Los cuadros de la base, para no volver a dibujarlos por cada pieza */
export type ClipsBase = Map<string, RenderedClip>;

export function clipsBase(f: HumanFicha, anims: string[], cell: 48 | 64 = 48): ClipsBase {
  const base = sinEquipo(f);
  const m: ClipsBase = new Map();
  for (const a of anims) {
    if (!hasAnim(base, a)) continue;
    for (const v of EIGHT_VIEWS) m.set(`${a}|${v}`, renderClip(base, cell, a, v, { props: true }));
  }
  return m;
}

/** Un cuadro de capa: lo que cambia de la base a la variante */
export function diferencia(base: Raster, variante: Raster): { r: Raster; pixeles: number; tapados: number } {
  const { w, h } = base;
  const r = createRaster(w, h);
  const A = base.data, B = variante.data, R = r.data;
  let pixeles = 0, tapados = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = (y * w + x) * 4;
    const oa = A[p + 3] > 0, ob = B[p + 3] > 0;
    if (ob) {
      if (oa && A[p] === B[p] && A[p + 1] === B[p + 1] && A[p + 2] === B[p + 2] && A[p + 3] === B[p + 3]) continue;
      R[p] = B[p]; R[p + 1] = B[p + 1]; R[p + 2] = B[p + 2]; R[p + 3] = B[p + 3];
      pixeles++;
    } else if (oa) {
      // la pieza deja a la vista un pixel de la base: se tapa con el vecino más cercano de la variante
      let hecho = false;
      for (let rad = 1; rad <= 2 && !hecho; rad++) {
        for (let dy = -rad; dy <= rad && !hecho; dy++) for (let dx = -rad; dx <= rad && !hecho; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = (ny * w + nx) * 4;
          if (B[q + 3] === 0) continue;
          R[p] = B[q]; R[p + 1] = B[q + 1]; R[p + 2] = B[q + 2]; R[p + 3] = 255;
          hecho = true;
        }
      }
      if (hecho) { pixeles++; tapados++; }
    }
  }
  return { r, pixeles, tapados };
}

export interface BloqueCapa { x: number; y: number; cuadros: number }
export interface HojaCapa { png: Raster; columnas: number; bloques: Record<string, BloqueCapa>; pixeles: number; tapados: number }

/**
 * La hoja de una capa: cada animación es un bloque de 8 filas (una por dirección, en el orden de siempre) y una
 * columna por cuadro. Los bloques van de a 3 por fila de la hoja para no pasar de 4096 px.
 * Devuelve null si la pieza no cambia nada.
 */
export function hojaCapa(base: ClipsBase, variante: HumanFicha, anims: string[], cell: 48 | 64 = 48): HojaCapa | null {
  const lista = anims.filter((a) => base.has(`${a}|${EIGHT_VIEWS[0]}`));
  const cuadros = new Map<string, Raster[][]>();
  let maxF = 1, pixeles = 0, tapados = 0;
  for (const a of lista) {
    const filas: Raster[][] = [];
    for (const v of EIGHT_VIEWS) {
      const b = base.get(`${a}|${v}`)!;
      const c = renderClip(variante, cell, a, v, { props: true });
      const n = Math.min(b.frames.length, c.frames.length);
      const fila: Raster[] = [];
      for (let i = 0; i < n; i++) {
        const d = diferencia(b.frames[i], c.frames[i]);
        pixeles += d.pixeles;
        tapados += d.tapados;
        fila.push(d.r);
      }
      filas.push(fila);
      maxF = Math.max(maxF, b.frames.length);
    }
    cuadros.set(a, filas);
  }
  if (pixeles === 0) return null;
  const porFila = 3;
  const columnas = porFila * maxF;
  const filasHoja = Math.ceil(lista.length / porFila) * 8;
  const png = createRaster(columnas * cell, filasHoja * cell);
  const bloques: Record<string, BloqueCapa> = {};
  lista.forEach((a, k) => {
    const bx = (k % porFila) * maxF;
    const by = Math.floor(k / porFila) * 8;
    const filas = cuadros.get(a)!;
    bloques[a] = { x: bx, y: by, cuadros: filas[0].length };
    filas.forEach((fila, dir) => fila.forEach((fr, i) => blit(png, fr, (bx + i) * cell, (by + dir) * cell)));
  });
  return { png, columnas, bloques, pixeles, tapados };
}

/** Huella corta de un texto (FNV-1a de 64 bits en dos mitades), para la caché de capas */
export function huella(s: string): string {
  let a = 0x811c9dc5, b = 0xcbf29ce4;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x01000193 ^ 0x5bd1e995) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

/** Qué capa se ve con un objeto del botín: el arma o la mano libre por su dibujo, y la armadura del pecho y el casco por línea y nivel */
export function capaDeObjeto(item: { base: { cat: string; icon?: string; slot?: string; line?: string; tier?: number } }, mano: { main?: string; off?: string } | null): { capa: TipoCapa; clave: string } | null {
  if (item.base.cat === 'weapon' && mano?.main) return { capa: 'arma', clave: mano.main };
  if (item.base.cat === 'offhand' && mano?.off) return { capa: 'mano', clave: mano.off };
  if (item.base.cat === 'armor' && item.base.line && item.base.tier) {
    const clave = `${item.base.line}_${item.base.tier}`;
    if (item.base.slot === 'chest') return { capa: 'pecho', clave };
    if (item.base.slot === 'helm' && ARMOR_EVOLUTION[item.base.line as keyof typeof ARMOR_EVOLUTION]?.[item.base.tier - 1]?.helm) return { capa: 'casco', clave };
  }
  return null;
}
