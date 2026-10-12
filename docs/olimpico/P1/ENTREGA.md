# Lote P1: la pelea
Estado: entregado, pendiente de Rick
PR: (se llena al abrir el PR)
Fecha: 2026-10-12

## Qué se hizo

El arte que le faltaba a la pelea del juego, que ya estrenó agarre, guardia, pisotón, combos, VS, comida y K.O. Todo es capacidad general del motor: sirve para cualquier juego que pida el pack o la sección en su `kit.config.json`.

**Animaciones nuevas, pack `kachinuki`** (para los 8 atletas, en las 5 filas del juego):

| Animación | Cuadros | Metadato clave |
|---|---|---|
| `stomp` | 6 | `impacto` con `punto` en el pie que pisa |
| `grab_throw` | 8 | `suelta` con `punto` en la mano, por encima del hombro |
| `knee_hit_react` | 5 | el agarrado se dobla con el rodillazo |
| `back_elbow` | 6 | `impacto` con `punto` en el codo |
| `dash` y `dash_back` | 6 | `desplazamiento` por cuadro, `paso` |
| `headbutt` | 6 | `impacto` con `punto` en la frente |
| `eat` | 8 | `impacto` cuando la mano agarra la comida |
| `edge_teeter` | 8, bucle | tambalearse en el borde |
| `fall_off` | 8 | `despegue` |
| `taunt_<id>` | 8 a 10 | la burla propia de cada uno |
| `victory_<id>` | 8 | la victoria propia de cada uno |

Las burlas son las del pedido: Rick hace el "pana, tranquilo", Steph se cruza de brazos y zapatea, Sophie hace pistolita, Alana silba llamando a Thor, Kenji se arregla el pelo, Ryu se ríe tapándose la boca, Goro se golpea la panza y Tetsu saca la lengua. Las victorias: Rick puño y pulgar, Steph se echa el pelo, Sophie salta con la V, Alana da saltitos, Kenji se cruza de brazos, Ryu hace una reverencia burlona, Goro saca músculo y Tetsu la V con guiño y lengua.

Cada cuadro trae `cajas`, `cuerpo`, `manos`, `cabeza`, `pies`, `carga` y `arma` como el resto de los packs.

**Motor:**
- **Impacto en la articulación que pega.** Un evento puede decir qué pega (`joint`): pie, mano, codo o frente. El `punto` del manifiesto sale de ahí en cada fila. Antes el motor solo sabía de manos y pies, y adivinaba.
- **Articulaciones nuevas:** `elbowNear`, `elbowFar` y `frente`.
- **Bocas nuevas:** `smirk` (media sonrisa torcida) y `tongue` (lengua afuera), en los sellos de 32, 48 y 64 y en las cabezas por medidas.
- **Ojos nuevos:** `wink`, un guiño con la ceja fruncida.
- **Animaciones con dueño:** el pack lista todas las propias y el kit dibuja en cada atlas solo las suyas.

**Comida** (objetos del kit con `peso: "comida"`): arepa, tequeño (`tequeno`), empanada, bánh mì (`banh_mi`) y pan de bono. Cada una en 16 x 16, con contorno, su sombra en el piso, `cura` de 1 a 3 y 4 cuadros de humito.

**Efectos** (catálogo general, mismo formato del lote F):
- `onomatopeya_pow`, `onomatopeya_paf`, `onomatopeya_crack` y `onomatopeya_nam`: estallido de cómic con las letras dibujadas en bloques, 6 cuadros, entran con rebote.
- `ko_grande`: K.O. de pantalla completa, 12 cuadros, con destello, rayos, letras que se estrellan una por una y astillas.
- `bloqueo`: el destello azul de la guardia.
- `agarre`: líneas de esfuerzo en bucle.

**UI:**
- `vs_fondo`: fondo VS por cada par de equipos, los dos colores partidos en diagonal con una costura de rayo, rayos desde el centro, trama de cómic y franjas negras. Más uno neutro y las letras VS aparte.
- Retrato `burla`: la octava expresión, con guiño y media sonrisa. Es el `grande_burla` que pide el VS.

**Público de azoteas:** la gente asomada detrás del muro de la azotea vecina, de día y de noche (con celulares prendidos). Tiene 3 estados de 4 cuadros:
- `quieto`: respiran, alguno con el celular.
- `celebra`: brazos arriba, saltan, sacuden toallas.
- `abuchea`: señalan hacia la pelea, puño que sube y baja, pulgar abajo.

## Cómo se usa

La línea para el `kit.config.json` del juego:

```jsonc
"packs": {
  // ...los de siempre...
  "kachinuki": ["stomp", "grab_throw", "knee_hit_react", "back_elbow", "dash", "dash_back", "headbutt", "eat", "edge_teeter", "fall_off",
                "taunt_rick", "taunt_steph", "taunt_sophie", "taunt_alana", "taunt_kenji", "taunt_ryu", "taunt_goro", "taunt_tetsu",
                "victory_rick", "victory_steph", "victory_sophie", "victory_alana", "victory_kenji", "victory_ryu", "victory_goro", "victory_tetsu"]
},
"pruebas": { "pelea": [/* ... */, "kachinuki"] },
"objetos": true,                         // ya trae la comida después de las armas
"ui": { "fuentes": { "idiomas": ["es", "en", "vi"] }, "vs_fondo": true },
"publico": { "azoteas": true },
"fx": true                               // trae los 7 efectos nuevos
```

Lo que sale:

- `atletas/<id>/kachinuki.png` y `.json`, con 12 animaciones por atleta: las 10 comunes y sus 2 propias.
- `objetos/comida.png` y `.json`. Las entradas van en `manifest.objetos` con `atlas: "objetos/comida.json"`.
- `fx/onomatopeya_*.png`, `fx/ko_grande.png`, `fx/bloqueo.png` y `fx/agarre.png`.
- `ui/vs/familia_gg__instituto_nekketsu.png`, `ui/vs/neutro.png` y `ui/vs/letras.png`. Van en `manifest.ui.vs` con su `centro`.
- `publico/azoteas.png` y `publico/azoteas_noche.png`, en `manifest.publico.azoteas`.
- `retratos.png` con 8 expresiones. La 8 es `burla`.

**Lo que tiene que cambiar el juego para usarlo** (ESTADO.md del juego):

1. `src/core/kit.ts`:
   - `Objeto.peso` acepta `'comida'` y trae `cura`.
   - El cargador de objetos tiene que cargar cada `atlas` distinto. Hoy carga el del primer objeto, que sigue siendo `armas.json`.
2. La arepa de figuras pasa a ser `comida_<id>_humito_*`. `eat` se dispara al pisarla. En el `impacto` desaparece del piso y sale `onomatopeya_nam` en la cabeza.
3. El pisotón usa `stomp` en vez de `low_kick`. El agarre usa `grab_throw` para lanzar y `knee_hit_react` en el agarrado.
4. El VS:
   - Usa `ui.vs.pares["<a>__<b>"]` de fondo.
   - Estrella `ui/vs/letras.png` en `ui.vs.centro` con su propio rebote.
   - Usa `grande_burla` para el que se burla.
5. El público va en una capa sobre la azotea vecina del fondo, con el borde de abajo (`muro`) apoyado en ella. Cambia de fila según lo que pase.

## Pruebas

- `src/engine/__tests__/pelea.test.ts` (nuevo):
  - Están todas las animaciones del pedido y las 16 propias.
  - `dash` y `headbutt` tienen 6 cuadros y `eat` tiene 8.
  - **Los 8 atletas pasan el control de calidad en las 5 filas** del juego, en todas sus animaciones de `kachinuki`, sin cuadros vacíos.
  - Ningún clip repite el mismo dibujo en todos sus cuadros.
  - El `punto` del impacto cae exacto en el pie (stomp), el codo (back_elbow), la frente (headbutt) y la mano (eat), y la frente queda arriba y el pie abajo.
  - Los 7 efectos tienen sus cuadros, ninguno vacío y todos distintos del anterior.
  - Comida: 5 distintas, legibles, con sombra y humito que cambia.
  - `grande_burla` de los 8 es distinto del enojo y del neutral.
  - VS: la Familia GG sale azul y el Instituto rojo, y dos equipos del mismo tono se separan.
  - Público: los 3 estados se mueven, la noche es más oscura y la hoja sale con gente aunque no se pase `ancho`.
- `custom.test.ts`:
  - El kit completo de Nekketsu trae `kachinuki` con las propias solo en su dueño, la comida después de las armas, `ui.vs`, `publico.azoteas`, los 63 efectos y el `punto` del impacto en las 5 filas.
  - No falta ni sobra ningún archivo y ninguna imagen pasa de 4096 px.
- **Suite completa (vitest): 255 pruebas.** En la primera corrida pasaron 252. Las 3 que fallaron eran esperables o mías y quedaron corregidas:
  - La imagen dorada de efectos: entraron los 7 nuevos. Revisé que los 56 de antes quedaran idénticos pixel por pixel antes de regenerarla.
  - El ancho de la hoja de retratos: ahora tiene 8 expresiones.
  - `edge_teeter` de Rick a 32 px se salía de la celda: bajé la inclinación.

  Los 5 archivos tocados pasan 70 de 70 en la segunda corrida.
- **e2e (Playwright): 44 de 44.** El estudio ahora muestra 63 efectos, y ajusté esa cuenta en la prueba.
- `tsc` sin errores.

**Un bug que agarré revisando los GIF:** el kit sacaba la hoja del público vacía, porque `ancho: undefined` pisaba el valor de fábrica. Está corregido y tiene su prueba.

## Para aprobar

- `pelea_sophie_alana.gif`: Sophie hace dash y le da un cabezazo a Alana (¡POW! en la frente). Alana se dobla, retrocede y se come la arepa (¡ÑAM!). Después las dos se burlan, Alana le da el codazo de espaldas (CRACK!) y las dos celebran. El público reacciona en cada momento.
- `burlas_y_victorias.gif`: los 8 de frente, primero la burla y después la victoria.
- `vs_sophie_kenji.gif`: el fondo Familia GG contra Instituto, los retratos `grande_burla` que entran y las letras que se estrellan.
- `ko_grande.gif`: el K.O. sobre la azotea con Kenji cayéndose del borde.
- `comida_y_publico.gif` y `tablero_comida.png`: la comida con humito, y el público de día y de noche en sus 3 estados.
- `tablero_<id>.png` (los 8): las 12 animaciones de cada uno en la fila `right`, con el cuadro del impacto en rojo y su punto marcado.
- `hoja_de_contactos.png`: los 8 por las 12 animaciones, en el cuadro clave.
- `filas_stomp_sophie_alana.png` y `filas_headbutt_sophie_alana.png`: las 5 filas, para ver diagonales, de frente y de espaldas.

## Decisiones que tomé sin preguntar

1. **Un pack aparte, `kachinuki`,** en vez de meterlas en `ngg_golpe`. El juego decide si las junta. Así no cambia ningún atlas que ya usa.
2. **`dash_back` aparte de `dash`.** El pedido dice "hacia adelante o atrás". Con dos animaciones el cuerpo se inclina bien en cada sentido, y `desplazamiento` va positivo o negativo.
3. **Ids sin ñ ni tildes:** `tequeno` y `banh_mi`. El nombre bonito va en `nombre.es`.
4. **Cuánto cura cada comida:**
   - 3: arepa y bánh mì.
   - 2: empanada.
   - 1: tequeño y pan de bono.

   El juego lo traduce a vida.
5. **La comida va en `objetos` con su propio atlas, después de las armas.** `objetos: true` ahora también la trae. El primer objeto sigue siendo un arma, para no romper el cargador del juego de hoy.
6. **El `impacto` de `eat` es cuando la mano agarra la comida**, no el mordisco. Es cuando el juego la tiene que quitar del piso. El ¡ÑAM! va en la cabeza (`se_pega_a: cabeza`).
7. **La burla es un guiño con la ceja fruncida y media sonrisa.** Con solo cejas y media sonrisa quedaba igual que `enojo` a 96 px. Agregué el ojo `wink` al motor.
8. **El VS sin las letras horneadas.** El juego ya estrella "VS" con su rebote, así que las letras van aparte y el fondo queda limpio.
9. **El color de cada lado del VS** es el primero del equipo, salvo que sea muy oscuro o gris. Si los dos quedan del mismo tono, el de la derecha usa otro suyo. Por eso el Instituto (azul marino y rojo) sale rojo contra el azul de la Familia.
10. **El público es una tira genérica detrás de un muro,** de día y de noche, y señala hacia el medio de la tira. La clave nueva es `publico.azoteas`. Los hinchas por país (`publico.paises`, C6) siguen como aviso.
11. **Poses exageradas** en stomp, back_elbow y dash_back. A tamaño chibi el movimiento real no se leía.
12. **Los rayos del K.O. solo en un anillo** y con tramado abierto. Llenando la pantalla tapaban la pelea.

## Límites honestos

- **Burlas de frente:** en la fila `down` las burlas de Rick, Steph y Kenji se leen menos que de lado. Son gestos de brazos chiquitos a 48 px.
- **El guiño no se ve en todos:**
  - En Tetsu no se ve: tiene lentes oscuros.
  - En Alana lo tapa el pelo.
  - En Steph y Rick los lentes lo achican.

  En los cuatro la burla queda en la media sonrisa, que mide 3 a 5 px.
- **El retrato grande sigue siendo el sprite escalado x3.** Un dibujante de cabezas grandes de verdad, como pide el punto de retratos del pedido, sigue pendiente.
- **Tequeño y bánh mì** son las dos alargadas. A 16 px se distinguen por el color y el relleno, no por la silueta.
- **El público se repite cada `ancho` px** (320 por defecto), con la misma gente. Para una azotea de 640 conviene pedir `"ancho": 640`.
- **`grab_throw` dibuja solo al que lanza.** Al lanzado lo pone el juego con `carried` y `thrown_spin` del lote B1, usando el dato `carga`.
- **`edge_teeter` y `fall_off` están pensadas de lado.** En `up` se leen menos.
- **Los GIF usan una azotea dibujada a mano para el ejemplo,** no la de `caracas_azotea`. Esa llega con E3.

## Lo que necesita el siguiente lote

- **El juego:** los 5 cambios de "Cómo se usa", sobre todo cargar el atlas de la comida y usar `ui.vs`.
- **E3 (`caracas_azotea`):** puede usar `publico.azoteas` de noche en las azoteas vecinas, que es lo que pide el punto 8.
- **C2:** la cara malandra usa la boca `smirk` y las cejas `angry`, que ya están en el motor.
