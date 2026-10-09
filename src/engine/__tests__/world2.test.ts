import { describe, it, expect } from 'vitest';
import { paintTerrain, distTo, FACE, type TerrainDesign } from '../world/paint';
import { landmarkObjects } from '../world/landmarks';
import { bosqueMap, bigMapToTiled, reachable, CHUNK } from '../world/bosqueMap';
import { TILE } from '../world/tiles';

const small: TerrainDesign = {
  w: 24, h: 18, seed: 5,
  plateaus: [[[-2, -2], [26, -2], [26, 7], [-2, 7]]],
  stairs: [{ x: 12, y: 7, w: 3 }],
  rivers: [{ pts: [[5, -2], [5, 20]], w: 2.5 }],
  lakes: [], roads: [{ pts: [[12, 2], [12, 16]], w: 2 }], plazas: [[[16, 11], [21, 11], [21, 15], [16, 15]]],
  meadows: [{ c: [18, 4], r: 4 }], dark: [{ c: [3, 14], r: 4 }],
};

describe('mundo v2: terreno pintado', () => {
  it('meseta con acantilado sólido y escalera que se puede subir, río transparente, camino y plaza', () => {
    const t = paintTerrain(small);
    const W = small.w * TILE;
    const kinds = new Set(t.kind);
    for (const k of [0, 1, 2, 3, 4, 5]) expect(kinds, `tipo ${k}`).toContain(k);
    // el agua queda transparente (debajo va el agua animada) y la meseta no
    const waterPx = t.kind.indexOf(4);
    expect(t.img.data[waterPx * 4 + 3]).toBeLessThan(255);
    // el acantilado (fuera de la escalera) es sólido; la escalera no
    const faceRow = 8;
    expect(t.solid[faceRow * small.w + 18]).toBe(1);
    expect(t.solid[faceRow * small.w + 12]).toBe(0);
    expect(FACE).toBeGreaterThanOrEqual(48);
    expect(t.img.w).toBe(W);
  });
  it('distancia en pixeles (chaflán): 0 sobre la máscara y crece hacia afuera', () => {
    const m = new Uint8Array(10 * 10); m[55] = 1;
    const d = distTo(m, 10, 10);
    expect(d[55]).toBe(0);
    expect(d[56]).toBe(1);
    expect(d[59]).toBe(4);
  });
});

describe('mundo v2: objetos y Bosque GG', () => {
  it('objetos nuevos con apoyo adentro, luces con radio y capa de suelo en puente y vado', () => {
    const objs = landmarkObjects();
    for (const o of objs) {
      expect(o.anchor[0], o.name).toBeGreaterThanOrEqual(0); expect(o.anchor[0], o.name).toBeLessThanOrEqual(o.w);
      expect(o.anchor[1], o.name).toBeLessThanOrEqual(o.h);
      for (const a of Object.values(o.anims)) for (const f of a.frames) { expect(f.w, o.name).toBe(o.w); expect(f.h, o.name).toBe(o.h); }
      if (o.light) expect(o.light.radius, o.name).toBeGreaterThan(40);
    }
    const by = new Map(objs.map((o) => [o.name, o]));
    expect(by.get('puente')!.layer).toBe('suelo');
    expect(by.get('piedra_vado_0')!.layer).toBe('suelo');
    expect(by.get('arco_ruina')!.solids).toHaveLength(2);
    expect(by.get('cascada')!.anims.idle.frames).toHaveLength(4);
  });
  it('mapa grande: todo se alcanza caminando desde el inicio, con secretos, zonas y postales', { timeout: 120_000 }, () => {
    const m = bosqueMap();
    expect([m.w, m.h]).toEqual([120, 90]);
    const tipos = new Set(m.entities.map((e) => e.tipo));
    for (const t of ['jugador_inicio', 'thor_inicio', 'portal_llegada', 'punto_guardado', 'enemigo', 'cofre', 'rompible', 'cartel', 'jefe', 'portal_jefe', 'arena_jefe']) expect(tipos, t).toContain(t);
    const start = m.entities.find((e) => e.tipo === 'jugador_inicio')!;
    const seen = reachable(m, Math.floor(start.x / TILE), Math.floor(start.y / TILE));
    for (const e of m.entities) {
      const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
      const ok = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[(ty + dy) * m.w + tx + dx]);
      expect(ok, `${e.tipo} en ${tx},${ty} no se alcanza`).toBe(true);
    }
    expect(m.entities.filter((e) => e.tipo === 'cofre' && e.props?.secreto).length).toBeGreaterThanOrEqual(4);
    expect(m.entities.filter((e) => e.tipo === 'punto_guardado').length).toBeGreaterThanOrEqual(3);
    expect(m.zones.length).toBeGreaterThanOrEqual(10);
    expect(m.postales.length).toBeGreaterThanOrEqual(6);
    const names = new Set(m.objects.map((o) => o.name));
    for (const d of m.decos) expect(names.has(d.sprite), d.sprite).toBe(true);
    expect(m.decos.length).toBeGreaterThan(1000);
    // Tiled: agua, suelo en trozos, colisión, objetos, entidades, zonas y postales
    const t = bigMapToTiled(m);
    const layers = (t.json.layers as { name: string }[]).map((l) => l.name);
    expect(layers).toEqual(['agua', 'suelo', 'colision', 'objetos', 'entidades', 'zonas', 'postales']);
    for (const c of t.chunks) { expect(c.img.w).toBeLessThanOrEqual(CHUNK); expect(c.img.h).toBeLessThanOrEqual(CHUNK); }
    expect(t.chunks).toHaveLength(12);
    // misma semilla, mismo mapa
    const m2 = bosqueMap();
    expect(m2.decos.slice(0, 50)).toEqual(m.decos.slice(0, 50));
    expect(m2.decos.length).toBe(m.decos.length);
  });
});
