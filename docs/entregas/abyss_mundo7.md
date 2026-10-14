# GG Abyss: Mundo 7, El Corazón Helado, y el Diablo

Rama: `claude/abyss-mundo7` (sale de `claude/abyss-mundo6`, en `b684504`). Un commit por parte, con el kit regenerado
y las pruebas del taller en verde. Lo que el juego tiene que leer está todo en el manifest (`mundos[6]` y lo nuevo en
`personajes`, `fx`, `audio` y `ui.habilidades`). Detalle para el juego en `docs/KIT_JUEGO.md`, sección Mundo 7.

Orden de los commits: parte 7 (portal), partes 1 y 2 (mapa y objetos), parte 3 (enemigos), parte 5 (audio), parte 6
(íconos) y al final la parte 4 (el Diablo). Apenas el kit trae al `diablo`, el juego puede habilitar el Mundo 7.

## Cómo se verificó

- `npx tsc -b` y `npm test` en verde. Pruebas nuevas: `corazon` (mapa, objetos, portal e íconos), `corazonEnemigos`,
  `corazonAudio` y `diablo`.
- Kit regenerado y comparado byte a byte con el de `b684504` después de cada parte: no falta ningún archivo, no cambia
  ninguno de los mundos 1 a 6 (mapas, trozos del suelo, postales, objetos, personajes, fx, audio, ui) y en el
  `manifest.json` todo lo de antes sale igual. Solo se agrega (344 archivos nuevos).
- Láminas en `docs/entregas/`, se rehacen con `npx tsx scripts/lamina-mundo7.ts [mapa|objetos|trono|enemigos|diablo|iconos]`:
  - `mundo7_mapa.png`: el mapa entero chiquito.
  - `mundo7_postales.png`: una postal por zona con la oscuridad de la zona y las luces como en el juego (hogueras,
    braseros, trono, columnas y gigantes).
  - `mundo7_objetos.png` y `mundo7_trono.png`: los objetos en estantes y el trono con el portal de hielo.
  - `mundo7_enemigos.png`: los enemigos y los dos minijefes al lado de la heroína.
  - `mundo7_diablo.png`: el Diablo al lado de la heroína y de la Dragona, los cuadros clave de las 13 anims y sus fx.
  - `mundo7_iconos.png`: los íconos nuevos a 40 y a 80.

## Lo que quedó en el manifest

**Mundo 7** (`mundos[6]`, `id: mundo7`, mapa `mundo/mundo7_corazon.json`, 120 x 110, `portal: portal_hielo`, `fondo`
con `fondo_hielo_lejos_0..2` que se ve por el vacío del puente y del corazón)
- Zonas: La Escalera Helada, El Lago de los Gigantes, Las Catacumbas de Hielo, El Bosque de Escarcha, La Ciudadela
  Congelada, El Puente de las Cadenas, La Puerta del Trono, El Corazón Helado, y los secretos La Guarida del Lobo y La
  Cripta Sellada. Oscuridad, bruma, partícula y ambiente como pide la tabla. Partículas nuevas `nieve` y `ventisca`.
- Postales: `escalera_helada`, `bosque_de_escarcha`, `lago_de_los_gigantes`, `catacumbas_de_hielo`,
  `ciudadela_congelada`, `puente_de_las_cadenas`, `puerta_del_trono`, `corazon_helado`.
- Agua: la capa `agua` son los agujeros de agua negra del lago (no se caminan), sin `reflejo`.
- Entidades: `portal_llegada`, `portal_volver` (mundo6), `jugador_inicio`, `thor_inicio`, 5 `punto_guardado` con
  `hoguera: true` y `objeto: hoguera_hueso` (la de la escalera con `tutorial`), 25 `columna_hielo` y 8 `gigante`
  (refugios de la ventisca, con `objeto` y `ancho`), 10 `hielo_fino` (rectángulos), 10 `cofre` (2 `secreto` con
  `pista`, 2 `guardado_por`, 1 `tras_jefe`), 3 `figura` (una con `alto: true` al lado del trono, con `objeto:
  figura_ultima_llama`), `mural` (`pieza: 7`, en Las Catacumbas), `trono_diablo`, `arena_jefe` (`radio: 256`), 4
  `brasero_hueso`, `jefe` (`diablo`, "El Diablo", "El que se come la luz para no apagarse"), `portal_jefe` (`destino:
  fin`) y 101 enemigos: 36 `lobo_escarcha`, 32 `diablillo`, 14 `espectro_helado`, 9 `sombra_devoradora`, 5
  `caballero_congelado`, 3 `bruja_escarcha`, y los minijefes `reina_escarcha` (en el Lago) y `guardian_puerta` (en la
  Puerta del Trono), los dos `elite`. Casi todos van en grupos grandes (manadas y bandas, campo `grupo`).
- Objetos: `hoguera_hueso`, `columna_hielo_0..3`, `gigante_congelado_0..2`, `hielo_fino` y `hielo_fino_0..3`,
  `arbol_hielo_0..3`, `brasero_hueso`, `trono_diablo`, `cadena_helada_0..2`, `nieve_frente_0..1`,
  `carambanos_frente_0..1`, `fondo_hielo_lejos_0..2`, `mural_7`, `figura_ultima_llama`, `muro_hielo`, `portal_hielo`,
  la utilería (`arma_congelada_0..1`, `escudo_roto_0..1`, `calavera_demonio_0..1`, `bandera_helada_0..1`,
  `lapida_hielo_0..1`, `sarcofago_hielo`, `estalagmita_hielo_0..1`, `roca_hielo_0..1`, `armadura_caida`), las
  variantes `_b` y las calcomanías `nieve_acumulada_0..1`, `grieta_hielo_0..1`, `huellas_lobo_0..1`, `escarcha_0..1` y
  `ceniza_negra_0..1`.
- `agua_helada`, `hogueras`, `refugios`, `hielo_fino`, `arena`, `frio` y `notas_luz` con las notas para el juego.

**Enemigos, minijefes y el Diablo** (en `personajes`)
- `lobo_escarcha` (48): `idle`, `walk`, `run`, `attack` (`aviso` [1, 4]), `aullar`, `hit`, `die`.
- `espectro_helado` (48, `vuela`): `idle`, `walk`, `cast` (`aviso` [1, 6]), `hit`, `die`.
- `diablillo` (32): `idle`, `walk`, `attack` (`aviso` [1, 4]), `hit`, `die`.
- `caballero_congelado` (64): `idle`, `walk`, `attack`, `attack_heavy` (`aviso` [1, 7]), `bloquear`, `hit`, `die`.
- `bruja_escarcha` (48): `idle`, `walk`, `cast` (`aviso` [1, 6]), `hit`, `die`.
- `sombra_devoradora` (48): `idle`, `walk`, `attack` (`aviso` [1, 4]), `hit`, `die`.
- `reina_escarcha` (64, `elite`, `vuela`): `idle`, `walk`, `attack`, `cast`, `warcry`, `dividirse`, `hit`, `die`.
- `guardian_puerta` (64, `elite`): `idle`, `walk`, `attack` (golpe en cruz), `attack_heavy` (`aviso` [1, 7]),
  `charge`, `hit`, `die`.
- `diablo` (192, `tipo: jefe`, `luz_ojos`): `idle`, `walk`, `attack` (`aviso` [1, 6]), `nova` (`aviso` [1, 8]),
  `charge`, `rayo` (`aviso` [1, 8]), `pilares` (`aviso` [1, 7]), `oscuridad`, `jaula` (`aviso` [1, 6]), `warcry`,
  `aturdido`, `hit`, `die`, y en cada anim `ojos` y `boca` por dirección y por cuadro.
- `fx`: `proyectil_rayo_hielo_<dir>`, `impacto_rayo_hielo`, `proyectil_fuego_chico_<dir>`, `aviso_lanza_hielo`,
  `aviso_cruz`, `nova_fuego_diablo`, `aviso_nova`, `rayo_rojo`, `aviso_rayo`, `pilar_fuego`, `aviso_pilar`,
  `jaula_huesos_subir`, `jaula_huesos_quieta`, `jaula_huesos_romper`, `aviso_carga_diablo`.

**Audio:** `ambiente_hielo`, `ambiente_bosque_hielo`, `ambiente_lago`, `ambiente_catacumbas`, `ambiente_ciudadela`,
`ambiente_puente`, `ambiente_puerta`, `ambiente_trono`, `musica_reina_escarcha`, `musica_guardian`,
`musica_diablo_1`, `musica_diablo_2`, `musica_diablo_3`, `musica_diablo_final`, y los efectos `ventisca_viene`,
`viento_fuerte`, `frio_sube`, `congelada`, `hielo_cruje`, `hielo_rompe`, `agua_helada`, `hoguera_prender`,
`luz_comida`, `luz_vuelve`, `lobo_aullido`, `lobo_mordida`, `espectro_rayo`, `diablillo_risa`, `diablillo_fuego`,
`escudo_bloquea`, `bruja_muro`, `bruja_cura`, `reina_lanzas`, `reina_ventisca`, `guardian_cruz`, `guardian_carga`,
`diablo_ruge`, `diablo_paso`, `diablo_nova`, `diablo_rayo`, `diablo_pilares`, `diablo_oscuridad`, `jaula_huesos`,
`jaula_rompe`, `brasero_hueso_prender`, `brasero_congela`, `diablo_cae`.

**Íconos:** `ui.habilidades.frio`, `compañeras`, `brasero` y `romper`. **Portal:** `portal_hielo`.

## Decisiones y lo que tiene que hacer el juego

- **El camino.** La Escalera Helada (portal, la primera hoguera con `tutorial`, el vacío al oeste) > El Bosque de
  Escarcha > La Ciudadela Congelada > El Puente de las Cadenas (islas de piedra unidas por puentes de cadena sobre el
  vacío, la ventisca no para) > La Puerta del Trono (el Guardián) > El Corazón Helado (la arena, el trono al norte).
  Ramas que vuelven: El Lago de los Gigantes (de la escalera a la ciudadela, con la Reina Escarcha), Las Catacumbas de
  Hielo (del lago a la ciudadela, con el mural 7) y El Puente Viejo (del bosque a la primera isla del puente, por el
  oeste). Secretos para el olfato de Thor: La Guarida del Lobo y La Cripta Sellada. La prueba tapa cada rama y
  verifica que se siga llegando a las hogueras y a la arena.
- **Los refugios de la ventisca** son entidades `columna_hielo` y `gigante` en el centro de la base sólida de su
  objeto, con `ancho`. El lado contrario al viento protege. Los gigantes traen `respira` (se les mueve un ojo):
  ponerla de vez en cuando.
- **El hielo fino** son rectángulos sobre el lago (múltiplos de 32), siempre caminables y nunca en un camino
  obligado. El juego los llena con `hielo_fino_<v>` en cuadros de 64 (la variante sale de la posición, viene en las
  notas): `quieto`, `cruje` si la heroína se queda parada y después `roto`.
- **La arena del Diablo:** radio 256, los 4 `brasero_hueso` en diagonal a 170 px del centro, cada entidad en el mismo
  punto que su objeto (`apagado`, `prenderse`, `prendido`, `congelado`). El trono va al norte, sólido. La Ladrona con
  la última llama está al lado (`figura_ultima_llama`: `idle` y `irse`).
- **El muro de la bruja** es un objeto (`muro_hielo`: `subir`, `quieto`, `romper`, sólido mientras dura) que el juego
  levanta en el impacto del `cast`.
- **El Diablo** arma su propio cuerpo (celda 192, el más detallado del juego): cuernos con la punta helada, colmillos,
  garras de cuatro dedos, espinas en la espalda, alas de murciélago rotas y la piel con grietas de brasa que laten. En
  `aturdido` la piel se enfría (gris azulada, sin brasa) y en `die` se le rompe el hielo de los cuernos, la última
  llama sale del pecho (evento `suelta`, cuadro 10) y se deshace en ceniza y escarcha.
  - `ojos`: un `[x, y]` desde el pivote por dirección y por cuadro (el punto entre los dos ojos), para `luz_ojos`
    (`#ff2a1a`, radio 120). En los últimos cuadros de `die` es `null`.
  - `boca`: igual, de donde sale `rayo_rojo` (se repite en línea; el juego lo hace girar). En la hoja el rayo es
    cortito.
  - La nova trae dos huecos en el anillo para pasar (los ángulos están en las notas del Diablo). `nova_fuego_diablo`
    sale desde el pivote.
  - `oscuridad` no es bucle: los últimos 4 cuadros respiran y se pueden repetir mientras dura la sombra.
- **Música.** El Corazón trae `musica: diablo_1` y `musica_fases: diablo_1,diablo_2,diablo_3,diablo_final`: las cuatro
  van en bucle, cada una más rápida y más fuerte, con el mismo tema en la misma tonalidad (do menor) para cruzar de
  una a otra. El Lago trae
  `musica_pelea: reina_escarcha` y la Puerta `musica_pelea: guardian`. Las demás zonas, `musica: ninguna`.
- **Tono.** Lo más oscuro del juego, demonios con cara de verdad, pero sin sangre ni vísceras: todos se deshacen en
  nieve, escarcha, ceniza o humo, y todo lo que pega avisa antes. El rugido del Diablo es grave y entra suave, nunca un
  grito de golpe. Todo el audio con pico de 0.6 o menos.

## Lo que falta o quedó distinto

- **Nombres que cambiaron porque ya existían.** `proyectil_hielo_<dir>` e `impacto_hielo` son del poder de hielo de
  las heroínas: el rayo del espectro es `proyectil_rayo_hielo_<dir>` e `impacto_rayo_hielo`. `estalactitas_frente_0..1`
  ya es del Mundo 3: aquí son `carambanos_frente_0..1`. El kit ahora se niega a armarse si dos fx se llaman igual.
- **La jaula de huesos** son tres fx: `jaula_huesos_subir` (8), `jaula_huesos_quieta` (1) y `jaula_huesos_romper` (8),
  porque cada fx del kit es una sola tira.
- **El ícono `compañeras`**: la llave del manifest lleva eñe y el archivo no (`ui/habilidades/companeras.png`).
- **Cosas de más.** El ambiente `ambiente_puerta` (la tabla no lo nombra), `boca` en el Diablo, el `muro_hielo` de la
  bruja, `aviso_lanza_hielo` y `aviso_cruz` para los minijefes, y 10 cofres (se pedían 8 o más).
- **La lámina de las postales simula la luz.** El kit trae las postales a pleno, como los otros mundos.
- No abrí PR, no toqué `main`, las ramas `claude/olimpico-*` ni `claude/abyss-celestial`. El merge de
  `origin/claude/abyss-celestial` queda para cuando la sesión del juego lo pida.
