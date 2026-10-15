/**
 * Láminas del encargo abyss premium (docs/entregas/premium_*.png):
 *   npx tsx scripts/lamina-premium.ts [mundo1 ... mundo7]
 * Por mundo: una postal antes y después (lado a lado), los monumentos a escala 2 con su sombra, y la fauna nueva.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { encodePng } from '../src/engine/export/png.ts';
import { createRaster, blit, type Raster } from '../src/engine/core/raster.ts';
import { over } from '../src/engine/loot/canvas.ts';
import { drawShadow } from '../src/engine/world/premium/shadow.ts';
import { renderBigMap, cropView, bosqueMap, type BigMap } from '../src/engine/world/bosqueMap.ts';
import { catedralMap } from '../src/engine/world/catedralMap.ts';
import { galeriasMap } from '../src/engine/world/galeriasMap.ts';
import { puertoMap } from '../src/engine/world/puertoMap.ts';
import { ciudadMap } from '../src/engine/world/ciudadMap.ts';
import { fraguaMap } from '../src/engine/world/fraguaMap.ts';
import { corazonMap } from '../src/engine/world/corazonMap.ts';
import { RECETAS } from '../src/engine/world/abyss/recetas.ts';
import { FAUNA } from '../src/engine/world/abyss/fauna.ts';
import type { InformeAbyss } from '../src/engine/world/abyss/index.ts';

type Fn = (o: { abyss?: boolean }) => BigMap & { abyss?: InformeAbyss };
const MAPAS: Record<string, Fn> = {
  mundo1: (o) => bosqueMap(2024, o), mundo2: (o) => catedralMap(777, o), mundo3: (o) => galeriasMap(333, o), mundo4: (o) => puertoMap(444, o),
  mundo5: (o) => ciudadMap(555, o), mundo6: (o) => fraguaMap(666, o), mundo7: (o) => corazonMap(777, o),
};
const OUT = 'docs/entregas';
mkdirSync(OUT, { recursive: true });

const escala = (r: Raster, k: number) => {
  const o = createRaster(r.w * k, r.h * k);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) { const s = (((y / k) | 0) * r.w + ((x / k) | 0)) * 4; o.data.set(r.data.subarray(s, s + 4), (y * o.w + x) * 4); }
  return o;
};
const fondo = (w: number, h: number, c: number[]) => { const r = createRaster(w, h); for (let i = 0; i < w * h; i++) r.data.set([c[0], c[1], c[2], 255], i * 4); return r; };

for (const id of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(MAPAS)) {
  const antes = MAPAS[id]({ abyss: false }), despues = MAPAS[id]({});
  const a = despues.abyss!;
  // una postal antes y después: la del primer monumento (se ve el piso, el monumento y la luz de la zona)
  const p = a.monumentos[0];
  const lado = fondo(960 * 2 + 8, 540, [0, 0, 0]);
  blit(lado, cropView(renderBigMap(antes), p.x, p.y - 60), 0, 0);
  blit(lado, cropView(renderBigMap(despues), p.x, p.y - 60), 968, 0);
  writeFileSync(`${OUT}/premium_${id}_antes_despues.png`, encodePng(lado));
  // los monumentos con su sombra, a escala 2
  const objs = RECETAS[id].monumentos().map((m) => m.obj);
  const W = objs.reduce((s, o) => s + o.w + 8, 8), H = Math.max(...objs.map((o) => o.h)) + 16;
  const lam = fondo(W, H, [44, 48, 54]);
  let x = 8;
  for (const o of objs) { const y = H - 8 - o.h; if (o.shadow) drawShadow(lam, o.shadow, x, y); over(lam, o.anims.idle.frames[0], x, y); x += o.w + 8; }
  writeFileSync(`${OUT}/premium_${id}_monumentos.png`, encodePng(escala(lam, 2)));
  console.log(`${id}: ${a.monumentos.length} monumentos, ${a.memoria.total} MP`);
}

// la fauna nueva de los siete mundos (quieto y huir), a escala 4
const todas = Object.values(FAUNA).flatMap((f) => f());
const CW = 26, CH = 18, fa = fondo(CW * 12, CH * todas.length, [60, 64, 58]);
todas.forEach((s, row) => [...s.anims.quieto.frames, ...s.anims.huir.frames].forEach((f, i) => over(fa, f, i * CW + 1, row * CH + 1)));
writeFileSync(`${OUT}/premium_fauna.png`, encodePng(escala(fa, 4)));
