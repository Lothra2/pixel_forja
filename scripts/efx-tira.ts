// Tira en movimiento de un efecto: todos los cuadros seguidos (recortados a la caja común de todos), sobre el piso
// gótico y con el templario de referencia, más un GIF a 25 cuadros por segundo con el tiempo de juego (cada cuadro se
// repite `t` ticks), para ver si el efecto va a tirones. Sirve para poderes (ids sin prefijo) y pixelfx (fx_...).
// Uso: npx tsx scripts/efx-tira.ts <id> <salida sin extensión>
// Variables: DIR (índice 0..7 en s so o no n ne e se; 6 por omisión en los direccionales), K (zoom de la tira, 1),
//            GIF=0 (sin GIF), HEROE=centro|lado|no (dónde va el héroe), VUELTAS (pasadas en el GIF de un bucle, 2)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { lienzo, texto, pegar, piso, HEROE, gifCuantizado, type Celda, type Img } from './efx-comun.ts';

const { PODERES, pintarPoder } = await import('../src/engine/gotico/poderes.ts');
const { LUZ_EFECTO } = await import('../src/engine/gotico/luz_efectos.ts');
const { efectoPfx, armarCuadroPfx, pngsEfectoPfx } = await import('../src/engine/gotico/efectos_pfx.ts');
const { decodePng, encodePng } = await import('../src/engine/export/png.ts');

const [id, salida] = process.argv.slice(2);
if (!id || !salida) { console.error('uso: efx-tira.ts <id> <salida>'); process.exit(1); }
const K = +(process.env.K ?? 1);

let cuadros: Celda[], t: number, bucle: boolean, aditiva: boolean, enPiso = false, curva: number[];
if (id.startsWith('fx_')) {
  const e = efectoPfx(id), pags = pngsEfectoPfx(id).map((b) => decodePng(b)), d = +(process.env.DIR ?? (e.direccional ? 6 : 0));
  cuadros = Array.from({ length: e.cuadros }, (_, f) => armarCuadroPfx(id, d, f, pags));
  t = e.t; bucle = e.bucle; aditiva = e.mezcla === 'aditiva'; enPiso = e.capa === 'piso'; curva = e.luz.curva;
} else {
  const p = PODERES.find((x) => x.id === id);
  if (!p) throw new Error(`no hay ${id}`);
  const d = +(process.env.DIR ?? (p.direccional ? 6 : 0));
  cuadros = Array.from({ length: p.cuadros }, (_, f) => pintarPoder(id, d, f));
  t = p.t; bucle = p.bucle; aditiva = LUZ_EFECTO[id].mezcla !== 'normal'; curva = LUZ_EFECTO[id].curva;
}
const donde = process.env.HEROE ?? 'lado';

// caja común (respecto del ancla) de todos los cuadros y del héroe
let x0 = -HEROE.ancla[0] - (donde === 'lado' ? 50 : 0), y0 = -HEROE.ancla[1], x1 = HEROE.img.w - HEROE.ancla[0], y1 = HEROE.img.h - HEROE.ancla[1];
if (donde === 'no') { x0 = 0; y0 = 0; x1 = 1; y1 = 1; }
for (const c of cuadros) {
  const { w, h, data } = c.img;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 4) {
    x0 = Math.min(x0, x - c.ancla[0]); x1 = Math.max(x1, x - c.ancla[0] + 1); y0 = Math.min(y0, y - c.ancla[1]); y1 = Math.max(y1, y - c.ancla[1] + 1);
  }
}
x0 -= 6; y0 -= 6; x1 += 6; y1 += 6;
const CW = x1 - x0, CH = y1 - y0;
/** un cuadro de juego: piso, héroe y efecto con el ancla en (-x0, -y0) */
function escena(c: Celda): Img {
  const img = lienzo(CW, CH);
  piso(img, 0, 0, CW, CH);
  const ax = -x0, ay = -y0, hx = donde === 'lado' ? ax - 50 : ax;
  if (enPiso) pegar(img, c.img, ax - c.ancla[0], ay - c.ancla[1], aditiva);
  if (donde !== 'no') pegar(img, HEROE.img, hx - HEROE.ancla[0], ay - HEROE.ancla[1]);
  if (!enPiso) pegar(img, c.img, ax - c.ancla[0], ay - c.ancla[1], aditiva);
  return img;
}
const escenas = cuadros.map(escena);
// la tira: los cuadros en filas de hasta 8, con su número y su luz
const POR = Math.min(8, escenas.length), filas = Math.ceil(escenas.length / POR), ETQ = 12;
const tira = lienzo((CW + 4) * POR * K, (CH + ETQ) * filas * K);
escenas.forEach((s, i) => {
  const big = K === 1 ? s : { w: s.w * K, h: s.h * K, data: new Uint8ClampedArray(s.w * K * s.h * K * 4) };
  if (K > 1) for (let y = 0; y < big.h; y++) for (let x = 0; x < big.w; x++) big.data.set(s.data.subarray((Math.floor(y / K) * s.w + Math.floor(x / K)) * 4, (Math.floor(y / K) * s.w + Math.floor(x / K)) * 4 + 4), (y * big.w + x) * 4);
  const X = (i % POR) * (CW + 4) * K, Y = Math.floor(i / POR) * (CH + ETQ) * K;
  pegar(tira, big, X, Y + ETQ * K);
  texto(tira, `${i} ${(i * t / 25).toFixed(2)}s luz ${curva[i]?.toFixed(2) ?? '-'}`, X + 2, Y + 2, [214, 200, 170], K);
});
mkdirSync(dirname(salida), { recursive: true });
writeFileSync(salida + '.png', encodePng(tira));
if (process.env.GIF !== '0') {
  const seq: Img[] = [], vueltas = bucle ? +(process.env.VUELTAS ?? 2) : 1;
  for (let v = 0; v < vueltas; v++) for (const s of escenas) for (let k = 0; k < t; k++) seq.push(s);
  if (!bucle) { const vacio = escena({ img: lienzo(1, 1), ancla: [0, 0] }); for (let k = 0; k < 12; k++) seq.push(vacio); }
  writeFileSync(salida + '.gif', await gifCuantizado(seq, 25));
}
console.log('tira', salida, `${escenas.length} cuadros t${t} ${CW}x${CH}`);
