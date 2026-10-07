import type { Ficha } from '../sheet/ficha';
import { renderPlan, FFGG_PLAN, type ExportPlan } from './plan';
import { packSheet } from './sheet';
import { encodePng } from './png';
import { toFfgg } from './ffgg';
import { encodeGif } from './gif';
import { encodeAseprite, asepriteJson } from './aseprite';
import { godotSpriteFrames, unityMeta, framesZip } from './engines';
import type { QAReport } from '../qa/checks';

export type ExportKind = 'sheet' | 'ffgg' | 'aseprite' | 'godot' | 'unity' | 'frames' | 'gif' | 'ficha';
export const EXPORT_KINDS: ExportKind[] = ['sheet', 'ffgg', 'aseprite', 'godot', 'unity', 'frames', 'gif', 'ficha'];

export interface ExportFile { name: string; bytes: Uint8Array; mime: string }

export class QAError extends Error {
  constructor(public reports: QAReport[]) {
    super(`Control de calidad: ${reports.map((r) => `${r.clip} ${r.cell}px (${r.items.filter((i) => i.severity === 'error').map((i) => i.check).join(', ')})`).join('; ')}`);
  }
}

const enc = new TextEncoder();
const json = (v: unknown) => enc.encode(JSON.stringify(v, null, 2));

/**
 * Arma los archivos de un exportador. Si el control de calidad encuentra errores, no exporta
 * (salvo force) y dice qué animación y qué cuadro fallan.
 */
export function exportFiles(f: Ficha, kind: ExportKind, plan: ExportPlan, opt: { force?: boolean; gifScale?: number } = {}): ExportFile[] {
  const base = (f.name || 'personaje').replace(/[^\w-]+/g, '_');
  if (kind === 'ficha') return [{ name: `${base}.ficha.json`, bytes: json(f), mime: 'application/json' }];
  const p = kind === 'ffgg' ? FFGG_PLAN : plan;
  const { clips, qa } = renderPlan(f, p);
  if (!clips.length) throw new Error('No hay animaciones para exportar');
  const bad = qa.filter((q) => !q.ok);
  if (bad.length && !opt.force) throw new QAError(bad);
  const tag = `${base}_${p.cell}`;
  if (kind === 'gif')
    return clips.map((c) => ({ name: `${tag}_${c.name}.gif`, bytes: encodeGif(c.frames, c.fps, { scale: opt.gifScale ?? Math.max(2, Math.round(192 / p.cell)) }), mime: 'image/gif' }));
  if (kind === 'frames') return [{ name: `${tag}_cuadros.zip`, bytes: framesZip(clips), mime: 'application/zip' }];
  const { png, json: sheet } = packSheet(clips, `${tag}.png`);
  const pngFile = { name: `${tag}.png`, bytes: encodePng(png), mime: 'image/png' };
  switch (kind) {
    case 'sheet':
      return [pngFile, { name: `${tag}.json`, bytes: json(sheet), mime: 'application/json' }];
    case 'ffgg':
      return [pngFile, { name: `${base}_ffgg.json`, bytes: json(toFfgg(sheet).json), mime: 'application/json' }];
    case 'aseprite':
      return [
        { name: `${tag}.aseprite`, bytes: encodeAseprite(clips), mime: 'application/octet-stream' },
        pngFile,
        { name: `${tag}.aseprite.json`, bytes: json(asepriteJson(sheet, clips)), mime: 'application/json' },
      ];
    case 'godot':
      return [pngFile, { name: `${tag}.tres`, bytes: enc.encode(godotSpriteFrames(sheet, `${tag}.png`)), mime: 'text/plain' }];
    case 'unity':
      return [pngFile, { name: `${tag}.png.meta`, bytes: enc.encode(unityMeta(sheet, `${tag}.png`)), mime: 'text/plain' }, { name: `${tag}.json`, bytes: json(sheet), mime: 'application/json' }];
  }
  throw new Error(`Exportador desconocido: ${kind}`);
}
