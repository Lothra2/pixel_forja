# PixelForja: plan, decisiones y estado

## Estado

Todas las fases están construidas y probadas con imágenes de prueba de la familia y del fútbol.
Las imágenes las hice yo en SVG (`samples/src`) porque no recibí imágenes reales. Antes de dar el
criterio de aceptación por cumplido hay que pasar las imágenes reales por el estudio.

| Fase | Qué incluye | Estado |
|---|---|---|
| 0 | Plan, crítica y prototipo del flujo completo | Hecho |
| 1 | Humano chibi 3/4: reposo, caminar, correr, saltar en partes, patear, festejo. 32, 48 y 64 px. PNG + JSON, GIF, control de calidad, estudio en español e inglés | Hecho |
| 2 (adelantada) | Paquete de fútbol completo: las 33 animaciones de Fútbol Familia GG más portero | Hecho |
| 3 | Vista desde arriba en 4 direcciones, preajustes juvenil y realista, controles finos, vistas extra subidas | Hecho |
| 4 | Animales: cuadrúpedo con boxer (Thor), perro, mapache y gato | Hecho |
| 5 | Paquetes de básquet, vóley, tenis, béisbol, natación, atletismo, artes marciales, skate, bici y RPG, con implementos dibujados con código | Hecho |
| 6 | Editor de poses con línea de tiempo, papel cebolla e interpolación | Hecho |
| 7 | Exportadores Aseprite, Godot, Unity, zip de cuadros, paquete de personaje. Galería y "sorpréndeme" | Hecho |
| Fotos | Modo busto para selfies: cara, ojos, cejas, pelo, barba, camisa y estampado. Lo de abajo se completa con ropa por defecto | Hecho |
| Netlify | `netlify.toml` listo | Falta conectar tu cuenta |

## Decisiones que tomé sin preguntarte

- **Fútbol Familia GG** se trata como juego de vista lateral, con hoja estilo Phaser. El punto [24, 46]
  es la planta del pie: la fila 46 es la del contorno de abajo del zapato.
- **El preajuste del juego exporta sin balón.** Supuse que el juego dibuja su propio balón. En la vista
  previa el balón sí se ve, y en los demás exportadores se elige con un interruptor.
- **Aseprite**: exporto los dos. El `.aseprite` de verdad, con una etiqueta por animación, y el JSON que
  saca Aseprite, que Phaser carga con `load.aseprite`.
- **Godot 4**: un `SpriteFrames` (`.tres`) que recorta la hoja. **Unity**: el `.meta` del PNG en modo
  múltiple, con filtro Point, sin compresión y un recorte por cuadro. Lo armé para Unity 2022.3 o más nuevo.

## Lo que cambié del plan original y por qué

1. **Fútbol antes que vista de arriba y animales.** Así lo primero que sirve es tu juego.
2. **Corregir a mano es el camino principal.** Sin IA la detección de zonas acierta en dibujos de
   colores planos con línea, que es lo común en avatares e ilustraciones. Con sombreado fuerte, texturas
   o fotos se equivoca más. Por eso cada paso trae varita, pincel, recuadro y ojos.
3. **La escala la da el recuadro de la cabeza, no los ojos.** La distancia entre ojos cambia demasiado
   entre estilos.
4. **Lentes, ojos y boca se diseñan con sellos.** Reducidos se rompen.
5. **El control de calidad tiene dos niveles.** Bloquean: se sale del cuadro, pies en el piso,
   pixeles sueltos y altura en animaciones de pie. Solo avisan: colores, temblor y cara legible.
   La altura no se exige en animaciones donde agacharse es parte del movimiento, como la barrida o el
   portero. Al exportar se puede forzar, pero queda dicho qué falló y en qué cuadro.
6. **Brazos del chibi.** Con cabeza grande y brazos cortos, un brazo alzado nunca supera la cabeza.
   El render los abre hacia el costado (de frente) o los adelanta (de lado) para que las manos asomen.
   Es la convención del pixel art chibi.
7. **El encuadre lo decide el cuerpo.** Un balón que sale disparado se recorta. Si un salto choca con
   el techo de la celda, ese cuadro se baja solo lo justo, porque el juego igual mueve el sprite al saltar.

## Piezas dibujadas (LPC) en el creador de avatar

Investigué quién hace mejor esto. Hay tres caminos:

1. **Piezas dibujadas a mano por artistas**, armadas por capas y recoloreadas. Así lo hacen Stardew Valley y el
   Universal LPC Spritesheet Character Generator: arte libre con 85 peinados, 5 barbas, 8 bigotes, 7 lentes, narices,
   cejas y caras con expresiones, todo en cuatro direcciones.
2. **IA generativa** (PixelLab, InstantID con SDXL): mejor parecido desde una foto, pero cuesta por uso, la foto sale del
   equipo y rompe la regla de no usar IA.
3. **Algoritmos de pixelado** (Gerstner 2012, superpíxeles con paleta): buenos para retratos grandes, no para cabezas de 20 px.

Elegí el 1 y lo repliqué: el creador ahora trae por defecto las piezas LPC sobre nuestro cuerpo y nuestras
animaciones. Se recolorean de forma relativa (cada tono guarda su distancia al tono base del artista), así el sombreado
original se conserva con cualquier color. Las piezas en volumen siguen disponibles, y a 32 px se usan siempre porque
las piezas LPC están dibujadas para cabezas de unos 22 px. Licencias y créditos: [ARTE-LPC.md](../ARTE-LPC.md).

## Modo busto (fotos y selfies)

El spec pedía dibujos, no fotos. Igual mandaste tu selfie, así que agregué un camino aparte para fotos de
busto. Se activa solo cuando el borde de la imagen es muy variado (un fondo real) o cuando la imagen corta
el cuerpo abajo. También se elige a mano en el paso de fondo.

- La cara es la mancha de piel más grande del centro. Su ancho da la escala de todo lo demás.
- Ojos y cejas se buscan por separado a cada lado, así una cabeza inclinada no los cruza.
- La barba se detecta por textura: piel con menos croma o más oscura que la frente pasa a barba.
- La camisa crece desde abajo al centro. Un estampado de color fuerte pasa al pecho del personaje como
  un parche de ese color. El texto no se puede leer a ese tamaño.
- La cabeza de una foto es más alargada que la de un chibi. Se comprime hasta 1.12 de alto por ancho.
- Piernas, short, medias y zapatos no salen en la foto: van por defecto y se cambian en Estilo.

`scripts/personaje.ts` arma de una vez el paquete de un personaje: comparación, GIF, hoja del juego y ficha.

## Cómo funciona

- **Ficha** (`src/engine/sheet/ficha.ts`): JSON versionado (v2). Guarda el cuerpo, las proporciones,
  las paletas, la ropa, la cara, las cabezas pixeladas por tamaño y vista, y tus animaciones propias.
  Una ficha v1 se migra sola.
- **De imagen a ficha**: quitar fondo (relleno desde los bordes más el fondo encerrado), zonas por
  k-means en OKLab más la posición de cada pieza, cabeza adivinada desde la pieza de piel de la cara,
  ojos como huecos dentro de la cara, pixelado por zona (moda, no promedio), sellos y rampas de color.
- **Pose única para tres vistas**: la pose se piensa de lado y el render la proyecta de frente o de
  espalda. La izquierda es el espejo de la derecha. Una animación escrita una vez sirve para cualquier
  personaje del mismo esqueleto.
- **Movimiento**: caminar, correr y los andares de animales son ciclos con fórmulas que dependen del
  largo de la pierna y la contextura. Lo demás son poses clave interpoladas. El pelo largo tiene vaivén
  propio y la cabeza llega un cuadro tarde.
- **Render**: lienzo por capas con pincel de grosor fijo, contorno selectivo y pies al piso. Lo único
  que se rota es la cabeza, y con RotSprite.
- **Determinista**: la misma ficha da los mismos pixeles en el navegador, en el worker y en Node.

## Pruebas

- **Vitest, 47 pruebas.** Cubren el control de calidad de las 75 animaciones humanas con los 6
  personajes a 48 px, el preajuste del juego a 32 y 64, los preajustes juvenil y realista en 3 tamaños,
  RPG en 4 direcciones y Thor en 3 tamaños. También que cada exportador abra bien (Aseprite se parsea
  cuadro por cuadro, Godot, Unity, zip y GIF), la migración v1 a v2 y las imágenes doradas.
- **Playwright, 8 pruebas**, en computadora y teléfono. Recorren el flujo completo de persona y de
  animal, el editor de poses, la galería, las descargas y una selfie de busto.
- `npm run entregables` revisó 604 clips sin errores de calidad. La tabla está en `docs/final/calidad.md`.

## Lo que falta o no quedó perfecto

- **Imágenes reales.** Los dibujos están probados con imágenes sintéticas. Fotos reales probé una sola,
  tu selfie. Con otras fotos van a salir casos nuevos: luz dura, gorra, pelo largo o cara de lado.
- **Tono de piel en fotos.** Sale un poco rosado. Se ajusta en Estilo.
- **Exportadores sin abrir en su programa.** No tengo Aseprite, Godot ni Unity aquí. Los archivos siguen
  el formato publicado y las pruebas los leen de vuelta, pero no los abrí en cada programa.
- **El 3/4 lateral no es un 3/4 real de la cabeza.** Es la cabeza de frente con la cara corrida.
  Si subes una imagen de lado, esa vista mejora.
- **Peinados asimétricos.** Una cola de caballo a un lado queda del lado de la cara en la vista lateral.
- **Animales sin vista de arriba.** Salen solo de lado (y su espejo), con forma de plantilla. De la
  imagen se toman solo los colores.
- **Lentes a 32 px** ocupan casi toda la cara.
- **Unas medias blancas sobre fondo blanco** pueden confundirse con fondo. Se corrige con el pincel.
- **Galería en el navegador.** Si se borran los datos del navegador se pierde. La ficha exportada es el
  respaldo de verdad.
- **Netlify**: falta conectar el repo a tu cuenta (Netlify > Add new site > Import from Git > este repo).
  El build y la carpeta ya están configurados.
