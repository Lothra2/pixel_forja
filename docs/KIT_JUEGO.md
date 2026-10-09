# Kit del juego Legado GG

PixelForja genera todos los assets del juego con un comando. Sin IA, sin red, todo sale del código. El juego (repo `legado-gg`) solo lee la carpeta del kit y su `manifest.json`.

```bash
npm run kit -- <carpeta>                       # kit completo, unos 50 s, ~350 archivos, ~9 MB
npm run kit -- <carpeta> --rapido              # 5 animaciones por personaje, para probar
npm run kit -- <carpeta> --fichas <carpeta>    # usa personajes editados en el estudio
```

El script borra y vuelve a llenar la carpeta de salida. Se niega a borrar una carpeta que tenga cosas y no sea un kit de PixelForja.

## Cómo se conectan los dos proyectos

```
legado-gg/                     el juego (Phaser 3 + TypeScript + Vite)
  tools/pixel_forja/           PixelForja como submódulo de git (solo para regenerar)
  fichas/                      personajes editados en el estudio (*.ficha.json), opcional
  public/assets/kit/           el kit generado, SE COMMITEA en el juego
```

1. Una sola vez, en `legado-gg`:
   ```bash
   git submodule add https://github.com/Lothra2/pixel_forja tools/pixel_forja
   cd tools/pixel_forja && npm ci && cd ../..
   ```
2. En el `package.json` del juego:
   ```json
   "kit": "tsx tools/pixel_forja/scripts/game-kit.ts public/assets/kit --fichas fichas"
   ```
3. Cada vez que cambien personajes o PixelForja mejore: `git submodule update --remote tools/pixel_forja`, luego `npm run kit` y commit del kit.

El kit va commiteado en el juego a propósito. Así Netlify compila el juego sin tener que correr PixelForja, y si PixelForja cambia algo que no te gusta, el juego sigue igual hasta que regeneres.

### Editar un personaje y llevarlo al juego

1. En el estudio abre el preset (por ejemplo "Sophie" en su versión RPG) y cámbiale lo que quieras.
2. Botón "Exportar ficha". Baja `Sophie.ficha.json`.
3. Guárdala en `legado-gg/fichas/sophie.ficha.json` y corre `npm run kit`.

El nombre del archivo es el id en el juego. `rick`, `steph`, `sophie` y `alana` reemplazan a su preset. Cualquier otro nombre entra como heroína nueva (por ejemplo `prima.ficha.json` crea `personajes/prima_*.png`). En el manifest esos personajes llevan `desde_estudio: true`.

Límite honesto: la armadura que evoluciona se ve en Thor (6 niveles exportados) y en los íconos del botín. En las heroínas el kit exporta su traje de clase. Exportar cada heroína con los 5 niveles de armadura multiplica las hojas por 5, queda para cuando el juego lo pida.

## Qué trae

| Carpeta | Qué hay |
|---|---|
| `personajes/` | Rick, Steph, Sophie, Alana: 21 animaciones en 8 direcciones, celda 48. Retratos 40x40 |
| `mascota/` | Thor sin armadura (11 animaciones) y con armadura nivel 1 a 5 (6 animaciones cada uno) |
| `enemigos/` | rata, calabaza, goblin_arquero, trol (celda 48) y minotauro jefe (celda 64, con carga, pisotón y salto) |
| `fx/` | 66 efectos: proyectil en 8 direcciones, impacto y nova para fuego, hielo, rayo, veneno, sagrado y arcano. Tajo, curar, escudo de Thor, aura de nivel, grito de guerra, círculo mágico |
| `botin/` | 393 objetos en atlas de 32 y 64 px, legendarios animados (8 cuadros), cofres, monedas, haz de luz por rareza, objetos que caen. `catalogo.json` con stats |
| `mundo/` | tileset 32 px, mapa del Mundo 1 en Tiled JSON, 27 objetos con anclaje y colisión, vista previa del mapa |
| `ui/` | orbes, paneles 9-slice, casilleros con silueta, inventario completo, cinturón, barras, estandarte, íconos, cursores, números de daño |
| `audio/` | 26 efectos y 3 temas (bosque, jefe, victoria) en WAV 22 kHz |
| `CREDITOS.txt` | créditos de las piezas LPC. Hay que mostrarlos en el juego |

Ninguna textura pasa de 4096 px (límite de tablets). El kit lo verifica y falla si alguna se pasa.

## manifest.json

```jsonc
{
  "juego": "Legado GG", "generado_con": "PixelForja", "version": 1,
  "cuadro_mundo": 32,
  "direcciones": ["down","down_left","left","up_left","up","up_right","right","down_right"],
  "personajes": {
    "rick": {
      "tipo": "heroe", "nombre": "Rick", "clase": "paladin", "retrato": "personajes/retrato_rick.png",
      "celda": 48, "pivote": [24, 46],
      "anims": { "walk": { "archivo": "personajes/rick_walk.png", "cuadros": 8, "fps": 10, "loop": true }, ... }
    },
    "minotauro": { "tipo": "jefe", "celda": 64, ... },
    "thor_armadura3": { "tipo": "mascota", ... }
  },
  "fx": { "nova_fuego": { "archivo": "fx/nova_fuego.png", "cuadros": 10, "fps": 16, "loop": false, "celda": 48 }, ... },
  "botin": { "atlas": { "iconos": {"32": "botin/iconos_32.json", "64": ...}, "especiales": {...}, "armadura_n5": {...} },
             "mundo": "botin/mundo.json", "catalogo": "botin/catalogo.json" },
  "mundo": { "mapa": "mundo/mundo1_bosque.json", "tileset": "mundo/mundo1_tiles.png", "layout": {...},
             "objetos": { "portal_azul": { "w": 64, "h": 96, "apoyo": [32, 92], "solido": null, "anims": { "girar": {...} } } } },
  "ui": { "panel": { "archivo": "ui/panel.png", "w": 48, "h": 48, "cuadros": 1, "nueve": [12,12,12,12] },
          "inventario": { "archivo": "ui/inventario.png", "w": 280, "h": 410, "layout": {...} },
          "numeros": { "archivo": "ui/numeros.png", "w": 7, "h": 9, "caracteres": "0123456789+-!", "filas": ["blanco","amarillo","rojo","verde","azul"] } },
  "audio": { "moneda": "audio/moneda.wav", "musica_bosque": "audio/musica_bosque.wav", ... }
}
```

Todas las rutas son relativas a la carpeta del kit.

### Hojas de personajes

Un PNG por animación. Fila = dirección en el orden de `direcciones`. Columna = cuadro. Ancho = `cuadros * celda`, alto = `8 * celda`.

```ts
// Phaser: cargar
this.load.spritesheet(`${id}_${anim}`, kit + a.archivo, { frameWidth: p.celda, frameHeight: p.celda });

// Phaser: crear una animación por dirección
DIRS.forEach((dir, row) => this.anims.create({
  key: `${id}_${anim}_${dir}`,
  frames: this.anims.generateFrameNumbers(`${id}_${anim}`, { start: row * a.cuadros, end: row * a.cuadros + a.cuadros - 1 }),
  frameRate: a.fps, repeat: a.loop ? -1 : 0,
}));

// el sprite se para en sus pies
sprite.setOrigin(p.pivote[0] / p.celda, p.pivote[1] / p.celda);

// dirección desde un vector de movimiento (y hacia abajo en pantalla)
const deg = (Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 360) % 360;
const dir = DIRS[Math.round(((deg - 90 + 360) % 360) / 45) % 8];
```

### Mapa (Tiled)

`mundo/mundo1_bosque.json` es un mapa ortogonal de 48 x 32 cuadros de 32 px. Se puede abrir y editar en Tiled.

| Capa | Tipo | Uso |
|---|---|---|
| `suelo` | tiles | pasto, flores, camino y agua con bordes automáticos |
| `colision` | tiles | invisible. Cualquier tile distinto de 0 es sólido (agua, troncos de árboles, piedras, fogata) |
| `objetos` | puntos | decoración. Propiedad `sprite` = nombre en `manifest.mundo.objetos`. `x, y` = punto de apoyo en pixeles |
| `entidades` | puntos | `jugador_inicio`, `thor_inicio`, `portal_llegada`, `enemigo` (prop `enemigo`), `cofre` (prop `nivel`, `tras_jefe`), `rompible` (prop `objeto`), `jefe` (props `enemigo`, `nombre`), `portal_jefe` (props `color`, `destino`), `cartel` (prop `texto`) |

Propiedades del mapa: `bioma` y `musica`.

```ts
this.load.tilemapTiledJSON('mundo1', kit + 'mundo/mundo1_bosque.json');
this.load.image('mundo1_tiles', kit + 'mundo/mundo1_tiles.png');
this.load.image('colision', kit + 'mundo/colision.png');

const map = this.make.tilemap({ key: 'mundo1' });
const suelo = map.createLayer('suelo', map.addTilesetImage('mundo1_tiles', 'mundo1_tiles')!)!;
const col = map.createLayer('colision', map.addTilesetImage('colision', 'colision')!)!.setVisible(false);
col.setCollisionByExclusion([-1, 0]);
```

Objetos del mundo: `sprite.setOrigin(apoyo[0] / w, apoyo[1] / h)` y `setDepth(y)` para que lo de abajo tape lo de arriba. `solido` es un rectángulo `[dx, dy, w, h]` relativo al apoyo, por si quieres colisión más fina que la capa `colision`.

El agua trae 4 cuadros de animación por tile (`tiles[].animation` en el JSON, 260 ms). Phaser no anima tiles de Tiled solo: hay que cambiar los índices cada 260 ms con un timer. `manifest.mundo.layout.water[f][mask]` dice qué tile corresponde a cada cuadro.

### Botín

Hay tres atlas de íconos, cada uno en 32 y 64 px, en formato JSON Hash de TexturePacker:

| Atlas | Qué tiene |
|---|---|
| `iconos` | objetos normales, mágicos y raros, un cuadro cada uno |
| `especiales` | legendarios únicos y set Legado GG, 8 cuadros de brillo |
| `armadura_n5` | armaduras de nivel 5 (legendarias), 8 cuadros |

```ts
for (const [g, by] of Object.entries(manifest.botin.atlas))
  this.load.atlas(`${g}32`, kit + by['32'].replace('.json', '.png'), kit + by['32']);
```

`catalogo.json` trae `rarities` (color por rareza), `sets` (bonos del set Legado GG) e `items`. Cada item:

```json
{ "id": "sword_1", "name": {"es": "Espada", "en": "Sword"}, "rarity": "normal", "level": 1,
  "base": {"cat": "weapon", "icon": "sword"}, "stats": {"damage": [3, 8], "speed": 1.2, "mods": []},
  "icon": "sword_1", "animated": false, "atlas": "iconos" }
```

`atlas` dice en qué atlas está e `icon` es el nombre del cuadro. Si `animated` es true, los cuadros son `<icon>_0` a `<icon>_7`. Hay 393 objetos: 109 armas, 145 piezas de armadura, 34 escudos y similares, 30 pociones, 35 gemas, 12 runas, 13 joyas, 10 consumibles y 5 armaduras para Thor. En `mundo.json` todo viene en cuadros numerados `_N`: `cofre_<madera|reforzado|dorado|legendario>_quieto_N` (brillo en reposo), `cofre_<nivel>_abrir_N`, `moneda_gira_N`, `oro_<small|medium|large|huge>_N`, `lluvia_de_oro_N`, `haz_<rareza>_N` y `cae_<único>_N` (el objeto cayendo al piso, solo para únicos y set. Para el resto basta un tween del ícono).

### Interfaz

- Paneles con `nueve`: `this.add.nineslice(x, y, 'panel', 0, ancho, alto, ...nueve)`.
- Orbes: 11 cuadros, cuadro N = vida al N*10 %. `orbe_*_ola` son 4 cuadros para animar la superficie.
- Números de daño: `numeros.png` es una rejilla de 13 columnas (`caracteres`) por 5 filas (`filas`, un color por fila), celdas de 7x9. Sirve como `RetroFont` o recortando cuadros.
- `inventario.png` (280 x 410) ya trae dibujados los casilleros. `layout` dice dónde va cada cosa:
  - `equipo`: `casco, amuleto, pecho, arma, mano_libre, guantes, cinturon, botas, anillo_1, anillo_2, mascota, retrato` como `[x, y, w, h]`.
  - `rejilla`: `{ x, y, cols: 7, filas: 4, celda: 36 }`. Un objeto por casilla.
  - `oro.texto`: donde escribir la cantidad. `titulo`: franja de arriba.
- `boton` tiene 3 cuadros: normal, encima, presionado.

### Audio

WAV mono 16 bits a 22050 Hz. Efectos cortos y música para loop. En tablets el audio arranca solo después del primer toque del usuario, así que la pantalla de inicio debe pedir un toque.

Lo que no se pudo verificar: los sonidos están chequeados por forma (duración, sin saturar, WAV válido) pero nadie los escuchó todavía. Si alguno suena feo se cambia su receta en `src/engine/audio/sfx.ts`.
