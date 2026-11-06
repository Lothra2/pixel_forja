// Fuegos de Doom que no son objetos (ESPECIALES de la Forja): el arma encantada, los cuerpos que arden (estado quemado),
// los cadáveres muertos por fuego, el suelo que sigue ardiendo después de un poder y el cuerpo de Ozmaren.
import * as D from '../../../src/engine/gotico/fuego_doom';
import { ESPECIALES } from '../../../src/engine/gotico/datos/fuegos_doom';
import { dibujar, type Cuadro } from '../motor/assets';
import { E } from '../nucleo/lienzo';
import { hexRgb } from './fuego_vivo';
import type { Juego, Ent } from '../juego/mundo';

interface Capa { cv: HTMLCanvasElement; g: CanvasRenderingContext2D; img: ImageData }
const capa = (w: number, h: number): Capa => {
  const cv = document.createElement('canvas'); cv.width = Math.max(1, w); cv.height = Math.max(1, h);
  const g = cv.getContext('2d')!; return { cv, g, img: g.createImageData(cv.width, cv.height) };
};
/** Un fuego suelto con sus dos capas pintadas a escala 1. */
export interface Suelto { f: D.Fuego; celda: number; llama: Capa; humo: Capa | null; normal: boolean; visto: number; brasa: number; ox: number; oy: number; luz: [number, number, number] }
let cuadro = 0;
function suelto(o: D.OpcFuego, celda: number, ox = 0, oy = 0): Suelto {
  const f = D.crearFuego(o), pal = D.PALETAS[typeof o.paleta === 'string' ? o.paleta : 'infierno'], normal = pal.mezcla === 'normal';
  return { f, celda, llama: capa(f.w, f.h), humo: normal ? null : capa(f.w, f.h), normal, visto: cuadro, brasa: 0, ox, oy, luz: hexRgb(pal.luz) };
}
function avanzar(s: Suelto, dt: number) {
  if (s.visto < cuadro - 1) D.pasos(s.f, 10);
  s.visto = cuadro;
  D.paso(s.f, dt);
  const { f } = s;
  if (s.normal) { D.pintar(f, s.llama.img.data, f.w, f.h, 1, { capa: 'todo' }); s.llama.g.putImageData(s.llama.img, 0, 0); return; }
  D.pintar(f, s.llama.img.data, f.w, f.h, 1, { capa: 'llama' }); s.llama.g.putImageData(s.llama.img, 0, 0);
  D.pintar(f, s.humo!.img.data, f.w, f.h, 1, { capa: 'humo' }); s.humo!.g.putImageData(s.humo!.img, 0, 0);
}
/** Dibuja con la esquina de arriba a la izquierda en (x, y) y celdas de `celda * esc` px. */
function pintarEn(ctx: CanvasRenderingContext2D, s: Suelto, x: number, y: number, esc = 1, alfa = 1) {
  const w = s.f.w * s.celda * esc, h = s.f.h * s.celda * esc;
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = alfa;
  if (s.normal) ctx.drawImage(s.llama.cv, x, y, w, h);
  else { ctx.drawImage(s.humo!.cv, x, y, w, h); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(s.llama.cv, x, y, w, h); }
  ctx.restore();
}
const nVal = (v: unknown, d: number) => (typeof v === 'number' ? v : d);

// ------------------------------------------------------------------ siluetas (quemado y cadáver)
const tmp = document.createElement('canvas'), tg = tmp.getContext('2d', { willReadFrequently: true })!;
/** Alfa del cuadro con margen, umbral 200 (la sombra del piso no arde). Devuelve la máscara y la esquina relativa al ancla. */
function silueta(q: Cuadro, esc: number, mx: number, my: number) {
  const w = Math.ceil(q.w * esc) + mx * 2, h = Math.ceil(q.h * esc) + my;
  if (tmp.width < w || tmp.height < h) { tmp.width = Math.max(tmp.width, w); tmp.height = Math.max(tmp.height, h); }
  tg.clearRect(0, 0, w, h);
  if (!dibujar(tg, q, mx + q.ax * esc, my + q.ay * esc, esc)) return null;
  const d = tg.getImageData(0, 0, w, h).data, a = new Uint8Array(w * h);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] >= 200 ? 255 : 0;
  return { a, w, h, ox: -q.ax * esc - mx, oy: -q.ay * esc - my };
}
interface Cuerpo { s: Suelto; q: Cuadro | null; cambios: number; apagado: boolean; desde: number }
const cuerpos = new WeakMap<Ent, Cuerpo>();
let vivosCuerpo = 0;
function armarCuerpo(prev: Cuerpo | undefined, q: Cuadro, esc: number, esp: typeof ESPECIALES.quemado, paleta: D.NombrePaleta, semilla: number): Cuerpo | null {
  const [mx, my] = (esp.margen_px as [number, number]) ?? [10, 26];
  const sil = silueta(q, esc, mx, my); if (!sil) return prev ?? null;
  const fm = D.formaDesdeMascara(sil.a, sil.w, sil.h, esp.celda, { modo: 'salpicado', relleno: esp.relleno, escala255: true, semilla });
  // misma grilla: solo cambia dónde nace el fuego, la llama sigue sin cortarse
  if (prev && prev.s.f.w === fm.ancho && prev.s.f.h === fm.alto && fm.forma.tipo === 'mapa') { prev.s.f.fuente.set(fm.forma.fuente as Float32Array); prev.s.ox = sil.ox; prev.s.oy = sil.oy; prev.q = q; return prev; }
  const s = suelto({ ancho: fm.ancho, alto: fm.alto, forma: fm.forma, paleta, decay: D.decayPara(esp.altura, fm.alto), humo: esp.humo, turbulencia: esp.turbulencia, ruido: esp.ruido, hueco: paleta === 'animas' ? 0.5 : 0, brillo: nVal(esp.brillo, 1.5), pegada: nVal(esp.pegada, 0.5), semilla, margen: 0 }, esp.celda, sil.ox, sil.oy);
  return { s, q, cambios: 0, apagado: false, desde: prev?.desde ?? performance.now() / 1000 };
}

/**
 * Cuerpo que arde: el estado quemado sobre monstruos y el héroe, y el cadáver muerto por fuego (5 s, se apaga a los 3.5).
 * Se llama después de dibujar el sprite. Devuelve el pulso de luz (0 si no arde).
 */
export function cuerpoArde(ctx: CanvasRenderingContext2D, j: Juego, e: Ent, q: Cuadro, px: number, py: number, esc: number, dt: number): number {
  const m = e as any;
  if (e.muerto && m.ardeCadaver === undefined) m.ardeCadaver = m.quema > 0 ? j.t : null;
  const cad = e.muerto && m.ardeCadaver != null;
  const esp = cad ? ESPECIALES.cadaver : ESPECIALES.quemado;
  let c = cuerpos.get(e);
  const arde = cad ? j.t - m.ardeCadaver < nVal(esp.dura_s, 5) : m.quema > 0;
  if (!arde && (!c || c.apagado && D.calorMedio(c.s.f).k <= 0.002)) { if (c) cuerpos.delete(e); return 0; }
  if (!c && (!arde || vivosCuerpo >= (E.tactil ? 6 : 12))) return 0;
  vivosCuerpo++;
  // la silueta se rehace cada 4 cuadros de animación
  if (!c || (c.q !== q && ++c.cambios % 4 === 0)) { const nc = armarCuerpo(c, q, esc, esp, 'infierno', (e.id ?? 1) * 7 + 3); if (!nc) return 0; c = nc; cuerpos.set(e, c); }
  else if (c.q !== q) c.q = q;
  if (!c.apagado && (!arde || (cad && j.t - m.ardeCadaver > nVal(esp.apaga_s, 3.5)))) { D.apagar(c.s.f); c.apagado = true; }
  avanzar(c.s, dt);
  pintarEn(ctx, c.s, px + c.s.ox, py + c.s.oy, 1, nVal(esp.alfa, 0.85));
  // brasas que saltan del cuerpo
  c.s.brasa += esp.brasas * dt;
  while (c.s.brasa >= 1 && j.particulas.length < 650) {
    c.s.brasa--; const b = D.brasas(c.s.f, 1)[0]; if (!b) break;
    j.particulas.push({ x: e.x, y: e.y, z: -(c.s.oy + b.y * c.s.celda), vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, vz: 20 + Math.random() * 30, t: 0, dur: 0.5 + Math.random() * 0.6, color: Math.random() < 0.5 ? '#ff7020' : '#ffd080', tam: 1.2, tipo: 'brasa' } as any);
  }
  return D.pulsoLuz(c.s.f, esp.luz.mueve).k;
}

// ------------------------------------------------------------------ arma encantada
const ELEM_ARMA = ESPECIALES.arma_encantada.paleta as Record<string, D.NombrePaleta>;
const armas = new Map<string, Suelto>();
export let pulsoArma = 1;
/** La tira de llama a lo largo de la hoja del arma (reemplaza el trazo de armaViva). Una grilla por hoja, guardadas. */
export function armaArde(ctx: CanvasRenderingContext2D, q: Cuadro, x: number, y: number, elem: string, dt: number): boolean {
  if (!q.hoja) return false;
  const esp = ESPECIALES.arma_encantada, c = esp.celda, mg = nVal(esp.margen_celdas, 3);
  const [x0, y0, x1, y1] = q.hoja, pal = ELEM_ARMA[elem] ?? 'infierno';
  const gx = Math.floor(Math.min(x0, x1) / c - mg) * c, gy = Math.floor(Math.min(y0, y1) / c - mg - 12) * c;
  const k = `${pal}:${x0},${y0},${x1},${y1}`;
  let s = armas.get(k);
  if (!s) {
    if (armas.size > 80) armas.clear();
    const w = Math.ceil((Math.max(x0, x1) - gx) / c + mg), h = Math.ceil((Math.max(y0, y1) - gy) / c + mg);
    const forma: D.Forma = { tipo: 'tira', desde: [(x0 - gx) / c, (y0 - gy) / c], hasta: [(x1 - gx) / c, (y1 - gy) / c], grosor: 0.9 };
    s = suelto({ ancho: w, alto: h, forma, paleta: pal, decay: D.decayPara(esp.altura, h), humo: esp.humo, turbulencia: esp.turbulencia, ruido: esp.ruido, hueco: pal === 'animas' ? nVal(esp.hueco_frio, 0.4) : 0, brillo: nVal(esp.brillo, 1.7), pegada: nVal(esp.pegada, 0.7), semilla: 11, margen: 0 }, c);
    armas.set(k, s);
  }
  avanzar(s, dt);
  pintarEn(ctx, s, x + gx, y + gy);
  pulsoArma = D.pulsoLuz(s.f, esp.luz.mueve).k;
  return true;
}

// ------------------------------------------------------------------ suelo que sigue ardiendo
interface Charco { s: Suelto; x: number; y: number; t: number; dura: number; apagado: boolean; rpx: number }
const charcos: Charco[] = [];
const areasFuego = new Map<object, { x: number; y: number; radio: number; frio: boolean }>();
const QUEDA_ARDIENDO = /crater_ardiente|muro_llamas|cerco_llamas|muro_infierno|suelo_ardiente|meteoro|llanto_animas/;
/** Cuando un poder de fuego termina, el piso sigue ardiendo unos segundos (un charco por área). */
export function seguirSuelo(j: Juego, dt: number) {
  cuadro++; vivosCuerpo = 0;
  const vistas = new Set<object>();
  for (const a of j.areas as any[]) {
    if (!a.efecto || !QUEDA_ARDIENDO.test(a.efecto) || a.radio < 0.8) continue;
    vistas.add(a); if (!areasFuego.has(a)) areasFuego.set(a, { x: a.x, y: a.y, radio: a.radio, frio: a.efecto === 'llanto_animas' });
  }
  for (const [a, d] of areasFuego) if (!vistas.has(a)) { areasFuego.delete(a); prender(d.x, d.y, d.radio, d.frio); }
  for (let i = charcos.length - 1; i >= 0; i--) {
    const c = charcos[i]; c.t += dt;
    if (!c.apagado && c.t > c.dura) { D.apagar(c.s.f); c.apagado = true; }
    if (c.apagado && c.t > c.dura + 1.5) charcos.splice(i, 1);
  }
}
/** Prende un charco de fuego en el piso (x, y en casillas). */
export function prender(x: number, y: number, radio: number, frio = false) {
  const esp = ESPECIALES.suelo_ardiente, c = esp.celda;
  if (charcos.length >= (E.tactil ? 4 : 8)) charcos.shift();
  const rpx = Math.min(80, radio * nVal(esp.radio_px_por_casilla, 16)), rc = rpx / c;
  const w = Math.ceil(2 * rc + 6), h = Math.ceil(rc + 14);
  const s = suelto({ ancho: w, alto: h, forma: { tipo: 'circulo', radio: rc, relleno: esp.relleno }, paleta: frio ? 'animas' : 'infierno', decay: D.decayPara(esp.altura, h), humo: esp.humo, turbulencia: esp.turbulencia, ruido: esp.ruido, hueco: frio ? 0.5 : 0, brillo: nVal(esp.brillo, 1.5), pegada: nVal(esp.pegada, 0.6), semilla: Math.floor(x * 31 + y * 17), margen: 0 }, c);
  charcos.push({ s, x, y, t: 0, dura: nVal(esp.dura_s, 4), apagado: false, rpx });
}
/** Los charcos en pantalla (van debajo de los cuerpos: se llaman antes de ordenar por profundidad). */
export function dibujarSuelo(ctx: CanvasRenderingContext2D, aPant: (x: number, y: number) => [number, number], dt: number) {
  for (const c of charcos) {
    const [px, py] = aPant(c.x, c.y);
    avanzar(c.s, dt);
    const w = c.s.f.w * c.s.celda, h = c.s.f.h * c.s.celda;
    pintarEn(ctx, c.s, px - w / 2, py + c.rpx / 4 - h, 1, Math.min(1, (c.dura + 1.5 - c.t) / 1));
  }
}
/** Luces de los charcos para luces.ts. */
export function lucesSuelo(aPant: (x: number, y: number) => [number, number]) {
  const esp = ESPECIALES.suelo_ardiente;
  return charcos.map((c, i) => { const [x, y] = aPant(c.x, c.y); return { id: 'charco' + i, x, y, h: esp.luz.altura, r: esp.luz.radio, c: c.s.luz, k: esp.luz.intensidad * D.pulsoLuz(c.s.f, esp.luz.mueve).k, sinSombra: !esp.luz.sombra }; });
}

// ------------------------------------------------------------------ Ozmaren
const FOCOS_OZ = ESPECIALES.ozmaren.focos as [number, number, number, number, number][];
const oz = new WeakMap<Ent, Suelto[]>();
export let pulsosOzmaren: number[] | null = null;
/** El cuerpo de Ozmaren arde en 8 grillas (cuernos, hombros, espalda, pecho y garras). Con furia se aviva en cada golpe. */
export function ozmarenArde(ctx: CanvasRenderingContext2D, m: Ent, q: Cuadro, px: number, py: number, esc: number, dt: number, furia: number) {
  const esp = ESPECIALES.ozmaren;
  let fs = oz.get(m);
  if (!fs) {
    fs = FOCOS_OZ.map(([, , gw, gh], i) => suelto({ ancho: gw, alto: gh, forma: { tipo: 'llama', ancho: 0.5 }, paleta: 'infierno', decay: D.decayPara(esp.altura, gh), humo: esp.humo, turbulencia: esp.turbulencia, ruido: esp.ruido, brillo: nVal(esp.brillo, 1.6), pegada: nVal(esp.pegada, 0.6), semilla: 50 + i, margen: 2 }, esp.celda));
    oz.set(m, fs);
  }
  const fur = esp.furia as { avivar: number; rafagas: number };
  const golpe = (m as any).acc === 'atacar' && (m as any).t < 0.05;
  const alto = q.ay * esc, ancho = q.w * esc;
  fs.forEach((s, i) => {
    if (furia > 0.5) { s.f.rafagas = fur.rafagas; if (golpe) D.avivar(s.f, fur.avivar, 0.4); }
    avanzar(s, dt);
    const [fx, fy] = FOCOS_OZ[i], w = s.f.w * s.celda * esc, h = s.f.h * s.celda * esc;
    pintarEn(ctx, s, px + fx * ancho - w / 2, py - fy * alto - h + 4 * esc, esc);
  });
  // cuernos y espalda mandan en sus luces
  pulsosOzmaren = [0, 1, 4].map((i) => D.pulsoLuz(fs![i].f, esp.luz.mueve).k);
}
