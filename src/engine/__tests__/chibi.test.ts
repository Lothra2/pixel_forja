import { describe, it, expect } from 'vitest';
import {
  MIEMBROS, TRAJES, familiar, defaultLook, clipsDe, pintarClip, MOLDES, CELDA_VIDEO, CLIPS_VIDEO_NOMBRES, clipsVideo,
  paqueteChibi, hojaChibi, escenarios, pintarEscenario, paqueteEscenario, ASSETS, pintarAsset, EFECTOS, efecto,
} from '../chibi';
import type { Raster } from '../core/raster';
import { cuadroRepeticion, REP, pintarMuelle, MUELLE, piezas, camara, dibujoLuchador, cantidadDibujos } from '../chibi/repeticion';
import { pintorFamilia, moldeDeDibujo } from '../chibi/repeticionFamilia';
import { moldeDeTalla } from '../chibi/video';
import REPM from '../chibi/video/repeticionMoldes.json';
const MOLDES_REP = REPM.poses as Record<string, unknown>;

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

describe('chibi: la pelea del video reconstruida', () => {
  it('trae los 789 cuadros y cada uno pinta la pantalla completa del video', () => {
    expect(REP.cuadros).toBe(789);
    for (const k of [0, 128, 400, 700]) {
      const r = cuadroRepeticion(k);
      expect([r.w, r.h]).toEqual([180, 320]);
      expect(pixeles(r)).toBe(180 * 320);
    }
  });
  it('el muelle se pinta con cualquier cámara y los barriles rotos cambian el fondo', () => {
    const a = pintarMuelle(0, 68, 0, false), b = pintarMuelle(0, 68, 0, true);
    let dif = 0; for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) dif++;
    expect(dif).toBeGreaterThan(200);
    expect(MUELLE.w).toBeGreaterThan(180);
  });
});

describe('chibi: la familia en la pelea del video', () => {
  it('Ryu sale de su hoja de sprites limpia y las niñas tienen el cuerpo más corto', () => {
    let limpios = 0;
    for (let i = 0; i < cantidadDibujos('ryu'); i++) if (moldeDeDibujo('ryu', i)?.molde && /^h\d+$/.test(String(Object.entries(MOLDES_REP).find(([, v]) => v === moldeDeDibujo('ryu', i)!.molde)?.[0]))) limpios++;
    expect(limpios).toBeGreaterThan(400);
    const md = moldeDeDibujo('ryu', 0)!;
    const sophie = moldeDeTalla(md.molde, familiar('sophie', 'pelea').contextura), alana = moldeDeTalla(md.molde, familiar('alana', 'pelea').contextura);
    expect(sophie.molde.h).toBe(md.molde.h - 2); expect(alana.molde.h).toBe(md.molde.h - 4);
    expect(moldeDeTalla(md.molde, 'adulto').molde).toBe(md.molde);
    // la cabeza no cambia: las mismas filas de arriba
    expect(alana.molde.filas.slice(0, 10)).toEqual(md.molde.filas.slice(0, 10));
  });
  it('cada dibujo de Ryu y Ken que sale en la pelea tiene su molde sobre el dibujo', () => {
    const usados = new Set<string>();
    for (let k = 0; k < REP.cuadros; k++) for (const [t, i] of piezas(k)) if (t === 'r' || t === 'k') usados.add(t + i);
    for (const quien of ['ryu', 'ken'] as const) for (let i = 0; i < cantidadDibujos(quien); i++) {
      if (!usados.has(quien[0] + i)) continue;
      const md = moldeDeDibujo(quien, i), d = dibujoLuchador(quien, i);
      expect(md, quien + i).not.toBeNull();
      // el sprite limpio de la hoja puede pasarse un poco donde el video perdía pixeles (gi blanco sobre el barco blanco, o Ken tapando)
      expect(md!.x).toBeGreaterThanOrEqual(-6); expect(md!.y).toBeGreaterThanOrEqual(-6);
      expect(md!.x + md!.molde.w).toBeLessThanOrEqual(d.w + 6); expect(md!.y + md!.molde.h).toBeLessThanOrEqual(d.h + 6);
      expect(md!.molde.cabeza, quien + i).not.toBeNull();
    }
  });
  it('los familiares caen donde estaban Ryu y Ken y el resto del cuadro queda igual', () => {
    const pintor = pintorFamilia({ ryu: familiar('rick', 'pelea'), ken: familiar('steph', 'pelea') });
    for (const k of [0, 118, 294, 476, 700]) {
      const a = cuadroRepeticion(k), b = cuadroRepeticion(k, { pintor });
      const [cx, cy] = camara(k), [ox, oy] = MUELLE.origen;
      const cajas = piezas(k).filter((p) => p[0] === 'r' || p[0] === 'k').map(([t, i, x, y]) => {
        const d = dibujoLuchador(t === 'r' ? 'ryu' : 'ken', i);
        return [x - ox - cx - 10, y - oy - cy - 10, x - ox - cx + d.w + 10, y - oy - cy + d.h + 10];
      });
      let cambian = 0;
      for (let y = 0; y < 320; y++) for (let x = 0; x < 180; x++) {
        const o = (y * 180 + x) * 4;
        if (a.data[o] === b.data[o] && a.data[o + 1] === b.data[o + 1] && a.data[o + 2] === b.data[o + 2]) continue;
        cambian++;
        expect(cajas.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1), `cuadro ${k} (${x},${y})`).toBe(true);
      }
      expect(cambian, `cuadro ${k}`).toBeGreaterThan(100);
    }
  });
  it('el HUD lleva los nombres de la familia en lugar de RYU y KEN', () => {
    const a = cuadroRepeticion(0), b = cuadroRepeticion(0, { nombres: ['Rick', 'Steph'] });
    let dif = 0; for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) dif++;
    expect(dif).toBeGreaterThan(100);
    const c = cuadroRepeticion(0, { hud: false, nombres: ['Rick', 'Steph'] }), d = cuadroRepeticion(0, { hud: false });
    expect(Buffer.from(c.data).equals(Buffer.from(d.data))).toBe(true);
  });
});

describe('chibi: saltos y movimientos con el avance del video', () => {
  const clip = (id: string) => clipsVideo().find((c) => c.id === id)!;
  it('los saltos despegan y aterrizan en el piso; adelante avanza y atrás retrocede', () => {
    for (const id of ['saltar', 'salto_adelante', 'salto_atras']) {
      const q = clip(id).cuadros;
      expect(q[0].dy ?? 0, id).toBeLessThanOrEqual(4);
      expect(q[q.length - 1].dy ?? 0, id).toBeLessThanOrEqual(1);
      expect(Math.max(...q.map((x) => x.dy ?? 0)), id).toBeGreaterThan(40);
    }
    const avance = (id: string) => clip(id).cuadros.reduce((s, q) => s + (q.dx ?? 0), 0);
    expect(avance('salto_adelante')).toBeGreaterThan(40);
    expect(avance('salto_atras')).toBeLessThan(-40);
    expect(Math.abs(avance('saltar'))).toBeLessThan(1);
  });
  it('la torbellino vuelve al piso', () => {
    const q = clip('torbellino').cuadros;
    expect(q[q.length - 1].dy).toBe(0);
  });
});
