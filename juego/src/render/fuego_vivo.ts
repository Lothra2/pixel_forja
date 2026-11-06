// Fuego vivo de los objetos del mapa (fuego de Doom de la Forja): cada antorcha, brasero, pira, vela o vitral de la tabla
// FUEGOS_DOOM se dibuja como su gemelo sin llama y encima un autómata de fuego que corre en vivo. La luz toma el pulso
// de la llama, así las sombras tiemblan con ella. Hay un tope de fuegos vivos (12 en táctil, 24 en escritorio), los más
// cercanos al héroe; los demás muestran el sprite original con la llama horneada.
import * as D from '../../../src/engine/gotico/fuego_doom';
import { FUEGOS_DOOM, opcionesDeSpec, TEMAS_FRIOS, type FuegoMundoDoom } from '../../../src/engine/gotico/datos/fuegos_doom';
import { ZONAS } from '../mundo/actos';
import { E } from '../nucleo/lienzo';
import { BASE } from '../motor/assets';
import { finalCompleto, decisionesDe } from '../juego/historia';
import type { Juego } from '../juego/mundo';
import type { ObjZ, Zona } from '../mundo/zona';

interface Capa { cv: HTMLCanvasElement; g: CanvasRenderingContext2D; img: ImageData }
export interface Vivo {
  f: D.Fuego; s: FuegoMundoDoom; paleta: D.NombrePaleta; normal: boolean;
  humo: Capa | null; llama: Capa; mezcla?: Capa; mascara?: HTMLCanvasElement;
  visto: number; brasa: number; dt: number; luz: [number, number, number];
}

const capa = (w: number, h: number): Capa => {
  const cv = document.createElement('canvas'); cv.width = Math.max(1, w); cv.height = Math.max(1, h);
  const g = cv.getContext('2d')!; return { cv, g, img: g.createImageData(cv.width, cv.height) };
};
export const hexRgb = (h: string): [number, number, number] => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

/** Las máscaras de los vitrales (PNG chicos de la Forja): la forma del fuego sale de su alfa. */
const mascaras = new Map<string, { cv: HTMLCanvasElement; alfa: Uint8Array; w: number; h: number } | null>();
function mascara(archivo: string) {
  if (mascaras.has(archivo)) return mascaras.get(archivo);
  mascaras.set(archivo, null);
  const im = new Image();
  im.onload = () => {
    const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
    const g = cv.getContext('2d')!; g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, im.width, im.height).data, alfa = new Uint8Array(im.width * im.height);
    for (let i = 0; i < alfa.length; i++) alfa[i] = d[i * 4 + 3];
    mascaras.set(archivo, { cv, alfa, w: im.width, h: im.height });
  };
  im.src = BASE + archivo;
  return null;
}

/** Regla del fuego frío: en los temas fríos y en los actos 4 y 7 (no en los campamentos) el fuego es de ánimas; con el final de la Corona Fría, el acto 7 arde con ella. */
function paletaZona(j: Juego, z: Zona): D.NombrePaleta | null {
  if (z.tipo === 'pueblo') return null;
  const tema = ZONAS[z.id]?.tema ?? '';
  if (z.acto === 7) { try { if (decisionesDe(j.heroe.d).corona && finalCompleto(j.heroe.d) === 'corona_fria') return 'corona_fria'; } catch { /* sin historia */ } }
  if (TEMAS_FRIOS.has(tema) || z.acto === 4 || z.acto === 7) return 'animas';
  return null;
}

const vivos = new Map<string, Vivo>();
const activos = new Map<ObjZ, Vivo[]>();
let zonaClave = '', cuadro = 0, frio: D.NombrePaleta | null = null;
export const statsFuego = { vivos: 0, candidatos: 0, ms: 0, msDibujo: 0, msDibujoUlt: 0 };

function crear(s: FuegoMundoDoom, pal: D.NombrePaleta | null): Vivo | null {
  let forma: { forma: D.Forma } | undefined;
  let mcv: HTMLCanvasElement | undefined;
  if (s.forma.tipo === 'mascara') {
    const m = mascara(s.forma.archivo); if (!m) return null;
    forma = D.formaDesdeMascara(m.alfa, s.forma.caja[2], s.forma.caja[3], s.celda, { relleno: s.forma.relleno, escala255: true });
    mcv = m.cv;
  }
  const o = opcionesDeSpec(s, forma);
  // la catedral y los vitrales son del acto 1: el fuego frío solo cambia los fuegos comunes
  const paleta = pal && s.clase !== 'vitral' && s.clase !== 'puerta' && s.paleta !== 'veneno' ? pal : s.paleta;
  if (paleta !== s.paleta) { o.paleta = paleta; o.hueco = Math.max(o.hueco ?? 0, paleta === 'animas' ? 0.5 : 0.3); }
  const f = D.crearFuego(o);
  const normal = D.PALETAS[paleta].mezcla === 'normal';
  const v: Vivo = {
    f, s, paleta, normal, humo: normal ? null : capa(f.w, f.h), llama: capa(f.w, f.h), visto: cuadro, brasa: 0, dt: 0,
    luz: hexRgb(paleta === s.paleta ? s.luz.color : D.PALETAS[paleta].luz),
  };
  if (mcv) { v.mascara = mcv; v.mezcla = capa((s.forma as any).caja[2], (s.forma as any).caja[3]); }
  return v;
}

function pintarVivo(v: Vivo) {
  const { f } = v;
  if (v.normal) { D.pintar(f, v.llama.img.data, f.w, f.h, 1, { capa: 'todo' }); v.llama.g.putImageData(v.llama.img, 0, 0); return; }
  D.pintar(f, v.llama.img.data, f.w, f.h, 1, { capa: 'llama' }); v.llama.g.putImageData(v.llama.img, 0, 0);
  if (v.humo && v.s.humo > 0) { D.pintar(f, v.humo.img.data, f.w, f.h, 1, { capa: 'humo' }); v.humo.g.putImageData(v.humo.img, 0, 0); }
  if (v.mascara && v.mezcla) {
    // el vitral: la llama agrandada y recortada con la forma de los vidrios
    const g = v.mezcla.g, [, , cw, ch] = (v.s.forma as any).caja as number[];
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, cw, ch); g.imageSmoothingEnabled = true;
    g.drawImage(v.llama.cv, 0, 0, f.w * v.s.celda, f.h * v.s.celda);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(v.mascara, 0, 0);
    g.globalCompositeOperation = 'source-over';
  }
}

/** Una vez por cuadro, antes de juntar las luces: elige qué fuegos viven, los avanza, los pinta y suelta sus chispas. */
export function prepararFuegos(j: Juego, dt: number, aPant: (x: number, y: number) => [number, number], W: number, H: number) {
  const t0 = performance.now();
  statsFuego.msDibujoUlt = statsFuego.msDibujo; statsFuego.msDibujo = 0;
  const z = j.zona; cuadro++;
  activos.clear();
  if ((window as any).__sinFuegoDoom) { statsFuego.vivos = 0; return; }
  const clave = z.id + ':' + z.semilla;
  if (clave !== zonaClave) { vivos.clear(); zonaClave = clave; frio = paletaZona(j, z); }
  const [hx, hy] = aPant(j.heroe.x, j.heroe.y);
  const cands: { o: ObjZ; ss: FuegoMundoDoom[]; d: number; vitral: boolean }[] = [];
  for (const o of z.objetos) {
    const ss = FUEGOS_DOOM[o.id + '|' + o.v]; if (!ss) continue;
    const [px, py] = aPant(o.cx + 0.5, o.cy + 0.5);
    const vitral = ss[0].clase === 'vitral', m = vitral ? 500 : 160;
    if (px < -m || px > W + m || py < -80 || py > H + (vitral ? 600 : 260)) continue;
    cands.push({ o, ss, d: (px - hx) ** 2 + (py - hy) ** 2, vitral });
  }
  cands.sort((a, b) => a.d - b.d);
  const tope = E.tactil ? 12 : 24;
  let n = 0;
  for (const c of cands) {
    if (!c.vitral && n >= tope) continue;
    const lista: Vivo[] = [];
    c.ss.forEach((s, i) => {
      const k = `${c.o.cx},${c.o.cy},${i}`;
      let v = vivos.get(k);
      if (!v) { const nv = crear(s, frio); if (!nv) return; v = nv; vivos.set(k, v); }
      // lo que estuvo fuera de pantalla se quedó congelado: al volver se pone al día
      if (v.visto < cuadro - 1) D.pasos(v.f, 20);
      v.visto = cuadro;
      // los vitrales en táctil van a 12.5 cuadros por segundo
      v.dt += dt;
      if (c.vitral && E.tactil && (cuadro & 1)) { lista.push(v); return; }
      D.paso(v.f, v.dt); v.dt = 0;
      pintarVivo(v);
      // chispas desde las puntas calientes
      v.brasa += s.brasas * dt;
      while (v.brasa >= 1) {
        v.brasa--;
        const b = D.brasas(v.f, 1)[0]; if (!b || j.particulas.length > 650) continue;
        const ox = s.boca[0] - (v.f.w * s.celda) / 2 + b.x * s.celda, oy = s.boca[1] - v.f.h * s.celda + b.y * s.celda;
        j.particulas.push({ x: c.o.cx + 0.5 + ox / 32, y: c.o.cy + 0.5 - ox / 32, z: -oy, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, vz: 18 + Math.random() * 26, t: 0, dur: 0.6 + Math.random() * 0.7, color: Math.random() < 0.5 ? D.PALETAS[v.paleta].luz : '#ffd080', tam: 1.2, tipo: 'brasa' } as any);
      }
      lista.push(v);
    });
    if (lista.length) { activos.set(c.o, lista); if (!c.vitral) n++; }
  }
  statsFuego.vivos = n; statsFuego.candidatos = cands.length;
  statsFuego.ms = performance.now() - t0;
}

/** Los fuegos vivos de este objeto en este cuadro (o nada: se dibuja el original con su llama horneada). */
export const vivosDe = (o: ObjZ) => activos.get(o);
/** Hay fuego de Doom para este objeto (vivo o no): entonces no lleva el fuego viejo encima. */
export const tieneFuegoDoom = (o: ObjZ) => !!FUEGOS_DOOM[o.id + '|' + o.v];

/** Dibuja los fuegos vivos de un objeto sobre su gemelo sin llama (ancla en px, py). */
export function dibujarVivos(ctx: CanvasRenderingContext2D, vs: Vivo[], px: number, py: number, alfa = 1) {
  const t0 = performance.now();
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = alfa;
  for (const v of vs) {
    const { s, f } = v;
    if (v.mezcla) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(v.mezcla.cv, Math.round(px + (s.forma as any).caja[0]), Math.round(py + (s.forma as any).caja[1])); continue; }
    const w = f.w * s.celda, h = f.h * s.celda, x = Math.round(px + s.boca[0] - w / 2), y = Math.round(py + s.boca[1] - h);
    if (v.normal) { ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(v.llama.cv, x, y, w, h); continue; }
    if (v.humo && s.humo > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(v.humo.cv, x, y, w, h); }
    ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(v.llama.cv, x, y, w, h);
  }
  ctx.restore();
  statsFuego.msDibujo += performance.now() - t0;
}
(window as any).__fuegos = statsFuego;
