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

## Equipos (lote C1): Familia GG e Instituto Nekketsu

En [`fichas/`](fichas/) están los 8 atletas y la mascota, listos para abrir y editar en el estudio (Inicio, Abrir ficha):

| Equipo | Atletas | Uniforme |
|---|---|---|
| Familia GG | `rick` (7), `steph` (28), `sophie` (15), `alana` (21) | Su look de siempre en su color: Rick azul, Steph rosado, Sophie verde, Alana fucsia. "GG" dorado en el pecho y el número dorado atrás. Alana trae además el vestuario "Mickey" |
| Instituto Nekketsu | `kenji`, `ryu`, `goro` (gigante, celda 64), `tetsu` | Gakuran azul marino muy oscuro con botones dorados y brazalete rojo. Kenji lo lleva abierto sobre camiseta blanca, Goro sin mangas |
| Mascota | `thor` | El bóxer con todas sus animaciones de mascota |

Todo sale de campos generales de la ficha (`jacketCut`, `jacketClosed`, `jacketSleeves`, `armband`, `chestText`, `cell`), explicados en [docs/KIT_DEPORTES.md](../../KIT_DEPORTES.md#equipos-uniformes-gigantes-y-mascota).

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

[`kit.config.json`](kit.config.json) es la configuración del kit del juego y [`equipos.json`](equipos.json) sus dos equipos. Con eso sale todo lo de arriba de una vez, en el formato del contrato:

```bash
npm run kit-a-medida -- salida/kit_nekketsu --config docs/ejemplos/nekketsu/kit.config.json
```

Salen los 8 atletas con 5 packs (`base`, `pelea`, `armas`, `natacion`, `atletismo`), retratos, cabecitas, las 19 armas del piso, Thor y las fuentes con vietnamita, en unos 80 segundos. El manifiesto trae `equipos`, el `equipo` de cada atleta y las `pruebas` con los packs que carga cada una. Para verlo: `visor.html` en el sitio. Detalles en [docs/KIT_A_MEDIDA.md](../../KIT_A_MEDIDA.md).

El juego tendrá su propio `kit.config.json` y `data/teams.json`. Esta es la versión de ejemplo, con lo que PixelForja ya genera.

## Efectos y sonidos (lote F)

La configuración pide `"fx": true` (los 56 efectos del catálogo general en `fx/`) y los sonidos del motor que le sirven al juego en `audio/sfx/`: golpes, esquiva, bloqueo, pasos, ladrido de Thor y los de la interfaz. `silbato`, `pistola` y `marcha_nekketsu` todavía no existen: el kit los salta con aviso y quedan en `manifest.pendiente` hasta el lote H. Qué efecto va con qué evento: [docs/EFECTOS.md](../../EFECTOS.md).

## Interfaz y audio de la rebanada (lotes G1 y H1)

La configuración pide además:
- **Logo:** `ui.logo` con "NEKKETSU OLYMPIC GG".
- **Interfaz completa:** `ui.interfaz: true`, con un panel por cada equipo de `equipos.json`.
- **Música:** `marcha_nekketsu`, `saigon_chay`, `azotea_final`, `victoria_banda` y `derrota`.
- **Sonidos de H1:** pistola, silbato, golpes, chancleta, silla, pote, público...
- **Voces:** los 8 atletas más `locutor` y `arbitro`.

Ya no queda nada en `manifest.pendiente`. Para oír todo: `audio/escuchar.html` del kit, que en el sitio está en `kit_nekketsu/audio/escuchar.html`. Detalles en [docs/INTERFAZ.md](../../INTERFAZ.md) y [docs/AUDIO.md](../../AUDIO.md).
