import { describe, it, expect } from 'vitest';
import { bosqueMap, ZONA_PILOTO, bosqueObjects } from '../world/bosqueMap';
import { TILE } from '../world/tiles';
import { SCREEN } from '../world/premium/zone';
import { TREE_HEIGHT } from '../world/premium/trees';

describe('mundo premium: piloto del Bosque Profundo', () => {
  const base = bosqueMap(2024, { premium: false });
  const pilot = bosqueMap();
  const [rx0, ry0, rx1, ry1] = ZONA_PILOTO.rect;
  const inRect = (x: number, y: number) => x >= rx0 * TILE && x < (rx1 + 1) * TILE && y >= ry0 * TILE && y < (ry1 + 1) * TILE;

  it('fuera del rectángulo del piloto no cambia nada: suelo, colisión, objetos y entidades', () => {
    const a = base.terrain.img.data, b = pilot.terrain.img.data, W = base.terrain.img.w;
    let diff = 0;
    for (let i = 0; i < a.length; i += 4) {
      const p = i / 4, x = p % W, y = Math.floor(p / W);
      if (inRect(x, y)) continue;
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) diff++;
    }
    expect(diff).toBe(0);
    for (let ty = 0; ty < base.h; ty++) for (let tx = 0; tx < base.w; tx++) {
      if (tx >= rx0 && tx <= rx1 && ty >= ry0 && ty <= ry1) continue;
      expect(pilot.solid[ty * base.w + tx], `colisión ${tx},${ty}`).toBe(base.solid[ty * base.w + tx]);
    }
    const out = (d: { x: number; y: number }) => !inRect(d.x, d.y - 1);
    expect(pilot.decos.filter(out)).toEqual(base.decos.filter(out));
    expect(pilot.entities.filter((e) => !inRect(e.x, e.y))).toEqual(base.entities.filter((e) => !inRect(e.x, e.y)));
  });

  it('cada pantalla del piloto tiene un punto focal y al menos 6 calcomanías', () => {
    const rep = pilot.piloto!;
    expect(rep.pantallas.length).toBeGreaterThanOrEqual(4);
    for (const p of rep.pantallas) {
      expect(p.focal.length, `pantalla ${p.x},${p.y}`).toBeGreaterThan(0);
      expect(p.calcomanias, `pantalla ${p.x},${p.y}`).toBeGreaterThanOrEqual(6);
    }
    expect(SCREEN).toEqual({ w: 20, h: 11 });
  });

  it('el relieve: hay meseta con su cara de acantilado y una rampa que se camina', () => {
    let high = 0, face = 0, ramp = 0;
    for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
      const k = ty * pilot.w + tx;
      if (pilot.terrain.tileHigh[k]) high++;
      if (pilot.terrain.tileKind[k] === 3) face++;
      if (pilot.terrain.tileKind[k] === 5) { ramp++; expect(pilot.solid[k], `rampa ${tx},${ty}`).toBe(0); }
    }
    expect(high).toBeGreaterThan(15);
    expect(face).toBeGreaterThan(5);
    expect(ramp).toBeGreaterThan(0);
  });

  it('árboles con escala de verdad y variedad: dos iguales nunca a menos de 3 cuadros', () => {
    const trees = pilot.decos.filter((d) => /^(roble|pino)_t\d_\d$/.test(d.sprite));
    expect(trees.length).toBeGreaterThan(25);
    for (let i = 0; i < trees.length; i++) for (let j = i + 1; j < trees.length; j++) {
      const a = trees[i], b = trees[j];
      if (a.sprite !== b.sprite) continue;
      const near = Math.abs(a.x - b.x) <= 3 * TILE && Math.abs(a.y - b.y) <= 3 * TILE;
      expect(near, `${a.sprite} repetido en ${a.x},${a.y} y ${b.x},${b.y}`).toBe(false);
    }
    expect(Math.min(...TREE_HEIGHT)).toBeGreaterThanOrEqual(110);
    expect(Math.max(...TREE_HEIGHT)).toBeLessThanOrEqual(200);
    // los 3 tamaños aparecen
    expect(new Set(trees.map((t) => t.sprite.slice(-3, -2))).size).toBe(3);
  });

  it('una sola luz: todas las sombras horneadas caen abajo a la derecha del apoyo', () => {
    const withShadow = bosqueObjects().filter((o) => o.shadow);
    expect(withShadow.length).toBeGreaterThan(18);
    for (const o of withShadow) {
      const s = o.shadow!;
      let sy = 0, n = 0, x0 = Infinity, x1 = -1;
      for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const a = s.data[(y * s.w + x) * 4 + 3]; if (a) { sy += y * a; n += a; x0 = Math.min(x0, x); x1 = Math.max(x1, x); } }
      expect(n, o.name).toBeGreaterThan(0);
      // la sombra está corrida a la derecha del objeto (nunca a la izquierda) y no sube del pie
      const f = (o.anims.idle ?? Object.values(o.anims)[0]).frames[0];
      let ox0 = Infinity, ox1 = -1;
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (f.data[(y * f.w + x) * 4 + 3] > 128) { ox0 = Math.min(ox0, x); ox1 = Math.max(ox1, x); }
      expect(x1, `${o.name}: borde derecho de la sombra`).toBeGreaterThanOrEqual(ox1);
      expect(x0, `${o.name}: borde izquierdo de la sombra`).toBeGreaterThanOrEqual(ox0 - 4);
      expect(sy / n, `${o.name} y`).toBeGreaterThanOrEqual(o.anchor[1] - 3);
      expect(s.w).toBe(o.w);
      expect(s.h).toBe(o.h);
    }
  });
}, 300_000);
