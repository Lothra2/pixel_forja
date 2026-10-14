import { createRaster, blit, type Raster } from '../core/raster';
import { encodePng, encodePngPaleta, decodePng } from '../export/png';
import { motionOf8, type MovimientoAnim } from '../export/motion';
import type { ExportFile } from '../export/bundle';
import { renderClip, EIGHT_VIEWS, type ViewName, type RenderedClip } from '../render/clip';
import type { HumanFicha } from '../sheet/ficha';
import { humanAnim } from '../anim/registry';
import { premiumAnim } from '../anim/premium';
import { applyArmorTier } from '../rpg/presets';
import { allLoot, type LootItem } from '../loot/catalog';
import { lootFrames } from '../loot/render';
import type { TierLook } from '../loot/armor';
import { clipsBase, hojaCapa, huella, sinEquipo, variantes, CAPAS_VERSION, type BloqueCapa } from '../kit/capas';
import { alasCuadro, aureolaCuadro, escalaVista, poseAla } from './alas';
import { lanzaLuz, impactoLuz, estelaAlas, auraCelestial } from './fx';
import { alasVuelo, lanzaLuzSonido, celestialDespierta } from '../audio/sintesis';

/**
 * La heroína celestial al kit (encargo F13, parte 3). Todo en archivos nuevos: las hojas de las heroínas de siempre
 * no cambian. Lo nuevo de cada heroína:
 *   - anims.volar: la hoja base del vuelo (sin equipo, como las otras), con `elevacion` por cuadro.
 *   - capas.alas_detras.celestial, capas.alas_delante.celestial y capas.aura.celestial: hojas con un bloque por
 *     animación (todas, también volar) y 8 filas por dirección, como las de equipo.
 *   - capas.pecho.tunica_celestial: la túnica blanca y dorada.
 *   - bloques.volar en cada capa de equipo que ya había: ese bloque trae su propio `archivo` (una hoja aparte con el
 *     vuelo), así las hojas de antes quedan iguales.
 *   - retrato_celestial.
 */

const enc = new TextEncoder();
const file = (name: string, bytes: Uint8Array, mime: string): ExportFile => ({ name, bytes, mime });
const png = (name: string, r: Raster) => file(name, encodePng(r), 'image/png');
const strip = (frames: Raster[]): Raster => {
  const w = frames[0].w, h = frames[0].h, out = createRaster(w * frames.length, h);
  frames.forEach((fr, i) => blit(out, fr, i * w, 0));
  return out;
};

export const VOLAR = 'volar';

/** La túnica celestial: la túnica de nivel 5 en blanco y oro, sin hombreras */
export const TUNICA_CELESTIAL: Partial<TierLook> = {
  name: { es: 'Túnica Celestial', en: 'Celestial Robe' },
  base: '#f6f2e6', trim: '#e3ae3c', gem: '#ffd86a', glow: '#ffe8a0', belt: '#e3ae3c', cape: '#fbf6ea', pauldrons: false, helm: null,
};

export function tunicaFicha(f: HumanFicha): HumanFicha {
  const b = sinEquipo(f);
  const t = applyArmorTier(b, 'tunica', 5, false, TUNICA_CELESTIAL);
  // como la armadura del pecho de siempre: no le quita lo que lleva en la cabeza
  return b.avatar && t.avatar ? { ...t, avatar: { ...t.avatar, lpc: b.avatar.lpc } } : t;
}

/** El objeto del botín: el pecho de túnica de nivel 5 con los colores celestiales, legendario (ícono animado) */
export function tunicaItem(): LootItem {
  const ref = allLoot().find((i) => i.base.cat === 'armor' && i.base.line === 'tunica' && i.base.tier === 5 && i.base.slot === 'chest');
  if (!ref) throw new Error('no encuentro la túnica de nivel 5 en el catálogo');
  return {
    ...ref, id: 'tunica_celestial', name: { es: 'Túnica Celestial', en: 'Celestial Robe' }, rarity: 'legendary', set: undefined,
    design: TUNICA_CELESTIAL, flavor: { es: 'Tejida con la luz del primer amanecer.', en: 'Woven from the light of the first dawn.' },
  };
}

/** la vista de cada cuadro (el torbellino gira una dirección por cuadro) */
function vistaCuadro(anim: string, clip: RenderedClip, i: number): ViewName {
  const def = premiumAnim(anim) ?? humanAnim(anim);
  if (!def?.spin) return clip.view;
  return EIGHT_VIEWS[(EIGHT_VIEWS.indexOf(clip.view) + i) % 8];
}

/** el cuadro del golpe o la suelta (para que las alas se abran ahí) */
function cuadroGolpe(clip: RenderedClip): number | undefined {
  const e = clip.events?.find((q) => q.type === 'impacto' || q.type === 'suelta');
  return e ? Math.min(clip.frames.length - 1, Math.floor(e.phase * clip.frames.length + 1e-6)) : undefined;
}

/** el pixel más alto de la cabeza en un cuadro (para apoyar la aureola) */
function cima(fr: Raster, hx: number, neckY: number): number {
  let top = neckY;
  for (let y = 0; y < Math.min(fr.h, neckY); y++) for (let x = Math.round(hx) - 5; x <= Math.round(hx) + 5; x++) {
    if (x < 0 || x >= fr.w) continue;
    if (fr.data[(y * fr.w + x) * 4 + 3]) { top = Math.min(top, y); break; }
  }
  return top;
}

/** el tamaño de las alas de esta heroína: según el largo de su torso (Alana es más chica) */
export function escalaHeroina(f: HumanFicha): number {
  const j = renderClip(sinEquipo(f), 48, 'idle', 'front', { props: true, joints: true }).joints![0];
  return Math.max(0.7, Math.min(1.1, Math.hypot(j.neck[0] - j.hip[0], j.neck[1] - j.hip[1]) / 9));
}

export interface CapaCelestial { archivo: string; columnas: number; bloques: Record<string, BloqueCapa> }

/** Arma una hoja de capa (bloques de 3 por fila, 8 filas por bloque) con los cuadros de cada animación */
function packHoja(cuadros: Map<string, Raster[][]>, cell = 48): { png: Raster; columnas: number; bloques: Record<string, BloqueCapa> } {
  const lista = [...cuadros.keys()];
  const maxF = Math.max(...lista.map((a) => Math.max(...cuadros.get(a)!.map((f) => f.length))));
  const porFila = 3, columnas = porFila * maxF;
  const out = createRaster(columnas * cell, Math.ceil(lista.length / porFila) * 8 * cell);
  const bloques: Record<string, BloqueCapa> = {};
  lista.forEach((a, k) => {
    const bx = (k % porFila) * maxF, by = Math.floor(k / porFila) * 8;
    const filas = cuadros.get(a)!;
    bloques[a] = { x: bx, y: by, cuadros: filas[0].length };
    filas.forEach((fila, dir) => fila.forEach((fr, i) => blit(out, fr, (bx + i) * cell, (by + dir) * cell)));
  });
  return { png: out, columnas, bloques };
}

/** Las alas (detrás y delante) y la aureola de una heroína para todas sus animaciones */
export function capasAlas(f: HumanFicha, anims: string[]): { detras: Map<string, Raster[][]>; delante: Map<string, Raster[][]>; aura: Map<string, Raster[][]> } {
  const base = sinEquipo(f);
  const k = escalaHeroina(f);
  const escala = new Map<ViewName, number>();
  for (const v of EIGHT_VIEWS) escala.set(v, escalaVista(48, 48, renderClip(base, 48, 'idle', v, { props: true, joints: true }).joints![0], v, k));
  const detras = new Map<string, Raster[][]>(), delante = new Map<string, Raster[][]>(), aura = new Map<string, Raster[][]>();
  for (const a of anims) {
    const fd: Raster[][] = [], fe: Raster[][] = [], fa: Raster[][] = [];
    for (const v of EIGHT_VIEWS) {
      const clip = renderClip(base, 48, a, v, { props: true, joints: true });
      if (!clip.joints) throw new Error(`sin articulaciones: ${a} ${v}`);
      const n = clip.frames.length, golpe = cuadroGolpe(clip);
      const rd: Raster[] = [], re: Raster[] = [], ra: Raster[] = [];
      clip.frames.forEach((fr, i) => {
        const j = clip.joints![i], vi = vistaCuadro(a, clip, i);
        const al = alasCuadro(fr, j, vi, poseAla(a, i, n, golpe), escala.get(vi)!);
        rd.push(al.detras); re.push(al.delante);
        // al morir la aureola se apaga en la segunda mitad
        ra.push(aureolaCuadro(48, 48, j, cima(fr, j.head[0], Math.round(j.neck[1])), i, n, a === 'die' ? Math.max(0, (i / n - 0.45) * 2.2) : 0));
      });
      fd.push(rd); fe.push(re); fa.push(ra);
    }
    detras.set(a, fd); delante.set(a, fe); aura.set(a, fa);
  }
  return { detras, delante, aura };
}

/** Retrato celestial (40 x 40): la cabeza de frente con la aureola y las puntas de las alas asomando a los lados */
export function retratoCelestial(f: HumanFicha): Raster {
  const C = 64;
  const clip = renderClip(f, C, 'idle', 'front', { props: true, joints: true });
  const fr = clip.frames[0], j = clip.joints![0];
  const k = escalaHeroina(f) * (C / 48);
  const al = alasCuadro(fr, j, 'front', { abre: 0.85, aleteo: 8 }, escalaVista(C, C, j, 'front', k));
  const au = aureolaCuadro(C, C, j, cima(fr, j.head[0], Math.round(j.neck[1])), 0, 8);
  const full = createRaster(C, C);
  for (const l of [al.detras, fr, al.delante, au]) {
    for (let i = 0; i < C * C; i++) {
      const a = l.data[i * 4 + 3] / 255;
      if (!a) continue;
      for (let q = 0; q < 3; q++) full.data[i * 4 + q] = full.data[i * 4 + q] * (1 - a) + l.data[i * 4 + q] * a;
      full.data[i * 4 + 3] = Math.max(full.data[i * 4 + 3], l.data[i * 4 + 3]);
    }
  }
  // encuadre: como el retrato de siempre, pero un poco más arriba para que entre la aureola
  let y0 = C, x0 = C, x1 = 0;
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) if (fr.data[(y * C + x) * 4 + 3]) { y0 = Math.min(y0, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  const S = 40, cx = Math.round((x0 + x1) / 2), top = Math.max(0, y0 - 5);
  const out = createRaster(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const sx = cx - S / 2 + x, sy = top + y;
    if (sx < 0 || sy < 0 || sx >= C || sy >= C) continue;
    for (let c = 0; c < 4; c++) out.data[(y * S + x) * 4 + c] = full.data[(sy * C + sx) * 4 + c];
  }
  return out;
}

type Cache = { get: (clave: string) => { png: Uint8Array; meta: string } | undefined; set: (clave: string, v: { png: Uint8Array; meta: string }) => void };

/** Una capa de equipo (o la túnica) para unas animaciones, con caché como las de equipo */
function capaConCache(f: HumanFicha, variante: HumanFicha, anims: string[], firma: string, cache: Cache | undefined, clips: () => ReturnType<typeof clipsBase>): { png: Uint8Array; meta: { columnas: number; bloques: Record<string, BloqueCapa> } } | null {
  const clave = huella(JSON.stringify({ celestial: 1, firma, anims, ficha: variante, base: sinEquipo(f) }));
  let e = cache?.get(clave);
  if (!e) {
    const h = hojaCapa(clips(), variante, anims);
    e = h ? { png: encodePng(h.png), meta: JSON.stringify({ columnas: h.columnas, bloques: h.bloques }) } : { png: new Uint8Array(), meta: 'null' };
    cache?.set(clave, e);
  }
  const meta = JSON.parse(e.meta);
  return meta ? { png: e.png, meta } : null;
}

export interface HeroeCelestial {
  volar: { archivo: string; cuadros: number; fps: number; loop: boolean } & MovimientoAnim;
  retrato_celestial: string;
  alas_detras: CapaCelestial;
  alas_delante: CapaCelestial;
  aura: CapaCelestial;
  tunica: CapaCelestial | null;
  /** bloque volar de cada capa de equipo que ya había: tipo > clave > bloque con su archivo */
  volarEquipo: Record<string, Record<string, BloqueCapa & { archivo: string; columnas: number }>>;
}

/**
 * Todo lo celestial de una heroína. `anims` son las de su hoja (se le suma volar). `conCapas`: si el kit sale con
 * capas de equipo (si no, el vuelo va con el equipo dibujado, como las otras hojas).
 */
export function exportHeroeCelestial(id: string, f: HumanFicha, anims: string[], conCapas: boolean, files: ExportFile[], log: (m: string) => void, cache?: Cache): HeroeCelestial {
  const base = conCapas ? sinEquipo(f) : f;
  // la hoja base del vuelo
  const clips = EIGHT_VIEWS.map((v) => renderClip(base, 48, VOLAR, v, { props: true }));
  const n = Math.max(...clips.map((c) => c.frames.length));
  const sh = createRaster(n * 48, 8 * 48);
  clips.forEach((c, row) => c.frames.forEach((fr, i) => blit(sh, fr, i * 48, row * 48)));
  const volarArchivo = `personajes/${id}_${VOLAR}.png`;
  files.push(png(volarArchivo, sh));
  const volar = { archivo: volarArchivo, cuadros: n, fps: clips[0].fps, loop: clips[0].loop, ...motionOf8(clips) };
  // alas y aureola
  const todas = [...anims, VOLAR];
  const al = capasAlas(f, todas);
  const hoja = (nombre: string, m: Map<string, Raster[][]>): CapaCelestial => {
    const h = packHoja(m);
    const archivo = `personajes/capas/${id}_${nombre}_celestial.png`;
    files.push(file(archivo, encodePngPaleta(h.png), 'image/png'));
    return { archivo, columnas: h.columnas, bloques: h.bloques };
  };
  const out: HeroeCelestial = {
    volar, retrato_celestial: `personajes/retrato_celestial_${id}.png`,
    alas_detras: hoja('alas_detras', al.detras), alas_delante: hoja('alas_delante', al.delante), aura: hoja('aura', al.aura),
    tunica: null, volarEquipo: {},
  };
  files.push(png(out.retrato_celestial, retratoCelestial(f)));
  if (conCapas) {
    const firma = huella(JSON.stringify({ v: CAPAS_VERSION, celestial: 1, anims: todas }));
    let todo: ReturnType<typeof clipsBase> | null = null, soloVolar: ReturnType<typeof clipsBase> | null = null;
    // la túnica, con todas las animaciones
    const t = capaConCache(f, tunicaFicha(f), todas, firma, cache, () => (todo ??= clipsBase(f, todas)));
    if (t) {
      const archivo = `personajes/capas/${id}_pecho_tunica_celestial.png`;
      files.push(file(archivo, encodePngPaleta(decodePng(t.png)), 'image/png'));
      out.tunica = { archivo, ...t.meta };
    }
    // el vuelo de cada pieza de equipo de siempre, en una hoja aparte por pieza
    for (const v of variantes(f)) {
      const c = capaConCache(f, v.ficha, [VOLAR], firma, cache, () => (soloVolar ??= clipsBase(f, [VOLAR])));
      if (!c) continue;
      const archivo = `personajes/capas/${id}_${v.tipo}_${v.clave}_${VOLAR}.png`;
      files.push(file(archivo, encodePngPaleta(decodePng(c.png)), 'image/png'));
      (out.volarEquipo[v.tipo] ??= {})[v.clave] = { ...c.meta.bloques[VOLAR], archivo, columnas: c.meta.columnas };
    }
  }
  log(`personajes/${id}: celestial (alas, aureola, túnica, vuelo de ${Object.values(out.volarEquipo).reduce((s, x) => s + Object.keys(x).length, 0)} piezas)`);
  return out;
}

/** Efectos, audio y el ícono de la túnica (una sola vez para todas las heroínas) */
export function celestialComun(files: ExportFile[]) {
  const fx: Record<string, { archivo: string; cuadros: number; fps: number; loop: boolean; celda: number }> = {};
  const add = (name: string, frames: Raster[], fps: number, loop: boolean) => {
    const a = `fx/${name}.png`;
    files.push(png(a, strip(frames)));
    fx[name] = { archivo: a, cuadros: frames.length, fps, loop, celda: frames[0].w };
  };
  add('lanza_luz', lanzaLuz(), 14, true);
  add('impacto_luz', impactoLuz(), 16, false);
  add('estela_alas', estelaAlas(), 10, false);
  add('aura_celestial', auraCelestial(), 8, true);
  const item = tunicaItem();
  const iconos: Record<string, { archivo: string; w: number; h: number; cuadros: number }> = {};
  for (const px of [32, 64] as const) {
    const fr = lootFrames(item, px, true);
    const a = `botin/tunica_celestial_${px}.png`;
    files.push(png(a, strip(fr)));
    iconos[px] = { archivo: a, w: fr[0].w, h: fr[0].h, cuadros: fr.length };
  }
  const audio: Record<string, Float32Array> = { alas_vuelo: alasVuelo(), lanza_luz: lanzaLuzSonido(), celestial_despierta: celestialDespierta() };
  return {
    fx, audio,
    tunica: {
      id: item.id, nombre: item.name, rareza: item.rarity, nivel: item.level, base: item.base, stats: item.stats, flavor: item.flavor,
      iconos, capa: { capa: 'pecho', clave: 'tunica_celestial' },
      notas: 'Va en el casillero del pecho. Los íconos son tiras de 8 cuadros (legendario animado), con su casillero. Se ve en la heroína con capas.pecho.tunica_celestial.',
    },
  };
}

export const NOTAS_CELESTIAL = [
  'La heroína celestial: la misma heroína con alas, aureola y túnica.',
  'Orden de dibujo: alas_detras (debajo de todo), la base, pecho, casco, arma, mano, alas_delante y aura (encima de todo). Todas con la misma celda y el mismo pivote que la base, cuadro por cuadro.',
  'capas.alas_detras.celestial, capas.alas_delante.celestial y capas.aura.celestial traen un bloque por animación (todas las de la heroína y volar), igual que las de equipo. La aureola se apaga sola en la segunda mitad de die.',
  'capas.pecho.tunica_celestial: la túnica (objeto celestial.tunica en el botín).',
  'anims.volar: el poder Alas (8 cuadros a 10 fps, en bucle). En la hoja el cuerpo queda cerca del piso con las piernas colgando: el juego lo sube con `elevacion` (pixeles por cuadro, de 9 a 15) sobre su sombra. Las alas aletean con el cuerpo: el ala baja en los cuadros 2 a 4 y es cuando más sube.',
  'Cada capa de equipo de antes trae bloques.volar con su propio `archivo` y `columnas` (una hoja aparte por pieza): el juego usa bloque.archivo ?? capa.archivo. Así las hojas de antes no cambian.',
  'fx (se ven mejor sumando luz, modo ADD, pero funcionan en modo normal): lanza_luz (32 x 32 en bucle, tramo del haz hacia la derecha: repetirlo en línea y girarlo), impacto_luz (48, 8 cuadros), estela_alas (32, 6 cuadros, dejarla detrás del vuelo cada tanto), aura_celestial (64 en bucle, al pie: el centro del brillo va en (32, 50) de la celda, sobre el pivote).',
  'Íconos: ui.habilidades.alas, lanza_luz y ciclo. Audio: alas_vuelo, lanza_luz y celestial_despierta (el coro, al volverse celestial).',
].join(' ');

export { enc };
