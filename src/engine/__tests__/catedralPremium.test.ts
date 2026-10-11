import { describe, it, expect } from 'vitest';
import { catedralMap } from '../world/catedralMap';
import { reachable } from '../world/bosqueMap';
import { TILE } from '../world/tiles';
import { CELL, footprint } from '../world/premium/placer';
import { waterExtras } from '../world/water';

describe('Catedral premium', () => {
  const m = catedralMap();
  const byName = new Map(m.objects.map((o) => [o.name, o]));
  const drawn = (name: string) => {
    const f = (byName.get(name)!.anims.idle ?? Object.values(byName.get(name)!.anims)[0]).frames[0];
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (f.data[(y * f.w + x) * 4 + 3] > 128) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return { w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };

  it('sin huecos negros: donde no hay piso va el abismo, con tres fondos que pegan y su paralaje', () => {
    const img = m.terrain.img;
    let hole = 0;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.data[(y * img.w + x) * 4 + 3] === 0 && !m.terrain.waterTiles[Math.floor(y / TILE) * m.w + Math.floor(x / TILE)]) hole++;
    expect(hole / (img.w * img.h)).toBeGreaterThan(0.25);
    expect(m.meta!.fondo!.map((f) => f.paralaje)).toEqual([0.6, 0.75, 0.9]);
    for (const f of m.meta!.fondo!) {
      const o = byName.get(f.id)!;
      expect([o.w, o.h, o.layer]).toEqual([512, 512, 'fondo']);
    }
  });

  it('la nave a dos alturas: galería alta con escalones rotos, y se baja caminando', () => {
    const ini = m.entities.find((e) => e.tipo === 'jugador_inicio')!;
    let high = 0, stairs = 0;
    for (let ty = 38; ty <= 41; ty++) for (let tx = 28; tx <= 40; tx++) if (m.terrain.tileHigh[ty * m.w + tx]) high++;
    for (let ty = 40; ty <= 44; ty++) for (let tx = 31; tx <= 36; tx++) if (m.terrain.tileKind[ty * m.w + tx] === 5) { stairs++; expect(m.solid[ty * m.w + tx], `escalón ${tx},${ty}`).toBe(0); }
    expect(high).toBeGreaterThan(20);
    expect(stairs).toBeGreaterThan(0);
    expect(m.decos.some((d) => d.sprite === 'escalones_rotos')).toBe(true);
    // todo lo de siempre se sigue alcanzando (la nave se abre con las brasas: acá se mira que nada nuevo tape)
    const seen = reachable(m, Math.floor(ini.x / TILE), Math.floor(ini.y / TILE));
    const ref = m.entities.find((e) => e.tipo === 'punto_guardado')!;
    expect(seen[Math.floor(ref.y / TILE) * m.w + Math.floor(ref.x / TILE)]).toBe(1);
    expect(m.premium!.quitadosPorPaso).toBeLessThan(5);
  });

  it('vitrales con su charco de luz y haz de polvo, mobiliario roto a la medida del encargo', () => {
    expect(m.decos.filter((d) => d.sprite.startsWith('vitral_')).length).toBeGreaterThanOrEqual(10);
    expect(m.decos.filter((d) => d.sprite.startsWith('luz_vitral_')).length).toBeGreaterThanOrEqual(8);
    expect(m.decos.some((d) => d.sprite === 'haz_polvo')).toBe(true);
    expect(drawn('banca_rota').w).toBeLessThanOrEqual(64);
    expect(drawn('banca_rota').h).toBeLessThanOrEqual(40);
    expect(drawn('candelabro_pie').h).toBeLessThanOrEqual(64);
    expect(drawn('estatua_santo_rota').h).toBeLessThanOrEqual(96);
    const c = byName.get('candelabro_pie')!;
    expect(c.light).toMatchObject({ radius: 90, flicker: true });
    expect(Object.keys(c.anims).sort()).toEqual(['apagada', 'idle', 'prender']);
    for (const n of ['banca_rota', 'candelabro_pie', 'estatua_santo_rota']) { expect(byName.get(n)!.solid, n).not.toBeNull(); expect(byName.get(n)!.shadow, n).toBeTruthy(); }
    for (const k of ['ladrillo_', 'ladrillo_musgo_', 'ladrillo_roto_', 'ladrillo_raiz_']) expect(m.objects.filter((o) => o.name.startsWith(k) && /\d$/.test(o.name) && o.name.slice(k.length).match(/^\d$/)).length, k).toBe(k === 'ladrillo_' ? 6 : 3);
    for (const v of [0, 1, 2]) expect([byName.get(`vitral_${v}`)!.w, byName.get(`vitral_${v}`)!.h]).toEqual([48, 96]);
    expect(Object.values(m.premium!.muebles).reduce((a, b) => a + b, 0)).toBeGreaterThan(25);
  });

  it('cada pantalla con piso tiene un punto focal y al menos 6 calcomanías, y el primer plano va por zona', () => {
    expect(m.premium!.pantallas.length).toBeGreaterThanOrEqual(10);
    for (const p of m.premium!.pantallas) {
      expect(p.focal.length, `pantalla ${p.x},${p.y}`).toBeGreaterThan(0);
      expect(p.calcomanias, `pantalla ${p.x},${p.y}`).toBeGreaterThanOrEqual(6);
    }
    expect(m.zones.every((z) => typeof z.props.frente === 'string')).toBe(true);
    expect(m.decos.some((d) => d.sprite.startsWith('frente_'))).toBe(false);
  });

  it('el agua negra: espuma en las orillas del río y del pozo, reflejo solo en el pozo quieto', () => {
    const w = waterExtras(m);
    expect(w.piezas).toBeGreaterThan(20);
    let refl = 0;
    for (let k = 0; k < w.reflejo.length; k++) if (w.reflejo[k]) { refl++; expect(m.terrain.waterTiles[k]).toBe(1); }
    expect(refl).toBeGreaterThan(3);
  });

  it('nada montado: los muebles no se pisan, no tapan pies ni muros, y no están sobre el abismo', () => {
    const GW = Math.ceil(m.terrain.img.w / CELL), IW = m.terrain.img.w;
    const items = m.decos.filter((d) => /^(banca_rota|candelabro_pie|estatua_santo_rota)$/.test(d.sprite)).map((d) => {
      const f = footprint(byName.get(d.sprite)!);
      const g = (c: [number, number]) => (Math.floor(d.y / CELL) + c[1]) * GW + Math.floor(d.x / CELL) + c[0];
      return { d, body: new Set(f.body.map(g)), foot: new Set(f.foot.map(g)) };
    });
    expect(items.length).toBeGreaterThan(25);
    for (const a of items) {
      // el pie está sobre losa (nunca sobre el techo de un muro ni sobre el abismo)
      expect(m.terrain.kind[(a.d.y - 2) * IW + a.d.x], `${a.d.sprite} en ${a.d.x},${a.d.y}`).toBe(2);
      for (const g of a.body) {
        const k = m.terrain.kind[((g / GW) | 0) * CELL * IW + (g % GW) * CELL + 2 * IW + 2];
        expect(k === 3 || k === 5, `${a.d.sprite} en ${a.d.x},${a.d.y} tapa un muro o una escalera`).toBe(false);
      }
      for (const b of items) {
        if (a === b) continue;
        expect([...a.body].filter((g) => b.body.has(g)).length, `${a.d.sprite} y ${b.d.sprite} montados`).toBe(0);
      }
    }
  });
}, 300_000);
