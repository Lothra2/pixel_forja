# Lote C7b: el gallo y la paloma
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/25
Fecha: 2026-10-13

## Qué se hizo

Las dos aves que acordamos con el juego, sobre un esqueleto de ave nuevo, de lado y con espejo.

| Ave | Celda | Animaciones | Detalle |
|---|---|---|---|
| `gallo` | 32 | `idle` (4, bucle), `picotear` (4), `cantar` (6), `asustarse` (4), `caminar` (6, bucle) | <ul><li>Rojo con la capa dorada en el cuello, la cola negra en arco con brillo verde, cresta y barbilla rojas, y patas amarillas.</li><li>Al cantar infla el pecho, estira el cuello y abre el pico. El evento `canto` va en el cuadro 3.</li><li>Al asustarse se agacha, salta aleteando y cae en el mismo sitio. El evento `aleteo` va en el cuadro 1.</li></ul> |
| `paloma` | 16 | `idle` (2, bucle), `picotear` (4), `caminar` (4, bucle), `despegar` (4), `volar` (4, bucle), `aterrizar` (4) | <ul><li>Gris azulada, con el cuello tornasol verde y violeta, dos barras negras en el ala, el ojo naranja y las patas rosadas.</li><li>Camina cabeceando, como las palomas de verdad.</li><li>Despega subiendo con el `aleteo` en el cuadro 1, y vuela con las patas recogidas.</li><li>`aterrizar` es un extra: frena con las alas y las patas adelante.</li></ul> |

**Motor, todo general:**
- **El esqueleto de ave** (`rig/ave.ts`): cada especie es una plantilla con su celda, sus medidas (cuerpo, cuello, cabeza, pico, tarso, cola y ala) y sus colores. La cola puede ser `hoz` (la del gallo) o `corta` (la de la paloma). Hay cresta, barbilla, la capa del cuello o el cuello tornasol, y las barras del ala. La garza, la guacamaya y el colibrí del pedido se suman como plantillas.
- **La pose de ave:** el cuerpo que se inclina y se agacha, el aire (el salto y el vuelo), el cuello y su largo, el giro de la cabeza, el pico que se abre, el ojo, el ala plegada o abierta con su ángulo, cada pata con su paso, las patas recogidas, la cola y el pecho inflado.
- **El render de lado** (`render/ave.ts`): pinta de atrás para adelante y pone el contorno de afuera con el mismo color de contorno de los atletas.
- **Las aves en el kit** (`kit/aves.ts`): van en la sección `animales`, con `tipo: "ave"`, en una tira como los NPC. Traen el ancla en la cadera sobre el piso, los eventos y el `aire` de cada cuadro.
- **El visor del kit lee aves:** las muestra de lado, en una sola fila, con su ancla. Antes esperaba un atlas con 5 filas para todo animal y las aves no se veían.

**Después de probarlo en el juego.** El juego conectó las aves y pidió una cosa: la paloma volando era "una mancha gris que flota", porque las alas no salían del cuerpo.
- **El aleteo de `volar` ahora tiene 4 tiempos:** dos cuadros con las alas bien arriba del lomo, uno abajo del cuerpo y uno de paso. La silueta cambia 4 px de alto, y sigue en celda 16.
- **El ala abierta es ancha,** con la cuerda que corre por el lomo, y la punta con las plumas marcadas.
- **Con el ala arriba se ve la cara de abajo, más clara** (`ala_bajo`, un color nuevo de la especie). El ala abajo baja más (hasta 80 grados).
- El gallo usa el mismo dibujo de ala: su `asustarse` aletea con el ala más ancha.
- El `aire` cambió: `despegar` [0, 1, 1, 2], `volar` [0, 1, 2, 1]. Nombres, anclas y formato, igual que antes.
- **La prueba de "el kit en menos de 3 minutos" pasa a 300 s,** como pidió Rick: con la máquina de hoy tarda entre 185 y 200 s.

## Cómo se usa (estudio y kit)

En el `kit.config.json` del juego basta con sumarlas a `animales`. No llevan ficha: vienen con el motor, como Thor.

```jsonc
"animales": ["thor", "perro_calle_1", "perro_calle_2", "perro_calle_3", "gato_1", "gato_2", "gallo", "paloma"]
```

En el manifiesto:

```jsonc
"gallo": { "tipo": "ave", "imagen": "animales/gallo.png", "w": 32, "h": 32, "ancla": [17, 30], "vista": "lado", "cuadros": 24,
  "anims": { "cantar": { "desde": 8, "cuadros": 6, "fps": 8, "loop": false }, "asustarse": { "desde": 14, "cuadros": 4, "fps": 10, "loop": false, "aire": [0, 4, 5, 0] } },
  "eventos": { "cantar": [{ "tipo": "canto", "cuadro": 3 }], "asustarse": [{ "tipo": "aleteo", "cuadro": 1 }] } }
```

**El juego:**
- **Las aves no van en atlas.** Se cargan con `load.spritesheet(id, imagen, { frameWidth: w, frameHeight: h })` y cada animación usa los cuadros de `desde` a `desde + cuadros - 1`. El ejemplo de Phaser de `docs/KIT_A_MEDIDA.md` ya lo hace.
  - Ojo: si el cargador de hoy hace `load.atlas` con todos los `animales`, con las aves va a fallar porque no traen `.json`. Hay que preguntar por `tipo === "ave"`.
- **El ancla son las patas.** El sprite va con `setOrigin(ancla[0] / w, ancla[1] / h)`. Para la izquierda, `setFlipX(true)`.
- **El gallo:**
  - Toca `cantar` al arrancar la carrera, con el sonido en el evento `canto`.
  - Toca `asustarse` cuando alguien pasa a menos de 40 px, sin moverlo.
  - Entre medio va `idle` o `picotear`.
- **La paloma:**
  - Toca `despegar` cuando alguien pasa a menos de 40 px. Después la mueve con `volar`, la trae de vuelta y la posa con `aterrizar`.
  - `aire` dice cuánto sube sobre el ancla en cada cuadro, para que la sombra se quede en el piso.

## Pruebas

- **Prueba nueva `aves.test.ts`, 8 casos:**
  - Las animaciones son las acordadas, con el canto en el cuadro 3.
  - Cada cuadro cabe en su celda, con el contorno de los atletas, solo con los colores de su especie y sin tocar los bordes.
  - De pie, las patas tocan la fila del piso. En el aire, no.
  - El gallo se asusta en su sitio: la cadera queda donde estaba y salta 4 y 5 px.
  - El canto sube la cabeza y abre el pico. Picotear llega al piso, en las dos aves.
  - La paloma despega subiendo, vuela con cuadros distintos y aterriza en el piso.
  - El kit: la tira, el ancla, el `aire`, los eventos y las aves en `animales` sin ficha. Un ave que no existe (la garza) sigue avisando.
  - La imagen dorada `golden/aves_c7b.png`.
- **`custom.test.ts`:** el kit de Nekketsu trae el gallo y la paloma (+2 PNG), con su entrada en `animales`. El esquema está regenerado.
- **e2e del visor:** 32 personajes (suman el gallo y la paloma), y el gallo se dibuja en una fila de lado con `cantar`.
- **Suite completa:** 30 archivos, 299 de 299, con el límite del kit en 300 s.
  - Antes fallaba "el kit se genera en menos de 3 minutos": tardó entre 185 y 201 s.
  - **No es de este lote:** la rama de C6a, sin mis cambios, también tardaba 195 s en esta máquina, y las aves suman menos de un segundo.
  - Rick pidió subir el límite a 300 s.
- **El aleteo se prueba:** dos alas arriba, una abajo, la silueta cambia 4 px o más, la cara de abajo clara con el ala arriba, y nada toca el borde de arriba de la celda.
- **`tsc` limpio, `npm run build:sitio` limpio y e2e de Playwright 44 de 44.**

## Para aprobar (todo en esta carpeta)

- `tablero_aves.png`: las dos aves, cada animación con todos sus cuadros, sus fps, sus eventos y su `aire`.
- `gallo_techo.gif`: el gallo en el techo de zinc de la Comuna 13. Canta al arrancar, picotea, y cuando pasan Sophie y Alana se asusta en su sitio.
- `palomas_hem.gif`: tres palomas picotean y caminan en el hẻm. Cuando pasan Sophie y Alana despegan, se van volando hacia el fondo, vuelven y aterrizan.

## Decisiones que tomé sin preguntar

1. **El ave es un esqueleto paramétrico y no un dibujo a mano.** El pedido decía que la paloma saliera "desde el cuervo", el del mundo oscuro, que está dibujado pixel por pixel. Así la garza, la guacamaya y el colibrí salen de una plantilla de datos, igual que los perros y los gatos, y no hay que dibujar cada cuadro a mano.
2. **Sumé `aterrizar` a la paloma.** El juego la devuelve al rato, y sin aterrizar pasaba de volar a caminar de golpe. Si no lo quieren, el juego no la toca.
3. **Sumé el evento `aleteo`** en el cuadro 1 de `asustarse` y de `despegar`, para que el juego ponga el sonido de las alas. Es opcional.
4. **El `aire` va en el manifiesto,** cuadro por cuadro. El juego no mueve al gallo, pero necesita saber que en el salto está 4 o 5 px arriba para no subir la sombra con él.
5. **Las aves no van en atlas con filas,** porque son solo de lado. Van en tira, como los NPC.
6. **Los colores son fijos por especie.** Si el juego quiere otro gallo (blanco, pinto), es otra plantilla o un ajuste de colores en un lote siguiente.

## Límites honestos

- **La paloma es muy chiquita (16 px).** El aleteo se lee por la silueta y la cara clara del ala, no por el detalle de las plumas.
- **El gallo asustado aletea con un ala roja grande** arriba del lomo. A 32 px se lee como "salta aleteando", pero no tiene el abanico de plumas de un gallo de verdad.
- **Ninguna de las dos camina de verdad hacia adelante.** Los pasos y el cabeceo están en su sitio. El juego mueve al ave mientras toca `caminar`.
- **No están en el estudio todavía.** Salen en el kit y en las pruebas, pero el catálogo del estudio no tiene la página de aves.

## Lo que necesita el siguiente lote

- **El juego:**
  - Cargar las aves como spritesheet (ver arriba).
  - Poner el gallo de la Comuna 13 (x 2200, y 20, en el techo de zinc) y las palomas.
  - Avisarme si quiere más aves o colores.
- **Siguiente lote del orden: C5, las burlas por equipo.** Después C7c (el perro con `pounce` y `wake`, y `jump_wall` con `subida`, `muro_min` y `muro_max`).
- **Dependencia:** esta rama sale de C6a (https://github.com/Lothra2/pixel_forja/pull/23).
