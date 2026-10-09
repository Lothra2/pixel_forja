import { describe, it, expect } from 'vitest';
import {
  tilesetSheet, terrainTile, groundTile, cornerMask, TILE, forestObjects, forestMap, toTiledJson, renderMapPreview, hudSprites, orb, digitSheet, DIGITS, inventoryPanel,
  SFX, SFX_NAMES, MUSIC, encodeWav, buildGameKit, familyFicha, type Raster,
} from '../index';

const same = (a: Raster, b: Raster) => Buffer.from(a.data).equals(Buffer.from(b.data));

describe('mundo: tileset, objetos y mapa', () => {
  it('tileset del bosque: pasto, flores, camino (16) y agua animada (4 x 16), en cuadros de 32', () => {
    const { png, layout } = tilesetSheet('bosque');
    expect(png.w).toBe(8 * TILE);
    expect(layout.path).toHaveLength(16);
    expect(layout.water.map((w) => w.length)).toEqual([16, 16, 16, 16]);
    expect(same(terrainTile('bosque', 'path', 0), groundTile('bosque', 0))).toBe(true);
    expect(same(terrainTile('bosque', 'water', 15, 0), terrainTile('bosque', 'water', 15, 2))).toBe(false);
    expect(cornerMask((x, y) => x > 0 && y > 0, 0, 0)).toBe(4);
  });
  it('objetos: cada uno con su tamaño, apoyo dentro del sprite y animaciones (portal, fogata, cosas que se rompen)', () => {
    const objs = forestObjects();
    expect(objs.length).toBeGreaterThanOrEqual(25);
    for (const o of objs) {
      expect(o.anchor[0], o.name).toBeGreaterThanOrEqual(0);
      expect(o.anchor[1], o.name).toBeLessThanOrEqual(o.h);
      for (const a of Object.values(o.anims)) for (const f of a.frames) { expect(f.w, o.name).toBe(o.w); expect(f.h, o.name).toBe(o.h); }
    }
    const portal = objs.find((o) => o.name === 'portal_azul')!;
    expect(Object.keys(portal.anims)).toEqual(['abrir', 'girar', 'cerrar']);
    expect(objs.find((o) => o.name === 'caja')!.anims.romper.frames.length).toBe(5);
  });
  it('mapa del bosque: inicio, Thor, enemigos, cofres, jefe minotauro y portal; nada aparece en un lugar sólido', () => {
    const m = forestMap();
    const types = new Set(m.entities.map((e) => e.tipo));
    for (const t of ['jugador_inicio', 'thor_inicio', 'enemigo', 'cofre', 'jefe', 'portal_jefe', 'rompible']) expect(types.has(t), t).toBe(true);
    expect(m.entities.find((e) => e.tipo === 'jefe')?.props?.enemigo).toBe('minotauro');
    for (const e of m.entities.filter((x) => x.tipo === 'enemigo' || x.tipo === 'jugador_inicio')) {
      const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
      expect(m.solid[ty * m.w + tx], `${e.tipo} ${tx},${ty}`).toBe(0);
    }
    const j = toTiledJson(m, 't.png', 256, 640) as { layers: { name: string; data?: number[] }[] };
    expect(j.layers.map((l) => l.name)).toEqual(['suelo', 'colision', 'objetos', 'entidades']);
    expect(j.layers[0].data).toHaveLength(m.w * m.h);
    expect(forestMap(7)).toEqual(m);
    expect(renderMapPreview(m, tilesetSheet('bosque').png).w).toBe(m.w * TILE);
  });
});

describe('interfaz tipo Diablo y audio', () => {
  it('orbes en 11 niveles, paneles en 9 partes, casilleros con silueta y números de daño', () => {
    const sp = hudSprites();
    const names = sp.map((s) => s.name);
    for (const n of ['orbe_vida', 'orbe_mana', 'panel', 'tooltip', 'casillero', 'equipo_casco', 'equipo_arma', 'equipo_mascota', 'cinturon', 'barra_jefe', 'estandarte', 'cursor_guantelete']) expect(names, n).toContain(n);
    expect(sp.find((s) => s.name === 'orbe_vida')!.frames).toHaveLength(11);
    expect(same(orb('vida', 2), orb('vida', 8))).toBe(false);
    expect(sp.find((s) => s.name === 'panel')!.slice).toEqual([12, 12, 12, 12]);
    const d = digitSheet();
    expect(d.png.w).toBe(d.cw * DIGITS.length);
  });
  it('inventario: 11 casilleros de equipo y bolsa 7 x 4 dentro del panel, sin encimarse', () => {
    const { png, layout } = inventoryPanel();
    expect([png.w, png.h]).toEqual([layout.w, layout.h]);
    for (const k of ['casco', 'amuleto', 'pecho', 'arma', 'mano_libre', 'guantes', 'cinturon', 'botas', 'anillo_1', 'anillo_2', 'mascota']) expect(layout.equipo, k).toHaveProperty(k);
    const g = layout.rejilla;
    const rects = [...Object.values(layout.equipo), [g.x, g.y, g.cols * g.celda, g.filas * g.celda] as [number, number, number, number]];
    for (const [x, y, w, h] of rects) { expect(x).toBeGreaterThanOrEqual(5); expect(y + h).toBeLessThanOrEqual(layout.h - 5); expect(x + w).toBeLessThanOrEqual(layout.w - 5); }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const [a, b] = [rects[i], rects[j]];
      expect(a[0] + a[2] <= b[0] || b[0] + b[2] <= a[0] || a[1] + a[3] <= b[1] || b[1] + b[3] <= a[1]).toBe(true);
    }
  });
  it('sonidos y música: WAV válidos, cortos los efectos y en bucle la música', () => {
    for (const n of SFX_NAMES) {
      const w = encodeWav(SFX[n]());
      expect(new TextDecoder().decode(w.slice(0, 4)), n).toBe('RIFF');
      const secs = (w.length - 44) / 2 / 22050;
      expect(secs, n).toBeLessThan(2);
      expect(secs, n).toBeGreaterThan(0.02);
    }
    expect((encodeWav(MUSIC.bosque()).length - 44) / 2 / 22050).toBeGreaterThan(20);
  }, 60000);
});

describe('kit del juego', () => {
  it('arma personajes en 8 direcciones, mundo, botín, interfaz, audio y manifest; ninguna textura pasa de 4096', () => {
    const files = buildGameKit({ heroes: ['rick'], enemies: ['rata'], thorTiers: [0], quick: true, fichas: { prima: { ...familyFicha('steph', true), name: 'Prima' } } });
    const names = files.map((f) => f.name);
    for (const n of ['manifest.json', 'personajes/rick_walk.png', 'personajes/retrato_rick.png', 'mascota/thor_walk.png', 'enemigos/minotauro_attack_heavy.png', 'mundo/mundo1_bosque.json', 'mundo/mundo1_tiles.png', 'mundo/objetos/portal_azul_girar.png', 'ui/orbe_vida.png', 'botin/catalogo.json', 'audio/moneda.wav', 'audio/musica_jefe.wav', 'CREDITOS.txt']) expect(names, n).toContain(n);
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(m.direcciones).toEqual(['down', 'down_left', 'left', 'up_left', 'up', 'up_right', 'right', 'down_right']);
    expect(m.personajes.rick.anims.walk).toMatchObject({ archivo: 'personajes/rick_walk.png', cuadros: 8 });
    expect(m.personajes.minotauro.tipo).toBe('jefe');
    // ficha exportada del estudio: entra como heroína nueva
    expect(m.personajes.prima).toMatchObject({ tipo: 'heroe', nombre: 'Prima', desde_estudio: true });
    expect(names).toContain('personajes/prima_walk.png');
    expect(m.ui.inventario.layout.rejilla).toMatchObject({ cols: 7, filas: 4 });
    // cada objeto del catálogo está en el atlas que dice, con todos sus cuadros
    const read = (n: string) => JSON.parse(new TextDecoder().decode(files.find((f) => f.name === n)!.bytes));
    const cat = read('botin/catalogo.json');
    const atlases: Record<string, Record<string, unknown>> = {};
    for (const [g, by] of Object.entries(m.botin.atlas as Record<string, Record<string, string>>)) atlases[g] = read(by['32']).frames;
    for (const it of cat.items) {
      expect(atlases[it.atlas], it.id).toBeDefined();
      for (const k of it.animated ? [`${it.icon}_0`, `${it.icon}_7`] : [it.icon]) expect(atlases[it.atlas], `${it.id} -> ${k}`).toHaveProperty([k]);
    }
    expect(m.personajes.minotauro.celda).toBe(64);
    // la hoja de caminar: 8 filas (direcciones) de 48 px
    const walk = files.find((f) => f.name === 'personajes/rick_walk.png')!.bytes;
    const h = (walk[20] << 24) | (walk[21] << 16) | (walk[22] << 8) | walk[23];
    expect(h).toBe(8 * 48);
  }, 240000);
});
