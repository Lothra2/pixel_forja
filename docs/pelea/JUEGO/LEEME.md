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
| `luchadores/<id>/` | Rick, Sophie, Alana, Steph y Thor con las animaciones del contrato (más carrera, carrera_atras, agarre y agarrado), 3 poderes, proyectiles, retrato y retrato grande |
| `luchadores/abuela/` y `luchadores/bao/` | Los dos jefes: La Abuela (170 de alto, chancla_bola) y Tío Bao, el Comerciante (192 de alto, non_la_bola). Traen todo lo del contrato menos el lote F |
| `luchadores/<id_malvado>/` | Solo `retrato.png` y `retrato_grande.png` de rick_oscuro, steph_oscura, sophie_oscura, alana_oscura y thor_infernal (las hojas son las mismas con otra paleta) |
| `escenarios/` | Caracas, Ho Chi Minh, Bogotá, Japón y el Reino Celestial, con capas, actores y pétalos. Además China, Italia, USA, Brasil, Egipto, Polo Norte, Hạ Long, Salto Ángel y casa_abuela (el patio de la abuela de noche) solo con sus PNG (los `manifest.json` de esos mundos son del juego, no se pisan) |
| `bonus/` | Los minijuegos: `carro_0.png` a `carro_5.png` (130 x 70), `barril.png` (26 x 32) y los pedazos de 8 x 8 (`pedazo_lata`, `pedazo_vidrio`, `pedazo_rueda`, `pedazo_madera`, `pedazo_aro`) |
| `efectos/` | Chispa de golpe, chispa de bloqueo, polvo y estrellas de mareo, con su manifest |
| `audio/` | 15 temas de música (las 5 ciudades, los 6 mundos nuevos, título, selector, VS y victoria), los efectos y las frases del anunciador, en m4a y ogg, con `indice.json` |
| `video/intro.mp4` | El intro de 10 segundos (960 de ancho, 3,4 MB) |
| `logo.png` | El logo en pixel, 560 x 326 |
| `pantallas/` | Fondos en pixel del título (la familia), del VS y del intro, a 768 x 432 |
| `indice.json` | Los luchadores (los 5 y los jefes que ya tienen arte), los jefes, los escenarios que existen y la ciudad de cada uno |

### Animaciones de cada luchador

- **Movimiento:** guardia (respira en 4 cuadros), avanza y retrocede (6 cuadros), agacharse, agachado, bloqueo, bloqueo_bajo, salto, salto_adelante, cae, levanta, recibe_alto, recibe_bajo, recibe_aire, mareado, victoria e intro.
- **Golpes:** puño_debil, puño_fuerte, patada_debil, patada_fuerte, agachado_puño_debil, agachado_puño_fuerte, agachado_patada_debil, agachado_patada_fuerte (la barrida, tumba), aire_puño y aire_patada.
- **Poderes:** poder1, poder2 y poder3 (el súper), nombrados en `poderes`.
- **Lote F:** carrera (4 cuadros en bucle), carrera_atras (el saltito atrás), agarre (sostiene y lanza, con `golpe` que tumba) y agarrado (2 cuadros). Thor además trota de verdad: su avanza son 8 cuadros con las patas en pares diagonales y su retrocede 6.

### Escala pareja

Todos los cuadros salen a la escala de la guardia desde la fuente (`sf2_escala.py`): la tabla que el juego medía en
`src/logica/escalas.ts` ya está aplicada aquí, al bajar la hoja grande. Con este arte esa tabla tiene que quedar vacía,
si no se escala dos veces.

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
