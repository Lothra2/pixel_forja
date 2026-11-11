/** QA rápida de una clase y nivel en una sola dirección: npx tsx scripts/qa-rapida.ts berserker 1 [quieto,caminar,correr] [dir] */
import { geometriaQA } from '../src/engine/gotico/cuerpo.ts';
import { cuadrosDe, type Accion, type Dir } from '../src/engine/gotico/figura.ts';
import { SUJETOS_HEROES, SUJETOS_MONSTRUOS, medirCuadro } from './qa-heroes.ts';
const [, , id, nv = '1', accs = 'quieto,caminar,correr', dir = 'so'] = process.argv;
const h = [...SUJETOS_HEROES, ...SUJETOS_MONSTRUOS].find((x) => x.id === id)!;
const [nivel, eq] = h.niveles[Math.min(+nv, h.niveles.length - 1)];
for (const acc of accs.split(',') as Accion[]) {
  const peor: Record<string, number> = {}, cuenta: Record<string, number> = {};
  const n = cuadrosDe(acc, h.cuerpo.presentacion);
  for (let f = 0; f < n; f++) for (const fl of medirCuadro(geometriaQA(h.cuerpo, eq, dir as Dir, acc, f), { clase: id, nivel, dir, acc, f })) {
    cuenta[fl.chequeo] = (cuenta[fl.chequeo] ?? 0) + 1; peor[fl.chequeo] = Math.min(peor[fl.chequeo] ?? 99, fl.valor);
  }
  { const g = geometriaQA(h.cuerpo, eq, dir as Dir, acc, 0), e = g.e, x = e.brazos[0].eje; console.log('   eje', [x[0] * e.F[0] + x[1] * e.F[1], x[0] * e.R[0] + x[1] * e.R[1], x[2]].map((v) => v.toFixed(2)).join(' ')); }
  console.log(id, nivel, acc, n + 'c', Object.keys(cuenta).length ? Object.keys(cuenta).map((k) => `${k}: ${cuenta[k]} (peor ${peor[k]})`).join(' · ') : 'limpio');
}
