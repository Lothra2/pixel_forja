// Fuera del juego: intro, menú principal, elegir y crear héroe, opciones y pantalla de carga.
import { cuadrosDeFirma } from '../motor/pintor';
import { ctx, W, H, E } from '../nucleo/lienzo';
import { texto, T, TT, IDI, boton, marco, dentro, envolver, TITULO, fijarIdioma } from './comun';
import { cuadrosHeroe, cuadrosPiso, cuadrosRetrato, objetoMeta, dibujar, dibujarTenido, cuadrosMonstruo } from '../motor/assets';
import { generarPaisaje, type MapaGotico } from '../../../src/engine/gotico/index';
import { CLASES } from '../datos/clases';
import { INTRO, ENTREACTO, REVELACION, OPCIONES_BRASA, TRAS_ELEGIR, EPILOGO, type FinalElegido } from '../mundo/actos';
import type { DatosHeroe } from '../juego/heroe';
import { R, rng } from '../nucleo/azar';
import { Sonido } from '../audio/sonido';
import { logoReq } from './logo';

export interface Opciones { general: number; musica: number; efectos: number; idioma: 0 | 1; brillo: number }
export const opciones: Opciones = { general: 0.8, musica: 0.6, efectos: 0.8, idioma: 0, brillo: 1 };
export function cargarOpciones() { try { Object.assign(opciones, JSON.parse(localStorage.getItem('marca.opciones') ?? '{}')); } catch { /* nada */ } fijarIdioma(opciones.idioma); aplicarVolumen(); }
export function guardarOpciones() { try { localStorage.setItem('marca.opciones', JSON.stringify(opciones)); } catch { /* nada */ } }
export const aplicarVolumen = () => Sonido.volumen(opciones.general, opciones.musica, opciones.efectos);

// ------------------------------------------------------------------ escenas pintadas con los assets (para intro y menú)
interface Escena { mapa: MapaGotico; seed: number }
const escenas = new Map<string, Escena>();
function escena(id: string, seed = 3): Escena { const k = id + seed; let e = escenas.get(k); if (!e) { e = { mapa: generarPaisaje(id, seed), seed }; escenas.set(k, e); } return e; }
function pintarMapa(m: MapaGotico, camX: number, camY: number, t: number, extra?: (aP: (x: number, y: number) => [number, number]) => { prof: number; draw: () => void }[], zoom = 1) {
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
  const aP = (x: number, y: number): [number, number] => [(x - y) * 16 - camX + W / 2, (x + y) * 8 - camY + H / 2];
  const f25 = Math.floor(t * 25);
  for (let by = 0; by < m.alto; by++) for (let bx = 0; bx < m.ancho; bx++) {
    const p = m.pisos[by * m.ancho + bx]; if (!p) continue;
    const fs = cuadrosPiso(p.id, p.v); if (!fs.length) continue;
    const [px, py] = aP(bx * 5 + 2.5, by * 5 + 2.5); dibujar(ctx, fs[Math.floor(f25 / 4) % fs.length], px, py);
  }
  const items: { prof: number; draw: () => void }[] = [];
  for (const o of m.objetos) {
    const meta = objetoMeta(o.id, o.v); if (!meta || !meta.f.length) continue;
    const [px, py] = aP(o.cx + 0.5, o.cy + 0.5);
    items.push({ prof: o.cx + o.cy, draw: () => dibujar(ctx, meta.f[Math.floor(f25 / meta.t) % meta.f.length], px, py) });
  }
  if (extra) items.push(...extra(aP));
  items.sort((a, b) => a.prof - b.prof);
  for (const i of items) i.draw();
  ctx.restore();
  return aP;
}
function oscuridad(k: number, luces: [number, number, number][] = []) {
  ctx.save();
  const c = document.createElement('canvas'); void c;
  ctx.fillStyle = `rgba(0,0,0,${k})`; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, r] of luces) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,120,40,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  ctx.restore();
}
function vineta() { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.9)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
const gotas = Array.from({ length: 140 }, () => ({ x: R(), y: R(), v: 0.6 + R() * 0.6 }));
function lluvia(t: number, k = 1) {
  ctx.strokeStyle = `rgba(150,160,190,${0.3 * k})`; ctx.beginPath();
  for (const g of gotas) { const y = ((g.y + t * g.v * 1.2) % 1) * H, x = ((g.x - t * 0.12 * g.v) % 1 + 1) % 1 * W; ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 14); }
  ctx.stroke();
}
function brasas(t: number, n = 40, sube = true) {
  const r = rng(7);
  for (let i = 0; i < n; i++) { const x = r() * W, v = 20 + r() * 50, y = ((r() * H - (sube ? t * v : -t * v)) % H + H) % H; ctx.fillStyle = r() < 0.5 ? '#ff8030' : '#ffd060'; ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 3 + i)); ctx.fillRect(x + Math.sin(t + i) * 10, y, 2, 2); }
  ctx.globalAlpha = 1;
}
/** El título que se enciende. k de 0 a 1; `forja` 0..1 para que las brasas formen las letras (intro). */
export function logo(x: number, y: number, k: number, t: number, tam = 54, forja?: number) { logoReq(x, y, k, t, tam * 1.15, forja); }

// ------------------------------------------------------------------ intro
// Cinemática por tomas: cada una con su cámara (paneo, zoom lento, sacudida), luz que titila y ceniza.
const SPRITE_OZMAREN = 'jefe_ozmaren';
const TOMAS: { dur: number; dibujar: (t: number, k: number) => void; lineas: number[] }[] = [];
let tomasListas = false;
const suave = (u: number) => u * u * (3 - 2 * u);
const titila = (t: number, s = 0) => 0.9 + Math.sin(t * 11 + s) * 0.04 + Math.sin(t * 23 + s * 2) * 0.03 + (R() - 0.5) * 0.03;
let sacudir = 0;
const ceniza = Array.from({ length: 120 }, () => ({ x: R(), y: R(), v: 0.3 + R() * 0.7, s: R() }));
function lluviaCeniza(t: number, k = 1, brasa = 0.25) {
  for (const c of ceniza) {
    const y = ((c.y + t * c.v * 0.06) % 1) * H, x = (((c.x + Math.sin(t * 0.7 + c.s * 9) * 0.01 - t * 0.012 * c.v) % 1) + 1) % 1 * W;
    const viva = c.s < brasa;
    ctx.globalAlpha = k * (viva ? 0.5 + 0.5 * Math.sin(t * 4 + c.s * 30) : 0.55);
    ctx.fillStyle = viva ? '#ff9040' : '#8a8478';
    ctx.fillRect(x, y, viva ? 2 : 2 + c.v, viva ? 2 : 1.5);
  }
  ctx.globalAlpha = 1;
}
function camara(f: () => void, zoom: number, cx = W / 2, cy = H / 2) {
  ctx.save();
  if (sacudir > 0) ctx.translate((R() - 0.5) * sacudir * 14, (R() - 0.5) * sacudir * 10);
  ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy);
  f(); ctx.restore();
}
function destello(k: number, c = '255,240,210') { if (k <= 0) return; ctx.fillStyle = `rgba(${c},${Math.min(1, k)})`; ctx.fillRect(0, 0, W, H); }
function cielo(t: number, rojo: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgb(${8 + rojo * 70},${6 + rojo * 12},${14})`); g.addColorStop(1, '#020203');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const r = rng(3); for (let i = 0; i < 180; i++) { ctx.fillStyle = `rgba(255,255,255,${(0.15 + r() * 0.6) * (1 - rojo * 0.6) * (0.7 + 0.3 * Math.sin(t * 2 + i))})`; ctx.fillRect(r() * W, r() * H * 0.75, 1, 1); }
  // nubes bajas que toman el color de la brasa
  const rn = rng(9);
  for (let i = 0; i < 9; i++) { const x = ((rn() * W * 1.4 + t * (8 + i * 2)) % (W * 1.4)) - W * 0.2, y = H * (0.12 + rn() * 0.35), rr = 120 + rn() * 160; const g2 = ctx.createRadialGradient(x, y, 0, x, y, rr); g2.addColorStop(0, `rgba(${30 + rojo * 160},${20 + rojo * 40},${30},${0.35})`); g2.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g2; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
}
function abadiaSilueta(x: number, y: number, k: number, ventanas: number, t: number) {
  ctx.fillStyle = '#030203';
  ctx.fillRect(x - 90 * k, y - 60 * k, 180 * k, 60 * k);
  for (const [dx, w, h] of [[-80, 26, 120], [54, 26, 140], [-14, 30, 90]] as [number, number, number][]) {
    ctx.fillRect(x + dx * k, y - h * k, w * k, h * k);
    ctx.beginPath(); ctx.moveTo(x + (dx - 4) * k, y - h * k); ctx.lineTo(x + (dx + w / 2) * k, y - (h + 50) * k); ctx.lineTo(x + (dx + w + 4) * k, y - h * k); ctx.fill();
  }
  ctx.fillStyle = `rgba(255,170,70,${ventanas * titila(t)})`;
  for (const [dx, dy] of [[-72, 80], [-72, 50], [62, 100], [62, 70], [-6, 60], [-40, 30], [30, 30]]) ctx.fillRect(x + dx * k, y - dy * k, 4 * k, 9 * k);
}
function suelo(rojo: number) {
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, H * 0.8 - Math.sin(x * 0.01) * 26 - Math.sin(x * 0.031) * 10); ctx.lineTo(W, H); ctx.fill();
  if (rojo > 0) { const g = ctx.createLinearGradient(0, H * 0.7, 0, H); g.addColorStop(0, `rgba(255,90,20,${rojo * 0.25})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, H * 0.7, W, H * 0.3); }
}
interface Chispa { x: number; y: number; vx: number; vy: number; t: number; d: number; c: string }
const chispasIntro: Chispa[] = [];
function chispasPaso(dt: number) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = chispasIntro.length - 1; i >= 0; i--) { const c = chispasIntro[i]; c.t += dt; if (c.t > c.d) { chispasIntro.splice(i, 1); continue; } c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 90 * dt; ctx.globalAlpha = 1 - c.t / c.d; ctx.fillStyle = c.c; ctx.fillRect(c.x, c.y, 2, 2); }
  ctx.restore();
}
let ultT = 0;
function armarTomas() {
  if (tomasListas) return; tomasListas = true;
  const T0 = (dur: number, lineas: number[], f: (t: number, k: number) => void) => TOMAS.push({ dur, dibujar: f, lineas });
  // 1: el valle al anochecer, la cámara baja despacio
  T0(8, [0], (t, k) => { const m = escena('bosque', 5).mapa; camara(() => pintarMapa(m, 10 + t * 16, 290 + t * 5, t, undefined, 1.6 + suave(k) * 0.35), 1); oscuridad(0.25 + k * 0.1); lluvia(t, 0.5); });
  // 2: la abadía y los monjes, velas que titilan
  T0(9, [1], (t, k) => {
    const m = escena('catedral', 2).mapa;
    camara(() => pintarMapa(m, -60 + t * 12, 330 - t * 6, t, (aP) => [0, 1, 2].map((i) => { const [x, y] = aP(9 + i * 3, 12); return { prof: 21 + i * 3, draw: () => dibujar(ctx, cuadrosMonstruo('cultista', 'quieto', 's')[Math.floor(t * 5 + i) % 4], x, y) }; }), 1.7 + k * 0.2), 1);
    oscuridad(0.58, [[W * 0.3, H * 0.5, 170 * titila(t)], [W * 0.7, H * 0.45, 160 * titila(t, 2)]]);
  });
  // 3: el voto, empuje lento hacia la vela
  T0(7, [2], (t, k) => { const m = escena('catedral', 7).mapa; camara(() => pintarMapa(m, 60 - t * 6, 340, t, undefined, 1.8 + suave(k) * 0.5), 1); oscuridad(0.76, [[W / 2, H / 2, 200 * titila(t)]]); });
  // 4: el cielo se abre y la brasa cae como un meteoro sobre la abadía
  T0(13, [3, 4], (t) => {
    const dt = Math.max(0, t - ultT); ultT = t;
    const rojo = Math.min(1, Math.max(0, (t - 2) / 3));
    const impacto = 9.6, u = Math.min(1, Math.max(0, (t - 3.6) / (impacto - 3.6)));
    const ax = W * 0.46, ay = H * 0.66;
    const zoom = 1 + suave(Math.min(1, t / impacto)) * 0.22;
    if (t >= impacto && t - dt < impacto) { sacudir = 1.6; Sonido.efecto('explosion', { vol: 1 }); Sonido.efecto('trueno', { vol: 1 }); for (let i = 0; i < 120; i++) { const a = -Math.PI * R(); chispasIntro.push({ x: ax, y: ay - 40, vx: Math.cos(a) * (80 + R() * 260), vy: Math.sin(a) * (120 + R() * 240), t: 0, d: 1 + R() * 2, c: R() < 0.5 ? '#ffb040' : '#ff5010' }); } }
    sacudir = Math.max(0, sacudir - dt * 0.8);
    camara(() => {
      cielo(t, rojo);
      // la grieta en el cielo
      if (t > 2) { const kk = Math.min(1, (t - 2) / 1.5); ctx.strokeStyle = `rgba(255,140,50,${0.7 * kk})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W * 0.8, 0); for (let i = 1; i < 7; i++) ctx.lineTo(W * 0.8 + Math.sin(i * 7) * 22, H * 0.035 * i * kk); ctx.stroke(); }
      // la brasa: cae acelerando con su estela
      if (t > 3.6 && t < impacto) {
        const e = u * u, x = W * 0.8 + (ax - W * 0.8) * e, y = H * 0.02 + (ay - 40 - H * 0.02) * e;
        const dx = ax - W * 0.8, dy = ay - 40 - H * 0.02, L = Math.hypot(dx, dy);
        for (let i = 0; i < 40; i++) { const v = i / 40, l = (40 + 260 * u) * v; ctx.fillStyle = `rgba(255,${120 + v * 100},${40 + v * 40},${(1 - v) * 0.55})`; ctx.beginPath(); ctx.arc(x - (dx / L) * l + Math.sin(t * 30 + i) * 2 * v, y - (dy / L) * l, 9 * (1 - v) + 1, 0, Math.PI * 2); ctx.fill(); }
        const g = ctx.createRadialGradient(x, y, 0, x, y, 90 + u * 60); g.addColorStop(0, 'rgba(255,240,190,1)'); g.addColorStop(0.15, 'rgba(255,150,50,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - 150, y - 150, 300, 300);
        if (R() < 0.8) chispasIntro.push({ x, y, vx: (R() - 0.5) * 60, vy: -R() * 40, t: 0, d: 0.6 + R() * 0.6, c: '#ffa040' });
      }
      abadiaSilueta(ax, ay, 1.1, t < impacto ? 0.7 : 0, t);
      if (t >= impacto) {
        const q = t - impacto;
        // onda expansiva y la abadía ardiendo
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,170,80,${Math.max(0, 0.8 - q * 0.5)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(ax, ay, 60 + q * 420, 18 + q * 120, 0, 0, Math.PI * 2); ctx.stroke();
        const g = ctx.createRadialGradient(ax, ay - 50, 0, ax, ay - 50, 260 * titila(t)); g.addColorStop(0, 'rgba(255,170,60,0.75)'); g.addColorStop(0.4, 'rgba(255,70,20,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(ax - 300, ay - 320, 600, 500);
        ctx.restore();
      }
      suelo(t >= impacto ? 1 : rojo * 0.4);
      chispasPaso(dt);
    }, zoom, ax, ay - 60);
    if (t >= impacto) destello(1 - (t - impacto) / 0.7);
  });
  // 5: el claustro y la brasa en el piso; campanas que doblan solas
  T0(8, [5], (t, k) => {
    const m = escena('catedral', 11).mapa; sacudir = t < 0.8 ? 0.6 : Math.max(0, sacudir - 0.01);
    camara(() => pintarMapa(m, 0, 300 + t * 3, t, undefined, 2.1 - suave(k) * 0.25), 1);
    oscuridad(0.72, [[W / 2, H * 0.55, 230 * titila(t)]]);
    const g = ctx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, 46 * titila(t, 3)); g.addColorStop(0, 'rgba(255,230,140,1)'); g.addColorStop(0.3, 'rgba(255,100,20,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(W / 2 - 50, H * 0.55 - 50, 100, 100);
    if (Math.floor(t * 0.6) !== Math.floor((t - 1 / 60) * 0.6)) Sonido.efecto('campana', { vol: 0.8 });
    lluviaCeniza(t, Math.min(1, t / 3), 0.3);
  });
  // 6: los muertos se levantan bajo la ceniza
  T0(8, [6], (t, k) => {
    const m = escena('cementerio', 4).mapa;
    camara(() => pintarMapa(m, 20 + t * 7, 320, t, (aP) => [[8, 10], [13, 9], [16, 14], [10, 15]].map(([x, y], i) => { const [px, py] = aP(x, y); const fs = cuadrosMonstruo('zombi', t > 2 + i ? 'caminar' : 'morir', 's'); const f = t > 2 + i ? Math.floor(t * 8) % 8 : Math.max(0, 7 - Math.floor((t - i * 0.5) * 4)); return { prof: x + y, draw: () => dibujar(ctx, fs[Math.max(0, Math.min(fs.length - 1, f))], px, py) }; }), 1.8 + k * 0.15), 1);
    oscuridad(0.62); lluviaCeniza(t, 1, 0.15);
  });
  // 7: los sobrevivientes alrededor del fuego
  T0(7, [7], (t, k) => { const m = escena('campamento', 6).mapa; camara(() => pintarMapa(m, 70 - t * 9, 380, t, undefined, 1.75 + k * 0.15), 1); oscuridad(0.5, [[W / 2, H / 2, 260 * titila(t)]]); lluviaCeniza(t, 0.8, 0.4); });
  // 8: tú. Las ocho clases en silueta, la luz del fuego las va encendiendo
  T0(9, [8], (t, k) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const paso = Math.min(130, W / 9), pan = (0.5 - suave(k)) * paso * 0.8;
    const esc = Math.min(0.9, H / 520);
    CLASES.forEach((c, i) => {
      const ret = cuadrosRetrato(c.id, 2); const q = ret.length ? ret[Math.floor(t * 11 + i) % ret.length] : cuadrosHeroe(c.id, 'quieto', 's')[0];
      const x = W / 2 + (i - 3.5) * paso + pan, y = H * 0.74 + (i % 2) * 14;
      const a = Math.min(1, Math.max(0, (t - i * 0.3) / 1.2));
      const luz = Math.min(1, Math.max(0, (t - 3 - i * 0.25) / 2));
      ctx.globalAlpha = a; dibujarTenido(ctx, q, x, y, '#000', 1 - luz * 0.75, ret.length ? esc : esc * 2); ctx.globalAlpha = 1;
    });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(W / 2, H * 0.85, 0, W / 2, H * 0.85, 360 * titila(t)); g.addColorStop(0, 'rgba(255,100,30,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    brasas(t, 50); lluviaCeniza(t, 0.6, 0.5);
  });
  // 9: en el fondo del pozo algo abre los ojos. Relámpagos que dejan ver la silueta de Ozmaren
  T0(10, [9], (t) => {
    const dt = Math.max(0, t - ultT); ultT = t;
    const flashes = [2.2, 3.1, 6];
    let luz = 0; for (const f of flashes) if (t > f) luz = Math.max(luz, Math.max(0, 1 - (t - f) / (f === 6 ? 1.2 : 0.25)));
    if (flashes.some((f) => t >= f && t - dt < f)) { Sonido.efecto(t > 5 ? 'rugido_jefe' : 'trueno', { vol: 1 }); sacudir = t > 5 ? 1.4 : 0.4; }
    sacudir = Math.max(0, sacudir - dt);
    camara(() => {
      ctx.fillStyle = '#030102'; ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W / 2, H * 0.95, 0, W / 2, H * 0.95, H * 0.8); g.addColorStop(0, `rgba(120,20,5,${0.5 + Math.sin(t * 2) * 0.1})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const fs = cuadrosMonstruo(SPRITE_OZMAREN, 'quieto', 's'); const q = fs[Math.floor(t * 4) % Math.max(1, fs.length)];
      const esc = Math.min(2.6, (H * 0.8) / Math.max(1, q?.h ?? 200)), x = W / 2, y = H * 0.92;
      if (q) {
        dibujarTenido(ctx, q, x, y, '#000', 1 - luz * 0.5, esc);
        if (luz > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = luz * 0.5; dibujarTenido(ctx, q, x, y, '#ff5020', 1, esc); ctx.restore(); }
        // los ojos, siempre encendidos desde que despierta
        if (t > 4.4) { const o = Math.min(1, (t - 4.4) / 0.6), ey = y - q.ay * esc * 0.53; ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const dx of [-11, 11]) { const gg = ctx.createRadialGradient(x + dx * esc, ey, 0, x + dx * esc, ey, 18); gg.addColorStop(0, `rgba(255,220,120,${o})`); gg.addColorStop(0.3, `rgba(255,90,20,${o * 0.8})`); gg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gg; ctx.fillRect(x + dx * esc - 18, ey - 18, 36, 36); } ctx.restore(); }
      }
      lluviaCeniza(t, 0.7, 0.6);
    }, 1 + suave(Math.min(1, t / 10)) * 0.15, W / 2, H * 0.4);
    destello(luz * 0.8, '255,200,170');
  });
  // título
  // el título se forja desde la ceniza: las brasas suben y se juntan en las letras, con un golpe cuando cierran
  T0(9, [], (t) => { sacudir = Math.max(0, sacudir - 0.02); if (t >= 3.6 && t - 1 / 60 < 3.6) { Sonido.efecto('trueno', { vol: 0.6 }); sacudir = 0.5; } ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); camara(() => { brasas(t, 50); lluviaCeniza(t, 0.6, 0.3); logo(W / 2, H / 2, 1, t, Math.min(64, W / 14), Math.min(1, t / 4.2)); }, 1); });
}
export function introDuracion() { armarTomas(); return TOMAS.reduce((s, x) => s + x.dur, 0); }
/** Escribe la línea letra por letra. */
function maquina(s: string, tl: number) { return s.slice(0, Math.max(0, Math.floor(tl * 30))); }
/** Devuelve true cuando terminó. */
export function dibujarIntro(t: number): boolean {
  armarTomas();
  let acc = 0, i = 0;
  while (i < TOMAS.length && t > acc + TOMAS[i].dur) { acc += TOMAS[i].dur; i++; }
  if (i >= TOMAS.length) return true;
  const tl = t - acc, tm = TOMAS[i];
  if (tl < ultT) ultT = 0;
  tm.dibujar(tl, tl / tm.dur);
  vineta();
  // franjas de cine
  const fr = Math.round(H * 0.07); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, fr); ctx.fillRect(0, H - fr, W, fr);
  // fundidos
  const f = Math.min(1, tl / 1.2, (tm.dur - tl) / 1.2);
  ctx.fillStyle = `rgba(0,0,0,${1 - Math.max(0, f)})`; ctx.fillRect(0, 0, W, H);
  // la voz: a máquina, una o dos líneas por toma
  const ls = tm.lineas;
  if (ls.length) {
    const parte = ls.length > 1 ? (tl < tm.dur / 2 ? 0 : 1) : 0;
    const d0 = ls.length > 1 ? (parte ? tm.dur / 2 : 0) : 0, d1 = ls.length > 1 ? (parte ? tm.dur : tm.dur / 2) : tm.dur;
    const k = Math.min(1, Math.max(0, (d1 - tl - 0.3) / 0.8));
    const linea = INTRO[ls[parte]];
    if (linea) {
      ctx.globalAlpha = k;
      envolver(maquina(TT(linea), tl - d0 - 0.7), Math.min(760, W - 80), 20).forEach((l, n) => texto(l, W / 2, H - fr - 52 + n * 26, { alin: 'center', tam: 20, color: '#e8dcc0', fuente: TITULO }));
      ctx.globalAlpha = 1;
    }
  }
  texto(T('Clic o Esc para saltar', 'Click or Esc to skip'), W - 16, H - 14, { alin: 'right', tam: 11, color: '#5a5040' });
  return false;
}

// ------------------------------------------------------------------ menú principal
export function dibujarFondoMenu(t: number) {
  const m = escena('campamento', 9).mapa;
  pintarMapa(m, Math.sin(t * 0.05) * 60, 420 + Math.cos(t * 0.04) * 30, t);
  oscuridad(0.62, [[W / 2, H * 0.55, 300]]);
  lluvia(t, 0.6);
  brasas(t, 30);
  vineta();
}
export function menuPrincipal(t: number, hayPartidas: boolean): string | null {
  dibujarFondoMenu(t);
  logo(W / 2, H * 0.3, 1, t, Math.min(64, W / 14));
  let y = H * 0.44; let r: string | null = null;
  const b = (s: string, id: string, activo = true) => { if (boton(s, W / 2 - 130, y, 260, 38, { activo, tam: 16 })) r = id; y += 50; };
  b(T('Jugar', 'Play'), 'jugar');
  b(T('Ver la intro', 'Watch intro'), 'intro');
  b(T('Opciones', 'Options'), 'opciones');
  b(IDI ? 'Español' : 'English', 'idioma');
  void hayPartidas;
  texto(T('Un juego hecho en casa para la familia Gutierrez', 'A homemade game for the Gutierrez family'), W / 2, H - 20, { alin: 'center', tam: 11, color: '#6a5a40' });
  return r;
}

// ------------------------------------------------------------------ elegir héroe
export function dibujarSeleccion(t: number, heroes: DatosHeroe[], sel: number): { accion: 'jugar' | 'crear' | 'borrar' | 'volver' | 'dificultad' | null; sel: number } {
  dibujarFondoMenu(t);
  let accion: 'jugar' | 'crear' | 'borrar' | 'volver' | 'dificultad' | null = null;
  const x = Math.max(20, W / 2 - 420), y = 40, w = 360, h = H - 120;
  marco(x, y, w, h, 0.9);
  texto(T('Tus héroes', 'Your heroes'), x + w / 2, y + 30, { alin: 'center', tam: 18, color: '#e0c890', fuente: TITULO });
  heroes.forEach((hr, i) => {
    const yy = y + 50 + i * 64; if (yy > y + h - 70) return;
    const enc = dentro(x + 12, yy, w - 24, 58);
    ctx.fillStyle = i === sel ? 'rgba(120,80,30,0.35)' : enc ? 'rgba(80,60,30,0.25)' : 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 12, yy, w - 24, 58);
    const fs = cuadrosHeroe(hr.clase, 'quieto', 'so'); if (fs.length) dibujar(ctx, fs[Math.floor(t * 6) % fs.length], x + 44, yy + 56, 0.62);
    texto(hr.nombre, x + 80, yy + 22, { tam: 16, color: '#f0e0b0', fuente: TITULO });
    texto(`${TT(CLASES.find((c) => c.id === hr.clase)!.nombre)} · ${T('Nivel', 'Level')} ${hr.nivel} · ${T('Acto', 'Act')} ${hr.acto}${hr.dificultad ? ' · ' + [T('Normal', 'Normal'), T('Pesadilla', 'Nightmare'), T('Infierno', 'Hell')][hr.dificultad] : ''}`, x + 80, yy + 42, { tam: 12, color: hr.dificultad ? '#ff8060' : '#a09070' });
    if (enc && E.clicIzq) { sel = i; E.clicIzq = false; Sonido.efecto('click'); }
  });
  if (!heroes.length) texto(T('Todavía no hay héroes.', 'No heroes yet.'), x + w / 2, y + 90, { alin: 'center', color: '#a09070' });
  const bx = W / 2 + 40, by = H * 0.35;
  if (heroes[sel]) {
    const hr = heroes[sel];
    // con su equipo si el pintor ya lo tiene; si no, el cuerpo horneado mientras tanto
    const vivo = cuadrosDeFirma((window as any).__firmaSel ?? '', 'quieto', 's');
    const fs = vivo?.length ? vivo : cuadrosHeroe(hr.clase, 'quieto', 's'); if (fs.length) dibujar(ctx, fs[Math.floor(t * 6) % fs.length], bx + 140, by + 30, 2);
    if (boton(T('Jugar', 'Play'), bx + 40, by + 80, 200, 38, { tam: 16 })) accion = 'jugar';
    if ((hr.actosHechos ?? []).includes(7) && (hr.dificultad ?? 0) < 2 && boton(hr.dificultad ? T('Bajar al Infierno', 'Descend into Hell') : T('Empezar Pesadilla', 'Begin Nightmare'), bx + 40, by + 268, 200, 30, { tam: 13, color: '#ff8060' })) accion = 'dificultad';
    if (boton((window as any).__borrar === hr.id ? T('¿Seguro? Clic otra vez', 'Sure? Click again') : T('Borrar', 'Delete'), bx + 40, by + 128, 200, 30, { tam: 13, color: (window as any).__borrar === hr.id ? '#ff6060' : undefined })) accion = 'borrar';
  }
  if (boton(T('Crear héroe nuevo', 'Create new hero'), bx + 40, by + 178, 200, 34, { tam: 14 })) accion = 'crear';
  if (boton(T('Volver', 'Back'), bx + 40, by + 222, 200, 30, { tam: 13 })) accion = 'volver';
  return { accion, sel };
}

// crear héroe: ver seleccion.ts
export { dibujarCrear } from './seleccion';

// ------------------------------------------------------------------ opciones
export function dibujarOpciones(t: number, fondo: boolean): 'volver' | null {
  if (fondo) dibujarFondoMenu(t); else { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H); }
  const w = 420, h = 340, x = W / 2 - w / 2, y = H / 2 - h / 2;
  marco(x, y, w, h);
  texto(T('Opciones', 'Options'), W / 2, y + 34, { alin: 'center', tam: 20, color: '#e0c890', fuente: TITULO });
  const barra = (n: string, k: keyof Opciones, yy: number) => {
    texto(n, x + 30, yy + 14, {});
    const bx = x + 170, bw = 200;
    ctx.fillStyle = '#1a1510'; ctx.fillRect(bx, yy + 4, bw, 12); ctx.fillStyle = '#a07a30'; ctx.fillRect(bx, yy + 4, bw * (opciones[k] as number), 12);
    ctx.strokeStyle = '#5a4a30'; ctx.strokeRect(bx + 0.5, yy + 4.5, bw, 12);
    if (E.izq && dentro(bx - 4, yy, bw + 8, 20)) { (opciones as any)[k] = Math.max(0, Math.min(1, (E.x - bx) / bw)); aplicarVolumen(); guardarOpciones(); }
  };
  barra(T('Volumen general', 'Master volume'), 'general', y + 60);
  barra(T('Música', 'Music'), 'musica', y + 92);
  barra(T('Efectos', 'Effects'), 'efectos', y + 124);
  barra(T('Brillo', 'Brightness'), 'brillo', y + 156);
  if (boton(`${T('Idioma', 'Language')}: ${IDI ? 'English' : 'Español'}`, x + 30, y + 196, w - 60, 30, { tam: 13 })) { opciones.idioma = IDI ? 0 : 1; fijarIdioma(opciones.idioma); guardarOpciones(); E.clicIzq = false; }
  if (boton(T('Pantalla completa', 'Fullscreen'), x + 30, y + 236, w - 60, 30, { tam: 13 })) { E.clicIzq = false; try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch { /* nada */ } }
  if (boton(T('Volver', 'Back'), x + w / 2 - 80, y + h - 48, 160, 32)) { E.clicIzq = false; return 'volver'; }
  return null;
}

export function pantallaCarga(k: number, msg: string, t: number) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  brasas(t, 20);
  logo(W / 2, H * 0.42, 0.85, t, Math.min(50, W / 18));
  const w = Math.min(420, W - 80), x = W / 2 - w / 2, y = H * 0.6;
  ctx.fillStyle = '#140f0b'; ctx.fillRect(x, y, w, 12); ctx.fillStyle = '#a0401a'; ctx.fillRect(x, y, w * k, 12);
  ctx.strokeStyle = '#5a4a30'; ctx.strokeRect(x + 0.5, y + 0.5, w, 12);
  texto(msg, W / 2, y + 34, { alin: 'center', tam: 13, color: '#a09070' });
}

// ------------------------------------------------------------------ entre actos, la revelación y los finales
// Usan la misma máquina que la intro: escenas pintadas con los assets, cámara lenta, franjas de cine y la voz a máquina.
const DUR_TOMA = 7;
/** Cámara al centro de la escena (cada bloque son 5 baldosas de 8 px de alto). */
const centroY = (m: MapaGotico) => ((m.ancho + m.alto) / 2) * 5 * 8;
/** Una figura en la toma: el heraldo pálido, la silueta de Ozmaren o el dios dorado. */
function figura(id: string, t: number, x: number, y: number, k: number) {
  const sprite = id === 'heraldo' ? 'sacerdote_caido' : SPRITE_OZMAREN;
  const fs = cuadrosMonstruo(sprite, id === 'heraldo' ? 'caminar' : 'quieto', id === 'heraldo' ? 'o' : 's'); const q = fs[Math.floor(t * (id === 'heraldo' ? 8 : 4)) % Math.max(1, fs.length)];
  if (!q) return;
  if (id === 'heraldo') { ctx.globalAlpha = 0.65 * k; dibujarTenido(ctx, q, x - t * 14, y, '#e8e0ff', 0.75, 1.6); ctx.globalAlpha = 1; return; }
  const esc = Math.min(2.2, (H * 0.6) / Math.max(1, q.h));
  dibujarTenido(ctx, q, x, y + H * 0.25, '#000', 0.85, esc);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 * k * (0.7 + 0.3 * Math.sin(t * 3));
  dibujarTenido(ctx, q, x, y + H * 0.25, id === 'aun_saar' ? '#ffd060' : '#ff5020', 1, esc); ctx.restore();
}
function lluviaDe(escenaId: string, t: number) {
  if (escenaId === 'nieve') lluviaCeniza(t, 1, 0); else if (escenaId === 'infierno' || escenaId === 'fortaleza') lluviaCeniza(t, 1, 0.45);
  else if (escenaId === 'cementerio' || escenaId === 'catedral' || escenaId === 'campamento') lluvia(t, 0.5); else lluviaCeniza(t, 0.5, 0.15);
}
/** Franjas, viñeta, fundidos y la línea escrita a máquina. */
function marcoCine(linea: string | null, tl: number, dur: number) {
  vineta();
  const fr = Math.round(H * 0.07); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, fr); ctx.fillRect(0, H - fr, W, fr);
  const f = Math.min(1, tl / 1.2, (dur - tl) / 1.2);
  ctx.fillStyle = `rgba(0,0,0,${1 - Math.max(0, f)})`; ctx.fillRect(0, 0, W, H);
  if (linea) envolver(maquina(linea, tl - 0.7), Math.min(760, W - 80), 20).forEach((l, n) => texto(l, W / 2, H - fr - 52 + n * 26, { alin: 'center', tam: 20, color: '#e8dcc0', fuente: TITULO }));
  texto(T('Clic o Esc para saltar', 'Click or Esc to skip'), W - 16, H - 14, { alin: 'right', tam: 11, color: '#5a5040' });
}
/** Cinemática al cerrar un acto. Devuelve true cuando terminó. */
export function dibujarEntreacto(acto: number, t: number, eleccion?: FinalElegido): boolean {
  const tomas = ENTREACTO[acto] ?? [];
  const i = Math.floor(t / DUR_TOMA);
  if (i >= tomas.length) return true;
  const tm = tomas[i], tl = t - i * DUR_TOMA, k = tl / DUR_TOMA;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const m = escena(tm.escena, tm.seed).mapa;
  camara(() => pintarMapa(m, (i % 2 ? -1 : 1) * (tl * 6 - 20), centroY(m) - 20 + tl * 4, t, undefined, 1.6 + suave(k) * 0.3), 1);
  oscuridad(tm.escena === 'infierno' ? 0.45 : 0.6, [[W / 2, H * 0.55, 220 * titila(t)]]);
  if (tm.figura) figura(tm.figura, tl, W * 0.62, H * 0.62, Math.min(1, tl / 2));
  lluviaDe(tm.escena, t);
  if (tm.escena === 'infierno' || tm.escena === 'arcano') brasas(t, 30);
  const linea = (eleccion && tm.textoSegun?.[eleccion]) || tm.texto;
  marcoCine(TT(linea), tl, DUR_TOMA);
  texto(`${T('Acto', 'Act')} ${acto + 1}`, W / 2, Math.round(H * 0.07) + 30, { alin: 'center', tam: 13, color: `rgba(200,170,120,${Math.min(1, tl / 2) * 0.8})`, fuente: TITULO });
  return false;
}
/** Una brasa que late en el centro (la Brasa de Ozmaren). */
function brasaViva(t: number, x: number, y: number, k: number, gris = 0) {
  const r = (38 + Math.sin(t * 5) * 6) * (1 - gris * 0.6);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
  if (gris > 0) { g.addColorStop(0, `rgba(180,180,180,${k})`); g.addColorStop(0.3, `rgba(90,90,90,${0.6 * k})`); }
  else { g.addColorStop(0, `rgba(255,230,160,${k})`); g.addColorStop(0.25, `rgba(255,110,30,${0.8 * k})`); }
  g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
}
const DUR_REV = 7;
/** Al caer Ozmaren: la revelación y la elección. Devuelve la elección (una vez) o 'fin' cuando termina el desenlace. */
export function dibujarRevelacion(t: number, eleccion: FinalElegido | null): FinalElegido | 'fin' | null {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const m = escena('infierno', 5).mapa;
  camara(() => pintarMapa(m, -10 + Math.min(t, 30) * 1.5, centroY(m), t, undefined, 1.8), 1);
  oscuridad(0.8);
  if (eleccion) {
    brasaViva(t, W / 2, H * 0.45, 1, eleccion === 'destruir' ? Math.min(1, t / 3) : 0);
    if (eleccion === 'absorber') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.min(W, 200 + t * 120)); g.addColorStop(0, `rgba(255,90,20,${Math.max(0, 0.4 - t * 0.04)})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    brasas(t, 40, eleccion === 'absorber');
    marcoCine(TT(TRAS_ELEGIR[eleccion]), t, 9);
    return t > 9 ? 'fin' : null;
  }
  brasaViva(t, W / 2, H * 0.45, Math.min(1, t / 2));
  brasas(t, 30);
  const n = REVELACION.length, i = Math.min(n - 1, Math.floor(t / DUR_REV));
  if (t < n * DUR_REV) { marcoCine(TT(REVELACION[i]), t - i * DUR_REV, DUR_REV); return null; }
  // la elección
  vineta();
  texto(TT(REVELACION[n - 1]).split('. ')[0] + '.', W / 2, H * 0.68, { alin: 'center', tam: 16, color: '#c8b890', fuente: TITULO });
  let r: FinalElegido | null = null;
  const bw = 230, by = H * 0.74;
  if (boton(TT(OPCIONES_BRASA.destruir), W / 2 - bw - 20, by, bw, 40, { tam: 16, color: '#c0d0e0' })) r = 'destruir';
  if (boton(TT(OPCIONES_BRASA.absorber), W / 2 + 20, by, bw, 40, { tam: 16, color: '#ffa060' })) r = 'absorber';
  return r;
}
/** Al caer Aun-Saar: el epílogo según lo que hiciste con la Brasa. Devuelve true cuando terminó. */
export function dibujarFinal(t: number, eleccion: FinalElegido = 'destruir'): boolean {
  const ep = EPILOGO[eleccion];
  const dur = 7, i = Math.floor(t / dur);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (i >= ep.lineas.length) {
    const k = Math.min(1, (t - ep.lineas.length * dur) / 2);
    brasas(t, 40, eleccion === 'absorber');
    logo(W / 2, H * 0.4, k, t, Math.min(56, W / 16));
    texto(TT(ep.titulo), W / 2, H * 0.54, { alin: 'center', tam: 20, color: `rgba(220,200,160,${k})`, fuente: TITULO });
    texto(T('Fin', 'The End'), W / 2, H * 0.6, { alin: 'center', tam: 14, color: `rgba(180,160,120,${k})`, fuente: TITULO });
    texto(T('Ahora puedes empezar la Pesadilla desde la lista de héroes.', 'You can now begin Nightmare from the hero list.'), W / 2, H * 0.66, { alin: 'center', tam: 13, color: '#8a7a60' });
    return t > ep.lineas.length * dur + 7;
  }
  const tl = t - i * dur;
  // destruir: el valle al alba, gris y en calma. Absorber: el trono sobre el cielo roto, dorado y rojo.
  const m = eleccion === 'destruir' ? escena(i < 2 ? 'arcano' : i < 4 ? 'campamento' : 'cementerio', 3 + i).mapa : escena(i < 2 ? 'fortaleza' : i < 4 ? 'catedral' : 'infierno', 4 + i).mapa;
  camara(() => pintarMapa(m, (i % 2 ? -1 : 1) * (tl * 5 - 15), centroY(m) + 10 - tl * 3, t, undefined, 1.7 + suave(tl / dur) * 0.2), 1);
  oscuridad(eleccion === 'destruir' ? 0.5 : 0.62, [[W / 2, H * 0.5, 240 * titila(t)]]);
  if (eleccion === 'destruir') { lluvia(t, 0.3); ctx.fillStyle = 'rgba(120,130,150,0.12)'; ctx.fillRect(0, 0, W, H); }
  else { brasas(t, 40); if (i < 2) figura('aun_saar', tl, W / 2, H * 0.5, 1); }
  if (i === ep.lineas.length - 1) { const g = ctx.createRadialGradient(W * 0.72, H * 0.2, 0, W * 0.72, H * 0.2, 40 + Math.sin(t * 6) * 4); const k = Math.min(1, tl / 1.2); g.addColorStop(0, `rgba(255,200,120,${k})`); g.addColorStop(0.3, `rgba(255,90,20,${0.6 * k})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  marcoCine(TT(ep.lineas[i]), tl, dur);
  return false;
}
