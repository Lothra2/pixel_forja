# Ejemplos para Nekketsu Olympic GG

Material de ejemplo del juego. Todo lo que usan es general del motor, sirve para cualquier juego.

- `rick.ficha.json`: Rick con **vestuario por pack**. Calle para atletismo, bañador para natación, judogi para pelea y camiseta de la Familia GG para fútbol. Ábrela en el estudio (Inicio, Abrir ficha) y en Animar aparecen sus variantes. También sirve para el kit:

```bash
mkdir -p mis_fichas && cp docs/ejemplos/nekketsu/rick.ficha.json mis_fichas/
npm run deportes -- salida/kit_nekketsu --fichas mis_fichas --deportes pelea,natacion \
  --filas right,down_right,up_right,down,up --datos --atlas --retratos --cabecitas
```

Sale `atletas/rick/pelea.png + .json` (atlas JSON Hash de TexturePacker), `atletas/rick/retratos.png`, `ui/cabecitas.png` y un `manifest.json` con `cajas`, `manos`, `cabeza` y `pies` por fila y cuadro. Los campos están explicados en [docs/KIT_DEPORTES.md](../../KIT_DEPORTES.md#datos-por-cuadro-atlas-retratos-y-vestuario).

Los nombres de pack del juego (`base`, `judo`...) llegan con el lote B. Por ahora el vestuario usa los packs que ya tiene el kit deportivo: atletismo, natacion, voley, tenis, pelea y futbol.
