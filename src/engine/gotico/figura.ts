import { caja, cilindro, elipsoide, esfera, palo, poliedro, type Pieza, type V3 } from './render';

/**
 * Personajes del taller gótico: un esqueleto con articulaciones (cadera, rodillas, hombros, codos) que se pone en
 * pose con ángulos y se viste con volúmenes redondeados (torso, pelvis y cabeza en elipsoides, miembros en
 * cápsulas que se afinan, manos y pies en elipsoides), la cara con cejas, ojos y nariz, el pelo, la ropa por capas
 * y el arma en la mano. La pose sale de una acción (quieto, caminar, atacar, lanzar, morir) y un cuadro, y la
 * figura gira entera para las 8 direcciones del juego.
 *
 * Proporciones de un adulto de 61 unidades (75 px): cabeza de 9 de alto, hombros a 47, cadera a 31, rodilla a 16.
 */

export type Dir = 's' | 'so' | 'o' | 'no' | 'n' | 'ne' | 'e' | 'se';
export const DIRS: Dir[] = ['s', 'so', 'o', 'no', 'n', 'ne', 'e', 'se'];
/** Hacia dónde mira cada dirección (en grados sobre el piso; 45 = hacia el que mira la pantalla). */
const RUMBO: Record<Dir, number> = { se: 0, s: 45, so: 90, o: 135, no: 180, n: 225, ne: 270, e: 315 };
export const NOMBRE_DIR: Record<Dir, [string, string]> = {
  s: ['Sur (de frente)', 'South (front)'], so: ['Suroeste', 'Southwest'], o: ['Oeste', 'West'], no: ['Noroeste', 'Northwest'],
  n: ['Norte (de espalda)', 'North (back)'], ne: ['Noreste', 'Northeast'], e: ['Este', 'East'], se: ['Sureste', 'Southeast'],
};

export type Accion = 'quieto' | 'caminar' | 'correr' | 'atacar' | 'lanzar' | 'herido' | 'morir' | 'presentar';
/** Cómo se presenta cada héroe en la pantalla de selección. */
export type Presentacion = 'rugido' | 'guardia' | 'conjuro' | 'apunta' | 'invoca' | 'kata' | 'naturaleza' | 'frasco';
/** Cuadros por acción de los monstruos humanoides (y de todo cuerpo sin clase de héroe). Los héroes van por ANIM_HEROE. */
export const CUADROS: Record<Accion, number> = { quieto: 4, caminar: 8, correr: 8, atacar: 8, lanzar: 8, herido: 4, morir: 8, presentar: 16 };

// ------------------------------------------------------------------ cuadros de los héroes, por clase
export type ClaseHeroe = 'berserker' | 'templario' | 'arcanista' | 'cazadora' | 'nigromante' | 'monje' | 'druida' | 'alquimista';
export const CLASES_HEROE: ClaseHeroe[] = ['berserker', 'templario', 'arcanista', 'cazadora', 'nigromante', 'monje', 'druida', 'alquimista'];
/** La presentación de cada clase es su estilo de movimiento: pose() lo recibe y de ahí sale la clase. */
export const ESTILO_CLASE: Record<ClaseHeroe, Presentacion> = { berserker: 'rugido', templario: 'guardia', arcanista: 'conjuro', cazadora: 'apunta', nigromante: 'invoca', monje: 'kata', druida: 'naturaleza', alquimista: 'frasco' };
export const CLASE_ESTILO = Object.fromEntries(Object.entries(ESTILO_CLASE).map(([c, e]) => [e, c])) as Record<Presentacion, ClaseHeroe>;

/** Una acción de un héroe: cuadros, ticks por cuadro a 25 cuadros por segundo y, si pega o suelta algo, el cuadro del golpe. */
export interface AnimAccion {
  cuadros: number;
  /** Ticks por cuadro a 25 cps (la duración sugerida del ciclo es cuadros × t / 25 s). */
  t: number;
  /** Atacar y lanzar: índice del cuadro de impacto (el contacto del arma, la flecha que sale, el hechizo que se suelta). */
  impacto?: number;
  /** Otros contactos dentro de la misma acción (el combo del monje): para sonidos y chispas, no para el daño. */
  golpes?: number[];
}
/** Lo que cambia por clase respecto de la base (los héroes: quieto 8, caminar, correr, atacar y lanzar 12, herido 6, morir 8). */
const BASE_HEROE: Record<Accion, number> = { quieto: 8, caminar: 12, correr: 12, atacar: 12, lanzar: 12, herido: 6, morir: 8, presentar: 16 };
const T_BASE: Record<Accion, number> = { quieto: 5, caminar: 2, correr: 1.5, atacar: 2, lanzar: 2, herido: 2, morir: 3, presentar: 3 };
/**
 * Ritmo e impacto de cada clase: el berserker respira pesado y carga largo; el templario pega corto desde la guardia; el
 * monje encadena tres golpes casi sin recogida; la cazadora suelta la flecha a mitad de la acción; el druida describe un
 * arco amplio; el nigromante alza, sostiene y deja caer tarde; la arcanista sostiene con las manos abiertas antes de
 * soltar; la alquimista arroja por encima del hombro con un pasito atrás.
 */
const RITMO: Record<ClaseHeroe, { t: Partial<Record<Accion, number>>; atacar: number; lanzar: number; golpes?: number[] }> = {
  berserker: { t: { quieto: 4 }, atacar: 7, lanzar: 6 },
  templario: { t: { quieto: 7 }, atacar: 5, lanzar: 6 },
  arcanista: { t: { quieto: 6 }, atacar: 6, lanzar: 7 },
  cazadora: { t: { quieto: 5 }, atacar: 6, lanzar: 6 },
  nigromante: { t: { quieto: 8, caminar: 2.5 }, atacar: 7, lanzar: 8 },
  monje: { t: { quieto: 4 }, atacar: 5, lanzar: 5, golpes: [2, 5, 8] },
  druida: { t: { quieto: 7 }, atacar: 7, lanzar: 7 },
  alquimista: { t: { quieto: 4 }, atacar: 5, lanzar: 6 },
};
export const ANIM_HEROE: Record<ClaseHeroe, Record<Accion, AnimAccion>> = Object.fromEntries(CLASES_HEROE.map((c) => {
  const r = RITMO[c];
  const accs = Object.fromEntries((Object.keys(BASE_HEROE) as Accion[]).map((a) => {
    const x: AnimAccion = { cuadros: BASE_HEROE[a], t: r.t[a] ?? T_BASE[a] };
    if (a === 'atacar' || a === 'lanzar') x.impacto = r[a];
    if (a === 'atacar' && r.golpes) x.golpes = r.golpes;
    return [a, x];
  }));
  return [c, accs];
})) as Record<ClaseHeroe, Record<Accion, AnimAccion>>;
/** Cuadros de una acción: los del héroe si el cuerpo tiene estilo de clase, si no los de los monstruos (CUADROS). */
export function cuadrosDe(acc: Accion, estilo?: Presentacion): number {
  return estilo ? ANIM_HEROE[CLASE_ESTILO[estilo]][acc].cuadros : CUADROS[acc];
}
/** Cuadro clave de una acción del héroe en el tiempo de la animación (0..1): el impacto cae justo en impacto / cuadros. */
const tImpacto = (estilo: Presentacion | undefined, acc: 'atacar' | 'lanzar', porOmision: number) => {
  if (!estilo) return porOmision;
  const a = ANIM_HEROE[CLASE_ESTILO[estilo]][acc];
  return (a.impacto ?? 0) / a.cuadros;
};

/** Un brazo: adelante (+) / atrás (-), afuera, codo y, opcional, giro del brazo hacia adentro (el antebrazo cruza al pecho). */
export type AngBrazo = [number, number, number] | [number, number, number, number];
/** Ángulos en grados. Brazos: adelante (+) / atrás (-), afuera, codo. Piernas: adelante/atrás, rodilla. */
export interface Pose {
  torso: number; // inclinación hacia adelante
  giroTorso: number; // giro de los hombros sobre la vertical (+ el hombro derecho va atrás)
  cabeza: number; // cabeza hacia abajo (+)
  bajar: number; // cuánto baja la cadera (rodillas dobladas)
  avanza: number; // corrimiento hacia adelante de todo (con los pies plantados, solo de la cadera)
  hombroD: AngBrazo; hombroI: AngBrazo;
  caderaD: [number, number]; caderaI: [number, number];
  /** Tumbado (morir): cuánto se fue al piso, 0..1. */
  caida: number;
  /** Pisada real: la cadera baja hasta que el pie de apoyo toca el piso (caminar y correr); vuelo levanta en la carrera. */
  suelo?: boolean;
  vuelo?: number;
  // ---- grados de libertad finos (todos opcionales; 0 si faltan)
  /** Columna: el torso se ladea al costado (+ la cabeza va a la derecha). */
  ladeo?: number;
  /** Pelvis: giro sobre la vertical (mismo sentido que giroTorso), ladeo (+ sube la cadera derecha) y corrimiento al costado (+ a la derecha: el peso pasa a esa pierna). */
  giroCadera?: number; ladeoCadera?: number; lateral?: number;
  /** Cabeza: giro (+ mira a la derecha) y ladeo (+ la oreja derecha baja), sobre el torso. */
  giroCabeza?: number; ladeoCabeza?: number;
  /** Respiración: pecho inflado 0..1, y cuánto suben los hombros [derecho, izquierdo]. */
  respira?: number; hombros?: [number, number];
  /**
   * Pies plantados: los tobillos quedan en el piso y las rodillas se resuelven solas (la cadera baja con `bajar` y la
   * rodilla se dobla). `pasos` pone cada pie adelante (+) o atrás (-), `abre` lo separa al costado, `alza` lo levanta,
   * `puntillas` levanta el talón (0..1) y `pieGiro` abre la punta hacia afuera (grados). Orden: [derecho, izquierdo].
   */
  plantado?: boolean; pasos?: [number, number]; abre?: [number, number]; alza?: [number, number]; puntillas?: [number, number]; pieGiro?: [number, number];
  /** La mano va a ese punto (adelante, derecha, alto desde el piso; en el marco del cuerpo) y el codo apunta hacia `codo`. */
  manoD?: [number, number, number]; manoI?: [number, number, number];
  codoD?: [number, number, number]; codoI?: [number, number, number];
  /** Arma de la derecha: hacia dónde apunta [desde arriba hacia adelante, giro a la derecha] en grados; si falta sale del puño. */
  armaD?: [number, number];
  /**
   * Arma de la derecha sujeta al antebrazo: [ángulo desde el antebrazo, giro alrededor de él] en grados (giro 0 = hacia el
   * lado al que dobla el codo; + hacia afuera del cuerpo). El arma acompaña al brazo y al torso. `armaD` manda si están los dos.
   */
  armaRel?: [number, number];
  /** Muñeca: vuelca el arma en el puño (grados, + hacia adelante): el arma se atrasa o se adelanta al brazo. */
  munecaD?: number;
  /** La cabeza del arma busca el piso (0..1): golpe contra el suelo, según el largo del arma. */
  pisoArma?: number;
  /** La izquierda toma el mango a esa distancia del puño derecho; pegaI 0..1 cuánto (0 = mano libre). */
  agarreI?: number; pegaI?: number;
  /** Hacia dónde apunta el codo izquierdo cuando la izquierda toma el mango (adelante, derecha, arriba; marco del cuerpo). */
  poloI?: [number, number, number];
  /** Báculo: inclinación [adelante, a la derecha] en grados y giro del remate sobre su eje. */
  vara?: [number, number]; giroVara?: number;
  /** Báculo apoyado: el pie de la vara queda en ese punto (marco del cuerpo) y la vara pasa por la mano derecha. */
  varaPie?: [number, number, number];
  /** Tela y pelo: cuánto se arrastran [atrás, a la derecha] por la inercia del cuerpo. */
  capa?: [number, number]; pelo?: [number, number];
  /** Arco: hay flecha en la cuerda (falta = sí) y la mano derecha tira de la cuerda (falta = sí; si no, la cuerda va recta). */
  flecha?: boolean; tensa?: boolean;
  /** Morir: hacia dónde cae el cuerpo (grados sobre el piso: 0 adelante, 90 a la derecha, 180 de espaldas, -90 a la izquierda). */
  caidaDir?: number;
  /** Lo que lleva la mano izquierda en la presentación. */
  objetoI?: 'frasco';
  /** Carrera: altura de la cadera sobre el piso (unidades de un cuerpo de alto 1); si falta, la da la pierna más estirada. */
  zCadera?: number;
}
/** Porte de un monstruo humanoide: el bruto (ogro, trol, gigante) pega con peso; la bestia (necrófago, diablillo) corre agachada. */
export type Porte = 'bruto' | 'bestia';

/**
 * Ciclo de una pierna en la marcha (p de 0 a 1, 0 = el talón toca el piso adelante). Devuelve [muslo, rodilla] en
 * grados. Apoyo: el muslo pasa de adelante hacia atrás a ritmo parejo; al caminar el pie plantado retrocede también a
 * ritmo parejo (la rodilla se acomoda a eso: el pie no patina ni se frena) y al correr la rodilla amortigua al pisar.
 * Vuelo: la rodilla sube y la pierna vuelve adelante; al caminar el pie llega adelante por el aire y recién ahí baja.
 */
export const APOYO = { caminar: 0.6, correr: 0.38 } as const;
/**
 * Amplitud del paso de cada clase (1 = el paso de siempre, el de los monstruos): el berserker da zancadas largas y bajas
 * (la cadera baja sola para que el pie llegue), el templario y la arcanista pasos medidos, el nigromante lento y corto.
 * La zancada (lo que avanza el cuerpo por ciclo) sale de esto: el juego la lee del manifiesto para que los pies no patinen.
 */
const AMP_MARCHA: Record<Presentacion, [number, number]> = {
  rugido: [1.14, 1.08], guardia: [0.92, 0.96], conjuro: [0.9, 0.96], apunta: [1.02, 1.06],
  invoca: [0.84, 0.94], kata: [1, 1.04], naturaleza: [1, 1], frasco: [0.96, 1.02],
};
const ampDe = (estilo: Presentacion | undefined, correr: boolean) => (estilo ? AMP_MARCHA[estilo][correr ? 1 : 0] : 1);
function piernaMarcha(p: number, correr: boolean, amp = 1): [number, number] {
  p = ((p % 1) + 1) % 1;
  const ap = correr ? APOYO.correr : APOYO.caminar;
  // al correr el paso es más corto y la pierna de apoyo casi estirada: la cadera va alta y no se hunde
  const ade = (correr ? 20 : 25) * amp, atr = (correr ? 17 : 25) * amp;
  if (p < ap) {
    const u = p / ap;
    const muslo = ade - (ade + atr) * u;
    if (!correr) {
      // caminar: el pie apoyado retrocede a ritmo parejo (de la pisada al despegue, 4° → 20° de rodilla en los extremos):
      // la rodilla sale de ahí y el pie no patina ni se frena a mitad del apoyo; la cadera sube en el medio del apoyo
      const pie = (m: number, r: number) => LARGO_MUSLO * Math.sin(rad(m)) + LARGO_PIERNA * Math.sin(rad(m - r));
      const x = lerp(pie(ade, 4), pie(-atr, 20), u);
      const canilla = grados(Math.asin(clamp((x - LARGO_MUSLO * Math.sin(rad(muslo))) / LARGO_PIERNA, -1, 1)));
      return [muslo, muslo - canilla];
    }
    // correr: el pie apoyado también retrocede a ritmo parejo (de la pisada, rodilla a 8°, al despegue, a 10°): no patina
    const pie = (m: number, r: number) => LARGO_MUSLO * Math.sin(rad(m)) + LARGO_PIERNA * Math.sin(rad(m - r));
    const x = lerp(pie(ade, 8), pie(-atr, 10), u);
    const canilla = grados(Math.asin(clamp((x - LARGO_MUSLO * Math.sin(rad(muslo))) / LARGO_PIERNA, -1, 1)));
    return [muslo, Math.max(4, muslo - canilla)];
  }
  const w = (p - ap) / (1 - ap);
  if (!correr) {
    // caminar: el muslo llega adelante antes y la rodilla sigue doblada hasta el final del vuelo: el pie pasa por el aire
    // y baja a pisar con el talón ya adelante (no se apoya a mitad del paso ni se arrastra hacia adelante por el piso)
    const sube = Math.sin((Math.PI / 2) * Math.min(1, w / 0.8));
    return [-atr + (ade + atr) * sube + 12 * Math.sin(Math.PI * w), Math.max(2, 4 + 44 * Math.sin(Math.PI * Math.pow(w, 0.6)))];
  }
  const suave = 0.5 - 0.5 * Math.cos(Math.PI * w);
  const muslo = -atr + (ade + atr) * suave + 14 * Math.sin(Math.PI * w);
  const rodilla = 20 + 92 * Math.sin(Math.PI * Math.min(1, w * 1.12));
  return [muslo, Math.max(2, rodilla)];
}

/** Largos del muslo y la pierna (adulto de alto 1). */
const LARGO_MUSLO = 14.5, LARGO_PIERNA = 14;
/**
 * Cuánto avanza el cuerpo en un ciclo completo (todos sus cuadros) de caminar o correr, en unidades del mundo para un cuerpo
 * de alto 1: es lo que recorre el pie plantado mientras está apoyado, dividido por la parte del ciclo que apoya. El juego
 * mueve al personaje a esa velocidad (zancada × alto por ciclo) y los pies no patinan.
 */
export function zancada(acc: 'caminar' | 'correr', alto = 1, estilo?: Presentacion): number {
  const correr = acc === 'correr', ap = correr ? APOYO.correr : APOYO.caminar, amp = ampDe(estilo, correr);
  const x = (p: number) => { const [m, r] = piernaMarcha(p, correr, amp); const a1 = (m * Math.PI) / 180, a2 = ((m - r) * Math.PI) / 180; return LARGO_MUSLO * Math.sin(a1) + LARGO_PIERNA * Math.sin(a2); };
  return ((x(0) - x(ap - 1e-6)) / ap) * alto;
}

/** Tipo de arma para la pose (lo que cambia cómo se agarra y cómo se mueve). */
/** 'asta': la lanza a dos manos, ataca de estocada; 'segur': la guadaña de un monstruo, siega de lado. En todo lo demás van como 'dos'. */
export type ArmaPose = 'una' | 'dos' | 'arco' | 'baculo' | 'garras' | 'nada' | 'ballesta' | 'asta' | 'segur';

/** Lo que lleva la mano izquierda cuando la derecha empuña sola: un escudo o un objeto (orbe, libro, antorcha). */
export type ManoPose = 'escudo' | 'objeto';

export function pose(acc: Accion, f: number, arma: ArmaPose = 'una', estilo?: Presentacion, mano?: ManoPose, porte?: Porte): Pose {
  const p: Pose = { torso: 4, giroTorso: 0, cabeza: 0, bajar: 0, avanza: 0, hombroD: [8, 10, 18], hombroI: [6, 10, 16], caderaD: [2, 4], caderaI: [-2, 4], caida: 0 };
  if ((arma === 'asta' || arma === 'segur') && acc !== 'atacar') arma = 'dos';
  // el tiempo de la acción (0..1): cada clase de héroe tiene sus cuadros (ANIM_HEROE); los monstruos, los de CUADROS
  const n = cuadrosDe(acc, estilo), u = f / n;
  // morir va por tablas de 8 cuadros: si una clase tuviera otros, se reparte en esas 8 poses
  const f8 = acc === 'morir' ? (f * 8) / n : f;
  if (estilo === 'kata' && acc !== 'presentar' && acc !== 'lanzar') monje(p, acc, u, f8, arma);
  else if (estilo === 'naturaleza' && acc !== 'presentar') druida(p, acc, u, f8, arma);
  else if (acc === 'quieto') quieto(p, u, arma, estilo);
  else if (acc === 'caminar' || acc === 'correr') marcha(p, u, acc === 'correr', arma, estilo, porte);
  else if (acc === 'presentar') presentar(p, u, arma, estilo ?? 'guardia', mano);
  else if (acc === 'atacar') { if (porte === 'bruto' && (arma === 'una' || arma === 'dos')) atacarBruto(p, u, arma); else if (!estilo && (arma === 'garras' || arma === 'nada')) atacarBestia(p, u); else if (arma === 'segur') atacarGuadana(p, llevar(u, 0.5, 7 / 12)); else atacar(p, u, arma, estilo, mano); }
  else if (acc === 'lanzar') lanzar(p, u, arma, estilo, mano);
  else if (acc === 'herido') herido(p, u, arma, estilo);
  else morir(p, f8, arma, estilo);
  if (mano) brazoEscudo(p, acc, u, mano);
  return p;
}

/**
 * El brazo del escudo (o del orbe, el libro, la antorcha): quieto y adelante, con el codo cerca de 90° y el antebrazo
 * cruzando un poco frente al pecho; casi no se balancea. La cara del escudo la orienta cuerpo.ts con el torso.
 */
function brazoEscudo(p: Pose, acc: Accion, u: number, mano: ManoPose) {
  if (acc === 'presentar' || acc === 'morir') return;
  if (acc === 'lanzar') {
    // conjura empujando el escudo al frente, a la altura del pecho (nunca por encima del hombro)
    if (p.manoI && mano === 'escudo') p.manoI = [Math.min(p.manoI[0], 15), -4.5, Math.min(p.manoI[2], 37)];
    return;
  }
  delete p.manoI; delete p.codoI;
  // el brazo acompaña el paso (adelante cuando la pierna derecha va atrás), corto: el escudo pesa y el objeto se cuida;
  // el antebrazo llega un poco después y todo sube y baja con cada pisada
  const gi = mano === 'escudo' ? 24 : 14, br = Math.cos((u - 0.06) * TAU), br2 = Math.cos((u - 0.14) * TAU), pis = Math.sin((u - 0.1) * 2 * TAU), resp = p.respira ?? 0;
  const ob = mano === 'objeto';
  if (acc === 'quieto') p.hombroI = ob ? [12 + resp * 1.5, 14, 62 + resp * 3, gi] : [20 + resp * 1.5, 14, 72 + resp * 2, gi];
  else if (acc === 'caminar') p.hombroI = ob ? [12 + br * 6, 14, 62 + br2 * 4 + pis, gi] : [20 + br * 4, 14, 74 + br2 * 3 + pis, gi];
  else if (acc === 'correr') p.hombroI = ob ? [16 + br * 9, 15, 74 + br2 * 5 + 1.5 * pis, gi] : [24 + br * 6, 15, 80 + br2 * 4 + 1.5 * pis, gi];
  else if (acc === 'atacar') p.hombroI = [24 + p.giroTorso * 0.25, 16, 74 - p.giroTorso * 0.2, gi];
  else if (acc === 'herido') p.hombroI = [16 - p.torso * 0.4, 18 + (p.ladeo ?? 0), 72, gi - 4];
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mod1 = (v: number) => ((v % 1) + 1) % 1;
const grados = (r: number) => (r * 180) / Math.PI;
const rad = (g: number) => (g * Math.PI) / 180;

// ------------------------------------------------------------------ cuadros clave
/**
 * Animación por cuadros clave, como a mano: cada clave fija algunos valores en un tiempo del ciclo (0..1) y los que no
 * fija siguen como venían. Entre claves se interpola con curvas de Hermite (Catmull-Rom): los movimientos salen en arco
 * y con entrada y salida suaves. Una clave `plano` es un extremo: llega frenando y sale acelerando (anticipación,
 * contacto, pose sostenida). El ciclo cierra: la última clave empalma con la primera sin salto.
 */
type Valor = number | number[];
type Vals = { [K in keyof Pose]?: Pose[K] extends number | undefined ? number : Pose[K] extends number[] | undefined ? number[] : never };
interface Clave { t: number; v: Vals; plano?: boolean }
const K = (t: number, v: Vals, plano = false): Clave => ({ t, v, plano });
function animar(cl: Clave[], u: number): Record<string, Valor> {
  const n = cl.length;
  const campos = new Set<string>();
  for (const c of cl) for (const k of Object.keys(c.v)) campos.add(k);
  const val = (j: number, k: string): Valor => {
    for (let d = 0; d < n; d++) { const c = cl[(((j - d) % n) + n) % n]; const v = (c.v as Record<string, Valor>)[k]; if (v !== undefined) return v; }
    return 0;
  };
  const tiempo = (j: number) => cl[((j % n) + n) % n].t + Math.floor(j / n);
  u = mod1(u);
  let i = n - 1, x = u;
  if (u < cl[0].t) x = u + 1;
  else for (let j = 0; j < n; j++) if (cl[j].t <= u) i = j;
  const t0 = tiempo(i), t1 = tiempo(i + 1), tp = tiempo(i - 1), tn = tiempo(i + 2);
  const h = t1 - t0, s = clamp((x - t0) / h, 0, 1);
  const s2 = s * s, s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
  const pl0 = cl[((i % n) + n) % n].plano, pl1 = cl[(((i + 1) % n) + n) % n].plano;
  const herm = (a: number, b: number, c: number, d: number) => {
    const m0 = pl0 ? 0 : ((c - a) / (t1 - tp)) * h, m1 = pl1 ? 0 : ((d - b) / (tn - t0)) * h;
    return h00 * b + h10 * m0 + h01 * c + h11 * m1;
  };
  const out: Record<string, Valor> = {};
  for (const k of campos) {
    const a = val(i - 1, k), b = val(i, k), c = val(i + 1, k), d = val(i + 2, k);
    if (typeof b === 'number') out[k] = herm(a as number, b, c as number, d as number);
    else out[k] = b.map((_, e) => herm((a as number[])[e] ?? b[e], b[e], (c as number[])[e] ?? b[e], (d as number[])[e] ?? b[e]));
  }
  return out;
}
const CAB = ['cabeza', 'giroCabeza', 'ladeoCabeza'] as const;
const ARMA = ['armaD', 'munecaD', 'vara'] as const;
/**
 * Aplica las claves con acción superpuesta: la cabeza llega un poco tarde (lagCab), el arma se arrastra (lagArma) y la
 * capa y el pelo siguen la inercia del pecho (si el pecho baja de golpe, la tela se levanta; si gira, la tela se queda).
 */
function actuar(p: Pose, cl: Clave[], u: number, o: { lagCab?: number; lagArma?: number; capa?: number; pelo?: number; tela?: number } = {}) {
  Object.assign(p, animar(cl, u));
  const c = animar(cl, u - (o.lagCab ?? 0.03));
  for (const k of CAB) if (c[k] !== undefined) (p as unknown as Record<string, Valor>)[k] = c[k];
  if (o.lagArma) { const a = animar(cl, u - o.lagArma); for (const k of ARMA) if (a[k] !== undefined) (p as unknown as Record<string, Valor>)[k] = a[k]; }
  const pecho = (q: number) => {
    const a = animar(cl, q) as Record<string, number>;
    const t = ((a.torso ?? p.torso) * Math.PI) / 180, l = ((a.ladeo ?? 0) * Math.PI) / 180;
    return [(a.avanza ?? 0) + Math.sin(t) * 17, (a.lateral ?? 0) + Math.sin(l) * 17, -(a.bajar ?? 0) + Math.cos(t) * 17, a.giroTorso ?? 0];
  };
  const tela = o.tela ?? 1;
  const arrastre = (lag: number, k: number): [number, number] => {
    const a = pecho(u - lag), b = pecho(u - lag - 0.07);
    const v = a.map((x, i) => x - b[i]);
    return [clamp((v[0] * 0.55 - v[2] * 0.5) * k * tela, -2.5, 4.5), clamp((-v[1] * 0.6 + v[3] * 0.06) * k * tela, -3, 3)];
  };
  const ca = arrastre(0.02, 1), pe = arrastre(0.04, 0.7);
  p.capa = [(o.capa ?? 0.8) + ca[0], ca[1]];
  p.pelo = [(o.pelo ?? 0) + pe[0], pe[1]];
}
/** Pies plantados en el piso: adelante/atrás, separación al costado y punta afuera. */
function plantar(p: Pose, pasos: [number, number], abre: [number, number], pieGiro: [number, number] = [10, 10]) {
  p.plantado = true; p.pasos = pasos; p.abre = abre; p.pieGiro = pieGiro;
  // para quien dibuje con ángulos (figura): el muslo que pone el pie ahí
  const ang = (x: number): [number, number] => [grados(Math.asin(clamp(x / 27, -1, 1))), 6];
  p.caderaD = ang(pasos[0]); p.caderaI = ang(pasos[1]);
}
/** La cabeza mira a un punto del cuerpo (adelante, derecha, alto): giro y cabeceo sobre el torso, mezclado con `k`. */
function mirar(p: Pose, q: [number, number, number], k = 1) {
  const t = (p.torso * Math.PI) / 180, zc = 31 - p.bajar;
  const cf = (p.avanza ?? 0) + Math.sin(t) * 22, cz = zc + Math.cos(t) * 22, cr = p.lateral ?? 0;
  const dx = q[0] - cf, dy = q[1] - cr, dz = q[2] - cz;
  const giro = grados(Math.atan2(dy, Math.max(1, dx))), alto = grados(Math.atan2(dz, Math.hypot(dx, dy)));
  p.giroCabeza = lerp(p.giroCabeza ?? 0, clamp(giro - p.giroTorso, -55, 55), k);
  p.cabeza = lerp(p.cabeza, clamp(-alto - p.torso, -38, 34), k);
}

// ------------------------------------------------------------------ quieto: respira, pasa el peso, mira
function quieto(p: Pose, u: number, arma: ArmaPose, estilo?: Presentacion) {
  // 4 cuadros: inspira (0 → 1) y espira; la cabeza y el arma van un cuarto de ciclo atrasados
  const k = 0.5 - 0.5 * Math.cos(u * TAU), k2 = Math.sin(u * TAU);
  plantar(p, [-1.4, 2.2], [0.7, 1.5], [12, 18]);
  // contrapposto: el peso en la pierna derecha (cadera derecha arriba), los hombros compensan
  p.bajar = 1 - 0.5 * k; p.torso = 4 - 1.5 * k; p.respira = k; p.hombros = [0.8 * k, 0.7 * k];
  p.lateral = 0.75 + 0.15 * k; p.ladeoCadera = 2.4 + 0.3 * k; p.ladeo = -1.4 - 0.5 * k; p.giroCadera = -5; p.giroTorso = 3 + k;
  p.cabeza = 1.5 - 2 * k; p.giroCabeza = -4 + 3 * k2; p.ladeoCabeza = 2 - 1.2 * k;
  // (los brazos caen cerca del cuerpo y el pecho va arriba: con los brazos abiertos y el torso echado adelante el reposo
  // se leía encorvado, de gorila)
  p.torso = 2 - 1.5 * k; p.cabeza = -1 - 2 * k;
  p.hombroD = [8 + 3 * k, 7, 20 + 5 * k, 8]; p.hombroI = [6 - 2 * k, 7, 16 + 4 * k, 10];
  p.munecaD = 3 * k2;
  p.capa = [0.7 + 0.2 * k, 0.3 * k2]; p.pelo = [0.2 * k, 0.2 * k2];
  // a dos manos: el arma descansa al hombro; el puño derecho delante del pecho, cerca del regatón, el mango apoya
  // sobre el borde de afuera del hombro derecho y la cabeza queda atrás, lejos de la cara; la izquierda suelta. (Con el
  // mango cruzado bajo, delante de la ingle, el regatón asomaba entre las piernas.)
  // el arma se lleva igual que al andar (mismo porte, sin vaivén): al arrancar a caminar no cambia de postura
  if (arma === 'dos') porteDosManos(p, 0, k, k2, 0, 0);
  if (arma === 'una') porteUna(p, 0, k, k2, 0, 0, estilo);
  if (arma === 'ballesta') { p.hombroD = [26 + 3 * k, 10, 60 + 4 * k, 0]; }
  // el arco cuelga natural de la izquierda, la cuerda recta; la derecha descansa
  if (arma === 'arco') { p.hombroI = [16 + 1.5 * k, 22, 18 + 2 * k, 0]; p.hombroD = [12 + 3 * k, 12, 26 + 5 * k, 8]; p.giroTorso = 5 + k; p.giroCadera = -2; p.tensa = false; }
  // la vara al costado y apenas atrás, con el remate afuera de la silueta de la cabeza (en diagonal, so y o, la vara
  // adelantada quedaba alineada con la cara y el remate la tapaba)
  if (arma === 'baculo') { p.hombroD = [6 + 2 * k, 24, 56 + 3 * k, 0]; p.vara = [-4 + 1.5 * k2, 10]; }
  if (arma === 'garras' || arma === 'nada') { p.hombroD = [16 + 3 * k, 14, 44 + 5 * k, 12]; p.hombroI = [14 + 2 * k, 14, 48 + 4 * k, 14]; }
  // la respiración de cada clase (8 cuadros): cuánto se mueve el cuerpo al inspirar y hacia dónde va el peso
  switch (estilo) {
    case 'rugido': {
      // jadea encorvado: inspira rápido (los hombros suben, el pecho se levanta) y suelta el aire despacio; los brazos
      // cuelgan pesados y un poco abiertos
      const j = jadeo(u);
      p.bajar = 3.4 - 0.9 * j; p.torso = 13 - 3 * j; p.cabeza = -8 + 3.5 * j; p.respira = 0.1 + 0.9 * j;
      p.hombros = [1.2 + 1.5 * j, 1.1 + 1.5 * j];
      p.pasos = [-2.6, 3]; p.abre = [2.6, 2.4]; p.lateral = 0.3 + 0.25 * j; p.ladeoCadera = 1.5; p.ladeo = -1 - 0.6 * j;
      // el hacha baja y atrás junto a la cadera, como al andar (no cambia de postura al arrancar)
      p.hombroI = [8 + 3 * j, 16, 20 + 6 * j, 10];
      if (arma === 'una') porteBerserker(p, 0, j, k2, 0, 0);
      else if (arma === 'dos') porteDosManos(p, 0, j, k2, 0, 0, true);
      else p.hombroD = [10 + 4 * j, 16, 22 + 6 * j, 6];
      p.capa = [0.9 + 0.4 * j, 0.2 * k2]; p.pelo = [0.5 * j, 0.3 * k2];
      break;
    }
    case 'guardia': {
      // erguido y firme: el escudo adelante (brazoEscudo), la espada lista abajo y adelante, el peso al centro y la
      // mirada que barre despacio
      p.torso = 1.5 - 1 * k; p.bajar = 1.4 - 0.4 * k; p.lateral = 0.3 + 0.1 * k; p.ladeo = -0.6 - 0.3 * k; p.ladeoCadera = 1.2;
      p.pasos = [-2.4, 2.6]; p.abre = [1.4, 1.2]; p.pieGiro = [18, 8]; p.giroCadera = -2; p.giroTorso = 4 + k;
      p.cabeza = -1 - 1.5 * k; p.giroCabeza = -6 + 7 * k2;
      break;
    }
    case 'conjuro': {
      // flota casi en puntas de pie: los talones arriba, el cuerpo sube con cada inspiración y la mano libre, abierta,
      // se mece en el aire
      p.puntillas = [0.45 + 0.15 * k, 0.45 + 0.15 * k]; p.bajar = 0.6 - 0.8 * k; p.torso = 1 - 1.2 * k;
      p.lateral = 0.8 + 0.2 * k; p.ladeoCadera = 2.8; p.ladeo = -1.6 - 0.6 * k; p.ladeoCabeza = 3 - 1.5 * k; p.abre = [0.4, 0.9]; p.pasos = [-0.8, 1.6];
      if (arma !== 'baculo') p.hombroI = [16 + 3 * k, 22 + 2 * k2, 30 + 6 * k, 6];
      p.pelo = [0.4 + 0.3 * k, 0.4 * k2]; p.capa = [0.9 + 0.3 * k, 0.4 * k2];
      break;
    }
    case 'apunta': {
      // liviana y atenta: el peso en la pierna de atrás, un poco agazapada, la cabeza que escucha a los costados
      p.bajar = 1.2 - 0.4 * k; p.torso = 1 - 1.2 * k; p.giroTorso = 9 + k; p.giroCabeza = -10 + 9 * Math.sin(u * TAU + 0.6); p.cabeza = 1 - 1.5 * k;
      p.lateral = 0.9 + 0.15 * k; p.ladeoCadera = 2.8;
      break;
    }
    case 'invoca': {
      // alto y enjuto, apenas inclinado, quieto como una estatua (sin encoger los hombros: encogido se leía macizo);
      // respira lento y la mano libre, en garra, sube un poco con el aire
      p.torso += 5; p.cabeza -= 3; p.hombros = [0.35 + 0.3 * k, 0.55 + 0.3 * k]; p.bajar += 0.4;
      if (arma !== 'dos' && arma !== 'baculo') p.hombroI = [22 + 3 * k, 12, 58 + 6 * k, 20];
      break;
    }
    case 'naturaleza': p.giroCabeza = -6 + 6 * k2; p.cabeza -= 2 * k; break;
    case 'frasco': {
      // nerviosa: el peso cambia de pierna dos veces por ciclo, los hombros arriba y la cabeza que mira a los lados a tirones
      const n2 = Math.sin(u * 2 * TAU), mira = Math.sign(Math.sin(u * TAU + 0.4)) * Math.min(1, Math.abs(Math.sin(u * TAU + 0.4)) * 3);
      p.lateral = 0.6 * n2; p.ladeoCadera = 2 * n2; p.ladeo = -1.2 * n2; p.hombros = [0.7 + 0.3 * k, 0.6 + 0.3 * k];
      p.giroCabeza = -4 + 16 * mira; p.ladeoCabeza = 4 - 2 * k; p.giroTorso = 3 + 2 * n2;
      break;
    }
  }
}
/** Jadeo: inspira rápido (el primer tercio del ciclo) y suelta el aire despacio. */
function jadeo(u: number) { u = mod1(u); return u < 0.3 ? Math.sin((Math.PI / 2) * (u / 0.3)) : 0.5 + 0.5 * Math.cos((Math.PI * (u - 0.3)) / 0.7); }

// ------------------------------------------------------------------ caminar y correr
function marcha(p: Pose, u: number, correr: boolean, arma: ArmaPose, estilo?: Presentacion, porte?: Porte) {
  const amp = ampDe(estilo, correr);
  const pm = (q: number) => piernaMarcha(q, correr, amp);
  p.caderaD = pm(u); p.caderaI = pm(u + 0.5);
  p.suelo = true;
  const ap = correr ? APOYO.correr : APOYO.caminar;
  // el pie que apoya: 1 a mitad del apoyo; la cadera del pie en el aire cae y el peso pasa al que apoya
  const apoyo = (q: number) => { q = mod1(q); return q < ap ? Math.sin((Math.PI * q) / ap) : 0; };
  const peso = (q: number) => apoyo(q) - apoyo(q + 0.5);
  const dif = (q: number) => (pm(q)[0] - pm(q + 0.5)[0]) / (50 * amp); // +1: la derecha adelante
  // la pelvis gira con la pierna que avanza; los hombros al revés, un poco atrasados (la columna se tuerce)
  p.giroCadera = -dif(u) * (correr ? 8 : 6);
  p.giroTorso = dif(u - 0.04) * (correr ? 12 : 7);
  p.ladeoCadera = peso(u) * (correr ? 2.2 : 3);
  p.lateral = peso(u - 0.03) * (correr ? 0.45 : 0.7);
  p.ladeo = -peso(u - 0.06) * (correr ? 1.2 : 1.6);
  p.torso = correr ? 15 : 5;
  // la cabeza se queda estable mirando al frente: compensa el giro y el ladeo del torso
  p.giroCabeza = -p.giroTorso * 0.85; p.ladeoCabeza = -(p.ladeo ?? 0) * 0.8; p.cabeza = correr ? -9 : -2;
  p.respira = correr ? 0.5 + 0.5 * Math.sin(u * 2 * TAU) : 0.3;
  // brazos: cada uno con la pierna contraria, atrasados; el antebrazo llega más tarde todavía y el codo nunca queda recto
  const lim = (v: number) => clamp(v, -38, 40);
  const vaiv = (q: number) => -pm(q)[0] * (correr ? 1.4 : 0.8) / amp;
  // (vaiv(q) es el muslo derecho cambiado de signo: el brazo derecho va adelante cuando la pierna derecha va atrás.
  // Antes estaban cruzados y cada brazo iba con la pierna de su mismo lado, como en la ambladura.)
  const sD = lim(vaiv(u - 0.05)), sI = lim(vaiv(u + 0.5 - 0.05));
  const cD = lim(vaiv(u - 0.11)), cI = lim(vaiv(u + 0.5 - 0.11));
  // el brazo libre bombea con el codo doblado: al correr entre 76° y 94° (la mano va del pecho, adelante a la altura del
  // esternón, a la cadera, atrás; nunca estirada al frente), al caminar suelto entre 18° y 32°
  const x = (v: number) => clamp(v / 40, -1, 1);
  if (correr) {
    p.hombroD = [34 * x(sD) + 4, 13, 85 + 9 * x(cD), 16]; p.hombroI = [34 * x(sI) + 4, 13, 85 + 9 * x(cI), 16];
    p.hombros = [0.3 + 0.3 * Math.sin((u - 0.1) * 2 * TAU), 0.3 + 0.3 * Math.sin((u - 0.1) * 2 * TAU)];
    const q = u % 0.5; p.vuelo = q > APOYO.correr ? Math.sin((Math.PI * (q - APOYO.correr)) / (0.5 - APOYO.correr)) * 2.2 : 0;
  } else {
    p.hombroD = [sD + 4, 9, 25 + 7 * x(cD), 10]; p.hombroI = [sI + 4, 9, 25 + 7 * x(cI), 10];
  }
  // la carrera: la cadera a una altura casi fija, más baja apenas a mitad del apoyo y más alta en el vuelo (no se hunde
  // como si se arrodillara)
  if (correr) {
    const q = mod1(u * 2), base = porte === 'bestia' ? 28.6 : 29;
    p.zCadera = base - 0.9 * Math.cos(TAU * (q - APOYO.correr));
    delete p.vuelo;
  }
  // la tela y el pelo se arrastran atrás y rebotan con cada pisada
  const rebote = Math.sin((u - 0.12) * 2 * TAU);
  p.capa = [(correr ? 4.4 : 2.6) + rebote * (correr ? 0.9 : 0.7), -peso(u - 0.14) * (correr ? 0.9 : 1.3)];
  p.pelo = [(correr ? 2.2 : 0.6) + rebote * 0.5, -peso(u - 0.16) * 0.8];
  const g = dif(u);
  // el vaivén del brazo que lleva un arma: el mismo compás que el brazo libre pero redondo (el arma pesa: no da el
  // latigazo de la pierna cuando pasa al frente). +1 = el brazo derecho adelante (la pierna derecha atrás)
  const suave = (q: number) => -Math.cos((q - 0.02) * TAU);
  // el andar de cada clase: el mismo ciclo de piernas (los pies no patinan) con otro cuerpo encima
  if (estilo) andarDeClase(p, u, correr, estilo, { sD, sI, cD, cI, g, peso, rebote });
  if (porte === 'bestia') andarDeBestia(p, u, correr, arma);
  // el arma de una mano cuelga adelante y abajo del puño: la muñeca compensa el vaivén del brazo (sin esto la hoja se
  // ponía horizontal al frente cuando el brazo iba adelante y caía de golpe en el cuadro siguiente)
  if (arma === 'una' && !correr && !estilo) p.munecaD = -(p.hombroD[0] - 4) * 0.8 - 14;
  // los héroes llevan el arma firme: el brazo del arma no bombea (codo recogido, muñeca firme), el arma oscila pocos
  // grados en todo el ciclo y al correr va como al caminar, apenas más recogida; el brazo libre es el que bombea
  if (portarArma(p, u, correr, arma, estilo, (lag, izq) => suave(u + (izq ? 0.5 : 0) - lag))) return;
  // a dos manos: al hombro, como en quieto (el puño delante del pecho, la cabeza del arma atrás); la izquierda bracea
  if (arma === 'dos') {
    const zh = 40 - (estilo === 'rugido' ? 2.4 : 0), fw = estilo === 'rugido' ? 7 : 5;
    p.manoD = correr ? [fw + 3, 9.5, zh + Math.abs(rebote) * 0.6] : [fw, 8.5, zh + rebote * 0.4]; p.armaD = [(correr ? 52 : 50) + g * 3, 172]; p.pegaI = 0;
  }
  if (arma === 'ballesta') { p.hombroD = [30 + g * 4, 8, 50 + g * 3, 0]; p.hombroI = [36 + g * 4, 14, 58]; p.munecaD = g * 4; }
  // el arco va en la izquierda, bajo y vertical al costado; la derecha se balancea libre (la cuerda queda recta)
  if (arma === 'arco') { p.hombroI = [sI * (correr ? 0.35 : 0.3) + 2, 14, (correr ? 34 : 14) + Math.max(0, cI) * 0.3, 0]; p.tensa = false; }
  // la vara al costado y apenas atrás: el remate queda afuera de la silueta de la cabeza en todas las direcciones
  if (arma === 'baculo') { p.hombroD = [6 + sD * 0.3, 22, 55, 0]; p.vara = [-3 + sD * 0.15, 9]; }
}

/**
 * Cómo lleva el arma un héroe al caminar y al correr (devuelve true si se ocupó). El berserker la lleva baja y atrás, a
 * la altura de la cadera, con la cabeza del arma atrás y abajo (se siente el peso); las demás armas de una mano cuelgan
 * adelante y abajo junto al muslo; el arco queda quieto en la izquierda, la vara casi vertical al costado.
 */
function portarArma(p: Pose, u: number, correr: boolean, arma: ArmaPose, estilo?: Presentacion, br: (lag: number, izq?: boolean) => number = () => 0): boolean {
  // el brazo del arma bracea con la pierna contraria, menos que el libre (el arma pesa); el antebrazo llega después y el
  // arma, sujeta al antebrazo (armaRel), después todavía: la cabeza del arma se atrasa cuando el brazo cambia de sentido
  const c = (v: number) => clamp(v, -1.3, 1.3);
  const b0 = c(br(0.05)), b1 = c(br(0.12)), b2 = c(br(0.2)), pis = Math.sin((u - 0.1) * 2 * TAU), m = correr ? 2 : 1;
  if (estilo === 'rugido' && arma === 'una') { porteBerserker(p, m, b0, b1, b2, pis); return true; }
  if (arma === 'dos') { porteDosManos(p, m, b0, b1, b2, pis, estilo === 'rugido'); return true; }
  if (arma === 'una') { porteUna(p, m, b0, b1, b2, pis, estilo); return true; }
  if (arma === 'garras' && !estilo) {
    // las garras apuntan adelante y abajo, firmes: el puño no gira con cada paso
    const sw = Math.sin((u - 0.1) * TAU);
    p.armaD = correr ? [112 + 2 * sw, 0] : [118 + 2 * sw, 0];
    return false;
  }
  if (arma === 'ballesta') {
    // la ballesta cruzada adelante a dos manos, la culata junto a la cadera derecha: sube y baja con cada pisada y se
    // mece apenas con los hombros (no bracea: va apuntando)
    p.manoD = correr ? [10 + 0.9 * b0, 8.5, 38 + 0.7 * pis] : [9 + 0.7 * b0, 8.5, 36 + 0.4 * pis];
    p.armaD = correr ? [96 - 3 * b1 + 2 * pis, 4 - 4 * b0] : [102 - 2.5 * b1 + 1.5 * pis, 4 - 3 * b0];
    p.codoD = [-0.6, 0.55, -0.6]; delete p.munecaD;
    return true;
  }
  if (arma === 'arco') {
    // el arco en la izquierda, bajo y casi vertical: el brazo bracea corto con la pierna contraria y el arco lo acompaña
    const i0 = c(br(0.05, true)), i1 = c(br(0.12, true));
    p.hombroI = correr ? [6 + 11 * i0, 14, 40 + 6 * i1, 0] : [3 + 8 * i0, 14, 18 + 5 * i1, 0]; p.tensa = false;
    return true;
  }
  if (arma === 'baculo') {
    // la vara en la derecha, casi vertical: la mano bracea corto y la vara se mece con ella (el pie de la vara va y viene)
    delete p.manoD; delete p.codoD;
    p.hombroD = correr ? [14 + 9 * b0, 17, 62 + 5 * b1, 0] : [10 + 7 * b0, 17, 50 + 4 * b1, 0];
    p.vara = correr ? [9 + 5 * b1 + 1.5 * pis, 8] : [2 + 4.5 * b1 + pis, 9];
    return true;
  }
  return false;
}

/**
 * El hacha de una mano del berserker: baja y lista junto a la cadera, el codo doblado y la cabeza del hacha adelante y
 * apenas arriba, abierta hacia afuera. `m` 0 quieto, 1 caminar, 2 correr; b0, b1, b2 el vaivén del brazo (-1..1) cada vez
 * más atrasado (hombro, codo, muñeca); `pis` el golpe de cada pisada.
 */
function porteBerserker(p: Pose, m: number, b0: number, b1: number, b2: number, pis: number) {
  delete p.manoD; delete p.codoD; delete p.armaD; delete p.munecaD; p.pegaI = 0;
  if (m === 2) { p.hombroD = [-8 + 17 * b0, 15, 70 + 9 * b1, 6]; p.armaRel = [66 - 10 * (b2 - b0) + 2.5 * pis, 20]; }
  else if (m === 1) { p.hombroD = [-6 + 12 * b0, 13, 38 + 7 * b1, 6]; p.armaRel = [56 - 8 * (b2 - b0) + 1.5 * pis, 18]; }
  else { p.hombroD = [-5 + 2 * b0, 13, 34 + 4 * b0, 6]; p.armaRel = [56 + 3 * b1, 18]; }
}
/**
 * El arma de una mano de los demás (espada, maza, daga): guardia baja, el codo apenas doblado y la punta adelante y
 * abajo; al correr el codo se recoge y la punta sube adelante. El templario la lleva más quieta (disciplina).
 */
function porteUna(p: Pose, m: number, b0: number, b1: number, b2: number, pis: number, estilo?: Presentacion) {
  delete p.manoD; delete p.codoD; delete p.armaD; delete p.munecaD;
  const k = estilo === 'guardia' ? 0.7 : estilo === 'invoca' ? 0.6 : 1;
  if (m === 2) { p.hombroD = [-6 + 15 * k * b0, 12, 56 + 8 * k * b1, 6]; p.armaRel = [44 - 9 * k * (b2 - b0) + 2 * pis, 12]; }
  else if (m === 1) { p.hombroD = [-4 + 11 * k * b0, 11, 28 + 6 * k * b1, 6]; p.armaRel = [40 - 7 * k * (b2 - b0) + 1.2 * pis, 10]; }
  else { p.hombroD = [-2 + 2 * b0, 11, 26 + 4 * b0, 6]; p.armaRel = [40 + 2.5 * b1, 10]; }
}
/**
 * El arma a dos manos (hacha doble, mandoble, martillo, guadaña): al hombro. El puño derecho delante del pecho, el mango
 * apoyado sobre el hombro derecho y la cabeza del arma atrás y arriba, lejos de la cara; la izquierda queda libre y
 * bracea. Va sujeta al brazo y al torso: gira y se inclina con él, y la cabeza del arma rebota con cada pisada.
 */
function porteDosManos(p: Pose, m: number, b0: number, b1: number, b2: number, pis: number, bruto = false) {
  delete p.manoD; delete p.codoD; delete p.armaD; delete p.munecaD;
  p.pegaI = 0;
  const k = bruto ? 1.2 : 1;
  const [A, B, C, D, E] = PORTE_HOMBRO;
  if (m === 2) { p.hombroD = [A + 4 + 3 * k * b0 + 1.5 * pis, B, C - 2 + 3 * k * b1, 0]; p.armaRel = [D + 2 - 3 * k * (b2 - b0) + 4 * k * pis, E]; }
  else if (m === 1) { p.hombroD = [A + 1 + 2.5 * k * b0 + pis, B, C + 2 * k * b1, 0]; p.armaRel = [D + 1 - 2 * k * (b2 - b0) + 3 * k * pis, E]; }
  else { p.hombroD = [A + 1.5 * b0, B, C + 2 * b0, 0]; p.armaRel = [D + 1.5 * b1, E]; }
}
/** El porte al hombro: brazo [adelante, afuera, codo] y arma [ángulo desde el antebrazo, giro hacia afuera]. */
const PORTE_HOMBRO: number[] = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.PORTE_HOMBRO?.split(',').map(Number) ?? [12, 10, 106, 120, 30];

/**
 * La bestia (necrófago, diablillo): anda y corre agachada y animal, el torso muy adelante, la cabeza arriba mirando la
 * presa, los brazos sueltos adelante con las garras abiertas; las garras apuntan adelante y abajo, firmes.
 */
function andarDeBestia(p: Pose, u: number, correr: boolean, arma: ArmaPose) {
  // (el brazo derecho adelante cuando la pierna derecha va atrás)
  const x = -Math.cos((u - 0.08) * TAU);
  p.torso += correr ? 20 : 13; p.cabeza -= correr ? 22 : 15; p.hombros = [0.9, 0.9];
  p.giroTorso *= 1.3; p.giroCabeza = -p.giroTorso * 0.9;
  if (correr) { p.hombroD = [30 + 18 * x, 18, 84 + 8 * x, 8]; p.hombroI = [30 - 18 * x, 18, 84 - 8 * x, 8]; }
  else { p.hombroD = [22 + 14 * x, 16, 26 + 6 * x, 8]; p.hombroI = [22 - 14 * x, 16, 26 - 6 * x, 8]; }
  if (arma === 'garras') p.armaD = correr ? [112 + 2 * x, 0] : [118 + 2 * x, 0];
  p.capa = [(p.capa?.[0] ?? 2) + 1, p.capa?.[1] ?? 0];
}

/**
 * El cuerpo de cada clase sobre el mismo paso. Berserker: zancada larga y baja, el torso adelante, los hombros cargados y
 * un vaivén grande de hombros y brazos. Templario: erguido, paso medido, el brazo de la espada casi quieto. Arcanista:
 * erguida y liviana, las manos un poco abiertas. Cazadora: paso felino (un pie delante del otro), la cadera se mece, la
 * cabeza baja y quieta. Nigromante: lento y ceremonial, encorvado, la mano libre delante del vientre. Alquimista:
 * nerviosa, hombros arriba y la cabeza que mira a los lados a tirones.
 */
function andarDeClase(p: Pose, u: number, correr: boolean, estilo: Presentacion, m: { sD: number; sI: number; cD: number; cI: number; g: number; peso: (q: number) => number; rebote: number }) {
  const { sD, sI, cD, cI, rebote } = m;
  switch (estilo) {
    case 'rugido': {
      p.torso += correr ? 6 : 7; p.cabeza -= correr ? 5 : 6;
      p.giroTorso *= 1.6; p.giroCadera = (p.giroCadera ?? 0) * 1.3; p.ladeo = (p.ladeo ?? 0) * 1.4;
      p.giroCabeza = -p.giroTorso * 0.8;
      const h = correr ? 0.9 : 1.1;
      p.hombros = [h + 0.35 * Math.sin((u - 0.1) * 2 * TAU), h + 0.35 * Math.sin((u - 0.1) * 2 * TAU)];
      p.respira = correr ? 0.6 + 0.4 * Math.sin(u * 2 * TAU) : 0.45 + 0.25 * Math.sin(u * 2 * TAU);
      const x = (v: number) => clamp(v / 40, -1, 1);
      if (correr) { p.hombroD = [38 * x(sD) + 8, 17, 85 + 9 * x(cD), 14]; p.hombroI = [38 * x(sI) + 8, 17, 85 + 9 * x(cI), 14]; }
      else { p.hombroD = [sD * 1.25 + 6, 15, 27 + 6 * x(cD), 8]; p.hombroI = [sI * 1.25 + 6, 15, 27 + 6 * x(cI), 8]; }
      p.capa = [(p.capa?.[0] ?? 2) * 1.15, (p.capa?.[1] ?? 0) * 1.3]; p.pelo = [(p.pelo?.[0] ?? 0) + 0.6, (p.pelo?.[1] ?? 0) * 1.4];
      break;
    }
    case 'guardia': {
      p.torso -= correr ? 2 : 2.5; p.cabeza = correr ? -6 : 0;
      p.giroTorso *= 0.6; p.ladeo = (p.ladeo ?? 0) * 0.6; p.giroCabeza = -p.giroTorso * 0.9;
      // la espada casi quieta, adelante y abajo (lista); el escudo lo sostiene brazoEscudo
      p.hombroD = correr ? [sD * 0.6 + 14, 12, 70, 12] : [sD * 0.45 + 10, 11, 28 + Math.max(0, cD) * 0.4, 8];
      p.capa = [(p.capa?.[0] ?? 2) * 0.9, (p.capa?.[1] ?? 0) * 0.7];
      break;
    }
    case 'conjuro': {
      p.torso -= correr ? 3 : 4; p.cabeza = correr ? -7 : 0; p.giroTorso *= 0.55; p.giroCabeza = -p.giroTorso * 0.9;
      p.ladeoCadera = (p.ladeoCadera ?? 0) * 1.2;
      // las manos un poco abiertas, adelante y afuera: se deslizan más que bracean
      if (!correr) p.hombroI = [sI * 0.45 + 10, 20, 27 + 5 * clamp(cI / 40, -1, 1), 6];
      p.capa = [(p.capa?.[0] ?? 2) * 1.1, (p.capa?.[1] ?? 0) * 1.2]; p.pelo = [(p.pelo?.[0] ?? 0) + 0.5, (p.pelo?.[1] ?? 0) * 1.3];
      break;
    }
    case 'apunta': {
      // paso felino: los pies pisan cerca de la línea del centro, la cadera se mece y el cuerpo va un poco agazapado
      p.abre = [-1.1, -1.1];
      p.torso += correr ? 2 : 3; p.cabeza -= 2;
      p.giroCadera = (p.giroCadera ?? 0) * 1.35; p.ladeoCadera = (p.ladeoCadera ?? 0) * 1.35; p.lateral = (p.lateral ?? 0) * 1.3;
      p.giroCabeza = -p.giroTorso * 0.95; p.ladeoCabeza = -(p.ladeo ?? 0) * 0.95;
      p.pelo = [(p.pelo?.[0] ?? 0) + 0.4, (p.pelo?.[1] ?? 0) * 1.5];
      break;
    }
    case 'invoca': {
      // lento y ceremonial: encorvado, la cabeza quieta, la mano libre recogida delante del vientre y el arma colgando
      p.torso += correr ? 4 : 6; p.cabeza = correr ? -12 : -5; p.giroTorso *= 0.4; p.ladeo = (p.ladeo ?? 0) * 0.5;
      p.giroCabeza = -p.giroTorso; p.ladeoCabeza = -(p.ladeo ?? 0);
      p.hombros = [0.5, 0.7];
      if (!correr) { p.hombroI = [12 + sI * 0.2, 12, 30, 14]; p.hombroD = [sD * 0.35 + 5, 10, 22 + Math.max(0, cD) * 0.3, 8]; }
      p.capa = [(p.capa?.[0] ?? 2) * 0.85 + 0.3, (p.capa?.[1] ?? 0) * 0.6];
      break;
    }
    case 'frasco': {
      // nerviosa: hombros arriba, el torso más tieso y la cabeza que mira a los lados a tirones (dos veces por ciclo)
      p.torso += 1.5; p.hombros = [0.7 + 0.2 * rebote, 0.7 + 0.2 * rebote];
      const tiron = (q: number) => { const x = mod1(q); return x < 0.15 ? Math.sin((Math.PI / 2) * (x / 0.15)) : x < 0.45 ? 1 : x < 0.6 ? Math.cos((Math.PI / 2) * ((x - 0.45) / 0.15)) : 0; };
      p.giroCabeza = -p.giroTorso * 0.85 + (tiron(u) - tiron(u + 0.5)) * (correr ? 10 : 18);
      if (!correr) p.hombroI = [sI * 0.8 + 6, 11, 27 + 6 * clamp(cI / 40, -1, 1), 12];
      break;
    }
  }
}

// ------------------------------------------------------------------ presentar: la actuación de cada clase (16 cuadros)
function presentar(p: Pose, u: number, arma: ArmaPose, estilo: Presentacion, mano?: ManoPose) {
  const dosM = arma === 'dos' || arma === 'ballesta';
  switch (estilo) {
    case 'rugido': {
      // jadea encorvado (dos respiraciones); se hunde, sube el hacha con los dos brazos por encima de la cabeza, ruge al
      // cielo con el pecho inflado, la descarga adelante y la clava en el piso (polvo) y vuelve a descansar.
      // Las dos manos van SIEMPRE cerradas sobre el mango (ningún cuadro con la izquierda viajando por delante de la
      // cara): la derecha en el cabo y la izquierda bien separada del lado de la cabeza del hacha (agarre negativo), con
      // el codo izquierdo afuera; así las manos nunca se cruzan ni se apilan y cada brazo va por su lado.
      // La gran hacha descansa apoyada: la cabeza en el piso y los dos puños en el mango (la izquierda más abajo). El
      // hacha de una mano es corta para apoyarse (el puño bajaría a la rodilla con el brazo colgando): descansa en
      // guardia, cruzada delante del cuerpo con la cabeza arriba a la izquierda y las dos manos en el mango.
      plantar(p, [-3, 2.6], [2.6, 2.4], [24, 12]);
      const una = arma !== 'dos';
      const ag = una ? -5.5 : -7, agArriba = una ? -6 : -11;
      p.agarreI = ag; p.pegaI = 1; p.poloI = [-0.3, -1, -0.35];
      // en reposo: cuánto se hunde, se encorva y levanta la cara. El puño derecho va bien adelante y al costado derecho
      // (apoyado, en guardia y al clavar el hacha): el cabo del mango, detrás del puño, nunca queda delante de la
      // entrepierna, ni en el cuerpo ni en la pantalla ('so' y 's'); el cuerpo se encorva lo justo para que la izquierda
      // llegue a su lugar en el mango
      const [b0, t0, c0] = una ? [2.6, 8, -10] : [7, 34, -20];
      const apoyado: Vals = una
        ? { agarreI: ag, bajar: b0, torso: t0, ladeo: -1, giroTorso: 4, giroCadera: 2, lateral: -0.3, ladeoCadera: -1, cabeza: c0, giroCabeza: -4, ladeoCabeza: 0, manoD: [16, 3, 36], armaD: [70, -80], pisoArma: 0 }
        : { agarreI: ag, bajar: b0, torso: t0, ladeo: -2, giroTorso: 4, giroCadera: 2, lateral: -0.3, ladeoCadera: -1, cabeza: c0, giroCabeza: -4, ladeoCabeza: 0, manoD: [17, 4, 32], armaD: [160, -4], pisoArma: 1 };
      // el hacha sube cruzada delante del pecho (la cabeza arriba a la izquierda, la derecha en la cadera) y de ahí se alza
      // atravesada sobre la cabeza, los brazos en V y los puños abiertos en el mango (la cabeza del hacha a la izquierda,
      // un poco más alta): los puños quedan por encima de la coronilla, nunca delante de la cara
      const sube: Vals = { agarreI: ag, manoD: [una ? 16 : 20, una ? 3 : 6.5, una ? 36 : 38], armaD: [una ? 62 : 50, -72] };
      const arriba: Vals = { agarreI: agArriba, manoD: [-4.5, 6.5, 66], armaD: [76, -90] };
      const cumbre: Vals = { agarreI: agArriba, manoD: [-5, 6.5, 66.5], armaD: [72, -90] };
      const cl: Clave[] = [
        K(0, { ...apoyado, respira: 0.15, hombros: [1.6, 1.4] }),
        K(0.08, { respira: 0.95, hombros: [2.4, 2.2], torso: t0 - 2, cabeza: c0 - 2 }),
        K(0.16, { respira: 0.05, hombros: [1.4, 1.2], bajar: b0 + 0.8, torso: t0 + 4, cabeza: c0 + 2 }, true),
        K(0.3, { bajar: 2, torso: 6, ladeo: 1, giroTorso: 2, lateral: 0.3, ladeoCadera: 1, respira: 0.6, hombros: [1.8, 1.8], cabeza: -14, ...sube, pisoArma: 0 }),
        // arriba ruge al cielo debajo del hacha, el cuerpo echado atrás y el pecho inflado
        K(0.37, { bajar: 1, torso: -10, ladeo: 2, giroTorso: 0, lateral: 0.6, ladeoCadera: 2, respira: 1, hombros: [2.6, 2.6], cabeza: -30, giroCabeza: 0, ladeoCabeza: 3, ...arriba }),
        K(0.5, { bajar: 0.8, torso: -13, cabeza: -34, ...cumbre }, true),
        K(0.56, { agarreI: ag, bajar: una ? 10 : 9, torso: una ? 40 : 36, ladeo: -3, giroTorso: 6, giroCadera: 4, lateral: -0.8, ladeoCadera: -2, respira: 0.3, hombros: [1, 1], cabeza: -12, ladeoCabeza: -1, manoD: [una ? 16 : 19, una ? 3 : 6, 30], armaD: [150, -4], pisoArma: 1 }),
        K(0.64, { bajar: una ? 9.5 : 8.5, torso: una ? 41.5 : 37.5, cabeza: -12, manoD: [una ? 14 : 17, una ? 3 : 6, 31], armaD: [158, -4], respira: 0.1 }, true),
      ];
      // el hacha corta sale del piso y vuelve a la guardia, cruzada delante del cuerpo
      if (una) cl.push(K(0.72, { bajar: 4.5, torso: 20, giroTorso: 5, cabeza: -10, manoD: [16, 5, 31], armaD: [100, -45], pisoArma: 0 }));
      cl.push(K(0.8, { ...apoyado, respira: 0.7, hombros: [2, 1.8] }), K(0.9, { respira: 0.1, hombros: [1.4, 1.2], torso: t0 + 1 }));
      actuar(p, cl, u, { lagCab: 0.035, capa: 1 });
      break;
    }
    case 'guardia': {
      // baja la espada atrás (anticipación), la sube en arco hasta el saludo con la guarnición ante el mentón, da el paso
      // a la guardia con el escudo al frente y respira firme; después la baja con aplomo
      plantar(p, [-3, 4], [1.6, 1.2], [28, 6]);
      actuar(p, [
        K(0, { bajar: 1.6, torso: 3, giroTorso: 6, giroCadera: 4, lateral: 0.2, ladeoCadera: 1, ladeo: -1, respira: 0.2, hombros: [0, 0], cabeza: 2, giroCabeza: -6, manoD: [9, 9.5, 27.5], armaD: [122, 18], manoI: [6, -7, 30] }),
        K(0.12, { bajar: 2.6, torso: 6, giroTorso: 12, lateral: 0.7, ladeoCadera: 2.5, manoD: [2, 12, 28.5], armaD: [152, 36], cabeza: 4 }, true),
        // la hoja sube en arco por el costado derecho (nunca barre por delante de la cara)
        K(0.22, { bajar: 1.6, torso: 1, giroTorso: 6, manoD: [6, 10, 36], armaD: [70, 60], cabeza: -1 }),
        // el saludo: la guarnición a la altura del mentón pero al costado derecho, la hoja vertical junto a la cara (no delante)
        K(0.3, { bajar: 0.6, torso: -3, giroTorso: 2, giroCadera: 2, lateral: 0, ladeoCadera: 0, ladeo: 0, respira: 1, hombros: [0.6, 0.5], cabeza: -5, giroCabeza: 0, manoD: [3, 12, 44], armaD: [-4, 16], manoI: [8, -7, 32] }),
        K(0.38, { bajar: 0.5, manoD: [3.5, 12, 45], armaD: [-8, 16] }, true),
        // en guardia la espada va adelante a la altura del pecho (por debajo del visor), junto al escudo
        K(0.5, { bajar: 3.2, torso: 8, giroTorso: 20, giroCadera: 10, lateral: -0.7, ladeoCadera: -2, ladeo: 1.5, respira: 0.3, hombros: [0.3, 0.3], cabeza: 2, giroCabeza: -16, manoD: [5, 9, 39], armaD: [68, -10], manoI: [12, -3, 37] }),
        K(0.64, { bajar: 2.8, respira: 0.9, hombros: [0.7, 0.6], manoD: [5, 9, 40], armaD: [64, -12], manoI: [12, -3, 38], cabeza: 0 }),
        K(0.78, { bajar: 3.3, respira: 0.1, hombros: [0.1, 0.1], manoD: [5, 9, 38.5], armaD: [70, -8], manoI: [12, -3, 36.5], cabeza: 2 }),
        K(0.9, { bajar: 2, torso: 4, giroTorso: 9, giroCadera: 5, lateral: 0, ladeoCadera: 0.5, ladeo: -0.5, respira: 0.3, cabeza: 2, giroCabeza: -8, manoD: [9, 9.5, 29], armaD: [112, 14], manoI: [7, -7, 31] }),
      ], u, { lagArma: 0.025, capa: 0.8 });
      break;
    }
    case 'conjuro': {
      // la mano libre baja (anticipación) y dibuja un sigilo: un círculo entero delante del cuerpo; se recoge y lo lanza
      // adelante subiendo en puntas de pie; el báculo se inclina al revés que la mano y su remate gira todo el tiempo
      plantar(p, [-0.6, 1.8], [0.5, 0.7], [12, 14]);
      // el sigilo se dibuja adelante y a la izquierda, a la altura del pecho: la mano nunca pasa por delante de la cara
      const cx = 14, cy = -6, cz = 37.5, r = 8.5;
      const sig = (th: number): [number, number, number] => [cx + Math.sin((th * Math.PI) / 180) * 1.2, cy - Math.sin((th * Math.PI) / 180) * r, cz - Math.cos((th * Math.PI) / 180) * r];
      const cl: Clave[] = [
        K(0, { bajar: 0.8, torso: 2, ladeo: 0, lateral: 0.4, ladeoCadera: 1.5, giroTorso: 0, giroCadera: 0, respira: 0.2, puntillas: [0, 0], manoI: [6, -8, 30], manoD: [5, 10, 33], vara: [-3, 12], armaD: [35, 5] }),
        K(0.1, { bajar: 1.6, torso: 4, respira: 0, manoI: [9, -6, 30], manoD: [5, 10.5, 32], lateral: 0.6 }, true),
        K(0.2, { bajar: 0.7, torso: 0, ladeo: -2, lateral: 0.2, respira: 0.4, manoI: sig(60), manoD: [5, 9, 35], vara: [-2, 10], giroTorso: -4 }),
        K(0.3, { bajar: 0, torso: -6, ladeo: -5, lateral: 0.5, puntillas: [0.35, 0.35], manoI: sig(150), manoD: [4, 9, 37], vara: [-8, 16], giroTorso: -8 }),
        K(0.4, { bajar: -0.6, torso: -8, ladeo: 4, lateral: -0.4, puntillas: [0.6, 0.6], respira: 0.8, manoI: sig(240), manoD: [5, 8, 39], vara: [-4, 4], giroTorso: 6 }),
        K(0.5, { bajar: -0.4, torso: -4, ladeo: 2, puntillas: [0.5, 0.5], manoI: sig(330), vara: [0, 8], giroTorso: 2 }),
        K(0.6, { bajar: -1.1, torso: -10, ladeo: -2, lateral: 0.3, puntillas: [0.9, 0.9], respira: 1, manoI: [6, -11, 46], manoD: [4, 8.5, 40], vara: [-12, 12], armaD: [5, 5], giroTorso: -12 }, true),
        K(0.68, { bajar: -1.6, torso: 9, ladeo: 0, lateral: -0.2, puntillas: [1, 1], respira: 0.4, manoI: [21, -1, 46], manoD: [9, 9.5, 42], vara: [22, 24], armaD: [70, 0], giroTorso: 8 }),
        K(0.78, { bajar: -1.5, torso: 10, puntillas: [1, 1], manoI: [21.5, -1, 46.5], manoD: [9.5, 9.5, 42.5], vara: [24, 24] }, true),
        K(0.9, { bajar: 0.6, torso: 3, ladeo: 0, lateral: 0.3, puntillas: [0, 0], respira: 0.2, manoI: [8, -7, 32], manoD: [5, 10, 33.5], vara: [-2, 12], armaD: [38, 5], giroTorso: 0 }),
      ];
      actuar(p, cl, u, { lagArma: 0.03, capa: 0.6, tela: 1.4 });
      // la cabeza sigue a la mano que dibuja (con retardo)
      const q = animar(cl, u - 0.05).manoI as [number, number, number];
      p.cabeza = 0; p.giroCabeza = 0; mirar(p, q, 0.85);
      p.ladeoCabeza = clamp(-(p.giroCabeza ?? 0) * 0.15, -6, 6);
      // el remate del báculo gira siempre (más rápido mientras dibuja); 4 puntas: 360 empalma con 0
      p.giroVara = 360 * (u - (0.8 * Math.sin(u * TAU)) / TAU);
      break;
    }
    case 'apunta': {
      // levanta el arco, inspira, tensa girando el torso con el peso atrás, sostiene, suelta (la mano sale hacia atrás),
      // busca otra flecha atrás del hombro y la monta
      plantar(p, [-3.2, 3.6], [2.2, 1.6], [55, 12]);
      actuar(p, [
        K(0, { bajar: 1.2, torso: 3, ladeo: 0, giroTorso: 16, giroCadera: 8, lateral: 0.2, ladeoCadera: 0, manoI: [11, -7, 31], manoD: [8, -4.5, 32], codoD: [-0.35, 0.8, -0.5], cabeza: 6, giroCabeza: -12, ladeoCabeza: 0, respira: 0.2, hombros: [0, 0] }),
        K(0.14, { bajar: 2, torso: 5, giroTorso: 24, giroCadera: 12, manoI: [15, -5, 38], manoD: [12, -3, 39], cabeza: 1, giroCabeza: -20, respira: 0.7 }, true),
        K(0.34, { bajar: 2.5, torso: -1, ladeo: -2.5, giroTorso: 54, giroCadera: 26, lateral: 0.9, ladeoCadera: 2, manoI: [24.5, 0.5, 48.5], manoD: [1, 5.5, 49], codoD: [-1, 0.45, 0.5], cabeza: 0, giroCabeza: -50, ladeoCabeza: -4, respira: 1, hombros: [0.4, 0.8] }),
        // la cuerda se tensa hasta la quijada, por fuera de la cara (la mano no se mete en la cabeza)
        K(0.48, { manoD: [0.5, 5.6, 49], respira: 0.85 }, true),
        K(0.56, { torso: -2.5, manoD: [-4.5, 3.6, 50.6], manoI: [26, 0.3, 49], cabeza: -1, respira: 0.2 }),
        K(0.66, { manoD: [-5.5, 4.4, 50], manoI: [25.5, 0.2, 48.6], respira: 0.1 }, true),
        K(0.8, { bajar: 1.6, torso: 2, ladeo: -1, giroTorso: 32, giroCadera: 16, lateral: 0.4, ladeoCadera: 1, manoI: [16, -5, 38], manoD: [-3, 6, 56], codoD: [-0.2, 0.6, 0.8], cabeza: 2, giroCabeza: -26, ladeoCabeza: 0, hombros: [0.6, 0.3] }),
        K(0.9, { bajar: 1.4, torso: 3, ladeo: 0, giroTorso: 20, giroCadera: 10, lateral: 0.2, ladeoCadera: 0, manoI: [12, -6, 33], manoD: [9, -3.8, 34], codoD: [-0.35, 0.8, -0.5], cabeza: 5, giroCabeza: -14, hombros: [0, 0] }),
      ], u, { lagCab: 0.03, capa: 0.8 });
      p.flecha = !(u > 0.53 && u < 0.86);
      break;
    }
    case 'invoca': {
      // encorvada, la mano en garra agarra algo del piso y lo sube despacio, con esfuerzo, hasta arriba de la cabeza;
      // ahí tiembla un momento y lo suelta: el cuerpo se vuelve a encorvar
      plantar(p, [-1.6, 3.6], [2.4, 2], [18, 14]);
      p.pegaI = 0;
      const garra: Vals = { armaD: [160, 25] };
      actuar(p, [
        K(0, { bajar: 5, torso: 30, ladeo: 4, giroTorso: -8, giroCadera: -4, lateral: -0.5, ladeoCadera: -1.5, hombros: [1.5, 2.2], respira: 0, cabeza: 14, giroCabeza: 6, ladeoCabeza: 4, manoI: [15, -3, 7], codoI: [0.2, -1, 0.5], manoD: [2, 9, 28], ...garra }),
        K(0.12, { bajar: 5.6, torso: 33, manoI: [16, -3, 5], hombros: [1.7, 2.6], cabeza: 17 }, true),
        K(0.3, { bajar: 4.2, torso: 22, ladeo: 3, manoI: [15, -4, 18], cabeza: 8, respira: 0.3, hombros: [1.4, 2] }),
        K(0.48, { bajar: 2.2, torso: 8, ladeo: 0, giroTorso: -14, giroCadera: -6, lateral: 0.2, ladeoCadera: 0.5, manoI: [13, -5, 38], cabeza: -10, giroCabeza: 4, ladeoCabeza: 0, respira: 0.7, manoD: [2, 10, 31] }),
        K(0.62, { bajar: 0.6, torso: -6, ladeo: -3, manoI: [10, -6, 59], cabeza: -30, giroCabeza: 0, ladeoCabeza: -3, respira: 1, hombros: [0.6, 1.4], manoD: [3, 11, 34] }),
        K(0.72, { manoI: [10.5, -6.4, 60], cabeza: -32 }, true),
        K(0.82, { bajar: 4, torso: 22, ladeo: 3, manoI: [15, -4, 16], cabeza: 8, giroCabeza: 6, ladeoCabeza: 3, respira: 0.1, lateral: -0.3, hombros: [1.4, 2], manoD: [2, 9, 29] }),
        K(0.92, { bajar: 4.8, torso: 29, ladeo: 4, manoI: [15, -3, 9], cabeza: 12, hombros: [1.5, 2.1], lateral: -0.5 }),
      ], u, { lagCab: 0.04, capa: 0.8, tela: 1.2 });
      // temblor de la garra mientras sostiene lo que invocó
      if (u > 0.55 && u < 0.8 && p.manoI) { const tr = Math.sin(u * TAU * 7) * 0.5; p.manoI = [p.manoI[0] + tr * 0.4, p.manoI[1] + tr, p.manoI[2] + tr * 0.6]; }
      if (dosM && p.manoI) {
        // con la guadaña (a dos manos) la invocación la hace el arma: sube con las dos manos en el asta, la hoja arriba
        // la derecha cierra en el cabo, al costado derecho de la cadera, y el asta sube cruzada hacia la izquierda con la
        // izquierda más arriba, del lado de la hoja: el cabo (largo) baja por fuera del muslo derecho, nunca entre las
        // piernas. Al invocar alza la guadaña cruzada delante del pecho, la hoja bien alta a la izquierda: las manos no
        // pasan de los hombros (ninguna cruza la cara)
        const g = p.manoI, k = clamp((g[2] - 8) / 50, 0, 1), ks = k * k * (3 - 2 * k);
        p.manoD = [lerp(g[0] - 2, 10, ks), 8, lerp(Math.max(30, g[2] - 2), 40, ks)]; p.armaD = [lerp(48, 44, ks), lerp(-40, -62, ks)];
        delete p.manoI; delete p.codoI; delete p.codoD; p.agarreI = lerp(-8, -9, ks); p.pegaI = 1; p.poloI = [-0.3, -1, -0.35];
      } else if (mano === 'escudo' && p.manoI) {
        // con escudo en la izquierda: la garra es la derecha (la daga en puño invertido) y el escudo queda abajo, al costado
        const g = p.manoI, cd = p.codoI ?? [0.2, -1, 0.5];
        p.manoD = [g[0], -g[1], g[2]]; p.codoD = [cd[0], -cd[1], cd[2]]; p.armaD = [172, 0];
        const r = p.respira ?? 0;
        p.manoI = [4 + r, -9, 30 + r]; p.codoI = [-0.4, -0.8, -0.5];
        p.giroTorso = -p.giroTorso; p.giroCadera = -(p.giroCadera ?? 0); p.ladeo = -(p.ladeo ?? 0); p.giroCabeza = -(p.giroCabeza ?? 0); p.ladeoCabeza = -(p.ladeoCabeza ?? 0); p.lateral = -(p.lateral ?? 0); p.ladeoCadera = -(p.ladeoCadera ?? 0);
        p.hombros = [p.hombros?.[1] ?? 0, p.hombros?.[0] ?? 0];
      }
      break;
    }
    case 'kata': {
      // forma de puños en postura de jinete, la cadera siempre baja: el peso pasa de un lado al otro y la cadera gira
      // antes que los hombros; bloqueo alto, directo, círculo de palmas, golpe de palma y saludo
      plantar(p, [-0.3, 0.6], [5, 5], [24, 24]);
      const atras = (s: number): [number, number, number] => [-1, s, -0.2];
      actuar(p, [
        K(0, { bajar: 7, torso: 6, ladeo: 0, giroTorso: 0, giroCadera: 0, lateral: 0, ladeoCadera: 0, respira: 0.3, manoD: [2, 7.4, 29.5], manoI: [2, -7.4, 29.5], codoD: atras(0.4), codoI: atras(-0.4), cabeza: 0, giroCabeza: 0 }),
        K(0.07, { manoI: [11, -6, 40], codoI: [0, -1, -0.3] }),
        K(0.14, { bajar: 7.6, lateral: 1.4, ladeoCadera: 2, giroCadera: 12, giroTorso: 24, ladeo: 1.5, manoI: [7, 0, 58.5], codoI: [0.1, -1, 0.35], cabeza: -2, giroCabeza: -22 }),
        K(0.2, { manoI: [9, -11, 47], codoI: [0, -1, 0] }),
        K(0.26, { bajar: 6.4, lateral: -1, ladeoCadera: -2, giroCadera: -14, giroTorso: -30, ladeo: -2, manoD: [23, -1, 45], codoD: [0, 1, -0.3], manoI: [2, -7.4, 30.5], codoI: atras(-0.4), cabeza: 2, giroCabeza: 26, respira: 0 }, true),
        K(0.42, { bajar: 7.8, lateral: 0, ladeoCadera: 0, giroCadera: 0, giroTorso: 0, ladeo: 0, torso: 4, manoD: [12, 9, 37], manoI: [12, -9, 37], codoD: [-0.2, 1, -0.5], codoI: [-0.2, -1, -0.5], cabeza: 2, giroCabeza: 0, respira: 0.8 }),
        K(0.55, { bajar: 6.4, lateral: 1, ladeoCadera: 2, giroCadera: 14, giroTorso: 30, ladeo: 2, manoI: [22, 1, 44], codoI: [0, -1, -0.3], manoD: [2, 7.4, 30.5], codoD: atras(0.4), cabeza: 1, giroCabeza: -26, respira: 0 }, true),
        K(0.72, { bajar: 5, torso: 0, lateral: 0, ladeoCadera: 0, giroCadera: 0, giroTorso: 0, ladeo: 0, manoD: [10, 1.2, 44], manoI: [10, -1.2, 44], codoD: [0, 1, -0.6], codoI: [0, -1, -0.6], cabeza: 6, giroCabeza: 0, respira: 1 }),
        K(0.86, { bajar: 6.6, torso: 5, manoD: [10, 4, 34], manoI: [10, -4, 34], codoD: [-0.3, 1, -0.6], codoI: [-0.3, -1, -0.6], cabeza: 1, respira: 0.1 }),
      ], u, { lagCab: 0.03, capa: 0.6 });
      break;
    }
    case 'naturaleza': {
      // encorvado y terrenal, la vara plantada al costado: el brazo libre sube suave como una rama (el codo blando
      // adelante de la mano), la mano de la vara sube por ella, mira al cielo y el viento lo mece; la mano llega tarde
      plantar(p, [-0.6, 2], [1.5, 1.2], [14, 10]);
      const pie: [number, number, number] = [12, 20, 0.5], cima: [number, number, number] = [9, 17.5, 62];
      const enVara = (z: number): [number, number, number] => { const t = (z - pie[2]) / (cima[2] - pie[2]); return [lerp(pie[0], cima[0], t), lerp(pie[1], cima[1], t), z]; };
      p.varaPie = pie; p.pegaI = 0;
      const cl: Clave[] = [
        K(0, { bajar: 1.6, torso: 9, ladeo: 0, lateral: 0.4, ladeoCadera: 1, giroTorso: 0, respira: 0.1, hombros: [0.3, 0.3], manoD: enVara(38), manoI: [5, -7.5, 29], codoI: [-0.3, -1, -0.6], cabeza: 2, giroCabeza: -4, ladeoCabeza: 0 }),
        K(0.2, { bajar: 1.2, torso: 6, respira: 0.5, manoI: [8, -14, 33], codoI: [0, -1, -0.8], manoD: enVara(41), cabeza: -6 }),
        K(0.34, { bajar: 0.6, torso: 2, respira: 1, hombros: [0.6, 0.8], manoI: [7, -15, 48], codoI: [0.2, -1, -0.9], manoD: enVara(46), cabeza: -18 }),
        K(0.46, { torso: 1, ladeo: -4, lateral: -0.5, ladeoCadera: -1.2, giroTorso: -5, manoI: [6, -14, 55], cabeza: -24, ladeoCabeza: -5, giroCabeza: -6 }),
        K(0.6, { torso: 0, ladeo: 4, lateral: 0.6, ladeoCadera: 1.2, giroTorso: 5, manoI: [8, -12, 53], manoD: enVara(47), cabeza: -22, ladeoCabeza: 5, giroCabeza: 4 }),
        K(0.72, { torso: 2, ladeo: -2, lateral: -0.1, ladeoCadera: 0, giroTorso: -2, manoI: [7, -14, 52], cabeza: -18, ladeoCabeza: -2, giroCabeza: -2, respira: 0.7 }),
        K(0.86, { bajar: 1.4, torso: 7, ladeo: 0, lateral: 0.3, ladeoCadera: 0.8, giroTorso: 0, respira: 0.2, manoI: [6, -11, 36], codoI: [-0.2, -1, -0.7], manoD: enVara(40), cabeza: 0, ladeoCabeza: 0, giroCabeza: -3, hombros: [0.3, 0.3] }),
      ];
      actuar(p, cl, u, { lagCab: 0.05, capa: 1.2, pelo: 0.6, tela: 1.6 });
      // la mano libre llega más tarde que el hombro, como la punta de una rama
      const b = animar(cl, u - 0.06);
      p.manoI = b.manoI as [number, number, number];
      break;
    }
    case 'frasco': {
      // saca el frasco del cinto, lo agita con fuerza, lo levanta contra la luz y lo mira de reojo, asiente y lo guarda;
      // la ballesta cuelga de la otra mano
      plantar(p, [-1.6, 2.6], [1.4, 1.2], [16, 10]);
      // la cara en alto y casi de frente: hundida y girada hacia el hombro izquierdo, la hombrera parecía un puño en la mejilla
      p.pegaI = 0; p.objetoI = 'frasco';
      actuar(p, [
        K(0, { bajar: 1, torso: 4, ladeo: 0, lateral: 0.4, ladeoCadera: 1.5, giroTorso: -4, giroCadera: -2, respira: 0.2, manoI: [3, -7, 30], manoD: [3, 9, 27], armaD: [155, 10], cabeza: 1, giroCabeza: -3, ladeoCabeza: 0 }),
        K(0.1, { bajar: 1.3, torso: 2, manoI: [10, -2, 40], cabeza: 4, giroCabeza: -6 }),
        K(0.16, { bajar: 0.9, manoI: [11, -1, 44], hombros: [0.3, 0.8] }),
        K(0.22, { bajar: 1.4, manoI: [10, -3, 38], hombros: [0, 0.2] }),
        K(0.28, { bajar: 0.9, manoI: [11, -1, 44], hombros: [0.3, 0.8] }),
        K(0.34, { bajar: 1.3, manoI: [10, -3, 38.5], hombros: [0, 0.2] }),
        K(0.48, { bajar: 0.4, torso: -6, lateral: 0.6, ladeo: -1.5, giroTorso: -8, manoI: [9, -3, 58], cabeza: -28, giroCabeza: -8, ladeoCabeza: 9, respira: 0.7, hombros: [0.2, 0.4], armaD: [148, 14] }),
        K(0.62, { torso: -7, manoI: [9.5, -2.4, 58.5], ladeoCabeza: 13, giroCabeza: -4 }, true),
        K(0.76, { bajar: 1.2, torso: 3, lateral: 0.2, ladeo: 0, giroTorso: -4, manoI: [5, -8, 34], cabeza: 1, giroCabeza: -3, ladeoCabeza: 0, respira: 0.2, hombros: [0, 0], armaD: [155, 10] }),
        K(0.86, { manoI: [3, -7, 30], cabeza: 2, giroCabeza: -4 }, true),
      ], u, { lagCab: 0.035, capa: 0.7 });
      break;
    }
  }
}

// ------------------------------------------------------------------ monje: cadera baja y centrada, puños guardados
/**
 * El monje se mueve desde el centro: la cadera baja y quieta, los puños cerrados en la cintura o en guardia, los golpes
 * salen de la cadera con giro y el brazo vuelve a la guardia; los codos apuntan abajo y atrás (nunca se cruzan).
 */
function monje(p: Pose, acc: Accion, u: number, f: number, arma: ArmaPose) {
  void arma;
  const abajo = (s: number): [number, number, number] => [-0.3, s * 0.7, -1]; // codo abajo: guardia
  if (acc === 'quieto') {
    // guardia baja, el peso en la punta de los pies: rebota apenas dos veces por ciclo, los puños cerrados adelante y
    // abajo (el de adelante a la altura del pecho, el de atrás cubriendo el mentón desde abajo) y respira hondo del vientre
    const k = 0.5 - 0.5 * Math.cos(u * TAU), k2 = Math.sin(u * TAU), rb = 0.5 - 0.5 * Math.cos(u * 2 * TAU);
    plantar(p, [-2.2, 2.6], [2.2, 1.8], [26, 12]);
    p.puntillas = [0.35 + 0.1 * rb, 0.3 + 0.1 * rb];
    p.bajar = 4 - 0.7 * rb; p.torso = 8 - k; p.respira = 0.2 + 0.8 * k; p.hombros = [0.3 + 0.3 * k, 0.3 + 0.3 * k];
    p.lateral = 0.15; p.giroTorso = 14 + k; p.giroCadera = 8; p.cabeza = 1 - 0.8 * k; p.giroCabeza = -12 + 3 * k2; p.ladeo = 0.4 * k2;
    p.manoD = [9, 4.6, 39.5 + 0.6 * rb]; p.manoI = [13, -3, 42 + 0.6 * rb]; p.codoD = abajo(1); p.codoI = abajo(-1);
    p.capa = [0.6 + 0.3 * rb, 0.2 * k2]; p.pelo = [0, 0];
  } else if (acc === 'caminar' || acc === 'correr') {
    const correr = acc === 'correr';
    marcha(p, u, correr, 'nada', 'kata');
    // el braceo sale de la marcha (cada brazo con la pierna contraria); el monje lo lleva compacto, de peleador: los
    // brazos sueltos al caminar y los codos recogidos al correr, con los puños que van y vienen cortos. Las garras siguen al antebrazo.
    const [aD, , cD] = p.hombroD, [aI, , cI] = p.hombroI;
    if (!correr) {
      p.torso = 3; p.giroTorso *= 0.7; p.giroCabeza = -p.giroTorso * 0.9; p.respira = 0.4;
      p.hombroD = [(aD - 4) * 0.7, 9, 29 + (cD - 25) * 0.8, 14]; p.hombroI = [(aI - 4) * 0.7, 9, 29 + (cI - 25) * 0.8, 14];
    } else {
      p.torso = 12; p.giroTorso *= 0.8; p.giroCabeza = -p.giroTorso * 0.9;
      p.hombroD = [(aD - 4) * 0.8 - 2, 10, 91 + (cD - 85) * 0.9, 20]; p.hombroI = [(aI - 4) * 0.8 - 2, 10, 91 + (cI - 85) * 0.9, 20];
    }
  } else if (acc === 'atacar') {
    // combo casi sin recogida: directo de izquierda (cuadro 2), cruzado de derecha (5, el golpe que cuenta) y patada frontal
    // con la pierna de atrás (8); cada puño vuelve a la guardia antes del siguiente
    plantar(p, [-2.5, 3], [2.2, 1.8], [30, 10]);
    const GD: [number, number, number] = [8, 4.5, 42], GI: [number, number, number] = [12, -3, 43];
    actuar(p, [
      K(0, { bajar: 4, torso: 6, ladeo: 0, giroTorso: 12, giroCadera: 6, lateral: 0.2, manoD: GD, manoI: GI, codoD: abajo(1), codoI: abajo(-1), cabeza: 0, giroCabeza: -10, pasos: [-2.5, 3], alza: [0, 0], respira: 0.4 }),
      K(c12(1), { torso: 7, giroTorso: 18, giroCadera: 8, manoI: [19, -2, 44.5], respira: 0.1 }),
      K(c12(2), { torso: 8, giroTorso: 24, giroCadera: 9, lateral: -0.3, manoI: [24, -1.5, 45], giroCabeza: -22, respira: 0 }, true),
      K(c12(3.2), { torso: 7, giroTorso: 10, giroCadera: -6, lateral: -0.4, manoI: GI, manoD: [6, 5.5, 41] }),
      K(c12(5), { torso: 12, giroTorso: -26, giroCadera: -16, lateral: -0.9, ladeo: -2, manoD: [25, 0.5, 45], manoI: [10, -4, 43], giroCabeza: 22 }, true),
      K(c12(6.3), { bajar: 3, torso: 2, giroTorso: 4, giroCadera: 0, lateral: -1.4, ladeo: 0, manoD: GD, manoI: [11, -3.5, 43], giroCabeza: -2, pasos: [4, 3], alza: [11, 0], respira: 0.6 }),
      K(c12(8), { bajar: 3, torso: -10, giroTorso: 4, giroCadera: -8, lateral: -1.6, manoD: [6, 6, 41], manoI: [9, -5, 42], cabeza: 4, giroCabeza: 6, pasos: [21, 3], alza: [14, 0], respira: 0 }, true),
      K(c12(9.3), { bajar: 3.4, torso: 2, giroTorso: 6, giroCadera: 0, lateral: -1, manoD: GD, manoI: GI, cabeza: 0, giroCabeza: -6, pasos: [6, 3], alza: [7, 0] }),
      K(c12(10.8), { bajar: 3.8, torso: 5, giroTorso: 10, giroCadera: 5, lateral: -0.2, pasos: [-2, 3], alza: [0.6, 0], respira: 0.3 }),
    ], u, { lagCab: 0.03, capa: 0.8 });
    p.alza = [Math.max(0, p.alza?.[0] ?? 0), 0];
  } else if (acc === 'herido') {
    // encaja el golpe cubriéndose: los puños suben delante del pecho, el torso se dobla atrás y la cadera se hunde
    const { num: tab, vec } = tabla(u);
    plantar(p, [-2, 2.2], [2.2, 2], [24, 14]);
    p.torso = tab([-15, -20, -6, 3, 4]); p.avanza = tab([0.5, 0.8, 0.3, 0, 0]); p.giroTorso = tab([10, 14, 8, 6, 5]); p.giroCadera = tab([4, 7, 4, 3, 2]);
    p.ladeo = tab([3, 5, 2, 0, 0]); p.lateral = tab([0.5, 0.8, 0.3, 0, 0]); p.bajar = tab([4, 5, 4.4, 3.8, 3.6]);
    p.cabeza = tab([-10, -16, -3, 2, 1]); p.giroCabeza = tab([8, 10, 3, -2, -3]); p.ladeoCabeza = tab([5, 8, 2, 0, 0]);
    p.manoD = vec<[number, number, number]>([[8, 5, 45], [7, 5.5, 46], [8, 5, 43], [8, 4.5, 42], [8, 4.5, 42]]);
    p.manoI = vec<[number, number, number]>([[10, -4, 46], [9, -4.5, 47], [11, -3.5, 44], [12, -3, 43], [12, -3, 43]]);
    p.codoD = abajo(1); p.codoI = abajo(-1); p.respira = tab([0.9, 0.5, 0.2, 0.3, 0.3]);
    p.capa = [tab([2, 3, 1.2, 0.8, 0.6]), tab([-0.5, -1, -0.3, 0, 0])];
  } else {
    // morir con calma: se arrodilla, apoya las manos en los muslos, exhala y se recuesta de costado
    const i = Math.max(0, Math.min(7, Math.floor(f))), tab = <T>(xs: T[]) => xs[i];
    p.caidaDir = 90;
    p.caida = tab([0, 0, 0, 0, 0.12, 0.42, 0.8, 1]);
    p.bajar = tab([2, 6, 13, 14.5, 14.5, 14, 14, 14]);
    p.caderaD = tab<[number, number]>([[8, 14], [20, 60], [8, 98], [4, 104], [4, 104], [6, 106], [8, 108], [8, 108]]);
    p.caderaI = tab<[number, number]>([[-6, 10], [14, 56], [12, 100], [8, 104], [8, 104], [10, 106], [12, 108], [12, 108]]);
    p.torso = tab([-10, 10, 14, 20, 18, 14, 10, 8]); p.cabeza = tab([-8, 14, 18, 24, 22, 16, 10, 8]);
    p.giroCabeza = tab([6, 4, 2, 0, 0, 0, 4, 6]); p.ladeoCabeza = tab([4, 2, 0, 0, 2, 6, 10, 12]);
    p.ladeo = tab([3, 2, 0, 0, 2, 4, 6, 6]); p.giroTorso = tab([8, 4, 0, 0, 0, 2, 4, 4]);
    p.avanza = tab([-0.8, 0, 0, 0, 0, 0, 0, 0]); p.respira = tab([1, 0.6, 0.3, 0.6, 0.2, 0.1, 0, 0]);
    p.manoD = tab<[number, number, number]>([[6, 5, 44], [9, 6, 30], [7, 5, 18], [6, 5, 17], [6, 5, 17], [7, 6, 16], [8, 6, 15], [8, 6, 15]]);
    p.manoI = tab<[number, number, number]>([[9, -4, 44], [10, -6, 30], [7, -5, 18], [6, -5, 17], [6, -5, 17], [7, -6, 16], [8, -6, 15], [8, -6, 15]]);
    p.capa = [tab([1.6, 0.4, -0.4, -0.8, -0.8, -0.4, 0, 0]), 0];
  }
}

// ------------------------------------------------------------------ druida: encorvado y terrenal, el bastón como apoyo
/**
 * El druida carga el peso hacia adelante, con la vara apoyada en el piso: al caminar la vara avanza y se planta con el
 * talón izquierdo y queda quieta en el suelo mientras el cuerpo pasa sobre ella. Golpea con la vara a dos manos en arco,
 * conjura sacando raíces del piso y muere arrodillado, cayendo de costado sobre la vara.
 */
function druida(p: Pose, acc: Accion, u: number, f: number, arma: ArmaPose) {
  void arma;
  if (acc === 'quieto') {
    const k = 0.5 - 0.5 * Math.cos(u * TAU), k2 = Math.sin(u * TAU);
    plantar(p, [-1.5, 2], [1.6, 1.4], [16, 12]);
    p.bajar = 1.6 - 0.4 * k; p.torso = 9 - 1.2 * k; p.respira = k; p.hombros = [0.4 + 0.5 * k, 0.4 + 0.5 * k];
    p.lateral = 0.5 + 0.1 * k; p.ladeoCadera = 1.8; p.ladeo = 1 - 0.3 * k; p.giroTorso = 3; p.giroCadera = 0;
    p.cabeza = -7 - 1.5 * k; p.giroCabeza = -4 + 4 * k2; p.ladeoCabeza = 1.5 * k2;
    p.varaPie = [13, 12.5, 0.5]; p.manoD = [8, 10, 41 - 0.4 * k]; p.manoI = [4, -9, 29 + 0.6 * k];
    p.capa = [0.8 + 0.2 * k, 0.2 * k2]; p.pelo = [0.2 * k, 0.2 * k2];
  } else if (acc === 'caminar' || acc === 'correr') {
    const correr = acc === 'correr';
    marcha(p, u, correr, 'baculo', 'naturaleza');
    p.torso = correr ? 18 : 10; p.cabeza = correr ? -12 : -7;
    // la vara acompaña la mano (el porte de la marcha), un poco más inclinada adelante por el torso agachado
    // (la mano va a un punto, como antes, pero ya no clavada: va y viene con el paso y la izquierda alcanza el asta del
    // báculo grande)
    const b = -Math.cos((u - 0.07) * TAU), b1 = -Math.cos((u - 0.14) * TAU), pis = Math.sin((u - 0.1) * 2 * TAU);
    p.manoD = correr ? [10 + 2.4 * b, 10, 36 + 0.6 * pis] : [8 + 2 * b, 10.5, 37 + 0.4 * pis];
    p.vara = correr ? [20 + 5 * b1 + 1.5 * pis, 6] : [10 + 4 * b1 + pis, 9];
  } else if (acc === 'atacar') {
    // golpe de vara a dos manos, amplio y redondo: la vara dibuja un círculo (atrás y abajo, arriba por el costado, por
    // encima y adelante) y pega en el cuadro 7 con un paso; el cuerpo sigue el arco y vuelve despacio
    plantar(p, [-2.8, 3.6], [1.8, 1.4], [26, 10]);
    p.agarreI = 12; p.pegaI = 1;
    actuar(p, [
      K(0, { bajar: 2.5, torso: 10, giroTorso: 8, giroCadera: 4, lateral: 0, ladeo: 0, avanza: 0, manoD: [11, 4, 38], vara: [35, -35], cabeza: -6, giroCabeza: -8, respira: 0.3, pasos: [-2.8, 3.6], alza: [0, 0] }),
      K(c12(1.5), { bajar: 3, torso: 8, giroTorso: 18, giroCadera: 8, lateral: 0.4, ladeo: 1, manoD: [11, 7, 42], vara: [12, 34], cabeza: -7, giroCabeza: -14, respira: 0.6 }),
      K(c12(3), { bajar: 3, torso: 2, giroTorso: 26, giroCadera: 10, lateral: 0.7, ladeo: 3, manoD: [6, 9.5, 50], vara: [-25, 24], cabeza: -8, giroCabeza: -20, respira: 0.8 }),
      K(c12(4.5), { bajar: 3.2, torso: -6, giroTorso: 32, giroCadera: 12, lateral: 0.9, ladeo: 4, manoD: [0, 9, 54], vara: [-50, 30], cabeza: -10, giroCabeza: -26, respira: 1 }, true),
      K(c12(6), { bajar: 3.6, torso: 6, giroTorso: 6, giroCadera: -10, lateral: 0, ladeo: 0, manoD: [14, 8, 50], vara: [60, -25], cabeza: -6, giroCabeza: -6, pasos: [-2.8, 5], alza: [0, 1] }),
      K(c12(7), { bajar: 5, torso: 22, giroTorso: -18, giroCadera: -12, lateral: -1, ladeo: -3, manoD: [18, 6, 37], vara: [100, -24], avanza: 2, cabeza: 4, giroCabeza: 14, respira: 0.2, pasos: [-2.8, 5.6], alza: [0, 0] }, true),
      K(c12(8.5), { bajar: 5.3, torso: 25, giroTorso: -24, manoD: [17, 5, 33], vara: [116, -26], avanza: 2.3, cabeza: 6, giroCabeza: 18 }),
      K(c12(10), { bajar: 4, torso: 16, giroTorso: -6, giroCadera: -3, lateral: -0.4, ladeo: -1, manoD: [14, 6, 38], vara: [70, -32], avanza: 1.2, cabeza: 0, giroCabeza: 2, pasos: [-2.8, 4.4], alza: [0, 0.6] }),
      K(c12(11), { bajar: 2.8, torso: 11, giroTorso: 5, giroCadera: 2, lateral: 0, ladeo: 0, manoD: [11, 4, 38], vara: [40, -33], avanza: 0.3, cabeza: -5, giroCabeza: -8, pasos: [-2.8, 3.8], alza: [0, 0.2] }),
    ], u, { lagCab: 0.03, lagArma: 0.02, capa: 1.1, tela: 1.3 });
  } else if (acc === 'lanzar') {
    // apoyado en la vara, se agacha, la mano libre agarra la tierra y sube despacio arrancando raíces
    plantar(p, [-1.8, 2.6], [1.8, 1.6], [18, 12]);
    p.varaPie = [14, 12.5, 0.5];
    actuar(p, [
      K(0, { bajar: 1.6, torso: 9, ladeo: 0, lateral: 0.3, manoI: [6, -7, 30], manoD: [8, 9.5, 40], cabeza: -5, giroCabeza: -4, respira: 0.2 }),
      K(c12(2), { bajar: 5, torso: 32, ladeo: -2, lateral: -0.3, manoI: [14, -5, 6], codoI: [0, -1, 0.4], manoD: [9, 9.5, 34], cabeza: 14, giroCabeza: -6, respira: 0 }),
      K(c12(3.5), { bajar: 5.5, torso: 34, manoI: [15, -5, 3], cabeza: 16 }, true),
      K(c12(5.5), { bajar: 3.5, torso: 18, ladeo: 0, manoI: [13, -7, 24], manoD: [8.5, 9.5, 38], cabeza: -4, respira: 0.6 }),
      K(c12(7), { bajar: 1, torso: 0, ladeo: 1, lateral: 0.4, manoI: [9, -9, 50], codoI: [0, -1, -0.7], manoD: [7, 9.5, 42], cabeza: -18, giroCabeza: -8, respira: 1 }, true),
      K(c12(8.5), { bajar: 1, torso: -2, manoI: [9.5, -9, 52], cabeza: -20 }),
      K(c12(10), { bajar: 2, torso: 8, ladeo: 0, lateral: 0.3, manoI: [8, -8, 34], manoD: [7.5, 9.5, 40], cabeza: -4, giroCabeza: -4, respira: 0.3 }),
      K(c12(11), { bajar: 1.6, torso: 9, manoI: [6, -7, 30], cabeza: -5 }),
    ], u, { lagCab: 0.035, capa: 1 });
  } else if (acc === 'herido') {
    herido(p, u, 'baculo', 'naturaleza');
    p.torso += 6; p.cabeza -= 3; delete p.vara;
    // se sostiene de la vara plantada
    p.varaPie = [13, 12.5, 0.5]; p.manoD = [8 + (p.avanza ?? 0) * 0.5, 10, 40];
  } else {
    // se arrodilla apoyado en la vara, la mano baja por ella y cae de costado sobre la vara
    const i = Math.max(0, Math.min(7, Math.floor(f))), tab = <T>(xs: T[]) => xs[i];
    p.caidaDir = 90;
    p.caida = tab([0, 0, 0, 0, 0.18, 0.55, 1, 1]);
    p.bajar = tab([1.5, 6, 13, 14.5, 14, 13, 12, 12]);
    p.caderaD = tab<[number, number]>([[6, 10], [22, 64], [8, 98], [4, 104], [6, 100], [10, 90], [14, 80], [14, 80]]);
    p.caderaI = tab<[number, number]>([[-6, 8], [16, 58], [12, 102], [8, 106], [10, 100], [12, 90], [16, 80], [16, 80]]);
    p.torso = tab([-12, 14, 16, 24, 22, 14, 8, 6]); p.cabeza = tab([-12, 18, 16, 24, 20, 10, 6, 4]);
    p.giroCabeza = tab([8, 4, 2, 0, 0, 4, 10, 14]); p.ladeoCabeza = tab([6, 2, 0, 0, 4, 8, 12, 12]);
    p.ladeo = tab([4, 2, 0, 0, 4, 8, 6, 6]); p.giroTorso = tab([10, 6, 2, 0, 0, 2, 4, 4]);
    p.avanza = tab([-1, -0.3, 0, 0, 0, 0, 0, 0]); p.respira = tab([0.9, 0.5, 0.2, 0.5, 0.2, 0, 0, 0]);
    // al irse al piso la vara se le escapa adelante (si no, quedaba tendida bajo la cabeza)
    p.varaPie = tab<[number, number, number]>([[10, 9, 0.5], [10, 9, 0.5], [10, 9, 0.5], [10, 9, 0.5], [14, 11, 0.5], [20, 13, 0.5], [24, 14, 0.5], [24, 14, 0.5]]);
    p.manoD = tab<[number, number, number]>([[7, 8.5, 40], [8, 8.5, 32], [8, 8, 26], [7, 8, 22], [7, 8, 22], [7, 8, 22], [7, 8, 22], [7, 8, 22]]);
    p.manoI = tab<[number, number, number]>([[6, -7, 32], [8, -6, 24], [7, -6, 18], [6, -5, 16], [6, -5, 16], [6, -6, 14], [6, -7, 12], [6, -7, 12]]);
    p.capa = [tab([2, 0.5, -0.5, -1, -1, -0.5, 0, 0]), 0]; p.pelo = [tab([1.4, -0.4, -0.8, -1.2, -1, -0.5, 0, 0]), 0];
  }
}

// ------------------------------------------------------------------ atacar: anticipación, contacto y recuperación
/**
 * El tiempo de una animación común (la de los monstruos, con el golpe en `tg`) llevado al ritmo de una clase (golpe en
 * `tc`): la carga se estira o se acorta hasta el impacto y la salida igual, así el cuadro del golpe cae donde dice la clase.
 */
const llevar = (u: number, tc: number, tg: number) => (u < tc ? (u / tc) * tg : tg + ((u - tc) / (1 - tc)) * (1 - tg));
function atacar(p: Pose, u: number, arma: ArmaPose, estilo?: Presentacion, mano?: ManoPose) {
  const tc = tImpacto(estilo, 'atacar', 0.5);
  switch (estilo) {
    case 'rugido': if (arma === 'dos') return atacarBerserker(p, u, true); if (arma === 'una') return atacarBerserker(p, u, false); break;
    case 'guardia': if (arma === 'una') return atacarTemplario(p, u, mano); break;
    case 'apunta': if (arma === 'arco') return atacarCazadora(p, u); break;
    case 'invoca': if (arma === 'una') return atacarNigromante(p, u); if (arma === 'dos') return atacarGuadana(p, u); break;
    case 'frasco': if (arma === 'ballesta') return atacarAlquimista(p, u); break;
    case 'conjuro': if (arma === 'dos') return atacarComun(p, llevar(u, tc, 0.5), 'baculo'); break;
  }
  // otras armas en manos de una clase: el golpe común, con el impacto en el cuadro de la clase
  const tg = arma === 'ballesta' ? 3 / 8 : arma === 'garras' || arma === 'nada' ? 2 / 8 : 0.5;
  atacarComun(p, estilo ? llevar(u, tc, tg) : u, arma);
}
function atacarComun(p: Pose, u: number, arma: ArmaPose) {
  let cl: Clave[];
  if (arma === 'asta') return atacarLanza(p, u);
  if (arma === 'arco') {
    plantar(p, [-3.2, 3.6], [2.2, 1.6], [55, 12]);
    cl = [
      K(0, { bajar: 2, torso: 0, ladeo: 0, giroTorso: 46, giroCadera: 22, lateral: 0.6, manoI: [23.5, 0.3, 47.5], manoD: [17, 0.6, 48.4], codoD: [-0.6, 0.6, 0.3], cabeza: 0, giroCabeza: -44, respira: 0.6 }),
      K(1 / 8, { manoD: [8, 1.6, 49.4], codoD: [-1, 0.5, 0.45], giroTorso: 50, giroCadera: 24, lateral: 0.8, respira: 0.9 }),
      K(2 / 8, { manoD: [1.6, 3.9, 49], giroTorso: 54, giroCadera: 26, lateral: 0.9, ladeo: -2, respira: 1, manoI: [24.5, 0.5, 48.5], giroCabeza: -50 }),
      K(3 / 8, { manoD: [1.2, 4, 49] }, true), // el anclaje: los dedos junto a la mandíbula, sin meterse en la cara
      K(4 / 8, { manoD: [-4.5, 3.6, 50.6], manoI: [26, 0.3, 49], torso: -2, respira: 0.2, cabeza: -1 }),
      K(5 / 8, { manoD: [-5.5, 4.4, 50], manoI: [25.5, 0.2, 48.6] }, true),
      K(6 / 8, { manoD: [-2, 6, 56], codoD: [-0.2, 0.6, 0.8], giroTorso: 48, ladeo: -1, cabeza: 1, manoI: [24.5, 0.3, 48] }),
      K(7 / 8, { manoD: [16, 0.6, 48.4], codoD: [-0.6, 0.6, 0.3], giroTorso: 46, ladeo: 0, manoI: [23.5, 0.3, 47.5], respira: 0.5, cabeza: 0 }),
    ];
    actuar(p, cl, u, { lagCab: 0.03, capa: 0.9 });
    p.flecha = !(u > 0.45 && u < 0.83);
    return;
  }
  if (arma === 'ballesta') {
    plantar(p, [-2, 3], [1.6, 1.2], [30, 8]);
    cl = [
      K(0, { bajar: 1.8, torso: 4, giroTorso: 10, giroCadera: 5, lateral: 0, avanza: 0, manoD: [12, 3, 35], cabeza: 2, giroCabeza: -8, respira: 0.2 }),
      K(1 / 8, { bajar: 2.4, torso: 3, giroTorso: 18, giroCadera: 9, lateral: 0.3, manoD: [12, 3.5, 44], cabeza: -1, giroCabeza: -15, respira: 0.8 }),
      K(2 / 8, { bajar: 2.6, torso: 2, giroTorso: 22, giroCadera: 10, lateral: 0.5, manoD: [11, 3.5, 47], cabeza: 1, giroCabeza: -20 }, true),
      K(3 / 8, { bajar: 2.4, torso: -5, giroTorso: 25, manoD: [8, 4, 50], cabeza: -6, giroCabeza: -22, lateral: 0.9, avanza: -0.8, respira: 0.2 }),
      K(4 / 8, { bajar: 2.5, torso: -2, giroTorso: 23, manoD: [9.5, 3.8, 48], cabeza: -2, avanza: -0.5, lateral: 0.7 }, true),
      K(5 / 8, { bajar: 2.2, torso: 4, giroTorso: 15, manoD: [12, 4, 38], cabeza: 4, avanza: 0, lateral: 0.3 }),
      K(6 / 8, { bajar: 2.6, torso: 10, giroTorso: 8, manoD: [10, 6, 32], cabeza: 10, giroCabeza: -2, lateral: 0 }),
      K(7 / 8, { bajar: 2, torso: 6, giroTorso: 8, manoD: [12, 3, 34], cabeza: 4, giroCabeza: -6 }),
    ];
    actuar(p, cl, u, { lagCab: 0.03, capa: 0.8 });
    return;
  }
  if (arma === 'baculo') {
    plantar(p, [-2.5, 3.5], [1.6, 1.2], [25, 8]);
    cl = [
      K(0, { bajar: 1.8, torso: 4, ladeo: 0, giroTorso: 6, giroCadera: 3, lateral: 0, avanza: 0, manoD: [6, 8, 34], vara: [4, 2], manoI: [8, -7, 32], cabeza: 0, giroCabeza: -6, respira: 0.2 }),
      K(1 / 8, { bajar: 2.4, torso: -2, giroTorso: 14, giroCadera: 8, lateral: 0.5, manoD: [3, 9, 42], vara: [-18, 6], manoI: [6, -8, 36], cabeza: -4, giroCabeza: -12, respira: 0.8 }),
      K(2 / 8, { bajar: 2.6, torso: -8, giroTorso: 18, giroCadera: 9, lateral: 0.8, ladeo: 2, manoD: [0, 9, 50], vara: [-30, 8], manoI: [4, -9, 40], cabeza: -8, giroCabeza: -16, respira: 1 }, true),
      K(3 / 8, { bajar: 3, torso: 4, giroTorso: 2, giroCadera: -6, lateral: 0, ladeo: 0, manoD: [9, 7, 46], vara: [20, 0], cabeza: -2, giroCabeza: -2 }),
      K(4 / 8, { bajar: 4.2, torso: 14, giroTorso: -14, giroCadera: -10, lateral: -0.8, ladeo: -2, manoD: [16, 4, 42], vara: [62, -4], manoI: [12, -5, 38], avanza: 1.8, cabeza: 4, giroCabeza: 12, respira: 0.2 }, true),
      K(5 / 8, { bajar: 4.4, torso: 16, manoD: [16.5, 4, 41], vara: [66, -4], avanza: 2.1, cabeza: 5 }),
      K(6 / 8, { bajar: 3.2, torso: 10, giroTorso: -4, giroCadera: -3, lateral: -0.3, ladeo: -0.5, manoD: [11, 7, 37], vara: [30, -14], avanza: 1.2, manoI: [9, -7, 34], cabeza: 2, giroCabeza: 2 }),
      K(7 / 8, { bajar: 2.1, torso: 5, giroTorso: 4, giroCadera: 2, lateral: 0, ladeo: 0, manoD: [7, 8, 34.5], vara: [8, 2], avanza: 0.3, manoI: [8, -7, 32], cabeza: 0, giroCabeza: -4 }),
    ];
    actuar(p, cl, u, { lagCab: 0.03, lagArma: 0.03, capa: 0.9 });
    return;
  }
  if (arma === 'garras' || arma === 'nada') {
    // dos golpes: directo de derecha y de izquierda, la cadera gira antes que los hombros
    plantar(p, [-2, 3], [2, 1.6], [24, 10]);
    cl = [
      K(0, { bajar: 3, torso: 8, ladeo: 0, giroTorso: 10, giroCadera: 5, lateral: 0, avanza: 0, manoD: [8, 4, 44], manoI: [11, -3, 46], cabeza: 0, giroCabeza: -8 }),
      K(1 / 8, { bajar: 3.4, torso: 6, giroTorso: 22, giroCadera: 4, lateral: 0.6, manoD: [3, 7, 42], manoI: [12, -2, 46], giroCabeza: -18 }),
      K(2 / 8, { bajar: 3.8, torso: 14, giroTorso: -24, giroCadera: -12, lateral: -0.8, ladeo: -2, manoD: [24, 0, 45], manoI: [5, -6, 42], cabeza: 4, giroCabeza: 18, avanza: 1.4 }, true),
      K(3 / 8, { bajar: 3.6, torso: 12, giroTorso: -16, giroCadera: 2, manoD: [15, 2, 44], manoI: [7, -5, 43], avanza: 1.2 }),
      K(4 / 8, { bajar: 4, torso: 15, giroTorso: 22, giroCadera: 12, lateral: 0.2, ladeo: 2, manoD: [6, 6, 42], manoI: [24, -1, 46], cabeza: 3, giroCabeza: -16, avanza: 1.8 }, true),
      K(5 / 8, { manoI: [17, -2, 45.5], giroTorso: 15, avanza: 1.6 }),
      K(6 / 8, { bajar: 3.4, torso: 10, giroTorso: 6, giroCadera: 3, lateral: 0, ladeo: 0, manoD: [8, 4.5, 43], manoI: [12, -3, 45], avanza: 0.6, cabeza: 1, giroCabeza: -6 }),
      K(7 / 8, { bajar: 3.1, torso: 8.5, giroTorso: 9, manoD: [8, 4, 44], manoI: [11, -3, 46], avanza: 0.1, giroCabeza: -8 }),
    ];
    actuar(p, cl, u, { lagCab: 0.03, capa: 0.8 });
    return;
  }
  const dosM = arma === 'dos';
  if (dosM) {
    // a dos manos (hacha doble, mandoble, martillo, alabarda, guadaña, astas, gran báculo): las dos manos en el mango, la
    // derecha arriba y la izquierda un palmo más abajo. Carga sobre el hombro derecho con la cabeza del arma atrás y
    // arriba, la cadera girada y el peso atrás; la cadera arranca primero, el arma pasa por encima de la cabeza en un arco
    // grande e impacta adelante y abajo con el peso en la pierna de adelante; contacto sostenido y vuelve arrastrándola.
    plantar(p, [-3, 3.5], [2, 1.6], [28, 10]);
    p.agarreI = 6; p.pegaI = 1;
    cl = [
      K(0, { bajar: 2.4, torso: 8, ladeo: 0, giroTorso: 8, giroCadera: 4, lateral: 0, avanza: 0, manoD: [10, 3, 36], armaD: [38, -24], cabeza: 0, giroCabeza: -8, pasos: [-3, 3.5], alza: [0, 0], respira: 0.3 }),
      K(1 / 8, { bajar: 2.8, torso: 2, ladeo: 3, giroTorso: 20, giroCadera: 8, lateral: 0.6, avanza: -0.3, manoD: [5, 9, 46], armaD: [-28, -16], giroCabeza: -19, cabeza: -2, respira: 0.8 }),
      K(2 / 8, { bajar: 3, torso: -8, ladeo: 5, giroTorso: 30, giroCadera: 12, lateral: 1, avanza: -0.6, manoD: [2, 9.5, 50], armaD: [-58, -22], giroCabeza: -27, cabeza: -4, alza: [0, 0.8], respira: 1 }, true),
      K(3 / 8, { bajar: 3.4, torso: 4, ladeo: 1, giroTorso: 14, giroCadera: -10, lateral: 0.2, avanza: 0.6, manoD: [9, 4, 56], armaD: [6, 3], giroCabeza: -12, cabeza: -6, pasos: [-3, 5.5], alza: [0, 0.4] }),
      K(4 / 8, { bajar: 5.5, torso: 24, ladeo: -3, giroTorso: -12, giroCadera: -14, lateral: -1, avanza: 2.4, manoD: [15, 1.5, 26], armaD: [128, -2], giroCabeza: 10, cabeza: 12, pasos: [-3, 6], alza: [0, 0], respira: 0.2 }, true),
      K(5 / 8, { bajar: 6, torso: 27, ladeo: -4, giroTorso: -16, giroCadera: -14, lateral: -1.1, avanza: 2.8, manoD: [14.5, 1, 24], armaD: [134, -4], giroCabeza: 14, cabeza: 14 }),
      K(6 / 8, { bajar: 4.4, torso: 16, ladeo: -2, giroTorso: -4, giroCadera: -4, lateral: -0.5, avanza: 1.6, manoD: [11, 3, 30], armaD: [100, -15], giroCabeza: 4, cabeza: 6, pasos: [-3, 4.8], alza: [0, 0.6] }),
      K(7 / 8, { bajar: 3, torso: 10, ladeo: 0, giroTorso: 6, giroCadera: 2, lateral: -0.1, avanza: 0.5, manoD: [10, 3, 34], armaD: [50, -24], giroCabeza: -6, cabeza: 2, pasos: [-3, 3.7], alza: [0, 0.1], respira: 0.3 }),
    ];
  } else {
    // espada, hacha, maza o daga: tajo en diagonal de arriba a la derecha hacia abajo a la izquierda
    plantar(p, [-2.5, 3.5], [1.5, 1.2], [24, 8]);
    cl = [
      K(0, { bajar: 2, torso: 6, ladeo: 0, giroTorso: 6, giroCadera: 3, lateral: 0, avanza: 0, hombroD: [25, 18, 40, 0], munecaD: 0, hombroI: [28, 16, 45, 15], cabeza: 0, giroCabeza: -6, pasos: [-2.5, 3.5], alza: [0, 0] }),
      K(1 / 8, { bajar: 2.6, torso: 2, giroTorso: 18, giroCadera: 8, lateral: 0.5, ladeo: 2, hombroD: [90, 32, 80, -10], munecaD: -15, hombroI: [45, 18, 40, 10], giroCabeza: -16 }),
      K(2 / 8, { bajar: 2.8, torso: -6, giroTorso: 28, giroCadera: 10, lateral: 0.9, ladeo: 4, hombroD: [150, 35, 80, -15], munecaD: -30, hombroI: [60, 22, 35, 10], cabeza: -4, giroCabeza: -25, alza: [0, 1.2] }, true),
      K(3 / 8, { bajar: 3, torso: 4, giroTorso: 6, giroCadera: -10, lateral: 0.1, ladeo: 1, hombroD: [128, 25, 35, 10], munecaD: -12, hombroI: [35, 20, 50, 20], cabeza: 0, giroCabeza: -8, pasos: [-2.5, 6], alza: [0, 0.6] }),
      K(4 / 8, { bajar: 4.4, torso: 16, giroTorso: -22, giroCadera: -14, lateral: -1, ladeo: -4, hombroD: [72, 8, 5, 25], munecaD: 18, hombroI: [5, 20, 65, 30], cabeza: 6, giroCabeza: 18, avanza: 2.2, pasos: [-2.5, 6.5], alza: [0, 0] }, true),
      K(5 / 8, { bajar: 4.7, torso: 20, giroTorso: -30, giroCadera: -16, ladeo: -5, hombroD: [38, -6, 12, 38], munecaD: 12, hombroI: [0, 22, 70, 30], avanza: 2.6, cabeza: 8, giroCabeza: 24 }),
      K(6 / 8, { bajar: 3.6, torso: 13, giroTorso: -12, giroCadera: -6, lateral: -0.5, ladeo: -2, hombroD: [20, 10, 32, 15], munecaD: 4, hombroI: [15, 18, 55, 20], avanza: 1.6, pasos: [-2.5, 5], alza: [0, 0.8], cabeza: 3, giroCabeza: 6 }),
      K(7 / 8, { bajar: 2.4, torso: 8, giroTorso: 2, giroCadera: 1, lateral: -0.1, ladeo: -0.5, hombroD: [22, 16, 38, 4], munecaD: 1, hombroI: [25, 16, 47, 15], avanza: 0.5, pasos: [-2.5, 3.8], alza: [0, 0.2], cabeza: 1, giroCabeza: -4 }),
    ];
  }
  actuar(p, cl, u, { lagCab: 0.04, lagArma: 0.03, capa: 1 });
}

// ------------------------------------------------------------------ lanzar: junta energía, empuja y vuelve
function lanzar(p: Pose, u: number, arma: ArmaPose, estilo?: Presentacion, mano?: ManoPose) {
  switch (estilo) {
    case 'conjuro': return lanzarArcanista(p, u, arma);
    case 'invoca': return lanzarNigromante(p, u, arma, mano);
    case 'frasco': return lanzarAlquimista(p, u);
    case 'rugido': return lanzarBerserker(p, u, arma);
    case 'guardia': if (arma === 'una') return lanzarTemplario(p, u); break;
  }
  lanzarComun(p, estilo ? llevar(u, tImpacto(estilo, 'lanzar', 3 / 8), 3 / 8) : u, arma);
}
function lanzarComun(p: Pose, u: number, arma: ArmaPose) {
  plantar(p, [-2, 3], [1.4, 1.2], [22, 8]);
  const cl: Clave[] = [
    K(0, { bajar: 1.6, torso: 4, ladeo: 0, giroTorso: 6, giroCadera: 3, lateral: 0, avanza: 0, manoI: [9, -6, 33], cabeza: 0, giroCabeza: -6, respira: 0.2, hombros: [0, 0] }),
    K(1 / 8, { bajar: 2.8, torso: -3, giroTorso: 14, giroCadera: 6, lateral: 0.6, ladeo: 1, manoI: [8, -1, 40], cabeza: -4, giroCabeza: -10, respira: 0.8, hombros: [0.6, 0.8] }),
    K(2 / 8, { bajar: 3.2, torso: -7, giroTorso: 18, giroCadera: 8, lateral: 0.9, ladeo: 2, manoI: [5, -2, 44], cabeza: -8, respira: 1, hombros: [1, 1.2] }, true),
    K(3 / 8, { bajar: 3.4, torso: 10, giroTorso: -6, giroCadera: -6, lateral: -0.7, ladeo: -2, manoI: [22, -1, 46], cabeza: 0, giroCabeza: 4, respira: 0.2, avanza: 1.6, hombros: [0.2, 0.2] }),
    K(4 / 8, { bajar: 3.6, torso: 13, giroTorso: -10, giroCadera: -8, lateral: -0.9, manoI: [23, -1, 46.5], cabeza: 2, giroCabeza: 6, avanza: 1.9 }, true),
    K(5 / 8, { bajar: 3.4, torso: 12, manoI: [22, -1.2, 46], avanza: 1.8 }),
    K(6 / 8, { bajar: 2.4, torso: 7, giroTorso: 0, giroCadera: 0, lateral: -0.3, ladeo: -0.5, manoI: [14, -4, 38], avanza: 0.9, cabeza: 1, giroCabeza: -2, hombros: [0, 0] }),
    K(7 / 8, { bajar: 1.8, torso: 5, giroTorso: 4, giroCadera: 2, lateral: 0, ladeo: 0, manoI: [10, -5.5, 34], avanza: 0.2, cabeza: 0, giroCabeza: -5 }),
  ];
  // lo que hace la mano del arma mientras la otra conjura
  const der: Vals[] = arma === 'baculo'
    ? [{ manoD: [6, 8, 34], vara: [4, 3] }, { manoD: [4, 8, 40], vara: [-10, 5] }, { manoD: [3, 8, 44], vara: [-16, 6] }, { manoD: [12, 7, 44], vara: [42, -16] }, { manoD: [13, 7, 44.5], vara: [46, -16] }, {}, { manoD: [9, 7.5, 38], vara: [18, -6] }, { manoD: [7, 8, 35], vara: [6, 3] }]
    : arma === 'una'
      ? [{ manoD: [6, 9, 28], armaD: [120, 15] }, { manoD: [5, 9, 40], armaD: [20, 5] }, { manoD: [4, 8, 46], armaD: [-8, 0] }, { manoD: [7, 7, 53], armaD: [6, 0] }, { manoD: [7, 7, 54], armaD: [4, 0] }, {}, { manoD: [7, 8.5, 38], armaD: [70, 10] }, { manoD: [6, 9, 30], armaD: [110, 14] }]
      : arma === 'dos' || arma === 'ballesta'
        ? [{ manoD: [5, 9, 30], armaD: [140, 10], pegaI: 1 }, { pegaI: 0.3 }, { pegaI: 0 }, {}, {}, {}, { pegaI: 0.4 }, { pegaI: 1 }]
        : [{ manoD: [8, 7, 32] }, { manoD: [7, 1, 40] }, { manoD: [5, 2, 44] }, { manoD: [21, 1, 45] }, { manoD: [22, 1, 45.5] }, {}, { manoD: [13, 5, 37] }, { manoD: [9, 7, 33] }];
  cl.forEach((c, i) => Object.assign(c.v, der[i]));
  actuar(p, cl, u, { lagCab: 0.035, lagArma: 0.03, capa: 1 });
  if (arma === 'dos' || arma === 'ballesta') { if ((p.pegaI ?? 1) > 0.95) { if (arma === 'dos') { p.manoD = [5, 8.5, 40]; p.armaD = [50, 172]; p.pegaI = 0; } else { delete p.manoD; delete p.armaD; p.hombroD = [30, 8, 50, 0]; } } p.pegaI = clamp(p.pegaI ?? 1, 0, 1); }
}

// ------------------------------------------------------------------ herido: el golpe lo echa atrás, la cabeza latiguea
/** Cuánto lo dobla el golpe a cada clase: los pesados y acorazados ceden menos, las livianas más. */
const PESO_HERIDO: Partial<Record<Presentacion, number>> = { rugido: 0.72, guardia: 0.7, kata: 0.85, naturaleza: 0.9, apunta: 1.08, conjuro: 1.12, invoca: 1.05, frasco: 1.05 };
/**
 * Tabla de poses del golpe muestreada en el tiempo: las entradas son los cuadros 0..3 de los monstruos (4 cuadros) y la
 * 4 es el asiento; con más cuadros (los héroes, 6) se interpola con curva suave entre ellas.
 */
function tabla(u: number) {
  const x = clamp(u * 4, 0, 4), i = Math.min(3, Math.floor(x)), w = x - i, s = w * w * (3 - 2 * w);
  const num = (xs: number[]) => lerp(xs[i], xs[Math.min(xs.length - 1, i + 1)], s);
  return { num, vec: <T extends number[]>(xs: T[]) => xs[i].map((v, j) => lerp(v, xs[Math.min(xs.length - 1, i + 1)][j], s)) as T };
}
function herido(p: Pose, u: number, arma: ArmaPose, estilo?: Presentacion) {
  // el golpe le da en el pecho: el torso se dobla hacia atrás desde la cintura (la cadera se va un poco adelante, el
  // arco de la espalda se ve), la cabeza latiguea atrás y llega tarde, los brazos se van adelante por la inercia; en el
  // cuadro 2 ya vuelve y en el 3 pasa apenas adelante antes de asentarse
  const k = estilo ? PESO_HERIDO[estilo] ?? 1 : 1;
  plantar(p, [-2, 2.5], [1.4, 1.2], [18, 8]);
  const { num: tab, vec } = tabla(u);
  p.torso = tab([-19, -25, -8, 3, 4]) * k; p.avanza = tab([0.7, 1, 0.4, 0, 0]) * k; p.giroTorso = tab([12, 16, 8, 4, 3]); p.giroCadera = tab([5, 8, 4, 2, 1]);
  p.ladeo = tab([4, 6, 2, 0, 0]) * k; p.lateral = tab([0.6, 0.9, 0.3, 0, 0]); p.bajar = tab([2.2, 3.2, 2.6, 1.8, 1.4]);
  p.cabeza = tab([-13, -20, -4, 3, 1]) * k; p.giroCabeza = tab([8, 12, 4, 0, 0]); p.ladeoCabeza = tab([6, 10, 3, 0, 0]);
  p.hombroD = vec<AngBrazo>([[38, 32, 50, 0], [50, 42, 60, 0], [24, 24, 42, 6], [14, 14, 30, 8], [12, 12, 26, 8]]);
  p.hombroI = vec<AngBrazo>([[32, 38, 62, 0], [44, 46, 78, 0], [20, 26, 50, 8], [12, 14, 30, 10], [10, 12, 22, 10]]);
  p.munecaD = tab([-14, -22, 8, 2, 0]); p.respira = tab([0.9, 0.5, 0.1, 0.2, 0.3]);
  p.capa = [tab([2.6, 3.8, 1.6, 0.9, 0.8]) * k, tab([-0.6, -1.2, -0.4, 0, 0])]; p.pelo = [tab([1.9, 2.8, 0.7, 0.2, 0]) * k, tab([-0.5, -1, 0, 0, 0])];
  // a dos manos: el arma sigue al hombro como en quieto y el golpe la sacude atrás (cruzada abajo, el regatón y el puño
  // izquierdo quedaban en la ingle); el puño va con el pecho, que se va atrás
  if (arma === 'dos') { p.manoD = vec<[number, number, number]>([[2, 9.5, 42.5], [0.5, 10, 43.5], [4, 9, 41], [5, 8.5, 40], [5, 8.5, 40]]); p.armaD = vec<[number, number]>([[58, 166], [64, 162], [54, 170], [50, 172], [50, 172]]); p.pegaI = 0; }
  if (arma === 'ballesta') { p.hombroD = vec<AngBrazo>([[40, 14, 60, 0], [48, 18, 70, 0], [34, 10, 55, 0], [30, 8, 50, 0], [30, 8, 50, 0]]); }
  if (arma === 'baculo') p.vara = vec<[number, number]>([[-14, 8], [-20, 10], [-4, 4], [3, 3], [3, 3]]);
  if (arma === 'arco') { p.hombroI = vec<AngBrazo>([[40, 30, 30, 0], [48, 36, 40, 0], [36, 20, 24, 0], [34, 14, 18, 0], [30, 14, 16, 0]]); p.tensa = false; }
  // el berserker no suelta la postura del hacha: baja y atrás junto a la cadera, el golpe apenas la sacude
  if (estilo === 'rugido' && (arma === 'dos' || arma === 'una')) {
    p.manoD = vec<[number, number, number]>([[0, 10.5, 32], [-1, 11, 33], [1, 10.5, 31.5], [2, 10, 31], [2, 10, 31]]);
    p.armaD = vec<[number, number]>([[136, 184], [132, 186], [140, 183], [142, 182], [142, 182]]); p.codoD = [-0.6, 0.55, -0.6]; p.pegaI = 0;
  }
}

/**
 * El bruto (ogro, trol, gigante) pega con peso, en los 8 cuadros de los monstruos: del 1 al 3 sube el arma y la lleva
 * atrás por encima del hombro con el cuerpo echado atrás (el 3 sostiene la carga), en el 4 la descarga con todo el
 * torso y medio paso, y del 5 al 7 se queda abajo con el arma en el piso y se levanta despacio.
 */
function atacarBruto(p: Pose, u: number, arma: ArmaPose) {
  plantar(p, [-3, 3.5], [2.4, 2], [26, 10]);
  const dosM = arma === 'dos';
  const cl: Clave[] = [
    K(0, { bajar: 3, torso: 10, ladeo: 0, giroTorso: 8, giroCadera: 4, lateral: 0, avanza: 0, manoD: [12, 8, 34], armaD: [70, 10], cabeza: -2, giroCabeza: -6, pasos: [-3, 3.5], alza: [0, 0], respira: 0.3, hombroI: [20, 18, 40, 10] }),
    K(1 / 8, { bajar: 3.6, torso: 4, giroTorso: 22, giroCadera: 8, lateral: 0.6, manoD: [4, 11, 46], armaD: [0, 40], cabeza: -4, giroCabeza: -14, respira: 0.8, hombroI: [40, 20, 40, 10] }),
    K(2 / 8, { bajar: 3.4, torso: -8, ladeo: 4, giroTorso: 33, giroCadera: 12, lateral: 1.1, avanza: -0.8, manoD: [-2, 11, 54], armaD: [-60, 20], alza: [0, 0.8], cabeza: -6, giroCabeza: -24, respira: 1, hombroI: [60, 24, 30, 10] }),
    K(3 / 8, { torso: -11, giroTorso: 36, manoD: [-3, 11, 55], armaD: [-72, 18], pasos: [-3, 4.6], alza: [0, 1.2], hombroI: [62, 24, 30, 10] }, true),
    K(4 / 8, { bajar: 7, torso: 30, ladeo: -3, giroTorso: -14, giroCadera: -14, lateral: -1, avanza: 2.6, manoD: [17, 3, 24], armaD: [140, -5], pasos: [-3, 6], alza: [0, 0], cabeza: 12, giroCabeza: 10, respira: 0.1, hombroI: [5, 24, 60, 30] }, true),
    K(5 / 8, { bajar: 7.4, torso: 32, giroTorso: -16, manoD: [17, 2, 22], armaD: [150, -8], hombroI: [0, 24, 65, 30] }),
    K(6 / 8, { bajar: 6.8, torso: 28, giroTorso: -12, manoD: [16, 4, 24], armaD: [146, -6] }, true),
    K(7 / 8, { bajar: 4.6, torso: 18, ladeo: -1, giroTorso: 0, giroCadera: -2, lateral: -0.3, avanza: 1.2, manoD: [14, 7, 30], armaD: [100, 5], cabeza: 4, giroCabeza: -2, pasos: [-3, 4.6], alza: [0, 0.5], respira: 0.4, hombroI: [15, 18, 45, 15] }),
  ];
  if (dosM) { p.agarreI = 6; p.pegaI = 1; cl.forEach((c) => delete c.v.hombroI); }
  actuar(p, cl, u, { lagCab: 0.05, lagArma: 0.03, capa: 1.2 });
}

/**
 * La lanza (8 cuadros, golpe en el 4): la derecha empuja desde la cadera y la izquierda guía adelante en el asta; se
 * recoge atrás con el peso en la pierna de atrás, da la estocada con medio paso y la retira.
 */
function atacarLanza(p: Pose, u: number) {
  plantar(p, [-3, 3.5], [2, 1.6], [26, 10]);
  p.agarreI = -9; p.pegaI = 1; p.poloI = [-0.3, -1, -0.5];
  actuar(p, [
    K(0, { bajar: 3, torso: 6, ladeo: 0, giroTorso: 10, giroCadera: 5, lateral: 0, avanza: 0, manoD: [2, 8, 34], armaD: [82, -6], cabeza: 0, giroCabeza: -8, pasos: [-3, 3.5], alza: [0, 0], respira: 0.3 }),
    K(1 / 8, { bajar: 3.4, torso: 1, giroTorso: 20, giroCadera: 9, lateral: 0.6, avanza: -0.8, manoD: [-3, 8.5, 35], armaD: [80, -4], giroCabeza: -16, respira: 0.8 }),
    K(2 / 8, { manoD: [-4, 8.5, 35.4], avanza: -1 }, true),
    K(3 / 8, { bajar: 3.8, torso: 8, giroTorso: 4, giroCadera: -4, lateral: 0, avanza: 0.6, manoD: [6, 7, 35.5], pasos: [-3, 4.8], alza: [0, 1] }),
    K(4 / 8, { bajar: 4.6, torso: 16, giroTorso: -14, giroCadera: -12, lateral: -0.8, avanza: 2.6, manoD: [15, 4, 36], armaD: [84, -3], cabeza: 4, giroCabeza: 10, pasos: [-3, 6], alza: [0, 0], respira: 0.1 }, true),
    K(5 / 8, { manoD: [15.5, 4, 35.6], torso: 17 }),
    K(6 / 8, { bajar: 3.8, torso: 10, giroTorso: 0, giroCadera: 0, lateral: -0.3, avanza: 1.2, manoD: [8, 6, 35], armaD: [82, -5], cabeza: 1, giroCabeza: -2, pasos: [-3, 4.6], alza: [0, 0.6] }),
    K(7 / 8, { bajar: 3.2, torso: 7, giroTorso: 8, giroCadera: 4, avanza: 0.3, manoD: [3, 7.8, 34.2], pasos: [-3, 3.7], alza: [0, 0.1] }),
  ], u, { lagCab: 0.04, lagArma: 0.02, capa: 1 });
}
/**
 * La bestia sin arma (necrófago): agazapada, el torso adelante y la cabeza baja, lanza un zarpazo de derecha cruzando
 * por delante (el golpe, cuadro 4) y lo remata con la izquierda; las manos siempre bajo la cabeza, nunca delante de la cara.
 */
function atacarBestia(p: Pose, u: number) {
  plantar(p, [-3, 3.5], [2.4, 2], [26, 12]);
  actuar(p, [
    K(0, { bajar: 4, torso: 18, ladeo: 0, giroTorso: 6, giroCadera: 3, lateral: 0, avanza: 0, manoD: [15, 8, 30], manoI: [15, -8, 30], cabeza: -14, giroCabeza: -6, respira: 0.4, hombros: [1, 1] }),
    K(1 / 8, { bajar: 4.6, torso: 14, giroTorso: 26, giroCadera: 10, lateral: 0.6, manoD: [4, 13, 34], manoI: [17, -6, 28], cabeza: -12, giroCabeza: -20, respira: 0.9 }),
    K(2 / 8, { giroTorso: 30, manoD: [2, 13.5, 35] }, true),
    K(3 / 8, { bajar: 5, torso: 20, giroTorso: 6, giroCadera: -6, manoD: [16, 9, 32], avanza: 0.8 }),
    K(4 / 8, { bajar: 5.8, torso: 28, giroTorso: -24, giroCadera: -14, lateral: -0.8, avanza: 2.2, manoD: [22, -4, 26], manoI: [12, -10, 28], cabeza: -10, giroCabeza: 16, respira: 0.1 }, true),
    K(5 / 8, { giroTorso: 14, giroCadera: 4, manoD: [14, 8, 27], manoI: [22, 3, 26], giroCabeza: -8 }),
    K(6 / 8, { manoI: [21, 4, 25.5], giroTorso: 18 }, true),
    K(7 / 8, { bajar: 4.4, torso: 20, giroTorso: 8, giroCadera: 3, lateral: 0, avanza: 0.6, manoD: [15, 8, 30], manoI: [15, -8, 30], cabeza: -14, giroCabeza: -6, respira: 0.4 }),
  ], u, { lagCab: 0.04, capa: 1 });
}

// ------------------------------------------------------------------ el ataque y el conjuro de cada clase (12 cuadros)
const c12 = (i: number) => i / 12;
/**
 * Berserker: recoge el arma por encima del hombro derecho con el torso echado atrás y girado, la cadera arranca primero,
 * descarga con todo el torso, el arma pasa de largo hacia abajo y el cuerpo sigue el peso; se recupera arrastrándola.
 */
function atacarBerserker(p: Pose, u: number, dosM: boolean) {
  plantar(p, [-3.5, 4], [2.4, 2], [28, 10]);
  // arranca y termina como la lleva (a dos manos al hombro; la de una mano baja y adelante): de ahí la sube al hombro
  // y la descarga, sin saltos de postura al entrar ni al salir del ataque
  const cl: Clave[] = [
    K(0, { bajar: 3, torso: 12, ladeo: 0, giroTorso: 8, giroCadera: 4, lateral: 0, avanza: 0, manoD: dosM ? [13, 9, 39] : [4, 10, 29], armaD: dosM ? [57, 168] : [128, 14], cabeza: -2, giroCabeza: -8, pasos: [-3.5, 4], alza: [0, 0], respira: 0.4, hombros: [0.8, 0.8], pegaI: 0 }),
    K(c12(1.2), { bajar: 3.6, torso: 14, giroTorso: 14, giroCadera: 6, manoD: dosM ? [8, 10, 44] : [5, 11, 38], armaD: dosM ? [24, 168] : [62, 24], respira: 0.2, pegaI: 0.4 }),
    K(c12(3), { bajar: 3, torso: 2, ladeo: 3, giroTorso: 26, giroCadera: 10, lateral: 0.8, avanza: -0.4, manoD: [3, 11.2, 49], armaD: [-30, -14], cabeza: -4, giroCabeza: -20, respira: 0.8, hombros: [1.2, 1], pegaI: 1 }),
    K(c12(5), { bajar: 3.2, torso: -8, ladeo: 5, giroTorso: 36, giroCadera: 14, lateral: 1.2, avanza: -0.8, manoD: [0, 11.2, 52], armaD: [-70, -18], cabeza: -6, giroCabeza: -30, alza: [0, 0.8], respira: 1, hombros: [1.5, 1] }, true),
    K(c12(6), { bajar: 3.6, torso: 4, ladeo: 2, giroTorso: 20, giroCadera: -8, lateral: 0.4, avanza: 0.6, manoD: [7.5, 10, 56], armaD: [-8, -2], cabeza: -6, giroCabeza: -14, pasos: [-3.5, 6], alza: [0, 1.6], respira: 0.6 }),
    K(c12(7), { bajar: 6.5, torso: 28, ladeo: -3, giroTorso: -12, giroCadera: -16, lateral: -1.2, avanza: 2.8, manoD: [16, 1.5, 25], armaD: [130, -2], cabeza: 12, giroCabeza: 10, pasos: [-3.5, 7], alza: [0, 0], respira: 0.1, hombros: [0, 0] }, true),
    K(c12(8), { bajar: 7, torso: 33, ladeo: -5, giroTorso: -24, giroCadera: -18, avanza: 3.2, manoD: [18, 1, 25], armaD: [150, -18], cabeza: 14, giroCabeza: 18 }),
    K(c12(9), { bajar: 6.6, torso: 31, giroTorso: -26, manoD: [17.5, 0.5, 25.5], armaD: [152, -20], pegaI: 1 }, true),
    // se endereza arrastrando el hacha por el costado derecho hasta la cadera
    K(c12(10.5), { bajar: 4.4, torso: 20, ladeo: -1, giroTorso: -2, giroCadera: -4, lateral: -0.3, avanza: 1.4, manoD: dosM ? [12, 8, 32] : [10, 9, 28], armaD: dosM ? [112, 20] : [140, 30], cabeza: 4, giroCabeza: 0, pasos: [-3.5, 5], alza: [0, 0.6], respira: 0.3, hombros: [0.6, 0.6], pegaI: 0.3 }),
  ];
  if (dosM) {
    p.agarreI = 6;
    actuar(p, cl, u, { lagCab: 0.04, lagArma: 0.025, capa: 1.1, pelo: 0.4 });
    p.pegaI = clamp(p.pegaI ?? 1, 0, 1);
    return;
  }
  // el hacha de una mano: el mismo camino con un solo puño; el brazo izquierdo abre para equilibrar y acompaña la descarga
  const izq: AngBrazo[] = [[10, 16, 22, 10], [20, 18, 30, 10], [50, 20, 40, 10], [62, 24, 30, 10], [40, 22, 45, 15], [4, 22, 65, 30], [0, 24, 70, 30], [0, 24, 70, 30], [18, 18, 40, 12]];
  actuar(p, cl.map((c, i) => { const v = { ...c.v, hombroI: izq[i] }; delete v.pegaI; return { ...c, v }; }), u, { lagCab: 0.04, lagArma: 0.03, capa: 1.1, pelo: 0.4 });
  p.pegaI = 0;
}
/** Templario: desde la guardia (la espada adelante a la altura del pecho, el escudo al frente), un tajo corto y firme con un medio paso, y vuelve a la guardia. */
function atacarTemplario(p: Pose, u: number, mano?: ManoPose) {
  void mano;
  plantar(p, [-2.6, 3.4], [1.4, 1.2], [20, 8]);
  const guardia: Vals = { bajar: 2.4, torso: 5, ladeo: 0, giroTorso: 10, giroCadera: 5, lateral: 0, avanza: 0, manoD: [13, 7, 38], armaD: [58, -8], cabeza: -1, giroCabeza: -8, pasos: [-2.6, 3.4], alza: [0, 0], respira: 0.3 };
  actuar(p, [
    K(0, guardia),
    K(c12(2), { bajar: 2.8, torso: 3, giroTorso: 22, giroCadera: 9, lateral: 0.5, manoD: [5, 11, 47], armaD: [-15, 25], cabeza: -2, giroCabeza: -18, respira: 0.8 }),
    K(c12(3), { manoD: [4.5, 11.2, 48], armaD: [-22, 26] }, true),
    K(c12(4), { bajar: 3, torso: 8, giroTorso: 6, giroCadera: -4, manoD: [12, 7, 46], armaD: [40, -10], pasos: [-2.6, 4.4], alza: [0, 0.9] }),
    K(c12(5), { bajar: 3.6, torso: 13, ladeo: -2, giroTorso: -14, giroCadera: -10, lateral: -0.6, avanza: 1.6, manoD: [20, 0, 33], armaD: [112, -38], cabeza: 3, giroCabeza: 10, pasos: [-2.6, 5], alza: [0, 0], respira: 0.1 }, true),
    K(c12(6), { torso: 14, manoD: [19.5, -1, 31.5], armaD: [118, -42] }, true),
    K(c12(8), { bajar: 3, torso: 8, ladeo: 0, giroTorso: 2, giroCadera: 0, lateral: 0, avanza: 0.8, manoD: [15, 5, 36], armaD: [75, -15], cabeza: 1, giroCabeza: -2, pasos: [-2.6, 4.2], alza: [0, 0.5] }),
    K(c12(10), guardia, true),
  ], u, { lagCab: 0.03, lagArma: 0.02, capa: 0.9 });
}
/** Cazadora: de perfil, tensa la cuerda hasta la mandíbula, sostiene la puntería, suelta (la mano sale atrás y el arco cede adelante y abajo: el retroceso), busca otra flecha y la monta. */
function atacarCazadora(p: Pose, u: number) {
  plantar(p, [-3.2, 3.6], [2.2, 1.6], [55, 12]);
  actuar(p, [
    K(0, { bajar: 1.8, torso: 2, ladeo: 0, giroTorso: 40, giroCadera: 20, lateral: 0.5, manoI: [22, -1, 45.5], manoD: [15, 0.8, 46], codoD: [-0.6, 0.6, 0.3], cabeza: 1, giroCabeza: -38, respira: 0.4 }),
    K(c12(1), { manoI: [23.5, 0.3, 47.5], manoD: [16.5, 0.6, 48.4], giroTorso: 46, giroCadera: 22, respira: 0.6, giroCabeza: -44 }),
    K(c12(3), { manoD: [8, 4, 49.2], codoD: [-1, 0.5, 0.45], giroTorso: 52, giroCadera: 25, lateral: 0.8, respira: 0.9 }),
    K(c12(4.5), { manoD: [1, 5.6, 48.8], manoI: [24.5, 1, 48.5], giroTorso: 54, giroCadera: 26, lateral: 0.9, ladeo: -2, respira: 1, giroCabeza: -50, cabeza: 0 }),
    K(c12(5.5), { manoD: [0.8, 5.7, 48.8], manoI: [24.6, 1, 48.6] }, true),
    K(c12(6), { manoD: [-4.5, 6, 50.4], manoI: [26.5, 0.8, 48], torso: -3, cabeza: -1, respira: 0.2, bajar: 2.2 }),
    K(c12(7), { manoD: [-5.5, 6.6, 50], manoI: [25.8, 0.6, 47.2], torso: -4, giroTorso: 56 }, true),
    K(c12(8.5), { manoD: [-3.5, 8, 55], codoD: [-0.2, 0.6, 0.8], manoI: [24, 0.2, 46.6], torso: 0, giroTorso: 48, ladeo: -1, cabeza: 1, bajar: 1.9 }),
    K(c12(10), { manoD: [12, 1.2, 47.5], codoD: [-0.6, 0.6, 0.3], manoI: [22.5, -0.5, 46], giroTorso: 42, ladeo: 0, respira: 0.5, giroCabeza: -40 }),
  ], u, { lagCab: 0.03, capa: 0.9, pelo: 0.3 });
  p.flecha = !(u >= 0.49 && u < 0.83);
}
/** Nigromante: lento y ceremonial; alza la daga sobre la cabeza, la sostiene y la hunde hacia abajo y adelante, y la retira despacio. */
function atacarNigromante(p: Pose, u: number) {
  plantar(p, [-2.2, 3], [1.4, 1.2], [20, 8]);
  actuar(p, [
    K(0, { bajar: 2, torso: 12, ladeo: 0, giroTorso: 4, giroCadera: 2, lateral: 0, avanza: 0, manoD: [9, 8, 31], armaD: [120, 10], cabeza: 2, giroCabeza: -4, respira: 0.2, hombros: [0.6, 0.8] }),
    K(c12(2), { bajar: 1.6, torso: 6, manoD: [8, 9, 42], armaD: [60, 15], cabeza: -4, respira: 0.6 }),
    K(c12(4), { bajar: 1, torso: -4, ladeo: 2, giroTorso: 12, giroCadera: 4, lateral: 0.4, manoD: [8, 9.5, 58], armaD: [-10, 10], cabeza: -14, giroCabeza: -6, respira: 1, hombros: [1.2, 0.8] }),
    K(c12(5.5), { manoD: [8.2, 9.6, 59], armaD: [-14, 10], torso: -5 }, true),
    K(c12(7), { bajar: 4.5, torso: 22, ladeo: -2, giroTorso: -10, giroCadera: -6, lateral: -0.4, avanza: 1.6, manoD: [18, 2, 30], armaD: [150, -10], cabeza: 10, giroCabeza: 6, respira: 0.1, hombros: [0.4, 0.6] }, true),
    K(c12(8), { manoD: [18.5, 2, 29], torso: 23 }, true),
    K(c12(10), { bajar: 2.8, torso: 15, ladeo: 0, giroTorso: 0, giroCadera: 0, lateral: 0, avanza: 0.6, manoD: [12, 6, 33], armaD: [125, 5], cabeza: 4, giroCabeza: -2 }),
  ], u, { lagCab: 0.05, lagArma: 0.03, capa: 0.8, tela: 1.2 });
}
/** Nigromante con la guadaña: la levanta atrás a la derecha, la sostiene y siega de derecha a izquierda por delante, y la deja ir con el peso. */
function atacarGuadana(p: Pose, u: number) {
  plantar(p, [-2.8, 3.4], [1.8, 1.4], [24, 10]);
  p.pegaI = 1;
  actuar(p, [
    K(0, { bajar: 2.4, torso: 10, ladeo: 0, giroTorso: 6, giroCadera: 3, lateral: 0, avanza: 0, manoD: [12, 8, 37], armaD: [35, -30], cabeza: 1, giroCabeza: -6, respira: 0.2 }),
    K(c12(1.2), { manoD: [10, 11, 42], armaD: [30, 20] }),
    K(c12(2.5), { bajar: 2.6, torso: 2, ladeo: 2, giroTorso: 28, giroCadera: 12, lateral: 0.8, manoD: [6, 12, 46], armaD: [30, 80], cabeza: -4, giroCabeza: -20, respira: 0.9 }),
    K(c12(5), { torso: 0, giroTorso: 34, manoD: [4, 12, 47], armaD: [42, 120], cabeza: -6, respira: 1 }, true),
    K(c12(7), { bajar: 4.5, torso: 16, ladeo: -2, giroTorso: -22, giroCadera: -14, lateral: -0.8, avanza: 1.6, manoD: [17, -2, 35], armaD: [95, -55], cabeza: 6, giroCabeza: 14, respira: 0.1 }, true),
    K(c12(8.5), { torso: 15, giroTorso: -32, manoD: [13, -6, 36], armaD: [100, -100] }),
    // vuelve por delante y sube por la derecha hacia el hombro (de ahí al reposo)
    K(c12(10.5), { bajar: 3, torso: 11, ladeo: 0, giroTorso: -2, giroCadera: 0, lateral: 0, avanza: 0.4, manoD: [9, 10.5, 42], armaD: [35, 70], cabeza: 2, giroCabeza: -4 }),
  ], u, { lagCab: 0.05, lagArma: 0.03, capa: 0.8, tela: 1.2 });
}
/** Alquimista: sube la ballesta con un respingo, apunta, dispara (la ballesta salta arriba y el cuerpo recula) y baja a recargar mirando el virote. */
function atacarAlquimista(p: Pose, u: number) {
  plantar(p, [-2, 3], [1.6, 1.2], [30, 8]);
  actuar(p, [
    K(0, { bajar: 1.8, torso: 5, giroTorso: 10, giroCadera: 5, lateral: 0, avanza: 0, manoD: [12, 3, 35], cabeza: 2, giroCabeza: -8, respira: 0.3 }),
    K(c12(1), { bajar: 2.2, manoD: [12, 3.4, 41], giroTorso: 15, respira: 0.7 }),
    K(c12(3), { bajar: 2.6, torso: 3, giroTorso: 22, giroCadera: 10, lateral: 0.5, manoD: [11, 3.5, 47], cabeza: 1, giroCabeza: -20 }),
    K(c12(4), { manoD: [11, 3.6, 47.2] }, true),
    K(c12(5), { bajar: 2.4, torso: -6, giroTorso: 25, manoD: [8, 4, 50.5], cabeza: -6, giroCabeza: -22, lateral: 0.9, avanza: -1, respira: 0.1 }),
    K(c12(6), { torso: -7, manoD: [7.5, 4, 51], avanza: -1.2 }, true),
    K(c12(8), { bajar: 2.2, torso: 4, giroTorso: 15, manoD: [12, 4, 38], cabeza: 4, giroCabeza: -12, avanza: 0, lateral: 0.3 }),
    K(c12(10), { bajar: 2.4, torso: 9, giroTorso: 9, manoD: [10, 6, 32], cabeza: 9, giroCabeza: -2, lateral: 0 }),
  ], u, { lagCab: 0.025, capa: 0.8, pelo: 0.3 });
}

/** Arcanista: baja las manos (anticipación), las alza abiertas subiendo en puntas de pie, sostiene y suelta todo hacia adelante. */
function lanzarArcanista(p: Pose, u: number, arma: ArmaPose) {
  plantar(p, [-1.2, 2.2], [0.8, 1], [14, 12]);
  const vara = arma === 'baculo';
  const cl: Clave[] = [
    K(0, { bajar: 1, torso: 2, ladeo: 0, lateral: 0.4, avanza: 0, puntillas: [0.2, 0.2], manoI: [8, -8, 32], codoI: [-0.3, -1, -0.5], manoD: [6, 9, 34], vara: [-2, 10], armaD: [60, 10], cabeza: 0, giroCabeza: -4, respira: 0.2, hombros: [0, 0] }),
    K(c12(2), { bajar: 2.2, torso: 6, puntillas: [0, 0], manoI: [7, -9, 27], manoD: [6, 9.5, 30], vara: [4, 8], armaD: [80, 10], respira: 0, cabeza: 3 }),
    K(c12(5), { bajar: -0.4, torso: -6, puntillas: [0.7, 0.7], manoI: [7, -13, 51], codoI: [0, -1, -0.6], manoD: [5, 12, 49], vara: [-12, 14], armaD: [-10, 20], cabeza: -16, respira: 1, hombros: [0.6, 0.6] }),
    K(c12(6.3), { manoI: [7.5, -13.5, 52], manoD: [5.5, 12.5, 50], puntillas: [0.8, 0.8], cabeza: -18 }, true),
    K(c12(7), { bajar: 1.4, torso: 12, puntillas: [0.1, 0.1], avanza: 1.6, manoI: [23, -3, 45], codoI: [-0.2, -1, -0.3], manoD: [18, 9, 45], vara: [40, -4], armaD: [85, -5], cabeza: 2, respira: 0.2, hombros: [0, 0] }, true),
    K(c12(8.5), { manoI: [22, -3.5, 43.5], torso: 11, avanza: 1.4 }),
    K(c12(10.5), { bajar: 1, torso: 3, avanza: 0.2, puntillas: [0.2, 0.2], manoI: [10, -7, 33], codoI: [-0.3, -1, -0.5], manoD: [7, 9, 35], vara: [0, 10], armaD: [60, 10], cabeza: 0 }),
  ];
  actuar(p, cl, u, { lagCab: 0.035, lagArma: 0.03, capa: 0.8, pelo: 0.4, tela: 1.4 });
  if (!vara) delete p.vara; else delete p.armaD;
}
/** Nigromante: junta algo del piso, alza la mano despacio hasta arriba de la cabeza, la sostiene temblando y la deja caer de golpe. */
function lanzarNigromante(p: Pose, u: number, arma: ArmaPose, mano?: ManoPose) {
  plantar(p, [-1.8, 2.8], [1.6, 1.4], [16, 12]);
  const cl: Clave[] = [
    K(0, { bajar: 2, torso: 14, ladeo: 0, giroTorso: 4, giroCadera: 2, lateral: 0, avanza: 0, manoI: [9, -6, 30], codoI: [-0.2, -1, -0.4], cabeza: 2, giroCabeza: -4, respira: 0.2, hombros: [0.6, 0.9] }),
    K(c12(1.5), { bajar: 3, torso: 18, manoI: [13, -5, 22], cabeza: 8, respira: 0 }),
    K(c12(4.5), { bajar: 1, torso: 2, ladeo: -2, giroTorso: -6, manoI: [11, -8, 48], codoI: [0, -1, -0.6], cabeza: -14, respira: 0.8, hombros: [0.8, 1.2] }),
    K(c12(6), { bajar: 0.4, torso: -5, manoI: [10, -7, 60], cabeza: -26, respira: 1 }),
    K(c12(7.2), { manoI: [10.4, -7.2, 61], cabeza: -28 }, true),
    K(c12(8), { bajar: 5, torso: 24, ladeo: 2, giroTorso: 6, manoI: [19, -5, 22], codoI: [0, -1, 0.2], cabeza: 12, respira: 0.1, hombros: [0.4, 0.6], avanza: 1.2 }, true),
    K(c12(9), { manoI: [19.5, -5, 21.5], torso: 25 }),
    K(c12(11), { bajar: 2.4, torso: 15, ladeo: 0, giroTorso: 4, manoI: [10, -6, 30], codoI: [-0.2, -1, -0.4], cabeza: 3, avanza: 0.2 }),
  ];
  actuar(p, cl, u, { lagCab: 0.05, capa: 0.8, tela: 1.3 });
  // la mano tiembla mientras sostiene
  if (u > 0.5 && u < 0.64 && p.manoI) { const tr = Math.sin(u * TAU * 9) * 0.45; p.manoI = [p.manoI[0] + tr * 0.4, p.manoI[1] + tr, p.manoI[2] + tr * 0.5]; }
  // la mano del arma, quieta abajo (a dos manos, al hombro como en quieto)
  if (arma === 'dos') { p.manoD = [5, 8.5, 40]; p.armaD = [50, 172]; p.pegaI = 0; }
  else { p.manoD = [8, 8.5, 31]; p.armaD = [125, 10]; }
  if (mano === 'escudo' && p.manoI) {
    // con escudo en la izquierda conjura la derecha (la daga en puño invertido) y el escudo queda bajo, adelante
    const g = p.manoI, cd = p.codoI ?? [-0.2, -1, -0.4];
    p.manoD = [g[0], -g[1], g[2]]; p.codoD = [cd[0], -cd[1], cd[2]]; p.armaD = [172, 0];
    p.manoI = [10, -6, 32]; delete p.codoI;
    p.giroTorso = -p.giroTorso; p.ladeo = -(p.ladeo ?? 0); p.giroCadera = -(p.giroCadera ?? 0);
    p.hombros = [p.hombros?.[1] ?? 0, p.hombros?.[0] ?? 0];
  }
}
/** Alquimista: saca el frasco del cinto mirando nerviosa, da un pasito atrás armando el brazo por encima del hombro y lo arroja adelante. */
function lanzarAlquimista(p: Pose, u: number) {
  plantar(p, [-2, 2.8], [1.4, 1.2], [20, 8]);
  p.pegaI = 0;
  actuar(p, [
    K(0, { bajar: 1.6, torso: 5, ladeo: 0, giroTorso: 6, giroCadera: 3, lateral: 0, avanza: 0, manoI: [6, -7, 31], codoI: [-0.4, -1, -0.4], cabeza: 0, giroCabeza: -6, pasos: [-2, 2.8], alza: [0, 0], respira: 0.3 }),
    K(c12(1.5), { manoI: [3, -7.5, 29], codoI: [-0.5, -1, -0.2], torso: 8, cabeza: 6, giroCabeza: 4 }),
    K(c12(3), { pasos: [-2, 1.4], alza: [0, 1.2], manoI: [-2, -9.5, 45], codoI: [-0.3, -1, 0.6], giroTorso: -16, giroCadera: -8, torso: -3, lateral: -0.4, cabeza: -4, giroCabeza: 14, respira: 0.9 }),
    K(c12(4.5), { pasos: [-2, 0.4], alza: [0, 0], manoI: [-4, -10, 49], torso: -6, giroTorso: -22, ladeo: 2 }, true),
    K(c12(6), { manoI: [17, -4, 48], codoI: [0, -1, -0.2], torso: 12, ladeo: -1, giroTorso: 14, giroCadera: 8, lateral: 0.6, avanza: 1.4, cabeza: 2, giroCabeza: -10, respira: 0.1 }),
    K(c12(7), { manoI: [21, -1.5, 37], torso: 15, giroTorso: 18 }),
    K(c12(8.5), { pasos: [-2, 1.6], alza: [0, 0.9], torso: 9, ladeo: 0, giroTorso: 8, giroCadera: 4, manoI: [12, -6, 33], codoI: [-0.4, -1, -0.4], avanza: 0.6 }),
    K(c12(10), { pasos: [-2, 2.8], alza: [0, 0], torso: 5, giroTorso: 6, giroCadera: 3, lateral: 0, manoI: [6, -7, 31], avanza: 0, cabeza: 0, giroCabeza: -6 }),
  ], u, { lagCab: 0.025, capa: 0.9, pelo: 0.5 });
  // la ballesta baja en la derecha, apuntando al piso
  p.manoD = [5, 9, 31]; p.armaD = [150, 10];
  p.alza = [0, Math.max(0, p.alza?.[1] ?? 0)];
}
/** Templario: alza la espada al cielo con el escudo al frente, la sostiene y la baja adelante de golpe (el aura sale ahí); vuelve a la guardia. */
function lanzarTemplario(p: Pose, u: number) {
  plantar(p, [-2.4, 3], [1.4, 1.2], [20, 8]);
  const guardia: Vals = { bajar: 2.4, torso: 5, ladeo: 0, giroTorso: 10, giroCadera: 5, lateral: 0, avanza: 0, manoD: [13, 7, 38], armaD: [58, -8], manoI: [10, -6, 34], cabeza: -1, giroCabeza: -8, respira: 0.3, hombros: [0, 0] };
  actuar(p, [
    K(0, guardia),
    K(c12(2), { bajar: 3, torso: 2, giroTorso: 6, manoD: [8, 11, 46], armaD: [5, 10], cabeza: -6, giroCabeza: -4, respira: 0.8 }),
    K(c12(4.5), { bajar: 1.2, torso: -4, giroTorso: 2, giroCadera: 2, manoD: [7, 10, 58], armaD: [-5, 8], cabeza: -18, giroCabeza: 0, respira: 1, hombros: [1, 0.4] }),
    K(c12(5.5), { manoD: [7.2, 10, 58.5], armaD: [-6, 8] }, true),
    K(c12(6), { bajar: 3.4, torso: 10, giroTorso: 4, manoD: [16, 6, 40], armaD: [80, -5], manoI: [15, -5, 37], avanza: 1.2, cabeza: 2, giroCabeza: -2, respira: 0.2, hombros: [0, 0] }),
    K(c12(7), { manoD: [16.5, 6, 40.5], armaD: [82, -5] }, true),
    K(c12(9.5), guardia),
  ], u, { lagCab: 0.035, lagArma: 0.025, capa: 1 });
}
/** Berserker: el grito de guerra; se recoge, se infla y ruge al cielo con el pecho afuera y el puño abierto al costado. */
function lanzarBerserker(p: Pose, u: number, arma: ArmaPose) {
  plantar(p, [-3, 3.2], [2.6, 2.4], [24, 12]);
  actuar(p, [
    K(0, { bajar: 3, torso: 12, ladeo: 0, cabeza: -6, giroCabeza: -4, hombros: [1.2, 1.2], respira: 0.3, manoI: [9, -9, 30], codoI: [-0.4, -1, -0.3] }),
    K(c12(2), { bajar: 5, torso: 24, cabeza: 6, respira: 1, hombros: [1.6, 1.6], manoI: [11, -8, 28] }),
    K(c12(4.5), { bajar: 2, torso: -6, cabeza: -22, giroCabeza: 0, respira: 1, hombros: [2.4, 2.4], manoI: [7, -15, 43], codoI: [-0.4, -1, -0.2] }),
    K(c12(6), { bajar: 1.6, torso: -12, cabeza: -30, respira: 1, hombros: [2.8, 2.8], manoI: [5, -17, 47] }, true),
    K(c12(8), { torso: -11, cabeza: -29, manoI: [5.5, -17.2, 47.5] }, true),
    K(c12(10), { bajar: 3.6, torso: 14, cabeza: -4, giroCabeza: -4, respira: 0.2, hombros: [1.2, 1.2], manoI: [9, -9, 30], codoI: [-0.4, -1, -0.3] }),
  ], u, { lagCab: 0.04, capa: 1, pelo: 0.6 });
  // el hacha sigue baja y atrás junto a la cadera, como en reposo: el grito es del cuerpo, no del arma
  if (arma === 'dos' || arma === 'una') { const k = clamp((p.hombros?.[0] ?? 1.2) - 1.2, 0, 1.6) / 1.6; p.manoD = [lerp(2, 0, k), lerp(10, 11, k), lerp(31, 33, k)]; p.armaD = [arma === 'dos' ? 142 : 152, 182]; p.codoD = [-0.6, 0.55, -0.6]; p.pegaI = 0; }
}

// ------------------------------------------------------------------ morir: con peso; cada cuerpo cae a su manera
/**
 * Las clases pesadas (berserker, templario) caen de rodillas y después de bruces; las ligeras caen de espaldas
 * (arcanista, nigromante) o de costado (cazadora a la derecha, alquimista a la izquierda); las demás se desploman
 * hacia adelante. En todas: el golpe, las rodillas que ceden, la caída que acelera, el contacto con rebote y el asiento.
 */
function morir(p: Pose, f: number, arma: ArmaPose, estilo?: Presentacion) {
  const i = Math.max(0, Math.min(7, Math.floor(f)));
  const tab = <T>(xs: T[]) => xs[i];
  const T2 = (xs: [number, number][]) => tab(xs);
  const T3 = (xs: [number, number, number][]) => tab(xs) as AngBrazo;
  const modo = estilo === 'rugido' || estilo === 'guardia' ? 'rodillas' : estilo === 'conjuro' || estilo === 'invoca' ? 'espaldas' : estilo === 'apunta' || estilo === 'frasco' ? 'costado' : 'adelante';
  p.avanza = tab([-1.2, -0.4, 0, 0, 0, 0, 0, 0]);
  p.capa = [tab([2, 0.5, -0.5, -1.5, -2, -1, 0.6, 0]), 0]; p.pelo = [tab([1.6, -0.6, -1, -1.6, -2, -1, 0.4, 0]), 0];
  if (modo === 'rodillas') {
    // cae de rodillas (el golpe de las rodillas en el piso), se balancea y se va de bruces
    p.caida = tab([0, 0, 0, 0, 0.18, 0.55, 1, 1]);
    p.bajar = tab([1.5, 7, 14, 14.5, 11, 6, 1.2, 0.6]);
    p.torso = tab([-14, 16, 6, 18, 24, 16, -4, -2]); p.cabeza = tab([-14, 22, 10, 26, 20, -10, 6, -8]);
    p.giroCabeza = tab([8, 6, 2, 4, 6, 10, 26, 34]); p.ladeoCabeza = tab([6, 4, 0, 6, 4, 0, 6, 10]);
    p.ladeo = tab([5, 3, -1, 3, 2, 0, 3, 4]); p.giroTorso = tab([12, 8, 2, 4, 2, -2, -6, -9]);
    p.caderaD = T2([[6, 10], [26, 72], [6, 100], [4, 102], [10, 80], [12, 45], [10, 18], [12, 20]]);
    p.caderaI = T2([[-6, 8], [18, 62], [12, 104], [10, 106], [14, 84], [10, 50], [2, 12], [2, 14]]);
    p.hombroD = T3([[35, 35, 50], [6, 16, 18], [4, 14, 14], [2, 12, 10], [30, 22, 20], [70, 40, 24], [18, 52, 30], [12, 48, 26]]);
    p.hombroI = T3([[28, 40, 65], [3, 14, 22], [2, 14, 16], [0, 12, 12], [25, 26, 24], [62, 44, 26], [14, 56, 36], [10, 52, 30]]);
    p.munecaD = tab([-10, 20, 25, 30, 10, -20, 10, 0]);
    // de rodillas el arma se le cae de punta al piso
    if (arma !== 'arco' && arma !== 'garras' && arma !== 'nada' && arma !== 'baculo') {
      if (i === 2 || i === 3) { p.armaD = [150, 20]; p.pisoArma = 1; }
      // al irse de bruces la suelta: queda casi tendida hacia adelante y al costado
      if (i === 4) p.armaD = [78, 50];
    }
  } else if (modo === 'espaldas') {
    // el golpe la echa atrás: da un paso, la barbilla se recoge en la caída y la cabeza golpea al llegar
    p.caidaDir = 180;
    p.caida = tab([0, 0, 0.1, 0.32, 0.68, 1, 0.95, 1]);
    p.bajar = tab([1.5, 3, 4, 3.5, 2.5, 1.5, 1, 0.6]);
    p.torso = tab([-14, -10, 4, 10, 14, 6, 10, 2]); p.cabeza = tab([-16, -12, 14, 20, 18, -8, 6, -6]);
    p.giroCabeza = tab([6, 8, 4, 2, 0, 6, 20, 30]); p.ladeoCabeza = tab([8, 6, 2, 0, 0, 4, 8, 10]);
    p.ladeo = tab([4, 5, 2, 0, -1, 0, 2, 3]); p.giroTorso = tab([10, 14, 8, 4, 0, -4, -6, -8]);
    p.avanza = tab([-1.2, -2, -1, 0, 0, 0, 0, 0]);
    p.caderaD = T2([[6, 10], [-8, 20], [14, 40], [28, 60], [34, 64], [30, 56], [26, 48], [28, 52]]);
    p.caderaI = T2([[-6, 8], [10, 30], [8, 24], [6, 16], [4, 10], [2, 6], [2, 6], [2, 8]]);
    p.hombroD = T3([[35, 35, 50], [45, 40, 40], [70, 40, 30], [85, 45, 25], [80, 50, 25], [30, 60, 30], [14, 62, 34], [10, 60, 30]]);
    p.hombroI = T3([[28, 40, 65], [40, 45, 50], [64, 44, 30], [80, 48, 26], [76, 52, 24], [26, 64, 34], [12, 66, 38], [8, 62, 34]]);
    p.munecaD = tab([-10, -15, -20, -10, 10, 20, 0, 0]);
    p.capa = [tab([2, 2.6, 3, 2, 1, 0, 0.4, 0]), 0];
  } else if (modo === 'costado') {
    // se dobla sobre la herida, gira y cae de costado; queda acurrucada
    const sg = estilo === 'apunta' ? 1 : -1;
    p.caidaDir = 95 * sg;
    p.caida = tab([0, 0, 0.08, 0.3, 0.66, 1, 0.95, 1]);
    p.bajar = tab([1.5, 4, 6, 5, 3.5, 2, 1, 0.6]);
    p.torso = tab([-12, 10, 14, 10, 6, 4, 8, 6]); p.cabeza = tab([-12, 16, 14, 8, 2, -4, 4, 2]);
    p.giroCabeza = tab([8, 4, 0, -4, -6, -2, 6, 10])* sg; p.ladeoCabeza = tab([6, 2, 0, -4, -6, -2, 4, 6]) * sg;
    p.ladeo = tab([0, 4, 8, 6, 4, 0, -2, 0]) * sg; p.giroTorso = tab([12, 16, 20, 14, 8, 4, 0, 2]) * sg;
    p.caderaD = T2([[6, 10], [22, 60], [26, 70], [30, 64], [34, 60], [36, 58], [34, 54], [36, 56]]);
    p.caderaI = T2([[-6, 8], [14, 40], [16, 46], [18, 44], [16, 36], [14, 30], [12, 28], [14, 30]]);
    // el brazo de abajo queda tendido en el piso; el de arriba (el del lado contrario a la caída) no puede quedar en el
    // aire a la altura del hombro con el arma colgando: al tocar el piso se le cae por delante del pecho hasta el suelo
    // (`afuera` negativo lo cruza hacia el lado de la caída, que tumbado es hacia abajo)
    const abajo = T3([[35, 35, 50], [20, 30, 30], [40, 40, 30], [60, 46, 30], [70, 40, 40], [50, 30, 60], [46, 26, 64], [44, 24, 66]]);
    const arriba = T3([[28, 40, 65], [10, 24, 30], [30, 40, 30], [50, 46, 30], [66, 12, 40], [70, -38, 40], [66, -50, 34], [64, -54, 32]]);
    if (sg > 0) { p.hombroD = abajo; p.hombroI = arriba; } else { p.hombroD = arriba; p.hombroI = abajo; }
    p.munecaD = tab([-10, 10, 20, 10, 0, -10, 0, 0]);
    // la ballesta se suelta de la izquierda y cae con la mano que la tenía
    if (arma === 'ballesta' && i >= 4) p.pegaI = 0;
  } else {
    // se desploma hacia adelante: la caída acelera (gravedad), toca el piso en el 6 y en el 7 se asienta
    p.caida = tab([0, 0, 0.06, 0.22, 0.5, 0.86, 1, 1]);
    p.bajar = tab([1.5, 6.5, 8, 7, 5, 3, 1.2, 0.6]);
    p.torso = tab([-14, 18, 10, 2, -3, -5, -8, -3]); p.cabeza = tab([-14, 24, 20, 8, -4, -16, 6, -8]);
    p.giroCabeza = tab([8, 6, 2, 0, 2, 10, 26, 34]); p.ladeoCabeza = tab([6, 4, 0, -2, -2, 0, 6, 10]);
    p.ladeo = tab([5, 3, -2, -3, -2, 0, 3, 4]); p.giroTorso = tab([12, 8, 4, 2, 0, -2, -6, -9]);
    // los brazos se adelantan a frenar la caída y quedan abiertos
    p.hombroD = T3([[35, 35, 50], [6, 16, 18], [14, 22, 24], [45, 36, 30], [80, 48, 26], [70, 58, 22], [18, 52, 30], [12, 48, 26]]);
    p.hombroI = T3([[28, 40, 65], [3, 14, 22], [10, 24, 26], [38, 42, 34], [72, 52, 30], [60, 62, 26], [14, 56, 36], [10, 52, 30]]);
    p.caderaD = T2([[6, 10], [26, 72], [28, 84], [24, 66], [20, 46], [16, 30], [12, 20], [13, 22]]);
    p.caderaI = T2([[-6, 8], [18, 62], [22, 74], [16, 54], [8, 34], [2, 20], [0, 12], [1, 14]]);
    p.munecaD = tab([-10, 20, 30, 10, -20, -30, 10, 0]);
  }
  if (arma === 'arco') p.tensa = false;
  if (arma === 'dos') p.pegaI = 0;
  if (arma === 'baculo') p.vara = tab<[number, number]>([[-14, 8], [10, 14], [20, 20], [10, 30], [-10, 40], [-30, 50], [-60, 60], [-70, 62]]);
  // al tocar el piso el arma queda tendida sobre el suelo (no se clava): de costado va hacia adelante, si no al costado
  else if (arma !== 'arco' && arma !== 'garras' && arma !== 'nada' && i >= 5) p.armaD = modo === 'costado' ? [90, 0] : tab<[number, number]>([[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [86, 80], [90, 86], [90, 88]]);
}

/** Cómo va vestido y armado un personaje. */
export interface Atuendo {
  alto?: number; ancho?: number; // escala del cuerpo (1 = adulto); ancho engorda torso y miembros
  piel: string; pelo?: string; peinado?: 'corto' | 'largo' | 'cola' | 'calvo' | 'trenzas' | 'melena';
  barba?: boolean;
  torso: string; torsoDesnudo?: boolean; piernas: string; botas: string; guantes?: string;
  hombreras?: string; casco?: 'yelmo' | 'cuernos' | 'capucha' | 'corona' | 'cofia' | 'mascara';
  cascoMat?: string;
  falda?: { mat: string; largo: number; ancho: number }; // túnica, vestido, faldón (largo hasta abajo)
  capa?: string; cinturon?: string; peto?: string; tabardo?: string;
  arma?: 'espada' | 'hacha' | 'mandoble' | 'maza' | 'baculo' | 'arco' | 'lanza' | 'daga' | 'garras' | 'orbe' | 'nada';
  armaMat?: string; escudo?: 'redondo' | 'cometa' | 'torre' | null; escudoMat?: string;
  /** Ojos que brillan (no muertos, demonios). */
  ojos?: string;
  cuernos?: boolean; joroba?: number;
  /** Esqueleto: los miembros son huesos finos. */
  hueso?: boolean;
}

/** Arma las piezas del personaje en la dirección, la acción y el cuadro. */
export function figura(at: Atuendo, dir: Dir, acc: Accion, f: number): Pieza[] {
  const ps: Pieza[] = [];
  const S = (at.alto ?? 1), A = (at.ancho ?? 1) * S;
  const tipoArma = at.arma === 'mandoble' || at.arma === 'hacha' && (at.ancho ?? 1) > 1.15 ? 'dos' : at.arma === 'arco' ? 'arco' : at.arma === 'baculo' || at.arma === 'lanza' ? 'baculo' : at.arma === 'garras' ? 'garras' : at.arma === 'nada' || !at.arma ? 'nada' : 'una';
  const P = pose(acc, f, tipoArma as 'una');
  const th = (RUMBO[dir] * Math.PI) / 180;
  const F: V3 = [Math.cos(th), Math.sin(th), 0], R: V3 = [Math.sin(th), -Math.cos(th), 0];
  // de coordenadas del cuerpo (adelante, derecha, arriba) al mundo
  const W = (fw: number, rt: number, up: number): V3 => [F[0] * fw + R[0] * rt, F[1] * fw + R[1] * rt, up];
  const rad = (g: number) => (g * Math.PI) / 180;
  // la caída de morir: todo el cuerpo se va de espaldas girando alrededor de los talones
  const caer = (q: V3): V3 => {
    if (!P.caida) return q;
    const a = rad(-82 * P.caida);
    const fw = q[0] * F[0] + q[1] * F[1], rt = q[0] * R[0] + q[1] * R[1];
    const nf = fw * Math.cos(a) - q[2] * Math.sin(a), nz = Math.max(0.5, fw * Math.sin(a) + q[2] * Math.cos(a));
    return W(nf - 4 * P.caida, rt, nz);
  };
  const Wc = (fw: number, rt: number, up: number) => caer(W(fw + P.avanza, rt, up));
  // ---- cadera y piernas
  const zc = (31 - P.bajar) * S;
  const pierna = (s: number, [hz, rod]: [number, number]) => {
    const cad: V3 = [0, s * 3.6 * A, zc];
    const a1 = rad(hz), a2 = rad(hz - rod);
    const L1 = 14.5 * S, L2 = 14 * S;
    const rodilla: V3 = [cad[0] + Math.sin(a1) * L1, cad[1], cad[2] - Math.cos(a1) * L1];
    const tobillo: V3 = [rodilla[0] + Math.sin(a2) * L2, rodilla[1], rodilla[2] - Math.cos(a2) * L2];
    const ancho = at.hueso ? 0.45 : 1;
    const m = at.piernas;
    ps.push(...capsula(Wc(...cad), Wc(...rodilla), 3.3 * A * ancho, 2.4 * A * ancho, m));
    ps.push(...capsula(Wc(...rodilla), Wc(...tobillo), 2.4 * A * ancho, 1.6 * A * ancho, at.hueso ? m : at.botas));
    if (!at.hueso) ps.push(...capsula(Wc(rodilla[0] - 0.6 * S, rodilla[1], rodilla[2] - 3 * S), Wc(tobillo[0] - 0.4 * S, tobillo[1], tobillo[2] + 4 * S), 2.5 * A, 1.9 * A, at.botas));
    // pie hacia adelante (si la pierna va atrás, el pie apunta un poco abajo)
    const pz = Math.max(1.2 * S, tobillo[2] - 1.2 * S);
    ps.push(elipsoide(...Wc(tobillo[0] + 1.6 * S, tobillo[1], pz), 3.3 * S, 1.7 * A, 1.4 * S, { mat: at.botas, giro: RUMBO[dir], ...(P.caida ? {} : {}) }));
  };
  pierna(1, P.caderaD); pierna(-1, P.caderaI);
  // ---- pelvis, falda, torso
  const tor = rad(P.torso), gir = rad(P.giroTorso);
  // un punto del torso: girado sobre la vertical (giroTorso) e inclinado hacia adelante desde la cadera
  const T = (fw: number, rt: number, up: number): V3 => {
    const f2 = fw * Math.cos(gir) - rt * Math.sin(gir), r2 = fw * Math.sin(gir) + rt * Math.cos(gir);
    const dz = up - zc;
    return Wc(f2 * Math.cos(tor) + dz * Math.sin(tor), r2, zc + dz * Math.cos(tor) - f2 * Math.sin(tor) * 0.3);
  };
  if (at.hueso) {
    ps.push(elipsoide(...Wc(0, 0, zc + 1), 2.6 * S, 4.4 * A, 2.4 * S, { mat: at.torso }));
    ps.push(...capsula(T(0, 0, zc + 2 * S), T(-0.5 * S, 0, zc + 17 * S), 1 * S, 1 * S, at.torso));
    for (let i = 0; i < 5; i++) ps.push(elipsoide(...T(0.5 * S, 0, zc + (8 + i * 2.2) * S), (3.8 - i * 0.1) * S, (5.4 - Math.abs(i - 2) * 0.3) * A, 0.7 * S, { mat: at.torso, giro: RUMBO[dir] + P.giroTorso }));
  } else {
    ps.push(elipsoide(...Wc(0, 0, zc + 0.5 * S), 3.6 * A, 5.2 * A, 4.2 * S, { mat: at.piernas, giro: RUMBO[dir] }));
    const pecho = at.torsoDesnudo ? at.piel : at.torso;
    ps.push(elipsoide(...T(0.2 * S, 0, zc + 6.5 * S), 3.4 * A, 4.7 * A, 5 * S, { mat: pecho, giro: RUMBO[dir] + P.giroTorso }));
    ps.push(elipsoide(...T(0.6 * S, 0, zc + 12.5 * S), 4.3 * A, 6.4 * A, 5.6 * S, { mat: pecho, giro: RUMBO[dir] + P.giroTorso }));
    if (at.torsoDesnudo) {
      // pectorales y abdomen marcados
      for (const s of [1, -1]) ps.push(elipsoide(...T(3.6 * A, s * 2.8 * A, zc + 13.5 * S), 1.6 * A, 2.8 * A, 2.6 * S, { mat: at.piel, tono: 0.04, giro: RUMBO[dir] + P.giroTorso }));
      for (let i = 0; i < 2; i++) for (const s of [1, -1]) ps.push(elipsoide(...T(2.9 * A, s * 1.3 * A, zc + (5.5 + i * 3) * S), 1.2 * A, 1.4 * A, 1.4 * S, { mat: at.piel, tono: 0.03 }));
    }
    if (at.peto) ps.push(elipsoide(...T(0.8 * S, 0, zc + 12 * S), 4.8 * A, 6.6 * A, 6.2 * S, { mat: at.peto, giro: RUMBO[dir] + P.giroTorso }), elipsoide(...T(0.6 * S, 0, zc + 5.5 * S), 3.9 * A, 5.2 * A, 3.6 * S, { mat: at.peto, tono: -0.05, giro: RUMBO[dir] + P.giroTorso }));
    if (at.tabardo) ps.push(caja(...T(4.4 * A + (at.peto ? 0.6 : 0), 0, zc - 9 * S), 1, 5.5 * A, 22 * S, { mat: at.tabardo, giro: RUMBO[dir] + P.giroTorso, incl: -P.torso, inclEje: 'y' }));
    if (at.cinturon) ps.push(cilindro(...Wc(0, 0, zc + 2.2 * S), 4.4 * A, 2 * S, { mat: at.cinturon, r1: 4.6 * A }), elipsoide(...Wc(4.2 * A, 0, zc + 3.2 * S), 0.8, 1.6, 1.2, { mat: 'oro', giro: RUMBO[dir] }));
    if (at.falda) ps.push(cilindro(...Wc(0, 0, zc + 3 * S - at.falda.largo * S), 4.4 * A * at.falda.ancho, at.falda.largo * S, { mat: at.falda.mat, r1: 4.6 * A }));
    if (at.joroba) ps.push(elipsoide(...T(-3 * S, 0, zc + 15 * S), 4 * S * at.joroba, 6 * A, 4 * S, { mat: pecho, giro: RUMBO[dir] }));
  }
  // ---- capa (detrás, cae hasta las corvas)
  if (at.capa) {
    const z0 = zc + 17 * S, z1 = 12 * S;
    const ondea = acc === 'caminar' ? Math.sin((f / 8) * Math.PI * 2) * 2 : 0;
    const a = T(-4.5 * S, 6.5 * A, z0), b = T(-4.5 * S, -6.5 * A, z0);
    const c = Wc(-9 * S - ondea, -8 * A, z1), d = Wc(-9 * S - ondea, 8 * A, z1);
    const e = 0.9;
    ps.push(poliedro([a, b, c, d, add(a, F, -e), add(b, F, -e), add(c, F, -e), add(d, F, -e)], { mat: at.capa }));
  }
  // ---- brazos
  const hombroZ = zc + 16.5 * S;
  const brazo = (s: number, [adel, afuera, codo]: AngBrazo) => {
    const h0: [number, number, number] = [0, s * 6.6 * A, hombroZ];
    const a1 = rad(adel), b1 = rad(afuera) * s;
    const L1 = 11.5 * S, L2 = 10.5 * S;
    // dirección del brazo: abajo, girada hacia adelante (adel) y hacia afuera (afuera)
    const d1: V3 = [Math.sin(a1) * Math.cos(b1), Math.sin(b1), -Math.cos(a1) * Math.cos(b1)];
    const codoP: [number, number, number] = [h0[0] + d1[0] * L1, h0[1] + d1[1] * L1, h0[2] + d1[2] * L1];
    const a2 = rad(adel + codo);
    const d2: V3 = [Math.sin(a2) * Math.cos(b1 * 0.5), Math.sin(b1 * 0.5), -Math.cos(a2) * Math.cos(b1 * 0.5)];
    const mano: [number, number, number] = [codoP[0] + d2[0] * L2, codoP[1] + d2[1] * L2, codoP[2] + d2[2] * L2];
    const ancho = at.hueso ? 0.4 : 1;
    const brazoMat = at.torsoDesnudo || !at.torso ? at.piel : at.torso;
    ps.push(...capsula(T(...h0), T(...codoP), 2.4 * A * ancho, 2 * A * ancho, at.hueso ? at.torso : brazoMat));
    ps.push(...capsula(T(...codoP), T(...mano), 2 * A * ancho, 1.5 * A * ancho, at.hueso ? at.torso : at.guantes ?? at.piel));
    ps.push(esfera(...T(...mano), 1.7 * A * (at.hueso ? 0.7 : 1), { mat: at.hueso ? at.torso : at.guantes ?? at.piel }));
    if (at.hombreras) ps.push(elipsoide(...T(0, s * 6.8 * A, hombroZ + 0.8 * S), 3.4 * A, 3.2 * A, 2.4 * S, { mat: at.hombreras, giro: RUMBO[dir] + P.giroTorso }));
    else if (!at.hueso) ps.push(esfera(...T(0, s * 6.4 * A, hombroZ), 2.6 * A, { mat: at.torsoDesnudo ? at.piel : at.torso }));
    return { mano, codo: codoP, d2 };
  };
  const mD = brazo(1, P.hombroD), mI = brazo(-1, P.hombroI);
  // ---- cuello y cabeza
  const cz = hombroZ + 7.5 * S;
  const cab = (fw: number, rt: number, up: number): V3 => T(fw + Math.sin(rad(P.cabeza)) * (up - hombroZ) * 0.3, rt, up);
  ps.push(...capsula(T(0, 0, hombroZ), cab(0.4 * S, 0, cz - 3 * S), 1.9 * S, 1.8 * S, at.hueso ? at.torso : at.piel));
  const gD = RUMBO[dir] + P.giroTorso;
  ps.push(elipsoide(...cab(0.4 * S, 0, cz), 4.1 * S, 3.8 * S, 4.6 * S, { mat: at.piel, giro: gD }));
  // mandíbula y mentón
  ps.push(elipsoide(...cab(1.6 * S, 0, cz - 2.6 * S), 2.8 * S, 2.6 * S, 2.2 * S, { mat: at.piel, giro: gD }));
  // cara: cejas (sombra), ojos, nariz
  const ojo = at.ojos ?? 'negro';
  for (const s of [1, -1]) {
    ps.push(elipsoide(...cab(3.7 * S, s * 1.5 * S, cz + 0.2 * S), 0.6 * S, 0.75 * S, 0.55 * S, { mat: ojo }));
    ps.push(elipsoide(...cab(3.9 * S, s * 1.5 * S, cz + 1.1 * S), 0.7 * S, 1.3 * S, 0.45 * S, { mat: at.piel, tono: -0.05, giro: gD }));
  }
  ps.push(elipsoide(...cab(4.4 * S, 0, cz - 0.8 * S), 0.9 * S, 0.7 * S, 1.3 * S, { mat: at.piel, tono: 0.05, giro: gD }));
  if (at.hueso) ps.push(elipsoide(...cab(3.6 * S, 0, cz - 2.4 * S), 0.6 * S, 1.6 * S, 0.5 * S, { mat: 'negro' }));
  else ps.push(elipsoide(...cab(3.7 * S, 0, cz - 2.2 * S), 0.4 * S, 1.2 * S, 0.3 * S, { mat: at.piel, tono: -0.2, giro: gD }));
  if (at.barba) ps.push(elipsoide(...cab(2.4 * S, 0, cz - 3.2 * S), 2.6 * S, 3 * S, 2.6 * S, { mat: at.pelo ?? 'negro', giro: gD }));
  // pelo
  if (at.pelo && at.peinado !== 'calvo' && at.casco !== 'yelmo' && at.casco !== 'capucha') {
    // el pelo va arriba y atrás: la cara queda libre
    ps.push(elipsoide(...cab(-1.5 * S, 0, cz + 1.7 * S), 3.9 * S, 4.25 * S, 4.1 * S, { mat: at.pelo, giro: gD }));
    ps.push(elipsoide(...cab(0.8 * S, 0, cz + 3.4 * S), 3.2 * S, 3.6 * S, 1.6 * S, { mat: at.pelo, giro: gD }));
    if (at.peinado === 'largo' || at.peinado === 'melena') ps.push(elipsoide(...cab(-2.4 * S, 0, cz - 3.5 * S), 2.6 * S, (at.peinado === 'melena' ? 5.2 : 4.4) * S, 7 * S, { mat: at.pelo, giro: gD }));
    if (at.peinado === 'cola') ps.push(...capsula(cab(-3.6 * S, 0, cz + 1 * S), cab(-6 * S, 0, cz - 9 * S), 1.6 * S, 0.9 * S, at.pelo));
    if (at.peinado === 'trenzas') for (const s of [1, -1]) ps.push(...capsula(cab(-1 * S, s * 3.6 * S, cz - 1 * S), cab(0, s * 4.2 * S, cz - 11 * S), 1.1 * S, 0.8 * S, at.pelo));
  }
  // casco o tocado
  const cm = at.cascoMat ?? 'hierro';
  if (at.casco === 'yelmo') {
    ps.push(elipsoide(...cab(0.3 * S, 0, cz + 0.8 * S), 4.8 * S, 4.6 * S, 5 * S, { mat: cm, giro: gD }));
    ps.push(caja(...cab(4.6 * S, 0, cz - 0.2 * S), 1.2 * S, 6 * S, 0.9 * S, { mat: 'negro', giro: gD }));
    ps.push(caja(...cab(4.4 * S, 0, cz - 4.2 * S), 0.8 * S, 1.2 * S, 5 * S, { mat: cm, giro: gD, tono: 0.08 }));
  } else if (at.casco === 'cuernos') {
    ps.push(elipsoide(...cab(0, 0, cz + 2 * S), 4.5 * S, 4.4 * S, 3.4 * S, { mat: cm, giro: gD }));
    for (const s of [1, -1]) ps.push(palo(cab(0, s * 4 * S, cz + 2.5 * S), cab(1 * S, s * 8 * S, cz + 7 * S), 1.3 * S, { mat: 'hueso', r1: 0.2 }));
  } else if (at.casco === 'capucha') {
    ps.push(elipsoide(...cab(-0.6 * S, 0, cz + 0.6 * S), 5 * S, 4.9 * S, 5.4 * S, { mat: at.cascoMat ?? at.torso, giro: gD }));
    ps.push(elipsoide(...cab(2.4 * S, 0, cz - 0.3 * S), 2.4 * S, 3.3 * S, 3.8 * S, { mat: 'negro', giro: gD, tono: 0.1 }));
    for (const s of [1, -1]) ps.push(elipsoide(...cab(3.7 * S, s * 1.4 * S, cz + 0.2 * S), 0.55 * S, 0.7 * S, 0.5 * S, { mat: ojo }));
  } else if (at.casco === 'corona') {
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ps.push(cilindro(...cab(Math.cos(a) * 3.6 * S, Math.sin(a) * 3.6 * S, cz + 3.5 * S), 0.6 * S, 2.4 * S, { mat: 'oro', r1: 0.1 })); }
    ps.push(cilindro(...cab(0, 0, cz + 3 * S), 4 * S, 1.2 * S, { mat: 'oro' }));
  } else if (at.casco === 'cofia') ps.push(elipsoide(...cab(-0.6 * S, 0, cz + 2.6 * S), 4.3 * S, 4.4 * S, 2.9 * S, { mat: cm, giro: gD }));
  else if (at.casco === 'mascara') ps.push(elipsoide(...cab(1.4 * S, 0, cz - 1.8 * S), 3.4 * S, 3.6 * S, 2.6 * S, { mat: cm, giro: gD }));
  if (at.cuernos) for (const s of [1, -1]) { ps.push(palo(cab(0.5 * S, s * 2.6 * S, cz + 3 * S), cab(-1.5 * S, s * 4 * S, cz + 7 * S), 1 * S, { mat: 'hueso', r1: 0.4 })); ps.push(palo(cab(-1.5 * S, s * 4 * S, cz + 7 * S), cab(-4 * S, s * 4.5 * S, cz + 8 * S), 0.45 * S, { mat: 'hueso', r1: 0.1 })); }
  // ---- arma en la mano derecha (sale en la dirección del antebrazo) y escudo en la izquierda
  const am = at.armaMat ?? 'acero';
  const mano = mD.mano, dd = mD.d2;
  const punto = (k: number): V3 => T(mano[0] + dd[0] * k, mano[1] + dd[1] * k, mano[2] + dd[2] * k);
  const contra = (k: number): V3 => T(mano[0] - dd[0] * k, mano[1] - dd[1] * k, mano[2] - dd[2] * k);
  switch (at.arma) {
    case 'espada': ps.push(palo(contra(3 * S), punto(0.5), 0.8 * S, { mat: 'cuero' }), palo(punto(0.5), punto(2), 2.6 * S, { mat: am, r1: 2.6 * S }), palo(punto(1.5), punto(24 * S), 1.1 * S, { mat: am, r1: 0.3 })); break;
    case 'mandoble': ps.push(palo(contra(6 * S), punto(0.5), 0.9 * S, { mat: 'cuero' }), palo(punto(0.5), punto(1.8), 3.4 * S, { mat: am, r1: 3.4 * S }), palo(punto(1.5), punto(34 * S), 1.5 * S, { mat: am, r1: 0.4 })); break;
    case 'hacha': {
      ps.push(palo(contra(4 * S), punto(20 * S), 0.9 * S, { mat: 'madera' }));
      // la hoja sale hacia adelante del mango: cuña de metal con el filo curvo
      const c = punto(17 * S), e = add(c, F, 1), dz: V3 = [dd[0], dd[1], dd[2]];
      const fw: V3 = T(mano[0] + dd[0] * 17 * S + 7 * S, mano[1] + dd[1] * 17 * S, mano[2] + dd[2] * 17 * S);
      const lado = (v: V3, k: number): V3 => add(v, R, k);
      ps.push(poliedro([lado(add(c, dz, 3 * S), 0.7), lado(add(c, dz, -3 * S), 0.7), lado(add(c, dz, 3 * S), -0.7), lado(add(c, dz, -3 * S), -0.7),
        lado(add(fw, dz, 6 * S), 0.15), lado(add(fw, dz, -6 * S), 0.15), lado(add(fw, dz, 6 * S), -0.15), lado(add(fw, dz, -6 * S), -0.15)], { mat: am }));
      void e;
      break;
    }
    case 'maza': ps.push(palo(contra(3 * S), punto(15 * S), 0.8 * S, { mat: 'madera' }), esfera(...punto(16 * S), 2.8 * S, { mat: am })); break;
    case 'lanza': ps.push(palo(contra(18 * S), punto(26 * S), 0.7 * S, { mat: 'madera_lisa' }), palo(punto(26 * S), punto(33 * S), 1.2 * S, { mat: am, r1: 0.1 })); break;
    case 'baculo': {
      // el báculo va parado en la mano, apoyado en el piso, con la gema arriba (un poco inclinado hacia adelante)
      const m = T(...mano);
      const pie: V3 = [m[0] + F[0] * 1.5, m[1] + F[1] * 1.5, Math.max(0, m[2] - 22 * S)], tope: V3 = [m[0] + F[0] * 3, m[1] + F[1] * 3, m[2] + 26 * S];
      ps.push(palo(pie, tope, 0.8 * S, { mat: 'madera_lisa', r1: 0.7 * S }), elipsoide(...tope, 1.6 * S, 1.6 * S, 2.6 * S, { mat: 'madera_lisa' }), esfera(tope[0], tope[1], tope[2] + 3 * S, 2 * S, { mat: 'magia' }));
      break;
    }
    case 'daga': ps.push(palo(contra(2 * S), punto(10 * S), 0.8 * S, { mat: am, r1: 0.2 })); break;
    case 'garras': for (const s of [-1, 0, 1]) ps.push(palo(punto(0), T(mano[0] + dd[0] * 9 * S + s * 0.8, mano[1] + dd[1] * 9 * S + s * 1.2, mano[2] + dd[2] * 9 * S), 0.4 * S, { mat: am, r1: 0.1 })); break;
    case 'orbe': ps.push(esfera(...punto(2.5 * S), 2.4 * S, { mat: 'magia' })); break;
    case 'arco': {
      // el arco en la mano izquierda, vertical; la derecha tira de la cuerda
      const mi = mI.mano;
      const c: V3 = T(...mi);
      const arr: V3 = [c[0], c[1], c[2] + 14 * S], abj: V3 = [c[0], c[1], c[2] - 14 * S];
      const comba: V3 = add(c, F, 3 * S);
      ps.push(palo(arr, add(comba, [0, 0, 7 * S]), 0.6 * S, { mat: 'madera_lisa' }), palo(add(comba, [0, 0, 7 * S]), add(comba, [0, 0, -7 * S]), 0.7 * S, { mat: 'madera_lisa' }), palo(add(comba, [0, 0, -7 * S]), abj, 0.6 * S, { mat: 'madera_lisa' }));
      ps.push(palo(arr, T(...mano), 0.15 * S, { mat: 'cuerda' }), palo(T(...mano), abj, 0.15 * S, { mat: 'cuerda' }));
      break;
    }
  }
  if (at.escudo) {
    const c = T(mI.mano[0] + 1.5 * S, mI.mano[1] - 1 * S, mI.mano[2] + 3 * S);
    const sm = at.escudoMat ?? 'madera';
    if (at.escudo === 'redondo') ps.push(cilindro(...c, 7 * S, 1.4 * S, { mat: sm, eje: F }), esfera(...add(c, F, 1.4 * S), 1.6 * S, { mat: 'hierro' }));
    else { const al = at.escudo === 'torre' ? 26 : 18; ps.push(caja(...[c[0], c[1], c[2] - al * 0.45 * S] as V3, 1.6 * S, (at.escudo === 'torre' ? 13 : 11) * S, al * S, { mat: sm, giro: RUMBO[dir] + P.giroTorso }), caja(...[c[0] + F[0] * 0.9, c[1] + F[1] * 0.9, c[2] - al * 0.1 * S] as V3, 0.4, 2 * S, al * 0.6 * S, { mat: 'oro', giro: RUMBO[dir] + P.giroTorso })); }
  }
  return ps;
}

const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
/** Cápsula: cilindro que se afina con esferas en las puntas (miembros redondeados). */
export function capsula(a: V3, b: V3, r0: number, r1: number, mat: string): Pieza[] {
  return [palo(a, b, r0, { mat, r1 }), esfera(...a, r0, { mat }), esfera(...b, r1, { mat })];
}

// ------------------------------------------------------------------ manifiesto de animación de los héroes (lo lee el juego)
export interface ManifiestoAnimacion {
  version: number;
  /** Cuadros de los monstruos humanoides (sin clase): siguen como siempre. */
  monstruos: Record<Accion, number>;
  clases: Record<ClaseHeroe, {
    estilo: Presentacion;
    /** Lo que avanza el cuerpo (alto 1) en un ciclo completo de caminar y de correr: velocidad = zancada × alto / duración del ciclo. */
    zancada: { caminar: number; correr: number };
    acciones: Record<Exclude<Accion, 'presentar'>, AnimAccion & { fps: number; duracion: number; golpeEn?: number }>;
  }>;
}
/**
 * El manifiesto de cuadros por clase: cuántos cuadros tiene cada acción, a qué ritmo va (t = ticks por cuadro a 25 cps,
 * fps y duración del ciclo) y, al atacar y al lanzar, el índice del cuadro de impacto y golpeEn = impacto / cuadros (la
 * fracción de la acción en que cae el golpe si la acción corre pareja). Lo escribe scripts/animacion-heroes.ts en
 * src/engine/gotico/animacion_heroes.json.
 */
export function manifiestoAnimacion(): ManifiestoAnimacion {
  const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
  const { presentar: _p, ...monstruos } = CUADROS; void _p;
  return {
    version: 1,
    monstruos: monstruos as Record<Accion, number>,
    clases: Object.fromEntries(CLASES_HEROE.map((c) => {
      const estilo = ESTILO_CLASE[c];
      const acciones = Object.fromEntries((Object.keys(ANIM_HEROE[c]) as Accion[]).filter((a) => a !== 'presentar').map((a) => {
        const x = ANIM_HEROE[c][a];
        const o: AnimAccion & { fps: number; duracion: number; golpeEn?: number } = { ...x, fps: r4(25 / x.t), duracion: r4((x.cuadros * x.t) / 25) };
        if (x.impacto !== undefined) o.golpeEn = r4(x.impacto / x.cuadros);
        return [a, o];
      }));
      return [c, { estilo, zancada: { caminar: r4(zancada('caminar', 1, estilo)), correr: r4(zancada('correr', 1, estilo)) }, acciones }];
    })) as ManifiestoAnimacion['clases'],
  };
}
