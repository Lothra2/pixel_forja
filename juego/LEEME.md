# Réquiem de Ceniza (Legado GG)

Juego de rol de acción isométrico y oscuro (antes "La Marca de Ceniza"), hecho en casa para Rick y la familia. Todo es original: historia, clases,
habilidades, monstruos, objetos, lugares, música y arte (pintado por el motor gótico de `src/engine/gotico`).

## Cómo se juega

- **Clic izquierdo**: caminar, atacar, recoger, hablar, abrir cofres y usar piedras de viaje. Mantenlo apretado para seguir caminando o pegando.
- **Clic derecho**: la habilidad del botón derecho (hechizos, flechas, gritos). Las auras se activan solo con ponerlas en ese botón.
- **Shift + clic**: atacar sin moverte.
- **1 a 4**: pociones del cinturón. **B**: pergamino de regreso (portal al campamento).
- **I** inventario, **C** personaje, **T** habilidades, **Q** misiones, **Tab** mapa, **R** correr o caminar, **Alt** muestra todo el botín, **5 a 0** y **F1 a F10** atajos de habilidades (también con clic en la barra), **Esc** menú.
- En tablet aparecen dos botones grandes (Poder y Golpe) que atacan al enemigo más cercano. Tocar y mantener camina.

## Qué hay

- Intro de cine de casi un minuto y medio: la cámara se mueve, la ceniza cae, la brasa baja como un meteoro sobre la abadía con destello y sacudida, y Ozmaren aparece entre relámpagos. El texto se escribe solo. Se salta con clic o Esc.
- Selección de clase nueva: cada clase se presenta en grande con su pose y su luz, con su ficha de rol, dificultad, atributos, mecánica propia y las tres ramas con su habilidad estrella. Se puede ver al héroe como novato o como leyenda.
- 8 clases (Berserker, Templario, Arcanista, Cazadora, Nigromante, Monje, Druida, Alquimista).
- Luces de verdad: cada fuego, flecha, hechizo y explosión alumbra lo que tiene cerca y tiñe a los personajes con su color. Cada luz proyecta sombras de los personajes, estiradas lejos de ella. Las explosiones dan un destello.
- Los pies ya no patinan: la animación de caminar y correr avanza con la distancia real (con botas rápidas el paso se acelera).
- El equipo cambia el dibujo según su rareza: raro trae ribetes de oro, conjunto viste su orden, único cambia a un tema sagrado, oscuro, de sangre o arcano con capa y hombreras, y legendario brilla y le da al héroe un aura de luz.
- 30 habilidades por clase en 3 ramas de 10, que se abren a los niveles 1, 6, 12, 18, 24 y una definitiva a nivel 30, con requisitos y sinergias. Árbol nuevo con ayuda de valores actuales y del siguiente nivel.
- Cada clase juega distinto: furia del berserker, una sola aura del templario, cargas de fuego, hielo y rayo de la arcanista, halcón y trampas de la cazadora, cadáveres del nigromante, combos del monje, formas de lobo y oso del druida, y frascos de la alquimista. Un indicador en la barra muestra cada uno.
- 5 actos con 26 zonas: el valle de Velmora (páramo, cueva, camposanto, abadía, catacumbas y el Pozo de la Brasa), el desierto de Sahrim y sus tumbas, la selva de Yhuantl y su templo, los picos helados de Hrimgard y la Herida.
- 10 misiones con premios y jefes con fases. Los jefes grandes (el Verdugo, la Abadesa, Khamer-Ul que no tiene sombra, Madre Ciénaga, Hjaldur y Ozmaren con su fuego) son modelos propios de la Forja, frases propias e invocaciones. Campeones y únicos con nombres generados y modificadores.
- Botín con rarezas normal, mágico, raro, de conjunto, único y legendario. Unos 130 tipos de objeto, 114 afijos, 48 únicos, 6 conjuntos, 35 gemas, 20 runas y 10 palabras rúnicas. **Armas vivas** de fuego, hielo, rayo, veneno, sombra, luz y sangre que arden en la mano y en el inventario.
- Lo que te pones cambia el dibujo del héroe de verdad: el juego lo vuelve a pintar en segundo plano ("Forjando tu equipo").
- Inventario de la Forja: el héroe se ve de verdad con su equipo, armas en 3D, objetos de su tamaño real, fondo por rareza, durabilidad, gemas engarzadas, flechas de mejor o peor que lo puesto, tres bolsas de 10x5 y botón para ordenar.
- Talismanes: el casillero extra lleva amuletos de hueso, cera y ceniza con afijos propios (radio de luz, hallazgo, resistencia al terror, +1 a habilidades). Cada jefe de acto suelta siempre su talismán único.
- Tiendas (comprar, vender con clic derecho, reparar), la vidente para apostar, baúl compartido entre héroes, piedras de viaje, portales.
- Oscuridad real con radio de luz, niebla, lluvia, nieve y ceniza, sangre que queda en el piso, cadáveres, sacudida de cámara, susurros y visiones que asoman al borde de la luz. Música y sonidos hechos con WebAudio, distintos por acto.
- Misterio: 9 páginas arrancadas del diario del primer abad escondidas en libros malditos de las mazmorras, momentos de terror donde la luz se encoge y algo te nombra, y un final con su giro después de vencer a Ozmaren.
- Español e inglés, volumen, brillo y pantalla completa. Las partidas se guardan solas en el navegador.

## Qué falta o se puede mejorar

- Las bestias del motor ya están en los actos: lobos, jabalíes, arañas, escorpiones, gárgolas, murciélagos, gólems, perros de la Herida, demonios alados, la Madre del Pozo, la Boca de Arena y Varnhul, el dragón de huesos. La primera vez que entras a una zona nueva tarda unos segundos en cargar sus dibujos.
- Cofres de madera, hierro, malditos y relicarios que se abren con su animación, oro que cae en montones, haces de luz bajo el botín y salas de jefe con su tesoro. Íconos 3D en tienda y baúl.
- Al vencer el acto 5 se abren Pesadilla e Infierno desde la lista de héroes. No hay multijugador.
- Las partidas viven en el navegador donde se jugó (si se borran los datos del sitio se pierden).

## Para desarrollar

- `npm run juego` levanta el juego en http://localhost:5190.
- `npm run juego:hornear` vuelve a pintar todos los atlas (unos 12 minutos con 4 núcleos) en `juego/public/assets`.
- `npm run juego:build` y después `python3 juego/hornear/publicar.py` arman la página para publicar.
