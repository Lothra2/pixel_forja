// Los sustos del kit de horror: ojos en la oscuridad que se apagan si te acercas, una sombra que cruza el borde de la
// pantalla, manos que salen del piso en criptas y catacumbas, y un susurro como niebla cerca de los jefes.
// Todo es raro y espaciado: el susto funciona si no se repite.
import type { Juego } from './mundo';
import { ZONAS } from '../mundo/actos';
import { pasable } from '../mundo/zona';
import { Sonido } from '../audio/sonido';
import { R, dist } from '../nucleo/azar';

export interface Ojos { x: number; y: number; v: string; t: number; vida: number; apaga: number }
export interface Manos { x: number; y: number; v: string; t: number }
export interface Susurro { x: number; y: number; v: string; t: number; vx: number; vy: number }
export interface Miedo {
  zona: string; t: number;
  ojos: Ojos[]; proxOjos: number;
  sombra: { t: number; lado: number; y: number; v: string } | null; proxSombra: number;
  manos: Manos | null; manosHechas: boolean; proxManos: number;
  susurros: Susurro[];
}
export const miedoDe = (j: Juego): Miedo | undefined => (j as any).miedo;

export function miedoPaso(j: Juego, dt: number) {
  const z = j.zona, h = j.heroe; if (!z) return;
  const def = ZONAS[z.id]; if (!def || def.tipo === 'pueblo') { (j as any).miedo = undefined; return; }
  let m = miedoDe(j);
  if (!m || m.zona !== z.id) {
    m = { zona: z.id, t: 0, ojos: [], proxOjos: 18 + R() * 25, sombra: null, proxSombra: 70 + R() * 90, manos: null, manosHechas: false, proxManos: 20 + R() * 40, susurros: [] };
    (j as any).miedo = m;
  }
  m.t += dt;
  const oscuro = def.tipo === 'mazmorra' || (def.oscuridad ?? 0) > 0.6;
  // ojos: como mucho dos pares, lejos y en la oscuridad; si te acercas a menos de 4 casillas se apagan
  if (oscuro) {
    m.proxOjos -= dt;
    if (m.proxOjos <= 0 && m.ojos.length < 2 && !h.muerto) {
      m.proxOjos = 30 + R() * 40;
      for (let i = 0; i < 12; i++) {
        const a = R() * Math.PI * 2, r = 8 + R() * 5, x = h.x + Math.cos(a) * r, y = h.y + Math.sin(a) * r;
        if (!pasable(z, x, y)) continue;
        m.ojos.push({ x, y, v: (['rojo', 'ambar', 'muchos', 'enorme'])[Math.floor(R() * (R() < 0.15 ? 4 : 2))], t: 0, vida: 25 + R() * 15, apaga: 0 });
        break;
      }
    }
  }
  for (const o of m.ojos) { o.t += dt; if (!o.apaga && dist(o.x, o.y, h.x, h.y) < 4) { o.apaga = 0.01; Sonido.susurro(); } if (o.apaga) o.apaga += dt; }
  m.ojos = m.ojos.filter((o) => o.t < o.vida && o.apaga < 0.6);
  // la sombra que cruza el borde: una vez cada mucho
  m.proxSombra -= dt;
  if (!m.sombra && m.proxSombra <= 0 && oscuro) { m.proxSombra = 150 + R() * 150; m.sombra = { t: 0, lado: R() < 0.5 ? -1 : 1, y: 0.3 + R() * 0.4, v: R() < 0.7 ? 'cruza' : 'asoma' }; Sonido.susurro(); }
  if (m.sombra) { m.sombra.t += dt; if (m.sombra.t > 2.6) m.sombra = null; }
  // manos: una vez por visita en criptas y catacumbas, cerca de ti
  if (!m.manosHechas && /cripta|catacumbas|abadia|osario|criptas/.test(def.tema + z.id)) {
    m.proxManos -= dt;
    if (m.proxManos <= 0 && !h.muerto) {
      const a = R() * Math.PI * 2, x = h.x + Math.cos(a) * 1.8, y = h.y + Math.sin(a) * 1.8;
      if (pasable(z, x, y)) { m.manos = { x, y, v: (['una', 'muchas', 'esqueleto'])[Math.floor(R() * 3)], t: 0 }; m.manosHechas = true; Sonido.susurro(); j.sacudida = Math.max(j.sacudida, 0.2); }
      else m.proxManos = 2;
    }
  }
  if (m.manos) { m.manos.t += dt; if (m.manos.t > 1.6) m.manos = null; }
  // susurro: niebla con rostros que deriva cerca de un jefe despierto
  const jf = j.jefe && !j.jefe.muerto && j.jefe.estado === 'perseguir' ? j.jefe : null;
  if (jf && m.susurros.length < 3 && R() < dt * 0.4) { const a = R() * Math.PI * 2, r = 2 + R() * 4; m.susurros.push({ x: jf.x + Math.cos(a) * r, y: jf.y + Math.sin(a) * r, v: R() < 0.6 ? 'humo' : 'rostros', t: 0, vx: (R() - 0.5) * 0.6, vy: (R() - 0.5) * 0.6 }); }
  for (const s of m.susurros) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; }
  m.susurros = m.susurros.filter((s) => s.t < 6);
}
