import { describe, it, expect } from 'vitest';
import {
  familyFicha, renderClip, runQA, viewsForRows, frameDataOf, opaqueBox, EIGHT_VIEWS, FAMILY,
  heroFicha, heroCell, HEROES, type HumanFicha, type CellSize, type Raster,
} from '../index';
import { floorPropSprite } from '../render/floorProps';
import { BRAWL } from '../anim/brawl';

const premium = (id: (typeof FAMILY)[number]): HumanFicha => ({ ...familyFicha(id, false), movementProfile: 'premium' });
const FIVE = ['right', 'down_right', 'up_right', 'down', 'up'];
const alpha = (r: Raster, x: number, y: number) => (x >= 0 && y >= 0 && x < r.w && y < r.h ? r.data[(y * r.w + x) * 4 + 3] : 0);
const people: [string, HumanFicha, CellSize[]][] = [
  ...FAMILY.map((id): [string, HumanFicha, CellSize[]] => [id, premium(id), [32, 48, 64]]),
  ...HEROES.map((id): [string, HumanFicha, CellSize[]] => [id, heroFicha(id), [heroCell(id)]]),
];
/** cuadros con la carga arriba (brazos levantados): de `lift` los tres últimos, de `throw_overhead` los de antes de soltar */
const OVERHEAD: Record<string, (i: number) => boolean> = {
  lift: (i) => i >= 3, carry_idle: () => true, carry_walk: () => true, carry_run: () => true, throw_overhead: (i) => i < 3,
};

describe('levantar y llevar (pelea callejera)', () => {
  it('todas pasan el control de calidad en 32, 48 y 64, en las 8 direcciones', () => {
    const bad: string[] = [];
    for (const id of FAMILY) for (const cell of [32, 48, 64] as const) for (const a of BRAWL) for (const v of EIGHT_VIEWS) {
      const f = premium(id), c = renderClip(f, cell, a.name, v, { props: true });
      if (!runQA(f, c).ok) bad.push(`${id} ${cell} ${a.name} ${v}`);
    }
    expect(bad).toEqual([]);
  }, 600_000);

  it('la carga se apoya sin hueco: su base toca el pelo o las manos, y arriba las dos palmas están contra ella', () => {
    const fails: string[] = [];
    for (const [id, f, cells] of people) for (const cell of cells) for (const anim of Object.keys(OVERHEAD)) {
      const clips = viewsForRows(FIVE).map((v) => renderClip(f, cell, anim, v, { props: true }));
      const { carga, manos } = frameDataOf(clips, ['carga', 'manos']);
      const [px, py] = [cell / 2, cell - 2];
      clips.forEach((c, r) => c.frames.forEach((fr, i) => {
        const p = carga![r][i];
        if (!p) return;
        const tag = `${id} ${cell} ${anim} ${FIVE[r]} ${i}`;
        const [x, y] = [p[0] + px, p[1] + py];
        // la base (de una mano a la otra) toca algo de quien carga: pelo, orejas o manos, en su fila o la de abajo
        const hs = manos![r][i].map(([a]) => a + px);
        const x0 = Math.min(x, ...hs), x1 = Math.max(x, ...hs);
        let touch = false;
        for (let xx = x0; xx <= x1; xx++) if (alpha(fr, xx, y) || alpha(fr, xx, y + 1)) touch = true;
        if (!touch) fails.push(`${tag}: base en el aire`);
        if (!OVERHEAD[anim](i)) return;
        // las dos palmas: lo más alto de cada mano está a la altura de la base (el contorno suma un pixel)
        for (const [hx, hy] of manos![r][i].map(([a, b]) => [a + px, b + py])) {
          let top = hy;
          while (top > 0 && alpha(fr, hx, top - 1)) top--;
          if (Math.abs(top - y) > 2) fails.push(`${tag}: palma en ${top}, base en ${y}`);
        }
      }));
    }
    expect(fails).toEqual([]);
  }, 600_000);

  it('el levantado y el lanzado nunca se cortan en el borde de la celda', () => {
    const cuts: string[] = [];
    for (const [id, f, cells] of people) for (const cell of cells) for (const anim of ['carried', 'thrown_spin']) for (const v of EIGHT_VIEWS) {
      const c = renderClip(f, cell, anim, v, { props: true });
      const fam = (FAMILY as readonly string[]).includes(id);
      c.frames.forEach((fr, i) => {
        // la familia: ni un pixel en el borde. Los héroes: el cuerpo (las orejas de la capucha y la capa pueden recortarse
        // en la punta, como el pelo)
        const w = c.wholes![i]!;
        let edge = w.x0 <= 0 || w.x1 >= cell - 1 || w.y0 <= 0;
        if (fam) for (let k = 0; k < cell; k++) if (alpha(fr, 0, k) || alpha(fr, cell - 1, k) || alpha(fr, k, 0)) edge = true;
        if (edge) cuts.push(`${id} ${cell} ${anim} ${v} ${i}`);
      });
    }
    expect(cuts).toEqual([]);
  }, 600_000);

  it('cuerpo: igual que cajas pero sin la chispa del golpe', () => {
    const f = premium('rick');
    const clip = renderClip(f, 48, 'jab', 'side', { props: true });
    const { cajas, cuerpo } = frameDataOf([clip], ['cajas', 'cuerpo']);
    const hit = clip.events!.map((e) => Math.floor(e.phase * clip.frames.length + 1e-6))[0];
    cajas![0].forEach((b, i) => {
      const q = cuerpo![0][i]!;
      // el cuerpo cabe en la caja
      expect(q[0]).toBeGreaterThanOrEqual(b![0]);
      expect(q[0] + q[2]).toBeLessThanOrEqual(b![0] + b![2]);
    });
    // en el cuadro del golpe la chispa agranda la caja pero no el cuerpo
    expect(cuerpo![0][hit]![2]).toBeLessThan(cajas![0][hit]![2]);
  });

  it('el pote es un sprite suelto con su base en el pivote', () => {
    for (const cell of [32, 48, 64] as const) {
      const r = floorPropSprite('pote_basura', cell);
      const b = opaqueBox(r)!;
      expect(b.y1).toBeGreaterThanOrEqual(cell - 2);
      expect(b.y1).toBeLessThanOrEqual(cell - 1);
      expect(Math.abs((b.x0 + b.x1) / 2 - cell / 2)).toBeLessThanOrEqual(1.5);
      expect(floorPropSprite('pote_basura', cell, { lid: false }).data).not.toEqual(r.data);
    }
  });
});
