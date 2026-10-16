# Arte para Street Family Fighter 2

Esta carpeta es el arte listo para el juego, con la misma forma que `public/assets/` del repo
`Lothra2/Street_Family_Fighter_2`. Se copia `assets/` encima y listo, sin tocar código.

Sigue el contrato `docs/CONTRATO_ARTE.md` del juego (lote C):
- una hoja PNG por animación, con los cuadros en una fila;
- un `manifest.json` por luchador, con los ticks, la fase y las cajas de cada cuadro desde el pivote;
- todo mirando a la derecha.

## Qué trae

| Carpeta | Qué hay |
|---|---|
| `luchadores/<id>/` | Rick, Sophie, Alana, Steph y Thor con las 31 animaciones del contrato, 3 poderes, proyectiles, retrato y retrato grande |
| `escenarios/` | Caracas, Ho Chi Minh, Bogotá, Japón y el Reino Celestial, con capas, actores y pétalos |
| `efectos/` | Chispa de golpe, chispa de bloqueo, polvo y estrellas de mareo, con su manifest |
| `audio/` | 9 temas de música, 28 efectos y 12 frases del anunciador, en m4a y ogg, con `indice.json` |
| `video/intro.mp4` | El intro de 10 segundos (960 de ancho, 3,4 MB) |
| `logo.png` | El logo en pixel, 560 x 326 |
| `pantallas/` | Fondos en pixel del título (la familia), del VS y del intro, a 768 x 432 |
| `indice.json` | Los 5 luchadores, los 5 escenarios y la ciudad de cada uno |

### Animaciones de cada luchador

- **Movimiento:** guardia (respira en 4 cuadros), avanza y retrocede (6 cuadros), agacharse, agachado, bloqueo, bloqueo_bajo, salto, salto_adelante, cae, levanta, recibe_alto, recibe_bajo, recibe_aire, mareado, victoria e intro.
- **Golpes:** puño_debil, puño_fuerte, patada_debil, patada_fuerte, agachado_puño_debil, agachado_puño_fuerte, agachado_patada_debil, agachado_patada_fuerte (la barrida, tumba), aire_puño y aire_patada.
- **Poderes:** poder1, poder2 y poder3 (el súper), nombrados en `poderes`.

### Campos nuevos en el manifest (opcionales, el juego puede ignorarlos)

| Campo | Dónde | Qué es |
|---|---|---|
| `golpe` | en la anim | `daño`, `nivel` (debil, fuerte, poder, super), `tipo` (alto, medio, bajo), `tumba`, `pausa` (hitstop), `aturde` y `multi` (pega varias veces) |
| `avance` | en el cuadro | px por tick que el luchador avanza en ese cuadro (embestidas, giros, volteretas) |
| `bola` | en el cuadro | el proyectil que sale en ese cuadro y desde dónde (`x`, `y` desde el pivote) |
| `ciudad` | arriba | el escenario de casa del luchador |
| `retratoGrande` | arriba | el busto para el selector y el VS (160 x 160) |
| `poderes.<n>.sonido` y `costo` | en cada poder | qué efecto suena y cuánta energía pide (25, 35 o 100) |

## Cómo se regenera

Todo sale de `scripts/luchador_pixel/fiel/`:

1. `sf2_plan.py`: el plan de las 125 hojas de Higgsfield (los prompts).
2. `sf2.py`: cada hoja a cuadros de pixel, a la escala y la paleta de la guardia nueva. Las tiras quedan en `datos/sf2/<id>/`.
3. `sf2_juego.py`: las tiras al contrato del juego, con tiempos, fases, cajas, poderes, proyectiles, retratos, efectos, escenarios y audio.
4. `sf2_ver.py <id>`: un GIF con todas las animaciones y una lámina con las cajas, para revisar.

La música y los efectos salen de `src/engine/audio/pelea.ts`, sintetizados con código.
