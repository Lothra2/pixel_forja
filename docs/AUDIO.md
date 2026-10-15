# Audio del juego

Toda la música, los efectos, los ambientes y las voces del motor, sintetizados con código en WAV de 16 bits mono a 22050 Hz. Cada sonido sale igual siempre, se pida solo o junto a otros.

- **En el estudio:** Inicio, **Audio del juego**.
  - Cada sonido, por sección, con su botón.
  - Un probador de voces: escribes una frase y la dice en blips con el tono y el timbre que elijas.
- **En el kit a medida:**

```jsonc
"audio": {
  "sfx": ["pistola", "silbato", "golpe_1", "golpe_pesado", "publico_grito"],   // o true: todos
  "musica": ["marcha_nekketsu", "saigon_chay", "azotea_final", "victoria_banda", "derrota"],
  "ambientes": ["agua", "mar"],
  "voces": ["rick", "steph", "sophie", "alana", "locutor"]                    // o true, o { "locutor": { "tono": 0.8, "timbre": "sierra" } }
}
```

Sale cada sonido en `audio/sfx/`, `audio/musica/`, `audio/ambiente/` y `audio/voz/`. Cada uno trae su entrada en `manifest.audio` con `archivo`, `duracion` y `bucle`.

Además sale **`audio/escuchar.html`**:
- Tiene cada sonido con su botón, "Tocar todo" en orden y el probador de voces.
- Abre directo desde la carpeta o la tablet, sin servidor.
- En el sitio está el del kit de ejemplo de Nekketsu: `kit_nekketsu/audio/escuchar.html`.

## Música

| Id | Qué es | Duración | Bucle |
|---|---|---|---|
| `marcha_nekketsu` | Marcha de banda escolar en Si bemol a 132 bpm. Trompeta en onda cuadrada con la segunda voz en terceras, tuba con "um-pa", contratiempos de metales, redoblante con redobles al cierre de cada frase, bombo, platillos y glockenspiel en la última vuelta. Forma: redoble, A, A', B (trío en Mi bemol) y A final | 60 s exactos | Sí, sin corte |
| `saigon_chay` | Tema vietnamita en Re pentatónico a 116 bpm. Đàn tranh punteado con "nhấn" (la cuerda se dobla al subir a la nota y vibra en las largas), arpegio punteado, bajo, sáo (flauta de bambú) en la segunda vuelta, bloque de madera y tambor chico | 33 s | Sí |
| `azotea_final` | Tema de pelea en Mi menor a 160 bpm. Bajo en corcheas, riff en cuadrada y batería de rock | 24 s | Sí |
| `victoria_banda` | Fanfarria de banda: redoble, trompetas en Si bemol, tuba y platillo | 4.6 s | No |
| `derrota` | Trombón de caricatura que baja, "guau guau guau guaaa" | 3.1 s | No |
| `bosque`, `jefe`, `victoria`, `titulo` | Los de GG Abyss | | `victoria` no, las demás sí |

### Un tema por mundo (lote H2)

Todos en bucle sin corte y en mono, como los de H1. Cada uno dura sus compases exactos.

| Id | Mundo | Qué es | Duración |
|---|---|---|---|
| `tema_instituto` | Japón, Instituto Nekketsu | Rock japonés de los 80 en La menor a 152 bpm. Riff de guitarra, verso y un coro con el "royal road" (Fa, Sol, Mi menor, La menor) que sube. Lead en cuadrada con la segunda voz en terceras, guitarra rítmica con palm mute, bajo en corcheas, colchón de sintetizador en el coro y batería con redobles | 37.9 s |
| `hoian_noche` | Hội An | La noche de los faroles. Mi menor pentatónico a 92 bpm. La sáo lleva el tema, con notas que suben desde abajo. Tambores de festival como los de la danza del león: el trống grande, la baqueta en el aro, címbalos chicos y un gong cada 4 compases. En la segunda vuelta entran el đàn nguyệt y los redobles | 41.7 s |
| `ajiaco_rock` | Bogotá | Rock en español bogotano de los 90 en chiptune. Re mayor con el Do mixolidio, 132 bpm. Guitarras distorsionadas en rasgueo sincopado, un coro de estadio doblado una octava abajo y el charles abierto en el coro | 29.1 s |
| `parce_corra` | Medellín, Comuna 13 | Cumbia en La menor a 100 bpm. Acordeón en dos cuadradas que baten, con terceras. Guacharaca con ruido filtrado ("chaaa-ki-chi" en cada tiempo), llamador en los contratiempos, tambora, bajo de cumbia (raíz y quinta) y el "chucu" del teclado | 38.4 s |
| `pana_dale` | Caracas | Joropo en Re mayor, 3/4 a 180. El arpa llanera lleva la melodía con el bordón en el 2 y el 3. El cuatro rasguea, arpegia y apaga, y las maracas no paran, con el acento que cambia entre 3/4 y 6/8 | 32 s |
| `gaita_lago` | Maracaibo | Gaita zuliana en La menor, 6/8. El furro hace el "rum, rum-rum", la tambora alterna parche y palitos en el aro, la charrasca raspa y las maracas siguen. El coro canta en dos voces y en la segunda vuelta se dobla a la octava | 34.3 s |

Saigón ya tenía `saigon_chay`, y la marcha de la ceremonia es `marcha_nekketsu`. `cafe_neblina` llegó en H4 y los `acorde_<equipo>` en H7. Sigue pendiente del pedido `vestuario`.

### El acorde de victoria de cada equipo (lote H7)

Un remate corto por equipo para cuando gana: 4 compases, entre 3.9 y 5.2 s, sin bucle. Cada uno en el estilo de su gente y terminando en la tónica.

| Id | Equipo | Qué es | Duración |
|---|---|---|---|
| `acorde_familia` | Familia GG | Fanfarria en Sol mayor con el cuatro venezolano rasgueando. La melodía cierra con dos Sol, uno grave y uno agudo: "G, G". Thor ladra al final (el mismo `ladrido` del kit) | 4.8 s |
| `acorde_instituto` | Instituto Nekketsu | Rock japonés de los 80 como `tema_instituto`: power chords en La menor, Fa y Sol con palm mute, el lead que sube y el remate en La mayor con el bend y el platillo | 3.9 s |
| `acorde_rong` | Rồng Sài Gòn | El đàn tranh sube en pentatónica de Sol, la sáo lo dobla, los tambores del festival repican y cierra el gong | 5.2 s |
| `acorde_rolos` | Rolos de Chapinero | Torbellino andino en Re mayor, 3/4: la quena, el tiple rasgueado en octavas, el bombo andino y el chucho | 4.7 s |
| `acorde_panas` | Los Panas de Caracas | Joropo en Re mayor como `pana_dale`: el arpa con su bordón, el cuatro y las maracas, que se callan de golpe en el remate | 4.5 s |
| `acorde_maracuchos` | Maracuchos del Lago | Gaita zuliana en 6/8 como `gaita_lago`: el coro en terceras, furro, tambora, charrasca y maracas, y el remate en La mayor con un "rum" largo del furro | 4.7 s |

**El acorde de cada equipo va en su ficha:** en el archivo de equipos, `"musica": "acorde_familia"`, como en el manifiesto del pedido. Pasa al manifiesto tal cual, así el juego lo busca por equipo: `m.audio.musica[m.equipos[ganador].musica]`.
- La validación revisa que la música exista en el motor y sugiere el nombre si está mal escrito.
- Si un equipo pide un acorde que no va en `audio.musica`, el kit avisa: el juego no lo encontraría.

### Los mundos de pelota (lote H3)

Igual que los de H2: en bucle sin corte, en mono y con sus compases exactos. Maracaibo ya tiene `gaita_lago`, que sirve también para el básquet.

| Id | Mundo | Qué es | Duración |
|---|---|---|---|
| `carnaval_quilla` | Barranquilla, Fútbol Callejero | Cumbia de carnaval en Sol mayor a 116 bpm. Primero la caña de millo lleva el tema, con trinos, sobre el tambor alegre que repica, el llamador en los contratiempos, la tambora, el maracón y la guacharaca. Después entra la papayera: dos trompetas en terceras, el trombón que contesta y hace de puente, bombo y platillo de banda. El bajo hace "um-pa" de tuba | 33.1 s |
| `playa_margarita` | Margarita, Vóley Playa | Música oriental margariteña en 3/4 a 144. Primero un polo en Mi menor: la bandolina canta en trémolo, el cuatro rasguea y la guitarra hace los bordones. Después un galerón en Sol mayor, más vivo, con el cuatro que apaga y las maracas en 6/8. La segunda vez de cada parte, la bandolina va en terceras. Debajo, las olas que van y vienen | 40 s |
| `dalat_niebla` | Đà Lạt, Tenis de dobles | Vals lento de montaña en Fa mayor, 3/4 a 96. El đàn tranh lleva el tema con su "nhấn" y abre cada frase con el barrido de cuerdas. En la segunda parte canta la sáo y el đàn tranh arpegia. Bajo en el 1, acorde punteado en el 2 y el 3, un colchón suave como la niebla y el viento en los pinos | 37.5 s |

### Los mundos de atletismo y natación (lote H4)

Para las cuatro pruebas que seguían con la música del chip. Igual que los de H2 y H3: en bucle sin corte, en mono y con sus compases exactos. `cafe_neblina` es el nombre del pedido.

| Id | Mundo | Qué es | Duración |
|---|---|---|---|
| `champeta_murallas` | Cartagena, Azoteas | Champeta criolla en Mi mayor a 132 bpm. Cuatro compases de entrada, ocho con la guitarra que canta el tema en terceras sobre acordes cortos de teclado, y ocho de "despeluque": la guitarra repite su punteo en semicorcheas, el bajo baila más y la batería se llena. El bajo va adelante, como en un picó, y el láser del picó baja al entrar cada parte | 36.4 s |
| `cafe_neblina` | Eje Cafetero, Vallas | Bambuco acelerado en La mayor, 6/8 a 124. La bandola andina canta en trémolo y entra a contratiempo. El tiple rasguea y adelanta el acorde que viene en la última corchea, la guitarra hace los bordones alternando 3/4 y 6/8, y las cucharas no paran. La segunda parte se va a Fa sostenido menor, con la neblina de colchón | 31 s |
| `halong_remos` | Bahía de Hạ Long, Natación | El canto de los remeros en Sol menor pentatónico, 108 bpm. Primero el đàn bầu lleva el tema, con notas que entran deslizándose y vibrato ancho. Después el "hò": el đàn bầu llama y el coro de los remeros contesta. Debajo, el đàn tranh, el trống cơm y el remo que entra al agua en el 1 y el 3, el mõ en los contratiempos y las olas | 35.6 s |
| `pajarillo_llano` | Llanos de Apure, Jabalina | Pajarillo, joropo recio en Si menor, a 196. El arpa lleva el tema con sus corridas, la bandola llanera hace el pespunteo y en la parte en Mi menor toma el tema. El cuatro rasguea con el golpe recio, los bajos alternan 3/4 y 6/8, y las maracas van escobilladas. Más rápido, en menor y con bandola, para no confundirse con `pana_dale` | 36.7 s |

## Efectos

- **Del lote H1:** `pistola` (salida), `silbato` (dos pitazos con trino), `golpe_1`, `golpe_2`, `golpe_3` (tres golpes distintos para no repetir), `golpe_pesado`, `chancleta`, `silla` (silla plástica), `pote` (pote de metal que retumba), `levantar`, `lanzar`, `caer_plano`, `mareo` (pajaritos), `ko` (golpe y campana), `publico_grito` (el público celebra, con palmas) y `publico_ooh` (el público se lamenta).
- **Del lote H2:**
  - `gallo`: el kikirikí, 1.3 s. "Ki-ki-ri-kiiii": tres sílabas que suben y la última larga que sube, se sostiene y cae, con la garganta áspera. Arranca en la muestra 0, así que va justo en el evento `canto` del cuadro 3 de `cantar`. Suena más largo que lo que queda de la animación (0.4 s a 8 fps): el gallo se queda con el pico abierto en el último cuadro y el canto termina solo.
  - `aleteo`: 0.3 s, cuatro golpes de ala cada uno más suave, con el roce de las plumas. Va en el evento `aleteo` del gallo (`asustarse`) y de la paloma (`despegar`).
  - `mecha_tejo`: 0.7 s, el disco contra la greda, el estallido de la pólvora y el chisporroteo. Se llama igual que el efecto visual `mecha_tejo` de `fx`, para que el juego toque los dos juntos.
  - `toque_cau`: 0.2 s, el pie contra la base del volante del đá cầu, seco y medio agudo, con el silbido de las plumas.
  - `caida_tatami`: 0.2 s, la caída de judo. La palmada del brazo, seca y sorda, y el cuerpo que cae junto, sin rebote. Distinta de `caer_plano`, que rebota.
  - `pitazo_largo`: 1.25 s, un solo pitazo largo del árbitro, con trino. El `silbato` de antes (dos pitazos) no cambió.
- **Del lote H3:**
  - `red_voley`: 0.4 s, la pelota contra la red de vóley. El golpe sordo, la malla que se sacude y la cuerda de arriba que vibra grave. Va cuando la pelota cruza por debajo de la red y rebota.
  - `rebote_balon`: 0.3 s, el balón de básquet contra el cemento. El chasquido del piso y el "pung" hueco del balón, una nota grave que baja un poco. Va en cada bote.
  - `aro_basket`: 0.67 s, la canasta. El balón contra el tablero, el aro de hierro que suena y el "swish" de la red.
  - `aro_fallo`: 0.49 s, el tiro que pega en el aro y se sale. Empieza igual que `aro_basket` y en vez del swish trae el segundo toque del balón en el aro.
  - `chapa`: 0.25 s, la chapa golpeada por el palo de escoba. El "toc" de la madera, el "tin" de la lata y la chapa que sale silbando.
- **Del lote H5**, la natación y la garrocha:
  - `salida_natacion`: 0.58 s, la bocina electrónica de la salida. Un "biiip" áspero con el zumbido del parlante, un tono fijo de unos 415 Hz con sus armónicos. Va en el ¡YA! de la natación, en vez del blip de las otras pruebas, para que se reconozca la piscina.
  - `chapuzon`: 0.84 s, el clavado de la salida. El cuerpo que pega plano contra el agua, el agua que se abre con un "shhh" grave, las burbujas que suben y las gotas que caen de vuelta. Va en el evento `impacto` de `dive` (cuadro 6).
  - `brazada`: 0.32 s, una brazada. La mano que entra al agua ("plof"), el jalón y dos o tres burbujas. Va en el evento `brazada` de los nados: en `swim` y `swim_back` en los cuadros 0 y 4, en `swim_breast` en el 5 y en `swim_fly` en el 0. Cabe entre dos manos del crol sin taparse.
  - `garrocha`: 0.67 s, el salto con pértiga. La punta que se clava en la cajita con un golpe de metal, la pértiga de fibra que se dobla con un "uuum" que sube, y el latigazo cuando se endereza. Va en el evento `despegue` de `pole_vault`: el latigazo cae 1/3 s después, justo en `suelta` (4 cuadros a 12 fps).
- **Del lote H2 corto:**
  - `trueno`: 2.1 s, el trueno del Catatumbo, pa' la jabalina del rayo y el cielo de Maracaibo. Arranca con un chasquido seco que pega en los primeros 20 ms y después retumba grave por el lago en varias olas hasta apagarse. Va en el cuadro 2 de `rayo_cielo`, cuando el rayo toca el piso.
  - `furro`: 1 s, el Furrazo. Es el mismo furro de `gaita_lago` pero tocado con todo: la palmada en el cuero, el "rum" que crece un toque y gruñe y el raspado de la mano en la vara. Grave y áspero, pero con cuerpo pa' que se oiga hasta en un teléfono. Va en el impacto de `play_drum`.
  - `corneta_moto`: 0.55 s, la corneta de una moto de Saigón, tipo Honda Wave o Dream. "Pí-píii", finita, nasal y brillante, con las dos voces un pelo desafinadas que baten. Va cuando la moto pasa a su animación `corneta` en el Cross.
- **Los de antes:** espadazo, golpe, critico, esquiva, bloqueo, pasos por superficie (`paso_<pasto|tierra|piedra|madera|agua>_<0|1|2>`), ladrido, interfaz (click, elegir, error...) y los de GG Abyss.

## Ambientes

12 s en bucle sin corte: el final se funde con el principio. Todos salen al mismo nivel (pico en 0.5), para ponerlos debajo de la música sin ajustar cada uno.

- **Los de antes:** `bosque` (viento suave y pájaros), `agua` (arroyo), `noche` (grillos y una ranita), `viento` (ráfagas), `cueva` (rumor y gotas con eco) y `magia` (campanitas sobre un colchón brillante).
- **Del lote H6**, los de los mundos que ya tienen escenario:
  - `mar`: para Hạ Long y Margarita. Un rumor grave que no para y tres olas en los 12 s. Cada una crece, revienta con un golpe ancho que se apaga despacio y se devuelve siseando por la arena. Una gaviota llama dos veces seguidas y otra más tarde. La última ola cae justo en el empalme del bucle, así que no se nota la vuelta.
  - `cafetal`: para Cocora. La brisa fresca de la montaña, pájaros que silban en frases cortas, la bandada de loros que pasa graznando y una vaca a lo lejos.
  - `llano`: para Apure. El viento abierto de la sabana al atardecer, las chicharras que crecen y bajan dos veces sin callarse nunca, el alcaraván dos veces ("cá-cá-cá-cáaa") y el ganado a lo lejos.
- **Del lote H7**, los del resto de los mundos. Los nombres son los del pedido donde el pedido los traía (`trafico_saigon`, `llovizna_bogota`, `lago_noche`, `azotea_noche`, `comuna`, `liceo`):
  - `trafico_saigon`: la calle de Saigón. El río de motos que no para (catorce que pasan, cerca y lejos, algunas acelerando), las bocinas que se contestan, el parlante del pan ("bánh mì nóng giòn đây", con los tonos del vietnamita) y la gente.
  - `hoian_noche`: Hội An de noche. El río que lame los botes, los grillos, las ranas del arrozal ("ộp ộp"), un sampán que pasa remando, un tambor del festival lejos y turistas que conversan.
  - `llovizna_bogota`: La Candelaria. La llovizna fina con sus gotitas, alguien que camina por el adoquín mojado, las palomas, dos campanadas de la iglesia y, en la cancha de tejo de la esquina, una mecha que revienta y el "¡eso!".
  - `lago_noche`: la cancha del lago en Maracaibo. El calor quieto, los insectos de la noche, el lago que apenas se mueve, el trueno del relámpago del Catatumbo muy lejos y uno que bota el balón, con el chirrido de las zapatillas.
  - `azotea_noche`: la azotea de Caracas. La ciudad que zumba abajo, los sapitos de la noche caraqueña (ese "tink" de vidrio), dos perros del cerro que se contestan con el rebote en los edificios, un helicóptero que cruza y una moto que sube la avenida.
  - `atardecer_cartagena`: las azoteas de Cartagena. La brisa del mar entre las casas, el coche de caballos al trote por el adoquín, la palenquera que pregona ("¡alegría, cocadita!") y el picó de una casa, que retumba a través de la pared.
  - `comuna`: la Comuna 13. El boom bap del parlante de los bailarines, el zumbido de las escaleras eléctricas, la gente que sube y mira, los aplausos cuando el b-boy remata, un perro y una moto que sube la loma.
  - `carnaval`: el carnaval de Barranquilla. El gentío, la comparsa que se acerca y se va con tambora, llamador, alegre y maracas, los pitos, el grito cuando pasa la reina y la pólvora.
  - `pinos_dalat`: los pinos de Đà Lạt. El susurro alto de las agujas, el viento fresco más abajo, el chào mào ("chít-chít-chào-mào"), el tu hú lejos y una moto que baja la loma.
  - `liceo`: el patio del liceo en el recreo. Los niños que gritan y corren ("¡pásala!", "¡aquí!", las risas), el balón de goma contra el piso y la pared, todo con el eco del techo.
- **Del lote B7H8**, los tres que faltaban, con los nombres de Rick:
  - `parque_tao_dan`: el parque Tao Đàn en la mañana (Đá cầu). Los pájaros de las jaulas colgadas de los árboles que se contestan (chào mào y khướu), el toque del cầu de dos rondas de jugadores, cerca y lejos, una escoba de palito que barre hojas, unos señores que conversan en un banco y Saigón que se despierta detrás de los árboles.
  - `barrio_caracas`: el barrio de Caracas de día (Chapita). Dos guacamayas que cruzan gritando, la camionetica que sube con su corneta, el pregón ("¡aguacateee!"), un radio con salsa lejos y apagado, los chamos que juegan con el "tac" del palo contra la chapa y un perro de la cuadra.
  - `dojo_hanoi`: el dojo de Hanói en la tarde (el judo). Los pies que arrastran sobre el tatami, tres caídas con su palmada, un kiai, la voz del sensei y los que esperan al borde, todo con el eco del salón; afuera, la brisa del lago Hoàn Kiếm, la campana del templo de Ngọc Sơn y motos lejos.
- **Del lote H2 corto**, los tres que faltaban del Cross:
  - `mercado`: el mercado Bến Thành por dentro. El zumbido del galpón y los ventiladores, la gente echando cuento, cuatro vendedoras que llaman cantadito como en vietnamita, bolsas plásticas, la cuchilla del puesto de carne contra la tabla, unas monedas y, por las puertas, motos que pasan afuera. Movido pero sin gritar.
  - `rio`: el río Saigón. El agua que lame el muelle y el casco de un bote, el motor diésel del ferry esperando lejos (un tuc-tuc parejito), la sirena del ferry una sola vez con su eco en la otra orilla, golondrinas sobre el agua, una garza y la brisa.
  - `estadio`: llegando al estadio, el final del Cross. El público que ruge en dos olas, aplausos sueltos y en racha, la barra lejos con su bombo y sus cornetas, un pitazo del árbitro y el locutor por el parlante, todo con el eco de las tribunas.
- **Cómo están hechos los de H7, B7H8 y H2 corto:** el fondo (tráfico, agua, viento, lluvia, insectos) se funde en el empalme como los demás. Lo que pasa (motos, perros, campanas, gente, tambores) va en una capa de 12 s exactos que da la vuelta: un perro que ladra en el empalme suena entero, ni doble ni a medias. Al final se les quita lo que está por debajo de 70 Hz, que un parlante de teléfono no toca y solo le quitaría volumen a lo demás.
- **Sin melodías:** el tema del mundo suena encima. Lo único con ritmo son los tambores de la comparsa, el parlante de la Comuna 13, el picó de Cartagena, el radio del barrio de Caracas y la barra del estadio, lejos y bajitos.

## Voces en blips

Los diálogos no tienen voz hablada: cada letra suena con un "blip", como en los juegos de 8 bits.
- **Archivos:** cada personaje trae 4 blips (`audio/voz/<id>_0..3.wav`) con su `tono` y `timbre`.
- **Tono:** 1 es 220 Hz.
- **Timbre:** `cuadrada`, `aguda`, `triangulo` o `sierra`.
- **Voz automática:** sale de la ficha.
  - Los niños suenan más agudos (Sophie 1.53).
  - Las fichas con cuerpo `curvas` también suben.
  - Los gigantes de celda 64 bajan (Goro 0.7).
  - El timbre sale del id, así cada uno suena distinto.
- **Quién la tiene:** con `voces: true` salen todos los atletas. Con una lista entran también los NPC, como `locutor` o `arbitro`. Con un objeto se fija la voz.
- **En el manifiesto:** cada atleta trae `voz: { tono, timbre, archivos }`, y `manifest.audio.voces` las trae todas.

## En Phaser

```js
// cargar todo el audio del kit
for (const sec of ['sfx', 'musica', 'ambientes']) for (const [n, a] of Object.entries(m.audio[sec] ?? {})) this.load.audio(n, KIT + a.archivo);
for (const [id, v] of Object.entries(m.audio.voces ?? {})) v.archivos.forEach((f, k) => this.load.audio(`voz_${id}_${k}`, KIT + f));

// música en bucle (las que traen bucle: true empalman sin corte)
this.sound.play('marcha_nekketsu', { loop: m.audio.musica.marcha_nekketsu.bucle, volume: 0.6 });

// el silbato y la pistola en la largada
this.sound.play('pistola');

// el básquet: cada bote, y el aro según entre o no
this.sound.play('rebote_balon', { volume: 0.4 });
this.sound.play(entra ? 'aro_basket' : 'aro_fallo');

// la natación: la bocina en el ¡YA!, el chapuzón en el impacto del clavado y la brazada en cada mano que entra
this.sound.play('salida_natacion');
for (const ev of m.atletas[id].packs.natacion.anims.swim.eventos) if (ev.tipo === 'brazada' && cuadro === ev.cuadro) this.sound.play('brazada', { volume: 0.35, rate: 0.95 + Math.random() * 0.1 });

// el gallo canta en el evento "canto" de su animación, y aletea en "aleteo"
gallo.on('animationupdate', (anim, frame) => {
  for (const ev of m.animales.gallo.eventos[anim.key] ?? []) if (frame.index - 1 === ev.cuadro) this.sound.play(ev.tipo === 'canto' ? 'gallo' : 'aleteo');
});

// el ambiente del mundo, en bucle debajo de la música
this.sound.play('mar', { loop: true, volume: 0.35 });

// el acorde de victoria del equipo que ganó (va en su ficha de equipo)
this.sound.play(m.equipos[ganador].musica);

// un golpe distinto cada vez
this.sound.play(Phaser.Utils.Array.GetRandom(['golpe_1', 'golpe_2', 'golpe_3']));

// diálogo: un blip por letra, saltando espacios y signos
function hablar(scene, id, texto, cps = 18) {
  let i = 0;
  scene.time.addEvent({ delay: 1000 / cps, repeat: texto.length - 1, callback: () => {
    const ch = texto[i++];
    if (/[\p{L}\p{N}]/u.test(ch)) scene.sound.play(`voz_${id}_${ch.charCodeAt(0) % 4}`, { volume: 0.5 });
  } });
}
```

## Límites honestos

- **No hay voz hablada sin IA.** Lo asume el pedido: los diálogos usan blips.
- **Los temas de los mundos son chiptune, no grabaciones.** La cumbia, el joropo y la gaita se reconocen por el ritmo (la guacharaca, las maracas y el furro), pero el acordeón, el arpa y el coro son ondas cuadradas y cuerdas punteadas sintetizadas. Lo mismo con los de H3: la caña de millo, las trompetas de la papayera, la bandolina y el đàn tranh son ondas cuadradas y cuerdas punteadas, y se reconocen por el ritmo y el adorno (los trinos, el trémolo, el "nhấn"). El furro de verdad es más grave de lo que un parlante de teléfono toca: el de acá va en 62 Hz con armónicos para que se oiga.
- **Síntesis de 8 bits.** Suena a consola, no a banda real. Para Rick es una decisión de estilo: la marcha y el đàn tranh se reconocen, pero son chiptune.
- **Mono a 22050 Hz.** La marcha de 60 s pesa 2.6 MB en WAV. Con `"formato": "comprimido"` en el `kit.config.json`, el kit la saca en OGG y M4A a 64 kbps, unos 520 KB (ver [KIT_A_MEDIDA.md](KIT_A_MEDIDA.md#efectos-y-audio)).
- **`victoria` y `victoria_banda`:** `victoria` es la fanfarria de GG Abyss y no se cambió para no tocar ese kit. Para Nekketsu va `victoria_banda`, que combina con la marcha.
- **El agua es ruido filtrado y burbujas sintetizadas** (lote H5). El chapuzón y la brazada se reconocen por la forma (el golpe, el "shhh", las burbujas que suben y las gotas), pero son de videojuego, no grabaciones. Repetida en cada brazada, conviene variarle un poco el `rate` y el volumen en el juego para que no suene a máquina.
- **Los ambientes son de 12 s.** En un juego de 2 o 3 minutos se oye la vuelta si uno pone atención: la gaviota y el alcaraván llaman siempre en el mismo segundo. Si molesta, el juego puede arrancar el ambiente en un punto al azar.
- **La gente de los ambientes no dice nada.** El murmullo, los gritos del recreo, la palenquera y el parlante del pan son sílabas con las vocales en su lugar (una sierra por dos formantes), no palabras: se reconocen por el ritmo y la entonación. La voz hablada sigue fuera, como en el pedido.
