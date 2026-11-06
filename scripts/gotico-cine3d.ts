// Hornea los planos 3D de la intro (cine3d_cuadros.ts): traza cada escena en hilos a 1408x792 (la capa de paralaje),
// en dos pases (fondo opaco y primer plano con alfa), arma las tiras de fuego y deja todo en
// src/engine/gotico/datos/intro3d/<plano>/ (fondo.png, frente.png, fuego_N.png, meta.json). Con QA=<carpeta> escribe
// además una hoja por plano (4 cuadros de la pantalla base 1280x720 y un recorte de iPhone acostado 844x390).
// Uso: npx tsx scripts/gotico-cine3d.ts [i01_valle,i06_impacto...]
// Variables: SS (muestras por lado, 3), AO (rayos de oclusión, 2), HILOS (4), ESCALA (1; 0.5 para probar), SOLO_QA=1.
import { isMainThread, parentPort, workerData, Worker } from 'node:worker_threads';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ESC = +(process.env.ESCALA ?? 1), W = Math.round(1408 * ESC), H = Math.round(792 * ESC), SS = +(process.env.SS ?? 3), AO = +(process.env.AO ?? 2);
const P3 = await import('../src/engine/gotico/cine3d_cuadros');
const C3D = await import('../src/engine/gotico/cine3d');
const plano = (id: string) => { const p = P3.PLANOS_VALLE.find((q) => q.id === id); if (!p) throw new Error(`no hay plano 3D ${id}`); return p; };

if (!isMainThread) {
  const { id, pase, hilo, hilos } = workerData as { id: string; pase: 'fondo' | 'frente'; hilo: number; hilos: number };
  const a = plano(id).armar(W, H), c = C3D.capasVacias(W, H, Object.keys(a.esc.marcas));
  for (let y = hilo * 8; y < H; y += hilos * 8) C3D.renderFilas(a.esc, a.atm, a.cam, c, y, Math.min(H, y + 8), { ss: SS, ao: AO, pase });
  const bufs = { base: c.base, fuego: c.fuego, trans: c.trans, aire: c.aire, aireFuego: c.aireFuego, dist: c.dist, cielo: c.cielo, ...Object.fromEntries(Object.entries(c.marcas).map(([k, m]) => ['marca_' + k, m])) };
  parentPort!.postMessage({ bufs }, Object.values(bufs).map((b) => b.buffer as ArrayBuffer));
} else {
  const ids = process.argv[2]?.split(',') ?? P3.PLANOS_VALLE.map((p) => p.id), HILOS = +(process.env.HILOS ?? 4), QA = process.env.QA;
  const { encodePng, decodePng } = await import('../src/engine/export/png');
  const { aRaster } = await import('../src/engine/gotico/cine');
  const T = await import('../src/engine/gotico/cine3d_toma');
  const yo = fileURLToPath(import.meta.url);
  const boot = `import { register } from 'tsx/esm/api'; register(); const { workerData } = await import('node:worker_threads'); await import(workerData.archivo);`;
  const trazar = async (id: string, pase: 'fondo' | 'frente', marcas: string[]) => {
    const partes = await Promise.all(Array.from({ length: HILOS }, (_, hilo) => new Promise<Record<string, Float32Array>>((ok, mal) => {
      const w = new Worker(boot, { eval: true, workerData: { archivo: 'file://' + yo, id, pase, hilo, hilos: HILOS }, env: process.env });
      w.on('message', (m) => { ok(m.bufs); w.terminate(); }); w.on('error', mal);
    })));
    const c = C3D.capasVacias(W, H, marcas);
    partes.forEach((p, hilo) => {
      for (let y = hilo * 8; y < H; y += HILOS * 8) for (let yy = y; yy < Math.min(H, y + 8); yy++) {
        const a = yy * W, b = (yy + 1) * W;
        for (const k of ['base', 'fuego', 'aire', 'aireFuego'] as const) c[k].set(p[k].subarray(a * 3, b * 3), a * 3);
        for (const k of ['trans', 'dist', 'cielo'] as const) c[k].set(p[k].subarray(a, b), a);
        for (const m of marcas) c.marcas[m].set(p['marca_' + m].subarray(a, b), a);
      }
    });
    return c;
  };
  for (const id of ids) {
    const dir = new URL(`${id}/`, T.CARPETA_HORNEADO).pathname;
    if (process.env.SOLO_QA !== '1') {
      const t0 = Date.now(), pl = plano(id), a = pl.armar(W, H), marcas = Object.keys(a.esc.marcas);
      const fondo = await trazar(id, 'fondo', marcas), t1 = Date.now();
      const frente = a.esc.frente.size ? await trazar(id, 'frente', marcas) : undefined, t2 = Date.now();
      const h = T.hornear(pl, a, fondo, frente), t3 = Date.now();
      rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
      // el fondo es opaco: el último bit de cada canal en par (pesa un tercio menos y no se nota)
      writeFileSync(dir + 'fondo.png', encodePng({ ...h.fondo, data: h.fondo.data.map((v, i) => (i % 4 === 3 ? 255 : Math.min(254, Math.round(v / 2) * 2))) }));
      if (h.frente) writeFileSync(dir + 'frente.png', encodePng(h.frente));
      const fuegos = h.fuegos.map((f, k) => { const g = T.grilla(f.cuadros); writeFileSync(dir + `fuego_${k + 1}.png`, encodePng(g.img)); return { x: f.x, y: f.y, w: f.cuadros[0].w, h: f.cuadros[0].h, escala: f.escala, cuadros: f.cuadros.length, columnas: g.columnas, fps: f.fps }; });
      writeFileSync(dir + 'meta.json', JSON.stringify({ ...(ESC !== 1 ? { escala: ESC } : {}), fondo: true, frente: !!h.frente, fuegos, ...(h.particulas ? { particulas: h.particulas } : {}), paralaje: h.paralaje }, null, 1));
      console.log(`${id}: fondo ${((t1 - t0) / 1000).toFixed(0)} s, frente ${((t2 - t1) / 1000).toFixed(0)} s, horneado ${((t3 - t2) / 1000).toFixed(0)} s (${W}x${H}, ${SS * SS} muestras, ${a.esc.piezas.length} piezas)`);
    }
    if (QA) {
      // hoja de control: 4 cuadros de la pantalla base (sin la cámara del juego ni las partículas vivas) y el iPhone
      const h = T.leerHorneado(id, decodePng)!, e = h.meta.escala ?? 1, bx = Math.round(64 * e), by = Math.round(36 * e), bw = Math.round(1280 * e), bh = Math.round(720 * e);
      const hoja = { w: bw * 2, h: bh * 2 + Math.round(390 * e) + 10, data: new Uint8ClampedArray(bw * 2 * (bh * 2 + Math.round(390 * e) + 10) * 4) };
      const pegar = (r: { w: number; h: number; data: Uint8ClampedArray }, sx: number, sy: number, w: number, hh: number, ox: number, oy: number, kx = 1) => {
        for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) { const s = ((sy + Math.floor(y * kx)) * r.w + sx + Math.floor(x * kx)) * 4, d = ((oy + y) * hoja.w + ox + x) * 4; hoja.data.set(r.data.subarray(s, s + 4), d); hoja.data[d + 3] = 255; }
      };
      [0, 4, 8, 12].forEach((k, i) => { const r = aRaster(T.componerHorneado(h, k), true); pegar(r, bx, by, bw, bh, (i % 2) * bw, Math.floor(i / 2) * bh); });
      const r = aRaster(T.componerHorneado(h, 6), true), kx = 592 / 390;
      pegar(r, bx, by + Math.round(64 * e), Math.round(844 * e), Math.round(390 * e), Math.round(200 * e), bh * 2 + 10, kx);
      mkdirSync(QA, { recursive: true });
      writeFileSync(`${QA}/hoja_${id}.png`, encodePng(hoja as never));
    }
  }
}
