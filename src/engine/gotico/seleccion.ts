import {
  K, actuar, animar, plantar, mirar, quieto, TAU, mod1, SEL_CUADROS, SEL_ENTRADA,
  type Pose, type ArmaPose, type Presentacion, type ManoPose, type Clave, type Vals,
} from './figura';
import { esfera, caja, poliedro, type Pieza, type V3 } from './render';
import type { Esqueleto } from './cuerpo';

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
    const b0 = animar(g.bucle, 0) as Record<string, number | number[]>;
    // lo que el gesto mueve y el bucle no fija (los hombros del alquimista, por ejemplo) vuelve a su valor del bucle
    const base: Pose = { ...p }; actuar(base, g.bucle, 0, g.o);
    for (const c of g.entrada) for (const [k, v] of Object.entries(c.v)) if (!(k in b0)) { const bv = (base as unknown as Record<string, number | number[] | undefined>)[k]; b0[k] = bv ?? (Array.isArray(v) ? v.map(() => 0) : 0); }
    actuar(p, [K(0, b0 as Vals, true), ...g.entrada, K(0.88, b0 as Vals, true)], ue, g.o);
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
    case 'invoca': return nigromante(p, arma);
    case 'conjuro': return arcanista(p, arma);
    case 'naturaleza': return druida(p);
    case 'kata': return monje(p);
    case 'frasco': return alquimista(p);
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
  // el mango descansa SOBRE el hombro derecho: el puño delante del pecho, la cabeza del hacha atrás y arriba (como
  // camina en el juego, un poco más apoyada); la izquierda en la cadera
  const hombro: Vals = { hombroD: [10, 15, 118, 0], armaRel: [128, 36] }; // (más abierto: con la cabeza a 1,05 el mango rozaba el casco)
  const libre: Vals = { manoI: [0.2, -8.4, 30.5], codoI: [-0.7, -1, 0.1], pegaI: 0, agarreI: -7 };
  void arma;
  const bucle: Clave[] = [
    K(0, { bajar: 2.4, torso: 7, avanza: 0, lateral: 0.7, ladeoCadera: 2.2, ladeo: -1.6, giroTorso: 10, giroCadera: -4, respira: 0.1, hombros: [1, 0.9], cabeza: -3, giroCabeza: 10, ladeoCabeza: 1, ...hombro, ...libre }),
    K(0.11, { respira: 1, hombros: [2.3, 2.1], torso: 5, bajar: 1.8 }),
    K(0.24, { respira: 0.15, hombros: [1, 0.9], torso: 7.5, bajar: 2.5, lateral: 0.8, manoI: [0.4, -8.5, 30.2] }, true),
    // rota el cuello: inclina a la derecha, baja la barbilla, pasa a la izquierda y vuelve
    K(0.36, { respira: 0.55, cabeza: 1, ladeoCabeza: 13, giroCabeza: 24, hombros: [1.6, 1.2] }),
    K(0.46, { cabeza: 9, ladeoCabeza: 0, giroCabeza: 16, respira: 1, hombros: [2.4, 2.2] }),
    K(0.56, { cabeza: 2, ladeoCabeza: -13, giroCabeza: 6, respira: 0.6 }),
    K(0.66, { cabeza: -4, ladeoCabeza: 0, giroCabeza: 10, respira: 0.15, hombros: [1, 0.9], lateral: 0.55, ladeoCadera: 1.8, hombroD: [11, 8, 120, 0], manoI: [0, -8.3, 30.8] }, true),
    K(0.8, { respira: 1, hombros: [2.2, 2], torso: 5.5, bajar: 1.9, lateral: 0.6 }),
    K(0.92, { respira: 0.3, hombros: [1.2, 1.1], torso: 6.8, bajar: 2.3 }),
  ];
  const entrada: Clave[] = [
    // se hunde y junta fuerza
    K(0.16, { bajar: 4.2, torso: 13, cabeza: 3, hombros: [0.4, 0.4], respira: 0, hombroD: [22, 12, 118, 0], armaRel: [126, 30], hombroI: [14, 16, 40, 10], pegaI: 0.2 }, true),
    // alza el hacha bien arriba, por encima de la cabeza (el brazo no cruza delante de la cara), el pecho inflado
    K(0.36, { bajar: 0.4, torso: -7, cabeza: -9, respira: 1, hombros: [2.8, 2.6], hombroD: [80, 64, 45, 0], armaRel: [100, 40], hombroI: [24, 26, 50, 10], pegaI: 1 }),
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
  // (la mano un poco más cerca del cuerpo que en beb8955, 6 en vez de 8,5: con el brazo estirado no llegaba a apoyar la punta;
  // la altura la ajusta esqueleto() para que la punta o la cabeza del arma toquen el piso con cualquier largo)
  const pomo: Vals = { manoD: [6.5, 6.5, 26], armaD: [178, 4], pisoArma: 1, codoD: [-0.3, 1, -0.2] };
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

// ------------------------------------------------------------------ nigromante
/**
 * Nigromante: alto y enjuto. Al ser elegido abre la mano izquierda hacia el piso, la deja un momento (el resplandor
 * verde sube de la tierra hasta la palma, cuerpo.ts) y la sube despacio, en garra, hasta el pecho; se asienta. En
 * reposo la daga descansa con la punta en la palma de la otra mano (o en el borde del escudo); la guadaña, al hombro.
 */
function nigromante(p: Pose, arma: ArmaPose): Guion {
  plantar(p, [-1.4, 2.4], [1.4, 1.5], [14, 10]);
  const dos = arma === 'dos';
  const armaReposo: Vals = dos ? { hombroD: [10, 8, 118, 0], armaRel: [128, 28], manoI: [6, -8, 34], codoI: [-0.4, -1, 0] }
    : { manoD: [12, 3, 31.5], armaD: [90, -84], codoD: [-1, 0.25, -0.4], manoI: [12.2, -5.6, 31.2], codoI: [-0.3, -1, -0.4] };
  const bucle: Clave[] = [
    K(0, { bajar: 1, torso: 5, lateral: 0.4, ladeoCadera: 1.6, ladeo: -0.6, giroTorso: 4, giroCadera: -2, respira: 0.1, hombros: [0.3, 0.3], cabeza: -2, giroCabeza: 8, ladeoCabeza: 2, ...armaReposo }),
    K(0.25, { respira: 0.9, hombros: [0.7, 0.7], torso: 4, bajar: 0.8, ladeoCabeza: 0 }),
    K(0.5, { respira: 0.15, torso: 5.5, bajar: 1.1, lateral: -0.15, ladeoCadera: -0.8, ladeo: 0.4, giroCabeza: 16, cabeza: -1 }, true),
    K(0.75, { respira: 0.9, hombros: [0.7, 0.7], torso: 4, bajar: 0.8, giroCabeza: 10, ladeoCabeza: 3 }),
  ];
  const entrada: Clave[] = dos ? [
    K(0.2, { bajar: 2.4, torso: 14, cabeza: 10, manoI: [17, -4, 14], codoI: [0.2, -1, 0.4] }, true),
    K(0.42, { bajar: 2.6, torso: 16, cabeza: 12, manoI: [17.5, -4.2, 12] }, true),
    K(0.7, { bajar: 0.6, torso: 2, cabeza: -6, respira: 1, manoI: [12, -5, 40] }),
  ] : [
    K(0.2, { bajar: 2.4, torso: 14, cabeza: 10, manoD: [9, 7, 30], armaD: [150, 20], manoI: [17, -4, 14], codoI: [0.2, -1, 0.4] }, true),
    K(0.42, { bajar: 2.6, torso: 16, cabeza: 12, manoI: [17.5, -4.2, 12] }, true),
    K(0.7, { bajar: 0.6, torso: 2, cabeza: -6, respira: 1, manoI: [12, -5, 40], manoD: [9, 6, 31] }),
  ];
  return { bucle, entrada, o: { lagCab: 0.04, capa: 0.9, tela: 1.2 } };
}

// ------------------------------------------------------------------ arcanista
/**
 * Arcanista: la vara apoyada en el piso a su derecha. Al ser elegida la alza, el remate gira rápido (las runas
 * del remate dan la vuelta) y la vuelve a clavar; en reposo flota casi en puntas de pie, el remate gira despacio y
 * la mano libre se mece abierta. La varita del novato descansa con la punta en la palma de la otra mano.
 */
function arcanista(p: Pose, arma: ArmaPose): Guion {
  plantar(p, [-0.8, 1.8], [0.6, 0.9], [12, 14]);
  const vara = arma === 'baculo';
  // (la vara al costado, el brazo abierto y la mano a la altura del hombro: delante quedaba justo sobre la cara)
  const reposo: Vals = vara ? { varaPie: [7, 19, 0.5], manoD: [4, 14, 43], codoD: [-0.4, 1, -0.2], manoI: [10, -8, 30], codoI: [-0.2, -1, -0.3] }
    : { manoD: [12, 3, 33], armaD: [90, -84], codoD: [-1, 0.25, -0.4], manoI: [12.2, -4.8, 32.6], codoI: [-0.3, -1, -0.4] };
  const bucle: Clave[] = [
    K(0, { bajar: 0.6, torso: 1, ladeo: -1.2, lateral: 0.7, ladeoCadera: 2.4, giroTorso: 2, giroCadera: 0, respira: 0.1, puntillas: [0.35, 0.35], cabeza: -2, giroCabeza: 10, ladeoCabeza: 3, ...reposo }),
    K(0.25, { respira: 0.9, bajar: 0.2, puntillas: [0.5, 0.5], ladeoCabeza: 2 }),
    K(0.5, { respira: 0.15, bajar: 0.7, puntillas: [0.35, 0.35], giroCabeza: 18, lateral: 0.4, ladeoCadera: 1.4 }, true),
    K(0.75, { respira: 0.9, bajar: 0.2, puntillas: [0.5, 0.5], giroCabeza: 12, ladeoCabeza: 4 }),
  ];
  const entrada: Clave[] = vara ? [
    K(0.2, { bajar: 1.4, torso: 4, varaPie: [6, 21, 6], manoD: [3, 16, 46], respira: 0.4 }),
    K(0.45, { bajar: -0.4, torso: -6, puntillas: [0.9, 0.9], varaPie: [5, 23, 12], manoD: [2, 17, 52], respira: 1, cabeza: -12 }, true),
    K(0.7, { bajar: 1.0, torso: 3, puntillas: [0.2, 0.2], varaPie: [7, 19, 0.5], manoD: [4, 14, 43], respira: 0.3, cabeza: -2 }, true),
  ] : [
    K(0.25, { bajar: 0.2, torso: -4, puntillas: [0.8, 0.8], manoD: [12, 8, 46], armaD: [10, 20], manoI: [14, -6, 36], respira: 1, cabeza: -10 }, true),
    K(0.6, { bajar: 0.8, torso: 2, manoD: [11, 5, 38], armaD: [60, -20], respira: 0.4 }),
  ];
  return {
    bucle, entrada, o: { lagCab: 0.04, lagArma: 0.03, capa: 0.7, tela: 1.2 },
    // el remate gira siempre: despacio en el bucle (una vuelta) y rápido en la entrada (tres)
    post: (q, ub, ue) => { q.giroVara = ue !== null ? 1080 * ue * ue * (3 - 2 * ue) : 360 * (((ub % 1) + 1) % 1); },
  };
}

// ------------------------------------------------------------------ druida
/**
 * Druida: la vara apoyada al frente, las dos manos arriba en ella. Al ser elegido la alza y la clava en el piso de un
 * golpe (el viento sube: la capa, el pelo y la barba se levantan), y se asienta; en reposo respira hondo y mira lejos.
 */
function druida(p: Pose): Guion {
  plantar(p, [-1.5, 2], [1.6, 1.4], [16, 12]);
  const bucle: Clave[] = [
    K(0, { bajar: 1.4, torso: 7, ladeo: 0.8, lateral: 0.5, ladeoCadera: 1.8, giroTorso: 3, giroCadera: 0, respira: 0.1, hombros: [0.4, 0.4], cabeza: -6, giroCabeza: 8, ladeoCabeza: 1, varaPie: [13, 12.5, 0.5], manoD: [8, 10, 41], manoI: [4, -9, 29], codoI: [-0.2, -1, -0.3] }),
    K(0.25, { respira: 1, hombros: [0.9, 0.9], torso: 6, bajar: 1.1 }),
    K(0.5, { respira: 0.15, hombros: [0.4, 0.4], torso: 7.5, bajar: 1.5, giroCabeza: 16, lateral: 0.2, ladeoCadera: 0.8 }, true),
    K(0.75, { respira: 1, hombros: [0.9, 0.9], torso: 6, bajar: 1.1, giroCabeza: 4 }),
  ];
  const entrada: Clave[] = [
    K(0.22, { bajar: 0.6, torso: 2, varaPie: [9, 19, 9], manoD: [5, 15, 50], cabeza: -14, respira: 1 }, true),
    K(0.42, { bajar: 3.2, torso: 9, varaPie: [13, 12.5, 0.5], manoD: [8, 10, 39], cabeza: -2, respira: 0.2 }, true),
    K(0.6, { bajar: 2.6, torso: 8 }),
  ];
  return {
    bucle, entrada, o: { lagCab: 0.04, capa: 1, tela: 1.4 },
    // el golpe de la vara levanta el viento: la tela y el pelo se arrastran fuerte un momento
    post: (q, _ub, ue) => { if (ue !== null) { const g = Math.max(0, Math.sin(Math.PI * Math.max(0, Math.min(1, (ue - 0.4) / 0.5)))); q.capa = [(q.capa?.[0] ?? 0) + 2.2 * g, (q.capa?.[1] ?? 0) + 1.2 * g]; q.pelo = [(q.pelo?.[0] ?? 0) + 1.6 * g, (q.pelo?.[1] ?? 0) + 0.8 * g]; } },
  };
}

// ------------------------------------------------------------------ monje
/**
 * Monje: en guardia baja, las manos abiertas adelante. Al ser elegido hace una kata breve: un paso de peso, el puño
 * derecho que sale recto y vuelve, y la palma izquierda que empuja; se asienta y respira hondo (el pecho sube).
 */
function monje(p: Pose): Guion {
  plantar(p, [-2.4, 3.2], [2.6, 2.2], [24, 12]);
  const guardia: Vals = { manoD: [11, 5, 38], manoI: [14, -3, 42], codoD: [-0.3, 1, -0.4], codoI: [-0.3, -1, -0.4] };
  const bucle: Clave[] = [
    K(0, { bajar: 3, torso: 4, lateral: 0.3, ladeoCadera: 1, ladeo: -0.6, giroTorso: 14, giroCadera: 6, respira: 0.1, hombros: [0.3, 0.3], cabeza: -3, giroCabeza: 4, ladeoCabeza: 0, ...guardia }),
    K(0.25, { respira: 1, hombros: [1, 1], bajar: 2.6, torso: 2.5, manoD: [11, 5, 39], manoI: [14, -3, 43] }),
    K(0.5, { respira: 0.15, hombros: [0.3, 0.3], bajar: 3.2, torso: 4.5, giroCabeza: 12, lateral: 0.1, ...guardia }, true),
    K(0.75, { respira: 1, hombros: [1, 1], bajar: 2.6, torso: 2.5, manoD: [11, 5, 39], manoI: [14, -3, 43], giroCabeza: 6 }),
  ];
  const entrada: Clave[] = [
    K(0.16, { bajar: 4.2, torso: 8, giroTorso: 26, giroCadera: 12, manoD: [6, 7, 36] }, true),
    K(0.32, { bajar: 3.4, torso: 2, giroTorso: -10, giroCadera: -4, manoD: [24, 2, 42], codoD: [0, 1, -0.1], manoI: [8, -6, 36] }, true),
    K(0.5, { giroTorso: 6, manoD: [10, 6, 37], manoI: [22, -1, 41], codoI: [0, -1, -0.1] }, true),
    K(0.72, { bajar: 2.4, torso: 3, giroTorso: 12, respira: 1, hombros: [1.2, 1.2], ...guardia }),
  ];
  return { bucle, entrada, o: { lagCab: 0.03, capa: 0.6 } };
}

// ------------------------------------------------------------------ alquimista
/**
 * Alquimista: la ballesta baja, la izquierda bajo la caja. Al ser elegida saca el frasco, lo agita con fuerza, lo
 * levanta contra la luz de la fogata y lo mira de reojo, y lo guarda; en reposo cambia el peso de pierna, nerviosa.
 */
function alquimista(p: Pose): Guion {
  plantar(p, [-1.6, 2.6], [1.4, 1.2], [16, 10]);
  const reposo: Vals = { manoD: [9, 5, 31], armaD: [96, -12], codoD: [-0.4, 1, -0.3], manoI: [16, 1.5, 30.5], codoI: [-0.2, -1, -0.4], pegaI: 0 };
  const bucle: Clave[] = [
    K(0, { bajar: 1, torso: 3, ladeo: -0.6, lateral: 0.6, ladeoCadera: 2, giroTorso: 2, giroCadera: -2, respira: 0.1, cabeza: -2, giroCabeza: 10, ladeoCabeza: 2, ...reposo }),
    K(0.25, { respira: 0.9, lateral: 0.3, ladeoCadera: 1, giroCabeza: 22 }),
    K(0.5, { respira: 0.15, lateral: -0.5, ladeoCadera: -1.8, ladeo: 0.6, giroCabeza: 4, ladeoCabeza: -1 }, true),
    K(0.75, { respira: 0.9, lateral: 0.2, ladeoCadera: 0.6, giroCabeza: 16 }),
  ];
  const entrada: Clave[] = [
    K(0.16, { manoI: [10, -2, 40], codoI: [-0.2, -1, -0.4], cabeza: 2, giroCabeza: 0 }),
    K(0.26, { manoI: [11, -1, 45], hombros: [0.3, 0.8] }),
    K(0.36, { manoI: [10, -3, 39], hombros: [0, 0.2] }),
    K(0.46, { manoI: [11, -1, 45], hombros: [0.3, 0.8] }),
    // lo alza contra la luz y lo mira
    K(0.62, { manoI: [14, 2, 50], cabeza: -10, giroCabeza: 10, respira: 0.8 }, true),
    K(0.78, { manoI: [14.5, 2.2, 50.5], cabeza: -11 }, true),
  ];
  return {
    bucle, entrada, o: { lagCab: 0.04, capa: 0.7 },
    // el frasco solo en la entrada (después vuelve al cinto)
    post: (q, _ub, ue) => { if (ue !== null && ue > 0.08 && ue < 0.88) { q.objetoI = 'frasco'; q.pegaI = 0; } },
  };
}

// ------------------------------------------------------------------ efectos de la entrada
/**
 * Lo que acompaña el gesto de entrada (cuadros 0 a 11), pintado por cuerpo.ts: el resplandor verde del nigromante que
 * sube de la tierra a la palma; las runas de la arcanista que dan la vuelta al remate; las hojas que el golpe de la
 * vara del druida levanta en remolino. Pocas piezas y chicas: el brillo queda en un acento.
 */
export function efectosSeleccion(estilo: Presentacion | undefined, e: Esqueleto, f: number): Pieza[] {
  if (f >= SEL_ENTRADA || !estilo) return [];
  const u = f / SEL_ENTRADA, S = e.S, ps: Pieza[] = [];
  const h = (i: number) => { const x = Math.sin(i * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); };
  if (estilo === 'invoca') {
    // del piso bajo la mano abierta suben hebras de luz verde hasta la palma (más fuertes a mitad del gesto)
    const m = e.brazos[1].mano, k = Math.sin(Math.PI * Math.min(1, Math.max(0, (u - 0.1) / 0.75)));
    if (k <= 0.05) return ps;
    for (let i = 0; i < 7; i++) {
      const t = (h(i) + u * 1.6) % 1, a = h(i + 9) * Math.PI * 2, r = (1.5 + 2.5 * (1 - t)) * S;
      const q: V3 = [m[0] + Math.cos(a) * r, m[1] + Math.sin(a) * r, m[2] * t + 0.5 * S];
      ps.push(esfera(q[0], q[1], q[2], (0.35 + 0.4 * k * (1 - t)) * S, { mat: 'fuego_verde' }));
    }
  } else if (estilo === 'conjuro') {
    // cuatro runas que orbitan el remate de la vara mientras gira
    const mn = e.brazos[0].mano, v = e.vara ?? [0, 0, 1], tope: V3 = [mn[0] + v[0] * 20 * S, mn[1] + v[1] * 20 * S, mn[2] + v[2] * 20 * S], k = Math.sin(Math.PI * u);
    if (k <= 0.1) return ps;
    for (let i = 0; i < 4; i++) {
      const a = u * Math.PI * 6 + (i * Math.PI) / 2, r = 3.2 * S;
      ps.push(caja(tope[0] + Math.cos(a) * r, tope[1] + Math.sin(a) * r, tope[2] + 1 * S + Math.sin(a * 2) * 0.6 * S, 0.5 * S, 0.5 * S, 1.1 * S * k, { mat: 'magia', giro: (a * 180) / Math.PI }));
    }
  } else if (estilo === 'naturaleza') {
    // hojas en remolino que el golpe de la vara levanta y el viento se lleva
    const pie = e.varaPie ?? e.brazos[0].mano, k = Math.max(0, Math.min(1, (u - 0.38) / 0.5));
    if (k <= 0) return ps;
    for (let i = 0; i < 8; i++) {
      const a = h(i) * Math.PI * 2 + k * 4, r = (2 + 7 * k) * S * (0.6 + 0.4 * h(i + 3)), z = (1 + 18 * k * h(i + 5)) * S;
      const c: V3 = [pie[0] + Math.cos(a) * r - 4 * k * S, pie[1] + Math.sin(a) * r - 3 * k * S, z];
      ps.push(poliedro([c, [c[0] + 1.1 * S, c[1] + 0.3 * S, c[2] + 0.4 * S], [c[0] + 0.4 * S, c[1] + 0.9 * S, c[2] - 0.2 * S], [c[0] + 0.6 * S, c[1] + 0.5 * S, c[2] + 0.5 * S]], { mat: i % 3 ? 'cu_tela_musgo' : 'cu_hoja_elfica', tono: 0.1 }));
    }
  }
  return ps;
}
