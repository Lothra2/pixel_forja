import { rng, bayer, grain } from '../../fx/pix';
import { createRaster, type Raster } from '../../core/raster';
import { Lienzo } from './lienzo';
import { boxesOf, depthOf, floorAt, holeAt, waterAt, type Caja, type ObliqueLayout, type TipoPiso } from './layout';
import { VIETNAM_MANANA, paletaVietnam, type Color, type Paleta } from './paleta';
import { pintarPiso } from './piso';
import { cielo } from './cielo';
import { lejosDe, tonosDe } from './skyline';
import { piezaVietnam, posteLuz, toldo, cables, paloma, moto, MOTO_W, banquito, porton } from './calle';
import { filaVietnam, ropaTendida, nuevasAnclas, type Anclas, type Hueco } from './vietnam';
import { piezaSaigon, posteSaigon, arco, lamparasColgantes, redesPesca, cuerdasRopa, vallas } from './saigon';
import { PINTORES_CERCA, FONDO_CERCA, torreReloj, arcoSalida, type CtxCerca } from './fachadas';
import { MAS_OSCURO, nombreEn, corre, volumen, caraIzquierda, alLado, cizallarPiso, huecosJuntos, huecoInclinado, cantoSobreHueco, orillaAguaHonda } from './inclinada';
import { drawText, textWidth, LINE_H } from './letras';
import { fichaArte, type FichaArte } from './ficha';
import { vidaSaigon } from './vidaSaigon';
import { paletaColombia } from './colombiaPaleta';
import { PINTORES_C13, FONDO_C13, valleAburra, cabina, CABLE_Y, piezaColombia, posteColombia, banderaAsta, banderinesVida, ropaVida, tendedero, techoEscalera, peldano } from './comuna13';

/**
 * Un escenario oblicuo completo a partir del layout: todas las capas de 10.3, los objetos con su orden de dibujo,
 * la vida animada, luces, partículas y el mapa de superficie. Todo a escala 1 y con la paleta de la ficha.
 */

export const TROZO = 1280;
export const LEJOS_ALTO = 170;
export const PARALAJE = { cielo: 0, lejos: 0.25, cerca: 1, piso: 1, frente: 1 } as const;

export interface ObjetoEscena {
  id: string;
  tipo: string;
  /** De dónde sale: una caja del layout, el toldo (`bajo`), un poste. */
  origen: 'plataformas' | 'muros' | 'solidos' | 'bajo' | 'postes';
  img: Lienzo;
  /** Esquina de arriba a la izquierda en la pantalla, a escala 1. */
  x: number;
  y: number;
  /** Profundidad de mundo para ordenar con los atletas: se dibuja después de todo lo que tenga menor `orden`. */
  orden: number;
  superficie?: string;
}

export interface VidaEscena {
  id: string;
  tipo: string;
  /**
   * `tras_cerca` va entre la ciudad lejana y las casas (se ve por los callejones). `cerca` va encima de las casas.
   * `lejos` va pegada a la capa lejos (x e y en pixeles de esa imagen, que se repite) y se mueve por su `recorrido`.
   * `objeto` va encima de un objeto: se ordena con los atletas con su `orden`, como los objetos.
   */
  capa: 'tras_cerca' | 'cerca' | 'lejos' | 'objeto';
  x: number;
  y: number;
  cuadros: Lienzo[];
  fps: number;
  /** Para lo que cruza la pantalla: velocidad en px/s y cada cuántos segundos sale uno. */
  velocidad?: number;
  cada?: number;
  /** Para `lejos`: va de `desde` a `hasta` (pixeles de la capa lejos) en `segundos`, y vuelve a empezar. `desfase` (0 a 1) lo adelanta. */
  recorrido?: { desde: [number, number]; hasta: [number, number]; segundos: number; desfase?: number };
  /** Para `objeto`: la profundidad, como la de los objetos (setDepth(franja.atras + orden)). */
  orden?: number;
}

export interface Luz { x: number; y: number; color: string; radio: number; parpadeo?: number; latido?: number; encendida: boolean; nota: string }
export interface Particula { tipo: string; fx?: string; x0: number; x1: number; y0: number; y1: number; color?: string[]; cada: number; sube?: number; vida?: number; nota: string }
export interface Superficie { id: string; color: string; paso: string; resbala: boolean }

export interface Escena {
  layout: ObliqueLayout;
  /** La vista inclinada: px = x + inclinacion * y. 0 es el dibujo derecho de antes. */
  inclinacion: number;
  /** Ancho pintado de las capas largas: largo + inclinacion * D (la fila de adelante termina más a la derecha). */
  ancho: number;
  paleta: Paleta;
  ficha: FichaArte;
  cielo: Lienzo;
  lejos: Lienzo;
  cerca: Lienzo;
  piso: Lienzo;
  pisoMojado: Lienzo | null;
  frente: Lienzo;
  /** Fila de pantalla donde empieza el frente. */
  frenteY: number;
  objetos: ObjetoEscena[];
  vida: VidaEscena[];
  luces: Luz[];
  particulas: Particula[];
  superficie: { img: Raster; leyenda: Superficie[] };
  huecos: Hueco[];
}

/** La paleta del país a la hora del layout (y con el clima de ese día, el primero de `clima`). */
const PALETAS: Record<string, (hora: string, clima: string[], tema?: string) => Paleta> = { vietnam: paletaVietnam, colombia: paletaColombia };

/** Los pintores de la capa cerca de todos los lugares, por tema, y el fondo por `paralaje.cerca`. */
const PINTORES: Record<string, (C: Lienzo, x0: number, x1: number, base: number, ctx: CtxCerca) => void> = { ...PINTORES_CERCA, ...PINTORES_C13 };
const FONDOS: Record<string, (C: Lienzo, x0: number, x1: number, base: number, ctx: CtxCerca) => void> = { ...FONDO_CERCA, ...FONDO_C13 };

/** Los letreros de salida y meta en el idioma del país. */
const PANCARTAS: Record<string, [string, string]> = { vietnam: ['XUẤT PHÁT', 'VỀ ĐÍCH'], colombia: ['SALIDA', 'META'], venezuela: ['SALIDA', 'META'], japon: ['START', 'GOAL'] };

/** La altura del piso en (x, y): la caja más alta que tenga debajo, o 0. */
export function sueloEn(L: ObliqueLayout, x: number, y: number): number {
  let h = 0;
  for (const b of boxesOf(L)) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.d) h = Math.max(h, b.z);
  return h;
}

/**
 * La caja sobre la que está parada otra (su huella cae entera adentro y es más baja): la base. Una caja encima de otra
 * se dibuja solo de la base para arriba y después de la base, así no la tapa.
 */
export function baseDe(b: Caja, todas: Caja[]): Caja | undefined {
  let mejor: Caja | undefined;
  for (const o of todas) if (o !== b && o.z < b.z && b.x >= o.x && b.x + b.w <= o.x + o.w && b.y >= o.y && b.y + b.d <= o.y + o.d && (!mejor || o.z > mejor.z)) mejor = o;
  return mejor;
}

/** El orden de dibujo de una caja: su borde de adelante, o justo después de la caja que tiene debajo. */
export function ordenCaja(b: Caja, todas: Caja[]): number {
  const base = baseDe(b, todas);
  return base ? ordenCaja(base, todas) + 0.3 : b.y + b.d;
}

/** Muros que llevan el portón de hẻm adelante cuando dejan paso: los de la calle, no los portones ni las casetas. */
const conPortonHem = (m: { tipo?: string }) => m.tipo === undefined || m.tipo === 'muro_alto' || m.tipo === 'muro_bajo';

/** El poste de luz de concreto de siempre (lleva cables a las casas y lámpara). */
const esPosteLuz = (p: { tipo?: string }) => p.tipo === undefined || p.tipo === 'poste_luz' || p.tipo === 'poste';

/** Temas de la capa cerca que tienen techo: adentro no cruzan cables ni palomas. */
const TECHADOS = new Set(['mercado_interior']);

/**
 * La capa cerca: la fila de casas tubo (o el fondo que pida `paralaje.cerca`) donde ningún tema tiene pintor, y en cada
 * rango con tema su pintor, recortado a su rango. Después lo que pasa por encima de los bordes: la torre del reloj y el
 * arco de salida del mercado.
 */
function pintarCerca(pal: Paleta, L: ObliqueLayout, huecos: Hueco[], seed: number, anclas: Anclas, ancho = L.largo): Lienzo {
  const W = ancho, FT = L.franja.atras;
  // lo que llega al final del mundo sigue hasta el borde del ancho pintado
  const fin = (x1: number) => (x1 >= L.largo ? W : x1);
  const conPintor = L.ranuras_deco.filter((r) => PINTORES[r.tema] && (r.capa === 'cerca' || r.capa === 'lejos')).map((r) => ({ ...r, x1: fin(r.x1) })).sort((a, b) => b.x1 - b.x0 - (a.x1 - a.x0));
  const ctx: CtxCerca = {
    seed,
    zonas: L.solidos.filter((b) => b.tipo).map((b) => ({ x0: b.x, x1: b.x + b.w, tipo: b.tipo! })).filter((z, i, a) => a.findIndex((q) => q.x0 === z.x0) === i && L.solidos.find((b) => b.x === z.x0)!.y < 50),
    huecos: L.huecos.filter((h) => (h.y0 ?? 0) === 0).map((h) => ({ x0: h.x0, x1: h.x1 })),
  };
  // los rangos sin pintor: casas tubo, o el fondo del lugar
  const libres: [number, number][] = [];
  let x = 0;
  for (const [a, b] of conPintor.map((r) => [r.x0, r.x1] as const).sort((p, q) => p[0] - q[0])) { if (a > x) libres.push([x, a]); x = Math.max(x, b); }
  if (x < W) libres.push([x, W]);
  const fondo = FONDOS[L.paralaje.cerca ?? ''];
  let C: Lienzo;
  if (fondo) { C = new Lienzo(W, FT, pal); for (const [a, b] of libres) recortado(C, fondo, a, b, ctx); }
  else {
    const temas = L.ranuras_deco.filter((r) => r.capa === 'cerca').map((r) => ({ x0: r.x0, x1: fin(r.x1), tema: r.tema }));
    const vacios = conPintor.map((r) => ({ x0: r.x0, x1: r.x1 }));
    // saigon_hem quedó aprobado con sus plantas bajas oscuras: los tramos nuevos las aclaran para la prueba 7
    const pieClaro = L.paralaje.cerca !== 'hem';
    C = filaVietnam(pal, W, FT, { huecos: huecos.filter((h) => !vacios.some((v) => h.x0 < v.x1 && h.x1 > v.x0)), temas, vacios, pieClaro, seed }, anclas);
  }
  for (const r of conPintor) recortado(C, PINTORES[r.tema], r.x0, r.x1, ctx);
  // la torre del reloj sobre la entrada del mercado y el arco de salida
  const portones = L.muros.filter((m) => m.tipo === 'porton_mercado').sort((a, b) => a.x - b.x);
  if (portones.length) {
    const ent = portones[0], sal = portones[portones.length - 1];
    if (L.ranuras_deco.some((r) => r.tema === 'calle_le_loi')) torreReloj(C, ent.x + Math.round(ent.w / 2), FT);
    if (sal.x !== ent.x) arcoSalida(C, sal.x + Math.round(sal.w / 2), FT);
  }
  return C;
}

/** Corre cada fila de una capa transparente del piso según su fondo (la de abajo de la franja, como la fila de adelante). */
function correrFilas(M: Lienzo, L: ObliqueLayout, k: number): Lienzo {
  const D = depthOf(L), out = new Lienzo(L.largo + corre(k, D), M.h, M.pal);
  for (let y = 0; y < M.h; y++) out.r.data.set(M.r.data.subarray(y * M.w * 4, (y + 1) * M.w * 4), (y * out.w + corre(k, Math.min(y, D))) * 4);
  return out;
}

/** Corre un pintor en un lienzo aparte y copia solo las columnas de su rango: nada se sale. */
function recortado(C: Lienzo, pintor: (C: Lienzo, x0: number, x1: number, base: number, ctx: CtxCerca) => void, x0: number, x1: number, ctx: CtxCerca) {
  const T = new Lienzo(C.w, C.h, C.pal);
  pintor(T, x0, x1, C.h, ctx);
  const a = Math.max(0, x0), b = Math.min(C.w, x1);
  for (let y = 0; y < C.h; y++) {
    const i = (y * C.w + a) * 4, j = (y * C.w + b) * 4;
    for (let k = i; k < j; k += 4) if (T.r.data[k + 3]) C.r.data.set(T.r.data.subarray(k, k + 4), k);
  }
}

/** Dónde se abren los callejones: cada 600 a 700 px, lejos de los canales, los muros y las orillas del tramo. */
export function elegirCallejones(L: ObliqueLayout): Hueco[] {
  const canales: Hueco[] = L.huecos.filter((h) => (h.y0 ?? 0) === 0 && h.caida === 'agua').map((h) => ({ x0: h.x0, x1: h.x1, tipo: 'canal' as const }));
  const ocupado = [
    ...canales.map((c) => [c.x0 - 70, c.x1 + 70]),
    ...L.muros.filter((m) => m.y === 0).map((m) => [m.x - 50, m.x + m.w + 50]),
    ...boxesOf(L).filter((b) => b.y < 6).map((b) => [b.x - 10, b.x + b.w + 10]),
    ...L.bajo.map((b) => [b.x0 - 10, b.x1 + 10]),
    ...L.postes.map((p) => [p.x - 30, p.x + 34]),
  ];
  const out: Hueco[] = [...canales];
  for (let x = 420; x < L.largo - 200; x += 640) {
    let cx = x;
    for (let k = 0; k < 8 && ocupado.some(([a, b]) => cx + 26 > a && cx < b); k++) cx += 60;
    if (ocupado.some(([a, b]) => cx + 26 > a && cx < b) || cx > L.largo - 200) continue;
    out.push({ x0: cx, x1: cx + 26, tipo: 'callejon' });
  }
  return out.sort((a, b) => a.x0 - b.x0);
}

/** Cajas que son un volumen macizo: muestran su cara izquierda. Las caladas o redondas (vallas, tanques, botes, carritos) no. */
const SIN_CARA = new Set(['valla', 'tanque_agua', 'bote_bambu', 'mesas_plasticas', 'banca', 'carrito_cafe', 'carrito_che', 'puesto_banhmi', 'carro', 'moto_estacionada', 'carrito_paletas', 'letras_comuna13', 'baranda']);

export function renderEscena(L: ObliqueLayout, seed = 42, k = 0): Escena {
  const pal = PALETAS[L.pais]?.(L.hora, L.clima, L.paralaje.cerca) ?? VIETNAM_MANANA;
  const lluvia = L.clima[0] === 'aguacero' || L.hora === 'aguacero';
  const FT = L.franja.atras, D = depthOf(L), W = L.largo, Wp = W + corre(k, D);
  const huecos = elegirCallejones(L);
  const anclas: Anclas = nuevasAnclas();

  // cielo y ciudad lejana
  const sky = cielo(pal, 640, 360, L.hora, seed, L.clima, L.paralaje.cerca);
  const lejos = L.paralaje.lejos === 'valle_de_aburra' ? valleAburra(pal, TROZO, LEJOS_ALTO, seed + 39) : lejosDe(L.paralaje.lejos, pal, TROZO, LEJOS_ALTO, seed + 39, tonosDe(L.hora, lluvia));

  // la fila de casas, o el fondo que pida cada tema
  const cerca = pintarCerca(pal, L, huecos, seed, anclas, Wp);

  // cables de los postes a las casas, en la capa de las casas
  const R = rng(seed * 3);
  const postes = [...L.postes].sort((a, b) => a.x - b.x);
  // los postes se paran en lo que tengan debajo (el piso o la caja): `alto` se mide desde ahí
  const top = (p: (typeof postes)[number]) => FT + p.y - sueloEn(L, p.x, p.y) - p.alto + 9; // fila de la cruceta
  for (const p of postes) {
    if (!esPosteLuz(p)) continue;
    const cx = p.x + 2 + corre(k, p.y);
    for (let k = 0; k < 6; k++) {
      const side = k % 2 ? 1 : -1, tx = cx + side * (70 + Math.floor(R() * 200)), ty = 100 + Math.floor(R() * 50);
      if (tx < 0 || tx >= W || !cerca.has(tx, ty)) continue;
      cables(cerca, cx + side * (6 + (k % 3) * 4), top(p) - 2, tx, ty, 1 + (k % 2), 4 + Math.floor(R() * 6), seed + k + p.x);
    }
  }
  // letreros de salida y meta colgados del cable
  const salida = L.entidades.find((e) => e.tipo === 'salida')?.x;
  const meta = L.entidades.find((e) => e.tipo === 'meta')?.x;
  const [tSalida, tMeta] = PANCARTAS[L.pais] ?? PANCARTAS.vietnam;
  // la pancarta cuelga sobre el piso donde está: si la meta queda arriba de una terraza, sube con ella
  // colgada del cable sobre la calle. Arriba de una terraza alta caería en la franja del marcador (filas 0 a 64):
  // ahí va en dos palos parados en el borde de adelante de la terraza (un objeto, más abajo)
  const enAlto = (x: number) => 96 - sueloEn(L, x, 0) < 64;
  if (typeof salida === 'number' && !enAlto(salida + 30)) pancarta(cerca, salida + 30, 96 - sueloEn(L, salida + 30, 0), tSalida);
  if (typeof meta === 'number' && !enAlto(meta)) pancarta(cerca, meta, 96 - sueloEn(L, meta, 0), tMeta);

  // piso, con la línea de salida, la de meta y las sombras de las cosas (pintado derecho; después se inclina)
  const piso = pintarPiso(pal, L, { seed: seed % 97 });
  if (typeof salida === 'number') for (let y = 2; y < D; y++) { piso.p(salida, y, 'luz'); piso.p(salida + 1, y, (y >> 2) % 2 ? 'luz' : 'cemento_claro'); }
  if (typeof meta === 'number') for (let y = 0; y < D; y++) for (let i = 0; i < 8; i++) piso.p(meta + i, y, ((i >> 2) + (y >> 2)) % 2 ? 'tinta' : 'luz');
  for (const b of boxesOf(L)) sombraCaja(piso, b.x, b.y, b.w, b.d, b.z, L);
  // en Colombia la calle de asfalto termina en un paso de cebra antes de la acera (la estación, el cruce)
  if (L.pais === 'colombia') for (const f of L.piso.filter((q) => q.tipo === 'asfalto' && q.x1 - q.x0 > 200)) {
    const x0 = f.x1 - 70;
    for (let y = 4; y < D - 4; y++) if ((y >> 3) % 2 === 0) for (let x = x0; x < x0 + 34; x++) if (!holeAt(L, x, y)) piso.p(x, y, 'cemento_claro');
    for (let y = 0; y < D; y++) piso.p(x0 - 6, y, 'amarillo');
  }
  for (const b of L.bajo.filter((q) => q.tipo === undefined || q.tipo === 'toldo')) for (let y = (b.y0 ?? 0) + 2; y < (b.y1 ?? D) + 2 && y < D; y++) for (let x = b.x0 + 6; x < b.x1 + 6 && x < W; x++) if (bayer(x, y) < 0.3 && !holeAt(L, x, y)) piso.p(x, y, floorAt(L, x, y) === 'acera' ? 'cemento' : 'asfalto');
  // umbral de baldosa en el paso del portón, con los rieles de la reja
  for (const m of L.muros.filter(conPortonHem)) {
    if (m.y + m.d >= D - 8) continue;
    for (let y = m.y + m.d; y < D; y++) for (let x = m.x - 2; x < m.x + m.w + 2; x++) {
      const borde = y === m.y + m.d || y === D - 1 || x === m.x - 2 || x === m.x + m.w + 1;
      piso.p(x, y, borde ? 'cemento' : ((x >> 2) + (y >> 2)) % 2 ? 'crema' : 'cemento_claro');
    }
    for (let x = m.x - 2; x < m.x + m.w + 34; x++) piso.p(x, D - 2, 'sombra');
  }
  // agua: río hondo, calle inundada o charco, según el nivel
  for (const a of L.agua) {
    if (a.nivel >= 12) rioHondo(piso, L, a.x0, a.x1, a.y0 ?? 0, a.y1 ?? D, seed);
    else if (a.nivel <= 2) charco(piso, a.x0, a.x1, a.y0 ?? 0, a.y1 ?? D, seed);
    else inundar(piso, cerca, a.x0, a.x1, a.y0 ?? 0, a.y1 ?? D, FT, seed);
  }

  // la vista inclinada: el piso se corre fila por fila, los huecos muestran sus paredes y adelante va el bordillo
  const pisoFinal = k > 0 ? cizallarPiso(piso, L, k, seed % 97) : piso;
  if (k > 0) {
    for (const h of huecosJuntos(L)) huecoInclinado(pisoFinal, L, h, k, seed % 97);
    cantoSobreHueco(pisoFinal, piso, L, k);
    orillaAguaHonda(pisoFinal, L, k);
  }

  // charcos que reflejan las casas: el hẻm amanece mojado (como en su concepto) y las azoteas con aguacero también
  if (L.paralaje.cerca === 'hem' || L.paralaje.cerca === 'azoteas' || lluvia) charcosConReflejo(pisoFinal, cerca, L, k, seed);

  // objetos: cajas, toldo y postes
  const objetos: ObjetoEscena[] = [];
  const todas = boxesOf(L);
  todas.forEach((b, i) => {
    const id = `${b.tipo ?? b.lista}_${i}`, tipo = b.tipo ?? b.lista, superficie = SUPERFICIE_CAJA[b.tipo ?? ''] ?? 'piedra';
    if (k > 0 && b.tipo === 'valla') {
      const v = vallas(pal, b.w, b.d, b.z, 16, k, b.y);
      objetos.push({ id, tipo, origen: b.lista, img: v.img, x: b.x + corre(k, b.y), y: FT + b.y - b.z, orden: b.y + b.d, superficie });
      return;
    }
    // una caja parada sobre otra: se dibuja de la base para arriba y después de la base
    const base = baseDe(b, todas), alto = b.z - (base?.z ?? 0), orden = ordenCaja(b, todas);
    const tema = L.ranuras_deco.find((r) => r.capa === 'cerca' && b.x + b.w / 2 >= r.x0 && b.x + b.w / 2 < r.x1)?.tema;
    const pz = (L.pais === 'colombia' ? piezaColombia(pal, b.tipo, b.w, b.d, alto, seed + i, { x: b.x, tema }) : null)
      ?? piezaSaigon(pal, b.tipo, b.w, b.d, alto, seed + i) ?? piezaVietnam(pal, b.tipo, b.w, b.d, alto, seed + i);
    // la línea de meta pintada en el techo de la caja donde cae
    if (typeof meta === 'number' && meta >= b.x && meta < b.x + b.w) lineaMeta(pz.img, meta - b.x, pz.sobre, b.d);
    if (k === 0) { objetos.push({ id, tipo, origen: b.lista, img: pz.img, x: b.x, y: FT + b.y - b.z - pz.sobre, orden, superficie }); return; }
    const v = volumen(pz.img, pz.sobre, b.d, b.y, k);
    objetos.push({ id, tipo, origen: b.lista, img: v.img, x: b.x + v.dx, y: FT + b.y - b.z - pz.sobre, orden, superficie });
    // la cara de la izquierda, en su propio objeto: delante de lo que va detrás de la caja y detrás de quien va a su lado
    if (SIN_CARA.has(b.tipo ?? '')) return;
    const c = caraIzquierda(pz.img, pz.sobre, b, alLado(b, todas), k, alto);
    if (c) objetos.push({ id: `${id}_cara`, tipo: `${tipo}_cara`, origen: b.lista, img: c.img, x: b.x + corre(k, b.y) + c.dx, y: FT + b.y - b.z + c.dy, orden: base ? orden - 0.1 : b.y + 0.1 });
  });
  L.bajo.forEach((b, i) => {
    const id = `${b.tipo ?? 'bajo'}_${i}`, tipo = b.tipo ?? 'bajo', w = b.x1 - b.x0, y0 = b.y0 ?? 0, y1 = b.y1 ?? D;
    if (b.tipo === 'lamparas_colgantes') { const l = lamparasColgantes(pal, w, y0, y1, b.z, 66 - FT, seed + i, k); objetos.push({ id, tipo, origen: 'bajo', img: l.img, x: b.x0 + l.dx, y: FT + l.top, orden: y1 }); return; }
    if (b.tipo === 'redes_pesca') { const r = redesPesca(pal, w, y1 - y0, b.z, seed + i, k, y0); objetos.push({ id, tipo, origen: 'bajo', img: r.img, x: b.x0 + r.dx, y: FT + y0 - b.z - 2, orden: y1 }); return; }
    if (b.tipo === 'tendedero') { const t = tendedero(pal, w, y0, y1, b.z, seed + i, k, sueloEn(L, b.x0 + 1, y0 + 1)); objetos.push({ id, tipo, origen: 'bajo', img: t.img, x: b.x0 + t.dx, y: FT + t.top, orden: y1 + 0.6 }); return; }
    if (b.tipo === 'techo_escalera') {
      // el techo va sobre los peldaños: las columnas bajan hasta el peldaño que tengan debajo
      const t = techoEscalera(pal, w, y0, y1, b.z, k, (xx) => sueloEn(L, b.x0 + xx, y1 - 1));
      objetos.push({ id, tipo, origen: 'bajo', img: t.img, x: b.x0 + t.dx, y: FT + t.top, orden: y1 + 0.6 });
      return;
    }
    if (b.tipo === 'ropa_tendida') { const c = cuerdasRopa(pal, w, y0, y1, b.z, 0, seed + i, k); objetos.push({ id, tipo, origen: 'bajo', img: c.img, x: b.x0 + c.dx, y: FT + c.top, orden: y1 }); return; }
    const t = toldo(pal, w, y1 - y0), tv = k > 0 ? volumen(t.img, 0, y1 - y0, y0, k) : { img: t.img, dx: 0 };
    objetos.push({ id, tipo, origen: 'bajo', img: tv.img, x: b.x0 + tv.dx, y: FT + y0 - b.z, orden: y1 });
  });
  // arcos sobre el paso entre dos pilares de un portón (mercado, estadio)
  const pilares = L.muros.filter((m) => m.tipo?.startsWith('porton_')).sort((a, b) => a.x - b.x || a.y - b.y);
  pilares.forEach((m, i) => {
    const n = pilares[i + 1];
    if (!n || n.x !== m.x || n.tipo !== m.tipo || n.y <= m.y + m.d) return;
    const est = m.tipo === 'porton_estadio';
    const a = arco(pal, m.w, m.y + m.d, n.y, Math.max(m.z, n.z), est ? 'VÀO' : 'CỬA NAM', est ? { viga: 'cemento_claro', borde: 'azul', placa: 'azul', letra: 'luz' } : undefined, k);
    objetos.push({ id: `arco_${i}`, tipo: 'arco', origen: 'muros', img: a.img, x: m.x + a.dx, y: FT + a.top, orden: a.orden });
  });
  // portón abierto donde un muro deja paso adelante: se lee por dónde se rodea
  L.muros.forEach((m, i) => {
    if (!conPortonHem(m) || m.y + m.d >= D - 8) return;
    const pt = porton(pal, m.w, m.y + m.d, D, m.z, 'HẺM 42', k);
    objetos.push({ id: `porton_${i}`, tipo: 'porton', origen: 'muros', img: pt.img, x: m.x + pt.dx, y: FT + pt.top, orden: D + 1 });
  });
  postes.forEach((p, i) => {
    const otro = (L.pais === 'colombia' ? posteColombia(pal, p.tipo, altoVisible(L, p), seed + i) : null) ?? posteSaigon(pal, p.tipo, p.alto, seed + i);
    const po = otro?.pieza ?? posteLuz(pal, p.alto, L.paralaje.cerca === 'hem' ? 'tinta' : 'asfalto');
    // parado en la caja que tenga debajo: va después de ella
    const caja = todas.filter((b) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.d).sort((a, b) => b.z - a.z)[0];
    const z0 = caja?.z ?? 0, orden = caja ? ordenCaja(caja, todas) + 0.2 : p.y;
    objetos.push({ id: `${p.tipo ?? 'poste'}_${i}`, tipo: p.tipo ?? 'poste', origen: 'postes', img: po.img, x: p.x + 2 + corre(k, p.y) - (otro?.cx ?? 22), y: FT + p.y - z0 - (p.tipo === 'asta_bandera' ? altoVisible(L, p) : p.alto) - 5, orden });
  });
  // la pancarta de una meta (o salida) arriba de una terraza alta: dos palos en el borde de adelante, 64 sobre el piso
  for (const [x, t] of [[typeof salida === 'number' ? salida + 30 : NaN, tSalida], [meta ?? NaN, tMeta]] as [number, string][]) {
    if (!Number.isFinite(x) || !enAlto(x)) continue;
    const yf = D - 3, caja = todas.filter((b) => x >= b.x && x < b.x + b.w && yf >= b.y && yf < b.y + b.d).sort((a, b) => b.z - a.z)[0];
    // la pancarta grande, con letra al doble, para que se lea desde lejos
    const z = caja?.z ?? 0, alto = 64, bw = textWidth(t) * 2 + 18, bh = 22, img = new Lienzo(bw + 6, alto + 2, pal);
    for (const px of [1, bw + 3]) { img.f(px, 4, 2, alto - 2, 'cemento_claro'); img.vl(px + 1, 4, alto - 2, 'asfalto'); }
    img.box(3, 2, bw, bh, 'rojo', 'vino'); img.hl(4, 3, bw - 2, 'salmon');
    for (let i = 4; i < bw + 2; i += 4) img.p(i, 2 + bh, 'vino');
    const T = new Lienzo(textWidth(t) + 2, LINE_H, pal);
    drawText(T, 0, 0, t, 'oro');
    for (let yy = 0; yy < T.h; yy++) for (let xx = 0; xx < T.w; xx++) if (T.has(xx, yy)) img.f(12 + xx * 2, 2 + 2 + (yy - 3) * 2, 2, 2, 'oro');
    objetos.push({ id: `pancarta_${t}`, tipo: 'pancarta', origen: 'postes', img, x: x - Math.floor(img.w / 2) + corre(k, yf), y: FT + yf - z - alto - 1, orden: (caja ? ordenCaja(caja, todas) : yf) + 0.6 });
  }
  if (k > 0) juntarEscaleras(objetos, todas, pal);
  objetos.sort((a, b) => a.orden - b.orden || a.x - b.x);

  // vida
  const vida: VidaEscena[] = [];
  if (L.vida.includes('ropa_tendida')) anclas.ropa.forEach((r, i) => {
    const cuadros = ([0, 1] as const).map((f) => { const c = new Lienzo(r.w + 2, 10, pal); ropaTendida(c, 0, 0, r.w, r.seed, f); return c; });
    vida.push({ id: `ropa_${i}`, tipo: 'ropa_tendida', capa: 'cerca', x: r.x, y: r.y, cuadros, fps: 2 });
  });
  if (L.vida.includes('cables_viento') || L.vida.includes('palomas')) {
    const xs = [-10, ...postes.map((p) => p.x + 2 + corre(k, p.y)), W + 10];
    for (let k = 0; k < xs.length - 1; k++) {
      const a = xs[k] + (k === 0 ? 0 : 14), b = xs[k + 1] - (k === xs.length - 2 ? 0 : 14), ya = k === 0 ? 60 : top(postes[k - 1]) - 2, yb = k === xs.length - 2 ? 60 : top(postes[k]) - 2;
      const x0 = Math.max(0, Math.min(a, b)), x1 = Math.min(W, Math.max(a, b)), sag = Math.round(Math.min(34, Math.max(8, (x1 - x0) / 40)));
      if (x1 - x0 < 20) continue;
      if (L.ranuras_deco.some((r) => TECHADOS.has(r.tema) && r.x0 < x1 && r.x1 > x0)) continue;
      const y0 = Math.min(ya, yb) - 2, h = Math.abs(ya - yb) + sag + 12;
      const cuadros = [0, 1].map((f) => { const c = new Lienzo(x1 - x0, h, pal); cables(c, a - x0, ya - y0, b - x0, yb - y0, 4, sag + f, seed + k); return c; });
      if (L.vida.includes('cables_viento')) vida.push({ id: `cables_${k}`, tipo: 'cables_viento', capa: 'cerca', x: x0, y: y0, cuadros, fps: 1 });
      else cerca.paste(cuadros[0], x0, y0);
      if (L.vida.includes('palomas')) {
        // una bandada chica parada en el cable, en el tercio del vano
        const px = x0 + Math.floor((x1 - x0) * (0.3 + R() * 0.4));
        const t = (px - a) / (b - a), py = Math.round(ya + (yb - ya) * t + Math.sin(t * Math.PI) * sag) - 6;
        const cuadros2 = [0, 1, 2, 3].map((f) => { const c = new Lienzo(34, 10, pal); for (let j = 0; j < 3; j++) paloma(c, j * 11 + (f === 1 && j === 1 ? 1 : 0), f >= 2 ? 2 + ((j + f) % 2) : 3, f >= 2, j % 2 ? -1 : 1); return c; });
        vida.push({ id: `palomas_${k}`, tipo: 'palomas', capa: 'cerca', x: px, y: py, cuadros: cuadros2, fps: 4 });
      }
    }
  }
  if (L.vida.includes('motos_fondo')) {
    const cuadros = [0, 1].map((f) => { const c = new Lienzo(MOTO_W, 40, pal); moto(c, 0, 40, f ? 'azul' : 'rojo', -1); jinete(c, f); return c; });
    vida.push({ id: 'motos_fondo', tipo: 'motos_fondo', capa: 'tras_cerca', x: W, y: FT - 22 - 40, cuadros, fps: 8, velocidad: -70, cada: 5 });
  }

  // la vida de los tramos del Cross: mercado, río, azoteas y estadio
  vida.push(...vidaSaigon(pal, L, Wp, seed));
  if (L.pais === 'colombia') vida.push(...vidaColombia(pal, L, k, seed, postes, todas));

  // luces y partículas
  const luces: Luz[] = [
    ...anclas.altares.map((a) => ({ x: a.x, y: a.y + 10, color: pal.rojo, radio: 12, latido: 0.5, encendida: true, nota: 'bombillo rojo del altar' })),
    ...postes.filter(esPosteLuz).map((p) => ({ x: p.x + 18 + corre(k, p.y), y: top(p) + 13, color: pal.oro, radio: 40, encendida: L.hora === 'noche' || L.hora === 'atardecer', nota: 'lámpara del poste: de día va apagada' })),
    ...postes.filter((p) => p.tipo === 'farol_rio').map((p) => ({ x: p.x + 2 + corre(k, p.y), y: FT + p.y - p.alto + 12, color: pal.luz, radio: 30, encendida: L.hora === 'noche' || L.hora === 'atardecer', nota: 'globos del farol del malecón' })),
    ...postes.filter((p) => p.tipo === 'torre_luz').map((p) => ({ x: p.x + 2 + corre(k, p.y), y: FT + p.y - p.alto + 13, color: pal.luz, radio: 90, encendida: L.hora !== 'manana' && L.hora !== 'mediodia', nota: 'focos de la torre del estadio' })),
  ];
  const particulas: Particula[] = [
    ...anclas.altares.map((a) => ({ tipo: 'humo', x0: a.x - 2, x1: a.x + 2, y0: a.y - 2, y1: a.y, color: [pal.cemento_claro, pal.cemento], cada: 0.5, sube: 14, vida: 1.8, nota: 'incienso del altar' })),
    ...anclas.buganvillas.map((b) => ({ tipo: 'petalo', fx: 'petalo_buganvilla', x0: b.x - 8, x1: b.x + 8, y0: b.y, y1: b.y + 4, cada: 4, nota: 'pétalos que caen de la buganvilla' })),
    ...anclas.aires.map((a) => ({ tipo: 'gota', x0: a.x, x1: a.x + 2, y0: a.y, y1: a.y, color: [pal.celeste], cada: 3, vida: 0.8, nota: 'gotera del aire acondicionado' })),
    ...L.agua.map((a) => ({ tipo: 'onda', fx: 'onda_charco', x0: a.x0 + corre(k, a.y0 ?? 0), x1: a.x1 + corre(k, a.y1 ?? D), y0: FT + (a.y0 ?? 0), y1: FT + (a.y1 ?? D), cada: 0.7, nota: `${a.nombre ?? 'agua'}: ondas sueltas, y salpicadura_piso a cada paso` })),
    ...(L.vida.includes('lluvia') ? [{ tipo: 'lluvia', fx: 'lluvia', x0: 0, x1: Wp, y0: 10, y1: 300, cada: 0.12, nota: 'el aguacero: parches de lluvia en mosaico que caen sobre toda la pantalla' }] : []),
    ...(L.vida.includes('charcos_crecen') ? L.agua.filter((a) => a.nivel <= 2).map((a) => ({ tipo: 'gota', fx: 'salpicadura_piso', x0: a.x0 + corre(k, a.y0 ?? 0), x1: a.x1 + corre(k, a.y1 ?? D), y0: FT + (a.y0 ?? 0), y1: FT + (a.y1 ?? D), cada: 0.25, nota: `${a.nombre ?? 'charco'}: la lluvia que cae en el charco` })) : []),
    ...(L.vida.includes('fuegos_artificiales') ? (['rojo', 'oro', 'azul', 'verde'] as const).map((c, i) => ({ tipo: 'fuegos', fx: `fuegos_artificiales_${c === 'oro' ? 'dorado' : c}`, x0: 200 + i * 400, x1: 400 + i * 400, y0: 20, y1: 80, cada: 1.6 + i * 0.3, nota: 'fuegos artificiales sobre el estadio cuando alguien llega' })) : []),
    ...L.huecos.filter((h) => h.caida === 'agua').map((h) => ({ tipo: 'brillo', x0: h.x0 + corre(k, h.y0 ?? 0), x1: h.x1 + corre(k, h.y1 ?? D), y0: FT + (h.y0 ?? 0) + 18, y1: FT + (h.y1 ?? D), color: [pal.luz, pal.cielo], cada: 0.9, vida: 0.4, nota: `${h.nombre ?? 'canal'}: brillitos en el agua` })),
  ];

  // primer plano: cosas sobre la acera de enfrente, sin tapar la franja
  const frenteY = FT + D - 14;
  const frente = new Lienzo(Wp, 360 - frenteY, pal);
  // con la vista inclinada, lo de adelante es el bordillo (va en el piso): el frente queda libre
  if (k === 0) primerPlano(frente, L, frenteY, seed);

  // piso mojado (si el clima trae aguacero): charcos y brillo, encima del piso
  const mojado = L.clima.includes('aguacero') || L.clima.includes('llovizna') ? mojar(pal, L, piso.h, seed) : null;
  const pisoMojado = mojado && k > 0 ? correrFilas(mojado, L, k) : mojado;

  return {
    layout: L, inclinacion: k, ancho: Wp, paleta: pal, ficha: fichaArte(L), cielo: sky, lejos, cerca, piso: pisoFinal, pisoMojado, frente, frenteY,
    objetos, vida, luces, particulas, superficie: superficie(L), huecos,
  };
}

const SUPERFICIE_CAJA: Record<string, string> = { carro: 'madera', puesto_banhmi: 'metal', cajas: 'plastico', moto_estacionada: 'metal', mesas_plasticas: 'plastico', tanque_agua: 'metal', kiosco: 'metal', muro_bajo: 'piedra', muro_alto: 'piedra' };

/** Pancarta de tela colgada de dos cuerdas, centrada en x, con la parte de arriba en la fila y. */
function pancarta(L: Lienzo, cx: number, y: number, texto: string, pie?: number) {
  const tw = textWidth(texto), w = tw + 12, x = Math.round(cx - w / 2), h = LINE_H + 5;
  if (pie !== undefined) for (const px of [x - 2, x + w + 1]) { L.f(px, y - 2, 2, pie - y + 2, 'cemento_claro'); L.vl(px + 1, y - 2, pie - y + 2, 'asfalto'); }
  else { L.vl(x + 2, y - 40, 40, 'sombra'); L.vl(x + w - 3, y - 40, 40, 'sombra'); }
  L.box(x, y, w, h, 'rojo', 'vino'); L.hl(x + 1, y + 1, w - 2, 'salmon');
  drawText(L, x + 6, y + 2, texto, 'oro');
  for (let i = 0; i < w; i += 4) L.p(x + i + 1, y + h, 'vino');
}

/** Sombra de una caja en el piso: hacia la derecha, como la luz que viene de arriba a la izquierda. */
function sombraCaja(P: Lienzo, x: number, y: number, w: number, d: number, z: number, L: ObliqueLayout) {
  const len = Math.min(12, Math.round(z * 0.3));
  for (let j = y; j < y + d; j++) for (let i = x + w; i < x + w + len; i++) {
    if (holeAt(L, i, j) || j >= depthOf(L)) continue;
    if (bayer(i, j) < 0.5 - (i - x - w) / (len * 3)) P.p(i, j, floorAt(L, i, j) === 'acera' ? 'cemento' : 'asfalto');
  }
}

/** Bajo el agua el piso se sigue viendo, teñido: así se lee que el agua es bajita (8 px). */
const BAJO_AGUA: Partial<Record<Color, Color>> = {
  asfalto_claro: 'canal', asfalto: 'verde_oscuro', cemento: 'canal', cemento_claro: 'menta', crema: 'menta', luz: 'cielo',
  terracota: 'verde', salmon: 'menta', sombra: 'verde_oscuro', tinta: 'verde_oscuro', verde: 'verde_oscuro', menta: 'canal',
};

/** La calle inundada: el piso teñido debajo, orillas con espuma que lamen, reflejos de las casas y basura flotando. */
function inundar(P: Lienzo, cerca: Lienzo, x0: number, x1: number, y0: number, y1: number, FT: number, seed: number) {
  const D = y1;
  const nombre = new Map(Object.entries(P.pal).map(([k, v]) => [v.toLowerCase(), k as Color]));
  const colorEn = (x: number, y: number): Color | undefined => {
    const i = (y * P.w + x) * 4, d = P.r.data;
    return nombre.get('#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join(''));
  };
  for (let y = y0; y < P.h; y++) {
    const wob = Math.round(Math.sin(y * 0.45 + seed) * 3 + Math.sin(y * 0.13) * 4);
    for (let x = x0 + wob; x < x1 + wob; x++) {
      if (x < 0 || x >= P.w) continue;
      const edge = Math.min(x - (x0 + wob), x1 + wob - 1 - x);
      if (edge < 2) { P.p(x, y, edge === 0 ? 'luz' : 'cielo'); continue; }
      if (edge < 5 && bayer(x, y) < 0.5) { P.p(x, y, 'celeste'); continue; }
      // reflejo de la casa de atrás en las primeras filas, cada vez más débil
      if (y < y0 + 30) {
        const cy = FT - 1 - (y - y0) * 2;
        if (cy >= 0 && cerca.has(x, cy) && bayer(x, y) < 0.45 - (y - y0) * 0.014) { P.p(x, y, 'celeste'); continue; }
      }
      const c = colorEn(x, y);
      P.p(x, y, (c && BAJO_AGUA[c]) ?? 'canal');
    }
  }
  const R = rng(seed + x0);
  // rizos de agua: rayitas claras en grupos
  for (let k = 0; k < (x1 - x0) / 5; k++) {
    const x = x0 + 6 + Math.floor(R() * (x1 - x0 - 12)), y = y0 + 3 + Math.floor(R() * (P.h - y0 - 5));
    const len = 2 + Math.floor(R() * 5);
    P.hl(x, y, len, R() < 0.25 ? 'luz' : 'cielo');
    if (R() < 0.4) P.hl(x + 2, y + 2, Math.max(1, len - 2), 'cielo');
  }
  // flotando: chancletas, cajas de anime, hojas, una bolsa
  for (let k = 0; k < (x1 - x0) / 60; k++) {
    const x = x0 + 20 + Math.floor(R() * (x1 - x0 - 40)), y = y0 + 10 + Math.floor(R() * (D - y0 - 20)), t = k % 4;
    P.hl(x - 1, y + 3, 9, 'cielo');
    if (t === 0) { P.f(x, y, 5, 2, 'rojo'); P.p(x + 1, y, 'vino'); P.p(x + 2, y + 1, 'vino'); }
    else if (t === 1) { P.f(x, y, 8, 4, 'luz'); P.hl(x, y + 4, 8, 'cemento_claro'); }
    else if (t === 2) { P.p(x, y, 'verde'); P.p(x + 1, y, 'verde_oscuro'); P.p(x + 2, y + 1, 'verde'); P.p(x + 1, y + 1, 'verde'); }
    else { P.f(x, y, 4, 3, 'azul'); P.p(x + 1, y, 'celeste'); }
  }
}

/**
 * Río hondo (nivel alto): no se ve el fondo. Agua más oscura en el medio, espuma donde toca la orilla, la corriente
 * en rayas que siguen el sentido del agua y unos jacintos sueltos.
 */
function rioHondo(P: Lienzo, L: ObliqueLayout, x0: number, x1: number, y0: number, y1: number, seed: number) {
  const D = depthOf(L), yEnd = y1 >= D ? P.h : y1, R = rng(seed + x0 + y0);
  for (let y = y0; y < yEnd; y++) for (let x = x0; x < x1; x++) {
    if (y < D && !waterAt(L, x, y)) continue;
    const borde = Math.min(x - x0, x1 - 1 - x);
    // agua verde turbia con el cielo reflejado en tramado, más claro hacia el fondo
    const t = y < D ? y / D : 1;
    // agua honda: celeste con tramado azul que se hace más denso hacia adelante y manchones turbios
    let c: Color = bayer(x, y) < 0.18 + t * 0.14 ? 'azul' : grain(x >> 3, y >> 2, seed + 5) < 0.12 && bayer(x, y) < 0.6 ? 'canal' : 'celeste';
    if (borde < 3) c = borde === 0 ? 'luz' : 'cielo';
    else if (borde < 7 && bayer(x, y) < 0.5) c = 'celeste';
    P.p(x, y, c);
  }
  // la corriente: rayas largas en grupos
  for (let k = 0; k < ((x1 - x0) * (yEnd - y0)) / 260; k++) {
    const x = x0 + 8 + Math.floor(R() * (x1 - x0 - 24)), y = y0 + 2 + Math.floor(R() * (yEnd - y0 - 4)), len = 4 + Math.floor(R() * 10);
    if (y < D && !waterAt(L, x, y)) continue;
    P.hl(x, y, len, R() < 0.25 ? 'luz' : L.hora === 'tarde' && R() < 0.5 ? 'oro' : 'cielo'); if (R() < 0.5) P.hl(x + 3, y + 1, Math.max(2, len - 5), 'celeste');
  }
  // jacintos sueltos (los que bajan con la corriente van en vida)
  for (let k = 0; k < (x1 - x0) / 120; k++) {
    const cx = x0 + 12 + Math.floor(R() * (x1 - x0 - 24)), cy = y0 + 8 + Math.floor(R() * Math.max(1, yEnd - y0 - 16));
    if (cy < D && !waterAt(L, cx, cy)) continue;
    jacinto(P, cx, cy, 6 + Math.floor(R() * 8), seed + k);
  }
}

/** Charco bajito: una mancha ovalada dentro del rango, con el cielo reflejado y el borde mojado. */
function charco(P: Lienzo, x0: number, x1: number, y0: number, y1: number, seed: number) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const wob = 1 + Math.sin(Math.atan2(y - cy, x - cx) * 3 + seed) * 0.08;
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d > wob) continue;
    P.p(x, y, d > wob - 0.12 ? 'asfalto_claro' : d > wob - 0.25 && bayer(x, y) < 0.5 ? 'cemento' : (y - y0) % 7 === 0 && grain(x >> 2, y, seed) < 0.4 ? 'cielo' : 'celeste');
  }
}

/**
 * Charcos en el piso que reflejan lo que tienen encima: cada pixel del charco toma el color de la capa cerca en el
 * espejo de la línea del fondo (la fila `y` del piso refleja la fila FT - y de las casas, corrida por la inclinación),
 * un tono más oscuro, con rayitas de luz que lo hacen agua. Donde arriba hay cielo, refleja cielo.
 */
function charcosConReflejo(P: Lienzo, C: Lienzo, L: ObliqueLayout, k: number, seed: number) {
  const D = depthOf(L), FT = L.franja.atras, R = rng(seed * 11 + 5);
  const n = Math.round(L.largo / 240);
  for (let i = 0; i < n; i++) {
    const cxw = 60 + R() * (L.largo - 120), cy = 16 + R() * (D - 38), rx = 32 + R() * 40, ry = 7 + R() * 6;
    // solo en piso firme: ni huecos ni agua ni bajo las cajas
    let ok = true;
    for (const [dx, dy] of [[-rx, 0], [rx, 0], [0, -ry], [0, ry], [0, 0], [-rx / 2, 0], [rx / 2, 0]]) {
      const x = Math.round(cxw + dx), y = Math.round(cy + dy);
      if (holeAt(L, x, y) || waterAt(L, x, y) || boxesOf(L).some((b) => x >= b.x - 4 && x < b.x + b.w + 4 && y >= b.y - 4 && y < b.y + b.d + 4)) ok = false;
    }
    if (!ok) continue;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let xw = Math.floor(cxw - rx); xw <= cxw + rx; xw++) {
      const wob = 1 + Math.sin(Math.atan2(y - cy, xw - cxw) * 3 + seed + i) * 0.1 + (grain(xw >> 2, y, seed + i) - 0.5) * 0.14;
      const d = ((xw - cxw) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d > wob) continue;
      const x = xw + corre(k, y);
      if (d > wob - 0.12) { const c0 = nombreEn(P, x, y); if (c0) P.p(x, y, MAS_OSCURO[c0]); continue; }
      // el reflejo: rayas verticales del color de la casa que está encima, de cabeza (la planta baja arriba del charco
      // y los pisos de arriba hacia adelante), tramadas con el cielo que se refleja
      const rel = y - (cy - ry), sy = FT - 6 - Math.round(rel * 5), sx = x - corre(k, y);
      const c = sy >= 0 && sx >= 0 && sx < C.w ? nombreEn(C, sx, sy) : undefined;
      const casa = c && c !== 'tinta' && c !== 'sombra' ? c : undefined;
      const col: Color = casa && bayer(x, y) < 0.62 ? casa : bayer(x + 1, y) < 0.5 ? 'cielo' : 'celeste';
      // brillo: rayitas horizontales de luz, como el agua que tiembla
      P.p(x, y, (y + i) % 3 === 0 && grain(x >> 2, y, seed + i) < 0.3 ? 'luz' : col);
    }
  }
}

/**
 * Una isla de jacintos de agua (lục bình): hojas redondas brillantes en manojos, con espigas de flor lila que asoman.
 * `r` es el radio de la isla; va aplastada como todo lo que flota.
 */
function jacinto(P: Lienzo, cx: number, cy: number, r: number, seed: number) {
  const R = rng(seed);
  P.d(cx + 1, cy + 2, r + 1, 'verde_oscuro', 0.45);
  for (let i = 0; i < r * 1.6; i++) {
    const a = R() * Math.PI * 2, t = Math.sqrt(R()) * r, x = Math.round(cx + Math.cos(a) * t), y = Math.round(cy + Math.sin(a) * t * 0.45);
    P.d(x, y, 2 + R() * 1.5, 'verde', 0.7); P.p(x - 1, y - 1, 'menta');
  }
  for (let i = 0; i < Math.max(1, r / 3); i++) {
    const x = Math.round(cx + (R() - 0.5) * r * 1.4), y = Math.round(cy + (R() - 0.5) * r * 0.5) - 2;
    P.p(x, y - 1, 'salmon'); P.p(x, y - 2, 'celeste'); P.p(x + 1, y - 1, 'celeste'); P.p(x, y, 'verde_oscuro');
  }
}

/** Un jinete chiquito sobre la moto de fondo (casco y espalda). */
function jinete(c: Lienzo, f: number) {
  const x = 22, y = 40 - 21 - 12;
  c.f(x, y + 4, 7, 9, f ? 'celeste' : 'luz'); c.vl(x + 6, y + 4, 9, 'cemento');
  c.d(x + 3, y + 1, 3, f ? 'rojo' : 'amarillo'); c.p(x + 1, y + 1, 'tinta');
  c.f(x + 1, y + 12, 3, 4, 'azul_noche');
}

/** Cosas en la acera de enfrente: matas, banquitos, cajas, el gánh de una vendedora. Nada pasa de la franja. */
function primerPlano(F: Lienzo, L: ObliqueLayout, frenteY: number, seed: number) {
  const R = rng(seed * 7), base = 360 - frenteY - 2;
  let n = 0;
  const libre = (x: number) => !L.huecos.some((h) => x > h.x0 - 30 && x < h.x1 + 30) && !L.agua.some((a) => x > a.x0 - 20 && x < a.x1 + 20);
  for (let x = 90; x < L.largo - 60; x += 170 + Math.floor(R() * 220)) {
    if (!libre(x)) continue;
    const k = (n++ + Math.floor(R() * 2)) % 4;
    if (k === 0) {
      // mata de plátano en matera grande
      F.f(x, base - 10, 16, 10, 'terracota'); F.hl(x, base - 10, 16, 'salmon'); F.hl(x, base - 1, 16, 'vino');
      for (const [dx, dy, len] of [[-8, -14, 10], [6, -18, 9], [14, -12, 8]] as const) for (let i = 0; i < len; i++) { F.p(x + 8 + Math.round((dx * i) / len), base - 10 + Math.round((dy * i) / len), 'verde'); F.p(x + 9 + Math.round((dx * i) / len), base - 9 + Math.round((dy * i) / len), 'verde_oscuro'); }
    } else if (k === 1) { banquito(F, x, base - 7, 'rojo'); banquito(F, x + 2, base - 14, 'rojo'); banquito(F, x + 11, base - 7, 'azul'); }
    else if (k === 2) { F.box(x, base - 12, 14, 12, 'luz', 'cemento'); F.box(x + 2, base - 22, 12, 10, 'luz', 'cemento'); F.hl(x + 7, base - 12, 1, 'rojo'); }
    else {
      // gánh: dos canastos con su vara
      F.ln(x, base - 22, x + 30, base - 24, 'ocre');
      for (const cx of [x + 2, x + 26]) { F.ln(cx, base - 22, cx - 3, base - 12, 'sombra'); F.ln(cx, base - 22, cx + 3, base - 12, 'sombra'); F.d(cx, base - 7, 6, 'ocre', 0.8); F.hl(cx - 5, base - 9, 11, 'amarillo'); F.p(cx - 2, base - 11, 'verde'); F.p(cx + 1, base - 11, 'oro'); F.p(cx + 2, base - 12, 'verde'); }
    }
  }
}

/** Charcos y piso mojado para el aguacero: va encima del piso (transparente donde no cambia). */
function mojar(pal: Paleta, L: ObliqueLayout, h: number, seed: number): Lienzo {
  const M = new Lienzo(L.largo, h, pal), D = depthOf(L), R = rng(seed * 13);
  for (let y = 0; y < h; y++) for (let x = 0; x < L.largo; x++) {
    if (holeAt(L, x, y) || (y < D && waterAt(L, x, y))) continue;
    if (bayer(x, y) < 0.12) M.p(x, y, y < D && floorAt(L, x, y) === 'acera' ? 'cemento' : 'asfalto');
  }
  for (let k = 0; k < L.largo / 40; k++) {
    const cx = Math.floor(R() * L.largo), cy = 6 + Math.floor(R() * (D - 10)), rw = 6 + R() * 16, rh = 2 + R() * 4;
    if (holeAt(L, cx, cy) || waterAt(L, cx, cy)) continue;
    for (let y = Math.floor(cy - rh); y <= cy + rh; y++) for (let x = Math.floor(cx - rw); x <= cx + rw; x++) {
      const d = ((x - cx) / rw) ** 2 + ((y - cy) / rh) ** 2;
      if (d > 1 || holeAt(L, x, y)) continue;
      M.p(x, y, d > 0.7 ? 'asfalto' : (x + y) % 7 === 0 ? 'cielo' : 'celeste');
    }
  }
  return M;
}

const SUP: Record<string, Superficie> = {
  acera: { id: 'acera', color: '#d0d0d0', paso: 'paso_piedra', resbala: false },
  asfalto: { id: 'asfalto', color: '#808080', paso: 'paso_piedra', resbala: false },
  agua: { id: 'agua', color: '#3060ff', paso: 'paso_agua', resbala: true },
  hueco: { id: 'hueco', color: '#000000', paso: '', resbala: false },
  puente: { id: 'puente', color: '#f0f0f0', paso: 'paso_piedra', resbala: false },
  madera: { id: 'madera', color: '#a06030', paso: 'paso_madera', resbala: false },
  pasto: { id: 'pasto', color: '#30a030', paso: 'paso_pasto', resbala: false },
  tierra: { id: 'tierra', color: '#c09050', paso: 'paso_tierra', resbala: false },
};
const SUP_DE: Record<TipoPiso, string> = { asfalto: 'asfalto', acera: 'acera', tierra: 'tierra', baldosa: 'acera', madera: 'madera', metal: 'puente', arena: 'tierra', tatami: 'madera', greda: 'tierra', cancha: 'acera', pasto: 'pasto', agua: 'agua' };

/** Mapa de la franja: por pixel, qué suena al pisar y si resbala. */
function superficie(L: ObliqueLayout): { img: Raster; leyenda: Superficie[] } {
  const D = depthOf(L), img = createRaster(L.largo, D), usadas = new Set<string>();
  const puentes = L.huecos.filter((h) => (h.y1 ?? D) < D);
  for (let y = 0; y < D; y++) for (let x = 0; x < L.largo; x++) {
    let id: string;
    if (holeAt(L, x, y)) id = 'hueco';
    else if (waterAt(L, x, y)) id = 'agua';
    else if (puentes.some((h) => x >= h.x0 && x < h.x1 && y >= (h.y1 ?? D))) id = 'puente';
    else id = SUP_DE[floorAt(L, x, y) ?? 'asfalto'];
    usadas.add(id);
    const c = SUP[id].color, i = (y * L.largo + x) * 4;
    img.data[i] = parseInt(c.slice(1, 3), 16); img.data[i + 1] = parseInt(c.slice(3, 5), 16); img.data[i + 2] = parseInt(c.slice(5, 7), 16); img.data[i + 3] = 255;
  }
  return { img, leyenda: [...usadas].map((u) => SUP[u]) };
}

/** Un trozo de una capa larga, de x0 a x0 + w. */
export function trozo(src: Lienzo, x0: number, w = TROZO): Raster {
  const out = createRaster(Math.min(w, src.w - x0), src.h);
  for (let y = 0; y < src.h; y++) out.data.set(src.r.data.subarray((y * src.w + x0) * 4, (y * src.w + x0 + out.w) * 4), y * out.w * 4);
  return out;
}

export interface Actor { img: Raster; /** pivote (pies) dentro de la imagen */ px: number; py: number; x: number; y: number; z?: number }

/** Una postal de 640 x 360 que empieza en x0: todas las capas en orden, con los atletas que se pasen. */
export function postal(E: Escena, x0: number, actores: Actor[] = [], w = 640, h = 360, t = 0): Raster {
  const C = new Lienzo(w, h, E.paleta), FT = E.layout.franja.atras;
  const pegar = (src: Raster, dx: number, dy: number) => {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const i = (y * src.w + x) * 4; if (src.data[i + 3] === 0) continue;
      const X = dx + x, Y = dy + y; if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      C.r.data.set(src.data.subarray(i, i + 4), (Y * w + X) * 4);
    }
  };
  for (let x = -((x0 * PARALAJE.cielo) % E.cielo.w); x < w; x += E.cielo.w) pegar(E.cielo.r, Math.floor(x), 0);
  const lx = Math.floor(x0 * PARALAJE.lejos) % E.lejos.w;
  for (let x = -lx; x < w; x += E.lejos.w) pegar(E.lejos.r, x, FT - 30 - E.lejos.h);
  // lo que anda por la capa lejos (el metrocable): en su punto del recorrido a los t segundos, repetido como la capa
  for (const v of E.vida) if (v.capa === 'lejos' && v.recorrido) {
    const r = v.recorrido, f = ((t / r.segundos + (r.desfase ?? 0)) % 1 + 1) % 1;
    const vx = Math.round(r.desde[0] + (r.hasta[0] - r.desde[0]) * f), vy = Math.round(r.desde[1] + (r.hasta[1] - r.desde[1]) * f);
    for (let x = -lx; x < w; x += E.lejos.w) pegar(v.cuadros[0].r, x + vx, FT - 30 - E.lejos.h + vy);
  }
  const cuadro = (v: VidaEscena) => v.cuadros[Math.floor(t * v.fps) % v.cuadros.length].r;
  for (const v of E.vida) if (v.capa === 'tras_cerca' && v.velocidad) {
    // lo que cruza al fondo: una pasada cada `cada` segundos
    const vx = Math.round(x0 + w + ((t % (v.cada ?? 5)) * v.velocidad));
    pegar(cuadro(v), vx - x0, v.y);
  }
  pegar(E.cerca.r, -x0, 0);
  for (const v of E.vida) if (v.capa === 'cerca' && v.x + v.cuadros[0].w > x0 && v.x < x0 + w) pegar(cuadro(v), v.x - x0, v.y);
  pegar(E.piso.r, -x0, FT);
  const capa: { orden: number; draw: () => void }[] = [
    ...E.objetos.filter((o) => o.x + o.img.w > x0 && o.x < x0 + w).map((o) => ({ orden: o.orden, draw: () => pegar(o.img.r, o.x - x0, o.y) })),
    // la vida que va encima de un objeto (los peldaños que corren, la bandera del asta)
    ...E.vida.filter((v) => v.capa === 'objeto' && v.x + v.cuadros[0].w > x0 && v.x < x0 + w).map((v) => ({ orden: v.orden ?? 0, draw: () => pegar(cuadro(v), v.x - x0, v.y) })),
    ...actores.map((a) => {
      // parado encima de una caja: va después de la caja (y de lo que la caja tenga debajo)
      const todas = boxesOf(E.layout);
      const sobre = (a.z ?? 0) > 0 ? todas.find((b) => a.x >= b.x && a.x < b.x + b.w && a.y >= b.y && a.y < b.y + b.d && Math.abs(b.z - (a.z ?? 0)) <= 2) : undefined;
      return { orden: sobre ? ordenCaja(sobre, todas) + 0.01 : a.y + 0.5, draw: () => pegar(a.img, a.x + corre(E.inclinacion, a.y) - a.px - x0, FT + a.y - (a.z ?? 0) - a.py) };
    }),
  ];
  capa.sort((a, b) => a.orden - b.orden).forEach((c) => c.draw());
  pegar(E.frente.r, -x0, E.frenteY);
  return C.r;
}


/** La línea de meta a cuadros pintada en el techo de una caja (en la pieza, antes de inclinarla). */
function lineaMeta(P: Lienzo, x: number, sobre: number, d: number) {
  for (let y = 0; y < d; y++) for (let i = 0; i < 8; i++) P.p(x + i, sobre + y, ((i >> 2) + (y >> 2)) % 2 ? 'tinta' : 'luz');
}

/**
 * La vida de los escenarios de Colombia: el metrocable que cruza el valle (en la capa lejos), la bandera del asta, los
 * banderines y la ropa tendida, y los peldaños de la escalera eléctrica que bajan (encima de su objeto).
 */
function vidaColombia(pal: Paleta, L: ObliqueLayout, k: number, seed: number, postes: ObliqueLayout['postes'], todas: Caja[]): VidaEscena[] {
  const out: VidaEscena[] = [], FT = L.franja.atras, R = rng(seed + 77);
  if (L.vida.includes('metrocable')) {
    // dos cables: el de arriba va a la derecha y el de abajo vuelve; tres cabinas en cada uno
    const cab = cabina(pal), W = TROZO;
    for (let i = 0; i < 6; i++) {
      const ida = i < 3, y = (ida ? CABLE_Y - 2 : CABLE_Y + 3) - 1;
      out.push({
        id: `metrocable_${i}`, tipo: 'metrocable', capa: 'lejos', x: ida ? -12 : W, y, cuadros: [cab], fps: 1,
        recorrido: { desde: ida ? [-12, y] : [W, y], hasta: ida ? [W, y] : [-12, y], segundos: 60, desfase: ((i % 3) / 3 + (ida ? 0 : 0.16)) % 1 },
      });
    }
  }
  if (L.vida.includes('banderines')) {
    // banderines sobre la calle, de casa a casa: unos cuantos a lo largo del tramo
    for (let x = 640; x < L.largo - 300; x += 520 + Math.floor(R() * 200)) {
      // de casa a casa: solo donde detrás hay casas (no sobre el mirador) y por encima del piso de adelante
      const z = Math.max(sueloEn(L, x, 0), sueloEn(L, x + 130, 0));
      if (FT - z < 90) continue;
      const w = 90 + Math.floor(R() * 40), y = FT - z - 70 - Math.floor(R() * 12);
      out.push({ id: `banderines_${x}`, tipo: 'banderines', capa: 'cerca', x, y: Math.round(y), cuadros: banderinesVida(pal, w, 7), fps: 2 });
    }
  }
  if (L.vida.includes('ropa_tendida')) {
    for (let x = 1300; x < L.largo - 500; x += 700 + Math.floor(R() * 200)) {
      const z = Math.max(sueloEn(L, x, 0), sueloEn(L, x + 60, 0));
      if (FT - z < 90) continue;
      const y = FT - z - 46;
      out.push({ id: `ropa_${x}`, tipo: 'ropa_tendida', capa: 'cerca', x, y, cuadros: ropaVida(pal, 50, seed + x), fps: 2 });
    }
  }
  for (const p of postes.filter((q) => q.tipo === 'asta_bandera')) {
    const z0 = sueloEn(L, p.x, p.y), alto = altoVisible(L, p);
    out.push({ id: `bandera_${p.x}`, tipo: 'bandera', capa: 'objeto', x: p.x + 3 + corre(k, p.y), y: FT + p.y - z0 - alto - 4, cuadros: banderaAsta(pal), fps: 4, orden: p.y + 200 });
  }
  // la escalera eléctrica: los peldaños que corren, encima de su objeto (un tramo seguido es una sola pieza)
  const esc = todas.filter((b) => b.tipo === 'escalera_electrica').sort((a, b) => a.x - b.x);
  const tramos: Caja[][] = [];
  for (const b of esc) { const t = tramos[tramos.length - 1]; if (t && t[t.length - 1].x + t[t.length - 1].w === b.x && t[0].y === b.y) t.push(b); else tramos.push([b]); }
  for (const t of tramos) {
    const x0 = t[0].x, y = t[0].y, d = t[0].d, zMax = Math.max(...t.map((b) => b.z)), zMin = Math.min(...t.map((b) => b.z));
    const w = t[t.length - 1].x + t[t.length - 1].w - x0, ext = corre(k, y + d) - corre(k, y), alto = d + zMax - zMin;
    const cuadros = [0, 1, 2].map((f) => {
      const C = new Lienzo(w + ext + 1, alto, pal);
      for (const b of t) {
        const P = new Lienzo(b.w, b.d, pal);
        peldano(P, 0, 0, b.w, b.d, f);
        // solo el peldaño: el vidrio de adelante queda en el objeto
        for (let j = 0; j < b.d - 20; j++) for (let i = 0; i < b.w; i++) {
          const ii = (j * P.w + i) * 4;
          C.r.data.set(P.r.data.subarray(ii, ii + 4), ((j + zMax - b.z) * C.w + (b.x - x0 + i + corre(k, y + j) - corre(k, y))) * 4);
        }
      }
      return C;
    });
    out.push({ id: `escalera_electrica_${x0}`, tipo: 'escalera_electrica', capa: 'objeto', x: x0 + corre(k, y), y: FT + y - zMax, cuadros, fps: 6, orden: y + d + 0.05 });
  }
  return out;
}

/** Tipos de caja que vienen en tramos de peldaños seguidos: cada tramo sale como un solo objeto (cuenta uno en el peso). */
const TRAMOS = new Set(['escalera_electrica', 'escalones', 'escalera_pintada']);

/**
 * Junta los peldaños seguidos del mismo tipo (mismo fondo y pegados en x) en un solo objeto, con sus contrahuellas de
 * adentro. La cara izquierda del primero queda aparte, como siempre. Así un tramo de 7 peldaños pesa 2 objetos y no 14.
 */
function juntarEscaleras(objetos: ObjetoEscena[], todas: Caja[], pal: Paleta) {
  const idx = new Map(todas.map((b, i) => [b, i] as const));
  const grupos: Caja[][] = [];
  for (const b of [...todas].filter((q) => TRAMOS.has(q.tipo ?? '')).sort((p, q) => p.y - q.y || p.x - q.x)) {
    const g = grupos[grupos.length - 1], u = g?.[g.length - 1];
    if (u && u.tipo === b.tipo && u.y === b.y && u.d === b.d && u.x + u.w === b.x) g.push(b); else grupos.push([b]);
  }
  for (const g of grupos) {
    if (g.length < 2) continue;
    const ids = g.map((b) => `${b.tipo}_${idx.get(b)}`);
    const partes = objetos.filter((o) => ids.includes(o.id) || ids.slice(1).some((id) => o.id === `${id}_cara`));
    if (partes.length < 2) continue;
    const x0 = Math.min(...partes.map((o) => o.x)), y0 = Math.min(...partes.map((o) => o.y));
    const x1 = Math.max(...partes.map((o) => o.x + o.img.w)), y1 = Math.max(...partes.map((o) => o.y + o.img.h));
    const img = new Lienzo(x1 - x0, y1 - y0, pal);
    // las caras primero y los peldaños encima, en el orden de siempre
    for (const o of [...partes].sort((a, b) => a.orden - b.orden || a.x - b.x)) img.paste(o.img, o.x - x0, o.y - y0);
    const primero = objetos.find((o) => o.id === ids[0])!;
    const nuevo: ObjetoEscena = { id: `${ids[0]}_tramo`, tipo: primero.tipo, origen: primero.origen, img, x: x0, y: y0, orden: Math.max(...partes.map((o) => o.orden)), superficie: primero.superficie };
    for (const o of partes) objetos.splice(objetos.indexOf(o), 1);
    objetos.push(nuevo);
  }
}

/**
 * El alto con que se dibuja un asta: el del layout, pero sin pasarse de la pantalla (la bandera tiene que verse). Si el
 * layout pide más, el asta se acorta y el escenario lo avisa en `avisos` del verificador.
 */
export function altoVisible(L: ObliqueLayout, p: ObliqueLayout['postes'][number]): number {
  return Math.min(p.alto, L.franja.atras + p.y - sueloEn(L, p.x, p.y) - 30);
}
