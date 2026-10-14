import { describe, it, expect } from 'vitest';
import { ciudadMap, ARENA_REY } from '../world/ciudadMap';
import { thiefFigure } from '../world/ciudadObjectsB';
import { premiumPortal, PORTAL_MUNDO } from '../world/portales';
import { TILE } from '../world/tiles';

describe('Mundo 5: La Ciudad Dormida (mapa y objetos)', () => {
  const m = ciudadMap();
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

  it('110 x 100, las ocho zonas con su oscuridad, bruma, partículas y ambiente, primer plano y una postal por zona', () => {
    expect([W, H]).toEqual([110, 100]);
    const want: Record<string, [number, number, string]> = {
      'La Puerta de la Ciudad': [0.75, 0.4, 'ciudad'],
      'La Calle de los Panaderos': [0.85, 0.45, 'ciudad'],
      'La Plaza de la Fuente': [0.85, 0.45, 'ciudad'],
      'El Barrio de los Músicos': [0.85, 0.5, 'cajita'],
      'Los Jardines de Piedra': [0.85, 0.55, 'jardin'],
      'La Torre del Reloj': [0.85, 0.45, 'reloj'],
      'El Puente de los Faroles': [0.85, 0.6, 'abismo'],
      'El Palacio Dormido': [0.9, 0.4, 'jefe'],
    };
    for (const [nombre, [osc, bruma, amb]] of Object.entries(want)) {
      const z = m.zones.find((q) => q.nombre === nombre)!;
      expect(z, nombre).toBeTruthy();
      expect([z.props.oscuridad, z.props.niebla, z.props.particulas, z.props.ambiente], nombre).toEqual([osc, bruma, 'polvo_sueno', amb]);
      for (const f of String(z.props.frente).split(',')) expect(byName.get(f)?.layer, `${nombre}: ${f}`).toBe('frente');
    }
    const pal = m.zones.find((q) => q.nombre === 'El Palacio Dormido')!.props;
    expect([pal.musica, pal.musica_victoria]).toEqual(['jefe_rey', 'despertar']);
    expect(m.zones.find((q) => q.nombre === 'La Torre del Reloj')!.props.musica_pelea).toBe('relojero');
    expect(m.zones.filter((z) => !z.props.secreto && z.nombre !== 'El Palacio Dormido').every((z) => z.props.musica === 'ninguna')).toBe(true);
    expect(m.postales.length).toBe(8);
    expect(m.meta!.fondo!.map((f) => f.id)).toEqual(['fondo_ciudad_lejos_0', 'fondo_ciudad_lejos_1', 'fondo_ciudad_lejos_2']);
  });

  it('5 faroles de plaza (uno por barrio), 6 chispas o más por barrio, la Ladrona en cada uno y una en el balcón', () => {
    const puntos = m.entities.filter((e) => e.tipo === 'punto_guardado');
    expect(puntos.length).toBe(5);
    const postes = m.entities.filter((e) => e.tipo === 'farol_plaza');
    expect(postes.length).toBe(5);
    expect(m.decos.filter((d) => d.sprite === 'farol_plaza_apagado').length).toBe(5);
    for (const p of puntos) {
      expect(p.props).toMatchObject({ farol_plaza: true, objeto: 'farol_plaza' });
      expect(llega(p.x, p.y), String(p.props?.id)).toBe(true);
      const poste = postes.find((q) => q.props?.punto === p.props?.id)!;
      expect(poste, String(p.props?.id)).toBeTruthy();
      // el barrio del poste es el nombre exacto de la zona donde está
      expect(zoneOf(poste.x, poste.y)?.nombre).toBe(poste.props?.barrio);
    }
    const barrios = postes.map((q) => String(q.props!.barrio));
    expect(new Set(barrios).size).toBe(5);
    for (const b of barrios) {
      const ch = m.entities.filter((e) => e.tipo === 'chispa' && e.props?.barrio === b);
      expect(ch.length, b).toBeGreaterThanOrEqual(6);
      for (const c of ch) {
        expect(zoneOf(c.x, c.y)?.nombre, `chispa en ${b}`).toBe(b);
        // caminable y lejos de las paredes: los 8 de alrededor se caminan
        const k = Math.floor(c.y / TILE) * W + Math.floor(c.x / TILE);
        for (const d of [0, 1, -1, W, -W, W + 1, W - 1, -W + 1, -W - 1]) expect(ok[k + d], `chispa ${b} ${c.x},${c.y}`).toBe(1);
        expect(seen[k]).toBe(1);
      }
      const fig = m.entities.filter((e) => e.tipo === 'figura' && e.props?.barrio === b);
      expect(fig.length, b).toBeGreaterThanOrEqual(1);
      expect(fig.length, b).toBeLessThanOrEqual(3);
    }
    expect(m.entities.some((e) => e.tipo === 'figura' && e.props?.alto && e.props?.barrio === 'El Palacio Dormido')).toBe(true);
    expect(puntos.find((p) => p.props?.tutorial)?.props?.nombre).toBe('La Puerta de la Ciudad');
  });

  it('desde cualquier cuadro que se camina se llega a un farol de plaza', () => {
    const faroles = m.entities.filter((e) => e.tipo === 'punto_guardado').map((f) => Math.floor(f.y / TILE) * W + Math.floor(f.x / TILE));
    const desde = bfs(ok, faroles);
    let sueltos = 0;
    for (let k = 0; k < W * H; k++) if (ok[k] && !desde[k]) sueltos++;
    expect(sueltos).toBe(0);
  });

  it('cofres, secretos, portales, estatuas, enemigos, el mural 5 y la cajita de música', () => {
    expect(m.entities.filter((e) => e.tipo === 'cofre').length).toBeGreaterThanOrEqual(6);
    expect(m.entities.filter((e) => e.tipo === 'cofre' && e.props?.secreto).length).toBeGreaterThanOrEqual(2);
    expect(m.zones.filter((z) => z.props.secreto).length).toBeGreaterThanOrEqual(2);
    expect(m.entities.find((e) => e.tipo === 'portal_llegada')?.props?.portal).toBe('portal_plata');
    expect(m.entities.find((e) => e.tipo === 'portal_volver')?.props?.destino).toBe('mundo4');
    expect(m.entities.find((e) => e.tipo === 'portal_jefe')?.props?.destino).toBe('mundo6');
    expect(m.entities.find((e) => e.tipo === 'mural')?.props?.pieza).toBe(5);
    expect(m.decos.some((d) => d.sprite === 'mural_5')).toBe(true);
    expect(m.entities.some((e) => e.tipo === 'cajita_musica')).toBe(true);
    const relojero = m.entities.find((e) => e.props?.enemigo === 'relojero')!;
    expect(relojero.props).toMatchObject({ elite: true, nombre: 'El Relojero' });
    expect(zoneOf(relojero.x, relojero.y)?.nombre).toBe('La Torre del Reloj');
    for (const id of ['sonambulo_piedra', 'gargola_dormida', 'duende_sueno']) expect(m.entities.filter((e) => e.props?.enemigo === id).length, id).toBeGreaterThanOrEqual(4);
    // las estatuas: cada entidad sobre su objeto, sólidas, y todas las variantes en uso
    const est = m.entities.filter((e) => e.tipo === 'estatua');
    expect(est.length).toBeGreaterThanOrEqual(16);
    for (const e of est) {
      expect(m.decos.some((d) => d.sprite === `estatua_ciudadano_${e.props!.variante}` && d.x === e.x && d.y === e.y)).toBe(true);
      expect(m.solid[tileOf(e.x, e.y)]).toBe(1);
    }
    expect(new Set(est.map((e) => e.props!.variante)).size).toBe(10);
    // todo lo que se usa se alcanza (salvo lo que está alto)
    for (const e of m.entities) if (!e.props?.alto && e.tipo !== 'estatua') expect(llega(e.x, e.y), `${e.tipo} ${e.props?.enemigo ?? ''} en ${Math.floor(e.x / TILE)},${Math.floor(e.y / TILE)}`).toBe(true);
  });

  it('la sala del trono: arena de radio 208, el Rey en el medio, el trono detrás, 4 lámparas a 150 px y se camina entera alrededor', () => {
    const arena = m.entities.find((e) => e.tipo === 'arena_jefe')!;
    const jefe = m.entities.find((e) => e.tipo === 'jefe')!;
    expect(arena.props!.radio).toBe(208);
    expect([jefe.x, jefe.y]).toEqual([arena.x, arena.y]);
    expect(jefe.props).toMatchObject({ enemigo: 'rey_de_piedra', nombre: 'El Rey de Piedra' });
    expect(String(jefe.props!.titulo).length).toBeGreaterThan(5);
    const lamps = m.entities.filter((e) => e.tipo === 'lampara_trono');
    expect(lamps.length).toBe(4);
    for (const l of lamps) expect(Math.abs(Math.hypot(l.x - arena.x, l.y - arena.y) - ARENA_REY.lampara)).toBeLessThan(3);
    const trono = m.decos.find((d) => d.sprite === 'trono_rey')!;
    expect(trono.y).toBeLessThan(arena.y);
    expect(arena.y - trono.y).toBeLessThan(ARENA_REY.radio + 20);
    // todo lo de adentro de la arena se camina menos el pie del trono y de las lámparas, y es una sola mancha
    const ring: number[] = [];
    let blocked = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dd = Math.hypot((x + 0.5) * TILE - arena.x, (y + 0.5) * TILE - arena.y);
      if (dd > ARENA_REY.radio - 12) continue;
      if (ok[y * W + x]) ring.push(y * W + x); else blocked++;
    }
    expect(blocked).toBeLessThanOrEqual(8);
    const solo = new Uint8Array(W * H);
    for (const k of ring) solo[k] = 1;
    expect(bfs(solo, [ring[0]]).reduce((a, v) => a + v, 0)).toBe(ring.length);
    const faroles = m.entities.filter((e) => e.tipo === 'punto_guardado').map((f) => Math.floor(f.y / TILE) * W + Math.floor(f.x / TILE));
    const desde = bfs(ok, faroles);
    for (const k of ring) expect(desde[k]).toBe(1);
  });

  it('al menos tres ramas que vuelven al camino: tapar una no deja afuera los faroles ni la arena', () => {
    expect(m.premium.ramas.length).toBeGreaterThanOrEqual(3);
    const arena = m.entities.find((e) => e.tipo === 'arena_jefe')!;
    const importantes = [...m.entities.filter((e) => e.tipo === 'punto_guardado'), arena];
    for (const rama of m.premium.ramas) {
      const okR = Uint8Array.from(ok);
      for (const [x, y] of rama.tapar) okR[y * W + x] = 0;
      const s = bfs(okR, [k0]);
      for (const e of importantes) expect(llega(e.x, e.y, s), `${rama.nombre}: ${e.tipo}`).toBe(true);
      // la rama vuelve al camino: su medio se sigue alcanzando aunque se tape la entrada (hay otra)
      expect(llega(rama.medio[0] * TILE + 16, rama.medio[1] * TILE + 17, s), rama.nombre).toBe(true);
    }
  });

  it('cada postal: tres planos, nada repetido igual en la pantalla y algo que se mueve', () => {
    for (const p of m.premium.pantallas) {
      // los setos son las paredes del laberinto (como cuadros del piso): se repiten como se repite un muro. Las cuatro
      // lámparas del trono son las del encargo (las cuatro iguales, se prenden en el juego)
      const objs = p.objetos.filter((o) => !/^seto_piedra|^alfombra|^lampara_trono/.test(o));
      expect(objs.length, p.nombre).toBeGreaterThanOrEqual(6);
      const rep = objs.filter((o, i) => objs.indexOf(o) !== i);
      expect(rep, p.nombre).toEqual([]);
      const moving = objs.some((o) => Object.values(byName.get(o)!.anims).some((a) => a.frames.length > 1));
      expect(moving, p.nombre).toBe(true);
      // el frente de su zona existe
      const z = m.zones.find((q) => !q.props.secreto && p.x >= q.x && p.x < q.x + q.w && p.y >= q.y && p.y < q.y + q.h)!;
      expect(String(z.props.frente).length, p.nombre).toBeGreaterThan(3);
    }
  });

  it('los objetos del encargo a su medida, con sombra de contacto nomás', () => {
    const tabla: [string, number, number, [number, number] | null, [number, number] | null][] = [
      ['farol_plaza_apagado', 48, 128, [24, 124], [16, 8]], ['farol_plaza_prendido', 48, 128, [24, 124], [16, 8]], ['farol_plaza_prenderse', 48, 128, [24, 124], [16, 8]], ['farol_plaza_robado', 48, 128, [24, 124], [16, 8]],
      ['chispa_luz', 16, 16, null, null], ['estatua_ciudadano_0', 48, 64, [24, 60], [16, 8]], ['estatua_ciudadano_7', 48, 64, [24, 60], [16, 8]],
      ['casa_ciudad_0', 128, 160, null, null], ['casa_ciudad_9', 128, 160, null, null], ['fuente_plaza', 96, 96, null, [64, 24]], ['torre_reloj', 128, 288, null, [96, 32]],
      ['trono_rey', 128, 128, null, null], ['lampara_trono_apagada', 32, 96, [16, 92], [12, 6]], ['lampara_trono_prendida', 32, 96, [16, 92], [12, 6]], ['lampara_trono_prenderse', 32, 96, [16, 92], [12, 6]],
      ['cajita_musica', 32, 32, null, null], ['seto_piedra_3', 64, 64, null, null], ['flor_piedra_2', 32, 32, null, null],
      ['banderines_rotos_0', 128, 96, null, null], ['arco_calle_1', 128, 96, null, null], ['lampara_colgante_0', 128, 96, null, null],
      ['fondo_ciudad_lejos_2', 512, 256, null, null], ['mural_5', 128, 96, null, null], ['figura_ladrona', 48, 64, null, null],
    ];
    for (const [n, w, h, ap, so] of tabla) {
      const o = byName.get(n)!;
      expect(o, n).toBeTruthy();
      expect([o.w, o.h], n).toEqual([w, h]);
      if (ap) expect(o.anchor, n).toEqual(ap);
      if (so) expect([o.solid![2], o.solid![3]], n).toEqual(so);
    }
    const an = (n: string, a: string) => byName.get(n)!.anims[a];
    const fpsIn = (n: string, a: string, lo: number, hi: number) => { const x = an(n, a); expect(x, `${n} ${a}`).toBeTruthy(); expect(x.fps, `${n} ${a}`).toBeGreaterThanOrEqual(lo); expect(x.fps, `${n} ${a}`).toBeLessThanOrEqual(hi); };
    fpsIn('farol_plaza_prendido', 'idle', 6, 8); fpsIn('farol_plaza_prenderse', 'idle', 10, 14); fpsIn('farol_plaza_robado', 'idle', 8, 10); fpsIn('chispa_luz', 'idle', 6, 8);
    fpsIn('lampara_trono_prendida', 'idle', 6, 8); fpsIn('lampara_trono_prenderse', 'idle', 10, 12); fpsIn('cajita_musica', 'idle', 6, 6); fpsIn('fuente_plaza', 'corre', 6, 8);
    expect([an('torre_reloj', 'andando').frames.length, an('torre_reloj', 'andando').fps]).toEqual([4, 2]);
    expect(an('farol_plaza_prenderse', 'idle').loop).toBe(false);
    expect(an('farol_plaza_robado', 'idle').loop).toBe(false);
    expect(byName.get('farol_plaza_prendido')!.light).toMatchObject({ color: '#ffd890', radius: 320 });
    expect(byName.get('lampara_trono_prendida')!.light!.radius).toBe(200);
    expect(byName.get('chispa_luz')!.light!.radius).toBe(50);
    expect(byName.get('farol_plaza_apagado')!.light).toBeUndefined();
    for (let i = 0; i < 8; i++) {
      const n = `estatua_ciudadano_${i}`;
      expect(an(n, 'dormida').frames.length, n).toBe(1);
      fpsIn(n, 'despertar', 10, 12);
      expect([an(n, 'despierta').frames.length, an(n, 'despierta').fps], n).toEqual([4, 4]);
    }
    for (let i = 0; i < 10; i++) { const o = byName.get(`casa_ciudad_${i}`)!; expect(o.anims.dormida && o.anims.despierta, `casa ${i}`).toBeTruthy(); expect(o.solid).toBeTruthy(); }
    for (const n of ['banderines_rotos_0', 'banderines_rotos_1', 'arco_calle_0', 'arco_calle_1', 'lampara_colgante_0', 'lampara_colgante_1']) { expect(byName.get(n)!.layer, n).toBe('frente'); expect([an(n, 'idle').frames.length, an(n, 'idle').fps], n).toEqual([2, 2]); }
    for (const n of ['fondo_ciudad_lejos_0', 'fondo_ciudad_lejos_1', 'fondo_ciudad_lejos_2']) expect(byName.get(n)!.layer, n).toBe('fondo');
    for (let i = 0; i < 4; i++) { expect(byName.get(`seto_piedra_${i}`)!.solid).toBeTruthy(); expect(byName.get(`flor_piedra_${i}`)).toBeTruthy(); }
    for (const n of ['adoquines_rotos_0', 'polvo_sueno_0', 'petalos_piedra_0', 'charco_seco_0', 'rayuela_0']) expect(byName.get(n)!.layer, n).toBe('suelo');
    const lad = byName.get('figura_ladrona')!;
    expect([an('figura_ladrona', 'idle').fps, an('figura_ladrona', 'robar').fps, an('figura_ladrona', 'irse').fps]).toEqual([4, 8, 10]);
    expect(an('figura_ladrona', 'robar').loop).toBe(true);
    expect(lad.solid).toBeNull();
    // sombra de contacto: pegada al pie, nada lejos
    for (const o of byName.values()) {
      if (!o.shadow || !/^(farol_plaza|estatua|casa_ciudad|fuente|torre_reloj|trono|lampara_trono|seto|arbol_piedra|banco|maceta|columna)/.test(o.name)) continue;
      let far = 0;
      for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) if (o.shadow.data[(y * o.w + x) * 4 + 3] && Math.abs(y - o.anchor[1]) > 6) far++;
      expect(far, o.name).toBe(0);
    }
  });

  it('el farolito de la Ladrona por cuadro, y sube cuando roba', () => {
    const { objeto, farolito } = thiefFigure();
    for (const [a, list] of Object.entries(farolito)) expect(list.length, a).toBe(objeto.anims[a].frames.length);
    // robar: el farolito arranca abajo y queda arriba (y más chica = más arriba)
    expect(farolito.robar[3][1]).toBeLessThan(farolito.robar[0][1] - 8);
    // el farolito está dentro del dibujo
    for (const list of Object.values(farolito)) for (const [x, y] of list) { expect(x + 24).toBeGreaterThanOrEqual(0); expect(x + 24).toBeLessThan(48); expect(y + 60).toBeGreaterThanOrEqual(0); expect(y + 60).toBeLessThan(64); }
  });

  it('parte 7: el portal plata del Mundo 5, en el formato de los nuevos', () => {
    const p = premiumPortal('plata');
    expect(p.name).toBe('portal_plata');
    expect([p.w, p.h]).toEqual([96, 128]);
    for (const a of ['girar', 'abrir', 'cerrar', 'arco', 'remolino', 'apagado']) expect(p.anims[a], a).toBeTruthy();
    expect([p.anims.girar.frames.length, p.anims.girar.fps]).toEqual([12, 12]);
    expect(PORTAL_MUNDO.mundo5).toBe('plata');
    expect(byName.has('portal_plata')).toBe(true);
  });
}, 300_000);
