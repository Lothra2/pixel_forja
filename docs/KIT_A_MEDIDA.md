# Kit a medida

El juego describe en un `kit.config.json` qué necesita (personajes, packs de animaciones, armas del piso, animales y fuentes) y PixelForja arma el kit: un `manifest.json` y los atlas PNG listos para Phaser. Sirve para cualquier juego. Lo propio de cada uno vive en su configuración, no en el código de PixelForja.

```bash
npm run kit-a-medida -- <carpeta de salida> --config <juego>/kit.config.json [--rapido] [--solo atletas,fuentes]
```

Desde el juego, con PixelForja como submódulo en `tools/pixel_forja`:

```bash
npx tsx tools/pixel_forja/scripts/kit-a-medida.ts public/assets/kit --config kit.config.json
```

- Las rutas de la configuración (`fichas`, `equipos`) son relativas a la carpeta del `kit.config.json`.
- `--rapido` saca 2 animaciones por pack, para probar en segundos.
- `--solo` arma solo esas partes: `atletas`, `retratos`, `cabecitas`, `objetos`, `animales`, `fuentes`.
- La carpeta de salida se borra entera. Por eso solo se acepta si está vacía o si ya es un kit de PixelForja.
- El kit de ejemplo de Nekketsu (8 atletas, 5 packs, 52 animaciones, 19 armas, Thor y las fuentes) sale en unos 80 segundos y pesa 10 MB.

## La configuración

```jsonc
{
  "$schema": "../../kit-a-medida.schema.json",     // el editor autocompleta y marca errores
  "juego": "Nekketsu Olympic GG",
  "resolucion": [640, 360],
  "celda": 48,
  "filas": ["right", "down_right", "up_right", "down", "up"],
  "datos_por_cuadro": ["cajas", "cuerpo", "manos", "cabeza", "pies", "carga", "arma"],
  "fichas": "fichas/",
  "equipos": "equipos.json",
  "packs": {
    "base": ["idle", "walk", "run", "jump", "hit"],
    "pelea": ["jab", "punch", "lift", "carry_walk", "throw_overhead", "carried", "thrown_spin"]
  },
  "pruebas": { "crosscountry": ["base", "pelea"] },
  "objetos": true,
  "animales": ["thor"],
  "ui": { "fuentes": { "idiomas": ["es", "en", "vi"] } }
}
```

| Campo | Qué es | Sin valor |
|---|---|---|
| `juego` | Nombre del juego. Va al manifiesto | Obligatorio |
| `resolucion` | `[ancho, alto]` interno del juego. Solo informa | No va |
| `celda` | Celda de los atletas: 32, 48 o 64. Un gigante usa la de su ficha (`cell`) | 48 |
| `filas` | Filas de las hojas, en orden. Un juego que espeja la izquierda con `flipX` pide 5 | Las 8 |
| `datos_por_cuadro` | `true` o la lista: `cajas`, `cuerpo`, `manos`, `cabeza`, `pies`, `carga`, `arma` | Sin datos |
| `fichas` | Carpeta con `*.ficha.json` del estudio. El id es el nombre del archivo. Personas y animales | |
| `personajes_incluidos` | Los que trae el motor: `familia` (de calle), `familia_rpg` (con su equipo de GG Abyss) o `heroes` | |
| `equipos` | Archivo de equipos (abajo). Pasa al manifiesto tal cual | Sin equipos |
| `packs` | Cada pack es un atlas por atleta: nombre y lista de animaciones | Obligatorio |
| `pruebas` | Qué packs carga cada prueba. Se copia al manifiesto para que el juego cargue solo lo que usa | No va |
| `retratos` | 8 expresiones en 40 y 96 px (la 8 es burla) | Sí |
| `cabecitas` | 12 x 12 para el minimapa, en `ui/cabecitas.png` | Sí |
| `objetos` | Armas del piso: `true` (las 19) o la lista | No van |
| `animales` | Ids de animales: de las fichas, o los que vienen con el motor: `thor` y las aves `gallo` y `paloma`. La mascota de un equipo entra sola | No van |
| `ui.fuentes` | `true` o `{ "idiomas": [...] }`: las tres fuentes bitmap con vietnamita | No van |
| `fx` | Efectos del catálogo general: `true` (los 56) o ids, bases y grupos. Ver abajo | No van |
| `audio` | `{ "sfx": [...], "musica": [...], "ambientes": [...] }` con los sonidos del motor, o `true` en cada sección. Ver abajo | No va |

Hace falta `fichas` o `personajes_incluidos`, o los dos. Las animaciones que se pueden pedir son las 142 del motor. El esquema [`kit-a-medida.schema.json`](kit-a-medida.schema.json) las trae todas, así que el editor las autocompleta.

### Equipos

```json
{
  "familia_gg": { "nombre": "Familia GG", "pais": "venezuela", "colores": ["#2a5bd7", "#f2c230"], "atletas": ["rick", "steph", "sophie", "alana"], "mascota": "thor" },
  "instituto_nekketsu": { "nombre": "Instituto Nekketsu", "pais": "japon", "colores": ["#353c58", "#d42a2a"], "atletas": ["kenji", "ryu", "goro", "tetsu"] }
}
```

Se revisa que cada atleta tenga ficha, que nadie esté en dos equipos y que la mascota exista. Cualquier otro campo (`pais`, `musica`, `bandera`...) pasa al manifiesto sin tocarlo.

### Efectos y audio

```jsonc
"fx": ["polvo", "golpe", "reaccion", "chapuzon", "aura_nekketsu"],     // grupos, bases o ids; true = todos
"audio": {
  "sfx": ["golpe", "critico", "esquiva", "paso_tierra_0", "silbato"],  // silbato llega con el lote H: aviso
  "musica": ["marcha_nekketsu"],                                       // llega con el lote H: aviso
  "ambientes": ["agua"]
}
```

- **Efectos:** cada uno sale en `fx/<id>.png` con su entrada en `manifest.fx`: tamaño, cuadros, fps, bucle, ancla, a qué se pega y si va delante o detrás. El catálogo, qué efecto va con qué evento y cómo se ponen en Phaser están en [EFECTOS.md](EFECTOS.md).
- **Audio:** los sonidos que ya tiene el motor, sintetizados, en WAV de 16 bits mono a 22050 Hz:
  - `sfx` (49): espadazo, golpe, critico, enemigo_dolor, enemigo_muere, jefe_rugido, jefe_pisoton, moneda, oro_mucho, pocion, curar, cofre_abrir, romper, portal, subir_nivel, paso, ladrido, aullido, mordida, recoger, legendario, click, abrir_inventario, error, jugador_dolor, magia, descubrir, secreto, elegir, guardado, arco, esquiva, bloqueo, thor_rescate y `paso_<pasto|tierra|piedra|madera|agua>_<0|1|2>`.
  - `musica` (4): bosque, jefe, victoria, titulo. En bucle.
  - `ambientes` (6): bosque, agua, noche, viento, cueva, magia. En bucle sin corte.
- **Qué sale del audio:** `audio/sfx/<n>.wav`, `audio/musica/<n>.wav` y `audio/ambiente/<n>.wav`, con `manifest.audio.<sección>.<n> = { archivo, duracion, bucle? }`. Cada sonido sale igual siempre, se pida solo o con otros.
- **Nombres que todavía no existen:** si un nombre se parece mucho a uno que existe, es un error con sugerencia (`ladridoo`: "¿Quisiste decir "ladrido"?"). Si no se parece a ninguno, es un sonido o efecto que llega después: se salta con aviso y queda en `manifest.pendiente`. Así el juego puede listar desde ya los sonidos del lote H (`golpe_1`, `silbato`, `marcha_nekketsu`...). Lo mismo con otras secciones de audio, como `voces`.

- **Escenarios oblicuos:** `"escenarios": "data/stages/"` (o una lista de layouts).
  - Cada layout pasa por las 9 pruebas y sale en `escenarios/<id>/`, con `manifest.escenarios.<id>` apuntando a su `escenario.json`.
  - Si una prueba falla, el kit no sale y el error dice cuál y por qué.
  - Las postales y la ficha de arte no van en el kit: se piden aparte con `npm run escenario -- <layout> <carpeta> --postales --ficha`.
  - Todo el detalle: [ESCENARIOS.md](ESCENARIOS.md).

### La pelea: comida, VS y público (lote P1)

```jsonc
"objetos": true,                    // las armas y la comida; o ["silla_plastica", "arepa"] o ["comida"]
"ui": { "vs_fondo": true },         // la pantalla del VS
"publico": { "azoteas": true }      // o { "azoteas": { "ancho": 320, "gente": 16 } }
```

- **Comida** (`arepa`, `tequeno`, `empanada`, `banh_mi`, `pan_de_bono`): va en `objetos`, después de las armas, con `peso: "comida"`, `cura` de 1 a 3 y su propio atlas `objetos/comida.json` en celdas de 16. Cuadros `<id>_quieto_0` y `<id>_humito_0..3`, con la sombra ya dibujada y la base en el pivote (8, 14).
- **VS** (`ui.vs_fondo`): `ui/vs/<a>__<b>.png` para cada par de equipos (en el orden del archivo de equipos), `ui/vs/neutro.png` y `ui/vs/letras.png` aparte, para estrellarlas con tu propio rebote. El color de cada lado es el primero del equipo, salvo que sea muy oscuro; si los dos quedan del mismo tono, el de la derecha usa otro color suyo. Si el par va al revés, voltea la imagen.
- **Retrato `burla`:** los retratos traen una octava expresión, `burla` (guiño con la ceja fruncida y media sonrisa). En la hoja va al final, así que `grande_burla` es el grande número 7.
- **Público de azoteas** (`publico.azoteas`): `publico/azoteas.png` y `publico/azoteas_noche.png`. Una fila por estado (`quieto`, `celebra`, `abuchea`), 4 cuadros por fila. La gente se asoma detrás del muro de la azotea vecina, que ocupa las `muro` filas de abajo. Los hinchas por país (`publico.paises`) llegan con C6 y vuelven como aviso.

- **Vehículos** (`vehiculos`, lote D2): `true` o una lista de ids (`"moto"` = los 4 colores). Cada uno sale en `vehiculos/<id>.png`, una tira de cuadros de `w` × `h`, en la vista inclinada del escenario (`px = x + 0.35 y`, con la cara izquierda a la vista). El manifiesto trae:
  - `ancla`: dónde cae en el cuadro la esquina de atrás a la izquierda de la huella, en el piso. El juego pone ahí el (x, y) del vehículo.
  - `huella` (`w`, `d`, `z`): el ferry es de 110 × 40 y 12 de alto, como el gris del juego.
  - `anims` con `desde`, `cuadros`, `fps` y `loop`.
  - `mira` en los que van de frente: el espejo no sirve, porque se vería la cara de la derecha.

  Hoy hay `ferry` (`andando`, `atracado`), `xich_lo` (`andando`), `moto_rojo`, `moto_azul`, `moto_amarillo` y `moto_verde` (`andando`, `frenando`, `corneta`), `bote_bambu` (`meciendo`), `metrocable` (`colgando`), `jacintos` (`flotando`) y `frutas_regadas`. Los demás del pedido vuelven como aviso.

- **NPC, la gente de la calle** (`npc`, lote C6a):

  ```jsonc
  "npc": {
    "fichas": "npc/",                    // carpeta con las fichas de los NPC: no son atletas
    "pelota": true,                      // npc/pelota.png: 8 x 8, 4 cuadros de giro
    "personajes": {
      "bailarin_1": { "anims": ["toprock", "molino", "reclama"] },
      "grafitero": { "anims": ["pintar", "mirar"], "vistas": { "pintar": "espalda_tres_cuartos" } },
      "vendedor_paletas": { "anims": ["llamar", "ofrecer"], "vista": "tres_cuartos" },
      // un grupo en un solo sprite, uno al lado del otro, con el parlante
      "musicos": { "grupo": { "rapero": { "tocar": "rapear", "animar": "animar" }, "percusionista": { "tocar": "tamborear", "animar": "animar" } }, "parlante": true }
    }
  }
  ```
  - Cada NPC sale en `npc/<id>.png`, **una tira** con todos los cuadros de sus animaciones seguidas, de `w` × `h`. El manifiesto trae `ancla` (el pixel de los pies: ahí va el (x, y) del NPC), `anims` con `desde`, `cuadros`, `fps`, `loop` y `vista`, y `eventos` donde hay algo que hacer: en `patear`, `{ "tipo": "impacto", "cuadro": 2 }` es cuando el pie le pega a la pelota y el juego la suelta.
  - **Vistas:** `frente` (por defecto), `tres_cuartos` (hacia la calle), `espalda` y `espalda_tres_cuartos` (el grafitero contra su muro). No se espejan.
  - **`anims`** es una lista de animaciones del motor, o `{ "nombre_en_el_juego": "animación" }` para ponerles otro nombre.
  - **Las animaciones de la calle** (pack `calle`): `toprock`, `molino` y `reclama` (break); `espera`, `patear` y `perdon` (fútbol de la calle); `pintar` y `mirar` (grafitero, con la lata de spray); `rapear` (micrófono), `tamborear` (tambora) y `animar`; `llamar` (campanita) y `ofrecer` (paleta). Sirve cualquier otra animación del motor.
  - Una ficha que no está o una animación que no existe se salta con aviso.

### Las aves (lote C7b)

`"animales": ["gallo", "paloma"]` trae las aves del motor, sin ficha. Salen en la misma sección `animales` del manifiesto, con `tipo: "ave"`, pero no en atlas: cada ave es una tira, como los NPC.

```jsonc
"gallo": {
  "nombre": "Gallo", "tipo": "ave", "imagen": "animales/gallo.png", "w": 32, "h": 32, "ancla": [17, 30], "vista": "lado", "cuadros": 24,
  "anims": { "idle": { "desde": 0, "cuadros": 4, "fps": 4, "loop": true }, "asustarse": { "desde": 14, "cuadros": 4, "fps": 10, "loop": false, "aire": [0, 4, 5, 0] } },
  "eventos": { "cantar": [{ "tipo": "canto", "cuadro": 3 }], "asustarse": [{ "tipo": "aleteo", "cuadro": 1 }] }
}
```

- **De lado, mirando a la derecha.** Para la izquierda se espejan (`setFlipX`) con el ancla en las patas.
- **El cuadro `i` va en `x = i * w`.** Cada animación empieza en `desde` y dura `cuadros`.
- **Se quedan en su sitio.** El juego mueve al ave. `aire` dice cuántos pixeles va el ave sobre el ancla en cada cuadro: el salto del gallo, el despegue y el vuelo de la paloma.
- **El gallo** (celda 32, rojo con la capa dorada y la cola negra con brillo verde):
  - `idle` y `caminar` en bucle, y `picotear`.
  - `cantar` lleva el evento `canto` en el cuadro 3.
  - `asustarse`: salta, aletea y cae en el mismo sitio.
- **La paloma** (celda 16, gris azulada con el cuello tornasol):
  - `idle`, `caminar` (cabeceando) y `volar` en bucle, y `picotear`.
  - `despegar` y `aterrizar`: el juego la hace despegar, la mueve volando y la devuelve.
- **El esqueleto de ave es general** (`rig/ave.ts`): cada especie es una plantilla con su celda, sus medidas y sus colores. La garza, la guacamaya y el colibrí se suman como plantillas.

### Lo que todavía no genera

`publico.paises`, `ui.logo` y los sonidos nuevos del lote H se aceptan en la configuración, pero todavía no se generan. El kit sale igual, avisa en la consola y deja la lista en `manifest.pendiente`, para que el juego sepa qué le falta:

```
aviso: animales sin ficha (se saltan; las especies nuevas llegan con el lote C7): chiguire
aviso: audio.musica: todavía no existen, llegan con el lote H: marcha_nekketsu
```

Cada sección se irá sumando con su lote, sin cambiar la configuración del juego.

### Errores claros

Si algo está mal, no se genera nada. Sale la lista completa, con la ruta del campo y la sugerencia cuando hay un nombre mal escrito:

```
La configuración del kit tiene 3 problemas:
  packs.base[1]: "wlak" no es una animación. ¿Quisiste decir "walk"?
  pruebas.calle[0]: el pack "bse" no está en packs. ¿Quisiste decir "base"?
  equipos.familia_gg.atletas[1]: no hay ficha de "stpeh". ¿Quisiste decir "steph"?
```

## Qué sale

```
kit/
  manifest.json
  CREDITOS.txt
  atletas/<id>/<pack>.png + .json     atlas del pack, JSON Hash de TexturePacker
  atletas/<id>/retratos.png
  animales/<id>.png + .json          los cuadrúpedos en atlas; las aves (tipo "ave") solo la tira .png
  objetos/armas.png + .json
  ui/cabecitas.png
  ui/fuentes/<fuente>.png + .fnt
  fx/<id>.png                         efectos
  audio/sfx/<n>.wav  audio/musica/<n>.wav  audio/ambiente/<n>.wav
```

El manifiesto sigue el contrato del kit:

```jsonc
{
  "juego": "Nekketsu Olympic GG", "generado_con": "PixelForja", "version": 1, "tipo": "kit a medida",
  "resolucion": [640, 360], "celda": 48, "filas": ["right", "down_right", "up_right", "down", "up"],
  "equipos": { "familia_gg": { "nombre": "Familia GG", "atletas": ["rick", "..."], "mascota": "thor" } },
  "atletas": {
    "rick": {
      "nombre": "Rick", "equipo": "familia_gg", "celda": 48, "pivote": [24, 46], "numero": "7",
      "packs": { "pelea": { "atlas": "atletas/rick/pelea.json", "imagen": "atletas/rick/pelea.png",
                            "anims": { "jab": { "cuadros": 6, "fps": 16, "loop": false, "eventos": [], "cajas": [], "manos": [] } } } },
      "retratos": { "archivo": "atletas/rick/retratos.png", "chico": 40, "grande": 96, "expresiones": ["neutral", "..."] },
      "cabecita": "ui/cabecitas.png#rick"
    }
  },
  "pruebas": { "crosscountry": ["base", "pelea", "armas", "natacion"] },
  "cabecitas": { "archivo": "ui/cabecitas.png", "celda": 12, "orden": ["alana", "goro", "..."] },
  "objetos": { "chancleta": { "atlas": "objetos/armas.json", "anims": { "quieto": 1, "girando": 8, "mano": 16 } } },
  "animales": { "thor": { "nombre": "Thor", "celda": 48, "atlas": "animales/thor.json", "anims": { "idle": {} } } },
  "fx": { "chispa_golpe_medio": { "archivo": "fx/chispa_golpe_medio.png", "celda": 24, "cuadros": 5, "fps": 18, "ancla": [12, 12], "se_pega_a": "mano", "capa": "frente" } },
  "ui": { "fuentes": { "fuente_ui": { "png": "ui/fuentes/fuente_ui.png", "fnt": "ui/fuentes/fuente_ui.fnt" } } },
  "audio": { "sfx": { "golpe": { "archivo": "audio/sfx/golpe.wav", "duracion": 0.17 } }, "ambientes": { "agua": { "archivo": "audio/ambiente/agua.wav", "duracion": 12, "bucle": true } } },
  "creditos": "CREDITOS.txt",
  "notas": ["..."]
}
```

Los campos de cada animación (`eventos`, `avance`, `elevacion`, `desplazamiento`, `agua`, `cajas`, `cuerpo`, `manos`, `cabeza`, `pies`, `carga`, `arma`) son los del kit deportivo: [KIT_DEPORTES.md](KIT_DEPORTES.md#datos-por-cuadro-atlas-retratos-y-vestuario). Todos los datos por cuadro van como `[fila][cuadro]`, en pixeles desde el pivote.

Garantías, cada una con su prueba (`src/engine/__tests__/custom.test.ts`):
- No falta ningún archivo que nombre el manifiesto, y no sobra ninguno.
- Ninguna imagen pasa de 4096 px. La más grande del ejemplo mide 1600.
- Cada animación trae un cuadro de atlas por fila y cuadro, y sus datos en `[fila][cuadro]`.
- El kit completo de ejemplo (24 atletas en 6 equipos) se genera en menos de 3 minutos. Hoy tarda unos 2.

## En Phaser

Cargar el kit desde el manifiesto, solo los packs de la prueba que se va a jugar:

```js
const KIT = 'assets/kit/';

class Carga extends Phaser.Scene {
  preload() { this.load.json('kit', KIT + 'manifest.json'); }
  create() {
    const m = this.cache.json.get('kit');
    const prueba = 'crosscountry';
    for (const [id, a] of Object.entries(m.atletas))
      for (const pack of m.pruebas[prueba]) {
        const p = a.packs[pack];
        this.load.atlas(`${id}_${pack}`, KIT + p.imagen, KIT + p.atlas);
      }
    for (const [id, a] of Object.entries(m.animales ?? {}))
      if (a.tipo === 'ave') this.load.spritesheet(id, KIT + a.imagen, { frameWidth: a.w, frameHeight: a.h });
      else this.load.atlas(id, KIT + a.imagen, KIT + a.atlas);
    if (m.objetos) this.load.atlas('armas', KIT + 'objetos/armas.png', KIT + 'objetos/armas.json');
    for (const [id, f] of Object.entries(m.ui?.fuentes ?? {})) if (f.png) this.load.bitmapFont(id, KIT + f.png, KIT + f.fnt);
    for (const [id, e] of Object.entries(m.fx ?? {})) this.load.spritesheet(`fx_${id}`, KIT + e.archivo, { frameWidth: e.w, frameHeight: e.h });
    for (const sec of Object.values(m.audio ?? {})) for (const [n, a] of Object.entries(sec)) this.load.audio(n, KIT + a.archivo);
    this.load.once('complete', () => { crearAnimaciones(this, m, prueba); this.scene.start('Prueba'); });
    this.load.start();
  }
}

// una animación de Phaser por atleta, animación y fila: rick_jab_right, rick_jab_down...
function crearAnimaciones(scene, m, prueba) {
  for (const [id, a] of Object.entries(m.atletas))
    for (const pack of m.pruebas[prueba])
      for (const [nombre, an] of Object.entries(a.packs[pack].anims))
        for (const fila of m.filas)
          scene.anims.create({
            key: `${id}_${nombre}_${fila}`,
            frames: scene.anims.generateFrameNames(`${id}_${pack}`, { prefix: `${nombre}_${fila}_`, start: 0, end: an.cuadros - 1 }),
            frameRate: an.fps, repeat: an.loop ? -1 : 0,
          });
  // las aves: una animación por nombre, de la tira (gallo_cantar, paloma_volar...)
  for (const [id, a] of Object.entries(m.animales ?? {})) if (a.tipo === 'ave')
    for (const [nombre, an] of Object.entries(a.anims))
      scene.anims.create({ key: `${id}_${nombre}`, frames: scene.anims.generateFrameNumbers(id, { start: an.desde, end: an.desde + an.cuadros - 1 }), frameRate: an.fps, repeat: an.loop ? -1 : 0 });
}
```

El pivote es la base del personaje. Con `setOrigin` en el pivote, la posición del sprite es donde pisa:

```js
const a = m.atletas.goro;                                  // el gigante: celda 64
const goro = scene.add.sprite(x, y, 'goro_base').setOrigin(a.pivote[0] / a.celda, a.pivote[1] / a.celda);
```

Las 5 filas miran a la derecha. Para la izquierda se usa la misma fila con `flipX`:

```js
const FILA = { right: 'right', left: 'right', down_right: 'down_right', down_left: 'down_right', up_right: 'up_right', up_left: 'up_right', down: 'down', up: 'up' };
sprite.play(`${id}_${nombre}_${FILA[dir]}`).setFlipX(dir.endsWith('left'));
```

El hurtbox sale de `cuerpo`, que no incluye armas, pelotas ni chispas. Al espejar, la `x` pasa a `-(x + w)`:

```js
const an = a.packs.pelea.anims[nombre];
const [x, y, w, h] = an.cuerpo[filaIdx][sprite.anims.currentFrame.index - 1];
const hurt = new Phaser.Geom.Rectangle(sprite.x + (sprite.flipX ? -(x + w) : x), sprite.y + y, w, h);
```

El arma en la mano y lo que se carga los compone el juego. Los detalles están en [KIT_DEPORTES.md](KIT_DEPORTES.md#levantar-llevar-y-lanzar):

```js
const [x, y, ang, detras] = an.arma[filaIdx][cuadro];
arma.setTexture('armas', `paraguas_mano_${Math.round(ang / 22.5) % 16}`).setPosition(sprite.x + x, sprite.y + y).setDepth(sprite.depth + (detras ? -1 : 1));
```

Los colores del equipo, para el HUD y la selección:

```js
const eq = m.equipos[m.atletas.rick.equipo];
scene.add.rectangle(0, 0, 120, 8, Phaser.Display.Color.HexStringToColor(eq.colores[0]).color);
scene.add.bitmapText(8, 8, 'fuente_ui', eq.nombre.toUpperCase()).setScale(2);
```

## El visor

`visor.html` (en el sitio, junto a la arena) recorre un kit con los datos dibujados encima:
- **Arriba:** los personajes agrupados por equipo, los packs en pestañas y un tablero con todas las animaciones del pack moviéndose.
- **En el centro:** la animación elegida en todas sus filas.
- **Los datos:** se prenden y apagan por separado. Cajas en verde, cuerpo en azul punteado, manos en amarillo, cabeza en rojo, pies en cian, carga en morado, arma en naranja, la línea del agua, los eventos del cuadro con su `punto` y el pivote. La mano o el pie cercano va relleno y el lejano hueco.
- **Las armas:** compone el arma elegida en la mano tal como lo haría el juego. Es la referencia viva de ese cálculo.
- **Controles:** pausa, cuadro a cuadro (← →), cambiar de animación (↑ ↓), velocidad y zoom. El enlace guarda el personaje, el pack y la animación.

Lee el kit de ejemplo publicado junto a la página, cualquier carpeta con `?kit=<carpeta>/`, o una carpeta del equipo con **Abrir otro kit**. No importa nada del motor: lee el kit como lo leería un juego, así que si algo falta ahí, le falta al kit.

```bash
npm run build:sitio && npx vite preview      # http://localhost:4173/visor.html
```

## Ejemplos

| Configuración | Qué arma |
|---|---|
| [`ejemplos/nekketsu/kit.config.json`](ejemplos/nekketsu/kit.config.json) | Nekketsu Olympic GG: los 6 equipos (24 atletas), 8 packs (con `recorridos` y `trepar`), armas, Thor, fuentes con vietnamita, los 63 efectos, la pelea de azotea (pack `kachinuki`, comida, VS y público) y los sonidos del motor que le sirven |
| [`ejemplos/kit-deportivo.config.json`](ejemplos/kit-deportivo.config.json) | El kit deportivo de siempre (`npm run deportes`): la familia y los héroes con los 6 packs de deporte |
| [`ejemplos/gg-abyss.config.json`](ejemplos/gg-abyss.config.json) | Los personajes de GG Abyss: la familia con su equipo, las 21 animaciones RPG, retratos, Thor, fuentes y todo el audio |

Una prueba revisa que los packs de esas configuraciones sean los mismos que usan `npm run deportes` y `npm run kit`. GG Abyss no se expresa completo todavía. Los enemigos, el jefe, el botín, las armaduras de Thor y el mundo siguen en `npm run kit` hasta la versión completa del kit a medida.

## Límites honestos

- **Versión inicial.** Arma atletas, retratos, cabecitas, armas del piso, animales con ficha, fuentes, efectos y los sonidos del motor. Escenarios, público, NPC, vehículos, logo y los sonidos nuevos llegan con sus lotes, y mientras tanto vuelven como aviso.
- **Animales nuevos.** Solo salen los que tienen ficha, más Thor. Las especies nuevas (chigüire, perro de la calle...) llegan con el lote C7.
- **Celda mixta.** Cada atleta usa la celda de la configuración salvo que su ficha diga otra (un gigante en 64). Un pack no mezcla celdas: cada atlas es de un solo atleta.
- **Tiempo.** Crece con atletas x animaciones. 8 atletas con 52 animaciones tardan unos 80 segundos en una máquina de 4 núcleos. Para iterar está `--rapido`.
