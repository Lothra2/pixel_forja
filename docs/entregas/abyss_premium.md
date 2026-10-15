# GG Abyss premium: los siete mundos con vida

Rama: `claude/abyss-premium`, sale de `claude/abyss-final` (`e5af0ee`). Un commit por mundo, push normal, sin PR.
El motor del juego pone la gradación, los rayos, la niebla en capas, las partículas y la luz sobre los personajes;
acá está el arte y los datos que el juego lee. Detalle para el juego en `docs/KIT_JUEGO.md`, sección
"Abyss premium".

| Commit | Qué |
|---|---|
| `0a68fa9` | Mundo 1 y las herramientas comunes (escultor, piso, fauna, colocación, niebla, kit) |
| `734c0cd` | Mundo 2, la Catedral |
| `6f6e25c` | Mundo 3, las Galerías |
| `71d400a` | Mundo 4, el Puerto |
| `41efc09` | Mundo 5, la Ciudad |
| `99c0ec3` | Mundo 6, la Fragua |
| `4cea7c6` | Mundo 7, el Corazón |
| `f58af6b` | #34, cuellos de botella, `KIT_JUEGO.md` y el script de láminas |
| (este) | escaleras libres, tope de tiempo de la prueba del kit, láminas y esta entrega |

## Cómo está hecho

Todo dibujado por código en el taller, sin arte bajado ni fotos. Sin sangre (las alas del Diablo no se tocaron).
Nada se sacó: los objetos, enemigos, cofres, mecánicas, colisiones, zonas y postales de antes siguen donde estaban.

- **El escultor** (`src/engine/world/abyss/escultor.ts`): los monumentos se dibujan con volúmenes (esferas, cápsulas,
  cajas en 3/4, cilindros y polígonos con bisel). Cada pixel guarda material y normal; al final se ilumina con la luz de
  siempre del kit (arriba a la izquierda), se pasa a la rampa del material con un tramado corto, se oscurece lo de
  atrás pegado a lo de adelante y se cierra con un contorno del tono más oscuro del material. Así los 69 monumentos
  hablan el mismo idioma.
- **El piso** (`piso.ts`): repinta la imagen del suelo encima de lo que había, por tipo de piso (pasto, camino, plaza,
  escalera; los muros y el agua casi no se tocan). Variación grande de luz y tono en escalones, manchas de material con
  borde tramado, desgaste de los caminos (centro gastado, orillas pisoteadas), bordes mezclados entre materiales,
  grietas con el canto claro, raíces, charcos con reflejo y cosas sueltas (piedritas, hojas, ramitas, conchas, carbón,
  clavos, esquirlas, partituras, huesitos). Nunca cambia el alfa ni el tamaño: el agua queda donde estaba y la
  colisión es la misma.
- **La colocación** (`index.ts`): un monumento por zona, sólido solo en su base (12 px de alto). Para cada lugar
  posible se exige: base sobre piso caminable que hoy se alcanza; que todo lo que se alcanzaba desde la llegada se siga
  alcanzando (BFS) y que la base no parta el piso de alrededor (no tapa pasillos aunque haya rodeo); nada delante de
  puertas ni pasos angostos; nunca en un puente, un istmo ni una escalera; lejos de entidades, cofres, cristales, grietas, hielo
  fino, mareas, arenas de jefe y de los cuadros `tapar` de los ramales; sin tapar el pie de ningún objeto ni montarse
  más de 12 % sobre otro (la misma regla del bosque premium); a 5 cuadros o más de otro monumento. Si no hay lugar,
  prueba niveles con menos aire, y en los rincones secretos chicos el último nivel lo apoya contra la pared del fondo
  (la base cae sobre roca que ya era sólida: no cambia la colisión).
- **Las pruebas** (`src/engine/__tests__/abyss.test.ts`, una por mundo): piso del mismo tamaño y alfa, sin dos cuadros
  iguales; un monumento por zona dentro de 64 x 64 a 128 x 160 con sombra y sólido solo en la base; la colisión solo
  cambia debajo de las bases y solo a sólido; todo cofre, fogata, portal, arena y zona que se alcanzaba se sigue
  alcanzando; 8 criaturas nuevas o más con su comportamiento; ninguna criatura encima de otra; cada zona con
  partículas conocidas que conservan las de antes, `rayos` y `grado` bien escritos; menos de 2 MP nuevos.

## Propiedades nuevas (para el juego)

- **Zona:** `rayos` = `"angulo,#color,densidad"` (grados desde la vertical, densidad 0 a 1, 0 sin rayos) y
  `grado` = `"#sombras,#luces,contraste,saturacion"` (contraste y saturación entre 0.8 y 1.3). En todas las zonas de
  los 7 mundos. Si una zona nueva no los trae: `mundos[i].luz_zonas.defecto`.
- **Mundo:** `monumentos` (objeto, zona, punto, historia), `luz_zonas.defecto`, `criaturas_nuevas.especies` y
  `niebla.jirones_mundo` (los jirones teñidos con el color de la niebla del mundo).
- **Criaturas:** cada especie nueva trae `quieto` y `huir` (y `huye`, el mismo archivo), y
  `comportamiento: { huye, se_esconde, corre }`. Las que vuelan llevan además `vuela: true` (dato extra: hoy el juego
  no lo lee). Ninguna vive en el agua, así que ninguna lleva `agua`. Sin `sonido` (no hay audio nuevo).
- **Partículas:** no propongo tipos nuevos. Cada zona conserva las de antes y suma otras de las que el juego ya conoce,
  con los nombres que usan las zonas (`luciernagas`, `brasas`, `polvo_sueno`...). La lista del encargo usaba los
  nombres de las hojas (`luciernaga`, `brasa`); en las zonas uso los de siempre para no romper nada.
- **Niebla:** `mundo/niebla_jirones.png` ya pega por los 4 lados (antes el estirado corría el período a 512 y quedaba
  la costura). Se cambió solo ese archivo; `niebla_nubes.png` ya pegaba. Test nuevo que mide el salto en el borde.

## Fauna nueva

| Mundo | Especies | huye (px) | se_esconde | corre (px/s) |
|---|---|---|---|---|
| 1 | `polilla_luz` (vuela) y `erizo` (se hace bolita) | 70 y 50 | no y sí | 60 y 40 |
| 2 | `raton_catedral` y `salamandrita` | 60 y 45 | sí y sí | 90 y 70 |
| 3 | `cangrejo_cristal` (se entierra) y `topo_minero` (con su velita) | 55 y 40 | sí y sí | 55 y 35 |
| 4 | `cangrejito` y `gaviota` (vuela) | 50 y 90 | sí y no | 65 y 80 |
| 5 | `gato_piedra` (abre los ojos) y `paloma_dormida` (vuela) | 60 y 70 | sí y no | 85 y 60 |
| 6 | `escarabajo_brasa` y `raton_hollin` | 45 y 60 | sí y sí | 50 y 95 |
| 7 | `zorro_nieve` y `armino` (se para a mirar) | 80 y 55 | no y sí | 110 y 100 |

12 por mundo (6 de cada especie), cerca de los monumentos y de los caminos. Lámina: `premium_fauna.png`.

## Memoria (iPad)

Los pisos repintados tienen exactamente el mismo tamaño en pixeles que antes (y los mismos trozos de 960). Lo nuevo por
mundo, contando todos los cuadros de cada animación y cada sombra:

| Mundo | Monumentos + sombras | Fauna | Niebla teñida | Total |
|---|---|---|---|---|
| 1 Bosque | 0.28 MP | 0.01 | 0.07 | 0.35 MP |
| 2 Catedral | 0.17 | 0.01 | 0.07 | 0.24 |
| 3 Galerías | 0.18 | 0.01 | 0.07 | 0.25 |
| 4 Puerto | 0.21 | 0.01 | 0.07 | 0.28 |
| 5 Ciudad | 0.20 | 0.01 | 0.07 | 0.27 |
| 6 Fragua | 0.19 | 0.01 | 0.07 | 0.26 |
| 7 Corazón | 0.22 | 0.01 | 0.07 | 0.29 |

Los monumentos son de un solo cuadro (las luces que titilan las pone el juego con su `luz`): por eso pesan poco.

## Piso: cuánto se repite

Diferencia media mínima entre 10 cuadros de 32 x 32 tomados al azar del piso caminable (0 = hay dos idénticos).
Antes → después: Bosque 5.7 → 6.9, Catedral 3.7 → 8.1, Galerías 4.9 → 6.9, Puerto 5.6 → 5.5, Ciudad 8.3 → 10.6,
Fragua 1.2 → 9.1, Corazón 5.2 → 14.1. Es una medida gruesa: en el Puerto casi no se mueve porque las tablas ya
variaban y lo nuevo son detalles chicos (charcos, algas, sal, conchas), que se ven en la lámina pero no mueven el
promedio.

## Láminas

`scripts/lamina-premium.ts` las rehace. En `docs/entregas/`:
- `premium_mundoN_antes_despues.png`: la misma pantalla antes y después (la del primer monumento del mundo).
- `premium_mundoN_monumentos.png`: los monumentos del mundo a escala 2 con su sombra.
- `premium_fauna.png`: las 14 especies, `quieto` y `huir`, a escala 4.

## Mundo por mundo

### 1. Bosque GG

- **Piso:** 3840 x 2880 px como antes (mismo alfa, misma colisión). Repintado con 724247 px de manchas, 161 grietas, 37 raíces, 27 charcos y 20476 cosas sueltas.
- **Criaturas nuevas:** polilla_luz x 6, erizo x 6.
- **#34:** cuervo y cuervo en 2605,1488: cuervo a 2576,1456; rana y pez en 1840,2416: pez a 1872,2384.
- **Memoria nueva:** 0.28 MP de monumentos con sus sombras + 0.01 MP de fauna + 0.07 MP de niebla teñida = **0.35 MP** (tope 2).
- **Alcance:** 30 metas (cofres, fogatas, portales, arenas y zonas) alcanzables desde la llegada antes y 30 después.

| Zona | Monumento | Tamaño | Base sólida | Dónde (px) | Qué cuenta |
|---|---|---|---|---|---|
| Claro de la Llegada | `mon_bosque_carreta` | 112 x 80 | 56 x 12 | 320, 2396 | La carreta de los primeros viajeros, volcada; ahora le crecen flores adentro. |
| Pradera de las Mariposas | `mon_bosque_hada` | 80 x 128 | 40 x 12 | 720, 2268 | El hada de piedra que cuidaba la pradera, con un ala rota; una mariposa de luz se le posa en la mano. |
| El Abuelo Roble | `mon_bosque_piedra_nombres` | 72 x 112 | 36 x 12 | 1088, 1628 | La piedra de los nombres: las manos de una familia talladas de grande a chica, y velas que alguien todavía prende. |
| Bosque Profundo | `mon_bosque_arbol_hueco` | 100 x 140 | 48 x 12 | 800, 1340 | El árbol abuelo hueco: algo vive en el tronco y abre los ojos cuando pasas. |
| Anillo de las Hadas | `mon_bosque_trono_hongos` | 80 x 96 | 40 x 12 | 304, 828 | El trono de hongos donde la reina de las hadas daba audiencia; todavía gotea luz turquesa. |
| Claro Escondido | `mon_bosque_altar_ciervo` | 96 x 96 | 64 x 12 | 352, 284 | El altar del ciervo blanco: los cuernos sobre la laja y bayas que alguien deja de ofrenda. |
| Arroyo Cristalino | `mon_bosque_molino` | 112 x 112 | 72 x 12 | 1648, 1500 | El molino del arroyo: la rueda se soltó y quedó apoyada en la casita sin techo. |
| Lago Espejo | `mon_bosque_barca` | 112 x 72 | 72 x 12 | 2240, 2396 | La barca del pescador, varada entre juncos con la red adentro, como si fuera a volver. |
| Ruinas del Viejo Reino | `mon_bosque_cabeza_rey` | 120 x 96 | 80 x 12 | 2256, 1820 | La cabeza del rey del viejo reino, caída de costado con la corona rajada y musgo en la barba. |
| Colina de los Goblins | `mon_bosque_totem_goblin` | 72 x 144 | 30 x 12 | 3152, 1980 | El tótem de los goblins: tres caras apiladas, plumas, ollas y el cuerno de guerra. |
| Campo de Calabazas | `mon_bosque_calabaza_casa` | 112 x 112 | 80 x 12 | 2800, 2492 | La calabaza gigante que alguien vació para vivir adentro: hay luz en la ventana. |
| Las Alturas | `mon_bosque_torre_vigia` | 88 x 156 | 56 x 12 | 2512, 508 | La torre del vigía, partida a la mitad, con el estandarte azul del viejo reino todavía colgado. |
| Arena del Minotauro | `mon_bosque_hacha_minotauro` | 96 x 128 | 80 x 12 | 3056, 220 | El hacha del primer minotauro, clavada en la roca que partió de un golpe. |

| Zona | Partículas (antes → ahora) | rayos | grado |
|---|---|---|---|
| Claro de la Llegada | polen → polen,mariposas | `-22,#ffe9a8,0.65` | `#1c2a24,#ffe6b0,1.06,1.12` |
| Pradera de las Mariposas | mariposas,polen → mariposas,polen | `-18,#fff0c0,0.7` | `#22302a,#fff2c8,1.04,1.18` |
| El Abuelo Roble | hojas,luciernagas → hojas,luciernagas | `-25,#ffd890,0.75` | `#1a2418,#ffd8a0,1.1,1.08` |
| Bosque Profundo | luciernagas,esporas,fuegos_fatuos,murcielagos → luciernagas,esporas,fuegos_fatuos,murcielagos | `-30,#b8e0c8,0.25` | `#0a141c,#a8c8e8,1.18,0.92` |
| Anillo de las Hadas | luciernagas,brillos,fuegos_fatuos → luciernagas,luciernagas_turquesa,brillos,fuegos_fatuos | `-10,#a8fff0,0.45` | `#0e1a24,#a8fff0,1.14,1.15` |
| Claro Escondido | brillos,luciernagas → brillos,luciernagas,mariposas | `-15,#e8c8ff,0.5` | `#160e24,#e0c8ff,1.12,1.1` |
| Arroyo Cristalino | luciernagas → gotas,luciernagas | `-20,#e0f4ff,0.5` | `#10202a,#e0f0ff,1.06,1.05` |
| Lago Espejo | luciernagas,mariposas → luciernagas,mariposas | `-24,#ffe9c0,0.55` | `#0e1e2a,#ffe8c8,1.06,1.06` |
| Ruinas del Viejo Reino | polvo → polvo,hojas | `-28,#ffd8a8,0.6` | `#1e1a18,#ffd8b0,1.12,0.95` |
| Colina de los Goblins | humo → humo,polvo | `-20,#ffc890,0.5` | `#24180e,#ffc890,1.12,1.0` |
| Campo de Calabazas | hojas → hojas,luciernagas | `-35,#ffb060,0.65` | `#24140a,#ffc080,1.1,1.12` |
| Las Alturas | polen,hojas → polen,hojas | `-15,#fff4d8,0.8` | `#1e2a30,#fff8e0,1.05,1.08` |
| Arena del Minotauro | brasas → brasas,polvo | `0,#ffb08a,0.3` | `#1a0e0a,#ffb08a,1.2,1.05` |

### 2. La Catedral de las Raíces

- **Piso:** 2560 x 2048 px como antes (mismo alfa, misma colisión). Repintado con 185008 px de manchas, 1374 grietas, 200 raíces, 115 charcos y 1913 cosas sueltas.
- **Criaturas nuevas:** raton_catedral x 6, salamandrita x 6.
- **Memoria nueva:** 0.17 MP de monumentos con sus sombras + 0.01 MP de fauna + 0.07 MP de niebla teñida = **0.24 MP** (tope 2).
- **Alcance:** 18 metas (cofres, fogatas, portales, arenas y zonas) alcanzables desde la llegada antes y 18 después.

| Zona | Monumento | Tamaño | Base sólida | Dónde (px) | Qué cuenta |
|---|---|---|---|---|---|
| La Escalera Hundida | `mon_catedral_angel` | 96 x 128 | 56 x 12 | 640, 252 | El ángel de piedra arrodillado al pie de la escalera, atado al piso por las raíces que bajaron con él. |
| El Atrio de las Luciérnagas | `mon_catedral_pila` | 88 x 88 | 36 x 12 | 608, 764 | La pila bautismal desbordada: su agua quedó brillando turquesa y las luciérnagas vienen a beber. |
| Los Claustros Quebrados | `mon_catedral_organo` | 120 x 156 | 76 x 12 | 1024, 860 | El órgano de raíces: los tubos se volvieron raíz y suenan solos cuando entra el viento. |
| La Capilla Escondida | `mon_catedral_relicario` | 72 x 88 | 52 x 12 | 2112, 796 | El relicario de oro que los monjes escondieron, con tres velas que nunca se apagan. |
| La Nave Inundada | `mon_catedral_pulpito` | 96 x 120 | 40 x 12 | 544, 1404 | El púlpito hundido de costado en el agua que subió del piso; la escalera sube a ninguna parte. |
| La Forja Apagada | `mon_catedral_monje_herrero` | 96 x 136 | 56 x 12 | 1792, 1372 | El monje herrero de piedra con el martillo en alto; en su yunque frío queda una sola brasa. |
| El Campanario Invertido | `mon_catedral_roseton` | 112 x 120 | 72 x 12 | 2288, 1436 | El rosetón que se cayó del campanario y quedó apoyado en los escombros, con los vidrios verdes y de oro. |

| Zona | Partículas (antes → ahora) | rayos | grado |
|---|---|---|---|
| La Escalera Hundida | polvo → polvo,esporas | `-12,#e8f0c8,0.55` | `#18241e,#ffe0b0,1.08,0.92` |
| El Atrio de las Luciérnagas | luciernagas_turquesa,gotas → luciernagas_turquesa,gotas | `-8,#8affe8,0.4` | `#0e2420,#c8ffe0,1.1,0.95` |
| Los Claustros Quebrados | polvo,gotas → polvo,esporas,gotas | `-20,#d0e090,0.5` | `#1a2a1a,#ffd890,1.14,0.88` |
| La Capilla Escondida | luciernagas_turquesa → luciernagas_turquesa,brillos | `-5,#ffd070,0.6` | `#1a1a10,#ffe0a0,1.12,0.95` |
| La Nave Inundada | gotas → gotas,luciernagas_turquesa | `-18,#a0d0c0,0.35` | `#0a1a1e,#b0e0d0,1.1,0.85` |
| La Forja Apagada | polvo → ceniza,polvo | `0,#ffb070,0.25` | `#1e140e,#ffc890,1.15,0.9` |
| El Campanario Invertido | esporas,gotas → esporas,gotas | `0,#c8a0ff,0.2` | `#140e1e,#ffd9a0,1.18,0.88` |

### 3. Las Galerías del Eco

- **Piso:** 3200 x 2560 px como antes (mismo alfa, misma colisión). Repintado con 235370 px de manchas, 741 grietas, 0 raíces, 96 charcos y 2366 cosas sueltas.
- **Criaturas nuevas:** cangrejo_cristal x 6, topo_minero x 6.
- **Memoria nueva:** 0.18 MP de monumentos con sus sombras + 0.01 MP de fauna + 0.07 MP de niebla teñida = **0.25 MP** (tope 2).
- **Alcance:** 25 metas (cofres, fogatas, portales, arenas y zonas) alcanzables desde la llegada antes y 25 después.

| Zona | Monumento | Tamaño | Base sólida | Dónde (px) | Qué cuenta |
|---|---|---|---|---|---|
| La Boca de la Mina | `mon_galerias_cabria` | 96 x 148 | 72 x 12 | 432, 348 | La cabria de la boca de la mina: la rueda que bajaba a los mineros, con el balde colgando todavía. |
| Los Rieles | `mon_galerias_carrito` | 112 x 80 | 80 x 12 | 1328, 412 | El carrito de mina volcado con los cristales que nunca llegaron arriba. |
| La Sala del Eco | `mon_galerias_geoda` | 112 x 112 | 96 x 12 | 2608, 540 | La geoda gigante partida al medio: sus cristales violetas repiten cada sonido de la sala. |
| El Puente Colgante | `mon_galerias_campana_aviso` | 80 x 120 | 60 x 12 | 1472, 1308 | La campana de aviso de la mina, con la soga cortada: nadie llegó a tocarla. |
| El Lago de Cristal | `mon_galerias_barca_minero` | 112 x 80 | 72 x 12 | 752, 1148 | La barca del minero atada a su estaca, con el farol cian que sigue prendido. |
| El Campamento Abandonado | `mon_galerias_carpa` | 112 x 96 | 88 x 12 | 704, 2076 | La carpa remendada del campamento, con la olla sobre un fuego que se apagó hace años. |
| La Cueva de la Reina | `mon_galerias_capullo` | 88 x 148 | 52 x 12 | 2240, 1948 | El capullo vacío de la Polilla Reina, colgado de la estalagmita y abierto de un tajo. |
| La Veta Escondida | `mon_galerias_ambar` | 64 x 100 | 40 x 12 | 1472, 124 | El cristal de ámbar gigante con una polilla atrapada desde antes de que existiera la mina. |
| El Nicho del Minero | `mon_galerias_memorial` | 64 x 64 | 28 x 12 | 432, 1788 | El casco y el pico del último minero sobre una roca, con una vela y una foto borrosa. |

| Zona | Partículas (antes → ahora) | rayos | grado |
|---|---|---|---|
| La Boca de la Mina | polvo → polvo,gotas | `-20,#d8e8ff,0.55` | `#0a1018,#d0e8ff,1.08,0.92` |
| Los Rieles | polvo → polvo | `0,#c8a070,0` | `#0c0c10,#ffd0a0,1.12,0.9` |
| La Sala del Eco | brillos → brillos,polvo | `0,#a88aff,0.15` | `#0c0618,#c0a8ff,1.16,1.05` |
| El Puente Colgante | brasas_frias → brasas_frias,gotas | `-5,#6a8ad8,0.2` | `#04060e,#8ab0ff,1.18,0.95` |
| El Lago de Cristal | brillos → brillos,gotas | `-10,#5ae8ff,0.3` | `#04101a,#8af0ff,1.12,1.08` |
| El Campamento Abandonado | humo → humo,polvo | `0,#ffb35a,0` | `#100a06,#ffc080,1.1,0.95` |
| La Cueva de la Reina | ceniza → ceniza,brillos | `0,#b07aff,0.1` | `#0a0414,#c890ff,1.2,1.0` |
| La Veta Escondida | brillos → brillos | `0,#ffb35a,0.2` | `#100a04,#ffd080,1.12,1.1` |
| El Nicho del Minero | polvo → polvo,gotas | `0,#ffb35a,0` | `#0c0a08,#ffc890,1.1,0.9` |

### 4. El Puerto Ahogado

- **Piso:** 3520 x 2880 px como antes (mismo alfa, misma colisión). Repintado con 339400 px de manchas, 390 grietas, 0 raíces, 371 charcos y 2781 cosas sueltas.
- **Criaturas nuevas:** cangrejito x 6, gaviota x 6.
- **Memoria nueva:** 0.21 MP de monumentos con sus sombras + 0.01 MP de fauna + 0.07 MP de niebla teñida = **0.28 MP** (tope 2).
- **Alcance:** 26 metas (cofres, fogatas, portales, arenas y zonas) alcanzables desde la llegada antes y 26 después.

| Zona | Monumento | Tamaño | Base sólida | Dónde (px) | Qué cuenta |
|---|---|---|---|---|---|
| El Muelle de Llegada | `mon_puerto_ancla` | 96 x 116 | 32 x 12 | 528, 412 | El ancla gigante de un barco que nadie vio llegar, clavada en las tablas del muelle. |
| La Calle de las Redes | `mon_puerto_secadero` | 112 x 100 | 96 x 12 | 1232, 508 | El secadero de redes con un pez enorme que nadie bajó antes de que subiera el mar. |
| El Mercado Hundido | `mon_puerto_balanza` | 100 x 124 | 40 x 12 | 1888, 476 | La balanza del mercado, oxidada: un platillo lleno de agua y el otro de conchas. |
| La Iglesia de la Campana Ahogada | `mon_puerto_mascaron` | 80 x 132 | 56 x 12 | 2768, 604 | El mascarón de proa de una mujer con un farol en las manos; el farol todavía tiene luz. |
| Los Botes Volteados | `mon_puerto_barco_partido` | 128 x 112 | 96 x 12 | 3056, 1180 | La proa de un barco partido en dos; la otra mitad se la llevó el mar. |
| El Astillero | `mon_puerto_esqueleto` | 128 x 100 | 104 x 12 | 704, 1372 | El esqueleto de un barco que nunca se terminó, sobre sus calzos, con el martillo olvidado. |
| La Cueva de las Medusas | `mon_puerto_almeja` | 96 x 84 | 72 x 12 | 1136, 2268 | La almeja gigante abierta, con una perla que alumbra violeta en la oscuridad. |
| El Faro | `mon_puerto_lente` | 100 x 100 | 80 x 12 | 2672, 2012 | La lente del faro, caída y rajada, que sigue juntando la poca luz que queda. |
| El Patio de las Redes | `mon_puerto_cajas` | 72 x 84 | 60 x 12 | 1216, 124 | La pila de cajas y barriles de sal del pescadero, con su gaviota de madera tallada. |
| La Gruta del Ancla | `mon_puerto_timon` | 72 x 84 | 48 x 12 | 1488, 1852 | El timón del barco del capitán, apoyado contra la roca de la gruta. |

| Zona | Partículas (antes → ahora) | rayos | grado |
|---|---|---|---|
| El Muelle de Llegada | ceniza → ceniza,gotas | `-14,#c8d0c8,0.3` | `#101a1c,#e8e0c0,1.08,0.8` |
| La Calle de las Redes | ceniza → ceniza,gotas | `-10,#b8c0b8,0.2` | `#0c1416,#d8d0b0,1.1,0.8` |
| El Mercado Hundido | ceniza → ceniza,gotas | `-12,#b8c4bc,0.25` | `#0c1618,#d8d8c0,1.1,0.8` |
| La Iglesia de la Campana Ahogada | ceniza → ceniza,polvo | `-6,#ffd890,0.35` | `#0e1214,#ffe0a0,1.15,0.82` |
| Los Botes Volteados | ceniza → ceniza,gotas | `-16,#c0c8c8,0.25` | `#0a1416,#d0d8d0,1.08,0.8` |
| El Astillero | ceniza → ceniza,polvo | `-20,#d8c8a0,0.3` | `#140e0a,#e8d0a0,1.12,0.85` |
| La Cueva de las Medusas | brillos → brillos,gotas | `0,#8a5aff,0.15` | `#08061a,#c8a0ff,1.18,1.05` |
| El Faro | ceniza → ceniza,brillos | `-30,#ffd890,0.7` | `#0e1214,#ffe090,1.2,0.9` |
| El Patio de las Redes | ceniza → ceniza | `-8,#ffc070,0.3` | `#120e0a,#ffd090,1.1,0.85` |
| La Gruta del Ancla | brillos → brillos,gotas | `0,#8a5aff,0.1` | `#08061a,#b890ff,1.15,1.0` |

### 5. La Ciudad Dormida

- **Piso:** 3520 x 3200 px como antes (mismo alfa, misma colisión). Repintado con 131896 px de manchas, 1818 grietas, 0 raíces, 198 charcos y 4945 cosas sueltas.
- **Criaturas nuevas:** gato_piedra x 6, paloma_dormida x 6.
- **Memoria nueva:** 0.2 MP de monumentos con sus sombras + 0.01 MP de fauna + 0.07 MP de niebla teñida = **0.27 MP** (tope 2).
- **Alcance:** 29 metas (cofres, fogatas, portales, arenas y zonas) alcanzables desde la llegada antes y 29 después.

| Zona | Monumento | Tamaño | Base sólida | Dónde (px) | Qué cuenta |
|---|---|---|---|---|---|
| La Puerta de la Ciudad | `mon_ciudad_guardia` | 80 x 132 | 48 x 12 | 400, 476 | El guardia que se durmió de pie en la puerta, abrazado a la lanza y con el casco sobre los ojos. |
| La Calle de los Panaderos | `mon_ciudad_horno` | 112 x 100 | 96 x 12 | 912, 604 | El horno de pan con las hogazas hechas piedra; las brasas se volvieron lilas de sueño. |
| La Plaza de la Fuente | `mon_ciudad_reloj_plaza` | 64 x 152 | 28 x 12 | 2096, 508 | El reloj de la plaza, parado a las tres menos diez como la torre: la hora en que se durmió la ciudad. |
| El Barrio de los Músicos | `mon_ciudad_arpa` | 88 x 132 | 56 x 12 | 2848, 860 | El arpa gigante del barrio: una cuerda rota y las otras todavía vibran solas. |
| Los Jardines de Piedra | `mon_ciudad_cisne` | 100 x 88 | 40 x 12 | 544, 1532 | El cisne de piedra del estanque seco, dormido con la cabeza bajo el ala. |
| La Torre del Reloj | `mon_ciudad_engranaje` | 112 x 116 | 72 x 12 | 1520, 1468 | El engranaje gigante que se cayó de la torre y quedó clavado de canto en la calle. |
| El Puente de los Faroles | `mon_ciudad_farol_caido` | 116 x 84 | 100 x 12 | 2272, 1788 | El farol gigante que se cayó del puente: rajado, pero con la luz que le queda adentro. |
| El Palacio Dormido | `mon_ciudad_corona` | 100 x 84 | 88 x 12 | 2640, 2428 | Una corona gigante del Rey de Piedra, caída sobre su almohada de terciopelo. |
| El Corazón del Jardín | `mon_ciudad_arbol_piedra` | 80 x 120 | 24 x 12 | 704, 1788 | El árbol de piedra más viejo del jardín, con un pajarito de piedra dormido en su nido. |
| El Desván del Organillero | `mon_ciudad_organillo` | 68 x 80 | 52 x 12 | 3232, 188 | El organillo con su monito de juguete encima, con la manivela a medio girar. |

| Zona | Partículas (antes → ahora) | rayos | grado |
|---|---|---|---|
| La Puerta de la Ciudad | polvo_sueno → polvo_sueno,polvo | `-25,#f0c890,0.45` | `#1a1028,#ffd890,1.08,0.9` |
| La Calle de los Panaderos | polvo_sueno → polvo_sueno,humo | `-30,#ffc880,0.5` | `#20140e,#ffd090,1.1,0.95` |
| La Plaza de la Fuente | polvo_sueno → polvo_sueno,brillos | `-20,#ffd890,0.55` | `#1a1028,#ffe0a0,1.08,0.95` |
| El Barrio de los Músicos | polvo_sueno → polvo_sueno,brillos | `-15,#c8a8ff,0.4` | `#140c28,#d8c0ff,1.1,1.0` |
| Los Jardines de Piedra | polvo_sueno → polvo_sueno,mariposas | `-22,#c8c0e0,0.35` | `#101418,#d8d0f0,1.08,0.88` |
| La Torre del Reloj | polvo_sueno → polvo_sueno,polvo | `-35,#e0c8a0,0.45` | `#16101e,#f0d8b0,1.14,0.88` |
| El Puente de los Faroles | polvo_sueno → polvo_sueno,luciernagas | `-10,#b89aff,0.3` | `#0c0820,#c8b0ff,1.16,1.0` |
| El Palacio Dormido | polvo_sueno → polvo_sueno,brillos | `0,#ffd890,0.35` | `#1a1020,#ffe0a0,1.18,0.95` |
| El Corazón del Jardín | polvo_sueno → polvo_sueno,mariposas | `-10,#d0b0ff,0.4` | `#120c20,#e0c8ff,1.1,1.05` |
| El Desván del Organillero | polvo_sueno → polvo_sueno,polvo | `-40,#ffc070,0.5` | `#1a1008,#ffd090,1.1,0.95` |

### 6. La Fragua de las Luces

- **Piso:** 3520 x 3200 px como antes (mismo alfa, misma colisión). Repintado con 347343 px de manchas, 2032 grietas, 0 raíces, 0 charcos y 5076 cosas sueltas.
- **Criaturas nuevas:** escarabajo_brasa x 6, raton_hollin x 6.
- **Memoria nueva:** 0.19 MP de monumentos con sus sombras + 0.01 MP de fauna + 0.07 MP de niebla teñida = **0.26 MP** (tope 2).
- **Alcance:** 28 metas (cofres, fogatas, portales, arenas y zonas) alcanzables desde la llegada antes y 28 después.

| Zona | Monumento | Tamaño | Base sólida | Dónde (px) | Qué cuenta |
|---|---|---|---|---|---|
| La Escalera de Ceniza | `mon_fragua_herrero` | 96 x 140 | 64 x 12 | 672, 796 | La estatua del primer herrero, con el martillo al hombro y los ojos de brasa. |
| El Río de Lava | `mon_fragua_crisol` | 112 x 96 | 48 x 12 | 1728, 476 | El crisol volcado: el metal fundido se derramó y se enfrió a medias. |
| Las Jaulas Colgantes | `mon_fragua_jaula_caida` | 100 x 112 | 72 x 12 | 2352, 668 | La jaula más grande, caída y con los barrotes doblados: lo que tenía adentro se escapó. |
| Los Fuelles | `mon_fragua_lingotes` | 96 x 72 | 80 x 12 | 2768, 1244 | La pila de lingotes que salió del último soplido de los fuelles, todavía tibios. |
| El Bosque de Ceniza | `mon_fragua_arbol_hierro` | 88 x 144 | 32 x 12 | 512, 1500 | El árbol de hierro que plantó el herrero; sus hojas son brasas que no se apagan. |
| La Cárcel de las Luces | `mon_fragua_llavero` | 72 x 124 | 32 x 12 | 1104, 1244 | El llavero gigante del carcelero, colgado de su poste; falta una sola llave. |
| El Horno | `mon_fragua_yunque` | 116 x 96 | 48 x 12 | 544, 2076 | El yunque gigante de la fragua con el martillo encima; las chispas saltan solas. |
| El Corazón de la Fragua | `mon_fragua_huevo` | 100 x 92 | 72 x 12 | 3024, 2332 | La cáscara del huevo de la Dragona, rota en su nido de cadenas. |
| El Nido de Ceniza | `mon_fragua_nido` | 64 x 64 | 24 x 12 | 160, 1948 | El nido de un pájaro de fuego con plumas de brasa y un huevito que todavía late. |
| La Alacena del Herrero | `mon_fragua_alacena` | 64 x 92 | 48 x 12 | 3424, 1276 | El estante de moldes del herrero, con el molde de una luz a medio hacer. |

| Zona | Partículas (antes → ahora) | rayos | grado |
|---|---|---|---|
| La Escalera de Ceniza | brasas → brasas,ceniza | `-15,#ffa060,0.35` | `#140a08,#ffb070,1.12,1.0` |
| El Río de Lava | brasas → brasas,humo | `0,#ff7020,0.5` | `#1a0604,#ffa040,1.2,1.15` |
| Las Jaulas Colgantes | brasas → brasas,brillos | `-10,#ffc070,0.3` | `#140c06,#ffd090,1.14,1.05` |
| Los Fuelles | brasas → brasas,humo | `-20,#ff8040,0.35` | `#140806,#ffa060,1.16,1.05` |
| El Bosque de Ceniza | ceniza → ceniza,brasas | `-25,#c86a3a,0.25` | `#0e0806,#e09060,1.1,0.85` |
| La Cárcel de las Luces | brasas → brasas,polvo | `-5,#ffc070,0.3` | `#100806,#ffd090,1.15,1.0` |
| El Horno | brasas → brasas,humo | `0,#ff7020,0.45` | `#1a0804,#ffa040,1.2,1.12` |
| El Corazón de la Fragua | brasas → brasas,ceniza | `0,#ff5a20,0.4` | `#1a0402,#ff9040,1.25,1.15` |
| El Nido de Ceniza | ceniza → ceniza,brasas | `0,#c86a3a,0.2` | `#0e0806,#e09060,1.1,0.9` |
| La Alacena del Herrero | brasas → brasas,polvo | `-30,#ffc070,0.35` | `#140c06,#ffd090,1.12,1.0` |

### 7. El Corazón Helado

- **Piso:** 3840 x 3520 px como antes (mismo alfa, misma colisión). Repintado con 124225 px de manchas, 2326 grietas, 0 raíces, 358 charcos y 4498 cosas sueltas.
- **Criaturas nuevas:** zorro_nieve x 6, armino x 6.
- **Memoria nueva:** 0.22 MP de monumentos con sus sombras + 0.01 MP de fauna + 0.07 MP de niebla teñida = **0.3 MP** (tope 2).
- **Alcance:** 29 metas (cofres, fogatas, portales, arenas y zonas) alcanzables desde la llegada antes y 29 después.

| Zona | Monumento | Tamaño | Base sólida | Dónde (px) | Qué cuenta |
|---|---|---|---|---|---|
| La Escalera Helada | `mon_corazon_heroina_hielo` | 80 x 132 | 64 x 12 | 480, 572 | La primera heroína que bajó hasta acá, congelada adentro de un bloque de hielo con la espada en alto. |
| El Lago de los Gigantes | `mon_corazon_espada` | 68 x 150 | 36 x 12 | 2400, 636 | La espada de uno de los gigantes, clavada en el hielo hasta la mitad. |
| Las Catacumbas de Hielo | `mon_corazon_sarcofago` | 116 x 84 | 80 x 12 | 3632, 892 | El sarcófago helado con la tapa corrida: adentro no hay nadie. |
| El Bosque de Escarcha | `mon_corazon_arbol_hielo` | 96 x 144 | 32 x 12 | 672, 1724 | El árbol de cristal que creció donde se congeló un árbol de verdad; el tronco viejo se ve adentro. |
| La Ciudadela Congelada | `mon_corazon_estandarte` | 80 x 140 | 48 x 12 | 1584, 1660 | El estandarte de la ciudadela, rígido de hielo, con la llama dorada que se fue y el escudo clavado al pie. |
| El Puente de las Cadenas | `mon_corazon_grillete` | 116 x 84 | 96 x 12 | 656, 2588 | El grillete gigante con la cadena rota: lo que estuvo atado ahí se soltó hace poco. |
| La Puerta del Trono | `mon_corazon_arco_cuernos` | 116 x 116 | 96 x 12 | 2416, 2364 | Los cuernos tallados en piedra negra con las runas rojas del Diablo. |
| El Corazón Helado | `mon_corazon_gigante` | 112 x 140 | 88 x 12 | 2832, 2140 | Un gigante de hielo arrodillado ante el trono, con las cadenas del Diablo en las muñecas. |
| La Guarida del Lobo | `mon_corazon_craneo_lobo` | 96 x 72 | 48 x 12 | 176, 2044 | El cráneo del lobo más grande, limpio y blanco, en su cama de huesos y nieve. |
| La Cripta Sellada | `mon_corazon_puerta_cripta` | 80 x 100 | 64 x 12 | 3632, 1148 | La puerta de la cripta con el sello rojo del Diablo; del otro lado se oye algo que respira. |

| Zona | Partículas (antes → ahora) | rayos | grado |
|---|---|---|---|
| La Escalera Helada | nieve → nieve,brillos | `-10,#c8dcf0,0.4` | `#060a14,#c8e0ff,1.12,0.85` |
| El Lago de los Gigantes | nieve → nieve,brillos | `-15,#9ab8d8,0.35` | `#04060e,#b0d0f0,1.15,0.85` |
| Las Catacumbas de Hielo | ceniza → ceniza,polvo | `0,#6a8aac,0.1` | `#020306,#8aa8c8,1.2,0.8` |
| El Bosque de Escarcha | nieve → nieve,brillos | `-20,#b8d0ea,0.45` | `#060a12,#d0e8ff,1.12,0.9` |
| La Ciudadela Congelada | nieve → nieve,polvo | `-12,#9ab8d8,0.3` | `#06080e,#c0d4ec,1.14,0.82` |
| El Puente de las Cadenas | ventisca → ventisca,nieve | `-35,#d0e0f0,0.25` | `#060810,#d8e8ff,1.1,0.8` |
| La Puerta del Trono | ceniza → ceniza,brasas | `0,#ff5a3a,0.3` | `#0a0204,#ff8a6a,1.22,0.95` |
| El Corazón Helado | ceniza → ceniza,brasas | `0,#ff3a20,0.45` | `#0a0204,#ff7050,1.28,1.0` |
| La Guarida del Lobo | nieve → nieve | `-10,#9ab8d8,0.2` | `#04060c,#b0c8e0,1.12,0.85` |
| La Cripta Sellada | ceniza → ceniza,brasas_frias | `0,#6a8aac,0` | `#020306,#ff6a4a,1.2,0.85` |
## Verificación

- `npx tsc -b` limpio. `npm test` en verde: 47 archivos, 336 pruebas (antes 46 y 328). Pruebas nuevas en `abyss.test.ts` (8: la niebla y una
  por mundo). Cambié 5 pruebas viejas de los mundos 3 a 7 que fijaban las partículas exactas de cada zona: ahora exigen
  que la zona conserve las de antes (el encargo pide cambiarlas). Lo único más que se tocó fue el tope de tiempo de una prueba del kit (abajo).
- Kit generado completo y comparado con el de `e5af0ee`:
  - Antes 3028 archivos, ahora 3201. **No falta ninguno.** 173 nuevos (69 monumentos con su sombra, 14 especies con
    `quieto` y `huir`, 7 nieblas teñidas).
  - Cambian 166: `manifest.json`, los 7 mapas `.json`, las 7 vistas, `niebla_jirones.png`, las 59 postales y los 91
    trozos del suelo (**todos del mismo tamaño en pixeles que antes**). Ningún objeto, personaje, enemigo, jefe, fx,
    audio ni pieza de interfaz cambió.
  - `manifest.json`: no se quitó ni cambió nada de lo que había, salvo el texto de `niebla.notas`. Todo lo demás se suma.
  - Mapas de Tiled: todos los objetos, zonas y postales de antes siguen en su lugar. Entidades: todas siguen; dos
    criaturas del Bosque se corrieron un cuadro (#34). Colisión: ningún cuadro sólido se abrió; se cerraron solo los de
    las bases (34, 17, 21, 24, 25, 22 y 27 por mundo).
  - `npm run verificar-kit` del juego (sacado de `Lothra2/GG-Abyss`, solo lectura) contra los dos kits: los dos dicen
    "El kit está bien" (el nuevo revisa 2262 rutas y 117 objetos distintos del mapa).
  - `buildGameKit` arma sin errores (texturas de 4096 o menos, sin nombres de objeto repetidos entre mundos).

## Pendientes del juego (ASSETS_PENDIENTES.md)

- **#34, la rana y el pez en el mismo punto del Bosque:** arreglado. Si dos criaturas caen en el mismo punto, la pasada
  abyss corre una al cuadro libre más cercano (el pez al agua, la otra a tierra). El pez de (1840, 2416) quedó en
  (1872, 2384) y un cuervo pegado a otro se corrió también. Test nuevo: ninguna criatura encima de otra.
- **#40, portales premium:** ya estaban hechos antes de esta rama (`portal_<color>` de 96 x 128 con `girar`, `abrir`,
  `cerrar`, `arco` y `remolino`). No los toqué.
- **#33, el avance de caminar y correr:** ya resuelto en `9e8a6da` (`avance` por ciclo y `velocidad_natural`), como
  dice el mismo archivo. No hizo falta nada.

## Lo que hay que saber (sin adornos)

- **Monumentos de un cuadro.** Ninguno está animado: lo que brilla (velas, faroles, cristales, brasas) trae halo
  pintado y el juego le puede poner su luz. Animarlos multiplica la memoria; si alguno lo merece, se agrega.
- **Ajustes de tamaño para que entren sin montarse:** el árbol hueco del Bosque Profundo quedó en 100 x 140 (a 128 x 160
  no había lugar sin taparle el pie a otro árbol), y el memorial del Nicho del Minero en 64 x 64.
- **Rincones secretos chicos:** el timón de la Gruta del Ancla quedó apoyado contra la pared del fondo (su base cae
  sobre roca que ya era sólida). El nido de la Fragua, el árbol del Corazón del Jardín y el organillo entran en el piso.
- **Laberinto de los Jardines de Piedra:** el cisne está en un pasillo de 2 cuadros y deja paso de 1. La regla de
  pasillo garantiza que no parte el laberinto, pero lo angosta ahí.
- **La arena del Puerto** no se alcanza por BFS sin marea, ni antes ni ahora (depende de la marea). La prueba solo
  exige que lo que se alcanzaba se siga alcanzando.
- **`vuela`** en las criaturas es un dato extra que hoy el juego no lee. Ninguna especie nueva lleva `agua` ni `sonido`.
- **Partículas nuevas:** no propongo tipos nuevos; con las 18 que ya existen alcanza para que cada zona tenga lo suyo.
- **La prueba del kit de `premium.test.ts`** ("el kit del juego anota el perfil premium") arma el kit con los 7 mapas.
  Sola tarda 222 s (en la rama base, 206 s: la pasada abyss suma unos segundos por mapa). Con todas las pruebas a la
  vez, ahora en paralelo con los 7 mapas de `abyss.test.ts` en una máquina de 4 núcleos, llegó a 430 s y se pasaba de
  sus 300 s. Le subí el tope a 600 s; lo que verifica no cambió.
