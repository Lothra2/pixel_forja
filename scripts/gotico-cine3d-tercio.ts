// Pasa tiras de fuego ya horneadas (fuego_N.png en grilla, a escala 2) a otra escala (3 = un tercio de resolución) sin
// volver a trazar: cada celda se promedia (color por alfa, como se suma) y se rearma la grilla y el meta.json.
// Uso: npx tsx scripts/gotico-cine3d-tercio.ts i06_impacto,i09_fuego [escala=3]
import { readFileSync, writeFileSync } from 'node:fs';
const { decodePng, encodePng } = await import('../src/engine/export/png');
const T = await import('../src/engine/gotico/cine3d_toma');
const { createRaster } = await import('../src/engine/core/raster');
const ids = process.argv[2].split(','), nueva = +(process.argv[3] ?? 3);
for (const id of ids) {
  const dir = new URL(`${id}/`, T.CARPETA_HORNEADO).pathname, meta = JSON.parse(readFileSync(dir + 'meta.json', 'utf8')) as import('../src/engine/gotico/cine3d_toma').MetaHorneado;
  meta.fuegos = meta.fuegos.map((f, n) => {
    if (f.escala >= nueva) return f;
    const img = decodePng(readFileSync(dir + `fuego_${n + 1}.png`)), k = nueva / f.escala, W = Math.ceil(f.w / k), H = Math.ceil(f.h / k);
    const cuadros = Array.from({ length: f.cuadros }, (_, c) => {
      const ox = (c % f.columnas) * f.w, oy = Math.floor(c / f.columnas) * f.h, r = createRaster(W, H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        // lo que suma es color * alfa: se promedia eso y se vuelve a separar en color (pasos de 4) y alfa = el canal más fuerte
        const q = [0, 0, 0]; let m = 0;
        for (let yy = Math.floor(y * k); yy < Math.min(f.h, Math.ceil((y + 1) * k)); yy++) for (let xx = Math.floor(x * k); xx < Math.min(f.w, Math.ceil((x + 1) * k)); xx++) {
          const s = ((oy + yy) * img.w + ox + xx) * 4, a = img.data[s + 3] / 255; for (let j = 0; j < 3; j++) q[j] += (img.data[s + j] / 255) * a; m++;
        }
        for (let j = 0; j < 3; j++) q[j] /= Math.max(1, m);
        const a = Math.max(q[0], q[1], q[2]); if (a < 1.5 / 255) continue;
        const d = (y * W + x) * 4; for (let j = 0; j < 3; j++) d < r.data.length && (r.data[d + j] = Math.min(255, Math.round((q[j] / a) * 63) * 4)); r.data[d + 3] = Math.round(a * 255);
      }
      return r;
    });
    const g = T.grilla(cuadros); writeFileSync(dir + `fuego_${n + 1}.png`, encodePng(g.img));
    console.log(`${id} fuego_${n + 1}: ${f.w}x${f.h} a escala ${f.escala} -> ${W}x${H} a escala ${nueva}`);
    return { ...f, w: W, h: H, escala: nueva, columnas: g.columnas };
  });
  writeFileSync(dir + 'meta.json', JSON.stringify(meta, null, 1));
}
