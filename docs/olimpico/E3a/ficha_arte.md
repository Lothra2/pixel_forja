# Ficha de arte: medellin_c13

COMUNA 13. Estilo `colombia_ladrillo`, hora `manana`.

## Paleta: 24 colores

Cada pixel del escenario sale de aquí. La prueba 8 lo revisa.

| Color | Hex | Para qué |
|---|---|---|
| `tinta` | `#221a22` | contorno y lo más oscuro, tanques negros |
| `sombra` | `#3d3138` | sombras hondas, rejas, cables |
| `asfalto` | `#59525a` | asfalto, metal de la escalera eléctrica |
| `asfalto_claro` | `#807880` | metal gastado, zinc en sombra |
| `cemento` | `#a8a09c` | concreto, columnas sin pintar |
| `cemento_claro` | `#d4cdc4` | concreto al sol, zinc, baldosa |
| `crema` | `#f2e8d2` | pared pintada clara, letreros |
| `luz` | `#fffaf0` | brillos, ropa blanca, letras |
| `amarillo` | `#f6c93c` | amarillo de la bandera, pared amarilla, murales |
| `ocre` | `#d98d48` | ladrillo al sol, la junta del ladrillo |
| `terracota` | `#b55c38` | ladrillo |
| `rojo` | `#d83a30` | rojo de la bandera, cabinas del metrocable, rejas |
| `vino` | `#7e3226` | sombra del ladrillo |
| `salmon` | `#ec6a9e` | rosado de los murales y las flores |
| `menta` | `#58c6aa` | turquesa de los murales |
| `verde` | `#4c9a46` | matas, cerros cercanos |
| `verde_oscuro` | `#2b5c36` | sombra de las matas, cerros |
| `celeste` | `#5aa8e8` | cielo alto, murales |
| `cielo` | `#b8def8` | cielo bajo, vidrio |
| `azul` | `#2c5cba` | azul de la bandera, rejas azules |
| `azul_noche` | `#2a3c66` | cerros lejanos en sombra, vidrio oscuro |
| `canal` | `#8a58c4` | violeta de los murales |
| `oro` | `#f5862a` | naranja de los techos de la escalera eléctrica |
| `bruma` | `#d2e2ea` | bruma sobre el valle |

## Elementos icónicos (12)

| Elemento | Dónde va |
|---|---|
| La estación San Javier del metro, con el letrero y la torre del metrocable | cerca, x 0 a 520 |
| El muro largo de COMUNA 13 con colibríes y mariposas | frente de la terraza de la subida |
| El mural de la cara de perfil con el colibrí, y LA 13 ES CULTURA | cerca, la subida de los grafitis |
| Casas de ladrillo apiladas en tres gradas, con rejas de colores y matas | cerca |
| La escalera eléctrica con el techo naranja sobre columnas grises | cajas escalera_electrica y bajo techo_escalera |
| Tanques negros, varillas y antenas en los techos | cerca y caja tanque_agua |
| Techos de zinc con óxido | cajas techo_lata |
| La escalera de colores | cajas escalera_pintada |
| Las letras gigantes de COMUNA 13 | caja letras_comuna13 |
| La bandera de Colombia en el asta del mirador | poste asta_bandera y vida |
| El Valle de Aburrá con la ciudad abajo | lejos |
| El metrocable cruzando el valle | lejos y vida |

## Vida (7)

- `metrocable`: Cabinas rojas que cruzan el valle por los cables, en la capa lejos, con su recorrido.
- `bailarines_break`: Bailarines de break en rueda (entidad npc: lote C6a).
- `musicos`: Músicos con el parlante en el mirador (entidad npc: lote C6a).
- `perros`: Perros de la calle (entidad animal, lote C7).
- `gallos`: El gallo en el techo de zinc (entidad animal, lote C7b).
- `banderines`: Banderines de colores de casa a casa, 2 cuadros.
- `ropa_tendida`: Ropa tendida que se mueve con el viento, 2 cuadros.

## Cada caja del layout

El dibujo calza con la caja: el techo mide `d` filas y el frente `z` filas. Nada cambia de lugar ni de alto.

| Tipo | Medida | Cuántas | Dibujo |
|---|---|---|---|
| `letras_comuna13` | 170 x 20, z 184 | 1 | Las letras gigantes de COMUNA 13, cada una de un color, con su espesor y la base |
| `tanque_agua` | 30 x 24, z 84 | 1 | Tanque negro de plástico con sus anillos |
| `escalera_electrica` | 14 x 60, z 30 y 14 x 60, z 36 y 14 x 60, z 42 y 14 x 60, z 48 y 14 x 60, z 54 y 14 x 60, z 60 y 14 x 60, z 66 y 14 x 60, z 72 y 14 x 60, z 78 y 14 x 60, z 84 y 14 x 60, z 90 y 14 x 60, z 96 y 14 x 60, z 102 y 14 x 60, z 108 | 14 | Peldaño de aluminio con estrías y borde amarillo, el vidrio y el pasamanos negro que sube. Los peldaños corren hacia abajo (vida) |
| `escalones` | 33 x 70, z 78 y 33 x 70, z 90 y 33 x 70, z 102 y 33 x 70, z 36 y 33 x 70, z 48 y 33 x 70, z 60 | 6 | Escalones de concreto con el pasamanos de tubo |
| `baranda` | 60 x 14, z 108 | 1 | Pasarela de lámina sobre el hueco, con reja a los dos lados |
| `carrito_paletas` | 44 x 30, z 22 | 1 | Carrito amarillo de paletas de mango biche con el parasol verde y el letrero MANGO |
| `aire_acondicionado` | 30 x 24, z 126 | 1 | Unidad de aire acondicionado con el ventilador redondo |
| `escalon` | 14 x 130, z 6 y 14 x 130, z 12 y 14 x 130, z 18 y 14 x 130, z 24 | 4 | Escalón de concreto de la estación con la franja amarilla en la nariz |
| `terraza` | 574 x 130, z 24 y 702 x 130, z 66 | 2 | Terraza de concreto. Su frente es el muro de contención: el mural corrido de COMUNA 13 en la subida, y ladrillo con murales en el callejón |
| `muro_grafiti` | 16 x 130, z 54 | 1 | Muro de grafitis con franjas de colores por altura: la cara de la izquierda las sigue |
| `techo_lata` | 302 x 130, z 108 y 220 x 130, z 108 y 140 x 130, z 108 | 3 | Techo de zinc ondulado con óxido y tornillos. Abajo, la casa de ladrillo con ventanas y un mural |
| `escalera_pintada` | 40 x 130, z 120 y 40 x 130, z 132 y 40 x 130, z 144 | 3 | La escalera de colores: franjas del arcoíris en el peldaño y la contrahuella de un color |
| `mirador` | 660 x 130, z 144 | 1 | La plaza del mirador en adoquín, con la reja del borde, bancas y materas. Su frente es el mural AQUÍ SE SUEÑA EN GRANDE |

## Letreros

Texto real y corto, con los acentos: "ESTACIÓN SAN JAVIER", "METROCABLE LÍNEA J", "MANGO", "COMUNA 13", "LA 13 ES CULTURA", "AQUÍ SE SUEÑA EN GRANDE", "SALIDA", "META".
