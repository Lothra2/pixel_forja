// Piezas comunes de la interfaz: texto, marcos de piedra y latón, botones, íconos de objetos y tooltips.
import { ctx, E } from '../nucleo/lienzo';
import { objetoMeta, dibujar } from '../motor/assets';
import { baseDe, colorObj, textoStat, type Objeto } from '../juego/objetos';
import { reqNivel } from '../juego/heroe';
import { CONJUNTOS } from '../datos/objetos_datos';
import type { Raster } from '../../../src/engine/core/raster';
import { iconoObjeto3D, iconoDeLoot, iconoDeArma } from '../../../src/engine/gotico/iconos3d';
import { aLoot, arma3dDe } from './loot';
import { iconoArma3D } from '../../../src/engine/gotico/hud';

export let IDI: 0 | 1 = 0;
export const fijarIdioma = (i: 0 | 1) => { IDI = i; };
export const T = (es: string, en: string) => (IDI ? en : es);
export const TT = (p: [string, string]) => p[IDI];

export const FUENTE = 'Georgia, "Times New Roman", serif';
export const TITULO = '"Cinzel", Georgia, serif';
export function texto(s: string, x: number, y: number, o: { color?: string; tam?: number; alin?: CanvasTextAlign; fuente?: string; sombra?: boolean; negrita?: boolean; max?: number } = {}) {
  ctx.font = `${o.negrita ? 'bold ' : ''}${o.tam ?? 13}px ${o.fuente ?? FUENTE}`;
  ctx.textAlign = o.alin ?? 'left'; ctx.textBaseline = 'alphabetic';
  if (o.sombra !== false) { ctx.fillStyle = '#000'; ctx.fillText(s, x + 1, y + 1, o.max); }
  ctx.fillStyle = o.color ?? '#d8c8a0'; ctx.fillText(s, x, y, o.max);
  ctx.textAlign = 'left';
}
export const ancho = (s: string, tam = 13, fuente = FUENTE) => { ctx.font = `${tam}px ${fuente}`; return ctx.measureText(s).width; };
export function envolver(s: string, max: number, tam = 13): string[] {
  const out: string[] = []; let linea = '';
  for (const p of s.split(' ')) { const t = linea ? linea + ' ' + p : p; if (ancho(t, tam) > max && linea) { out.push(linea); linea = p; } else linea = t; }
  if (linea) out.push(linea);
  return out;
}

/** Marco de piedra oscura con filete de hierro y latón. */
export function marco(x: number, y: number, w: number, h: number, alfa = 0.94) {
  ctx.save();
  ctx.globalAlpha = alfa;
  const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#16120f'); g.addColorStop(1, '#0b0908');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.strokeStyle = '#4a3f33'; ctx.lineWidth = 1; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
  ctx.strokeStyle = '#7a6236'; ctx.strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);
  for (const [cx, cy] of [[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]]) { ctx.fillStyle = '#c0a060'; ctx.fillRect(cx - 2, cy - 2, 4, 4); ctx.fillStyle = '#3a2a10'; ctx.fillRect(cx - 1, cy - 1, 2, 2); }
  ctx.restore();
}
export function titulo(s: string, x: number, y: number, w: number) {
  ctx.fillStyle = '#1e1813'; ctx.fillRect(x + 8, y + 8, w - 16, 24);
  ctx.strokeStyle = '#5a4a30'; ctx.strokeRect(x + 8.5, y + 8.5, w - 17, 23);
  texto(s, x + w / 2, y + 26, { tam: 16, alin: 'center', color: '#e0c890', fuente: TITULO });
}
export const dentro = (x: number, y: number, w: number, h: number) => E.x >= x && E.y >= y && E.x < x + w && E.y < y + h;
/** Botón: devuelve true si se hizo clic. */
export function boton(s: string, x: number, y: number, w: number, h: number, o: { activo?: boolean; tam?: number; color?: string } = {}): boolean {
  const encima = dentro(x, y, w, h) && o.activo !== false;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, encima ? '#4a3a26' : '#2a221a'); g.addColorStop(1, encima ? '#2a2016' : '#14100c');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#000'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.strokeStyle = encima ? '#c0a060' : '#6a5838'; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  texto(s, x + w / 2, y + h / 2 + (o.tam ?? 14) * 0.35, { tam: o.tam ?? 14, alin: 'center', color: o.activo === false ? '#6a6050' : o.color ?? (encima ? '#ffe8b0' : '#d8c8a0'), fuente: TITULO });
  return encima && E.clicIzq;
}

// ------------------------------------------------------------------ raster del motor a canvas
const cacheR = new Map<string, HTMLCanvasElement>();
export function rasterACanvas(r: Raster): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = r.w; c.height = r.h;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(r.data), r.w, r.h), 0, 0);
  return c;
}
export function cacheRaster(k: string, f: () => Raster): HTMLCanvasElement {
  let c = cacheR.get(k);
  if (!c) { c = rasterACanvas(f()); cacheR.set(k, c); if (cacheR.size > 400) cacheR.delete(cacheR.keys().next().value!); }
  return c;
}

// ------------------------------------------------------------------ íconos
const ENC: Record<string, string> = { fuego: '_fuego', frio: '_hielo', rayo: '_rayo', veneno: '_veneno', sombra: '_sombra', luz: '_sagrado', sangre: '_sangre' };
const GEMA_COLOR: Record<string, string> = { rubi: '#d02030', zafiro: '#2050d0', topacio: '#e0b020', esmeralda: '#20b040', amatista: '#9030c0', diamante: '#e8f0ff', calavera: '#d8d0c0' };
/** Dibuja el ícono de un objeto dentro de la caja (x, y, w, h). */
// íconos 3D de la Forja: tardan unos 200 ms cada uno, así que se pinta uno por vez y se guardan
const iconos3d = new Map<string, HTMLCanvasElement>();
let ultimoIcono = 0;
function desc3D(o: Objeto): any {
  const b = baseDe(o);
  if (b?.ranura === 'arma') { const a = arma3dDe(o); return a ? (iconoDeArma(a) ?? { arma: a }) : null; }
  try { return iconoDeLoot(aLoot(o)); } catch { return null; }
}
function icono3D(o: Objeto, x: number, y: number, w: number, h: number): boolean {
  const d = desc3D(o); if (!d) return false;
  const k = JSON.stringify(d) + '|' + Math.round(w) + '|' + Math.round(h);
  let c = iconos3d.get(k);
  if (!c) {
    const ahora = performance.now();
    if (ahora - ultimoIcono < 60) return false;
    try { c = rasterACanvas(d.arma ? iconoArma3D(d.arma, Math.round(w), Math.round(h)) : iconoObjeto3D(d, Math.round(w), Math.round(h))); } catch { c = undefined; }
    ultimoIcono = performance.now();
    if (!c) return false;
    iconos3d.set(k, c); if (iconos3d.size > 300) iconos3d.delete(iconos3d.keys().next().value!);
  }
  // las armas largas son finas (astas de 1 o 2 px): un contorno claro suave las hace legibles sobre la celda oscura
  if (d.arma || o.tipo === 'equipo' && baseDe(o)?.ranura === 'arma') { ctx.save(); ctx.shadowColor = 'rgba(255,225,170,0.75)'; ctx.shadowBlur = 3; ctx.drawImage(c, Math.round(x + (w - c.width) / 2), Math.round(y + (h - c.height) / 2)); ctx.shadowBlur = 0; ctx.globalAlpha = 0.6; ctx.drawImage(c, Math.round(x + (w - c.width) / 2), Math.round(y + (h - c.height) / 2)); ctx.restore(); return true; }
  ctx.drawImage(c, Math.round(x + (w - c.width) / 2), Math.round(y + (h - c.height) / 2));
  return true;
}
/** Ícono horneado de la Forja para el equipo de Thor (collar animado, barda fija). */
export function iconoThor(o: Objeto, x: number, y: number, w: number, h: number, t = 0): boolean {
  const m = objetoMeta(o.base === 'thor_collar' ? 'thor_icono_collar' : 'thor_icono_barda', 'icono'); if (!m || !m.f.length) return false;
  const q = m.f[Math.floor((t * 25) / (m.t ?? 3)) % m.f.length]; if (!q) return false;
  const k = Math.min((w - 4) / q.w, (h - 4) / q.h, 2);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (o.tramo === 5 || o.rareza === 'legendario') { ctx.globalAlpha = 0.35 + Math.sin(t * 3) * 0.1; ctx.fillStyle = '#ffb040'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2); ctx.globalAlpha = 1; }
  const ok = dibujar(ctx, q, x + w / 2 - (q.w / 2 - q.ax) * k, y + h / 2 - (q.h / 2 - q.ay) * k, k);
  if (o.tramo) { ctx.font = `bold 9px ${TITULO}`; ctx.fillStyle = '#ffd890'; ctx.textAlign = 'right'; ctx.fillText(['', 'I', 'II', 'III', 'IV', 'V'][o.tramo], x + w - 3, y + h - 3); }
  ctx.restore(); return ok;
}
export function icono(o: Objeto, x: number, y: number, w: number, h: number, t = 0) {
  if (o.tipo === 'thor' && iconoThor(o, x, y, w, h, t)) return;
  if (icono3D(o, x, y, w, h)) return;
  const b = baseDe(o);
  const cx = x + w / 2, cy = y + h / 2;
  ctx.save();
  if (o.tipo === 'pocion') {
    const col = o.pocion === 'vida' ? '#c01818' : o.pocion === 'mana' ? '#2040c0' : '#8020a0';
    const r = 5 + (o.tam ?? 0) * 0.6;
    ctx.fillStyle = '#8a8070'; ctx.fillRect(cx - 2, cy - r - 6, 4, 5); ctx.fillStyle = '#5a3a20'; ctx.fillRect(cx - 2, cy - r - 8, 4, 2);
    ctx.fillStyle = 'rgba(200,220,230,0.35)'; ctx.beginPath(); ctx.arc(cx, cy + 1, r + 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy + 2, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(cx - r / 2, cy - 1, 2, 2);
    ctx.restore(); return;
  }
  if (o.tipo === 'gema') {
    const k = Object.keys(GEMA_COLOR).find((g) => o.base.startsWith(g)) ?? 'rubi';
    if (k === 'calavera') { ctx.fillStyle = '#d8d0c0'; ctx.beginPath(); ctx.arc(cx, cy - 1, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(cx - 4, cy + 3, 8, 4); ctx.fillStyle = '#000'; ctx.fillRect(cx - 4, cy - 2, 3, 3); ctx.fillRect(cx + 1, cy - 2, 3, 3); ctx.restore(); return; }
    ctx.fillStyle = GEMA_COLOR[k]; ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 7, cy - 2); ctx.lineTo(cx, cy + 8); ctx.lineTo(cx - 7, cy - 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 3, cy - 2); ctx.lineTo(cx - 3, cy - 2); ctx.closePath(); ctx.fill();
    ctx.restore(); return;
  }
  if (o.tipo === 'runa') {
    ctx.fillStyle = '#4a4440'; ctx.beginPath(); ctx.ellipse(cx, cy, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffa040'; ctx.lineWidth = 1.5; const s = o.base.length; ctx.beginPath(); ctx.moveTo(cx - 3, cy - 6); ctx.lineTo(cx + (s % 3) * 2, cy); ctx.lineTo(cx - 3, cy + 6); ctx.moveTo(cx + 3, cy - 5); ctx.lineTo(cx + 3, cy + 5); ctx.stroke();
    ctx.restore(); return;
  }
  if (o.tipo === 'pergamino') {
    ctx.fillStyle = '#c8b890'; ctx.fillRect(cx - 7, cy - 5, 14, 10); ctx.fillStyle = '#8a7a5a'; ctx.fillRect(cx - 8, cy - 6, 2, 12); ctx.fillRect(cx + 6, cy - 6, 2, 12);
    ctx.fillStyle = '#4060c0'; ctx.fillRect(cx - 3, cy - 2, 6, 4); ctx.restore(); return;
  }
  // armas: el arma del arsenal del motor, flotando
  if (b?.arma && b.arma !== 'puno') {
    const meta = objetoMeta(`arma_${b.arma}${o.vivo ? ENC[o.vivo] ?? '' : ''}`, 'flota') ?? objetoMeta(`arma_${b.arma}`, 'flota');
    if (meta && meta.f.length) {
      const q = meta.f[o.vivo ? Math.floor(t * 12) % meta.f.length : 0];
      const k = Math.min((w - 2) / q.w, (h - 2) / q.h, 2.2);
      ctx.imageSmoothingEnabled = false;
      dibujar(ctx, q, cx - (q.w / 2 - q.ax) * k, cy - (q.h / 2 - q.ay) * k, k);
      ctx.restore(); return;
    }
  }
  // armaduras y joyas: dibujadas según el tipo y el material de la pieza
  const fam = b?.familia ?? '';
  const vis = JSON.stringify(b?.visual ?? {});
  const oro = /oro/.test(vis), osc = /oscura|negro|negra/.test(vis), hueso = /hueso/.test(vis);
  const metal = /placa|hierro|acero|bronce|malla|oro/.test(vis);
  const tela = /tela|vestido|tunica|capucha|turbante/.test(vis) && !metal;
  const tono = oro ? ['#5a3a10', '#c8962e', '#ffe8a0'] : hueso ? ['#4a4232', '#b0a585', '#efe6cc'] : osc ? ['#121318', '#3c4048', '#8c939c'] : metal ? ['#2a2e34', '#7c8590', '#dfe6ee'] : tela ? (/roja/.test(vis) ? ['#2a0808', '#7a1e1a', '#c05040'] : /azul/.test(vis) ? ['#0a1028', '#283b64', '#6a86c0'] : /verde/.test(vis) ? ['#0a1a0a', '#2a462c', '#6a9a60'] : /morada/.test(vis) ? ['#1a0a24', '#482b5c', '#9070b0'] : ['#1a1510', '#5a4a38', '#a89880']) : ['#1e120a', '#6e472a', '#b08a60'];
  const grad = () => { const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, tono[2]); g.addColorStop(0.45, tono[1]); g.addColorStop(1, tono[0]); return g; };
  ctx.lineJoin = 'round'; ctx.lineWidth = 1.2; ctx.strokeStyle = '#050403';
  const forma = (path: () => void, brillo = true) => { ctx.beginPath(); path(); ctx.fillStyle = grad(); ctx.fill(); ctx.stroke(); if (brillo && (metal || oro)) { ctx.save(); ctx.clip(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w * 0.3, h); ctx.restore(); } };
  const remaches = (pts: [number, number][]) => { if (!metal) return; for (const [a, c] of pts) { ctx.fillStyle = tono[2]; ctx.fillRect(a - 1, c - 1, 2, 2); } };
  const costura = (x0: number, y0: number, x1: number, y1: number) => { if (metal) return; ctx.save(); ctx.setLineDash([2, 2]); ctx.strokeStyle = tono[2]; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore(); };
  const W2 = w * 0.5, H2 = h * 0.5;
  if (b?.ranura === 'torso') {
    forma(() => { ctx.moveTo(cx - W2 * 0.82, cy - H2 * 0.62); ctx.quadraticCurveTo(cx - W2 * 0.4, cy - H2 * 0.86, cx - W2 * 0.26, cy - H2 * 0.82); ctx.quadraticCurveTo(cx, cy - H2 * 0.55, cx + W2 * 0.26, cy - H2 * 0.82); ctx.quadraticCurveTo(cx + W2 * 0.4, cy - H2 * 0.86, cx + W2 * 0.82, cy - H2 * 0.62); ctx.lineTo(cx + W2 * 0.86, cy - H2 * 0.1); ctx.lineTo(cx + W2 * 0.56, cy - H2 * 0.14); ctx.lineTo(cx + W2 * 0.6, cy + H2 * 0.84); ctx.lineTo(cx - W2 * 0.6, cy + H2 * 0.84); ctx.lineTo(cx - W2 * 0.56, cy - H2 * 0.14); ctx.lineTo(cx - W2 * 0.86, cy - H2 * 0.1); ctx.closePath(); });
    if (/malla/.test(vis)) { ctx.save(); ctx.globalAlpha = 0.3; ctx.strokeStyle = '#000'; for (let k = -h; k < h; k += 4) { ctx.beginPath(); ctx.moveTo(cx - W2 * 0.5, cy + k * 0.3); ctx.lineTo(cx + W2 * 0.5, cy + k * 0.3 + 2); ctx.stroke(); } ctx.restore(); }
    if (/placas/.test(vis)) { ctx.strokeStyle = tono[0]; for (const k of [0.1, 0.35, 0.6]) { ctx.beginPath(); ctx.moveTo(cx - W2 * 0.55, cy + H2 * k); ctx.quadraticCurveTo(cx, cy + H2 * (k + 0.12), cx + W2 * 0.55, cy + H2 * k); ctx.stroke(); } remaches([[cx - W2 * 0.5, cy - H2 * 0.4], [cx + W2 * 0.5, cy - H2 * 0.4]]); }
    costura(cx, cy - H2 * 0.6, cx, cy + H2 * 0.8);
    ctx.fillStyle = tono[0]; ctx.fillRect(cx - W2 * 0.6, cy + H2 * 0.32, W2 * 1.2, 3);
  } else if (b?.ranura === 'cabeza') {
    const tipo = (b.visual as any).cabeza?.tipo ?? 'casco';
    if (tipo === 'capucha' || tipo === 'turbante') forma(() => { ctx.moveTo(cx - W2 * 0.7, cy + H2 * 0.7); ctx.quadraticCurveTo(cx - W2 * 0.9, cy - H2 * 0.6, cx, cy - H2 * 0.8); ctx.quadraticCurveTo(cx + W2 * 0.9, cy - H2 * 0.6, cx + W2 * 0.7, cy + H2 * 0.7); ctx.lineTo(cx + W2 * 0.35, cy + H2 * 0.3); ctx.quadraticCurveTo(cx, cy - H2 * 0.3, cx - W2 * 0.35, cy + H2 * 0.3); ctx.closePath(); }, false);
    else if (tipo === 'corona' || tipo === 'diadema' || tipo === 'aro') { forma(() => { ctx.moveTo(cx - W2 * 0.75, cy + H2 * 0.3); for (let k = 0; k <= 4; k++) { const xx = cx - W2 * 0.75 + (k * W2 * 1.5) / 4; ctx.lineTo(xx, cy - H2 * (k % 2 ? 0.1 : 0.6)); } ctx.lineTo(cx + W2 * 0.75, cy + H2 * 0.3); ctx.closePath(); }); ctx.fillStyle = '#c03040'; ctx.fillRect(cx - 2, cy - 2, 4, 4); }
    else if (tipo === 'cuernos') { forma(() => { ctx.arc(cx, cy + H2 * 0.2, W2 * 0.6, Math.PI, 0); ctx.lineTo(cx + W2 * 0.6, cy + H2 * 0.5); ctx.lineTo(cx - W2 * 0.6, cy + H2 * 0.5); ctx.closePath(); }); ctx.fillStyle = '#d8ccb0'; for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sg * W2 * 0.5, cy - H2 * 0.1); ctx.quadraticCurveTo(cx + sg * W2 * 1.0, cy - H2 * 0.3, cx + sg * W2 * 0.8, cy - H2 * 0.9); ctx.lineTo(cx + sg * W2 * 0.4, cy - H2 * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
    else { forma(() => { ctx.moveTo(cx - W2 * 0.68, cy + H2 * 0.6); ctx.lineTo(cx - W2 * 0.7, cy - H2 * 0.05); ctx.quadraticCurveTo(cx - W2 * 0.66, cy - H2 * 0.8, cx, cy - H2 * 0.82); ctx.quadraticCurveTo(cx + W2 * 0.66, cy - H2 * 0.8, cx + W2 * 0.7, cy - H2 * 0.05); ctx.lineTo(cx + W2 * 0.68, cy + H2 * 0.6); ctx.closePath(); }); if (tipo === 'yelmo' || tipo === 'gran_yelmo' || tipo === 'mascara') { ctx.fillStyle = '#000'; ctx.fillRect(cx - W2 * 0.5, cy - H2 * 0.08, W2, 3); ctx.fillRect(cx - 1, cy - H2 * 0.08, 2, H2 * 0.5); } else { ctx.strokeStyle = tono[0]; ctx.beginPath(); ctx.moveTo(cx, cy - H2 * 0.8); ctx.lineTo(cx, cy + H2 * 0.2); ctx.stroke(); } remaches([[cx - W2 * 0.55, cy + H2 * 0.4], [cx + W2 * 0.55, cy + H2 * 0.4]]); }
  } else if (b?.ranura === 'izq' && fam === 'orbe') { const g = ctx.createRadialGradient(cx - 4, cy - 4, 1, cx, cy, W2 * 0.7); g.addColorStop(0, '#f0e0ff'); g.addColorStop(0.4, '#8050d0'); g.addColorStop(1, '#180830'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, W2 * 0.65, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  else if (b?.ranura === 'izq' && fam === 'libro') { forma(() => ctx.rect(cx - W2 * 0.6, cy - H2 * 0.75, W2 * 1.2, H2 * 1.5), false); ctx.fillStyle = '#d8c8a0'; ctx.fillRect(cx + W2 * 0.45, cy - H2 * 0.7, 3, H2 * 1.4); ctx.strokeStyle = '#c0a040'; ctx.strokeRect(cx - W2 * 0.35, cy - H2 * 0.35, W2 * 0.7, H2 * 0.5); }
  else if (b?.ranura === 'izq') {
    const t2 = (b.visual as any).izq?.tipo ?? 'escudo_redondo';
    if (t2 === 'escudo_redondo' || t2 === 'rodela') forma(() => ctx.ellipse(cx, cy, W2 * 0.82, H2 * 0.82, 0, 0, Math.PI * 2));
    else if (t2 === 'escudo_torre') forma(() => ctx.rect(cx - W2 * 0.7, cy - H2 * 0.85, W2 * 1.4, H2 * 1.7));
    else forma(() => { ctx.moveTo(cx - W2 * 0.8, cy - H2 * 0.8); ctx.lineTo(cx + W2 * 0.8, cy - H2 * 0.8); ctx.lineTo(cx + W2 * 0.7, cy + H2 * 0.1); ctx.quadraticCurveTo(cx + W2 * 0.4, cy + H2 * 0.7, cx, cy + H2 * 0.9); ctx.quadraticCurveTo(cx - W2 * 0.4, cy + H2 * 0.7, cx - W2 * 0.7, cy + H2 * 0.1); ctx.closePath(); });
    if (t2 === 'escudo_calavera') { ctx.fillStyle = '#e0d8c0'; ctx.beginPath(); ctx.arc(cx, cy - 2, W2 * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#000'; ctx.fillRect(cx - 5, cy - 4, 3, 3); ctx.fillRect(cx + 2, cy - 4, 3, 3); }
    else { ctx.fillStyle = tono[2]; ctx.beginPath(); ctx.arc(cx, cy - 2, W2 * 0.18, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    remaches([[cx - W2 * 0.6, cy - H2 * 0.6], [cx + W2 * 0.6, cy - H2 * 0.6], [cx, cy + H2 * 0.6]]);
  } else if (b?.ranura === 'manos') {
    for (const sg of [-1, 1]) forma(() => { const ox = cx + sg * W2 * 0.42; ctx.moveTo(ox - W2 * 0.3, cy + H2 * 0.8); ctx.lineTo(ox - W2 * 0.32, cy - H2 * 0.1); ctx.lineTo(ox - W2 * 0.36, cy - H2 * 0.75); ctx.lineTo(ox - W2 * 0.14, cy - H2 * 0.82); ctx.lineTo(ox + W2 * 0.08, cy - H2 * 0.8); ctx.lineTo(ox + W2 * 0.3, cy - H2 * 0.6); ctx.lineTo(ox + W2 * 0.4, cy - H2 * 0.15); ctx.lineTo(ox + W2 * 0.3, cy + H2 * 0.8); ctx.closePath(); });
    ctx.fillStyle = tono[0]; ctx.fillRect(cx - W2 * 0.8, cy + H2 * 0.4, W2 * 1.6, 2);
  } else if (b?.ranura === 'pies') {
    for (const sg of [-1, 1]) forma(() => { const ox = cx + sg * W2 * 0.42; ctx.moveTo(ox - W2 * 0.25, cy - H2 * 0.85); ctx.lineTo(ox + W2 * 0.2, cy - H2 * 0.85); ctx.lineTo(ox + W2 * 0.22, cy + H2 * 0.35); ctx.lineTo(ox + W2 * 0.48, cy + H2 * 0.55); ctx.lineTo(ox + W2 * 0.48, cy + H2 * 0.82); ctx.lineTo(ox - W2 * 0.28, cy + H2 * 0.82); ctx.closePath(); });
    ctx.fillStyle = tono[0]; ctx.fillRect(cx - W2 * 0.9, cy + H2 * 0.7, W2 * 1.9, 2);
  } else if (b?.ranura === 'cinturon') { forma(() => ctx.rect(x + 2, cy - 5, w - 4, 10), false); const hb = /oro/.test(vis) ? '#e0b040' : '#a0a8b0'; ctx.strokeStyle = hb; ctx.lineWidth = 2; ctx.strokeRect(cx - 5, cy - 6, 10, 12); ctx.lineWidth = 1; for (let k = x + 6; k < x + w - 6; k += 6) { ctx.fillStyle = tono[2]; ctx.fillRect(k, cy - 1, 1, 2); } }
  else if (b?.ranura === 'anillo') { ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx, cy + 2, 6, 5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = '#d0a040'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = o.rareza === 'normal' ? '#c03030' : colorObj(o); ctx.beginPath(); ctx.arc(cx, cy - 4, 3, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke(); }
  else if (b?.ranura === 'amuleto') { ctx.strokeStyle = '#a08040'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - 7, cy - 9); ctx.quadraticCurveTo(cx, cy, cx + 7, cy - 9); ctx.stroke(); ctx.fillStyle = '#d0a040'; ctx.beginPath(); ctx.moveTo(cx, cy - 2); ctx.lineTo(cx + 6, cy + 4); ctx.lineTo(cx, cy + 10); ctx.lineTo(cx - 6, cy + 4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = o.rareza === 'normal' ? '#3060c0' : colorObj(o); ctx.fillRect(cx - 2, cy + 2, 4, 4); }
  else forma(() => ctx.rect(cx - 6, cy - 6, 12, 12));
  ctx.restore();
}

// ------------------------------------------------------------------ tooltip de objeto
export function lineasObjeto(o: Objeto, h?: { nivel: number; fue: number; des: number; clase: string; conjuntos?: Record<string, number> }): [string, string][] {
  const b = baseDe(o);
  const out: [string, string][] = [];
  out.push([TT(o.nombre), colorObj(o)]);
  if (o.rareza === 'raro' || o.rareza === 'unico' || o.rareza === 'legendario' || o.rareza === 'conjunto') if (b) out.push([TT(b.nombre), colorObj(o)]);
  if (o.rareza === 'legendario') out.push([T('Legendario', 'Legendary'), '#ff8a20']);
  if (o.vivo) out.push([T(`Arma viva: ${({ fuego: 'arde', frio: 'congela', rayo: 'chispea', veneno: 'supura', sombra: 'devora la luz', luz: 'resplandece', sangre: 'sangra', fisico: '' } as any)[o.vivo]}`, `Living weapon: ${({ fuego: 'burns', frio: 'freezes', rayo: 'sparks', veneno: 'festers', sombra: 'eats the light', luz: 'shines', sangre: 'bleeds', fisico: '' } as any)[o.vivo]}`), '#ffb060']);
  if (o.tipo === 'pocion') out.push([T('Clic derecho o 1-4 para beber', 'Right click or 1-4 to drink'), '#a0a0a0']);
  if (o.tipo === 'gema' || o.tipo === 'runa') out.push([T('Se engarza en un objeto con huecos', 'Can be socketed into an item'), '#a0a0a0']);
  if (o.base === 'pergamino_olvido') out.push([T('Clic derecho: reinicia tus habilidades y atributos', 'Right click: resets your skills and attributes'), '#c8a060']);
  else if (o.tipo === 'pergamino') out.push([T('Clic derecho: abre un portal al campamento', 'Right click: opens a portal to camp'), '#a0a0a0']);
  if (o.tipo === 'thor') {
    out.push([T('Equipo de Thor', 'Thor\'s gear'), '#9ec8ff']);
    if (o.tramo) out.push([T(`Armadura de tramo ${o.tramo}: más vida y menos daño recibido`, `Tier ${o.tramo} armor: more life and less damage taken`), '#e8e0d0']);
    const NOM: Record<string, [string, string]> = { thor_dano: ['% de daño de Thor', '% Thor damage'], thor_vida: ['% de vida de Thor', '% Thor life'], thor_vel: ['% de velocidad de Thor', '% Thor speed'] };
    for (const [k, v] of o.stats) if (NOM[k]) out.push([`+${v}${T(NOM[k][0], NOM[k][1])}`, '#8080ff']);
    out.push([T('Clic derecho: se lo pones a Thor', 'Right click: put it on Thor'), '#a0a0a0']);
    return out;
  }
  if (o.dano) out.push([`${b?.dosManos ? T('Daño a dos manos', 'Two-hand damage') : T('Daño', 'Damage')}: ${o.dano[0]} ${T('a', 'to')} ${o.dano[1]}`, '#e8e0d0']);
  if (o.def) out.push([`${T('Defensa', 'Defense')}: ${o.def}`, '#e8e0d0']);
  if (b?.bloqueo) out.push([`${T('Bloqueo', 'Block')}: ${b.bloqueo}%`, '#e8e0d0']);
  if (o.durabMax > 0 && !o.stats.some((s) => s[0] === 'durabilidad_infinita')) out.push([`${T('Durabilidad', 'Durability')}: ${Math.ceil(o.durab)} ${T('de', 'of')} ${o.durabMax}`, o.durab <= 0 ? '#ff4040' : '#e8e0d0']);
  if (b) {
    const rn = Math.max(b.req.nivel ?? 1, reqNivel(o));
    if (b.clase) out.push([`(${T('Solo', 'Only')} ${b.clase})`, h && h.clase !== b.clase ? '#ff4040' : '#e8e0d0']);
    if (b.req.fue) out.push([`${T('Fuerza necesaria', 'Required Strength')}: ${b.req.fue}`, h && h.fue < b.req.fue ? '#ff4040' : '#e8e0d0']);
    if (b.req.des) out.push([`${T('Destreza necesaria', 'Required Dexterity')}: ${b.req.des}`, h && h.des < b.req.des ? '#ff4040' : '#e8e0d0']);
    if (rn > 1) out.push([T(`Requiere nivel ${rn}`, `Requires level ${rn}`), h && h.nivel < rn ? '#ff4040' : '#e8e0d0']);
  }
  const agrup = new Map<string, number>();
  for (const [s, v] of o.stats) agrup.set(s, (agrup.get(s) ?? 0) + v);
  for (const [s, v] of agrup) if (s !== 'dano_min' && s !== 'dano_max' || true) out.push([textoStat(s, v, IDI), '#7c94ff']);
  if (o.huecos) out.push([`${T('Huecos', 'Sockets')} (${o.engarces.length}/${o.huecos})`, '#a0a0a0']);
  // conjunto: su nombre y sus bonos (en verde los que ya da)
  const cj = o.conjunto ? CONJUNTOS.find((c) => c.id === o.conjunto) : undefined;
  if (cj) {
    const n = h?.conjuntos?.[cj.id] ?? 0;
    out.push([`${TT(cj.nombre)} (${n}/${cj.piezas.length})`, '#40d040']);
    for (const bn of cj.bonos) out.push([`${bn.piezas} ${T('piezas', 'pieces')}: ${bn.stats.map((st) => textoStat(st.stat, st.max, IDI)).join(', ')}`, n >= bn.piezas ? '#40d040' : '#707070']);
  }
  if (o.lore) for (const l of envolver(TT(o.lore), 260, 12)) out.push([l, '#b09060']);
  return out;
}
export function tooltip(lineas: [string, string][], x: number, y: number, extra?: [string, string][]) {
  const todas = extra ? [...lineas, ['', '#000'] as [string, string], ...extra] : lineas;
  let w = 0; for (const [s] of todas) w = Math.max(w, ancho(s, 13));
  w += 24; const h = todas.length * 16 + 12;
  let tx = x - w / 2, ty = y - h - 10;
  if (ty < 4) ty = y + 30;
  tx = Math.max(4, Math.min(ctx.canvas.width - w - 4, tx)); ty = Math.max(4, Math.min(ctx.canvas.height - h - 4, ty));
  ctx.fillStyle = 'rgba(6,5,4,0.92)'; ctx.fillRect(tx, ty, w, h);
  ctx.strokeStyle = '#5a4a30'; ctx.strokeRect(tx + 0.5, ty + 0.5, w - 1, h - 1);
  todas.forEach(([s, c], i) => texto(s, tx + w / 2, ty + 20 + i * 16, { color: c, alin: 'center', tam: 13 }));
}
