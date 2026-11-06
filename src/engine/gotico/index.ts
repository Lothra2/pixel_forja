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
export { figura, pose, zancada, DIRS, NOMBRE_DIR, CUADROS, type Dir, type Accion, type Atuendo } from './figura';
export { personaje, esqueleto, type Cuerpo, type Equipo, type TipoArma } from './cuerpo';
export { HEROES, MONSTRUOS, type Heroe, type Monstruo } from './catalogo/personajes';
export { JEFES } from './catalogo/jefes';
export { JEFES2 } from './catalogo/jefes2';
export { equipoDeInventario, tinte, type Puesto } from './apariencia';
// luz dinámica de cada poder (para que el juego prenda luces con sombras)
export { LUZ_EFECTO, EFECTOS_NUEVOS, luzEfectosJson, intensidadLuz, rgbLuz, type LuzEfecto } from './luz_efectos';
export { PALETAS as PALETAS_GORE, SUPERFICIES as SUPERFICIES_GORE, GIBS as PEDAZOS_GORE, cuerpo as cadaverConPose, POSES as POSES_CADAVER, type Paleta as PaletaGore } from './catalogo/gore';
export { LUCES_HORROR, veloSangre, VELO_NIVELES, type LuzHorror } from './catalogo/horror';
// fuego de Doom (módulo sin imports que el juego copia y corre en vivo)
export * as fuegoDoom from './fuego_doom';
// efectos de pixelfx mudados al taller (hojas, manifiesto y luz; ver efectos_pfx.ts y AVISOS_TERCEROS.md)
export { EFECTOS_PFX, IDS_PFX, efectoPfx, pintarEfectoPfx, paginasEfectoPfx, pngsEfectoPfx, armarCuadroPfx, manifiestoEfectosPfx, luzEfectosPfxJson, type EfectoPfx, type CfgPfx, type UsoPfx } from './efectos_pfx';
