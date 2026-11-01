// Fuera del juego: intro, menú principal, elegir y crear héroe, opciones y pantalla de carga.
import { ctx, W, H, E } from '../nucleo/lienzo';
import { texto, T, TT, IDI, boton, marco, dentro, envolver, TITULO, fijarIdioma } from './comun';
import { cuadrosHeroe, cuadrosPiso, objetoMeta, dibujar, dibujarTenido, cuadrosMonstruo, type Cuadro } from '../motor/assets';
import { generarPaisaje, type MapaGotico } from '../../../src/engine/gotico/index';
import { CLASES } from '../datos/clases';
import { INTRO } from '../mundo/actos';
import type { DatosHeroe } from '../juego/heroe';
import { R, rng } from '../nucleo/azar';
import { Sonido } from '../audio/sonido';

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
/** El título que se enciende. k de 0 a 1. */
export function logo(x: number, y: number, k: number, t: number, tam = 54) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `${Math.round(tam * 0.32)}px ${TITULO}`; ctx.fillStyle = `rgba(160,120,70,${k})`; ctx.fillText('LEGADO GG', x, y - tam * 0.85);
  ctx.font = `bold ${tam}px ${TITULO}`;
  const s = IDI ? 'THE MARK OF ASH' : 'LA MARCA DE CENIZA';
  const g = ctx.createLinearGradient(0, y - tam, 0, y);
  g.addColorStop(0, `rgba(255,${200 + Math.sin(t * 3) * 30},120,${k})`); g.addColorStop(0.5, `rgba(255,110,30,${k})`); g.addColorStop(1, `rgba(120,20,10,${k})`);
  ctx.shadowColor = `rgba(255,90,20,${0.8 * k})`; ctx.shadowBlur = 18 + Math.sin(t * 5) * 6;
  ctx.fillStyle = '#000'; ctx.fillText(s, x + 3, y + 3);
  ctx.fillStyle = g; ctx.fillText(s, x, y);
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ------------------------------------------------------------------ intro
const TOMAS: { dur: number; dibujar: (t: number, k: number) => void }[] = [];
let tomasListas = false;
function armarTomas() {
  if (tomasListas) return; tomasListas = true;
  const T0 = (dur: number, f: (t: number, k: number) => void) => TOMAS.push({ dur, dibujar: f });
  // 1: el valle
  T0(7, (t) => { const m = escena('bosque', 5).mapa; pintarMapa(m, 30 + t * 14, 300 + t * 4, t, undefined, 1.8); oscuridad(0.18); lluvia(t, 0.5); });
  // 2: la abadía con monjes encapuchados
  T0(7, (t) => { const m = escena('catedral', 2).mapa; const aP = pintarMapa(m, -40 + t * 10, 330 - t * 6, t, (aP) => [0, 1, 2].map((i) => { const [x, y] = aP(9 + i * 3, 12); return { prof: 21 + i * 3, draw: () => dibujar(ctx, cuadrosMonstruo('cultista', 'quieto', 's')[Math.floor(t * 5) % 4], x, y) }; }), 1.8); void aP; oscuridad(0.55, [[W * 0.3, H * 0.5, 160], [W * 0.7, H * 0.45, 160]]); });
  // 3: el voto
  T0(6, (t) => { const m = escena('catedral', 7).mapa; pintarMapa(m, 60 - t * 6, 340, t, undefined, 1.8); oscuridad(0.72, [[W / 2, H / 2, 200]]); });
  // 4-5: el cielo se abre y la brasa cae
  T0(10, (t) => {
    ctx.fillStyle = '#05040a'; ctx.fillRect(0, 0, W, H);
    const r = rng(3); for (let i = 0; i < 160; i++) { ctx.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`; ctx.fillRect(r() * W, r() * H * 0.8, 1, 1); }
    if (t > 1.5) { const k = Math.min(1, (t - 1.5) / 1.5); ctx.strokeStyle = `rgba(255,120,40,${0.5 * k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W * 0.62, 0); for (let i = 0; i < 6; i++) ctx.lineTo(W * 0.62 + Math.sin(i * 7) * 20, H * 0.05 * i * k); ctx.stroke(); }
    if (t > 3) {
      const u = Math.min(1, (t - 3) / 6), x = W * (0.62 - u * 0.2), y = H * (0.05 + u * 0.75);
      for (let i = 0; i < 30; i++) { const v = i / 30; ctx.fillStyle = `rgba(255,${100 + v * 100},40,${(1 - v) * 0.6})`; ctx.beginPath(); ctx.arc(x + v * 40 * 0.3, y - v * 120 * Math.max(0.2, u), 6 * (1 - v) + 1, 0, Math.PI * 2); ctx.fill(); }
      const g = ctx.createRadialGradient(x, y, 0, x, y, 70); g.addColorStop(0, 'rgba(255,220,140,1)'); g.addColorStop(0.2, 'rgba(255,120,30,0.8)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - 70, y - 70, 140, 140);
    }
    // silueta del valle
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H * 0.82 - Math.sin(x * 0.01) * 30 - Math.sin(x * 0.033) * 12); ctx.lineTo(W, H); ctx.fill();
    ctx.fillRect(W * 0.38, H * 0.62, 30, H * 0.2); ctx.beginPath(); ctx.moveTo(W * 0.37, H * 0.62); ctx.lineTo(W * 0.38 + 15, H * 0.52); ctx.lineTo(W * 0.4 + 16, H * 0.62); ctx.fill();
  });
  // 6: el claustro y la brasa en el piso; campanas
  T0(7, (t) => { const m = escena('catedral', 11).mapa; pintarMapa(m, 0, 300 + t * 3, t, undefined, 1.8); oscuridad(0.7, [[W / 2, H * 0.55, 220 + Math.sin(t * 9) * 10]]); const g = ctx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, 40); g.addColorStop(0, 'rgba(255,220,120,1)'); g.addColorStop(0.3, 'rgba(255,100,20,0.8)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(W / 2 - 40, H * 0.55 - 40, 80, 80); if (Math.floor(t * 0.7) !== Math.floor((t - 1 / 60) * 0.7)) Sonido.efecto('campana', { vol: 0.8 }); });
  // 7: los muertos se levantan
  T0(8, (t) => { const m = escena('cementerio', 4).mapa; pintarMapa(m, 20 + t * 6, 320, t, (aP) => [[8, 10], [13, 9], [16, 14], [10, 15]].map(([x, y], i) => { const [px, py] = aP(x, y); const fs = cuadrosMonstruo('zombi', t > 2 + i ? 'caminar' : 'morir', 's'); const f = t > 2 + i ? Math.floor(t * 8) % 8 : Math.max(0, 7 - Math.floor((t - i * 0.5) * 4)); return { prof: x + y, draw: () => dibujar(ctx, fs[Math.max(0, Math.min(fs.length - 1, f))], px, py) }; }), 1.8); oscuridad(0.6); lluvia(t, 0.6); });
  // 8: los sobrevivientes
  T0(7, (t) => { const m = escena('campamento', 6).mapa; pintarMapa(m, 60 - t * 8, 380, t, undefined, 1.8); oscuridad(0.5, [[W / 2, H / 2, 260]]); brasas(t, 25); });
  // 9: tú
  T0(8, (t) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    CLASES.forEach((c, i) => { const fs = cuadrosHeroe(c.id, 'quieto', 's'); const q = fs[Math.floor(t * 6 + i) % Math.max(1, fs.length)]; const x = W / 2 + (i - 3.5) * 82, y = H * 0.68; const k = Math.min(1, Math.max(0, (t - i * 0.25) / 1.5)); ctx.globalAlpha = k; dibujarTenido(ctx, q, x, y, '#000', 0.55, 1.2); ctx.globalAlpha = 1; });
    const g = ctx.createRadialGradient(W / 2, H * 0.75, 0, W / 2, H * 0.75, 260); g.addColorStop(0, 'rgba(255,100,30,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    brasas(t, 50);
  });
  // título
  T0(7, (t) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); brasas(t, 70); logo(W / 2, H / 2, Math.min(1, t / 3), t, Math.min(64, W / 14)); });
}
export function introDuracion() { armarTomas(); return TOMAS.reduce((s, x) => s + x.dur, 0); }
/** Devuelve true cuando terminó. */
export function dibujarIntro(t: number): boolean {
  armarTomas();
  let acc = 0, i = 0;
  while (i < TOMAS.length && t > acc + TOMAS[i].dur) { acc += TOMAS[i].dur; i++; }
  if (i >= TOMAS.length) return true;
  const tl = t - acc, tm = TOMAS[i];
  tm.dibujar(tl, tl / tm.dur);
  vineta();
  // fundidos
  const f = Math.min(1, tl / 1.2, (tm.dur - tl) / 1.2);
  ctx.fillStyle = `rgba(0,0,0,${1 - Math.max(0, f)})`; ctx.fillRect(0, 0, W, H);
  // la voz (texto)
  const linea = INTRO[i];
  if (linea && i < INTRO.length) {
    const k = Math.min(1, Math.max(0, (tl - 0.8) / 1.2), Math.max(0, (tm.dur - tl - 0.4) / 1));
    ctx.globalAlpha = k;
    envolver(TT(linea), Math.min(720, W - 80), 20).forEach((l, n) => texto(l, W / 2, H - 90 + n * 26, { alin: 'center', tam: 20, color: '#e8dcc0', fuente: TITULO }));
    ctx.globalAlpha = 1;
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
    const fs = cuadrosHeroe(hr.clase, 'quieto', 's'); if (fs.length) dibujar(ctx, fs[Math.floor(t * 6) % fs.length], bx + 140, by + 30, 2);
    if (boton(T('Jugar', 'Play'), bx + 40, by + 80, 200, 38, { tam: 16 })) accion = 'jugar';
    if ((hr.actosHechos ?? []).includes(5) && (hr.dificultad ?? 0) < 2 && boton(hr.dificultad ? T('Bajar al Infierno', 'Descend into Hell') : T('Empezar Pesadilla', 'Begin Nightmare'), bx + 40, by + 268, 200, 30, { tam: 13, color: '#ff8060' })) accion = 'dificultad';
    if (boton((window as any).__borrar === hr.id ? T('¿Seguro? Clic otra vez', 'Sure? Click again') : T('Borrar', 'Delete'), bx + 40, by + 128, 200, 30, { tam: 13, color: (window as any).__borrar === hr.id ? '#ff6060' : undefined })) accion = 'borrar';
  }
  if (boton(T('Crear héroe nuevo', 'Create new hero'), bx + 40, by + 178, 200, 34, { tam: 14 })) accion = 'crear';
  if (boton(T('Volver', 'Back'), bx + 40, by + 222, 200, 30, { tam: 13 })) accion = 'volver';
  return { accion, sel };
}

// ------------------------------------------------------------------ crear héroe: las ocho clases alrededor del fuego
export function dibujarCrear(t: number, sel: number | null): { accion: 'crear' | 'volver' | null; sel: number | null } {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.5;
  // fogata
  const fog = objetoMeta('camp_fogata', 'grande');
  const pisoF = cuadrosPiso('tierra', 1); for (let i = -2; i <= 2; i++) for (let k = -2; k <= 2; k++) { const px = cx + (i - k) * 80, py = cy + (i + k) * 40; if (pisoF[0]) dibujar(ctx, pisoF[0], px, py); }
  let accion: 'crear' | 'volver' | null = null;
  const pos = CLASES.map((_, i) => { const a = Math.PI * 0.95 + (i / (CLASES.length - 1)) * Math.PI * 1.1; return [cx + Math.cos(a) * W * 0.36, cy - 20 + Math.sin(a) * H * 0.22 + 60] as [number, number]; });
  const orden = CLASES.map((c, i) => ({ c, i, y: pos[i][1] })).sort((a, b) => a.y - b.y);
  if (fog) dibujar(ctx, fog.f[Math.floor(t * 25 / fog.t) % fog.f.length], cx, cy + 60);
  let enc: number | null = null;
  for (const { c, i } of orden) {
    const [x, y] = pos[i];
    const dir = sel === i ? 's' : ((Math.atan2(cy + 60 - y, cx - x) * 180) / Math.PI);
    const dn = typeof dir === 'string' ? dir : (['se', 's', 'so', 'o', 'no', 'n', 'ne', 'e'])[Math.round(((dir % 360) + 360) % 360 / 45) % 8];
    const acc = sel === i ? 'atacar' : 'quieto';
    const fs = cuadrosHeroe(c.id, acc, dn);
    const q: Cuadro | undefined = fs[acc === 'atacar' ? Math.floor(t * 10) % fs.length : Math.floor(t * 6) % Math.max(1, fs.length)];
    const sobre = dentro(x - 30, y - 90, 60, 100);
    if (sobre) enc = i;
    ctx.globalAlpha = sobre || sel === i ? 1 : 0.75;
    if (q) dibujar(ctx, q, x, y, 1.15);
    ctx.globalAlpha = 1;
    texto(TT(c.nombre), x, y + 22, { alin: 'center', tam: 13, color: sel === i ? '#ffd080' : sobre ? '#fff' : '#a09070', fuente: TITULO });
    if (sobre && E.clicIzq) { sel = i; E.clicIzq = false; Sonido.efecto('click'); }
  }
  // luz del fuego
  ctx.save(); const g = ctx.createRadialGradient(cx, cy + 40, 30, cx, cy + 40, Math.max(W, H) * 0.6); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0.95)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter'; const g2 = ctx.createRadialGradient(cx, cy + 40, 0, cx, cy + 40, 260 + Math.sin(t * 8) * 8); g2.addColorStop(0, 'rgba(255,120,40,0.35)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H); ctx.restore();
  brasas(t, 30);
  texto(T('Elige a tu héroe', 'Choose your hero'), W / 2, 34, { alin: 'center', tam: 22, color: '#e0c890', fuente: TITULO });
  const ver = enc ?? sel;
  if (ver !== null) {
    const c = CLASES[ver];
    const w = Math.min(520, W - 40), x = W / 2 - w / 2, y = H - 150;
    marco(x, y, w, 120, 0.9);
    texto(TT(c.nombre), x + 16, y + 26, { tam: 18, color: '#ffd080', fuente: TITULO });
    envolver(TT(c.descripcion), w - 32, 13).forEach((l, n) => texto(l, x + 16, y + 46 + n * 16, { tam: 13 }));
    envolver(TT(c.historia), w - 32, 12).slice(0, 2).forEach((l, n) => texto(l, x + 16, y + 82 + n * 15, { tam: 12, color: '#a09070' }));
    texto(`${T('Fue', 'Str')} ${c.base.fue} · ${T('Des', 'Dex')} ${c.base.des} · ${T('Vit', 'Vit')} ${c.base.vit} · ${T('Ene', 'Ene')} ${c.base.ene}`, x + w - 16, y + 26, { alin: 'right', tam: 12, color: '#c0b090' });
  }
  const inp = document.getElementById('nombre') as HTMLInputElement;
  if (sel !== null) {
    const r = (document.getElementById('juego') as HTMLCanvasElement).getBoundingClientRect();
    const k = r.width / W;
    inp.style.display = 'block'; inp.style.left = `${r.left + (W / 2 - 110) * k}px`; inp.style.top = `${r.top + 56 * k}px`; inp.style.width = `${220 * k - 16}px`; inp.placeholder = T('Nombre del héroe', 'Hero name');
    if (boton(T('Crear', 'Create'), W / 2 + 120, 54, 90, 30, { activo: inp.value.trim().length > 0 }) && inp.value.trim()) accion = 'crear';
  } else inp.style.display = 'none';
  if (boton(T('Volver', 'Back'), 16, 16, 90, 30, { tam: 13 })) accion = 'volver';
  return { accion, sel };
}

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
