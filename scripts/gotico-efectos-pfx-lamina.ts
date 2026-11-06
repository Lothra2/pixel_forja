// Lámina de control de los efectos mudados de pixelfx (efectos_pfx.ts): cada efecto en su bloque, a escala de juego,
// sobre piso gótico oscuro y con nuestro héroe al lado (o debajo, en los estados) para comparar el tamaño.
// Los cuadros salen armados desde el atlas exportado (PNG decodificado, recorte, desplazamiento y espejo) como en el juego.
// Muestra cuadros repartidos en el tiempo, la costura del bucle (último | primero) y, en los direccionales, un cuadro
// en las 8 direcciones. Marca en rojo la celda si algo toca el borde.
// Uso: npx tsx scripts/gotico-efectos-pfx-lamina.ts salida.png
// Variables: IDS (filtrar ids, separados por coma), CAT (categoría), F (cuadros por efecto, 7), ANCHO (ancho máximo, 2400)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const { EFECTOS_PFX, efectoPfx, armarCuadroPfx, pngsEfectoPfx, olvidarEfectosPfx } = await import('../src/engine/gotico/efectos_pfx.ts');
const { decodePng } = await import('../src/engine/export/png.ts');
const { heroeReferencia } = await import('../src/engine/gotico/efectos_pfx_silueta.ts');
const { pintarPiso } = await import('../src/engine/gotico/pisos.ts');
const { encodePng } = await import('../src/engine/export/png.ts');

const salida = process.argv[2] ?? 'lamina_pfx.png';
const filtro = process.env.IDS?.split(',');
const cat = process.env.CAT;
const NF = +(process.env.F ?? 7);
const MAXW = +(process.env.ANCHO ?? 2400);
const lista = EFECTOS_PFX.filter((c) => (!filtro || filtro.includes(c.id)) && (!cat || c.categoria === cat));

type Img = { w: number; h: number; data: Uint8ClampedArray };
const lienzo = (w: number, h: number): Img => ({ w, h, data: new Uint8ClampedArray(w * h * 4) });

// letras de 3×5 para rotular
const FUENTE: Record<string, string> = {
  a: '010101111101101', b: '110101110101110', c: '011100100100011', d: '110101101101110', e: '111100110100111', f: '111100110100100',
  g: '011100101101011', h: '101101111101101', i: '111010010010111', j: '001001001101010', k: '101101110101101', l: '100100100100111',
  m: '101111111101101', n: '110101101101101', o: '010101101101010', p: '110101110100100', q: '010101101110011', r: '110101110101101',
  s: '011100010001110', t: '111010010010010', u: '101101101101111', v: '101101101101010', w: '101101111111101', x: '101101010101101',
  y: '101101010010010', z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001110',
  _: '000000000000111', ' ': '000000000000000', '-': '000000111000000', '/': '001001010100100', '|': '010010010010010', '.': '000000000000010', ':': '000010000010000',
};
function texto(img: Img, s: string, x: number, y: number, c: [number, number, number] = [200, 190, 170], k = 2) {
  for (const ch of s.toLowerCase()) {
    const g = FUENTE[ch] ?? FUENTE[' '];
    for (let i = 0; i < 15; i++) if (g[i] === '1') for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
      const X = x + (i % 3) * k + dx, Y = y + Math.floor(i / 3) * k + dy;
      if (X >= 0 && Y >= 0 && X < img.w && Y < img.h) img.data.set([...c, 255], (Y * img.w + X) * 4);
    }
    x += 4 * k;
  }
}
/** pega con alfa normal o sumando la luz (aditiva: color * alfa sumado) */
function pegar(dst: Img, src: Img, x0: number, y0: number, aditiva = false) {
  for (let y = 0; y < src.h; y++) {
    const Y = y + y0;
    if (Y < 0 || Y >= dst.h) continue;
    for (let x = 0; x < src.w; x++) {
      const X = x + x0;
      if (X < 0 || X >= dst.w) continue;
      const s = (y * src.w + x) * 4, a = src.data[s + 3] / 255;
      if (!a) continue;
      const d = (Y * dst.w + X) * 4;
      for (let c = 0; c < 3; c++) dst.data[d + c] = aditiva ? Math.min(255, dst.data[d + c] + src.data[s + c] * a) : src.data[s + c] * a + dst.data[d + c] * (1 - a);
      dst.data[d + 3] = 255;
    }
  }
}
function rect(img: Img, x: number, y: number, w: number, h: number, c: [number, number, number, number]) {
  for (let yy = Math.max(0, y); yy < Math.min(img.h, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(img.w, x + w); xx++) img.data.set(c, (yy * img.w + xx) * 4);
}
function marco(img: Img, x: number, y: number, w: number, h: number, c: [number, number, number, number]) {
  rect(img, x, y, w, 1, c); rect(img, x, y + h - 1, w, 1, c); rect(img, x, y, 1, h, c); rect(img, x + w - 1, y, 1, h, c);
}

// piso gótico oscuro: lajas de piedra en rombos de 160 × 80, apagadas como en una mazmorra de noche
const BALD = pintarPiso('lajas', 0, 0);
function piso(img: Img, x0: number, y0: number, w: number, h: number) {
  rect(img, x0, y0, w, h, [7, 6, 8, 255]);
  for (let j = -1; j * 40 < h + 80; j++)
    for (let i = -1; i * 160 < w + 160; i++) {
      const tx = x0 + i * 160 + (j & 1 ? 80 : 0) - 80, ty = y0 + j * 40 - 40;
      for (let y = 0; y < BALD.h; y++) {
        const Y = ty + y;
        if (Y < y0 || Y >= y0 + h || Y >= img.h) continue;
        for (let x = 0; x < BALD.w; x++) {
          const X = tx + x;
          if (X < x0 || X >= x0 + w || X >= img.w) continue;
          const s = (y * BALD.w + x) * 4, a = BALD.data[s + 3] / 255;
          if (a < 0.5) continue;
          const d = (Y * img.w + X) * 4;
          for (let c = 0; c < 3; c++) img.data[d + c] = BALD.data[s + c] * 0.42;
        }
      }
    }
}

const HEROE = heroeReferencia();

interface Bloque { piso: boolean; etiqueta: string; filas: { celdas: { img: Img; ancla: [number, number] }[]; nota: string }[]; aditiva: boolean; estado: boolean; borde: boolean; pantalla: boolean }
const bloques: Bloque[] = [];
const t0 = Date.now();
for (const c of lista) {
  const e = efectoPfx(c.id);
  const pags = pngsEfectoPfx(c.id).map((b) => decodePng(b));
  const pintarEfectoPfx = (id: string, d: number, f: number) => armarCuadroPfx(id, d, f, pags);
  const n = e.cuadros, filas: Bloque['filas'] = [];
  const pick = Array.from({ length: Math.min(NF, n) }, (_, k) => Math.round((k * (n - 1)) / Math.max(1, Math.min(NF, n) - 1)));
  const di = e.direccional ? 6 : 0;
  filas.push({ celdas: pick.map((f) => pintarEfectoPfx(c.id, di, f)), nota: e.direccional ? 'e' : '' });
  if (e.bucle) filas[0].celdas.push(pintarEfectoPfx(c.id, di, n - 1), pintarEfectoPfx(c.id, di, 0));
  if (e.direccional) {
    // el cuadro de más luz en las 8 direcciones
    let fk = 0;
    e.luz.curva.forEach((v, i) => { if (v > e.luz.curva[fk]) fk = i; });
    filas.push({ celdas: Array.from({ length: 8 }, (_, d) => pintarEfectoPfx(c.id, d, fk)), nota: 's so o no n ne e se' });
  }
  // ¿algo toca el borde de la celda?
  let borde = false;
  for (const fila of filas) for (const cel of fila.celdas) {
    const { w, h, data } = cel.img;
    for (let x = 0; x < w && !borde; x++) if (data[x * 4 + 3] > 8 || data[((h - 1) * w + x) * 4 + 3] > 8) borde = true;
    for (let y = 0; y < h && !borde; y++) if (data[(y * w) * 4 + 3] > 8 || data[(y * w + w - 1) * 4 + 3] > 8) borde = true;
  }
  if (e.capa === 'pantalla') borde = false;
  bloques.push({
    etiqueta: `${c.id} ${c.origen} ${e.peso.toFixed(2)}mpx ${e.paginas.length}pag ${n}f t${e.t} ${e.bucle ? 'bucle' : 'una vez'} ${e.mezcla}${e.direccional ? ' 8dir' : ''}${borde ? ' borde' : ''}`,
    piso: e.capa === 'piso', filas, aditiva: e.mezcla === 'aditiva', estado: c.categoria === 'estado' || c.categoria === 'cuerpo_a_cuerpo' || !!c.cuerpo || !!c.detrasEn || !!c.enLanzador, borde, pantalla: e.capa === 'pantalla',
  });
  olvidarEfectosPfx(c.id);
}
console.log('pintados', lista.length, 'efectos en', Date.now() - t0, 'ms');

// armado: un bloque por efecto, una fila por línea; el héroe a la izquierda del primer cuadro
const PAD = 10, ETQ = 16;
const anchoFila = (f: Bloque['filas'][number]) => f.celdas.reduce((s, c) => s + c.img.w + PAD, PAD + 70);
const arribaFila = (f: Bloque['filas'][number]) => Math.max(HEROE.img.h + 4, ...f.celdas.map((c) => c.ancla[1]));
const altoFila = (f: Bloque['filas'][number]) => arribaFila(f) + Math.max(14, ...f.celdas.map((c) => c.img.h - c.ancla[1])) + PAD + 8;
const W = Math.min(MAXW, Math.max(...bloques.flatMap((b) => b.filas.map(anchoFila)), 600));
// filas largas se parten
const lineas: { b: Bloque; celdas: Bloque['filas'][number]['celdas']; nota: string; primera: boolean }[] = [];
for (const b of bloques) {
  b.filas.forEach((f, fi) => {
    let actual: typeof f.celdas = [], ancho = PAD + 70;
    for (const c of f.celdas) {
      if (actual.length && ancho + c.img.w + PAD > W) { lineas.push({ b, celdas: actual, nota: f.nota, primera: fi === 0 && lineas.at(-1)?.b !== b }); actual = []; ancho = PAD + 70; }
      actual.push(c); ancho += c.img.w + PAD;
    }
    if (actual.length) lineas.push({ b, celdas: actual, nota: f.nota, primera: lineas.at(-1)?.b !== b });
  });
}
const H = lineas.reduce((s, l) => s + altoFila({ celdas: l.celdas, nota: '' }) + (l.primera ? ETQ : 0), PAD);
const img = lienzo(W, H);
rect(img, 0, 0, W, H, [4, 4, 5, 255]);
let y = PAD;
for (const l of lineas) {
  if (l.primera) { texto(img, l.b.etiqueta, PAD, y, l.b.borde ? [255, 80, 60] : [214, 200, 170]); y += ETQ; }
  const ah = altoFila({ celdas: l.celdas, nota: '' });
  piso(img, PAD, y, W - PAD * 2, ah - PAD);
  // el héroe de referencia: a la izquierda (o bajo el efecto si es un estado)
  const suelo = y + arribaFila({ celdas: l.celdas, nota: '' }) + 2;
  if (!l.b.estado && !l.b.pantalla) pegar(img, HEROE.img, PAD + 34 - HEROE.ancla[0], suelo - HEROE.ancla[1]);
  let x = PAD + 70;
  for (const c of l.celdas) {
    const ox = x + c.ancla[0], top = l.b.pantalla ? y + 2 : suelo - c.ancla[1];
    // los de piso van debajo del héroe; los demás encima
    if (l.b.piso) pegar(img, c.img, x, top, l.b.aditiva);
    if (l.b.estado) pegar(img, HEROE.img, ox - HEROE.ancla[0], suelo - HEROE.ancla[1]);
    if (!l.b.piso) pegar(img, c.img, x, top, l.b.aditiva);
    marco(img, x, top, c.img.w, c.img.h, l.b.borde ? [200, 40, 30, 255] : [40, 36, 44, 255]);
    x += c.img.w + PAD;
  }
  if (l.nota) texto(img, l.nota, PAD + 2, y + ah - PAD - 14, [120, 110, 100], 1);
  y += ah;
}
mkdirSync(dirname(salida), { recursive: true });
writeFileSync(salida, encodePng(img));
console.log('lámina', salida, `${W}x${H}`);
