// Piezas comunes de la interfaz: texto, marcos de piedra y latón, botones, íconos de objetos y tooltips.
import { ctx, E } from '../nucleo/lienzo';
import { objetoMeta, dibujar } from '../motor/assets';
import { baseDe, colorObj, textoStat, type Objeto } from '../juego/objetos';
import { reqNivel } from '../juego/heroe';
import type { Raster } from '../../../src/engine/core/raster';

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
export function icono(o: Objeto, x: number, y: number, w: number, h: number, t = 0) {
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
  // armaduras y joyas: dibujo simple con su color de material
  const fam = b?.familia ?? '';
  const metal = /placa|oro|hierro|acero|bronce/.test(JSON.stringify(b?.visual ?? {}));
  const oro = /oro/.test(JSON.stringify(b?.visual ?? {}));
  const c1 = oro ? '#c09030' : metal ? '#8a929c' : '#6a4a2c', c2 = oro ? '#f0d070' : metal ? '#c0c8d0' : '#9a7048';
  ctx.fillStyle = c1; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
  const fill = (path: () => void) => { ctx.beginPath(); path(); ctx.fill(); ctx.stroke(); };
  if (b?.ranura === 'torso') fill(() => { ctx.moveTo(cx - w * 0.38, cy - h * 0.38); ctx.lineTo(cx - w * 0.12, cy - h * 0.42); ctx.lineTo(cx, cy - h * 0.34); ctx.lineTo(cx + w * 0.12, cy - h * 0.42); ctx.lineTo(cx + w * 0.38, cy - h * 0.38); ctx.lineTo(cx + w * 0.3, cy + h * 0.4); ctx.lineTo(cx - w * 0.3, cy + h * 0.4); ctx.closePath(); });
  else if (b?.ranura === 'cabeza') fill(() => { ctx.arc(cx, cy + 2, w * 0.34, Math.PI, 0); ctx.lineTo(cx + w * 0.34, cy + h * 0.25); ctx.lineTo(cx - w * 0.34, cy + h * 0.25); ctx.closePath(); });
  else if (b?.ranura === 'izq' && fam === 'orbe') { ctx.fillStyle = '#6040c0'; fill(() => ctx.arc(cx, cy, w * 0.32, 0, Math.PI * 2)); }
  else if (b?.ranura === 'izq' && fam === 'libro') fill(() => ctx.rect(cx - w * 0.3, cy - h * 0.3, w * 0.6, h * 0.6));
  else if (b?.ranura === 'izq') fill(() => { ctx.moveTo(cx - w * 0.36, cy - h * 0.38); ctx.lineTo(cx + w * 0.36, cy - h * 0.38); ctx.lineTo(cx + w * 0.32, cy + h * 0.1); ctx.lineTo(cx, cy + h * 0.42); ctx.lineTo(cx - w * 0.32, cy + h * 0.1); ctx.closePath(); });
  else if (b?.ranura === 'manos') { fill(() => ctx.rect(cx - w * 0.3, cy - h * 0.1, w * 0.26, h * 0.4)); fill(() => ctx.rect(cx + w * 0.04, cy - h * 0.1, w * 0.26, h * 0.4)); fill(() => ctx.rect(cx - w * 0.32, cy - h * 0.34, w * 0.3, h * 0.26)); fill(() => ctx.rect(cx + w * 0.02, cy - h * 0.34, w * 0.3, h * 0.26)); }
  else if (b?.ranura === 'pies') { fill(() => { ctx.rect(cx - w * 0.34, cy - h * 0.36, w * 0.24, h * 0.56); }); fill(() => ctx.rect(cx + w * 0.06, cy - h * 0.36, w * 0.24, h * 0.56)); fill(() => ctx.rect(cx - w * 0.38, cy + h * 0.12, w * 0.34, h * 0.18)); fill(() => ctx.rect(cx + w * 0.02, cy + h * 0.12, w * 0.34, h * 0.18)); }
  else if (b?.ranura === 'cinturon') { fill(() => ctx.rect(x + 3, cy - 4, w - 6, 8)); ctx.fillStyle = c2; ctx.fillRect(cx - 4, cy - 5, 8, 10); }
  else if (b?.ranura === 'anillo') { ctx.strokeStyle = '#d0a040'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy + 2, 6, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = colorObj(o); ctx.fillRect(cx - 2, cy - 7, 5, 4); }
  else if (b?.ranura === 'amuleto') { ctx.strokeStyle = '#a08040'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy - 6, 6, 0, Math.PI); ctx.stroke(); ctx.fillStyle = '#d0a040'; ctx.beginPath(); ctx.arc(cx, cy + 4, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = colorObj(o); ctx.fillRect(cx - 2, cy + 2, 4, 4); }
  else fill(() => ctx.rect(cx - 6, cy - 6, 12, 12));
  if (b && b.ranura !== 'anillo' && b.ranura !== 'amuleto') { ctx.fillStyle = c2; ctx.globalAlpha = 0.4; ctx.fillRect(cx - w * 0.2, cy - h * 0.25, w * 0.1, h * 0.3); }
  ctx.restore();
}

// ------------------------------------------------------------------ tooltip de objeto
export function lineasObjeto(o: Objeto, h?: { nivel: number; fue: number; des: number; clase: string }): [string, string][] {
  const b = baseDe(o);
  const out: [string, string][] = [];
  out.push([TT(o.nombre), colorObj(o)]);
  if (o.rareza === 'raro' || o.rareza === 'unico' || o.rareza === 'legendario' || o.rareza === 'conjunto') if (b) out.push([TT(b.nombre), colorObj(o)]);
  if (o.rareza === 'legendario') out.push([T('Legendario', 'Legendary'), '#ff8a20']);
  if (o.vivo) out.push([T(`Arma viva: ${({ fuego: 'arde', frio: 'congela', rayo: 'chispea', veneno: 'supura', sombra: 'devora la luz', luz: 'resplandece', sangre: 'sangra', fisico: '' } as any)[o.vivo]}`, `Living weapon: ${({ fuego: 'burns', frio: 'freezes', rayo: 'sparks', veneno: 'festers', sombra: 'eats the light', luz: 'shines', sangre: 'bleeds', fisico: '' } as any)[o.vivo]}`), '#ffb060']);
  if (o.tipo === 'pocion') out.push([T('Clic derecho o 1-4 para beber', 'Right click or 1-4 to drink'), '#a0a0a0']);
  if (o.tipo === 'gema' || o.tipo === 'runa') out.push([T('Se engarza en un objeto con huecos', 'Can be socketed into an item'), '#a0a0a0']);
  if (o.tipo === 'pergamino') out.push([T('Clic derecho: abre un portal al campamento', 'Right click: opens a portal to camp'), '#a0a0a0']);
  if (o.dano) out.push([`${b?.dosManos ? T('Daño a dos manos', 'Two-hand damage') : T('Daño', 'Damage')}: ${o.dano[0]} ${T('a', 'to')} ${o.dano[1]}`, '#e8e0d0']);
  if (o.def) out.push([`${T('Defensa', 'Defense')}: ${o.def}`, '#e8e0d0']);
  if (b?.bloqueo) out.push([`${T('Bloqueo', 'Block')}: ${b.bloqueo}%`, '#e8e0d0']);
  if (o.durabMax > 0 && !o.stats.some((s) => s[0] === 'durabilidad_infinita')) out.push([`${T('Durabilidad', 'Durability')}: ${Math.ceil(o.durab)} ${T('de', 'of')} ${o.durabMax}`, o.durab <= 0 ? '#ff4040' : '#e8e0d0']);
  if (b) {
    const rn = Math.max(b.req.nivel ?? 1, reqNivel(o));
    if (b.clase) out.push([`(${T('Solo', 'Only')} ${b.clase})`, h && h.clase !== b.clase ? '#ff4040' : '#e8e0d0']);
    if (b.req.fue) out.push([`${T('Fuerza necesaria', 'Required Strength')}: ${b.req.fue}`, h && h.fue < b.req.fue ? '#ff4040' : '#e8e0d0']);
    if (b.req.des) out.push([`${T('Destreza necesaria', 'Required Dexterity')}: ${b.req.des}`, h && h.des < b.req.des ? '#ff4040' : '#e8e0d0']);
    if (rn > 1) out.push([`${T('Nivel necesario', 'Required Level')}: ${rn}`, h && h.nivel < rn ? '#ff4040' : '#e8e0d0']);
  }
  const agrup = new Map<string, number>();
  for (const [s, v] of o.stats) agrup.set(s, (agrup.get(s) ?? 0) + v);
  for (const [s, v] of agrup) if (s !== 'dano_min' && s !== 'dano_max' || true) out.push([textoStat(s, v, IDI), '#7c94ff']);
  if (o.huecos) out.push([`${T('Huecos', 'Sockets')} (${o.engarces.length}/${o.huecos})`, '#a0a0a0']);
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
