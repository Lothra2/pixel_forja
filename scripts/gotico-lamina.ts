// Lámina de objetos del taller gótico: cada variante (y los cuadros si anima) sobre una celda de juego, con una línea
// roja de 75 px (la altura de una persona) para comparar. Uso: MODS=cementerio,cueva npx tsx scripts/gotico-lamina.ts salida.png
// Variables: MODS (archivos de catalogo/), IDS (filtrar), S (escala), COLS, F (cuántos cuadros de animación mostrar).
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { REGISTRO, pintarObjeto } from '../src/engine/gotico/objeto';
const mods = (process.env.MODS ?? 'referencia').split(',');
for (const m of mods) await import(`../src/engine/gotico/catalogo/${m}.ts`);
const filtro = process.env.IDS?.split(',');
const S = +(process.env.S ?? 2);
const items: { id: string; v: string; f: number }[] = [];
for (const d of REGISTRO) { if (filtro && !filtro.includes(d.id)) continue; for (const v of d.variantes) for (let f = 0; f < Math.min(d.cuadros ?? 1, +(process.env.F ?? 1)); f++) items.push({ id: d.id, v, f }); }
const t0 = Date.now();
const rs = items.map((it) => pintarObjeto(it.id, it.v, it.f, 3));
console.log('render', items.length, 'en', Date.now() - t0, 'ms');
const CW = Math.max(170, ...rs.map((r) => r.img.w + 20)), CH = Math.max(120, ...rs.map((r) => r.img.h + 30));
const cols = Math.min(items.length, +(process.env.COLS ?? 6)), filas = Math.ceil(items.length / cols);
const W = CW * cols * S, H = CH * filas * S, img = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) { img[i * 3] = 46; img[i * 3 + 1] = 42; img[i * 3 + 2] = 38; }
const put = (X: number, Y: number, c: number[], a = 255) => { for (let p = 0; p < S; p++) for (let q = 0; q < S; q++) { const x = X * S + p, y = Y * S + q; if (x < 0 || y < 0 || x >= W || y >= H) continue; const d = (y * W + x) * 3; for (let k = 0; k < 3; k++) img[d + k] = Math.round(img[d + k] + (c[k] - img[d + k]) * a / 255); } };
rs.forEach((r, i) => {
  const ox = (i % cols) * CW, oy = Math.floor(i / cols) * CH;
  const ax = ox + Math.round(CW / 2), ay = oy + CH - 30;
  // rombo de una celda de juego (32x16) bajo el ancla y la persona de referencia
  for (let y = -8; y <= 8; y++) for (let x = -16; x <= 16; x++) if (Math.abs(x) / 16 + Math.abs(y) / 8 <= 1) put(ax + x, ay + y, (x + y) % 2 ? [70, 64, 56] : [62, 57, 50]);
  for (let y = 0; y < 75; y++) put(ox + 8, ay - y, [150, 60, 60], 140);
  for (let y = 0; y < r.img.h; y++) for (let x = 0; x < r.img.w; x++) { const o = (y * r.img.w + x) * 4; if (!r.img.data[o + 3]) continue; put(ax - r.ancla[0] + x, ay - r.ancla[1] + y, [r.img.data[o], r.img.data[o + 1], r.img.data[o + 2]], r.img.data[o + 3]); }
});
const raw = Buffer.alloc((W * 3 + 1) * H); for (let y = 0; y < H; y++) img.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
const crcT = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c; }
const crc = (b: Buffer) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(process.argv[2], Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('ok', W, H);
