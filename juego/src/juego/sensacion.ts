// Cómo se siente cada cuerpo al moverse y al pegar: el peso de cada clase y de cada monstruo. No cambia daño, alcance ni
// el momento del golpe: solo el ritmo del cuerpo (arranque, giro, cómo corre la animación) y la respuesta de la pantalla.
import type { Ent, Monstruo } from './mundo';

export type Curva = 'pesado' | 'seco' | 'rapido' | 'fluido' | 'canal';
export interface Sensacion {
  /** 0.7 liviano … 1.8 enorme. Escala el retroceso que provoca y el que aguanta. */
  peso: number;
  /** Segundos hasta la velocidad plena y segundos por sector de giro (45°). */
  arranque: number; giro: number;
  /** Píxeles que el cuerpo se va encima al pegar cuerpo a cuerpo, y los que recula al soltar un disparo o un hechizo. */
  embestida: number; retroceso: number;
  /** Pausa de impacto (s) cuando el golpe conecta y empujón de la cámara (px) en la dirección del golpe. */
  pausa: number; patada: number;
  /** Casillas que sale despedido el que muere de su golpe. */
  empuje: number;
  /** Volumen de sus pasos. */
  paso: number;
  /** Cómo reparte los cuadros del ataque: cuánto carga antes del golpe y cuánto sostiene después. */
  curva: Curva;
}

/**
 * Las ocho clases. El berserker carga largo y descarga de golpe; el templario pega firme y medido; el monje y la cazadora
 * son secos y veloces; el druida fluye; la arcanista y el nigromante alzan el hechizo, lo sostienen y lo sueltan.
 */
export const SENSACION: Record<string, Sensacion> = {
  berserker:  { peso: 1.35, arranque: 0.20, giro: 0.055, embestida: 7,   retroceso: 0,   pausa: 0.065, patada: 5,   empuje: 0.5,  paso: 1.35, curva: 'pesado' },
  templario:  { peso: 1.25, arranque: 0.19, giro: 0.055, embestida: 5.5, retroceso: 0,   pausa: 0.055, patada: 4,   empuje: 0.4,  paso: 1.3,  curva: 'seco' },
  monje:      { peso: 0.8,  arranque: 0.11, giro: 0.03,  embestida: 4,   retroceso: 0,   pausa: 0.028, patada: 2,   empuje: 0.25, paso: 0.7,  curva: 'rapido' },
  cazadora:   { peso: 0.8,  arranque: 0.11, giro: 0.032, embestida: 3,   retroceso: 3,   pausa: 0.03,  patada: 2,   empuje: 0.2,  paso: 0.65, curva: 'rapido' },
  druida:     { peso: 1.0,  arranque: 0.15, giro: 0.045, embestida: 5,   retroceso: 2,   pausa: 0.045, patada: 3,   empuje: 0.3,  paso: 1.0,  curva: 'fluido' },
  nigromante: { peso: 0.95, arranque: 0.17, giro: 0.05,  embestida: 3,   retroceso: 2.5, pausa: 0.035, patada: 2,   empuje: 0.15, paso: 0.8,  curva: 'canal' },
  arcanista:  { peso: 0.85, arranque: 0.14, giro: 0.04,  embestida: 3,   retroceso: 3,   pausa: 0.03,  patada: 2,   empuje: 0.15, paso: 0.7,  curva: 'canal' },
  alquimista: { peso: 0.95, arranque: 0.14, giro: 0.042, embestida: 4,   retroceso: 2.5, pausa: 0.035, patada: 2.5, empuje: 0.2,  paso: 0.85, curva: 'fluido' },
};
const NEUTRA: Sensacion = { peso: 1, arranque: 0.16, giro: 0.045, embestida: 5, retroceso: 2, pausa: 0, patada: 0, empuje: 0.2, paso: 1, curva: 'seco' };

/** El perfil de un cuerpo. Los monstruos lo sacan de su tamaño y su carácter: los brutos y los grandes pesan, los chicos son nerviosos. */
export function sensacionDe(e: Ent): Sensacion {
  const o = e as any; if (o.sens) return o.sens;
  if (e.tipo === 'heroe') return SENSACION[o.d?.clase] ?? NEUTRA; // sin caché: la clase es la del héroe en juego
  const m = e as Monstruo, def = m.def;
  if (!def) return NEUTRA;
  const jefe = !!(def.jefe || def.ia === 'jefe');
  const peso = Math.max(0.7, Math.min(1.8, 0.75 + ((e.escala ?? 1) - 1) * 0.9 + (def.ia === 'bruto' ? 0.35 : 0) + (jefe ? 0.4 : 0) + ((def.huella ?? 1) - 1) * 0.4 - (def.vel > 3.6 ? 0.12 : 0)));
  const lanza = def.ia === 'mago' || def.ia === 'invocador';
  const sens: Sensacion = {
    peso, arranque: 0.1 + 0.07 * peso, giro: 0.025 + 0.022 * peso, embestida: 3 + 3 * peso, retroceso: 2,
    pausa: 0, patada: 0, empuje: 0.2, paso: peso,
    curva: lanza ? 'canal' : peso >= 1.2 ? 'pesado' : peso <= 0.85 ? 'rapido' : 'seco',
  };
  return (o.sens = sens);
}

/**
 * Qué cuadro del ataque toca. `u` es el avance de la acción (0 a 1) y `g` el momento del golpe. El cuadro de impacto cae
 * siempre justo en `g` (igual que antes), pero la carga y la salida ya no van a ritmo parejo: lo pesado se recoge despacio
 * y descarga de un latigazo, lo rápido va seco, lo canalizado alza, sostiene y suelta.
 */
export function cuadroAtaque(u: number, g: number, n: number, curva: Curva, impacto?: number): number {
  // el cuadro de impacto lo dice la animación de la clase; sin dato, la mitad (los monstruos: 4 de 8)
  const I = Math.max(1, Math.min(n - 1, impacto ?? Math.round(n * 0.5)));
  if (u < g) {
    const x = Math.max(0, u / Math.max(0.01, g));
    const k = curva === 'pesado' ? x ** 1.9 : curva === 'seco' ? x ** 1.4 : curva === 'rapido' ? x : curva === 'fluido' ? x * x * (3 - 2 * x) : 1 - (1 - x) ** 2.2;
    // lo canalizado llega pronto a la pose alzada y la sostiene: el último cuadro de carga se guarda para justo antes de soltar
    return Math.min(I - 1, Math.floor((curva === 'canal' ? Math.min(k, x < 0.9 ? 0.74 : 1) : k) * I));
  }
  const y = Math.min(1, (u - g) / Math.max(0.01, 1 - g));
  const k = curva === 'pesado' ? 1 - (1 - y) ** 3 : curva === 'seco' ? 1 - (1 - y) ** 2 : curva === 'rapido' ? y ** 0.85 : curva === 'fluido' ? y * y * (3 - 2 * y) : 1 - (1 - y) ** 2;
  return I + Math.min(n - 1 - I, Math.floor(k * (n - I)));
}
