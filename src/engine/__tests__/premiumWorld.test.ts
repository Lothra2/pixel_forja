import { describe, it, expect } from 'vitest';
import { bosqueMap, ZONA_PILOTO, bosqueObjects } from '../world/bosqueMap';
import { TILE } from '../world/tiles';
import { SCREEN, CELL, footprint } from '../world/premium/zone';
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
    // bosque con bosquecillos y claros: menos árboles que antes, pero ninguno montado
    expect(trees.length).toBeGreaterThanOrEqual(20);
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

  it('nada montado: ningún pie tapado, dos cuerpos se pisan como mucho un 12 % y el acantilado y la rampa se ven', () => {
    const byName = new Map(pilot.objects.map((o) => [o.name, o]));
    const GW = Math.ceil(pilot.terrain.img.w / CELL), IW = pilot.terrain.img.w;
    const placed = pilot.decos.filter((d) => inRect(d.x, d.y - 1) && byName.get(d.sprite) && !byName.get(d.sprite)!.layer).map((d) => {
      const f = footprint(byName.get(d.sprite)!);
      const g = (c: [number, number]) => (Math.floor(d.y / CELL) + c[1]) * GW + Math.floor(d.x / CELL) + c[0];
      return { d, body: new Set(f.body.map(g)), foot: new Set(f.foot.map(g)) };
    });
    expect(placed.length).toBeGreaterThan(40);
    for (let i = 0; i < placed.length; i++) {
      const a = placed[i];
      // la cara del acantilado y la rampa no las tapa nada
      for (const g of a.body) {
        const k = pilot.terrain.kind[((g / GW) | 0) * CELL * IW + (g % GW) * CELL + 2 * IW + 2];
        expect(k === 3 || k === 5, `${a.d.sprite} en ${a.d.x},${a.d.y} tapa el acantilado o la rampa`).toBe(false);
      }
      for (let j = 0; j < placed.length; j++) {
        if (i === j) continue;
        const b = placed[j];
        const covered = [...a.foot].filter((g) => b.body.has(g)).length;
        expect(covered, `${b.d.sprite} tapa el pie de ${a.d.sprite} (${a.d.x},${a.d.y})`).toBe(0);
        if (j < i) continue;
        const ov = [...a.body].filter((g) => b.body.has(g)).length;
        expect(ov, `${a.d.sprite} y ${b.d.sprite} montados`).toBeLessThanOrEqual(Math.ceil(Math.min(a.body.size, b.body.size) * 0.12));
      }
    }
  });

  it('el primer plano no va en el mapa: la zona lo declara para los bordes de la pantalla', () => {
    const front = pilot.decos.filter((d) => d.sprite.startsWith('frente_'));
    expect(front).toEqual([]);
    const z = pilot.zones.find((q) => q.nombre === ZONA_PILOTO.nombre)!;
    expect(String(z.props.frente).split(',')).toEqual(ZONA_PILOTO.frente);
    expect(pilot.piloto!.sinLugar).toEqual([]);
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
