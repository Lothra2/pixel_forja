# Mundo 3: Las Galerías del Eco

Láminas: `galerias_mapa.png` (el mapa entero a la mitad), `galerias_postales.png` (las 7 postales a tamaño real),
`galerias_objetos.png` (los objetos sobre su suelo de cueva, x2) y `galerias_enemigos.png` (la Polilla Reina, la polilla de ceniza, el minero
de piedra y la sombra, mirando abajo a la derecha).

Minas de cristal abandonadas debajo de la Catedral. Mucho más oscuro que lo anterior. La luz es el progreso: los
cristales se prenden al pegarles y quedan prendidos (las reglas están en `src/logic/abismo.ts` del juego).

## El mapa (`mundo3_galerias`, 100 x 80)

Es un interior como la Catedral, pero de cuevas: el piso sale de una grilla por cuadro (salas con borde que respira,
túneles y recovecos) y el pintor le pone pared de roca orgánica (`cave` en el diseño del pintor). Lo que no se alcanza
desde la llegada se vuelve roca. El techo de las paredes es piedra oscura y quieta con algún cristal metido.

El camino principal baja así:

1. **La Boca de la Mina.** Se llega por el portal rojo (y se vuelve a la Catedral por `portal_volver`). Primer farol
   de minero y el primer cristal cerca, para enseñar a prenderlo. El marco de madera donde empieza la mina.
2. **Los Rieles.** Una galería larga con la vía que se corta en lo oscuro (un tramo arrancado y después nada), marcos
   de madera, cajones y barriles. Polilla de ceniza y minero de piedra.
3. **La Sala del Eco.** La sala más grande. Segundo farol. Cristales enormes en el techo (primer plano).
4. **El Puente Colgante.** Una caverna partida por el abismo: el puente de tablas (`puente_colgante_h`, 20 tablas)
   cruza de este a oeste, con sus postes. Debajo va el fondo de abismo en tonos de mina (`fondo_mina_0..2`). La
   figura de los ojos rojos mira desde la otra punta.
5. **El Lago de Cristal.** Agua quieta (capa `reflejo`) con cristales en la orilla que se reflejan.
6. **El Campamento Abandonado.** Dos carpas, la olla fría, el tercer farol (el último antes del jefe), pistas de los
   mineros que huyeron.
7. **La Cueva de la Reina.** La arena con los 4 cristales grandes alrededor del jefe.

**Ramas que vuelven al camino (4):** la vía muerta debajo de los rieles, la orilla norte del lago, el desvío alto del
campamento y el atajo del carrito (del lago a los rieles). La prueba tapa el medio de cada una y revisa que lo
importante se siga alcanzando.

**Secretos para el olfato de Thor (2):** la Veta Escondida (arriba de los rieles, por una grieta) y el Nicho del
Minero (arriba del campamento, con el tercer pedazo del mural). Cada uno con su cofre dorado (`secreto`, `pista`) y
su zona `secreto`.

**Contenido:** 3 faroles de minero (`punto_guardado` con `farol: true`), 9 cofres, 42 cristales chicos (de los tres
colores) y 4 grandes, una postal por zona, utilería con el motor de nada montado y calcomanías en cada pantalla.

### Capas nuevas

- **`cristales`** (capa de objetos): cada punto es el pie de un cristal, con `id`, `color` (cian, violeta, ambar),
  `forma` (0 cian, 1 violeta, 2 ámbar: forma y color van juntos) y `grande`. Arrancan apagados y los dibuja el juego
  según su estado (`cristal_apagado_<forma>`, `cristal_prendido_<forma>` con su anim `prenderse`,
  `cristal_grande_apagado` y `cristal_grande_prendido`). Su base es sólida (14 x 6, los grandes 30 x 10) y siempre
  tienen un lado libre para pegarles. Ningún cristal ni mueble corta un túnel.
- Entidades nuevas: `carrito` (el atajo: `ruta` en cuadros "x,y;x,y", `empuja: thor`), `figura` (la de los ojos
  rojos, con `id`), `mural` (`pieza: 3`) y los enemigos `polilla_ceniza`, `minero_piedra` y `sombra`. El jefe es
  `polilla_reina` y el portal de salida va a `mundo4`.

## Objetos (3.2)

Todos los del encargo a su medida (la prueba lo revisa), más la utilería de la mina: `roca_mina_0..2`, `cajon_mina`,
`barril_mina`, `olla_fria`, `poste_puente`; calcomanías `grava_mina_0..2`, `astillas_0..1` y
`esquirlas_cristal_0..2`; los fondos `fondo_mina_0..2` (512, pegan por los 4 lados: vetas de roca lejana, bruma azul y
las brasas frías) y `cristales_techo_frente_0..1` (primer plano de la Sala del Eco).

## Enemigos y jefe (3.3 y 3.4)

Con el motor de volúmenes de los jefes (las mismas 8 direcciones y el pivote medido):

- `polilla_ceniza` (48): vuela, alas con ojos falsos y polvo que cae. Al morir cae plegando las alas.
- `minero_piedra` (64): gólem de roca con casco de minero, lámpara y un cristal cian en el pecho. Pega con un pico.
  El golpe fuerte avisa 4 cuadros.
- `sombra` (48): silueta encapuchada casi negra con contorno violeta de 1 px por fuera. Al morir se deshace.
- `sombra_ojos` (16 x 8, criatura): lo que se ve de la sombra fuera de la luz. Parpadeo de 4 cuadros a 3 fps.
- `polilla_reina` (128): `idle` volando, `walk`, `attack` (aletazo que empuja), `attack_heavy` (sube, aviso de 5
  cuadros temblando y lluvia de polvo), `warcry` (llama a las polillas), `hit`, `die` (se posa y se libera: las alas
  pasan de gris y violeta a ámbar, cian y rosa) y `aturdida` (posada en el piso, alas caídas).
- Avisos: `aviso_polvo` (96 x 96, 8 cuadros, va en el piso) y `nube_polvo` (96 x 96, 10 cuadros a 12 fps).

Las polillas traen `vuela: true` en el manifiesto: el pivote es el punto del piso debajo de ellas (donde va la sombra).

## Audio (3.5)

`musica_galerias` (90 s justos en bucle), `musica_jefe_polilla` (aleteo en la percusión), `ambiente_galerias` y
`ambiente_eco` (12 s en bucle), y los efectos `cristal_prender`, `cristal_apagar`, `polilla_aleteo`, `minero_golpe`,
`sombra_aparece`, `carrito_rodar` (3 s en bucle) y `figura_irse`. Todo con pico de 0.5 y nada que asuste de golpe.
Los sonidos que ya estaban salen idénticos byte a byte.

## Lo que no hice y por qué

- **Sin animación `walk` de patas para las polillas:** vuelan siempre, así que `walk` es volar hacia adelante.
- **El minero de piedra reusa las poses del minotauro** (mismo esqueleto). Se mueve pesado y lento como pide el
  encargo, pero no tiene poses propias.
- **El carrito y la figura los mueve el juego:** el kit trae el sprite, la ruta del atajo y el lugar donde se asoma la
  figura. Cuándo aparece y cómo se va lo decide `src/logic/abismo.ts`.
