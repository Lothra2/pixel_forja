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

## Efectos

- **Del lote H1:** `pistola` (salida), `silbato` (dos pitazos con trino), `golpe_1`, `golpe_2`, `golpe_3` (tres golpes distintos para no repetir), `golpe_pesado`, `chancleta`, `silla` (silla plástica), `pote` (pote de metal que retumba), `levantar`, `lanzar`, `caer_plano`, `mareo` (pajaritos), `ko` (golpe y campana), `publico_grito` (el público celebra, con palmas) y `publico_ooh` (el público se lamenta).
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
- **Síntesis de 8 bits.** Suena a consola, no a banda real. Para Rick es una decisión de estilo: la marcha y el đàn tranh se reconocen, pero son chiptune.
- **Mono a 22050 Hz.** La marcha de 60 s pesa 2.6 MB en WAV. Con `"formato": "comprimido"` en el `kit.config.json`, el kit la saca en OGG y M4A a 64 kbps, unos 520 KB (ver [KIT_A_MEDIDA.md](KIT_A_MEDIDA.md#efectos-y-audio)).
- **`victoria` y `victoria_banda`:** `victoria` es la fanfarria de GG Abyss y no se cambió para no tocar ese kit. Para Nekketsu va `victoria_banda`, que combina con la marcha.
