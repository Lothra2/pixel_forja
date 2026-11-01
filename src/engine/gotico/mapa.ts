import { zipSync } from 'fflate';
import { createRaster, type Raster } from '../core/raster';
import { encodePng, encodePngPaleta } from '../export/png';
import { MATERIALES } from './materiales';
import { REGISTRO, objeto, pintarObjeto, herramientas, huellaDe } from './objeto';
import { PISOS, pintarPiso } from './pisos';
import { aPantalla, CELDA, BALDOSA, type Escena } from './render';
import { DIRS } from './figura';

/**
 * Mapas del taller gótico: una grilla de baldosas de piso (rombos de 160×80) y objetos parados en celdas de juego
 * (5×5 celdas por baldosa). Se dibujan de atrás hacia adelante (primero los pisos, después los objetos ordenados
 * por profundidad), y encima va la luz: la oscuridad del ambiente, los fuegos que alumbran a su alrededor y la
 * antorcha del héroe (un radio de luz que sigue al cursor).
 */

export type AmbienteId = 'dia' | 'atardecer' | 'noche' | 'cripta' | 'infierno' | 'nieve' | 'selva' | 'desierto';
export const AMBIENTES: Record<AmbienteId, { nombre: [string, string]; oscuridad: number; tinte: [number, number, number] }> = {
  dia: { nombre: ['Día nublado', 'Overcast day'], oscuridad: 0.08, tinte: [1, 1, 1] },
  atardecer: { nombre: ['Atardecer', 'Dusk'], oscuridad: 0.3, tinte: [1.08, 0.92, 0.82] },
  noche: { nombre: ['Noche', 'Night'], oscuridad: 0.62, tinte: [0.78, 0.86, 1.08] },
  cripta: { nombre: ['Cripta (muy oscuro)', 'Crypt (very dark)'], oscuridad: 0.74, tinte: [0.9, 0.9, 1] },
  infierno: { nombre: ['Infierno', 'Hell'], oscuridad: 0.45, tinte: [1.15, 0.78, 0.68] },
  nieve: { nombre: ['Montaña nevada', 'Snowy peak'], oscuridad: 0.12, tinte: [0.9, 0.97, 1.1] },
  selva: { nombre: ['Selva', 'Jungle'], oscuridad: 0.35, tinte: [0.86, 1.04, 0.86] },
  desierto: { nombre: ['Desierto', 'Desert'], oscuridad: 0.02, tinte: [1.08, 1, 0.86] },
};

export interface PisoEnMapa { id: string; v: number }
export interface ObjEnMapa { id: string; v: string; seed: number; cx: number; cy: number }
export interface MapaGotico {
  formato: 'pixelforja-gotico';
  version: 1;
  nombre: string;
  /** En baldosas. */
  ancho: number;
  alto: number;
  pisos: (PisoEnMapa | null)[];
  objetos: ObjEnMapa[];
  ambiente: AmbienteId;
}

export function crearMapa(ancho: number, alto: number, piso = 'pasto', nombre = 'Mi mapa'): MapaGotico {
  const d = PISOS.find((p) => p.id === piso) ?? PISOS[0];
  return { formato: 'pixelforja-gotico', version: 1, nombre, ancho, alto, pisos: Array.from({ length: ancho * alto }, (_, i) => ({ id: d.id, v: (i * 7 + (i >> 2)) % d.variantes })), objetos: [], ambiente: 'dia' };
}

/** Lo alto que puede subir un objeto sobre el piso de atrás (para dejar lugar arriba). */
const TECHO = 300;
/** Medidas del lienzo del mapa y dónde cae la esquina de atrás (la baldosa 0,0). */
export function medidas(m: MapaGotico) {
  const w = (m.ancho + m.alto) * 80, h = (m.ancho + m.alto) * 40 + TECHO;
  return { w, h, ox: m.alto * 80, oy: TECHO };
}
/** Celda de juego (cx, cy) a pantalla del mapa: el centro de la celda en el piso. */
export function celdaAPantalla(m: MapaGotico, cx: number, cy: number): [number, number] {
  const { ox, oy } = medidas(m);
  const [sx, sy] = aPantalla([cx * CELDA + CELDA / 2, cy * CELDA + CELDA / 2, 0]);
  return [ox + sx, oy + sy];
}
/** Pantalla del mapa a celda de juego (la más cercana) y a baldosa. */
export function pantallaACelda(m: MapaGotico, px: number, py: number): { cx: number; cy: number; bx: number; by: number } {
  const { ox, oy } = medidas(m);
  const sx = px - ox, sy = py - oy;
  const x = (2 * sy + sx) / 2, y = (2 * sy - sx) / 2;
  return { cx: Math.floor(x / CELDA), cy: Math.floor(y / CELDA), bx: Math.floor(x / BALDOSA), by: Math.floor(y / BALDOSA) };
}

// ------------------------------------------------------------------ luces que dan los objetos
interface Fuente { r: number; color: [number, number, number]; z: number }
const fuentes = new Map<string, Fuente | null>();
const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** Si el objeto alumbra (tiene resplandor o piezas de fuego, lava, magia): su radio y color. */
export function fuenteDe(id: string, v: string): Fuente | null {
  const k = `${id}|${v}`;
  if (fuentes.has(k)) return fuentes.get(k)!;
  let f: Fuente | null = null;
  try {
    const a = objeto(id).armar(v, 0, herramientas(1));
    const esc: Escena = Array.isArray(a) ? { piezas: a } : a;
    if (esc.resplandor) f = { r: Math.max(90, esc.resplandor.r * 4), color: rgb(esc.resplandor.color), z: esc.resplandor.c[2] };
    else {
      const em = esc.piezas.filter((p) => MATERIALES[p.mat]?.emite && !p.resta);
      if (em.length) { const m = MATERIALES[em[0].mat]; f = { r: 70 + Math.min(80, em.length * 6), color: rgb(m.rampa[Math.floor(m.rampa.length * 0.6)]), z: 10 }; }
    }
  } catch { f = null; }
  fuentes.set(k, f);
  return f;
}

export interface OpcPintar { cuadro?: number; antorcha?: [number, number] | null; radioAntorcha?: number; cuadricula?: boolean; sinLuz?: boolean; marcar?: ObjEnMapa | null }

/** Dibuja el mapa completo en un Raster del tamaño de `medidas`. */
export function pintarMapa(m: MapaGotico, o: OpcPintar = {}): Raster {
  const f = o.cuadro ?? 0;
  const { w, h, ox, oy } = medidas(m);
  const img = createRaster(w, h);
  const D = img.data;
  const pegar = (r: Raster, x0: number, y0: number) => {
    for (let y = 0; y < r.h; y++) {
      const Y = y0 + y; if (Y < 0 || Y >= h) continue;
      for (let x = 0; x < r.w; x++) {
        const X = x0 + x; if (X < 0 || X >= w) continue;
        const s = (y * r.w + x) * 4, a = r.data[s + 3]; if (!a) continue;
        const d = (Y * w + X) * 4;
        // la sombra (semitransparente) solo cae donde hay algo debajo: no se sale del piso
        if (a < 255 && !D[d + 3]) continue;
        if (a === 255) { D[d] = r.data[s]; D[d + 1] = r.data[s + 1]; D[d + 2] = r.data[s + 2]; D[d + 3] = 255; continue; }
        const k = a / 255;
        D[d] = D[d] + (r.data[s] - D[d]) * k; D[d + 1] = D[d + 1] + (r.data[s + 1] - D[d + 1]) * k; D[d + 2] = D[d + 2] + (r.data[s + 2] - D[d + 2]) * k; D[d + 3] = Math.max(D[d + 3], a);
      }
    }
  };
  // pisos de atrás hacia adelante
  for (let s = 0; s < m.ancho + m.alto - 1; s++) for (let i = 0; i < m.ancho; i++) {
    const j = s - i; if (j < 0 || j >= m.alto) continue;
    const p = m.pisos[j * m.ancho + i]; if (!p) continue;
    const def = PISOS.find((q) => q.id === p.id); if (!def) continue;
    const t = pintarPiso(p.id, p.v % def.variantes, f % (def.cuadros ?? 1));
    const [sx, sy] = aPantalla([i * BALDOSA + 40, j * BALDOSA + 40, 0]);
    pegar(t, Math.round(ox + sx - 80), Math.round(oy + sy - 40));
  }
  if (o.cuadricula) for (let j = 0; j <= m.alto * 5; j++) for (let i = 0; i <= m.ancho * 5; i++) {
    const [px, py] = aPantalla([i * CELDA, j * CELDA, 0]); const X = Math.round(ox + px), Y = Math.round(oy + py);
    if (X >= 0 && Y >= 0 && X < w && Y < h) { const d = (Y * w + X) * 4; D[d] = 220; D[d + 1] = 200; D[d + 2] = 120; D[d + 3] = 255; }
  }
  // objetos por profundidad (los de atrás primero)
  const orden = [...m.objetos].sort((a, b) => a.cx + a.cy - (b.cx + b.cy) || a.cx - b.cx);
  const luces: { x: number; y: number; f: Fuente }[] = [];
  for (const ob of orden) {
    const def = REGISTRO.find((d) => d.id === ob.id); if (!def) continue;
    const r = pintarObjeto(ob.id, ob.v, f % (def.cuadros ?? 1), ob.seed);
    const [sx, sy] = celdaAPantalla(m, ob.cx, ob.cy);
    pegar(r.img, Math.round(sx - r.ancla[0]), Math.round(sy - r.ancla[1]));
    const fu = fuenteDe(ob.id, ob.v);
    if (fu) luces.push({ x: sx, y: sy - fu.z * 1.2, f: fu });
    if (o.marcar === ob) { for (let y = 0; y < r.img.h; y++) for (const x of [0, r.img.w - 1]) marca(sx - r.ancla[0] + x, sy - r.ancla[1] + y); for (let x = 0; x < r.img.w; x++) for (const y of [0, r.img.h - 1]) marca(sx - r.ancla[0] + x, sy - r.ancla[1] + y); }
  }
  function marca(x: number, y: number) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h || (x + y) % 3) return; const d = (y * w + x) * 4; D[d] = 244; D[d + 1] = 196; D[d + 2] = 48; D[d + 3] = 255; }
  if (o.sinLuz) return img;
  // luz: oscuridad del ambiente, fuegos y la antorcha del héroe (los círculos se aplastan como el piso, 2:1)
  const amb = AMBIENTES[m.ambiente] ?? AMBIENTES.dia;
  const tor = o.antorcha ? { x: o.antorcha[0], y: o.antorcha[1], f: { r: o.radioAntorcha ?? 190, color: [255, 236, 200] as [number, number, number], z: 0 } } : null;
  const todas = tor ? [...luces, tor] : luces;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = (y * w + x) * 4; if (!D[d + 3]) continue;
    let luz = 1 - amb.oscuridad, cr = 0, cg = 0, cb = 0;
    for (const L of todas) {
      const dx = x - L.x, dy = (y - L.y) * 2, dd = Math.sqrt(dx * dx + dy * dy) / L.f.r;
      if (dd >= 1) continue;
      const k = (1 - dd) * (1 - dd);
      luz += k * amb.oscuridad * 1.1;
      cr += k * (L.f.color[0] / 255 - 0.75) * 0.5; cg += k * (L.f.color[1] / 255 - 0.75) * 0.5; cb += k * (L.f.color[2] / 255 - 0.75) * 0.5;
    }
    luz = Math.min(1.12, luz);
    D[d] = Math.min(255, D[d] * luz * (amb.tinte[0] + cr));
    D[d + 1] = Math.min(255, D[d + 1] * luz * (amb.tinte[1] + cg));
    D[d + 2] = Math.min(255, D[d + 2] * luz * (amb.tinte[2] + cb));
  }
  return img;
}

// ------------------------------------------------------------------ exportar
const txt = (s: string) => new TextEncoder().encode(s);
/** Tira horizontal con todos los cuadros de un objeto (mismo tamaño y ancla en todos). */
export function tiraObjeto(id: string, v: string, seed = 1): { png: Raster; w: number; h: number; ancla: [number, number]; cuadros: number } {
  const d = objeto(id), n = d.cuadros ?? 1;
  const fs = Array.from({ length: n }, (_, f) => pintarObjeto(id, v, f, seed));
  const w = fs[0].img.w, h = fs[0].img.h;
  const png = createRaster(w * n, h);
  fs.forEach((q, i) => { for (let y = 0; y < h; y++) png.data.set(q.img.data.subarray(y * w * 4, (y + 1) * w * 4), (y * w * n + i * w) * 4); });
  return { png, w, h, ancla: fs[0].ancla, cuadros: n };
}
export function tiraPiso(id: string, v: number): { png: Raster; cuadros: number } {
  const d = PISOS.find((p) => p.id === id)!, n = d.cuadros ?? 1;
  const png = createRaster(160 * n, 80);
  for (let f = 0; f < n; f++) { const t = pintarPiso(id, v, f); for (let y = 0; y < 80; y++) png.data.set(t.data.subarray(y * 160 * 4, (y + 1) * 160 * 4), (y * 160 * n + f * 160) * 4); }
  return { png, cuadros: n };
}
const LEEME = `Paquete del taller gótico de PixelForja (assets originales, proporciones de los juegos de rol isométricos oscuros de 1999-2000).

Proyección: isométrica 2:1. Baldosa de piso = rombo de 160x80 px (5x5 celdas de juego de 32x16). Persona = 75 px.
Pisos: pisos/<id>_<variante>.png, tiras de 160x80 por cuadro.
Objetos: objetos/<id>_<variante>_s<semilla>.png, tiras horizontales; "ancla" es el pixel que va en el centro de la celda donde se para el objeto.
Animación: cuadro = floor(tiempo * 25 / t) % cuadros (25 cuadros por segundo, como el original).
Personajes y monstruos: hojas/<id>.png con una fila por dirección (s, so, o, no, n, ne, e, se) y una columna por cuadro; todas las celdas del mismo tamaño y la misma ancla.
Orden de dibujo: pisos primero; objetos de atrás hacia adelante por (cx + cy).
Celda (cx, cy) a pantalla: x = (cx - cy) * 16, y = (cx + cy) * 8 + 8 (más el origen del mapa).
`;
/** El mapa con todo lo que usa: json, vista previa, pisos y objetos en tiras. */
export function paqueteMapa(m: MapaGotico): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const usados = new Set<string>();
  const pisos: Record<string, unknown> = {};
  for (const p of m.pisos) if (p) { const k = `${p.id}_${p.v}`; if (pisos[k]) continue; const t = tiraPiso(p.id, p.v); files[`pisos/${k}.png`] = encodePngPaleta(t.png); pisos[k] = { archivo: `pisos/${k}.png`, cuadros: t.cuadros, t: 4 }; }
  const objs: Record<string, unknown> = {};
  for (const o of m.objetos) {
    const k = `${o.id}_${o.v}_s${o.seed}`; if (usados.has(k)) continue; usados.add(k);
    const t = tiraObjeto(o.id, o.v, o.seed), d = objeto(o.id);
    files[`objetos/${k}.png`] = encodePngPaleta(t.png);
    objs[k] = { archivo: `objetos/${k}.png`, w: t.w, h: t.h, ancla: t.ancla, cuadros: t.cuadros, t: d.t ?? 3, huella: huellaDe(d, o.v), bloquea: d.bloquea ?? false, nombre: d.nombre };
  }
  files['mapa.json'] = txt(JSON.stringify({ ...m, recursos: { pisos, objetos: objs } }, null, 1));
  files['vista_previa.png'] = encodePng(pintarMapa(m, { cuadro: 0 }));
  files['LEEME.txt'] = txt(LEEME);
  return zipSync(files, { level: 6 });
}
/** Todos los objetos de unos temas (o todos), con sus variantes y una semilla, más el manifiesto. */
export async function paqueteCatalogo(temas: string[] | null, progreso?: (hecho: number, total: number) => void, semillas = [1]): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  const lista = REGISTRO.filter((d) => !temas || temas.includes(d.tema));
  const total = lista.reduce((s, d) => s + d.variantes.length * semillas.length, 0) + (temas ? 0 : PISOS.length);
  const manifiesto: unknown[] = [];
  const hojas: unknown[] = [];
  let hecho = 0;
  // personajes y monstruos: además, una hoja por acción con una fila por dirección (s, so, o, no, n, ne, e, se)
  for (const d of lista) {
    if (d.variantes.join() !== DIRS.join()) continue;
    const tiras = DIRS.map((v) => tiraObjeto(d.id, v, 1));
    const w = tiras[0].w, h = tiras[0].h, n = tiras[0].cuadros;
    const hoja = createRaster(w * n, h * DIRS.length);
    tiras.forEach((t, fila) => { for (let y = 0; y < h; y++) hoja.data.set(t.png.data.subarray(y * w * n * 4, (y + 1) * w * n * 4), ((fila * h + y) * w * n) * 4); });
    files[`hojas/${d.id}.png`] = encodePngPaleta(hoja);
    hojas.push({ id: d.id, nombre: d.nombre, archivo: `hojas/${d.id}.png`, celda: [w, h], ancla: tiras[0].ancla, cuadros: n, t: d.t ?? 3, filas: DIRS });
    await new Promise((r) => setTimeout(r, 0));
  }
  for (const d of lista) for (const v of d.variantes) for (const s of semillas) {
    const t = tiraObjeto(d.id, v, s), k = `${d.id}_${v}_s${s}`;
    files[`objetos/${d.tema}/${k}.png`] = encodePngPaleta(t.png);
    manifiesto.push({ id: d.id, nombre: d.nombre, tema: d.tema, variante: v, semilla: s, archivo: `objetos/${d.tema}/${k}.png`, w: t.w, h: t.h, ancla: t.ancla, cuadros: t.cuadros, t: d.t ?? 3, huella: huellaDe(d, v), bloquea: d.bloquea ?? false });
    hecho++; progreso?.(hecho, total);
    if (hecho % 6 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  const pisos: unknown[] = [];
  if (!temas) for (const p of PISOS) {
    for (let v = 0; v < p.variantes; v++) { const t = tiraPiso(p.id, v); files[`pisos/${p.id}_${v}.png`] = encodePngPaleta(t.png); pisos.push({ id: p.id, nombre: p.nombre, variante: v, archivo: `pisos/${p.id}_${v}.png`, cuadros: t.cuadros }); }
    hecho++; progreso?.(hecho, total); await new Promise((r) => setTimeout(r, 0));
  }
  files['catalogo.json'] = txt(JSON.stringify({ formato: 'pixelforja-gotico-catalogo', version: 1, baldosa: [160, 80], celda: [32, 16], persona_px: 75, cuadros_por_segundo: 25, direcciones: DIRS, hojas_personajes: hojas, objetos: manifiesto, pisos }, null, 1));
  files['LEEME.txt'] = txt(LEEME);
  return zipSync(files, { level: 6 });
}
