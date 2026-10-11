import { describe, it, expect } from 'vitest';
import { bosqueMap, ZONA_PILOTO, BOSQUE_PREMIUM, bosqueObjects } from '../world/bosqueMap';
import { TILE } from '../world/tiles';
import { SCREEN, CELL, footprint } from '../world/premium/zone';
import { TREE_HEIGHT } from '../world/premium/trees';

describe('mundo premium: el Bosque entero', () => {
  const base = bosqueMap(2024, { premium: false });
  const m = bosqueMap();
  const [rx0, ry0, rx1, ry1] = ZONA_PILOTO.rect;
  const byName = new Map(m.objects.map((o) => [o.name, o]));

  it('lo que el diseño puso a mano no se mueve: lugares, campamentos, ruinas, carteles, puentes, cofres y enemigos', () => {
    const key = (d: { sprite: string; x: number; y: number }) => `${d.sprite}@${d.x},${d.y}`;
    const now = new Set(m.decos.map(key));
    const designed = base.decos.filter((d) => !BOSQUE_PREMIUM.vegetation.test(d.sprite));
    expect(designed.length).toBeGreaterThan(200);
    for (const d of designed) expect(now.has(key(d)), `${d.sprite} en ${d.x},${d.y}`).toBe(true);
    const count = (l: { tipo: string }[]) => l.reduce<Record<string, number>>((a, e) => ({ ...a, [e.tipo]: (a[e.tipo] ?? 0) + 1 }), {});
    expect(count(m.entities)).toEqual(count(base.entities));
    // los lugares de vegetación se mudan cerca, no se pierden (se avisa los que no entraron)
    expect(m.mundo!.mudados).toBeGreaterThan(70);
    expect(m.mundo!.sinLugar.length).toBeLessThanOrEqual(4);
  });

  it('cada pantalla tiene un punto focal y al menos 6 calcomanías', () => {
    const screens = [...m.piloto!.pantallas, ...m.mundo!.pantallas];
    expect(screens.length).toBeGreaterThanOrEqual(46);
    for (const p of screens) {
      expect(p.focal.length, `pantalla ${p.x},${p.y}`).toBeGreaterThan(0);
      expect(p.calcomanias, `pantalla ${p.x},${p.y}`).toBeGreaterThanOrEqual(6);
    }
    expect(SCREEN).toEqual({ w: 20, h: 11 });
  });

  it('el relieve del piloto: hay meseta con su cara de acantilado y una rampa que se camina', () => {
    let high = 0, face = 0, ramp = 0;
    for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
      const k = ty * m.w + tx;
      if (m.terrain.tileHigh[k] && !base.terrain.tileHigh[k]) high++;
      if (m.terrain.tileKind[k] === 3) face++;
      if (m.terrain.tileKind[k] === 5) { ramp++; expect(m.solid[k], `rampa ${tx},${ty}`).toBe(0); }
    }
    expect(high).toBeGreaterThan(15);
    expect(face).toBeGreaterThan(5);
    expect(ramp).toBeGreaterThan(0);
  });

  it('árboles con escala de verdad y variedad: dos iguales nunca a menos de 3 cuadros', () => {
    const trees = m.decos.filter((d) => /^(roble|pino)_t\d_\d$/.test(d.sprite));
    expect(trees.length).toBeGreaterThan(600);
    const grid = new Map<string, typeof trees>();
    for (const t of trees) { const k = `${t.sprite}:${Math.floor(t.x / (4 * TILE))},${Math.floor(t.y / (4 * TILE))}`; grid.set(k, [...(grid.get(k) ?? []), t]); }
    for (const a of trees) {
      const gx = Math.floor(a.x / (4 * TILE)), gy = Math.floor(a.y / (4 * TILE));
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) for (const b of grid.get(`${a.sprite}:${gx + dx},${gy + dy}`) ?? []) {
        if (a === b) continue;
        const near = Math.abs(Math.floor(a.x / TILE) - Math.floor(b.x / TILE)) <= 3 && Math.abs(Math.floor((a.y - 1) / TILE) - Math.floor((b.y - 1) / TILE)) <= 3;
        expect(near, `${a.sprite} repetido en ${a.x},${a.y} y ${b.x},${b.y}`).toBe(false);
      }
    }
    expect(Math.min(...TREE_HEIGHT)).toBeGreaterThanOrEqual(110);
    expect(Math.max(...TREE_HEIGHT)).toBeLessThanOrEqual(200);
    expect(new Set(trees.map((t) => t.sprite.slice(-3, -2))).size).toBe(3);
    // el bosque cerrado sigue cerrado: hay dosel
    expect(m.mundo!.dosel.length).toBeGreaterThan(300);
  });

  it('nada montado: ningún pie tapado, dos cuerpos se pisan poco y el acantilado y la rampa se ven', () => {
    const fromBase = new Set(base.decos.map((d) => `${d.sprite}@${d.x},${d.y}`));
    const dosel = new Set(m.mundo!.dosel.map((p) => `${p.x},${p.y}`));
    const GW = Math.ceil(m.terrain.img.w / CELL), GH = Math.ceil(m.terrain.img.h / CELL), IW = m.terrain.img.w;
    const fps = new Map<string, ReturnType<typeof footprint>>();
    const items = m.decos.filter((d) => byName.get(d.sprite) && !byName.get(d.sprite)!.layer && d.sprite !== 'telarana').map((d) => {
      let f = fps.get(d.sprite); if (!f) { f = footprint(byName.get(d.sprite)!); fps.set(d.sprite, f); }
      // (lo que cae fuera del mapa no se ve: no cuenta)
      const inMap = (c: [number, number]) => { const gx = Math.floor(d.x / CELL) + c[0], gy = Math.floor(d.y / CELL) + c[1]; return gx >= 0 && gy >= 0 && gx < GW && gy < GH; };
      const g = (c: [number, number]) => (Math.floor(d.y / CELL) + c[1]) * GW + Math.floor(d.x / CELL) + c[0];
      // lo que se quedó donde el diseño lo puso (con o sin su copia con sombra) no lo colocó el motor
      const kept = fromBase.has(`${d.sprite.replace(/_p$/, '')}@${d.x},${d.y}`);
      return { d, kept, dosel: dosel.has(`${d.x},${d.y}`), area: f.body.length, body: new Set(f.body.filter(inMap).map(g)), foot: new Set(f.foot.filter(inMap).map(g)) };
    });
    expect(items.length).toBeGreaterThan(1100);
    const bodyAt = new Map<number, number[]>();
    items.forEach((it, i) => { for (const g of it.body) bodyAt.set(g, [...(bodyAt.get(g) ?? []), i]); });
    for (let i = 0; i < items.length; i++) {
      const a = items[i];
      if (a.kept) continue;
      for (const g of a.body) {
        const k = m.terrain.kind[((g / GW) | 0) * CELL * IW + (g % GW) * CELL + 2 * IW + 2];
        expect(k === 3 || k === 5, `${a.d.sprite} en ${a.d.x},${a.d.y} tapa el acantilado o la rampa`).toBe(false);
      }
      const ov = new Map<number, number>();
      for (const g of a.body) for (const j of bodyAt.get(g) ?? []) if (j !== i) ov.set(j, (ov.get(j) ?? 0) + 1);
      for (const [j, n] of ov) {
        const b = items[j];
        const lim = a.dosel && b.dosel ? 0.5 : 0.12;
        expect(n, `${a.d.sprite} (${a.d.x},${a.d.y}) y ${b.d.sprite} (${b.d.x},${b.d.y}) montados`).toBeLessThanOrEqual(Math.ceil(Math.min(a.area, b.area) * lim));
      }
      // el pie de cada uno se ve (en el dosel, solo otro árbol del dosel lo puede tapar)
      for (const g of a.foot) for (const j of bodyAt.get(g) ?? []) {
        if (j === i || (a.dosel && items[j].dosel)) continue;
        expect(false, `${items[j].d.sprite} (${items[j].d.x},${items[j].d.y}) tapa el pie de ${a.d.sprite} (${a.d.x},${a.d.y})`).toBe(true);
      }
    }
  });

  it('el primer plano no va en el mapa: cada zona lo declara para los bordes de la pantalla', () => {
    expect(m.decos.filter((d) => d.sprite.startsWith('frente_'))).toEqual([]);
    const z = m.zones.find((q) => q.nombre === ZONA_PILOTO.nombre)!;
    expect(String(z.props.frente).split(',')).toEqual(ZONA_PILOTO.frente);
    for (const [nombre, list] of Object.entries(BOSQUE_PREMIUM.frente)) expect(String(m.zones.find((q) => q.nombre === nombre)!.props.frente).split(',')).toEqual(list);
    expect(m.piloto!.sinLugar).toEqual([]);
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
}, 600_000);
