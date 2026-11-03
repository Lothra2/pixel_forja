// Miedo y sangre en pantalla: la viñeta roja cuando te queda poca vida y la presentación de cada jefe la primera vez.
import { ctx, W, H } from '../nucleo/lienzo';
import { texto, T, TT, TITULO, rasterACanvas } from './comun';
import { veloSangre } from '../../../src/engine/gotico/catalogo/horror';
import type { Monstruo } from '../juego/mundo';

/** Velo de sangre de la Forja (3 niveles) en lienzos, hechos una vez. */
const velos: (HTMLCanvasElement | null)[] = [null, null, null, null];
const velo = (n: 1 | 2 | 3) => (velos[n] ??= rasterACanvas(veloSangre(n, 960, 540)));
const alfaVelo = [0, 0, 0, 0];
let ultimoT = 0;
/**
 * Con poca vida la pantalla se tiñe: velo 1 bajo el 40 %, 2 bajo el 25 % y 3 bajo el 12 %, con fundido de 0.4 s entre
 * niveles; en el 3 el velo late. Encima, el latido rojo de siempre debajo del 30 %.
 */
export function vinetaSangre(frac: number, t: number) {
  const dt = Math.min(0.1, Math.max(0, t - ultimoT)); ultimoT = t;
  const nivel = frac <= 0 ? 0 : frac < 0.12 ? 3 : frac < 0.25 ? 2 : frac < 0.4 ? 1 : 0;
  for (let n = 1; n <= 3; n++) alfaVelo[n] += ((n === nivel ? 1 : 0) - alfaVelo[n]) * Math.min(1, dt / 0.4);
  for (let n = 1 as 1 | 2 | 3; n <= 3; n = (n + 1) as 1 | 2 | 3) {
    const a = alfaVelo[n]; if (a < 0.01) continue;
    const late = n === 3 ? 0.8 + 0.2 * Math.pow(Math.max(0, Math.sin(t * Math.PI * 2.6)), 4) : 1;
    ctx.save(); ctx.globalAlpha = a * late; ctx.drawImage(velo(n), 0, 0, W, H); ctx.restore();
  }
  if (frac >= 0.3 || frac <= 0) return;
  const peligro = 1 - frac / 0.3;
  const ritmo = 1.2 + peligro * 1.6;
  const lat = Math.pow(Math.max(0, Math.sin(t * Math.PI * ritmo)), 6);
  const k = (0.2 + peligro * 0.3 + lat * 0.35 * (0.5 + peligro)) * 0.6;
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

/** La caída del jefe que cierra el acto: franjas de cine, el mundo en cámara lenta y su nombre que se apaga. */
export function dibujarCaida(m: Monstruo | null, t: number, dur: number) {
  const k = Math.min(1, t / 0.4, Math.max(0, (dur - t) / 0.3));
  const banda = H * 0.12 * k;
  ctx.save();
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, banda); ctx.fillRect(0, H - banda, W, banda);
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.7);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(40,0,0,${0.75 * k})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (m) {
    const [nom] = TT(m.nombre).split(/,\s*/);
    const tam = Math.min(46, W / 18), a = Math.min(1, Math.max(0, (t - 0.5) / 0.6)) * k;
    ctx.globalAlpha = a;
    texto(nom, W / 2 + 2, H * 0.72 + 2, { alin: 'center', tam, color: '#000', fuente: TITULO });
    texto(nom, W / 2, H * 0.72, { alin: 'center', tam, color: '#c8b090', fuente: TITULO });
    ctx.globalAlpha = Math.min(1, Math.max(0, (t - 1.1) / 0.6)) * k;
    texto(T('ha caído', 'has fallen'), W / 2, H * 0.72 + tam * 0.75, { alin: 'center', tam: Math.round(tam * 0.42), color: '#a04030', fuente: TITULO });
  }
  ctx.restore();
}
