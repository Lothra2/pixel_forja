# Lote piloto de pelea: Rick y Sophie en pixel a mano
Estado: entregado, pendiente de Rick (cuarta versión, pixel a mano sobre referencia)
PR: https://github.com/Lothra2/pixel_forja/pull/56
Fecha: 2026-10-16

## Qué se hizo

Rick pidió pixel art hecho a mano de verdad, con mejores poses y más pro, al nivel de SF2. Me autorizó a sacar un par de referencias de Higgsfield para los dos personajes, solo como base del dibujo y no para los movimientos. Así quedó:

### 1. Dos referencias y nada más

Saqué **dos imágenes** en Higgsfield, una de Rick y una de Sophie, en guardia y de cuerpo entero. Las pedí **solo con texto**: no subí ninguna foto de la familia. Costaron 0,5 créditos en total. Las referencias dan el look de cada uno: las proporciones, el traje, la cara y la paleta. Los movimientos los hice yo.

### 2. De la referencia a la hoja, pixel por pixel

| Paso | Rick | Sophie |
|---|---|---|
| **Escala de SF2** | 70 x 108 px | 37 x 78 px, dos tercios de él |
| **Paleta a mano** | 23 tonos: 5 de piel, 5 de rojo, negro, blanco, el gris de las canas y la barba | 25 tonos: piel, turquesa, blanco, rosado, azul noche, el marrón del pelo y el brillo de los ojos |
| **Limpieza** | Fuera el ruido: cada pixel suelto se funde con su grupo de tono, como lo haría un pixelartista | Igual. También saqué los pixeles turquesa que se colaban en el pelo |
| **Retoque a mano** | La cara con los lentes, los ojos y la barba. La cinta con dos colas que ondean | La cara de anime: los ojos grandes con su brillo, el flequillo en puntas, los cachetes y la boquita |
| **Lo que tapan los brazos** | El pecho pintado debajo de los brazos: el gi con su sombra, la solapa en diagonal, los pectorales y los abdominales. Así no aparece un hueco cuando el brazo se mueve | Relleno desde los vecinos |
| **Caras de recambio** | Dolor, con los ojos apretados y la boca abierta. Grito, para la onda | |

Cada hoja se corta en **piezas con su junta**: cabeza, torso, brazo y antebrazo de cada lado, muslo y pierna de cada lado, y un fondo para la cadera. Las piezas se solapan un poco en las juntas, así no se abre una raya al girarlas.

### 3. El muñeco de pixel en el motor

Va en `src/engine/luchador/pixel/` y sirve para cualquier luchador, no solo para estos dos.

| Qué | Cómo |
|---|---|
| **Las piezas giran con RotSprite** | Se giran sin inventar colores ni romper el contorno. Una prueba revisa que cada cuadro de los dos use solo su paleta |
| **Poses por ángulos de pantalla** | `apuntar` pone un brazo o una pierna a los ángulos que digas: 0 al frente, 90 abajo, -90 arriba. No hay que hacer cuentas |
| **Todo el cuerpo** | Se puede girar y mover entero, para las volteretas, el remolino y la caída |
| **Piezas de recambio** | Una cara de dolor o un brazo dibujado aparte, con su propia junta y sus puntos |
| **Retoques a mano por cuadro** | Pixel por pixel encima del cuadro armado |
| **`suelo` y `sobre`** | Pegan al luchador al piso o lo dejan unos pixeles arriba, para los rebotes |
| **Mismos datos que el de volúmenes** | `pintarAnimPixel` da las cajas que reciben por zona, la que pega sobre el puño o el pie, la de empuje, los ticks y los tiempos de cada golpe. El demo y el juego no cambian nada para usarlo |

### 4. Las animaciones, hechas por mí

**Rick**, 35 cuadros:

| Movimiento | Qué hace | Cuadros |
|---|---|---|
| `guardia` | Respira: el pecho baja y sube y los puños se mecen | 4 en bucle |
| `avanza` | Paso de guardia con rebote | 6 en bucle |
| `puño_fuerte` | Carga atrás, sale y estira el brazo entero con el cuerpo adelante | Inicio 5, activo 4, recuperación 14 |
| `onda` | Junta las manos en la cadera, carga gritando y empuja con los dos brazos | Inicio 10, activo 3, recuperación 22 |
| `bloqueo` | Se cubre la cara con los antebrazos | 2 |
| `recibe_alto` | Se va para atrás con la cara de dolor | 3 |
| `cae` | Sale volando de espaldas, rebota y queda tendido | 6 |
| `victoria` | Levanta el puño | 4 |

**Sophie**, 42 cuadros:

| Movimiento | Qué hace | Cuadros |
|---|---|---|
| `guardia` | Rebota en las puntas | 4 en bucle |
| `salto` | Se agacha, sale estirada, da **la voltereta completa en bolita** más alto que ella y cae | 9 |
| `patada_voladora` | Baja en diagonal con la pierna como flecha y la otra recogida | 4: inicio 3, activo 12 |
| `mil_patadas` | En un pie, patea alto, medio y bajo, 2 ticks cada una | 4 en bucle |
| `remolino` | Se agacha, salta y **queda de cabeza con las piernas en V, girando como hélice**. Pega en cada medio giro y cae con una voltereta | 13: inicio 7, activo 16, recuperación 11 |
| `recibe` | Se encoge | 3 |
| `victoria` | Brinca con el puño arriba | 5 |

### 5. La pelea en el castillo

Es la misma coreografía de 7 segundos, ahora con los dos en pixel a mano:
1. Rick tira la onda.
2. Sophie la salta en voltereta y baja con la patada voladora.
3. Le pega las mil patadas y Rick se cubre.
4. Le gana con el remolino.
5. K.O.: Rick vuela y queda tendido, y SOPHIE GANA.

El escenario, el HUD y los efectos no cambian.

## Cómo se usa (estudio y kit)

Todavía no está en el estudio ni en el kit. Desde el motor:
```ts
import { RICK_PIXEL, SOPHIE_PIXEL, ANIMS_RICK_PIXEL, ANIMS_SOPHIE_PIXEL, pintarAnimPixel, componerPixel, apuntarPixel } from './engine';
const remolino = pintarAnimPixel(SOPHIE_PIXEL, ANIMS_SOPHIE_PIXEL.remolino(), { w: 150, h: 200, ox: 75, oy: 190 });
// una pose nueva: el brazo lejano de Rick al frente
const c = componerPixel(RICK_PIXEL, { giro: apuntarPixel(RICK_PIXEL, 'L', 'brazo', 0, 0) }, { w: 200, h: 170, ox: 100, oy: 160 });
```

**La hoja de cada uno:**
- Está en `rick.ts` y `sophie.ts`, con una letra por pixel. Se retoca ahí directamente.
- También se puede regenerar con los pasos de `scripts/luchador_pixel/LEEME.md`. Las dos regeneran idénticas a las del PR.

## Pruebas

- **`luchadorPixel.test.ts`, 7 casos nuevos:**
  - **Las hojas:**
    - las piezas están bien formadas y cada letra es de la paleta;
    - cada junta y cada punto existen.
  - **En reposo la hoja se arma entera:**
    - pisa el piso y mide lo que mide;
    - tiene exactamente los pixeles de su silueta;
    - Sophie mide entre el 66 y el 80 % de Rick.
  - **Los giros no inventan colores:** cada cuadro de las 15 animaciones usa solo la paleta de su luchador.
  - **Los golpes:**
    - la onda tiene inicio 10, activo 3 y recuperación 22;
    - la caja del puño fuerte cae sobre el puño, y el puño llega más lejos que en guardia;
    - las patadas de Sophie traen caja que pega y caja del brazo en cada cuadro activo.
  - **Sophie:**
    - la voltereta pasa por 90, 180 y 270 grados y sube más que su altura;
    - en los 8 cuadros del remolino la cabeza queda debajo de los dos pies.
  - **Rick:** termina tendido en el piso, más ancho que el doble de alto, y con la cara de dolor en toda la caída.
- **La suite sin `custom.test.ts`:** 58 archivos, 573 de 573.
- **`custom.test.ts`:** 15 de 15, con el kit en 246 s. El kit no cambia.
- **`npm run build`:** limpio.
- **`tsc`:** limpio.

## Para aprobar (todo en esta carpeta)

- **`rick_vs_sophie.gif`:** la pelea completa a x2 y a los tiempos reales. Es lo principal.
- **`de_la_referencia_a_la_hoja.png`:** de cada uno, la referencia, la versión bajada a su paleta y la hoja final retocada a mano.
- **`rick_y_sophie.png`:** los dos frente a frente en el castillo, a x3.
- **`pelea_1.png` a `pelea_6.png`:** seis momentos de la pelea a x3.
- **Cada movimiento solo, a x3:**
  - de Sophie: `sophie_remolino.gif`, `sophie_salto.gif`, `sophie_patada_voladora.gif`, `sophie_mil_patadas.gif`, `sophie_guardia.gif` y `sophie_victoria.gif`;
  - de Rick: `rick_onda.gif`, `rick_puno_fuerte.gif`, `rick_cae.gif`, `rick_guardia.gif` y `rick_avanza.gif`.
- **`cuadros_rick.png` y `cuadros_sophie.png`:** todos los cuadros con sus ticks y sus cajas.
- La versión anterior, por volúmenes, sigue en `docs/pelea/PILOTO/` para comparar.

Qué mirar:
- ¿Rick y Sophie se ven a mano y al nivel de SF2?
- ¿Las poses se sienten pro?
- ¿Cuál movimiento todavía se ve duro?

## Decisiones que tomé sin preguntar

1. **Usé dos imágenes, una por personaje,** pedidas solo con texto. Ninguna foto de la familia salió de `private/`.
2. **Las referencias fijan el look, no las poses.** Cada pose es mía: muevo las piezas del dibujo de la guardia y retoco a mano. Así trabajaban los estudios de pixel: reusaban las piezas de cuadro en cuadro.
3. **Rick lleva guantes negros sin dedos y vendas en los tobillos,** como salió la referencia. Le dan un aire más de peleador. Si prefieres los puños sin guantes, se repinta.
4. **En la onda, el brazo de adelante es el mismo dibujo del brazo lejano.** Así los dos brazos estirados se ven del mismo largo, como en SF2. El brazo grande de la guardia girado se veía mal.
5. **La versión por volúmenes queda en el motor.** No la borré: sigue sirviendo para generar luchadores rápido y para los trajes.
6. **Todo va en el mismo PR #56,** porque sigue siendo el piloto.

## Límites honestos

- **No está dibujado cuadro por cuadro como Capcom.**
  - Cada cuadro es la hoja a mano, con las piezas giradas y movidas.
  - En los giros grandes, como el brazo arriba de Sophie o Rick tendido, se nota que la luz no cambia con la pieza.
  - Lo que falta para llegar a SF2 de verdad es repintar a mano los 6 u 8 cuadros clave: el golpe activo, la onda, el remolino y la caída. El muñeco ya acepta retoques por cuadro y piezas de recambio, así que eso entra sin tocar el motor.
- **Sophie es chiquita: 37 px de ancho.** Los brazos tienen pocos pixeles y en la guardia se le cruzan delante del pecho.
- **La cinta de Rick** quedó más rígida que en la referencia.
- **El GIF de la pelea pesa unos 11 MB,** por el escenario que se mueve.
- **Faltan movimientos para un juego completo:** agacharse, el salto normal y los golpes débiles y medios.

## Lo que necesita el siguiente lote

- **Tu visto bueno al look a mano,** o qué cambiar en cada uno.
- **Si apruebas:**
  - el repintado a mano de los cuadros clave;
  - el repertorio completo de los dos;
  - la página Pelea en el estudio;
  - la exportación en el kit.
