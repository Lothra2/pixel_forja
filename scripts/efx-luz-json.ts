// Reescribe src/engine/gotico/datos/luz_efectos.json (la luz de los poderes del taller para el juego) desde
// luz_efectos.ts. El test de luz_efectos lo compara con la tabla: correr esto después de tocar un poder o su luz.
// Uso: npx tsx scripts/efx-luz-json.ts
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const { luzEfectosJson } = await import('../src/engine/gotico/luz_efectos.ts');
const ruta = fileURLToPath(new URL('../src/engine/gotico/datos/luz_efectos.json', import.meta.url));
writeFileSync(ruta, JSON.stringify(luzEfectosJson(), null, 1) + '\n');
console.log('escrito', ruta);
