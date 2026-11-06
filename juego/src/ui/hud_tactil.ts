// HUD táctil (teléfono y tablet): se dibuja en vez de la barra de PC cuando la entrada es táctil.
//   Arriba a la izquierda: orbes de vida y maná con su número, el recurso de la clase y la misión en curso.
//   Arriba a la derecha: cinco botones (personaje, bolsa, habilidades, mapa, menú) y el minimapa redondo debajo.
//   Abajo a la derecha: Golpe grande en la esquina, un arco con Poder y tres atajos, y el interruptor Agresivo / Calmo.
//   Abajo al centro: el cinturón de pociones y la experiencia en una línea fina.
//   Abajo a la izquierda: un joystick que aparece donde apoyas el pulgar.
// Todo en tamaños de dedo (44 pt o más), lejos de los bordes laterales (notch e isla) y respetando el área segura.
import { ctx, W, H, E, ESCALA, SEGURO } from '../nucleo/lienzo';
import { texto, T, TT, dentro, icono } from './comun';
import { ui, alternar, iconoHab, orbeHud, recursoClase, objetivoTxt, COLOR_POCION, cambiarAgresivo } from './juego_ui';
import { hud, type Rect } from './hud_rects';
import { MISIONES } from '../mundo/actos';
import { habilidadDe, costoMana, usarPocion, caminarA, type Juego } from '../juego/mundo';
import { cant, nivelHab, tiposCinturon, xpPara } from '../juego/heroe';
import { aPant, aMundo } from '../render/escena';
import { Sonido } from '../audio/sonido';

/** Puntos de pantalla a píxeles del lienzo. */
const L = (pt: number) => pt / Math.max(0.1, ESCALA);
const CLAVES = ['orbes', 'rastreo', 'botones', 'mini', 'golpe', 'poder', 'hab1', 'hab2', 'hab3', 'agresivo', 'cinturon', 'xp', 'jefe'];
/** Los objetivos de toque de este cuadro, para la auditoría (cada uno debe medir 44 pt o más). */
export const toques: { id: string; r: Rect }[] = [];
let joy: { x0: number; y0: number; activo: boolean; repath: number } | null = null;
let miniOculto = false;

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
  // el arco: escalones alrededor de Golpe, con 6 pt o más entre cajas (no solo entre círculos)
  const habs = ([[-72, 8], [-80, -58], [-24, -90], [10, -150]] as [number, number][]).map(([dx, dy]) => [gx + L(dx), gy + L(dy)] as [number, number]);
  const agresivo: Rect = [W - m.r - A, habs[3][1] - S / 2 - L(10) - A, A, A];
  const P = L(44), cw = P * 4 + gap * 3;
  // en vertical la pantalla es angosta: el cinturón va a la izquierda para no chocar con el arco
  const cinturon: Rect = [innerWidth > innerHeight ? W / 2 - cw / 2 : m.l, H - m.b - L(8) - P, cw, P];
  const xp: Rect = [m.l, H - m.b - L(4), W - m.l - m.r, L(3)];
  return { m, O, B, gap, orbes, rastreo, botones, mini, R, G, S, A, gx, gy, habs, agresivo, P, cinturon, xp };
}

const circ = (cx: number, cy: number, d: number): Rect => [cx - d / 2, cy - d / 2, d, d];
function boton(id: string, r: Rect, dibujo: () => void, accion: () => void, redondo = false) {
  hud[id] = r; toques.push({ id, r });
  const enc = dentro(r[0], r[1], r[2], r[3]);
  ctx.save(); ctx.globalAlpha = 0.82;
  ctx.fillStyle = enc && E.izq ? '#3a2a18' : '#14100c';
  ctx.beginPath(); if (redondo) ctx.arc(r[0] + r[2] / 2, r[1] + r[3] / 2, r[2] / 2, 0, Math.PI * 2); else ctx.rect(r[0], r[1], r[2], r[3]); ctx.fill();
  ctx.globalAlpha = 1; ctx.strokeStyle = '#a08050'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  dibujo();
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
    const hbI = habilidadDe(d.izq);
    const rG = circ(P.gx, P.gy, P.G);
    boton('golpe', rG, () => { iconoHab(hbI, P.gx - P.G * 0.3, P.gy - P.G * 0.3, P.G * 0.6); texto(T('Golpe', 'Hit'), P.gx, P.gy + P.G / 2 - L(4), { alin: 'center', tam: Math.round(L(10)), color: '#e8d8b0' }); }, () => { (ui as any).tactilHab = 'izq'; }, true);
    habsArco(j).forEach((id, i) => {
      const [cx, cy] = P.habs[i], r = circ(cx, cy, P.S), clave = i === 0 ? 'poder' : 'hab' + i;
      if (!id) { boton(clave, r, () => texto('+', cx, cy + L(7), { alin: 'center', tam: Math.round(L(22)), color: '#806a50' }), () => alternar('habs', 'der'), true); return; }
      const hb = habilidadDe(id), n = hb.id === 'ataque' ? 1 : nivelHab(d, hb.id, h.c), costo = hb.id === 'ataque' ? 0 : costoMana(j, hb);
      boton(clave, r, () => {
        iconoHab(hb, cx - P.S * 0.32, cy - P.S * 0.32, P.S * 0.64, n <= 0);
        const rc = h.recargas[hb.id] ?? 0;
        if (rc > 0) { ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, P.S / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, rc / (hb.recarga ?? 1))); ctx.closePath(); ctx.fill(); ctx.restore(); }
        if (h.mana < costo) { ctx.save(); ctx.fillStyle = 'rgba(0,10,90,0.5)'; ctx.beginPath(); ctx.arc(cx, cy, P.S / 2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); texto(String(Math.ceil(costo)), cx, cy + L(5), { alin: 'center', tam: Math.round(L(13)), color: '#a0b8ff' }); }
        if (i === 0) texto(T('Poder', 'Skill'), cx, cy + P.S / 2 - L(3), { alin: 'center', tam: Math.round(L(9)), color: '#e8d8b0' });
      }, () => { if (i === 0) (ui as any).tactilHab = 'der'; else (ui as any).tactilHabId = id; }, true);
    });
    // agresivo o calmo, con su nombre
    const ag = !!(d as any).agresivo, r = P.agresivo;
    boton('agresivo', r, () => {
      const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2, s = r[2];
      ctx.save();
      const iy = cy - s * 0.1;
      if (ag) { ctx.strokeStyle = '#ff4030'; ctx.lineWidth = Math.max(3, s * 0.08); ctx.beginPath(); ctx.moveTo(cx - s * 0.2, iy + s * 0.2); ctx.lineTo(cx + s * 0.18, iy - s * 0.18); ctx.stroke(); }
      else { ctx.fillStyle = '#9a9aa4'; ctx.beginPath(); ctx.moveTo(cx - s * 0.17, iy - s * 0.19); ctx.lineTo(cx + s * 0.17, iy - s * 0.19); ctx.lineTo(cx + s * 0.14, iy + s * 0.04); ctx.lineTo(cx, iy + s * 0.21); ctx.lineTo(cx - s * 0.14, iy + s * 0.04); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      texto(ag ? T('Agresivo', 'Aggressive') : T('Calmo', 'Calm'), cx, r[1] + r[3] - L(3), { alin: 'center', tam: Math.round(L(8)), color: ag ? '#ff8060' : '#c0c0c8', max: r[2] - L(4) });
    }, () => cambiarAgresivo(j));
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

  // ---------------- joystick: aparece donde apoyas el pulgar, abajo a la izquierda, fuera de los botones
  {
    const zona = (x: number, y: number) => x < W * 0.42 && y > H * 0.38 && !Object.values(hud).some((r) => dentro(r[0], r[1], r[2], r[3]) && x >= r[0] && x <= r[0] + r[2]);
    if (E.clicIzq && !ui.sobreUI && zona(E.x, E.y)) joy = { x0: E.x, y0: E.y, activo: false, repath: 0 };
    if (joy && !E.izq) { if (joy.activo) h.camino = null; joy = null; }
    if (joy) {
      const dx = E.x - joy.x0, dy = E.y - joy.y0, dd = Math.hypot(dx, dy), rad = L(48);
      if (!joy.activo && dd > L(14)) { joy.activo = true; h.objetivo = null; }
      if (joy.activo) {
        ui.sobreUI = true;
        joy.repath -= 1 / 60;
        if (joy.repath <= 0 && dd > L(8)) {
          joy.repath = 0.12;
          // ocho direcciones en pantalla, llevadas al mundo desde donde está el héroe
          const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
          const [hx, hy] = aPant(h.x, h.y);
          const [wx, wy] = aMundo(hx + Math.cos(a) * 140, hy + Math.sin(a) * 140);
          caminarA(j, wx, wy);
        }
        const k = Math.min(1, dd / rad), kx = joy.x0 + (dx / (dd || 1)) * rad * k, ky = joy.y0 + (dy / (dd || 1)) * rad * k;
        ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(joy.x0, joy.y0, rad, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.8; ctx.strokeStyle = '#a08050'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#5a4630'; ctx.beginPath(); ctx.arc(kx, ky, L(22), 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
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
