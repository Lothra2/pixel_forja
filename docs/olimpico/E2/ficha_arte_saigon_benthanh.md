# Ficha de arte: saigon_benthanh

MERCADO BẾN THÀNH. Estilo `vietnam`, hora `manana`.

## Paleta: 24 colores

Cada pixel del escenario sale de aquí. La prueba 8 lo revisa.

| Color | Hex | Para qué |
|---|---|---|
| `tinta` | `#231c28` | contorno y lo más oscuro |
| `sombra` | `#3d3442` | sombras hondas, cables, rejas |
| `asfalto` | `#57505a` | asfalto del hẻm |
| `asfalto_claro` | `#7a7178` | asfalto gastado, marcas |
| `cemento` | `#a39a98` | acera, concreto, sombra de pared clara |
| `cemento_claro` | `#cdc3b8` | concreto al sol, baldosa |
| `crema` | `#efe4cb` | pared crema, toldos |
| `luz` | `#fff8e6` | brillos y ropa blanca |
| `amarillo` | `#f0cc66` | pared amarilla, luz de la mañana |
| `ocre` | `#c4913f` | sombra del amarillo, madera, bambú |
| `terracota` | `#a8553a` | tejas, óxido, sombra del salmón |
| `rojo` | `#d93a2e` | banderas, sillas plásticas, letreros |
| `vino` | `#82242c` | sombra del rojo, altar |
| `salmon` | `#ec9f8c` | pared rosada |
| `menta` | `#93cdb0` | pared verde agua |
| `verde` | `#4f8f55` | matas y buganvilla en hoja |
| `verde_oscuro` | `#2d5a3e` | sombra de matas, canal hondo |
| `celeste` | `#8fbfdc` | pared celeste, ciudad lejana |
| `cielo` | `#d4e8f0` | cielo, vidrio que brilla |
| `azul` | `#3f71a3` | sillas azules, tanque de agua, letreros |
| `azul_noche` | `#283d5e` | sombra del celeste, vidrio oscuro |
| `canal` | `#5b7a68` | agua turbia del canal y la calle inundada |
| `oro` | `#f5b52e` | dorado del altar, letras, luz encendida |
| `bruma` | `#e9cfae` | bruma del horizonte, cielo bajo |

## Elementos icónicos (12)

| Elemento | Dónde va |
|---|---|
| La torre del reloj de Bến Thành con CHỢ BẾN THÀNH y la bandera | cerca, sobre la entrada (x del portón) |
| Fachada amarilla con ventanas de arco y techo de teja | cerca, calle Lê Lợi |
| Árboles de Lê Lợi con su seto | cerca, antes del mercado |
| Techo de lámina con claraboya y cerchas de acero | cerca, adentro del mercado |
| Letreros de zona colgados: QUẦN ÁO, HOA TƯƠI, VẢI, ĂN UỐNG, LƯU NIỆM, CÀ PHÊ | cerca, sobre cada fila de puestos |
| Puestos del fondo con estantes llenos, placa numerada y mostrador | cerca, adentro |
| Columnas pintadas de verde abajo | cerca, cada 400 px |
| Filas de puestos altos que arman los pasillos | cajas puesto_* |
| Canastos de fruta tropical | caja puesto_frutas |
| Faroles rojos colgados del techo | bajo lamparas_colgantes |
| Arco de salida CỬA BẮC con la luz de afuera | cerca, en el portón de salida |
| Casas tubo de la calle de salida | cerca, después del mercado |

## Vida (3)

- `vendedoras_pregonando`: Vendedoras detrás de los puestos que levantan la mano y pregonan, 2 cuadros.
- `toldos_viento`: Las lonas y la ropa colgada de los puestos que se mecen, 2 cuadros.
- `palomas`: Palomas paradas en los cables y el piso, que salen volando.

## Cada caja del layout

El dibujo calza con la caja: el techo mide `d` filas y el frente `z` filas. Nada cambia de lugar ni de alto.

| Tipo | Medida | Cuántas | Dibujo |
|---|---|---|---|
| `puesto_frutas` | 44 x 36, z 22 y 48 x 36, z 24 | 4 | Canastos de thanh long, mango, chôm chôm y măng cụt sobre una tarima, con el precio en cartón |
| `cajas` | 30 x 36, z 16 | 1 | Guacales verdes de cerveza. Con dos capas, cajas de anime arriba |
| `canastas` | 30 x 36, z 14 | 1 | Canastas de bambú con verduras, ají y limones |
| `porton_mercado` | 40 x 40, z 64 y 40 x 50, z 64 | 3 | Pilar de repello amarillo de Bến Thành con cornisa de teja y remate. Sobre el paso, el arco con la placa CỬA NAM |
| `puesto_ropa` | 180 x 16, z 46 y 280 x 16, z 46 | 3 | Fila de puestos altos con camisas y áo dài en ganchos, mostrador de madera y la placa del puesto |
| `puesto_flores` | 280 x 16, z 46 y 80 x 16, z 46 | 3 | Ramos en baldes de lata y una guirnalda de cempasúchil |
| `puesto_telas` | 300 x 16, z 46 y 40 x 16, z 46 | 3 | Rollos de tela en estantes y pañuelos colgados |
| `puesto_comida` | 280 x 16, z 46 y 200 x 16, z 46 y 300 x 16, z 46 | 3 | Tablero del menú (BÚN BÒ, CƠM, PHỞ), ollas con vapor y mostrador |
| `puesto_recuerdos` | 300 x 16, z 46 | 2 | Nón lá colgados, cajitas lacadas rojas y franelas |
| `puesto_cafe` | 280 x 16, z 46 y 260 x 16, z 46 | 2 | Sacos de café abiertos, latas y filtros phin, letrero CÀ PHÊ |
| `sacos_arroz` | 26 x 26, z 12 | 3 | Sacos de fique abiertos con el arroz y un cucharón |
| `carrito_cafe` | 50 x 28, z 24 | 1 | Carrito rojo de cà phê sữa đá con los vasos, el termo y dos ruedas |
| `cubos_flores` | 34 x 36, z 16 | 1 | Baldes de lata llenos de flores |

## Letreros

Texto real y corto, con los acentos: "CHỢ BẾN THÀNH", "CỬA NAM", "CỬA BẮC", "QUẦN ÁO", "HOA TƯƠI", "VẢI", "ĂN UỐNG", "LƯU NIỆM", "CÀ PHÊ", "BÚN BÒ", "CƠM", "PHỞ", "CHÈ".
