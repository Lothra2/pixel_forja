import { encodePng } from '../export/png';
import { packSheet } from '../export/sheet';
import type { ExportFile } from '../export/bundle';
import type { RenderedClip } from '../render/clip';
import type { CellSize } from '../sheet/ficha';
import { renderFx, projectile8, type FxElement, type FxKind, type FxClip } from '../fx/fx';

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
