# GG Abyss: el final (encargo F13), las cinemáticas y la heroína celestial

Rama: `claude/abyss-celestial` (sale de `claude/abyss-mundo6`, en `b684504`). Un commit por parte, con el kit
regenerado y las pruebas del taller en verde. Todo lo nuevo va en archivos nuevos y el manifest solo agrega: así la
sesión del Mundo 7 puede unir esta rama a la suya sin choques. Detalle para el juego en `docs/KIT_JUEGO.md`, sección
"El final (encargo F13)".

## Cómo se verificó

- `npx tsc -b` y `npm test` en verde (42 archivos, 300 pruebas; antes eran 39). Pruebas nuevas: `celestial`, `ciclo` y
  `cine`.
- Kit regenerado después de cada parte y comparado byte a byte con el de `b684504`: no falta ningún archivo, no cambia
  ninguno (mundos 1 a 6, heroínas, capas de equipo, fx, audio, ui) y en el `manifest.json` todo lo de antes sale igual.
  Solo se agrega.
- Láminas en `docs/entregas/`, se rehacen con `npx tsx scripts/lamina-celestial.ts` y `npx tsx scripts/lamina-cine.ts`:
  - `cine_bajada.png` y `cine_fin.png`: los doce paneles armados con todas sus capas, en el primer cuadro, el del medio y
    el último.
  - `cine_logos.png`: el logo de hielo y el de "Fin" cuadro por cuadro, y la nieve de adelante.
  - `celestial_heroinas.png`: las cuatro heroínas normales y celestiales, lado a lado, en cuatro direcciones.
  - `celestial_vuelo.png`: el vuelo de las cuatro de lado y de frente (subido con su elevación sobre la sombra), y el
    ataque, el golpe y el hechizo con las alas.
  - `celestial_poderes.png`: la lanza en línea con su impacto, la estela, el aura al pie, los íconos y los retratos.
  - `celestial_ciclo.png`: el logo dorado y el marco del ciclo.

## Lo que quedó en el manifest

**Parte 1, `cine_bajada`:** `bajada_puerta`, `bajada_escalera` (480 x 540), `bajada_lago`, `bajada_ladrona`,
`bajada_diablo` y `bajada_titulo`, cada uno con 2 a 4 capas con paralaje. Más `nieve_frente` (128 x 128, 8 cuadros en
bucle), `logo_hielo` (16 cuadros en grilla de 4 x 4, `bucle_desde: 12`), `audio` (`cine_bajada_musica`, `cine_rugido`,
`latido`), `guion` (los cinco subtítulos del encargo y en qué segundo va cada panel) y `notas`.

**Parte 2, `cine_fin`:** `fin_cae`, `fin_llama`, `fin_pisos` (480 x 540), `fin_amanecer`, `fin_alas` y `fin_titulo`.
Más `logo_fin` ("Fin" y, desde el cuadro 8, "¿o no?"; `bucle_desde: 8`), `audio` (`cine_fin_musica`), `guion` y
`notas`.

**Parte 3, en cada heroína de `personajes` (rick, steph, sophie, alana):**
- `anims.volar` (8 cuadros a 10 fps, `elevacion` de 9 a 15 px).
- `capas.alas_detras.celestial`, `capas.alas_delante.celestial`, `capas.aura.celestial` (22 animaciones: las 21 de
  siempre y volar) y `capas.orden_celestial`.
- `capas.pecho.tunica_celestial`.
- `bloques.volar` en las 57 o 58 capas de equipo de cada heroína (con su propio `archivo` y `columnas`).
- `retrato_celestial`.
- Común: `celestial` (la túnica como objeto: nombre, rareza, stats, íconos de 32 y 64; los poderes y sus notas),
  `fx.lanza_luz`, `fx.impacto_luz`, `fx.estela_alas`, `fx.aura_celestial`, `ui.habilidades.alas`, `lanza_luz` y
  `ciclo`, y audio `alas_vuelo`, `lanza_luz` y `celestial_despierta`.

**Parte 4:** `ui.marco_ciclo` (36 x 24, nueve [8, 8, 8, 8]) y `ui.logo_ciclo` (igual que `ui.logo`, en oro).

## Decisiones y lo que tiene que hacer el juego

- **El formato de las cinemáticas es el del intro**, con tres cosas nuevas: `bucle: false` en las capas que pasan una
  vez (la puerta, los ojos del Diablo, las alas que se abren: quedarse en el último cuadro), `por_heroina` en las capas
  donde aparece la heroína (la escalera y las alas: usar la del perfil) y `guion` con los tiempos sobre la música.
- **El rugido va con el título**, como dice el PLAN ("el título que cae con un rugido"): la música hace un silencio
  corto y un golpe a los 50.5 s, y ahí van `cine_rugido` y `logo_hielo`. Mientras al Diablo se le abren los ojos
  suena el latido. Si prefieren el rugido cuando abre los ojos, es cambiar el `en` del guion.
- **El tono.** La bajada es negra y azul con la brasa del Diablo como única luz caliente. Lo que da miedo aparece de a
  poco: los ojos del Diablo tardan cinco cuadros en abrirse. Nada de sangre: lo que brilla en la boca y en las grietas
  es brasa. El cierre va de esa oscuridad a un amanecer rosado y dorado en el Bosque.
- **El Diablo de las cinemáticas es diseño propio**, pintado como relieve (no es una copia de ningún juego): rojo
  oscuro, cuernos enormes que se abren hacia arriba con escarcha, ceño de hueso, espinas en los pómulos y los hombros,
  colmillos, garras negras, alas de murciélago rotas y grietas de brasa. La paleta está en `DIABLO`
  (`src/engine/cine/diablo.ts`).
- **La familia y la Primera Luz.** En el amanecer están las cuatro heroínas y Thor como sus personajes del juego (sin
  fotos). La Primera Luz es una niña de luz dorada y blanca, cabezona como las heroínas, con dos colitas y los ojos
  cerrados contentos. En `fin_llama` primero se ve la Ladrona encapuchada y se deshace en ella.
- **Las alas se arman sobre el esqueleto de cada cuadro** (cuello, cadera y cabeza), en 3D sencillo, y se proyectan
  según hacia dónde mira la heroína. Cada ala va entera delante o detrás según dónde queda su raíz (si no, se veía una
  costura donde cruza el cuerpo) y lo de delante nunca tapa la cabeza ni la cara (una prueba lo revisa). En cada vista
  el ala tiene un tamaño fijo, el más grande que cabe abierta del todo en la celda de 48: por eso en las diagonales se
  ve un poco más chica. Las de Alana son más chicas (va según el largo del torso).
- **Cómo se mueven:** respiran en reposo, aletean suave al caminar y más al correr, se recogen un cuadro antes del
  golpe y se abren de golpe en el impacto (el cuadro del `impacto` o la `suelta` de cada animación), se pliegan en
  `hit`, caen en `die` (la aureola se apaga en la segunda mitad), giran con el torbellino y en `volar` dan aletazos
  completos (el ala baja en los cuadros 2 a 4, justo cuando más sube el cuerpo).
- **El vuelo del equipo.** Para no cambiar las hojas de equipo de antes, cada pieza trae el vuelo en una hoja aparte y
  el bloque `volar` dice cuál: `bloque.archivo ?? capa.archivo`.
- **La túnica** es la túnica de nivel 5 en blanco y oro, sin hombreras. Va como pieza de pecho, así que la heroína la
  tiene que tener puesta para verse; las alas y la aureola van siempre.
- **Los efectos de luz** traen transparencia suave y funcionan en modo normal, pero se ven mejor sumando luz (ADD).
- **El audio** sale de un sintetizador nuevo (`src/engine/audio/sintesis.ts`) con su propia semilla: el de antes no
  cambia ni un bit. Coro sin palabras, cuerdas graves, timbales, campanas y viento. La música del cierre trae el tema
  del Bosque (la misma melodía de `musica_bosque`) en campanas desde los 36 s.

## Lo que falta o quedó distinto

- **El Diablo del Mundo 7 todavía no está en `claude/abyss-mundo7`** (la rama no existía cuando terminé). El de las
  cinemáticas sigue al pie de la letra la descripción del PLAN F13. Cuando esa sesión tenga el suyo conviene mirar
  los dos juntos: si cambia algo grande (el color de los cuernos, la forma de las alas), se ajusta acá con la paleta de
  `DIABLO`.
- **La heroína en la escalera es chiquita** (a celda 48, sin agrandar), como pide el encargo: se reconoce por el pelo y
  la ropa, no por la cara.
- **`fin_llama` tiene 8 cuadros a 4 fps** (dos segundos) para que la tira no pase de 4096 px, como el resto.
- **Los subtítulos y el texto** los pone el juego con sus fuentes (no van horneados en los paneles).
- **La túnica no está en el catálogo del botín** (`botin/catalogo.json`) para no cambiar los atlas de antes: va en
  `celestial.tunica` con sus íconos aparte.
- No abrí PR (no se pidió) y no toqué `main`, las ramas `claude/olimpico-*` ni ninguna otra rama.
