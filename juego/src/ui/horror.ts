// Miedo y sangre en pantalla: la viñeta roja cuando te queda poca vida y la presentación de cada jefe la primera vez.
import { ctx, W, H } from '../nucleo/lienzo';
import { texto, TT, TITULO } from './comun';
import type { Monstruo } from '../juego/mundo';

/** Viñeta roja que late como un corazón: más fuerte y más rápida cuanto menos vida queda (debajo del 30 %). */
export function vinetaSangre(frac: number, t: number) {
  if (frac >= 0.3 || frac <= 0) return;
  const peligro = 1 - frac / 0.3;
  const ritmo = 1.2 + peligro * 1.6;
  const lat = Math.pow(Math.max(0, Math.sin(t * Math.PI * ritmo)), 6);
  const k = 0.45 + peligro * 0.5 + lat * 0.35 * (0.5 + peligro);
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * (0.42 - peligro * 0.12), W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(120,0,0,0)');
  g.addColorStop(0.6, `rgba(130,0,0,${0.4 * k})`);
  g.addColorStop(1, `rgba(70,0,0,${0.95 * k})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

/** Duración de la presentación del jefe (en segundos de reloj real). */
export const DUR_PRESENTA = 3.4;
/** Presentación: franjas de cine, el nombre grande que entra con brasas y el título debajo. */
export function dibujarPresentacion(m: Monstruo, t: number) {
  const ent = Math.min(1, t / 0.5), sal = Math.min(1, Math.max(0, (DUR_PRESENTA - t) / 0.5)), k = Math.min(ent, sal);
  const banda = H * 0.12 * k;
  ctx.save();
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, banda); ctx.fillRect(0, H - banda, W, banda);
  // velo rojo oscuro
  ctx.fillStyle = `rgba(30,0,0,${0.25 * k})`; ctx.fillRect(0, banda, W, H - banda * 2);
  const [nom, tit] = TT(m.nombre).split(/,\s*/);
  const ln = Math.min(1, Math.max(0, (t - 0.35) / 0.6));
  const tam = Math.min(64, W / 14);
  ctx.globalAlpha = ln * sal;
  texto(nom, W / 2 + 3, H * 0.66 + 3, { alin: 'center', tam, color: '#000', fuente: TITULO });
  texto(nom, W / 2, H * 0.66, { alin: 'center', tam, color: '#f0d8a8', fuente: TITULO });
  if (tit) {
    const lt = Math.min(1, Math.max(0, (t - 0.9) / 0.6));
    ctx.globalAlpha = lt * sal;
    texto(tit, W / 2, H * 0.66 + tam * 0.8, { alin: 'center', tam: Math.round(tam * 0.38), color: '#c06040', fuente: TITULO });
  }
  // brasas que suben detrás del nombre
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
    const s = (i * 97.13) % 1, x = W / 2 + (((i * 53.7) % 1) - 0.5) * W * 0.5, y = H * 0.72 - ((t * (40 + s * 60) + i * 13) % (H * 0.3));
    ctx.globalAlpha = 0.6 * k * (0.4 + s * 0.6); ctx.fillStyle = s < 0.5 ? '#ff7020' : '#ffc060';
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}
