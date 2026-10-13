# Ficha de arte: candelaria

CANCHA DE TEJO LA CANDELARIA. Estilo `colombia_colonial`, hora `tarde`.

## Paleta: 24 colores

Cada pixel del escenario sale de aquí. La prueba 8 lo revisa.

| Color | Hex | Para qué |
|---|---|---|
| `tinta` | `#1e1a1e` | contorno, lo más oscuro |
| `sombra` | `#3a3232` | madera en sombra, las juntas hondas |
| `asfalto` | `#56504c` | vigas del techo, el hierro, la ruana oscura |
| `asfalto_claro` | `#78706a` | la madera gastada en sombra, el piso de cemento |
| `cemento` | `#9c968e` | el piso de cemento, la pared en sombra |
| `cemento_claro` | `#c4beb4` | la pared de cal en sombra, las nubes |
| `crema` | `#e8e2d4` | la cal de las paredes coloniales |
| `luz` | `#f8f6ee` | brillos, la iglesia de Monserrate, la mecha |
| `amarillo` | `#f2c838` | el amarillo de la bandera y los banderines |
| `ocre` | `#b08048` | la madera clara de los pilares y las bancas |
| `terracota` | `#8a5030` | la madera del techo, la teja de barro |
| `rojo` | `#cc3a2e` | el rojo de la bandera, la ruana roja |
| `vino` | `#6a2a26` | sombra del rojo, la teja en sombra |
| `salmon` | `#d68c6a` | la teja clara, la piel, la greda mojada |
| `menta` | `#76b098` | las puertas y ventanas verdes coloniales |
| `verde` | `#3e7a4c` | las matas, Monserrate con luz |
| `verde_oscuro` | `#264a34` | Monserrate, la sombra de las matas |
| `celeste` | `#8ea6b8` | las nubes grises con luz |
| `cielo` | `#b6c2ca` | el cielo nublado de Bogotá |
| `azul` | `#2c4c9a` | el azul de la bandera, las puertas azules |
| `azul_noche` | `#2a3446` | sombra del azul, el vidrio |
| `canal` | `#647480` | la llovizna, la sombra fría de afuera |
| `oro` | `#f0a040` | los bombillos encendidos, la llama de la mecha |
| `bruma` | `#a6aeb2` | la neblina en los cerros |

## Elementos icónicos (10)

| Elemento | Dónde va |
|---|---|
| La cancha techada: las cerchas y vigas de madera, la teja de barro por dentro y los pilares | cerca |
| La caja de greda con el bocín, donde el juego tira el tejo | caja caja_greda |
| Las mechas: los triángulos de papel con pólvora, en las cajas de atrás y en la cajita del estante | cerca |
| Los banderines de papel de colores colgados de viga a viga | cerca y vida |
| La pared colonial de cal con el zócalo pintado y las ventanas de madera verdes | cerca |
| Monserrate con la iglesia blanca arriba, por la ventana | lejos |
| Las casas coloniales de La Candelaria con techo de teja y balcones, del otro lado de la calle | lejos, por las ventanas |
| La llovizna de Bogotá afuera, en la ventana | lejos y vida |
| La gente con ruana y sombrero sentada en la banca, con su tinto | cerca, vida publico |
| El tablero de las reglas: MECHA 3, BOCÍN 6, MOÑONA 9 | cerca |

## Vida (4)

- `banderines`: Los banderines que se mecen con el aire, 2 cuadros.
- `publico`: La gente con ruana que levanta el tinto y aplaude, 2 cuadros.
- `llovizna`: La llovizna que cae afuera, en la ventana, 3 cuadros.
- `humo_mechas`: El humo que queda de las mechas reventadas (partículas).

## Cada caja del layout

El dibujo calza con la caja: el techo mide `d` filas y el frente `z` filas. Nada cambia de lugar ni de alto.

| Tipo | Medida | Cuántas | Dibujo |
|---|---|---|---|
| `caja_greda` | 50 x 6, z 52 | 1 | La caja de tejo de lado: el marco de madera, la cara de greda inclinada hacia el que lanza y el bocín de metal. Las mechas y los tejos los pinta el juego |

## Letreros

Texto real y corto, con los acentos: "CANCHA DE TEJO", "MECHA 3", "BOCÍN 6", "MOÑONA 9".
