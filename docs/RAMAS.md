# Cómo se organiza el repo

Para que GG Abyss y cualquier otro juego siempre tomen la versión más nueva sin perder nada.

## Una sola rama de trabajo

- **Rama viva:** `claude/perfeccionar-ejecucion-smh3ad`. Es la que sigue el submódulo de GG Abyss (`.gitmodules`, `branch = claude/perfeccionar-ejecucion-smh3ad`). Todo lo nuevo de PixelForja entra aquí.
- **Una sola sesión toca PixelForja.** Las sesiones de los juegos no hacen commits en este repo ni abren ramas aquí. Si un juego necesita arte, lo pide por escrito (en GG Abyss, en `ASSETS_PENDIENTES.md`) y lo hace esta sesión.
- **`main`** se pone al día con un PR al cerrar cada parte grande. Después del merge, la rama viva sigue desde `main` sin reescribir historia (nunca `push --force`), así el submódulo de los juegos no se rompe.
- **Ramas viejas.** `claude/ecstatic-ramanujan-oq0r0o` (Mundo 2, capas de equipo, Don Cachivache) ya está unida a la rama viva desde el commit `47efd2d`. `backup/pre-premium-2026-10-10` es un respaldo. Las dos se pueden borrar cuando Rick lo confirme.

## Antes de subir

1. `npx tsc -b` y `npm test` en verde.
2. Si el cambio toca el kit de GG Abyss: generar el kit en una carpeta aparte, correr `npm run verificar-kit` del juego contra esa carpeta y comparar la lista de archivos con el kit que el juego tiene hoy. Si falta un archivo que el juego ya usa, no se sube.
3. Mundos que no se tocaron: regenerar no puede cambiar sus archivos. Se compara byte a byte.

## Del lado del juego

```
git submodule update --remote tools/pixel_forja && npm run kit && npm run verificar-kit
```

La primera vez tarda unos 25 minutos: las capas de equipo de las heroínas se dibujan una por una y quedan guardadas en `tools/pixel_forja/.cache/capas`. Después tarda unos 3 minutos.
