# Lote I: kit a medida, versión inicial
Estado: entregado
PR: (se completa al abrirlo)
Fecha: 2026-10-12

## Qué se hizo

PixelForja ya tiene un **generador de kits por configuración** que sirve para cualquier juego. El juego describe en un `kit.config.json` qué necesita, y sale el kit del contrato (sección 4 del pedido): `manifest.json`, los atlas PNG + JSON, los retratos, las cabecitas, las armas, los animales, las fuentes y los créditos.

- **El generador:** `src/engine/kit/custom.ts` con `buildCustomKit(config, entradas, opciones)`. Por dentro usa el mismo motor del kit deportivo, generalizado:
  - Los packs ya no son fijos: cada configuración define los suyos.
  - Las armas del piso se pueden pedir por lista.
- **La línea de comandos:** `scripts/kit-a-medida.ts`.
  - Opciones `--rapido` y `--solo <partes>`.
  - Lee las fichas y los equipos relativos a la configuración.
  - Si la configuración está mal, explica cada error y no toca la carpeta de salida.
- **El esquema:** `docs/kit-a-medida.schema.json`.
  - Sale de las mismas listas del motor: las 142 animaciones, las filas, los datos y las 19 armas.
  - Con `"$schema"` en la configuración, el editor autocompleta y marca los errores.
  - Una prueba revisa que no se desfase del código.
- **Errores claros:** cada error trae la ruta del campo y una sugerencia cuando el nombre está mal escrito, por ejemplo: `packs.base[1]: "wlak" no es una animación. ¿Quisiste decir "walk"?`. Los equipos se revisan contra las fichas: atleta sin ficha, atleta en dos equipos, mascota que no existe.
- **Lo que todavía no genera:** escenarios, público, NPC, vehículos, efectos, audio y logo. Se aceptan en la configuración y vuelven como aviso en la consola y en `manifest.pendiente`, con el lote que los trae. El juego puede escribir su configuración completa desde ya.
- **Los ejemplos:**
  - `docs/ejemplos/nekketsu/kit.config.json` y `equipos.json`: los 8 atletas en 5 packs con 52 animaciones, los dos equipos, las pruebas, las 19 armas, Thor y las fuentes con vietnamita.
  - `docs/ejemplos/kit-deportivo.config.json`: el kit deportivo de siempre.
  - `docs/ejemplos/gg-abyss.config.json`: los personajes de GG Abyss. Para eso se sumó `familia_rpg`, la familia con su equipo RPG.
- **El visor de atletas:** `visor.html`, en el sitio junto a la arena, con enlace desde el estudio.
  - Personajes agrupados por equipo.
  - Packs en pestañas.
  - Un tablero con todas las animaciones del pack moviéndose.
  - La animación elegida en sus 5 filas, con los datos dibujados encima. Se prenden y apagan por separado: cajas, cuerpo, manos, cabeza, pies, carga, arma, agua, eventos con su punto, y pivote.
  - Compone el arma elegida en la mano tal como lo haría el juego.
  - Cuadro a cuadro con las flechas, velocidad y zoom.
  - En español e inglés, en computadora y teléfono.
  - Lee el kit como un juego, sin importar el motor.
- **De paso, un hueco del kit:** cuatro animaciones clásicas del pack base (`jump`, `sad`, `fall_getup`, `celebrate`) no traían `cuerpo`, el hurtbox. Ahora todas las animaciones de personas lo traen.
- **Docs:**
  - `docs/KIT_A_MEDIDA.md`: la configuración campo por campo, qué sale, los errores, ejemplos en Phaser y el visor.
  - Sección nueva en el README.
  - El README de los ejemplos de Nekketsu.

## Cómo se usa (estudio y kit)

```bash
npm run kit-a-medida -- salida/kit_nekketsu --config docs/ejemplos/nekketsu/kit.config.json
npm run kit-a-medida -- salida/prueba --config mi_juego/kit.config.json --rapido --solo atletas,fuentes
```

Desde el juego, con PixelForja como submódulo:

```bash
npx tsx tools/pixel_forja/scripts/kit-a-medida.ts public/assets/kit --config kit.config.json
```

**En el sitio:** el botón **Visor del kit** del estudio abre el kit de ejemplo de Nekketsu. El sitio lo arma en el build. Otro kit se abre con **Abrir otro kit** o con `visor.html?kit=<carpeta>/`.

**En Phaser:** cargar solo los packs de la prueba, crear una animación por fila, espejar la izquierda, sacar el hurtbox de `cuerpo` y componer el arma. Todo eso está en [docs/KIT_A_MEDIDA.md](../../KIT_A_MEDIDA.md#en-phaser).

## Pruebas

- `npm test`: 206 de 206. Las 13 nuevas están en `src/engine/__tests__/custom.test.ts`.
- `npm run e2e`: 40 de 40 en computadora y teléfono, con el sitio armado (`npm run build:sitio`). Las nuevas están en `e2e/visor.spec.ts`.
- `tsc -b`: limpio.

| Qué se revisa | Resultado |
|---|---|
| El kit completo de ejemplo se genera en menos de 3 minutos | 79 s en una máquina de 4 núcleos, y también pasa dentro de la suite completa corriendo en paralelo. Pesa 10.4 MB y trae 101 archivos |
| El manifiesto cumple el contrato | `juego`, `generado_con`, `version`, `resolucion` y `filas`. `equipos`, y cada atleta con `equipo`, `celda`, `pivote`, `retratos`, `cabecita` y `packs` con `atlas`. Cada animación con un cuadro de atlas por fila y cuadro, y sus datos en `[fila][cuadro]`. Goro en 64. `animales.thor`, las 19 armas y `ui.fuentes` |
| No falta ningún archivo que nombre el manifiesto | Ninguno, y tampoco sobra ninguno. Cada atlas nombra su imagen |
| Nada pasa de 4096 px | La imagen más grande mide 1600 |
| Los errores dicen el campo y sugieren | 12 casos de configuración y 5 de equipos. La línea de comandos sale con 1 y no crea la carpeta |
| Las configuraciones de ejemplo valen para el motor y para el esquema | Las tres, revisadas también con un validador de JSON Schema (ajv) |
| El kit deportivo y el de GG Abyss se expresan como configuración | Los packs son los mismos que usan `npm run deportes` y `npm run kit` |
| `--solo` | Fuentes solas, armas solas y atletas solos sacan solo eso |
| Visor (e2e) | Carga el kit, agrupa los equipos, Rick con `carry_walk` en las 5 filas con la carga, cuadro a cuadro, el paraguas compuesto en la mano, Goro en 64 y Thor. Sin kit, lo dice claro |

Entregables en esta carpeta:
- `tablero_kit_a_medida.png`: el visor y un cuadro de 6 animaciones con sus datos: Goro, Kenji, Rick con carga, Rick con el paraguas, Sophie nadando con la línea del agua, y Thor.
- `visor_rick_carry_walk.gif`, `visor_rick_weapon_swing.gif` y `visor_sophie_swim.gif`: las 5 filas animadas con los datos encima.

## Decisiones que tomé sin preguntar

- **El kit a medida sale siempre con atlas por pack**, como pide el contrato. El kit deportivo de tiras sigue igual para la arena.
- **Las secciones que todavía no se generan no son error, son aviso.** Así el juego puede escribir su configuración completa desde ya, como en el pedido, y cada lote la va llenando sin que la cambie.
- **Los animales que no tienen ficha se saltan con aviso.** Por ejemplo `chiguire`, que llega con el lote C7. No frenan el kit.
- **`familia_rpg` en `personajes_incluidos`**, para que GG Abyss se pueda expresar. `familia` y `familia_rpg` juntas dan error, porque son los mismos cuatro.
- **`cuerpo` en todas las animaciones de personas.** Era un hueco: el pack `base` del juego traía 4 animaciones sin hurtbox.
- **El visor es una página propia** (`visor.html`), no un paso del estudio. Así lee el kit como un juego, sin el motor, igual que la arena. El estudio lo enlaza.
- **El sitio arma el kit de ejemplo de Nekketsu completo** en `npm run build:sitio`, para que el visor tenga algo que mostrar. Eso suma unos 80 s al build de Netlify.
- **`ajv` como dependencia de desarrollo**, solo para que una prueba confirme que el esquema funciona como esquema de verdad.

## Límites honestos

- **GG Abyss no cabe completo en una configuración.** Salen los personajes, Thor, los retratos y las fuentes. Los enemigos, el jefe, el botín, las armaduras de Thor y el mundo siguen en `npm run kit` hasta la versión completa del kit a medida.
- **La configuración del juego todavía no existe.** El juego no tiene aún su `kit.config.json` ni `data/teams.json`. La de `docs/ejemplos/nekketsu/` es mi versión, con lo que PixelForja ya genera. El juego debería copiarla y ajustarla, y apuntar a sus propias fichas.
- **Los packs del pedido traen animaciones que todavía no existen** (`swim_punch`, `dunked`, `swim_turn`). Llegan con el lote B4. Si el juego las pide hoy, el kit da error con la lista, no un aviso: una animación mal escrita y una que falta se ven igual.
- **El tiempo crece con atletas por animaciones.** 8 atletas con 52 animaciones tardan unos 80 s. Con los equipos nacionales y todos los packs puede pasar del minuto largo. Para iterar está `--rapido`.
- **El visor no dibuja lo que se carga encima del que carga.** Marca dónde va con la `carga`, pero no compone al rival levantado. Eso queda para el lote J, junto al paso Kit del estudio.
- **El build del sitio tarda más:** unos 4 minutos y medio en total con los dos kits.

## Lo que necesita el siguiente lote

- **E1** (escenarios + `saigon_hem`): necesita el layout `data/stages/saigon_hem.layout.json` del juego, que todavía no existe. El kit a medida ya acepta `escenarios` y lo devuelve como pendiente. Cuando llegue E1, se suma a la misma configuración.
- **F** (efectos): no depende de nada. Es el siguiente que se puede hacer sin insumos del juego. Se sumará al kit a medida como `fx`.
- **El juego:** que copie `docs/ejemplos/nekketsu/kit.config.json` a su repo, con sus fichas en `fichas/` y sus equipos en `data/teams.json`, y genere el kit con la línea de comandos. Si algo de la configuración no le sirve, que lo diga antes de E1.
- **C2:** sigue pendiente la expresión base "malandra" de Kenji, Ryu y Goro (cejas fruncidas, media sonrisa).
