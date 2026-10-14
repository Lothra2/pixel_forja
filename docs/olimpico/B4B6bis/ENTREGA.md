# Lote B4B6 bis: el judo de verdad
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/41
Fecha: 2026-10-14

## Qué se hizo

Los cinco puntos del pedido, en orden de prioridad:

1. **Seoi nage con el giro.** `judo_throw` trae un dato nuevo por cuadro, `girado`, en `true` del cuadro 2 al 9. Esos cuadros están dibujados desde la pose girada, de espaldas al rival: el juego espeja el sprite y sus datos justo ahí. Ahora sí se ve el seoi nage: agarre, jalón, gira y se mete de espaldas, lo carga en la espalda, lo pasa por encima del hombro y lo azota delante. La `carga` va arriba de la espalda del 3 al 5.
2. **Ukemi.** `judo_thrown` y `osoto_gari_thrown` terminan de espalda en el tatami con la palmada: los brazos bajan de golpe contra el piso, barbilla al pecho y piernas arriba. En el cuadro 6 va el `aterriza` y un `impacto` cuyo `punto` es la mano de la palmada, con una chispita en el tatami.
3. **O-soto-gari.** `osoto_gari` y `osoto_gari_thrown`, la barrida grande por fuera, sincronizadas: 10 cuadros a 14 fps, el `impacto` y el `aterriza` en el 6. Se lee de lado sin truco, así que no lleva `girado` ni `carga`.
4. **Rei.** `bow`: de pie, talones juntos y las manos en los muslos. Se inclina, cierra los ojos un instante y vuelve. 6 cuadros a 8 fps, sin bucle.
5. **Pack judo con judogi.** Un uniforme nuevo por pack en el kit a medida (`"vestuario": "judogi"`), sin tocar las 24 fichas. Hay `judogi` blanco y `judogi_azul`. El cinturón sale del color del equipo y en el tatami no van sombreros.

| Animación | Cuadros, fps | Eventos y datos |
|---|---|---|
| `judo_grip` | 4, 10, en bucle | Igual que en B4B6 |
| `judo_throw` | 10, 14 | `impacto` en el 6. `carga` del 3 al 5. `girado` del 2 al 9 |
| `judo_thrown` | 10, 14 | `aterriza` e `impacto` (la mano de la palmada) en el 6 |
| `osoto_gari` | 10, 14 | `impacto` en el 6 |
| `osoto_gari_thrown` | 10, 14 | `aterriza` e `impacto` (la mano de la palmada) en el 6 |
| `bow` | 6, 8 | |

**Lo que es motor general** y sirve para cualquier juego:
- `girado` es un dato nuevo de `Pose` que pasa al clip y al manifiesto. Cualquier animación lo puede usar. Cuando un kit lo trae, el manifiesto suma una nota que explica cómo espejar.
- `carryAt: 'back'` pone la `carga` arriba de la espalda en vez de sobre las manos.
- El `punto` de un evento puede ser `handLow`, la mano que queda más abajo en ese cuadro y en esa fila.
- `vestuario` por pack en el kit a medida, con los `UNIFORMES` del motor. Un uniforme nuevo es una entrada más en `wardrobe.ts`.

Lo de Nekketsu va en `docs/ejemplos/nekketsu/kit.config.json`: los packs `judo` y `judo_azul` y la prueba `judo`.

**El kit, más rápido.** Con los dos packs de judo, el kit de ejemplo tardó 314 s y se pasó de los 300. No subí el límite: aceleré el motor sin cambiar ni un pixel.
- El Scale2x del RotSprite, lo que más tiempo se comía, ya no calcula los bordes con min y max por cada vecino.
- Los pares de capas que no llevan contorno entre sí se buscan en una tabla.
- El lienzo lleva la caja de lo que se pintó, y los recorridos para las cajas, el cuerpo y el raster barren solo esa caja y no el lienzo completo.

Todas las imágenes doradas salen iguales. La prueba del kit completo pasó de 328 s a 268 s.

## Cómo se usa (estudio y kit)

**En el estudio:** las seis salen en Animar. `judo_throw` ahora se llama "Seoi nage (proyección de judo)", y están "O-soto-gari (barrida por fuera)", "Barrido por o-soto-gari" y "Rei (saludo de judo)". En el estudio los cuadros girados se ven sin espejar, como salen en el atlas.

**En el kit a medida:**

```jsonc
"packs": {
  "judo": { "anims": ["judo_grip", "judo_throw", "judo_thrown", "osoto_gari", "osoto_gari_thrown", "bow"], "vestuario": "judogi" },
  "judo_azul": { "anims": ["judo_grip", "judo_throw", "judo_thrown", "osoto_gari", "osoto_gari_thrown", "bow"], "vestuario": "judogi_azul" }
},
"pruebas": { "judo": ["base", "judo", "judo_azul"] }
```

**Lo que tiene que conectar el juego:**
- **`girado`:** en los cuadros con `true`, espejar el sprite al revés de como esté y espejar sus datos del cuadro: `x` pasa a `-x`, y en `cajas` y `cuerpo` `x` pasa a `-(x + w)`.
  ```js
  const g = an.girado?.[cuadro] ?? false;
  sprite.setFlipX(mira_izquierda !== g);
  ```
- **Al terminar `judo_throw`, tori queda girado,** de cara a donde cayó uke. El juego le cambia el lado al personaje y sigue con `idle` o `judo_grip` sin espejo extra.
- **Uke en el seoi nage:** del cuadro 3 al 5, `judo_thrown` con la base de su `cuerpo` en la `carga` de tori, ya espejada, igual que `carried`. Antes, cada uno en su lugar. Después, uke queda tirado delante. Uke no lleva `girado`.
- **Uke en el o-soto-gari:** cada uno en su lugar todo el tiempo, sin carga. Arrancan juntos.
- **Los botones:** flecha adelante más patada es `judo_throw` (seoi nage, ippon). Patada sola es `osoto_gari` (waza-ari).
- **El sonido:** `caida_tatami` en el `impacto` de la palmada, en el cuadro 6 de quien cae, con su `punto` para el polvito.
- **El rei:** `bow` al empezar, en cada ¡HAJIME! y al final, los dos de frente.
- **Los packs:** `judo` para el equipo de la persona y `judo_azul` para el rival. Si los dos son del mismo equipo, igual uno de blanco y otro de azul.

## Pruebas

- **Prueba nueva `judo.test.ts`, 9 de 9:**
  - Las seis con sus cuadros, fps, bucle y eventos de la tabla.
  - **Los 8 atletas pasan el control de calidad** en 32, 48 y 64, en las 5 filas, con su ropa y con los dos judogi.
  - **El giro:** `girado` es `[no, no, sí × 8]`. La `carga` sale solo del 3 al 5, arriba de la espalda: sube y avanza mientras pasa por encima.
  - **El o-soto-gari** no trae `girado` ni `carga`.
  - **La sincronía:** cada proyección y su uke tienen los mismos cuadros y fps, con el `impacto` y el `aterriza` en el mismo cuadro.
  - **El ukemi:** la mano del `punto` toca el tatami en el cuadro 6 y viene de arriba en el 5.
  - **El rei:** la silueta baja por lo menos 2 px y vuelve, con los pies quietos.
  - **El judogi:** cinturón azul en el blanco y amarillo en el azul para la Familia GG, sin sombreros, y la variante de la ficha manda.
  - **El kit:** `vestuario` y `girado` en el manifiesto, el uniforme que no existe da error con sugerencia, y el PNG blanco y el azul salen distintos.
  - **Imagen dorada** `golden/judo.png`.
- **`b4b6.test.ts` sigue en 7 de 7.** `judo_thrown` ahora trae `aterriza` e `impacto`. La imagen dorada `golden/b4b6.png` se regeneró y solo cambió la celda del judo.
- **El esquema** `docs/kit-a-medida.schema.json` está regenerado, con `vestuario` como lista cerrada.
- **El Scale2x nuevo** sale idéntico al viejo en 3000 imágenes al azar.
- **La suite sin `custom.test.ts`:** 46 archivos, 481 de 481. Las imágenes doradas de antes salen iguales, también con el render más rápido.
- **`custom.test.ts`: 15 de 15,** con los packs `judo` y `judo_azul` en el ejemplo (18 atlas por atleta) y el kit por debajo de 300 s.
- **`tsc` limpio y `npm run build:sitio` limpio.**
- **e2e de Playwright: 50 de 50.**

## Para aprobar (todo en esta carpeta)

- **`seoi_nage.gif`:** Rick en judogi blanco contra Kenji en azul. Rei, agarre y proyección, con Kenji puesto en la `carga` como lo haría el juego. Rick gira de espaldas (el GIF espeja como lo haría el juego), carga a Kenji y lo azota. Kenji cae con la palmada.
- **`osoto_gari.gif`:** Steph en blanco barre a Goro en azul por fuera, también con rei y agarre. Goro cae de espalda con la palmada.
- **`ukemi_sophie_alana.gif`:** Sophie y Alana en judogi, barridas por o-soto-gari, caen con el ukemi.
- **`rei_familia.gif`:** Rick, Steph, Sophie y Alana haciendo el rei de lado, en judogi.
- **`judogi_24.png`:** los 24 atletas en judogi blanco y azul, cada uno con el cinturón de su equipo.
- **`tablero_lado.png`:** Rick y Alana de lado, todos los cuadros de las seis. Los uke van en azul.

Qué mirar:
- **Que el giro se lea en el seoi nage.** Es lo que pediste primero.
- Que la palmada se entienda a 48 px. Va con chispita para que se note.
- Que el judogi azul no se confunda con el gakuran del Instituto Nekketsu.

## Decisiones que tomé sin preguntar

1. **Las cuatro proyecciones son de lado.** En las filas de frente y de espalda salen en la diagonal, como el salto largo. De frente no se ve el giro ni quién va delante, y espejar en la fila de frente no tiene sentido.
2. **Tori termina girado.** En el seoi nage de verdad termina de cara a donde cayó uke. Devolverlo al otro lado en el último cuadro sería un salto feo. El juego le cambia el lado al final.
3. **Uke no lleva `girado`.** Con tori espejado, la vuelta de uke por encima del hombro ya cae del lado correcto.
4. **La palmada es un `impacto`** con la mano que queda más abajo, en el mismo cuadro del `aterriza`. Así el juego no necesita un evento nuevo y suena donde pega la mano. De lado, la mano cercana queda sobre el cuerpo, por eso la chispa va en la de afuera.
5. **El judogi va como uniforme del pack** y no como variante en las 24 fichas. Así sirve para cualquier ficha, también las que se creen después, y la ficha que traiga su propio judogi lo sigue usando.
6. **El cinturón** sale del color del equipo que más contrasta con el judogi. En la Familia GG el amarillo se pierde sobre blanco, así que va el azul en el blanco y el amarillo en el azul. Sin equipo, negro.
7. **En el tatami no hay sombreros.** Se quitan gorras, cascos y sombreros. Las cintas y los rulos se quedan, porque son parte del personaje.
8. **Saqué el judo del pack `pelea` en el ejemplo.** Ahora vive en `judo` y `judo_azul`. Si el juego todavía lo carga de `pelea`, tiene que cambiar a los packs nuevos.
9. **Le saqué el control de altura al rei.** Al inclinarse, la cabeza baja a propósito, y ese control lo marca como error.

## Límites honestos

- **El giro depende del juego.** En el atlas, los cuadros girados se ven mirando al mismo lado que los otros. Sin el espejo del juego, el seoi nage se ve como antes.
- **El rei de lado se lee poco a 32 px.** Baja 2 o 3 px. De frente se nota más por la cabeza.
- **El judogi no tiene solapas cruzadas de verdad.** Es la chaqueta abierta con cuello en V sobre la camiseta del mismo color. A 48 px se lee como judogi, a 32 px como pijama blanco.
- **El o-soto-gari a 32 px** se confunde con una patada baja en el cuadro de la barrida. A 48 se entiende.
- **No probé el GIF con Phaser.** Los GIF espejan como describo arriba. Si el juego espeja distinto, se nota en el cuadro 2.

## Lo que necesita el siguiente lote

- **El juego:** espejar con `girado`, la carga de uke del 3 al 5, los dos botones, `caida_tatami` en la palmada, `bow` en el ¡HAJIME! y los packs `judo` y `judo_azul`.
- **Lo que queda de B4 a B7 en el pedido:** `hammer_spin`, `hammer_release`, `swim_punch`, `dunked`, `swim_turn`, `boat_start`, `vovinam_scissor`, `dodge_throw`, `dodge_hit`, `beach_run`, `dunk_big`, `cap_pitch`, `shuttle_juggle`, `shuttle_kick_back`, `traffic_dodge` y las técnicas de equipo de B7.
