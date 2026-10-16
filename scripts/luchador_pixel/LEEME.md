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
