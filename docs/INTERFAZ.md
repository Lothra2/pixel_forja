# Interfaz del juego

Las piezas de interfaz retro de PixelForja: el logo animado a partir del nombre del juego, una caja de diálogo estilo NES, paneles por equipo, barras, marcos de retrato, fondos de banners, controles táctiles, el minimapa de carrera y números de marcador de TV. Todo es pixel art hecho con código y sirve para cualquier juego.

- **En el estudio:** Inicio, **Interfaz del juego**.
  - Se escribe el texto del logo y se ve animado en los dos tamaños.
  - La caja de diálogo aparece armada con su retrato y la flecha.
  - Debajo están todas las piezas, y se descargan juntas en `interfaz.zip`.
- **En el kit a medida:**

```jsonc
"ui": {
  "fuentes": { "idiomas": ["es", "en", "vi"] },
  "logo": { "texto": "NEKKETSU OLYMPIC GG" },
  "interfaz": true          // o ["dialogo", "banners", "controles"]
}
```

Salen `ui/<pieza>.png` con su entrada en `manifest.ui.logo` y `manifest.ui.interfaz.<pieza>`. Los paneles salen uno por equipo, con los `colores` de `equipos.json`.

## Las piezas

| Pieza | Tamaño | Qué es |
|---|---|---|
| `logo`, `logo_chico` | 320 x 112 y 160 x 56, 8 cuadros a 10 fps | El nombre del juego en 1 o 2 líneas: la primera en fuego, la segunda en frío. Lleva contorno, sombra y un brillo que pasa |
| `dialogo` | 24 x 24, 9-slice `[8, 8, 8, 8]` | Caja de diálogo estilo NES. `relleno` dice dónde empieza el texto y `retrato` dónde va el marco |
| `dialogo_flecha` | 10 x 10, 4 cuadros a 4 fps | La flecha que titila abajo a la derecha. El cuadro 3 va vacío a propósito |
| `panel_<equipo>` | 24 x 24, 9-slice `[8, 8, 8, 8]` | Panel en los colores del equipo. Sin equipos, salen 6 de partida: rojo, azul, verde, amarillo, morado y negro |
| `barra_marco` | 16 x 10, 3-slice `[4, 4]` | El marco de las barras. `relleno` dice dónde va el contenido: x 2, y 2, alto 6 |
| `barra_aguante`, `barra_nekketsu` | 1 x 6 | El degradé del relleno: se estira al ancho del valor |
| `barra_nekketsu_llena` | 8 x 6, 4 cuadros a 12 fps | El medidor lleno que brilla, en mosaico sin costura |
| `marco_retrato_40`, `marco_retrato_96` | 48 x 48 y 108 x 108 | Marco dorado. `hueco` dice dónde va el retrato del kit |
| `banner_<id>` | 256 x 80 | Fondos de `listos`, `ya`, `chao_pescao`, `meta`, `gol`, `record` y `jonron`. `texto` es el rectángulo donde el juego escribe |
| `control_palanca`, `control_palanca_bola` | 96 y 40 | La palanca táctil. `recorrido` (30) es cuánto se mueve la bola |
| `control_a`, `_b`, `_c`, `_especial`, `_pausa` | 48 x 48 | Botones. El cuadro 0 es normal y el 1 presionado, como dice `estados` |
| `minimapa_barra` | 16 x 8, 3-slice `[4, 4]` | La pista de la carrera |
| `minimapa_salida`, `minimapa_meta` | 10 x 12 | Bandera verde y bandera a cuadros |
| `minimapa_marcador` | 7 x 6 | Flecha blanca: se tiñe con el color del equipo y va arriba de la cabecita |
| `numeros` | 14 x 18 por letra | `0123456789+-:x` de marcador de TV, blancos con el pie dorado |
| `numeros_placa` | 24 x 24, 9-slice `[6, 6, 6, 6]` | La placa oscura del marcador |

Todas las piezas son opacas o transparentes (sin mezcla). El centro de las 9-slice se repite sin costura, y hay una prueba que lo revisa.

## El envoltorio (lote G2)

Lo que rodea a las pruebas. Va en la misma lista de `ui.interfaz` y sale igual, con su entrada en `manifest.ui.interfaz`: con `"interfaz": true` salen todas. Se pueden pedir sueltas: `medallas`, `podio`, `iconos`, `banderas`, `tarjetas`, `marco_vs` y `pantallas`.

| Pieza | Tamaño | Qué es |
|---|---|---|
| `medallas_16`, `medallas_32`, `medallas_64` | 3 cuadros cada una | Oro, plata y bronce (el orden va en `orden`): el disco con relieve y una estrella grabada, la cinta roja en V arriba. Las de 32 y 64 llevan un destello |
| `cinta_16`, `cinta_32` | 16 x 16 y 32 x 32 | La cinta de participación del cuarto puesto (`puesto: 4`): una escarapela de tela turquesa plisada con un botón crema, en el mismo sitio y del mismo tamaño que el disco de las medallas, con su cinta en V arriba. Sale con `medallas` |
| `bandera_<id>_16`, `bandera_<id>_32` | 18 x 15 y 34 x 26 | Quietas. Hay `vietnam`, `colombia`, `venezuela`, `japon`, `bogota` y `zulia`. El asta va a la izquierda |
| `bandera_<id>_<tam>_ondea` | Las mismas, 8 cuadros a 10 fps | Ondeando: la tela quieta pegada al asta y la onda que crece hacia la punta, con pliegues de luz y sombra |
| `podio` | 800 x 360 | El podio en el estadio de noche. La parte de 640 va de x 80 a 720. `puestos` dice dónde van los pies de cada uno (en 640: 1 en 320, 268; 2 en 240, 284; 3 en 400, 296, como el medallero), `mastiles` por dónde sube cada bandera y `calma` la franja de arriba, tranquila para el título |
| `iconos_prueba`, `iconos_prueba_16` | 32 x 32 y 16 x 16, 18 cuadros | Un ícono por prueba en el orden de `orden`: un atleta del kit haciendo la jugada sobre un cuadrito de color. Los de 16 son los mismos reducidos sin mezclar colores |
| `tarjeta_<equipo>` | 184 x 104 | La tarjeta de la selección: los colores del equipo, su bandera arriba a la izquierda y su escudo a la derecha. El nombre va en `texto` y las 4 caras de 40 en la franja oscura `retratos` |
| `escudo_<equipo>` | 48 x 56 | El escudo solo, para lo que haga falta |
| `marco_vs_4` | 800 x 360 | El VS de dos contra dos: partido en diagonal, azul y rojo, con cuatro marcos dorados. Los retratos grandes van en `huecos` (los dos primeros de un equipo), la palabra VS en `vs`, el nombre de la prueba en `texto`, y los nombres en la fila `nombres`. La costura blanca va de (440, 0) a (360, 360): pasa por el centro y cruza la VS por el medio (`costura`) |
| `marco_vs_2` | 800 x 360 | El VS de uno contra uno, con el mismo fondo y la misma costura. Un hueco de 96 por lado en `huecos` para el retrato grande a 1, sin escalar, con un marco ancho de 16 (`marco`): oro, la banda del color del lado con remaches y un filete junto al retrato. Los centros caen en x 230 y 570, donde el juego pone hoy los retratos. `vs`, `texto`, `nombres` y `frases` son los mismos del de 4 |
| `pantalla_pausa` | 800 x 360 | Un velo tramado (la pelea se ve por los huecos, sin alfa) con la placa del medio |
| `pantalla_se_acabo` | 800 x 360 | Para "SE ACABÓ LA VAINA": la ciudad apagada bajo la lluvia, en plata |
| `pantalla_otra_partidita` | 800 x 360 | Para "¿OTRA PARTIDITA?": rayos de arcade, el piso de cuadrícula y monedas |

En las tres pantallas el título y las opciones los escribe el juego en `calma`, la franja tranquila del medio.

**La bandera y el escudo de cada equipo** salen de `equipos.json`:

```json
"rolos_de_chapinero": { "nombre": "Rolos de Chapinero", "pais": "colombia", "bandera": "bogota", "escudo": { "emblema": "bicicleta" }, ... }
```

- `bandera`: una de las 6. Sin el campo, sale la de su `pais` si el motor la tiene.
- `escudo`: un `emblema` de `letras` (con `texto`, de 1 a 3 letras), `llama`, `dragon`, `bicicleta`, `montana`, `rayo` o `estrella`. Sin el campo, sus iniciales.

**Los íconos usan a los atletas del kit,** en el orden de los equipos, uno distinto por ícono. Las pruebas son: `cross_country`, `obstaculos`, `vallas`, `natacion`, `jabalina`, `azoteas`, `tamawari`, `da_cau`, `tejo`, `quemado`, `chapita`, `voley`, `tenis`, `futbol`, `basket`, `judo`, `kachinuki` y `pelea`.

## El mapa de la gira

Va en `ui.interfaz` como la parte `mapa`. Las costas y las fronteras son de Natural Earth, que es de dominio público, simplificadas y guardadas en `src/engine/ui/geo.json`, que pesa 45 KB. Todo se pinta en pixel art:
- **El mar** va en bandas de profundidad con trama, con la espuma y la línea de costa.
- **La tierra** lleva su relieve: las cordilleras de verdad (Himalaya, Andes, Rocosas, Annamita, los Alpes del Japón), los desiertos donde van y la nieve solo en lo más alto.

| Pieza | Tamaño | Qué es |
|---|---|---|
| `mapa_gira` | 800 x 360 | El Pacífico con Asia y América, la rejilla cada 15 grados y la rosa de los vientos en el Pacífico cerca del ecuador (`rosa`: x, y y radio; el borde de abajo en y 258, arriba de la barra del pasaporte). Los países de las paradas van con borde de oro (`resaltados`). Usa la misma proyección que el mapa del juego: la parte de 640, de x 80 a 720, es longitud este de 90 a 300 y latitud de 50 a -25. Para poner algo: x = (lon este − 90) · `kx` + 80, y = (50 − lat) · `ky`, con `kx` y `ky` en `proyeccion` |
| `mapa_gira_ruta` | 800 x 360, transparente | La ruta del avión: un arco por tramo que sube hacia el norte, en rayitas blancas con borde oscuro, y un aro en cada parada. `paradas` dice dónde cae cada una. `tramos[i]` son los puntos del vuelo de la parada i a la siguiente, uno cada 5 px, para que el avión vuele por el mismo arco. Solo sale si hay dos paradas o más |
| `mapa_vietnam`, `mapa_colombia_venezuela` | 320 x 360 | Los mapas de región, para las pruebas. Llevan los vecinos apagados con su frontera y los países de la gira resaltados, y se ven el lago de Maracaibo y el delta del Mekong. `lugares` dice dónde cae cada lugar del motor en la región. Dos caben lado a lado en la parte de 640 |
| `sellos_pasaporte` | 128 x 40, 4 cuadros | Un sello por país (`orden`: japón, vietnam, colombia, venezuela), cada uno de una sola tinta (`tintas`): el Fuji con el sol, el nón lá, la taza de tinto y el tepuy con el Salto Ángel. La franja `texto` va vacía para que el juego escriba el país y la gira con esa misma tinta |

**Las paradas** salen de `kit.config.json`:

```json
"ui": { "interfaz": true, "gira": { "paradas": ["tokio", "saigon", "bogota", "caracas"] } }
```

**Los lugares que conoce el motor:**

| País | Lugares |
|---|---|
| Japón | `tokio` |
| Vietnam | `ha_noi`, `ha_long`, `hue`, `da_nang`, `hoi_an`, `nha_trang`, `da_lat`, `saigon`, `can_tho` |
| Colombia | `bogota`, `medellin`, `eje_cafetero`, `cali`, `cartagena`, `barranquilla`, `santa_marta` |
| Venezuela | `caracas`, `maracaibo`, `margarita`, `llanos_apure`, `merida`, `canaima` |

**Sin `gira`:** el mapa sale sin países resaltados y sin ruta.

## Las escenas de la intro

Va en `ui.interfaz` como la parte `intro`. Son fondos de 800 x 360, con la parte de 640 de x 80 a 720, y las capas que van encima. Las personas las pone el juego: los retratos de 96 en los `huecos` y los sprites donde quiera.

| Pieza | Tamaño | Qué es |
|---|---|---|
| `intro_azotea` | 800 x 360 | La azotea del instituto en Tokio al atardecer: el sol con rayas de arcade entre la ciudad, la Torre de Tokio, la Skytree, la reja, el tanque y la caseta de la escalera. `pie` es dónde va el atleta de espaldas y `texto`, el cielo tranquilo |
| `intro_espaldas` | 125 x 153 con Kenji, 4 cuadros a 6 fps en bucle | El atleta de `ui.intro.espaldas`, de espaldas y redibujado a 3 como el retrato grande, con el gakuran echado sobre los hombros ondeando al viento. La manga de la derecha vuela y la de la izquierda cuelga con su brazalete. `ancla` es el medio de los pies |
| `intro_bogota` | 800 x 360 | Bogotá en la tarde con lluvia: Monserrate en la neblina, la cuadra de tiendas con sus toldos, los edificios de ladrillo, el andén mojado con charcos, la chaza del vendedor y la buseta parada. `anden` es la y de los pies. `huecos` son los 4 de 96 de la presentación (ver `intro_presentacion`) |
| `intro_bogota_lluvia` | 800 x 360, 4 cuadros a 10 fps, transparente | La lluvia en diagonal y las gotas que salpican en la calle, encima de todo |
| `intro_maracaibo` | 800 x 360, 4 cuadros a 6 fps | Maracaibo al mediodía con calor: el sol blanco con su halo que late, el lago con el puente Rafael Urdaneta y los balancines en la calina, el malecón con palmeras y el carrito de raspados. El horizonte y la calle reverberan, y las palmeras y el carrito quedan quietos. `malecon` es la y de los pies. `huecos` son los 4 de la presentación, los mismos de Bogotá |
| `intro_presentacion` | 800 x 360, transparente fuera de la franja | La presentación de un equipo en Bogotá o en Maracaibo. Es una franja oscura con borde de oro y, en cada uno de los 4 `huecos`, un marco dorado con el fondo claro y rayos de manga. Así la silueta, el retrato teñido de oscuro, se lee, y el retrato de color queda enmarcado en vez de flotar sobre la buseta o la baranda. Bajo cada hueco va una placa para el nombre en la fila `nombres`. La placa mide 112 (`placa`), centrada en el hueco: a 1,5 caben 108 px de texto, como DON HERNANDO o ABUELA NERVA, y a 2 caben 8 letras. Como los huecos van cada 108, las cuatro placas se tocan y forman una barra, con una muesca arriba y abajo entre placa y placa |
| `intro_desayuno` | 800 x 360 | El desayuno en un apartamento de Saigón: la pared verde clarito, la ventana con la reja de flores y la ciudad amaneciendo afuera, el calendario, la repisa con las latas de café y la foto con la bandera, y la mata. `huecos` son los 4 retratos de 96 sentados a la mesa |
| `intro_desayuno_mesa` | 800 x 360, 4 cuadros a 6 fps, transparente arriba | La mesa de adelante: los cuatro cafés sữa đá con el phin goteando, el plato de arepas echando humito, el pan y el azúcar. Va encima de los retratos y les tapa los hombros |

**En `kit.config.json`:**

```json
"ui": { "interfaz": true, "intro": { "espaldas": "kenji" } }
```

**Sin `intro.espaldas`:** salen las escenas, pero no el atleta de espaldas.

**El orden de las capas:**
- **En el desayuno:** `intro_desayuno`, los retratos `grande_feliz` en `huecos` y encima `intro_desayuno_mesa`.
- **En Bogotá:** `intro_bogota`, y si se presenta un equipo, `intro_presentacion` con los retratos en sus `huecos`. Encima de todo va `intro_bogota_lluvia`.
- **En Maracaibo:** `intro_maracaibo`, `intro_presentacion` y los retratos.

## La cancha de tenis vista desde atrás

Va en `ui.interfaz` como la parte `tenis`. Es el tenis con la cámara detrás de tu equipo, como el del Switch Sports: la cancha se ve en profundidad y el juego pone encima a los atletas del pack de tenis con sus filas `up` (los nuestros, de espaldas) y `down` (ellos, de frente), escalados con la misma proyección.

| Pieza | Tamaño | Qué es |
|---|---|---|
| `tenis_fondo` | 800 x 360 | Đà Lạt por la mañana: el cielo con bruma, el lago Xuân Hương y los pinos lejanos, la malla del fondo con la lona del club, la arcilla roja con sus líneas, la grada con público a los dos lados, las vallas, las macetas con hortensias, los pinos cercanos, los faroles, la silla del juez, las bancas y los recogepelotas. Sin la red. La parte de 640 va de x 80 a 720 |
| `tenis_red` | 800 x 360, transparente (la red ocupa de x 297 a 503, filas 170 a 187) | La red sola con sus dos palos, para ponerla encima de los jugadores de atrás y debajo de los de adelante |

**La proyección** (va en `extra.proyeccion` de `tenis_fondo`, en coordenadas del png de 800): la cancha de dobles mide 200 de ancho (x de -100 a 100) y 400 de largo (d de 0, tu fondo, a 400, el de ellos). `s(d) = 480 / (480 + d)`, `x_png = 400 + x * s * 1.35`, `y_png = -135.6 + 457.6 * s`. Con eso tu línea de fondo cae en la fila 322, la de ellos en la 114 y la red en la 211. `extra.cancha` trae las cuatro esquinas de la cancha en el png y `extra.red`, dónde va la red. `tenis_red` trae `fila`, `x0`, `x1` y `alto` para pegarla donde toca.

**En `kit.config.json`:**

```json
"ui": { "interfaz": ["tenis"] }
```

**En el juego:** `tenis_fondo` va a -80 de x en un lienzo de 640 (o centrado si la pantalla es más ancha), la red va en `fila` con profundidad entre los jugadores de atrás y los de adelante, y la pelota y los jugadores se dibujan con la misma `proyeccion`.

## Los bordes de las canchas

Va en `ui.interfaz` como la parte `bordes`. Las canchas a 800 del lote E4 se pintan lisas alrededor, y el juego ponía poco o nada al borde: estas piezas traen lo que rodea una cancha de verdad, en la paleta de cada lugar y con los pinceles de la casa. Son transparentes, de 800 x 360 (la parte de 640 de x 80 a 720), y se pegan en (-80, 0). `extra.corte` es la fila que las parte en dos: lo de arriba va detrás de los atletas (encima del piso) y lo de abajo, delante de todos (la franja del frente, donde nadie camina).

| Pieza | Corte | Qué trae |
|---|---|---|
| `borde_margarita` | 300 | El vóley playa: detrás (filas 238 a 296) las sombrillas con la gente en las toallas, la cava, la silla del árbitro pegada a la red, las banderas de las esquinas, el fotógrafo y el salvavidas; adelante (324 a 360) la toalla con el sombrero, las chancletas, el balde con la pala, el castillito y las huellas |
| `borde_cancha_maracaibo` | 312 | El básquet de noche: la acera de adelante (320 a 360) con la banca de cada equipo y sus morrales, la mesa de control con el marcador y la campana, el carrito de balones, los conos, el niño con la bandera y el perro echado |
| `borde_barranquilla` | 312 | El fútbol del carnaval: la acera (320 a 360) con los niños sentados en el borde, las bancas, los tamboreros con la marimonda, el carrito de raspao con su cola, el confeti y las serpentinas |
| `borde_tao_dan` | 316 | El đá cầu del parque: detrás (236 a 262) la banca del parque, la bicicleta, la vendedora con sus canastas y la cesta de volantes; adelante (326 a 360) los bolsos, el abuelo del tai chi, las palomas y los niños sentados |
| `borde_liceo_patio` | 312 | El quemado del liceo: el concreto de adelante (320 a 360) con la banca y los morrales de todos, la profe con el pito y el botellón, los que esperan en fila, los conos, una pelota y la rayuela |

**En `kit.config.json`:**

```json
"ui": { "interfaz": ["bordes"] }
```

**En Phaser:** la misma imagen dos veces con `setCrop`: de la fila 0 a `corte` con profundidad justo encima del piso del escenario, y de `corte` para abajo con una profundidad mayor que la de cualquier atleta.

## En Phaser

```js
const ui = m.ui.interfaz;

// cargar: las de varios cuadros como spritesheet, las demás como imagen
for (const [id, p] of Object.entries(ui))
  if (p.cuadros) this.load.spritesheet(id, KIT + p.archivo, { frameWidth: p.w, frameHeight: p.h });
  else this.load.image(id, KIT + p.archivo);
this.load.spritesheet('numeros', KIT + ui.numeros.archivo, { frameWidth: 14, frameHeight: 18 });
this.load.spritesheet('logo', KIT + m.ui.logo.archivo, { frameWidth: 320, frameHeight: 112 });

// caja de diálogo de 300 x 64 con su retrato (NineSlice, Phaser 3.60 o más)
const [l, t, r, b] = ui.dialogo.nueve;
this.add.nineslice(170, 300, 'dialogo', undefined, 300, 64, l, r, t, b);
this.add.image(20 + 24, 268 + 24, 'marco_retrato_40');                  // y el retrato de 40 adentro, en el hueco
this.add.bitmapText(76, 276, 'fuente_ui', 'ĐÁ CẦU, ¡VAMOS!').setScale(2);

// banner: el texto centrado en su rectángulo
const [x, y, w, h] = ui.banner_meta.texto;
this.add.image(320, 90, 'banner_meta');
this.add.bitmapText(320 - 128 + x + w / 2, 90 - 40 + y + h / 2, 'fuente_titulo', '¡META!').setOrigin(0.5);

// barra de aguante al 70 %: el marco 3-slice y el relleno estirado
this.add.nineslice(80, 20, 'barra_marco', undefined, 120, 10, 4, 4, 0, 0);
this.add.image(22, 17, 'barra_aguante').setOrigin(0).setDisplaySize(116 * 0.7, 6);

// botón táctil: cuadro 1 mientras se presiona
const a = this.add.sprite(580, 300, 'control_a', 0).setInteractive();
a.on('pointerdown', () => a.setFrame(1)).on('pointerup', () => a.setFrame(0));

// marcador de TV: cada letra es un cuadro de `numeros`, en el orden de `letras`
const letra = (ch) => ui.numeros.letras.indexOf(ch);
'12:30'.split('').forEach((ch, i) => this.add.image(260 + i * 14, 20, 'numeros', letra(ch)));

// logo animado
this.anims.create({ key: 'logo', frames: this.anims.generateFrameNumbers('logo'), frameRate: 10, repeat: -1 });
this.add.sprite(320, 120, 'logo').play('logo');
```

## Límites honestos

- **El texto lo pone el juego.** Banners, diálogos y marcador se escriben con las fuentes del kit, así sirven para cualquier idioma.
- **Los fondos del envoltorio miden 800 x 360,** como las canchas: lo importante va en los 640 del medio y los lados son escenario.
- **El dragón y la bicicleta de los escudos** son dibujos chicos: a 26 de ancho, en la tarjeta, se leen como forma más que como detalle.
- **El logo usa Silkscreen.** Con nombres muy largos (más de unas 24 letras en 2 líneas) la letra queda chica. Un logo dibujado a mano llega con el lote G2 (envoltorio completo).
- **Los paneles salen de dos colores por equipo:** `colores[0]` es el fondo y `colores[1]` el borde. Si un equipo no trae colores, no sale su panel.
