import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderClip, runQA, viewsForRows, migrateFicha, createRaster, blit, encodePng, decodePng, type HumanFicha, type CellSize } from '../index';
import { PRUEBAS } from '../anim/pruebas';
import { HELD_ANIMS } from '../anim/brawl';
import { motionOf8 } from '../export/motion';
import { frameDataOf } from '../export/frameData';
import { ROOT } from './helpers';

const IDS = ['rick', 'steph', 'sophie', 'alana', 'kenji', 'ryu', 'goro', 'tetsu'];
const FICHAS = join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'fichas');
const ficha = (id: string) => ({ ...(migrateFicha(JSON.parse(readFileSync(join(FICHAS, `${id}.ficha.json`), 'utf8'))) as HumanFicha), movementProfile: 'premium' as const });
const FIVE = ['right', 'down_right', 'up_right', 'down', 'up'];

/**
 * Lo pedido (secciones B4, B5 y B6, y el estado del juego): cuadros, fps, bucle y eventos. `dodge_jump` y `bat_stance`
 * no están en las tablas del pedido (los pidió el juego después): van con los números que les puse.
 */
const PEDIDO: Record<string, [number, number, boolean, string[]]> = {
  vault_fail: [10, 12, false, ['aterriza']],
  judo_grip: [4, 10, true, []],
  judo_throw: [10, 14, false, ['impacto']],
  // con la palmada del ukemi (lote B4B6 bis): un impacto de la mano en el mismo cuadro del aterriza
  judo_thrown: [10, 14, false, ['aterriza', 'impacto']],
  dodge_jump: [8, 14, false, ['despegue', 'aterriza']],
  bat_stance: [4, 6, true, []],
  bat_swing: [6, 14, false, ['impacto']],
  tejo_throw: [8, 12, false, ['suelta']],
};

describe('la garrocha que no llega, el judo, el Quemado, la Chapita y el tejo (lote B4B6)', () => {
  it('están las 8 con sus cuadros, fps, bucle y eventos', () => {
    expect(PRUEBAS.map((a) => a.name).sort()).toEqual(Object.keys(PEDIDO).sort());
    const f = ficha('rick');
    for (const a of PRUEBAS) {
      const [n, fps, loop, ev] = PEDIDO[a.name];
      const c = renderClip(f, 48, a.name, 'side', { props: true });
      expect([c.frames.length, c.fps, c.loop], a.name).toEqual([n, fps, loop]);
      expect((a.events ?? []).map((e) => e.type), a.name).toEqual(ev);
    }
  });

  it('los 8 atletas pasan el control de calidad en 32, 48 y 64, en las 5 filas', () => {
    const bad: string[] = [];
    for (const id of IDS) {
      const f = ficha(id);
      const cells: CellSize[] = f.cell ? [f.cell as CellSize] : [32, 48, 64];
      for (const cell of cells) for (const a of PRUEBAS) for (const v of viewsForRows(FIVE)) {
        const r = runQA(f, renderClip(f, cell, a.name, v, { props: true }));
        if (!r.ok) bad.push(`${id} ${cell} ${a.name} ${v}: ${r.items.filter((i) => i.severity === 'error').map((i) => `${i.check} ${i.value}`).join(', ')}`);
      }
    }
    expect(bad).toEqual([]);
  }, 900_000);

  it('el judo: la proyección y el proyectado van cuadro a cuadro, y la carga dice dónde va el rival mientras vuela', () => {
    const f = ficha('kenji');
    const tiro = PRUEBAS.find((a) => a.name === 'judo_throw')!, cae = PRUEBAS.find((a) => a.name === 'judo_thrown')!;
    expect([tiro.fps, cae.fps]).toEqual([14, 14]);
    // el impacto de quien proyecta y el aterriza del proyectado caen en el mismo cuadro
    expect(tiro.events![0].phase).toBe(cae.events![0].phase);
    const clips = viewsForRows(FIVE).map((v) => renderClip(f, 48, 'judo_throw', v, { props: true }));
    const { carga } = frameDataOf(clips, ['carga']);
    // carga solo mientras lo tiene encima (cuadros 3 a 5). Desde el lote B4B6 bis el seoi nage se mete de espaldas y
    // lo carga a la espalda: el detalle (girado, la carga en la espalda, el ukemi) se prueba en judo.test.ts
    for (const [r, fila] of carga!.entries()) expect(fila.map((p) => !!p), FIVE[r]).toEqual([false, false, false, true, true, true, false, false, false, false]);
  });

  it('la garrocha que no llega y el salto del Quemado suben con `elevacion` y vuelven al piso al aterrizar', () => {
    const f = ficha('rick');
    const alto: Record<string, number> = {};
    for (const name of ['vault_fail', 'dodge_jump']) {
      const a = PRUEBAS.find((x) => x.name === name)!, c = renderClip(f, 48, name, 'side', { props: true });
      const rise = motionOf8([c]).elevacion!;
      const at = Math.round(a.events!.find((e) => e.type === 'aterriza')!.phase * c.frames.length);
      expect(rise[at], `${name}: aterriza en el piso`).toBe(0);
      expect(rise[rise.length - 1], name).toBe(0);
      alto[name] = Math.max(...rise);
    }
    // el salto para esquivar despega lo suficiente para que el balón pase por debajo de los pies, y la garrocha sube más
    expect(alto.dodge_jump).toBeGreaterThan(8);
    expect(alto.vault_fail).toBeGreaterThan(alto.dodge_jump);
  });

  it('el palo de la Chapita y el tejo van como arma del piso: `arma` en cada cuadro, y el tejo hasta la suelta', () => {
    const f = ficha('alana');
    for (const name of ['bat_stance', 'bat_swing']) {
      const c = renderClip(f, 48, name, 'side', { props: true });
      expect(c.held!.every(Boolean), name).toBe(true);
      expect(HELD_ANIMS[name].default, name).toBe('broomstick');
    }
    // el batazo: el palo atrás del cuerpo antes del golpe, y plano adelante en el impacto
    const sw = renderClip(f, 48, 'bat_swing', 'side', { props: true });
    expect(sw.held![1]!.behind).toBe(true);
    expect(sw.held![3]!.angle).toBe(0);
    expect(sw.held![3]!.behind).toBe(false);
    const tj = renderClip(f, 48, 'tejo_throw', 'side', { props: true });
    expect(tj.held!.map(Boolean)).toEqual([true, true, true, true, false, false, false, false]);
    expect(HELD_ANIMS.tejo_throw.default).toBe('tejo');
    // y con el arma pedida se dibuja (en el estudio)
    const drawn = renderClip(f, 48, 'bat_swing', 'side', { props: true, held: { kind: 'broomstick' } });
    expect(drawn.frames.some((fr, i) => !Buffer.from(fr.data).equals(Buffer.from(sw.frames[i].data)))).toBe(true);
  });

  it('el tejo sale de la mano a la altura del pecho, adelante del cuerpo, en todas las filas', () => {
    const f = ficha('rick');
    const clips = viewsForRows(FIVE).map((v) => renderClip(f, 48, 'tejo_throw', v, { props: true }));
    const suelta = motionOf8(clips).eventos!.find((e) => e.tipo === 'suelta')!;
    expect(suelta.punto).toHaveLength(5);
    // de lado: adelante de la cadera y entre la cintura y la cabeza
    expect(suelta.punto![0][0]).toBeGreaterThan(4);
    expect(suelta.punto![0][1]).toBeLessThan(-10);
    expect(suelta.punto![0][1]).toBeGreaterThan(-30);
  });

  it('imagen dorada: un cuadro clave de cada animación, Rick de lado en 48', () => {
    const f = ficha('rick');
    const KEY: Record<string, number> = { vault_fail: 4, judo_grip: 1, judo_throw: 5, judo_thrown: 4, dodge_jump: 3, bat_stance: 0, bat_swing: 3, tejo_throw: 4 };
    const out = createRaster(48 * PRUEBAS.length, 48);
    PRUEBAS.forEach((a, i) => blit(out, renderClip(f, 48, a.name, 'side', { props: true }).frames[KEY[a.name]], i * 48, 0));
    const file = join(ROOT, 'golden', 'b4b6.png');
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(out)); return; }
    const gold = decodePng(readFileSync(file));
    const same = gold.w === out.w && Buffer.from(gold.data).equals(Buffer.from(out.data));
    if (!same) { mkdirSync(join(ROOT, 'out'), { recursive: true }); writeFileSync(join(ROOT, 'out', 'golden_actual_b4b6.png'), encodePng(out)); }
    expect(same, 'cambió b4b6; mira out/golden_actual_b4b6.png').toBe(true);
  });
});
