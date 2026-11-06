// Vista previa rápida de un plano 3D de la intro (para iterar la escena): traza la escena entera (con lo que se mueve en
// la pose de su armado) en hilos y la revela con el revelado del plano, sin hornear nada.
// Uso: npx tsx scripts/gotico-cine3d-previa.ts <plano> <salida.png>   Variables: ESCALA (0.5), SS (1), AO (1), HILOS (4).
import { isMainThread, parentPort, workerData, Worker } from 'node:worker_threads';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ESC = +(process.env.ESCALA ?? 0.5), W = Math.round(1408 * ESC), H = Math.round(792 * ESC), SS = +(process.env.SS ?? 1), AO = +(process.env.AO ?? 1);
const P3 = await import('../src/engine/gotico/cine3d_cuadros');
const C3D = await import('../src/engine/gotico/cine3d');
const plano0 = (id: string) => P3.PLANOS_INTRO.find((q) => q.id === id)!, VAR = process.env.VARIANTE;
const plano = (id: string) => { const p = plano0(id); return VAR !== undefined ? { ...p, armar: p.variantes![+VAR].armar! } : p; };
if (!isMainThread) {
  const { id, hilo, hilos } = workerData as { id: string; hilo: number; hilos: number }, a = plano(id).armar(W, H), c = C3D.capasVacias(W, H, Object.keys(a.esc.marcas));
  for (let y = hilo * 4; y < H; y += hilos * 4) C3D.renderFilas(a.esc, a.atm, a.cam, c, y, Math.min(H, y + 4), { ss: SS, ao: AO, pase: 'todo' });
  parentPort!.postMessage(c);
} else {
  const [id, salida] = process.argv.slice(2), HILOS = +(process.env.HILOS ?? 4), yo = fileURLToPath(import.meta.url);
  const { encodePng } = await import('../src/engine/export/png');
  const boot = `import { register } from 'tsx/esm/api'; register(); const { workerData } = await import('node:worker_threads'); await import(workerData.archivo);`;
  const t0 = Date.now(), pl = plano(id), a = pl.armar(W, H);
  const partes = await Promise.all(Array.from({ length: HILOS }, (_, hilo) => new Promise<ReturnType<typeof C3D.capasVacias>>((ok, mal) => { const w = new Worker(boot, { eval: true, workerData: { archivo: 'file://' + yo, id, hilo, hilos: HILOS } }); w.on('message', (m) => { ok(m); w.terminate(); }); w.on('error', mal); })));
  const c = C3D.capasVacias(W, H, Object.keys(a.esc.marcas));
  partes.forEach((p, hilo) => { for (let y = hilo * 4; y < H; y += HILOS * 4) for (let yy = y; yy < Math.min(H, y + 4); yy++) { const i0 = yy * W, i1 = (yy + 1) * W; for (const k of ['base', 'fuego', 'aire', 'aireFuego'] as const) c[k].set(p[k].subarray(i0 * 3, i1 * 3), i0 * 3); for (const k of ['trans', 'dist', 'cielo'] as const) c[k].set(p[k].subarray(i0, i1), i0); } });
  const o = { ...pl.revelado, t: 0, flick: +(process.env.FLICK ?? pl.flickBase ?? 1), plumas: process.env.SIN_HUMO ? [] : a.plumas, particulas: a.polvo };
  const img = C3D.revelar(C3D.luzCuadro(c, a.atm, a.cam, o), c, a.atm, a.cam, o);
  writeFileSync(salida, encodePng(img));
  console.log(`${id}: ${((Date.now() - t0) / 1000).toFixed(0)} s, ${a.esc.piezas.length} piezas`);
}
