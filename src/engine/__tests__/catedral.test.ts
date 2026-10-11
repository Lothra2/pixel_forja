import { describe, it, expect } from 'vitest';
import { catedralMap, catedralDesign, CATEDRAL_PALETTE } from '../world/catedralMap';
import { catedralObjects } from '../world/catedralObjects';
import { bigMapToTiled, reachable } from '../world/bosqueMap';
import { paintTerrain, type TerrainDesign } from '../world/paint';
import { TILE } from '../world/tiles';
import { enemyFicha, enemyCell, enemyAnims } from '../rpg/presets';
import { MUSIC, RATE } from '../audio/sfx';
import { ambience, AMBIENCE_NAMES } from '../audio/ambience';
import { particles } from '../world/ambient';

describe('catedral: interior tallado', () => {
  it('fuera de las salas todo es muro y la cara del muro de arriba de una sala no se pisa', () => {
    const d: TerrainDesign = { w: 16, h: 12, seed: 3, rooms: [[[3, 3], [13, 3], [13, 10], [3, 10]]], plateaus: [], stairs: [], rivers: [], lakes: [], roads: [], plazas: [], meadows: [], dark: [] };
    const t = paintTerrain(d, CATEDRAL_PALETTE);
    // una esquina lejos de la sala es muro (meseta), el centro de la sala es piso
    expect(t.tileHigh[0]).toBe(1);
    expect(t.tileHigh[7 * 16 + 8]).toBe(0);
    // justo debajo del borde de arriba de la sala está la cara del muro: no se pasa
    expect(t.solid[3 * 16 + 8]).toBe(1);
    expect(t.solid[8 * 16 + 8]).toBe(0);
  });
});

describe('catedral: la rebanada (escalera, atrio y el primer guardián)', () => {
  const m = catedralMap();
  it('trae inicio, portal para volver, refugio, pedestal, cofres y el guardián, y todo se alcanza caminando', { timeout: 60_000 }, () => {
    const tipos = new Set(m.entities.map((e) => e.tipo));
    for (const t of ['jugador_inicio', 'thor_inicio', 'portal_llegada', 'portal_volver', 'punto_guardado', 'pedestal_brasas', 'cofre', 'enemigo']) expect(tipos, t).toContain(t);
    expect(m.entities.find((e) => e.tipo === 'portal_volver')!.props!.destino).toBe('mundo1');
    expect(m.entities.some((e) => e.tipo === 'enemigo' && e.props?.enemigo === 'guardian_cobre')).toBe(true);
    const ini = m.entities.find((e) => e.tipo === 'jugador_inicio')!;
    const seen = reachable(m, Math.floor(ini.x / TILE), Math.floor(ini.y / TILE));
    for (const e of m.entities) {
      if (e.tipo === 'portal_llegada') continue; // es solo el dibujo del portal
      const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
      const ok = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[(ty + dy) * m.w + tx + dx]);
      expect(ok, `${e.tipo} en ${tx},${ty} no se alcanza`).toBe(true);
    }
  });
  it('la escalera baja del descanso al atrio: el refugio se alcanza desde el inicio y la nave todavía está cerrada', () => {
    const ini = m.entities.find((e) => e.tipo === 'jugador_inicio')!;
    const seen = reachable(m, Math.floor(ini.x / TILE), Math.floor(ini.y / TILE));
    const ref = m.entities.find((e) => e.tipo === 'punto_guardado')!;
    expect(ref.y).toBeGreaterThan(ini.y + 10 * TILE);
    expect(seen[Math.floor(ref.y / TILE) * m.w + Math.floor(ref.x / TILE)]).toBe(1);
    // la nave inundada y la forja quedan detrás de las raíces hasta la próxima entrega
    expect(seen[47 * m.w + 8]).toBe(0);
    expect(seen[46 * m.w + 54]).toBe(0);
  });
  it('zonas con nombre, música y oscuridad que sube al bajar; postales; objetos conocidos', () => {
    expect(m.zones.length).toBeGreaterThanOrEqual(5);
    expect(m.zones.every((z) => (z.props.musica === 'catedral' || z.nombre === 'El Campanario Invertido') && z.props.ambiente === 'catedral')).toBe(true);
    const osc = m.zones.map((z) => Number(z.props.oscuridad ?? 0));
    for (let i = 1; i < osc.length; i++) expect(osc[i]).toBeGreaterThanOrEqual(osc[i - 1]!);
    expect(m.postales.length).toBeGreaterThanOrEqual(5);
    const names = new Set(m.objects.map((o) => o.name));
    for (const d of m.decos) expect(names.has(d.sprite), d.sprite).toBe(true);
    for (const n of ['portal_azul', 'aviso_jefe']) expect(names.has(n), n).toBe(true);
    const t = bigMapToTiled(m);
    expect((t.json.properties as { name: string; value: unknown }[]).find((p) => p.name === 'bioma')!.value).toBe('catedral');
    expect([m.w, m.h]).toEqual([catedralDesign.w, catedralDesign.h]);
  });
  it('la nave: un puente seguro, un vado de losas con agua que se pisa a los lados (el peligro) y el vigía en la otra orilla', () => {
    expect(m.decos.some((d) => d.sprite === 'puente_piedra')).toBe(true)
    expect(m.decos.filter((d) => d.sprite.startsWith('losa_hundida_')).length).toBeGreaterThanOrEqual(3)
    const peligro = m.entities.filter((e) => e.tipo === 'peligro_agua')
    expect(peligro.length).toBeGreaterThanOrEqual(6)
    // el agua del peligro se pisa (si no, no habría caída) y es agua de verdad
    for (const p of peligro) {
      const i = Math.floor(p.y / TILE) * m.w + Math.floor(p.x / TILE)
      expect(m.solid[i]).toBe(0)
      expect(m.terrain.waterTiles[i]).toBe(1)
    }
    const tipos = m.entities.filter((e) => e.tipo === 'enemigo').map((e) => e.props!.enemigo)
    for (const t of ['guardian_cobre', 'raicita', 'vigia_raices']) expect(tipos, t).toContain(t)
    expect(m.entities.find((e) => e.tipo === 'jefe')!.props!.enemigo).toBe('guardian_campana')
    expect(m.entities.find((e) => e.tipo === 'portal_jefe')!.props!.destino).toBe('mundo3')
    // la capilla escondida es un secreto con su cofre
    expect(m.zones.find((z) => z.nombre === 'La Capilla Escondida')!.props.secreto).toBe(true)
    expect(m.entities.some((e) => e.tipo === 'cofre' && e.props!.secreto && e.props!.pista === 'capilla_escondida')).toBe(true)
  });
  it('la forja: tres brasas, braseros que se prenden con 1, 2 y 3, y tres compuertas de raíces que abren el camino', () => {
    const brasas = m.entities.filter((e) => e.tipo === 'brasa')
    expect(new Set(brasas.map((b) => b.props!.id)).size).toBeGreaterThanOrEqual(3)
    const req = m.entities.filter((e) => e.tipo === 'brasero_brasa').map((e) => Number(e.props!.requiere))
    for (const n of [1, 2, 3]) expect(req, `braseros que piden ${n}`).toContain(n)
    const comp = m.entities.filter((e) => e.tipo === 'compuerta_raices')
    expect(comp.map((c) => Number(c.props!.requiere)).sort()).toEqual([1, 2, 3])
    // cada compuerta cierra su paso de pared a pared: sin ella (abierta) se pasa, con ella (cerrada) no
    const ini = m.entities.find((e) => e.tipo === 'jugador_inicio')!
    const sinCompuertas = reachable(m, Math.floor(ini.x / TILE), Math.floor(ini.y / TILE))
    const cerrado = { ...m, solid: Uint8Array.from(m.solid) }
    for (const c of comp) { const p = c.props as Record<string, number>; for (let y = p.y0!; y <= p.y1!; y++) for (let x = p.x0!; x <= p.x1!; x++) cerrado.solid[y * m.w + x] = 1 }
    const conCompuertas = reachable(cerrado, Math.floor(ini.x / TILE), Math.floor(ini.y / TILE))
    const forja = m.entities.find((e) => e.tipo === 'brasa' && e.props!.id === 'forja')!
    const iF = Math.floor(forja.y / TILE) * m.w + Math.floor(forja.x / TILE)
    expect(sinCompuertas[iF], 'con las compuertas abiertas se llega a la forja').toBe(1)
    expect(conCompuertas[iF], 'con las compuertas cerradas la forja está cerrada').toBe(0)
    // y las dos primeras brasas se alcanzan con todo cerrado (no se traba el orden)
    for (const id of ['nave', 'claustro']) {
      const b = m.entities.find((e) => e.tipo === 'brasa' && e.props!.id === id)!
      expect(conCompuertas[Math.floor(b.y / TILE) * m.w + Math.floor(b.x / TILE)], id).toBe(1)
    }
    expect(m.entities.some((e) => e.tipo === 'forja')).toBe(true)
    expect(m.zones.some((z) => z.nombre === 'La Forja Apagada')).toBe(true)
    const objs = new Set(catedralObjects().map((o) => o.name))
    for (const n of ['forja_0', 'forja_1', 'forja_2', 'forja_3', 'brasa', 'pedestal_brasas_3', 'brasero_apagado', 'brasero_cobre', 'raices_cortina']) expect(objs.has(n), n).toBe(true)
  });
  it('misma semilla, mismo mapa', () => {
    const m2 = catedralMap();
    expect(m2.decos).toEqual(m.decos);
    expect(m2.entities).toEqual(m.entities);
  }, 120_000); // la Catedral premium tarda; con otras pruebas en paralelo pasa los 30 s
});

describe('catedral: objetos, guardián y sonido', () => {
  it('objetos con apoyo adentro del dibujo; las columnas chocan y el haz de luz no', () => {
    const objs = catedralObjects();
    for (const o of objs) {
      expect(o.anchor[0], o.name).toBeGreaterThanOrEqual(0);
      expect(o.anchor[0], o.name).toBeLessThanOrEqual(o.w);
      expect(o.anchor[1], o.name).toBeLessThanOrEqual(o.h);
      for (const a of Object.values(o.anims)) for (const f of a.frames) expect([f.w, f.h], o.name).toEqual([o.w, o.h]);
    }
    const by = new Map(objs.map((o) => [o.name, o]));
    expect(by.get('columna_raiz')!.solid).not.toBeNull();
    expect(by.get('haz_luz')!.solid).toBeNull();
    expect(by.get('brasero_cobre')!.light!.color).toBe('#ffb050');
    expect(by.get('pedestal_brasas_0')!.light).toBeUndefined();
    expect(by.get('pedestal_brasas_3')!.light).toBeDefined();
  });
  it('el guardián de cobre es grande, con golpe pesado y grito como el trol', () => {
    expect(enemyCell('guardian_cobre')).toBe(64);
    expect(enemyAnims('guardian_cobre')).toEqual(expect.arrayContaining(['idle', 'walk', 'attack', 'attack_heavy', 'hit', 'die']));
    expect(enemyFicha('guardian_cobre').outfit.armor).toBe('placas');
  });
  it('música y ambiente de la catedral, y luciérnagas turquesa', () => {
    expect(Object.keys(MUSIC)).toContain('catedral');
    expect(MUSIC.catedral().length).toBeGreaterThan(RATE * 20);
    expect(AMBIENCE_NAMES).toContain('catedral');
    const a = ambience('catedral');
    let pico = 0
    for (const v of a) pico = Math.max(pico, Math.abs(v));
    expect(pico).toBeGreaterThan(0.3);
    expect(particles().some((p) => p.name === 'luciernaga_turquesa')).toBe(true);
  });
});
