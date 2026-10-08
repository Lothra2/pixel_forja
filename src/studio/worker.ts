/// <reference lib="webworker" />
import {
  decodePng, makeWorkImage, analyzeImage, buildFicha, buildAnimalFicha, renderClip, runQA,
  exportFiles, renderPlan, surprise, isHuman, headThumb, avatarOptions, colorsFromPhoto,
  type Raster, type WorkImage, type Analysis, type HumanFicha,
} from '../engine/index';
import type { AnalyzeParams, ImagePayload, Request, Response } from './protocol';

/** El motor corre aquí, lejos de la pantalla, para que generar no la congele. */
let source: Raster | null = null;
let work: WorkImage | null = null;
const extra: { side?: Raster; back?: Raster } = {};

const toRaster = (p: ImagePayload): Raster => (p.png ? decodePng(p.png) : { w: p.w!, h: p.h!, data: p.rgba! });

function analyze(p: AnalyzeParams): Analysis {
  if (!source || !work) throw new Error('No hay imagen cargada');
  return analyzeImage(source, { bgTolerance: p.bgTolerance, bgStrokes: p.bgStrokes, head: p.head, zoneEdits: p.zoneEdits, mode: p.mode }, work);
}

const post = (r: Response & { id: number }, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(r, transfer);

self.onmessage = (ev: MessageEvent<Request & { id: number }>) => {
  const req = ev.data;
  const reply = (r: Response, transfer: Transferable[] = []) => post({ ...r, id: req.id }, transfer);
  try {
    switch (req.type) {
      case 'load': {
        source = toRaster(req);
        work = makeWorkImage(source);
        delete extra.side;
        delete extra.back;
        reply({ type: 'loaded', w: work.raster.w, h: work.raster.h });
        break;
      }
      case 'loadExtra': {
        extra[req.view] = toRaster(req);
        reply({ type: 'loaded', w: extra[req.view]!.w, h: extra[req.view]!.h });
        break;
      }
      case 'clearExtra': {
        delete extra[req.view];
        reply({ type: 'loaded', w: 0, h: 0 });
        break;
      }
      case 'analyze': {
        const a = analyze(req.params);
        const rgba = new Uint8ClampedArray(a.work.raster.data);
        reply(
          { type: 'analyzed', result: { w: a.work.raster.w, h: a.work.raster.h, rgba, mask: a.mask, zone: a.zone, head: a.zones.head, headGuessed: a.zones.headGuessed, mode: a.mode } },
          [rgba.buffer, a.mask.buffer, a.zone.buffer],
        );
        break;
      }
      case 'build': {
        const a = analyze(req.params);
        const { ficha, report } = buildFicha(source!, { name: req.name, head: req.params.head, outfit: req.outfit, face: req.face, proportions: req.proportions, extra }, a);
        reply({ type: 'built', ficha, report });
        break;
      }
      case 'buildAnimal': {
        if (!source) throw new Error('No hay imagen cargada');
        const { ficha } = buildAnimalFicha(source, { name: req.name, species: req.species, bgTolerance: req.bgTolerance, bgStrokes: req.bgStrokes });
        reply({ type: 'built', ficha });
        break;
      }
      case 'render': {
        const c = renderClip(req.ficha, req.cell, req.anim, req.view, { props: req.props });
        const qa = runQA(req.ficha, c);
        const frames = c.frames.map((f) => f.data);
        reply({ type: 'rendered', clip: { name: c.name, fps: c.fps, cell: c.cell, view: c.view, frames }, qa }, frames.map((f) => f.buffer));
        break;
      }
      case 'variants': {
        const base = req.ficha.body.proportions;
        const canRebuild = !!req.params && !!source;
        const variants = surprise(req.seed, req.n, base, !canRebuild);
        const a = canRebuild ? analyze(req.params!) : null;
        const thumbs = variants.map((v) => {
          let f: HumanFicha;
          if (a) f = buildFicha(source!, { name: 'v', head: req.params!.head, sizes: [48], proportions: v.proportions, outfit: req.ficha.outfit, face: { ...req.ficha.face, ...v.face }, extra }, a).ficha;
          else f = { ...req.ficha, body: { ...req.ficha.body, proportions: v.proportions }, face: { ...req.ficha.face, ...v.face } };
          f = { ...f, palette: req.ficha.palette };
          return renderClip(f, 48, 'idle').frames[0].data;
        });
        reply({ type: 'variants', variants, thumbs }, thumbs.map((t) => t.buffer));
        break;
      }
      case 'qa': {
        const { qa, missing } = renderPlan(req.ficha, req.plan);
        reply({ type: 'qa', reports: qa, missing });
        break;
      }
      case 'photoColors': {
        reply({ type: 'photoColors', colors: colorsFromPhoto(toRaster(req)) });
        break;
      }
      case 'avatarThumbs': {
        const thumbs = avatarOptions(req.avatar, req.part).map((o) => {
          const r = headThumb(o.avatar, o.yaw);
          return { id: o.id, w: r.w, h: r.h, rgba: new Uint8ClampedArray(r.data) };
        });
        reply({ type: 'avatarThumbs', part: req.part, thumbs }, thumbs.map((t) => t.rgba.buffer));
        break;
      }
      case 'export': {
        const files = exportFiles(req.ficha, req.kind, req.plan, { force: req.force });
        reply({ type: 'exported', files }, files.map((f) => f.bytes.buffer as ArrayBuffer));
        break;
      }
    }
  } catch (e) {
    reply({ type: 'error', message: e instanceof Error ? e.message : String(e) });
  }
};

void isHuman;
