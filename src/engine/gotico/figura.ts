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
export const CUADROS: Record<Accion, number> = { quieto: 4, caminar: 8, correr: 8, atacar: 8, lanzar: 8, herido: 4, morir: 8, presentar: 16 };

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
}

/**
 * Ciclo de una pierna en la marcha (p de 0 a 1, 0 = el talón toca el piso adelante). Devuelve [muslo, rodilla] en
 * grados. Apoyo: el muslo pasa de adelante hacia atrás a ritmo parejo; al caminar el pie plantado retrocede también a
 * ritmo parejo (la rodilla se acomoda a eso: el pie no patina ni se frena) y al correr la rodilla amortigua al pisar.
 * Vuelo: la rodilla sube y la pierna vuelve adelante; al caminar el pie llega adelante por el aire y recién ahí baja.
 */
export const APOYO = { caminar: 0.6, correr: 0.38 } as const;
function piernaMarcha(p: number, correr: boolean): [number, number] {
  p = ((p % 1) + 1) % 1;
  const ap = correr ? APOYO.correr : APOYO.caminar;
  const ade = correr ? 24 : 25, atr = correr ? 30 : 25;
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
    const rodilla = 16 + 24 * Math.sin(Math.PI * u);
    return [muslo, rodilla];
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
 * Cuánto avanza el cuerpo en un ciclo completo (8 cuadros) de caminar o correr, en unidades del mundo para un cuerpo
 * de alto 1: es lo que recorre el pie plantado mientras está apoyado, dividido por la parte del ciclo que apoya. El juego
 * mueve al personaje a esa velocidad (zancada × alto por ciclo) y los pies no patinan.
 */
export function zancada(acc: 'caminar' | 'correr', alto = 1): number {
  const correr = acc === 'correr', ap = correr ? APOYO.correr : APOYO.caminar;
  const x = (p: number) => { const [m, r] = piernaMarcha(p, correr); const a1 = (m * Math.PI) / 180, a2 = ((m - r) * Math.PI) / 180; return LARGO_MUSLO * Math.sin(a1) + LARGO_PIERNA * Math.sin(a2); };
  return ((x(0) - x(ap - 1e-6)) / ap) * alto;
}

/** Tipo de arma para la pose (lo que cambia cómo se agarra y cómo se mueve). */
export type ArmaPose = 'una' | 'dos' | 'arco' | 'baculo' | 'garras' | 'nada' | 'ballesta';

/** Lo que lleva la mano izquierda cuando la derecha empuña sola: un escudo o un objeto (orbe, libro, antorcha). */
export type ManoPose = 'escudo' | 'objeto';

export function pose(acc: Accion, f: number, arma: ArmaPose = 'una', estilo?: Presentacion, mano?: ManoPose): Pose {
  const p: Pose = { torso: 4, giroTorso: 0, cabeza: 0, bajar: 0, avanza: 0, hombroD: [8, 10, 18], hombroI: [6, 10, 16], caderaD: [2, 4], caderaI: [-2, 4], caida: 0 };
  const u = f / CUADROS[acc];
  if (estilo === 'kata' && acc !== 'presentar' && acc !== 'lanzar') monje(p, acc, u, f, arma);
  else if (estilo === 'naturaleza' && acc !== 'presentar') druida(p, acc, u, f, arma);
  else if (acc === 'quieto') quieto(p, u, arma, estilo);
  else if (acc === 'caminar' || acc === 'correr') marcha(p, u, acc === 'correr', arma);
  else if (acc === 'presentar') presentar(p, u, arma, estilo ?? 'guardia', mano);
  else if (acc === 'atacar') atacar(p, u, arma);
  else if (acc === 'lanzar') lanzar(p, u, arma);
  else if (acc === 'herido') herido(p, f, arma);
  else morir(p, f, arma, estilo);
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
  const gi = mano === 'escudo' ? 24 : 14, br = Math.sin(u * TAU), resp = p.respira ?? 0;
  if (acc === 'quieto') p.hombroI = [20 + resp * 1.5, 14, 72 + resp * 2, gi];
  else if (acc === 'caminar') p.hombroI = [20 + br * 2.5, 14, 74 - br * 2, gi];
  else if (acc === 'correr') p.hombroI = [24 + br * 3.5, 16, 76 - br * 3, gi];
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
  p.hombroD = [12 + 3 * k, 12, 24 + 5 * k, 8]; p.hombroI = [9 - 2 * k, 11, 18 + 4 * k, 12];
  p.munecaD = 3 * k2;
  p.capa = [0.7 + 0.2 * k, 0.3 * k2]; p.pelo = [0.2 * k, 0.2 * k2];
  // a dos manos: el mango cruzado delante del cuerpo, la cabeza del arma arriba a la izquierda; las dos manos en el mango
  if (arma === 'dos') { p.manoD = [9, 4.5, 33 + 0.6 * k]; p.armaD = [40 + 2 * k2, -28]; }
  if (arma === 'ballesta') { p.hombroD = [26 + 3 * k, 10, 60 + 4 * k, 0]; }
  // el arco cuelga natural de la izquierda, la cuerda recta; la derecha descansa
  if (arma === 'arco') { p.hombroI = [16 + 1.5 * k, 22, 18 + 2 * k, 0]; p.hombroD = [12 + 3 * k, 12, 26 + 5 * k, 8]; p.giroTorso = 5 + k; p.giroCadera = -2; p.tensa = false; }
  // la vara al costado y apenas atrás, con el remate afuera de la silueta de la cabeza (en diagonal, so y o, la vara
  // adelantada quedaba alineada con la cara y el remate la tapaba)
  if (arma === 'baculo') { p.hombroD = [6 + 2 * k, 24, 56 + 3 * k, 0]; p.vara = [-4 + 1.5 * k2, 10]; }
  if (arma === 'garras' || arma === 'nada') { p.hombroD = [16 + 3 * k, 14, 44 + 5 * k, 12]; p.hombroI = [14 + 2 * k, 14, 48 + 4 * k, 14]; }
  switch (estilo) {
    case 'rugido': // jadea encorvado, hombros arriba
      p.bajar += 2.2; p.torso += 9; p.cabeza -= 9; p.hombros = [1.3 + 0.9 * k, 1.2 + 0.9 * k]; p.respira = 0.2 + 0.8 * k;
      p.pasos = [-2.4, 2.8]; p.abre = [2.4, 2.2]; p.lateral = 0.3 + 0.2 * k; p.ladeoCadera = 1.5; break;
    case 'guardia': p.torso -= 1.5; p.lateral = 0.5 + 0.12 * k; p.ladeo = -0.8 - 0.4 * k; break;
    case 'conjuro': p.lateral = 1 + 0.2 * k; p.ladeoCadera = 3.6; p.ladeo = -2 - 0.6 * k; p.ladeoCabeza = 4 - 1.5 * k; p.abre = [0.4, 0.9]; p.pasos = [-0.8, 1.6]; break;
    case 'apunta': p.bajar += 0.8; p.giroTorso += 6; p.giroCabeza -= 5; break;
    case 'invoca': p.torso += 10; p.cabeza -= 7; p.hombros = [1 + 0.5 * k, 1.3 + 0.5 * k]; p.bajar += 1; break;
    case 'kata': p.bajar += 2.6; p.abre = [2.8, 2.8]; p.pasos = [-0.4, 0.8]; p.lateral = 0.2 + 0.2 * k; p.ladeoCadera = 0.8; break;
    case 'naturaleza': p.giroCabeza = -6 + 6 * k2; p.cabeza -= 2 * k; break;
    case 'frasco': p.ladeoCabeza = 5 - 2 * k; p.giroCabeza = -8 + 4 * k2; break;
  }
}

// ------------------------------------------------------------------ caminar y correr
function marcha(p: Pose, u: number, correr: boolean, arma: ArmaPose) {
  p.caderaD = piernaMarcha(u, correr); p.caderaI = piernaMarcha(u + 0.5, correr);
  p.suelo = true;
  const ap = correr ? APOYO.correr : APOYO.caminar;
  // el pie que apoya: 1 a mitad del apoyo; la cadera del pie en el aire cae y el peso pasa al que apoya
  const apoyo = (q: number) => { q = mod1(q); return q < ap ? Math.sin((Math.PI * q) / ap) : 0; };
  const peso = (q: number) => apoyo(q) - apoyo(q + 0.5);
  const dif = (q: number) => (piernaMarcha(q, correr)[0] - piernaMarcha(q + 0.5, correr)[0]) / 50; // +1: la derecha adelante
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
  const vaiv = (q: number) => -piernaMarcha(q, correr)[0] * (correr ? 1.4 : 0.8);
  const sD = lim(vaiv(u + 0.5 - 0.05)), sI = lim(vaiv(u - 0.05));
  const cD = lim(vaiv(u + 0.5 - 0.11)), cI = lim(vaiv(u - 0.11));
  if (correr) {
    p.hombroD = [sD + 10, 13, 78 + cD * 0.35, 16]; p.hombroI = [sI + 10, 13, 78 + cI * 0.35, 16];
    p.hombros = [0.3 + 0.3 * Math.sin((u - 0.1) * 2 * TAU), 0.3 + 0.3 * Math.sin((u - 0.1) * 2 * TAU)];
    const q = u % 0.5; p.vuelo = q > APOYO.correr ? Math.sin((Math.PI * (q - APOYO.correr)) / (0.5 - APOYO.correr)) * 2.2 : 0;
  } else {
    p.hombroD = [sD + 4, 9, 20 + Math.max(0, cD) * 0.75, 10]; p.hombroI = [sI + 4, 9, 20 + Math.max(0, cI) * 0.75, 10];
  }
  // la tela y el pelo se arrastran atrás y rebotan con cada pisada
  const rebote = Math.sin((u - 0.12) * 2 * TAU);
  p.capa = [(correr ? 4.4 : 2.6) + rebote * (correr ? 0.9 : 0.7), -peso(u - 0.14) * (correr ? 0.9 : 1.3)];
  p.pelo = [(correr ? 2.2 : 0.6) + rebote * 0.5, -peso(u - 0.16) * 0.8];
  const g = dif(u);
  // el arma de una mano cuelga adelante y abajo del puño: la muñeca compensa el vaivén del brazo (sin esto la hoja se
  // ponía horizontal al frente cuando el brazo iba adelante y caía de golpe en el cuadro siguiente)
  if (arma === 'una' && !correr) p.munecaD = -sD * 0.8 - 14;
  if (arma === 'dos') { p.manoD = correr ? [11, 3.5, 38 + Math.abs(rebote) * 0.6] : [10, 3.5, 33 + rebote * 0.4]; p.armaD = correr ? [30 + g * 5, -30] : [40 + g * 4, -28]; }
  if (arma === 'ballesta') { p.hombroD = [30 + g * 4, 8, 50 + g * 3, 0]; p.hombroI = [36 + g * 4, 14, 58]; p.munecaD = g * 4; }
  // el arco va en la izquierda, bajo y vertical al costado; la derecha se balancea libre (la cuerda queda recta)
  if (arma === 'arco') { p.hombroI = [sI * (correr ? 0.35 : 0.3) + 2, 14, (correr ? 34 : 14) + Math.max(0, cI) * 0.3, 0]; p.tensa = false; }
  // la vara al costado y apenas atrás: el remate queda afuera de la silueta de la cabeza en todas las direcciones
  if (arma === 'baculo') { p.hombroD = [6 + sD * 0.3, 22, 55, 0]; p.vara = [-3 + sD * 0.15, 9]; }
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
      // en reposo: cuánto se hunde, se encorva y levanta la cara
      const [b0, t0, c0] = una ? [2.6, 8, -10] : [4, 24, -16];
      const apoyado: Vals = una
        ? { agarreI: ag, bajar: b0, torso: t0, ladeo: -1, giroTorso: 4, giroCadera: 2, lateral: -0.3, ladeoCadera: -1, cabeza: c0, giroCabeza: -4, ladeoCabeza: 0, manoD: [9, 5.5, 34], armaD: [58, -72], pisoArma: 0 }
        : { agarreI: ag, bajar: b0, torso: t0, ladeo: -2, giroTorso: 4, giroCadera: 2, lateral: -0.3, ladeoCadera: -1, cabeza: c0, giroCabeza: -4, ladeoCabeza: 0, manoD: [12, 0, 32], armaD: [160, -4], pisoArma: 1 };
      // el hacha sube cruzada delante del pecho (la cabeza arriba a la izquierda, la derecha en la cadera) y de ahí se alza
      // atravesada sobre la cabeza, los brazos en V y los puños abiertos en el mango (la cabeza del hacha a la izquierda,
      // un poco más alta): los puños quedan por encima de la coronilla, nunca delante de la cara
      const sube: Vals = { agarreI: ag, manoD: [8, una ? 7 : 6.5, una ? 36 : 38], armaD: [una ? 62 : 50, -72] };
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
        K(0.56, { agarreI: ag, bajar: una ? 7 : 5.5, torso: una ? 32 : 26, ladeo: -3, giroTorso: 6, giroCadera: 4, lateral: -0.8, ladeoCadera: -2, respira: 0.3, hombros: [1, 1], cabeza: -12, ladeoCabeza: -1, manoD: [13, 1.5, 30], armaD: [150, -4], pisoArma: 1 }),
        K(0.64, { bajar: una ? 6.5 : 5, torso: una ? 33 : 28, cabeza: -12, manoD: [11, 1.5, 31], armaD: [158, -4], respira: 0.1 }, true),
      ];
      // el hacha corta sale del piso y vuelve a la guardia, cruzada delante del cuerpo
      if (una) cl.push(K(0.72, { bajar: 4.5, torso: 20, giroTorso: 5, cabeza: -10, manoD: [11, 4, 30], armaD: [100, -45], pisoArma: 0 }));
      cl.push(K(0.8, { ...apoyado, respira: 0.7, hombros: [2, 1.8] }), K(0.9, { respira: 0.1, hombros: [1.4, 1.2], torso: t0 + 1 }));
      actuar(p, cl, u, { lagCab: 0.035, capa: 1 });
      break;
    }
    case 'guardia': {
      // baja la espada atrás (anticipación), la sube en arco hasta el saludo con la guarnición ante el mentón, da el paso
      // a la guardia con el escudo al frente y respira firme; después la baja con aplomo
      plantar(p, [-3, 4], [1.6, 1.2], [28, 6]);
      actuar(p, [
        K(0, { bajar: 1.6, torso: 3, giroTorso: 6, giroCadera: 4, lateral: 0.2, ladeoCadera: 1, ladeo: -1, respira: 0.2, hombros: [0, 0], cabeza: 2, giroCabeza: -6, manoD: [6, 9, 25], armaD: [125, 18], manoI: [6, -7, 30] }),
        K(0.12, { bajar: 2.6, torso: 6, giroTorso: 12, lateral: 0.7, ladeoCadera: 2.5, manoD: [1, 9, 26], armaD: [155, 30], cabeza: 4 }, true),
        // la hoja sube en arco por el costado derecho (nunca barre por delante de la cara)
        K(0.22, { bajar: 1.6, torso: 1, giroTorso: 6, manoD: [6, 10, 36], armaD: [70, 60], cabeza: -1 }),
        // el saludo: la guarnición a la altura del mentón pero al costado derecho, la hoja vertical junto a la cara (no delante)
        K(0.3, { bajar: 0.6, torso: -3, giroTorso: 2, giroCadera: 2, lateral: 0, ladeoCadera: 0, ladeo: 0, respira: 1, hombros: [0.6, 0.5], cabeza: -5, giroCabeza: 0, manoD: [3, 12, 44], armaD: [-4, 16], manoI: [8, -7, 32] }),
        K(0.38, { bajar: 0.5, manoD: [3.5, 12, 45], armaD: [-8, 16] }, true),
        // en guardia la espada va adelante a la altura del pecho (por debajo del visor), junto al escudo
        K(0.5, { bajar: 3.2, torso: 8, giroTorso: 20, giroCadera: 10, lateral: -0.7, ladeoCadera: -2, ladeo: 1.5, respira: 0.3, hombros: [0.3, 0.3], cabeza: 2, giroCabeza: -16, manoD: [5, 9, 39], armaD: [68, -10], manoI: [12, -3, 37] }),
        K(0.64, { bajar: 2.8, respira: 0.9, hombros: [0.7, 0.6], manoD: [5, 9, 40], armaD: [64, -12], manoI: [12, -3, 38], cabeza: 0 }),
        K(0.78, { bajar: 3.3, respira: 0.1, hombros: [0.1, 0.1], manoD: [5, 9, 38.5], armaD: [70, -8], manoI: [12, -3, 36.5], cabeza: 2 }),
        K(0.9, { bajar: 2, torso: 4, giroTorso: 9, giroCadera: 5, lateral: 0, ladeoCadera: 0.5, ladeo: -0.5, respira: 0.3, cabeza: 2, giroCabeza: -8, manoD: [6, 9, 27], armaD: [112, 14], manoI: [7, -7, 31] }),
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
        K(0.34, { bajar: 2.5, torso: -1, ladeo: -2.5, giroTorso: 54, giroCadera: 26, lateral: 0.9, ladeoCadera: 2, manoI: [24.5, 0.5, 48.5], manoD: [1.5, 2.2, 50], codoD: [-1, 0.45, 0.5], cabeza: 0, giroCabeza: -50, ladeoCabeza: -4, respira: 1, hombros: [0.4, 0.8] }),
        K(0.48, { manoD: [1, 2.3, 50], respira: 0.85 }, true),
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
        const g = p.manoI;
        p.manoD = [g[0] - 1, 2, Math.max(26, g[2] - 3)]; p.armaD = [lerp(70, 12, clamp((g[2] - 5) / 55, 0, 1)), 10];
        delete p.manoI; delete p.codoI; delete p.codoD; p.agarreI = 7; p.pegaI = 1;
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
        K(0.14, { bajar: 7.6, lateral: 1.4, ladeoCadera: 2, giroCadera: 12, giroTorso: 24, ladeo: 1.5, manoI: [9, 0.5, 54], codoI: [0.1, -1, 0.35], cabeza: -2, giroCabeza: -22 }),
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
      p.varaPie = pie;
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
  const cint = (s: number): [number, number, number] => [-1, s * 0.35, -0.2]; // codo atrás: puño en la cintura
  const abajo = (s: number): [number, number, number] => [-0.3, s * 0.7, -1]; // codo abajo: guardia
  if (acc === 'quieto') {
    // de pie en postura baja, los puños en la cintura; respira hondo desde el vientre
    const k = 0.5 - 0.5 * Math.cos(u * TAU), k2 = Math.sin(u * TAU);
    plantar(p, [-1.2, 1.6], [2.4, 2.4], [22, 22]);
    p.bajar = 3.2 - 0.45 * k; p.torso = 3 - k; p.respira = 0.2 + k; p.hombros = [0.45 * k, 0.45 * k];
    p.lateral = 0.1; p.giroTorso = 4; p.giroCadera = 2; p.cabeza = -0.5 * k; p.giroCabeza = -3 + 2.5 * k2;
    p.manoD = [2, 7.4, 30.6 + 0.6 * k]; p.manoI = [2, -7.4, 30.6 + 0.6 * k]; p.codoD = cint(1); p.codoI = cint(-1);
    p.capa = [0.6, 0.2 * k2]; p.pelo = [0, 0];
  } else if (acc === 'caminar' || acc === 'correr') {
    const correr = acc === 'correr';
    marcha(p, u, correr, 'nada');
    if (!correr) {
      // erguido y sereno: las manos juntas delante del vientre, el torso apenas gira
      p.torso = 2; p.giroTorso *= 0.5; p.giroCabeza = -p.giroTorso * 0.9; p.respira = 0.4;
      const b = Math.sin((u - 0.1) * 2 * TAU) * 0.3;
      p.manoD = [8, 1.3, 32.5 + b]; p.manoI = [8, -1.3, 32.5 + b]; p.codoD = [-0.3, 1, -0.6]; p.codoI = [-0.3, -1, -0.6];
    } else {
      // guardia suelta: puños compactos que bombean cerca del cuerpo, los codos atrás
      p.torso = 11;
      const [d, i] = [p.hombroD, p.hombroI];
      p.hombroD = [d[0] * 0.8 + 2, 12, d[2] + 14, 22]; p.hombroI = [i[0] * 0.8 + 2, 12, i[2] + 14, 22];
    }
  } else if (acc === 'atacar') {
    // combo: directo de izquierda, cruzado de derecha y patada frontal con la pierna de atrás; cada puño vuelve a la guardia
    plantar(p, [-2.5, 3], [2.2, 1.8], [30, 10]);
    const GD: [number, number, number] = [8, 4.5, 42], GI: [number, number, number] = [12, -3, 43];
    actuar(p, [
      K(0, { bajar: 4, torso: 6, ladeo: 0, giroTorso: 12, giroCadera: 6, lateral: 0.2, manoD: GD, manoI: GI, codoD: abajo(1), codoI: abajo(-1), cabeza: 0, giroCabeza: -10, pasos: [-2.5, 3], alza: [0, 0], respira: 0.4 }),
      K(1 / 8, { torso: 8, giroTorso: 24, giroCadera: 9, lateral: -0.3, manoI: [24, -1.5, 45], giroCabeza: -22, respira: 0 }, true),
      K(2 / 8, { torso: 7, giroTorso: 10, giroCadera: -6, lateral: -0.4, manoI: GI, manoD: [6, 5.5, 41] }),
      K(3 / 8, { torso: 12, giroTorso: -26, giroCadera: -16, lateral: -0.9, ladeo: -2, manoD: [25, 0.5, 45], manoI: [10, -4, 43], giroCabeza: 22 }, true),
      K(4 / 8, { bajar: 3, torso: 2, giroTorso: 4, giroCadera: 0, lateral: -1.4, ladeo: 0, manoD: GD, manoI: [11, -3.5, 43], giroCabeza: -2, pasos: [4, 3], alza: [11, 0], respira: 0.6 }),
      K(5 / 8, { bajar: 3, torso: -10, giroTorso: 4, giroCadera: -8, lateral: -1.6, manoD: [6, 6, 41], manoI: [9, -5, 42], cabeza: 4, giroCabeza: 6, pasos: [21, 3], alza: [14, 0], respira: 0 }, true),
      K(6 / 8, { bajar: 3.4, torso: 2, giroTorso: 6, giroCadera: 0, lateral: -1, manoD: GD, manoI: GI, cabeza: 0, giroCabeza: -6, pasos: [6, 3], alza: [7, 0] }),
      K(7 / 8, { bajar: 3.8, torso: 5, giroTorso: 10, giroCadera: 5, lateral: -0.2, pasos: [-2, 3], alza: [0.6, 0], respira: 0.3 }),
    ], u, { lagCab: 0.03, capa: 0.8 });
    p.alza = [Math.max(0, p.alza?.[0] ?? 0), 0];
  } else if (acc === 'herido') {
    // encaja el golpe cubriéndose: los puños suben a la cara y la cadera se hunde
    const i = ((f % 4) + 4) % 4, tab = <T>(xs: T[]) => xs[i];
    plantar(p, [-2, 2.2], [2.2, 2], [24, 14]);
    p.torso = tab([-10, -14, -3, 4]); p.avanza = tab([-1.4, -2, -1, -0.3]); p.giroTorso = tab([10, 14, 8, 6]); p.giroCadera = tab([4, 7, 4, 3]);
    p.ladeo = tab([3, 5, 2, 0]); p.lateral = tab([0.5, 0.8, 0.3, 0]); p.bajar = tab([4, 5, 4.4, 3.8]);
    p.cabeza = tab([-6, -12, -2, 2]); p.giroCabeza = tab([8, 10, 3, -2]); p.ladeoCabeza = tab([5, 8, 2, 0]);
    p.manoD = tab<[number, number, number]>([[5, 4, 47], [3, 4.5, 48], [6, 4.5, 44], [8, 4.5, 42]]);
    p.manoI = tab<[number, number, number]>([[7, -3.5, 48], [5, -4, 49], [9, -3.5, 45], [12, -3, 43]]);
    p.codoD = abajo(1); p.codoI = abajo(-1); p.respira = tab([0.9, 0.5, 0.2, 0.3]);
    p.capa = [tab([2, 3, 1.2, 0.8]), tab([-0.5, -1, -0.3, 0])];
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
    marcha(p, u, correr, 'baculo');
    p.torso = correr ? 18 : 10; p.cabeza = correr ? -12 : -7;
    if (correr) { p.manoD = [10, 9, 35]; p.vara = [42, 3]; return; }
    // la vara se planta con el talón izquierdo (u = 0.5) y queda quieta en el piso mientras el cuerpo pasa sobre ella
    // (en el marco del cuerpo retrocede a la misma velocidad con que avanza el personaje); después vuela adelante
    const zan = zancada('caminar', 1), q = mod1(u - 0.5), delante = 12.5, recorre = zan * 0.5;
    if (q < 0.5) p.varaPie = [delante - recorre * (q / 0.5), 11.5, 0.5];
    else { const s2 = (q - 0.5) / 0.5, e = 0.5 - 0.5 * Math.cos(Math.PI * s2); p.varaPie = [lerp(delante - recorre, delante, e), 11.5, 0.5 + 3.2 * Math.sin(Math.PI * s2)]; }
    p.manoD = [6 + 3 * Math.cos(TAU * q), 9.5, 37 + 0.8 * Math.sin(TAU * q)];
    delete p.vara;
  } else if (acc === 'atacar') {
    // golpe de vara a dos manos: la carga atrás y arriba, el arco por encima y el golpe adelante con paso
    plantar(p, [-2.8, 3.6], [1.8, 1.4], [26, 10]);
    p.agarreI = 12; p.pegaI = 1;
    actuar(p, [
      K(0, { bajar: 2.5, torso: 10, giroTorso: 8, giroCadera: 4, lateral: 0, ladeo: 0, avanza: 0, manoD: [11, 4, 38], vara: [35, -35], cabeza: -6, giroCabeza: -8, respira: 0.3 }),
      K(1 / 8, { bajar: 3, torso: 2, giroTorso: 26, giroCadera: 10, lateral: 0.7, ladeo: 3, manoD: [3, 9, 50], vara: [-25, 25], cabeza: -8, giroCabeza: -20, respira: 0.8 }),
      K(2 / 8, { bajar: 3.2, torso: -6, giroTorso: 32, giroCadera: 12, lateral: 0.9, ladeo: 4, manoD: [0, 9, 54], vara: [-50, 30], cabeza: -10, giroCabeza: -26, respira: 1 }, true),
      K(3 / 8, { bajar: 3.6, torso: 6, giroTorso: 6, giroCadera: -10, lateral: 0, ladeo: 0, manoD: [12, 5, 48], vara: [45, 0], cabeza: -6, giroCabeza: -6 }),
      K(4 / 8, { bajar: 5, torso: 22, giroTorso: -18, giroCadera: -12, lateral: -1, ladeo: -3, manoD: [17, 1, 36], vara: [100, -10], avanza: 2, cabeza: 4, giroCabeza: 14, respira: 0.2 }, true),
      K(5 / 8, { bajar: 5.3, torso: 25, giroTorso: -24, manoD: [16, -1, 32], vara: [118, -18], avanza: 2.3, cabeza: 6, giroCabeza: 18 }),
      K(6 / 8, { bajar: 4, torso: 16, giroTorso: -6, giroCadera: -3, lateral: -0.4, ladeo: -1, manoD: [13, 3, 37], vara: [70, -25], avanza: 1.2, cabeza: 0, giroCabeza: 2 }),
      K(7 / 8, { bajar: 2.8, torso: 11, giroTorso: 5, giroCadera: 2, lateral: 0, ladeo: 0, manoD: [11, 4, 38], vara: [40, -33], avanza: 0.3, cabeza: -5, giroCabeza: -8 }),
    ], u, { lagCab: 0.03, lagArma: 0.02, capa: 1 });
  } else if (acc === 'lanzar') {
    // apoyado en la vara, se agacha, la mano libre agarra la tierra y sube despacio arrancando raíces
    plantar(p, [-1.8, 2.6], [1.8, 1.6], [18, 12]);
    p.varaPie = [14, 12.5, 0.5];
    actuar(p, [
      K(0, { bajar: 1.6, torso: 9, ladeo: 0, lateral: 0.3, manoI: [6, -7, 30], manoD: [8, 9.5, 40], cabeza: -5, giroCabeza: -4, respira: 0.2 }),
      K(1 / 8, { bajar: 5, torso: 32, ladeo: -2, lateral: -0.3, manoI: [14, -5, 6], codoI: [0, -1, 0.4], manoD: [9, 9.5, 34], cabeza: 14, giroCabeza: -6, respira: 0 }),
      K(2 / 8, { bajar: 5.5, torso: 34, manoI: [15, -5, 3], cabeza: 16 }, true),
      K(3 / 8, { bajar: 3.5, torso: 18, ladeo: 0, manoI: [13, -7, 24], manoD: [8.5, 9.5, 38], cabeza: -4, respira: 0.6 }),
      K(4 / 8, { bajar: 1, torso: 0, ladeo: 1, lateral: 0.4, manoI: [9, -9, 50], codoI: [0, -1, -0.7], manoD: [7, 9.5, 42], cabeza: -18, giroCabeza: -8, respira: 1 }, true),
      K(5 / 8, { bajar: 1, torso: -2, manoI: [9.5, -9, 52], cabeza: -20 }),
      K(6 / 8, { bajar: 2, torso: 8, ladeo: 0, lateral: 0.3, manoI: [8, -8, 34], manoD: [7.5, 9.5, 40], cabeza: -4, giroCabeza: -4, respira: 0.3 }),
      K(7 / 8, { bajar: 1.6, torso: 9, manoI: [6, -7, 30], cabeza: -5 }),
    ], u, { lagCab: 0.035, capa: 1 });
  } else if (acc === 'herido') {
    herido(p, f, 'baculo');
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
    p.varaPie = [10, 9, 0.5];
    p.manoD = tab<[number, number, number]>([[7, 8.5, 40], [8, 8.5, 32], [8, 8, 26], [7, 8, 22], [7, 8, 22], [7, 8, 22], [7, 8, 22], [7, 8, 22]]);
    p.manoI = tab<[number, number, number]>([[6, -7, 32], [8, -6, 24], [7, -6, 18], [6, -5, 16], [6, -5, 16], [6, -6, 14], [6, -7, 12], [6, -7, 12]]);
    p.capa = [tab([2, 0.5, -0.5, -1, -1, -0.5, 0, 0]), 0]; p.pelo = [tab([1.4, -0.4, -0.8, -1.2, -1, -0.5, 0, 0]), 0];
  }
}

// ------------------------------------------------------------------ atacar: anticipación, contacto y recuperación (8 cuadros)
function atacar(p: Pose, u: number, arma: ArmaPose) {
  let cl: Clave[];
  if (arma === 'arco') {
    plantar(p, [-3.2, 3.6], [2.2, 1.6], [55, 12]);
    cl = [
      K(0, { bajar: 2, torso: 0, ladeo: 0, giroTorso: 46, giroCadera: 22, lateral: 0.6, manoI: [23.5, 0.3, 47.5], manoD: [17, 0.6, 48.4], codoD: [-0.6, 0.6, 0.3], cabeza: 0, giroCabeza: -44, respira: 0.6 }),
      K(1 / 8, { manoD: [8, 1.6, 49.4], codoD: [-1, 0.5, 0.45], giroTorso: 50, giroCadera: 24, lateral: 0.8, respira: 0.9 }),
      K(2 / 8, { manoD: [1.6, 2.2, 50], giroTorso: 54, giroCadera: 26, lateral: 0.9, ladeo: -2, respira: 1, manoI: [24.5, 0.5, 48.5], giroCabeza: -50 }),
      K(3 / 8, { manoD: [1.2, 2.3, 50] }, true),
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
      K(6 / 8, { bajar: 3.2, torso: 10, giroTorso: -4, giroCadera: -3, lateral: -0.3, ladeo: -0.5, manoD: [11, 6, 37], vara: [30, 0], avanza: 1.2, manoI: [9, -7, 34], cabeza: 2, giroCabeza: 2 }),
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

// ------------------------------------------------------------------ lanzar: junta energía, empuja y vuelve (8 cuadros)
function lanzar(p: Pose, u: number, arma: ArmaPose) {
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
    ? [{ manoD: [6, 8, 34], vara: [4, 3] }, { manoD: [4, 8, 40], vara: [-10, 5] }, { manoD: [3, 8, 44], vara: [-16, 6] }, { manoD: [12, 6, 44], vara: [42, 0] }, { manoD: [13, 6, 44.5], vara: [46, 0] }, {}, { manoD: [9, 7, 38], vara: [18, 2] }, { manoD: [7, 8, 35], vara: [6, 3] }]
    : arma === 'una'
      ? [{ manoD: [6, 9, 28], armaD: [120, 15] }, { manoD: [5, 9, 40], armaD: [20, 5] }, { manoD: [4, 8, 46], armaD: [-8, 0] }, { manoD: [7, 7, 53], armaD: [6, 0] }, { manoD: [7, 7, 54], armaD: [4, 0] }, {}, { manoD: [7, 8.5, 38], armaD: [70, 10] }, { manoD: [6, 9, 30], armaD: [110, 14] }]
      : arma === 'dos' || arma === 'ballesta'
        ? [{ manoD: [5, 9, 30], armaD: [140, 10], pegaI: 1 }, { pegaI: 0.3 }, { pegaI: 0 }, {}, {}, {}, { pegaI: 0.4 }, { pegaI: 1 }]
        : [{ manoD: [8, 7, 32] }, { manoD: [7, 1, 40] }, { manoD: [5, 2, 44] }, { manoD: [21, 1, 45] }, { manoD: [22, 1, 45.5] }, {}, { manoD: [13, 5, 37] }, { manoD: [9, 7, 33] }];
  cl.forEach((c, i) => Object.assign(c.v, der[i]));
  actuar(p, cl, u, { lagCab: 0.035, lagArma: 0.03, capa: 1 });
  if (arma === 'dos' || arma === 'ballesta') { if ((p.pegaI ?? 1) > 0.95) { if (arma === 'dos') { p.manoD = [9, 4.5, 33]; p.armaD = [40, -28]; } else { delete p.manoD; delete p.armaD; p.hombroD = [30, 8, 50, 0]; } } p.pegaI = clamp(p.pegaI ?? 1, 0, 1); }
}

// ------------------------------------------------------------------ herido: el golpe lo echa atrás, la cabeza latiguea
function herido(p: Pose, f: number, arma: ArmaPose) {
  const i = ((f % 4) + 4) % 4;
  plantar(p, [-2, 2.5], [1.4, 1.2], [18, 8]);
  const tab = <T>(xs: T[]) => xs[i];
  p.torso = tab([-12, -16, -4, 4]); p.avanza = tab([-1.6, -2.3, -1.2, -0.4]); p.giroTorso = tab([12, 16, 8, 4]); p.giroCadera = tab([5, 8, 4, 2]);
  p.ladeo = tab([4, 6, 2, 0]); p.lateral = tab([0.6, 0.9, 0.3, 0]); p.bajar = tab([1.6, 2.8, 2.4, 1.8]);
  p.cabeza = tab([-6, -16, -2, 3]); p.giroCabeza = tab([8, 12, 4, 0]); p.ladeoCabeza = tab([6, 10, 3, 0]);
  p.hombroD = tab<AngBrazo>([[30, 30, 45, 0], [40, 40, 55, 0], [20, 22, 40, 6], [14, 14, 30, 8]]);
  p.hombroI = tab<AngBrazo>([[25, 36, 60, 0], [35, 45, 75, 0], [18, 25, 50, 8], [12, 14, 30, 10]]);
  p.munecaD = tab([-10, -18, 8, 2]); p.respira = tab([0.8, 0.4, 0.1, 0.2]);
  p.capa = [tab([2.2, 3.4, 1.4, 0.9]), tab([-0.6, -1.2, -0.4, 0])]; p.pelo = [tab([1.6, 2.4, 0.6, 0.2]), tab([-0.5, -1, 0, 0])];
  if (arma === 'dos') { p.manoD = tab<[number, number, number]>([[6, 5, 35], [4, 6, 37], [7.5, 5, 34], [9, 4.5, 33]]); p.armaD = tab<[number, number]>([[25, -20], [15, -15], [32, -25], [40, -28]]); }
  if (arma === 'ballesta') { p.hombroD = tab<AngBrazo>([[40, 14, 60, 0], [48, 18, 70, 0], [34, 10, 55, 0], [30, 8, 50, 0]]); }
  if (arma === 'baculo') p.vara = tab<[number, number]>([[-14, 8], [-20, 10], [-4, 4], [3, 3]]);
  if (arma === 'arco') { p.hombroI = tab<AngBrazo>([[40, 30, 30, 0], [48, 36, 40, 0], [36, 20, 24, 0], [34, 14, 18, 0]]); p.tensa = false; }
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
    p.bajar = tab([1.5, 5, 6, 5, 3.5, 2, 1, 0.6]);
    p.torso = tab([-12, 10, 14, 10, 6, 4, 8, 6]); p.cabeza = tab([-12, 16, 14, 8, 2, -4, 4, 2]);
    p.giroCabeza = tab([8, 4, 0, -4, -6, -2, 6, 10])* sg; p.ladeoCabeza = tab([6, 2, 0, -4, -6, -2, 4, 6]) * sg;
    p.ladeo = tab([0, 4, 8, 6, 4, 0, -2, 0]) * sg; p.giroTorso = tab([12, 16, 20, 14, 8, 4, 0, 2]) * sg;
    p.caderaD = T2([[6, 10], [22, 60], [26, 70], [30, 64], [34, 60], [36, 58], [34, 54], [36, 56]]);
    p.caderaI = T2([[-6, 8], [14, 40], [16, 46], [18, 44], [16, 36], [14, 30], [12, 28], [14, 30]]);
    p.hombroD = T3([[35, 35, 50], [20, 30, 30], [40, 40, 30], [60, 46, 30], [70, 40, 40], [50, 30, 60], [46, 26, 64], [44, 24, 66]]);
    p.hombroI = T3([[28, 40, 65], [10, 24, 30], [30, 40, 30], [50, 46, 30], [60, 44, 40], [56, 30, 60], [52, 28, 66], [50, 26, 68]]);
    p.munecaD = tab([-10, 10, 20, 10, 0, -10, 0, 0]);
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
