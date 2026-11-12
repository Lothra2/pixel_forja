// Horneado del grupo 'sel' (la selección de personaje): cada clase y nivel en su presentación cinematográfica, al doble
// y con la luz de retrato (src/engine/gotico/sel.ts). Escribe los atlas PNG y agrega el grupo al manifiesto, con el
// mismo formato que los otros grupos del juego:
//   man.atlas['sel_<clase>_<n>'] = ['sel_<clase>_<n>.png', ancho, alto]
//   man.sel['<clase>/<nivel>'] = [[atlas, x, y, w, h, ax, ay], ...]   (un cuadro por elemento, 48)
//   man.selm = { cuadros, entrada, fps, escala, dir }
// Uso: npx tsx scripts/hornear-sel.mts --salida <carpeta> [--clases berserker,templario] [--niveles 0,2] [--ss 2]
// (no escribe nada del juego: la carpeta la elige quien llama; si ya hay un manifiesto.json ahí, le suma el grupo)
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { cpus } from 'node:os';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const MOTOR = new URL('../src/engine/gotico/', import.meta.url);

type Cuadro = { w: number; h: number; ax: number; ay: number; data: Uint8ClampedArray };
function recortar(img: { w: number; h: number; data: Uint8ClampedArray }, ax: number, ay: number): Cuadro {
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.data[(y * img.w + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { w: 1, h: 1, ax: 0, ay: 0, data: new Uint8ClampedArray(4) };
  const w = x1 - x0 + 1, h = y1 - y0 + 1, d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) d.set(img.data.subarray(((y0 + y) * img.w + x0) * 4, ((y0 + y) * img.w + x1 + 1) * 4), y * w * 4);
  return { w, h, ax: ax - x0, ay: ay - y0, data: d };
}

if (!isMainThread) {
  // obrero: pinta un cuadro por mensaje
  const { HEROES } = await import(new URL('catalogo/personajes.ts', MOTOR).href);
  const { pintarSeleccion } = await import(new URL('sel.ts', MOTOR).href);
  parentPort!.on('message', (j: { id: number; clase: string; nivel: number; f: number; ss?: number }) => {
    const h = HEROES.find((x: { id: string }) => x.id === j.clase);
    const r = pintarSeleccion(h.cuerpo, h.niveles[j.nivel], j.f, { ss: j.ss });
    const c = recortar(r.img, r.ancla[0], r.ancla[1]);
    parentPort!.postMessage({ id: j.id, c }, [c.data.buffer as ArrayBuffer]);
  });
  parentPort!.postMessage({ listo: true });
} else {
  const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
  const SALIDA = arg('--salida');
  if (!SALIDA) { console.error('falta --salida <carpeta>'); process.exit(1); }
  mkdirSync(SALIDA, { recursive: true });
  const { HEROES } = await import(new URL('catalogo/personajes.ts', MOTOR).href);
  const { SELECCION } = await import(new URL('sel.ts', MOTOR).href);
  const { encodePng } = await import(new URL('../export/png.ts', MOTOR).href);
  const clases: string[] = arg('--clases')?.split(',') ?? HEROES.map((h: { id: string }) => h.id);
  const niveles = (arg('--niveles') ?? '0,2').split(',').map(Number), ss = arg('--ss') ? +arg('--ss')! : undefined;
  const jobs: { id: number; clase: string; nivel: number; f: number; ss?: number }[] = [];
  for (const clase of clases) for (const nivel of niveles) for (let f = 0; f < SELECCION.cuadros; f++) jobs.push({ id: jobs.length, clase, nivel, f, ss });
  const res = new Map<number, Cuadro>();
  const t0 = Date.now();
  await new Promise<void>((fin) => {
    let sig = 0, vivos = 0, hechos = 0;
    const N = Math.max(1, Math.min(cpus().length, jobs.length));
    for (let i = 0; i < N; i++) {
      const w = new Worker(fileURLToPath(import.meta.url), { execArgv: ['--import', 'tsx'] });
      vivos++;
      const dar = () => { if (sig < jobs.length) w.postMessage(jobs[sig++]); else { w.terminate(); if (--vivos === 0) fin(); } };
      w.on('message', (m: { listo?: boolean; id: number; c: Cuadro }) => {
        if (m.listo) return dar();
        res.set(m.id, m.c); hechos++;
        if (hechos % 48 === 0) console.log(`${hechos}/${jobs.length} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
        dar();
      });
      w.on('error', (e) => { console.error('obrero', e); });
    }
  });
  // atlas por clase (como los demás grupos: uno o más de hasta 2048 de lado)
  const manPath = join(SALIDA, 'manifiesto.json');
  const man = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : { v: 1, atlas: {} };
  man.atlas ??= {}; man.sel = {};
  for (const k of Object.keys(man.atlas)) if (k.startsWith('sel_')) delete man.atlas[k];
  const LADO = 2048;
  for (const clase of clases) {
    const its = jobs.filter((j) => j.clase === clase).map((j) => ({ j, c: res.get(j.id)! })).sort((a, b) => b.c.h - a.c.h);
    let na = 0, buf = new Uint8ClampedArray(LADO * LADO * 4), x = 0, y = 0, filaH = 0, usadoW = 0, usadoH = 0, nombre = `sel_${clase}_0`;
    const cerrar = () => {
      const w = Math.max(1, usadoW), h = Math.max(1, usadoH), rec = new Uint8ClampedArray(w * h * 4);
      for (let yy = 0; yy < h; yy++) rec.set(buf.subarray(yy * LADO * 4, yy * LADO * 4 + w * 4), yy * w * 4);
      writeFileSync(join(SALIDA, nombre + '.png'), encodePng({ w, h, data: rec }));
      man.atlas[nombre] = [nombre + '.png', w, h];
      console.log('atlas', nombre, w, h);
    };
    for (const { j, c } of its) {
      if (x + c.w + 1 > LADO) { x = 0; y += filaH + 1; filaH = 0; }
      if (y + c.h + 1 > LADO) { cerrar(); na++; nombre = `sel_${clase}_${na}`; buf = new Uint8ClampedArray(LADO * LADO * 4); x = 0; y = 0; filaH = 0; usadoW = 0; usadoH = 0; }
      for (let yy = 0; yy < c.h; yy++) buf.set(c.data.subarray(yy * c.w * 4, (yy + 1) * c.w * 4), ((y + yy) * LADO + x) * 4);
      ((man.sel[`${clase}/${j.nivel}`] ??= [])[j.f] = [nombre, x, y, c.w, c.h, c.ax, c.ay]);
      x += c.w + 1; filaH = Math.max(filaH, c.h); usadoW = Math.max(usadoW, x); usadoH = Math.max(usadoH, y + c.h + 1);
    }
    cerrar();
  }
  man.selm = SELECCION;
  writeFileSync(manPath, JSON.stringify(man));
  console.log('listo en', ((Date.now() - t0) / 1000).toFixed(0), 's');
}
