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

Agua (los dos mundos):
- `espuma` en cada mundo del manifiesto: `{ archivo, capa: "espuma", columnas, cuadros: 4, fps: 5 }`. La capa
  `espuma` del mapa trae por cuadro 0 (nada) o n: la pieza n - 1 del atlas (`columnas` por fila). El cuadro f de la
  animación está `f * filas * 32` px más abajo (`filas` va en las propiedades de la capa). Se dibuja encima del suelo,
  debajo de los objetos.
- `reflejo: { capa: "reflejo" }`: por cuadro, 1 = agua quieta. Ahí el juego puede reflejar a la heroína y a los árboles
  de la orilla (el sprite invertido, con alfa bajo y una ondita).

### Un mundo que reacciona (2.9)

Animaciones nuevas en los objetos de siempre (el reposo y el tamaño no cambian):

| Objetos | Animación | Cuadros a fps | Cuándo |
|---|---|---|---|
| Todos los arbustos (también las copias `_p`) | `sacudir` | 6 a 12 (sin bucle) | La heroína pasa al lado o le pega. Sueltan dos hojitas |
| `arbusto_moras_*` | `sin_moras` | 1 | Después de pegarle (sueltan moras que curan) |
| `hongos`, `hongo_gigante_*`, `tocon_hongos` | `rebotar` | 6 a 12 (sin bucle) | Al pisarlos |
| `flores_grandes_*` | `cerrar` y `abrir` | 4 y 4 a 8 (sin bucle) | Pasa un enemigo y después |
| `nenufar`, `juncos` | `mecer` | 6 a 8 (sin bucle) | Al pasar por el agua al lado |
| `charco`, `charco_chico_*` | `salpicar` | 6 a 12 (sin bucle) | Al pisarlo |
| `antorcha`, `farol`, `candelabro_pie` | `apagada` y `prender` | 1, y 6 a 10 | Las apagadas se prenden al pasar con la luz |
| `telarana` | `romper` | 6 a 12 (sin bucle) | Al pasar, queda colgando (último cuadro) |

Objetos nuevos (en `mundo.objetos`):
- `palanca` (32 x 32, sólida 12 x 6): `arriba`, `bajar` (8 a 10 fps), `abajo`. En los dos mundos.
- `puerta_madera` (Bosque) y `reja_catedral` (Catedral), 64 x 64, sólidas cerradas: `cerrada`, `abrir` (9 cuadros), `abierta`.
- `piedra_empujable` (32 x 32): `quieta` y `arrastrar` (6 a 6 fps). En los dos mundos.
- `campana_chica` (Catedral, 32 x 48): `sonar` (8 a 10 fps). Ya va ubicada en los Claustros y en la Nave.

La palanca, la puerta, la reja y la piedra no van ubicadas en los mapas: abren y cierran pasos, y eso lo decide el juego
(dónde, qué abre cada palanca, qué tapa cada piedra). Están en el kit listas para usar.

Criaturas chicas nuevas (en `mundo.criaturas`, como los cuervos): `rana`, `pez` y `ardilla`, de 16 x 16, con `quieto` (4 fps)
y `huir` (10 a 12 fps). En el Bosque van como entidades `criatura` con `especie`: ranas en la orilla de los lagos,
peces en el lago (el `huir` del pez es el salto fuera del agua) y ardillas al pie de los árboles.

Sonidos nuevos (en `audio`, de 0.2 a 0.8 s y con pico de 0.5): `arbusto_sacudir`, `hongo_rebote`, `charco_pisar`,
`rana_salto`, `palanca`, `puerta_abrir`, `reja_abrir`, `piedra_arrastrar`, `campana_chica` y `telarana_romper`.

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

### Mundo 3: Las Galerías del Eco

`manifest.mundos` trae ahora `mundo3` (mapa `mundo/mundo3_galerias.json`, 100 x 80, con `fondo`, `espuma`, `reflejo`
como los otros). Detalle completo en `docs/mundos/GALERIAS.md`. Lo nuevo para el juego:

- Capa de objetos **`cristales`** en el mapa y el campo `cristales` en el mundo del manifiesto: cada punto es el pie de
  un cristal con `id`, `color`, `forma` (0 cian, 1 violeta, 2 ámbar) y `grande`. Arrancan apagados. Se dibujan con
  `cristal_apagado_<forma>` / `cristal_prendido_<forma>` (anim `prenderse` de 8 cuadros a 14 fps, una vez) y los 4 de
  la arena con `cristal_grande_apagado` / `cristal_grande_prendido`. Las luces (radio 80 y 180) ya vienen en el
  objeto prendido. `golpearCristal`, `avanceLuz`, `reinaVulnerable` y `apagarConPolvo` usan estos puntos tal cual.
- Entidades: 3 `punto_guardado` con `farol: true` (al lado de su `farol_minero`), `carrito` (`ruta` "x,y;x,y" en
  cuadros, `empuja: thor`), `figura` (dónde se asoma en el Puente Colgante), `mural` (`pieza: 3`), cofres con
  `secreto`/`pista`, y los enemigos `polilla_ceniza`, `minero_piedra` y `sombra`. El jefe es `polilla_reina` en su
  `arena_jefe`, y el portal de salida va a `mundo4`.
- Zonas con `ambiente` `galerias`, `agua`, `viento`, `eco` y `jefe`, partículas `polvo`, `brillos`, `brasas_frias`,
  `humo` y `ceniza` (en `particulas` van `brasa_fria` y `ceniza`, nuevas, y las de siempre), y su `frente`
  (`estalactitas_frente_0..1`, `cristales_techo_frente_0..1`).
- Personajes nuevos en `personajes`: `polilla_ceniza` (48), `minero_piedra` (64), `sombra` (48) y `polilla_reina` (128,
  `tipo: jefe`), con el mismo formato que los jefes grandes (eventos, `aviso`, pivote medido). Los que vuelan traen
  `vuela: true`: el pivote es el punto del piso debajo de ellos. La sombra se dibuja normal y el juego la muestra solo
  dentro de la luz (`sombraVisible`). Afuera se ve `sombra_ojos` (en `mundo.criaturas`, 16 x 8).
- `fx`: `aviso_polvo` (96 x 96, 8 cuadros, va en el piso) y `nube_polvo` (96 x 96, 10 cuadros a 12 fps).
- `audio`: `musica_galerias`, `musica_jefe_polilla`, `ambiente_galerias`, `ambiente_eco`, `cristal_prender`,
  `cristal_apagar`, `polilla_aleteo`, `minero_golpe`, `sombra_aparece`, `carrito_rodar` (bucle) y `figura_irse`.

### Mundo 4: El Puerto Ahogado (encargo F12)

`manifest.mundos` trae `mundo4` (mapa `mundo/mundo4_puerto.json`, 110 x 90, con `fondo` (`fondo_mar_lejos_0..2`),
`espuma`, `reflejo`, `portal: portal_rojo`). Resumen de la entrega: `docs/entregas/abyss_mundo4.md`. Lo nuevo:

- **Mareas.** Capas de cuadros `marea_baja` (el barro del banco de arena: solo se camina con la marea baja) y
  `marea_alta` (los muelles flotantes: solo con la alta). En `colision` van libres los dos: con la marea alta el juego
  suma `marea_baja` a la colisión y dibuja `agua_marea` encima; con la baja suma `marea_alta` y deja los
  `muelle_flotante` en `abajo` (al subir: `subir` y después `arriba`). El mundo trae `marea` con los nombres.
- **Faroles del muelle** (la fogata del piso): 4 `punto_guardado` con `farol: true` y `objeto: farol_muelle`, y al
  lado la entidad `farol_muelle` (el poste, `punto` = id). Arrancan apagados (`farol_muelle_apagado`); Thor los prende
  (`farol_muelle_prenderse` una vez y después `farol_muelle_prendido`, luz ámbar de 180). El primero trae
  `tutorial: true`.
- **Entidades:** `portal_llegada` (rojo), `portal_volver` (mundo3), `portal_jefe` (`destino: mundo5`), `jefe`
  (`enemigo: pez_farol`, `en_agua`, en el centro de la poza), `arena_jefe` (`radio: 208`, `agua: true`,
  `poza: 128`: la poza de agua negra del centro es sólida en `colision`, el anillo de tablas `anillo_poza` que la
  rodea hasta el radio se camina entero con las dos mareas y llega a la entrada de la arena), el minijefe `capitan_ahogado` con `elite: true`,
  `campana_iglesia` (`suena_sola`), `mural` (`pieza: 4`), `figura` (una con `alto: true`: en lo alto del faro) y los
  enemigos `marinero_niebla`, `cangrejo_ceniza` y `medusa_negra`.
- **Zonas** con `ambiente` `puerto`, `campana`, `agua` y `jefe`, `musica: ninguna` (casi sin música: entra en las
  peleas; el Faro trae `musica: jefe_pez` y `musica_victoria: faro`, el Astillero `musica_pelea: capitan`) y su
  `frente` (`red_colgando_0..1`, `rocas_frente_0..1`, `vigas_frente_0..1`).
- **Luz:** sin sombras horneadas con dirección. Los objetos traen solo la sombra de contacto al pie en `sombra`.
- **El farol de Thor:** `personajes.thor_farol` y `thor_farol_apagado` (`capa_de: thor`): misma celda, pivote,
  animaciones y cuadros que `thor`. Cada cuadro trae solo el farol: se dibuja encima de Thor (con cualquier
  armadura). En `howl` el farol queda arriba (alzar el farol).
- **Enemigos y jefe:** `marinero_niebla` (48, translúcido; fuera de la luz se ven los `marinero_ojos`, en
  `criaturas` del mundo 4), `cangrejo_ceniza` (48), `medusa_negra` (48, `vuela`), `capitan_ahogado` (64, `elite`) y
  `pez_farol` (128, `tipo: jefe`, `en_agua`, `luz_antena`). Mismo formato que los jefes grandes (eventos, `aviso`,
  `elevacion`, pivote medido). `fx`: `aviso_mordida` (128 x 64, `w`/`h`), `aviso_ola` (32 x 32, en bucle, se repite
  en línea) y `ola` (128 x 64, 12 fps). Cada anim del `pez_farol` trae `antena`: 8 listas (una por dirección, en
  el orden de las filas de la hoja) con un `[x, y]` por cuadro, en píxeles desde el pivote (y hacia abajo), o `null`
  cuando la luz está bajo el agua o apagada. Ahí va la luz del juego.
- **Audio:** `ambiente_puerto` (20 s), `ambiente_campana`, `musica_jefe_pez`, `musica_capitan` (en bucle),
  `musica_faro` (30 s), y los efectos `campana_lejos`, `campana_cerca`, `marea_sube`, `farol_prender`,
  `farol_apagar`, `thor_alza_farol`, `marinero_se_deshace`, `cangrejo_tenaza`, `medusa_toca`, `ancla_golpe`,
  `pez_emerge`, `pez_mordida`, `ola` y `faro_prende`. Todo con pico de 0.5.
- **Pendientes:** `ui.habilidades.ataque` (#38), `ui.cinturon` nuevo de 190 x 44 y `ui.casillero_pocion` (#39), y
  los portales premium de 96 x 128 (#40: `portal_azul`, `portal_rojo`, `portal_verde`, `portal_violeta`,
  `portal_ambar`, con `girar`, `abrir`, `cerrar`, `arco` y `remolino`). Cada mundo dice el suyo en `portal`.
  `ui.habilidades.farol` (#41: Thor alza el farol, rayos ámbar y aro dorado) y `farol_recarga` (el mismo en gris).

### Mundo 5: La Ciudad Dormida (encargo F12)

`manifest.mundos` trae `mundo5` (mapa `mundo/mundo5_ciudad.json`, 110 x 100, con `fondo` (`fondo_ciudad_lejos_0..2`, se ve
por los huecos del abismo), `portal: portal_plata`). Resumen de la entrega: `docs/entregas/abyss_mundo5.md`. Lo nuevo:

- **Faroles de plaza** (la fogata del piso): 5 `punto_guardado` con `farol_plaza: true` y `objeto: farol_plaza`, y al
  lado la entidad `farol_plaza` (el poste, `punto` = id, `barrio` = nombre exacto de la zona que alumbra). Arrancan
  apagados (`farol_plaza_apagado`). La heroína los prende con `ui.habilidades.prender`: `farol_plaza_prenderse` una
  vez (12 cuadros, sube un anillo de luz) y después `farol_plaza_prendido` (luz dorada de 320). Si la Ladrona roba la
  luz: `farol_plaza_robado` una vez (el hilo de luz se va para arriba) y queda apagado. El de la Puerta trae
  `tutorial: true`. El mundo trae `faroles` con los nombres.
- **La luz robada:** entidades `chispa` con `barrio` (8 por barrio con farol, caminables y lejos de las paredes). El
  juego elige tres del barrio del farol robado y dibuja `chispa_luz` (16 x 16, luz de 50). Thor las rastrea. El
  contador va con `ui.habilidades.chispas`. El mundo trae `chispas` con las notas.
- **La Ladrona:** `figura_ladrona` (48 x 64): `idle`, `robar` (8 a 8 fps, en bucle) e `irse` (8 a 10 fps). En el
  objeto viene `farolito`: por anim, el `[x, y]` del farolito en cada cuadro, en pixeles desde el apoyo (y hacia
  abajo). El juego dibuja el hilo de luz del farol de plaza hasta ahí. Entidades `figura` con `barrio` (una o dos por
  barrio con farol) y una con `alto: true` en el balcón del palacio.
- **Estatuas:** entidades `estatua` con `variante` (0 a 9) y `objeto` (`estatua_ciudadano_<variante>`), en el mismo
  punto que su objeto en la capa objetos (son sólidas). Anims `dormida`, `despertar` (12 a 12 fps, una vez) y
  `despierta` (4 a 4 fps, respiran y saludan). Al vencer al Rey despiertan. También despiertan las casas
  (`casa_ciudad_0..9`, anim `despierta`: ventanas `#ffc070` y toldos de colores), los puestos, los árboles de piedra,
  el `organillo` y la fuente (`fuente_plaza`, anim `corre`). La torre del reloj tiene `parado` y `andando`.
- **Entidades:** `portal_llegada` (`portal: portal_plata`), `portal_volver` (mundo4), `portal_jefe` (`destino:
  mundo6`), `jefe` (`rey_de_piedra`), `arena_jefe` (`radio: 208`, `trono: true`), 4 `lampara_trono` a 150 px del centro
  en diagonal (`lampara_trono_apagada`, `_prenderse` una vez, `_prendida` con luz de 200), `mural` (`pieza: 5`),
  `cajita_musica`, `fuente`, `torre_reloj`, el minijefe `relojero` con `elite: true` y los enemigos
  `sonambulo_piedra`, `gargola_dormida` y `duende_sueno`.
- **Zonas** con `ambiente` `ciudad`, `cajita`, `jardin`, `reloj`, `abismo` y `jefe`, partícula `polvo_sueno` (en las
  `particulas` del mundo 5), `musica: ninguna` (el Palacio trae `musica: jefe_rey` y `musica_victoria: despertar`, la
  Torre `musica_pelea: relojero`) y su `frente` (`banderines_rotos_0..1`, `arco_calle_0..1`, `lampara_colgante_0..1`).
- **Luz:** sin sombras horneadas con dirección, solo la sombra de contacto al pie. La luz es de los faroles de plaza,
  las lámparas del trono, la cajita (lila, 40) y la corona del Rey.
- **Enemigos y jefe:** `sonambulo_piedra` (48: `quieto` en la luz, `attack` con 4 cuadros de aviso con los ojos
  celestes), `gargola_dormida` (48, `vuela`: `posada`, `despertar`, `attack` en picada con 6 de aviso), `duende_sueno`
  (48), `relojero` (64, `elite`, `attack_heavy` con 8 de aviso, `warcry` da cuerda) y `rey_de_piedra` (128, `tipo:
  jefe`, `luz_corona`). El Rey trae `idle`, `walk`, `attack` (puño), `attack_heavy` (pisotón con `elevacion`),
  `barrido`, `warcry`, `aturdido`, `hit` y `die`, y en cada anim `corona`: 8 listas (una por dirección) con un `[x, y]`
  por cuadro desde el pivote, o `null` cuando la corona ya se rompió (en `die` desde el cuadro 5). `fx`:
  `sombra_picada` (48 x 24), `proyectil_arena_<dir>` (16), `impacto_arena` (32), `aviso_aguja` (32, en bucle, se
  repite en línea), `aviso_puno` (96 x 48), `grieta_luz` (64) y `nota_cuna` (16).
- **Audio:** `ambiente_ciudad` (20 s), `ambiente_cajita`, `ambiente_jardin`, `ambiente_reloj`, `ambiente_abismo`,
  `musica_jefe_rey` y `musica_relojero` (en bucle), `musica_despertar` (30 s), y los efectos `farol_plaza_prender`,
  `luz_robada`, `chispa_recoger`, `estatua_paso`, `estatua_quieta`, `gargola_despierta`, `gargola_picada`,
  `arena_sueno`, `bostezo`, `reloj_campanada`, `aguja_barre`, `rey_puno`, `rey_pisoton`, `rey_canta`, `corona_rompe` y
  `ciudad_despierta` (`figura_irse` es el de las Galerías). Todo con pico de 0.5.
- **Íconos:** `ui.habilidades.prender` y `ui.habilidades.chispas`. **Portal:** `portal_plata`.

### Mundo 6: La Fragua de las Luces (encargo F12)

`manifest.mundos` trae `mundo6` (mapa `mundo/mundo6_fragua.json`, 110 x 100, con `fondo` (`fondo_fragua_lejos_0..2`, se
ve por los huecos del abismo), `portal: portal_brasa`). Resumen de la entrega: `docs/entregas/abyss_mundo6.md`. Lo nuevo:

- **La lava** va en la capa `agua` del mapa: la tira `agua` del mundo (`mundo/mundo6_agua.png`) son 4 cuadros de lava
  que pegan por los cuatro lados, `espuma` es el borde que brilla (4 cuadros) y no hay `reflejo`. Ya es sólida en
  `colision`. Es la luz grande del piso: el juego pone luz naranja (`#ff7020`) a lo largo de las orillas (la lava no
  se oscurece ni se tiñe con las otras luces: brilla sola). Al vencer a la Dragona se cambia la tira por
  `agua_apagada` (`mundo/mundo6_agua_apagada.png`, mismo formato: la lava hecha piedra con vetas tibias `#a05030`).
- **Fuentes frías** (la fogata del piso): 5 `punto_guardado` con `fuente_fria: true` y `objeto: fuente_fria`. El
  objeto `fuente_fria` (96 x 96, `idle` 6 a 6 fps, luz celeste de 220 que alumbra sin calentar) va en la capa objetos
  justo arriba del punto. La de La Escalera de Ceniza trae `tutorial: true`.
- **Jaulas** (las luces robadas): entidades `jaula` con `id`, `luz` (`bosque`, `catedral`, `galerias`, `faro`,
  `ciudad`), `zona` (nombre exacto) y `objeto` (`jaula_luz_<luz>`). No van en la capa objetos: las dibuja el juego. El
  punto de la entidad es el candado: la jaula va con su apoyo (`[16, 4]`, la argolla de arriba) en `(x - candado[0],
  y - candado[1])`; `candado` viene en el objeto (`[0, 52]`). Anims `cerrada` (6 a 6 fps, luz de su color de 40),
  `abrir` (10 a 12 fps, una vez: salta el candado, se abre la puertita y la luz sale por arriba) y `vacia` (2 a 2
  fps). Al abrirse queda flotando `luz_libre_<luz>` (24 x 24, 8 a 8 fps, luz de 260). Las 8 de la sala del Carcelero
  traen `carcel: true` (se abren todas juntas al vencerlo). El mundo trae `jaulas` con las notas.
- **Grietas que respiran:** entidades `grieta` (rectángulos en Tiled: `x`, `y` arriba a la izquierda, `width` y
  `height` de 64) con `fase` (0 a 1) y `zona`, siempre caminables. El juego llena cada parche con `grieta_brasa_<v>`
  (64 x 64, capa suelo, 4 variantes que encajan; `grieta_brasa` es la 0): `apagada`, `aviso` (6 a 8 fps) y `caliente`
  (6 a 6 fps). Con cada soplido de los fuelles: `aviso` y después `caliente`, corridas por `fase`.
- **Fuelles:** entidades `fuelle` con `zona` y `objeto` (`fuelle_gigante_0`, `fuelle_gigante_1` y
  `fuelle_gigante_0_b`), en el mismo punto que su objeto (192 x 160, sólido en la base). `quieto`, `soplar` (12 a 10
  fps: se aplasta y sale un golpe de aire con brasas) y `dormido`. El juego los hace soplar a todos juntos y pone
  `fuelle_sopla` 1 s antes de que las grietas se prendan.
- **Charcos fríos:** el objeto `charco_frio` (64 x 32, capa suelo, `idle` 4 a 4 fps, luz celeste de 60) y la entidad
  `charco_frio` (`id`, `zona`) en el mismo punto: ahí Thor se moja. Dos o más por zona y dos en el borde de la arena.
- **La arena de la Dragona** (El Corazón de la Fragua): `arena_jefe` (`radio: 224`), `jefe` (`dragona_brasa`, "La
  Dragona de Brasa", "La que guarda el fuego hecho de luces"), 4 `surtidor` (`id`) en diagonal a 130 px del centro,
  cada uno con su `palanca` (`surtidor` = id del surtidor) 48 px más afuera. Los objetos van en el mismo punto:
  `surtidor` (64 x 64, capa suelo, `quieto` y `chorro`), `surtidor_chorro` (64 x 128, el chorro alto que va encima,
  12 a 12 fps, una vez) y `palanca_surtidor` (32 x 48, `arriba` y `tirar` a 10 fps; la entidad sigue siendo `palanca`). 4 entidades `cadena` en el borde con
  `hacia_x`, `hacia_y` (el centro): el juego repite `cadena_dragona` (32 x 32, capa suelo, a lo largo en x) girada
  hasta la Dragona. Detrás, al norte, la **Puerta Negra**: entidad `puerta_negra` (`cerrada: true`, `destino: mundo7`)
  en el mismo punto que el objeto `puerta_negra` (256 x 256, sólido, `cerrada` y `latido` a 2 fps, luz fría de 90).
  `portal_jefe` con `destino: mundo7`.
- **La fragua apagada** (al vencer a la Dragona): los fuelles en `dormido`, los braseros (`brasero_0..2`, luz de 180)
  en `apagado`, la boca del horno (`boca_horno`, 256 x 192, luz de 360) en `apagado`, la capa agua con `agua_apagada`
  y las grietas apagadas.
- **La Ladrona:** `figura_cargadora` (48 x 64, `idle` 4 a 4 fps caminando con tres jaulitas colgadas de un palo, e
  `irse` 8 a 10 fps). Entidades `figura` con `zona` (El Río de Lava, Las Jaulas Colgantes, El Horno) y una con `alto:
  true` delante de la Puerta Negra.
- **Entidades:** `portal_llegada` (`portal: portal_brasa`), `portal_volver` (mundo5), `mural` (`pieza: 6`, en Las
  Jaulas Colgantes), `cofre` (2 con `secreto`, 1 `guardado_por: carcelero`, 1 `tras_jefe`), el minijefe `carcelero`
  con `elite: true` y los enemigos `hollin`, `salamandra_brasa` y `farolero_cadenas` (los que traen `jaula: true` y
  `luz` cuentan como jaula).
- **Zonas** con `ambiente` `fragua`, `lava`, `jaulas`, `fuelles`, `bosque_ceniza`, `carcel`, `horno` y `jefe`,
  partícula `brasas` (en las `particulas` del mundo 6; El Bosque de Ceniza usa `ceniza`), `musica: ninguna` (El
  Corazón trae `musica: jefe_dragona` y `musica_victoria: liberacion`, La Cárcel `musica_pelea: carcelero`) y su
  `frente` (`cadena_colgante_0..2`, `jaulas_frente_0..1`, `humo_frente_0..1`). Secretos: El Nido de Ceniza y La
  Alacena del Herrero.
- **Luz:** sin sombras horneadas con dirección, solo la sombra de contacto al pie. Todo lleva un filo naranja abajo a
  la derecha (el rebote del fuego). La luz es de la lava, los braseros, la boca del horno, las grietas, las jaulas,
  las luces libres, las fuentes frías y la boca de la Dragona.
- **Enemigos:** `hollin` (32: `idle`, `walk`, `attack` con 4 de aviso, `pegado` chiquito en bucle encima de la
  heroína, `hit`, `die`), `salamandra_brasa` (48: `attack` escupe con 4 de aviso y la boca que brilla, `piedra` cuando
  está mojada), `farolero_cadenas` (64: `attack`, `attack_heavy` gira la cadena con 8 de aviso, `die` se desarma y la
  jaula cae y se abre; en cada anim `jaula`: 8 listas con un `[x, y]` por cuadro desde el pivote, para su luz) y
  `carcelero` (64, `elite`: `attack`, `attack_heavy` lanza la cadena en línea con 8 de aviso, `jalar` en bucle,
  `warcry` portazo, `die` se libera y queda un herrero viejito que saluda). `fx`: `proyectil_brasa_<dir>` (16),
  `impacto_brasa` (32), `rastro_brasa` (32, capa suelo), `aviso_cadena` (128 x 64), `aviso_linea_cadena` (32, en
  bucle, se repite en línea) y `vapor` (64).
- **La Dragona de Brasa** (`dragona_brasa`, 128, `tipo: jefe`, `luz_boca`): `idle`, `walk`, `attack` (zarpazo, 6 de
  aviso), `coletazo` (medio círculo detrás, 6 de aviso, `elevacion`), `aliento` (8 de aviso con el pecho al rojo y
  después el chorro), `encendida` (fase 2, cubierta de llamas, en bucle), `warcry` (ruge al cielo, llama hollines),
  `apagada` (echada, gris, humea: ahí se le pega), `hit` y `die` (rompe las cadenas, el fuego pasa a dorado y queda una
  dragoncita dorada enroscada). En cada anim `boca`: 8 listas con un `[x, y]` por cuadro desde el pivote (la luz de la
  boca y el origen del aliento), `null` cuando está apagada con la boca cerrada. `fx`: `aviso_aliento` (32, en bucle,
  se repite en línea), `fuego_piso` (32, en bucle), `aviso_cola` (192 x 96, capa suelo, el medio círculo va arriba en
  la hoja: girarlo para que quede detrás) y `vapor_grande` (96 x 128).
- **Audio:** `ambiente_fragua` (20 s), `ambiente_lava`, `ambiente_jaulas` (con los recuerdos de arriba),
  `ambiente_fuelles`, `ambiente_bosque_ceniza`, `ambiente_carcel`, `ambiente_horno`, `musica_jefe_dragona` y
  `musica_carcelero` (en bucle), `musica_liberacion` (36 s), y los efectos `fuelle_sopla`, `grieta_rojo`,
  `calor_sube`, `acalorada`, `jaula_abre`, `luz_libre` (y `luz_libre_<luz>`, uno por luz), `thor_mojarse`,
  `thor_sacude`, `hollin_pega`, `hollin_suelta`, `salamandra_escupe`, `salamandra_piedra`, `cadena_gira`,
  `farolero_paso`, `carcelero_llaves`, `carcelero_portazo`, `dragona_ruge`, `dragona_aliento`, `surtidor_chorro`,
  `dragona_apagada`, `cadenas_rompen` y `puerta_negra` (`palanca` es el de siempre). Todo con pico de 0.5.
- **Íconos:** `ui.habilidades.sacudir` y `sacudir_seco` (en gris, sin agua), `calor`, `jaula` y `palanca`.
  **Portal:** `portal_brasa`.

### Mundo 7: El Corazón Helado (encargo F13)

`manifest.mundos` trae `mundo7` (mapa `mundo/mundo7_corazon.json`, 120 x 110, con `fondo` (`fondo_hielo_lejos_0..2`, se
ve por el vacío del puente y del corazón), `portal: portal_hielo`). Resumen de la entrega: `docs/entregas/abyss_mundo7.md`.
Lo nuevo:

- **El agua helada:** la capa `agua` son los agujeros de agua negra del lago (`mundo/mundo7_agua.png`), ya sólidos en
  `colision`. Sin `reflejo`. La `espuma` es la escarcha de la orilla.
- **Hogueras de hueso** (la fogata del piso): 5 `punto_guardado` con `hoguera: true` y `objeto: hoguera_hueso`. El
  objeto (64 x 64, `idle` 8 a 8 fps, luz tibia `#ffb060` de 240) va en la capa objetos justo arriba del punto. Es la
  única luz tibia del piso: ahí se descongela la heroína. La de La Escalera Helada trae `tutorial: true`.
- **Refugios de la ventisca:** entidades `columna_hielo` y `gigante` con `objeto` (`columna_hielo_0..3`,
  `gigante_congelado_0..2` y sus `_b`) y `ancho`. El punto es el centro de la base sólida del objeto (el mismo de la capa
  objetos). El lado contrario al viento protege. Los gigantes traen `respira` (2 cuadros a 1 fps): ponerla de vez en
  cuando. Columnas y gigantes brillan apenas frío (70 y 140).
- **Hielo fino:** entidades `hielo_fino` (rectángulos en Tiled, múltiplos de 32) sobre el lago, siempre caminables y
  nunca en un camino obligado. El juego llena cada parche con `hielo_fino_<v>` en cuadros de 64 (la variante por
  posición, en las notas de `hielo_fino`): `quieto`, `cruje` (6 a 8 fps, una vez, si la heroína se queda parada) y
  `roto`.
- **El frío:** todo el piso es oscuridad casi total. En El Puente de las Cadenas la zona trae `ventisca: siempre`; en
  las demás va y viene. Partículas nuevas `nieve` (nieve negra con ceniza) y `ventisca` (la raya de lado, para cuando
  sopla).
- **La arena del Diablo** (El Corazón Helado): `arena_jefe` (`radio: 256`), `jefe` (`diablo`, "El Diablo", "El que se
  come la luz para no apagarse"), 4 `brasero_hueso` en diagonal a 170 px del centro, cada uno en el mismo punto que su
  objeto (48 x 80: `apagado`, `prenderse` 8 a 12 fps, `prendido` 6 a 8 fps con luz `#ff7a30` de 220, y `congelado`).
  Al norte el `trono_diablo` (256 x 256, sólido, `idle` 6 a 4 fps, las brasas laten; entidad en el mismo punto). Al lado,
  la `figura` con `alto: true` y `objeto: figura_ultima_llama` (la Ladrona con la última llama: `idle` y `irse`).
  `portal_jefe` con `destino: fin` (la cinemática de cierre la pone el juego).
- **Entidades:** `portal_llegada` (`portal: portal_hielo`), `portal_volver` (mundo6), `mural` (`pieza: 7`, en Las
  Catacumbas), `cofre` (2 `secreto` con `pista`, 2 `guardado_por`, 1 `tras_jefe`), `figura` (también en el Lago y la
  Ciudadela), los minijefes `reina_escarcha` y `guardian_puerta` con `elite: true` y los enemigos en grupos grandes
  (campo `grupo`).
- **Zonas** con `ambiente` `hielo`, `lago`, `catacumbas`, `bosque_hielo`, `ciudadela`, `puente`, `puerta` y `trono`,
  partícula `nieve` (`ventisca` en el Puente, `ceniza` en las Catacumbas, la Puerta y el Corazón), `musica: ninguna`
  (El Lago trae `musica_pelea: reina_escarcha`, La Puerta `musica_pelea: guardian`, El Corazón `musica: diablo_1` y
  `musica_fases: diablo_1,diablo_2,diablo_3,diablo_final`) y su `frente` (`cadena_helada_0..2`, `nieve_frente_0..1`,
  `carambanos_frente_0..1`). Secretos: La Guarida del Lobo y La Cripta Sellada.
- **Luz:** sin sombras horneadas con dirección, solo la de contacto al pie. La luz es de las hogueras, los braseros
  prendidos, el trono (rojo, 260), la Ladrona (rojo chiquito), el farol de la heroína, sus luces compañeras y los ojos
  del Diablo.
- **Enemigos:** `lobo_escarcha` (48: `attack` mordida con 4 de aviso, `run`, `aullar` llama a la manada),
  `espectro_helado` (48, `vuela`: `cast` con 6 de aviso suelta `proyectil_rayo_hielo_<dir>` y al pegar
  `impacto_rayo_hielo`), `diablillo` (32: `attack` con 4 de aviso tira `proyectil_fuego_chico_<dir>`, al pegar
  `impacto_brasa`), `caballero_congelado` (64: `bloquear` en bucle con el escudo al frente, `attack_heavy` con 7 de
  aviso), `bruja_escarcha` (48: `cast` con 6 de aviso levanta el objeto `muro_hielo` (32 x 64, `subir`, `quieto`,
  `romper`, sólido mientras dura) o cura) y `sombra_devoradora` (48: `attack` con 4 de aviso se traga una luz
  compañera). Minijefes: `reina_escarcha` (64, `vuela`: `cast` las lanzas con `aviso_lanza_hielo`, `warcry` la
  ventisca, `dividirse` suelta los dos reflejos en el cuadro 10) y `guardian_puerta` (64: `attack` el golpe en cruz con
  dos impactos y `aviso_cruz`, `attack_heavy`, `charge` en bucle). Todos se deshacen en nieve, escarcha o humo.
- **El Diablo** (`diablo`, 192, `tipo: jefe`, `luz_ojos` `#ff2a1a` de 120): `idle`, `walk`, `attack` (zarpazo, 6 de
  aviso), `nova` (8 de aviso), `charge` (en bucle), `rayo` (8 de aviso), `pilares` (7 de aviso), `oscuridad` (solo
  quedan los ojos; los últimos 4 cuadros se repiten), `jaula` (6 de aviso), `warcry`, `aturdido` (en bucle, de
  rodillas y la piel enfriada: ahí se le pega), `hit` y `die` (`aterriza` en el 5, `suelta` en el 10: la última llama
  sale del pecho, y se deshace en ceniza y escarcha). En cada anim `ojos` (la luz de los ojos, `null` cuando la ceniza
  le llega a la cara), `boca` (de donde sale el rayo): 8 listas con un `[x, y]` por cuadro desde el pivote, y `alas`
  (las dos puntas de las alas: 8 listas con `[[x, y], [x, y]]` por cuadro). Las alas son lo único con sangre del
  juego: hilos oscuros que gotean de los desgarrones y las espinas. Mientras camina, el juego suelta una gota desde una
  punta cada tanto, la deja caer al piso y pone `gota_sangre_diablo` (16, 6 cuadros, una vez, con el piso en la fila
  13). `fx`:
  `nova_fuego_diablo` (256, 10 cuadros, sale del pivote, con dos huecos para pasar: los ángulos en las notas del
  Diablo), `aviso_nova` (256, 8, capa suelo), `rayo_rojo` (32, 6 en bucle, se repite en línea desde `boca`),
  `aviso_rayo` (32, 6 en bucle, capa suelo), `pilar_fuego` (64 x 128, 12), `aviso_pilar` (64 x 32, 8, capa suelo),
  `jaula_huesos_subir` (96, 8), `jaula_huesos_quieta` (96, 1) y `jaula_huesos_romper` (96, 8), `aviso_carga_diablo`
  (32, en bucle, en línea) y `gota_sangre_diablo` (16, 6).
- **Audio:** `ambiente_hielo` (20 s), `ambiente_bosque_hielo`, `ambiente_lago`, `ambiente_catacumbas`,
  `ambiente_ciudadela`, `ambiente_puente`, `ambiente_puerta`, `ambiente_trono` (con el latido), `musica_reina_escarcha`
  y `musica_guardian` (en bucle), `musica_diablo_1` a `musica_diablo_3` y `musica_diablo_final` (en bucle, el mismo
  tema cada vez más rápido y más fuerte), y los efectos `ventisca_viene`, `viento_fuerte` (en bucle), `frio_sube`,
  `congelada`, `hielo_cruje`, `hielo_rompe`, `agua_helada`, `hoguera_prender`, `luz_comida`, `luz_vuelve`,
  `lobo_aullido`, `lobo_mordida`, `espectro_rayo`, `diablillo_risa`, `diablillo_fuego`, `escudo_bloquea`,
  `bruja_muro`, `bruja_cura`, `reina_lanzas`, `reina_ventisca`, `guardian_cruz`, `guardian_carga`, `diablo_ruge`,
  `diablo_paso`, `diablo_nova`, `diablo_rayo`, `diablo_pilares`, `diablo_oscuridad`, `jaula_huesos`, `jaula_rompe`,
  `brasero_hueso_prender`, `brasero_congela` y `diablo_cae`. Pico de 0.6 o menos.
- **Íconos:** `ui.habilidades.frio`, `compañeras` (archivo `ui/habilidades/companeras.png`), `brasero` y `romper`.
  **Portal:** `portal_hielo`.

### El intro (parte 4)

`manifest.intro` trae los paneles pintados para el intro: `intro_bosque_noche`, `intro_corte_abismo`, `intro_ojos`,
`intro_guardianes` e `intro_familia`. Cada uno trae `{ w, h, capas: [{ nombre, archivo, cuadros, fps, paralaje }] }`;
cada capa es una tira de cuadros y se dibujan en orden (fondo, medio, frente). También trae:

- `logo_fuego`: 16 cuadros en una grilla de 4 x 4 (`columnas: 4`). El cuadro i va en la columna i % 4 y la fila
  floor(i / 4).
- `fuego_pared`: 128 x 96, se repite a lo ancho.
- `humo_grande`: 128 x 128.
- `audio`: `musica_intro` (27 s, golpes en 9, 13 y 23 s y silencio de 22.5 a 23 s) y `latido` (1.2 s).

Qué panel va en cada momento de `GUION_INTRO`, en `intro.notas`. Detalle en `docs/intro/INTRO.md`.

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
