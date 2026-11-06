import { PALETAS, alturaVisible, decayPara, CALOR_MAX, type Forma, type NombrePaleta, type OpcFuego } from '../fuego_doom';
import { MEDIDAS_FUEGO, type MedidaFuego } from './fuegos_doom_medidas';

/**
 * Fuegos de Doom del mundo: qué fuego vivo corre el juego sobre cada objeto con fuego, y los fuegos que no son objetos
 * (quemado, cadáveres, suelo ardiente, Ozmaren, fuego frío, armas encantadas).
 *
 * Por objeto (clave `id|variante`, como objMeta del juego) va una lista de fuegos (casi siempre uno; la fachada de la
 * catedral trae el de los vitrales y el de la puerta). Cada uno:
 * - `sprite`: el gemelo sin llama que hay que dibujar en lugar del original (`<id>_sin_llama`, misma variante, 1 cuadro);
 * - `boca`: dónde va el pie de la grilla (centro de su fila de abajo), en px desde el ancla del sprite;
 * - `grilla` [ancho, alto] en celdas y `celda` en px de pantalla (a escala 1);
 * - `paleta`, `forma`, `decay`, `viento`, `rafagas`, `turbulencia`, `ruido`, `humo`, `hueco`: las opciones de
 *   `crearFuego` (fuego_doom.ts), tal cual;
 * - `luz`: color, radio y altura (px, como `Luz` del juego), intensidad tope, `mueve` (cuánto la mueve el pulso del
 *   fuego: k = intensidad * pulsoLuz(f, mueve).k), `dx` (corrimiento de la luz desde el ancla) y `sombra`;
 * - `brasas`: chispas por segundo (salen de `brasas(f)`), `mezcla` (cómo se dibuja la llama) y `semilla`.
 *
 * Las medidas (bocas y tamaños de la llama horneada) salen de `scripts/gotico-fuegos-doom.ts medir`, que compara cada
 * sprite con su gemelo sin llama; están en fuegos_doom_medidas.ts. `fuegosDoomJson()` da datos/fuegos_doom.json (un
 * test los mantiene iguales).
 */

export type ClaseFuego = 'antorcha' | 'brasero' | 'pira' | 'hoguera' | 'fogata' | 'vela' | 'candelabro' | 'farol' | 'caldero' | 'hogar' | 'columna' | 'vitral' | 'puerta';

/** Objetos con fuego que pasan al fuego de Doom, por clase (el primer patrón que encaja manda). */
export const CLASES: [RegExp, ClaseFuego][] = [
  [/^abo_catedral_/, 'vitral'],
  [/columna_fuego/, 'columna'],
  [/antorch/, 'antorcha'],
  [/candelabro/, 'candelabro'],
  [/vela|lampara_aceite/, 'vela'],
  [/farol|linterna/, 'farol'],
  [/brasero/, 'brasero'],
  [/pira/, 'pira'],
  [/hoguera/, 'hoguera'],
  [/fogata|rescoldo|asador/, 'fogata'],
  [/caldero/, 'caldero'],
  [/fogon|horno|fragua|hogar/, 'hogar'],
];
export function claseDe(id: string): ClaseFuego | null {
  for (const [re, c] of CLASES) if (re.test(id)) return c;
  return null;
}

/**
 * Objetos con llama que siguen con su sprite de hoy (revisados en la hoja de todos los objetos): el fuego vivo encima
 * se veía peor. La forja tiene el fuego adentro y la llama viva salía por arriba del techo; la lámpara colgante pierde
 * las velas del aro (se miden como una sola); el caldero del infierno tiene el fuego debajo de la olla y encima la tapa.
 */
export const FUERA_DE_LA_TABLA: Record<string, string> = {
  camp_fragua: 'el fuego está adentro de la forja y el vivo sale por encima del techo',
  cri_lampara_aceite: 'las velas del aro se miden como una sola llama',
  inf2_caldero: 'el fuego va debajo de la olla: el vivo encima la tapa',
  inf2_columna_fuego: 'la horneada tiene puntas nítidas; la viva queda como un pilar borroso',
  cat2_antorcha_pared: 'llamas de 8 a 10 px: la viva sale como una cápsula redonda, la horneada tiene punta',
  for2_antorchero: 'llamas de 8 a 10 px: la viva sale como una cápsula redonda, la horneada tiene punta',
};
/** Los objetos del catálogo que tienen fuego de Doom (se registran sus gemelos sin llama en catalogo/sin_llama.ts). */
export const IDS_FUEGO_DOOM: string[] = [...new Set(Object.keys(MEDIDAS_FUEGO).map((k) => k.split('|')[0]))].filter((id) => !FUERA_DE_LA_TABLA[id]).sort();

interface Preset {
  celda: number;
  forma: 'llama' | 'boca' | 'pira' | 'puntos' | 'mapa' | 'puerta';
  /** ancho de la fuente como fracción del ancho de la llama horneada */
  fuente: number;
  /** alto de la llama viva contra la horneada (la de Doom se apaga en la punta) */
  alto: number;
  humo: number;
  turbulencia: number;
  ruido: number;
  rafagas: number;
  mueve: number;
  brasas: number;
  sombra: boolean;
  intensidad: number;
  /** curva del calor al pintar (más de 1: base amarillo-naranja, cuerpo naranja, puntas rojas) */
  brillo: number;
  /** cuánto se apagan los pedazos de llama despegados (sin chispitas rojas flotando) */
  pegada: number;
  /** llamas: cuánto se angosta hacia arriba (gota de antorcha) */
  afinar?: number;
}
const P = (p: Partial<Preset>): Preset => ({ celda: 3, forma: 'boca', fuente: 0.7, alto: 1.2, humo: 0.2, turbulencia: 0.4, ruido: 0.3, rafagas: 0.08, mueve: 0.4, brasas: 1.5, sombra: true, intensidad: 0.9, brillo: 1.35, pegada: 0.75, ...p });
/** Cómo arde cada clase. Celda 3 en el mundo (casa con el arte prerenderizado); 2 en velas, faroles y vitrales. */
export const PRESETS: Record<ClaseFuego, Preset> = {
  antorcha: P({ celda: 2, forma: 'llama', fuente: 1, alto: 0.95, humo: 0.08, turbulencia: 0.25, ruido: 0.12, rafagas: 0.03, mueve: 0.35, brasas: 1.2, brillo: 3, pegada: 0.95, afinar: 0.95 }),
  brasero: P({ forma: 'boca', fuente: 0.75, alto: 1.1, humo: 0.15, mueve: 0.4, brasas: 2, brillo: 1.9, pegada: 0.8 }),
  pira: P({ forma: 'pira', fuente: 0.85, alto: 1.05, humo: 0.28, ruido: 0.35, mueve: 0.45, brasas: 4, brillo: 1.75, pegada: 0.65 }),
  hoguera: P({ forma: 'pira', fuente: 0.85, alto: 0.95, humo: 0.28, ruido: 0.35, mueve: 0.45, brasas: 4, brillo: 1.75, pegada: 0.65 }),
  fogata: P({ forma: 'pira', fuente: 0.8, alto: 1.15, humo: 0.25, mueve: 0.45, brasas: 2.5, brillo: 1.75, pegada: 0.7 }),
  vela: P({ celda: 2, forma: 'puntos', fuente: 1, alto: 1, humo: 0.06, turbulencia: 0.3, ruido: 0.12, rafagas: 0.04, mueve: 0.15, brasas: 0, sombra: false, intensidad: 0.7, brillo: 1.5, pegada: 0.95 }),
  candelabro: P({ celda: 2, forma: 'puntos', fuente: 1, alto: 1, humo: 0.06, turbulencia: 0.3, ruido: 0.12, rafagas: 0.04, mueve: 0.15, brasas: 0, sombra: false, intensidad: 0.75, brillo: 1.5, pegada: 0.95 }),
  farol: P({ celda: 2, forma: 'puntos', fuente: 1, alto: 0.9, humo: 0, turbulencia: 0.3, ruido: 0.1, rafagas: 0.03, mueve: 0.2, brasas: 0, sombra: false, intensidad: 0.75, brillo: 1.5, pegada: 0.95 }),
  caldero: P({ forma: 'boca', fuente: 0.75, alto: 0.6, humo: 0.22, mueve: 0.3, brasas: 1, brillo: 1.75 }),
  hogar: P({ forma: 'boca', fuente: 0.75, alto: 0.7, humo: 0.22, mueve: 0.35, brasas: 1.5, brillo: 1.75 }),
  columna: P({ forma: 'llama', fuente: 0.6, alto: 0.8, humo: 0.3, turbulencia: 0.4, ruido: 0.35, rafagas: 0.1, mueve: 0.5, brasas: 5, brillo: 1.9, afinar: 0.5 }),
  // vitral: la luz tiñe de cerca y no blanquea la obra (con 260 px e intensidad 0.8 las tres piezas abrían un hueco en la
  // oscuridad de toda la catedral y la piedra se veía de otro juego); el foco fuerte es la puerta
  vitral: P({ celda: 2, forma: 'mapa', fuente: 1, alto: 1, humo: 0, turbulencia: 0.5, ruido: 0.5, rafagas: 0.1, mueve: 0.35, brasas: 0, sombra: false, intensidad: 0.45, brillo: 1, pegada: 0 }),
  puerta: P({ celda: 3, forma: 'puerta', fuente: 1, alto: 1, humo: 0.3, turbulencia: 0.45, ruido: 0.35, mueve: 0.4, brasas: 3, sombra: true, intensidad: 1, brillo: 1.3, pegada: 0.5 }),
};

/** Temas fríos: los fuegos azules de ahí son de ánimas (fuego frío), no gas. */
export const TEMAS_FRIOS = new Set(['hielo', 'nieve', 'cripta', 'catacumbas', 'abismo', 'ahogada', 'cementerio']);
/** Paleta según el material de la llama horneada, el tema y la clase. */
export function paletaDe(mat: string, tema: string, clase: ClaseFuego): NombrePaleta {
  if (mat === 'fuego_verde') return 'veneno';
  if (mat === 'fuego_azul') return TEMAS_FRIOS.has(tema) ? 'animas' : 'gas';
  if (mat === 'luz_vela' || clase === 'vela' || clase === 'candelabro' || clase === 'farol') return 'vela';
  return 'infierno';
}

export interface LuzFuegoDoom { color: string; radio: number; altura: number; intensidad: number; mueve: number; dx: number; sombra: boolean }
export interface FuegoMundoDoom {
  clase: ClaseFuego;
  sprite: string | null;
  boca: [number, number];
  grilla: [number, number];
  celda: number;
  paleta: NombrePaleta;
  forma: Forma | { tipo: 'mascara'; archivo: string; caja: [number, number, number, number]; relleno: number };
  decay: number;
  viento: number;
  rafagas: number;
  turbulencia: number;
  ruido: number;
  humo: number;
  hueco: number;
  brillo: number;
  pegada: number;
  luz: LuzFuegoDoom;
  brasas: number;
  mezcla: 'sumar' | 'normal';
  semilla: number;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const semillaDe = (s: string) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) % 100000; };

/** El fuego de Doom de una variante medida. */
/** Radio de la luz de los vitrales antes del ×1.3 del juego: 115 → 150 px. */
const RADIO_VITRAL = 115;
export function specFuego(clave: string, medida: MedidaFuego, celdaForzada?: number): FuegoMundoDoom[] {
  let m = medida;
  const [id] = clave.split('|');
  const clase = claseDe(id);
  if (!clase) throw new Error(`fuegos_doom: ${id} no tiene clase`);
  const out: FuegoMundoDoom[] = [];
  const luzBase = (pal: NombrePaleta, pr: Preset, dx: number, radio?: number): LuzFuegoDoom => ({
    color: PALETAS[pal].luz, radio: Math.round(Math.min(260, (radio ?? m.luz[0]) * 1.3)), altura: Math.max(20, Math.round(m.luz[2] * 1.2)),
    intensidad: pr.intensidad, mueve: pr.mueve, dx, sombra: pr.sombra,
  });
  if (clase === 'vitral') {
    const pr = PRESETS.vitral, v = m.vitrales!;
    const [cx, cy, cw, ch] = v.caja, c = pr.celda;
    out.push({
      clase, sprite: `${id}_sin_llama`, boca: [Math.round(cx + cw / 2), cy + ch], grilla: [Math.ceil(cw / c), Math.ceil(ch / c)], celda: c, paleta: 'infierno',
      forma: { tipo: 'mascara', archivo: `fuegos_doom/${clave.replace('|', '_')}.png`, caja: v.caja, relleno: 0.22 },
      // las llamas suben ~64 px: lo alto de un ventanal
      decay: r2(1 + (2 * (CALOR_MAX - 10)) / (64 / c)), viento: 0, rafagas: pr.rafagas, turbulencia: pr.turbulencia, ruido: pr.ruido, humo: 0, hueco: 0, brillo: pr.brillo, pegada: pr.pegada,
      luz: luzBase('infierno', pr, 0, RADIO_VITRAL), brasas: 0, mezcla: 'sumar', semilla: semillaDe(clave),
    });
    if (m.puerta) {
      const pp = PRESETS.puerta, [px, py, pw, ph] = m.puerta, gw = Math.round(pw / pp.celda) + 2, gh = Math.round(ph / pp.celda);
      const forma: Forma = { tipo: 'puerta', arranque: 0.7 };
      out.push({
        clase: 'puerta', sprite: null, boca: [px, py], grilla: [gw, gh], celda: pp.celda, paleta: 'infierno', forma,
        decay: r2(decayPara(Math.min(1, 0.95), gh)), viento: 0, rafagas: pp.rafagas, turbulencia: pp.turbulencia, ruido: pp.ruido, humo: pp.humo, hueco: 0, brillo: pp.brillo, pegada: pp.pegada,
        luz: { color: PALETAS.infierno.luz, radio: 170, altura: 22, intensidad: 1, mueve: pp.mueve, dx: px, sombra: true }, brasas: pp.brasas, mezcla: 'sumar', semilla: semillaDe(clave + 'p'),
      });
    }
    return out;
  }
  const pr0 = PRESETS[clase], c = celdaForzada ?? pr0.celda, pal = paletaDe(m.mat, m.tema, clase), frio = pal === 'animas';
  // el fuego frío se lee peor (paleta más oscura y alma hueca): más grande y más brillante, con lenguas definidas
  const pr: Preset = frio ? { ...pr0, alto: pr0.alto * 1.45, fuente: Math.min(1, pr0.fuente * 1.15), brillo: pr0.brillo * 1.2, turbulencia: 0.35 } : pr0, hueco = frio ? 0.22 : 0;
  // pocas llamas separadas (velas): una grilla que las cubre a todas, con una fuente en cada una
  // una antorcha doble (dos brazos, dos en la pared) son dos llamas, no una ancha
  const puntos = (pr.forma === 'puntos' && m.focos.length > 0) || (clase === 'antorcha' && m.focos.length > 1);
  let w: number, h: number, boca: [number, number], forma: Forma;
  // una vela es una llamita de ~8 px aunque el candelabro las tenga a distintas alturas (la caja de todas no cuenta)
  const LLAMITA = 8;
  if (puntos) {
    // los focos a menos de 8 px son la misma llama (la vela de un farol se mide en dos pedazos por el marco)
    const focos: [number, number][] = [];
    for (const f of m.focos) { const g = focos.find((q) => Math.hypot(q[0] - f[0], q[1] - f[1]) < 8); if (g) { g[0] = (g[0] + f[0]) / 2; g[1] = Math.max(g[1], f[1]); } else focos.push([f[0], f[1]]); }
    m = { ...m, focos: focos.map(([x, y]) => [Math.round(x), y] as [number, number]) };
    const xs = m.focos.map((p) => p[0]), ys = m.focos.map((p) => p[1]);
    const llamita = clase === 'antorcha' ? Math.max(LLAMITA, m.alto) : LLAMITA;
    const alto = llamita * pr.alto, x0 = Math.min(...xs) - 3 * c, x1 = Math.max(...xs) + 3 * c, yb = Math.max(...ys);
    w = Math.max(4, Math.ceil((x1 - x0) / c)); h = Math.max(5, Math.ceil((alto * 1.6 + (yb - Math.min(...ys)) + 4) / c));
    boca = [Math.round(x0 + (w * c) / 2), yb];
    forma = { tipo: 'puntos', en: m.focos.map(([x, y]) => [r2((x - x0) / c), Math.min(h - 1, Math.round(h - 1 - (yb - y) / c))] as [number, number]), ancho: clase === 'antorcha' ? 1.6 : 1 };
  } else {
    const ancho = Math.max(4, m.ancho), alto = Math.max(6, m.alto) * pr.alto;
    w = Math.max(5, Math.ceil((ancho * (clase === 'farol' ? 1.2 : 1.6) + 6 * c) / c)); h = Math.max(6, Math.ceil((alto * 1.6 + 8) / c));
    boca = m.boca;
    forma = pr.forma === 'llama' ? { tipo: 'llama', ancho: r2(Math.min(0.7, (ancho * pr.fuente) / c / w)), afinar: pr.afinar }
      : pr.forma === 'pira' ? { tipo: 'pira', ancho: r2(Math.max(3, (ancho * pr.fuente) / c)), alto: r2(Math.max(1, (m.alto * 0.12) / c)) }
      : { tipo: 'boca', ancho: r2(Math.max(2, (ancho * pr.fuente) / c)) };
  }
  const altoPx = puntos ? (clase === 'antorcha' ? Math.max(LLAMITA, m.alto) * 0.75 : LLAMITA) * pr.alto : Math.max(6, m.alto) * pr.alto;
  const altura = Math.min(1, altoPx / (h * c) / alturaVisible(forma, w));
  out.push({
    clase, sprite: `${id}_sin_llama`, boca, grilla: [w, h], celda: c, paleta: pal, forma, decay: r2(decayPara(altura, h)), viento: 0,
    rafagas: pr.rafagas, turbulencia: puntos && clase === 'antorcha' ? 0.42 : pr.turbulencia, ruido: pr.ruido, humo: pr.humo, hueco, brillo: r2(pr.brillo), pegada: pr.pegada, luz: luzBase(pal, pr, boca[0]), brasas: pr.brasas,
    mezcla: PALETAS[pal].mezcla, semilla: semillaDe(clave),
  });
  return out;
}

/** Todos los fuegos de objetos: clave `id|variante`. */
export const FUEGOS_DOOM: Record<string, FuegoMundoDoom[]> = Object.fromEntries(Object.entries(MEDIDAS_FUEGO).filter(([k]) => !FUERA_DE_LA_TABLA[k.split('|')[0]]).map(([k, m]) => [k, specFuego(k, m)]));

/**
 * Las opciones de crearFuego para un fuego de la tabla (lo que hace el juego al cargar el objeto). La forma 'mascara'
 * (vitrales) necesita la máscara: pasar `mascara` = formaDesdeMascara(alfa del PNG, ancho, alto, celda, { relleno, escala255: true }).
 */
export function opcionesDeSpec(f: FuegoMundoDoom, mascara?: { forma: Forma }): OpcFuego {
  const forma = f.forma.tipo === 'mascara' ? mascara?.forma ?? { tipo: 'llama' as const } : (f.forma as Forma);
  return {
    ancho: f.grilla[0], alto: f.grilla[1], forma, paleta: f.paleta, decay: f.decay, viento: f.viento, rafagas: f.rafagas, turbulencia: f.turbulencia,
    ruido: f.ruido, humo: f.humo, hueco: f.hueco, brillo: f.brillo, pegada: f.pegada, semilla: f.semilla, margen: f.forma.tipo === 'mascara' ? 0 : 2,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// fuegos que no son objetos

/** Fuego de Doom que arde sobre algo que no es un objeto del mapa: el juego arma la grilla con estos datos. */
export interface FuegoEspecial {
  que: string;
  celda: number;
  paleta: NombrePaleta | Record<string, NombrePaleta>;
  /**
   * cómo se arma la forma: 'silueta' (con formaDesdeMascara sobre el alfa del cuadro que se está dibujando, rehecha
   * cada `cada_cuadros`), 'circulo', 'tira' (de punta a punta de la hoja del arma) o 'focos' (varias grillas chicas)
   */
  forma: 'silueta' | 'circulo' | 'tira' | 'focos';
  /** altura visible de la llama como fracción de la grilla (pasar por decayPara con el alto de la grilla) */
  altura: number;
  humo: number;
  hueco?: number;
  turbulencia?: number;
  ruido?: number;
  relleno?: number;
  alfa?: number;
  luz: { radio: number; altura: number; intensidad: number; mueve: number; sombra: boolean };
  brasas: number;
  notas: string;
  [k: string]: unknown;
}

export const ESPECIALES: Record<string, FuegoEspecial> = {
  quemado: {
    que: 'estado "quemado" sobre monstruos y el héroe: la grilla pegada al cuerpo', celda: 3, paleta: 'infierno', forma: 'silueta',
    altura: 0.3, humo: 0.5, turbulencia: 0.5, ruido: 0.55, relleno: 0.07, alfa: 0.85, brillo: 1.5, pegada: 0.5, cada_cuadros: 4, margen_px: [10, 26],
    luz: { radio: 120, altura: 40, intensidad: 0.7, mueve: 0.5, sombra: false }, brasas: 3,
    notas: 'Grilla = caja del cuadro del sprite + margen_px (x a cada lado, y arriba) en celdas de 3; la máscara es el alfa del cuadro puesto en esa caja, con umbral (alfa >= 200 cuenta como 255, lo demás 0: la sombra en el piso no arde). Forma: formaDesdeMascara(alfa, ancho, alto, 3, { modo: "salpicado", relleno: 0.07, escala255: true }) (manchas sueltas sobre el cuerpo, la llama sube libre), rehecha cada 4 cuadros de animación (no cada cuadro de pantalla); decay = decayPara(altura, alto de la grilla). Dibujar con alfa 0.85 encima del sprite. Al terminar el estado: apagar(f) y dejar de dibujarla cuando calorMedio(f).k llegue a 0. Con paleta sombra, veneno o animas (hueco 0.5) sirve para esos estados.',
  },
  cadaver: {
    que: 'cadáveres que arden (muertos por fuego)', celda: 3, paleta: 'infierno', forma: 'silueta',
    altura: 0.36, humo: 0.8, turbulencia: 0.45, ruido: 0.55, relleno: 0.1, alfa: 0.9, brillo: 1.5, pegada: 0.5, dura_s: 5, apaga_s: 3.5, margen_px: [8, 30],
    luz: { radio: 150, altura: 16, intensidad: 0.75, mueve: 0.5, sombra: true }, brasas: 2.5,
    notas: 'Igual que quemado (modo "salpicado"), con la silueta del cadáver en el piso armada una sola vez. A los apaga_s se llama apagar(f); el humo sigue hasta dura_s.',
  },
  suelo_ardiente: {
    que: 'charcos y suelo que arden (lo que dejan los poderes de fuego: cráter, meteoro, muro, suelo ardiente)', celda: 3, paleta: 'infierno', forma: 'circulo',
    altura: 0.38, humo: 0.2, turbulencia: 0.45, ruido: 0.6, relleno: 0.7, brillo: 1.5, pegada: 0.6, radio_px_por_casilla: 16, dura_s: 4,
    luz: { radio: 140, altura: 10, intensidad: 0.6, mueve: 0.45, sombra: false }, brasas: 2,
    notas: 'Grilla de (2 * radio_px + 6 celdas) x (radio_px + 14 celdas); forma { tipo: "circulo", radio: radio_px / 3, relleno }. Un charco por área, no uno por casilla. Para el fuego frío del nigromante, paleta animas y hueco 0.5.',
  },
  ozmaren: {
    que: 'el cuerpo de Ozmaren, el jefe de fuego (reemplaza las partículas de fuegoOzmaren)', celda: 3, paleta: 'infierno', forma: 'focos',
    altura: 0.75, humo: 0.3, turbulencia: 0.5, ruido: 0.45, brillo: 1.6, pegada: 0.6,
    // [x, y] en fracciones del cuadro como FOCOS de render/fuego.ts (x desde el ancla, y desde los pies hacia arriba), grilla [w, h] en celdas, peso
    focos: [[-0.19, 0.79, 10, 26, 1.4], [0.19, 0.79, 10, 26, 1.4], [-0.16, 0.47, 12, 20, 1], [0.16, 0.47, 12, 20, 1], [0, 0.72, 18, 30, 1.4], [0, 0.39, 10, 14, 0.9], [-0.21, 0.16, 8, 12, 0.6], [0.21, 0.16, 8, 12, 0.6]],
    furia: { avivar: 1.6, viento_arriba: 0, rafagas: 0.35 },
    luz: { radio: 260, altura: 280, intensidad: 1, mueve: 0.6, sombra: true }, brasas: 8,
    notas: 'Una grilla por foco (8 en total, ~2900 celdas): forma { tipo: "llama", ancho: 0.5 }, el pie en el foco. Con furia (fase 2 o especial) avivar(f, 1.6, 0.4) en cada golpe y rafagas 0.35. Las luces de lucesOzmaren toman k de pulsoLuz de la grilla de cada cuerno y de la espalda (en lugar del Ruido), así las sombras tiemblan con las llamas. El ondulado de calor sigue igual.',
  },
  fuego_frio: {
    que: 'el fuego frío de los actos de muerte y hielo: todos los fuegos de esos lugares con la paleta de ánimas', celda: 3, paleta: 'animas', forma: 'focos',
    altura: 1, humo: 0.45, hueco: 0.5,
    temas: [...TEMAS_FRIOS], actos: [4, 7], paleta_cripta: 'animas', paleta_corona: 'corona_fria',
    luz: { radio: 1, altura: 1, intensidad: 0.85, mueve: 0.35, sombra: true }, brasas: 0.5,
    notas: 'Regla de reemplazo: en las zonas de esos temas o actos, cada fuego de FUEGOS_DOOM se crea con paleta animas y hueco 0.5 (su luz pasa a PALETAS.animas.luz). El final de la corona fría usa corona_fria. luz.radio y luz.altura acá son factores (1 = el del objeto).',
  },
  arma_encantada: {
    que: 'armas encantadas por elemento: una tira de llama a lo largo de la hoja (reemplaza el trazo de armaViva en escena.ts)', celda: 2,
    paleta: { fuego: 'infierno', frio: 'animas', rayo: 'gas', veneno: 'veneno', sombra: 'sombra', luz: 'sagrado', sangre: 'sangre' }, forma: 'tira',
    altura: 0.32, humo: 0.06, turbulencia: 0.55, ruido: 0.5, brillo: 1.7, pegada: 0.7, margen_celdas: 3, hueco_frio: 0.4,
    luz: { radio: 1, altura: 1, intensidad: 1, mueve: 0.3, sombra: false }, brasas: 1.5,
    notas: 'Con q.hoja = [x0, y0, x1, y1] (px desde el ancla del cuadro): grilla de celdas de 2 px que cubre la hoja + margen_celdas a cada lado y 12 celdas más arriba (la llama sube), esquina (gx, gy); forma { tipo: "tira", desde: [(x0 - gx) / 2, (y0 - gy) / 2], hasta: [(x1 - gx) / 2, (y1 - gy) / 2], grosor: 0.9 }. Una grilla por arma visible, rehecha solo si cambia la hoja (cada cuadro de animación). Frío: hueco 0.4. La luz de la mano (luzDeArma) toma k de pulsoLuz(f, 0.3).',
  },
};

/** Lo que va en datos/fuegos_doom.json. */
export function fuegosDoomJson() {
  const fuegos: Record<string, FuegoMundoDoom[]> = {};
  for (const k of Object.keys(FUEGOS_DOOM).sort()) fuegos[k] = FUEGOS_DOOM[k];
  return {
    formato: 'pixelforja-gotico-fuegos-doom', version: 1, pasos_por_segundo: 25,
    notas: 'Ver datos/fuegos_doom.ts y fuego_doom.ts. boca: px desde el ancla del sprite donde va el pie de la grilla (centro de su fila de abajo); ' +
      'grilla en celdas de celda px; dibujar el gemelo sprite (sin llama) en lugar del original y el fuego encima; luz k = intensidad * pulsoLuz(f, mueve).k; ' +
      'forma mascara: el archivo es relativo a esta carpeta (datos/fuegos_doom/*.png, alfa = vitral); ' +
      "mezcla 'sumar' = globalCompositeOperation 'lighter' para la llama (el humo con alfa normal).",
    paletas: Object.fromEntries(Object.values(PALETAS).map((p) => [p.id, { luz: p.luz, mezcla: p.mezcla }])),
    fuegos,
    especiales: ESPECIALES,
  };
}
