# Lote E6: los escenarios de las seis pruebas que seguían pintadas por código
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/36
Fecha: 2026-10-14

## Qué se hizo

Seis escenarios nuevos, uno por prueba, y la palenquera de Cartagena como NPC del kit. Cada uno sale de las constantes de su archivo del juego. Antes de pintar leí los seis y todas las medidas calzaron.

- **`cocora`** para `Vallas.ts`: el valle de Cocora en la mañana con neblina, de lado. Mundo de 1720. Estilo nuevo `colombia_cafetera`.
- **`halong`** para `Natacion.ts`: la bahía de Hạ Long al mediodía, de lado. Mundo de 1460. Estilo nuevo `vietnam_bahia`.
- **`llanos_apure`** para `Jabalina.ts`: los Llanos de Apure al atardecer, de lado. Mundo de 1560. Estilo nuevo `venezuela_llano`.
- **`barrio_caracas`** para `Chapita.ts`: una calle de barrio de Caracas en la tarde, de lado. Mundo de 900. Estilo nuevo `venezuela_barrio`.
- **`liceo_patio`** para `Quemado.ts`: el patio techado de un liceo de Caracas al mediodía, en la vista inclinada de 0.35. 640 de ancho. Estilo nuevo `venezuela_liceo`.
- **`cartagena`** para `Azoteas.ts`: las azoteas de la ciudad amurallada al atardecer, de lado. Mundo de 880. Estilo nuevo `colombia_amurallada`.
- **`palenquera`**: el NPC con `pregonar` y `reclamar`, con el pañuelo y la ponchera de frutas (gorro nuevo `ponchera`).

Los seis entran por el registro de lugares (`lugares.ts`), cada uno en su archivo (`cocora.ts`, `halong.ts`, `llanos.ts`, `barrio.ts`, `liceo.ts`, `cartagena.ts`), con su paleta de 24 colores elegida por el fondo.

**`cocora`, las Vallas del Café:**

| Capa | Qué lleva |
|---|---|
| Lejos (`cordillera_cocora`) | La cordillera en planos que se aclaran en la neblina, con palmas de cera chiquitas en la loma |
| Fondo (`valle_cocora`) | <ul><li>Las palmas de cera altísimas, con la copa entre las filas 136 y 152 para que se vea con el zoom 1.5.</li><li>La finca de Salento con el balcón de colores y el cafetal.</li><li>El Willys cargado de café, las vacas y la cerca de alambre.</li><li>El letrero de madera VALLE DE COCORA, SALENTO, QUINDÍO.</li></ul> |
| Piso | La pista de tartán con las rayas en y 0, 28, 56, 84 y 112, la salida en x 120 y la meta a cuadros en x 1570. Adelante, el pasto con matas de café |
| Vida | `neblina`, `vacas` y `loros` |
| Luces | Ninguna: es de mañana |

**`halong`, la Natación:**

| Capa | Qué lleva |
|---|---|
| Lejos (`islotes_halong`) | Los islotes de piedra caliza en la calima, uno detrás del otro, cada vez más claros |
| Fondo (`bahia_halong`) | <ul><li>El agua esmeralda con los islotes grandes y su monte.</li><li>Un junco de velas y la aldea flotante.</li><li>El muelle de atrás de la piscina con las banderas de Vietnam, el letrero VỊNH HẠ LONG, la silla del salvavidas y la mesa de los jueces.</li></ul> |
| Piso | La piscina flotante: el agua de y 2 a y 110, las corcheras rojas y blancas en y 36, 62 y 88, la marca de 15 m en x 492 y la pared de llegada a cuadros en x 1360. Adelante sigue la bahía |
| Vida | `banderas`, `publico`, `juncos` y `gaviotas` |
| Luces | Ninguna: es mediodía |

**`llanos_apure`, la Jabalina Llanera:**

| Capa | Qué lleva |
|---|---|
| Lejos (`horizonte_llano`) | El horizonte plano con las matas y los morichales chiquitos contra el sol que se pone |
| Fondo (`morichal_apure`) | <ul><li>La sabana dorada con los morichales.</li><li>El caney de palma con los chinchorros y su farol.</li><li>El estero con los chigüires, el ganado con el llanero a caballo y la tranquera del hato.</li><li>El letrero LLANOS DE APURE.</li></ul> |
| Piso | La pista de impulso de tartán de y 60 a y 76 hasta la raya de foul en x 380, el carril de carrera en y 70 y el sector de caída con una marca cada 100 px (10 m) desde el foul |
| Vida | `estero`, `ganado`, `garzas` y `corocoras` |
| Luces | El farol del caney |

**`barrio_caracas`, la Chapita:**

| Capa | Qué lleva |
|---|---|
| Lejos (`avila_tarde`) | El Ávila con el hotel Humboldt arriba |
| Fondo (`calle_barrio_caracas`) | <ul><li>Los ranchos de ladrillo y bloque que suben por el cerro, con sus escaleras y tanques.</li><li>La fila de casas con sus rejas y la gente en las puertas.</li><li>El ABASTO EL PANA, el mango y el poste con el enredo de cables.</li></ul> |
| Piso | El asfalto gastado con el home de tiza en x 94 a 116 y la marca del pitcher en x 326 a 334. Los pies en la fila 316 |
| Objetos | `casa_vecino` (de x 640 a 810, con la ventana, el tanque, HIELITOS y A 1 BS) y `ventana_rota` (la misma ventana rota, encima) |
| Vida | `ropa_tendida`, `vecinos`, `perro` y `zamuros` |
| Luces | Ninguna: es de tarde |

**`liceo_patio`, el Quemado:**

| Capa | Qué lleva |
|---|---|
| Lejos (`avila_mediodia`) | El Ávila al mediodía, que se asoma por la abertura entre el techo y el edificio |
| Fondo (`patio_liceo_caracas`) | <ul><li>El techo de láminas con las cerchas azules y las lámparas.</li><li>El edificio de las aulas con las ventanas de romanilla, la franja azul y el letrero U.E. LICEO EL ÁVILA en x 270, fila 75, donde lo escribía el juego.</li><li>La bandera, la cartelera y el mural ESTUDIAR ES CRECER.</li><li>Las gradas con los liceístas a la izquierda y la CANTINA a la derecha (el letrero en x 595, fila 113).</li><li>Los pilares en x 22, 436 y 626.</li></ul> |
| Piso | La cancha pintada (FT 214, PROF 100): el borde de x 40 a 560, la raya del medio amarilla en x 300 con su círculo y los dos cementerios rayados |
| Vida | `publico`, `cantina` y `bandera` |
| Luces | Las cuatro lámparas del techo |

**`cartagena`, las Azoteas:**

| Capa | Qué lleva |
|---|---|
| Lejos (`bahia_cartagena`) | La bahía con Bocagrande, La Popa, el Castillo de San Felipe y el sol que se pone en el mar |
| Fondo (`azoteas_cartagena`) | <ul><li>Los techos de teja de la ciudad vieja con la Torre del Reloj, la catedral y las palmas.</li><li>El edificio de salida: la azotea de baldosas de barro (filas 250 a 262), la cajita roja de la garrocha en x 428 y la raya blanca del borde en x 440.</li><li>Las fachadas de colores con los balcones de madera y las buganvillas que se derraman, y la placa de azulejo C. DE LAS DAMAS.</li><li>El callejón con el farol, dos ventanas prendidas y la ropa tendida.</li></ul> |
| Piso | La calle de adoquín, con la fila 352 (CALLE) como carril |
| Objetos | `techo_enfrente` (los 420 de la azotea de enfrente con la colchoneta azul y el balcón de buganvillas que sale 16 px al hueco) y `carrito_frutas` (la carreta con las frutas y la sombrilla) |
| Vida | `alcatraces` y `veleros` |
| Luces | El farol del callejón y las dos ventanas. Partículas: los pétalos de buganvilla que se lleva la brisa |

**La palenquera:**

| | |
|---|---|
| Ficha | `docs/ejemplos/nekketsu/npc/palenquera.ficha.json`: piel morena, trenzas, el pañuelo rojo con pepitas y la ponchera de aluminio con mangos, banano, patilla, guayabas y limones (`hat: "ponchera"`). La blusa amarilla con la franja azul y la falda roja |
| `pregonar` | `llamar` del motor, de frente, con la mano arriba y la campanita del pack `calle` |
| `reclamar` | `reclama` del motor, de frente, con los brazos abiertos: lo que hace cuando un atleta le cae al lado |
| En el kit | `npc/palenquera.png`, 48 x 48 por cuadro, ancla [24, 46]. La ponchera cabe entera en la celda |

**Motor, todo general:**
- **El gorro propio `ponchera`:** el pañuelo y la ponchera con frutas, de frente, de lado y de espalda. `hatColor` es el color del pañuelo.
- **`postal()` redondea la posición de los actores.** Un actor en una x con decimales descuadraba los canales de color y salía teñido. Lo encontré armando los GIF de este lote.
- Los escenarios de antes salen igual: sus imágenes doradas (`lugares_e5`, `npc_c6a` y las demás) no cambiaron.

## Cómo se usa (estudio y kit)

Los layouts van en `docs/ejemplos/nekketsu/escenarios/`: `cocora`, `halong`, `llanos_apure`, `barrio_caracas`, `liceo_patio` y `cartagena`. El kit a medida los genera con los demás (ahora son 21) y uno solo sale así:

```
npm run escenario -- docs/ejemplos/nekketsu/escenarios/cartagena.layout.json salida/ --postales --ficha
```

**Las medidas salen de cada archivo del juego:**

| Escenario | Vista | Franja | Por qué |
|---|---|---|---|
| `cocora` | lado | 228 a 348 | `TOP` 228 y `LANES` 18, 46, 74 y 102 de `Vallas.ts`. Mundo de 1720 |
| `halong` | lado | 226 a 346 | `TOP` 226 y `LANES` 24, 50, 76 y 102 de `Natacion.ts` (la superficie del agua de cada carril). Mundo de 1460 |
| `llanos_apure` | lado | 226 a 346 | `TOP` 226, la carrera en `TOP + 70` y `FOUL` 380 de `Jabalina.ts`. Mundo de 1560 |
| `barrio_caracas` | lado | 296 a 336 | `PISO` 316, `CASA_X` 640, `CASA_W` 170, `CASA_H` 100 y `VENTANA` de `Chapita.ts`. Mundo de 900 |
| `liceo_patio` | inclinada 0.35 | 214 a 314 | `FT` 214 y `PROF` 100 de `Quemado.ts`. 640 de ancho |
| `cartagena` | lado | 340 a 360 | `TECHO` 262, `BORDE` 440, `CAJA` 428 y `CALLE` 352 de `Azoteas.ts`. Mundo de 880 |

**Lo que tiene que conectar el juego en cada prueba:**
- **En las seis:** `queueEscenario(this, '<id>')` en el preload y `this.escenario('<id>', respaldo)` en `create()`. En las cinco de lado el fondo de hoy es `this.fondo('bg_…')` con `this.bg.tilePositionX` en el `update()`: con arte, eso se salta (el arte trae su cielo y su capa lejos con paralaje).
- **Vallas (`Vallas.ts`):** sobra la textura `pista` (el arte trae la pista, las rayas, la salida y la meta). Se quedan las vallas, los números de los carriles y las cabecitas.
- **Natación (`Natacion.ts`):** sobra la textura `piscina`. Se quedan los poyetes, los números, el agua de adelante de cada carril (el `fillRect` con alfa que tapa el cuerpo del nadador) y las cabecitas.
- **Jabalina (`Jabalina.ts`):** sobra la textura `campo`. Se quedan los metros (`bitmapText` en `TOP + 112`), la jabalina y las banderitas del viento.
- **Chapita (`Chapita.ts`):** sobran `chap_casa`, el `bitmapText` de HIELITOS y `chap_vidrio_roto`. La casa y la ventana rota vienen en `objetos.json`: `casa_vecino` en (640, 200) y `ventana_rota` en (646, 252). La ventana rota se muestra con `setVisible(true)` en `ventana()`, igual que hoy `this.vidrio`. La señora Carmen y `chap_caja` se quedan.
- **Quemado (`Quemado.ts`):** sobran `bg_liceo`, los dos `bitmapText` de U.E. LICEO EL ÁVILA y CANTINA y `cancha()`: el arte trae los letreros en el mismo sitio y la cancha con sus rayas. Si el juego necesita la raya del medio para la lógica, la constante se queda.
- **Azoteas (`Azoteas.ts`):** sobran `cart_calle`, `cart_callejon`, `cart_salida`, `cart_enfrente`, `cart_balcon`, `cart_carrito` y `cart_palenquera`.
  - El techo de enfrente viene en `objetos.json` como `techo_enfrente`, con el balcón incluido: va en el contenedor `this.enfrente` en (-16, 0), igual que hoy el balcón.
  - El carrito es `carrito_frutas`: se sigue moviendo a `x - 15`, con el ancla abajo en el medio.
  - La palenquera es `npc_palenquera` del kit en `BORDE - 8`: `pregonar` mientras saltan y `reclamar` cuando uno le cae al lado, con el globo de ¡AY, MIJO! de hoy.
  - Los metros (`bitmapText` en `TECHO - 6`) y las banderitas se quedan.

**En el kit:**
- El kit a medida saca los seis solos de `escenarios/`. Cocora, Hạ Long y Apure traen 11 PNG cada uno (pasan de 1280 de ancho y la capa cerca, el piso y el frente van en dos trozos). El barrio, el liceo y Cartagena traen 8.
- La palenquera sale en `npc/palenquera.png` con la sección `npc` del ejemplo:

```json
"palenquera": { "anims": { "pregonar": "llamar", "reclamar": "reclama" } }
```

## Pruebas

- **Prueba nueva `e6.test.ts`, 15 casos:**
  - Los seis pasan las 9 pruebas, sin avisos, con su estilo, su hora, su paleta de 24 colores distintos (y los 24 usados), sus íconos, sus letreros y su vida. El registro trae los seis al final, en ese orden.
  - Cada lugar nuevo trae su paleta por su fondo, y las de Caracas, la Comuna 13 y Vietnam no cambian.
  - A otra hora, cada uno queda pendiente y dice qué hora pinta.
  - Los cinco de lado van sin inclinar y con el ancho de su prueba, con el piso pintado entero. El liceo va inclinado a 0.35.
  - Cocora calza con `Vallas.ts`: TOP 228, los cuatro carriles, las cinco rayas de punta a punta, ningún carril encima de una raya, la salida y la meta a cuadros, y las copas de las palmas dentro de la cámara.
  - Hạ Long calza con `Natacion.ts`: TOP 226, cada carril entre dos corcheras, las corcheras rojas y blancas, la marca de 15 m, la pared a cuadros y el agua sin un pixel de tinta.
  - Apure calza con `Jabalina.ts`: la pista de tartán con sus bordes hasta x 380, la raya de foul, nada de tartán después del foul y la marca cada 100 px.
  - El barrio calza con `Chapita.ts`: la casa en (640, 200) con su base en la fila 316, la ventana rota en la caja de `VENTANA`, encima de la sana, y el home de tiza.
  - El liceo calza con `Quemado.ts`: la raya del medio amarilla, los dos cementerios, el techo y las cuatro lámparas.
  - Cartagena calza con `Azoteas.ts`: la cajita roja en x 428, la raya blanca del borde en x 440, el techo de enfrente 16 px antes de su x con la colchoneta, el carrito centrado en x - 15 y apoyado en la calle, y la palenquera en x 432.
  - La vida que va sobre lo pintado tapa entero: el cuadro 0 calza con la capa cerca y los demás cambian.
  - Un actor en una x con decimales sale igual que en la x redondeada.
  - El peso: luces, vida y objetos sin pasarse. Cocora y Hạ Long sin luces.
  - La palenquera: `pregonar` y `reclamar`, la fila de arriba de la celda libre en todos los cuadros (la ponchera cabe) y la ponchera más ancha que la cabeza en las tres direcciones.
  - Imágenes doradas `golden/lugares_e6.png` (los seis a los 2 segundos) y `golden/npc_e6.png` (la tira de la palenquera).
- **Pruebas que tuve que tocar:**
  - `e5.test.ts`: el registro ahora trae más lugares. La prueba mira los cuatro de E5.
  - `calle.test.ts`: la palenquera va en la sección `npc`. Su imagen dorada `npc_c6a` sigue igual: la palenquera tiene la suya.
  - `equipos.test.ts`: los gorros propios son 8.
  - `custom.test.ts`: el kit trae 21 escenarios, con la franja, el largo y la vista de los seis nuevos, y 58 PNG más (Cocora, Hạ Long y Apure 11 cada uno, los otros tres 8 y la palenquera).
- **La suite sin `custom.test.ts`:** 41 archivos, 436 de 436.
- **`custom.test.ts`: 14 de 15.** Falla `se genera en menos de 5 minutos`: el kit tardó 364 s. **No es de este lote:** en esta máquina, hoy, `main` sin E6 tarda 327 s (lo medí con la máquina libre), y con E6 339 s. Los seis escenarios y la palenquera suman unos 12 s. El grueso son los atletas (210 s) y el audio (51 s). No subí el límite de 300 s: es tuyo. Para correr el resto de los casos le subí el corte del `beforeAll` en una copia local, que no va en el PR.
- **`tsc` limpio y `npm run build:sitio` limpio:** el kit del sitio sale con los seis nuevos, cada uno con sus 9 pruebas en verde.
- **e2e de Playwright: 50 de 50.**

**Las 9 pruebas** (en cada `verificacion.md`):
- **Legibilidad**, contraste mediano y el peor (mínimo 2:1):
  - `cocora`: 4.1:1 y 3.9:1, sobre el tartán.
  - `halong`: 4.6:1 y 3.3:1, sobre el agua de la piscina.
  - `llanos_apure`: 5.8:1 y 5.4:1.
  - `barrio_caracas`: 5.4:1 y 3.1:1.
  - `liceo_patio`: 6.3:1 y 4.5:1.
  - `cartagena`: 4.9:1 y 2.9:1. El callejón estaba en 1.8:1 detrás de la palenquera y lo aclaré con el resplandor del farol.
- **Peso, en la pantalla más cargada:** 0, 0, 1, 0, 4 y 3 luces (máx 12), 7, 8, 4, 5, 3 y 5 piezas animadas (máx 16) y 0, 0, 0, 2, 0 y 2 objetos.
- **Paleta:** los 24 colores en los seis.

## Para aprobar (todo en esta carpeta)

- `mismo_juego.png`: el hẻm aprobado al lado de los seis, enteros a los 2 segundos.
- `camara_del_juego.png`: lo que ve la cámara de cada prueba con atletas del kit (zoom 1.5 en vallas, natación, jabalina y azoteas, 1.2 en la chapita y 1 en el quemado).
- `cocora_vallas.gif`, 6 segundos: los cuatro salen de los tacos y pasan las vallas por su carril. La cámara sigue al que va adelante, pasa el letrero y llega a la finca.
- `halong_natacion.gif`, 6 segundos: se tiran del poyete y nadan crol, con el agua de adelante tapándoles el cuerpo como en el juego. Atrás, las banderas, el público y el junco.
- `llanos_apure_jabalina.gif`, 6 segundos: Rick corre por la pista de tartán, lanza en la raya de foul y la cámara sigue la jabalina por el sector, hasta el estero.
- `barrio_caracas_chapita.gif`, 6 segundos: Kenji lanza la chapita, Rick le pega con el palo de escoba y la manda contra la casa del vecino. La ventana se rompe (aparece el objeto `ventana_rota`).
- `liceo_patio_quemado.gif`, 6 segundos: Rick le tira la pelota a Kenji, que no la agarra y se va al cementerio.
- `cartagena_azoteas.gif`, 6 segundos: Rick corre por la azotea, clava la garrocha y cae en la colchoneta de enfrente. Kenji no llega, cae al lado del carrito y la palenquera pasa de pregonar a reclamar.
- `palenquera.png`: la tira de la palenquera al cuádruple, con `pregonar` y `reclamar`.
- Una carpeta por escenario con sus postales a 0, 2 y 4 segundos, la imagen ampliada al doble, `ficha_arte.md` y `verificacion.md`.

## Decisiones que tomé sin preguntar

1. **Los ids de los layouts son los que pidió el juego:** `cocora`, `halong`, `llanos_apure`, `barrio_caracas`, `liceo_patio` y `cartagena`.
2. **Las horas:** Cocora de mañana con neblina, que es cuando se ve el valle. Hạ Long y el liceo al mediodía. El barrio en la tarde. Apure y Cartagena al atardecer, como pidió el juego para Cartagena y porque el llano al atardecer es lo que más se reconoce.
3. **Lo que se mueve en la partida va aparte.** La casa del vecino y la ventana rota de la Chapita, y el techo de enfrente y el carrito de las Azoteas, van como objetos, porque el juego los muestra, los esconde o los corre cada ronda. Pintados en el fondo no se podrían mover.
4. **El balcón va dentro del techo de enfrente.** En el juego es otra imagen dentro del mismo contenedor, siempre en (-16, 38). Juntarlos ahorra una pieza y no cambia nada.
5. **En Quemado el arte trae los dos letreros que el juego escribía con `bitmapText`.** Así la letra es la de los letreros del arte, del mismo tamaño y en el mismo sitio.
6. **Moví los pilares del liceo a x 22, 436 y 626.** En x 330 tapaban el letrero del liceo.
7. **La palenquera es un gorro propio nuevo** (`ponchera`), como la Marimonda: las frutas y la ponchera salen del tamaño justo para la celda de 48 y cualquier ficha la puede usar.
8. **`pregonar` usa `llamar` y `reclamar` usa `reclama`.** No hice animaciones nuevas: `llamar` ya tiene la mano arriba y `reclama` los brazos abiertos.
9. **La placa C. DE LAS DAMAS** es la calle de verdad de la ciudad amurallada, en la placa de azulejo blanca y azul como las de allá.
10. **Los letreros son reales y sin marcas:** VALLE DE COCORA, SALENTO, QUINDÍO, VỊNH HẠ LONG, LLANOS DE APURE, ABASTO EL PANA, HIELITOS A 1 BS, U.E. LICEO EL ÁVILA, CANTINA, CARTELERA y ESTUDIAR ES CRECER.

## Límites honestos

- **Una sola hora por escenario.** A otra hora el generador dice qué hora pinta y no sale.
- **Cada uno está medido para el ancho de su prueba.** Un layout más largo con el mismo fondo no está probado.
- **El agua de adelante de la natación la sigue poniendo el juego.** El arte no puede tapar al nadador hasta la cintura, porque va detrás.
- **En la chapita y las azoteas el juego tiene que mover los objetos.** Si los deja quietos, el techo de enfrente se queda a 5 m y el carrito no lo sigue.
- **`pregonar` trae la campanita de `llamar`.** En la mano de la palenquera se lee como una tajada de fruta amarilla. Si no gusta, se cambia a otra animación en `kit.config.json` sin tocar el motor.
- **Los GIF son una simulación** con los atletas del kit sobre el arte y la cámara de cada prueba. Las vallas, el agua de adelante y la jabalina los dibujé como los pinta el juego, pero el movimiento no es el del juego.

## Lo que necesita el siguiente lote

- Del juego: conectar los seis escenarios y la palenquera, como dice arriba.
- Lo que sigue en audio, como pidió el juego: los efectos de chapuzón, brazada, salida de natación y garrocha.
