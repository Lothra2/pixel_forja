# Taller gótico

Assets isométricos originales con las proporciones de los juegos de rol de acción oscuros de 1999-2000, para el
juego estilo Diablo 2 que viene. Todo lo dibuja el motor (`src/engine/gotico/`), nada viene del juego original.

## Por qué así

Diablo 2 era 3D prerenderizado: modelos 3D pintados a sprites con luz fija. El taller hace lo mismo con piezas 3D
simples (cajas, cilindros, elipsoides, poliedros) que un trazador de rayos pinta con la cámara del juego, la luz
de arriba a la izquierda, sombras propias y en el piso, texturas por material y la paleta bajada a rampas cortas
con trama. Así cientos de assets salen con el mismo estilo y la misma escala.

Investigado (fuentes: postmortem de Game Developer 2000, código de OpenDiablo2 y Riiablo): ningún proyecto
abierto trae el arte original, todos piden los archivos del juego. Por eso todo es original.

## Escala

| Cosa | Medida |
|---|---|
| Proyección | isométrica 2:1, cámara a 30° |
| Baldosa de piso | rombo de 160×80 px |
| Celda de juego | rombo de 32×16 px (5×5 celdas por baldosa) |
| Persona adulta | 75 px de alto |
| Direcciones | 8 para personajes y monstruos (s, so, o, no, n, ne, e, se) |
| Cuadros por segundo | 25, como el original |

## Qué hay

- Pisos: 25 tipos (pasto, tierra, camino, empedrado, lajas, catedral, cueva, arena, arenisca, nieve, hielo, selva,
  pantano, agua, huesos, infierno, lava, runas, arcano, pentagrama...) que pegan sin costura entre sí.
- Objetos por tema: campamento, campo, árboles, casas, pueblo en ruinas, muebles, armas y armaduras, cementerio,
  monasterio y catedral, catacumbas, cuevas, hielo, nieve, desierto, tumbas, cloacas, santuario arcano, selva,
  templos de la selva, infierno y la fortaleza.
- Personajes y monstruos con esqueleto articulado: bárbaro, paladín, hechicera, amazona, nigromante, asesina,
  druida y guerrero; esqueleto, zombi, diablillo, demonio grande y espectro helado. Cada uno quieto, caminando,
  atacando y muriendo (los magos también lanzan hechizos), en 8 direcciones.
- Paisajes armados con semilla: cementerio, cueva, templo de la selva, catedral, campamento, pueblo en ruinas,
  desierto, tumba, infierno, montaña nevada, páramo y bosque, catacumbas, santuario arcano y fortaleza.

## Cómo usar la exportación en el juego

`catalogo.json` lista cada objeto con su archivo, tamaño, ancla, cuadros, huella y si bloquea.

- Objeto: tira horizontal con sus cuadros. El ancla es el pixel que va en el centro de la celda donde se para.
- Personaje: `hojas/<id>.png`, una fila por dirección en el orden s, so, o, no, n, ne, e, se y una columna por
  cuadro. Todas las celdas del mismo tamaño y la misma ancla.
- Piso: tira de rombos de 160×80.
- Celda (cx, cy) a pantalla: `x = (cx - cy) * 16`, `y = (cx + cy) * 8 + 8`, más el origen del mapa.
- Orden de dibujo: pisos primero, después objetos y personajes de atrás hacia adelante por `cx + cy`.
- Animación: `cuadro = floor(tiempo * 25 / t) % cuadros`.
- Dirección de un personaje que camina de (x0, y0) a (x1, y1) en el piso: ángulo `atan2(y1 - y0, x1 - x0)`;
  0° es `se`, 45° `s`, 90° `so`, 135° `o`, 180° `no`, 225° `n`, 270° `ne`, 315° `e`.

## Agregar assets

Ver `src/engine/gotico/GUIA.md` y probar con `MODS=<archivo> npx tsx scripts/gotico-lamina.ts salida.png`.
