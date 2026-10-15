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
| `bandera_<id>_16`, `bandera_<id>_32` | 18 x 15 y 34 x 26 | Quietas. Hay `vietnam`, `colombia`, `venezuela`, `japon`, `bogota` y `zulia`. El asta va a la izquierda |
| `bandera_<id>_<tam>_ondea` | Las mismas, 8 cuadros a 10 fps | Ondeando: la tela quieta pegada al asta y la onda que crece hacia la punta, con pliegues de luz y sombra |
| `podio` | 800 x 360 | El podio en el estadio de noche. La parte de 640 va de x 80 a 720. `puestos` dice dónde van los pies de cada uno (en 640: 1 en 320, 268; 2 en 240, 284; 3 en 400, 296, como el medallero), `mastiles` por dónde sube cada bandera y `calma` la franja de arriba, tranquila para el título |
| `iconos_prueba`, `iconos_prueba_16` | 32 x 32 y 16 x 16, 18 cuadros | Un ícono por prueba en el orden de `orden`: un atleta del kit haciendo la jugada sobre un cuadrito de color. Los de 16 son los mismos reducidos sin mezclar colores |
| `tarjeta_<equipo>` | 184 x 104 | La tarjeta de la selección: los colores del equipo, su bandera arriba a la izquierda y su escudo a la derecha. El nombre va en `texto` y las 4 caras de 40 en la franja oscura `retratos` |
| `escudo_<equipo>` | 48 x 56 | El escudo solo, para lo que haga falta |
| `marco_vs_4` | 800 x 360 | El VS de dos contra dos: partido en diagonal, azul y rojo, con cuatro marcos dorados. Los retratos grandes van en `huecos` (los dos primeros de un equipo), la palabra VS en `vs`, el nombre de la prueba en `texto`, y los nombres en la fila `nombres`. La costura blanca va de (440, 0) a (360, 360): pasa por el centro y cruza la VS por el medio (`costura`) |
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
| `mapa_gira` | 800 x 360 | El Pacífico con Asia y América, la rejilla cada 15 grados y la rosa de los vientos. Los países de las paradas van con borde de oro (`resaltados`). Usa la misma proyección que el mapa del juego: la parte de 640, de x 80 a 720, es longitud este de 90 a 300 y latitud de 50 a -25. Para poner algo: x = (lon este − 90) · `kx` + 80, y = (50 − lat) · `ky`, con `kx` y `ky` en `proyeccion` |
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
