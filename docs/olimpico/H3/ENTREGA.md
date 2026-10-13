# Lote H3: el audio de los mundos de pelota (Barranquilla, Margarita y Đà Lạt) y la red, el balón, el aro y la chapa
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/32
Fecha: 2026-10-13

## Qué se hizo

Un tema por cada mundo nuevo de los deportes de pelota y los efectos de la red de vóley, el balón de básquet, el aro y la chapa. Todo sintetizado con código en `src/engine/audio/pelota.ts`, con el mismo método de H2 y sin muestras de nadie. Cada sonido tiene su semilla y sale igual siempre.

**Música: un tema por mundo nuevo.** En bucle sin corte y en mono, como los de H2.

| Tema | Mundo | Carácter | Duración |
|---|---|---|---|
| `carnaval_quilla` | Barranquilla, Fútbol Callejero | <ul><li>Cumbia de carnaval en Sol mayor, 116 bpm.</li><li>Primera parte: la caña de millo lleva el tema, con trinos. Debajo, el tambor alegre que repica, el llamador en los contratiempos, la tambora (parche y aro), el maracón y la guacharaca.</li><li>Segunda parte: entra la papayera. Dos trompetas en terceras, el trombón que contesta y hace de puente, bombo y platillo de banda. El millo sigue de adorno.</li><li>El bajo hace "um-pa" de tuba en todo el tema.</li></ul> | 33.1 s |
| `playa_margarita` | Margarita, Vóley Playa | <ul><li>Música oriental margariteña en 3/4 a 144.</li><li>Primera parte: un polo en Mi menor. La bandolina canta en trémolo, el cuatro rasguea y la guitarra hace los bordones.</li><li>Segunda parte: un galerón en Sol mayor, más vivo, con el cuatro que apaga y las maracas en 6/8.</li><li>La segunda vez de cada parte, la bandolina va en terceras. Debajo, las olas que van y vienen cada dos compases.</li></ul> | 40 s |
| `dalat_niebla` | Đà Lạt, Tenis de dobles | <ul><li>Vals lento de montaña en Fa mayor, 3/4 a 96.</li><li>El đàn tranh lleva el tema con su "nhấn" (la cuerda que sube doblada) y abre cada frase con el barrido de cuerdas.</li><li>En la segunda parte canta la sáo y el đàn tranh arpegia. Al final vuelve el đàn tranh con una nota larga sostenida debajo.</li><li>Bajo en el 1, el acorde punteado en el 2 y el 3, un colchón suave como la niebla y el viento en los pinos.</li></ul> | 37.5 s |

Maracaibo (Básquet 3x3) ya tiene `gaita_lago` de H2, así que no hice otro.

**Efectos, en el orden del pedido:**

| Efecto | Para qué | Duración | Cómo suena |
|---|---|---|---|
| `red_voley` | La pelota contra la red | 0.41 s | El golpe sordo de la pelota, la malla que se sacude con roces cada vez más suaves y la cuerda de arriba que vibra grave, en unos 95 Hz |
| `rebote_balon` | Cada bote del balón de básquet en el cemento | 0.29 s | El chasquido del piso y el "pung" hueco del balón: una nota grave y clara, de unos 185 Hz, que baja un poco |
| `aro_basket` | La canasta | 0.67 s | El balón contra el tablero, el aro de hierro que suena y el "swish" de la red al pasar |
| `aro_fallo` | El tiro que pega en el aro y se sale | 0.49 s | Arranca igual que `aro_basket` (tablero y aro). En vez del swish trae el segundo toque del balón en el aro, y se apaga antes |
| `chapa` | La chapa golpeada por el palo de escoba de Chapita | 0.25 s | El "toc" de la madera del palo, el "tin" agudo de la lata, los dientes de la chapa que tiemblan y la chapa que sale silbando |

**En el kit a medida y el estudio:**
- Los 8 nombres entran al catálogo del motor (`catalogo.ts`). Con eso:
  - el kit los exporta en `audio.sfx` y `audio.musica`,
  - el esquema y la validación los conocen,
  - no salen en `manifest.pendiente`,
  - y el estudio los muestra en **Audio del juego** sin tocar la página.
- `audio/escuchar.html` del kit los toca, porque arma su lista desde el manifiesto.
- El ejemplo `docs/ejemplos/nekketsu/kit.config.json` pide los 5 efectos y los 3 temas.
- **Lo que suman al kit:** unos 6.5 s. Solo con `--solo audio`, el kit de Nekketsu tarda 29 y 30 s con lo nuevo, y 23 y 24 s sin lo nuevo (dos corridas de cada uno). Sintetizar los 3 temas tarda unos 5 s y el resto es ffmpeg. Los efectos tardan menos de 20 ms cada uno. Comprimidos, los 3 temas pesan 0.9 MB en OGG y 0.9 MB en M4A.
- `mundos.ts` de H2 solo cambió para exportar sus ayudantes (la tambora, las maracas, el rasgueo del cuatro, la sáo...) y sumar tres acordes. Los 12 sonidos de H2 salen iguales, muestra por muestra: lo comparé con la rama de H2.

## Cómo se usa (estudio y kit)

En el estudio: Inicio, **Audio del juego**. Los temas nuevos están en Música y los efectos en Efectos, cada uno con su botón.

En el `kit.config.json` del juego, sumar a lo de H2:

```jsonc
"audio": {
  "formato": "comprimido",
  "sfx": [/* ...lo de antes... */ "red_voley", "rebote_balon", "aro_basket", "aro_fallo", "chapa"],
  "musica": [/* ...lo de antes... */ "carnaval_quilla", "playa_margarita", "dalat_niebla"]
}
```

**El juego:**
- **La música:** cada evento toca hoy `chip.play(PELEA)`. Con esto, cada uno toca el de su mundo con `bucle()` de `src/core/kit.ts`, el mismo marcador de `muestras / frecuencia` de H1b:
  - `Voley.ts`: `playa_margarita`.
  - `Tenis.ts`: `dalat_niebla`.
  - `Futbol.ts`: `carnaval_quilla`.
  - `Basket.ts`: `gaita_lago`, que ya está en el kit.
  - `Chapita.ts` es en el barrio de Caracas: `pana_dale` le cuadra.
- **La red, en `Voley.ts`:** donde la pelota cruza por debajo y rebota (`c.red = true`), `red_voley` en vez de `esquiva`.
- **El básquet, en `Basket.ts`:**
  - `rebote_balon` en `moverBola()` cuando el balón toca el piso con fuerza (`b.z <= 0` con `|vz| > 50`). Si se quiere oír el dribleo, cada vez que el bote del que lo lleva pasa por el piso, más suave (volumen 0.25 o 0.3).
  - En `llegaAlAro()`: `aro_basket` cuando entra, en vez de `elegir`, y `aro_fallo` cuando no entra, en vez de `golpe` con `rate: 1.6`. El tablero roto de la clavada Nekketsu sigue con `romper` encima.
- **La chapa, en `Chapita.ts`:** `chapa` en el contacto, en vez de `golpe` con `rate: 1.2`. El volumen que ya sube con la calidad del golpe (`0.4 + 0.3 * q`) le sirve igual. El abanicado sigue con `esquiva`.
- **El fútbol:** `rebote_balon` es un balón de básquet en cemento. Para el fútbol en la calle se puede probar con `rate: 0.85` en los botes, pero no lo hice para eso.

## Pruebas

- **Prueba nueva `h3.test.ts`, 10 casos:**
  - Los 3 temas y los 5 efectos están en el catálogo y ninguno pisa un nombre que ya existía.
  - Cada tema dura sus compases exactos, entre 29 y 42 s, va en bucle y suena todo el tiempo: ningún medio segundo en silencio ni a tope.
  - No saturan: el pico queda en 0.9, casi ninguna muestra pasa de 0.85 y no hay componente continua.
  - **El bucle empalma sin corte:** el salto entre la última muestra y la primera es más chico que el 99 % de los saltos de la pieza, y el último segundo y el primero suenan como el resto, sin fundido.
  - Los temas son distintos entre sí y de los 6 de H2, todos con otro largo. Đà Lạt es el más opaco de los tres, el tranquilo.
  - Los efectos son cortos, arrancan en los primeros 10 ms, no saturan, no tienen huecos mudos y no arrastran silencio.
  - **Cada efecto tiene su forma,** medida por autocorrelación y por volumen:
    - El rebote es una nota grave y clara entre 140 y 230 Hz que baja.
    - La cuerda de la red vibra entre 85 y 115 Hz, y la red dura más que el rebote.
    - La canasta y el fallo arrancan igual. El hierro sigue sonando a los 0.3 s. La canasta trae el swish (más del doble de agudos que el fallo después del golpe) y el fallo trae el segundo toque en el aro.
    - La chapa es lo más brillante de todo, también más que el `toque_cau`.
  - **Cada efecto es distinto,** también de `golpe`, `bloqueo`, `romper`, `toque_cau`, `caida_tatami`, `caer_plano`, `golpe_pesado`, `mecha_tejo`, `pistola` y `silbato`, por duración, brillo y volumen. Son los que el juego usa hoy en esas jugadas.
  - Deterministas: salen iguales se pidan solos o después de otros.
  - El kit los exporta sin pendientes, con su duración y `bucle`, en WAV mono, y `escuchar.html` los nombra a todos.
- **Las de audio de antes** (`h2.test.ts`, `ui_audio.test.ts` y `effects.test.ts`) en verde: 53 de 53 junto con las nuevas. Ninguna cuenta fija cambió, porque las que cuentan sonidos cuentan el catálogo.
- **`custom.test.ts`:** 15 de 15, en 211 s, a la primera, con otros agentes en la máquina. El kit completo de Nekketsu sale con los 8 sonidos nuevos comprimidos y sin `pendiente`. "Se genera en menos de 5 minutos" pasa.
- **El esquema** `docs/kit-a-medida.schema.json` está regenerado.
- **`tsc` limpio y `npm run build:sitio` limpio,** en 324 s. Ahí el kit de Nekketsu completo tardó 227 s, con la máquina cargada: queda debajo del límite de 300 s, pero se va acercando. El aviso de Vite por el tamaño de los chunks ya estaba.**
- **`escuchar.html` de esta carpeta, probado en Chromium:** carga los 8 sin errores, los OGG traen sus 20 s, los WAV su largo, la chapa suena con un clic y "Tocar todo" arranca por `carnaval_quilla`.

- **Suite completa: 35 archivos, 367 pruebas.** Con la máquina cargada falló una de la Comuna 13 ("solo la paleta de Colombia") por tiempo: llamaba a `expect` una vez por pixel y tardaba de 10 a 33 s contra el límite de 30. Ahora junta los pixeles malos y compara una vez. Mide lo mismo y tarda 0.75 s. Corrida sola pasa 10 de 10.
- **e2e de Playwright: 50 de 50.**

## Para aprobar (todo en esta carpeta)

- **`escuchar.html`:** toca cada efecto y cada tema con un clic, o todo en orden con "Tocar todo". Abre directo desde la carpeta o la tablet, sin servidor.
- **`sfx/*.wav`:** los 5 efectos completos, tal cual salen en el kit (unos 90 KB en total).
- **`musica/*.ogg` y `musica/*.m4a`:** un recorte de 20 s de cada tema. **Son los últimos 10 s y los primeros 10**, así que a los 10 s se oye el empalme del bucle. Ahí no tiene que haber salto, corte ni cambio de volumen. La página elige el OGG o el M4A según lo que toque el navegador. El M4A es para el Safari del iPad.
- Los temas completos salen en el kit: `npm run kit-a-medida -- salida --config docs/ejemplos/nekketsu/kit.config.json --solo audio` y `salida/audio/escuchar.html`.

Qué oír:
- En `carnaval_quilla`, el recorte cae justo en el cambio: los últimos 10 s son la papayera y los primeros 10 son el millo.
- En `playa_margarita`, lo mismo: termina el galerón en Sol mayor y vuelve el polo en Mi menor.
- En `aro_basket` contra `aro_fallo`: el mismo golpe al principio, y después el swish o el segundo toque.

No hay GIF con Sophie y Alana en este lote: es solo audio.

## Decisiones que tomé sin preguntar

1. **Los nombres:**
   - `carnaval_quilla`, `playa_margarita` y `dalat_niebla`, los del pedido.
   - `red_voley`, `rebote_balon` y `chapa`, como en la lista del pedido.
   - `aro_basket` y no `aro_basquet`, para que case con `balon_basket` y `Basket.ts` del juego.
2. **Sumé `aro_fallo`.** El juego tiene dos casos en `llegaAlAro()`: entra o rebota. Un solo sonido con el swish no sirve para el tiro que se sale. Los dos arrancan igual, así que suenan al mismo aro.
3. **Margarita es música oriental margariteña y no calipso.** El calipso es de El Callao, en Bolívar, y la bandolina con el cuatro es el sonido de la isla. Hice un polo y un galerón en el mismo tema para que tenga dos caras, una cadenciosa y una viva. Va a 144 en 3/4, más lento que `pana_dale` (180) y sin arpa, para que no se confunda con el joropo de Caracas.
4. **Le puse las olas al tema de Margarita,** muy suaves. Si después llega el ambiente `playa` y el juego toca los dos, se pueden bajar o quitar del tema.
5. **Barranquilla lleva caña de millo y no gaita.** El millo es el sonido de la cumbia de carnaval. La gaita larga es más de los Montes de María y ya hay una "gaita" (la zuliana) en el juego. La papayera entra en la segunda mitad, así cupo todo lo que pidió Rick.
6. **El tambor alegre improvisa con semilla:** el patrón cambia en cada compás, pero sale igual siempre.
7. **Đà Lạt en Fa mayor pentatónico,** para no repetir el Re de `saigon_chay` ni el Mi menor de `hoian_noche`, que también usan đàn tranh y sáo. Es un vals sin batería.
8. **Los largos (33.1, 40 y 37.5 s) no repiten ninguno de los 9 temas de los mundos.** Así se distinguen también por el largo en la prueba.
9. **Maracaibo no lleva tema nuevo:** `gaita_lago` ya es de Maracaibo.
10. **El código va en un archivo nuevo, `pelota.ts`,** para no seguir creciendo `mundos.ts`. Comparte los instrumentos de H2 (tambora, maracas, rasgueo del cuatro, sáo, guacharaca).
11. **Los recortes para aprobar y el formato van igual que en H2:** WAV para los efectos, OGG y M4A para los temas, el final pegado al principio.

## Límites honestos

- **No lo pude oír.** Lo revisé con espectrogramas y con las pruebas de forma (altura, volumen, bucle, saturación y brillo), pero lo que decide es el oído de Rick. Si un tema o un efecto no tiene el carácter, se ajusta ese solo.
- **Es chiptune, no grabación.** La caña de millo, las trompetas, la bandolina y el đàn tranh son ondas cuadradas y cuerdas punteadas sintetizadas. Se reconocen por el ritmo y el adorno (los trinos del millo, el trémolo de la bandolina, el "nhấn" del đàn tranh), no por el timbre de verdad.
- **El swish es ruido filtrado** y el aro son cuatro parciales de hierro. Suena a consola, no a cancha grabada.
- **El polo y el galerón están simplificados:** la forma y el rasgueo se reconocen, pero no siguen las décimas ni el canto, que es lo que más los define.
- **La bandolina en trémolo hace que `playa_margarita` sea el tema que más tarda en sintetizar** (unos 2.2 s), sin pasarse.
- **El M4A no lo pude tocar en este Chromium,** que no trae AAC, igual que en H1b y H2. Hay que oírlo en el iPad.

## Lo que necesita el siguiente lote

- **El juego:**
  - Poner `bucle()` con el tema de su mundo en Voley, Tenis, Futbol, Basket y Chapita, en vez de `chip.play(PELEA)`.
  - `red_voley`, `rebote_balon`, `aro_basket`, `aro_fallo` y `chapa` donde dice arriba.
  - Sumar al `kit.config.json` los 8 nombres nuevos.
- **Lo que queda del audio del pedido:**
  - Música: `cafe_neblina`, `vestuario` y `acorde_<equipo>`.
  - Efectos: chapuzón, brazada, bola que revienta, ventana rota, megáfono, perro, moto con corneta, camionetica, buseta, chicharras, ranas, trueno, paraguas, abanico, furro, salida de natación, garrocha y martillo girando.
  - Los 15 ambientes de 12 s.
  - Todo eso se puede pedir desde ya en el `kit.config.json`: sale como aviso en `manifest.pendiente` hasta que llegue.
- **Base:** esta rama sale de la del lote H2 (https://github.com/Lothra2/pixel_forja/pull/30), que todavía no está unida. Hay que unir H2 primero.
