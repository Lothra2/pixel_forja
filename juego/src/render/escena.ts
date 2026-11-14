// Dibuja la zona: pisos, manchas, objetos y personajes por profundidad, poderes, partículas, luz, niebla y clima.
import { nuevoCuadroSombras } from './luces';
import { ctx, W, H, E } from '../nucleo/lienzo';
import { Sonido } from '../audio/sonido';
import { ZONAS } from '../mundo/actos';
import { puntoSalida } from '../mundo/zona';
import { esquivarHud, etiquetasMundo, hud } from '../ui/hud_rects';
import { NPCS } from '../datos/npcs';
import { LUZ_EFECTO } from '../../../src/engine/gotico/luz_efectos';
import { cuadrosPiso, cuadrosHeroe, cuadrosMonstruo, objetoMeta, dibujar, dibujarTenido, manifiesto, type Cuadro } from '../motor/assets';
import type { Juego, Ent, Monstruo, Efecto, Mancha } from '../juego/mundo';
import { CUADROS, DIRS, DIR_VEC, ZANCADA, ALTO_CLASE } from '../juego/mundo';
import { sensacionDe, cuadroAtaque } from '../juego/sensacion';
import { animClase, zancadaClase, zancadaCorrerMonstruo } from '../juego/anim';
import ZANCADA_MONSTRUO from '../../../src/engine/gotico/datos/zancada_monstruos.json';
import { baseDe } from '../juego/objetos';
import { icono } from '../ui/comun';
import { cuadrosVivos, cambioVisible } from '../motor/pintor';
import { R, rng } from '../nucleo/azar';
import { auraEquipo } from '../juego/visual';
import { calorOzmaren, fuegoMundo, dibujarFuegosMundo } from './fuego';
import { prepararFuegos, vivosDe, tieneFuegoDoom, dibujarVivos } from './fuego_vivo';
import { dibujarPfx, alfaCuerpo, efectoPfx, dirPfx } from './pfx';
import { estadosPfx, usosPfx } from '../juego/pfx_usos';
import { dibujarAmbiente, dibujarClimaPfx } from './pfx_mundo';
import { cuerpoArde, armaArde, seguirSuelo, dibujarSuelo, ozmarenArde, cometa, llamaViva } from './fuego_especial';
let dtCuadro = 1 / 60;
// bruma de altura: cada cuadro alto se pinta una vez con el degradado del color de la niebla de la zona
let colorBruma = '78,82,96', anclasCuadro: { q: Cuadro; br: HTMLCanvasElement | null; px: number; py: number }[] = [], esAncla = new Set<object>();
const brumas = new WeakMap<Cuadro, { c: string; cv: HTMLCanvasElement }>();
function conBruma(q: Cuadro, c: string): HTMLCanvasElement | null {
  const g0 = brumas.get(q); if (g0 && g0.c === c) return g0.cv;
  const cv = document.createElement('canvas'); cv.width = q.w; cv.height = q.h;
  const g = cv.getContext('2d')!;
  if (!dibujar(g, q, q.ax, q.ay)) return null;
  // de 0 a 200 px sobre el ancla no hay bruma; de ahí a la punta sube hasta 0.2 de un gris azulado neutro, mezclado
  // (source-atop, no suma luz): baja el contraste de lo alto sin aclararlo
  const y120 = Math.max(1, q.ay - 200), gr = g.createLinearGradient(0, y120, 0, 0);
  gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(1, `rgba(${c},0.2)`);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = gr; g.fillRect(0, 0, q.w, y120);
  brumas.set(q, { c, cv });
  return cv;
}
const nieblaCv = document.createElement('canvas');
const congelados = new WeakSet<object>();
const ES_FUEGO = /fogata|hoguera|brasero|pira|antorcha|fuego|caldero|hogar/;
import { recolectar, sombras, reflejos, luces, destello, destelloColor } from './luces';

export const cam = { x: 0, y: 0 };
/** Hacia dónde mira la cámara además del héroe (presentación de un jefe): k de 0 a 1. */
export const foco = { x: 0, y: 0, k: 0 };
const camS = { x: 0, y: 0, mx: 0, my: 0 }; let camZona = '';
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
  // el héroe: la zancada de su clase (cada estilo pisa distinto) por su alto
  if (e.tipo === 'heroe') { const cl = (e as any).d?.clase; return (zancadaClase(cl, acc === 'correr' ? 'correr' : 'caminar') ?? base) * (za?.[cl] ?? ALTO_CLASE[cl] ?? 1); }
  const m = e as Monstruo;
  // Thor trota a la cintura del héroe: su zancada es más corta que la de un humanoide de su alto
  if (m.def?.sprite?.startsWith('thor')) return base * 0.55;
  // tabla de la Forja: casillas por ciclo de caminar a escala 1, medidas en el sprite (sin pies: el ritmo de aleteo)
  // los que galopan o aletean al correr traen su propio ritmo
  const zc = acc === 'correr' ? zancadaCorrerMonstruo(m.def?.sprite) : undefined;
  if (zc) return zc * (m.escala ?? 1);
  const zm = (ZANCADA_MONSTRUO as Record<string, number>)[m.def?.sprite];
  if (zm) return zm * (base / ZANCADA.caminar) * (m.escala ?? 1);
  const alto = za?.[m.def?.sprite];
  return base * (alto ?? 0.9) * (m.escala ?? 1);
}
const fr = (acc: string, t: number, dur: number, e?: Ent, accPies?: string, nReal?: number) => {
  // los cuadros que de verdad tiene la animación (los héroes traen 12 al atacar y correr, los monstruos 8)
  const n = nReal || (CUADROS[acc as keyof typeof CUADROS] ?? 8);
  if (e && (acc === 'caminar' || acc === 'correr')) return Math.floor(((e.recorrido ?? 0) / zancadaDe(e, accPies ?? acc)) * n) % n;
  // cada cuerpo respira a su ritmo: un grupo quieto ya no se mueve como un solo muñeco
  if (acc === 'quieto') return Math.floor((t + (e ? (e.id % 9) * 0.29 : 0)) * (e ? 5.4 + (e.id % 4) * 0.4 : 6)) % n;
  if (acc === 'caminar') return Math.floor(t * 11) % n;
  if (acc === 'correr') return Math.floor(t * 14) % n;
  if (acc === 'morir') return Math.min(n - 1, Math.floor(t * 14));
  // atacar y lanzar: la carga y la salida van al ritmo de cada cuerpo, con el cuadro de impacto justo en el golpe
  if (e && (acc === 'atacar' || acc === 'lanzar') && e.golpeEn > 0 && dur > 0) { const an = e.tipo === 'heroe' ? animClase((e as any).d?.clase, acc) : undefined;
    // un combo (el monje) lleva sus golpes en cuadros fijos: la animación corre pareja para que cada uno caiga en el suyo
    if (an?.golpes?.length && (e as any).combo3) return Math.min(n - 1, Math.floor((t / dur) * n));
    return cuadroAtaque(Math.min(1, t / dur), Math.min(0.9, e.golpeEn / dur), n, sensacionDe(e).curva, an?.impacto !== undefined ? Math.round((an.impacto / an.cuadros) * n) : undefined); }
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

let camAlzada = 0, camJefe = 0;
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
    if (dy > -2 && dy < 26 && dx < 16) alzar = Math.max(alzar, 240 * Math.min(1, (26 - dy) / 14) * Math.min(1, (16 - dx) / 6));
  }
  camAlzada += (alzar - camAlzada) * Math.min(1, dt * 2.5);
  // la cámara sigue al héroe con un resorte corto y se adelanta un poco hacia donde camina (antes iba clavada a él: cada
  // arranque y cada giro sacudían toda la pantalla). Al cambiar de zona o teletransportarse, corta en seco
  {
    const hx = (h.x - h.y) * 16, hy = (h.x + h.y) * 8, anda = !h.muerto && (h.acc === 'caminar' || h.acc === 'correr');
    const [vx, vy] = DIR_VEC[h.dir] ?? [0, 0], mx = anda ? (vx - vy) * 0.71 * 30 : 0, my = anda ? (vx + vy) * 0.71 * 15 : 0;
    const clave = z.id + ':' + z.semilla;
    if (clave !== camZona || Math.hypot(hx - camS.x, hy - camS.y) > 150) { camZona = clave; camS.x = hx; camS.y = hy; camS.mx = 0; camS.my = 0; }
    const km = Math.min(1, dt * 2.4), ks = 1 - Math.exp(-dt * 11);
    camS.mx += (mx - camS.mx) * km; camS.my += (my - camS.my) * km;
    camS.x += (hx + camS.mx - camS.x) * ks; camS.y += (hy + camS.my - camS.y) * ks;
    cam.x = camS.x + sx; cam.y = camS.y + sy - camAlzada;
    // el empujón del golpe: la cámara cede un instante hacia donde pegó el héroe
    const pt = j.patada; if (pt) { const ed = (performance.now() - pt.t) / 140; if (ed < 1) { const q = (1 - ed) ** 2 * pt.k; cam.x += pt.dx * q; cam.y += pt.dy * q; } }
  }
  // plano de llegada a la catedral: la primera vez que el héroe entra al camposanto o se acerca a la puerta, 3.5 s con la
  // fachada entera (el foco de siempre, sin zoom); se suelta antes si el héroe camina más de 2 casillas
  planoLlegada(j, dt);
  // cámara de jefe: entre el héroe y el jefe, con el jefe entero debajo de su barra y el héroe arriba del HUD
  const jf = j.jefe, enPelea = !!jf && !jf.muerto && Math.hypot(jf.x - h.x, jf.y - h.y) < 16 && foco.k <= 0;
  camJefe += ((enPelea ? 1 : 0) - camJefe) * Math.min(1, dt * 1.8);
  if (camJefe > 0.002 && jf) {
    const q0 = cuadrosMonstruo(jf.def.sprite, 'quieto', 's')[0], alto = (q0?.ay ?? 120) * (jf.escala ?? 1);
    const bx = (jf.x - jf.y) * 16, by = (jf.x + jf.y) * 8, hx = (h.x - h.y) * 16, hy = (h.x + h.y) * 8, c0 = (H - 96) / 2;
    const barra = hud.jefe ? hud.jefe[1] + hud.jefe[3] : 70;
    // y de cámara: el jefe con los pies a (barra + alto + 16) como mínimo; el héroe nunca más abajo que H - 170
    const maxJefe = by + c0 - (barra + alto + 16), minHeroe = hy + c0 - (H - 170);
    const yMedio = (hy + by) / 2 - H * 0.08;
    const ty = Math.max(minHeroe, Math.min(maxJefe, yMedio));
    const k = camJefe * camJefe * (3 - 2 * camJefe);
    cam.x += ((hx + bx) / 2 + sx - cam.x) * k; cam.y += (ty + sy - cam.y) * k;
  }
  if (foco.k > 0) { const k = foco.k * foco.k * (3 - 2 * foco.k); cam.x += ((foco.x - foco.y) * 16 - camS.x) * k; cam.y += ((foco.x + foco.y) * 8 - 60 - camS.y + camAlzada) * k; }
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  picks = [];
  prepararFuegos(j, dt, aPant, W, H); seguirSuelo(j, dt); dtCuadro = dt;
  colorBruma = '96,100,108'; anclasCuadro = []; esAncla = new Set(z.salidas.flatMap((sa) => sa.piezas ?? []));
  recolectar(j, tiempo, aPant, W, H);
  // explorar
  const btx = Math.floor(h.x / 5), bty = Math.floor(h.y / 5);
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const X = btx + dx, Y = bty + dy; if (X >= 0 && Y >= 0 && X < z.tw && Y < z.th && dx * dx + dy * dy <= 13) z.explorado[Y * z.tw + X] = 1; }
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
  if (!(window as any).__sinMatiz) matizSuelo(j, bx0, bx1, by0, by1);
  // cavernas: la roca maciza se pinta negra encima del piso, por tramos de celdas seguidas (los peñascos del contorno van después, encima)
  if (z.hueco) {
    const hu = z.hueco, cx0 = Math.max(0, bx0 * 5), cx1 = Math.min(z.W - 1, bx1 * 5 + 4), cy0 = Math.max(0, by0 * 5), cy1 = Math.min(z.H - 1, by1 * 5 + 4);
    ctx.fillStyle = '#050403'; ctx.beginPath();
    for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) {
      if (!hu[y * z.W + x]) continue;
      let x2 = x; while (x2 < cx1 && hu[y * z.W + x2 + 1]) x2++;
      const a = aPant(x, y), b2 = aPant(x2 + 1, y), c = aPant(x2 + 1, y + 1), d = aPant(x, y + 1);
      if (!(b2[0] < -40 || d[0] > W + 40 || c[1] < -20 || a[1] > H + 20)) { ctx.moveTo(a[0], a[1] - 1); ctx.lineTo(b2[0] + 1, b2[1]); ctx.lineTo(c[0], c[1] + 1); ctx.lineTo(d[0] - 1, d[1]); ctx.closePath(); }
      x = x2;
    }
    ctx.fill();
  }
  if (z.lluvia && z.tipo !== 'mazmorra' && !(window as any).__sinLluvia) lluviaSuelo(j, dt, tiempo, aPant, aMundo);
  // manchas
  for (const m of j.manchas) {
    const [px, py] = aPant(m.x, m.y); if (px < -60 || px > W + 60 || py < -40 || py > H + 40) continue;
    if (m.forma) { dibujarSangre(m, px, py); continue; }
    ctx.save(); ctx.globalAlpha = m.tipo === 'quemado' ? 0.55 : 0.75; ctx.fillStyle = m.color;
    ctx.beginPath(); ctx.ellipse(px, py, m.r * 16, m.r * 8, 0, 0, Math.PI * 2); ctx.fill();
    if (m.tipo === 'sangre' && m.r > 0.5) { ctx.beginPath(); ctx.ellipse(px + m.r * 9, py + 3, m.r * 6, m.r * 3, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  // el piso que sigue ardiendo después de los poderes de fuego
  dibujarSuelo(ctx, aPant, dt);
  // aviso del aliento: el cono se enciende en el piso antes de soplar (para poder salir de él)
  for (const m of j.monstruos) {
    const al = (m as any).aliento; if (!al || al.fase !== 'aviso' || m.muerto) continue;
    const k = Math.min(1, al.t / 0.6), R0 = al.conf.alcance;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath();
    const [x0, y0] = aPant(m.x, m.y); ctx.moveTo(x0, y0);
    for (let i = 0; i <= 12; i++) { const a = al.ang - Math.PI / 4 + (i / 12) * (Math.PI / 2); const [x, y] = aPant(m.x + Math.cos(a) * R0, m.y + Math.sin(a) * R0); ctx.lineTo(x, y); }
    // amarillo claro y borde marcado: sobre la lava de Ozmaren un naranja no se distingue
    ctx.closePath(); ctx.fillStyle = `rgba(255,210,110,${0.14 + 0.3 * k})`; ctx.fill();
    ctx.strokeStyle = `rgba(255,240,180,${0.5 + 0.5 * k})`; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
  }
  // aviso de las maniobras de los monstruos: círculo o carril en el piso que se llena hasta el momento del golpe
  for (const m of j.monstruos) {
    const mn = (m as any).man; if (!mn || m.muerto || mn.fase === 'recupera') continue;
    const enAire = mn.tipo === 'salto' && mn.fase === 'accion';
    if (mn.fase !== 'aviso' && !enAire) continue;
    const k = enAire ? 1 : Math.min(1, mn.t / mn.aviso), pulso = 0.5 + 0.5 * Math.sin(tiempo * 18);
    const rojo = `rgba(255,70,40,${0.1 + 0.22 * k})`, borde = `rgba(255,${150 - 70 * k},${90 - 50 * k},${0.55 + 0.4 * k * pulso})`;
    const disco = (cx: number, cy: number, r: number) => {
      ctx.beginPath(); for (let i = 0; i <= 28; i++) { const a = (i / 28) * Math.PI * 2; const [x, y] = aPant(cx + Math.cos(a) * r, cy + Math.sin(a) * r); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.closePath(); ctx.fillStyle = rojo; ctx.fill(); ctx.strokeStyle = borde; ctx.lineWidth = 2; ctx.stroke();
      // el relleno que crece marca cuánto falta
      ctx.beginPath(); for (let i = 0; i <= 28; i++) { const a = (i / 28) * Math.PI * 2; const [x, y] = aPant(cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.closePath(); ctx.fillStyle = `rgba(255,120,60,${0.16 + 0.14 * k})`; ctx.fill();
    };
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (mn.tipo === 'embestida') {
      const w = m.radio + 0.45, L = mn.largo, c = Math.cos(mn.ang), sn = Math.sin(mn.ang), nx = -sn * w, ny = c * w;
      const P = (d: number, lado: number) => aPant(m.x + c * d + nx * lado, m.y + sn * d + ny * lado);
      const camino = (d1: number) => { ctx.beginPath(); const a = P(0, 1), b2 = P(d1, 1), c2 = P(d1 + w, 0), d2 = P(d1, -1), e2 = P(0, -1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(d2[0], d2[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); };
      camino(L); ctx.fillStyle = rojo; ctx.fill(); ctx.strokeStyle = borde; ctx.lineWidth = 2; ctx.stroke();
      camino(L * k); ctx.fillStyle = `rgba(255,120,60,${0.16 + 0.14 * k})`; ctx.fill();
    } else if (mn.tipo === 'charcos') { for (const [x, y] of mn.puntos ?? []) disco(x, y, mn.radio); }
    else if (mn.tipo === 'abanico') {
      const R0 = (m.def.rango ?? 7), n = 7, ab = 0.2 * 3.4; ctx.beginPath(); const [x0, y0] = aPant(m.x, m.y); ctx.moveTo(x0, y0);
      for (let i = 0; i <= 12; i++) { const a = mn.ang - ab + (i / 12) * ab * 2; const [x, y] = aPant(m.x + Math.cos(a) * R0, m.y + Math.sin(a) * R0); ctx.lineTo(x, y); }
      ctx.closePath(); ctx.fillStyle = `rgba(255,90,50,${0.06 + 0.14 * k})`; ctx.fill(); ctx.strokeStyle = borde; ctx.lineWidth = 1.5; ctx.stroke(); void n;
    } else disco(mn.x, mn.y, mn.radio);
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
    // el cofre que se abre con pixelfx: el del catálogo se oculta mientras dura (el efecto trae su cofre)
    if (o.dato?.abre !== undefined && j.t - o.dato.abre < 4.2 && efectoPfx('fx_cofre_abre') && j.efectos.some((e) => e.id === 'pfx:fx_cofre_abre' && e.x === o.cx + 0.5 && e.y === o.cy + 0.5)) continue;
    // fuego de Doom vivo: el gemelo sin llama y el fuego encima
    const vivos = vivosDe(o), gem = vivos?.[0].s.sprite ? objetoMeta(vivos[0].s.sprite, o.v) : null;
    if (vivos && gem?.f.length) q = gem.f[0];
    // (un objeto grande que se pisa por dentro, como el círculo de piedras o una fosa, se ordena por su borde de atrás: por
    // su centro, el que entraba quedaba dibujado detrás de la losa entera)
    // (el río es agua: va como suelo y nunca tapa a nadie)
    const prof = meta.plano || o.id === 'par_arroyo' || o.id === 'inf2_rio_lava' ? -1e6 + o.cx + o.cy : pisable(j.zona, o) ? o.cx + o.cy - (o.hw + o.hh) / 2 + 1 : o.cx + o.cy + (o.hw + o.hh) / 2 - 1;
    const alto = q.ay;
    items.push({ prof, draw: () => {
      // transparencia si tapa al héroe
      let alfa = 1;
      if (alto > 60) {
        const [hx, hy] = aPant(h.x, h.y);
        if (prof > h.x + h.y && hx > px - q.ax && hx < px - q.ax + q.w && hy - 30 > py - q.ay && hy - 30 < py - q.ay + q.h * 0.85) alfa = 0.45;
      }
      // lo alto (más de 200 px sobre el ancla) lleva bruma de altura: perspectiva atmosférica
      const br = q.ay > 200 ? conBruma(q, colorBruma) : null;
      if (alfa < 1) ctx.globalAlpha = alfa;
      if (br) ctx.drawImage(br, Math.round(px - q.ax), Math.round(py - q.ay)); else dibujar(ctx, q, px, py);
      if (alfa < 1) ctx.globalAlpha = 1;
      if (esAncla.has(o)) anclasCuadro.push({ q, br, px, py });
      // fuego vivo sobre fogatas, braseros, piras y antorchas
      if (vivos && (gem?.f.length || !vivos[0].s.sprite)) dibujarVivos(ctx, vivos, px, py, alfa);
      else if (meta.luz && !tieneFuegoDoom(o) && ES_FUEGO.test(o.id) && !/^(arma_|mis_)/.test(o.id) && !/apagad/.test(o.v)) fuegoMundo(ctx, px, py - meta.luz[2] * 1.1, Math.max(0.3, Math.min(1.3, meta.luz[0] / 160)), tiempo, cam.x, cam.y);
    } });
    if (o.dato?.mision && (o.tag === 'pista' || o.tag === 'reliquia' || o.tag === 'altar' || o.tag === 'destino')) items.push({ prof: prof - 0.01, draw: () => haloMision(px, py, tiempo, o.tag === 'destino') });
    if (o.tag === 'pista' || o.tag === 'reliquia' || o.tag === 'altar' || o.tag === 'libro' || o.tag === 'cofre' || o.tag === 'santuario' || o.tag === 'pozo' || o.tag === 'baul' || o.tag === 'romper' || o.id === 'com_piedra_viaje') picks.push({ tipo: 'objeto', ref: o, x0: px - q.ax, y0: py - q.ay, x1: px - q.ax + q.w, y1: py - q.ay + q.h, prof });
  }
  // salidas (las puertas/escaleras ya están como objetos; aquí solo la zona de clic)
  // la zona de clic de una salida es chica y centrada: el umbral, no todo el borde (antes se robaba clics para caminar)
  for (const s of z.salidas) { const [px, py] = aPant(...puntoSalida(z, s)); picks.push({ tipo: 'salida', ref: s, x0: px - 26, y0: py - 70, x1: px + 26, y1: py + 12, prof: s.cx + s.cy - 2 }); }
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
    items.push({ prof: (muerto ? e.x + e.y - 0.6 : e.x + e.y) + (sobrePuente(j, e) > 0 ? 4 : 0), draw: () => dibujarEnt(j, e, tiempo) });
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
    // los hechizos lanzados arden en vivo (cometas de fuego de Doom); flechas y virotes llevan además su sprite
    if (!(window as any).__sinCometa && cometa(ctx, p, px, py, dtCuadro) === 'solo') continue;
    if (id.startsWith('pfx:')) { if (dibujarPfx(ctx, id.slice(4), p.t, px, py, { dir: dirPfx(p.vx, p.vy) })) continue; }
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
  // lo que vive en la zona (pixelfx): antes de la luz, así la noche también lo oscurece
  dibujarAmbiente(ctx, j, aPant, W, H, tiempo);
  // bruma baja al pie de la catedral, y después la luz
  brumaAncla(j);
  dibujarLuz(j, tiempo);
  puertaCatedral(j, dt, tiempo);
  // arcos de rayo: después de la luz (dibujados antes, la noche los apagaba y el rayo no se veía salir de la mano)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1;
  for (const e of j.efectos) if (e.id === 'arco_cadena' && (e as any).x2 !== undefined) {
    const [ax, ay] = aPant(e.x, e.y), [bx, by] = aPant((e as any).x2, (e as any).y2);
    // el relámpago en vivo, de la mano al pecho (el arco prehorneado estirado no se veía)
    rayo(ax, ay - ((e as any).deMano ? 44 : 34), bx, by - 34, Math.max(0, 1 - e.t / (e.dur ?? 0.3)) ** 0.6);
  }
  ctx.restore();
  // números de daño (encima de la oscuridad para que se lean)
  ctx.textAlign = 'center';
  for (const n of j.numeros) {
    const [px, py] = aPant(n.x, n.y);
    const k = 1 - n.t / 1.1;
    ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.6));
    ctx.font = n.chico ? 'italic 10px Georgia, serif' : `bold ${n.grande ? 18 : n.menor ? 11 : 13}px Georgia, serif`;
    if (n.chico) ctx.globalAlpha *= 0.8;
    const yy = py - n.z - (n.grande ? Math.sin(Math.min(1, n.t * 5) * Math.PI) * 6 : 0);
    ctx.fillStyle = '#000'; ctx.fillText(n.txt, px + 1, yy + 1); ctx.fillStyle = n.color; ctx.fillText(n.txt, px, yy);
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
  // salidas: se leen de lejos. Sin puerta, un umbral de luz (dos pilares y un arco, aro en el piso y motas que suben);
  // con puerta o escalera, el objeto es el marco y lleva solo el aro y las motas. La luz propia que tiñe el piso va en luces.ts.
  // El nombre aparece a unas 6 casillas (con Alt, todos).
  etiquetasMundo.length = 0;
  for (const sa of z.salidas) {
    const [px, py] = aPant(...puntoSalida(z, sa));
    if (px < -120 || px > W + 120 || py < -140 || py > H + 80) continue;
    const pulso = 0.5 + 0.5 * Math.sin(tiempo * 2.2 + sa.cx);
    umbralVivo(px, py, !sa.obj, ZONAS[sa.destino], tiempo, pulso, sa.cx * 7.3 + sa.cy * 3.1, dtCuadro);
    // el nombre: de cerca, entero en pantalla y en táctil fuera de los botones de abajo a la derecha
    const d = Math.hypot(j.heroe.x - sa.cx - 0.5, j.heroe.y - sa.cy - 0.5), kn = E.alt ? 1 : Math.max(0, Math.min(1, 6.5 - d));
    if (kn <= 0) continue;
    ctx.font = '13px Georgia, serif'; ctx.textAlign = 'center';
    const txt = '» ' + sa.nombre[opciones.idi] + ' «', tw2 = ctx.measureText(txt).width;
    let lx = Math.max(tw2 / 2 + 6, Math.min(W - tw2 / 2 - 6, px)), ly = Math.max(16, Math.min(H - 130, py - (sa.obj ? 96 : 100)));
    ly = esquivarHud([lx - tw2 / 2, ly - 12, tw2, 16]) + 12;
    etiquetasMundo.push({ txt, r: [lx - tw2 / 2, ly - 12, tw2, 16] });
    ctx.globalAlpha = kn; ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(lx - tw2 / 2 - 5, ly - 13, tw2 + 10, 18);
    ctx.fillStyle = '#e8c070'; ctx.fillText(txt, lx, ly); ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
  // clima
  clima(j, dt, tiempo);
}

const nieblaBaja = document.createElement('canvas');
const chispasPortal = new Map<number, { x: number; y: number; vx: number; vy: number; t: number; d: number }[]>();
/**
 * El umbral de una salida, vivo: un sello de runas que gira en el piso, y donde no hay puerta un arco de luz con un velo
 * que ondula adentro, dos braseros de fuego de Doom en los pies, un haz que sube y motas en espiral. El color dice a
 * dónde lleva: oro al pueblo, verde azulado a las mazmorras, rojo brasa a las tierras de fuego y luna fría al resto.
 */
function umbralVivo(px: number, py: number, conArco: boolean, dest: { tipo?: string; tema?: string } | undefined, t: number, pulso: number, sem: number, dt: number) {
  const fuego = /infierno|lava|fragua|ceniza/.test(dest?.tema ?? '');
  const [c, pal]: [[number, number, number], 'sagrado' | 'animas' | 'infierno' | 'corona_fria'] = dest?.tipo === 'pueblo' ? [[255, 196, 110], 'sagrado'] : fuego ? [[255, 96, 48], 'infierno'] : dest?.tipo === 'mazmorra' ? [[96, 220, 204], 'animas'] : [[170, 198, 255], 'corona_fria'];
  const rgba = (a: number, k = 1) => `rgba(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)},${Math.max(0, Math.min(1, a))})`;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1;
  // la luz que se derrama en el piso
  const g = ctx.createRadialGradient(px, py, 3, px, py, 52); g.addColorStop(0, rgba(0.3 + pulso * 0.1)); g.addColorStop(0.5, rgba(0.1)); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, py, 52, 26, 0, 0, Math.PI * 2); ctx.fill();
  // el sello: dos aros de trazos que giran al revés y ocho runas entre ellos
  ctx.lineWidth = 1.5;
  for (const [rx, giro, n, a] of [[34, t * 0.5, 14, 0.55], [24, -t * 0.8, 9, 0.4]] as [number, number, number, number][]) {
    ctx.strokeStyle = rgba(a + pulso * 0.2);
    for (let i = 0; i < n; i++) { const a0 = giro + (i / n) * Math.PI * 2; ctx.beginPath(); ctx.ellipse(px, py, rx, rx / 2, 0, a0, a0 + (Math.PI * 2 / n) * 0.62); ctx.stroke(); }
  }
  for (let i = 0; i < 8; i++) {
    const a = t * 0.5 + (i / 8) * Math.PI * 2, x = px + Math.cos(a) * 29, y = py + Math.sin(a) * 14.5, k = 0.45 + 0.4 * Math.sin(t * 3 + i * 1.7);
    ctx.fillStyle = rgba(k); ctx.fillRect(Math.round(x) - 1, Math.round(y) - 2, 2, 4); ctx.fillRect(Math.round(x) - 2, Math.round(y) - (i % 2 ? 2 : 0), 4, 1);
  }
  if (conArco) {
    // el portal: un óvalo de pie con un remolino adentro (brazos en espiral que se tragan la luz hacia el ojo) y chispas que
    // se desprenden del borde. Sin marco de piedra: el borde es energía viva que tiembla.
    const cy = py - 46, RX = 23, RY = 42, giro = t * 2.6 + sem;
    // resplandor de afuera
    const gh = ctx.createRadialGradient(px, cy, 8, px, cy, 70); gh.addColorStop(0, rgba(0.22 + pulso * 0.08)); gh.addColorStop(0.55, rgba(0.07)); gh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gh; ctx.beginPath(); ctx.ellipse(px, cy, 44, 70, 0, 0, Math.PI * 2); ctx.fill();
    // el fondo del óvalo: un pozo oscuro (tapa lo de atrás) y encima el remolino
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    const gf = ctx.createRadialGradient(px, cy, 0, px, cy, RY); gf.addColorStop(0, 'rgba(4,3,8,0.96)'); gf.addColorStop(0.7, `rgba(${c[0] >> 3},${c[1] >> 3},${c[2] >> 3},0.92)`); gf.addColorStop(1, `rgba(${c[0] >> 2},${c[1] >> 2},${c[2] >> 2},0.85)`);
    ctx.fillStyle = gf; ctx.beginPath(); ctx.ellipse(px, cy, RX, RY, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.ellipse(px, cy, RX, RY, 0, 0, Math.PI * 2); ctx.clip();
    // brazos del remolino: espirales que giran, cada una hecha de tramos que se afinan y se apagan hacia el ojo
    for (let b = 0; b < 5; b++) {
      const a0 = giro + (b / 5) * Math.PI * 2, vel = 1 + (b % 2) * 0.35;
      for (let k = 0; k < 26; k++) {
        const f = k / 26, f2 = (k + 1) / 26, r1 = 1 - f * 0.94, r2 = 1 - f2 * 0.94;
        const a1 = a0 * vel + f * 5.4 + Math.sin(t * 1.7 + b + f * 4) * 0.18, a2 = a0 * vel + f2 * 5.4 + Math.sin(t * 1.7 + b + f2 * 4) * 0.18;
        ctx.strokeStyle = b % 2 ? `rgba(255,250,235,${0.5 * (1 - f) + 0.08})` : rgba(0.85 * (1 - f * 0.8)); ctx.lineWidth = Math.max(0.8, (b % 2 ? 2 : 3.4) * (1 - f * 0.75));
        ctx.beginPath(); ctx.moveTo(px + Math.cos(a1) * RX * r1, cy + Math.sin(a1) * RY * r1); ctx.lineTo(px + Math.cos(a2) * RX * r2, cy + Math.sin(a2) * RY * r2); ctx.stroke();
      }
    }
    // jirones que caen al ojo y el ojo mismo
    for (let i = 0; i < 14; i++) {
      const f = (t * (0.5 + (i % 4) * 0.13) + i * 0.071 + sem) % 1, a = giro * 1.4 + i * 2.39 + f * 4.2, r = 1 - f;
      ctx.fillStyle = i % 3 ? rgba(0.9 * Math.sin(f * Math.PI)) : `rgba(255,255,255,${0.9 * Math.sin(f * Math.PI)})`;
      ctx.fillRect(Math.round(px + Math.cos(a) * RX * r), Math.round(cy + Math.sin(a) * RY * r), i % 2 ? 2 : 1, i % 2 ? 2 : 1);
    }
    const go = ctx.createRadialGradient(px, cy, 0, px, cy, 9 + pulso * 3); go.addColorStop(0, 'rgba(255,255,255,0.95)'); go.addColorStop(0.4, rgba(0.7)); go.addColorStop(1, rgba(0));
    ctx.fillStyle = go; ctx.fillRect(px - 13, cy - 13, 26, 26);
    ctx.restore();
    // el borde: tres pasadas (halo, color, filo blanco) sobre un óvalo que tiembla
    for (const [w, col] of [[10, rgba(0.13 + pulso * 0.05)], [4.5, rgba(0.62 + pulso * 0.2)], [1.4, `rgba(255,250,235,${0.8 + pulso * 0.2})`]] as [number, string][]) {
      ctx.lineWidth = w; ctx.strokeStyle = col; ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2, d = 1 + 0.035 * Math.sin(a * 7 + t * 9 + sem) + 0.02 * Math.sin(a * 13 - t * 14); const x = px + Math.cos(a) * RX * d, y = cy + Math.sin(a) * RY * d; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.closePath(); ctx.stroke();
    }
    // rayitos que corren por el borde
    for (let i = 0; i < 3; i++) {
      const a = (t * (1.9 + i * 0.7) + i * 2.1 + sem) % (Math.PI * 2), l = 0.5 + 0.2 * Math.sin(t * 5 + i);
      ctx.strokeStyle = `rgba(255,255,255,${0.7 + 0.3 * Math.sin(t * 23 + i * 5)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, cy, RX, RY, 0, a, a + l); ctx.stroke();
    }
    // chispas que el borde escupe hacia afuera y caen
    const ch = (chispasPortal.get(sem) ?? chispasPortal.set(sem, []).get(sem)!);
    if (ch.length < 46) for (let n = 0; n < 2; n++) if (Math.random() < 0.85) {
      const a = Math.random() * Math.PI * 2, v = 28 + Math.random() * 60, tg = (Math.random() < 0.5 ? 1 : -1) * 34;
      ch.push({ x: Math.cos(a) * RX, y: Math.sin(a) * RY, vx: Math.cos(a) * v - Math.sin(a) * tg, vy: Math.sin(a) * v + Math.cos(a) * tg - 12, t: 0, d: 0.35 + Math.random() * 0.7 });
    }
    for (let i = ch.length - 1; i >= 0; i--) {
      const q = ch[i]; q.t += dt; if (q.t > q.d) { ch.splice(i, 1); continue; }
      q.vy += 130 * dt; q.vx *= 1 - 1.2 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      const k = 1 - q.t / q.d, X = Math.round(px + q.x), Y = Math.round(cy + q.y);
      ctx.fillStyle = k > 0.6 ? `rgba(255,255,255,${k})` : rgba(k * 1.3); ctx.fillRect(X, Y, k > 0.5 ? 2 : 1, k > 0.5 ? 2 : 1);
      // estela corta
      ctx.fillStyle = rgba(k * 0.45); ctx.fillRect(Math.round(X - q.vx * 0.03), Math.round(Y - q.vy * 0.03), 1, 1);
    }
    // el haz que sube por encima y el fuego vivo en el pie
    const gz = ctx.createLinearGradient(0, cy - RY - 60, 0, cy - RY + 6); gz.addColorStop(0, rgba(0)); gz.addColorStop(1, rgba(0.14 + pulso * 0.08));
    ctx.fillStyle = gz; ctx.fillRect(px - 4, cy - RY - 60, 8, 66);
    if (!(window as any).__sinFuego) llamaViva(ctx, pal, px, py + 3, 30, 22, dt, 0.75);
  }
  // motas en espiral y alguna chispa que salta
  for (let i = 0; i < 10; i++) {
    const f = (t * 0.4 + i / 10 + sem * 0.13) % 1, a = f * 7 + i * 2.4, r = (conArco ? 17 : 22) * (1 - f * 0.45), x = px + Math.cos(a) * r, y = py - 3 - f * (conArco ? 84 : 62) + Math.sin(a) * r * 0.25;
    ctx.fillStyle = i % 4 ? rgba(Math.sin(f * Math.PI) * 0.85) : `rgba(255,255,255,${Math.sin(f * Math.PI) * 0.9})`; ctx.fillRect(Math.round(x), Math.round(y), i % 3 ? 2 : 1, i % 3 ? 2 : 1);
  }
  ctx.restore();
}

function dibujarRaw(raw: any[], x: number, y: number) {
  const q: Cuadro = { img: null, atlas: raw[0], x: raw[1], y: raw[2], w: raw[3], h: raw[4], ax: raw[5], ay: raw[6] };
  dibujar(ctx, q, x, y);
}
function dibujarEfecto(e: Efecto, _t: number) {
  if (e.id === 'arco_cadena') return;
  if (e.id.startsWith('pfx:')) { const [px, py] = aPant(e.x, e.y); dibujarPfx(ctx, e.id.slice(4), e.t, px, py - (e.z ?? 0), { dir: e.dir, escala: e.escala }); return; }
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
/**
 * Un relámpago en vivo de (ax, ay) a (bx, by): línea quebrada que cambia cada cuadro, con resplandor azul ancho, cuerpo
 * celeste y núcleo blanco, y dos ramas cortas que se abren. `k` 1 recién nacido, 0 apagado.
 */
function rayo(ax: number, ay: number, bx: number, by: number, k: number) {
  const dx = bx - ax, dy = by - ay, largo = Math.hypot(dx, dy) || 1, nx = -dy / largo, ny = dx / largo;
  const seg = Math.max(4, Math.round(largo / 13)), pts: [number, number][] = [[ax, ay]];
  for (let i = 1; i < seg; i++) { const t = i / seg, d = (R() - 0.5) * 22 * Math.sin(t * Math.PI); pts.push([ax + dx * t + nx * d, ay + dy * t + ny * d]); }
  pts.push([bx, by]);
  const traza = (ps: [number, number][]) => { ctx.beginPath(); ctx.moveTo(ps[0][0], ps[0][1]); for (let i = 1; i < ps.length; i++) ctx.lineTo(ps[i][0], ps[i][1]); ctx.stroke(); };
  const ramas: [number, number][][] = [];
  for (let r = 0; r < 2; r++) { const i = 1 + Math.floor(R() * (pts.length - 2)), [x0, y0] = pts[i], a = Math.atan2(dy, dx) + (R() - 0.5) * 1.6, l = 10 + R() * 16; ramas.push([[x0, y0], [x0 + Math.cos(a) * l * 0.5 + (R() - 0.5) * 6, y0 + Math.sin(a) * l * 0.5 + (R() - 0.5) * 6], [x0 + Math.cos(a) * l, y0 + Math.sin(a) * l]]); }
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const [w, c] of [[9, `rgba(70,120,255,${0.22 * k})`], [4, `rgba(150,190,255,${0.7 * k})`], [1.5, `rgba(255,255,255,${Math.min(1, k * 1.4)})`]] as [number, string][]) {
    ctx.lineWidth = w; ctx.strokeStyle = c; traza(pts);
    if (w < 9) { ctx.lineWidth = w * 0.6; for (const rm of ramas) traza(rm); }
  }
  // el destello donde nace y donde cae
  for (const [x, y, r] of [[ax, ay, 9], [bx, by, 13]] as [number, number, number][]) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,255,255,${0.9 * k})`); g.addColorStop(0.4, `rgba(150,190,255,${0.5 * k})`); g.addColorStop(1, 'rgba(70,120,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  ctx.restore();
}
function pajaro(x: number, y: number, t: number) {
  const a = Math.sin(t * 18) * 5;
  ctx.strokeStyle = '#0a0a0e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 7, y - a); ctx.lineTo(x, y); ctx.lineTo(x + 7, y - a); ctx.stroke();
}

/** Cuánto se mezcla cada sprite sobre sí mismo en modo 'screen' (0 = como viene horneado). Levanta sombras y medios sin quemar los claros. */
// (13 nov: la luz de los personajes ahora sale bien desde el motor; queda un realce suave fuera del pueblo, donde la oscuridad de la zona los apaga)
const REALCE = { heroe: 0.4, aliado: 0.22, monstruo: 0.22 };
/** Si un objeto grande (12 casillas o más) se puede pisar por dentro en al menos un tercio de su huella. */
function pisable(z: Juego['zona'], o: { cx: number; cy: number; hw: number; hh: number; _pis?: boolean }): boolean {
  if (o._pis !== undefined) return o._pis;
  let libres = 0, total = 0;
  if (o.hw * o.hh >= 12) for (let y = Math.floor(o.cy - (o.hh - 1) / 2); y <= o.cy + (o.hh - 1) / 2; y++) for (let x = Math.floor(o.cx - (o.hw - 1) / 2); x <= o.cx + (o.hw - 1) / 2; x++) { total++; if (x >= 0 && y >= 0 && x < z.W && y < z.H && !z.bloq[y * z.W + x]) libres++; }
  return (o._pis = total > 0 && libres / total > 0.33);
}
/**
 * Cuánto sube (px) el que va por el tablero de un puente: el arco del puente de la Forja (104 unidades de largo en unas
 * 6 casillas, 4 de alto en los estribos y 21 en la clave). Sin esto el héroe cruzaba a ras del agua, metido en la piedra.
 */
function sobrePuente(j: Juego, e: Ent): number {
  for (const p of j.zona.puentes ?? []) {
    if (Math.abs(e.y - p.cy) > 1.6 || Math.abs(e.x - p.cx) > 3.2) continue;
    const u = Math.min(1, Math.abs((e.x - p.cx) * 17.3) / 52);
    return (4 + 17 * Math.cos((u * Math.PI) / 2)) * 1.2;
  }
  return 0;
}
function dibujarEnt(j: Juego, e: Ent, tiempo: number) {
  // reventado por exceso de daño: no queda cuerpo (los gibs de la Forja irán en su lugar)
  if (e.muerto && (e as any).reventado) return;
  let [px, py] = aPant(e.x, e.y);
  py -= sobrePuente(j, e);
  py -= (e as any).alto ?? 0; // en el aire durante un salto (maniobra de monstruo)
  // peso en el combate, solo en pantalla, a la medida de cada cuerpo (ver juego/sensacion.ts)
  if (!e.muerto) {
    const S = sensacionDe(e), [vx, vy] = DIR_VEC[e.dir] ?? [0, 0];
    const u = e.dur > 0 ? Math.min(1, e.t / e.dur) : 0, g = e.dur > 0 ? Math.max(0.05, Math.min(0.9, e.golpeEn / e.dur)) : 0.5;
    const lejos = !!(e as any).aDist || (e.tipo === 'heroe' && j.heroe.c.distancia) || e.acc === 'lanzar';
    let k = 0;
    if ((e.acc === 'atacar' || e.acc === 'lanzar') && e.dur > 0) {
      // cuerpo a cuerpo: se recoge antes de pegar y se va encima con el golpe. A distancia o lanzando: recula al soltar
      if (!lejos) k = (u < g * 0.55 ? -0.4 * Math.sin((u / (g * 0.55)) * Math.PI) : u < g ? Math.sin(((u - g * 0.55) / (g * 0.45)) * Math.PI / 2) : Math.max(0, 1 - (u - g) / Math.max(0.05, (1 - g) * 0.7))) * S.embestida;
      else if (u >= g) k = -S.retroceso * Math.max(0, 1 - (u - g) / Math.max(0.05, (1 - g) * 0.6)) ** 2;
    }
    // (el corrimiento del sprite entero hacía patinar los pies: la animación del motor ya lleva el paso, el peso y la
    // recogida del golpe con los pies plantados. Solo queda el retroceso al disparar, que es corto y del cuerpo entero)
    if (k && lejos) { px += (vx - vy) * 0.71 * k; py += (vx + vy) * 0.71 * k * 0.5; }
    const sc = e.sacud;
    if (sc) { const ed = j.t - sc.t; if (ed >= 0 && ed < 0.2) { const q = (1 - ed / 0.2) ** 2 * ((e as Monstruo).calidad >= 3 ? 2 : 4.5) * (sc.k ?? 1); px += (sc.dx - sc.dy) * 0.71 * q; py += (sc.dx + sc.dy) * 0.71 * q * 0.5; } }
  } else if (e.sacud?.lanz) {
    // el que murió de un golpe sale despedido: ya está donde cayó, pero se lo ve llegar desde donde estaba
    const sc = e.sacud, ed = j.t - sc.t;
    if (ed >= 0 && ed < 0.3) { const q = (1 - ed / 0.3) ** 2 * sc.lanz!; px -= (sc.dx - sc.dy) * 16 * q; py -= (sc.dx + sc.dy) * 8 * q; }
  }
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
  else i = fr(acc, e.t, e.dur, e, acc === 'correr' && e.tipo !== 'heroe' && !cuadrosMonstruo(m.def.sprite, 'correr', e.dir).length ? 'caminar' : acc, fs.length);
  if (e.tipo === 'monstruo' && m.estado === 'surgir') return;
  const q = fs[Math.min(fs.length - 1, i)];
  const esc = e.escala;

  if (!e.muerto) sombras(ctx, e, q, px, py, esc);
  // los aliados llevan un aro en los pies (Thor dorado, invocados verdes): de noche un lobo enemigo se confundía con Thor
  if (!e.muerto && (e as any).dueno) {
    const thor = (e as any).invocaId === 'thor', c = thor ? '255,205,120' : '120,225,150', rr = 13 * Math.max(0.8, esc), kk = 0.5 + 0.2 * Math.sin(tiempo * 3 + e.x);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const ga = ctx.createRadialGradient(px, py, rr * 0.3, px, py, rr); ga.addColorStop(0, `rgba(${c},0)`); ga.addColorStop(0.75, `rgba(${c},${0.22 * kk})`); ga.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = ga; ctx.beginPath(); ctx.ellipse(px, py, rr, rr / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(${c},${0.55 * kk})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(px, py, rr * 0.82, rr * 0.41, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // la mitad de atrás del aura va antes del cuerpo
  if (e.tipo === 'heroe' && !e.muerto) auraHeroe(j, px, py, tiempo, true);
  let ok: boolean;
  // estados de pixelfx: el primero tiñe el cuerpo, todos van en bucle encima
  const ests = e.muerto ? [] : estadosPfx(e as any);
  // los buffs y el aura del héroe se ven mientras duran: el efecto de lanzador de su habilidad, si es de bucle
  if (e.tipo === 'heroe' && !e.muerto) {
    const hh = j.heroe;
    for (const id of [...Object.keys(hh.buffs), hh.d.aura ?? '']) { const lz = id && usosPfx.hab.get(id)?.lanzador; if (lz && efectoPfx(lz)?.bucle && !ests.includes(lz) && ests.length < 4) ests.push(lz); }
  }
  const tinteEst = ests.map((id) => efectoPfx(id)?.cuerpo?.tinte).find(Boolean);
  const pm = (e as any).pfxMuerte as { id: string; t0: number } | undefined;
  const alfaM = e.muerto && pm ? alfaCuerpo(pm.id, j.t - pm.t0) : 1;
  if (alfaM <= 0.01) return;
  if (alfaM < 1) ctx.globalAlpha = alfaM;
  if (!e.muerto) { const cg = (e as any).congelado > 0; if (cg && !congelados.has(e)) j.efectos.push({ id: 'pfx:fx_congelar', x: e.x, y: e.y, t: 0, dir: 0, escala: Math.max(0.6, Math.min(3, (q.ay * esc) / 75)), z: 0, dur: 3.8 } as Efecto); if (cg) congelados.add(e); else congelados.delete(e); }
  // Ozmaren sobre su lava: un borde rojo brillante en la silueta (detrás del cuerpo) para que se despegue del piso
  if (!e.muerto && e.tipo === 'monstruo' && m.def.sprite === 'jefe_ozmaren') { ctx.save(); ctx.globalAlpha = 0.5; for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) dibujarTenido(ctx, q, px + ox, py + oy, '#ff5a20', 1, esc); ctx.restore(); }
  const cambio = e.tipo === 'heroe' ? performance.now() / 1000 - cambioVisible : 9;
  // nunca una silueta en lugar del sprite: el brillo de equipo nuevo es un velo de 25 % que se apaga, y el destello del
  // golpe un blanco de 30 % como mucho en los primeros 70 ms (destello arranca en 0.12 s), para todos los monstruos
  if (cambio < 0.45) ok = dibujarTenido(ctx, q, px, py, '#fff2d0', 0.25 * (1 - cambio / 0.45), esc);
  else if (e.destello > 0.05) ok = dibujarTenido(ctx, q, px, py, '#ffffff', 0.3 * Math.min(1, (e.destello - 0.05) / 0.07), esc);
  // los estados tiñen sin tapar el sprite: como mucho 40 % (salvo petrificado, que es piedra)
  else if (tinteEst) ok = dibujarTenido(ctx, q, px, py, tinteEst.color, Math.min(tinteEst.fuerza >= 0.8 ? tinteEst.fuerza : 0.4, tinteEst.fuerza) * (e.frio > 0 && !(e.congelado > 0) ? 0.6 : 1), esc);
  else if (e.tinte) ok = dibujarTenido(ctx, q, px, py, e.tinte, e.tipo === 'invocado' ? 0.35 : e.tipo === 'heroe' ? 0.22 : 0.3, esc);
  else if (e.muerto && e.tMuerto > 60) { ctx.globalAlpha = Math.max(0.25, 1 - (e.tMuerto - 60) / 400); ok = dibujar(ctx, q, px, py, esc); ctx.globalAlpha = 1; }
  else ok = dibujar(ctx, q, px, py, esc);
  // realce del personaje: el sprite viene pintado en clave baja y encima cae la oscuridad de la zona, así que el cuerpo
  // quedaba como una mancha parda al lado de un piso bien iluminado. Se suma el sprite sobre sí mismo (en su lugar del
  // orden de dibujo: lo que lo tapa lo sigue tapando): sube la luz y el contraste, los cantos de metal saltan y lo oscuro
  // sigue oscuro. El héroe más que los demás: es el que se mira todo el tiempo
  if (ok && !e.muerto && alfaM >= 1 && !(window as any).__sinRealce) {
    const k = (window as any).__realce ?? (e.tipo === 'heroe' ? REALCE.heroe : (e as any).dueno || e.tipo === 'npc' ? REALCE.aliado : REALCE.monstruo);
    // (en el pueblo hay luz de sobra: nada)
    if (k > 0) { ctx.save(); ctx.globalCompositeOperation = (window as any).__realceModo ?? 'screen'; ctx.globalAlpha = k * (j.zona.tipo === 'pueblo' ? 0 : 1); dibujar(ctx, q, px, py, esc); ctx.restore(); }
  }
  if (alfaM < 1) ctx.globalAlpha = 1;
  if (ok && !e.muerto && !(window as any).__sinReflejos) reflejos(ctx, e, q, px, py, esc);
  if (ok && ests.length) { const k = Math.max(0.6, Math.min(3, (q.ay * esc) / 75)); for (const id of ests) dibujarPfx(ctx, id, tiempo + (e.id % 7) * 0.31, px, py, { escala: k }); }
  if (ok && !e.muerto && !(window as any).__sinFuego && e.tipo === 'monstruo' && m.def.sprite === 'jefe_ozmaren') {
    const furia = Math.min(1, (m.fase ?? 0) * 0.6 + (m.acc === 'lanzar' || (m.acc as string) === 'especial' ? 0.6 : 0));
    ozmarenArde(ctx, m, q, px, py, esc, dtCuadro, furia); calorOzmaren(ctx, q, px, py, esc, tiempo, furia);
  } else if (ok && !(window as any).__sinFuego && (e.tipo === 'monstruo' || e.tipo === 'heroe')) cuerpoArde(ctx, j, e, q, px, py, esc, dtCuadro);
  // únicos y jefes: aura
  if (!e.muerto && e.tipo === 'monstruo' && m.calidad >= 2) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18 + Math.sin(tiempo * 4) * 0.06;
    const g = ctx.createRadialGradient(px, py - 30 * esc, 4, px, py - 30 * esc, 46 * esc); g.addColorStop(0, m.calidad >= 3 ? '#ff4010' : '#c08020'); g.addColorStop(1, '#00000000');
    ctx.fillStyle = g; ctx.fillRect(px - 50 * esc, py - 80 * esc, 100 * esc, 100 * esc); ctx.restore();
  }
  // arma viva del héroe
  if (ok && e.tipo === 'heroe' && j.heroe.c.vivo && !e.muerto && !armaArde(ctx, q, px, py, j.heroe.c.vivo, dtCuadro)) armaViva(q, px, py, j.heroe.c.vivo, tiempo);
  // aura del héroe: la mitad de adelante, encima del cuerpo
  if (e.tipo === 'heroe' && !e.muerto) auraHeroe(j, px, py, tiempo, false);
  // zona de clic
  // los aliados (Thor, invocados, escoltas) no se eligen con el clic: el clic los atraviesa
  if (!e.muerto && e.tipo !== 'heroe' && !(e as any).dueno) picks.push({ tipo: e.tipo === 'npc' ? 'npc' : 'monstruo', ref: e, x0: px - q.ax * esc + q.w * esc * 0.2, y0: py - q.ay * esc, x1: px - q.ax * esc + q.w * esc * 0.8, y1: py + 6, prof: e.x + e.y });
  // frase del jefe
  if (e.tipo === 'monstruo' && m.habla && m !== j.jefe) { ctx.font = 'italic 13px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(m.habla, px + 1, py - 95 * esc + 1); ctx.fillStyle = '#ff9060'; ctx.fillText(m.habla, px, py - 95 * esc); ctx.textAlign = 'left'; }
}

const PILAR: Record<string, string> = { magico: 'magico', raro: 'raro', conjunto: 'conjunto', unico: 'unico', legendario: 'legendario' };
const GEMAS = ['rubi', 'zafiro', 'topacio', 'esmeralda', 'amatista', 'diamante'];
/** Aura del héroe partida por profundidad: los anillos del piso en dos mitades y lo que orbita según su lado. */
function auraHeroe(j: Juego, px: number, py: number, tiempo: number, atras: boolean) {
  // el cetro del final de la Corona Fría: el héroe arde con su llama fría (detrás del cuerpo)
  if (atras && Object.values(j.heroe.d.equipo).some((o: any) => o?.rareza === 'legendario' && o.nombre?.[0] === 'Cetro de la Corona Fría')) dibujarEfecto({ id: 'llama_corona_fria', x: j.heroe.x, y: j.heroe.y, t: tiempo, dir: 0, escala: 0.9, z: 0 } as Efecto, tiempo);
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
  // únicos y legendarios: la columna de luz de pixelfx
  if ((o.rareza === 'unico' || o.rareza === 'legendario') && dibujarPfx(ctx, 'fx_columna_botin', t, px, py, { alfa: Math.min(1, s.t * 2) })) { /* listo */ }
  else if (pv) { const m = objetoMeta('botin_pilar', pv); if (m && m.f.length) { ctx.globalAlpha = Math.min(1, s.t * 2) * 0.9; dibujar(ctx, m.f[Math.floor((t * 25) / m.t) % m.f.length], px, py); ctx.globalAlpha = 1; } }
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

/** Qué portal vivo va en esta zona: el del pueblo, el del infierno (acto 5) o el de las mazmorras y el campo. */
export const tipoPortal = (j: Juego) => (j.zona.tipo === 'pueblo' ? 'pueblo' : /^a5_/.test(j.zona.id) ? 'infierno' : 'mazmorra');
function dibujarPortal(j: Juego, t: number) {
  const p = j.portal!;
  if ((j as any).portalZona !== j.zona.id && j.zona.tipo !== 'pueblo') return;
  const [px, py] = j.zona.tipo === 'pueblo' ? aPant(j.zona.entradas.portal[0] + 0.5, j.zona.entradas.portal[1] - 1) : aPant(p.x, p.y);
  // el portal vivo de la Forja: arco gótico con vórtice ámbar en el pueblo, grieta verde mar en la mazmorra, arco roto en
  // el infierno; la luz del piso va aparte, sumada en modo screen debajo del portal
  // el mismo óvalo de remolino de las salidas: dorado si lleva al pueblo; en el pueblo, del color de la zona a la que vuelve
  umbralVivo(px, py, true, j.zona.tipo === 'pueblo' ? ZONAS[(j as any).portalZona] : { tipo: 'pueblo' }, t, 0.5 + 0.5 * Math.sin(t * 3), 4.2, dtCuadro);
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
  // clave baja: la antorcha del héroe ya no abre la oscuridad del todo (el misterio vuelve); en el pueblo casi no hay
  // oscuridad y en las mazmorras más negras se deja un poco más para que el héroe no se pierda. Su radio no cambia
  const kHeroe = z.tipo === 'pueblo' ? 0.75 : z.oscuridad >= 0.9 ? 0.6 : 0.52;
  for (const l of luces) {
    const cy = l.y - Math.min(40, l.h * 0.45);
    hueco(l.x, cy, l.r, l.blanca ? kHeroe : Math.min(0.85, 0.5 + l.k * 0.4));
    if (!l.blanca) tinte(l.x, l.y - Math.min(30, l.h * 0.3), l.r * 0.85, `rgb(${l.c[0]},${l.c[1]},${l.c[2]})`, Math.min(0.5, 0.18 + l.k * 0.28));
  }
  ctx.drawImage(luz, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(brillo, 0, 0);
  if (destello > 0.02) { ctx.globalAlpha = destello * 0.16; ctx.fillStyle = `rgb(${destelloColor[0]},${destelloColor[1]},${destelloColor[2]})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
  // niebla de guerra: lo no explorado se ve negro del todo (salvo las piezas ancla: la catedral no se recorta)
  const conAncla = anclasCuadro.length > 0;
  let nc: CanvasRenderingContext2D = ctx;
  if (conAncla) { if (nieblaCv.width !== W || nieblaCv.height !== H) { nieblaCv.width = W; nieblaCv.height = H; } nc = nieblaCv.getContext('2d')!; nc.clearRect(0, 0, W, H); }
  // La máscara se arma chiquita (1/20) con una mancha redonda por baldosa tapada y se agranda suavizada: el borde de lo
  // visto y el borde del mundo quedan como una penumbra de contorno irregular, no como rombos cortados a regla.
  // Lo que no tiene piso también entra en la máscara: así el filo del mapa se funde en la oscuridad.
  const NB = 20, nw = Math.ceil(W / NB) + 2, nh = Math.ceil(H / NB) + 2;
  if (nieblaBaja.width !== nw || nieblaBaja.height !== nh) { nieblaBaja.width = nw; nieblaBaja.height = nh; }
  const nb = nieblaBaja.getContext('2d')!; nb.clearRect(0, 0, nw, nh); nb.fillStyle = '#000';
  const [fx0] = aMundo(0, 0), [, fy0] = aMundo(W, 0), [fx1] = aMundo(W, H), [, fy1] = aMundo(0, H);
  let hay = false;
  for (let by = Math.floor(fy0 / 5) - 2; by <= Math.ceil(fy1 / 5) + 2; by++) for (let bx = Math.floor(fx0 / 5) - 2; bx <= Math.ceil(fx1 / 5) + 2; bx++) {
    const dentro = bx >= 0 && by >= 0 && bx < z.tw && by < z.th;
    if (dentro && z.explorado[by * z.tw + bx] && z.pisos[by * z.tw + bx]) continue;
    // una baldosa vacía que queda justo DETRÁS de piso ya visto no se tapa: en pantalla cae sobre los muros, los árboles y
    // la cabeza del que está parado en ese borde
    if (!(dentro && z.pisos[by * z.tw + bx])) {
      const visto = (x: number, y: number) => x >= 0 && y >= 0 && x < z.tw && y < z.th && !!z.pisos[y * z.tw + x] && !!z.explorado[y * z.tw + x];
      if (visto(bx + 1, by) || visto(bx, by + 1) || visto(bx + 1, by + 1)) continue;
    }
    const [px, py] = aPant(bx * 5 + 2.5, by * 5 + 2.5);
    if (px < -140 || px > W + 140 || py < -90 || py > H + 90) continue;
    // cada mancha con su tamaño (sale de la baldosa, no cambia con el tiempo): el contorno no repite
    const k = dentro && z.pisos[by * z.tw + bx] ? 0.92 + 0.3 * hashCelda(bx * 3 + 1, by * 7 + 2) : z.tipo === 'mazmorra' ? 0.74 + 0.2 * hashCelda(bx * 3 + 1, by * 7 + 2) : 0.95 + 0.6 * hashCelda(bx * 3 + 1, by * 7 + 2); // (en las mazmorras, menos: no debe comerse los muros)
    nb.beginPath(); nb.ellipse(px / NB + 1, py / NB + 1, (81 * k) / NB, (41 * k) / NB, 0, 0, Math.PI * 2); nb.fill(); hay = true;
  }
  if (hay) { nc.save(); nc.imageSmoothingEnabled = true; nc.imageSmoothingQuality = 'high'; nc.drawImage(nieblaBaja, -NB, -NB, nw * NB, nh * NB); nc.restore(); }
  if (conAncla) {
    nc.globalCompositeOperation = 'destination-out';
    for (const a of anclasCuadro) { if (a.br) nc.drawImage(a.br, Math.round(a.px - a.q.ax), Math.round(a.py - a.q.ay)); else dibujar(nc, a.q, a.px, a.py); }
    nc.globalCompositeOperation = 'source-over';
    ctx.drawImage(nieblaCv, 0, 0);
  }
}

// ---------------------------------------------------------------- la catedral: plano de llegada y bruma baja
let llegada: { t: number; x: number; y: number; hx: number; hy: number; zona: string } | null = null;
const llegadasVistas = new Set<string>();
function planoLlegada(j: Juego, dt: number) {
  const z = j.zona, h = j.heroe;
  if (!llegada) {
    for (const sa of z.salidas) if (sa.piezas?.length) {
      const fa = sa.piezas[sa.piezas.length - 1], clave = z.id + ':' + z.semilla;
      if (llegadasVistas.has(clave)) continue;
      const puerta = Math.hypot(h.x - (fa.cx + 0.5), h.y - (fa.cy + 1));
      if (z.id === 'a1_cementerio' || puerta < 20) { llegadasVistas.add(clave); llegada = { t: 0, x: fa.cx + 0.5 - 15, y: fa.cy + 1 - 15, hx: h.x, hy: h.y, zona: clave }; }
    }
  }
  if (!llegada) return;
  if (llegada.zona !== z.id + ':' + z.semilla) { llegada = null; foco.k = 0; return; }
  llegada.t += dt;
  // la posición de partida se toma al asentarse la zona (al entrar, el héroe se ubica en el primer cuadro)
  if (llegada.t < 0.3) { llegada.hx = h.x; llegada.hy = h.y; }
  const movio = Math.hypot(h.x - llegada.hx, h.y - llegada.hy) > 2;
  if (llegada.t < 3.5 && !movio) { foco.x = llegada.x; foco.y = llegada.y; foco.k = Math.min(1, foco.k + dt / 0.8); }
  else { foco.k = Math.max(0, foco.k - dt / 1); if (foco.k <= 0) llegada = null; }
}
/** Bruma baja que se arrastra al pie de la fachada y del costado de la nave y la cabecera (solo con niebla). */
function brumaAncla(j: Juego) {
  const z = j.zona; if (!z.niebla) return;
  ctx.save();
  const mancha = (x: number, y: number) => {
    const [px, py] = aPant(x, y); if (px < -150 || px > W + 150 || py < -100 || py > H + 100) return;
    ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.45);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 120); g.addColorStop(0, `rgba(112,116,122,${z.niebla! * 0.22})`); g.addColorStop(1, 'rgba(112,116,122,0)');
    ctx.fillStyle = g; ctx.fillRect(-120, -120, 240, 240); ctx.restore();
  };
  for (const sa of z.salidas) if (sa.piezas?.length) {
    const fa = sa.piezas[sa.piezas.length - 1];
    for (let i = -6; i <= 6; i += 2) mancha(fa.cx + 0.5 + i, fa.cy + 3.3);
    for (const p of sa.piezas.slice(0, -1)) for (let i = -4; i <= 4; i += 2) mancha(p.cx + 7.7, p.cy + 0.5 + i);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ el suelo no se repite
// Las baldosas de piso son 3 o 4 variantes por tema: solas, se nota la cuadrícula. Encima va (1) un matiz propio de cada
// zona, una textura de un pixel por celda con manchas grandes y medianas más claras, más oscuras, más cálidas o más frías,
// que se estira sobre todo el mapa y multiplica el piso, y (2) detalles sueltos por celda (piedritas, grietas, matas,
// astillas) que salen de la posición: ninguna parte del mapa se ve igual a otra.
let matizDe = '', matizCv: HTMLCanvasElement | null = null;
const PISO_VERDE = /pasto|selva|pantano|par_suelo|musgo/;
function matizSuelo(j: Juego, bx0: number, bx1: number, by0: number, by1: number) {
  const z = j.zona, clave = z.id + ':' + z.semilla;
  if (matizDe !== clave || !matizCv) {
    matizDe = clave; matizCv = document.createElement('canvas'); matizCv.width = z.W; matizCv.height = z.H;
    const g = matizCv.getContext('2d')!, im = g.createImageData(z.W, z.H), r = rng(z.semilla * 31 + 7);
    const campo = (esc: number) => { const gw = Math.ceil(z.W / esc) + 2, gh = Math.ceil(z.H / esc) + 2, gr = Float32Array.from({ length: gw * gh }, () => r()); return (x: number, y: number) => { const fx = x / esc, fy = y / esc, ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v); const a = gr[iy * gw + ix], b = gr[iy * gw + ix + 1], c = gr[(iy + 1) * gw + ix], d = gr[(iy + 1) * gw + ix + 1]; return a + (b - a) * su + (c - a + (a - b - c + d) * su) * sv; }; };
    const grande = campo(11), medio = campo(4.3), fino = campo(1.7), calor = campo(15);
    for (let y = 0; y < z.H; y++) for (let x = 0; x < z.W; x++) {
      const v = 0.5 * grande(x, y) + 0.32 * medio(x, y) + 0.18 * fino(x, y), luz = 0.74 + 0.4 * v, c = calor(x, y) - 0.5, o = (y * z.W + x) * 4;
      im.data[o] = Math.min(255, 255 * luz * (1 + c * 0.16)); im.data[o + 1] = Math.min(255, 255 * luz); im.data[o + 2] = Math.min(255, 255 * luz * (1 - c * 0.18)); im.data[o + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  }
  ctx.save();
  const [ox, oy] = aPant(0, 0);
  ctx.globalCompositeOperation = 'multiply'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([16, 8, -16, 8, ox, oy])));
  ctx.drawImage(matizCv, 0, 0);
  ctx.restore();
  // detalles sueltos: se pintan una vez por baldosa en un lienzo propio y después solo se copian
  for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) {
    if (!z.pisos[by * z.tw + bx]) continue;
    const [px, py] = aPant(bx * 5 + 2.5, by * 5 + 2.5); if (px < -100 || px > W + 100 || py < -60 || py > H + 60) continue;
    const c = detalleBaldosa(z, bx, by); if (c) ctx.drawImage(c, Math.round(px) - 88, Math.round(py) - 48);
  }
}
const detalles = new Map<number, HTMLCanvasElement | null>(); let detallesDe = '';
function detalleBaldosa(z: Juego['zona'], bx: number, by: number): HTMLCanvasElement | null {
  const clave = z.id + ':' + z.semilla; if (detallesDe !== clave) { detallesDe = clave; detalles.clear(); }
  const idx = by * z.tw + bx; if (detalles.has(idx)) return detalles.get(idx)!;
  const p = z.pisos[idx]!; let c: HTMLCanvasElement | null = null, g: CanvasRenderingContext2D | null = null;
  if (!/agua|lava|arcano|pentagrama|madera|baldosa/.test(p.id)) for (let cy = by * 5; cy < by * 5 + 5; cy++) for (let cx = bx * 5; cx < bx * 5 + 5; cx++) {
    const dens = 0.17, h = hashCelda(cx * 1.37 + 5, cy * 0.91 + 3); if (h > dens) continue;
    if (z.bloq[cy * z.W + cx] === 2 || (z.hueco && z.hueco[cy * z.W + cx])) continue;
    if (!g) { c = document.createElement('canvas'); c.width = 176; c.height = 96; g = c.getContext('2d')!; }
    const h2 = hashCelda(cx * 7.1, cy * 3.3), h3 = hashCelda(cx * 2.3 + 9, cy * 5.7);
    const lx = cx + 0.2 + h2 * 0.6 - (bx * 5 + 2.5), ly = cy + 0.2 + h3 * 0.6 - (by * 5 + 2.5);
    const X = Math.round(88 + (lx - ly) * 16), Y = Math.round(48 + (lx + ly) * 8), t = h / dens;
    if (t < 0.34) {
      // piedritas: dos o tres, con su luz arriba y su sombra abajo
      for (let i = 0; i < 2 + (h2 > 0.5 ? 1 : 0); i++) { const dx = Math.round((hashCelda(cx + i * 3.1, cy) - 0.5) * 12), dy = Math.round((hashCelda(cx, cy + i * 4.7) - 0.5) * 6), w = 2 + (i === 0 && h3 > 0.4 ? 1 : 0); g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(X + dx, Y + dy + 1, w, 1); g.fillStyle = 'rgba(210,200,180,0.34)'; g.fillRect(X + dx, Y + dy, w, 1); }
    } else if (t < 0.6) {
      // grieta: una línea quebrada fina
      g.strokeStyle = 'rgba(0,0,0,0.36)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X - 6, Y + 0.5); g.lineTo(X - 2, Y + (h2 > 0.5 ? 2.5 : -1.5)); g.lineTo(X + 3, Y + 0.5); g.lineTo(X + 7, Y + (h3 > 0.5 ? -1.5 : 2.5)); g.stroke();
    } else if (t < 0.85 && PISO_VERDE.test(p.id)) {
      // mata de pasto: tres hebras
      for (let i = -1; i <= 1; i++) { g.fillStyle = i ? 'rgba(96,112,62,0.5)' : 'rgba(150,160,96,0.55)'; g.fillRect(X + i * 2, Y - 3 - (i ? 0 : 1), 1, 3 + (i ? 0 : 1)); }
    } else {
      // mancha: un parche apenas más oscuro o más claro, de borde irregular
      g.fillStyle = h2 > 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(230,215,185,0.07)';
      g.beginPath(); g.ellipse(X, Y, 7 + h3 * 9, 3 + h3 * 4, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(X + 5, Y + 2, 4 + h2 * 5, 2 + h2 * 2, 0, 0, Math.PI * 2); g.fill();
    }
  }
  detalles.set(idx, c); return c;
}
// ------------------------------------------------------------------ la lluvia
// Lluvia de verdad, en dos capas. En el piso: charcos fijos del mapa que reflejan y se llenan de ondas, y cada gota que
// cae revienta en una coronita con salpicaduras. En el aire: dos cortinas de agua a distinta distancia que el viento
// inclina por ráfagas, una bruma baja y, cada tanto, un relámpago que blanquea todo con su trueno.
const salpicones: { x: number; y: number; t: number; d: number; g: number }[] = [];
const chorros: { x: number; y: number; v: number; l: number; c: number }[] = [];
let rafaga = 0, relampago = 0, proxRayo = 9 + Math.random() * 14;
const hashCelda = (x: number, y: number) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
function lluviaSuelo(j: Juego, dt: number, t: number, aP: (x: number, y: number) => [number, number], aM: (x: number, y: number) => [number, number]) {
  const z = j.zona;
  const piso = (wx: number, wy: number) => { const cx = Math.floor(wx), cy = Math.floor(wy); return cx >= 0 && cy >= 0 && cx < z.W && cy < z.H && !!z.pisos[Math.floor(cy / 5) * z.tw + Math.floor(cx / 5)] && z.bloq[cy * z.W + cx] !== 2 && !(z.hueco && z.hueco[cy * z.W + cx]); };
  // charcos: salen del mapa (siempre en el mismo sitio), solo sobre piso libre
  const [wx0] = aM(0, 0), [, wy0] = aM(W, 0), [wx1] = aM(W, H), [, wy1] = aM(0, H);
  ctx.save();
  for (let cy = Math.max(0, Math.floor(wy0)); cy <= Math.min(z.H - 1, Math.ceil(wy1)); cy++) for (let cx = Math.max(0, Math.floor(wx0)); cx <= Math.min(z.W - 1, Math.ceil(wx1)); cx++) {
    const h = hashCelda(cx, cy); if (h > 0.02 || z.bloq[cy * z.W + cx] || !piso(cx, cy)) continue;
    const [px, py] = aP(cx + 0.5, cy + 0.5); if (px < -40 || px > W + 40 || py < -20 || py > H + 20) continue;
    const r = 9 + h * 600, gr = ctx.createRadialGradient(px, py, 0, px, py, r);
    gr.addColorStop(0, 'rgba(24,34,52,0.62)'); gr.addColorStop(0.75, 'rgba(28,40,60,0.5)'); gr.addColorStop(1, 'rgba(28,40,60,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    // el reflejo del cielo y las ondas de las gotas que le caen
    ctx.strokeStyle = `rgba(150,175,215,${0.16 + 0.1 * Math.sin(t * 2 + h * 900)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(px - r * 0.2, py - r * 0.12, r * 0.45, r * 0.16, 0, Math.PI, Math.PI * 1.9); ctx.stroke();
    for (let k = 0; k < 2; k++) { const f = (t * (0.9 + k * 0.35) + h * 500 + k * 0.5) % 1, rr = r * (0.15 + f * 0.7); ctx.strokeStyle = `rgba(170,195,230,${0.4 * (1 - f)})`; ctx.beginPath(); ctx.ellipse(px + (k ? r * 0.25 : -r * 0.2), py + (k ? -r * 0.08 : r * 0.06), rr, rr * 0.5, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  // gotas que revientan en el piso
  const porSeg = (E.tactil ? 170 : 300) * (0.75 + 0.5 * rafaga);
  for (let n = porSeg * dt + Math.random(); n >= 1; n--) {
    const sx = Math.random() * W, sy = Math.random() * H, [wx, wy] = aM(sx, sy);
    if (piso(wx, wy)) salpicones.push({ x: wx, y: wy, t: 0, d: 0.22 + Math.random() * 0.14, g: Math.random() });
  }
  for (let i = salpicones.length - 1; i >= 0; i--) {
    const s = salpicones[i]; s.t += dt; if (s.t >= s.d) { salpicones.splice(i, 1); continue; }
    const [px, py] = aP(s.x, s.y), f = s.t / s.d, X = Math.round(px), Y = Math.round(py);
    if (f < 0.25) { ctx.fillStyle = 'rgba(225,235,255,0.85)'; ctx.fillRect(X - 1, Y - 1, 2, 2); }
    else {
      // la corona: un aro que se abre y dos o tres gotitas que saltan y vuelven a caer
      const k = (f - 0.25) / 0.75, r = 2 + k * (4 + s.g * 3);
      ctx.strokeStyle = `rgba(190,208,240,${0.6 * (1 - k)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(X, Y, r, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(225,235,255,${0.8 * (1 - k)})`; const alto = Math.sin(k * Math.PI) * (4 + s.g * 4);
      ctx.fillRect(Math.round(X - 2 - k * 4), Math.round(Y - alto), 1, 1); ctx.fillRect(Math.round(X + 2 + k * 4), Math.round(Y - alto * 0.8), 1, 1); if (s.g > 0.5) ctx.fillRect(X, Math.round(Y - alto * 1.3), 1, 2);
    }
  }
  ctx.restore();
}
function lluviaAire(dt: number, t: number) {
  // el viento sopla por ráfagas: inclina las gotas y las apura
  rafaga = Math.max(0, Math.min(1, 0.5 + 0.5 * Math.sin(t * 0.37) + 0.3 * Math.sin(t * 1.3 + 2)));
  const n = E.tactil ? 190 : 340, incl = 0.16 + 0.3 * rafaga;
  while (chorros.length < n) chorros.push({ x: Math.random() * (W + 300), y: Math.random() * H, v: 0.7 + Math.random() * 0.6, l: 10 + Math.random() * 14, c: Math.random() < 0.3 ? 1 : 0 });
  ctx.save(); ctx.lineCap = 'butt';
  for (const capa of [0, 1]) {
    ctx.strokeStyle = capa ? `rgba(205,218,245,${0.34 + 0.1 * rafaga})` : 'rgba(150,165,200,0.2)'; ctx.lineWidth = capa ? 1.5 : 1; ctx.beginPath();
    for (const g of chorros) {
      if (g.c !== capa) continue;
      const v = (capa ? 980 : 720) * g.v * (0.85 + 0.35 * rafaga);
      if (!capa || true) { g.y += v * dt; g.x -= v * incl * dt; }
      if (g.y > H + 20) { g.y = -20 - Math.random() * 40; g.x = Math.random() * (W + 300); }
      const l = g.l * (capa ? 1.7 : 1);
      ctx.moveTo(g.x, g.y); ctx.lineTo(g.x - l * incl, g.y + l);
    }
    ctx.stroke();
  }
  // bruma de agua que barre baja con cada ráfaga
  if (rafaga > 0.55) { const a = (rafaga - 0.55) * 0.16, x = W - ((t * 220) % (W + 500)); const gb = ctx.createLinearGradient(x, 0, x + 380, 0); gb.addColorStop(0, 'rgba(170,185,215,0)'); gb.addColorStop(0.5, `rgba(170,185,215,${a})`); gb.addColorStop(1, 'rgba(170,185,215,0)'); ctx.fillStyle = gb; ctx.fillRect(x, 0, 380, H); }
  // relámpago: dos fogonazos seguidos y el trueno un instante después
  proxRayo -= dt;
  if (proxRayo <= 0) { proxRayo = 14 + Math.random() * 22; relampago = 0.5; setTimeout(() => Sonido.efecto('trueno', { vol: 0.35 + Math.random() * 0.2 }), 350 + Math.random() * 900); }
  if (relampago > 0) {
    relampago -= dt; const k = relampago > 0.42 ? 1 : relampago > 0.34 ? 0.15 : relampago > 0.26 ? 0.8 : Math.max(0, relampago / 0.26) * 0.5;
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(190,205,255,${0.32 * k})`; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}
// clima: lluvia, nieve, ceniza y niebla
const gotas: { x: number; y: number; v: number }[] = [];
const bancos: { x: number; y: number; r: number; v: number }[] = [];
function clima(j: Juego, dt: number, t: number) {
  const z = j.zona;
  // el clima de pixelfx de la zona; lo que ya dibuja no se repite con las partículas de siempre
  const pf = dibujarClimaPfx(ctx, j, W, H, t);
  if (z.niebla && !pf.niebla) {
    if (!bancos.length) for (let i = 0; i < 14; i++) bancos.push({ x: R() * W, y: R() * H, r: 80 + R() * 140, v: 6 + R() * 10 });
    ctx.save();
    for (const b of bancos) {
      b.x += b.v * dt; if (b.x - b.r > W) b.x = -b.r;
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r); g.addColorStop(0, `rgba(150,150,160,${z.niebla * 0.22})`); g.addColorStop(1, 'rgba(150,150,160,0)');
      ctx.fillStyle = g; ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
    ctx.restore();
  }
  if (z.lluvia && z.tipo !== 'mazmorra') { if (!(window as any).__sinLluvia) lluviaAire(dt, t); return; }
  const tipo = z.lluvia ? 'lluvia' : z.nieve ? 'nieve' : z.ceniza ? 'ceniza' : null;
  if (!tipo || z.tipo === 'mazmorra' || (tipo === 'lluvia' && pf.lluvia) || (tipo === 'nieve' && pf.nieve)) return;
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
