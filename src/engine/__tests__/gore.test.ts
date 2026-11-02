import { describe, it, expect } from 'vitest';
import { REGISTRO, objeto, herramientas, pintarObjeto } from '../gotico/objeto';
import { fijarCalidad, type Escena, type Pieza } from '../gotico/render';
import { MATERIALES } from '../gotico/materiales';
import '../gotico/catalogo/gore';
import { LUCES_HORROR, veloSangre } from '../gotico/catalogo/horror';
import { exportarGoreHorror, GRUPOS_GORE } from '../kit/gorekit';
import { decodePng } from '../export/png';

const ids = Object.values(GRUPOS_GORE).flatMap((g) => g.ids);
/** Lo que es "emite" pero no alumbra: la oscuridad de la sombra y el humo. */
const OSCUROS = new Set(['hor_sombra', 'hor_humo', 'hor_espectro', 'negro']);
const brilla = (ps: Pieza[]) => ps.some((p) => !p.resta && (p.k === 'masa' ? p.comps.some((c) => MATERIALES[c.mat ?? p.mat]?.emite && !OSCUROS.has(c.mat ?? p.mat)) : MATERIALES[p.mat]?.emite && !OSCUROS.has(p.mat)));

describe('kit de sangre y horror', () => {
  it('cada asset del kit está registrado, en el tema misterio, con sus variantes y cuadros', () => {
    for (const id of ids) { const d = objeto(id); expect(d.tema).toBe('misterio'); expect(d.variantes.length, id).toBeGreaterThan(0); }
    expect(objeto('gore_salpicadura').variantes.length).toBe(48);
    expect(objeto('gore_charco').cuadros).toBe(8);
    expect(objeto('gore_reventon').variantes).toEqual(['rojo', 'no_muerto', 'bestia']);
    for (const id of ids.filter((x) => x.startsWith('gore_gib_'))) expect(objeto(id).cuadros, id).toBe(8);
    expect(REGISTRO.filter((d) => d.id.startsWith('gore_') || d.id.startsWith('hor_')).length).toBe(ids.length);
  });
  it('lo que brilla declara su luz (resplandor y tabla) y lo que no brilla no la declara', () => {
    for (const id of ids) {
      const d = objeto(id);
      for (const v of d.variantes) {
        const r = d.armar(v, 0, herramientas(1)), e: Escena = Array.isArray(r) ? { piezas: r } : r;
        const luz = LUCES_HORROR.find((l) => l.id === id && l.variantes.includes(v));
        expect(!!e.resplandor, `${id} ${v} resplandor`).toBe(!!luz);
        expect(brilla(e.piezas), `${id} ${v} brilla`).toBe(!!luz);
        if (luz) { expect(e.resplandor!.color).toBe(luz.color); expect(luz.radio).toBeGreaterThan(0); expect(luz.intensidad).toBeLessThanOrEqual(1); expect(luz.parpadeo).toBeLessThanOrEqual(1); }
      }
    }
  });
  it('los pedazos dan la vuelta en 8 cuadros del mismo tamaño', () => {
    fijarCalidad(0);
    const qs = Array.from({ length: 8 }, (_, f) => pintarObjeto('gore_gib_brazo', 'rojo', f, 2));
    for (const q of qs) { expect(q.img.w).toBe(qs[0].img.w); expect(q.ancla).toEqual(qs[0].ancla); }
    expect(qs[0].img.data.some((v, i) => v !== qs[2].img.data[i])).toBe(true);
    fijarCalidad(1);
  });
  it('el velo de sangre tapa más con cada nivel y deja limpio el centro', () => {
    const alfa = (n: 1 | 2 | 3) => { const r = veloSangre(n, 320, 180); let s = 0; for (let i = 3; i < r.data.length; i += 4) s += r.data[i]; return { s, r }; };
    const [a, b, c] = [alfa(1), alfa(2), alfa(3)];
    expect(a.s).toBeLessThan(b.s); expect(b.s).toBeLessThan(c.s);
    expect(c.r.data[(90 * 320 + 160) * 4 + 3]).toBe(0);
    expect(veloSangre(1).w).toBe(960);
  });
  it('el kit sale en atlas de a 60 como mucho, sin texturas de más de 4096 px', () => {
    const { files, manifest } = exportarGoreHorror({ rapido: true, calidad: 0, ids: ['gore_gib_trozo', 'hor_ojos', 'gore_gotas'] });
    let cuadros = 0;
    for (const f of files) {
      if (f.name.endsWith('.png')) { const r = decodePng(f.bytes); expect(r.w).toBeLessThanOrEqual(4096); expect(r.h).toBeLessThanOrEqual(4096); }
      if (f.name.endsWith('.json')) { const fr = Object.keys(JSON.parse(new TextDecoder().decode(f.bytes)).frames); cuadros += fr.length; expect(new Set(fr.map((k) => k.split('/').slice(0, 3).join('/'))).size).toBeLessThanOrEqual(60); }
    }
    // rápido: dos variantes y una semilla
    expect(cuadros).toBe(2 * 8 + 2 * 12 + 2);
    expect((manifest.assets as Record<string, { luz?: unknown }>).hor_ojos.luz).toBeTruthy();
  }, 120000);
});
