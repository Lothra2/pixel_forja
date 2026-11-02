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

## Lo grande nuevo (noviembre)

- **7 actos y 68 zonas.** Velmora, Sahrim, Yhuantl, Hrimgard, la Herida, Ysmeral la Ciudad Ahogada y la Corona del Dios Sediento. Cada acto tiene su pueblo, su cadena principal y 2 o 3 mazmorras laterales con mini jefe y cofre de tesoro. Los mapas cambian en cada partida.
- **Historia de siete actos.** 42 misiones (3 principales y 3 secundarias por acto, muchas con elección), diálogos que cambian según lo que hiciste, diarios de cada sello, fantasmas que repiten su última escena y cinemáticas entre actos.
- **Criptas, catacumbas y camposantos nuevos.** 98 objetos de muerte del taller: nichos con calaveras, sarcófagos de obispo, osarios, mausoleos, lápidas con musgo. Cada mazmorra elige al azar su par de muros, así dos criptas no se ven iguales.
- **Arsenal épico.** 26 armas nuevas en dos rangos, mítico desde el nivel 55 y ancestral desde el 78: katana, estoque, falcata, tridente, lucero del alba, arco largo, arco corto, jabalina, gran báculo, orbe de mano, katar, hoz y lanza del dragón. Cada una juega como su familia, así el katar sigue siendo del monje y el arco largo dispara. 24 piezas de armadura en las 6 líneas épicas (ahogada, escamas, élfica, dracónica, demoníaca y celestial) que cambian el cuerpo entero, con halo y alitas en la celestial. 13 legendarias de nivel 60 a 90 cambiaron de forma, como el Tañido de la Campana, que ahora es un tridente, y La Primera Brasa, que ahora es una lanza del dragón. El Coro Ahogado viste la línea ahogada y la Vigilia de Mármol la celestial.
- **Hielo, nieve, infierno y fortaleza.** 113 objetos nuevos de los actos 4 y 5: mamuts, cabañas con la ventana encendida, hogueras, columnas de hielo con alguien atrapado adentro, portales helados, jaulas colgantes, piras, carne que late y columnas de fuego. El Fortín de Vel y el Bastión del Último Coro tienen murallas almenadas con portón en las salidas. El Río de Lava ahora tiene un río de verdad que corta el mapa: no se cruza, salvo por los puentes donde pasa el camino. Hay un tema nuevo de fortaleza para mazmorras, con murallas o almenas según la partida.
- **Bajo tierra.** 98 objetos nuevos de cuevas, minas y abismo. El Abismo ahora es de islas de verdad: cada sala es una isla con su acantilado, los pasillos son puentes sobre el vacío y abajo flotan islotes, cadenas, una mano colosal, ojos y estrellas. Las minas tienen vías con curvas, cruces y fin de vía, vagonetas y paredes con veta de oro, hierro o sangre. Las cuevas suman drusas que brillan, hongos gigantes, capullos que se mecen y un lago negro con ojos bajo el agua.
- **Páramo, desierto y selva.** 98 objetos nuevos en los exteriores de los actos 1 a 3. El Páramo de Velmora tiene un arroyo que lo cruza con puentes de piedra y vados, horcas y picotas. El Bosque de los Ahorcados tiene árboles con ahorcados que se mecen y la hoguera de la bruja. En el desierto hay arenas movedizas y remolinos en las Dunas, un oasis con buitres en el Oasis Muerto y una esfinge con estatuas caídas en las Ruinas del Sol. La Selva tiene cascadas, ídolos con ojos que brillan y flores carnívoras, y el Manglar tiene chozas sobre pilotes y puentes colgantes.
- **Ysmeral, la Corona y los jefes finales.** 89 objetos nuevos: naufragios, mástiles con la vela rota, campanas, la ciudad hundida con percebes y la costa con ballenas de hueso. El Barco Varado tiene su casco encallado detrás del campamento. Las Islas de Oro son islas de verdad sobre el vacío, con bordes dorados y escalones flotantes entre ellas. La Corona suma estatuas de los que intentaron subir, el trono por partes y la fuente seca. La Campana que Ahoga y Aun-Saar ya tienen cuerpo propio: ella es la sacerdotisa fundida con la campana, con luz verde de mar que crece al tañer, y él es de mármol agrietado, con seis manos de oro, halos rotos y una boca en el pecho que late con luz dorada.
- **Guardado y jefes.** La partida se guarda sola cada 30 segundos y al cerrar u ocultar la pestaña. Antes solo se guardaba al cambiar de zona. Los jefes despiertan cuando te acercas a su sala aunque un muro los tape, y la sala de los jefes enormes queda despejada para verlos bien.
- **Thor.** El perro de la familia acompaña al héroe desde el principio. Sigue, pelea, sube de nivel contigo y su armadura sube por tramos: niveles 1, 6, 15, 30, 50 y 75. Cada tramo le da vida y le quita daño recibido. Cuando estás en apuros o rodeado ladra y te pone un escudo. Si cae, se echa a descansar y vuelve solo en un minuto, o al llegar al pueblo, sin castigo. El Collar de Thor del Legado GG lo hace más fuerte y más rápido. Es un bóxer leonado con pecho blanco y collar azul, y su armadura cambia a la vista en cada tramo hasta la barda azul y oro de la Casa GG. Galopa cuando corres.
- **Balance.** Hay un simulador de combate sin pantalla (juego/herramientas/balance.mts) que mide, con el código real del juego, cuánto tarda el héroe en matar y en morir del nivel 1 al 100 en las tres dificultades. Con él se ajustó la curva: los monstruos reusados en actos más altos ya no escalan dos veces, la Pesadilla va del 59 al 86 y el Infierno del 81 al 100, la penalización de resistencias baja a -30 y -60, y se ajustó la vida de varios jefes. Subir al 30 toma cerca de 1.5 h, al 70 unas 5 h y al 100 unas 23 h. El reporte completo está en juego/herramientas/BALANCE.md. Thor puede encontrar collar y barda propios: caen de únicos y jefes, se le ponen desde su panel junto al inventario o con clic derecho.
- **La catedral de Santa Oria.** El Camposanto tiene en el centro una catedral gótica en ruinas: dos torres con agujas, rosetón, arbotantes y luz roja que late en los vitrales. Su puerta es la entrada a la Nave del Silencio. Está sellada hasta aceptar Las campanas mudas, entera después y herida cuando cae la Abadesa. Cuando te acercas por delante, la cámara sube para que se vean las torres, y como es un hito se ve desde lejos.
- **Vesperio, el Pregonero de la Sed.** Aparece antes de cada jefe y escapa, hasta la pelea final en la Fragua de Ozmaren.
- **La revelación y los finales.** Tras Ozmaren descubres qué es la Marca y eliges destruir o absorber la brasa. Eso cambia diálogos en los actos 6 y 7 y el final después de Aun-Saar, el Dios Sediento: La Hoguera o La Corona de Ceniza.
- **70 armas legendarias** en 8 escalones (nivel 6 a 90), todas armas vivas. Cada jefe suelta la suya. Hay 7 conjuntos más el Legado GG de la familia (Rick, Steph, Sophie, Alana y Thor). Lo que no puedes usar todavía sale en rojo con "Requiere nivel X".
- **Nivel 100 y tres dificultades.** Normal, Pesadilla (monstruos hasta ~80, resistencias -40) e Infierno (hasta 100, resistencias -100). La siguiente se abre al terminar el acto 7.

## Qué falta o se puede mejorar

- Las bestias del motor ya están en los actos: lobos, jabalíes, arañas, escorpiones, gárgolas, murciélagos, gólems, perros de la Herida, demonios alados, la Madre del Pozo, la Boca de Arena y Varnhul, el dragón de huesos. La primera vez que entras a una zona nueva tarda unos segundos en cargar sus dibujos.
- Cofres de madera, hierro, malditos y relicarios que se abren con su animación, oro que cae en montones, haces de luz bajo el botín y salas de jefe con su tesoro. Íconos 3D en tienda y baúl.
- Al vencer el acto 5 se abren Pesadilla e Infierno desde la lista de héroes. No hay multijugador.
- Las partidas viven en el navegador donde se jugó (si se borran los datos del sitio se pierden).

## Para desarrollar

- `npm run juego` levanta el juego en http://localhost:5190.
- `npm run juego:hornear` vuelve a pintar todos los atlas (unos 12 minutos con 4 núcleos) en `juego/public/assets`.
- `npm run juego:build` y después `python3 juego/hornear/publicar.py` arman la página para publicar.
