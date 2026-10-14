import { describe, it, expect } from 'vitest';
import { premiumPortal, PORTAL_MUNDO } from '../world/portales';
import { fraguaMap, ARENA_DRAGONA, LAVA } from '../world/fraguaMap';
import { JAULA_CANDADO } from '../world/fraguaObjects';
import { TILE } from '../world/tiles';
import { bigMapToTiled } from '../world/bosqueMap';

describe('Mundo 6, parte 7: el portal brasa de La Fragua de las Luces', () => {
  it('portal_brasa en el formato de los nuevos, con grietas naranjas que se apagan', () => {
    const p = premiumPortal('brasa');
    expect(p.name).toBe('portal_brasa');
    expect([p.w, p.h]).toEqual([96, 128]);
    for (const a of ['girar', 'abrir', 'cerrar', 'arco', 'remolino', 'apagado']) expect(p.anims[a], a).toBeTruthy();
    expect([p.anims.girar.frames.length, p.anims.girar.fps]).toEqual([12, 12]);
    expect(PORTAL_MUNDO.mundo6).toBe('brasa');
    const naranja = (r: { data: Uint8ClampedArray | Uint8Array }) => { let n = 0; for (let i = 0; i < r.data.length; i += 4) if (r.data[i + 3] && r.data[i] > 220 && r.data[i + 1] > 90 && r.data[i + 1] < 140 && r.data[i + 2] < 60) n++; return n; };
    expect(naranja(p.anims.arco.frames[0])).toBeGreaterThan(naranja(p.anims.apagado.frames[0]) + 30);
  });
});

describe('Mundo 6: La Fragua de las Luces (mapa y objetos)', () => {
  const m = fraguaMap();
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
  const ZONAS = ['La Escalera de Ceniza', 'El Río de Lava', 'Las Jaulas Colgantes', 'Los Fuelles', 'El Bosque de Ceniza', 'La Cárcel de las Luces', 'El Horno', 'El Corazón de la Fragua'];

  it('110 x 100, las ocho zonas con su oscuridad, bruma, partículas, ambiente y música, y una postal por zona', () => {
    expect([W, H]).toEqual([110, 100]);
    const want: Record<string, [number, number, string, string]> = {
      'La Escalera de Ceniza': [0.8, 0.35, 'brasas', 'fragua'], 'El Río de Lava': [0.88, 0.4, 'brasas', 'lava'], 'Las Jaulas Colgantes': [0.9, 0.45, 'brasas', 'jaulas'], 'Los Fuelles': [0.88, 0.5, 'brasas', 'fuelles'],
      'El Bosque de Ceniza': [0.92, 0.55, 'ceniza', 'bosque_ceniza'], 'La Cárcel de las Luces': [0.9, 0.45, 'brasas', 'carcel'], 'El Horno': [0.88, 0.55, 'brasas', 'horno'], 'El Corazón de la Fragua': [0.9, 0.4, 'brasas', 'jefe'],
    };
    for (const [nombre, [osc, bruma, part, amb]] of Object.entries(want)) {
      const z = m.zones.find((q) => q.nombre === nombre)!;
      expect(z, nombre).toBeTruthy();
      expect([z.props.oscuridad, z.props.niebla, z.props.particulas, z.props.ambiente], nombre).toEqual([osc, bruma, part, amb]);
      for (const f of String(z.props.frente).split(',')) expect(byName.get(f)?.layer, `${nombre}: ${f}`).toBe('frente');
    }
    const cor = m.zones.find((q) => q.nombre === 'El Corazón de la Fragua')!.props;
    expect([cor.musica, cor.musica_victoria]).toEqual(['jefe_dragona', 'liberacion']);
    expect(m.zones.find((q) => q.nombre === 'La Cárcel de las Luces')!.props.musica_pelea).toBe('carcelero');
    expect(m.zones.filter((z) => !z.props.secreto && z.nombre !== 'El Corazón de la Fragua').every((z) => z.props.musica === 'ninguna')).toBe(true);
    expect(m.postales.length).toBe(8);
    expect(m.meta!.lava).toBe(true);
    expect(m.meta!.fondo!.map((f) => f.id)).toEqual(['fondo_fragua_lejos_0', 'fondo_fragua_lejos_1', 'fondo_fragua_lejos_2']);
  });

  it('la lava va en la capa agua, es sólida y no se camina; sin reflejo', () => {
    let lava = 0;
    for (let k = 0; k < W * H; k++) if (m.terrain.waterTiles[k]) { lava++; expect(m.solid[k], `lava en ${k % W},${Math.floor(k / W)}`).toBe(1); }
    expect(lava).toBeGreaterThan(400);
    const tiled = bigMapToTiled(m) as unknown as { json: { layers: { name: string; data?: number[] }[] } };
    const reflejo = tiled.json.layers.find((l) => l.name === 'reflejo')!;
    expect(reflejo.data!.every((v) => v === 0)).toBe(true);
    void LAVA;
  });

  it('5 fuentes frías, y desde cualquier cuadro que se camina se llega a una', () => {
    const puntos = m.entities.filter((e) => e.tipo === 'punto_guardado');
    expect(puntos.length).toBe(5);
    for (const p of puntos) { expect(p.props).toMatchObject({ fuente_fria: true, objeto: 'fuente_fria' }); expect(llega(p.x, p.y)).toBe(true); }
    expect(m.decos.filter((d) => d.sprite === 'fuente_fria').length).toBe(5);
    expect(puntos.find((p) => p.props?.tutorial)?.props?.nombre).toBe('La Escalera de Ceniza');
    const desde = bfs(ok, puntos.map((f) => Math.floor(f.y / TILE) * W + Math.floor(f.x / TILE)));
    let sueltos = 0;
    for (let k = 0; k < W * H; k++) if (ok[k] && !desde[k]) sueltos++;
    expect(sueltos).toBe(0);
  });

  it('40 jaulas o más, 4 o más por zona, con su luz y su zona, el candado al alcance y sin paredes cerca', () => {
    const jaulas = m.entities.filter((e) => e.tipo === 'jaula');
    expect(jaulas.length).toBeGreaterThanOrEqual(40);
    for (const z of ZONAS) expect(jaulas.filter((j) => j.props?.zona === z).length, z).toBeGreaterThanOrEqual(4);
    expect(new Set(jaulas.map((j) => j.props!.luz))).toEqual(new Set(['bosque', 'catedral', 'galerias', 'faro', 'ciudad']));
    for (const j of jaulas) {
      expect(zoneOf(j.x, j.y)?.nombre, String(j.props!.id)).toBe(j.props!.zona);
      expect(byName.has(`jaula_luz_${j.props!.luz}`)).toBe(true);
      expect(llega(j.x, j.y + 1), String(j.props!.id)).toBe(true);
      // dentro de una celda de 64 alrededor del candado no hay paredes
      for (const [dx, dy] of [[-32, -32], [31, -32], [-32, 31], [31, 31], [0, 0]]) expect(m.solid[Math.floor((j.y + dy) / TILE) * W + Math.floor((j.x + dx) / TILE)], String(j.props!.id)).toBe(0);
    }
    // las 8 de la cárcel, alrededor del Carcelero
    const carcel = jaulas.filter((j) => j.props?.carcel);
    expect(carcel.length).toBeGreaterThanOrEqual(8);
    const c = m.entities.find((e) => e.props?.enemigo === 'carcelero')!;
    for (const j of carcel) expect(Math.hypot(j.x - c.x, j.y - c.y)).toBeLessThan(8 * TILE);
    expect(JAULA_CANDADO[1]).toBeGreaterThan(30);
  });

  it('charcos fríos (2 por zona y en el borde de la arena), grietas caminables con fase, y fuelles con zona', () => {
    const ch = m.entities.filter((e) => e.tipo === 'charco_frio');
    for (const z of ZONAS) expect(ch.filter((q) => q.props?.zona === z).length, z).toBeGreaterThanOrEqual(2);
    for (const q of ch) expect(m.decos.some((d) => d.sprite === 'charco_frio' && d.x === q.x && d.y === q.y)).toBe(true);
    const arena = m.entities.find((e) => e.tipo === 'arena_jefe')!;
    expect(ch.filter((q) => Math.hypot(q.x - arena.x, q.y - arena.y) < ARENA_DRAGONA.radio).length).toBeGreaterThanOrEqual(1);
    const gr = m.entities.filter((e) => e.tipo === 'grieta');
    expect(gr.length).toBeGreaterThanOrEqual(12);
    for (const g of gr) {
      const w = Number(g.props!.width), h = Number(g.props!.height), f = Number(g.props!.fase);
      expect(w % 32 + h % 32).toBe(0);
      expect(w / 32).toBeLessThanOrEqual(3); expect(h / 32).toBeLessThanOrEqual(3);
      expect(f).toBeGreaterThanOrEqual(0); expect(f).toBeLessThanOrEqual(1);
      for (let y = g.y; y < g.y + h; y += 32) for (let x = g.x; x < g.x + w; x += 32) { const k = Math.floor(y / 32) * W + Math.floor(x / 32); expect(ok[k], String(g.props!.id)).toBe(1); expect(m.terrain.waterTiles[k]).toBe(0); }
    }
    expect(new Set(gr.map((g) => g.props!.fase)).size).toBeGreaterThan(gr.length / 2);
    const fu = m.entities.filter((e) => e.tipo === 'fuelle');
    expect(fu.length).toBeGreaterThanOrEqual(2);
    for (const f of fu) { expect(ZONAS).toContain(f.props!.zona); expect(m.decos.some((d) => d.sprite === f.props!.objeto && d.x === f.x && d.y === f.y)).toBe(true); }
    // las grietas salen como rectángulos en Tiled
    const tiled = bigMapToTiled(m) as unknown as { json: { layers: { name: string; objects?: { type: string; width: number; height: number; point: boolean }[] }[] } };
    const g0 = tiled.json.layers.find((l) => l.name === 'entidades')!.objects!.find((o) => o.type === 'grieta')!;
    expect([g0.point, g0.width > 0, g0.height > 0]).toEqual([false, true, true]);
  });

  it('cofres, secretos, portales, enemigos, el Carcelero, el mural 6, las figuras y la Puerta Negra', () => {
    expect(m.entities.filter((e) => e.tipo === 'cofre').length).toBeGreaterThanOrEqual(6);
    expect(m.entities.filter((e) => e.tipo === 'cofre' && e.props?.secreto).length).toBeGreaterThanOrEqual(2);
    expect(m.zones.filter((z) => z.props.secreto).length).toBeGreaterThanOrEqual(2);
    expect(m.entities.find((e) => e.tipo === 'portal_llegada')?.props?.portal).toBe('portal_brasa');
    expect(m.entities.find((e) => e.tipo === 'portal_volver')?.props?.destino).toBe('mundo5');
    expect(m.entities.find((e) => e.tipo === 'portal_jefe')?.props?.destino).toBe('mundo7');
    expect(m.entities.find((e) => e.tipo === 'mural')?.props?.pieza).toBe(6);
    expect(zoneOf(m.entities.find((e) => e.tipo === 'mural')!.x, m.entities.find((e) => e.tipo === 'mural')!.y)?.nombre).toBe('Las Jaulas Colgantes');
    const car = m.entities.find((e) => e.props?.enemigo === 'carcelero')!;
    expect(car.props).toMatchObject({ elite: true, nombre: 'El Carcelero' });
    expect(zoneOf(car.x, car.y)?.nombre).toBe('La Cárcel de las Luces');
    for (const id of ['hollin', 'salamandra_brasa', 'farolero_cadenas']) expect(m.entities.filter((e) => e.props?.enemigo === id).length, id).toBeGreaterThanOrEqual(4);
    expect(m.entities.filter((e) => e.props?.enemigo === 'farolero_cadenas' && e.props?.jaula).length).toBeGreaterThanOrEqual(2);
    const fig = m.entities.filter((e) => e.tipo === 'figura');
    expect(fig.length).toBeGreaterThanOrEqual(3); expect(fig.length).toBeLessThanOrEqual(4);
    const puerta = m.entities.find((e) => e.tipo === 'puerta_negra')!;
    expect(fig.some((f) => f.props?.alto && Math.abs(f.x - puerta.x) < 64)).toBe(true);
    expect(m.solid[tileOf(puerta.x, puerta.y)]).toBe(1);
    expect(m.decos.some((d) => d.sprite === 'puerta_negra')).toBe(true);
    for (const e of m.entities) if (!e.props?.alto && e.tipo !== 'puerta_negra' && e.tipo !== 'grieta') expect(llega(e.x, e.y), `${e.tipo} ${e.props?.enemigo ?? ''} en ${Math.floor(e.x / TILE)},${Math.floor(e.y / TILE)}`).toBe(true);
  });

  it('la arena de la Dragona: radio 224, 4 surtidores a 130 px con su palanca 48 más afuera, 4 cadenas, se camina entera', () => {
    const arena = m.entities.find((e) => e.tipo === 'arena_jefe')!;
    const jefe = m.entities.find((e) => e.tipo === 'jefe')!;
    expect(arena.props!.radio).toBe(224);
    expect([jefe.x, jefe.y]).toEqual([arena.x, arena.y]);
    expect(jefe.props).toMatchObject({ enemigo: 'dragona_brasa', nombre: 'La Dragona de Brasa' });
    expect(String(jefe.props!.titulo).length).toBeGreaterThan(5);
    const surt = m.entities.filter((e) => e.tipo === 'surtidor');
    expect(surt.length).toBe(4);
    for (const s of surt) {
      expect(Math.abs(Math.hypot(s.x - arena.x, s.y - arena.y) - 130)).toBeLessThan(4);
      const p = m.entities.find((e) => e.tipo === 'palanca' && e.props?.surtidor === s.props?.id)!;
      expect(p, String(s.props?.id)).toBeTruthy();
      expect(Math.abs(Math.hypot(p.x - s.x, p.y - s.y) - 48)).toBeLessThan(4);
      expect(Math.hypot(p.x - arena.x, p.y - arena.y)).toBeGreaterThan(Math.hypot(s.x - arena.x, s.y - arena.y));
      expect(llega(p.x, p.y)).toBe(true);
    }
    expect(m.entities.filter((e) => e.tipo === 'cadena').length).toBe(4);
    const ring: number[] = [];
    let blocked = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (Math.hypot((x + 0.5) * TILE - arena.x, (y + 0.5) * TILE - arena.y) > ARENA_DRAGONA.radio - 12) continue;
      if (ok[y * W + x]) ring.push(y * W + x); else blocked++;
    }
    expect(blocked).toBeLessThanOrEqual(8);
    const solo = new Uint8Array(W * H);
    for (const k of ring) solo[k] = 1;
    expect(bfs(solo, [ring[0]]).reduce((a, v) => a + v, 0)).toBe(ring.length);
    for (const k of ring) expect(seen[k]).toBe(1);
    // la Puerta Negra detrás de la arena (al norte)
    const puerta = m.entities.find((e) => e.tipo === 'puerta_negra')!;
    expect(puerta.y).toBeLessThan(arena.y - ARENA_DRAGONA.radio + 40);
  });

  it('tres ramas que vuelven al camino: tapar una no deja afuera las fuentes ni la arena', () => {
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
      // las cuatro palancas de la arena son las del encargo (iguales a propósito: se tiran en el juego)
      const objs = p.objetos.filter((o) => o !== 'palanca');
      expect(objs.length, p.nombre).toBeGreaterThanOrEqual(5);
      const rep = objs.filter((o, i) => objs.indexOf(o) !== i);
      expect(rep, p.nombre).toEqual([]);
      const moving = objs.some((o) => Object.values(byName.get(o)!.anims).some((a) => a.frames.length > 1));
      expect(moving, p.nombre).toBe(true);
    }
  });

  it('los objetos del encargo a su medida, sus animaciones y la sombra de contacto nomás', () => {
    const tabla: [string, number, number][] = [
      ['fuente_fria', 96, 96], ['charco_frio', 64, 32], ['luz_libre_faro', 24, 24], ['grieta_brasa', 64, 64], ['grieta_brasa_3', 64, 64], ['fuelle_gigante_0', 192, 160], ['fuelle_gigante_1', 192, 160],
      ['brasero_0', 32, 64], ['brasero_2', 32, 64], ['surtidor', 64, 64], ['surtidor_chorro', 64, 128], ['palanca', 32, 48], ['cadena_dragona', 32, 32], ['cadena_colgante_2', 128, 128], ['jaulas_frente_1', 128, 128], ['humo_frente_0', 128, 128],
      ['fondo_fragua_lejos_2', 512, 256], ['arbol_ceniza_3', 96, 128], ['puerta_negra', 256, 256], ['mural_6', 128, 96], ['figura_cargadora', 48, 64],
    ];
    for (const [n, w, h] of tabla) { const o = byName.get(n)!; expect(o, n).toBeTruthy(); expect([o.w, o.h], n).toEqual([w, h]); }
    for (const l of ['bosque', 'catedral', 'galerias', 'faro', 'ciudad']) {
      const j = byName.get(`jaula_luz_${l}`)!;
      expect([j.w, j.h, ...j.anchor], l).toEqual([32, 64, 16, 4]);
      expect([j.anims.cerrada.frames.length, j.anims.cerrada.fps]).toEqual([6, 6]);
      expect(j.anims.abrir.frames.length).toBe(10); expect(j.anims.abrir.fps).toBe(12); expect(j.anims.abrir.loop).toBe(false);
      expect([j.anims.vacia.frames.length, j.anims.vacia.fps]).toEqual([2, 2]);
      expect(j.light!.radius).toBe(40);
      const ll = byName.get(`luz_libre_${l}`)!;
      expect(ll.light!.radius).toBe(260); expect(ll.anims.idle.frames.length).toBeGreaterThanOrEqual(6);
    }
    const an = (n: string, a: string) => byName.get(n)!.anims[a];
    expect([an('fuente_fria', 'idle').frames.length, an('fuente_fria', 'idle').fps]).toEqual([6, 6]);
    expect(byName.get('fuente_fria')!.light).toMatchObject({ radius: 220 });
    expect([byName.get('fuente_fria')!.solid![2], byName.get('fuente_fria')!.solid![3]]).toEqual([64, 24]);
    expect(byName.get('charco_frio')!.layer).toBe('suelo'); expect(byName.get('charco_frio')!.light!.radius).toBe(60);
    for (const v of ['', '_0', '_1', '_2', '_3']) { const g = byName.get(`grieta_brasa${v}`)!; expect(g.layer).toBe('suelo'); expect(g.anims.apagada.frames.length).toBe(1); expect(g.anims.aviso.frames.length).toBeGreaterThanOrEqual(6); expect(g.anims.caliente.frames.length).toBeGreaterThanOrEqual(4); }
    for (const v of [0, 1]) { const f = byName.get(`fuelle_gigante_${v}`)!; expect([f.anims.soplar.frames.length, f.anims.soplar.fps]).toEqual([12, 10]); expect(f.anims.quieto && f.anims.dormido).toBeTruthy(); expect(f.solid).toBeTruthy(); }
    for (const v of [0, 1, 2]) { const b = byName.get(`brasero_${v}`)!; expect(b.light!.radius).toBe(180); expect(b.anims.apagado).toBeTruthy(); expect([b.solid![2], b.solid![3]]).toEqual([16, 8]); }
    expect(an('surtidor', 'chorro').frames.length).toBeGreaterThanOrEqual(10); expect(byName.get('surtidor')!.layer).toBe('suelo');
    expect(an('palanca', 'tirar').frames.length).toBe(8); expect(an('palanca', 'arriba').frames.length).toBe(1);
    for (const n of ['cadena_colgante_0', 'cadena_colgante_1', 'cadena_colgante_2', 'jaulas_frente_0', 'jaulas_frente_1', 'humo_frente_0', 'humo_frente_1']) { expect(byName.get(n)!.layer, n).toBe('frente'); const a = an(n, 'idle'); expect(a.fps).toBeGreaterThanOrEqual(2); expect(a.fps).toBeLessThanOrEqual(4); }
    for (const n of ['fondo_fragua_lejos_0', 'fondo_fragua_lejos_1', 'fondo_fragua_lejos_2']) expect(byName.get(n)!.layer).toBe('fondo');
    for (let v = 0; v < 4; v++) { const a = byName.get(`arbol_ceniza_${v}`)!; expect([a.anims.idle.frames.length, a.anims.idle.fps]).toEqual([4, 4]); expect(a.solid).toBeTruthy(); }
    for (const n of ['yunque', 'pila_carbon_0', 'pila_carbon_1', 'molde_0', 'molde_1', 'carretilla_fragua']) expect(byName.get(n)!.solid, n).toBeTruthy();
    expect([an('puerta_negra', 'latido').frames.length, an('puerta_negra', 'latido').fps]).toEqual([4, 2]); expect(byName.get('puerta_negra')!.solid).toBeTruthy();
    expect([an('figura_cargadora', 'idle').fps, an('figura_cargadora', 'irse').fps, an('figura_cargadora', 'irse').frames.length]).toEqual([4, 10, 8]);
    for (const n of ['escoria_0', 'ceniza_0', 'marcas_carretilla_0', 'metal_frio_0', 'eslabones_0']) expect(byName.get(n)!.layer, n).toBe('suelo');
    // sombra de contacto: pegada al pie, nada lejos
    for (const o of byName.values()) {
      if (!o.shadow || !/^(fuente_fria|fuelle|brasero|palanca|arbol_ceniza|yunque|pila|molde|carretilla|crisol|columna|celda|puerta_negra|boca_horno)/.test(o.name)) continue;
      let far = 0;
      for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) if (o.shadow.data[(y * o.w + x) * 4 + 3] && Math.abs(y - o.anchor[1]) > 7) far++;
      expect(far, o.name).toBe(0);
    }
  });
}, 300_000);

