# Kit deportivo de PixelForja

Hojas de sprites de 8 direcciones para un juego de deportes isométrico: atletismo, natación, vóley, tenis y peleas, con la familia GG y seis superhéroes de cómic (versiones de fan para uso personal). Todo sale con el movimiento premium (poses clave de verdad, pivote fijo, eventos).

## Generar el kit

```bash
npm run deportes -- salida/kit_deportes                  # todo: familia + héroes, los 5 deportes, celda 48
npm run deportes -- salida/kit --deportes natacion,pelea  # solo algunos deportes (atletismo, natacion, voley, tenis, pelea, futbol)
npm run deportes -- salida/kit --celda 64                 # más grande
npm run deportes -- salida/kit --fichas mis_fichas        # tus personajes exportados del estudio (.ficha.json)
npm run deportes -- salida/kit --rapido                   # 2 animaciones por deporte, para probar
```

Opciones para juegos de pelea y deportes con atlas (ver [Datos por cuadro, atlas, retratos y vestuario](#datos-por-cuadro-atlas-retratos-y-vestuario)):

```bash
npm run deportes -- salida/kit --filas right,down_right,up_right,down,up   # solo esas filas, en ese orden
npm run deportes -- salida/kit --datos       # cajas, manos, cabeza y pies en cada cuadro
npm run deportes -- salida/kit --atlas       # un atlas por pack (JSON Hash de TexturePacker) en vez de una hoja por animación
npm run deportes -- salida/kit --retratos    # 7 expresiones en 40 x 40 y 96 x 96 por atleta
npm run deportes -- salida/kit --cabecitas   # ui/cabecitas.png: una cabeza de 12 x 12 por atleta
npm run deportes -- salida/kit --deportes calle --objetos   # pelea callejera (no va por defecto) y las armas del piso
```

Sin estas opciones el kit sale **byte a byte igual** que antes (hay una prueba que lo revisa).

La carpeta se borra y se vuelve a escribir. Por seguridad, el script se niega si la carpeta tiene otra cosa que no sea un kit de PixelForja.

## Qué trae

```
manifest.json
atletas/<id>/<deporte>/<animacion>.png   fila = dirección, columna = cuadro
CREDITOS.txt                              autores de las piezas LPC (hay que mostrarlo en el juego)
```

Las filas siguen el orden de `direcciones` del manifiesto: `down, down_left, left, up_left, up, up_right, right, down_right`.

Cada atleta trae su `celda` y su `pivote`. El pivote es el punto de apoyo (los pies) y **no se mueve** entre cuadros, direcciones ni animaciones. Hulk va en celda de 64 y el resto en 48.

## Qué hace el juego con cada dato

| Campo | Qué es | Qué hace el juego |
|---|---|---|
| `cuadros`, `fps`, `loop` | Duración y repetición | Reproduce la animación |
| `eventos[].tipo = paso` | El pie toca el piso (`pie`: cerca o lejos) | Sonido de pisada y polvo |
| `eventos[].tipo = impacto` | El cuadro exacto del golpe | Daño, hitstop de 2 o 3 cuadros, sonido, temblor de pantalla |
| `eventos[].tipo = suelta` | Sale la pelota, la bala, la jabalina o el efecto | Crea el proyectil en ese cuadro |
| `eventos[].tipo = despegue` / `aterriza` | Deja el piso / vuelve al piso | Activa y apaga la física del salto, polvo al caer |
| `eventos[].punto` | En golpes y sueltas: dónde está la mano o el pie que pega, en pixeles desde el pivote, una entrada por fila | Saca la pelota, la bala o la chispa de ahí |
| `avance` | Pixeles que avanza el cuerpo en un ciclo sin que el pie patine (medido de lado) | Avanza la animación por distancia: un ciclo completo cada `avance` recorrido. El pie no patina a ninguna velocidad |
| `desplazamiento` | En las acciones que avanzan: pixeles recorridos en cada cuadro desde el primero | Mueve el sprite eso hacia donde mira (interpolado entre cuadros) |
| `rumbo` | En las pruebas de campo: hacia dónde va de verdad cada fila | De frente se dibuja la diagonal: muévelo hacia el `rumbo`, no hacia abajo |
| `elevacion` | Pixeles que el juego sube el sprite en cada cuadro | Dibuja la sombra en el piso y el sprite `elevacion[i]` pixeles más arriba |
| `agua` | Fila de la superficie del agua en la celda (o `null`) | Dibuja el sprite con esa fila sobre la superficie de su piscina |

### Mover sin patinar, en isométrica

`avance` y `desplazamiento` se miden de lado, en pixeles de pantalla. En una isométrica 2:1 moverse a la derecha de la pantalla es ir en diagonal por el mundo, así que un ciclo equivale a `avance / √2` unidades de mundo en cualquier dirección. Lo más simple y exacto es que la animación la mueva la distancia:

```js
// por cada paso del juego
const recorrido = velocidad * dt;                 // en unidades de mundo
anim.cuadro += recorrido / (avance / Math.SQRT2) * cuadros;
```

La velocidad natural de un ciclo (la que deja la animación a sus fps) es `(avance / √2) * fps / cuadros`. Si el juego va más rápido, la animación se acelera sola y el pie sigue sin patinar. La arena hace exactamente esto.

### Por qué existe `elevacion`

Un garrochista sube 5 metros y no cabe en una celda de 48 px. Los juegos isométricos lo resuelven así: el cuerpo se dibuja cerca del piso de la celda y el juego sube el sprite entero sobre su sombra. Garrocha, salto largo, remate de vóley, smash, patada voladora y la salida de natación usan esto.

### Natación

El nadador ya viene con el agua puesta: lo que queda bajo la superficie va teñido de azul y medio transparente, con espuma en la línea, estela y gotas cuando entra una mano o un pie. El juego dibuja su piscina detrás y alinea la superficie con `agua`. El cuerpo flota a altura fija: las patadas no lo hacen rebotar.

## Datos por cuadro, atlas, retratos y vestuario

Lo que necesita un juego de peleas o de deportes con golpes: saber dónde está el cuerpo, las manos, la cabeza y los pies en cada cuadro, sin adivinar.

### Filas (`--filas`, opción `filas`)

Un juego que espeja la izquierda con `flipX` no necesita las 8 direcciones. Con `filas` el kit dibuja solo las pedidas, en ese orden:

```json
"filas": ["right", "down_right", "up_right", "down", "up"]
```

El manifiesto trae `filas` y `direcciones` con esa lista, y todos los datos por fila (`punto`, `rumbo`, `cajas`, `manos`...) traen una entrada por fila pedida, en el mismo orden. Las pruebas de campo (salto largo, garrocha, lanzamientos) siguen usando la diagonal cuando se piden de frente o de espalda, y `rumbo` lo dice. El kit de GG Abyss acepta la misma opción (`npm run kit -- salida --filas ...`).

### Datos por cuadro (`--datos`, opción `datos`)

Todos van como `[fila][cuadro]`, en pixeles **desde el pivote**, con `x` hacia la derecha e `y` hacia abajo (lo de arriba del piso es negativo). El juego suma la posición del personaje y listo.

| Campo | Qué es | Para qué |
|---|---|---|
| `cajas` | `[x, y, w, h]` del recuadro de los pixeles opacos. `null` si el cuadro está vacío | Hurtbox, choques, selección con el dedo |
| `manos` | `[[x, y] mano cercana, [x, y] mano lejana]` | Enganchar un arma o una pelota, hitbox del puño |
| `cabeza` | `[x, y]` del centro de la cabeza | Estrellitas de mareo, globo de diálogo, cabezazos |
| `pies` | `[[x, y] pie cercano, [x, y] pie lejano]` | Hitbox de la patada, polvo, huellas |
| `cuerpo` | Igual que `cajas` pero solo la persona (con el pelo): sin implementos, pelotas, armas ni chispas | **El hurtbox.** `cajas` incluye la pelota o la chispa del golpe; `cuerpo` no |
| `carga` | `[x, y]` donde apoya su base lo que se lleva (levantar, llevar, lanzar). `null` en los cuadros sin carga. Solo en esas animaciones | Dibujar al rival levantado o el objeto encima de quien carga (ver Pelea callejera) |
| `arma` | `[x, y, angulo, detras]`: el agarre del arma del piso en la mano, hacia dónde apunta (grados, 0 = derecha, horario) y 1 si va detrás del cuerpo. `null` sin arma. Solo en las animaciones de armas | Dibujar el arma que el personaje recogió (ver Armas del piso) |

```js
// hitbox del puño en el cuadro del impacto, para el jugador que mira a la derecha
const [hx, hy] = anim.manos[fila][cuadro][0];
const golpe = new Phaser.Geom.Circle(sprite.x + (sprite.flipX ? -hx : hx), sprite.y + hy, 4);
```

Al espejar con `flipX`, se cambia el signo de la `x` (y en `cajas`, `x` pasa a `-(x + w)`).

`punto` (en los eventos de golpe y suelta) ahora sale en todas las filas pedidas, también en las vistas espejo.

### Atlas por pack (`--atlas`, opción `atlas`)

En vez de un PNG por animación, un atlas por atleta y pack, en el formato JSON Hash de TexturePacker que carga Phaser:

```
atletas/<id>/<pack>.png + atletas/<id>/<pack>.json
```

```js
this.load.atlas('rick_pelea', 'atletas/rick/pelea.png', 'atletas/rick/pelea.json');
// cuadro: <anim>_<fila>_<cuadro>, la fila por nombre y el cuadro desde 0
const jab = manifest.atletas.rick.packs.pelea.anims.jab;
this.anims.create({ key: 'rick_jab_right', frames: this.anims.generateFrameNames('rick_pelea', { prefix: 'jab_right_', start: 0, end: jab.cuadros - 1 }), frameRate: jab.fps });
```

Con atlas, cada atleta trae `packs` en vez de `deportes`:

```json
"packs": { "pelea": { "atlas": "atletas/rick/pelea.json", "imagen": "atletas/rick/pelea.png", "anims": { "jab": { "cuadros": 6, "fps": 16, "cajas": [...] } } } }
```

Los cuadros no se recortan: todos miden la celda y el pivote queda en el mismo lugar (también va en cada cuadro como `pivot`, en fracción). Ningún atlas pasa de 4096 px: el pack más grande (fútbol, 8 filas, Hulk en celda 64) mide 2560 x 2496. Si un pack no entrara, el kit avisa en vez de cortar.

Con `--datos` o `--atlas` el manifiesto escribe los arreglos de números en una línea (pesa unas 5 veces menos). Sigue siendo JSON normal.

### Retratos (`--retratos`, opción `retratos`)

```
atletas/<id>/retratos.png
"retratos": { "archivo": "atletas/rick/retratos.png", "chico": 40, "grande": 96, "expresiones": ["neutral", "feliz", "enojo", "triste", "susto", "cerrado", "dolor"], "escala_grande": 3 }
```

La hoja tiene dos filas: arriba los 7 chicos de 40 x 40 (el `i` en `x = i * 40`), abajo los 7 grandes de 96 x 96 (el `i` en `x = i * 96`, `y = 40`), en el orden de `expresiones`. Las caras son los ojos y bocas del motor, los mismos del sprite.

- **Chico (40):** cabeza y torso, dibujado a celda 64 pixel a pixel.
- **Grande (96):** cabeza y hombros. **No está dibujado a 96:** el motor dibuja personas hasta celda 64, donde el chibi entero mide unos 50 px. El grande es un recorte de 32 x 32 escalado **x3 entero**: nítido, sin colores mezclados, pero con el mismo detalle que el sprite.

### Cabecitas (`--cabecitas`, opción `cabecitas`)

`ui/cabecitas.png` con una cabeza de 12 x 12 por atleta, en fila, en el orden de `cabecitas.orden`. Cada atleta dice cuál es la suya con `"cabecita": "ui/cabecitas.png#rick"`. Salen de la cabeza a celda 64 reducida a la mitad sin mezclar colores (cada bloque de 2 x 2 se queda con su color más repetido). Se distingue el peinado, la piel y la ropa. Los ojos pueden perderse.

### Vestuario por pack (en la ficha)

Una ficha puede traer variantes de ropa con nombre y decir cuál usa cada pack. El kit dibuja cada pack con la suya. No es una opción del kit: va en la ficha.

```json
"wardrobe": {
  "variants": {
    "banador": { "label": "Bañador", "outfit": { "sleeves": "none", "shoes": "descalzo" }, "colors": { "top": "#1d5fbf", "bottom": "#1d5fbf" } },
    "judogi":  { "label": "Judogi", "outfit": { "sleeves": "long", "bottom": "pants" }, "colors": { "top": "#f2f2ee", "bottom": "#f2f2ee" } }
  },
  "packs": { "natacion": "banador", "pelea": "judogi" }
}
```

Una variante cambia solo lo que dice (`outfit` y los colores de `top`, `bottom`, `socks`, `shoes`, `accessory`). El pack que no figura usa la ropa de la ficha. El manifiesto dice qué usó cada pack: `"vestuario": { "pelea": "judogi", "natacion": "banador" }` (`ficha` = la ropa de la ficha). Ejemplo completo: [`docs/ejemplos/nekketsu/rick.ficha.json`](ejemplos/nekketsu/rick.ficha.json).

### En el estudio

- **Ver datos** (en Animar, junto a Papel cebolla): dibuja encima del personaje la caja, el cuerpo (punteado), las manos, la cabeza, los pies, el punto del golpe, la carga y el arma, con su leyenda y la caja del cuadro en números. Son los mismos datos que exporta el kit.
- **Arma en la mano:** en las animaciones de armas, elige cuál de las armas del piso se ve en la mano.
- **Vestuario:** si la ficha trae variantes, aparecen debajo de la animación. Se ve cada una sin tocar la ficha.

## Pelea callejera (`--deportes calle`)

Movimientos de beat 'em up en el estilo Kunio: levantar y lanzar a un rival o un objeto, agarres, mareo, nocaut con rebote, golpes corriendo y armas del piso. **No sale por defecto**: se pide con `--deportes calle` (o `packs: ['calle']`). Trae también reposo, caminar, correr, golpe recibido, jab, directo, patada baja y nocaut.

| Animación | Cuadros, fps | Eventos y datos |
|---|---|---|
| `lift` | 6, 12 | `impacto` al agarrar · `carga` desde el cuadro 2 · aplaste de un cuadro cuando la carga llega arriba |
| `carry_idle`, `carry_walk`, `carry_run` | 4, 6 · 8, 10 · 8, 14 | `paso` · `carga` en todos los cuadros |
| `throw_overhead` | 6, 14 | `suelta` con `punto` · `carga` hasta la suelta (incluida) |
| `carried` | 4, 6 | el levantado: acostado, pataleando · de frente usa la diagonal |
| `thrown_spin` | 8, 16 | rueda en el aire hecho bolita, centrado en la celda · de frente usa la diagonal |
| `land_flat` | 4, 12 | `aterriza` |
| `grab`, `grab_hold`, `grabbed`, `knee_grab`, `break_free` | 4-5, 8-14 | `impacto` en `grab` y `knee_grab` |
| `dizzy` | 8, 8 | `cabeza` para los pajaritos |
| `ko_bounce` | 8, 12 | `aterriza` dos veces |
| `taunt` | 8, 8 | |
| `run_punch`, `run_kick`, `air_kick` | 6, 16 · 8, 14 · 4, 14 | `impacto` con `punto`; `run_kick` con `despegue`, `aterriza`, `elevacion` y `desplazamiento` |
| `slip_wet` | 8, 14 | `aterriza` |
| `weapon_pick` | 4, 12 | `impacto` al agarrar · `arma` desde ese cuadro |
| `weapon_swing` | 6, 14 | `impacto` con `punto` (la mano) · `arma` |
| `weapon_swing_heavy` | 8, 12 | `impacto` · `arma` (a dos manos, entre las manos) · `carga` mientras está sobre la cabeza |
| `weapon_throw` | 6, 14 | `suelta` · `arma` hasta antes de la suelta |
| `umbrella_block` | 4, 12 | `arma` (paraguas abierto adelante) |
| `fan_gust` | 6, 12 | `suelta` (la ráfaga) · `arma` (abanico abierto) |

### Levantar, llevar y lanzar

Lo levantado **no viene dentro del sprite** de quien carga: es otro sprite que dibuja el juego.

- **Un rival:** su animación `carried`. Pon la base de su `cuerpo` (el centro de abajo de la caja) en la `carga` de quien lo levanta.
- **Un objeto del piso:** su cuadro `quieto`. Pon su pivote en la `carga` de quien lo levanta.

Dibújalo **después** de quien carga: va encima de las manos. Con chibi los brazos no llegan arriba de la cabeza, así que en las poses de carga se estiran lo justo para que las palmas lleguen a lo más alto del pelo (como en los Kunio) y la `carga` queda en el borde de arriba de las palmas. Hay una prueba que revisa que la base toca el pelo o las manos, sin hueco, en todas las filas y tamaños.

Al lanzar: en el cuadro de la `suelta`, lo cargado sale volando desde la `carga` de ese cuadro. El rival pasa a `thrown_spin` (el juego lo mueve por la parábola) y al caer a `land_flat` o `ko_bounce`.

### Armas del piso (`--objetos`, opción `objetos`)

19 objetos dibujados con código: chancleta, silla plástica, nón lá, coco, tubo, llanta, pote de basura, cono, escoba, piedra, paraguas, abanico, termo de tinto, furro, palo de escoba, balón de goma, chapa, tejo y volante de đá cầu. Los que tienen colores salen como ids aparte (`silla_plastica_azul`, `chapa_dorada`...).

```
objetos/armas.png + objetos/armas.json      atlas JSON Hash, cuadros <id>_<anim>_<cuadro>
"objetos": { "chancleta": { "atlas": "objetos/armas.json", "w": 11, "h": 5, "agarre": [12, 20], "peso": "liviano", "rota": true, "uso": "throw", "anims": { "quieto": 1, "girando": 8, "mano": 16 } } }
```

- `quieto`: en el piso, con la base en el pivote de la celda (como un personaje). La celda de los objetos es la mitad de la de los personajes (24 para 48).
- `girando`: en el aire, centrado (los que tienen `rota`).
- `mano`: 16 cuadros con el **agarre en el centro de la celda**; el cuadro `k` está girado `k * 22.5` grados.
- Extras: `pote_basura` trae `sin_tapa` y `tapa` (la tapa sale volando al pegar), `paraguas` y `abanico` traen `abierto`, `termo` trae `vapor`, `chapa` y `volante_dacau` traen `volando`.
- `uso` dice qué animación le toca: `swing` (batazo), `heavy` (a dos manos), `throw` (lanzar), `gust` (abanico).

Las animaciones de armas **no dibujan el arma**: así una sola hoja sirve para todas. Cada cuadro trae `arma = [x, y, angulo, detras]`. Para dibujarla:

```js
const [x, y, ang, detras] = anim.arma[fila][cuadro];        // null si en ese cuadro no tiene arma
const k = Math.round(ang / 22.5) % 16;
arma.setTexture('armas', `${id}_mano_${k}`).setPosition(sprite.x + x, sprite.y + y).setOrigin(0.5, 0.5);
arma.setDepth(sprite.depth + (detras ? -1 : 1));
```

Al espejar con `flipX`, la `x` cambia de signo y el ángulo pasa a `180 - ang`.

## La arena: el kit jugando de verdad

`arena.html` (en el sitio, el botón **Arena deportiva** del estudio) es un juego mínimo que usa el kit como lo haría el tuyo. Solo lee `manifest.json` y las hojas PNG: no importa nada del motor de PixelForja, y una prueba lo vigila. Si algo falla ahí, le falta al kit.

- **Atletismo:** salida de tacos y 100 m con cronómetro, salto largo con distancia, garrocha, bala y jabalina que vuelan desde el `punto` de la suelta.
- **Natación:** clavado desde el banco y los cuatro estilos con cronómetro del largo.
- **Vóley y tenis:** el saque se lanza en `suelta` y se pega en `impacto`. El rival calcula dónde va a estar la pelota y arranca su golpe para que el `impacto` caiga justo ahí.
- **Pelea:** los golpes llegan si el `punto` cae sobre el rival, con hitstop, chispa y sacudida. El rival se cubre, esquiva y contraataca.
- **Datos del kit:** cuadro, ritmo, avance, desplazamiento, elevación y los últimos eventos en vivo. Con **Celda y pivote** se ve el recuadro de cada sprite, y con **Cámara lenta** se revisa si un pie patina.
- **Probar tu kit:** elige la carpeta de un kit que generaste y juega con tus personajes sin publicar nada. También sirve `arena.html?kit=<carpeta>`.

En el teléfono hay palanca y botones. Con el teclado: flechas o WASD, Shift para correr y del 1 al 9 para las acciones.

En local: `npm run deportes -- public/kit_deportes` y después `npm run dev`. En Netlify, `npm run build:sitio` arma el kit y el sitio juntos.

## Animaciones por deporte

- **Atletismo:** sprint, salida de tacos, vallas, salto largo, salto con garrocha, lanzamiento de bala, lanzamiento de jabalina. También reposo, caminar, correr, golpe recibido, festejo y triste.
- **Natación:** crol (respira de lado), espalda (avanza con la cabeza primero), pecho (patada de rana), mariposa (ondulación de delfín), flotar y salida desde el banco.
- **Vóley:** espera, recepción, colocación, remate, bloqueo, saque flotado y plancha.
- **Tenis:** espera con split step, derecha, revés a dos manos, saque, volea y smash.
- **Peleas:** guardia, desplazamiento, jab, directo, gancho, uppercut, patada baja, patada alta, patada voladora, bloqueo, esquiva, golpe recibido, nocaut y victoria. Cada golpe trae chispa de impacto.
- **Pelea callejera (`calle`):** las 26 animaciones de beat 'em up de arriba.
- **Fútbol:** espera, control, pase, vaselina, tiro, volea, cabezazo, barrida, conducción (`run_ball`, corre tocando la pelota), entrada, saque de banda y el arquero (espera, estirada, atajada alta, saque con la mano y de volea). Las patadas tienen zancada, pie de apoyo, carga, contacto y seguimiento, y el `impacto` cae en el cuadro del contacto con el `punto` del pie. Celebraciones de gol incluidas.
- **Natación:** además, salir del agua por el borde (`swim_exit`).

## Superhéroes

| Id | Nombre | Cómo se ve |
|---|---|---|
| `spiderman` | Spider-Man | Rojo y azul, telaraña, ojos blancos de máscara y la araña en el pecho |
| `wolverine` | Wolverine | Pelo en punta, patillas, traje amarillo y azul y garras |
| `blackpanther` | Pantera Negra | Traje negro, orejas de felino, ojos blancos y garras |
| `deadpool` | Deadpool | Rojo entero, parches negros en los ojos, correa al pecho y katana |
| `batman` | Batman | Gris y negro, capa, orejas en punta, cinturón y el murciélago en el óvalo amarillo |
| `hulk` | Hulk | Gigante verde, pelo negro revuelto, short morado y descalzo (celda 64) |

Son versiones chibi de fan, para uso personal. Los personajes son de Marvel y DC: para meterlos en un juego que se publique o se venda hace falta una licencia.

En el kit salen con ropa de deporte y sin arma. Con `heroFicha(id, true)` llevan sus garras o su espada para las peleas.

## Límites honestos

- **Pruebas de campo de frente y de espalda:** una persona de cabeza o un cuerpo acostado no se puede dibujar de frente con este esqueleto. Los saltos, los lanzamientos, la plancha y la natación usan la diagonal más cercana cuando se piden de frente o de espalda. La hoja sigue teniendo 8 filas y ninguna se ve rota.
- **Chibi:** la cabeza ocupa casi media altura y los brazos son cortos. Por eso:
  - Los golpes salen con el brazo que se ve.
  - La pelota pasa adelante de la cara o encima de la cabeza, nunca en el medio.
  - Un brazo levantado no pasa por encima de la cabeza.
- **32 px:** en las acciones de un solo disparo, un cuadro que se pasa por la cabeza grande se corre lo justo para entrar en la celda (1 o 2 pixeles). En los ciclos (correr, nadar) no se corre nada: si algo no cabe, el control de calidad lo marca.
- **La pelota del juego:** los sprites dibujan la pelota hasta el contacto. Después la mueve el juego, desde el `punto` del evento `impacto` o `suelta`.
- **Piernas cortas:** un chibi tiene piernas cortas, así que a su velocidad natural avanza poco. Sophie hace el sprint a unos 43 px por segundo en celda 48. Para un juego arcade se puede ir más rápido: la animación se acelera con la distancia y el pie no patina, pero se ve más agitada.
- **De frente y de espalda:** al caminar hacia la cámara los pies no avanzan en la hoja, se mueven en el lugar. Es lo normal en sprites de 8 direcciones. Los juegos lo resuelven con el ritmo de los pasos.
- **Paso de guardia:** el paso de pelea avanza muy poco por ciclo, porque es un arrastre corto. En la arena va al doble de ritmo. Si tu juego necesita peleadores rápidos, conviene un paso más largo.
- **`cajas` incluye todo lo opaco:** también la pelota, la jabalina o la chispa del golpe, porque sale de los pixeles. Para un hurtbox del cuerpo solo, conviene achicarla o usar `cabeza` y `pies` para armarla.
- **Manos tapadas:** de espaldas (`up`, `up_right`) la mano muchas veces queda detrás del cuerpo. `manos` dice dónde está igual, sobre un pixel opaco, pero ese pixel puede ser la espalda.
- **Bañador:** el motor no dibuja el torso desnudo. Un bañador es una camiseta sin mangas del color del traje.

## Control de calidad

Las pruebas (`npm test`) revisan toda la familia y los seis héroes en las 8 direcciones y en 32, 48 y 64 px:
- Que nada se salga de la celda.
- Que los pies estén en el piso.
- Que no haya pixeles sueltos.
- Que la altura no tiemble en los ciclos.
- Que cada golpe traiga su impacto.
