# Ficha de arte: saigon_estadio

ESTADIO DE LA META. Estilo `vietnam`, hora `atardecer`.

## Paleta: 24 colores

Cada pixel del escenario sale de aquí. La prueba 8 lo revisa.

| Color | Hex | Para qué |
|---|---|---|
| `tinta` | `#1d1424` | contorno y lo más oscuro |
| `sombra` | `#3b2640` | sombras hondas, cables, rejas |
| `asfalto` | `#54404f` | asfalto del hẻm |
| `asfalto_claro` | `#7d6270` | asfalto gastado, marcas |
| `cemento` | `#a8848a` | acera, concreto, sombra de pared clara |
| `cemento_claro` | `#d4b4a8` | concreto al sol, baldosa |
| `crema` | `#f2d8bc` | pared crema, toldos |
| `luz` | `#fff2d8` | brillos y ropa blanca |
| `amarillo` | `#ffd166` | pared amarilla, luz de la mañana |
| `ocre` | `#d98c3a` | sombra del amarillo, madera, bambú |
| `terracota` | `#b9472f` | pista roja |
| `rojo` | `#e63b2e` | banderas, sillas plásticas, letreros |
| `vino` | `#8a2433` | sombra del rojo, altar |
| `salmon` | `#f49a7a` | pared rosada |
| `menta` | `#88c4a8` | pared verde agua |
| `verde` | `#3f8f4e` | matas y buganvilla en hoja |
| `verde_oscuro` | `#24553a` | sombra de matas, canal hondo |
| `celeste` | `#7a6fb0` | violeta del cielo alto |
| `cielo` | `#f6b08a` | durazno del cielo |
| `azul` | `#3d5ea8` | sillas azules, tanque de agua, letreros |
| `azul_noche` | `#262c5c` | sombra del celeste, vidrio oscuro |
| `canal` | `#5a6b8a` | agua turbia del canal y la calle inundada |
| `oro` | `#ffb52e` | luz del sol bajo y reflectores |
| `bruma` | `#f58a5a` | naranja del horizonte |

## Elementos icónicos (12)

| Elemento | Dónde va |
|---|---|
| Sol bajo con su halo y nubes encendidas | cielo del atardecer |
| El estadio por fuera: muro con aletas, SÂN VẬN ĐỘNG, taquilla y banderas | cerca, antes del portón |
| Gradas llenas de público con banderas | cerca |
| Techo voladizo con su sombra y reflectores | cerca |
| Pancarta CỐ LÊN NEKKETSU! | cerca, entre el público |
| Valla de avisos: NEKKETSU, VIỆT NAM, SÀI GÒN, GG, CỐ LÊN!, CROSS | cerca, al pie de las gradas |
| Marcador de puntos con VỀ ĐÍCH y el reloj | cerca, sobre las gradas del final |
| Torres de luz | postes torre_luz |
| Pista de tartán rojo con sus carriles | piso cancha |
| Vallas de atletismo caladas | caja valla |
| El pasto de adentro con el bordillo blanco | orilla de enfrente |
| Línea de meta a cuadros y la pancarta VỀ ĐÍCH | piso y cerca |

## Vida (3)

- `publico_ondeando`: El público de las gradas que se para y ondea banderas, 2 cuadros.
- `banderas`: Banderas de Vietnam en las astas de afuera, 2 cuadros.
- `fuegos_artificiales`: Fuegos artificiales en el cielo del atardecer cuando alguien llega a la meta.

## Cada caja del layout

El dibujo calza con la caja: el techo mide `d` filas y el frente `z` filas. Nada cambia de lugar ni de alto.

| Tipo | Medida | Cuántas | Dibujo |
|---|---|---|---|
| `porton_estadio` | 16 x 45, z 60 | 2 | Pilar de concreto con franjas azules. Sobre el paso, el arco con la placa VÀO |
| `valla` | 6 x 130, z 14 | 3 | Una valla de atletismo por carril, calada: barra a rayas y patas |

## Letreros

Texto real y corto, con los acentos: "SÂN VẬN ĐỘNG", "VÉ", "VÀO", "CỐ LÊN NEKKETSU!", "VỀ ĐÍCH", "NEKKETSU", "VIỆT NAM", "SÀI GÒN".
