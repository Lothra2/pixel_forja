import { zipSync } from 'fflate';
import { createRaster, type Raster } from '../core/raster';
import { encodePngPaleta, encodePng } from '../export/png';
import type { ChibiLook, Talla } from './look';
import { medidas } from './metrics';
import { pintarClip, clipsDe } from './anim';
import type { Clip, Grupo } from './clips';
import { efecto, EFECTOS, sombraPiso } from './fx';

/**
 * El paquete para juegos: una hoja de sprites (una fila por animación), un manifest con tiempos, raíz,
 * cajas de golpe y de daño, efectos y sonidos por cuadro, las tiras de efectos y la sombra.
 * Sirve tal cual para Phaser, Godot, Unity o un canvas propio.
 */

export interface ArchivoPaquete { nombre: string; bytes: Uint8Array }

export interface ManifestChibi {
  formato: 'pixelforja-chibi';
  version: 1;
  nombre: string;
  talla: Talla;
  celda: [number, number];
  ancla: [number, number];
  ticks_por_segundo: 60;
  hoja: string;
  animaciones: Record<string, {
    nombre: [string, string]; grupo: Grupo; loop: boolean; fila: number; dir?: string;
    cuadros: { x: number; y: number; t: number; dx: number; dy: number; hurt: number[]; hit?: number[]; fx?: { id: string; x: number; y: number }; sonido?: string }[];
  }>;
  efectos: Record<string, { archivo: string; w: number; h: number; cuadros: number; t: number; loop: boolean; centro: [number, number]; vel?: number }>;
  sombra: string;
  look: ChibiLook;
}

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'chibi';

/** Hoja de sprites de un muñeco: todas sus animaciones (o las de los grupos pedidos). */
export function hojaChibi(look: ChibiLook, talla: Talla, grupos?: Grupo[]): { hoja: Raster; manifest: ManifestChibi } {
  const m = medidas(talla, look.contextura);
  const [cw, ch] = m.celda;
  const clips: Clip[] = clipsDe(look).filter((c) => !grupos || grupos.includes(c.grupo));
  const pintados = clips.map((c) => pintarClip(look, talla, c));
  const cols = Math.max(...pintados.map((p) => p.length));
  const hoja = createRaster(cols * cw, clips.length * ch);
  const animaciones: ManifestChibi['animaciones'] = {};
  clips.forEach((c, fila) => {
    animaciones[c.id] = {
      nombre: c.nombre, grupo: c.grupo, loop: c.loop, fila, ...(c.dir ? { dir: c.dir } : {}),
      cuadros: pintados[fila].map((q, i) => {
        const ox = i * cw, oy = fila * ch;
        for (let y = 0; y < ch; y++) hoja.data.set(q.img.data.subarray(y * cw * 4, (y + 1) * cw * 4), ((oy + y) * hoja.w + ox) * 4);
        return { x: ox, y: oy, t: q.t, dx: q.dx, dy: q.dy, hurt: q.hurt, ...(q.hit ? { hit: q.hit } : {}), ...(q.fx ? { fx: q.fx } : {}), ...(q.sonido ? { sonido: q.sonido } : {}) };
      }),
    };
  });
  const manifest: ManifestChibi = {
    formato: 'pixelforja-chibi', version: 1, nombre: look.nombre, talla, celda: [cw, ch], ancla: [Math.floor(cw / 2), m.piso], ticks_por_segundo: 60,
    hoja: 'sprites.png', animaciones, efectos: {}, sombra: 'sombra.png', look,
  };
  return { hoja, manifest };
}

/** Tira horizontal de cuadros de un efecto. */
function tira(frames: Raster[]): Raster {
  const w = frames[0].w, h = frames[0].h;
  const r = createRaster(w * frames.length, h);
  frames.forEach((f, i) => { for (let y = 0; y < h; y++) r.data.set(f.data.subarray(y * w * 4, (y + 1) * w * 4), (y * r.w + i * w) * 4); });
  return r;
}

/** El paquete completo de uno o varios muñecos, en zip. */
export function paqueteChibi(looks: ChibiLook[], tallas: Talla[], grupos?: Grupo[]): { zip: Uint8Array; archivos: ArchivoPaquete[] } {
  const archivos: ArchivoPaquete[] = [];
  const indice: { nombre: string; talla: Talla; carpeta: string }[] = [];
  const usados = new Set<string>();
  for (const look of looks) for (const talla of tallas) {
    let base = `${slug(look.nombre)}_${talla}`;
    for (let n = 2; usados.has(base); n++) base = `${slug(look.nombre)}_${n}_${talla}`;
    usados.add(base);
    const { hoja, manifest } = hojaChibi(look, talla, grupos);
    archivos.push({ nombre: `${base}/sprites.png`, bytes: encodePngPaleta(hoja) });
    for (const id of EFECTOS) {
      const e = efecto(id, look, talla);
      if (!e) continue;
      const nombre = `efectos/${id}.png`;
      archivos.push({ nombre: `${base}/${nombre}`, bytes: encodePng(tira(e.frames)) });
      manifest.efectos[id] = { archivo: nombre, w: e.frames[0].w, h: e.frames[0].h, cuadros: e.frames.length, t: e.t, loop: e.loop, centro: e.centro, ...(e.vel ? { vel: e.vel } : {}) };
    }
    archivos.push({ nombre: `${base}/sombra.png`, bytes: encodePng(sombraPiso(talla, look.especie === 'perro' ? 1.2 : 1)) });
    archivos.push({ nombre: `${base}/manifest.json`, bytes: new TextEncoder().encode(JSON.stringify(manifest, null, 1)) });
    indice.push({ nombre: look.nombre, talla, carpeta: base });
  }
  archivos.push({ nombre: 'indice.json', bytes: new TextEncoder().encode(JSON.stringify({ formato: 'pixelforja-chibi-paquete', version: 1, munecos: indice }, null, 1)) });
  archivos.push({ nombre: 'LEEME.txt', bytes: new TextEncoder().encode(LEEME) });
  const zip = zipSync(Object.fromEntries(archivos.map((a) => [a.nombre, a.bytes])), { level: 6 });
  return { zip, archivos };
}

const LEEME = `Paquete chibi de PixelForja

Cada carpeta es un muñeco a una talla (32 o 48 px de alto de personaje).
- sprites.png: una fila por animación, celdas del tamaño de manifest.celda.
- manifest.json: por animación, los cuadros con su posición en la hoja (x, y), cuánto duran (t, en ticks de 60 por segundo),
  cuánto avanza la raíz (dx) y a qué altura va del piso (dy). hurt es la caja que recibe golpes y hit la que pega
  (x, y, ancho, alto dentro de la celda). fx dice qué efecto soltar y dónde; sonido, qué sonido tocar.
- El ancla (manifest.ancla) es el punto del piso entre los pies: ahí va la posición del personaje en el juego.
  Para dibujar: celda en (x - ancla.x, y - ancla.y - dy). Mirando a la izquierda se espeja la celda.
- efectos/*.png: tiras horizontales; manifest.efectos dice el tamaño, el centro, los ticks por cuadro y la velocidad
  de los proyectiles (px por tick).
- sombra.png va en el piso debajo del muñeco y no sube cuando salta.
`;
