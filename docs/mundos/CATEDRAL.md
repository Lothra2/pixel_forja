# La Catedral premium (Mundo 2 entero)

Láminas: `catedral_antes_despues.png` (antes a la izquierda, después a la derecha), `catedral_postales.png` (las 7
postales) y `catedral_objetos.png` (los objetos nuevos).

## Qué cambió

- **Sin huecos negros (2.6).** Más allá del canto del techo de los muros no hay suelo: el juego dibuja ahí los tres
  fondos de abismo (`fondo_abismo_0..2`, 512 x 512, pegan por los 4 lados, `capa: "fondo"`) con paralaje 0.6, 0.75 y
  0.9. El 0 son arcadas lejanas en azul muy oscuro (perspectiva atmosférica: poco contraste), el 1 niebla y el 2
  chispas turquesa. Ahora la Catedral cuelga sobre un abismo. El mapa los declara en su propiedad `fondo` y el
  manifiesto del mundo en `fondo: [{ objeto, paralaje }]`.
- **Muros de ladrillo (2.3).** Las caras de los muros se pintan con 15 cuadros de 32 x 32: `ladrillo_0..5`,
  `ladrillo_musgo_0..2`, `ladrillo_roto_0..2` y `ladrillo_raiz_0..2` (también van en el kit). Cada ladrillo tiene su
  tono, canto con luz arriba a la izquierda, esquinas gastadas, y al pie del muro la oclusión.
- **La nave a dos alturas (2.1 y 2.8).** Una galería alta al este de la nave, con su desnivel de piedra labrada
  (sillares, canto moldurado) y baranda arriba, y `escalones_rotos` (96 x 64) para bajar. El río se corrió un poco al
  sur para dejar orilla debajo de la galería. El descanso de la escalera hundida también ganó la piedra labrada y la
  baranda.
- **Vitrales (2.6).** `vitral_0..2` (48 x 96: ámbar, rosa y turquesa) en las caras de arriba de las salas, cada uno
  con su charco de luz en el piso (`luz_vitral_0..2`, 96 x 64, capa suelo, con luz de su color) y uno de cada dos con
  `haz_polvo` (64 x 192, 6 cuadros a 6 fps).
- **Mobiliario roto (2.3)** con el mismo motor del Bosque (nada montado): `banca_rota` (64 x 40, sólida),
  `candelabro_pie` (32 x 64, sólido, luz ámbar de 90 que tiembla, con `apagada` y `prender`),
  `estatua_santo_rota` (48 x 96, sólida) y `libros_tirados` (capa suelo). Todos con sombra horneada.
- **Calcomanías de losa (2.2):** `musgo_losa_0..3`, `grieta_losa_0..3`, `escombro_chico_0..2`, `cera_derretida_0..1`
  y `charco_negro_0..1` (este último solo en lo oscuro). Al menos 6 por pantalla con piso, y un punto focal en cada
  una.
- **Primer plano (2.5):** `frente_columna` (64 x 256) y `frente_raices_colgantes` (128 x 160, 4 cuadros a 4 fps). Cada
  zona los declara en su propiedad `frente`.

## Lo que no se movió

Las entidades (inicio, portales, refugio, pedestal, braseros, compuertas, cofres, enemigos, la forja, la campana y la
arena del jefe) se ubican igual que antes. La arena del jefe, las compuertas y el agua peligrosa quedan libres de
muebles. Al final se revisa que nada nuevo tape un paso.

## Lo que no quedó y por qué

- **El agua:** la espuma de orilla y el reflejo (el pozo del atrio) son los mismos del Bosque: ver `BOSQUE.md`.
- **Altura 2 (una meseta encima de otra):** no hizo falta. La nave a dos alturas sale con un descanso alto adentro de
  la sala, que es lo que ya usaba la escalera hundida.
