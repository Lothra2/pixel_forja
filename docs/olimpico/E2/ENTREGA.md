# Lote E2: los cuatro tramos del Cross de Saigón (y el hẻm subido de nivel)
Estado: entregado, pendiente de Rick
PR: (se llena al abrir el PR)
Fecha: 2026-10-12

## Qué se hizo

Los cinco tramos del Cross Country salen completos, con la vista inclinada de verdad (`px = x + 0.35 * y`). Cada uno pasa sus 9 pruebas y quedó comparado con su concepto de `para_pixel_forja/referencias/conceptos/`. Todo es motor general (`src/engine/world/oblique/`): lo propio de Saigón son los layouts de `docs/ejemplos/nekketsu/escenarios/`.

| Tramo | Del concepto | Cómo quedó |
|---|---|---|
| `saigon_hem` (E1, subido) | Color y vida en las fachadas, piso mojado | <ul><li>Buganvillas magenta en cascada.</li><li>Cortinas metálicas verdes y azules.</li><li>Toldos de rayas sobre los locales y matas grandes en la acera.</li><li>Charcos que reflejan las casas de cabeza.</li></ul> |
| `saigon_benthanh` | La torre del reloj y los puestos a media altura | <ul><li>La torre ancha con el reloj grande, "BẾN THÀNH" en relieve, techo de cuatro aguas y bandera.</li><li>Cada puesto con su toldo de lona a rayas (azul, verde, rojo, amarillo, turquesa) y la cenefa en ondas.</li><li>La fruta en canastos al frente.</li></ul> |
| `saigon_rio` | Ferry, jacintos, thúng chai, la Bitexco y la luz dorada | <ul><li>Tarde dorada.</li><li>El río abierto detrás de la baranda del malecón, con palmas, bolardos con cadena y xích lô estacionados.</li><li>El ferry y los barcos del otro lado.</li><li>Islas de jacintos con su flor.</li><li>Destellos de oro en el agua y el filo de las torres encendido por el sol.</li></ul> |
| `saigon_azoteas` | El aguacero y la viga que se lea sobre el hueco ancho | <ul><li>Tormenta casi de noche, con lluvia en rayas delante de los edificios.</li><li>Ventanas prendidas y neones (SÀI GÒN, CÀ PHÊ, NHÀ THUỐC, BIA HƠI, KHÁCH SẠN, KARAOKE, PHỞ) con su halo.</li><li>La Bitexco con el filo de luz turquesa.</li><li>La viga es de hierro en I oxidada y se lee clarita sobre el vacío.</li></ul> |
| `saigon_estadio` | La pista, la tribuna con banderas | <ul><li>Banderas grandes de Vietnam en la tribuna.</li><li>Pancartas en vietnamita bien escrito: VIỆT NAM VÔ ĐỊCH, VIỆT NAM TIẾN LÊN!, ĐOÀN KẾT, CỐ LÊN NEKKETSU!</li><li>El letrero SÂN VẬN ĐỘNG THỐNG NHẤT.</li><li>La meta dice VỀ ĐÍCH, nunca FINISH.</li></ul> |

**La vida que piden los layouts** (`vidaSaigon.ts`):

| Tramo | Vida |
|---|---|
| Mercado | Cenefas de toldo al viento y vendedoras con nón lá que pregonan |
| Río | Brillos del agua, jacintos que bajan con la corriente, el ferry del fondo que cruza y thúng chai que se mecen |
| Azoteas | Ropa al viento. La lluvia y los charcos que crecen van como partículas con `lluvia` y `salpicadura_piso` |
| Estadio | La ola en la tribuna, banderas que ondean y fuegos artificiales como partícula |

**Motor:**
- Paletas nuevas de 24 colores: `VIETNAM_TARDE_DORADA` y `VIETNAM_TORMENTA`.
- El cielo dorado y el cielo de tormenta.
- La lluvia en rayas inclinadas.
- `charcosConReflejo` en `escena.ts`.
- `cortinaMetalica`, `toldoRayas` y `mataGrande` en `vietnam.ts`.
- `xichLo` en `fachadas.ts` y `ferry` en `skyline.ts`.
- Neones con halo.
- El mapa de "un tono más claro" ya no cae en rosado ni turquesa.

## Cómo se usa

El juego ya lee `escenario.json` con su `inclinacion`. La línea para su `kit.config.json`:

```jsonc
"escenarios": "data/stages/"
```

Y un cambio de datos en el juego: en `data/stages/saigon_rio.layout.json`, **`"hora": "tarde"`** (hoy dice `"mediodia"`). Así sale con la luz dorada del concepto. La copia de ejemplo de PixelForja ya lo tiene.

```bash
npm run kit-a-medida -- salida --config docs/ejemplos/nekketsu/kit.config.json --solo escenarios
```

## Pruebas

- **Las 9 pruebas de los 5 tramos pasan.** Legibilidad (prueba 7):
  - Azoteas: peor caso 2.2:1, junto al hueco de x 1500.
  - Estadio: peor caso 2.9:1.
  - Las dos fallaban en la primera pasada:
    - En las azoteas, el vacío de la tormenta quedaba tan oscuro como el contorno del atleta. Aclaré el `asfalto` de la paleta.
    - En el estadio, una valla azul noche tapaba al atleta. La pasé a azul.
- `oblique.test.ts`: 32 de 32.
- `custom.test.ts`: 14 de 14, con el kit de Nekketsu y sus 5 escenarios. La cuenta de imágenes subió porque los 4 tramos traen su `vida.png`.
- Suite completa: 23 archivos, 249 de 249.
- `npm run build:sitio` limpio y e2e de Playwright 44 de 44.

## Para aprobar (todo en `docs/olimpico/E2/`)

- `conceptos/concepto_vs_<tramo>.jpg`: cada concepto arriba y la postal de PixelForja abajo, con atletas del kit. Son JPEG para que pesen poco: el pixel art de verdad está en `postales/`.
- `mismo_juego.png`: el hẻm con atletas al lado de Bến Thành, el río, las azoteas y el estadio. Tienen que verse del mismo juego.
- `carrera_rio.gif`, `carrera_az.gif` y `carrera_bt.gif`: Sophie y Alana corriendo con la cámara y la vida andando.
- `postales/`: dos encuadres por tramo, cada uno con y sin atletas.
- `tramo_<id>.png`: cada tramo entero en trozos de 1280.
- `inclinada/` sigue con el antes y después de la vista inclinada, y el gris del juego encima. La geometría no cambió.

## Decisiones que tomé sin preguntar

1. **El río va en tarde dorada y no a mediodía.** El concepto lo pide, y el `LEEME.md` dice que la hora y la luz salen del concepto. Cambié la copia del layout y le pido al juego el mismo cambio.
2. **Las azoteas van en "tormenta" y no de noche.** El Cross es un recorrido de corrido que termina en el estadio al atardecer: de noche antes del atardecer no tiene sentido. El layout dice `tarde` con aguacero, así que las pinté como un aguacero que oscurece todo, con ventanas y neones prendidos. Es el ambiente del concepto sin romper la hora.
3. **El malecón muestra el río abierto, no edificios coloniales.** El concepto y el nombre del tramo lo piden.
4. **El rosado de la paleta (`salmon`) pasó a ser el de la buganvilla, y no hay paredes rosadas en el hẻm.** Las paredes de Saigón del concepto son amarillas, menta, celestes y crema. Las flores resaltan solo si el rosado es de ellas.
5. **No agregué un color 25.** La paleta sigue en 24 (lo prueba la ficha). En la tormenta, `salmon`, `menta`, `rojo` y `azul` son los neones, y los edificios no usan esos colores en las paredes.
6. **La viga es de hierro oxidado,** no de concreto. Es lo que más contrasta con el vacío y lo que se ve en una azotea de Saigón.
7. **La lluvia que cae y los fuegos artificiales los pone el juego** como partículas con los efectos del kit. Las rayas de lluvia pintadas en el cielo y delante de los edificios son el fondo de ambiente.
8. **El texto del concepto no se copió.** Los letreros salen de listas propias en vietnamita bien escrito, con la fuente del kit. Sin marcas comerciales: el "Tiger" del concepto pasó a BIA HƠI.

## Límites honestos

- **Bến Thành de adentro:** la pared del fondo con estantes sigue clara y repetida. Se lee bien detrás de los atletas, pero no tiene la penumbra del mercado del concepto.
- **El piso del hẻm sigue siendo asfalto gris** (es el `piso` del layout). Los charcos lo rompen, pero no es la acera de baldosa mojada del concepto.
- **El río no tiene el camino del sol en el agua.** El sol va en el cielo, que no se mueve con la cámara, y el agua sí. Un reflejo fijo se correría. Van destellos de oro sueltos.
- **No hay vallas de atletismo en la pista del estadio:** el layout no trae cajas ahí, y pintarlas en el piso engañaría a la colisión.
- **La lluvia pintada en el cielo es fija** y no cae. La que cae la pone el juego.
- **El ferry y el thúng chai del fondo son decorado.** El ferry que se sube es un vehículo del juego (lote D2).
- **Las vendedoras quedan medio tapadas** por la fila de puestos de adelante en algunos puntos. Es la geometría del layout.

## Lo que necesita el siguiente lote

- **El juego:**
  - `"escenarios": "data/stages/"` en su `kit.config.json`.
  - `"hora": "tarde"` en `saigon_rio`.
  - Las partículas con `fx` que traen los escenarios: `lluvia`, `salpicadura_piso` y `fuegos_artificiales_*`.
- **E3** (`medellin_c13`, `hoian`, `caracas_azotea`): ya hay charcos con reflejo, neones con halo, la paleta de tormenta como base para la noche de Caracas y `publico.azoteas` del lote P1. Falta su estilo de país (`colombia_ladrillo`, `venezuela_ciudad`) con su ficha.
