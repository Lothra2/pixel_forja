// Dibuja la zona: pisos, manchas, objetos y personajes por profundidad, poderes, partículas, luz, niebla y clima.
import { nuevoCuadroSombras } from './luces';
import { ctx, W, H } from '../nucleo/lienzo';
import { esquivarHud, etiquetasMundo } from '../ui/hud_rects';
import { NPCS } from '../datos/npcs';
import { LUZ_EFECTO } from '../../../src/engine/gotico/luz_efectos';
import { cuadrosPiso, cuadrosHeroe, cuadrosMonstruo, objetoMeta, dibujar, dibujarTenido, manifiesto, type Cuadro } from '../motor/assets';
import type { Juego, Ent, Monstruo, Efecto, Mancha } from '../juego/mundo';
import { CUADROS, DIRS, ZANCADA, ALTO_CLASE } from '../juego/mundo';
import ZANCADA_MONSTRUO from '../../../src/engine/gotico/datos/zancada_monstruos.json';
import { baseDe } from '../juego/objetos';
import { icono } from '../ui/comun';
import { cuadrosVivos, cambioVisible } from '../motor/pintor';
import { R, rng } from '../nucleo/azar';
import { auraEquipo } from '../juego/visual';
import { fuegoOzmaren, fuegoMundo, dibujarFuegosMundo } from './fuego';
import { prepararFuegos, vivosDe, tieneFuegoDoom, dibujarVivos } from './fuego_vivo';
const ES_FUEGO = /fogata|hoguera|brasero|pira|antorcha|fuego|caldero|hogar/;
import { recolectar, sombras, reflejos, luces, destello, destelloColor } from './luces';

export const cam = { x: 0, y: 0 };
/** Hacia dónde mira la cámara además del héroe (presentación de un jefe): k de 0 a 1. */
export const foco = { x: 0, y: 0, k: 0 };
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
  // Thor trota a la cintura del héroe: su zancada es más corta que la de un humanoide de su alto
  if (m.def?.sprite?.startsWith('thor')) return base * 0.55;
  // tabla de la Forja: casillas por ciclo de caminar a escala 1, medidas en el sprite (sin pies: el ritmo de aleteo)
  const zm = (ZANCADA_MONSTRUO as Record<string, number>)[m.def?.sprite];
  if (zm) return zm * (base / ZANCADA.caminar) * (m.escala ?? 1);
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

let camAlzada = 0;
/** La puerta abierta de la catedral: un cono de luz roja que sale sobre el piso hacia +y y brasas y ceniza que salen y suben. */
function puertaCatedral(j: Juego, dt: number, t: number) {
  for (const sa of j.zona.salidas) {
    const fa = sa.piezas?.[sa.piezas.length - 1]; if (!fa || fa.v === 'sellada') continue;
    const [px, py] = aPant(fa.cx + 0.5, fa.cy + 1.5); if (px < -300 || px > W + 300 || py < -200 || py > H + 300) continue;
    const pulso = 0.5 + 0.5 * Math.sin(t * 1.4);
    // el cono: del umbral hacia +y (abajo a la izquierda en pantalla), abriéndose
    const [ex, ey] = aPant(fa.cx + 0.5, fa.cy + 8), ux = 16, uy = 8; // +x en pantalla, para el ancho
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(px, py, ex, ey);
    g.addColorStop(0, `rgba(255,70,24,${0.42 + pulso * 0.15})`); g.addColorStop(0.5, `rgba(255,50,16,${0.18 + pulso * 0.07})`); g.addColorStop(1, 'rgba(255,40,10,0)');
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(px - ux * 0.9, py - uy * 0.9); ctx.lineTo(px + ux * 0.9, py + uy * 0.9);
    ctx.lineTo(ex + ux * 2.6, ey + uy * 2.6); ctx.lineTo(ex - ux * 2.6, ey - uy * 2.6); ctx.closePath(); ctx.fill();
    // resplandor en el umbral
    const r = ctx.createRadialGradient(px, py - 10, 2, px, py - 10, 60);
    r.addColorStop(0, `rgba(255,120,60,${0.35 + pulso * 0.2})`); r.addColorStop(1, 'rgba(255,40,10,0)');
    ctx.fillStyle = r; ctx.fillRect(px - 60, py - 70, 120, 120);
    ctx.restore();
    // brasas y ceniza que salen por la puerta y suben
    if (j.particulas.length < 700) {
      const n = (dt * 18) + (Math.random() < (dt * 18) % 1 ? 1 : 0);
      for (let i = 0; i < Math.floor(n); i++) {
        const ceniza = Math.random() < 0.3;
        j.particulas.push({ x: fa.cx + 0.5 + (Math.random() - 0.5) * 1.6, y: fa.cy + 1.6, z: 6 + Math.random() * 30, vx: (Math.random() - 0.5) * 0.5, vy: 0.6 + Math.random() * 1.1, vz: ceniza ? 8 + Math.random() * 8 : 20 + Math.random() * 30, t: 0, dur: ceniza ? 2.2 + Math.random() : 1.2 + Math.random() * 0.8, color: ceniza ? '#8a8078' : Math.random() < 0.5 ? '#ff5020' : '#ffa040', tam: ceniza ? 2 : 1.5, tipo: ceniza ? 'humo' : 'brasa' } as any);
      }
    }
  }
}
export function dibujarMundo(j: Juego, dt: number, tiempo: number) {
  const z = j.zona, h = j.heroe;
  nuevoCuadroSombras();
  const sx = j.sacudida > 0 ? (R() - 0.5) * j.sacudida * 12 : 0, sy = j.sacudida > 0 ? (R() - 0.5) * j.sacudida * 8 : 0;
  // frente a la pieza ancla (la catedral), la cámara sube suave para que se vean las torres
  let alzar = 0;
  for (const sa of z.salidas) if (sa.piezas?.length) {
    const fa = sa.piezas[sa.piezas.length - 1], dy = h.y - fa.cy, dx = Math.abs(h.x - fa.cx);
    if (dy > -2 && dy < 26 && dx < 16) alzar = Math.max(alzar, 190 * Math.min(1, (26 - dy) / 12) * Math.min(1, (16 - dx) / 6));
  }
  camAlzada += (alzar - camAlzada) * Math.min(1, dt * 2.5);
  cam.x = (h.x - h.y) * 16 + sx; cam.y = (h.x + h.y) * 8 + sy - camAlzada;
  if (foco.k > 0) { const k = foco.k * foco.k * (3 - 2 * foco.k); cam.x += ((foco.x - foco.y) * 16 - (h.x - h.y) * 16) * k; cam.y += ((foco.x + foco.y) * 8 - 60 - (h.x + h.y) * 8 + camAlzada) * k; }
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  picks = [];
  prepararFuegos(j, dt, aPant, W, H);
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
    if (m.forma) { dibujarSangre(m, px, py); continue; }
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
    // fuego de Doom vivo: el gemelo sin llama y el fuego encima
    const vivos = vivosDe(o), gem = vivos?.[0].s.sprite ? objetoMeta(vivos[0].s.sprite, o.v) : null;
    if (vivos && gem?.f.length) q = gem.f[0];
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
      // fuego vivo sobre fogatas, braseros, piras y antorchas
      if (vivos && (gem?.f.length || !vivos[0].s.sprite)) dibujarVivos(ctx, vivos, px, py, alfa);
      else if (meta.luz && !tieneFuegoDoom(o) && ES_FUEGO.test(o.id) && !/^(arma_|mis_)/.test(o.id) && !/apagad/.test(o.v)) fuegoMundo(ctx, px, py - meta.luz[2] * 1.1, Math.max(0.3, Math.min(1.3, meta.luz[0] / 160)), tiempo, cam.x, cam.y);
    } });
    if (o.dato?.mision && (o.tag === 'pista' || o.tag === 'reliquia' || o.tag === 'altar' || o.tag === 'destino')) items.push({ prof: prof - 0.01, draw: () => haloMision(px, py, tiempo, o.tag === 'destino') });
    if (o.tag === 'pista' || o.tag === 'reliquia' || o.tag === 'altar' || o.tag === 'libro' || o.tag === 'cofre' || o.tag === 'santuario' || o.tag === 'pozo' || o.tag === 'baul' || o.tag === 'romper' || o.id === 'com_piedra_viaje') picks.push({ tipo: 'objeto', ref: o, x0: px - q.ax, y0: py - q.ay, x1: px - q.ax + q.w, y1: py - q.ay + q.h, prof });
  }
  // salidas (las puertas/escaleras ya están como objetos; aquí solo la zona de clic)
  for (const s of z.salidas) { const [px, py] = aPant(s.cx + 0.5, s.cy + 0.5); picks.push({ tipo: 'salida', ref: s, x0: px - 40, y0: py - 60, x1: px + 40, y1: py + 20, prof: s.cx + s.cy - 2 }); }
  // botín en el suelo
  for (const s of j.suelo) {
    if (!cerca(s.x, s.y)) continue;
    const [px, py] = aPant(s.x, s.y);
    items.push({ prof: s.x + s.y - 0.5, draw: () => dibujarBotinSuelo(s, px, py, tiempo) });
  }
  // pedazos de cuerpo y reventones del kit de gore
  for (const gb of ((j as any).gibs ?? []) as any[]) {
    if (!cerca(gb.x, gb.y)) continue;
    const meta = objetoMeta(gb.id, gb.pal); if (!meta || !meta.f.length) continue;
    const [px, py] = aPant(gb.x, gb.y), q = meta.f[((Math.floor(gb.ang) % meta.f.length) + meta.f.length) % meta.f.length];
    const alfa = Math.min(1, (gb.vida - gb.t) / 3);
    items.push({ prof: gb.x + gb.y - (gb.z > 0 ? -0.5 : 0.55), draw: () => { ctx.save(); ctx.globalAlpha = alfa; dibujar(ctx, q, px, py - gb.z * 0.6); ctx.restore(); } });
  }
  for (const rv of ((j as any).reventones ?? []) as any[]) {
    const meta = objetoMeta('gore_reventon', rv.pal); if (!meta || !meta.f.length) continue;
    const i = Math.floor((rv.t * 25) / (meta.t || 2)); if (i >= meta.f.length) continue;
    const [px, py] = aPant(rv.x, rv.y);
    items.push({ prof: rv.x + rv.y + 0.3, draw: () => dibujar(ctx, meta.f[i], px, py, rv.esc ?? 1) });
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
  dibujarFuegosMundo(ctx, tiempo, cam.x, cam.y);
  // portal
  if (j.portal && j.portal.destino) dibujarPortal(j, tiempo);
  // poderes y efectos
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // los de mucha materia (sangre, hueso, humo, flechas) van con alfa normal: sumados se pierden
  const mezclar = (id: string) => { ctx.globalCompositeOperation = LUZ_EFECTO[id]?.mezcla === 'normal' ? 'source-over' : 'lighter'; };
  for (const e of j.efectos) { mezclar(e.id); dibujarEfecto(e, tiempo); }
  for (const p of j.proyectiles) {
    const [px, py] = aPant(p.x, p.y);
    if (p.arco) { const [ax, ay] = [px, py - p.z * 1.2]; ctx.fillStyle = p.elem === 'frio' ? '#a0e0ff' : p.elem === 'veneno' ? '#80ff60' : '#ffa040'; ctx.beginPath(); ctx.arc(ax, ay, 4, 0, Math.PI * 2); ctx.fill(); continue; }
    const id = p.efecto;
    mezclar(id);
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
  puertaCatedral(j, dt, tiempo);
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
  etiquetasMundo.length = 0;
  for (const sa of z.salidas) {
    if (sa.obj) continue;
    // la etiqueta va sobre piso firme: un poco hacia adentro de la salida, no flotando en el vacío del borde
    const adentro = z.entradas['salida_' + sa.destino] ?? [sa.cx, sa.cy];
    const [px, py] = aPant((sa.cx + adentro[0]) / 2 + 0.5, (sa.cy + adentro[1]) / 2 + 0.5);
    if (px < -100 || px > W + 100 || py < -60 || py > H + 60) continue;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const k = 0.25 + Math.sin(tiempo * 2.5) * 0.08;
    const g = ctx.createRadialGradient(px, py, 4, px, py, 48); g.addColorStop(0, `rgba(255,190,90,${k})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, py, 48, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // el nombre siempre entero en pantalla, y en táctil fuera de la zona de los botones Golpe y Poder (abajo a la derecha)
    ctx.font = '12px Georgia, serif'; ctx.textAlign = 'center';
    const txt = '» ' + sa.nombre[opciones.idi] + ' «', tw2 = ctx.measureText(txt).width;
    let lx = Math.max(tw2 / 2 + 6, Math.min(W - tw2 / 2 - 6, px)), ly = Math.max(16, Math.min(H - 130, py - 29));
    // nunca encima de los botones del HUD (Golpe, Poder, agresivo, mensajes): sube hasta quedar libre
    ly = esquivarHud([lx - tw2 / 2, ly - 12, tw2, 16]) + 12;
    etiquetasMundo.push({ txt, r: [lx - tw2 / 2, ly - 12, tw2, 16] });
    ctx.fillStyle = '#000'; ctx.fillText(txt, lx + 1, ly + 1); ctx.fillStyle = '#e8c070'; ctx.fillText(txt, lx, ly);
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
  // reventado por exceso de daño: no queda cuerpo (los gibs de la Forja irán en su lugar)
  if (e.muerto && (e as any).reventado) return;
  const [px, py] = aPant(e.x, e.y);
  let fs: Cuadro[];
  let acc = e.acc;
  const m = e as Monstruo;
  if (e.tipo === 'heroe') fs = framesHeroe(j, acc, e.dir);
  else if (e.tipo === 'npc') fs = cuadrosMonstruo(NPCS[(e as any).npc]?.sprite ?? (e as any).npc, 'quieto', e.dir);
  else {
    // el monstruo se dibuja con su estado visible (con tiempo mínimo entre quieto y caminar)
    const av = (m as any).accVis; if (av && (av === 'quieto' || av === 'caminar' || av === 'correr') && (acc === 'quieto' || acc === 'caminar' || acc === 'correr')) acc = av;
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
  // la mitad de atrás del aura va antes del cuerpo
  if (e.tipo === 'heroe' && !e.muerto) auraHeroe(j, px, py, tiempo, true);
  let ok: boolean;
  const cambio = e.tipo === 'heroe' ? performance.now() / 1000 - cambioVisible : 9;
  if (cambio < 0.45) ok = dibujarTenido(ctx, q, px, py, '#fff2d0', 0.7 * (1 - cambio / 0.45), esc);
  else if (e.destello > 0) ok = dibujarTenido(ctx, q, px, py, '#ffffff', 0.55, esc);
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
  // aura del héroe: la mitad de adelante, encima del cuerpo
  if (e.tipo === 'heroe' && !e.muerto) auraHeroe(j, px, py, tiempo, false);
  // zona de clic
  if (!e.muerto && e.tipo !== 'heroe') picks.push({ tipo: e.tipo === 'npc' ? 'npc' : 'monstruo', ref: e, x0: px - q.ax * esc + q.w * esc * 0.2, y0: py - q.ay * esc, x1: px - q.ax * esc + q.w * esc * 0.8, y1: py + 6, prof: e.x + e.y });
  // frase del jefe
  if (e.tipo === 'monstruo' && m.habla) { ctx.font = 'italic 13px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(m.habla, px + 1, py - 95 * esc + 1); ctx.fillStyle = '#ff9060'; ctx.fillText(m.habla, px, py - 95 * esc); ctx.textAlign = 'left'; }
}

const PILAR: Record<string, string> = { magico: 'magico', raro: 'raro', conjunto: 'conjunto', unico: 'unico', legendario: 'legendario' };
const GEMAS = ['rubi', 'zafiro', 'topacio', 'esmeralda', 'amatista', 'diamante'];
/** Aura del héroe partida por profundidad: los anillos del piso en dos mitades y lo que orbita según su lado. */
function auraHeroe(j: Juego, px: number, py: number, tiempo: number, atras: boolean) {
  const au = Object.values(j.heroe.buffs).find((b) => b.t > 9000);
  const ae = auraEquipo(j.heroe.d.equipo as any);
  // mitad trasera del anillo: de PI a 2PI (arriba en pantalla); delantera: de 0 a PI
  const a0 = atras ? Math.PI : 0, a1 = atras ? Math.PI * 2 : Math.PI;
  if (ae) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const c = ae.color, pul = 0.5 + Math.sin(tiempo * 2.4) * 0.5;
    if (!atras) { const g = ctx.createRadialGradient(px, py - 40, 6, px, py - 40, 60); g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.16 * ae.k + 0.06 * pul})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(px - 60, py - 100, 120, 120); }
    ctx.globalAlpha = 0.25 + 0.2 * pul * ae.k; ctx.strokeStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(px, py, 26 + pul * 4, 13 + pul * 2, 0, a0, a1); ctx.stroke();
    for (let k = 0; k < 3; k++) { const a = tiempo * 1.7 + k * 2.1; if ((Math.sin(a) < 0) !== atras) continue; ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.fillRect(px + Math.cos(a) * 24, py - 10 - ((tiempo * 30 + k * 23) % 70) + Math.sin(a) * 8, 2, 2); }
    ctx.restore();
  }
  if (au) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(tiempo * 3) * 0.08; ctx.strokeStyle = '#ffe0a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py, 34, 17, 0, a0, a1); ctx.stroke(); ctx.restore(); }
  if (j.heroe.escudoHueso > 0) for (let k = 0; k < 4; k++) { const a = tiempo * 3 + k * 1.57; if ((Math.sin(a) < 0) !== atras) continue; ctx.fillStyle = '#e0d8c0'; ctx.fillRect(px + Math.cos(a) * 20, py - 30 + Math.sin(a) * 10, 3, 6); }
}

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
  const meta = (o.leg ? objetoMeta(`arma_${o.leg}`, 'suelo') : null) ?? (b?.arma && b.arma !== 'puno' ? (objetoMeta(`arma_${b.arma}${o.vivo ? ENCS[o.vivo] ?? '' : ''}`, 'suelo') ?? objetoMeta(`arma_${b.arma}`, 'suelo')) : null);
  // arma elemental sin dibujo propio de su elemento: un resplandor de su color debajo
  if (o.vivo && meta && !objetoMeta(`arma_${b?.arma}${ENCS[o.vivo] ?? ''}`, 'suelo')) {
    const COL: Record<string, string> = { fuego: '255,120,40', frio: '130,200,255', rayo: '210,200,255', veneno: '110,230,70', sombra: '150,80,230', luz: '255,230,150', sangre: '230,30,40' };
    const g = ctx.createRadialGradient(px, py - 4, 1, px, py - 4, 22); const c = COL[o.vivo] ?? '255,200,120', k = 0.45 + 0.15 * Math.sin(t * 4);
    g.addColorStop(0, `rgba(${c},${k})`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, py - 4, 22, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
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

/** Halo dorado que late bajo las cosas de misión, para que se encuentren en la oscuridad. */
function haloMision(px: number, py: number, t: number, destino: boolean) {
  const k = 0.55 + 0.45 * Math.sin(t * 3.2);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const r = destino ? 46 : 30;
  const g = ctx.createRadialGradient(px, py, 2, px, py, r);
  g.addColorStop(0, `rgba(255,200,110,${0.42 * k})`); g.addColorStop(0.6, `rgba(255,150,50,${0.16 * k})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  if (destino) { ctx.strokeStyle = `rgba(255,210,120,${0.5 * k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py, r * 0.8, r * 0.4, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}

// ------------------------------------------------------------------ sangre en el piso
// Sellos procedurales en caché (forma, variante y color). Cuando lleguen los de la Forja, selloSangre devuelve su sprite.
const sellos = new Map<string, HTMLCanvasElement>();
function selloSangre(forma: string, sem: number, color: string): HTMLCanvasElement {
  const k = `${forma}|${sem}|${color}`; let c = sellos.get(k); if (c) return c;
  c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d')!, r = rng(sem * 7919 + forma.length * 131);
  const mancha = (x: number, y: number, rad: number, a = 1) => { const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, color); gr.addColorStop(0.7, color); gr.addColorStop(1, color + '00'); g.globalAlpha = a; g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill(); };
  if (forma === 'charco') {
    for (let i = 0; i < 9; i++) mancha(64 + (r() - 0.5) * 40, 64 + (r() - 0.5) * 40, 16 + r() * 22, 0.9);
    // centro más oscuro y espeso
    g.globalAlpha = 0.45; g.fillStyle = '#000'; g.beginPath(); g.arc(64, 64, 18, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 6; i++) { const a = r() * Math.PI * 2, d = 44 + r() * 14; mancha(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 3 + r() * 4, 0.9); }
  } else if (forma === 'salpicadura') {
    // gota grande atrás y el chorro hacia +x, con gotas que se alejan
    mancha(34, 64, 16 + r() * 6, 0.95);
    for (let i = 0; i < 7; i++) mancha(40 + i * 9, 64 + (r() - 0.5) * 10, 9 - i * 0.8 + r() * 3, 0.85);
    for (let i = 0; i < 12; i++) { const x = 60 + r() * 62, y = 64 + (r() - 0.5) * (14 + (x - 60) * 0.5); mancha(x, y, 1.5 + r() * 3.5, 0.95); }
  } else if (forma === 'rastro') {
    for (let i = 0; i < 3; i++) mancha(44 + i * 18 + r() * 6, 64 + (r() - 0.5) * 12, 6 + r() * 5, 0.9);
  } else {
    mancha(64, 64, 14 + r() * 10, 0.9);
    for (let i = 0; i < 4; i++) { const a = r() * Math.PI * 2; mancha(64 + Math.cos(a) * 22, 64 + Math.sin(a) * 22, 2 + r() * 3, 0.9); }
  }
  g.globalAlpha = 1; sellos.set(k, c); return c;
}
/** La sangre se dibuja acostada en el piso isométrico, girada hacia donde salió el golpe. */
/** Rumbo de pantalla (8 sectores) de un ángulo del mundo, como los nombres del kit de gore. */
function rumbo(ang: number): string { const dx = Math.cos(ang), dy = Math.sin(ang); const sx = dx - dy, sy = (dx + dy) * 0.5; const a = Math.atan2(sy, sx); const i = Math.round(a / (Math.PI / 4)); return (['e', 'se', 's', 'so', 'o', 'no', 'n', 'ne'] as const)[((i % 8) + 8) % 8]; }
/** El sello del kit de gore de la Forja para esta mancha (o null si su atlas no está). */
function selloGore(m: Mancha): { q: Cuadro; esc: number } | null {
  const sup = m.sup ?? 'piedra', pal = m.pal ?? 'rojo';
  let id = '', v = '', fi = 0;
  if (m.forma === 'salpicadura') { id = 'gore_salpicadura'; v = pal === 'rojo' ? `${sup}_${rumbo(m.ang ?? 0)}` : `${pal}_${rumbo(m.ang ?? 0)}`; }
  else if (m.forma === 'charco') { id = 'gore_charco'; v = pal === 'rojo' ? sup : pal; }
  else if (m.forma === 'rastro') { id = 'gore_rastro'; v = `${sup}_${rumbo(m.ang ?? 0)}`; }
  else { id = 'gore_gotas'; v = `${sup}_${(['dispersas', 'hilera_x', 'hilera_y'])[(m.sem ?? 0) % 3]}`; }
  const meta = objetoMeta(id, v); if (!meta || !meta.f.length) return null;
  // el charco crece en sus 8 cuadros una sola vez y se queda en el último
  if (m.forma === 'charco') fi = Math.min(meta.f.length - 1, Math.floor((m.t * 25) / (meta.t || 4)));
  else fi = (m.sem ?? 0) % meta.f.length;
  const nominal = m.forma === 'charco' ? 1.1 : m.forma === 'salpicadura' ? 0.7 : 0.35;
  return { q: meta.f[fi], esc: Math.max(0.45, Math.min(1.5, (m.rmax ?? m.r) / nominal)) };
}
function dibujarSangre(m: Mancha, px: number, py: number) {
  const g = m.tipo === 'sangre' ? selloGore(m) : null;
  if (g) { ctx.save(); ctx.globalAlpha = 0.95; const ok = dibujar(ctx, g.q, px, py, g.esc); ctx.restore(); if (ok) return; }
  const st = selloSangre(m.forma!, m.sem ?? 0, m.color);
  const tam = m.r * 36;
  ctx.save(); ctx.globalAlpha = 0.9; ctx.translate(px, py); ctx.scale(1, 0.5); ctx.rotate((m.ang ?? 0) + Math.PI / 4);
  ctx.drawImage(st, -tam, -tam, tam * 2, tam * 2);
  ctx.restore();
}
