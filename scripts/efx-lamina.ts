// Lámina de control de efectos a escala de juego: poderes del taller (poderes.ts, ids sin prefijo) y efectos de
// pixelfx (efectos_pfx.ts, ids fx_...) en la misma hoja, sobre el piso gótico oscuro y con el templario de
// referencia al lado (o en el centro, en las auras, novas y estados que se lanzan sobre él).
// Por efecto: una fila con cuadros repartidos en el tiempo (dirección e, o la única), la costura del bucle
// (último | primero) y, si es direccional, el cuadro de más luz en las 8 direcciones. Los de pixelfx salen del PNG
// exportado (paleta, recorte y espejo) como los arma el juego.
// Uso: IDS=aliento_infernal,fx_ola npx tsx scripts/efx-lamina.ts salida.png
// Variables: IDS (obligatorio), F (cuadros por fila, 7), ANCHO (ancho máximo, 2400), TITULO (texto arriba),
//            CENTRO (ids separados por coma que van con el héroe en el ancla), LADO (ids que van con el héroe al lado)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { lienzo, texto, pegar, rect, marco, piso, HEROE, type Celda, type Img } from './efx-comun.ts';

const { PODERES, pintarPoder } = await import('../src/engine/gotico/poderes.ts');
const { LUZ_EFECTO } = await import('../src/engine/gotico/luz_efectos.ts');
const { efectoPfx, armarCuadroPfx, pngsEfectoPfx, olvidarEfectosPfx, EFECTOS_PFX } = await import('../src/engine/gotico/efectos_pfx.ts');
const { decodePng, encodePng } = await import('../src/engine/export/png.ts');

const salida = process.argv[2] ?? 'lamina_efx.png';
const ids = (process.env.IDS ?? '').split(',').filter(Boolean);
if (!ids.length) { console.error('falta IDS'); process.exit(1); }
const NF = +(process.env.F ?? 7);
const MAXW = +(process.env.ANCHO ?? 2400);
const CENTRO = new Set((process.env.CENTRO ?? '').split(','));
const LADO = new Set((process.env.LADO ?? '').split(','));

interface Bloque { etiqueta: string; filas: { celdas: Celda[]; nota: string }[]; aditiva: boolean; enPiso: boolean; centro: boolean; borde: boolean }
const bloques: Bloque[] = [];

/** ¿algo toca el borde de la celda? */
const tocaBorde = (c: Celda) => {
  const { w, h, data } = c.img;
  for (let x = 0; x < w; x++) if (data[x * 4 + 3] > 8 || data[((h - 1) * w + x) * 4 + 3] > 8) return true;
  for (let y = 0; y < h; y++) if (data[y * w * 4 + 3] > 8 || data[(y * w + w - 1) * 4 + 3] > 8) return true;
  return false;
};
const reparto = (n: number, k: number) => Array.from({ length: Math.min(k, n) }, (_, i) => Math.round((i * (n - 1)) / Math.max(1, Math.min(k, n) - 1)));

for (const id of ids) {
  if (id.startsWith('fx_')) {
    const cfg = EFECTOS_PFX.find((c) => c.id === id);
    if (!cfg) throw new Error(`no hay ${id}`);
    const e = efectoPfx(id), pags = pngsEfectoPfx(id).map((b) => decodePng(b));
    const cuadro = (d: number, f: number): Celda => armarCuadroPfx(id, d, f, pags);
    const di = e.direccional ? 6 : 0, n = e.cuadros, filas: Bloque['filas'] = [];
    filas.push({ celdas: reparto(n, NF).map((f) => cuadro(di, f)), nota: `cuadros ${reparto(n, NF).join(' ')}` });
    if (e.bucle) filas[0].celdas.push(cuadro(di, n - 1), cuadro(di, 0));
    if (e.direccional) {
      let fk = 0;
      e.luz.curva.forEach((v, i) => { if (v > e.luz.curva[fk]) fk = i; });
      filas.push({ celdas: Array.from({ length: 8 }, (_, d) => cuadro(d, fk)), nota: 's so o no n ne e se' });
    }
    const kb = e.paginas.reduce((s, p) => s + p.bytes, 0) / 1024;
    bloques.push({
      etiqueta: `${id} ${e.peso.toFixed(2)}mpx ${kb.toFixed(0)}kb ${n}f t${e.t} ${e.bucle ? 'bucle' : 'una vez'} ${e.capa} ${e.mezcla} luz r${e.luz.radio} k${e.luz.intensidad}`,
      filas, aditiva: e.mezcla === 'aditiva', enPiso: e.capa === 'piso',
      centro: !LADO.has(id) && (CENTRO.has(id) || cfg.categoria === 'estado' || !!cfg.enLanzador || !!cfg.cuerpo || !!cfg.detrasEn),
      borde: filas.some((f) => f.celdas.some(tocaBorde)),
    });
    olvidarEfectosPfx(id);
  } else {
    const p = PODERES.find((x) => x.id === id);
    if (!p) throw new Error(`no hay ${id}`);
    const l = LUZ_EFECTO[id], di = p.direccional ? 6 : 0, n = p.cuadros, filas: Bloque['filas'] = [];
    filas.push({ celdas: reparto(n, NF).map((f) => pintarPoder(id, di, f)), nota: `cuadros ${reparto(n, NF).join(' ')}` });
    if (p.bucle) filas[0].celdas.push(pintarPoder(id, di, n - 1), pintarPoder(id, di, 0));
    if (p.direccional) {
      let fk = 0;
      l.curva.forEach((v, i) => { if (v > l.curva[fk]) fk = i; });
      filas.push({ celdas: Array.from({ length: 8 }, (_, d) => pintarPoder(id, d, fk)), nota: 's so o no n ne e se' });
    }
    bloques.push({
      etiqueta: `${id} ${p.celda[0]}x${p.celda[1]} ancla ${p.ancla[0]},${p.ancla[1]} ${n}f t${p.t} ${p.bucle ? 'bucle' : 'una vez'} luz r${l.radio} k${l.intensidad}`,
      filas, aditiva: l.mezcla !== 'normal', enPiso: false,
      centro: !LADO.has(id) && (CENTRO.has(id) || p.tipo === 'aura' || p.tipo === 'buff'),
      borde: filas.some((f) => f.celdas.some(tocaBorde)),
    });
  }
}

const PAD = 10, ETQ = 16, IZQ = 70;
const arribaFila = (cs: Celda[]) => Math.max(HEROE.img.h + 4, ...cs.map((c) => c.ancla[1]));
const altoFila = (cs: Celda[]) => arribaFila(cs) + Math.max(14, ...cs.map((c) => c.img.h - c.ancla[1])) + PAD + 8;
const W = Math.min(MAXW, Math.max(600, ...bloques.flatMap((b) => b.filas.map((f) => f.celdas.reduce((s, c) => s + c.img.w + PAD, PAD + IZQ)))));
const lineas: { b: Bloque; celdas: Celda[]; nota: string; primera: boolean }[] = [];
for (const b of bloques)
  b.filas.forEach((f) => {
    let actual: Celda[] = [], ancho = PAD + IZQ;
    const empuja = () => { lineas.push({ b, celdas: actual, nota: f.nota, primera: lineas.at(-1)?.b !== b }); actual = []; ancho = PAD + IZQ; };
    for (const c of f.celdas) { if (actual.length && ancho + c.img.w + PAD > W) empuja(); actual.push(c); ancho += c.img.w + PAD; }
    if (actual.length) empuja();
  });
const TIT = process.env.TITULO ? 22 : 0;
const H = lineas.reduce((s, l) => s + altoFila(l.celdas) + (l.primera ? ETQ : 0), PAD + TIT);
const img: Img = lienzo(W, H);
rect(img, 0, 0, W, H, [4, 4, 5, 255]);
if (TIT) texto(img, process.env.TITULO!, PAD, PAD, [240, 220, 160], 3);
let y = PAD + TIT;
for (const l of lineas) {
  if (l.primera) { texto(img, l.b.etiqueta, PAD, y, l.b.borde ? [255, 80, 60] : [214, 200, 170]); y += ETQ; }
  const ah = altoFila(l.celdas);
  piso(img, PAD, y, W - PAD * 2, ah - PAD);
  const suelo = y + arribaFila(l.celdas) + 2;
  if (!l.b.centro) pegar(img, HEROE.img, PAD + 34 - HEROE.ancla[0], suelo - HEROE.ancla[1]);
  let x = PAD + IZQ;
  for (const c of l.celdas) {
    const ox = x + c.ancla[0], top = suelo - c.ancla[1];
    if (l.b.enPiso) pegar(img, c.img, x, top, l.b.aditiva);
    if (l.b.centro) pegar(img, HEROE.img, ox - HEROE.ancla[0], suelo - HEROE.ancla[1]);
    if (!l.b.enPiso) pegar(img, c.img, x, top, l.b.aditiva);
    marco(img, x, top, c.img.w, c.img.h, l.b.borde ? [200, 40, 30, 255] : [40, 36, 44, 255]);
    x += c.img.w + PAD;
  }
  if (l.nota) texto(img, l.nota, PAD + 2, y + ah - PAD - 8, [120, 110, 100], 1);
  y += ah;
}
mkdirSync(dirname(salida), { recursive: true });
writeFileSync(salida, encodePng(img));
console.log('lámina', salida, `${W}x${H}`);
