# Lote H2 corto: seis sonidos que el juego ya tiene dónde poner
Estado: entregado, pendiente de Rick
PR: (se completa al abrirlo)
Fecha: 2026-10-15

## Qué se hizo

Tres efectos y tres ambientes, sintetizados con el motor como todo el audio. Van al final de su lista, sin mover a ninguno de antes.

| Id | Tipo | Dura | Qué es |
|---|---|---|---|
| `trueno` | sfx | 2,1 s | El chasquido del rayo al principio, el estampido grave y el retumbo que rueda en cuatro olas y se apaga |
| `furro` | sfx | 1,0 s | El retumbo del Furrazo: el mismo furro de la gaita del lago, tocado duro, con la palmada, el "rum" que crece y el raspado |
| `corneta_moto` | sfx | 0,55 s | El pito de una moto de paso bajo de Saigón: "pí, píii", nasal y un poquito desafinado |
| `mercado` | ambiente, 12 s en bucle | | Bến Thành por dentro: el galpón con eco, la gente, las vendedoras cantando ofertas, las bolsas plásticas, la cuchilla en la tabla, monedas y motos lejos afuera |
| `rio` | ambiente, 12 s en bucle | | El río Saigón: el agua contra el muelle y el casco, el motor del ferry de fondo, la sirena del ferry una vez, golondrinas, una garza y el viento |
| `estadio` | ambiente, 12 s en bucle | | Llegando al estadio: el público con dos olas de rugido, las palmas, el bombo y las cornetas de la barra, un pitazo del árbitro y el locutor por el parlante |

**Lo que no cambió:** los 132 sonidos de antes salen igualitos, byte por byte, y en el mismo orden.

### Cómo están hechos

- **`trueno`:**
  - Tiene tres capas: el chasquido (cuatro descargas de ruido en los primeros 35 ms), el estampido grave y el retumbo.
  - El retumbo lleva una banda de 260 Hz para que se oiga en el teléfono.
  - El pico cae a los 19 ms.
- **`furro`:**
  - Usa la misma voz del furro de `gaita_lago` y `acorde_maracuchos`, para que suene al mismo instrumento.
  - Lleva un ataque más largo (el "rum" que crece), un raspado nuevo y un segundo furro un poco más agudo que bate con el primero.
  - La saturación le da cuerpo entre 150 y 600 Hz.
- **`corneta_moto`:** dos pitos de pulso angosto a 440 Hz, con una segunda voz que bate. La del tráfico de Saigón es de carro, de dos tonos. Esta es de moto, un solo pito nasal.
- **Los ambientes** siguen el molde de H7: 12 s, cierre del bucle sin costura, el pico en 0,5 y la energía en la banda que se oye en un teléfono.
  - **Piezas nuevas:** la cuchilla, las bolsas, las monedas, el chapoteo y la corneta de la barra.
  - **El eco:** el mercado lleva el del techo del galpón y el estadio el de las tribunas.

## Cómo se usa (estudio y kit)

**En el kit:** suma los tres a `audio.sfx` y los tres a `audio.ambientes` de tu `kit.config.json`, al final de cada lista. Ya están en `docs/ejemplos/nekketsu/kit.config.json`. Salen como siempre en `audio/sfx/<id>.ogg` y `.m4a`, y `audio/ambiente/<id>.ogg` y `.m4a` con `bucle: true`.

**Lo que tiene que conectar el juego:**
- **`trueno`:**
  - Tócalo en el cuadro 2 de `rayo_cielo`, cuando cae el rayo, en la jabalina y en el cielo de Maracaibo.
  - Arranca en el chasquido. Si lo tocas al empezar el efecto, llega 125 ms antes que el rayo.
- **`furro`:** en el `impacto` de `play_drum`.
- **`corneta_moto`:** cuando la moto pasa a `corneta` en el Cross. Si pita seguido, no lo repitas antes de que termine (0,55 s).
- **Los ambientes del Cross:**
  - `mercado` en `saigon_benthanh`.
  - `rio` en `saigon_rio`.
  - `estadio` en `saigon_estadio`.
  - `trafico_saigon` sigue en el hẻm y las azoteas.

**El conteo:** son seis archivos de audio en el artifact. Quedas en 500 de 511, como calculaste.

## Pruebas

- **Prueba nueva `h2corto.test.ts`, 11 casos:**
  - **El orden:** los seis van al final y los de antes no se mueven.
  - **Los ambientes:**
    - Cumplen el molde de H7: 12 s, el nivel, la costura del bucle y la banda del teléfono.
    - Cada uno trae su firma:
      - en el mercado, la cuchilla y las monedas;
      - en el río, el latido del motor del ferry y la sirena;
      - en el estadio, las cornetas, el pitazo y el bombo.
  - **El trueno:** el chasquido cae en los primeros 50 ms y todavía suena después de 1 s.
  - **El furro:** es grave, tiene cuerpo audible, el "rum" crece y lleva el gruñido de 23 Hz del furro de siempre.
  - **La corneta:** se oyen dos pitos, a su tono.
  - **El resto:** que todo salga igual cada vez, la salida del kit con `bucle: true` y el ejemplo de Nekketsu.
- **Las pruebas que usaban `trueno`** como ejemplo de "sonido que todavía no existe" ahora usan `ventana_rota`.
- **La suite sin `custom.test.ts`:** 51 archivos, 522 de 522.
- **`custom.test.ts`: 15 de 15,** con el kit generado en 213 s, por debajo del límite de 300.
- **`tsc` limpio, `npm run build:sitio` limpio y e2e de Playwright 50 de 50.**

## Para aprobar (todo en esta carpeta)

- **`escuchar.html`:** ábrelo y toca cada botón.
  - **Los efectos:** cada uno solo.
  - **Los ambientes:** cada uno con dos vueltas seguidas, para oír la costura del bucle.
  - Cada botón dice qué oír.

Qué mirar: que el trueno pegue con el rayo, que el furro suene a furro, que la corneta suene a moto y no a carro, y que los ambientes no se oigan cortados al dar la vuelta.

## Decisiones que tomé sin preguntar

1. **Los tres efectos van en un registro aparte** al final de los sfx. Así ningún sonido de antes cambia de lugar.
2. **El trueno arranca en el chasquido,** para que lo dispares en el cuadro del golpe.
3. **La corneta es un solo pito nasal,** no la bocina de dos tonos del tráfico. Esa es de carro.
4. **El furro reusa la voz de la gaita** con opciones nuevas. Sin las opciones, la gaita y el acorde de los Maracuchos suenan igual que antes.
5. **El mercado y el estadio llevan eco,** del galpón y de las tribunas.

## Límites honestos

- **Los afiné midiendo, no oyendo:** con envolventes, bandas y espectrogramas. Hay que oírlos en la tablet.
- **El trueno en el teléfono** se oye sobre todo como chasquido y retumbo medio. El grave de verdad se siente en audífonos o en un parlante grande.
- **El furro en el teléfono** va a sonar más "rrrr" que "boom": la mayor parte de su energía es grave.
- **El motor del ferry** está lejos y bajito. Se nota como un latido parejo debajo del agua.
- **Lo más fuerte del estadio** es un golpe del bombo de la barra, y eso fija el volumen de todo el ambiente. Si lo quieres más atrás, se baja y sube lo demás.
- **Las vendedoras y el locutor** son sílabas cantadas, no palabras: suenan a gente ofreciendo y a voz por parlante, no a vietnamita ni a español que se entienda.

## Lo que necesita el siguiente lote

- **El juego:** sumar los seis al `kit.config.json` y conectarlos donde dice arriba.
- **Lo que queda del mensaje:** G2 va en su PR.
