/**
 * Gemelos sin llama de los objetos con fuego de Doom (`<id>_sin_llama`): las mismas variantes y la misma semilla, un
 * solo cuadro, sin las piezas de llama y con los vitrales apagados. El juego dibuja el gemelo y encima el fuego vivo
 * (ver fuegos_mundo.ts y datos/fuegos_doom.ts). Se registran acá, después de cargar los catálogos que los tienen.
 */
import './abadia_oria';
import './abismo';
import './ahogada';
import './arcano';
import './campamento';
import './campo';
import './catacumbas2';
import './celestial';
import './cementerio';
import './cementerio2';
import './comun';
import './cripta';
import './cueva';
import './desierto2';
import './fortaleza';
import './fortaleza2';
import './hielo';
import './hielo2';
import './infierno';
import './infierno2';
import './mina';
import './monasterio';
import './muebles';
import './nieve';
import './nieve2';
import './paramo';
import './pueblo';
import './selva';
import './selva2';
import './templo_selva';
import './tumba';
import { REGISTRO } from '../objeto';
import { registrarSinLlama } from '../fuegos_mundo';
import { IDS_FUEGO_DOOM } from '../datos/fuegos_doom';

for (const id of IDS_FUEGO_DOOM) if (REGISTRO.some((d) => d.id === id)) registrarSinLlama(id);
