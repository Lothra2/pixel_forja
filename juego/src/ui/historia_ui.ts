// Lo que la historia dibuja sobre el mundo: fantasmas pálidos, voces que flotan y las marcas de misión sobre la gente.
import { ctx } from '../nucleo/lienzo';
import { aPant, framesMonstruo } from '../render/escena';
import { dibujarTenido } from '../motor/assets';
import { fantasmas, ecos, marcaNpc } from '../juego/historia';
import { texto, TT, envolver } from './comun';
import type { Juego } from '../juego/mundo';

export function dibujarHistoria(j: Juego, tiempo: number) {
  // fantasmas: una figura pálida que espera, habla y repite su muerte mientras se desvanece
  for (const f of fantasmas(j)) {
    if (f.estado === 'ido') continue;
    const [px, py0] = aPant(f.x, f.y);
    const py = py0 - 4 - Math.sin(tiempo * 1.6 + f.x) * 3;
    const muere = f.estado === 'muere';
    const fs = framesMonstruo(f.sprite, muere ? 'morir' : 'quieto', f.dir);
    const q = muere ? fs[Math.min(fs.length - 1, Math.floor(f.t * 5))] : fs[Math.floor(tiempo * 5) % Math.max(1, fs.length)];
    const a = f.estado === 'espera' ? 0.22 + Math.sin(tiempo * 2.3 + f.y) * 0.08 : f.estado === 'habla' ? Math.min(0.55, 0.25 + f.t * 0.3) : 0.55 * Math.max(0, 1 - f.t / 2.2);
    ctx.save();
    ctx.globalAlpha = a; dibujarTenido(ctx, q, px, py, '#d8e6ff', 0.82);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.35; dibujarTenido(ctx, q, px, py, '#8fb0ff', 1);
    ctx.restore();
  }
  // voces que flotan
  for (const e of ecos(j)) {
    const [px, py] = aPant(e.x, e.y);
    const a = Math.min(1, e.t / 0.4, (e.dur - e.t) / 1.2);
    ctx.globalAlpha = Math.max(0, a);
    envolver(TT(e.txt), 300, 13).forEach((l, i, ls) => texto(l, px, py - 118 - e.t * 6 - (ls.length - 1 - i) * 16, { alin: 'center', tam: 13, color: e.color }));
    ctx.globalAlpha = 1;
  }
  // marcas de misión sobre la gente del pueblo
  for (const n of j.npcs) {
    const m = marcaNpc(n.npc, j.heroe.d); if (!m) continue;
    const [px, py] = aPant(n.x, n.y);
    texto(m, px, py - 86 + Math.sin(tiempo * 3) * 3, { alin: 'center', tam: 22, color: m === '?' ? '#80ff80' : '#ffd040' });
  }
}
