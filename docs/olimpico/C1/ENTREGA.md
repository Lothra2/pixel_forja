# Lote C1: Familia GG e Instituto Nekketsu
Estado: entregado
PR: https://github.com/Lothra2/pixel_forja/pull/9
Fecha: 2026-10-12

## Qué se hizo

Los dos equipos de la rebanada vertical, como fichas de ejemplo en [`docs/ejemplos/nekketsu/fichas/`](../../ejemplos/nekketsu/fichas/). Todo lo que usan es capacidad general del motor: sirve para cualquier equipo de cualquier juego.

**Familia GG:**
- Rick, Steph, Sophie y Alana desde sus presets, con su look de siempre y su color: Rick azul, Steph el rosado de su preset, Sophie verde y Alana fucsia.
- "GG" dorado en el pecho y el número dorado atrás: Rick 7, Steph 28, Sophie 15 y Alana 21.
- Alana trae además un vestuario "Mickey" (camisa roja, short negro y zapatos amarillos) que se elige en el estudio.
- Thor como mascota, con sus 17 animaciones.

**Instituto Nekketsu:** gakuran azul marino muy oscuro con botones dorados y brazalete rojo.
- `kenji`: Kenji "Toro" Sakamoto, pompadour `cowlick_tall`, gakuran abierto sobre camiseta blanca. Robusto, como su apodo.
- `ryu`: Ryu Takeda, `spiked` café con cinta blanca atada, gakuran cerrado. Alto y flaco, de karateka.
- `goro`: Goro Iwata, gigante en celda 64, `buzzcut`, gakuran sin mangas.
- `tetsu`: Tetsu Mori, `flat_top_straight` con lentes oscuros, gakuran cerrado. Bajo y flaco, de lanzador.

**Lo nuevo en el motor** (campos de `outfit` en la ficha, todos opcionales):
- `jacketCut: 'gakuran'`: chaqueta escolar japonesa de cuello alto con botones dorados. `jacketClosed` la abotona y `jacketSleeves` le quita o acorta las mangas. `buttons` cambia el color de los botones.
- `armband`: brazalete del color dado en el brazo cercano. Sirve para un equipo o para el capitán de fútbol.
- `chestText` y `chestTextColor`: hasta 3 letras en el pecho. Con letras, el número va solo atrás.
- El número y las letras **buscan dónde no los tapen** la cabeza, la barba, el pelo o los brazos. Nunca salen a medias. Si no cabe ni una letra entera, va un parche del color.
- `cell` en la ficha: un gigante sale en 64 en el kit y el estudio lo abre en 64.

**En el kit:**
- Una ficha de animal en `--fichas` sale en `animales/<id>.png + .json` con todas sus animaciones y su entrada en `animales` del manifiesto.
- Cada atleta con número trae `numero` en el manifiesto, para el HUD.

**En el estudio:** en Estilo aparecen corte de chaqueta, mangas de la chaqueta, cerrada, botones, brazalete y letras en el pecho, en español e inglés. Al abrir la ficha de un gigante, el tamaño pasa a 64.

## Cómo se usa (estudio y kit)

Estudio: Inicio, Abrir ficha, cualquiera de `docs/ejemplos/nekketsu/fichas/`. Se edita en Estilo como cualquier ficha.

Kit de los dos equipos con todo lo del juego:

```bash
npm run deportes -- salida/kit_equipos --fichas docs/ejemplos/nekketsu/fichas \
  --deportes atletismo,natacion,voley,tenis,pelea,futbol,calle \
  --filas right,down_right,up_right,down,up --datos --atlas --retratos --cabecitas --objetos
```

Salen 127 archivos (21 MB):
- Los 8 atletas con 119 animaciones cada uno en 7 atlas, Goro en celda 64.
- Retratos de los 8, cabecitas y armas del piso.
- Thor en `animales/thor.png + .json` con sus 17 animaciones.
- Ninguna textura pasa de 2112 px.

Los campos están explicados en [docs/KIT_DEPORTES.md](../../KIT_DEPORTES.md#equipos-uniformes-gigantes-y-mascota).

## Pruebas

`npm test`: 187 de 187. `npm run e2e`: 34 de 34 en escritorio y teléfono, con la arena sobre el kit completo (`npm run build:sitio`). `tsc -b` limpio. Las nuevas están en `src/engine/__tests__/teams.test.ts` y en la prueba e2e "equipos".

| Qué se revisa | Resultado |
|---|---|
| Las 8 fichas y Thor son válidas | Sí. Goro trae `cell: 64` |
| Control de calidad del Instituto Nekketsu: todas las animaciones del kit, incluida la pelea callejera, en 5 filas, en 32, 48 y 64 (Goro en 64) | 4550 clips, 0 fallas (medido aparte) |
| Control de calidad de los 8, en la prueba: 11 animaciones clave (idle, walk, run, jab, hit, lift, carry_walk, throw_overhead, carried, thrown_spin, weapon_swing) | 0 fallas |
| Siluetas: dos compañeros de equipo no comparten más del 85 % de la silueta, de lado, en diagonal y de frente | El par más parecido, Kenji y Tetsu de lado, queda en 0,84 |
| Gakuran cerrado tapa la camiseta y lleva botones; sin mangas cambia los brazos | Sí |
| Brazalete rojo en las 3 vistas | Sí, y sin brazalete no aparece |
| Letras y número enteros, nunca a medias | Rick a 64: las dos G completas. A Steph de espalda el pelo le tapa el número y no se dibuja |
| Kit: celda de la ficha, `numero` y la mascota | Goro en 64 con pivote [32, 62]. Rick con `numero: "7"`. Thor con las 17 animaciones en su atlas |
| Imagen dorada | `golden/equipos_c1.png`: los 8 de frente |
| Estudio (e2e) | Abre Kenji y cambia el gakuran a casual. Abre Rick y edita las letras. Goro abre en 64. En escritorio y teléfono |
| Kits de siempre | Las imágenes doradas de antes no cambian |

Entregables en esta carpeta:
- `tablero_familia_gg.png` y `tablero_instituto_nekketsu.png`. Cada uno trae los 4 atletas en las 5 filas con idle y run, sus 7 retratos chicos y el grande, los 4 sobre arena, pasto, asfalto de noche y agua, y las siluetas. El de la familia trae además el vestuario Mickey de Alana y las 17 animaciones de Thor.
- `aprobacion_rick_kenji.gif`: Rick levanta a Kenji, camina con él y lo lanza.
- `aprobacion_familia_gg.gif` y `aprobacion_instituto_nekketsu.gif`: los 4 corriendo y en idle, de lado y en diagonal.

## Decisiones que tomé sin preguntar

- **Brazalete rojo como "cinta roja" del Instituto.** Rick lo aprobó. Una cinta en la frente aplastaba el pompadour de Kenji, y Ryu ya lleva la blanca.
- **Gakuran azul marino muy oscuro (`#353c58`) en vez de negro puro.** Rick lo aprobó. Con negro el contorno se lo comía y desaparecía de noche.
- **Alana sigue en fucsia y "Mickey" queda como vestuario aparte.** Rick dio las dos opciones. De base, rojo con amarillo son los colores de los Dragones de Saigón y los equipos se confundirían.
- **Cuerpos distintos para Kenji, Ryu y Tetsu.** El pedido dice chibi normal, delgado y normal. Con el mismo cuerpo, Kenji y Tetsu compartían el 92 % de la silueta. Kenji quedó robusto (le va al "Toro"), Ryu alto y flaco (alto x1.04, piernas x1.08) y Tetsu bajo y flaco (alto x0.9). Probé Ryu más alto, pero a 32 el pelo en punta se salía de la celda. Se cambia en la ficha.
- **Letras y números enteros o nada.** Una letra a medias detrás de la barba se leía como otra cosa. Por eso a 48:
  - Rick lleva un parche dorado de frente, porque la barba no deja lugar a "GG".
  - Steph lleva una G.
  - Sophie y Alana llevan el parche.
  - A 64, Rick lleva "GG" completo.
- **`numero` en el manifiesto.** De espalda el pelo largo de Steph, Sophie y Alana tapa el número, así que el juego lo puede mostrar en el HUD.
- **La mascota sale siempre en atlas** (`animales/<id>.png + .json`), como pide el contrato 4.1, aunque el kit no se pida con `--atlas`.

## Límites honestos

- **"GG" a 48 no se ve completo en nadie.** El pecho de un chibi a 48 tiene 3 o 4 filas a la vista entre la barbilla y el pantalón, y los brazos tapan los costados. La identidad del equipo a 48 es el dorado: una G o el parche. Se lee completo a 64, en los retratos grandes y en el tablero. Si "GG" tiene que verse en el juego a 48, la alternativa es ponerlo en el HUD o en la pantalla de selección.
- **Número de espalda:** solo se ve en Rick. El pelo de las tres lo tapa, y por eso va `numero` en el manifiesto.
- **Kenji y Tetsu:** siguen siendo los más parecidos del Instituto (0,84 de silueta, de lado). Se distinguen por el pelo, los lentes, el ancho y la altura. Si en el juego se confunden, conviene que Tetsu cargue algo (un pote, su arma) en las pantallas de equipo.
- **Gakuran de lado:** el cuello alto no se ve, porque la barbilla del chibi lo tapa. Se nota de frente por la fila oscura bajo la cara.
- **Goro sin mangas:** a 64 se le ven los brazos de piel. A 32 o 48 no se exporta, porque va en su celda.

## Lo que necesita el siguiente lote

- **G1 fuentes** e **I inicial** no dependen de esto.
- **C2** (equipos nacionales) puede usar lo mismo: `armband`, `chestText`, `cell` para los gigantes (Don Hernando) y el vestuario por pack. Le faltan las prendas del catálogo C4 (ruana, bata de casa, guayabera, nón lá...).
- **C5** (burlas por equipo) y **B7** (`comb_hair` del Instituto) quedan pendientes.
- **Para el juego:**
  - Leer `numero` para el HUD.
  - Usar `celda` y `pivote` por atleta (Goro en 64).
  - Cargar la mascota desde `animales` del manifiesto.
