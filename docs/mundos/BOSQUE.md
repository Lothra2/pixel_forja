# El Bosque premium (Mundo 1 entero)

Láminas: `bosque_antes_despues.png` (el mapa entero, antes a la izquierda y después a la derecha) y
`bosque_postales.png` (las 13 postales del Bosque). El piloto del Bosque Profundo sigue en `PILOTO.md`.

## Cómo se armó

El mismo motor del piloto (`src/engine/world/premium/zone.ts`), ahora para el mundo entero:

1. **Una sola pintura del terreno** para todo el mapa, con la meseta y la rampa del piloto. No hay costuras entre
   zonas.
2. **Se respeta el diseño del mundo.** La densidad de bosque que usaba el generador decide dónde va bosque y dónde
   pradera. Lo que el diseño deja libre a propósito (claros de los lugares, puentes, vado, el camino secreto al
   Claro Escondido) no se planta.
3. **Dos maneras de plantar:**
   - En el interior de las masas cerradas, **dosel**: filas escalonadas, por manchas de una especie y un tamaño, con
     la forma cambiando de vecino a vecino. Ahí las copas se tapan el tronco entre ellas (hasta la mitad), como un
     bosque visto desde arriba.
   - En los bordes y en todo lo que se camina, **reglas estrictas**: el pie siempre se ve, dos cuerpos se pisan como
     mucho un 12 %, nada tapa acantilados ni rampas, bosquecillos y claros.
4. **Los lugares de vegetación se mudan cerca de donde estaban**, con su sombra: árboles hechizados y secos, sauces,
   hongos gigantes, robles de otoño, tocones, troncos y rocas (83 mudados).
5. **Un punto focal y al menos 6 calcomanías en cada pantalla** (las 50 pantallas). Los grupos focales no se arriman
   a lo que el diseño puso a mano (campamentos, granja, ruinas). Los charquitos solo van en el bosque oscuro.
6. **Todo se sigue alcanzando:** al final se revisa que cada cofre, enemigo, cartel y portal se alcance caminando
   desde el inicio. Si algo tapara el paso, se quita (esta vez no hizo falta quitar nada).
7. **Suelo:** oscuro solo bajo las copas (un claro del bosque oscuro ya no queda negro), caminos gastados, raíces
   que cuelgan de todos los acantilados, pasto de las mesetas un tono más claro y piso sin pixeles sueltos.

## Lo que no se movió

Todo lo que no es vegetación queda exactamente donde estaba (hay una prueba que lo revisa uno por uno): el Abuelo
Roble, las ruinas y la estatua, el campamento goblin, la granja, la arena del minotauro, los puentes, el vado, la
cascada, los carteles, las fogatas, los cofres, los rompibles y los enemigos. Los arbustos donde viven los ojos y
los arbustos de espinas se quedan en su lugar (con su sombra).

## El Anillo hundido y el agua

- **El Anillo de las Hadas hundido un nivel (2.8):** el pintor sabe hacer hundidos (`pits` en el diseño): cara de roca
  debajo del borde norte, paredes angostas a los lados, piso más oscuro pegado a las paredes, canto en el borde sur y
  una bajada de tierra donde llega el sendero. El borde no se pasa salvo por la bajada. El cofre secreto del Anillo
  quedó adentro del hundido.
- **Espuma de orilla (2.7):** 4 cuadros a 5 fps. En vez de un autotile de 16 bordes rectos, cada cuadro de orilla
  trae su pieza pintada sobre la orilla real, que es orgánica. El atlas es `mundo/<mapa>_espuma.png` y el mapa trae la
  capa `espuma` (0 nada, n = pieza n - 1). El juego la dibuja encima del suelo.
- **Reflejo (2.7):** capa `reflejo` por cuadro: 1 donde el agua está quieta (los lagos). El río no refleja.

## Lo que no quedó y por qué

- **Dos sauces sin lugar:** a la orilla no había dónde ponerlos sin pisar otra cosa. No se encajan a la fuerza.
- **Altura 2 completa (una meseta encima de otra):** no hizo falta para ninguna zona. El hundido y los descansos
  resuelven el Anillo y la nave de la Catedral.
- **Primer plano en la postal:** las postales son fotos quietas sin primer plano, porque el juego lo pega a los
  bordes de la pantalla.
