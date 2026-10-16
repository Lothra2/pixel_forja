import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { decodePng } from '../export/png';
import { escenarioDesdeManifest, estadoFarol, factorFila, petalos, pintarFondo, pintarFrente, seguirCamara, VISTA, type ManifestEscenario } from '../luchador/pixel/parallax';
import { ROOT } from './helpers';

const DIR = join(ROOT, 'public', 'escenarios', 'japon');
const M = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8')) as ManifestEscenario & { camara: unknown };
const E = escenarioDesdeManifest(M, Object.fromEntries([...M.capas, ...M.frente].map((c) => [c.img, decodePng(readFileSync(join(DIR, c.img)))])));
const clave = ([r, g, b]: number[]) => (r << 16) | (g << 8) | b;
const colores = (d: Uint8ClampedArray) => { const s = new Set<number>(); for (let i = 0; i < d.length; i += 4) if (d[i + 3]) s.add(clave([d[i], d[i + 1], d[i + 2]])); return s; };
const esquinas = [
  { x: E.camara.x0, y: E.camara.y0 }, { x: E.camara.x1, y: E.camara.y0 },
  { x: E.camara.x0, y: E.camara.y1 }, { x: E.camara.x1, y: E.camara.y1 },
];

describe('escenario japonés por capas', () => {
  it('las capas miden lo mismo, comparten una paleta de 96 tonos y el manifest coincide', () => {
    expect([E.w, E.h]).toEqual([M.w, M.h]);
    expect(E.capas.map((c) => c.nombre)).toEqual(['cielo', 'montes', 'castillo', 'muro', 'piso', 'frente']);
    expect(E.paleta.length).toBeLessThanOrEqual(96);
    // de atrás para adelante cada capa se corre más
    const f = E.capas.map((c) => c.factor);
    expect([...f].sort((a, b) => a - b)).toEqual(f);
    expect(E.camara).toEqual(M.camara);
    expect(E.titila.size).toBeGreaterThan(3);
    expect(E.rosas.length).toBeGreaterThan(1);
  });

  it('en las cuatro puntas de la cámara el fondo cubre toda la vista y el frente no se sale de su imagen', () => {
    for (const cam of esquinas) {
      const f = pintarFondo(E, cam, 0);
      let huecos = 0;
      for (let i = 3; i < f.data.length; i += 4) if (f.data[i] !== 255) huecos++;
      expect(huecos, JSON.stringify(cam)).toBe(0);
    }
    const cx = (E.w - VISTA.w) / 2, rapido = Math.max(...E.capas.map((c) => c.factor));
    for (const x of [E.camara.x0, E.camara.x1]) {
      const ox = Math.round(cx + (x - cx) * rapido);
      expect(ox).toBeGreaterThanOrEqual(0);
      expect(ox + VISTA.w).toBeLessThanOrEqual(E.w);
    }
  });

  it('el piso no resbala bajo los pies: la fila del piso va a 1, la de arriba más lenta y la de abajo más rápida', () => {
    const piso = E.capas.find((c) => c.nombre === 'piso')!;
    expect(factorFila(E, piso, E.piso)).toBeCloseTo(1, 6);
    expect(factorFila(E, piso, 190)).toBeCloseTo(0.8, 2);
    expect(factorFila(E, piso, E.h - 1)).toBeGreaterThan(1);
    expect(factorFila(E, piso, E.h - 1)).toBeLessThanOrEqual(1.2);
    // la fila de los pies se corre exactamente lo que se corre la cámara (sin pétalos ni faroles de por medio)
    const y = E.piso - E.camara.y1;
    const a = pintarFondo(E, { x: 100, y: E.camara.y1 }, 0), b = pintarFondo(E, { x: 110, y: E.camara.y1 }, 0);
    const fila = (r: typeof a, x0: number) => Array.from(r.data.subarray((y * VISTA.w + x0) * 4, (y * VISTA.w + x0 + 200) * 4));
    const iguales = fila(b, 50).filter((v, i) => v === fila(a, 60)[i]).length;
    expect(iguales / 800).toBeGreaterThan(0.97);
  });

  it('los faroles titilan sin colores nuevos y el muro no se despega del piso al subir la cámara', () => {
    const pal = new Set(E.paleta.map(clave)), rosas = new Set(E.rosas.map(clave));
    const cam = { x: 113, y: E.camara.y1 };
    for (let t = 0; t < 80; t += 5) {
      const f = pintarFondo(E, cam, t), fr = pintarFrente(E, cam, t);
      for (const c of [...colores(f.data), ...colores(fr.data)]) expect(pal.has(c) || rosas.has(c)).toBe(true);
    }
    // entre dos ticks cambian pixeles de luz, no solo los pétalos que pasan
    const a = pintarFondo(E, cam, 0).data, b = pintarFondo(E, cam, 20).data;
    let luces = 0;
    for (let i = 0; i < a.length; i += 4) {
      const ca = clave([a[i], a[i + 1], a[i + 2]]), cb = clave([b[i], b[i + 1], b[i + 2]]);
      if (ca !== cb && !rosas.has(ca) && !rosas.has(cb) && (E.titila.has(ca) || E.titila.has(cb) || [...E.titila.values()].some((v) => v.includes(ca)))) luces++;
    }
    expect(luces).toBeGreaterThan(50);
    expect(new Set(Array.from({ length: 16 }, (_, t) => estadoFarol(0, t * 5))).size).toBe(3);
    const muro = E.capas.find((c) => c.nombre === 'muro')!, piso = E.capas.find((c) => c.nombre === 'piso')!;
    expect(muro.factorY).toBe(1);
    expect(piso.factorY ?? Math.min(1, piso.factor)).toBe(1);
  });

  it('los pétalos caen, se mecen y solo dependen del tick y la cámara', () => {
    const cam = { x: 113, y: E.camara.y1 };
    const a = petalos(E, cam, 10, 'atras'), c = petalos(E, cam, 40, 'atras');
    expect(a).toEqual(petalos(E, cam, 10, 'atras'));
    expect(a.length).toBe(18);
    expect(petalos(E, cam, 10, 'frente').length).toBe(10);
    expect(a.filter((p, i) => c[i].y > p.y).length).toBeGreaterThan(a.length / 2);
    for (const p of a) { expect(p.x).toBeGreaterThanOrEqual(-20); expect(p.x).toBeLessThan(VISTA.w + 20); }
  });

  it('la cámara sigue el medio de los dos, no se sale de su rango y sube con el salto', () => {
    expect(seguirCamara(E, [300, 380], 0)).toEqual({ x: 340 - VISTA.w / 2, y: E.camara.y1 });
    expect(seguirCamara(E, [0, 40], 0).x).toBe(E.camara.x0);
    expect(seguirCamara(E, [560, 600], 0).x).toBe(E.camara.x1);
    expect(seguirCamara(E, [300, 380], 50).y).toBe(E.camara.y1 - 20);
    expect(seguirCamara(E, [300, 380], 500).y).toBe(E.camara.y0);
  });
});
