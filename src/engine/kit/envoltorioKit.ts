import type { Raster } from '../core/raster';
import { renderClip } from '../render/clip';
import type { HumanFicha } from '../sheet/ficha';
import { textMask } from '../ui/fonts';
import type { UiPiece } from '../ui/retro';
import {
  medallas, banderas, podio, iconosPrueba, tarjetas, marcoVs4, pantallaRetro, BANDERAS, iniciales,
  type Bandera, type EquipoTarjeta, type EscudoDef, type FiguraDe, type Glifos,
} from '../ui/envoltorio';
import { halve } from './portraits';
import { mapaMundo, rutaMundo, mapaRegion, sellos, LUGARES, PAISES_GIRA, type Lugar, type PaisGira } from '../ui/gira';

/** Las partes del envoltorio (lote G2) que se piden en `ui.interfaz`. */
export const PARTES_ENVOLTORIO = ['medallas', 'podio', 'iconos', 'banderas', 'tarjetas', 'marco_vs', 'pantallas', 'mapa'] as const;
export type ParteEnvoltorio = (typeof PARTES_ENVOLTORIO)[number];

/** Un equipo como lo trae el archivo de equipos (solo lo que usa el envoltorio). */
export interface EquipoEnvoltorio { nombre: string; atletas: string[]; colores?: string[]; pais?: unknown; bandera?: unknown; escudo?: unknown }

/** Texto con la fuente gruesa, del tamaño más grande que no pasa de `alto`. */
export function glifosDe(bold: ArrayBuffer): Glifos {
  return (texto, alto) => {
    let m = textMask(bold, texto, 1);
    for (let k = 2; k <= 16; k++) { const n = textMask(bold, texto, k); if (n.h > alto) break; m = n; }
    return m;
  };
}

/** La bandera de un equipo: la suya (`bandera`) o la de su país (`pais`), si el motor la tiene. */
export function banderaDe(t: EquipoEnvoltorio): Bandera | undefined {
  for (const v of [t.bandera, t.pais]) if (typeof v === 'string' && (BANDERAS as readonly string[]).includes(v)) return v as Bandera;
  return undefined;
}

/**
 * El sprite de un atleta para los íconos: los atletas del kit en el orden de los equipos (para variar de ícono en
 * ícono), de lado, a celda 32, con implementos. 'mejor' es el cuadro más abierto que cabe en `max` x `max`.
 */
export function figuraDe(atletas: HumanFicha[]): FiguraDe {
  const caja = (r: Raster) => {
    let x0 = r.w, x1 = -1, y0 = r.h, y1 = -1;
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.data[(y * r.w + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return [x1 - x0 + 1, y1 - y0 + 1];
  };
  return (anim, cuadro, n, max) => {
    const f = atletas[n % atletas.length];
    const c = renderClip({ ...f, movementProfile: 'premium' }, 32, anim, 'side', { props: true });
    if (typeof cuadro === 'number') return { r: c.frames[Math.min(cuadro, c.frames.length - 1)], cuadro };
    let k = 0, best = -1;
    c.frames.forEach((fr, i) => { const [w, h] = caja(fr); if (w > max || h > max) return; const s = w * 1.5 + h; if (s > best) { best = s; k = i; } });
    return { r: c.frames[k], cuadro: k };
  };
}

/** Las piezas del envoltorio pedidas. */
export function piezasEnvoltorio(partes: readonly string[], o: { bold: ArrayBuffer; atletas: HumanFicha[]; equipos?: Record<string, EquipoEnvoltorio>; paradas?: readonly Lugar[] }): UiPiece[] {
  const want = new Set(partes);
  const glifos = glifosDe(o.bold);
  const out: UiPiece[] = [];
  if (want.has('medallas')) out.push(...medallas());
  if (want.has('banderas')) out.push(...banderas());
  if (want.has('podio')) out.push(podio(glifos));
  if (want.has('iconos') && o.atletas.length) out.push(...iconosPrueba(figuraDe(o.atletas), halve));
  if (want.has('tarjetas') && o.equipos) {
    const lista: EquipoTarjeta[] = Object.entries(o.equipos).map(([id, t]) => ({
      id, nombre: t.nombre, colores: Array.isArray(t.colores) && t.colores.length ? (t.colores as string[]) : ['#2a5bd7', '#f2c230'],
      bandera: banderaDe(t), escudo: (t.escudo as EscudoDef | undefined) ?? { emblema: 'letras', texto: iniciales(t.nombre) },
    }));
    out.push(...tarjetas(lista, glifos));
  }
  if (want.has('marco_vs')) out.push(marcoVs4());
  if (want.has('mapa')) {
    // el mapa de la gira: resalta los países de las paradas, y la ruta va si hay al menos dos
    const paradas = o.paradas ?? [];
    const paises = [...new Set(paradas.map((p) => LUGARES[p].pais))].filter((p): p is PaisGira => (PAISES_GIRA as readonly string[]).includes(p));
    out.push(mapaMundo(paises));
    if (paradas.length >= 2) out.push(rutaMundo(paradas));
    out.push(mapaRegion('vietnam'), mapaRegion('colombia_venezuela'), sellos());
  }
  if (want.has('pantallas')) out.push(pantallaRetro('pausa'), pantallaRetro('se_acabo'), pantallaRetro('otra_partidita'));
  return out;
}
