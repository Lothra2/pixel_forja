// El título de la portada arde de verdad: el fuego de Doom de la Forja (el mismo autómata de las antorchas y la
// catedral) nace del borde de arriba de cada letra de "Réquiem de Ceniza" y sube en lenguas con humo y brasas sueltas.
// La máscara sale del alfa del título fijo; el fuego corre en una grilla chica y drawImage la agranda suavizada.
import * as D from '../../../src/engine/gotico/fuego_doom';
import { ctx } from '../nucleo/lienzo';
import { E } from '../nucleo/lienzo';

const CELDAS = 150; // ancho de la grilla en celdas (el alto sale de la proporción del título)
const AIRE = 0.3; // cuánto aire de más hay arriba del título para que las llamas suban, en fracción del alto
interface Estado { im: HTMLImageElement; f: D.Fuego; ch: number; aire: number; llama: HTMLCanvasElement; gl: CanvasRenderingContext2D; il: ImageData; humo: HTMLCanvasElement; gh: CanvasRenderingContext2D; ih: ImageData }
let est: Estado | null = null, ult = -1;
const chispas: { x: number; y: number; vx: number; vy: number; t: number; d: number }[] = [];

function armar(im: HTMLImageElement): Estado | null {
  const cw = CELDAS, ch = Math.max(8, Math.round((CELDAS * im.naturalHeight) / im.naturalWidth)), aire = Math.round(ch * AIRE);
  const m = document.createElement('canvas'); m.width = cw; m.height = ch;
  const g = m.getContext('2d', { willReadFrequently: true }); if (!g) return null;
  g.drawImage(im, 0, 0, cw, ch);
  const d = g.getImageData(0, 0, cw, ch).data, a = (x: number, y: number) => (y < 0 ? 0 : d[(y * cw + x) * 4 + 3] / 255);
  const w = cw, h = ch + aire, fuente = new Float32Array(w * h), forma = new Float32Array(w * h).fill(1);
  let n = 0;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const v = a(x, y); if (v < 0.45) continue;
    const i = (y + aire) * w + x, h1 = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453, r = h1 - Math.floor(h1);
    // el borde de arriba de cada trazo arde entero; adentro de la letra, brasas sueltas que la hacen ver encendida
    if (a(x, y - 1) < 0.3 && a(x, y - 3) < 0.3 && r < 0.7) { fuente[i] = 0.55 + 0.45 * r; n++; }
  }
  if (!n) return null;
  const f = D.crearFuego({ ancho: w, alto: h, semilla: 666, paleta: 'infierno', forma: { tipo: 'mapa', fuente, forma }, altura: 0.11, viento: 0.1, rafagas: 0.3, turbulencia: 0.55, ruido: 0.75, tramo: 5, velocidadTramo: 1.6, humo: 0.45, margen: 2, brillo: 1.15, pegada: 0.5 });
  const capa = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d')!; return [c, x, x.createImageData(w, h)] as const; };
  const [llama, gl, il] = capa(), [humo, gh, ih] = capa();
  return { im, f, ch, aire, llama, gl, il, humo, gh, ih };
}

/**
 * El fuego del título. `pasada` 'atras' va antes del título (humo y llamas detrás de las letras); 'adelante' después,
 * un velo sumado más tenue que hace brillar los trazos como hierro al rojo. (x, y, w, h) es donde va el título.
 */
export function fuegoTitulo(im: HTMLImageElement | null, x: number, y: number, w: number, h: number, t: number, alfa: number, pasada: 'atras' | 'adelante') {
  if (!im || alfa <= 0) return;
  if (!est || est.im !== im) { est = armar(im); ult = -1; if (!est) return; }
  const s = est, cel = w / s.f.w, oy = y - s.aire * (h / s.ch);
  if (pasada === 'atras') {
    const dt = ult < 0 ? 1 / 30 : Math.min(0.1, Math.max(0, t - ult)); ult = t;
    D.paso(s.f, dt);
    D.pintar(s.f, s.il.data, s.f.w, s.f.h, 1, { capa: 'llama', filtro: 0.45 }); s.gl.putImageData(s.il, 0, 0);
    D.pintar(s.f, s.ih.data, s.f.w, s.f.h, 1, { capa: 'humo' }); s.gh.putImageData(s.ih, 0, 0);
    // brasas que se escapan de las puntas calientes
    if (chispas.length < (E.tactil ? 40 : 70)) for (const b of D.brasas(s.f, 2, 0.45)) if (Math.random() < 0.5) chispas.push({ x: x + b.x * cel, y: oy + b.y * cel, vx: (Math.random() - 0.5) * 18, vy: -30 - Math.random() * 40, t: 0, d: 1 + Math.random() * 1.4 });
    for (let i = chispas.length - 1; i >= 0; i--) { const c = chispas[i]; c.t += dt; if (c.t > c.d) { chispas.splice(i, 1); continue; } c.vx += Math.sin(t * 3 + c.y * 0.05) * 30 * dt; c.x += c.vx * dt; c.y += c.vy * dt; }
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = alfa * 0.8; ctx.drawImage(s.humo, x, oy, w, s.f.h * cel);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alfa * 0.9; ctx.drawImage(s.llama, x, oy, w, s.f.h * cel);
    for (const c of chispas) { const k = Math.sin((c.t / c.d) * Math.PI); ctx.globalAlpha = alfa * k; ctx.fillStyle = c.t / c.d < 0.4 ? '#ffd27a' : '#ff6a24'; ctx.fillRect(c.x, c.y, 2, 2); }
    ctx.restore();
  } else {
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alfa * 0.18;
    ctx.drawImage(s.llama, x, oy, w, s.f.h * cel); ctx.restore();
  }
}
