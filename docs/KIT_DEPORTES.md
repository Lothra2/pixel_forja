# Kit deportivo de PixelForja

Hojas de sprites de 8 direcciones para un juego de deportes isométrico: atletismo, natación, vóley, tenis y peleas, con la familia GG y seis superhéroes de cómic (versiones de fan para uso personal). Todo sale con el movimiento premium (poses clave de verdad, pivote fijo, eventos).

## Generar el kit

```bash
npm run deportes -- salida/kit_deportes                  # todo: familia + héroes, los 5 deportes, celda 48
npm run deportes -- salida/kit --deportes natacion,pelea  # solo algunos deportes (atletismo, natacion, voley, tenis, pelea, futbol)
npm run deportes -- salida/kit --celda 64                 # más grande
npm run deportes -- salida/kit --fichas mis_fichas        # tus personajes exportados del estudio (.ficha.json)
npm run deportes -- salida/kit --rapido                   # 2 animaciones por deporte, para probar
```

La carpeta se borra y se vuelve a escribir. Por seguridad, el script se niega si la carpeta tiene otra cosa que no sea un kit de PixelForja.

## Qué trae

```
manifest.json
atletas/<id>/<deporte>/<animacion>.png   fila = dirección, columna = cuadro
CREDITOS.txt                              autores de las piezas LPC (hay que mostrarlo en el juego)
```

Las filas siguen el orden de `direcciones` del manifiesto: `down, down_left, left, up_left, up, up_right, right, down_right`.

Cada atleta trae su `celda` y su `pivote`. El pivote es el punto de apoyo (los pies) y **no se mueve** entre cuadros, direcciones ni animaciones. Hulk va en celda de 64 y el resto en 48.

## Qué hace el juego con cada dato

| Campo | Qué es | Qué hace el juego |
|---|---|---|
| `cuadros`, `fps`, `loop` | Duración y repetición | Reproduce la animación |
| `eventos[].tipo = paso` | El pie toca el piso (`pie`: cerca o lejos) | Sonido de pisada y polvo |
| `eventos[].tipo = impacto` | El cuadro exacto del golpe | Daño, hitstop de 2 o 3 cuadros, sonido, temblor de pantalla |
| `eventos[].tipo = suelta` | Sale la pelota, la bala, la jabalina o el efecto | Crea el proyectil en ese cuadro |
| `eventos[].tipo = despegue` / `aterriza` | Deja el piso / vuelve al piso | Activa y apaga la física del salto, polvo al caer |
| `eventos[].punto` | En golpes y sueltas: dónde está la mano o el pie que pega, en pixeles desde el pivote, una entrada por fila | Saca la pelota, la bala o la chispa de ahí |
| `avance` | Pixeles que avanza el cuerpo en un ciclo sin que el pie patine (medido de lado) | Avanza la animación por distancia: un ciclo completo cada `avance` recorrido. El pie no patina a ninguna velocidad |
| `desplazamiento` | En las acciones que avanzan: pixeles recorridos en cada cuadro desde el primero | Mueve el sprite eso hacia donde mira (interpolado entre cuadros) |
| `rumbo` | En las pruebas de campo: hacia dónde va de verdad cada fila | De frente se dibuja la diagonal: muévelo hacia el `rumbo`, no hacia abajo |
| `elevacion` | Pixeles que el juego sube el sprite en cada cuadro | Dibuja la sombra en el piso y el sprite `elevacion[i]` pixeles más arriba |
| `agua` | Fila de la superficie del agua en la celda (o `null`) | Dibuja el sprite con esa fila sobre la superficie de su piscina |

### Mover sin patinar, en isométrica

`avance` y `desplazamiento` se miden de lado, en pixeles de pantalla. En una isométrica 2:1 moverse a la derecha de la pantalla es ir en diagonal por el mundo, así que un ciclo equivale a `avance / √2` unidades de mundo en cualquier dirección. Lo más simple y exacto es que la animación la mueva la distancia:

```js
// por cada paso del juego
const recorrido = velocidad * dt;                 // en unidades de mundo
anim.cuadro += recorrido / (avance / Math.SQRT2) * cuadros;
```

La velocidad natural de un ciclo (la que deja la animación a sus fps) es `(avance / √2) * fps / cuadros`. Si el juego va más rápido, la animación se acelera sola y el pie sigue sin patinar. La arena hace exactamente esto.

### Por qué existe `elevacion`

Un garrochista sube 5 metros y no cabe en una celda de 48 px. Los juegos isométricos lo resuelven así: el cuerpo se dibuja cerca del piso de la celda y el juego sube el sprite entero sobre su sombra. Garrocha, salto largo, remate de vóley, smash, patada voladora y la salida de natación usan esto.

### Natación

El nadador ya viene con el agua puesta: lo que queda bajo la superficie va teñido de azul y medio transparente, con espuma en la línea, estela y gotas cuando entra una mano o un pie. El juego dibuja su piscina detrás y alinea la superficie con `agua`. El cuerpo flota a altura fija: las patadas no lo hacen rebotar.

## La arena: el kit jugando de verdad

`arena.html` (en el sitio, el botón **Arena deportiva** del estudio) es un juego mínimo que usa el kit como lo haría el tuyo. Solo lee `manifest.json` y las hojas PNG: no importa nada del motor de PixelForja, y una prueba lo vigila. Si algo falla ahí, le falta al kit.

- **Atletismo:** salida de tacos y 100 m con cronómetro, salto largo con distancia, garrocha, bala y jabalina que vuelan desde el `punto` de la suelta.
- **Natación:** clavado desde el banco y los cuatro estilos con cronómetro del largo.
- **Vóley y tenis:** el saque se lanza en `suelta` y se pega en `impacto`. El rival calcula dónde va a estar la pelota y arranca su golpe para que el `impacto` caiga justo ahí.
- **Pelea:** los golpes llegan si el `punto` cae sobre el rival, con hitstop, chispa y sacudida. El rival se cubre, esquiva y contraataca.
- **Datos del kit:** cuadro, ritmo, avance, desplazamiento, elevación y los últimos eventos en vivo. Con **Celda y pivote** se ve el recuadro de cada sprite, y con **Cámara lenta** se revisa si un pie patina.
- **Probar tu kit:** elige la carpeta de un kit que generaste y juega con tus personajes sin publicar nada. También sirve `arena.html?kit=<carpeta>`.

En el teléfono hay palanca y botones. Con el teclado: flechas o WASD, Shift para correr y del 1 al 9 para las acciones.

En local: `npm run deportes -- public/kit_deportes` y después `npm run dev`. En Netlify, `npm run build:sitio` arma el kit y el sitio juntos.

## Animaciones por deporte

- **Atletismo:** sprint, salida de tacos, vallas, salto largo, salto con garrocha, lanzamiento de bala, lanzamiento de jabalina. También reposo, caminar, correr, golpe recibido, festejo y triste.
- **Natación:** crol (respira de lado), espalda (avanza con la cabeza primero), pecho (patada de rana), mariposa (ondulación de delfín), flotar y salida desde el banco.
- **Vóley:** espera, recepción, colocación, remate, bloqueo, saque flotado y plancha.
- **Tenis:** espera con split step, derecha, revés a dos manos, saque, volea y smash.
- **Peleas:** guardia, desplazamiento, jab, directo, gancho, uppercut, patada baja, patada alta, patada voladora, bloqueo, esquiva, golpe recibido, nocaut y victoria. Cada golpe trae chispa de impacto.
- **Fútbol:** espera, control, pase, vaselina, tiro, volea, cabezazo, barrida, conducción (`run_ball`, corre tocando la pelota), entrada, saque de banda y el arquero (espera, estirada, atajada alta, saque con la mano y de volea). Las patadas tienen zancada, pie de apoyo, carga, contacto y seguimiento, y el `impacto` cae en el cuadro del contacto con el `punto` del pie. Celebraciones de gol incluidas.
- **Natación:** además, salir del agua por el borde (`swim_exit`).

## Superhéroes

| Id | Nombre | Cómo se ve |
|---|---|---|
| `spiderman` | Spider-Man | Rojo y azul, telaraña, ojos blancos de máscara y la araña en el pecho |
| `wolverine` | Wolverine | Pelo en punta, patillas, traje amarillo y azul y garras |
| `blackpanther` | Pantera Negra | Traje negro, orejas de felino, ojos blancos y garras |
| `deadpool` | Deadpool | Rojo entero, parches negros en los ojos, correa al pecho y katana |
| `batman` | Batman | Gris y negro, capa, orejas en punta, cinturón y el murciélago en el óvalo amarillo |
| `hulk` | Hulk | Gigante verde, pelo negro revuelto, short morado y descalzo (celda 64) |

Son versiones chibi de fan, para uso personal. Los personajes son de Marvel y DC: para meterlos en un juego que se publique o se venda hace falta una licencia.

En el kit salen con ropa de deporte y sin arma. Con `heroFicha(id, true)` llevan sus garras o su espada para las peleas.

## Límites honestos

- **Pruebas de campo de frente y de espalda:** una persona de cabeza o un cuerpo acostado no se puede dibujar de frente con este esqueleto. Los saltos, los lanzamientos, la plancha y la natación usan la diagonal más cercana cuando se piden de frente o de espalda. La hoja sigue teniendo 8 filas y ninguna se ve rota.
- **Chibi:** la cabeza ocupa casi media altura y los brazos son cortos. Por eso:
  - Los golpes salen con el brazo que se ve.
  - La pelota pasa adelante de la cara o encima de la cabeza, nunca en el medio.
  - Un brazo levantado no pasa por encima de la cabeza.
- **32 px:** en las acciones de un solo disparo, un cuadro que se pasa por la cabeza grande se corre lo justo para entrar en la celda (1 o 2 pixeles). En los ciclos (correr, nadar) no se corre nada: si algo no cabe, el control de calidad lo marca.
- **La pelota del juego:** los sprites dibujan la pelota hasta el contacto. Después la mueve el juego, desde el `punto` del evento `impacto` o `suelta`.
- **Piernas cortas:** un chibi tiene piernas cortas, así que a su velocidad natural avanza poco. Sophie hace el sprint a unos 43 px por segundo en celda 48. Para un juego arcade se puede ir más rápido: la animación se acelera con la distancia y el pie no patina, pero se ve más agitada.
- **De frente y de espalda:** al caminar hacia la cámara los pies no avanzan en la hoja, se mueven en el lugar. Es lo normal en sprites de 8 direcciones. Los juegos lo resuelven con el ritmo de los pasos.
- **Paso de guardia:** el paso de pelea avanza muy poco por ciclo, porque es un arrastre corto. En la arena va al doble de ritmo. Si tu juego necesita peleadores rápidos, conviene un paso más largo.

## Control de calidad

Las pruebas (`npm test`) revisan toda la familia y los seis héroes en las 8 direcciones y en 32, 48 y 64 px:
- Que nada se salga de la celda.
- Que los pies estén en el piso.
- Que no haya pixeles sueltos.
- Que la altura no tiemble en los ciclos.
- Que cada golpe traiga su impacto.
