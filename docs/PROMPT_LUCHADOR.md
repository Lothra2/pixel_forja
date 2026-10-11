# Prompt: prueba de luchador grande en PixelForja

Copia todo lo que está debajo de la línea y pégalo en una sesión nueva de Claude Code sobre el repo `Lothra2/pixel_forja`.

---

Proyecto: prueba de concepto de un **luchador humano grande** estilo juego de pelea (Street Fighter, King of Fighters) dentro de PixelForja, **sin IA de imágenes**. Todo se dibuja por código.

## Cómo trabajamos
- Háblame en español venezolano casual, directo, sin relleno.
- Sé crítico. Si algo de esto está mal pensado, dímelo antes de construir.
- Nunca digas que algo está probado si no lo probaste.
- Al final de la prueba te detienes, me muestras imágenes y GIFs, y esperas mi visto bueno. No sigas con el taller completo sin mi aprobación.
- Un commit por paso con las pruebas en verde. Push a la rama que te indique la sesión.

## Reglas que no se tocan
- No toques GG Abyss ni las imágenes doradas de `golden/`.
- No cambies los perfiles que ya existen (clásico y premium) ni las fichas de la familia. Lo nuevo vive en un perfil o módulo aparte.
- Las fotos de `private/` nunca se suben ni se publican.
- Nada de IA de imágenes ni servicios pagos. El arte sale del motor.

## La técnica
La idea es la de Dead Cells: un cuerpo 3D sencillo convertido en pixel art.
1. **Esqueleto humano adulto** con proporciones de luchador. Cabeza más o menos 1/7 de la altura, no chibi. Hombros anchos, manos con dedos agrupados en puño, mano abierta y mano en garra.
2. **Volúmenes de verdad** por hueso: cápsulas y formas con sección, para torso con pecho y espalda, brazos y piernas con músculo, manos, pies y cabeza. Revisa `src/engine/render/pet3d.ts`, que ya dibuja volúmenes para los animales, y decide si se extiende o se hace un renderizador nuevo.
3. **Luz y sombra tipo pelea:** luz fija, 3 o 4 tonos por color, sombreado tipo cel, brillo en el borde opcional y contorno de 1 px más oscuro que el color de relleno.
4. **Dibujar grande y bajar:** renderizar a 2x o 4x y reducir a la celda final con paleta fija, sin difuminado ni píxeles sueltos.
5. **Celda de prueba 160x160**, con el luchador midiendo entre 120 y 128 px de pie. Pivote fijo en los pies.
6. **Cara legible a tamaño real:** ojos, cejas, nariz, boca y expresión. Al menos neutra, concentrada (al pegar), dolor (al recibir) y grito (en el especial).
7. **Ropa:** gi o kimono de karate con cinturón, o pantalón y franelilla. Pelo corto en la prueba. El pelo largo y la ropa suelta con física van después.

## Movimientos de la prueba
Cada movimiento es un **archivo de datos**: poses clave, tiempos, eventos, cajas y efectos. No es código nuevo por movimiento.
- `idle`: guardia de pelea con respiración, en ciclo.
- `punch`: puñetazo recto con anticipación, impacto y recuperación.
- `hit`: recibir golpe en la cara, con retroceso y vuelta a la guardia.
- `special`: un especial de energía tipo onda, con carga, lanzamiento y efecto del proyectil en su propia hoja o capa.

Por cada cuadro, en el JSON:
- **Caja de daño** (hurtbox): una o varias, donde le pueden pegar.
- **Caja de golpe** (hitbox): solo en los cuadros activos del golpe.
- **Eventos:** `impacto`, `suelta` (cuando sale el proyectil) y `paso` si mueve los pies.
- **Datos de pelea por movimiento:** cuadros de arranque, activos y de recuperación.

## Entregables de la prueba
Guárdalos en `out/luchador/`:
1. La hoja PNG y el JSON con `cell`, `pivot`, `anims` (`start`, `frames`, `fps`, `loop`), cajas y eventos.
2. Un GIF por movimiento a tamaño real y otro ampliado x3.
3. Una lámina de comparación: el luchador a tamaño real al lado de un sprite de referencia del mismo tamaño dibujado a mano. Si no hay referencia libre, solo pon una regla de 128 px.
4. Un visor simple en el estudio, o una página aparte, que reproduzca los 4 movimientos con las cajas encendidas o apagadas.
5. Pruebas Vitest: el pivote no se mueve, las cajas existen en los cuadros correctos, la paleta es fija, no hay píxeles sueltos y la figura cabe en la celda.
6. Una tabla de control de calidad y una lista honesta de **qué no salió bien y por qué**.

## Criterio para seguir o parar
Me muestras todo y respondes esto con honestidad:
- ¿La cara y las manos se leen a tamaño real?
- ¿El cuerpo se ve con volumen o se ve de plástico?
- ¿El movimiento tiene peso: anticipación, impacto y recuperación?
- ¿Cuánto trabajo falta para un taller completo donde se configuran cuerpo, cara, pelo, ropa, colores y la lista de movimientos especiales?

Si la prueba convence, el siguiente paso es el taller de luchadores. Si no convence, dime por qué y qué alternativa recomiendas.
