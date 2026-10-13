# Lote SP: packs sin pelota (`sin_props`)
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/28
Fecha: 2026-10-13

## Qué se hizo

El pedido del juego: un pack que sale sin la pelota pintada, con la posición de la pelota de cada cuadro en los datos. Así la pelota la mueve la física y no se ven dos.

**El formato en `kit.config.json`, general para cualquier juego:**
- Un pack puede ir como la lista de siempre o como objeto: `{ "anims": [...], "sin_props": true }`.
- La lista sigue valiendo igual, byte a byte. La forma objeto sin `sin_props` sale igual que la lista.
- El esquema y la validación revisan las dos formas. Un nombre mal escrito dice el campo y sugiere el correcto: `packs.voley.anims[1]: "vb_bunp" no es una animación. ¿Quisiste decir "vb_bump"?`. Una clave rara también: `packs.voley.sin_prop: clave desconocida. ¿Quisiste decir "sin_props"?`.

**Motor:**
- **El render dibuja dos veces los cuadros con pelota** (`renderHuman` con `sinPelotas`). La primera, con la pelota, mide todo: el piso, las cajas, el encuadre y las articulaciones. La segunda pinta sin la pelota, sobre el mismo piso. El cuerpo no se mueve ni un pixel: solo cambian los pixeles de la pelota y de su contorno, y donde la pelota tapaba al cuerpo ahora se ve el cuerpo.
- **Los cuadros sin pelota se dibujan una sola vez,** así que el costo extra es poco.
- **Cada pelota dibujada deja su centro exacto, su diámetro y si va detrás** (`pelotas` en el cuadro grande, `balls` en el clip). Salen bien también en las filas espejo y en la chilena, que no es premium.
- **Dato por cuadro nuevo `objetos`** (`frameData.ts`), en `[fila][cuadro]` desde el pivote, como los demás.
- **El manifiesto lo explica en una nota** (`sin_props (voley, futbol): ...`) y escribe `objetos` con una fila por línea.
- **El visor del kit dibuja la pelota de `objetos`** como un círculo rosado (casilla "pelota").

**Ejemplo de Nekketsu:**
- Packs nuevos `voley` (`vb_bump`, `vb_set`, `spike`, `block`, `serve`, `vb_dive`) y `futbol` (`trap`, `header`, `volley`, `chilena`), los dos con `sin_props`.
- Pruebas nuevas: `voley_playa` y `futbol_callejero` (`base` más su pack) y `da_cau` (`base` y `futbol`).

## Cómo se usa (estudio y kit)

```jsonc
"packs": {
  "base": ["idle", "walk", "run"],
  "voley": { "anims": ["vb_bump", "vb_set", "spike", "block", "serve", "vb_dive"], "sin_props": true },
  "futbol": { "anims": ["trap", "header", "volley", "chilena"], "sin_props": true }
}
```

En el manifiesto, cada animación del pack que traía pelota lleva `objetos`, aunque no se pida `datos_por_cuadro`. Lo de Rick en `serve`, fila `right`, tal cual sale:

```jsonc
"objetos": [
  [[{"tipo":"pelota","clase":"voley","x":3.5,"y":-15.5,"r":3.5,"detras":0}], [{"tipo":"pelota","clase":"voley","x":3.5,"y":-15.5,"r":3.5,"detras":0}], [{"tipo":"pelota","clase":"voley","x":5.5,"y":-37.5,"r":3.5,"detras":0}], ..., null, null, null],
  ...
]
```

- `objetos[fila][cuadro]` es la lista de objetos sueltos del cuadro, o `null` si no hay. Hoy trae una pelota como mucho.
- `tipo` es `"pelota"`. `clase` es `futbol`, `voley`, `basquet`, `tenis`, `beisbol` o `bala`.
- `x`, `y`: el centro exacto desde el pivote, `y` hacia abajo. Puede caer en medio pixel: la de vóley mide 7 px.
- `r`: el radio sin el contorno. En celda 48, vóley 3.5 y fútbol 3. En un gigante de 64, 4.5 y 4.
- `detras`: 1 si iba detrás del cuerpo. En estas 10 animaciones siempre es 0.
- Al espejar con `flipX`, `x` pasa a `-x`.
- `block` no trae pelota, así que no lleva `objetos`.

**El juego:**
- Cargar `voley` o `futbol` como cualquier pack: `m.pruebas.voley_playa`, `futbol_callejero` y `da_cau` ya los traen.
- Mientras la animación tiene la pelota (hasta el `impacto` o el `despegue`), poner la pelota de la física en `objetos`:

```js
const o = an.objetos[filaIdx][sprite.anims.currentFrame.index - 1]?.[0];
if (o && !pelota.suelta) pelota.setPosition(sprite.x + (sprite.flipX ? -o.x : o.x), sprite.y + o.y).setDepth(sprite.depth + (o.detras ? -1 : 1));
```

- En el evento de impacto la pelota pasa a la física. Desde ahí `objetos` ya no manda.
- Para el Đá cầu, el juego dibuja su cầu en vez de la pelota, en el mismo punto. `clase` dice `futbol` y se ignora.
- El detalle está en `docs/KIT_A_MEDIDA.md`, sección "Packs sin pelotas".

## Pruebas

- **Prueba nueva `sinprops.test.ts`, 8 casos:**
  - Las 10 animaciones, en las 5 filas de Nekketsu: todo lo que cambia está en la pelota o su contorno, y casi todo el disco de la pelota cambia (más del 85 %). Los cuadros sin pelota no cambian ni un pixel. `wholes`, articulaciones y pelotas, iguales.
  - La posición: lo que se borró contiene el disco entero y queda dentro de su contorno, en Rick (48) y en Goro (64), también en la chilena. En 246 de 255 cuadros lo borrado queda centrado exacto en `objetos` con `d + 2` de lado. Los otros 9 son cuando el contorno de un lado cae sobre la mano y ese lado no cambia.
  - `objetos` en `[fila][cuadro]`, desde el pivote, con `null` sin pelota. `block` no lo lleva. La raqueta del tenis se queda.
  - La lista y la forma objeto validan en el motor y en el esquema (Ajv). Los errores dicen el campo y sugieren el nombre, y el esquema rechaza lo mismo.
  - El kit: el pack con `sin_props` trae `objetos`, su atlas cambia solo donde estaba la pelota y `cuerpo` sale igual. El pack sin `sin_props` sale byte a byte igual que en un kit sin packs `sin_props`. La forma objeto sin `sin_props` sale igual que la lista.
  - El manifiesto trae la nota y escribe `objetos` una fila por línea.
- **`custom.test.ts`:** el kit de Nekketsu trae `voley` y `futbol` con `objetos` en Rick y Goro, sin `objetos` en `base`, y la nota. La cuenta de PNG pasa de `24 * 9` a `24 * 11`. El esquema está regenerado. 15 de 15 en 199 s.
- **El kit de Nekketsu completo, por la línea de comandos: 185 s,** 938 archivos y 58.1 MB. Pasa el límite de 300 s.
- **Resto de `src/engine/__tests__`:** 30 archivos, 325 de 325.
- **`tsc` limpio, `npm run build:sitio` limpio y e2e del visor 6 de 6** (con la casilla nueva de la pelota).
- **Suite completa: 34 archivos, 353 pruebas, todas en verde, y e2e de Playwright 50 de 50.** En una corrida con otros tres lotes armándose a la vez en la misma máquina, el arranque del kit completo de Nekketsu se cortó por tiempo. Corrida sola: 15 de 15 en 199 s.

- **Después de unir todo (#26 a #34 en `main`):**
  - Prueba nueva en `burlas.test.ts`, la que pidió el juego: una burla con alias dentro de un pack objeto con `sin_props`.
    - El alias sale en el manifiesto y la pelota se va del dibujo y queda en `objetos`.
    - La validación no da "no está en ningún pack".
  - El arreglo de `alias` ya estaba en `main`. Faltaba la prueba que lo cuida.
  - En `main`, la suite completa da 40 archivos y 428 de 428. `tsc` y `npm run build:sitio` salen limpios y el e2e de Playwright da 50 de 50.
  - El kit de Nekketsu con todos los lotes, por la línea de comandos: 231 s, 1333 archivos y 75 MB. Quedan 69 s de margen frente al límite de 300.

## Para aprobar (todo en esta carpeta)

- `tablero_sin_props.png`: las 10 animaciones de Rick, de lado y en diagonal. Arriba el pack con pelota (fondo azul), abajo el pack sin pelota (fondo verde) con el círculo de `objetos` en rojo. Sale del kit de verdad: los atlas y el manifiesto de `buildCustomKit`.
- `pelota_en_objetos.gif`: Rick haciendo `volley` y después `header`. A la izquierda el pack con pelota. A la derecha el pack sin pelota, con una pelota dibujada aparte por el script en la posición de `objetos`, como lo haría el juego. Calza cuadro a cuadro, y en el cabezazo se ve que la pelota sigue aunque se salga de la celda.

## Decisiones que tomé sin preguntar

1. **Se quitan las pelotas que el motor dibuja como pelota:** fútbol, vóley, básquet, tenis, béisbol y la bala del lanzamiento de bala. La bala sale volando suelta igual que una pelota. Si el juego la quiere dibujada, es una línea.
2. **Lo agarrado se queda dibujado:** raqueta, bate, garrocha, jabalina, armas y la flecha del arco (va en la cuerda). Las chispas de golpe también se quedan.
3. **El formato de `objetos` es una lista de objetos con nombre** (`tipo`, `clase`, `x`, `y`, `r`, `detras`), no una tupla como `arma`. Así sirve para más de un objeto y para objetos que no sean pelotas.
4. **`x` e `y` son el centro exacto, sin redondear.** Una pelota de 7 px tiene el centro en medio de un pixel. Redondear la correría medio pixel, y con eso ya no calza.
5. **`objetos` sale solo en los packs con `sin_props`, siempre,** aunque no se pida `datos_por_cuadro`. Sin el dato la pelota se pierde. No lo sumé a `datos_por_cuadro: true`: los kits de hoy cambiarían.
6. **Solo en las animaciones que traen alguna pelota.** Como `arma` y `carga`, no va en `block` ni en `idle`.
7. **`cajas` en un pack sin pelota mide lo que se ve,** o sea sin la pelota. `cuerpo` ya no la tenía y sale igual.
8. **Los packs de Nekketsu se llaman `voley` y `futbol`,** como los demás del ejemplo (`base`, `pelea`), y no `ngg_voley`. Llevan solo las 10 animaciones del pedido, para no alargar el kit.
9. **Sumé tres pruebas al ejemplo:** `voley_playa`, `futbol_callejero` y `da_cau`. Los nombres son míos. Si el juego usa otros, se cambian en su config.
10. **El visor dibuja `objetos`.** No estaba en el pedido, pero es la referencia viva de cómo se leen los datos.

## Límites honestos

- **No medí el kit de antes hoy.** Con los packs nuevos tarda 185 s. Por lo que medí, los 10 packs por atleta suman unos 15 a 20 s. C7b medía entre 185 y 200 s sin ellos en esta máquina, así que la carga de la máquina pesa más que esto.
- **El contorno de la pelota no siempre sale entero.** Donde el contorno cae sobre la mano, ese pixel no cambia al quitar la pelota. No es un error: la mano ya era de ese color.
- **Es la pelota, no el vuelo.** `objetos` dice dónde está la pelota mientras el atleta la tiene. Después del impacto la animación la manda en una línea recta corta, y eso ya es de la física del juego.
- **Fuera de la celda la pelota se corta en el pack con pelota,** pero `objetos` dice dónde iría. En el cabezazo, los primeros cuadros traen la pelota fuera de la celda.
- **La chilena no es premium.** Se dibuja con el movimiento clásico: sin eventos ni avance, y con un estilo un poco distinto a las otras 9.
- **Ropa:** Vóley Playa sale con la ropa de la ficha. No hay variante de playa.
- **No está en el estudio.** El estudio ya tiene el botón de mostrar u ocultar implementos, pero no muestra `objetos`.

## Lo que necesita el siguiente lote

- **El juego:**
  - Copiar los packs `voley` y `futbol` y las pruebas del ejemplo a su `kit.config.json`.
  - Poner la pelota de la física en `objetos` hasta el impacto (arriba).
  - Avisar si quiere más animaciones con `sin_props` (por ejemplo `vb_ready`, `run_ball`, `shot` o el tenis), o la bala dibujada.
- **PixelForja:** si el juego lo pide, una variante de ropa de playa para el vóley y una chilena premium.
