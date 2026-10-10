# Kit deportivo de PixelForja

Hojas de sprites de 8 direcciones para un juego de deportes isométrico: atletismo, natación, vóley, tenis y peleas, con la familia GG y seis héroes originales. Todo sale con el movimiento premium (poses clave de verdad, pivote fijo, eventos).

## Generar el kit

```bash
npm run deportes -- salida/kit_deportes                  # todo: familia + héroes, los 5 deportes, celda 48
npm run deportes -- salida/kit --deportes natacion,pelea  # solo algunos deportes
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

Cada atleta trae su `celda` y su `pivote`. El pivote es el punto de apoyo (los pies) y **no se mueve** entre cuadros, direcciones ni animaciones. El Coloso Verde va en celda de 64 y el resto en 48.

## Qué hace el juego con cada dato

| Campo | Qué es | Qué hace el juego |
|---|---|---|
| `cuadros`, `fps`, `loop` | Duración y repetición | Reproduce la animación |
| `eventos[].tipo = paso` | El pie toca el piso (`pie`: cerca o lejos) | Sonido de pisada y polvo |
| `eventos[].tipo = impacto` | El cuadro exacto del golpe | Daño, hitstop de 2 o 3 cuadros, sonido, temblor de pantalla |
| `eventos[].tipo = suelta` | Sale la pelota, la bala, la jabalina o el efecto | Crea el proyectil en ese cuadro |
| `eventos[].tipo = despegue` / `aterriza` | Deja el piso / vuelve al piso | Activa y apaga la física del salto, polvo al caer |
| `avance` | Pixeles que avanza el cuerpo en un ciclo sin que el pie patine | `ritmo = velocidad_del_juego * cuadros / (avance * fps)`; con ese ritmo el pie no patina |
| `elevacion` | Pixeles que el juego sube el sprite en cada cuadro | Dibuja la sombra en el piso y el sprite `elevacion[i]` pixeles más arriba |
| `agua` | Fila de la superficie del agua en la celda (o `null`) | Alinea la superficie de su piscina con esa fila |

### Por qué existe `elevacion`

Un garrochista sube 5 metros y no cabe en una celda de 48 px. Los juegos isométricos lo resuelven así: el cuerpo se dibuja cerca del piso de la celda y el juego sube el sprite entero sobre su sombra. Garrocha, salto largo, remate de vóley, smash, patada voladora y la salida de natación usan esto.

### Natación

El nadador ya viene con el agua puesta: lo que queda bajo la superficie va teñido de azul y medio transparente, con espuma en la línea, estela y gotas cuando entra una mano o un pie. El juego dibuja su piscina detrás y alinea la superficie con `agua`. El cuerpo flota a altura fija: las patadas no lo hacen rebotar.

## Animaciones por deporte

- **Atletismo:** sprint, salida de tacos, vallas, salto largo, salto con garrocha, lanzamiento de bala, lanzamiento de jabalina. También reposo, caminar, correr, golpe recibido, festejo y triste.
- **Natación:** crol (respira de lado), espalda (avanza con la cabeza primero), pecho (patada de rana), mariposa (ondulación de delfín), flotar y salida desde el banco.
- **Vóley:** espera, recepción, colocación, remate, bloqueo, saque flotado y plancha.
- **Tenis:** espera con split step, derecha, revés a dos manos, saque, volea y smash.
- **Peleas:** guardia, desplazamiento, jab, directo, gancho, uppercut, patada baja, patada alta, patada voladora, bloqueo, esquiva, golpe recibido, nocaut y victoria. Cada golpe trae chispa de impacto.

## Héroes originales

| Id | Nombre | Idea |
|---|---|---|
| `aracnido` | Arácnido | Trepamuros ágil, traje azul noche con red dorada |
| `garra` | Garra | Mutante rudo, chaqueta de cuero y garras de acero |
| `pantera` | Pantera de Ónix | Guerrera felina, traje negro con franja plateada |
| `carmesi` | Mercenario Carmesí | Mercenario bromista, carmesí y negro, con espada |
| `vigilante` | Vigilante Nocturno | Detective de la noche, capa, capucha con orejas en punta |
| `coloso` | Coloso Verde | Gigante verde de fuerza bruta (celda 64) |

Son arquetipos propios: nombres, colores y siluetas distintos, sin emblemas ni trajes copiados de personajes con dueño. Así el juego se puede publicar sin problemas de derechos. Si usas personajes de Marvel o DC tal cual en un juego publicado, necesitas una licencia.

En el kit salen con ropa de deporte y sin arma. Con `heroFicha(id, true)` llevan sus garras o su espada para las peleas.

## Límites honestos

- **Pruebas de campo de frente y de espalda:** una persona de cabeza o un cuerpo acostado no se puede dibujar de frente con este esqueleto. Los saltos, los lanzamientos, la plancha y la natación usan la diagonal más cercana cuando se piden de frente o de espalda. La hoja sigue teniendo 8 filas y ninguna se ve rota.
- **Chibi:** la cabeza ocupa casi media altura y los brazos son cortos. Por eso:
  - Los golpes salen con el brazo que se ve.
  - La pelota pasa adelante de la cara o encima de la cabeza, nunca en el medio.
  - Un brazo levantado no pasa por encima de la cabeza.
- **32 px:** en las acciones de un solo disparo, un cuadro que se pasa por la cabeza grande se corre lo justo para entrar en la celda (1 o 2 pixeles). En los ciclos (correr, nadar) no se corre nada: si algo no cabe, el control de calidad lo marca.
- **La pelota del juego:** los sprites dibujan la pelota hasta el contacto. Después la mueve el juego, desde el evento `impacto` o `suelta`.

## Control de calidad

Las pruebas (`npm test`) revisan toda la familia y los seis héroes en las 8 direcciones y en 32, 48 y 64 px:
- Que nada se salga de la celda.
- Que los pies estén en el piso.
- Que no haya pixeles sueltos.
- Que la altura no tiemble en los ciclos.
- Que cada golpe traiga su impacto.
