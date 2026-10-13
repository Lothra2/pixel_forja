# Lote C7c: el perro que despierta y embiste, y el muro medido
Estado: entregado, pendiente de Rick
PR: (se completa al abrirlo)
Fecha: 2026-10-13

## Qué se hizo

| Animal | Animación | Cuadros | fps | Eventos | Qué hace |
|---|---|---|---|---|---|
| perros (y cualquier cuadrúpedo) | `wake` | 7 | 8 | | Sale del `sleep` enroscado: abre los ojos, levanta la cabeza de golpe, se para con las de adelante, después con las de atrás, y queda alerta con la cola arriba. El cuadro 0 es igual al último del `sleep` |
| perros (y cualquier cuadrúpedo) | `pounce` | 8 | 12 | `despegue` 2, `impacto` 4, `aterriza` 6 | Se agacha con el trasero arriba, salta estirado con la boca abierta, pega con las patas de adelante en el aire y cae plantado |
| gatos | `jump_wall` | 8 | 12 | `despegue` 2, `aterriza` 5 | El mismo salto de C7, ahora medido: `subida`, `muro_min` y `muro_max` |

**El muro medido, como lo acordamos:**
- `elevacion` sigue en pixeles, para el muro que se dibujó (dos veces la alzada del gato: 28 px a 48).
- `subida` va de 0 a 1 por cuadro. Llega a 1 exactamente en el cuadro del `aterriza`, cuando las patas tocan arriba, y se queda en 1 en los cuadros de encima del muro. A 48: `[0, 0, 0, 0.21, 0.61, 1, 1, 1]`.
- `muro_min` y `muro_max` son los pixeles de muro donde el salto se ve bien: de la mitad a vez y media del dibujado. A 48 son 14 y 42.
- Para un muro de alto `h`, el juego sube el sprite `subida[i] * h`.

**Motor, todo general:**
- `pounce` y `wake` son del esqueleto de cuatro patas: los traen los perros, los gatos y Thor.
- Las animaciones de animal pueden traer `muro: { min, max }`. El kit exporta `subida`, `muro_min` y `muro_max` para cualquiera que lo traiga.
- **Arreglo de C7:** los eventos de los animales de la calle no llegaban al manifiesto. El `despegue` y el `aterriza` del `jump_wall` estaban en el motor, pero solo salían en las animaciones con versión premium, y los perros y gatos no tienen. Ahora salen en toda ficha premium. El kit los marca premium siempre.

## Cómo se usa (estudio y kit)

No hay que tocar el `kit.config.json`: los perros y los gatos ya están en `animales` y traen las animaciones nuevas solas.

```jsonc
"perro_calle_1": { "anims": {
  "wake":   { "cuadros": 7, "fps": 8, "loop": false },
  "pounce": { "cuadros": 8, "fps": 12, "loop": false, "eventos": [{ "tipo": "despegue", "cuadro": 2 }, { "tipo": "impacto", "cuadro": 4 }, { "tipo": "aterriza", "cuadro": 6 }] } } },
"gato_1": { "anims": {
  "jump_wall": { "elevacion": [0, 0, 0, 6, 17, 28, 28, 28], "subida": [0, 0, 0, 0.21, 0.61, 1, 1, 1], "muro_min": 14, "muro_max": 42, "eventos": [...] } } }
```

**El juego:**
- **El perro dormido en el camino:** al pisarlo, `wake` y después `bark`. Para tumbar, `pounce`:
  - Lo mueve hacia el atleta entre el `despegue` y el `aterriza`.
  - En el `impacto` tumba al atleta con `hit` y `fall_getup`.
  - Después, si quiere, `run` detrás un ratito.
- **El gato y el muro:**
  - En cada cuadro de `jump_wall`, el sprite sube `subida[i] * alto_del_muro`.
  - Si el muro está fuera de `muro_min` y `muro_max`, mejor no saltarlo. Que lo rodee, o que se quede abajo.
  - Desde el `aterriza`, el gato ya está arriba: el juego lo corre sobre el muro.
- Nombres, anclas y formato de siempre. `elevacion` no cambió de sentido: sigue en pixeles.

## Pruebas

- **`animales.test.ts`, 4 casos nuevos:**
  - `pounce`: 8 cuadros con `despegue` 2, `impacto` 4 y `aterriza` 6. En el aire entre el despegue y el aterrizaje, con la fila de las patas vacía.
  - `wake`: arranca igual que el último cuadro de `sleep`, echado más bajo que de pie, y termina de pie a la altura del `idle`.
  - `jump_wall` medido, en los 2 gatos a 32, 48 y 64:
    - `subida` empieza en 0 y nunca baja.
    - Es 1 justo en el cuadro del `aterriza` y se queda en 1.
    - Por el alto dibujado da la `elevacion` (con 2 % de redondeo).
    - El alto dibujado queda entre `muro_min` y `muro_max`.
    - Un salto que no es a un muro (`pounce`) no trae `subida`.
  - En el kit: `pounce` con sus 3 eventos en el atlas del perro, y `jump_wall` con `subida`, `muro_min` y `muro_max`.
- **Control de calidad:** `pounce` y `wake` de los 3 perros pasan en 32, 48 y 64, en las 5 filas del juego.
- **La imagen dorada de C7 no cambió.** La de Thor (`golden/thor_48.png`) junta todas las animaciones de cuatro patas y creció 96 filas con `pounce` y `wake`. Lo que ya estaba quedó idéntico: 0 pixeles distintos.
- **Suite completa: 33 archivos, 349 de 349.** `tsc` limpio, `npm run build:sitio` limpio y e2e de Playwright 50 de 50.

## Para aprobar (todo en esta carpeta)

- `tablero_c7c.png`, con el piso marcado:
  - Los 3 perros con `pounce` y `wake` de lado.
  - Canelo en diagonal.
  - Los 2 gatos con `jump_wall` de lado y en diagonal.
- `perro_tumba.gif`: Canelo duerme en el camino. Sophie pasa corriendo y se para, el perro despierta, ladra, embiste y la tumba.
- `gato_muros.gif`: Mango sube tres muros a la vez, el de `muro_min` (14), el dibujado (28) y el de `muro_max` (42), con la misma animación escalada por `subida`.

## Decisiones que tomé sin preguntar

1. **El rango del muro es de 0.5 a 1.5 veces el alto dibujado.** Más bajo, el salto se ve exagerado para un murito. Más alto, el gato sube más rápido de lo que se estira. El juego decide qué hacer fuera del rango.
2. **En el `jump_wall`, el cuadro donde engancha el borde ahora sube el alto completo,** y antes subía el 85 %. Así `subida` es 1 justo cuando las patas tocan arriba, como acordamos. El dibujo no cambió: solo cambia cuánto lo sube el juego en ese cuadro.
3. **`pounce` no avanza solo.** El perro se queda en su celda y el juego lo lleva hasta el atleta, como hace con el gato y la paloma. Así sirve para cualquier distancia.
4. **`wake` arranca del último cuadro de `sleep`,** para que el cambio no salte.
5. **`pounce` y `wake` los traen todos los cuadrúpedos,** también los gatos y Thor. No hay forma de dárselos solo a una especie sin un campo nuevo, y un gato que embiste también sirve.
6. **Arreglé los eventos de C7 que no salían.** El juego no los estaba recibiendo. Ahora le llegan el `despegue` y el `aterriza` del `jump_wall`, y los de `pounce`.

## Límites honestos

- **El `impacto` del perro no trae `punto`:** los animales no exportan articulaciones. El juego puede usar el frente de la caja del perro.
- **El gato que salta el muro más alto (`muro_max`) sube rápido entre los cuadros 4 y 5:** con 8 cuadros a 12 fps no hay más aire para repartir.
- **Thor también trae `pounce` y `wake`,** con su render 3D. Se ven bien de lado. No los revisé con la armadura puesta.

## Lo que necesita el siguiente lote

- **El juego:**
  - El perro que tumba con `wake`, `bark` y `pounce`.
  - El gato con `subida * alto_del_muro`, y que no salte muros fuera del rango.
  - Ojo: desde este lote le llegan los eventos de los perros y gatos, que antes no venían.
- **Siguiente lote del orden: E3c,** Hội An de noche con el Tama-wari.
- **Dependencia:** esta rama sale de `main`.
