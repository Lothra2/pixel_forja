import type { Ficha } from '../sheet/ficha';
import { renderPlan, FFGG_PLAN, type ExportPlan } from './plan';
import { packSheet } from './sheet';
import { movimientoJson } from './motion';
import { encodePng } from './png';
import { upscaleNearest } from '../core/raster';
import { toFfgg } from './ffgg';
import { encodeGif } from './gif';
import { encodeAseprite, asepriteJson } from './aseprite';
import { godotSpriteFrames, unityMeta, framesZip } from './engines';
import type { QAReport } from '../qa/checks';
import type { RenderedClip } from '../render/clip';
import { isHuman } from '../sheet/ficha';
import { lpcCredits, LPC_SOURCE } from '../parts/lpc';

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
  const files = exportFilesRaw(f, kind, plan, opt);
  const credits = creditsFor(f);
  if (credits) files.push({ name: 'CREDITOS.txt', bytes: enc.encode(credits), mime: 'text/plain' });
  return files;
}

/**
 * Créditos obligatorios cuando el personaje usa piezas dibujadas de LPC. Cada pieza trae sus autores y
 * licencias (CC-BY-SA, GPL, OGA-BY o CC0): hay que mostrarlos en el juego, por ejemplo en la pantalla de créditos.
 */
export function creditsFor(f: Ficha): string | null {
  if (!isHuman(f) || !f.avatar || f.avatar.kit !== 'lpc' || !f.avatar.lpc || f.headMode === 'image') return null;
  const lines = lpcCredits(f.avatar.lpc);
  if (!lines.length) return null;
  return [
    'Arte del personaje: piezas del proyecto LPC (Liberated Pixel Cup), recoloreadas y armadas con PixelForja.',
    `Fuente: ${LPC_SOURCE}`,
    'Estas piezas exigen dar crédito a sus autores. Si las modificas y las compartes, respeta su licencia (CC-BY-SA o GPL comparten igual).',
    '',
    ...lines,
    '',
  ].join('\n');
}

function exportFilesRaw(f: Ficha, kind: ExportKind, plan: ExportPlan, opt: { force?: boolean; gifScale?: number }): ExportFile[] {
  const base = (f.name || 'personaje').replace(/[^\w-]+/g, '_');
  if (kind === 'ficha') return [{ name: `${base}.ficha.json`, bytes: json(f), mime: 'application/json' }];
  const p = kind === 'ffgg' ? FFGG_PLAN : plan;
  const { clips, qa } = renderPlan(f, p);
  if (!clips.length) throw new Error('No hay animaciones para exportar');
  const bad = qa.filter((q) => !q.ok);
  if (bad.length && !opt.force) throw new QAError(bad);
  const tag = `${base}_${p.cell}`;
  const files = clipFiles(kind, clips, tag, base, p, opt);
  // perfil premium: pasos, golpe, avance y articulaciones en un archivo aparte que sirve para cualquier motor
  const mov = movimientoJson(clips);
  if (mov) files.push({ name: `${tag}.movimiento.json`, bytes: json(mov), mime: 'application/json' });
  return files;
}

function clipFiles(kind: ExportKind, clips: RenderedClip[], tag: string, base: string, p: ExportPlan, opt: { gifScale?: number }): ExportFile[] {
  if (kind === 'gif')
    return clips.map((c) => ({ name: `${tag}_${c.name}.gif`, bytes: encodeGif(c.frames, c.fps, { scale: opt.gifScale ?? Math.max(2, Math.round(192 / p.cell)) }), mime: 'image/gif' }));
  if (kind === 'frames') return [{ name: `${tag}_cuadros.zip`, bytes: framesZip(clips), mime: 'application/zip' }];
  const { png, json: sheet } = packSheet(clips, `${tag}.png`);
  const pngFile = { name: `${tag}.png`, bytes: encodePng(png), mime: 'image/png' };
  switch (kind) {
    case 'sheet': {
      const k = Math.max(1, Math.round(p.scale ?? 1));
      if (k === 1) return [pngFile, { name: `${tag}.json`, bytes: json(sheet), mime: 'application/json' }];
      // hoja agrandada sin filtrar: cada pixel pasa a k x k, y el JSON se escala igual
      const big = upscaleNearest(png, k);
      const name = `${tag}_x${k}`;
      const sj = structuredClone(sheet);
      for (const fr of Object.values(sj.frames)) {
        fr.frame = { x: fr.frame.x * k, y: fr.frame.y * k, w: fr.frame.w * k, h: fr.frame.h * k };
        fr.spriteSourceSize = { x: 0, y: 0, w: fr.spriteSourceSize.w * k, h: fr.spriteSourceSize.h * k };
        fr.sourceSize = { w: fr.sourceSize.w * k, h: fr.sourceSize.h * k };
      }
      sj.cell = [sj.cell[0] * k, sj.cell[1] * k];
      for (const a of Object.values(sj.anims)) if (a.avance) a.avance *= k;
      sj.pivot = [sj.pivot[0] * k, sj.pivot[1] * k];
      sj.meta = { ...sj.meta, image: `${name}.png`, size: { w: big.w, h: big.h }, scale: String(k) as '1' };
      return [{ name: `${name}.png`, bytes: encodePng(big), mime: 'image/png' }, { name: `${name}.json`, bytes: json(sj), mime: 'application/json' }];
    }
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
