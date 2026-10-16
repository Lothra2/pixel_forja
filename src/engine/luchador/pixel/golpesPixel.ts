import type { AnimPixel, CuadroAnimPixel, MunecoPixel, PosePixel } from './muneco';

/**
 * Las animaciones de Rick y Sophie: cada cuadro clave es una pose dibujada entera (fiel a su referencia) y la guardia
 * respira moviendo las piezas de su hoja. Los saltos, giros y volteretas mueven o giran el dibujo entero.
 *
 * Las poses del muñeco de pixel también se pueden escribir con ángulos de pantalla: 0 es al frente, 90 hacia abajo, -90 hacia arriba.
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

const q = (pose: PosePixel, ticks: number, fase: CuadroAnimPixel['fase'], pega?: string): CuadroAnimPixel => ({ pose, ticks, fase, pega });

// ------------------------------------------------------------------ Rick

const d = (dibujo: string, extra: Partial<PosePixel> = {}): PosePixel => ({ dibujo, ...extra });

function rickGuardia(): AnimPixel {
  // respira: el pecho baja y sube y los puños se mecen un pixel
  return {
    nombre: 'guardia', bucle: true,
    cuadros: [0, 1, 2, 1].map((y, i) => q({ mover: { torso: [0, y], antebrazoL: [0, i === 2 ? 1 : 0], antebrazoC: [0, i === 2 ? 1 : 0] } }, 8, 'neutral')),
  };
}

function rickAvanza(): AnimPixel {
  return { nombre: 'avanza', bucle: true, cuadros: [q({}, 7, 'neutral'), q(d('paso'), 7, 'neutral'), q(d('paso_largo'), 7, 'neutral'), q(d('paso'), 7, 'neutral')] };
}

function rickPuñoFuerte(): AnimPixel {
  return {
    nombre: 'puño_fuerte', bucle: false,
    cuadros: [q(d('puno_carga'), 3, 'inicio'), q(d('puno_carga', { raiz: { x: 3 } }), 2, 'inicio'), q(d('puno', { raiz: { x: 6 } }), 4, 'activo', 'puñoL'), q(d('puno', { raiz: { x: 5 } }), 6, 'recuperacion'), q({}, 8, 'recuperacion')],
    golpe: { daño: 14, parada: 12, retroceso: 10, aturde: 18 },
  };
}

function rickRecibe(): AnimPixel {
  return { nombre: 'recibe_alto', bucle: false, cuadros: [q(d('recibe'), 3, 'golpeado'), q(d('recibe', { raiz: { x: -6 } }), 12, 'golpeado'), q({ raiz: { x: -6 } }, 6, 'golpeado')] };
}

function rickOnda(): AnimPixel {
  // junta las manos en la cadera, carga gritando y empuja la onda con las dos palmas
  return {
    nombre: 'onda', bucle: false,
    cuadros: [q(d('onda_carga'), 4, 'inicio'), q(d('onda_carga', { raiz: { x: -3 } }), 6, 'inicio'), q(d('onda', { raiz: { x: 8 } }), 3, 'activo', 'puñoL'), q(d('onda', { raiz: { x: 8 } }), 14, 'recuperacion'), q({}, 8, 'recuperacion')],
    golpe: { daño: 12, parada: 10, retroceso: 8, aturde: 14 },
  };
}

function rickBloqueo(): AnimPixel {
  return { nombre: 'bloqueo', bucle: false, cuadros: [q(d('bloqueo'), 4, 'neutral'), q(d('bloqueo', { raiz: { x: -4 } }), 8, 'neutral')] };
}

function rickVictoria(): AnimPixel {
  return { nombre: 'victoria', bucle: false, cuadros: [q({}, 6, 'neutral'), q(d('victoria', { raiz: { y: -4 } }), 6, 'neutral'), q(d('victoria'), 40, 'neutral')] };
}

function rickCae(): AnimPixel {
  // sale volando de espaldas, cae, rebota y queda tendido con la cabeza atrás
  const vuela = (giro: number, x: number, y: number) => d('vuela', { raiz: { giro, x, y } });
  return {
    nombre: 'cae', bucle: false,
    cuadros: [
      q(vuela(14, -10, -50), 6, 'golpeado'), q(vuela(0, -24, -70), 6, 'golpeado'), q(vuela(-12, -36, -40), 6, 'golpeado'),
      q(d('tendido', { raiz: { x: -44 }, suelo: true }), 4, 'golpeado'), q(d('tendido', { raiz: { x: -46 }, suelo: true, sobre: 10 }), 4, 'golpeado'), q(d('tendido', { raiz: { x: -48 }, suelo: true }), 30, 'golpeado'),
    ],
  };
}

export const ANIMS_RICK_PIXEL = { guardia: rickGuardia, avanza: rickAvanza, puño_fuerte: rickPuñoFuerte, recibe_alto: rickRecibe, onda: rickOnda, bloqueo: rickBloqueo, victoria: rickVictoria, cae: rickCae };

// ------------------------------------------------------------------ Sophie

function sophieGuardia(): AnimPixel {
  // rebota en las puntas: el cuerpo baja y sube sobre las piernas
  return { nombre: 'guardia', bucle: true, cuadros: [0, 1, 2, 1].map((y) => q({ mover: { torso: [0, y * 1.5] } }, 6, 'neutral')) };
}

const bolita = (giro: number, y: number, x = 0) => d('bolita', { raiz: { giro, x, y } });

function sophieSalto(): AnimPixel {
  // se agacha, sale estirada, da la voltereta completa en bolita más alto que ella y cae
  return {
    nombre: 'salto', bucle: false,
    cuadros: [
      q(d('agacha'), 4, 'neutral'), q(d('sube', { raiz: { y: -40 } }), 5, 'neutral'),
      q(bolita(0, -150), 4, 'neutral'), q(bolita(90, -180), 4, 'neutral'), q(bolita(180, -192), 4, 'neutral'), q(bolita(270, -178), 4, 'neutral'), q(bolita(350, -140), 5, 'neutral'),
      q(d('sube', { raiz: { y: -60 } }), 6, 'neutral'), q(d('agacha'), 6, 'neutral'),
    ],
  };
}

function sophiePatadaVoladora(): AnimPixel {
  // desde el aire se tira en diagonal con la pierna de adelante como flecha
  return {
    nombre: 'patada_voladora', bucle: false,
    cuadros: [q(d('sube', { raiz: { y: -120 } }), 3, 'inicio'), q(d('patada', { raiz: { y: -110, x: 6 } }), 4, 'activo', 'pieL'), q(d('patada', { raiz: { y: -78, x: 14 } }), 4, 'activo', 'pieL'), q(d('patada', { raiz: { y: -46, x: 22 } }), 4, 'activo', 'pieL')],
    golpe: { daño: 10, parada: 10, retroceso: 9, aturde: 14 },
  };
}

function sophieMilPatadas(): AnimPixel {
  // en un pie, patea alto, medio, bajo y medio, tan rápido que se ve borroso
  const p = (n: string) => q(d(n), 2, 'activo', 'pieL');
  return { nombre: 'mil_patadas', bucle: true, cuadros: [p('patada_alta'), p('patada_media'), p('patada_baja'), p('patada_media')], golpe: { daño: 3, parada: 4, retroceso: 3, aturde: 6 } };
}

function sophieRemolino(): AnimPixel {
  // se agacha, salta y queda de cabeza con las piernas abiertas, girando como hélice: pega en cada medio giro
  const giro = [d('remolino'), d('remolino2'), d('remolino', { espejo: true }), d('remolino2', { espejo: true })];
  return {
    nombre: 'remolino', bucle: false,
    cuadros: [
      q(d('agacha'), 4, 'inicio'), q(bolita(90, -40), 3, 'inicio'),
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => q({ ...giro[i % 4], suelo: true, sobre: 6 }, 2, 'activo', i % 4 < 2 ? 'pieL' : 'pieC')),
      q(bolita(270, -60), 4, 'recuperacion'), q(bolita(350, -30), 3, 'recuperacion'), q(d('agacha'), 4, 'recuperacion'),
    ],
    golpe: { daño: 6, parada: 6, retroceso: 6, aturde: 10 },
  };
}

function sophieRecibe(): AnimPixel {
  return { nombre: 'recibe', bucle: false, cuadros: [q(d('recibe'), 3, 'golpeado'), q(d('recibe', { raiz: { x: -4 } }), 10, 'golpeado'), q({ raiz: { x: -4 } }, 6, 'golpeado')] };
}

function sophieVictoria(): AnimPixel {
  // brinca de alegría con el puño arriba
  return { nombre: 'victoria', bucle: false, cuadros: [q(d('victoria'), 6, 'neutral'), q(d('victoria', { raiz: { y: -16 } }), 6, 'neutral'), q(d('victoria', { raiz: { y: -24 } }), 8, 'neutral'), q(d('victoria', { raiz: { y: -10 } }), 6, 'neutral'), q(d('victoria'), 30, 'neutral')] };
}

export const ANIMS_SOPHIE_PIXEL = { guardia: sophieGuardia, salto: sophieSalto, patada_voladora: sophiePatadaVoladora, mil_patadas: sophieMilPatadas, remolino: sophieRemolino, recibe: sophieRecibe, victoria: sophieVictoria };
