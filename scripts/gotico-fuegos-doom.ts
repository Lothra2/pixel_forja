// Fuego de Doom en el mundo: hojas de control a escala de juego y costo en node.
// Uso: npx tsx scripts/gotico-fuegos-doom.ts <modo> [salida]
//   hoja <png>     comparación: el fuego de hoy (llama horneada y la mancha de partículas del juego) contra el fuego de
//                  Doom con celdas de 2, 3 y 4 px, sobre piso oscuro y con un héroe al lado; fuego frío y la fachada.
//   medir [carpeta] mide la boca de cada objeto con fuego (contra su gemelo sin llama) y reescribe
//                  src/engine/gotico/datos/fuegos_doom_medidas.ts; deja las máscaras de los vitrales en
//                  <carpeta>/fuegos_doom/<id>_<variante>.png (por omisión out/). Tarda unos minutos (la catedral).
//   json           reescribe src/engine/gotico/datos/fuegos_doom.json desde fuegos_doom.ts.
//   costo          mide en node cuánto cuesta un paso y un pintado por fuego (para el tope de fuegos vivos).
import { writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Raster } from '../src/engine/core/raster';
import { encodePng } from '../src/engine/export/png';
import * as D from '../src/engine/gotico/fuego_doom';
import * as M from '../src/engine/gotico/fuegos_mundo';
import { pintarObjeto, objeto } from '../src/engine/gotico/objeto';
import { pintarEscena } from '../src/engine/gotico/render';
import { pintarPiso } from '../src/engine/gotico/pisos';
import { personajeEscena } from '../src/engine/gotico/cuerpo';
import { HEROES } from '../src/engine/gotico/catalogo/personajes';
import { fuenteDe } from '../src/engine/gotico/mapa';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '../src/engine/gotico');
for (const f of readdirSync(join(raiz, 'catalogo'))) await import(join(raiz, 'catalogo', f));

// renders lentos (la catedral tarda ~20 s por pieza): CACHE=<carpeta> los guarda y los vuelve a leer
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { decodePng } from '../src/engine/export/png';
import type { Render } from '../src/engine/gotico/render';
function cacheado(clave: string, fn: () => Render): Render {
  const dir = process.env.CACHE; if (!dir) return fn();
  mkdirSync(dir, { recursive: true });
  const f = join(dir, clave.replace(/[^a-z0-9_]/gi, '_'));
  if (existsSync(f + '.png')) return { img: decodePng(readFileSync(f + '.png')), ancla: JSON.parse(readFileSync(f + '.json', 'utf8')) };
  const r = fn(); writeFileSync(f + '.png', encodePng(r.img)); writeFileSync(f + '.json', JSON.stringify(r.ancla)); return r;
}

const modo = process.argv[2] ?? 'hoja';
const salida = process.argv[3] ?? 'out/fuegos_doom_hoja.png';

// ------------------------------------------------------------------ utilidades de la hoja
const heroe = (() => { const h = HEROES[0]; return pintarEscena(personajeEscena(h.cuerpo, h.niveles[1], 's', 'quieto', 0)); })();
const piso = (bx: number, by: number) => pintarPiso('baldosa_catedral', (bx * 3 + by * 7) & 3, 0);
function texto(R: Raster, x: number, y: number, s: string, c: [number, number, number] = [200, 180, 150]) {
  // letras de 3x5 (solo para rotular la hoja)
  const F: Record<string, string> = {
    a: '010101111101101', b: '110101110101110', c: '011100100100011', d: '110101101101110', e: '111100110100111', f: '111100110100100', g: '011100101101011',
    h: '101101111101101', i: '111010010010111', j: '001001001101010', k: '101101110101101', l: '100100100100111', m: '101111111101101', n: '110101101101101',
    o: '010101101101010', p: '110101110100100', q: '010101101110011', r: '110101110101101', s: '011100010001110', t: '111010010010010', u: '101101101101111',
    v: '101101101101010', w: '101101111111101', x: '101101010101101', y: '101101010010010', z: '111001010100111', '0': '111101101101111', '1': '010110010010111',
    '2': '110001010100111', '3': '110001010001110', '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010',
    '8': '111101111101111', '9': '111101111001110', ' ': '000000000000000', '+': '000010111010000', '-': '000000111000000', '.': '000000000000010', '/': '001001010100100',
    '(': '010100100100010', ')': '010001001001010', ':': '000010000010000',
  };
  let cx = x;
  for (const ch of s.toLowerCase()) {
    const g = F[ch] ?? F[' '];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '1') {
      const X = cx + i, Y = y + j; if (X < 0 || Y < 0 || X >= R.w || Y >= R.h) continue;
      const d = (Y * R.w + X) * 4; R.data[d] = c[0]; R.data[d + 1] = c[1]; R.data[d + 2] = c[2];
    }
    cx += 4;
  }
}

// ------------------------------------------------------------------ la mancha de partículas que pinta hoy el juego
// (render/fuego.ts: fuegoMundo + dibujarFuegosMundo), con azar con semilla: 3*tam lenguas por cuadro a 60 fps, que suben
// meciéndose, manchas radiales sumadas de amarillo a rojo oscuro y humo cuando se apagan.
function manchaJuego(R: Raster, x: number, y: number, tam: number, seg: number, sem: number) {
  const r = D.azar(sem);
  type L = { x: number; y: number; vx: number; vy: number; t: number; d: number; s: number; brasa: boolean; f: number };
  const ls: L[] = [];
  const dt = 1 / 60;
  for (let k = 0; k < seg * 60; k++) {
    const t = k * dt;
    for (let i = ls.length - 1; i >= 0; i--) {
      const l = ls[i]; l.t += dt; if (l.t > l.d) { ls.splice(i, 1); continue; }
      l.vx += Math.sin(t * 8 + l.f + l.y * 0.07) * 90 * dt; l.vx *= 0.93; l.vy -= (l.brasa ? 8 : 35) * dt; l.x += l.vx * dt; l.y += l.vy * dt;
    }
    const n = Math.max(1, Math.round(3 * tam));
    for (let i = 0; i < n; i++) { const brasa = r() < 0.1; ls.push({ x: x + (r() - 0.5) * 18 * tam, y: y - 4 * tam + (r() - 0.5) * 4, vx: (r() - 0.5) * 10, vy: -(brasa ? 50 + r() * 50 : 22 + r() * 26) * Math.sqrt(tam), t: 0, d: brasa ? 1 + r() : 0.4 + r() * 0.35, s: brasa ? 1.4 : (3.5 + r() * 4) * tam, brasa, f: r() * 10 }); }
  }
  const disco = (cx: number, cy: number, rad: number, c: number[], a: number, sumar: boolean) => {
    for (let j = Math.floor(cy - rad); j <= cy + rad; j++) for (let i = Math.floor(cx - rad); i <= cx + rad; i++) {
      if (i < 0 || j < 0 || i >= R.w || j >= R.h) continue;
      const q = Math.hypot(i + 0.5 - cx, j + 0.5 - cy) / rad; if (q >= 1) continue;
      const k = a * (1 - q), d = (j * R.w + i) * 4;
      for (let ch = 0; ch < 3; ch++) R.data[d + ch] = sumar ? R.data[d + ch] + c[ch] * k : R.data[d + ch] + (c[ch] - R.data[d + ch]) * k;
    }
  };
  for (const l of ls) { if (l.brasa) continue; const u = l.t / l.d; if (u < 0.6) continue; disco(l.x, l.y, l.s * (1.3 + u), [26, 18, 16], (1 - u) * 0.5 * 0.8, false); }
  for (const l of ls) {
    const u = l.t / l.d;
    if (l.brasa) { disco(l.x, l.y, 1.2, u < 0.5 ? [255, 208, 112] : [255, 90, 32], (1 - u) * 0.8, true); continue; }
    if (u > 0.8) continue;
    const tono = Math.min(7, Math.floor((u / 0.8) * 8)) / 7;
    const col = tono < 0.33 ? [255, 230 - tono * 300, 120 - tono * 330] : tono < 0.66 ? [255, 150 - (tono - 0.33) * 280, 30] : [200 - (tono - 0.66) * 300, 40, 15];
    disco(l.x, l.y, l.s * (1 - u * 0.35) * 1.3, col.map((v) => Math.max(0, v)), 0.6 * (1 - u), true);
  }
}

// ------------------------------------------------------------------ un fuego de Doom para la llama medida de un objeto
type Clase = 'antorcha' | 'brasero' | 'pira' | 'farol';
function fuegoPara(m: { ancho: number; alto: number }, clase: Clase, celda: number, paleta: D.NombrePaleta, sem: number, extra: Partial<D.OpcFuego> = {}) {
  const w = Math.round((m.ancho * 1.7 + 10) / celda), h = Math.round((m.alto * 1.9 + 8) / celda);
  const forma: D.Forma = clase === 'antorcha' || clase === 'farol' ? { tipo: 'llama', ancho: Math.min(0.7, (m.ancho * 0.55) / celda / w) }
    : clase === 'brasero' ? { tipo: 'boca', ancho: Math.max(2, (m.ancho * 0.7) / celda) }
    : { tipo: 'pira', ancho: Math.max(3, (m.ancho * 0.85) / celda), alto: Math.max(1, (m.alto * 0.12) / celda) };
  return D.crearFuego({ ancho: w, alto: h, forma, paleta, semilla: sem, altura: Math.min(1, (m.alto * 1.2) / (h * celda) / D.alturaVisible(forma, w)), humo: clase === 'pira' ? 0.6 : clase === 'farol' ? 0.1 : 0.4, ...extra });
}

if (modo === 'hoja') {
  const filas: { id: string; v: string; clase: Clase; paleta: D.NombrePaleta; rotulo: string }[] = [
    { id: 'cue_antorcha', v: 'palo', clase: 'antorcha', paleta: 'infierno', rotulo: 'antorcha' },
    { id: 'inf_brasero', v: 'cuernos', clase: 'brasero', paleta: 'infierno', rotulo: 'brasero' },
    { id: 'par_hoguera', v: 'ardiendo', clase: 'pira', paleta: 'infierno', rotulo: 'pira / hoguera' },
    { id: 'hie2_brasero', v: 'cuenco', clase: 'brasero', paleta: 'animas', rotulo: 'brasero frio (animas)' },
    { id: 'mon_brasero', v: 'tripode', clase: 'brasero', paleta: 'corona_fria', rotulo: 'brasero (corona fria)' },
  ];
  const CW = 150, CH = 160, cols = ['horneado (hoy)', 'horneado + particulas (hoy)', 'doom celda 2', 'doom celda 3', 'doom celda 4'];
  const W = 70 + CW * cols.length, H = 30 + CH * filas.length;
  const R = M.fondoPiso(W, H, piso, 0.3);
  cols.forEach((c, i) => texto(R, 70 + i * CW + 6, 8, c));
  filas.forEach((fi, k) => {
    const y0 = 30 + k * CH, base = y0 + CH - 22;
    texto(R, 4, y0 + 6, fi.rotulo);
    const med = M.medirLlama(fi.id, fi.v)!;
    const sin = pintarEscena(M.quitarLlama(M.escenaDe(objeto(fi.id), fi.v, 0)));
    const orig = pintarObjeto(fi.id, fi.v, 0);
    const fu = fuenteDe(fi.id, fi.v);
    const colLuz = D.PALETAS[fi.paleta].luz;
    cols.forEach((_, c) => {
      const cx = 70 + c * CW + CW / 2 - 12, hx = 70 + c * CW + CW - 22;
      M.pegar(R, heroe, hx, base);
      if (c < 2) {
        M.alumbrar(R, cx, base, (fu?.r ?? 150) * 0.9, colLuz, 0.5);
        M.pegar(R, orig, cx, base);
        if (c === 1 && fu) manchaJuego(R, cx, base - fu.z * 1.1, Math.max(0.3, Math.min(1.3, fu.r / 160)), 1.4, 7 + k);
        return;
      }
      const celda = c, f = fuegoPara(med, fi.clase, celda, fi.paleta, 11 + k);
      D.pasos(f, 14);
      const p = D.pulsoLuz(f, 0.45);
      M.alumbrar(R, cx + med.boca[0], base, (fu?.r ?? 150) * 0.9, colLuz, 0.5 * p.k);
      M.pegar(R, sin, cx, base);
      M.dibujarFuego(R, f, cx + med.boca[0], base + med.boca[1] + 1, celda, { filtro: 0.5 });
    });
  });
  writeFileSync(salida, encodePng(R));
  console.log('hoja', salida, W, H);
  // ---------------- la fachada de la catedral: hoy (vitrales planos) y con fuego de Doom detrás de los vitrales y en la puerta
  const orig = cacheado('fachada_herida_0', () => pintarObjeto('abo_catedral_fachada', 'herida', 0));
  const sin = cacheado('fachada_herida_sin', () => pintarEscena(M.sinFuegoHorneado(M.escenaDe(objeto('abo_catedral_fachada'), 'herida', 0))));
  const FW = 3 * 300 + 40, FH = 560, F = M.fondoPiso(FW, FH, piso, 0.3), suelo = FH - 30;
  const rot = ['hoy', 'doom celda 2', 'doom celda 3'];
  for (let c = 0; c < 3; c++) {
    const cx = 20 + c * 300 + 170;
    texto(F, 20 + c * 300, 8, rot[c]);
    if (c === 0) { M.alumbrar(F, cx, suelo, 260, '#ff3a12', 0.5); M.pegar(F, orig, cx, suelo); }
    else {
      const celda = c + 1, f = fuegoCatedral(sin, orig, celda, 21);
      D.pasos(f.vit, 12); D.pasos(f.puerta, 12);
      const p = D.pulsoLuz(f.vit, 0.4);
      M.alumbrar(F, cx, suelo, 260, D.PALETAS.infierno.luz, 0.5 * p.k);
      M.pegar(F, sin, cx, suelo);
      f.dibujar(F, cx, suelo);
    }
    M.pegar(F, heroe, cx + 150, suelo + 6);
  }
  const s2 = salida.replace(/\.png$/, '_catedral.png');
  writeFileSync(s2, encodePng(recortarAlto(F, 0, FH)));
  console.log('hoja', s2);
}

function recortarAlto(R: Raster, _y0: number, _h: number): Raster { return R; }

if (modo === 'medir') {
  const { REGISTRO } = await import('../src/engine/gotico/objeto');
  const { claseDe } = await import('../src/engine/gotico/datos/fuegos_doom');
  const carpeta = process.argv[3] ?? 'out';
  mkdirSync(join(carpeta, 'fuegos_doom'), { recursive: true });
  const filas: string[] = [];
  const t0 = Date.now();
  for (const d of REGISTRO) {
    // fuera personajes, monstruos y jefes (por tema: mon_ también es el prefijo del monasterio), armas y maniquíes
    if (d.tema === 'personajes' || d.tema === 'monstruos' || d.id.endsWith(M.SUFIJO_SIN_LLAMA) || /^(arma_|mis_|jefe_|maniqui_|arm_)/.test(d.id) || /^mon_.*_(quieto|caminar|correr|atacar|lanzar|herido|morir|especial)$/.test(d.id)) continue;
    const clase = claseDe(d.id); if (!clase) continue;
    for (const v of d.variantes) {
      const clave = `${d.id}|${v}`, fu = fuenteDe(d.id, v);
      const luz = fu ? `[${Math.round(fu.r)}, '#${fu.color.map((c) => c.toString(16).padStart(2, '0')).join('')}', ${Math.round(fu.z)}]` : `[90, '#ff9a3a', 20]`;
      if (clase === 'vitral') {
        if (v === 'sellada') continue;
        const orig = cacheado(`${d.id}_${v}_0`, () => pintarObjeto(d.id, v, 0));
        const sin = cacheado(`${d.id}_${v}_sin`, () => pintarEscena(M.sinFuegoHorneado(M.escenaDe(d, v, 0))));
        const mk = M.mascaraFuego(d.id, v, orig, sin);
        let x0 = mk.w, y0 = mk.h, x1 = -1, y1 = -1;
        for (let y = 0; y < mk.h; y++) for (let x = 0; x < mk.w; x++) if (mk.mascara[y * mk.w + x] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        if (x1 < 0) continue;
        // la máscara recortada a su caja (con aire para que la llama suba)
        y0 = Math.max(0, y0 - 12); x0 = Math.max(0, x0 - 4); x1 = Math.min(mk.w - 1, x1 + 4);
        const cw = x1 - x0 + 1, ch = y1 - y0 + 1, img = { w: cw, h: ch, data: new Uint8ClampedArray(cw * ch * 4) };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const a = mk.mascara[(y + y0) * mk.w + x + x0], o = (y * cw + x) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = 255; img.data[o + 3] = a; }
        writeFileSync(join(carpeta, 'fuegos_doom', `${d.id}_${v}.png`), encodePng(img));
        const caja = `[${x0 - mk.ancla[0]}, ${y0 - mk.ancla[1]}, ${cw}, ${ch}]`;
        // la puerta abierta de la fachada (medida en el sprite: el hueco entre las hojas)
        const puerta = d.id === 'abo_catedral_fachada' ? `, puerta: [-15, -12, 22, 64]` : '';
        filas.push(`  '${clave}': { boca: [0, 0], ancho: ${cw}, alto: ${ch}, focos: [], mat: 'abo_vitral', tema: '${d.tema}', luz: ${luz}, vitrales: { caja: ${caja} }${puerta} },`);
        console.log(((Date.now() - t0) / 1000).toFixed(0) + 's', clave, caja);
        continue;
      }
      const mats = M.llamasDe(d.id, v), ks = Object.keys(mats);
      if (!ks.length) continue;
      const m = M.medirLlama(d.id, v); if (!m) continue;
      const mat = ks.sort((a, b) => mats[b] - mats[a])[0];
      filas.push(`  '${clave}': { boca: [${m.boca.join(', ')}], ancho: ${m.ancho}, alto: ${m.alto}, focos: [${m.focos.map((f) => `[${f.join(', ')}]`).join(', ')}], mat: '${mat}', tema: '${d.tema}', luz: ${luz} },`);
    }
  }
  const ts = `// Generado por scripts/gotico-fuegos-doom.ts medir: no editar a mano (volver a medir si cambia un objeto con fuego).
/** Medida de la llama horneada de una variante: boca y focos en px desde el ancla del sprite, caja de la llama en px. */
export interface MedidaFuego {
  boca: [number, number];
  ancho: number;
  alto: number;
  focos: [number, number][];
  /** material de la llama horneada que más hay (fuego, fuego_azul, fuego_verde, luz_vela) */
  mat: string;
  tema: string;
  /** la luz que el juego ya le da (fuenteDe): radio, color y altura en unidades del mundo */
  luz: [number, string, number];
  /** catedral: caja de la máscara de los vitrales [x, y, ancho, alto] en px desde el ancla */
  vitrales?: { caja: [number, number, number, number] };
  /** catedral: el hueco de la puerta [x del centro, y del umbral, ancho, alto] en px desde el ancla */
  puerta?: [number, number, number, number];
}

export const MEDIDAS_FUEGO: Record<string, MedidaFuego> = {
${filas.sort().join('\n')}
};
`;
  writeFileSync(join(raiz, 'datos', 'fuegos_doom_medidas.ts'), ts);
  console.log('medidas', filas.length, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}

if (modo === 'costo') {
  // un fuego de cada tamaño típico: pasos a 25 por segundo con cuadros de pantalla a 60 (paso de 1/60) y pintado por cuadro
  const casos: [string, D.OpcFuego, number][] = [
    ['vela (puntos)', { ancho: 12, alto: 14, forma: { tipo: 'puntos', en: [[3, 13], [6, 13], [9, 13]] }, paleta: 'vela' }, 2],
    ['antorcha', { ancho: 10, alto: 18, forma: { tipo: 'llama', ancho: 0.4 } }, 3],
    ['brasero', { ancho: 16, alto: 26, forma: { tipo: 'boca', ancho: 8 } }, 3],
    ['pira / hoguera', { ancho: 26, alto: 34, forma: { tipo: 'pira', ancho: 18 } }, 3],
    ['quemado (cuerpo)', { ancho: 18, alto: 34, forma: { tipo: 'circulo', radio: 6 } }, 3],
    ['suelo ardiente (2 casillas)', { ancho: 30, alto: 22, forma: { tipo: 'circulo', radio: 11 } }, 3],
    ['vitrales fachada', { ancho: 82, alto: 186, forma: { tipo: 'arco' } }, 2],
  ];
  const N = 600;
  console.log('fuego'.padEnd(30), 'celdas', 'px', 'paso ms/cuadro', 'pintar x1', 'pintar xcelda');
  for (const [nom, o, e] of casos) {
    const f = D.crearFuego({ ...o, semilla: 3 }), [pw, ph] = D.tamanoPintado(f, e);
    const b1 = new Uint8ClampedArray(f.w * f.h * 4), b2 = new Uint8ClampedArray(pw * ph * 4);
    let t = performance.now(); for (let i = 0; i < N; i++) D.paso(f, 1 / 60); const tp = (performance.now() - t) / N;
    t = performance.now(); for (let i = 0; i < N; i++) D.pintar(f, b1, f.w, f.h, 1, { filtro: 0.5 }); const t1 = (performance.now() - t) / N;
    t = performance.now(); for (let i = 0; i < N / 4; i++) D.pintar(f, b2, pw, ph, e, { filtro: 0.5 }); const te = (performance.now() - t) / (N / 4);
    console.log(nom.padEnd(30), String(f.w * f.h).padStart(6), `${pw}x${ph}`.padStart(8), tp.toFixed(4).padStart(10), t1.toFixed(4).padStart(10), te.toFixed(4).padStart(10));
  }
}

if (modo === 'mundo') {
  // hoja de control desde la tabla: por categoría, una fila con el sprite de hoy y otra con el gemelo y su fuego vivo
  const { FUEGOS_DOOM, opcionesDeSpec } = await import('../src/engine/gotico/datos/fuegos_doom');
  const grupos: [string, string[]][] = [
    ['antorchas', ['cue_antorcha|palo', 'mon_antorcha|izq', 'hie_antorcha|pie', 'sel_antorcha|tribal', 'tum_antorcha|pared', 'cat2_antorcha_pared|hierro']],
    ['braseros', ['inf_brasero|cuernos', 'mon_brasero|tripode', 'for2_brasero|alto', 'cri_brasero_huesos|craneos', 'arc_brasero|pie', 'hie2_brasero|cuenco']],
    ['fogatas y hogueras', ['camp_fogata|grande', 'pue_fogata|piedras', 'nie_hoguera|pira', 'par_hoguera|ardiendo', 'inf2_pira|pira', 'des2_fogata|campamento']],
    ['velas y faroles', ['cri_candelabro|siete', 'mue_velas|grupo', 'cem_farol|encendido', 'cem2_linterna_muertos|fuego_fatuo', 'min_linterna|colgada', 'pue_farol|poste']],
    ['calderos y hogares', ['inf2_caldero|sangre', 'mue_caldero|verde', 'camp_fragua|encendida', 'min_horno|encendido', 'mue_fogon|encendido', 'inf2_columna_fuego|alta']],
  ];
  const CW = 140, CH = 150, W = 80 + CW * 6, H = grupos.length * CH * 2 + 10;
  const R = M.fondoPiso(W, H, piso, 0.3);
  let fila = 0;
  for (const [nom, claves] of grupos) {
    for (const vivo of [false, true]) {
      const y0 = fila * CH, base = y0 + CH - 20;
      texto(R, 4, y0 + 8, vivo ? 'doom' : nom);
      claves.forEach((k0, i) => {
        // si la variante pedida no existe, la primera medida de ese objeto
        const k = FUEGOS_DOOM[k0] ? k0 : Object.keys(FUEGOS_DOOM).find((x) => x.startsWith(k0.split('|')[0] + '|'));
        if (!k) return;
        const [id, v] = k.split('|'), sp = FUEGOS_DOOM[k][0], cx = 80 + i * CW + 50;
        if (i === 0) M.pegar(R, heroe, 80 + i * CW + 110, base + 2);
        if (!vivo) { M.alumbrar(R, cx, base, sp.luz.radio * 0.7, sp.luz.color, 0.45); M.pegar(R, pintarObjeto(id, v, 0), cx, base); texto(R, 80 + i * CW + 4, y0 + 20, id.slice(0, 22)); return; }
        const f = D.crearFuego(opcionesDeSpec(sp)); D.pasos(f, 9);
        const p = D.pulsoLuz(f, sp.luz.mueve);
        M.alumbrar(R, cx + sp.luz.dx, base, sp.luz.radio * 0.7, sp.luz.color, 0.45 * p.k);
        M.pegar(R, pintarObjeto(sp.sprite!, v, 0), cx, base);
        M.dibujarFuego(R, f, cx + sp.boca[0], base + sp.boca[1], sp.celda, { filtro: 0.5 });
      });
      fila++;
    }
  }
  writeFileSync(salida, encodePng(R));
  console.log('hoja', salida);
}

if (modo === 'json') {
  const { fuegosDoomJson } = await import('../src/engine/gotico/datos/fuegos_doom');
  writeFileSync(join(raiz, 'datos', 'fuegos_doom.json'), JSON.stringify(fuegosDoomJson(), null, 1) + '\n');
  console.log('json escrito');
}

/**
 * Fuego de la catedral para una pieza: uno en los vitrales (forma desde la máscara de lo que cambia entre el sprite de
 * hoy y el gemelo, recortada a su caja) y uno en el hueco de la puerta. `dibujar` los pone sobre el gemelo.
 */
function fuegoCatedral(sin: Render, orig: Render, celda: number, sem: number) {
  const mk = M.mascaraFuego('abo_catedral_fachada', 'herida', orig, sin);
  // caja de la máscara
  let x0 = mk.w, y0 = mk.h, x1 = 0, y1 = 0;
  for (let y = 0; y < mk.h; y++) for (let x = 0; x < mk.w; x++) if (mk.mascara[y * mk.w + x] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  x0 = Math.max(0, x0 - celda * 2); y0 = Math.max(0, y0 - celda * 6); x1 = Math.min(mk.w - 1, x1 + celda * 2); y1 = Math.min(mk.h - 1, y1 + celda);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, sub = new Uint8Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) sub[y * cw + x] = mk.mascara[(y + y0) * mk.w + x + x0];
  const fm = D.formaDesdeMascara(sub, cw, ch, celda, { escala255: true, relleno: 0.22, semilla: sem });
  const vit = D.crearFuego({ ancho: fm.ancho, alto: fm.alto, forma: fm.forma, paleta: 'infierno', semilla: sem, decay: 1 + 52 / (64 / celda), margen: 0, humo: 0, ruido: 0.5, turbulencia: 0.5 });
  // la puerta: el hueco entre las hojas abiertas (medido en el sprite de la fachada herida)
  const PUERTA = { x: -15, y: -12, ancho: 22, alto: 64 };
  const pw = Math.round(PUERTA.ancho / celda) + 2, ph = Math.round(PUERTA.alto / celda);
  const puerta = D.crearFuego({ ancho: pw, alto: ph, forma: { tipo: 'puerta', arranque: 0.7 }, paleta: 'infierno', semilla: sem + 1, altura: 0.95, humo: 0.5, margen: 1 });
  return {
    vit, puerta,
    dibujar(R: Raster, ax: number, ay: number) {
      // vitrales: el fuego enmascarado por el vidrio, más un fondo que late (el vidrio iluminado desde atrás)
      const ox = Math.round(ax - mk.ancla[0] + x0), oy = Math.round(ay - mk.ancla[1] + y0), pw2 = vit.w * celda, ph2 = vit.h * celda;
      const buf = new Uint8ClampedArray(pw2 * ph2 * 4);
      D.pintar(vit, buf, pw2, ph2, celda, { capa: 'llama', filtro: 0.5, pie: 0 });
      const k = D.pulsoLuz(vit, 0.4).k;
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const m = sub[y * cw + x] / 255; if (m <= 0) continue;
        const X = ox + x, Y = oy + y; if (X < 0 || Y < 0 || X >= R.w || Y >= R.h) continue;
        const s = (y * pw2 + x) * 4, a = x < pw2 && y < ph2 ? buf[s + 3] / 255 : 0, d = (Y * R.w + X) * 4;
        R.data[d] += (buf[s] * a * 1.1 + 70 * k) * m; R.data[d + 1] += (buf[s + 1] * a * 1.1 + 12 * k) * m; R.data[d + 2] += (buf[s + 2] * a + 4 * k) * m;
      }
      M.dibujarFuego(R, puerta, ax + PUERTA.x, ay + PUERTA.y, celda, { filtro: 0.5 });
    },
  };
}

export {};
