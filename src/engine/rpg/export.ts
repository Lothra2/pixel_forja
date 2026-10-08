import { createRaster, blit } from '../core/raster';
import { encodePng } from '../export/png';
import { packSheet } from '../export/sheet';
import type { ExportFile } from '../export/bundle';
import type { RenderedClip } from '../render/clip';
import type { CellSize } from '../sheet/ficha';
import { renderFx, projectile8, type FxElement, type FxKind, type FxClip } from '../fx/fx';
import { renderItem, itemName, type ItemSpec } from '../items/items';

const enc = new TextEncoder();
const asClip = (c: FxClip): RenderedClip => ({ ...c, view: 'side', airborne: c.frames.map(() => true), steady: false, fits: true });

/**
 * Hoja de poderes para el juego: cada efecto es una animación (proyectiles en 8 direcciones).
 * Mismo formato que las hojas de personajes: atlas JSON Hash de Phaser más `anims` con fps y bucle.
 */
export function exportFx(elements: FxElement[], kinds: FxKind[], cell: CellSize, name = 'poderes'): ExportFile[] {
  const clips: RenderedClip[] = [];
  for (const element of elements)
    for (const kind of kinds) {
      if (kind === 'projectile') for (const { clip } of projectile8({ element, cell })) clips.push(asClip(clip));
      else clips.push(asClip(renderFx({ kind, element, cell })));
    }
  if (!clips.length) throw new Error('Elige al menos un poder');
  const { png, json } = packSheet(clips, `${name}.png`);
  // los efectos se centran en la celda (no van parados en el piso)
  json.pivot = [cell / 2, cell / 2];
  return [
    { name: `${name}.png`, bytes: encodePng(png), mime: 'image/png' },
    { name: `${name}.json`, bytes: enc.encode(JSON.stringify(json, null, 1)), mime: 'application/json' },
  ];
}

/** Atlas de íconos de objetos: una grilla de 8 columnas con el nombre de cada objeto como cuadro. */
export function exportItems(specs: ItemSpec[], px = 32, name = 'objetos'): ExportFile[] {
  if (!specs.length) throw new Error('Elige al menos un objeto');
  const cols = 8, rows = Math.ceil(specs.length / cols);
  const png = createRaster(cols * px, rows * px);
  const frames: Record<string, { frame: { x: number; y: number; w: number; h: number }; rotated: false; trimmed: false; spriteSourceSize: { x: 0; y: 0; w: number; h: number }; sourceSize: { w: number; h: number } }> = {};
  const used = new Map<string, number>();
  specs.forEach((s, i) => {
    const x = (i % cols) * px, y = Math.floor(i / cols) * px;
    blit(png, renderItem({ ...s, px }), x, y);
    let key = itemName(s);
    const n = used.get(key) ?? 0;
    used.set(key, n + 1);
    if (n) key = `${key}_${n + 1}`;
    frames[key] = { frame: { x, y, w: px, h: px }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: px, h: px }, sourceSize: { w: px, h: px } };
  });
  const json = { frames, meta: { app: 'PixelForja', version: '0.0.1', image: `${name}.png`, format: 'RGBA8888', size: { w: png.w, h: png.h }, scale: '1' } };
  return [
    { name: `${name}.png`, bytes: encodePng(png), mime: 'image/png' },
    { name: `${name}.json`, bytes: enc.encode(JSON.stringify(json, null, 1)), mime: 'application/json' },
  ];
}
