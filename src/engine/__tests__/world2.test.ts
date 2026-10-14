import { describe, it, expect } from 'vitest';
import { paintTerrain, distTo, FACE, type TerrainDesign } from '../world/paint';
import { landmarkObjects } from '../world/landmarks';
import { bosqueMap, bigMapToTiled, reachable, CHUNK } from '../world/bosqueMap';
import { TILE } from '../world/tiles';
import { particles, lightTexture, cloudShadow } from '../world/ambient';
import { ambience, AMBIENCE_NAMES } from '../audio/ambience';
import { RATE } from '../audio/sfx';

const small: TerrainDesign = {
  w: 24, h: 18, seed: 5,
  plateaus: [[[-2, -2], [26, -2], [26, 7], [-2, 7]]],
  stairs: [{ x: 12, y: 7, w: 3 }],
  rivers: [{ pts: [[5, -2], [5, 20]], w: 2.5 }],
  lakes: [], roads: [{ pts: [[12, 2], [12, 16]], w: 2 }], plazas: [[[16, 11], [21, 11], [21, 15], [16, 15]]],
  meadows: [{ c: [18, 4], r: 4 }], dark: [{ c: [3, 14], r: 4 }],
};

describe('mundo v2: terreno pintado', () => {
  it('meseta con acantilado sólido y escalera que se puede subir, río transparente, camino y plaza', () => {
    const t = paintTerrain(small);
    const W = small.w * TILE;
    const kinds = new Set(t.kind);
    for (const k of [0, 1, 2, 3, 4, 5]) expect(kinds, `tipo ${k}`).toContain(k);
    // el agua queda transparente (debajo va el agua animada) y la meseta no
    const waterPx = t.kind.indexOf(4);
    expect(t.img.data[waterPx * 4 + 3]).toBeLessThan(255);
    // el acantilado (fuera de la escalera) es sólido; la escalera no
    const faceRow = 8;
    expect(t.solid[faceRow * small.w + 18]).toBe(1);
    expect(t.solid[faceRow * small.w + 12]).toBe(0);
    expect(FACE).toBeGreaterThanOrEqual(48);
    expect(t.img.w).toBe(W);
  });
  it('distancia en pixeles (chaflán): 0 sobre la máscara y crece hacia afuera', () => {
    const m = new Uint8Array(10 * 10); m[55] = 1;
    const d = distTo(m, 10, 10);
    expect(d[55]).toBe(0);
    expect(d[56]).toBe(1);
    expect(d[59]).toBe(4);
  });
});

describe('mundo v2: objetos y Bosque GG', () => {
  it('objetos nuevos con apoyo adentro, luces con radio y capa de suelo en puente y vado', () => {
    const objs = landmarkObjects();
    for (const o of objs) {
      expect(o.anchor[0], o.name).toBeGreaterThanOrEqual(0); expect(o.anchor[0], o.name).toBeLessThanOrEqual(o.w);
      expect(o.anchor[1], o.name).toBeLessThanOrEqual(o.h);
      for (const a of Object.values(o.anims)) for (const f of a.frames) { expect(f.w, o.name).toBe(o.w); expect(f.h, o.name).toBe(o.h); }
      if (o.light) expect(o.light.radius, o.name).toBeGreaterThan(40);
    }
    const by = new Map(objs.map((o) => [o.name, o]));
    expect(by.get('puente')!.layer).toBe('suelo');
    expect(by.get('piedra_vado_0')!.layer).toBe('suelo');
    expect(by.get('arco_ruina')!.solids).toHaveLength(2);
    expect(by.get('cascada')!.anims.idle.frames).toHaveLength(4);
  });
  it('mapa grande: todo se alcanza caminando desde el inicio, con secretos, zonas y postales', { timeout: 120_000 }, () => {
    const m = bosqueMap();
    expect([m.w, m.h]).toEqual([120, 90]);
    const tipos = new Set(m.entities.map((e) => e.tipo));
    for (const t of ['jugador_inicio', 'thor_inicio', 'portal_llegada', 'punto_guardado', 'enemigo', 'cofre', 'rompible', 'cartel', 'jefe', 'portal_jefe', 'arena_jefe', 'criatura']) expect(tipos, t).toContain(t);
    // bruma por zona y árboles hechizados en el bosque oscuro
    expect(m.zones.every((z) => typeof z.props.niebla === 'number')).toBe(true);
    expect(m.decos.some((d) => d.sprite.startsWith('arbol_hechizado_'))).toBe(true);
    const start = m.entities.find((e) => e.tipo === 'jugador_inicio')!;
    const seen = reachable(m, Math.floor(start.x / TILE), Math.floor(start.y / TILE));
    for (const e of m.entities) {
      if (e.tipo === 'criatura') continue; // los ojos viven adentro de los arbustos
      const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
      const ok = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[(ty + dy) * m.w + tx + dx]);
      expect(ok, `${e.tipo} en ${tx},${ty} no se alcanza`).toBe(true);
    }
    expect(m.entities.filter((e) => e.tipo === 'cofre' && e.props?.secreto).length).toBeGreaterThanOrEqual(4);
    expect(m.entities.filter((e) => e.tipo === 'punto_guardado').length).toBeGreaterThanOrEqual(3);
    expect(m.zones.length).toBeGreaterThanOrEqual(10);
    expect(m.postales.length).toBeGreaterThanOrEqual(6);
    const names = new Set(m.objects.map((o) => o.name));
    for (const d of m.decos) expect(names.has(d.sprite), d.sprite).toBe(true);
    expect(m.decos.length).toBeGreaterThan(1000);
    // Tiled: agua, suelo en trozos, colisión, objetos, entidades, zonas y postales
    const t = bigMapToTiled(m);
    const layers = (t.json.layers as { name: string }[]).map((l) => l.name);
    expect(layers).toEqual(['agua', 'suelo', 'colision', 'superficie', 'espuma', 'reflejo', 'objetos', 'entidades', 'zonas', 'postales']);
    // pasos: hay de los 5 tipos y el puente suena a madera
    const sup = (t.json.layers as { name: string; data?: number[] }[]).find((l) => l.name === 'superficie')!.data!;
    expect(new Set(sup)).toEqual(new Set([1, 2, 3, 4, 5]));
    const bridge = m.decos.find((d) => d.sprite === 'puente')!;
    expect(sup[Math.floor(bridge.y / TILE) * m.w + Math.floor(bridge.x / TILE)]).toBe(4);
    for (const c of t.chunks) { expect(c.img.w).toBeLessThanOrEqual(CHUNK); expect(c.img.h).toBeLessThanOrEqual(CHUNK); }
    expect(t.chunks).toHaveLength(12);
    // misma semilla, mismo mapa
    const m2 = bosqueMap();
    expect(m2.decos.slice(0, 50)).toEqual(m.decos.slice(0, 50));
    expect(m2.decos.length).toBe(m.decos.length);
  });
});

describe('mundo v2: atmósfera', () => {
  it('partículas con todos sus cuadros del mismo tamaño, luz radial y sombra de nube', () => {
    const ps = particles();
    const names = ps.map((p) => p.name);
    for (const n of ['luciernaga', 'hoja_verde', 'hoja_otono', 'mariposa_azul', 'polen', 'brasa', 'brillo', 'espora', 'humo', 'polvo', 'gota', 'huella']) expect(names, n).toContain(n);
    for (const p of ps) for (const f of p.frames) { expect(f.w, p.name).toBe(p.w); expect(f.h, p.name).toBe(p.h); }
    const l = lightTexture(64);
    expect(l.data[(32 * 64 + 32) * 4 + 3]).toBeGreaterThan(200);
    expect(l.data[3]).toBe(0);
    const c = cloudShadow();
    expect(Math.max(...Array.from({ length: c.w * c.h }, (_, i) => c.data[i * 4 + 3]))).toBeLessThanOrEqual(90);
  });
  it('ambientes de 12 s (el del puerto y el de la ciudad, 20 s; la cajita, 14.4) que hacen bucle sin salto', () => {
    const largo: Record<string, number> = { puerto: 20, ciudad: 20, cajita: 14.4 };
    for (const n of AMBIENCE_NAMES) {
      const b = ambience(n);
      expect(b.length, n).toBe(Math.floor((largo[n] ?? 12) * RATE));
      let avg = 0; for (let i = 1; i < b.length; i++) avg += Math.abs(b[i] - b[i - 1]); avg /= b.length;
      expect(Math.abs(b[0] - b[b.length - 1]), n).toBeLessThan(Math.max(0.05, avg * 4));
    }
  });
});

describe('mundo v3: flora animada y criaturas', () => {
  it('cada árbol se mece (cuadros distintos) y los hechizados duermen, despiertan y parpadean', async () => {
    const { floraV3, gloomGrade } = await import('../world/flora');
    const { creatures, fogTexture } = await import('../world/atmosphere');
    const fl = floraV3();
    for (const f of fl) for (const a of Object.values(f.anims)) for (const fr of a.frames) { expect(fr.w, f.name).toBe(f.w); expect(fr.h, f.name).toBe(f.h); }
    const oak = fl.find((f) => f.name === 'roble_0')!.anims.idle.frames;
    expect(Buffer.from(oak[0].data).equals(Buffer.from(oak[3].data))).toBe(false);
    const ht = fl.find((f) => f.name === 'arbol_hechizado_0')!;
    expect(Object.keys(ht.anims).sort()).toEqual(['copa', 'despierto', 'dormido', 'parpadeo', 'tronco_despierto', 'tronco_dormido', 'tronco_parpadeo']);
    expect(Buffer.from(ht.anims.dormido.frames[0].data).equals(Buffer.from(ht.anims.despierto.frames[0].data))).toBe(false);
    // la corrección sombría oscurece pero deja intacto lo que brilla
    const r = { w: 2, h: 1, data: new Uint8ClampedArray([120, 160, 90, 255, 255, 240, 60, 255]) } as never;
    const gr = gloomGrade(r) as { data: Uint8ClampedArray };
    expect(gr.data[1]).toBeLessThan(160);
    expect([gr.data[4], gr.data[5], gr.data[6]]).toEqual([255, 240, 60]);
    const cs = creatures().map((c) => c.name);
    for (const n of ['cuervo', 'cuervo_izq', 'murcielago', 'ojos', 'fuego_fatuo']) expect(cs).toContain(n);
    const fog = fogTexture('nubes', 64);
    // la bruma pega por los lados: la columna 0 y la 63 se parecen (ruido periódico)
    let diff = 0; for (let y = 0; y < 64; y++) diff += Math.abs(fog.data[(y * 64) * 4 + 3] - fog.data[(y * 64 + 63) * 4 + 3]);
    expect(diff / 64).toBeLessThan(30);
  });
});

describe('fuentes bitmap', () => {
  it('Silkscreen sale como BMFont con ñ, tildes, ¡ y ¿, nítida (sin pixeles a medias en la de ui)', async () => {
    const { readFileSync } = await import('node:fs');
    const { bitmapFonts } = await import('../ui/fonts');
    const ab = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer; };
    const d = 'node_modules/@fontsource/silkscreen/files/';
    const fs = bitmapFonts(ab(d + 'silkscreen-latin-400-normal.woff'), ab(d + 'silkscreen-latin-700-normal.woff'));
    expect(fs.map((f) => f.name)).toEqual(['fuente_ui', 'fuente_titulo', 'fuente_titulo_plata']);
    for (const f of fs) {
      for (const ch of ['ñ', 'á', 'Ú', '¡', '¿', 'A', '9']) expect(f.fnt, `${f.name} ${ch}`).toContain(`<char id="${ch.codePointAt(0)}"`);
      expect(f.fnt).toContain(`file="${f.name}.png"`);
    }
    const ui = fs[0];
    const alphas = new Set<number>(); for (let i = 3; i < ui.png.data.length; i += 4) alphas.add(ui.png.data[i]);
    expect([...alphas].sort((a, b) => a - b)).toEqual([0, 255]);
  });
});

describe('taller entrega 1', () => {
  // dibuja b encima de a (alfa normal) y devuelve el resultado
  const over = (a: { data: Uint8ClampedArray }, b: { data: Uint8ClampedArray }) => {
    const o = new Uint8ClampedArray(a.data);
    for (let i = 0; i < o.length; i += 4) if (b.data[i + 3]) o.set(b.data.subarray(i, i + 4), i);
    return o;
  };

  it('árboles grandes con tronco y copa por separado: tronco + copa = el árbol entero, cuadro por cuadro', async () => {
    const { floraV3 } = await import('../world/flora');
    const fl = floraV3();
    for (const n of ['roble_0', 'roble_grande_0', 'roble_otono_1', 'pino_0', 'sauce_v3', 'arbol_seco_0', 'abuelo_roble_v3']) {
      const t = fl.find((f) => f.name === n)!;
      const { idle, tronco, copa } = t.anims;
      expect(tronco.frames.length, n).toBe(idle.frames.length);
      expect(copa.frames.length, n).toBe(idle.frames.length);
      idle.frames.forEach((fr, i) => expect(Buffer.from(over(tronco.frames[i], copa.frames[i])).equals(Buffer.from(fr.data)), `${n} cuadro ${i}`).toBe(true));
    }
    const ht = fl.find((f) => f.name === 'arbol_hechizado_1')!;
    ht.anims.despierto.frames.forEach((fr, i) => expect(Buffer.from(over(ht.anims.tronco_despierto.frames[i], ht.anims.copa.frames[i])).equals(Buffer.from(fr.data))).toBe(true));
  });

  it('íconos de cartel, del HUD y girar la tablet: 24 x 24 (64 x 64 la tablet), con dibujo y contorno', async () => {
    const { signIcons, hudIcons, rotateTablet } = await import('../ui/icons2');
    expect(signIcons().map((s) => s.name)).toEqual(['flecha_norte', 'peligro', 'corazon', 'cruce', 'estrella']);
    const hud = hudIcons().map((s) => s.name);
    for (const n of ['pausa', 'secreto', 'zona', 'luna', 'sonido', 'silencio', 'calidad', 'jugadora', 'peque', 'jugar', 'guardado']) expect(hud).toContain(`icono_${n}`);
    for (const s of [...signIcons(), ...hudIcons()]) {
      const f = s.frames[0];
      expect([f.w, f.h], s.name).toEqual([24, 24]);
      let n = 0; for (let i = 3; i < f.data.length; i += 4) if (f.data[i]) n++;
      expect(n, s.name).toBeGreaterThan(60);
      // nada sólido pegado arriba o abajo: el contorno entra entero (un halo tenue sí puede llegar)
      for (let x = 0; x < 24; x++) for (const y of [0, 23]) expect(f.data[(y * 24 + x) * 4 + 3], `${s.name} borde`).toBeLessThan(100);
    }
    const tab = rotateTablet();
    expect(tab.frames).toHaveLength(2);
    expect([tab.frames[0].w, tab.frames[0].h]).toEqual([64, 64]);
  });

  it('campamento de fogata en los 3 puntos de guardado, postales nuevas y trol de 64', async () => {
    const { forestObjects } = await import('../world/objects');
    const { enemyCell, enemyFicha } = await import('../rpg/presets');
    const camp = forestObjects().find((o) => o.name === 'campamento_fogata')!;
    expect(camp).toMatchObject({ w: 64, h: 48, anchor: [32, 40], solid: [-14, -6, 28, 8], light: { color: '#ffa040', radius: 150, flicker: true, dy: 10 } });
    expect(camp.anims.idle.frames).toHaveLength(6);
    expect(camp.anims.idle.fps).toBe(10);
    const m = bosqueMap();
    const camps = m.decos.filter((d) => d.sprite === 'campamento_fogata');
    const saves = m.entities.filter((e) => e.tipo === 'punto_guardado');
    expect(camps.length).toBe(saves.length);
    for (const s of saves) expect(camps.some((c) => Math.abs(c.x - s.x) < TILE && Math.abs(c.y - s.y) < TILE * 2), `fogata en ${s.props?.id}`).toBe(true);
    const postales = m.postales.map((p) => p.nombre);
    for (const n of ['bosque_profundo', 'claro_escondido', 'lago_espejo', 'campo_calabazas', 'las_alturas']) expect(postales).toContain(n);
    expect(enemyCell('trol')).toBe(64);
    expect(enemyCell('goblin_arquero')).toBe(48);
    expect(enemyFicha('trol').body.proportions.height).toBeGreaterThan(1.2);
  }, 120_000);
});

describe('taller entrega 2', () => {
  it('botín de nivel bajo: 24 mágicos, 8 raros y 2 legendarios, con propiedades que el juego sabe usar', async () => {
    const { earlyMagic, earlyRare, EARLY_STATS } = await import('../loot/early');
    const { allLoot, UNIQUE_LOOT } = await import('../loot/catalog');
    const mag = earlyMagic(), rare = earlyRare();
    expect(mag).toHaveLength(24);
    expect(rare).toHaveLength(8);
    for (const it of mag) { expect(it.rarity).toBe('magic'); expect(it.level, it.id).toBeGreaterThanOrEqual(2); expect(it.level, it.id).toBeLessThanOrEqual(10); }
    for (const it of rare) { expect(it.rarity).toBe('rare'); expect(it.level, it.id).toBeGreaterThanOrEqual(5); expect(it.level, it.id).toBeLessThanOrEqual(10); }
    // las propiedades nuevas (no las de la base) son de 1 a 2 en mágicos y de 2 a 3 en raros, todas del subconjunto del juego
    for (const it of [...mag, ...rare]) for (const md of it.stats.mods) expect(EARLY_STATS, `${it.id} ${md.stat}`).toContain(md.stat);
    // un arma de cada clase en mágicos y en raros, y las 8 piezas de armadura y joyas repartidas
    const icons = (l: typeof mag) => new Set(l.map((i) => (i.base.cat === 'weapon' || i.base.cat === 'offhand' || i.base.cat === 'jewel' ? i.base.icon : i.base.cat === 'armor' ? i.base.slot : '')));
    for (const w of ['bow', 'wand', 'sword', 'staff', 'shield_round']) expect(icons(mag), w).toContain(w);
    for (const w of ['bow', 'wand', 'sword', 'staff']) expect(icons(rare), w).toContain(w);
    expect(mag.filter((i) => i.base.cat === 'armor')).toHaveLength(12);
    expect(mag.filter((i) => i.base.cat === 'jewel')).toHaveLength(4);
    const low = UNIQUE_LOOT.filter((i) => i.rarity === 'legendary' && i.level <= 10);
    expect(low.map((i) => i.id).sort()).toEqual(['pluma_de_cuervo', 'ramita_del_abuelo']);
    // todo entra al catálogo y ningún id se repite
    const ids = allLoot().map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const it of [...mag, ...rare]) expect(ids).toContain(it.id);
  });

  it('flecha en 8 direcciones con impacto, magia de naturaleza e íconos de habilidad', async () => {
    const { arrowProjectile, arrowImpact } = await import('../fx/arrow');
    const { rotate8, renderFx, projectile8 } = await import('../fx/fx');
    const { skillIcons } = await import('../ui/icons2');
    const arrows = rotate8(arrowProjectile());
    expect(arrows.map((a) => a.dir)).toEqual(['right', 'down_right', 'down', 'down_left', 'left', 'up_left', 'up', 'up_right']);
    for (const a of arrows) { expect(a.frames).toHaveLength(2); expect(a.frames[0].w).toBe(48); }
    // la flecha mide unos 20 px de punta a plumas
    const f = arrowProjectile()[0];
    let x0 = 99, x1 = -1; for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (f.data[(y * 48 + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    expect(x1 - x0).toBeGreaterThanOrEqual(18);
    expect(x1 - x0).toBeLessThanOrEqual(26);
    expect(arrowImpact()).toHaveLength(5);
    expect(projectile8({ element: 'naturaleza', cell: 48 })[0].clip.frames).toHaveLength(6);
    expect(renderFx({ kind: 'impact', element: 'naturaleza', cell: 48 }).frames).toHaveLength(8);
    expect(renderFx({ kind: 'nova', element: 'naturaleza', cell: 48 }).frames).toHaveLength(10);
    // la naturaleza trae pétalos rosados (no es el veneno con otro nombre)
    const nat = renderFx({ kind: 'impact', element: 'naturaleza', cell: 48 }).frames[3];
    let pink = 0; for (let i = 0; i < nat.data.length; i += 4) if (nat.data[i] > 200 && nat.data[i + 1] < 160 && nat.data[i + 2] > 150) pink++;
    expect(pink).toBeGreaterThan(5);
    const sk = skillIcons();
    expect(sk.map((s) => s.name)).toEqual(['lluvia_flechas', 'esquiva', 'llamar_thor', 'curar', 'torbellino', 'bloqueo', 'nova_fuego', 'rayo_canalizado', 'ataque', 'farol', 'farol_recarga']);
    for (const s of sk) expect([s.frames[0].w, s.frames[0].h]).toEqual([40, 40]);
  });
});

describe('taller entrega 3', () => {
  it('íconos de la app del tamaño justo, aviso de carga que pega sin costura y onda del pisotón', async () => {
    const { appIcons } = await import('../ui/appIcons');
    const { stompWave } = await import('../fx/stomp');
    const { forestObjects } = await import('../world/objects');
    for (const ic of appIcons()) { expect([ic.img.w, ic.img.h], ic.name).toEqual([ic.size, ic.size]); expect(ic.img.data[3], ic.name).toBe(255); }
    const av = forestObjects().find((o) => o.name === 'aviso_carga')!;
    expect(av.anims.llenar.frames).toHaveLength(8);
    // el borde izquierdo de un tramo sigue al borde derecho del anterior: mismas filas pintadas
    for (const fr of av.anims.llenar.frames) for (let y = 0; y < 48; y++) expect(fr.data[(y * 32) * 4 + 3] > 0).toBe(fr.data[(y * 32 + 31) * 4 + 3] > 0);
    const st = stompWave();
    expect(st).toHaveLength(8);
    expect(st[0].w).toBe(96);
  });

  it('el logo usa la fuente de títulos: 288 x 96, 8 cuadros con el brillo en distinto lugar', async () => {
    const { readFileSync } = await import('node:fs');
    const { renderLogo } = await import('../ui/fonts');
    const b = readFileSync('node_modules/@fontsource/silkscreen/files/silkscreen-latin-700-normal.woff');
    const logo = renderLogo(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
    expect(logo).toHaveLength(8);
    expect([logo[0].w, logo[0].h]).toEqual([288, 96]);
    expect(Buffer.from(logo[1].data).equals(Buffer.from(logo[5].data))).toBe(false);
  });

  it('Thor cava, el Abuelo sonríe, el pasto se aparta y la música del título dura 30 a 45 s', async () => {
    const { thorFicha } = await import('../rpg/family');
    const { renderClip } = await import('../render/clip');
    const { floraV3 } = await import('../world/flora');
    const { forestObjects } = await import('../world/objects');
    const { musicTitulo, RATE } = await import('../audio/sfx');
    const { dirtDig } = await import('../fx/stomp');
    const dig = renderClip(thorFicha(0), 48, 'dig', 'side');
    expect(dig.frames).toHaveLength(6);
    expect(dig.fps).toBe(10);
    expect(dirtDig()).toHaveLength(6);
    const ab = floraV3().find((f) => f.name === 'abuelo_roble_v3')!;
    expect(ab.anims.sonreir.frames).toHaveLength(8);
    expect(ab.anims.sonreir.loop).toBe(false);
    expect(Buffer.from(ab.anims.sonreir.frames[0].data).equals(Buffer.from(ab.anims.sonreir.frames[5].data))).toBe(false);
    const pasto = forestObjects().find((o) => o.name === 'pasto_alto')!;
    for (const a of ['apartar_izq', 'apartar_der']) expect(pasto.anims[a]).toMatchObject({ fps: 12, loop: false });
    const secs = musicTitulo().length / RATE;
    expect(secs).toBeGreaterThanOrEqual(30);
    expect(secs).toBeLessThanOrEqual(45);
  }, 60_000);
  it('música por estados: amenaza, combate y fogata, cada una entre 15 y 45 s', async () => {
    const { MUSIC, RATE } = await import('../audio/sfx');
    for (const k of ['amenaza', 'combate', 'fogata'] as const) {
      const secs = MUSIC[k]().length / RATE;
      expect(secs, k).toBeGreaterThanOrEqual(15);
      expect(secs, k).toBeLessThanOrEqual(45);
    }
  }, 60_000);
});
