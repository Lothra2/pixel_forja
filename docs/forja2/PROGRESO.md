# Forja 2: progreso

El encargo completo está en `docs/PROMPT_FORJA2.md`. Rama: `claude/forja2` (sale de `claude/pelea-familia`).

| Fase | Estado | Puerta |
|---|---|---|
| 0. Base: merge de `abyss-premium` | Aprobada | @parent regeneró el kit desde fc44ab7: 3201 archivos, 0 diferencias |
| 0b. Piloto (Rick, 4 golpes) | Cerrado | luchador 160 rechazado por Rick; cabezón SD rechazado por @parent; cuerpo SDF parado |
| 0c. Movimiento de Forja 2 sobre el chibi de hoy | Entregado, esperando decisión | ver abajo |
| 1. Cuerpo (luchador, cabezon, nekketsu, anime; megaman si sobra) | Sin arrancar | |
| 2. Movimiento | Sin arrancar | |
| 3. Bibliotecas: exportador FORJA2 + PNG/JSON general, calle; rpg8 condicionada | Sin arrancar | |
| 4. Poderes y efectos | Sin arrancar | |
| 5. Estudio y exportación | Sin arrancar | |
| 6. GG Abyss con Forja 2 | Sin arrancar | |

## Piloto 0c: el movimiento nuevo sobre el cuerpo de hoy

Decisión de @parent después del 0b: el cuerpo nuevo por volúmenes se para en todos los tamaños, GG Abyss se queda con
el premium chibi de hoy (rpg8 cortada), Street Family Fighter 2 sigue con Higgsfield. Lo que se prueba ahora es solo el
movimiento: los mismos 4 movimientos del formato de claves y principios, dibujados con el cuerpo y el pintor del
premium chibi de GG Abyss a 48, al lado de las animaciones de hoy de ese mismo chibi.

Entrega: `docs/forja2/piloto/0c/lamina_<movimiento>.png` (fila 1 hoy, fila 2 Forja 2, x4),
`docs/forja2/piloto/0c/gif/<movimiento>_x1.gif` y `_x3.gif` (los dos lado a lado, cada uno con sus tiempos) y
`docs/forja2/piloto/0c/calidad.md`. Se regenera con `npx tsx scripts/forja2-piloto-0c.ts`.

### Qué se reusó y qué es nuevo

- Del chibi de hoy, sin cambiarlo: el cuerpo, la cabeza LPC, el pintor (`renderHuman` con implementos aparte), el
  encuadre fijo del premium (`cropClip`), el vaivén del pelo y la chispa de impacto (`spark`).
- De Forja 2: los 4 movimientos (JSON de claves con ticks y curvas), los principios (anticipación, impacto único,
  sobrepaso, recuperación larga, cabeza que lidera, respiración, aplastón), el esqueleto 3D y el adaptador
  `forja2/chibi.ts`: resuelve cada cuadro en 3D, lo proyecta de lado y saca la pose del chibi (torso, hombro y codo,
  tobillo desde la cadera). El adaptador además clava los pies en el cuerpo de destino: dibuja, mide dónde quedó cada
  pie apoyado y corrige el cuerpo y el pie de atrás hasta que queden en su pixel del primer cuadro.
- Cambio en el esqueleto: la inclinación ahora va en el plano de la pantalla, hacia el rival. Antes iba en el frente del
  pecho ya girado, y con el pecho a 60 grados de lado se veía menos de la mitad.

### Números (detalle en calidad.md)

- Control de calidad: Forja 2 pasa todo en los 4 movimientos. El de hoy falla patina en 3 de 4 (el pie de apoyo se
  corre 2 a 4 px) y el salto de silueta en el puño (0,62).
- El golpe medido: puño de Forja 2 con recogido de 11,8 px antes del impacto (hoy 2,4), arco de 11,1 px (hoy 1,2) y
  sobrepaso de la cabeza de 1,8 px (hoy 0,6). La patada sale pareja: alcance 10,7 contra 9,3, sin recogido en ninguna.
- Tiempos: Forja 2 usa los ticks del contrato de pelea (puño 22, patada 26, recibe 18, guardia 32); hoy son 34, 39, 30
  y 60 (a su fps). Forja 2 es más seco y rápido.
- Segundos por cuadro: 0,001 a 0,009 en las dos filas (el chibi pinta en milisegundos; el 3D del adaptador no pesa).

### Veredicto honesto

En números gana Forja 2: pies clavados, anticipación y arco que se miden, tiempos de juego de pelea. A la vista, a 48 px,
la diferencia es chica: el puño se nota algo más pesado (el puño se va atrás y el cuerpo sigue de largo), pero la patada
de hoy se lee un poco mejor (sube más y sostiene la pierna estirada varios cuadros). No es "claramente mejor" a simple
vista. Lo que sí deja claro es que el control de calidad y el pie clavado sirven aunque no se cambie ningún movimiento:
las animaciones de hoy patinan y nadie lo había medido.

## Piloto 0b

### Qué se hizo

- `src/engine/forja2/`: estilos como datos, esqueleto común (el del luchador con las medidas del estilo), formato de
  movimiento (claves con ticks, curvas, arcos, pies clavados), principios aplicados por el motor (anticipación,
  impacto único con estirón, sobrepaso, recuperación larga, cabeza que lidera, respiración, aplastón), cuerpo por
  volúmenes SDF con vestuario como dato, pintor a 4x que baja a la celda con paleta fija, cabeza LPC sin cambiar
  pegada con profundidad, control de calidad con números y exportación al contrato de pelea.
- Los 4 movimientos salen del formato nuevo, con los ticks y las ventanas del contrato de JUEGO.
- Entrega: `docs/forja2/piloto/lamina_<movimiento>.png` (JUEGO, PIXEL, Forja 2 cabezón a 96, 64 y 48, y el premium
  chibi de hoy, todos a la misma altura), `docs/forja2/piloto/gif/` (x1 y x3) y `docs/forja2/piloto/calidad.md`.
  Contrato: `docs/pelea/FORJA2/assets/luchadores/rick/` (cabezón a 96).

### El luchador a 160: rechazado

Rick lo vio y lo llamó patético: se ve de plástico y el pecho se lee como senos. Por la regla del piloto se paró.

**Qué pasó con el pecho.** La abertura del gi eran dos elipsoides de piel (pectorales) metidos en el grupo del torso,
con unión suave y salientes hacia adelante. Con la luz suave cada uno quedó como una cúpula iluminada con sombra
abajo: dos senos. Después se cambió por una franja, pero el problema de fondo seguía.

**¿Un torso en bloque con sección lo arregla?** Arreglaría los senos (pectorales planos, la V del gi como una zona
del bloque y no como esferas), pero no vale la pena. Lo que hace que un luchador de SF2 se lea a 160 o 188 px es
anatomía dibujada: cortes de músculo, pliegues duros de tela, siluetas exageradas pose por pose. Las primitivas con
luz no lo dan, solo agregan piezas (abdominales, serratos, pliegues) y siguen pareciendo un muñeco 3D. Es la misma
conclusión del luchador por volúmenes de antes de Higgsfield. Para luchadores grandes el arte de JUEGO es mejor.

### El cabezón (SD)

A Rick le gustó mucho a 48 para GG Abyss. En la lámina va a 96, 64 y 48. La cabeza LPC se agranda por un entero (x2 a
96) sin redibujarla; el cuerpo se pinta a su tamaño. Retarget del estilo: la patada va a la altura de la cadera
(piernas cortas) y la cabeza va siempre en 3/4 (si cambia de vista entre cuadros parpadea).

### Control de calidad (cabezón)

Pasan pivote (0 px), patina (0 px), altura (≤ 2 px), sueltos (0), salto (≤ 0,46), cajas (≥ 0,9) y paleta (0 colores
de más) en los 12 casos. Falla la silueta (0,87 a 0,91, el tope es 0,95): todos los pixeles que fallan son del borde
de la cabeza LPC (la cinta, la barba gris y el pelo contra el gris neutro); del cuerpo fallan 0. No se movió el tope.

Segundos por cuadro: 0,20 a 96, 0,09 a 64, 0,05 a 48 (el luchador a 160 tardaba 0,88). El kit completo de un
personaje cabezón (21 anims x 8 direcciones) saldría en un par de minutos sin caché; la caché por huella igual va
antes de la fase 1, como se decidió.

### Qué no salió bien

- El luchador a 160: rechazado (arriba).
- La patada SD se lee débil: la pierna sale horizontal pero corta y gruesa (el pantalón holgado en piernas tan cortas
  hace un bulto). El chibi premium de hoy la lee mejor.
- No hay chispa de impacto; el chibi premium de hoy sí la tiene. La estela del golpe casi no se ve. Va en la fase de
  poderes y efectos.
- A 96 la cabeza (LPC x2) tiene pixeles más gordos que el cuerpo: se nota la diferencia de resolución.
- La recuperación del puño son varios cuadros casi iguales: falta un sobrepaso más visible en el cabezón.
- La silueta de la cabeza LPC no llega al tope contra un fondo gris neutro (ver arriba).
- No se probó en el juego.

## Decisiones de @parent al aprobar la fase 0

- Los tres choques quedan como están: cada juego conserva su Rick. No se cambia el pelo de ninguno.
- Plástico: el piloto lo ataca de entrada (supersampling 4x y bajar con paleta fija, textura de tela, menos especular,
  contorno interior por grupo). Si el luchador a 160 se ve de plástico al final del piloto, se para.
- A 48: `cabezon` va con acabado `retro3` desde el día 1 y se compara también contra el premium chibi de hoy. Si no
  gana claro, GG Abyss se queda con lo de hoy y Forja 2 vive en 96 a 192. Lo decide @parent con Rick viendo la lámina.
- Costo: se miden segundos por cuadro en el piloto y se propone un techo. La caché por huella de ficha, estilo y pose
  es obligatoria antes de la fase 1.
- Movimiento: los 4 movimientos del piloto ya salen del formato nuevo de claves (ticks, curvas, arcos) con el adaptador
  de pose, no de AnimDef a mano.
- Un solo dato de movimiento, con retarget de alcance, cajas y exageración por estilo.
- Orden: piloto, cuerpo, pelea completa para los cinco, exportador FORJA2 más el PNG/JSON general, calle, y rpg8 para
  GG Abyss solo si gana la comparación.

### Pendientes (cortados por ahora, siguen en el encargo)

- Estilo `retro8bit`.
- Biblioteca `plataforma`.
- Editor de poses mejorado.
- `megaman` queda después de los otros cuatro estilos, si sobra tiempo.

## Fase 0: la base

Merge normal de `origin/claude/abyss-premium` (5cca584) en `claude/forja2`, sin reescribir historia. Salieron los 12
conflictos conocidos y ninguno más.

### Cómo se verificó

Con un árbol de cada rama (`git worktree`) y los kits generados sin caché (`--sin-cache`) en los tres:

| Qué | Contra | Archivos | Diferencias |
|---|---|---|---|
| `scripts/game-kit.ts` (kit de GG Abyss) | `abyss-premium` | 3201 | 0, byte por byte |
| `scripts/sports-kit.ts` sin opciones | `pelea-familia` | 852 | 0 |
| `sports-kit --datos --atlas --retratos --cabecitas --objetos --fuentes --deportes calle,pelea` | `pelea-familia` | 61 | 0 |
| `sports-kit --celda 64 --filas right,down --datos --fichas docs/ejemplos/nekketsu/fichas` | `pelea-familia` | 2054 | 0 |
| `kit-a-medida` con `docs/ejemplos/nekketsu/kit.config.json` | `pelea-familia` | 1658 | 0 |
| `golden/` | las dos | 33 | ningún PNG cambió en el merge |

El contrato de pelea de `docs/pelea/JUEGO` lo arma Python (`scripts/luchador_pixel/fiel/sf2_juego.py`) desde las hojas
de Higgsfield, no el motor TS: el merge no lo toca y esas carpetas quedaron intactas.

### Choques que hubo que decidir

Tres cosas de `pelea-familia` cambiaban el kit de GG Abyss por debajo. Quedaron detrás de un interruptor, con lo de
GG Abyss por defecto en su kit y lo de pelea por defecto en todo lo demás:

1. **El pelo de Rick.** Pelea lo pasó a `parted2` en la ficha de la familia (para el olímpico) y GG Abyss lo usa con
   `swept_back`. Ahora `FAMILY_GG.rick.lpcRpg` guarda el de GG Abyss: `familyFicha('rick', true)` (con clase, la de GG
   Abyss) lleva `swept_back` y `familyFicha('rick')` (de calle) lleva `parted2`. La prueba de pelea que pedía el mismo
   pelo en las dos se ajustó a esa regla.
2. **Las cejas fruncidas** de la cara de enojo (la malandra de los rivales). Cambiaban los cuadros de `cast` y
   `attack` de toda la familia y del mercader. Ahora es `avatar.lpc.ceno` (por defecto sí). El kit de GG Abyss lo
   apaga en todas sus fichas, también en las que trae el juego con `--fichas`.
3. **Las letras del vietnamita** en las fuentes del kit de juego. Ahora es `--vietnamita` en `scripts/game-kit.ts`
   (apagado sale como `abyss-premium`). El kit deportivo y el kit a medida las siguen trayendo como antes.

Además:
- Los ambientes del kit de GG Abyss son `AMBIENTES_GG_ABYSS` (la lista de `abyss-premium`). `AMBIENCE_NAMES` sigue
  siendo el catálogo de pelea en su orden. Las pruebas de audio de Abyss miran `AMBIENTES_GG_ABYSS`.
- `velocidad_natural` (de Abyss) sale en el kit de juego y no en el deportivo (`motionOf8(..., { velocidadNatural: false })`).
- `intro.test.ts` eran dos pruebas distintas con el mismo nombre: la de Abyss pasó a `introCine.test.ts`, sin cambios.
- `docs/kit-a-medida.schema.json` se regeneró: el catálogo del kit a medida ahora también ofrece los sonidos de Abyss
  (solo agrega, no quita).
- `--filas` en el kit de juego no aplica a las capas de equipo, la celestial ni los jefes por volúmenes de Abyss
  (siguen saliendo en 8 direcciones).
