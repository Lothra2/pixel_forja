# Lote B7H8: los súper golpes, el Quemado, la Chapita, el đá cầu, el vovinam y tres ambientes
Estado: entregado, pendiente de Rick
PR: (pendiente)
Fecha: 2026-10-14

## Qué se hizo

Lo pedido, en el orden del mensaje: 13 animaciones nuevas del motor (`src/engine/anim/especiales.ts`) y 3 ambientes (`src/engine/audio/ambienteMundos.ts`). También tomé en cuenta las tres cosas que avisaste del lado del juego.

### 1. Los súper golpes

Cada uno trae un `impacto` o una `suelta` en el cuadro donde sale el golpe, con su `punto` en las 5 filas. El aura y el fuego los sigue poniendo el juego encima. El sprite trae el cuerpo, la chispa del contacto y la pelota o el implemento.

| Animación | Cuadros, fps | Para | El golpe | Datos |
|---|---|---|---|---|
| `dunk_big` | 12, 14 | Básquet | `impacto` 6: la clava y rompe el tablero | `despegue` 2, `aterriza` 9. `elevacion` hasta 24 px a 48 |
| `spike_fuego` | 13, 14 | Vóley | `impacto` 8: la mata de arriba, después de una vuelta entera en el aire | `despegue` 3, `aterriza` 10. `elevacion` y `desplazamiento` |
| `shuttle_kick_back` | 8, 14 | Đá cầu | `impacto` 4: la chilena normal | `despegue` 2, `aterriza` 6 |
| `shuttle_kick_back_nekketsu` | 10, 14 | Đá cầu | `impacto` 5: la chilena Nekketsu, desde mucho más alto y con una vuelta atrás | `despegue` 2, `aterriza` 8. `elevacion` |
| `tackle_nekketsu` | 10, 14 | Básquet | `impacto` 4: el choque en plancha | `despegue` 2, `aterriza` 6. `elevacion` y `desplazamiento` |
| `bat_nekketsu` | 10, 14 | Chapita | `impacto` 4: el barrido con todo, y la vuelta completa | `girado` en 6 y 7. `arma` en cada cuadro |
| `javelin_rayo` | 12, 14 | Jabalina | `suelta` 8. En el 2 y el 3 sostiene la jabalina arriba: ahí carga el rayo | `paso` 0. `desplazamiento` |

### 2 a 5. Lo demás

| Animación | Cuadros, fps | Para | Eventos |
|---|---|---|---|
| `dodge_throw` | 6, 14 | Quemado: rodilla arriba, el balón atrás y lo suelta por arriba | `suelta` 3 |
| `dodge_hit` | 6, 12 | Quemado: el balonazo, sale disparado de espaldas y cae sentado | `aterriza` 3. `elevacion` |
| `cap_pitch` | 6, 14 | Chapita: de lado, el brazo bajo y el golpe de muñeca | `suelta` 3 |
| `shuttle_juggle` | 8, 12, en bucle | Đá cầu: dominarlo con el borde interno del pie, un pie y el otro | `impacto` 0 y 4, con cada pie |
| `vovinam_scissor` | 10, 14 | Judo y Vovinam: la patada tijera, con la barra llena | `despegue` 2, `impacto` 4, `aterriza` 6. `elevacion` y `desplazamiento` |
| `vovinam_scissored` | 10, 14 | El rival de la tijera, cuadro a cuadro | `aterriza` 6 |

### 6. Tres ambientes de 12 s en bucle

Mismo sistema que H7: un fondo que se funde en el empalme y una capa de 12 s exactos que da la vuelta. Pico en 0.5, sin graves por debajo de 70 Hz y sin melodías.
- `parque_tao_dan`: el parque Tao Đàn en la mañana. Los pájaros de las jaulas colgadas que se contestan, el toque del cầu de dos rondas de jugadores, una escoba de palito que barre hojas, unos señores en un banco y Saigón detrás de los árboles.
- `barrio_caracas`: el barrio de día. Dos guacamayas que cruzan gritando, la camionetica con su corneta, el pregón ("¡aguacateee!"), un radio con salsa lejos y apagado, los chamos jugando chapita con el "tac" del palo y un perro.
- `dojo_hanoi`: el dojo en la tarde. Los pies que arrastran sobre el tatami, tres caídas con su palmada, un kiai, el sensei, los que esperan al borde, el eco del salón y, afuera, la brisa del lago, la campana del templo de Ngọc Sơn y motos lejos.

### Lo que avisaste del lado del juego

1. **Judogi completo.** Entendido: un uniforme por pack es el pack completo de la escena, no solo las técnicas nuevas. La tijera va en `judo` y `judo_azul`, así que sale en judogi sin que hagas nada. Ver "Límites" sobre el ejemplo.
2. **Atlas en rejilla.** Ahora es contrato y una prueba lo vigila (`b7h8.test.ts`). Los atlas de atletas, animales, armas del piso y comida son una grilla pareja:
   - sin recorte y con un solo pivote;
   - cada cuadro mide una celda;
   - van en el orden del manifiesto: animación, fila y cuadro.

   Si algún día un pack necesita otra cosa, la prueba falla y te aviso antes. La única excepción que existe hoy es `objetos/pelotas.json`, donde cada pelota mide `2r + 2`. Lo dejé escrito en `KIT_A_MEDIDA.md`.
3. **Archivos.** Las 13 animaciones van en packs que ya tienes (`basket`, `voley`, `futbol`, `atletismo`, `beisbol`, `judo` y `judo_azul`): no suman archivos. Los 3 ambientes suman 3 sonidos, o 6 si mandas el OGG y el M4A. Quedarías en 490 de 511 (o 493).

### Y el kit, más rápido

Con las 13 nuevas en el ejemplo, el kit tardó 308 s y se pasó del límite de 300. No lo subí: aceleré el motor sin cambiar ni un byte de lo que sale.
- **El audio se comprime por lote:** varios ffmpeg en paralelo, uno por núcleo. Sale con los mismos bytes que antes (lo comprobé archivo por archivo).
- **Cada sonido se sintetiza una sola vez.** El glissando constante se calcula una vez y no en cada muestra.
- **Thor traza rayos solo dentro de la caja de sus piezas.** Es un 42% más rápido y sale pixel a pixel igual.

La prueba del kit completo pasó de 322 s a 268 s, con el kit solo en unos 255 s: unos 45 s de margen para lo que viene.

## Cómo se usa (estudio y kit)

**En el estudio:** las 13 salen en Animar con su nombre en español e inglés. El batazo Nekketsu se ve con el palo de escoba en la mano.

**En el `kit.config.json`:** súmalas a los packs de cada prueba. El ejemplo `docs/ejemplos/nekketsu/kit.config.json` ya las tiene:

```jsonc
"basket":    { "anims": [..., "dunk_big", "tackle_nekketsu"], "sin_props": true },
"voley":     { "anims": [..., "spike_fuego"], "sin_props": true },
"futbol":    { "anims": [..., "shuttle_juggle", "shuttle_kick_back", "shuttle_kick_back_nekketsu"], "sin_props": true },
"atletismo": [..., "javelin_rayo"],
"beisbol":   { "anims": [..., "bat_nekketsu", "cap_pitch", "dodge_throw", "dodge_hit"], "sin_props": true },
"judo":      { "anims": [..., "vovinam_scissor", "vovinam_scissored"], "vestuario": "judogi" },
"judo_azul": { "anims": [..., "vovinam_scissor", "vovinam_scissored"], "vestuario": "judogi_azul" },
"audio": { "ambientes": [..., "parque_tao_dan", "barrio_caracas", "dojo_hanoi"] }
```

**Lo que tiene que conectar el juego:**
- **Básquet:**
  - La clavada con la barra llena es `dunk_big` en vez de `dunk`. En el `impacto` se rompe el tablero.
  - La tacleada Nekketsu es `tackle_nekketsu` en vez de `flying_kick`. Su `desplazamiento` ya trae el avance, y el rival se cae en el `impacto`.
- **Vóley:** el remate con la barra llena es `spike_fuego`. La pelota sale en el `impacto` desde su `punto`.
- **Đá cầu:**
  - La chilena normal es `shuttle_kick_back`.
  - La chilena Nekketsu es `shuttle_kick_back_nekketsu`.
  - El saque y el dominio son `shuttle_juggle`. Suena un toque en cada `impacto`.
- **Chapita:**
  - El batazo Nekketsu es `bat_nekketsu`, con el palo en `arma` como en `bat_swing`. En los cuadros 6 y 7 espeja el sprite y sus datos, igual que en el seoi nage.
  - El lanzador usa `cap_pitch`, también en la recta de fuego. La chapa sale en la `suelta`.
- **Jabalina:** la lanza del Catatumbo es `javelin_rayo`. El relámpago va en los cuadros 2 y 3, y la jabalina sale en la `suelta`.
- **Quemado:**
  - El tiro es `dodge_throw` en vez de `weapon_throw`, el normal y el Nekketsu.
  - El que recibe el balonazo es `dodge_hit`. Arranca cuando el balón le llega, y el juego lo empuja hacia atrás mientras vuela.
- **Judo y Vovinam:**
  - Con la barra llena, `vovinam_scissor` para quien la tira y `vovinam_scissored` para el rival, arrancando juntos.
  - El rival va de pie, a media celda delante del `punto` del `impacto`. En el `aterriza` suena `caida_tatami`.
- **Ambientes:**
  - `parque_tao_dan` en Đá cầu.
  - `barrio_caracas` en Chapita.
  - `dojo_hanoi` en el judo.

**Las pelotas**, en los packs con `sin_props`, salen en `objetos`:
- `dunk_big` con `basquet`.
- `spike_fuego` con `voley`.
- Las del đá cầu con `futbol`, como las demás de ese pack.
- `dodge_throw` con `voley`: el balón de goma es de ese tamaño.
- `cap_pitch` con `beisbol`, como `pitch`.

## Pruebas

- **Prueba nueva `b7h8.test.ts`, 12 casos:**
  - Las 13 con sus cuadros, fps, bucle y eventos.
  - **Los 8 atletas pasan el control de calidad en 32, 48 y 64, en las 5 filas.**
  - Cada súper golpe trae su golpe con `punto` en las 5 filas.
  - Los saltos Nekketsu suben más que los normales y vuelven al piso al aterrizar.
  - El batazo trae `girado` en el 6 y el 7, y `arma` en cada cuadro.
  - Las pelotas salen en `objetos` con su clase, hasta donde las suelta o les pega.
  - La tijera va sincronizada con su rival y cierra a la altura del cuello.
  - El cầu da un toque con cada pie.
  - **Los atlas son una grilla pareja,** en orden y con un solo pivote.
  - Los 3 ambientes: bucle de 12 s, pico en 0.5, sin hueco, empalme limpio, que se oigan en un teléfono, y lo propio de cada uno (el toque del cầu, la corneta, la campana).
  - Imagen dorada `golden/b7h8.png`.
- **`h7.test.ts`** ahora mira los primeros 19 ambientes, porque hay 3 más.
- **El esquema** `docs/kit-a-medida.schema.json` está regenerado.
- **La suite sin `custom.test.ts`:** 47 archivos, 493 de 493. Las imágenes doradas de antes salen iguales, también con el motor más rápido.
- **`custom.test.ts`: 15 de 15,** con las 13 nuevas y los 3 ambientes en el ejemplo, y el kit por debajo de 300 s.
- **`tsc` limpio y `npm run build:sitio` limpio.**
- **e2e de Playwright: 50 de 50.**
- **`escuchar.html`** carga en Chromium sin errores.

## Para aprobar (todo en esta carpeta)

- **`clavada_nekketsu.gif`:** Rick y Alana con la `elevacion` puesta, el aro y el tablero que se rompe en el `impacto`.
- **`remate_fuego.gif`:** los dos con la vuelta en el aire y la pelota que sale para abajo.
- **`chilena_dacau.gif`:** Sophie con la normal y Rick con la Nekketsu.
- **`tacleada_nekketsu.gif`:** Kenji en plancha contra Goro, que cae.
- **`batazo_nekketsu.gif`:** Rick y Alana con el palo y la vuelta espejada como lo haría el juego.
- **`lanza_rayo.gif`:** Rick carga el rayo y la suelta. El relámpago del GIF es solo referencia: lo pone el juego.
- **`quemado_tiro.gif`:** Steph lanza y Tetsu recibe el balonazo.
- **`chapita_lanzar.gif`:** Goro lanza la chapa de lado.
- **`dominar_cau.gif`:** Sophie y Alana dominando el cầu.
- **`tijera_vovinam.gif`:** Ryu en judogi blanco atrapa a Kenji en azul.
- **`tablero_lado.png`:** Rick y Alana, todos los cuadros de las 13.
- **`tablero_filas.png`:** el cuadro clave de cada una en las 5 filas.
- **`escuchar.html`:** los 3 ambientes con un clic, y cada uno dos vueltas seguidas para oír el empalme (`ambiente/`).

Qué mirar:
- Que cada súper golpe se sienta más grande que su versión normal.
- Que la vuelta del batazo se lea como giro y no como un salto de cuadro.
- Que los ambientes suenen a esos lugares.

## Decisiones que tomé sin preguntar

1. **`shuttle_kick_back` es la chilena,** como la llamas tú. El pedido la describía como "toque de espuela". La Nekketsu va aparte, `shuttle_kick_back_nekketsu`, con el mismo esquema de nombres.
2. **Sumé `vovinam_scissored`.** La tijera del vovinam es un derribo: sin el rival, el juego no tiene cómo dibujar al que cae. Va como las proyecciones del judo.
3. **La tijera termina de rodilla** junto al rival, no de pie. El `desplazamiento` no puede ir hacia atrás, así que pararse lo dejaba encima del rival. De ahí el juego sigue con la guardia.
4. **El giro del remate es una vuelta hacia adelante,** hecho bolita, sobre la pelota. De lado se lee mejor que un giro sobre sí mismo.
5. **El batazo usa `girado`,** como el seoi nage, y termina mirando hacia el mismo lado que empezó.
6. **El balón del Quemado sale como `voley`** en `objetos`, porque es de ese tamaño. El cầu sale como `futbol`, igual que en el pack `futbol`.
7. **`dodge_hit` trae solo el `aterriza`.** El golpe lo decide el juego cuando el balón le llega.
8. **Las vueltas en el aire son de lado** (`spike_fuego`, las dos chilenas, la tacleada y la tijera). De frente una vuelta hacia atrás no se nota, así que en esas filas salen en la diagonal, como el salto largo.
9. **Aceleré el motor en vez de subir el límite,** y corregí un mensaje de error que estaba en voseo ("Partí el pack en dos" pasó a "Parte el pack en dos").

## Límites honestos

- **El molino de la clavada:** con el chibi, la mano no pasa por encima de la cabeza. El balón asoma detrás del pelo, y en Alana casi no se ve.
- **El balón del tiro del Quemado** va detrás de la cabeza en el 1 y el 2. En los chicos queda tapado por el pelo. En el juego lo dibujas tú con `objetos` y `detras`.
- **La plancha:** los brazos del chibi quedan debajo de la cabeza, así que el `punto` del choque es la cabeza.
- **La tijera a 32 px** se lee como alguien acostado en el aire, y en los chicos las piernas no se notan tanto.
- **El ejemplo no tiene el judogi completo.** Las 38 básicas en los dos packs de judo pasarían el kit de ejemplo de 300 s. Tu `kit.config.json` es la referencia para eso.
- **En las vueltas, el `desplazamiento` da un salto de unos 10 px en un cuadro,** porque el cuerpo gira sobre su centro. Si el juego lo aplica cuadro a cuadro como siempre, se ve bien.
- **De frente,** el palo del batazo apunta abajo en el golpe, igual que en `bat_swing`.
- **Los ambientes son sintetizados.** Se entiende qué es cada cosa, pero no es una grabación.

## Lo que necesita el siguiente lote

- **El juego:** conectar las 13 donde dice arriba y los 3 ambientes.
- **Lo que queda del pedido (B4 a B7):**
  - `hammer_spin`, `hammer_release`, `swim_punch`, `dunked`, `swim_turn`, `boat_start`, `traffic_dodge`.
  - `dodge_catch` y `beach_run`.
  - Las técnicas de equipo de B7: `play_drum`, `bike_charge`, `cap_bat_power`, `chair_spin_throw`, `slipper_storm` y `comb_hair`.
