# Lote G1 resto + H1: interfaz y audio de la rebanada vertical
Estado: entregado
PR: (se pone al abrirlo)
Fecha: 2026-10-12

## Qué se hizo

Todo lo que faltaba de G1 y todo H1, como piezas generales del motor. Ninguna lleva nada de Nekketsu adentro: el texto del logo, los equipos y las voces salen de la configuración.

**G1 resto: la interfaz retro** (`src/engine/ui/retro.ts`)

| Pedido | Qué sale |
|---|---|
| Caja de diálogo | `dialogo`, 9-slice estilo NES con lugar para el retrato, y `dialogo_flecha`, que titila |
| `logo` | El texto de la configuración en 320 x 112 y 160 x 56, 8 cuadros con un brillo que pasa. La primera línea va en fuego y la segunda en frío |
| Paneles por equipo | `panel_<equipo>`, 9-slice con los `colores` de cada equipo. Sin equipos salen 6 de partida |
| Barras | `barra_marco` (3-slice), `barra_aguante`, `barra_nekketsu` y `barra_nekketsu_llena`, que brilla en mosaico |
| Marco de retrato | `marco_retrato_40` y `marco_retrato_96`, con `hueco` en el manifiesto |
| Banners | Fondos de `listos`, `ya`, `chao_pescao`, `meta`, `gol`, `record` y `jonron`, con `texto`: el rectángulo donde el juego escribe |
| Controles táctiles | Palanca con su bola, A, B, C, especial y pausa. Cada botón trae normal y presionado |
| Minimapa | La barra de carrera, la bandera de salida, la de meta y el marcador que se tiñe por equipo |
| Números | `0123456789+-:x` de marcador de TV y su placa 9-slice |

**H1: el audio** (`src/engine/audio/`)
- **Un sintetizador nuevo** (`synth.ts`): envolventes, cuerdas punteadas que se doblan, batería, eco y bucles que empalman sin corte.
- **Música:**
  - `marcha_nekketsu`: banda escolar a 132 bpm, 60 s exactos en bucle.
  - `saigon_chay`: đàn tranh en pentatónica, con la cuerda que se dobla.
  - `azotea_final`: tema de pelea.
  - `victoria_banda` y `derrota`.
- **Los 16 efectos del pedido:** `pistola`, `silbato`, `golpe_1..3`, `golpe_pesado`, `chancleta`, `silla`, `pote`, `levantar`, `lanzar`, `caer_plano`, `mareo`, `ko`, `publico_grito` y `publico_ooh`.
- **Voces en blips:** 4 blips por personaje con su tono y timbre. Sirven para cualquier atleta, el locutor o un NPC.
- **El catálogo** (`catalogo.ts`) junta todo el audio del motor: 65 efectos, 9 músicas y 6 ambientes.
- **`audio/escuchar.html`:** toca todo con un clic y prueba las voces. Abre desde la carpeta, sin servidor. Es la aceptación de H1.

**En el kit a medida y el estudio:**
- `ui.logo`, `ui.interfaz` y `audio.voces` en `kit.config.json`, con esquema y validación.
- Con el ejemplo de Nekketsu, el manifiesto ya no trae `pendiente`: `silbato`, `pistola` y `marcha_nekketsu` salen.
- Dos páginas nuevas en el estudio, en español e inglés:
  - **Interfaz del juego:** el logo con el texto que escribas, la caja de diálogo armada, todas las piezas y descarga en `interfaz.zip`.
  - **Audio del juego:** cada sonido con su botón, más el probador de voces.

## Cómo se usa (estudio y kit)

```jsonc
// kit.config.json
"ui": {
  "fuentes": { "idiomas": ["es", "en", "vi"] },
  "logo": { "texto": "NEKKETSU OLYMPIC GG" },
  "interfaz": true                                  // o ["dialogo", "banners", "controles"]
},
"audio": {
  "sfx": ["pistola", "silbato", "golpe_1", "golpe_2", "golpe_3", "publico_grito"],
  "musica": ["marcha_nekketsu", "saigon_chay", "azotea_final", "victoria_banda", "derrota"],
  "voces": ["rick", "steph", "sophie", "alana", "locutor", "arbitro"]   // o true: todos los atletas
}
```

```bash
npm run kit-a-medida -- salida/kit --config kit.config.json --solo interfaz,audio
```

- Salen `ui/<pieza>.png`, `audio/sfx|musica|voz/*.wav` y `audio/escuchar.html`.
- Cada atleta con voz trae `voz: { tono, timbre, archivos }` en el manifiesto.
- Ejemplos en Phaser de 9-slice, banners, botones, marcador, música en bucle y diálogo con blips: [docs/INTERFAZ.md](../../INTERFAZ.md) y [docs/AUDIO.md](../../AUDIO.md).

## Pruebas

- `npm test`: 232 de 232. Las nuevas están en `src/engine/__tests__/ui_audio.test.ts` (16):
  - Las 9-slice empalman sin costura.
  - Opaco o transparente, nada a medias.
  - Imagen dorada `golden/interfaz.png`.
  - Los botones traen 2 cuadros con `estados`, sin pisar el número de `cuadros`.
  - La marcha mide 60 s y empalma sin corte.
  - Ningún efecto termina en silencio largo.
  - Un sonido sale igual, se pida solo o con otros.
  - Las voces salen de la ficha.
  - `escuchar.html` trae todo.
- `custom.test.ts` revisa el kit completo de Nekketsu: sin `pendiente`, sin archivos de sobra ni que falten.
- `npm run e2e`: 48 de 48 en computadora y teléfono. Las nuevas son "interfaz del juego", "audio del juego" y `audio/escuchar.html`. Esa última encontró un error: la página no atrapaba el `play()` cortado por otro sonido. Está arreglado.
- `tsc -b`: limpio.

| Qué se revisa | Resultado |
|---|---|
| Todo lo de G1 en la tabla del pedido | Sí, las 9 filas |
| Todo lo de H1 | Sí, salvo `victoria`, que va como `victoria_banda` (ver decisiones) |
| Marcha | 60.000 s, 132 bpm, el último cuadro empalma con el primero |
| Volumen | Ninguna pista recorta, todas por encima del piso de ruido |
| Kit de Nekketsu | 30 piezas de interfaz, logo, 33 efectos de sonido, 5 músicas y 10 voces. 6.2 MB de audio |
| Aceptación de H1 | `audio/escuchar.html` toca todo con un clic. Está en el kit de ejemplo del sitio y publicado para la tablet |

Entregables en esta carpeta:
- `tablero_interfaz.png`: todas las piezas a x2, con el logo de Nekketsu.
- `pantalla_hud.png` y `.gif`: una carrera armada solo con piezas del kit. Paneles por equipo, barras, marcador de TV, minimapa con las cabecitas, el banner de meta y los controles.
- `pantalla_dialogo.png` y `.gif`: el logo animado y Sophie hablando en la caja de diálogo, con la fuente del kit y acentos vietnamitas.
- El audio para oír en la tablet: [Audio Nekketsu Olympic](https://claude.ai/artifact/WHpwhC6GfF4yQubHuxkvTY), el mismo `escuchar.html` del kit de ejemplo.

## Decisiones que tomé sin preguntar

- **G1 y H1 en un solo PR.** Tu mensaje los pidió juntos, y comparten el kit, el estudio y las pruebas. Separarlos era el doble de revisión por lo mismo.
- **`victoria_banda` y no `victoria`.** `victoria` ya existe y es la fanfarria de GG Abyss. Cambiarla movía ese kit. La de banda combina con la marcha.
- **Voz automática desde la ficha:**
  - Niños y fichas con cuerpo `curvas` suenan más agudo.
  - Los de celda 64 suenan más grave.
  - El timbre sale del id.
  - Con un objeto en `voces` se fija a mano.
- **4 blips por personaje.** El juego elige uno por letra. Así no suena a metralleta y pesa poco.
- **El logo usa Silkscreen,** la misma fuente de los títulos. Sin `ui.fuentes` el kit pide la fuente igual. Un logo dibujado a mano es de G2.
- **Paneles de 2 colores por equipo:** `colores[0]` es el fondo y `colores[1]` el borde.
- **`estados` en los botones:** primero lo llamé `cuadros`, pero ese nombre ya es el número de cuadros de la hoja y lo pisaba. Hay una prueba para que no vuelva a pasar.
- **Textos fuera de las piezas.** Banners, diálogo y marcador salen sin letras, porque el juego escribe con las fuentes del kit en cualquier idioma.

## Límites honestos

- **Es chiptune.** La marcha y el đàn tranh se reconocen, pero suenan a consola, no a banda real. Si algo no te convence al oírlo, se ajusta el tema sin tocar el resto.
- **WAV pesa.** Mono a 22050 Hz, la marcha pesa 2.6 MB. Si el peso importa, el juego la pasa a OGG en su build.
- **Logos largos quedan chicos.** Con más de unas 24 letras en 2 líneas la letra baja de tamaño.
- **No hay voz hablada.** Lo asume el pedido: blips.
- **La cabecera del estudio en teléfono** pisa el nombre con los botones Arena y Visor a 400 px. Viene de antes y no es de este lote, pero lo vi en las capturas. Lo arreglo cuando me digas.

## Lo que necesita el siguiente lote

- **E1 ya se puede arrancar:** `data/stages/saigon_hem.layout.json` está en el repo del juego y ESTADO.md dice que está jugado en gris. Es el siguiente en el orden del pedido y espera tu luz verde.
- **G2 y H2** (envoltorio y audio completo) usan esta misma base: el sintetizador, el catálogo y las piezas retro.
- **Pedidos del juego anotados para los lotes de atletismo:** `javelin_run` y `hurdle_clear`.
- **C2:** sigue pendiente la cara "malandra" del Instituto (Kenji, Ryu y Goro).
