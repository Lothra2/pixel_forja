import type { EstiloDef, Medidas } from './estilo';
import type { PoseMov } from './pose';
import { curva, mezclar, exagerar, posesClave, type Movimiento, type Cuadro, type Clave } from './movimiento';

/**
 * De un movimiento (datos) a sus cuadros, con los principios de animación aplicados por el motor. Cada principio es una
 * regla con nombre (se puede apagar para medir qué hace, en las pruebas):
 *
 * - anticipacion: el recogido antes del golpe crece con la fuerza del golpe y la exageración del estilo.
 * - recuperacion: la recuperación dura al menos 1,5 veces lo que dura el golpe activo (si no, se alarga).
 * - impacto: un solo cuadro de impacto, con el puño o el pie más grande y el miembro estirado, y el evento `impacto`.
 * - sobrepaso: después del impacto el cuerpo sigue de largo un poco (2 ticks robados al mismo impacto: la ventana
 *   activa del juego no cambia).
 * - cabeza: en los intermedios la cabeza va adelantada al cuerpo (lidera el giro).
 * - arcos y pies: los da la mezcla (movimiento.ts): manos en esféricas, pies en el aire en polares, pies en el piso que
 *   no se mueven quedan clavados.
 * - respiracion: en un bucle en reposo el pecho sube y baja.
 * - aplasta: el primer cuadro de un golpe recibido se aplasta.
 */
export const PRINCIPIOS = ['anticipacion', 'recuperacion', 'impacto', 'sobrepaso', 'cabeza', 'respiracion', 'aplasta'] as const;
export type Principio = (typeof PRINCIPIOS)[number];

export interface OpcionesMuestreo { sin?: Principio[] }

export function muestrear(mov: Movimiento, poses: Record<string, PoseMov>, e: EstiloDef, m: Medidas, op: OpcionesMuestreo = {}): Cuadro[] {
  const usa = (p: Principio) => !op.sin?.includes(p);
  const fuerza = mov.fuerza ?? 0.5;
  const P = posesClave(mov, poses);
  const claves: Clave[] = mov.claves.map((c) => ({ ...c }));
  const caderaAltaN = m.caderaAlta / m.pierna, tobN = m.tobillo / m.pierna;

  if (usa('anticipacion')) {
    const k = e.exagera.anticipa * (0.7 + 0.6 * fuerza);
    claves.forEach((c, i) => { if (c.anticipa && i > 0) P[i] = exagerar(P[i - 1], P[i], k); });
  }

  if (usa('recuperacion')) {
    const suma = (f: string) => claves.filter((c) => c.fase === f).reduce((a, c) => a + c.ticks, 0);
    const act = suma('activo'), rec = suma('recuperacion');
    if (act > 0 && rec > 0 && rec < 1.5 * act) {
      const k = Math.ceil(1.5 * act) / rec;
      for (const c of claves) if (c.fase === 'recuperacion') c.ticks = Math.max(1, Math.round(c.ticks * k));
    }
  }

  const cuadros: Cuadro[] = [];
  const n = claves.length;
  for (let i = 0; i < n; i++) {
    const c = claves[i];
    const sig = i + 1 < n ? i + 1 : mov.bucle ? 0 : -1;
    // del impacto se sale de golpe: el impacto es un solo cuadro
    const inter = sig < 0 || c.impacto ? 0 : c.intermedios ?? 0;
    const partes = inter + 1;
    const reparto = Array.from({ length: partes }, (_, k) => Math.floor(c.ticks / partes) + (k < c.ticks % partes ? 1 : 0));
    cuadros.push({ pose: P[i], extras: {}, ticks: reparto[0], fase: c.fase, eventos: [...(c.eventos ?? [])], clave: i, ...(c.impacto ? { impacto: c.impacto } : {}) });
    for (let k = 1; k <= inter; k++) {
      const u = k / partes, cv = c.curva ?? 'inout';
      const t = curva(cv, u), tc = usa('cabeza') ? curva(cv, Math.min(1, u + 0.25)) : t;
      cuadros.push({ pose: mezclar(P[i], P[sig], t, caderaAltaN, tobN, tc), extras: {}, ticks: reparto[k], fase: c.fase, eventos: [], clave: -1 });
    }
  }

  if (usa('impacto')) {
    for (const q of cuadros) {
      if (!q.impacto) continue;
      const { miembro, lado } = q.impacto;
      q.extras.escala = { [miembro]: { [lado]: e.exagera.punoImpacto } };
      q.extras.estira = { [miembro]: { [lado]: e.exagera.estira } };
      if (!q.eventos.includes('impacto')) q.eventos.push('impacto');
    }
  }

  if (usa('sobrepaso')) {
    const k = 1 + 0.12 * e.exagera.sobrepaso * (0.5 + fuerza);
    for (let i = 0; i < cuadros.length; i++) {
      const q = cuadros[i];
      if (!q.impacto || q.ticks < 3) continue;
      const antes = cuadros[i - 1]?.pose ?? q.pose;
      const roba = 2;
      q.ticks -= roba;
      cuadros.splice(i + 1, 0, { pose: exagerar(antes, q.pose, k), extras: {}, ticks: roba, fase: q.fase, eventos: [], clave: -1, agregado: 'sobrepaso' });
      i++;
    }
  }

  if (usa('respiracion') && mov.bucle && cuadros.every((q) => q.fase === 'neutral')) {
    const total = cuadros.reduce((a, q) => a + q.ticks, 0);
    let t = 0;
    for (const q of cuadros) { q.extras.respira = Math.sin((2 * Math.PI * t) / total) * e.exagera.respira * m.H; t += q.ticks; }
  }

  if (usa('aplasta')) {
    const q = cuadros.find((x) => x.fase === 'golpeado');
    if (q) q.extras.aplasta = e.exagera.aplasta;
  }
  return cuadros;
}
