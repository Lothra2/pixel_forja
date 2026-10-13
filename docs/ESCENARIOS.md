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
| `objetos.png` + `.json` | Cada caja del layout dibujada a su medida, el toldo, los postes y el portón. Con `x`, `y` y `orden` |
| `vida.png` | Lo que se mueve, cuadro a cuadro: ropa tendida, cables con viento, palomas (2 cuadros paradas y 2 volando) y motos al fondo |
| `superficie.png` | Por pixel de la franja: qué suena al pisar (`paso_piedra`, `paso_agua`... más `_0` a `_2`) y si resbala. La leyenda va en `escenario.json` |
| `colision.json` | La geometría del layout, igual |
| `luces.json` | Color, radio y latido. De día, las lámparas de los postes van apagadas |
| `particulas.json` | Humo de incienso, pétalos, goteras, ondas en el agua. Las que traen `fx` usan el catálogo de efectos del kit |
| `verificacion.md` | Las 9 pruebas, con lo que midió cada una |
| `postales/*.png` | Con `--postales`: inicio, medio (la ventana con más obstáculos) y final, a 640 x 360 |
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
| 6 | Camino | Se llega de la salida a la meta con las reglas del juego: salto de 36, escalón de 6, salto largo de 84 |
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
- **Los otros estilos del pedido** (`colombia_colonial`, `venezuela_barrio`, `venezuela_ciudad`, `japon_80s`) llegan con sus escenarios. Cada uno pasa antes por su ficha de arte.

## Límites honestos

- **Una sola hora pintada por escenario:** la del layout. El juego cambia de hora cambiando el layout y regenerando.
- **El aguacero es una capa encima del piso.** La lluvia que cae la pone el juego con el efecto `lluvia` del kit.
- **La legibilidad se mide con el contorno de los atletas,** parados encima de la caja que tengan debajo, no con su ropa. Un equipo de ropa muy oscura sobre un fondo oscuro puede leerse peor de lo que dice la prueba.
