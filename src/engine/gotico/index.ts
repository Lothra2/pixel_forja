/**
 * Taller gótico: assets isométricos originales con las proporciones de los juegos de rol oscuros de 1999-2000
 * (piso en rombos de 160×80, celdas de 32×16, persona de 75 px). Ver GUIA.md.
 */
// todo el catálogo: cada archivo de catalogo/ registra sus objetos al cargarse
import.meta.glob('./catalogo/*.ts', { eager: true });
export * from './render';
export { MATERIALES, ID_MATERIALES, type Material } from './materiales';
export * from './objeto';
export * from './pisos';
export * from './mapa';
export * from './escenas';
export { figura, pose, DIRS, NOMBRE_DIR, CUADROS, type Dir, type Accion, type Atuendo } from './figura';
export { personaje, esqueleto, type Cuerpo, type Equipo, type TipoArma } from './cuerpo';
export { HEROES, MONSTRUOS, type Heroe, type Monstruo } from './catalogo/personajes';
