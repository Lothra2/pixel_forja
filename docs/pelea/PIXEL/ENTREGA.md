# Lote piloto de pelea: Rick y Sophie fieles a su referencia
Estado: entregado, pendiente de Rick (sexta versión: fiel a la imagen aprobada y en el escenario nuevo por capas)
PR: https://github.com/Lothra2/pixel_forja/pull/56
Fecha: 2026-10-16

## Qué se hizo

Rick vio la versión anterior en el teléfono y le pareció muy floja. Dijo que la imagen de referencia le encanta y que necesita fidelidad. Así quedó:

### 1. La guardia, pixel por pixel desde la imagen aprobada

La referencia ya era pixel art, con cada pixel de unos 5,8 px de pantalla. Antes yo la promediaba hasta 108 px de alto y se perdía la cara, los guantes y la musculatura.

Ahora encuentro su grilla original y saco cada pixel tal cual:
- **Rick** queda en 118 x 196.
- **Sophie** queda en 81 x 168.

Cada uno lleva su paleta de 48 tonos, sacada de la misma imagen.

Lo único que agregué a mano:
- **el pecho de Rick que tapan los brazos;**
- **sus caras de dolor y de grito.**

### 2. Las poses clave, dibujadas enteras

Las piezas sirven para respirar en guardia, pero un brazo estirado o una patada armados con piezas no se ven como la imagen. Te pregunté y elegiste pedir las poses a Higgsfield. Así lo hice:
- **Cada pose se pidió con la guardia aprobada como referencia del personaje,** así sale el mismo Rick y la misma Sophie.
- **Las poses las elegí yo,** según lo que pide cada movimiento.
- **22 imágenes:** 10 de Rick y 12 de Sophie. Costaron 5,5 créditos. Sumando las dos referencias, el piloto gastó 6 créditos.
- **El escenario costó 1,75 créditos:** la maestra (0,25) y las 6 capas (1,5). La prueba de AutoSprite falló del lado de Higgsfield y devolvieron los 3 créditos. En total el piloto lleva 7,75 créditos.
- **Ninguna foto de la familia salió de `private/`:** todo se pidió con texto y con la referencia ya aprobada.

Con cada imagen hice lo mismo que con la guardia:
1. la bajé a su grilla original;
2. la pasé a la paleta exacta de la guardia, así los colores no cambian de un cuadro a otro;
3. igualé el tamaño de las que salieron más grandes;
4. medí dónde pisa, dónde están la cabeza, los puños y los pies.

| Rick | Sophie |
|---|---|
| paso y paso largo, puño cargando y puño, onda cargando y onda, bloqueo, recibe, vuela, tendido, victoria | agachada, sube, bolita, patada voladora, patada alta, media y baja, remolino de frente y de lado, recibe, victoria |

### 3. Lo que sumó el motor

| Qué | Cómo |
|---|---|
| **Cuadros dibujados** | Un cuadro puede ser una pose entera en vez de piezas. Va con su ancla en el piso y se puede girar (la voltereta) o voltear (el remolino). Sus puntos de puño, pie y cabeza lo siguen |
| **Las mismas cajas y datos** | Las cajas que reciben salen por franjas del dibujo. La que pega cae sobre el puño o el pie |
| **La pelea a 768 x 448** | Los luchadores van a su tamaño real. El escenario, los efectos y el HUD van al doble, con el mismo pixel de antes |

### 4. Las animaciones

**Rick:**

| Movimiento | Cuadros |
|---|---|
| `guardia` | Respira: 4 cuadros con las piezas de la guardia |
| `avanza` | guardia, paso, paso largo, paso |
| `puño_fuerte` | Carga y pega con el brazo estirado. Inicio 5, activo 4, recuperación 14 |
| `onda` | Junta las manos en la cadera, grita y empuja con las dos palmas. Inicio 10, activo 3, recuperación 22 |
| `bloqueo` | Los antebrazos cruzados delante de la cara |
| `recibe_alto` | La cabeza para atrás y el cuerpo que cede |
| `cae` | Vuela de espaldas girando, cae, rebota y queda tendido |
| `victoria` | El puño arriba |

**Sophie:**

| Movimiento | Cuadros |
|---|---|
| `guardia` | Rebota sobre las piernas |
| `salto` | Se agacha, sale estirada, da **la voltereta completa en bolita** más alto que ella y cae |
| `patada_voladora` | Baja en diagonal con la pierna como flecha. Inicio 3, activo 12 |
| `mil_patadas` | En un pie: alta, media, baja y media, 2 ticks cada una |
| `remolino` | **De cabeza sobre una mano, con las piernas en V, girando como hélice:** el dibujo de frente, de lado y volteados. Pega en cada medio giro |
| `recibe` | Se encoge con los ojos apretados |
| `victoria` | Brinca de alegría con el puño arriba |

### 5. El escenario nuevo: el castillo de noche por capas

Pediste un fondo premium al estilo SF2, por capas, donde lo de más atrás se mueve más lento. Así quedó:

- **Primero una imagen maestra** y después **6 capas** pedidas con la maestra de referencia y fondo magenta, así encajan.
- **Cada capa baja a su pixel real** y las 6 comparten una paleta de 96 tonos. Miden 611 x 262 y se ven al doble.

| Capa | Qué trae | Cuánto se mueve |
|---|---|---|
| `cielo` | la luna llena, las estrellas y las nubes | 0.1 |
| `montes` | el monte Fuji y los cerros con el lago | 0.25 |
| `castillo` | el castillo, el torii y los cerezos de atrás | 0.5 |
| `muro` | el muro de tejas con faroles y el estandarte | 0.8 |
| `piso` | las tablas con el reflejo de los faroles | 0.8 al fondo, 1 en los pies |
| `frente` | ramas de cerezo y faroles de piedra, delante de los luchadores | 1.2 |

Lo que suma el motor (`luchador/pixel/parallax.ts`):
- **La cámara sigue a los dos** y sube cuando Sophie salta. Llega hasta donde la capa más rápida todavía cubre la pantalla.
- **El piso va en perspectiva:** cada fila tiene su velocidad y la de los pies va exacta con la cámara, así no resbala.
- **El muro sube pegado al piso** y la luna se ve entera en reposo.
- **Los faroles titilan** pasando a un tono vecino de la misma paleta. No aparece ningún color nuevo.
- **Los pétalos caen** en dos profundidades: detrás de los luchadores y delante.
- **El manifest** (`public/escenarios/japon/manifest.json`) trae todo eso en números, listo para el juego.

## Cómo se usa (estudio y kit)

Todavía no está en el estudio ni en el kit. Desde el motor:
```ts
// el escenario: el manifest y sus PNG ya leídos
const esc = escenarioDesdeManifest(manifest, imagenes);
const cam = seguirCamara(esc, [xRick, xSophie], alturaDelSalto);
const fondo = pintarFondoParallax(esc, cam, tick);  // detrás de los luchadores
const frente = pintarFrenteParallax(esc, cam, tick); // delante
```
```ts
import { RICK_PIXEL, SOPHIE_PIXEL, ANIMS_RICK_PIXEL, ANIMS_SOPHIE_PIXEL, pintarAnimPixel, componerPixel } from './engine';
const remolino = pintarAnimPixel(SOPHIE_PIXEL, ANIMS_SOPHIE_PIXEL.remolino(), { w: 320, h: 420, ox: 160, oy: 405 });
// una pose clave suelta, volteada
const c = componerPixel(SOPHIE_PIXEL, { dibujo: 'patada', espejo: true }, { w: 320, h: 300, ox: 160, oy: 290 });
```

**Las hojas y los dibujos:**
- Están en `rick.ts`, `sophie.ts`, `rickDibujos.ts` y `sophieDibujos.ts`, con una letra por pixel.
- Se regeneran idénticos con `scripts/luchador_pixel/LEEME.md`, desde los datos guardados.

## Pruebas

- **`luchadorPixel.test.ts`, 8 casos:**
  - **Las hojas y los dibujos:**
    - las filas están parejas y los tonos son de la paleta;
    - las juntas existen;
    - el ancla de cada dibujo está en el piso.
  - **En reposo:**
    - la guardia se arma entera, pisa el piso y tiene exactamente los pixeles de su silueta;
    - Rick mide casi 200 y Sophie menos del 90 % de él;
    - cada uno trae al menos 11 poses clave.
  - **Los colores:** ningún cuadro de las 15 animaciones tiene un color fuera de la paleta, tampoco los girados.
  - **Los golpes:**
    - la onda tiene inicio 10, activo 3 y recuperación 22;
    - la caja del puño cae sobre el puño y llega más lejos que en guardia;
    - las patadas de Sophie traen caja que pega y caja del pie.
  - **Sophie:**
    - la voltereta pasa por 90, 180 y 270 grados y sube más que su altura;
    - en los 8 cuadros del remolino la cabeza queda debajo de los dos pies.
  - **Rick:** vuela sin tocar el piso y termina tendido, más ancho que el doble de alto.
  - **Voltear un dibujo** pasa el pie al otro lado del ancla, sin perder ni sumar pixeles.
- **`parallax.test.ts`, 6 casos:**
  - las capas miden lo mismo, comparten paleta, van de lenta a rápida y el manifest coincide;
  - en las cuatro puntas de la cámara el fondo cubre toda la pantalla y el frente no se sale de su imagen;
  - la fila de los pies se corre igual que la cámara, la de arriba más lento y la de abajo más rápido;
  - los faroles cambian entre ticks sin colores fuera de la paleta, y el muro sube pegado al piso;
  - los pétalos caen, se mecen y solo dependen del tick;
  - la cámara sigue el medio de los dos, respeta su rango y sube con el salto.
- **La suite sin `custom.test.ts`:** 59 archivos, 580 de 580.
- **`custom.test.ts`:** 15 de 15, con el kit en 231 s. El kit no cambia.
- **`tsc` y `npm run build`:** limpios.

## Para aprobar (todo en esta carpeta)

- **`rick_vs_sophie.mp4`:** la pelea completa en el escenario nuevo, con la cámara siguiéndolos, a los tiempos reales. Es lo principal. Pasó de GIF a video porque el GIF con el fondo vivo pesaba 38 MB.
- **`escenario_japon.mp4`:** el escenario solo, con la cámara de punta a punta y subiendo, para ver el parallax.
- **`escenario_izquierda.png` y `escenario_derecha_arriba.png`:** las dos puntas de la cámara.
- **`rick_y_sophie.png`:** los dos en guardia en el castillo nuevo.
- **`de_la_referencia_a_la_hoja.png`:** la referencia aprobada al lado de la hoja que sale de ella.
- **`poses_clave_rick.png` y `poses_clave_sophie.png`:** todas las poses dibujadas.
- **`pelea_1.png` a `pelea_6.png`:** seis momentos de la pelea.
- **Cada movimiento solo:**
  - de Sophie: `sophie_remolino.gif`, `sophie_salto.gif`, `sophie_patada_voladora.gif`, `sophie_mil_patadas.gif`, `sophie_guardia.gif` y `sophie_victoria.gif`;
  - de Rick: `rick_onda.gif`, `rick_puno_fuerte.gif`, `rick_cae.gif`, `rick_guardia.gif`, `rick_avanza.gif`, `rick_bloqueo.gif`, `rick_recibe.gif` y `rick_victoria.gif`.
- **`cuadros_rick.png` y `cuadros_sophie.png`:** todos los cuadros con sus ticks y sus cajas.

Qué mirar:
- ¿Cada cuadro se ve como tu imagen?
- ¿Cuál movimiento necesita más cuadros?

## Decisiones que tomé sin preguntar

1. **El tamaño lo manda la referencia:** Rick mide 196 px y Sophie 168. Por eso la pantalla del piloto es de 768 x 448, el doble de SF2. Achicarlos a la medida de SF2 era justo lo que les quitaba el detalle.
2. **Sophie queda al 86 % de Rick,** como en tu imagen. Se lee como niña por la cabeza grande. Si la quieres más bajita, se achica, pero pierde un poco de detalle.
3. **Cada pose pasa a la paleta de la guardia.** Las poses nuevas traían tonos apenas distintos, y así un cuadro no cambia de color con el siguiente.
4. **Igualé el tamaño de 7 poses** que salieron hasta un 30 % más grandes o un 10 % más chicas: el remolino de Sophie y 6 de Rick. Lo medí por las vendas, las zapatillas y la silueta.
5. **Las piezas quedan solo para la guardia.** Ahí no giran, solo respiran, y se ven idénticas a la imagen.
6. **El escenario y los efectos van al doble.** El castillo dibujado por código sigue en el motor, pero la pelea usa el nuevo por capas.
7. **La versión anterior por piezas a 108 px se reemplazó.** Las versiones por volúmenes siguen en el motor y en `docs/pelea/PILOTO/`.
8. **El frente va a 1.2 y no más.** Más rápido obligaba a achicar el recorrido de la cámara o a mostrar el borde cortado de las ramas.
9. **Las capas viven en `public/escenarios/japon/`,** así el estudio y el juego las leen igual. Las imágenes originales quedan en `scripts/luchador_pixel/escenario/datos/` para regenerarlas.

## Límites honestos

- **Las poses son de una IA guiada por tu imagen,** no de un pixelartista.
  - Alguna puede traer un detalle distinto, como un pliegue o el largo de la cinta.
  - Un pixelartista lo emparejaría a mano en una pasada.
- **Son pocos cuadros por movimiento: dos o tres poses clave.** SF2 usa 3 a 6 por golpe. El paso que sigue es pedir los cuadros intermedios de los golpes que más importan.
- **El tamaño igualado tiene un margen de unos 5 %.** El remolino achicado quedó un poco más suave de borde que el resto.
- **Las nubes no se desplazan solas:** vienen pintadas dentro del cielo. Para que pasen hay que pedir el cielo sin nubes y las nubes aparte.
- **Los faroles de piedra del frente resbalan un poco sobre el piso** al mover la cámara, porque van a 1.2 y el piso de abajo a 1.06. Casi no se nota.
- **La pelea del video es una coreografía,** no el juego. El juego lo arma la otra sesión.
- **Faltan movimientos para un juego completo:** agacharse, el salto normal y los golpes débiles y medios.

## Lo que necesita el siguiente lote

- **Tu visto bueno a esta fidelidad y al escenario,** o qué pose o capa rehacer.
- **Si apruebas:**
  - los cuadros intermedios de los especiales, unas 15 imágenes más, cerca de 4 créditos;
  - el repertorio completo;
  - la página Pelea en el estudio;
  - la exportación en el kit.
