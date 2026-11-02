// Horneado de assets del juego: pinta con el motor gótico (en todos los núcleos) héroes, monstruos, objetos y pisos,
// los recorta, los empaca en atlas PNG y escribe el manifiesto. Uso: npx tsx juego/hornear/hornear.mts [GRUPOS=h,m,o,p]
import { Worker } from 'node:worker_threads';
import { cpus } from 'node:os';
import { readdirSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '../../src/engine/gotico');
for (const f of readdirSync(join(raiz, 'catalogo'))) await import(join(raiz, 'catalogo', f));
const { REGISTRO, huellaDe } = await import(join(raiz, 'objeto.ts'));
const { PISOS } = await import(join(raiz, 'pisos.ts'));
const { fuenteDe } = await import(join(raiz, 'mapa.ts'));
const { HEROES, MONSTRUOS } = await import(join(raiz, 'catalogo/personajes.ts'));
const { CUADROS, DIRS } = await import(join(raiz, 'figura.ts'));
const extras = await import('../src/datos/hornear_extra.ts');
const { NPCS } = await import('../src/datos/npcs.ts');

const SALIDA = join(aqui, '../public/assets');
mkdirSync(SALIDA, { recursive: true });
const GRUPOS = (process.env.GRUPOS ?? 'h,m,n,b,w,o,p').split(',');
const { PODERES, DIRS_PODER } = await import(join(raiz, 'poderes.ts'));
const SOLO = process.env.SOLO?.split(',');

interface Job { id_job: number; grupo: string; clave: string; tipo: string; [k: string]: any }
const jobs: Job[] = [];
let nid = 0;
const ACCS = ['quieto', 'caminar', 'correr', 'atacar', 'lanzar', 'herido', 'morir'];
if (GRUPOS.includes('h')) for (const h of HEROES) {
  if (SOLO && !SOLO.includes(h.id)) continue;
  for (const acc of ACCS) for (const dir of DIRS) jobs.push({ id_job: nid++, grupo: 'h', clave: `${h.id}/${acc}/${dir}`, tipo: 'personaje', cuerpo: h.cuerpo, equipo: extras.equipoInicial(h.id, h.niveles[0]), dir, acc, cuadros: CUADROS[acc] });
}
if (GRUPOS.includes('m')) for (const m of [...MONSTRUOS, ...extras.MONSTRUOS_EXTRA]) {
  if (SOLO && !SOLO.includes(m.id)) continue;
  for (const acc of ACCS) {
    if (acc === 'lanzar' && !m.magia) continue;
    if (acc === 'correr') continue;
    for (const dir of DIRS) jobs.push({ id_job: nid++, grupo: 'm', clave: `${m.id}/${acc}/${dir}`, tipo: 'personaje', cuerpo: m.cuerpo, equipo: m.equipo, dir, acc, cuadros: CUADROS[acc] });
  }
}
if (GRUPOS.includes('n')) for (const n of Object.values(NPCS) as any[]) {
  if (SOLO && !SOLO.includes(n.id)) continue;
  for (const dir of DIRS) jobs.push({ id_job: nid++, grupo: 'n', clave: `${n.id}/quieto/${dir}`, tipo: 'personaje', cuerpo: n.cuerpo, equipo: n.equipo, dir, acc: 'quieto', cuadros: CUADROS.quieto });
}
const { BESTIAS } = await import(join(raiz, 'catalogo/bestias.ts'));
if (GRUPOS.includes('b')) for (const bs of BESTIAS as any[]) {
  if (SOLO && !SOLO.includes(bs.id)) continue;
  for (const acc of ['quieto', 'caminar', 'atacar', 'morir', 'especial']) {
    const id = `mon_${bs.id}_${acc}`; const d = REGISTRO.find((x: any) => x.id === id); if (!d) continue;
    for (const dir of DIRS) jobs.push({ id_job: nid++, grupo: 'b', clave: `${bs.id}/${acc}/${dir}`, tipo: 'bestia', id, v: dir, seed: 1, cuadros: d.cuadros ?? 1 });
  }
}
// retratos grandes de cada clase en su pose de presentación (selección e intro)
if (GRUPOS.includes('r')) for (const h of HEROES) {
  if (SOLO && !SOLO.includes(h.id)) continue;
  for (const nivel of [0, 2]) jobs.push({ id_job: nid++, grupo: 'r', clave: `${h.id}/${nivel}`, tipo: 'retrato', id: h.id, nivel, cuadros: CUADROS.presentar ?? 8 });
}
const objMeta: Record<string, any> = {};
const poderMeta: Record<string, any> = {};
if (GRUPOS.includes('w')) for (const p of PODERES as any[]) {
  if (SOLO && !SOLO.includes(p.id)) continue;
  poderMeta[p.id] = { t: p.t, bucle: p.bucle ? 1 : 0, dir: p.direccional ? 1 : 0, tipo: p.tipo, elem: p.elemento };
  for (const dir of p.direccional ? DIRS_PODER : ['s']) jobs.push({ id_job: nid++, grupo: 'w', clave: `${p.id}/${dir}`, tipo: 'poder', id: p.id, dir, cuadros: p.cuadros });
}
if (GRUPOS.includes('o')) for (const d of REGISTRO) {
  if (d.tema === 'personajes' || d.tema === 'monstruos') continue;
  if (SOLO && !SOLO.includes(d.id)) continue;
  for (const v of d.variantes) {
    const k = `${d.id}|${v}`;
    let luz = null; try { luz = fuenteDe(d.id, v); } catch { /* sin luz */ }
    objMeta[k] = { t: d.t ?? 3, hu: huellaDe(d, v), b: d.bloquea ? 1 : 0, tema: d.tema, luz: luz ? [Math.round(luz.r), luz.color, Math.round(luz.z)] : 0, plano: d.plano ? 1 : 0 };
    jobs.push({ id_job: nid++, grupo: 'o', clave: k, tipo: 'objeto', id: d.id, v, seed: 1, cuadros: d.cuadros ?? 1 });
  }
}
if (GRUPOS.includes('p')) for (const p of PISOS) for (let v = 0; v < p.variantes; v++) jobs.push({ id_job: nid++, grupo: 'p', clave: `${p.id}|${v}`, tipo: 'piso', id: p.id, v, cuadros: p.cuadros ?? 1 });

console.log('trabajos', jobs.length);
const resultados = new Map<number, any[]>();
const N = Math.max(1, cpus().length);
const t0 = Date.now();
await new Promise<void>((fin) => {
  let siguiente = 0, hechos = 0, vivos = 0;
  if (!jobs.length) return fin();
  for (let i = 0; i < N; i++) {
    const w = new Worker(join(aqui, 'obrero.mts'), { execArgv: ['--import', 'tsx'] });
    vivos++;
    const dar = () => { if (siguiente < jobs.length) w.postMessage(jobs[siguiente++]); else { w.terminate(); if (--vivos === 0) fin(); } };
    w.on('message', (m: any) => {
      if (m.listo) return dar();
      if (m.error) { console.error('ERROR', jobs[m.id].clave, m.error); resultados.set(m.id, []); }
      else resultados.set(m.id, m.out);
      hechos++;
      if (hechos % 50 === 0 || hechos === jobs.length) console.log(`${hechos}/${jobs.length} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      dar();
    });
    w.on('error', (e) => { console.error('obrero', e); });
  }
});

// ------------------------------------------------------------------ empacar en atlas
const crcT = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c; }
const crc = (b: Buffer) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
function png(w: number, h: number, rgba: Uint8Array): Buffer {
  // paleta si alcanza (<=256 colores), si no RGBA
  const mapa = new Map<number, number>(); const pal: number[] = [];
  const idx = Buffer.alloc((w + 1) * h);
  let okPal = true;
  for (let y = 0; y < h && okPal; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4, a = rgba[o + 3];
    const key = a === 0 ? 0 : ((rgba[o] << 24) | (rgba[o + 1] << 16) | (rgba[o + 2] << 8) | a) >>> 0;
    let k = mapa.get(key);
    if (k === undefined) { if (pal.length >= 256) { okPal = false; break; } k = pal.length; mapa.set(key, k); pal.push(key); }
    idx[y * (w + 1) + 1 + x] = k;
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8;
  const partes = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])];
  if (okPal) {
    ihdr[9] = 3;
    const plte = Buffer.alloc(pal.length * 3), trns = Buffer.alloc(pal.length);
    pal.forEach((k, i) => { plte[i * 3] = k === 0 ? 0 : k >>> 24; plte[i * 3 + 1] = (k >>> 16) & 255; plte[i * 3 + 2] = (k >>> 8) & 255; trns[i] = k === 0 ? 0 : k & 255; });
    partes.push(chunk('IHDR', ihdr), chunk('PLTE', plte), chunk('tRNS', trns), chunk('IDAT', deflateSync(idx, { level: 9 })));
  } else {
    ihdr[9] = 6;
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 1; for (let x = 0; x < w * 4; x++) raw[y * (w * 4 + 1) + 1 + x] = (rgba[y * w * 4 + x] - (x >= 4 ? rgba[y * w * 4 + x - 4] : 0)) & 255; }
    partes.push(chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })));
  }
  partes.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(partes);
}

const manPath = join(SALIDA, 'manifiesto.json');
const man: any = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : { v: 1, atlas: {}, h: {}, m: {}, o: {}, p: {}, om: {} };
const LADO = 2048;
for (const g of GRUPOS) {
  const js = jobs.filter((j) => j.grupo === g);
  if (!js.length) continue;
  // borrar lo viejo del grupo si se hornea completo
  if (!SOLO) {
    if (g === 'm') { const ids = new Set(js.map((j) => j.clave.split('/')[0])); for (const k of Object.keys(man.m ?? {})) if (ids.has(k.split('/')[0])) delete man.m[k]; }
    else if (g !== 'n' && g !== 'b') man[g] = {};
    for (const k of Object.keys(man.atlas)) if (k.startsWith(g + '_')) delete man.atlas[k]; }
  const items: { j: Job; f: number; c: any }[] = [];
  for (const j of js) (resultados.get(j.id_job) ?? []).forEach((c, f) => items.push({ j, f, c }));
  // un juego de atlas por entidad (clase, monstruo, tema) para bajar solo lo que hace falta
  const sub = (j: Job) => g === 'w' ? 'w' : g === 'b' ? j.clave.split('/')[0] : g === 'o' ? (objMeta[j.clave]?.tema ?? 'x') : g === 'p' ? 'p' : j.clave.split('/')[0];
  const porSub = new Map<string, typeof items>();
  for (const it of items) { const k = sub(it.j); if (!porSub.has(k)) porSub.set(k, []); porSub.get(k)!.push(it); }
  const listas: Record<string, any[]> = {};
  for (const [sk, its] of porSub) {
    its.sort((a, b) => b.c.h - a.c.h);
    const prefijo = (SOLO ? `${g}${Date.now().toString(36)}_` : `${g}_`) + sk + '_';
    let atlas: { nombre: string; buf: Uint8Array; x: number; y: number; filaH: number; usadoH: number; usadoW: number } | null = null;
    let na = 0;
    const cerrar = () => {
      if (!atlas) return;
      const h = Math.max(1, atlas.usadoH), w = Math.max(1, atlas.usadoW);
      const recorte = new Uint8Array(w * h * 4);
      for (let y = 0; y < h; y++) recorte.set(atlas.buf.subarray(y * LADO * 4, y * LADO * 4 + w * 4), y * w * 4);
      const buf = png(w, h, recorte);
      writeFileSync(join(SALIDA, atlas.nombre + '.png'), buf);
      man.atlas[atlas.nombre] = [atlas.nombre + '.png', w, h];
      console.log('atlas', atlas.nombre, w, h, (buf.length / 1024).toFixed(0) + 'KB');
      atlas = null;
    };
    const nuevo = () => { cerrar(); atlas = { nombre: `${prefijo}${na++}`, buf: new Uint8Array(LADO * LADO * 4), x: 0, y: 0, filaH: 0, usadoH: 0, usadoW: 0 }; };
    nuevo();
    for (const it of its) {
      const c = it.c;
      let a = atlas!;
      if (a.x + c.w + 1 > LADO) { a.x = 0; a.y += a.filaH + 1; a.filaH = 0; }
      if (a.y + c.h + 1 > LADO) { nuevo(); a = atlas!; }
      for (let y = 0; y < c.h; y++) a.buf.set(c.data.subarray(y * c.w * 4, (y + 1) * c.w * 4), ((a.y + y) * LADO + a.x) * 4);
      const e: any[] = [a.nombre, a.x, a.y, c.w, c.h, c.ax, c.ay];
      if (c.hoja) e.push(...c.hoja);
      (listas[it.j.clave] ??= [])[it.f] = e;
      a.x += c.w + 1; a.filaH = Math.max(a.filaH, c.h); a.usadoH = Math.max(a.usadoH, a.y + c.h + 1); a.usadoW = Math.max(a.usadoW, a.x);
    }
    cerrar();
  }
  for (const [k, fs] of Object.entries(listas)) {
    if (g === 'o') man.o[k] = { f: fs, ...objMeta[k] };
    else (man[g === 'n' || g === 'b' ? 'm' : g] ??= {})[k] = fs;
  }
}
// alto de cada cuerpo: el juego lo usa con la zancada del motor para que los pies no patinen
man.za = { ...(man.za ?? {}) };
for (const h of HEROES) man.za[h.id] = h.cuerpo.alto ?? 1;
for (const m of [...MONSTRUOS, ...extras.MONSTRUOS_EXTRA]) man.za[m.id] = m.cuerpo?.alto ?? 1;
if (GRUPOS.includes('w')) man.wm = { ...(man.wm ?? {}), ...poderMeta };
writeFileSync(manPath, JSON.stringify(man));
console.log('listo en', ((Date.now() - t0) / 1000).toFixed(0), 's');
