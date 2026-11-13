import {
  K, actuar, animar, plantar, mirar, quieto, TAU, mod1, SEL_CUADROS, SEL_ENTRADA,
  type Pose, type ArmaPose, type Presentacion, type ManoPose, type Clave, type Vals,
} from './figura';

/**
 * La presentación cinematográfica de cada clase en el menú de inicio (acción 'seleccion', 48 cuadros a 12 por segundo):
 * - entrada (cuadros 0 a 11, un segundo): el gesto de la clase al ser elegida; arranca y termina en la pose del bucle;
 * - bucle (cuadros 12 a 47, tres segundos): el reposo heroico vivo, que empalma el 47 con el 12 sin costura.
 * Pose de héroe con peso real (apoyado en una pierna, el arma como parte del gesto), respiración visible, el peso que
 * pasa despacio de una pierna a la otra y un viento suave continuo en la capa, la tela y el pelo. Todo con cuadros clave
 * de Hermite (arcos, anticipación y asentamiento; nada lineal).
 */
// (figura.ts importa este archivo y este importa figura: nada de figura se lee al cargar el módulo, solo al llamar)

/** Las dos partes de una clase: las claves del bucle (cíclicas) y las del gesto de entrada (sin la primera ni la última). */
interface Guion { bucle: Clave[]; entrada: Clave[]; o?: { lagCab?: number; lagArma?: number; capa?: number; tela?: number }; post?: (p: Pose, ub: number, ue: number | null) => void }

export function seleccion(p: Pose, f: number, arma: ArmaPose, estilo?: Presentacion, mano?: ManoPose): void {
  const NB = SEL_CUADROS - SEL_ENTRADA, ub = (f - SEL_ENTRADA) / NB, enEntrada = f < SEL_ENTRADA, ue = f / SEL_ENTRADA;
  const g = guion(p, arma, estilo, mano);
  if (!g) {
    // sin guion propio todavía: el reposo de la clase, dos respiraciones por bucle (empalma solo)
    // (en la entrada se queda en la pose con que arranca el bucle: el 0 igual al 12)
    quieto(p, enEntrada ? 0 : mod1(ub * 2), arma, estilo);
  } else if (enEntrada) {
    // la entrada sale de la pose del bucle y vuelve a ella (el juego puede pasar del bucle a la entrada y de vuelta)
    const b0 = animar(g.bucle, 0) as Vals;
    actuar(p, [K(0, b0, true), ...g.entrada, K(0.94, b0, true)], ue, g.o);
  } else actuar(p, g.bucle, mod1(ub), g.o);
  g?.post?.(p, ub, enEntrada ? ue : null);
  viento(p, ub);
}

/** El viento suave y continuo (también en la entrada): la tela y el pelo se mecen con dos frecuencias que cierran el bucle. */
function viento(p: Pose, ub: number) {
  const a = Math.sin(ub * TAU * 2), b = Math.sin(ub * TAU * 3 + 1.3), c = Math.sin(ub * TAU * 5 + 0.4);
  const capa = p.capa ?? [0.8, 0], pelo = p.pelo ?? [0, 0];
  p.capa = [capa[0] + 0.45 + 0.35 * a + 0.15 * c, capa[1] + 0.9 + 0.5 * b];
  p.pelo = [pelo[0] + 0.35 + 0.25 * b, pelo[1] + 0.7 + 0.4 * a + 0.15 * c];
}

function guion(p: Pose, arma: ArmaPose, estilo?: Presentacion, mano?: ManoPose): Guion | null {
  switch (estilo) {
    case 'rugido': return berserker(p, arma);
    case 'guardia': return templario(p, arma, mano);
    case 'apunta': return cazadora(p);
    default: return null;
  }
}

// ------------------------------------------------------------------ berserker
/**
 * Berserker: el hacha al hombro. Al ser elegido baja el cuerpo (anticipación), alza el hacha y la descarga adelante
 * contra el piso, la vuelve a subir al hombro y se asienta. En reposo jadea pesado, el peso en la pierna derecha, y a
 * mitad del bucle rota el cuello de un lado al otro.
 */
function berserker(p: Pose, arma: ArmaPose): Guion {
  plantar(p, [-3.2, 3.4], [2.8, 2.4], [24, 14]);
  const hombro: Vals = { hombroD: [13, 10, 106, 0], armaRel: [121, 30] };
  const libre: Vals = { hombroI: [8, 15, 24, 10], pegaI: 0, agarreI: -7 };
  void arma;
  const bucle: Clave[] = [
    K(0, { bajar: 2.4, torso: 7, avanza: 0, lateral: 0.7, ladeoCadera: 2.2, ladeo: -1.6, giroTorso: 10, giroCadera: -4, respira: 0.1, hombros: [1, 0.9], cabeza: -3, giroCabeza: 10, ladeoCabeza: 1, ...hombro, ...libre }),
    K(0.11, { respira: 1, hombros: [2.3, 2.1], torso: 5, bajar: 1.8 }),
    K(0.24, { respira: 0.15, hombros: [1, 0.9], torso: 7.5, bajar: 2.5, lateral: 0.8, hombroI: [9, 15, 28, 10] }, true),
    // rota el cuello: inclina a la derecha, baja la barbilla, pasa a la izquierda y vuelve
    K(0.36, { respira: 0.55, cabeza: 1, ladeoCabeza: 13, giroCabeza: 24, hombros: [1.6, 1.2] }),
    K(0.46, { cabeza: 9, ladeoCabeza: 0, giroCabeza: 16, respira: 1, hombros: [2.4, 2.2] }),
    K(0.56, { cabeza: 2, ladeoCabeza: -13, giroCabeza: 6, respira: 0.6 }),
    K(0.66, { cabeza: -4, ladeoCabeza: 0, giroCabeza: 10, respira: 0.15, hombros: [1, 0.9], lateral: 0.55, ladeoCadera: 1.8, hombroD: [14, 10, 109, 0], hombroI: [7, 15, 22, 10] }, true),
    K(0.8, { respira: 1, hombros: [2.2, 2], torso: 5.5, bajar: 1.9, lateral: 0.6 }),
    K(0.92, { respira: 0.3, hombros: [1.2, 1.1], torso: 6.8, bajar: 2.3 }),
  ];
  const entrada: Clave[] = [
    // se hunde y junta fuerza
    K(0.16, { bajar: 4.2, torso: 13, cabeza: 3, hombros: [0.4, 0.4], respira: 0, hombroD: [22, 12, 118, 0], armaRel: [126, 30], hombroI: [14, 16, 40, 10], pegaI: 1 }, true),
    // alza el hacha por encima del hombro, el pecho inflado
    K(0.36, { bajar: 0.4, torso: -7, cabeza: -18, respira: 1, hombros: [2.8, 2.6], hombroD: [84, 26, 38, 0], armaRel: [112, 16], hombroI: [24, 26, 50, 10] }),
    // la descarga adelante contra el piso (el contacto, sostenido)
    K(0.54, { bajar: 5.2, torso: 22, giroTorso: -8, cabeza: -6, respira: 0.3, hombros: [0.6, 0.6], hombroD: [56, -14, 34, 0], armaRel: [30, 6], hombroI: [34, 30, 50, 10], agarreI: -3, pegaI: 0 }, true),
    K(0.62, { bajar: 5.0, torso: 21, giroTorso: -8, hombroD: [55, -14, 36, 0], armaRel: [32, 6], agarreI: -3 }, true),
    // la sube de nuevo al hombro, con un tirón de los hombros
    K(0.8, { bajar: 2.8, torso: 6, giroTorso: 8, cabeza: -6, respira: 0.8, hombros: [2.2, 2], hombroD: [30, 11, 100, 0], armaRel: [118, 30], hombroI: [10, 15, 28, 10], pegaI: 0, agarreI: -7 }),
  ];
  return { bucle, entrada, o: { lagCab: 0.035, lagArma: 0.025, capa: 0.9 } };
}

// ------------------------------------------------------------------ templario
/**
 * Templario: la espada clavada al frente, la mano en el pomo y el escudo apoyado al costado. Al ser elegido la saca,
 * la alza en saludo junto a la cara y la clava al frente de un golpe seco; en reposo respira firme y la mirada barre
 * despacio, con el peso que pasa de una pierna a la otra.
 */
function templario(p: Pose, arma: ArmaPose, mano?: ManoPose): Guion {
  plantar(p, [-1.6, 2.4], [1.6, 1.8], [16, 10]);
  void arma; void mano;
  // la espada vertical con la punta clavada en el piso delante del pie, la mano sobre el pomo cerca del cuerpo y el codo
  // doblado y afuera (antes: brazo estirado hacia adelante y la hoja en diagonal sin tocar el piso, como si se le cayera)
  const pomo: Vals = { manoD: [8.5, 3.5, 27.5], armaD: [178, 4], pisoArma: 1, codoD: [-0.3, 1, -0.2] };
  const escudo: Vals = { hombroI: [-2, 26, 12, 0] };
  const bucle: Clave[] = [
    K(0, { bajar: 1.2, torso: 3, lateral: 0.45, ladeoCadera: 1.8, ladeo: -0.8, giroTorso: 6, giroCadera: -3, respira: 0.1, hombros: [0.3, 0.3], cabeza: -2, giroCabeza: 6, ladeoCabeza: 1, ...pomo, ...escudo }),
    K(0.25, { respira: 1, hombros: [0.9, 0.8], torso: 2, bajar: 0.9, giroCabeza: 14 }),
    K(0.5, { respira: 0.15, hombros: [0.3, 0.3], torso: 3.5, bajar: 1.3, lateral: -0.25, ladeoCadera: -1.2, ladeo: 0.6, giroCabeza: 24, cabeza: -3 }, true),
    K(0.75, { respira: 0.95, hombros: [0.9, 0.8], torso: 2, bajar: 0.9, giroCabeza: 18 }),
  ];
  const entrada: Clave[] = [
    // tira de la espada hacia arriba y atrás (anticipación)
    K(0.16, { bajar: 2.2, torso: 6, cabeza: 1, manoD: [8, 9, 36], armaD: [120, 30], pisoArma: 0 }, true),
    // el saludo: la guarnición junto al mentón, al costado derecho, la hoja vertical
    K(0.36, { bajar: 0.4, torso: -3, cabeza: -6, giroCabeza: 16, respira: 1, hombros: [0.8, 0.7], manoD: [3, 13, 45], armaD: [-6, 22] }, true),
    // la clava al frente de un golpe
    K(0.56, { bajar: 2.6, torso: 7, cabeza: 2, respira: 0.3, hombros: [0.2, 0.2], manoD: [9, 3.5, 27], armaD: [178, 4], pisoArma: 1 }, true),
    K(0.72, { bajar: 1.8, torso: 4, manoD: [8.5, 3.5, 27.5] }),
  ];
  return { bucle, entrada, o: { lagCab: 0.04, capa: 0.8 } };
}

// ------------------------------------------------------------------ cazadora
/**
 * Cazadora: el arco bajo en la izquierda con la flecha montada. Al ser elegida lo alza, tensa a medias girando el
 * torso y mira lejos, sostiene y lo baja; en reposo respira liviana, el peso en la pierna de atrás, y la mirada busca
 * a lo lejos de un lado al otro.
 */
function cazadora(p: Pose): Guion {
  plantar(p, [-2.8, 3.2], [2, 1.5], [40, 12]);
  const reposo: Vals = { manoI: [11, -7, 30], manoD: [8, -4, 31], codoD: [-0.35, 0.8, -0.5] };
  const bucle: Clave[] = [
    K(0, { bajar: 1.2, torso: 0, ladeo: -0.6, giroTorso: 14, giroCadera: 6, lateral: 0.35, ladeoCadera: 1.4, respira: 0.1, hombros: [0.2, 0.2], cabeza: -5, giroCabeza: 8, ladeoCabeza: -1, ...reposo }),
    K(0.17, { respira: 0.9, hombros: [0.6, 0.6], torso: -1, bajar: 0.9 }),
    K(0.33, { respira: 0.15, torso: 0.5, bajar: 1.3, giroCabeza: 22, cabeza: -6, lateral: 0.1, ladeoCadera: 0.6 }, true),
    K(0.5, { respira: 0.9, hombros: [0.6, 0.6], torso: -1, bajar: 0.9, giroCabeza: 34, cabeza: -7, manoI: [12, -7, 32] }),
    K(0.67, { respira: 0.15, torso: 0.8, bajar: 1.4, giroCabeza: 24, lateral: 0.5, ladeoCadera: 1.8 }, true),
    K(0.84, { respira: 0.9, hombros: [0.6, 0.6], torso: -1, bajar: 0.9, giroCabeza: 12, manoI: [11, -7, 30] }),
  ];
  const entrada: Clave[] = [
    K(0.16, { bajar: 2.2, torso: 5, giroTorso: 22, cabeza: 2, respira: 0.6, manoI: [15, -5, 37], manoD: [12, -3, 38] }),
    // tensa a medias, el torso girado de perfil al blanco y la vista lejos
    K(0.4, { bajar: 2.4, torso: -1, ladeo: -2, giroTorso: 48, giroCadera: 22, lateral: 0.8, ladeoCadera: 1.8, manoI: [23, 0, 47], manoD: [6, 4, 47], codoD: [-1, 0.45, 0.5], cabeza: -1, giroCabeza: -44, ladeoCabeza: -3, respira: 1, hombros: [0.4, 0.7] }, true),
    K(0.62, { manoD: [5.5, 4.4, 47.5], manoI: [23.5, 0, 47.4], respira: 0.8 }, true),
    K(0.8, { bajar: 1.6, torso: 2, giroTorso: 22, giroCadera: 10, manoI: [14, -6, 34], manoD: [10, -3.5, 34], codoD: [-0.35, 0.8, -0.5], giroCabeza: -26, respira: 0.3 }),
  ];
  return {
    bucle, entrada, o: { lagCab: 0.04, capa: 0.7 },
    post: (q) => { q.flecha = true; q.tensa = true; mirarLejos(q); },
  };
}
/** La mirada a lo lejos: la cabeza un poco arriba, sin bajar a los pies. */
function mirarLejos(p: Pose) { p.cabeza = Math.min(p.cabeza, -2); void mirar; }
