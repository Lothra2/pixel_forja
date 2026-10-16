# Luchador en pixel a mano: de la referencia a la hoja

Así se armaron las hojas de `src/engine/luchador/pixel/rick.ts` y `sophie.ts`. Las hojas en TS son la fuente: se
retocan ahí (una letra por pixel) o se regeneran con estos pasos.

1. `datos/*_idx.npy`: la referencia de pose bajada a la escala de SF2 y cuantizada a la paleta a mano de cada uno
   (`lib.py`, `PAL`). `-1` es transparente.
2. `datos/*_limpio.npy`: lo mismo con el ruido limpio (`lib.limpiar`).
3. `rick_base.py`: la cara de Rick con los lentes y la cinta que ondea, pintadas a mano.
4. `rick_seg.py` y `sophie_seg.py`: cortan la hoja en piezas con sus pivotes, pintan lo que tapan los brazos
   (`rick_pecho.py`) y escriben el `.ts`. Rick lleva además sus caras de dolor y de grito.

Se corren con `python3 scripts/luchador_pixel/rick_base.py && python3 scripts/luchador_pixel/rick_seg.py` y
`python3 scripts/luchador_pixel/sophie_seg.py`. Las vistas de control quedan en `salida/`.
