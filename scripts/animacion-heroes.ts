/**
 * Escribe el manifiesto de animación de los héroes (cuadros por clase y acción, ritmo, cuadro de impacto y zancada) en
 * src/engine/gotico/animacion_heroes.json, que es lo que lee el juego.
 *   npx tsx scripts/animacion-heroes.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { manifiestoAnimacion } from '../src/engine/gotico/figura.ts';

const ruta = join(import.meta.dirname, '../src/engine/gotico/animacion_heroes.json');
writeFileSync(ruta, JSON.stringify(manifiestoAnimacion(), null, 2) + '\n');
console.log('escrito', ruta);
