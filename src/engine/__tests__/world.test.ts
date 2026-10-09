import { describe, it, expect } from 'vitest';
import {
  tilesetSheet, terrainTile, groundTile, cornerMask, TILE, forestObjects, forestMap, toTiledJson, renderMapPreview, hudSprites, orb, digitSheet, DIGITS,
  SFX, SFX_NAMES, MUSIC, encodeWav, buildGameKit, type Raster,
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
    const files = buildGameKit({ heroes: ['rick'], enemies: ['rata'], thorTiers: [0], quick: true });
    const names = files.map((f) => f.name);
    for (const n of ['manifest.json', 'personajes/rick_walk.png', 'personajes/retrato_rick.png', 'mascota/thor_walk.png', 'enemigos/minotauro_attack_heavy.png', 'mundo/mundo1_bosque.json', 'mundo/mundo1_tiles.png', 'mundo/objetos/portal_azul_girar.png', 'ui/orbe_vida.png', 'botin/catalogo.json', 'audio/moneda.wav', 'audio/musica_jefe.wav', 'CREDITOS.txt']) expect(names, n).toContain(n);
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(m.direcciones).toEqual(['down', 'down_left', 'left', 'up_left', 'up', 'up_right', 'right', 'down_right']);
    expect(m.personajes.rick.anims.walk).toMatchObject({ archivo: 'personajes/rick_walk.png', cuadros: 8 });
    expect(m.personajes.minotauro.tipo).toBe('jefe');
    expect(m.personajes.minotauro.celda).toBe(64);
    // la hoja de caminar: 8 filas (direcciones) de 48 px
    const walk = files.find((f) => f.name === 'personajes/rick_walk.png')!.bytes;
    const h = (walk[20] << 24) | (walk[21] << 16) | (walk[22] << 8) | walk[23];
    expect(h).toBe(8 * 48);
  }, 240000);
});
