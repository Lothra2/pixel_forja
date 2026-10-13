# Lote E3a: la Comuna 13 de Medellín
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/22
Fecha: 2026-10-13

## Qué se hizo

`medellin_c13` sale completo en la vista inclinada, con las 9 pruebas en verde. Es el primer escenario fuera de Vietnam, así que trae el estilo nuevo **`colombia_ladrillo`**. El layout es el del juego, sin tocar una coma: `docs/ejemplos/nekketsu/escenarios/medellin_c13.layout.json`.

| Tramo (x) | Del concepto | Cómo quedó |
|---|---|---|
| Estación San Javier (0 a 520) | La entrada del metro, el carrito de mango biche, el metrocable | <ul><li>La estación de concreto y vidrio con el letrero SAN JAVIER y la M verde.</li><li>El letrero METROCABLE LÍNEA J y la torre del cable.</li><li>El carrito de paletas con su parasol y MANGO.</li><li>La calle con su paso de cebra y los escalones con la franja amarilla.</li></ul> |
| La subida de los grafitis (520 a 1150) | El mural largo con la cara, el colibrí, la mariposa y COMUNA 13. Las casas de ladrillo con banderines | <ul><li>El frente de la terraza es el muro corrido de COMUNA 13, con colibríes y mariposas.</li><li>Detrás, el cerro de casas en tres gradas con más murales: el ojo, la cara de perfil con el colibrí y LA 13 ES CULTURA.</li><li>Flores pintadas en el piso y el muro de grafitis que se salta.</li></ul> |
| Escaleras eléctricas y callejón (1150 a 2048) | Los techos naranja sobre columnas grises, el vidrio y el pasamanos. Los tanques negros, la ropa | <ul><li>Los dos tramos de escalera eléctrica, con el peldaño de aluminio, el borde amarillo, el vidrio y el pasamanos negro que sube derecho.</li><li>Los peldaños corren hacia abajo: son vida de 3 cuadros.</li><li>El techo naranja de lámina sobre sus columnas.</li><li>El callejón con su cuneta, el tanque negro, el tendedero de tres cuerdas y el muro de contención con murales.</li></ul> |
| Techos de zinc (2048 a 2820) | Zinc con óxido, antenas, aires, el puente | <ul><li>Láminas de distinta edad con su óxido.</li><li>Abajo, las casas de ladrillo y de repello pintado con ventanas de rejas de colores.</li><li>El hueco entre casas y la pasarela de baranda.</li><li>La antena y el aire encima del techo.</li></ul> |
| La escalera de colores y el mirador (2820 a 3600) | La escalera arcoíris, las letras COMUNA 13, la bandera, el valle abierto | <ul><li>La escalera con las franjas del arcoíris y la contrahuella de color.</li><li>La plaza en adoquín con la reja del borde, bancas y materas.</li><li>Las letras gigantes, cada una de un color.</li><li>La bandera de Colombia que ondea y el mural AQUÍ SE SUEÑA EN GRANDE.</li></ul> |

**Lejos:** el Valle de Aburrá con la cordillera, los cerros llenos de casitas, la ciudad con sus torres y el cable del metrocable. Seis cabinas rojas cruzan por dos cables, ida y vuelta.

**Motor, todo general:**
- **El estilo `colombia_ladrillo`:**
  - Paleta de 24 colores (`colombiaPaleta.ts`) y su ficha de arte con 12 íconos, el dibujo de cada caja y los letreros.
  - Los pintores de `comuna13.ts`.
- **Cajas encima de cajas:** un tanque en la terraza, el aire en el techo, las letras en el mirador. Se dibujan de su base para arriba y van después de la base. Antes la terraza las tapaba.
- **Los postes se paran en la caja que tengan debajo,** como hace el juego en el gris.
- **Los tramos de peldaños seguidos salen como un objeto.** La escalera eléctrica pesaba 30 objetos por pantalla y el máximo es 24. Ahora pesa 16.
- **Dos capas nuevas de vida:**
  - `lejos`: va pegada a la capa lejos y se mueve por su `recorrido`.
  - `objeto`: va encima de un objeto, con su `orden`.
- **Pancartas en el idioma del país:** SALIDA y META en Colombia. En Vietnam siguen XUẤT PHÁT y VỀ ĐÍCH. Si la meta queda arriba de una terraza alta, la pancarta va en dos palos y la línea a cuadros se pinta en el techo de la caja.
- **Un lugar sin arte todavía se salta con aviso, en vez de tumbar el kit.** Lo explico abajo.

## Cómo se usa (estudio y kit)

En el juego no cambia nada de la configuración: `"escenarios": "data/stages/"` ya incluye `medellin_c13`. Al regenerar el kit sale `escenarios/medellin_c13/`.

**Lo que el juego tiene que agregar en `src/events/escenario.ts`:**
1. **Vida de la capa `lejos`** (el metrocable):
   - x e y son pixeles de `lejos.png`.
   - En cada cuadro, `x = desde + (hasta - desde) * ((t / segundos + desfase) % 1)`.
   - Se pinta con `scrollFactor 0`, corrida `cam.scrollX * paralaje` como el tileSprite, y repetida cada ancho de `lejos.png`.
   - Ver el ejemplo en `docs/ESCENARIOS.md`.
2. **Vida de la capa `objeto`** (los peldaños de la escalera eléctrica, la bandera): `setDepth(FT + orden)`, como un objeto, y no -19. Si no, queda detrás de su escalera.
3. **Atleta parado en una caja que está encima de otra** (el tanque, las letras): la profundidad es `FT + orden + 0.5` del objeto de esa caja. Con `y + d` queda detrás de la terraza de abajo. La cuenta está en `ordenCaja()`.
4. **El asta del mirador:** el layout pide `alto: 120` encima del mirador de 144. Así la bandera queda en la fila -60, fuera de la pantalla, y en el gris pasa lo mismo. La dibujo de 30 para que se vea, y el kit lo avisa. **Propongo cambiar el layout a `alto: 30`.**

## Pruebas

- **Las 9 pruebas de `medellin_c13` en verde:**
  - Legibilidad: mediana 8.5:1 y la peor 2.4:1, en la escalera eléctrica.
  - Peso: 16 objetos y 10 piezas animadas en la pantalla más cargada.
  - Paleta: 24 de 24.
- **Prueba nueva `comuna13.test.ts`, 9 casos:**
  - Las 9 pruebas y el aviso del asta.
  - La ficha del estilo.
  - Solo la paleta, sin mezcla.
  - Cajas encima de cajas.
  - Los tramos juntos.
  - Los postes sobre cajas.
  - La vida en `lejos` y en `objeto`, con los peldaños que de verdad cambian.
  - Lo que no tiene arte se salta.
  - La imagen dorada `golden/comuna13_e3a.png`.
- **La prueba 7 ahora mide la silueta parada encima de la caja que tenga debajo.** Antes la medía en el piso, que en la Comuna 13 queda tapado por la terraza.
- **Los 5 tramos de Saigón salen idénticos byte por byte a E2** en todas sus imágenes y archivos. Lo comparé contra la rama de E2. Solo cambia el texto de su `verificacion.md`, por la prueba 7 nueva, y sigue en verde.
- **`custom.test.ts`:** el kit de Nekketsu trae los 6 escenarios, 14 imágenes más.
- **Suite completa:** 24 archivos, 258 de 258. La corrida completa dio 257, con el aviso nuevo del asta faltando en la lista que espera `custom.test.ts`. Lo agregué y esa prueba pasa: 14 de 14.
- **`tsc` limpio, `npm run build:sitio` limpio y e2e de Playwright 44 de 44.**

## Para aprobar (todo en esta carpeta)

- **`conceptos/concepto_vs_c13_calle_grafitis.jpg`, `concepto_vs_c13_escaleras.jpg` y `concepto_vs_c13_mirador.jpg`:** cada concepto arriba y dos postales de PixelForja abajo, con Sophie y Alana. Son JPEG para que pesen poco: el pixel art de verdad está en `postales/`.
- **`mismo_juego.png`:** el hẻm aprobado al lado de cinco pantallas de la Comuna 13. Tienen que verse del mismo juego.
- **`c13_subida.gif`, `c13_escalera.gif` y `c13_mirador.gif`:** Sophie y Alana subiendo, con la cámara, el metrocable cruzando y los peldaños que corren.
- **`postales/`:** el inicio, el medio y el final.
- **`tramo_medellin_c13.png`:** el tramo entero.
- **`ficha_arte.md` y `verificacion.md`.**

### La comparación con los conceptos, sin adornarla

- **Se reconoce sin leer el nombre:**
  - La escalera de colores, las letras COMUNA 13 con la bandera, y el techo naranja de la escalera eléctrica.
  - El ladrillo apilado con tanques negros y rejas de colores.
  - Los murales del ojo, el colibrí y la mariposa.
  - El metrocable sobre el valle.
  - Esos son los 5 o 6 elementos que pedía el LEEME.
- **Queda por debajo del concepto en densidad.** El concepto mete matas, flores y gente en cada rincón. Aquí la geometría del layout pone terrazas de 130 de fondo que ocupan media pantalla. Les puse adoquín, el murito con matas, flores pintadas y la cuneta, pero siguen siendo pisos grandes y tranquilos. **Es a propósito:** es donde corren los atletas, y ahí van limpios.
- **Al lado del hẻm, el hẻm tiene más detalle por pixel en las fachadas.** La Comuna 13 lo compensa con el color de los murales y la variedad de alturas. Se ven del mismo juego: la misma luz, el mismo contorno y la misma escala de pixel.
- **Del concepto no tomé** la perspectiva, el valle enorme de fondo (aquí el cerro lo tapa casi todo y solo se ve en la estación y el mirador), ni la gente: los NPC son el lote C6a.

## Decisiones que tomé sin preguntar

1. **`canal` es el violeta de los murales en la paleta de Colombia.** En Vietnam es el agua. Aquí no hay agua y los murales piden violeta. Así la paleta sigue en 24 colores con los mismos nombres.
2. **Los murales intensos van en el cerro de atrás y en el frente de las terrazas,** que queda debajo de la franja en la pantalla. Los pisos por donde se corre van en gris claro y crema, sin murales.
3. **El metrocable va en un cable horizontal con torres cada 640 px.** Así da la vuelta sin costura cuando la capa lejos se repite. En la vida real sube por el cerro, pero en una capa que se repite no se puede.
4. **El asta se dibuja de 30 y no de 120** (ver arriba). Lo aviso en vez de cambiar el layout del juego.
5. **Arreglé algo de E2 sin que lo pidieran:** el kit se caía entero si `data/stages/` traía un escenario sin arte. Con la carpeta del juego, `caracas_azotea` lo tumbaba y `hoian` salía pintado como Saigón. Ahora los dos se saltan con aviso hasta que llegue su lote.
6. **Los tramos de peldaños se juntan solo para los tipos nuevos** (escalera eléctrica, escalones y escalera de colores). Así Saigón no cambia ni un byte.
7. **La pancarta de la meta va en dos palos parados al fondo del mirador.** A 144 de alto no hay de dónde colgarla.

## Límites honestos

- **El juego todavía no sabe pintar las capas `lejos` y `objeto`.** Hoy pinta toda la vida que no sea `tras_cerca` como si fuera `cerca`. Así, los peldaños que corren quedan detrás de su escalera y no se ven, y **tres cabinas quedarían quietas en el aire en x 1280**. Hasta que agregue lo de arriba, conviene que salte las piezas con `capa: 'lejos'` (es una línea). Lo demás se ve tal cual.
- **Los NPC, el gallo y los perros no van en este lote:** son entidades del juego. Los NPC son C6a y el gallo es C7b. Hoy siguen siendo los monitos grises.
- **Las letras de COMUNA 13 son de la letra de 3 x 5 agrandada.** Se leen, pero no tienen el dibujo de adentro del concepto (la paloma, la cara).
- **La escalera eléctrica no tiene la boca de abajo con el pasamanos curvo** del concepto. A esta escala es una mancha.
- **Una sola hora, la mañana.** Es lo que pide el layout.
- **El tendedero son tres cuerdas a lo ancho del callejón.** El layout lo marca de 0 a 130 de fondo y a 46 sobre el piso: pasa justo a la altura de la cabeza, sirve para agacharse.

## Lo que necesita el siguiente lote

- **C6a, los NPC de la Comuna 13:** bailarines (toprock, molino, reclama), pelados con la pelota, grafitero, músicos y vendedor de paletas, con la sección `npc` del kit que acordamos.
- **El juego:**
  - Las capas `lejos` y `objeto` de la vida.
  - La profundidad de quien se para en una caja encima de otra.
  - El `alto` del asta.
- **Dependencia:** esta rama sale de E2 (https://github.com/Lothra2/pixel_forja/pull/16) y se une después de ese PR.
