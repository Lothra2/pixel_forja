# La noche del 12 de octubre: resumen para Rick

Lo que pedía `para_pixel_forja/NOCHE.md` (v2), lote por lote, con el link de cada PR. Cada lote tiene su `docs/olimpico/<lote>/ENTREGA.md` con todo el detalle, pendiente de Rick.

## Cómo quedaron

| # | Lote | Estado | PR | Rama |
|---|---|---|---|---|
| 1 | Vista inclinada (px = x + 0.35 y) | Hecho, va dentro de E2 | https://github.com/Lothra2/pixel_forja/pull/16 | `claude/olimpico-lote-e2` |
| 2 | P1: la pelea | Hecho | https://github.com/Lothra2/pixel_forja/pull/15 | `claude/olimpico-lote-p1` |
| 3 | E2: los 5 tramos del Cross de Saigón al nivel de los conceptos | Hecho | https://github.com/Lothra2/pixel_forja/pull/16 | `claude/olimpico-lote-e2` |
| 4 | C2: la cara malandra y los 4 equipos nacionales | Hecho | https://github.com/Lothra2/pixel_forja/pull/17 | `claude/olimpico-lote-c2` |
| 5 | B2 y B3: recorridos y trepar | Hecho | https://github.com/Lothra2/pixel_forja/pull/18 | `claude/olimpico-lote-b2b3` |
| 6 | C7: animales | En parte: perros y gatos sí, el gallo no | https://github.com/Lothra2/pixel_forja/pull/19 | `claude/olimpico-lote-c7` |
| 7 | D2: vehículos | Hecho | ver el ENTREGA de D2 | `claude/olimpico-lote-d2` |
| 8 | E3: Comuna 13, Hội An y Caracas | **No empezado** | | |

## En qué orden unir

Hay dos cadenas que no dependen una de la otra:

1. **E2** (https://github.com/Lothra2/pixel_forja/pull/16) va contra `main`. Trae la vista inclinada y los 5 tramos.
2. **P1 → C2 → B2/B3 → C7 → D2.** Cada PR va apilado sobre el anterior, así que su diff muestra solo lo suyo. Hay que unirlos en orden. Cuando se une uno y se borra su rama, GitHub pasa el siguiente a `main` solo.

**Lo que va a chocar:** E2 y P1 cambian la misma línea de `custom.test.ts` (la cuenta de PNG del kit de ejemplo) y el `kit.config.json` de ejemplo. El que se una de segundo tiene que sumar las dos partes. Me encargo yo cuando se una el primero.

## Lo más importante de la noche

- **El kit a medida es 2.3 veces más rápido** (lote C2). Con 24 atletas se pasaba de los 3 minutos del contrato. Sale idéntico byte a byte en unos 100 s, y ya con 8 packs, animales y vehículos.
- **Arreglé tres cosas viejas que salieron por el camino:**
  - La `bike` de siempre no cabía a 32 px ni con los héroes.
  - Las alforzas de la guayabera no salían con torso par.
  - El guiño en cabezas LPC era la cara de enojo.
- **Todo pasa el control de calidad en 32, 48 y 64 px, en las 5 filas del juego:** los 24 atletas, las 18 animaciones nuevas, y los perros y gatos.

## Decisiones grandes que tomé sin preguntar

- **E3 no lo empecé.** Pediste "hazlo MUY bien y significativo, esfuérzate muchísimo más". Son tres mundos nuevos, cada uno con su estilo de país (`colombia_ladrillo`, `vietnam_hoian`, `venezuela_ciudad`), su ficha, y su comparación contra los conceptos y contra el gris inclinado. Para que se vea del mismo juego que Saigón, tienen que salir de la rama de E2, que todavía no está unida. Hacer los tres a las apuradas al final de la noche iba contra lo que pediste. Propongo hacerlos en la próxima sesión, uno por uno, sobre E2 ya unida y con las referencias de `para_pixel_forja/referencias/conceptos/` y `gris_inclinado/` abiertas al lado.
- **El gallo de C7 tampoco va.** El motor solo tiene esqueleto de cuadrúpedo. Un ave de dos patas necesita su esqueleto propio, y conviene hacerlo de una vez con las otras aves del pedido: paloma, garza, guacamaya y colibrí.
- **D2 trae su propia proyección** con la misma constante (0.35). Va en la cadena del kit y no en la de E2. Cuando se unan las dos, se deja una sola constante.

## Lo que necesita el juego para usar lo de esta noche

En su `kit.config.json` (la copia en `docs/ejemplos/nekketsu/kit.config.json` ya lo tiene todo):

```jsonc
"escenarios": "data/stages/",
"packs": { ..., "recorridos": [...], "trepar": [...] },
"pruebas": { "crosscountry": [..., "recorridos"], "azoteas": [..., "trepar"] },
"animales": ["thor", "perro_calle_1", "perro_calle_2", "perro_calle_3", "gato_1", "gato_2"],
"vehiculos": true,
"ui": { ..., "vs_fondo": true },
"publico": { "azoteas": true }
```

**Datos del juego:**
- Las 16 fichas nacionales y las 5 de animales en `data/fichas/`.
- El `equipos.json` con los 6 equipos.
- `"hora": "tarde"` en `saigon_rio`.

## Lo que sigue

1. **E3**, sobre E2 unida: un escenario por sesión, empezando por la Comuna 13.
2. **C7b:** el esqueleto de ave, el gallo y las aves del pedido.
3. **C5:** las burlas por equipo de los 16 nacionales.
4. **El resto de D2:** `moto_carga`, `junco`, `transmilenio`, `buseta`, `willys`, `camionetica`, `carro`, `helicoptero` y `avion`.
