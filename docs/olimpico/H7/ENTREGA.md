# Lote H7: los ambientes del resto de los mundos y el acorde de cada equipo
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/39
Fecha: 2026-10-14

## Qué se hizo

Las dos primeras partes del pedido: los 10 ambientes de 12 s que faltaban y un acorde corto de victoria por cada uno de los 6 equipos. Todo sintetizado con código y sin muestras de nadie. Cada sonido sale igual siempre. Las animaciones van en otro lote (B4B6), con su propio PR: son otro trabajo y se aprueban mirando, no oyendo.

**Los 10 ambientes.** Usé los nombres del pedido donde el pedido los traía: `trafico_saigon`, `llovizna_bogota`, `lago_noche`, `azotea_noche`, `comuna` y `liceo`. Los otros cuatro son nuevos.

| Ambiente | Mundo | Qué se oye |
|---|---|---|
| `trafico_saigon` | La calle de Saigón | <ul><li>El río de motos que no para: catorce que pasan, cerca y lejos, algunas acelerando.</li><li>Las bocinas que se contestan.</li><li>El parlante del pan, "bánh mì nóng giòn đây", con los tonos del vietnamita.</li></ul> |
| `hoian_noche` | Hội An de noche | <ul><li>El río que lame los botes, los grillos y las ranas del arrozal ("ộp ộp").</li><li>Un sampán que pasa remando.</li><li>Un tambor del festival lejos y turistas que conversan.</li></ul> |
| `llovizna_bogota` | La Candelaria | <ul><li>La llovizna fina con sus gotitas.</li><li>Alguien que camina por el adoquín mojado, las palomas y dos campanadas de la iglesia.</li><li>En la cancha de tejo de la esquina revientan una mecha, y se oye el "¡eso!".</li></ul> |
| `lago_noche` | La cancha de Maracaibo | <ul><li>El calor quieto, los insectos de la noche y el lago que apenas se mueve.</li><li>El trueno del relámpago del Catatumbo, muy lejos.</li><li>Uno que bota el balón, con el chirrido de las zapatillas.</li></ul> |
| `azotea_noche` | La azotea de Caracas | <ul><li>La ciudad que zumba abajo.</li><li>Los sapitos de la noche caraqueña, ese "tink" de vidrio.</li><li>Dos perros del cerro que se contestan, un helicóptero que cruza y una moto que sube la avenida.</li></ul> |
| `atardecer_cartagena` | Cartagena | <ul><li>La brisa del mar entre las casas.</li><li>El coche de caballos al trote por el adoquín.</li><li>La palenquera que pregona "¡alegría, cocadita!".</li><li>El picó de una casa, que retumba a través de la pared.</li></ul> |
| `comuna` | La Comuna 13 | <ul><li>El boom bap del parlante de los bailarines y el zumbido de las escaleras eléctricas.</li><li>La gente, y los aplausos cuando el b-boy remata.</li><li>Un perro y una moto que sube la loma.</li></ul> |
| `carnaval` | El carnaval de Barranquilla | <ul><li>El gentío.</li><li>La comparsa que se acerca y se va con tambora, llamador, alegre y maracas.</li><li>Los pitos, el grito cuando pasa la reina y la pólvora.</li></ul> |
| `pinos_dalat` | Los pinos de Đà Lạt | <ul><li>El susurro alto de las agujas y el viento fresco más abajo.</li><li>El chào mào ("chít-chít-chào-mào") y el tu hú lejos.</li><li>Una moto que baja la loma.</li></ul> |
| `liceo` | El patio del liceo | <ul><li>Los niños del recreo que gritan y corren: "¡pásala!", "¡aquí!", las risas.</li><li>El balón de goma contra el piso y la pared.</li><li>Todo con el eco del techo.</li></ul> |

**Cómo están hechos:**
- El fondo (tráfico, agua, viento, lluvia, insectos) se funde en el empalme como los ambientes de antes.
- Lo que pasa (motos, perros, campanas, gente, tambores) va en una capa de 12 s exactos que da la vuelta. Así un perro que ladra justo en el empalme suena entero, ni doble ni a medias.
- Al final les quito lo que está por debajo de 70 Hz. Un parlante de teléfono no lo toca, y como todos los ambientes se igualan por el pico, solo le quitaba volumen a lo que sí se oye.
- El código va en `src/engine/audio/ambienteMundos.ts`. Las piezas de siempre (ruido rosa, filtros, voces de aves) pasaron a `ambienteBase.ts` sin cambiar nada: los 9 ambientes de antes salen iguales, muestra por muestra.

**Los 6 acordes de victoria**, `acorde_<equipo>`: 4 compases cortos, entre 3.9 y 5.2 s, sin bucle. Cada uno en el estilo de su gente y rematando en la tónica.

| Acorde | Equipo | Qué es | Dura |
|---|---|---|---|
| `acorde_familia` | Familia GG | Fanfarria en Sol mayor con el cuatro venezolano. La melodía cierra con dos Sol, uno grave y uno agudo: "G, G". Y Thor ladra al final, con el mismo `ladrido` del kit | 4.8 s |
| `acorde_instituto` | Instituto Nekketsu | Rock japonés de los 80, como su tema: power chords en La menor, Fa y Sol, y el remate en La mayor con el bend y el platillo | 3.9 s |
| `acorde_rong` | Rồng Sài Gòn | El đàn tranh sube en pentatónica, la sáo lo dobla, repican los tambores del festival y cierra el gong | 5.2 s |
| `acorde_rolos` | Rolos de Chapinero | Torbellino andino en 3/4: la quena, el tiple rasgueado en octavas, el bombo andino y el chucho | 4.7 s |
| `acorde_panas` | Los Panas de Caracas | Joropo, como `pana_dale`: el arpa con su bordón, el cuatro y las maracas, que se callan de golpe en el remate | 4.5 s |
| `acorde_maracuchos` | Maracuchos del Lago | Gaita zuliana en 6/8, como `gaita_lago`: el coro en terceras, furro, tambora y charrasca, y el remate en La mayor | 4.7 s |

**El acorde va en la ficha de cada equipo.** En `docs/ejemplos/nekketsu/equipos.json` cada equipo trae ahora `"musica": "acorde_<equipo>"`, como el manifiesto del pedido (`"musica": "acorde_familia"`). Es un campo nuevo que pasa al manifiesto tal cual. No le quité nada a los equipos.
- La validación revisa que esa música exista en el motor y sugiere el nombre si está mal escrito.
- Si un equipo pide un acorde que no va en `audio.musica`, el kit avisa: el juego no lo encontraría.

**En el kit a medida y el estudio:** los 16 nombres entran al catálogo del motor. El kit los exporta, el esquema y la validación los conocen, no salen en `manifest.pendiente` y el estudio los muestra en **Audio del juego** sin tocar la página. El ejemplo `kit.config.json` los pide todos.

## Cómo se usa (estudio y kit)

En el `kit.config.json` del juego, sumar a `audio`:

```json
"musica": [..., "acorde_familia", "acorde_instituto", "acorde_rong", "acorde_rolos", "acorde_panas", "acorde_maracuchos"],
"ambientes": [..., "trafico_saigon", "hoian_noche", "llovizna_bogota", "lago_noche", "azotea_noche", "atardecer_cartagena", "comuna", "carnaval", "pinos_dalat", "liceo"]
```

Y en el `equipos.json`, a cada equipo, su `"musica"`, como en el ejemplo.

**Lo que tiene que conectar el juego:**
- **Los ambientes,** con el `this.ambiente(n)` que ya existe desde H6. Así quedan repartidos:

  | Prueba o escena | Ambiente |
  |---|---|
  | Cross Country en Saigón | `trafico_saigon` |
  | Tama-wari | `hoian_noche` |
  | Tejo | `llovizna_bogota` |
  | Básquet | `lago_noche` |
  | La pelea en la azotea de Caracas | `azotea_noche` |
  | Azoteas de Cartagena | `atardecer_cartagena` |
  | Cross Country de Medellín | `comuna` |
  | Fútbol | `carnaval` |
  | Tenis | `pinos_dalat` |
  | Quemado | `liceo` |

  Lo que diga el juego manda: yo solo veo los escenarios, no las escenas.
- **El acorde:** en el fin de cada prueba y en la pelea, donde hoy suena `chip.play(VICTORIA)`, tocar `m.equipos[ganador].musica` si el kit lo trae. Si no, que siga la `VICTORIA` del chip. Son cortos y no van en bucle, así que se cargan como un efecto y no con `bucle()`.

## Pruebas

- **Prueba nueva `h7.test.ts`, 14 casos:**
  - Los 10 ambientes y los 6 acordes están en el catálogo, después de lo de antes, y ninguno pisa un nombre.
  - **Ambientes:**
    - Duran 12 s exactos, van en bucle y el pico queda en 0.5. No tienen componente continua y ningún medio segundo queda mudo.
    - **El bucle empalma sin corte:** el salto del final al principio es más chico que el 99 % de los saltos del sonido, y el primer y el último segundo suenan como el resto.
    - **Suenan en un parlante de teléfono:** más de la mitad de la energía cae entre 150 Hz y 6 kHz.
  - **Cada mundo tiene lo suyo, medido:**
    - Las bocinas de Saigón suenan tres veces más que el tráfico de antes.
    - La campana de La Candelaria se queda sonando después del golpe.
    - Las aspas del helicóptero de Caracas golpean 17 veces por segundo mientras cruza, y antes no.
    - Los tambores del carnaval se repiten cada 0.5 s, a 120.
    - El parlante de la Comuna 13 se repite cada 0.6 s, a 100.
    - En la calle de Saigón y en el patio del liceo nada lleva ritmo.
    - Los pinos de Đà Lạt son lo más agudo de los diez.
  - **Cada ambiente es distinto** de los otros nueve y de los nueve de antes, por brillo, cuánto cambia el volumen, nivel, agudos y medios.
  - **Acordes:**
    - Duran entre 3 y 5.5 s, arrancan en los primeros 20 ms, no van en bucle y no saturan. El último acorde suena y se apaga sin cortarse en seco.
    - **Cada uno remata en la tónica de su equipo:** el bajo del último compás es Sol, La o Re, según el caso.
    - **El de la Familia cierra con el ladrido de Thor:** el `ladrido` del kit aparece en el remate, a los 3.9 s.
    - Cada acorde es distinto de los otros y de `victoria` y `victoria_banda`.
  - **Los equipos:** el ejemplo pide el acorde de cada uno. La validación rechaza un nombre mal escrito y sugiere el bueno, y el kit avisa si el acorde de un equipo no va en `audio.musica`.
  - Deterministas, y el kit los exporta: los ambientes en bucle, los acordes sin bucle, sin pendientes y con `escuchar.html`.
- **Lo de antes sale igual a `main`, muestra por muestra.** Lo comparé con un hash en las dos ramas: los 9 ambientes de antes y los temas que usan las piezas que ahora se exportan (`gaita_lago`, `tema_instituto`, `pana_dale` y `victoria_banda`).
- **La suite sin `custom.test.ts`:** 44 archivos, 465 de 465.
  - `h6.test.ts` pedía que la lista de ambientes terminara en `llano`. La ajusté para que revise que los 9 de antes siguen primero y en su orden, y la volví a correr en verde.
- **`custom.test.ts`: 15 de 15,** incluida "se genera en menos de 5 minutos". En E6, H5 y H6 esa fallaba por la máquina. Hoy pasó con los 16 sonidos nuevos dentro.
- **El esquema** `docs/kit-a-medida.schema.json` está regenerado.
- **`tsc` limpio y `npm run build:sitio` limpio.**
- **e2e de Playwright: 50 de 50.**

## Para aprobar (todo en esta carpeta)

- **`escuchar.html`:** toca cada sonido con un clic, o todo en orden con "Tocar todo". Abre directo desde la carpeta o la tablet, sin servidor. Lo probé en Chromium: carga sin errores, con sus 26 botones, y los OGG traen sus 12, 24 y 4.8 s.
- **`acordes/`:** los 6 acordes.
- **`ambiente/<n>`:** los 10 ambientes de 12 s.
- **`ambiente/<n>_dos_vueltas`, 24 s:** el mismo ambiente dos veces seguidas. A los 12 s se oye el empalme: ahí no tiene que haber salto, corte ni cambio de volumen.
- La página elige el OGG o el M4A según lo que toque el navegador. El M4A es para el Safari del iPad.

Qué oír:
- **Saigón:** que las motos se oigan como motos y no como un zumbido.
- **Los pregones** (el pan de Saigón, la palenquera) y la gente: son sílabas, no palabras. Que se entienda la intención.
- **El acorde de la Familia:** si el "G, G" y el ladrido de Thor te gustan o sobran.
- **El carnaval y la Comuna 13:** si los tambores y el parlante pelean con el tema del mundo cuando suenan juntos. Si pelean, los bajo o los quito.

## Decisiones que tomé sin preguntar

1. **Partí el pedido en dos lotes.** Audio (H7) y animaciones (B4B6) son trabajos distintos y se aprueban distinto. Dos PR chicos se revisan mejor que uno grande.
2. **Los nombres del pedido donde existían** (`trafico_saigon`, `llovizna_bogota`, `lago_noche`, `azotea_noche`, `comuna`, `liceo`). Para los que no estaban usé el lugar y la hora: `hoian_noche`, `atardecer_cartagena`, `carnaval` y `pinos_dalat`. `hoian_noche` se llama igual que el tema de Hội An, pero van en secciones distintas y el juego ya las separa (`amb_` y `mus_`).
3. **La cancha de Maracaibo es de noche, junto al lago,** porque el juego le pinta el relámpago del Catatumbo. Por eso `lago_noche`, el nombre del pedido.
4. **Sin melodías en los ambientes.** El tema del mundo suena encima y chocarían. Lo único con ritmo son la comparsa del carnaval, el parlante de la Comuna 13 y el picó de Cartagena, lejos y bajitos.
5. **Los acordes son de 4 compases cortos.** El pedido decía 4 compases y tú dijiste "corto". Con compases de dos tiempos (de tres en los de 3/4 y 6/8) quedan entre 3.9 y 5.2 s.
6. **Thor ladra en el acorde de la Familia,** porque es la mascota y es lo que hace a la Familia distinta de los otros cinco. Si sobra, se quita en una línea.
7. **El acorde va en la ficha del equipo** (`equipos.<id>.musica`), como en el manifiesto del pedido. El juego no tiene que llevar una tabla aparte.
8. **El barrio de Caracas (Chapita), el dojo de Hà Nội y el parque Tao Đàn no están en tu lista,** así que no les hice ambiente. Chapita puede usar `trafico_saigon` bajito o quedarse sin ambiente. Si quieres los tres, van en el próximo lote de audio.

## Límites honestos

- **No lo pude oír.** Lo revisé con espectrogramas, con el reparto de la energía por bandas y con las pruebas de forma. Lo que decide es el oído de Rick.
- **Es síntesis, no grabación.** Las motos son explosiones filtradas, la lluvia es ruido con gotitas y las aves son tonos con armónicos. Se reconocen por la forma, no por el timbre de verdad.
- **La gente no dice nada.** El murmullo, los gritos del recreo y los pregones son sílabas con sus vocales, no palabras. La voz hablada sigue fuera, como en el pedido.
- **12 s es corto para un bucle.** En una prueba de 2 o 3 minutos, el que pone atención oye que la campana o el helicóptero pasan siempre en el mismo segundo. El `azar` que ya usa el juego al arrancar lo disimula.
- **El M4A no lo pude tocar en este Chromium,** que no trae AAC. Hay que oírlo en el iPad.
- **⚠ Archivos sueltos: son 16 sonidos,** 10 ambientes y 6 acordes. Si la copia del artifact va por 503 de 511 (los 500 de antes más los 3 de H6), no caben todos. Hay que decidir juntos qué entra. Mi propuesta: los 6 acordes primero, porque los usan todas las pruebas, y los ambientes de las pruebas que más se juegan.

## Lo que necesita el siguiente lote

- **El juego:** conectar los ambientes y los acordes donde dice arriba, sumar los nombres al `kit.config.json` y la `musica` a cada equipo.
- **B4B6, las animaciones de este mismo pedido,** van en su propio PR: `vault_fail`, `dodge_jump`, `bat_swing` con su `bat_stance`, `tejo_throw` y las de judo.
- **Lo que queda del audio:** `vestuario` (tranquilo), los ambientes de Chapita, el dojo y Tao Đàn si los quieres, y los efectos: ventana rota, bola que revienta, megáfono, perro, moto con corneta, camionetica, buseta, chicharras sueltas, ranas, trueno, paraguas, abanico, furro y martillo girando.
