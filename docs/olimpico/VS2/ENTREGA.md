# Lote VS2: el marco del VS de 1 contra 1
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/50
Fecha: 2026-10-15

## Qué se hizo

**`marco_vs_2`** es el marco para el 1 contra 1 y el judo: una cara por lado, para que se vea que pelean dos.

- **Igual que el de 4:**
  - 800 x 360;
  - el mismo fondo partido en diagonal, azul a la izquierda y rojo a la derecha;
  - la misma costura blanca de (440, 0) a (360, 360);
  - las mismas `vs`, `texto`, `nombres` y `frases`.
- **El hueco:** uno de 96 por lado, para el retrato grande a 1, sin escalar.
- **El marco:** mide 16 de ancho, 128 por fuera. Lleva oro por fuera, la banda del color del lado con remaches y un filete de oro junto al retrato.
- **Dónde caen los huecos:** los centros quedan en x 230 y 570 de la imagen, que en la parte de 640 son 150 y 490. Ahí mismo pone `Fight.ts` los retratos hoy.
- **La placa del nombre:** va bajo cada marco y mide 176, más ancha que la del de 4, porque en el 1 contra 1 sobra lugar.
- **El manifiesto:** trae `margen`, `huecos`, `marco`, `vs`, `texto`, `nombres`, `frases`, `costura` y `nota`. Es lo mismo que el de 4 más `marco`.
- **Cómo sale:** viene en la parte `marco_vs`, junto al de 4.

**Lo que no cambió:**
- `marco_vs_4` y el resto del envoltorio salen igualitos, byte por byte. Lo comprobé con la huella de cada pieza antes y después. El fondo y las placas del VS pasaron a funciones que usan los dos marcos.
- La tarjeta queda como está, porque el juego ya escribe a 1,5 los nombres largos y se leen bien.

## Cómo se usa (estudio y kit)

**En el kit:** nada nuevo en `kit.config.json`. Con `"interfaz": true` o con `marco_vs` en la lista sale `ui/marco_vs_2.png`.

**Lo que tiene que conectar el juego en `Fight.ts`, en `vs()`:**
- Cuando es 1 contra 1, o en judo, usa `ui_marco_vs_2` en x -80, como el de 4. Ya sin el compañero que no pelea.
- Cada retrato va en el centro de su hueco menos 80: (150, 150) y (490, 150), donde ya están.
- Los nombres y las frases quedan en y 246 y 268, como hoy.
- El retrato de la derecha se ve mejor volteado, mirando al centro.

**El conteo:** es un PNG más, `ui/marco_vs_2.png`. Va en `ui.interfaz`, que el juego empaqueta, así que el artifact sigue en 500.

## Pruebas

- **Caso nuevo en `g2.test.ts`, el de `marco_vs_2`:**
  - mide 800 x 360 y lleva el mismo fondo y los mismos rectángulos que el de 4;
  - tiene dos huecos simétricos de 96, oscuros, con centros en 230 y 570;
  - cada marco entero queda de su lado de la costura, dentro de la parte de 640 y lejos de la palabra VS;
  - el borde de afuera y el filete de adentro son oscuros, y la placa del nombre va debajo.
- **La prueba del kit a medida:** ahora pide también `marco_vs` y revisa que salgan los dos marcos con sus campos.
- **`custom.test.ts`:** el conteo de PNG sube de 46 a 47 en el envoltorio.
- **La suite sin `custom.test.ts`:** 53 archivos, 537 de 537.
- **`custom.test.ts`: 15 de 15,** con el kit generado en 243 s, por debajo del límite de 300.
- **`tsc` limpio, `npm run build:sitio` limpio y e2e de Playwright 50 de 50.**

## Para aprobar (todo en esta carpeta)

- **`vs_de_2.png`:** Rick contra Kenji, con los retratos a 1, los nombres a 2, las frases a 1 y el VS a 4, como lo arma `Fight.ts`. Va a x2.
- **`vs_de_2_judo.png`:** Alana contra Ryu, con la cara de burla.
- **`vs_de_2_solo.png`:** el marco solo, a tamaño real.

Qué mirar: que se lea de una que pelean dos, y que el VS de 1 contra 1 no se vea vacío.

## Decisiones que tomé sin preguntar

1. **El hueco es de 96 y no de 128.** Pasar de 96 a 128 es escalar x1,33, y eso emborrona el pixel. El marco ancho de 16 le da el tamaño de 128 sin tocar el retrato.
2. **Los huecos caen donde el juego ya pone los retratos,** para que el cambio en `Fight.ts` sea solo la imagen de fondo.
3. **`marco` es un campo nuevo** del manifiesto. No le quité ni le renombré nada a ninguna pieza.

## Límites honestos

- **A x1 el retrato de 96 es mediano** en una pantalla de 640, aunque el marco lo agranda.
- **Si lo quieres más grande,** la opción nítida es a 2, en un hueco de 192. Para eso hay que bajar los nombres y las frases, así que sería otro marco.

## Lo que necesita el siguiente lote

- **El juego:** usar `ui_marco_vs_2` en `vs()` cuando es 1 contra 1 y en judo.
- **Lo que queda del mensaje:** el mapa de la gira (#52), las escenas de la intro (#53) y la cinta del cuarto puesto (#51), cada uno en su PR.
