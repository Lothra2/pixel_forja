import { pintarClip, clipsDe, type ChibiLook, type Talla, type Clip, type CuadroPintado } from '../engine/chibi';
import { canvasPixel, dibujar, alTick } from './dibujo';

/**
 * Un muñeco animado en un canvas: busca el clip, avanza los cuadros con sus ticks (60 por segundo) y solo dibuja
 * cuando el cuadro cambia o cuando el canvas está a la vista.
 */
export interface Reproductor {
  el: HTMLCanvasElement;
  poner(look: ChibiLook, clip?: string): void;
  clip(): Clip;
  opciones: { velocidad: number; pausa: boolean; cajas: boolean; espejo: boolean; raiz: boolean; fondo: ((ctx: CanvasRenderingContext2D) => void) | null };
  cuadro(): CuadroPintado | null;
  destruir(): void;
}

export function reproductor(look: ChibiLook, talla: Talla, clipId: string, escala: number, clase = ''): Reproductor {
  let L = look, clips = clipsDe(L);
  let C: Clip = clips.find((c) => c.id === clipId) ?? clips[0];
  let cuadros: CuadroPintado[] = pintarClip(L, talla, C);
  const w = cuadros[0].img.w, hgt = cuadros[0].img.h;
  const extra = talla === 48 ? 40 : 20; // espacio para saltos
  const el = canvasPixel(w, hgt + extra, escala, clase);
  const ctx = el.getContext('2d')!;
  let i = 0, t = 0, avance = 0, visible = true, ultimoDibujo = -1;
  const opciones: Reproductor['opciones'] = { velocidad: 1, pausa: false, cajas: false, espejo: false, raiz: false, fondo: null };
  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); }) : null;
  io?.observe(el);
  const pintar = () => {
    const q = cuadros[i];
    ctx.clearRect(0, 0, el.width, el.height);
    if (opciones.fondo) opciones.fondo(ctx);
    // sombra en el piso (no sube con el salto)
    const [ax, ay] = q.ancla;
    ctx.fillStyle = 'rgba(40,20,30,0.28)';
    ctx.beginPath(); ctx.ellipse(ax, ay + extra - 0.5, 8 * (talla === 48 ? 2 : 1), 2 * (talla === 48 ? 2 : 1), 0, 0, Math.PI * 2); ctx.fill();
    let ox = 0;
    if (opciones.raiz) { ox = ((avance % (w * 0.6)) + w * 0.6) % (w * 0.6) - w * 0.3; }
    const oy = extra - Math.max(-extra, Math.min(extra, q.dy));
    dibujar(ctx, q.img, ox, oy, opciones.espejo);
    if (opciones.cajas) {
      const box = (b: number[] | undefined, col: string) => { if (!b) return; ctx.strokeStyle = col; ctx.lineWidth = 1; const x = opciones.espejo ? w - b[0] - b[2] : b[0]; ctx.strokeRect(ox + x + 0.5, oy + b[1] + 0.5, b[2] - 1, b[3] - 1); };
      box(q.hurt, 'rgba(80,200,255,0.9)');
      box(q.hit, 'rgba(255,60,60,0.95)');
    }
  };
  const quitar = alTick(() => {
    if (!el.isConnected) return;
    if (opciones.pausa) { if (ultimoDibujo !== i) { pintar(); ultimoDibujo = i; } return; }
    t += opciones.velocidad;
    const q = cuadros[i];
    if (t >= q.t) {
      t = 0;
      avance += q.dx;
      if (i + 1 < cuadros.length) i++;
      else if (C.loop) i = 0;
      else { i = 0; avance = 0; t = -30; } // los que no son bucle esperan medio segundo y vuelven a empezar
    }
    if (visible && ultimoDibujo !== i * 1000 + Math.round(avance)) { pintar(); ultimoDibujo = i * 1000 + Math.round(avance); }
  });
  pintar();
  return {
    el, opciones,
    poner(look2, clip2) {
      L = look2; clips = clipsDe(L);
      if (clip2) C = clips.find((c) => c.id === clip2) ?? clips[0];
      else if (!clips.includes(C)) C = clips.find((c) => c.id === C.id) ?? clips[0];
      cuadros = pintarClip(L, talla, C);
      i = 0; t = 0; avance = 0; ultimoDibujo = -1; pintar();
    },
    clip: () => C,
    cuadro: () => cuadros[i] ?? null,
    destruir() { quitar(); io?.disconnect(); },
  };
}
