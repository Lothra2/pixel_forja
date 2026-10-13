# Lote E3b: la azotea de Caracas
Estado: entregado, pendiente de Rick
PR: (se llena al abrirlo)
Fecha: 2026-10-13

## Qué se hizo

`caracas_azotea`, la azotea de Parque Central donde se pelea el Kachinuki, de noche y con el layout del juego tal cual. Es el primer escenario de noche del motor y el primero del estilo `venezuela_ciudad`.

| Capa | Qué lleva |
|---|---|
| Cielo | Noche con estrellas, unas grandes en cruz, nubes finas tocadas por la luna y el resplandor de la ciudad abajo |
| Lejos (`avila_noche`) | El Ávila, la montaña larga azul casi negra con sus quebradas y la Cruz encendida en el pico. Delante, los cerros llenos de lucecitas y la ciudad abajo |
| Cerca (`torres_parque_central`) | <ul><li>La ciudad encendida y las dos torres de Parque Central, de concreto claro con las ventanas prendidas y la luz roja arriba.</li><li>El público en dos azoteas vecinas, con banderas de Venezuela y celulares.</li><li>Los tanques de agua con el tubo oxidado y el murito del borde, con pipotes y un aire.</li></ul> |
| Cerca (`letreros_neon`, x 380 a 640) | <ul><li>La caseta de la escalera: puerta de lámina, dos bombillos, CARACAS ES BELLA con la banderita, los tubos, los aires y la escalerita de hierro al techo.</li><li>Arriba, los neones con su halo: AREPERA LA CHAMA en rosado con la arepa, y CARACAS en turquesa con El Ávila y la Cruz.</li><li>Antenas y parabólicas.</li></ul> |
| Piso | <ul><li>Losas grandes de concreto con charquitos.</li><li>El piso mojado refleja los neones en rayas debajo de cada letrero, más fuerte en los charcos.</li><li>En el filo de la derecha, la franja amarilla y negra, y pasando el canto la ciudad muy abajo.</li></ul> |
| Objetos | Las dos antenas del layout, de celosía con paneles, parabólica y luz roja |
| Vida | <ul><li>Los dos neones (4 cuadros, con parpadeo).</li><li>Las luces rojas de las torres y el tráfico que corre allá abajo pasando el borde.</li><li>El avioncito y el helicóptero con el reflector que barre, en la capa lejos.</li><li>El público, que levanta brazos, banderas y celulares.</li><li>Los fuegos artificiales (partículas).</li></ul> |
| Luces | Los dos neones, los dos bombillos y las cuatro luces rojas (torres y antenas), que parpadean |

**Lo que pidió el juego para cuando el borde avanza a x 420:** el arte trae un filo que se desmorona por pedazos. Son 6 cuadros del canto con la franja y los trozos de concreto que caen con su polvo. Viene con el vacío para pintar lo que se cae (la ciudad allá abajo, en 64 x 64 que se repite). Van en `borde_filo.png` y `borde_vacio.png`, y `escenario.json` → `borde` dice cómo se ponen.

**Motor, todo general:**
- **El estilo `venezuela_ciudad`:** paleta de noche de 24 colores, ficha con 12 íconos y los letreros en español.
- **Un estilo puede decir qué horas sabe pintar.** Caracas a otra hora queda `pendiente` y lo dice: "todavía no tiene arte de tarde (hoy pinta: noche)". No se pinta de noche a escondidas.
- **El cielo de noche,** para cualquier estilo que tenga noche.
- **El reflejo del neón en el piso mojado (`reflejoNeon`):** sale de noche, debajo de las columnas donde hay neón. Una camisa turquesa del público no se refleja.
- **El borde al vacío:** cualquier hueco `vacio` que llega al final del mundo es el borde del edificio. Lleva la franja, la ciudad abajo y la exportación del filo y el vacío.
- **La prueba de camino entiende las arenas.** Sin salida ni meta (la pelea), revisa que se llegue a todo el piso, y el validador ya no avisa por eso.
- **Postales de una arena:** a 0, 2 y 4 segundos, para que se vea la vida.
- **Los fuegos artificiales** se reparten a lo ancho de una arena corta (antes caían más allá del mundo).
- **El incienso** queda solo para Vietnam: la ficha de Caracas no lo pide.
- **Saigón y la Comuna 13 salen idénticos byte a byte** a como estaban en E3a: comparé los 6 escenarios, archivo por archivo.

## Cómo se usa (estudio y kit)

El layout del juego va en `docs/ejemplos/nekketsu/escenarios/caracas_azotea.layout.json`. Es el del juego más tres cosas en `vida`: `helicoptero_reflector` (que el juego dijo que iba a sumar), `publico` y `fuegos_artificiales`. El kit lo genera con los demás escenarios:

```
npm run escenario -- docs/ejemplos/nekketsu/escenarios/caracas_azotea.layout.json salida/ --postales --ficha
```

**El juego:**
- **Capas:** lee `escenario.json` como en los otros. La franja es la de la pelea (246 a 344) y el mundo mide 640, 674 pintado con la inclinación.
- **Vida:**
  - Las piezas de capa `lejos` (avión y helicóptero) van por su `recorrido`.
  - El tráfico es de capa `objeto` con orden -1: encima del piso y detrás de todo.
  - El neón que parpadea es una pieza de capa `cerca` encima de su letrero.
- **Para el borde que avanza:**
  - Pinta `borde_vacio.png` (repetido) desde el borde nuevo hacia la derecha, corrido como el piso.
  - Pone `borde_filo.png` con su esquina en (x del borde - 10, franja.atras) y lo toca de 0 a 5 a 8 fps.
  - Al final se queda en el cuadro 5.
- **Luces:** las que traen `parpadeo` prenden y apagan con ese período en segundos. Las de los neones van con su vida.

## Pruebas

- **Prueba nueva `caracas.test.ts`, 10 casos:**
  - Pasa las 9 pruebas, sin avisos, con la ficha `venezuela_ciudad` de noche.
  - Caracas de tarde queda pendiente y dice qué horas hay.
  - La arena: se llega a todo el piso, y un muro alto que la parte en dos hace fallar la prueba.
  - La Cruz del Ávila queda debajo de la franja del marcador (fila 64 o más).
  - El reflejo: más de 200 pixeles rosados debajo de AREPERA y más de 150 turquesa debajo de CARACAS, y ninguno debajo del público.
  - El borde: franja amarilla y negra en el filo, ciudad pasando el canto y el vacío que se repite cada 64.
  - La exportación del filo (6 cuadros distintos) y del vacío. Un escenario sin borde no la lleva.
  - La vida, pieza por pieza. El público de la vida calza pixel por pixel con el pintado, y sin pedirlo en el layout no sale.
  - Las luces: todas prendidas, las rojas parpadean y los fuegos caen dentro del mundo.
  - La imagen dorada `golden/caracas_e3b.png`: la azotea a los 0 y a los 3 segundos.
- **`comuna13.test.ts`:** el mensaje del lugar sin arte ahora nombra el estilo y la hora.
- **`custom.test.ts`:** el kit de Nekketsu trae 7 escenarios, Caracas con 10 PNG.
- **Suite completa:** 25 archivos, 269 de 269.
- **`tsc` limpio, `npm run build:sitio` limpio y e2e de Playwright 44 de 44.**

**Las 9 pruebas de `caracas_azotea`** (`verificacion.md`):
- **Legibilidad:** contraste mediano 3.1:1, el peor 2.1:1. A esa noche el piso queda en grises medios para que el contorno oscuro de los atletas se lea.
- **Peso, en la pantalla:** 9 piezas animadas (máx 16), 8 luces (máx 12) y 2 objetos.
- **Paleta:** 23 de los 24 colores.

## Para aprobar (todo en esta carpeta)

- `conceptos/concepto_vs_caracas_azotea.jpg`: el concepto arriba y la azotea abajo, con la pelea.
- `caracas_pelea.gif`: 6 segundos de pelea.
  - Rick contra Kenji, Steph tambaleándose en el filo, Alana burlándose y Thor sentado al fondo, con las armas del layout en el piso.
  - Se ven el neón que parpadea, el helicóptero que cruza el Ávila con el reflector y el público.
- `caracas_filo.gif`: el borde que avanza a x 420 y se desmorona, con el vacío pintado.
- `azotea_x2.png`: la azotea vacía, ampliada.
- `mismo_juego.png`: el hẻm aprobado, el mirador de la Comuna 13 y la azotea, lado a lado.
- `postales/`: a 0, 2 y 4 segundos.
- `ficha_arte.md` y `verificacion.md`.

## Decisiones que tomé sin preguntar

1. **La composición va al revés del concepto, porque así lo dice el layout.** En el concepto la caseta con los neones está a la izquierda y las torres a la derecha, pasando el borde. El layout pone `letreros_neon` de x 380 a 640 y el borde a la derecha. Entonces:
   - las torres, el público y los tanques van a la izquierda (en el fondo, detrás del murito);
   - la caseta con los neones va a la derecha;
   - pasando el borde se ve la ciudad.

   Se lee igual: el borde es el de la derecha y los neones caen al lado.
2. **El reflejo es de los neones, no de todo.** Si el piso reflejara cada ventana de las torres se volvería una sopa amarilla. Los bombillos y la ciudad no se reflejan. Los neones sí, y más fuerte en los charcos.
3. **El piso mojado va siempre de noche,** aunque el layout diga `despejado`. El concepto lo pide ("el piso mojado que refleja el neón") y en Caracas el sereno moja la azotea. Si el juego quiere la noche seca, se puede atar a un clima.
4. **Ignoré "VENEZUELA LIBRE" en la pared del fondo, como pidió el juego,** y también el logo de PDVSA de los tanques: es una marca real. Me quedé con CARACAS ES BELLA, que no es marca.
5. **El público es de pixel art propio, chiquito** (12 px), con banderas y celulares. No usé los sprites de público del kit, porque a esa distancia son muy grandes. Si el juego quiere su propio público, puede quitar `publico` de la vida y dejar solo el pintado, que está quieto.
6. **Sumé `helicoptero_reflector`, `publico` y `fuegos_artificiales` al ejemplo del layout.** El helicóptero lo había anunciado el juego. Los otros dos salen de NOCHE.md ("el público en las azoteas vecinas" y "fuegos artificiales al final"). Acepta también `helicoptero` a secas.
7. **El helicóptero es vida de la capa lejos y no un vehículo del lote D2.** Vuela delante del Ávila, a la distancia de la montaña. Como vehículo andaría por la franja, que no es lo que muestra el concepto.

## Límites honestos

- **Solo de noche.** `venezuela_ciudad` no sabe pintar otra hora. Un layout de Caracas de tarde queda pendiente con aviso. `caracas_barrio` (tarde) va a necesitar su propio estilo y su paleta.
- **El borde que avanza lo mueve el juego.** El arte trae el filo y el vacío, pero el murito del fondo, que está pintado en la capa cerca, sigue entero hasta x 618 cuando el piso ya se cayó hasta x 420. Para quitarlo haría falta otra pieza de capa cerca que el juego apague. Si molesta en el juego, lo hago.
- **El tráfico de allá abajo solo se ve en el borde de hoy (x 618).** Cuando el borde avanza, el vacío nuevo es una textura quieta.
- **El reflejo no parpadea con el neón.** Está pintado en el piso, así que cuando LA CHAMA se apaga su reflejo sigue prendido. A 4 cuadros por segundo casi no se nota.
- **El público y las torres son chiquitos y repetidos.** Se leen como gente y como torres a 1x, pero no tienen el detalle del concepto (que es una ilustración, no pixel art de 640).
- **Thor no está en el arte:** es una entidad `npc` del layout, que pone el juego. En el GIF lo puse con el atlas del kit para que se vea dónde queda.

## Lo que necesita el siguiente lote

- **El juego:**
  - Sumar `helicoptero_reflector`, `publico` y `fuegos_artificiales` a la `vida` de su layout (o quitarlos del ejemplo).
  - Conectar el arte a la escena de la pelea, que hoy pinta su propio fondo gris.
  - Usar `borde` para cuando la azotea se achica.
- **Siguiente lote del orden: C7b, el gallo y la paloma** (el esqueleto de ave). Después C5 (las burlas por equipo) y C7c (el perro y `jump_wall`).
- **Dependencia:** esta rama sale de E3a (https://github.com/Lothra2/pixel_forja/pull/22), que sale de E2.
