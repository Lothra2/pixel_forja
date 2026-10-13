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
  "ambientes": ["agua"],
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

Saigón ya tenía `saigon_chay`, y la marcha de la ceremonia es `marcha_nekketsu`. Siguen pendientes del pedido `cafe_neblina`, `vestuario` y los `acorde_<equipo>`.

### Los mundos de pelota (lote H3)

Igual que los de H2: en bucle sin corte, en mono y con sus compases exactos. Maracaibo ya tiene `gaita_lago`, que sirve también para el básquet.

| Id | Mundo | Qué es | Duración |
|---|---|---|---|
| `carnaval_quilla` | Barranquilla, Fútbol Callejero | Cumbia de carnaval en Sol mayor a 116 bpm. Primero la caña de millo lleva el tema, con trinos, sobre el tambor alegre que repica, el llamador en los contratiempos, la tambora, el maracón y la guacharaca. Después entra la papayera: dos trompetas en terceras, el trombón que contesta y hace de puente, bombo y platillo de banda. El bajo hace "um-pa" de tuba | 33.1 s |
| `playa_margarita` | Margarita, Vóley Playa | Música oriental margariteña en 3/4 a 144. Primero un polo en Mi menor: la bandolina canta en trémolo, el cuatro rasguea y la guitarra hace los bordones. Después un galerón en Sol mayor, más vivo, con el cuatro que apaga y las maracas en 6/8. La segunda vez de cada parte, la bandolina va en terceras. Debajo, las olas que van y vienen | 40 s |
| `dalat_niebla` | Đà Lạt, Tenis de dobles | Vals lento de montaña en Fa mayor, 3/4 a 96. El đàn tranh lleva el tema con su "nhấn" y abre cada frase con el barrido de cuerdas. En la segunda parte canta la sáo y el đàn tranh arpegia. Bajo en el 1, acorde punteado en el 2 y el 3, un colchón suave como la niebla y el viento en los pinos | 37.5 s |

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
- **Los de antes:** espadazo, golpe, critico, esquiva, bloqueo, pasos por superficie (`paso_<pasto|tierra|piedra|madera|agua>_<0|1|2>`), ladrido, interfaz (click, elegir, error...) y los de GG Abyss.

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

// el gallo canta en el evento "canto" de su animación, y aletea en "aleteo"
gallo.on('animationupdate', (anim, frame) => {
  for (const ev of m.animales.gallo.eventos[anim.key] ?? []) if (frame.index - 1 === ev.cuadro) this.sound.play(ev.tipo === 'canto' ? 'gallo' : 'aleteo');
});

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
