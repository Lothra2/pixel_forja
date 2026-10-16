# Lote familia: los cinco luchadores con movimientos SF2 completos, cinco ciudades, intro, logo y sonido
Estado: entregado, pendiente de Rick
Rama: claude/pelea-familia
Fecha: 2026-10-16

## Qué se hizo

Rick pidió esto antes de dormirse:
- "me le faltan muchos movimientos a Sophie, no lanza puños, no lanza patadas abajo";
- "quiero algo más épico, más premium", "fluidez y no corte de imágenes";
- "todos los personajes deben tener movimientos perfectos para todo lo que hagan";
- "música, sonido de golpes, mejores poderes y dinámica cuando golpeas".

### 1. Movimientos completos para los cinco, con sus cuadros intermedios

Antes cada golpe era una sola pose y el motor la estiraba. Por eso se veía cortado.

Ahora cada movimiento se pidió a Higgsfield como **una hoja de 3 a 6 cuadros seguidos**, con la guardia del personaje como referencia. Los cuadros de una misma hoja salen parejos: mismo tamaño, misma ropa, misma luz. Así el movimiento tiene sus intermedios de verdad: la carga, el golpe estirado y la vuelta.

Cada uno tiene 31 animaciones, las del contrato del juego:

| Grupo | Animaciones |
|---|---|
| Moverse | guardia que respira (4 cuadros), avanza y retrocede (6 cuadros cada una), agacharse, agachado, salto, salto adelante con voltereta |
| Defender | bloqueo de pie y agachado |
| Pegar de pie | puño débil, puño fuerte, patada débil, patada fuerte |
| Pegar agachado | puño débil, puño fuerte hacia arriba, patada baja, barrida que tumba |
| Pegar en el aire | puño y patada |
| Recibir | golpe alto, golpe bajo, en el aire, caída, levantarse, mareo |
| Poderes | tres por luchador, con su proyectil cuando lo tiene |
| Ganar | intro de round y victoria |

En total son 125 hojas y unos 560 cuadros.

### 2. Los poderes

| Luchador | Poder 1 | Poder 2 | Súper |
|---|---|---|---|
| Rick | Onda (bola azul) | Embestida (carga con el hombro) | Súper Onda (bola gigante con rayos) |
| Sophie | Ráfaga de Hojas (remolino de hojas) | Mil Patadas | Furia de la Selva (ola de enredaderas y flores) |
| Alana | Estrella Mágica (estrella arcoíris) | Giro de Princesa | Corona Estelar (cometa con corona) |
| Steph | Jonrón (pelota en llamas) | Voltereta Loca | Tornado de Bate |
| Thor | Súper Ladrido (ondas sónicas) | Rayo Veloz | Aullido Trueno (ola de rayos) |

Sophie quedó con poderes de naturaleza, como pidió Rick.

Los proyectiles y las chispas también son pixel art de Higgsfield, recortados por brillo:
- chispa de golpe;
- chispa de bloqueo;
- polvo;
- estrellas de mareo.

### 3. Cada luchador con su ciudad

| Luchador | Escenario |
|---|---|
| Rick | Caracas, con el Ávila y su cruz |
| Sophie | Ho Chi Minh, con el río y la Bitexco |
| Steph | Bogotá, con Monserrate |
| Thor | Japón, con el castillo |
| Alana | El Reino Celestial (nuevo) |

El Reino Celestial tiene:
- un planeta con anillos, auroras y un palacio de cristal sobre islas flotantes con cascadas;
- un mar de nubes y una baranda de jade con lámparas de cristal;
- un piso de mármol con una estrella dorada.

Los extras que se mueven:
- faroles que suben;
- mariposas de luz;
- una estrella fugaz;
- una isla que flota;
- una grulla;
- pétalos rosados.

### 4. Intro, logo, selector y pantallas

- **Intro de 10 segundos:** Rick y Steph en la azotea de Caracas, la onda azul contra el bate y un choque con destello blanco. Al final el anunciador dice "Street Family Fighter Two!".
- **Logo en pixel** con el escudo de la familia y la huella de Thor.
- **Retratos grandes** estilo selector de SF2 para los cinco, en 160 x 160.
- **Fondos del título y del VS:** la familia completa en la azotea al atardecer, y Rick contra Steph.

### 5. Música y sonido

La música y los efectos los sintetiza el motor con código. Las herramientas de música de Higgsfield solo sirven dentro de su propio flujo de juegos, así que no las usé.

| Pieza | Estilo |
|---|---|
| Caracas | rock con arpa llanera |
| Ho Chi Minh | đàn tranh que dobla la cuerda |
| Bogotá | cumbia con acordeón y guacharaca |
| Japón | koto con taikos |
| Reino Celestial | campanitas mágicas |
| Título, selector, VS y victoria | fanfarria |

Los efectos de golpe:
- golpe débil (3 variantes), fuerte (3) y súper;
- bloqueo, silbidos de aire, barrida, salto, aterrizaje, caída, K.O., mareo;
- un sonido por poder, la barra llena y el choque de proyectiles.

**El anunciador** es una voz de Higgsfield con eco de arcade:
- Round one, two, three y Final round;
- Fight, K.O., Perfect, You win, You lose, Time over y Double K.O.

### 6. El juego (la otra sesión, Street_Family_Fighter_2)

**Link jugable:** https://claude.ai/artifact/Je7HZu69eZz93MZmHsycsX (es el mismo de siempre, ya actualizado).

El Lote D del juego ya tiene todo este arte:
- PR: https://github.com/Lothra2/Street_Family_Fighter_2/pull/4, encima del Lote C (PR #3);
- los cinco quedaron balanceados con vida y daño por luchador, y ganan entre el 41 y el 58 % en 240 peleas por par;
- usa los efectos, el logo, los fondos, el video, la música y las voces.

Lo verifiqué yo:
- corrí sus 57 pruebas y pasan;
- el build sale bien;
- lo probé con Playwright en iPhone (844x390), Galaxy S23 (780x360) e iPad (1180x820) sin errores;
- se ven el selector con los retratos nuevos, el VS, la pelea en cada ciudad, las chispas, el polvo y el súper.

Lo que hizo el juego antes, en su Lote C (PR #3):

Lo que hizo el juego en su Lote C:
- el selector estilo SF2;
- toque corto para débil y largo para fuerte, según la postura;
- hitstop por fuerza, chispas, sacudida y súper con oscurecido;
- combos, mareo, K.O. en cámara lenta y saltos de 3 tipos;
- la pantalla ajustada a iPhone, Galaxy S23 y tablets.

Ahora recibe todo este arte.

## Cómo se hizo (para repetirlo)

1. `scripts/luchador_pixel/fiel/sf2_plan.py`: el plan de las 125 hojas.
2. `sf2.py` saca los cuadros de cada hoja:
   - separa los cuadros, cortando por el valle de columnas si un pie toca el cuadro de al lado;
   - mide la escala con la cara de la guardia nueva;
   - controla esa escala con la altura que se espera de cada pose;
   - pasa todo a la paleta del luchador (64 tonos).
3. `sf2_juego.py`: lo lleva al contrato del juego:
   - tiempos y fases por cuadro;
   - cajas medidas sobre el pixel: la que pega va donde está de verdad el puño, el pie, el bate o la varita;
   - avance en las embestidas y proyectiles;
   - escenarios, logo, video y audio.
4. `sf2_ver.py`: un GIF y una lámina con cajas por luchador, para revisar.

## Créditos

| Qué | Créditos |
|---|---|
| 125 hojas de movimientos y efectos, más 3 reintentos de Steph | 128 |
| Mundo celestial (maestra, 6 capas y extras) y 2 logos | 2,75 |
| 5 retratos grandes | 5 |
| 3 cuadros clave del intro | 3 |
| Video del intro (Grok) | 45 |
| Voces del anunciador | 1,3 |
| **Total** | **unos 185 de los 400** |

Lo que no se cobró:
- **AutoSprite** falló otra vez: es la tercera vez y devolvieron los créditos. No lo intenté más.
- **MiniMax rechazó tres veces el video del intro** por su filtro de contenido y devolvió los créditos. Con Grok salió a la primera.

## Para aprobar

1. Abrir el link del juego en el iPhone en horizontal y jugar con los cinco.
2. Ver el intro, el selector y cada ciudad.
3. Decir qué movimiento se ve raro, para rehacer esa hoja sola.

## Límites honestos

- **Las caras cambian un poco entre hojas.** Dentro de una hoja son iguales, pero entre el puño y la patada puede variar un detalle. No se nota en movimiento.
- **Thor es el que menos calza en tamaño entre hojas.** Su cara de perro casi nunca se reconoce, así que su escala sale por la altura de cada pose.
- **Las voces del anunciador están en inglés,** como en SF2.
- **El retrato de Steph es atrevido,** como el diseño que se pidió (inspirado en Harley). Si se prefiere más tapado para jugar con las niñas, se rehace por 1 crédito.
- **El balance de daño y tiempos lo ajusta el juego** cuando pruebe las peleas con todo el arte.
