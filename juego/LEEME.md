# La Marca de Ceniza (Legado GG)

Juego de rol de acción isométrico y oscuro, hecho en casa para Rick y la familia. Todo es original: historia, clases,
habilidades, monstruos, objetos, lugares, música y arte (pintado por el motor gótico de `src/engine/gotico`).

## Cómo se juega

- **Clic izquierdo**: caminar, atacar, recoger, hablar, abrir cofres y usar piedras de viaje. Mantenlo apretado para seguir caminando o pegando.
- **Clic derecho**: la habilidad del botón derecho (hechizos, flechas, gritos). Las auras se activan solo con ponerlas en ese botón.
- **Shift + clic**: atacar sin moverte.
- **1 a 4**: pociones del cinturón. **B**: pergamino de regreso (portal al campamento).
- **I** inventario, **C** personaje, **T** habilidades, **Q** misiones, **Tab** mapa, **R** correr o caminar, **Alt** muestra todo el botín, **F1 a F8** atajos de habilidades, **Esc** menú.
- En tablet aparecen dos botones grandes (Poder y Golpe) que atacan al enemigo más cercano. Tocar y mantener camina.

## Qué hay

- Intro propio con voz escrita y el título que se enciende. Menú con fondo vivo del campamento.
- 8 clases (Berserker, Templario, Arcanista, Cazadora, Nigromante, Monje, Druida, Alquimista), elegidas alrededor del fuego.
- Unas 12 habilidades por clase en 3 ramas, con sinergias, pasivas, auras, invocaciones, maldiciones, saltos, cargas, torbellino, bombas, torretas y cuervos. Cada habilidad usa los poderes del motor.
- 5 actos con 26 zonas: el valle de Velmora (páramo, cueva, camposanto, abadía, catacumbas y el Pozo de la Brasa), el desierto de Sahrim y sus tumbas, la selva de Yhuantl y su templo, los picos helados de Hrimgard y la Herida.
- 10 misiones con premios y 6 jefes con fases, frases propias e invocaciones. Campeones y únicos con nombres generados y modificadores.
- Botín con rarezas normal, mágico, raro, de conjunto, único y legendario. Unos 130 tipos de objeto, 114 afijos, 48 únicos, 6 conjuntos, 35 gemas, 20 runas y 10 palabras rúnicas. **Armas vivas** de fuego, hielo, rayo, veneno, sombra, luz y sangre que arden en la mano y en el inventario.
- Lo que te pones cambia el dibujo del héroe de verdad: el juego lo vuelve a pintar en segundo plano ("Forjando tu equipo").
- Tiendas (comprar, vender con clic derecho, reparar), la vidente para apostar, baúl compartido entre héroes, piedras de viaje, portales.
- Oscuridad real con radio de luz, niebla, lluvia, nieve y ceniza, sangre que queda en el piso, cadáveres, sacudida de cámara, susurros y visiones que asoman al borde de la luz. Música y sonidos hechos con WebAudio, distintos por acto.
- Misterio: 9 páginas arrancadas del diario del primer abad escondidas en libros malditos de las mazmorras, momentos de terror donde la luz se encoge y algo te nombra, y un final con su giro después de vencer a Ozmaren.
- Español e inglés, volumen, brillo y pantalla completa. Las partidas se guardan solas en el navegador.

## Qué falta o se puede mejorar

- Las bestias del motor ya están en los actos: lobos, jabalíes, arañas, escorpiones, gárgolas, murciélagos, gólems, perros de la Herida, demonios alados, la Madre del Pozo, la Boca de Arena y Varnhul, el dragón de huesos. La primera vez que entras a una zona nueva tarda unos segundos en cargar sus dibujos.
- Los íconos de armaduras en el inventario son dibujos simples; las armas sí usan el arsenal del motor.
- Al vencer el acto 5 se abren Pesadilla e Infierno desde la lista de héroes. No hay multijugador.
- Las partidas viven en el navegador donde se jugó (si se borran los datos del sitio se pierden).

## Para desarrollar

- `npm run juego` levanta el juego en http://localhost:5190.
- `npm run juego:hornear` vuelve a pintar todos los atlas (unos 12 minutos con 4 núcleos) en `juego/public/assets`.
- `npm run juego:build` y después `python3 juego/hornear/publicar.py` arman la página para publicar.
