import { describe, it, expect } from 'vitest';
import { caja, baseCamara, rayoCamara, proyectar, pintarCamara, ArbolCajas, type Camara, type V3 } from '../gotico/render';

const cam = (pos: V3, obj: V3, fov = 40, w = 160, h = 90): Camara => ({ pos, obj, fov, w, h });

describe('cámara libre: perspectiva', () => {
  it('el rayo de un pixel pasa por el punto que se proyecta en ese pixel', () => {
    const b = baseCamara(cam([10, -300, 40], [0, 0, 60], 35, 320, 180));
    for (const p of [[0, 0, 60], [40, 20, 10], [-80, 150, 120]] as V3[]) {
      const [x, y, d] = proyectar(b, p)!;
      const r = rayoCamara(b, x, y), q: V3 = [b.cam.pos[0] + r[0] * d, b.cam.pos[1] + r[1] * d, b.cam.pos[2] + r[2] * d];
      expect(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2])).toBeLessThan(1e-6);
    }
    expect(proyectar(b, [10, -600, 40])).toBeNull();
  });
  it('lo que está al doble de distancia se ve a la mitad (y el objetivo cae en el centro)', () => {
    const ancho = (dist: number) => {
      const img = pintarCamara({ piezas: [caja(0, 0, -10, 20, 20, 20, { mat: 'piedra' })] }, cam([0, -dist, 0], [0, 0, 0], 30, 200, 200));
      let x0 = 999, x1 = -1;
      for (let x = 0; x < 200; x++) if (img.data[(100 * 200 + x) * 4 + 3] > 127) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
      expect(img.data[(100 * 200 + 100) * 4 + 3]).toBe(255);
      return x1 - x0 + 1;
    };
    const a = ancho(200), b = ancho(400);
    expect(a / b).toBeGreaterThan(1.85); expect(a / b).toBeLessThan(2.15);
  });
});

describe('cámara libre: árbol de cajas', () => {
  it('encuentra lo mismo que probar todo, y la pieza que cava solo cava su propio grupo', () => {
    const muroA = caja(0, 0, 0, 80, 10, 60, { mat: 'piedra' }), huecoA = caja(0, 0, 0, 20, 30, 40, { mat: 'piedra', resta: true }), muroB = caja(0, 40, 0, 80, 10, 60, { mat: 'madera' });
    const ar = new ArbolCajas([muroA, huecoA, muroB], [0, 0, 1]);
    const g = ar.golpe([0, -200, 20], [0, 1, 0]);
    expect(g?.mat).toBe('madera'); expect(g!.t).toBeCloseTo(235, 5);
    expect(ar.golpe([30, -200, 20], [0, 1, 0])?.mat).toBe('piedra');
    const ps = Array.from({ length: 300 }, (_, i) => caja((i % 20) * 30 - 300, Math.floor(i / 20) * 30, 0, 12, 12, 10 + (i % 7) * 5, { mat: 'piedra' }));
    const ar2 = new ArbolCajas(ps, ps.map((_, i) => i));
    for (let k = 0; k < 40; k++) {
      const d = [Math.cos(k) * 0.3, 1, -0.2 - (k % 5) * 0.05] as V3, l = Math.hypot(...d), u: V3 = [d[0] / l, d[1] / l, d[2] / l], o: V3 = [-50 + k * 3, -100, 60];
      // fuerza bruta: el primer tramo de todas las piezas
      let mejor = Infinity;
      for (const p of ps) { const r = new ArbolCajas([p], [0]).golpe(o, u); if (r && r.t < mejor) mejor = r.t; }
      expect(ar2.golpe(o, u)?.t ?? Infinity).toBeCloseTo(mejor, 6);
    }
  });
});
