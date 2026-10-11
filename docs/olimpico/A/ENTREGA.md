# Lote A: datos y exportación
Estado: entregado
PR: https://github.com/Lothra2/pixel_forja/pull/7
Fecha: 2026-10-11

## Qué se hizo

Todo es capacidad general del motor. Lo único del juego es el ejemplo en `docs/ejemplos/nekketsu/`.

| Pedido | Hecho | Dónde |
|---|---|---|
| A1. Filtro de filas | Opción `filas` en el kit deportivo y en el de GG Abyss (y `--filas` en los dos scripts). Valida filas desconocidas o repetidas. Las pruebas de campo de frente o de espalda siguen usando la diagonal, y `rumbo` lo dice | `export/frameData.ts` (`viewsForRows`), `kit/sportskit.ts`, `kit/gamekit.ts` |
| A2. `cajas` | `[x, y, w, h]` del recuadro de los pixeles opacos, por fila y cuadro, desde el pivote. `null` si el cuadro está vacío | `frameDataOf` |
| A3. `manos`, `cabeza`, `pies` | Por fila y cuadro, desde el pivote, en todos los cuadros. Las articulaciones ahora salen en todas las animaciones de personas, premium o no, y en las vistas espejo (antes se perdían al espejar) | `render/clip.ts`, `frameDataOf` |
| A4. `punto` en todas las filas | Sale con una entrada por fila pedida. Si las filas no traen la vista de lado, el kit dibuja el lado aparte solo para medir | `export/motion.ts` (`motionOf8`) |
| A5. Atlas por pack | `atletas/<id>/<pack>.png + .json`, JSON Hash de TexturePacker, cuadro `<anim>_<fila>_<cuadro>`, pivote en cada cuadro. Grilla sin recortar. Avisa si no entra en 4096 | `export/atlas.ts` |
| A6. Retratos | 7 expresiones con los ojos y bocas del motor. Chico 40 x 40 dibujado a celda 64. Grande 96 x 96 = cabeza y hombros escalados x3 entero (ver límites) | `kit/portraits.ts` |
| A7. Cabecitas | 12 x 12 por atleta en `ui/cabecitas.png`, con `cabecita: "ui/cabecitas.png#<id>"` | `kit/portraits.ts` (`headIcon`) |
| A8. Vestuario por pack | `wardrobe` en la ficha: variantes con nombre y qué pack usa cada una. El kit dibuja cada pack con la suya y el manifiesto trae `vestuario`. El estudio muestra las variantes | `sheet/wardrobe.ts`, `sheet/ficha.ts` |

En el estudio:
- **Ver datos** en Animar, junto a Papel cebolla. Dibuja la caja, las manos, la cabeza, los pies y el punto del golpe, con la leyenda y la caja del cuadro en números.
- **Vestuario**: si la ficha trae variantes, aparecen como botones debajo de la animación. Se ve cada una sin cambiar la ficha.
- Todo está en español y en inglés.

## Cómo se usa (estudio y kit)

Kit deportivo:

```bash
npm run deportes -- salida/kit --fichas mis_fichas --deportes pelea,natacion \
  --filas right,down_right,up_right,down,up --datos --atlas --retratos --cabecitas
```

Kit de GG Abyss: `npm run kit -- salida --filas right,down_right,up_right,down,up`.

Desde código: `buildSportsKit({ filas, datos: true, atlas: true, retratos: true, cabecitas: true })`. `datos` también acepta la lista de campos (`['cajas', 'manos']`).

Estudio: Inicio, Abrir ficha, `docs/ejemplos/nekketsu/rick.ficha.json`. En Animar aparecen Vestuario (Calle, Bañador, Judogi, Camiseta) y el botón Ver datos.

Los campos y el código de Phaser están en [docs/KIT_DEPORTES.md](../../KIT_DEPORTES.md#datos-por-cuadro-atlas-retratos-y-vestuario).

## Pruebas

`npm test`: 170 de 170. `npm run e2e`: 30 de 30 en escritorio y teléfono, incluida la arena con el kit completo (`npm run build:sitio`). Las nuevas están en `src/engine/__tests__/frameData.test.ts` y en la prueba e2e "ver datos y vestuario".

Tabla de calidad del lote:

| Qué se revisa | Resultado |
|---|---|
| `cajas` encierra todo pixel opaco y nada más (el recuadro justo, cada borde toca un pixel) | Rick y Alana, 6 animaciones, 32/48/64, 5 filas: todos los cuadros |
| `manos`, `cabeza` y `pies` caen sobre pixeles opacos | Las mismas corridas: 100% |
| La mano cercana cae sobre la mano (piel a un pixel o menos) donde la mano se ve (`right` y `down`) | Más del 97%. Las que no: el puño en guardia queda detrás de la barba, o la mano sostiene la pelota |
| Medición aparte, fuera de las pruebas | 8340 de 8340 puntos de mano sobre pixel opaco (2 personajes, premium y clásico, 32/48/64, 9 animaciones, 5 filas) |
| `punto` en todas las filas pedidas | 5 entradas por evento con 5 filas, en el kit deportivo y en el de GG Abyss |
| Atlas ≤ 4096 | El pack más grande (fútbol, 8 filas, Hulk a celda 64) mide 2560 x 2496 |
| Control de calidad del motor con vestuario | Rick con bañador, judogi y camiseta en natación, pelea y fútbol, a 32/48/64 y en 5 filas: 705 animaciones, 0 fallas |
| El kit deportivo y el de GG Abyss salen igual que antes sin las opciones nuevas | Hash idéntico contra `main` (deportivo `b5817ad844086c6f`, GG Abyss `6aa712be4819a32e`, pelea y atletismo completos `f5e2c90797b4e30e`). Hay una prueba que revisa que sin opciones no aparece ningún campo nuevo y que pedir las 8 filas en su orden da los mismos bytes |

Tablero: [`tablero.png`](tablero.png). GIFs con los datos encima: [`jab_ver_datos.gif`](jab_ver_datos.gif) y [`walk_ver_datos.gif`](walk_ver_datos.gif).

## Decisiones que tomé sin preguntar

- **Retrato grande x3 y no x2.** El pedido dice x2 si a 96 no sale nítido. Pero a celda 64 el chibi entero mide unos 50 px, así que un recorte de 48 escalado x2 es el **cuerpo entero chiquito**, no un retrato. Hice cabeza y hombros (recorte de 32) escalado x3 entero: nítido, sin colores mezclados, y se ven la cara y la expresión. Se dice en el manifiesto (`escala_grande: 3`).
- **Cabecitas reducidas desde la cabeza grande.** A celda 32 la cabeza ya mide más de 12 y pierde lentes y peinado: las cuatro cabecitas salían iguales. Las saco de la cabeza a celda 64 reducida a la mitad, quedándome con el color más repetido de cada bloque de 2 x 2. No inventa colores (hay prueba) y cada persona se distingue.
- **Con atlas, `packs` reemplaza a `deportes`.** No duplico las hojas: con `--atlas` cada atleta trae `packs` con su atlas y sus animaciones (sin `archivo`), como pide el contrato 4.3.
- **Manifiesto compacto con datos o atlas.** Con `cajas` y compañía el manifiesto pesaba 816 KB con un número por línea. Con `--datos` o `--atlas` los arreglos de números van en una línea: 140 KB. Sin esas opciones se escribe igual que siempre, byte a byte.
- **`vestuario` lista todos los packs exportados**, con `ficha` para los que usan la ropa de la ficha. Solo aparece si la ficha tiene `wardrobe`.
- **Las articulaciones salen en todas las animaciones de personas**, no solo en las premium. El movimiento JSON de las clásicas no cambia (`articulaciones` sigue saliendo solo en premium) y los kits por defecto salen iguales.
- **El vestuario es parte de la ficha, no una opción del kit.** Así el estudio y el kit usan el mismo dato, y la ficha viaja con su ropa.
- **Los nombres de pack del ejemplo** son los del kit deportivo actual (atletismo, natacion, pelea, futbol). Los packs del juego (`base`, `judo`...) llegan con el lote B.
- **Ver datos dibuja en pixeles de la celda**, sobre el lienzo ampliado: una línea o un punto es un pixel del sprite. Es exacto, pero los puntos son chicos en el zoom bajo.

## Límites honestos

- **Retrato de 96 sin más detalle que el sprite.** Es un escalado entero x3 del sprite de celda 64. Para un 96 dibujado de verdad hace falta un dibujante de cabezas grandes (otro tamaño de sellos de ojos y bocas). Alternativa: usarlo así en diálogos, que es legible, y dejar el dibujante para el lote J.
- **Cabecitas sin ojos a veces.** A 12 x 12 la reducción conserva peinado, piel, barba y ropa, pero los ojos de Rick se funden con los lentes. Se reconocen por silueta y color, no por la cara. Alternativa: dibujarlas a mano como sellos si el HUD las necesita más expresivas.
- **`cajas` incluye todo lo opaco:** también la pelota, la jabalina o la chispa del golpe. Para un hurtbox del cuerpo solo, conviene achicarla o armarla con `cabeza` y `pies`. Si hace falta, un campo `cuerpo` (sin implementos ni efectos) sale fácil en el lote B.
- **Manos tapadas de espaldas.** En `up` y `up_right` la mano a veces queda detrás del cuerpo. El punto dice dónde está, sobre un pixel opaco, pero ese pixel puede ser la espalda.
- **Bañador = camiseta sin mangas.** El motor no dibuja el torso desnudo.
- **El estudio no edita el vestuario.** Lo muestra y deja verlo puesto, pero las variantes se escriben en el JSON de la ficha. Un editor de variantes cabe en el lote J.

## Lo que necesita el siguiente lote

Lote B1 + D1 (beat 'em up y armas):
- Usar `--filas right,down_right,up_right,down,up --datos --atlas` en el kit del juego.
- Las animaciones nuevas de pelea tienen que traer `impacto` en el cuadro del golpe para que salga `punto`.
- Para las armas (D1): `manos` ya da dónde enganchar el arma en cada cuadro y fila.
- Definir los packs del juego (`base`, `judo`, `beat`...) en `SPORT_PACKS` o en un kit a medida (lote I), y ponerles su variante en el `wardrobe` de cada ficha.
- Si el juego necesita hurtbox sin implementos, pedir el campo `cuerpo`.
