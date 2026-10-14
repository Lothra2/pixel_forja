# Lote H5: los efectos de la natación y la garrocha
Estado: entregado, pendiente de Rick
PR: (se llena al abrirlo)
Fecha: 2026-10-14

## Qué se hizo

Los cuatro efectos que pidió el juego, sintetizados con código en `src/engine/audio/atletismo.ts`, con el mismo método de H2, H3 y H4 y sin muestras de nadie. Cada uno tiene su semilla y sale igual siempre.

| Efecto | Dónde va | Duración | Cómo suena |
|---|---|---|---|
| `salida_natacion` | El ¡YA! de `Natacion.ts` | 0.58 s | La bocina electrónica de la salida: un "biiip" áspero con el zumbido del parlante, un tono fijo de unos 415 Hz con sus armónicos |
| `chapuzon` | El evento `impacto` de `dive` (cuadro 6) | 0.84 s | El cuerpo que pega plano contra el agua, el agua que se abre con un "shhh" grave, las burbujas que suben y las gotas que caen de vuelta |
| `brazada` | El evento nuevo `brazada` de los nados | 0.32 s | La mano que entra al agua ("plof"), el jalón y dos o tres burbujas. Corta, para tocarla en cada brazada sin que se tapen |
| `garrocha` | El evento `despegue` de `pole_vault`, el `CLAVA` de `Azoteas.ts` | 0.67 s | La punta que se clava en la cajita con un golpe de metal, la pértiga de fibra que se dobla con un "uuum" que sube, y el latigazo cuando se endereza. El latigazo cae 1/3 s después, justo en `suelta` |

**El evento nuevo `brazada`** (en `swim.ts`, los nados premium): dice en qué cuadro entra la mano al agua, para que el juego toque el sonido justo ahí.
- `swim` (crol) y `swim_back` (espalda): cuadros 0 y 4, una mano y la otra.
- `swim_breast` (pecho): cuadro 5, cuando los brazos se estiran y la cabeza vuelve al agua.
- `swim_fly` (mariposa): cuadro 0, las dos manos juntas.
- Es un campo nuevo en `eventos`: no cambia ningún dibujo ni ningún evento de antes. El clavado sigue con `despegue` en el 3 e `impacto` en el 6.

**En el kit a medida y el estudio:**
- Los 4 nombres entran al catálogo del motor (`catalogo.ts`). Con eso:
  - el kit los exporta en `audio.sfx`,
  - el esquema y la validación los conocen,
  - no salen en `manifest.pendiente`,
  - y el estudio los muestra en **Audio del juego** sin tocar la página.
- El ejemplo `docs/ejemplos/nekketsu/kit.config.json` los pide.
- La nota del manifiesto deportivo nombra el evento `brazada`.

## Cómo se usa (estudio y kit)

En el `kit.config.json` del juego, sumar los cuatro a `audio.sfx`:

```json
"sfx": [..., "chapuzon", "brazada", "salida_natacion", "garrocha"]
```

**Lo que tiene que conectar el juego:**
- **Natación (`Natacion.ts`):**
  - En el ¡YA!: `this.sound.play('salida_natacion')`. Hoy suena el `chip.blip` de la base, que es el mismo de todas las pruebas.
  - En el `impacto` del clavado: `this.sound.play('chapuzon', ...)` en vez de `esquiva` con `rate: 0.6`.
  - Mientras nada: en cada cuadro que trae un evento `brazada` en `swim` o `swim_fly`, `this.sound.play('brazada', { volume: 0.3, rate: 0.95 + Math.random() * 0.1 })`. Solo para el humano o el que está cerca de la cámara: cuatro nadadores a la vez se vuelven ruido. Variar un poco el `rate` evita que suene a máquina.
- **Azoteas (`Azoteas.ts`):** en el `CLAVA`, `this.sound.play('garrocha', ...)` en vez de `esquiva`. El latigazo cae solo 1/3 s después, cuando la animación llega a `suelta`.

## Pruebas

- **Prueba nueva `h5.test.ts`, 7 casos:**
  - Los cuatro están en el catálogo, no van en bucle y ninguno pisa un nombre que ya existía.
  - Son cortos, arrancan en los primeros 10 ms, no saturan (pico 0.85), no tienen huecos mudos y no arrastran silencio.
  - **Cada uno tiene su forma:**
    - La bocina es un tono fijo y claro entre 380 y 460 Hz, igual al principio y al final, y fuerte todo el rato.
    - La garrocha sube de tono mientras la pértiga se dobla (de menos de 100 Hz a más de 1.4 veces eso), y el latigazo agudo cae en `suelta` de `pole_vault`, ni antes ni después. La prueba lee los eventos de la animación, así que si un día cambian, avisa.
    - El chapuzón sigue sonando con burbujas y gotas después del golpe, y dura más del doble que la brazada.
  - **Cada efecto es distinto,** también de `esquiva`, `golpe`, `pistola`, `silbato`, `romper`, `paso_agua_0`, `red_voley` y `chapa`, por duración, brillo y volumen. `esquiva` y `golpe` son los que el juego usa hoy en esas jugadas.
  - **El evento `brazada`:** en las cuatro animaciones de nado, en sus cuadros, y llega al manifiesto del kit. Una brazada cabe entre dos manos del crol. El clavado sigue con sus eventos de siempre.
  - Deterministas, y el kit los exporta sin pendientes, con `escuchar.html`.
- (se llena con la corrida final)

## Para aprobar (todo en esta carpeta)

- **`escuchar.html`:** toca cada efecto con un clic, o todo en orden con "Tocar todo". Abre directo desde la carpeta o la tablet, sin servidor.
- **`sfx/*.wav`:** los 4 efectos, tal cual salen en el kit.
- **`sfx/secuencia_natacion.wav`, 5 s:** la salida completa como sonaría en el juego. La bocina, el chapuzón en el impacto del clavado (que reacciona a los 0.25 s) y nueve brazadas al ritmo del crol, una cada 0.4 s. Es la mejor forma de oír si la brazada cansa repetida.

Qué oír:
- Que la bocina se reconozca como la de la piscina y no como el ¡YA! de siempre.
- Que la brazada repetida no canse. Si cansa, se acorta o se le baja el "plof".
- En la garrocha, que el "uuum" de la pértiga se oiga como algo que se dobla y no como un motor.

## Decisiones que tomé sin preguntar

1. **"Salida de natación" es la bocina electrónica de la salida,** no el empujón del poyete. En las competencias de verdad la salida no es con pistola: es esa bocina, y es lo que más dice "piscina". El clavado ya suena con el chapuzón.
2. **Sumé el evento `brazada` a los nados.** Sin él, el juego tendría que adivinar en qué cuadro entra la mano, y la brazada sonaría corrida. Es un campo nuevo y no quita nada.
3. **La garrocha va en un solo sonido** que arranca en el `despegue` y trae el latigazo justo en la `suelta`. Así el juego toca uno solo y queda sincronizado.
4. **Una sola `brazada`, no varias.** El juego la varía con el `rate` y el volumen. Si se oye repetida, hago dos o tres variantes.
5. **El código va en `atletismo.ts`,** junto a la música de Hạ Long y Apure de H4. Los 4 temas de H4 salen iguales, muestra por muestra.

## Límites honestos

- **No lo pude oír.** Lo revisé con espectrogramas y con las pruebas de forma, pero lo que decide es el oído de Rick. Si un efecto no tiene el carácter, se ajusta ese solo.
- **El agua es ruido filtrado y burbujas sintetizadas.** Suena a agua de videojuego, no a piscina grabada.
- **La bocina es un tono fijo.** Las bocinas de verdad cambian de una competencia a otra. Esta es áspera y aguda para que se distinga del ¡YA!.
- **La sincronía de la garrocha depende de que el juego toque el sonido en el `despegue`.** Si lo toca en otro cuadro, el latigazo cae corrido.

## Lo que necesita el siguiente lote

- **El juego:** conectar los cuatro donde dice arriba y sumarlos al `kit.config.json`.
- **Lo que queda del audio del pedido:**
  - Efectos: bola que revienta, ventana rota, megáfono, perro, moto con corneta, camionetica, buseta, chicharras, ranas, trueno, paraguas, abanico, furro y martillo girando.
  - Los 15 ambientes de 12 s.
  - Con E6 hay dos que ahora pegan directo: `ventana_rota` para la Chapita (la ventana que se rompe) y el ambiente de cada escenario nuevo.
