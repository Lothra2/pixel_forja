// Dibuja la zona: pisos, manchas, objetos y personajes por profundidad, poderes, partículas, luz, niebla y clima.
import { ctx, W, H } from '../nucleo/lienzo';
import { cuadrosPiso, cuadrosHeroe, cuadrosMonstruo, objetoMeta, dibujar, dibujarTenido, manifiesto, type Cuadro } from '../motor/assets';
import type { Juego, Ent, Monstruo, Efecto } from '../juego/mundo';
import { CUADROS, DIRS, ZANCADA, ALTO_CLASE } from '../juego/mundo';
import { baseDe } from '../juego/objetos';
import { icono } from '../ui/comun';
import { cuadrosVivos } from '../motor/pintor';
import { R } from '../nucleo/azar';
import { auraEquipo } from '../juego/visual';
import { fuegoOzmaren } from './fuego';
import { recolectar, sombras, reflejos, luces, destello, destelloColor } from './luces';

export const cam = { x: 0, y: 0 };
export const aPant = (x: number, y: number): [number, number] => [(x - y) * 16 - cam.x + W / 2, (x + y) * 8 - cam.y + (H - 96) / 2];
export const aMundo = (sx: number, sy: number): [number, number] => {
  const X = sx - W / 2 + cam.x, Y = sy - (H - 96) / 2 + cam.y;
  return [(Y / 8 + X / 16) / 2, (Y / 8 - X / 16) / 2];
};

// lienzos auxiliares
const luz = document.createElement('canvas');
const lctx = luz.getContext('2d')!;
const brillo = document.createElement('canvas');
const bctx = brillo.getContext('2d')!;

export interface Pick { tipo: 'monstruo' | 'npc' | 'suelo' | 'objeto' | 'salida' | 'portal'; ref: any; x0: number; y0: number; x1: number; y1: number; prof: number }
export let picks: Pick[] = [];
export const opciones = { mostrarObjetos: false, idi: 0 as 0 | 1 };

/** Celdas por ciclo de pasos para este cuerpo: zancada del motor por su alto y su escala. */
function zancadaDe(e: Ent, acc: string): number {
  const base = acc === 'correr' ? ZANCADA.correr : ZANCADA.caminar;
  const za = manifiesto().za as Record<string, number> | undefined;
  if (e.tipo === 'heroe') return base * (za?.[(e as any).d?.clase] ?? ALTO_CLASE[(e as any).d?.clase] ?? 1);
  const m = e as Monstruo;
  const alto = za?.[m.def?.sprite];
  return base * (alto ?? 0.9) * (m.escala ?? 1);
}
const fr = (acc: string, t: number, dur: number, e?: Ent, accPies?: string) => {
  const n = CUADROS[acc as keyof typeof CUADROS] ?? 8;
  if (e && (acc === 'caminar' || acc === 'correr')) return Math.floor(((e.recorrido ?? 0) / zancadaDe(e, accPies ?? acc)) * n) % n;
  if (acc === 'quieto') return Math.floor(t * 6) % n;
  if (acc === 'caminar') return Math.floor(t * 11) % n;
  if (acc === 'correr') return Math.floor(t * 14) % n;
  if (acc === 'morir') return Math.min(n - 1, Math.floor(t * 14));
  return Math.min(n - 1, Math.floor((t / Math.max(0.05, dur)) * n));
};

function framesHeroe(j: Juego, acc: string, dir: string): Cuadro[] {
  const vivos = cuadrosVivos(acc, dir);
  if (vivos && vivos.length) return vivos;
  return cuadrosHeroe(j.heroe.d.clase, acc, dir);
}
export function framesMonstruo(sprite: string, acc: string, dir: string): Cuadro[] {
  let f = cuadrosMonstruo(sprite, acc, dir);
  if (!f.length && acc === 'lanzar') f = cuadrosMonstruo(sprite, 'atacar', dir);
  if (!f.length && acc === 'correr') f = cuadrosMonstruo(sprite, 'caminar', dir);
  if (!f.length) f = cuadrosMonstruo(sprite, 'quieto', dir);
  return f;
}


// chispas de las armas vivas (en pantalla)
const chispas: { x: number; y: number; vx: number; vy: number; t: number; c: string }[] = [];
const COLOR_VIVO: Record<string, [string, string]> = { fuego: ['#ff7020', '#ffd060'], frio: ['#60b0ff', '#e0f8ff'], rayo: ['#a0a0ff', '#ffffff'], veneno: ['#40c040', '#c0ff80'], sombra: ['#6020a0', '#c080ff'], luz: ['#ffe080', '#ffffff'], sangre: ['#a00010', '#ff4040'] };
function armaViva(q: Cuadro, x: number, y: number, elem: string, t: number) {
  if (!q.hoja) return;
  const [a, b] = COLOR_VIVO[elem] ?? COLOR_VIVO.fuego;
  const x0 = x + q.hoja[0], y0 = y + q.hoja[1], x1 = x + q.hoja[2], y1 = y + q.hoja[3];
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a + '00'); g.addColorStop(0.5, a + '80'); g.addColorStop(1, b + 'a0');
  ctx.strokeStyle = g; ctx.lineWidth = 4 + Math.sin(t * 20) * 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.restore();
  for (let k = 0; k < 2; k++) if (R() < 0.7 && chispas.length < 200) {
    const u = R();
    chispas.push({ x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u, vx: (R() - 0.5) * 20, vy: elem === 'frio' ? 10 : -20 - R() * 30, t: 0.4 + R() * 0.4, c: R() < 0.5 ? a : b });
  }
}

export function dibujarMundo(j: Juego, dt: number, tiempo: number) {
  const z = j.zona, h = j.heroe;
  const sx = j.sacudida > 0 ? (R() - 0.5) * j.sacudida * 12 : 0, sy = j.sacudida > 0 ? (R() - 0.5) * j.sacudida * 8 : 0;
  cam.x = (h.x - h.y) * 16 + sx; cam.y = (h.x + h.y) * 8 + sy;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  picks = [];
  recolectar(j, tiempo, aPant, W, H);
  // explorar
  const btx = Math.floor(h.x / 5), bty = Math.floor(h.y / 5);
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = btx + dx, Y = bty + dy; if (X >= 0 && Y >= 0 && X < z.tw && Y < z.th && dx * dx + dy * dy <= 10) z.explorado[Y * z.tw + X] = 1; }
  // pisos visibles
  const f25 = Math.floor(tiempo * 25);
  const [wx0] = aMundo(0, 0), [, wy0] = aMundo(W, 0), [wx1] = aMundo(W, H), [, wy1] = aMundo(0, H);
  const bx0 = Math.max(0, Math.floor(wx0 / 5) - 1), bx1 = Math.min(z.tw - 1, Math.ceil(wx1 / 5) + 1);
  const by0 = Math.max(0, Math.floor(wy0 / 5) - 1), by1 = Math.min(z.th - 1, Math.ceil(wy1 / 5) + 1);
  for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) {
    const p = z.pisos[by * z.tw + bx]; if (!p) continue;
    const fs = cuadrosPiso(p.id, p.v); if (!fs.length) continue;
    const q = fs[Math.floor(f25 / 4) % fs.length];
    const [px, py] = aPant(bx * 5 + 2.5, by * 5 + 2.5);
    if (px < -100 || px > W + 100 || py < -60 || py > H + 60) continue;
    dibujar(ctx, q, px, py);
  }
  // manchas
  for (const m of j.manchas) {
    const [px, py] = aPant(m.x, m.y); if (px < -60 || px > W + 60 || py < -40 || py > H + 40) continue;
    ctx.save(); ctx.globalAlpha = m.tipo === 'quemado' ? 0.55 : 0.75; ctx.fillStyle = m.color;
    ctx.beginPath(); ctx.ellipse(px, py, m.r * 16, m.r * 8, 0, 0, Math.PI * 2); ctx.fill();
    if (m.tipo === 'sangre' && m.r > 0.5) { ctx.beginPath(); ctx.ellipse(px + m.r * 9, py + 3, m.r * 6, m.r * 3, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  // lista de cosas a ordenar
  type Item = { prof: number; draw: () => void };
  const items: Item[] = [];
  const cerca = (x: number, y: number, m = 3) => { const [px, py] = aPant(x, y); return px > -220 * m / 3 && px < W + 220 && py > -60 && py < H + 320; };
  // objetos del mapa
  for (const o of z.objetos) {
    if (!cerca(o.cx + 0.5, o.cy + 0.5, 4)) continue;
    const meta = objetoMeta(o.id, o.v); if (!meta || !meta.f.length) continue;
    let q = meta.f[Math.floor(f25 / meta.t) % meta.f.length];
    // cofres que se abren: la animación se toca una vez y queda abierto
    if (o.v.startsWith('abriendo') && o.dato?.abre !== undefined) {
      const i = Math.floor(((j.t - o.dato.abre) * 25) / meta.t);
      if (i >= meta.f.length) o.v = o.v.endsWith('_y') ? 'abierto_y' : 'abierto';
      q = meta.f[Math.min(meta.f.length - 1, i)];
    }
    const [px, py] = aPant(o.cx + 0.5, o.cy + 0.5);
    const prof = meta.plano ? -1e6 + o.cx + o.cy : o.cx + o.cy + (o.hw + o.hh) / 2 - 1;
    const alto = q.ay;
    items.push({ prof, draw: () => {
      // transparencia si tapa al héroe
      let alfa = 1;
      if (alto > 60) {
        const [hx, hy] = aPant(h.x, h.y);
        if (prof > h.x + h.y && hx > px - q.ax && hx < px - q.ax + q.w && hy - 30 > py - q.ay && hy - 30 < py - q.ay + q.h * 0.85) alfa = 0.45;
      }
      if (alfa < 1) { ctx.globalAlpha = alfa; dibujar(ctx, q, px, py); ctx.globalAlpha = 1; } else dibujar(ctx, q, px, py);
    } });
    if (o.tag === 'libro' || o.tag === 'cofre' || o.tag === 'santuario' || o.tag === 'pozo' || o.tag === 'baul' || o.tag === 'romper' || o.id === 'com_piedra_viaje') picks.push({ tipo: 'objeto', ref: o, x0: px - q.ax, y0: py - q.ay, x1: px - q.ax + q.w, y1: py - q.ay + q.h, prof });
  }
  // salidas (las puertas/escaleras ya están como objetos; aquí solo la zona de clic)
  for (const s of z.salidas) { const [px, py] = aPant(s.cx + 0.5, s.cy + 0.5); picks.push({ tipo: 'salida', ref: s, x0: px - 40, y0: py - 60, x1: px + 40, y1: py + 20, prof: s.cx + s.cy - 2 }); }
  // botín en el suelo
  for (const s of j.suelo) {
    if (!cerca(s.x, s.y)) continue;
    const [px, py] = aPant(s.x, s.y);
    items.push({ prof: s.x + s.y - 0.5, draw: () => dibujarBotinSuelo(s, px, py, tiempo) });
  }
  // personajes
  const ents: Ent[] = [...j.monstruos, ...j.npcs, h];
  for (const e of ents) {
    if (!cerca(e.x, e.y)) continue;
    const muerto = e.muerto;
    items.push({ prof: muerto ? e.x + e.y - 0.6 : e.x + e.y, draw: () => dibujarEnt(j, e, tiempo) });
  }
  // visiones
  for (const v of j.visiones) {
    const [px, py] = aPant(v.x, v.y);
    items.push({ prof: v.x + v.y, draw: () => {
      const fs = framesMonstruo(v.sprite, 'quieto', v.dir); const q = fs[Math.floor(tiempo * 6) % Math.max(1, fs.length)];
      const a = Math.sin(Math.min(1, v.t / 2.6) * Math.PI) * 0.35;
      ctx.globalAlpha = a; dibujarTenido(ctx, q, px, py, '#000000', 0.6); ctx.globalAlpha = 1;
    } });
  }
  items.sort((a, b) => a.prof - b.prof);
  for (const it of items) it.draw();
  // portal
  if (j.portal && j.portal.destino) dibujarPortal(j, tiempo);
  // poderes y efectos
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const e of j.efectos) dibujarEfecto(e, tiempo);
  for (const p of j.proyectiles) {
    const [px, py] = aPant(p.x, p.y);
    if (p.arco) { const [ax, ay] = [px, py - p.z * 1.2]; ctx.fillStyle = p.elem === 'frio' ? '#a0e0ff' : p.elem === 'veneno' ? '#80ff60' : '#ffa040'; ctx.beginPath(); ctx.arc(ax, ay, 4, 0, Math.PI * 2); ctx.fill(); continue; }
    const id = p.efecto;
    const meta = manifiesto().wm?.[id];
    const d = Math.round(((Math.atan2(p.vy, p.vx) * 180) / Math.PI / 45 + 8) % 8);
    const dname = (['se', 's', 'so', 'o', 'no', 'n', 'ne', 'e'])[d];
    if (meta) {
      const fs = manifiesto().w?.[`${id}/${meta.dir ? dname : 's'}`];
      if (fs) { const raw = fs[Math.floor(p.t * 25 / meta.t) % fs.length]; dibujarRaw(raw, px, py); continue; }
    }
    ctx.fillStyle = '#fff'; ctx.fillRect(px - 2, py - 34, 4, 4);
  }
  // arcos de rayo
  for (const e of j.efectos) if (e.id === 'arco_cadena' && (e as any).x2 !== undefined) {
    const [ax, ay] = aPant(e.x, e.y), [bx, by] = aPant((e as any).x2, (e as any).y2);
    rayo(ax, ay - 34, bx, by - 34, 1 - e.t / (e.dur ?? 0.3));
  }
  // cuervos
  for (const c of j.cuervos) { const [px, py] = aPant(c.x, c.y); ctx.globalCompositeOperation = 'source-over'; pajaro(px, py - 50 - Math.sin(tiempo * 9 + c.ang) * 6, tiempo + c.ang); ctx.globalCompositeOperation = 'lighter'; }
  ctx.restore();
  // torretas
  for (const tr of j.torretas) { const [px, py] = aPant(tr.x, tr.y); ctx.fillStyle = '#3a3430'; ctx.fillRect(px - 6, py - 20, 12, 20); ctx.fillStyle = '#80786c'; ctx.fillRect(px - 9, py - 24, 18, 5); ctx.fillStyle = '#ff9040'; ctx.fillRect(px - 1, py - 22, 2, 2); }
  // partículas
  for (const p of j.particulas) {
    const [px, py] = aPant(p.x, p.y);
    const k = 1 - p.t / p.dur;
    ctx.globalAlpha = Math.max(0, p.tipo === 'humo' ? k * 0.35 : k);
    ctx.fillStyle = p.color;
    if (p.tipo === 'humo') { ctx.beginPath(); ctx.arc(px, py - p.z, p.tam * (2 - k), 0, Math.PI * 2); ctx.fill(); }
    else ctx.fillRect(px - p.tam / 2, py - p.z - p.tam / 2, p.tam, p.tam);
  }
  ctx.globalAlpha = 1;
  // chispas de armas vivas
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = chispas.length - 1; i >= 0; i--) { const c = chispas[i]; c.t -= dt; c.x += c.vx * dt; c.y += c.vy * dt; if (c.t <= 0) { chispas.splice(i, 1); continue; } ctx.globalAlpha = Math.min(1, c.t * 2); ctx.fillStyle = c.c; ctx.fillRect(c.x, c.y, 2, 2); }
  ctx.restore();
  // luz y oscuridad
  dibujarLuz(j, tiempo);
  // números de daño (encima de la oscuridad para que se lean)
  ctx.textAlign = 'center';
  for (const n of j.numeros) {
    const [px, py] = aPant(n.x, n.y);
    const k = 1 - n.t / 1.1;
    ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.6));
    ctx.font = `bold ${n.grande ? 18 : 13}px Georgia, serif`;
    const yy = py - n.z - (n.grande ? Math.sin(Math.min(1, n.t * 5) * Math.PI) * 6 : 0);
    ctx.fillStyle = '#000'; ctx.fillText(n.txt, px + 1, yy + 1); ctx.fillStyle = n.color; ctx.fillText(n.txt, px, yy);
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
  // salidas sin puerta: un rastro de luz en el piso con el nombre del lugar
  for (const sa of z.salidas) {
    if (sa.obj) continue;
    const [px, py] = aPant(sa.cx + 0.5, sa.cy + 0.5);
    if (px < -100 || px > W + 100 || py < -60 || py > H + 60) continue;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const k = 0.25 + Math.sin(tiempo * 2.5) * 0.08;
    const g = ctx.createRadialGradient(px, py, 4, px, py, 48); g.addColorStop(0, `rgba(255,190,90,${k})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, py, 48, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.font = '12px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText('» ' + sa.nombre[opciones.idi] + ' «', px + 1, py - 29); ctx.fillStyle = '#e8c070'; ctx.fillText('» ' + sa.nombre[opciones.idi] + ' «', px, py - 30); ctx.textAlign = 'left';
  }
  // clima
  clima(j, dt, tiempo);
}

function dibujarRaw(raw: any[], x: number, y: number) {
  const q: Cuadro = { img: null, atlas: raw[0], x: raw[1], y: raw[2], w: raw[3], h: raw[4], ax: raw[5], ay: raw[6] };
  dibujar(ctx, q, x, y);
}
function dibujarEfecto(e: Efecto, _t: number) {
  if (e.id === 'arco_cadena') return;
  const meta = manifiesto().wm?.[e.id];
  const [px, py] = aPant(e.x, e.y);
  if (!meta) return;
  const dn = DIRS[(e.dir ?? 0) % 8];
  const fs = manifiesto().w?.[`${e.id}/${meta.dir ? dn : 's'}`]; if (!fs) return;
  let i = Math.floor((e.t * 25) / meta.t);
  if (meta.bucle) i %= fs.length; else if (i >= fs.length) return;
  const raw = fs[i];
  const q: Cuadro = { img: null, atlas: raw[0], x: raw[1], y: raw[2], w: raw[3], h: raw[4], ax: raw[5], ay: raw[6] };
  const k = e.dur && meta.bucle ? Math.min(1, (e.dur - e.t) * 3) : 1;
  ctx.globalAlpha = Math.max(0, k);
  dibujar(ctx, q, px, py - (e.z ?? 0), e.escala);
  ctx.globalAlpha = 1;
}
function rayo(ax: number, ay: number, bx: number, by: number, k: number) {
  ctx.strokeStyle = `rgba(200,210,255,${k})`; ctx.lineWidth = 2;
  for (let n = 0; n < 2; n++) {
    ctx.beginPath(); ctx.moveTo(ax, ay);
    const seg = 8;
    for (let i = 1; i < seg; i++) { const t = i / seg; ctx.lineTo(ax + (bx - ax) * t + (R() - 0.5) * 18, ay + (by - ay) * t + (R() - 0.5) * 18); }
    ctx.lineTo(bx, by); ctx.stroke(); ctx.lineWidth = 1;
  }
}
function pajaro(x: number, y: number, t: number) {
  const a = Math.sin(t * 18) * 5;
  ctx.strokeStyle = '#0a0a0e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 7, y - a); ctx.lineTo(x, y); ctx.lineTo(x + 7, y - a); ctx.stroke();
}

function dibujarEnt(j: Juego, e: Ent, tiempo: number) {
  const [px, py] = aPant(e.x, e.y);
  let fs: Cuadro[];
  let acc = e.acc;
  const m = e as Monstruo;
  if (e.tipo === 'heroe') fs = framesHeroe(j, acc, e.dir);
  else if (e.tipo === 'npc') fs = cuadrosMonstruo((e as any).npc, 'quieto', e.dir);
  else {
    if ((m as any).surgiendo > 0) acc = 'morir';
    if (acc === 'lanzar' && m.def.sprite.startsWith('jefe_') && ((m as any).fase ?? 0) >= 1) acc = 'especial' as any;
    fs = framesMonstruo(m.def.sprite, acc, e.dir);
  }
  if (!fs.length) return;
  let i: number;
  if (e.tipo === 'monstruo' && (m as any).surgiendo > 0) i = Math.max(0, fs.length - 1 - Math.floor((1.2 - (m as any).surgiendo) * 7));
  else if ((e as any).estado === 'surgir') return;
  else i = fr(acc, e.t, e.dur, e, acc === 'correr' && e.tipo !== 'heroe' && !cuadrosMonstruo(m.def.sprite, 'correr', e.dir).length ? 'caminar' : acc);
  if (e.tipo === 'monstruo' && m.estado === 'surgir') return;
  const q = fs[Math.min(fs.length - 1, i)];
  const esc = e.escala;

  if (!e.muerto) sombras(ctx, e, q, px, py, esc);
  let ok: boolean;
  if (e.destello > 0) ok = dibujarTenido(ctx, q, px, py, '#ffffff', 0.55, esc);
  else if (e.congelado > 0) ok = dibujarTenido(ctx, q, px, py, '#70b8ff', 0.55, esc);
  else if (e.frio > 0) ok = dibujarTenido(ctx, q, px, py, '#5090e0', 0.3, esc);
  else if (e.veneno > 0) ok = dibujarTenido(ctx, q, px, py, '#40c030', 0.3, esc);
  else if (e.tinte) ok = dibujarTenido(ctx, q, px, py, e.tinte, e.tipo === 'invocado' ? 0.35 : e.tipo === 'heroe' ? 0.22 : 0.3, esc);
  else if (e.muerto && e.tMuerto > 60) { ctx.globalAlpha = Math.max(0.25, 1 - (e.tMuerto - 60) / 400); ok = dibujar(ctx, q, px, py, esc); ctx.globalAlpha = 1; }
  else ok = dibujar(ctx, q, px, py, esc);
  if (ok && !e.muerto) reflejos(ctx, e, q, px, py, esc);
  if (ok && !e.muerto && !(window as any).__sinFuego && e.tipo === 'monstruo' && m.def.sprite === 'jefe_ozmaren') fuegoOzmaren(ctx, m, q, px, py, esc, tiempo, cam.x, cam.y);
  // únicos y jefes: aura
  if (!e.muerto && e.tipo === 'monstruo' && m.calidad >= 2) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18 + Math.sin(tiempo * 4) * 0.06;
    const g = ctx.createRadialGradient(px, py - 30 * esc, 4, px, py - 30 * esc, 46 * esc); g.addColorStop(0, m.calidad >= 3 ? '#ff4010' : '#c08020'); g.addColorStop(1, '#00000000');
    ctx.fillStyle = g; ctx.fillRect(px - 50 * esc, py - 80 * esc, 100 * esc, 100 * esc); ctx.restore();
  }
  // arma viva del héroe
  if (ok && e.tipo === 'heroe' && j.heroe.c.vivo && !e.muerto) armaViva(q, px, py, j.heroe.c.vivo, tiempo);
  // aura del héroe (botón derecho)
  if (e.tipo === 'heroe' && !e.muerto) {
    const au = Object.values(j.heroe.buffs).find((b) => b.t > 9000);
    const ae = auraEquipo(j.heroe.d.equipo as any);
    if (ae) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const c = ae.color, pul = 0.5 + Math.sin(tiempo * 2.4) * 0.5;
      const g = ctx.createRadialGradient(px, py - 40, 6, px, py - 40, 60); g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.16 * ae.k + 0.06 * pul})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(px - 60, py - 100, 120, 120);
      ctx.globalAlpha = 0.25 + 0.2 * pul * ae.k; ctx.strokeStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(px, py, 26 + pul * 4, 13 + pul * 2, 0, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 3; k++) { const a = tiempo * 1.7 + k * 2.1; ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.fillRect(px + Math.cos(a) * 24, py - 10 - ((tiempo * 30 + k * 23) % 70), 2, 2); }
      ctx.restore();
    }
    if (au) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(tiempo * 3) * 0.08; ctx.strokeStyle = '#ffe0a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py, 34, 17, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    if (j.heroe.escudoHueso > 0) for (let k = 0; k < 4; k++) { const a = tiempo * 3 + k * 1.57; ctx.fillStyle = '#e0d8c0'; ctx.fillRect(px + Math.cos(a) * 20, py - 30 + Math.sin(a) * 10, 3, 6); }
  }
  // zona de clic
  if (!e.muerto && e.tipo !== 'heroe') picks.push({ tipo: e.tipo === 'npc' ? 'npc' : 'monstruo', ref: e, x0: px - q.ax * esc + q.w * esc * 0.2, y0: py - q.ay * esc, x1: px - q.ax * esc + q.w * esc * 0.8, y1: py + 6, prof: e.x + e.y });
  // frase del jefe
  if (e.tipo === 'monstruo' && m.habla) { ctx.font = 'italic 13px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(m.habla, px + 1, py - 95 * esc + 1); ctx.fillStyle = '#ff9060'; ctx.fillText(m.habla, px, py - 95 * esc); ctx.textAlign = 'left'; }
}

const PILAR: Record<string, string> = { magico: 'magico', raro: 'raro', conjunto: 'conjunto', unico: 'unico', legendario: 'legendario' };
const GEMAS = ['rubi', 'zafiro', 'topacio', 'esmeralda', 'amatista', 'diamante'];
function dibujarBotinSuelo(s: any, px: number, py: number, t: number) {
  const k = Math.min(1, s.t * 3);
  const salto = (1 - k) * 18 * Math.sin(k * Math.PI);
  const anim = (id: string, v: string, una = false, t0 = 0) => { const m = objetoMeta(id, v); if (!m || !m.f.length) return false; const i = Math.floor(((una ? t0 : t) * 25) / m.t); dibujar(ctx, m.f[una ? Math.min(m.f.length - 1, i) : i % m.f.length], px, py - salto); return true; };
  ctx.save();
  // oro: cae tintineando y queda como montón con brillo
  if (s.oro) {
    const ok = s.t < 0.7 ? anim('oro_caida', s.oro >= 100 ? 'muchas' : 'pocas', true, s.t) : anim('oro_monton', s.oro >= 400 ? 'grande' : s.oro >= 80 ? 'mediano' : 'pequeno');
    if (!ok) { for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#c09030' : '#f0d070'; ctx.fillRect(px - 6 + i * 2.5, py - 4 - (i % 3) - salto, 4, 3); } }
    ctx.restore(); return;
  }
  const o = s.o;
  // haz de luz debajo según la rareza (las runas y gemas también brillan)
  const pv = PILAR[o.rareza] ?? (o.tipo === 'runa' || o.tipo === 'gema' ? 'raro' : null);
  if (pv) { const m = objetoMeta('botin_pilar', pv); if (m && m.f.length) { ctx.globalAlpha = Math.min(1, s.t * 2) * 0.9; dibujar(ctx, m.f[Math.floor((t * 25) / m.t) % m.f.length], px, py); ctx.globalAlpha = 1; } }
  else { ctx.globalAlpha = 0.5; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(px, py, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  if (o.tipo === 'gema') { const g = GEMAS.find((x) => o.base.startsWith(x)); if (g && anim('gema_suelo', g)) { ctx.restore(); return; } }
  const b = baseDe(o);
  const ENCS: Record<string, string> = { fuego: '_fuego', frio: '_hielo', rayo: '_rayo', veneno: '_veneno', sombra: '_sombra', luz: '_sagrado', sangre: '_sangre' };
  const meta = b?.arma && b.arma !== 'puno' ? (objetoMeta(`arma_${b.arma}${o.vivo ? ENCS[o.vivo] ?? '' : ''}`, 'suelo') ?? objetoMeta(`arma_${b.arma}`, 'suelo')) : null;
  if (meta && meta.f.length) dibujar(ctx, meta.f[Math.floor(t * 25 / meta.t) % meta.f.length], px, py - salto);
  else { ctx.translate(0, -salto); icono(o, px - 11, py - 20, 22, 22, t); }
  ctx.restore();
}

function dibujarPortal(j: Juego, t: number) {
  const p = j.portal!;
  if ((j as any).portalZona !== j.zona.id && j.zona.tipo !== 'pueblo') return;
  const [px, py] = j.zona.tipo === 'pueblo' ? aPant(j.zona.entradas.portal[0] + 0.5, j.zona.entradas.portal[1] - 1) : aPant(p.x, p.y);
  const meta = objetoMeta('com_portal_azul', 'abierto');
  if (meta) dibujar(ctx, meta.f[Math.floor(t * 25 / meta.t) % meta.f.length], px, py);
  else { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#4080ff80'; ctx.beginPath(); ctx.ellipse(px, py - 40, 18, 40, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  picks.push({ tipo: 'portal', ref: p, x0: px - 22, y0: py - 90, x1: px + 22, y1: py + 6, prof: 1e9 });
}

const SPR_HUECO = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')!; const g = x.createRadialGradient(64, 64, 64 * 0.15, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c; })();
const sprTintes = new Map<string, HTMLCanvasElement>();
function sprTinte(col: string): HTMLCanvasElement {
  let c = sprTintes.get(col);
  if (!c) { c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')!; const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); sprTintes.set(col, c); if (sprTintes.size > 200) sprTintes.delete(sprTintes.keys().next().value!); }
  return c;
}
function dibujarLuz(j: Juego, t: number) {
  const z = j.zona;
  if (luz.width !== W || luz.height !== H) { luz.width = W; luz.height = H; brillo.width = W; brillo.height = H; }
  const oscuro = Math.min(0.97, z.oscuridad + (z.tipo === 'pueblo' ? -0.1 : 0.08)) * (1 - destello * 0.5);
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, W, H);
  lctx.fillStyle = `rgba(0,0,0,${oscuro})`; lctx.fillRect(0, 0, W, H);
  lctx.globalCompositeOperation = 'destination-out';
  bctx.clearRect(0, 0, W, H);
  // degradados pintados una vez y escalados: mucho más baratos que crear uno por luz y por cuadro
  const hueco = (x: number, y: number, r: number, k = 1) => { lctx.globalAlpha = Math.min(1, k); lctx.drawImage(SPR_HUECO, x - r, y - r, r * 2, r * 2); lctx.globalAlpha = 1; };
  const tinte = (x: number, y: number, r: number, c: string, a: number) => { bctx.globalAlpha = a; bctx.drawImage(sprTinte(c), x - r, y - r, r * 2, r * 2); bctx.globalAlpha = 1; };
  for (const l of luces) {
    const cy = l.y - Math.min(40, l.h * 0.45);
    hueco(l.x, cy, l.r, l.blanca ? 1 : Math.min(1, 0.55 + l.k * 0.45));
    if (!l.blanca) tinte(l.x, l.y - Math.min(30, l.h * 0.3), l.r * 0.85, `rgb(${l.c[0]},${l.c[1]},${l.c[2]})`, Math.min(0.5, 0.18 + l.k * 0.28));
  }
  ctx.drawImage(luz, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(brillo, 0, 0);
  if (destello > 0.02) { ctx.globalAlpha = destello * 0.16; ctx.fillStyle = `rgb(${destelloColor[0]},${destelloColor[1]},${destelloColor[2]})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
  // niebla de guerra: lo no explorado se ve negro del todo
  ctx.fillStyle = '#000';
  for (let by = 0; by < z.th; by++) for (let bx = 0; bx < z.tw; bx++) {
    if (z.explorado[by * z.tw + bx] || !z.pisos[by * z.tw + bx]) continue;
    const [px, py] = aPant(bx * 5 + 2.5, by * 5 + 2.5);
    if (px < -100 || px > W + 100 || py < -60 || py > H + 60) continue;
    ctx.beginPath(); ctx.moveTo(px, py - 41); ctx.lineTo(px + 81, py); ctx.lineTo(px, py + 41); ctx.lineTo(px - 81, py); ctx.closePath(); ctx.fill();
  }
}

// clima: lluvia, nieve, ceniza y niebla
const gotas: { x: number; y: number; v: number }[] = [];
const bancos: { x: number; y: number; r: number; v: number }[] = [];
function clima(j: Juego, dt: number, t: number) {
  const z = j.zona;
  if (z.niebla) {
    if (!bancos.length) for (let i = 0; i < 14; i++) bancos.push({ x: R() * W, y: R() * H, r: 80 + R() * 140, v: 6 + R() * 10 });
    ctx.save();
    for (const b of bancos) {
      b.x += b.v * dt; if (b.x - b.r > W) b.x = -b.r;
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r); g.addColorStop(0, `rgba(150,150,160,${z.niebla * 0.22})`); g.addColorStop(1, 'rgba(150,150,160,0)');
      ctx.fillStyle = g; ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
    ctx.restore();
  }
  const tipo = z.lluvia ? 'lluvia' : z.nieve ? 'nieve' : z.ceniza ? 'ceniza' : null;
  if (!tipo || z.tipo === 'mazmorra') return;
  const n = tipo === 'lluvia' ? 160 : 110;
  while (gotas.length < n) gotas.push({ x: R() * W, y: R() * H, v: 0.6 + R() * 0.6 });
  ctx.save();
  if (tipo === 'lluvia') { ctx.strokeStyle = 'rgba(150,160,190,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); for (const g of gotas) { g.y += 700 * g.v * dt; g.x -= 90 * g.v * dt; if (g.y > H) { g.y = -10; g.x = R() * W * 1.2; } ctx.moveTo(g.x, g.y); ctx.lineTo(g.x - 3, g.y + 14 * g.v); } ctx.stroke(); }
  else { ctx.fillStyle = tipo === 'nieve' ? 'rgba(235,240,255,0.8)' : 'rgba(255,140,60,0.75)'; for (const g of gotas) { g.y += (tipo === 'nieve' ? 50 : -30) * g.v * dt; g.x += Math.sin(t + g.v * 10) * 20 * dt; if (g.y > H) g.y = -4; if (g.y < -5) g.y = H; ctx.fillRect(g.x, g.y, 2, 2); } }
  ctx.restore();
}
