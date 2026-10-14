import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderClip, runQA, viewsForRows, migrateFicha, createRaster, blit, encodePng, decodePng, opaqueBox, type HumanFicha, type CellSize } from '../index';
import { JUDO } from '../anim/judo';
import { motionOf8 } from '../export/motion';
import { frameDataOf } from '../export/frameData';
import { UNIFORMES, dressWithUniform } from '../sheet/wardrobe';
import { buildCustomKit, validateKitConfig, type KitConfig } from '../kit/custom';
import { ROOT } from './helpers';

const IDS = ['rick', 'steph', 'sophie', 'alana', 'kenji', 'ryu', 'goro', 'tetsu'];
const FICHAS = join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'fichas');
const ficha = (id: string) => ({ ...(migrateFicha(JSON.parse(readFileSync(join(FICHAS, `${id}.ficha.json`), 'utf8'))) as HumanFicha), movementProfile: 'premium' as const });
const FIVE = ['right', 'down_right', 'up_right', 'down', 'up'];
const EQUIPOS = JSON.parse(readFileSync(join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'equipos.json'), 'utf8')) as Record<string, { colores: string[]; atletas: string[] }>;
const colores = (id: string) => Object.values(EQUIPOS).find((t) => t.atletas.includes(id))!.colores;
const clips5 = (id: string, a: string) => viewsForRows(FIVE).map((v) => renderClip(ficha(id), 48, a, v, { props: true }));

/** Lo pedido en B4B6 bis: cuadros, fps, bucle y eventos. Las proyecciones y sus rivales, a 14 fps y 10 cuadros. */
const PEDIDO: Record<string, [number, number, boolean, string[]]> = {
  judo_grip: [4, 10, true, []],
  judo_throw: [10, 14, false, ['impacto']],
  judo_thrown: [10, 14, false, ['aterriza', 'impacto']],
  osoto_gari: [10, 14, false, ['impacto']],
  osoto_gari_thrown: [10, 14, false, ['aterriza', 'impacto']],
  bow: [6, 8, false, []],
};

describe('judo de verdad (lote B4B6 bis)', () => {
  it('están las 6 con sus cuadros, fps, bucle y eventos', () => {
    expect(JUDO.map((a) => a.name).sort()).toEqual(Object.keys(PEDIDO).sort());
    const f = ficha('rick');
    for (const a of JUDO) {
      const [n, fps, loop, ev] = PEDIDO[a.name];
      const c = renderClip(f, 48, a.name, 'side', { props: true });
      expect([c.frames.length, c.fps, c.loop], a.name).toEqual([n, fps, loop]);
      expect((a.events ?? []).map((e) => e.type), a.name).toEqual(ev);
    }
  });

  it('los 8 atletas pasan el control de calidad en 32, 48 y 64, en las 5 filas, y también con los dos judogi', () => {
    const bad: string[] = [];
    for (const id of IDS) for (const uni of [null, 'judogi', 'judogi_azul']) {
      const f = uni ? dressWithUniform(ficha(id), 'judo', uni, colores(id)) : ficha(id);
      const cells: CellSize[] = f.cell ? [f.cell as CellSize] : uni ? [48] : [32, 48, 64];
      for (const cell of cells) for (const a of JUDO) for (const v of viewsForRows(FIVE)) {
        const r = runQA(f, renderClip(f, cell, a.name, v, { props: true }));
        if (!r.ok) bad.push(`${id} ${uni ?? ''} ${cell} ${a.name} ${v}: ${r.items.filter((i) => i.severity === 'error').map((i) => `${i.check} ${i.value}`).join(', ')}`);
      }
    }
    expect(bad).toEqual([]);
  }, 900_000);

  it('seoi nage: los cuadros donde se mete de espaldas vienen girados, y el rival va en la espalda', () => {
    const t = clips5('kenji', 'judo_throw');
    const m = motionOf8(t);
    // gira en el 2 y termina girado: mira hacia donde cayó el rival
    expect(m.girado).toEqual([false, false, true, true, true, true, true, true, true, true]);
    const { carga } = frameDataOf(t, ['carga']);
    for (const [r, fila] of carga!.entries()) {
      expect(fila.map((p) => !!p), FIVE[r]).toEqual([false, false, false, true, true, true, false, false, false, false]);
      // lo sube por la espalda y lo pasa adelante, por encima del hombro
      expect(fila[4]![1], FIVE[r]).toBeLessThan(fila[3]![1] + 1);
      expect(fila[5]![0], FIVE[r]).toBeGreaterThan(fila[3]![0]);
    }
    // de lado, cargado empieza detrás del hombro (en la espalda) y termina delante
    expect(carga![0][3]![0]).toBeLessThanOrEqual(0);
    expect(carga![0][5]![0]).toBeGreaterThan(2);
    // el o-soto-gari no gira y no carga: el rival cae en su lugar
    const o = clips5('kenji', 'osoto_gari');
    expect(motionOf8(o).girado).toBeUndefined();
    expect(frameDataOf(o, ['carga']).carga).toBeUndefined();
  });

  it('cada proyección va cuadro a cuadro con su rival: el impacto de quien proyecta es el aterriza del que cae', () => {
    for (const [tiro, cae] of [['judo_throw', 'judo_thrown'], ['osoto_gari', 'osoto_gari_thrown']]) {
      const a = JUDO.find((x) => x.name === tiro)!, b = JUDO.find((x) => x.name === cae)!;
      const ta = renderClip(ficha('rick'), 48, tiro, 'side', { props: true }), tb = renderClip(ficha('kenji'), 48, cae, 'side', { props: true });
      expect([ta.frames.length, ta.fps], tiro).toEqual([tb.frames.length, tb.fps]);
      expect(a.events!.find((e) => e.type === 'impacto')!.phase, tiro).toBe(b.events!.find((e) => e.type === 'aterriza')!.phase);
    }
  });

  it('ukemi: los dos proyectados caen con la palmada, la mano contra el tatami en el mismo cuadro del aterrizaje', () => {
    for (const id of ['sophie', 'alana', 'goro']) for (const cae of ['judo_thrown', 'osoto_gari_thrown']) {
      const c = clips5(id, cae);
      const ev = motionOf8(c).eventos!;
      const at = ev.find((e) => e.tipo === 'aterriza')!.cuadro, pal = ev.find((e) => e.tipo === 'impacto')!;
      expect(pal.cuadro, `${id} ${cae}`).toBe(at);
      const { manos } = frameDataOf(c, ['manos']);
      for (let r = 0; r < FIVE.length; r++) {
        // la palmada: en cada fila, la mano del punto está en el piso (su centro a 6 px o menos, la mano mide 3 a 4)
        expect(pal.punto![r][1], `${id} ${cae} ${FIVE[r]}`).toBeGreaterThanOrEqual(-6);
        // y venía de arriba: en el cuadro de antes los brazos estaban levantados (la mano más alta, bien arriba del piso)
        const antes = Math.min(...manos![r][at - 1].map(([, y]) => y));
        expect(antes, `${id} ${cae} ${FIVE[r]}: los brazos arriba antes de la palmada`).toBeLessThan(pal.punto![r][1] - 8);
      }
    }
  });

  it('rei: se inclina y vuelve, con los talones juntos', () => {
    for (const id of ['rick', 'alana']) {
      const c = renderClip(ficha(id), 48, 'bow', 'side', { props: true });
      const top = c.frames.map((fr) => opaqueBox(fr)!.y0);
      // en la reverencia la silueta baja; al terminar vuelve a la altura de antes
      expect(top[2], id).toBeGreaterThanOrEqual(top[0] + 2);
      expect(top[5], id).toBe(top[0]);
      const { pies } = frameDataOf([c], ['pies']);
      // los pies juntos: a 6 px o menos uno del otro
      expect(Math.abs(pies![0][0][0][0] - pies![0][0][1][0]), id).toBeLessThanOrEqual(6);
    }
  });

  it('el judogi: blanco o azul, el cinturón del color del equipo y sin sombreros (las cintas y los rulos se quedan)', () => {
    const blanco = dressWithUniform(ficha('rick'), 'judo', 'judogi', colores('rick'));
    const azul = dressWithUniform(ficha('rick'), 'judo', 'judogi_azul', colores('rick'));
    expect(blanco.outfit).toMatchObject({ sleeves: 'long', bottom: 'pants', shoes: 'descalzo', jacket: UNIFORMES.judogi.outfit!.jacket });
    // la Familia GG es azul y oro: en el blanco el cinturón azul, en el azul el dorado (el que contrasta)
    expect(blanco.outfit.belt).toBe('#2a5bd7');
    expect(azul.outfit.belt).toBe('#f2c230');
    const sinEquipo = dressWithUniform(ficha('rick'), 'judo', 'judogi');
    expect(sinEquipo.outfit.belt).toBe('#1e1e24');
    // los sombreros se quitan, las cintas de la cabeza y los rulos no
    const hat = (id: string) => dressWithUniform(ficha(id), 'judo', 'judogi', colores(id)).avatar?.lpc?.hat ?? null;
    expect(hat('gabo')).toBeNull();
    expect(hat('ender')).toBeNull();
    expect(hat('ba_hoa')).toBeNull();
    expect(hat('ryu')).toBe('headband_tied');
    expect(hat('carmen')).toBe('rolos');
    // la variante propia de la ficha para ese pack manda sobre el uniforme
    const f = { ...ficha('rick'), wardrobe: { variants: { mio: { outfit: { bottom: 'shorts' as const } } }, packs: { judo: 'mio' } } };
    expect(dressWithUniform(f, 'judo', 'judogi').outfit.bottom).toBe('shorts');
  });

  it('el kit: el pack de judo sale con su uniforme, el girado en el manifiesto y la validación conoce los uniformes', () => {
    const anims = ['judo_throw', 'bow'];
    const cfg: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { judo: { anims, vestuario: 'judogi' }, judo_azul: { anims, vestuario: 'judogi_azul' } } };
    expect(validateKitConfig(cfg)).toEqual([]);
    expect(validateKitConfig({ ...cfg, packs: { judo: { anims, vestuario: 'judogui' } } }).join(' ')).toMatch(/packs\.judo\.vestuario.*judogui.*judogi/);
    const { files } = buildCustomKit(cfg, {}, { quick: true, solo: ['atletas'] });
    const m = JSON.parse(new TextDecoder().decode(files.find((x) => x.name === 'manifest.json')!.bytes));
    expect(m.atletas.rick.vestuario).toEqual({ judo: 'judogi', judo_azul: 'judogi_azul' });
    expect(m.atletas.rick.packs.judo.anims.judo_throw.girado).toEqual([false, false, true, true, true, true, true, true, true, true]);
    expect(m.atletas.rick.packs.judo.anims.bow.girado).toBeUndefined();
    // y la nota del manifiesto le explica al juego cómo espejar
    expect((m.notas as string[]).some((n) => n.startsWith('girado:'))).toBe(true);
    // el blanco y el azul son de verdad distintos
    const png = (p: string) => files.find((x) => x.name === `atletas/rick/${p}.png`)!.bytes;
    expect(Buffer.from(png('judo')).equals(Buffer.from(png('judo_azul')))).toBe(false);
  });

  it('imagen dorada: un cuadro clave de cada una, Rick de lado en 48, con judogi', () => {
    const f = dressWithUniform(ficha('rick'), 'judo', 'judogi', colores('rick'));
    const KEY: Record<string, number> = { judo_grip: 1, judo_throw: 4, judo_thrown: 6, osoto_gari: 5, osoto_gari_thrown: 6, bow: 2 };
    const out = createRaster(48 * JUDO.length, 48);
    JUDO.forEach((a, i) => blit(out, renderClip(f, 48, a.name, 'side', { props: true }).frames[KEY[a.name]], i * 48, 0));
    const file = join(ROOT, 'golden', 'judo.png');
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(out)); return; }
    const gold = decodePng(readFileSync(file));
    const same = gold.w === out.w && Buffer.from(gold.data).equals(Buffer.from(out.data));
    if (!same) { mkdirSync(join(ROOT, 'out'), { recursive: true }); writeFileSync(join(ROOT, 'out', 'golden_actual_judo.png'), encodePng(out)); }
    expect(same, 'cambió judo; mira out/golden_actual_judo.png').toBe(true);
  });
});
