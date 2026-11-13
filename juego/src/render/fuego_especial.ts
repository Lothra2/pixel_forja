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

// ------------------------------------------------------------------ proyectiles que arden (cometas)
/**
 * Los hechizos lanzados como cometas de fuego de Doom en vivo: un núcleo incandescente y una cola de llamas que se
 * estira hacia atrás del rumbo. Una simulación por paleta (la comparten todos los proyectiles de esa paleta, cada uno
 * la dibuja rotada y a su tamaño). `r` es el radio del núcleo en px, `cola` cuánto se estira la llama y `ancho` su
 * grosor; `encima` deja además el sprite de siempre (la flecha o el virote que lleva el fuego).
 */
interface Cometa { pal: D.NombrePaleta; r: number; cola: number; ancho: number; encima?: boolean }
const COMETAS: Record<string, Cometa> = {
  saeta_ignea: { pal: 'infierno', r: 4.5, cola: 1.5, ancho: 1.1 }, brasas_saltarinas: { pal: 'infierno', r: 3.2, cola: 1.1, ancho: 0.9 },
  bola_fuego: { pal: 'infierno', r: 12, cola: 3, ancho: 3 }, lanza_magma: { pal: 'infierno', r: 6, cola: 4, ancho: 1.5 },
  esquirla: { pal: 'corona_fria', r: 4, cola: 1.4, ancho: 1 }, carambano: { pal: 'corona_fria', r: 5.5, cola: 2.2, ancho: 1.3 }, orbe_glacial: { pal: 'corona_fria', r: 11, cola: 1.6, ancho: 2.6 },
  saeta_fe: { pal: 'sagrado', r: 4.5, cola: 1.8, ancho: 1.1 }, espadas_votivas: { pal: 'sagrado', r: 3, cola: 1.6, ancho: 0.9, encima: true }, lanza_espiritu: { pal: 'sagrado', r: 6, cola: 3.2, ancho: 1.4 }, mil_palmas: { pal: 'sagrado', r: 3.5, cola: 1.2, ancho: 1 },
  flecha_ignea: { pal: 'infierno', r: 2.5, cola: 1.4, ancho: 0.8, encima: true }, flecha_cometa: { pal: 'infierno', r: 5, cola: 3, ancho: 1.4, encima: true },
  virote_explosivo: { pal: 'infierno', r: 3.5, cola: 1.6, ancho: 1, encima: true }, virote_dragon: { pal: 'infierno', r: 6, cola: 3.2, ancho: 1.6, encima: true },
  flecha_helada: { pal: 'corona_fria', r: 2.5, cola: 1.4, ancho: 0.8, encima: true }, virote_escarcha: { pal: 'corona_fria', r: 3, cola: 1.5, ancho: 0.9, encima: true },
  zarzas: { pal: 'veneno', r: 4, cola: 1.5, ancho: 1.1 }, virote_veneno: { pal: 'veneno', r: 3, cola: 1.5, ancho: 0.9, encima: true },
};
/** Los proyectiles de fuego de los monstruos (sin habilidad). */
const COMETA_MONSTRUO: Cometa = { pal: 'infierno', r: 5, cola: 1.8, ancho: 1.3 };
const NUCLEO: Partial<Record<D.NombrePaleta, [string, string, string]>> = {
  infierno: ['#fff6d8', '#ffb43c', '#ff5a14'], corona_fria: ['#ffffff', '#b8dcff', '#4a8cf0'], sagrado: ['#ffffff', '#ffe9a8', '#e0a030'], veneno: ['#f4ffd0', '#a8e040', '#3c8a14'],
};
const colas = new Map<D.NombrePaleta, { s: Suelto; cuadro: number }>();
function colaDe(pal: D.NombrePaleta, dt: number): Suelto {
  let c = colas.get(pal);
  if (!c) { c = { s: suelto({ ancho: 18, alto: 40, forma: { tipo: 'llama', ancho: 0.62, afinar: 0.55 }, paleta: pal, altura: 0.9, humo: 0, turbulencia: 0.7, ruido: 0.25, tramo: 3, velocidadTramo: 3, brillo: 1.7, pegada: 0.6, semilla: 23, margen: 1, pps: 40 }, 1), cuadro: -1 }; colas.set(pal, c); }
  if (c.cuadro !== cuadro) { c.cuadro = cuadro; avanzar(c.s, dt); }
  return c.s;
}
/**
 * Dibuja el cometa de un proyectil en (px, py) de pantalla (el piso bajo el proyectil). Devuelve 'solo' si reemplaza
 * al sprite, 'encima' si el sprite de siempre va después, o null si este proyectil no arde.
 */
export function cometa(ctx: CanvasRenderingContext2D, p: { vx: number; vy: number; t: number; elem: string; deHeroe: boolean; efecto: string; hab?: { id: string } }, px: number, py: number, dt: number): 'solo' | 'encima' | null {
  const c = p.hab ? COMETAS[p.hab.id] : !p.deHeroe && p.elem === 'fuego' && !/flecha|virote/.test(p.efecto) ? COMETA_MONSTRUO : undefined;
  if (!c) return null;
  const s = colaDe(c.pal, dt), nuc = NUCLEO[c.pal] ?? NUCLEO.infierno!;
  // rumbo en pantalla (isométrica 2:1) y el centro a la altura de la mano
  const svx = p.vx - p.vy, svy = (p.vx + p.vy) / 2, ang = Math.atan2(svy, svx), cy = py - 34;
  const nace = Math.min(1, p.t * 7), lat = 1 + 0.07 * Math.sin(p.t * 31), r = c.r * nace * lat;
  ctx.save(); ctx.translate(px, cy);
  // halo: la bola alumbra el aire a su alrededor
  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3.4); halo.addColorStop(0, nuc[2] + '70'); halo.addColorStop(0.45, nuc[2] + '28'); halo.addColorStop(1, nuc[2] + '00');
  ctx.fillStyle = halo; ctx.fillRect(-r * 3.4, -r * 3.4, r * 6.8, r * 6.8);
  // la cola: la llama de Doom acostada, con el pie en el núcleo y la punta hacia atrás del rumbo
  ctx.save(); ctx.rotate(ang - Math.PI / 2); ctx.imageSmoothingEnabled = true;
  const w = s.f.w * c.ancho * nace, h = s.f.h * c.cola * 0.55 * nace;
  ctx.drawImage(s.llama.cv, -w / 2, -h + r * 0.55, w, h);
  ctx.restore();
  // el núcleo: blanco caliente adentro, color afuera, un poco achatado hacia el rumbo
  ctx.rotate(ang); ctx.scale(1.18, 0.9);
  const g = ctx.createRadialGradient(r * 0.15, 0, 0, 0, 0, r); g.addColorStop(0, nuc[0]); g.addColorStop(0.42, nuc[1]); g.addColorStop(0.8, nuc[2] + 'c0'); g.addColorStop(1, nuc[2] + '00');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  return c.encima ? 'encima' : 'solo';
}
