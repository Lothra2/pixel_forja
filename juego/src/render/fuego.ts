// Fuego vivo de Ozmaren: llamas que nacen de cuernos, hombros, espalda y manos, suben con turbulencia, pasan de amarillo
// a naranja a rojo oscuro y mueren en humo. Luces que parpadean con ruido (las sombras de todos tiemblan con ellas),
// brasas que se escapan y un ondulado de calor encima de él.
import type { Cuadro } from '../motor/assets';
import type { Monstruo } from '../juego/mundo';
import { R } from '../nucleo/azar';

interface Llama { x: number; y: number; vx: number; vy: number; t: number; d: number; s: number; brasa: boolean; f: number }
const llamas: Llama[] = [];

/** Ruido suave: va hacia un valor al azar nuevo cada tanto y lo sigue sin saltos. */
class Ruido {
  v = 0.5; meta = 0.5; prox = 0;
  constructor(private paso = 0.09, private amplio = 1) {}
  leer(t: number) { if (t > this.prox) { this.meta = 0.5 + (R() - 0.5) * this.amplio; this.prox = t + this.paso * (0.5 + R()); } this.v += (this.meta - this.v) * 0.25; return this.v; }
}
const rIntensidad = [new Ruido(0.07), new Ruido(0.11), new Ruido(0.09)];
const rPosX = [new Ruido(0.15, 0.8), new Ruido(0.13, 0.8), new Ruido(0.17, 0.8)];
const rPosY = [new Ruido(0.12, 0.8), new Ruido(0.16, 0.8), new Ruido(0.14, 0.8)];

/** Puntos de donde sale el fuego, en fracciones del cuadro (x desde el ancla, y desde los pies hacia arriba). */
// medidos sobre el Ozmaren orgánico de la Forja (cuadro de 421 px de ancho, pies a 354 px)
const FOCOS: [number, number, number][] = [
  [-0.19, 0.79, 1.4], [0.19, 0.79, 1.4], // puntas de los cuernos
  [-0.16, 0.47, 1], [0.16, 0.47, 1], // hombros
  [0, 0.72, 1.4], // espalda, detrás de la cabeza
  [0, 0.39, 0.9], // núcleo de lava del pecho
  [-0.21, 0.16, 0.6], [0.21, 0.16, 0.6], // garras
];
/** Alto del cuadro de Ozmaren desde los pies (para ubicar sus luces sin tener el cuadro a mano). */
export const ALTO_OZMAREN = 354;
const rNucleo = new Ruido(0.2, 0.5);

export interface LuzFuego { x: number; y: number; h: number; r: number; k: number; nucleo?: boolean }
/** Luces de su fuego para este cuadro: cuernos y espalda con ruido (las sombras tiemblan) y el núcleo del pecho que late. */
export function lucesOzmaren(px: number, py: number, alto: number, t: number, furia: number): LuzFuego[] {
  const out: LuzFuego[] = [0, 1, 2].map((i) => {
    const fx = [-0.19, 0.19, 0][i], fy = [0.79, 0.79, 0.72][i];
    const n = rIntensidad[i].leer(t);
    return {
      x: px + fx * alto * 1.2 + (rPosX[i].leer(t) - 0.5) * 24,
      y: py + (rPosY[i].leer(t) - 0.5) * 12,
      h: alto * fy * (0.9 + n * 0.2),
      r: (200 + furia * 140) * (0.8 + n * 0.45),
      k: Math.min(1, (0.4 + furia * 0.3) * (0.6 + n * 0.8)),
    };
  });
  // el corazón de lava: late como un pulso (más rápido con furia) y alumbra hacia adelante
  const lat = Math.pow(0.5 + 0.5 * Math.sin(t * (2.2 + furia * 2.5) * Math.PI), 3);
  out.push({ x: px, y: py + 6, h: alto * 0.39, r: 170 + lat * 90 + furia * 60, k: Math.min(1, 0.35 + lat * 0.5 + (rNucleo.leer(t) - 0.5) * 0.15 + furia * 0.2), nucleo: true });
  return out;
}

// manchas de fuego pintadas una sola vez: 8 tonos de amarillo a rojo oscuro
const TONOS = 8;
const manchas: HTMLCanvasElement[] = [];
function mancha(i: number): HTMLCanvasElement {
  if (manchas[i]) return manchas[i];
  const u = i / (TONOS - 1), c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d')!;
  const col = u < 0.33 ? [255, 230 - u * 300, 120 - u * 330] : u < 0.66 ? [255, 150 - (u - 0.33) * 280, 30] : [200 - (u - 0.66) * 300, 40, 15];
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, `rgba(${col[0] | 0},${Math.max(0, col[1]) | 0},${Math.max(0, col[2]) | 0},0.6)`); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  return (manchas[i] = c);
}
const humo = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d')!; const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(26,18,16,0.8)'); g.addColorStop(1, 'rgba(26,18,16,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return c; })();
const buf = document.createElement('canvas');
let ultimo = 0;
// calidad que se adapta: si los cuadros vienen lentos, menos llamas y sin ondulado de calor
let promedio = 1 / 60, calidad = 1;
/** Emite y dibuja su fuego. `furia` 0 calma, 1 fase dos o especial. */
export function fuegoOzmaren(ctx: CanvasRenderingContext2D, m: Monstruo, q: Cuadro, px: number, py: number, esc: number, t: number, camX: number, camY: number) {
  const dt = Math.min(0.05, Math.max(0, t - ultimo)); ultimo = t;
  if (dt > 0) promedio += (dt - promedio) * 0.05;
  if (promedio > 1 / 40) calidad = Math.max(0.35, calidad - 0.01); else if (promedio < 1 / 55) calidad = Math.min(1, calidad + 0.005);
  const furia = Math.min(1, (m.fase ?? 0) * 0.6 + (m.acc === 'lanzar' || (m.acc as string) === 'especial' ? 0.6 : 0));
  const alto = q.ay * esc, ancho = q.w * esc;
  // nacer: más en furia
  const n = Math.round((7 + furia * 6) * (dt * 60) * calidad);
  for (let i = 0; i < n && llamas.length < 320 * calidad; i++) {
    const [fx, fy, peso] = FOCOS[Math.floor(R() * FOCOS.length)];
    if (R() > peso * 0.7) continue;
    const brasa = R() < 0.12;
    llamas.push({
      x: px + fx * ancho + (R() - 0.5) * 10 + camX, y: py - fy * alto + (R() - 0.5) * 8 + camY,
      vx: (R() - 0.5) * 20, vy: -(brasa ? 70 + R() * 70 : 30 + R() * 40 + furia * 30),
      t: 0, d: brasa ? 1.2 + R() * 1.2 : 0.5 + R() * 0.5, s: brasa ? 1.6 : 5 + R() * 6 + furia * 1.5, brasa, f: R() * 10,
    });
  }
  ctx.save();
  // humo primero (oscurece), después el fuego sumando luz
  for (const l of llamas) {
    if (l.brasa) continue;
    const u = l.t / l.d; if (u < 0.65) continue;
    const r = l.s * (1.4 + u);
    ctx.globalAlpha = (1 - u) * 0.7; ctx.drawImage(humo, l.x - camX - r, l.y - camY - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = llamas.length - 1; i >= 0; i--) {
    const l = llamas[i];
    l.t += dt; if (l.t > l.d) { llamas.splice(i, 1); continue; }
    // turbulencia: se mece de lado a lado y acelera hacia arriba
    l.vx += Math.sin(t * 9 + l.f + l.y * 0.05) * 140 * dt; l.vx *= 0.94;
    l.vy -= (l.brasa ? 10 : 50) * dt;
    l.x += l.vx * dt; l.y += l.vy * dt;
    const u = l.t / l.d, x = l.x - camX, y = l.y - camY;
    if (l.brasa) { ctx.globalAlpha = (1 - u) * (0.6 + 0.4 * Math.sin(t * 20 + l.f)); ctx.fillStyle = u < 0.5 ? '#ffd070' : '#ff5a20'; ctx.fillRect(x, y, 2, 2); continue; }
    if (u > 0.75) continue;
    // amarillo, naranja, rojo oscuro
    const r = l.s * (1 - u * 0.4) * 1.4;
    ctx.globalAlpha = 1 - u; ctx.drawImage(mancha(Math.min(TONOS - 1, Math.floor((u / 0.75) * TONOS))), x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
  // ondulado de calor encima de la cabeza: franjas del lienzo corridas de lado con una onda
  if (calidad > 0.7 && !(window as any).__sinCalor) calor(ctx, px, py - alto * 1.05, ancho * 0.9, alto * 0.6 + furia * 30, t, 1.2 + furia * 1.5);
}

function calor(ctx: CanvasRenderingContext2D, cx: number, top: number, w: number, h: number, t: number, amp: number) {
  const tr = ctx.getTransform(), k = tr.a || 1, cv = ctx.canvas;
  const x0 = Math.max(0, Math.round((cx - w / 2) * k + tr.e)), y0 = Math.max(0, Math.round(top * k + tr.f));
  const ww = Math.min(cv.width - x0, Math.round(w * k)), hh = Math.min(cv.height - y0, Math.round(h * k));
  if (ww <= 4 || hh <= 4) return;
  const banda = Math.max(2, Math.round(3 * k));
  // una sola copia al buffer y de ahí las franjas corridas
  if (buf.width < ww || buf.height < hh) { buf.width = Math.max(buf.width, ww); buf.height = Math.max(buf.height, hh); }
  const bx = buf.getContext('2d')!; bx.clearRect(0, 0, ww, hh); bx.drawImage(cv, x0, y0, ww, hh, 0, 0, ww, hh);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let y = 0; y < hh; y += banda) {
    const s = Math.sin(t * 7 + (y0 + y) * 0.09 / k) * amp * k * (y / hh);
    if (Math.abs(s) < 0.3) continue;
    ctx.drawImage(buf, 0, y, ww, banda, x0 + s, y0 + y, ww, banda);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ fuegos del mundo (fogatas, braseros, piras)
// Las mismas llamas que Ozmaren pero chicas: nacen en la boca del fuego, suben meciéndose y se apagan en humo.
interface Lengua { x: number; y: number; vx: number; vy: number; t: number; d: number; s: number; brasa: boolean; f: number }
const lenguas: Lengua[] = [];
let ultimoMundo = 0, cuadroMundo = -1;
/** Emite fuego en (x, y) de pantalla; `tam` ~ 1 para una fogata grande. Se llama por cada fuego visible en el cuadro. */
export function fuegoMundo(ctx: CanvasRenderingContext2D, x: number, y: number, tam: number, t: number, camX: number, camY: number) {
  if (t !== cuadroMundo) { cuadroMundo = t; avanzarMundo(Math.min(0.05, Math.max(0, t - ultimoMundo)), t); ultimoMundo = t; }
  const dt = 1 / 60;
  const n = Math.max(1, Math.round(3 * tam * calidad * dt * 60));
  for (let i = 0; i < n && lenguas.length < 500 * calidad; i++) {
    const brasa = R() < 0.1;
    lenguas.push({ x: x + (R() - 0.5) * 18 * tam + camX, y: y - 4 * tam + (R() - 0.5) * 4 + camY, vx: (R() - 0.5) * 10, vy: -(brasa ? 50 + R() * 50 : 22 + R() * 26) * Math.sqrt(tam), t: 0, d: brasa ? 1 + R() : 0.4 + R() * 0.35, s: brasa ? 1.4 : (3.5 + R() * 4) * tam, brasa, f: R() * 10 });
  }
}
function avanzarMundo(dt: number, t: number) {
  for (let i = lenguas.length - 1; i >= 0; i--) {
    const l = lenguas[i]; l.t += dt; if (l.t > l.d) { lenguas.splice(i, 1); continue; }
    l.vx += Math.sin(t * 8 + l.f + l.y * 0.07) * 90 * dt; l.vx *= 0.93; l.vy -= (l.brasa ? 8 : 35) * dt;
    l.x += l.vx * dt; l.y += l.vy * dt;
  }
}
/** Dibuja todas las llamas del mundo (después de los objetos, antes de la oscuridad). */
export function dibujarFuegosMundo(ctx: CanvasRenderingContext2D, t: number, camX: number, camY: number) {
  if (!lenguas.length) return;
  ctx.save();
  for (const l of lenguas) { if (l.brasa) continue; const u = l.t / l.d; if (u < 0.6) continue; const r = l.s * (1.3 + u); ctx.globalAlpha = (1 - u) * 0.5; ctx.drawImage(humo, l.x - camX - r, l.y - camY - r, r * 2, r * 2); }
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lenguas) {
    const u = l.t / l.d, x = l.x - camX, y = l.y - camY;
    if (l.brasa) { ctx.globalAlpha = (1 - u) * (0.6 + 0.4 * Math.sin(t * 20 + l.f)); ctx.fillStyle = u < 0.5 ? '#ffd070' : '#ff5a20'; ctx.fillRect(x, y, 2, 2); continue; }
    if (u > 0.8) continue;
    const r = l.s * (1 - u * 0.35) * 1.3;
    ctx.globalAlpha = 1 - u; ctx.drawImage(mancha(Math.min(TONOS - 1, Math.floor((u / 0.8) * TONOS))), x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}
