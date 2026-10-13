# Lote SP2: más packs sin pelota (básquet, arquero, tenis, béisbol)
Estado: entregado, pendiente de Rick
PR: (se completa al abrirlo)
Fecha: 2026-10-13

## Qué se hizo

El juego pidió el resto de los deportes de pelota con `"sin_props": true`, todos con animaciones que el motor ya tenía. Sale de la rama de SP (PR #28, todavía sin unir), así que trae lo de SP.

**Packs nuevos en el ejemplo de Nekketsu, todos con `sin_props`:**
- `basket`: `dribble`, `shoot`, `dunk`.
- `keeper`: `keeper_ready`, `keeper_dive`, `keeper_catch`.
- `tennis`: `tn_ready`, `forehand`, `backhand`, `tennis_serve`, `tn_volley`, `tn_smash`. La raqueta se queda dibujada y solo se va la pelota.
- `beisbol`: `pitch` y `catch`, para Chapita y Quemado.
- `futbol` suma `shot`, `pass` y `slide`. `voley` suma `vb_ready`.
- Las 18 existen con ese nombre exacto en el motor. No cambié ningún nombre.

**Pruebas nuevas en el ejemplo, con el id del juego en minúscula** (como `crosscountry`, `vallas` y `natacion` en el `kit.config.json` del juego):
- `basket`: `base`, `pelea` y `basket` (el empujón sigue siendo `punch`).
- `tenis`: `base` y `tennis`.
- `chapita`: `base`, `armas` y `beisbol` (el palo de escoba es `weapon_swing`).
- `quemado`: `base`, `armas` y `beisbol` (hoy lanza con `weapon_throw`).
- `futbol_callejero` ahora carga también `keeper`.

**Lo que traía algo raro y arreglé en el motor:**
- **`dribble`:** el balón no tocaba la mano. Subía hasta el pecho por al lado de la mano, y en la diagonal de espalda quedaba a 6 px. Ahora bota debajo de la mano en todas las filas: la palma va encima en los cuadros 6, 7, 0 y 1, lo suelta, toca el piso en el 3 y sube a recibirlo. Para eso hay un prop nuevo, `under: 'handNear'`: el balón va en el piso, con la `x` de la mano. También sale bien en Goro (64).
- **`shoot`:** el balón iba adelante en el cuadro 2, volvía a la cara en el 3 y salía en el 4. Ahora sube con las manos y sale por arriba sin devolverse. En el último cuadro ya no se dibuja: va al aro.
- **`catch`:** la pelota desaparecía al atraparla. Ahora se queda en el guante desde el cuadro 3, así se lee que la agarró y el juego sabe dónde está.
- Estos arreglos cambian también esas tres animaciones en el kit deportivo y en el estudio, porque es el mismo dibujo. El resto del motor no cambia.

**Las pelotas sueltas (lo opcional del pedido, salió barato):**
- `objetos/pelotas.png` y `objetos/pelotas.json`: cada pelota quitada, dibujada igual que en la mano, con su contorno, en un cuadro de `2r + 2` de lado y el pivote en el centro exacto. Una por clase y por celda (48 y 64 en Nekketsu).
- En el manifiesto, `pelotas` con los nombres que ya usa el juego: `balon_futbol`, `balon_voley`, `balon_basket`, `pelota_tenis`, y además `pelota_beisbol`. La bala sería `bala`.
- Salen solo si algún pack tiene `sin_props`, y solo las que se quitaron.

**El render, más rápido:** con los packs nuevos, el kit de Nekketsu se pasaba del tope de la prueba con la máquina cargada. La pasada sin pelota ahora solo pinta (las cajas ya salieron de la pasada con pelota) y `body` y `whole` se miden en un solo recorrido. Sale todo igual, byte a byte.

**Datos:** `objetos` sale como en SP, en `[fila][cuadro]` desde el pivote. `clase` es `basquet` en básquet, `tenis` en tenis, `futbol` en el arquero y `beisbol` en béisbol. Las que no traen pelota (`vb_ready`, `keeper_ready`, `tn_ready`, `slide`) no llevan `objetos`.

## Cómo se usa (estudio y kit)

```jsonc
"packs": {
  "keeper": { "anims": ["keeper_ready", "keeper_dive", "keeper_catch"], "sin_props": true },
  "basket": { "anims": ["dribble", "shoot", "dunk"], "sin_props": true },
  "tennis": { "anims": ["tn_ready", "forehand", "backhand", "tennis_serve", "tn_volley", "tn_smash"], "sin_props": true },
  "beisbol": { "anims": ["pitch", "catch"], "sin_props": true }
},
"pruebas": { "basket": ["base", "pelea", "basket"], "tenis": ["base", "tennis"], "chapita": ["base", "armas", "beisbol"], "quemado": ["base", "armas", "beisbol"] }
```

En el manifiesto:

```jsonc
"pelotas": {
  "balon_basket": { "clase": "basquet", "atlas": "objetos/pelotas.json", "cuadros": { "48": "balon_basket_48", "64": "balon_basket_64" } },
  ...
}
```

**El juego:**
- Copiar los packs y las pruebas del ejemplo a su `kit.config.json`.
- Cargar `objetos/pelotas.json` como atlas y usar la de la `clase` de `objetos` en la celda del atleta: `setOrigin(0.5)` y la posición de `objetos`. O seguir con sus círculos, en el mismo punto.
- Cuándo manda `objetos`, por animación (está completo en `docs/KIT_A_MEDIDA.md`, sección "Packs sin pelotas"):
  - **Golpes del tenis y del fútbol:** hasta el `impacto` (forehand y backhand en el 4, `tn_volley` en el 3, `tn_smash` en el 4, `tennis_serve` en el 6, `shot` y `pass` en el 4). Después es de la física.
  - **Atrapadas (`keeper_dive`, `keeper_catch`, `catch`):** al revés. Hasta el impacto la pelota viene llegando y desde ahí se queda con el atleta: `objetos` manda hasta el final.
  - **Las clásicas no traen eventos.** `shoot` y `dunk` sueltan en el 5. `pitch` suelta en el 6. `catch` atrapa en el 3. `dribble` nunca suelta: para tirar o pasar se cambia de animación.
- En Chapita y Quemado, `clase` dice `beisbol`: se dibuja la chapa o el balón de goma en ese punto, como el cầu del Đá cầu.

## Pruebas

- **`sinprops.test.ts`, 8 casos nuevos (16 en total, 16 de 16):**
  - Las 18 animaciones en las 5 filas de Nekketsu: solo cambia la pelota y su contorno, `wholes`, articulaciones y pelotas iguales, y no queda ni un pixel del color del disco de la pelota. Las 4 que no traen pelota no cambian nada.
  - El tenis: la raqueta está dibujada en al menos la mitad de los cuadros de cada golpe (en el remate de algunos queda detrás de la espalda) y es la misma que en el pack con pelota.
  - `objetos` en `[fila][cuadro]` desde el pivote, con la clase de cada deporte, en las 18. Las que no traen pelota no lo llevan.
  - El bote: el balón debajo de la mano en las 5 filas, en Rick (48) y en Goro (64), toca el piso en el 3 y la palma en el 0.
  - El tiro sube sin devolverse y la atrapada se queda en el guante, en las 5 filas.
  - Las pelotas sueltas son el mismo dibujo que se quitó, pixel a pixel, con el centro exacto en el centro del cuadro.
  - El kit trae `objetos/pelotas` solo con las pelotas que se quitaron, y nada sin packs `sin_props`.
  - El ejemplo de Nekketsu valida en el motor y en el esquema, con los 6 packs y las pruebas.
- **`custom.test.ts`:** la cuenta de PNG pasa de `24 * 11` a `24 * 15`, más 1 de las pelotas. Revisa `objetos` en 7 animaciones de 6 packs en Rick y Goro, que las 4 sin pelota no lo lleven, la nota con los 6 packs y `pelotas` en 48 y 64. El esquema está regenerado (solo cambia la descripción de `sin_props`).
- **El render, más rápido sin cambiar nada de lo que sale:** la pasada sin pelota ya no mide cajas que se tiran, y `body` y `whole` salen de un solo recorrido del lienzo. Los atlas y el manifiesto de 4 atletas en todos los packs (y `kachinuki` con los 24) salen byte a byte iguales que antes. Los packs con `sin_props` tardan cerca de un tercio menos.
- **El tiempo del kit de Nekketsu, por la línea de comandos:**
  - Antes de SP2 (la rama de SP), con la máquina tranquila: 178 s, 938 archivos y 58.1 MB.
  - Con SP2 y el render más rápido, con otro lote corriendo al lado: 201 s, 1132 archivos y 68.4 MB.
  - Solo los packs nuevos (las 18 animaciones de los 24 atletas y las pelotas sueltas): 22 s.
- **`custom.test.ts` completo: 15 de 15 en 216 s,** con la máquina cargada (carga de 5 a 7, otros lotes armando su kit). Antes del arreglo del render, la misma prueba se cortó por tiempo con esa carga: el `beforeAll` tiene un tope de 240 s, más bajo que los 300 de "se genera en menos de 5 minutos". No subí ninguno de los dos.
- **`tsc` limpio, `npm run build:sitio` limpio (278 s) y e2e del visor 6 de 6** (en el puerto 4187).
- **Resto de `src/engine/__tests__` (sin `custom.test.ts`), después del arreglo del render: 30 archivos, 333 de 333.**

- **Suite completa: 34 archivos, 361 de 361.** `npm run build:sitio` limpio y e2e de Playwright 50 de 50.
- **El corte del kit completo:** el `beforeAll` de `custom.test.ts` cortaba a los 240 s, antes de que la prueba de "menos de 5 minutos" (300 s, lo que pidió Rick) pudiera medir. Pasa a 320 s, así decide la de los 300 con su tiempo medido.

## Para aprobar (todo en esta carpeta)

- `tablero_sp2.png`: las 18 animaciones de Rick, de lado y en diagonal. Arriba el pack con pelota (fondo azul), abajo el pack sin pelota (fondo verde) con el círculo de `objetos` en rojo. Al lado de cada una, su pack, sus cuadros y el impacto o la suelta. Sale del kit de verdad: los atlas y el manifiesto de `buildCustomKit` con las fichas de Nekketsu.
- `tenis_raqueta_y_pelota.gif`: Rick con el saque, el drive, el revés y el smash. A la izquierda el pack con pelota. A la derecha el pack sin pelota, con la raqueta dibujada, y la pelota sacada de `objetos/pelotas.png` y puesta en `objetos` por el script, como lo haría el juego.
- `basket_bote_tiro_clavada.gif`: Rick botando, tirando, botando y clavando, igual con y sin pelota.
- `basket_goro_64.gif`: Goro (celda 64) botando y tirando, con la pelota de 64.

## Decisiones que tomé sin preguntar

1. **Los nombres de los packs son los del pedido:** `basket`, `keeper`, `tennis`. Para béisbol, `beisbol`, como `voley` y `futbol`.
2. **`shot`, `pass` y `slide` van en el pack `futbol` que ya existía,** no en uno aparte. Đá cầu carga `futbol` y ahora le llegan también, son 3 animaciones más.
3. **Las pruebas nuevas usan el id del juego en minúscula** (`basket`, `tenis`, `chapita`, `quemado`), como las del `kit.config.json` del juego. Las de SP (`voley_playa`, `futbol_callejero`, `da_cau`) las dejé como estaban para no tocar el PR #28. Con la regla del juego serían `voley`, `futbol` y `dacau`. Es cambiar la clave en su config.
4. **`futbol_callejero` carga `keeper`,** porque el fútbol del juego tiene arquero. `basket` carga `pelea` por el empujón. Chapita y Quemado cargan `armas` por el palo y el lanzamiento que usan hoy.
5. **Arreglé el bote, el tiro y la atrapada en el motor, no solo en el kit.** Lo correcto es que el dibujo con pelota y `objetos` digan lo mismo. Si solo corregía `objetos`, el pack con pelota seguiría raro y los dos no calzarían.
6. **El bote se mide desde la mano cuando la toca y desde el piso cuando va suelto.** Así toca la palma y el piso en todas las vistas y en los dos tamaños, sin números por vista.
7. **El último cuadro de `shoot` va sin balón.** Medido desde el piso saltaba 18 px hacia el otro lado en la diagonal de espalda, donde la mano de tiro queda a la izquierda. El balón ya salió, así que es de la física.
8. **El guante se queda,** igual que la raqueta: va agarrado. En Quemado se ve un guante de béisbol (ver límites).
9. **Las pelotas sueltas van con los atletas,** no con `objetos` del config (que son las armas del piso). Salen aunque se pida `--solo atletas`, porque sin ellas los packs sin pelota quedan cojos.
10. **El cuadro de cada pelota mide justo `2r + 2`,** con el pivote en 0.5. Así el centro calza exacto con `x` e `y` de `objetos`, también en las de medio pixel.
11. **Bajé el tiempo en vez de sacar packs del ejemplo.** El tope real de la prueba del kit completo es el `beforeAll`, de 240 s, no los 300 s de "menos de 5 minutos". No toqué ninguno de los dos. Hice más rápido el render y los 6 packs quedan en el ejemplo.

## Límites honestos

- **Las clásicas no traen eventos.** `dribble`, `shoot`, `dunk`, `pitch` y `catch` no dicen en los datos cuándo se suelta la pelota. Está en la tabla de la doc, pero el juego lo tiene que escribir a mano. Darles eventos a las clásicas toca `motionOf` y cambia otros kits, así que no lo hice acá.
- **`catch` trae el guante de béisbol.** Para Quemado (atrapar contra el pecho) no hay una animación sin guante. El pedido del juego ya lo anota como arte pendiente.
- **De espalda el bote no toca la palma del todo.** La mano queda 2 o 3 px más arriba y tapada por el cuerpo, así que no se nota.
- **En `shot` y `pass` la pelota sigue en `objetos` después del impacto** (es el vuelo de la animación) y en `pass` se queda quieta fuera de la celda. Desde el impacto manda la física y eso se ignora.
- **En `keeper_dive` la pelota llega desde fuera de la celda** en el primer cuadro: `objetos` dice dónde iría.
- **El dibujo del bote cambió** también en el kit deportivo y en el estudio. Si alguien tenía capturas viejas de `dribble`, `shoot` o `catch`, ya no calzan.
- **El kit de Nekketsu queda cerca del tope de la prueba.** Tranquila, la máquina lo arma en unos 200 s, y el `beforeAll` corta a los 240. Con varios lotes armando kits a la vez se puede pasar. Si pasa, los primeros candidatos para sacar del ejemplo son `tennis` (6 animaciones, el más pesado de los nuevos) y `keeper`: el juego los tiene en su propio config igual. No los saqué porque con la prueba sola pasa.

## Lo que necesita el siguiente lote

- **El juego:**
  - Copiar los 6 packs y las pruebas del ejemplo, y si quiere, renombrar las de SP a su regla.
  - Cargar `objetos/pelotas.json` y poner la pelota en `objetos` según la tabla.
  - Avisar si quiere `keeper_throw` o `keeper_punt` para el saque del arquero, que el motor ya tiene.
- **PixelForja:**
  - Eventos para las animaciones clásicas de pelota, o pasarlas a premium, así la suelta sale en los datos.
  - Una atrapada contra el pecho sin guante para Quemado (`catch` sigue siendo la de béisbol), y `dodge_jump`, `bat_stance` y `bat_swing` del pedido de Chapita y Quemado.
