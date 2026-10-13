# Escenarios oblicuos

Escenarios para beat 'em ups y juegos de deportes en vista oblicua, como los de 8 bits: la calle de lado, una franja donde se camina en profundidad y las casas atrás. **El juego define la geometría y PixelForja pinta encima y verifica.** Nada del dibujo cambia dónde se para un atleta.

- **El layout lo escribe el juego:** largo, franja, piso, huecos, cajas, muros, postes, agua, techos bajos, carriles y entidades.
- **PixelForja devuelve la carpeta `escenarios/<id>/`:**
  - capas en trozos de 1280 px;
  - objetos con su orden de profundidad y vida animada;
  - mapa de superficie, colisión, luces y partículas;
  - las 9 pruebas del pedido en `verificacion.md`.
- **Todo es pixel art hecho con código,** a escala 1, con una paleta de 24 colores por escenario.

## Cómo se genera

**Línea de comandos:**

```bash
npm run escenario -- data/stages/saigon_hem.layout.json public/escenarios
npm run escenario -- data/stages/saigon_hem.layout.json salida --postales --ficha   # para aprobar el arte
```

- Valida, pinta y corre las 9 pruebas. Si una falla, no escribe nada y sale con código 1.
- `--postales` suma `postales/inicio.png`, `medio.png` y `final.png`.
- `--ficha` suma `ficha_arte.md`.
- El juego no carga ni las postales ni la ficha.
- Opciones:
  - `--semilla n`: cambia los detalles al azar, como casas, letreros y grietas. La misma semilla da los mismos pixeles.
  - `--contorno #hex`: color de contorno de los atletas para la prueba de legibilidad. Se repite una vez por equipo.

**Desde código:** la API pública es `src/engine/world/oblique/index.ts`. Es lo único que un juego tiene que importar. El resto de esa carpeta puede cambiar de forma sin aviso.

```ts
import { generarEscenario } from '<pixel_forja>/src/engine/world/oblique';

const r = generarEscenario(JSON.parse(texto), { postales: false, ficha: false });
if (!r.ok) throw new Error(r.errores.join('\n'));      // layout mal escrito o una prueba que falla
for (const a of r.avisos) console.warn(a);              // campos que PixelForja no usa (se conservan)
for (const a of r.archivos) escribir(`escenarios/${r.id}/${a.nombre}`, a.bytes);
```

**En el kit a medida:** `"escenarios": "data/stages/"` (o una lista de layouts) en `kit.config.json`.
- Cada layout sale en `escenarios/<id>/`.
- `manifest.escenarios` dice dónde está cada `escenario.json`.

**En el estudio:** Inicio, **Escena**.
- Abre un layout y lo muestra pintado, con paralaje, vida y clima.
- Pone a correr encima al personaje del estudio.
- Tiene un interruptor para ver la colisión del layout.
- Muestra las 9 pruebas y descarga el `.zip`.

## El layout

El formato es el de la sección 10.2 del pedido. Medidas en pixeles de mundo:
- `x` va a lo largo.
- `y` es la profundidad dentro de la franja (0 al fondo).
- `z` es la altura sobre el piso.

En pantalla no hay inclinación: `px = x`, `py = franja.atras + y - z`. Una caja muestra su techo (`d` filas) y su frente (`z` filas).

- **Campos que se aceptan sin aviso:** `nombre` y `nota` en cualquier lista, `tipo` en muros y sólidos, y `y0`/`y1` en `bajo` y en `agua`.
- **Cualquier otro campo:** pasa con un aviso y se conserva en `escenario.json`.
- **Errores, con su lugar exacto:** un tipo de piso que no existe, algo fuera del largo o de la franja, un carril que no existe o un `x1` menor que `x0`.
- Ejemplo: [`docs/ejemplos/nekketsu/escenarios/saigon_hem.layout.json`](ejemplos/nekketsu/escenarios/saigon_hem.layout.json).

## Lo que sale

| Archivo | Qué es |
|---|---|
| `escenario.json` | El layout validado y cómo va cada capa: archivo, `y` en pantalla y paralaje |
| `cielo_<hora>.png` | Cielo de 640 x 360, se repite en x sin costura. Paralaje 0 |
| `lejos.png` | La ciudad lejana, 1280 de ancho, se repite en x. Paralaje 0.25 |
| `cerca_<n>.png` | La fila de casas en trozos de 1280, de la fila 0 a `franja.atras`. Arriba queda transparente: ahí se ven el cielo y la ciudad, también por los callejones |
| `piso_<n>.png` | El piso en trozos de 1280, desde `franja.atras`. Las primeras filas son la franja y las de abajo la orilla de enfrente |
| `piso_mojado_<n>.png` | Charcos y piso mojado, encima del piso, si el clima trae aguacero |
| `frente_<n>.png` | Primer plano sobre la acera de enfrente. Nunca tapa la franja |
| `objetos.png` + `.json` | Cada caja del layout dibujada a su medida, el toldo, los postes y el portón. Con `x`, `y` y `orden`. Lo que lleva algo colgado que pone el juego (el poste del Tama-wari) trae `gancho`: el punto de pantalla donde va el ancla de eso |
| `vida.png` | Lo que se mueve, cuadro a cuadro: ropa tendida, cables con viento, palomas (2 cuadros paradas y 2 volando) y motos al fondo |
| `superficie.png` | Por pixel de la franja: qué suena al pisar (`paso_piedra`, `paso_agua`... más `_0` a `_2`) y si resbala. La leyenda va en `escenario.json` |
| `borde_filo.png` + `borde_vacio.png` | Solo si hay un borde al vacío (un hueco `vacio` que llega al final del mundo). El filo con la franja amarilla y negra que se desmorona en 6 cuadros, y la ciudad allá abajo en 128 x 128 que se repite. Para cuando el juego hace avanzar el borde. Van en `escenario.json` → `borde` |
| `colision.json` | La geometría del layout, igual |
| `luces.json` | Color, radio y latido. De día, las lámparas de los postes van apagadas |
| `particulas.json` | Humo de incienso, pétalos, goteras, ondas en el agua. Las que traen `fx` usan el catálogo de efectos del kit |
| `verificacion.md` | Las 9 pruebas, con lo que midió cada una |
| `postales/*.png` | Con `--postales`: inicio, medio (la ventana con más obstáculos) y final, a 640 x 360. En una arena o un mundo de una pantalla van a 0, 2 y 4 segundos, para que se vea la vida |
| `ficha_arte.md` | Con `--ficha`: paleta, elementos icónicos, vida y qué dibujo va en cada caja |

## Vista inclinada

Desde E2 los escenarios salen en la vista inclinada de la pelea, con `inclinacion` 0.35 por defecto. La proyección es la misma del gris del juego:

```
px = x + inclinacion * y      (y = 0 al fondo de la franja; lo del fondo queda a la izquierda)
py = franja.atras + y - z
```

- **La geometría no cambia.** El layout y `colision.json` son los mismos. Solo cambia el dibujo.
- **Todo lo que toca el piso se corre `inclinacion * y`:** piso, juntas, agua, huecos, cajas, postes, toldos, sombras y partículas.
- **Las capas largas miden `largo + inclinacion * D`.** `escenario.json` trae `inclinacion` y `ancho`.
- **Las cajas son volúmenes:**
  - el techo es un paralelogramo, el frente un rectángulo;
  - la cara de la izquierda se ve y da a la luz;
  - esa cara sube desde lo que la caja tenga pegado a ese lado, así un tramo de escalones se lee escalón por escalón (la contrahuella);
  - la cara va en su propio objeto, `<tipo>_cara`, con `orden` y + 0.1: delante de lo que va detrás de la caja y detrás de quien pasa a su lado;
  - las caladas o redondas (vallas, tanques, botes, carritos) no llevan cara.
- **Los huecos** muestran la pared del fondo (de frente), la pared del otro lado (inclinada) y abajo el agua o el vacío. Lo que los cruza (una viga) muestra su canto de 8 px.
- **Adelante va el bordillo:** la cara del piso que da a la cámara, de la fila D hasta el borde de la pantalla. Donde el agua llega adelante, el agua sigue.
- **Para el juego:** corre a los atletas `inclinacion * y`, igual que en el gris. Los objetos de `objetos.json` ya vienen corridos.
- **Una caja parada sobre otra** (un tanque en la terraza, el aire en el techo, las letras en el mirador) se dibuja solo de su base para arriba, y su `orden` es el de la caja de abajo + 0.3: así va después de ella. Quien se pare encima de esa caja va con `setDepth(FT + orden + 0.5)` del objeto de la caja, no con `y + d` (que la dejaría detrás de la base).
- **Los postes se paran en lo que tengan debajo:** su `alto` se mide desde el techo de la caja donde están, y su `orden` va justo después de esa caja.
- **Los tramos de peldaños seguidos** (escalera eléctrica, escalones, escalera de colores) salen como un solo objeto `<tipo>_<n>_tramo`, con las contrahuellas de adentro. La cara izquierda del primero queda aparte.
- **Para el dibujo derecho de antes:** `generarEscenario(layout, { inclinacion: 0 })`.

## Vista de lado

Para las pruebas que el juego dibuja de lado (Đá cầu, Tejo, Vóley Playa y Tenis): la cancha se ve de frente, el fondo detrás y el piso es una franja angosta donde se paran los atletas. Desde E4a.

```json
{
  "id": "tao_dan", "pais": "vietnam", "prueba": "da_cau",
  "vista": "lado",
  "largo": 640,
  "franja": { "atras": 290, "adelante": 330 },
  "carriles": [{ "y": 14 }, { "y": 26 }],
  "paralaje": { "lejos": "saigon_amanecer", "cerca": "parque_tao_dan" }
}
```

- **`vista: "lado"`** en el layout. Sin el campo, la vista es `oblicua`, como siempre. Otro valor da error.
- **El dibujo va derecho:** inclinación 0, pida lo que pida la opción `inclinacion`. `escenario.json` trae `inclinacion: 0` y `ancho` igual al `largo`, que el juego ya lee.
- **La franja es la fila del piso del juego:** `franja.atras` es donde se para el fondo y la fila de pantalla de un atleta es `franja.atras + y`. En Tao Đàn, el piso de `DaCau.ts` está en la fila 310 y sus dos filas (304 y 316) son los carriles 14 y 26. En la cancha de tejo, `Tejo.ts` pone el piso en la 300: la franja va de 286 a 310 y los carriles son 10 (los que esperan) y 14 (el que lanza). Margarita y Đà Lạt (E5) usan la misma franja que Tao Đàn: `Voley.ts` y `Tenis.ts` también ponen el piso en la 310, con las filas 304 y 316.
- **Las mismas capas de siempre**, así el juego las carga con lo que ya tiene:
  - `cielo` y `lejos` como siempre.
  - `cerca` es **el fondo**: de la fila 0 a `franja.atras`, transparente donde se ve lejos (entre los árboles, por las ventanas).
  - `piso` va de `franja.atras` hasta el borde de abajo de la pantalla: la franja y lo de adelante. Si la franja es angosta, el piso crece hasta la fila 360.
  - `frente` queda libre, `objetos` y `vida` como siempre.
- **`escenario.json` suma** `vista: "lado"` y `nota_vista`, y no quita nada. Un escenario oblicuo no trae el campo, así sale igual que antes.
- **En el juego**, en vez de la imagen de fondo de la prueba: `queueEscenario(this, 'tao_dan')` en el preload, `pintarEscenario(this, 'tao_dan', 5000)` en el create y `arte.tick(dt, cam.scrollX, () => false)` cada cuadro. Los atletas siguen en su fila de siempre: la vista de lado no corre a nadie.

## En Phaser

```js
const E = this.cache.json.get('escenario');            // escenarios/<id>/escenario.json
const FT = E.franja.atras, C = E.capas, dir = `escenarios/${E.id}/`;

this.add.tileSprite(0, 0, 640, 360, 'cielo').setOrigin(0).setScrollFactor(0).setDepth(-50);
this.add.tileSprite(0, C.lejos.y, 640, 170, 'lejos').setOrigin(0).setScrollFactor(0).setDepth(-40)
  .setData('paralaje', C.lejos.paralaje);               // en update: lejos.tilePositionX = cam.scrollX * 0.25
C.cerca.archivos.forEach((f, i) => this.add.image(i * C.cerca.trozo, C.cerca.y, `cerca_${i}`).setOrigin(0).setDepth(-30));
C.piso.archivos.forEach((f, i) => this.add.image(i * C.piso.trozo, C.piso.y, `piso_${i}`).setOrigin(0).setDepth(-20));
C.frente.archivos.forEach((f, i) => this.add.image(i * C.frente.trozo, C.frente.y, `frente_${i}`).setOrigin(0).setDepth(9000));

// objetos: con la misma profundidad que los atletas (que usan setDepth(FT + y))
const O = this.cache.json.get('objetos');
for (const o of O.objetos) this.add.image(o.x, o.y, 'objetos_atlas', o.id).setOrigin(0).setDepth(FT + o.orden);
```

**Para cargar los objetos como atlas:** cada `cuadro` de `objetos.json` es el rectángulo dentro de `objetos.png`. Lo mismo vale para la vida en `vida.png`.

**Las capas de la vida** (`escenario.json`, `vida.piezas[].capa`):

| Capa | Dónde va | Cómo se mueve |
|---|---|---|
| `tras_cerca` | Entre la ciudad lejana y las casas | `velocidad` y `cada`: cruza y vuelve |
| `cerca` | Encima de las casas, en x e y de pantalla | Quieta, cambia de cuadro a `fps` |
| `lejos` | Pegada a la capa lejos: x e y son pixeles de `lejos.png`, que se repite cada su ancho y corre con su paralaje | Va de `recorrido.desde` a `recorrido.hasta` en `recorrido.segundos` y vuelve a empezar, adelantada por `recorrido.desfase` (0 a 1). Es el metrocable |
| `objeto` | Encima de un objeto, en x e y de pantalla | Se ordena con los atletas con `setDepth(FT + orden)`, como los objetos. Son los peldaños de la escalera eléctrica que corren y la bandera del asta |

```js
// la vida de la capa lejos: en update, con lejosX = cam.scrollX * C.lejos.paralaje
const f = ((t / p.recorrido.segundos + (p.recorrido.desfase ?? 0)) % 1);
const x = p.recorrido.desde[0] + (p.recorrido.hasta[0] - p.recorrido.desde[0]) * f;
img.setPosition(Math.round(x - (lejosX % anchoLejos)), C.lejos.y + p.recorrido.desde[1]).setScrollFactor(0).setDepth(-34);
// y otra copia corrida anchoLejos a la derecha, para cuando da la vuelta
```

## Las 9 pruebas

Todas bloquean: si una falla, el escenario no sale.

| # | Prueba | Qué mide |
|---|---|---|
| 1 | Costuras | Los trozos de 1280 pegan sin un pixel distinto en sus bordes |
| 2 | Paralaje | El cielo y la ciudad lejana cierran el ciclo: la vuelta no cambia más que un paso normal entre columnas |
| 3 | Piso | Ni un pixel transparente en la franja |
| 4 | Apoyo | Ninguna caja, poste ni objeto del layout cae sobre un hueco |
| 5 | Colisión | `colision.json` es igual al layout |
| 6 | Camino | Se llega de la salida a la meta con las reglas del juego: salto de 36, escalón de 6, salto largo de 84. En una arena (sin salida ni meta, como la pelea), se llega a todo el piso: se cuenta el piso (altura 0), así el techo de una caja más alta que el salto, como la caja de greda, no tiene que alcanzarse |
| 7 | Legibilidad | Una silueta de atleta cada 64 px en cada carril. Contraste mediano entre su contorno y el fondo de al menos 2:1 |
| 8 | Paleta | Ningún color fuera de los 24 de la ficha |
| 9 | Peso | En la pantalla más cargada: hasta 8 capas, 12 luces encendidas, 16 piezas animadas y 24 objetos |

## Estilos

- **Hoy está el estilo `vietnam`.** Trae:
  - casas tubo con locales que calzan con su letrero (tạp hóa, phở, farmacia, taller, sastrería, peluquería y salas con el altar de los ancestros);
  - callejones abiertos y canales;
  - altar de la tierra, rejas plegables, motos Cub y sillas plásticas;
  - carrito de bánh mì, xe ba gác, kiosco, tanques de agua, postes con su maraña de cables y portones de hẻm.
- **Cada caja del layout se dibuja por su `tipo`:**
  - `carro` es un xe ba gác, y `puesto_banhmi`, `cajas`, `moto_estacionada`, `mesas_plasticas`, `tanque_agua` y `kiosco` tienen su propio dibujo;
  - `muro_bajo` es de ladrillo y `muro_alto` lleva vidrios rotos arriba;
  - un tipo sin dibujo sale como muro.
- **Las horas del estilo `vietnam`**, cada una con su paleta de 24 colores:
  - **Mañana:** luz cálida con bruma.
  - **Mediodía:** cielo limpio y sombras cortas.
  - **Tarde dorada** (`tarde` sin aguacero): cielo de lavanda a miel, sol bajo con halo, agua lila con destellos de oro y el filo de las torres encendido.
  - **Aguacero:** nublado y lavado.
  - **Tormenta** (`tarde` con `aguacero` y el tema `azoteas`): casi de noche, con ventanas prendidas, neones rosado, turquesa, rojo y azul con su halo en la neblina, y la Bitexco con el filo de luz.
  - **Atardecer:** violeta, durazno y naranja.
- **El rosado (`salmon`) es el de la buganvilla y la pitahaya:** las paredes van amarillas, menta, celestes y crema, como en Saigón, y el rosado resalta.
- **El hẻm, más vivo:**
  - buganvillas en cascada;
  - cortinas metálicas (cửa cuốn) verdes y azules;
  - toldos de rayas sobre los locales;
  - matas grandes en materos de barro o vidriados;
  - charcos que reflejan las casas de cabeza, tramados con el cielo (el hẻm amanece mojado).
- **Los puestos del mercado** llevan toldo de lona a rayas, de un color por puesto, con la cenefa en ondas. **La torre del reloj** de Bến Thành va ancha, con el reloj grande, el nombre en relieve y el techo de cuatro aguas.
- **El río** se ve abierto detrás de la baranda del malecón, con palmas, bolardos con cadena, xích lô estacionados, el ferry y los barcos del otro lado, y jacintos en islas con su flor.
- **La viga sobre un hueco** es de hierro en I, oxidada: se lee clara sobre el vacío oscuro.
- **Vida de los tramos del Cross** (`vidaSaigon.ts`), según la lista `vida` del layout:

  | Vida | Qué se anima |
  |---|---|
  | `toldos_viento` | Cenefas de toldo |
  | `vendedoras_pregonando` | Vendedoras con nón lá que pregonan |
  | `agua_animada` | Brillos del agua |
  | `jacintos_flotando` | Jacintos que bajan con la corriente |
  | `ferry` | El ferry del fondo, que cruza |
  | `botes_bambu` | Thúng chai que se mecen |
  | `ropa_viento` | La ropa al viento |
  | `publico_ondeando` | La ola en la tribuna |
  | `banderas` | Banderas de Vietnam que ondean |
  | `lluvia`, `charcos_crecen` y `fuegos_artificiales` | Van como partículas con los efectos `lluvia`, `salpicadura_piso` y `fuegos_artificiales_*` del kit |
- **El estilo `colombia_ladrillo`** (`pais: "colombia"`, lote E3a): los barrios de ladrillo de Medellín. Hoy pinta la Comuna 13 (`paralaje.cerca: "c13_casas_ladrillo"`, `paralaje.lejos: "valle_de_aburra"`).
  - **Paleta de mañana** (`colombiaPaleta.ts`): ladrillo naranja, cielo azul limpio con cúmulos arriba, el verde de los cerros y los colores de los murales. `canal` es el violeta de los murales (aquí no hay agua).
  - **Lejos:** el Valle de Aburrá con la cordillera en bruma, los cerros llenos de casitas, la ciudad abajo y el cable del metrocable con sus torres. Las cabinas son vida de la capa `lejos`.
  - **Cerca, por tema de `ranuras_deco`:** `estacion_san_javier` (la estación del metro con su letrero y la torre del cable), `grafitis_murales` (el cerro de casas con el mural de la cara y el colibrí y LA 13 ES CULTURA), `casas_ladrillo_apiladas`, `techos_zinc_tanques` y `mirador_grafitis` (el valle abierto con copas de árboles).
  - **Las casas:** de ladrillo o repello pintado, en tres gradas del cerro, con losa y varillas, rejas de colores, matas en latas, tanques negros, banderas y algunos murales (el ojo, el colibrí, la mariposa, la cara de perfil).
  - **Cada caja por su `tipo`:** `carrito_paletas`, `escalon` (con la franja amarilla), `terraza` (adoquín con el murito de matas atrás; su frente es el muro de contención con murales, y en la subida el mural corrido de COMUNA 13), `muro_grafiti`, `escalera_electrica`, `escalones`, `tanque_agua` (el negro), `techo_lata`, `baranda`, `aire_acondicionado`, `escalera_pintada` (el arcoíris) y `mirador` (la plaza con la reja del borde y el mural AQUÍ SE SUEÑA EN GRANDE). `letras_comuna13` son las letras gigantes.
  - **Bajo:** `techo_escalera` (la lámina naranja sobre columnas) y `tendedero` (tres cuerdas con ropa, parado en el piso de abajo).
  - **Postes:** `poste_luz`, `antena` y `asta_bandera` con la bandera de Colombia que ondea. Si el asta del layout es tan alta que la bandera se saldría de la pantalla, se dibuja más corta y `generarEscenario` lo avisa.
  - **Vida:** `metrocable` (6 cabinas en dos cables, ida y vuelta, en 60 s), `banderines` y `ropa_tendida` (solo donde detrás hay casas), la bandera del asta y los peldaños de la escalera eléctrica que corren (3 cuadros).
  - **Letreros en español:** SALIDA y META en la pancarta (en Vietnam siguen XUẤT PHÁT y VỀ ĐÍCH). Si la meta queda arriba de una terraza alta, la pancarta va en dos palos parados al fondo de la terraza, y la línea a cuadros se pinta en el techo de la caja.
- **El estilo `venezuela_ciudad`** (`pais: "venezuela"`, lote E3b): Caracas de noche. Hoy pinta la azotea de Parque Central (`paralaje.cerca: "torres_parque_central"`, `paralaje.lejos: "avila_noche"`).
  - **Solo de noche** (`venezuelaPaleta.ts`): el cielo y El Ávila azul casi negro, el concreto gris violeta, las ventanas y los cerros en amarillo, y los neones rosado y turquesa (`salmon` y `menta`). `canal` es el violeta del reflejo del neón. Un layout de Venezuela a otra hora queda `pendiente` y lo dice: "todavía no tiene arte de tarde (hoy pinta: noche)".
  - **El cielo de noche** (para cualquier estilo que tenga noche): estrellas, unas grandes en cruz, nubes finas tocadas por la luna y el resplandor de la ciudad abajo.
  - **Lejos:** El Ávila, la montaña larga azul con quebradas, la luna en las laderas y la Cruz encendida en el pico. Va bajo en la capa: con el zoom de la pelea la cámara empieza en la fila 93 y el marcador tapa unas 45 más, así que la Cruz cae en la fila 135 o más abajo, en el hueco entre la segunda torre y la caseta. El avión y el helicóptero vuelan a esa altura. Delante, los cerros llenos de lucecitas en manchones y la ciudad abajo.
  - **Cerca:** `torres_parque_central` es el fondo: la ciudad encendida, las dos torres de concreto claro con sus ventanas y la luz roja, el público en dos azoteas vecinas (con banderas y celulares), los tanques de agua y el murito del borde. `letreros_neon` suma la caseta de la escalera con la puerta de lámina, los bombillos, CARACAS ES BELLA, la escalerita al techo, las antenas, las parabólicas y los dos neones con su halo: AREPERA LA CHAMA con la arepa y CARACAS con El Ávila y la Cruz.
  - **El piso:** la `baldosa` de este lugar son losas grandes de concreto (48 x 16) con charquitos ovalados. De noche, el piso mojado refleja los neones en rayas debajo de su columna, más fuertes en los charcos (`reflejoNeon`, solo los neones: una camisa turquesa no se refleja).
  - **El borde sin baranda:** un hueco `vacio` que llega al final del mundo es el borde del edificio. Lleva la franja amarilla y negra en el filo y, pasando el canto, la ciudad muy abajo con sus avenidas. Para cuando el borde avanza, sale `borde_filo.png` y `borde_vacio.png`.
  - **Postes:** `antena` es la torre de celosía de telecomunicaciones con sus paneles, una parabólica y la luz roja.
  - **Vida:** `letreros_neon` (los dos neones, 4 cuadros con un parpadeo), `luces_ciudad` (las luces rojas de las torres y el tráfico allá abajo pasando el borde), `avion_lejos` y `helicoptero_reflector` (en la capa lejos, con su recorrido; el helicóptero con el haz que barre), `publico` (los de las azoteas vecinas levantan brazos, banderas y celulares) y `fuegos_artificiales` (partículas, repartidas a lo ancho de la arena).
  - **Luces:** los dos neones (parpadean con su vida), los dos bombillos de la caseta y las luces rojas de las torres y las antenas, que prenden y apagan cada segundo.
- **El estilo `vietnam_hoian`** (`pais: "vietnam"` con `paralaje.cerca: "casas_amarillas_hoian"`, lote E3c): Hội An de noche, con el Tama-wari. `paralaje.lejos` es `rio_thu_bon_puente_japones`.
  - **Solo de noche** (`hoianPaleta.ts`): la noche de Vietnam es la de Hội An. `paletaVietnam` la da cuando la hora es `noche` y no cambia ninguna otra hora (Saigón sale igual byte a byte). El amarillo de las casas, la madera oscura, las tejas de barro, el rojo y el dorado de los faroles, el azul noche del río y la piedra en pardos tibios. `canal` es el morado de los faroles, `salmon` la buganvilla y `menta` los faroles verdes. A otra hora queda `pendiente`: "todavía no tiene arte de manana (hoy pinta: noche)".
  - **Lejos:** el río Thu Bồn con la orilla de enfrente encendida y sus palmas, el puente japonés (Chùa Cầu) con los arcos de piedra, la galería de madera prendida, los dos techos de puntas curvas y el templito, y la luna llena de la noche de los faroles. El agua lleva los reflejos en rayas que tiemblan, el camino de la luna y velitas sueltas. El puente cae en la fila 135 o más abajo, debajo del marcador con el zoom de la pelea, y se ve por la izquierda, donde se abre el río.
  - **Cerca:** `casas_amarillas_hoian` es el fondo y `casas_amarillas_faroles` el mismo dibujo por tema. A la izquierda el río con el bote amarrado, las velitas y el malecón de piedra con sus bolardos. Después, cuatro casas de dos pisos con tejas de barro, alero entre los pisos, la planta baja de madera con sus vanos (tienda de faroles, sastrería, comedor de cao lầu o puertas cerradas), un farol en cada puerta, racimos debajo del alero grande, balcones con vecinos asomados, buganvilla, el árbol de la esquina y los dos puestos de faroles. Letreros: ĐÈN LỒNG, CAO LẦU y MAY ĐO.
  - **El piso:** la `baldosa` de este lugar es la calle de piedra con losas grandes trabadas y la luz tibia de los faroles, la `acera` son losas claras pisadas y la `madera` es el muelle de tablas. Debajo de la franja va el canto del muelle con sus pilotes y el río de adelante con las velitas. La piedra está seca: aquí no sale el reflejo del neón.
  - **Postes:** `poste_tamawari` es la caña de bambú con sus nudos, el trípode amarrado y el yugo arriba. La bola no la dibuja el poste: es la entidad `npc` `bola_tama` y la pone el juego con el efecto del kit. El yugo trae `gancho` en `objetos.json`, donde va el ancla de la bola (16, 0). El collar de abajo va del color del equipo de la bola que tiene en su x (`equipo` de la entidad: la Familia azul y el Instituto rojo), con cintas de colores. El poste se mide desde el piso aunque esté parado en su base, y va antes que la base (que le tapa el pie) y antes que la bola. `poste_faroles` es el palo de madera con la cruceta y cuatro faroles.
  - **Cajas y bajo:** `base_poste` es un cajón de madera lleno de piedras. `cuerdas_faroles` son cuerdas de poste en poste (los que caen en su rango), amarradas a su `z` o al alto del poste si es más bajo, con faroles de seda cada 14 a 20 px.
  - **Una prueba que se juega en el sitio** (`prueba: "tamawari"`): `salida` y `meta` son el lado de cada equipo. No van pancartas ni la línea de meta.
  - **Vida:** `faroles_meciendose` (los faroles de las cuerdas y de los postes, 4 cuadros: con la vida, el objeto lleva solo las cuerdas y el palo, así no quedan dobles), `velitas_rio` (las velitas de adelante titilan, 3 cuadros), `botes_con_faroles` (el bote amarrado se mece y otro cruza lejos con su recorrido) y `publico` (los vecinos de los balcones levantan los brazos, los abanicos y los celulares). Las piezas que van sobre lo pintado son un recorte de la capa con lo que se mueve: el cuadro 0 es igual a lo pintado.
  - **Luces:** los faroles de las puertas, los dos puestos, los postes de faroles y tres faroles de las cuerdas, con latido. Partículas: pétalos de la buganvilla y brillos en el río de adelante.
- **Los lugares del registro** (`lugares.ts`, lote E4a): un lugar nuevo trae todo su arte junto (el fondo de la capa cerca, la capa lejos, sus pisos, lo de abajo de la franja, sus cajas, su vida, sus luces y sus partículas) y se elige por `paralaje.cerca`, sin tocar el motor. Su paleta también se elige por el fondo, así las otras horas del país no cambian ni un pixel. Bajo techo (`techado`), la lluvia de afuera no moja el piso.
- **El estilo `vietnam_dojo`** (`paralaje.cerca: "dojo_hanoi"`, `paralaje.lejos: "ho_hoan_kiem"`): el dojo de judo de Hà Nội en la tarde, en la vista inclinada de la pelea.
  - **Solo de tarde.** La paleta: la madera clara, el tatami verde y amarillo, el rojo de la bandera y el jade del lago (`canal`).
  - **Cerca:** la pared de madera en paneles con el cielo raso de tablas, el letrero del club VÕ ĐƯỜNG NHU ĐẠO HÀ NỘI, los tableros con las tablillas de los nombres, el reloj, cuatro ventanales altos con los postigos abiertos (los vidrios son transparentes: ahí se ve el lago), la bandera de Vietnam en el centro, la caligrafía TÂM y NHẪN en rollos con su sello, y al pie de la pared el público en la banca y los judocas en seiza. Thor se sienta antes de la banca, en x 70.
  - **Lejos:** el lago Hoàn Kiếm color jade con la otra orilla, la Torre de la Tortuga en su islote (cae en un ventanal en todo el recorrido de la cámara de la pelea), el puente rojo Thê Húc con la puerta del templo y los sauces.
  - **El piso:** el `tatami` de este lugar son esteras de 64 x 26, la zona de combate verde (x 64 a 576, y 10 a 88) con su borde rojo, la de seguridad amarilla, las cintas de salida y las manchas de sol de los ventanales. Debajo, el canto del tatami y el piso de madera.
  - **Vida:** `publico` (aplauden, 2 cuadros) y `hojas_cayendo` (afuera, detrás de los vidrios, 4 cuadros). Luces: el sol de la tarde de cada ventanal.
- **El estilo `vietnam_parque`** (`paralaje.cerca: "parque_tao_dan"`, `paralaje.lejos: "saigon_amanecer"`): el parque Tao Đàn de Saigón al amanecer, de lado.
  - **Solo al amanecer**, con su cielo (del celeste al durazno y al rosado, el sol recién salido a la izquierda). `canal` es la ciudad en la bruma.
  - **Fondo:** la bóveda de los dầu, los troncos claros y altísimos con sus raíces, los rayos de sol entre los troncos, el seto y el pasto, el letrero CÔNG VIÊN TAO ĐÀN, el palo con las jaulas de pájaros y el banco de piedra con los señores del café, el grupo de tai chi y los abuelos haciendo ejercicio.
  - **Lejos:** Landmark 81 y la Bitexco entre las torres, en la bruma rosada, con los árboles del parque delante.
  - **El piso:** la `tierra` de este lugar es la cancha roja apisonada, con las rayas de `DaCau.ts` (de x 34 a 606 en la fila 298 y de 28 a 612 en la 322) y la del medio debajo de la red. La red la dibuja el juego. Adelante, el pasto y el camino de baldosas.
  - **Vida:** `tai_chi` (4 cuadros), `abuelos_ejercicio` y `pajaros` (los de las jaulas saltan, y otros cruzan lejos). La capa cerca va sin lo que se mueve: la vida lo trae entero. `rayos_de_luz` son partículas de polvo que brilla en los rayos.
- **El estilo `colombia_colonial`** (`paralaje.cerca: "cancha_tejo_candelaria"`, `paralaje.lejos: "monserrate_llovizna"`): la cancha de tejo de La Candelaria en la tarde nublada, de lado.
  - **Solo de tarde**, con el cielo tapado (`clima: ["nublado", "llovizna"]`). La paleta: la cal, la madera, la greda, el gris de la llovizna (`canal`), el verde de Monserrate y de las puertas coloniales y los colores de la bandera.
  - **Fondo:** el techo de tablas con las vigas y el tirante, los pilares, los banderines de papel y los bombillos, la pared de cal con el pañete caído y el zócalo verde, las dos ventanas coloniales con su reja de madera y los postigos verdes, el tablero de las reglas (MECHA 3, BOCÍN 6, MOÑONA 9, MANO 1), el estante con la cajita de las mechas y los tejos, el afiche del torneo, el letrero donde el juego escribe CANCHA DE TEJO (x 380 a 500, fila 196 a 214) y la gente con ruana y sombrero en la banca.
  - **Lejos:** Monserrate con la iglesia blanca y el teleférico, la neblina en la ladera y las casas coloniales de enfrente con balcones y techos de teja, con la llovizna. Monserrate cae en la ventana grande.
  - **El piso:** la cancha de tierra parda con la greda que salta cerca de la caja y la raya de x 104. Adelante, el borde de madera y el cemento del galpón.
  - **Cajas:** `caja_greda` es la caja de tejo de lado, con la geometría de `Tejo.ts`: la cara de greda de (534, 300) a (582, 250), el palo de atrás hasta la fila 248 y el bocín en (548, 280). Las mechas y los tejos los pinta el juego encima.
  - **Vida:** `banderines`, `publico` (levantan el tinto), `llovizna` (en las ventanas, 3 cuadros) y `humo_mechas` (partículas que suben de la caja). Luces: los tres bombillos.
- **Lo que pinta un lugar por una entidad** (lote E5): un lugar del registro puede traer `objeto`, que pinta las entidades `objeto` del layout que conoce y las suma a `objetos.json` con `origen: "entidades"`. No es geometría: `colision.json` sigue siendo la del layout. Así salen los arcos de piedra del fútbol, que no son cajas (la pelota pasa entre las columnas).
- **El estilo `venezuela_playa`** (`paralaje.cerca: "playa_el_agua"`, `paralaje.lejos: "mar_caribe_cerro"`): Playa El Agua, isla de Margarita, al mediodía, de lado, para el Vóley Playa.
  - **Solo al mediodía.** La paleta: la arena clarita, el mar turquesa (`menta`) que se pone hondo hacia el horizonte (`canal`), el cielo limpio y los colores de los toldos.
  - **Fondo:** la orilla con la ola que revienta y la espuma que sube por la arena, cuatro palmas de coco (ninguna toca la red), dos toldos a rayas con su gente, la silla y la cava, la churuata de las empanadas con el techo de palma, el mostrador EMPANADAS y COCO FRÍO, la vitrina, la nevera y la bandera de Venezuela, el letrero de madera PLAYA EL AGUA, MARGARITA, una toalla con alguien tomando sol y una pelota de playa.
  - **Lejos:** el mar Caribe con el horizonte en la fila 186, el cerro verde de la punta de la playa con sus casitas, el morro de la izquierda, un peñero y dos veleros.
  - **El piso:** la `arena` de este lugar, con las cintas azules de la cancha donde `Voley.ts` pone sus rayas (de x 34 a 606 en la fila 298 y de 28 a 612 en la 322). La red la dibuja el juego.
  - **Vida:** `olas` (4 cuadros), `toldos_viento` (2), `vendedor_empanadas` (2) y `alcatraces` (los pelícanos que cruzan en la capa lejos). Sin luces: es de día.
- **El estilo `vietnam_montana`** (`paralaje.cerca: "cancha_arcilla_dalat"`, `paralaje.lejos: "lago_xuan_huong_pinos"`): la cancha de tenis de arcilla de Đà Lạt en la mañana con neblina, de lado.
  - **Solo de mañana.** La paleta: la arcilla roja, el verde de los pinos, la neblina (`bruma`), el lago (`canal`), las villas crema y las hortensias.
  - **Fondo:** los pinos de Đà Lạt de tronco rojizo y copa en racimos (dos grandes a los lados y cuatro grises en la neblina), el pasto con las hortensias azules y rosadas, la malla de la cancha en rombos (ningún paral cae en la red) con la lona SÂN QUẦN VỢT ĐÀ LẠT, la silla del juez y la banca con los dos jugadores, el bolso y el cesto de pelotas.
  - **Lejos:** la montaña casi borrada, las lomas de pinos en planos cada vez más claros, la catedral del gallo y una villa colonial en la loma, y el lago Xuân Hương con su orilla y un botecito de cisne.
  - **El piso:** la `greda` de este lugar es la arcilla barrida en arcos, con las rayas blancas empolvadas donde las pone `Tenis.ts`. Adelante, el bordillo y el pasto con piñas.
  - **Vida:** `neblina` (dos bandas que pasan en la capa lejos) y `publico` (los de la banca aplauden). Luces: el sol de la mañana entre los pinos.
- **El estilo `colombia_caribe`** (`paralaje.cerca: "calle_carnaval_barranquilla"`, `paralaje.lejos: "barranquilla_mediodia"`): una calle del Carnaval de Barranquilla al mediodía, en la vista inclinada.
  - **Solo al mediodía.** La paleta: las casas de colores y los colores del Carnaval (el morado es `canal` y el naranja `oro`).
  - **Fondo:** tres casas del Barrio Abajo (la amarilla con la máscara de la Marimonda, la turquesa de dos pisos con balcón y la rosada con la del Torito), los dos palcos con la gradería llena y el sombrero vueltiao, el techo de lona a rayas y el faldón, el pendón CARNAVAL DE BARRANQUILLA con ¡QUIEN LO VIVE ES QUIEN LO GOZA!, cinco guirnaldas de banderines y la comparsa en la acera (cumbiamberas de pollera y Congos de turbante con el garabato).
  - **Lejos:** la ciudad en la calima, el campanario de la catedral y las palmas.
  - **El piso:** la `cancha` de este lugar es la calle de asfalto con el confeti, la maicena y las serpentinas, y las rayas de tiza de `Futbol.ts`. Adelante, el bordillo amarillo y negro y el andén.
  - **Entidades:** `arco_piedra` en cada línea de gol, en dos objetos: la columna de atrás con la vara y las cintas (`parte: "atras"`, `orden` 35) y la de adelante (`orden` 71), así el arquero que se mete entre las dos queda bien ordenado.
  - **Vida:** `publico` (los palcos), `guirnaldas` (una pieza por cuerda), `comparsa` (4 cuadros) y `confeti` (papelitos que caen). Partículas: además, el `confeti` del kit desde los palcos.
- **El estilo `venezuela_lago`** (`paralaje.cerca: "cancha_barrio_maracaibo"`, `paralaje.lejos: "lago_puente_urdaneta"`): una cancha de barrio de Maracaibo de noche, en la vista inclinada.
  - **Solo de noche.** La paleta: el cielo con el resplandor de la ciudad, el Lago oscuro, el blanco y el violeta del relámpago (`salmon`), la nube de tormenta (`canal`), el sodio de los bombillos y el azul de la cancha (`celeste`). No sale el reflejo de neón de Caracas.
  - **Fondo:** la malla en rombos (deja ver el Lago), el muro de bloques con la franja amarilla, azul y roja, CANCHA LA CHINITA, BARRIO SANTA LUCÍA y el mural del puente, tres postes con los bombillos de sodio, la gradita con la gente y los gaiteros con sombrero (furro, tambora, charrasca y cuatro).
  - **Lejos:** el puente General Rafael Urdaneta de punta a punta con las cinco torres en A y sus tirantes, la otra orilla encendida con los mechurrios, tres balancines con su luz roja, los reflejos en el agua y la nube del Catatumbo a la derecha.
  - **El piso:** la `cancha` de este lugar es el concreto pintado (azul adentro, el área naranja, verde afuera) con las rayas de `Basket.ts` y la luz de los bombillos. El aro, el tablero y el poste los dibuja el juego.
  - **Vida:** `relampago` (8 cuadros: la nube se alumbra por dentro y cae el rayo; solo donde la capa cerca deja ver afuera), `gaiteros` y `publico`. Luces: los seis bombillos y el resplandor del Catatumbo, que parpadea.
- **Los otros estilos del pedido** (`venezuela_barrio`, `japon_80s`) llegan con sus escenarios. Cada uno pasa antes por su ficha de arte.

## Límites honestos

- **Una sola hora pintada por escenario:** la del layout. El juego cambia de hora cambiando el layout y regenerando. `venezuela_ciudad`, `vietnam_hoian` y `venezuela_lago` solo saben pintar la noche, `vietnam_dojo` y `colombia_colonial` la tarde, `vietnam_parque` el amanecer, `vietnam_montana` la mañana, y `venezuela_playa` y `colombia_caribe` el mediodía.
- **Los lugares de E4a y E5 son de una pantalla:** el dojo, Tao Đàn, la cancha de tejo, Margarita, Đà Lạt, Barranquilla y Maracaibo están puestos para un mundo de 640, como sus pruebas.
- **El dibujo de Hội An es de una pantalla:** las casas, el río de la izquierda y los puestos están puestos para un mundo de 640. En un layout más largo con el mismo fondo, la última casa se estira hasta el final del ancho pintado.
- **El borde que avanza** lo mueve el juego: el arte trae el filo y el vacío, pero el murito del fondo, pintado en la capa cerca, sigue entero hasta el borde de antes.
- **El aguacero es una capa encima del piso.** La lluvia que cae la pone el juego con el efecto `lluvia` del kit.
- **La legibilidad se mide con el contorno de los atletas,** parados encima de la caja que tengan debajo, no con su ropa. Un equipo de ropa muy oscura sobre un fondo oscuro puede leerse peor de lo que dice la prueba.
