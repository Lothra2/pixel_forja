import { useEffect, useMemo, useRef, useState } from 'react';
import hemLayout from '../../../docs/ejemplos/nekketsu/escenarios/saigon_hem.layout.json';
import { generarEscenario, type ResultadoEscenario } from '../../engine/world/oblique';
import { PARALAJE, TROZO } from '../../engine/world/oblique/escena';
import { boxesOf, depthOf } from '../../engine/world/oblique/layout';
import type { Raster } from '../../engine/index';
import type { FrameSet } from '../protocol';
import type { T } from '../components/ui';
import { Seg, Toggle } from '../components/ui';
import { downloadFiles } from '../util';

const canvasDe = (r: Raster) => {
  const c = document.createElement('canvas');
  c.width = r.w; c.height = r.h;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(r.data), r.w, r.h), 0, 0);
  return c;
};

interface Capas {
  cielo: HTMLCanvasElement; lejos: HTMLCanvasElement; cerca: HTMLCanvasElement; piso: HTMLCanvasElement;
  mojado: HTMLCanvasElement | null; frente: HTMLCanvasElement;
  objetos: { c: HTMLCanvasElement; x: number; y: number; orden: number }[];
  vida: { cuadros: HTMLCanvasElement[]; x: number; y: number; fps: number; capa: string; velocidad?: number; cada?: number }[];
}

/**
 * Escena: abre un layout oblicuo, lo pinta con todas sus capas y pone al personaje del estudio a correr por la franja.
 * Se ve el paralaje, la vida, el clima y, si se pide, la colisión del layout encima.
 */
export function EscenaStep({ t, walker }: { t: T; walker: FrameSet | null }) {
  const [layout, setLayout] = useState<unknown>(hemLayout);
  const [nombre, setNombre] = useState('saigon_hem.layout.json');
  const [res, setRes] = useState<ResultadoEscenario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [clima, setClima] = useState<'despejado' | 'aguacero'>('despejado');
  const [vida, setVida] = useState(true);
  const [colision, setColision] = useState(false);
  const [carril, setCarril] = useState(1);
  const [auto, setAuto] = useState(true);
  const [x, setX] = useState(0);
  const ref = useRef<HTMLCanvasElement>(null);
  const pos = useRef({ x: 40, t0: 0 });

  // pintar el escenario (tarda un par de segundos: se deja respirar a la página antes)
  useEffect(() => {
    setCargando(true);
    const id = setTimeout(() => { setRes(generarEscenario(layout, { postales: true, ficha: true })); setCargando(false); }, 30);
    return () => clearTimeout(id);
  }, [layout]);

  const capas = useMemo<Capas | null>(() => {
    const E = res?.escena;
    if (!E) return null;
    return {
      cielo: canvasDe(E.cielo.r), lejos: canvasDe(E.lejos.r), cerca: canvasDe(E.cerca.r), piso: canvasDe(E.piso.r),
      mojado: E.pisoMojado ? canvasDe(E.pisoMojado.r) : null, frente: canvasDe(E.frente.r),
      objetos: E.objetos.map((o) => ({ c: canvasDe(o.img.r), x: o.x, y: o.y, orden: o.orden })),
      vida: E.vida.map((v) => ({ cuadros: v.cuadros.map((q) => canvasDe(q.r)), x: v.x, y: v.y, fps: v.fps, capa: v.capa, velocidad: v.velocidad, cada: v.cada })),
    };
  }, [res]);

  const cuadros = useMemo(() => walker?.frames.map((f) => canvasDe({ w: walker.cell, h: walker.cell, data: f } as Raster)) ?? [], [walker]);

  // dibujo cuadro a cuadro
  useEffect(() => {
    const cv = ref.current, E = res?.escena;
    if (!cv || !capas || !E) return;
    const g = cv.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const L = E.layout, FT = L.franja.atras, D = depthOf(L);
    const meta = (L.entidades.find((e) => e.tipo === 'meta')?.x as number | undefined) ?? L.largo - 40;
    const salida = (L.entidades.find((e) => e.tipo === 'salida')?.x as number | undefined) ?? 40;
    const yCarril = L.carriles[Math.min(carril, L.carriles.length) - 1]?.y ?? Math.floor(D / 2);
    let raf = 0;
    const draw = (now: number) => {
      const t = now / 1000;
      // el personaje corre solo de la salida a la meta, o se queda donde lo dejó el deslizador
      if (auto) { pos.current.x += 2; if (pos.current.x > meta + 30) pos.current.x = salida; }
      const ax = auto ? pos.current.x : x;
      const cam = Math.max(0, Math.min(L.largo - 640, Math.round(ax - 220)));
      g.clearRect(0, 0, 640, 360);
      for (let sx = -((cam * PARALAJE.cielo) % capas.cielo.width); sx < 640; sx += capas.cielo.width) g.drawImage(capas.cielo, sx, 0);
      const lx = Math.floor(cam * PARALAJE.lejos) % capas.lejos.width;
      for (let sx = -lx; sx < 640; sx += capas.lejos.width) g.drawImage(capas.lejos, sx, FT - 30 - capas.lejos.height);
      if (vida) for (const v of capas.vida) if (v.capa === 'tras_cerca' && v.velocidad) {
        const vx = Math.round(cam + 640 + ((t % (v.cada ?? 5)) * v.velocidad));
        g.drawImage(v.cuadros[Math.floor(t * v.fps) % v.cuadros.length], vx - cam, v.y);
      }
      g.drawImage(capas.cerca, cam, 0, 640, capas.cerca.height, 0, 0, 640, capas.cerca.height);
      if (vida) for (const v of capas.vida) if (v.capa === 'cerca' && v.x + v.cuadros[0].width > cam && v.x < cam + 640) g.drawImage(v.cuadros[Math.floor(t * v.fps) % v.cuadros.length], v.x - cam, v.y);
      g.drawImage(capas.piso, cam, 0, 640, capas.piso.height, 0, FT, 640, capas.piso.height);
      if (clima === 'aguacero' && capas.mojado) g.drawImage(capas.mojado, cam, 0, 640, capas.mojado.height, 0, FT, 640, capas.mojado.height);
      // objetos y el personaje, ordenados por profundidad
      const lista: { orden: number; draw: () => void }[] = capas.objetos.filter((o) => o.x + o.c.width > cam && o.x < cam + 640).map((o) => ({ orden: o.orden, draw: () => g.drawImage(o.c, o.x - cam, o.y) }));
      if (cuadros.length && walker) {
        const k = Math.floor(t * walker.fps) % cuadros.length, cell = walker.cell;
        lista.push({ orden: yCarril + 0.5, draw: () => g.drawImage(cuadros[k], ax - cam - cell / 2, FT + yCarril - cell + 2) });
      }
      lista.sort((a, b) => a.orden - b.orden).forEach((d) => d.draw());
      g.drawImage(capas.frente, cam, 0, 640, capas.frente.height, 0, E.frenteY, 640, capas.frente.height);
      if (clima === 'aguacero') {
        // lluvia: rayitas que caen, solo para ver el clima en el estudio
        g.fillStyle = 'rgba(207,228,238,0.55)';
        for (let i = 0; i < 90; i++) { const rx = (i * 97 + t * 40) % 640, ry = (i * 53 + t * 420) % 360; g.fillRect(rx, ry, 1, 6); }
      }
      if (colision) {
        g.lineWidth = 1;
        g.strokeStyle = '#ff3d7f';
        for (const b of boxesOf(L)) g.strokeRect(b.x - cam + 0.5, FT + b.y - b.z + 0.5, b.w - 1, b.d + b.z - 1);
        g.strokeStyle = '#38e1ff';
        for (const h of L.huecos) g.strokeRect(h.x0 - cam + 0.5, FT + (h.y0 ?? 0) + 0.5, h.x1 - h.x0 - 1, (h.y1 ?? D) - (h.y0 ?? 0) - 1);
        g.strokeStyle = '#ffd23f';
        for (const b of L.bajo) g.strokeRect(b.x0 - cam + 0.5, FT + (b.y0 ?? 0) - b.z + 0.5, b.x1 - b.x0 - 1, (b.y1 ?? D) - (b.y0 ?? 0) - 1);
        g.strokeStyle = 'rgba(255,255,255,0.5)';
        g.strokeRect(0.5, FT + 0.5, 639, D - 1);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [capas, res, clima, vida, colision, carril, auto, x, cuadros, walker]);

  const abrir = (f: File) => {
    f.text().then((s) => {
      try { setLayout(JSON.parse(s)); setNombre(f.name); } catch { setRes({ ok: false, id: null, errores: [t('sc_badJson')], avisos: [], pruebas: [], archivos: [], escena: null, layout: null }); }
    });
  };
  const exportar = () => {
    if (!res?.ok) return;
    downloadFiles(res.archivos.map((a) => ({ name: `escenarios/${res.id}/${a.nombre}`, bytes: a.bytes, mime: a.nombre.endsWith('.png') ? 'image/png' : a.nombre.endsWith('.json') ? 'application/json' : 'text/markdown' })), `${res.id}.zip`);
  };
  const L = res?.layout;
  const carriles = L?.carriles.length ? L.carriles.map((_, i) => [String(i + 1), String(i + 1)] as [string, string]) : [['1', '1'] as [string, string]];

  return (
    <>
      <section className="panel stage-wrap">
        <div className="scene-stage" data-testid="scene-stage">
          {cargando && <p className="muted" data-testid="scene-loading">{t('sc_loading')}</p>}
          <canvas ref={ref} width={640} height={360} className="pixel scene-canvas" data-testid="scene-canvas" style={{ display: capas ? undefined : 'none' }} />
        </div>
        {res && !res.ok && (
          <ul className="scene-errors" data-testid="scene-errors">{res.errores.map((e) => <li key={e}>{e}</li>)}</ul>
        )}
        {res && res.pruebas.length > 0 && (
          <table className="scene-tests" data-testid="scene-tests">
            <tbody>{res.pruebas.map((p) => <tr key={p.n} className={p.ok ? 'ok' : 'bad'}><td>{p.ok ? '✓' : '✗'}</td><td><strong>{p.n}. {p.nombre}</strong></td><td className="muted small">{p.detalle}</td></tr>)}</tbody>
          </table>
        )}
      </section>
      <aside className="panel side">
        <label className="field">{t('sc_open')}<input type="file" accept=".json,application/json" onChange={(e) => e.target.files?.[0] && abrir(e.target.files[0])} data-testid="scene-file" /></label>
        <p className="muted small" data-testid="scene-name">{nombre}{L ? ` · ${L.largo} × ${depthOf(L)} · ${L.hora}` : ''}</p>
        {res?.avisos.length ? <ul className="muted small">{res.avisos.map((a) => <li key={a}>{a}</li>)}</ul> : null}
        <Seg label={t('sc_weather')} value={clima} set={(v) => setClima(v as 'despejado' | 'aguacero')} testid="scene-weather" opts={[['despejado', t('sc_clear')], ['aguacero', t('sc_rain')]]} />
        <Seg label={t('sc_lane')} value={String(carril)} set={(v) => setCarril(+v)} opts={carriles} />
        <Toggle label={t('sc_life')} on={vida} set={setVida} />
        <Toggle label={t('sc_collision')} on={colision} set={setColision} testid="scene-collision" />
        <Toggle label={t('sc_auto')} on={auto} set={setAuto} />
        {!auto && L && <label className="field">x <output>{x}</output><input type="range" min={0} max={L.largo} value={x} onChange={(e) => setX(+e.target.value)} data-testid="scene-x" /></label>}
        <p className="muted small">{t('sc_help')}</p>
        <button className="btn primary" disabled={!res?.ok} onClick={exportar} data-testid="scene-export">{t('sc_export')}</button>
        <p className="muted small">{TROZO} px · {t('sc_note')}</p>
      </aside>
    </>
  );
}
