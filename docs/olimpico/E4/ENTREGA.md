# Lote E4: las 8 canchas a 800 de ancho
Estado: entregado, pendiente de Rick
PR: (se llena al abrirlo)
Fecha: 2026-10-15

## Qué se hizo

Las 8 canchas que estaban a 640 ahora miden 800. La cancha va centrada en los 640 del medio, de x 80 a 720, y a cada lado hay 80 de escenario. La cancha sale igual que antes, solo corrida 80. Lo de los lados es escenario nuevo de cada lugar, no relleno.

| Cancha | Prueba | A la izquierda | A la derecha |
|---|---|---|---|
| Margarita | Vóley Playa | La torre del salvavidas con la bandera amarilla y una palma | Otro toldo con su gente y su cava, otra palma y un bañista |
| Đà Lạt | Tenis | Un pino en la neblina, el portón de la malla con su candado y la banca de los visitantes abrigados, con el termo de té | Un farol de hierro y la bicicleta de la vendedora de flores, con sus cestas |
| Tao Đàn | Đá cầu | Un cà phê cóc: la vendedora en su banquito rojo y un señor con su jaula de pájaro | El barrendero de naranja con su escoba larga, el montón de hojas y su carrito |
| Maracaibo | Básquet | La calle del barrio: una casa menta con su tanque, la vecina en la mecedora, un perro dormido y el farol de cabeza de cobra | Una casa de dos pisos y el kiosco de patacones y chicha, con la vendedora, la plancha humeando y los clientes |
| Barranquilla | Fútbol | Una casa azul con la familia en el balcón, el vendedor de maicena y espuma y un Monocuco | Una casa verde con el letrero de BOLIS, una palma, una cumbiambera y un Garabato |
| El liceo | Quemado | La gradería sigue hasta la pared, llena de alumnos, con la pancarta ¡DALE 5TO A! | La puerta azul de la DIRECCIÓN, el profe de educación física con su pito y la malla de balones, y dos alumnos en un banco |
| La Candelaria | Tejo | Una ventana colonial chiquita, las canastas de cerveza y dos en ruana tomando | El portón de madera entreabierto, con su placa y su farol, y un señor de ruana con su cerveza |
| Hội An | Tama-wari | Más río con los reflejos del puente, más velitas, un bote de faroles amarrado y la señora con su canasta de velitas de papel | La otra mitad del puesto de faroles y una quinta casa amarilla con su balcón y sus vecinos, y una frutera con su pértiga |

### Lo que sumé al motor

- **El campo `margen` del layout,** opcional: `"largo": 800, "margen": 80`. El validador lo revisa: los dos márgenes tienen que caber en el largo.
- **`escenario.json` trae `margen`** y una nota que dice de dónde a dónde va la cancha.
- **El cielo de una cancha con margen se pinta de su largo.** Antes era siempre de 640 y se repite. En una pantalla de 780 el sol salía dos veces.
- **Las postales de una cancha con margen** van como las de una pantalla (al principio, al medio y al final), aunque el layout traiga salida y meta, como Hội An.
- **`MARGEN_CANCHA`** en el motor, 80, para que cada cancha corra sus cosas con el mismo número.

## Cómo se usa (estudio y kit)

**En el estudio:** en Escena cargas el layout como siempre y sale a 800.

**En el kit:** no cambia nada en tu `kit.config.json`. Las canchas salen con su `escenario.json` nuevo. Siguen siendo un solo trozo por capa (`cerca_0.png`, `piso_0.png`), así que **no suman archivos.**

**Lo que tiene que conectar el juego:**
- **Centra la cámara en la cancha** con `margen` de `escenario.json`: la cancha va de `margen` a `largo - margen`. Con 640 de pantalla la cámara va en x 80, y con 780 en x 10. En las inclinadas no sirve dividir el ancho entre dos, porque el ancho trae lo que corre la inclinación (836 en Barranquilla y Maracaibo) y el margen sigue siendo 80.
- **Las x de tus escenas de 640 no cambian.** Las del layout ya vienen corridas 80: la red de Margarita va en 400 del layout, que en `Voley.ts` sigue siendo 320. Si lees algo del layout (los postes del Tama-wari, la caja de greda, los arcos), réstale el margen, o pinta tu escena corrida el margen.
- **Los ids que traen la x cambiaron** en Barranquilla: los arcos ahora son `arco_piedra_106` y `arco_piedra_680` (antes `_26` y `_600`). La comparsa de la vida también: `comparsa_288` y `comparsa_478`.

## Pruebas

- **Las 8 pasan las 9 pruebas** sin avisos.
- **e4a, e5, e6 y hoian, con las x nuevas:**
  - Las rayas de cada cancha caen donde las pone el juego más 80.
  - En los márgenes no hay rayas.
  - El piso está pintado entero, también en los márgenes.
  - La red, el aro, los arcos, la caja de greda, el bocín, la raya y el letrero de Tejo.ts van corridos 80.
  - `escenario.json` trae `ancho` 800 y `margen` 80.
- **Monserrate se ve por la ventana grande con la cámara centrada,** en x 10 (iPhone) y en x 80 (640). La prueba de antes suponía la cámara quieta en 0.
- **El relámpago de Maracaibo** va en la nube del Catatumbo con la cámara centrada.
- **Las luces nuevas:** Maracaibo tiene 9 prendidas (el farol de la calle y el bombillo del kiosco) y el liceo 6 (una lámpara más en cada margen).
- **Las imágenes doradas** de e4a, e5, e6 y Hội An están regeneradas, después de mirar cada cancha entera.
- **`custom.test.ts`:** las 8 canchas en el kit con `largo` 800 y `margen` 80. KIT.
- **La suite completa:** SUITE.
- **`tsc` limpio, `npm run build:sitio` limpio y e2e:** E2E.

## Para aprobar (todo en esta carpeta)

- **`<cancha>_800.png`:** cada una entera, a 800.
- **`tablero_encuadres.png`:** las 8, una debajo de la otra. La raya roja es lo que se ve con la cancha centrada en 640, y la azul lo que ve el iPhone (780).

Qué mirar: que los lados se sientan parte del lugar y no un relleno, y que en el iPhone no se vea nada cortado.

## Decisiones que tomé sin preguntar

1. **Corrí todo el layout 80, no solo el dibujo.** Así la colisión, las entidades y lo pintado siguen en el mismo sistema. El juego resta el margen.
2. **El margen va en un campo propio (`margen`)** y no se deduce del ancho, por las inclinadas.
3. **El cielo de las canchas con margen se pinta a 800.** Arreglé un problema que ya existía en el iPhone: el sol repetido.
4. **Lo de la capa lejos que tiene que caer en un sitio** quedó puesto para la cámara centrada (Monserrate, la nube del Catatumbo, la catedral de Đà Lạt, las torres de Saigón y el reflejo del puente de Hội An).
5. **El dojo sigue de 640.** No estaba en tu lista.
6. **La última casa de Hội An** ya no se estira hasta el borde: queda de su tamaño, y la quinta casa llena el margen.

## Límites honestos

- **La capa lejos corre a un cuarto de la cámara.** Por eso lo que tiene que caer en un sitio fijo solo calza exacto con una cámara:
  - Monserrate queda en la ventana grande con la cámara entre x 10 y x 80. En x 0 se corre unos 8 px y sigue dentro.
  - El relámpago de Maracaibo está calzado con la cámara en x 80. En el iPhone (x 10) el destello cae unos 50 px a un lado de donde lo pinté, todavía dentro de la nube del Catatumbo, que mide 220.
- **En la Candelaria, la prueba de contraste** muestrea cada 64 px. Tuve que correr 3 px a la gente de la banca para que no cayera en sus piernas oscuras. Si cambias la banca, puede volver a fallar.
- **Las texturas del piso** que dependen de la x (la arena, la arcilla, la tierra) no se corrieron: se ven un poco distintas, pero sin costuras.
- **Las 2 inclinadas** muestran a la derecha unos 30 o 40 px de escenario nuevo en el iPhone. El resto queda entre 790 y 836.
- **La nueva casa de Hội An no tiene letrero.** La lista de letreros de la ficha es fija.

## Lo que necesita el siguiente lote

- **El juego:** centrar la cámara con `margen` en las 8 pruebas y quitar el acercamiento que tuviste que poner.
- **Lo que queda de este mensaje:** D3, los vehículos a escala de atleta, en su PR. `rayo_cielo` va en el suyo.
