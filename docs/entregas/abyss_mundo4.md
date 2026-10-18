# GG Abyss: Mundo 4, El Puerto Ahogado (y los pendientes #38 a #40)

Rama: `claude/abyss-mundo4` (sale de `claude/perfeccionar-ejecucion-smh3ad`). Un commit por parte, con el kit
regenerado y las pruebas del taller en verde. Lo que el juego tiene que leer está todo en el manifest.

## Cómo se verificó

- `npx tsc -b` y `npm test` en verde (las pruebas nuevas: `pendientes`, `farol`, `puerto`, `puertoEnemigos`,
  `pezFarol` y `puertoAudio`).
- Kit regenerado y comparado byte a byte con el kit de antes: del Bosque, la Catedral y las Galerías solo cambiaron
  los portales (`portal_azul_*` y `portal_rojo_*`, el pendiente #40). Mapas, trozos del suelo, postales, espuma, el
  resto de los objetos, los personajes y todos los sonidos de antes salen idénticos. También cambia `ui/cinturon.png`
  (el #39 lo pide nuevo) y el `manifest.json` (por todo lo que se agrega).
- Láminas en `docs/entregas/`: `pendientes.png` (con el ícono del farol), `thor_farol.png`, `mundo4_mapa.png`, `mundo4_postales.png` (con la
  oscuridad de cada zona y las luces, como se ve en el juego), `mundo4_objetos.png` y `mundo4_enemigos.png`. Se
  rehacen con `npx tsx scripts/lamina-mundo4.ts`.

## Lo que quedó en el manifest

**Pendientes**
- `ui.habilidades.ataque` (el juego lo carga como `hab_ataque`).
- `ui.habilidades.farol` y `ui.habilidades.farol_recarga` (#41): Thor alza el farol con rayos ámbar, aro dorado. El
  de recarga es el mismo en gris.
- `ui.cinturon` (190 x 44, 5 casilleros de 36, sin números) y `ui.casillero_pocion` (36 x 36).
- Portales de 96 x 128 con apoyo `[48, 124]`, luz de 160: `portal_azul`, `portal_rojo` (gotea, el del Mundo 4),
  `portal_verde`, `portal_violeta`, `portal_ambar`. Anims `girar` (12 a 12 fps), `abrir` (8), `cerrar` (6) y las capas
  sueltas `arco` (1) y `remolino` (12), y `apagado`. Cada mundo dice el suyo en `mundos[i].portal`.

**El farol de Thor**
- `personajes.thor_farol` y `personajes.thor_farol_apagado` (`capa_de: "thor"`): misma celda, pivote, animaciones,
  cuadros y fps que `thor`. En `howl` el farol queda arriba.

**Mundo 4** (`mundos[3]`, `id: mundo4`, mapa `mundo/mundo4_puerto.json`, 110 x 90)
- Capas nuevas del mapa: `marea_baja` y `marea_alta`. En el mundo: `marea`, `faroles` y `notas_luz`.
- Entidades: `portal_llegada` (rojo), `portal_volver`, `jugador_inicio`, `thor_inicio`, 4 `punto_guardado` con
  `farol: true` y su `farol_muelle`, 9 `cofre` (2 con `secreto`, 1 `tras_jefe`), `campana_iglesia`, `mural`
  (`pieza: 4`), 3 `figura` (una con `alto: true` en lo alto del faro), `arena_jefe` (`radio: 208`, `agua: true`,
  `poza: 128`), `jefe` (`pez_farol`, en el centro de la poza),
  `portal_jefe` (`destino: mundo5`) y los enemigos (`capitan_ahogado` con `elite: true`).
- Zonas: El Muelle de Llegada, La Calle de las Redes, El Mercado Hundido, La Iglesia de la Campana Ahogada, Los Botes
  Volteados, El Astillero, La Cueva de las Medusas, El Faro, y los secretos El Patio de las Redes y La Gruta del
  Ancla.
- Postales: `muelle_de_llegada`, `calle_de_las_redes`, `mercado_hundido`, `iglesia_campana_ahogada`,
  `botes_volteados`, `astillero`, `cueva_de_las_medusas`, `el_faro`.
- Objetos: `farol_muelle_apagado`, `farol_muelle_prendido`, `farol_muelle_prenderse`, `faro`, `muelle_h`,
  `muelle_v`, `muelle_ancho`, `muelle_esquina_no/ne/so/se`, `muelle_borde_n/s/o/e`, `muelle_flotante`, `agua_marea`,
  `casa_pescador_0..9`, `bote_volteado_0..2`, `bote_hundido`, `red_colgando_0..2`, `cajones_mercado`,
  `puesto_volteado`, `barril_pescado`, `ancla_vieja`, `cuerda_enrollada`, `pilote_muelle`, `boya_vieja`, `nasa_rota`,
  `remos_tirados`, `cajon_puerto`, `anillo_poza` (352 x 352, capa suelo, apoyo al centro), `roca_puerto_0..2`, las variantes `_b` de la utilería chica, `campana_iglesia`,
  `iglesia_ruina`, `rocas_frente_0..1`, `vigas_frente_0..1`, `fondo_mar_lejos_0..2`, `mural_4`, `figura_ojos`,
  `figura_ojos_mojada`, y las calcomanías `charco_puerto_0..2`, `algas_0..2`, `tablas_sueltas_0..1`,
  `escamas_conchas_0..1`, `ceniza_suelo_0..1`, `piedras_mojadas_0..2`.
- Criaturas: `marinero_ojos` (16 x 8, parpadeo de 4 a 3 fps).

**Enemigos y jefe** (en `personajes`)
- `marinero_niebla` (48), `cangrejo_ceniza` (48), `medusa_negra` (48, `vuela`), `capitan_ahogado` (64, `elite`,
  `attack_heavy` con `aviso` de 7 cuadros) y `pez_farol` (128, `jefe`, `en_agua`, `luz_antena`, pivote `[64, 69]`,
  `attack` y `attack_heavy` con `aviso` de 6 cuadros, `elevacion` en el salto, y `antena` en cada anim: por
  dirección y cuadro el `[x, y]` de la luz desde el pivote, o `null` si está bajo el agua o apagada).
- `fx.aviso_mordida`, `fx.aviso_ola` y `fx.ola` (los no cuadrados traen `w` y `h`).

**Audio**
- `ambiente_puerto` (20 s), `ambiente_campana` (12 s).
- `musica_jefe_pez` y `musica_capitan` (en bucle), `musica_faro` (30 s, se calma).
- `campana_lejos`, `campana_cerca`, `marea_sube`, `farol_prender`, `farol_apagar`, `thor_alza_farol`,
  `marinero_se_deshace`, `cangrejo_tenaza`, `medusa_toca`, `ancla_golpe`, `pez_emerge`, `pez_mordida`, `ola`,
  `faro_prende`.

## Decisiones y lo que tiene que hacer el juego

- **La arena del Pez Farol es una poza.** Agua negra de radio 128 en el centro (sólida en la colisión, igual de oscura
  que el mar, sin brillo propio: lo único que alumbra es la luz del pez) y un anillo de tablas mojadas con pilotes y
  sogas hasta el radio 208. El anillo se camina entero con las dos mareas, se conecta con la entrada y llega a un
  farol. El pez arranca en el centro.
- **La luz que viaja usa `antena`.** Para el vuelo al faro en `die`, el juego arranca desde el último `[x, y]` no
  nulo de la antena. Para que la luz se vea sobre el agua quieto, el pez nada un poco más alto que antes (la hoja del
  `pez_farol` cambió en `idle`, `emerger` y `hundirse`).

- **Las mareas las cambia el juego.** El kit trae los cuadros de cada marea, `agua_marea` y el muelle flotante con
  `abajo`, `subir` y `arriba`. La prueba garantiza que desde cualquier cuadro que se camina hay camino a un farol
  con las dos mareas, y que el cofre del banco de arena se alcanza con las dos (por el barro o por los flotantes).
- **Luz y sombras.** En este mundo no hay sombra horneada con dirección: `sombra` trae solo la sombra de contacto al
  pie. El faro trae luz de 420 pero solo debe encenderse con la anim `prendido`.
- **La iglesia no tiene techo.** Es una sola imagen de 192 x 192: el apoyo es el pie de la pared de atrás, la nave
  queda delante (se camina, filas 12 y 13 del mapa), y lo sólido va en `solidos` (pared de atrás, costados y la de
  adelante a los dos lados de la puerta). El mural va en la cara de adentro de la pared de atrás.
- **El Pez Farol ya viene con el agua pintada.** Lo que está debajo de la superficie sale teñido y translúcido en la
  hoja, así que el juego no tiene que taparlo con agua. En `die` la luz se le escapa hacia arriba y se apaga: el
  vuelo hasta el faro lo hace el juego con una luz que viaja (`luz_antena` dice el color).
- **Casas de más.** El encargo pide `casa_pescador_0..3`, hay 10 (`_0` a `_9`) para que la Calle de las Redes, que
  muestra nueve casas a la vez, no repita ninguna. Igual con las variantes `_b` de la utilería.
- **Música.** Las zonas traen `musica: ninguna`. El Faro trae `musica: jefe_pez` y `musica_victoria: faro`, el
  Astillero `musica_pelea: capitan`. Si el juego no reconoce `ninguna`, que no toque nada.

## Lo que falta o quedó distinto

- **El ancla del capitán se ve chica.** A celda 64 el ancla ocupa poco. Se lee en `attack` y `attack_heavy`, menos en
  `idle`. Si se quiere más imponente habría que subirlo a celda 96.
- **La lámina de las postales simula la luz.** El kit trae las postales a pleno (como las de los otros mundos). La
  lámina las muestra con la oscuridad y las luces para juzgar el clima.
- **La figura mojada es la de las Galerías con gotas.** No es un dibujo nuevo.
- No abrí PR (no se pidió) y no toqué `main` ni ninguna otra rama.
