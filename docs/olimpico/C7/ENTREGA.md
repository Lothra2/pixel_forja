# Lote C7: los perros de la calle y los gatos de los techos
Estado: entregado en parte (sin el gallo), pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/19
Fecha: 2026-10-12

## Qué se hizo

**Los perros de la calle, x3,** sobre la especie `perro`, con 3 pelajes:

| Id | Nombre | Pelaje |
|---|---|---|
| `perro_calle_1` | Canelo | Caramelo con pecho crema |
| `perro_calle_2` | Negrito | Negro con pecho y patas blancas, el más chico |
| `perro_calle_3` | Manchas | Gris con pecho, patas y antifaz claros |

Cada uno trae `idle`, `walk`, `run`, `bark`, `sleep` y `scratch`, más el resto del catálogo de animales.

**Los gatos de los techos, x2,** sobre la especie `gato`: Mango (`gato_1`, naranja) y Sombra (`gato_2`, negro con patas blancas). Traen `idle`, `walk`, `jump_wall` y `sleep`.

**Motor (para cualquier animal):**
- `sleep`: enroscado, la cabeza sobre las patas de adelante, los ojos cerrados, la cola alrededor y el lomo que respira. Se lee dormido desde lejos. La "Z" la pone el juego.
- `scratch`: sentado, la pata de atrás pateando rápido contra el cuerpo, con la lengua afuera.
- `jump_wall`: se agacha meneando la cola, salta estirado, engancha el borde con las patas de adelante y sube. Tiene `despegue`, `aterriza` y `elevacion` hasta arriba de un muro de dos veces su alzada.
- **`rise` en la pose de cuadrúpedo,** igual que en los humanos: el clip exporta `elevacion` para animales.
- Los nombres de las tres animaciones nuevas están en el estudio.

## Cómo se usa (estudio y kit)

En el `kit.config.json` del juego:

```jsonc
"animales": ["thor", "perro_calle_1", "perro_calle_2", "perro_calle_3", "gato_1", "gato_2"]
```

Las 5 fichas van en `data/fichas/` (copia de `docs/ejemplos/nekketsu/fichas/`). Cada animal sale en `animales/<id>.png + .json` con todas sus animaciones en las 5 filas.

**La escena de la Comuna 13:**
1. El perro está en `sleep` sobre el camino.
2. Al pisarlo: `bark` mirando al atleta, el atleta en `hit` o `fall_getup`.
3. El perro en `run` detrás un rato.

**El gato:**
1. `walk` hasta el muro.
2. `jump_wall`, subiendo el sprite con `elevacion`. El muro va a la altura del último valor.
3. `sleep` arriba.

## Pruebas

- **Prueba nueva `animales.test.ts`:**
  - Las 5 fichas son válidas, con 3 pelajes distintos.
  - **Los 5 pasan el control de calidad en 32, 48 y 64, en las 5 filas,** en todas sus animaciones del lote.
  - Dormido queda a menos de 3/4 de la altura de pie, con los ojos cerrados.
  - Rascarse mueve la pata.
  - El gato sube con `elevacion` sin bajar nunca.
  - Imagen dorada `golden/animales_c7.png`.
- `custom.test.ts`: el kit trae los 6 animales.
- **La imagen dorada de Thor** crece con las 3 animaciones nuevas de animal. Comparé byte por byte: la parte vieja quedó idéntica.
- El e2e del visor cuenta 30 personajes: 24 atletas, Thor y los 5 animales.
- **Suite completa:** 27 archivos, 279 de 279.
- **`npm run build:sitio` limpio y e2e de Playwright 44 de 44.** `tsc` limpio.

## Para aprobar (todo en esta carpeta)

- `perro.gif`: Sophie y Alana llegan caminando, Canelo duerme en el camino, se despierta ladrando, tumba a Sophie y las persigue.
- `gato.gif`: Mango camina, salta al muro con la `elevacion` del manifiesto y se duerme arriba.
- `tablero_animales.png`: cada animal con sus animaciones de lado, todos los cuadros, y el primer cuadro en las 5 filas.

## Decisiones que tomé sin preguntar

1. **El gallo no va en este lote.** El motor solo tiene esqueleto de cuadrúpedo. Un ave de dos patas necesita su esqueleto y su render propios, y meterla en una noche iba a quedar a medias. Queda para un C7b con las otras aves del pedido: paloma, garza, guacamaya y colibrí.
2. **Los perros de la calle son más chicos que Thor** (0.75 a 0.82). Con la cola larga de la especie `perro`, a tamaño 1 se salían de la celda de 48. Además, un perro de la calle flaco al lado del bóxer se lee bien.
3. **El gato es 0.75 a 0.8,** por la misma razón: la cola larga.
4. **`sleep` no lleva el control de altura de "de pie",** porque el lomo respira 1 o 2 px.
5. **El rascado es contra el cuerpo y no en la oreja.** A esta escala la pata de atrás no llega a la oreja sin romperse. Se lee la pata que patea rápido y la lengua afuera.
6. **Sin collar:** son de la calle.

## Límites honestos

- **No hay gallo** (ver arriba). Tampoco el chigüire ni las otras aves de la tabla C7 completa del pedido. Esta noche se pidieron los perros, el gallo y el gato.
- **La cola enrollada de `sleep` casi no se ve de lado:** el cuerpo enroscado la tapa. Se lee "dormido" por la forma baja y los ojos cerrados.
- **El rascado es sutil a 48 px.**
- **El perro que "te tumba" usa las animaciones del atleta (`hit`, `fall_getup`).** El perro no tiene una embestida propia, que sería un `pounce` nuevo.

## Lo que necesita el siguiente lote

- **El juego:** las 5 fichas y la línea de `animales`. La Z del sueño y la lógica de despertar.
- **C7b:** el esqueleto de ave para el gallo y las otras aves. Opcional: `pounce` para el perro que tumba.
- **Dependencia:** esta rama sale de B2/B3 (https://github.com/Lothra2/pixel_forja/pull/18).
