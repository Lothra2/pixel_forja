// HUD táctil (teléfono y tablet): se dibuja en vez de la barra de PC cuando la entrada es táctil.
//   Arriba a la izquierda: orbes de vida y maná con su número, el recurso de la clase y la misión en curso.
//   Arriba a la derecha: cinco botones (personaje, bolsa, habilidades, mapa, menú) y el minimapa redondo debajo.
//   Abajo a la derecha: Golpe grande en la esquina, un arco con Poder y tres atajos, y el interruptor Agresivo / Calmo.
//   Abajo al centro: el cinturón de pociones y la experiencia en una línea fina.
//   Abajo a la izquierda: un joystick que aparece donde apoyas el pulgar.
// Todo en tamaños de dedo (44 pt o más), lejos de los bordes laterales (notch e isla) y respetando el área segura.
import { ctx, W, H, E, ESCALA, SEGURO } from '../nucleo/lienzo';
import { texto, T, TT, dentro, icono, envolver as envolverT, TITULO } from './comun';
import { ui, alternar, glifoHab, orbeHud, recursoClase, objetivoTxt, COLOR_POCION, cambiarAgresivo } from './juego_ui';
import { hud, type Rect } from './hud_rects';
import { MISIONES } from '../mundo/actos';
import { habilidadDe, costoMana, usarPocion, caminarA, type Juego } from '../juego/mundo';
import type { Habilidad } from '../datos/clases';
import { cant, nivelHab, tiposCinturon, xpPara } from '../juego/heroe';
import { aPant, aMundo } from '../render/escena';
import { Sonido } from '../audio/sonido';

/** Puntos de pantalla a píxeles del lienzo. */
const L = (pt: number) => pt / Math.max(0.1, ESCALA);
const CLAVES = ['cartel', 'orbes', 'rastreo', 'botones', 'mini', 'golpe', 'poder', 'hab1', 'hab2', 'hab3', 'agresivo', 'cinturon', 'xp', 'jefe'];
/** Los objetivos de toque de este cuadro, para la auditoría (cada uno debe medir 44 pt o más). */
export const toques: { id: string; r: Rect }[] = [];
let joy: { x0: number; y0: number; activo: boolean; repath: number } | null = null;
let miniOculto = false;
let cartel: { txt: [string, string]; t0: number } | null = null;
/** Muestra un consejo en el cartel centrado (en táctil los consejos no van a la lista de mensajes). */
export function consejoTactil(txt: [string, string]) { cartel = { txt, t0: performance.now() }; }

/** Márgenes en píxeles del lienzo: 50 pt a los lados en horizontal (notch e isla) y el área segura arriba y abajo. */
function margenes() {
  const apaisado = innerWidth > innerHeight;
  return { l: L(Math.max(SEGURO.l, apaisado ? 50 : 12)), r: L(Math.max(SEGURO.r, apaisado ? 50 : 12)), t: L(Math.max(SEGURO.t, 8)), b: L(Math.max(SEGURO.b, 8)) };
}

/** Dónde va cada pieza (la usan el dibujo, la barra del jefe, los mensajes y el minimapa). */
export function disposicion() {
  const m = margenes();
  const O = L(56), B = L(44), gap = L(6);
  const orbes: Rect = [m.l, m.t, O * 2 + gap, O + L(14)];
  const rastreo: Rect = [m.l, orbes[1] + orbes[3] + L(22), L(230), L(34)];
  const filaW = B * 5 + gap * 4;
  const botones: Rect = [W - m.r - filaW, m.t, filaW, B];
  const R = L(45);
  const mini: Rect = [botones[0], botones[1] + B + L(8), R * 2, R * 2];
  const G = L(76), S = L(52), A = L(44);
  const gx = W - m.r - G / 2, gy = H - m.b - L(10) - G / 2;
  // el arco: un cuarto de círculo de 110 pt alrededor de Golpe (180°, 150°, 120° y 90°); entre vecinos quedan unos 57 pt
  const rArco = L(110);
  const habs = [180, 210, 240, 270].map((a) => { const r = (a * Math.PI) / 180; return [gx + Math.cos(r) * rArco, gy + Math.sin(r) * rArco] as [number, number]; });
  const agresivo: Rect = [W - m.r - A, habs[3][1] - S / 2 - L(10) - A, A, A];
  const P = L(44), cw = P * 4 + gap * 3;
  // en vertical la pantalla es angosta: el cinturón va a la izquierda para no chocar con el arco
  const cinturon: Rect = [innerWidth > innerHeight ? W / 2 - cw / 2 : m.l, H - m.b - L(8) - P, cw, P];
  const xp: Rect = [m.l, H - m.b - L(4), W - m.l - m.r, L(3)];
  return { m, O, B, gap, orbes, rastreo, botones, mini, R, G, S, A, gx, gy, habs, agresivo, P, cinturon, xp };
}

const circ = (cx: number, cy: number, d: number): Rect => [cx - d / 2, cy - d / 2, d, d];
// ------------------------------------------------------------------ medallones de combate
/** El arma de cada clase para el botón Golpe (el ataque básico no tiene glifo propio) y el color de su vidrio. */
const ARMA_CLASE: Record<string, [string, string]> = {
  berserker: ['hacha', '#8a2a16'], templario: ['espada', '#8a6a24'], monje: ['puno', '#a06a1c'], cazadora: ['arco', '#3c6a2c'],
  druida: ['garra', '#3a6a3a'], nigromante: ['hueso', '#4a3a78'], arcanista: ['orbe', '#2c4c9a'], alquimista: ['frasco', '#2c7a6a'],
};
const aclarar = (hex: string, k: number) => { const n = parseInt(hex.slice(1), 16), f = (v: number) => Math.round(v + (255 - v) * k); return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`; };
const oscurecer = (hex: string, k: number) => { const n = parseInt(hex.slice(1), 16), f = (v: number) => Math.round(v * (1 - k)); return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`; };
/** Cuándo quedó lista cada habilidad (para el destello al terminar la recarga). */
const listaDesde = new Map<string, number>(), enRecarga = new Set<string>();
interface Med { id?: string; hb?: Habilidad; apagado?: boolean; etiqueta?: string; apretado?: boolean; principal?: boolean; recarga?: number; segundos?: number; falta?: number }
/**
 * Un botón de combate como pieza de orfebrería: aro de bronce labrado (muescas, y remaches en el principal), ranura
 * oscura, vidrio engastado del color de la habilidad con su brillo arriba, y el glifo con resplandor. La recarga se lee
 * en el aro (un arco que se va llenando) y sobre el vidrio oscurecido van los segundos. Al quedar lista, un destello.
 * Sin habilidad es un engaste vacío. Todo es círculo: nada de cuadros adentro.
 */
function medallon(cx: number, cy: number, d: number, o: Med = {}) {
  const ahora = performance.now();
  ctx.save();
  if (o.apretado) { ctx.translate(cx, cy); ctx.scale(0.94, 0.94); ctx.translate(-cx, -cy); }
  const r = d / 2, aro = Math.max(4, d * (o.principal ? 0.085 : 0.075)), ri = r - 1 - aro - 1.5;
  // sombra que lo despega del mundo
  { const g = ctx.createRadialGradient(cx, cy + d * 0.05, r * 0.7, cx, cy + d * 0.05, r * 1.22); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy + d * 0.05, r * 1.22, 0, Math.PI * 2); ctx.fill(); }
  if (!o.hb) {
    // engaste vacío: aro fino, vidrio apagado y una cruz
    ctx.fillStyle = 'rgba(10,8,6,0.55)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a08050'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(cx, cy, r - aro, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = o.apretado ? 0.9 : 0.5; ctx.strokeStyle = '#c8a868'; ctx.lineWidth = Math.max(1.5, d * 0.028); ctx.lineCap = 'round'; const q = r * 0.2;
    ctx.beginPath(); ctx.moveTo(cx - q, cy); ctx.lineTo(cx + q, cy); ctx.moveTo(cx, cy - q); ctx.lineTo(cx, cy + q); ctx.stroke();
    ctx.restore(); return;
  }
  const col = o.apagado ? '#3a3a3e' : o.hb.color;
  // aro de bronce: luz arriba, sombra abajo
  ctx.fillStyle = '#0a0705'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  { const g = ctx.createLinearGradient(cx - r * 0.4, cy - r, cx + r * 0.4, cy + r); g.addColorStop(0, o.apretado ? '#fff0c4' : '#f0d49a'); g.addColorStop(0.3, '#c09a5a'); g.addColorStop(0.62, '#7a5a30'); g.addColorStop(1, '#3e2c16'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, Math.PI * 2); ctx.fill(); }
  // muescas labradas en el aro y remaches en los cuatro puntos del principal
  ctx.strokeStyle = 'rgba(30,18,6,0.55)'; ctx.lineWidth = 1;
  const nm = o.principal ? 32 : 20;
  ctx.beginPath(); for (let q = 0; q < nm; q++) { const a = (q / nm) * Math.PI * 2 + 0.1, c = Math.cos(a), sn = Math.sin(a); ctx.moveTo(cx + c * (r - 2.2), cy + sn * (r - 2.2)); ctx.lineTo(cx + c * (r - aro + 0.6), cy + sn * (r - aro + 0.6)); } ctx.stroke();
  if (o.principal) for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + Math.PI / 4, x = cx + Math.cos(a) * (r - 1 - aro / 2), y = cy + Math.sin(a) * (r - 1 - aro / 2), rr = aro * 0.36; ctx.fillStyle = '#2a1a0a'; ctx.beginPath(); ctx.arc(x, y + 0.6, rr + 0.8, 0, Math.PI * 2); ctx.fill(); const g = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.4, 0, x, y, rr); g.addColorStop(0, '#fff4d0'); g.addColorStop(1, '#a8823e'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill(); }
  // filo exterior (lo que define el tamaño del botón) y ranura donde asienta el vidrio
  ctx.strokeStyle = '#a08050'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#080604'; ctx.beginPath(); ctx.arc(cx, cy, ri + 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,236,190,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, ri + 1.9, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  // recarga en el aro: lo que ya se cargó, en claro, desde arriba y en sentido horario
  const rec = Math.max(0, Math.min(1, o.recarga ?? 0));
  if (rec > 0) { ctx.strokeStyle = 'rgba(8,6,4,0.72)'; ctx.lineWidth = aro - 1; ctx.beginPath(); ctx.arc(cx, cy, r - 1 - aro / 2, -Math.PI / 2 + (1 - rec) * Math.PI * 2, -Math.PI / 2 + Math.PI * 2); ctx.stroke(); }
  // el vidrio
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, ri, 0, Math.PI * 2); ctx.clip();
  { const g = ctx.createRadialGradient(cx - ri * 0.25, cy - ri * 0.3, ri * 0.05, cx, cy, ri * 1.05); g.addColorStop(0, aclarar(col, 0.22)); g.addColorStop(0.45, col); g.addColorStop(0.85, oscurecer(col, 0.6)); g.addColorStop(1, oscurecer(col, 0.82)); ctx.fillStyle = g; ctx.fillRect(cx - ri, cy - ri, ri * 2, ri * 2); }
  // el glifo: sombra abajo y resplandor del color de la habilidad
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 0; ctx.shadowOffsetY = Math.max(1, d * 0.025); ctx.globalAlpha = 0.55; glifoHab(o.hb, cx, cy, ri * 1.9, true); ctx.restore();
  ctx.save(); if (!o.apagado) { ctx.shadowColor = aclarar(col, 0.55); ctx.shadowBlur = d * 0.16; } glifoHab(o.hb, cx, cy, ri * 1.9, !!o.apagado); ctx.restore();
  // volumen: sombra interior en el borde y brillo de vidrio arriba
  { const g = ctx.createRadialGradient(cx, cy, ri * 0.62, cx, cy, ri); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)'); ctx.fillStyle = g; ctx.fillRect(cx - ri, cy - ri, ri * 2, ri * 2); }
  { const g = ctx.createLinearGradient(0, cy - ri, 0, cy - ri * 0.1); g.addColorStop(0, 'rgba(255,246,224,0.3)'); g.addColorStop(1, 'rgba(255,246,224,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy - ri * 0.52, ri * 0.74, ri * 0.42, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,240,210,0.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, ri - 1.5, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
  // estados sobre el vidrio
  if (rec > 0) { ctx.fillStyle = 'rgba(4,3,2,0.66)'; ctx.fillRect(cx - ri, cy - ri, ri * 2, ri * 2); }
  if (o.falta) { ctx.fillStyle = 'rgba(6,14,70,0.6)'; ctx.fillRect(cx - ri, cy - ri, ri * 2, ri * 2); }
  if (o.apretado) { ctx.fillStyle = 'rgba(255,232,180,0.2)'; ctx.fillRect(cx - ri, cy - ri, ri * 2, ri * 2); }
  ctx.restore();
  if (rec > 0 && o.segundos !== undefined) texto(o.segundos >= 9.5 ? String(Math.round(o.segundos)) : o.segundos.toFixed(1), cx, cy + d * 0.09, { alin: 'center', tam: Math.round(d * 0.3), color: '#f4e6c0', fuente: TITULO });
  else if (o.falta) texto(String(Math.ceil(o.falta)), cx, cy + d * 0.09, { alin: 'center', tam: Math.round(d * 0.28), color: '#a8c0ff', fuente: TITULO });
  // destello al quedar lista
  if (o.id) {
    if (rec > 0) enRecarga.add(o.id); else if (enRecarga.delete(o.id)) listaDesde.set(o.id, ahora);
    const e = (ahora - (listaDesde.get(o.id) ?? -1e9)) / 420;
    if (e < 1) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,226,160,${(1 - e) * 0.9})`; ctx.lineWidth = 2 + (1 - e) * 3; ctx.beginPath(); ctx.arc(cx, cy, r + e * d * 0.22, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = `rgba(255,236,190,${(1 - e) * 0.35})`; ctx.beginPath(); ctx.arc(cx, cy, ri, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  }
  // el nombre: una plaquita que monta sobre el borde de abajo
  if (o.etiqueta) {
    const tam = Math.max(8, Math.round(d * (o.principal ? 0.13 : 0.15))); ctx.font = `${tam}px ${TITULO}`;
    const tw = Math.min(d * 0.95, ctx.measureText(o.etiqueta).width + tam * 1.1), th = tam + 5, x = cx - tw / 2, y = cy + r - th * 0.62, rr = th / 2;
    ctx.beginPath(); ctx.moveTo(x + rr, y); ctx.lineTo(x + tw - rr, y); ctx.arc(x + tw - rr, y + rr, rr, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x + rr, y + th); ctx.arc(x + rr, y + rr, rr, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
    ctx.fillStyle = 'rgba(10,7,5,0.94)'; ctx.fill(); ctx.strokeStyle = 'rgba(200,164,100,0.85)'; ctx.lineWidth = 1; ctx.stroke();
    texto(o.etiqueta, cx, y + th - 4, { alin: 'center', tam, color: '#f0dfb4', fuente: TITULO, max: tw - 6 });
  }
  ctx.restore();
}
/** El riel que une el arco de habilidades con Golpe: una banda tenue con dos filos, para que lean como una sola pieza. */
function rielArco(gx: number, gy: number, radio: number, ancho: number, rG: number) {
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(6,4,3,0.42)'; ctx.lineWidth = ancho; ctx.beginPath(); ctx.arc(gx, gy, radio, Math.PI, Math.PI * 1.5); ctx.stroke();
  ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(200,164,100,0.22)'; ctx.lineWidth = 1;
  for (const q of [-ancho / 2, ancho / 2]) { ctx.beginPath(); ctx.arc(gx, gy, radio + q, Math.PI * 1.02, Math.PI * 1.48); ctx.stroke(); }
  // halo de Golpe
  ctx.strokeStyle = 'rgba(200,164,100,0.2)'; ctx.beginPath(); ctx.arc(gx, gy, rG + 5, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
function boton(id: string, r: Rect, dibujo: (apretado: boolean) => void, accion: () => void, redondo = false, sinFondo = false) {
  // los redondos se tocan en su círculo; para los encimados cuenta el cuadrado inscrito (las esquinas de la caja están vacías)
  const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2, ins = r[2] * 0.7071;
  hud[id] = redondo ? [cx - ins / 2, cy - ins / 2, ins, ins] : r; toques.push({ id, r });
  const enc = redondo ? Math.hypot(E.x - cx, E.y - cy) <= r[2] / 2 : dentro(r[0], r[1], r[2], r[3]);
  if (sinFondo) { dibujo(enc && E.izq); if (enc) { ui.sobreUI = true; if (E.clicIzq) { E.clicIzq = false; accion(); } } return; }
  ctx.save(); ctx.globalAlpha = 0.82;
  ctx.fillStyle = enc && E.izq ? '#3a2a18' : '#14100c';
  ctx.beginPath(); if (redondo) ctx.arc(r[0] + r[2] / 2, r[1] + r[3] / 2, r[2] / 2, 0, Math.PI * 2); else ctx.rect(r[0], r[1], r[2], r[3]); ctx.fill();
  ctx.globalAlpha = 1; ctx.strokeStyle = '#a08050'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  dibujo(enc && E.izq);
  if (enc) { ui.sobreUI = true; if (E.clicIzq) { E.clicIzq = false; accion(); } }
}
/** Iconos simples de los botones de arriba. */
function glifo(tipo: string, r: Rect) {
  const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2, s = r[2] * 0.3;
  ctx.save(); ctx.strokeStyle = '#e0c890'; ctx.fillStyle = '#e0c890'; ctx.lineWidth = Math.max(2, s * 0.18); ctx.lineCap = 'round';
  ctx.beginPath();
  if (tipo === 'pers') { ctx.arc(cx, cy - s * 0.45, s * 0.42, 0, Math.PI * 2); ctx.moveTo(cx - s * 0.85, cy + s); ctx.quadraticCurveTo(cx, cy - s * 0.1, cx + s * 0.85, cy + s); }
  else if (tipo === 'inv') { ctx.rect(cx - s * 0.8, cy - s * 0.35, s * 1.6, s * 1.25); ctx.moveTo(cx - s * 0.4, cy - s * 0.35); ctx.quadraticCurveTo(cx, cy - s * 1.1, cx + s * 0.4, cy - s * 0.35); }
  else if (tipo === 'habs') { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5; const x = cx + Math.cos(a) * s, y = cy + Math.sin(a) * s; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath(); }
  else if (tipo === 'mapa') { ctx.moveTo(cx - s, cy - s * 0.7); ctx.lineTo(cx - s * 0.33, cy - s); ctx.lineTo(cx + s * 0.33, cy - s * 0.7); ctx.lineTo(cx + s, cy - s); ctx.lineTo(cx + s, cy + s * 0.7); ctx.lineTo(cx + s * 0.33, cy + s); ctx.lineTo(cx - s * 0.33, cy + s * 0.7); ctx.lineTo(cx - s, cy + s); ctx.closePath(); ctx.moveTo(cx - s * 0.33, cy - s); ctx.lineTo(cx - s * 0.33, cy + s * 0.7); ctx.moveTo(cx + s * 0.33, cy - s * 0.7); ctx.lineTo(cx + s * 0.33, cy + s); }
  else { for (const dy of [-0.6, 0, 0.6]) { ctx.moveTo(cx - s * 0.8, cy + dy * s); ctx.lineTo(cx + s * 0.8, cy + dy * s); } }
  ctx.stroke(); ctx.restore();
}

/** Las habilidades del arco: Poder primero y después los atajos que no repitan. */
function habsArco(j: Juego): (string | null)[] {
  const d = j.heroe.d, out: (string | null)[] = [d.der];
  for (const id of d.atajos) { if (out.length >= 4) break; if (id && !out.includes(id)) out.push(id); }
  while (out.length < 4) out.push(null);
  return out;
}

export function dibujarHudTactil(j: Juego, t: number) {
  for (const k of CLAVES) delete hud[k];
  toques.length = 0;
  // con un panel abierto no se dibuja nada encima (los paneles tienen su X y se cierran tocando fuera)
  if (ui.izq || ui.der) { joy = null; return; }
  const h = j.heroe, d = h.d, P = disposicion(), f = Math.floor(t * 8) % 8;

  // ---------------- arriba a la izquierda: orbes, recurso y misión
  {
    const [x, y] = P.orbes;
    orbeHud(h.veneno > 0 ? 'veneno' : h.frio > 0 ? 'helado' : 'vida', h.vida / h.vidaMax, x, y, P.O, f);
    orbeHud('mana', h.mana / Math.max(1, h.c.manaMax), x + P.O + P.gap, y, P.O, f);
    const tn = Math.round(L(12));
    texto(`${Math.ceil(h.vida)}`, x + P.O / 2, y + P.O + L(12), { alin: 'center', tam: tn, color: '#ff9080' });
    texto(`${Math.floor(h.mana)}`, x + P.O * 1.5 + P.gap, y + P.O + L(12), { alin: 'center', tam: tn, color: '#90a8ff' });
    hud.orbes = P.orbes;
    recursoClase(j, x, P.orbes[1] + P.orbes[3] + L(4), P.orbes[2] + L(60));
    const m = MISIONES.find((q) => q.acto === d.acto && !q.lateral && (d.misiones[q.id] ?? 0) >= 1 && (d.misiones[q.id] ?? 0) < 3);
    if (m) {
      const e = d.misiones[m.id];
      const linea = e === 2 ? T('Vuelve al campamento', 'Return to camp') : objetivoTxt(m, d);
      const [rx, ry, rw, rh] = P.rastreo;
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(rx, ry, rw, rh); ctx.restore();
      texto(TT(m.nombre), rx + L(6), ry + L(13), { tam: Math.round(L(11)), color: '#ffd080', max: rw - L(10) });
      texto(linea, rx + L(6), ry + L(28), { tam: Math.round(L(10)), color: e === 2 ? '#80ff80' : '#d8c8a0', max: rw - L(10) });
      hud.rastreo = P.rastreo;
    }
  }

  // ---------------- arriba a la derecha: cinco botones y el minimapa
  {
    const ids: [string, () => void][] = [['pers', () => alternar('pers', 'izq')], ['inv', () => alternar('inv', 'der')], ['habs', () => alternar('habs', 'der')], ['mapa', () => { ui.mapa = !ui.mapa; }], ['menu', () => alternar('menu', 'izq')]];
    ids.forEach(([id, acc], i) => { const r: Rect = [P.botones[0] + i * (P.B + P.gap), P.botones[1], P.B, P.B]; boton('btn_' + id, r, () => glifo(id, r), () => { acc(); Sonido.efecto('click'); }); delete hud['btn_' + id]; });
    hud.botones = P.botones;
    if (d.puntosAtrib > 0 || d.puntosHab > 0) for (const [i, ok] of [[0, d.puntosAtrib > 0], [2, d.puntosHab > 0]] as [number, boolean][]) if (ok) { ctx.fillStyle = Math.floor(t * 2) % 2 ? '#ffd060' : '#a07020'; ctx.fillRect(P.botones[0] + i * (P.B + P.gap) + P.B - L(10), P.botones[1] + L(2), L(8), L(8)); }
    // minimapa: tocarlo lo esconde y deja un botón para volver a mostrarlo
    const r = miniOculto ? circ(P.mini[0] + P.R, P.mini[1] + L(22), L(44)) : P.mini;
    hud.mini = r;
    if (miniOculto) { boton('mini', r, () => glifo('mapa', r), () => { miniOculto = false; }, true); }
    else { toques.push({ id: 'mini', r }); } if (!miniOculto && dentro(r[0], r[1], r[2], r[3])) { ui.sobreUI = true; if (E.clicIzq) { E.clicIzq = false; miniOculto = true; } }
  }

  // ---------------- abajo a la derecha: Golpe, el arco de habilidades y el interruptor
  {
    const hbI = habilidadDe(d.izq), arma = ARMA_CLASE[d.clase];
    // el ataque básico lleva el arma y el color de la clase
    const hbG = hbI.id === 'ataque' && arma ? ({ ...hbI, glifo: arma[0], color: arma[1] } as Habilidad) : hbI;
    const rG = circ(P.gx, P.gy, P.G);
    rielArco(P.gx, P.gy, Math.hypot(P.habs[0][0] - P.gx, P.habs[0][1] - P.gy), P.S * 0.56, P.G / 2);
    boton('golpe', rG, (ap) => medallon(P.gx, P.gy, P.G, { id: 'golpe', hb: hbG, etiqueta: T('Golpe', 'Hit'), apretado: ap, principal: true }), () => { (ui as any).tactilHab = 'izq'; }, true, true);
    habsArco(j).forEach((id, i) => {
      const [cx, cy] = P.habs[i], r = circ(cx, cy, P.S), clave = i === 0 ? 'poder' : 'hab' + i;
      if (!id) { boton(clave, r, (ap) => medallon(cx, cy, P.S, { apretado: ap }), () => alternar('habs', 'der'), true, true); return; }
      const hb = habilidadDe(id), n = hb.id === 'ataque' ? 1 : nivelHab(d, hb.id, h.c), costo = hb.id === 'ataque' ? 0 : costoMana(j, hb);
      const rc = h.recargas[hb.id] ?? 0;
      boton(clave, r, (ap) => medallon(cx, cy, P.S, { id: clave + hb.id, hb, apagado: n <= 0, etiqueta: i === 0 ? T('Poder', 'Skill') : undefined, apretado: ap, recarga: rc > 0 ? rc / (hb.recarga ?? 1) : 0, segundos: rc, falta: rc <= 0 && h.mana < costo ? costo : 0 }),
        () => { if (i === 0) (ui as any).tactilHab = 'der'; else (ui as any).tactilHabId = id; }, true, true);
    });
    // agresivo o calmo: el mismo medallón, espada sobre rojo si ataca solo, escudo sobre acero si espera tu orden
    const ag = !!(d as any).agresivo, r = P.agresivo;
    boton('agresivo', r, (ap) => medallon(r[0] + r[2] / 2, r[1] + r[3] / 2, r[2], { hb: { color: ag ? '#a02818' : '#3c4654', glifo: ag ? 'espada' : 'escudo' } as Habilidad, etiqueta: ag ? T('Agresivo', 'Aggressive') : T('Calmo', 'Calm'), apretado: ap }), () => cambiarAgresivo(j), true, true);
  }

  // ---------------- abajo al centro: cinturón y experiencia
  {
    const tipos = tiposCinturon(d);
    for (let i = 0; i < 4; i++) {
      const r: Rect = [P.cinturon[0] + i * (P.P + P.gap), P.cinturon[1], P.P, P.P], o = d.cinturon[i];
      boton('poc' + i, r, () => {
        if (o) { icono(o, r[0] + L(4), r[1] + L(4), r[2] - L(8), r[3] - L(8)); texto(String(cant(o)), r[0] + r[2] - L(4), r[1] + L(13), { alin: 'right', tam: Math.round(L(11)), color: '#fff' }); }
        else { ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = COLOR_POCION[tipos[i]]; ctx.beginPath(); ctx.arc(r[0] + r[2] / 2, r[1] + r[3] / 2, r[2] * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      }, () => { if (o) usarPocion(j, i); else Sonido.efecto('negado'); });
      delete hud['poc' + i];
    }
    hud.cinturon = P.cinturon;
    const x0 = xpPara(d.nivel), x1 = xpPara(d.nivel + 1), [xx, xy, xw, xh] = P.xp;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(xx, xy, xw, xh); ctx.fillStyle = '#c0a040'; ctx.fillRect(xx, xy, xw * Math.max(0, Math.min(1, (d.xp - x0) / Math.max(1, x1 - x0))), xh);
    hud.xp = P.xp;
  }

  // ---------------- el consejo de la primera vez: un cartel centrado que se cierra al tocarlo o a los 6 s
  if (cartel) {
    const ts = (performance.now() - cartel.t0) / 1000;
    if (ts > 6) { cartel = null; delete hud.cartel; }
    else {
      // abajo al centro, encima del cinturón y entre la zona del pulgar y el arco: no tapa al héroe ni la misión
      const izq = P.m.l, der = Math.min(...P.habs.map(([hx]) => hx)) - P.S / 2 - L(10);
      const tam = Math.round(L(13)), w = Math.min(L(360), der - izq), ls = TT(cartel.txt), lin = envolverT(ls, w - L(28), tam);
      const hgt = Math.max(L(44), lin.length * tam * 1.35 + L(22)), x = Math.max(izq, Math.min(W / 2 - w / 2, der - w)), y = P.cinturon[1] - L(12) - hgt;
      hud.cartel = [x, y, w, hgt];
      const a = Math.min(1, ts / 0.25, (6 - ts) / 0.5);
      ctx.save(); ctx.globalAlpha = 0.88 * a; ctx.fillStyle = '#100c08'; ctx.fillRect(x, y, w, hgt); ctx.globalAlpha = a; ctx.strokeStyle = '#a08050'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, hgt);
      lin.forEach((l, i) => texto(l, x + w / 2, y + L(14) + tam + i * tam * 1.35 - tam * 0.2, { alin: 'center', tam, color: '#e8dcc0' }));
      ctx.restore();
      if (dentro(x, y, w, hgt)) { ui.sobreUI = true; if (E.clicIzq) { E.clicIzq = false; cartel = null; delete hud.cartel; } }
    }
  }

  // ---------------- joystick: aparece donde apoyas el pulgar, abajo a la izquierda, fuera de los botones
  {
    const zona = (x: number, y: number) => x < W * 0.42 && y > H * 0.38 && !Object.values(hud).some((r) => dentro(r[0], r[1], r[2], r[3]) && x >= r[0] && x <= r[0] + r[2]);
    if (E.clicIzq && !ui.sobreUI && zona(E.x, E.y)) joy = { x0: E.x, y0: E.y, activo: false, repath: 0 };
    // al soltar no se clava: da el último medio paso frenando
    if (joy && !E.izq) { if (joy.activo && h.camino?.length) { const [cx, cy] = h.camino[0], l = Math.hypot(cx - h.x, cy - h.y) || 1, q = Math.min(0.45, l); h.camino = [[h.x + ((cx - h.x) / l) * q, h.y + ((cy - h.y) / l) * q]]; } joy = null; }
    if (joy) {
      const dx = E.x - joy.x0, dy = E.y - joy.y0, dd = Math.hypot(dx, dy), rad = L(48);
      if (!joy.activo && dd > L(14)) { joy.activo = true; h.objetivo = null; }
      if (joy.activo) {
        ui.sobreUI = true;
        joy.repath -= 1 / 60;
        if (joy.repath <= 0 && dd > L(8)) {
          joy.repath = 0.12;
          // la dirección en pantalla, llevada al mundo desde donde está el héroe
          // la palanca es analógica: el héroe va hacia donde apuntas, no solo en ocho rumbos
          const a = Math.atan2(dy, dx);
          const [hx, hy] = aPant(h.x, h.y);
          const [wx, wy] = aMundo(hx + Math.cos(a) * 140, hy + Math.sin(a) * 140);
          caminarA(j, wx, wy);
        }
        const k = Math.min(1, dd / rad), kx = joy.x0 + (dx / (dd || 1)) * rad * k, ky = joy.y0 + (dy / (dd || 1)) * rad * k;
        // la palanca habla el mismo idioma: base de vidrio oscuro con filo de bronce y cuatro marcas, y un pomo de bronce
        ctx.save();
        { const g = ctx.createRadialGradient(joy.x0, joy.y0, rad * 0.2, joy.x0, joy.y0, rad); g.addColorStop(0, 'rgba(0,0,0,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0.46)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(joy.x0, joy.y0, rad, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = 'rgba(160,128,80,0.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(joy.x0, joy.y0, rad, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(200,164,100,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(joy.x0, joy.y0, rad * 0.62, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(220,186,120,0.6)'; for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2; ctx.beginPath(); ctx.arc(joy.x0 + Math.cos(a) * rad * 0.82, joy.y0 + Math.sin(a) * rad * 0.82, 1.8, 0, Math.PI * 2); ctx.fill(); }
        const pr = L(21);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(kx, ky + 2, pr + 1, 0, Math.PI * 2); ctx.fill();
        { const g = ctx.createLinearGradient(kx - pr * 0.4, ky - pr, kx + pr * 0.4, ky + pr); g.addColorStop(0, '#f0d49a'); g.addColorStop(0.4, '#b08a4e'); g.addColorStop(1, '#3e2c16'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(kx, ky, pr, 0, Math.PI * 2); ctx.fill(); }
        { const g = ctx.createRadialGradient(kx - pr * 0.2, ky - pr * 0.25, 1, kx, ky, pr * 0.74); g.addColorStop(0, '#4a3a26'); g.addColorStop(1, '#120d08'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(kx, ky, pr * 0.74, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
    }
  }
}

/** Dónde poner la barra del jefe sin pisar los botones de arriba (en táctil). */
export function rectJefeTactil(w: number, h: number): Rect {
  const P = disposicion(), izq = P.orbes[0] + P.orbes[2] + L(10), der = P.botones[0] - L(10);
  const ancho = Math.min(w, der - izq), x = Math.max(izq, Math.min(W / 2 - ancho / 2, der - ancho));
  return [x, P.m.t, ancho, h * (ancho / w)];
}
/** El minimapa redondo (o null si está escondido). */
export const miniTactil = (): { cx: number; cy: number; r: number } | null => { if (miniOculto) return null; const P = disposicion(); return { cx: P.mini[0] + P.R, cy: P.mini[1] + P.R, r: P.R }; };
