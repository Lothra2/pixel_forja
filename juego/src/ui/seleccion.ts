// Crear héroe: cada clase se presenta en grande con su pose, su luz y su ficha (rol, dificultad, atributos y ramas).
import { ctx, W, H, E, pulso } from '../nucleo/lienzo';
import { texto, T, TT, boton, marco, dentro, envolver, TITULO } from './comun';
import { cuadrosHeroe, cuadrosPiso, cuadrosRetrato, cuadrosSel, metaSel, objetoMeta, dibujar, dibujarTenido, type Cuadro } from '../motor/assets';
import { CLASES, HABILIDADES, type Habilidad } from '../datos/clases';
import { iconoHab } from './juego_ui';
import { sombraSuelta } from '../render/luces';
import { R } from '../nucleo/azar';
import { Sonido } from '../audio/sonido';

type Rol = 'cuerpo' | 'distancia' | 'invocador' | 'apoyo';
interface Ficha { rol: Rol[]; dif: 1 | 2 | 3; frase: [string, string]; luz: [number, number, number]; part: 'brasas' | 'motas' | 'chispas' | 'hojas' | 'bruma' | 'viento' | 'luciernagas' | 'burbujas'; sonido: string; mecanica: [string, string] }
export const FICHA: Record<string, Ficha> = {
  berserker: { rol: ['cuerpo'], dif: 1, frase: ['Mientras sangre, pelea.', 'While he bleeds, he fights.'], luz: [255, 90, 30], part: 'brasas', sonido: 'grito_guerra', mecanica: ['Furia: cada golpe la llena y la furia llena pega más fuerte.', 'Fury: every hit builds it, and full fury hits harder.'] },
  templario: { rol: ['cuerpo', 'apoyo'], dif: 1, frase: ['La luz no se negocia.', 'The light is not negotiable.'], luz: [255, 220, 140], part: 'motas', sonido: 'luz', mecanica: ['Auras: una luz que lo rodea a él y a sus aliados todo el tiempo.', 'Auras: a light that surrounds him and his allies at all times.'] },
  arcanista: { rol: ['distancia'], dif: 2, frase: ['Tres elementos, una sola voluntad.', 'Three elements, a single will.'], luz: [110, 160, 255], part: 'chispas', sonido: 'hielo_lanzar', mecanica: ['Cargas: cada hechizo de un elemento prepara al siguiente.', 'Charges: each spell of one element primes the next.'] },
  cazadora: { rol: ['distancia'], dif: 2, frase: ['Lo que ve, lo alcanza.', 'What she sees, she reaches.'], luz: [170, 200, 255], part: 'hojas', sonido: 'flecha', mecanica: ['Trampas y un halcón compañero que marca a la presa.', 'Traps and a hawk companion that marks the prey.'] },
  nigromante: { rol: ['invocador'], dif: 3, frase: ['Los muertos también juran lealtad.', 'The dead swear loyalty too.'], luz: [90, 230, 130], part: 'bruma', sonido: 'invocar', mecanica: ['Cadáveres: cada enemigo caído es un soldado o una bomba.', 'Corpses: every fallen foe is a soldier or a bomb.'] },
  monje: { rol: ['cuerpo'], dif: 3, frase: ['El viento no se cansa.', 'The wind never tires.'], luz: [255, 170, 70], part: 'viento', sonido: 'tajo', mecanica: ['Combos: tres golpes seguidos liberan un remate.', 'Combos: three hits in a row unleash a finisher.'] },
  druida: { rol: ['invocador', 'cuerpo'], dif: 2, frase: ['El bosque recuerda.', 'The forest remembers.'], luz: [130, 230, 90], part: 'luciernagas', sonido: 'grunido', mecanica: ['Formas: se vuelve lobo u oso y cambia todo su juego.', 'Forms: becomes wolf or bear and changes his whole game.'] },
  alquimista: { rol: ['distancia', 'apoyo'], dif: 3, frase: ['Todo veneno es cuestión de dosis.', 'Every poison is a matter of dose.'], luz: [200, 100, 255], part: 'burbujas', sonido: 'veneno', mecanica: ['Bombas y frascos: arma su cinturón de mezclas antes de pelear.', 'Bombs and flasks: she fills her belt with mixes before a fight.'] },
};
const ROL: Record<Rol, [string, string]> = { cuerpo: ['Cuerpo a cuerpo', 'Melee'], distancia: ['A distancia', 'Ranged'], invocador: ['Invocador', 'Summoner'], apoyo: ['Apoyo', 'Support'] };

/** La habilidad que define cada rama: la de más nivel (la definitiva cuando existe). */
export function firmaRama(clase: string, rama: number): Habilidad | undefined {
  let mejor: Habilidad | undefined;
  for (const h of HABILIDADES) if (h.clase === clase && h.rama === rama && (!mejor || h.nivelReq >= mejor.nivelReq)) mejor = h;
  return mejor;
}

const parts: { x: number; y: number; vx: number; vy: number; t: number; d: number; c: string; s: number; atras?: boolean; ang?: number }[] = [];
let ultima = -1, tCambio = 0, nivelVista = 0;
/** Las partículas del aura en dos pasadas: `atras` se dibuja antes del héroe y la de adelante después. */
function particulas(f: Ficha, cx: number, cy: number, dt: number, t: number, pasada: 'atras' | 'adelante') {
  if (pasada === 'atras') emitir(f, cx, cy, dt, t);
  dibujarParts(f, t, pasada === 'atras');
}
function emitir(f: Ficha, cx: number, cy: number, dt: number, t: number) {
  const c = `rgb(${f.luz[0]},${f.luz[1]},${f.luz[2]})`;
  const n = f.part === 'viento' ? 3 : 2;
  for (let i = 0; i < n; i++) if (R() < 0.6 && parts.length < 160) {
    const x = cx + (R() - 0.5) * 260, y = cy - R() * 260;
    switch (f.part) {
      case 'brasas': parts.push({ x, y: cy + 10, vx: (R() - 0.5) * 20, vy: -40 - R() * 60, t: 0, d: 2 + R() * 2, c: R() < 0.5 ? '#ff8030' : '#ffd060', s: 2 }); break;
      case 'motas': parts.push({ x, y, vx: 0, vy: -8 - R() * 10, t: 0, d: 2 + R() * 2, c: '#fff0c0', s: 2 }); break;
      case 'chispas': { const a = R() * Math.PI * 2; parts.push({ x: cx, y: cy - 60 - R() * 100, vx: 0, vy: -6, t: 0, d: 1.2 + R(), c: R() < 0.3 ? '#ffffff' : c, s: 2, ang: a }); break; }
      case 'hojas': parts.push({ x: cx + (R() - 0.5) * 400, y: cy - 300, vx: 15 + R() * 20, vy: 30 + R() * 20, t: 0, d: 6, c: R() < 0.5 ? '#6a7a30' : '#9a7030', s: 3 }); break;
      case 'bruma': parts.push({ x, y: cy - R() * 30, vx: (R() - 0.5) * 12, vy: -6, t: 0, d: 3 + R() * 2, c: '#50c080', s: 14 }); break;
      case 'viento': parts.push({ x: cx - 220, y: cy - R() * 220, vx: 260 + R() * 120, vy: -10, t: 0, d: 1.6, c: '#ffe0b0', s: 1 }); break;
      case 'luciernagas': parts.push({ x, y, vx: (R() - 0.5) * 16, vy: (R() - 0.5) * 16, t: 0, d: 3 + R() * 2, c: '#d0ff80', s: 2 }); break;
      case 'burbujas': parts.push({ x: cx + (R() - 0.5) * 160, y: cy, vx: (R() - 0.5) * 8, vy: -20 - R() * 30, t: 0, d: 3, c: R() < 0.5 ? '#c080ff' : '#80ff90', s: 3 }); break;
    }
  }
  // avanzar: las chispas orbitan alrededor del cuerpo; el resto queda delante o detrás al azar desde que nace
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.t += dt; if (p.t > p.d) { parts.splice(i, 1); continue; }
    if (p.atras === undefined) p.atras = R() < 0.5;
    if (p.ang !== undefined) { p.ang += dt * 2.6; p.y += p.vy * dt; p.atras = Math.sin(p.ang) < 0; p.vx = cx + Math.cos(p.ang) * 70; }
    else { p.x += p.vx * dt; p.y += p.vy * dt; }
    if (f.part === 'hojas') p.vx += Math.sin(t * 2 + p.y * 0.05) * 20 * dt;
    if (f.part === 'luciernagas') { p.vx += (R() - 0.5) * 40 * dt; p.vy += (R() - 0.5) * 40 * dt; }
  }
}
function dibujarParts(f: Ficha, t: number, atras: boolean) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of parts) {
    if (!!p.atras !== atras) continue;
    const x = p.ang !== undefined ? p.vx : p.x, y = p.ang !== undefined ? p.y + Math.sin(p.ang) * 22 : p.y;
    const k = Math.sin((p.t / p.d) * Math.PI) * (atras ? 0.75 : 1);
    ctx.globalAlpha = f.part === 'bruma' ? k * 0.12 : f.part === 'luciernagas' ? k * (0.5 + 0.5 * Math.sin(t * 9 + p.x)) : k * 0.85;
    ctx.fillStyle = p.c;
    if (f.part === 'viento') { ctx.fillRect(x, y, 26, 1); }
    else if (f.part === 'bruma' || f.part === 'burbujas') { ctx.beginPath(); ctx.arc(x, y, p.s * (f.part === 'bruma' ? 1 + p.t / p.d : 1), 0, Math.PI * 2); f.part === 'burbujas' ? (ctx.strokeStyle = p.c, ctx.stroke()) : ctx.fill(); }
    else ctx.fillRect(x, y, p.s, p.s);
  }
  ctx.restore();
}

function calaveras(n: number, x: number, y: number) {
  for (let i = 0; i < 3; i++) {
    const on = i < n;
    ctx.fillStyle = on ? '#e8d8b0' : '#3a3228';
    ctx.beginPath(); ctx.arc(x + i * 18, y, 6, Math.PI, 0); ctx.lineTo(x + i * 18 + 4, y + 5); ctx.lineTo(x + i * 18 - 4, y + 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = on ? '#1a1410' : '#201a14'; ctx.fillRect(x + i * 18 - 3, y - 2, 2, 2); ctx.fillRect(x + i * 18 + 1, y - 2, 2, 2);
  }
}

/** Gráfico de los cuatro atributos: barras con el valor y una marca del promedio de las clases. */
function grafico(c: (typeof CLASES)[number], x: number, y: number, w: number, k: number) {
  const ats: [keyof typeof c.base, [string, string], string][] = [['fue', ['Fuerza', 'Strength'], '#d06040'], ['des', ['Destreza', 'Dexterity'], '#60c060'], ['vit', ['Vitalidad', 'Vitality'], '#d0a040'], ['ene', ['Energía', 'Energy'], '#5080e0']];
  const max = 35;
  ats.forEach(([a, nom, col], i) => {
    const yy = y + i * 20, v = c.base[a] as number;
    const prom = CLASES.reduce((s, x) => s + (x.base[a] as number), 0) / CLASES.length;
    texto(TT(nom), x, yy + 11, { tam: 12, color: '#c0b090' });
    const bx = x + 78, bw = w - 78 - 30;
    ctx.fillStyle = '#0a0806'; ctx.fillRect(bx, yy + 2, bw, 11);
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, col + '60'); g.addColorStop(1, col);
    ctx.fillStyle = g; ctx.fillRect(bx, yy + 2, bw * (v / max) * Math.min(1, k), 11);
    ctx.fillStyle = '#ffffff60'; ctx.fillRect(bx + bw * (prom / max), yy, 1, 15);
    texto(String(v), x + w, yy + 12, { tam: 12, alin: 'right', color: '#e8d8b0' });
  });
}

export function dibujarCrear(t: number, sel: number | null): { accion: 'crear' | 'volver' | null; sel: number | null } {
  if (sel === null) sel = 0;
  if (sel !== ultima) { ultima = sel; tCambio = t; parts.length = 0; const f0 = FICHA[CLASES[sel].id]; if (f0 && t > 0.5) Sonido.efecto(f0.sonido, { vol: 0.6 }); }
  if (pulso('ArrowRight') && document.activeElement?.id !== 'nombre') sel = (sel + 1) % CLASES.length;
  if (pulso('ArrowLeft') && document.activeElement?.id !== 'nombre') sel = (sel + CLASES.length - 1) % CLASES.length;
  const c = CLASES[sel], f = FICHA[c.id];
  const lc = `${f.luz[0]},${f.luz[1]},${f.luz[2]}`;
  const dt = 1 / 60;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const angosto = W < 820;
  const cx = angosto ? W * 0.5 : W * 0.44, cy = angosto ? H * 0.5 : H * 0.7;
  // piso de piedra con la fogata detrás
  const piso = cuadrosPiso('lajas', 0)[0] ?? cuadrosPiso('tierra', 1)[0];
  for (let i = -4; i <= 4; i++) for (let k = -4; k <= 4; k++) { const px = cx + (i - k) * 80, py = cy + (i + k) * 40; if (piso && px > -100 && px < W + 100) { ctx.globalAlpha = 0.6; dibujar(ctx, piso, px, py); ctx.globalAlpha = 1; } }
  const fx = cx + 150, fy = cy - 40;
  const fog = objetoMeta('camp_fogata', 'grande');
  if (fog) dibujar(ctx, fog.f[Math.floor(t * 25 / fog.t) % fog.f.length], fx, fy, 1.4);
  // el héroe en grande, con su pose de presentación
  const k = Math.min(1, (t - tCambio) * 3);
  const vista = nivelVista;
  const ret = cuadrosRetrato(c.id, vista);
  const esc = Math.min(1.3, (H * 0.56) / 240);
  let q: Cuadro | undefined = ret.length ? ret[Math.floor((t - tCambio) * (ret.length > 8 ? 12 : 8)) % ret.length] : undefined;
  let escQ = esc;
  // la presentación de la Forja (grupo 'sel', al doble): la entrada al elegir la clase y después el reposo en bucle
  const sl = cuadrosSel(c.id, vista), ms = metaSel();
  if (sl.length && ms) {
    const n = Math.floor((t - tCambio) * ms.fps), ent = ms.entrada;
    q = sl[n < ent ? n : ent + ((n - ent) % (sl.length - ent))];
    escQ = 1; // la Forja lo hornea al tamaño final (unos 195 px): a ×1 exacto los píxeles quedan parejos
  }
  if (!q) { const fs = cuadrosHeroe(c.id, 'quieto', 'so'); q = fs[Math.floor(t * 6) % Math.max(1, fs.length)]; escQ = esc * 2.3; }
  // sombra larga desde la fogata y otra corta desde la luz de la clase
  sombraSuelta(ctx, q, cx, cy, escQ, fx, fy, 70, 0.55 * k);
  sombraSuelta(ctx, q, cx, cy, escQ, cx - 60, cy + 40, 140, 0.25 * k);
  ctx.globalAlpha = k;
  particulas(f, cx, cy, dt, t, 'atras');
  if (q) {
    // luz de retrato: contraluz fría que recorta la silueta desde atrás a la izquierda (una copia teñida corrida un par de
    // píxeles por detrás del cuerpo), el canto cálido del lado de la fogata, el héroe y un pulso cálido muy leve con el fuego
    const hx = cx - (1 - k) * 40, pul = 0.75 + 0.25 * Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1);
    ctx.globalAlpha = 0.22 * k; dibujarTenido(ctx, q, hx - 2, cy - 1, '#7f9fd8', 1, escQ);
    ctx.globalAlpha = 0.18 * k; dibujarTenido(ctx, q, hx + 2, cy, '#ff9a48', 1, escQ);
    ctx.globalAlpha = k; dibujar(ctx, q, hx, cy, escQ);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.05 * k * pul; dibujarTenido(ctx, q, hx, cy, '#ff8a3a', 0.9, escQ); ctx.restore();
  }
  ctx.globalAlpha = 1;
  // luz: oscuridad alrededor, el fuego y el color de la clase
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy - 100, 60, cx, cy - 100, Math.max(W, H) * 0.7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.35, 'rgba(0,0,0,0.45)'); g.addColorStop(0.8, 'rgba(0,0,0,0.97)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  const g2 = ctx.createRadialGradient(fx, fy - 20, 0, fx, fy - 20, 240 + Math.sin(t * 8) * 8); g2.addColorStop(0, 'rgba(255,120,40,0.3)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  const g3 = ctx.createRadialGradient(cx, cy - 120, 0, cx, cy - 120, 260); g3.addColorStop(0, `rgba(${lc},${0.08 * k})`); g3.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g3; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  particulas(f, cx, cy, dt, t, 'adelante');
  // nombre y frase sobre el héroe
  texto(TT(c.nombre).toUpperCase(), cx, angosto ? 60 : 70, { alin: 'center', tam: 34, color: `rgb(${lc})`, fuente: TITULO });
  texto('« ' + TT(f.frase) + ' »', cx, angosto ? 84 : 96, { alin: 'center', tam: 15, color: '#d8c8a0' });
  // lista de clases a la izquierda
  let accion: 'crear' | 'volver' | null = null;
  const lx = 14, ly = angosto ? H - 64 : 120, paso = angosto ? Math.min(60, (W - 28) / CLASES.length) : 46;
  CLASES.forEach((cl, i) => {
    const x = angosto ? lx + i * paso : lx, y = angosto ? ly : ly + i * paso, w = angosto ? paso - 4 : 168, h = angosto ? 56 : 42;
    const sobre = dentro(x, y, w, h), es = i === sel;
    ctx.fillStyle = es ? 'rgba(80,60,30,0.75)' : sobre ? 'rgba(50,40,28,0.7)' : 'rgba(18,14,10,0.7)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = es ? '#c8a050' : '#4a3a26'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    const fs = cuadrosHeroe(cl.id, 'quieto', 's'); const mq = fs[Math.floor(t * 6) % Math.max(1, fs.length)];
    if (mq) { ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + 1, angosto ? w - 2 : 36, h - 2); ctx.clip(); dibujar(ctx, mq, x + (angosto ? w / 2 : 19), y + h + (angosto ? 8 : 24), angosto ? 0.55 : 0.6); ctx.restore(); }
    if (!angosto) { texto(TT(cl.nombre), x + 44, y + 19, { tam: 14, color: es ? '#ffd080' : '#c0b090', fuente: TITULO }); texto(FICHA[cl.id].rol.map((r) => TT(ROL[r])).join(' · '), x + 44, y + 34, { tam: 10, color: '#8a7a60' }); }
    if (sobre && E.clicIzq) { sel = i; E.clicIzq = false; Sonido.efecto('click'); }
  });
  // ficha a la derecha
  if (!angosto) {
    const pw = Math.min(400, W * 0.36), px = W - pw - 14, py = 110, ph = 400;
    marco(px, py, pw, ph, 0.88);
    let y = py + 26;
    texto(f.rol.map((r) => TT(ROL[r])).join(' · ').toUpperCase(), px + 16, y, { tam: 12, color: `rgb(${lc})`, fuente: TITULO });
    texto(T('Dificultad', 'Difficulty'), px + pw - 80, y, { tam: 11, color: '#8a7a60', alin: 'right' }); calaveras(f.dif, px + pw - 62, y - 4);
    y += 12;
    for (const l of envolver(TT(c.descripcion), pw - 32, 13).slice(0, 4)) { y += 16; texto(l, px + 16, y, { tam: 13, color: '#d8ccb0' }); }
    y += 24; texto(T('Mecánica propia', 'Signature mechanic'), px + 16, y, { tam: 12, color: '#c8a050', fuente: TITULO });
    for (const l of envolver(TT(f.mecanica), pw - 32, 12).slice(0, 2)) { y += 15; texto(l, px + 16, y, { tam: 12, color: '#b0a080' }); }
    y += 18; grafico(c, px + 16, y, pw - 32, k); y += 96;
    texto(T('Ramas de habilidades', 'Skill trees'), px + 16, y, { tam: 12, color: '#c8a050', fuente: TITULO }); y += 8;
    let tip: Habilidad | undefined; let tipY = 0;
    for (let r = 0; r < 3; r++) {
      const hb = firmaRama(c.id, r); const yy = y + r * 42;
      if (hb) iconoHab(hb, px + 16, yy, 34);
      texto(TT(c.ramas[r] as [string, string]), px + 58, yy + 14, { tam: 14, color: '#e8d8b0', fuente: TITULO });
      if (hb) texto(`${TT(hb.nombre)} · ${T('nivel', 'level')} ${hb.nivelReq}`, px + 58, yy + 29, { tam: 11, color: '#9a8a70' });
      if (hb && dentro(px + 10, yy, pw - 20, 38)) { tip = hb; tipY = yy; }
    }
    if (tip) {
      const lines = envolver(TT(tip.desc), 240, 12);
      const tw = 260, th = 30 + lines.length * 15, tx = px - tw - 8, ty = Math.min(H - th - 10, tipY);
      marco(tx, ty, tw, th, 0.95); texto(TT(tip.nombre), tx + 10, ty + 18, { tam: 13, color: '#ffd080' });
      lines.forEach((l, n) => texto(l, tx + 10, ty + 34 + n * 15, { tam: 12 }));
    }
    // ver al héroe como novato o como leyenda
    const bw = 82, by = ly + CLASES.length * paso + 6;
    if (boton(T('Novato', 'Novice'), lx, by, bw, 26, { tam: 12, color: vista === 0 ? '#ffd080' : undefined })) { nivelVista = 0; tCambio = t; }
    if (boton(T('Leyenda', 'Legend'), lx + bw + 4, by, bw, 26, { tam: 12, color: vista === 2 ? '#ffd080' : undefined })) { nivelVista = 2; tCambio = t; }
  } else {
    marco(14, H * 0.58, W - 28, 92, 0.85);
    texto(f.rol.map((r) => TT(ROL[r])).join(' · '), 28, H * 0.58 + 22, { tam: 12, color: `rgb(${lc})` }); calaveras(f.dif, W - 70, H * 0.58 + 18);
    envolver(TT(c.descripcion), W - 56, 12).slice(0, 3).forEach((l, n) => texto(l, 28, H * 0.58 + 42 + n * 15, { tam: 12 }));
  }
  // nombre y crear
  const inp = document.getElementById('nombre') as HTMLInputElement;
  const r = (document.getElementById('juego') as HTMLCanvasElement).getBoundingClientRect();
  const kk = r.width / W;
  const iy = angosto ? 104 : H - 60;
  inp.style.display = 'block'; inp.style.left = `${r.left + (cx - 160) * kk}px`; inp.style.top = `${r.top + iy * kk}px`; inp.style.width = `${220 * kk - 16}px`; inp.placeholder = T('Nombre del héroe', 'Hero name');
  if (boton(T('Crear', 'Create'), cx + 70, iy - 2, 90, 32, { activo: inp.value.trim().length > 0 }) && inp.value.trim()) accion = 'crear';
  if (boton(T('Volver', 'Back'), 16, 16, 90, 30, { tam: 13 })) accion = 'volver';
  return { accion, sel };
}
