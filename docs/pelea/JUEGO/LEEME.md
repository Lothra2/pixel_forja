# Arte para Street Family Fighter 2

Esta carpeta es el arte listo para el juego, con la misma forma que `public/assets/` del repo
`Lothra2/Street_Family_Fighter_2`. Se copia `assets/` encima y listo, sin tocar código.

Sigue el contrato `docs/CONTRATO_ARTE.md` del juego:
- una hoja PNG por animación, con los cuadros en una fila;
- un `manifest.json` por luchador, con los ticks, la fase y las cajas de cada cuadro desde el pivote;
- todo mirando a la derecha.

## Qué trae

**Rick:**
- **Animaciones:** guardia, avanza, retrocede, agachado, salto, puño_fuerte, patada_aerea (es un puño en el aire), recibe_alto, recibe_bajo, onda, embestida, super, bloqueo, bloqueo_bajo, victoria, cae y levanta.
- **Proyectiles:** onda_bola y super_bola.
- **Retrato.**

**Sophie:**
- **Animaciones:** guardia, avanza, retrocede, agachado, salto, patada, patada_voladora, mil_patadas, remolino, super (la Tormenta), recibe, recibe_bajo, bloqueo, bloqueo_bajo, cae, levanta y victoria.
- **Retrato.**

**Escenario:**
- **`escenarios/japon/`:** las 6 capas y su manifest de parallax. El juego lo lee con la fórmula de cámara de su manifest.

## Lo que falta

| Falta | Qué usa el juego mientras tanto |
|---|---|
| La patada de Rick | puño_fuerte |
| El puño de Sophie | patada |

Esas poses no existen todavía. Hacen falta poses nuevas y eso pide créditos.

## Cómo se regenera

1. En `pixel_forja`, corre `exportarLuchadorJuego` (`src/engine/luchador/pixel/juego.ts`) con las animaciones de `golpesPixel.ts`.
2. Saltos y patada voladora:
   - salen sin altura, porque el juego ya sube al luchador;
   - los giros se quedan.
3. Las cajas que pegan:
   - miden 34 x 28 alrededor del puño o del pie;
   - el remolino pega abajo y a los dos lados, porque es golpe bajo.
