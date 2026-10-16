import type { AnimPixel, CuadroAnimPixel, MunecoPixel, PosePixel } from './muneco';
import { RICK_PIXEL, RICK_CARAS } from './rick';
import { SOPHIE_PIXEL } from './sophie';

/**
 * Las poses del muñeco de pixel se escriben con ángulos de pantalla: 0 es al frente, 90 hacia abajo, -90 hacia arriba.
 * `apuntar` saca cuánto girar cada pieza sabiendo hacia dónde apunta en la hoja, así una pose dice "el brazo al frente
 * y el antebrazo un poco arriba" sin hacer cuentas.
 */
const ang = (a: [number, number], b: [number, number]) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;

function base(m: MunecoPixel, sup: string, inf: string, fin: string): [number, number] {
  const ps = m.piezas[sup].pivote, pi = m.piezas[inf].pivote, pf = m.puntos[fin].en;
  return [ang(ps, pi), ang(pi, pf)];
}

/** Gira un brazo o una pierna para que apunte a esos ángulos de pantalla. `padre` es lo que ya giró la pieza de arriba. */
export function apuntar(m: MunecoPixel, lado: 'C' | 'L', que: 'brazo' | 'pierna', sup: number, inf: number, padre = 0): Record<string, number> {
  const [s, i, f] = que === 'brazo' ? ['brazo' + lado, 'antebrazo' + lado, 'puño' + lado] : ['muslo' + lado, 'pierna' + lado, 'tobillo' + lado];
  const [as, ai] = base(m, s, i, f);
  return { [s]: sup - as - padre, [i]: inf - ai - (sup - as) };
}

const sumar = (...gs: Record<string, number>[]) => Object.assign({}, ...gs) as Record<string, number>;
const q = (pose: PosePixel, ticks: number, fase: CuadroAnimPixel['fase'], pega?: string): CuadroAnimPixel => ({ pose, ticks, fase, pega });

// ------------------------------------------------------------------ Rick

const R = RICK_PIXEL;
const brR = (l: 'C' | 'L', s: number, i: number, p = 0) => apuntar(R, l, 'brazo', s, i, p);
const piR = (l: 'C' | 'L', s: number, i: number) => apuntar(R, l, 'pierna', s, i);
/** el brazo cercano de la onda: el mismo dibujo del brazo lejano, pegado en el hombro de adelante */
const BRAZO_ONDA = { brazoC: { ...R.piezas.brazoL, ancla: [26, 19] as [number, number] }, antebrazoC: { ...R.piezas.antebrazoL, puntos: { puñoC: R.puntos.puñoL.en } } };
const brOnda = (s: number, i: number, p = 0) => {
  const g = apuntar(R, 'L', 'brazo', s, i, p);
  return { brazoC: g.brazoL, antebrazoC: g.antebrazoL };
};

export function rickGuardia(): AnimPixel {
  // respira: el pecho baja y sube un pixel y los puños se mecen
  const dy = [0, 1, 2, 1];
  return {
    nombre: 'guardia', bucle: true,
    cuadros: dy.map((d, i) => q({ mover: { torso: [0, d], antebrazoL: [0, i === 2 ? 1 : 0], antebrazoC: [0, i === 2 ? 1 : 0] }, giro: { cabeza: d > 1 ? 1 : 0 } }, 8, 'neutral')),
  };
}

export function rickAvanza(): AnimPixel {
  // paso de guardia: la pierna de adelante se adelanta, la de atrás la sigue, el cuerpo rebota
  const pasos: [number, number, number, number, number][] = [
    // muslo y pierna de adelante, muslo y pierna de atrás, rebote
    [63, 82, 115, 113, 0],
    [55, 92, 108, 110, -1],
    [52, 86, 100, 104, -2],
    [60, 80, 96, 100, -1],
    [68, 80, 104, 108, 0],
    [66, 84, 112, 112, 0],
  ];
  return {
    nombre: 'avanza', bucle: true,
    cuadros: pasos.map(([a, b, c, d, y], i) => q({ giro: sumar(piR('L', a, b), piR('C', c, d)), mover: { torso: [0, -y] }, raiz: { x: i * 1.5 }, suelo: true }, 6, 'neutral')),
  };
}

export function rickPuñoFuerte(): AnimPixel {
  const carga: PosePixel = { giro: sumar({ torso: -4, cabeza: 2 }, brR('L', 70, -80, -4)), mover: { torso: [-2, 0] } };
  const sale: PosePixel = { giro: sumar({ torso: 4, cabeza: -3 }, brR('L', 20, -20, 4)), mover: { torso: [2, 1] } };
  const pega: PosePixel = { giro: sumar({ torso: 9, cabeza: -6 }, brR('L', -4, -3, 9), brR('C', 95, -30, 9)), mover: { torso: [5, 2] } };
  const vuelve: PosePixel = { giro: sumar({ torso: 5, cabeza: -3 }, brR('L', 30, -40, 5)), mover: { torso: [2, 1] } };
  return {
    nombre: 'puño_fuerte', bucle: false,
    cuadros: [q(carga, 3, 'inicio'), q(sale, 2, 'inicio'), q(pega, 4, 'activo', 'puñoL'), q(vuelve, 6, 'recuperacion'), q({ giro: { torso: 2 }, mover: { torso: [1, 0] } }, 8, 'recuperacion')],
    golpe: { daño: 14, parada: 12, retroceso: 10, aturde: 18 },
  };
}

export function rickRecibe(): AnimPixel {
  const golpe: PosePixel = { giro: sumar({ torso: -12, cabeza: -14 }, brR('L', 80, -20, -12), brR('C', 110, -10, -12)), mover: { torso: [-3, 2] }, cambiar: { cabeza: RICK_CARAS.dolor } };
  const atras: PosePixel = { giro: sumar({ torso: -16, cabeza: -10 }, brR('L', 90, 0, -16), brR('C', 115, 10, -16)), mover: { torso: [-5, 3] }, cambiar: { cabeza: RICK_CARAS.dolor }, raiz: { x: -3 } };
  const vuelve: PosePixel = { giro: { torso: -6, cabeza: -4 }, mover: { torso: [-2, 1] }, raiz: { x: -4 } };
  return { nombre: 'recibe_alto', bucle: false, cuadros: [q(golpe, 3, 'golpeado'), q(atras, 12, 'golpeado'), q(vuelve, 6, 'golpeado')] };
}

export function rickOnda(): AnimPixel {
  // junta las manos atrás en la cadera, carga gritando y empuja la onda con los dos brazos
  const junta: PosePixel = { giro: sumar({ torso: -6, cabeza: 2 }, brR('L', 100, 150, -6), brOnda(105, 160, -6)), mover: { torso: [-3, 1] }, cambiar: BRAZO_ONDA, orden: ORDEN_ONDA };
  const carga: PosePixel = { giro: sumar({ torso: -9, cabeza: 4 }, brR('L', 110, 165, -9), brOnda(112, 170, -9)), mover: { torso: [-5, 2] }, cambiar: { ...BRAZO_ONDA, cabeza: RICK_CARAS.grito }, orden: ORDEN_ONDA };
  const empuja = (k: number): PosePixel => ({
    giro: sumar({ torso: 8 + k, cabeza: -6 }, brR('L', 6, 2, 8 + k), brOnda(14, 6, 8 + k), piR('L', 58, 86), piR('C', 120, 116)),
    mover: { torso: [5 + k, 4] }, cambiar: { ...BRAZO_ONDA, cabeza: RICK_CARAS.grito }, orden: ORDEN_ONDA, suelo: true,
  });
  return {
    nombre: 'onda', bucle: false,
    cuadros: [q(junta, 4, 'inicio'), q(carga, 6, 'inicio'), q(empuja(2), 3, 'activo', 'puñoL'), q(empuja(2), 14, 'recuperacion'), q({ giro: { torso: 3 }, mover: { torso: [2, 1] } }, 8, 'recuperacion')],
    golpe: { daño: 12, parada: 10, retroceso: 8, aturde: 14 },
  };
}
/** en la onda el brazo de adelante va debajo del otro y delante del pecho */
const ORDEN_ONDA = ['fondo', 'piernaL', 'musloL', 'piernaC', 'musloC', 'torso', 'cabeza', 'brazoC', 'antebrazoC', 'brazoL', 'antebrazoL'];

export function rickBloqueo(): AnimPixel {
  const cubre: PosePixel = { giro: sumar({ torso: -4, cabeza: 4 }, brR('L', 70, -105, -4), brR('C', 62, -82, -4)), mover: { torso: [-2, 2] } };
  return { nombre: 'bloqueo', bucle: false, cuadros: [q(cubre, 4, 'neutral'), q({ ...cubre, mover: { torso: [-3, 3] }, raiz: { x: -2 } }, 8, 'neutral')] };
}

export function rickVictoria(): AnimPixel {
  const sube = (k: number): PosePixel => ({ giro: sumar({ torso: -3, cabeza: -6 }, brR('L', -60 - 12 * k, -88 - 2 * k, -3)), mover: { torso: [0, -k] } });
  return { nombre: 'victoria', bucle: false, cuadros: [q(sube(0), 6, 'neutral'), q(sube(1), 10, 'neutral'), q(sube(2), 10, 'neutral'), q(sube(3), 30, 'neutral')] };
}

export function rickCae(): AnimPixel {
  // sale volando de espaldas con las piernas juntas, rebota y queda tendido boca arriba con la cabeza atrás
  const juntas = (k: number) => sumar(piR('L', 82 - k, 94 + k), piR('C', 94 - k, 98 + k));
  const vuela = (g: number, x: number, y: number): PosePixel => ({ giro: sumar(juntas(10), { cabeza: -12 }, brR('L', 20, -20), brR('C', 150, 170)), raiz: { giro: g, x, y }, cambiar: { cabeza: RICK_CARAS.dolor } });
  const tendido = (y: number, k: number): PosePixel => ({ giro: sumar(piR('L', 84 - k / 2, 90 + k / 2), piR('C', 92 - k / 2, 94 + k / 2), { cabeza: -10 }, brR('L', 94, 100), brR('C', 88, 92)), raiz: { giro: -90, x: 8, y }, suelo: y === 0, cambiar: { cabeza: RICK_CARAS.dolor } });
  return {
    nombre: 'cae', bucle: false,
    cuadros: [q(vuela(-28, -6, -16), 6, 'golpeado'), q(vuela(-52, -14, -26), 6, 'golpeado'), q(vuela(-74, -20, -16), 6, 'golpeado'), q(tendido(0, 14), 4, 'golpeado'), q({ ...tendido(0, 10), raiz: { giro: -80, x: 8 }, sobre: 5 }, 4, 'golpeado'), q(tendido(0, 6), 30, 'golpeado')],
  };
}

export const ANIMS_RICK_PIXEL = { guardia: rickGuardia, avanza: rickAvanza, puño_fuerte: rickPuñoFuerte, recibe_alto: rickRecibe, onda: rickOnda, bloqueo: rickBloqueo, victoria: rickVictoria, cae: rickCae };

// ------------------------------------------------------------------ Sophie

const S = SOPHIE_PIXEL;
const brS = (l: 'C' | 'L', s: number, i: number, p = 0) => apuntar(S, l, 'brazo', s, i, p);
const piS = (l: 'C' | 'L', s: number, i: number) => apuntar(S, l, 'pierna', s, i);

export function sophieGuardia(): AnimPixel {
  // rebota en las puntas como una boxeadora chiquita
  const fases = [0, 1, 2, 1];
  return {
    nombre: 'guardia', bucle: true,
    cuadros: fases.map((d) => q({ giro: sumar(piS('L', 30 + d * 6, 112 - d * 4), piS('C', 100 + d * 3, 98 - d * 2), { cabeza: d === 2 ? 2 : 0 }), mover: { torso: [0, d], antebrazoL: [0, d === 2 ? 1 : 0] }, suelo: true }, 6, 'neutral')),
  };
}

/** la bolita de la voltereta: rodillas al pecho y puños juntos */
const BOLITA = (): Record<string, number> => sumar(piS('L', -20, 100), piS('C', -10, 110), brS('L', 40, -60), brS('C', 60, -40));

export function sophieSalto(): AnimPixel {
  const agacha: PosePixel = { giro: sumar(piS('L', 10, 130), piS('C', 70, 120), { torso: 8 }), mover: { torso: [1, 4] }, suelo: true };
  const sale: PosePixel = { giro: sumar(piS('L', 80, 90), piS('C', 95, 100), brS('L', -80, -95), brS('C', -70, -90)), raiz: { y: -26 } };
  const gira = (g: number, y: number, x: number): PosePixel => ({ giro: BOLITA(), raiz: { giro: g, y, x, centro: [22, 46] } });
  const cae: PosePixel = { giro: sumar(piS('L', 20, 120), piS('C', 80, 110), { torso: 6 }), mover: { torso: [1, 3] }, suelo: true };
  return {
    nombre: 'salto', bucle: false,
    cuadros: [q(agacha, 4, 'neutral'), q(sale, 5, 'neutral'), q(gira(0, -62, 4), 4, 'neutral'), q(gira(90, -78, 8), 4, 'neutral'), q(gira(180, -84, 12), 4, 'neutral'), q(gira(270, -76, 16), 4, 'neutral'), q(gira(350, -58, 20), 5, 'neutral'), q({ ...sale, raiz: { y: -24, x: 24 } }, 6, 'neutral'), q({ ...cae, raiz: { x: 26 } }, 6, 'neutral')],
  };
}

export function sophiePatadaVoladora(): AnimPixel {
  // desde el aire se tira en diagonal con la pierna de adelante como flecha
  const arma: PosePixel = { giro: sumar(piS('L', -30, 60), piS('C', 40, 120), brS('L', 20, -40), brS('C', 50, -60), { torso: -6 }), raiz: { y: -40 } };
  const flecha = (x: number, y: number): PosePixel => ({ giro: sumar(piS('L', 35, 35), piS('C', 75, 165), brS('L', 160, 170, 18), brS('C', 120, 60, 18), { torso: 18, cabeza: -10 }), raiz: { x, y, giro: -6 } });
  return {
    nombre: 'patada_voladora', bucle: false,
    cuadros: [q(arma, 3, 'inicio'), q(flecha(4, -34), 4, 'activo', 'pieL'), q(flecha(10, -24), 4, 'activo', 'pieL'), q(flecha(16, -14), 4, 'activo', 'pieL')],
    golpe: { daño: 10, parada: 10, retroceso: 9, aturde: 14 },
  };
}

export function sophieMilPatadas(): AnimPixel {
  // parada en un pie, patea alto, medio, alto y bajo, tan rápido que se ve borroso
  const pie = piS('C', 100, 96);
  const patea = (s: number, i: number, t: number): PosePixel => ({ giro: sumar(pie, piS('L', s, i), brS('L', 50, -70, -t), brS('C', 70, -40, -t), { torso: -t }), mover: { torso: [-1, 0] }, suelo: true });
  return {
    nombre: 'mil_patadas', bucle: true,
    cuadros: [q(patea(-40, -30, 14), 2, 'activo', 'pieL'), q(patea(-5, -2, 8), 2, 'activo', 'pieL'), q(patea(-55, -45, 16), 2, 'activo', 'pieL'), q(patea(20, 15, 6), 2, 'activo', 'pieL')],
    golpe: { daño: 3, parada: 4, retroceso: 3, aturde: 6 },
  };
}

export function sophieRemolino(): AnimPixel {
  // se agacha, salta, queda de cabeza con las piernas abiertas y gira como hélice: cada media vuelta pega
  const agacha: PosePixel = { giro: sumar(piS('L', 10, 130), piS('C', 70, 120), { torso: 10 }), mover: { torso: [1, 4] }, suelo: true };
  // de cabeza: lo que antes apuntaba abajo ahora apunta arriba, así que las piernas en V se piden hacia abajo
  const abiertas = (k: number) => sumar(piS('L', 30 - k, 26 - k), piS('C', 150 + k, 154 + k), brS('L', -96, -92), brS('C', -84, -88));
  const helice = (i: number): PosePixel => {
    const a = [1, 0.4, -1, -0.4][i % 4];
    return { giro: abiertas(i % 2 ? 4 : 0), ancho: { musloL: a, piernaL: a, musloC: a, piernaC: a }, raiz: { giro: 180, x: i * 2, centro: [22, 40] }, suelo: true, sobre: 8 + (i % 2) };
  };
  const vuelta = (g: number, y: number): PosePixel => ({ giro: BOLITA(), raiz: { giro: g, y, x: 18, centro: [22, 46] } });
  return {
    nombre: 'remolino', bucle: false,
    cuadros: [
      q(agacha, 4, 'inicio'), q({ giro: BOLITA(), raiz: { giro: 90, y: -40, centro: [22, 46] } }, 3, 'inicio'),
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => q(helice(i), 2, i % 2 === 0 ? 'activo' : 'activo', i % 4 < 2 ? 'pieL' : 'pieC')),
      q(vuelta(270, -36), 4, 'recuperacion'), q(vuelta(350, -16), 3, 'recuperacion'), q({ ...agacha, raiz: { x: 20 } }, 4, 'recuperacion'),
    ],
    golpe: { daño: 6, parada: 6, retroceso: 6, aturde: 10 },
  };
}

export function sophieRecibe(): AnimPixel {
  const golpe: PosePixel = { giro: sumar({ torso: -12, cabeza: -10 }, brS('L', 100, 40, -12), brS('C', 110, 50, -12)), mover: { torso: [-2, 1] } };
  return { nombre: 'recibe', bucle: false, cuadros: [q(golpe, 3, 'golpeado'), q({ ...golpe, raiz: { x: -3 } }, 10, 'golpeado'), q({ giro: { torso: -4 }, raiz: { x: -4 } }, 6, 'golpeado')] };
}

export function sophieVictoria(): AnimPixel {
  // el brazo lejano sube por delante de la cara, así que va al final del orden
  const orden = [...S.orden.filter((n) => n !== 'brazoL' && n !== 'antebrazoL'), 'brazoL', 'antebrazoL'];
  const brinca = (y: number, k: number): PosePixel => ({ giro: sumar(brS('L', -40, -86), brS('C', 70, -30), piS('L', 60 + k, 110 - k), piS('C', 95, 100 + k), { cabeza: -6 }), raiz: { y }, orden });
  return { nombre: 'victoria', bucle: false, cuadros: [q(brinca(0, 0), 6, 'neutral'), q(brinca(-10, 20), 6, 'neutral'), q(brinca(-14, 30), 8, 'neutral'), q(brinca(-6, 10), 6, 'neutral'), q({ ...brinca(0, 0), suelo: true }, 30, 'neutral')] };
}

export const ANIMS_SOPHIE_PIXEL = { guardia: sophieGuardia, salto: sophieSalto, patada_voladora: sophiePatadaVoladora, mil_patadas: sophieMilPatadas, remolino: sophieRemolino, recibe: sophieRecibe, victoria: sophieVictoria };
