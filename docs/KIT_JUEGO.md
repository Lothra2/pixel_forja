# Kit del juego GG Abyss

PixelForja genera todos los assets del juego con un comando. Sin IA, sin red, todo sale del código. El juego (repo `gg-abyss`) solo lee la carpeta del kit y su `manifest.json`.

```bash
npm run kit -- <carpeta>                       # kit completo, unos 50 s, ~350 archivos, ~9 MB
npm run kit -- <carpeta> --rapido              # 5 animaciones por personaje, para probar
npm run kit -- <carpeta> --fichas <carpeta>    # usa personajes editados en el estudio
```

El script borra y vuelve a llenar la carpeta de salida. Se niega a borrar una carpeta que tenga cosas y no sea un kit de PixelForja.

## Cómo se conectan los dos proyectos

```
gg-abyss/                     el juego (Phaser 3 + TypeScript + Vite)
  tools/pixel_forja/           PixelForja como submódulo de git (solo para regenerar)
  fichas/                      personajes editados en el estudio (*.ficha.json), opcional
  public/assets/kit/           el kit generado, SE COMMITEA en el juego
```

1. Una sola vez, en `gg-abyss`:
   ```bash
   git submodule add -b claude/perfeccionar-ejecucion-smh3ad https://github.com/Lothra2/pixel_forja tools/pixel_forja
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
3. Guárdala en `gg-abyss/fichas/sophie.ficha.json` y corre `npm run kit`.

El nombre del archivo es el id en el juego. `rick`, `steph`, `sophie` y `alana` reemplazan a su preset. Cualquier otro nombre entra como heroína nueva (por ejemplo `prima.ficha.json` crea `personajes/prima_*.png`). En el manifest esos personajes llevan `desde_estudio: true`.

Límite honesto: la armadura que evoluciona se ve en Thor (6 niveles exportados) y en los íconos del botín. En las heroínas el kit exporta su traje de clase. Exportar cada heroína con los 5 niveles de armadura multiplica las hojas por 5, queda para cuando el juego lo pida.

## Qué trae

| Carpeta | Qué hay |
|---|---|
| `personajes/` | Rick, Steph, Sophie, Alana: 21 animaciones en 8 direcciones, celda 48. Retratos 40x40 |
| `mascota/` | Thor sin armadura y con armadura nivel 1 a 5, las 12 animaciones en todos (idle, walk, run, bite, bark, howl, pickup, hurt, die, sit, wag, dig). `dig` es cavar en bucle: con `fx.tierra_cavada` encima para desenterrar algo. Thor va en movimiento premium: proporciones de bóxer, paso en cuatro tiempos, galope con vuelo, pivote fijo, y en el manifiesto `eventos` (cada pisada, `impacto` en la mordida y al recoger, `suelta` en el ladrido y el aullido) y `avance` de `walk` y `run` para que las patas no patinen |
| `enemigos/` | rata, calabaza y goblin_arquero (celda 48), trol élite (celda 64, pivote [32, 62], más alto y ancho, garrote grande) y minotauro jefe (celda 96, pivote [48, 93]: llena la pantalla. Se dibuja en 64 y se agranda x1.5 a la manera de RotSprite, sin colores nuevos. Con carga, pisotón y salto) |
| `fx/` | 86 efectos: proyectil en 8 direcciones, impacto y nova para fuego, hielo, rayo, veneno, sagrado, arcano y naturaleza (verde esmeralda con hojas y pétalos, la magia de Alana). La flecha (`proyectil_flecha_<dir>`, 2 cuadros a 14 fps, y `impacto_flecha`, 5 cuadros de astillas). `onda_pisoton` (celda 96, 8 cuadros: grietas y anillo de polvo del pisotón del minotauro) y `tierra_cavada` (celda 48, 6 cuadros). Tajo, curar, escudo de Thor, aura de nivel, grito de guerra, círculo mágico |
| `botin/` | 393 objetos en atlas de 32 y 64 px, legendarios animados (8 cuadros), cofres, monedas, haz de luz por rareza, objetos que caen. `catalogo.json` con stats |
| `mundo/` | el Bosque GG (bosque hechizado, sombrío): 120 x 90 cuadros (3840 x 2880 px, unas 22 pantallas) con el suelo pintado en 12 trozos, agua animada, árboles estilo Stardew con viento, árboles hechizados que despiertan, criaturas (cuervos, murciélagos, ojos, fuegos fatuos), bruma en 2 capas, 13 partículas, luz y nube, 8 postales y la vista del mapa |
| `ui/` | orbes, paneles 9-slice, casilleros con silueta, inventario completo, cinturón, barras, estandarte, íconos, cursores, números de daño |
| `audio/` | 26 efectos, 3 temas (bosque, jefe, victoria) y 6 ambientes en bucle (bosque, agua, noche, viento, cueva, magia) en WAV 22 kHz |
| `CREDITOS.txt` | créditos de las piezas LPC. Hay que mostrarlos en el juego |

Ninguna textura pasa de 4096 px (límite de tablets). El kit lo verifica y falla si alguna se pasa.

## manifest.json

```jsonc
{
  "juego": "GG Abyss", "generado_con": "PixelForja", "version": 1,
  "cuadro_mundo": 32,
  "direcciones": ["down","down_left","left","up_left","up","up_right","right","down_right"],
  "personajes": {
    "rick": {
      "tipo": "heroe", "nombre": "Rick", "clase": "paladin", "retrato": "personajes/retrato_rick.png",
      "celda": 48, "pivote": [24, 46],
      "perfil_movimiento": "premium",
      "anims": {
        "walk": { "archivo": "personajes/rick_walk.png", "cuadros": 8, "fps": 10, "loop": true,
                  "eventos": [{ "tipo": "paso", "cuadro": 0, "fase": 0, "pie": "cerca" }, ...], "avance": 10.6 },
        "attack": { ..., "eventos": [{ "tipo": "impacto", "cuadro": 3, "fase": 0.43 }] }, ...
      }
    },
    "minotauro": { "tipo": "jefe", "celda": 64, ... },
    "thor_armadura3": { "tipo": "mascota", ... }
  },
  "fx": { "nova_fuego": { "archivo": "fx/nova_fuego.png", "cuadros": 10, "fps": 16, "loop": false, "celda": 48 }, ... },
  "botin": { "atlas": { "iconos": {"32": "botin/iconos_32.json", "64": ...}, "especiales": {...}, "armadura_n5": {...} },
             "mundo": "botin/mundo.json", "catalogo": "botin/catalogo.json" },
  "mundo": { "mapa": "mundo/mundo1_bosque.json", "ancho": 120, "alto": 90, "cuadro": 32, "trozo": 960,
             "agua": "mundo/agua.png", "suelo": [{ "archivo": "mundo/suelo/mundo1_bosque_0.png", "x": 0, "y": 0 }, ...],
             "objetos": { "fogata": { "w": 32, "h": 32, "apoyo": [16, 28], "solido": [-8, -4, 16, 4],
                                      "luz": { "color": "#ffa040", "radius": 120, "flicker": true, "dy": 8 }, "anims": {...} },
                          "puente": { ..., "capa": "suelo" }, "arco_ruina": { ..., "solidos": [[-52, -8, 22, 8], [28, -8, 22, 8]] } },
             "particulas": { "luciernaga": { "archivo": "mundo/particulas/luciernaga.png", "w": 8, "h": 8, "cuadros": 4, "fps": 6 }, ... },
             "luz": "mundo/luz.png", "nube": "mundo/nube.png", "postales": { "cascada_y_vado": "mundo/postales/cascada_y_vado.png", ... } },
  "ui": { "panel": { "archivo": "ui/panel.png", "w": 48, "h": 48, "cuadros": 1, "nueve": [12,12,12,12] },
          "inventario": { "archivo": "ui/inventario.png", "w": 280, "h": 410, "layout": {...} },
          "numeros": { "archivo": "ui/numeros.png", "w": 7, "h": 9, "caracteres": "0123456789+-!", "filas": ["blanco","amarillo","rojo","verde","azul"] } },
  "audio": { "moneda": "audio/moneda.wav", "musica_bosque": "audio/musica_bosque.wav", ... }
}
```

### La familia se mueve en premium

Rick, Steph, Sophie y Alana salen con el perfil de movimiento premium:
- Poses clave de verdad.
- El pivote no se mueve entre cuadros ni entre animaciones.
- Cada animación que lo tiene trae:
  - `eventos`: en qué cuadro cae cada paso, golpe (`impacto`) o suelta.
  - `avance`: pixeles de la hoja que avanza el cuerpo en un ciclo completo (todos los cuadros, o sea dos pasos), sin
    que el pie patine. Es la misma unidad para todos.
  - `velocidad_natural`: px/s a los que el pie no patina con el fps de la hoja (`avance * fps / cuadros`).

Qué hace el juego con eso:
- Sonido de pisada en cada `paso`.
- Daño y una pausa de 2 o 3 cuadros en el `impacto`.
- El ritmo de caminar y correr se ajusta con `ritmo = velocidad / velocidad_natural` (es la misma cuenta de antes:
  `velocidad * cuadros / (avance * fps)`).

Ojo con las proporciones chibi. La familia es cabezona y de piernas cortas (a celda 48 la pierna de Rick mide 8 px, la
de Sophie 6 y la de Alana 4), así que el pie cubre poco. Por eso Alana tiene casi la mitad de avance que Sophie: la
unidad es la misma, el cuerpo es otro. Con las velocidades del juego el ritmo exacto sale entre 3 y 11 veces, que a 8
cuadros se ve como un borrón. Lo recomendado es lo que ya hace el juego: `ritmo = clamp(velocidad /
velocidad_natural, 0.7, 1.5)` y aceptar que el pie patine un poco, como en cualquier RPG chibi.

| Personaje | Anim | Cuadros a fps | Avance (px por ciclo) | velocidad_natural (px/s) |
|---|---|---|---|---|
| Rick | walk / run | 8 a 10 / 8 a 14 | 14.1 / 23.3 | 17.6 / 40.8 |
| Steph | walk / run | 8 a 10 / 8 a 14 | 16.6 / 27.4 | 20.8 / 47.9 |
| Sophie | walk / run | 8 a 10 / 8 a 14 | 13.2 / 21.8 | 16.5 / 38.1 |
| Alana | walk / run | 8 a 10 / 8 a 14 | 7.8 / 12.9 | 9.8 / 22.6 |
| Thor | walk / run | 8 a 9 / 8 a 14 | 18.9 / 56.7 | 21.3 / 99.2 |
| Minotauro y guardián | walk / charge | 8 a 10 / 8 a 14 | 32 / 55.5 | 40 / 97.1 |

Si una ficha del estudio llega en clásico, sale como siempre, sin esos campos.

Todas las rutas son relativas a la carpeta del kit.

### Jefes grandes (dibujados a su tamaño)

El minotauro y el guardián de la campana ya no son jefes de 64 agrandados x1.5. Se dibujan a celda **128**, pixel
por pixel, con el motor de jefes grandes (`src/engine/boss`).

- `celda`: 128. `pivote`: medido en los pies de verdad en todas las direcciones y cuadros (hoy `[64, 104]` el
  minotauro y `[64, 101]` el guardián). Cada jefe tiene el suyo: el juego lo lee del manifiesto.
  En la vista de arriba lo que está delante de los pies baja en pantalla: por eso el pivote no está en la última fila.
- Mismas animaciones y mismos fps de antes: `idle` 6, `walk` 10, `attack` 14, `hit` 12, `die` 8,
  `attack_heavy` 12, `charge` 14, `warcry` 10, `leap` 12. Cambian los cuadros: `die` 16, `attack_heavy` 11,
  `warcry` 10, `leap` 12.
- `eventos`: `impacto` (con `punto`: dónde pega la cabeza del mazo en cada dirección, en pixeles desde el pivote),
  `paso`, `grito`, `despegue`, `aterriza` y `suelta` (cuando suelta el mazo al liberarse).
- `aviso`: `[desde, hasta]` cuadros de la preparación de los golpes fuertes. Dura al menos 4 cuadros y tiembla:
  es lo que le da tiempo a Alana de esquivar. El juego puede pintar el aviso en el piso durante esos cuadros.
- `avance` en `walk` y `charge`, como las heroínas.
- `elevacion` en `leap`: cuánto sube el juego el sprite sobre su sombra en cada cuadro. El salto no se dibuja
  dentro de la celda (no entraría): el dibujo queda a ras del piso y el juego lo levanta.
- `die` termina en **liberado**: se le va el encantamiento en chispas violetas, suelta el mazo, se arrodilla y
  queda tranquilo con los ojos tibios. No hay cuerpo tirado.
- El guardián es un gólem de cobre con verdín y la campana colgando delante de la panza, que se mece con 2 cuadros
  de retraso. Encantado, la visera, las runas de la campana y los brotes de las raíces brillan **violeta**; al final
  de `die` pasan a **turquesa**. Trae además `libre` (8 cuadros, 6 fps, en bucle): parado y en paz, en turquesa,
  sin el mazo, para mostrarlo después de la pelea junto a la `campana_libre` del mapa.

Del lado del juego: el radio de golpe y la barra de vida se ajustan a la celda nueva (`celda` y `pivote` ya vienen
en el manifiesto).

### Mundos premium (el Bosque entero)

Campos nuevos en `mundo.objetos` (opcionales: si no están, todo sigue como antes):

- `sombra`: PNG del mismo tamaño que el objeto, negro con alfa. Se dibuja sobre el suelo y debajo de todos los
  objetos y personajes, en la misma posición que el objeto. Si un objeto no la trae, se usa la elipse de siempre.
- `capa: "frente"`: primer plano. No viene ubicado en el mapa: la zona lo declara en su propiedad `frente` (lista de
  ids separados por coma) y el juego lo pega a los bordes de la pantalla mientras la heroína está en esa zona. Las
  `frente_ramas_*` cuelgan del borde de arriba (apoyo arriba al centro) y las `frente_hojas_*` suben del borde de abajo
  (apoyo abajo al centro). Se mueven con paralaje 1.15 respecto de la cámara y entran y salen con un fundido de medio
  segundo al cambiar de zona. Ninguno es sólido. `capa: "fondo"`: debajo de todo, repetido por
  toda la pantalla con su paralaje. Lo usa la Catedral para el abismo: el mundo trae `fondo: [{ objeto, paralaje }]`
  en el manifiesto y el suelo es transparente donde no hay piso (ni agua). Detalle en `docs/mundos/CATEDRAL.md`.

Objetos nuevos del Bosque:
- Árboles `roble_t<tamaño>_<forma>` y `pino_t<tamaño>_<forma>` (tamaño 0, 1 o 2: 116, 146 y 182 px; forma 0, 1 o 2),
  con `idle`, `tronco` y `copa` como los de siempre, y `sombra`.
- Grupos: `claro_tronco_hongos`, `rocas_musgo_grupo`, `raices_expuestas`, `arbusto_flores_grupo`, y `helecho`.
- Calcomanías con `capa: "suelo"`: `hojas_caidas_0..3`, `raiz_suelo_0..2`, `grieta_0..2`, `charco_chico_0..1`,
  `flores_suelo_0..3`, `piedritas_0..2`.
- Primer plano con `capa: "frente"`: `frente_ramas_0..2` (256 x 96, 9 cuadros) y `frente_hojas_0..1` (128 x 64).
- Copias con sombra de objetos de siempre (`_p`): `hongo_gigante_azul_p`, `hongo_gigante_morado_p`,
  `arbol_hechizado_1_p`, `arbol_hechizado_2_p`, `arbol_seco_0_p`, `arbol_seco_1_p`, `tronco_caido_p`,
  `arbusto_verde_0_p`, `arbusto_verde_1_p`, `arbusto_moras_0_p`, `hongos_p`, `roca_p`, `roca_grande_p`. Son el mismo
  dibujo con su `sombra` y traen `base` con el id original: todo lo que el juego decide por nombre (partículas,
  reacciones, color de los ojos) se busca con `def.base ?? id`. Afuera de la zona premium se siguen usando los de
  siempre hasta que le toque a cada zona.

El mapa (`mundo1_bosque.json`) ya los trae ubicados en todo el Bosque, con la meseta y su rampa de tierra en el
Bosque Profundo. Nada queda montado: el pie de cada objeto se ve siempre y dos cuerpos se pisan como mucho un 12 %.
En el interior de las masas cerradas los árboles van en filas (dosel) y ahí sí se tapan el tronco entre ellos, como
en cualquier bosque visto desde arriba. Lo que el diseño puso a mano (lugares, campamentos, ruinas, carteles,
puentes, cofres y enemigos) no se movió. Zonas con primer plano declarado: Bosque Profundo, Claro Escondido y Anillo
de las Hadas.
La colisión sale del mapa como siempre. Detalle y reglas: `docs/mundos/PILOTO.md`.

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

### Mundo 1: el Bosque GG

Un mapa grande para explorar: 120 x 90 cuadros de 32 px (3840 x 2880 px). El suelo NO son cuadros repetidos: está pintado pixel por pixel (mesetas con acantilado, escaleras, río con cascada, lagos, caminos, plazas de losas, praderas de flores, bosque oscuro) y viene cortado en 12 trozos de 960 px. Se puede abrir en Tiled.

Recorrido: Claro de la Llegada, Pradera de las Mariposas, El Abuelo Roble, Puente del Trol sobre el Arroyo Cristalino, Ruinas del Viejo Reino con la estatua de Thor, Pie de la Escalera, Las Alturas y la Arena del Minotauro. Desvíos: Bosque Profundo, Anillo de las Hadas, Claro Escondido (camino secreto), vado bajo la cascada, Lago Espejo, Colina de los Goblins y Campo de Calabazas. Todo se alcanza caminando desde el inicio (hay un test que lo verifica).

| Capa | Tipo | Uso |
|---|---|---|
| `agua` | tiles | agua animada (tileset `agua.png`, el cuadro 0 pasa por 4 cuadros cada 220 ms). Va DEBAJO del suelo |
| `suelo` | grupo de capas de imagen | 12 trozos (`suelo/mundo1_bosque_N.png`) con `offsetx/offsety`. El agua es transparente: se ve la capa de abajo |
| `colision` | tiles | invisible. Distinto de 0 = no se pasa (agua honda, acantilados, troncos, objetos sólidos). Los puentes y el vado ya están abiertos |
| `superficie` | tiles | invisible. Qué paso suena en cada cuadro: 1 pasto, 2 tierra, 3 piedra, 4 madera (puentes), 5 agua (vado y orillas). Se lee directo de `data`, no es un gráfico. Sonido: `audio.paso_<superficie>_<0..2>` alternando las 3 variantes |
| `objetos` | puntos | decorado. `sprite` = nombre en `manifest.mundo.objetos`. `x, y` = punto de apoyo |
| `entidades` | puntos | ver abajo |
| `zonas` | rectángulos | cada zona con `musica`, `ambiente`, `luz` (color), `oscuridad` (0 a 1), `particulas` (lista separada por coma), `descubrir` y a veces `secreto` |
| `postales` | puntos | centros de cámara para las capturas de calidad (Playwright) y el paneo de presentación |

Entidades: `jugador_inicio`, `thor_inicio`, `portal_llegada`, `punto_guardado` (props `id`, `nombre`: fogata donde se guarda y se reaparece), `enemigo` (props `enemigo`, a veces `elite` y `nombre`), `cofre` (props `nivel`, y `secreto` + `pista` en los escondidos, `tras_jefe` en el legendario), `rompible` (prop `objeto`), `cartel` (props `texto`, `icono`), `jefe`, `portal_jefe`, `arena_jefe` (prop `radio`: al entrar empieza la pelea).

Orden de dibujo, de abajo hacia arriba:
1. capa `agua`
2. trozos de `suelo`
3. objetos con `capa: "suelo"` (puente, piedras del vado, nenúfares, anillo de las hadas)
4. objetos y personajes ordenados por `y` del apoyo
5. luces: `luz.png` teñida con `objetos.X.luz.color`, escala = `radius * 2 / 128`, modo aditivo, `flicker` = parpadeo, `pulse` = latido lento
6. sombras de nubes (`nube.png`) moviéndose despacio
7. tinte y oscuridad de la zona actual, con transición suave al cambiar de zona

```ts
this.load.tilemapTiledJSON('mundo1', kit + 'mundo/mundo1_bosque.json');
this.load.image('agua', kit + 'mundo/agua.png');
manifest.mundo.suelo.forEach((s, i) => this.load.image(`suelo_${i}`, kit + s.archivo));

const map = this.make.tilemap({ key: 'mundo1' });
const agua = map.createLayer('agua', map.addTilesetImage('agua', 'agua')!)!;
manifest.mundo.suelo.forEach((s, i) => this.add.image(s.x, s.y, `suelo_${i}`).setOrigin(0).setDepth(1));
const col = map.createLayer('colision', map.addTilesetImage('agua', 'agua')!)!.setVisible(false);
col.setCollisionByExclusion([-1, 0]);
```

Objetos: `sprite.setOrigin(apoyo[0] / w, apoyo[1] / h)` y `setDepth(y)`. `solido` (y `solidos`) son rectángulos `[dx, dy, w, h]` relativos al apoyo, ya marcados en la capa `colision`.

El agua se anima cambiando el índice de los cuadros de la capa `agua` cada 220 ms (Phaser no anima tiles de Tiled solo).

Partículas sugeridas por zona: `luciernaga`, `hoja_verde`, `hoja_otono`, `mariposa_*`, `polen`, `brasa`, `brillo`, `espora`, `humo`, `polvo`, `gota`. Ambientes: `audio/ambiente_<zona.ambiente>.wav` en bucle, con fundido al cambiar de zona.

#### Vida y bruma (v3, bosque hechizado)

- Árboles con viento: cada árbol trae 9 cuadros (`idle`) que se mecen; arrancar cada uno en un cuadro distinto para que no se muevan todos iguales.
- Cascada (`cascada`): se hace a la medida del acantilado del mapa, columna por columna del labio al pie de la roca, con espuma, estela, bruma y gotas (6 cuadros a 12 fps que cierran el ciclo). Va en `capa: suelo` y trae `espuma` = [x0, y0, x1, y1], la línea donde el agua golpea, relativa al apoyo: ahí el juego suelta gotas y bruma.
- Árboles hechizados (`arbol_hechizado_0..2`): `dormido` normalmente, `despierto` cuando la heroína está a menos de ~130 px (ojos que brillan, con una luz pequeña del color de los ojos) y `parpadeo` de vez en cuando.
- Criaturas (`manifest.mundo.criaturas`): `cuervo` y `cuervo_izq` (`quieto`, `picotear`, `volar`: huyen cuando la heroína se acerca o cuando los tocan), `murcielago` (cruza la pantalla en el Bosque Profundo), `ojos` (entre arbustos del bosque oscuro: `mirar` y `parpadeo`, brillan en la oscuridad), `fuego_fatuo` y `fuego_fatuo_violeta` (flotan y alumbran). En el mapa vienen como entidades `criatura` con `especie`.
- Bruma: `niebla.jirones` y `niebla.nubes`, dos capas que corren con el viento a distinta velocidad, con alfa = `zona.niebla`. Van ANTES de la oscuridad, así las luces la iluminan.
- Telarañas (`telarana`) pegadas a troncos del bosque oscuro.
- Tronco y copa por separado: los árboles grandes (`roble_*`, `pino_*`, `sauce_v3`, `arbol_seco_*`, `abuelo_roble_v3`) traen, además de `idle`, las anims `tronco` y `copa` con el mismo tamaño, apoyo y cuadros. Se dibuja el tronco ordenado por `y` y la copa en el mismo lugar con la profundidad del tronco + 1. Cuando la heroína pasa detrás, solo la copa baja a alfa 0.45 y el tronco queda firme. Tronco + copa = `idle` pixel por pixel (hay un test). Los hechizados traen `copa` y un tronco por estado: `tronco_dormido`, `tronco_despierto`, `tronco_parpadeo` (la cara va en el tronco). Se sincronizan por número de cuadro, y `parpadeo` va con el cuadro 0 de la copa. `idle` sigue entero para quien no lo use.
- Pasto alto (`pasto_alto`): `apartar_izq` y `apartar_der` (4 cuadros a 12 fps, sin bucle) cuando la heroína lo cruza; después vuelve a `idle`.
- El Abuelo Roble (`abuelo_roble_v3`): `sonreir` (8 cuadros a 8 fps, sin bucle) al tocarlo o abrazarlo: abre los ojos, sonríe más y caen hojitas. Si se usa tronco y copa, `tronco_sonreir` va con el cuadro 0 de `copa`.
- Aviso de la carga del minotauro (`aviso_carga`, capa suelo): tramo de 32 x 48 con apoyo [0, 24] que se repite a lo largo de la línea de la carga (girado hacia donde va a correr). `llenar` 8 cuadros a 8 fps; los tramos pegan sin costura.
- Detalles de cada lugar: la guarida del trol junto al Puente del Trol (`cama_trol`, `olla_trol` con vapor y luz, `huesos_pescado`), el campamento goblin con `tarima`, `barriles` y un campo de práctica con `diana`, ruinas con `pilar_alto` además de `pilar` y `pilar_roto`, la estatua de Thor de 128 x 192 con placa dorada, el anillo de las hadas de 128 x 96, y en las praderas algo para descubrir cada media pantalla (`flores_grandes_0..2`, `tocon_hongos`, `charco`, rocas y troncos).
- Campamento de fogata (`campamento_fogata`, 64 x 48, luz de radio 150): va en los 3 `punto_guardado`. La `fogata` chica sigue existiendo para decorar.

**Referencia lista para copiar:** `scripts/visor/runtime.js` anima todo esto en Canvas 2D (orden de dibujo, viento, ojos, cuervos, bruma, oscuridad con luces, resplandor de color, partículas por zona, banner de zona, ambientes). El juego en Phaser debe verse igual o mejor. Para verlo: `npx tsx scripts/visor-mundo.ts <carpeta>` y servir la carpeta.

Postales: `llegada`, `abuelo_roble`, `cascada_y_vado`, `puente_del_trol`, `ruinas_y_estatua`, `anillo_de_hadas`, `arena_del_minotauro`, `colina_goblin`, `bosque_profundo`, `claro_escondido`, `lago_espejo`, `campo_calabazas` y `las_alturas`.

Las postales (`mundo/postales/*.png`) son exactamente lo que se ve en pantalla a 960 x 540 en cada lugar. Sirven de referencia de calidad: el juego con luces y partículas debe verse igual o mejor.

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

`catalogo.json` trae `rarities` (color por rareza), `sets` (bonos del set Legado GG, el set de la familia) e `items`. Cada item:

```json
{ "id": "sword_1", "name": {"es": "Espada", "en": "Sword"}, "rarity": "normal", "level": 1,
  "base": {"cat": "weapon", "icon": "sword"}, "stats": {"damage": [3, 8], "speed": 1.2, "mods": []},
  "icon": "sword_1", "animated": false, "atlas": "iconos" }
```

`atlas` dice en qué atlas está e `icon` es el nombre del cuadro. Si `animated` es true, los cuadros son `<icon>_0` a `<icon>_7`. Hay 427 objetos: las bases (armas, armaduras, escudos, pociones, gemas, runas, joyas, consumibles y 5 armaduras para Thor), los legendarios, el set y el botín de nivel bajo para el Mundo 1: 24 mágicos de nivel 2 a 10 (ids `m_*`: un arma por clase, la rodela, 12 piezas de armadura, 4 joyas, carcaj, orbe y daga), 8 raros de nivel 5 a 10 (ids `r_*`, al menos uno por clase) y 2 legendarios de nivel 8 y 9 para el cofre del Claro Escondido: `pluma_de_cuervo` (arco, para Sophie) y `ramita_del_abuelo` (varita, para Alana), con brillo de 8 cuadros y `cae_<id>`. Todas las propiedades del botín de nivel bajo son del subconjunto que usa el juego (`EARLY_STATS` en `src/engine/loot/early.ts`). En `mundo.json` todo viene en cuadros numerados `_N`: `cofre_<madera|reforzado|dorado|legendario>_quieto_N` (brillo en reposo), `cofre_<nivel>_abrir_N`, `moneda_gira_N`, `oro_<small|medium|large|huge>_N`, `lluvia_de_oro_N`, `haz_<rareza>_N` y `cae_<único>_N` (el objeto cayendo al piso, solo para únicos y set. Para el resto basta un tween del ícono).

### Interfaz

- Paneles con `nueve`: `this.add.nineslice(x, y, 'panel', 0, ancho, alto, ...nueve)`.
- Orbes: 11 cuadros, cuadro N = vida al N*10 %. Sombreados como esfera de vidrio, sin bloques rectos. `orbe_*_ola` son 36 cuadros con la superficie viva: el cuadro (N - 1) * 4 + t es el nivel N (1 a 9) en el paso t (0 a 3), y los 4 pasos cierran el ciclo. Los niveles 0 y 10 no tienen superficie y van quietos.
- Números de daño: `numeros.png` es una rejilla de 13 columnas (`caracteres`) por 5 filas (`filas`, un color por fila), celdas de 7x9. Sirve como `RetroFont` o recortando cuadros.
- `inventario.png` (280 x 410) ya trae dibujados los casilleros. `layout` dice dónde va cada cosa:
  - `equipo`: `casco, amuleto, pecho, arma, mano_libre, guantes, cinturon, botas, anillo_1, anillo_2, mascota, retrato` como `[x, y, w, h]`.
  - `rejilla`: `{ x, y, cols: 7, filas: 4, celda: 36 }`. Un objeto por casilla.
  - `oro.texto`: donde escribir la cantidad. `titulo`: franja de arriba.
- `boton` tiene 3 cuadros: normal, encima, presionado.
- Íconos de 24 x 24 con el mismo estilo que `icono_ajustes`: `icono_pausa`, `icono_secreto`, `icono_zona`, `icono_luna`, `icono_sonido`, `icono_silencio`, `icono_calidad`, `icono_jugadora`, `icono_peque`, `icono_jugar` e `icono_guardado`.
- Íconos de los carteles del mapa: `ui.iconos_cartel.<icono>` (un PNG de 24 x 24 en `ui/carteles/`). Cada `icono` que trae un cartel del mapa tiene el suyo: `flecha_norte`, `peligro`, `corazon`, `cruce`, `estrella`.
- Íconos de habilidad: `ui.habilidades.<nombre>` (40 x 40 sobre medallón redondo con el aro del color de la habilidad): `lluvia_flechas`, `esquiva`, `llamar_thor`, `curar`, `torbellino`, `bloqueo`, `nova_fuego`, `rayo_canalizado`. Para la recarga, oscurecer con tinte.
- `logo`: "GG Abyss" de 288 x 96, 8 cuadros a 8 fps en bucle, con un brillo que recorre las letras. Hecho con la misma fuente de títulos.
- `continuara`: ilustración de 960 x 540 (la escalera que baja al abismo hacia el portal). Sin texto: el juego escribe "Continuará..." encima con `fuente_titulo`.
- `girar_tablet`: 64 x 64, 2 cuadros (vertical y acostada con la flecha). Para pedir que giren la tablet a horizontal.
- Fuentes bitmap (`manifest.ui.fuentes`), en formato BMFont XML, hechas a partir de Silkscreen (Jason Kottke, SIL Open Font License 1.1). Traen ñ, tildes, ¡ y ¿:
  - `fuente_ui`: 8 px, blanca con sombra negra. Se tiñe con `setTint` y se agranda con escala entera (x2 o x3, nunca 1.5).
  - `fuente_titulo` (dorada) y `fuente_titulo_plata`: 16 px, ya pintadas con degradé, contorno y sombra. Para banners de zona, "¡Thor te salvó!", nombres y títulos.
  ```ts
  this.load.bitmapFont('fuente_ui', kit + 'ui/fuentes/fuente_ui.png', kit + 'ui/fuentes/fuente_ui.fnt');
  this.add.bitmapText(x, y, 'fuente_titulo', '¡Descubriste!').setOrigin(0.5);
  ```

### Íconos de la app

`manifest.app`: `icono_192`, `icono_512`, `icono_maskable_512` (Thor dentro del 80 % del centro), `apple_touch_180` y `favicon_32`. Cada uno trae `archivo`, `tam` y `uso` (`any` o `maskable`). La cara de Thor sobre el portal, en pixel art agrandado por enteros para que se vea nítido y se lea a 48 px.

### Audio

WAV mono 16 bits a 22050 Hz. Músicas: `musica_bosque`, `musica_jefe`, `musica_victoria` y `musica_titulo` (40 s, misteriosa y suave, en bucle). Además de los de combate e interfaz: `descubrir` (zona nueva), `secreto` (secreto encontrado), `elegir` (tocar una tarjeta de jugadora), `guardado` (guardar en la fogata), `arco`, `esquiva`, `bloqueo`, `thor_rescate` y pasos por superficie `paso_<pasto|tierra|piedra|madera|agua>_<0|1|2>` (3 variantes de cada uno, para alternar). Efectos cortos, música para loop y ambientes de 12 s que hacen bucle sin corte. En tablets el audio arranca solo después del primer toque del usuario, así que la pantalla de inicio debe pedir un toque.

Lo que no se pudo verificar: los sonidos están chequeados por forma (duración, sin saturar, WAV válido) pero nadie los escuchó todavía. Si alguno suena feo se cambia su receta en `src/engine/audio/sfx.ts`.
