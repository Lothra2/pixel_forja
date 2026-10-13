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
- **El logo usa Silkscreen.** Con nombres muy largos (más de unas 24 letras en 2 líneas) la letra queda chica. Un logo dibujado a mano llega con el lote G2 (envoltorio completo).
- **Los paneles salen de dos colores por equipo:** `colores[0]` es el fondo y `colores[1]` el borde. Si un equipo no trae colores, no sale su panel.
