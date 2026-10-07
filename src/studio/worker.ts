/// <reference lib="webworker" />
import {
  decodePng, makeWorkImage, removeBackground, proposeZones, applyZoneEdits, buildFicha, renderClip, runQA, packSheet,
  encodePng, encodeGif, toFfgg, ANIM_NAMES, type Raster, type WorkImage, type Analysis, type HumanAnimName,
} from '../engine/index';
import type { AnalyzeParams, Request, Response } from './protocol';

/** El motor corre aquí, lejos de la pantalla, para que generar no la congele. */
let source: Raster | null = null;
let work: WorkImage | null = null;

function analyze(p: AnalyzeParams): Analysis {
  if (!source || !work) throw new Error('No hay imagen cargada');
  const mask = removeBackground(work, { tolerance: p.bgTolerance, strokes: p.bgStrokes });
  const zones = proposeZones(work, mask, p.head);
  const zone = applyZoneEdits(zones, mask, p.zoneEdits);
  return { work, mask, zones, zone };
}

const post = (r: Response & { id: number }, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(r, transfer);

self.onmessage = (ev: MessageEvent<Request & { id: number }>) => {
  const req = ev.data;
  const reply = (r: Response, transfer: Transferable[] = []) => post({ ...r, id: req.id }, transfer);
  try {
    switch (req.type) {
      case 'load': {
        source = req.png ? decodePng(req.png) : { w: req.w!, h: req.h!, data: req.rgba! };
        work = makeWorkImage(source);
        reply({ type: 'loaded', w: work.raster.w, h: work.raster.h });
        break;
      }
      case 'analyze': {
        const a = analyze(req.params);
        const rgba = new Uint8ClampedArray(a.work.raster.data);
        reply(
          { type: 'analyzed', result: { w: a.work.raster.w, h: a.work.raster.h, rgba, mask: a.mask, zone: a.zone, head: a.zones.head, headGuessed: a.zones.headGuessed } },
          [rgba.buffer, a.mask.buffer, a.zone.buffer],
        );
        break;
      }
      case 'build': {
        const a = analyze(req.params);
        const { ficha, report } = buildFicha(source!, { name: req.name, head: req.params.head, outfit: req.outfit, face: req.face }, a);
        reply({ type: 'built', ficha, report });
        break;
      }
      case 'render': {
        const clips = ANIM_NAMES.map((n) => renderClip(req.ficha, req.cell, n));
        const qa = clips.map((c) => runQA(req.ficha, c));
        const sets = clips.map((c) => ({ name: c.name, fps: c.fps, cell: c.cell, frames: c.frames.map((f) => f.data) }));
        reply({ type: 'rendered', clips: sets, qa }, sets.flatMap((s) => s.frames.map((f) => f.buffer)));
        break;
      }
      case 'export': {
        const f = req.ficha;
        const clips = ANIM_NAMES.map((n) => renderClip(f, req.cell, n));
        const blocked = clips.map((c) => runQA(f, c)).filter((q) => !q.ok);
        if (blocked.length) throw new Error(`Control de calidad: ${blocked.map((b) => `${b.clip} ${b.cell}px`).join(', ')}`);
        const base = `${f.name || 'personaje'}_${req.cell}`;
        const files: { name: string; bytes: Uint8Array; mime: string }[] = [];
        const enc = new TextEncoder();
        if (req.kind === 'sheet' || req.kind === 'ffgg') {
          const { png, json } = packSheet(clips, `${base}.png`);
          files.push({ name: `${base}.png`, bytes: encodePng(png), mime: 'image/png' });
          if (req.kind === 'sheet') files.push({ name: `${base}.json`, bytes: enc.encode(JSON.stringify(json, null, 2)), mime: 'application/json' });
          else files.push({ name: `${f.name || 'personaje'}_ffgg.json`, bytes: enc.encode(JSON.stringify(toFfgg(json).json, null, 2)), mime: 'application/json' });
        } else {
          const c = clips.find((x) => x.name === (req.anim as HumanAnimName)) ?? clips[0];
          files.push({ name: `${base}_${c.name}.gif`, bytes: encodeGif(c.frames, c.fps, { scale: Math.max(2, Math.round(192 / req.cell)) }), mime: 'image/gif' });
        }
        reply({ type: 'exported', files });
        break;
      }
    }
  } catch (e) {
    reply({ type: 'error', message: e instanceof Error ? e.message : String(e) });
  }
};
