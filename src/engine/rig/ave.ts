/**
 * Esqueleto de ave, de lado y mirando a la derecha (el juego la espeja para la izquierda). Cada especie es una
 * plantilla de datos con su celda, sus medidas y sus colores: sumar una garza o una guacamaya es sumar una plantilla.
 * Las medidas van en pixeles de la celda propia de la especie y se escalan si se pide otra celda.
 */
export interface AveEspecie {
  /** la celda para la que están las medidas (el gallo en 32, la paloma en 16) */
  celda: number;
  /** dónde va el centro del cuerpo, de 0 a 1 del ancho: así caben la cola atrás y el pico adelante */
  centro: number;
  cuerpo: { rx: number; ry: number };
  cuello: { largo: number; ancho: number };
  /** radio de la cabeza */
  cabeza: number;
  pico: { largo: number; alto: number };
  /** el tarso que se ve (de la pluma del muslo al pie) y el largo del dedo de adelante */
  tarso: number;
  dedo: number;
  /** la cola: `hoz` es la del gallo (plumas largas en arco), `corta` la de la paloma */
  cola: { tipo: 'hoz' | 'corta'; largo: number; alto: number };
  /** el ala plegada sobre el cuerpo y el largo del ala abierta */
  ala: { largo: number; alto: number; abierta: number };
  cresta?: boolean;
  barbilla?: boolean;
  /** collar de plumas largas que cae sobre los hombros (el gallo) o el cuello tornasolado (la paloma) */
  esclavina?: 'capa' | 'tornasol';
  /** barras oscuras en el ala (la paloma) */
  barras?: boolean;
  colores: ColoresAve;
}

export interface ColoresAve {
  contorno: string;
  cuerpo: string; cuerpo_claro: string; cuerpo_oscuro: string;
  ala: string; ala_oscura: string;
  cuello: string; cuello_claro: string; cuello_oscuro?: string;
  cabeza: string;
  cola: string; cola_brillo: string;
  pico: string; pico_oscuro: string;
  pata: string; pata_oscura: string;
  ojo: string; brillo: string;
  cresta?: string; cresta_oscura?: string;
  barra?: string;
}

export const AVES: Record<string, AveEspecie> = {
  /** Gallo de pelea criollo: rojo con la capa dorada, la cola negra con brillo verde, cresta y barbilla rojas. */
  gallo: {
    celda: 32, centro: 0.5,
    cuerpo: { rx: 7, ry: 5 },
    cuello: { largo: 6, ancho: 5 },
    cabeza: 2.8,
    pico: { largo: 3, alto: 2 },
    tarso: 6, dedo: 3,
    cola: { tipo: 'hoz', largo: 8.5, alto: 10 },
    ala: { largo: 9, alto: 5, abierta: 11 },
    cresta: true, barbilla: true, esclavina: 'capa',
    colores: {
      contorno: '#1e1418',
      cuerpo: '#b8302a', cuerpo_claro: '#e04a32', cuerpo_oscuro: '#7a1e22',
      ala: '#9a2a24', ala_oscura: '#5a1a1e',
      cuello: '#f0a030', cuello_claro: '#ffd060', cuello_oscuro: '#b86a20',
      cabeza: '#e85a2a',
      cola: '#1c1c24', cola_brillo: '#2e9a62',
      pico: '#f0c040', pico_oscuro: '#b88a20',
      pata: '#f0c040', pata_oscura: '#b88a20',
      ojo: '#1e1418', brillo: '#fff6e0',
      cresta: '#ff3040', cresta_oscura: '#b8102a',
    },
  },
  /** Paloma de ciudad: gris azulada, el cuello tornasol verde y violeta, dos barras negras en el ala y patas rosadas. */
  paloma: {
    celda: 16, centro: 0.49,
    cuerpo: { rx: 3.9, ry: 2.5 },
    cuello: { largo: 1.8, ancho: 2.5 },
    cabeza: 1.4,
    pico: { largo: 1.1, alto: 1 },
    tarso: 1.6, dedo: 1.4,
    cola: { tipo: 'corta', largo: 2.3, alto: 1.6 },
    ala: { largo: 4.6, alto: 2.3, abierta: 5.5 },
    esclavina: 'tornasol', barras: true,
    colores: {
      contorno: '#1e1418',
      cuerpo: '#8890a4', cuerpo_claro: '#b4bccc', cuerpo_oscuro: '#5c6478',
      ala: '#a4acbe', ala_oscura: '#6c7488',
      cuello: '#3e9a7a', cuello_claro: '#5cc49c', cuello_oscuro: '#8a5aa8',
      cabeza: '#7c849a',
      cola: '#5c6478', cola_brillo: '#2a2c38',
      pico: '#3a3a44', pico_oscuro: '#e8e8f0',
      pata: '#e06a78', pata_oscura: '#a8404e',
      ojo: '#f08a30', brillo: '#1e1418',
      barra: '#2a2c38',
    },
  },
};

/** Una pose del ave. Las distancias van en pixeles de la celda propia de la especie. */
export interface AvePose {
  /** corrimiento del cuerpo hacia adelante */
  dx: number;
  /** el cuerpo sube (+) o se agacha (-) sobre las patas */
  alto: number;
  /** toda el ave sube del piso (el salto, el vuelo) */
  aire: number;
  /** grados: + sube el pecho */
  pitch: number;
  /** grados del cuello desde la vertical: + hacia adelante */
  cuello: number;
  /** 1 es el largo normal; 1.3 el cuello estirado del canto */
  estira: number;
  /** grados: + baja el pico */
  cabeza: number;
  /** 0 cerrado a 1 abierto */
  pico: number;
  ojo: 'abierto' | 'cerrado';
  /** el ala: plegada, o abierta con su ángulo (1 arriba, 0 de lado, -1 abajo) */
  ala: 'plegada' | number;
  /** cada pata: el pie corrido desde la cadera y cuánto se levanta del piso. La primera es la de adelante */
  patas: [{ x: number; sube: number }, { x: number; sube: number }];
  /** en el vuelo las patas van recogidas */
  recogidas?: boolean;
  /** grados que sube la cola */
  cola: number;
  /** pixeles que se infla el pecho */
  pecho: number;
}

export const POSE_AVE: AvePose = {
  dx: 0, alto: 0, aire: 0, pitch: 12, cuello: 18, estira: 1, cabeza: 0, pico: 0, ojo: 'abierto', ala: 'plegada',
  patas: [{ x: 0.8, sube: 0 }, { x: -0.8, sube: 0 }], cola: 0, pecho: 0,
};

export const pose = (p: Partial<AvePose> = {}): AvePose => ({ ...POSE_AVE, ...p, patas: p.patas ?? POSE_AVE.patas });
