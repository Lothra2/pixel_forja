import { describe, it, expect } from 'vitest';
import { PODERES, pintarPoder } from '../gotico/poderes';
import { LUZ_EFECTO } from '../gotico/luz_efectos';
import { curvaDoom } from '../gotico/poderes_doom';

const dif = (a: Uint8ClampedArray, b: Uint8ClampedArray) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 3] - b[i + 3]); return s; };
/** brillo medio (r + g + b de lo que se ve, pesado por el alfa) en una caja del cuadro */
function brillo(img: { w: number; h: number; data: Uint8ClampedArray }, x0: number, y0: number, x1: number, y1: number): { k: number; azulRojo: number } {
  let s = 0, n = 0, r = 0, b = 0;
  for (let y = Math.max(0, y0); y < Math.min(img.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(img.w, x1); x++) {
    const i = (y * img.w + x) * 4, a = img.data[i + 3] / 255;
    s += ((img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3) * a; r += img.data[i] * a; b += img.data[i + 2] * a; n++;
  }
  return { k: s / Math.max(1, n), azulRojo: b / Math.max(1, r) };
}
/** el pixel más caliente (más claro, con algo de alfa) en una caja: r, g, b */
function masClaro(img: { w: number; h: number; data: Uint8ClampedArray }, x0: number, y0: number, x1: number, y1: number): [number, number, number] {
  let best: [number, number, number] = [0, 0, 0];
  for (let y = Math.max(0, y0); y < Math.min(img.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(img.w, x1); x++) {
    const i = (y * img.w + x) * 4;
    if (img.data[i + 3] < 200) continue;
    if (img.data[i] + img.data[i + 1] + img.data[i + 2] > best[0] + best[1] + best[2]) best = [img.data[i], img.data[i + 1], img.data[i + 2]];
  }
  return best;
}

describe('aliento infernal con fuego de Doom direccional', () => {
  const p = PODERES.find((x) => x.id === 'aliento_infernal')!;

  it('conserva id, cuadros, celda y ancla; su luz sale del calor de la llama', () => {
    expect([p.cuadros, p.t, p.bucle, p.direccional, p.tipo, p.celda, p.ancla]).toEqual([8, 2, true, true, 'rayo', [411, 251], [205, 147]]);
    expect(LUZ_EFECTO.aliento_infernal.curva).toEqual(curvaDoom('aliento_infernal'));
    expect(LUZ_EFECTO.aliento_infernal.curva.length).toBe(8);
  });

  it('sopla a lo largo del chorro: la boca es blanca amarilla, la punta se enfría y la llama sigue la dirección', () => {
    // dirección e (6): el chorro va a la derecha del ancla; la boca queda a ~14 px, la punta a ~150 px
    const { img, ancla } = pintarPoder('aliento_infernal', 6, 3);
    const [ax, ay] = ancla, yb = ay - 49;
    const boca = masClaro(img, ax + 8, yb - 8, ax + 30, yb + 8);
    expect(Math.min(...boca), `boca ${boca}`).toBeGreaterThan(200);
    expect(boca[2], 'la boca es blanca amarilla, no blanca azulada').toBeLessThan(boca[0]);
    const cerca = brillo(img, ax + 20, yb - 20, ax + 70, yb + 20), lejos = brillo(img, ax + 110, yb - 40, ax + 170, yb + 30);
    expect(cerca.k).toBeGreaterThan(lejos.k * 1.5);
    expect(lejos.k, 'la punta tiene llama').toBeGreaterThan(2);
    // en la otra mano (o) la llama está a la izquierda y no a la derecha
    const o = pintarPoder('aliento_infernal', 2, 3).img;
    expect(brillo(o, ax - 160, yb - 40, ax - 20, yb + 30).k).toBeGreaterThan(brillo(o, ax + 20, yb - 40, ax + 160, yb + 30).k * 4);
  });

  it('el bucle empalma en todas las direcciones y nada toca el borde de la celda', () => {
    for (let d = 0; d < 8; d++) {
      const fs = Array.from({ length: 8 }, (_, f) => pintarPoder('aliento_infernal', d, f).img);
      let paso = 0; for (let f = 0; f < 7; f++) paso += dif(fs[f].data, fs[f + 1].data);
      expect(dif(fs[7].data, fs[0].data), `dir ${d}`).toBeLessThan((paso / 7) * 1.6);
      for (const q of fs) {
        let borde = 0;
        for (let x = 0; x < q.w; x++) borde = Math.max(borde, q.data[x * 4 + 3], q.data[((q.h - 1) * q.w + x) * 4 + 3]);
        for (let y = 0; y < q.h; y++) borde = Math.max(borde, q.data[y * q.w * 4 + 3], q.data[(y * q.w + q.w - 1) * 4 + 3]);
        expect(borde, `dir ${d}`).toBeLessThanOrEqual(8);
      }
    }
  }, 120_000);
});

describe('llanto de ánimas en capas', () => {
  const p = PODERES.find((x) => x.id === 'llanto_animas')!;

  it('conserva id, formato, celda y ancla; la luz sale del calor y se apaga al final', () => {
    expect([p.cuadros, p.t, p.bucle, p.direccional, p.tipo, p.celda, p.ancla]).toEqual([14, 2, false, false, 'area', [219, 170], [110, 116]]);
    const c = LUZ_EFECTO.llanto_animas.curva;
    expect(c).toEqual(curvaDoom('llanto_animas'));
    expect(c[c.length - 1]).toBeLessThan(0.35);
  });

  it('es fuego frío (cian, no un aro naranja), con el centro oscuro y lenguas que suben', () => {
    const { img, ancla } = pintarPoder('llanto_animas', 0, 7);
    const [ax, ay] = ancla;
    const todo = brillo(img, 0, 0, img.w, img.h);
    expect(todo.azulRojo, 'cian').toBeGreaterThan(1.3);
    // el núcleo (alrededor del ancla) más oscuro que el frente de la onda (a ~70 px al costado)
    const nucleo = brillo(img, ax - 18, ay - 6, ax + 18, ay + 6), frente = brillo(img, ax + 62, ay - 10, ax + 92, ay + 10);
    expect(frente.k).toBeGreaterThan(nucleo.k * 2);
    // jirones: hay luz bien por encima del piso (más de 40 px arriba del frente)
    expect(brillo(img, 0, 0, img.w, ay - 50).k).toBeGreaterThan(0.4);
  });
});
