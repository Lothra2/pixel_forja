# Lote H1b: el audio comprimido para el celular
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/21
Fecha: 2026-10-12

## Qué se hizo

El juego carga todo el audio al arrancar, y la marcha en WAV pesaba 2.6 MB. En un celular eso frena la entrada. Lo que acordamos con el agente del juego:

- **Nuevo en el kit: `audio.formato`.**
  - `"wav"` es el formato por defecto y no cambia nada. GG Abyss sigue igual.
  - Con `"comprimido"`, cada sonido sale en OGG Vorbis y en M4A (AAC), en mono. `archivo` pasa a ser la lista `["<n>.ogg", "<n>.m4a"]`, con el OGG primero y el M4A de respaldo para Safari del iPhone.
- **Los kbps que pidió el juego:** música a 64, ambientes a 48 y efectos a 64.
- **`muestras` y `frecuencia` en cada sonido comprimido:** el largo exacto del original, para cerrar el bucle sin hueco.
- **Sin ffmpeg:** los efectos salen en WAV (`["<n>.wav"]`). La música y los ambientes no salen y quedan en `manifest.pendiente` con su aviso, así nunca se cuela un WAV de 2.6 MB.
- **Las voces siguen en WAV:** son blips de milisegundos.
- **El motor no trae codificador.** Lo pone quien arma el kit: el CLI usa ffmpeg en modo exacto, así que el mismo kit da los mismos bytes cada vez. El motor sigue sin depender de nada para correr en el navegador.
- **`audio/escuchar.html` toca el formato que el navegador entienda.**
- **El ejemplo de Nekketsu** ya trae `"formato": "comprimido"`.

### Cuánto pesa lo que baja cada navegador

| Kit de Nekketsu | WAV (antes) | OGG (Chrome, Android) | M4A (Safari) |
|---|---|---|---|
| Música, 5 temas | 5.5 MB | 1.05 MB | 1.07 MB |
| `marcha_nekketsu`, 60 s | 2.6 MB | 517 KB | 520 KB |
| Efectos, 33 | 737 KB | 240 KB | 159 KB |
| Voces, 40 blips | 134 KB | 134 KB (WAV) | 134 KB (WAV) |

## Cómo se usa

En el `kit.config.json` del juego:

```jsonc
"audio": { "formato": "comprimido", "sfx": [...], "musica": [...], "voces": [...] }
```

En Phaser, la lista va entera a `this.load.audio`. Phaser carga el primero que el navegador pueda tocar:

```js
for (const sec of ['sfx', 'musica', 'ambientes'])
  for (const [n, a] of Object.entries(m.audio?.[sec] ?? {})) this.load.audio(n, [a.archivo].flat().map((f) => KIT + f));
```

Para que la música en bucle no tenga hueco, se toca con un marcador de `muestras / frecuencia` segundos (ver `docs/KIT_A_MEDIDA.md`). El juego ya dijo que carga la música después del arranque, no en Boot.

## Pruebas

- **4 pruebas nuevas en `ui_audio.test.ts`:**
  - Con un codificador falso: OGG primero, M4A después, los kbps por sección y las voces en WAV. `escuchar.html` elige por `canPlayType`.
  - Sin codificador: efectos en WAV, y música y ambientes en `pendiente` y no en WAV.
  - El formato por defecto sigue dando `archivo` como texto.
  - `audio.formato` mal escrito da error con sugerencia.
- **Con ffmpeg de verdad:**
  - La marcha queda por debajo de 560 KB.
  - Sale igual byte por byte en dos corridas.
  - Al decodificar, el OGG trae exacto las muestras del original y el M4A a lo sumo 64 de más.
- **`custom.test.ts`:** el kit completo de Nekketsu sale comprimido y sin pendientes, y el manifiesto nombra cada `.ogg` y `.m4a`.
- **Probado en Chromium:**
  - `escuchar.html` elige el OGG y lo carga con sus 60 s.
  - El OGG decodificado arranca en la muestra 0 y trae 136 muestras de más al final (ver Límites).
- **Medí el arranque de los efectos:** sale en la misma muestra que el WAV, más o menos 4. Comprimir no les mete retraso.
- **Suite completa:** 24 archivos, 265 de 265. `tsc` limpio, `npm run build:sitio` limpio y e2e de Playwright 50 de 50.

## Para aprobar

Abrir `audio/escuchar.html` de un kit armado con `npm run kit-a-medida -- <carpeta> --config docs/ejemplos/nekketsu/kit.config.json` y oír la marcha. Tiene que sonar igual que el WAV, sin cortes en el bucle de 60 s.

No hay GIF con Sophie y Alana en este lote: es solo audio.

## Decisiones que tomé sin preguntar

1. **El formato es opcional y el de siempre sigue siendo WAV.** El cargador de GG Abyss usa `KIT + a.archivo` como texto, y con una lista se le rompería.
2. **El codificador lo inyecta el CLI, no el motor.** ffmpeg es de la máquina, no del navegador. Así el motor sigue corriendo en el estudio sin dependencias nuevas.
3. **Las voces no se comprimen.** El M4A les mete relleno al principio, y en un blip de 50 ms eso se nota. Pesan 134 KB en total.
4. **Los efectos también se comprimen, aunque algunos crecen.** `click` y `chancleta` quedan unos 300 bytes más grandes en OGG que en WAV, por la cabecera de Vorbis. En total los efectos bajan de 737 a 240 KB, así que no hice excepciones.
5. **El total con M4A pasa un poco de lo calculado.** Vorbis a 64 kbps da 517 KB para 60 s, no 480, porque el bitrate es variable. No bajé los kbps porque el juego ya dijo que 480 KB le sirven y el chiptune se ensucia rápido.

## Límites honestos

- **El M4A no lo pude decodificar en este Chromium,** que no trae AAC. Lo probé con ffmpeg. En Safari de iPhone hay que oírlo en un teléfono de verdad.
- **El bucle necesita el marcador.** Si el juego hace `loop: true` sobre el archivo entero, Chrome mete 6 ms casi en silencio cada 60 s. Para eso van `muestras` y `frecuencia`.
- **El OGG de los efectos cortos pierde o gana unas decenas de milisegundos de cola en silencio.** El arranque queda exacto.
- **Armar el kit tarda unos 7 segundos más** por las 76 llamadas a ffmpeg.

## Lo que necesita el siguiente lote

- **El juego:** aceptar `archivo` como lista, cargar la música después del arranque y tocar el bucle con el marcador.
- **Dependencia:** esta rama sale de G1H1 (https://github.com/Lothra2/pixel_forja/pull/13) y se une después de ese PR.
