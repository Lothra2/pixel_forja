# Ficha de arte: caracas_azotea

AZOTEA DE PARQUE CENTRAL. Estilo `venezuela_ciudad`, hora `noche`.

## Paleta: 24 colores

Cada pixel del escenario sale de aquí. La prueba 8 lo revisa.

| Color | Hex | Para qué |
|---|---|---|
| `tinta` | `#0e0b18` | contorno, lo más oscuro, la franja negra del borde |
| `sombra` | `#1f1a30` | sombras hondas, edificios de lejos, rejas |
| `asfalto` | `#332d48` | concreto en sombra, juntas de las losas, edificios |
| `asfalto_claro` | `#4f4866` | losa mojada, metal de las antenas |
| `cemento` | `#686180` | losa de la azotea, paredes de la caseta |
| `cemento_claro` | `#8a83a0` | concreto con luz, tanques, el canto del murito |
| `crema` | `#b6aec6` | pared bajo el bombillo, brillos del concreto |
| `luz` | `#fff4dc` | el corazón de los neones, la Cruz del Ávila, bombillos |
| `amarillo` | `#ffd23c` | ventanas prendidas, la franja amarilla del borde, la bandera |
| `ocre` | `#e8902c` | ventanas tibias, lucecitas de los cerros |
| `terracota` | `#9c5434` | tubos oxidados |
| `rojo` | `#ef2d3c` | luces rojas de las torres y las antenas, la bandera |
| `vino` | `#6c2240` | sombra del óxido |
| `salmon` | `#ff4aa6` | el neón rosado de AREPERA LA CHAMA y su reflejo |
| `menta` | `#38e6e4` | el neón turquesa de CARACAS y su reflejo |
| `verde` | `#2c5446` | las laderas del Ávila con la luz de la luna |
| `verde_oscuro` | `#172a2c` | El Ávila en sombra |
| `celeste` | `#3f6cc4` | el haz del reflector, brillo del cielo, la tele prendida |
| `cielo` | `#26356e` | cielo bajo, nubes con luna |
| `azul` | `#18245a` | cielo del medio, el azul de la bandera |
| `azul_noche` | `#10173a` | cielo alto |
| `canal` | `#8a3cc0` | violeta del reflejo del neón en el piso mojado |
| `oro` | `#ffac2a` | ventanas, faroles de la ciudad |
| `bruma` | `#3a4478` | el resplandor de la ciudad en el cielo |

## Elementos icónicos (12)

| Elemento | Dónde va |
|---|---|
| El Ávila de noche, con la luna en las laderas | lejos |
| La Cruz del Ávila encendida en el pico | lejos |
| Los cerros llenos de lucecitas y la ciudad encendida abajo | lejos y cerca |
| Las dos torres de Parque Central con sus ventanas y la luz roja arriba | cerca, x 74 a 260 |
| El público en las azoteas vecinas, con banderitas y celulares | cerca, entre las torres y al lado de la caseta |
| El neón rosado de AREPERA LA CHAMA con la arepa | cerca, sobre la caseta |
| El neón turquesa de CARACAS con El Ávila y la Cruz | cerca, sobre la caseta |
| La caseta de la escalera: puerta de lámina, bombillos, CARACAS ES BELLA y la escalerita al techo | cerca, x 392 a 606 |
| Los tanques de agua en sus patas, con el tubo oxidado | cerca, a la izquierda |
| Las antenas de celosía con los paneles y la luz roja | postes antena y el techo de la caseta |
| El borde sin baranda con la franja amarilla y negra, y la ciudad allá abajo | el hueco vacío del final y el piso |
| Las losas mojadas que reflejan el neón | piso |

## Vida (6)

- `letreros_neon`: Los dos neones prendidos, y LA CHAMA (o El Ávila del letrero) que parpadea: 4 cuadros.
- `luces_ciudad`: Las luces rojas de las torres que prenden y apagan, y el tráfico que corre allá abajo pasando el borde.
- `avion_lejos`: Un avioncito con las luces de las alas que parpadean, cruzando alto en la capa lejos.
- `helicoptero_reflector`: El helicóptero con el reflector que barre hacia abajo, cruzando delante del Ávila (capa lejos).
- `publico`: El público de las azoteas vecinas levanta los brazos, las banderas y los celulares: 2 cuadros.
- `fuegos_artificiales`: Fuegos artificiales sobre la ciudad al final (partículas).

## Cada caja del layout

El dibujo calza con la caja: el techo mide `d` filas y el frente `z` filas. Nada cambia de lugar ni de alto.

| Tipo | Medida | Cuántas | Dibujo |
|---|---|---|---|

## Letreros

Texto real y corto, con los acentos: "AREPERA LA CHAMA", "CARACAS", "CARACAS ES BELLA".
