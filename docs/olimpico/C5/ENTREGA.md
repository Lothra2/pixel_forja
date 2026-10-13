# Lote C5: las burlas por equipo
Estado: entregado, pendiente de Rick
PR: (se completa al abrirlo)
Fecha: 2026-10-13

## Qué se hizo

Un pack nuevo, `ngg_burlas`, con una burla por equipo. Cada atleta trae solo la de su equipo: `burla_<equipo>`. Todas sin bucle, a 8 fps, en las mismas 5 filas que `laugh` y `point`, con el evento `frase` en el cuadro del gesto fuerte.

| Equipo | Animación en el kit | Gesto del motor | Cuadros | `frase` | Qué hace |
|---|---|---|---|---|---|
| Familia GG | `burla_familia_gg` | `burla_pulgar` | 7 | 3 | Pulgar arriba a la altura del pecho, guiño y sonrisa. Amistoso |
| Instituto Nekketsu | `burla_instituto_nekketsu` | `burla_bruce_lee` | 8 | 4 | En guardia, el pulgar frente a la nariz con la cabeza que se sacude, y después la mano que llama "ven, pues" dos veces |
| Rồng Sài Gòn | `burla_rong_sai_gon` | `burla_dragon` | 8 | 5 | Puño en la palma, reverencia corta con los ojos cerrados y la garra del dragón con las dos manos, bien plantado |
| Rolos de Chapinero | `burla_rolos_de_chapinero` | `burla_risa_tapada` | 8 | 5 | Se tapa la boca riéndose, sacude los hombros y señala con el dedo |
| Panas de Caracas | `burla_panas_de_caracas` | `burla_salsa` | 8 | 1 | Llama con las dos manos y se echa el paso básico de salsa, con la cadera |
| Maracuchos del Lago | `burla_maracuchos_del_lago` | `burla_hombros` | 7 | 5 | Sacude los hombros, uno y otro, y abre los brazos: "¿y qué, primo?" |

**Motor, todo general:**
- **Formas de mano** (`pose.hands`): `pulgar`, `dedo`, `garra` y `palma`. Son uno o dos pixeles que salen del puño y van dentro del contorno del brazo, así el gesto cambia la silueta. Sirven para cualquier animación.
- **Las 6 burlas** en `anim/burlas.ts`, con nombre de gesto y no de equipo. Van con el movimiento premium (el pivote fijo y los eventos), como las `taunt_<id>`.
- **El evento `frase`**: el cuadro donde el juego pone el globo con la frase.
- **`alias` en `kit.config.json`**: el juego le pone su nombre a una animación del motor. El pack pide la del motor y en las hojas, el atlas y el manifiesto sale con el nombre del juego. Una animación puede tener varios alias, y sale una vez por cada uno.
- **Animaciones de un equipo**: si el nombre termina en `_<equipo>`, solo la trae el atleta de ese equipo. Es la misma regla que ya tenía `taunt_<id>` con su dueño. Así el pack pesa una animación por atleta y no seis.

## Cómo se usa (estudio y kit)

En el `kit.config.json` del juego (la copia de `docs/ejemplos/nekketsu/kit.config.json` ya lo tiene):

```jsonc
"packs": { ..., "ngg_burlas": ["burla_pulgar", "burla_bruce_lee", "burla_dragon", "burla_risa_tapada", "burla_salsa", "burla_hombros"] },
"alias": {
  "burla_familia_gg": "burla_pulgar",
  "burla_instituto_nekketsu": "burla_bruce_lee",
  "burla_rong_sai_gon": "burla_dragon",
  "burla_rolos_de_chapinero": "burla_risa_tapada",
  "burla_panas_de_caracas": "burla_salsa",
  "burla_maracuchos_del_lago": "burla_hombros"
},
"pruebas": { "crosscountry": [..., "ngg_burlas"], "azoteas": [..., "ngg_burlas"] }
```

**El juego:**
- Carga `atletas/<id>/ngg_burlas.json` como cualquier pack. Cada atleta trae una sola animación: `burla_<su equipo>`.
- Para burlarse: `play("burla_" + atleta.equipo)`. En el cuadro del evento `frase` pone el globo con la frase del equipo. Al terminar vuelve a `idle`.
- Las de antes siguen igual: `laugh`, `point`, `taunt` y las `taunt_<id>` de los 8 de la pelea. Nombres, anclas y formato de siempre.

## Pruebas

- **Prueba nueva `burlas.test.ts`, 5 casos:**
  - Las 6 son sin bucle, de 6 a 8 cuadros a 8 fps, sin limitar las vistas (las mismas filas que `laugh` y `point`), y con una sola `frase` en un cuadro distinto del de arranque.
  - La mano cambia la silueta: el pulgar suma pixeles arriba del puño y el dedo estira la caja hacia adelante.
  - Los 24 atletas, cada uno con la burla de su equipo, pasan el control de calidad en las 5 filas del juego, sin cuadros vacíos.
  - En el kit, el alias sale con el nombre del juego, cada atleta trae solo la de su equipo, con su `frase`, y el atlas nombra los cuadros con el alias.
  - Los alias mal puestos dan error claro: a una animación que no existe (con sugerencia), con el nombre de una del motor, o a una que no está en ningún pack. Una animación con dos alias sale dos veces.
- **`custom.test.ts`:**
  - El contrato del manifiesto: los 24 traen `burla_<su equipo>` en `ngg_burlas`, con su `frase`, y nadie trae la de otro equipo.
  - +24 PNG en el kit de Nekketsu (un atlas de burlas por atleta).
  - El esquema está regenerado. `packs` sigue aceptando solo animaciones del motor, así el editor sigue marcando los errores de tipeo.
- **Suite completa, `tsc`, build y e2e:** ver el PR.

## Para aprobar (todo en esta carpeta)

- `tablero_burlas.png`: los 24 atletas, cada uno con su burla completa de lado, agrupados por equipo. El cuadro de la `frase` va con raya roja arriba y abajo.
- `frase_5_filas.png`: el cuadro de la `frase` de los 24 en las 5 filas del juego (right, down_right, up_right, down, up). Una fila por equipo.
- `burlas.gif`: el primero de cada equipo se burla a la vez, de lado y de frente. En orden: Rick, Kenji, Minh, Andrés, Gabo y Ender.

## Decisiones que tomé sin preguntar

1. **El motor nombra el gesto y el juego pone el nombre del equipo con `alias`.** Los ids de equipo son del juego. Si el motor trajera `burla_familia_gg`, otro juego no podría usar el pulgar con guiño. `alias` es una capacidad nueva y general, y no cambia nada de lo que ya existe.
2. **El pack del `kit.config.json` pide las del motor y `alias` las renombra.** Primero probé a pedir el alias dentro del pack, pero el esquema tenía que aceptar cualquier nombre y el editor dejaba de marcar los errores de tipeo (`"wlak"` en vez de `"walk"`). Así el esquema queda igual de estricto.
3. **La animación de un equipo se reconoce por el final `_<equipo>`,** la misma regla de `taunt_<id>`. No hizo falta un campo nuevo.
4. **El Bruce Lee no toca la nariz.** A 48 px la cabeza chibi es más grande que el brazo y la mano no llega a la cara. La mano sube frente a la cara con el pulgar arriba y la cabeza da el sacudón. Se lee como el gesto, no como frotarse la nariz. Si no convence, se cambia por "se limpia el hombro" con la misma idea de desprecio.
5. **La `frase` de la salsa va en el cuadro 1,** el primer "¡ven!" con las dos manos, que es el gesto fuerte. El paso de salsa viene después, ya con el globo puesto.
6. **El guiño de la Familia se ve de frente y en diagonal.** De lado la cara va de perfil y lo que se lee es el pulgar.
7. **Sumé `ngg_burlas` a las pruebas `crosscountry` y `azoteas`,** que son las que tienen pelea.

## Límites honestos

- **Las manos son de 3 px.** El pulgar, el dedo y la garra son uno o dos pixeles. Se leen por la silueta del brazo y el contraste del contorno, no por los dedos.
- **De espalda (`up`) no se ve el gesto:** el cuerpo lo tapa. Se ven los brazos y el ritmo. Es igual en `laugh` y `point`.
- **El paso de salsa es corto.** Abre las piernas y mueve la cadera en 4 cuadros. No avanza: el atleta se queda en su sitio.
- **No están en el estudio todavía.** Salen en el kit, en las pruebas y en el catálogo de animaciones, pero el estudio no tiene una página de burlas por equipo.

## Lo que necesita el siguiente lote

- **El juego:**
  - Copiar `ngg_burlas`, `alias` y las dos pruebas del `kit.config.json` de ejemplo.
  - Tocar `burla_<equipo>` y poner el globo en el evento `frase`.
- **Siguiente lote del orden: C7c,** el perro con `pounce` y `wake`, y el gato con `jump_wall` medido (`subida`, `muro_min` y `muro_max`).
- **Dependencia:** esta rama sale de `main`.
