// Fuera del juego: intro, menú principal, elegir y crear héroe, opciones y pantalla de carga.
import { cuadrosDeFirma, retratoVivo, RETRATO_K } from '../motor/pintor';
import { equipoVisual, firmaVisual, cuerpoDe } from '../juego/heroe';
import { abrirExportar, abrirImportar } from './traslado';
import { ctx, W, H, E, vistaActual, fijarVista } from '../nucleo/lienzo';
import { texto, T, TT, IDI, boton, dentro, envolver, TITULO, fijarIdioma } from './comun';
import { cuadrosHeroe, cuadrosPiso, variantePiso, cuadrosRetrato, objetoMeta, dibujar, dibujarTenido, cuadrosMonstruo } from '../motor/assets';
import { generarPaisaje, type MapaGotico } from '../../../src/engine/gotico/index';
import { CLASES } from '../datos/clases';
import { INTRO, ENTREACTO, REVELACION, OPCIONES_BRASA, TRAS_ELEGIR, type FinalElegido } from '../mundo/actos';
import { EPILOGOS, type Final } from '../mundo/decisiones';
import { siguienteCiclo, type DatosHeroe } from '../juego/heroe';
import { R, rng } from '../nucleo/azar';
import { Sonido } from '../audio/sonido';
import { dibujarPortada, tituloFijo, dibujarCarta, prepararCarta } from './portada';

export interface Opciones { general: number; musica: number; efectos: number; horror: number; idioma: 0 | 1; brillo: number; vista?: number }
export const opciones: Opciones = { general: 0.8, musica: 0.6, efectos: 0.8, horror: 0.8, idioma: 0, brillo: 1 };
export function cargarOpciones() { try { Object.assign(opciones, JSON.parse(localStorage.getItem('marca.opciones') ?? '{}')); } catch { /* nada */ } fijarIdioma(opciones.idioma); aplicarVolumen(); }
export function guardarOpciones() { try { localStorage.setItem('marca.opciones', JSON.stringify(opciones)); } catch { /* nada */ } }
export const aplicarVolumen = () => Sonido.volumen(opciones.general, opciones.musica, opciones.efectos, opciones.horror ?? 0.8);

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
    const fs = cuadrosPiso(p.id, variantePiso(p.id, p.v, bx, by)); if (!fs.length) continue;
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
/** El título: el de letras forjadas de la Forja si ya llegó (salvo la intro, donde las brasas forman las letras viejas). */
export function logo(x: number, y: number, k: number, _t: number, tam = 54, _forja?: number) { tituloFijo(x, y, Math.min(W * 0.62, tam * 10.5, (H * 0.42) / 0.6), k); }

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
      const ret = cuadrosRetrato(c.id, 2); const q = ret.length ? ret[cuadroPresentar(t + 40 - i * 0.9, ret.length, 6.2)] : cuadrosHeroe(c.id, 'quieto', 's')[0];
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
  T0(9, [], (t) => { sacudir = Math.max(0, sacudir - 0.02); if (t >= 3.6 && t - 1 / 60 < 3.6) { Sonido.efecto('trueno', { vol: 0.6 }); sacudir = 0.5; } ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); camara(() => { brasas(t, 50); lluviaCeniza(t, 0.6, 0.3); tituloFijo(W / 2, H / 2, Math.min(W * 0.62, (H * 0.55) / 0.6), Math.min(1, t / 4.2)); }, 1); });
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
/** Estado del menú de la portada: qué renglón está encendido y cuánto lleva así (para que la raya crezca y la brasa prenda). */
const menuP = { sel: 0, k: [0, 0, 0, 0, 0, 0], t0: -1, ult: 0 };
/**
 * El menú de la portada: una columna a la izquierda, sobre la franja oscura del camposanto, sin tapar la catedral.
 * Cada renglón es un título grabado; el encendido lleva una brasa viva a su lado, se dora y le crece una raya debajo.
 * Arriba de todo, Continuar: tu último héroe de pie junto a su fuego, a un toque de volver a jugar.
 */
export function menuPrincipal(t: number, hayPartidas: boolean, ultimo?: DatosHeroe | null): string | null {
  const pt = dibujarPortada(performance.now() / 1000);
  if (!pt) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); brasas(t, 30); return null; }
  const alfa = pt.botones; if (alfa <= 0) { menuP.t0 = -1; return null; }
  if (menuP.t0 < 0) menuP.t0 = t;
  const dt = Math.min(0.05, Math.max(0, t - menuP.ult)); menuP.ult = t;
  const filas: { id: string; s: string; sub?: string }[] = [];
  if (ultimo) filas.push({ id: 'continuar', s: T('Continuar', 'Continue'), sub: `${ultimo.nombre} · ${TT(CLASES.find((c) => c.id === ultimo.clase)!.nombre)} · ${T('Nivel', 'Level')} ${ultimo.nivel} · ${T('Acto', 'Act')} ${ultimo.acto}` });
  filas.push({ id: 'jugar', s: hayPartidas ? T('Héroes', 'Heroes') : T('Nueva partida', 'New game') });
  filas.push({ id: 'intro', s: T('Ver la intro', 'Watch intro') });
  filas.push({ id: 'opciones', s: T('Opciones', 'Options') });
  filas.push({ id: 'idioma', s: IDI ? 'Español' : 'English' });
  const angosto = W < 760, tam = Math.max(17, Math.min(25, H * 0.034)), paso = Math.round(tam * 2.05), altoSub = ultimo ? Math.round(tam * 0.95) : 0;
  const alto = filas.length * paso + altoSub, ancho = Math.min(W - 40, Math.max(300, tam * 15));
  const x0 = angosto ? Math.round(W / 2 - ancho / 2) : Math.round(Math.max(28, W * 0.065)), y0 = Math.round(Math.min(H - alto - 46, Math.max(H * 0.5, H - alto - 70)));
  let r: string | null = null;
  ctx.save(); ctx.globalAlpha = alfa;
  // el paño: una sombra que se deshace hacia la derecha, con un filo de oro viejo a la izquierda y sus dos remates
  const pg = ctx.createLinearGradient(x0 - 26, 0, x0 + ancho + 60, 0);
  pg.addColorStop(0, 'rgba(4,2,2,0.86)'); pg.addColorStop(0.62, 'rgba(6,3,2,0.6)'); pg.addColorStop(1, 'rgba(6,3,2,0)');
  ctx.fillStyle = pg; ctx.fillRect(x0 - 26, y0 - 22, ancho + 86, alto + 40);
  const filo = ctx.createLinearGradient(0, y0 - 22, 0, y0 + alto + 18);
  filo.addColorStop(0, 'rgba(200,150,70,0)'); filo.addColorStop(0.5, 'rgba(214,168,88,0.95)'); filo.addColorStop(1, 'rgba(200,150,70,0)');
  ctx.fillStyle = filo; ctx.fillRect(x0 - 14, y0 - 22, 2, alto + 40);
  const rombo = (x: number, y: number, q: number, c: string) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - q); ctx.lineTo(x + q, y); ctx.lineTo(x, y + q); ctx.lineTo(x - q, y); ctx.closePath(); ctx.fill(); };
  rombo(x0 - 13, y0 - 22, 5, '#d8aa5a'); rombo(x0 - 13, y0 + alto + 18, 5, '#d8aa5a');
  // quién está encendido: el que tiene el puntero encima; si ninguno, el último que lo tuvo (o el primero)
  let y = y0;
  filas.forEach((fl, n) => {
    const h = paso + (n === 0 && fl.sub ? altoSub : 0), enc = dentro(x0 - 16, y, ancho + 30, h);
    if (enc) menuP.sel = n;
    const act = menuP.sel === n;
    menuP.k[n] = Math.max(0, Math.min(1, menuP.k[n] + (act ? dt * 5.5 : -dt * 4)));
    const k = suave(menuP.k[n]), entra = suave(Math.max(0, Math.min(1, (t - menuP.t0 - n * 0.09) / 0.45)));
    const tx = x0 + 26 + k * 10 - (1 - entra) * 26, ty = y + Math.round(tam * 1.18), grande = n === 0 && !!fl.sub;
    ctx.globalAlpha = alfa * entra;
    // el fondo del encendido: una franja tibia que se apaga hacia la derecha
    if (k > 0.01) { const fg = ctx.createLinearGradient(x0 - 12, 0, x0 + ancho, 0); fg.addColorStop(0, `rgba(190,90,30,${0.26 * k})`); fg.addColorStop(1, 'rgba(190,90,30,0)'); ctx.fillStyle = fg; ctx.fillRect(x0 - 12, y + 3, ancho + 12, h - 6); }
    // la brasa: un rombo que late, con su halo y dos chispas que suben
    if (k > 0.01) {
      const bx = x0 + 6, by = ty - tam * 0.34, lat = 0.75 + 0.25 * Math.sin(t * 9 + n) + 0.1 * Math.sin(t * 23);
      const hg = ctx.createRadialGradient(bx, by, 0, bx, by, 20 * k); hg.addColorStop(0, `rgba(255,150,50,${0.55 * k * lat})`); hg.addColorStop(1, 'rgba(255,120,30,0)'); ctx.fillStyle = hg; ctx.fillRect(bx - 22, by - 22, 44, 44);
      rombo(bx, by, 5.5 * k, '#ff8a2a'); rombo(bx, by, 2.6 * k, '#fff0b0');
      for (let c = 0; c < 3; c++) { const u = (t * 0.9 + c * 0.37 + n * 0.2) % 1; ctx.fillStyle = `rgba(255,${170 + c * 25},90,${(1 - u) * 0.9 * k})`; ctx.fillRect(Math.round(bx + Math.sin(u * 7 + c * 2) * 5), Math.round(by - 6 - u * 26), 2, 2); }
    }
    // el título: grabado (sombra dura abajo), dorado y con resplandor cuando está encendido
    ctx.font = `700 ${Math.round(tam * (grande ? 1.16 : 1))}px ${TITULO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const S = fl.s.toUpperCase().split('').join(' ');
    ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillText(S, tx + 1, ty + 2);
    if (k > 0.01) { ctx.shadowColor = `rgba(255,140,40,${0.85 * k})`; ctx.shadowBlur = 16 * k; }
    const tg = ctx.createLinearGradient(0, ty - tam, 0, ty + 2);
    tg.addColorStop(0, k > 0.5 ? '#fff3c8' : '#d6c6a0'); tg.addColorStop(0.55, k > 0.5 ? '#f0c060' : '#b09a70'); tg.addColorStop(1, k > 0.5 ? '#b0702a' : '#7a6848');
    ctx.fillStyle = tg; ctx.fillText(S, tx, ty); ctx.shadowBlur = 0;
    const wt = ctx.measureText(S).width;
    // la raya que crece debajo, con su rombo en la punta
    if (k > 0.01) { const lg = ctx.createLinearGradient(tx, 0, tx + wt * k, 0); lg.addColorStop(0, 'rgba(230,180,90,0.95)'); lg.addColorStop(1, 'rgba(230,180,90,0.15)'); ctx.fillStyle = lg; ctx.fillRect(tx, ty + 7, wt * k, 1.5); rombo(tx + wt * k + 5, ty + 7.5, 2.6, `rgba(240,200,110,${k})`); }
    if (fl.sub) { ctx.font = `500 ${Math.round(tam * 0.56)}px ${TITULO}`; ctx.fillStyle = k > 0.5 ? '#e8c890' : '#9a8a68'; ctx.fillText(fl.sub, tx + 1, ty + Math.round(tam * 0.95)); }
    ctx.globalAlpha = alfa;
    ((window as any).__menuFilas ??= {})[fl.id] = [x0 + ancho / 2, y + h / 2];
    if (enc && E.clicIzq && alfa > 0.6) { r = fl.id; Sonido.efecto('click'); }
    y += h;
  });
  // tu héroe junto al menú: de pie, alumbrado desde abajo por su fuego
  if (ultimo && !angosto) {
    const fs = cuadrosHeroe(ultimo.clase, 'quieto', 'so');
    if (fs.length) {
      // (abajo, al pie de la columna, donde el piso es oscuro: más arriba quedaba flotando sobre las ruinas)
      const hx = x0 + ancho + 40, hy = y0 + alto + 6, esc = Math.max(1.5, Math.min(2.5, H / 330));
      const lg = ctx.createRadialGradient(hx, hy, 4, hx, hy, 120); lg.addColorStop(0, `rgba(255,130,40,${0.34 + 0.06 * Math.sin(t * 7)})`); lg.addColorStop(1, 'rgba(255,110,30,0)');
      ctx.fillStyle = lg; ctx.fillRect(hx - 130, hy - 130, 260, 200);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(hx, hy, 30 * esc * 0.5, 9 * esc * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      // en grande y con su equipo (retrato pintado a ese tamaño); mientras se pinta, el sprite del juego ampliado
      const ret = retratoVivo(ultimo.clase, cuerpoDe(ultimo.clase as any), equipoVisual(ultimo as any), firmaVisual(ultimo as any));
      if (ret?.length) { ctx.imageSmoothingEnabled = true; (ctx as any).imageSmoothingQuality = 'high'; dibujar(ctx, ret[Math.floor(t * 2.6) % ret.length], hx, hy, (esc * 1.25) / RETRATO_K); }
      else { ctx.imageSmoothingEnabled = false; dibujar(ctx, fs[Math.floor(t * 6) % fs.length], hx, hy, esc); }
    }
  }
  ctx.restore();
  texto(T('Un juego hecho en casa para la familia Gutierrez', 'A homemade game for the Gutierrez family'), angosto ? W / 2 : W - 24, H - 18, { alin: angosto ? 'center' : 'right', tam: 11, color: '#7a6a4c' });
  return r;
}

// ------------------------------------------------------------------ elegir héroe
// ---- piezas comunes de las pantallas de menú: títulos grabados, rombos y rayas de oro
const rombo2 = (x: number, y: number, q: number, c: string) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - q); ctx.lineTo(x + q, y); ctx.lineTo(x, y + q); ctx.lineTo(x - q, y); ctx.closePath(); ctx.fill(); };
/** Un título grabado en oro (Cinzel, mayúsculas espaciadas), con sombra dura y, si se pide, resplandor de brasa. */
function grabado(sx: string, x: number, y: number, tam: number, o: { alin?: CanvasTextAlign; brillo?: number; apagado?: boolean } = {}) {
  ctx.save(); ctx.font = `700 ${Math.round(tam)}px ${TITULO}`; ctx.textAlign = o.alin ?? 'left'; ctx.textBaseline = 'alphabetic';
  const S = sx.toUpperCase().split('').join(' ');
  ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillText(S, x + 1, y + 2);
  if (o.brillo) { ctx.shadowColor = `rgba(255,140,40,${0.8 * o.brillo})`; ctx.shadowBlur = 18 * o.brillo; }
  const g = ctx.createLinearGradient(0, y - tam, 0, y + 2);
  if (o.apagado) { g.addColorStop(0, '#b8a888'); g.addColorStop(1, '#6e5e44'); } else { g.addColorStop(0, '#fff3c8'); g.addColorStop(0.55, '#f0c060'); g.addColorStop(1, '#a86a28'); }
  ctx.fillStyle = g; ctx.fillText(S, x, y); const w = ctx.measureText(S).width; ctx.restore(); return w;
}
/** Una raya de oro que se apaga en las puntas, con su rombo al centro. */
function rayaOro(x: number, y: number, w: number, a = 1) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, 'rgba(214,168,88,0)'); g.addColorStop(0.5, `rgba(214,168,88,${0.9 * a})`); g.addColorStop(1, 'rgba(214,168,88,0)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, 1.5); rombo2(x + w / 2, y + 0.75, 4, `rgba(232,186,100,${a})`);
}
/** El fondo de las pantallas de menú: el campamento casi a oscuras, con un pozo de luz de fuego donde se pide. */
function fondoVigilia(t: number, lx: number, ly: number, r: number) {
  dibujarFondoMenu(t);
  ctx.fillStyle = 'rgba(6,4,4,0.5)'; ctx.fillRect(0, 0, W, H);
  const parpa = 1 + Math.sin(t * 8.3) * 0.04 + Math.sin(t * 13.1) * 0.03;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(lx, ly); ctx.scale(1, 0.5);
  const g = ctx.createRadialGradient(0, 0, 6, 0, 0, r * parpa); g.addColorStop(0, 'rgba(255,140,50,0.5)'); g.addColorStop(0.5, 'rgba(200,80,24,0.22)'); g.addColorStop(1, 'rgba(160,50,10,0)');
  ctx.fillStyle = g; ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4); ctx.restore();
  // la franja de arriba y la de abajo, para que los títulos y la galería se lean
  const a = ctx.createLinearGradient(0, 0, 0, H * 0.22); a.addColorStop(0, 'rgba(0,0,0,0.7)'); a.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = a; ctx.fillRect(0, 0, W, H * 0.22);
  const b = ctx.createLinearGradient(0, H * 0.62, 0, H); b.addColorStop(0, 'rgba(0,0,0,0)'); b.addColorStop(1, 'rgba(0,0,0,0.92)'); ctx.fillStyle = b; ctx.fillRect(0, H * 0.62, W, H * 0.38);
}
const selP = { k: [] as number[], ult: 0, t0: -1, sel: -1, tCambio: 0, desde: 0 };
const horas = (seg: number) => { const m = Math.floor((seg ?? 0) / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`; };
/**
 * Elegir héroe: la vigilia. El héroe elegido de pie junto al fuego, grande; a su lado su nombre grabado y lo que lleva
 * vivido (nivel, acto, horas, muertes, oro); abajo, la galería de tus héroes en nichos de piedra, con uno vacío para el próximo.
 */
export function dibujarSeleccion(t: number, heroes: DatosHeroe[], sel: number): { accion: 'jugar' | 'crear' | 'borrar' | 'volver' | 'dificultad' | null; sel: number } {
  let accion: 'jugar' | 'crear' | 'borrar' | 'volver' | 'dificultad' | null = null;
  const dt = Math.min(0.05, Math.max(0, t - selP.ult)); selP.ult = t; if (dt === 0 || selP.t0 < 0 || t - selP.t0 > 600 || t < selP.t0) selP.t0 = t;
  if (selP.sel !== sel) { selP.sel = sel; selP.tCambio = t; }
  const chico = H < 520 || W < 760, pant: Record<string, [number, number]> = ((window as any).__pantalla = {});
  // ---- medidas
  const nichoH = Math.round(chico ? Math.max(74, H * 0.23) : Math.min(150, H * 0.2)), nichoW = Math.round(nichoH * 0.78), galY = H - nichoH - (chico ? 8 : 20);
  const hx = Math.round(chico ? W * 0.27 : W * 0.33), hy = Math.round(galY - (chico ? 14 : 34)), esc = Math.max(1.5, Math.min(3, Math.floor(((galY - (chico ? 60 : 110)) / 92) * 2) / 2));
  fondoVigilia(t, hx, hy, chico ? 190 : 300);
  brasas(t, 26);
  // ---- cabecera
  const tt = chico ? 17 : 24; grabado(T('Tus héroes', 'Your heroes'), W / 2, chico ? 26 : 46, tt, { alin: 'center' }); rayaOro(W / 2 - 150, (chico ? 26 : 46) + 9, 300);
  if (boton('‹ ' + T('Volver', 'Back'), 14, chico ? 8 : 20, chico ? 96 : 120, chico ? 26 : 32, { tam: 13 })) accion = 'volver';
  pant.volver = [14 + 50, (chico ? 8 : 20) + 14];
  const hr = heroes[sel];
  // ---- el héroe: de pie junto a su fuego, con su equipo si el pintor ya lo tiene
  if (hr) {
    const entra = suave(Math.max(0, Math.min(1, (t - selP.tCambio) / 0.35)));
    const vivo = cuadrosDeFirma((window as any).__firmaSel ?? '', 'quieto', 's');
    const fs = vivo?.length ? vivo : cuadrosHeroe(hr.clase, 'quieto', 's');
    ctx.fillStyle = `rgba(0,0,0,${0.6 * entra})`; ctx.beginPath(); ctx.ellipse(hx, hy, 26 * esc * 0.62, 8 * esc * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    const ret = retratoVivo(hr.clase, cuerpoDe(hr.clase as any), equipoVisual(hr as any), firmaVisual(hr as any));
    if (ret?.length) { ctx.save(); ctx.globalAlpha = entra; ctx.imageSmoothingEnabled = true; (ctx as any).imageSmoothingQuality = 'high'; dibujar(ctx, ret[Math.floor(t * 2.6) % ret.length], hx, hy + (1 - entra) * 10, esc / RETRATO_K); ctx.restore(); }
    else if (fs.length) { ctx.save(); ctx.globalAlpha = entra; ctx.imageSmoothingEnabled = false; dibujar(ctx, fs[Math.floor(t * 6) % fs.length], hx, hy + (1 - entra) * 10, esc); ctx.restore(); }
    // la brasa a sus pies y las chispas que suben
    for (let c = 0; c < 9; c++) { const u = (t * 0.45 + c * 0.113) % 1, sx = hx + 60 * esc * 0.36 + Math.sin(u * 9 + c * 1.7) * 14; ctx.fillStyle = `rgba(255,${150 + (c % 3) * 30},70,${(1 - u) * 0.85})`; ctx.fillRect(Math.round(sx), Math.round(hy + 6 - u * 130 * esc * 0.4), 2, 2); }
    rombo2(hx + 60 * esc * 0.36, hy + 6, 7 + Math.sin(t * 9) * 1.2, '#ff8a2a'); rombo2(hx + 60 * esc * 0.36, hy + 6, 3.2, '#fff0b0');
    // ---- su ficha: nombre grabado, clase y lo vivido
    const fx = Math.round(chico ? W * 0.47 : W * 0.54), fw = Math.min(W - fx - 20, chico ? 380 : 460); let fy = Math.round(chico ? 52 : H * 0.2);
    const tn = chico ? 24 : Math.min(44, Math.max(30, H * 0.058));
    ctx.save(); ctx.globalAlpha = entra;
    const clase = CLASES.find((c) => c.id === hr.clase)!;
    fy += tn; grabado(hr.nombre, fx + (1 - entra) * 18, fy, tn, { brillo: 0.5 });
    fy += chico ? 17 : 24; texto(`${TT(clase.nombre)}${hr.dificultad ? ' · ' + [T('Normal', 'Normal'), T('Pesadilla', 'Nightmare'), T('Infierno', 'Hell')][hr.dificultad] : ''}${hr.ciclo ? ' · ' + T('Ciclo', 'Cycle') + ' ' + (hr.ciclo + 1) : ''}`, fx + 2, fy, { tam: chico ? 12 : 15, color: hr.dificultad ? '#ff9070' : '#c8b088', fuente: TITULO });
    fy += chico ? 8 : 14; { const g = ctx.createLinearGradient(fx, 0, fx + fw, 0); g.addColorStop(0, 'rgba(214,168,88,0.9)'); g.addColorStop(1, 'rgba(214,168,88,0)'); ctx.fillStyle = g; ctx.fillRect(fx, fy, fw, 1.5); rombo2(fx, fy + 0.75, 4, '#e8ba64'); }
    // lo vivido, en dos columnas: la cifra grande en oro y debajo qué es
    const datos: [string, string][] = [[String(hr.nivel), T('Nivel', 'Level')], [String(hr.acto), T('Acto', 'Act')], [horas(hr.jugado), T('Jugado', 'Played')], [String(hr.muertes ?? 0), T('Muertes', 'Deaths')], [String((hr as any).oro ?? 0), T('Oro', 'Gold')], [String((hr.actosHechos ?? []).length) + ' / 7', T('Actos hechos', 'Acts done')]];
    const cols = chico ? 6 : 3, cw = fw / cols, dh = chico ? 34 : 58; fy += chico ? 8 : 18;
    datos.forEach(([v, n], q) => { const dx = fx + (q % cols) * cw, dy = fy + Math.floor(q / cols) * dh; grabado(v, dx, dy + (chico ? 15 : 24), chico ? 14 : 22); texto(n.toUpperCase(), dx + 1, dy + (chico ? 27 : 42), { tam: chico ? 8 : 10, color: '#8a7a5a', fuente: TITULO }); });
    fy += Math.ceil(datos.length / cols) * dh + (chico ? 4 : 10);
    ctx.restore();
    // ---- jugar: la placa grande, con su brasa
    const jw = Math.min(fw, chico ? 190 : 280), jh = chico ? 36 : 50;
    if (boton(T('Jugar', 'Play'), fx, fy, jw, jh, { tam: chico ? 16 : 21, color: '#ffe9b0' })) accion = 'jugar';
    pant.jugar = [fx + jw / 2, fy + jh / 2];
    const lat = 0.6 + 0.4 * Math.sin(t * 3); ctx.strokeStyle = `rgba(255,150,50,${0.35 * lat})`; ctx.lineWidth = 2; ctx.strokeRect(fx - 3, fy - 3, jw + 6, jh + 6);
    const bw2 = chico ? 120 : 150, by2 = chico ? fy + 4 : fy + jh + 12, bx2 = chico ? fx + jw + 10 : fx;
    if ((hr.actosHechos ?? []).includes(7) && boton(T('Volver a empezar: ', 'Start over: ') + TT(siguienteCiclo(hr)), bx2, by2 + (chico ? 0 : 38), chico ? 200 : 280, 28, { tam: 12, color: '#ff8060' })) accion = 'dificultad';
    const seguro = (window as any).__borrar === hr.id;
    if (boton(seguro ? T('¿Seguro? Otra vez', 'Sure? Again') : T('Borrar héroe', 'Delete hero'), chico ? bx2 : fx + jw - bw2, by2 + (chico && (hr.actosHechos ?? []).includes(7) ? 32 : 0), bw2, 28, { tam: 12, color: seguro ? '#ff6060' : '#a89878' })) accion = 'borrar';
  } else {
    grabado(T('Todavía no hay héroes', 'No heroes yet'), W / 2, H * 0.42, chico ? 18 : 26, { alin: 'center', apagado: true });
    texto(T('Enciende el primero en el nicho vacío.', 'Light the first one in the empty niche.'), W / 2, H * 0.42 + 30, { alin: 'center', tam: 14, color: '#a09070' });
  }
  // ---- la galería: un nicho de piedra por héroe y uno vacío para el próximo
  const n = heroes.length + 1, sep = chico ? 8 : 14, caben = Math.max(2, Math.floor((W - 40 + sep) / (nichoW + sep)));
  if (sel < selP.desde) selP.desde = sel; if (sel >= selP.desde + caben - 1) selP.desde = Math.max(0, sel - caben + 2); selP.desde = Math.max(0, Math.min(selP.desde, Math.max(0, n - caben)));
  const vis = Math.min(n, caben), gx0 = Math.round(W / 2 - (vis * nichoW + (vis - 1) * sep) / 2);
  for (let q = 0; q < vis; q++) {
    const i = selP.desde + q, x = gx0 + q * (nichoW + sep), nuevo = i >= heroes.length, act = i === sel && !nuevo, enc = dentro(x, galY, nichoW, nichoH);
    selP.k[i] = Math.max(0, Math.min(1, (selP.k[i] ?? 0) + (act || enc ? dt * 6 : -dt * 4))); const k = suave(selP.k[i]), y = galY - k * (chico ? 4 : 8);
    // el nicho: un arco apuntado de piedra oscura con filo de oro
    const arco = () => { const r = nichoW / 2; ctx.beginPath(); ctx.moveTo(x, y + nichoH); ctx.lineTo(x, y + r * 0.9); ctx.quadraticCurveTo(x, y + r * 0.1, x + r, y); ctx.quadraticCurveTo(x + nichoW, y + r * 0.1, x + nichoW, y + r * 0.9); ctx.lineTo(x + nichoW, y + nichoH); ctx.closePath(); };
    ctx.save();
    if (k > 0.02) { ctx.shadowColor = `rgba(255,130,40,${0.6 * k})`; ctx.shadowBlur = 18 * k; }
    const g = ctx.createLinearGradient(0, y, 0, y + nichoH); g.addColorStop(0, act ? '#3a2616' : '#1c1612'); g.addColorStop(1, '#090706'); ctx.fillStyle = g; arco(); ctx.fill(); ctx.shadowBlur = 0;
    if (!nuevo || k > 0.02) { ctx.save(); arco(); ctx.clip(); const lg = ctx.createRadialGradient(x + nichoW / 2, y + nichoH * 0.86, 2, x + nichoW / 2, y + nichoH * 0.86, nichoH * 0.8); lg.addColorStop(0, `rgba(255,130,40,${0.16 + 0.3 * k})`); lg.addColorStop(1, 'rgba(255,110,30,0)'); ctx.fillStyle = lg; ctx.fillRect(x, y, nichoW, nichoH); ctx.restore(); }
    ctx.lineWidth = act ? 2 : 1; ctx.strokeStyle = act ? '#f0c060' : k > 0.3 ? '#c09a58' : '#5e4c30'; arco(); ctx.stroke();
    rombo2(x + nichoW / 2, y, act ? 5 : 3.5, act ? '#ffb050' : '#8a7046');
    if (nuevo) {
      const cx = x + nichoW / 2, cy = y + nichoH * 0.5, q2 = nichoH * 0.13; ctx.strokeStyle = k > 0.3 ? '#ffd080' : '#8a7046'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - q2, cy); ctx.lineTo(cx + q2, cy); ctx.moveTo(cx, cy - q2); ctx.lineTo(cx, cy + q2); ctx.stroke();
      texto(T('Nuevo héroe', 'New hero').toUpperCase(), cx, y + nichoH - (chico ? 8 : 14), { alin: 'center', tam: chico ? 8 : 10, color: k > 0.3 ? '#ffe0a0' : '#9a8866', fuente: TITULO });
      pant.crear = [cx, galY + nichoH / 2];
      if (enc && E.clicIzq) { accion = 'crear'; Sonido.efecto('click'); }
    } else {
      const h2 = heroes[i], fs = cuadrosHeroe(h2.clase, 'quieto', 'so'), e2 = Math.max(0.6, (nichoH - (chico ? 30 : 44)) / 88);
      ctx.save(); arco(); ctx.clip(); if (!act) ctx.globalAlpha = 0.62 + 0.38 * k; ctx.imageSmoothingEnabled = false;
      if (fs.length) dibujar(ctx, fs[Math.floor(t * 6 + i * 2) % fs.length], x + nichoW / 2, y + nichoH - (chico ? 20 : 30), e2); ctx.restore();
      texto(h2.nombre.toUpperCase(), x + nichoW / 2, y + nichoH - (chico ? 9 : 15), { alin: 'center', tam: chico ? 9 : 11, color: act ? '#fff0c0' : '#c8b890', fuente: TITULO, max: nichoW - 8 });
      texto(`${T('Nv', 'Lv')} ${h2.nivel}`, x + nichoW / 2, y + nichoH - (chico ? 1 : 4), { alin: 'center', tam: chico ? 8 : 9, color: h2.dificultad ? '#ff9070' : '#8a7a5a', fuente: TITULO });
      pant['heroe' + i] = [x + nichoW / 2, galY + nichoH / 2];
      if (enc && E.clicIzq && !act) { sel = i; E.clicIzq = false; Sonido.efecto('click'); (window as any).__borrar = null; }
    }
    ctx.restore();
  }
  // flechas si hay más héroes que nichos
  if (selP.desde > 0) grabado('‹', gx0 - 22, galY + nichoH / 2 + 8, 24, { apagado: true });
  if (selP.desde + vis < n) grabado('›', gx0 + vis * (nichoW + sep) - sep + 8, galY + nichoH / 2 + 8, 24, { apagado: true });
  return { accion, sel };
}

// crear héroe: ver seleccion.ts
export { dibujarCrear } from './seleccion';
import { cuadroPresentar } from './seleccion';

// ------------------------------------------------------------------ opciones
const opcP = { agarra: '' };
/**
 * Opciones: una losa grabada en el centro. Cada volumen es una vara de hierro con su tramo al rojo y una brasa por
 * perilla (se arrastra, y muestra su tanto por ciento); el idioma y la pantalla completa son llaves de dos posiciones.
 */
export function dibujarOpciones(t: number, fondo: boolean): 'volver' | null {
  const chico = H < 520;
  if (fondo) { fondoVigilia(t, W / 2, H * 0.62, 320); brasas(t, 22); } else { ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, 0, W, H); }
  const fh = chico ? 30 : 44, w = Math.min(W - 24, chico ? 560 : 600), cab = chico ? 44 : 74, pie = chico ? 46 : 70, h = Math.min(H - 12, cab + fh * 9 + (chico ? 10 : 34) + pie), x = Math.round(W / 2 - w / 2), y = Math.round(H / 2 - h / 2);
  const pant: Record<string, [number, number]> = ((window as any).__pantalla = {});
  // la losa: esquinas cortadas, hierro oscuro, doble filo de oro y rombos en los cuatro costados
  const c = 14, losa = (m: number) => { ctx.beginPath(); ctx.moveTo(x + c + m, y + m); ctx.lineTo(x + w - c - m, y + m); ctx.lineTo(x + w - m, y + c + m); ctx.lineTo(x + w - m, y + h - c - m); ctx.lineTo(x + w - c - m, y + h - m); ctx.lineTo(x + c + m, y + h - m); ctx.lineTo(x + m, y + h - c - m); ctx.lineTo(x + m, y + c + m); ctx.closePath(); };
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 40;
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(34,26,20,0.97)'); g.addColorStop(0.5, 'rgba(18,14,11,0.97)'); g.addColorStop(1, 'rgba(8,6,5,0.98)'); ctx.fillStyle = g; losa(0); ctx.fill(); ctx.restore();
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#b08a4a'; losa(0); ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(176,138,74,0.35)'; losa(5); ctx.stroke();
  for (const [rx, ry] of [[x + w / 2, y], [x + w / 2, y + h], [x, y + h / 2], [x + w, y + h / 2]]) rombo2(rx, ry, 6, '#e0b060');
  grabado(T('Opciones', 'Options'), W / 2, y + (chico ? 28 : 46), chico ? 18 : 26, { alin: 'center', brillo: 0.4 }); rayaOro(W / 2 - 130, y + (chico ? 34 : 56), 260);
  const lx = x + (chico ? 22 : 36), vx = x + w * 0.44, vw = w * 0.56 - (chico ? 70 : 96);
  let yy = y + cab;
  const rotulo = (sx: string) => texto(sx.toUpperCase(), lx, yy + fh / 2 + 4, { tam: chico ? 11 : 13, color: '#d8c8a0', fuente: TITULO });
  const vara = (nom: string, k: keyof Opciones) => {
    rotulo(nom);
    const v = opciones[k] as number, cy = yy + fh / 2, enc = dentro(vx - 12, yy, vw + 24, fh);
    if (E.izq && (opcP.agarra === k || (enc && !opcP.agarra))) { opcP.agarra = k; (opciones as any)[k] = Math.max(0, Math.min(1, (E.x - vx) / vw)); aplicarVolumen(); guardarOpciones(); }
    const act = opcP.agarra === k || enc;
    ctx.fillStyle = '#050403'; ctx.fillRect(vx - 1, cy - 4, vw + 2, 8); ctx.fillStyle = '#231b14'; ctx.fillRect(vx, cy - 3, vw, 6);
    const tg = ctx.createLinearGradient(vx, 0, vx + vw * v, 0); tg.addColorStop(0, '#6a2408'); tg.addColorStop(0.7, '#d0601a'); tg.addColorStop(1, '#ffc060'); ctx.fillStyle = tg; ctx.fillRect(vx, cy - 3, vw * v, 6);
    ctx.fillStyle = 'rgba(255,230,170,0.25)'; ctx.fillRect(vx, cy - 3, vw * v, 2);
    for (let q = 1; q < 4; q++) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(Math.round(vx + (vw * q) / 4), cy - 3, 1, 6); }
    const px = vx + vw * v, lat = 0.8 + 0.2 * Math.sin(t * 9 + vx);
    const hg = ctx.createRadialGradient(px, cy, 0, px, cy, act ? 22 : 15); hg.addColorStop(0, `rgba(255,150,50,${(act ? 0.7 : 0.4) * lat})`); hg.addColorStop(1, 'rgba(255,120,30,0)'); ctx.fillStyle = hg; ctx.fillRect(px - 24, cy - 24, 48, 48);
    rombo2(px, cy, act ? 9 : 7.5, '#1a0e06'); rombo2(px, cy, act ? 7.5 : 6, '#ff8a2a'); rombo2(px, cy, 3, '#fff0b0');
    texto(`${Math.round(v * 100)} %`, x + w - (chico ? 20 : 34), cy + 5, { alin: 'right', tam: chico ? 12 : 14, color: act ? '#ffe0a0' : '#b8a480', fuente: TITULO });
    pant[k as string] = [vx + vw / 2, cy]; yy += fh;
  };
  if (!E.izq) opcP.agarra = '';
  vara(T('Volumen general', 'Master volume'), 'general');
  vara(T('Música', 'Music'), 'musica');
  vara(T('Efectos', 'Effects'), 'efectos');
  vara(T('Horror', 'Horror'), 'horror');
  vara(T('Brillo', 'Brightness'), 'brillo');
  yy += chico ? 4 : 12; rayaOro(x + 40, yy - (chico ? 2 : 6), w - 80, 0.5); yy += chico ? 2 : 6;
  // llave de dos posiciones: la elegida al rojo, la otra apagada
  const llave = (nom: string, ops: string[], cual: number, id: string): number | null => {
    rotulo(nom); let r: number | null = null; const tw = Math.min(150, (w * 0.56 - (chico ? 30 : 40) - (ops.length - 2) * 8) / ops.length), th = fh - (chico ? 6 : 12), ty = yy + (fh - th) / 2;
    ops.forEach((o, q) => { const bx = vx + q * (tw + 8), sel2 = q === cual, enc = dentro(bx, ty, tw, th);
      const gg = ctx.createLinearGradient(0, ty, 0, ty + th); gg.addColorStop(0, sel2 ? '#5a2a10' : '#1e1812'); gg.addColorStop(1, sel2 ? '#2a1206' : '#0c0a08'); ctx.fillStyle = gg; ctx.fillRect(bx, ty, tw, th);
      ctx.strokeStyle = sel2 ? '#f0b858' : enc ? '#a08450' : '#4e4028'; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, ty + 0.5, tw - 1, th - 1);
      if (sel2) rombo2(bx + 11, ty + th / 2, 3.5, '#ffb050');
      texto(o.toUpperCase(), bx + tw / 2 + (sel2 ? 5 : 0), ty + th / 2 + 4, { alin: 'center', tam: chico ? 10 : 12, color: sel2 ? '#fff0c0' : enc ? '#d8c8a0' : '#8a7a5c', fuente: TITULO });
      if (enc && E.clicIzq && !sel2) { r = q; Sonido.efecto('click'); }
      pant[id + q] = [bx + tw / 2, ty + th / 2]; });
    yy += fh; return r;
  };
  const li = llave(T('Idioma', 'Language'), ['Español', 'English'], IDI ? 1 : 0, 'idioma');
  if (li !== null) { opciones.idioma = li as 0 | 1; fijarIdioma(opciones.idioma); guardarOpciones(); E.clicIzq = false; }
  // la vista: cuánto se acerca la cámara (el héroe y el mundo más grandes; se ve menos alrededor)
  const lv = llave(T('Vista', 'View'), [T('Lejos', 'Far'), T('Cerca', 'Near'), T('Muy cerca', 'Closest')], vistaActual(), 'vista');
  if (lv !== null) { opciones.vista = lv; guardarOpciones(); fijarVista(lv); E.clicIzq = false; }
  const completa = typeof document !== 'undefined' && !!document.fullscreenElement;
  const lp = llave(T('Pantalla', 'Screen'), [T('Ventana', 'Window'), T('Completa', 'Full')], completa ? 1 : 0, 'pantalla');
  if (lp !== null) { E.clicIzq = false; try { if (lp === 0) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch { /* nada */ } }
  // la partida: sacarla como código o traerla de otro sitio (el guardado es de cada dirección web)
  const lt = llave(T('Partida', 'Save'), [T('Sacar', 'Export'), T('Traer', 'Import')], -1, 'partida');
  if (lt !== null) { E.clicIzq = false; E.izq = false; if (lt === 0) void abrirExportar(IDI === 1); else abrirImportar(IDI === 1); }
  const bw = chico ? 150 : 200, bh = chico ? 30 : 40;
  pant.volver = [W / 2, y + h - pie / 2 - (chico ? 0 : 4)];
  if (boton(T('Volver', 'Back'), W / 2 - bw / 2, y + h - pie / 2 - bh / 2 - (chico ? 0 : 4), bw, bh, { tam: chico ? 14 : 16 })) { E.clicIzq = false; return 'volver'; }
  // créditos de terceros (licencia MIT)
  texto(T('Efectos: pixelfx (MIT) de Patch, Hugo Duprez y Hollow Crown', 'Effects: pixelfx (MIT) by Patch, Hugo Duprez and Hollow Crown'), W / 2, Math.min(H - 4, y + h + 14), { alin: 'center', tam: 10, color: '#7a6a50' });
  return null;
}

export function pantallaCarga(k: number, msg: string, t: number) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  brasas(t, 20);
  // pensado para pantallas bajas (teléfono apaisado): título arriba con su alto acotado y la barra abajo con margen
  const th = Math.min(H * 0.5, 300), tw = Math.min(W * 0.62, th / 0.6);
  const ty = Math.max(8, H * 0.06) + (tw * 0.6) / 2;
  tituloFijo(W / 2, ty, tw, 0.9);
  const w = Math.min(420, W - 80), x = W / 2 - w / 2, y = Math.max(ty + (tw * 0.6) / 2 + 16, H - 78);
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
const DUR_CARTA = 7.5;
const NARRA_ACTO1: [string, string] = ['La brasa cayó sobre Santa Oria. Desde entonces el valle no duerme, y los muertos tampoco.', 'The ember fell on Santa Oria. Since then the valley does not sleep, and neither do the dead.'];
export function dibujarEntreacto(acto: number, t: number, eleccion?: FinalElegido): boolean {
  const todas = ENTREACTO[acto] ?? [];
  // primero la carta ilustrada del acto que empieza, con su nombre y la primera línea de la narración
  prepararCarta(acto + 1);
  if (t < DUR_CARTA) {
    const t0 = todas[0]; const linea = t0 ? (eleccion && t0.textoSegun?.[eleccion]) || t0.texto : acto === 0 ? NARRA_ACTO1 : null;
    if (dibujarCarta(acto + 1, t, linea ? TT(linea) : '', DUR_CARTA)) return false;
  }
  // después de la carta siguen las tomas (sin la primera, que ya se leyó en la carta); si la carta no llegó, todas
  let tomas = todas;
  if (t >= DUR_CARTA) { tomas = todas.slice(1); t -= DUR_CARTA; }
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
/** Al entregar la Corona: el epílogo del final que te tocó, con el párrafo de Vigdis antes de la última línea. Devuelve true cuando terminó. */
export function dibujarFinal(t: number, final: Final = 'vigilia', vigdis?: string): boolean {
  const ep = EPILOGOS[final];
  const lineas = [...ep.lineas]; if (vigdis === 'salvar' || vigdis === 'sacrificar') lineas.splice(lineas.length - 1, 0, ep.vigdis[vigdis]);
  const dur = 7.5, i = Math.floor(t / dur);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (i >= lineas.length) {
    const k = Math.min(1, (t - lineas.length * dur) / 2);
    brasas(t, 40, ep.arde);
    logo(W / 2, H * 0.4, k, t, Math.min(56, W / 16));
    texto(TT(ep.titulo), W / 2, H * 0.54, { alin: 'center', tam: 20, color: `rgba(220,200,160,${k})`, fuente: TITULO });
    texto(T('Fin', 'The End'), W / 2, H * 0.6, { alin: 'center', tam: 14, color: `rgba(180,160,120,${k})`, fuente: TITULO });
    return t > lineas.length * dur + 7;
  }
  const tl = t - i * dur;
  const esc = ep.escenas[Math.min(2, Math.floor(i * 3 / lineas.length))];
  const m = escena(esc, 3 + i).mapa;
  camara(() => pintarMapa(m, (i % 2 ? -1 : 1) * (tl * 5 - 15), centroY(m) + 10 - tl * 3, t, undefined, 1.7 + suave(tl / dur) * 0.2), 1);
  oscuridad(ep.arde ? 0.62 : 0.5, [[W / 2, H * 0.5, 240 * titila(t)]]);
  if (final === 'vigilia' || final === 'corona_fria') { lluvia(t, final === 'corona_fria' ? 0.5 : 0.25); ctx.fillStyle = final === 'corona_fria' ? 'rgba(150,170,200,0.16)' : 'rgba(120,130,150,0.1)'; ctx.fillRect(0, 0, W, H); }
  if (final === 'cielo') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 60; k++) { const sx = ((k * 137.5) % 1) * W, sy = ((t * (30 + (k % 7) * 8) + k * 41) % (H + 40)) - 20; ctx.fillStyle = `rgba(255,${200 + (k % 3) * 20},120,${0.25 + (k % 5) * 0.08})`; ctx.fillRect(((sx + k * 53) % W), sy, 2, 4); } ctx.restore(); }
  if (ep.arde) { brasas(t, 40); if (i < 2) figura('aun_saar', tl, W / 2, H * 0.5, 1); }
  if (i === lineas.length - 1) { const g = ctx.createRadialGradient(W * 0.72, H * 0.2, 0, W * 0.72, H * 0.2, 40 + Math.sin(t * 6) * 4); const k = Math.min(1, tl / 1.2); const c = ep.arde ? '255,90,20' : final === 'cielo' ? '255,220,140' : '160,190,230'; g.addColorStop(0, `rgba(255,230,190,${k})`); g.addColorStop(0.3, `rgba(${c},${0.6 * k})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  marcoCine(TT(lineas[i]), tl, dur);
  return false;
}

/**
 * Después del epílogo: volver a empezar con todo lo tuyo (Nueva Partida+) o quedarte en este mundo.
 * Devuelve 'empezar', 'quedarse' o null mientras decide.
 */
export function dibujarCiclo(t: number, d: DatosHeroe): 'empezar' | 'quedarse' | null {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  brasas(t, 60, true);
  const k = Math.min(1, t / 1.5);
  texto(T('La rueda vuelve a girar', 'The wheel turns again'), W / 2, H * 0.24, { alin: 'center', tam: 30, color: `rgba(240,200,140,${k})`, fuente: TITULO });
  const lin = [
    ['La sed no muere. Solo duerme hasta que alguien vuelve a cantar de noche.', 'Thirst does not die. It only sleeps until someone sings at night again.'],
    ['Puedes bajar otra vez a Velmora con todo lo que ganaste: tu nivel, tus armas, tu bolsa, tu oro, tu baúl y Thor.', 'You can descend to Velmora again with everything you earned: your level, your weapons, your pack, your gold, your chest and Thor.'],
    ['La historia empieza de nuevo, los monstruos son más duros y el botín, mejor.', 'The story starts over, the monsters are harder and the loot is better.'],
  ] as [string, string][];
  lin.forEach((l, i) => texto(TT(l), W / 2, H * 0.34 + i * 26, { alin: 'center', tam: 14, color: `rgba(200,180,150,${Math.min(1, Math.max(0, t - 0.6 - i * 0.5))})` }));
  if (t < 2) return null;
  let r: 'empezar' | 'quedarse' | null = null;
  if (boton(T('Volver a empezar: ', 'Start over: ') + TT(siguienteCiclo(d)), W / 2 - 160, H * 0.56, 320, 42, { tam: 16, color: '#ff8060' })) r = 'empezar';
  if (boton(T('Quedarme en este mundo', 'Stay in this world'), W / 2 - 160, H * 0.56 + 56, 320, 34, { tam: 14 })) r = 'quedarse';
  texto(T('Siempre puedes volver a empezar desde la lista de héroes.', 'You can always start over from the hero list.'), W / 2, H * 0.56 + 112, { alin: 'center', tam: 12, color: '#7a6a50' });
  return r;
}
