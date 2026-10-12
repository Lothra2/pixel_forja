import { useEffect, useMemo, useRef, useState } from 'react';
import { EFFECTS, EFFECT_GROUPS, renderEffect, effectSheet, type EffectDef, type EffectGroup } from '../../engine/fx/catalog';
import { encodePng, type Raster } from '../../engine/index';
import type { T } from '../components/ui';
import { Seg } from '../components/ui';
import { downloadFiles } from '../util';
import type { Lang } from '../i18n';

type Rendered = { def: EffectDef; w: number; h: number; frames: ImageData[] };
const toImage = (r: Raster) => new ImageData(new Uint8ClampedArray(r.data), r.w, r.h);

/** Qué cuadro toca en el tiempo t: los de bucle giran; los que no, se quedan un momento al final y vuelven a empezar. */
function frameAt(d: EffectDef, t: number) {
  if (d.fps === 0) return Math.floor(t / 0.8) % d.cuadros;
  const k = Math.floor(t * d.fps);
  if (d.loop) return k % d.cuadros;
  return Math.min(k % (d.cuadros + Math.round(d.fps * 0.6)), d.cuadros - 1);
}

function EffectCard({ r, zoom, lang, t, canvases }: { r: Rendered; zoom: number; lang: Lang; t: T; canvases: Map<string, { c: HTMLCanvasElement; r: Rendered }> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = r.w; c.height = r.h;
    c.getContext('2d')!.putImageData(r.frames[0], 0, 0);
    canvases.set(r.def.id, { c, r });
    return () => { canvases.delete(r.def.id); };
  }, [r, canvases]);
  const d = r.def;
  // los de pantalla completa se ven a la mitad: si no, no caben
  const scale = d.pantalla ? 0.5 : zoom;
  return (
    <figure className={`fx-card${d.pantalla ? ' fx-wide' : ''}`} data-testid={`effect-${d.id}`}>
      <div className="fx-stage"><canvas ref={ref} className="pixel" style={{ width: r.w * scale, height: r.h * scale }} /></div>
      <figcaption>
        <strong>{d.id}</strong>
        <span className="muted small">{r.w} × {r.h} · {d.cuadros} {t('ef_frames')} · {d.fps ? `${d.fps} fps` : t('ef_states')}{d.loop ? ` · ${t('ef_loop')}` : ''}</span>
        <span className="muted small">{t('ef_attach')}: {d.se_pega_a} · {d.capa === 'detras' ? t('ef_behind') : t('ef_front')}</span>
        <span className="small">{d.uso[lang]}</span>
      </figcaption>
    </figure>
  );
}

/** Efectos del juego: el catálogo general animado, por grupo, y la descarga de las hojas con su manifiesto. */
export function EffectsStep({ t, lang }: { t: T; lang: Lang }) {
  const [group, setGroup] = useState<'todos' | EffectGroup>('golpe');
  const [zoom, setZoom] = useState('3');
  const [bg, setBg] = useState('oscuro');
  const all = useMemo<Rendered[]>(() => EFFECTS.map((def) => { const r = renderEffect(def); return { def, w: r.w, h: r.h, frames: r.frames.map(toImage) }; }), []);
  const shown = all.filter((r) => group === 'todos' || r.def.grupo === group);
  const canvases = useRef(new Map<string, { c: HTMLCanvasElement; r: Rendered }>()).current;

  // un solo reloj para todas las tarjetas
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const last = new Map<string, number>();
    const tick = (now: number) => {
      // el sello del cuadro puede venir un poco antes de t0: sin esto el primer índice sale negativo
      const s = Math.max(0, (now - t0) / 1000);
      for (const [id, { c, r }] of canvases) {
        const k = frameAt(r.def, s);
        if (last.get(id) === k) continue;
        last.set(id, k);
        c.getContext('2d')!.putImageData(r.frames[k], 0, 0);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [canvases]);

  const doExport = () => {
    const files: { name: string; bytes: Uint8Array; mime: string }[] = [];
    const manifest: Record<string, unknown> = {};
    for (const def of EFFECTS) {
      const r = renderEffect(def);
      const { sheet, columnas } = effectSheet(r.frames, r.w, r.h);
      files.push({ name: `fx/${def.id}.png`, bytes: encodePng(sheet), mime: 'image/png' });
      manifest[def.id] = { archivo: `fx/${def.id}.png`, w: r.w, h: r.h, cuadros: def.cuadros, columnas, fps: def.fps, loop: def.loop, ancla: def.ancla, se_pega_a: def.se_pega_a, capa: def.capa, grupo: def.grupo, ...(def.estados ? { estados: def.estados } : {}), uso: def.uso[lang] };
    }
    files.push({ name: 'efectos.json', bytes: new TextEncoder().encode(JSON.stringify({ generado_con: 'PixelForja', fx: manifest }, null, 1)), mime: 'application/json' });
    downloadFiles(files, 'efectos.zip');
  };

  return (
    <>
      <section className={`panel stage-wrap fx-bg-${bg}`}>
        <div className="fx-grid" data-testid="effects-grid">
          {shown.map((r) => <EffectCard key={r.def.id} r={r} zoom={+zoom} lang={lang} t={t} canvases={canvases} />)}
        </div>
      </section>
      <aside className="panel side">
        <Seg label={t('ef_group')} value={group} set={(v) => setGroup(v as typeof group)} testid="effects-groups"
          opts={[['todos', t('ef_all')], ...EFFECT_GROUPS.map((g) => [g, t(`ef_g_${g}` as Parameters<T>[0])] as [string, string])]} />
        <Seg label={t('fonts_zoom')} value={zoom} set={setZoom} opts={[['2', '2x'], ['3', '3x'], ['4', '4x']]} />
        <Seg label={t('ef_bg')} value={bg} set={setBg} opts={[['oscuro', t('ef_dark')], ['claro', t('ef_light')], ['cuadros', t('ef_checker')]]} />
        <p className="muted small" data-testid="effects-count">{shown.length} / {all.length} {t('ef_count')}</p>
        <p className="muted small">{t('ef_help')}</p>
        <button className="btn primary" onClick={doExport} data-testid="effects-export">{t('ef_export')}</button>
      </aside>
    </>
  );
}
