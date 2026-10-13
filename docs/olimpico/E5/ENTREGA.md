# Lote E5: los escenarios de los cuatro deportes de pelota y la Marimonda
Estado: entregado, pendiente de Rick
PR: (se completa al abrirlo)
Fecha: 2026-10-13

## Qué se hizo

Cuatro escenarios nuevos para Vóley Playa, Tenis de dobles, Fútbol Callejero y Básquet 3x3, y la Marimonda del Carnaval como NPC del kit:

- **`margarita`**: Playa El Agua, isla de Margarita, al mediodía, de lado. Estilo nuevo `venezuela_playa`.
- **`dalat`**: una cancha de tenis de arcilla entre pinos de Đà Lạt, en la mañana con neblina, de lado. Estilo nuevo `vietnam_montana`.
- **`barranquilla`**: una calle del Carnaval de Barranquilla al mediodía, en la vista inclinada (0.35), con los arcos de piedra. Estilo nuevo `colombia_caribe`.
- **`cancha_maracaibo`**: una cancha de barrio de Maracaibo de noche, en la vista inclinada, con el puente General Rafael Urdaneta y el relámpago del Catatumbo. Estilo nuevo `venezuela_lago`.
- **`marimonda`**: el NPC con `caminar` (de lado) y `bailar` (de frente), con la trompa y las orejotas que se leen en la celda de 48.

Los cuatro entran por el registro de lugares de E4a (`lugares.ts`): cada uno en su archivo (`margarita.ts`, `dalat.ts`, `barranquilla.ts`, `maracaibo.ts`) con su fondo, su capa lejos, su piso, lo de abajo de la franja, sus marcas, su vida, sus luces y sus partículas. Los pinceles que comparten (palmas de coco, banderines, la malla de una cancha, la gente chiquita del fondo) van en `pinceles.ts`.

**`margarita`, Playa El Agua:**

| Capa | Qué lleva |
|---|---|
| Lejos (`mar_caribe_cerro`) | <ul><li>El mar Caribe, azul hondo en el horizonte (fila 186) y turquesa hacia la orilla, con rayitas de luz.</li><li>El cerro verde de la punta de la playa con la piedra que asoma y las casitas al pie.</li><li>El morro bajo de la izquierda con sus palmitas, un peñero y dos veleros.</li></ul> |
| Fondo (`playa_el_agua`) | <ul><li>La orilla: el agua bajita, la ola que se levanta y revienta, la espuma que sube por la arena y la arena mojada.</li><li>Cuatro palmas de coco con sus cocos. Ninguna toca la red.</li><li>Dos toldos a rayas con su gente, la silla plegable y la cava azul y blanca.</li><li>La churuata de las empanadas: techo de palma, mostrador EMPANADAS y COCO FRÍO, la vitrina, la nevera, los cocos con pitillo, la vendedora y la bandera de Venezuela con sus ocho estrellas.</li><li>El letrero de madera PLAYA EL AGUA, MARGARITA, una toalla con alguien tomando sol y una pelota de playa.</li></ul> |
| Piso | La arena con las ondas del viento y las huellas, y las cintas azules de la cancha donde `Voley.ts` pone sus rayas. Adelante sigue la arena, con un coco y conchas |
| Vida | `olas` (4 cuadros), `toldos_viento` (2), `vendedor_empanadas` (2) y `alcatraces` (los pelícanos que cruzan en la capa lejos) |
| Luces | Ninguna: es mediodía. Partículas: el brillo del sol en el agua y la espuma |

**`dalat`, la cancha de arcilla:**

| Capa | Qué lleva |
|---|---|
| Lejos (`lago_xuan_huong_pinos`) | <ul><li>La montaña casi borrada y las lomas cubiertas de pinos, cada plano más claro en la neblina.</li><li>La catedral del gallo (Nhà thờ Con Gà), rosada, con el gallo en la punta.</li><li>Una villa colonial francesa con el techo de teja empinado, la buhardilla y las chimeneas.</li><li>El lago Xuân Hương con su orilla, las casitas y un botecito de cisne.</li></ul> |
| Fondo (`cancha_arcilla_dalat`) | <ul><li>Dos pinos grandes de tronco rojizo y copa en racimos, y cuatro grises en la neblina.</li><li>El pasto con las hortensias azules y rosadas contra la malla.</li><li>La malla en rombos con sus parales (ninguno cae en la red) y la lona verde SÂN QUẦN VỢT ĐÀ LẠT.</li><li>La silla del juez al lado de la red, con el juez de gorra.</li><li>La banca con dos jugadores, el bolso de las raquetas y el cesto de pelotas.</li></ul> |
| Piso | La arcilla roja barrida en arcos, con las rayas blancas empolvadas donde las pone `Tenis.ts` y una deslizada. Adelante, el bordillo y el pasto con piñas |
| Vida | `neblina` (dos bandas que pasan delante de las lomas, en la capa lejos) y `publico` (los de la banca aplauden) |
| Luces | El sol de la mañana entre los pinos, con latido. Partículas: jirones de neblina y el polvo de arcilla |

**`barranquilla`, la calle del Carnaval:**

| Capa | Qué lleva |
|---|---|
| Lejos (`barranquilla_mediodia`) | Los edificios en la calima, el campanario de la catedral y las palmas |
| Fondo (`calle_carnaval_barranquilla`) | <ul><li>Tres casas del Barrio Abajo: la amarilla con la máscara de la Marimonda, la turquesa de dos pisos con el balcón corrido y la rosada con la máscara del Torito. Puertas altas en arco y ventanas de barrotes torneados.</li><li>Los dos palcos: la gradería de cuatro escalones llena de gente con sombrero vueltiao, los tubos, el techo de lona a rayas con los colores del Carnaval y el faldón.</li><li>El pendón CARNAVAL DE BARRANQUILLA con ¡QUIEN LO VIVE ES QUIEN LO GOZA!</li><li>Cinco guirnaldas de banderines cruzando la calle.</li><li>La comparsa en la acera: dos cumbiamberas de pollera y dos Congos de turbante de flores con el garabato.</li></ul> |
| Piso | La calle de asfalto con el confeti, las manchas de maicena, las serpentinas y las rayas de tiza de `Futbol.ts`. Adelante, el bordillo amarillo y negro y el andén |
| Objetos | `arco_piedra` en cada línea de gol, en dos objetos: la columna de piedras de atrás con la vara y las cintas de colores, y la columna de adelante |
| Vida | `publico` (los palcos), `guirnaldas` (una pieza por cuerda), `comparsa` (4 cuadros) y `confeti` (los papelitos que caen) |
| Luces | Ninguna: es mediodía. Partículas: el `confeti` del kit desde los palcos y los papelitos |

**`cancha_maracaibo`, la cancha de barrio:**

| Capa | Qué lleva |
|---|---|
| Lejos (`lago_puente_urdaneta`) | <ul><li>El puente General Rafael Urdaneta de punta a punta, con el tablero encendido y las seis torres del tramo atirantado con sus tirantes y la luz roja arriba.</li><li>La otra orilla encendida con los mechurrios.</li><li>Tres balancines petroleros con su luz roja.</li><li>El Lago oscuro con los reflejos que tiemblan.</li><li>La nube de tormenta del Catatumbo a la derecha, con su resplandor violeta.</li></ul> |
| Fondo (`cancha_barrio_maracaibo`) | <ul><li>La malla en rombos, por donde se ven el Lago y el puente.</li><li>El muro de bloques alumbrado, con la franja amarilla, azul y roja, CANCHA LA CHINITA, BARRIO SANTA LUCÍA y el mural del puente con el sol.</li><li>Tres postes con los bombillos de sodio y su halo.</li><li>La gradita de concreto con la gente.</li><li>Los gaiteros de sombrero: el furro, la tambora, la charrasca y el cuatro.</li></ul> |
| Piso | El concreto pintado: azul adentro de la media cancha, el área naranja, verde afuera, gastado, con la luz de los bombillos y las rayas de `Basket.ts` |
| Vida | `relampago` (8 cuadros: la nube se alumbra por dentro, cae el rayo, se apaga y vuelve a parpadear, solo donde la malla deja ver afuera), `gaiteros` (2) y `publico` (2) |
| Luces | Los seis bombillos de sodio y el resplandor del Catatumbo, que parpadea. Partículas: las polillas de los bombillos y el calor que sube del concreto |

**La Marimonda:**

| | |
|---|---|
| Ficha | `docs/ejemplos/nekketsu/npc/marimonda.ficha.json`: la máscara (`hat: "marimonda"`) con la capucha roja, las orejotas azules con el adentro amarillo, los tres huecos con su aro blanco y la trompa larga con anillos amarillos. El saco verde abierto, la camisa amarilla a rayas azules y el pantalón rojo |
| `caminar` | `walk` del motor, de lado (vista nueva `lado`), 8 cuadros a 10 fps. Mira a la derecha: el juego la espeja para ir a la izquierda, como hoy con `setFlipX` |
| `bailar` | `dance` del motor, de frente, 8 cuadros a 8 fps, con los brazos arriba |
| En el kit | `npc/marimonda.png`, 48 x 48 por cuadro, ancla [24, 46] |

**Motor, todo general:**
- **Lo que pinta un lugar por una entidad** (`objeto` en `Lugar`): un lugar puede pintar las entidades `objeto` del layout que conoce y sumarlas a `objetos.json` con `origen: "entidades"`. No es geometría: `colision.json` sigue siendo la del layout. Así salen los arcos de piedra, que no son cajas (la pelota pasa entre las columnas).
- **La paleta de Venezuela y la de Colombia se eligen también por el fondo**, como la de Vietnam desde E4a. Caracas de noche, la Comuna 13 y la cancha de tejo devuelven lo mismo de antes.
- **Un lugar del registro no refleja neones** en el piso. Ninguno de los de antes de noche era del registro.
- **La vista `lado` de los NPC:** de perfil, mirando a la derecha.
- **El gorro propio `marimonda`:** la máscara completa, de frente, de lado y de espalda. A los gorros propios ahora les llega el alto de la cabeza hasta la barbilla. Los de antes no lo usaban y salen igual.
- **Dos letras nuevas en los letreros:** `¡` y la coma.
- Los 11 escenarios de antes salen **idénticos byte a byte**, archivo por archivo, con postales y ficha.

## Cómo se usa (estudio y kit)

Los layouts van en `docs/ejemplos/nekketsu/escenarios/`: `margarita.layout.json`, `dalat.layout.json`, `barranquilla.layout.json` y `cancha_maracaibo.layout.json`. El kit a medida los genera con los demás (son 15 escenarios) y uno solo sale así:

```
npm run escenario -- docs/ejemplos/nekketsu/escenarios/barranquilla.layout.json salida/ --postales --ficha
```

**Las franjas salen de las medidas de cada prueba:**

| Escenario | Vista | Franja | Por qué |
|---|---|---|---|
| `margarita` | lado | 290 a 330 | `PISO` 310 de `Voley.ts`: sus filas 304 y 316 son los carriles 14 y 26. Las rayas en 298 y 322, de x 34 a 606 y de 28 a 612. La red en x 320 |
| `dalat` | lado | 290 a 330 | Igual en `Tenis.ts` |
| `barranquilla` | inclinada 0.35 | 212 a 316 | `FT` 212 y `PROF` 104 de `Futbol.ts`. Las líneas de gol en x 26 y 600, el medio en 313 |
| `cancha_maracaibo` | inclinada 0.35 | 212 a 316 | `FT` 212 y `PROF` 104 de `Basket.ts`. La media cancha de x 40 a 596, el aro en (566, 52) |

Los dos inclinados llevan los carriles 24, 52 y 80 solo para la prueba de legibilidad. El juego no los usa.

**Lo que tiene que conectar el juego en cada prueba:**
- **Vóley Playa (`Voley.ts`):**
  - En el preload, `queueEscenario(this, 'margarita')`.
  - En `create()`, `pintarEscenario(this, 'margarita', 5000)` en vez de `this.add.image(320, 180, 'bg_margarita')`. El zoom de 1.15 y la cámara quedan igual.
  - `cancha()`: la red se queda (el arte deja libre la columna de x 320). Las rayas pueden quedarse encima de las cintas azules pintadas, o quitarse y dejar las cintas.
  - En `update()`, cada cuadro, `arte.tick(dt, this.cameras.main.scrollX, () => false)`: las olas, los toldos, la vendedora y los alcatraces.
- **Tenis (`Tenis.ts`):**
  - `queueEscenario(this, 'dalat')` en el preload y `pintarEscenario(this, 'dalat', 5000)` en `create()` en vez de `bg_dalat`.
  - `cancha()`: la red se queda. Las rayas pintadas están en el mismo sitio que las del juego: puede quitar las suyas o dejarlas encima.
  - `arte.tick(...)` en `update()`: la neblina y los de la banca.
- **Fútbol Callejero (`Futbol.ts`):**
  - `queueEscenario(this, 'barranquilla')` y `pintarEscenario(this, 'barranquilla', 5000)` en `create()` en vez de `bg_barranquilla`.
  - `cancha()`: las rayas de tiza ya están pintadas donde las pone el juego. Los arcos de piedra vienen en `objetos.json`, así que hay que quitar el bucle `for (const x of GOL)` que los dibuja. Cada arco son dos objetos: la columna de atrás con la vara (`orden` 35, `setDepth(FT + 35)`) y la de adelante (`orden` 71, igual que la profundidad de hoy). Así el arquero que se mete entre las dos queda delante de la de atrás y detrás de la de adelante.
  - `texturas()`: la textura `marimonda` pintada por código se cambia por la tira del kit `npc_marimonda`.
  - `moverMarimonda()` y `pintar()`: mientras cruza, `npc_marimonda_caminar` con `setFlipX(m.vx < 0)` y el ancla [24, 46] en `(sx(m.x, m.y), FT + m.y)`. El rebote de 3 px de hoy ya no hace falta: la caminata trae su paso. Cuando el juego quiera que baile (al gol, o parada a mitad de cruce), `npc_marimonda_bailar`.
  - `arte.tick(...)` en `update()`: los palcos, las guirnaldas y la comparsa. El confeti de `particulas.json` usa el efecto `confeti` del kit.
- **Básquet 3x3 (`Basket.ts`):**
  - `queueEscenario(this, 'cancha_maracaibo')` y `pintarEscenario(this, 'cancha_maracaibo', 5000)` en `create()` en vez de `bg_cancha_maracaibo`.
  - `cancha()`: el piso ya viene pintado (azul, el área naranja y las rayas), así que sobra el relleno azul y el naranja con alfa. Las rayas pueden quedarse.
  - `dibujarTablero()` se queda: el aro, el tablero y el poste los dibuja el juego, que los rompe con la clavada Nekketsu.
  - `relampago()` se queda: el `rayo_catatumbo` y el destello de la cámara van encima de la vida del relámpago, que parpadea sola en la nube del fondo cada 2 segundos.
  - `arte.tick(...)` en `update()`: el relámpago, los gaiteros y la gradita.

**En el kit:**
- El kit a medida saca los cuatro solos de `escenarios/`. Cada uno trae 8 PNG.
- La Marimonda sale en `npc/marimonda.png` con la sección `npc` del ejemplo:

```json
"marimonda": { "anims": { "caminar": "walk", "bailar": "dance" }, "vistas": { "caminar": "lado" } }
```

  La ficha va en la carpeta de `npc.fichas`, con las de la Comuna 13.

## Pruebas

- **Prueba nueva `e5.test.ts`, 11 casos:**
  - Los cuatro pasan las 9 pruebas, sin avisos, con su estilo, su hora, su paleta de 24 colores distintos (y los 24 usados), sus íconos, sus letreros y su vida.
  - Las otras horas no cambian: Caracas de noche, la Comuna 13, la cancha de tejo y las horas de Vietnam devuelven la misma paleta de antes. Cada lugar nuevo trae la suya por su fondo.
  - A otra hora, cada lugar nuevo queda pendiente y dice qué hora pinta.
  - Margarita y Đà Lạt calzan con `Voley.ts` y `Tenis.ts`: los carriles en las filas 304 y 316, las rayas en 298 y 322 y nada oscuro en la columna de la red. El piso llega a la fila 360 y el frente va libre.
  - Barranquilla calza con `Futbol.ts`: las rayas de tiza, los cuatro objetos de los arcos con su `orden`, la columna parada en su pie, la vara que cruza y la colisión sin los arcos.
  - Maracaibo calza con `Basket.ts`: la cancha azul, el área naranja, el verde de afuera y las rayas. El relámpago está apagado en el cuadro 0, prendido en el 5 y solo donde se ve afuera. El piso no refleja neones.
  - La vida que va sobre lo pintado tapa entero: el cuadro 0 calza con la capa cerca y los demás cambian.
  - De día no hay luces. Las postales van a 0, 2 y 4 segundos.
  - La Marimonda: `caminar` de lado y `bailar` de frente. De frente las orejotas hacen la cabeza más ancha que el cuerpo por más de 12 px. De lado la trompa sale más allá de las piernas.
  - Imagen dorada `golden/lugares_e5.png`: los cuatro a los 2 segundos.
  - Imagen dorada `golden/npc_e5.png`: la tira de la Marimonda.
- **Comparación byte a byte:** los 11 escenarios que ya estaban salen idénticos, archivo por archivo, con postales y ficha.
- **Pruebas que tuve que tocar:**
  - `e4a.test.ts`: el registro ahora trae más lugares. La prueba mira los tres primeros.
  - `calle.test.ts`: la Marimonda va en la sección `npc` con `anims` como objeto y vista `lado`. Su imagen dorada `npc_c6a` sigue igual: la Marimonda tiene la suya.
  - `equipos.test.ts`: los gorros propios son 7.
- **Las pruebas de escenarios, de los NPC y de los gorros** (`e4a`, `hoian`, `caracas`, `comuna13`, `oblique`, `vehiculos`, `e5`, `calle` y `equipos`): 110 de 110. En una corrida anterior, con otros agentes cargando la máquina, un caso de `comuna13` se pasó del tiempo (32 s). Solo pasó, y en la corrida final también.
- **`custom.test.ts`:** el kit de Nekketsu trae 15 escenarios y 543 PNG (los 4 nuevos con 8 cada uno y la Marimonda). 15 de 15, en 187 s las dos veces que lo corrí, por debajo de los 5 minutos.
- **El resto de la suite:** 35 archivos, 365 de 365, en 6 minutos. Con `custom.test.ts`, 380 de 380.
- **`tsc` limpio y `npm run build:sitio` limpio:** el kit del sitio sale con `margarita`, `dalat`, `barranquilla` y `cancha_maracaibo`, cada uno con sus 9 pruebas en verde.
- **Suite completa: 36 archivos, 380 de 380, y e2e de Playwright 50 de 50.**

**Las 9 pruebas** (en cada `verificacion.md`):
- **Legibilidad:**
  - `margarita`: contraste mediano 14.3:1, el peor 14.3:1. Detrás de los atletas está la arena clara.
  - `dalat`: mediano 3.8:1, el peor 3.7:1, delante de la malla y las hortensias.
  - `barranquilla`: mediano 4.1:1, el peor 4.0:1, sobre el asfalto.
  - `cancha_maracaibo`: mediano 4.1:1, el peor 3.5:1, sobre la cancha azul de noche.
- **Peso, en la pantalla:** 0, 2, 0 y 7 luces (máx 12), 6, 3, 9 y 3 piezas animadas (máx 16) y 0, 0, 4 y 0 objetos.
- **Paleta:** los 24 colores en los cuatro.

## Para aprobar (todo en esta carpeta)

- `mismo_juego.png`: el hẻm aprobado al lado de los cuatro, con atletas del kit.
- `camara_del_juego.png`: lo que ve la cámara de cada prueba (vóley y tenis con zoom 1.15, fútbol y básquet con zoom 1).
- `margarita_voley.gif`, 6 segundos:
  - Kenji saca desde el fondo, Rick la levanta con el puño, Sophie salta pegada a la red y remata.
  - Alana corre y no llega.
  - Se ven las olas, los toldos y la vendedora de empanadas.
- `dalat_tenis.gif`, 6 segundos:
  - Kenji saca, la pelota pica y Rick le pega el drive. Alana devuelve con un globo, Sophie salta y hace el smash.
  - Se ven los jugadores de la banca y el juez en su silla.
- `barranquilla_futbol.gif`, 6 segundos:
  - Sophie se lleva el balón, Kenji se tira en barrida y no llega, Sophie le pega al arco de piedra de la derecha y Alana, de arquera, no llega.
  - La Marimonda cruza la calle por detrás caminando de lado y se queda bailando.
  - Se ven los palcos, las guirnaldas, la comparsa y el confeti.
- `cancha_maracaibo_basket.gif`, 6 segundos:
  - Rick bota hacia el aro, Kenji lo empuja y no lo tumba, Rick salta y la clava.
  - El relámpago del Catatumbo parpadea en la nube del fondo y los gaiteros tocan.
- `marimonda.png`: la tira de la Marimonda al cuádruple, con `caminar` y `bailar`.
- Una carpeta por escenario (`margarita/`, `dalat/`, `barranquilla/`, `cancha_maracaibo/`) con sus postales a 0, 2 y 4 segundos, la imagen ampliada al doble, `ficha_arte.md` y `verificacion.md`.

## Decisiones que tomé sin preguntar

1. **Los ids son los de Rick y del juego:** `margarita`, `dalat`, `barranquilla` y `cancha_maracaibo` (el PEDIDO decía `maracaibo`, y el juego ya carga `bg_cancha_maracaibo`).
2. **Las horas:** Margarita y Barranquilla al mediodía y Maracaibo de noche, como el PEDIDO. Đà Lạt no está en el PEDIDO: la puse de mañana con neblina, que es como más se reconoce la ciudad.
3. **El juego no tenía medidas nuevas en `ESTADO.md`.** Saqué todo de `Voley.ts`, `Tenis.ts`, `Futbol.ts` y `Basket.ts` (ver la tabla de arriba). No cambié nada de lo que el juego usa.
4. **Las redes y el aro los sigue dibujando el juego.** El aro se rompe con la clavada Nekketsu y las redes tienen su malla de profundidad. El arte deja libre la columna de la red.
5. **Las rayas de las canchas van pintadas en el mismo sitio que las del juego.** En Margarita son cintas azules, como las del vóley playa de verdad, en Đà Lạt blancas empolvadas de arcilla y en Barranquilla de tiza.
6. **"Arcos de piedra" es la portería.** En Colombia el arco es el arco del fútbol, y el juego los dibuja con dos columnas y la vara de arriba en las líneas de gol. Los pinté así: columnas de piedras apiladas y una vara de madera amarrada con cintas de colores, en la misma geometría.
7. **Los arcos son entidades `objeto` del layout que pinta el lugar**, no cajas: una caja sería geometría y taparía el arco. Cada arco va en dos objetos para que el arquero quede entre las columnas.
8. **La Marimonda es un gorro propio nuevo** (`marimonda`), dibujado con código como el nón lá o el vueltiao: así la trompa y las orejotas salen del tamaño justo en cada dirección y cualquier ficha la puede usar. La capucha es roja por defecto (`hatColor` la cambia), las orejas azules con el adentro amarillo y la trompa con anillos amarillos, como la máscara que cuelga en la casa amarilla de Barranquilla.
9. **`bailar` usa `dance` del motor y `caminar` usa `walk`.** No hice una animación nueva: `dance` ya tiene los brazos arriba y el cuerpo que se mece, que es como baila la Marimonda en la calle.
10. **`caminar` va de lado (vista nueva `lado`).** La Marimonda cruza de un lado al otro, y de frente se vería caminando hacia la cámara. El juego ya la espeja con `setFlipX`.
11. **El relámpago del Catatumbo es vida del escenario** que parpadea sola en la nube, y alumbra solo los pixeles de la nube de la capa lejos. El juego sigue sumando el rayo grande y el destello de la cámara cada 9 a 18 segundos.
12. **El puente lleva las seis torres** de los cinco tramos atirantados, con su forma en A y los tirantes, y el tablero encendido de punta a punta.
13. **Los letreros son reales y sin marcas:** PLAYA EL AGUA, EMPANADAS, COCO FRÍO, SÂN QUẦN VỢT ĐÀ LẠT (cancha de tenis de Đà Lạt), CARNAVAL DE BARRANQUILLA con el lema del Carnaval, CANCHA LA CHINITA (por la patrona de Maracaibo) y BARRIO SANTA LUCÍA (el barrio de la gaita).
14. **Para el lema del Carnaval sumé `¡` y la coma** a la letra de los letreros.
15. **De día no hay luces.** Las de la noche de Maracaibo son los bombillos de sodio y el resplandor de la nube.
16. **Los nombres de los estilos:** `venezuela_playa`, `vietnam_montana`, `colombia_caribe` y `venezuela_lago`.
17. **El confeti de Barranquilla usa el efecto `confeti` del kit** en `particulas.json`, más papelitos sueltos de la paleta.
18. **Sin concepto para estos cuatro:** los comparé contra el hẻm, Caracas, Hội An y los de E4a (`mismo_juego.png`).
19. **Los GIF usan el kit con los packs de hoy**, igual que el juego mientras llegan los packs sin la pelota pintada: el vóley con `punch`, `jab` y `jump`, el tenis con `weapon_swing` y `weapon_swing_heavy`, el fútbol con `kick_martial` y `slip_wet`, y el básquet con `jump` y `throw_overhead`.

## Límites honestos

- **Cada lugar pinta solo su hora.** A otra hora quedan pendientes y lo dicen.
- **Son de una pantalla,** como sus pruebas.
- **En los GIF, las redes, las pelotas, el aro y el confeti que cae los dibujé yo imitando al juego.** No es el juego corriendo.
- **La Marimonda no tiene una animación de baile propia:** usa `dance`. Si Rick quiere el brinco de la Marimonda con el pito, es una animación nueva para el pack `calle`.
- **La raqueta de los GIF del tenis no se ve:** el pack `armas` del kit no trae raqueta y el juego la pone por código.
- **El público, la comparsa y los gaiteros son de pixel art propio, chiquito,** de 2 o 4 cuadros. No reaccionan a los puntos.
- **El relámpago de la vida va en un bucle de 2 segundos.** El del juego es el que cae al azar.
- **El cerro de Margarita y el puente son siluetas simples:** se reconocen, pero no son un plano.
- **Las palmas de Margarita y los pinos de Đà Lạt son quietos:** no se mecen.
- **La legibilidad más baja es 3.5:1** en la cancha de Maracaibo de noche. Pasa con holgura, pero un equipo de ropa azul oscura se va a leer peor sobre el azul.
- **No corrí el juego con el arte.** Lo que tiene que conectar va arriba, con los nombres de sus funciones.

## Lo que necesita el siguiente lote

- **El juego:**
  - Conectar los cuatro escenarios en `Voley.ts`, `Tenis.ts`, `Futbol.ts` y `Basket.ts` como dice arriba, y quitar `bg_margarita`, `bg_dalat`, `bg_barranquilla` y `bg_cancha_maracaibo` de `backdrops.ts` cuando el arte esté.
  - En el fútbol, quitar los arcos dibujados en `cancha()` y cambiar la Marimonda de `texturas()` por `npc_marimonda`.
  - En el básquet, quitar el relleno azul y naranja de `cancha()`.
  - Copiar `marimonda.ficha.json` a su carpeta de NPC y la entrada `marimonda` a su sección `npc`.
- **El motor (si Rick lo quiere):**
  - El baile propio de la Marimonda, con el brinco y el pito.
  - Los balones del pedido (`balon_voley`, `balon_futbol`, `balon_basket` y `pelota_tenis`) como `objetos` del kit.
  - Otras horas de estos lugares, si alguna prueba las pide.
- **Dependencia:** esta rama sale de `claude/olimpico-lote-e4a` (PR #31). Se une después de E4a.
