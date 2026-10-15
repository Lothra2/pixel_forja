# Lote gira: el mapa de la gira, los mapas de región y los sellos del pasaporte
Estado: entregado, pendiente de Rick
PR:
Fecha: 2026-10-15

## Qué se hizo

Es la primera mitad del punto 2: el mapa de la gira. Las escenas de la intro van en su propio PR.

**Las piezas**, todas en `ui.interfaz` como la parte nueva `mapa`:

| Pieza | Tamaño | Qué es |
|---|---|---|
| `mapa_gira` | 800 x 360 | El Pacífico con Asia y América, con costas reales. Japón, Vietnam, Colombia y Venezuela van con borde de oro |
| `mapa_gira_ruta` | 800 x 360, transparente | La ruta del avión, Tokio → Saigón → Bogotá → Caracas, en arcos de rayitas, con un aro en cada parada |
| `mapa_vietnam` | 320 x 360 | Vietnam con sus vecinos apagados |
| `mapa_colombia_venezuela` | 320 x 360 | Colombia y Venezuela, con el lago de Maracaibo |
| `sellos_pasaporte` | 128 x 40, 4 cuadros | Un sello por país, cada uno en su tinta |

**El mapa calza con el tuyo.**
- La parte de 640, de x 80 a 720, usa la misma proyección que `src/gfx/mapa.ts`: longitud este de 90 a 300 y latitud de 50 a -25.
- Las paradas caen en el mismo pixel que hoy, más 80. La toma de la ruta de la intro, con su zoom, su cámara y sus pines, funciona igual cambiando la textura.
- En pantalla ancha ya no hay que estirar el mapa: trae los 80 de cada lado.

**Cómo está pintado:**
- **Las costas y las fronteras** son de Natural Earth, que es de dominio público, simplificadas. Pesan 45 KB en `src/engine/ui/geo.json`.
- **El mar** va en bandas de profundidad con trama, con la espuma y la línea de costa. Lleva la rejilla cada 15 grados, olitas sueltas y la rosa de los vientos en el Pacífico sur.
- **La tierra:**
  - Las cordilleras de verdad: Himalaya, Tíbet, Andes, Rocosas, Sierra Madre, la Annamita de Vietnam, los Alpes del Japón y los Andes de Venezuela con la cordillera de la Costa.
  - Los desiertos donde van: Gobi, el suroeste gringo, Australia, Atacama y la Guajira.
  - Nieve solo en lo más alto.
- **Los países de las paradas** llevan borde de oro y un relleno un poco más claro.

**La ruta va aparte** para que el juego la descubra mientras vuela el avión.
- `tramos[i]` trae los puntos del arco de la parada i a la siguiente, uno cada 5 px.
- Así el avión vuela por el mismo arco que se dibuja.
- Los arcos suben hacia el norte, más altos cuanto más largo el vuelo.

**Los mapas de región** son para cuando quieras poner las pruebas en el mapa, como dice el PLAN en 12.3: "cada prueba es una medalla en el mapa".
- Miden 320 x 360, así que los dos caben lado a lado en la parte de 640.
- `lugares` dice dónde cae cada lugar del motor:
  - **En Vietnam:** Hà Nội, Hạ Long, Huế, Đà Nẵng, Hội An, Nha Trang, Đà Lạt, Saigón y Cần Thơ.
  - **En Colombia y Venezuela:** Bogotá, Medellín, el Eje Cafetero, Cali, Cartagena, Barranquilla, Santa Marta, Caracas, Maracaibo, Margarita, los Llanos de Apure, Mérida y Canaima.

**Los sellos** son de una sola tinta, como los de verdad, y la tinta se gasta en unos pixeles:

| País | Dibujo | Tinta |
|---|---|---|
| Japón | El Fuji con el sol | Roja |
| Vietnam | El nón lá | Morada |
| Colombia | La taza de tinto | Azul |
| Venezuela | El tepuy con el Salto Ángel | Verde |

La franja `texto` va vacía, de 80 x 26, para que el juego escriba el país y "GIRA NEKKETSU" con la tinta de `tintas`.

## Cómo se usa (estudio y kit)

**En el kit:** la parte `mapa` sale con `"interfaz": true`. Las paradas van en `kit.config.json`, y ya están en el ejemplo de Nekketsu:

```json
"ui": { "interfaz": true, "gira": { "paradas": ["tokio", "saigon", "bogota", "caracas"] } }
```

- Si un lugar no existe, el error lo dice y sugiere el más parecido.
- Sin `gira`, el mapa sale sin países resaltados y sin ruta.
- Las regiones y los sellos salen siempre.

**Lo que tiene que conectar el juego:**
- **`Intro.ts`, en la toma `ruta`:**
  - Cambia `mapa_mundo` por `ui_mapa_gira`, con `setOrigin(0)` en x -80.
  - El contenedor del zoom no cambia, porque las paradas caen en el mismo sitio más 80.
  - Encima, `ui_mapa_gira_ruta`, descubierta tramo a tramo con una máscara, o dibuja las rayitas con `tramos` mientras vuela el avión.
- **Los sellos de la barra de abajo:**
  - Cambia el rectángulo de 112 x 34 por `ui_sellos_pasaporte` con `setFrame(i)`.
  - El texto va en `texto`: el país en la primera línea y "GIRA NEKKETSU" en la segunda, a 1, con el tinte de `tintas[pais]`.
  - Caben en el paso de 136 que ya usas.
- **El medallero, si algún día lo quieres en el mapa:** `ui_mapa_vietnam` y `ui_mapa_colombia_venezuela` lado a lado. Cada prueba va en `lugares[lugar]` con su medalla de 16, o la cinta.

**El conteo:** son 5 PNG en `ui.interfaz`, que el juego empaqueta. El artifact sigue en 500.

## Pruebas

- **Prueba nueva `gira.test.ts`, 6 casos:**
  - **El mapa mundial:**
    - mide 800 x 360 y sus paradas caen donde las pone la fórmula del juego, más 80, a medio pixel o menos;
    - el Pacífico es mar, y China y Brasil son tierra;
    - los cuatro países llevan su oro y China no;
    - sin países, no hay oro.
  - **La ruta:**
    - un arco por tramo que empieza y termina en sus paradas y sube hacia el norte;
    - sin saltos entre puntos;
    - casi todo transparente.
  - **Las regiones:**
    - cada lugar cae sobre tierra o en su playa, y en el punto que da su proyección;
    - el lago de Maracaibo es agua, el delta del Mekong es tierra y el golfo de Tonkín es mar.
  - **Los sellos:** cada uno de una sola tinta, con la franja del texto vacía y los cuatro dibujos distintos.
  - **El kit a medida:**
    - la parte `mapa` con `ui.gira`, sin `gira`, y los errores de un lugar que no existe;
    - cada archivo del manifiesto existe.
  - **Que salga igual cada vez.**
- **`custom.test.ts`:** el conteo de PNG sube 5. El esquema de `kit.config.json` trae `ui.gira`.
- **La suite sin `custom.test.ts`:** 54 archivos, 542 de 542. En `ui_audio.test.ts` sumé `mapa` a la lista de partes del mensaje de error.
- **`custom.test.ts`: 15 de 15,** con el kit generado en 250 s, por debajo del límite de 300.
- **`tsc` limpio, `npm run build:sitio` limpio y e2e de Playwright 50 de 50.**

## Para aprobar (todo en esta carpeta)

- **`mapa_gira.png`:** la toma de la ruta como la arma la intro: la barra de arriba, el mapa con la ruta, las banderas de las paradas y los cuatro sellos abajo con su texto. Va a x2.
- **`vuelo.gif`:** el avión volando por los tramos mientras la ruta se descubre y aparecen los sellos. Va en la parte de 640, a tamaño real.
- **`mapa_gira_solo.png`:** el mapa solo, a tamaño real.
- **`mapas_region.png`:** los dos mapas de región, con cada lugar marcado con su nombre para revisar que caigan bien. Va a x2.
- **`sellos.png`:** los cuatro sellos con el texto que escribiría el juego. Va a x3.

Qué mirar:
- que el mapa se lea como mapa de juego retro y no como foto de satélite;
- que la ruta se vea sin tapar las paradas;
- que los sellos se entiendan.

## Decisiones que tomé sin preguntar

1. **Partí el punto 2 en dos PR.** El mapa ya estaba y no quise que esperara a las escenas de la intro, que son más trabajo.
2. **La misma proyección del juego,** aunque estira la latitud. Así no tienes que tocar las paradas, el zoom ni la cámara de la toma de la ruta.
3. **Costas reales de Natural Earth** y no dibujadas a mano. Se reconoce el mundo de verdad y la licencia es libre.
4. **Agregué los mapas de región,** que no estaban en el pedido. Con el mapa mundial solo, Vietnam mide 24 px de ancho y no caben ahí las medallas de cinco pruebas.
5. **Los lugares y las paradas van en el motor y en `kit.config.json`,** no en el código del juego, como las banderas. Cualquier gira con estos lugares sirve.
6. **Sello de 128 y no de 112.** Con 112, "GIRA NEKKETSU" no cabía al lado del dibujo.
7. **Sin nombres pintados en el mapa:** el juego escribe lo que quiera, en el idioma que sea.

## Límites honestos

- **Solo hay detalle en dos regiones:** Vietnam, y Colombia con Venezuela. Para otra región, como Japón de cerca, hace falta sumar sus fronteras al archivo de datos.
- **Los lugares son una lista fija de 23.** Uno nuevo se suma en `LUGARES` con su longitud y latitud.
- **Las cordilleras y los desiertos son aproximados,** con líneas y óvalos a mano sobre ruido. Se reconocen los Andes y el Himalaya, pero no es un mapa de relieve de verdad.
- **El mapa estira la latitud,** igual que el del juego, así que Japón y Colombia se ven un poco más altos que en un atlas.
- **El GIF del vuelo es una simulación mía,** con un avión de 11 px. En el juego vuela tu `avion_arriba`.

## Lo que necesita el siguiente lote

- **El juego:** usar `ui_mapa_gira`, la ruta y los sellos en la toma `ruta` de la intro.
- **Lo que queda del mensaje:** las escenas de la intro con los retratos nuevos van en su PR, que sigue ahora.
