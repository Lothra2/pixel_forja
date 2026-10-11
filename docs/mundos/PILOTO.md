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

## Lo que trae

- **Relieve:** una meseta con su cara de acantilado (pasto que cuelga, roca con estratos y musgo, raíces que cuelgan,
  sombra al pie) y una rampa de tierra con pisadas para subir. Arriba de la meseta el pasto es más claro porque le
  llega más luz.
- **Árboles:** robles y pinos en 3 tamaños y 3 formas de copa (18 árboles nuevos). Nunca dos iguales a menos de 3
  cuadros. Los viejos donde el bosque es más cerrado, los jóvenes en el borde.
- **Puntos focales:** un grupo armado por pantalla (tronco caído con hongos y flores, rocas con musgo y helechos,
  raíces grandes, arbusto con flores), además de los hongos gigantes que ya estaban.
- **Calcomanías:** 9 por pantalla (hojas caídas, raíces, grietas, charquitos, flores y piedritas).
- **Primer plano:** ramas que cuelgan sobre la parte más cerrada del bosque de cada pantalla (`capa: frente`).
- **Sombras horneadas:** cada objeto nuevo que se para en el piso trae `<id>_sombra.png`.

## Lo que no quedó y por qué

- **Altura 2 (mesetas sobre mesetas):** el pintor sabe una altura (0 o 1). La altura 2 hace falta para la nave de la
  Catedral y Las Alturas: va en la tanda del resto de los mundos.
- **Autotile de 47 casos:** el juego no usa cuadros repetidos sino el suelo pintado entero en trozos, así que el
  acantilado lo dibuja el pintor directamente. No hace falta un autotile.
- **Árboles hechizados y secos en 9 variantes:** quedaron los 5 que había. Son pocos y cada uno es un personaje
  (tienen cara y animaciones propias).
- **El agua (orilla con espuma y reflejo):** el Bosque Profundo no tiene agua adentro del rectángulo. Va con el resto.
- **Primer plano en la postal:** la postal es una foto quieta, así que las ramas de adelante se ven como copas
  oscuras. En el juego se mueven con paralaje y se transparentan cuando la heroína pasa por debajo.
