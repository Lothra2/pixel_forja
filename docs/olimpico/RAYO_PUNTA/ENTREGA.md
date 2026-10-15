# Lote rayo_punta: la punta de la jabalina en javelin_rayo
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/47
Fecha: 2026-10-15

## Qué se hizo

`javelin_rayo` trae ahora un `impacto` en el cuadro 2 con su `punto` en las 5 filas. Ese punto es la punta de la jabalina, medida en el dibujo de verdad, no la mano más 16.

Los eventos quedan así:

| Evento | Cuadro | Para qué |
|---|---|---|
| `paso` | 0 | Igual que antes |
| `impacto` | 2 | **Nuevo:** donde cae el rayo. Su `punto` es la punta de la jabalina en cada fila |
| `suelta` | 8 | Igual que antes |

**Lo que sumé al motor:**
- **La punta del implemento como dato.** El motor ya sabía dónde se agarra la jabalina y hacia dónde apunta. Ahora también guarda dónde termina: la articulación `punta`, en los cuadros que llevan jabalina, garrocha o bate.
- **Un evento puede pedir esa punta** con `joint: 'punta'`, igual que ya pedía la frente en un cabezazo. El kit saca el `punto` de ahí en todas las filas.

## Cómo se usa (estudio y kit)

**En el kit:** no cambia nada en tu `kit.config.json`. `javelin_rayo` sale con el evento nuevo en el pack que ya lo trae.

**Lo que tiene que conectar el juego:**
- En `Jabalina.ts`, `puntaJabalina()` puede leer el `punto` del `impacto` de `javelin_rayo` en la fila que mira, como ya hace `puntoDe('suelta')` en el tejo. Ahí va el ancla de `rayo_cielo`.
- Sirve igual para el cuadro 3: entre el 2 y el 3 la punta se mueve como mucho 1,5 px a celda 48.
- **Ojo con un detalle:** `contacto()` de `figura.ts` arranca la animación desde el primer `impacto`, `suelta` o `atrapa`. Hoy no se usa con `javelin_rayo`. Si algún día se usa, arrancaría en el 2 y no en el 8.

## Pruebas

- **Prueba nueva `punta.test.ts`, 2 casos:**
  - Los eventos de `javelin_rayo` son `paso` 0, `impacto` 2 con la punta y `suelta` 8.
  - En los 8 atletas, en 32, 48 y 64 y en las 5 filas, el `punto` cae sobre un pixel de la jabalina: el de la punta de arriba, a lo sumo uno debajo del contorno y siempre por encima de la mano.
- **`b7h8.test.ts`:** sumé el `impacto` a lo que pide de `javelin_rayo`. La imagen dorada no cambió: el dibujo es el mismo.
- **La suite sin `custom.test.ts`:** 51 archivos, 513 de 513.
- **`custom.test.ts`: 15 de 15,** en 213 s, por debajo del límite de 300.
- **`tsc` limpio, `npm run build:sitio` limpio y e2e de Playwright 50 de 50.**

## Para aprobar (todo en esta carpeta)

- **`tablero_punta.png`:** Rick, Alana y Kenji en el cuadro 2 de `javelin_rayo`, en las 5 filas, con `rayo_cielo` puesto en el `punto`.
- **`tablero_punta_sin_rayo.png`:** lo mismo sin el rayo, con una cruz amarilla en el punto nuevo. Un punto rojo marca la mano más 16 de antes, donde no queda tapado por la cruz.

Qué mirar: que el rayo pegue en la punta y no en el aire ni en la mano.

## Decisiones que tomé sin preguntar

1. **Usé `impacto` y no un tipo de evento nuevo.** Tu `Evento` ya lo conoce y trae `punto`. El rayo pega en la punta, así que se lee como un golpe.
2. **Un solo evento, en el cuadro 2,** como pediste. No puse otro en el 3 porque se movería menos de 2 px y dos `impacto` confundirían a quien busque el primero.
3. **La punta sirve para la garrocha y el bate también.** No les puse eventos nuevos: el dato queda en el motor por si lo quieres después.

## Límites honestos

- **La mano más 16 no estaba tan lejos:** se iba hasta 3 px en las diagonales, menos de lado. El cambio se nota en las filas de frente y de espalda.
- **El `punto` es la punta pintada,** un pixel debajo del contorno de arriba. El rayo tapa ese pixel con su destello.

## Lo que necesita el siguiente lote

- **El juego:** leer el `punto` del `impacto` de `javelin_rayo` en vez de la mano más 16.
- **Lo que queda del mensaje:** G2 y H2 corto van cada uno en su PR.
