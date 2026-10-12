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
- **Los otros estilos del pedido** (`colombia_colonial`, `colombia_ladrillo`, `venezuela_barrio`, `venezuela_ciudad`, `japon_80s`) llegan con sus escenarios. Cada uno pasa antes por su ficha de arte.

## Límites honestos

- **Una sola hora pintada por escenario:** la de la ficha. `cielo.ts` trae la mañana. Las otras horas se suman con la ficha de su escenario.
- **El aguacero es una capa encima del piso.** La lluvia que cae la pone el juego con el efecto `lluvia` del kit.
- **La legibilidad se mide con el contorno de los atletas,** no con su ropa. Un equipo de ropa muy oscura sobre un fondo oscuro puede leerse peor de lo que dice la prueba.
