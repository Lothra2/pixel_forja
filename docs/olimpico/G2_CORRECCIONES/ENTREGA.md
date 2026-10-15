# Lote G2 correcciones: el nombre en la tarjeta y el VS de 1 contra 1
Estado: entregado, pendiente de Rick
PR:
Fecha: 2026-10-15

## Qué se hizo

### 1. La tarjeta: el nombre pasa a su propia franja

El problema era de espacio. `fuente_ui` a 2, como la pone `Select.ts`, mide así:

| Nombre corto | Ancho a 2 |
|---|---|
| RỒNG SÀI GÒN | 142 |
| MARACUCHOS | 130 |
| FAMILIA GG | 110 |
| INSTITUTO | 100 |
| PANAS | 70 |
| ROLOS | 66 |

`texto` medía 104 y quedaba entre una bandera de 34 y un escudo de 26. Ahí no cabían dos de los seis, y ensancharlo a 150 tampoco alcanzaba: la tarjeta tiene 176 por dentro y 142 + 34 + 26 no entra.

**Lo que hice:** el nombre baja a una placa casi negra, de lado a lado, debajo de las caras.
- **Lo que no cambió:** la tarjeta sigue en 184 x 104, la franja de las caras sigue en `[8, 32, 168, 48]`, y la bandera de 32 y el escudo de 26 siguen arriba en su tamaño.
- **`texto` nuevo:** `[8, 81, 168, 20]`. Son 168 de ancho, así que caben hasta 14 letras a 2.
- **La altura:** Phaser centra la línea entera de 11 px, así que con el centro en y 91 la línea a 2 va de 80 a 97. Los dos acentos de la Ồ no tocan las caras.
- **Pieza nueva en el manifiesto:** `placa: [8, 80, 168, 20]`, el rectángulo oscuro. No quité ni renombré nada.
- **Por qué se lee:** el juego tiñe el nombre con `claro`, el color del equipo aclarado al 55 %, y ese tinte está pensado para fondo oscuro. Sobre la placa, MARACUCHOS ya no pelea con el azul y el amarillo.
- **Los adornos:** dos chevrones del acento en cada punta de la placa. Si el acento es oscuro, como el azul de los Panas, salen aclarados.
- **Lo que se fue:** el escudo en marca de agua de abajo, porque ahí va ahora la placa. Las rayas de velocidad suben a la franja de arriba, entre la bandera y el escudo.

### 2. `marco_vs_2`: el VS de 1 contra 1

- **Igual al de 4:** 800 x 360, con el mismo fondo partido en diagonal, la misma costura de (440, 0) a (360, 360) y las mismas `vs`, `texto`, `nombres` y `frases`.
- **El hueco:** uno de 96 por lado, para el retrato grande a 1 sin escalar.
- **El marco:** mide 16 de ancho, 128 por fuera. Lleva oro por fuera, la banda del color del lado con remaches y un filete de oro junto al retrato.
- **Dónde caen:** los centros quedan en x 230 y 570 de la imagen, que en la parte de 640 son 150 y 490. Ahí mismo pone `Fight.ts` los retratos hoy.
- **El manifiesto:** trae `margen`, `huecos`, `marco`, `vs`, `texto`, `nombres`, `frases`, `costura` y `nota`, igual que el de 4 más `marco`.
- **Cómo sale:** viene en la parte `marco_vs`, junto al de 4.

**Lo que no cambió:** `marco_vs_4` y el resto del envoltorio salen igualitos, byte por byte. Lo comprobé con la huella de cada pieza antes y después.

## Cómo se usa (estudio y kit)

**En el kit:** nada nuevo en `kit.config.json`. Con `"interfaz": true` o con `marco_vs` en la lista sale `ui/marco_vs_2.png`. La tarjeta sale con su `texto` nuevo.

**Lo que tiene que conectar el juego:**
- **`Select.ts`:** nada. Ya lee `texto` del manifiesto y centra el nombre ahí. La línea `if (nom.width > tw) nom.setScale(1)` deja de hacer falta, porque ya no se dispara con ninguno de los seis. Puede quedarse por si llega un equipo de nombre largo.
- **`Fight.ts`, en `vs()`:**
  - Cuando es 1 contra 1, o en judo con el compañero que no pelea, usa `ui_marco_vs_2` en x -80, como el de 4.
  - Cada retrato va en el centro de su hueco menos 80: (150, 150) y (490, 150), donde ya están.
  - Los nombres y las frases quedan en y 246 y 268, como hoy.
  - El retrato de la derecha se ve mejor volteado, mirando al centro.

**El conteo:** es un PNG más, `ui/marco_vs_2.png`. Va en `ui.interfaz`, que el juego empaqueta, así que el artifact sigue en 500.

## Pruebas

- **En `g2.test.ts`, 2 casos nuevos:**
  - **Los 6 nombres cortos del juego,** escritos con `fuente_ui` a 2 donde los pone `Select.ts`:
    - cada pixel cae dentro de la placa, sin tocar la bandera, el escudo ni las caras;
    - cada pixel se lee: el tinte `claro` le gana a la placa por más de 90 de luminancia;
    - la franja de las caras sigue en `[8, 32, 168, 48]`.
  - **`marco_vs_2`:**
    - mide 800 x 360 y lleva el mismo fondo y los mismos rectángulos que el de 4;
    - tiene dos huecos simétricos de 96 con centros en 230 y 570, oscuros;
    - cada marco entero queda de su lado de la costura, dentro de la parte de 640 y lejos de la palabra VS;
    - el borde de afuera y el filete de adentro son oscuros y la placa del nombre va debajo.
- **La prueba del kit a medida:** ahora pide también `marco_vs` y revisa que salgan los dos marcos con sus campos. La de la tarjeta revisa `placa`.
- **`custom.test.ts`:** el conteo de PNG sube de 46 a 47 en el envoltorio.
- **La suite sin `custom.test.ts`:** 53 archivos, 538 de 538.
- **`custom.test.ts`: 15 de 15,** con el kit generado en 246 s, por debajo del límite de 300.
- **`tsc` limpio, `npm run build:sitio` limpio y e2e de Playwright 50 de 50.**

## Para aprobar (todo en esta carpeta)

- **`tarjetas_antes_y_despues.png`:** RỒNG SÀI GÒN, MARACUCHOS y FAMILIA GG, antes y ahora, con el nombre a 2 y el tinte del juego.
- **`tarjetas_seleccion.png`:** las 6 tarjetas como las arma `Select.ts`, a x2 para verlas bien.
- **`tarjetas_seleccion_x1.png`:** las mismas a tamaño real.
- **`vs_de_2.png`:** Rick contra Kenji, con retratos a 1, nombres a 2 y frases a 1.
- **`vs_de_2_judo.png`:** Alana contra Ryu, con la cara de burla.
- **`vs_de_2_solo.png`:** el marco solo, a tamaño real.

Qué mirar: que los seis nombres se lean de lejos en la tablet, y que el VS de 1 contra 1 no se vea vacío.

## Decisiones que tomé sin preguntar

1. **Moví el nombre en vez de achicar la bandera y el escudo.** Con una bandera de 16 y un escudo de 14 el nombre cabía arriba, pero los dos se volvían una mancha a x1. Abajo, la tarjeta se lee de arriba abajo: quién es, quiénes son y cómo se llama.
2. **El hueco del VS es de 96, no de 128.** Pasar de 96 a 128 es escalar x1,33, y eso emborrona el pixel. El marco ancho de 16 le da el tamaño de 128 sin tocar el retrato.
3. **Los huecos caen donde el juego ya pone los retratos,** para que el cambio en `Fight.ts` sea solo la imagen de fondo.
4. **`placa` y `marco` son campos nuevos** del manifiesto. No le quité ni le renombré nada a ninguna pieza.

## Límites honestos

- **El nombre largo tiene tope:** caben 14 letras a 2. Un equipo nuevo con nombre corto más largo vuelve a caer a 1 por la línea de `Select.ts`.
- **A x1 el retrato de 96 es mediano** en una pantalla de 640, aunque el marco lo agranda. Si lo quieres más grande, la opción nítida es a 2, en un hueco de 192. Para eso hay que bajar los nombres y las frases, así que sería otro marco.
- **En el tablero, el tinte del nombre lo simulé** con la misma fórmula de `aclarar()` del juego. En Phaser el tinte multiplica igual, pero hay que verlo en la tablet.

## Lo que necesita el siguiente lote

- **El juego:** usar `ui_marco_vs_2` en `vs()` cuando es 1 contra 1 y en judo.
- **Lo que queda del mensaje:**
  - El mapa de la gira y las escenas de la intro.
  - La cinta del cuarto puesto.
  - Cada uno va en su PR.
