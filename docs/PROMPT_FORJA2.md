Proyecto: **Forja 2**. PixelForja es mi taller de arte 2D por código para todos mis juegos (GG Abyss, Street Family Fighter 2, Nekketsu Olympic GG). Hoy el motor dibuja cuerpos flacos con 4 tonos y las animaciones de pelea que probamos salieron patéticas: las hicimos con imágenes de IA cortadas en cuadros y cada cuadro era otro dibujo. Se acabó eso. Quiero dos mejoras puntuales, hechas por el motor, sin IA de imágenes ni servicios pagos, y que después todos mis juegos mejoren solos por usar el taller.

1. **Movimiento premium para cualquier juego 2D**, con estilos de personaje distintos, objetos en la mano y en el inventario, y poderes.
2. **Un cuerpo con volumen**: el renderizador de los jefes (SDF, 6 tonos, materiales, luz) aplicado a los personajes.

## Cómo trabajamos
- Háblame en español venezolano casual, directo, sin relleno. Sin em dash ni punto y coma.
- Sé crítico. Si algo de esto está mal pensado, dímelo antes de construir y propón otra cosa.
- Nunca digas que algo está probado si no lo corriste. Las pruebas en verde van en cada commit.
- Trabajas por fases. Al cierre de cada fase te detienes, me muestras GIFs y láminas, me dices con honestidad qué no salió bien y esperas mi visto bueno. No arranques la fase siguiente sin eso.
- Un commit por tarea. Push a la rama de la sesión. Nada de PRs si no los pido.
- Lee primero `docs/PLAN.md`, `docs/KIT_JUEGO.md`, `docs/KIT_DEPORTES.md`, `docs/PROMPT_LUCHADOR.md`, `docs/pelea/JUEGO/LEEME.md`, `docs/pelea/FAMILIA/ENTREGA.md` y `docs/pelea/PILOTO/ENTREGA.md`. Ahí está lo que ya se intentó y por qué no sirvió.

## La rama y lo que no se pisa
- Trabajas en `claude/forja2`, que sale de `claude/pelea-familia`. Esa rama es la más nueva: tiene el motor de luchador por volúmenes, el kit deportivo y el contrato de pelea. Solo haces push a `claude/forja2`. Nunca a `claude/pelea-familia`, `claude/abyss-*`, `main` ni `claude/olimpico-*`.
- **Primer paso, antes de cualquier cosa nueva:** trae `origin/claude/abyss-premium` a `claude/forja2` con un merge normal, sin reescribir historia. Hay 12 archivos en conflicto conocidos: `.gitignore`, `scripts/game-kit.ts`, `src/engine/__tests__/intro.test.ts`, `src/engine/anim/premium.ts`, `src/engine/audio/ambience.ts`, `src/engine/audio/sfx.ts`, `src/engine/export/motion.ts`, `src/engine/kit/gamekit.ts`, `src/engine/kit/sportskit.ts`, `src/engine/render/clip.ts`, `src/engine/render/human.ts` y `src/engine/ui/fonts.ts`. Resuélvelos conservando las dos cosas: lo de pelea y lo de GG Abyss. Después de ese merge, las pruebas de las dos ramas tienen que pasar, `golden/` tiene que dar pixel por pixel igual, y el kit de GG Abyss regenerado con `scripts/game-kit.ts` tiene que ser idéntico al de `claude/abyss-premium`. Si no logras eso, paras y me lo dices. Ese merge es un commit solo, con su explicación.
- **Lo de Higgsfield queda intacto, es la red de seguridad.** No borres, no muevas y no pises `docs/pelea/JUEGO/`, `docs/pelea/PIXEL/`, `docs/pelea/PILOTO/`, `scripts/luchador_pixel/` ni `src/engine/luchador/pixel/`. Forja 2 escribe su arte de pelea en una carpeta nueva, `docs/pelea/FORJA2/`, con el mismo contrato. El juego Street Family Fighter 2 cambia de carpeta solo cuando yo lo apruebe, y eso lo hago yo en el repo del juego.
- Mismo criterio para todo: lo viejo no se borra ni se cambia por debajo. Lo nuevo convive al lado y se elige por un interruptor en la ficha o en el exportador.

## Reglas que no se tocan
- **Nada de IA de imágenes ni servicios pagos.** El arte sale del motor. Si en el camino te parece que la IA ayudaría, me lo dices y no lo haces.
- **Las fotos de `private/` nunca se suben ni se publican.** No las necesitas para esto.
- **GG Abyss no se rompe.** Los perfiles `classic` y `premium`, las fichas de la familia, el kit que exporta `scripts/game-kit.ts` y las imágenes doradas de `golden/` quedan pixel por pixel iguales mientras la ficha no pida Forja 2. Lo nuevo es un perfil nuevo o un módulo aparte, nunca un cambio silencioso en lo viejo.
- **Street Family Fighter 2 y Nekketsu no se rompen.** El contrato de pelea de `docs/pelea/JUEGO/LEEME.md` y el kit deportivo de `scripts/sports-kit.ts` siguen saliendo iguales con las opciones de hoy.
- **Todo es dato antes que código.** Un movimiento nuevo o un estilo nuevo tiene que poder agregarse con un archivo de datos, no con un renderizador nuevo.

## Lo que ya existe y tienes que reusar, no reinventar
- `src/engine/rig/pose.ts`: la pose humana con IK de dos huesos, `support`, `air`, `props` con ángulo por vista y `smear`.
- `src/engine/anim/premium.ts`, `fight.ts`, `types.ts`: animaciones por poses clave con contacto, bajada, paso y subida, anticipación, impacto y recuperación, eventos `paso`, `impacto`, `suelta`, `despegue`, `aterriza`, y el control de altura y temblor. Esto es lo que hay que llevar a otro nivel, no botar.
- `src/engine/boss/sdf.ts`, `boss/render.ts`, `boss/ramp.ts`, `boss/secondary.ts`: volúmenes con unión suave, 8 direcciones de verdad, rampas de 5 a 7 tonos, texturas, oclusión y movimiento secundario. Es el motor del cuerpo nuevo.
- `src/engine/luchador/esqueleto.ts`, `luchador/volumen.ts` y `luchador/render.ts`: un esqueleto 3D de luchador con `giro` hacia la cámara y un renderizador por volúmenes a 7 cabezas y media que se abandonó por la IA. Rescátalo y únelo con el de los jefes: tiene que quedar un solo motor de volúmenes para cualquier tamaño.
- `src/engine/render/pet3d.ts`: volúmenes para los animales.
- `src/engine/loot/canvas.ts` y `loot/render.ts`: materiales (metal, madera, cuero, tela, gema, piedra, pelaje) y el armado del equipo en la mano.
- `src/engine/kit/capas.ts`: las capas de equipo como diferencia de pixeles entre con y sin la pieza.
- `src/engine/parts/lpc.ts` y `head3d/`: las cabezas. **No las cambies**, solo las enganchas al cuerpo nuevo.
- `scripts/sports-kit.ts` con `--datos --atlas`, y el contrato de pelea en `docs/pelea/JUEGO/LEEME.md` (`manifest.json` con ticks, fase, cajas, `golpe`, `avance`, `bola`). Los juegos ya leen esos formatos: Forja 2 los llena mejor, no los cambia.

## Pilar 1: el cuerpo con volumen (`cuerpo`)

Un solo renderizador de humanos por volúmenes SDF que sirve de 32 a 192 px, con la cabeza de siempre (LPC o volumen) enganchada en el cuello.

- **Esqueleto 3D común.** El de los jefes y el del luchador se funden en uno: huesos con base `giro`, `inclina`, `ladeo`, las poses de `rig/pose.ts` se proyectan a 3D y viceversa, así todas las animaciones viejas siguen sirviendo en el cuerpo nuevo.
- **Volúmenes con sección y músculo.** Cápsulas y elipsoides por hueso con pecho y espalda, hombros, antebrazos, muslos y pantorrillas con forma, manos en puño, abierta y en garra, pies con punta. La unión suave dentro de cada grupo y dura entre grupos, como en los jefes.
- **Luz y sombra.** Luz fija configurable por juego. Rampas de 5 a 7 tonos con desvío frío en sombra y cálido en luz (`boss/ramp.ts`), oclusión en axilas, entrepierna y bajo la barbilla, brillo de borde opcional, contorno selectivo de 1 px del tono oscuro de la pieza de atrás. Dibujar a 2x o 4x y bajar a la celda con paleta fija, limpieza de pixeles sueltos y sin difuminado.
- **Materiales.** Piel, tela, cuero, malla, placas, pelaje, gema y energía, los del botín, aplicados a cada pieza de ropa de la ficha (`outfit`, `armor`, `cape`, `belt`, `pauldrons`, `gear`).
- **Ropa con movimiento.** Capa, falda, cola de pelo y cinturón suelto con un paso de física simple (`physics.hairLag` ya existe): retraso y rebote, nunca atraviesan el cuerpo.
- **Niveles de acabado por juego**, en la ficha: `retro3` (3 tonos cel), `sf2` (5 a 7 tonos tipo Capcom), `suave` (7 tonos con oclusión). Mismo cuerpo, otro acabado.

## Pilar 2: estilos de personaje (`estilo`)

Un preset de proporciones y de dibujo que se elige en la ficha y cambia todo el cuerpo sin tocar las animaciones. Mínimo estos, con una lámina de cada uno de frente, de lado y de espalda a 48, 64 y 128:

| Estilo | Cabezas de alto | Rasgos |
|---|---|---|
| `cabezon` (chibi) | 2 a 2,5 | el de GG Abyss hoy, cabeza casi mitad del alto, manos y pies grandes |
| `nekketsu` | 3 | cabeza grande y cuadrada, cuerpo macizo, piernas cortas, puños enormes, estilo Kunio-kun y River City |
| `anime` | 6 a 7 | fino, piernas largas, pies y manos grandes, ojos grandes, pelo con mechones y puntas |
| `megaman` | 3,5 a 4 | redondo y liso, casco y botas gordas, articulaciones de bola, sin dedos |
| `luchador` | 7 a 7,5 | adulto de SF2, hombros anchos, músculo marcado, pecho girado a la cámara |
| `retro8bit` | 2,5 a 3 | 16 x 16 o 24 x 32, 3 tonos, silueta primero, para plataformas chicas |

Cada estilo trae su tabla de dimensiones por celda (como `rig/dims.ts` hoy) y sus reglas de exageración: cuánto se estira al saltar, cuánto se aplasta al caer, qué tan grande es el puño en el cuadro de impacto. Los dos de hoy (`chibi`, `juvenil`, `realista`) siguen existiendo tal cual para no romper nada.

## Pilar 3: el movimiento (`movimiento`)

Esto es lo que más importa. La diferencia entre patético y premium no es el dibujo, es el tiempo y las poses.

- **Un movimiento es un archivo de datos** (`anims/<pack>/<nombre>.json` o `.ts` solo con datos): poses clave con ticks de 60 por segundo, curva de entrada y salida por tramo (`lineal`, `inout`, `golpe` que acelera de golpe, `freno`), cuántos intermedios, fase por cuadro (`inicio`, `activo`, `recuperacion`, `neutral`, `golpeado`), eventos, `support`, `avance` por cuadro, `travel`, cajas que pegan y reciben por cuadro (se calculan de los huesos y se pueden corregir a mano), y qué objeto va en cada mano.
- **Principios de animación aplicados por el motor, no por el que escribe el movimiento:** anticipación proporcional a la fuerza, un solo cuadro de impacto estirado con `smear` y chispa, sobrepaso y recuperación más larga que el golpe, arcos en manos y pies (nunca línea recta entre dos claves), aplastar y estirar al saltar y caer según el estilo, movimiento secundario de pelo y ropa con retraso, cabeza que lidera el giro, peso en el pie de apoyo sin patinar, respiración en reposo. Cada principio es una regla con su prueba.
- **Bibliotecas por tipo de juego**, cada una completa y probada en un personaje de cada estilo:
  - `pelea` (SF2): guardia, avanza, retrocede, carrera, agacharse, salto en tres fases, bloqueo alto y bajo, puño y patada débil y fuerte de pie, agachado y en el aire, barrida, agarre y agarrado, recibe alto, bajo, aire, caída, levanta, mareado, intro, victoria, tres poderes con proyectil o embestida.
  - `calle` (beat 'em up): lo de `deportes calle` hoy más combos de tres golpes, levantar, llevar y lanzar, armas del piso.
  - `plataforma` (Megaman, Celeste): correr con freno y derrape, salto con subida, cima y caída, pared, agacharse, disparo parado, corriendo y saltando, recibe, muerte.
  - `rpg8` (GG Abyss, top-down en 8 direcciones): las 21 animaciones del contrato de hoy, rehechas con los principios nuevos y el cuerpo nuevo, pixel por pixel compatibles en celda, pivote y cuadros.
  - `deportes`: lo que ya existe en el kit deportivo, pasado por el mismo control de calidad.
- **Objetos e inventario.** Cualquier `PropKind` y cualquier objeto del catálogo de botín se engancha en mano, espalda, cadera o cabeza con su ángulo por vista, sigue el arco del golpe, se balancea al caminar y respeta el orden de dibujo delante y detrás del cuerpo. Un personaje con espada, escudo, mochila y casco tiene que verse bien en las cinco bibliotecas sin trabajo extra.
- **Poderes.** Un módulo de efectos por código, sin imágenes: proyectiles (bola de energía, flecha, cuchilla, estrella), auras, ondas de choque, estelas de golpe, elementos (fuego, hielo, hojas, rayo, luz), cada uno con sus cuadros, su punto de salida ligado a la mano o al pecho, y su evento `suelta`. Los que ya existen en `luchador/efectos.ts`, `fx/` y los jefes se unifican aquí.
- **Control de calidad automático**, con números, por animación y por estilo: pivote que no se mueve, pie de apoyo que no patina (más de 1 px es falla), altura estable en los ciclos (±1 px), silueta legible (contraste contra fondo neutro), sin pixeles sueltos, sin salto brusco entre cuadros (diferencia de pixeles entre cuadros seguidos con tope), cajas dentro del cuerpo, paleta fija. Todo en Vitest y en una tabla por entrega.

## El estudio
- **Editor de poses mejorado** sobre el que existe: cebolla (los cuadros vecinos transparentes), línea de tiempo con ticks y curvas, arcos dibujados de manos y pies, cajas encendidas o apagadas, vista previa a tamaño real y x3, y cambio de estilo en vivo para ver el mismo movimiento en cabezón, anime y luchador.
- **Visor de movimiento** con todas las animaciones de un pack corriendo en fila, con el control de calidad al lado.

## Exportación
- GG Abyss: el mismo kit de hoy, con `movementProfile: 'forja2'` en la ficha como único interruptor.
- Pelea: el contrato de `docs/pelea/JUEGO/LEEME.md` tal cual, generado por el motor, en `docs/pelea/FORJA2/`. Con una lámina por luchador de lo viejo al lado de lo nuevo, mismo movimiento y mismo cuadro.
- Deportes y calle: lo de `scripts/sports-kit.ts`.
- Nuevo y general: una hoja PNG más un JSON por animación (`cell`, `pivot`, `fps`, `loop`, `frames`, cajas, eventos, `avance`), listo para Phaser, Godot y Unity.

## Fases y puertas

Cada fase termina con GIFs a tamaño real y x3, láminas de antes y después, la tabla de control de calidad y la lista honesta de qué no salió bien.

0. **Base.** La rama, el merge de `abyss-premium`, las pruebas de las dos ramas en verde, `golden/` igual y el kit de GG Abyss idéntico. Sin esto no hay piloto.
0b. **Piloto, dos semanas de trabajo como mucho.** Un solo personaje (Rick) en dos estilos, `luchador` a 160 px y `cabezon` a 48, con cuatro movimientos de pelea: guardia, puño fuerte, patada fuerte, recibe. Cuerpo por volúmenes y movimiento con los principios. Se compara al lado de lo de `docs/pelea/JUEGO` y de `docs/pelea/PIXEL`. **Puerta:** si en el piloto el cuerpo se ve de plástico o el movimiento no tiene peso, se para y se repiensa. No se sigue por inercia.
1. **Cuerpo.** El motor de volúmenes completo con materiales, acabados y las cabezas enganchadas. Los seis estilos con sus láminas. Golden de GG Abyss intacto.
2. **Movimiento.** El formato de datos, los principios como reglas del motor, el control de calidad y la biblioteca `pelea` completa para los cinco de la familia.
3. **Bibliotecas.** `rpg8`, `plataforma`, `calle` y `deportes`, cada una probada en tres estilos. Objetos e inventario en todas.
4. **Poderes y efectos.**
5. **Estudio y exportación.** Editor, visor, exportadores y docs (`docs/FORJA2.md` con cómo se agrega un estilo, un movimiento, un objeto y un poder con solo datos).
6. **GG Abyss con Forja 2.** Las fichas de la familia con `forja2`, el kit regenerado, comparación en el juego real en iPad y compu, y memoria medida. Solo si gana a lo de hoy.

## Criterio para seguir o parar, en cada puerta
Me respondes esto con honestidad y con imágenes:
- ¿El cuerpo se ve con volumen o de plástico? ¿Las manos y los pies se leen a tamaño real?
- ¿El movimiento tiene peso? Anticipación, impacto, recuperación, arcos, secundario.
- ¿El mismo movimiento se ve bien en cabezón, anime y luchador sin retoque a mano?
- ¿Qué número del control de calidad falla y por qué?
- ¿Cuánto falta y qué recortarías si tuvieras la mitad del tiempo?

## Cómo te comunicas conmigo
- Yo soy la sesión que te creó (`@parent`), la que vigila GG Abyss y los otros juegos. Rick ve lo que yo le muestro. Cuando el prompt dice "me muestras" o "mi visto bueno", es a mí: mándame un `send_message` a `@parent`.
- En cada puerta de fase manda: el hash del último commit en `claude/forja2`, la lista de rutas de los GIFs y láminas en el repo (así yo los abro desde la rama), la tabla de control de calidad y la lista honesta de qué no salió bien. Después esperas mi respuesta antes de seguir. Si en 2 horas no respondo, sigues con lo que no dependa de la decisión y me lo dices.
- Si te trancas con algo que no puedes decidir solo (un conflicto del merge que pierde algo, una regla que choca con otra), me escribes antes de improvisar.
- Al terminar la fase 0 (la base) me mandas el hash aunque no haya nada que ver: con eso reviso que GG Abyss siga idéntico desde mi lado.
- Guarda el texto completo de este encargo en `docs/PROMPT_FORJA2.md` en el primer commit, y lleva un `docs/forja2/PROGRESO.md` con el estado de cada fase.
