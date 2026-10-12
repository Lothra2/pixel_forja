# Lote E1: sistema de escenarios oblicuos y saigon_hem
Estado: entregado
PR: (se pone al abrirlo)
Fecha: 2026-10-12

## Qué se hizo

**El sistema general de escenarios oblicuos** (`src/engine/world/oblique/`). El juego define la geometría y PixelForja pinta encima y verifica. Sirve para cualquier beat 'em up o juego de deportes de lado.

| Pieza | Qué hace |
|---|---|
| `layout.ts` | Lee y valida el layout (10.2) sin tocar la geometría. Acepta los campos que agregó el juego: `nombre`, `nota`, `tipo` en muros y sólidos, y `y0`/`y1` en `bajo`. Los desconocidos pasan con aviso |
| `piso.ts` | Piso por tipo, los 12 del pedido. Losas de concreto con juntas y desgaste, acera de baldosa, canales con jacintos y puentecito, y la orilla de enfrente |
| `vietnam.ts` | La fila de casas tubo con sus locales: tạp hóa, phở, farmacia, taller, sastrería, peluquería, café y salas con altar de los ancestros. Cada letrero calza con lo que vende. También callejones abiertos, canales entre casas, zona de comida y marcas de inundación |
| `calle.ts` | Cada caja del layout dibujada a su medida exacta. Además poste con su maraña de cables, toldo, portón de hẻm y palomas |
| `cielo.ts`, `skyline.ts` | Cielo de la mañana y la ciudad lejana (Landmark 81, Bitexco, grúas), los dos en bucle sin costura |
| `escena.ts` | Arma todas las capas de 10.3, los objetos con su orden de profundidad, la vida animada, luces, partículas, superficie y postales |
| `exportar.ts` | La carpeta `escenarios/<id>/` en trozos de 1280 |
| `verify.ts` | Las 9 pruebas de 10.4. Todas bloquean |
| `ficha.ts` | La ficha de arte (puerta 1) desde el layout |
| `index.ts` | La API pública: `generarEscenario(layout, opciones)` |

- **`saigon_hem`, el piloto,** pasó las 2 puertas de aprobación: la ficha de arte y las postales.
- **Ajuste pedido después de aprobar las postales:**
  - El muro alto ahora tiene su portón de hẻm abierto adelante (y 92 a 130): pilar, poste, viga con la placa "HẺM 42" y la hoja de reja abierta hacia afuera.
  - El paso lleva un umbral de baldosa.
  - Se lee por dónde se rodea y la geometría no cambió.
- **Para que el juego no dependa de rutas internas:**
  - `npm run escenario -- <layout.json> <carpeta> [--postales] [--ficha]`.
  - La función pública `generarEscenario` en `src/engine/world/oblique/index.ts`.
  - Las postales y la ficha salen solo si se piden, y `escenario.json` solo nombra lo que salió.
- **En el kit a medida:** `"escenarios": "data/stages/"` o una lista de layouts.
  - Sale `escenarios/<id>/` y `manifest.escenarios`.
  - Si una prueba falla, el kit no sale.
- **En el estudio:** Inicio, **Escena**.
  - Abre un layout y lo muestra pintado con paralaje, vida, aguacero y la colisión encima si se pide.
  - Pone a correr al personaje del estudio por la franja.
  - Muestra las 9 pruebas y descarga el `.zip`.
  - En español e inglés.

## Cómo se usa (estudio y kit)

```bash
npm run escenario -- data/stages/saigon_hem.layout.json public/escenarios                    # lo que carga el juego
npm run escenario -- data/stages/saigon_hem.layout.json revisar --postales --ficha           # para aprobar el arte
```

```jsonc
// kit.config.json
"escenarios": "data/stages/"     // o ["data/stages/saigon_hem.layout.json"]
```

```ts
import { generarEscenario } from '<pixel_forja>/src/engine/world/oblique';
const r = generarEscenario(layout);       // r.ok, r.errores, r.avisos, r.pruebas, r.archivos
```

Formato, archivos, carga en Phaser y las 9 pruebas: [docs/ESCENARIOS.md](../../ESCENARIOS.md).

## Pruebas

- `npm test`: verde.
  - Las nuevas están en `src/engine/__tests__/oblique.test.ts`.
  - `custom.test.ts` revisa el kit completo de Nekketsu con su escenario: el manifiesto, que no falte ni sobre ningún archivo y que nada pase de 4096 px.
- `npm run e2e`: verde en computadora y teléfono. La nueva es "escena".
- `tsc -b`: limpio.

**Las 9 pruebas de `saigon_hem`** (`verificacion.md` en esta carpeta):

| # | Prueba | Resultado |
|---|---|---|
| 1 | Costuras | 12 trozos, 0 pixeles distintos en los bordes |
| 2 | Paralaje | El cielo y la ciudad cierran el ciclo sin salto |
| 3 | Piso | 3840 x 130 sin un pixel transparente |
| 4 | Apoyo | 11 cajas, 3 postes y 6 objetos sobre piso o plataforma |
| 5 | Colisión | `colision.json` igual al layout en sus 10 listas |
| 6 | Camino | De la salida (40) a la meta (3790) con salto de 36, escalón de 6 y salto largo de 84 |
| 7 | Legibilidad | 233 siluetas: contraste mediano 5.4:1, el peor 2.3:1 (mínimo 2:1) |
| 8 | Paleta | 24 colores usados de los 24 de la ficha |
| 9 | Peso | La pantalla más cargada: 7 capas, 6 luces, 13 piezas animadas y 6 objetos |

**Las pruebas también fallan cuando deben:**
- Un muro alto que tapa la franja sin portón ni cajas corta el camino.
- Un canal más ancho que el salto largo también lo corta.
- Una caja sobre el canal falla el apoyo.
- Un layout distinto del pintado falla la colisión.
- Un color fuera de la paleta falla la prueba 8. Así se encontró un error real: el texto de los letreros salía negro.

**Rendimiento:** el escenario completo sale en unos 2 s y pesa 0,32 MB sin postales, 0,43 MB con ellas.

Entregables en esta carpeta:
- `tablero_ficha_arte.png` y `ficha_arte.md`: la puerta 1, aprobada.
- `postal_inicio.png`, `postal_medio.png` y `postal_final.png`: la puerta 3, aprobada. A x2, con atletas del kit para ver la escala. Las del motor salen sin atletas.
- `postal_muro.png`: el portón nuevo.
- `postal_puesto.png` y `postal_inundada.png`: de más, para revisar todo el tramo.
- `postal_inicio.gif`: el inicio vivo, con los atletas corriendo, la ropa, los cables y las palomas.
- `tramo_completo.png`: los 3840 px de una vez.
- `verificacion.md`.

## Decisiones que tomé sin preguntar

- **El piso del hẻm es concreto claro y no asfalto oscuro,** aunque el layout dice `asfalto`. Los atletas tienen el contorno casi negro y sobre asfalto oscuro se perdían. Además los hẻm de Saigón son de losas de concreto.
- **El `carro` es un xe ba gác,** el triciclo de carga con la plataforma a z 24. Un carro de verdad no mide 24 de alto.
- **Planta baja de 64 px:** así la puerta mide 44 y le pasa un atleta.
- **Callejones cada unos 640 px,** lejos de canales, muros y postes. Por ahí se ve la ciudad a la altura de la cámara del juego. Los canales del layout siguen entre las casas.
- **Las pancartas dicen "XUẤT PHÁT" y "VỀ ĐÍCH",** con una línea blanca en la salida y una franja a cuadros en la meta, pintadas en el piso.
- **El portón va adelante de todo (`orden` = franja + 1)** y sobre la franja solo pone cosas a más de 44 px de alto, más el poste y la reja calada del borde.
- **Los locales salen de una bolsa sin repetir,** así no quedan 3 farmacias seguidas.
- **La legibilidad se mide con el contorno de los atletas del kit (#1e1418),** con mínimo 2:1. El juego puede pasar un contorno por equipo con `--contorno`.
- **Solo el estilo `vietnam`.** Los otros 5 estilos del pedido llegan con sus escenarios. Cada uno pasa antes por su ficha, y pintarlos ahora era adivinar paletas.

## Límites honestos

- **Una hora por escenario:** la mañana. Las otras horas (y la capa `noche_<n>`) se pintan cuando un escenario las pida, con su ficha.
- **El aguacero es el piso mojado y los charcos.** La lluvia que cae la pone el juego con el efecto `lluvia` del kit.
- **Las motos de los carriles las dibuja el juego** con los cuadros de `motos_fondo` hasta el lote D2, que trae los vehículos.
- **La legibilidad mide el contorno, no la ropa.** Un equipo vestido muy oscuro puede leerse peor de lo que dice la prueba.
- **La prueba de camino es una búsqueda en una grilla de 4 x 2 px** con las reglas del juego. No simula la física, así que un salto al límite exacto puede salir distinto en el juego.

## Lo que necesita el siguiente lote

- **El juego** ya carga `escenarios/<id>/` y corre el tramo de punta a punta. Puede cambiar el import interno por `generarEscenario` o por `npm run escenario`.
- **E2** (`saigon_benthanh`, `saigon_rio`, `saigon_azoteas`, `saigon_estadio`): reutiliza todo el sistema y el estilo `vietnam`. Le falta del juego:
  - los layouts jugados en gris;
  - las horas que piden sus fichas: media mañana, mediodía, tarde con aguacero y atardecer.
- **C2:** sigue pendiente la cara "malandra" del Instituto (Kenji, Ryu y Goro).
- **Atletismo:** siguen anotados `javelin_run` y `hurdle_clear`.
- **G1 resto y H1** ya están hechos, en el PR [Lothra2/pixel_forja#13](https://github.com/Lothra2/pixel_forja/pull/13). Esperan revisión.
