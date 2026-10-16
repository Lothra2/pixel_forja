# Lote piloto de pelea: Rick estilo Street Fighter 2
Estado: entregado, pendiente de Rick
PR:
Fecha: 2026-10-16

## Qué se hizo

Es la fase 0 del módulo de pelea: la prueba del estilo. Hay **un luchador, Rick**, de lado, con **3 animaciones**: guardia, puño fuerte y recibir golpe. Me paro aquí para que apruebes el look antes de seguir.

**Un cuerpo nuevo, no el chibi agrandado.** Es el módulo `src/engine/luchador/`.
- **Proporciones de SF2:** 7 cabezas, 104 px parado y unos 96 en guardia. Es el tamaño de Ryu en una pantalla de 384 x 224.
- **Se arma por volúmenes en 3D:**
  - elipsoides para el pecho, la cadera, la cabeza y los músculos;
  - conos redondeados para brazos y piernas.
- **Las partes se funden o se cortan:** las del mismo grupo se funden suave, como el deltoides con el brazo. Las de grupos distintos se cortan en seco.
- **La cámara mira de lado, sin inclinación, como SF2.** El aire de 3/4 sale de que la cadera y el pecho giran hacia la cámara.
- **La luz se pinta en bandas:**
  - cada material lleva 6 tonos: contorno, muy oscuro, sombra, base, luz y brillo;
  - las sombras giran a rojo violeta y las luces a amarillo;
  - la luz viene de arriba y de atrás del luchador, así el lado de adelante queda en sombra y se ve el volumen.
- **Las líneas de adentro:** donde una parte pasa por delante de otra, como el brazo sobre el pecho, sale una línea oscura del color de esa parte. Es el truco de Capcom.
- **El contorno de afuera** es de 1 pixel, del tono más oscuro de cada material.
- **La cara se pinta a pixel por reglas:** el ojo, la ceja gruesa, los lentes transparentes con su patilla hasta la oreja y la boca. Tiene tres caras: serio, grito y dolor.

**Rick sale de sus fotos:**
- el pelo oscuro con entradas y las canas en las sienes;
- la barba con la barbilla canosa y los lentes transparentes;
- el polo rojo con su cuello, el short gris y las zapatillas blancas;
- las muñequeras negras, que agregué yo.

El traje alterno es azul, como el segundo jugador de SF2.

**Las animaciones, con los tiempos a 60 por segundo:**

| Animación | Cuadros | Tiempos |
|---|---|---|
| `guardia` | 6, en bucle | 7 ticks cada uno. Respira: baja la cadera y los puños, y vuelve |
| `puño_fuerte` | 5 | Inicio 5, activo 4, recuperación 14, como un puño fuerte de SF2.<br>• Carga.<br>• El puño de atrás sale con todo el giro de cadera y hombro.<br>• Pega a la altura de la cara con el talón de atrás levantado: el pie gira sobre la punta.<br>• Vuelve.<br>Tiene estela de velocidad en el cuadro que sale y en el que pega |
| `recibe_alto` | 3 | Impacto 3, el aguante 12 (el juego lo alarga con el aturdimiento) y la vuelta 6. La cabeza se va para atrás y la cara es de dolor |

**Los datos por cuadro** salen solos de los pixeles y del esqueleto:
- **recibe**, la caja que se puede golpear, por zona: cabeza, cuerpo y piernas. En el puño fuerte se suma el brazo que pega, como en SF2, para que se le pueda contestar;
- **pega**, la caja roja, solo en los cuadros activos y sobre el puño pintado;
- **empuje**, para que dos luchadores no se encimen;
- **ticks y fase** de cada cuadro, el centro de los puños para los efectos, y daño, pausa del impacto, retroceso y aturdimiento de referencia.

Todo va en pixeles desde el pivote, con y hacia abajo, como los datos por cuadro que ya usa el motor.

**La chispa del golpe** son 4 cuadros de 48: el destello blanco, la estrella amarilla y naranja, el anillo roto y las chispitas.

**Lo que sumé al motor sin quitar nada:** `encodeGif` acepta la duración de cada cuadro (`delays`), para que los GIF respeten los ticks.

## Cómo se usa (estudio y kit)

Todavía no está en el estudio ni en el kit. El taller y la exportación son las fases 3 y 4, y van después de que apruebes el estilo.

Desde el motor:
```ts
import { RICK_LUCHADOR, animPuñoFuerte, pintarAnim } from './engine';
const a = pintarAnim(RICK_LUCHADOR, animPuñoFuerte(), { w: 128, h: 116, ox: 44, oy: 110 });
// a.cuadros: los PNG. a.datos: cajas, fases y ticks. a.tiempos: { inicio: 5, activo: 4, recuperacion: 14 }
```

El traje alterno sale con `colores: { camisa: '#2b4fae', ... }` en las opciones.

## Pruebas

- **Prueba nueva `luchador.test.ts`, 7 casos:**
  - **La rampa:** 6 tonos distintos, de oscuro a claro, también en el pelo casi negro.
  - **La guardia:**
    - mide de 90 a 104 de alto;
    - tiene los pies en el piso y ningún pixel semitransparente;
    - más del 90 % del borde es contorno oscuro;
    - sale igual cada vez.
  - **El traje alterno:** cambia la camisa y ni un pixel de la cabeza.
  - **Las tres animaciones:**
    - el puño fuerte da inicio 5, activo 4 y recuperación 14;
    - la caja que pega sale solo en los activos, bien delante del cuerpo y a la altura de la cara, y cae sobre el puño pintado;
    - el brazo que pega también recibe;
    - en todos los cuadros los pies quedan justo en el piso;
    - al recibir, la cabeza se va para atrás.
  - **`conPose`:** cambia solo lo que se le dice.
  - **La chispa:** 4 cuadros de 48 que crecen y se apagan.
  - **El GIF:** guarda la duración de cada cuadro.
- **La suite sin `custom.test.ts`:** 57 archivos, 559 de 559.
- **`custom.test.ts`:** 15 de 15, con el kit en 234 s. No cambia nada del kit.
- **`tsc` y `npm run build:sitio`:** limpios.
- **El e2e no lo corrí,** porque el estudio no cambia.

## Para aprobar (todo en esta carpeta)

- **`rick_luchador.png`:** Rick en guardia contra Rick de azul, en un escenario de 384 x 224 a x3. Es la pantalla de SF2 a escala.
- **`rick_vs_rick.gif`:** el puño fuerte que conecta, a x2 y a los tiempos reales. Trae la pausa del impacto de 13 ticks, la chispa, la sacudida del golpeado y el retroceso de 10 px.
- **`rick_vs_rick_impacto.png`:** el cuadro del impacto a x3.
- **`guardia.gif`, `puno_fuerte.gif` y `recibe_alto.gif`:** cada animación sola, a x3.
- **`cuadros_y_cajas.png`:** todos los cuadros con su fase y sus ticks. Debajo de cada uno van sus cajas: azul recibe, rojo pega y amarillo empuje.

Qué mirar:
- ¿Se siente SF2?
- ¿Se reconoce Rick?
- ¿El puño fuerte pega con peso?

## Decisiones que tomé sin preguntar

1. **Por volúmenes en 3D y no pintado a mano.** Así un luchador nuevo sale de su ficha y cada golpe nuevo es una pose, no 600 cuadros dibujados. Lo que se pierde frente a Capcom lo pongo abajo.
2. **Polo, short y zapatillas, como en tus fotos,** y no un gi. Rick peleando con su ropa se reconoce más. Las muñequeras son lo único inventado.
3. **El escenario es solo un fondo de prueba,** un atardecer con ciudad y piso de tablas. No es parte del módulo.
4. **El empuje es una caja fija** sacada del torso en guardia, como en SF2, donde casi no cambia.
5. **Daño, pausa, retroceso y aturdimiento son de referencia:** 22, 13, 10 y 18. Los manda el juego.

## Límites honestos

- **No es Capcom a mano.** El sombreado sale de la luz, no de la mano de un artista:
  - la anatomía es más simple que la de Ryu;
  - la ropa no tiene pliegues;
  - los dedos son surcos.

  Para llegar más cerca hacen falta pliegues de tela por pose y retoques a mano en los cuadros clave. El motor ya exporta a Aseprite para eso.
- **La cara es chica:** unos 16 px, como en SF2. Se lee barba, lentes y canas, pero no es un retrato.
- **Solo de lado y mirando a la derecha.** El otro lado es el espejo, como en SF2.
- **3 animaciones de las ~45** que propuse para el repertorio.
- **El render tarda unos 50 ms por cuadro.** Un luchador completo, de 300 a 400 cuadros, sale en unos 20 segundos.

## Lo que necesita el siguiente lote

- **Tu aprobación del estilo**, o qué cambiar: más músculo, otra ropa, otra luz, la cara más grande.
- **Si apruebas, la fase 1:** el cuerpo y la ropa. Eso trae:
  - contexturas de flaco a grandote, y mujeres;
  - pliegues de tela;
  - más peinados y caras.
- **Después, la fase 2:** el repertorio completo.
