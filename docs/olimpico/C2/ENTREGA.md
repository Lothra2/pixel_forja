# Lote C2: la cara malandra del Instituto y los cuatro equipos nacionales
Estado: entregado, pendiente de Rick
PR: (se llena al abrir el PR)
Fecha: 2026-10-12

## Qué se hizo

**La cara malandra del Instituto.**
- Kenji, Ryu, Goro y Tetsu traen de base cejas fruncidas en V, el párpado que baja y media sonrisa. Va en el sprite y en los retratos.
- Sale de un campo general de la ficha: `face.base`. Es la cara que pone el personaje cuando la animación no pide otra.
- En las cabezas LPC el flequillo tapaba las cejas, así que las cejas en V se dibujan encima del pelo.

**Los cuatro equipos nacionales del pedido, 16 atletas** con su ficha, editables en el estudio:

| Equipo | Atletas | Lo que los distingue |
|---|---|---|
| Rồng Sài Gòn | Minh, Lan, Tuấn, Bà Hoa | <ul><li>Minh con vovinam azul y cinta roja.</li><li>Lan con el uniforme escolar y la pañoleta roja.</li><li>Tuấn con franela y sandalias.</li><li>Bà Hoa con bộ bà ba, cuerpo más ancho y nón lá.</li></ul> |
| Rolos de Chapinero | Andrés "El Doctor", Camila "Sumercé", Pipe, Don Hernando | <ul><li>Andrés con la ruana gris y la bufanda roja.</li><li>Camila con casco de ciclista e impermeable.</li><li>Pipe con camiseta azul sin escudo y bufanda.</li><li>Don Hernando es el gigante: celda 64, saco de paño y bigote chevron.</li></ul> |
| Los Panas de Caracas | Gabo, Yuli, Chamo Toto, Señora Carmen | <ul><li>Gabo con gorra y camisa de pelotero a rayas.</li><li>Yuli con la chemise beige del liceo.</li><li>Toto con franela grande y chancletas.</li><li>Carmen con rolos y bata de flores.</li></ul> |
| Maracuchos del Lago | Ender "El Primo", Yusmary, Jhonder, Abuela Nerva | <ul><li>Ender con sombrero de gaitero, bigote y guayabera.</li><li>Yusmary con camiseta de básquet, el 23 y el pelo recogido.</li><li>Jhonder con franela de rayas.</li><li>La abuela Nerva con bata fresca y chancletas.</li></ul> |

Los 16 salen en el kit con los 6 packs del juego en las 5 filas, con todos los datos por cuadro, retratos y cabecita. `equipos.json` trae los 6 equipos con nombre, país, colores y atletas.

**Motor** (catálogo C4, todo general):
- **Gorros propios:** `non_la`, `vueltiao`, `gorra_beisbol`, `casco_ciclista`, `sombrero_gaitero` y `rolos`. Van sobre las cabezas LPC, apoyados en la cima del pelo, de frente, de lado y de espalda, con `hatColor`.
- **Algo al cuello** (`outfit.neck`):
  - La bufanda da la vuelta y deja colgar una punta hacia un lado.
  - La pañoleta es el triángulo del uniforme escolar vietnamita.
- **Estampados nuevos:**
  - `flores`, para la bata de casa.
  - `guayabera`, con una alforza a cada lado o dos si el torso es ancho.
- **Calzado abierto:** `chancletas` y `sandalias`. Se ve el pie, con la suela de color, y las sandalias además llevan la tira.
- **Guiño de verdad en las cabezas LPC:** se cierra un ojo con una raya curva. Antes el guiño era la cara de enojo, y ahora que la cara de base del Instituto es fruncida, la burla quedaba igual a la neutra.
- **La burla saca la lengua** cuando la cara de base ya es la media sonrisa. Así la burla de los rivales nunca es igual a su cara de siempre. En Tetsu, con lentes oscuros, es lo único que la distingue.
- **El kit a medida es 2.3 veces más rápido.** Con 24 atletas tardaba 254 s y se pasaba de los 3 minutos del contrato. Ahora tarda unos 100 s, con el kit idéntico byte a byte. Lo que cambió:
  - `finalizeOutlines` recorre solo la caja de lo pintado y no crea un arreglo por pixel.
  - `bodyBox` usa una tabla en vez de un `Set` por pixel.
  - Las rampas de color se guardan.
- **Estudio:**
  - Estilo trae los estampados nuevos, el calzado nuevo, "Al cuello" con su color y "Cara malandra de base".
  - El avatar LPC trae los 6 gorros propios en su lista.

## Cómo se usa (estudio y kit)

En el juego hay que copiar las 16 fichas nuevas a `data/fichas/` y reemplazar `equipos.json` con el de `docs/ejemplos/nekketsu/equipos.json`. La línea de `kit.config.json` no cambia:

```jsonc
"fichas": "fichas/",
"equipos": "equipos.json"
```

```bash
npm run kit-a-medida -- salida --config docs/ejemplos/nekketsu/kit.config.json
```

El manifiesto trae los 6 equipos, el `equipo` de cada atleta y los 15 fondos del VS (uno por par de equipos). En el estudio, cualquier ficha se abre en Inicio, Abrir ficha. La cara malandra es un interruptor en Estilo.

## Pruebas

- **Prueba nueva `equipos.test.ts`, 12 pruebas:**
  - Los 4 equipos con sus 4 atletas y fichas válidas.
  - Don Hernando en 64.
  - **Los 16 pasan el control de calidad en las 5 filas** con `idle`, `walk`, `run`, `jump`, `hit`, `celebrate` y `taunt`.
  - Los 6 gorros en las 3 direcciones, apoyados sobre el pelo.
  - La bufanda, la pañoleta, las flores, la guayabera, las chancletas y las sandalias.
  - La cara de base: cambia la neutra pero no la del golpe.
  - Las cejas en V encima del flequillo.
- **`custom.test.ts`:** el kit completo con 24 atletas, 6 equipos y 15 fondos de VS. Se genera en menos de 3 minutos también dentro de la suite completa.
- **Dos ajustes de pruebas del C1:**
  - La lista de fichas de la carpeta ahora incluye a los nacionales.
  - La imagen dorada `equipos_c1.png` cambió solo en las cuatro columnas del Instituto. Revisé pixel por pixel que fuera la cara malandra y la actualicé.
- **Suite completa:** 25 archivos, 267 de 267.
- **`npm run build:sitio` limpio y e2e de Playwright 44 de 44.** El visor del kit ahora ordena los atletas como `equipos.json` (Familia GG primero, Thor al final). Su prueba cuenta los 6 equipos y los 25 personajes.
- `tsc` limpio.

## Para aprobar (todo en esta carpeta)

- `malandra_antes_despues.png`: el Instituto antes y después, de frente, en 3/4 y en retrato.
- `malandra_instituto.gif`: el Instituto camina hacia la cámara y se burla, con Sophie y Alana de espaldas al frente.
- `sophie_alana_vs_equipos.gif`: Sophie y Alana frente a cada equipo nacional.
- `tablero_<equipo>.png`: los 4 equipos con cada atleta en las 5 filas, corriendo, celebrando, en la burla y con su retrato.
- `hoja_de_contactos.png`: los 24 atletas de los 6 equipos, a la misma escala.
- `gorros.png` y `ropa_nueva.png`: el catálogo nuevo.

## Decisiones que tomé sin preguntar

1. **La cara de base solo reemplaza la cara neutra:** los ojos abiertos y la boca neutra o sonriente. El golpe, los ojos cerrados, el susto y las demás caras quedan igual. Si no, Kenji pondría cara de sobrado mientras lo golpean.
2. **Los equipos nacionales no llevan la cara malandra.** El pedido la pide para el Instituto. El interruptor está en el estudio si algún otro la necesita.
3. **Los objetos de la mano no van pegados al cuerpo:** el paraguas de Andrés, el termo de Don Hernando, la chancleta de Carmen, el furro de Ender y el abanico de Nerva. Los cinco ya existen como armas del piso (`paraguas`, `termo`, `chancleta`, `furro`, `abanico`), con sus animaciones de agarrar, pegar, tirar, bloquear y soplar. Si van pegados al sprite, el atleta no puede soltarlos ni se los pueden quitar.
4. **La ruana de Andrés es una chaqueta gris cerrada con bufanda.** La silueta de poncho no existe todavía en el motor.
5. **Las burlas por equipo quedan para C5.** Los 16 usan el `taunt` general. La burla y la victoria propias siguen siendo de los 8 de la pelea.
6. **Los gorros se llaman como en el catálogo C4.** El vueltiao está hecho aunque nadie de C2 lo use. Es para la Comuna 13.
7. **Yusmary lleva `bangs_bun` y no `curly_long` recogido.** LPC no trae un moño rizado, y a 48 px lo que se lee como "recogido" es el moño. Para volver a los rizos basta con poner `curly_short` en su ficha.
8. **Pipe es adolescente.** Como niño, el short blanco tapaba la camiseta azul.
9. **Hice el kit más rápido en vez de aflojar la prueba de los 3 minutos,** porque el tiempo es contrato del pedido.
10. **El guiño LPC es real.** Esto cambia un poco las burlas de los 8 de P1 que tienen cabeza LPC: ahora guiñan de verdad en vez de fruncir los dos ojos.

## Límites honestos

- **Tetsu no frunce las cejas:** los lentes oscuros se las tapan. Su malandra es la media sonrisa, y su burla saca la lengua.
- **A 48 px la ropa nueva mide 2 o 3 pixeles** (bufanda, pañoleta, flores y alforzas). Se distingue, pero es detalle fino. En el retrato grande se lee mejor.
- **La pañoleta se ve de frente y en diagonal.** De lado y de espalda queda solo la fila del cuello.
- **Los gorros propios solo van en cabezas LPC**, que son las de todos los atletas del juego. En las cabezas por medidas del estudio no se dibujan.
- **El casco de Camila se parece más a un casco de obra** que a uno de ciclista, por el amarillo y las ranuras. La alternativa es otro color en `hatColor` o menos ranuras.
- **Los 16 no traen burla ni victoria propias** hasta C5.
- **El kit ya pesa 36 MB** con 24 atletas y tarda unos 100 s.

## Lo que necesita el siguiente lote

- **El juego:** las 16 fichas y el `equipos.json` nuevo. El VS ya sale para los 15 pares.
- **C5:** las burlas por equipo del pedido.
  - Rồng Sài Gòn hace la pose de vovinam con saludo.
  - Rolos abre el paraguas y se sacude la ruana.
  - Panas se sacude los hombros y señala.
  - Maracuchos se abanica: "¡qué calor, primo!".
- **El juego:** que cada atleta nacional arranque con su objeto (las armas del piso ya existen) si se quiere que aparezcan con él en la mano.
- **Dependencia:** esta rama sale de P1 (https://github.com/Lothra2/pixel_forja/pull/15). Hay que unir P1 primero.
