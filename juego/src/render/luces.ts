// Luces del mundo: cada fuego, proyectil, hechizo y la antorcha del héroe es una luz con color.
// Sirve para tres cosas: sombras proyectadas de los personajes, reflejo de color en sus cuerpos y destellos.
import type { Cuadro } from '../motor/assets';
import { LUZ_EFECTO, intensidadLuz, rgbLuz } from '../../../src/engine/gotico/luz_efectos';
import { manifiesto, objetoMeta } from '../motor/assets';
import type { Juego, Ent } from '../juego/mundo';
import { R } from '../nucleo/azar';
import { auraEquipo } from '../juego/visual';
import { lucesOzmaren, ALTO_OZMAREN } from './fuego';

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
  /** Alumbra pero no proyecta sombras (lo que lleva el héroe encima). */
  sinSombra?: boolean;
  /** Identidad estable entre cuadros, para suavizar las sombras. */
  id?: string;
  /** Prioridad de los poderes (0 imprescindible a 3 adorno): pesa en el tope de luces. */
  prio?: number;
}

export const COLOR_ELEM: Record<string, [number, number, number]> = {
  fuego: [255, 120, 40], hielo: [90, 160, 255], frio: [90, 160, 255], rayo: [170, 190, 255], veneno: [90, 230, 70],
  sombra: [150, 70, 255], luz: [255, 225, 150], sagrado: [255, 225, 150], arcano: [200, 110, 255], hueso: [220, 215, 190],
  naturaleza: [120, 220, 90], fisico: [255, 200, 140], sangre: [230, 30, 30],
};
const hex = (c: [number, number, number], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

const LUZ_RAREZA: Record<string, [number, number, number]> = { raro: [255, 230, 90], conjunto: [90, 230, 90], unico: [210, 170, 90], legendario: [255, 110, 40] };
const ids = new WeakMap<object, string>(); let nId = 0;
const idDe = (o: object) => { let v = ids.get(o); if (!v) { v = 'x' + nId++; ids.set(o, v); } return v; };
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
  L.push({ x: hx, y: hy, h: 55, r: rLuz, c: [255, 210, 150], k: 1, de: h, blanca: true, sinSombra: true });
  if (h.c.vivo) {
    const cv = COLOR_ELEM[h.c.vivo === 'luz' ? 'sagrado' : h.c.vivo] ?? COLOR_ELEM.fuego;
    L.push({ x: hx + 10, y: hy, h: 40, r: 120, c: cv, k: 0.55 + Math.sin(t * 13) * 0.08, de: h, sinSombra: true });
  }
  // equipo legendario: el héroe mismo da una luz de su color
  const au = auraEquipo(h.d.equipo as any);
  if (au) L.push({ x: hx, y: hy, h: 45, r: 110 + au.k * 70, c: au.color, k: (0.35 + au.k * 0.35) * (0.85 + Math.sin(t * 3) * 0.15), de: h, sinSombra: true });
  // fuegos y objetos que alumbran
  for (const o of z.objetos) {
    const meta = objetoMeta(o.id, o.v); if (!meta || !meta.luz) continue;
    // ríos de lava: un tramo de cada dos alumbra (la luz es grande y se solapa); igual se ve continuo
    if (/rio_lava/.test(o.id) && (Math.floor(o.cx / 5) + Math.floor(o.cy / 5)) % 2) continue;
    const [px, py] = aPant(o.cx + 0.5, o.cy + 0.5);
    if (!dentro(px, py, 320)) continue;
    const lc: any = meta.luz[1];
    const c: [number, number, number] = Array.isArray(lc) ? [lc[0], lc[1], lc[2]] : String(lc).includes(',') ? (String(lc).split(',').map(Number) as any) : [255, 150, 60];
    const r = Math.min(260, meta.luz[0] * 1.3) * (0.93 + Math.sin(t * 9 + o.cx) * 0.04 + R() * 0.03);
    L.push({ x: px, y: py, h: Math.max(20, meta.luz[2] * 1.2), r, c, k: 0.9, id: `o${o.cx},${o.cy}` });
  }
  // la pieza ancla del mapa (la catedral): luna fría encima para que se lea de lejos, y el latido rojo de sus vitrales
  for (const sa of z.salidas) if (sa.piezas?.length) {
    const fa = sa.piezas[sa.piezas.length - 1], [px, py] = aPant(fa.cx + 0.5, fa.cy - 4);
    if (!dentro(px, py, 700)) continue;
    L.push({ id: 'ancla0', x: px, y: py - 120, h: 260, r: 520, c: [150, 165, 210], k: 0.55, sinSombra: true });
    L.push({ id: 'ancla1', x: px, y: py - 60, h: 90, r: 260, c: [255, 50, 40], k: 0.25 + 0.15 * (0.5 + 0.5 * Math.sin(t * 1.4)), sinSombra: true });
    // la puerta abierta: luz roja fuerte justo afuera del umbral, con el pulso de los vitrales; tiñe el piso, al héroe, a Thor y a las
    // lápidas y les saca sombras largas hacia afuera (con sombra, a propósito)
    if (fa.v !== 'sellada') { const [dx, dy] = aPant(fa.cx + 0.5, fa.cy + 2); const pulso = 0.5 + 0.5 * Math.sin(t * 1.4); L.push({ id: 'puerta', x: dx, y: dy, h: 22, r: 150 + pulso * 25, c: [255, 58, 18], k: 0.8 + pulso * 0.2 }); }
  }
  // proyectiles: la luz viaja con ellos (tabla de la Forja: color, radio, curva, parpadeo); un abanico de más de 3 es una sola luz
  const salvas = new Map<any, { x: number; y: number; n: number; p: any }>();
  for (const p of j.proyectiles) {
    const LE = LUZ_EFECTO[p.efecto];
    if (p.salva && LE?.enVuelo) { const s = salvas.get(p.salva) ?? { x: 0, y: 0, n: 0, p }; s.x += p.x; s.y += p.y; s.n++; salvas.set(p.salva, s); }
  }
  const unaPorSalva = new Set<any>();
  for (const [k, s] of salvas) if (s.n > 3) unaPorSalva.add(k);
  const hechas = new Set<any>();
  for (const p of j.proyectiles) {
    const LE = LUZ_EFECTO[p.efecto];
    let x = p.x, y = p.y, rk = 1;
    if (p.salva && unaPorSalva.has(p.salva)) { if (hechas.has(p.salva)) continue; hechas.add(p.salva); const s = salvas.get(p.salva)!; x = s.x / s.n; y = s.y / s.n; rk = 1.3; }
    const [px, py] = aPant(x, y);
    if (!dentro(px, py, 300)) continue;
    if (LE) {
      if (!LE.enVuelo || LE.intensidad <= 0 || LE.radio <= 0) continue;
      const k = intensidadLuz(p.efecto, (manifiesto().wm?.[p.efecto]?.t ?? 2) / 25, p.t, true) * (1 - (LE.parpadeo ?? 0) * R());
      if (k <= 0.02) continue;
      L.push({ id: idDe(p), x: px, y: py, h: Math.max(18, (p.z ?? 0) * 1.2), r: LE.radio * rk, c: rgbLuz(p.efecto), k, sinSombra: !LE.sombra, prio: LE.prioridad ?? 1 });
      continue;
    }
    const el = (manifiesto().wm?.[p.efecto]?.elem as string) ?? p.elem;
    const c = COLOR_ELEM[p.elem === 'rayo' || el === 'rayo' ? 'rayo' : p.elem && p.elem !== 'fisico' ? p.elem : el] ?? COLOR_ELEM.fisico;
    const fuerte = el === 'rayo' || p.elem === 'rayo' ? 1.35 : p.arco ? 0.5 : 1;
    L.push({ id: idDe(p), x: px, y: py, h: Math.max(18, (p.z ?? 0) * 1.2 + 30), r: 200 * fuerte * rk + Math.sin(t * 30 + p.x) * 10, c, k: Math.min(1, 0.85 * fuerte), prio: 1 });
  }
  // fogonazo en la mano del héroe al lanzar
  for (const fg of ((j as any).fogonazos ?? []) as { t: number; dur: number; r: number; k: number; id: string }[]) {
    const q = Math.max(0, 1 - fg.t / fg.dur); if (q <= 0) continue;
    L.push({ x: hx + 8, y: hy, h: 46, r: fg.r, c: rgbLuz(fg.id), k: fg.k * q, de: h, sinSombra: true, prio: 1 });
  }
  // hechizos y explosiones: luz que se apaga; los impactos dan un destello
  let fl = 0; let flc: [number, number, number] = destelloColor;
  for (const e of j.efectos) {
    const [px, py] = aPant(e.x, e.y);
    if (!dentro(px, py, 300)) continue;
    const meta = manifiesto().wm?.[e.id];
    const LE = LUZ_EFECTO[e.id];
    if (LE && meta) {
      // curva por cuadro de la Forja; los de prioridad 0 además dan el destello de pantalla
      const n = LE.curva.length, fi = Math.floor((e.t * 25) / (meta.t ?? 2));
      const cv = meta.bucle ? LE.curva[fi % n] : fi < n ? LE.curva[fi] : 0;
      const k = LE.intensidad * cv * (1 - (LE.parpadeo ?? 0) * R());
      if (k <= 0.01 || LE.radio <= 0) continue;
      const esc = e.escala ?? 1, c = rgbLuz(e.id);
      L.push({ id: idDe(e), x: px, y: py, h: LE.altura * esc + (e.z ?? 0), r: LE.radio * esc, c, k: Math.min(1, k), sinSombra: !LE.sombra, prio: LE.prioridad ?? 2 });
      if ((LE.prioridad ?? 2) === 0) { const f = k * Math.min(1, esc); if (f > fl) { fl = f; flc = c; } }
      if (e.id === 'arco_cadena' && (e as any).x2 !== undefined) { const [bx, by] = aPant((e as any).x2, (e as any).y2); L.push({ id: idDe(e) + 'b', x: (px + bx) / 2, y: (py + by) / 2, h: 34, r: LE.radio, c, k: Math.min(1, k), prio: 0, sinSombra: !LE.sombra }); }
      continue;
    }
    const c = COLOR_ELEM[meta?.elem ?? (e.id === 'arco_cadena' ? 'rayo' : 'fisico')] ?? COLOR_ELEM.fisico;
    const dur = e.dur ?? 1;
    const k = Math.max(0, 1 - e.t / dur);
    const impacto = meta && !meta.bucle && (meta.tipo === 'impacto' || meta.tipo === 'lluvia' || meta.tipo === 'area');
    const golpe = impacto ? Math.max(0, 1 - e.t / 0.25) : 0;
    L.push({ id: idDe(e), x: px, y: py, h: 40 + (e.z ?? 0), r: (150 * (e.escala ?? 1)) * (0.4 + k * 0.6) + 40 + golpe * 120, c, k: Math.min(1, 0.45 * k + golpe * 0.8) });
    if (impacto && meta.elem !== 'fisico' && meta.elem !== 'hueso') { const f = golpe * Math.min(1, (e.escala ?? 1)); if (f > fl) { fl = f; flc = c; } }
    if (e.id === 'arco_cadena' && (e as any).x2 !== undefined) {
      const [bx, by] = aPant((e as any).x2, (e as any).y2);
      L.push({ id: idDe(e) + 'b', x: (px + bx) / 2, y: (py + by) / 2, h: 34, r: 220, c: COLOR_ELEM.rayo, k: k });
    }
  }
  for (const a of j.areas) if (a.retraso <= 0 && a.elem && a.elem !== 'fisico') {
    const [px, py] = aPant(a.x, a.y);
    if (!dentro(px, py, 300)) continue;
    L.push({ id: idDe(a), x: px, y: py, h: 20, r: a.radio * 32 + 40, c: COLOR_ELEM[a.elem] ?? COLOR_ELEM.fuego, k: 0.6 + Math.sin(t * 11 + a.x) * 0.08 });
  }
  // Ozmaren arde: una luz naranja que palpita, más fuerte cuando abre el pecho
  for (const m of j.monstruos) {
    if (m.muerto || m.def.sprite !== 'jefe_ozmaren') continue;
    const [px, py] = aPant(m.x, m.y); if (!dentro(px, py, 400)) continue;
    const furia = Math.min(1, (m.fase ?? 0) * 0.6 + (m.acc === 'lanzar' || (m.acc as string) === 'especial' ? 0.6 : 0));
    for (const [i, l] of lucesOzmaren(px, py, ALTO_OZMAREN * (m.escala ?? 1), t, furia).entries()) L.push({ id: 'oz' + i, x: l.x, y: l.y, h: l.h, r: l.r, c: l.nucleo ? [255, 150 + Math.round(l.k * 60), 60] : [255, 95 + Math.round(l.k * 40), 25], k: l.k, de: m });
  }
  // la Campana que Ahoga: luz de mar verde que respira y crece con cada tañido; Aun-Saar: luz blanca dorada y la boca del pecho que late
  for (const m of j.monstruos) {
    if (m.muerto) continue;
    const sp = m.def.sprite;
    if (sp !== 'jefe_campana_ahoga' && sp !== 'jefe_aun_saar') continue;
    const [px, py] = aPant(m.x, m.y); if (!dentro(px, py, 420)) continue;
    const esp = m.acc === 'lanzar' || (m.acc as string) === 'especial' ? 1 : 0;
    const es = m.escala ?? 1;
    if (sp === 'jefe_campana_ahoga') {
      const tan = esp ? 0.5 + 0.5 * Math.abs(Math.sin(t * 6)) : 0;
      L.push({ id: 'ca0', x: px, y: py - 60 * es, h: 70 * es, r: 190 + tan * 90 + Math.sin(t * 1.3) * 12, c: [70, 220, 190], k: 0.7 + tan * 0.3 + Math.sin(t * 1.3) * 0.06, de: m });
      L.push({ id: 'ca1', x: px, y: py - 20 * es, h: 24, r: 120 + tan * 60, c: [120, 255, 220], k: 0.35 + tan * 0.4, de: m, sinSombra: true });
    } else {
      const pulso = 0.5 + 0.5 * Math.sin(t * 2.4) * Math.sin(t * 0.9 + 1);
      L.push({ id: 'as0', x: px, y: py - 150 * es, h: 160 * es, r: 260 + Math.sin(t * 0.8) * 15, c: [255, 240, 205], k: 0.75 + (m.fase ?? 0) * 0.08, de: m });
      L.push({ id: 'as1', x: px, y: py - 120 * es, h: 120 * es, r: 140 + pulso * 70 + esp * 90, c: [255, 205, 110], k: 0.45 + pulso * 0.35 + esp * 0.3, de: m, sinSombra: true });
    }
  }
  // grietas de lava del piso: brillan y respiran
  for (const mk of z.marcas) if (mk.tipo === 'lava' && mk.cx % 2 === 0) {
    const [px, py] = aPant(mk.cx + 0.5, mk.cy + 0.5); if (!dentro(px, py, 200)) continue;
    L.push({ id: `lv${mk.cx},${mk.cy}`, x: px, y: py, h: 8, r: 110, c: [255, 80, 20], k: 0.35 + 0.25 * Math.sin(t * 1.7 + mk.cx * 0.7) + R() * 0.08 });
  }
  // botín en el piso: luz del color de su rareza
  for (const sl of j.suelo) {
    const o = sl.o; if (!o) continue;
    const c = LUZ_RAREZA[o.rareza]; if (!c) continue;
    const [px, py] = aPant(sl.x, sl.y); if (!dentro(px, py, 120)) continue;
    L.push({ x: px, y: py, h: 30, r: o.rareza === 'legendario' ? 130 : o.rareza === 'unico' ? 110 : 80, c, k: 0.5 + Math.sin(t * 3 + sl.id) * 0.08, sinSombra: true });
  }
  // portal
  if (j.portal) {
    const pz = (j as any).portalZona === z.id ? aPant(j.portal.x, j.portal.y) : z.tipo === 'pueblo' && z.entradas.portal ? aPant(z.entradas.portal[0] + 0.5, z.entradas.portal[1] - 1) : null;
    if (pz) L.push({ id: 'portal', x: pz[0], y: pz[1], h: 40, r: 160, c: [70, 130, 255], k: 0.8 });
  }
  // cerca de un jefe despierto las luces del mapa titubean y a ratos se apagan, como si algo les chupara el aire
  const jf = j.jefe && !j.jefe.muerto && j.jefe.estado === 'perseguir' ? j.jefe : null;
  if (jf) {
    const [bx, by] = aPant(jf.x, jf.y);
    for (let i = L.length - 1; i >= 0; i--) {
      const l = L[i]; if (!l.id || l.id[0] !== 'o') continue;
      const d = Math.hypot(l.x - bx, l.y - by); if (d > 380) continue;
      const cerca = 1 - d / 380, sem = (l.x * 0.37 + l.y * 0.11) % 7;
      const parpadeo = Math.sin(t * (9 + sem * 3)) * Math.sin(t * (2.3 + sem)) ;
      const apagada = Math.sin(t * 0.7 + sem * 2.1) > 0.92 - cerca * 0.25;
      if (apagada) { L.splice(i, 1); continue; }
      l.k *= Math.max(0.15, 1 - cerca * (0.45 + 0.4 * Math.abs(parpadeo)));
    }
  }
  // con muchas luces (el acto 5 llega a ~50) el cuadro se cae: quedan las 22 que más pesan en pantalla
  // (fuerza por radio y cercanía al centro); las del héroe y las sin id de objeto siempre entran
  if (L.length > 18) {
    const cxp = W / 2, cyp = H * 0.45;
    const PRIO = [4, 2, 1, 0.5];
    const peso = (l: Luz) => (l.de === h || l.id === 'puerta' || l.id?.startsWith('ancla') || l.id?.startsWith('oz') || l.id?.startsWith('ca') || l.id?.startsWith('as') ? 1e9 : l.prio === 0 && l.k > 0.2 ? 1e8 + l.k : ((l.k * l.r) / (60 + Math.hypot(l.x - cxp, l.y - cyp))) * (l.prio !== undefined ? PRIO[l.prio] : 1));
    L.sort((a, b) => peso(b) - peso(a)); L.length = 18;
  }
  // como mucho 6 luces de poderes proyectan sombra (las de prioridad 3 nunca)
  let conSombra = 0;
  for (const l of L) if (l.prio !== undefined && !l.sinSombra) { if (l.prio >= 3 || conSombra >= 6) l.sinSombra = true; else conSombra++; }
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
function influencias(e: Ent, px: number, py: number, paraSombra = false): Influencia[] {
  const out: Influencia[] = [];
  for (const l of luces) {
    if (l.de === e || (paraSombra && l.sinSombra)) continue;
    const gx = px - l.x, gy = (py - l.y) * 2; // piso sin aplastar
    const d = Math.hypot(gx, gy);
    if (d >= l.r) continue;
    const f = l.k * Math.pow(1 - d / l.r, 0.8);
    if (f < 0.04) continue;
    out.push({ l, f, gx, gy, d });
  }
  out.sort((a, b) => b.f - a.f);
  return paraSombra ? out.slice(0, 5) : out.slice(0, 3);
}

const estadoSombras = new Map<number, { t: number; s: Map<string, { gx: number; gy: number; len: number; a: number }> }>();
export const olvidarSombras = () => estadoSombras.clear();
/** Sombras del personaje: una por cada luz fija cercana, estiradas lejos de ella y más suaves con la distancia. */
// presupuesto de sombras por cuadro: con decenas de monstruos y muchas luces (acto 5) las sombras completas se comían el cuadro
let gastoSombras = 0;
export const nuevoCuadroSombras = () => { gastoSombras = 0; };
export function sombras(ctx: CanvasRenderingContext2D, e: Ent, q: Cuadro, px: number, py: number, esc: number) {
  // Khamer-Ul no tiene sombra: es su maldición
  if ((e as any).def?.sprite === 'jefe_rey_sin_sombra') return;
  // sombra de contacto, siempre: ancla los pies al piso
  const rr = (e.radio / 0.45) * 0.9 * esc;
  ctx.save(); ctx.globalAlpha = 0.32; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(px, py, rr * 11, rr * 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  if (!q.img) return;
  // sombras suavizadas: cada luz fija tiene su sombra por entidad, que gira y se estira despacio (~150 ms) y aparece
  // o se apaga con fundido, así no saltan de una luz a otra al caminar ni titilan con el fuego
  const ahora = performance.now() / 1000;
  if (estadoSombras.size > 600) estadoSombras.clear();
  let est = estadoSombras.get(e.id);
  if (!est) { est = { t: ahora, s: new Map() }; estadoSombras.set(e.id, est); }
  const dt = Math.min(0.2, Math.max(0, ahora - est.t)); est.t = ahora;
  const kk = 1 - Math.exp(-dt / 0.15);
  const vistos = new Set<string>();
  for (const i of influencias(e, px, py, true)) {
    if (i.d < 6) continue;
    const id = i.l.id ?? 'anon';
    vistos.add(id);
    const len = Math.max(0.45, Math.min(2.2, (i.d / i.l.h) * 0.95)), a = Math.min(1, 1.1 * i.f);
    const gx = i.gx / i.d, gy = i.gy / i.d;
    const v = est.s.get(id);
    if (!v) est.s.set(id, { gx, gy, len, a: a * kk });
    else { v.gx += (gx - v.gx) * kk; v.gy += (gy - v.gy) * kk; v.len += (len - v.len) * kk; v.a += (a - v.a) * kk; }
  }
  for (const [id, v] of est.s) if (!vistos.has(id)) { v.a -= v.a * kk; if (v.a < 0.01) est.s.delete(id); }
  const lista: { gx: number; gy: number; len: number; a: number }[] = [];
  for (const v of est.s.values()) { const n = Math.hypot(v.gx, v.gy) || 1; lista.push({ gx: v.gx / n, gy: v.gy / n, len: v.len, a: v.a }); }
  lista.sort((x, y) => y.a - x.a); lista.length = Math.min(lista.length, 3);
  if (sol > 0) lista.push({ gx: 0.55, gy: -0.83, len: 0.85, a: sol * 0.7 });
  if (!lista.length) return;
  if (!silueta(q, '#000')) return;
  const n = lista.length;
  const norm = n > 2 ? Math.sqrt(2 / n) : 1;
  // los sprites gigantes (jefes) se dibujan con menos sombras y una sola copia: son caros
  const grande = q.w * q.h * esc * esc > 50000;
  // lejos del centro de la pantalla, o pasado el presupuesto, basta la sombra de la luz más fuerte en una sola copia
  const lejos = Math.hypot(px - ctx.canvas.width / 2, py - ctx.canvas.height * 0.45) > 320;
  if ((lejos || gastoSombras > 150) && !grande && e.tipo !== 'heroe') { const s0 = lista[0]; dibujarSombra(ctx, q, px, py, esc, s0.gx, s0.gy, s0.len, Math.min(0.72, s0.a), 1); gastoSombras += 1; return; }
  const usar = grande ? lista.slice(0, 2) : lista;
  for (const s of usar) dibujarSombra(ctx, q, px, py, esc, s.gx, s.gy, s.len, Math.min(0.72, s.a * norm), grande ? 1 : 3);
  gastoSombras += usar.length * (grande ? 1 : 3);
}

/** Sombra de una silueta ya preparada en el lienzo de trabajo: (gx, gy) es la dirección lejos de la luz en el piso. */
function dibujarSombra(ctx: CanvasRenderingContext2D, q: Cuadro, px: number, py: number, esc: number, gx: number, gy: number, len: number, alfa: number, copias = 3) {
  // eje de la altura: hacia afuera de la luz, sobre el piso. Eje del ancho: perpendicular, también en el piso.
  const cx = -gx * len, cy = -gy * 0.5 * len;
  let ux = -gy, uy = gx; if (ux < 0) { ux = -ux; uy = -uy; }
  const ax = ux, ay = uy * 0.5;
  // tres copias corridas: bordes suaves y la punta más difusa
  for (let c = copias === 1 ? 1 : 0; c < (copias === 1 ? 2 : 3); c++) {
    const k = 1 + (c - 1) * 0.07;
    ctx.save();
    ctx.globalAlpha = copias === 1 ? alfa : alfa / (c === 1 ? 2 : 4);
    ctx.translate(px + (c - 1) * 0.8, py);
    ctx.transform(ax, ay, cx * k, cy * k, 0, 0);
    ctx.drawImage(tmp, 0, 0, q.w, q.h, -q.ax * esc, -q.ay * esc, q.w * esc, q.h * esc);
    ctx.restore();
  }
}

/** Sombra de un sprite suelto (menús): una luz en (lx, ly) de pantalla a la altura lh. */
export function sombraSuelta(ctx: CanvasRenderingContext2D, q: Cuadro | undefined, px: number, py: number, esc: number, lx: number, ly: number, lh: number, alfa: number) {
  if (!q || !q.img || !silueta(q, '#000')) return;
  const gx = px - lx, gy = (py - ly) * 2, d = Math.hypot(gx, gy) || 1;
  dibujarSombra(ctx, q, px, py, esc, gx / d, gy / d, Math.max(0.45, Math.min(2.2, (d / lh) * 0.95)), alfa);
}

/** Reflejo de las luces de color sobre el cuerpo: el lado que mira a la luz se enciende con su color. */
export function reflejos(ctx: CanvasRenderingContext2D, e: Ent, q: Cuadro, px: number, py: number, esc: number) {
  if (!q.img) return;
  const inf = influencias(e, px, py).filter((i) => !i.l.blanca).slice(0, q.w * q.h * esc * esc > 50000 ? 1 : 2);
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
