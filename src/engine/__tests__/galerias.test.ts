import { describe, it, expect } from 'vitest';
import { galeriasMap } from '../world/galeriasMap';
import { galeriasObjects, dustWarning, dustCloud, shadowEyes } from '../world/galeriasObjects';
import { reachable, bigMapToTiled } from '../world/bosqueMap';
import { TILE } from '../world/tiles';
import { CELL, footprint } from '../world/premium/placer';
import { POLILLA_REINA_SPEC, POLILLA_CENIZA_SPEC } from '../boss/polilla';
import { MINERO_PIEDRA_SPEC, SOMBRA_SPEC } from '../boss/mina';
import { renderBossSheets } from '../boss/sheet';
import { SFX, MUSIC, RATE } from '../audio/sfx';
import { ambience } from '../audio/ambience';

describe('Mundo 3: Las Galerías del Eco', () => {
  const m = galeriasMap();
  const byName = new Map(m.objects.map((o) => [o.name, o]));
  const ini = m.entities.find((e) => e.tipo === 'jugador_inicio')!;
  const seen = reachable(m, Math.floor(ini.x / TILE), Math.floor(ini.y / TILE));
  /** se llega a un punto si se pisa su cuadro o uno de al lado (los cofres y los cristales son sólidos) */
  const llega = (x: number, y: number, s = seen) => { const tx = Math.floor(x / TILE), ty = Math.floor((y - 1) / TILE); return [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => s[(ty + dy) * m.w + tx + dx] === 1); };

  it('100 x 80 cuadros, siete zonas con su oscuridad, bruma, partículas y ambiente, y una postal por zona', () => {
    expect([m.w, m.h]).toEqual([100, 80]);
    const want: Record<string, [number, number, string, string]> = {
      'La Boca de la Mina': [0.6, 0.3, 'polvo', 'galerias'],
      'Los Rieles': [0.75, 0.35, 'polvo', 'galerias'],
      'El Lago de Cristal': [0.7, 0.6, 'brillos', 'agua'],
      'El Puente Colgante': [0.8, 0.7, 'brasas_frias', 'viento'],
      'La Sala del Eco': [0.8, 0.4, 'brillos', 'eco'],
      'El Campamento Abandonado': [0.65, 0.3, 'humo', 'galerias'],
      'La Cueva de la Reina': [0.85, 0.5, 'ceniza', 'jefe'],
    };
    for (const [nombre, [osc, bruma, part, amb]] of Object.entries(want)) {
      const z = m.zones.find((q) => q.nombre === nombre)!;
      expect(z, nombre).toBeTruthy();
      expect([z.props.oscuridad, z.props.niebla, z.props.particulas, z.props.ambiente], nombre).toEqual([osc, bruma, part, amb]);
      expect(typeof z.props.frente, nombre).toBe('string');
    }
    expect(m.postales.length).toBeGreaterThanOrEqual(7);
    expect(m.meta!.fondo!.map((f) => f.id)).toEqual(['fondo_mina_0', 'fondo_mina_1', 'fondo_mina_2']);
  });

  it('tres faroles de minero que hacen de fogata, seis o más cofres y dos secretos para Thor, todo alcanzable', () => {
    const faroles = m.entities.filter((e) => e.tipo === 'punto_guardado');
    expect(faroles.length).toBe(3);
    for (const f of faroles) { expect(f.props?.farol).toBe(true); expect(llega(f.x, f.y), String(f.props?.id)).toBe(true); }
    expect(m.decos.filter((d) => d.sprite === 'farol_minero').length).toBe(3);
    const cofres = m.entities.filter((e) => e.tipo === 'cofre');
    expect(cofres.length).toBeGreaterThanOrEqual(6);
    const secretos = cofres.filter((c) => c.props?.secreto);
    expect(secretos.length).toBeGreaterThanOrEqual(2);
    expect(m.zones.filter((z) => z.props.secreto).length).toBeGreaterThanOrEqual(2);
    for (const e of m.entities) if (e.tipo !== 'portal_jefe') expect(llega(e.x, e.y), `${e.tipo} en ${Math.floor(e.x / TILE)},${Math.floor(e.y / TILE)}`).toBe(true);
    // el mural escondido va en el nicho, con su entidad
    expect(m.decos.some((d) => d.sprite === 'mural_3')).toBe(true);
    expect(m.entities.find((e) => e.tipo === 'mural')?.props?.pieza).toBe(3);
  });

  it('al menos tres ramas que vuelven al camino: tapar el medio de una no deja nada afuera', () => {
    expect(m.premium.ramas.length).toBeGreaterThanOrEqual(3);
    const importantes = m.entities.filter((e) => /^(jefe|punto_guardado|portal_volver)$/.test(e.tipo));
    for (const rama of m.premium.ramas) {
      const [mx, my] = rama.medio.map(Math.floor);
      expect(seen[my * m.w + mx] || seen[my * m.w + mx + 1] || seen[(my + 1) * m.w + mx], rama.nombre).toBeTruthy();
      // se tapa la rama en el medio: lo importante se sigue alcanzando por el camino principal
      const saved = new Uint8Array(m.solid);
      for (let y = my - 2; y <= my + 2; y++) for (let x = mx - 2; x <= mx + 2; x++) m.solid[y * m.w + x] = 1;
      const s2 = reachable(m, Math.floor(ini.x / TILE), Math.floor(ini.y / TILE));
      m.solid.set(saved);
      for (const e of importantes) expect(llega(e.x, e.y, s2), `${rama.nombre}: ${e.tipo}`).toBe(true);
    }
  });

  it('40 o más cristales prendibles y los 4 grandes de la arena, en su capa y siempre con un lado para pegarles', () => {
    const chicos = m.cristales!.filter((c) => !c.grande), grandes = m.cristales!.filter((c) => c.grande);
    expect(chicos.length).toBeGreaterThanOrEqual(40);
    expect(grandes.length).toBe(4);
    for (const c of m.cristales!) { expect(llega(c.x, c.y), c.id).toBe(true); expect(c.forma === ['cian', 'violeta', 'ambar'].indexOf(c.color) || c.grande).toBe(true); }
    expect(new Set(chicos.map((c) => c.color)).size).toBe(3);
    // los grandes alrededor del jefe, dentro de la arena
    const arena = m.entities.find((e) => e.tipo === 'arena_jefe')!;
    for (const g of grandes) expect(Math.hypot(g.x - arena.x, g.y - arena.y)).toBeLessThan(Number(arena.props!.radio));
    const tiled = bigMapToTiled(m).json as { layers: { name: string; objects?: { name: string; properties: { name: string; value: unknown }[] }[] }[] };
    const capa = tiled.layers.find((l) => l.name === 'cristales')!;
    expect(capa.objects!.length).toBe(m.cristales!.length);
    expect(capa.objects![0].properties.map((p) => p.name).sort()).toEqual(['color', 'forma', 'grande']);
  });

  it('el puente colgante cruza el abismo: las tablas se pisan, el vacío no, y debajo va el fondo', () => {
    const tablas = m.decos.filter((d) => d.sprite === 'puente_colgante_h');
    expect(tablas.length).toBeGreaterThan(10);
    for (const t of tablas) expect(m.solid[Math.floor(t.y / TILE) * m.w + Math.floor(t.x / TILE)], `tabla ${t.x}`).toBe(0);
    const y = Math.floor(tablas[0].y / TILE);
    let vacio = 0;
    for (const dy of [-3, 3]) for (const t of tablas.slice(2, -2)) { const k = (y + dy) * m.w + Math.floor(t.x / TILE); if (m.solid[k]) vacio++; }
    expect(vacio).toBeGreaterThan(10);
    const img = m.terrain.img;
    let hueco = 0;
    for (let i = 0; i < img.w * img.h; i++) if (img.data[i * 4 + 3] === 0) hueco++;
    expect(hueco).toBeGreaterThan(200 * 200);
  });

  it('nada montado: la utilería no se pisa, no tapa pies ni paredes', () => {
    const GW = Math.ceil(m.terrain.img.w / CELL), IW = m.terrain.img.w;
    const items = m.decos.filter((d) => /^(roca_mina|cajon_mina|barril_mina)/.test(d.sprite)).map((d) => {
      const f = footprint(byName.get(d.sprite)!);
      const g = (c: [number, number]) => (Math.floor(d.y / CELL) + c[1]) * GW + Math.floor(d.x / CELL) + c[0];
      return { d, body: new Set(f.body.map(g)) };
    });
    expect(items.length).toBeGreaterThan(30);
    for (const a of items) {
      expect(m.terrain.kind[(a.d.y - 2) * IW + a.d.x], `${a.d.sprite} en ${a.d.x},${a.d.y}`).toBe(0);
      for (const b of items) if (a !== b) expect([...a.body].filter((g) => b.body.has(g)).length, `${a.d.sprite} y ${b.d.sprite}`).toBe(0);
    }
  });

  it('los objetos del encargo, a su medida', () => {
    const objs = new Map(galeriasObjects().map((o) => [o.name, o]));
    const drawn = (n: string) => {
      const o = objs.get(n)!, f = (o.anims.idle ?? Object.values(o.anims)[0]).frames[0];
      let x1 = -1, y1 = -1;
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (f.data[(y * f.w + x) * 4 + 3] > 0) { x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      return { o, x1, y1 };
    };
    // [nombre, ancho, alto, apoyo, sólido (ancho x alto)]
    const tabla: [string, number, number, [number, number] | null, [number, number] | null][] = [
      ['cristal_apagado_0', 32, 48, [16, 44], [14, 6]], ['cristal_prendido_2', 32, 48, [16, 44], [14, 6]],
      ['cristal_grande_apagado', 64, 112, [32, 106], [30, 10]], ['farol_minero', 32, 64, [16, 60], [12, 6]],
      ['carrito_mina', 48, 48, [24, 44], [32, 10]], ['carpa_minero', 96, 80, null, null],
      ['estalactitas_frente_0', 128, 96, null, null], ['mural_3', 128, 96, null, null], ['figura_ojos', 48, 64, [24, 60], null],
      ['rieles_h', 32, 32, null, null], ['puente_colgante_v', 32, 32, null, null], ['pico_tirado', 32, 32, null, null],
    ];
    for (const [n, w, h, ap, so] of tabla) {
      const { o, x1, y1 } = drawn(n);
      expect(x1, n).toBeLessThan(w);
      expect(y1, n).toBeLessThan(h);
      if (ap) expect(o.anchor, n).toEqual(ap);
      if (so) expect([o.solid![2], o.solid![3]], n).toEqual(so);
    }
    expect(objs.get('figura_ojos')!.solid).toBeNull();
    expect(objs.get('carpa_minero')!.solid).not.toBeNull();
    expect(objs.get('cristal_prendido_1')!.light).toMatchObject({ color: '#b07aff', radius: 80 });
    expect(objs.get('cristal_grande_prendido')!.light!.radius).toBe(180);
    expect(objs.get('farol_minero')!.light).toMatchObject({ color: '#ffb35a', radius: 200 });
    const anim = (n: string, a: string) => objs.get(n)!.anims[a];
    expect([anim('cristal_prendido_0', 'idle').frames.length, anim('cristal_prendido_0', 'idle').fps]).toEqual([6, 6]);
    expect([anim('cristal_prendido_0', 'prenderse').frames.length, anim('cristal_prendido_0', 'prenderse').fps]).toEqual([8, 14]);
    expect(anim('farol_minero', 'idle').frames.length).toBe(6);
    expect(anim('carrito_mina', 'rodar').frames.length).toBe(4);
    expect([anim('puente_colgante_h', 'idle').frames.length, anim('puente_colgante_h', 'idle').fps]).toEqual([2, 2]);
    expect(anim('figura_ojos', 'idle').fps).toBe(4);
    expect(anim('figura_ojos', 'irse').fps).toBeGreaterThanOrEqual(8);
    for (const n of ['rieles_h', 'rieles_curva_ne', 'puente_colgante_h', 'pico_tirado', 'casco_minero', 'linterna_rota']) expect(objs.get(n)!.layer, n).toBe('suelo');
    for (const n of ['estalactitas_frente_0', 'estalactitas_frente_1']) expect(objs.get(n)!.layer, n).toBe('frente');
    expect(objs.get('viga_mina')!.solids!.length).toBe(2);
    const ojos = shadowEyes();
    expect([ojos.w, ojos.h, ojos.anims.parpadeo.frames.length, ojos.anims.parpadeo.fps]).toEqual([16, 8, 4, 3]);
  });

  it('enemigos y la Polilla Reina: sus animaciones, el aviso de 4 cuadros o más, y caben en su celda', () => {
    const names = (s: typeof POLILLA_REINA_SPEC) => s.anims.map((a) => a.name).sort();
    expect(names(POLILLA_REINA_SPEC)).toEqual(['attack', 'attack_heavy', 'aturdida', 'die', 'hit', 'idle', 'walk', 'warcry']);
    expect(names(POLILLA_CENIZA_SPEC)).toEqual(['attack', 'die', 'hit', 'idle', 'walk']);
    expect(names(MINERO_PIEDRA_SPEC)).toEqual(['attack', 'attack_heavy', 'die', 'hit', 'idle', 'walk']);
    expect(names(SOMBRA_SPEC)).toEqual(['attack', 'die', 'hit', 'idle', 'walk']);
    expect([POLILLA_REINA_SPEC.cell, POLILLA_CENIZA_SPEC.cell, MINERO_PIEDRA_SPEC.cell, SOMBRA_SPEC.cell]).toEqual([128, 48, 64, 48]);
    for (const s of [POLILLA_REINA_SPEC, MINERO_PIEDRA_SPEC]) {
      const w = s.anims.find((a) => a.name === 'attack_heavy')!.windup!;
      expect(w[1] - w[0] + 1, s.id).toBeGreaterThanOrEqual(4);
    }
    // la reina se libera: termina de colores
    const die = POLILLA_REINA_SPEC.anims.find((a) => a.name === 'die')!;
    expect(die.keys[die.keys.length - 1].pose.freed).toBe(1);
    for (const s of [POLILLA_CENIZA_SPEC, SOMBRA_SPEC]) {
      const { clips } = renderBossSheets(s);
      for (const c of clips) expect(c.overflow, `${s.id} ${c.def.name}`).toBe(0);
      // la sombra: contorno violeta de 1 px
      if (s === SOMBRA_SPEC) {
        const f = clips[0].frames[0][0];
        let violet = 0;
        for (let i = 0; i < f.w * f.h; i++) if (f.data[i * 4] === 0x8a && f.data[i * 4 + 1] === 0x4a && f.data[i * 4 + 2] === 0xc8) violet++;
        expect(violet).toBeGreaterThan(20);
      }
    }
    const aviso = dustWarning(), nube = dustCloud();
    expect([aviso.length, aviso[0].w, aviso[0].h]).toEqual([8, 96, 96]);
    expect([nube.length, nube[0].w, nube[0].h]).toEqual([10, 96, 96]);
  });

  it('el audio del Mundo 3: bajito (pico 0.5 o menos en efectos y ambientes) y a la medida', () => {
    const pk = (b: Float32Array) => { let x = 0; for (const v of b) x = Math.max(x, Math.abs(v)); return x; };
    const dur = (b: Float32Array) => b.length / RATE;
    for (const n of ['cristal_prender', 'cristal_apagar', 'polilla_aleteo', 'minero_golpe', 'sombra_aparece', 'carrito_rodar', 'figura_irse'] as const) expect(pk(SFX[n]()), n).toBeLessThanOrEqual(0.501);
    expect(dur(SFX.cristal_prender())).toBeGreaterThanOrEqual(0.75);
    expect(dur(SFX.cristal_apagar())).toBeCloseTo(0.6, 1);
    expect(dur(SFX.carrito_rodar())).toBeCloseTo(3, 1);
    expect(dur(MUSIC.galerias())).toBeCloseTo(90, 0);
    expect(dur(MUSIC.jefe_polilla())).toBeGreaterThan(20);
    for (const n of ['galerias', 'eco'] as const) { const b = ambience(n); expect(dur(b), n).toBeCloseTo(12, 0); expect(pk(b), n).toBeLessThanOrEqual(0.501); }
  });
}, 300_000);
