# Lote piloto de pelea: Rick contra Sophie en el castillo japonés
Estado: reemplazado por la cuarta versión, en pixel a mano (`docs/pelea/PIXEL/ENTREGA.md`)
PR: https://github.com/Lothra2/pixel_forja/pull/56
Fecha: 2026-10-16

## Qué se hizo

Rick pidió personajes más fuertes y más de anime, con pies grandes y sin animaciones raras. Pidió también un piloto premium de dos jugadores, él y Sophie, en un mundo japonés tan bien hecho como el de Ryu en SF2. Sophie tenía que pelear distinto por ser niña, con saltos y especiales increíbles.

### Lo que cambió en el motor

| Qué | Cómo |
|---|---|
| **Pies y manos grandes** | El pie mide 0,165 del alto en un adulto y 0,19 en una niña, y puños y zapatos crecen igual. Es la exageración de SF2 y del anime |
| **Proporciones por edad** | La ficha dice cuántas cabezas mide. Rick mide 7 y Sophie 4,6: cabeza grande, piernas y brazos más cortos, cuerpo fino |
| **Cara de niña de anime** | Cara redonda con cachetes, ojos grandes con pestañas, el blanco y el brillo, naricita y cachetes rosados. Tiene cinco caras: seria, grito, dolor, feliz con los ojitos cerrados y otra para cuando recibe |
| **Pelo de anime** | Flequillo con puntas, mechones a los lados y cola de caballo alta con lazo rosado, que se mece con el viento cuadro a cuadro. El pelo lleva una franja de brillo |
| **Giros de todo el cuerpo** | `rueda` sirve para volteretas y caídas, y `vuelta` para girar como hélice. Se pueden combinar: de cabeza y girando. La cara no se pinta cuando la cabeza mira para atrás |
| **Sombreado más limpio** | La tela va en 4 tonos como en SF2. Los pixeles sueltos de otro tono se limpian, así se ve menos ruido de render |
| **Ropa nueva** | El kimono corto cruzado con la solapa clara y la licra, las dos de Sophie |
| **Patadas con caja y estela** | Los golpes dicen si pegan con el puño o con el pie. La caja roja y la estela de velocidad siguen al que pega |
| **`entre`** | Mezcla dos poses para los cuadros intermedios |

### Sophie, la luchadora

Mide 74 px, dos tercios de Rick. Lleva su kimono turquesa, su color, con licra azul noche, zapatillas blancas con suela rosada, cinturón rosado y el lazo rosado.

| Movimiento | Qué hace | Cuadros y tiempos |
|---|---|---|
| `guardia` | Rebota sobre las puntas, como una boxeadora chiquita | 6 en bucle, 5 ticks |
| `salto` | Se agacha, sale estirada con los brazos arriba, da **una voltereta completa** en bolita y cae agachada. Salta más alto que ella misma, como en el anime | 9, 46 ticks |
| `patada_voladora` | Desde el aire se tira en diagonal con la pierna estirada como una flecha. Pega con el pie | 4: inicio 3, activo 12 |
| `mil_patadas` | Parada en un pie, patea a tres alturas tan rápido que deja estela. Pega en cada cuadro | 4 en bucle, 2 ticks |
| `remolino` | El especial: se agacha, salta y **se da vuelta de cabeza con las piernas abiertas, girando como hélice** mientras avanza. Pega en cada media vuelta y cae de pie con una voltereta | 12: inicio 7, activo 16, recuperación 10 |
| `recibe` | Aprieta los ojos y se encoge. Es de caricatura, no de dolor | 3 |
| `victoria` | Brinca con el puño arriba, la cara feliz y la cola al viento | 5 |

### Rick, con lo nuevo

Rick ahora tiene pies y manos grandes, y suma estos movimientos:

| Movimiento | Qué hace | Cuadros |
|---|---|---|
| `avanza` | Camina sin soltar la guardia | 6 en bucle |
| `onda` | El especial: junta los puños en la cadera, carga y empuja la **bola de energía** | Inicio 10, activo 3, recuperación 22 |
| `bloqueo` | Se cubre la cara con los antebrazos | 2 |
| `cae` | El K.O.: sale volando de espaldas, rebota y queda tendido | 6 |

Siguen la guardia, el puño fuerte, recibir y la victoria. También siguen los tres trajes: gi, calle y casual.

### El escenario japonés

Es la azotea de un castillo de noche, a la manera del escenario de Ryu pero propio. Mide 512 x 224, para que la pantalla de 384 se desplace, y va en **5 capas para el paralaje**, todas en 8 cuadros en bucle:
- **cielo:** en bandas tramadas, con estrellas que titilan, la luna llena con sus mares y su halo, y nubes que pasan;
- **lejos:** los cerros y el monte Fuji con nieve;
- **castillo:**
  - el castillo de cuatro pisos, con base de piedra, muros blancos, ventanas que se prenden, techos curvos con frontones y los delfines dorados arriba;
  - el torii rojo, los pinos, el cerezo en flor y el pueblito con luces al pie;
  - el muro de tejas con sus postes;
  - los faroles rojos que titilan colgados de una cuerda;
  - el estandarte rojo con el **escudo GG**, que flamea;
- **piso:** tablas de madera pulida en perspectiva, con vetas, cortes y el brillo de los faroles;
- **frente:** pétalos de cerezo que caen delante de todo.

### Los efectos

| Efecto | Cuadros |
|---|---|
| La **bola de energía** de Rick: centro blanco, anillo celeste que gira y cola en rayas | 4 en bucle |
| La **chispa de bloqueo**, azul y blanca | 3 |
| El **viento del remolino**: un anillo de rayas que gira alrededor de las piernas de Sophie | 4 en bucle |
| El **polvo** al caer | 3 |
| La chispa de golpe | 4, ya estaba |

### La demo: Rick contra Sophie

Una pelea coreografiada de 7 segundos a 60 por segundo, en la pantalla de 384 x 224, con el HUD de SF2: las barras de vida, los nombres, el reloj, el KO del medio y los letreros.
1. **ROUND 1** y **FIGHT!**
2. Rick avanza y tira la **onda de energía**.
3. **Sophie salta en voltereta por encima de la bola** y baja con la **patada voladora** a la cabeza de Rick: pausa del impacto, chispa y sacudida.
4. Aterriza con su polvito y le pega las **mil patadas**. Rick se cubre, con chispas de bloqueo y retroceso.
5. Rick intenta el puño fuerte y Sophie le gana con el **remolino**: de cabeza, girando y con su viento, pega tres veces y lo tumba.
6. **K.O.**: Rick sale volando y queda tendido.
7. **SOPHIE GANA**, con su brinco de victoria.

## Cómo se usa (estudio y kit)

Todavía no está en el estudio ni en el kit. Desde el motor:
```ts
import { SOPHIE_LUCHADORA, ANIMS_SOPHIE, RICK_LUCHADOR, ANIMS_RICK, pintarAnim, escenarioJapones, capasEscenario, ondaEnergia } from './engine';
const remolino = pintarAnim(SOPHIE_LUCHADORA, ANIMS_SOPHIE.remolino(), { w: 140, h: 140, ox: 70, oy: 130 });
const capas = capasEscenario(3); // cielo, lejos, castillo, piso, frente, para el paralaje
```

**Para el juego:**
- Cada animación trae sus cuadros, los ticks y las cajas.
- Las alturas de los saltos ya vienen en el sprite. El juego solo mueve al luchador de lado.
- El que mira a la izquierda es el espejo.

## Pruebas

- **`luchador.test.ts`, 14 casos.** A los 9 de antes se suman 5:
  - **Sophie:** mide menos del 80 % de Rick y su cabeza pesa un 30 % más en proporción. Pies y manos van más exagerados, pisa el piso en guardia y trae su cola.
  - **Saltos y remolino:**
    - el salto sube la cadera más alto que ella;
    - la voltereta pasa por 90, 180 y 270 grados;
    - en los 8 cuadros del remolino la cabeza queda debajo de la cadera, con 8 giros distintos;
    - en las mil patadas la caja que pega cae sobre la punta del pie, a menos de 3 px.
  - **Rick:** la onda tiene inicio 10, activo 3 y recuperación 22, y la caída termina acostado sobre el piso.
  - **El escenario:**
    - mide 512 x 224 en 5 capas;
    - el cielo está entero y el piso cubre todo bajo el muro;
    - los 8 cuadros son distintos y el 8 vuelve a ser el 0.
  - **Los efectos:** cada uno tiene su tamaño y sus cuadros distintos.
- **La suite sin `custom.test.ts`:** 57 archivos, 566 de 566.
- **`custom.test.ts`:** 15 de 15, con el kit en 253 s. El kit no cambia.
- **`tsc` y `npm run build:sitio`:** limpios.
- **El e2e no lo corrí,** porque el estudio no cambia.

## Para aprobar (todo en esta carpeta)

- **`rick_vs_sophie.gif`:** la pelea completa a x2 y a los tiempos reales. Es lo principal.
- **`pelea_1.png` a `pelea_6.png`:** seis momentos de la pelea a x3.
- **`rick_y_sophie.png`:** los dos frente a frente en el castillo, a x3.
- **Los especiales de Sophie, cada uno solo a x3:** `sophie_remolino.gif`, `sophie_mil_patadas.gif`, `sophie_salto.gif`, `sophie_patada_voladora.gif` y `sophie_victoria.gif`.
- **Los de Rick:** `rick_onda.gif` y `rick_cae.gif`.
- **`escenario.gif`:** el escenario completo de 512 animado. **`escenario_capas.png`:** sus 5 capas.
- **`cuadros_sophie.png` y `cuadros_rick.png`:** todos los cuadros con sus ticks, y las cajas en los que pegan.
- Siguen los de antes: `trajes.png`, `rick_vs_rick.gif` y los demás.

Qué mirar:
- ¿Sophie se ve como Sophie, y sus saltos y el remolino son increíbles?
- ¿El castillo está a la altura del de Ryu?
- ¿Rick se ve más fuerte con los pies y las manos grandes?

## Decisiones que tomé sin preguntar

1. **En la demo Rick nunca le pega a Sophie.** Es una niña y el piloto lo va a ver la familia. Rick ataca con la onda y el puño, y ella esquiva, se cubre o le gana. Sophie sí tiene su animación de recibir, de caricatura, para el juego.
2. **Sophie gana.** Así es más simpático.
3. **El kimono turquesa con rosado** es su color y su lazo. El de Merida de la foto inspiró que sea ágil y valiente, sin copiar el personaje.
4. **El escenario es original:** castillo, torii, Fuji, cerezo y el escudo GG en el estandarte. Nada de Capcom.
5. **Sophie salta muy alto, como en el anime.** Una niña de 74 px pasa por encima de la bola solo si salta más alto que su propia altura.
6. **El HUD de la demo** es solo para mostrar. El del juego va aparte.
7. **Todo va en el mismo PR #56,** porque sigue siendo el piloto.

## Límites honestos

- **No es pixel art hecho a mano.**
  - Sale de volúmenes, así que las siluetas son más blandas que las de Capcom.
  - Los pliegues siguen un patrón.
  - A esta escala las caras de los dos son de pocos pixeles.

  Lo que lo llevaría al nivel de SF2 de verdad es retocar a mano los cuadros clave. El motor ya exporta a Aseprite.
- **Las poses son mías, no de un animador.** Algunos cuadros intermedios todavía pueden verse duros. Dime cuál y lo afino.
- **La coreografía de la demo está escrita a mano,** con tiempos y distancias ajustados a ojo. No es el juego: no hay colisiones que corran solas.
- **El GIF de la pelea pesa unos 11 MB,** porque el escenario se mueve en cada cuadro.
- **Faltan animaciones de los dos para un juego completo:** agacharse, saltar normal, los golpes débiles y medios, y otras. Este piloto muestra el estilo y los especiales.

## Lo que necesita el siguiente lote

- **Tu visto bueno** al look de los dos y del castillo, o qué cambiar.
- **Si apruebas:**
  - el repertorio completo de los dos;
  - la página Pelea en el estudio para verlos y tocarlos;
  - la exportación en el kit, con las capas del escenario para el paralaje.
