// La interfaz dentro del juego: barra de abajo con orbes, cinturón y habilidades; inventario, ficha, habilidades,
// cofre, tiendas, diálogos, piedras de viaje, misiones, mapa y menú.
import { ctx, W, H, E, pulso, ESCALA } from '../nucleo/lienzo';
import { barraInferior, orbe, zonasBarra, ladoOrbe, barraJefe, cursores, cartelMuerte, panelInventario, EQUIPO as EQUIPO_HUD, CELDA_INV, BOLSA as BOLSA_HUD, type ObjetoInv } from '../../../src/engine/gotico/hud';
import { aLoot, arma3dDe } from './loot';
import { texto, T, TT, IDI, marco, titulo, boton, dentro, icono, iconoThor, lineasObjeto, tooltip, cacheRaster, rasterACanvas, envolver, ancho, TITULO } from './comun';
import { CLASES, HABILIDADES, habilidadesDe, ATAQUE, TIERS, ESCALA_HECHIZOS, type Habilidad } from '../datos/clases';
import { NPCS } from '../datos/npcs';
import { MISIONES, ZONAS, PUEBLO_DE, type Mision, type Premio } from '../mundo/actos';
import { MONSTRUOS } from '../datos/monstruos';
import { saludoDe, relatoDe, ofertaDe, entregaDe, activaDe, aceptar, textoHecho, eleccionDe, hist, avanceDe, decidir, finalCompleto, quienDa } from '../juego/historia';
import { panelCodice } from './codice';
import { miniTactil, rectJefeTactil, disposicion } from './hud_tactil';
import { EPILOGOS } from '../mundo/decisiones';
import { colorObj, crearObjeto, crearPocion, crearPergamino, engarzar, baseDe, textoStat, crearUnicoId, type Objeto } from '../juego/objetos';
import { BASES } from '../datos/objetos_datos';
import type { DatosHeroe } from '../juego/heroe';
import { CASILLAS, BOLSA_W, BOLSA_H, equipoVisual, ropaBase, cuerpoDe, firmaVisual, libre, cumpleReq, nivelHab, puedeAprender, xpPara, recoger, type Casilla, type EnBolsa, nivelEnDificultad, cant, apilable, partir, alCinturon, meterEnBolsa, tiposCinturon, PILA_BOLSA, PILA_CINTURON, type TipoPocion } from '../juego/heroe';
import { recalc, usarPocion, beberPocion, noRellenar, abrirPortal, costoMana, danoHab, habilidadDe, msg, frascosMax, ventanaCombo, cadaveresCerca, MAX_CARGAS, colorElem, thorDe, tramoThor, type Juego, type Monstruo } from '../juego/mundo';
import { cuadrosMonstruo, dibujar as dibujarCuadro } from '../motor/assets';
import { Sonido } from '../audio/sonido';
import { R, entero } from '../nucleo/azar';

export type PanelId = 'inv' | 'pers' | 'habs' | 'cofre' | 'tienda' | 'dialogo' | 'viaje' | 'misiones' | 'codice' | 'menu' | 'elegirHab' | null;
export const ui = {
  izq: null as PanelId, der: null as PanelId, mapa: false, mano: null as Objeto | null,
  npc: null as string | null, dialogoTexto: null as string | null, tienda: [] as EnBolsa[], tiendaTipo: 'herrero' as 'herrero' | 'curandera' | 'vidente', pestana: 0,
  elegirLado: 'izq' as 'izq' | 'der', ramaHab: 0, cofre: [] as EnBolsa[], encima: null as any, sobreUI: false,
  confirmar: null as null | { txt: string; si: () => void },
  /** Táctil: la ficha del objeto tocado en la tienda o la bolsa (comprar, equipar, mover... con botones aparte). */
  ficha: null as null | { e: EnBolsa; tipo: 'tienda' | 'bolsa'; todos: EnBolsa[] },
};
export const COFRE_W = 10, COFRE_H = 8;
import { hud } from './hud_rects';
const BAR_H = 120;
const barraY = () => H - BAR_H;
const barraX = () => Math.round((W - 800) / 2);
const panelY = () => Math.max(0, Math.round((H - BAR_H - 432) / 2));


let cursoresC: Record<string, { c: HTMLCanvasElement; a: [number, number] }> | null = null;
let orbes: Record<string, HTMLCanvasElement[]> | null = null;
export function prepararHud() {
  if (!cursoresC) { cursoresC = {}; for (const c of cursores()) cursoresC[c.id] = { c: rasterACanvas(c.img), a: c.ancla }; }
  if (!orbes) { orbes = {}; for (const t of ['vida', 'mana', 'veneno', 'helado'] as const) { orbes[t + '1'] = []; orbes[t + '0'] = []; for (let f = 0; f < 8; f++) { orbes[t + '1'].push(rasterACanvas(orbe(t, 0.985, f))); orbes[t + '0'].push(rasterACanvas(orbe(t, 0, f))); } } }
}
export function dibujarCursor(tipo: string) {
  if (E.tactil && !ui.mano) return;
  if (ui.mano) { icono(ui.mano, E.x - 14, E.y - 14, ui.mano.w * 29, ui.mano.h * 29); if (cant(ui.mano) > 1) texto(String(cant(ui.mano)), E.x - 14 + ui.mano.w * 29 - 2, E.y - 14 + ui.mano.h * 29 - 3, { tam: 11, alin: 'right', color: '#fff' }); return; }
  const c = cursoresC?.[tipo] ?? cursoresC?.senalar;
  if (c) ctx.drawImage(c.c, Math.round(E.x - c.a[0]), Math.round(E.y - c.a[1]));
}

// ------------------------------------------------------------------ iconos de habilidad (propios)
/** Un orbe de vida o maná del HUD dibujado a cualquier tamaño (lo usa el HUD táctil). */
export function orbeHud(tipo: string, k: number, x: number, y: number, s: number, f: number) {
  prepararHud(); if (!orbes) return;
  const S = ladoOrbe();
  ctx.drawImage(orbes[tipo + '0'][f], x, y, s, s);
  const corte = S * (1 - Math.max(0, Math.min(1, k))) * 0.86 + S * 0.07;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y + corte * s / S, s, s - corte * s / S); ctx.clip(); ctx.drawImage(orbes[tipo + '1'][f], x, y, s, s); ctx.restore();
}
/** Solo el glifo de la habilidad, centrado en (cx, cy), sin fondo ni marco. */
export const glifoHab = (hb: Habilidad, cx: number, cy: number, s: number, apagado = false) => iconoHab(hb, cx - s / 2, cy - s / 2, s, apagado, true, true);
export function iconoHab(hb: Habilidad, x: number, y: number, s: number, apagado = false, redondo = false, soloGlifo = false) {
  ctx.save();
  const g = ctx.createRadialGradient(x + s / 2, y + s / 2, 2, x + s / 2, y + s / 2, s * 0.7);
  g.addColorStop(0, apagado ? '#303030' : hb.color); g.addColorStop(1, '#0a0806');
  // redondo (botones táctiles): solo el fondo de color en círculo y el glifo, sin el marco cuadrado
  if (soloGlifo) { /* sin fondo */ }
  else if (redondo) { ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2); ctx.fill(); }
  else {
    ctx.fillStyle = g; ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = '#000'; ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
    ctx.strokeStyle = apagado ? '#3a3a3a' : '#a08850'; ctx.strokeRect(x + 1.5, y + 1.5, s - 3, s - 3);
  }
  ctx.translate(x + s / 2, y + s / 2); const k = s / 48; ctx.scale(k, k);
  ctx.strokeStyle = apagado ? '#606060' : '#fff6e0'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 3; ctx.lineCap = 'round';
  const L = (pts: number[]) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
  switch (hb.glifo) {
    case 'hacha': L([-10, 14, 8, -10]); ctx.beginPath(); ctx.arc(8, -10, 9, -1.2, 1.4); ctx.fill(); break;
    case 'espada': L([-12, 12, 12, -12]); L([-6, 2, 2, 10]); break;
    case 'doble': L([-14, 10, 4, -10]); L([-4, 14, 14, -6]); break;
    case 'triple': L([-14, 8, 2, -12]); L([-6, 12, 10, -8]); L([2, 14, 14, 0]); break;
    case 'salto': L([-14, 12, -4, -10, 6, 4, 14, -12]); break;
    case 'giro': ctx.beginPath(); ctx.arc(0, 0, 12, 0, 5); ctx.stroke(); L([12, 0, 14, -8]); break;
    case 'craneo': ctx.beginPath(); ctx.arc(0, -3, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#000'; ctx.fillRect(-7, -5, 5, 5); ctx.fillRect(2, -5, 5, 5); ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(-6, 7, 12, 6); break;
    case 'boca': ctx.beginPath(); ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2); ctx.stroke(); L([-8, -3, -4, 3, 0, -3, 4, 3, 8, -3]); break;
    case 'puno': ctx.fillRect(-9, -9, 18, 16); ctx.fillStyle = '#000'; for (let i = 0; i < 3; i++) ctx.fillRect(-6 + i * 5, -9, 1, 8); break;
    case 'escudo': ctx.beginPath(); ctx.moveTo(-12, -13); ctx.lineTo(12, -13); ctx.lineTo(10, 4); ctx.lineTo(0, 14); ctx.lineTo(-10, 4); ctx.closePath(); ctx.stroke(); break;
    case 'onda': for (let r = 5; r <= 15; r += 5) { ctx.beginPath(); ctx.arc(0, 4, r, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); } break;
    case 'gota': ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(12, 6, 0, 12); ctx.quadraticCurveTo(-12, 6, 0, -14); ctx.fill(); break;
    case 'piel': ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(12, -10); ctx.lineTo(8, 12); ctx.lineTo(-8, 12); ctx.closePath(); ctx.stroke(); L([-6, -4, 6, 6]); break;
    case 'rayo': L([4, -14, -4, 0, 4, 0, -4, 14]); break;
    case 'cruz': L([0, -14, 0, 14]); L([-10, -4, 10, -4]); break;
    case 'flecha': L([-12, 12, 12, -12]); L([4, -12, 12, -12, 12, -4]); break;
    case 'sol': ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); for (let a = 0; a < 8; a++) L([Math.cos(a * 0.785) * 9, Math.sin(a * 0.785) * 9, Math.cos(a * 0.785) * 14, Math.sin(a * 0.785) * 14]); break;
    case 'manos': L([-8, 12, -8, -6, -2, -12]); L([8, 12, 8, -6, 2, -12]); break;
    case 'espina': for (let a = 0; a < 6; a++) L([0, 0, Math.cos(a) * 13, Math.sin(a) * 13]); break;
    case 'llama': ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(12, 0, 6, 12); ctx.lineTo(-6, 12); ctx.quadraticCurveTo(-12, 0, 0, -14); ctx.fill(); break;
    case 'ojo': ctx.beginPath(); ctx.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); break;
    case 'martillo': L([-10, 12, 6, -4]); ctx.fillRect(0, -14, 12, 10); break;
    case 'bola': case 'meteoro': ctx.beginPath(); ctx.arc(2, 2, 9, 0, Math.PI * 2); ctx.fill(); L([-4, -4, -14, -14]); break;
    case 'muro': for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 9 - 4, 12); ctx.quadraticCurveTo(i * 9, -16, i * 9 + 4, 12); ctx.fill(); } break;
    case 'cristal': ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(6, 0); ctx.lineTo(0, 14); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill(); break;
    case 'nova': for (let a = 0; a < 8; a++) L([Math.cos(a * 0.785) * 5, Math.sin(a * 0.785) * 5, Math.cos(a * 0.785) * 14, Math.sin(a * 0.785) * 14]); break;
    case 'orbe': ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(-3, -3, 3, 0, Math.PI * 2); ctx.fill(); break;
    case 'copo': for (let a = 0; a < 3; a++) L([Math.cos(a * 1.047) * 13, Math.sin(a * 1.047) * 13, -Math.cos(a * 1.047) * 13, -Math.sin(a * 1.047) * 13]); break;
    case 'chispa': L([-12, 4, -4, -4, 0, 6, 6, -6, 12, 2]); break;
    case 'nube': ctx.beginPath(); ctx.arc(-6, 0, 7, 0, Math.PI * 2); ctx.arc(4, -3, 8, 0, Math.PI * 2); ctx.arc(8, 4, 6, 0, Math.PI * 2); ctx.fill(); break;
    case 'abanico': for (let a = -2; a <= 2; a++) L([0, 12, a * 6, -12]); break;
    case 'lluvia': for (let i = -2; i <= 2; i++) L([i * 6, -12, i * 6 - 3, 4]); break;
    case 'lanza': L([-13, 13, 13, -13]); ctx.beginPath(); ctx.moveTo(13, -13); ctx.lineTo(5, -9); ctx.lineTo(9, -5); ctx.fill(); break;
    case 'pluma': ctx.beginPath(); ctx.ellipse(0, 0, 5, 14, 0.6, 0, Math.PI * 2); ctx.stroke(); L([-8, 10, 8, -10]); break;
    case 'alma': ctx.beginPath(); ctx.arc(0, -4, 8, 0, Math.PI * 2); ctx.fill(); L([-6, 4, -8, 14]); L([6, 4, 8, 14]); break;
    case 'hueso': L([-10, 10, 10, -10]); for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 11, -s * 11, 3, 0, Math.PI * 2); ctx.fill(); } break;
    case 'espiral': ctx.beginPath(); for (let a = 0; a < 12; a += 0.2) ctx.lineTo(Math.cos(a) * a * 1.2, Math.sin(a) * a * 1.2); ctx.stroke(); break;
    case 'arco': ctx.beginPath(); ctx.arc(-6, 0, 14, -1.2, 1.2); ctx.stroke(); L([-1, -13, -1, 13]); break;
    case 'mano': ctx.fillRect(-8, -2, 16, 12); for (let i = 0; i < 4; i++) ctx.fillRect(-8 + i * 4.5, -12, 3, 10); break;
    case 'reloj': ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke(); L([0, 0, 0, -8]); L([0, 0, 6, 3]); break;
    case 'garra': for (let i = -1; i <= 1; i++) L([i * 7, 12, i * 7 + 4, -12]); break;
    case 'corazon': ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(-16, 0, -10, -16, 0, -6); ctx.bezierCurveTo(10, -16, 16, 0, 0, 12); ctx.fill(); break;
    case 'viento': for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-13, i * 7); ctx.quadraticCurveTo(4, i * 7 - 6, 13, i * 7); ctx.stroke(); } break;
    case 'grieta': L([-12, -12, -4, -2, -8, 4, 4, 12]); break;
    case 'raiz': L([0, -14, 0, 4, -8, 14]); L([0, 4, 8, 14]); L([0, -4, -8, 2]); break;
    case 'arbol': ctx.beginPath(); ctx.arc(0, -4, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-2, 4, 4, 10); break;
    case 'frasco': ctx.beginPath(); ctx.arc(0, 4, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-3, -12, 6, 10); break;
    case 'racimo': for (const [a, b] of [[-6, 4], [6, 4], [0, -6]]) { ctx.beginPath(); ctx.arc(a, b, 6, 0, Math.PI * 2); ctx.fill(); } break;
    case 'torre': ctx.fillRect(-6, -6, 12, 18); ctx.fillRect(-10, -10, 20, 5); L([0, -10, 12, -14]); break;
    case 'moneda': ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke(); texto('G', -4, 5, { tam: 13, color: '#fff6e0', sombra: false }); break;
    case 'corona': ctx.beginPath(); ctx.moveTo(-13, 9); ctx.lineTo(-13, -7); ctx.lineTo(-6, 1); ctx.lineTo(0, -12); ctx.lineTo(6, 1); ctx.lineTo(13, -7); ctx.lineTo(13, 9); ctx.closePath(); ctx.fill(); ctx.fillRect(-13, 11, 26, 3); break;
    case 'estrella': ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 6 : 14, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); break;
    case 'campana': ctx.beginPath(); ctx.moveTo(-11, 8); ctx.quadraticCurveTo(-10, -13, 0, -13); ctx.quadraticCurveTo(10, -13, 11, 8); ctx.closePath(); ctx.fill(); ctx.fillRect(-13, 8, 26, 3); ctx.beginPath(); ctx.arc(0, 13, 3, 0, Math.PI * 2); ctx.fill(); break;
    case 'ala': for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-12, 10 - i * 2); ctx.quadraticCurveTo(-2, -4 - i * 3, 13 - i * 3, -12 + i * 6); ctx.stroke(); } break;
    case 'colmillo': for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 11, -12); ctx.quadraticCurveTo(sx * 2, -10, sx * 4, 13); ctx.quadraticCurveTo(sx * 9, 0, sx * 11, -12); ctx.fill(); } break;
    case 'loto': for (let a = -2; a <= 2; a++) { ctx.save(); ctx.rotate(a * 0.5); ctx.beginPath(); ctx.ellipse(0, -4, 4, 10, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } L([-13, 10, 13, 10]); break;
    case 'cepo': ctx.beginPath(); ctx.arc(0, 2, 12, Math.PI, 0); ctx.stroke(); for (let i = -2; i <= 2; i++) L([i * 5, 2, i * 5 + 1, -5]); L([-14, 6, 14, 6]); break;
    case 'tumba': ctx.beginPath(); ctx.moveTo(-9, 13); ctx.lineTo(-9, -4); ctx.arc(0, -4, 9, Math.PI, 0); ctx.lineTo(9, 13); ctx.stroke(); L([0, -6, 0, 6]); L([-4, -2, 4, -2]); break;
    default: ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ barra de abajo
export function dibujarBarra(j: Juego, t: number) {
  // pantalla baja con un panel abierto: la barra no se dibuja (taparía el panel)
  for (const k of ['agresivo', 'golpe', 'poder', 'barra']) delete hud[k];
  if (compacto() && (ui.izq || ui.der)) return;
  prepararHud();
  const h = j.heroe, bx = barraX(), by = barraY();
  hud.barra = [Math.max(0, bx), by, Math.min(W, 800), BAR_H];
  ctx.fillStyle = '#080605'; ctx.fillRect(0, by + 56, W, BAR_H - 56);
  ctx.drawImage(cacheRaster('barra' + IDI, () => barraInferior({ vacia: true, idioma: IDI ? 'en' : 'es' })), bx, by);
  const zs = zonasBarra();
  const Z = (id: string) => zs.find((z) => z.id === id)!;
  const f = Math.floor(t * 8) % 8;
  // orbes
  for (const [id, tipo, k] of [['orbe_vida', h.veneno > 0 ? 'veneno' : h.frio > 0 ? 'helado' : 'vida', h.vida / h.vidaMax], ['orbe_mana', 'mana', h.mana / Math.max(1, h.c.manaMax)]] as [string, string, number][]) {
    const z = Z(id); const S = ladoOrbe(); const ox = bx + z.x + z.w / 2 - S / 2, oy = by + z.y + z.h / 2 - S / 2;
    ctx.drawImage(orbes![tipo + '0'][f], ox, oy);
    const corte = S * (1 - Math.max(0, Math.min(1, k))) * 0.86 + S * 0.07;
    ctx.save(); ctx.beginPath(); ctx.rect(ox, oy + corte, S, S - corte); ctx.clip(); ctx.drawImage(orbes![tipo + '1'][f], ox, oy); ctx.restore();
    if (dentro(bx + z.x, by + z.y, z.w, z.h)) { const v = id === 'orbe_vida' ? `${T('Vida', 'Life')}: ${Math.ceil(h.vida)} / ${h.vidaMax}` : `${T('Maná', 'Mana')}: ${Math.floor(h.mana)} / ${h.c.manaMax}`; texto(v, bx + z.x + z.w / 2, by + z.y - 6, { alin: 'center', color: '#fff' }); }
  }
  // habilidades izq y der
  for (const [id, lado] of [['habilidad_izq', 'izq'], ['habilidad_der', 'der']] as const) {
    const z = Z(id); const hb = habilidadDe(h.d[lado]);
    const n = hb.id === 'ataque' ? 1 : nivelHab(h.d, hb.id, h.c);
    iconoHab(hb, bx + z.x, by + z.y, z.w, n <= 0);
    if (hb.id !== 'ataque' && h.mana < costoMana(j, hb)) { ctx.fillStyle = 'rgba(0,0,80,0.5)'; ctx.fillRect(bx + z.x, by + z.y, z.w, z.h); }
    const rc = h.recargas[hb.id] ?? 0; if (rc > 0) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx + z.x, by + z.y, z.w, z.h * Math.min(1, rc / (hb.recarga ?? 1))); }
    if (dentro(bx + z.x, by + z.y, z.w, z.h)) { if (E.clicIzq) { ui.izq = null; ui.der = 'elegirHab'; ui.elegirLado = lado; E.clicIzq = false; } }
  }
  // cinturón: cada columna tiene su tipo de poción (clic derecho en una vacía lo cambia) y guarda una pila de hasta 4
  const tipos = tiposCinturon(h.d);
  for (let i = 0; i < 4; i++) {
    const z = Z(`cinturon_${i + 1}`); const o = h.d.cinturon[i];
    const x0 = bx + z.x, y0 = by + z.y;
    if (o) {
      icono(o, x0, y0, z.w, z.h);
      texto(String(cant(o)), x0 + z.w - 2, y0 + 10, { tam: 10, alin: 'right', color: '#ffffff' });
    } else {
      // vacía: un tinte tenue y un frasquito del tipo de la columna
      ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = COLOR_POCION[tipos[i]]; ctx.fillRect(x0 + 2, y0 + 2, z.w - 4, z.h - 4);
      ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(x0 + z.w / 2, y0 + z.h / 2 + 3, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x0 + z.w / 2 - 2, y0 + z.h / 2 - 8, 4, 6); ctx.restore();
    }
    texto(String(i + 1), x0 + 2, y0 + z.h - 2, { tam: 10, color: '#a09070' });
    if (dentro(x0, y0, z.w, z.h)) {
      if (o && !ui.mano) tooltip([...lineasObjeto(o), ...lineaCantidad(o), [T('Shift + clic: a la bolsa', 'Shift + click: to bag'), '#a09070']], E.x, y0);
      else if (!o && !ui.mano) tooltip([[`${T('Columna de', 'Column for')} ${TT(NOMBRE_POCION[tipos[i]])}`, COLOR_POCION[tipos[i]]], [T('Clic derecho: cambiar el tipo', 'Right click: change the type'), '#a09070']], E.x, y0);
      if (E.clicIzq) {
        E.clicIzq = false;
        if (!ui.mano) { if (o) { if (E.shift) cinturonABolsa(j, i); else { ui.mano = o; h.d.cinturon[i] = null; noRellenar(j, i); levantadoDe(null); Sonido.efecto('click'); } } }
        else if (ui.mano.tipo !== 'pocion') Sonido.efecto('negado');
        else soltarEnCinturon(j, i);
      } else if (E.clicDer) {
        E.clicDer = false;
        if (o) usarPocion(j, i);
        else if (!ui.mano) { tipos[i] = TIPOS_POCION[(TIPOS_POCION.indexOf(tipos[i]) + 1) % TIPOS_POCION.length]; Sonido.efecto('click'); }
      }
    }
  }
  // experiencia
  const zx = Z('barra_experiencia'); const x0 = xpPara(h.d.nivel), x1 = xpPara(h.d.nivel + 1);
  ctx.fillStyle = '#c0a040'; ctx.fillRect(bx + zx.x, by + zx.y + 1, zx.w * Math.max(0, Math.min(1, (h.d.xp - x0) / Math.max(1, x1 - x0))), zx.h - 2);
  if (dentro(bx + zx.x, by + zx.y - 3, zx.w, zx.h + 6)) texto(`${T('Experiencia', 'Experience')}: ${h.d.xp.toLocaleString()} / ${x1.toLocaleString()}`, W / 2, by + zx.y - 8, { alin: 'center', color: '#fff' });
  // aguante = barra de correr (indicador)
  const za = Z('barra_aguante'); ctx.fillStyle = h.correr ? '#b0a040' : '#606060'; ctx.fillRect(bx + za.x + 1, by + za.y + 2, za.w - 2, za.h - 4);
  texto(h.correr ? T('Corriendo (R)', 'Running (R)') : T('Caminando (R)', 'Walking (R)'), bx + za.x + za.w / 2, by + za.y + 10, { alin: 'center', tam: 10, color: '#000', sombra: false });
  const zc = Z('caminar_correr'); if (dentro(bx + zc.x, by + zc.y, zc.w + za.w, zc.h) && E.clicIzq) { h.correr = !h.correr; E.clicIzq = false; }
  // agresivo o pasivo (Z): espada roja que ataca sola lo que entra en su alcance, o escudo gris que espera órdenes
  // con un panel a la izquierda se esconde, porque queda pegado al borde de abajo del panel
  if (!ui.izq) {
    const ag = !!(h.d as any).agresivo, s = E.tactil ? 46 : 38, ax = Math.max(8, bx + 6), ay = by - s - 8;
    const enc = dentro(ax, ay, s, s);
    hud.agresivo = [ax, ay, s, s];
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = ag ? '#3a0c08' : '#1a1a1e'; ctx.fillRect(ax, ay, s, s);
    ctx.strokeStyle = enc ? '#ffe0a0' : ag ? '#c04020' : '#707078'; ctx.lineWidth = 2; ctx.strokeRect(ax + 1, ay + 1, s - 2, s - 2);
    const cx = ax + s / 2, cy = ay + s / 2;
    if (ag) { ctx.strokeStyle = '#ff4030'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - s * 0.28, cy + s * 0.28); ctx.lineTo(cx + s * 0.26, cy - s * 0.26); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy + s * 0.08); ctx.lineTo(cx - s * 0.08, cy + s * 0.3); ctx.stroke(); }
    else { ctx.fillStyle = '#9a9aa4'; ctx.beginPath(); ctx.moveTo(cx - s * 0.26, cy - s * 0.28); ctx.lineTo(cx + s * 0.26, cy - s * 0.28); ctx.lineTo(cx + s * 0.22, cy + s * 0.06); ctx.lineTo(cx, cy + s * 0.32); ctx.lineTo(cx - s * 0.22, cy + s * 0.06); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    if (enc) { texto(ag ? T('Agresivo (Z): ataca solo lo que entra en su alcance', 'Aggressive (Z): attacks whatever comes in reach') : T('Pasivo (Z): no ataca sin tu orden', 'Passive (Z): does not attack without your order'), ax, ay - 8, { tam: 11, color: '#fff' }); ui.sobreUI = true; }
    if (enc && E.clicIzq) { E.clicIzq = false; cambiarAgresivo(j); }
  }
  // diez atajos de habilidades: clic o tecla (F1-F10, y también 5-9 y 0)
  while (h.d.atajos.length < 10) h.d.atajos.push(null);
  for (let i = 0; i < 10; i++) {
    const z = Z(`atajo_f${i + 1}`); const id = h.d.atajos[i];
    if (id) { iconoHab(habilidadDe(id), bx + z.x, by + z.y, z.w); if (id === h.d.der) { ctx.strokeStyle = '#ffd060'; ctx.strokeRect(bx + z.x + 0.5, by + z.y + 0.5, z.w - 1, z.h - 1); } }
    texto(i < 5 ? `${i + 5}` : i === 5 ? '0' : `F${i + 1}`, bx + z.x + 1, by + z.y + 9, { tam: 8, color: '#a09070' });
    if (dentro(bx + z.x, by + z.y, z.w, z.h)) {
      if (id) texto(TT(habilidadDe(id).nombre), bx + z.x + z.w / 2, by + z.y - 6, { alin: 'center', tam: 12, color: '#fff' });
      if (E.clicIzq) { E.clicIzq = false; if (id) { h.d.der = id; recalc(j); Sonido.efecto('click'); } else { ui.izq = null; ui.der = 'elegirHab'; ui.elegirLado = 'der'; } }
    }
  }
  // recurso de la clase (furia, aura, cargas, presas, cadáveres, combo, forma, frascos)
  { const z1 = Z('atajo_f1'), zd = Z('habilidad_der'); recursoClase(j, bx + z1.x, by + z1.y - 17, zd.x + zd.w - z1.x); }
  // botones chicos
  const botones: [string, PanelId | 'mapa', 'izq' | 'der'][] = [['boton_personaje', 'pers', 'izq'], ['boton_inventario', 'inv', 'der'], ['boton_habilidades', 'habs', 'der'], ['boton_mapa', 'mapa', 'der'], ['boton_menu', 'menu', 'izq']];
  for (const [id, p, lado] of botones) {
    const z = Z(id);
    if (dentro(bx + z.x, by + z.y, z.w, z.h)) {
      texto(TT([z.es!, z.en!]) + ` (${z.tecla})`, bx + z.x + z.w / 2, by + z.y - 6, { alin: 'center', color: '#fff', tam: 12 });
      if (E.clicIzq) { E.clicIzq = false; if (p === 'mapa') ui.mapa = !ui.mapa; else alternar(p, lado); }
    }
  }
  // puntos para repartir
  if (h.d.puntosAtrib > 0) { const z = Z('boton_personaje'); ctx.fillStyle = Math.floor(t * 2) % 2 ? '#ffd060' : '#a07020'; ctx.fillRect(bx + z.x + z.w - 6, by + z.y, 6, 6); }
  if (h.d.puntosHab > 0) { const z = Z('boton_habilidades'); ctx.fillStyle = Math.floor(t * 2) % 2 ? '#ffd060' : '#a07020'; ctx.fillRect(bx + z.x + z.w - 6, by + z.y, 6, 6); }
  // táctil: botones grandes para la tablet
  // los botones táctiles nunca encima de un panel abierto
  delete hud.golpe; delete hud.poder;
  if (E.tactil && !ui.izq && !ui.der) {
    const r = 34, bx2 = W - 70, by2 = by - 54;
    for (const [i, lado, txt] of [[0, 'der', T('Poder', 'Skill')], [1, 'izq', T('Golpe', 'Hit')]] as [number, 'izq' | 'der', string][]) {
      const cx = bx2 - i * 84, cy = by2 - i * 30;
      hud[i ? 'golpe' : 'poder'] = [cx - r, cy - r, r * 2, r * 2 + 18];
      ctx.save(); ctx.globalAlpha = 0.75; ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#a08050'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      iconoHab(habilidadDe(h.d[lado]), cx - 18, cy - 18, 36);
      texto(txt, cx, cy + r + 12, { alin: 'center', tam: 11 });
      if (E.clicIzq && Math.hypot(E.x - cx, E.y - cy) < r) { E.clicIzq = false; (ui as any).tactilHab = lado; }
    }
    if (dentro(bx2 - 130, by2 - 70, 170, 130)) ui.sobreUI = true;
  }
  ui.sobreUI = ui.sobreUI || E.y > by + 56 || dentro(bx, by, 130, BAR_H) || dentro(bx + 670, by, 130, BAR_H);
}
const TIPOS_POCION: TipoPocion[] = ['vida', 'mana', 'rejuv'];
export const COLOR_POCION: Record<TipoPocion, string> = { vida: '#d02828', mana: '#3050e0', rejuv: '#b040d0' };
const NOMBRE_POCION: Record<TipoPocion, [string, string]> = { vida: ['vida', 'life'], mana: ['maná', 'mana'], rejuv: ['rejuvenecer', 'rejuvenation'] };
const lineaCantidad = (o: Objeto): [string, string][] => (o.tipo === 'pocion' && cant(o) > 1 ? [[`${T('Cantidad', 'Quantity')}: ${cant(o)}`, '#e0d0a0']] : []);
const cinturonLleno = (j: Juego) => { Sonido.efecto('negado'); msg(j, ['Cinturón lleno.', 'Belt is full.'], '#ff8060'); };
/** Suelta lo que hay en la mano (una poción) en la columna i: se apila, entra en el hueco o se intercambia. */
function soltarEnCinturon(j: Juego, i: number) {
  const d = j.heroe.d, m = ui.mano!, o = d.cinturon[i];
  if (!o) {
    const n = Math.min(PILA_CINTURON, cant(m));
    d.cinturon[i] = partir(m, n); if (d.cinturon[i] === m) ui.mano = null;
    tiposCinturon(d)[i] = m.pocion ?? 'vida';
  } else if (apilable(o, m)) {
    const n = Math.min(PILA_CINTURON - cant(o), cant(m));
    if (n <= 0) { cinturonLleno(j); return; }
    o.cantidad = cant(o) + n; m.cantidad = cant(m) - n; if (m.cantidad <= 0) ui.mano = null;
  } else if (cant(m) <= PILA_CINTURON) { d.cinturon[i] = m; ui.mano = o; tiposCinturon(d)[i] = m.pocion ?? 'vida'; }
  else { cinturonLleno(j); return; }
  Sonido.efecto('pocion', { vol: 0.35, tono: 1.6 });
}
/** Shift + clic en el cinturón: la pila vuelve a la bolsa. */
function cinturonABolsa(j: Juego, i: number) {
  const d = j.heroe.d, o = d.cinturon[i]; if (!o) return;
  d.cinturon[i] = null; noRellenar(j, i);
  if (!meterEnBolsa(d, o)) { d.cinturon[i] = o; Sonido.efecto('negado'); msg(j, ['No tengo lugar.', 'I have no room.'], '#ff8060'); return; }
  Sonido.efecto('click');
}
/** Indicador chico de la mecánica de clase, arriba de los atajos. */
export function recursoClase(j: Juego, x: number, y: number, w: number) {
  const h = j.heroe, d = h.d, hh = 13, t = j.t;
  let ayuda: [string, string] = ['', ''];
  const fondo = () => { ctx.fillStyle = 'rgba(8,6,5,0.85)'; ctx.fillRect(x, y, w, hh); ctx.strokeStyle = '#4a3c28'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, hh - 1); };
  const etiqueta = (s: string, col = '#c8b890') => texto(s, x + 5, y + 10, { tam: 10, color: col, sombra: false });
  const pips = (n: number, max: number, x0: number, col: (i: number) => string, vacio = '#2a2420') => { for (let i = 0; i < max; i++) { ctx.fillStyle = i < n ? col(i) : vacio; ctx.fillRect(x0 + i * 13, y + 3, 10, hh - 6); } };
  const barra = (k: number, x0: number, col: string) => { const bw = x + w - 5 - x0; ctx.fillStyle = '#2a2420'; ctx.fillRect(x0, y + 3, bw, hh - 6); ctx.fillStyle = col; ctx.fillRect(x0, y + 3, bw * Math.max(0, Math.min(1, k)), hh - 6); };
  switch (d.clase) {
    case 'berserker': {
      fondo(); etiqueta(`${T('Furia', 'Fury')} ${Math.round(h.furia)}`, h.furia >= 100 ? '#ffb070' : '#c8b890');
      barra(h.furia / 100, x + 62, h.furiaFija > 0 ? (Math.floor(t * 6) % 2 ? '#ff6020' : '#ffa040') : '#c02810');
      ayuda = [T('Furia: sube al pegar y al recibir golpes, se apaga fuera de combate. Más furia, más daño.', 'Fury: rises when you hit and get hit, fades out of combat. More fury, more damage.'), ''];
      break;
    }
    case 'templario': {
      fondo();
      const a = d.aura && h.buffs[d.aura] ? habilidadDe(d.aura) : null;
      etiqueta(a ? `${T('Aura', 'Aura')}: ${TT(a.nombre)}` : T('Sin aura activa', 'No active aura'), a ? '#ffe0a0' : '#807060');
      if (a && h.auraPot > 0) texto(`+${Math.round(h.auraPot)}%`, x + w - 5, y + 10, { tam: 10, alin: 'right', color: '#ffd060', sombra: false });
      ayuda = [T('Solo un aura activa a la vez. Ponla en el botón derecho para encenderla.', 'Only one aura active at a time. Set it on the right button to light it.'), ''];
      break;
    }
    case 'arcanista': {
      fondo(); etiqueta(T('Cargas', 'Charges'));
      pips(h.cargas.length, MAX_CARGAS, x + 52, (i) => colorElem(h.cargas[i]));
      ayuda = [T('Cada hechizo de fuego, escarcha o rayo guarda una carga. Las cargas suben el daño de su elemento y algunas habilidades las gastan.', 'Every fire, frost or lightning spell stores a charge. Charges raise their element\'s damage and some skills spend them.'), ''];
      break;
    }
    case 'cazadora': {
      fondo();
      const hal = j.monstruos.some((m) => m.dueno && !m.muerto && m.invocaId === 'halcon');
      const marcados = j.monstruos.filter((m) => !m.muerto && !m.dueno && (m.marca ?? 0) > 0).length;
      etiqueta(`${hal ? T('Halcón', 'Hawk') : T('Sin halcón', 'No hawk')} · ${T('Marcados', 'Marked')} ${marcados} · ${T('Trampas', 'Traps')} ${j.torretas.length}`, hal ? '#ffd080' : '#a09070');
      ayuda = [T('Tu halcón y algunas flechas marcan presas: las marcadas reciben más daño.', 'Your hawk and some arrows mark prey: marked prey takes more damage.'), ''];
      break;
    }
    case 'nigromante': {
      fondo();
      const c = cadaveresCerca(j, h.x, h.y, 12).length;
      etiqueta(`${T('Cadáveres', 'Corpses')}: ${c}`, c ? '#e0d8c0' : '#807060');
      pips(Math.min(6, c), 6, x + w - 6 * 13 - 2, () => '#d8d0b8');
      ayuda = [T('Los muertos quedan en el suelo un rato: puedes levantarlos, comerlos o reventarlos.', 'The dead stay on the ground for a while: you can raise them, eat them or burst them.'), ''];
      break;
    }
    case 'monje': {
      fondo(); etiqueta(T('Combo', 'Combo'));
      const vivo = h.combo.paso > 0 && (j.t - h.combo.t <= ventanaCombo(h) || !!h.buffs.loto_dorado);
      pips(vivo ? h.combo.paso : 0, 3, x + 48, (i) => (i === 2 ? '#ffd060' : '#e0c080'));
      if (vivo && !h.buffs.loto_dorado) { const k = 1 - (j.t - h.combo.t) / ventanaCombo(h); ctx.fillStyle = '#806030'; ctx.fillRect(x + 90, y + hh - 3, (w - 95) * k, 2); }
      texto(T('el tercero remata', 'third one finishes'), x + w - 5, y + 10, { tam: 9, alin: 'right', color: '#807060', sombra: false });
      ayuda = [T('Tres golpes cuerpo a cuerpo seguidos: el tercero es un remate con una onda.', 'Three melee blows in a row: the third is a finisher with a shockwave.'), ''];
      break;
    }
    case 'druida': {
      fondo();
      const f = h.buffs.forma_oso ? 'forma_oso' : h.buffs.forma_lobo ? 'forma_lobo' : null;
      etiqueta(f ? `${T('Forma', 'Form')}: ${f === 'forma_oso' ? T('oso', 'bear') : T('lobo', 'wolf')}` : T('Forma humana', 'Human form'), f ? '#e0c080' : '#a09070');
      if (f) barra(h.buffs[f].t / 300, x + 90, f === 'forma_oso' ? '#806040' : '#8090a0');
      ayuda = [T('Piel de lobo y piel de oso cambian tu cuerpo. Algunas habilidades solo se usan transformado.', 'Wolfskin and Bearhide change your body. Some skills only work while transformed.'), ''];
      break;
    }
    case 'alquimista': {
      fondo(); etiqueta(T('Frascos', 'Flasks'));
      const max = frascosMax(h);
      pips(Math.floor(h.frascos), Math.min(10, max), x + 50, () => (h.buffs.panacea_negra ? '#80ff60' : '#ff9040'));
      if (h.frascos < max) { const i = Math.floor(h.frascos); ctx.fillStyle = '#804020'; ctx.fillRect(x + 50 + i * 13, y + 3 + (hh - 6) * (1 - h.frascoT / 4), 10, (hh - 6) * (h.frascoT / 4)); }
      ayuda = [T('Las bombas gastan frascos. Se rellenan solos con el tiempo.', 'Bombs use flasks. They refill on their own over time.'), ''];
      break;
    }
  }
  if (dentro(x, y, w, hh)) ui.sobreUI = true;
  if (ayuda[0] && dentro(x, y, w, hh)) tooltip(envolver(ayuda[0], 260, 13).map((s) => [s, '#e0d0a0'] as [string, string]), x + w / 2, y);
}
export function alternar(p: PanelId, lado: 'izq' | 'der') {
  if (lado === 'izq') ui.izq = ui.izq === p ? null : p; else ui.der = ui.der === p ? null : p;
  Sonido.efecto('click');
}

// ------------------------------------------------------------------ cosas de arriba: jefe, plaquita del monstruo, mensajes
export function dibujarArriba(j: Juego, encima: Monstruo | null) {
  // purga en curso: cuántos faltan y cuánto tiempo queda
  const pu = (j as any).purga;
  if (pu) { const s = Math.max(0, Math.ceil(pu.t)); const falta = Math.max(0, pu.n - (pu.hechos ?? 0)); texto(`${T('Purga', 'Purge')}: ${falta} · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, W / 2, j.jefe && !j.jefe.muerto ? 64 : 52, { alin: 'center', tam: 16, color: s < 20 ? '#ff6040' : '#ffb060', fuente: TITULO }); }
  if (j.jefe && !j.jefe.muerto) {
    const k = Math.round((j.jefe.vida / j.jefe.vidaMax) * 100);
    const c = cacheRaster(`jefe${j.jefe.id}_${k}_${IDI}`, () => barraJefe(TT(j.jefe!.nombre), k / 100));
    if (E.tactil) { const r = rectJefeTactil(c.width, c.height); ctx.drawImage(c, r[0], r[1], r[2], r[3]); hud.jefe = r; }
    else { ctx.drawImage(c, Math.round(W / 2 - c.width / 2), 8); hud.jefe = [Math.round(W / 2 - c.width / 2), 8, c.width, c.height]; }
    // lo que dice el jefe: debajo de su barra, con fondo oscuro (encima del cuerpo no se leía)
    const habla = (j.jefe as any).habla as string | undefined;
    if (habla) {
      const [bx, by, bw, bh] = hud.jefe!, tam = E.tactil ? 13 : 14, lin = envolver(habla, Math.min(W - 40, Math.max(bw, 420)), tam).slice(0, 2);
      const anchoC = Math.max(...lin.map((l) => ancho(l, tam))) + 28, alto = lin.length * tam * 1.35 + 12, x0 = bx + bw / 2 - anchoC / 2, y0 = by + bh + 6;
      ctx.save(); ctx.fillStyle = 'rgba(8,5,4,0.78)'; ctx.fillRect(x0, y0, anchoC, alto); ctx.strokeStyle = 'rgba(160,90,50,0.6)'; ctx.strokeRect(x0 + 0.5, y0 + 0.5, anchoC - 1, alto - 1); ctx.restore();
      lin.forEach((l, i) => texto(l, bx + bw / 2, y0 + 6 + tam + i * tam * 1.35 - 3, { alin: 'center', tam, color: '#ffb080' }));
    }
  } else if (encima && !encima.muerto) {
    const m = encima, w = 220, x = W / 2 - w / 2, y = 10;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x, y, w, 30);
    ctx.fillStyle = '#400808'; ctx.fillRect(x + 4, y + 20, w - 8, 6);
    ctx.fillStyle = '#c01818'; ctx.fillRect(x + 4, y + 20, (w - 8) * Math.max(0, m.vida / m.vidaMax), 6);
    const col = m.calidad >= 2 ? '#c8a050' : m.calidad === 1 ? '#6c8cff' : m.dueno ? '#80ff80' : '#e0e0e0';
    texto(TT(m.nombre) || TT(m.def.nombre), W / 2, y + 15, { alin: 'center', color: col });
    if (m.mods.length && m.calidad >= 1) texto(m.mods.map((id) => ({ rapido: T('Veloz', 'Swift'), piel_piedra: T('Piel de piedra', 'Stoneskin'), ardiente: T('Ardiente', 'Fire Enchanted'), helado: T('Helado', 'Cold Enchanted'), electrico: T('Eléctrico', 'Lightning'), vampiro: T('Sediento', 'Thirsting'), maldito: T('Maldito', 'Cursed'), fuerte: T('Bruto', 'Brute'), espectral: T('Espectral', 'Spectral') } as any)[id]).join(', '), W / 2, y + 44, { alin: 'center', color: '#c8a050', tam: 11 });
  }
  // mensajes
  if (E.tactil) { mensajesTactil(j); return; }
  // encima del botón agresivo, que vive justo sobre la barra a la izquierda
  const ag = hud.agresivo, mx = E.tactil ? disposicion().m.l : ui.izq ? 334 : 14;
  let y = E.tactil ? Math.min(H * 0.6, (hud.rastreo ? hud.rastreo[1] + hud.rastreo[3] : disposicion().orbes[1] + 120) + 16 + 18 * Math.max(0, j.mensajes.length - 1)) : ag && !ui.izq ? ag[1] - 12 : H - BAR_H - 30;
  const y0 = y;
  ctx.font = '14px Georgia, serif'; let anchoM = 0;
  for (let i = j.mensajes.length - 1; i >= 0; i--) {
    const m = j.mensajes[i];
    ctx.globalAlpha = Math.min(1, 7 - m.t);
    // en táctil no pasan del minimapa ni de los botones de arriba
    const maxM = E.tactil ? Math.max(120, disposicion().mini[0] - mx - 16) : undefined;
    texto(TT(m.txt), mx, y, { color: m.color, tam: 14, max: maxM });
    ctx.font = '14px Georgia, serif'; anchoM = Math.max(anchoM, Math.min(maxM ?? 1e9, ctx.measureText(TT(m.txt)).width));
    ctx.globalAlpha = 1; y -= 18;
  }
  if (j.mensajes.length) hud.mensajes = [mx, y + 4, anchoM, y0 - y + 2]; else delete hud.mensajes;
}
/** En táctil: los tres últimos, en letra de 11 pt o más, con salto de línea a 300 pt, debajo de la misión. */
function mensajesTactil(j: Juego) {
  const P = disposicion(), Lp = (pt: number) => pt / Math.max(0.1, ESCALA);
  const mx = P.m.l, tam = Math.round(Lp(11)), lh = Math.round(tam * 1.3);
  const anchoMax = Math.min(Lp(300), P.mini[0] - mx - Lp(12));
  let y = (hud.rastreo ? hud.rastreo[1] + hud.rastreo[3] : P.orbes[1] + P.orbes[3] + Lp(22)) + Lp(8) + tam;
  const y0 = y - tam; let anchoM = 0;
  const ultimos = j.mensajes.slice(-3);
  for (const m of ultimos) {
    ctx.globalAlpha = Math.max(0, Math.min(1, 6 - m.t));
    // no bajan hasta el cartel de consejos, si está
    for (const l of envolver(TT(m.txt), anchoMax, tam).slice(0, 3)) { if (hud.cartel && y + 4 > hud.cartel[1]) break; texto(l, mx, y, { color: m.color, tam }); anchoM = Math.max(anchoM, ancho(l, tam)); y += lh; }
    ctx.globalAlpha = 1;
  }
  if (ultimos.length) hud.mensajes = [mx, y0, Math.min(anchoMax, anchoM), y - y0 - lh + tam + 4]; else delete hud.mensajes;
}
export function dibujarMuerte() {
  const c = cacheRaster('muerte' + IDI, () => cartelMuerte(IDI ? 'en' : 'es'));
  ctx.drawImage(c, Math.round(W / 2 - c.width / 2), Math.round(H / 2 - c.height / 2 - 40));
}

// ------------------------------------------------------------------ paneles
/** Paneles en pantallas bajas (teléfono apaisado): sin la barra de abajo mientras hay un panel, y achicados si no caben. */
export const compacto = () => H < PANEL_ALTO + BAR_H + 8;
const PANEL_ALTO = 440;
const escPanel = () => Math.min(1, (H - (compacto() ? 0 : BAR_H)) / PANEL_ALTO);
/** Dónde queda cada panel en pantalla real (para clics fuera y para la barra). */
export function rectPanel(lado: 'izq' | 'der'): [number, number, number, number] {
  const k = escPanel(), w = 320 * k, h = 432 * k;
  const y = compacto() ? Math.max(0, (H - h) / 2) : Math.max(0, (H - BAR_H - h) / 2);
  return [lado === 'izq' ? 0 : W - w, y, w, h];
}
/** Cierre común de todo lo que abre un NPC o un objeto: tienda, diálogo, baúl, piedra de viaje, página, misiones, menú. */
export function cerrarPaneles() {
  ui.izq = ui.der = null; ui.mapa = false; ui.npc = null; ui.dialogoTexto = null;
  const u = ui as any; u.oferta = null; u.eleccion = null; u.origen = null; u.paginaPanel = undefined;
}
export function dibujarPaneles(j: Juego, t: number) {
  ui.encima = null;
  const ex = E.x, ey = E.y, clic = E.clicIzq;
  for (const lado of ['izq', 'der'] as const) {
    const p = ui[lado]; if (!p) continue;
    const [x0, y0, , ] = rectPanel(lado), k = escPanel();
    // el panel se dibuja en su tamaño de siempre y se escala; la entrada se pasa al mismo espacio
    ctx.save(); ctx.translate(x0, y0); ctx.scale(k, k);
    E.x = (ex - x0) / k; E.y = (ey - y0) / k;
    dibujarPanel(j, p, 0, t, 0);
    // la X para cerrar, grande en táctil
    const tx = E.tactil ? 46 : 30;
    if (ui[lado] === p && p !== 'elegirHab') {
      const bx = 320 - tx - 4, by = 4, enc = dentro(bx, by, tx, tx);
      ctx.fillStyle = enc ? 'rgba(120,40,20,0.9)' : 'rgba(20,14,10,0.85)'; ctx.fillRect(bx, by, tx, tx);
      ctx.strokeStyle = '#a08050'; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, by + 1, tx - 2, tx - 2);
      ctx.strokeStyle = '#e8d0a0'; ctx.lineWidth = 3; const m = tx * 0.3; ctx.beginPath(); ctx.moveTo(bx + m, by + m); ctx.lineTo(bx + tx - m, by + tx - m); ctx.moveTo(bx + tx - m, by + m); ctx.lineTo(bx + m, by + tx - m); ctx.stroke();
      if (E.clicIzq && enc) { E.clicIzq = false; if (lado === 'izq' && (p === 'dialogo' || p === 'tienda' || p === 'cofre' || p === 'viaje')) cerrarPaneles(); else ui[lado] = null; if (!ui.izq && !ui.der) (ui as any).origen = null; Sonido.efecto('click'); }
    }
    ctx.restore();
    E.x = ex; E.y = ey;
  }
  if (ui.izq || ui.der) {
    const dentroDe = (lado: 'izq' | 'der') => { if (!ui[lado]) return false; const [x, y, w, h] = rectPanel(lado); return ex >= x && ex < x + w && ey >= y && ey < y + h; };
    if (dentroDe('izq') || dentroDe('der')) ui.sobreUI = true;
    // en táctil, tocar fuera de los paneles los cierra (y ese toque no camina)
    else if (E.tactil && clic && E.clicIzq && !ui.mano) { E.clicIzq = false; ui.sobreUI = true; cerrarPaneles(); }
  }
  if (ui.confirmar) {
    const w = 360, h = 110, x = W / 2 - w / 2, y = H / 2 - h / 2 - 40;
    marco(x, y, w, h); envolver(ui.confirmar.txt, w - 30).forEach((l, i) => texto(l, W / 2, y + 30 + i * 16, { alin: 'center' }));
    if (boton(T('Sí', 'Yes'), x + 40, y + h - 40, 120, 28)) { ui.confirmar.si(); ui.confirmar = null; E.clicIzq = false; }
    if (boton(T('No', 'No'), x + w - 160, y + h - 40, 120, 28)) { ui.confirmar = null; E.clicIzq = false; }
    ui.sobreUI = true;
  }
}
function dibujarPanel(j: Juego, p: PanelId, x: number, t: number, y = panelY()) {
  switch (p) {
    case 'inv': return panelInv(j, x, y, t);
    case 'pers': return panelPers(j, x, y);
    case 'habs': return panelHabs(j, x, y);
    case 'elegirHab': return panelElegir(j, x, y);
    case 'cofre': return panelCofre(j, x, y, t);
    case 'tienda': return panelTienda(j, x, y, t);
    case 'dialogo': return panelDialogo(j, x, y);
    case 'viaje': return panelViaje(j, x, y);
    case 'misiones': return panelMisiones(j, x, y);
    case 'codice': return panelCodice(j, x, y);
    case 'menu': return panelMenu(j, x, y);
    case 'pagina' as any: { marco(x, y, 320, 432); titulo((ui as any).paginaPanel ?? T('Página arrancada', 'Torn page'), x, y, 320); texto((ui as any).paginaTitulo ?? '', x + 160, y + 52, { alin: 'center', tam: 12, color: '#c0a070' }); texto(`${(ui as any).paginaN} / ${(ui as any).paginaTotal ?? 9}`, x + 160, y + 68, { alin: 'center', tam: 11, color: '#806a50' }); envolver(ui.dialogoTexto ?? '', 270, 15).forEach((l, i) => texto(l, x + 25, y + 90 + i * 22, { tam: 15, color: '#d8c49a', fuente: TITULO })); if (boton(T('Cerrar', 'Close'), x + 120, y + 380, 80, 28, { tam: 13 })) { ui.izq = null; E.clicIzq = false; } return; }
  }
}

// ---------------- inventario (el panel de la Forja con el héroe real y armas 3D)
const CAS_HUD: Record<string, Casilla | null> = { casco: 'cabeza', pecho: 'torso', arma: 'arma', mano_libre: 'izq', guantes: 'manos', cinturon: 'cinturon', botas: 'pies', amuleto: 'amuleto', anillo_izq: 'anillo1', anillo_der: 'anillo2', talisman: 'talisman' };
let cacheInv: { k: string; c: HTMLCanvasElement } | null = null;
function panelInv(j: Juego, x: number, y: number, t: number) {
  const h = j.heroe, d = h.d;
  const act = (ui as any).bolsaActiva ?? 0;
  const firma = JSON.stringify([IDI, act, d.oro, firmaVisual(d), Object.entries(d.equipo).map(([k, o]) => [k, o!.uid, Math.ceil(o!.durab), o!.engarces.length]), d.bolsa.map((e) => [e.o.uid, e.x, e.y, e.b ?? 0, e.o.engarces.length, Math.ceil(e.o.durab)]), h.c.dano, h.c.def]);
  if (!cacheInv || cacheInv.k !== firma) {
    const equipo: Record<string, { it: any; arma3d?: any }> = {};
    for (const [hid, cas] of Object.entries(CAS_HUD)) { const o = cas ? d.equipo[cas] : undefined; if (o) equipo[hid] = { it: aLoot(o), arma3d: arma3dDe(o) }; }
    const bolsa: ObjetoInv[] = d.bolsa.filter((e) => (e.b ?? 0) === act).map((e) => {
      const r = baseDe(e.o)?.ranura; const cas = r === 'anillo' ? 'anillo1' : (r as Casilla);
      const puesto = cas ? d.equipo[cas] : undefined;
      let compara: 1 | -1 | 0 = 0;
      if (puesto && e.o.tipo === 'equipo') { const a = (e.o.dano ? (e.o.dano[0] + e.o.dano[1]) : 0) + (e.o.def ?? 0) + e.o.stats.length * 3, b = (puesto.dano ? puesto.dano[0] + puesto.dano[1] : 0) + (puesto.def ?? 0) + puesto.stats.length * 3; compara = a > b ? 1 : a < b ? -1 : 0; }
      return { it: aLoot(e.o), arma3d: arma3dDe(e.o), x: e.x, y: e.y, w: e.o.w, h: e.o.h, durabilidad: e.o.durabMax ? e.o.durab / e.o.durabMax : undefined, engastes: e.o.huecos ? Array.from({ length: e.o.huecos }, (_, i) => gemaDe(e.o.engarces[i])) : undefined, compara } as ObjetoInv;
    });
    const ocup = d.bolsa.reduce((s2, e) => s2 + e.o.w * e.o.h, 0);
    const p = panelInventario(IDI ? 'en' : 'es', { heroe: { cuerpo: cuerpoDe(d.clase), equipo: equipoVisual(d), ropaBase: ropaBase(d.clase) }, equipo, bolsa, bolsaActiva: act, oro: d.oro, resumen: { danio: h.c.dano, defensa: h.c.def, res: [h.c.res.fuego, h.c.res.frio, h.c.res.rayo, h.c.res.veneno], peso: [ocup, BOLSA_W * BOLSA_H * 3] }, cuadro: 0 });
    cacheInv = { k: firma, c: rasterACanvas(p.img) };
  }
  ctx.drawImage(cacheInv.c, x, y);
  // pestañas y ordenar
  const yt = BOLSA_HUD.y - 14;
  for (let b2 = 0; b2 < BOLSA_HUD.bolsas; b2++) if (dentro(x + BOLSA_HUD.x + b2 * 40, y + yt, 38, 13) && E.clicIzq) { E.clicIzq = false; (ui as any).bolsaActiva = b2; Sonido.efecto('click'); }
  if (dentro(x + 320 - 15 - 70, y + yt - 1, 70, 14) && E.clicIzq) { E.clicIzq = false; ordenarBolsa(d.bolsa, act); Sonido.efecto('equipar'); }
  if (ui.mano) for (let b2 = 0; b2 < BOLSA_HUD.bolsas; b2++) if (dentro(x + BOLSA_HUD.x + b2 * 40, y + yt, 38, 13)) (ui as any).bolsaActiva = b2;
  // equipo
  for (const e of EQUIPO_HUD) {
    const cas = CAS_HUD[e.id]; if (!cas) continue;
    const o = h.d.equipo[cas];
    const ex = x + e.x, ey = y + e.y;
    if (o && o.durabMax && o.durab <= 0) { ctx.fillStyle = 'rgba(160,0,0,0.35)'; ctx.fillRect(ex, ey, e.w, e.h); }
    // destello corto en la casilla que se acaba de equipar
    const fl = (ui as any).destello as { cas: Casilla; t: number } | undefined;
    if (fl && fl.cas === cas) { const k = 1 - (performance.now() - fl.t) / 500; if (k > 0) { ctx.save(); ctx.fillStyle = `rgba(255,220,120,${0.45 * k})`; ctx.fillRect(ex, ey, e.w, e.h); ctx.strokeStyle = `rgba(255,240,180,${k})`; ctx.lineWidth = 2; ctx.strokeRect(ex + 1, ey + 1, e.w - 2, e.h - 2); ctx.restore(); } }
    if (dentro(ex, ey, e.w, e.h)) {
      if (ui.mano) { const ok = ranuraCasa(ui.mano, cas) && cumpleReq(h.d, h.c, ui.mano); ctx.strokeStyle = ok ? '#40ff40' : '#ff4040'; ctx.strokeRect(ex + 1, ey + 1, e.w - 2, e.h - 2); }
      else if (o) ui.encima = { o, x: ex + e.w / 2, y: ey, comparar: false };
      if (E.clicIzq) { E.clicIzq = false; clicEquipo(j, cas); }
    }
  }
  rejillaObjetos(j, h.d.bolsa, x + BOLSA_HUD.x, y + BOLSA_HUD.y, BOLSA_W, BOLSA_H, t, 'bolsa', act);
  panelThor(j, x - 128, y + 40, t);
}
/** El panel de Thor, pegado al inventario: su retrato, sus stats y sus dos casillas (collar y barda). */
function panelThor(j: Juego, x: number, y: number, t: number) {
  const h = j.heroe, d = h.d, th = (d.thor ??= {});
  const W2 = 122, H2 = 236;
  marco(x, y, W2, H2);
  titulo('Thor', x, y - 6, W2);
  // retrato: su sprite del tramo actual, quieto mirando al frente
  const m = thorDe(j), tr = tramoThor(d);
  const fs = cuadrosMonstruo(m?.def.sprite ?? `thor_${tr}`, 'quieto', 's');
  ctx.fillStyle = '#0a0806'; ctx.fillRect(x + 8, y + 30, W2 - 16, 74);
  if (fs.length) { const q = fs[Math.floor(t * 4) % fs.length]; ctx.save(); ctx.imageSmoothingEnabled = false; dibujarCuadro(ctx, q, x + W2 / 2, y + 96, 1.4); ctx.restore(); }
  else texto(T('descansando', 'resting'), x + W2 / 2, y + 66, { color: '#a09070', tam: 10, alin: 'center' });
  // stats
  let ly = y + 116;
  const linea = (a: string, col = '#d8ccb0') => { texto(a, x + 10, ly, { color: col, tam: 10 }); ly += 13; };
  linea(`${T('Nivel', 'Level')} ${d.nivel}  ·  ${T('tramo', 'tier')} ${tr}`);
  if (m) { linea(`${T('Vida', 'Life')} ${Math.round(m.vida)} / ${m.vidaMax}`); linea(`${T('Daño', 'Damage')} ${Math.round(m.dano[0])}-${Math.round(m.dano[1])}`); }
  else linea(T(`Vuelve en ${Math.ceil(th.descanso ?? 0)} s`, `Back in ${Math.ceil(th.descanso ?? 0)} s`), '#c0a070');
  // casillas
  const cas: [('collar' | 'barda'), number, number, number][] = [['collar', x + 14, y + 168, 40], ['barda', x + 64, y + 160, 48]];
  for (const [tipo, cx, cy, s] of cas) {
    const o = tipo === 'collar' ? th.collar : th.bardaObj;
    ctx.fillStyle = '#0d0a08'; ctx.fillRect(cx, cy, s, s); ctx.strokeStyle = '#5a4630'; ctx.strokeRect(cx + 0.5, cy + 0.5, s - 1, s - 1);
    if (o) iconoThor(o, cx, cy, s, s, t);
    else texto(tipo === 'collar' ? T('collar', 'collar') : T('barda', 'barding'), cx + s / 2, cy + s / 2 + 3, { color: '#6a5a40', tam: 9, alin: 'center' });
    if (!dentro(cx, cy, s, s)) continue;
    const vale = ui.mano && ui.mano.tipo === 'thor' && ui.mano.base === `thor_${tipo}`;
    if (ui.mano) { ctx.strokeStyle = vale ? '#40ff40' : '#ff4040'; ctx.strokeRect(cx + 1, cy + 1, s - 2, s - 2); }
    else if (o) ui.encima = { o, x: cx + s / 2, y: cy, comparar: false };
    if (E.clicIzq) { E.clicIzq = false; ponerThor(j, tipo); }
  }
}
/** Pone (o saca) el collar o la barda de Thor con lo que hay en la mano. */
function ponerThor(j: Juego, tipo: 'collar' | 'barda', o?: Objeto) {
  const th = (j.heroe.d.thor ??= {}); const nuevo = o ?? ui.mano;
  if (nuevo && !(nuevo.tipo === 'thor' && nuevo.base === `thor_${tipo}`)) { Sonido.efecto('negado'); return null; }
  const viejo = (tipo === 'collar' ? th.collar : th.bardaObj) ?? null;
  if (tipo === 'collar') th.collar = nuevo ?? undefined; else { th.bardaObj = nuevo ?? undefined; th.barda = nuevo?.tramo ?? 0; }
  if (!o) ui.mano = viejo;
  Sonido.efecto('equipar');
  return viejo;
}
const GEMA_HUD: Record<string, string> = { rubi: 'rubi', zafiro: 'zafiro', topacio: 'topacio', esmeralda: 'esmeralda', amatista: 'amatista', diamante: 'diamante', calavera: 'diamante' };
function gemaDe(id?: string): string | null { if (!id) return null; const k = Object.keys(GEMA_HUD).find((g) => id.startsWith(g)); return k ? GEMA_HUD[k] : 'runa'; }
function ordenarBolsa(lista: EnBolsa[], b: number) {
  const mios = lista.filter((e) => (e.b ?? 0) === b).sort((p, q) => q.o.h * q.o.w - p.o.h * p.o.w || q.o.h - p.o.h);
  for (const e of mios) lista.splice(lista.indexOf(e), 1);
  for (const e of mios) { const p = lugarEn(lista, e.o, BOLSA_W, BOLSA_H, b) ?? [e.x, e.y]; lista.push({ o: e.o, x: p[0], y: p[1], b }); }
}
function ranuraCasa(o: Objeto, cas: Casilla) {
  const r = baseDe(o)?.ranura; if (!r || o.tipo !== 'equipo') return false;
  if (r === 'anillo') return cas === 'anillo1' || cas === 'anillo2';
  return r === cas;
}
function clicEquipo(j: Juego, cas: Casilla) {
  const h = j.heroe, actual = h.d.equipo[cas] ?? null;
  if (ui.mano) {
    // gema en un objeto con huecos
    if ((ui.mano.tipo === 'gema' || ui.mano.tipo === 'runa') && actual && actual.huecos > actual.engarces.length) { if (engarzar(actual, ui.mano)) { ui.mano = null; Sonido.efecto('equipar'); recalc(j); } return; }
    if (!ranuraCasa(ui.mano, cas)) { Sonido.efecto('negado'); return; }
    if (!cumpleReq(h.d, h.c, ui.mano)) { Sonido.efecto('negado'); msg(j, ['No cumplo los requisitos.', 'I do not meet the requirements.'], '#ff5050'); return; }
    // dos manos y escudo
    const b = baseDe(ui.mano)!;
    if (cas === 'izq' && h.d.equipo.arma && baseDe(h.d.equipo.arma)?.dosManos) { Sonido.efecto('negado'); msg(j, ['Llevo un arma a dos manos.', 'I am wielding a two-handed weapon.']); return; }
    h.d.equipo[cas] = ui.mano; ui.mano = actual;
    if (cas === 'arma' && b.dosManos && h.d.equipo.izq && !ui.mano) { ui.mano = h.d.equipo.izq; delete h.d.equipo.izq; }
    sonidoEquipar(h.d.equipo[cas]!); (ui as any).destello = { cas, t: performance.now() };
  } else if (actual) { ui.mano = actual; delete h.d.equipo[cas]; Sonido.efecto('equipar'); }
  recalc(j);
}
/** El sonido de ponerse algo: metal para armas y armaduras pesadas, tela o cuero para lo liviano, tintineo para joyas. */
function sonidoEquipar(o: Objeto) {
  const b = baseDe(o);
  if (b?.ranura === 'anillo' || b?.ranura === 'amuleto' || b?.ranura === 'talisman') Sonido.efecto('equipar', { tono: 1.7, vol: 0.6 });
  else if (b?.arma || (b?.req.fue ?? 0) >= 30) Sonido.efecto('equipar', { tono: 0.85 });
  else Sonido.efecto('equipar', { tono: 0.55, vol: 0.7 });
}
/** Casilla a la que va un objeto con equipar rápido: los anillos al dedo libre, o en lugar del izquierdo. */
function casillaPara(j: Juego, o: Objeto): Casilla | null {
  const r = baseDe(o)?.ranura; if (!r || o.tipo !== 'equipo') return null;
  const eq = j.heroe.d.equipo;
  if (r === 'anillo') return !eq.anillo1 ? 'anillo1' : !eq.anillo2 ? 'anillo2' : 'anillo1';
  return r as Casilla;
}
/**
 * Equipar de un clic (clic derecho o doble clic en la bolsa): se pone el objeto y lo que llevaba vuelve a la bolsa,
 * a la misma casilla si cabe o a la primera libre. Un arma a dos manos manda el escudo a la bolsa, y un escudo con un
 * arma a dos manos puesta manda el arma. Devuelve false (y no toca nada) si no cumple requisitos o no hay lugar.
 */
export function equiparRapido(j: Juego, e: EnBolsa, todos: EnBolsa[]): boolean {
  const h = j.heroe, d = h.d, o = e.o, b = baseDe(o);
  const cas = casillaPara(j, o); if (!cas || !b) return false;
  if (!cumpleReq(d, h.c, o)) { Sonido.efecto('negado'); msg(j, ['No cumplo los requisitos para llevar eso.', 'I do not meet the requirements to wear that.'], '#ff5050'); return false; }
  const sale: Objeto[] = [];
  if (d.equipo[cas]) sale.push(d.equipo[cas]!);
  if (cas === 'arma' && b.dosManos && d.equipo.izq) sale.push(d.equipo.izq);
  if (cas === 'izq' && d.equipo.arma && baseDe(d.equipo.arma)?.dosManos) sale.push(d.equipo.arma);
  const i = todos.indexOf(e); if (i >= 0) todos.splice(i, 1);
  const puestos: EnBolsa[] = [];
  for (const [k, s2] of sale.entries()) {
    const bb = e.b ?? 0;
    const p: [number, number, number] | null = k === 0 && e.x + s2.w <= BOLSA_W && e.y + s2.h <= BOLSA_H && libre(todos, e.x, e.y, s2.w, s2.h, undefined, bb) ? [e.x, e.y, bb] : lugarBolsa(todos, s2);
    if (!p) {
      for (const q of puestos) todos.splice(todos.indexOf(q), 1);
      todos.push(e); Sonido.efecto('negado'); msg(j, ['No tengo lugar en la bolsa para cambiarlo.', 'I have no room in the bag to swap it.'], '#ff5050');
      return false;
    }
    const nb: EnBolsa = { o: s2, x: p[0], y: p[1], b: p[2] }; todos.push(nb); puestos.push(nb);
  }
  for (const s2 of sale) for (const c of CASILLAS) if (d.equipo[c] === s2) delete d.equipo[c];
  d.equipo[cas] = o;
  sonidoEquipar(o); (ui as any).destello = { cas, t: performance.now() };
  recalc(j);
  return true;
}
/** Lo último que se levantó de la bolsa y de dónde: para reconocer el doble clic. */
function levantadoDe(e: EnBolsa | null) { (ui as any).levantado = e ? { o: e.o, x: e.x, y: e.y, b: e.b ?? 0, t: performance.now(), mx: E.x, my: E.y } : null; }
/** Rejilla de objetos (bolsa, cofre, tienda). */
function rejillaObjetos(j: Juego, todos: EnBolsa[], x: number, y: number, cw: number, ch: number, t: number, tipo: 'bolsa' | 'cofre' | 'tienda', bb?: number) {
  const C = CELDA_INV;
  const lista = bb === undefined ? todos : todos.filter((e) => (e.b ?? 0) === bb);
  const quitar = (e: EnBolsa) => { const i = todos.indexOf(e); if (i >= 0) todos.splice(i, 1); };
  const poner = (e: EnBolsa) => { if (bb !== undefined) e.b = bb; todos.push(e); };
  if (tipo !== 'bolsa') { ctx.fillStyle = '#0a0806'; ctx.fillRect(x, y, cw * C, ch * C); ctx.strokeStyle = '#2a2219'; for (let i = 0; i <= cw; i++) { ctx.beginPath(); ctx.moveTo(x + i * C + 0.5, y); ctx.lineTo(x + i * C + 0.5, y + ch * C); ctx.stroke(); } for (let k = 0; k <= ch; k++) { ctx.beginPath(); ctx.moveTo(x, y + k * C + 0.5); ctx.lineTo(x + cw * C, y + k * C + 0.5); ctx.stroke(); } }
  if (tipo !== 'bolsa') for (const b of lista) {
    const ox = x + b.x * C, oy = y + b.y * C;
    ctx.fillStyle = b.o.rareza === 'normal' ? 'rgba(40,40,60,0.35)' : colorObj(b.o) + '30'; ctx.fillRect(ox + 1, oy + 1, b.o.w * C - 1, b.o.h * C - 1);
    if (tipo === 'tienda' && ui.tiendaTipo === 'vidente') { ctx.globalAlpha = 0.85; }
    icono(b.o, ox + 1, oy + 1, b.o.w * C - 1, b.o.h * C - 1, t);
    ctx.globalAlpha = 1;
    if (!cumpleReq(j.heroe.d, j.heroe.c, b.o) && b.o.tipo === 'equipo') { ctx.fillStyle = 'rgba(200,20,20,0.32)'; ctx.fillRect(ox + 1, oy + 1, b.o.w * C - 1, b.o.h * C - 1); }
  }
  // el equipo de Thor lleva su ícono propio de la Forja encima del que pinta el panel
  if (tipo === 'bolsa') for (const b of lista) if (b.o.tipo === 'thor') { const ox = x + b.x * C + 1, oy = y + b.y * C + 1, w = b.o.w * C - 2, hh = b.o.h * C - 2; ctx.fillStyle = '#0e0b09'; ctx.fillRect(ox, oy, w, hh); ctx.fillStyle = colorObj(b.o) + '30'; ctx.fillRect(ox, oy, w, hh); iconoThor(b.o, ox, oy, w, hh, t); }
  // la bolsa la pinta el panel de la Forja: encima, en rojo, lo que el héroe todavía no puede llevar
  if (tipo === 'bolsa') for (const b of lista) if (b.o.tipo === 'equipo' && !cumpleReq(j.heroe.d, j.heroe.c, b.o)) { ctx.fillStyle = 'rgba(200,20,20,0.32)'; ctx.fillRect(x + b.x * C + 1, y + b.y * C + 1, b.o.w * C - 2, b.o.h * C - 2); ctx.strokeStyle = 'rgba(255,60,60,0.7)'; ctx.strokeRect(x + b.x * C + 1.5, y + b.y * C + 1.5, b.o.w * C - 3, b.o.h * C - 3); }
  // pilas de pociones: el número en la esquina
  for (const b of lista) if (b.o.tipo === 'pocion' && cant(b.o) > 1) texto(String(cant(b.o)), x + (b.x + b.o.w) * C - 3, y + (b.y + b.o.h) * C - 4, { tam: 11, alin: 'right', color: '#ffffff' });
  if (ui.ficha || !dentro(x, y, cw * C, ch * C)) return;
  const cx = Math.floor((E.x - x) / C), cy = Math.floor((E.y - y) / C);
  const bajo = lista.find((b) => cx >= b.x && cx < b.x + b.o.w && cy >= b.y && cy < b.y + b.o.h);
  if (ui.mano) {
    const mx = Math.round((E.x - x) / C - ui.mano.w / 2), my = Math.round((E.y - y) / C - ui.mano.h / 2);
    const px = Math.max(0, Math.min(cw - ui.mano.w, mx)), py = Math.max(0, Math.min(ch - ui.mano.h, my));
    const choques = lista.filter((b) => px < b.x + b.o.w && px + ui.mano!.w > b.x && py < b.y + b.o.h && py + ui.mano!.h > b.y);
    ctx.fillStyle = choques.length > 1 ? 'rgba(200,0,0,0.25)' : 'rgba(0,200,0,0.2)'; ctx.fillRect(x + px * C, y + py * C, ui.mano.w * C, ui.mano.h * C);
    if (E.clicIzq) {
      E.clicIzq = false;
      if (tipo === 'tienda') { venderMano(j); return; }
      // doble clic sobre lo que se acaba de levantar: equiparlo (vuelve a su casilla si no se puede)
      const lev = (ui as any).levantado;
      if (tipo === 'bolsa' && lev && lev.o === ui.mano && performance.now() - lev.t < 350 && Math.hypot(E.x - lev.mx, E.y - lev.my) < 6) {
        levantadoDe(null);
        const e: EnBolsa = { o: ui.mano, x: lev.x, y: lev.y, b: lev.b }; todos.push(e); ui.mano = null;
        if (ui.izq !== 'tienda' && ui.izq !== 'cofre' && e.o.tipo === 'equipo') equiparRapido(j, e, todos);
        return;
      }
      // pociones: se apilan con las iguales (hasta 20 por casilla)
      const tope = tipo === 'bolsa' ? PILA_BOLSA : 99;
      if (bajo && apilable(bajo.o, ui.mano) && cant(bajo.o) < tope) {
        const n = Math.min(tope - cant(bajo.o), cant(ui.mano));
        bajo.o.cantidad = cant(bajo.o) + n; ui.mano.cantidad = cant(ui.mano) - n; if (ui.mano.cantidad <= 0) ui.mano = null;
        Sonido.efecto('objeto_cae', { vol: 0.4 }); return;
      }
      // engarzar
      if ((ui.mano.tipo === 'gema' || ui.mano.tipo === 'runa') && bajo && bajo.o.huecos > bajo.o.engarces.length && bajo.o.tipo === 'equipo') { if (engarzar(bajo.o, ui.mano)) { ui.mano = null; Sonido.efecto('equipar'); } return; }
      if (choques.length === 0) { poner({ o: ui.mano, x: px, y: py }); ui.mano = null; Sonido.efecto('objeto_cae', { vol: 0.5 }); }
      else if (choques.length === 1) { const c = choques[0]; quitar(c); poner({ o: ui.mano, x: px, y: py }); ui.mano = c.o; Sonido.efecto('objeto_cae', { vol: 0.5 }); }
    }
    return;
  }
  if (!bajo) return;
  ctx.strokeStyle = '#c0a060'; ctx.strokeRect(x + bajo.x * C + 0.5, y + bajo.y * C + 0.5, bajo.o.w * C, bajo.o.h * C);
  ui.encima = { o: bajo.o, x: x + (bajo.x + bajo.o.w / 2) * C, y: y + bajo.y * C, comparar: bajo.o.tipo === 'equipo', tienda: tipo === 'tienda', bolsa: tipo === 'bolsa' };
  // táctil: tocar un objeto de la tienda o de la bolsa abre su ficha (no compra ni lo levanta de un toque)
  if (E.clicIzq && E.tactil && (tipo === 'tienda' || tipo === 'bolsa')) { E.clicIzq = false; ui.ficha = { e: bajo, tipo, todos }; ui.encima = null; Sonido.efecto('click'); return; }
  if (E.clicIzq) {
    E.clicIzq = false;
    if (tipo === 'tienda') { comprar(j, bajo); return; }
    // Shift + clic en una poción de la bolsa: al cinturón
    if (tipo === 'bolsa' && E.shift && bajo.o.tipo === 'pocion') {
      const antes = cant(bajo.o);
      if (alCinturon(j.heroe.d, bajo.o)) { quitar(bajo); Sonido.efecto('click'); }
      else { if (cant(bajo.o) < antes) Sonido.efecto('click'); cinturonLleno(j); }
      return;
    }
    quitar(bajo); ui.mano = bajo.o; Sonido.efecto('click');
    if (tipo === 'bolsa') levantadoDe(bajo);
  } else if (E.clicDer) {
    E.clicDer = false;
    if (tipo === 'tienda') { comprar(j, bajo); return; }
    if (tipo === 'bolsa' && (ui.izq === 'tienda')) { quitar(bajo); ui.mano = bajo.o; venderMano(j); return; }
    if (tipo === 'bolsa' && ui.izq === 'cofre') { const p = lugarEn(ui.cofre, bajo.o, COFRE_W, COFRE_H); if (p) { quitar(bajo); ui.cofre.push({ o: bajo.o, x: p[0], y: p[1] }); } return; }
    if (tipo === 'cofre') { if (meterEnBolsa(j.heroe.d, bajo.o)) quitar(bajo); else { Sonido.efecto('negado'); msg(j, ['No tengo lugar.', 'I have no room.'], '#ff8060'); } return; }
    if (tipo !== 'bolsa') return;
    const o = bajo.o;
    // clic derecho en una poción de la bolsa: tomarse una
    if (o.tipo === 'pocion') { beberPocion(j, o); if (cant(o) > 1) o.cantidad = cant(o) - 1; else quitar(bajo); return; }
    if (o.base === 'pergamino_portal') { abrirPortal(j); return; }
    if (o.base === 'pergamino_olvido') { quitar(bajo); olvidar(j); return; }
    if (o.tipo === 'thor') { // ponérselo a Thor: lo que tenía vuelve a la bolsa
      quitar(bajo); const viejo = ponerThor(j, o.base === 'thor_collar' ? 'collar' : 'barda', o);
      if (viejo) { const p = lugarBolsa(todos, viejo); if (p) todos.push({ o: viejo, x: p[0], y: p[1], b: p[2] }); else ui.mano = viejo; }
      return;
    }
    if (o.tipo === 'equipo') equiparRapido(j, bajo, todos);
  }
}
export function lugarEn(lista: EnBolsa[], o: Objeto, cw: number, ch: number, b = 0): [number, number] | null {
  for (let x = 0; x <= cw - o.w; x++) for (let y = 0; y <= ch - o.h; y++) if (libre(lista, x, y, o.w, o.h, undefined, b)) return [x, y];
  return null;
}
export function lugarBolsa(lista: EnBolsa[], o: Objeto): [number, number, number] | null {
  for (let b = 0; b < 3; b++) { const p = lugarEn(lista, o, BOLSA_W, BOLSA_H, b); if (p) return [p[0], p[1], b]; }
  return null;
}
/** El tooltip del objeto bajo el ratón, con comparación con lo equipado. */
export function dibujarTooltipObjeto(j: Juego) {
  const e = ui.encima; if (!e || ui.mano) return;
  const h = j.heroe;
  const l = [...lineasObjeto(e.o, { nivel: h.d.nivel, fue: h.c.fue, des: h.c.des, clase: h.d.clase, conjuntos: h.c.conjuntos }), ...lineaCantidad(e.o)];
  if (e.tienda) { const p = ui.tiendaTipo === 'vidente' ? precioApuesta(e.o) : precioCompra(e.o); l.push([`${T('Precio', 'Price')}: ${p.toLocaleString()} ${T('de oro', 'gold')}`, h.d.oro >= p ? '#e8c050' : '#ff4040']); }
  else if (ui.izq === 'tienda') l.push([`${T('Clic derecho: vender por', 'Right click: sell for')} ${precioVenta(e.o)}`, '#e8c050']);
  else if (e.bolsa && e.o.tipo === 'equipo' && ui.izq !== 'cofre') l.push([T('Clic derecho o doble clic: equipar', 'Right click or double click: equip'), '#a09070']);
  else if (e.bolsa && e.o.tipo === 'pocion' && ui.izq !== 'cofre') l.push([T('Shift + clic: al cinturón', 'Shift + click: to belt'), '#a09070']);
  tooltip(l, e.x, e.y, e.comparar ? comparacion(j, e.o) : undefined);
}
/** Contra lo que llevas puesto en esa casilla: daño, defensa y cada propiedad, en verde si mejora y en rojo si empeora. */
function comparacion(j: Juego, o: Objeto): [string, string][] | undefined {
  const h = j.heroe;
  const cas = casillaPara(j, o);
  const actual = cas ? h.d.equipo[cas] : undefined;
  if (!actual && cas && !Object.values(h.d.equipo).includes(o)) return [[T('Casilla vacía: todo suma', 'Empty slot: all gain'), '#60ff60']];
  if (!actual || actual === o) return undefined;
  const extra: [string, string][] = [[T('Contra lo equipado:', 'Against equipped:'), '#808080'], [TT(actual.nombre), colorObj(actual)]];
  if (actual.dano && o.dano) { const d = (o.dano[0] + o.dano[1]) / 2 - (actual.dano[0] + actual.dano[1]) / 2; extra.push([`${T('Daño', 'Damage')} ${d >= 0 ? '+' : ''}${d.toFixed(1)}`, d >= 0 ? '#60ff60' : '#ff6060']); }
  { const va = (baseDe(actual) as any)?.vel ?? 0, vo = (baseDe(o) as any)?.vel ?? 0; if (actual.dano && o.dano && va !== vo) extra.push([vo < va ? T('Más rápida', 'Faster') : T('Más lenta', 'Slower'), vo < va ? '#60ff60' : '#ff6060']); }
  if (actual.def !== undefined && o.def !== undefined) { const d = o.def - actual.def; extra.push([`${T('Defensa', 'Defense')} ${d >= 0 ? '+' : ''}${d}`, d >= 0 ? '#60ff60' : '#ff6060']); }
  // las propiedades que cambian (suma de cada stat: lo nuevo menos lo puesto)
  const suma = (q: Objeto) => { const m = new Map<string, number>(); for (const [k, v] of q.stats) m.set(String(k), (m.get(String(k)) ?? 0) + v); return m; };
  const a = suma(o), b2 = suma(actual);
  for (const k of new Set([...a.keys(), ...b2.keys()])) {
    const dv = (a.get(k) ?? 0) - (b2.get(k) ?? 0); if (!dv) continue;
    extra.push([textoStat(k, dv, IDI), dv > 0 ? '#60ff60' : '#ff6060']);
    if (extra.length > 14) break;
  }
  return extra;
}

// ---------------- ficha táctil del objeto (tienda y bolsa)
interface BotonFicha { txt: string; r: [number, number, number, number]; acc: () => void; color?: string }
function armarFicha(j: Juego) {
  const f = ui.ficha!; const h = j.heroe, o = f.e.o;
  const l: [string, string][] = [...lineasObjeto(o, { nivel: h.d.nivel, fue: h.c.fue, des: h.c.des, clase: h.d.clase, conjuntos: h.c.conjuntos }), ...lineaCantidad(o)];
  if (f.tipo === 'tienda') { const p = ui.tiendaTipo === 'vidente' ? precioApuesta(o) : precioCompra(o); l.push([`${T('Precio', 'Price')}: ${p.toLocaleString()} ${T('de oro', 'gold')}`, h.d.oro >= p ? '#e8c050' : '#ff4040']); }
  else if (ui.izq === 'tienda') l.push([`${T('Se vende por', 'Sells for')} ${precioVenta(o).toLocaleString()} ${T('de oro', 'gold')}`, '#e8c050']);
  const cmp = o.tipo === 'equipo' ? comparacion(j, o) : undefined;
  const todas = cmp ? [...l, ['', '#000'] as [string, string], ...cmp] : l;
  const quitar = () => { const i = f.todos.indexOf(f.e); if (i >= 0) f.todos.splice(i, 1); };
  const acc: { txt: string; fn: () => void; color?: string }[] = [];
  if (f.tipo === 'tienda') acc.push({ txt: T('Comprar', 'Buy'), fn: () => comprar(j, f.e), color: '#e8c050' });
  else {
    if (o.tipo === 'equipo' && ui.izq !== 'tienda' && ui.izq !== 'cofre') acc.push({ txt: T('Equipar', 'Equip'), fn: () => { equiparRapido(j, f.e, f.todos); }, color: '#80e080' });
    if (o.base === 'pergamino_portal') acc.push({ txt: T('Usar', 'Use'), fn: () => abrirPortal(j) });
    if (o.base === 'pergamino_olvido') acc.push({ txt: T('Usar', 'Use'), fn: () => { quitar(); olvidar(j); } });
    if (o.tipo === 'pocion') acc.push({ txt: T('Beber', 'Drink'), fn: () => { beberPocion(j, o); if (cant(o) > 1) o.cantidad = cant(o) - 1; else quitar(); } });
    if (ui.izq === 'tienda') acc.push({ txt: T('Vender', 'Sell'), fn: () => { quitar(); ui.mano = o; venderMano(j); }, color: '#e8c050' });
    acc.push({ txt: T('Mover', 'Move'), fn: () => { quitar(); ui.mano = o; levantadoDe(f.e); } });
  }
  acc.push({ txt: T('Cerrar', 'Close'), fn: () => { /* nada */ } });
  let w = 0; for (const [s2] of todas) w = Math.max(w, ancho(s2, 14));
  w = Math.min(W - 16, Math.max(w + 32, acc.length * 96 + 16));
  const lh = 17, bh = 44, hh = todas.length * lh + 22 + bh + 12;
  const x = Math.round(W / 2 - w / 2), y = Math.round(Math.max(8, Math.min(H - hh - 8, H / 2 - hh / 2)));
  const bw = (w - 16 - (acc.length - 1) * 8) / acc.length;
  const botones: BotonFicha[] = acc.map((a, i) => ({ txt: a.txt, r: [x + 8 + i * (bw + 8), y + hh - bh - 8, bw, bh], acc: a.fn, color: a.color }));
  return { x, y, w, hh, todas, lh, botones, o };
}
(window as any).__ficha = () => (ui.ficha && (window as any).__juego ? armarFicha((window as any).__juego()).botones.map((q) => ({ txt: q.txt, r: q.r })) : null);
/** Antes de los paneles: la ficha se queda con el toque (un botón, o fuera de la ficha la cierra). */
export function entradaFicha(j: Juego) {
  if (!ui.ficha) return;
  if (!ui.ficha.todos.includes(ui.ficha.e) || (ui.ficha.tipo === 'tienda' && ui.izq !== 'tienda')) { ui.ficha = null; return; }
  ui.sobreUI = true;
  if (!E.clicIzq) return;
  E.clicIzq = false;
  const f = armarFicha(j);
  const b = f.botones.find((q) => dentro(q.r[0], q.r[1], q.r[2], q.r[3]));
  if (b) { Sonido.efecto('click'); ui.ficha = null; b.acc(); }
  else if (!dentro(f.x, f.y, f.w, f.hh)) ui.ficha = null;
}
/** Después de los paneles: la ficha encima de todo. */
export function dibujarFicha(j: Juego, t: number) {
  if (!ui.ficha) return;
  const f = armarFicha(j);
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(8,6,5,0.97)'; ctx.fillRect(f.x, f.y, f.w, f.hh); ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; ctx.strokeRect(f.x + 1, f.y + 1, f.w - 2, f.hh - 2);
  f.todas.forEach(([s2, c], i) => texto(s2, f.x + f.w / 2, f.y + 24 + i * f.lh, { color: c, alin: 'center', tam: 14 }));
  for (const b of f.botones) { boton(b.txt, b.r[0], b.r[1], b.r[2], b.r[3], { tam: 15, color: b.color }); }
  ctx.restore();
  void t;
}

// ---------------- ficha del personaje
function panelPers(j: Juego, x: number, y: number) {
  const h = j.heroe, d = h.d, c = h.c;
  marco(x, y, 320, 432); titulo(T('Personaje', 'Character'), x, y, 320);
  const cl = CLASES.find((q) => q.id === d.clase)!;
  texto(d.nombre, x + 20, y + 54, { tam: 16, color: '#f0e0b0', fuente: TITULO });
  texto(`${TT(cl.nombre)} · ${T('Nivel', 'Level')} ${d.nivel}`, x + 20, y + 72, { color: '#c0b090' });
  texto(`${T('Experiencia', 'Experience')}: ${d.xp.toLocaleString()}`, x + 20, y + 90, { tam: 12 });
  texto(`${T('Siguiente', 'Next')}: ${xpPara(d.nivel + 1).toLocaleString()}`, x + 20, y + 104, { tam: 12 });
  const atr: [string, string, keyof typeof d, number][] = [[T('Fuerza', 'Strength'), 'fue', 'fue', c.fue], [T('Destreza', 'Dexterity'), 'des', 'des', c.des], [T('Vitalidad', 'Vitality'), 'vit', 'vit', c.vit], [T('Energía', 'Energy'), 'ene', 'ene', c.ene]];
  atr.forEach(([n, , k, v], i) => {
    const yy = y + 130 + i * 30;
    ctx.fillStyle = '#1a1510'; ctx.fillRect(x + 16, yy - 15, 190, 22);
    texto(n, x + 22, yy, {}); texto(String(v), x + 196, yy, { alin: 'right', color: v > (d[k] as number) ? '#7c94ff' : '#f0e0b0' });
    if (d.puntosAtrib > 0 && boton('+', x + 212, yy - 16, 24, 22, { tam: 16 })) { (d as any)[k]++; d.puntosAtrib--; recalc(j); E.clicIzq = false; }
  });
  if (d.puntosAtrib > 0) texto(`${T('Puntos', 'Points')}: ${d.puntosAtrib}`, x + 244, y + 140, { color: '#ffd060' });
  const filas: [string, string][] = [
    [T('Daño', 'Damage'), `${c.dano[0]} - ${c.dano[1]}`], [T('Índice de ataque', 'Attack rating'), String(c.precision)], [T('Defensa', 'Defense'), String(c.def)],
    [T('Vida', 'Life'), `${Math.ceil(h.vida)} / ${h.vidaMax}`], [T('Maná', 'Mana'), `${Math.floor(h.mana)} / ${c.manaMax}`],
    [T('Res. fuego', 'Fire res.'), c.res.fuego + '%'], [T('Res. frío', 'Cold res.'), c.res.frio + '%'], [T('Res. rayo', 'Lightning res.'), c.res.rayo + '%'], [T('Res. veneno', 'Poison res.'), c.res.veneno + '%'],
    [T('Bloqueo', 'Block'), c.bloqueo + '%'], [T('Golpe crítico', 'Critical strike'), c.critico + '%'], [T('Hallazgo mágico', 'Magic find'), c.hallazgo + '%'],
  ];
  filas.forEach(([a, b], i) => { const col = i % 2, fila = Math.floor(i / 2); const xx = x + 18 + col * 150, yy = y + 268 + fila * 22; texto(a, xx, yy, { tam: 12, color: '#a09070' }); texto(b, xx + 140, yy, { tam: 12, alin: 'right', color: b.startsWith('-') ? '#ff6060' : '#f0e0b0' }); });
  if (Object.keys(c.conjuntos).length) texto(T('Bonos de conjunto activos', 'Set bonuses active'), x + 18, y + 408, { tam: 12, color: '#40d040' });
}

// ---------------- árbol de habilidades: tres columnas (una por rama), filas por nivel 1/6/12/18/24/30
const PANEL_W = 320, PANEL_H = 432;
const ICONO = 34, FILA = 54, COL = 94, ARBOL_X = 28, ARBOL_Y = 72;
/** Posición (centro) de cada habilidad de la clase en el árbol, relativa al panel. */
function posArbol(clase: string): Map<string, [number, number]> {
  const pos = new Map<string, [number, number]>();
  const todas = habilidadesDe(clase as any);
  for (const r of [0, 1, 2] as const) TIERS.forEach((t, fila) => {
    const hs = todas.filter((hb) => hb.rama === r && hb.nivelReq === t);
    const cx = ARBOL_X + r * COL;
    hs.forEach((hb, i) => pos.set(hb.id, [cx + (hs.length === 1 ? COL / 2 : i === 0 ? 25 : COL - 25), ARBOL_Y + fila * FILA + ICONO / 2 + 4]));
  });
  // las que no caen en una fila (por si acaso) van a la fila más cercana
  for (const hb of todas) if (!pos.has(hb.id)) { const f = TIERS.reduce((b, t, i) => (Math.abs(t - hb.nivelReq) < Math.abs(TIERS[b] - hb.nivelReq) ? i : b), 0); pos.set(hb.id, [ARBOL_X + hb.rama * COL + COL / 2, ARBOL_Y + f * FILA + ICONO / 2 + 4]); }
  return pos;
}
function aprender(j: Juego, hb: Habilidad) {
  const d = j.heroe.d, n = d.habs[hb.id] ?? 0;
  d.habs[hb.id] = n + 1; d.puntosHab--; Sonido.efecto('click'); recalc(j);
  if (n === 0 && hb.tipo !== 'pasiva') {
    if (d.der === 'ataque') d.der = hb.id;
    if (hb.tipo === 'aura' && !d.aura) d.aura = hb.id;
    if (!d.atajos.includes(hb.id)) { const libreI = d.atajos.findIndex((a) => !a); if (libreI >= 0) d.atajos[libreI] = hb.id; }
  }
}
function panelHabs(j: Juego, x: number, y: number) {
  const h = j.heroe, d = h.d, t = performance.now() / 1000;
  marco(x, y, PANEL_W, PANEL_H); titulo(T('Habilidades', 'Skills'), x, y, PANEL_W);
  const cl = CLASES.find((q) => q.id === d.clase)!;
  const pos = posArbol(d.clase);
  const lista = habilidadesDe(d.clase);
  // cabeceras de rama y guías de fila
  cl.ramas.forEach((r, i) => {
    const cx = x + ARBOL_X + i * COL;
    const pts = lista.filter((hb) => hb.rama === i).reduce((s, hb) => s + (d.habs[hb.id] ?? 0), 0);
    ctx.fillStyle = i % 2 ? 'rgba(255,240,200,0.025)' : 'rgba(0,0,0,0.18)'; ctx.fillRect(cx + 1, y + ARBOL_Y - 22, COL - 2, TIERS.length * FILA + 18);
    texto(TT(r), cx + COL / 2, y + ARBOL_Y - 8, { alin: 'center', tam: 13, color: pts ? '#f0d890' : '#a09070', fuente: TITULO, max: COL - 6 });
  });
  TIERS.forEach((tv, f) => {
    const yy = y + ARBOL_Y + f * FILA + ICONO / 2 + 8;
    const alcanzado = d.nivel >= tv;
    texto(String(tv), x + 15, yy, { alin: 'center', tam: 12, color: alcanzado ? '#d8c08a' : '#5a4c3a', negrita: true });
    if (f > 0) { ctx.fillStyle = 'rgba(90,74,48,0.35)'; ctx.fillRect(x + 6, y + ARBOL_Y + f * FILA - 6, PANEL_W - 12, 1); }
  });
  // líneas de requisitos
  ctx.save(); ctx.lineWidth = 2;
  for (const hb of lista) for (const rq of hb.req ?? []) {
    const a = pos.get(rq), b = pos.get(hb.id); if (!a || !b) continue;
    const ok = (d.habs[rq] ?? 0) > 0;
    ctx.strokeStyle = ok ? ((d.habs[hb.id] ?? 0) > 0 ? '#c8a050' : '#8a7040') : '#3a3026';
    // baja por su propia columna hasta justo encima del destino (así no cruza otros iconos) y entra en codo
    ctx.beginPath(); ctx.moveTo(x + a[0], y + a[1] + ICONO / 2); ctx.lineTo(x + a[0], y + b[1] - ICONO / 2 - 7);
    ctx.lineTo(x + b[0], y + b[1] - ICONO / 2 - 3); ctx.lineTo(x + b[0], y + b[1] - ICONO / 2); ctx.stroke();
  }
  ctx.restore();
  // iconos
  let encima: Habilidad | null = null, encimaY = 0;
  for (const hb of lista) {
    const p = pos.get(hb.id)!; const ix = x + p[0] - ICONO / 2, iy = y + p[1] - ICONO / 2;
    const n = d.habs[hb.id] ?? 0, puede = puedeAprender(d, hb);
    const bloqueado = n === 0 && !puede;
    const sobre = dentro(ix, iy, ICONO, ICONO);
    if (hb.definitiva) { ctx.fillStyle = bloqueado ? '#3a1a10' : '#8a3010'; ctx.fillRect(ix - 3, iy - 3, ICONO + 6, ICONO + 6); ctx.strokeStyle = bloqueado ? '#5a3a20' : '#ffb040'; ctx.lineWidth = 1; ctx.strokeRect(ix - 2.5, iy - 2.5, ICONO + 5, ICONO + 5); }
    iconoHab(hb, ix, iy, ICONO, bloqueado);
    if (bloqueado) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(ix, iy, ICONO, ICONO); }
    if (hb.tipo === 'pasiva') { ctx.strokeStyle = bloqueado ? '#303848' : '#7c94ff'; ctx.lineWidth = 1; ctx.strokeRect(ix + 2.5, iy + 2.5, ICONO - 5, ICONO - 5); }
    if (puede) { ctx.save(); ctx.globalAlpha = 0.55 + Math.sin(t * 5) * 0.35; ctx.strokeStyle = '#ffe070'; ctx.lineWidth = 2; ctx.strokeRect(ix - 1, iy - 1, ICONO + 2, ICONO + 2); ctx.restore(); }
    if (sobre) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(ix - 0.5, iy - 0.5, ICONO + 1, ICONO + 1); encima = hb; encimaY = iy + ICONO / 2; }
    // nivel
    if (n > 0 || puede) {
      const extra = n > 0 ? h.c.mas_habilidades : 0;
      const s = String(n + extra), bw = Math.max(13, ancho(s, 10) + 5);
      ctx.fillStyle = 'rgba(8,6,4,0.9)'; ctx.fillRect(ix + ICONO - bw + 3, iy + ICONO - 9, bw, 12);
      ctx.strokeStyle = n > 0 ? '#a08850' : '#5a4a30'; ctx.lineWidth = 1; ctx.strokeRect(ix + ICONO - bw + 3.5, iy + ICONO - 8.5, bw - 1, 11);
      texto(s, ix + ICONO + 3 - bw / 2, iy + ICONO + 1, { alin: 'center', tam: 10, color: extra ? '#7c94ff' : n > 0 ? '#ffe8a0' : '#908070', sombra: false });
    }
    if (sobre && E.clicIzq) { E.clicIzq = false; if (puede) aprender(j, hb); else Sonido.efecto('negado'); }
  }
  // pie: puntos y ayuda
  const py = y + PANEL_H - 22;
  ctx.fillStyle = '#1a1510'; ctx.fillRect(x + 10, py - 14, PANEL_W - 20, 22);
  texto(`${T('Puntos', 'Points')}: ${d.puntosHab}`, x + 18, py + 1, { tam: 13, color: d.puntosHab ? '#ffd060' : '#a09070', negrita: !!d.puntosHab });
  texto(d.puntosHab ? T('Clic en un icono que brilla', 'Click a glowing icon') : T('Pasa el ratón para ver detalles', 'Hover for details'), x + PANEL_W - 18, py + 1, { tam: 11, alin: 'right', color: '#807060' });
  if (encima) tooltipAl(lineasHab(j, encima, true), x - 6, encimaY);
}
/** Tooltip pegado a la izquierda de x (para paneles del lado derecho), centrado en y. */
function tooltipAl(lineas: [string, string][], xDer: number, yc: number) {
  let w = 0; for (const [s] of lineas) w = Math.max(w, ancho(s, 12));
  w += 20; const hh = lineas.length * 15 + 12;
  let tx = xDer - w; if (tx < 4) tx = Math.min(W - w - 4, xDer + PANEL_W + 12);
  const ty = Math.max(4, Math.min(H - BAR_H - hh - 4, yc - hh / 2));
  ctx.fillStyle = 'rgba(6,5,4,0.95)'; ctx.fillRect(tx, ty, w, hh);
  ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 1; ctx.strokeRect(tx + 0.5, ty + 0.5, w - 1, hh - 1);
  lineas.forEach(([s, c], i) => { if (s) texto(s, tx + 10, ty + 18 + i * 15, { color: c, tam: 12 }); else { ctx.fillStyle = '#3a3024'; ctx.fillRect(tx + 10, ty + 11 + i * 15, w - 20, 1); } });
}
const ETIQ: Record<string, [string, string]> = {
  esquiva: ['+{v}% de esquiva', '+{v}% dodge'], vida_pct: ['+{v}% de vida', '+{v}% life'], mana_pct: ['+{v}% de maná', '+{v}% mana'],
  fuego_pct: ['+{v}% de daño de fuego', '+{v}% fire damage'], frio_pct: ['+{v}% de daño de escarcha', '+{v}% frost damage'], rayo_pct: ['+{v}% de daño de rayo', '+{v}% lightning damage'],
  veneno_pct: ['+{v}% de daño de veneno', '+{v}% poison damage'], sombra_pct: ['+{v}% de daño de sombra', '+{v}% shadow damage'], invocados_pct: ['+{v}% de vida y daño de invocados', '+{v}% summon life and damage'],
  espinas_pct: ['Devuelve {v}% del daño recibido', 'Returns {v}% of damage taken'], enemigo_res: ['Resistencias enemigas {v}%', 'Enemy resistances {v}%'], enemigo_def: ['Defensa enemiga {v}%', 'Enemy defense {v}%'],
  escudo_hueso: ['Absorbe {v} de daño', 'Absorbs {v} damage'], amplificar: ['+{v}% de daño físico recibido', '+{v}% physical damage taken'], debilitar: ['Los enemigos pegan {v}% menos', 'Enemies hit {v}% softer'],
  lento: ['Enemigos {v}% más lentos', 'Enemies {v}% slower'], potencia_aura: ['+{v}% de potencia del aura activa', '+{v}% active aura power'], furia_gana: ['+{v}% de furia ganada', '+{v}% fury gained'],
  furia_dano: ['+{v}% de daño extra con furia llena', '+{v}% extra damage at full fury'], furia_grito: ['+{v} de furia por grito', '+{v} fury per shout'], resonancia: ['+{v}% de daño por carga guardada', '+{v}% damage per stored charge'],
  marca: ['Marca la presa {v} s', 'Marks prey for {v} s'], marca_pct: ['+{v}% de daño a presas marcadas', '+{v}% damage to marked prey'], combo_pct: ['+{v}% de daño del remate', '+{v}% finisher damage'],
  combo_ventana: ['+{v} s para encadenar el combo', '+{v} s to chain the combo'], maldicion_dur: ['+{v}% de duración de maldiciones', '+{v}% curse duration'], sifon: ['Cura {v}% del daño hecho a los malditos', 'Heals {v}% of damage dealt to the cursed'],
  res: ['Resistencias enemigas -{v}%', 'Enemy resistances -{v}%'], cura_pct: ['Cura {v}% de la vida', 'Heals {v}% of life'], mana_pct_cura: ['Recupera {v}% del maná', 'Restores {v}% of mana'],
  frascos_max: ['+{v} frascos', '+{v} flasks'], frascos_vel: ['+{v}% de velocidad de relleno', '+{v}% refill speed'], bomba_radio: ['+{v}% de radio de las bombas', '+{v}% bomb radius'],
  robo_golpe: ['Cura {v}% del daño del golpe', 'Heals {v}% of the blow\'s damage'],
};
const SIN_NUMERO: Record<string, [string, string]> = {
  miedo: ['Asusta y hace huir', 'Frightens and makes flee'], aturdir: ['Aturde', 'Stuns'], empuje: ['Empuja', 'Knocks back'], congelar: ['Congela o deja clavado', 'Freezes or pins in place'],
  escarcha: ['Congela a quien te pega', 'Freezes whoever hits you'], condena: ['Los malditos revientan al morir', 'The cursed burst when they die'], tempestad: ['', ''], huracan: ['', ''],
};
const TIPO_HAB: Record<string, [string, string]> = { pasiva: ['Pasiva', 'Passive'], aura: ['Aura', 'Aura'], buff: ['Hechizo de apoyo', 'Support spell'], invocar: ['Invocación', 'Summon'], maldicion: ['Maldición', 'Curse'], trampa: ['Trampa', 'Trap'], bomba: ['Bomba', 'Bomb'] };
function valoresHab(j: Juego, hb: Habilidad, k: number, col: string): [string, string][] {
  const out: [string, string][] = [];
  const v = (b: [number, number] | undefined) => (b ? Math.round((b[0] + b[1] * (k - 1)) * 10) / 10 : 0);
  if (hb.mana[0] || hb.mana[1]) out.push([`${T('Maná', 'Mana')}: ${Math.max(0, hb.mana[0] + hb.mana[1] * (k - 1)).toFixed(1)}`, '#8090ff']);
  if (hb.dano) { const dd = danoHab(j, hb, k); out.push([`${T('Daño', 'Damage')}: ${dd[0]} - ${dd[1]}`, col]); }
  if (hb.mult) out.push([`${T('Daño del arma', 'Weapon damage')}: ${Math.round(v(hb.mult))}%`, col]);
  if (hb.n && v(hb.n) > 1) out.push([`${T('Cantidad', 'Count')}: ${Math.round(v(hb.n))}`, col]);
  if (hb.max && hb.id !== 'coto_caza') out.push([`${T('Máximo', 'Maximum')}: ${Math.max(1, Math.floor(v(hb.max)))}`, col]);
  if (hb.duracion && hb.tipo !== 'pasiva' && hb.id !== 'forma_lobo' && hb.id !== 'forma_oso') out.push([`${T('Duración', 'Duration')}: ${v(hb.duracion)} s`, col]);
  for (const [s, b] of Object.entries(hb.bonos ?? {})) {
    if (s in SIN_NUMERO) continue;
    let x = v(b); if (s === 'frascos_max') x = Math.floor(x);
    const e = ETIQ[s]; out.push([e ? TT(e).replace('{v}', String(x)).replace('+-', '-') : textoStat(s, x, IDI), '#7c94ff']);
  }
  return out;
}
/** Líneas de ayuda de una habilidad: qué hace, valores ahora y al siguiente nivel, requisitos y sinergias. */
function lineasHab(j: Juego, hb: Habilidad, conSiguiente: boolean): [string, string][] {
  const h = j.heroe, d = h.d, base = d.habs[hb.id] ?? 0, extra = base ? h.c.mas_habilidades : 0, n = base + extra;
  const cl = CLASES.find((q) => q.id === d.clase)!;
  const l: [string, string][] = [[TT(hb.nombre), hb.definitiva ? '#ffb040' : '#f0d080']];
  const tipo = TIPO_HAB[hb.tipo] ?? [T('Activa', 'Active'), T('Activa', 'Active')];
  l.push([`${hb.definitiva ? T('Definitiva', 'Ultimate') + ' · ' : ''}${TT(tipo)} · ${TT(cl.ramas[hb.rama])}${hb.recarga ? ` · ${T('Recarga', 'Cooldown')} ${hb.recarga} s` : ''}`, '#a09070']);
  for (const s of envolver(TT(hb.desc).replace(/^(Definitiva|Ultimate)\. /, ''), 250, 12)) l.push([s, '#d0c0a0']);
  const marcas = Object.keys(hb.bonos ?? {}).map((k) => SIN_NUMERO[k]).filter((x) => x && x[0]).map((x) => TT(x!));
  if (marcas.length) l.push([marcas.join(' · '), '#c0a0ff']);
  if (hb.id === 'ataque') return l;
  if (n > 0) { l.push(['', '']); l.push([`${T('Nivel actual', 'Current level')}: ${base}${extra ? ` (+${extra})` : ''}`, '#f0e0b0']); l.push(...valoresHab(j, hb, n, '#e0e0e0')); }
  if (conSiguiente && base < 20) { l.push(['', '']); l.push([`${T('Siguiente nivel', 'Next level')}: ${base + 1}`, '#c0b090']); l.push(...valoresHab(j, hb, n + 1, '#b0b0b0').map(([s, c]) => [s, c === '#7c94ff' ? '#6070c0' : c === '#8090ff' ? '#6070c0' : c] as [string, string])); }
  // requisitos
  const reqs: [string, string][] = [];
  const nivelPide = hb.nivelReq + base;
  if (base < 20 && d.nivel < nivelPide) reqs.push([`${T('Requiere nivel', 'Requires level')} ${nivelPide}`, '#ff6060']);
  for (const r of hb.req ?? []) { const o = HABILIDADES.find((q) => q.id === r); if (o) reqs.push([`${T('Requiere', 'Requires')}: ${TT(o.nombre)}`, (d.habs[r] ?? 0) > 0 ? '#70b070' : '#ff6060']); }
  if (hb.forma) reqs.push([hb.forma === 'lobo' ? T('Solo en forma de lobo', 'Wolf form only') : hb.forma === 'oso' ? T('Solo en forma de oso', 'Bear form only') : T('Solo transformado', 'Only while transformed'), '#d0a060']);
  if (hb.furia) reqs.push([`${T('Pide', 'Needs')} ${hb.furia} ${T('de furia', 'fury')}`, '#ff8060']);
  if (reqs.length) { l.push(['', '']); l.push(...reqs); }
  if (hb.sinergias?.length) {
    l.push(['', '']); l.push([T('Sinergias', 'Synergies'), '#40d040']);
    for (const [s, p] of hb.sinergias) { const o = HABILIDADES.find((q) => q.id === s); if (!o) continue; const tiene = d.habs[s] ?? 0; l.push([`${TT(o.nombre)}: +${p}% ${T('por nivel', 'per level')}${tiene ? ` (${T('ahora', 'now')} +${p * tiene}%)` : ''}`, tiene ? '#60e060' : '#409040']); }
    // las sinergias se suman y tienen tope
    if (hb.dano) { const tope = ESCALA_HECHIZOS.topeSinergia, tot = hb.sinergias.reduce((a, [s, p]) => a + p * (d.habs[s] ?? 0), 0); l.push([`${T('Total', 'Total')}: +${Math.min(tope, tot)}% (${T('tope', 'cap')} +${tope}%)`, tot >= tope ? '#ffd060' : '#60e060']); }
  }
  if (hb.tipo === 'aura') l.push([T('Solo un aura activa: ponla en el botón derecho', 'One active aura: set it on the right button'), '#a0a0a0']);
  if (puedeAprender(d, hb)) l.push([base === 0 ? T('Clic para aprender', 'Click to learn') : T('Clic para subir un nivel', 'Click to raise a level'), '#ffd060']);
  return l;
}
function panelElegir(j: Juego, x: number, y: number) {
  const h = j.heroe;
  const lista: Habilidad[] = [ATAQUE, ...habilidadesDe(h.d.clase).filter((hb) => (h.d.habs[hb.id] ?? 0) > 0 && hb.tipo !== 'pasiva' && (ui.elegirLado === 'der' || hb.tipo !== 'aura'))];
  marco(x, y, PANEL_W, PANEL_H); titulo(ui.elegirLado === 'izq' ? T('Botón izquierdo', 'Left button') : T('Botón derecho', 'Right button'), x, y, PANEL_W);
  texto(T('Pasa el ratón y pulsa F1-F10 para un atajo', 'Hover and press F1-F10 for a hotkey'), x + 160, y + 52, { alin: 'center', tam: 11, color: '#a09070' });
  let encima: Habilidad | null = null, ey = 0;
  lista.forEach((hb, i) => {
    const xx = x + 16 + (i % 6) * 48, yy = y + 64 + Math.floor(i / 6) * 50, s = 42;
    iconoHab(hb, xx, yy, s);
    if (hb.definitiva) { ctx.strokeStyle = '#ffb040'; ctx.lineWidth = 1; ctx.strokeRect(xx - 1.5, yy - 1.5, s + 3, s + 3); }
    if (hb.id === h.d[ui.elegirLado]) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(xx - 0.5, yy - 0.5, s + 1, s + 1); }
    const fk = h.d.atajos.indexOf(hb.id); if (fk >= 0) texto(`F${fk + 1}`, xx + 2, yy + s - 2, { tam: 10, color: '#ffd060' });
    if (dentro(xx, yy, s, s)) {
      encima = hb; ey = yy + s / 2;
      if (E.clicIzq) { h.d[ui.elegirLado] = hb.id; ui.der = null; E.clicIzq = false; Sonido.efecto('click'); recalc(j); }
      for (let k = 1; k <= 10; k++) if (pulso('F' + k)) { h.d.atajos = h.d.atajos.map((a) => (a === hb.id ? null : a)); h.d.atajos[k - 1] = hb.id; }
    }
  });
  if (encima) tooltipAl(lineasHab(j, encima, false), x - 6, ey);
}

// ---------------- cofre compartido
function panelCofre(j: Juego, x: number, y: number, t: number) {
  marco(x, y, 320, 432); titulo(T('Baúl compartido', 'Shared chest'), x, y, 320);
  texto(T('Lo que guardes aquí lo ven todos tus héroes.', 'Everything here is shared by all your heroes.'), x + 160, y + 52, { alin: 'center', tam: 11, color: '#a09070' });
  rejillaObjetos(j, ui.cofre, x + 15, y + 64, COFRE_W, COFRE_H, t, 'cofre');
  texto(T('Clic derecho mueve entre baúl y bolsa', 'Right click moves between chest and bag'), x + 160, y + 64 + COFRE_H * CELDA_INV + 20, { alin: 'center', tam: 11, color: '#a09070' });
}

// ---------------- tiendas
export function abrirTienda(j: Juego, tipo: 'herrero' | 'curandera' | 'vidente') {
  const h = j.heroe, nivel = Math.max(1, Math.min(100, Math.max(h.d.nivel, nivelEnDificultad(ZONAS[j.zona.id].nivel, h.d.dificultad)) + 2));
  ui.tiendaTipo = tipo; ui.tienda = [];
  // si se abre sin pasar por el NPC, el origen es donde está el héroe: igual se cierra al alejarse
  if (!(ui as any).origen) (ui as any).origen = [h.x, h.y];
  const meter = (o: Objeto) => { const p = lugarEn(ui.tienda, o, 10, 10); if (p) ui.tienda.push({ o, x: p[0], y: p[1] }); };
  if (tipo === 'curandera') {
    const tam = nivel < 8 ? 0 : nivel < 18 ? 1 : nivel < 30 ? 2 : 3;
    for (let k = 0; k <= tam; k++) for (let i = 0; i < 4; i++) { meter(crearPocion('vida', k)); meter(crearPocion('mana', k)); }
    if (nivel > 12) for (let i = 0; i < 2; i++) meter(crearPocion('rejuv', 0));
    for (let i = 0; i < 6; i++) meter(crearPergamino('portal'));
  } else if (tipo === 'herrero') {
    for (let i = 0; i < 26; i++) meter(crearObjeto(nivel, R() < 0.35 ? 'magico' : 'normal', (b) => b.ranura !== 'anillo' && b.ranura !== 'amuleto'));
    for (let i = 0; i < 3; i++) meter(crearObjeto(nivel, 'magico', (b) => b.ranura === 'anillo' || b.ranura === 'amuleto'));
  } else {
    for (let i = 0; i < 24; i++) { const o = crearObjeto(nivel, 'normal'); o.nombre = [`${TT(baseDe(o)!.nombre)} ?`, `${baseDe(o)!.nombre[1]} ?`]; (o as any).apuesta = true; meter(o); }
  }
  ui.izq = 'tienda'; ui.der = 'inv';
}
const precioCompra = (o: Objeto) => Math.round(o.precio * (o.tipo === 'equipo' ? 1.6 : 1));
const precioVenta = (o: Objeto) => Math.max(1, Math.round(o.precio * 0.25 * (o.durabMax ? 0.3 + 0.7 * o.durab / o.durabMax : 1))) * cant(o);
const precioApuesta = (o: Objeto) => Math.round(150 + o.nivel * 90 + (baseDe(o)?.escalon ?? 0) * 800);
function comprar(j: Juego, b: EnBolsa) {
  const h = j.heroe;
  const vid = ui.tiendaTipo === 'vidente';
  const p = vid ? precioApuesta(b.o) : precioCompra(b.o);
  if (h.d.oro < p) { Sonido.efecto('negado'); msg(j, ['No tengo suficiente oro.', 'I do not have enough gold.']); return; }
  let o = b.o;
  if (vid) {
    const q = R(); const rz = q < 0.005 ? 'legendario' : q < 0.02 ? 'unico' : q < 0.05 ? 'conjunto' : q < 0.18 ? 'raro' : 'magico';
    const base = baseDe(o)!;
    o = crearObjeto(Math.max(o.nivel, h.d.nivel), rz as any, (x) => x.id === base.id);
    if (o.rareza === 'raro' || o.rareza === 'unico' || o.rareza === 'legendario') Sonido.efecto('objeto_raro');
    // la vidente repone lo apostado
    const n = crearObjeto(b.o.nivel, 'normal'); n.nombre = [`${baseDe(n)!.nombre[0]} ?`, `${baseDe(n)!.nombre[1]} ?`]; const i = ui.tienda.indexOf(b); ui.tienda.splice(i, 1); const pl = lugarEn(ui.tienda, n, 10, 10); if (pl) ui.tienda.push({ o: n, x: pl[0], y: pl[1] });
  }
  if (!recoger(h.d, o)) { Sonido.efecto('negado'); msg(j, ['No tengo lugar.', 'I have no room.']); return; }
  h.d.oro -= p;
  if (!vid && o.tipo === 'equipo') ui.tienda.splice(ui.tienda.indexOf(b), 1);
  else if (!vid) { const c = { ...o, uid: o.uid + 1 }; void c; ui.tienda.splice(ui.tienda.indexOf(b), 1); const n = o.tipo === 'pocion' ? crearPocion(o.pocion!, o.tam!) : crearPergamino('portal'); const pl = lugarEn(ui.tienda, n, 10, 10); if (pl) ui.tienda.push({ o: n, x: pl[0], y: pl[1] }); }
  Sonido.efecto('vender');
}
function venderMano(j: Juego) {
  if (!ui.mano) return;
  const v = precioVenta(ui.mano);
  j.heroe.d.oro += v; ui.mano = null; Sonido.efecto('vender');
}
function panelTienda(j: Juego, x: number, y: number, t: number) {
  const h = j.heroe;
  marco(x, y, 320, 432);
  titulo(ui.tiendaTipo === 'vidente' ? T('Apuestas', 'Gamble') : ui.tiendaTipo === 'curandera' ? T('Remedios', 'Remedies') : T('Armas y armaduras', 'Arms and armor'), x, y, 320);
  rejillaObjetos(j, ui.tienda, x + 15, y + 44, 10, 10, t, 'tienda');
  texto(`${T('Tu oro', 'Your gold')}: ${h.d.oro.toLocaleString()}`, x + 18, y + 44 + 10 * CELDA_INV + 22, { color: '#e8c050' });
  if (ui.tiendaTipo === 'herrero') {
    let costo = 0; for (const o of Object.values(h.d.equipo)) if (o && o.durabMax) costo += Math.round((o.durabMax - o.durab) * (o.precio / o.durabMax) * 0.4 + (o.durab < o.durabMax ? 2 : 0));
    if (boton(`${T('Reparar todo', 'Repair all')} (${costo})`, x + 150, y + 44 + 10 * CELDA_INV + 6, 156, 26, { tam: 12, activo: costo > 0 && h.d.oro >= costo })) { if (costo > 0 && h.d.oro >= costo) { h.d.oro -= costo; for (const o of Object.values(h.d.equipo)) if (o) o.durab = o.durabMax; Sonido.efecto('reparar'); recalc(j); } E.clicIzq = false; }
  }
  // cómo se usa la tienda, siempre a la vista
  texto(ui.tiendaTipo === 'vidente' ? (E.tactil ? T('Toca un objeto: apostar por él', 'Tap an item: gamble for it') : T('Clic izquierdo: apostar por un objeto', 'Left click: gamble for an item')) : (E.tactil ? T('Toca un objeto: ver su ficha y comprar', 'Tap an item: see it and buy') : T('Clic izquierdo o derecho: comprar', 'Left or right click: buy')), x + 18, y + 44 + 10 * CELDA_INV + 44, { tam: 11, color: '#c0b090' });
  texto(E.tactil ? T('Toca algo de tu bolsa y luego la tienda: vender', 'Tap something in your bag, then the shop: sell') : T('Clic derecho en tu bolsa: vender', 'Right click in your bag: sell'), x + 18, y + 44 + 10 * CELDA_INV + 58, { tam: 11, color: '#c0b090' });
  if (ui.mano && dentro(x, y, 320, 432)) texto(E.tactil ? T('Toca para vender', 'Tap to sell') : T('Clic para vender', 'Click to sell'), x + 160, y + 425, { alin: 'center', tam: 11, color: '#e8c050' });
  if (boton(T('Cerrar', 'Close'), x + 230, y + 395, 76, 26, { tam: 12 })) { ui.izq = null; ui.der = null; E.clicIzq = false; }
}

// ---------------- diálogo con la gente del campamento
export function hablarCon(j: Juego, id: string) {
  { const n = j.npcs.find((q) => q.npc === id); (ui as any).origen = n ? [n.x, n.y] : [j.heroe.x, j.heroe.y]; }
  ui.npc = id; ui.izq = 'dialogo'; ui.der = null; (ui as any).eleccion = null; (ui as any).oferta = null;
  const d = j.heroe.d;
  ui.dialogoTexto = TT(saludoDe(id, d));
  Sonido.efecto('click');
  revisarMisiones(j, id);
}
/** Entrega lo cumplido (o pregunta qué elegir) y ofrece lo que haya. Las principales se aceptan solas, como siempre. */
function revisarMisiones(j: Juego, id = ui.npc ?? '') {
  const d = j.heroe.d;
  const e = entregaDe(id, d);
  if (e) {
    if (e.eleccion) { (ui as any).eleccion = e.id; ui.dialogoTexto = TT(e.eleccion.pregunta); Sonido.efecto('mision'); }
    else entregar(j, e);
    return;
  }
  const o = ofertaDe(id, d);
  if (!o) return;
  if (o.lateral) { (ui as any).oferta = o.id; ui.dialogoTexto = TT(o.pedido); }
  else { aceptar(d, o); ui.dialogoTexto = TT(o.pedido); Sonido.efecto('mision'); }
}
/** La Lágrima del Olvido: devuelve todos los puntos de atributo y de habilidad (queda solo la habilidad con que arrancó la clase). */
function olvidar(j: Juego) {
  const d = j.heroe.d, base = CLASES.find((c) => c.id === d.clase)!.base;
  d.puntosAtrib += (d.fue - base.fue) + (d.des - base.des) + (d.vit - base.vit) + (d.ene - base.ene);
  d.fue = base.fue; d.des = base.des; d.vit = base.vit; d.ene = base.ene;
  const primera = HABILIDADES.find((x) => x.clase === d.clase && x.nivelReq === 1 && x.tipo !== 'pasiva' && x.tipo !== 'aura' && x.tipo !== 'buff');
  const gastados = Object.values(d.habs).reduce((a, b) => a + b, 0);
  d.puntosHab += gastados - (primera ? 1 : 0);
  d.habs = primera ? { [primera.id]: 1 } : {};
  d.izq = 'ataque'; d.der = primera?.id ?? 'ataque'; d.atajos = Array(10).fill(null); if (primera) d.atajos[0] = primera.id; d.aura = undefined;
  recalc(j); Sonido.efecto('mision');
  msg(j, ['Olvidas todo lo que sabías pelear. Tus puntos esperan.', 'You forget everything you knew of fighting. Your points await.'], '#c8a060');
}
function darPremio(j: Juego, p: Premio) {
  const d = j.heroe.d;
  if (p.habilidad) d.puntosHab += p.habilidad;
  if (p.atributos) d.puntosAtrib += p.atributos;
  if (p.oro) d.oro += p.oro;
  if (p.vida) d.vit += Math.round(p.vida / 3);
  if (p.unico) { const o = crearUnicoId(p.unico, Math.max(d.nivel, 5)); if (o) { if (!recoger(d, o)) j.suelo.push({ o, oro: 0, x: j.heroe.x - 1, y: j.heroe.y + 1, t: 0, id: Date.now() + 2 }); msg(j, [`Recibes ${o.nombre[0]}.`, `You receive ${o.nombre[1]}.`], '#ff9a30'); } }
  if (p.objeto) { const o = crearObjeto(Math.max(d.nivel, 5), p.objeto); if (!recoger(d, o)) j.suelo.push({ o, oro: 0, x: j.heroe.x + 1, y: j.heroe.y + 1, t: 0, id: Date.now() }); }
  if (p.olvido) { const o = crearPergamino('olvido'); if (!recoger(d, o)) j.suelo.push({ o, oro: 0, x: j.heroe.x + 1, y: j.heroe.y - 1, t: 0, id: Date.now() + 1 }); msg(j, ['Te dieron una Lágrima del Olvido. Bébela para repartir de nuevo tus habilidades y atributos.', 'You received a Tear of Oblivion. Drink it to reassign your skills and attributes.'], '#c8a060'); }
}
function entregar(j: Juego, m: Mision, opcion?: number) {
  const d = j.heroe.d;
  d.misiones[m.id] = 3;
  if (opcion !== undefined && m.eleccion) {
    hist(d).elecciones ??= {}; hist(d).elecciones![m.id] = opcion;
    const op = m.eleccion.opciones[opcion];
    if (op.decision) decidir(d, op.decision[0], op.decision[1]);
    darPremio(j, op.premio);
  }
  darPremio(j, m.premio);
  // la misión que cierra la historia deja la legendaria del final que te tocó
  if (m.final) darPremio(j, { unico: EPILOGOS[finalCompleto(d)].unico });
  ui.dialogoTexto = TT(textoHecho(d, m, opcion));
  (ui as any).eleccion = null;
  Sonido.efecto('mision');
  recalc(j);
  if (m.cierraActo && m.acto < 7) { const sig = PUEBLO_DE[m.acto + 1]; if (sig && !d.viajes.includes(sig)) d.viajes.push(sig); }
  j.eventos.push({ tipo: 'mision_hecha', dato: m.id });
}
function panelDialogo(j: Juego, x: number, y: number) {
  const n = NPCS[ui.npc ?? '']; if (!n) { ui.izq = null; return; }
  const d = j.heroe.d;
  marco(x, y, 320, 432); titulo(TT(n.nombre), x, y, 320);
  const eleccion = MISIONES.find((m) => m.id === (ui as any).eleccion && m.eleccion);
  const oferta = MISIONES.find((m) => m.id === (ui as any).oferta);
  if (eleccion || oferta) texto(TT((eleccion ?? oferta)!.nombre), x + 160, y + 52, { alin: 'center', tam: 12, color: eleccion ? '#ffd080' : '#80c0ff' });
  envolver(ui.dialogoTexto ?? '', 280, 14).slice(0, 12).forEach((l, i) => texto(l, x + 20, y + 72 + i * 18, { tam: 14, color: '#e0d0b0' }));
  let by = y + 300;
  const op = (s: string, f: () => void, color?: string) => { if (boton(s, x + 15, by, 290, 26, { tam: 12, color })) { E.clicIzq = false; f(); } by += 30; };
  if (eleccion?.eleccion) {
    eleccion.eleccion.opciones.forEach((o, i) => {
      const ls = envolver(TT(o.texto), 270, 12), hb = 14 + ls.length * 15;
      if (boton('', x + 15, by, 290, hb, { tam: 12 })) { E.clicIzq = false; entregar(j, eleccion, i); }
      ls.forEach((l, k) => texto(l, x + 160, by + 17 + k * 15, { alin: 'center', tam: 12, color: '#ffd080' }));
      by += hb + 6;
    });
    return;
  }
  if (oferta) {
    op(T('Aceptar el encargo', 'Accept the task'), () => { aceptar(d, oferta); (ui as any).oferta = null; ui.dialogoTexto = TT(saludoDe(n.id, d)); Sonido.efecto('mision'); }, '#80c0ff');
    op(T('Ahora no', 'Not now'), () => { (ui as any).oferta = null; ui.dialogoTexto = TT(saludoDe(n.id, d)); });
    return;
  }
  op(T('Cuéntame', 'Tell me'), () => { ui.dialogoTexto = TT(relatoDe(n.id, d)); });
  const act = activaDe(n.id, d);
  if (act) op(`${T('Sobre', 'About')}: ${TT(act.nombre)}`, () => { ui.dialogoTexto = TT(act.pedido); });
  else if (n.oficio === 'misiones') op(T('Misiones', 'Quests'), () => { revisarMisiones(j, n.id); });
  if (n.oficio === 'herrero') op(T('Comerciar y reparar', 'Trade and repair'), () => abrirTienda(j, 'herrero'));
  if (n.oficio === 'curandera') op(T('Curarme y comprar remedios', 'Heal me and buy remedies'), () => { j.heroe.vida = j.heroe.vidaMax; j.heroe.mana = j.heroe.c.manaMax; j.heroe.veneno = 0; Sonido.efecto('curar'); abrirTienda(j, 'curandera'); });
  if (n.oficio === 'vidente') op(T('Probar suerte', 'Try my luck'), () => abrirTienda(j, 'vidente'));
  op(T('Adiós', 'Farewell'), () => { ui.izq = null; });
}

// ---------------- piedras de viaje
function panelViaje(j: Juego, x: number, y: number) {
  const d = j.heroe.d;
  marco(x, y, 320, 432); titulo(T('Piedras de viaje', 'Travel stones'), x, y, 320);
  const actos = [1, 2, 3, 4, 5, 6, 7].filter((a) => d.viajes.some((v) => ZONAS[v]?.acto === a));
  // una pestaña por acto: con tantas piedras no caben todas juntas
  let act = (ui as any).viajeActo ?? ZONAS[j.zona.id]?.acto ?? 1;
  if (!actos.includes(act)) act = actos[actos.length - 1] ?? 1;
  const tw = Math.floor(280 / Math.max(1, actos.length));
  actos.forEach((a, i) => { if (boton(`${T('Acto', 'Act')} ${a}`, x + 20 + i * tw, y + 44, tw - 4, 24, { tam: 12, color: a === act ? '#ffd080' : undefined })) { (ui as any).viajeActo = a; E.clicIzq = false; } });
  let yy = y + 80;
  for (const z of Object.values(ZONAS).filter((q) => q.acto === act && q.piedraViaje)) {
    const tiene = d.viajes.includes(z.id);
    if (boton(tiene ? TT(z.nombre) : '? ? ?', x + 30, yy, 260, 26, { tam: 12, activo: tiene && z.id !== j.zona.id })) { E.clicIzq = false; if (tiene) j.eventos.push({ tipo: 'viajar', dato: z.id }); ui.izq = null; }
    yy += 30;
  }
}
export function objetivoTxt(m: Mision, d: DatosHeroe): string {
  const o = m.objetivo, z = TT(ZONAS[o.zona]?.nombre ?? ['?', '?']);
  const av = avanceDe(d, m);
  if (o.tipo === 'llegar') return `${T('Llega a', 'Reach')} ${z}`;
  if (o.tipo === 'pistas') return `${T('Investiga', 'Investigate')} ${av} · ${z}`;
  if (o.tipo === 'ritual') return `${T('Altares', 'Altars')} ${av} · ${z}`;
  if (o.tipo === 'purgar') return `${T('Purga', 'Purge')} ${o.n} ${T('en', 'in')} ${Math.round(o.tiempo / 60 * 10) / 10} min · ${z}`;
  if (o.tipo === 'escoltar') return `${T('Escolta a', 'Escort')} ${TT(o.nombre)} · ${z}`;
  if (o.tipo === 'cazar') return `${T('Caza a', 'Hunt')} ${TT(o.nombre)} · ${z}`;
  const nom = o.nombreUnico ?? MONSTRUOS[o.monstruo]?.nombre ?? ['?', '?'];
  return `${T('Vence a', 'Defeat')} ${TT(nom)} · ${z}`;
}
function panelMisiones(j: Juego, x: number, y: number) {
  const d = j.heroe.d;
  marco(x, y, 320, 432); titulo(T('Misiones', 'Quests'), x, y, 320);
  const max = Math.max(d.acto, ...MISIONES.filter((m) => (d.misiones[m.id] ?? 0) > 0).map((m) => m.acto));
  const actos = Array.from({ length: max }, (_, i) => i + 1);
  let act = (ui as any).misionesActo ?? d.acto; if (!actos.includes(act)) act = d.acto;
  const tw = Math.floor(290 / Math.max(1, actos.length));
  actos.forEach((a, i) => { if (boton(String(a), x + 15 + i * tw, y + 44, tw - 3, 22, { tam: 12, color: a === act ? '#ffd080' : undefined })) { (ui as any).misionesActo = a; E.clicIzq = false; } });
  let yy = y + 86;
  const lista = MISIONES.filter((m) => m.acto === act).sort((a, b) => Number(!!a.lateral) - Number(!!b.lateral));
  let lateral = false;
  for (const m of lista) {
    if (m.lateral && !lateral) { lateral = true; texto(T('Encargos', 'Side tasks'), x + 18, yy, { tam: 11, color: '#806a50' }); yy += 14; }
    else if (yy === y + 86) { texto(T('Historia', 'Story'), x + 18, yy, { tam: 11, color: '#806a50' }); yy += 14; }
    const e = d.misiones[m.id] ?? 0;
    const col = e === 3 ? '#707070' : e === 2 ? '#80ff80' : e === 1 ? '#f0d080' : '#5a5040';
    const quien = TT(NPCS[quienDa(m, d)]?.nombre ?? ['', '']);
    texto(TT(m.nombre), x + 18, yy, { color: col, tam: 13 });
    const est = e === 3 ? T('Terminada', 'Completed') : e === 2 ? `${T('Vuelve con', 'Return to')} ${quien}` : e === 1 ? objetivoTxt(m, d) : `${T('Habla con', 'Speak with')} ${quien}`;
    texto(est.length > 52 ? est.slice(0, 50) + '…' : est, x + 30, yy + 14, { tam: 10, color: '#a09070' });
    const el = eleccionDe(d, m.id);
    if (e === 3 && el !== undefined && m.eleccion) texto(`· ${TT(m.eleccion.opciones[el].texto)}`.slice(0, 56), x + 30, yy + 26, { tam: 10, color: '#8a7ab0' });
    yy += e === 3 && el !== undefined ? 40 : 32;
  }
}
function panelMenu(j: Juego, x: number, y: number) {
  marco(x, y, 320, 432); titulo(T('Menú', 'Menu'), x, y, 320);
  let yy = y + 80;
  const op = (s: string, f: () => void) => { if (boton(s, x + 40, yy, 240, 30)) { E.clicIzq = false; f(); } yy += 35; };
  op(T('Volver al juego', 'Return to game'), () => { ui.izq = null; });
  op(T('Opciones', 'Options'), () => j.eventos.push({ tipo: 'opciones' }));
  op(T('Misiones (Q)', 'Quests (Q)'), () => { ui.izq = 'misiones'; });
  op(T('Códice (J)', 'Codex (J)'), () => { ui.izq = 'codice'; });
  if (j.zona.tipo !== 'pueblo') op(T('Portal al campamento (B)', 'Portal to camp (B)'), () => { ui.izq = null; abrirPortal(j); });
  op(T('Guardar y salir', 'Save and quit'), () => j.eventos.push({ tipo: 'salir' }));
  texto(T('Teclas: clic izq. caminar/atacar · clic der. habilidad · 1-4 pociones · 5-0 atajos · I inventario · C personaje · T habilidades · Q misiones · Tab mapa · Alt botín · R correr · Shift atacar sin moverse · B portal', 'Keys: left click walk/attack · right click skill · 1-4 potions · I inventory · C character · T skills · Q quests · Tab map · Alt loot · R run · Shift attack in place · B portal'), x + 18, y + 330, { tam: 1 });
  envolver(T('Clic izquierdo camina y ataca · clic derecho usa la habilidad · 1-4 pociones · I inventario · C personaje · T habilidades · Q misiones · J códice · Tab mapa · Alt muestra el botín · R correr o caminar · Shift ataca sin moverte · B portal al campamento', 'Left click walks and attacks · right click uses the skill · 1-4 potions · I inventory · C character · T skills · Q quests · J codex · Tab map · Alt shows loot · R run or walk · Shift attacks in place · B portal to camp'), 280, 11).forEach((l, i) => texto(l, x + 20, y + 290 + i * 14, { tam: 11, color: '#a09070' }));
}

// ------------------------------------------------------------------ mapa (Tab) y minimapa
export function dibujarMapa(j: Juego, grande: boolean) {
  const z = j.zona, h = j.heroe;
  // el grande llena la pantalla con la zona entera y se centra en ella (no en el héroe)
  // en táctil el chico es redondo, debajo de los botones de arriba (y se puede esconder)
  const mt = !grande && E.tactil ? miniTactil() : null;
  if (!grande && E.tactil && (!mt || ui.izq || ui.der)) return;
  const esc = grande ? Math.min((W - 80) / ((z.W + z.H) * 0.5), (H - BAR_H - 70) / ((z.W + z.H) * 0.25)) : mt ? (mt.r / 80) * 1.4 : 1.4;
  const cx = grande ? W / 2 : mt ? mt.cx : W - 90, cy = grande ? (H - BAR_H) / 2 + 10 : mt ? mt.cy : 80;
  const ox = grande ? z.W / 2 : h.x, oy = grande ? z.H / 2 : h.y;
  const p = (x: number, y: number): [number, number] => [cx + (x - ox - (y - oy)) * esc * 0.5, cy + (x - ox + (y - oy)) * esc * 0.25];
  // etiquetas que no se encimen: si chocan con otra se corren hacia abajo, y si no hay lugar no se ponen
  const puestas: [number, number, number, number][] = [];
  const etiqueta = (t: string, x: number, y: number, color: string, tam = 10) => {
    const w = ancho(t, tam) + 6;
    for (let k = 0; k < 4; k++) { const yy = y + k * (tam + 3), r: [number, number, number, number] = [x - w / 2, yy - tam, w, tam + 3];
      if (!puestas.some((q) => r[0] < q[0] + q[2] && r[0] + r[2] > q[0] && r[1] < q[1] + q[3] && r[1] + r[3] > q[1])) { puestas.push(r); texto(t, x, yy, { alin: 'center', tam, color }); return; } }
  };
  ctx.save();
  if (mt) { ctx.beginPath(); ctx.arc(mt.cx, mt.cy, mt.r, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(mt.cx - mt.r, mt.cy - mt.r, mt.r * 2, mt.r * 2); }
  else if (!grande) { ctx.beginPath(); ctx.rect(W - 180, 0, 180, 160); ctx.clip(); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(W - 180, 0, 180, 160); }
  else { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H - BAR_H + 56); }
  ctx.globalAlpha = grande ? 0.75 : 0.85;
  for (let by = 0; by < z.th; by++) for (let bx = 0; bx < z.tw; bx++) {
    if (!z.explorado[by * z.tw + bx] || !z.pisos[by * z.tw + bx]) continue;
    const [a, b] = p(bx * 5, by * 5), [c, d] = p(bx * 5 + 5, by * 5), [e, f] = p(bx * 5 + 5, by * 5 + 5), [g, hh] = p(bx * 5, by * 5 + 5);
    ctx.strokeStyle = z.tipo === 'mazmorra' ? '#8a7a5a' : '#6a6a50'; ctx.lineWidth = 1;
    // borde con lo no explorado o vacío
    const vacio = (X: number, Y: number) => X < 0 || Y < 0 || X >= z.tw || Y >= z.th || !z.pisos[Y * z.tw + X];
    ctx.beginPath();
    if (vacio(bx, by - 1)) { ctx.moveTo(a, b); ctx.lineTo(c, d); }
    if (vacio(bx + 1, by)) { ctx.moveTo(c, d); ctx.lineTo(e, f); }
    if (vacio(bx, by + 1)) { ctx.moveTo(e, f); ctx.lineTo(g, hh); }
    if (vacio(bx - 1, by)) { ctx.moveTo(g, hh); ctx.lineTo(a, b); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(80,70,50,0.12)'; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(e, f); ctx.lineTo(g, hh); ctx.closePath(); ctx.fill();
  }
  // salidas: un arco ámbar con borde negro (se distingue de los puntos de monstruos y PNJ)
  for (const s of z.salidas) {
    const [a, b] = p(s.cx, s.cy); if (!z.explorado[Math.floor(s.cy / 5) * z.tw + Math.floor(s.cx / 5)]) continue;
    const r = grande ? 6 : 4;
    ctx.beginPath(); ctx.moveTo(a - r, b + r); ctx.lineTo(a - r, b - r * 0.2); ctx.arc(a, b - r * 0.2, r, Math.PI, 0); ctx.lineTo(a + r, b + r); ctx.closePath();
    ctx.fillStyle = '#000'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.fillStyle = '#ffc860'; ctx.fill();
    ctx.fillStyle = '#3a2408'; ctx.fillRect(a - r * 0.4, b, r * 0.8, r);
    if (grande) etiqueta(TT(s.nombre), a, b - r - 4, '#ffd060', 11);
  }
  for (const m of z.marcas) if (m.tipo === 'viaje') { const [a, b] = p(m.cx, m.cy); if (z.explorado[Math.floor(m.cy / 5) * z.tw + Math.floor(m.cx / 5)]) { ctx.fillStyle = '#60a0ff'; ctx.fillRect(a - 3, b - 3, 6, 6); } }
  for (const m of j.monstruos) if (!m.muerto && (m.calidad >= 2 || m.dueno) && dist2(m.x, m.y, h.x, h.y) < 400) { const [a, b] = p(m.x, m.y); ctx.fillStyle = m.dueno ? '#40ff40' : '#ff4020'; ctx.fillRect(a - 1, b - 1, 3, 3); }
  for (const n of j.npcs) { const [a, b] = p(n.x, n.y); ctx.fillStyle = '#e0e0ff'; ctx.fillRect(a - 1, b - 1, 3, 3); if (grande) etiqueta(TT(NPCS[n.npc].nombre), a, b - 5, '#c0c0ff'); }
  ctx.globalAlpha = 1;
  { const [hx, hy] = p(h.x, h.y); ctx.fillStyle = '#ff3030'; ctx.beginPath(); ctx.arc(hx, hy, grande ? 4 : 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  if (mt) { ctx.strokeStyle = '#a08050'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mt.cx, mt.cy, mt.r, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1; }
  else if (!grande) { ctx.strokeStyle = '#5a4a30'; ctx.strokeRect(W - 180.5, -1, 181, 161); texto(TT(z.nombre), W - 90, 154, { alin: 'center', tam: 10, color: '#c0a060', max: 170 }); }
  else texto(TT(z.nombre), W / 2, 30, { alin: 'center', tam: 18, color: '#c0a060', fuente: TITULO });
}
const dist2 = (a: number, b: number, c: number, d: number) => (a - c) ** 2 + (b - d) ** 2;
void entero; void BASES; void CASILLAS;

/** Cambia entre agresivo y pasivo (se guarda en el héroe) y avisa. */
export function cambiarAgresivo(j: Juego) {
  const d = j.heroe.d as any; d.agresivo = !d.agresivo;
  msg(j, d.agresivo ? ['Agresivo: atacas solo a lo que entra en tu alcance.', 'Aggressive: you attack whatever comes in reach.'] : ['Pasivo: no atacas sin una orden.', 'Passive: you do not attack without an order.'], d.agresivo ? '#ff8060' : '#a0a0b0');
  Sonido.efecto('click');
}
