/**
 * Piloto 0d de Forja 2: el control del pie de apoyo sobre las animaciones de hoy del premium chibi de GG Abyss (las 21
 * del kit, la familia con su clase) y el pie clavado donde patina, sin cambiar poses, tiempos ni impactos.
 *   npx tsx scripts/forja2-piloto-0d.ts
 * Escribe en docs/forja2/piloto/0d/: calidad_hoy.md, calidad_despues.md, lamina_<n>.png y gif/<n>_x3.gif (antes y
 * después de las que más patinaban).
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng } from '../src/engine/export/png.ts';
import { encodeGif } from '../src/engine/export/gif.ts';
import { createRaster, blit, upscaleNearest, type Raster } from '../src/engine/core/raster.ts';
import { bitmapFonts, drawText } from '../src/engine/ui/fonts.ts';
import { renderClip, posesFor, EIGHT_VIEWS, type ViewName } from '../src/engine/render/clip.ts';
import { familyFicha, FAMILY, type FamilyId } from '../src/engine/rpg/family.ts';
import { HERO_RPG_ANIMS } from '../src/engine/rpg/presets.ts';
import type { Joints } from '../src/engine/render/human.ts';
import { patinazos, resumen, NO_CLAVAR } from '../src/engine/forja2/clavar.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/forja2/piloto/0d');
mkdirSync(join(OUT, 'gif'), { recursive: true });
const FONDO: [number, number, number] = [58, 62, 84];
const fontDir = join(ROOT, 'node_modules/@fontsource/silkscreen/files');
const ab = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer; };
const fuente = bitmapFonts(ab(join(fontDir, 'silkscreen-latin-400-normal.woff')), ab(join(fontDir, 'silkscreen-latin-700-normal.woff')))[0];
const CELL = 48;
const vistaPose = (v: ViewName) => (v === 'front' ? 'front' : v === 'back' ? 'back' : 'side');

interface Fila { pj: string; anim: string; tipo: 'en el sitio' | 'avanza' | 'gira' | 'se desliza'; vistas: number; antes: { max: number; malos: number; pasos: number; peor: string }; despues?: { max: number; malos: number; perdidos: number } }
const filas: Fila[] = [];
const casos: { clave: string; anim: string; antes: Raster[]; despues: Raster[]; fps: number; max: number }[] = [];
let seg = 0, cuadrosTot = 0;

for (const id of FAMILY as readonly FamilyId[]) {
  const f = familyFicha(id, true);
  for (const anim of HERO_RPG_ANIMS) {
    const lado = renderClip(f, CELL, anim, 'side', { props: true });
    const avanza = !!(lado.stride || lado.travel);
    const desliza = NO_CLAVAR.has(anim);
    // el torbellino gira por las 8 direcciones a propósito: cada cuadro es otra vista, no hay pie quieto que medir
    if (anim === 'whirlwind') { filas.push({ pj: id, anim, tipo: 'gira', vistas: 0, antes: { max: 0, malos: 0, pasos: 0, peor: '-' } }); continue; }
    // en el sitio: las 8 direcciones (el pie no se tiene que mover en ninguna); las que avanzan: de lado, contra su avance
    const vistas: ViewName[] = avanza ? ['side'] : EIGHT_VIEWS;
    let antes = { max: 0, malos: 0, pasos: 0, peor: 'side' }, despues = { max: 0, malos: 0, perdidos: 0 };
    for (const v of vistas) {
      const t0 = performance.now();
      const c = v === 'side' ? lado : renderClip(f, CELL, anim, v, { props: true });
      seg += (performance.now() - t0) / 1000; cuadrosTot += c.frames.length;
      const poses = posesFor(f, CELL, anim, vistaPose(v));
      const n = c.frames.length;
      const avance = Array.from({ length: n }, (_, i) => (c.stride ? c.stride / n : c.travel ? (c.travel[(i + 1) % n] ?? 0) - c.travel[i] : 0));
      const js = (c.joints ?? []) as (Joints | undefined)[];
      const r = resumen(patinazos(poses, js, avance, c.loop));
      antes.pasos += r.pasos; antes.malos += r.malos;
      if (r.max > antes.max) antes = { ...antes, max: r.max, peor: v };
      if (avanza || desliza) continue;
      // el pie clavado del renderer (el interruptor `pieClavado` de renderClip, apagado por defecto)
      const c2 = renderClip(f, CELL, anim, v, { props: true, pieClavado: true });
      const r2 = resumen(patinazos(poses, (c2.joints ?? []) as (Joints | undefined)[], avance, c2.loop));
      despues.malos += r2.malos; despues.max = Math.max(despues.max, r2.max);
      const op = (fr: Raster[]) => fr.reduce((a, x) => { let k = 0; for (let i = 3; i < x.data.length; i += 4) if (x.data[i]) k++; return a + k; }, 0);
      despues.perdidos += op(c.frames) - op(c2.frames);
      if (r.max > 1) casos.push({ clave: `${id}_${anim}_${v}`, anim, antes: c.frames, despues: c2.frames, fps: c.fps, max: r.max });
    }
    filas.push({ pj: id, anim, tipo: avanza ? 'avanza' : desliza ? 'se desliza' : 'en el sitio', vistas: vistas.length, antes, ...(avanza || desliza ? {} : { despues }) });
  }
  console.log(`  ${id}: listo`);
}

// ---------- tablas ----------
const ok = (max: number) => (max <= 1 ? 'pasa' : 'patina');
const medidas = filas.filter((x) => x.tipo !== 'gira');
const hoy = [
  '# Piloto 0d: el pie de apoyo en las animaciones de hoy (premium chibi de GG Abyss)',
  '',
  'Generado por `npx tsx scripts/forja2-piloto-0d.ts`. Un pie cuenta como apoyado si la pose lo marca y además está a nivel del piso (a 1 px del tobillo más bajo de la animación). whirlwind no se mide: gira por las 8 direcciones a propósito. La familia con su clase (como en el kit), celda 48, las 21 animaciones del kit. Patinazo: entre dos cuadros seguidos con el mismo pie apoyado, cuánto se corre ese pie en la hoja de más o de menos respecto de lo que el juego mueve el sprite (0 en las acciones en el sitio, el avance del ciclo en caminar y correr). Tope: 1 px. Las acciones en el sitio se miden en las 8 direcciones (columna peor vista); las que avanzan, de lado.',
  '',
  '| personaje | animación | tipo | vistas | peor patinazo (px) | peor vista | pasos > 1 px | pasos medidos | |',
  '|---|---|---|---|---|---|---|---|---|',
  ...filas.map((x) => x.tipo === 'gira' ? `| ${x.pj} | ${x.anim} | gira | - | - | - | - | - | no se mide |` : `| ${x.pj} | ${x.anim} | ${x.tipo} | ${x.vistas} | ${x.antes.max} | ${x.antes.peor} | ${x.antes.malos} | ${x.antes.pasos} | ${ok(x.antes.max)} |`),
  '',
  `Patinan: ${medidas.filter((x) => x.antes.max > 1).length} de ${medidas.length}. Pasos con más de 1 px: ${medidas.reduce((a, x) => a + x.antes.malos, 0)} de ${medidas.reduce((a, x) => a + x.antes.pasos, 0)}.`,
  `Tiempo: ${(seg / cuadrosTot).toFixed(3)} s por cuadro dibujado (${cuadrosTot} cuadros).`,
  '',
];
const sitio = filas.filter((x) => x.despues);
const despues = [
  '# Piloto 0d: después del pie clavado',
  '',
  'Sale del renderer de hoy con el interruptor `pieClavado` de renderClip (apagado por defecto). Corre cada cuadro entero (pixeles enteros) para que el pie apoyado quede donde estaba en el cuadro anterior: no cambia ninguna pose, ningún tiempo ni qué cuadro es el impacto. Con los dos pies apoyados que se mueven distinto se corre al punto medio, así ningún paso queda peor. Se aplica a las acciones en el sitio, en las 8 direcciones. No se corrigen las que avanzan (caminar, correr: su avance por vista necesita la proyección de cada dirección), las que se deslizan a propósito (charge, die) ni el torbellino; quedan medidas en calidad_hoy.md. "pixeles perdidos": lo que al correr el cuadro quedó fuera de la celda.',
  '',
  '| personaje | animación | antes (px) | después (px) | pasos > 1 px antes | después | pixeles perdidos | |',
  '|---|---|---|---|---|---|---|---|',
  ...sitio.map((x) => `| ${x.pj} | ${x.anim} | ${x.antes.max} | ${x.despues!.max} | ${x.antes.malos} | ${x.despues!.malos} | ${x.despues!.perdidos} | ${ok(x.despues!.max)} |`),
  '',
  `En el sitio: patinaban ${sitio.filter((x) => x.antes.max > 1).length} de ${sitio.length}; después patinan ${sitio.filter((x) => x.despues!.max > 1).length}. Pasos con más de 1 px: ${sitio.reduce((a, x) => a + x.antes.malos, 0)} antes, ${sitio.reduce((a, x) => a + x.despues!.malos, 0)} después.`,
  '',
];
writeFileSync(join(OUT, 'calidad_hoy.md'), hoy.join('\n'));
writeFileSync(join(OUT, 'calidad_despues.md'), despues.join('\n'));
console.log(hoy.slice(-4).join('\n'));
console.log(despues.slice(-2).join('\n'));

// ---------- las que más patinaban: antes y después ----------
// las 4 animaciones distintas que más patinaban (el peor caso de cada una)
const peores = casos.sort((a, b) => b.max - a.max).filter((c, i, arr) => arr.findIndex((x) => x.anim === c.anim) === i).slice(0, 4);
for (const c of peores) {
  const K = 4, sep = 8, tit = 14, n = c.antes.length;
  const W = sep + n * (CELL * K + sep), H = sep + 2 * (tit + CELL * K + sep);
  const lam = createRaster(W, H);
  for (let i = 0; i < W * H; i++) lam.data.set([...FONDO, 255], i * 4);
  // una raya en el pivote para ver el pie contra un punto fijo
  ([['ANTES: ' + c.clave + ` (patina ${c.max} px) x4`, c.antes], ['DESPUES: pie clavado x4', c.despues]] as [string, Raster[]][]).forEach(([t, fr], r) => {
    const y = sep + r * (tit + CELL * K + sep);
    blit(lam, drawText(fuente, t), sep, y);
    fr.forEach((x, i) => {
      const X = sep + i * (CELL * K + sep);
      blit(lam, upscaleNearest(x, K), X, y + tit);
      for (let yy = 0; yy < CELL * K; yy++) lam.data.set([255, 210, 80, 255], ((y + tit + yy) * W + X + 24 * K) * 4);
    });
  });
  writeFileSync(join(OUT, `lamina_${c.clave}.png`), encodePng(lam));
  const gif = c.antes.map((a, i) => { const d = createRaster(CELL * 2 + 4, CELL); blit(d, a, 0, 0); blit(d, c.despues[i], CELL + 4, 0); for (let y = 0; y < CELL; y++) { d.data.set([255, 210, 80, 255], (y * d.w + 24) * 4); d.data.set([255, 210, 80, 255], (y * d.w + CELL + 4 + 24) * 4); } return d; });
  writeFileSync(join(OUT, 'gif', `${c.clave}_x3.gif`), encodeGif(gif, c.fps, { background: FONDO, scale: 3 }));
  console.log(`  lámina: ${c.clave} (${c.max} px)`);
}
