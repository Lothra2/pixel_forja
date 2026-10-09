/**
 * Visor vivo del Bosque GG: exporta el mundo (suelo en trozos, agua, objetos con sus animaciones, criaturas,
 * partículas, bruma, luz, ambientes) y una página que lo anima: viento, agua, bruma en capas, oscuridad con luces,
 * fuegos fatuos, cuervos, ojos que parpadean y el nombre de cada zona al entrar.
 *   npx tsx scripts/visor-mundo.ts <carpeta> [--sin-audio]
 */
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bosqueMap } from '../src/engine/world/bosqueMap.ts';
import { waterTile, chunks } from '../src/engine/world/paint.ts';
import { creatures, fogTexture } from '../src/engine/world/atmosphere.ts';
import { particles, lightTexture, cloudShadow } from '../src/engine/world/ambient.ts';
import { ambience, AMBIENCE_NAMES } from '../src/engine/audio/ambience.ts';
import { encodeWav } from '../src/engine/audio/sfx.ts';
import { encodePng } from '../src/engine/export/png.ts';
import { createRaster, blit, type Raster } from '../src/engine/core/raster.ts';

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--'));
if (!out) { console.error('Uso: npx tsx scripts/visor-mundo.ts <carpeta> [--sin-audio]'); process.exit(1); }
const here = dirname(fileURLToPath(import.meta.url));
const t0 = Date.now();
rmSync(out, { recursive: true, force: true });
let bytes = 0;
const write = (name: string, data: Uint8Array | string) => { const p = join(out, name); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, data); bytes += typeof data === 'string' ? data.length : data.length; };
const png = (name: string, r: Raster) => write(name, encodePng(r));
const strip = (frames: Raster[]) => { const w = frames[0].w, h = frames[0].h; const s = createRaster(w * frames.length, h); frames.forEach((f, i) => blit(s, f, i * w, 0)); return s; };

const m = bosqueMap();
console.log(`  mapa: ${m.decos.length} objetos, ${m.entities.length} entidades (${Date.now() - t0} ms)`);

// suelo en trozos de 960
const parts = chunks(m.terrain.img, 960).map((c, i) => { png(`suelo/${i}.png`, c.img); return { f: `suelo/${i}.png`, x: c.x, y: c.y, w: c.img.w, h: c.img.h }; });
// agua: 4 cuadros en tira
png('agua.png', strip([0, 1, 2, 3].map((f) => waterTile(f))));
const water: number[] = [];
m.terrain.waterTiles.forEach((v, i) => { if (v) water.push(i); });

// objetos usados (con todas sus animaciones)
const used = new Set(m.decos.map((d) => d.sprite));
const sprites: Record<string, unknown>[] = [];
const spriteIndex = new Map<string, number>();
for (const o of m.objects) {
  if (!used.has(o.name)) continue;
  const anims: Record<string, { f: string; n: number; fps: number; loop: boolean }> = {};
  for (const [an, a] of Object.entries(o.anims)) { const f = `o/${o.name}__${an}.png`; png(f, strip(a.frames)); anims[an] = { f, n: a.frames.length, fps: a.fps, loop: a.loop }; }
  spriteIndex.set(o.name, sprites.length);
  sprites.push({ name: o.name, w: o.w, h: o.h, ax: o.anchor[0], ay: o.anchor[1], ...(o.layer ? { layer: o.layer } : {}), ...(o.light ? { light: o.light } : {}), anims });
}
// criaturas y partículas
const crit: Record<string, unknown> = {};
for (const c of creatures()) {
  const anims: Record<string, unknown> = {};
  for (const [an, a] of Object.entries(c.anims)) { const f = `c/${c.name}__${an}.png`; png(f, strip(a.frames)); anims[an] = { f, n: a.frames.length, fps: a.fps, loop: a.loop }; }
  crit[c.name] = { w: c.w, h: c.h, anims };
}
const parts2: Record<string, unknown> = {};
for (const p of particles()) { const f = `p/${p.name}.png`; png(f, strip(p.frames)); parts2[p.name] = { f, w: p.w, h: p.h, n: p.frames.length, fps: p.fps }; }
png('fx/luz.png', lightTexture(128));
png('fx/nube.png', cloudShadow());
png('fx/niebla_nubes.png', fogTexture('nubes', 256));
png('fx/niebla_jirones.png', fogTexture('jirones', 256));
const audio: Record<string, string> = {};
if (!args.includes('--sin-audio')) for (const n of AMBIENCE_NAMES) { const f = `a/${n}.wav`; write(f, encodeWav(ambience(n), undefined, true)); audio[n] = f; }

// datos del mundo (compactos): decos ordenadas por y como [sprite, x, y]
const decos = [...m.decos].sort((a, b) => a.y - b.y).map((d) => [spriteIndex.get(d.sprite)!, d.x, d.y]);
const data = {
  name: 'Bosque GG', w: m.w * 32, h: m.h * 32, tile: 32, cols: m.w,
  chunks: parts, water, sprites, decos,
  entities: m.entities.filter((e) => ['criatura', 'punto_guardado', 'portal_llegada', 'jefe', 'portal_jefe', 'jugador_inicio'].includes(e.tipo)),
  zones: m.zones, postales: m.postales, creatures: crit, particles: parts2, audio,
};
write('mundo.json', JSON.stringify(data));
const runtime = readFileSync(join(here, 'visor', 'runtime.js'), 'utf8');
const page = readFileSync(join(here, 'visor', 'pagina.html'), 'utf8').replace('/*RUNTIME*/', () => runtime);
write('index.html', page);
console.log(`Visor listo en ${out}: ${(bytes / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
