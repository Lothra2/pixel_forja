import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderClip, viewsForRows, migrateFicha, type HumanFicha, type CellSize } from '../index';
import { motionOf8 } from '../export/motion';
import { javelinRayo } from '../anim/especiales';
import { ROOT } from './helpers';

const IDS = ['rick', 'steph', 'sophie', 'alana', 'kenji', 'ryu', 'goro', 'tetsu'];
const FICHAS = join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'fichas');
const ficha = (id: string) => ({ ...(migrateFicha(JSON.parse(readFileSync(join(FICHAS, `${id}.ficha.json`), 'utf8'))) as HumanFicha), movementProfile: 'premium' as const });
const FIVE = ['right', 'down_right', 'up_right', 'down', 'up'];

describe('la punta de la jabalina en javelin_rayo (detalle de rayo_cielo)', () => {
  it('el impacto del cuadro 2 es la punta, entre el paso y la suelta', () => {
    expect(javelinRayo.events?.map((e) => [e.type, e.joint ?? null])).toEqual([['paso', null], ['impacto', 'punta'], ['suelta', null]]);
    const m = motionOf8(viewsForRows(FIVE).map((v) => renderClip(ficha('rick'), 48, 'javelin_rayo', v, { props: true })));
    expect(m.eventos?.map((e) => [e.tipo, e.cuadro])).toEqual([['paso', 0], ['impacto', 2], ['suelta', 8]]);
  });

  it('en los 8 atletas, en 32, 48 y 64 y en las 5 filas, el punto cae en la jabalina, en la punta de arriba', () => {
    const malos: string[] = [];
    for (const cell of [32, 48, 64] as CellSize[]) for (const id of IDS) {
      const vistas = viewsForRows(FIVE);
      const con = vistas.map((v) => renderClip(ficha(id), cell, 'javelin_rayo', v, { props: true }));
      const sin = vistas.map((v) => renderClip(ficha(id), cell, 'javelin_rayo', v, { props: false }));
      const e = motionOf8(con).eventos!.find((x) => x.tipo === 'impacto')!;
      expect(e.punto, `${id} ${cell}`).toHaveLength(5);
      con.forEach((c, r) => {
        // los pixeles de la jabalina: lo que cambia al dibujarla
        const a = c.frames[e.cuadro], b = sin[r].frames[e.cuadro];
        const jav: [number, number][] = [];
        for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
          const i = (y * a.w + x) * 4;
          if (a.data[i + 3] && (!b.data[i + 3] || a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2])) jav.push([x, y]);
        }
        const [px, py] = e.punto![r];
        const X = px + cell / 2, Y = py + cell - 2;
        const arriba = Math.min(...jav.map((p) => p[1]));
        const mano = c.joints![e.cuadro].handNear;
        const fila = `${id} ${cell} ${FIVE[r]} punto ${px},${py}`;
        // sobre un pixel de la jabalina, a lo sumo uno debajo del de más arriba (el contorno) y por encima de la mano
        if (!jav.some(([x, y]) => x === X && y === Y)) malos.push(`${fila}: fuera de la jabalina`);
        else if (Y - arriba > 1) malos.push(`${fila}: ${Y - arriba} px debajo de la punta`);
        else if (Y >= mano[1]) malos.push(`${fila}: no está arriba de la mano`);
      });
    }
    expect(malos).toEqual([]);
  }, 300_000);
});
