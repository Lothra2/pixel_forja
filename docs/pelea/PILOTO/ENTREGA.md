# Lote piloto de pelea: Rick estilo Street Fighter 2
Estado: entregado, pendiente de Rick (segunda versión)
PR: https://github.com/Lothra2/pixel_forja/pull/56
Fecha: 2026-10-16

## Qué se hizo

Es la fase 0 del módulo de pelea: la prueba del estilo. Hay **un luchador, Rick**, de lado, con **4 animaciones**: guardia, puño fuerte, recibir golpe y victoria. Me paro aquí para que apruebes el look antes de seguir.

### Lo nuevo de la segunda versión

Me pediste más estilo SF2, más fuertes y mejores trajes. Esto es lo que cambió:

| Antes | Ahora |
|---|---|
| Cuerpo delgado | **Cuerpo de peleador:**<br>• hombros anchos y trapecios en pendiente;<br>• pectorales, dorsales y los seis cuadros del abdomen;<br>• deltoides, bíceps, tríceps y antebrazos gruesos;<br>• cintura angosta, cuádriceps y pantorrillas;<br>• cuello grueso y mandíbula ancha.<br>El torso se une más duro, así se marcan los músculos |
| Polo y short | **Trajes por piezas, cada uno con sus colores.** Vienen 3 de muestra:<br>• **Gi:** el karategi sin mangas, abierto en V en el pecho, con la solapa marcada y las mangas arrancadas con el borde deshilachado. Pantalón ancho, cinturón con nudo y dos puntas que cuelgan, cintillo con nudo atrás y dos colas, guantes sin dedos, descalzo y con vendas.<br>• **Calle:** franelilla negra, pantalón cargo con bolsillos, correa, botas, guantes rojos y cintillo rojo.<br>• **Casual:** el polo y el short de antes, sin accesorios |
| Tela lisa | **Pliegues de tela:**<br>• en diagonal, como en el gi de SF2, con la línea oscura y el filo con luz;<br>• en el gi bajan diagonales hacia el cinturón y se abolsan justo encima;<br>• en el pantalón se tuercen alrededor de la pierna |
| Sin viento | **El cintillo y las puntas del cinturón se mueven** en cada cuadro: en la guardia respiran y en el golpe vuelan |
| Contorno café | **Contorno más oscuro, sombras más rojas** y un **brillo en la piel**, el de los músculos de SF2 |
| Golpes suaves | **Golpes con más fuerza:**<br>• base más ancha y rodillas más dobladas;<br>• el puño fuerte carga más, tira el cuerpo adelante y estira la pierna de atrás con el talón arriba;<br>• al recibir, el cuerpo se dobla para atrás de golpe |
| | **Pose de victoria:** el puño arriba, el pecho a la cámara y el grito. Las colas vuelan en bucle |

### Lo que ya traía la primera versión

**Un cuerpo nuevo, no el chibi agrandado.** Es el módulo `src/engine/luchador/`.
- **Proporciones de SF2:** 7 cabezas, 104 px parado y 95 en guardia, como Ryu en una pantalla de 384 x 224.
- **Volúmenes en 3D:** elipsoides y conos redondeados. Lo del mismo grupo se funde y los grupos distintos se cortan con una línea oscura, que es el truco de Capcom.
- **La cámara mira de lado y sin inclinación, como SF2.** El aire de 3/4 sale de que la cadera y el pecho giran hacia la cámara.
- **La luz en bandas de 6 tonos por material,** con el contorno de 1 px.
- **La cara pintada a pixel:** ojo, ceja gruesa, lentes transparentes y boca, con tres caras: serio, grito y dolor.
- **Rick sale de sus fotos:** las entradas, las canas en las sienes, la barba con la barbilla canosa y los lentes.

**Las animaciones, con los tiempos a 60 por segundo:**

| Animación | Cuadros | Tiempos |
|---|---|---|
| `guardia` | 6, en bucle | 7 ticks cada uno |
| `puño_fuerte` | 5 | Inicio 5, activo 4 y recuperación 14, con estela de velocidad |
| `recibe_alto` | 3 | Impacto 3, aguante 12 (el juego lo alarga con el aturdimiento) y vuelta 6 |
| `victoria` | 4 | 6, 10, 10 y 10 |

**Los datos por cuadro:**
- **recibe:** la caja que se puede golpear, por zona: cabeza, cuerpo, piernas, y el brazo que pega mientras está afuera;
- **pega:** solo en los cuadros activos, sobre el puño pintado;
- **empuje:** la que no deja que dos luchadores se encimen;
- **ticks y fase** de cada cuadro, y los puños para los efectos.

**La chispa del golpe** son 4 cuadros de 48.

**Lo que sumé al motor sin quitar nada:** `encodeGif` acepta la duración de cada cuadro (`delays`).

## Cómo se usa (estudio y kit)

Todavía no está en el estudio ni en el kit. El taller y la exportación son las fases 3 y 4.

Desde el motor:
```ts
import { RICK_LUCHADOR, TRAJES, animPuñoFuerte, pintarAnim } from './engine';
const a = pintarAnim(RICK_LUCHADOR, animPuñoFuerte(), { w: 128, h: 136, ox: 48, oy: 130 });
// con otro traje:
const b = pintarAnim(RICK_LUCHADOR, animPuñoFuerte(), { w: 128, h: 136, ox: 48, oy: 130, ropa: TRAJES.calle });
```

**Un traje propio** se arma con `torso` (`gi`, `franelilla`, `polo` o `nada`), `piernas` (`gi`, `cargo` o `short`) y `pies` (`descalzo`, `botas` o `zapatillas`). Cada pieza lleva su color. Los accesorios `cinturon`, `cintillo`, `guantes` y `vendas` van con color, o con null si no se ponen. El segundo jugador es el mismo traje con otros colores.

## Pruebas

- **`luchador.test.ts`, 9 casos:**
  - **La rampa:** 6 tonos distintos de oscuro a claro, también en el pelo casi negro.
  - **La guardia:** mide de 90 a 104 de alto, con los pies en el piso, sin semitransparencias y con más del 90 % del borde de contorno oscuro. Sale igual cada vez.
  - **El gi alterno:** cambia el color del gi y la cabeza queda igual. Solo puede cambiar alguna línea donde el cuello toca la tela.
  - **Los trajes:**
    - el gi trae cinturón y cintillo y se le ve la piel del pecho por la V;
    - el de calle trae cintillo y el casual ningún accesorio;
    - los tres se ven distintos;
    - el viento mueve las colas del cintillo.
  - **Las animaciones:**
    - el puño fuerte da inicio 5, activo 4 y recuperación 14;
    - la caja que pega sale solo en los activos, delante del cuerpo, a la altura de la cara y sobre el puño pintado;
    - el brazo que pega también recibe;
    - los pies quedan en el piso en todos los cuadros;
    - al recibir, la cabeza se va para atrás.
  - **La victoria:** el puño queda por encima de la cabeza.
  - **`conPose`, la chispa y la duración de cada cuadro en el GIF.**
- **La suite sin `custom.test.ts`:** 57 archivos, 561 de 561.
- **`custom.test.ts`:** 15 de 15 (el kit no cambia).
- **`tsc` y `npm run build:sitio`:** limpios.
- **El e2e no lo corrí,** porque el estudio no cambia.

## Para aprobar (todo en esta carpeta)

- **`trajes.png`:** los tres trajes en guardia sobre el escenario, a x3, como una pantalla de selección.
- **`rick_luchador.png`:** Rick de gi rojo contra Rick de gi azul, el segundo jugador, a x3.
- **`rick_vs_rick.gif`:** el puño fuerte que conecta, a x2 y a los tiempos reales. Trae la pausa del impacto, la chispa, la sacudida y el retroceso.
- **`rick_vs_rick_impacto.png`:** el cuadro del impacto, a x3.
- **`guardia.gif`, `puno_fuerte.gif`, `recibe_alto.gif` y `victoria.gif`:** cada animación sola, a x3.
- **`cuadros_y_cajas.png`:** todos los cuadros con su fase y sus ticks, y debajo sus cajas (azul recibe, rojo pega, amarillo empuje).

Qué mirar:
- ¿Ahora sí se siente SF2?
- ¿El gi te convence, o prefieres otro color o el de calle?
- ¿Se reconoce Rick con cintillo y lentes?

## Decisiones que tomé sin preguntar

1. **El gi de Rick es rojo, con cinturón negro, cintillo blanco y guantes negros.** Es su color de siempre. El segundo jugador va de azul con cintillo rojo y guantes blancos.
2. **Rick sigue con lentes peleando.** Es parte de cómo se le reconoce. Si los quieres fuera para la pelea, es una línea.
3. **Contextura 0,85,** casi grandote. Rick con cuerpo de Ken, no de Zangief.
4. **Pliegues en diagonal y no en anillos.** Probé anillos alrededor de la pierna y parecía armadura.
5. **Volúmenes en 3D y no pintado a mano.** Así un luchador nuevo sale de su ficha y un golpe nuevo es una pose.
6. **El escenario es solo un fondo de prueba.**

## Límites honestos

- **No es Capcom a mano:**
  - los pliegues siguen un patrón y no se acomodan a cada pose como los dibujaría un artista;
  - los dedos son surcos.

  Retocar a mano los cuadros clave es lo que falta para llegar al nivel de Capcom, y el motor ya exporta a Aseprite.
- **La cara es chica:** unos 16 px, como en SF2. Con cintillo, lentes y barba queda cargada.
- **El pantalón del gi es ancho y en la rodilla hace bulto,** porque está armado con dos conos.
- **Solo de lado y mirando a la derecha.** El otro lado es el espejo, como en SF2.
- **4 animaciones de las ~45** del repertorio.

## Lo que necesita el siguiente lote

- **Tu visto bueno al estilo,** o qué cambiar.
- **Si apruebas, la fase 1:** más contexturas (de flaco a grandote, y mujeres), más trajes y más caras.
- **Después, la fase 2:** el repertorio completo.
