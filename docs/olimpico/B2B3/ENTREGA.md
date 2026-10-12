# Lote B2 y B3: recorridos y trepar
Estado: entregado, pendiente de Rick
PR: (se llena al abrir el PR)
Fecha: 2026-10-12

## Qué se hizo

Las 18 animaciones nuevas de las tablas B2 y B3 del pedido. `edge_teeter` y `fall_off`, que también están en B3, ya salieron en P1. Todo es motor general (`src/engine/anim/recorridos.ts`) y sirve para cualquier ficha humana.

| Pack | Animaciones | Lo que el juego usa primero |
|---|---|---|
| `recorridos` (B2) | `ladder`, `climb_wall`, `ledge_hang`, `pull_up`, `balance_walk`, `balance_wobble`, `balance_fall`, `duck_run`, `bike_fast`, `bike_crash`, `skate_crash` | <ul><li>Trepar los muros de la Comuna 13.</li><li>La viga sobre el hueco y la baranda de los techos.</li><li>Pasar por debajo de toldos y tendederos.</li></ul> |
| `trepar` (B3) | `climb_pole`, `pole_idle`, `pole_punch`, `pole_slide`, `pole_kick_down`, `pole_shake` y `grab_leg_up`, más `edge_teeter` y `fall_off` | El Tama-wari de Hội An |

Cada una tiene los cuadros, los fps, el bucle y los eventos de la tabla del pedido. Trae todos los datos por cuadro: cajas, cuerpo, manos, cabeza, pies, carga y arma.

**Motor:**
- **`paso` con mano.**
  - Un paso puede decir qué mano agarra (`joint: handNear` o `handFar`).
  - El manifiesto exporta `mano` (`cerca` o `lejos`) y el `punto` de esa mano en cada fila, igual que un golpe.
  - Lo usan la escalera y el poste.
- **`elevacion` en las que suben.** `climb_wall` y `pull_up` traen cuánto sube el juego el sprite en cada cuadro. El último valor es la altura del muro o del borde.
  - El borde de `pull_up` está a la altura de las manos colgado.
  - El muro de `climb_wall` es un poco más bajo: lo que se alcanza de pie con los brazos arriba.
- **La bici:**
  - El objeto `bike` acepta `lay` de 0 a 1, para quedar acostada en el piso.
  - A 32 px se dibuja más chica.
  - Con un cuerpo alto, la cadera baja lo justo para que la cabeza quepa.
  - **Con esto la `bike` de siempre también pasa el control**, que antes fallaba a 32 px y con los héroes.
- **El pack `climb` en el estudio** ("Recorridos y trepar"), con el nombre de cada animación en español e inglés. Se ven en Animar como todas.

## Cómo se usa (estudio y kit)

En el `kit.config.json` del juego, los dos packs y las pruebas que los cargan:

```jsonc
"packs": {
  "recorridos": ["ladder", "climb_wall", "ledge_hang", "pull_up", "balance_walk", "balance_wobble", "balance_fall", "duck_run", "bike_fast", "bike_crash", "skate_crash"],
  "trepar": ["climb_pole", "pole_idle", "pole_punch", "pole_slide", "pole_kick_down", "pole_shake", "grab_leg_up", "edge_teeter", "fall_off"]
},
"pruebas": { "crosscountry": [..., "recorridos"], "azoteas": [..., "trepar"] }
```

La copia de ejemplo en `docs/ejemplos/nekketsu/kit.config.json` ya los tiene. El kit sale con 24 atletas y 8 packs en menos de 3 minutos.

**Lo que hace el juego:**
- **Escalera y poste:** el juego dibuja la escalera o el poste y sube el sprite a velocidad constante mientras corre el bucle. En cada `paso` con `mano` suena el agarre en el `punto` de esa mano. La escalera se lee mejor en la fila `up` (de espaldas).
- **Muro y borde:** el juego dibuja el muro con su borde a la altura del último valor de `elevacion` y sube el sprite cuadro por cuadro. En `ledge_hang` el sprite cuelga con las manos en el borde: la `mano` del cuadro dice dónde.
- **La viga:** el sprite va sobre la viga. `balance_fall` deja de usar la viga desde el tercer cuadro, y el juego baja el sprite.
- **Bici y patineta:** como `bike` y `skate`. En las caídas, el `aterriza` marca el golpe contra el piso.

## Pruebas

- **Prueba nueva `recorridos.test.ts`:**
  - Las 18 con los cuadros, fps, bucle y eventos de la tabla del pedido.
  - **Los 8 atletas pasan el control de calidad en 32, 48 y 64, en las 5 filas.**
  - La escalera y el poste exportan la mano y el punto.
  - `climb_wall` y `pull_up` suben con `elevacion` y nunca bajan.
  - La bici a 32 px.
  - **Imagen dorada** `golden/recorridos.png`: un cuadro clave de cada animación.
- **La prueba de los 6 superhéroes** ahora recorre también estos packs y pasa.
- `custom.test.ts`: el kit con 8 packs, en menos de 3 minutos. El esquema `docs/kit-a-medida.schema.json` está regenerado.
- **Suite completa:** 26 archivos, 273 de 273.
- **`npm run build:sitio` limpio y e2e de Playwright 44 de 44.**
- `tsc` limpio.

## Para aprobar (todo en esta carpeta)

- `recorridos_trepar.gif`: escalera, muro, colgarse y subir el borde. Lleva la escalera y el muro dibujados, y el sprite sube con la `elevacion` del manifiesto.
- `recorridos_viga.gif`: caminar, tambalearse y caerse de la viga, y correr agachado bajo un cable.
- `recorridos_ruedas.gif`: bici rápida, caída de bici y caída de patineta.
- `trepar_poste.gif`: las 7 del poste, con el poste dibujado.
- `tablero_b2.png` y `tablero_b3.png`: Rick (el más grande) y Alana (la más chica) de lado, todos los cuadros, y el primer cuadro en las 5 filas del juego.

## Decisiones que tomé sin preguntar

1. **Lo que se trepa no va en el sprite.** La escalera, el muro, la viga y el poste los dibuja el juego, que ya los tiene en el escenario. El sprite trae las manos, los pies y la `elevacion` para calzar.
2. **Las que suben cuerpo usan `elevacion` y no un cuadro más alto.** Con el pivote fijo, el juego sube el sprite. Es lo mismo que la garrocha.
3. **En la escalera, mano y rodilla contrarias suben juntas,** como se trepa de verdad.
4. **`bike_fast` va sentado** y no parado en los pedales. Parado no cabe en la celda con los cuerpos altos. Se distingue de `bike` por la inclinación, la cara de esfuerzo y el doble de cadencia.
5. **En `bike_crash` la bici se acuesta en el piso** y el ciclista queda tirado a su lado. La alternativa, el ciclista que sale volando lejos de la bici, no cabe en la celda.
6. **`duck_run` no lleva el control de altura de "de pie".** Agachado y tan inclinado, la cabeza sube y baja 1 o 2 px como el rebote de una carrera. De lado queda dentro de ±1.
7. **El pack `trepar` incluye `edge_teeter` y `fall_off`,** porque son del mismo borde y la tabla B3 los lista.
8. **Arreglé la `bike` de siempre** (32 px y héroes), porque el control nuevo de los héroes recorre todos los packs y la habría dejado en rojo.

## Límites honestos

- **Con la cabeza chibi tan grande, las manos no pasan por encima de la cabeza.** En la escalera y el poste, de espaldas, las manos agarran a los lados de la cabeza. Se lee como trepar, pero no como en un juego de proporciones reales.
- **De lado, en `bike_crash`, la cabeza del ciclista tirado tapa la bici acostada.** De frente y en diagonal se ve.
- **`pole_shake` de espaldas no muestra las manos:** el cuerpo las tapa.
- **El borde y el muro dependen de la altura que traiga el juego.** Si su muro es mucho más alto que la `elevacion`, el atleta va a flotar o a meterse en el muro. Hay que usar el último valor de `elevacion` como altura, o escalar.
- **`balance_fall` de lado cae hacia adelante,** no de costado: de lado no se ve el giro.

## Lo que necesita el siguiente lote

- **El juego:** los dos packs en su `kit.config.json`. Los muros, la viga y los postes a la altura que dice `elevacion`.
- **C7 (animales):** nada de este lote. El perro que duerme en el camino de la Comuna 13 se cruza con `duck_run` y `climb_wall` en el mismo tramo.
- **Dependencia:** esta rama sale de C2 (https://github.com/Lothra2/pixel_forja/pull/17), que sale de P1. Hay que unirlos en orden.
