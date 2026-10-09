import { createRaster, blit, type Raster } from '../core/raster';
import { encodePng } from '../export/png';
import type { ExportFile } from '../export/bundle';
import { renderLoot, lootFrames, isSpecial } from './render';
import { allLoot, modText, SET_BONUS, SET_NAME, SET_GG, type LootItem } from './catalog';
import { RARITY_COLORS } from './materials';
import { CHEST_TIERS, chestFrames, coinFrames, PILE_SIZES, pileFrames, coinBurstFrames, dropFrames, beamFrames } from './world';

/**
 * Exportación del botín para el juego (Phaser carga los atlas directo):
 *  - botin_iconos_32 / 64: un ícono por objeto; legendarios, únicos y de set con 8 cuadros animados
 *  - botin_mundo: cofres, monedas, montones, lluvia de oro, haces de luz y objetos que caen
 *  - botin_catalogo.json: nombres en español e inglés, rareza, nivel, estadísticas y textos
 */

const enc = new TextEncoder();

export interface AnimRow { name: string; frames: Raster[]; fps: number; loop: boolean }

type Frame = { frame: { x: number; y: number; w: number; h: number }; rotated: false; trimmed: false; spriteSourceSize: { x: 0; y: 0; w: number; h: number }; sourceSize: { w: number; h: number } };

/** Atlas de filas: cada animación en su fila (de cualquier tamaño), JSON Hash de Phaser con `anims`. */
export function packRows(rows: AnimRow[], image: string): { png: Raster; json: Record<string, unknown> } {
  const maxCols = 16;
  // filas de hasta 16 cuadros: las animaciones largas siguen abajo
  let w = 0, h = 0;
  const place: { r: AnimRow; x: number; y: number; i: number }[] = [];
  let y = 0;
  for (const r of rows) {
    const fw = r.frames[0].w, fh = r.frames[0].h;
    r.frames.forEach((_, i) => {
      const col = i % maxCols;
      if (i && col === 0) y += fh;
      place.push({ r, x: col * fw, y, i });
      w = Math.max(w, (col + 1) * fw);
    });
    y += fh;
    h = y;
  }
  const png = createRaster(Math.max(1, w), Math.max(1, h));
  const frames: Record<string, Frame> = {};
  const animations: Record<string, string[]> = {};
  const anims: Record<string, { frames: number; fps: number; loop: boolean; w: number; h: number }> = {};
  for (const { r, x, y: yy, i } of place) {
    const fr = r.frames[i];
    blit(png, fr, x, yy);
    const key = r.frames.length > 1 ? `${r.name}_${i}` : r.name;
    frames[key] = { frame: { x, y: yy, w: fr.w, h: fr.h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: fr.w, h: fr.h }, sourceSize: { w: fr.w, h: fr.h } };
    if (r.frames.length > 1) {
      (animations[r.name] ??= []).push(key);
      anims[r.name] = { frames: r.frames.length, fps: r.fps, loop: r.loop, w: fr.w, h: fr.h };
    }
  }
  return { png, json: { frames, animations, anims, meta: { app: 'PixelForja', version: '0.1.0', image, format: 'RGBA8888', size: { w: png.w, h: png.h }, scale: '1' } } };
}

const file = (name: string, png: Raster, json: unknown): ExportFile[] => [
  { name: `${name}.png`, bytes: encodePng(png), mime: 'image/png' },
  { name: `${name}.json`, bytes: enc.encode(JSON.stringify(json, null, 1)), mime: 'application/json' },
];

/** Íconos de inventario de los objetos dados (todos por defecto). */
export function exportLootIcons(items: LootItem[] = allLoot(), px: 32 | 64 = 32, slot = false, name = `botin_iconos_${px}`): ExportFile[] {
  if (!items.length) throw new Error('Elige al menos un objeto');
  const rows: AnimRow[] = items.map((it) => ({ name: it.id, frames: lootFrames(it, px, slot), fps: 10, loop: true }));
  // los objetos de un solo cuadro se juntan en filas de 16 para que la hoja quede compacta
  const single = rows.filter((r) => r.frames.length === 1), multi = rows.filter((r) => r.frames.length > 1);
  const { png, json } = multi.length ? packRows(multi, `${name}.png`) : { png: createRaster(1, 0), json: { frames: {}, animations: {}, anims: {}, meta: { app: 'PixelForja', version: '0.1.0', image: `${name}.png`, format: 'RGBA8888', size: { w: 0, h: 0 }, scale: '1' } } as Record<string, unknown> };
  // fila de íconos sueltos al final
  const per = 16, extraH = Math.ceil(single.length / per) * px;
  const full = createRaster(Math.max(png.w, per * px), png.h + extraH);
  blit(full, png, 0, 0);
  const frames = json.frames as Record<string, Frame>;
  single.forEach((r, i) => {
    const x = (i % per) * px, y = png.h + Math.floor(i / per) * px;
    blit(full, r.frames[0], x, y);
    frames[r.name] = { frame: { x, y, w: px, h: px }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: px, h: px }, sourceSize: { w: px, h: px } };
  });
  (json.meta as { size: { w: number; h: number } }).size = { w: full.w, h: full.h };
  return file(name, full, json);
}

/** Cofres, monedas, oro, lluvia de monedas, haces de luz y objetos que caen (los especiales). */
export function exportLootWorld(items: LootItem[] = allLoot().filter((i) => isSpecial(i.rarity)), name = 'botin_mundo'): ExportFile[] {
  const rows: AnimRow[] = [];
  for (const t of CHEST_TIERS) {
    rows.push({ name: `cofre_${t}_abrir`, frames: chestFrames(t, 48), fps: 12, loop: false });
    rows.push({ name: `cofre_${t}_quieto`, frames: chestFrames(t, 48, true), fps: 8, loop: true });
  }
  rows.push({ name: 'moneda_gira', frames: coinFrames(16), fps: 12, loop: true });
  for (const s of PILE_SIZES) rows.push({ name: `oro_${s}`, frames: pileFrames(s), fps: 6, loop: true });
  rows.push({ name: 'lluvia_de_oro', frames: coinBurstFrames(48), fps: 14, loop: false });
  for (const r of ['magic', 'rare', 'set', 'unique', 'legendary'] as const) rows.push({ name: `haz_${r}`, frames: beamFrames(r), fps: 10, loop: true });
  for (const it of items) rows.push({ name: `cae_${it.id}`, frames: dropFrames(it, 32), fps: 14, loop: false });
  const { png, json } = packRows(rows, `${name}.png`);
  return file(name, png, json);
}

/** Catálogo del juego en JSON (nombres, rareza, nivel, estadísticas con su texto y el ícono). */
export function lootCatalog(items: LootItem[] = allLoot()) {
  return {
    rarities: RARITY_COLORS,
    sets: { [SET_GG]: { name: SET_NAME, bonus: SET_BONUS.map((b) => ({ pieces: b.pieces, mods: b.mods, text: { es: b.mods.map((m) => modText(m, 'es')), en: b.mods.map((m) => modText(m, 'en')) } })) } },
    items: items.map((it) => ({
      id: it.id, name: it.name, rarity: it.rarity, level: it.level, base: it.base, grade: it.grade, set: it.set, twoHanded: it.twoHanded,
      stats: it.stats, text: { es: it.stats.mods.map((m) => modText(m, 'es')), en: it.stats.mods.map((m) => modText(m, 'en')) },
      flavor: it.flavor, icon: it.id, animated: isSpecial(it.rarity),
    })),
  };
}

export function exportLootCatalog(items: LootItem[] = allLoot(), name = 'botin_catalogo'): ExportFile[] {
  return [{ name: `${name}.json`, bytes: enc.encode(JSON.stringify(lootCatalog(items), null, 1)), mime: 'application/json' }];
}

/** Todo junto: íconos a 32 y 64, mundo y catálogo. */
export function exportLootAll(items?: LootItem[]): ExportFile[] {
  return [...exportLootIcons(items, 32), ...exportLootIcons(items, 64), ...exportLootWorld(), ...exportLootCatalog(items)];
}

/** Un ícono suelto (para mostrar en la app). */
export { renderLoot };
