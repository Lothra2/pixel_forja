// Luces del mundo: cada fuego, proyectil, hechizo y la antorcha del héroe es una luz con color.
// Sirve para tres cosas: sombras proyectadas de los personajes, reflejo de color en sus cuerpos y destellos.
import type { Cuadro } from '../motor/assets';
import { manifiesto, objetoMeta } from '../motor/assets';
import type { Juego, Ent } from '../juego/mundo';
import { R } from '../nucleo/azar';

export interface Luz {
  /** Punto del piso bajo la luz, en pantalla. */
  x: number; y: number;
  /** Altura de la llama sobre el piso, en pixeles de pantalla. */
  h: number;
  /** Alcance en pixeles de pantalla (sin aplastar). */
  r: number;
  c: [number, number, number];
  /** Intensidad 0 a 1. */
  k: number;
  /** Si la luz la lleva alguien, esa entidad no proyecta sombra con ella. */
  de?: Ent;
  /** Antorcha del héroe: alumbra pero no tiñe de color. */
  blanca?: boolean;
}

export const COLOR_ELEM: Record<string, [number, number, number]> = {
  fuego: [255, 120, 40], hielo: [90, 160, 255], frio: [90, 160, 255], rayo: [170, 190, 255], veneno: [90, 230, 70],
  sombra: [150, 70, 255], luz: [255, 225, 150], sagrado: [255, 225, 150], arcano: [200, 110, 255], hueso: [220, 215, 190],
  naturaleza: [120, 220, 90], fisico: [255, 200, 140], sangre: [230, 30, 30],
};
const hex = (c: [number, number, number], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export let luces: Luz[] = [];
(window as any).__luces = () => luces;
/** Destello global de la escena (explosiones grandes), 0 a 1. */
export let destello = 0;
export let destelloColor: [number, number, number] = [255, 200, 140];
/** Sol: dirección fija de sombra para zonas claras. */
let sol = 0;

export function recolectar(j: Juego, t: number, aPant: (x: number, y: number) => [number, number], W: number, H: number) {
  const z = j.zona, h = j.heroe;
  const L: Luz[] = [];
  const dentro = (x: number, y: number, r: number) => x > -r && x < W + r && y > -r && y < H + r;
  // antorcha del héroe
  const [hx, hy] = aPant(h.x, h.y);
  const osc = (j as any).oscurece ?? 0;
  const rLuz = ((z.tipo === 'pueblo' ? 420 : 210) + h.c.radio_luz * 18 + Math.sin(t * 7) * 3) * (osc > 0 ? 0.55 + 0.45 * Math.max(0, 1 - Math.sin((osc / 3.5) * Math.PI)) : 1);
  L.push({ x: hx, y: hy, h: 55, r: rLuz, c: [255, 210, 150], k: 1, de: h, blanca: true });
  if (h.c.vivo) {
    const cv = COLOR_ELEM[h.c.vivo === 'luz' ? 'sagrado' : h.c.vivo] ?? COLOR_ELEM.fuego;
    L.push({ x: hx + 10, y: hy, h: 40, r: 120, c: cv, k: 0.55 + Math.sin(t * 13) * 0.08, de: h });
  }
  // fuegos y objetos que alumbran
  for (const o of z.objetos) {
    const meta = objetoMeta(o.id, o.v); if (!meta || !meta.luz) continue;
    const [px, py] = aPant(o.cx + 0.5, o.cy + 0.5);
    if (!dentro(px, py, 320)) continue;
    const lc: any = meta.luz[1];
    const c: [number, number, number] = Array.isArray(lc) ? [lc[0], lc[1], lc[2]] : String(lc).includes(',') ? (String(lc).split(',').map(Number) as any) : [255, 150, 60];
    const r = Math.min(260, meta.luz[0] * 1.3) * (0.93 + Math.sin(t * 9 + o.cx) * 0.04 + R() * 0.03);
    L.push({ x: px, y: py, h: Math.max(20, meta.luz[2] * 1.2), r, c, k: 0.9 });
  }
  // proyectiles: luces que viajan
  for (const p of j.proyectiles) {
    const [px, py] = aPant(p.x, p.y);
    if (!dentro(px, py, 300)) continue;
    const el = (manifiesto().wm?.[p.efecto]?.elem as string) ?? p.elem;
    const c = COLOR_ELEM[p.elem === 'rayo' || el === 'rayo' ? 'rayo' : p.elem && p.elem !== 'fisico' ? p.elem : el] ?? COLOR_ELEM.fisico;
    const fuerte = el === 'rayo' || p.elem === 'rayo' ? 1.35 : p.arco ? 0.5 : 1;
    L.push({ x: px, y: py, h: Math.max(18, (p.z ?? 0) * 1.2 + 30), r: 200 * fuerte + Math.sin(t * 30 + p.x) * 10, c, k: Math.min(1, 0.85 * fuerte) });
  }
  // hechizos y explosiones: luz que se apaga; los impactos dan un destello
  let fl = 0; let flc: [number, number, number] = destelloColor;
  for (const e of j.efectos) {
    const [px, py] = aPant(e.x, e.y);
    if (!dentro(px, py, 300)) continue;
    const meta = manifiesto().wm?.[e.id];
    const c = COLOR_ELEM[meta?.elem ?? (e.id === 'arco_cadena' ? 'rayo' : 'fisico')] ?? COLOR_ELEM.fisico;
    const dur = e.dur ?? 1;
    const k = Math.max(0, 1 - e.t / dur);
    const impacto = meta && !meta.bucle && (meta.tipo === 'impacto' || meta.tipo === 'lluvia' || meta.tipo === 'area');
    const golpe = impacto ? Math.max(0, 1 - e.t / 0.25) : 0;
    L.push({ x: px, y: py, h: 40 + (e.z ?? 0), r: (150 * (e.escala ?? 1)) * (0.4 + k * 0.6) + 40 + golpe * 120, c, k: Math.min(1, 0.45 * k + golpe * 0.8) });
    if (impacto && meta.elem !== 'fisico' && meta.elem !== 'hueso') { const f = golpe * Math.min(1, (e.escala ?? 1)); if (f > fl) { fl = f; flc = c; } }
    if (e.id === 'arco_cadena' && (e as any).x2 !== undefined) {
      const [bx, by] = aPant((e as any).x2, (e as any).y2);
      L.push({ x: (px + bx) / 2, y: (py + by) / 2, h: 34, r: 220, c: COLOR_ELEM.rayo, k: k });
    }
  }
  for (const a of j.areas) if (a.retraso <= 0 && a.elem && a.elem !== 'fisico') {
    const [px, py] = aPant(a.x, a.y);
    if (!dentro(px, py, 300)) continue;
    L.push({ x: px, y: py, h: 20, r: a.radio * 32 + 40, c: COLOR_ELEM[a.elem] ?? COLOR_ELEM.fuego, k: 0.6 + Math.sin(t * 11 + a.x) * 0.08 });
  }
  // portal
  if (j.portal) {
    const pz = (j as any).portalZona === z.id ? aPant(j.portal.x, j.portal.y) : z.tipo === 'pueblo' && z.entradas.portal ? aPant(z.entradas.portal[0] + 0.5, z.entradas.portal[1] - 1) : null;
    if (pz) L.push({ x: pz[0], y: pz[1], h: 40, r: 160, c: [70, 130, 255], k: 0.8 });
  }
  luces = L;
  destello = Math.max(destello * 0.82, fl); destelloColor = fl > 0 ? flc : destelloColor;
  sol = z.tipo === 'mazmorra' ? 0 : Math.max(0, 0.6 - z.oscuridad);
}

// lienzo de trabajo para siluetas
const tmp = document.createElement('canvas');
const tctx = tmp.getContext('2d')!;
function silueta(q: Cuadro, relleno: string | CanvasGradient): boolean {
  const im = q.img; if (!im) return false;
  if (tmp.width < q.w || tmp.height < q.h) { tmp.width = Math.max(tmp.width, q.w); tmp.height = Math.max(tmp.height, q.h); }
  tctx.globalCompositeOperation = 'copy';
  tctx.drawImage(im, q.x, q.y, q.w, q.h, 0, 0, q.w, q.h);
  tctx.globalCompositeOperation = 'source-in';
  tctx.fillStyle = relleno; tctx.fillRect(0, 0, q.w, q.h);
  tctx.globalCompositeOperation = 'source-over';
  return true;
}

interface Influencia { l: Luz; f: number; gx: number; gy: number; d: number }
function influencias(e: Ent, px: number, py: number): Influencia[] {
  const out: Influencia[] = [];
  for (const l of luces) {
    if (l.de === e) continue;
    const gx = px - l.x, gy = (py - l.y) * 2; // piso sin aplastar
    const d = Math.hypot(gx, gy);
    if (d >= l.r) continue;
    const f = l.k * Math.pow(1 - d / l.r, 0.8);
    if (f < 0.04) continue;
    out.push({ l, f, gx, gy, d });
  }
  out.sort((a, b) => b.f - a.f);
  return out.slice(0, 3);
}

/** Sombras del personaje: una por cada luz cercana, estiradas lejos de ella y más suaves con la distancia. */
export function sombras(ctx: CanvasRenderingContext2D, e: Ent, q: Cuadro, px: number, py: number, esc: number) {
  // sombra de contacto, siempre: ancla los pies al piso
  const rr = (e.radio / 0.45) * 0.9 * esc;
  ctx.save(); ctx.globalAlpha = 0.32; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(px, py, rr * 11, rr * 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  if (!q.img) return;
  const inf = influencias(e, px, py);
  const lista: { gx: number; gy: number; len: number; a: number }[] = [];
  for (const i of inf) {
    if (i.d < 6) continue;
    const len = Math.max(0.45, Math.min(2.2, (i.d / i.l.h) * 0.95));
    lista.push({ gx: i.gx / i.d, gy: i.gy / i.d, len, a: Math.min(1, 1.1 * i.f) });
  }
  if (sol > 0) lista.push({ gx: 0.55, gy: -0.83, len: 0.85, a: sol * 0.7 });
  if (!lista.length) return;
  if (!silueta(q, '#000')) return;
  const n = lista.length;
  const norm = n > 2 ? Math.sqrt(2 / n) : 1;
  for (const s of lista) {
    // eje de la altura: hacia afuera de la luz, sobre el piso. Eje del ancho: perpendicular, también en el piso.
    const cx = -s.gx * s.len, cy = -s.gy * 0.5 * s.len;
    let ux = -s.gy, uy = s.gx; if (ux < 0) { ux = -ux; uy = -uy; }
    const ax = ux, ay = uy * 0.5;
    const alfa = Math.min(0.72, s.a * norm);
    // tres copias corridas: bordes suaves y la punta más difusa
    for (let c = 0; c < 3; c++) {
      const k = 1 + (c - 1) * 0.07;
      ctx.save();
      ctx.globalAlpha = alfa / (c === 1 ? 2 : 4);
      ctx.translate(px + (c - 1) * 0.8, py);
      ctx.transform(ax, ay, cx * k, cy * k, 0, 0);
      ctx.drawImage(tmp, 0, 0, q.w, q.h, -q.ax * esc, -q.ay * esc, q.w * esc, q.h * esc);
      ctx.restore();
    }
  }
}

/** Reflejo de las luces de color sobre el cuerpo: el lado que mira a la luz se enciende con su color. */
export function reflejos(ctx: CanvasRenderingContext2D, e: Ent, q: Cuadro, px: number, py: number, esc: number) {
  if (!q.img) return;
  const inf = influencias(e, px, py).filter((i) => !i.l.blanca).slice(0, 2);
  for (const i of inf) {
    const fuerza = Math.min(0.5, i.f * 0.6);
    if (fuerza < 0.06) continue;
    // degradado en coordenadas del sprite: desde el lado de la luz hacia el otro
    const dx = i.d > 1 ? -i.gx / i.d : 0, dy = i.d > 1 ? -i.gy / i.d * 0.5 : 1;
    const mx = q.ax, my = q.ay * 0.55;
    const ext = Math.max(q.w, q.h) * 0.6;
    const g = tctx.createLinearGradient(mx + dx * ext, my + dy * ext - (i.l.h > 30 ? ext * 0.3 : 0), mx - dx * ext, my - dy * ext);
    g.addColorStop(0, hex(i.l.c, 1)); g.addColorStop(0.35, hex(i.l.c, 0.35)); g.addColorStop(0.75, hex(i.l.c, 0));
    if (!silueta(q, g)) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fuerza;
    ctx.drawImage(tmp, 0, 0, q.w, q.h, px - q.ax * esc, py - q.ay * esc, q.w * esc, q.h * esc);
    ctx.restore();
  }
}
