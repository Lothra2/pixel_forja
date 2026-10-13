import { type AnimDef, type Ctx, P } from './types';
import type { Pose } from '../rig/pose';

/**
 * Burlas cortas para tirarle al rival (lote C5): un gesto que se lee a 48 px, sin bucle, de 6 a 8 cuadros a 8 fps.
 * Se dibujan en las mismas filas que `laugh` y `point`. El evento `frase` va en el cuadro del gesto fuerte: ahí el
 * juego pone el globo con la frase. Los nombres son del gesto; el juego los renombra por equipo con `alias` en el
 * kit.config.json (`burla_<equipo>`), y el kit le da a cada atleta solo la de su equipo.
 */

/** de pie, relajado y sobrado */
const suelto = (c: Ctx, patch: Parameters<typeof P>[1] = {}): Pose =>
  P(c, { torso: -2, legs: { near: { x: 0.2 * c.L, y: c.L - 0.4 }, far: { x: -0.2 * c.L, y: c.L - 0.4 } }, face: { eyes: 'open', mouth: 'smirk' }, support: 'both' }, patch);

/** Pulgar arriba con guiño, amistoso: "¡bien jugado, pana!". */
export const burlaPulgar: AnimDef = {
  name: 'burla_pulgar', pack: 'brawl', fps: 8, loop: false, events: [{ type: 'frase', phase: 3 / 7 }],
  build: (c) => {
    const carga = suelto(c, { torso: 4, arms: { near: { shoulder: 40, elbow: 100 }, far: { shoulder: 10, elbow: 20 } }, face: { eyes: 'open', mouth: 'smile' } });
    const pulgar = (tilt: number, dy: number): Pose => suelto(c, {
      torso: -6, head: { tilt, dx: 0, dy },
      arms: { near: { shoulder: 50, elbow: 80, spread: 35 }, far: { shoulder: 15, elbow: 30 } },
      face: { eyes: 'wink', mouth: 'grin' }, hands: { near: 'pulgar' },
    });
    return [suelto(c, { face: { eyes: 'open', mouth: 'smile' } }), carga, pulgar(2, -1), pulgar(6, 0), pulgar(8, 0), pulgar(6, 0), carga];
  },
};

/** Bruce Lee: el pulgar que se frota la nariz, la cabeza que se sacude y la mano que llama "ven, pues". */
export const burlaBruceLee: AnimDef = {
  name: 'burla_bruce_lee', pack: 'brawl', fps: 8, loop: false, events: [{ type: 'frase', phase: 4 / 8 }],
  build: (c) => {
    const L = c.L;
    const guardia = { near: { x: 0.32 * L, y: L - 0.9 }, far: { x: -0.32 * L, y: L - 0.9, toe: 10 } };
    const nariz = (tilt: number): Pose => P(c, {
      torso: -4, head: { tilt, dx: 0, dy: 0 }, legs: guardia,
      arms: { near: { shoulder: 125, elbow: 140 }, far: { shoulder: 50, elbow: 110 } },
      face: { eyes: 'angry', mouth: 'smirk' }, hands: { near: 'pulgar' }, support: 'both',
    });
    const llama = (elbow: number): Pose => P(c, {
      torso: 2, legs: guardia,
      arms: { near: { shoulder: 85, elbow, spread: 10 }, far: { shoulder: 55, elbow: 110 } },
      face: { eyes: 'angry', mouth: 'smirk' }, hands: { near: elbow > 45 ? 'garra' : 'palma' }, support: 'both',
    });
    return [P(c, { torso: 4, legs: guardia, arms: { near: { shoulder: 60, elbow: 110 }, far: { shoulder: 50, elbow: 110 } }, face: { eyes: 'angry', mouth: 'line' }, support: 'both' }),
      nariz(-4), nariz(8), nariz(-8), llama(10), llama(80), llama(10), llama(80)];
  },
};

/** Saludo de artes marciales (el puño en la palma), una reverencia corta y la garra del dragón. */
export const burlaDragon: AnimDef = {
  name: 'burla_dragon', pack: 'brawl', fps: 8, loop: false, events: [{ type: 'frase', phase: 5 / 8 }],
  build: (c) => {
    const L = c.L;
    const juntos = { near: { x: 0.1 * L, y: L - 0.4 }, far: { x: -0.1 * L, y: L - 0.4 } };
    const saludo = (torso: number, dy: number): Pose => P(c, {
      torso, head: { tilt: torso / 3, dx: 0, dy }, legs: juntos,
      arms: { near: { shoulder: 65, elbow: 95, spread: 15 }, far: { shoulder: 70, elbow: 85, spread: 15 } },
      face: { eyes: torso > 10 ? 'closed' : 'open', mouth: 'line' }, hands: { far: 'palma' }, support: 'both',
    });
    const garra = (k: number): Pose => P(c, {
      torso: 10 + k * 4, legs: { near: { x: 0.42 * L, y: L - 1.6 - k * 0.3 }, far: { x: -0.4 * L, y: L - 1.4, toe: 15 } },
      arms: { near: { shoulder: 100 + k * 5, elbow: 25 }, far: { shoulder: 40, elbow: 120 } },
      face: { eyes: 'angry', mouth: 'open' }, hands: { near: 'garra', far: 'garra' }, support: 'both',
    });
    return [saludo(0, 0), saludo(0, 0), saludo(18, 1), saludo(24, 1), saludo(4, 0), garra(1), garra(0), garra(0)];
  },
};

/** Se tapa la boca para reírse y después señala al rival con el dedo. */
export const burlaRisaTapada: AnimDef = {
  name: 'burla_risa_tapada', pack: 'brawl', fps: 8, loop: false, events: [{ type: 'frase', phase: 5 / 8 }],
  build: (c) => {
    const tapa = (dy: number, torso: number): Pose => suelto(c, {
      torso, head: { tilt: torso / 2, dx: 0, dy },
      arms: { near: { shoulder: 125, elbow: 145 }, far: { shoulder: 30, elbow: 110 } },
      face: { eyes: 'happy', mouth: 'line' }, hands: { near: 'palma' },
    });
    const senala = (dy: number): Pose => suelto(c, {
      torso: 6, head: { tilt: 4, dx: 0, dy },
      arms: { near: { shoulder: 92, elbow: 0 }, far: { shoulder: 30, elbow: 110 } },
      face: { eyes: 'happy', mouth: 'open' }, hands: { near: 'dedo' },
    });
    return [suelto(c), tapa(0, 4), tapa(1, 12), tapa(0, 6), tapa(1, 14), senala(0), senala(1), senala(0)];
  },
};

/** Llama al rival con las dos manos ("¡dale, ven!") y se echa un paso de salsa. */
export const burlaSalsa: AnimDef = {
  name: 'burla_salsa', pack: 'brawl', fps: 8, loop: false, events: [{ type: 'frase', phase: 1 / 8 }],
  build: (c) => {
    const L = c.L;
    const llama = (elbow: number): Pose => suelto(c, {
      torso: -4,
      arms: { near: { shoulder: 80, elbow, spread: 25 }, far: { shoulder: 75, elbow, spread: 25 } },
      face: { eyes: 'happy', mouth: 'grin' }, hands: { near: elbow > 45 ? 'garra' : 'palma', far: elbow > 45 ? 'garra' : 'palma' },
    });
    // el paso básico: adelante, cambia el peso, atrás; los brazos doblados marcan el ritmo y la cadera se va con el paso
    const paso = (pie: number, brazo: number, air = 0): Pose => P(c, {
      torso: -4 + pie * 4, air, x: pie, roll: pie * 8,
      legs: {
        near: { x: (0.12 + 0.4 * Math.max(0, pie)) * L, y: L - 0.4 - (pie < 0 ? 0.6 : 0), z: pie > 0 ? 0.35 * L : 0, toe: pie < 0 ? 25 : 0 },
        far: { x: (-0.12 + 0.4 * Math.min(0, pie)) * L, y: L - 0.4 - (pie > 0 ? 0.6 : 0), z: pie < 0 ? 0.35 * L : 0, toe: pie > 0 ? 25 : 0 },
      },
      arms: { near: { shoulder: 45 + brazo * 25, elbow: 95, spread: 30 }, far: { shoulder: 45 - brazo * 25, elbow: 95, spread: 30 } },
      head: { tilt: pie * 8, dx: 0, dy: 0 }, face: { eyes: 'happy', mouth: 'grin' }, support: pie > 0 ? 'near' : pie < 0 ? 'far' : 'both',
    });
    return [llama(10), llama(85), llama(10), llama(85), paso(1, 1), paso(0, 0, 1), paso(-1, -1), paso(0, 0)];
  },
};

/** Sacude los hombros, uno y otro, y abre los brazos como diciendo "¿y qué, primo?". */
export const burlaHombros: AnimDef = {
  name: 'burla_hombros', pack: 'brawl', fps: 8, loop: false, events: [{ type: 'frase', phase: 5 / 7 }],
  build: (c) => {
    const sacude = (k: number): Pose => suelto(c, {
      torso: k * 5, x: k * 0.5, roll: k * 7, head: { tilt: -k * 6, dx: 0, dy: Math.abs(k) ? 0 : 1 },
      arms: { near: { shoulder: 25 + k * 20, elbow: 70, spread: 15 }, far: { shoulder: 25 - k * 20, elbow: 70, spread: 15 } },
      face: { eyes: 'happy', mouth: 'smirk' },
    });
    const abre = (dy: number): Pose => suelto(c, {
      torso: -8, head: { tilt: -6, dx: 0, dy },
      arms: { near: { shoulder: 115, elbow: 10, spread: 70 }, far: { shoulder: 115, elbow: 10, spread: 70 } },
      face: { eyes: 'open', mouth: 'grin' }, hands: { near: 'palma', far: 'palma' },
    });
    return [sacude(0), sacude(1), sacude(-1), sacude(1), sacude(-1), abre(0), abre(-1)];
  },
};

export const BURLAS: AnimDef[] = [burlaPulgar, burlaBruceLee, burlaDragon, burlaRisaTapada, burlaSalsa, burlaHombros];
