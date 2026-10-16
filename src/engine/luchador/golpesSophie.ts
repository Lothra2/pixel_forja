import type { Pose } from './esqueleto';
import { type AnimLuchador, con, entre } from './golpes';

/**
 * Los movimientos de Sophie: una niña rápida que pelea con las piernas y en el aire. Todo en pixeles de su tamaño (74
 * de alto). Las alturas de los saltos van en la cadera: el juego solo la mueve de lado.
 */

/** La guardia de Sophie: de lado, liviana sobre las puntas, los puños chiquitos arriba. */
export const GUARDIA_SOPHIE: Pose = {
  cadera: [0, 30, 0], giroCadera: 38, giroPecho: 28, inclina: 10, cabeza: { giro: 18, inclina: 4 },
  cerca: { brazo: { mano: [9, 43, 7], codo: [0, 32, 11] }, pierna: { tobillo: [-13, 3, 5], rodilla: [-1, 18, 15], pie: 40, punta: 10 } },
  lejos: { brazo: { mano: [19, 48, -2], codo: [10, 36, -8] }, pierna: { tobillo: [13, 3, -4], rodilla: [22, 18, -5], pie: 10, punta: 10 } },
  cara: 'serio', viento: 0,
};

/** Rebota en el lugar sobre las puntas, como una boxeadora chiquita. 6 cuadros en bucle. */
export function animGuardiaSophie(): AnimLuchador {
  const salto = [0, 1.5, 3.5, 4.5, 3.5, 1.5];
  return {
    nombre: 'guardia', bucle: true,
    cuadros: salto.map((h, i) => ({
      ticks: 5, fase: 'neutral' as const,
      pose: con(GUARDIA_SOPHIE, {
        cadera: [0, 30 + h - (h < 1 ? 1 : 0), 0], inclina: 10 - h * 0.4,
        cerca: { brazo: { mano: [9, 43 + h * 0.8, 7], codo: [0, 32, 11] }, pierna: { tobillo: [-13, 3 + h * 0.7, 5], rodilla: [-1, 18, 15], pie: 40, punta: h > 0 ? 25 : 10 } },
        lejos: { brazo: { mano: [19, 48 + h * 0.9, -2], codo: [10, 36, -8] }, pierna: { tobillo: [13, 3 + h * 0.7, -4], rodilla: [22, 18, -5], pie: 10, punta: h > 0 ? 25 : 10 } },
        viento: (i / 6) * Math.PI * 2,
      }),
    })),
  };
}

/** Bolita en el aire: las rodillas al pecho y los brazos abrazándolas, a la altura y que se diga. */
function bolita(y: number, v: number): Pose {
  return con(GUARDIA_SOPHIE, {
    cadera: [0, y, 0], giroCadera: 20, giroPecho: 16, inclina: 30, cabeza: { giro: 10, inclina: 30 },
    cerca: { brazo: { mano: [8, y + 2, 7], codo: [-2, y + 8, 10] }, pierna: { tobillo: [-1, y - 7, 4], rodilla: [9, y + 4, 8], pie: 0, punta: 30 } },
    lejos: { brazo: { mano: [10, y + 4, -5], codo: [0, y + 10, -8] }, pierna: { tobillo: [1, y - 8, -3], rodilla: [11, y + 2, -5], pie: 0, punta: 30 } },
    cara: 'grito', viento: v,
  });
}

/**
 * El salto con voltereta: se agacha, sale estirada con los brazos arriba, da la vuelta entera en bolita (4 cuadros de
 * 90 grados), se abre y cae agachada. 46 ticks. La cadera sube hasta 88, más alto que ella misma: salta como en el anime.
 */
export function animSaltoSophie(): AnimLuchador {
  const agacha = con(GUARDIA_SOPHIE, {
    cadera: [0, 24, 0], inclina: 22,
    cerca: { brazo: { mano: [4, 36, 8], codo: [-4, 28, 11] }, pierna: { tobillo: [-11, 3, 5], rodilla: [2, 16, 16], pie: 40 } },
    lejos: { brazo: { mano: [14, 38, -3], codo: [4, 30, -8] }, pierna: { tobillo: [11, 3, -4], rodilla: [22, 15, -5], pie: 10 } },
  });
  const sale = con(GUARDIA_SOPHIE, {
    cadera: [0, 46, 0], giroCadera: 30, giroPecho: 24, inclina: -4, cabeza: { giro: 16, inclina: -8 },
    cerca: { brazo: { mano: [4, 80, 6], codo: [6, 66, 10] }, pierna: { tobillo: [-6, 14, 4], rodilla: [2, 30, 8], pie: 30, punta: 40 } },
    lejos: { brazo: { mano: [12, 78, -4], codo: [10, 64, -8] }, pierna: { tobillo: [-2, 12, -3], rodilla: [4, 28, -5], pie: 20, punta: 40 } },
    cara: 'grito', viento: 1,
  });
  const abre = con(GUARDIA_SOPHIE, {
    cadera: [0, 64, 0], giroCadera: 30, giroPecho: 24, inclina: 8,
    cerca: { brazo: { mano: [8, 76, 8], codo: [0, 66, 12] }, pierna: { tobillo: [-8, 38, 5], rodilla: [4, 48, 10], pie: 30, punta: 20 } },
    lejos: { brazo: { mano: [18, 80, -3], codo: [10, 70, -8] }, pierna: { tobillo: [10, 40, -4], rodilla: [16, 52, -5], pie: 10, punta: 20 } },
    viento: 3,
  });
  const cae = con(agacha, { cadera: [0, 23, 0], viento: 3.6, cara: 'serio' });
  return {
    nombre: 'salto', bucle: false,
    cuadros: [
      { pose: agacha, ticks: 4, fase: 'neutral' },
      { pose: sale, ticks: 5, fase: 'neutral' },
      { pose: { ...bolita(74, 1.6), rueda: 0 }, ticks: 4, fase: 'neutral' },
      { pose: { ...bolita(84, 2.2), rueda: 90 }, ticks: 4, fase: 'neutral' },
      { pose: { ...bolita(88, 2.8), rueda: 180 }, ticks: 4, fase: 'neutral' },
      { pose: { ...bolita(82, 3.4), rueda: 270 }, ticks: 4, fase: 'neutral' },
      { pose: abre, ticks: 6, fase: 'neutral' },
      { pose: con(abre, { cadera: [0, 44, 0], cerca: { pierna: { tobillo: [-8, 16, 5] } }, lejos: { pierna: { tobillo: [10, 18, -4] } }, viento: 3.4 }), ticks: 5, fase: 'neutral' },
      { pose: cae, ticks: 6, fase: 'neutral' },
    ],
  };
}

/**
 * La patada voladora: desde el aire, se tira en diagonal hacia abajo con la pierna de cerca estirada como una flecha,
 * la otra recogida y los brazos atrás. Activa mientras baja. Pega con el pie.
 */
export function animPatadaVoladora(): AnimLuchador {
  const recoge = con(GUARDIA_SOPHIE, {
    cadera: [0, 58, 0], giroCadera: 14, giroPecho: 20, inclina: 4, cabeza: { giro: 20, inclina: 10 },
    cerca: { brazo: { mano: [-6, 64, 8], codo: [-4, 54, 10] }, pierna: { tobillo: [6, 44, 4], rodilla: [12, 56, 6], pie: 0, punta: -10 } },
    lejos: { brazo: { mano: [6, 70, -4], codo: [0, 60, -8] }, pierna: { tobillo: [-4, 42, -3], rodilla: [6, 50, -5], pie: 0, punta: 30 } },
    cara: 'grito', viento: 1,
  });
  const flecha = (y: number, v: number): Pose => con(GUARDIA_SOPHIE, {
    cadera: [0, y, 0], giroCadera: 4, giroPecho: 26, inclina: -14, cabeza: { giro: 24, inclina: 16 },
    cerca: { brazo: { mano: [-12, y + 16, 9], codo: [-8, y + 8, 12] }, pierna: { tobillo: [21, y - 18, 3], rodilla: [11, y - 9, 6], pie: 0, punta: -40 } },
    lejos: { brazo: { mano: [-6, y + 20, -5], codo: [-6, y + 11, -9] }, pierna: { tobillo: [-6, y - 9, -3], rodilla: [5, y - 4, -6], pie: 0, punta: 40 } },
    cara: 'grito', viento: v,
  });
  return {
    nombre: 'patada_voladora', bucle: false,
    golpe: { daño: 14, parada: 10, retroceso: 8, aturde: 14 },
    cuadros: [
      { pose: recoge, ticks: 3, fase: 'inicio' },
      { pose: flecha(54, 2), ticks: 4, fase: 'activo', pega: 'cerca', con: 'pie', estela: true },
      { pose: flecha(44, 2.8), ticks: 4, fase: 'activo', pega: 'cerca', con: 'pie' },
      { pose: flecha(34, 3.4), ticks: 4, fase: 'activo', pega: 'cerca', con: 'pie' },
    ],
  };
}

/**
 * Las mil patadas: parada en un pie, la pierna de cerca pega una y otra vez a tres alturas, tan rápido que deja
 * estela. 3 cuadros de 2 ticks en bucle (lo alarga el juego mientras se aprieta el botón).
 */
export function animMilPatadas(): AnimLuchador {
  const base = (tob: [number, number], rod: [number, number], v: number): Pose => con(GUARDIA_SOPHIE, {
    cadera: [-2, 31, 0], giroCadera: 6, giroPecho: 30, inclina: -10, cabeza: { giro: 20, inclina: 6 },
    cerca: { brazo: { mano: [2, 46, 9], codo: [-6, 36, 11] }, pierna: { tobillo: [tob[0], tob[1], 3], rodilla: [rod[0], rod[1], 6], pie: 0, punta: -30 } },
    lejos: { brazo: { mano: [12, 48, -4], codo: [4, 38, -9] }, pierna: { tobillo: [4, 3, -3], rodilla: [10, 17, -6], pie: 20, punta: 0 } },
    cara: 'grito', viento: v,
  });
  return {
    nombre: 'mil_patadas', bucle: true,
    golpe: { daño: 4, parada: 4, retroceso: 3, aturde: 6 },
    cuadros: [
      { pose: base([27, 46], [16, 38], 0.6), ticks: 2, fase: 'activo', pega: 'cerca', con: 'pie', estela: true },
      { pose: base([29, 34], [16, 34], 1.8), ticks: 2, fase: 'activo', pega: 'cerca', con: 'pie', estela: true },
      { pose: base([26, 54], [15, 42], 3.0), ticks: 2, fase: 'activo', pega: 'cerca', con: 'pie', estela: true },
      { pose: base([28, 40], [16, 36], 4.2), ticks: 2, fase: 'activo', pega: 'cerca', con: 'pie', estela: true },
    ],
  };
}

/**
 * El remolino: se agacha, salta y se da vuelta de cabeza con las piernas abiertas como hélice, girando sobre sí misma
 * mientras avanza (8 cuadros de 2 ticks, de 45 en 45 grados), y cae de pie con una voltereta. Cada vuelta pega.
 */
export function animRemolino(): AnimLuchador {
  const agacha = con(GUARDIA_SOPHIE, {
    cadera: [0, 22, 0], inclina: 26, cabeza: { giro: 14, inclina: 10 },
    cerca: { brazo: { mano: [2, 34, 9], codo: [-6, 26, 11] }, pierna: { tobillo: [-11, 3, 5], rodilla: [3, 15, 16], pie: 40 } },
    lejos: { brazo: { mano: [12, 36, -3], codo: [2, 28, -8] }, pierna: { tobillo: [11, 3, -4], rodilla: [22, 14, -5], pie: 10 } },
    cara: 'grito',
  });
  // de cabeza: armada parada con las piernas abiertas en V hacia arriba y los brazos hacia el suelo, y después dada vuelta
  const helice = (y: number, giro: number, v: number): Pose => ({
    ...con(GUARDIA_SOPHIE, {
      cadera: [0, y, 0], giroCadera: 90, giroPecho: 90, inclina: 0, cabeza: { giro: 0, inclina: 12 },
      cerca: { brazo: { mano: [3, y + 26, 8], codo: [4, y + 18, 13] }, pierna: { tobillo: [0, y - 9, 26], rodilla: [0, y - 6, 15], pie: 90, punta: -20 } },
      lejos: { brazo: { mano: [-3, y + 26, -8], codo: [-4, y + 18, -13] }, pierna: { tobillo: [0, y - 9, -26], rodilla: [0, y - 6, -15], pie: 90, punta: -20 } },
      cara: 'grito', viento: v,
    }),
    rueda: 180, vuelta: giro,
  });
  const cuadros: AnimLuchador['cuadros'] = [
    { pose: agacha, ticks: 4, fase: 'inicio' },
    { pose: { ...entre(agacha, helice(56, 0, 0.5), 0.5), rueda: 90 }, ticks: 3, fase: 'inicio' },
  ];
  for (let i = 0; i < 8; i++) cuadros.push({ pose: helice(64 + Math.sin(i * 0.8) * 2, i * 45, i * 0.8), ticks: 2, fase: 'activo', pega: i % 2 ? 'lejos' : 'cerca', con: 'pie', estela: i > 0 });
  cuadros.push({ pose: { ...bolita(54, 4), rueda: 270 }, ticks: 4, fase: 'recuperacion' });
  cuadros.push({ pose: con(agacha, { cara: 'serio', viento: 4.6 }), ticks: 6, fase: 'recuperacion' });
  return { nombre: 'remolino', bucle: false, golpe: { daño: 8, parada: 6, retroceso: 6, aturde: 10 }, cuadros };
}

/** Recibe un golpe: los ojos apretados, se encoge y se va un poquito para atrás. Caricatura, no dolor de verdad. */
export function animRecibeSophie(): AnimLuchador {
  const encoge = con(GUARDIA_SOPHIE, {
    cadera: [-3, 29, 0], giroPecho: 40, inclina: -10, cabeza: { giro: 10, inclina: -14 },
    cerca: { brazo: { mano: [4, 50, 9], codo: [-4, 40, 12] } },
    lejos: { brazo: { mano: [12, 54, -4], codo: [4, 44, -9] } },
    cara: 'dolor', viento: 1.5,
  });
  return {
    nombre: 'recibe', bucle: false,
    cuadros: [
      { pose: encoge, ticks: 3, fase: 'golpeado' },
      { pose: con(encoge, { cadera: [-5, 29, 0], inclina: -14, viento: 2.5 }), ticks: 10, fase: 'golpeado' },
      { pose: con(GUARDIA_SOPHIE, { cara: 'dolor', viento: 3.5 }), ticks: 5, fase: 'golpeado' },
    ],
  };
}

/** La victoria: un brinco con el puño arriba, la cola al viento y la cara feliz. */
export function animVictoriaSophie(): AnimLuchador {
  const arriba = (y: number, v: number): Pose => con(GUARDIA_SOPHIE, {
    cadera: [0, y, 0], giroCadera: 54, giroPecho: 62, inclina: -6, cabeza: { giro: 24, inclina: -10 },
    cerca: { brazo: { mano: [8, y + 8, 10], codo: [-2, y + 12, 14] }, pierna: { tobillo: [-8, y - 27, 5], rodilla: [-2, y - 14, 10], pie: 50, punta: y > 32 ? 40 : 0 } },
    lejos: { brazo: { mano: [6, y + 44, -6], codo: [8, y + 32, -10] }, pierna: { tobillo: [8, y - 24, -4], rodilla: [12, y - 12, -6], pie: 10, punta: y > 32 ? 40 : 0 } },
    cara: 'feliz', viento: v,
  });
  return {
    nombre: 'victoria', bucle: false,
    cuadros: [
      { pose: con(GUARDIA_SOPHIE, { cadera: [0, 25, 0], inclina: 20, cara: 'feliz' }), ticks: 5, fase: 'neutral' },
      { pose: arriba(42, 1), ticks: 8, fase: 'neutral' },
      { pose: arriba(36, 2), ticks: 6, fase: 'neutral' },
      { pose: arriba(30, 3), ticks: 12, fase: 'neutral' },
      { pose: arriba(30, 4), ticks: 12, fase: 'neutral' },
    ],
  };
}

export const ANIMS_SOPHIE = {
  guardia: animGuardiaSophie, salto: animSaltoSophie, patada_voladora: animPatadaVoladora, mil_patadas: animMilPatadas,
  remolino: animRemolino, recibe: animRecibeSophie, victoria: animVictoriaSophie,
};
