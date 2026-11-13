# Taller gótico: guía para dibujar assets

Assets isométricos con las proporciones de los juegos de rol oscuros de fines de los 90 (el de la catedral, los
cinco actos y el infierno). Todo es original y se dibuja por código: cada asset es una lista de piezas 3D que
`render.ts` mira con cámara 2:1 y pinta como render previo (luz de arriba a la izquierda, sombra propia y en el
piso, textura del material, paleta en rampas cortas con trama).

## Escala (no cambiarla)

| Cosa | Unidades del mundo | En pantalla |
|---|---|---|
| Celda de juego (huella) | 16 × 16 | rombo 32 × 16 |
| Baldosa de piso | 80 × 80 (5 × 5 celdas) | rombo 160 × 80 |
| Persona adulta | 61 de alto | 75 px |
| Monstruo chico (diablillo) | 38 de alto | ~47 px |
| Puerta | 26–32 de ancho, 50–56 de alto | |
| Mesa | 13–16 de alto | |
| Silla / banco | 9–10 el asiento, 22–26 el respaldo | |
| Cofre | 22–28 de largo, 12–16 de alto | |
| Barril | 14–16 de diámetro, 16–20 de alto | |
| Lápida | 14–28 de alto | |
| Muro | 80 de largo por tramo, 10–14 de grueso, 64–150 de alto | |
| Árbol | 90–200 de alto (copa ancha 40–90) | |
| Casa | huella 2×2 a 3×3 baldosas (160–240), 90–160 de alto con techo | |
| Torre / templo grande | hasta 240 de alto | |

Una unidad ≈ 3 cm. El eje `x` va hacia abajo a la derecha en pantalla, el `y` hacia abajo a la izquierda, el `z`
hacia arriba. El origen (0,0,0) es el centro de la huella en el piso: ahí se apoya el asset en el mapa.

## Piezas (`Arma` que recibe `armar`)

- `a.caja(x, y, z, ancho, fondo, alto, { mat, giro?, incl?, inclEje?, tono?, resta? })`: caja con la base centrada
  en (x,y,z). `giro` en grados alrededor del eje vertical; `incl` la inclina sobre su eje `x` o `y`.
- `a.cilindro(x, y, z, r0, alto, { mat, r1?, giro?, incl?, eje? })`: cilindro o cono truncado (r1 arriba). `eje` es
  un vector para tumbarlo (por ejemplo `[1,0,0]` acostado a lo largo de x).
- `a.palo([x,y,z], [x,y,z], r0, { mat, r1? })`: cilindro entre dos puntos (ramas, palos, cadenas, lanzas).
- `a.elipsoide(x, y, z, rx, ry, rz, { mat, giro?, incl? })` y `a.esfera(x, y, z, r, { mat })`: centro y radios.
- `a.poliedro([[x,y,z], ...], { mat })`: la cáscara convexa de esos puntos (techos de dos aguas, cuñas, pirámides,
  hojas de espada, gemas).
- - `masa([hueso(a, b, r0, r1, { mat?, k? }), bulto(c, [rx, ry, rz], { mat?, eje?, ejes? }), ...], { mat, suave })`:
  formas orgánicas que se funden (troncos, raíces, cuerpos, carne). `suave` de 1.5 a 4. Cada componente puede llevar
  su material. Cuesta más pintar que una caja: úsala donde la forma lo pide.
- `resta: true`: la pieza cava (puertas, ventanas, nichos). Cava solo las piezas armadas antes que ella; lo que
  se arma después se ve dentro del hueco.
- `tono`: suma o resta brillo a esa pieza (-0.3 a 0.3) para variar sin otro material.
- `a.r()` da un azar 0..1 con la semilla del elemento: úsalo para variar (giro, tamaño, piedras sueltas).

`armar(v, f, a)` devuelve la lista de piezas, o `{ piezas, resplandor?: { c: [x,y,z], r, color } }` para que un
fuego tiña lo que tiene cerca. `v` es la variante, `f` el cuadro de animación (0..cuadros-1).

## Materiales (`materiales.ts`)

piedra, piedra_bloques, piedra_gris, piedra_musgo, ladrillo, marmol, marmol_negro, arenisca, arenisca_lisa, roca,
roca_roja, hielo, nieve, cristal, madera, madera_vieja, madera_lisa, corteza, corteza_muerta, paja, tela, tela_roja,
tela_azul, tela_verde, tela_morada, cuero, cuerda, hierro, hierro_oxido, acero, oro, bronce, hueso, carne, sangre,
hojas, hojas_otono, hojas_selva, pino, pasto, musgo, hongo, tierra, arena, agua, agua_sucia, baba, teja, pizarra,
vidrio, cera, negro. Brillan solos (no se sombrean): fuego, fuego_azul, fuego_verde, lava, magia, portal_rojo,
luz_vela, runa.

Se puede agregar un material nuevo en `materiales.ts` si hace falta de verdad (rampa de 5–8 colores apagados,
de la sombra a la luz).

## Estilo

- Oscuro y apagado, nada chillón: la paleta ya lo hace, no metas colores puros.
- Siluetas legibles a 1x: piezas de 2 unidades o más (menos se pierde), detalles con `tono` o con otro material.
- Varía con la semilla: piedras sueltas, giros chicos, inclinaciones de 2–8°, que dos lápidas no salgan iguales.
- Ensucia: tierra en la base, musgo, grietas (cajas finas `resta`), tablas sueltas.
- Personajes y monstruos (temas `personajes` y `monstruos`, y todo lo que sale de `personajeEscena`) se pintan en
  clave baja (`clave_baja.ts`): salen de la oscuridad con una luz de borde fina. Los objetos y los pisos no.
- Animación solo donde aporta (fuego, agua, portales, banderas, magia): 4–8 cuadros, `t` 2–4.
- Costo: hasta ~250 piezas por asset; un asset grande (casa, templo) tarda menos de 2 s en pintar.

## Registrar

```ts
import { registrar, type Pieza } from '../objeto';
registrar({ id: 'lapida_angel', nombre: ['Lápida con ángel', 'Angel tombstone'], tema: 'cementerio',
  variantes: ['entera', 'rota'], huella: [1, 1], bloquea: true, armar: (v, f, a) => { ... } });
```

Ids en minúscula con guion bajo, únicos en todo el catálogo. Los temas están en `objeto.ts` (`TEMAS`).

Huella por variante: si una variante corre a lo largo de y (`y`, `der`, `lado` o que termina en `_y`), la huella
se gira sola. Para otra cosa, `huellaPor: { variante: [ancho, fondo] }`.

## Probar

`MODS=cementerio npx tsx scripts/gotico-lamina.ts /ruta/salida.png` pinta todas las variantes del archivo con una
línea roja de 75 px (la persona) para comparar la escala. Mírala siempre antes de dar algo por terminado.

## Pintores por pixel (agua, suelos, decals, portales)

Lo que no se arma bien con piezas (agua, suelo que pega sin costura, luz) se pinta por pixel. Un objeto puede traer
`pintar: (v, f, seed) => Render` y un piso `pintar: (v, f) => Raster`: `pintarObjeto` y `pintarPiso` los usan solos,
así el horneo del juego no cambia. `armar` queda para el mapa, las cinemáticas y la luz (`fuenteDe`).

- `agua.ts`: el arroyo (`par_arroyo`, `par_puente`) en coordenadas del río; lo que cruza el borde de la baldosa se
  repite cada 80, así todos los tramos pegan. Bucle de 16 cuadros. Lo alto de la orilla va aparte
  (`par_juncos_orilla`, `juncosDeTramo`).
- `suelo_paramo.ts`: piso `par_suelo` de Wang por esquinas (81 variantes); `pisosParamo` elige las variantes.
- `decals_paramo.ts`: `par_decal` y `par_charco_suelo`, planos; `regarDecalsParamo` dice dónde van.
- `portales.ts`: `com_portal_vivo` (pueblo, mazmorra, infierno) y `com_portal_luz` (la luz del piso, para 'screen').
