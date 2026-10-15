# Lote intro: las escenas de la intro con los retratos nuevos
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/53
Fecha: 2026-10-15

## Qué se hizo

Es la segunda mitad del punto 2. La primera, el mapa mundial con la ruta del avión y los sellos, va en Lothra2/pixel_forja#52.

**Las escenas**, del pedido de G2: "Kenji en la azotea de espaldas, Bogotá con lluvia y buseta, Maracaibo con calor, desayuno de la Familia GG en Saigón (mesa, café sữa đá, arepas)".
- Todas miden 800 x 360, con la parte de 640 de x 80 a 720, como el podio y el VS.
- Van en `ui.interfaz` como la parte nueva `intro`.

| Pieza | Qué es |
|---|---|
| `intro_azotea` | **La azotea del instituto en Tokio al atardecer:**<br>• el cielo en bandas de violeta a naranja y el sol grande con rayas de arcade, bajando entre la ciudad;<br>• la Torre de Tokio roja y blanca y la Skytree;<br>• la reja de rombos, el tanque de agua y la caseta de la escalera con su letrero verde;<br>• el piso de concreto con sus juntas hacia el sol |
| `intro_espaldas` | **Kenji de espaldas, de 125 x 153:**<br>• redibujado a 3 desde su cuadro de 64, con el mismo Scale3x por material y el contorno del retrato grande;<br>• el gakuran echado sobre los hombros ondea a la derecha: los pliegues corren con el viento y el ruedo se levanta;<br>• la manga de la derecha vuela y la de la izquierda cuelga con el brazalete rojo;<br>• 4 cuadros en bucle, y respira con su `idle` |
| `intro_bogota` | **Bogotá en la tarde con lluvia:**<br>• Monserrate con su iglesia en la neblina, la misma capa lejos de la cancha de tejo de La Candelaria;<br>• la cuadra de tiendas con toldos de rayas y avisos, y los edificios de ladrillo a la vista enmarcando la toma;<br>• el andén, el asfalto mojado con reflejos y charcos, la chaza del vendedor con su sombrilla y el poste;<br>• **la buseta:** blanca con franjas verde, amarilla y roja, gente en las ventanas, la puerta y el letrero de ruta amarillo |
| `intro_bogota_lluvia` | **La lluvia, aparte y transparente:** rayas finas en diagonal y gotas que salpican en la calle, en 4 cuadros que dan la vuelta sin costura |
| `intro_maracaibo` | **Maracaibo al mediodía con calor, en 4 cuadros:**<br>• el cielo blanco y el sol que quema con un halo que late y rayos que giran;<br>• el lago lechoso con brillos, el puente Rafael Urdaneta con sus torres y tirantes en la calina, y los balancines que cabecean;<br>• el malecón con la baranda, las palmeras con sus cocos y el carrito de raspados con sus cinco sabores y su sombrilla;<br>• el horizonte y la calle reverberan, y las palmeras y el carrito no |
| `intro_desayuno` | **El desayuno en un apartamento de Saigón:**<br>• la pared verde clarito y la ventana grande con la reja de flores, con Saigón amaneciendo afuera, la capa lejos del parque Tao Đàn con la Landmark 81 y el Bitexco;<br>• las cortinas, el calendario de hojas rojo, la repisa con las latas de café y la foto con la bandera de Venezuela;<br>• la mata y el zócalo de baldosas |
| `intro_desayuno_mesa` | **La mesa de adelante, en 4 cuadros:**<br>• un café sữa đá frente a cada uno, con la leche condensada abajo, el café, el hielo y el phin encima goteando;<br>• el plato de arepas con sus rayitas de plancha echando humito, el mantelito de cuadros, el pan y el azúcar;<br>• arriba de la mesa es transparente |

**Con los retratos nuevos:**
- **El desayuno** tiene 4 `huecos` de 96 para la familia, sentada detrás de la mesa. Los retratos van entre el fondo y la mesa, que les tapa los hombros.
- **Bogotá** trae 4 `huecos` para presentar a un equipo rival, como los Rolos: primero en silueta y después de color, como prometía el README de la intro.

**Lo que sumé al motor:**
- **`aTres`:** el redibujado a 3 del retrato grande sale a una función, para cualquier recorte del cuerpo. El retrato grande la usa y sale igual byte por byte. Lo comprobé con la huella de los 24 atletas en las 8 expresiones, chico y grande.
- **Bogotá y el desayuno reusan las capas lejos que ya existían:** Monserrate con llovizna y Saigón amaneciendo. Así se ven igual que en sus escenarios.

## Cómo se usa (estudio y kit)

**En el kit:** la parte `intro` sale con `"interfaz": true`. El atleta de espaldas se elige en `kit.config.json`, y ya está en el ejemplo de Nekketsu:

```json
"ui": { "interfaz": true, "intro": { "espaldas": "kenji" } }
```

- Sin `espaldas`, salen las escenas sin el atleta.
- Si el id no existe, el kit lo dice con la sugerencia.

**Lo que tiene que conectar el juego en `Intro.ts`:**
- **`azotea`:**
  - cambia `bg_japon` por `ui_intro_azotea` en x -80;
  - a Kenji ponlo con `ui_intro_espaldas` animado, con su `ancla` en `pie` menos 80. Queda en (380, 334) de la parte de 640, mirando el sol;
  - la caja de diálogo va con `arriba`, para no taparle las piernas.
- **Bogotá y Maracaibo:** son tomas nuevas para cuando el avión llega a cada país, o para presentar a los rivales.
  - Encima de Bogotá va `ui_intro_bogota_lluvia`.
  - En `huecos` van los retratos del equipo: con `setTintFill(0x14101e)` en silueta, y sin tinte cuando se revelan.
- **`familia`:** el desayuno puede abrir la toma antes de que los hermanos salgan a la calle.
  - El orden de capas es `ui_intro_desayuno`, los cuatro `retratos:<id>` con `grande_feliz` en `huecos`, y encima `ui_intro_desayuno_mesa` animado.
  - Si hablan, el retrato que habla cambia de cara.

**El conteo:** son 7 PNG en `ui.interfaz`, que el juego empaqueta. El artifact sigue en 500.

## Pruebas

- **Prueba nueva `intro.test.ts`, 6 casos:**
  - **Los fondos:** miden 800 x 360 y no tienen un solo pixel transparente.
  - **El atleta de espaldas:**
    - mide más de 120 de alto y sus 4 cuadros son distintos;
    - el pie cae en el `ancla` y no hay nada debajo;
    - la tela vuela a la derecha del cuerpo en todos los cuadros.
  - **La lluvia:** transparente y fina, en 4 cuadros distintos.
  - **Maracaibo:** 4 cuadros distintos, y el cielo de arriba a la izquierda queda quieto.
  - **El desayuno:**
    - los 4 huecos de 96 están en la parte de 640;
    - la mesa les tapa al menos 8 filas de hombros y deja las caras libres;
    - la mesa tapa el medio.
  - **El kit a medida:** sale con y sin el atleta de espaldas, y da el error de un id que no existe.
- **`custom.test.ts`:** el conteo de PNG sube 7. El esquema de `kit.config.json` trae `ui.intro`.
- **`ui_audio.test.ts`:** sumé `intro` a la lista de partes del mensaje de error.
- **La suite sin `custom.test.ts`:** 54 archivos, 542 de 542.
- **`custom.test.ts`: 15 de 15,** con el kit generado en 252 s, por debajo del límite de 300.
- **`tsc` limpio, `npm run build:sitio` limpio y e2e de Playwright 50 de 50.**

## Para aprobar (todo en esta carpeta)

- **`azotea.png` y `azotea.gif`:** la azotea con Kenji y el gakuran al viento.
- **`bogota.png` y `bogota.gif`:** Bogotá con la lluvia encima.
- **`bogota_rivales.png`:** arriba, los Rolos en silueta en los `huecos` de Bogotá. Abajo, los mismos ya revelados, con la cara de burla.
- **`maracaibo.png` y `maracaibo.gif`:** el calor, con el sol que late, los balancines y la reverberación.
- **`desayuno.png` y `desayuno.gif`:** la familia en el desayuno con sus retratos de 96 felices, el phin goteando y el humito de las arepas.

Los PNG van a x2 y los GIF a tamaño real.

Qué mirar:
- que Kenji de espaldas se lea como el chamo duro del instituto;
- que la lluvia de Bogotá y el calor de Maracaibo se sientan;
- que el desayuno se vea como la casa de la Familia GG en Saigón.

## Decisiones que tomé sin preguntar

1. **El gakuran sobre los hombros, como capa,** y no el que lleva puesto. Es la imagen clásica del banchō de espaldas, y una chaqueta puesta no ondea.
2. **Kenji a 3 desde su sprite, con el redibujado del retrato,** y no dibujado a mano. Así es el mismo personaje del juego y sale de su ficha.
3. **El atleta de espaldas sale de la configuración,** no fijo en Kenji. Es una capacidad general del kit.
4. **Las personas no van pintadas en los fondos.** Van los `huecos` y los puntos de los pies, y el juego pone los retratos y los sprites. Así cambian de cara, se revelan o caminan.
5. **Lluvia y mesa en capas aparte:** la lluvia va encima de todo y la mesa encima de los retratos.
6. **Reusé las capas lejos de Monserrate y de Saigón amaneciendo.** Las de Maracaibo son de noche, así que el lago de día lo pinté nuevo.
7. **Agregué el carrito de raspados en Maracaibo** y la chaza en Bogotá, para que cada ciudad tenga su cosa de la calle.

## Límites honestos

- **El gakuran es una capa pintada encima,** no tela simulada. Los 4 cuadros mueven pliegues, ruedo y manga, y se ve que ondea, pero no es una animación hecha a mano.
- **El pelo de Kenji no se mueve con el viento.**
- **La Torre de Tokio y la Skytree son siluetas simples.**
- **La buseta es de lado y sin letrero escrito.** El aviso de la ruta es una placa con rayitas, y si quieres "CHAPINERO" lo escribe el juego encima.
- **El puente de Maracaibo va lejos y en la calina:** se reconocen las torres y los tirantes, no el detalle.
- **Los retratos del desayuno son las caras de 96 sin cuerpo,** cortadas a la altura de los hombros. Por eso la mesa va alta.
- **Faltan las escenas del pedido de C6:** el `vendedor_ambulante_bog` y la vendedora no están. La chaza va sola.

## Lo que necesita el siguiente lote

- **El juego:**
  - conectar las escenas en `Intro.ts` como dice arriba;
  - unir este PR después del del mapa (Lothra2/pixel_forja#52). Los dos suman una parte a la misma lista y uno de los dos necesita un merge de main. Lo hago yo si me avisas.
- **Lo que queda del mensaje:** nada. C3 sigue en pausa.
