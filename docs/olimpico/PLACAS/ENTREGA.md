# Lote placas: las placas del nombre de la presentación a 112
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/55
Fecha: 2026-10-15

## Qué se hizo

En `intro_presentacion`, las 4 placas del nombre pasaron de 104 a **112**. Cada una va centrada en su hueco.

**Lo que no se movió:**
- los `huecos`;
- `nombres` sigue en y 252;
- la franja y los marcos.

**Las placas se tocan:**
- Los huecos van cada 108, así que cuatro placas de 112 centradas se pisan 4 px con la vecina. No hay forma de evitarlo sin mover los huecos.
- Por eso las dibujé como **una sola barra de nombres** de x 180 a 616, con una muesca dorada arriba y abajo en el medio de cada separación.
- Las muescas no tocan la fila del texto, así que un nombre de 108 nunca choca con nada.

**Para el juego:** en el manifiesto hay un campo nuevo, `placa: 112`. No le quité nada a ningún campo viejo.

## Cómo se usa (estudio y kit)

**En el kit:** nada nuevo. Al regenerar el kit, sale `ui_intro_presentacion` con las placas nuevas.

**En el juego:**
- Los nombres siguen centrados en x = hueco + 48 menos 80, y en y = `nombres`.
- **DON HERNANDO y ABUELA NERVA van a 1,5.** Medí la tinta: DON HERNANDO ocupa 106 px y ABUELA NERVA 102. Los dos caben dentro de lo oscuro.
- Los nombres de 8 letras o menos siguen a 2.

**El conteo:** no cambia. Es el mismo PNG.

## Pruebas

- **En `intro.test.ts`:**
  - la placa mide 112 y el manifiesto trae `placa: 112` y `nombres: 252`;
  - en cada hueco, los 108 px del centro y las 11 filas del texto son oscuros, así que DON HERNANDO a 1,5 cae en lo oscuro.
- **La suite sin `custom.test.ts`:** 56 archivos, 552 de 552.
- **`custom.test.ts`: 15 de 15,** con el kit en 272 s, por debajo del límite de 300. Son 567 en total.
- **`tsc` y `npm run build:sitio`:** limpios.
- **El e2e no lo corrí,** porque el estudio no usa esta pieza.

## Para aprobar (todo en esta carpeta)

- **`placas_112.png`:** Bogotá con los Rolos y Maracaibo con los Maracuchos.
  - Los nombres largos van a 1,5 y los cortos a 2, como en el juego.
  - Los retratos son los de bloques.
- **`placas_112_cerca.png`:** la barra de Bogotá a x3, para ver que DON HERNANDO cabe y dónde caen las muescas.

## Decisiones que tomé sin preguntar

1. **Una barra con muescas, y no cuatro placas encimadas.** Cuatro placas de 112 encimadas dejaban un borde doble en el medio de cada separación, y ese borde caía justo donde va el texto de un nombre de 108. Con la barra, el texto tiene todo el ancho libre.
2. **`placa` es un campo nuevo** del manifiesto. El juego puede leer el ancho de ahí en vez de tenerlo fijo.

## Límites honestos

- **Dos nombres largos uno al lado del otro** quedarían pegados, sin espacio entre ellos. Los huecos van cada 108, así que no se arregla con la placa. Hoy los dos largos van de últimos en su equipo, así que no pasa.
- **DON HERNANDO llega al borde:** queda 1 px de lo oscuro a su derecha. Si el juego le pone sombra al texto, la sombra pisa el filete dorado.

## Lo que necesita el siguiente lote

- **El juego:**
  - regenerar el kit después de unir este PR;
  - poner DON HERNANDO y ABUELA NERVA a 1,5;
  - apuntar el submódulo al commit nuevo.
- **Lo que queda del mensaje:** nada. Con esto se cierra la tanda. C3 sigue en pausa.
