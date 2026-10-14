# GG Abyss: Mundo 5, La Ciudad Dormida

Rama: `claude/abyss-mundo5` (sale de `claude/abyss-mundo4`, en `243c319`). Un commit por parte, con el kit regenerado y
las pruebas del taller en verde. Lo que el juego tiene que leer está todo en el manifest (`mundos[4]` y lo nuevo en
`personajes`, `fx`, `audio` y `ui.habilidades`). Detalle para el juego en `docs/KIT_JUEGO.md`, sección Mundo 5.

## Cómo se verificó

- `npx tsc` y `npm test` en verde. Pruebas nuevas: `ciudad` (mapa, objetos, portal e íconos), `ciudadEnemigos`,
  `reyPiedra` y `ciudadAudio`.
- Kit regenerado y comparado byte a byte con el de antes (el de `243c319`): no falta ningún archivo, no cambia ninguno
  de los mundos 1 a 4 (mapas, trozos del suelo, postales, objetos, personajes, fx, audio, ui) y en el `manifest.json`
  los mundos 1 a 4 y todo lo de antes salen iguales. Solo se agrega.
- Láminas en `docs/entregas/`, se rehacen con `npx tsx scripts/lamina-mundo5.ts`:
  - `mundo5_mapa.png`: el mapa entero chiquito con las entidades.
  - `mundo5_postales.png`: una postal por zona con la oscuridad de la zona y las luces como en el juego.
  - `mundo5_estatuas.png`: cada ciudadano dormido, despertando y despierto, lado a lado.
  - `mundo5_objetos.png`: cada objeto con su versión despierta al lado (casas, fuente, torre, puestos, árbol, organillo).
  - `mundo5_enemigos.png` y `mundo5_rey.png` (al lado de la heroína).
  - `mundo5_ladrona.png`: la Ladrona robando un farol (con el hilo hasta el farolito), yéndose, y el portal plata.
  - `mundo5_iconos.png`: prender y chispas a 40 y a 80.

## Lo que quedó en el manifest

**Mundo 5** (`mundos[4]`, `id: mundo5`, mapa `mundo/mundo5_ciudad.json`, 110 x 100, `portal: portal_plata`)
- Zonas: La Puerta de la Ciudad, La Calle de los Panaderos, La Plaza de la Fuente, El Barrio de los Músicos, Los
  Jardines de Piedra, La Torre del Reloj, El Puente de los Faroles, El Palacio Dormido, y los secretos El Corazón del
  Jardín y El Desván del Organillero. Oscuridad, bruma y ambiente como pide la tabla, partícula `polvo_sueno`.
- Postales: `puerta_de_la_ciudad`, `calle_de_los_panaderos`, `plaza_de_la_fuente`, `barrio_de_los_musicos`,
  `jardines_de_piedra`, `torre_del_reloj`, `puente_de_los_faroles`, `palacio_dormido`.
- Entidades: `portal_llegada`, `portal_volver` (mundo4), `jugador_inicio`, `thor_inicio`, 5 `punto_guardado` con
  `farol_plaza: true` y sus 5 `farol_plaza` (con `punto` y `barrio`), 40 `chispa` (8 por barrio con farol), 8
  `figura` (una con `alto: true` en el balcón del palacio), 20 `estatua` (las 10 variantes), 10 `cofre` (2 con
  `secreto`, 1 `guardado_por: relojero`, 1 `tras_jefe`), `fuente`, `torre_reloj`, `mural` (`pieza: 5`),
  `cajita_musica`, `arena_jefe` (`radio: 208`, `trono: true`), `jefe` (`rey_de_piedra`, "El Rey de Piedra", "El que
  se durmió con la luz de todos"), 4 `lampara_trono`, `portal_jefe` (`destino: mundo6`) y los enemigos: 11
  `sonambulo_piedra`, 5 `gargola_dormida`, 8 `duende_sueno` y `relojero` (`elite: true`, "El Relojero").
- Objetos: `farol_plaza_apagado`, `farol_plaza_prendido`, `farol_plaza_prenderse`, `farol_plaza_robado`,
  `chispa_luz`, `estatua_ciudadano_0..9`, `casa_ciudad_0..9`, `fuente_plaza`, `torre_reloj`, `trono_rey`,
  `lampara_trono_apagada`, `lampara_trono_prendida`, `lampara_trono_prenderse`, `cajita_musica`, `seto_piedra_0..3`,
  `flor_piedra_0..3`, `banderines_rotos_0..1`, `arco_calle_0..1`, `lampara_colgante_0..1`, `fondo_ciudad_lejos_0..2`,
  `mural_5`, `figura_ladrona` (con `farolito`), `portal_plata`, y de más: `arbol_piedra_0..2`, `puerta_ciudad`,
  `puesto_dormido_0..2`, `glorieta_musica`, `organillo`, `atril_piedra_0..1`, `estandarte_palacio_0..2`, `farol_puente_0..3`, `columna_palacio_0..1`, `balcon_palacio`,
  `alfombra_palacio`, `banco_piedra`, `maceta_piedra_0..1`, `carretilla_pan`, `cajon_pan`, `cantaro`, `aljibe`, las
  variantes `_b`, y las calcomanías `adoquines_rotos_0..2`, `polvo_sueno_0..2`, `petalos_piedra_0..1`,
  `charco_seco_0..1` y `rayuela_0`.
- `faroles`, `chispas`, `estatuas` y `notas_luz` con las notas para el juego.

**Enemigos y jefe** (en `personajes`)
- `sonambulo_piedra` (48): `quieto`, `idle`, `walk`, `attack` (`aviso` [1, 4], ojos celestes), `hit`, `die`.
- `gargola_dormida` (48, `vuela`): `posada`, `despertar`, `walk`, `attack` (`aviso` [1, 6]), `hit`, `die`.
- `duende_sueno` (48): `idle`, `walk`, `attack`, `hit`, `die`.
- `relojero` (64, `elite`): `idle`, `walk`, `attack`, `attack_heavy` (`aviso` [1, 8]), `warcry`, `hit`, `die`.
- `rey_de_piedra` (128, `tipo: jefe`, pivote `[64, 109]`, `luz_corona`): `idle`, `walk`, `attack` (`aviso` [1, 6]),
  `attack_heavy` (`aviso` [1, 7], `elevacion`), `barrido` (`aviso` [1, 6]), `warcry`, `aturdido`, `hit`, `die`, y en
  cada anim `corona` por dirección y por cuadro.
- `fx`: `sombra_picada`, `proyectil_arena_<dir>`, `impacto_arena`, `aviso_aguja`, `aviso_puno`, `grieta_luz`,
  `nota_cuna`.

**Audio:** `ambiente_ciudad`, `ambiente_cajita`, `ambiente_jardin`, `ambiente_reloj`, `ambiente_abismo`,
`musica_jefe_rey`, `musica_relojero`, `musica_despertar`, `farol_plaza_prender`, `luz_robada`, `chispa_recoger`,
`estatua_paso`, `estatua_quieta`, `gargola_despierta`, `gargola_picada`, `arena_sueno`, `bostezo`, `reloj_campanada`,
`aguja_barre`, `rey_puno`, `rey_pisoton`, `rey_canta`, `corona_rompe`, `ciudad_despierta`.

**Íconos:** `ui.habilidades.prender` y `ui.habilidades.chispas`.

## Decisiones y lo que tiene que hacer el juego

- **El camino.** Puerta (portal, guardias dormidos, primer farol con `tutorial`) > Calle de los Panaderos > Plaza de la
  Fuente > Barrio de los Músicos > Puente de los Faroles (sobre el abismo) > cabecera del puente > Palacio (patio y,
  por dos escaleras, la sala del trono). Ramas que vuelven al camino: el callejón de los hornos (debajo de la calle),
  los Jardines de Piedra (de la puerta al laberinto y de ahí a la Torre del Reloj, que sube a la plaza por una
  escalinata) y el Puentecito del Reloj (de la torre a la cabecera del puente, el atajo). La prueba tapa cada rama y
  verifica que se siga llegando a los faroles y a la arena.
- **Los barrios con farol** son cinco: la Puerta, la Plaza de la Fuente, el Barrio de los Músicos, el Puente de los
  Faroles (el farol está en la cabecera) y el Palacio. La Calle, los Jardines y la Torre no tienen farol propio (son
  más cortos o son ramas), así que no tienen chispas ni Ladrona.
- **La sala del trono.** El trono va contra la pared del fondo, justo en el borde de la arena (el Rey pelea cerca del
  trono). Adentro del radio no hay nada sólido salvo el pie de las cuatro lámparas, y se camina entero alrededor. El
  `portal_jefe` y el cofre `tras_jefe` aparecen abajo de la sala.
- **Estatuas: objeto más entidad.** Igual que el farol del muelle del Puerto, cada estatua va como objeto en la capa
  objetos y como entidad `estatua` en el mismo punto. El juego cambia la anim del objeto de ese punto. Las casas, los
  puestos, los árboles y la fuente no traen entidad: al vencer al Rey se pasa todo lo que tenga anim `despierta` (o
  `corre` la fuente, `andando` la torre).
- **Los sonámbulos y las gárgolas.** En la luz el juego deja al sonámbulo en `quieto` (piedra, ojos cerrados). La
  gárgola posada es igual a una estatua hasta que despierta. Los ojos celestes solo se prenden en el aviso del
  empujón.
- **La corona.** Como la `antena` del Pez Farol. En `die` la corona se rompe en el cuadro 5: de ahí en adelante es
  `null` y el juego hace volar la luz hacia arriba desde el último punto (la hoja ya trae los pedazos de la corona y
  la luz que sube un poco).
- **El farolito de la Ladrona** va en el objeto (`objetos.figura_ladrona.farolito`) porque es un objeto del mapa, no
  un personaje con 8 direcciones.
- **Ambiente `abismo`.** La tabla le pone ambiente `abismo` al Puente y el audio no lo nombraba: va hecho
  (`ambiente_abismo`, viento hondo y un tic tac lejísimos) para que el juego no se quede sin sonido ahí.
- **Música.** Las zonas traen `musica: ninguna`. Si el juego no reconoce `ninguna`, que no toque nada.

## Lo que falta o quedó distinto

- **Cosas de más.** El encargo pide 8 estatuas, van 10 (el segundo guardia, con escudo, para que la puerta no repita,
  y la señora que riega las flores de la idea del piso). También van árboles de piedra, la glorieta de los músicos,
  la puerta de la ciudad, puestos, columnas, el balcón y cuatro faroles muertos para el puente.
- **Lo que se repite en una pantalla.** Los setos del laberinto son las paredes (como cuadros del piso): hay 8
  variantes pero se repiten. Las cuatro lámparas del trono son iguales a propósito (las del encargo). Todo lo demás no
  se repite en ninguna postal, y eso lo revisa una prueba.
- **La lámina de las postales simula la luz.** El kit trae las postales a pleno, como los otros mundos.
- **La Ladrona** es la figura de las Galerías con farolito y brazo nuevos, no un dibujo desde cero.
- **El duende y el sonámbulo** son gente del mismo armado que las estatuas (proporciones de persona, no chibi).
- **Pasada de pulido** (después de la entrega): cabezas y ojos más grandes en toda la gente de piedra (estatuas,
  sonámbulo, duende y Relojero) para que la cara se lea a 48 px, los niños de la ronda un poco más grandes, el gorro
  del duende más arriba para que se le vea la cara y la barba, el Relojero más grande en su celda de 64 (sin
  desbordar), la fuente seca con taza honda y pie torneado (antes se leía como una cruz), la mano del ícono `prender`
  adentro del aro, y objetos nuevos para que las postales no queden vacías: el organillo y dos atriles en el Barrio
  de los Músicos, y tres estandartes del Rey en la pared de la sala del trono.
- No abrí PR (no se pidió) y no toqué `main`, las ramas `claude/olimpico-*` ni ninguna otra rama.
