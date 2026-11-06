# Avisos de terceros

## pixelfx

Los efectos de `src/engine/gotico/vendor/pixelfx/` (núcleo y 169 efectos) y todo lo que se exporta a partir de ellos
(las hojas `fx_*.png` de `scripts/gotico-efectos-pfx.ts`, `efectos_pfx.json`, `luz_efectos_pfx.json`) vienen de
**pixelfx** (https://github.com/patch-gg/pixelfx), bajo licencia MIT:

- Copyright (c) 2026 Patch
- Copyright (c) 2026 Hugo Duprez: `core/sim.js` y los efectos que lo dicen en su encabezado adaptan los efectos de
  pixel art de código abierto de Sprite Fusion (https://www.spritefusion.com/pixel-art-vfx), MIT.
- Copyright (c) 2026 rehan-remade: `core/act.js` adapta cómo Hollow Crown (https://github.com/rehan-remade/hollow-crown)
  actúa sus habilidades, MIT.

El texto completo de la licencia está en `src/engine/gotico/vendor/pixelfx/LICENSE` y los créditos originales en
`src/engine/gotico/vendor/pixelfx/NOTICE.md`; el exportador copia los dos junto a las hojas. La fuente de
`gallery/fonts` de pixelfx no es MIT y no se copió.

La Forja modificó la copia: paletas de fuego y humo del núcleo, vista isométrica 2:1 de los efectos de piso
(`core/forja.js` y los archivos que lo importan), el clima sin franja de piso para usarlo sobre la pantalla, y el índice
`fx/indice.js` con sus tipos `.d.ts`. Cada cambio está marcado con un comentario `Forja` en el archivo.
