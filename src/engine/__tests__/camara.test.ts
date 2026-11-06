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

describe('escena de cine: terreno, luz y aire', () => {
  it('traza una escena chica con terreno, una casa puesta y su luz, y el aire se come lo lejano', async () => {
    const { EscenaCine, Terreno, capasVacias, renderFilas, transmision } = await import('../gotico/cine3d');
    const esc = new EscenaCine();
    esc.terreno = new Terreno({ alto: (x, y) => Math.sin(x / 300) * 20 + y * 0.02, superficie: () => ({ albedo: [0.7, 0.7, 0.75] }), grillas: [[-2000, -500, 2000, 6000, 10]], techo: 400 });
    esc.poner([caja(0, 0, 0, 60, 60, 80, { mat: 'piedra' })], { x: 0, y: 600, z: esc.terreno.h(0, 600), giro: 30 });
    esc.luces.push({ p: [0, 540, esc.terreno.h(0, 540) + 30], c: [1, 0.6, 0.3], k: 2, r: 40 });
    const atm = {
      sol: { dir: [0.3, 0.8, 0.5] as V3, c: [1, 0.9, 0.8] as [number, number, number], k: 2 }, cielo: () => [0.2, 0.25, 0.4] as [number, number, number], aire: () => [0.2, 0.25, 0.4] as [number, number, number],
      ambCielo: [0.1, 0.12, 0.2] as [number, number, number], ambSuelo: [0.05, 0.05, 0.05] as [number, number, number], niebla: { densidad: 1 / 3000, baja: 0, z0: 0, H: 50 }, borde: { c: [1, 0.8, 0.6] as [number, number, number], k: 1 },
    };
    const c0 = cam([0, 0, 60], [0, 600, 60], 50, 48, 27), c = capasVacias(48, 27, []);
    renderFilas(esc, atm, c0, c, 0, 27, { ss: 1, ao: 1 });
    const I = 13 * 48 + 24;
    expect(c.dist[I]).toBeGreaterThan(500); expect(c.dist[I]).toBeLessThan(620);
    expect(c.base[I * 3] + c.base[I * 3 + 1] + c.base[I * 3 + 2]).toBeGreaterThan(0);
    expect(c.cielo[0]).toBe(1);
    expect(isFinite(c.dist[26 * 48 + 24])).toBe(true);
    expect(transmision(atm, c0.pos, [0, 1, 0], 4000)).toBeLessThan(transmision(atm, c0.pos, [0, 1, 0], 500));
    // el pase del primer plano: sin piezas al frente queda vacío (todo transparente)
    const f = capasVacias(48, 27, []);
    renderFilas(esc, atm, c0, f, 0, 27, { ss: 1, ao: 0, pase: 'frente' });
    expect(f.cielo.every((v) => v === 1)).toBe(true);
  });
  it('colocar piezas: mover, girar y escalar conservan la forma', async () => {
    const { colocarPiezas } = await import('../gotico/cine3d');
    const [p] = colocarPiezas([caja(0, 0, 0, 10, 20, 30, { mat: 'piedra' })], { x: 100, y: -50, z: 7, giro: 90, k: 2 });
    if (p.k !== 'conv') throw new Error('se esperaba un poliedro');
    for (const q of p.pts) for (const [n, d] of p.planos) expect(n[0] * q[0] + n[1] * q[1] + n[2] * q[2]).toBeLessThanOrEqual(d + 1e-6);
    const xs = p.pts.map((q) => q[0]), zs = p.pts.map((q) => q[2]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(40, 6);
    expect(Math.min(...zs)).toBeCloseTo(7, 6); expect(Math.max(...zs)).toBeCloseTo(67, 6);
  });
});
