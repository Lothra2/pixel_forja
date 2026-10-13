import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderClip, runQA, viewsForRows, migrateFicha, createRaster, blit, encodePng, decodePng, type HumanFicha, type CellSize } from '../index';
import { RECORRIDOS, TREPAR } from '../anim/recorridos';
import { motionOf8 } from '../export/motion';
import { bikeU } from '../render/props';
import { ROOT } from './helpers';

const IDS = ['rick', 'steph', 'sophie', 'alana', 'kenji', 'ryu', 'goro', 'tetsu'];
const FICHAS = join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'fichas');
const ficha = (id: string) => ({ ...(migrateFicha(JSON.parse(readFileSync(join(FICHAS, `${id}.ficha.json`), 'utf8'))) as HumanFicha), movementProfile: 'premium' as const });
const FIVE = ['right', 'down_right', 'up_right', 'down', 'up'];
const ALL = [...RECORRIDOS, ...TREPAR];

/** La tabla del pedido (secciones B2 y B3): cuadros, fps, bucle y eventos. */
const PEDIDO: Record<string, [number, number, boolean, string[]]> = {
  ladder: [8, 10, true, ['paso', 'paso']], climb_wall: [8, 10, false, ['impacto']], ledge_hang: [4, 6, true, []], pull_up: [8, 12, false, []],
  balance_walk: [8, 8, true, ['paso', 'paso']], balance_wobble: [8, 10, true, []], balance_fall: [6, 12, false, []], duck_run: [8, 14, true, ['paso', 'paso']],
  bike_fast: [8, 14, true, []], bike_crash: [8, 14, false, ['aterriza']], skate_crash: [8, 14, false, ['aterriza']],
  climb_pole: [8, 10, true, ['paso', 'paso']], pole_idle: [4, 6, true, []], pole_punch: [6, 14, false, ['impacto']], pole_slide: [4, 12, true, []],
  pole_kick_down: [6, 14, false, ['impacto']], pole_shake: [6, 12, false, ['impacto']], grab_leg_up: [6, 12, false, ['impacto']],
};

describe('recorridos y trepar (lotes B2 y B3)', () => {
  it('están las 18 del pedido con sus cuadros, fps, bucle y eventos', () => {
    expect(ALL.map((a) => a.name).sort()).toEqual(Object.keys(PEDIDO).sort());
    const f = ficha('rick');
    for (const a of ALL) {
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
      for (const cell of cells) for (const a of ALL) for (const v of viewsForRows(FIVE)) {
        const r = runQA(f, renderClip(f, cell, a.name, v, { props: true }));
        if (!r.ok) bad.push(`${id} ${cell} ${a.name} ${v}: ${r.items.filter((i) => i.severity === 'error').map((i) => `${i.check} ${i.value}`).join(', ')}`);
      }
    }
    expect(bad).toEqual([]);
  }, 600_000);

  it('la escalera y el poste exportan qué mano agarra y dónde, en cada fila', () => {
    const f = ficha('alana');
    for (const name of ['ladder', 'climb_pole']) {
      const clips = viewsForRows(FIVE).map((v) => renderClip(f, 48, name, v, { props: true }));
      const m = motionOf8(clips);
      const pasos = m.eventos!.filter((e) => e.tipo === 'paso');
      expect(pasos.map((e) => e.mano), name).toEqual(['cerca', 'lejos']);
      for (const e of pasos) {
        expect(e.punto, name).toHaveLength(5);
        // la mano que agarra va arriba: por encima del pecho (a más de 12 px del piso en un chibi de 48)
        expect(e.punto![0][1], name).toBeLessThan(-12);
      }
    }
  });

  it('subir el muro y salir del borde suben el cuerpo con `elevacion` hasta quedar parado arriba', () => {
    const f = ficha('rick');
    // el muro llega a donde llegan las manos de pie con los brazos arriba (un poco menos); el borde, a las manos colgado
    for (const [name, min] of [['climb_wall', 18], ['pull_up', 24]] as const) {
      const c = renderClip(f, 48, name, 'side', { props: true });
      const rise = motionOf8([c]).elevacion!;
      expect(rise[rise.length - 1], name).toBeGreaterThan(min);
      for (let i = 1; i < rise.length; i++) expect(rise[i], `${name} #${i}`).toBeGreaterThanOrEqual(rise[i - 1]);
    }
  });

  it('la bici a 32 px va más chica y la de 48 queda igual', () => {
    expect(bikeU(1)).toBe(1);
    expect(bikeU(32 / 48)).toBeLessThan(32 / 48);
  });

  it('imagen dorada: un cuadro clave de cada animación, Rick de lado en 48', () => {
    const f = ficha('rick');
    const KEY: Record<string, number> = { climb_wall: 2, pull_up: 4, balance_fall: 3, bike_crash: 3, skate_crash: 3, pole_punch: 3, pole_kick_down: 3, pole_shake: 2, grab_leg_up: 3 };
    const out = createRaster(48 * ALL.length, 48);
    ALL.forEach((a, i) => blit(out, renderClip(f, 48, a.name, 'side', { props: true }).frames[KEY[a.name] ?? 0], i * 48, 0));
    const file = join(ROOT, 'golden', 'recorridos.png');
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(out)); return; }
    const gold = decodePng(readFileSync(file));
    const same = gold.w === out.w && Buffer.from(gold.data).equals(Buffer.from(out.data));
    if (!same) { mkdirSync(join(ROOT, 'out'), { recursive: true }); writeFileSync(join(ROOT, 'out', 'golden_actual_recorridos.png'), encodePng(out)); }
    expect(same, 'cambió recorridos; mira out/golden_actual_recorridos.png').toBe(true);
  });
});
