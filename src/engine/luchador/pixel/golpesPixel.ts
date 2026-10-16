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

// la fila de la hoja donde respira cada uno: Rick sobre el cinturón, Sophie sobre las rodillas
const PANZA_RICK = 82, RODILLA_SOPHIE = 118;
const fantasma = (pose: PosePixel, trama: 2 | 4 = 4) => ({ pose, trama });

function rickGuardia(): AnimPixel {
  // respira: el pecho baja sobre el cinturón y vuelve a subir, sin separar piezas
  return { nombre: 'guardia', bucle: true, cuadros: [0, 1, 2, 1].map((k) => q({ respira: { fila: PANZA_RICK, k } }, 8, 'neutral')) };
}

function rickAvanza(): AnimPixel {
  return { nombre: 'avanza', bucle: true, cuadros: [q({ respira: { fila: PANZA_RICK, k: 1 } }, 6, 'neutral'), q(d('paso'), 6, 'neutral'), q(d('paso_largo'), 7, 'neutral'), q(d('paso'), 6, 'neutral')] };
}

function rickRetrocede(): AnimPixel {
  // los mismos pasos al revés, un poco más lentos: se va cuidándose
  return { nombre: 'retrocede', bucle: true, cuadros: [q(d('paso'), 7, 'neutral'), q(d('paso_largo'), 7, 'neutral'), q(d('paso'), 7, 'neutral'), q({ respira: { fila: PANZA_RICK, k: 1 } }, 7, 'neutral')] };
}

/** Agachado: el bloqueo con las piernas recogidas (las filas de las rodillas se recogen sin costuras). */
const agachadoRick = (extra: Partial<PosePixel> = {}) => d('bloqueo', { respira: { fila: 160, k: 36 }, ...extra });

function rickAgachado(): AnimPixel {
  return { nombre: 'agachado', bucle: true, cuadros: [q(agachadoRick(), 10, 'neutral'), q(agachadoRick({ raiz: { y: 1 } }), 10, 'neutral')] };
}

function rickBloqueoBajo(): AnimPixel {
  return { nombre: 'bloqueo_bajo', bucle: false, cuadros: [q(agachadoRick(), 4, 'neutral'), q(agachadoRick({ raiz: { x: -3 } }), 8, 'neutral')] };
}

function rickSalto(): AnimPixel {
  // se recoge, sube con el paso largo, arriba se encoge y baja recogido (el juego lo mueve en el aire)
  return {
    nombre: 'salto', bucle: false,
    cuadros: [q(agachadoRick(), 4, 'neutral'), q(d('paso_largo'), 10, 'neutral'), q(d('paso'), 14, 'neutral'), q(d('paso_largo'), 10, 'neutral'), q(agachadoRick(), 4, 'neutral')],
  };
}

function rickPuñoFuerte(): AnimPixel {
  // carga el puño atrás, lo suelta con la estela de la carga y vuelve a la guardia deslizándose
  return {
    nombre: 'puño_fuerte', bucle: false,
    cuadros: [
      q(d('puno_carga'), 3, 'inicio'), q(d('puno_carga', { raiz: { x: 3 } }), 2, 'inicio'),
      q(d('puno', { raiz: { x: 6 }, estelas: [fantasma(d('puno_carga', { raiz: { x: 3 } }))] }), 2, 'activo', 'puñoL'), q(d('puno', { raiz: { x: 7 } }), 2, 'activo', 'puñoL'),
      q(d('puno', { raiz: { x: 5 } }), 6, 'recuperacion'), q({ raiz: { x: 2 }, respira: { fila: PANZA_RICK, k: 2 } }, 4, 'recuperacion'), q({ respira: { fila: PANZA_RICK, k: 1 } }, 4, 'recuperacion'),
    ],
    golpe: { daño: 14, parada: 12, retroceso: 10, aturde: 18 },
  };
}

function rickPuñoAereo(): AnimPixel {
  // en el aire: el puño estirado hacia abajo y adelante, hasta tocar el piso
  return {
    nombre: 'patada_aerea', bucle: false,
    cuadros: [q(d('puno_carga', { raiz: { giro: 10 } }), 4, 'inicio'), q(d('puno', { raiz: { giro: 14 }, estelas: [fantasma(d('puno_carga', { raiz: { giro: 10 } }))] }), 18, 'activo', 'puñoL'), q(d('paso'), 5, 'recuperacion'), q(d('paso'), 5, 'recuperacion')],
    golpe: { daño: 10, parada: 10, retroceso: 8, aturde: 14 },
  };
}

function rickRecibe(): AnimPixel {
  return { nombre: 'recibe_alto', bucle: false, cuadros: [q(d('recibe'), 3, 'golpeado'), q(d('recibe', { raiz: { x: -6 } }), 12, 'golpeado'), q(d('recibe', { raiz: { x: -5 } }), 8, 'golpeado'), q({ raiz: { x: -3 }, respira: { fila: PANZA_RICK, k: 2 } }, 6, 'golpeado'), q({ respira: { fila: PANZA_RICK, k: 1 } }, 6, 'golpeado')] };
}

function rickRecibeBajo(): AnimPixel {
  return { ...rickRecibe(), nombre: 'recibe_bajo' };
}

function rickOnda(): AnimPixel {
  // junta las manos en la cadera, carga gritando y empuja la onda con las dos palmas
  return {
    nombre: 'onda', bucle: false,
    cuadros: [
      q(d('onda_carga'), 4, 'inicio'), q(d('onda_carga', { raiz: { x: -3 } }), 6, 'inicio'),
      q(d('onda', { raiz: { x: 8 }, estelas: [fantasma(d('onda_carga', { raiz: { x: -3 } }))] }), 3, 'activo', 'puñoL'),
      q(d('onda', { raiz: { x: 8 } }), 14, 'recuperacion'), q({ raiz: { x: 3 }, respira: { fila: PANZA_RICK, k: 2 } }, 4, 'recuperacion'), q({}, 4, 'recuperacion'),
    ],
    golpe: { daño: 12, parada: 10, retroceso: 8, aturde: 14 },
  };
}

function rickEmbestida(): AnimPixel {
  // carga y sale disparado con el puño adelante, dejando dos estelas de sí mismo
  const corre = (x: number) => d('puno', { raiz: { x }, estelas: [fantasma(d('puno', { raiz: { x: x - 22 } }), 2), fantasma(d('puno', { raiz: { x: x - 44 } }), 4)] });
  return {
    nombre: 'embestida', bucle: false,
    cuadros: [
      q(d('puno_carga', { raiz: { x: -4 } }), 4, 'inicio'), q(d('paso_largo', { estelas: [fantasma(d('puno_carga', { raiz: { x: -4 } }))] }), 4, 'inicio'),
      q(corre(6), 6, 'activo', 'puñoL'), q(corre(8), 6, 'activo', 'puñoL'), q(corre(10), 6, 'activo', 'puñoL'),
      q(d('puno', { raiz: { x: 8 } }), 9, 'recuperacion'), q({ raiz: { x: 3 }, respira: { fila: PANZA_RICK, k: 2 } }, 9, 'recuperacion'),
    ],
    golpe: { daño: 16, parada: 14, retroceso: 18, aturde: 20 },
  };
}

function rickSuper(): AnimPixel {
  // la Súper Onda: carga más larga temblando, y suelta con las dos palmas y una estela fuerte
  return {
    nombre: 'super', bucle: false,
    cuadros: [
      q(d('onda_carga'), 7, 'inicio'), q(d('onda_carga', { raiz: { x: -1 } }), 7, 'inicio'), q(d('onda_carga', { raiz: { x: 1, y: 1 } }), 8, 'inicio'),
      q(d('onda', { raiz: { x: 10 }, estelas: [fantasma(d('onda', { raiz: { x: 0 } }), 2), fantasma(d('onda_carga'))] }), 4, 'activo', 'puñoL'),
      q(d('onda', { raiz: { x: 10 } }), 15, 'recuperacion'), q({ raiz: { x: 4 }, respira: { fila: PANZA_RICK, k: 2 } }, 15, 'recuperacion'),
    ],
    golpe: { daño: 30, parada: 16, retroceso: 20, aturde: 24 },
  };
}

function rickBloqueo(): AnimPixel {
  return { nombre: 'bloqueo', bucle: false, cuadros: [q(d('bloqueo'), 4, 'neutral'), q(d('bloqueo', { raiz: { x: -4 } }), 8, 'neutral')] };
}

function rickVictoria(): AnimPixel {
  return { nombre: 'victoria', bucle: true, cuadros: [q(d('victoria'), 24, 'neutral'), q(d('victoria', { raiz: { y: -2 } }), 12, 'neutral'), q(d('victoria', { raiz: { y: -3 } }), 12, 'neutral'), q(d('victoria', { raiz: { y: -1 } }), 12, 'neutral')] };
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

function rickLevanta(): AnimPixel {
  // de tendido se recoge agachado y se para en guardia
  return { nombre: 'levanta', bucle: false, cuadros: [q(d('tendido', { suelo: true }), 8, 'neutral'), q(agachadoRick(), 12, 'neutral'), q({ respira: { fila: PANZA_RICK, k: 2 } }, 10, 'neutral')] };
}

export const ANIMS_RICK_PIXEL = {
  guardia: rickGuardia, avanza: rickAvanza, retrocede: rickRetrocede, agachado: rickAgachado, salto: rickSalto,
  puño_fuerte: rickPuñoFuerte, patada_aerea: rickPuñoAereo, recibe_alto: rickRecibe, recibe_bajo: rickRecibeBajo,
  onda: rickOnda, embestida: rickEmbestida, super: rickSuper, bloqueo: rickBloqueo, bloqueo_bajo: rickBloqueoBajo,
  victoria: rickVictoria, cae: rickCae, levanta: rickLevanta,
};

// ------------------------------------------------------------------ Sophie

function sophieGuardia(): AnimPixel {
  // rebota en las puntas: el cuerpo baja sobre las rodillas y vuelve a subir
  return { nombre: 'guardia', bucle: true, cuadros: [0, 1, 3, 1].map((k) => q({ respira: { fila: RODILLA_SOPHIE, k } }, 6, 'neutral')) };
}

function sophieCamina(nombre: string, paso: number): AnimPixel {
  // camina rebotando en las puntas, con el cuerpo un poco adelante o atrás
  return { nombre, bucle: true, cuadros: [0, 2, 4, 2].map((k, i) => q({ respira: { fila: RODILLA_SOPHIE, k }, raiz: { x: i % 2 ? paso : 0 } }, 5, 'neutral')) };
}

const bolita = (giro: number, y: number, x = 0) => d('bolita', { raiz: { giro, x, y } });

function sophieAgachada(): AnimPixel {
  return { nombre: 'agachado', bucle: true, cuadros: [q(d('agacha'), 10, 'neutral'), q(d('agacha', { raiz: { y: 1 } }), 10, 'neutral')] };
}

function sophieSalto(): AnimPixel {
  // se agacha, sale estirada, da la voltereta completa en bolita más alto que ella y cae
  return {
    nombre: 'salto', bucle: false,
    cuadros: [
      q(d('agacha'), 4, 'neutral'), q(d('sube', { raiz: { y: -40 } }), 5, 'neutral'),
      q(bolita(0, -150), 4, 'neutral'), q(bolita(90, -180), 4, 'neutral'), q(bolita(180, -192), 4, 'neutral'), q(bolita(270, -178), 4, 'neutral'), q(bolita(0, -140), 5, 'neutral'),
      q(d('sube', { raiz: { y: -60 } }), 6, 'neutral'), q(d('agacha'), 6, 'neutral'),
    ],
  };
}

function sophiePatada(): AnimPixel {
  // levanta la rodilla con la patada media y la suelta alta, con la estela de la pierna
  return {
    nombre: 'patada', bucle: false,
    cuadros: [
      q(d('patada_baja'), 4, 'inicio'), q(d('patada_media'), 4, 'inicio'),
      q(d('patada_alta', { estelas: [fantasma(d('patada_media'))] }), 4, 'activo', 'pieL'),
      q(d('patada_alta'), 5, 'recuperacion'), q(d('patada_media'), 4, 'recuperacion'), q({ respira: { fila: RODILLA_SOPHIE, k: 2 } }, 8, 'recuperacion'),
    ],
    golpe: { daño: 9, parada: 9, retroceso: 8, aturde: 12 },
  };
}

function sophiePatadaVoladora(): AnimPixel {
  // desde el aire se tira en diagonal con la pierna de adelante como flecha
  const p = (y: number, x: number) => d('patada', { raiz: { y, x }, estelas: [fantasma(d('patada', { raiz: { y: y - 10, x: x - 8 } }))] });
  return {
    nombre: 'patada_voladora', bucle: false,
    cuadros: [q(d('sube', { raiz: { y: -120 } }), 3, 'inicio'), q(p(-110, 6), 4, 'activo', 'pieL'), q(p(-78, 14), 4, 'activo', 'pieL'), q(p(-46, 22), 4, 'activo', 'pieL')],
    golpe: { daño: 10, parada: 10, retroceso: 9, aturde: 14 },
  };
}

const PATADAS = ['patada_alta', 'patada_media', 'patada_baja', 'patada_media'];

function sophieMilPatadas(): AnimPixel {
  // en un pie, patea alto, medio, bajo y medio, tan rápido que la pierna deja estela
  const p = (i: number) => q(d(PATADAS[i % 4], { estelas: [fantasma(d(PATADAS[(i + 3) % 4]))] }), 2, 'activo', 'pieL');
  return { nombre: 'mil_patadas', bucle: true, cuadros: [0, 1, 2, 3].map(p), golpe: { daño: 3, parada: 4, retroceso: 3, aturde: 6 } };
}

function sophieRemolino(): AnimPixel {
  // se agacha, salta y queda de cabeza con las piernas abiertas, girando como hélice: pega en cada medio giro
  const giro = [d('remolino'), d('remolino2'), d('remolino', { espejo: true }), d('remolino2', { espejo: true })];
  const vuelta = (i: number) => ({ ...giro[i % 4], suelo: true, sobre: 6, estelas: [fantasma({ ...giro[(i + 3) % 4], suelo: true, sobre: 6 })] });
  return {
    nombre: 'remolino', bucle: false,
    cuadros: [
      q(d('agacha'), 4, 'inicio'), q(bolita(90, -40), 3, 'inicio'),
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => q(vuelta(i), 2, 'activo', i % 4 < 2 ? 'pieL' : 'pieC')),
      q(bolita(270, -60), 4, 'recuperacion'), q(bolita(0, -30), 3, 'recuperacion'), q(d('agacha'), 4, 'recuperacion'),
    ],
    golpe: { daño: 6, parada: 6, retroceso: 6, aturde: 10 },
  };
}

function sophieTormenta(): AnimPixel {
  // la Tormenta: se recoge, sube y suelta tres rondas de mil patadas con estela doble, y remata con la voladora
  const p = (i: number) => q(d(PATADAS[i % 4], { estelas: [fantasma(d(PATADAS[(i + 3) % 4]), 2), fantasma(d(PATADAS[(i + 2) % 4]))] }), 3, 'activo', 'pieL');
  return {
    nombre: 'super', bucle: false,
    cuadros: [
      q(d('agacha'), 5, 'inicio'), q(d('sube', { raiz: { y: -10 } }), 5, 'inicio'),
      ...Array.from({ length: 12 }, (_, i) => p(i)),
      q(d('patada', { raiz: { y: -30, x: 10 }, estelas: [fantasma(d('patada', { raiz: { y: -40, x: -10 } }), 2)] }), 8, 'activo', 'pieL'),
      q(d('agacha'), 8, 'recuperacion'), q({ respira: { fila: RODILLA_SOPHIE, k: 2 } }, 8, 'recuperacion'),
    ],
    golpe: { daño: 4, parada: 5, retroceso: 4, aturde: 8 },
  };
}

function sophieRecibe(): AnimPixel {
  return { nombre: 'recibe', bucle: false, cuadros: [q(d('recibe'), 3, 'golpeado'), q(d('recibe', { raiz: { x: -4 } }), 10, 'golpeado'), q(d('recibe', { raiz: { x: -3 } }), 8, 'golpeado'), q({ raiz: { x: -2 }, respira: { fila: RODILLA_SOPHIE, k: 2 } }, 8, 'golpeado')] };
}

function sophieBloqueo(nombre: string, pose: PosePixel): AnimPixel {
  return { nombre, bucle: false, cuadros: [q(pose, 4, 'neutral'), q({ ...pose, raiz: { ...(pose.raiz ?? {}), x: -3 } }, 8, 'neutral')] };
}

function sophieCae(): AnimPixel {
  // sale despedida hecha bolita, rueda por el piso y queda acostada de lado
  return {
    nombre: 'cae', bucle: false,
    cuadros: [
      q(d('recibe', { raiz: { x: -6 } }), 4, 'golpeado'), q(bolita(-90, -50, -20), 5, 'golpeado'), q(bolita(-180, -30, -36), 5, 'golpeado'),
      q(d('bolita', { raiz: { giro: -270, x: -48 }, suelo: true }), 4, 'golpeado'), q(d('bolita', { raiz: { giro: -270, x: -52 }, suelo: true, sobre: 6 }), 4, 'golpeado'), q(d('bolita', { raiz: { giro: -270, x: -54 }, suelo: true }), 30, 'golpeado'),
    ],
  };
}

function sophieLevanta(): AnimPixel {
  return { nombre: 'levanta', bucle: false, cuadros: [q(d('bolita', { raiz: { giro: -270 }, suelo: true }), 8, 'neutral'), q(d('agacha'), 10, 'neutral'), q({ respira: { fila: RODILLA_SOPHIE, k: 3 } }, 10, 'neutral')] };
}

function sophieVictoria(): AnimPixel {
  // brinca de alegría con el puño arriba, una y otra vez
  return { nombre: 'victoria', bucle: true, cuadros: [q(d('victoria'), 10, 'neutral'), q(d('victoria', { raiz: { y: -16 } }), 6, 'neutral'), q(d('victoria', { raiz: { y: -24 } }), 8, 'neutral'), q(d('victoria', { raiz: { y: -10 } }), 6, 'neutral')] };
}

export const ANIMS_SOPHIE_PIXEL = {
  guardia: sophieGuardia, avanza: () => sophieCamina('avanza', 2), retrocede: () => sophieCamina('retrocede', -2), agachado: sophieAgachada,
  salto: sophieSalto, patada: sophiePatada, patada_voladora: sophiePatadaVoladora, mil_patadas: sophieMilPatadas, remolino: sophieRemolino,
  super: sophieTormenta, recibe: sophieRecibe, recibe_bajo: () => ({ ...sophieRecibe(), nombre: 'recibe_bajo' }),
  bloqueo: () => sophieBloqueo('bloqueo', d('recibe')), bloqueo_bajo: () => sophieBloqueo('bloqueo_bajo', d('agacha')),
  cae: sophieCae, levanta: sophieLevanta, victoria: sophieVictoria,
};
