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
