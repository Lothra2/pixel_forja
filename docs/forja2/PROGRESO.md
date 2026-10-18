# Forja 2: progreso

El encargo completo está en `docs/PROMPT_FORJA2.md`. Rama: `claude/forja2` (sale de `claude/pelea-familia`).

| Fase | Estado | Puerta |
|---|---|---|
| 0. Base: merge de `abyss-premium` | Hecha, esperando revisión | hash enviado a @parent |
| 0b. Piloto (Rick `luchador` 160 y `cabezon` 48, 4 golpes) | Sin arrancar | espera visto bueno de la fase 0 |
| 1. Cuerpo | Sin arrancar | |
| 2. Movimiento | Sin arrancar | |
| 3. Bibliotecas | Sin arrancar | |
| 4. Poderes y efectos | Sin arrancar | |
| 5. Estudio y exportación | Sin arrancar | |
| 6. GG Abyss con Forja 2 | Sin arrancar | |

## Fase 0: la base

Merge normal de `origin/claude/abyss-premium` (5cca584) en `claude/forja2`, sin reescribir historia. Salieron los 12
conflictos conocidos y ninguno más.

### Cómo se verificó

Con un árbol de cada rama (`git worktree`) y los kits generados sin caché (`--sin-cache`) en los tres:

| Qué | Contra | Archivos | Diferencias |
|---|---|---|---|
| `scripts/game-kit.ts` (kit de GG Abyss) | `abyss-premium` | 3201 | 0, byte por byte |
| `scripts/sports-kit.ts` sin opciones | `pelea-familia` | 852 | 0 |
| `sports-kit --datos --atlas --retratos --cabecitas --objetos --fuentes --deportes calle,pelea` | `pelea-familia` | 61 | 0 |
| `sports-kit --celda 64 --filas right,down --datos --fichas docs/ejemplos/nekketsu/fichas` | `pelea-familia` | 2054 | 0 |
| `kit-a-medida` con `docs/ejemplos/nekketsu/kit.config.json` | `pelea-familia` | 1658 | 0 |
| `golden/` | las dos | 33 | ningún PNG cambió en el merge |

El contrato de pelea de `docs/pelea/JUEGO` lo arma Python (`scripts/luchador_pixel/fiel/sf2_juego.py`) desde las hojas
de Higgsfield, no el motor TS: el merge no lo toca y esas carpetas quedaron intactas.

### Choques que hubo que decidir

Tres cosas de `pelea-familia` cambiaban el kit de GG Abyss por debajo. Quedaron detrás de un interruptor, con lo de
GG Abyss por defecto en su kit y lo de pelea por defecto en todo lo demás:

1. **El pelo de Rick.** Pelea lo pasó a `parted2` en la ficha de la familia (para el olímpico) y GG Abyss lo usa con
   `swept_back`. Ahora `FAMILY_GG.rick.lpcRpg` guarda el de GG Abyss: `familyFicha('rick', true)` (con clase, la de GG
   Abyss) lleva `swept_back` y `familyFicha('rick')` (de calle) lleva `parted2`. La prueba de pelea que pedía el mismo
   pelo en las dos se ajustó a esa regla.
2. **Las cejas fruncidas** de la cara de enojo (la malandra de los rivales). Cambiaban los cuadros de `cast` y
   `attack` de toda la familia y del mercader. Ahora es `avatar.lpc.ceno` (por defecto sí). El kit de GG Abyss lo
   apaga en todas sus fichas, también en las que trae el juego con `--fichas`.
3. **Las letras del vietnamita** en las fuentes del kit de juego. Ahora es `--vietnamita` en `scripts/game-kit.ts`
   (apagado sale como `abyss-premium`). El kit deportivo y el kit a medida las siguen trayendo como antes.

Además:
- Los ambientes del kit de GG Abyss son `AMBIENTES_GG_ABYSS` (la lista de `abyss-premium`). `AMBIENCE_NAMES` sigue
  siendo el catálogo de pelea en su orden. Las pruebas de audio de Abyss miran `AMBIENTES_GG_ABYSS`.
- `velocidad_natural` (de Abyss) sale en el kit de juego y no en el deportivo (`motionOf8(..., { velocidadNatural: false })`).
- `intro.test.ts` eran dos pruebas distintas con el mismo nombre: la de Abyss pasó a `introCine.test.ts`, sin cambios.
- `docs/kit-a-medida.schema.json` se regeneró: el catálogo del kit a medida ahora también ofrece los sonidos de Abyss
  (solo agrega, no quita).
- `--filas` en el kit de juego no aplica a las capas de equipo, la celestial ni los jefes por volúmenes de Abyss
  (siguen saliendo en 8 direcciones).
