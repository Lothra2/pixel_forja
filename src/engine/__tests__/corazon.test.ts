import { describe, it, expect } from 'vitest';
import { premiumPortal, PORTAL_MUNDO } from '../world/portales';
import { corazonMap, ARENA_DIABLO, ICE } from '../world/corazonMap';
import { fraguaMap } from '../world/fraguaMap';
import { TILE } from '../world/tiles';
import { bigMapToTiled } from '../world/bosqueMap';
import { choquesDeObjetos } from '../kit/gamekit';
import { reactiveObjects } from '../world/reactions';

describe('Mundo 7, parte 7: el portal de hielo de El Corazón Helado', () => {
  it('portal_hielo en el formato de los nuevos, con runas rojas que se apagan', () => {
    const p = premiumPortal('hielo');
    expect(p.name).toBe('portal_hielo');
    expect([p.w, p.h]).toEqual([96, 128]);
    for (const a of ['girar', 'abrir', 'cerrar', 'arco', 'remolino', 'apagado']) expect(p.anims[a], a).toBeTruthy();
    expect([p.anims.girar.frames.length, p.anims.girar.fps]).toEqual([12, 12]);
    expect(PORTAL_MUNDO.mundo7).toBe('hielo');
    const rojo = (r: { data: Uint8ClampedArray | Uint8Array }) => { let n = 0; for (let i = 0; i < r.data.length; i += 4) if (r.data[i + 3] && r.data[i] > 180 && r.data[i + 1] < 90 && r.data[i + 2] < 80) n++; return n; };
    expect(rojo(p.anims.arco.frames[0])).toBeGreaterThan(rojo(p.anims.apagado.frames[0]) + 30);
    // el remolino es blanco y rojo
    const blanco = (r: { data: Uint8ClampedArray | Uint8Array }) => { let n = 0; for (let i = 0; i < r.data.length; i += 4) if (r.data[i + 3] && r.data[i] > 200 && r.data[i + 1] > 220 && r.data[i + 2] > 230) n++; return n; };
    expect(blanco(p.anims.remolino.frames[0])).toBeGreaterThan(100);
    expect(rojo(p.anims.remolino.frames[0])).toBeGreaterThan(100);
  });
});

describe('Mundo 7: El Corazón Helado (mapa y objetos)', () => {
  const m = corazonMap();
  const W = m.w, H = m.h;
  const byName = new Map(m.objects.map((o) => [o.name, o]));
  const ini = m.entities.find((e) => e.tipo === 'jugador_inicio')!;
  const ok = Uint8Array.from(m.solid, (v) => (v ? 0 : 1));
  const bfs = (okM: Uint8Array, from: number[]) => {
    const seen = new Uint8Array(W * H), q = [...from];
    for (const k of q) seen[k] = 1;
    for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = Math.floor(k / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (seen[j] || !okM[j]) continue; seen[j] = 1; q.push(j); } }
    return seen;
  };
  const tileOf = (x: number, y: number) => Math.floor((y - 1) / TILE) * W + Math.floor(x / TILE);
  const k0 = Math.floor(ini.y / TILE) * W + Math.floor(ini.x / TILE);
  const seen = bfs(ok, [k0]);
  const llega = (x: number, y: number, s = seen) => { const k = tileOf(x, y); return [0, 1, -1, W, -W].some((d) => s[k + d] === 1); };
  const zoneOf = (x: number, y: number) => m.zones.find((z) => !z.props.secreto && x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h);
  const ZONAS = ['La Escalera Helada', 'El Bosque de Escarcha', 'El Lago de los Gigantes', 'Las Catacumbas de Hielo', 'La Ciudadela Congelada', 'El Puente de las Cadenas', 'La Puerta del Trono', 'El Corazón Helado'];
  const enemigos = m.entities.filter((e) => e.tipo === 'enemigo');
  const finos = m.entities.filter((e) => e.tipo === 'hielo_fino');

  it('120 x 110, las ocho zonas con su oscuridad, bruma, partículas y ambiente, y una postal por zona', () => {
    expect([W, H]).toEqual([120, 110]);
    const want: Record<string, [number, number, string, string]> = {
      'La Escalera Helada': [0.9, 0.4, 'nieve', 'hielo'], 'El Bosque de Escarcha': [0.95, 0.55, 'nieve', 'bosque_hielo'], 'El Lago de los Gigantes': [0.95, 0.45, 'nieve', 'lago'], 'Las Catacumbas de Hielo': [0.97, 0.6, 'ceniza', 'catacumbas'],
      'La Ciudadela Congelada': [0.95, 0.5, 'nieve', 'ciudadela'], 'El Puente de las Cadenas': [0.95, 0.65, 'ventisca', 'puente'], 'La Puerta del Trono': [0.95, 0.45, 'ceniza', 'puerta'], 'El Corazón Helado': [0.95, 0.35, 'ceniza', 'trono'],
    };
    for (const [nombre, [osc, bruma, part, amb]] of Object.entries(want)) {
      const z = m.zones.find((q) => q.nombre === nombre)!;
      expect(z, nombre).toBeTruthy();
      expect([z.props.oscuridad, z.props.niebla, z.props.particulas, z.props.ambiente], nombre).toEqual([osc, bruma, part, amb]);
      for (const f of String(z.props.frente).split(',')) expect(byName.get(f)?.layer, `${nombre}: ${f}`).toBe('frente');
    }
    expect(m.zones.find((q) => q.nombre === 'El Corazón Helado')!.props.musica).toBe('diablo_1');
    expect(m.zones.find((q) => q.nombre === 'El Lago de los Gigantes')!.props.musica_pelea).toBe('reina_escarcha');
    expect(m.zones.find((q) => q.nombre === 'La Puerta del Trono')!.props.musica_pelea).toBe('guardian');
    expect(m.postales.length).toBe(8);
    for (const p of m.postales) expect(ok[Math.floor(p.y / TILE) * W + Math.floor(p.x / TILE)], p.nombre).toBe(1);
    expect(m.meta!.fondo!.map((f) => f.id)).toEqual(['fondo_hielo_lejos_0', 'fondo_hielo_lejos_1', 'fondo_hielo_lejos_2']);
  });

  it('el agua negra del lago va en la capa agua y es sólida', () => {
    let agua = 0;
    for (let k = 0; k < W * H; k++) if (m.terrain.waterTiles[k]) { agua++; expect(m.solid[k]).toBe(1); }
    expect(agua).toBeGreaterThan(10);
    const tiled = bigMapToTiled(m) as unknown as { json: { layers: { name: string }[] } };
    expect(tiled.json.layers.some((l) => l.name === 'colision')).toBe(true);
  });

  it('5 hogueras de hueso, y desde cualquier cuadro que se camina se llega a una', () => {
    const puntos = m.entities.filter((e) => e.tipo === 'punto_guardado');
    expect(puntos.length).toBe(5);
    for (const p of puntos) { expect(p.props).toMatchObject({ hoguera: true, objeto: 'hoguera_hueso' }); expect(llega(p.x, p.y)).toBe(true); }
    expect(m.decos.filter((d) => d.sprite === 'hoguera_hueso').length).toBe(5);
    expect(puntos.find((p) => p.props?.tutorial)?.props?.nombre).toBe('La Escalera Helada');
    const desde = bfs(ok, puntos.map((f) => Math.floor(f.y / TILE) * W + Math.floor(f.x / TILE)));
    let sueltos = 0;
    for (let k = 0; k < W * H; k++) if (ok[k] && !desde[k]) sueltos++;
    expect(sueltos).toBe(0);
  });

  it('refugios de la ventisca (columnas y gigantes) en todo el mapa, más en el Puente y el Lago', () => {
    const ref = m.entities.filter((e) => e.tipo === 'columna_hielo' || e.tipo === 'gigante');
    expect(ref.filter((e) => e.tipo === 'gigante').length).toBeGreaterThanOrEqual(4);
    expect(ref.length).toBeGreaterThanOrEqual(24);
    const por: Record<string, number> = {};
    for (const r of ref) { expect(byName.has(String(r.props!.objeto))).toBe(true); expect(m.decos.some((d) => d.sprite === r.props!.objeto && Math.abs(d.x - r.x) < 96 && Math.abs(d.y - r.y) < 32)).toBe(true); expect(m.solid[Math.floor(r.y / TILE) * W + Math.floor(r.x / TILE)], String(r.props!.id)).toBe(1); por[String(r.props!.zona)] = (por[String(r.props!.zona)] ?? 0) + 1; }
    for (const z of ZONAS.filter((q) => q !== 'El Bosque de Escarcha' && q !== 'Las Catacumbas de Hielo')) expect(por[z] ?? 0, z).toBeGreaterThanOrEqual(2);
    const media = ref.length / ZONAS.length;
    expect(por['El Puente de las Cadenas']).toBeGreaterThan(media);
    expect(por['El Lago de los Gigantes']).toBeGreaterThan(media);
  });

  it('hielo fino: rectángulos caminables sobre el lago, y ningún camino obligado lo cruza', () => {
    expect(finos.length).toBeGreaterThanOrEqual(6);
    const okSinFino = Uint8Array.from(ok);
    for (const f of finos) {
      const w = Number(f.props!.width), h = Number(f.props!.height);
      expect(w % 32 + h % 32 + f.x % 32 + f.y % 32).toBe(0);
      expect(Math.min(w, h) / 32).toBeLessThanOrEqual(4);
      expect(f.props!.zona).toBe('El Lago de los Gigantes');
      for (let y = f.y; y < f.y + h; y += 32) for (let x = f.x; x < f.x + w; x += 32) { const k = Math.floor(y / 32) * W + Math.floor(x / 32); expect(ok[k], String(f.props!.id)).toBe(1); okSinFino[k] = 0; }
    }
    // con todo el hielo fino tapado igual se llega a las hogueras, la arena y los dos minijefes
    const s = bfs(okSinFino, [k0]);
    const importantes = [...m.entities.filter((e) => e.tipo === 'punto_guardado' || e.tipo === 'arena_jefe'), ...enemigos.filter((e) => e.props?.elite)];
    for (const e of importantes) expect(llega(e.x, e.y, s), `${e.tipo} ${e.props?.nombre ?? ''}`).toBe(true);
    // el hielo fino va sobre el hielo del lago
    let enHielo = 0;
    for (const f of finos) if (Math.abs(f.x / 32 - 56) < 24 && Math.abs(f.y / 32 - 18) < 14) enHielo++;
    expect(enHielo).toBe(finos.length);
    void ICE;
    const tiled = bigMapToTiled(m) as unknown as { json: { layers: { name: string; objects?: { type: string; width: number; height: number; point: boolean }[] }[] } };
    const f0 = tiled.json.layers.find((l) => l.name === 'entidades')!.objects!.find((o) => o.type === 'hielo_fino')!;
    expect([f0.point, f0.width > 0, f0.height > 0]).toEqual([false, true, true]);
  });

  it('más monstruos que la Fragua (el doble), en grupos grandes, y los dos minijefes', () => {
    const fragua = fraguaMap().entities.filter((e) => e.tipo === 'enemigo').length;
    expect(enemigos.length).toBeGreaterThanOrEqual(fragua * 2);
    const grupos = new Map<string, string[]>();
    for (const e of enemigos) if (e.props?.grupo) grupos.set(String(e.props.grupo), [...(grupos.get(String(e.props.grupo)) ?? []), String(e.props.enemigo)]);
    for (const [g, ids] of grupos) {
      expect(new Set(ids).size, g).toBe(1);
      if (ids[0] === 'lobo_escarcha') { expect(ids.length, g).toBeGreaterThanOrEqual(4); expect(ids.length, g).toBeLessThanOrEqual(6); }
      if (ids[0] === 'diablillo') { expect(ids.length, g).toBeGreaterThanOrEqual(5); expect(ids.length, g).toBeLessThanOrEqual(8); }
    }
    for (const id of ['lobo_escarcha', 'espectro_helado', 'diablillo', 'caballero_congelado', 'bruja_escarcha', 'sombra_devoradora']) expect(enemigos.filter((e) => e.props?.enemigo === id).length, id).toBeGreaterThanOrEqual(3);
    const reina = enemigos.find((e) => e.props?.enemigo === 'reina_escarcha')!, guardian = enemigos.find((e) => e.props?.enemigo === 'guardian_puerta')!;
    expect(reina.props).toMatchObject({ elite: true, nombre: 'La Reina Escarcha' });
    expect(guardian.props).toMatchObject({ elite: true, nombre: 'El Guardián de la Puerta' });
    expect(zoneOf(reina.x, reina.y)?.nombre).toBe('El Lago de los Gigantes');
    expect(zoneOf(guardian.x, guardian.y)?.nombre).toBe('La Puerta del Trono');
    expect(m.entities.filter((e) => e.tipo === 'cofre' && e.props?.guardado_por).length).toBe(2);
    // las sombras devoradoras están en las catacumbas
    expect(enemigos.filter((e) => e.props?.enemigo === 'sombra_devoradora' && zoneOf(e.x, e.y)?.nombre === 'Las Catacumbas de Hielo').length).toBeGreaterThanOrEqual(5);
  });

  it('cofres, secretos, portales, el mural 7, la Ladrona y el trono', () => {
    expect(m.entities.filter((e) => e.tipo === 'cofre').length).toBeGreaterThanOrEqual(8);
    expect(m.entities.filter((e) => e.tipo === 'cofre' && e.props?.secreto).length).toBeGreaterThanOrEqual(2);
    expect(m.zones.filter((z) => z.props.secreto).length).toBeGreaterThanOrEqual(2);
    expect(m.entities.find((e) => e.tipo === 'portal_llegada')?.props?.portal).toBe('portal_hielo');
    expect(m.entities.find((e) => e.tipo === 'portal_volver')?.props?.destino).toBe('mundo6');
    expect(m.entities.find((e) => e.tipo === 'portal_jefe')?.props?.destino).toBe('fin');
    const mural = m.entities.find((e) => e.tipo === 'mural')!;
    expect(mural.props?.pieza).toBe(7);
    expect(zoneOf(mural.x, mural.y)?.nombre).toBe('Las Catacumbas de Hielo');
    expect(m.decos.some((d) => d.sprite === 'mural_7')).toBe(true);
    const trono = m.entities.find((e) => e.tipo === 'trono_diablo')!;
    expect(m.decos.some((d) => d.sprite === 'trono_diablo' && d.x === trono.x && d.y === trono.y)).toBe(true);
    const fig = m.entities.filter((e) => e.tipo === 'figura');
    const alta = fig.find((f) => f.props?.alto)!;
    expect(alta.props?.objeto).toBe('figura_ultima_llama');
    expect(Math.abs(alta.x - trono.x)).toBeLessThan(200);
    for (const e of m.entities) if (!e.props?.alto && !['trono_diablo', 'hielo_fino', 'columna_hielo', 'gigante'].includes(e.tipo)) expect(llega(e.x, e.y), `${e.tipo} ${e.props?.enemigo ?? ''} en ${Math.floor(e.x / TILE)},${Math.floor(e.y / TILE)}`).toBe(true);
  });

  it('la arena del Diablo: radio 256, 4 braseros de hueso a unos 170 px, se camina entera y se llega a los cuatro', () => {
    const arena = m.entities.find((e) => e.tipo === 'arena_jefe')!;
    const jefe = m.entities.find((e) => e.tipo === 'jefe')!;
    expect(arena.props!.radio).toBe(256);
    expect([jefe.x, jefe.y]).toEqual([arena.x, arena.y]);
    expect(jefe.props).toMatchObject({ enemigo: 'diablo', nombre: 'El Diablo' });
    expect(String(jefe.props!.titulo).length).toBeGreaterThan(5);
    expect(zoneOf(arena.x, arena.y)?.nombre).toBe('El Corazón Helado');
    const br = m.entities.filter((e) => e.tipo === 'brasero_hueso');
    expect(br.length).toBe(4);
    for (const b of br) {
      expect(Math.abs(Math.hypot(b.x - arena.x, b.y - arena.y) - ARENA_DIABLO.brasero)).toBeLessThan(4);
      expect(m.decos.some((d) => d.sprite === 'brasero_hueso' && d.x === b.x && d.y === b.y)).toBe(true);
      // se llega al lado del brasero (el brasero es sólido)
      const tx = Math.floor(b.x / TILE), ty = Math.floor((b.y - 1) / TILE);
      expect([[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]].some(([dx, dy]) => seen[(ty + dy) * W + tx + dx] === 1)).toBe(true);
    }
    const ring: number[] = [];
    let blocked = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (Math.hypot((x + 0.5) * TILE - arena.x, (y + 0.5) * TILE - arena.y) > ARENA_DIABLO.radio - 12) continue;
      if (ok[y * W + x]) ring.push(y * W + x); else blocked++;
    }
    expect(blocked).toBeLessThanOrEqual(6);
    const solo = new Uint8Array(W * H);
    for (const k of ring) solo[k] = 1;
    expect(bfs(solo, [ring[0]]).reduce((a, v) => a + v, 0)).toBe(ring.length);
    for (const k of ring) expect(seen[k]).toBe(1);
    // el trono detrás de la arena (al norte)
    const trono = m.entities.find((e) => e.tipo === 'trono_diablo')!;
    expect(trono.y).toBeLessThan(arena.y - ARENA_DIABLO.radio + 40);
  });

  it('tres ramas que vuelven al camino: tapar una no deja afuera las hogueras ni la arena', () => {
    expect(m.premium.ramas.length).toBeGreaterThanOrEqual(3);
    const arena = m.entities.find((e) => e.tipo === 'arena_jefe')!;
    const importantes = [...m.entities.filter((e) => e.tipo === 'punto_guardado'), arena];
    for (const rama of m.premium.ramas) {
      const okR = Uint8Array.from(ok);
      for (const [x, y] of rama.tapar) { expect(ok[y * W + x], `${rama.nombre} ${x},${y}`).toBe(1); okR[y * W + x] = 0; }
      const s = bfs(okR, [k0]);
      for (const e of importantes) expect(llega(e.x, e.y, s), `${rama.nombre}: ${e.tipo}`).toBe(true);
      expect(llega(rama.medio[0] * TILE + 16, rama.medio[1] * TILE + 17, s), rama.nombre).toBe(true);
    }
  });

  it('cada postal: tres planos, nada repetido igual en la pantalla y algo que se mueve', () => {
    for (const p of m.premium.pantallas) {
      // los cuatro braseros de la arena son los del encargo (iguales a propósito: se prenden en el juego)
      const objs = p.objetos.filter((o) => o !== 'brasero_hueso');
      expect(objs.length, p.nombre).toBeGreaterThanOrEqual(5);
      const rep = objs.filter((o, i) => objs.indexOf(o) !== i);
      expect(rep, p.nombre).toEqual([]);
      const moving = objs.some((o) => Object.values(byName.get(o)!.anims).some((a) => a.frames.length > 1));
      expect(moving, p.nombre).toBe(true);
    }
  });

  it('los objetos del encargo a su medida, sus animaciones y la sombra de contacto nomás', () => {
    const tabla: [string, number, number][] = [
      ['hoguera_hueso', 64, 64], ['columna_hielo_0', 64, 160], ['columna_hielo_3', 64, 160], ['gigante_congelado_0', 192, 160], ['gigante_congelado_2', 192, 160], ['hielo_fino', 64, 64], ['hielo_fino_3', 64, 64],
      ['arbol_hielo_0', 96, 160], ['arbol_hielo_3', 96, 160], ['brasero_hueso', 48, 80], ['trono_diablo', 256, 256], ['cadena_helada_2', 128, 128], ['nieve_frente_1', 128, 128], ['carambanos_frente_1', 128, 128],
      ['fondo_hielo_lejos_2', 512, 256], ['mural_7', 128, 96], ['figura_ultima_llama', 48, 64],
    ];
    for (const [n, w, h] of tabla) { const o = byName.get(n)!; expect(o, n).toBeTruthy(); expect([o.w, o.h], n).toEqual([w, h]); }
    const an = (n: string, a: string) => byName.get(n)!.anims[a];
    expect([an('hoguera_hueso', 'idle').frames.length, an('hoguera_hueso', 'idle').fps]).toEqual([8, 8]);
    expect(byName.get('hoguera_hueso')!.light).toMatchObject({ color: '#ffb060', radius: 240 });
    expect([byName.get('hoguera_hueso')!.solid![2], byName.get('hoguera_hueso')!.solid![3]]).toEqual([32, 12]);
    for (let v = 0; v < 4; v++) { const c = byName.get(`columna_hielo_${v}`)!; expect(c.solid).toBeTruthy(); expect(c.anims.idle.frames.length).toBe(1); }
    for (let v = 0; v < 3; v++) { const g = byName.get(`gigante_congelado_${v}`)!; expect(g.solid).toBeTruthy(); expect([g.anims.respira.frames.length, g.anims.respira.fps]).toEqual([2, 1]); expect(g.anims.idle.frames.length).toBe(1); }
    for (const v of ['', '_0', '_1', '_2', '_3']) { const f = byName.get(`hielo_fino${v}`)!; expect(f.layer).toBe('suelo'); expect(f.anims.quieto.frames.length).toBe(1); expect(f.anims.cruje.frames.length).toBe(6); expect(f.anims.cruje.fps).toBe(8); expect(f.anims.roto.frames.length).toBe(1); }
    for (let v = 0; v < 4; v++) { const a = byName.get(`arbol_hielo_${v}`)!; expect([a.anims.idle.frames.length, a.anims.idle.fps]).toEqual([2, 2]); expect(a.solid).toBeTruthy(); }
    const b = byName.get('brasero_hueso')!;
    expect(b.light!.radius).toBe(220);
    expect([b.anims.apagado.frames.length, b.anims.prenderse.frames.length, b.anims.prenderse.fps, b.anims.prendido.frames.length, b.anims.prendido.fps, b.anims.congelado.frames.length]).toEqual([1, 8, 12, 6, 8, 1]);
    expect(b.anims.prenderse.loop).toBe(false);
    expect([an('trono_diablo', 'idle').frames.length, an('trono_diablo', 'idle').fps]).toEqual([6, 4]); expect(byName.get('trono_diablo')!.solid).toBeTruthy();
    for (const n of ['cadena_helada_0', 'cadena_helada_1', 'cadena_helada_2', 'nieve_frente_0', 'nieve_frente_1', 'carambanos_frente_0', 'carambanos_frente_1']) { expect(byName.get(n)!.layer, n).toBe('frente'); const a = an(n, 'idle'); expect(a.fps).toBeGreaterThanOrEqual(2); expect(a.fps).toBeLessThanOrEqual(4); expect(a.frames.length).toBeGreaterThanOrEqual(2); }
    for (const n of ['fondo_hielo_lejos_0', 'fondo_hielo_lejos_1', 'fondo_hielo_lejos_2']) expect(byName.get(n)!.layer).toBe('fondo');
    const fig = byName.get('figura_ultima_llama')!;
    expect([fig.anims.idle.frames.length, fig.anims.idle.fps, fig.anims.irse.frames.length, fig.anims.irse.fps]).toEqual([4, 4, 8, 10]);
    expect(fig.solid).toBe(null); expect(fig.light!.color).toBe('#ff2a1a'); expect(fig.light!.radius).toBeLessThanOrEqual(60);
    for (const n of ['arma_congelada_0', 'escudo_roto_0', 'calavera_demonio_0', 'bandera_helada_0', 'lapida_hielo_0', 'sarcofago_hielo']) expect(byName.get(n)!.solid, n).toBeTruthy();
    for (const n of ['nieve_acumulada_0', 'grieta_hielo_0', 'huellas_lobo_0', 'escarcha_0', 'ceniza_negra_0']) expect(byName.get(n)!.layer, n).toBe('suelo');
    // sombra de contacto: pegada al pie, nada lejos
    for (const o of byName.values()) {
      if (!o.shadow || !/^(hoguera|columna|gigante|arbol_hielo|brasero_hueso|trono|arma|escudo|calavera|bandera|lapida|sarcofago|estalagmita|roca_hielo|armadura)/.test(o.name)) continue;
      let far = 0;
      for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) if (o.shadow.data[(y * o.w + x) * 4 + 3] && Math.abs(y - o.anchor[1]) > 7) far++;
      expect(far, o.name).toBe(0);
    }
  });

  it('ningún objeto del Mundo 7 pisa a uno de otro mundo', () => {
    expect(choquesDeObjetos([{ mundo: 'mundo1', objetos: reactiveObjects() }, { mundo: 'mundo6', objetos: fraguaMap().objects }, { mundo: 'mundo7', objetos: m.objects }])).toEqual([]);
    // y los nombres nuevos no repiten los de la Fragua (aunque tengan la misma forma)
    const viejos = new Set(fraguaMap().objects.map((o) => o.name));
    const nuevos = m.objects.filter((o) => !o.name.startsWith('portal_') && !['cartel', 'aviso_jefe'].includes(o.name));
    expect(nuevos.filter((o) => viejos.has(o.name)).map((o) => o.name)).toEqual([]);
  });
}, 600_000);

describe('Mundo 7, parte 6: los íconos para Alana', () => {
  it('frio, compañeras, brasero y romper: 40 x 40, redondos, con el aro dorado', async () => {
    const { skillIcons } = await import('../ui/icons2');
    const ic = new Map(skillIcons().map((s) => [s.name, s.frames[0]]));
    for (const n of ['frio', 'compañeras', 'brasero', 'romper']) {
      const r = ic.get(n)!;
      expect(r, n).toBeTruthy();
      expect([r.w, r.h], n).toEqual([40, 40]);
      expect(r.data[3], n).toBe(0);
      expect(r.data[(39 * 40 + 39) * 4 + 3], n).toBe(0);
      // el aro dorado: en el borde de arriba del medallón hay dorado
      let oro = 0;
      for (let y = 0; y < 6; y++) for (let x = 14; x < 26; x++) { const k = (y * 40 + x) * 4; if (r.data[k + 3] && r.data[k] > 180 && r.data[k + 1] > 130 && r.data[k + 2] < 120) oro++; }
      expect(oro, n).toBeGreaterThan(3);
    }
    // el del frío tiene azul; el del brasero, fuego
    const cuenta = (r: { data: Uint8ClampedArray | Uint8Array }, f: (R: number, G: number, B: number) => boolean) => { let n = 0; for (let i = 0; i < r.data.length; i += 4) if (r.data[i + 3] && f(r.data[i], r.data[i + 1], r.data[i + 2])) n++; return n; };
    expect(cuenta(ic.get('frio')!, (R, _G, B) => B > 150 && R < 120)).toBeGreaterThan(20);
    expect(cuenta(ic.get('brasero')!, (R, G, B) => R > 220 && G < 140 && B < 80)).toBeGreaterThan(8);
  });
});
