import { registrar } from '../objeto';
import { armaSuelta } from '../cuerpo';
import { ARMAS_LEGENDARIAS, especLegendaria } from '../datos/arsenal_datos';

/**
 * El arsenal elemental en el taller: las 60 armas legendarias con nombre propio como objetos del mundo (flotan
 * girando como botín, tiradas en el piso o clavadas en la tierra), con su forma forjada, su elemento y su luz.
 *
 * Lo que el juego importa del arsenal (todo sale de acá o de datos/arsenal_datos.ts y elementos_arma.ts):
 *  - `AFINIDAD_ARMA` (familia → clase → 'afin' | 'neutra' | 'torpe'), también en `datos/afinidad_armas.json`;
 *  - `LUZ_ELEMENTO_ARMA` y `luzDeArma(elemento, nivel)` para la luz dinámica y las sombras;
 *  - `FAMILIAS_ARMA`, `TIERS_ARMA`, `ELEMENTOS_ARMA`, `ARMAS_LEGENDARIAS`, `idArma` y `especArma` (el arma 3D de una
 *    combinación, que sirve igual para `Equipo.arma` y para el ícono).
 */
export {
  AFINIDAD_ARMA, CLASES_HEROE, FAMILIAS_ARMA, FAMILIA, TIERS_ARMA, ELEMENTOS_ARMA, NOMBRE_ELEMENTO, ARMAS_LEGENDARIAS, GEMA_ELEMENTO,
  elementosDe, especArma, especLegendaria, idArma, matHoja,
  type Afinidad, type ClaseId, type FamiliaArma, type NivelArma, type ElementoArma, type EspecArma, type ArmaLegendaria, type DefFamilia,
} from '../datos/arsenal_datos';
export { LUZ_ELEMENTO_ARMA, luzDeArma, capaElemental, type LuzElemento } from '../elementos_arma';

for (const l of ARMAS_LEGENDARIAS) {
  const arma = especLegendaria(l);
  registrar({
    id: `arma_${l.id}`, nombre: [l.nombre.es, l.nombre.en], tema: 'armas',
    variantes: ['flota', 'suelo', 'clavada'], cuadros: 8, t: 3, huella: [1, 1], bloquea: false,
    armar: (v, f) => armaSuelta(arma.tipo, arma, v as 'flota', f),
  });
}
