# Lote E4a: los escenarios del judo, el đá cầu y el tejo
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/31
Fecha: 2026-10-13

## Qué se hizo

Tres escenarios nuevos para las pruebas nuevas, y un formato general para las pruebas de lado:

- **`judo_hanoi`**: un dojo de judo en Hà Nội, de tarde, en la vista inclinada de la pelea (0.35, una pantalla de 640 como `caracas_azotea`). Estilo nuevo `vietnam_dojo`.
- **`tao_dan`**: el parque Tao Đàn de Saigón al amanecer, de lado, para el Đá cầu. Estilo nuevo `vietnam_parque`.
- **`candelaria`**: una cancha de tejo techada en La Candelaria, Bogotá, en la tarde nublada con llovizna afuera, de lado. Estilo nuevo `colombia_colonial`.

**`judo_hanoi`, el dojo:**

| Capa | Qué lleva |
|---|---|
| Lejos (`ho_hoan_kiem`) | <ul><li>El lago Hoàn Kiếm color jade, con la otra orilla y los techos de la ciudad vieja en la bruma de la tarde.</li><li>La Torre de la Tortuga (Tháp Rùa) en su islote, con sus tres pisos de arcos.</li><li>El puente rojo Thê Húc con la puerta del templo Ngọc Sơn.</li><li>Los sauces de la orilla.</li></ul> |
| Cerca (`dojo_hanoi`) | <ul><li>La pared de madera clara en paneles, el cielo raso de tablas y los pilares oscuros.</li><li>Cuatro ventanales altos con los postigos abiertos: los vidrios son transparentes y por ahí se ve el lago.</li><li>La bandera de Vietnam en el centro, el letrero del club VÕ ĐƯỜNG NHU ĐẠO HÀ NỘI, los tableros con las tablillas de los nombres y el reloj.</li><li>La caligrafía TÂM y NHẪN en rollos de papel con su sello rojo.</li><li>El público sentado en la banca (familias y niños) y los judocas de judogi blanco y azul esperando en seiza. Antes de la banca queda libre el sitio de Thor (x 70).</li></ul> |
| Piso | <ul><li>El tatami: esteras de 64 x 26, la zona de combate verde (x 64 a 576, y 10 a 88) con su borde rojo y la de seguridad amarilla.</li><li>Las cintas de salida azul y blanca en el centro.</li><li>Las manchas de sol de los ventanales sobre el tatami.</li><li>Abajo, el canto del tatami y el piso de madera del dojo.</li></ul> |
| Vida | <ul><li>`publico`: aplauden y levantan los brazos, 2 cuadros.</li><li>`hojas_cayendo`: las hojas que caen afuera, detrás de los vidrios, 4 cuadros.</li></ul> |
| Luces | El sol de la tarde de cada ventanal, con latido |

**`tao_dan`, el parque:**

| Capa | Qué lleva |
|---|---|
| Cielo | El amanecer: del celeste de arriba al durazno y al rosado, el sol recién salido a la izquierda |
| Lejos (`saigon_amanecer`) | Landmark 81 y la Bitexco entre las torres, en la bruma rosada, con los árboles del parque delante |
| Fondo (`parque_tao_dan`) | <ul><li>La bóveda de los árboles dầu y sus troncos claros y altísimos, con las raíces abiertas y el liquen.</li><li>Los rayos de sol que bajan entre los troncos.</li><li>El grupo de tai chi de ropa clara, con el abanico rojo, y los abuelos haciendo ejercicio.</li><li>El palo con las jaulas de pájaros y el banco de piedra con los señores del café de los pájaros.</li><li>El letrero CÔNG VIÊN TAO ĐÀN, el seto, el pasto y el camino de baldosas.</li></ul> |
| Piso | La cancha de tierra roja apisonada con las rayas gastadas de `DaCau.ts` y la del medio debajo de la red. Adelante, el pasto y el camino de baldosas |
| Vida | `tai_chi` (4 cuadros), `abuelos_ejercicio`, `pajaros` (saltan en las jaulas y otros cruzan lejos) y `rayos_de_luz` (el polvo que brilla en los rayos) |
| Luces | Los tres rayos de sol, con latido |

**`candelaria`, la cancha de tejo:**

| Capa | Qué lleva |
|---|---|
| Lejos (`monserrate_llovizna`) | <ul><li>Monserrate con la iglesia blanca en la punta y el teleférico, con la neblina pegada a la ladera.</li><li>Las casas coloniales de enfrente: paredes de colores, balcones de madera y techos de teja.</li><li>La llovizna.</li></ul> |
| Fondo (`cancha_tejo_candelaria`) | <ul><li>El techo de tablas con las vigas, el tirante y los pilares de madera.</li><li>Los banderines de papel de colores y tres bombillos prendidos.</li><li>La pared de cal con el pañete caído y el zócalo verde, y las dos ventanas coloniales con su reja de madera y los postigos verdes. Por la grande se ve Monserrate.</li><li>El tablero de las reglas (MECHA 3, BOCÍN 6, MOÑONA 9, MANO 1), el estante con la cajita de las mechas y los tejos, y el afiche del torneo.</li><li>El letrero claro donde el juego ya escribe CANCHA DE TEJO.</li><li>La gente con ruana y sombrero en la banca, con su tinto.</li><li>El tablón de atrás de la caja.</li></ul> |
| Piso | La tierra parda de la cancha con la greda que salta cerca de la caja, la raya de lanzamiento en x 104 y adelante el piso de cemento del galpón |
| Objetos | `caja_greda`: la caja de tejo de lado, con el marco de madera, la greda apisonada que sobresale y el bocín de metal |
| Vida | `banderines`, `publico` (levantan el tinto), `llovizna` (en las ventanas, 3 cuadros) y `humo_mechas` (partículas que suben de la caja) |
| Luces | Los tres bombillos |

**Motor, todo general:**
- **La vista de lado** (`vista: "lado"` en el layout): el dibujo va derecho, con las mismas capas de siempre. Va explicada abajo y en `docs/ESCENARIOS.md`.
- **El registro de lugares** (`lugares.ts`): un lugar nuevo trae junto su fondo, su capa lejos, sus pisos, lo de abajo de la franja, sus cajas, su vida, sus luces y sus partículas, y se elige por `paralaje.cerca`. Los tres de este lote entran así, sin tocar el motor por dentro.
- **La paleta de cada lugar se elige por su fondo.** Las otras horas de Vietnam y la mañana de Colombia devuelven lo mismo de antes. Comparé los 8 escenarios que ya estaban, archivo por archivo: Saigón, la Comuna 13, Caracas y Hội An salen idénticos byte a byte.
- **El cielo del amanecer y el cielo nublado** son nuevos en `cielo.ts`. Ningún escenario de antes los usaba.
- **El piso llega al borde de abajo:** si la franja es angosta, el piso crece hasta la fila 360. Los de antes ya llegaban.
- **Bajo techo** (`techado`), la llovizna de afuera no moja el piso.
- **La prueba de camino en una arena** cuenta el piso (altura 0). El techo de una caja más alta que el salto, como la caja de greda, no tiene que alcanzarse. Un piso encerrado sigue fallando.

## Cómo se usa (estudio y kit)

Los layouts van en `docs/ejemplos/nekketsu/escenarios/`: `judo_hanoi.layout.json`, `tao_dan.layout.json` y `candelaria.layout.json`. El kit los genera con los demás, y uno solo sale así:

```
npm run escenario -- docs/ejemplos/nekketsu/escenarios/tao_dan.layout.json salida/ --postales --ficha
```

**El formato de lado.** El layout dice `vista: "lado"` y su franja es la fila del piso del juego:

```json
{
 "id": "tao_dan", "pais": "vietnam", "prueba": "da_cau", "vista": "lado",
 "largo": 640, "franja": { "atras": 290, "adelante": 330 },
 "carriles": [{ "y": 14 }, { "y": 26 }],
 "paralaje": { "lejos": "saigon_amanecer", "cerca": "parque_tao_dan" }
}
```

Y `escenario.json` sale con lo que el juego ya lee, más dos campos:

```json
{
 "inclinacion": 0, "ancho": 640,
 "vista": "lado", "nota_vista": "de lado: el dibujo va derecho...",
 "franja": { "atras": 290, "adelante": 330 },
 "capas": {
  "cielo": { "archivo": "cielo_amanecer.png", "y": 0 },
  "lejos": { "archivo": "lejos.png", "y": 90, "paralaje": 0.25 },
  "cerca": { "archivos": ["cerca_0.png"], "y": 0 },
  "piso": { "archivos": ["piso_0.png"], "y": 290 },
  "objetos": { "archivo": "objetos.json" },
  "frente": { "archivos": ["frente_0.png"], "y": 316 }
 }
}
```

- `cerca` es el fondo: de la fila 0 a `franja.atras`, transparente donde se ve lejos.
- `piso` va de `franja.atras` a la fila 360. En Tao Đàn la franja ocupa las filas 290 a 330 y lo de adelante sigue hasta abajo.
- La fila de pantalla de un atleta es `franja.atras + y`. No hay que correr a nadie.

**Lo que tiene que conectar el juego en cada prueba:**
- **Judo (`Fight.ts`):**
  - En el preload, encolar también `judo_hanoi`.
  - En el create, con judo, `pintarEscenario(this, 'judo_hanoi', 5000)` en vez de `bg_hanoi`. La inclinación (0.35) y el ancho (674) ya los toma de `arte`.
  - El zoom de 1.5 se queda. Thor en `(70, FLOOR_TOP - 6)` cae en el hueco antes de la banca.
  - Cada cuadro, `arte.tick(dt, cam.scrollX, ...)` como en la pelea.
- **Đá cầu (`DaCau.ts`):**
  - `queueEscenario(this, 'tao_dan')` en el preload y, en el create, `pintarEscenario(this, 'tao_dan', 5000)` en vez de la imagen `bg_taodan`.
  - `PISO`, `FILA`, `RED_X` y `BORDE` no cambian: las filas 304 y 316 son los carriles y las rayas de la cancha están pintadas en el mismo sitio. El juego puede seguir dibujando sus rayas (caen encima) o dejar solo la red.
  - La red la sigue dibujando el juego. El arte deja libre la columna de la red y el letrero del parque queda arriba de ella.
  - Cada cuadro, `arte.tick(dt, this.cameras.main.scrollX, () => false)`.
- **Tejo (`Tejo.ts`):**
  - `queueEscenario(this, 'candelaria')` y `pintarEscenario(this, 'candelaria', 5000)` en vez de `bg_candelaria`.
  - El texto CANCHA DE TEJO en (440, 205) cae en el letrero claro pintado, que está en el mismo sitio del fondo de hoy.
  - La caja viene pintada como el objeto `caja_greda`, con la forma de `armarCaja()`: el juego puede quitar `armarCaja()`.
  - `pintarCara()` se queda (el bocín, las mechas y los tejos), pero su profundidad tiene que subir a `PISO + 1`: el objeto de la caja va en `franja.atras + orden` = 300 y hoy la cara va en 299, debajo.
  - El humo de las mechas sale de `particulas.json`. El estallido sigue siendo `mecha_tejo` del kit.

**En el kit:** el kit a medida los saca solos de `escenarios/`. Son 11 escenarios y cada uno de los nuevos trae 8 PNG.

## Pruebas

- **Prueba nueva `e4a.test.ts`, 13 casos:**
  - Los tres pasan las 9 pruebas, sin avisos, con su estilo, su hora, su paleta de 24 colores distintos, sus íconos, sus letreros y su vida.
  - Las otras horas no cambian: cada hora de Vietnam devuelve la misma paleta de antes, la mañana de Colombia también, y los tramos de Saigón, Hội An y la Comuna 13 siguen con su estilo.
  - A otra hora, cada lugar nuevo queda pendiente y dice qué hora pinta.
  - La vista de lado: `vista` mal escrita da error, el dibujo va en 0 aunque se pida 0.35, `escenario.json` trae `vista` y las mismas capas de siempre, el piso llega a la fila 360 sin un pixel transparente y el frente va libre. El dojo no trae el campo.
  - Tao Đàn calza con `DaCau.ts`: los carriles en las filas 304 y 316, las rayas de la cancha en las filas 298 y 322 y nada oscuro en la columna de la red. El tai chi va en la vida y la capa cerca va sin la gente que se mueve.
  - La cancha de tejo calza con `Tejo.ts`: la caja de x 534 a 584 con el pie en la fila 300, el palo hasta la 248, el bocín en (548, 280), la raya en x 104 y el letrero donde el juego escribe, con contraste de más de 7:1 para su color. El piso no se moja bajo techo.
  - El camino de una arena con la caja de greda pasa, y un muro de lado a lado más alto que el salto sigue fallando.
  - El dojo: el tatami verde y amarillo con su borde rojo, la bandera, los vidrios transparentes y la Torre de la Tortuga en un ventanal en todo el recorrido de la cámara. Monserrate con su iglesia en la ventana grande de la cancha.
  - La vida: la del público y los banderines tapa entero (el cuadro 0 calza con lo pintado) y la de las hojas y la llovizna solo va donde se ve afuera.
  - Las luces sin pasarse de 12 y las postales a 0, 2 y 4 segundos.
  - Imagen dorada `golden/saigon_e4a.png`: el hẻm de mañana y el río en la tarde dorada. La saqué antes de tocar el motor.
  - Imagen dorada `golden/lugares_e4a.png`: los tres escenarios a los 2 segundos.
- **Comparación byte a byte:** los 8 escenarios que ya estaban salen idénticos, archivo por archivo, con postales y ficha.
- **Las pruebas de escenarios** (`hoian`, `caracas`, `comuna13`, `oblique` y `vehiculos`): 67 de 67.
- **`custom.test.ts`:** el kit de Nekketsu trae 11 escenarios, 510 PNG. 15 de 15, en 177 s.
- **`tsc` limpio y `npm run build:sitio` limpio:** el kit del sitio sale con `judo_hanoi`, `tao_dan` y `candelaria`, cada uno con sus 9 pruebas en verde.
- **Suite completa: 35 archivos, 369 de 369.** `npm run build:sitio` limpio y e2e de Playwright 50 de 50, ya con lo último de E3c mezclado.

**Las 9 pruebas** (en cada `verificacion.md`):
- **Legibilidad:**
  - `judo_hanoi`: contraste mediano 7.4:1, el peor 5.2:1. El tatami y la madera clara.
  - `tao_dan`: mediano 4.7:1, el peor 3.7:1. El pasto y la tierra roja.
  - `candelaria`: mediano 5.1:1, el peor 2.3:1, detrás de las ruanas oscuras de la banca.
- **Peso, en la pantalla:** 4, 3 y 3 luces (máx 12), 6, 4 y 4 piezas animadas (máx 16) y 0, 0 y 1 objetos.
- **Paleta:** 24, 24 y 23 de los 24 colores.

## Para aprobar (todo en esta carpeta)

- `mismo_juego.png`: el hẻm aprobado al lado de los tres, con atletas.
- `camara_del_juego.png`: lo que ve la cámara de cada prueba, con su zoom (judo 1.5, đá cầu 1.15 y tejo 1).
- `judo_hanoi_judo.gif`, 6 segundos:
  - Sophie y Kenji se acercan en el tatami, Sophie lo agarra, lo tiene y lo lanza por encima.
  - Kenji cae de espaldas y se levanta.
  - Rick y Alana celebran al borde y Thor mira sentado.
  - Se ven las hojas que caen afuera y el público que aplaude.
- `tao_dan_da_cau.gif`, 6 segundos:
  - Kenji saca, Rick corre y la levanta con el empeine, Sophie salta cerca de la red y la clava del otro lado.
  - Alana no llega.
  - Se ven el tai chi, los abuelos y los pájaros de las jaulas.
- `candelaria_tejo.gif`, 6 segundos:
  - Tres esperan su turno, Sophie lanza el tejo por debajo desde la raya y revienta una mecha.
  - Se ven los banderines, la gente con ruana que levanta el tinto y la llovizna en las ventanas.
- Una carpeta por escenario (`judo_hanoi/`, `tao_dan/`, `candelaria/`) con sus postales a 0, 2 y 4 segundos, la imagen ampliada al doble, `ficha_arte.md` y `verificacion.md`.

## Decisiones que tomé sin preguntar

1. **El dojo es de tarde.** El PEDIDO pone `hanoi_dojo` en la tarde, con ventanales al lago Hoàn Kiếm, la Torre de la Tortuga, caligrafía, hojas cayendo afuera y público al borde. Tomé todo eso. El fondo de hoy del juego es el lago de madrugada con un tatami al aire libre: Rick pidió un dojo, así que el lago va por las ventanas.
2. **El id es `judo_hanoi`,** como lo pidió Rick. El PEDIDO lo llamaba `hanoi_dojo`.
3. **La vista de lado es un campo del layout** (`vista: "lado"`) y no una capa nueva. El motor ya pintaba con inclinación 0: lo aproveché. Las capas se llaman igual que siempre (la capa cerca es el fondo), así el juego las carga con el mismo `pintarEscenario`. `escenario.json` solo suma `vista` y `nota_vista`.
4. **Las franjas salen del juego:** 290 a 330 en Tao Đàn (el `PISO` de `DaCau.ts` es la 310 y sus filas 304 y 316) y 286 a 310 en la cancha de tejo (el `PISO` de `Tejo.ts` es la 300, los que esperan en la 296).
5. **La red la dibuja el juego** y no la pinté. Las rayas de la cancha sí van pintadas, gastadas, en el mismo sitio que las del juego.
6. **La caja de greda es un objeto del layout** (`caja_greda`), con la forma exacta de `armarCaja()`. Mide 52 de alto, más que el salto: por eso la prueba de camino de una arena ahora cuenta el piso y no el techo de las cajas.
7. **El arte pinta la greda y el bocín. Las mechas y los tejos los sigue pintando el juego,** porque revientan y caen durante la partida. Las mechas pintadas van en las cajitas, en el tablero de las reglas y en el afiche.
8. **La greda sobresale del marco:** la línea donde el juego pone el bocín y las mechas queda 5 px arriba del borde de la caja. Así el bocín y las mechas del juego caen sobre la greda y no en el aire.
9. **El letrero de la cancha va donde el fondo de hoy tenía su tabla** (x 380 a 500, fila 196 a 214), así el texto CANCHA DE TEJO que pone el juego cae encima.
10. **La paleta se elige por el fondo y no por la hora.** El amanecer de Vietnam sigue siendo la paleta de la mañana para cualquier otro layout y la tarde dorada de Saigón no cambia.
11. **Los nombres de los estilos:** `vietnam_dojo`, `vietnam_parque` para Tao Đàn y `colombia_colonial`, que es el nombre que el PEDIDO ya tenía para Colombia colonial.
12. **El registro de lugares es solo para los nuevos.** Mover Hội An, Caracas o la Comuna 13 ahí arriesgaba cambiar bytes de lo aprobado.
13. **Los tonos de al lado** (`MAS_CLARO` y `MAS_OSCURO`) se mudaron a `tonos.ts` para cortar un ciclo de importación. `inclinada.ts` los sigue exportando.
14. **Lo que se ve por las ventanas es la capa lejos,** con su paralaje: se corre un poco con la cámara, como una ventana de verdad. La Torre de la Tortuga queda en un ventanal en todo el recorrido de la cámara del judo.
15. **En Tao Đàn, lo que se mueve va solo en la vida** (la capa cerca va sin el tai chi, los abuelos y los pájaros), porque se mueve sobre partes transparentes. En el dojo y la cancha el público se mueve sobre una pared entera, así que va como en Hội An: un recorte de la capa.
16. **El público del dojo:** familias en la banca y judocas en seiza adelante. El sitio de Thor (x 70) queda libre.
17. **Los letreros son reales y sin marcas:** VÕ ĐƯỜNG NHU ĐẠO HÀ NỘI (dojo de judo de Hà Nội), TÂM (corazón) y NHẪN (paciencia) en la caligrafía, CÔNG VIÊN TAO ĐÀN, las reglas del tejo y TORNEO DE TEJO SÁBADO. No puse cerveza ni marcas en la cancha.
18. **Thor va en el layout del dojo como entidad en y 0,** con una nota: el layout no acepta y negativa y el juego lo sienta en la fila 240.
19. **Sin concepto para estos tres:** los comparé contra el estilo del hẻm, Caracas y Hội An.
20. **Los GIF usan el kit con los packs de hoy.** El motor no tiene `judo_grip` ni `judo_throw`: el judo usa `grab`, `grab_hold`, `grabbed`, `grab_throw`, `thrown_spin`, `land_flat` y `fall_getup`. El đá cầu usa `volley`, `jump` y `air_kick` (`header` no me cuadró en la jugada). El tejo usa `weapon_throw`, como el juego.

## Límites honestos

- **Cada lugar pinta solo su hora:** el dojo y la cancha de tarde, Tao Đàn al amanecer. A otra hora quedan pendientes y lo dicen.
- **Son de una pantalla,** como sus pruebas. Un layout más largo con el mismo fondo estira lo de la derecha.
- **En los GIF, la red, el volante, el tejo y las mechas los dibujé yo imitando al juego.** No es el juego corriendo.
- **El bocín sale dos veces** si el juego sigue dibujando el suyo: el del arte es el aro de metal y el del juego un óvalo oscuro encima, en el mismo punto. Se ve bien, pero sobra uno.
- **Si el juego no sube la cara a `PISO + 1`,** la caja del arte tapa las mechas y los tejos.
- **El público del dojo y de la cancha es de pixel art propio, chiquito y sencillo,** de 2 cuadros. No reacciona a los puntos.
- **Las hojas y la llovizna son vida en bucle** detrás de los vidrios: no caen con física.
- **La legibilidad más baja es 2.3:1** en la cancha de tejo, detrás de las ruanas oscuras. Pasa, pero es la más justa de los tres.
- **Tao Đàn no tiene la reja ni la calle con las motos** del fondo de hoy. Tiene un solo banco de piedra.
- **Monserrate es una silueta simple:** la iglesia, el teleférico y la neblina. Guadalupe queda sin su virgen.
- **No corrí el juego con el arte.** Lo que tiene que conectar va arriba, con los nombres de sus funciones.

## Lo que necesita el siguiente lote

- **El juego:**
  - Conectar los tres escenarios en `Fight.ts` (judo), `DaCau.ts` y `Tejo.ts` como dice arriba, y quitar `bg_hanoi`, `bg_taodan` y `bg_candelaria` cuando el arte esté.
  - En el tejo, subir `pintarCara()` a `PISO + 1` y quitar `armarCaja()`.
  - Decidir si quedan las rayas de la cancha del juego o solo las pintadas.
- **El motor (si Rick lo quiere):**
  - El pack `judo` con `judo_grip`, `judo_throw` y `judo_thrown`, y `tejo_throw`, que pide el PEDIDO.
  - El pack de fútbol sin la pelota pintada, para que el đá cầu use `volley` y `header` de verdad.
  - Otras horas de estos lugares, si alguna prueba las pide.
- **Dependencia:** esta rama sale de `claude/olimpico-lote-e3c` (Hội An). Se une después de E3c.
