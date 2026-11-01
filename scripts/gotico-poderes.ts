// Lámina de poderes del taller gótico: cada efecto en una fila con algunos cuadros (y los direccionales en varias
// direcciones), sobre un piso isométrico oscuro, con una línea roja de 75 px (la altura de una persona) para la escala.
// Uso: npx tsx scripts/gotico-poderes.ts salida.png
// Variables: IDS (filtrar, separados por coma), S (escala, 2), F (cuadros por efecto, 5), ANCHO (ancho de estante a 1x, 1800),
// ZIP (ruta: escribe también el paquete).
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const { PODERES, pintarPoder, paquetePoderes, DIRS_PODER } = await import('../src/engine/gotico/poderes.ts');

const filtro = process.env.IDS?.split(',');
const S = +(process.env.S ?? 2);
const NF = +(process.env.F ?? 5);
const lista = PODERES.filter((p) => !filtro || filtro.includes(p.id));

// letras de 3×5 para rotular
const FUENTE: Record<string, string> = {
  a: '010101111101101', b: '110101110101110', c: '011100100100011', d: '110101101101110', e: '111100110100111', f: '111100110100100',
  g: '011100101101011', h: '101101111101101', i: '111010010010111', j: '001001001101010', k: '101101110101101', l: '100100100100111',
  m: '101111111101101', n: '110101101101101', o: '010101101101010', p: '110101110100100', q: '010101101110011', r: '110101110101101',
  s: '011100010001110', t: '111010010010010', u: '101101101101111', v: '101101101101010', w: '101101111111101', x: '101101010101101',
  y: '101101010010010', z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001110',
  _: '000000000000111', ' ': '000000000000000', '-': '000000111000000', '/': '001001010100100',
};

type Celda = { img: { w: number; h: number; data: Uint8ClampedArray }; ancla: [number, number] };
const filas: { id: string; etiqueta: string; celdas: Celda[] }[] = [];
const t0 = Date.now();
for (const p of lista) {
  const celdas: Celda[] = [];
  if (p.direccional) {
    for (const d of [7, 0, 2, 4, 5]) celdas.push(pintarPoder(p.id, d, 0));
    for (let k = 1; k < Math.min(p.cuadros, 3); k++) celdas.push(pintarPoder(p.id, 7, k));
  } else {
    const n = Math.min(NF, p.cuadros);
    for (let k = 0; k < n; k++) celdas.push(pintarPoder(p.id, 0, Math.round((k * (p.cuadros - 1)) / Math.max(1, n - 1 + (p.bucle ? 1 : 0)))));
  }
  const dirs = p.direccional ? ` dirs se s o n ne` : '';
  filas.push({ id: p.id, etiqueta: `${p.id} ${p.celda[0]}x${p.celda[1]} ${p.cuadros}f t${p.t}${dirs}`, celdas });
}
console.log('render', lista.length, 'poderes en', Date.now() - t0, 'ms');

const PAD = 14, ETQ = 10;
const arriba = (f: (typeof filas)[number]) => Math.max(80, ...f.celdas.map((c) => c.ancla[1]));
const abajo = (f: (typeof filas)[number]) => Math.max(10, ...f.celdas.map((c) => c.img.h - c.ancla[1]));
const altoFila = (f: (typeof filas)[number]) => arriba(f) + abajo(f) + PAD * 2 + ETQ;
const anchoFila = (f: (typeof filas)[number]) => f.celdas.reduce((s, c) => s + Math.max(c.img.w, 60) + PAD, PAD + 12);
// bloques (uno por poder) acomodados en estantes de hasta ANCHO px (a 1x)
const MAXW = Math.max(+(process.env.ANCHO ?? 1800), ...filas.map(anchoFila));
const pos: { x: number; y: number }[] = [];
const estantes: { y: number; h: number }[] = [];
{
  let x = 0, y = 0, h = 0;
  for (const f of filas) {
    const w = anchoFila(f);
    if (x > 0 && x + w > MAXW) { estantes.push({ y, h }); y += h; x = 0; h = 0; }
    pos.push({ x, y });
    x += w; h = Math.max(h, altoFila(f));
  }
  estantes.push({ y, h });
}
const W0 = MAXW, H0 = estantes.reduce((s, e) => s + e.h, 0);
const W = W0 * S, H = H0 * S, img = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) { img[i * 3] = 14; img[i * 3 + 1] = 13; img[i * 3 + 2] = 15; }
const put = (X: number, Y: number, c: number[], a = 255) => {
  for (let p = 0; p < S; p++) for (let q = 0; q < S; q++) {
    const x = X * S + p, y = Y * S + q;
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const d = (y * W + x) * 3;
    for (let k = 0; k < 3; k++) img[d + k] = Math.round(img[d + k] + (c[k] - img[d + k]) * a / 255);
  }
};
const texto = (x: number, y: number, s: string, c: number[]) => {
  let cx = x;
  for (const ch of s.toLowerCase()) {
    const g = FUENTE[ch] ?? FUENTE[' '];
    for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (g[r * 3 + k] === '1') put(cx + k, y + r, c);
    cx += 4;
  }
};

// piso isométrico oscuro (rombos de 32×16)
for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
  const u = Math.floor(x / 32 + y / 16), v = Math.floor(x / 32 - y / 16);
  put(x, y, (u + v) & 1 ? [30, 28, 32] : [25, 23, 27]);
}
filas.forEach((f, i) => {
  const { x: bx, y: by } = pos[i];
  for (let x = bx; x < bx + anchoFila(f); x++) put(x, by, [60, 56, 64]);
  for (let y = by; y < by + altoFila(f); y++) put(bx, y, [60, 56, 64]);
  texto(bx + 4, by + 3, f.etiqueta, [200, 196, 180]);
  const ay = by + ETQ + PAD + arriba(f);
  for (let y = 0; y < 75; y++) put(bx + 5, ay - y, [190, 50, 50], 200);
  let ox = bx + PAD + 12;
  for (const c of f.celdas) {
    const cw = Math.max(c.img.w, 60), ax = ox + Math.round(cw / 2);
    // rombo de una celda de juego bajo el ancla
    for (let y = -8; y <= 8; y++) for (let x = -16; x <= 16; x++) if (Math.abs(x) / 16 + Math.abs(y) / 8 <= 1) put(ax + x, ay + y, [44, 40, 46]);
    const x0 = ax - c.ancla[0], y0 = ay - c.ancla[1];
    for (let y = 0; y < c.img.h; y++) for (let x = 0; x < c.img.w; x++) {
      const o = (y * c.img.w + x) * 4;
      if (!c.img.data[o + 3]) continue;
      put(x0 + x, y0 + y, [c.img.data[o], c.img.data[o + 1], c.img.data[o + 2]], c.img.data[o + 3]);
    }
    if (process.env.MARCO) for (let x = 0; x < c.img.w; x++) { put(x0 + x, y0, [80, 80, 160], 90); put(x0 + x, y0 + c.img.h - 1, [80, 80, 160], 90); }
    put(ax, ay, [255, 60, 60]);
    ox += cw + PAD;
  }
});

const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) img.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
const crcT = new Int32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c; }
const crc = (b: Buffer) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(process.argv[2] ?? 'poderes.png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('ok', W, H, 'direcciones', DIRS_PODER.join(','));
if (process.env.ZIP) { const z = paquetePoderes(); writeFileSync(process.env.ZIP, z); console.log('zip', z.length, 'bytes'); }
