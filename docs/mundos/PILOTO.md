# Piloto: el Bosque Profundo premium

Láminas: `piloto_bosque_profundo_x2.png` (la pantalla entera, antes y después) y `piloto_bosque_profundo_x4.png`
(la meseta, la rampa y el sendero a zoom 4).

El piloto solo cambia el rectángulo del Bosque Profundo (cuadros 2 a 30 de ancho, 29 a 47 de alto). El resto del
Bosque y la Catedral salen idénticos: hay una prueba que compara pixel por pixel, la colisión, los objetos y las
entidades de afuera (`premiumWorld.test.ts`).

## Las 7 reglas de realismo

| Regla | Cómo se cumple | Estado |
|---|---|---|
| 1. Una sola luz, de arriba a la izquierda | Los árboles nuevos, los grupos y las calcomanías se pintan con la luz arriba a la izquierda. Las sombras horneadas caen todas abajo a la derecha (hay una prueba que lo revisa en cada objeto con sombra) | Cumple |
| 2. Rampas con cambio de tono | Las rampas de los árboles, la corteza, el musgo y la roca enfrían las sombras hacia azul y calientan las luces. La sombra horneada oscurece hacia azul, no hacia negro ni gris | Cumple |
| 3. Oclusión ambiental | Sombra de contacto de 1 a 3 px al pie de cada objeto nuevo, franja oscura debajo de las raíces, sombra al pie del acantilado | Cumple |
| 4. Materiales que se leen | Veta y raíces en la corteza, grietas, estratos y musgo en la roca del acantilado, reflejo en los charquitos, pisadas en la rampa | Cumple en lo nuevo. El suelo de pasto sigue siendo el de antes (ruido fino) |
| 5. Perspectiva atmosférica | No aplica en el piloto: el Bosque Profundo no tiene barrancos ni fondo lejano. Se usa en la Catedral (fondo de abismo) y en el Puente Colgante del Mundo 3 | Pendiente para la Catedral |
| 6. Desgaste y uso | Sendero gastado (más claro al centro, piedritas sueltas en el borde), raíces que cuelgan del acantilado, grietas en el suelo, hojarasca | Cumple |
| 7. Escala coherente | Árboles de 116, 146 y 182 px según la edad (la heroína mide 44). Grupos de rocas y troncos a la medida de la heroína | Cumple |

## Segunda vuelta: nada montado

Rick vio la primera versión y dijo que había muchas cosas montadas. Tenía razón: copas apiladas, hongos gigantes y
árboles hechizados pegados al acantilado, ramas de primer plano encima de las copas y una rampa que parecía una caja.
Ahora todo lo que se para en el piso se coloca con un solo motor (`premium/zone.ts`) que mira la forma real de cada
dibujo en celdas de 4 px:

- El pie de un objeto nunca queda tapado y su cuerpo nunca tapa el pie de otro.
- Dos cuerpos se pisan como mucho un 12 % del más chico (las copas se rozan, los troncos se ven).
- Nada tapa la cara del acantilado ni la rampa. Lo de abajo no se mete arriba de la meseta.
- Lo de arriba de la meseta queda a 12 px del borde y su sombra cae casi toda sobre la meseta.
- La subida queda libre: la rampa, la entrada a la meseta y el pie de la rampa no tienen nada sólido.
- Los árboles se juntan en bosquecillos con claros entre medio (un ruido grande decide dónde), no salpicados parejo.
- Los lugares (hongos gigantes, árboles hechizados, árbol seco) son pocos y repartidos: a 7 cuadros de otro de su
  familia.
- El monte bajo (helechos, arbustos, pocos hongos) va al pie de los árboles, nunca suelto en el medio de la nada.
- Las calcomanías no se pisan entre ellas y no quedan escondidas debajo de un cuerpo.

Además:
- **Rampa nueva:** angosta arriba y ancha abajo, con taludes a los costados (el izquierdo con luz, el derecho en
  sombra), el pasto de la meseta que cuelga arriba sin canto oscuro, pisadas suaves y un abanico de tierra al pie
  que se junta con el sendero.
- **Suelo calmo:** menos hojarasca adentro de la zona (el detalle lo ponen las calcomanías) y un filtro que limpia los
  pixeles sueltos del pasto. El pasto de arriba de la meseta sube un tono en vez de dos.
- **Primer plano fuera del mapa:** las ramas y hojas de adelante ya no van ubicadas en el mapa. La zona las declara
  (`frente`) y el juego las pega a los bordes de la pantalla.
- **Todo con sombra:** los hongos gigantes, árboles hechizados y secos, arbustos, hongos y piedras de la zona usan su
  copia con sombra horneada (`_p`), así no hay objetos con sombra larga al lado de otros sin sombra.

Pruebas nuevas en `premiumWorld.test.ts`: nada montado (pies, solapes, acantilado y rampa) y primer plano fuera del
mapa. La prueba de que todo se alcanza caminando (`world2.test.ts`) cubre la subida a la meseta.

## Lo que trae

- **Relieve:** una meseta con su cara de acantilado (pasto que cuelga, roca con estratos y musgo, raíces que cuelgan,
  sombra al pie) y una rampa de tierra con pisadas para subir. Arriba de la meseta el pasto es más claro porque le
  llega más luz.
- **Árboles:** robles y pinos en 3 tamaños y 3 formas de copa (18 árboles nuevos). Nunca dos iguales a menos de 3
  cuadros. Primero los de la meseta, después los grandes y al final los chicos rellenan.
- **Puntos focales:** un grupo armado por pantalla (tronco caído con hongos y flores, rocas con musgo y helechos,
  raíces grandes, arbusto con flores), además de los hongos gigantes y los árboles hechizados.
- **Calcomanías:** 9 por pantalla (hojas caídas, raíces, grietas, charquitos, flores y piedritas).
- **Primer plano:** ramas y hojas de adelante declaradas por la zona, para los bordes de la pantalla.
- **Sombras horneadas:** cada objeto nuevo que se para en el piso trae `<id>_sombra.png`.

## Lo que no quedó y por qué

- **Altura 2 (mesetas sobre mesetas):** el pintor sabe una altura (0 o 1). La altura 2 hace falta para la nave de la
  Catedral y Las Alturas: va en la tanda del resto de los mundos.
- **Autotile de 47 casos:** el juego no usa cuadros repetidos sino el suelo pintado entero en trozos, así que el
  acantilado lo dibuja el pintor directamente. No hace falta un autotile.
- **Árboles hechizados y secos en 9 variantes:** quedaron los 5 que había. Son pocos y cada uno es un personaje
  (tienen cara y animaciones propias).
- **El agua (orilla con espuma y reflejo):** el Bosque Profundo no tiene agua adentro del rectángulo. Va con el resto.
- **El borde de la zona:** afuera del rectángulo sigue el bosque viejo (más tupido y con más hojarasca). Se nota
  en los costados de la postal. Se resuelve cuando la zona de al lado pase a premium.
