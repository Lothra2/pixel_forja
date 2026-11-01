// La interfaz dentro del juego: barra de abajo con orbes, cinturón y habilidades; inventario, ficha, habilidades,
// cofre, tiendas, diálogos, piedras de viaje, misiones, mapa y menú.
import { ctx, W, H, E, pulso } from '../nucleo/lienzo';
import { barraInferior, orbe, zonasBarra, ladoOrbe, barraJefe, cursores, cartelMuerte, panelInventario, EQUIPO as EQUIPO_HUD, CELDA_INV } from '../../../src/engine/gotico/hud';
import { texto, T, TT, IDI, marco, titulo, boton, dentro, icono, lineasObjeto, tooltip, cacheRaster, rasterACanvas, envolver, TITULO } from './comun';
import { CLASES, HABILIDADES, habilidadesDe, ATAQUE, type Habilidad } from '../datos/clases';
import { NPCS } from '../datos/npcs';
import { MISIONES, ZONAS, PUEBLO_DE } from '../mundo/actos';
import { colorObj, crearObjeto, crearPocion, crearPergamino, engarzar, baseDe, textoStat, type Objeto } from '../juego/objetos';
import { BASES } from '../datos/objetos_datos';
import { CASILLAS, BOLSA_W, BOLSA_H, libre, cumpleReq, nivelHab, puedeAprender, xpPara, recoger, type Casilla, type EnBolsa } from '../juego/heroe';
import { recalc, usarPocion, abrirPortal, costoMana, danoHab, habilidadDe, msg, type Juego, type Monstruo } from '../juego/mundo';
import { Sonido } from '../audio/sonido';
import { R, entero, elegir } from '../nucleo/azar';

export type PanelId = 'inv' | 'pers' | 'habs' | 'cofre' | 'tienda' | 'dialogo' | 'viaje' | 'misiones' | 'menu' | 'elegirHab' | null;
export const ui = {
  izq: null as PanelId, der: null as PanelId, mapa: false, mano: null as Objeto | null,
  npc: null as string | null, dialogoTexto: null as string | null, tienda: [] as EnBolsa[], tiendaTipo: 'herrero' as 'herrero' | 'curandera' | 'vidente', pestana: 0,
  elegirLado: 'izq' as 'izq' | 'der', ramaHab: 0, cofre: [] as EnBolsa[], encima: null as any, sobreUI: false,
  confirmar: null as null | { txt: string; si: () => void },
};
export const COFRE_W = 10, COFRE_H = 8;
const BAR_H = 120;
const barraY = () => H - BAR_H;
const barraX = () => Math.round((W - 800) / 2);
const panelY = () => Math.max(0, Math.round((H - BAR_H - 432) / 2));
const panelDer = () => W - 320;

let cursoresC: Record<string, { c: HTMLCanvasElement; a: [number, number] }> | null = null;
let orbes: Record<string, HTMLCanvasElement[]> | null = null;
export function prepararHud() {
  if (!cursoresC) { cursoresC = {}; for (const c of cursores()) cursoresC[c.id] = { c: rasterACanvas(c.img), a: c.ancla }; }
  if (!orbes) { orbes = {}; for (const t of ['vida', 'mana', 'veneno', 'helado'] as const) { orbes[t + '1'] = []; orbes[t + '0'] = []; for (let f = 0; f < 8; f++) { orbes[t + '1'].push(rasterACanvas(orbe(t, 0.985, f))); orbes[t + '0'].push(rasterACanvas(orbe(t, 0, f))); } } }
}
export function dibujarCursor(tipo: string) {
  if (ui.mano) { icono(ui.mano, E.x - 14, E.y - 14, ui.mano.w * 29, ui.mano.h * 29); return; }
  const c = cursoresC?.[tipo] ?? cursoresC?.senalar;
  if (c) ctx.drawImage(c.c, Math.round(E.x - c.a[0]), Math.round(E.y - c.a[1]));
}

// ------------------------------------------------------------------ iconos de habilidad (propios)
export function iconoHab(hb: Habilidad, x: number, y: number, s: number, apagado = false) {
  ctx.save();
  const g = ctx.createRadialGradient(x + s / 2, y + s / 2, 2, x + s / 2, y + s / 2, s * 0.7);
  g.addColorStop(0, apagado ? '#303030' : hb.color); g.addColorStop(1, '#0a0806');
  ctx.fillStyle = g; ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = '#000'; ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
  ctx.strokeStyle = apagado ? '#3a3a3a' : '#a08850'; ctx.strokeRect(x + 1.5, y + 1.5, s - 3, s - 3);
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
    default: ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ barra de abajo
export function dibujarBarra(j: Juego, t: number) {
  prepararHud();
  const h = j.heroe, bx = barraX(), by = barraY();
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
  // cinturón
  for (let i = 0; i < 4; i++) {
    const z = Z(`cinturon_${i + 1}`); const o = h.d.cinturon[i];
    if (o) icono(o, bx + z.x, by + z.y, z.w, z.h);
    texto(String(i + 1), bx + z.x + 2, by + z.y + z.h - 2, { tam: 10, color: '#a09070' });
    if (dentro(bx + z.x, by + z.y, z.w, z.h)) {
      if (o) tooltip(lineasObjeto(o), E.x, by + z.y);
      if ((E.clicIzq || E.clicDer) && !ui.mano) { usarPocion(j, i); E.clicIzq = E.clicDer = false; }
      else if (E.clicIzq && ui.mano && ui.mano.tipo === 'pocion' && !o) { h.d.cinturon[i] = ui.mano; ui.mano = null; E.clicIzq = false; }
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
  // atajos F1-F8
  for (let i = 0; i < 8; i++) {
    const z = Z(`atajo_f${i + 1}`); const id = h.d.atajos[i];
    if (id) iconoHab(habilidadDe(id), bx + z.x, by + z.y, z.w);
    texto(`F${i + 1}`, bx + z.x + 1, by + z.y + 9, { tam: 8, color: '#a09070' });
  }
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
  if (E.tactil) {
    const r = 34, bx2 = W - 70, by2 = by - 50;
    for (const [i, lado, txt] of [[0, 'der', T('Poder', 'Skill')], [1, 'izq', T('Golpe', 'Hit')]] as [number, 'izq' | 'der', string][]) {
      const cx = bx2 - i * 84, cy = by2 - i * 30;
      ctx.save(); ctx.globalAlpha = 0.75; ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#a08050'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      iconoHab(habilidadDe(h.d[lado]), cx - 18, cy - 18, 36);
      texto(txt, cx, cy + r + 12, { alin: 'center', tam: 11 });
      if (E.clicIzq && Math.hypot(E.x - cx, E.y - cy) < r) { E.clicIzq = false; (ui as any).tactilHab = lado; }
    }
    if (dentro(bx2 - 130, by2 - 70, 170, 130)) ui.sobreUI = true;
  }
  ui.sobreUI = ui.sobreUI || E.y > by + 56 || dentro(bx, by, 130, BAR_H) || dentro(bx + 670, by, 130, BAR_H);
}
export function alternar(p: PanelId, lado: 'izq' | 'der') {
  if (lado === 'izq') ui.izq = ui.izq === p ? null : p; else ui.der = ui.der === p ? null : p;
  Sonido.efecto('click');
}

// ------------------------------------------------------------------ cosas de arriba: jefe, plaquita del monstruo, mensajes
export function dibujarArriba(j: Juego, encima: Monstruo | null) {
  if (j.jefe && !j.jefe.muerto) {
    const k = Math.round((j.jefe.vida / j.jefe.vidaMax) * 100);
    const c = cacheRaster(`jefe${j.jefe.id}_${k}_${IDI}`, () => barraJefe(TT(j.jefe!.nombre), k / 100));
    ctx.drawImage(c, Math.round(W / 2 - c.width / 2), 8);
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
  let y = H - BAR_H - 30;
  for (let i = j.mensajes.length - 1; i >= 0; i--) {
    const m = j.mensajes[i];
    ctx.globalAlpha = Math.min(1, 7 - m.t);
    texto(TT(m.txt), 14, y, { color: m.color, tam: 14 });
    ctx.globalAlpha = 1; y -= 18;
  }
}
export function dibujarMuerte() {
  const c = cacheRaster('muerte' + IDI, () => cartelMuerte(IDI ? 'en' : 'es'));
  ctx.drawImage(c, Math.round(W / 2 - c.width / 2), Math.round(H / 2 - c.height / 2 - 40));
}

// ------------------------------------------------------------------ paneles
export function dibujarPaneles(j: Juego, t: number) {
  ui.encima = null;
  if (ui.izq) dibujarPanel(j, ui.izq, 0, t);
  if (ui.der) dibujarPanel(j, ui.der, panelDer(), t);
  if (ui.izq || ui.der) {
    const px = ui.izq ? 320 : 0, px2 = ui.der ? W - 320 : W;
    if ((ui.izq && E.x < 320) || (ui.der && E.x >= W - 320)) if (E.y < H - BAR_H) ui.sobreUI = true;
    void px; void px2;
  }
  if (ui.confirmar) {
    const w = 360, h = 110, x = W / 2 - w / 2, y = H / 2 - h / 2 - 40;
    marco(x, y, w, h); envolver(ui.confirmar.txt, w - 30).forEach((l, i) => texto(l, W / 2, y + 30 + i * 16, { alin: 'center' }));
    if (boton(T('Sí', 'Yes'), x + 40, y + h - 40, 120, 28)) { ui.confirmar.si(); ui.confirmar = null; E.clicIzq = false; }
    if (boton(T('No', 'No'), x + w - 160, y + h - 40, 120, 28)) { ui.confirmar = null; E.clicIzq = false; }
    ui.sobreUI = true;
  }
}
function dibujarPanel(j: Juego, p: PanelId, x: number, t: number) {
  const y = panelY();
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
    case 'menu': return panelMenu(j, x, y);
  }
}

// ---------------- inventario
function panelInv(j: Juego, x: number, y: number, t: number) {
  const h = j.heroe;
  ctx.drawImage(cacheRaster('inv' + IDI, () => panelInventario(IDI ? 'en' : 'es', { vacio: true, oro: 0 }).img), x, y);
  // tapar el oro y el peso de muestra
  const yo = 252 + 4 * CELDA_INV + 12;
  ctx.fillStyle = '#100c09'; ctx.fillRect(x + 22, y + yo + 2, 126, 16); ctx.fillRect(x + 180, y + yo, 125, 20);
  texto(`${T('Oro', 'Gold')}: ${h.d.oro.toLocaleString()}`, x + 30, y + yo + 15, { color: '#e8c050' });
  // equipo
  for (const e of EQUIPO_HUD) {
    const cas = ({ casco: 'cabeza', pecho: 'torso', arma: 'arma', mano_libre: 'izq', guantes: 'manos', cinturon: 'cinturon', botas: 'pies', amuleto: 'amuleto', anillo_izq: 'anillo1', anillo_der: 'anillo2' } as Record<string, Casilla>)[e.id];
    const o = h.d.equipo[cas];
    const ex = x + e.x, ey = y + e.y;
    if (o) { ctx.fillStyle = 'rgba(10,8,6,0.9)'; ctx.fillRect(ex + 2, ey + 2, e.w - 4, e.h - 4); if (o.rareza !== 'normal') { ctx.fillStyle = colorObj(o) + '22'; ctx.fillRect(ex + 2, ey + 2, e.w - 4, e.h - 4); } icono(o, ex + 2, ey + 2, e.w - 4, e.h - 4, t); if (o.durabMax && o.durab <= 0) { ctx.fillStyle = 'rgba(160,0,0,0.35)'; ctx.fillRect(ex, ey, e.w, e.h); } }
    if (dentro(ex, ey, e.w, e.h)) {
      if (ui.mano) { const ok = ranuraCasa(ui.mano, cas) && cumpleReq(h.d, h.c, ui.mano); ctx.strokeStyle = ok ? '#40ff40' : '#ff4040'; ctx.strokeRect(ex + 1, ey + 1, e.w - 2, e.h - 2); }
      else if (o) ui.encima = { o, x: ex + e.w / 2, y: ey, comparar: false };
      if (E.clicIzq) { E.clicIzq = false; clicEquipo(j, cas); }
    }
  }
  // bolsa
  const bx = x + 15, by = y + 252;
  rejillaObjetos(j, h.d.bolsa, bx, by, BOLSA_W, BOLSA_H, t, 'bolsa');
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
    if (!cumpleReq(h.d, h.c, ui.mano)) { Sonido.efecto('negado'); msg(j, ['No cumplo los requisitos.', 'I do not meet the requirements.']); return; }
    // dos manos y escudo
    const b = baseDe(ui.mano)!;
    if (cas === 'izq' && h.d.equipo.arma && baseDe(h.d.equipo.arma)?.dosManos) { Sonido.efecto('negado'); msg(j, ['Llevo un arma a dos manos.', 'I am wielding a two-handed weapon.']); return; }
    h.d.equipo[cas] = ui.mano; ui.mano = actual;
    if (cas === 'arma' && b.dosManos && h.d.equipo.izq && !ui.mano) { ui.mano = h.d.equipo.izq; delete h.d.equipo.izq; }
    Sonido.efecto('equipar');
  } else if (actual) { ui.mano = actual; delete h.d.equipo[cas]; Sonido.efecto('equipar'); }
  recalc(j);
}
/** Rejilla de objetos (bolsa, cofre, tienda). */
function rejillaObjetos(j: Juego, lista: EnBolsa[], x: number, y: number, cw: number, ch: number, t: number, tipo: 'bolsa' | 'cofre' | 'tienda') {
  const C = CELDA_INV;
  if (tipo !== 'bolsa') { ctx.fillStyle = '#0a0806'; ctx.fillRect(x, y, cw * C, ch * C); ctx.strokeStyle = '#2a2219'; for (let i = 0; i <= cw; i++) { ctx.beginPath(); ctx.moveTo(x + i * C + 0.5, y); ctx.lineTo(x + i * C + 0.5, y + ch * C); ctx.stroke(); } for (let k = 0; k <= ch; k++) { ctx.beginPath(); ctx.moveTo(x, y + k * C + 0.5); ctx.lineTo(x + cw * C, y + k * C + 0.5); ctx.stroke(); } }
  for (const b of lista) {
    const ox = x + b.x * C, oy = y + b.y * C;
    ctx.fillStyle = b.o.rareza === 'normal' ? 'rgba(40,40,60,0.35)' : colorObj(b.o) + '30'; ctx.fillRect(ox + 1, oy + 1, b.o.w * C - 1, b.o.h * C - 1);
    if (tipo === 'tienda' && ui.tiendaTipo === 'vidente') { ctx.globalAlpha = 0.85; }
    icono(b.o, ox + 1, oy + 1, b.o.w * C - 1, b.o.h * C - 1, t);
    ctx.globalAlpha = 1;
    if (!cumpleReq(j.heroe.d, j.heroe.c, b.o) && b.o.tipo === 'equipo') { ctx.fillStyle = 'rgba(160,0,0,0.25)'; ctx.fillRect(ox + 1, oy + 1, b.o.w * C - 1, b.o.h * C - 1); }
  }
  if (!dentro(x, y, cw * C, ch * C)) return;
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
      // engarzar
      if ((ui.mano.tipo === 'gema' || ui.mano.tipo === 'runa') && bajo && bajo.o.huecos > bajo.o.engarces.length && bajo.o.tipo === 'equipo') { if (engarzar(bajo.o, ui.mano)) { ui.mano = null; Sonido.efecto('equipar'); } return; }
      if (choques.length === 0) { lista.push({ o: ui.mano, x: px, y: py }); ui.mano = null; Sonido.efecto('objeto_cae', { vol: 0.5 }); }
      else if (choques.length === 1) { const c = choques[0]; lista.splice(lista.indexOf(c), 1); lista.push({ o: ui.mano, x: px, y: py }); ui.mano = c.o; Sonido.efecto('objeto_cae', { vol: 0.5 }); }
    }
    return;
  }
  if (!bajo) return;
  ctx.strokeStyle = '#c0a060'; ctx.strokeRect(x + bajo.x * C + 0.5, y + bajo.y * C + 0.5, bajo.o.w * C, bajo.o.h * C);
  ui.encima = { o: bajo.o, x: x + (bajo.x + bajo.o.w / 2) * C, y: y + bajo.y * C, comparar: bajo.o.tipo === 'equipo', tienda: tipo === 'tienda' };
  if (E.clicIzq) {
    E.clicIzq = false;
    if (tipo === 'tienda') { comprar(j, bajo); return; }
    if (ui.der === 'tienda' || ui.izq === 'tienda') { /* con la tienda abierta, clic levanta igual */ }
    lista.splice(lista.indexOf(bajo), 1); ui.mano = bajo.o; Sonido.efecto('click');
  } else if (E.clicDer) {
    E.clicDer = false;
    if (tipo === 'bolsa' && (ui.izq === 'tienda')) { lista.splice(lista.indexOf(bajo), 1); ui.mano = bajo.o; venderMano(j); return; }
    if (tipo === 'bolsa' && ui.izq === 'cofre') { const p = lugarEn(ui.cofre, bajo.o, COFRE_W, COFRE_H); if (p) { lista.splice(lista.indexOf(bajo), 1); ui.cofre.push({ o: bajo.o, x: p[0], y: p[1] }); } return; }
    if (tipo === 'cofre') { const p = lugarEn(j.heroe.d.bolsa, bajo.o, BOLSA_W, BOLSA_H); if (p) { lista.splice(lista.indexOf(bajo), 1); j.heroe.d.bolsa.push({ o: bajo.o, x: p[0], y: p[1] }); } return; }
    if (tipo !== 'bolsa') return;
    const o = bajo.o;
    if (o.tipo === 'pocion') { const i = j.heroe.d.cinturon.findIndex((c) => !c); if (i >= 0) { lista.splice(lista.indexOf(bajo), 1); j.heroe.d.cinturon[i] = o; } else { lista.splice(lista.indexOf(bajo), 1); j.heroe.d.cinturon.push(o); usarPocion(j, j.heroe.d.cinturon.length - 1); j.heroe.d.cinturon.length = 4; } return; }
    if (o.base === 'pergamino_portal') { abrirPortal(j); return; }
    if (o.tipo === 'equipo') { // equipar rápido
      const r = baseDe(o)!.ranura; const cas: Casilla = r === 'anillo' ? (j.heroe.d.equipo.anillo1 ? 'anillo2' : 'anillo1') : (r as Casilla);
      lista.splice(lista.indexOf(bajo), 1); ui.mano = o; clicEquipo(j, cas);
      if (ui.mano === o) { lista.push(bajo); ui.mano = null; } else if (ui.mano) { const p = lugarEn(lista, ui.mano, BOLSA_W, BOLSA_H); if (p) { lista.push({ o: ui.mano, x: p[0], y: p[1] }); ui.mano = null; } }
    }
  }
}
export function lugarEn(lista: EnBolsa[], o: Objeto, cw: number, ch: number): [number, number] | null {
  for (let x = 0; x <= cw - o.w; x++) for (let y = 0; y <= ch - o.h; y++) if (libre(lista, x, y, o.w, o.h)) return [x, y];
  return null;
}
/** El tooltip del objeto bajo el ratón, con comparación con lo equipado. */
export function dibujarTooltipObjeto(j: Juego) {
  const e = ui.encima; if (!e || ui.mano) return;
  const h = j.heroe;
  const l = lineasObjeto(e.o, { nivel: h.d.nivel, fue: h.c.fue, des: h.c.des, clase: h.d.clase });
  if (e.tienda) { const p = ui.tiendaTipo === 'vidente' ? precioApuesta(e.o) : precioCompra(e.o); l.push([`${T('Precio', 'Price')}: ${p.toLocaleString()} ${T('de oro', 'gold')}`, h.d.oro >= p ? '#e8c050' : '#ff4040']); }
  else if (ui.izq === 'tienda') l.push([`${T('Clic derecho: vender por', 'Right click: sell for')} ${precioVenta(e.o)}`, '#e8c050']);
  let extra: [string, string][] | undefined;
  if (e.comparar) {
    const r = baseDe(e.o)?.ranura; const cas = r === 'anillo' ? 'anillo1' : r as Casilla;
    const actual = cas ? h.d.equipo[cas] : undefined;
    if (actual && actual !== e.o) {
      extra = [[T('Equipado:', 'Equipped:'), '#808080'], [TT(actual.nombre), colorObj(actual)]];
      if (actual.dano && e.o.dano) { const d = (e.o.dano[0] + e.o.dano[1]) / 2 - (actual.dano[0] + actual.dano[1]) / 2; extra.push([`${T('Daño', 'Damage')} ${d >= 0 ? '+' : ''}${d.toFixed(1)}`, d >= 0 ? '#60ff60' : '#ff6060']); }
      if (actual.def !== undefined && e.o.def !== undefined) { const d = e.o.def - actual.def; extra.push([`${T('Defensa', 'Defense')} ${d >= 0 ? '+' : ''}${d}`, d >= 0 ? '#60ff60' : '#ff6060']); }
    }
  }
  tooltip(l, e.x, e.y, extra);
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

// ---------------- árbol de habilidades
function panelHabs(j: Juego, x: number, y: number) {
  const h = j.heroe, d = h.d;
  marco(x, y, 320, 432); titulo(T('Habilidades', 'Skills'), x, y, 320);
  const cl = CLASES.find((q) => q.id === d.clase)!;
  cl.ramas.forEach((r, i) => { if (boton(TT(r), x + 12 + i * 100, y + 38, 96, 24, { tam: 12, color: ui.ramaHab === i ? '#ffe090' : undefined })) { ui.ramaHab = i; E.clicIzq = false; } });
  texto(`${T('Puntos', 'Points')}: ${d.puntosHab}`, x + 160, y + 80, { alin: 'center', color: d.puntosHab ? '#ffd060' : '#a09070' });
  const lista = habilidadesDe(d.clase).filter((hb) => hb.rama === ui.ramaHab).sort((a, b) => a.nivelReq - b.nivelReq);
  lista.forEach((hb, i) => {
    const yy = y + 92 + i * 52;
    const n = d.habs[hb.id] ?? 0, puede = puedeAprender(d, hb);
    iconoHab(hb, x + 16, yy, 44, n === 0 && !puede);
    texto(TT(hb.nombre), x + 68, yy + 16, { color: n ? '#f0e0b0' : '#908070' });
    texto(n ? `${T('Nivel', 'Level')} ${n}${h.c.mas_habilidades ? ` (+${h.c.mas_habilidades})` : ''}` : `${T('Requiere nivel', 'Requires level')} ${hb.nivelReq}`, x + 68, yy + 32, { tam: 11, color: '#a09070' });
    if (puede && boton('+', x + 270, yy + 8, 30, 28, { tam: 18 })) { d.habs[hb.id] = n + 1; d.puntosHab--; Sonido.efecto('click'); recalc(j); if (d.izq === 'ataque' && hb.tipo !== 'pasiva' && hb.tipo !== 'aura' && n === 0 && hb.anim === 'atacar') {/* nada */} if (d.der === 'ataque' && n === 0 && hb.tipo !== 'pasiva') d.der = hb.id; E.clicIzq = false; }
    if (dentro(x + 16, yy, 250, 44)) mostrarAyudaHab(j, hb, x > W / 2 ? x - 170 : x + 490, yy + 40);
  });
}
function mostrarAyudaHab(j: Juego, hb: Habilidad, x: number, y: number) {
  const h = j.heroe, n = Math.max(1, nivelHab(h.d, hb.id, h.c));
  const l: [string, string][] = [[TT(hb.nombre), '#f0d080']];
  for (const s of envolver(TT(hb.desc), 260, 13)) l.push([s, '#d0c0a0']);
  if (hb.req?.length) l.push([`${T('Requiere', 'Requires')}: ${hb.req.map((r) => TT(HABILIDADES.find((q) => q.id === r)!.nombre)).join(', ')}`, '#c08060']);
  if (hb.mana[0]) l.push([`${T('Maná', 'Mana')}: ${costoMana(j, hb).toFixed(1)}`, '#8090ff']);
  if (hb.dano) { const d = danoHab(j, hb, n); l.push([`${T('Daño', 'Damage')}: ${d[0]} - ${d[1]}`, '#e0e0e0']); }
  if (hb.mult) l.push([`${T('Daño del arma', 'Weapon damage')}: ${Math.round(hb.mult[0] + hb.mult[1] * (n - 1))}%`, '#e0e0e0']);
  for (const [k, b] of Object.entries(hb.bonos ?? {})) { const v = Math.round((b[0] + b[1] * (n - 1)) * 10) / 10; if (['miedo', 'aturdir', 'empuje', 'tempestad', 'huracan', 'escarcha'].includes(k)) continue; l.push([textoStat(k, v, IDI).replace(/^\+?(.+)$/, (m) => m), '#7c94ff']); }
  if (hb.sinergias?.length) l.push([`${T('Sinergias', 'Synergies')}: ${hb.sinergias.map(([s, p]) => `${TT(HABILIDADES.find((q) => q.id === s)!.nombre)} +${p}%`).join(', ')}`, '#40d040']);
  if (hb.tipo === 'aura') l.push([T('Ponla en el botón derecho para activarla', 'Set it on the right button to activate'), '#a0a0a0']);
  tooltip(l, x, y);
}
function panelElegir(j: Juego, x: number, y: number) {
  const h = j.heroe;
  const lista: Habilidad[] = [ATAQUE, ...habilidadesDe(h.d.clase).filter((hb) => (h.d.habs[hb.id] ?? 0) > 0 && hb.tipo !== 'pasiva' && (ui.elegirLado === 'der' || hb.tipo !== 'aura'))];
  marco(x, y, 320, 432); titulo(ui.elegirLado === 'izq' ? T('Botón izquierdo', 'Left button') : T('Botón derecho', 'Right button'), x, y, 320);
  texto(T('Pasa el ratón y pulsa F1-F8 para un atajo', 'Hover and press F1-F8 for a hotkey'), x + 160, y + 52, { alin: 'center', tam: 11, color: '#a09070' });
  lista.forEach((hb, i) => {
    const xx = x + 16 + (i % 5) * 58, yy = y + 64 + Math.floor(i / 5) * 58;
    iconoHab(hb, xx, yy, 48);
    const fk = h.d.atajos.indexOf(hb.id); if (fk >= 0) texto(`F${fk + 1}`, xx + 2, yy + 46, { tam: 10, color: '#ffd060' });
    if (dentro(xx, yy, 48, 48)) {
      mostrarAyudaHab(j, hb, xx + 24, yy);
      if (E.clicIzq) { h.d[ui.elegirLado] = hb.id; ui.der = null; E.clicIzq = false; Sonido.efecto('click'); recalc(j); }
      for (let k = 1; k <= 8; k++) if (pulso('F' + k)) { h.d.atajos = h.d.atajos.map((a) => (a === hb.id ? null : a)); h.d.atajos[k - 1] = hb.id; }
    }
  });
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
  const h = j.heroe, nivel = Math.max(1, Math.min(70, Math.max(h.d.nivel, ZONAS[j.zona.id].nivel) + 2));
  ui.tiendaTipo = tipo; ui.tienda = [];
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
const precioVenta = (o: Objeto) => Math.max(1, Math.round(o.precio * 0.25 * (o.durabMax ? 0.3 + 0.7 * o.durab / o.durabMax : 1)));
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
  if (ui.mano && dentro(x, y, 320, 432)) texto(T('Clic para vender', 'Click to sell'), x + 160, y + 425, { alin: 'center', tam: 11, color: '#e8c050' });
  if (boton(T('Cerrar', 'Close'), x + 230, y + 395, 76, 26, { tam: 12 })) { ui.izq = null; ui.der = null; E.clicIzq = false; }
}

// ---------------- diálogo con la gente del campamento
export function hablarCon(j: Juego, id: string) {
  ui.npc = id; ui.dialogoTexto = null; ui.izq = 'dialogo'; ui.der = null;
  const n = NPCS[id]; ui.dialogoTexto = TT(elegir(n.saludo));
  Sonido.efecto('click');
  // misiones: quien da misiones entrega las pendientes
  if (n.oficio === 'misiones') revisarMisiones(j);
}
function revisarMisiones(j: Juego) {
  const d = j.heroe.d;
  for (const m of MISIONES.filter((q) => q.acto === d.acto)) {
    const e = d.misiones[m.id] ?? 0;
    if (e === 2) { // terminar
      d.misiones[m.id] = 3;
      const p = m.premio;
      if (p.habilidad) d.puntosHab += p.habilidad;
      if (p.atributos) d.puntosAtrib += p.atributos;
      if (p.oro) d.oro += p.oro;
      if (p.vida) d.vit += Math.round(p.vida / 3);
      if (p.resistencia) d.ene += 0;
      if (p.objeto) { const o = crearObjeto(Math.max(d.nivel, 5), p.objeto); if (!recoger(d, o)) j.suelo.push({ o, oro: 0, x: j.heroe.x + 1, y: j.heroe.y + 1, t: 0, id: Date.now() }); }
      ui.dialogoTexto = TT(m.hecho);
      Sonido.efecto('mision');
      recalc(j);
      if (m.cierraActo && d.acto < 5) { const sig = PUEBLO_DE[d.acto + 1]; if (!d.viajes.includes(sig)) d.viajes.push(sig); }
      j.eventos.push({ tipo: 'mision_hecha', dato: m.id });
      return;
    }
  }
  const sig = MISIONES.find((q) => q.acto === d.acto && (d.misiones[q.id] ?? 0) === 0);
  if (sig && MISIONES.filter((q) => q.acto === d.acto && (d.misiones[q.id] ?? 0) === 1).length === 0) { d.misiones[sig.id] = 1; ui.dialogoTexto = TT(sig.pedido); Sonido.efecto('mision'); }
}
function panelDialogo(j: Juego, x: number, y: number) {
  const n = NPCS[ui.npc ?? '']; if (!n) { ui.izq = null; return; }
  marco(x, y, 320, 432); titulo(TT(n.nombre), x, y, 320);
  envolver(ui.dialogoTexto ?? '', 280, 14).slice(0, 12).forEach((l, i) => texto(l, x + 20, y + 62 + i * 19, { tam: 14, color: '#e0d0b0' }));
  let by = y + 300;
  const op = (s: string, f: () => void) => { if (boton(s, x + 40, by, 240, 26, { tam: 13 })) { E.clicIzq = false; f(); } by += 30; };
  op(T('Cuéntame', 'Tell me'), () => { ui.dialogoTexto = TT(n.relato); });
  if (n.oficio === 'misiones') op(T('Misiones', 'Quests'), () => { revisarMisiones(j); const act = MISIONES.find((q) => q.acto === j.heroe.d.acto && (j.heroe.d.misiones[q.id] ?? 0) === 1); if (act && ui.dialogoTexto === null) ui.dialogoTexto = TT(act.pedido); else if (act) ui.dialogoTexto = TT(act.pedido); });
  if (n.oficio === 'herrero') op(T('Comerciar y reparar', 'Trade and repair'), () => abrirTienda(j, 'herrero'));
  if (n.oficio === 'curandera') op(T('Curarme y comprar remedios', 'Heal me and buy remedies'), () => { j.heroe.vida = j.heroe.vidaMax; j.heroe.mana = j.heroe.c.manaMax; j.heroe.veneno = 0; Sonido.efecto('curar'); abrirTienda(j, 'curandera'); });
  if (n.oficio === 'vidente') op(T('Probar suerte', 'Try my luck'), () => abrirTienda(j, 'vidente'));
  op(T('Adiós', 'Farewell'), () => { ui.izq = null; });
}

// ---------------- piedras de viaje
function panelViaje(j: Juego, x: number, y: number) {
  const d = j.heroe.d;
  marco(x, y, 320, 432); titulo(T('Piedras de viaje', 'Travel stones'), x, y, 320);
  const actos = [1, 2, 3, 4, 5].filter((a) => d.viajes.some((v) => ZONAS[v]?.acto === a));
  let yy = y + 50;
  for (const a of actos) {
    texto(`${T('Acto', 'Act')} ${a}`, x + 20, yy + 12, { color: '#c0a060', fuente: TITULO }); yy += 20;
    for (const z of Object.values(ZONAS).filter((q) => q.acto === a && q.piedraViaje)) {
      const tiene = d.viajes.includes(z.id);
      if (boton(TT(z.nombre), x + 30, yy, 260, 22, { tam: 12, activo: tiene && z.id !== j.zona.id })) { E.clicIzq = false; if (tiene) j.eventos.push({ tipo: 'viajar', dato: z.id }); ui.izq = null; }
      yy += 24;
    }
  }
}
function panelMisiones(j: Juego, x: number, y: number) {
  const d = j.heroe.d;
  marco(x, y, 320, 432); titulo(T('Misiones', 'Quests'), x, y, 320);
  let yy = y + 56;
  for (const m of MISIONES) {
    const e = d.misiones[m.id] ?? 0; if (e === 0 && m.acto > d.acto) continue;
    const col = e === 3 ? '#707070' : e === 2 ? '#80ff80' : e === 1 ? '#f0d080' : '#5a5040';
    texto(`${T('Acto', 'Act')} ${m.acto} · ${TT(m.nombre)}`, x + 18, yy, { color: col, tam: 13 });
    texto(e === 3 ? T('Terminada', 'Completed') : e === 2 ? T('Vuelve a contarlo', 'Return to report') : e === 1 ? T('En curso', 'In progress') : T('Sin empezar', 'Not started'), x + 34, yy + 15, { tam: 11, color: '#a09070' });
    yy += 34;
  }
}
function panelMenu(j: Juego, x: number, y: number) {
  marco(x, y, 320, 432); titulo(T('Menú', 'Menu'), x, y, 320);
  let yy = y + 80;
  const op = (s: string, f: () => void) => { if (boton(s, x + 40, yy, 240, 34)) { E.clicIzq = false; f(); } yy += 46; };
  op(T('Volver al juego', 'Return to game'), () => { ui.izq = null; });
  op(T('Opciones', 'Options'), () => j.eventos.push({ tipo: 'opciones' }));
  op(T('Misiones (Q)', 'Quests (Q)'), () => { ui.izq = 'misiones'; });
  op(T('Guardar y salir', 'Save and quit'), () => j.eventos.push({ tipo: 'salir' }));
  texto(T('Teclas: clic izq. caminar/atacar · clic der. habilidad · 1-4 pociones · I inventario · C personaje · T habilidades · Q misiones · Tab mapa · Alt botín · R correr · Shift atacar sin moverse · B portal', 'Keys: left click walk/attack · right click skill · 1-4 potions · I inventory · C character · T skills · Q quests · Tab map · Alt loot · R run · Shift attack in place · B portal'), x + 18, y + 330, { tam: 1 });
  envolver(T('Clic izquierdo camina y ataca · clic derecho usa la habilidad · 1-4 pociones · I inventario · C personaje · T habilidades · Q misiones · Tab mapa · Alt muestra el botín · R correr o caminar · Shift ataca sin moverte · B portal al campamento', 'Left click walks and attacks · right click uses the skill · 1-4 potions · I inventory · C character · T skills · Q quests · Tab map · Alt shows loot · R run or walk · Shift attacks in place · B portal to camp'), 280, 11).forEach((l, i) => texto(l, x + 20, y + 290 + i * 14, { tam: 11, color: '#a09070' }));
}

// ------------------------------------------------------------------ mapa (Tab) y minimapa
export function dibujarMapa(j: Juego, grande: boolean) {
  const z = j.zona, h = j.heroe;
  const esc = grande ? 3.2 : 1.4;
  const cx = grande ? W / 2 : W - 90, cy = grande ? (H - BAR_H) / 2 : 80;
  const p = (x: number, y: number): [number, number] => [cx + (x - h.x - (y - h.y)) * esc * 0.5, cy + (x - h.x + (y - h.y)) * esc * 0.25];
  ctx.save();
  if (!grande) { ctx.beginPath(); ctx.rect(W - 180, 0, 180, 160); ctx.clip(); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(W - 180, 0, 180, 160); }
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
  for (const s of z.salidas) { const [a, b] = p(s.cx, s.cy); if (!z.explorado[Math.floor(s.cy / 5) * z.tw + Math.floor(s.cx / 5)]) continue; ctx.fillStyle = '#ffd060'; ctx.fillRect(a - 2, b - 2, 5, 5); if (grande) texto(TT(s.nombre), a, b - 6, { alin: 'center', tam: 11, color: '#ffd060' }); }
  for (const m of z.marcas) if (m.tipo === 'viaje') { const [a, b] = p(m.cx, m.cy); if (z.explorado[Math.floor(m.cy / 5) * z.tw + Math.floor(m.cx / 5)]) { ctx.fillStyle = '#60a0ff'; ctx.fillRect(a - 3, b - 3, 6, 6); } }
  for (const m of j.monstruos) if (!m.muerto && (m.calidad >= 2 || m.dueno) && dist2(m.x, m.y, h.x, h.y) < 400) { const [a, b] = p(m.x, m.y); ctx.fillStyle = m.dueno ? '#40ff40' : '#ff4020'; ctx.fillRect(a - 1, b - 1, 3, 3); }
  for (const n of j.npcs) { const [a, b] = p(n.x, n.y); ctx.fillStyle = '#e0e0ff'; ctx.fillRect(a - 1, b - 1, 3, 3); if (grande) texto(TT(NPCS[n.npc].nombre), a, b - 5, { alin: 'center', tam: 10, color: '#c0c0ff' }); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ff3030'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (!grande) { ctx.strokeStyle = '#5a4a30'; ctx.strokeRect(W - 180.5, -1, 181, 161); texto(TT(z.nombre), W - 90, 154, { alin: 'center', tam: 10, color: '#c0a060', max: 170 }); }
  else texto(TT(z.nombre), W / 2, 30, { alin: 'center', tam: 18, color: '#c0a060', fuente: TITULO });
}
const dist2 = (a: number, b: number, c: number, d: number) => (a - c) ** 2 + (b - d) ** 2;
void entero; void BASES; void CASILLAS;
