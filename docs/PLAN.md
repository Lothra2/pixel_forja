# PixelForja: plan, crítica y estado

Documento vivo. Aquí queda lo que decidimos, lo que cambiaría del plan original y en qué va cada fase.

## Qué cambiaría del plan

**1. Reordenar fases para que tu juego tenga valor antes.**
El plan completo es de meses: más de 80 animaciones, seis exportadores, editor de poses, animales y vista de arriba. Si Fútbol Familia GG es de vista lateral, propongo que la Fase 2 sea el paquete de fútbol completo con las 33 animaciones del preajuste. Después vendrían la vista de arriba en 4 direcciones, los animales y lo demás. Así cada fase termina con algo que usas en el juego.

**2. Corregir a mano es el camino principal, no el plan B.**
Sin IA, la detección de zonas funciona bien con ilustraciones de colores planos y línea negra, como las de prueba. Con dibujos muy sombreados, texturas o fotos de juguetes se va a equivocar más. Por eso el estudio adivina todo pero cada paso se corrige con uno o dos toques: varita, pincel, recuadro y ojos.

**3. Los dos ojos no sirven como escala.**
La distancia entre ojos cambia mucho entre estilos. En un dibujo realista los ojos están juntos y en un chibi separados, así que escalar por ojos da cabezas de tamaños distintos. Uso el recuadro de la cabeza para la escala y los ojos para centrar la plantilla y ubicar los sellos. Además el motor adivina recuadro y ojos, y tú solo corriges si hace falta.

**4. Los lentes también se diseñan, no se reducen.**
Pasó lo mismo que con los ojos: reducidos se rompían en pedazos sueltos. El motor detecta un accesorio alrededor de los dos ojos, saca su color y los dibuja con un sello. Propongo extender la idea a gorras, cintillos y el número de la camiseta.

**5. El control de calidad no debe bloquear todo.**
Bloquear la exportación por "temblor" o "cantidad de colores" frena sin necesidad. Lo dejé en dos niveles: errores que bloquean (altura, pies en el piso, se sale del cuadro, pixeles sueltos) y avisos que no bloquean (colores, temblor de la cabeza, cara legible).

**6. La ficha debería poder guardar la imagen de origen.**
Si la ficha solo guarda la cabeza ya pixelada, cuando mejore el motor una ficha vieja queda congelada. Propongo un campo opcional con la imagen de trabajo para regenerarla. Ojo con la privacidad: una ficha con la imagen adentro se comparte con la imagen.

**7. Hay exportadores ambiguos.**
"Aseprite" puede ser el archivo .aseprite o el JSON que exporta Aseprite, que es casi igual al de Phaser. Unity cambia el formato de los recortes según la versión. Necesito saber qué versiones usas antes de la Fase 6.

**8. Determinismo de verdad.**
El motor no dibuja con Canvas. Dibuja en memoria con su propio código, así que la misma ficha da los mismos pixeles en el navegador, en el worker y en Node. Eso es lo que hace útiles las imágenes doradas. El PNG se decodifica con el mismo código en los dos lados. JPG y WebP los decodifica el navegador y pueden variar un poco, por eso la línea de comandos solo acepta PNG.

**9. React para el estudio.**
Lo conoces por React Native. El motor no depende de React, así que se puede cambiar sin tocar nada del motor.

## Estructura

```
src/engine/          motor puro en TypeScript, sin DOM. Corre en navegador, worker y Node
  core/              imagen en memoria, RNG determinista
  color/             OKLab, rampas de 4 tonos con giro de tono, k-means
  analyze/           imagen de trabajo, quitar fondo, zonas, adivinar cabeza y ojos
  head/              pixelado de cabeza por zona y librería de sellos
  sheet/             la ficha (JSON versionado), construir ficha desde imagen, recolor
  rig/               medidas por tamaño, pose, IK
  anim/              animaciones procedurales
  render/            lienzo por capas, pincel fijo, contorno selectivo, pies al piso
  qa/                control de calidad
  export/            PNG, hoja + JSON, preajuste Fútbol Familia GG, GIF propio
  __tests__/         Vitest
src/studio/          el estudio en React, con el motor en un Web Worker
cli/forja.ts         generar en lote con el mismo motor
e2e/                 Playwright en computadora y teléfono
samples/             imágenes de prueba sintéticas y su SVG
golden/              imágenes doradas
scripts/             generar muestras y entregables
docs/fase0/          entregables de la Fase 0
```

## Fase 0: estado

Hecho y probado:

- Flujo completo real: imagen, fondo, zonas, cabeza, estilo, vista previa y exportar.
- Animaciones: reposo con parpadeo y caminar de 8 cuadros, en 32, 48 y 64 px.
- Exporta hoja PNG + JSON tipo Phaser, el preajuste de Fútbol Familia GG, GIF y la ficha.
- Control de calidad en verde para los 3 personajes de prueba, en los 3 tamaños.
- 30 pruebas de Vitest y 4 de Playwright en verde.

Lo que falta o no salió:

- **Las imágenes son sintéticas.** Las hice yo en SVG para probar. El criterio de aceptación de la Fase 1 es con tus tres imágenes.
- **Colores:** salen entre 18 y 27 por personaje. El piloto que gustó usaba 25 a 30. En la Fase 1 sumo tonos en ropa y pelo.
- **Pelo con vaivén propio:** por ahora la cabeza entera llega un cuadro tarde. El pelo largo todavía no se mueve aparte.
- **Vista 3/4:** es la cabeza de frente corrida un pixel con la cara girada. En chibi se ve bien, pero no es un 3/4 real.
- **Escalones dobles en el borde de la cabeza:** todavía no se limpian.
- **Lentes a 32 px:** se ven pesados, ocupan casi toda la cara.
- **Zonas de colores parecidos** pueden confundirse, por ejemplo pantalón gris con zapatos grises. Se corrige con la varita.
- **Netlify:** no lo pude publicar porque necesito acceso a tu cuenta. El repo ya trae `netlify.toml`. Lo conectas en Netlify en dos minutos o me pasas un token.
- **Galería y botón "sorpréndeme":** quedaron para la Fase 1.

## Preguntas abiertas

1. ¿Me pasas las tres imágenes de prueba reales?
2. Fútbol Familia GG: ¿es de vista lateral? ¿Qué motor usa? ¿El punto [24, 46] es la planta del pie?
3. ¿Te parece bien adelantar el paquete de fútbol antes que la vista de arriba y los animales?
4. Para la Fase 6: ¿qué versión de Unity y de Godot usas? ¿"Aseprite" es el archivo .aseprite o su JSON?
