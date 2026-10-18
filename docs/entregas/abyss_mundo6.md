# GG Abyss: Mundo 6, La Fragua de las Luces

Rama: `claude/abyss-mundo6` (sale de `claude/abyss-mundo5`, en `cfa5d34`). Un commit por parte, con el kit regenerado
y las pruebas del taller en verde. Lo que el juego tiene que leer está todo en el manifest (`mundos[5]` y lo nuevo en
`personajes`, `fx`, `audio` y `ui.habilidades`). Detalle para el juego en `docs/KIT_JUEGO.md`, sección Mundo 6.

## Cómo se verificó

- `npx tsc -b` y `npm test` en verde. Pruebas nuevas: `fragua` (mapa, objetos, portal e íconos), `fraguaEnemigos`,
  `dragona` y `fraguaAudio`.
- Kit regenerado y comparado byte a byte con el de `cfa5d34`: no falta ningún archivo, no cambia ninguno de los mundos
  1 a 5 (mapas, trozos del suelo, postales, objetos, personajes, fx, audio, ui) y en el `manifest.json` todo lo de
  antes sale igual. Solo se agrega.
- Láminas en `docs/entregas/`, se rehacen con `npx tsx scripts/lamina-mundo6.ts`:
  - `mundo6_mapa.png`: el mapa entero chiquito, con las jaulas (puntos de su color) y las grietas (en naranja).
  - `mundo6_postales.png`: una postal por zona con la oscuridad de la zona y las luces como en el juego (la lava,
    los braseros, las fuentes frías y las jaulas; las grietas en aviso o al rojo según su fase).
  - `mundo6_jaulas.png`: las cinco jaulas cerradas, abriéndose, vacías y su luz libre, y las grietas en sus tres
    estados.
  - `mundo6_objetos.png`: los objetos en estantes, con su versión apagada o soplando al lado.
  - `mundo6_enemigos.png` y `mundo6_dragona.png`: al lado de la heroína (la Dragona encendida, apagada y dorada).
  - `mundo6_puerta.png`: la Puerta Negra, la Ladrona cargando jaulas y el portal brasa.
  - `mundo6_iconos.png`: los íconos nuevos a 40 y a 80.

## Lo que quedó en el manifest

**Mundo 6** (`mundos[5]`, `id: mundo6`, mapa `mundo/mundo6_fragua.json`, 110 x 100, `portal: portal_brasa`)
- Zonas: La Escalera de Ceniza, El Río de Lava, Las Jaulas Colgantes, Los Fuelles, El Bosque de Ceniza, La Cárcel de
  las Luces, El Horno, El Corazón de la Fragua, y los secretos El Nido de Ceniza y La Alacena del Herrero. Oscuridad,
  bruma, partícula y ambiente como pide la tabla (partícula nueva `brasas`).
- Postales: `escalera_de_ceniza`, `rio_de_lava`, `jaulas_colgantes`, `los_fuelles`, `bosque_de_ceniza`,
  `carcel_de_las_luces`, `el_horno`, `corazon_de_la_fragua`.
- Lava: la capa `agua` es lava (`agua: mundo/mundo6_agua.png`), `espuma` es el borde que brilla, sin `reflejo`, y
  `agua_apagada: mundo/mundo6_agua_apagada.png` para después de la Dragona.
- Entidades: `portal_llegada`, `portal_volver` (mundo5), `jugador_inicio`, `thor_inicio`, 5 `punto_guardado` con
  `fuente_fria: true`, 51 `jaula` (5 a 9 por zona, las cinco luces mezcladas, 8 con `carcel: true`), 21 `charco_frio`,
  38 `grieta` (rectángulos de 64 con `fase`), 3 `fuelle`, 9 `cofre` (2 `secreto`, 1 `guardado_por: carcelero`, 1
  `tras_jefe`), 4 `figura` (una con `alto: true` en la Puerta Negra), `mural` (`pieza: 6`), `arena_jefe` (`radio:
  224`), `jefe` (`dragona_brasa`, "La Dragona de Brasa", "La que guarda el fuego hecho de luces"), 4 `surtidor` y sus
  4 `palanca`, 4 `cadena`, `puerta_negra`, `portal_jefe` (`destino: mundo7`) y los enemigos: 15 `hollin`, 7
  `salamandra_brasa`, 7 `farolero_cadenas` (5 con `jaula: true`) y `carcelero` (`elite: true`, "El Carcelero").
- Objetos: `fuente_fria`, `charco_frio`, `jaula_luz_<luz>` (con `candado`), `luz_libre_<luz>`, `grieta_brasa` y
  `grieta_brasa_0..3`, `fuelle_gigante_0..1` (y `_0_b`), `brasero_0..2`, `surtidor`, `surtidor_chorro`, `palanca_surtidor`,
  `cadena_dragona`, `boca_horno`, `puerta_negra`, `cadena_colgante_0..2`, `jaulas_frente_0..1`, `humo_frente_0..1`,
  `fondo_fragua_lejos_0..2`, `arbol_ceniza_0..3`, `yunque`, `pila_carbon_0..1`, `molde_0..1`, `carretilla_fragua`,
  `mural_6`, `figura_cargadora`, `portal_brasa`, y de más: `crisol`, `pila_jaulas_0..1`, `columna_basalto_0..2`,
  `celda_jaula_0..1`, las variantes `_b`, y las calcomanías `escoria_0..1`, `ceniza_0..1`, `marcas_carretilla_0`,
  `metal_frio_0..1` y `eslabones_0..1`.
- `fuentes_frias`, `jaulas`, `grietas`, `fuelles`, `charcos`, `arena`, `apagada`, `lava` y `notas_luz` con las notas
  para el juego.

**Enemigos y jefe** (en `personajes`)
- `hollin` (32): `idle`, `walk`, `attack` (`aviso` [1, 4]), `pegado`, `hit`, `die`.
- `salamandra_brasa` (48): `idle`, `walk`, `attack` (`aviso` [1, 4]), `piedra`, `hit`, `die`.
- `farolero_cadenas` (64): `idle`, `walk`, `attack`, `attack_heavy` (`aviso` [1, 8]), `hit`, `die`, y en cada anim
  `jaula` por dirección y por cuadro.
- `carcelero` (64, `elite`): `idle`, `walk`, `attack`, `attack_heavy` (`aviso` [1, 8]), `jalar`, `warcry`, `hit`,
  `die`.
- `dragona_brasa` (128, `tipo: jefe`, `luz_boca`): `idle`, `walk`, `attack` (`aviso` [1, 6]), `coletazo` (`aviso`
  [1, 6], `elevacion`), `aliento` (`aviso` [1, 8]), `encendida`, `warcry`, `apagada`, `hit`, `die`, y en cada anim
  `boca` por dirección y por cuadro.
- `fx`: `proyectil_brasa_<dir>`, `impacto_brasa`, `rastro_brasa`, `aviso_cadena`, `aviso_linea_cadena`, `vapor`,
  `aviso_aliento`, `fuego_piso`, `aviso_cola`, `vapor_grande`.

**Audio:** `ambiente_fragua`, `ambiente_lava`, `ambiente_jaulas`, `ambiente_fuelles`, `ambiente_bosque_ceniza`,
`ambiente_carcel`, `ambiente_horno`, `musica_jefe_dragona`, `musica_carcelero`, `musica_liberacion`, `fuelle_sopla`,
`grieta_rojo`, `calor_sube`, `acalorada`, `jaula_abre`, `luz_libre`, `luz_libre_bosque`, `luz_libre_catedral`,
`luz_libre_galerias`, `luz_libre_faro`, `luz_libre_ciudad`, `thor_mojarse`, `thor_sacude`, `hollin_pega`,
`hollin_suelta`, `salamandra_escupe`, `salamandra_piedra`, `cadena_gira`, `farolero_paso`, `carcelero_llaves`,
`carcelero_portazo`, `dragona_ruge`, `dragona_aliento`, `surtidor_chorro`, `dragona_apagada`, `cadenas_rompen`,
`puerta_negra`.

**Íconos:** `ui.habilidades.sacudir`, `sacudir_seco`, `calor`, `jaula` y `palanca`.

## Decisiones y lo que tiene que hacer el juego

- **El camino.** Escalera de Ceniza (portal, la primera fuente fría con `tutorial`, la escalera de basalto con el
  abismo al oeste) > Río de Lava (puente de obsidiana; arriba hay uno de cadenas) > Jaulas Colgantes (el mural, el
  lago de lava, el abismo al este) > Fuelles (dos fosas de lava con su fuelle) > Horno (la boca enorme y el lago de
  fuego con dos puentes de cadena; también se rodea por el oeste) > Corazón de la Fragua (se entra por un paso entre
  dos ríos de lava; la arena, la Puerta Negra al norte). Ramas que vuelven: el Bosque de Ceniza (de la escalera al
  horno), la Cárcel de las Luces (del río a los fuelles) y el Pasadizo de los Moldes (entre el bosque y la cárcel).
  La prueba tapa cada rama y verifica que se siga llegando a las fuentes y a la arena.
- **La caverna no es de cajitas:** las salas tienen las esquinas redondeadas, las paredes hacen bultos y la lava tiene
  la orilla quebrada. Las plazas de obsidiana sí son rectas (están hechas a mano).
- **Las jaulas las dibuja el juego** (no van en la capa objetos): la entidad es el candado y el objeto trae
  `candado`. Así el juego pone la jaula, le pega al candado y deja la luz libre donde corresponde. Dentro de una celda
  de 64 alrededor del candado no hay paredes, y la prueba lo revisa.
- **Las grietas** son parches de 64 x 64 (2 x 2 cuadros): con 96 las variantes quedaban cortadas a la mitad. Son 38,
  separados entre sí por un cuadro, nunca en un puente ni en una escalera, así que ningún camino cruza más de dos
  cuadros de grieta seguidos.
- **Fuelles, charcos, surtidores, palancas y la Puerta Negra** van como objeto más entidad en el mismo punto (como
  las estatuas de la Ciudad): el juego cambia la anim del objeto de ese punto.
- **La lava apagada** va como otra tira (`agua_apagada`), lo más simple. La espuma de la orilla se deja de dibujar.
- **La lava brilla sola:** en las postales de la lámina la lava no se oscurece ni se tiñe con las otras luces. Si el
  juego le suma la luz de la orilla encima, se pone naranja chillón: conviene que la luz de la lava no la alumbre a
  ella misma.
- **La Dragona** es de cuatro patas y arma su propio esqueleto (como el Pez Farol). La boca va por dirección y por
  cuadro como la corona del Rey. El chorro del aliento en la hoja es corto (cabe en la celda): el largo del fuego lo
  marca el juego con `aviso_aliento` en línea y después `fuego_piso`. El coletazo pega detrás: `aviso_cola` viene con
  el medio círculo arriba en la hoja, hay que girarlo para que quede detrás de ella. El punto que pega de los
  impactos es el de adelante.
- **El farolero** lleva la jaula a la espalda sobre un palito: de frente casi no se ve (la tapa el casco), de costado
  y de espaldas sí. Su luz va en `jaula` por cuadro, así se ve el brillo desde cualquier lado.
- **El Carcelero** es más grande que el farolero pero cabe en la celda de 64 que pide el encargo; la cadena que lanza
  en la hoja es corta y el largo lo marca `aviso_linea_cadena`.
- **Música.** Las zonas traen `musica: ninguna`. Si el juego no reconoce `ninguna`, que no toque nada.
- **El ambiente del Corazón** es `jefe`, como el Palacio de la Ciudad (el juego ya lo resuelve).

## Lo que falta o quedó distinto

- **Cosas de más.** Ambientes `lava`, `fuelles` y `carcel` (la tabla los nombra y el audio no), un sonido de luz libre
  por cada luz además del general, la `boca_horno`, el `crisol`, las pilas de jaulas, las columnas de basalto y las
  celdas de la cárcel. Hay 51 jaulas (más los 5 faroleros con jaula).
- **`palanca`** usa el efecto que ya estaba en el kit (no se cambió para no tocar el audio de los mundos de antes).
- **Lo que se repite en una pantalla.** Las cuatro palancas de la arena (`palanca_surtidor`) son iguales a propósito (las del encargo).
  Todo lo demás no se repite en ninguna postal, y eso lo revisa una prueba.
- **La lámina de las postales simula la luz.** El kit trae las postales a pleno, como los otros mundos (y sin las
  jaulas ni las grietas, que las dibuja el juego).
- **La lava se repite cada cuadro de 32** (es una tira de cuadros, como el agua): se diseñó pareja y con vetas finas
  para que no se note el patrón.
- **Parte 8 (corrección de nombres, a pedido del juego):** la palanca de la arena se llamaba `palanca` y chocaba con la
  `palanca` de los mundos 1 a 3 (otro tamaño y otras anims). Como el kit escribe cada archivo una sola vez, quedaba la
  imagen vieja. Ahora es `palanca_surtidor` (las entidades siguen siendo `palanca`, con `objeto: palanca_surtidor`) y
  `palanca_arriba.png` es la de siempre. El kit ahora se niega a armarse si dos objetos de mundos distintos se llaman
  igual con otro tamaño, otras anims u otra cantidad de cuadros (`choquesDeObjetos`, con su prueba). Quedan choques
  viejos que son solo de dibujo (mismo tamaño y anims): `cartel`, `aviso_jefe` y `aviso_carga` salen distintos en el
  Bosque y en los otros mundos, y el kit usa los del Bosque en todos. No los toqué para no cambiar los mundos 1 a 5.
- No abrí PR (no se pidió) y no toqué `main`, las ramas `claude/olimpico-*` ni ninguna otra rama.
