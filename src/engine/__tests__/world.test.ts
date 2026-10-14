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
    // superficie viva para los niveles 1 a 9, cuatro pasos cada uno, y la ola de verdad se mueve
    expect(sp.find((s) => s.name === 'orbe_mana_ola')!.frames).toHaveLength(36);
    // la flecha guía: 8 direcciones, todas distintas
    const fl = sp.find((s) => s.name === 'flecha_guia')!.frames;
    expect(fl).toHaveLength(8);
    for (let i = 1; i < 8; i++) expect(same(fl[0], fl[i])).toBe(false);
    expect(same(orb('vida', 5, 0), orb('vida', 5, 1))).toBe(false);
    // el líquido crece con el nivel: se cuentan los pixeles rojizos dentro del vidrio
    const rojos = (n: number) => { const o = orb('vida', n); let c = 0; for (let i = 0; i < o.data.length; i += 4) if (o.data[i] > 70 && o.data[i] > o.data[i + 2] * 2 && o.data[i + 1] < 90) c++; return c; };
    for (let n = 1; n <= 10; n++) expect(rojos(n), `nivel ${n}`).toBeGreaterThan(rojos(n - 1));
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
      // los efectos en bucle (el carrito que rueda), las campanas y la marea duran lo que pide el encargo
      const largo: Record<string, number> = { carrito_rodar: 3.05, campana_lejos: 4, campana_cerca: 4, marea_sube: 6.05, reloj_campanada: 4.3, rey_canta: 3.4, ciudad_despierta: 3.8 };
      expect(secs, n).toBeLessThan(largo[n] ?? 2);
      expect(secs, n).toBeGreaterThan(0.02);
    }
    expect((encodeWav(MUSIC.bosque()).length - 44) / 2 / 22050).toBeGreaterThan(20);
  }, 60000);
});

describe('kit del juego', () => {
  it('arma personajes en 8 direcciones, mundo, botín, interfaz, audio y manifest; ninguna textura pasa de 4096', () => {
    const files = buildGameKit({ heroes: ['rick'], enemies: ['rata'], thorTiers: [0], quick: true, fichas: { prima: { ...familyFicha('steph', true), name: 'Prima' } } });
    const names = files.map((f) => f.name);
    for (const n of ['manifest.json', 'personajes/rick_walk.png', 'personajes/retrato_rick.png', 'mascota/thor_walk.png', 'enemigos/minotauro_idle.png', 'enemigos/guardian_campana_idle.png', 'mundo/mundo1_bosque.json', 'mundo/suelo/mundo1_bosque_0.png', 'mundo/agua.png', 'mundo/objetos/portal_azul_girar.png', 'mundo/objetos/abuelo_roble_v3_idle.png', 'mundo/objetos/arbol_hechizado_0_despierto.png', 'mundo/criaturas/cuervo_volar.png', 'mundo/niebla_nubes.png', 'mundo/particulas/luciernaga.png', 'mundo/luz.png', 'mundo/postales/cascada_y_vado.png', 'audio/ambiente_bosque.wav', 'ui/orbe_vida.png', 'botin/catalogo.json', 'audio/moneda.wav', 'audio/musica_jefe.wav', 'CREDITOS.txt', 'ui/icono_pausa.png', 'ui/girar_tablet.png', 'ui/carteles/peligro.png', 'mundo/objetos/campamento_fogata_idle.png', 'mundo/objetos/roble_0_copa.png', 'mundo/objetos/roble_0_tronco.png', 'mundo/postales/lago_espejo.png', 'audio/descubrir.wav', 'audio/paso_madera_0.wav', 'fx/proyectil_flecha_up.png', 'fx/impacto_flecha.png', 'fx/proyectil_naturaleza_left.png', 'fx/nova_naturaleza.png', 'ui/habilidades/llamar_thor.png', 'ui/continuara.png', 'audio/musica_titulo.wav', 'fx/tierra_cavada.png', 'mundo/objetos/pasto_alto_apartar_izq.png', 'mundo/objetos/abuelo_roble_v3_sonreir.png']) expect(names, n).toContain(n);
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(m.direcciones).toEqual(['down', 'down_left', 'left', 'up_left', 'up', 'up_right', 'right', 'down_right']);
    expect(m.personajes.rick.anims.walk).toMatchObject({ archivo: 'personajes/rick_walk.png', cuadros: 8 });
    expect(m.personajes.minotauro.tipo).toBe('jefe');
    // el mercader de las fogatas: un PNJ con su gesto, en 8 direcciones
    expect(m.personajes.mercader).toMatchObject({ tipo: 'npc', nombre: 'Don Cachivache', celda: 48 });
    expect(Object.keys(m.personajes.mercader.anims)).toEqual(expect.arrayContaining(['idle', 'cast']));
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
    // el minotauro se dibuja a su tamaño: celda 128 sin agrandar, hoja de 8 filas de 128 y pivote medido en los pies
    expect(m.personajes.minotauro).toMatchObject({ celda: 128, perfil_movimiento: 'premium' });
    expect(m.personajes.minotauro.pivote[0]).toBe(64);
    expect(m.personajes.minotauro.pivote[1]).toBeGreaterThan(96);
    const mw = files.find((f) => f.name === 'enemigos/minotauro_idle.png')!.bytes;
    expect((mw[20] << 24) | (mw[21] << 16) | (mw[22] << 8) | mw[23]).toBe(8 * 128);
    expect(m.personajes.guardian_campana).toMatchObject({ celda: 128, perfil_movimiento: 'premium' });
    expect(m.fx.onda_pisoton).toMatchObject({ celda: 96, cuadros: 8, fps: 16, loop: false });
    expect(m.mundo.objetos.aviso_carga).toMatchObject({ w: 32, h: 48, apoyo: [0, 24] });
    expect(Object.keys(m.app).sort()).toEqual(['apple_touch_180', 'favicon_32', 'icono_192', 'icono_512', 'icono_maskable_512']);
    expect(m.ui.iconos_cartel.peligro).toBe('ui/carteles/peligro.png');
    expect(m.ui.girar_tablet.cuadros).toBe(2);
    expect(m.ui.habilidades.curar).toBe('ui/habilidades/curar.png');
    expect(m.fx.proyectil_flecha_right).toMatchObject({ cuadros: 2, fps: 14, loop: true, celda: 48 });
    expect(cat.items.find((i: { id: string }) => i.id === 'm_arco_certero')).toMatchObject({ rarity: 'magic', atlas: 'iconos' });
    expect(cat.items.find((i: { id: string }) => i.id === 'ramita_del_abuelo')).toMatchObject({ rarity: 'legendary', atlas: 'especiales', animated: true });
    // la hoja de caminar: 8 filas (direcciones) de 48 px
    const walk = files.find((f) => f.name === 'personajes/rick_walk.png')!.bytes;
    const h = (walk[20] << 24) | (walk[21] << 16) | (walk[22] << 8) | walk[23];
    expect(h).toBe(8 * 48);
  }, 600000); // con el Mundo 4 (el mapa del puerto y el farol de Thor) el kit rápido tarda más
});

describe('cascada a la medida del acantilado', () => {
  it('cubre cada columna del labio al pie aunque el borde sea diagonal, y echa espuma abajo', async () => {
    const { fittedWaterfall } = await import('../world/landmarks');
    const cols = Array.from({ length: 61 }, (_, i) => { const x = 100 + i, lip = 50 + Math.round(i * 0.4) + (i % 7 === 0 ? 2 : 0); return { x, lip, base: lip + 48 + (i % 5) }; });
    const isWater = (x: number, y: number) => x >= 96 && x <= 164 && y > cols[Math.max(0, Math.min(60, x - 100))].base;
    const { obj, x, y } = fittedWaterfall(cols, isWater);
    const ox = x - obj.anchor[0], oy = y - obj.anchor[1];
    const f0 = obj.anims.idle.frames[0];
    const a = (fr: typeof f0, wx: number, wy: number) => fr.data[((wy - oy) * fr.w + (wx - ox)) * 4 + 3];
    for (const c of cols.slice(2, -2)) {
      for (let yy = c.lip; yy < c.base; yy++) expect(a(f0, c.x, yy), `columna ${c.x} y ${yy}`).toBe(255);
      expect(a(f0, c.x, c.lip - 7), 'nada flota arriba del labio').toBe(0);
    }
    // espuma blanca al pie
    let blancos = 0;
    for (const c of cols) for (let yy = c.base - 2; yy < c.base + 10; yy++) { const i = ((yy - oy) * f0.w + (c.x - ox)) * 4; if (f0.data[i] === 255 && f0.data[i + 1] === 255 && f0.data[i + 2] === 255) blancos++; }
    expect(blancos).toBeGreaterThan(cols.length);
    expect(obj.layer).toBe('suelo');
    expect(obj.foam).toEqual([100 - x, cols[0].base - y, 160 - x, cols[60].base - y]);
    // se mueve: los cuadros no son iguales
    expect(Buffer.from(obj.anims.idle.frames[1].data).equals(Buffer.from(f0.data))).toBe(false);
  });
});
