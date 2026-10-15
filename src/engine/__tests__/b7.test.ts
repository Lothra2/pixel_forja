import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderClip, runQA, viewsForRows, migrateFicha, createRaster, blit, encodePng, decodePng, type HumanFicha, type CellSize } from '../index';
import { TECNICAS } from '../anim/tecnicas';
import { HELD_ANIMS } from '../anim/brawl';
import { motionOf8 } from '../export/motion';
import { frameDataOf } from '../export/frameData';
import { buildCustomKit, validateKitConfig, type KitConfig } from '../kit/custom';
import { ROOT } from './helpers';

const IDS = ['rick', 'steph', 'sophie', 'alana', 'kenji', 'ryu', 'goro', 'tetsu'];
const FICHAS = join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'fichas');
const ficha = (id: string) => ({ ...(migrateFicha(JSON.parse(readFileSync(join(FICHAS, `${id}.ficha.json`), 'utf8'))) as HumanFicha), movementProfile: 'premium' as const });
const FIVE = ['right', 'down_right', 'up_right', 'down', 'up'];
const clips5 = (id: string, a: string) => viewsForRows(FIVE).map((v) => renderClip(ficha(id), 48, a, v, { props: true }));
const mov = (id: string, a: string) => motionOf8(clips5(id, a));

/** Lo pedido en B7: cuadros, fps, bucle y eventos. Cada técnica trae su impacto o su suelta. */
const PEDIDO: Record<string, [number, number, boolean, string[]]> = {
  play_drum: [10, 12, false, ['impacto']],
  bike_charge: [10, 14, false, ['impacto']],
  bike_charged: [10, 14, false, ['aterriza']],
  cap_bat_power: [12, 14, false, ['impacto']],
  chair_spin_throw: [12, 14, false, ['suelta']],
  slipper_storm: [12, 14, false, ['suelta', 'suelta', 'suelta']],
  comb_hair: [12, 12, false, ['impacto']],
  dodge_catch: [6, 12, false, ['impacto', 'atrapa']],
  beach_run: [8, 12, true, ['paso', 'paso']],
  traffic_dodge: [6, 14, false, ['despegue', 'aterriza']],
};
/** La técnica de cada equipo de Nekketsu, como va en el ejemplo (alias `tecnica_<equipo>`). */
const DE_EQUIPO: Record<string, string> = {
  familia_gg: 'slipper_storm', instituto_nekketsu: 'comb_hair', rong_sai_gon: 'chair_spin_throw',
  rolos_de_chapinero: 'bike_charge', panas_de_caracas: 'cap_bat_power', maracuchos_del_lago: 'play_drum',
};
/** Las armas del piso: el juego las dibuja con `arma` hasta la suelta. */
const ARMA: Record<string, [string, number[]]> = {
  play_drum: ['furro', []],
  cap_bat_power: ['broomstick', []],
  chair_spin_throw: ['silla_plastica', [7, 8, 9, 10, 11]],
  slipper_storm: ['chancleta', [3, 6, 9, 10, 11]],
};

describe('técnicas de equipo, la atrapada del Quemado, la arena y la moto (lote B7)', () => {
  it('cada animación trae los cuadros, los fps, el bucle y los eventos del pedido', () => {
    expect(TECNICAS.map((a) => a.name)).toEqual(Object.keys(PEDIDO));
    for (const a of TECNICAS) {
      const [n, fps, loop, ev] = PEDIDO[a.name];
      expect(renderClip(ficha('rick'), 48, a.name, 'side', { props: true }).frames.length, a.name).toBe(n);
      expect([a.fps, a.loop], a.name).toEqual([fps, loop]);
      expect((a.events ?? []).map((e) => e.type), a.name).toEqual(ev);
    }
  });

  it('los 8 atletas pasan el control de calidad en 32, 48 y 64, en las 5 filas', () => {
    const bad: string[] = [];
    for (const id of IDS) {
      const f = ficha(id);
      const cells: CellSize[] = f.cell ? [f.cell as CellSize] : [32, 48, 64];
      for (const cell of cells) for (const a of TECNICAS) for (const v of viewsForRows(FIVE)) {
        const r = runQA(f, renderClip(f, cell, a.name, v, { props: true }));
        if (!r.ok) bad.push(`${id} ${cell} ${a.name} ${v}: ${r.items.filter((i) => i.severity === 'error').map((i) => `${i.check} ${i.value}`).join(', ')}`);
      }
    }
    expect(bad).toEqual([]);
  }, 900_000);

  it('cada técnica trae el cuadro del golpe con su punto en las 5 filas, y las que avanzan traen desplazamiento', () => {
    for (const a of Object.values(DE_EQUIPO)) for (const id of ['rick', 'alana']) {
      const m = mov(id, a);
      const golpes = m.eventos!.filter((x) => x.tipo === 'impacto' || x.tipo === 'suelta');
      expect(golpes.length, a).toBeGreaterThan(0);
      for (const e of golpes) expect(e.punto, `${id} ${a}`).toHaveLength(5);
    }
    for (const a of ['bike_charge', 'comb_hair']) {
      const m = mov('rick', a), d = m.desplazamiento!, at = m.eventos!.find((e) => e.tipo === 'impacto')!.cuadro;
      expect(d[at], a).toBeGreaterThan(6);
      // después del golpe frena: cada cuadro avanza menos que el anterior (la bici derrapa un poco)
      for (let i = at + 2; i < d.length; i++) expect(d[i] - d[i - 1], `${a} ${i}`).toBeLessThanOrEqual(d[i - 1] - d[i - 2] + 0.01);
    }
    expect(mov('rick', 'comb_hair').desplazamiento!.slice(-3).every((x, _, l) => x === l[0])).toBe(true);
  });

  it('las armas del piso van en arma hasta cada suelta, con la de cada técnica por defecto', () => {
    for (const [a, [kind, sin]] of Object.entries(ARMA)) {
      expect(HELD_ANIMS[a].default, a).toBe(kind);
      const { arma } = frameDataOf(clips5('kenji', a), ['arma']);
      for (const fila of arma!) fila.forEach((x, i) => expect(x === null, `${a} cuadro ${i}`).toBe(sin.includes(i)));
    }
    // la bici y el peine van en el sprite: no son armas
    for (const a of ['bike_charge', 'comb_hair']) expect(HELD_ANIMS[a], a).toBeUndefined();
  });

  it('la silla plástica da dos vueltas: girado en el 3 y el 5', () => {
    expect(mov('kenji', 'chair_spin_throw').girado).toEqual([false, false, false, true, false, true, false, false, false, false, false, false]);
  });

  it('el que recibe la ciclovía va cuadro a cuadro con la bici: el golpe lo levanta y cae al piso', () => {
    for (const id of ['rick', 'alana']) {
      const b = mov(id, 'bike_charge'), r = mov(id, 'bike_charged');
      const golpe = b.eventos!.find((e) => e.tipo === 'impacto')!.cuadro, cae = r.eventos!.find((e) => e.tipo === 'aterriza')!.cuadro;
      expect(clips5(id, 'bike_charged')[0].frames.length).toBe(clips5(id, 'bike_charge')[0].frames.length);
      expect(r.elevacion![golpe + 1], id).toBeGreaterThan(4);
      expect(cae, id).toBe(golpe + 2);
      expect(r.elevacion![cae], id).toBe(0);
    }
  });

  it('esquivar la moto es un salto: sube después del despegue y está en el piso al aterrizar', () => {
    const m = mov('sophie', 'traffic_dodge');
    expect(m.eventos!.map((e) => [e.tipo, e.cuadro])).toEqual([['despegue', 1], ['aterriza', 4]]);
    expect(Math.max(...m.elevacion!.slice(1, 4))).toBeGreaterThan(8);
    expect(m.elevacion![4]).toBe(0);
  });

  it('la atrapada del Quemado: el balón en objetos de principio a fin y atrapa en el 2', () => {
    const cfg: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], filas: FIVE, packs: { quemado: { anims: ['dodge_hit', 'dodge_catch'], sin_props: true } } };
    const { files } = buildCustomKit(cfg, {}, { quick: true, solo: ['atletas'] });
    const m = JSON.parse(new TextDecoder().decode(files.find((x) => x.name === 'manifest.json')!.bytes));
    const an = m.atletas.rick.packs.quemado.anims.dodge_catch;
    for (const fila of an.objetos) expect(fila.map((o: { clase: string }[] | null) => o?.[0]?.clase ?? null)).toEqual(Array(6).fill('voley'));
    expect(an.eventos.map((e: { tipo: string; cuadro: number }) => [e.tipo, e.cuadro])).toEqual([['impacto', 2], ['atrapa', 2]]);
  });

  it('con alias cada equipo trae solo su técnica, y el que la recibe va para todos', () => {
    const cfg: KitConfig = {
      juego: 'Prueba', personajes_incluidos: ['familia'], filas: FIVE,
      packs: { carga: ['slipper_storm', 'comb_hair'], recibe: ['idle', 'bike_charged'] },
      alias: { tecnica_familia_gg: 'slipper_storm', tecnica_instituto_nekketsu: 'comb_hair' },
    };
    expect(validateKitConfig(cfg)).toEqual([]);
    const equipos = { familia_gg: { nombre: 'Familia GG', atletas: ['rick', 'steph'] }, instituto_nekketsu: { nombre: 'Instituto Nekketsu', atletas: ['sophie', 'alana'] } };
    const { files } = buildCustomKit(cfg, { equipos }, { quick: true, solo: ['atletas'] });
    const m = JSON.parse(new TextDecoder().decode(files.find((x) => x.name === 'manifest.json')!.bytes));
    expect(Object.keys(m.atletas.rick.packs.carga.anims)).toEqual(['tecnica_familia_gg']);
    expect(Object.keys(m.atletas.alana.packs.carga.anims)).toEqual(['tecnica_instituto_nekketsu']);
    for (const id of ['rick', 'alana']) expect(Object.keys(m.atletas[id].packs.recibe.anims), id).toContain('bike_charged');
    expect(m.atletas.rick.packs.carga.anims.tecnica_familia_gg.eventos.filter((e: { tipo: string }) => e.tipo === 'suelta')).toHaveLength(3);
  });

  it('el ejemplo de Nekketsu le da una técnica a cada uno de los 6 equipos', () => {
    const cfg = JSON.parse(readFileSync(join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'kit.config.json'), 'utf8')) as KitConfig;
    for (const [eq, a] of Object.entries(DE_EQUIPO)) expect(cfg.alias![`tecnica_${eq}`], eq).toBe(a);
    expect(validateKitConfig(cfg)).toEqual([]);
  });

  it('imagen dorada: un cuadro clave de cada una, Rick de lado en 48', () => {
    const KEY: Record<string, number> = { play_drum: 7, bike_charge: 5, bike_charged: 6, cap_bat_power: 6, chair_spin_throw: 3, slipper_storm: 1, comb_hair: 8, dodge_catch: 2, beach_run: 2, traffic_dodge: 2 };
    const out = createRaster(48 * TECNICAS.length, 48);
    TECNICAS.forEach((a, i) => blit(out, renderClip(ficha('rick'), 48, a.name, 'side', { props: true, ...(HELD_ANIMS[a.name] ? { held: { kind: HELD_ANIMS[a.name].default } } : {}) }).frames[KEY[a.name]], i * 48, 0));
    const file = join(ROOT, 'golden', 'b7.png');
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(out)); return; }
    const gold = decodePng(readFileSync(file));
    const same = gold.w === out.w && Buffer.from(gold.data).equals(Buffer.from(out.data));
    if (!same) { mkdirSync(join(ROOT, 'out'), { recursive: true }); writeFileSync(join(ROOT, 'out', 'golden_actual_b7.png'), encodePng(out)); }
    expect(same, 'cambió b7; mira out/golden_actual_b7.png').toBe(true);
  });
});
