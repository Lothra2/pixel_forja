import { describe, it, expect } from 'vitest';
import {
  MIEMBROS, TRAJES, familiar, defaultLook, clipsDe, pintarClip, MOLDES, CELDA_VIDEO, CLIPS_VIDEO_NOMBRES, clipsVideo,
  paqueteChibi, hojaChibi, escenarios, pintarEscenario, paqueteEscenario, ASSETS, pintarAsset, EFECTOS, efecto,
} from '../chibi';
import type { Raster } from '../core/raster';

const pixeles = (r: Raster) => { let n = 0; for (let i = 3; i < r.data.length; i += 4) if (r.data[i]) n++; return n; };

describe('chibi: moldes calcados del video', () => {
  it('cada cuadro de los clips del video apunta a un molde que existe', () => {
    for (const c of clipsVideo())
      for (const q of c.cuadros) if (q.p.molde) expect(MOLDES[q.p.molde], `${c.id} ${q.p.molde}`).toBeDefined();
  });

  it('trae los clips calcados y todos los nombres tienen su clip', () => {
    const ids = new Set(clipsVideo().map((c) => c.id));
    expect(ids.size).toBeGreaterThanOrEqual(30);
    for (const id of Object.keys(CLIPS_VIDEO_NOMBRES)) expect(ids.has(id), id).toBe(true);
  });

  it('toda la familia con todos sus trajes pinta la pelea a 32 y 48 sin cuadros vacíos', () => {
    for (const m of MIEMBROS) for (const t of TRAJES) {
      const l = familiar(m, t);
      for (const c of clipsDe(l).filter((x) => x.grupo === 'pelea').slice(0, m === 'thor' ? 99 : 6)) {
        const q32 = pintarClip(l, 32, c), q48 = pintarClip(l, 48, c);
        expect(q32.length).toBe(c.cuadros.length);
        for (let i = 0; i < q32.length; i++) {
          expect(pixeles(q32[i].img), `${m} ${t} ${c.id} ${i}`).toBeGreaterThan(80);
          expect(q48[i].img.w).toBe(q32[i].img.w * 2);
          expect(q48[i].img.h).toBe(q32[i].img.h * 2);
        }
      }
    }
  });

  it('ningún cuadro de la pelea trae pixeles sueltos ni poses de destello', () => {
    const islas = (r: Raster) => {
      const g = new Int32Array(r.w * r.h).fill(-1); let n = 0;
      for (let s = 0; s < r.w * r.h; s++) {
        if (!r.data[s * 4 + 3] || g[s] >= 0) continue;
        n++; g[s] = n; const pila = [s];
        while (pila.length) {
          const j = pila.pop()!, x = j % r.w, y = (j - x) / r.w;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy, k = yy * r.w + xx;
            if (xx >= 0 && yy >= 0 && xx < r.w && yy < r.h && r.data[k * 4 + 3] && g[k] < 0) { g[k] = n; pila.push(k); }
          }
        }
      }
      return n;
    };
    for (const p of Object.values(MOLDES)) expect(p.filas.join('')).not.toMatch(/[WF]/);
    for (const m of ['rick', 'sophie'] as const) for (const t of TRAJES) {
      const l = familiar(m, t);
      for (const c of clipsDe(l).filter((x) => x.grupo === 'pelea'))
        pintarClip(l, 32, c).forEach((q, i) => expect(islas(q.img), `${m} ${t} ${c.id} ${i}`).toBe(1));
    }
  });

  it('los cuadros del video usan la celda del video y los golpes traen caja', () => {
    const l = defaultLook();
    const golpe = clipsDe(l).find((c) => c.id === 'golpe_debil')!;
    const qs = pintarClip(l, 32, golpe);
    expect(qs[0].img.w).toBe(CELDA_VIDEO[0]);
    expect(qs[0].img.h).toBe(CELDA_VIDEO[1]);
    expect(qs.some((q) => q.hit)).toBe(true);
  });
});

describe('chibi: todo el catálogo de clips', () => {
  it('cada clip del muñeco base pinta todos sus cuadros', () => {
    const l = defaultLook();
    for (const c of clipsDe(l)) for (const q of pintarClip(l, 32, c)) expect(pixeles(q.img), c.id).toBeGreaterThan(40);
  });

  it('los efectos existen en las dos tallas', () => {
    for (const id of EFECTOS) for (const t of [32, 48] as const) {
      const e = efecto(id, defaultLook(), t);
      expect(e, id).not.toBeNull();
      expect(e!.frames.length, id).toBeGreaterThan(0);
    }
  });
});

describe('chibi: exportar', () => {
  it('la hoja trae manifest con cada clip y el zip es un zip', () => {
    const { hoja, manifest } = hojaChibi(familiar('rick', 'pelea'), 32, ['pelea']);
    expect(hoja.w).toBeGreaterThan(0);
    expect(manifest.formato).toBe('pixelforja-chibi');
    const { zip, archivos } = paqueteChibi([familiar('sophie', 'casual')], [32], ['pelea']);
    expect(zip[0]).toBe(0x50); expect(zip[1]).toBe(0x4b);
    expect(archivos.some((a) => a.nombre.endsWith('manifest.json'))).toBe(true);
  });
});

describe('chibi: escenarios y assets', () => {
  it('cada escenario pinta a su tamaño y exporta zip', () => {
    for (const e of escenarios()) {
      const r = pintarEscenario(e, 0);
      expect([r.w, r.h], e.id).toEqual([e.w, e.h]);
      expect(e.piso).toBeLessThan(e.h);
      const z = paqueteEscenario(e);
      expect(z[0]).toBe(0x50);
    }
  });

  it('cada asset pinta cada variante', () => {
    for (const a of ASSETS) for (const v of a.variantes) expect(pixeles(pintarAsset(a.id, v, 0, 200)), `${a.id} ${v}`).toBeGreaterThan(0);
  });
});
