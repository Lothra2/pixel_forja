# Lote E3c: Hội An de noche con el Tama-wari
Estado: entregado, pendiente de Rick
PR: (se completa al abrirlo)
Fecha: 2026-10-13

## Qué se hizo

`hoian`, la ciudad vieja de Hội An de noche, donde se juega el Tama-wari, con el layout del juego tal cual. Es el estilo nuevo `vietnam_hoian` y el segundo escenario de noche del motor.

| Capa | Qué lleva |
|---|---|
| Cielo | La noche con estrellas y nubes finas, el mismo cielo de noche de Caracas |
| Lejos (`rio_thu_bon_puente_japones`) | <ul><li>El río Thu Bồn con la orilla de enfrente encendida y sus palmas.</li><li>El puente japonés (Chùa Cầu): los arcos de piedra, la galería de madera prendida con un farol rojo en cada vano, los dos techos de puntas curvas y el templito con su placa.</li><li>La luna llena de la noche de los faroles, con su camino en el agua.</li><li>Los reflejos en rayas que tiemblan y velitas sueltas.</li></ul> |
| Cerca (`casas_amarillas_hoian`, tema `casas_amarillas_faroles`) | <ul><li>A la izquierda se abre el río: el bote amarrado con sus faroles, velitas y el malecón de piedra con bolardos. Por ahí se ve el puente.</li><li>Cuatro casas amarillas de dos pisos con tejas de barro, el alero entre los pisos y la planta baja de madera oscura.</li><li>Los vanos encendidos: tienda de faroles, sastrería, comedor de cao lầu y puertas plegables.</li><li>Un farol en cada puerta y los racimos debajo del alero grande.</li><li>Balcones con los vecinos asomados, buganvilla fucsia y el árbol de la esquina con dos faroles.</li><li>Dos puestos de faroles: uno detrás de la vendedora (x 320 del layout) y otro al final.</li><li>Letreros ĐÈN LỒNG, CAO LẦU y MAY ĐO.</li></ul> |
| Piso | <ul><li>La calle de piedra: losas grandes trabadas, cada una de su tono, con la luz tibia de los faroles debajo de las puertas, los puestos y las cuerdas.</li><li>La acera de losas claras, con pétalos de buganvilla caídos.</li><li>El muelle de tablas adelante (y 84 a 98).</li><li>Debajo de la franja, el canto del muelle con sus pilotes y el río de adelante con las velitas en flores de papel.</li></ul> |
| Objetos | <ul><li>Los dos postes del Tama-wari en x 110 y 530: caña de bambú con nudos, trípode amarrado, el yugo arriba con el gancho de la bola y el collar del color del equipo con cintas de colores.</li><li>Las dos bases `base_poste`: cajón de madera lleno de piedras.</li><li>Los dos `poste_faroles` con su cruceta.</li><li>Las `cuerdas_faroles` de poste en poste sobre la calle.</li></ul> |
| Vida | <ul><li>`faroles_meciendose`: los faroles de las cuerdas y de los dos postes, 4 cuadros.</li><li>`velitas_rio`: las velitas de adelante titilan, 3 cuadros.</li><li>`botes_con_faroles`: el bote amarrado se mece y otro cruza lejos por el río.</li><li>`publico`: los vecinos de los balcones levantan los brazos, los abanicos y los celulares.</li></ul> |
| Luces | 10: tres faroles de puerta, los dos puestos, los dos postes de faroles y tres faroles de las cuerdas, con latido |

**La bola no la pinta el poste.** Es la entidad `npc` `bola_tama` del layout y la pone el juego con el efecto del kit (4 estados de daño). El poste deja el sitio: el yugo trae un `gancho` en `objetos.json` y ahí va el ancla de la bola (16, 0). Debajo de donde termina la bola van el collar y las cintas.

**Motor, todo general:**
- **El estilo `vietnam_hoian`:** se elige por `paralaje.cerca: "casas_amarillas_hoian"`, solo de noche, con ficha de 12 íconos y sus letreros. A otra hora queda `pendiente` y dice "todavía no tiene arte de manana (hoy pinta: noche)".
- **La noche de `paletaVietnam` es la de Hội An.** Las otras horas devuelven lo mismo de antes. Comparé los 7 escenarios que ya estaban, archivo por archivo: Saigón, la Comuna 13 y Caracas salen idénticos byte a byte.
- **El `gancho` de un objeto** (nuevo en `objetos.json`): dónde va el ancla de lo que el juego cuelga ahí.
- **Las cuerdas de faroles** van de poste en poste, entre los postes que caen en su rango, a la altura del `bajo` o a la del poste si es más bajo.
- **Una prueba que se juega en el sitio** (`prueba: "tamawari"`): `salida` y `meta` son el lado de cada equipo, así que no van pancartas ni la línea de meta.
- **Un mundo de una pantalla** saca las postales a 0, 2 y 4 segundos, como la arena de Caracas.
- **La vida que va encima de lo pintado no queda doble:** el bote y los vecinos son un recorte de la capa pintada en cada cuadro, y con `faroles_meciendose` las cuerdas y los postes van sin faroles (los pone la vida).
- **Pisos propios por lugar:** la azotea de Caracas tenía su baldosa. Ahora un lugar puede traer su `baldosa`, su `acera` y su `madera`.

## Cómo se usa (estudio y kit)

El layout del juego va tal cual en `docs/ejemplos/nekketsu/escenarios/hoian.layout.json`, sin cambiar nada. El kit lo genera con los demás escenarios:

```
npm run escenario -- docs/ejemplos/nekketsu/escenarios/hoian.layout.json salida/ --postales --ficha
```

**El juego:**
- **Capas:** lee `escenario.json` como en los otros. La franja es la de la pelea (246 a 344), el mundo mide 640 y 674 pintado con la inclinación.
- **La bola de cada poste:**
  - El ancla de `bola_tama` (16, 0) va en el `gancho` del poste: (127, 125) y (547, 125), que es x + 0.35 * y y franja.atras + y - z de la entidad.
  - El poste tiene `orden` 48.5, antes que la bola (que va en su y, 49) y antes que su base (55), que le tapa el pie.
  - El collar sale del `equipo` de la entidad `npc` que está en la x del poste: `familia_gg` azul y `instituto_nekketsu` rojo.
- **Vida:**
  - `faroles_cuerda_0` es de capa `objeto` con orden 98.05, encima de las cuerdas.
  - `faroles_poste_0` y `_1` son de capa `objeto` con orden 2.05, encima de su poste.
  - `velitas_rio` es de capa `objeto` con orden 118: el río de adelante, debajo de los pies de todos.
  - `bote_rio` y `publico_0` y `_1` van en la capa cerca.
  - `bote_lejos` va por la capa lejos con su `recorrido`.
- **Luces:** las que traen `latido` respiran con ese período.
- **Partículas:** pétalos con `petalo_buganvilla` y brillos en el río de adelante.

## Pruebas

- **Prueba nueva `hoian.test.ts`, 11 casos:**
  - Pasa las 9 pruebas, sin avisos, con la ficha `vietnam_hoian` de noche, sus 12 íconos, sus letreros y su vida.
  - La paleta de Saigón no cambia: cada hora devuelve la misma de antes, solo la noche es la de Hội An, y los tramos de Saigón siguen con el estilo `vietnam`.
  - Hội An de mañana queda pendiente y dice qué horas hay.
  - Los postes en x 110 y 530: el gancho en (127, 125) y (547, 125), el pie en el piso, el orden antes que la bola y la base, el collar azul y el rojo, y el gancho en `objetos.json`.
  - El Tama-wari no lleva pancartas ni línea de meta.
  - Las cuerdas: los faroles se mecen en la vida y el objeto queda sin faroles. Sin la vida, van quietos en el objeto.
  - La vida, pieza por pieza: el cuadro 0 calza pixel por pixel con lo pintado y los otros cambian.
  - Las luces, todas prendidas y sin pasarse de 12.
  - El puente cae en la fila 135 o más abajo, la luna está y la piedra está seca.
  - Las postales van a 0, 2 y 4 segundos.
  - La imagen dorada `golden/hoian_e3c.png`: Hội An a los 0 y a los 3 segundos.
- **`custom.test.ts`:** el kit de Nekketsu trae 8 escenarios, Hội An con 8 PNG. 15 de 15, en 223 s (con otros agentes corriendo en la máquina).
- **Las pruebas de escenarios** (`hoian`, `caracas`, `comuna13`, `oblique` y `vehiculos`): 67 de 67.
- **`tsc` limpio y `npm run build:sitio` limpio:** el kit del sitio sale con `hoian`, 14 archivos y 9 pruebas en verde.
- **Suite completa: 34 archivos, 356 de 356.** `npm run build:sitio` limpio y e2e de Playwright 50 de 50.
- La prueba "audio del juego" del e2e fallaba a veces, también en `main`. Le porté el arreglo de una línea de la rama de C5 (una carrera del estudio con la voz en blips): pasó 16 de 16 repetida.

**Las 9 pruebas de `hoian`** (`verificacion.md`):
- **Legibilidad:** contraste mediano 4.0:1, el peor 2.5:1. La piedra va en pardos medios, tibios por la luz, y la planta baja detrás de los atletas va encendida.
- **Peso, en la pantalla:** 8 piezas animadas (máx 16), 10 luces (máx 12) y 9 objetos.
- **Paleta:** los 24 colores.

## Para aprobar (todo en esta carpeta)

- `conceptos/concepto_vs_hoian.jpg`: el concepto arriba y Hội An abajo, con el Tama-wari.
- `hoian_tamawari.gif`: 6 segundos.
  - Sophie trepa el poste rojo del Instituto y le pega a la bola, que se raja.
  - Kenji la jala por la pierna, Alana cuida la bola azul de la Familia y Rick corre a ayudar.
  - Se ven los faroles que se mecen, las velitas, el bote y los vecinos.
  - Las bolas son las del efecto `bola_tama` del kit, con la copia azul para la Familia como la hace el juego.
- `hoian_x2.png`: Hội An vacío, ampliado.
- `mismo_juego.png`: el hẻm aprobado, la azotea de Caracas y Hội An, con atletas y vacío.
- `postales/`: a 0, 2 y 4 segundos.
- `ficha_arte.md` y `verificacion.md`.

## Decisiones que tomé sin preguntar

1. **El río va adelante y por la izquierda.** En el concepto el río está a la izquierda y la calle se va hacia el fondo. El layout pone el muelle adelante (y 84 a 98) y las casas atrás. Entonces:
   - el río corre debajo del muelle, con las velitas.
   - a la izquierda, antes de las casas, se abre el río hacia el fondo y ahí se ve el puente japonés.

   Así están los cinco elementos del concepto: las casas, los faroles, los puestos, el río con velitas y botes, y el puente.
2. **El poste no pinta la bola** y trae el `gancho` para colgarla. La bola ya es del juego (entidad `npc` y efecto del kit). Si la pintara el poste, la bola rota y la entera quedarían una encima de otra.
3. **El poste se mide desde el piso,** aunque esté parado en su base: la punta queda en z 170, donde está la bola. Va antes que la base, que le tapa el pie, como si la caña entrara al cajón.
4. **El collar toma el color del equipo de la bola** que tiene encima: azul la Familia y rojo el Instituto, como pide el LEEME. Las cintas son de muchos colores, como en el concepto.
5. **Sin pancartas ni línea de meta en el Tama-wari.** El layout trae `salida` en x 60 y `meta` en x 580, pero no es una carrera.
6. **La luna llena.** El festival de los faroles de Hội An es la noche de luna llena (el 14 de cada mes lunar). Va en la capa lejos, arriba del puente. Con el zoom de la pelea queda fuera de la cámara, pero en las postales le da el ambiente.
7. **La piedra está seca.** En Caracas el piso mojado refleja el neón. Aquí la calle no se moja y la luz de los faroles cae en manchas tibias.
8. **El público son los vecinos de los balcones,** de pixel art propio y chiquito, como el de Caracas. `publico` no era una vida general del motor: en Caracas es el de las azoteas. Los sprites del público del kit son muy grandes para un balcón.
9. **La ranura `velitas_en_el_rio` (capa frente) se pinta en el río de adelante,** debajo del muelle. Con la vista inclinada, la capa frente queda vacía en todos los escenarios: lo de adelante va en el bordillo.
10. **Los letreros son reales y sin marcas:** ĐÈN LỒNG (faroles), CAO LẦU (el plato de Hội An) y MAY ĐO (sastrería, Hội An es famoso por sus sastres).
11. **El estilo se elige por `paralaje.cerca`.** El juego no tiene un campo de estilo. `casas_amarillas_hoian` es el fondo de Hội An, así que con eso basta.
12. **Las cuerdas se amarran al alto del poste de faroles** (z 110) y a z 124 en los del Tama-wari. El layout pide z 124 y los postes de faroles miden 110.

## Límites honestos

- **Solo de noche.** `vietnam_hoian` no sabe pintar otra hora.
- **El dibujo es de una pantalla.** Las casas, el río de la izquierda, los puestos y las manchas de luz del piso están puestos para un mundo de 640. Un layout más largo con este fondo estira la última casa hasta el final.
- **La bola es la del kit:** roja con bandas doradas, con 4 estados. El concepto tiene una bola azul con olas y otra roja con un dragón. Esas dos bolas pintadas serían otro lote de efectos.
- **Con el zoom de la pelea, la punta del poste y la bola caen debajo del marcador** (la bola ocupa las filas 125 a 154 y el marcador tapa hasta la 138). El alto 170 es del juego y no lo cambié. Si molesta, el juego puede bajar el marcador en el Tama-wari o subir la cámara.
- **Solo se mecen los faroles de las cuerdas y de los postes.** Los de las puertas, los racimos y los puestos están quietos. Las cintas del poste también.
- **Las velitas titilan pero no bajan con el río.** El bote de lejos cruza solo por donde se abre el río, a la izquierda.
- **No es la perspectiva del concepto.** La calle va de lado, con las casas en fila, como pide la vista inclinada del juego. El concepto pone la calle en diagonal.
- **La vendedora de faroles no tiene sprite en el kit.** Es una entidad `npc` del layout, pero ningún lote la dibujó todavía. El puesto de atrás ya está.
- **El GIF usa el kit generado con los packs de hoy** (`trepar` de B3). Sophie trepa con `climb_pole` y pega con `pole_punch`, y la mano calza con el poste a ojo.

## Lo que necesita el siguiente lote

- **El juego:**
  - Conectar el arte a la escena del Tama-wari: colgar cada bola en el `gancho` de su poste y usar el `orden` de `objetos.json`.
  - El pack `trepar` de B3 ya está para subir el poste.
  - Decidir el marcador o la cámara para que se vea la bola entera.
- **Un lote de efectos (si Rick lo quiere):** las dos bolas del concepto, la azul con olas y la roja con el dragón, con sus 4 estados, y un sprite para `vendedora_faroles`.
- **Dependencia:** esta rama sale de `main` con C7b ya unido.
