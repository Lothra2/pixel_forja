# Lote cinta: la cinta de participación del cuarto puesto
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/51
Fecha: 2026-10-15

## Qué se hizo

Dos piezas nuevas, `cinta_16` y `cinta_32`. Son la cinta de participación para el cuarto puesto, del tamaño de `medallas_16` y `medallas_32`. Reemplazan el círculo gris del cuarto en la tabla de resultados.

- **Qué es:** una escarapela de tela turquesa plisada, con la cinta en V arriba como las medallas y un botón crema en el medio. A 32 el botón lleva una estrellita y a 16 un punto.
- **Dónde se ancla:** la escarapela va donde va el disco de la medalla y ocupa la misma caja, con 1 px de diferencia a 16 y 2 px a 32. Puesta en la columna de las medallas, queda alineada con oro, plata y bronce.
- **Por qué de tela y no de metal:** se lee como "participaste" y no como una cuarta medalla. El turquesa no se confunde con ningún metal ni con la cinta roja. Al lado del oro, la plata y el bronce se ve de la misma familia, y ya no desentona como el círculo gris.
- **Los colores:** son 5 tonos en `TELA_CINTA`, con el mismo esquema de luz arriba a la izquierda que las medallas.
- **El manifiesto:** cada pieza trae `puesto: 4` y una `nota`.

**Lo que no cambió:** `medallas_16`, `medallas_32` y `medallas_64` salen iguales, con sus 3 cuadros y su `orden`. La cinta va en piezas aparte para no tocar el formato que el juego ya usa.

## Cómo se usa (estudio y kit)

**En el kit:** nada nuevo en `kit.config.json`. Sale con la parte `medallas`, así que con `"interfaz": true` o `["medallas", ...]` salen `ui/cinta_16.png` y `ui/cinta_32.png`.

**Lo que tiene que conectar el juego:**
- **En `resultados()` de `src/events/base.ts`:** ahí sale hoy el círculo gris 0x6a6a8a con el 4.
  - Cuando `i === 3` y `hayUi(this, 'cinta_32')`, pon `this.add.image(170, y, 'ui_cinta_32')` en el mismo sitio de las medallas de 32, sin el círculo ni el número.
  - Si no está la pieza, deja el círculo de siempre.
- **`cinta_16`** es para la fila del medallero o para cualquier lista donde vayan las medallas de 16.
- Es una imagen de un cuadro, así que no necesita `setFrame`.

**El conteo:** son dos PNG más, en `ui.interfaz`, que el juego empaqueta. El artifact sigue en 500.

## Pruebas

- **Prueba nueva `cinta.test.ts`, 2 casos:**
  - **Las piezas:**
    - `cinta_16` y `cinta_32` miden lo mismo que las medallas y ocupan su misma caja;
    - no usan ningún color de metal ni de la cinta roja;
    - más del 60 % de lo pintado es la tela turquesa;
    - van opacas o transparentes, sin mezcla, y salen igual cada vez.
  - **En el kit a medida:** salen con `medallas` y las medallas no cambian de formato, con sus 3 cuadros y su `orden`.
- **`custom.test.ts`:** el conteo de PNG del envoltorio sube de 46 a 48.
- **La suite sin `custom.test.ts`:** 54 archivos, 538 de 538.
- **`custom.test.ts`: 15 de 15,** con el kit generado en 252 s, por debajo del límite de 300.
- **`tsc` limpio, `npm run build:sitio` limpio y e2e de Playwright 50 de 50.**

## Para aprobar (todo en esta carpeta)

- **`cinta_y_medallas.png`:** en una fila, el oro, la plata, el bronce, la cinta y el círculo gris de hoy, a 32 arriba y a 16 abajo. Va a x4 para verlo bien.
- **`cinta_sola_x1.png`:** la cinta a tamaño real, la de 32 y la de 16.

Qué mirar: que la cinta se vea del mismo set que las medallas sin parecer una cuarta medalla, y que la de 16 se lea en la fila del medallero.

## Decisiones que tomé sin preguntar

1. **Escarapela de tela en vez de una medalla gris o de hierro.** Una medalla de hierro sigue siendo "perdiste la de bronce". La escarapela se lee como premio por participar.
2. **Turquesa:** no lo usa ningún metal, y se separa del rojo de las cintas y del dorado.
3. **Sin el número 4.** El puesto ya está en la fila, y sin número la misma cinta sirve si un día hay quinto o sexto.
4. **Piezas aparte y no un cuarto cuadro en `medallas_<tam>`.** Así no cambia el formato de las medallas.
5. **Solo 16 y 32,** como pediste. Si el podio o la pantalla final la necesitan en 64, se hace igual.

## Límites honestos

- **A 16 los pliegues son apenas 10 rayitas.** Se lee como una escarapela, pero la estrella del botón no cabe y queda en un punto.
- **La cinta en V es de la misma forma que la de las medallas.** Si la quieres colgando hacia abajo, como las escarapelas de feria, a 16 no cabe sin achicar la escarapela.

## Lo que necesita el siguiente lote

- **El juego:** cambiar el círculo gris por `ui_cinta_32` en la tabla de resultados.
- **Lo que queda del mensaje:** el mapa de la gira y las escenas de la intro, en su PR.
