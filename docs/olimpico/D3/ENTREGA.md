# Lote D3: los vehículos a escala de atleta
Estado: entregado, pendiente de Rick
PR: (se llena al abrirlo)
Fecha: 2026-10-15

## Qué se hizo

Las motos y el xích lô ahora traen gente del alto de un atleta. Antes los conductores medían 12 px y tuviste que poner los vehículos al doble, con el pixel grueso. Ahora salen a escala 1, con el pixel fino.

| | Antes | Ahora |
|---|---|---|
| Conductor de la moto | 12 px, un muñequito | Una persona del motor, la misma de los atletas: unos 40 parada, 35 sentada del asiento a la coronilla |
| Moto | 26 de largo | **52 de largo**, la moto de paso bajo de Saigón: escudo de piernas, faro en el manubrio, piso para los pies, asiento largo, parrilla y escape |
| Xích lô | 34 de largo, con dos muñequitos | **68 de largo**: la pasajera recostada bajo la capota y el chofer con su nón lá pedaleando atrás |
| Cuadro de la moto | 44 × 34 | 84 × 70 |
| Cuadro del xích lô | 56 × 40 | 104 × 84 |

**Lo que no cambia:**
- El `ancla` sigue siendo la esquina de atrás a la izquierda de la huella, en el piso.
- `mira` sigue en `izquierda`.
- Las mismas animaciones con los mismos cuadros: la moto `andando` (4), `frenando` (3) y `corneta` (4), y el xích lô `andando` (4).
- Los mismos ids y archivos: no suman archivos.

**Las animaciones:**
- `andando`: el conductor rebota y sale humito del escape.
- `frenando`: el conductor se va adelante, la trompa baja, se prende la luz de freno y sale el polvo de la rueda.
- `corneta`: pita con el brazo de atrás arriba, la boca abierta reclamando y las rayitas del pito delante.
- El xích lô: el chofer pedalea y las ruedas giran.

**El casco** de cada motorizado es del color de su moto.

### Cómo lo hice
- **El conductor es una persona del motor,** dibujada como un atleta de 48: mismo tamaño y mismo pixel que las niñas. Se sienta en la moto con una pose (los muslos adelante, los pies en el piso de la moto y las manos al manubrio) y se espeja para que mire a la izquierda.
- **No se recorta a la celda de 48:** sentado en un vehículo alto, los pies y la cabeza no caben. Se pega por la cadera al asiento, desde el cuadro grande del motor.

## Cómo se usa (estudio y kit)

**En el kit:** igual que antes, `"vehiculos": true` o la lista de ids. Salen en `vehiculos/<id>.png` con su `ancla`, `huella`, `anims` y `mira`.

**Lo que tiene que conectar el juego:**
- **Quita el doble** que les pusiste: ahora van a escala 1, como los atletas.
- Si los pones con el `ancla` del manifiesto, no tienes que cambiar nada más. El número del ancla dentro del cuadro cambió, porque el cuadro es más grande, pero sigue cayendo en la misma esquina de la huella.
- Si en algún lado tenías el ancla escrita a mano ([8, 28] la moto, [8, 33] el xích lô), cámbiala por la del manifiesto: [14, 54] y [14, 62].

## Pruebas

- **Prueba nueva `d3.test.ts`, 4 casos:**
  - La moto mide 52 de largo y el xích lô 68, con el ancla en la esquina y mirando a la izquierda.
  - **La moto con su conductor y el xích lô llegan más arriba que Rick parado** (un atleta de 48 mide 44), y nada se sale del cuadro.
  - Las 4 motos tienen colores distintos y el conductor rebota al andar.
  - Los 4 cuadros del xích lô son distintos: pedalea.
- **`vehiculos.test.ts`:** las de siempre pasan: el contorno del motor en cada cuadro, las animaciones, el ferry. La imagen dorada `golden/vehiculos_d2.png` está regenerada: el ferry, el thúng chai, el metrocable, los jacintos y la fruta salen igual, y cambian las motos y el xích lô.
- **La suite completa, `custom.test.ts`, el build y el e2e:** VERIF.

## Para aprobar (todo en esta carpeta)

- **`antes_y_despues.png`:** arriba la moto y el xích lô de antes, abajo los nuevos, los dos al lado de Rick y Alana parados.
- **`moto_andando.gif`, `moto_frenando.gif`, `moto_corneta.gif`:** la moto azul con Rick parado al lado.
- **`xich_lo_andando.gif`:** el xích lô pedaleando.

Qué mirar: que ya no se vean de juguete al lado de las niñas, y que la moto se lea como una de Saigón.

## Decisiones que tomé sin preguntar

1. **El conductor es una persona del motor** y no un muñequito más grande. Así tiene el mismo pixel y las mismas proporciones chibi que los atletas.
2. **La moto es de paso bajo** (la Honda Wave o la Dream de Saigón), con los pies en el piso de la moto, y no una de carreras.
3. **El ferry, el thúng chai y el metrocable quedaron como estaban.** No estaban en tu mensaje. El remero del thúng chai sigue siendo chiquito: si lo quieres a escala, va en otro lote.
4. **La pasajera del xích lô va recostada,** con las manos en las piernas, sonriendo.

## Límites honestos

- **La vista es la inclinada de siempre:** los vehículos se ven de lado con la cara izquierda. Si un vehículo va hacia la derecha, el espejo no sirve, igual que antes.
- **Las manos del conductor** no siempre tocan el manubrio: los brazos chibi son cortos, y en algunos cuadros quedan a un par de pixeles.
- **La gente de los vehículos es fija:** siempre el mismo motorizado (con el color de la moto) y la misma pareja en el xích lô. Si quieres variar las caras, se puede pasar una ficha en otro lote.
- **Los cuadros son más grandes:** la moto ocupa 84 × 70. Si tenías la hitbox a mano, ajústala a la huella del manifiesto.

## Lo que necesita el siguiente lote

- **El juego:** quitar el doble, poner los vehículos con su `ancla` y ajustar la hitbox a la `huella`.
- **Si quieres el thúng chai y el ferry con gente a escala,** dímelo y van en otro lote.
