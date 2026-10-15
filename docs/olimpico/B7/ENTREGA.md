# Lote B7: las técnicas de equipo, la atrapada del Quemado, la arena y la moto
Estado: entregado, pendiente de Rick
PR: (se llena al abrirlo)
Fecha: 2026-10-15

## Qué se hizo

Lo pedido en los puntos 1 y 2 del mensaje: 10 animaciones nuevas del motor en `src/engine/anim/tecnicas.ts`. Las canchas a 800 (E4), los vehículos a escala (D3) y `rayo_cielo` van cada uno en su propio lote y su propio PR, como siempre.

### 1. Las técnicas de equipo

Una por equipo, con la barra llena. Cada una trae su `impacto` o su `suelta` en el cuadro del golpe, con su `punto` en las 5 filas.

| Equipo | Animación | Cuadros, fps | Qué hace | El golpe | Datos |
|---|---|---|---|---|---|
| Maracuchos del Lago | `play_drum` | 10, 12 | El Furrazo: toca el furro meneándose, lo sube por encima de la cabeza y lo descarga | `impacto` 7, con la chispa: ahí va el retumbo | `arma` (`furro`) en cada cuadro |
| Rolos de Chapinero | `bike_charge` | 10, 14 | La Ciclovía Infernal: pedalea cada vez más agachada, embiste y frena derrapando | `impacto` 5, adelante de la bici | `desplazamiento`. La bici va en el sprite |
| Panas de Caracas | `cap_bat_power` | 12, 14 | El Batazo de Jonrón: anuncia el jonrón apuntando al cielo, pierna arriba, le pega con todo y se queda mirando cómo se va | `impacto` 6, con la estela y la chispa | `arma` (`broomstick`) en cada cuadro |
| Rồng Sài Gòn | `chair_spin_throw` | 12, 14 | La Silla Plástica Voladora: la levanta, dos vueltas con los brazos estirados, la suelta y queda mareada | `suelta` 7 | `girado` en 3 y 5. `arma` (`silla_plastica`) hasta la suelta |
| Familia GG | `slipper_storm` | 12, 14 | El Chancletazo Supremo: tres chancletas seguidas, la última dando el paso, y la mano en la cintura | `suelta` 3, 6 y 9 | `arma` (`chancleta`) antes de cada suelta |
| Instituto Nekketsu | `comb_hair` | 12, 12 | El Copetazo: se peina el copete dos veces, muy creído, baja la cabeza y embiste | `impacto` 8, con la cabeza | `desplazamiento`. El peine va en el sprite |

**La que derriba con contacto largo trae a su rival:** `bike_charged`, 10 cuadros a 14, cuadro a cuadro con `bike_charge`. En guardia, ve venir la bici, el golpe del 5 lo levanta, vuela de espaldas en el 6 y cae en el 7 (`aterriza`). Arrancan juntos, como la tijera del vovinam.

Las otras cinco pegan con un golpe seco o con algo que vuela. Ahí el rival responde con lo que ya tienes (`fight_hit`, `ko_bounce`, `thrown_spin`) cuando le llega el golpe o lo que le tiraron. Hacerle un rival propio a cada una sumaría 5 animaciones para nada.

### 2. Lo de B4 a B6 que el juego usa hoy

| Animación | Cuadros, fps | Para | Eventos |
|---|---|---|---|
| `dodge_catch` | 6, 12 | Quemado: agachado con los brazos adelante, abraza el balón contra el pecho y se endereza | `impacto` y `atrapa` 2. El balón en `objetos` de principio a fin |
| `beach_run` | 8, 12, en bucle | Vóley: correr en la arena, más pesado que `run`, rodillas altas y paso corto | `paso` 0 y 4: ahí levantas la arena |
| `traffic_dodge` | 6, 14 | Cross: se asusta, salta de lado recogiendo las piernas, cae agachado y le reclama a la moto | `despegue` 1, `aterriza` 4. `elevacion` |

`hammer_spin`, `hammer_release`, `swim_punch`, `dunked`, `swim_turn` y `boat_start` no se tocaron, como pediste.

### Lo que sumé al motor para esto

- **El peine** (`peine`), un prop nuevo del sprite: rojo con dientes blancos para que se vea sobre el pelo negro.
- **`HELD_ANIMS`** dice el arma de cada técnica: el furro, el palo de escoba (o cualquiera de batear), la silla plástica y la chancleta.
- **Las 10** salen en el estudio con su nombre en español e inglés.

## Cómo se usa (estudio y kit)

**En el estudio:** las 10 salen en Animar. Las de arma se ven con el arma en la mano.

**En tu `kit.config.json`:** las seis técnicas van en `ngg_carga`, con un alias por equipo, igual que tus burlas. Así cada atleta trae solo la suya y el atlas crece una técnica, no seis. `bike_charged` va sin alias porque cualquiera la puede recibir:

```jsonc
"ngg_carga": [..., "play_drum", "bike_charge", "cap_bat_power", "chair_spin_throw", "slipper_storm", "comb_hair", "bike_charged"],
"alias": {
  ...,
  "tecnica_familia_gg": "slipper_storm",
  "tecnica_instituto_nekketsu": "comb_hair",
  "tecnica_rong_sai_gon": "chair_spin_throw",
  "tecnica_rolos_de_chapinero": "bike_charge",
  "tecnica_panas_de_caracas": "cap_bat_power",
  "tecnica_maracuchos_del_lago": "play_drum"
}
```

En el atlas salen como `tecnica_<equipo>_right_0` y así. El juego la busca con `tecnica_` más el equipo del atleta. Si prefieres los nombres del motor, ponlas en `ngg_carga` sin alias y cada atleta trae las seis.

Y las otras tres, en los packs de su escena:

```jsonc
"beisbol": { "anims": [..., "dodge_catch"], "sin_props": true },   // tu Quemado
"voley":   { "anims": [..., "beach_run"], "sin_props": true },
"ngg_mov": [..., "traffic_dodge"]                                    // o el pack del Cross que uses
```

El ejemplo `docs/ejemplos/nekketsu/kit.config.json` ya lo tiene así, con el pack `pelea` en el lugar de tu `ngg_carga`.

**Lo que tiene que conectar el juego:**
- **Las técnicas:**
  - El arma (`furro`, `broomstick`, `silla_plastica`, `chancleta`) la dibujas tú con `arma`, como en la pelea callejera.
  - Lo que vuela (la silla, las chancletas) sale en cada `suelta` desde su `punto`, igual que `weapon_throw`.
  - El retumbo del furro y el sonido del jonrón van en el `impacto`.
  - En la silla, los cuadros 3 y 5 vienen `girado`: espeja el sprite y sus datos, como en el batazo Nekketsu.
- **La ciclovía:** pon a `bike_charged` de pie delante y arráncalos juntos. Después del `impacto` empuja al rival hacia atrás mientras vuela: el `desplazamiento` del motor solo va hacia adelante.
- **El Quemado:** la atrapada es `dodge_catch` en vez de `catch`. Arráncala para que el balón llegue en su `atrapa` (cuadro 2). Desde ahí el balón está en las manos, y `objetos` dice dónde.
- **El Vóley:** `beach_run` en vez de `run` sobre la arena, con un poco de arena en cada `paso`.
- **El Cross:** `traffic_dodge` cuando pasa una moto. Muévelo de carril entre el `despegue` y el `aterriza`.

## Pruebas

- **Prueba nueva `b7.test.ts`, 11 casos:**
  - Las 10 con sus cuadros, fps, bucle y eventos.
  - **Los 8 atletas pasan el control de calidad en 32, 48 y 64, en las 5 filas.**
  - Cada técnica trae su golpe con `punto` en las 5 filas, y las que avanzan traen `desplazamiento` y se frenan después del golpe.
  - Las armas van en `arma` hasta cada suelta, y nunca después.
  - La silla trae `girado` en el 3 y el 5.
  - `bike_charged` va cuadro a cuadro con la bici: sube después del golpe y cae dos cuadros después.
  - `traffic_dodge` sube después del despegue y está en el piso al aterrizar.
  - El balón de `dodge_catch` sale en `objetos` como `voley` en los 6 cuadros, con el `atrapa` en el 2.
  - Con alias, cada equipo trae solo su técnica y `bike_charged` va para todos.
  - El ejemplo de Nekketsu le da una técnica a cada uno de los 6 equipos y valida.
  - Imagen dorada `golden/b7.png`.
- **El esquema** `docs/kit-a-medida.schema.json` está regenerado.
- **La suite sin `custom.test.ts`:** 48 archivos, 504 de 504. Las imágenes doradas de antes salen iguales.
- **`custom.test.ts`: 15 de 15,** con las 10 nuevas en el ejemplo. La prueba completa tardó 197 s, por debajo del límite de 300.
- **`tsc` limpio y `npm run build:sitio` limpio.**
- **e2e de Playwright: 50 de 50.**

## Para aprobar (todo en esta carpeta)

Cada técnica la hace alguien de su equipo, contra un rival:
- **`furrazo.gif`:** Ender contra Kenji, con el retumbo en el `impacto`.
- **`ciclovia.gif`:** Camila contra Rick, cuadro a cuadro con `bike_charged`.
- **`jonron.gif`:** Gabo y la chapa que se va.
- **`silla_voladora.gif`:** Bà Hoa contra Goro.
- **`chancletazo.gif`:** Steph contra Tetsu, tres chancletas y la última lo tumba.
- **`copetazo.gif`:** Kenji contra Gabo.
- **`quemado_atrapa.gif`:** Yuli tira y Sophie atrapa.
- **`arena.gif`:** Sophie en la arena al lado de Alana con `run`, para comparar.
- **`moto.gif`:** Pipe salta y la moto pasa por debajo.
- **`tablero_lado.png`:** dos atletas por animación, todos los cuadros.
- **`tablero_filas.png`:** el cuadro clave de cada una en las 5 filas.

La silla, las chancletas, el balón, la chapa y la moto de los GIF los dibujé yo, como referencia: en el juego los pones tú.

Qué mirar:
- Que cada técnica se lea como la de ese equipo.
- Que la arena se sienta más pesada que correr normal.
- Que la ciclovía y el rival caigan juntos.

## Decisiones que tomé sin preguntar

1. **Una técnica por atleta con alias `tecnica_<equipo>`,** como tus burlas. Ponerlas sin alias les daría las seis a los 24 y el atlas de `ngg_carga` crecería unos 280 cuadros más por atleta.
2. **Solo la ciclovía trae rival propio.** Es la única con contacto largo: la bici lo arrolla durante varios cuadros. Las demás son un golpe seco o algo que vuela, y para eso ya tienes `fight_hit`, `ko_bounce` y `thrown_spin`.
3. **La chancleta es de Steph, de la Familia GG.** La chancleta de mamá. En el ejemplo la técnica es de todo el equipo.
4. **`cap_bat_power` va con el palo de escoba** como arma por defecto, igual que `bat_swing` y `bat_nekketsu`. Así lo dibujas con lo que ya tienes.
5. **`play_drum` pega con el furro mismo,** de arriba abajo. Rozar la vara es el ritmo de antes del golpe.
6. **`comb_hair` es un cabezazo.** El peine solo prepara el golpe: el copete es el arma.
7. **El balón de `dodge_catch` sale como `voley`,** igual que en `dodge_throw`.
8. **`beach_run` va en el pack `basic`** del motor: se puede poner en cualquier pack del kit.
9. **El peine es rojo.** Negro no se veía sobre el pelo negro de los del Instituto.
10. **Al final del jonrón el palo cuelga de la mano.** En el hombro, con la cabeza chibi, tapaba la cara.

## Límites honestos

- **La vuelta de la silla** se lee de lado gracias al `girado`. De frente y de espalda casi no se nota, porque los brazos estirados quedan delante del cuerpo.
- **La silla en el impulso (cuadro 6)** va detrás de la cabeza y casi no se ve en el sprite. Con `arma` y `detras` la dibujas tú detrás.
- **La chancleta al armar el brazo** va detrás de la cabeza por la misma razón.
- **El peine es chico:** a 32 px es un par de pixeles rojos.
- **El rival de la ciclovía no retrocede solo:** el empujón lo pones tú.
- **La mano de visera del jonrón** no se ve de lado, la tapa la cabeza.

## Lo que necesita el siguiente lote

- **El juego:** conectar las 10 donde dice arriba y sumar las 6 técnicas a `ngg_carga` con sus alias.
- **Lo que sigue de este mensaje,** cada uno en su PR:
  - E4: las 8 canchas a 800 de ancho.
  - D3: motos y xích lô a escala de atleta.
  - `rayo_cielo`: el relámpago vertical.
- **Lo que queda del pedido y no se pidió:** `hammer_spin`, `hammer_release`, `swim_punch`, `dunked`, `swim_turn`, `boat_start`.
