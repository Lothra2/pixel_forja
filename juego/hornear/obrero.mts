// Obrero del horneado: pinta cuadros con el motor gótico y los devuelve recortados.
import { parentPort } from 'node:worker_threads';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '../../src/engine/gotico');
for (const f of readdirSync(join(raiz, 'catalogo'))) await import(join(raiz, 'catalogo', f));
const { pintarObjeto, objeto, herramientas } = await import(join(raiz, 'objeto.ts'));
const { pintarPiso } = await import(join(raiz, 'pisos.ts'));
const { pintarEscena, aPantalla } = await import(join(raiz, 'render.ts'));
const { personajeEscena, esqueleto } = await import(join(raiz, 'cuerpo.ts'));
const { pintarPoder } = await import(join(raiz, 'poderes.ts'));
const extra = await import('../src/motor/hoja.ts');
const { HEROES } = await import(join(raiz, 'catalogo/personajes.ts'));

type Cuadro = { w: number; h: number; ax: number; ay: number; data: Uint8ClampedArray; hoja?: number[] };

function recortar(img: { w: number; h: number; data: Uint8ClampedArray }, ax: number, ay: number): Cuadro {
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.data[(y * img.w + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { w: 1, h: 1, ax: 0, ay: 0, data: new Uint8ClampedArray(4) };
  const w = x1 - x0 + 1, h = y1 - y0 + 1, d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) d.set(img.data.subarray(((y0 + y) * img.w + x0) * 4, ((y0 + y) * img.w + x1 + 1) * 4), y * w * 4);
  return { w, h, ax: ax - x0, ay: ay - y0, data: d };
}

parentPort!.on('message', (job: any) => {
  try {
    const out: Cuadro[] = [];
    if (job.tipo === 'personaje') {
      for (let f = 0; f < job.cuadros; f++) {
        const r = pintarEscena({ ...personajeEscena(job.cuerpo, job.equipo, job.dir, job.acc, f), sinSombra: true });
        const c = recortar(r.img, r.ancla[0], r.ancla[1]);
        c.hoja = extra.hojaDe(esqueleto, aPantalla, job.cuerpo, job.equipo, job.dir, job.acc, f);
        out.push(c);
      }
    } else if (job.tipo === 'retrato') {
      // como retratoHeroe del motor, pero sin sombra: el juego le pone la suya con sus luces
      const h = HEROES.find((x: any) => x.id === job.id), k = 2.4;
      const LUZ: Record<string, string> = { berserker: '#ff6020', templario: '#ffe090', arcanista: '#70b0ff', cazadora: '#a0c0ff', nigromante: '#60e080', monje: '#ffb040', druida: '#80e060', alquimista: '#c060ff' };
      for (let f = 0; f < job.cuadros; f++) {
        const e = personajeEscena({ ...h.cuerpo, alto: (h.cuerpo.alto ?? 1) * k }, h.niveles[job.nivel], 'so', 'presentar', f);
        const r = pintarEscena({ ...e, resplandor: e.resplandor ?? { c: [20 * k, -8 * k, 6 * k], r: 70 * k, color: LUZ[h.id] ?? '#ffb060' }, ss: 2, sinSombra: true });
        out.push(recortar(r.img, r.ancla[0], r.ancla[1]));
      }
    } else if (job.tipo === 'objeto') {
      for (let f = 0; f < job.cuadros; f++) { const r = pintarObjeto(job.id, job.v, f, job.seed); out.push(recortar(r.img, r.ancla[0], r.ancla[1])); }
    } else if (job.tipo === 'bestia') {
      const d = objeto(job.id);
      for (let f = 0; f < job.cuadros; f++) { const a = d.armar(job.v, f, herramientas(1)); const esc = Array.isArray(a) ? { piezas: a } : a; const r = pintarEscena({ ...esc, sinSombra: true }); out.push(recortar(r.img, r.ancla[0], r.ancla[1])); }
    } else if (job.tipo === 'poder') {
      for (let f = 0; f < job.cuadros; f++) { const r = pintarPoder(job.id, job.dir, f); out.push(recortar(r.img, r.ancla[0], r.ancla[1])); }
    } else if (job.tipo === 'piso') {
      for (let f = 0; f < job.cuadros; f++) { const r = pintarPiso(job.id, job.v, f); out.push({ w: r.w, h: r.h, ax: 80, ay: 40, data: r.data }); }
    }
    parentPort!.postMessage({ id: job.id_job, out }, out.map((c) => c.data.buffer as ArrayBuffer));
  } catch (e) {
    parentPort!.postMessage({ id: job.id_job, error: String((e as Error).stack ?? e) });
  }
});
parentPort!.postMessage({ listo: true });
