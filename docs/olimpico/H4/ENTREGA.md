# Lote H4: la música de Cartagena, el Eje Cafetero, Hạ Long y Apure
Estado: entregado, pendiente de Rick
PR:
Fecha: 2026-10-13

## Qué se hizo

Un tema para cada prueba que seguía con la música del chip. El juego pidió dos, Azoteas de Cartagena y Vallas del Eje Cafetero. Su `ESTADO.md` dice que Natación y Jabalina también siguen con la pelea del chip, así que hice los cuatro: el trabajo de motor es el mismo y cada tema extra cuesta poco.

Todo está sintetizado con código en `src/engine/audio/atletismo.ts`, con el mismo método de H2 y H3 y sin muestras de nadie. Cada tema tiene su semilla y sale igual siempre. Van en bucle sin corte y en mono.

| Tema | Mundo | Carácter | Duración |
|---|---|---|---|
| `champeta_murallas` | Cartagena, Azoteas | <ul><li>Champeta criolla en Mi mayor, 132 bpm.</li><li>Cuatro compases de entrada con el punteo de la guitarra.</li><li>Ocho compases donde la guitarra canta el tema en terceras, sobre acordes cortos de teclado en los contratiempos.</li><li>Ocho de "despeluque": la guitarra repite su punteo en semicorcheas, el bajo baila más y la batería se llena, con redobles de tom.</li><li>El bajo va adelante, como en un picó, y el láser del picó baja al entrar cada parte.</li></ul> | 36.4 s |
| `cafe_neblina` | Eje Cafetero, Vallas | <ul><li>Bambuco acelerado en La mayor, 6/8 a 124. Es el nombre y el carácter del pedido.</li><li>La bandola andina canta en trémolo y entra a contratiempo, como en el bambuco.</li><li>El tiple rasguea y adelanta en la última corchea el acorde que viene.</li><li>La guitarra hace los bordones alternando 3/4 y 6/8, la hemiola del bambuco, y las cucharas no paran.</li><li>La segunda parte se va a Fa sostenido menor con la neblina de colchón. La segunda vez de cada parte, la bandola va en terceras.</li></ul> | 31 s |
| `halong_remos` | Bahía de Hạ Long, Natación | <ul><li>El canto de los remeros en Sol menor pentatónico, 108 bpm.</li><li>Primero el đàn bầu lleva el tema: las notas entran deslizándose, las largas cantan con vibrato ancho y algunas se deslizan al final hacia la siguiente, como el "luyến".</li><li>Después el "hò": el đàn bầu llama y el coro de los remeros contesta.</li><li>Debajo, el đàn tranh repite su figura, y el trống cơm y el remo que entra al agua marcan la remada en el 1 y el 3.</li><li>El mõ de madera va en los contratiempos y las olas vienen cada dos compases.</li></ul> | 35.6 s |
| `pajarillo_llano` | Llanos de Apure, Jabalina | <ul><li>Un pajarillo, joropo recio en Si menor, a 196.</li><li>El arpa lleva el tema con sus corridas y la bandola llanera hace el pespunteo.</li><li>En la parte en Mi menor la bandola toma el tema y el arpa bordonea.</li><li>El cuatro rasguea con el golpe recio, los bajos del arpa alternan 3/4 y 6/8, y las maracas van escobilladas en semicorcheas.</li></ul> | 36.7 s |

**En el kit a medida y el estudio:**
- **El catálogo:** los 4 nombres entran al catálogo del motor (`catalogo.ts`). Con eso:
  - el kit los exporta en `audio.musica`,
  - el esquema y la validación los conocen,
  - no salen en `manifest.pendiente`,
  - el estudio los muestra en **Audio del juego** sin tocar la página,
  - y `audio/escuchar.html` del kit los toca.
- **El ejemplo:** `docs/ejemplos/nekketsu/kit.config.json` pide los 4. `docs/AUDIO.md` tiene la tabla nueva.
- **Lo que suman al kit:** unos 7.5 s.
  - Solo con `--solo audio`, el kit de Nekketsu tarda 40.2 y 40.4 s con lo nuevo, contra 32.3 y 33.1 s en `main`.
  - Comprimidos, los 4 temas pesan cerca de 1.1 MB en OGG y otro tanto en M4A.
- **Lo que cambió de H2 y H3:**
  - `mundos.ts` sumó seis acordes.
  - `pelota.ts` exporta la bandolina y el đàn tranh para reusarlos.
  - Los 100 sonidos que ya estaban salen iguales, muestra por muestra: lo comparé con `main`.

## Cómo se usa (estudio y kit)

En el estudio: Inicio, **Audio del juego**, sección Música. Cada tema tiene su botón.

En el `kit.config.json` del juego, sumar a lo de antes:

```jsonc
"audio": {
  "formato": "comprimido",
  "musica": [/* ...lo de antes... */ "champeta_murallas", "cafe_neblina", "halong_remos", "pajarillo_llano"]
}
```

**El juego:** cada una de las cuatro pruebas toca hoy `chip.play(PELEA)`. Con esto, cada una toca el tema de su mundo con `bucle()` de `src/core/kit.ts`, igual que en H2 y H3:
- `Azoteas.ts`: `champeta_murallas`.
- `Vallas.ts`: `cafe_neblina`.
- `Natacion.ts`: `halong_remos`.
- `Jabalina.ts`: `pajarillo_llano`.

Con eso, ninguna de las 16 pruebas queda con la música del chip.

## Pruebas

- **Prueba nueva `h4.test.ts`, 8 casos:**
  - Los 4 temas están en el catálogo, con `cafe_neblina` como lo nombra el pedido, y ningún nombre se repite.
  - Cada tema dura sus compases exactos, entre 29 y 42 s, va en bucle y suena todo el tiempo: ningún medio segundo en silencio ni a tope.
  - No saturan: el pico queda en 0.9, casi ninguna muestra pasa de 0.85 y no hay componente continua.
  - **El bucle empalma sin corte:** el salto entre la última muestra y la primera es más chico que el 99 % de los saltos de la pieza, y el último segundo y el primero suenan como el resto.
  - **Ninguno dura lo mismo que otro tema del catálogo,** comparado con los 18 que ya estaban, y los cuatro son piezas distintas.
  - **Cada uno tiene su carácter, medido:**
    - La champeta lleva el bajo adelante: más de la mitad de su energía va por debajo de 200 Hz. Queda al nivel de la cumbia y el carnaval (0.69 contra 0.71 y 0.73), y los otros tres, que son de cuerdas punteadas, quedan en menos de 0.35.
    - El pajarillo es el más brillante de los cuatro, y también más que `pana_dale` (1945 cruces por segundo contra 1693). Así no se confunde con el joropo de Caracas.
  - Deterministas: salen iguales se pidan solos o después de otros.
  - El kit los exporta sin pendientes, con su duración y `bucle`, y `escuchar.html` los nombra a todos.
- **Las de audio de antes** (`h2.test.ts` y `h3.test.ts`) en verde: 30 de 30 junto con las nuevas.
- **Los 100 sonidos que ya estaban salen idénticos a `main`,** muestra por muestra (sha256 de cada uno).
- **El esquema** `docs/kit-a-medida.schema.json` está regenerado. Solo suma los 4 nombres a la lista de música.
- **`escuchar.html` de esta carpeta, probado en Chromium:** carga los 4 sin errores, cada OGG trae sus 20 s y "Tocar todo" arranca por `champeta_murallas`.
- **El kit de Nekketsu completo por la línea de comandos:** 248 s, 1341 archivos y 78 MB, con la máquina cargada (carga 2.9). En `main` medí 231 s con carga 3.4. La diferencia que es de H4 son los 7.5 s del audio.
- **Suite completa: 41 archivos, 436 de 436.** `tsc` limpio, `npm run build:sitio` limpio y e2e de Playwright 50 de 50.

## Para aprobar (todo en esta carpeta)

- **`escuchar.html`:** toca cada tema con un clic, o todos en orden con "Tocar todo". Abre directo desde la carpeta o la tablet, sin servidor.
- **`musica/*.ogg` y `musica/*.m4a`:** un recorte de 20 s de cada tema, codificado igual que en el kit (mono, 64 kbps).
  - **Son los últimos 10 s y los primeros 10,** así que a los 10 s se oye el empalme del bucle. Ahí no tiene que haber salto, corte ni cambio de volumen.
  - La página elige el OGG o el M4A según lo que toque el navegador. El M4A es para el Safari del iPad.
- Los temas completos salen en el kit: `npm run kit-a-medida -- salida --config docs/ejemplos/nekketsu/kit.config.json --solo audio` y `salida/audio/escuchar.html`.

Qué oír:
- En `champeta_murallas`, el recorte cae justo en el cambio: los últimos 10 s son el despeluque y los primeros 10 son la entrada, con el láser del picó en el segundo 10.
- En `cafe_neblina`, termina la parte en menor y vuelve la mayor.
- En `halong_remos`, los últimos 10 s son el "hò" con el coro, y los primeros 10 el đàn bầu solo.
- En `pajarillo_llano`, el arpa y la bandola juntas, y después el arpa sola.

No hay GIF ni tablero en este lote: es solo audio.

## Decisiones que tomé sin preguntar

1. **Hice cuatro temas y no dos.** El juego pidió Azoteas y Vallas como "lo que más luciría", pero su `ESTADO.md` dice que Natación y Jabalina también siguen con el chip. Con los cuatro, ninguna prueba queda sin su tema.
2. **Los nombres:**
   - `cafe_neblina` es el del pedido, con su carácter: "bambuco acelerado".
   - Los otros tres no están en el pedido. Les puse nombre con la misma forma que los de H2 y H3, un rasgo de cada lugar: `champeta_murallas`, `halong_remos` y `pajarillo_llano`.
3. **Cartagena es champeta y no cumbia ni porro.** La cumbia ya está en la Comuna 13 y en Barranquilla. La champeta es el sonido de Cartagena, y con el picó, el bajo adelante y la guitarra de punteo no se parece a ninguno de los otros temas.
4. **Apure es un pajarillo y no otro joropo en mayor.** `pana_dale` ya es un joropo en Re mayor a 180. El pajarillo es llanero de verdad, va en menor, a 196, con bandola en vez de solo cuatro, y los bajos alternan 3/4 y 6/8. La prueba mide que suena más brillante que `pana_dale`.
5. **Hạ Long lleva đàn bầu y el canto de los remeros.** El đàn bầu es el instrumento más reconocible de Vietnam y no estaba en ningún tema. La sáo ya está en Hội An y Đà Lạt, y el đàn tranh en Saigón y Đà Lạt. El "hò" de llamada y respuesta le da el pulso de remada que pide una carrera en el agua.
6. **Tonalidades distintas de los temas cercanos:** La mayor para el bambuco, Mi mayor para la champeta, Sol menor pentatónico para Hạ Long (los otros vietnamitas van en Re, Mi menor y Fa) y Si menor para el pajarillo.
7. **El código va en un archivo nuevo, `atletismo.ts`,** como H3 fue en `pelota.ts`. Reusa la bandolina (la bandola andina también va en trémolo), el đàn tranh, las maracas, el rasgueo y la tercera de abajo.
8. **La neblina va solo en la parte en menor de `cafe_neblina`.** Es una prueba de carrera: si todo el tema llevaba colchón, se ponía lento.
9. **Bajé el bajo de la champeta después de ver el espectrograma.** En la primera versión el bajo tapaba la guitarra que canta. Ahora queda con los graves de la cumbia y el carnaval.

## Límites honestos

- **No lo pude oír.** Lo revisé con espectrogramas y con las pruebas de forma (volumen, bucle, saturación, graves y brillo), pero lo que decide es el oído de Rick. Si un tema no tiene el carácter, se ajusta ese solo.
- **Es chiptune, no grabación.** El đàn bầu es una onda casi pura con la vara que dobla la nota, el tiple y la bandola son cuerdas punteadas sintetizadas, y la guitarra de la champeta lleva un poco de sierra para el filo. Se reconocen por el ritmo y el adorno, no por el timbre de verdad.
- **El bambuco y el pajarillo están simplificados.** La hemiola y el golpe se reconocen, pero no siguen un repertorio ni un canto. No hay voz: el coro de Hạ Long son cuadradas al unísono.
- **El kit de Nekketsu se acerca a los 300 s.** Medí 248 s con la máquina cargada, y H4 suma unos 7.5 s. Quedan unos 50 s de margen. Si hace falta, lo primero es sintetizar más rápido las cuerdas en trémolo, que son lo más pesado del audio, antes de subir el límite.
- **El M4A no lo pude tocar en este Chromium,** que no trae AAC, igual que en H1b, H2 y H3. Hay que oírlo en el iPad.

## Lo que necesita el siguiente lote

- **El juego:**
  - Poner `bucle()` con su tema en Azoteas, Vallas, Natacion y Jabalina, en vez de `chip.play(PELEA)`.
  - Sumar los 4 nombres al `kit.config.json`.
- **Lo que queda del audio del pedido:**
  - Música: `vestuario` y los `acorde_<equipo>`.
  - Efectos de estas pruebas que el pedido ya nombra: chapuzón, brazada, salida de natación y garrocha. Son los que más se oirían ahora.
  - Los 15 ambientes de 12 s, entre ellos `cafetal`, `llano` y `mar`, que van con estos mismos mundos.
- **Base:** esta rama sale de `main` (8eda3a1), con todo de #26 a #34 unido.
