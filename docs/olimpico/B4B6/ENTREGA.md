# Lote B4B6: la garrocha que no llega, el judo, el Quemado, la Chapita y el tejo
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/40
Fecha: 2026-10-14

## Qué se hizo

Las animaciones que pidió el juego para pruebas que ya existen: la garrocha que no llega (Azoteas), el salto para esquivar (Quemado), el batazo con el palo de escoba (Chapita), el tejo y el judo. Son 8 animaciones de motor general, en `src/engine/anim/pruebas.ts`, y sirven para cualquier ficha humana. Cada una trae todos los datos por cuadro: cajas, cuerpo, manos, cabeza, pies, carga y arma.

| Animación | Cuadros, fps | Para | Qué hace |
|---|---|---|---|
| `vault_fail` | 10, 12 | Azoteas | <ul><li>Clava y despega como `pole_vault`.</li><li>La garrocha se queda casi derecha con él colgado arriba, con cara de "uy".</li><li>Se le devuelve, la suelta manoteando y cae de espalda (`aterriza`, cuadro 8).</li><li>Sube con `elevacion`, como la garrocha.</li></ul> |
| `dodge_jump` | 8, 14 | Quemado | <ul><li>Se agacha y salta recogiendo las rodillas al pecho, con los brazos arriba, para que el balón pase por debajo.</li><li>`despegue` en el 2 y `aterriza` en el 6.</li><li>Sube con `elevacion`.</li></ul> |
| `bat_stance` | 4, 6, en bucle | Chapita | La guardia de bateo: de lado, rodillas dobladas, el palo sobre el hombro de atrás, meneándolo |
| `bat_swing` | 6, 14 | Chapita | <ul><li>Carga el peso atrás, da el paso y barre el palo plano a dos manos a la altura de la chapa (`impacto` en el 3, con la estela).</li><li>Lo enrolla sobre el otro hombro al terminar.</li></ul> |
| `tejo_throw` | 8, 12 | Tejo | <ul><li>Lleva el tejo atrás con el brazo estirado y da el paso largo.</li><li>Lo suelta por debajo, adelante y arriba (`suelta` en el 4, con su `punto`).</li><li>Se queda mirando dónde cae.</li></ul> |
| `judo_grip` | 4, 10, en bucle | Judo | La guardia agarrado: la mano cercana en la solapa del rival y la lejana en su manga, tironeando |
| `judo_throw` | 10, 14 | Judo | <ul><li>Jala al rival para desequilibrarlo, se mete abajo, lo carga al hombro, se endereza y lo azota adelante.</li><li>`impacto` en el 6.</li><li>Termina de pie, todavía agarrado de la manga.</li></ul> |
| `judo_thrown` | 10, 14 | Judo | <ul><li>El que sale proyectado, cuadro a cuadro con `judo_throw`: agarrado, desequilibrado, por el aire y de espalda en el tatami.</li><li>`aterriza` en el 6, el mismo cuadro del impacto.</li></ul> |

**Lo que no va dibujado en el sprite,** como en la pelea callejera:
- **El palo de la Chapita** es el arma del piso `broomstick` ("Palo de escoba"), que ya existía. El juego la dibuja con el dato `arma` de cada cuadro, igual que en `weapon_swing`, pero a dos manos. En el estudio se puede elegir otra de batear.
- **El tejo** es el arma del piso `tejo`, que también ya existía. Va en `arma` hasta la `suelta`, y desde ahí el juego lo lanza por la parábola desde el `punto`.
- **El rival del judo** lo dibuja el juego con `judo_thrown`:
  - Del cuadro 3 al 5, con su pivote en la `carga` de quien proyecta y detrás de él, como `carried` en levantar.
  - Antes, cada uno en su lugar, agarrados.
  - Después, el proyectado queda tirado delante.
- **La garrocha sí va dibujada,** como en `pole_vault`.

**En el estudio:** las 8 salen en Animar con su nombre en español e inglés. El palo y el tejo se ven en la mano.

## Cómo se usa (estudio y kit)

En el `kit.config.json` del juego, sumar las animaciones a los packs que ya cargan esas pruebas. Así no sale ningún archivo nuevo:

```jsonc
"packs": {
  "atletismo": [..., "pole_vault", "vault_fail"],
  "beisbol": { "anims": ["pitch", "catch", "bat_stance", "bat_swing", "dodge_jump"], "sin_props": true }
}
```

- `tejo_throw` va donde esté hoy `weapon_throw` para el Tejo.
- Las tres de judo van en el pack que cargue la escena del judo.

El ejemplo `docs/ejemplos/nekketsu/kit.config.json` ya las tiene: `vault_fail` en `atletismo`, las tres de judo en `pelea`, y la Chapita, el Quemado y el tejo en `beisbol`.

**Lo que tiene que conectar el juego:**
- **Azoteas:** cuando no llega, `vault_fail` en vez de `jump_fall` y `land_flat`. Se toca desde el `despegue` de `pole_vault`. El sprite sube con su `elevacion`, y en el `aterriza` va el golpe contra el techo o el piso.
- **Quemado:** `dodge_jump` en vez del salto normal. Mientras la `elevacion` pasa de 8 px, el balón pasa por debajo sin pegarle.
- **Chapita:** `bat_stance` mientras espera y `bat_swing` en vez de `weapon_swing`, con el palo de escoba en `arma`. La chapa sale en el `impacto`.
- **Tejo:** `tejo_throw` en vez de `weapon_throw`. El tejo va en `arma` hasta la `suelta` y sale desde su `punto`. Ahí suena `mecha_tejo` cuando revienta.
- **Judo:**
  - Los dos en `judo_grip` mientras forcejean.
  - Al proyectar, quien proyecta en `judo_throw` y el otro en `judo_thrown`, arrancando juntos.
  - En el 6 suena `caida_tatami`.

## Pruebas

- **Prueba nueva `b4b6.test.ts`, 7 casos:**
  - Las 8 con sus cuadros, fps, bucle y eventos de la tabla del pedido.
  - **Los 8 atletas pasan el control de calidad en 32, 48 y 64, en las 5 filas.**
  - **El judo va sincronizado:** los mismos 10 cuadros a 14 fps, y el impacto y el aterriza en el mismo cuadro. La `carga` aparece solo del 3 al 5: sube por encima de la cabeza y baja de golpe delante del cuerpo.
  - **La garrocha y el Quemado suben con `elevacion`** y vuelven a 0 al aterrizar. El salto pasa de 8 px, y la garrocha sube más.
  - **El palo y el tejo van como arma del piso:** `arma` en cada cuadro del palo, atrás del cuerpo antes del golpe y plano adelante en el impacto. El tejo, solo hasta la suelta.
  - El tejo sale a la altura del pecho y adelante del cuerpo, y trae su `punto` en las 5 filas.
  - **Imagen dorada** `golden/b4b6.png`: un cuadro clave de cada una.
- **`brawl.test.ts`** sigue en verde con las armas nuevas en la lista.
- **El esquema** `docs/kit-a-medida.schema.json` está regenerado.
- **La suite sin `custom.test.ts`:** 44 archivos, 458 de 458. Las imágenes doradas de antes salen iguales.
- **`custom.test.ts`: 15 de 15,** con las 8 nuevas en los packs del ejemplo y el kit por debajo de 300 s.
- **`tsc` limpio y `npm run build:sitio` limpio.**
- **e2e de Playwright: 50 de 50.**

## Para aprobar (todo en esta carpeta)

- **`garrocha_no_llega.gif`:** Rick y Alana. El sprite sube con la `elevacion` del manifiesto y la sombra se queda en el piso.
- **`judo_proyeccion.gif`:** Rick proyecta a Kenji. Primero forcejean en `judo_grip`. Kenji va con su base en la `carga` de Rick mientras vuela, como lo haría el juego.
- **`quemado_salto.gif`:** Rick y Alana saltan y el balón pasa por debajo.
- **`chapita_batazo.gif`:** la guardia y el batazo con el palo de escoba dibujado, y la chapa que sale en el impacto.
- **`tejo_lanzamiento.gif`:** el tejo en la mano hasta la suelta y la parábola desde su `punto`.
- **`tablero_lado.png`:** Rick y Alana de lado, todos los cuadros de las 8.
- **`tablero_filas.png`:** el cuadro clave de cada una en las 5 filas del juego.

Qué mirar:
- **Que la proyección se lea como judo** y no como lucha libre. Es lo más discutible del lote, ver abajo.
- Que en `vault_fail` se entienda que la garrocha no llegó y no que él se soltó por gusto.
- Que el salto del Quemado se vea alto y "de bolita".

## Decisiones que tomé sin preguntar

1. **El seoi nage, de lado.** En el de verdad, quien proyecta gira de espaldas al rival. El motor arma las 5 filas de una sola pose pensada de lado, y no puede girar el cuerpo a mitad de la animación sin que el juego espeje el sprite. Lo resolví como en los juegos 2D: agarre, jalón, se mete abajo, lo carga al hombro y lo azota adelante. Si quieres el giro de verdad, se hace con el juego espejando el sprite en el cuadro del giro. Es un cambio del juego, no del motor.
2. **Sumé `judo_thrown`,** aunque no estaba en tu mensaje. Está en el pedido, y sin él el juego no tiene cómo dibujar al que sale volando.
3. **Sumé `bat_stance`,** que pedía el juego en su estado junto con `bat_swing`. Sin la guardia, el batazo arranca de la nada.
4. **`bat_swing` y no `cap_bat`.** El pedido lo llama `cap_bat`, pero tú y el juego lo llaman `bat_swing`. Si hace falta el otro nombre, va con `alias` en el `kit.config.json`: `"cap_bat": "bat_swing"`.
5. **El palo y el tejo son armas del piso que ya existían** (`broomstick` y `tejo`), así el juego los dibuja con el mismo `arma` que ya usa. No los pinté en el sprite.
6. **En el ejemplo, las nuevas van en packs que ya existen.** Un pack nuevo suma dos archivos por atleta (48 en total), y la copia del artifact está casi llena.
7. **`dodge_jump` y `tejo_throw` llevan sus números.** `dodge_jump` no está en las tablas del pedido: le puse 8 cuadros a 14 fps, como los saltos de la pelea. `tejo_throw` sigue la tabla: 8 a 12.

## Límites honestos

- **El judo es la parte más floja.** Sin el giro, el seoi nage se lee como "lo carga y lo tira". Con judogi y el tatami se entiende, pero un judoca va a notar que falta el giro.
- **La garrocha flota con el sprite.** Igual que en `pole_vault`: el palo va en la mano y sube con la `elevacion`, así que en el aire la punta no toca el cajón. El juego puede dibujar su propio cajón o esconder la punta.
- **El palo de escoba es corto en el chibi.** En la guardia asoma por detrás del hombro y poco más. El que se ve en la prueba es el que dibuja el juego.
- **En las diagonales, `judo_thrown` en el aire se ve acostado** y no de cabeza: el motor endereza el tronco en diagonal. Dura dos cuadros a 14 fps.
- **No toqué `pole_vault`, `weapon_swing` ni ninguna animación de antes.** Las imágenes doradas de antes siguen iguales.

## Lo que necesita el siguiente lote

- **El juego:** conectar las 8 donde dice arriba y sumarlas a sus packs.
- **Lo que queda de B4 a B7 en el pedido:** `hammer_spin`, `hammer_release`, `swim_punch`, `dunked`, `swim_turn`, `boat_start`, `vovinam_scissor`, `bow`, `dodge_throw`, `dodge_hit`, `beach_run`, `dunk_big`, `cap_pitch`, `shuttle_juggle`, `shuttle_kick_back`, `traffic_dodge` y las técnicas de equipo de B7.
