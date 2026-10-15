# Lote rayo_cielo: el relámpago que baja del cielo
Estado: entregado, pendiente de Rick
PR: (se llena al abrirlo)
Fecha: 2026-10-15

## Qué se hizo

Un efecto nuevo en el catálogo, `rayo_cielo`, en el grupo `tecnica`: el relámpago del Catatumbo vertical, que baja del cielo a un punto, con el ancla abajo.

| | |
|---|---|
| Tamaño | 48 x 256 |
| Cuadros, fps | 8, 16, sin bucle |
| Ancla | (24, 255): abajo en el medio, donde pega |
| Se pega a | objeto (la punta de la jabalina, el aro) |
| Capa | frente |
| Colores | los mismos de `rayo_catatumbo` |

Los cuadros:
- **0 y 1:** la guía baja del cielo, fina, hasta un tercio y hasta tres cuartos. Todavía no pega.
- **2:** el golpe. El más gordo, con el halo y el destello grande en el punto.
- **3 a 6:** parpadea con dos caminos que se turnan. **Para que siga cargando, repite del 3 al 6.**
- **7:** se apaga y queda el resplandor.

Ya no tienes que girar `rayo_catatumbo` 90°. Ese sigue igual, para cuando el rayo sale de la mano de lado.

## Cómo se usa (estudio y kit)

**En el estudio:** sale en Efectos, en el grupo Técnica.

**En el kit:** con `"fx": true` sale solo, en `fx/rayo_cielo.png`. Si tu lista de `fx` va por grupos, sale con `tecnica`.

**Lo que tiene que conectar el juego:**
- **La jabalina del Catatumbo:**
  - Pon el ancla en la punta de la jabalina en los cuadros 2 y 3 de `javelin_rayo`.
  - La punta va justo arriba de la mano cercana, un tercio de la celda más arriba: 16 px a 48. Es la mano cercana de `manos` (`manos[fila][cuadro][0]`).
  - Lo medí con Rick, Alana y Kenji: en los tres son 16 px.
  - Mientras carga, repite del 3 al 6. Al soltar, el 7.
- **El cielo del básquet en Maracaibo:** pon el ancla donde quieras que pegue (el aro, el tablero) y tíralo de vez en cuando, con el destello de la cámara en el cuadro 2.

## Pruebas

- **Prueba nueva `rayo.test.ts`, 3 casos:**
  - Está en el catálogo y en el grupo `tecnica`, a 48 x 256, con 8 cuadros a 16 fps y el ancla en (24, 255).
  - La guía no llega en el 0 y el 1 (el 1 baja más que el 0), y del 2 al 7 llega al punto del ancla. En todos sale desde la fila de arriba.
  - El golpe del 2 es el más gordo, y el 3, el 4 y el 5 no son iguales entre sí.
- **`effects.test.ts`:** la imagen dorada `golden/efectos.png` cambió porque hay un efecto más. Comprobé que sin `rayo_cielo` sale igual, pixel a pixel, a la de antes.
- **El esquema** `docs/kit-a-medida.schema.json` está regenerado (la lista de efectos).
- **`custom.test.ts` y el e2e de efectos:** subí los conteos de 63 a 64 efectos y un PNG más en el kit.
- **La suite sin `custom.test.ts`:** 48 archivos, 496 de 496.
- **`custom.test.ts`: 15 de 15,** en 195 s, por debajo del límite de 300.
- **`tsc` limpio, `npm run build:sitio` limpio y e2e de Playwright 50 de 50.**

## Para aprobar (todo en esta carpeta)

- **`jabalina.gif`:** Rick en los Llanos de Apure, en la vista que tiene hoy. El rayo baja a la punta de la jabalina en el cuadro 2 de `javelin_rayo`, carga dos vueltas y Rick la suelta.
- **`maracaibo_aro.gif`:** el rayo pega en el aro de la Cancha La Chinita.
- **`rayo_cielo_cuadros.png`:** los 8 cuadros sobre fondo oscuro.

Qué mirar: que se lea como un rayo que baja y pega, no como una raya quieta.

## Decisiones que tomé sin preguntar

1. **256 de alto.** En los Llanos la punta de la jabalina queda cerca de la fila 260, y así el rayo sale de arriba de la pantalla. Si pega más abajo, se ve el arranque arriba, y eso también se lee bien.
2. **Sin bucle, con la carga en el 3 al 6.** Así sirve para el golpe solo (el cielo de Maracaibo) y para la carga larga (la jabalina).
3. **Los colores del Catatumbo,** morado y blanco, iguales a `rayo_catatumbo`.

## Límites honestos

- **Suma un archivo:** `fx/rayo_cielo.png`. Lo pediste, así que lo hice, pero te aviso: quedas en 492 de 511.
- **La punta de la jabalina no sale como dato propio.** Te la doy como la mano cercana más 16 px hacia arriba a 48. Si quieres un `punto` exacto, puedo sumar un evento en el cuadro 2 de `javelin_rayo` en otro lote.
- **Los dos caminos del parpadeo son fijos:** siempre es el mismo rayo. Si lo tiras muy seguido en Maracaibo, varía la x del ancla.

## Lo que necesita el siguiente lote

- **El juego:** cambiar el `rayo_catatumbo` girado por `rayo_cielo` en la jabalina y sumarlo al cielo del básquet.
- **Lo que queda de este mensaje:** D3, los vehículos a escala de atleta. El E4 va en su propio PR.
