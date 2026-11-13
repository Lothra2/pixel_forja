// La portada de la Forja: fondo por capas con paralaje (cielo, nubes, relámpagos, ruinas, catedral con su luz, niebla,
// cementerio), ceniza y brasas, el título nuevo (fijo, revelado y en bucle) y las cartas ilustradas de cada acto.
// Todo se baja por partes: primero el fondo y el título fijo (lo que se ve), después las animaciones del título del
// idioma activo, y las cartas solo cuando hacen falta. Mientras algo no llega, se dibuja lo que hay.
import { ctx, W, H, E } from '../nucleo/lienzo';
import { IDI, TITULO, texto, envolver } from './comun';
import { BASE } from '../motor/assets';
import { Sonido } from '../audio/sonido';
import { fuegoTitulo } from './titulo_fuego';

const RAIZ = BASE + 'portada/';
let man: any = null;
let pidio = false;
const imgs = new Map<string, HTMLImageElement>();
const pedir = (ruta: string) => {
  if (imgs.has(ruta)) return imgs.get(ruta)!;
  const im = new Image(); im.decoding = 'async'; im.src = RAIZ + ruta; imgs.set(ruta, im); return im;
};
const lista = (ruta?: string) => { if (!ruta) return null; const im = pedir(ruta); return im.complete && im.naturalWidth ? im : null; };

/** Baja el manifiesto y lo primero que se ve. Se puede llamar muchas veces. */
export function prepararPortada() {
  if (pidio) return; pidio = true;
  fetch(RAIZ + 'portada.json').then((r) => r.json()).then((m) => {
    man = m;
    for (const c of m.fondo.capas) pedir(c.archivo);
    pedir(m.fondo.relampago.archivo); pedir(m.fondo.ceniza.archivo);
    for (const idi of ['es', 'en']) pedir(m.titulo[idi].fijo['800']);
    // las animaciones del título del idioma activo, después
    setTimeout(() => { const t = m.titulo[IDI ? 'en' : 'es']; for (const k of ['revelar', 'anim']) for (const h of t[k]['800'].hojas) pedir(h); }, 400);
  }).catch(() => { pidio = false; });
}
export const portadaLista = () => !!man && !!lista(man.fondo.capas[0].archivo) && !!lista(man.fondo.capas.find((c: any) => c.id === 'catedral')?.archivo);

// ------------------------------------------------------------------ estado de la escena
let t0 = -1, proxRayo = 1.4, rayo = -1, rayoEspejo = false, trueno = -1;
interface Part { x: number; y: number; vx: number; vy: number; s: number; a: number; f: number; v: number; vida?: number }
const parts = new Map<string, Part[]>();
const R = Math.random, entre = (r: [number, number]) => r[0] + R() * (r[1] - r[0]);

/** Reinicia la secuencia de entrada (negro, fondo, relámpago, título, botones). */
export function reiniciarPortada() { t0 = -1; proxRayo = 1.4; rayo = -1; trueno = -1; }
/** Segundos desde que se reinicia la portada hasta que el título termina de forjarse (para entrar con la música del menú). */
export function durForjaTitulo() { const rv = man?.titulo?.[IDI ? 'en' : 'es']?.revelar?.['800']; return 2.2 + (rv ? rv.cuadros / rv.fps : 3); }

/** Dibuja la portada. Devuelve el alfa de los botones (0 a 1) y dónde van, o null si todavía no está lista. */
export function dibujarPortada(tReal: number): { botones: number; yBotones: number } | null {
  prepararPortada();
  if (!portadaLista()) return null;
  if (t0 < 0) t0 = tReal;
  const t = tReal - t0;
  const f = man.fondo, base = man.base;
  // escala: cubre la pantalla con la base de 1280x720; en vertical se escala por alto y se centra en la catedral
  const vertical = H > W;
  const esc = vertical ? H / base.h : Math.max(W / base.w, H / base.h);
  const ox = vertical ? W / 2 - man.fondo.foco.x * esc : (W - base.w * esc) / 2, oy = (H - base.h * esc) / 2;
  const cam = f.camara;
  const cx = Math.sin((2 * Math.PI * t) / cam.periodo_x_s) * cam.deriva_x + (E.x / W - 0.5) * 2 * cam.raton;
  const cy = Math.sin((2 * Math.PI * t) / cam.periodo_y_s) * cam.deriva_y + (E.y / H - 0.5) * 2 * cam.raton * 0.3;
  const mx = f.capa.margen_x, my = f.capa.margen_y;
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const fondoK = Math.min(1, Math.max(0, (t - 0.2) / 1.6));
  // relámpagos: uno forzado a los 1.4 s y después cada 7 a 16 s
  const rel = f.relampago;
  if (t >= proxRayo && rayo < 0) { rayo = t; rayoEspejo = R() < 0.5; trueno = t + 0.4 + R() * 0.8; proxRayo = t + entre(rel.cada_s); }
  const iRayo = rayo >= 0 ? Math.floor((t - rayo) * rel.fps) : -1;
  if (iRayo >= rel.cuadros) rayo = -1;
  if (trueno > 0 && t >= trueno) { trueno = -1; Sonido.efecto('trueno' as any, { vol: 0.5 }); }
  const enRayo = rayo >= 0 && iRayo < rel.cuadros;
  const luzCat = Math.min(1, Math.max(0, (t - 1.4) / 1)) * (enRayo ? 0.5 : 1);
  const capa = (c: any, alfa = 1, dx = 0) => {
    const im = lista(c.archivo); if (!im) return;
    ctx.globalAlpha = alfa * fondoK; ctx.globalCompositeOperation = c.mezcla === 'sumar' || c.mezcla === 'lighter' ? 'lighter' : 'source-over';
    // capas animadas por cuadros (el fuego de Doom de la ciudad y de la catedral): una tira de cuadros puesta en (x, y)
    if (c.anim?.tipo === 'cuadros') {
      const a = c.anim, w = a.w ?? c.w, h = a.h ?? c.h, cols = a.columnas ?? Math.max(1, Math.floor((im as any).width / w)), n = Math.floor(t * a.fps) % a.cuadros;
      ctx.drawImage(im, (n % cols) * w, Math.floor(n / cols) * h, w, h, ox + ((c.x ?? 0) - mx - cx * c.paralaje) * esc, oy + ((c.y ?? 0) - my - cy * c.paralaje) * esc, w * esc, h * esc);
      return;
    }
    const x = ox + (-mx - cx * c.paralaje + dx) * esc, y = oy + (-my - cy * c.paralaje) * esc;
    ctx.drawImage(im, x, y, c.w * esc, c.h * esc);
    if (c.anim?.enrollar) { const w = c.w * esc; ctx.drawImage(im, x + (dx > 0 ? -w : w), y, w, c.h * esc); }
  };
  const ceniza = (despues: string) => {
    const cz = f.ceniza, im = lista(cz.archivo); if (!im) return;
    for (const pc of cz.particulas) {
      if (pc.despues_de !== despues) continue;
      let ps = parts.get(pc.fila + despues);
      if (!ps) { ps = Array.from({ length: pc.cantidad }, () => nueva(pc, true)); parts.set(pc.fila + despues, ps); }
      const fila = cz.filas[pc.fila];
      ctx.globalCompositeOperation = pc.mezcla === 'sumar' ? 'lighter' : 'source-over';
      for (const p of ps) {
        p.x += p.vx / 60; p.y += p.vy / 60; if (p.vida !== undefined) p.vida -= 1 / 60;
        if (p.x < -40 || p.x > base.w + 40 || p.y < -40 || p.y > base.h + 40 || (p.vida !== undefined && p.vida <= 0)) Object.assign(p, nueva(pc, false));
        const col = Math.floor((t * cz.fps + p.f) % cz.columnas);
        const x = ox + (p.x - cx * pc.paralaje + Math.sin(t * 1.3 + p.f) * pc.vaiven) * esc, y = oy + (p.y - cy * pc.paralaje) * esc, s = cz.celda * p.s * esc;
        ctx.globalAlpha = p.a * fondoK * (p.vida !== undefined ? Math.min(1, p.vida) : 1);
        ctx.drawImage(im, col * cz.celda, fila * cz.celda, cz.celda, cz.celda, x - s / 2, y - s / 2, s, s);
      }
    }
  };
  for (const c of f.capas) {
    if (c.id === 'vineta') continue;
    if (c.id === 'relampago') {
      if (enRayo) {
        const im = lista(rel.archivo); if (im) {
          const cw = rel.w, ch = rel.h, col = iRayo % rel.columnas, fila = Math.floor(iRayo / rel.columnas);
          const x = ox + (-mx - cx * c.paralaje) * esc, y = oy + (-my - cy * c.paralaje + rel.y_capa) * esc;
          ctx.globalAlpha = fondoK; ctx.globalCompositeOperation = 'lighter';
          if (rayoEspejo) { ctx.save(); ctx.translate(x + cw * esc, y); ctx.scale(-1, 1); ctx.drawImage(im, col * cw, fila * ch, cw, ch, 0, 0, cw * esc, ch * esc); ctx.restore(); }
          else ctx.drawImage(im, col * cw, fila * ch, cw, ch, x, y, cw * esc, ch * esc);
        }
      }
      continue;
    }
    let alfa = 1, dx = 0;
    if (c.anim?.tipo === 'deriva') dx = ((t * c.anim.px_por_segundo) % c.w + c.w) % c.w * Math.sign(c.anim.px_por_segundo || 1);
    if (c.anim?.tipo === 'titilar') alfa = 0.7 + 0.3 * (0.5 + 0.25 * Math.sin(t * 5.3 * 6.28) + 0.25 * Math.sin(t * 8.9 * 6.28 + 1));
    // en los relámpagos el fuego de la catedral baja (el de las ruinas no)
    if (c.id === 'catedral_fuego' && enRayo) alfa = 0.6;
    if (c.anim?.tipo === 'latir') alfa = (0.7 + 0.3 * (0.5 + 0.5 * Math.sin((t / c.anim.periodo_s) * 6.28))) * luzCat;
    capa(c, alfa, c.anim?.tipo === 'deriva' ? (c.anim.px_por_segundo < 0 ? -dx : dx) : 0);
    ceniza(c.id);
  }
  ctx.globalCompositeOperation = 'source-over';
  // destello del relámpago en toda la pantalla
  if (enRayo) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = rel.destello[iRayo] ?? 0; ctx.fillStyle = '#c8d8ff'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  const vin = f.capas.find((c: any) => c.id === 'vineta'); const iv = vin && lista(vin.archivo);
  if (iv) { ctx.globalAlpha = 1; ctx.drawImage(iv, 0, 0, W, H); }
  ctx.globalAlpha = 1;
  // título: el cuadro de 800 a 0.54 del ancho (0.96 en vertical), revelado a los 2.2 s y después en bucle
  dibujarTitulo(t - 2.2, vertical);
  ctx.restore();
  return { botones: Math.min(1, Math.max(0, (t - 4) / 0.5)), yBotones: H * 0.62 };
}
function nueva(pc: any, alAzar: boolean): Part {
  const b = man.base;
  const p: Part = { x: R() * b.w, y: alAzar ? R() * b.h : pc.vel_y[0] > 0 ? -20 : b.h + 20, vx: entre(pc.vel_x), vy: entre(pc.vel_y), s: entre(pc.escala), a: entre(pc.alfa), f: R() * 8, v: 0 };
  if (pc.nacen_en) { p.x = pc.nacen_en[0] + (R() - 0.5) * 30; p.y = pc.nacen_en[1] - R() * (alAzar ? 120 : 10); p.vida = 2 + R() * 2; }
  return p;
}
/** El título en su lugar de la portada; tRel < 0 todavía no aparece. */
function dibujarTitulo(tRel: number, vertical: boolean) {
  const ti = man.titulo[IDI ? 'en' : 'es'], col = man.titulo.colocacion?.[vertical ? 'movil_vertical' : 'escritorio'] ?? { ancho_rel: 0.54, centro_y_rel: 0.235 };
  const w = W * col.ancho_rel, h = w * 0.6, x = W / 2 - w / 2, y = H * col.centro_y_rel - h / 2;
  if (tRel < 0) return;
  const hoja = (a: any, i: number) => { const n = Math.floor(i / a.por_hoja), j = i % a.por_hoja; const im = lista(a.hojas[n]); if (!im) return false; ctx.drawImage(im, (j % a.columnas) * a.w, Math.floor(j / a.columnas) * a.h, a.w, a.h, x, y, w, h); return true; };
  const rv = ti.revelar['800'], an = ti.anim['800'];
  const iRev = Math.floor(tRel * rv.fps);
  // el fuego de Doom nace de las letras cuando terminan de forjarse y se queda ardiendo
  const fArde = Math.min(1, Math.max(0, (tRel - rv.cuadros / rv.fps + 0.6) / 1.4)), fijoIm = lista(ti.fijo['800']);
  fuegoTitulo(fijoIm, x, y, w, h, tRel, fArde, 'atras');
  if (iRev < rv.cuadros) { if (hoja(rv, iRev)) return; }
  else if (hoja(an, Math.floor((tRel - rv.cuadros / rv.fps) * an.fps) % an.cuadros)) { fuegoTitulo(fijoIm, x, y, w, h, tRel, fArde, 'adelante'); return; }
  // sin las hojas todavía: el título fijo, con un fundido
  const fijo = lista(ti.fijo['800']); if (fijo) { ctx.globalAlpha = Math.min(1, tRel / 1.2); ctx.drawImage(fijo, x, y, w, h); ctx.globalAlpha = 1; }
}
/** El título fijo nuevo en cualquier lugar (pantallas de carga, final). Devuelve false si todavía no llegó. */
export function tituloFijo(cx: number, cy: number, ancho: number, alfa = 1): boolean {
  prepararPortada(); if (!man) return false;
  const im = lista(man.titulo[IDI ? 'en' : 'es'].fijo['800']); if (!im) return false;
  const h = ancho * (im.naturalHeight / im.naturalWidth);
  ctx.save(); ctx.globalAlpha = alfa; ctx.drawImage(im, cx - ancho / 2, cy - h / 2, ancho, h); ctx.restore();
  return true;
}

// ------------------------------------------------------------------ cartas de acto
/** Pide la carta del acto (para tenerla lista antes del entreacto). */
export function prepararCarta(acto: number) { prepararPortada(); const c = man?.cartas.actos.find((a: any) => a.n === acto); if (c) pedir(c.archivo); }
/** Dibuja la carta del acto con su título y la narración. Devuelve false si todavía no está. */
export function dibujarCarta(acto: number, t: number, narracion: string, dur: number): boolean {
  prepararPortada(); if (!man) return false;
  const c = man.cartas.actos.find((a: any) => a.n === acto); if (!c) return false;
  const im = lista(c.archivo); if (!im) return false;
  const cw = man.cartas.w, ch = man.cartas.h, z = man.cartas.zonas;
  const esc = Math.max(W / cw, H / ch) * (1 + 0.04 * Math.min(1, t / 8));
  const ox = W / 2 - (cw * esc) / 2, oy = H / 2 - (ch * esc) / 2;
  const k = Math.min(1, t / 0.8, Math.max(0, (dur - t) / 0.8));
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = k;
  ctx.drawImage(im, ox, oy, cw * esc, ch * esc);
  const P = (zx: number, zy: number) => [ox + zx * esc, oy + zy * esc];
  const [tx, ty] = P(z.titulo.x + z.titulo.w / 2, z.titulo.y + z.titulo.h / 2);
  const tam = Math.round(z.titulo.h * esc * 0.42);
  const nombre = IDI ? c.en : c.es;
  ctx.globalAlpha = k * Math.min(1, Math.max(0, (t - 0.4) / 0.8));
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [3, 3]]) texto(nombre, tx + dx, ty + dy + tam * 0.35, { alin: 'center', tam, color: '#000', fuente: TITULO });
  texto(nombre, tx, ty + tam * 0.35, { alin: 'center', tam, color: c.color_titulo, fuente: TITULO });
  if (narracion) {
    const [nx, ny] = P(z.narracion.x + z.narracion.w / 2, z.narracion.y);
    const tn = Math.max(16, Math.round(23 * esc));
    ctx.globalAlpha = k * Math.min(1, Math.max(0, (t - 1.2) / 1));
    envolver(narracion, z.narracion.w * esc * 0.92, tn).slice(0, 4).forEach((l, i) => texto(l, nx, ny + tn * 1.3 + i * tn * 1.35, { alin: 'center', tam: tn, color: '#e8dcc0', fuente: TITULO }));
  }
  ctx.restore();
  return true;
}

/** Espera a que estén la portada y los títulos fijos (con tope), para que la secuencia arranque con todo y sin el título viejo. */
export async function esperarPortada(tope = 8000) {
  prepararPortada();
  const t0 = performance.now();
  while (performance.now() - t0 < tope) {
    if (portadaLista() && man && ['es', 'en'].every((i) => lista(man.titulo[i].fijo['800']))) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}
