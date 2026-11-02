// El título "Réquiem de Ceniza": letras góticas de hierro ennegrecido, grietas por donde se ve la brasa, chispas que
// se escapan, ceniza que cae lenta y un resplandor de ascua que respira detrás. En la intro las brasas se juntan
// y forman las letras.
import { ctx } from '../nucleo/lienzo';
import { IDI, TITULO } from './comun';
import { rng } from '../nucleo/azar';

export const NOMBRE_JUEGO: [string, string] = ['Réquiem de Ceniza', 'Requiem of Ash'];
const FUENTE_LOGO = (tam: number) => `${Math.round(tam)}px "Pirata One", ${TITULO}`;

interface Placa { c: HTMLCanvasElement; grietas: HTMLCanvasElement; puntos: [number, number][]; w: number; h: number; base: number }
const placas = new Map<string, Placa>();

/** Pinta una vez las letras de hierro y sus grietas en lienzos aparte, y guarda puntos dentro de las letras. */
function placa(texto: string, tam: number): Placa {
  // si la fuente gótica todavía no cargó, no se guarda la placa con la de respaldo
  const lista = typeof document !== 'undefined' && (document as any).fonts ? (document as any).fonts.check(FUENTE_LOGO(tam)) : true;
  if (!lista) { try { (document as any).fonts.load(FUENTE_LOGO(tam), texto); } catch { /* sin fuentes */ } }
  const k = texto + '|' + Math.round(tam) + '|' + lista;
  const hecha = placas.get(k); if (hecha) return hecha;
  const med = document.createElement('canvas').getContext('2d')!; med.font = FUENTE_LOGO(tam);
  const w = Math.ceil(med.measureText(texto).width + tam * 0.6), h = Math.ceil(tam * 1.6), base = Math.round(tam * 1.15);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!; x.font = FUENTE_LOGO(tam); x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  // hierro: degradado oscuro con un filo frío arriba y sombra grabada abajo
  x.fillStyle = 'rgba(0,0,0,0.85)'; x.fillText(texto, w / 2 + tam * 0.04, base + tam * 0.05);
  const g = x.createLinearGradient(0, base - tam, 0, base);
  g.addColorStop(0, '#5a544c'); g.addColorStop(0.35, '#2c2824'); g.addColorStop(0.7, '#1a1714'); g.addColorStop(1, '#0d0b0a');
  x.fillStyle = g; x.fillText(texto, w / 2, base);
  x.lineWidth = Math.max(1, tam * 0.025); x.strokeStyle = 'rgba(0,0,0,0.9)'; x.strokeText(texto, w / 2, base);
  x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(190,180,160,0.22)'; x.fillText(texto, w / 2 - 1, base - 1.5); x.restore();
  // grano del hierro
  const r = rng(11);
  x.save(); x.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < w * h * 0.02; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(120,110,100,0.12)'; x.fillRect(r() * w, r() * h, 1 + r() * 2, 1); }
  x.restore();
  // grietas: líneas quebradas de brasa, recortadas a las letras
  const masc = document.createElement('canvas').getContext('2d')!; masc.canvas.width = w; masc.canvas.height = h; masc.font = FUENTE_LOGO(tam); masc.textAlign = 'center'; masc.fillText(texto, w / 2, base);
  const letras = masc.getImageData(0, 0, w, h).data;
  const g2 = document.createElement('canvas'); g2.width = w; g2.height = h; const z = g2.getContext('2d')!;
  z.lineCap = 'round'; z.lineJoin = 'round';
  for (let i = 0; i < texto.length * 3; i++) {
    let px = r() * w, py = base - r() * tam * 0.9; z.lineWidth = 0.8 + r() * 1.8;
    z.strokeStyle = r() < 0.3 ? '#ffd27a' : r() < 0.6 ? '#ff8a2a' : '#e0400f';
    z.beginPath(); z.moveTo(px, py);
    for (let s2 = 0; s2 < 5; s2++) { px += (r() - 0.5) * tam * 0.35; py += (r() - 0.4) * tam * 0.3; z.lineTo(px, py); }
    z.stroke();
  }
  z.globalCompositeOperation = 'destination-in'; z.font = FUENTE_LOGO(tam); z.textAlign = 'center'; z.fillText(texto, w / 2, base);
  // puntos dentro de las letras (para que las brasas formen el título)
  const puntos: [number, number][] = [];
  for (let i = 0; i < 4000 && puntos.length < 420; i++) { const px = Math.floor(r() * w), py = Math.floor(r() * h); if (letras[(py * w + px) * 4 + 3] > 128) puntos.push([px - w / 2, py - base]); }
  const p: Placa = { c, grietas: g2, puntos, w, h, base };
  placas.set(k, p);
  return p;
}

interface Chispa { x: number; y: number; vx: number; vy: number; t: number; d: number }
const chispas: Chispa[] = [];
let ultimo = 0;

/**
 * Dibuja el título centrado en (x, y = línea de base). `k` 0..1 aparición, `forja` 0..1 opcional: las brasas viajan
 * desde abajo y se juntan en las letras; las letras aparecen cuando las brasas llegan.
 */
export function logoReq(x: number, y: number, k: number, t: number, tam = 54, forja?: number) {
  const texto = NOMBRE_JUEGO[IDI];
  const p = placa(texto, tam);
  const dt = Math.min(0.05, Math.max(0, t - ultimo)); ultimo = t;
  const respira = 0.55 + 0.45 * Math.sin(t * 1.6) * Math.sin(t * 0.7 + 1);
  const llegada = forja === undefined ? 1 : Math.max(0, Math.min(1, (forja - 0.55) / 0.35));
  ctx.save();
  // resplandor de ascua detrás
  ctx.globalCompositeOperation = 'lighter';
  const R0 = p.w * 0.55;
  const rg = ctx.createRadialGradient(x, y - tam * 0.4, 0, x, y - tam * 0.4, R0);
  rg.addColorStop(0, `rgba(255,110,30,${0.22 * k * llegada * (0.6 + respira * 0.4)})`); rg.addColorStop(0.5, `rgba(160,40,10,${0.1 * k * llegada})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg; ctx.save(); ctx.translate(x, y - tam * 0.4); ctx.scale(1, 0.42); ctx.translate(-x, -(y - tam * 0.4)); ctx.fillRect(x - R0, y - tam * 0.4 - R0, R0 * 2, R0 * 2); ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  // "Legado GG" encima, pequeño
  ctx.globalAlpha = k * llegada; ctx.font = `${Math.round(tam * 0.3)}px ${TITULO}`; ctx.textAlign = 'center'; ctx.fillStyle = '#8a6a44'; ctx.fillText('LEGADO GG', x, y - tam * 1.05);
  // las letras de hierro
  ctx.globalAlpha = k * llegada;
  ctx.drawImage(p.c, x - p.w / 2, y - p.base);
  // brasa en las grietas, que respira
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = k * llegada * (0.45 + respira * 0.55);
  ctx.drawImage(p.grietas, x - p.w / 2, y - p.base);
  ctx.globalAlpha = k * llegada * respira * 0.35; ctx.drawImage(p.grietas, x - p.w / 2 - 1, y - p.base - 1, p.w + 2, p.h + 2);
  ctx.restore();
  // la forja: brasas que suben desde abajo hacia su lugar en las letras
  if (forja !== undefined && forja < 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const r = rng(5);
    for (let i = 0; i < p.puntos.length; i++) {
      const [tx, ty] = p.puntos[i];
      const sx = (r() - 0.5) * p.w * 1.6, sy = tam * (2 + r() * 3);
      const d = r() * 0.35, u = Math.max(0, Math.min(1, (forja - d) / 0.55));
      if (u <= 0) continue;
      const e = 1 - Math.pow(1 - u, 3);
      const px = x + sx + (tx - sx) * e + Math.sin(t * 3 + i) * (1 - e) * 12, py = y + sy + (ty - sy) * e;
      ctx.globalAlpha = Math.min(1, u * 2) * (1 - llegada * 0.8);
      ctx.fillStyle = u > 0.9 ? '#ffd890' : i % 3 ? '#ff8030' : '#ffb050';
      ctx.fillRect(px, py, 2, 2);
    }
    ctx.restore();
  }
  // chispas que se escapan de las grietas y ceniza que cae
  if (k * llegada > 0.3) {
    for (let i = 0; i < 2; i++) if (Math.random() < 0.5 && chispas.length < 120) {
      const [tx, ty] = p.puntos[Math.floor(Math.random() * p.puntos.length)] ?? [0, 0];
      chispas.push({ x: x + tx, y: y + ty, vx: (Math.random() - 0.5) * 12, vy: -15 - Math.random() * 25, t: 0, d: 1 + Math.random() * 1.5 });
    }
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = chispas.length - 1; i >= 0; i--) {
    const c = chispas[i]; c.t += dt; if (c.t > c.d) { chispas.splice(i, 1); continue; }
    c.vx += Math.sin(t * 5 + i) * 20 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
    const u = c.t / c.d; ctx.globalAlpha = (1 - u) * k; ctx.fillStyle = u < 0.4 ? '#ffd070' : '#ff5a20'; ctx.fillRect(c.x, c.y, 2, 2);
  }
  ctx.restore();
  const rc = rng(9);
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const ox = (rc() - 0.5) * p.w * 1.4, v = 6 + rc() * 10, fase = rc() * 100;
    const yy = ((t * v + fase * 7) % (tam * 3.2)) - tam * 1.9;
    ctx.globalAlpha = 0.35 * k * Math.sin(Math.PI * ((yy + tam * 1.9) / (tam * 3.2)));
    ctx.fillStyle = '#9a948a'; ctx.fillRect(x + ox + Math.sin(t * 0.8 + fase) * 6, y + yy, 2, 1.5);
  }
  ctx.restore();
}
