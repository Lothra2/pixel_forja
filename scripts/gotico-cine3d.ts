// Hornea los planos 3D de una cinemática (la intro o un cierre de acto; las escenas, por clave, en cine3d_registro.ts):
// traza cada escena en hilos a 1408x792 (la capa de paralaje), en dos pases (fondo opaco y primer plano con alfa), arma
// las tiras de fuego, traza lo que se mueve cuadro por cuadro en su recorte (campanas, sogas, monjes) y las variantes de
// luz (relámpago, ojos), y deja todo en src/engine/gotico/datos/cine3d/<clave>/<plano>/ (fondo.png, frente.png, fuego_N.png
// y movil_N.png en grilla, luz_N.png y meta.json). Con QA=<carpeta> escribe además una hoja por plano (4 instantes de la
// pantalla base 1280x720 y un recorte de iPhone acostado 844x390).
// Uso: npx tsx scripts/gotico-cine3d.ts <clave> [p1_abadesa,p2_campanas...]   (sin planos: todos los de la clave)
// Variables: SS (muestras por lado, 3), SSM (muestras por lado de lo que se mueve, 2), AO (rayos de oclusión, 2),
// HILOS (4), ESCALA (1; 0.5 para probar), SOLO_QA=1, DATOS=<carpeta> (hornea ahí en vez de datos/cine3d/<clave>/, para pruebas).
import { isMainThread, parentPort, workerData, Worker } from 'node:worker_threads';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ESC = +(process.env.ESCALA ?? 1), W = Math.round(1408 * ESC), H = Math.round(792 * ESC), SS = +(process.env.SS ?? 3), SSM = +(process.env.SSM ?? 2), AO = +(process.env.AO ?? 2);
const R3 = await import('../src/engine/gotico/cine3d_registro');
const C3D = await import('../src/engine/gotico/cine3d');
const CLAVE = isMainThread ? process.argv[2] : (workerData as { clave: string }).clave;
if (!CLAVE || !R3.PLANOS_CINE3D[CLAVE]) throw new Error(`uso: npx tsx scripts/gotico-cine3d.ts <clave> [planos]; claves: ${Object.keys(R3.PLANOS_CINE3D).join(', ')}`);
const plano = (id: string) => R3.plano3d(CLAVE, id);
type Trabajo = { clave: string; id: string; hilo: number; hilos: number } & ({ tipo: 'pase'; pase: 'fondo' | 'frente' | 'todo'; variante?: number } | { tipo: 'movil'; movil: number; caja: [number, number, number, number] });
const CANALES3 = ['base', 'fuego', 'aire', 'aireFuego'] as const, CANALES1 = ['trans', 'dist', 'cielo'] as const;

if (!isMainThread) {
  const job = workerData as Trabajo, pl = plano(job.id);
  const cajas = (c: InstanceType<typeof Object> & ReturnType<typeof C3D.capasVacias>) => ({ ...Object.fromEntries([...CANALES3, ...CANALES1].map((k) => [k, c[k]])), ...Object.fromEntries(Object.entries(c.marcas).map(([k, m]) => ['marca_' + k, m])) }) as Record<string, Float32Array>;
  if (job.tipo === 'pase') {
    const a = job.variante !== undefined ? pl.variantes![job.variante].armar!(W, H) : pl.armar(W, H), c = C3D.capasVacias(W, H, Object.keys(a.esc.marcas));
    for (let y = job.hilo * 8; y < H; y += job.hilos * 8) C3D.renderFilas(a.esc, a.atm, a.cam, c, y, Math.min(H, y + 8), { ss: process.env.SS ? SS : pl.ss ?? SS, ao: process.env.AO ? AO : pl.ao ?? AO, pase: job.pase });
    const bufs = cajas(c);
    parentPort!.postMessage({ bufs }, Object.values(bufs).map((b) => b.buffer as ArrayBuffer));
  } else {
    // lo que se mueve: los cuadros k = hilo, hilo + hilos... trazados en su recorte, devueltos del tamaño del recorte
    const mv = pl.moviles![job.movil], e = mv.escala, w = Math.round(W / e), h = Math.round(H / e), [x0, y0, x1, y1] = job.caja, tw = x1 - x0, th = y1 - y0;
    for (let k = job.hilo; k < mv.cuadros; k += job.hilos) {
      const a = mv.armar(w, h, k), c = C3D.capasVacias(w, h, Object.keys(a.esc.marcas));
      C3D.renderFilas(a.esc, a.atm, a.cam, c, y0, y1, { ss: SSM, ao: AO, pase: 'movil', x0, x1 });
      const bufs: Record<string, Float32Array> = {};
      for (const [k2, b] of Object.entries(cajas(c))) {
        const ch = b.length / (w * h), o = new Float32Array(tw * th * ch);
        for (let y = 0; y < th; y++) o.set(b.subarray(((y + y0) * w + x0) * ch, ((y + y0) * w + x1) * ch), y * tw * ch);
        bufs[k2] = o;
      }
      parentPort!.postMessage({ k, bufs }, Object.values(bufs).map((b) => b.buffer as ArrayBuffer));
    }
    parentPort!.postMessage({ fin: true });
  }
} else {
  const ids = process.argv[3]?.split(',') ?? R3.PLANOS_CINE3D[CLAVE].map((p) => p.id), HILOS = +(process.env.HILOS ?? 4), QA = process.env.QA;
  const { encodePng, decodePng } = await import('../src/engine/export/png');
  const { aRaster } = await import('../src/engine/gotico/cine');
  const T = await import('../src/engine/gotico/cine3d_toma');
  const yo = fileURLToPath(import.meta.url);
  const boot = `import { register } from 'tsx/esm/api'; register(); const { workerData } = await import('node:worker_threads'); await import(workerData.archivo);`;
  const hilo = (job: Trabajo, alMensaje: (m: { k?: number; bufs?: Record<string, Float32Array>; fin?: boolean }) => boolean) => new Promise<void>((ok, mal) => {
    const w = new Worker(boot, { eval: true, workerData: { archivo: 'file://' + yo, ...job }, env: process.env });
    w.on('message', (m) => { if (alMensaje(m)) { w.terminate(); ok(); } }); w.on('error', mal);
  });
  const desdeBufs = (w: number, h: number, marcas: string[], p: Record<string, Float32Array>) => {
    const c = C3D.capasVacias(w, h, marcas);
    for (const k of CANALES3) c[k].set(p[k]); for (const k of CANALES1) c[k].set(p[k]); for (const m of marcas) c.marcas[m].set(p['marca_' + m]);
    return c;
  };
  const trazar = async (id: string, pase: 'fondo' | 'frente' | 'todo', marcas: string[], variante?: number) => {
    const partes: Record<string, Float32Array>[] = [];
    await Promise.all(Array.from({ length: HILOS }, (_, h) => hilo({ clave: CLAVE, id, tipo: 'pase', pase, variante, hilo: h, hilos: HILOS }, (m) => { partes[h] = m.bufs!; return true; })));
    const c = C3D.capasVacias(W, H, marcas);
    partes.forEach((p, h) => {
      for (let y = h * 8; y < H; y += HILOS * 8) for (let yy = y; yy < Math.min(H, y + 8); yy++) {
        const a = yy * W, b = (yy + 1) * W;
        for (const k of CANALES3) c[k].set(p[k].subarray(a * 3, b * 3), a * 3);
        for (const k of CANALES1) c[k].set(p[k].subarray(a, b), a);
        for (const m of marcas) c.marcas[m].set(p['marca_' + m].subarray(a, b), a);
      }
    });
    return c;
  };
  const trazarMovil = async (id: string, j: number) => {
    const mv = plano(id).moviles![j], e = mv.escala, w = Math.round(W / e), h = Math.round(H / e), arm = mv.armar(w, h, 0), [cx0, cy0, cx1, cy1] = mv.caja(mv.armar(W, H, 0));
    const caja: [number, number, number, number] = [Math.max(0, Math.floor(cx0 / e)), Math.max(0, Math.floor(cy0 / e)), Math.min(w, Math.ceil(cx1 / e)), Math.min(h, Math.ceil(cy1 / e))];
    const marcas = Object.keys(arm.esc.marcas), cuadros: ReturnType<typeof C3D.capasVacias>[] = [];
    await Promise.all(Array.from({ length: HILOS }, (_, hh) => hilo({ clave: CLAVE, id, tipo: 'movil', movil: j, caja, hilo: hh, hilos: HILOS }, (m) => {
      if (m.fin) return true;
      cuadros[m.k!] = desdeBufs(caja[2] - caja[0], caja[3] - caja[1], marcas, m.bufs!); return false;
    })));
    return { caja, cuadros, arm };
  };
  for (const id of ids) {
    const base = process.env.DATOS ? new URL(`file://${process.env.DATOS.replace(/\/?$/, '/')}`) : T.carpetaCine3d(CLAVE), dir = new URL(`${id}/`, base).pathname, pl = plano(id);
    if (process.env.SOLO_QA !== '1') {
      const t0 = Date.now(), a = pl.armar(W, H), marcas = Object.keys(a.esc.marcas);
      const fondo = await trazar(id, 'fondo', marcas), t1 = Date.now();
      const frente = a.esc.frente.size ? await trazar(id, 'frente', marcas) : undefined, t2 = Date.now();
      const moviles = [];
      for (let j = 0; j < (pl.moviles?.length ?? 0); j++) moviles.push(await trazarMovil(id, j));
      const variantes = [];
      for (let j = 0; j < (pl.variantes?.length ?? 0); j++) {
        const v = pl.variantes![j];
        if (!v.armar) { variantes.push({ capas: frente ? T.combinar(fondo, frente) : fondo, arm: a }); continue; }
        const arm = v.armar(W, H); variantes.push({ capas: await trazar(id, 'todo', Object.keys(arm.esc.marcas), j), arm });
      }
      const t3 = Date.now();
      const h = T.hornear(pl, a, fondo, frente, { moviles, variantes }), t4 = Date.now();
      rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
      // el fondo es opaco: el último bit de cada canal en par (pesa un tercio menos y no se nota)
      writeFileSync(dir + 'fondo.png', encodePng({ ...h.fondo, data: h.fondo.data.map((v, i) => (i % 4 === 3 ? 255 : Math.min(254, Math.round(v / 2) * 2))) }));
      if (h.frente) writeFileSync(dir + 'frente.png', encodePng(h.frente));
      const meta = (lista: typeof h.fuegos, nombre: string) => lista.map((f, k) => { const g = T.grilla(f.cuadros); writeFileSync(dir + `${nombre}_${k + 1}.png`, encodePng(g.img)); return { x: f.x, y: f.y, w: f.cuadros[0].w, h: f.cuadros[0].h, escala: f.escala, cuadros: f.cuadros.length, columnas: g.columnas, fps: f.fps, ...(f.anim ? { anim: f.anim } : {}) }; });
      const fuegos = meta(h.fuegos, 'fuego'), mov = meta(h.moviles, 'movil'), luces = meta(h.luces, 'luz');
      writeFileSync(dir + 'meta.json', JSON.stringify({ ...(ESC !== 1 ? { escala: ESC } : {}), fondo: true, frente: !!h.frente, fuegos, ...(mov.length ? { moviles: mov } : {}), ...(luces.length ? { luces } : {}), ...(h.particulas ? { particulas: h.particulas } : {}), paralaje: h.paralaje }, null, 1));
      console.log(`${id}: fondo ${((t1 - t0) / 1000).toFixed(0)} s, frente ${((t2 - t1) / 1000).toFixed(0)} s, móviles y variantes ${((t3 - t2) / 1000).toFixed(0)} s, horneado ${((t4 - t3) / 1000).toFixed(0)} s (${W}x${H}, ${SS * SS} muestras, ${a.esc.piezas.length} piezas)`);
    }
    if (QA) {
      // hoja de control: 4 instantes de la pantalla base (sin la cámara del juego ni las partículas vivas) y el iPhone
      const h = T.leerHorneado(id, decodePng, base)!, e = h.meta.escala ?? 1, bx = Math.round(64 * e), by = Math.round(36 * e), bw = Math.round(1280 * e), bh = Math.round(720 * e);
      const hoja = { w: bw * 2, h: bh * 2 + Math.round(390 * e) + 10, data: new Uint8ClampedArray(bw * 2 * (bh * 2 + Math.round(390 * e) + 10) * 4) };
      const pegar = (r: { w: number; h: number; data: Uint8ClampedArray }, sx: number, sy: number, w: number, hh: number, ox: number, oy: number, kx = 1) => {
        for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) { const s = ((sy + Math.floor(y * kx)) * r.w + sx + Math.floor(x * kx)) * 4, d = ((oy + y) * hoja.w + ox + x) * 4; hoja.data.set(r.data.subarray(s, s + 4), d); hoja.data[d + 3] = 255; }
      };
      const ts = pl.qa ?? [0, 4 / 12, 8 / 12, 1];
      ts.forEach((t, i) => { const r = aRaster(T.componerHorneado(h, t), true); pegar(r, bx, by, bw, bh, (i % 2) * bw, Math.floor(i / 2) * bh); });
      const r = aRaster(T.componerHorneado(h, ts[ts.length - 1]), true), kx = 592 / 390;
      pegar(r, bx, by + Math.round(64 * e), Math.round(844 * e), Math.round(390 * e), Math.round(200 * e), bh * 2 + 10, kx);
      mkdirSync(QA, { recursive: true });
      writeFileSync(`${QA}/hoja_${id}.png`, encodePng(hoja as never));
    }
  }
}
