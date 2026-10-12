# Ficha de arte: saigon_hem

HẺM DE SAIGÓN. Estilo `vietnam`, hora `manana`.

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
| Casas tubo angostas de 3 a 5 pisos | cerca: la fila de fachadas de todo el tramo |
| Planta baja con tienda: tạp hóa, phở, café, taller de motos | cerca, con letrero de texto real |
| Rejas plegables (cửa xếp) | cerca, en las casas cerradas |
| Altar de la tierra con incienso | cerca, al pie de las casas |
| Cables enredados y postes de luz | cerca y frente: de poste a poste y a las casas |
| Motos tipo Cub paradas | caja moto_estacionada y garajes |
| Sillas y mesas plásticas rojas y azules | caja mesas_plasticas y los cafés |
| Carrito de bánh mì | caja puesto_banhmi |
| Xe ba gác, el triciclo de carga | caja carro |
| Balcones con matas, buganvilla, aires y ropa tendida | cerca, pisos de arriba |
| Tanques de agua de acero | techos y la caja tanque_agua |
| Landmark 81 y Bitexco en la bruma | lejos |

## Vida (5)

- `motos_fondo`: Motos que cruzan al fondo del hẻm, de un lado al otro.
- `ropa_tendida`: Ropa tendida que se mueve con el viento, 2 cuadros.
- `palomas`: Palomas paradas en los cables y el piso, que salen volando.
- `cables_viento`: Cables que se mecen apenas, 2 cuadros.
- `incienso`: Humo del incienso de los altares.

## Cada caja del layout

El dibujo calza con la caja: el techo mide `d` filas y el frente `z` filas. Nada cambia de lugar ni de alto.

| Tipo | Medida | Cuántas | Dibujo |
|---|---|---|---|
| `tanque_agua` | 30 x 18, z 40 | 1 | Tanque de acero parado, con anillos y tapa |
| `kiosco` | 36 x 22, z 44 | 1 | Kiosco de lámina de tarjetas de teléfono (SIM THẺ) |
| `carro` | 96 x 30, z 24 | 1 | Xe ba gác: plataforma de tablas a la altura de la caja, ruedas abajo y la moto adelante |
| `mesas_plasticas` | 48 x 30, z 20 y 48 x 30, z 34 | 2 | Bajas: mesitas azules con banquitos. Altas: columnas de banquitos rojos |
| `cajas` | 40 x 40, z 18 y 40 x 40, z 36 | 2 | Guacales verdes de cerveza. Con dos capas, cajas de anime arriba |
| `muro_alto` | 24 x 92, z 52 | 1 | Muro con tejas y vidrios rotos arriba, y el portón de hierro plegado contra el frente |
| `puesto_banhmi` | 40 x 24, z 30 | 1 | Carrito de bánh mì: vitrina con los panes y el letrero BÁNH MÌ |
| `moto_estacionada` | 64 x 26, z 22 | 1 | Dos motos Cub, con el asiento a la altura de la caja |
| `muro_bajo` | 18 x 130, z 28 | 1 | Muro repellado con el ladrillo pelado y moho abajo |

## Letreros

Texto real y corto, con los acentos: "TẠP HÓA", "PHỞ 24", "CÀ PHÊ SỮA ĐÁ", "SỬA XE", "BÁNH MÌ", "CƠM TẤM", "GỘI ĐẦU", "NHÀ THUỐC", "SIM THẺ".
