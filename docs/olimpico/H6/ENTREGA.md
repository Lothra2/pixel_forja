# Lote H6: los ambientes del mar, el cafetal y el llano
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/38
Fecha: 2026-10-14

## Qué se hizo

Los tres primeros ambientes de 12 s de los mundos que ya tienen escenario, en el orden que pidió el juego. Sintetizados con código en `src/engine/audio/ambience.ts`, junto a los seis de antes, con el mismo método: 12 s en bucle, el final fundido con el principio y el pico en 0.5 para que todos suenen parejo.

| Ambiente | Mundos | Qué se oye |
|---|---|---|
| `mar` | Hạ Long (Natación) y Margarita (Vóley Playa) | <ul><li>Un rumor grave que no para.</li><li>Tres olas en los 12 s: cada una crece, revienta con un golpe ancho que se apaga despacio y se devuelve siseando por la arena.</li><li>Una gaviota que llama dos veces seguidas y otra más tarde.</li><li>La última ola cae justo en el empalme, así que la vuelta no se nota.</li></ul> |
| `cafetal` | Cocora (Vallas) | <ul><li>La brisa fresca de la montaña, que respira despacio.</li><li>Pájaros que silban en frases cortas, de 2 a 5 notas que suben o bajan.</li><li>La bandada de loros que pasa graznando, a los 3 s y otra vez a los 10 s.</li><li>Una vaca a lo lejos a los 6.4 s, como las del escenario.</li></ul> |
| `llano` | Apure (Jabalina) | <ul><li>El viento abierto de la sabana, con ráfagas largas.</li><li>Las chicharras del atardecer, que crecen y bajan dos veces sin callarse nunca.</li><li>El alcaraván, el pájaro del llano al atardecer: "cá-cá-cá-cáaa", a los 2.6 s y a los 8.9 s.</li><li>El ganado a lo lejos, más grave que la vaca de Cocora.</li></ul> |

**En el kit a medida y el estudio:**
- Los 3 nombres entran a la lista de ambientes del motor. Con eso:
  - el kit los exporta en `audio/ambiente/`,
  - el esquema y la validación los conocen,
  - no salen en `manifest.pendiente`,
  - y el estudio los muestra en **Audio del juego** sin tocar la página.
- El ejemplo `docs/ejemplos/nekketsu/kit.config.json` los pide en `audio.ambientes`. Con `"formato": "comprimido"` salen en OGG y M4A a 48 kbps, unos 70 KB cada uno.
- Los seis ambientes de antes salen iguales, muestra por muestra: lo comparé con `main`.
- **Archivos sueltos:** son 3 sonidos, uno por ambiente en la copia del artifact.

## Cómo se usa (estudio y kit)

En el `kit.config.json` del juego, sumar a `audio`:

```json
"ambientes": ["mar", "cafetal", "llano"]
```

**Lo que tiene que conectar el juego:** en cada prueba, el ambiente en bucle debajo de la música, más bajito que ella (cerca de 0.3).
- `Natacion.ts` y `Voley.ts`: `this.sound.play('mar', { loop: true, volume: 0.3 })`.
- `Vallas.ts`: `cafetal`.
- `Jabalina.ts`: `llano`.
- Al salir de la escena se para con la música. Si se quiere que no suene siempre igual al entrar, se puede arrancar en un punto al azar (`seek` entre 0 y 12).

## Pruebas

- **Prueba nueva `h6.test.ts`, 8 casos:**
  - Los tres están en la lista del motor, después de los seis de antes, y ninguno pisa un nombre.
  - Duran 12 s exactos, van en bucle, el pico queda en 0.5, no tienen componente continua y ningún medio segundo queda mudo.
  - **El bucle empalma sin corte:** el salto del final al principio es más chico que el 99 % de los saltos del sonido, y el primer y el último segundo suenan como el resto.
  - **El mar trae sus tres olas:** cada una suena más del doble de fuerte que la calma de antes de la siguiente.
  - **Cada mundo tiene sus animales,** medidos por la altura:
    - La vaca de Cocora: un mugido claro entre 120 y 170 Hz.
    - El ganado del llano: entre 115 y 150 Hz, más grave que la vaca.
    - El alcaraván: dos veces, entre 1100 y 1400 Hz.
    - Las chicharras: cada segundo del llano trae agudo, más que cualquier segundo del cafetal o del mar.
  - **Cada ambiente nuevo es distinto** de los otros dos y de los seis de antes, por brillo, cuánto cambia el volumen, nivel y agudos.
  - Deterministas, y el kit los exporta en bucle, de 12 s, sin pendientes y con `escuchar.html`.
- **Los seis ambientes de antes salen iguales a `main`, muestra por muestra.** Lo comparé con un hash de cada uno en las dos ramas.
- **La suite sin `custom.test.ts`:** 43 archivos, 451 de 451.
- **`custom.test.ts`: 14 de 15.** Falla `se genera en menos de 5 minutos`: 340 s. Pasa lo mismo que en E6 y H5: en esta máquina, `main` ya tarda entre 327 y 364 s. Los tres ambientes suman unos segundos (la síntesis y ffmpeg). No subí el límite de 300 s: es tuyo.
- **El esquema** `docs/kit-a-medida.schema.json` está regenerado.
- **`tsc` limpio y `npm run build:sitio` limpio.** El kit del sitio sale con los tres ambientes comprimidos y sin `pendiente`.
- **e2e de Playwright: 50 de 50.**

## Para aprobar (todo en esta carpeta)

- **`escuchar.html`:** toca cada ambiente con un clic, o todo en orden con "Tocar todo". Abre directo desde la carpeta o la tablet, sin servidor. Lo probé en Chromium: carga sin errores y los OGG traen sus 12 y 24 s.
- **`ambiente/<n>.ogg` y `.m4a`:** los tres ambientes de 12 s.
- **`ambiente/<n>_dos_vueltas.ogg` y `.m4a`, 24 s:** el mismo ambiente dos veces seguidas. A los 12 s se oye el empalme del bucle: ahí no tiene que haber salto, corte ni cambio de volumen. La página corta los bucles a 8 s, por eso van estos aparte.
- La página elige el OGG o el M4A según lo que toque el navegador. El M4A es para el Safari del iPad.

Qué oír:
- Que el mar se reconozca como olas y no como ruido de radio.
- Que en el cafetal los pájaros y los loros no tapen la brisa, y que la vaca se oiga lejos.
- Que las chicharras del llano no cansen. Si cansan, se bajan.

## Decisiones que tomé sin preguntar

1. **Un solo `mar` para Hạ Long y Margarita,** como lo pidió el juego. Las olas son medianas: más de lo que da la bahía de Hạ Long, que es mansa, y menos que la rompiente de Playa El Agua. Si se quiere distinguir, salen dos (`bahia` y `playa`) con el mismo código.
2. **Los animales son los del escenario:** las vacas y los loros de Cocora y el ganado de Apure. El alcaraván no está pintado, pero es el sonido del llano al atardecer.
3. **Las chicharras van en el llano y no en el cafetal,** que es de mañana y fresco.
4. **Todo en `ambience.ts`,** junto a los seis de antes, con sus ayudantes nuevos: un pasa altos, una voz con armónicos para aves y animales, y el graznido del loro.
5. **El nivel es el mismo de los otros ambientes** (pico en 0.5). El juego los baja con el volumen.

## Límites honestos

- **No lo pude oír.** Lo revisé con espectrogramas y con las pruebas de forma, pero lo que decide es el oído de Rick.
- **Es síntesis, no grabación.** Las olas son ruido rosa filtrado con su envolvente, y las aves son tonos con armónicos. Se reconocen por la forma, no por el timbre de verdad.
- **12 s es corto para un bucle.** En una prueba de 2 o 3 minutos, el que pone atención oye que la gaviota y el alcaraván llaman siempre en el mismo segundo. Arrancar en un punto al azar lo disimula.
- **El M4A no lo pude tocar en este Chromium,** que no trae AAC. Hay que oírlo en el iPad.

## Lo que necesita el siguiente lote

- **El juego:** conectar los tres donde dice arriba y sumarlos al `kit.config.json`.
- **Los ambientes que siguen,** de los mundos con escenario: la ciudad amurallada de Cartagena, el barrio de Caracas, el patio del liceo, las calles de Saigón, la Comuna 13, el carnaval de Barranquilla, Đà Lạt y Maracaibo.
- **Los efectos que quedan:** ventana rota, bola que revienta, megáfono, perro, moto con corneta, camionetica, buseta, chicharras sueltas, ranas, trueno, paraguas, abanico, furro y martillo girando.
