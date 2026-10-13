# Lote D2: vehículos en la vista inclinada
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/20
Fecha: 2026-10-12

## Qué se hizo

Todo lo que pide la noche para D2, en la proyección del punto 1: el punto (x, y, z) del mundo cae en (x + 0.35 y, y − z), con la cara izquierda a la vista. Va con el contorno del motor, el sombreado en bandas y la luz desde la izquierda. Es un módulo general (`src/engine/world/oblique/vehiculos.ts`) con su sección en el kit a medida.

| Id | Animaciones | Detalle |
|---|---|---|
| `ferry` | `andando` (4), `atracado` (2) | <ul><li>Huella de 110 × 40 y 12 de alto, igual al gris del juego.</li><li>Casco rojo y blanco, cubierta de tablas con baranda y salvavidas.</li><li>La caseta del timón a la derecha y la bandera de Vietnam que flamea.</li><li>Espuma en la proa cuando anda.</li><li>La gente se para en la cubierta, a z = 12.</li></ul> |
| `xich_lo` | `andando` (4) | De frente a la izquierda. El pasajero adelante con su capota roja, el que pedalea atrás con nón lá, y los pedales que giran. |
| `moto_rojo`, `moto_azul`, `moto_amarillo`, `moto_verde` | `andando` (4), `frenando` (3), `corneta` (4) | <ul><li>Con conductor y casco del color de la moto.</li><li>Andando: humito del escape.</li><li>Frenando: la trompa baja, la luz de freno y el polvo.</li><li>Corneta: el conductor mira atrás y salen las rayitas del pito.</li></ul> |
| `bote_bambu` | `meciendo` (4) | El thúng chai redondo y tejido, con su remero de nón lá. |
| `metrocable` | `colgando` (4) | La cabina roja y blanca de la línea J con sus ventanas, colgando del cable y meciéndose. |
| `jacintos` | `flotando` (2) | La roseta de hojas con el ramillete lila. |
| `frutas_regadas` | `quieta` | Mangos, naranjas, pitahayas y un racimo de cambur en el piso. |

**En el kit a medida**, la sección `vehiculos` deja de ser un aviso pendiente:
- `true` o una lista de ids. `"moto"` son los 4 colores.
- Cada vehículo sale en `vehiculos/<id>.png`, una tira de cuadros.
- El manifiesto trae `ancla`, `huella`, `anims` y `mira`.

## Cómo se usa (estudio y kit)

En el `kit.config.json` del juego:

```jsonc
"vehiculos": true
```

**Lo que hace el juego:**
- Pone el ancla del cuadro en el (x, y) de la entidad del layout, igual que el ferry gris de hoy: `px(x0, y)` para la x y `FT + y` para la y.
- El ferry se mueve como hoy y usa `andando` mientras cruza y `atracado` en el muelle.
- Las motos vienen `desde: "derecha"`, como dicen los layouts del hẻm, así que miran a la izquierda.
- El metrocable se mueve por su cable en el cielo de la Comuna 13.
- Los jacintos van en el río hondo, donde el juego ya los suelta.

## Pruebas

- **Prueba nueva `vehiculos.test.ts`:**
  - Están los 10, con cuadros del mismo tamaño, sus animaciones y el contorno del motor.
  - El ferry tiene la huella del gris, y su cubierta y su ancla caen donde dice la proyección.
  - La moto frena distinto de como anda, y los colores se distinguen.
  - Imagen dorada `golden/vehiculos_d2.png`.
- **`custom.test.ts`:**
  - El kit con `vehiculos: ["ferry", "moto", "transmilenio"]` saca el ferry y las 4 motos con su manifiesto. El transmilenio vuelve como aviso.
  - El kit completo de Nekketsu trae los 10.
  - El esquema está regenerado.
- **Suite completa:** 28 archivos, 284 de 284.
- **`npm run build:sitio` limpio y e2e de Playwright 44 de 44.** `tsc` limpio.

## Para aprobar (todo en esta carpeta)

- `vehiculos.gif`: Sophie y Alana cruzan el río paradas en la cubierta del ferry. Pasan el metrocable por el cielo, el thúng chai y los jacintos en el agua, y el xích lô y dos motos por la calle (una pitando). En la calle hay fruta regada.
- `tablero_vehiculos.png`: todos los cuadros de cada uno, con el ancla marcada en magenta.

## Decisiones que tomé sin preguntar

1. **El módulo trae su propia proyección (K = 0.35)** y no usa el de la vista inclinada de E2. Esta rama sale de la cadena P1 → C2 → B2/B3 → C7, donde está el kit, y la vista inclinada está en la rama de E2. Las cuentas son las mismas, y cuando se unan todas se puede usar una sola constante.
2. **El ancla es la esquina de atrás a la izquierda de la huella, en el piso,** porque así ubica hoy el juego su ferry gris. El juego no tiene que cambiar cuentas.
3. **Las motos y el xích lô miran a la izquierda,** como vienen en los layouts. El espejo no sirve en la vista inclinada, así que el manifiesto dice `mira`. Si hace falta el otro sentido, es otra tira.
4. **El ferry no trae el letrero "FERRY":** el juego ya lo escribe con su fuente.
5. **Los conductores son figuritas de 12 a 14 px, no atletas.** Son parte del vehículo, como en los juegos de la época.
6. **Jacintos y fruta regada van como objetos** de la misma sección, con su ancla, para que el juego los ponga igual que un vehículo.

## Límites honestos

- **Solo los de la noche.** Del pedido completo de D2 faltan `moto_carga`, `junco`, `transmilenio`, `buseta`, `willys`, `camionetica`, `carro` x3, `helicoptero` y `avion`. Vuelven como aviso del kit.
- **Las motos solo miran a la izquierda.**
- **El metrocable no trae su cable largo ni las torres:** eso es del escenario de la Comuna 13 (E3).
- **Los conductores no tienen las caras del kit:** a 12 px es una cabeza con casco o nón lá.

## Lo que necesita el siguiente lote

- **El juego:** `"vehiculos": true` en su `kit.config.json`, y cambiar sus rectángulos grises por las tiras, poniendo el ancla en el (x, y) de cada entidad.
- **E3:** el metrocable y la escalera eléctrica van en la Comuna 13. El helicóptero de Caracas es un vehículo nuevo de esta misma sección.
- **Dependencia:** esta rama sale de C7 (https://github.com/Lothra2/pixel_forja/pull/19).
