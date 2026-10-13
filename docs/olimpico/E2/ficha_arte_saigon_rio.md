# Ficha de arte: saigon_rio

RÍO SAIGÓN. Estilo `vietnam`, hora `mediodia`.

## Paleta: 24 colores

Cada pixel del escenario sale de aquí. La prueba 8 lo revisa.

| Color | Hex | Para qué |
|---|---|---|
| `tinta` | `#1f1a22` | contorno y lo más oscuro |
| `sombra` | `#3a3340` | sombras hondas, cables, rejas |
| `asfalto` | `#5a525a` | asfalto del hẻm |
| `asfalto_claro` | `#857c80` | asfalto gastado, marcas |
| `cemento` | `#b0a8a2` | acera, concreto, sombra de pared clara |
| `cemento_claro` | `#ddd5c8` | concreto al sol, baldosa |
| `crema` | `#f4ead2` | pared crema, toldos |
| `luz` | `#fffbee` | brillos y ropa blanca |
| `amarillo` | `#f6d35a` | pared amarilla, luz de la mañana |
| `ocre` | `#c8963a` | sombra del amarillo, madera, bambú |
| `terracota` | `#b05a36` | tejas, óxido, sombra del salmón |
| `rojo` | `#e0372a` | banderas, sillas plásticas, letreros |
| `vino` | `#86242a` | sombra del rojo, altar |
| `salmon` | `#f0a48a` | pared rosada |
| `menta` | `#8fd0b0` | pared verde agua |
| `verde` | `#45974f` | matas y buganvilla en hoja |
| `verde_oscuro` | `#275a3a` | sombra de matas, canal hondo |
| `celeste` | `#6fb3e6` | cielo alto, pared celeste |
| `cielo` | `#bfe1f6` | cielo bajo, vidrio que brilla |
| `azul` | `#2f6fb0` | sillas azules, tanque de agua, letreros |
| `azul_noche` | `#213a5e` | sombra del celeste, vidrio oscuro |
| `canal` | `#6b7a52` | agua del río, color oliva |
| `oro` | `#f7b928` | dorado del altar, letras, luz encendida |
| `bruma` | `#e6e8d8` | calima del mediodía |

## Elementos icónicos (12)

| Elemento | Dónde va |
|---|---|
| Landmark 81 grande al otro lado del río, con Thủ Thiêm verde a sus pies | lejos |
| Edificios coloniales crema con persianas verdes | cerca, malecón Bạch Đằng |
| Tamarindos y la jardinera con seto y flores | cerca, malecón |
| Faroles de tres globos del malecón | postes farol_rio |
| El río abierto hasta la otra orilla, con botes a lo lejos | cerca, entre los muelles |
| Agua honda con la corriente, espuma en la orilla y jacintos | piso del río |
| Muelles de tablas sobre pilotes | caja muelle |
| Thúng chai, los botes redondos de bambú | caja bote_bambu |
| Palafitos de tablas de colores con techo de zinc | cerca, orilla Thủ Thiêm |
| Cocoteros y matas de dừa nước | cerca, orilla |
| Redes de pesca secándose en varas de bambú | bajo redes_pesca |
| Carrito de chè | caja carrito_che |

## Vida (4)

- `jacintos_flotando`: Matas de jacinto que bajan con la corriente del río.
- `agua_animada`: Rayas de la corriente y brillos que corren en el río, 4 cuadros.
- `ferry`: El ferry que va y viene entre los muelles (entidad vehiculo: lo dibuja D2).
- `botes_bambu`: Thúng chai que se mecen en la orilla, 2 cuadros.

## Cada caja del layout

El dibujo calza con la caja: el techo mide `d` filas y el frente `z` filas. Nada cambia de lugar ni de alto.

| Tipo | Medida | Cuántas | Dibujo |
|---|---|---|---|
| `banca` | 60 x 16, z 12 | 2 | Banca del malecón: tablas de madera sobre patas de hierro verde |
| `escalon` | 16 x 40, z 6 | 2 | Escalón de concreto con el canto gastado |
| `muelle` | 300 x 40, z 12 | 2 | Muelle de tablas sobre pilotes, con bitas de amarre y llantas de defensa |
| `bote_bambu` | 40 x 30, z 16 | 2 | Thúng chai: bote redondo de bambú tejido, embreado abajo, con su remo |
| `cajas_pescado` | 50 x 40, z 20 | 1 | Cajas de icopor con pescado sobre hielo |
| `carrito_che` | 50 x 28, z 26 | 1 | Carrito de chè con los frascos de colores en capas |

## Letreros

Texto real y corto, con los acentos: "KHÁCH SẠN", "NHÀ HÀNG", "BẢO TÀNG", "CÀ PHÊ", "CHÈ".
