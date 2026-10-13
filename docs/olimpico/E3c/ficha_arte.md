# Ficha de arte: hoian

HỘI AN. Estilo `vietnam_hoian`, hora `noche`.

## Paleta: 24 colores

Cada pixel del escenario sale de aquí. La prueba 8 lo revisa.

| Color | Hex | Para qué |
|---|---|---|
| `tinta` | `#140c16` | contorno, lo más oscuro |
| `sombra` | `#2c1a22` | madera oscura de puertas y columnas, sombras hondas |
| `asfalto` | `#4a3230` | juntas de la piedra, madera en sombra, la cara de las tejas |
| `asfalto_claro` | `#6c5042` | piedra en sombra, tablas del muelle |
| `cemento` | `#917058` | piedra de la calle |
| `cemento_claro` | `#bc946c` | piedra con la luz de los faroles, el muelle encendido |
| `crema` | `#f2c886` | pared amarilla bajo el farol, brillos |
| `luz` | `#fff1c4` | el corazón de los faroles y las velitas, la luna llena |
| `amarillo` | `#e6b23e` | el amarillo de las casas de Hội An |
| `ocre` | `#ad7a2a` | sombra del amarillo, bambú del Tama-wari |
| `terracota` | `#8c4630` | tejas de barro, madera rojiza |
| `rojo` | `#e2382a` | faroles rojos, el puente japonés, cintas |
| `vino` | `#6c1c26` | sombra del rojo y de las tejas |
| `salmon` | `#e8509a` | la buganvilla fucsia, faroles rosados, pétalos de las velitas |
| `menta` | `#74c864` | faroles verdes, hojas con luz |
| `verde` | `#3a663a` | matas y la hoja de la buganvilla |
| `verde_oscuro` | `#1c3226` | sombra de las matas, palmas de lejos |
| `celeste` | `#5a7cd6` | faroles azules, brillo del río, el equipo azul |
| `cielo` | `#2c3c7a` | cielo bajo, el río con luz |
| `azul` | `#1b2756` | cielo del medio y el río Thu Bồn |
| `azul_noche` | `#0e1434` | cielo alto, el río en sombra |
| `canal` | `#9452c8` | faroles morados |
| `oro` | `#ffa62a` | faroles dorados, ventanas encendidas y su reflejo en el río |
| `bruma` | `#3c3466` | el resplandor de la ciudad vieja en el cielo, el halo de la luna |

## Elementos icónicos (12)

| Elemento | Dónde va |
|---|---|
| Las casas amarillas de la ciudad vieja, de dos pisos, con la pared gastada | cerca, de x 166 al final |
| Los techos de tejas de barro con el caballete de puntas curvas, y el alero entre los pisos | cerca |
| La planta baja de madera oscura: vanos abiertos con la tienda encendida, puertas plegables y celosías | cerca |
| Un farol en cada puerta y los racimos de faroles debajo del alero | cerca |
| Las cuerdas de faroles de seda de colores sobre la calle, de poste en poste | bajo cuerdas_faroles |
| Los puestos de faroles: techito de tejas, faroles en dos filas y el mostrador | cerca, detrás de la vendedora y al final |
| La buganvilla fucsia que cae de los techos y los balcones, y el árbol de la esquina | cerca |
| El puente japonés (Chùa Cầu) encendido, con sus arcos y el templito | lejos, por la izquierda |
| El río Thu Bồn con los reflejos de los faroles, velitas en flores de papel y botes con faroles | lejos, cerca (izquierda) y debajo del muelle |
| Los dos postes de bambú del Tama-wari, con trípode, el collar del equipo y las cintas de colores | postes poste_tamawari |
| La calle de piedra con la luz tibia de los faroles y el muelle de madera | piso |
| Los vecinos asomados a los balcones de madera, con nón lá y abanicos | cerca, vida publico |

## Vida (4)

- `faroles_meciendose`: Los faroles de las cuerdas y de los postes que se mecen con la brisa, 4 cuadros.
- `velitas_rio`: Las velitas del río de adelante, que titilan, 3 cuadros.
- `botes_con_faroles`: El bote con faroles amarrado en el río de la izquierda, que se mece, y otro que cruza lejos por el río.
- `publico`: Los vecinos de los balcones, que levantan los brazos, los abanicos y los celulares: 2 cuadros.

## Cada caja del layout

El dibujo calza con la caja: el techo mide `d` filas y el frente `z` filas. Nada cambia de lugar ni de alto.

| Tipo | Medida | Cuántas | Dibujo |
|---|---|---|---|
| `base_poste` | 16 x 12, z 12 | 2 | Cajón de madera lleno de piedras al pie del poste del Tama-wari, con el trípode de bambú amarrado encima |

## Letreros

Texto real y corto, con los acentos: "ĐÈN LỒNG", "CAO LẦU", "MAY ĐO".
