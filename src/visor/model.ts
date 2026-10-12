/**
 * Lo que el visor entiende de un kit, leído como lo leería un juego: solo manifest.json y los atlas. No importa nada
 * del motor. Sirve para el kit a medida (atlas por pack) y para el kit deportivo de siempre (una tira por animación).
 */

export type Pt = [number, number];
export interface Rect { image: string; x: number; y: number; w: number; h: number }
export interface VAnim { name: string; cuadros: number; fps: number; loop: boolean; raw: Record<string, any> }
export interface VPack { name: string; anims: Record<string, VAnim>; atlas?: string }
export interface VChar { id: string; nombre: string; tipo: 'atleta' | 'animal'; equipo?: string; celda: number; pivote: Pt; packs: Record<string, VPack>; numero?: string }
export interface VTeam { nombre: string; colores?: string[] }
export interface VKit { juego: string; filas: string[]; chars: VChar[]; equipos: Record<string, VTeam>; objetos: Record<string, { atlas: string; anims?: Record<string, number> }>; pruebas?: Record<string, string[]> }
/** JSON Hash de TexturePacker */
export interface Atlas { frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>; meta?: { image?: string } }

const anim = (name: string, a: Record<string, any>): VAnim => ({ name, cuadros: a.cuadros, fps: a.fps, loop: !!a.loop, raw: a });
const animsOf = (o: Record<string, any> = {}) => Object.fromEntries(Object.entries(o).map(([n, a]) => [n, anim(n, a)]));

export function readManifest(m: Record<string, any>): VKit {
  if (m?.generado_con !== 'PixelForja') throw new Error('Esto no es un kit de PixelForja (manifest.json sin generado_con)');
  const filas: string[] = m.filas ?? m.direcciones;
  if (!Array.isArray(filas) || !filas.length) throw new Error('El manifiesto no dice las filas de las hojas');
  const chars: VChar[] = [];
  for (const [id, a] of Object.entries<any>(m.atletas ?? {})) {
    const celda = a.celda ?? m.celda;
    const packs: Record<string, VPack> = {};
    // kit a medida o deportivo con atlas: un atlas por pack
    for (const [p, pk] of Object.entries<any>(a.packs ?? {})) packs[p] = { name: p, atlas: pk.atlas, anims: animsOf(pk.anims) };
    // kit deportivo de tiras: una hoja por animación
    for (const [p, list] of Object.entries<any>(a.deportes ?? {})) packs[p] ??= { name: p, anims: animsOf(list) };
    chars.push({ id, nombre: a.nombre ?? id, tipo: 'atleta', equipo: a.equipo, celda, pivote: a.pivote ?? m.pivote ?? [celda / 2, celda - 2], packs, numero: a.numero });
  }
  for (const [id, a] of Object.entries<any>(m.animales ?? {})) {
    const celda = a.celda ?? m.celda;
    chars.push({ id, nombre: a.nombre ?? id, tipo: 'animal', celda, pivote: a.pivote ?? [celda / 2, celda - 2], packs: { animal: { name: 'animal', atlas: a.atlas, anims: animsOf(a.anims) } } });
  }
  if (!chars.length) throw new Error('El kit no trae atletas ni animales');
  return { juego: m.juego ?? m.tipo ?? 'kit', filas, chars, equipos: m.equipos ?? {}, objetos: m.objetos ?? {}, pruebas: m.pruebas };
}

/** La imagen del atlas: la que dice su meta, en la misma carpeta. */
export const atlasImage = (atlasPath: string, atlas: Atlas) => atlasPath.replace(/[^/]+$/, atlas.meta?.image ?? atlasPath.replace(/^.*\//, '').replace(/\.json$/, '.png'));

/** Dónde está el cuadro k de la fila r: en el atlas (<anim>_<fila>_<k>) o en la tira (fila = fila, columna = cuadro). */
export function frameRect(kit: VKit, c: VChar, pack: VPack, a: VAnim, row: number, k: number, atlas?: Atlas): Rect | null {
  if (pack.atlas) {
    const f = atlas?.frames[`${a.name}_${kit.filas[row]}_${k}`];
    return f ? { image: atlasImage(pack.atlas, atlas!), ...f.frame } : null;
  }
  return a.raw.archivo ? { image: a.raw.archivo, x: k * c.celda, y: row * c.celda, w: c.celda, h: c.celda } : null;
}

/** Los datos por cuadro que trae una animación, en el orden en que se dibujan. */
export const OVERLAYS = ['cajas', 'cuerpo', 'manos', 'cabeza', 'pies', 'carga', 'arma', 'agua', 'eventos', 'pivote'] as const;
export type Overlay = (typeof OVERLAYS)[number];
export function overlaysOf(a: VAnim): Overlay[] {
  return OVERLAYS.filter((o) => o === 'pivote' || (o === 'eventos' ? !!a.raw.eventos?.length : Array.isArray(a.raw[o]) && a.raw[o].some((x: unknown) => x != null)));
}
