import { describe, it, expect } from 'vitest';
import { puertoMap, puertoMapObjects } from '../world/puertoMap';
import { marinerEyes } from '../world/puertoObjectsB';
import { bigMapToTiled } from '../world/bosqueMap';
import { TILE } from '../world/tiles';

describe('Mundo 4: El Puerto Ahogado (mapa y objetos)', () => {
  const m = puertoMap();
  const W = m.w, H = m.h;
  const byName = new Map(m.objects.map((o) => [o.name, o]));
  const ini = m.entities.find((e) => e.tipo === 'jugador_inicio')!;
  /** lo que se camina con una marea: lo libre de la colisión menos lo de la otra marea */
  const walk = (marea: 'baja' | 'alta') => Uint8Array.from(m.solid, (v, k) => (v || (marea === 'baja' ? m.marea!.alta[k] : m.marea!.baja[k]) ? 0 : 1));
  const bfs = (ok: Uint8Array, from: number[]) => {
    const seen = new Uint8Array(W * H), q = [...from];
    for (const k of q) seen[k] = 1;
    for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = Math.floor(k / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (seen[j] || !ok[j]) continue; seen[j] = 1; q.push(j); } }
    return seen;
  };
  const tileOf = (x: number, y: number) => Math.floor((y - 1) / TILE) * W + Math.floor(x / TILE);
  const k0 = Math.floor(ini.y / TILE) * W + Math.floor(ini.x / TILE);
  const seenBoth = bfs(Uint8Array.from(m.solid, (v) => (v ? 0 : 1)), [k0]);
  const llega = (x: number, y: number, s = seenBoth) => { const k = tileOf(x, y); return [0, 1, -1, W, -W].some((d) => s[k + d] === 1); };

  it('110 x 90, las ocho zonas con su oscuridad, bruma, partículas y ambiente, primer plano y una postal por zona', () => {
    expect([W, H]).toEqual([110, 90]);
    const want: Record<string, [number, number, string, string]> = {
      'El Muelle de Llegada': [0.7, 0.4, 'ceniza', 'puerto'],
      'La Calle de las Redes': [0.8, 0.45, 'ceniza', 'puerto'],
      'El Mercado Hundido': [0.8, 0.5, 'ceniza', 'puerto'],
      'La Iglesia de la Campana Ahogada': [0.85, 0.55, 'ceniza', 'campana'],
      'Los Botes Volteados': [0.8, 0.6, 'ceniza', 'puerto'],
      'El Astillero': [0.85, 0.5, 'ceniza', 'puerto'],
      'La Cueva de las Medusas': [0.85, 0.6, 'brillos', 'agua'],
      'El Faro': [0.9, 0.5, 'ceniza', 'jefe'],
    };
    for (const [nombre, [osc, bruma, part, amb]] of Object.entries(want)) {
      const z = m.zones.find((q) => q.nombre === nombre)!;
      expect(z, nombre).toBeTruthy();
      expect([z.props.oscuridad, z.props.niebla, z.props.ambiente], nombre).toEqual([osc, bruma, amb]);
      // abyss premium: cada zona conserva sus partículas de antes y puede sumar otras
      for (const p of String(part).split(',')) expect(String(z.props.particulas).split(','), nombre).toContain(p);
      for (const f of String(z.props.frente).split(',')) expect(byName.get(f)?.layer, `${nombre}: ${f}`).toBe('frente');
    }
    expect(m.postales.length).toBe(8);
    expect(m.meta!.fondo!.map((f) => f.id)).toEqual(['fondo_mar_lejos_0', 'fondo_mar_lejos_1', 'fondo_mar_lejos_2']);
  });

  it('4 faroles del muelle (fogatas), 6 o más cofres, 2 secretos, el mural 4, la campana, la figura en lo alto del faro, el jefe y el minijefe', () => {
    const faroles = m.entities.filter((e) => e.tipo === 'punto_guardado');
    expect(faroles.length).toBe(4);
    for (const f of faroles) { expect(f.props?.farol).toBe(true); expect(llega(f.x, f.y), String(f.props?.id)).toBe(true); }
    expect(m.entities.filter((e) => e.tipo === 'farol_muelle').length).toBe(4);
    expect(m.decos.filter((d) => d.sprite === 'farol_muelle_apagado').length).toBe(4);
    expect(m.entities.filter((e) => e.tipo === 'cofre').length).toBeGreaterThanOrEqual(6);
    expect(m.entities.filter((e) => e.tipo === 'cofre' && e.props?.secreto).length).toBeGreaterThanOrEqual(2);
    expect(m.zones.filter((z) => z.props.secreto).length).toBeGreaterThanOrEqual(2);
    expect(m.entities.find((e) => e.tipo === 'portal_llegada')?.props?.color).toBe('rojo');
    expect(m.entities.find((e) => e.tipo === 'portal_jefe')?.props?.destino).toBe('mundo5');
    expect(m.entities.find((e) => e.tipo === 'jefe')?.props?.enemigo).toBe('pez_farol');
    const capitan = m.entities.find((e) => e.props?.enemigo === 'capitan_ahogado')!;
    expect(capitan.props?.elite).toBe(true);
    expect(m.entities.find((e) => e.tipo === 'mural')?.props?.pieza).toBe(4);
    expect(m.decos.some((d) => d.sprite === 'mural_4')).toBe(true);
    expect(m.entities.some((e) => e.tipo === 'campana_iglesia')).toBe(true);
    expect(m.entities.some((e) => e.tipo === 'figura' && e.props?.alto)).toBe(true);
    for (const id of ['marinero_niebla', 'cangrejo_ceniza', 'medusa_negra']) expect(m.entities.filter((e) => e.props?.enemigo === id).length, id).toBeGreaterThanOrEqual(3);
    // todo lo que se usa se alcanza (salvo lo que está alto o en el portal del final)
    for (const e of m.entities) if (e.tipo !== 'portal_jefe' && !e.props?.alto && !(/^(jefe|arena_jefe)$/.test(e.tipo) && (e.props?.en_agua || e.props?.poza))) expect(llega(e.x, e.y), `${e.tipo} ${e.props?.enemigo ?? ''} en ${Math.floor(e.x / TILE)},${Math.floor(e.y / TILE)}`).toBe(true);
  });

  it('las mareas: desde cualquier cuadro que se camina se llega a un farol, con la marea baja y con la alta', () => {
    expect(m.marea!.baja.some((v) => v)).toBe(true);
    expect(m.marea!.alta.some((v) => v)).toBe(true);
    const faroles = m.entities.filter((e) => e.tipo === 'punto_guardado').map((f) => Math.floor(f.y / TILE) * W + Math.floor(f.x / TILE));
    for (const marea of ['baja', 'alta'] as const) {
      const ok = walk(marea);
      const desde = bfs(ok, faroles);
      let sueltos = 0;
      for (let k = 0; k < W * H; k++) if (ok[k] && !desde[k]) sueltos++;
      expect(sueltos, `marea ${marea}`).toBe(0);
    }
    // el banco de arena se alcanza con las dos mareas, por caminos distintos
    const cofre = m.entities.find((e) => e.tipo === 'cofre' && Math.abs(e.x / TILE - 66) < 3 && Math.abs(e.y / TILE - 47) < 3)!;
    for (const marea of ['baja', 'alta'] as const) expect(llega(cofre.x, cofre.y, bfs(walk(marea), [k0])), marea).toBe(true);
    // en Tiled van como capas aparte
    const tiled = bigMapToTiled(m).json as { layers: { name: string }[] };
    expect(tiled.layers.map((l) => l.name)).toEqual(expect.arrayContaining(['marea_baja', 'marea_alta']));
  });

  it('la arena del Pez Farol: poza de agua en el centro (no se entra) y un anillo que se camina entero, con salida a un farol', () => {
    const arena = m.entities.find((e) => e.tipo === 'arena_jefe')!;
    const jefe = m.entities.find((e) => e.tipo === 'jefe')!;
    expect([jefe.x, jefe.y]).toEqual([arena.x, arena.y]);
    const poza = Number(arena.props!.poza), radio = Number(arena.props!.radio);
    expect(poza).toBe(128);
    const cx = arena.x / TILE, cy = arena.y / TILE;
    const ring: number[] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dd = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) * TILE, k = y * W + x;
      // la poza: agua, sólida y con su agua animada
      if (dd < poza - 20) { expect(m.solid[k], `poza ${x},${y}`).toBe(1); expect(m.terrain.waterTiles[k], `agua ${x},${y}`).toBe(1); }
      if (dd > poza + 16 && dd < radio - 8) ring.push(k);
    }
    expect(ring.length).toBeGreaterThan(40);
    // el anillo se camina entero (con las dos mareas) y desde ahí se llega a un farol
    const faroles = m.entities.filter((e) => e.tipo === 'punto_guardado').map((f) => Math.floor(f.y / TILE) * W + Math.floor(f.x / TILE));
    for (const marea of ['baja', 'alta'] as const) {
      const ok = walk(marea);
      for (const k of ring) expect(ok[k], `anillo ${k % W},${Math.floor(k / W)}`).toBe(1);
      const desde = bfs(ok, faroles);
      for (const k of ring) expect(desde[k], `anillo a un farol (${marea})`).toBe(1);
      // y el anillo da la vuelta entera sin pasar por afuera
      const solo = new Uint8Array(W * H);
      for (const k of ring) solo[k] = 1;
      expect(bfs(solo, [ring[0]]).reduce((a, v) => a + v, 0)).toBe(ring.length);
    }
    expect(m.decos.some((d) => d.sprite === 'anillo_poza' && d.x === arena.x && d.y === arena.y)).toBe(true);
  });

  it('al menos tres ramas que vuelven al camino: tapar una no deja afuera lo importante', () => {
    expect(m.premium.ramas.length).toBeGreaterThanOrEqual(3);
    // lo importante: los faroles y el anillo de la arena (el pez nada en la poza, no se pisa)
    const arena = m.entities.find((e) => e.tipo === 'arena_jefe')!;
    const importantes = [...m.entities.filter((e) => e.tipo === 'punto_guardado'), { tipo: 'anillo de la arena', x: arena.x, y: arena.y + 5 * TILE }];
    for (const rama of m.premium.ramas.filter((r) => r.tapar.length)) {
      const ok = Uint8Array.from(m.solid, (v) => (v ? 0 : 1));
      for (const [x, y] of rama.tapar) ok[y * W + x] = 0;
      const s = bfs(ok, [k0]);
      for (const e of importantes) expect(llega(e.x, e.y, s), `${rama.nombre}: ${e.tipo}`).toBe(true);
    }
  });

  it('cada postal: objetos del puerto, nada repetido igual en la pantalla y algo que se mueve', () => {
    for (const p of m.premium.pantallas) {
      const objs = p.objetos;
      expect(objs.length, p.nombre).toBeGreaterThanOrEqual(5);
      const rep = objs.filter((o, i) => objs.indexOf(o) !== i);
      expect(rep, p.nombre).toEqual([]);
      // algo que se mueve: agua animada (siempre hay mar o poza a la vista), redes, faroles, campana o el bote hundido
      const moving = objs.some((o) => Object.values(byName.get(o)!.anims).some((a) => a.frames.length > 1));
      const water = (() => { for (let y = p.y - 270; y < p.y + 270; y += 32) for (let x = p.x - 480; x < p.x + 480; x += 32) { const k = Math.floor(y / TILE) * W + Math.floor(x / TILE); if (k >= 0 && k < W * H && m.terrain.waterTiles[k]) return true; } return false; })();
      expect(moving || water, p.nombre).toBe(true);
    }
  });

  it('los objetos del encargo, a su medida, y solo con sombra de contacto (corta, pegada al pie)', () => {
    const objs = new Map(puertoMapObjects().map((o) => [o.name, o]));
    const tabla: [string, number, number, [number, number] | null, [number, number] | null][] = [
      ['farol_muelle_apagado', 32, 80, [16, 76], [12, 6]], ['farol_muelle_prendido', 32, 80, [16, 76], [12, 6]], ['farol_muelle_prenderse', 32, 80, [16, 76], [12, 6]],
      ['faro', 128, 320, [64, 312], [80, 24]], ['muelle_h', 32, 32, null, null], ['muelle_flotante', 64, 32, null, null],
      ['casa_pescador_0', 128, 128, null, null], ['casa_pescador_3', 128, 128, null, null], ['bote_volteado_2', 96, 48, null, null], ['bote_hundido', 96, 64, null, null],
      ['red_colgando_0', 64, 96, null, null], ['campana_iglesia', 64, 96, [32, 92], [30, 10]], ['iglesia_ruina', 192, 192, null, null], ['agua_marea', 32, 32, null, null],
      ['rocas_frente_0', 128, 96, null, null], ['vigas_frente_1', 128, 96, null, null], ['fondo_mar_lejos_1', 512, 256, null, null], ['mural_4', 128, 96, null, null],
    ];
    for (const [n, w, h, ap, so] of tabla) {
      const o = objs.get(n)!;
      expect(o, n).toBeTruthy();
      expect([o.w, o.h], n).toEqual([w, h]);
      if (ap) expect(o.anchor, n).toEqual(ap);
      if (so) expect([o.solid![2], o.solid![3]], n).toEqual(so);
    }
    const an = (n: string, a: string) => objs.get(n)!.anims[a];
    expect(an('farol_muelle_prendido', 'idle').fps).toBeGreaterThanOrEqual(6);
    expect(an('farol_muelle_prenderse', 'idle').fps).toBeGreaterThanOrEqual(8);
    expect(objs.get('farol_muelle_prendido')!.light).toMatchObject({ color: '#ffc070', radius: 180 });
    expect([an('faro', 'prendido').frames.length, an('faro', 'prendido').fps]).toEqual([8, 8]);
    expect(objs.get('faro')!.light!.radius).toBe(420);
    expect(an('muelle_flotante', 'subir').frames.length).toBeGreaterThanOrEqual(6);
    expect([an('muelle_flotante', 'arriba').frames.length, an('muelle_flotante', 'arriba').fps]).toEqual([2, 2]);
    expect([an('bote_hundido', 'idle').frames.length, an('bote_hundido', 'idle').fps]).toEqual([4, 3]);
    expect([an('red_colgando_1', 'idle').frames.length, an('red_colgando_1', 'idle').fps]).toEqual([4, 4]);
    expect([an('campana_iglesia', 'sonar').frames.length, an('campana_iglesia', 'sonar').fps]).toEqual([8, 10]);
    expect([an('agua_marea', 'idle').frames.length, an('agua_marea', 'idle').fps]).toEqual([6, 6]);
    expect([an('fondo_mar_lejos_1', 'idle').frames.length, an('fondo_mar_lejos_1', 'idle').fps]).toEqual([4, 3]);
    for (const n of ['red_colgando_0', 'red_colgando_1', 'rocas_frente_0', 'rocas_frente_1', 'vigas_frente_0', 'vigas_frente_1']) expect(objs.get(n)!.layer, n).toBe('frente');
    expect(objs.get('red_colgando_2')!.layer).toBeUndefined();
    for (const n of ['muelle_h', 'muelle_v', 'muelle_esquina_ne', 'muelle_flotante', 'agua_marea']) expect(objs.get(n)!.layer, n).toBe('suelo');
    for (const n of ['fondo_mar_lejos_0', 'fondo_mar_lejos_1', 'fondo_mar_lejos_2']) expect(objs.get(n)!.layer, n).toBe('fondo');
    for (const n of ['cajones_mercado', 'puesto_volteado', 'barril_pescado', 'ancla_vieja', 'cuerda_enrollada', 'bote_volteado_0', 'iglesia_ruina']) expect(!!objs.get(n)!.solid || !!objs.get(n)!.solids, n).toBe(true);
    expect(objs.get('bote_hundido')!.solid).toBeNull();
    // dos casas con la ventana que titila
    expect([0, 1, 2, 3].filter((i) => objs.get(`casa_pescador_${i}`)!.anims.idle.frames.length > 1).length).toBe(2);
    // sombra de contacto: pegada al pie, nada lejos ni corrida hacia un lado
    for (const o of objs.values()) {
      if (!o.shadow || !/^(farol_muelle|faro$|casa_pescador|bote_volteado|campana|cajon|barril|ancla|cuerda|roca_puerto|iglesia)/.test(o.name)) continue;
      let far = 0;
      for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) if (o.shadow.data[(y * o.w + x) * 4 + 3] && Math.abs(y - o.anchor[1]) > 6) far++;
      expect(far, o.name).toBe(0);
    }
    const ojos = marinerEyes();
    expect([ojos.w, ojos.h, ojos.anims.parpadeo.frames.length, ojos.anims.parpadeo.fps]).toEqual([16, 8, 4, 3]);
    expect(objs.has('figura_ojos')).toBe(true);
    expect(objs.has('figura_ojos_mojada')).toBe(true);
  });
}, 300_000);
