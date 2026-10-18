# Pelea con Forja 2 (piloto)

Arte de pelea hecho por el motor de PixelForja, sin IA, con el mismo contrato que `docs/pelea/JUEGO/LEEME.md`
(una hoja PNG por animación con los cuadros en fila, `manifest.json` con ticks, fase y cajas desde el pivote).

Es un piloto: solo Rick en estilo SD (cabezón a 96) con `guardia`, `puño_fuerte`, `patada_fuerte` y `recibe_alto`.
Los ticks, las fases y las ventanas activas son las mismas de JUEGO (el balance no cambia). Rick mide 86 px en vez de
188: para probarlo en el juego hay que agrandarlo o achicar el escenario. JUEGO sigue siendo el arte del juego hasta
que Rick apruebe otra cosa.

Se regenera con `npx tsx scripts/forja2-piloto.ts`. Las láminas y los GIFs están en `docs/forja2/piloto/`.
