// Dibuja los sustos encima de la luz (así los ojos brillan en la oscuridad de verdad).
import { ctx, W, H } from '../nucleo/lienzo';
import { aPant } from './escena';
import { objetoMeta, dibujar } from '../motor/assets';
import { miedoDe } from '../juego/miedo';
import type { Juego } from '../juego/mundo';

const cuadro = (id: string, v: string, t: number, una = false) => {
  const m = objetoMeta(id, v); if (!m || !m.f.length) return null;
  const i = Math.floor((t * 25) / (m.t || 3));
  return una ? (i < m.f.length ? m.f[i] : null) : m.f[i % m.f.length];
};

export function dibujarMiedo(j: Juego, tiempo: number) {
  const m = miedoDe(j); if (!m) return;
  ctx.save();
  for (const o of m.ojos) {
    const q = cuadro('hor_ojos', o.v, tiempo); if (!q) continue;
    const [px, py] = aPant(o.x, o.y);
    ctx.globalAlpha = Math.min(1, o.t / 1.5) * (o.apaga ? Math.max(0, 1 - o.apaga / 0.5) : 1) * Math.min(1, (o.vida - o.t) / 2);
    dibujar(ctx, q, px, py);
  }
  for (const s of m.susurros) {
    const q = cuadro('hor_susurro', s.v, tiempo); if (!q) continue;
    const [px, py] = aPant(s.x, s.y);
    ctx.globalAlpha = 0.55 * Math.min(1, s.t / 1.5, (6 - s.t) / 1.5);
    dibujar(ctx, q, px, py, 1.4);
  }
  if (m.manos) {
    const q = cuadro('hor_manos', m.manos.v, m.manos.t, true);
    if (q) { const [px, py] = aPant(m.manos.x, m.manos.y); ctx.globalAlpha = 1; dibujar(ctx, q, px, py, 1.2); }
  }
  // la sombra cruza el borde de la pantalla, grande y medio transparente
  if (m.sombra) {
    const q = cuadro('hor_sombra', m.sombra.v, m.sombra.t);
    if (q) {
      const k = m.sombra.t / 2.6, esc = H / Math.max(1, q.h) * 0.9;
      const x = m.sombra.lado > 0 ? -q.w * esc + (W * 0.35 + q.w * esc) * k : W + q.w * esc - (W * 0.35 + q.w * esc) * k;
      const xs = m.sombra.v === 'asoma' ? (m.sombra.lado > 0 ? Math.min(q.w * esc * 0.4, x + q.w * esc) - q.w * esc * 0.4 : W - q.w * esc * 0.6) : x;
      ctx.globalAlpha = 0.8 * Math.min(1, m.sombra.t / 0.4, (2.6 - m.sombra.t) / 0.4);
      dibujar(ctx, q, xs + q.ax * esc, H * m.sombra.y + q.ay * esc * 0.5, esc);
    }
  }
  ctx.restore();
}
