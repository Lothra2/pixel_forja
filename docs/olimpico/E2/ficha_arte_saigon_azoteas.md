# Ficha de arte: saigon_azoteas

AZOTEAS DE SAIGÓN. Estilo `vietnam`, hora `tarde`.

## Paleta: 24 colores

Cada pixel del escenario sale de aquí. La prueba 8 lo revisa.

| Color | Hex | Para qué |
|---|---|---|
| `tinta` | `#1c1b24` | contorno y lo más oscuro |
| `sombra` | `#34333f` | sombras hondas, cables, rejas |
| `asfalto` | `#4c4b57` | asfalto del hẻm |
| `asfalto_claro` | `#6e6d78` | asfalto gastado, marcas |
| `cemento` | `#8f8e98` | acera, concreto, sombra de pared clara |
| `cemento_claro` | `#b4b3bb` | concreto al sol, baldosa |
| `crema` | `#cfcabe` | pared crema, toldos |
| `luz` | `#e8e6e0` | brillos y ropa blanca |
| `amarillo` | `#d9b85a` | pared amarilla, luz de la mañana |
| `ocre` | `#a8843f` | sombra del amarillo, madera, bambú |
| `terracota` | `#94533b` | tejas, óxido, sombra del salmón |
| `rojo` | `#c8392e` | banderas, sillas plásticas, letreros |
| `vino` | `#6e2630` | sombra del rojo, altar |
| `salmon` | `#c98c80` | pared rosada |
| `menta` | `#84aba0` | pared verde agua |
| `verde` | `#4c7a56` | matas y buganvilla en hoja |
| `verde_oscuro` | `#2c4a3c` | sombra de matas, canal hondo |
| `celeste` | `#7f93a8` | nubes de aguacero |
| `cielo` | `#a9b6c2` | claros entre nubes |
| `azul` | `#3e5f86` | sillas azules, tanque de agua, letreros |
| `azul_noche` | `#27354d` | sombra del celeste, vidrio oscuro |
| `canal` | `#4f6872` | charcos |
| `oro` | `#f2b33a` | ventanas encendidas |
| `bruma` | `#8b8f9c` | cortina de lluvia, ciudad lejana |

## Elementos icónicos (12)

| Elemento | Dónde va |
|---|---|
| Bitexco con su helipuerto entre torres con ventanas prendidas | lejos |
| Nubarrones del aguacero y cortinas de lluvia | cielo |
| Pisos de arriba de los edificios vecinos, con ventanas encendidas | cerca |
| Avisos en los techos: KARAOKE, KHÁCH SẠN, CÀ PHÊ, NHÀ HÀNG, PHỞ, SPA | cerca |
| Café de azotea con sombrillas rojas y bombillos | cerca |
| Murito del fondo con matas, cortado en los huecos | cerca |
| El vacío entre edificios, con ventanitas prendidas abajo | huecos vacio |
| Techo de zinc con óxido | piso metal |
| Tanques de acero | caja tanque_agua |
| Aires acondicionados | caja aire_acondicionado |
| Cuerdas de ropa tendida | bajo ropa_tendida |
| Antenas de espina de pescado y parabólicas, en metal claro | postes antena |

## Vida (3)

- `lluvia`: Aguacero: rayas de lluvia (efecto lluvia del kit) y salpicaduras en los charcos.
- `ropa_viento`: Ropa tendida que se sacude con el viento del aguacero, 2 cuadros.
- `charcos_crecen`: Los charcos se agrandan con anillos de gotas.

## Cada caja del layout

El dibujo calza con la caja: el techo mide `d` filas y el frente `z` filas. Nada cambia de lugar ni de alto.

| Tipo | Medida | Cuántas | Dibujo |
|---|---|---|---|
| `tanque_agua` | 34 x 26, z 44 y 34 x 30, z 44 | 3 | Tanque de acero parado, con anillos y tapa |
| `mesas_plasticas` | 48 x 30, z 20 | 2 | Bajas: mesitas azules con banquitos. Altas: columnas de banquitos rojos |
| `aire_acondicionado` | 30 x 24, z 18 | 3 | Unidad de aire acondicionado con el ventilador redondo |
| `caseta_escalera` | 60 x 70, z 56 | 1 | Caseta de la escalera de la azotea: puerta de lámina azul, ventanita y repello mojado |
| `macetas` | 40 x 30, z 14 | 1 | Materas de barro con matas y buganvilla |

## Letreros

Texto real y corto, con los acentos: "KARAOKE", "KHÁCH SẠN", "CÀ PHÊ", "NHÀ HÀNG", "PHỞ", "SPA".
