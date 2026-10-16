import type { AnimPixel, CuadroAnimPixel, PosePixel } from './muneco';

/**
 * Las animaciones de Alana, Steph y Thor, con las mismas ideas que las de Rick y Sophie:
 * - **la guardia respira sin costuras**: recoge filas sobre la cintura o las rodillas, nunca separa piezas;
 * - **cada golpe tiene anticipación** (una pose de carga) y **estela** (la pose anterior con trama detrás);
 * - **las vueltas solo giran de a 90 grados**, así la cara no se deforma.
 *
 * Los botones del juego: Alana pega con la varita (`golpe`), patea (`patada`), lanza la Estrella Mágica (`estrella`),
 * hace el Giro de Princesa (`giro`) y su súper es la Corona Estelar. Steph batea (`batazo`), patea, hace la Voltereta
 * Loca (`voltereta`), la Barrida (`barrida`) y su súper es el Tornado de Bate. Thor da el zarpazo, muerde
 * (`mordida`), suelta el Súper Ladrido (`ladrido`), el Rayo Veloz (`embestida`) y su súper es el Aullido Trueno.
 */
const q = (pose: PosePixel, ticks: number, fase: CuadroAnimPixel['fase'], pega?: string): CuadroAnimPixel => ({ pose, ticks, fase, pega });
const d = (dibujo: string, extra: Partial<PosePixel> = {}): PosePixel => ({ dibujo, ...extra });
const fantasma = (pose: PosePixel, trama: 2 | 4 = 4) => ({ pose, trama });

/** La guardia de cada uno y dónde respira (la fila de la hoja). */
const RESPIRA = { alana: 54, steph: 131, thor: 88 };
const g = (quien: keyof typeof RESPIRA, k: number, extra: Partial<PosePixel> = {}) => d('guardia', { respira: { fila: RESPIRA[quien], k }, ...extra });

function comunes(quien: keyof typeof RESPIRA, p: { paso: string; agacha: string; bloqueo: string; recibe: string; tendida: string; victoria: string; salto: string }) {
  const guardia: AnimPixel = { nombre: 'guardia', bucle: true, cuadros: [0, 1, 2, 1].map((k) => q(g(quien, k), 7, 'neutral')) };
  const avanza: AnimPixel = { nombre: 'avanza', bucle: true, cuadros: [q(g(quien, 1), 6, 'neutral'), q(d(p.paso), 7, 'neutral'), q(g(quien, 2, { raiz: { x: 2 } }), 6, 'neutral'), q(d(p.paso, { raiz: { x: 2 } }), 7, 'neutral')] };
  const retrocede: AnimPixel = { nombre: 'retrocede', bucle: true, cuadros: [q(d(p.paso, { raiz: { x: -2 } }), 7, 'neutral'), q(g(quien, 2), 7, 'neutral'), q(d(p.paso), 7, 'neutral'), q(g(quien, 1), 7, 'neutral')] };
  const agachado: AnimPixel = { nombre: 'agachado', bucle: true, cuadros: [q(d(p.agacha), 10, 'neutral'), q(d(p.agacha, { raiz: { y: 1 } }), 10, 'neutral')] };
  const salto: AnimPixel = { nombre: 'salto', bucle: false, cuadros: [q(d(p.agacha), 4, 'neutral'), q(d(p.salto), 30, 'neutral'), q(d(p.agacha), 8, 'neutral')] };
  const bloqueo: AnimPixel = { nombre: 'bloqueo', bucle: false, cuadros: [q(d(p.bloqueo), 4, 'neutral'), q(d(p.bloqueo, { raiz: { x: -3 } }), 8, 'neutral')] };
  const bloqueoBajo: AnimPixel = { nombre: 'bloqueo_bajo', bucle: false, cuadros: [q(d(p.agacha), 4, 'neutral'), q(d(p.agacha, { raiz: { x: -3 } }), 8, 'neutral')] };
  const recibe = (nombre: string): AnimPixel => ({ nombre, bucle: false, cuadros: [q(d(p.recibe), 3, 'golpeado'), q(d(p.recibe, { raiz: { x: -5 } }), 12, 'golpeado'), q(d(p.recibe, { raiz: { x: -4 } }), 8, 'golpeado'), q(g(quien, 2, { raiz: { x: -2 } }), 8, 'golpeado')] });
  const cae: AnimPixel = {
    nombre: 'cae', bucle: false,
    cuadros: [q(d(p.recibe, { raiz: { x: -6 } }), 4, 'golpeado'), q(d(p.recibe, { raiz: { x: -14, y: -16 } }), 5, 'golpeado'), q(d(p.tendida, { raiz: { x: -26 }, suelo: true }), 4, 'golpeado'), q(d(p.tendida, { raiz: { x: -28 }, suelo: true, sobre: 6 }), 4, 'golpeado'), q(d(p.tendida, { raiz: { x: -30 }, suelo: true }), 30, 'golpeado')],
  };
  const levanta: AnimPixel = { nombre: 'levanta', bucle: false, cuadros: [q(d(p.tendida, { suelo: true }), 8, 'neutral'), q(d(p.agacha), 10, 'neutral'), q(g(quien, 2), 10, 'neutral')] };
  const victoria: AnimPixel = { nombre: 'victoria', bucle: true, cuadros: [q(d(p.victoria), 20, 'neutral'), q(d(p.victoria, { raiz: { y: -3 } }), 10, 'neutral'), q(d(p.victoria, { raiz: { y: -5 } }), 10, 'neutral'), q(d(p.victoria, { raiz: { y: -2 } }), 10, 'neutral')] };
  return { guardia, avanza, retrocede, agachado, salto, bloqueo, bloqueo_bajo: bloqueoBajo, recibe_alto: recibe('recibe_alto'), recibe_bajo: recibe('recibe_bajo'), cae, levanta, victoria };
}

// ------------------------------------------------------------------ Alana

function alanaGolpe(): AnimPixel {
  return { nombre: 'golpe', bucle: false, golpe: { daño: 8, parada: 8, retroceso: 7, aturde: 12 },
    cuadros: [q(d('paso', { raiz: { x: -2 } }), 4, 'inicio'), q(d('golpe', { raiz: { x: 4 }, estelas: [fantasma(d('paso'))] }), 4, 'activo', 'puñoL'), q(d('golpe', { raiz: { x: 3 } }), 6, 'recuperacion'), q(g('alana', 2), 6, 'recuperacion')] };
}

function alanaPatada(): AnimPixel {
  return { nombre: 'patada', bucle: false, golpe: { daño: 9, parada: 9, retroceso: 8, aturde: 12 },
    cuadros: [q(d('agacha'), 4, 'inicio'), q(d('patada', { estelas: [fantasma(d('agacha'))] }), 4, 'activo', 'pieL'), q(d('patada'), 7, 'recuperacion'), q(g('alana', 2), 7, 'recuperacion')] };
}

function alanaAerea(): AnimPixel {
  return { nombre: 'patada_aerea', bucle: false, golpe: { daño: 8, parada: 8, retroceso: 7, aturde: 12 },
    cuadros: [q(d('salto'), 4, 'inicio'), q(d('patada', { estelas: [fantasma(d('salto'))] }), 18, 'activo', 'pieL'), q(d('salto'), 5, 'recuperacion'), q(d('salto'), 5, 'recuperacion')] };
}

function alanaEstrella(): AnimPixel {
  // levanta la varita, junta la magia y la suelta hacia adelante: la estrella sale en el primer cuadro activo
  return { nombre: 'estrella', bucle: false, golpe: { daño: 11, parada: 10, retroceso: 8, aturde: 14 },
    cuadros: [q(d('hechizo_carga'), 5, 'inicio'), q(d('hechizo_carga', { raiz: { y: -1 } }), 5, 'inicio'), q(d('hechizo', { raiz: { x: 4 }, estelas: [fantasma(d('hechizo_carga'))] }), 3, 'activo', 'puñoL'), q(d('hechizo', { raiz: { x: 4 } }), 14, 'recuperacion'), q(g('alana', 2), 6, 'recuperacion')] };
}

function alanaGiro(): AnimPixel {
  // gira como princesa con la falda abierta: pega a los dos lados
  const vuelta = (i: number) => (i % 2 ? d('giro', { espejo: true, estelas: [fantasma(d('giro'))] }) : d('giro', { estelas: [fantasma(d('giro', { espejo: true }))] }));
  return { nombre: 'giro', bucle: false, golpe: { daño: 5, parada: 6, retroceso: 6, aturde: 9 },
    cuadros: [q(d('agacha'), 4, 'inicio'), ...[0, 1, 2, 3, 4, 5].map((i) => q(vuelta(i), 3, 'activo', 'puñoL')), q(d('victoria'), 6, 'recuperacion'), q(g('alana', 2), 6, 'recuperacion')] };
}

function alanaSuper(): AnimPixel {
  // la Corona Estelar: carga larga, flota con los brazos arriba y suelta la gran estrella
  return { nombre: 'super', bucle: false, golpe: { daño: 28, parada: 16, retroceso: 18, aturde: 24 },
    cuadros: [q(d('hechizo_carga'), 7, 'inicio'), q(d('super'), 7, 'inicio'), q(d('super', { raiz: { y: -4 } }), 8, 'inicio'), q(d('hechizo', { raiz: { x: 6 }, estelas: [fantasma(d('super'), 2)] }), 4, 'activo', 'puñoL'), q(d('hechizo', { raiz: { x: 6 } }), 15, 'recuperacion'), q(g('alana', 2), 12, 'recuperacion')] };
}

export const ANIMS_ALANA_PIXEL: Record<string, () => AnimPixel> = {
  ...Object.fromEntries(Object.entries(comunes('alana', { paso: 'paso', agacha: 'agacha', bloqueo: 'bloqueo', recibe: 'recibe', tendida: 'tendida', victoria: 'victoria', salto: 'salto' })).map(([k, v]) => [k, () => v])),
  golpe: alanaGolpe, patada: alanaPatada, patada_aerea: alanaAerea, estrella: alanaEstrella, giro: alanaGiro, super: alanaSuper,
};

// ------------------------------------------------------------------ Steph

function stephBatazo(): AnimPixel {
  return { nombre: 'batazo', bucle: false, golpe: { daño: 14, parada: 12, retroceso: 11, aturde: 18 },
    cuadros: [q(d('batazo_carga'), 4, 'inicio'), q(d('batazo_carga', { raiz: { x: 2 } }), 3, 'inicio'), q(d('batazo', { raiz: { x: 4 }, estelas: [fantasma(d('batazo_carga', { raiz: { x: 2 } }))] }), 4, 'activo', 'puñoL'), q(d('batazo', { raiz: { x: 3 } }), 8, 'recuperacion'), q(g('steph', 2), 8, 'recuperacion')] };
}

function stephPatada(): AnimPixel {
  return { nombre: 'patada', bucle: false, golpe: { daño: 10, parada: 10, retroceso: 9, aturde: 14 },
    cuadros: [q(g('steph', 3), 4, 'inicio'), q(d('patada', { estelas: [fantasma(d('paso'))] }), 4, 'activo', 'pieL'), q(d('patada'), 7, 'recuperacion'), q(g('steph', 2), 8, 'recuperacion')] };
}

function stephAerea(): AnimPixel {
  return { nombre: 'patada_aerea', bucle: false, golpe: { daño: 10, parada: 10, retroceso: 9, aturde: 14 },
    cuadros: [q(d('salto'), 4, 'inicio'), q(d('patada', { estelas: [fantasma(d('salto'))] }), 18, 'activo', 'pieL'), q(d('salto'), 5, 'recuperacion'), q(d('salto'), 5, 'recuperacion')] };
}

function stephSalto(): AnimPixel {
  // se recoge y da la vuelta completa en el aire, de a 90 grados
  const b = (giro: number) => d('salto', { raiz: { giro } });
  return { nombre: 'salto', bucle: false, cuadros: [q(d('agacha'), 4, 'neutral'), q(b(0), 6, 'neutral'), q(b(-90), 6, 'neutral'), q(b(-180), 6, 'neutral'), q(b(-270), 6, 'neutral'), q(b(0), 6, 'neutral'), q(d('agacha'), 8, 'neutral')] };
}

function stephVoltereta(): AnimPixel {
  // la Voltereta Loca: avanza dando la rueda con las botas por delante
  const v = (x: number, espejo = false) => d('voltereta', { raiz: { x }, espejo, estelas: [fantasma(d('voltereta', { raiz: { x: x - 18 }, espejo }), 4)] });
  return { nombre: 'voltereta', bucle: false, golpe: { daño: 12, parada: 10, retroceso: 12, aturde: 16 },
    cuadros: [q(d('agacha'), 4, 'inicio'), q(v(6), 5, 'activo', 'pieL'), q(v(14, true), 5, 'activo', 'pieC'), q(v(22), 5, 'activo', 'pieL'), q(d('agacha', { raiz: { x: 24 } }), 7, 'recuperacion'), q(g('steph', 2, { raiz: { x: 24 } }), 6, 'recuperacion')] };
}

function stephBarrida(): AnimPixel {
  // la Barrida: se tira al piso con la pierna estirada, golpe bajo
  return { nombre: 'barrida', bucle: false, golpe: { daño: 11, parada: 9, retroceso: 10, aturde: 14 },
    cuadros: [q(d('agacha'), 4, 'inicio'), q(d('barrida', { raiz: { x: 8 }, estelas: [fantasma(d('barrida', { raiz: { x: -10 } }), 2), fantasma(d('agacha'))] }), 10, 'activo', 'pieL'), q(d('barrida', { raiz: { x: 12 } }), 6, 'recuperacion'), q(d('agacha', { raiz: { x: 12 } }), 6, 'recuperacion'), q(g('steph', 2, { raiz: { x: 12 } }), 6, 'recuperacion')] };
}

function stephSuper(): AnimPixel {
  // el Tornado de Bate: carga, gira con el bate arriba y remata con un batazo
  const vuelta = (i: number) => (i % 2 ? d('super', { espejo: true, estelas: [fantasma(d('super'), 2)] }) : d('super', { estelas: [fantasma(d('super', { espejo: true }), 2)] }));
  return { nombre: 'super', bucle: false, golpe: { daño: 4, parada: 5, retroceso: 4, aturde: 8 },
    cuadros: [q(d('batazo_carga'), 6, 'inicio'), q(d('super'), 6, 'inicio'), ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => q(vuelta(i), 4, 'activo', 'puñoL')), q(d('batazo', { raiz: { x: 6 }, estelas: [fantasma(d('batazo_carga'))] }), 6, 'activo', 'puñoL'), q(d('batazo', { raiz: { x: 6 } }), 8, 'recuperacion'), q(g('steph', 2), 8, 'recuperacion')] };
}

export const ANIMS_STEPH_PIXEL: Record<string, () => AnimPixel> = {
  ...Object.fromEntries(Object.entries(comunes('steph', { paso: 'paso', agacha: 'agacha', bloqueo: 'bloqueo', recibe: 'recibe', tendida: 'tendida', victoria: 'victoria', salto: 'salto' })).map(([k, v]) => [k, () => v])),
  salto: stephSalto, batazo: stephBatazo, patada: stephPatada, patada_aerea: stephAerea, voltereta: stephVoltereta, barrida: stephBarrida, super: stephSuper,
};

// ------------------------------------------------------------------ Thor

function thorZarpazo(): AnimPixel {
  return { nombre: 'zarpazo', bucle: false, golpe: { daño: 10, parada: 10, retroceso: 8, aturde: 14 },
    cuadros: [q(g('thor', 3), 4, 'inicio'), q(d('zarpazo', { estelas: [fantasma(d('guardia'))] }), 4, 'activo', 'puñoL'), q(d('zarpazo'), 7, 'recuperacion'), q(g('thor', 2), 7, 'recuperacion')] };
}

function thorMordida(): AnimPixel {
  return { nombre: 'mordida', bucle: false, golpe: { daño: 12, parada: 11, retroceso: 9, aturde: 16 },
    cuadros: [q(d('agacha'), 5, 'inicio'), q(d('mordida', { raiz: { x: 6 }, estelas: [fantasma(d('agacha'))] }), 4, 'activo', 'puñoL'), q(d('mordida', { raiz: { x: 5 } }), 7, 'recuperacion'), q(g('thor', 2), 7, 'recuperacion')] };
}

function thorAerea(): AnimPixel {
  return { nombre: 'patada_aerea', bucle: false, golpe: { daño: 10, parada: 10, retroceso: 8, aturde: 14 },
    cuadros: [q(d('salto'), 4, 'inicio'), q(d('mordida', { estelas: [fantasma(d('salto'))] }), 18, 'activo', 'puñoL'), q(d('salto'), 5, 'recuperacion'), q(d('salto'), 5, 'recuperacion')] };
}

function thorLadrido(): AnimPixel {
  // el Súper Ladrido: se planta, toma aire y ladra: la onda sale en el primer cuadro activo
  return { nombre: 'ladrido', bucle: false, golpe: { daño: 11, parada: 10, retroceso: 9, aturde: 14 },
    cuadros: [q(d('agacha'), 5, 'inicio'), q(g('thor', 3), 5, 'inicio'), q(d('ladrido', { estelas: [fantasma(d('agacha'))] }), 3, 'activo', 'puñoL'), q(d('ladrido'), 14, 'recuperacion'), q(g('thor', 2), 6, 'recuperacion')] };
}

function thorEmbestida(): AnimPixel {
  // el Rayo Veloz: sale disparado estirado como un misil, con dos estelas de sí mismo
  const corre = (x: number) => d('embestida', { raiz: { x }, estelas: [fantasma(d('embestida', { raiz: { x: x - 24 } }), 2), fantasma(d('embestida', { raiz: { x: x - 48 } }), 4)] });
  return { nombre: 'embestida', bucle: false, golpe: { daño: 14, parada: 12, retroceso: 16, aturde: 18 },
    cuadros: [q(d('agacha'), 4, 'inicio'), q(d('corre', { estelas: [fantasma(d('agacha'))] }), 4, 'inicio'), q(corre(6), 6, 'activo', 'puñoL'), q(corre(10), 6, 'activo', 'puñoL'), q(corre(14), 6, 'activo', 'puñoL'), q(d('corre', { raiz: { x: 12 } }), 9, 'recuperacion'), q(g('thor', 2, { raiz: { x: 8 } }), 9, 'recuperacion')] };
}

function thorSuper(): AnimPixel {
  // el Aullido Trueno: se sienta, aúlla al cielo y suelta la gran onda con un ladrido
  return { nombre: 'super', bucle: false, golpe: { daño: 28, parada: 16, retroceso: 18, aturde: 24 },
    cuadros: [q(d('aullido'), 8, 'inicio'), q(d('aullido', { raiz: { y: -2 } }), 8, 'inicio'), q(d('agacha'), 6, 'inicio'), q(d('ladrido', { raiz: { x: 4 }, estelas: [fantasma(d('aullido'), 2)] }), 4, 'activo', 'puñoL'), q(d('ladrido', { raiz: { x: 4 } }), 15, 'recuperacion'), q(g('thor', 2), 12, 'recuperacion')] };
}

export const ANIMS_THOR_PIXEL: Record<string, () => AnimPixel> = {
  ...Object.fromEntries(Object.entries(comunes('thor', { paso: 'corre', agacha: 'agacha', bloqueo: 'bloqueo', recibe: 'recibe', tendida: 'tendido', victoria: 'victoria', salto: 'salto' })).map(([k, v]) => [k, () => v])),
  zarpazo: thorZarpazo, mordida: thorMordida, patada_aerea: thorAerea, ladrido: thorLadrido, embestida: thorEmbestida, super: thorSuper,
};
