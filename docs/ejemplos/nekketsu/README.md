# Ejemplos para Nekketsu Olympic GG

Material de ejemplo del juego. Todo lo que usan es general del motor, sirve para cualquier juego.

- `rick.ficha.json`: Rick con **vestuario por pack**. Calle para atletismo, bañador para natación, judogi para pelea y camiseta de la Familia GG para fútbol. Ábrela en el estudio (Inicio, Abrir ficha) y en Animar aparecen sus variantes. También sirve para el kit:

```bash
mkdir -p mis_fichas && cp docs/ejemplos/nekketsu/rick.ficha.json mis_fichas/
npm run deportes -- salida/kit_nekketsu --fichas mis_fichas --deportes pelea,natacion \
  --filas right,down_right,up_right,down,up --datos --atlas --retratos --cabecitas
```

Sale `atletas/rick/pelea.png + .json` (atlas JSON Hash de TexturePacker), `atletas/rick/retratos.png`, `ui/cabecitas.png` y un `manifest.json` con `cajas`, `manos`, `cabeza` y `pies` por fila y cuadro. Los campos están explicados en [docs/KIT_DEPORTES.md](../../KIT_DEPORTES.md#datos-por-cuadro-atlas-retratos-y-vestuario).

Los nombres de pack del juego (`base`, `judo`...) llegan con el lote B. Por ahora el vestuario usa los packs que ya tiene el kit deportivo: atletismo, natacion, voley, tenis, pelea y futbol.

## Pelea callejera (lote B1) y armas del piso (D1)

```bash
npm run deportes -- salida/kit_calle --fichas mis_fichas --deportes calle \
  --filas right,down_right,up_right,down,up --datos --atlas --objetos
```

Sale `atletas/rick/calle.png + .json` con las 26 animaciones de beat 'em up (levantar, llevar, lanzar, agarres, armas) y `objetos/armas.png + .json` con las 19 armas del piso. Cómo se compone lo levantado (`carga`) y el arma en la mano (`arma`): [docs/KIT_DEPORTES.md](../../KIT_DEPORTES.md#pelea-callejera---deportes-calle).

## Equipos (lotes C1 y C2)

En [`fichas/`](fichas/) están los 24 atletas de los 6 equipos y la mascota, listos para abrir y editar en el estudio (Inicio, Abrir ficha):

| Equipo | Atletas | Uniforme |
|---|---|---|
| Familia GG | `rick` (7), `steph` (28), `sophie` (15), `alana` (21) | Su look de siempre en su color: Rick azul, Steph rosado, Sophie verde, Alana fucsia. "GG" dorado en el pecho y el número dorado atrás. Alana trae además el vestuario "Mickey" |
| Instituto Nekketsu | `kenji`, `ryu`, `goro` (gigante, celda 64), `tetsu` | Gakuran azul marino muy oscuro con botones dorados y brazalete rojo. Kenji lo lleva abierto sobre camiseta blanca, Goro sin mangas. Los cuatro con la cara malandra de base (lote C2) |
| Rồng Sài Gòn (C2) | `minh`, `lan`, `tuan`, `ba_hoa` | Minh con vovinam azul y cinta roja. Lan con el uniforme escolar y la pañoleta roja. Tuấn con franela y sandalias. Bà Hoa con bộ bà ba y nón lá |
| Rolos de Chapinero (C2) | `andres`, `camila`, `pipe`, `don_hernando` (gigante, celda 64) | Andrés con chaqueta gris cerrada y bufanda. Camila con casco de ciclista e impermeable. Pipe con camiseta azul sin escudo y bufanda. Don Hernando con saco de paño y bigote |
| Los Panas de Caracas (C2) | `gabo`, `yuli`, `toto`, `carmen` | Gabo con gorra y camisa de pelotero. Yuli con la chemise beige del liceo. Toto con franela grande y chancletas. La señora Carmen con rolos y bata de flores |
| Maracuchos del Lago (C2) | `ender`, `yusmary`, `jhonder`, `abuela_nerva` | Ender con sombrero de gaitero, bigote y guayabera. Yusmary con camiseta de básquet. Jhonder con franela de rayas y short. La abuela Nerva con bata fresca |
| Mascota | `thor` | El bóxer con todas sus animaciones de mascota |
| Animales de la calle (C7) | `perro_calle_1` (Canelo), `perro_calle_2` (Negrito), `perro_calle_3` (Manchas), `gato_1` (Mango), `gato_2` (Sombra) | Los perros de la Comuna 13 y los gatos de los techos, con `sleep`, `scratch` y `jump_wall` (medido con `subida`, lote C7c). Los perros, además, `wake` y `pounce` |

Todo sale de campos generales de la ficha (`jacketCut`, `jacketClosed`, `jacketSleeves`, `armband`, `chestText`, `cell`, `neck`, `face.base`, los gorros propios y el calzado abierto), explicados en [docs/KIT_DEPORTES.md](../../KIT_DEPORTES.md#equipos-uniformes-gigantes-y-mascota).

El kit de los dos equipos con todo lo del juego:

```bash
npm run deportes -- salida/kit_equipos --fichas docs/ejemplos/nekketsu/fichas \
  --deportes atletismo,natacion,voley,tenis,pelea,futbol,calle \
  --filas right,down_right,up_right,down,up --datos --atlas --retratos --cabecitas --objetos --fuentes
```

Sale cada atleta en su celda (Goro en 64), con su `numero` en el manifiesto, y Thor en `animales/thor.png + .json`.

## Fuentes con vietnamita (lote G1)

Con `--fuentes`, el kit trae `ui/fuentes/` con `fuente_ui`, `fuente_titulo` y `fuente_titulo_plata`, con todas las letras del vietnamita: "Rồng Sài Gòn", "Đá cầu", "Bà Hoa", "Tuấn" y "Trời ơi" se leen a 8 px. Detalles en [docs/KIT_DEPORTES.md](../../KIT_DEPORTES.md#fuentes---fuentes-opción-fuentes).

## Kit a medida (lote I)

[`kit.config.json`](kit.config.json) es la configuración del kit del juego y [`equipos.json`](equipos.json) sus seis equipos. Con eso sale todo lo de arriba de una vez, en el formato del contrato:

```bash
npm run kit-a-medida -- salida/kit_nekketsu --config docs/ejemplos/nekketsu/kit.config.json
```

Salen los 24 atletas con 15 packs (`base`, `pelea`, `armas`, `natacion`, `atletismo`, `kachinuki`, `recorridos`, `trepar`, `ngg_burlas`, la burla de su equipo, y `voley`, `futbol`, `keeper`, `basket`, `tennis` y `beisbol` sin las pelotas dibujadas, con `objetos` y las pelotas sueltas en `objetos/pelotas.png`), retratos, cabecitas, las 19 armas del piso, Thor, las fuentes con vietnamita y todo lo de la pelea, en unos 3 a 4 minutos. El manifiesto trae `equipos`, el `equipo` de cada atleta y las `pruebas` con los packs que carga cada una. Para verlo: `visor.html` en el sitio. Detalles en [docs/KIT_A_MEDIDA.md](../../KIT_A_MEDIDA.md).

El juego tendrá su propio `kit.config.json` y `data/teams.json`. Esta es la versión de ejemplo, con lo que PixelForja ya genera.

## Efectos y sonidos (lote F)

La configuración pide `"fx": true` (los 56 efectos del catálogo general en `fx/`) y los sonidos del motor que le sirven al juego en `audio/sfx/`: golpes, esquiva, bloqueo, pasos, ladrido de Thor y los de la interfaz. `silbato`, `pistola` y `marcha_nekketsu` llegaron con el lote H1. Qué efecto va con qué evento: [docs/EFECTOS.md](../../EFECTOS.md).

## Interfaz y audio de la rebanada (lotes G1 y H1)

La configuración pide además:
- **Logo:** `ui.logo` con "NEKKETSU OLYMPIC GG".
- **Interfaz completa:** `ui.interfaz: true`, con un panel por cada equipo de `equipos.json`.
- **Música:** `marcha_nekketsu`, `saigon_chay`, `azotea_final`, `victoria_banda` y `derrota`, y un tema por mundo del lote H2: `tema_instituto`, `hoian_noche`, `ajiaco_rock`, `parce_corra`, `pana_dale` y `gaita_lago`, y los de los mundos de pelota del lote H3: `carnaval_quilla`, `playa_margarita` y `dalat_niebla`.
- **Sonidos de H1:** pistola, silbato, golpes, chancleta, silla, pote, público...
- **Sonidos de H2:** `gallo` (el kikirikí), `aleteo`, `mecha_tejo`, `toque_cau`, `caida_tatami` y `pitazo_largo`.
- **Sonidos de H3:** `red_voley`, `rebote_balon`, `aro_basket` (la canasta), `aro_fallo` (el tiro que pega en el aro y se sale) y `chapa`.
- **Voces:** los 8 atletas más `locutor` y `arbitro`.

Ya no queda nada en `manifest.pendiente`. Para oír todo: `audio/escuchar.html` del kit, que en el sitio está en `kit_nekketsu/audio/escuchar.html`. Detalles en [docs/INTERFAZ.md](../../INTERFAZ.md) y [docs/AUDIO.md](../../AUDIO.md).

## Escenarios

`escenarios/saigon_hem.layout.json` es el layout del tramo 1 del Cross Country, copiado tal cual del juego (lo escribe el juego en `data/stages/`). La configuración lo pide con `"escenarios": "escenarios/"` y el kit lo pinta en `escenarios/saigon_hem/` con sus 9 pruebas. Para ver las postales y la ficha de arte:

```bash
npm run escenario -- docs/ejemplos/nekketsu/escenarios/saigon_hem.layout.json salida --postales --ficha
```

La carpeta trae también los otros cuatro tramos del Cross, la Comuna 13 (`medellin_c13`), la azotea de Caracas (`caracas_azotea`) y Hội An de noche con el Tama-wari (`hoian`), cada uno copiado del juego. Y los de las pruebas nuevas:

| Layout | Prueba | Vista | Hora |
|---|---|---|---|
| `judo_hanoi` | Judo (`Fight.ts`) | inclinada | tarde |
| `tao_dan` | Đá cầu (`DaCau.ts`) | de lado | amanecer |
| `candelaria` | Tejo (`Tejo.ts`) | de lado | tarde nublada |
| `margarita` | Vóley Playa (`Voley.ts`) | de lado | mediodía |
| `dalat` | Tenis de dobles (`Tenis.ts`) | de lado | mañana con neblina |
| `barranquilla` | Fútbol Callejero (`Futbol.ts`) | inclinada | mediodía |
| `cancha_maracaibo` | Básquet 3x3 (`Basket.ts`) | inclinada | noche |

Los cuatro últimos son del lote E5: sus franjas salen de las medidas de cada prueba (el piso en la fila 310 en el vóley y el tenis, y FT 212 con 104 de fondo en el fútbol y el básquet).

Cómo se carga en el juego: [docs/ESCENARIOS.md](../../ESCENARIOS.md).

## La gente de la calle (lotes C6a y E5)

En [`npc/`](npc/) están las fichas de los NPC y la sección `npc` de [`kit.config.json`](kit.config.json) dice qué animaciones lleva cada uno. Cada NPC sale en `npc/<id>.png`, una tira con el ancla en los pies.

- **La Comuna 13 (C6a):** los tres bailarines de break, los dos pelados del fútbol, el grafitero, los músicos con el parlante y el vendedor de paletas, más la pelota.
- **La Marimonda del Carnaval (E5):** `marimonda.ficha.json`, con la máscara de la Marimonda (`hat: "marimonda"`: la capucha roja, las orejotas azules y la trompa larga) y el traje de colores. Lleva `caminar` (la animación `walk` del motor, de lado: `vistas.caminar: "lado"`, el juego la espeja para ir a la izquierda) y `bailar` (`dance`, de frente). Es la que cruza la calle en el Fútbol Callejero.
