# PixelForja

Convierte una imagen de cuerpo entero (un dibujo, una ilustración, un avatar o un pixel art) en un
personaje de pixel art animado y listo para juegos. Funciona con personas y con animales de cuatro
patas. Sin IA y sin servidor: la imagen nunca sale del equipo.

![Antes y después](docs/final/comparacion_familia_futbol.png)

- 75 animaciones humanas: básicas, las 33 de Fútbol Familia GG, portero, básquet, vóley, tenis,
  béisbol, natación, atletismo, artes marciales, skate, bici y RPG.
- 10 animaciones de animal (boxer, perro, mapache, gato).
- Vista lateral y 4 direcciones tipo RPG. Tamaños de 32, 48 y 64 px. Cuerpo chibi, juvenil o realista.
- Editor de poses, galería, "sorpréndeme" y estudio en español e inglés.
- Exporta hoja PNG + JSON (Phaser), preajuste de Fútbol Familia GG, Aseprite, Godot 4, Unity,
  PNG por cuadro, GIF y la ficha del personaje.

Detalle, decisiones y estado: [docs/PLAN.md](docs/PLAN.md).

## Correr el estudio

```bash
npm install
npm run dev          # http://localhost:5173
```

## Generar en lote

```bash
npm run forja -- build samples/gabo.png --out out/gabo --export sheet,ffgg,godot,unity,aseprite,gif
npm run forja -- build samples/thor.png --animal boxer --out out/thor
npm run forja -- build mi_dibujo.png --preset juvenil --anims football,rpg --views side,front,back,left
npm run forja -- render out/gabo/gabo.ficha.json --out out/gabo2 --anims all
```

## Pruebas

```bash
npm test                   # Vitest: motor, calidad de todas las animaciones, exportadores, imágenes doradas
npm run e2e                # Playwright: el estudio en computadora y teléfono
npm run entregables        # hojas, GIF y tabla de calidad en out/entregables
UPDATE_GOLDEN=1 npm test   # aceptar a propósito un cambio visual
```

## Publicar

`netlify.toml` ya está listo: conecta el repo en Netlify y publica `dist`.
