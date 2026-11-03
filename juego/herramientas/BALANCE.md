# Balance de combate, nivel 1 a 100

Simulador: `npx tsx juego/herramientas/balance.mts` (opciones `--semillas`, `--clases`, `--niveles`, `--salida res.json`, `--md tablas.md`). Tarda menos de un minuto con 8 semillas.

## Cómo mide

- Carga los módulos reales del juego con el servidor de Vite en modo SSR (el juego usa `import.meta.glob`). No reimplementa fórmulas: usa `calcular`, `crearObjeto`, `crearMonstruo`, `entrarZona` (o sea `poblar`), `usarHabilidad` y `actualizar` cuadro a cuadro a 30 fps en un claro de una zona generada de verdad.
- Héroe típico por clase (berserker, templario, arcanista, cazadora, nigromante): atributos repartidos por proporción fija, puntos de habilidad nivel a nivel en la habilidad principal y después en sus sinergias y pasivas, premios de misiones repartidos hasta el 60. Equipo tirado con `crearObjeto` al nivel de la zona menos 2: mitad mágico, 42% raro, 8% único, sin elegir el mejor (solo se repite si no lo puede llevar).
- Monstruos: los de la población real de las 3 zonas más cercanas al nivel. Campeones y únicos con sus mods. Jefe de acto: el del acto de la zona, creado al nivel de la zona + 2.
- TTK: tiempo para matar un objetivo empezando a 3 casillas (incluye acercarse). TTD: el héroe se queda quieto sin pociones frente a 4 normales o al jefe solo (el jefe sí invoca).
- Minutos por nivel: experiencia de limpiar la zona (sin el jefe de acto) contra el TTK de cada calidad más 4 s por grupo de caminata. Las horas salen de interpolar esos minutos.
- Campaña: limpia cada zona una vez en orden, con el castigo de experiencia del juego, y anota el nivel al cerrar cada acto.

Aproximaciones que hay que tener en cuenta:

- El héroe pega a un solo objetivo. Las áreas y las invocaciones del héroe no cuentan, así que el tiempo de limpiar está inflado para builds de área.
- En TTK se le llena el maná (asume pociones). En TTD está quieto, así que el bloqueo cuenta siempre y no esquiva proyectiles.
- Sin gemas, runas ni conjuntos. Sin auras ni gritos.
- Las tablas usan la mediana de las 5 clases y la diferencia entre clases es enorme (ver abajo). El nivel 1 y 5 contra jefe de acto no es realista (el héroe llega a la Abadesa en el 13).

## Lo que estaba mal

1. **Doble escalado de los monstruos.** Los datos ya traen la dureza de su acto (caballero del abismo 160 de vida contra zombi 24) y además se escalan por nivel. Cuando un acto reusa bichos de otro, la curva salta: el acto 6 (bichos del acto 1) tenía 500 a 660 de vida media y el 7 saltaba a 2100 a 2700 (x4 de golpe). En Pesadilla e Infierno el acto 1 salía 3 veces más blando que el 5 al mismo rango.
2. **El daño de los monstruos crecía mucho más rápido que la vida del héroe** (`1 + 0.17k` por nivel encima de la dureza del acto). TTD contra 4 normales caía de 30 s a 4 s desde el 30, y contra jefe era de 1 a 3 s en Pesadilla e Infierno.
3. **Bandas de dificultad desfasadas.** Normal va de 2 a 62 pero Pesadilla arrancaba en 32 e Infierno en 61. Limpiando todo una vez el héroe cerraba Normal en el 73 y entraba a Pesadilla 33 niveles por encima de los monstruos (experiencia casi nula hasta el acto 5).
4. **Experiencia muy generosa:** el héroe iba unos 10 niveles por encima de los monstruos desde el acto 2 de Normal.
5. **Jefes de acto:** los primeros morían muy rápido (Abadesa 28 s en Normal, 20 s en Infierno) y Aun-Saar se pasaba en Infierno (143 s).
6. **Jefes de mazmorra** (verdugo, araña reina, gusano, dragón óseo) salen como únicos con 4 veces la vida: 55 a 300 s.
7. **Penalidad de resistencias** de Infierno (-100) con jefes que tiran 3 proyectiles elementales: el héroe típico quedaba en -30 a -80 de resistencia y moría en 1 a 2 s.

## Cambios

| Archivo | Qué | Antes | Después |
|---|---|---|---|
| `src/juego/mundo.ts` `escalar` | Dureza del nivel: si un monstruo sale por encima de su nivel nativo (la primera zona de Normal donde aparece) se le sube vida, daño y experiencia por `durezaNivel(nivel) / durezaNivel(nativo)`, con `durezaNivel(n) = (1 + min(n,62)/12)^1.1` | sin ajuste | factor >= 1 |
| `src/juego/mundo.ts` `escalar` | Daño por nivel | `(k<6 ? 0.6 : 0.75) * (1 + 0.17k)` | `0.6 * nivel^0.3` |
| `src/juego/mundo.ts` `escalar` | Experiencia por nivel | `nivel^1.18` | `nivel^0.9` |
| `src/juego/mundo.ts` `crearMonstruo` | Vida de jefes de mazmorra (ia jefe que no es de acto) | x4 como único | x4 * 0.6 |
| `src/juego/mundo.ts` `crearMonstruo` | Daño por calidad (jefe y jefe de acto) | `[1, 1.5, 1.8, 1, 1]` | `[1, 1.5, 1.8, 0.7, 0.7]` |
| `src/juego/heroe.ts` `nivelEnDificultad` | Pesadilla | `30 + z*0.8` (32 a 80) | `58 + z*0.45` (59 a 86) |
| `src/juego/heroe.ts` `nivelEnDificultad` | Infierno | `60 + z*0.65` (61 a 100) | `80 + z*0.33` (81 a 100) |
| `src/juego/heroe.ts` `calcular` | Penalidad de resistencias | `[0, -40, -100]` | `[0, -30, -60]` |
| `src/juego/historia.ts` | Nivel del Heraldo | `z.nivel + 1 + dif*25` | `nivelEnDificultad(z.nivel, dif) + 1` |
| `src/datos/monstruos.ts` | Vida base de jefes de acto | Abadesa 620, Khamer-Ul 1100, Madre Ciénaga 1800, Hjaldur 2600 | 1360, 2400, 3200, 3400 |
| `src/mundo/actos67.ts` | Vida base de Aun-Saar | 9800 | 7800 |
| `src/mundo/actos67.ts` | Orden de `catedral_ahogada` (el primero sale el 55% de las veces) | monja hueca primero | ahogado primero |

Se probó y se descartó: bajar el % de daño de las legendarias de escalón 7 y 8 (casi no movía nada, ver abajo) y pasar el daño de hechizos de exponencial a lineal (arreglaba el medio juego pero dejaba a los lanzadores sin daño después del 60).

## Antes y después (mediana de 5 clases, segundos)

Las bandas de Pesadilla e Infierno cambiaron, así que se comparan los niveles de héroe que existen en las dos versiones. Cada celda es antes → después.

| Dificultad | Nivel | TTK normal | TTK campeón | TTK único | TTK jefe de acto | TTD 4 normales | TTD jefe |
|---|---|---|---|---|---|---|---|
| Normal | 10 | 1.3 → 1.6 | 3.8 → 4.5 | 9.5 → 15.4 | 28.7 → 55.5 | 29.0 → 32.3 | 6.8 → 13.4 |
| Normal | 20 | 1.7 → 1.6 | 3.8 → 4.4 | 5.5 → 6.8 | 28.3 → 68.4 | 10.3 → 14.8 | 7.2 → 15.8 |
| Normal | 30 | 1.7 → 1.9 | 4.1 → 6.3 | 6.5 → 10.6 | 44.0 → 85.4 | 5.2 → 12.2 | 6.6 → 15.8 |
| Normal | 45 | 1.2 → 1.8 | 2.3 → 5.6 | 4.0 → 7.4 | 39.7 → 40.6 | 9.5 → 9.6 | 2.4 → 10.9 |
| Normal | 55 | 2.3 → 3.3 | 7.4 → 10.3 | 8.6 → 13.3 | 125 → 97 | 6.8 → 11.0 | 3.1 → 15.6 |
| Normal | 60 | 0.9 → 1.9 | 2.9 → 4.5 | 4.3 → 8.2 | 72.4 → 60.6 | 7.3 → 12.7 | 3.4 → 18.1 |
| Pesadilla | 60 | 1.1 → 1.2 | 5.0 → 4.1 | 5.6 → 14.7 | 41.0 → 42.6 | 5.0 → 22.1 | 1.2 → 9.5 |
| Pesadilla | 70 | 0.7 → 1.1 | 1.8 → 3.1 | 1.5 → 5.7 | 41.7 → 39.8 | 12.9 → 18.8 | 3.1 → 12.5 |
| Pesadilla | 80 | 1.7 → 1.7 | 5.3 → 4.5 | 6.9 → 7.3 | 95.9 → 52.6 | 3.4 → 16.9 | 4.0 → 10.4 |
| Infierno | 80 | 1.2 → 1.6 | 4.3 → 4.6 | 3.9 → 13.2 | 23.5 → 42.1 | 6.1 → 24.7 | 1.2 → 8.5 |
| Infierno | 90 | 1.1 → 1.7 | 2.4 → 3.9 | 3.1 → 6.3 | 45.8 → 44.6 | 7.4 → 12.6 | 1.3 → 12.2 |
| Infierno | 95 | 1.9 → 2.1 | 5.1 → 5.5 | 6.3 → 8.9 | 48.6 → 83.7 | 3.5 → 10.3 | 1.2 → 7.6 |
| Infierno | 100 | 1.6 → 3.2 | 5.7 → 8.2 | 5.6 → 11.3 | 143 → 117 | 3.7 → 14.9 | 2.9 → 14.0 |

Jefes de mazmorra después: 17 a 45 s (antes 38 a 300 s). Les puse una meta propia de 15 a 45 s porque son más que un único y menos que uno de acto.

### Campaña limpiando todo una vez (nivel del héroe / nivel de los monstruos al cerrar el acto)

| | Acto 1 | Acto 2 | Acto 3 | Acto 4 | Acto 5 | Acto 6 | Acto 7 |
|---|---|---|---|---|---|---|---|
| Normal antes | 15 / 13 | 29 / 21 | 37 / 29 | 45 / 35 | 58 / 44 | 63 / 53 | 73 / 62 |
| Normal después | 13 / 13 | 22 / 21 | 30 / 29 | 38 / 35 | 52 / 44 | 57 / 53 | 63 / 62 |
| Pesadilla antes | 73 / 40 | 73 / 47 | 73 / 53 | 73 / 58 | 76 / 65 | 79 / 72 | 84 / 80 |
| Pesadilla después | 67 / 64 | 70 / 67 | 72 / 71 | 74 / 74 | 79 / 78 | 80 / 82 | 82 / 86 |
| Infierno antes | 85 / 68 | 85 / 74 | 85 / 79 | 86 / 83 | 91 / 89 | 93 / 94 | 95 / 100 |
| Infierno después | 83 / 84 | 85 / 87 | 85 / 90 | 86 / 92 | 89 / 95 | 89 / 97 | 91 / 100 |

Horas aproximadas de combate (modelo de un solo objetivo, sirve para la forma, no para el número exacto): antes 0.9 h al 30, 2.2 h al 70 y 19 h al 100. Después 1.5 h al 30, 5.2 h al 70 y 23 h al 100. Rápido hasta 30, medio hasta 70 y largo hasta 100 se cumple, y el 100 ya no sale de una sola vuelta (el héroe cierra Infierno en el 91).

## Lo que quedó fuera de meta

- **Diferencia entre clases.** Los hechizos crecen `(1 + d)^(n-1)` con sinergias multiplicativas, las armas crecen lineal con la habilidad. Al 30 el arcanista hace unas 24 veces el daño del berserker (6500 contra 270) y mata al jefe de acto en 5 s contra 90 s. El templario y la cazadora quedan cortos contra jefes (templario 170 a 265 s en 60 a 80). Las tablas son la mediana, que cae casi siempre en una clase de arma. Arreglarlo es tocar el diseño de habilidades (que los hechizos escalen con el nivel o con el equipo y no solo con los 20 puntos), no la curva de monstruos.
- **Salto del acto 6 al 7 en Normal** (nivel 50 a 55): campeón 4.3 a 10.3 y único 5.4 a 13.3, unas 2.4 veces. La Plaza y la Catedral siguen usando bichos frágiles del acto 1 mientras llegan los modelos propios. En el 60 vuelve a la curva.
- **TTD contra jefe en Infierno** queda en 7.5 a 8.5 s en algunos niveles (jefes de fuego con 3 proyectiles). En juego real se esquiva parte.
- **Únicos al entrar a una dificultad** (Pesadilla 60: 14.7 s, Infierno 80: 13.2 s): un poco arriba de 12.
- **Legendarias:** pegan unas 3 a 4 veces el arma típica en todos los escalones, no solo el 8. La razón es que los raros casi nunca salen con % de daño (media 6 a 27%) y la legendaria trae 200 a 300% seguro. Recortar el escalón 8 casi no movía el número, así que lo dejé igual. Ojo aparte: los únicos de espada a nivel alto siempre salen como la Hoja de Vigilia de nivel 7 (no hay únicos de espada más altos en el filtro).

## Hechizos por nivel del héroe, daño de hechizos y las 8 clases

### Qué cambió en el simulador

- Mide las 8 clases. Planes nuevos: monje de puños (puño de rayo y puño del eco), druida invocador (lobos, oso espiritual y ráfaga ártica con los puntos que sobran) y alquimista de bombas con ballesta.
- Las invocaciones que no piden cadáver (lobos, oso, halcón, gólem...) se llaman antes de cada pelea y su daño cuenta. Thor ya contaba para todos.
- `--rapido` (solo DPS, TTK único y TTK jefe de acto), `--difs 0,1,2` y tablas nuevas por clase: TTK jefe, TTK único, daño de un uso de la habilidad principal y daño del arma, con la columna lenta / rápida.
- Un `document` de mentira al cargar, porque `motor/assets.ts` crea un lienzo al importarse.
- Normal no tiene monstruos por encima del 62, así que el 70 se mide en Pesadilla y el 90 en Infierno.

### Fórmula nueva (`danoHab` en `src/juego/mundo.ts`, constantes en `src/datos/clases.ts`)

| Parte | Antes | Después |
|---|---|---|
| Nivel del héroe | no contaba | `poderNivel(nivelHéroe) / poderNivel(nivelReq)`, con `poderNivel(n) = 4 + 0.6n + 0.02n²` (la curva del arma típica). El daño de la tabla es el que hace la habilidad el nivel en que se aprende |
| Puntos en la habilidad | `(1 + dano[2])^(n-1)` (x24 a x40 al 20) | `1 + 0.2 * dano[2] * (n-1)` (x1.6 a x1.8 al 20) |
| Sinergias | multiplicativas, sin tope | se suman, tope +75% (`ESCALA_HECHIZOS.topeSinergia`). El tooltip muestra el total y el tope |
| % del elemento | multiplicaba aparte | se suma con el % de daño de hechizos del equipo |
| Invocados | daño `1 + 0.08 * nivel` | `danoInvocadoNivel(n) = 1 + 0.05n + 0.0008n²` (igual al 30, x1.5 al 90) |

Las habilidades de arma (`mult`) quedan como estaban. Las híbridas (golpe sagrado, puño de rayo, flechas elementales) suman su parte de hechizo con la fórmula nueva.

**Estadística nueva `dano_hechizos`** (`+X% daño de hechizos`): prefijos en varitas, báculos, cetros y orbes (Arcano 8-15 al 1, Hechicero 16-30 al 14, Taumatúrgico 31-50 al 28, Nigromántico 51-75 al 44, Profano 76-100 al 62, del Eclipse Arcano 101-130 al 80) y, más bajos, en amuletos y ropa de tela, túnicas, hábitos, vestidos y camisas (Susurrante 5-10 al 3, Ritual 11-20 al 20, Litúrgico 21-32 al 40, Apócrifo 33-45 al 62, de la Corona Sedienta 46-60 al 82). Las legendarias de lanzador traen además 35% de su escalón de daño mejorado como daño de hechizos. Los únicos de lanzador nuevos la traen también.

**Datos de habilidades retocados** (para meter a cada clase en la franja):

| Habilidad | Antes | Después | Por qué |
|---|---|---|---|
| Esfera ígnea (`bola_fuego`) daño | 9-18 | 5-10 | explota al tocar: pega dos veces al mismo objetivo |
| Maestría del fuego (`maestria_fuego`) | fuego +30% +7/nivel | +15% +3/nivel | dos pasivas de fuego daban +228% al 20, el doble que las otras ramas |
| Ceniza en las venas (`ceniza_venas`) | fuego +8% +3/nivel | +5% +2/nivel | ídem |
| Golpe sagrado (`golpe_sagrado`) | arma 130% +10, luz 3-6 | arma 140% +12, luz 6-12 | templario era la clase más lenta (espada a una mano) |
| Voto de acero (`voto_acero`) | daño +10% +3/nivel | +30% +7/nivel | ídem, a la par de la maestría de hachas |
| Flecha certera (`flecha_certera`) | arma 130% +10 | 160% +16 | cazadora lenta en todos los niveles |
| Pulso firme (`pulso_firme`) | daño +15% +4/nivel | +20% +6/nivel | ídem |
| Bomba ígnea (`bomba_ignea`) | 7-13 | 14-26 | las bombas están limitadas por frascos |
| Bomba de racimo (`bomba_cluster`) | 20-34 | 31-53 | ídem |
| Bandolera (`bandolera`) | recarga de frascos +10% +4/nivel | +20% +5/nivel | ídem |
| Puño de rayo / del eco | arma 120% +8 / 150% +10, eco 8-30 | 130% +10 / 160% +12, eco 10-38 | el monje se quedaba atrás en el 30 |
| Nudillos de hierro | daño +15% +4/nivel | +20% +5/nivel | ídem |

### Antes y después por clase (12 semillas, equipo típico)


**TTK jefe de acto** (segundos, antes → después)

| Clase | Normal 10 | Normal 30 | Normal 50 | Pesadilla 70 | Infierno 90 |
|---|---|---|---|---|---|
| berserker | 81.4 → 83.5 | 85.6 → 86.8 | 71.6 → 74.4 | 38.8 → 40.0 | 40.9 → 39.7 |
| templario | 58.5 → 43.9 | 81.4 → 61.5 | 125 → 50.5 | 103 → 55.0 | 160* → 67.3 |
| arcanista | 41.2 → 88.4 | 5.1 → 48.3 | 5.1 → 36.3 | 9.8 → 38.8 | 14.3 → 39.8 |
| cazadora | 143 → 114 | 215* → 150* | 89.7 → 54.1 | 66.4 → 42.4 | 89.5 → 51.8 |
| nigromante | 33.7 → 47.8 | 13.2 → 45.2 | 19.0 → 51.9 | 24.1 → 37.8 | 42.0 → 41.5 |
| monje | 47.0 → 51.6 | 51.6 → 72.8 | 52.6 → 60.4 | 49.1 → 45.3 | 47.0 → 39.5 |
| druida | 62.7 → 44.2 | 49.1 → 39.7 | 109 → 68.3 | 69.4 → 46.4 | 116 → 52.9 |
| alquimista | 140 → 125 | 122 → 116 | 9.0 → 58.9 | 15.7 → 47.0 | 36.8 → 57.2 |
| **lenta / rápida** | x4.3 → x2.9 | x42.5 → x3.8 | x24.7 → x2.0 | x10.5 → x1.5 | x11.2 → x1.7 |

**TTK único** (segundos, antes → después)

| Clase | Normal 10 | Normal 30 | Normal 50 | Pesadilla 70 | Infierno 90 |
|---|---|---|---|---|---|
| berserker | 15.4 → 15.2 | 9.0 → 9.6 | 9.7 → 10.5 | 5.3 → 5.0 | 6.7 → 5.6 |
| templario | 12.6 → 9.5 | 6.6 → 5.8 | 12.7 → 5.9 | 13.0 → 7.1 | 16.5 → 8.4 |
| arcanista | 12.0 → 26.6 | 0.7 → 4.3 | 1.0 → 4.3 | 1.6 → 6.4 | 2.0 → 5.5 |
| cazadora | 30.7 → 23.6 | 20.6 → 14.3 | 7.1 → 4.4 | 7.5 → 4.6 | 9.8 → 6.2 |
| nigromante | 7.1 → 10.4 | 1.0 → 3.8 | 1.6 → 4.0 | 2.8 → 4.1 | 4.1 → 3.2 |
| monje | 9.8 → 10.7 | 6.1 → 8.4 | 5.5 → 6.6 | 6.1 → 5.8 | 6.3 → 5.3 |
| druida | 12.4 → 9.0 | 4.6 → 4.6 | 10.9 → 8.6 | 9.0 → 6.2 | 17.8 → 8.9 |
| alquimista | 35.7 → 31.7 | 7.5 → 7.6 | 1.7 → 4.4 | 2.8 → 5.3 | 3.3 → 4.7 |
| **lenta / rápida** | x5.1 → x3.5 | x30.3 → x3.8 | x12.1 → x2.7 | x8.2 → x1.7 | x9.0 → x2.8 |

`*` = alguna pelea llegó al tope de 400 s. Antes = el código anterior con este mismo simulador (mismas semillas y planes).

Mediana de las 8 clases después contra jefe de acto: 79 s (Normal 10), 77 s (Normal 30), 57 s (Normal 50), 44 s (Pesadilla 70), 53 s (Infierno 90). Es la misma franja que la tabla de arriba, así que la curva de los monstruos no hay que tocarla.

### Lo que quedó fuera de la meta de 1.5x

- **Del 50 al 90 la meta casi se cumple** (x1.5 a x2.0 contra jefe). El que se sale es el templario en Infierno 90 (67 s contra 40 s del berserker): espada a una mano contra hacha a dos manos con la maestría de hachas. Subirle más el golpe sagrado lo pondría primero en el 10 y el 30, donde ya es de los rápidos.
- **En el 10 y el 30 no se cumple (x2.9 y x3.8)**, por tres cosas que no son la fórmula de hechizos:
  - Contra el muñeco el DPS de las 8 clases está en x2.5 (al 30, 259 a 687), pero contra el jefe la cazadora (150 s) y la alquimista (116 s) se van muy arriba. Los jefes de esos actos (la Abadesa y la Madre Ciénaga) llaman esbirros que se comen las flechas y los virotes, y las bombas caen donde estaba el jefe. Contra un único (sin esbirros) la alquimista queda en 7.6 s, en la franja. Un jugador de verdad mata a los esbirros primero.
  - La Abadesa resiste el fuego un 60%: la arcanista de fuego y la alquimista de bombas ígneas tardan el doble en el 10 a propósito (contra el muñeco hacen 112 y 85, a la par de las demás). Con escarcha o rayo el arcanista quedaría en la franja.
  - El berserker y la cazadora arrancan con armas flojas (hacha de una mano hasta el 11 y arco corto). Es el equipo, no la fórmula.
- **Únicos**: a partir del 50 mueren en 3 a 10 s, que incluye acercarse, así que la relación lenta / rápida (x1.7 a x2.8) es sobre todo ruido de 2 a 5 segundos.
- Solo se mide un plan por clase. Las otras ramas (escarcha, rayo, invocador nigromante, lanza de la cazadora...) usan la misma fórmula pero no están medidas.

### Únicos y legendarias altas

- 32 únicos de arma nuevos (`UNICOS` en `src/datos/objetos_datos.ts`): cada una de las 18 familias tiene uno de élite (45 a 58) y uno sobre base mítica o épica (66 a 88). Las espadas únicas altas ya no salen como la Llama de Santa Oria sobre la Hoja de Vigilia de nivel 7: al 50 a 80 sale la Vigilia sin Alba o el Estoque de la Marea Muerta y al 90 la Sed Dorada (katana).
- 6 legendarias de espada nuevas: ahora hay 2 o 3 espadas (espada y cimitarra, con las formas épicas falcata, katana y estoque) en cada escalón desde el 45.

## Ronda de noviembre: arcanista, Aun-Saar y el piso de daño

Medido con `balance.mts` (3 semillas, Normal) y con el modo nuevo de duelo (`--duelo aun_saar --pociones 8`): el héroe pelea hasta morir y toma una poción del 45 % cada 2.5 s si baja del 40 %.

**Arcanista.** Vida por vitalidad de 2 a 2.5, y el escudo de maná absorbe el 40 % del daño (antes 30 %) pagado del maná por encima del 15 % (antes 25 %).

| Nivel | Vida | TTD grupo de 4 | TTD jefe de acto |
|---|---|---|---|
| 10 | 169 → 188 | 90.8 → 120 | 65.7 → 79.0 |
| 30 | 364 → 424 | 16.9 → 28.3 | 23.5 → 27.3 |
| 50 | 562 → 659 | 13.3 → 17.8 | 13.5 → 15.4 |

Al 50 queda por encima de la nigromante (9.7), la alquimista (11.2) y la cazadora (17.1 contra el jefe), y por debajo de los de cuerpo a cuerpo (26 a 40 s), que es donde tiene que estar.

**Aun-Saar.** Los que perdían contra él eran los que pegan con el elemento que más resistía: templario (luz al 70 %), nigromante (sombra al 50 %), arcanista y alquimista (fuego al 50 %). Ahora resiste luz 35 %, fuego 30 % y sombra 30 %, y pega 40 a 80 (antes 44 a 88).

| Nivel 62, 8 pociones | Antes (gana / vida del jefe al perder) | Después |
|---|---|---|
| berserker | 4/4 | 4/4 |
| templario | 2/4 (13 %, 50 %) | 3/4 (23 %) |
| arcanista | 4/4 | 4/4 |
| cazadora | 3/4 (15 %) | 2/4 (4 %, 12 %) |
| nigromante | 0/4 (31 a 63 %) | 1/4 (7 a 15 %) |
| monje | 3/4 | 4/4 |
| druida | 4/4 | 4/4 |
| alquimista | 2/4 (34 %, 34 %) | 4/4 |

El berserker que vio la Forja (muerto con el jefe al 13 %) aparece en el simulador al 58 con solo 4 pociones (3/4, una derrota al 14 %): llegar 6 niveles abajo y con pocas pociones tiene que costar. Las derrotas que quedan son por poco. La nigromante en el duelo pelea sin esqueletos (no hay cadáveres al empezar), así que en el juego le va mejor.

**Piso de daño de las armas.** Un arma que sale al azar nunca pega menos del 70 % de la mediana de su familia a ese nivel (la misma ventana de 30 niveles de la que salen las bases). Si la base es más floja, el arma guarda un multiplicador (`kDano`) que también usan los afijos de daño.

| Cazadora, nivel 30 | Antes | Después |
|---|---|---|
| DPS de la habilidad | 208 | 282 |
| TTK campeón | 28.5 s | 9.6 s |
| TTK único | 16.2 s | 11.2 s |
| TTK jefe de acto | 181 s | 162 s |

Al 50 el jefe de acto pasa de 52 a 45 s. El jefe del acto 2 (la Madre con esbirros) sigue lento para la cazadora por lo mismo de siempre: los esbirros se comen las flechas.
