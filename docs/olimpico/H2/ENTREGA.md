# Lote H2: un tema por mundo y los efectos del gallo, el tejo, el đá cầu y el tatami
Estado: entregado, pendiente de Rick
PR: (se completa al abrirlo)
Fecha: 2026-10-13

## Qué se hizo

Lo que pidió Rick para H2: los efectos del gallo, el tejo, el cầu, el tatami y el silbato, y un tema por mundo. Todo sintetizado con código en `src/engine/audio/mundos.ts`, sin muestras de nadie. Cada sonido tiene su semilla y sale igual siempre.

**Música: un tema por cada mundo que ya tiene escenario o equipo.** Todos van en bucle sin corte y en mono, igual que los de H1.

| Tema | Mundo | Carácter | Duración |
|---|---|---|---|
| `tema_instituto` | Japón, Instituto Nekketsu | <ul><li>Rock japonés de los 80 en La menor, 152 bpm.</li><li>Riff, verso y un coro con el "royal road" (Fa, Sol, Mi menor, La menor), la vuelta de acordes de los animes de esa época.</li><li>Lead en cuadrada con la segunda voz en terceras, guitarra con palm mute, bajo en corcheas y colchón de sintetizador en el coro.</li></ul> | 37.9 s |
| `hoian_noche` | Hội An | <ul><li>La noche de los faroles. Mi menor pentatónico, 92 bpm.</li><li>La sáo lleva el tema, con notas que suben desde abajo.</li><li>Tambores de festival como los de la danza del león: el trống grande, la baqueta en el aro, címbalos chicos y un gong cada 4 compases.</li><li>En la segunda vuelta entran el đàn nguyệt y los redobles.</li></ul> | 41.7 s |
| `ajiaco_rock` | Bogotá | <ul><li>Rock en español bogotano de los 90 en chiptune. Re mayor con el Do mixolidio, 132 bpm.</li><li>Guitarras distorsionadas en rasgueo sincopado y un coro de estadio doblado una octava abajo.</li><li>Charles abierto en el coro.</li></ul> | 29.1 s |
| `parce_corra` | Medellín, Comuna 13 | <ul><li>Cumbia en La menor, 100 bpm.</li><li>Acordeón en dos cuadradas que baten, con terceras.</li><li>Guacharaca con ruido filtrado ("chaaa-ki-chi" en cada tiempo), llamador en los contratiempos, tambora, bajo de cumbia y el "chucu" del teclado.</li></ul> | 38.4 s |
| `pana_dale` | Caracas | <ul><li>Joropo en Re mayor, 3/4 a 180.</li><li>El arpa llanera lleva la melodía, con el bordón en el 2 y el 3.</li><li>El cuatro rasguea, arpegia y apaga. Las maracas no paran, con el acento que cambia entre 3/4 y 6/8.</li></ul> | 32 s |
| `gaita_lago` | Maracaibo | <ul><li>Gaita zuliana en La menor, 6/8.</li><li>El furro hace el "rum, rum-rum" y la tambora alterna parche y palitos en el aro.</li><li>Charrasca, maracas y cuatro con el frenado de la gaita.</li><li>El coro canta en dos voces y en la segunda vuelta se dobla a la octava.</li></ul> | 34.3 s |

Saigón ya tenía `saigon_chay` y la ceremonia tiene `marcha_nekketsu`, así que no hice otro.

**Efectos:**

| Efecto | Para qué | Duración | Cómo suena |
|---|---|---|---|
| `gallo` | El evento `canto` del gallo (cuadro 3 de `cantar`) | 1.3 s | "Ki-ki-ri-kiiii". Tres sílabas que suben y la última larga que sube, se sostiene y cae, con la garganta áspera. Arranca en la muestra 0 |
| `aleteo` | El evento `aleteo` del gallo (`asustarse`) y de la paloma (`despegar`) | 0.3 s | Cuatro golpes de ala, cada uno más suave, con el roce de las plumas |
| `mecha_tejo` | El tejo revienta la mecha | 0.7 s | El disco contra la greda, el estallido de la pólvora y el chisporroteo |
| `toque_cau` | Cada toque de pie al volante del đá cầu | 0.2 s | Seco y medio agudo, con el silbido de las plumas |
| `caida_tatami` | La caída de judo | 0.2 s | La palmada del brazo, seca y sorda, y el cuerpo que cae junto, sin rebote |
| `pitazo_largo` | El pitazo largo del árbitro | 1.25 s | Un solo pitazo con trino, que sube un poco al soplar |

**El `silbato` de antes no cambió.** Hay una prueba que lo amarra muestra por muestra, porque el juego ya lo usa.

**En el kit a medida y el estudio:**
- Los 12 nombres entran al catálogo del motor (`catalogo.ts`). Con eso:
  - el kit los exporta en `audio.sfx` y `audio.musica`,
  - el esquema y la validación los conocen,
  - ya no salen en `manifest.pendiente`,
  - y el estudio los muestra en **Audio del juego** sin tocar la página.
- `audio/escuchar.html` del kit los toca, porque arma su lista desde el manifiesto.
- El ejemplo `docs/ejemplos/nekketsu/kit.config.json` pide los 6 efectos y los 6 temas.
- **Lo que suman al kit:** unos 11 s. Sintetizar los 6 temas tarda unos 8 s y el resto es ffmpeg. Los efectos tardan menos de medio segundo. Comprimidos, los 6 temas pesan 1.8 MB en OGG y 1.8 MB en M4A.

## Cómo se usa (estudio y kit)

En el estudio: Inicio, **Audio del juego**. Los temas nuevos están en Música y los efectos en Efectos, cada uno con su botón.

En el `kit.config.json` del juego:

```jsonc
"audio": {
  "formato": "comprimido",
  "sfx": ["silbato", "pistola", "gallo", "aleteo", "mecha_tejo", "toque_cau", "caida_tatami", "pitazo_largo"],
  "musica": ["marcha_nekketsu", "saigon_chay", "tema_instituto", "hoian_noche", "ajiaco_rock", "parce_corra", "pana_dale", "gaita_lago"]
}
```

**El juego:**
- **El gallo:** en el evento `canto` toca `gallo` en vez de `chip.kikiriki()`, y en `aleteo` toca `aleteo` en vez de `chip.aleteo()`. Lo de bajarle el volumen cuando no está a la vista sigue igual.
  - El canto dura 1.3 s y la animación, desde el cuadro 3 a 8 fps, 0.4 s. El gallo se queda con el pico abierto en el último cuadro y el canto termina solo. Si se ve raro, `cantar` puede quedarse en el último cuadro hasta que termine el sonido.
- **El tejo:** `mecha_tejo` donde hoy está `chip.boom(1)`. El efecto visual del lote F se llama igual (`fx.mecha_tejo`), así que van juntos.
- **El đá cầu:** `toque_cau` en cada toque de pie, cabeza o pecho.
- **El judo, cuando llegue:** `caida_tatami` cuando alguien cae. `pitazo_largo` para empezar y terminar el combate, o para el final de cualquier partido.
- **La música:** cada escena toca el tema de su mundo con `bucle()` de `src/core/kit.ts`, el mismo marcador de `muestras / frecuencia` de H1b:
  - Instituto: `tema_instituto`.
  - Hội An: `hoian_noche`, para Tama-wari.
  - Bogotá: `ajiaco_rock`, para el tejo en La Candelaria.
  - Comuna 13: `parce_corra`.
  - Caracas: `pana_dale`.
  - Maracaibo: `gaita_lago`.
  - Hoy el tejo y el đá cầu tocan `PELEA` del chip. Con esto, cada uno toca el tema de su mundo.

## Pruebas

- **Prueba nueva `h2.test.ts`, 12 casos:**
  - Los 6 temas y los 6 efectos están en el catálogo y ninguno pisa un nombre que ya existía.
  - Cada tema dura sus compases exactos, va en bucle y suena todo el tiempo: ningún medio segundo en silencio ni a tope.
  - No saturan: el pico queda en 0.9, casi ninguna muestra pasa de 0.85 y no hay componente continua.
  - **El bucle empalma sin corte:** el salto entre la última muestra y la primera es más chico que el 99 % de los saltos de la pieza, y el último segundo y el primero suenan como el resto, sin fundido.
  - Los temas son distintos entre sí.
  - Los efectos son cortos, arrancan en los primeros 10 ms, no saturan, no tienen huecos mudos y no arrastran silencio.
  - **El kikirikí tiene su forma:** mido la altura por autocorrelación. "Ki", "ki" y "ri" suben, la "i" larga sube más y al final cae más de 4 semitonos. Las sílabas se separan, la "i" larga es lo más fuerte y se apaga al final.
  - **Cada efecto es distinto,** también de `silbato`, `caer_plano`, `golpe_pesado` y `pistola`, por duración, brillo y volumen. El pitazo largo dura más que el silbato. El tatami es un solo golpe que se apaga y `caer_plano` rebota.
  - El `silbato` de antes sale igual, muestra por muestra.
  - Deterministas: salen iguales se pidan solos o después de otros.
  - Las segundas voces van en terceras de la escala, y la sensible baja una tercera mayor.
  - El kit los exporta sin pendientes, con su duración y `bucle`, en WAV mono, y `escuchar.html` los nombra a todos.
- **Las de audio de antes** (`ui_audio.test.ts` y `effects.test.ts`): en verde. "audio: true trae todos los sonidos" ahora cuenta los 12 nuevos solo, porque cuenta el catálogo.
- **`custom.test.ts`:** 15 de 15, en 192 s. El kit completo de Nekketsu sale con los 12 sonidos nuevos comprimidos y sin `pendiente`. "Se genera en menos de 5 minutos" pasa. Solo con `--solo audio`, el kit tarda 23 s con lo nuevo y 12 s sin lo nuevo.
- **El esquema** `docs/kit-a-medida.schema.json` está regenerado.
- **Suite completa: 34 archivos, 357 de 357.** La primera corrida, con la máquina cargada por otros lotes, falló una de `comuna13.test.ts` que no toca audio. Repetida con la máquina libre, pasan todas.
- **`tsc` limpio y `npm run build:sitio` limpio.**
- **`audio/escuchar.html` de esta carpeta, probado en Chromium:** carga los 12, toca el gallo con un clic y los OGG traen sus 20 s.
- **e2e de Playwright: 50 de 50.**
  - "audio del juego" fallaba a veces, también en `main`: 3 de cada 16. Era una carrera del estudio: el `play()` del silbato se cortaba con "Decir" y su `catch` apagaba el botón de parar.
  - El arreglo es de una línea y es el mismo de la rama de C5: solo limpia si ese sonido sigue siendo el que suena. Con él, pasa siempre.

## Para aprobar (todo en esta carpeta)

- **`escuchar.html`:** toca cada efecto y cada tema con un clic, o todo en orden con "Tocar todo". Abre directo desde la carpeta o la tablet, sin servidor.
- **`sfx/*.wav`:** los 6 efectos completos, tal cual salen en el kit.
- **`musica/*.ogg` y `musica/*.m4a`:** un recorte de 20 s de cada tema. **Son los últimos 10 s y los primeros 10**, así que a los 10 s se oye el empalme del bucle. Ahí no tiene que haber salto, corte ni cambio de volumen. La página elige el OGG o el M4A según lo que toque el navegador. El M4A es para el Safari del iPad.
- Los temas completos salen en el kit: `npm run kit-a-medida -- salida --config docs/ejemplos/nekketsu/kit.config.json --solo audio` y `salida/audio/escuchar.html`.

No hay GIF con Sophie y Alana en este lote: es solo audio.

## Decisiones que tomé sin preguntar

1. **Los nombres de los efectos:**
   - `gallo`, como en la lista del pedido, y no `kikiriki` ni `canto`.
   - `mecha_tejo`, igual que el efecto visual del lote F, para que el juego busque el mismo nombre en `fx` y en `audio.sfx`.
   - `toque_cau` por "toque de đá cầu", sin la "đ" y sin el "da", por corto y porque los nombres van sin acentos.
   - `caida_tatami` y `aleteo`, este último igual que el evento.
2. **Sumé `pitazo_largo`.** El `silbato` de H1 son dos pitazos cortos, y el árbitro de judo y el final de un partido piden uno largo. El `silbato` no se tocó.
3. **El canto dura 1.3 s aunque la animación dure menos.** Un kikirikí de 0.4 s suena a pito. Prefiero que el gallo cante completo y que el juego decida si sostiene el último cuadro.
4. **Hice los 6 temas de los mundos con escenario o equipo** y dejé para después `cafe_neblina` (bambuco), `vestuario` y los `acorde_<equipo>`. Rick pidió "un tema por mundo" y el Eje Cafetero no tiene escenario ni equipo todavía.
5. **Los temas son más cortos que la marcha** (entre 29 y 42 s, la marcha dura 60). Así pesan menos en el celular. Cada uno trae dos vueltas o dos partes para que el bucle no canse rápido.
6. **Los temas van sin intro ni final.** Arrancan en el primer tiempo y el último compás lleva al primero, porque el juego los toca en bucle.
7. **Les quité la componente continua a los temas y a los efectos nuevos.** Las ondas cuadradas con ancho de pulso distinto de la mitad la traen, y se come volumen. Los temas y efectos de H1 quedaron como estaban, para no mover lo que el juego ya usa.
8. **Los recortes para aprobar son el final pegado al principio,** no los primeros 20 s, para que se oiga el empalme del bucle.
9. **Los efectos para aprobar van en WAV** (175 KB en total) **y los temas en OGG y M4A.** En WAV, los 6 recortes pesaban 5.3 MB.

## Límites honestos

- **No lo pude oír.** Lo revisé con espectrogramas y con las pruebas de forma (altura, volumen, bucle y saturación), pero lo que decide es el oído de Rick. Si un tema no tiene el carácter, se ajusta ese tema solo.
- **Es chiptune, no grabación.** La cumbia, el joropo y la gaita se reconocen por el ritmo de la guacharaca, las maracas, la tambora y el furro. El acordeón, el arpa, el cuatro y el coro son ondas cuadradas y cuerdas punteadas sintetizadas.
- **El furro y los bombos son graves.** En el parlante del teléfono se oyen por los armónicos, no por la nota de abajo. Con audífonos suenan más llenos.
- **El kikirikí es un gallo de consola.** Tiene la forma de un canto de verdad y la garganta áspera, pero no la riqueza de un gallo grabado.
- **El M4A no lo pude tocar en este Chromium,** que no trae AAC, igual que en H1b. Hay que oírlo en el iPad.

## Lo que necesita el siguiente lote

- **El juego:**
  - Cambiar `chip.kikiriki()` por `gallo`, `chip.aleteo()` por `aleteo` y `chip.boom(1)` del tejo por `mecha_tejo`.
  - Poner el tema de cada mundo en su escena, y `toque_cau`, `caida_tatami` y `pitazo_largo` donde van.
  - Sumar al `kit.config.json` los nombres nuevos (ver arriba).
- **Lo que queda del audio de H2 en el pedido:**
  - Música: `cafe_neblina`, `vestuario` y `acorde_<equipo>`.
  - Efectos: chapuzón, brazada, bola que revienta, chapa, ventana rota, megáfono, perro, moto con corneta, camionetica, buseta, chicharras, ranas, trueno, paraguas, abanico, furro, salida de natación, garrocha, martillo girando, red de vóley, rebote de balón y aro de básquet.
  - Los 15 ambientes de 12 s.
  - Todo eso se puede pedir desde ya en el `kit.config.json`: sale como aviso en `manifest.pendiente` hasta que llegue.
- **Base:** esta rama sale de `main` después de C7b (https://github.com/Lothra2/pixel_forja/pull/25).
