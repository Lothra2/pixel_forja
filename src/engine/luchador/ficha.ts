import { type Lab, labToLch, lchToLab, labToHex, hexToLab } from '../color/oklab';

/**
 * El luchador de pelea, estilo Street Fighter 2: proporciones de 7 cabezas y media, de lado y con el pecho girado hacia
 * la cámara, pintado a pixel con luz por volumen en bandas, como los sprites de Capcom.
 *
 * Todo va en pixeles de la imagen final (no se agranda nada): un luchador de 104 de alto parado derecho mide en guardia
 * unos 94, como Ryu en una pantalla de 384 x 224.
 */
export interface LuchadorFicha {
  id: string;
  nombre: string;
  /** alto parado derecho, en pixeles */
  altura: number;
  /** 0 flaco, 0,5 atlético, 1 grandote */
  contextura: number;
  /** cuántas cabezas mide de alto: 7 un adulto de SF2, 5 una niña de anime. Si no viene, 7 */
  cabezas?: number;
  colores: {
    piel: string;
    pelo: string;
    /** las canas de los lados (o el mismo pelo si no tiene) */
    canas: string;
    barba: string;
    /** la barba de la barbilla (más canosa) */
    barbaCanas: string;
    ojos: string;
    camisa: string;
    short: string;
    zapato: string;
    suela: string;
    /** el marco de los lentes, o null sin lentes */
    lentes: string | null;
    muñequera: string | null;
    /** el lazo del pelo, si lleva */
    lazo?: string;
  };
  /** el traje por piezas. Si no viene, va el casual con los colores de arriba (camisa, short, zapato) */
  ropa?: Ropa;
  /** cómo es la cabeza */
  cabeza: {
    /** entradas: 0 sin entradas, 1 bien marcadas */
    entradas: number;
    /** largo del pelo arriba: 0 rapado, 1 con volumen */
    volumen: number;
    /** barba: 0 afeitado, 1 de candado, 2 corta completa */
    barba: 0 | 1 | 2;
    /** la cara: la de adulto de SF2 o la de niña de anime (cara redonda, ojos grandes) */
    forma?: 'adulto' | 'niña';
    /** el peinado: corto, o con flequillo y cola de caballo alta con lazo */
    peinado?: 'corto' | 'cola';
  };
}

export type TorsoRopa = 'polo' | 'gi' | 'franelilla' | 'nada' | 'kimono';
export type PiernasRopa = 'short' | 'gi' | 'cargo' | 'licra';
export type PiesRopa = 'zapatillas' | 'descalzo' | 'botas';

/**
 * El traje del luchador, por piezas: arriba, abajo, los pies y los accesorios de pelea (cinturón con puntas, cintillo
 * con colas, guantes sin dedos y vendas en los tobillos). Cada pieza con su color.
 */
export interface Ropa {
  torso: TorsoRopa;
  piernas: PiernasRopa;
  pies: PiesRopa;
  colores: {
    torso: string;
    /** el borde de la tela: la solapa del gi, el cuello */
    ribete?: string;
    piernas: string;
    pies: string;
    suela?: string;
    cinturon?: string | null;
    cintillo?: string | null;
    guantes?: string | null;
    vendas?: string | null;
  };
}

/** Los trajes de muestra. */
export const TRAJES: Record<'gi' | 'calle' | 'casual' | 'agil', Ropa> = {
  gi: {
    torso: 'gi', piernas: 'gi', pies: 'descalzo',
    colores: { torso: '#b51f2c', ribete: '#7e121c', piernas: '#b51f2c', pies: '#e2a77c', cinturon: '#1e1a22', cintillo: '#f2efe8', guantes: '#22222c', vendas: '#efe9dc' },
  },
  calle: {
    torso: 'franelilla', piernas: 'cargo', pies: 'botas',
    colores: { torso: '#24242c', piernas: '#5e6a3c', pies: '#3a2c22', suela: '#1a1614', cinturon: '#4a3626', cintillo: '#c41e2c', guantes: '#c41e2c' },
  },
  /** el de Sophie: kimono corto turquesa cruzado, licra azul noche, zapatillas y cinturón rosado */
  agil: {
    torso: 'kimono', piernas: 'licra', pies: 'zapatillas',
    colores: { torso: '#2fb4c8', ribete: '#f4f1ea', piernas: '#283462', pies: '#f4f2ee', suela: '#ff5c9a', cinturon: '#ff5c9a', cintillo: null, guantes: null },
  },
  casual: {
    torso: 'polo', piernas: 'short', pies: 'zapatillas',
    colores: { torso: '#b41f2f', piernas: '#9ba3ab', pies: '#eeeeea', suela: '#4a4a56', guantes: null, cinturon: null, cintillo: null },
  },
};

/** Rampa de 6 tonos: [contorno, muy oscuro, sombra, base, luz, brillo]. Las sombras giran a rojo violeta, las luces a amarillo. */
export type Rampa6 = [string, string, string, string, string, string];

const COOL = (300 * Math.PI) / 180;
const WARM = (85 * Math.PI) / 180;

function giro(h: number, target: number, max: number, C: number): number {
  if (C < 0.02) return h;
  let d = target - h;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return h + Math.sign(d) * Math.min(Math.abs(d), max);
}

function tono(base: Lab, dL: number, kC: number, target: number, gradosMax: number): string {
  const [L, C, h] = labToLch(base);
  return labToHex(lchToLab([Math.max(0.04, Math.min(0.99, L + dL)), C * kC, giro(h, target, (gradosMax * Math.PI) / 180, C)]));
}

const cache = new Map<string, Rampa6>();

/** La rampa de 6 tonos de un color base. En los colores muy oscuros los tonos se separan igual, para que no se repitan. */
export function rampa6(hex: string): Rampa6 {
  const c = cache.get(hex);
  if (c) return c;
  const b = hexToLab(hex);
  const L = b[0];
  const d = [Math.min(-0.3, 0.24 - L), -0.21, -0.105, 0, L > 0.88 ? 0.035 : 0.08, L > 0.88 ? 0.06 : 0.15];
  // cada tono al menos un poco más claro que el anterior (y el más oscuro no baja de 0,05)
  const t = d.map((x) => L + x);
  t[0] = Math.max(0.05, t[0]);
  for (let i = 1; i < 6; i++) t[i] = Math.max(t[i], t[i - 1] + 0.035);
  const k = [0.85, 1.12, 1.1, 1, 0.92, 0.7], meta = [COOL, COOL, COOL, 0, WARM, WARM], g = [30, 22, 12, 0, 8, 14];
  const r = t.map((Li, i) => (i === 3 && Li === L ? labToHex(b) : tono(b, Li - L, k[i], meta[i], g[i]))) as Rampa6;
  cache.set(hex, r);
  return r;
}

/**
 * Rick como luchador: el de las fotos (las entradas, las canas, la barba con la barbilla canosa y los lentes
 * transparentes), con cuerpo de peleador y el gi rojo sin mangas. Con `ropa: TRAJES.casual` vuelve el polo y el short.
 */
export const RICK_LUCHADOR: LuchadorFicha = {
  id: 'rick',
  nombre: 'RICK',
  altura: 104,
  contextura: 0.85,
  colores: {
    piel: '#e2a77c',
    pelo: '#2c221e',
    canas: '#8c8580',
    barba: '#4d3b32',
    barbaCanas: '#a39a92',
    ojos: '#3a2a20',
    camisa: '#b41f2f',
    short: '#9ba3ab',
    zapato: '#eeeeea',
    suela: '#4a4a56',
    lentes: '#c4d2e0',
    muñequera: '#1c1c28',
  },
  ropa: TRAJES.gi,
  cabeza: { entradas: 0.7, volumen: 0.6, barba: 2 },
};

/**
 * Sophie como luchadora: una niña de anime de 5 cabezas, la cara redonda con ojos grandes, el pelo oscuro con flequillo
 * y cola alta con lazo rosado, y el kimono turquesa (su color). Mide un poco más de dos tercios de Rick.
 */
export const SOPHIE_LUCHADORA: LuchadorFicha = {
  id: 'sophie',
  nombre: 'SOPHIE',
  altura: 74,
  contextura: 0.1,
  cabezas: 4.6,
  colores: {
    piel: '#efc29c',
    pelo: '#2a1a12',
    canas: '#2a1a12',
    barba: '#2a1a12',
    barbaCanas: '#2a1a12',
    ojos: '#4a2a1a',
    camisa: '#2fb4c8',
    short: '#283462',
    zapato: '#f4f2ee',
    suela: '#ff5c9a',
    lentes: null,
    muñequera: null,
    lazo: '#ff5c9a',
  },
  ropa: TRAJES.agil,
  cabeza: { entradas: 0, volumen: 0.8, barba: 0, forma: 'niña', peinado: 'cola' },
};
