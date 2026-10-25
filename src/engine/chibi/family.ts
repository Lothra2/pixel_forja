import { defaultLook, cloneLook, VINOTINTO, DORADO, CREMA, type ChibiLook } from './look';

/**
 * La familia en chibi: siete muñecos con cinco trajes cada uno (Thor con los suyos).
 * Solo medidas y colores escritos a mano, ninguna foto vive en el código.
 */

export type MiembroId = 'rick' | 'steph' | 'sophie' | 'alana' | 'thor' | 'andre' | 'rosita';
export type TrajeId = 'siempre' | 'casual' | 'deportivo' | 'pijama' | 'pelea';
export const MIEMBROS: MiembroId[] = ['rick', 'steph', 'sophie', 'alana', 'thor', 'andre', 'rosita'];
export const TRAJES: TrajeId[] = ['siempre', 'casual', 'deportivo', 'pijama', 'pelea'];
export const NOMBRE_TRAJE: Record<TrajeId, [string, string]> = {
  siempre: ['De siempre', 'Everyday'], casual: ['Casual de calle', 'Street casual'], deportivo: ['Vinotinto', 'Vinotinto'],
  pijama: ['Pijama y Navidad', 'Pajamas & Xmas'], pelea: ['De pelea', 'Fighter'],
};
export const NOMBRE_MIEMBRO: Record<MiembroId, string> = {
  rick: 'Rick', steph: 'Steph', sophie: 'Sophie', alana: 'Alana', thor: 'Thor', andre: 'Andre Panda', rosita: 'Rosita',
};

type Base = Omit<ChibiLook, 'arriba' | 'abajo' | 'zapatos'>;
type Traje = Pick<ChibiLook, 'arriba' | 'abajo' | 'zapatos'> & Partial<ChibiLook>;

const d = defaultLook();
const BASE: Record<MiembroId, Base> = {
  rick: {
    ...d, nombre: 'Rick', contextura: 'hombre', piel: '#c98e70',
    pelo: { estilo: 'atras', color: '#2e231f' }, ojos: { estilo: 'punto', color: '#3a2418' }, cejas: { estilo: 'gruesas' }, boca: 'sonrisa',
    barba: { estilo: 'barba', color: '#8e8780' }, lentes: { estilo: 'cuadrados', color: '#1e1e24' },
    poder: { estilo: 'bola', color: '#4ab8ff', color2: '#e8fbff' },
  },
  steph: {
    ...d, nombre: 'Steph', contextura: 'mujer', piel: '#c99272',
    pelo: { estilo: 'largo', color: '#1a1416' }, ojos: { estilo: 'pestanas', color: '#3a2418' }, cejas: { estilo: 'finas' }, boca: 'sonrisa',
    aretes: { estilo: 'aro', color: '#e8b830' },
    poder: { estilo: 'corazon', color: '#ff5c8a', color2: '#ffe0ea' },
  },
  sophie: {
    ...d, nombre: 'Sophie', contextura: 'nino', piel: '#c99470',
    pelo: { estilo: 'cola', color: '#24160f', color2: '#e86aa0' }, ojos: { estilo: 'grandes', color: '#2e1c14' }, cejas: { estilo: 'finas' }, boca: 'sonrisa',
    marca: 'cachetes',
    poder: { estilo: 'burbuja', color: '#3fd0d0', color2: '#e8ffff' },
  },
  alana: {
    ...d, nombre: 'Alana', contextura: 'pequena', piel: '#c48a66',
    pelo: { estilo: 'rizos', color: '#1e130e' }, ojos: { estilo: 'grandes', color: '#2e1c14' }, cejas: { estilo: 'finas' }, boca: 'abierta',
    marca: 'cachetes',
    poder: { estilo: 'estrella', color: '#f4c430', color2: '#fff6c8' },
  },
  thor: {
    ...d, nombre: 'Thor', especie: 'perro', contextura: 'adulto', piel: '#b5713a',
    pelo: { estilo: 'calvo', color: '#b5713a' }, ojos: { estilo: 'punto', color: '#141014' }, cejas: { estilo: 'normal' }, boca: 'linea',
    perro: { pelaje: '#b5713a', blanco: '#f0ece4', mascara: '#2a1e18', collar: '#225fd4', capa: null, antifaz: null },
    poder: { estilo: 'rayo', color: '#f4d030', color2: '#fffbe0' },
  },
  andre: {
    ...d, nombre: 'Andre Panda', contextura: 'robusta', piel: '#d8a47a',
    pelo: { estilo: 'largo', color: '#141014' }, ojos: { estilo: 'punto', color: '#141014' }, cejas: { estilo: 'normal' }, boca: 'abierta',
    marca: 'panda', gorro: { estilo: 'panda', color: '#141014' },
    poder: { estilo: 'balon', color: '#f4f2ee', color2: '#141014' },
  },
  rosita: {
    ...d, nombre: 'Rosita', contextura: 'abuela', piel: '#e2b494',
    pelo: { estilo: 'recogido', color: '#dcd8d2' }, ojos: { estilo: 'felices', color: '#3a2418' }, cejas: { estilo: 'finas', color: '#a8a29a' }, boca: 'sonrisa',
    lentes: { estilo: 'gato', color: '#c8a040' }, aretes: { estilo: 'aro', color: '#e8b830' },
    poder: { estilo: 'arepa', color: '#f2d79a', color2: '#c89650' },
  },
};

const TRAJES_DE: Record<MiembroId, Record<TrajeId, Traje>> = {
  rick: {
    siempre: { arriba: { estilo: 'franela', color: '#26272c', color2: '#e8b830', estampado: 'gg' }, abajo: { estilo: 'jean', color: '#3a4256' }, zapatos: { estilo: 'tenis', color: '#f4f2ee', color2: '#c9c6c0' } },
    casual: { arriba: { estilo: 'polo', color: '#c0392b', color2: '#f4f2ee' }, abajo: { estilo: 'short', color: '#2f4a7a' }, zapatos: { estilo: 'tenis', color: '#f4f2ee', color2: '#c0392b' }, medias: '#f4f2ee', gorro: { estilo: 'gorra', color: '#1f3a7a', color2: '#1f3a7a' } },
    deportivo: { arriba: { estilo: 'vinotinto', color: VINOTINTO, color2: DORADO, color3: CREMA, estampado: 'numero', numero: '10' }, abajo: { estilo: 'short', color: '#141014' }, zapatos: { estilo: 'tacos', color: '#141014', color2: '#f4f2ee' }, medias: VINOTINTO },
    pijama: { arriba: { estilo: 'sueter', color: '#c0392b', color2: '#f4f2ee', estampado: 'copos' }, abajo: { estilo: 'pijama', color: '#2f6b3a' }, zapatos: { estilo: 'pantuflas', color: '#7a4a26' }, gorro: { estilo: 'navidad', color: '#d8202a', color2: '#f4f2ee' } },
    pelea: { arriba: { estilo: 'gi_sin_mangas', color: '#c8202a', color3: '#141014' }, abajo: { estilo: 'gi', color: '#c8202a' }, zapatos: { estilo: 'descalzo', color: '#c98e70' }, guantes: '#26272c', gorro: { estilo: 'vincha', color: '#f4f2ee' }, medias: null },
  },
  steph: {
    siempre: { arriba: { estilo: 'franela', color: '#f4a5b5', color2: '#e0243c', estampado: 'corazon' }, abajo: { estilo: 'jean', color: '#3c4a6a' }, zapatos: { estilo: 'tenis', color: '#f4f2ee', color2: '#f4a5b5' } },
    casual: { arriba: { estilo: 'top', color: '#f4f2ee' }, abajo: { estilo: 'falda', color: '#2f2f3a' }, zapatos: { estilo: 'botines', color: '#5a3a22' }, gorro: { estilo: 'boina', color: '#c0392b' }, lentes: { estilo: 'sol', color: '#141014' } },
    deportivo: { arriba: { estilo: 'vinotinto', color: VINOTINTO, color2: DORADO, color3: CREMA }, abajo: { estilo: 'leggings', color: '#141014' }, zapatos: { estilo: 'tenis', color: '#f4f2ee', color2: VINOTINTO }, pelo: { estilo: 'cola', color: '#1a1416', color2: DORADO } },
    pijama: { arriba: { estilo: 'pijama', color: '#f4c6d8', color2: '#f4f2ee', estampado: 'puntos' }, abajo: { estilo: 'pijama', color: '#f4c6d8' }, zapatos: { estilo: 'pantuflas', color: '#f4f2ee' }, gorro: { estilo: 'navidad', color: '#d8202a', color2: '#f4f2ee' } },
    pelea: { arriba: { estilo: 'chaqueta', color: '#c8202a', color2: '#141014' }, abajo: { estilo: 'short', color: '#141014' }, zapatos: { estilo: 'botas', color: '#1a1a20' }, medias: '#2a2228', guantes: '#141014', pelo: { estilo: 'colitas', color: '#1a1416', color2: '#3a6ad8' }, utileria: { estilo: 'bate', color: '#c89650' } },
  },
  sophie: {
    siempre: { arriba: { estilo: 'franela', color: '#3fa8c8', color2: '#f4f2ee', estampado: 'estrella' }, abajo: { estilo: 'falda', color: '#2f96bd' }, zapatos: { estilo: 'tenis', color: '#f4f2ee', color2: '#e86aa0' }, medias: '#f4f2ee' },
    casual: { arriba: { estilo: 'sudadera', color: '#8a4fd8' }, abajo: { estilo: 'short', color: '#3c4a6a' }, zapatos: { estilo: 'tenis', color: '#f4f2ee', color2: '#8a4fd8' }, medias: '#f4f2ee', gorro: { estilo: 'gorra_atras', color: '#e86aa0', color2: '#f4f2ee' } },
    deportivo: { arriba: { estilo: 'vinotinto', color: VINOTINTO, color2: DORADO, color3: CREMA, estampado: 'numero', numero: '7' }, abajo: { estilo: 'short', color: '#141014' }, zapatos: { estilo: 'tacos', color: '#f4f2ee', color2: '#e86aa0' }, medias: VINOTINTO },
    pijama: { arriba: { estilo: 'pijama', color: '#b8e0f4', color2: '#f4f2ee', estampado: 'estrella' }, abajo: { estilo: 'pijama', color: '#b8e0f4' }, zapatos: { estilo: 'pantuflas', color: '#e86aa0' }, gorro: { estilo: 'lazo', color: '#e86aa0', color2: '#f4f2ee' } },
    pelea: { arriba: { estilo: 'kimono', color: '#2fc0c0', color2: '#f4f2ee', color3: '#e86aa0' }, abajo: { estilo: 'leggings', color: '#1f2a5a' }, zapatos: { estilo: 'tenis', color: '#f4f2ee', color2: '#e86aa0' }, gorro: { estilo: 'lazo', color: '#e86aa0', color2: '#f4f2ee' } },
  },
  alana: {
    siempre: { arriba: { estilo: 'franela', color: '#f3dcdc', color2: '#e86aa0', estampado: 'corazon' }, abajo: { estilo: 'pantalon', color: '#f4ebe8' }, zapatos: { estilo: 'descalzo', color: '#c48a66' } },
    casual: { arriba: { estilo: 'vestido', color: '#f4a5b5', color2: '#f4f2ee', estampado: 'flores' }, abajo: { estilo: 'short', color: '#f4a5b5' }, zapatos: { estilo: 'sandalias', color: '#e86aa0' }, gorro: { estilo: 'flor', color: '#f4c430', color2: '#c0392b' } },
    deportivo: { arriba: { estilo: 'vinotinto', color: VINOTINTO, color2: DORADO, color3: CREMA }, abajo: { estilo: 'short', color: '#141014' }, zapatos: { estilo: 'tenis', color: '#f4f2ee', color2: VINOTINTO }, medias: '#f4f2ee' },
    pijama: { arriba: { estilo: 'pijama', color: '#d8b8f4', color2: '#f4f2ee', estampado: 'estrella' }, abajo: { estilo: 'pijama', color: '#d8b8f4' }, zapatos: { estilo: 'pantuflas', color: '#f4f2ee' }, gorro: { estilo: 'navidad', color: '#d8202a', color2: '#f4f2ee' } },
    pelea: { arriba: { estilo: 'jeogori', color: '#f4a5c8', color2: '#d8202a' }, abajo: { estilo: 'falda_larga', color: '#c8a8e8' }, zapatos: { estilo: 'zapatos', color: '#f48ab0' }, gorro: { estilo: 'tiara', color: '#e8b830', color2: '#e8455a' }, utileria: { estilo: 'varita', color: '#e8b830', color2: '#fff6a0' } },
  },
  thor: {
    siempre: { arriba: { estilo: 'nada', color: '#b5713a' }, abajo: { estilo: 'short', color: '#b5713a' }, zapatos: { estilo: 'descalzo', color: '#f0ece4' } },
    casual: { arriba: { estilo: 'nada', color: '#b5713a' }, abajo: { estilo: 'short', color: '#b5713a' }, zapatos: { estilo: 'descalzo', color: '#f0ece4' }, accesorio: { estilo: 'bufanda', color: '#c0392b' } },
    deportivo: { arriba: { estilo: 'vinotinto', color: VINOTINTO, color2: DORADO }, abajo: { estilo: 'short', color: '#b5713a' }, zapatos: { estilo: 'descalzo', color: '#f0ece4' } },
    pijama: { arriba: { estilo: 'nada', color: '#b5713a' }, abajo: { estilo: 'short', color: '#b5713a' }, zapatos: { estilo: 'descalzo', color: '#f0ece4' }, gorro: { estilo: 'navidad', color: '#d8202a', color2: '#f4f2ee' } },
    pelea: { arriba: { estilo: 'nada', color: '#b5713a' }, abajo: { estilo: 'short', color: '#b5713a' }, zapatos: { estilo: 'descalzo', color: '#f0ece4' }, accesorio: { estilo: 'capa', color: '#d8202a' } },
  },
  andre: {
    siempre: { arriba: { estilo: 'vinotinto', color: VINOTINTO, color2: DORADO, color3: CREMA, estampado: 'numero', numero: '9' }, abajo: { estilo: 'short', color: '#141014' }, zapatos: { estilo: 'tacos', color: '#141014', color2: '#f4f2ee' }, medias: '#141014' },
    casual: { arriba: { estilo: 'sudadera', color: '#f4f2ee' }, abajo: { estilo: 'jean', color: '#26272c' }, zapatos: { estilo: 'tenis', color: '#141014', color2: '#f4f2ee' }, accesorio: { estilo: 'mochila', color: '#141014' } },
    deportivo: { arriba: { estilo: 'vinotinto', color: VINOTINTO, color2: DORADO, color3: CREMA, estampado: 'numero', numero: '9' }, abajo: { estilo: 'short', color: '#141014' }, zapatos: { estilo: 'tacos', color: '#141014', color2: '#f4f2ee' }, medias: VINOTINTO },
    pijama: { arriba: { estilo: 'pijama', color: '#f4f2ee', color2: '#141014', estampado: 'puntos' }, abajo: { estilo: 'pijama', color: '#141014' }, zapatos: { estilo: 'pantuflas', color: '#f4f2ee' } },
    pelea: { arriba: { estilo: 'vinotinto', color: VINOTINTO, color2: DORADO, color3: CREMA, estampado: 'numero', numero: '9' }, abajo: { estilo: 'short', color: '#141014' }, zapatos: { estilo: 'tacos', color: '#141014', color2: '#f4f2ee' }, medias: '#141014', guantes: '#141014' },
  },
  rosita: {
    siempre: { arriba: { estilo: 'floreada', color: '#7a9ad8', color2: '#f4f2ee', estampado: 'flores' }, abajo: { estilo: 'pantalon', color: '#f4f2ee' }, zapatos: { estilo: 'zapatos', color: '#8a5a3c' }, accesorio: { estilo: 'collar', color: '#f4f2ee' } },
    casual: { arriba: { estilo: 'delantal', color: '#e86a6a', color2: '#f4f2ee' }, abajo: { estilo: 'pantalon', color: '#3a4256' }, zapatos: { estilo: 'pantuflas', color: '#c0392b' }, utileria: { estilo: 'cuchara', color: '#c89650' } },
    deportivo: { arriba: { estilo: 'sudadera', color: VINOTINTO }, abajo: { estilo: 'pantalon', color: '#26272c' }, zapatos: { estilo: 'tenis', color: '#f4f2ee', color2: VINOTINTO }, gorro: { estilo: 'gorra', color: VINOTINTO, color2: DORADO } },
    pijama: { arriba: { estilo: 'sueter', color: '#c8202a', color2: '#f4f2ee', estampado: 'copos' }, abajo: { estilo: 'pantalon', color: '#f4f2ee' }, zapatos: { estilo: 'pantuflas', color: '#c8202a' } },
    pelea: { arriba: { estilo: 'sueter', color: '#c8202a', color2: '#f4f2ee', estampado: 'copos' }, abajo: { estilo: 'pantalon', color: '#f4f2ee' }, zapatos: { estilo: 'pantuflas', color: '#c8202a' }, utileria: { estilo: 'paleta', color: '#a8723c' } },
  },
};

/** El muñeco de un miembro con un traje (copia nueva, se puede editar en la tienda). */
export function familiar(id: MiembroId, traje: TrajeId = 'siempre'): ChibiLook {
  const b = BASE[id], t = TRAJES_DE[id][traje];
  return cloneLook({ ...b, ...t, nombre: b.nombre } as ChibiLook);
}
