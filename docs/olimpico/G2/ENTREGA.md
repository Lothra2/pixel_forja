# Lote G2: el envoltorio
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/49
Fecha: 2026-10-15

## Qué se hizo

Todo en `ui.interfaz`, con su entrada en el manifiesto, como las piezas de siempre. Con `"interfaz": true` salen solas: **no tienes que cambiar el `kit.config.json`.**

| Pieza | Qué es | Archivos del kit |
|---|---|---|
| Retratos grandes a 96 | Los 24 atletas en las **8** expresiones (con `burla`, la del P1), redibujados a 96 con contorno de un pixel | Ninguno nuevo: el mismo `retratos.png` de 768 x 136 |
| `medallas_16`, `_32`, `_64` | Oro, plata y bronce, 3 cuadros cada una | 3 |
| `bandera_<id>_16`, `_32` y `_ondea` | Vietnam, Colombia, Venezuela, Japón, Bogotá y Zulia, quietas y ondeando | 24 |
| `podio` | El podio en el estadio de noche, 800 x 360 | 1 |
| `iconos_prueba`, `iconos_prueba_16` | 18 íconos: las 16 pruebas, el Kachinuki y la pelea | 2 |
| `tarjeta_<equipo>`, `escudo_<equipo>` | La tarjeta de 184 x 104 y el escudo de cada uno de los 6 equipos | 12 |
| `marco_vs_4` | El VS de dos contra dos con cuatro marcos, 800 x 360 | 1 |
| `pantalla_pausa`, `_se_acabo`, `_otra_partidita` | Los fondos de las pantallas retro, 800 x 360 | 3 |

Son 46 piezas nuevas en `ui/`. Como el juego empaqueta la interfaz en un solo archivo, no suman al conteo del artifact.

### Los retratos grandes

**Esto es lo principal, y te explico lo que se puede y lo que no.**
- El motor dibuja personas hasta celda 64. Las cabezas salen de las piezas LPC, que vienen a su tamaño, con la cabeza de unos 20 px. **No hay de dónde sacar más detalle:** un retrato de 96 dibujado a mano no sale de las fichas.
- Probé dibujar las cabezas con el modelo 3D del creador de avatar. Sale a cualquier tamaño, pero las caras no se parecen a nadie: los atletas son quienes son por sus piezas LPC.

Lo que hice:
- **La forma sale del sprite.** La cabeza y los hombros a celda 64, sin contorno, se agrandan x3 con Scale3x. Ese método redondea las curvas y las diagonales sin inventar colores. Se agrandan el color y el material juntos para que no se desalineen.
- **El contorno se dibuja a 96, de un pixel.** Por fuera toma el tono oscuro de la pieza que toca. Por dentro separa el pelo de la cara y la ropa de la piel, como en el sprite. Antes era de 3 pixeles: eso era lo grueso.
- **Los ojos abiertos llevan su brillo,** dos por dos blanco, dibujado a 96.

Para hacerlo, el motor ahora puede devolver el **material de cada pixel** de un cuadro (`materiales` en `renderHuman`). Sirve para redibujar cualquier personaje más grande.

**En el manifiesto:** `escala_grande` pasa de 3 a 1, porque ya no es el sprite escalado. El juego solo lo tiene en el tipo, no lo usa. El chico de 40 no cambia.

### Los equipos: bandera y escudo

En `equipos.json` sumé dos campos opcionales, sin tocar los que ya hay:
- **`bandera`:** para la tarjeta. Sin el campo, sale la de su `pais`. Rolos lleva `bogota` y Maracuchos lleva `zulia`. Los otros salen de su país.
- **`escudo`:** un emblema del motor:
  - Familia GG: `letras` con GG.
  - Instituto: `llama`.
  - Rồng: `dragon`.
  - Rolos: `bicicleta`, por la ciclovía.
  - Panas: `montana`, el Ávila con el sol.
  - Maracuchos: `rayo`, el del Catatumbo sobre el lago.
  - Sin el campo, el escudo lleva sus iniciales.

Los dos se validan con sugerencias, como todo el kit.

## Cómo se usa (estudio y kit)

**En el estudio:** la página Interfaz del juego sigue mostrando las piezas retro de G1. Las del envoltorio salen en el kit y en los tableros de esta carpeta. Sumarlas al estudio va en otro lote si te sirve.

**En el kit:** con `"interfaz": true` sale todo. Si quieres solo algunas, la lista acepta `medallas`, `podio`, `iconos`, `banderas`, `tarjetas`, `marco_vs` y `pantallas`.

**Lo que tiene que conectar el juego:**

1. **En `data/equipos.json`, suma a cada equipo su `bandera` y su `escudo`.** Están en `docs/ejemplos/nekketsu/equipos.json`. Sin eso, Rolos sale con la de Colombia, Maracuchos con la de Venezuela y los escudos con las iniciales.
2. **Los retratos:** no hay nada que conectar. Regeneras el kit y el VS, la selección y la intro ya los usan.
3. **La selección:**
   - `ui_tarjeta_<equipo>` en el lugar del rectángulo de 184 x 104 de hoy.
   - El nombre va en el rectángulo `texto` y las 4 caras en la franja `retratos` (x 12, 52, 92 y 132, y 36 de la tarjeta).
   - La bandera y el escudo ya vienen pintados: deja de dibujar la bandera chiquita.
4. **El menú de pruebas:** `ui_iconos_prueba` es una tira. El cuadro de cada prueba va en `orden`.
   - Tus filas miden 24 de alto, así que el de 32 no cabe en la fila. Dos opciones:
     - **(a)** El de 16 (`iconos_prueba_16`) en el lugar de la bandera de cada fila.
     - **(b)** El de 32 de la prueba elegida, abajo junto al lugar.
   - Me inclino por la (b): el de 16 se lee peor.
5. **El medallero:**
   - `ui_medallas_16` en el círculo dorado de cada prueba ganada.
   - `ui_medallas_32` en la tabla de resultados.
   - `ui_medallas_64` en la final.
6. **El podio final:**
   - `ui_podio` en x -80, en lugar de las dos imágenes de Caracas.
   - Los cajones caen donde ya pones a los atletas: 1 en (320, 268), 2 en (240, 284), 3 en (400, 296).
   - Las banderas suben por `mastiles`, de `abajo` a `arriba`. Usa `bandera_<id>_32_ondea`.
7. **El VS de 4:**
   - `ui_marco_vs_4` en x -80.
   - Los retratos `grande_enojo` van en `huecos`: los dos primeros de un equipo y los dos últimos del otro.
   - La palabra VS en `vs`, el nombre de la prueba en `texto` y los nombres en la fila `nombres`.
   - Hoy tu VS muestra 2. Para mostrar 4 hay que tocar `vs()` en `Fight.ts`.
8. **Las pantallas,** todas en x -80. Tus textos ya caen en la franja tranquila.
   - **Pausa:** `ui_pantalla_pausa` en vez del velo negro al 0,6. Está tramada: la pelea se ve por los huecos.
   - **Derrota:** `ui_pantalla_se_acabo`.
   - **El "¿OTRA PARTIDITA?":** si lo separas en su propia pantalla, `ui_pantalla_otra_partidita`.

## Pruebas

- **Prueba nueva `g2.test.ts`, 12 casos:**
  - **Los retratos:**
    - Los 24 atletas en las 8 expresiones, a 96 x 96 y distintas entre sí.
    - El contorno de afuera es de un pixel. Con el x3 de antes esa medida daba 0. Ahora pasa de 0,3 en todos: los de pelo casi negro, como Toto y Lan, son los más bajos porque el pelo es del tono del contorno.
  - **Las medallas:** 3 tamaños con 3 metales distintos, la cinta arriba y el disco abajo.
  - **Las banderas:**
    - Las 6 en 2 tamaños, con 8 cuadros distintos al ondear.
    - Los colores están en su sitio: Colombia, Bogotá, Japón, Vietnam, el azul y el negro del Zulia, y las estrellas blancas de Venezuela.
  - **El podio:** los cajones caen donde el medallero pone los pies, los mástiles están enteros y arriba queda libre para el título.
  - **Los íconos:** los 18 en 32 y en 16, distintos, con el atleta adentro.
  - **Las tarjetas:** 6 tarjetas y 6 escudos, la bandera de cada equipo y la franja de las caras más oscura.
  - **Las iniciales y la bandera por defecto,** y la validación de `bandera` y `escudo` con sugerencias.
  - **El VS de 4:** dos huecos a cada lado de la costura, sin chocar con la palabra VS.
  - **Las pantallas:** la pausa tramada y las otras dos llenas.
  - **El kit a medida:** las piezas salen en `manifest.ui.interfaz` con su archivo, y se pueden pedir sueltas.
- **`frameData.test.ts`:** la prueba de los retratos ahora pide que el grande ya no sea de bloques de 3 x 3.
- **El esquema** `docs/kit-a-medida.schema.json` está regenerado: la lista de piezas de `ui.interfaz`.
- **`ui_audio.test.ts`:** las dos pruebas de G1 que contaban 8 piezas ahora saben de las 15.
- **`custom.test.ts`:** el conteo de PNG suma las 46 piezas del envoltorio. 15 de 15 en 218 s, por debajo del límite de 300.
- **La suite sin `custom.test.ts`:** 51 archivos, 523 de 523.
- **`tsc` limpio, `npm run build:sitio` limpio y e2e de Playwright 50 de 50.**

## Para aprobar (todo en esta carpeta)

- **`retratos_antes_y_despues.png`:** los 24 en enojo, la cara del VS. A la izquierda el x3 de hoy y a la derecha el nuevo.
- **`retratos_expresiones.png`:** las 8 expresiones de un capitán de cada equipo.
- **`vs_de_4.png`:** el VS de 4 armado con Rick, Sophie, Kenji y Ryu, los nombres y la palabra VS.
- **`tarjetas_seleccion.png`:** las 6 tarjetas como en tu selección, con las caras y el nombre corto.
- **`escudos.png`:** los 6 escudos solos.
- **`podio.png`:** el podio con Rick, Kenji y Minh arriba y las banderas subidas. `podio_solo.png` es la pieza sola.
- **`iconos_prueba.png`:** los 18 íconos en 32, y abajo los de 16.
- **`medallas_y_banderas.png`** y **`banderas_ondeando.gif`**.
- **`pantallas_retro.png`:** las tres pantallas con tus textos donde los pone el juego.

Qué mirar:
- Que los retratos ya no se vean gruesos y que cada uno se siga pareciendo a su sprite.
- Que los escudos se lean.
- Que el podio y el VS se sientan del juego.

## Decisiones que tomé sin preguntar

1. **Todo va en `ui.interfaz`, no en una sección nueva.** El juego ya carga solo cada pieza de `ui.interfaz` como `ui_<id>`, así que no hay que tocar el cargador.
2. **El podio, el VS y las pantallas miden 800 x 360 y no 640.** Pediste el podio a 640, pero tus escenas fijas ya van de -80 a 720 en el iPhone. Así no quedan bordes vacíos. La parte de 640 va de x 80 a 720, como las canchas.
3. **Hice 8 expresiones, no 7.** La octava es `burla`, la del VS del P1.
4. **Los íconos llevan el sprite de un atleta y no una silueta.** Probé las siluetas blancas de las olimpiadas y el chibi no se lee: la cabeza grande se come los brazos. Cada ícono lleva a un atleta distinto, en el orden de los equipos.
5. **El judo, el Kachinuki y la pelea llevan al rival recibiendo,** para que se lea el contacto.
6. **El podio calza con tu medallero de hoy:** los cajones están donde ya pones a los atletas, y arriba queda libre para el título y el marcador.
7. **El VS de 4 es dos contra dos,** azul y rojo como tu VS, partido en diagonal como el de la intro. La costura blanca pasa por el centro de la pantalla y cruza la VS entre la V y la S (la corregí después de que la viste corrida a la izquierda). Su recorrido sale en el manifiesto como `costura`.
8. **La pausa va tramada y no tapada.** Así se ve la pelea congelada detrás, sin alfa, como pide el kit.
9. **"SE ACABÓ LA VAINA"** va de noche bajo la lluvia, en plata como su letra. **"¿OTRA PARTIDITA?"** va en arcade, con rayos, cuadrícula y monedas.
10. **La bandera de Rolos es la de Bogotá y la de Maracuchos la del Zulia.** Eso inferí de tu lista de banderas. Colombia y Venezuela siguen saliendo para las pruebas.

## Límites honestos

- **Los retratos no son arte nuevo hecho a mano:** son el sprite redibujado a 96. Se ven finos y con curvas, pero los rasgos (ojos, boca, peinado) tienen el detalle de la pieza LPC. Lo que antes era un bloque de 3 ahora es una curva, no un rasgo nuevo.
- **El brillo de los ojos** solo sale en los ojos abiertos, y en los iris muy oscuros se nota poco.
- **Los íconos de 16** son los de 32 reducidos sin mezclar colores. Se reconoce el color y la pose, no el detalle.
- **El dragón y la bicicleta de los escudos** son dibujos chicos. En la tarjeta, a 26 de ancho, se leen como forma.
- **Las banderas de 16** son chiquitas. Las 8 estrellas de Venezuela son puntos, y el sol del Zulia no lleva el rayo: el rayo solo sale en la de 32.
- **El VS de 4 y la tarjeta necesitan cambios en el juego:** hoy tu VS muestra 2 caras y tu tarjeta se dibuja con código.

## Lo que necesita el siguiente lote

- **El juego:**
  - Sumar `bandera` y `escudo` a `data/equipos.json`.
  - Regenerar el kit.
  - Conectar las piezas donde dice arriba.
- **Lo que dijiste que viene:** el mapa de la gira y las escenas de la intro, cuando veas los retratos nuevos. C3 cuando liberes los archivos.
