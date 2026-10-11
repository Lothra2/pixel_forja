# Lote B1 + D1: beat 'em up y armas del piso
Estado: entregado
PR: (pendiente)
Fecha: 2026-10-11

## Qué se hizo

Todo es capacidad general del motor: un pack nuevo `brawl` (en el kit, `calle`), un catálogo de armas del piso y tres datos por cuadro nuevos. Lo propio de Nekketsu queda como ejemplo en `docs/ejemplos/nekketsu/`.

**B1: las 26 animaciones**, todas premium y con eventos, en `src/engine/anim/brawl.ts`:
- Levantar, llevar y lanzar: `lift` (con aplaste de un cuadro al llegar arriba), `carry_idle`, `carry_walk`, `carry_run`, `throw_overhead`, `carried`, `thrown_spin` y `land_flat`.
- Agarres: `grab`, `grab_hold`, `grabbed`, `knee_grab` y `break_free`.
- Pelea: `dizzy`, `ko_bounce` (dos aterrizajes), `taunt`, `run_punch`, `run_kick` (con elevación y desplazamiento), `air_kick` y `slip_wet`.
- Armas: `weapon_pick`, `weapon_swing`, `weapon_swing_heavy` (a dos manos), `weapon_throw`, `umbrella_block` y `fan_gust`.

**Datos nuevos por cuadro** (`--datos`):
- `cuerpo`: el hurtbox, sin implementos, pelotas ni efectos.
- `carga`: dónde apoya su base lo que se levanta.
- `arma`: el agarre, el ángulo y si el arma va detrás del cuerpo.

**D1: 19 armas del piso** dibujadas con código en `src/engine/render/props.ts`, con sprite suelto en `src/engine/render/floorProps.ts`:
- Los objetos: chancleta, silla plástica (roja, azul, verde), nón lá, coco, tubo, llanta, pote de basura (suelta la tapa), cono, escoba, piedra, paraguas (cerrado y abierto), abanico (cerrado y abierto), termo de tinto (con vapor), furro, palo de escoba, balón de goma, chapa (3 colores, con estela), tejo y volante de đá cầu.
- **Cuadros:** cada uno trae `quieto`, `girando` (8 cuadros con RotSprite), `mano` (16 ángulos con el agarre en el centro) y sus extras.
- **Catálogo:** `FLOOR_PROPS`, con nombre en español e inglés, peso, si rota y qué animación le toca.

**En el estudio:**
- El pack "Pelea callejera" aparece en Animar, con los nombres en español e inglés.
- El selector "Arma en la mano" aparece en las animaciones de armas.
- "Ver datos" dibuja también el cuerpo, la carga y el arma.

**En el kit:**
- `--deportes calle` exporta la pelea callejera. No va por defecto: el kit de siempre no cambia.
- `--objetos` exporta `objetos/armas.png + .json` y la entrada `objetos` del manifiesto, con el contrato de PEDIDO 4.3: `atlas`, `w`, `h`, `agarre`, `peso`, `rota` y `anims`.

## Cómo se usa (estudio y kit)

Estudio: Inicio, cualquier personaje, Animar, paquete "Pelea callejera". En las de armas, elige el arma en "Arma en la mano". "Ver datos" muestra la carga y el arma.

Kit:

```bash
npm run deportes -- salida/kit --fichas mis_fichas --deportes calle \
  --filas right,down_right,up_right,down,up --datos --atlas --objetos
```

Lo levantado y el arma son sprites aparte que pone el juego. Las reglas para componerlos, con el código de Phaser, están en [docs/KIT_DEPORTES.md](../../KIT_DEPORTES.md#pelea-callejera---deportes-calle).

- **Lo levantado:** el rival (`carried`) va con la base de su `cuerpo` en la `carga`; el objeto, con su pivote ahí. Se dibuja encima de quien carga.
- **El arma:** el cuadro `<id>_mano_<k>`, con `k = round(angulo / 22.5)`, centrado en `arma[x, y]`. Va detrás de quien la lleva si `detras = 1`.

## Pruebas

`npm test`: 179 de 179. `npm run e2e`: 32 de 32 en escritorio y teléfono, con la arena sobre el kit completo (`npm run build:sitio`). Las nuevas están en `src/engine/__tests__/brawl.test.ts` y en la prueba e2e "pelea callejera".

| Qué se revisa | Resultado |
|---|---|
| Control de calidad del motor: las 26 animaciones, la familia, 32/48/64 | 1560 en las 5 filas (en la prueba) y 2496 en las 8 direcciones (medido aparte): 0 fallas |
| La base de la carga toca el pelo o las manos, y las dos palmas están contra ella | La familia en 32/48/64 y los 6 héroes, en las 5 filas: 0 huecos |
| `carried` y `thrown_spin` nunca se cortan en el borde de la celda | La familia: ni un pixel en el borde. Los héroes: el cuerpo nunca toca el borde |
| `cuerpo` sin la chispa del golpe | En el cuadro del impacto, `cuerpo` es más angosto que `cajas` |
| `arma` en cada cuadro con el arma, espejado a la izquierda, y ausente después de soltarla | Sí, y el sprite del kit no dibuja el arma |
| Armas del piso: sprite, giro, 16 ángulos y extras, en 32/48/64 | Atlas de 672 x 648 a 48, ninguno pasa de 4096 |
| El kit por defecto no cambia | `calle` no va por defecto (hay prueba) |
| Imagen dorada | `golden/brawl_rick_48.png`: un cuadro clave de cada animación |
| Estudio (e2e) | Ve la carga en `lift`, cambia el arma de tubo a escoba y el dibujo cambia, en escritorio y teléfono |

Entregables en esta carpeta:
- `tablero.png`: las 26 animaciones con Rick y Alana.
- `tablero_armas.png`: las 19 armas.
- `gifs/<animacion>.gif`: un GIF por animación, con Rick y Alana de lado y en diagonal.
- `aprobacion_*`: los GIFs y el tablero de la aprobación.

## Decisiones que tomé sin preguntar

- **Brazos estirados para cargar.** Rick pidió que las manos tocaran la carga y que, si el chibi no llegaba, la carga bajara hasta las manos y "no al revés". Lo probé y no funcionó:
  - Detrás de la cabeza, el pote desaparece completo y de Steph solo se ven las piernas.
  - Delante, con la base a la altura de la barbilla, lo cargado tapa la cara.

  Hice lo que hace Kunio: solo en las poses de carga, los brazos suben por los costados de la cabeza y se estiran lo justo para que las palmas lleguen a lo más alto del pelo, sin salirse de la celda. **Rick tiene que confirmarlo.** Si prefiere lo otro, se cambia en `human.ts` (bloque `lifting`) y en la `carga`.
- **Las armas no van dibujadas en el sprite.** Con 19 armas, hornearlas multiplicaría las hojas por 19. Cada animación exporta `arma` y el atlas trae cada arma en 16 ángulos: una hoja sirve para todas. El estudio sí la dibuja, para verla.
- **La pelea callejera no sale por defecto en el kit** (`--deportes calle`): así el kit de siempre y la arena no cambian.
- **Lo pesado (pote, silla, llanta, cono, furro) va a dos manos**, con el agarre entre las manos (`at: 'hands'`), y se sube sobre la cabeza con los mismos brazos estirados.
- **`thrown_spin` sin aire en la celda y en bolita apretada**: es la única forma de que no se corte en ningún ángulo. El juego lo mueve por la parábola.
- **El `punto` de `weapon_swing` es la mano**, no la punta del arma: el largo depende del arma que recogió. La punta sale de `arma` (agarre y ángulo).
- **Celda de los objetos = media celda de personaje** (24 para 48). Entra el más largo girado.

## Límites honestos

- **Brazos estirados:** en las poses de carga los brazos miden más que en el resto. Se nota si se mira cuadro a cuadro. Es el truco de los juegos Kunio, pero hay que aprobarlo.
- **Pote de frente:** el pote es más angosto que la cabeza, así que de frente se apoya en el pelo, entre las manos, sin tocarlas. Lo ancho (Steph acostada, la silla) sí toca las palmas.
- **Capa y orejas:** a Batman, girando en el aire, se le recortan las puntas de las orejas de la capucha y la capa, como pasa con el pelo. El cuerpo nunca.
- **Wolverine:** con el pelo en punta toca el borde de arriba en todas sus animaciones (ya pasaba en `idle`). En las de carga las palmas quedan a un pixel del borde y el pelo pasa por arriba de la carga.
- **Rotación de las armas:** en la mano se giran por muestreo directo (en el estudio) y con RotSprite (en el atlas). A 22.5 grados las diagonales finas, como el tubo o la escoba, quedan un poco escalonadas.
- **Sin estela en el batazo:** el arco claro del golpe (`smear`) no se dibuja con el arma del piso; solo la chispa.
- **Los 16 ángulos en la mano** son de la misma arma sin la mano. La mano del personaje queda abierta en la hoja y el arma cae encima.

## Lo que necesita el siguiente lote

- **C1** (Familia GG e Instituto Nekketsu): Kenji y el resto de los personajes ya pueden usar el pack `calle` tal cual. Hace falta su ficha. Con Kenji listo, se puede rehacer el GIF de Rick levantándolo.
- **G1 fuentes y I inicial** no dependen de esto.
- **Para el juego:**
  - Componer lo levantado con `carga` y `cuerpo`.
  - Dibujar el arma con `arma` y el atlas de objetos.
  - Usar `cuerpo` como hurtbox.
  - Avisar si prefiere la carga sin brazos estirados.
