# Luchador en pixel: de la referencia a la hoja

Así se arman `src/engine/luchador/pixel/rick.ts`, `sophie.ts`, `rickDibujos.ts` y `sophieDibujos.ts`. Esos archivos
son la fuente: se retocan ahí (una letra por pixel) o se regeneran con estos pasos.

## Las referencias

Las imágenes salen de Higgsfield (`gpt_image_2_5`), pedidas solo con texto. Ninguna foto de la familia salió de `private/`.

- **La guardia** de cada uno es la referencia que Rick aprobó (`fiel/datos/ref/`).
- **Las poses clave** se pidieron con esa guardia como referencia del personaje. Las poses las elegí yo.
- **Cada pose se baja a su grilla original** y queda en `fiel/datos/poses/*.npy`. Las imágenes grandes no van en el repo.

## Los pasos

| Paso | Script | Qué hace |
|---|---|---|
| 1 | `fiel/grilla.py` | Encuentra la grilla de pixeles de la referencia (las líneas de borde cada ~5,8 px) y saca la mediana de cada celda: el pixel art original, pixel por pixel |
| 2 | `fiel/limpiar.py` | Quita el fondo, también el que queda encerrado entre las colas de la cinta, y arma la paleta de 48 tonos |
| 3 | `fiel/motas.py` | Funde las motas azuladas del fondo que quedaron sueltas |
| 4 | `fiel/rick_fiel.py`, `fiel/sophie_fiel.py` | Cortan la guardia en piezas con sus juntas, pintan lo que tapan los brazos (`pecho_fiel.py`), escriben el `.ts` y las caras de Rick |
| 5 | `fiel/poses.py` | Baja cada pose clave a su grilla y a la paleta de la guardia, con la escala igualada (`ESCALA`) |
| 6 | `fiel/dibujos.py` | Mide en cada pose el ancla en el piso, la cabeza, los puños y los pies, y escribe los `*Dibujos.ts` |

Para regenerar desde los datos guardados, sin bajar nada:
```
python3 scripts/luchador_pixel/fiel/rick_fiel.py
python3 scripts/luchador_pixel/fiel/sophie_fiel.py
python3 scripts/luchador_pixel/fiel/dibujos.py
```

## El escenario japonés por capas

Las capas salen de Higgsfield (`gpt_image_2_5`), pedidas solo con texto: primero la imagen maestra
(`escenario/datos/maestra.png`) y después cada capa con la maestra de referencia y fondo magenta.
Cada capa se pidió con la misma composición, así encajan una sobre otra.

| Capa | Qué trae | Factor |
|---|---|---|
| `cielo` | la luna llena, las estrellas y las nubes | 0.1 |
| `montes` | el monte Fuji y los cerros con el lago | 0.25 |
| `castillo` | el castillo, el torii y los cerezos de atrás | 0.5 |
| `muro` | el muro de tejas con los faroles y el estandarte | 0.8 |
| `piso` | las tablas con el reflejo de los faroles, en perspectiva | 0.8 arriba, 1 en los pies |
| `frente` | las ramas de cerezo y los faroles de piedra de adelante | 1.2 |

`escenario/capas.py` quita el magenta, baja cada capa a su pixel real (unos 2,2 px de la imagen) y les pone
una paleta común de 96 tonos. Escribe `public/escenarios/japon/<capa>.png` a 611 x 262:
```
python3 scripts/luchador_pixel/escenario/capas.py
```
El manifest (`public/escenarios/japon/manifest.json`) dice el factor de cada capa, la fila del piso, el rango
de la cámara y cómo se calcula todo. El motor lo usa con `escenarioDesdeManifest` (`luchador/pixel/parallax.ts`).
