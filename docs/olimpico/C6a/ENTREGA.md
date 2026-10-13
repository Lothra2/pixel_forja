# Lote C6a: la gente de la calle de la Comuna 13
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/23
Fecha: 2026-10-13

## Qué se hizo

Los NPC de la Comuna 13 con lo que acordamos con el agente del juego: del mismo tamaño que los atletas, con el ancla en los pies, de frente o en 3/4 hacia la calle y sin espejo. En el kit van en la sección `npc`, una tira por NPC.

| NPC | Animaciones | Detalle |
|---|---|---|
| `bailarin_1`, `bailarin_2`, `bailarin_3` | `toprock` (8, bucle), `molino` (8, bucle), `reclama` (4) | <ul><li>Tres distintos: gorra al revés y sudadera roja, trenzas y top amarillo, y cornrows con chaqueta negra y blanca.</li><li>El toprock cruza los pies con rebote y brazos abiertos.</li><li>El molino gira en el piso con las piernas en V.</li><li>En reclama abren los brazos y gritan.</li></ul> |
| `pelado_1`, `pelado_2` | `espera` (4, bucle), `patear` (5), `perdon` (4) | <ul><li>Más bajitos que los adultos: camiseta amarilla de la selección, y verde y blanca.</li><li>La patada va de lado. La pelota sale en el cuadro 2: `eventos.patear`.</li><li>En perdón se encogen y juntan las manos.</li></ul> |
| `grafitero` | `pintar` (6, bucle), `mirar` (3) | <ul><li>Capucha violeta y bandana.</li><li>Pinta en 3/4 de espaldas, contra su muro, con la lata de spray.</li><li>Mira de frente a quien pasa.</li></ul> |
| `musicos` (grupo) | `tocar` (8 a 8 fps, bucle), `animar` (4) | <ul><li>El rapero con micrófono y el percusionista con sombrero y tambora, en un solo sprite.</li><li>El parlante en el piso, que late con el golpe.</li></ul> |
| `vendedor_paletas` | `llamar` (4, bucle), `ofrecer` (3) | <ul><li>Gorra roja y camisa menta, en 3/4 hacia la calle.</li><li>Sacude la campanita y ofrece una paleta de mango.</li></ul> |
| `pelota` | `girar` (4, bucle) | 8 x 8, blanca con sus parches, para cuando la patean |

**Motor, todo general:**
- **13 animaciones nuevas en el pack `calle`** (`src/engine/anim/calle.ts`). Sirven para cualquier personaje.
- **5 objetos de mano nuevos:** `spray`, `campana`, `microfono`, `paleta` y `tambor`.
- **La sección `npc` del kit a medida** (`src/engine/kit/npc.ts`):
  - Las fichas van en su propia carpeta: no son atletas.
  - Sus animaciones, la vista y los grupos en un solo sprite.
  - La pelota.
  - Una ficha o animación que falta se salta con aviso.
- **Ya no queda ninguna sección pendiente en el kit:** `npc` era la última.

## Cómo se usa (estudio y kit)

En el `kit.config.json` del juego, la sección `npc` completa está en `docs/ejemplos/nekketsu/kit.config.json`. Hay que copiar las 9 fichas de `docs/ejemplos/nekketsu/npc/` a la carpeta que diga `npc.fichas` (en el ejemplo, `npc/`, al lado del `kit.config.json`).

```jsonc
"npc": { "fichas": "npc/", "pelota": true, "personajes": { "bailarin_1": { "anims": ["toprock", "molino", "reclama"] }, ... } }
```

**El juego:**
- Pone cada NPC con el ancla en el (x, y) de su entidad del layout y lo ordena con `setDepth(FT + y)`. Si está sobre una caja, va con la profundidad de la caja, como los atletas.
- Toca la animación normal en bucle, y la reacción cuando un atleta pasa a menos de 40 px, que es lo que acordamos.
- Mueve a los bailarines en ronda.
- Suelta la pelota en el cuadro del `impacto` de `patear`.
- Los nombres de las reacciones son los que pidió el juego: `reclama`, `patear` y `perdon`, `mirar`, `animar` y `ofrecer`.

## Pruebas

- **Prueba nueva `calle.test.ts`, 7 casos:**
  - Las 13 animaciones con sus cuadros, fps, bucle y eventos, como se acordó.
  - Las 9 fichas válidas, con los pelados más bajitos que los adultos.
  - Cada NPC del kit pasa el control de calidad en su vista y en todas sus animaciones.
  - El molino gira de verdad: los 8 cuadros son distintos.
  - La sección `npc` del kit: las tiras, el ancla, `desde`, la patada en el cuadro 2, las vistas, el grupo y la pelota.
  - Validación con sugerencias, y la ficha que falta se salta con aviso.
  - La imagen dorada `golden/npc_c6a.png`.
- **`custom.test.ts`:**
  - La prueba de "lo pendiente" ya no lleva `npc`.
  - El kit completo de Nekketsu trae los 10 PNG de `npc/`.
  - El esquema está regenerado.
- **Suite completa:** 29 archivos, 291 de 291. La corrida completa dio 290, con la cuenta de imágenes del kit vieja (faltaban las 9 de `npc/`). La corregí y esa prueba pasa: 15 de 15.
- **`tsc` limpio, `npm run build:sitio` limpio y e2e de Playwright 44 de 44.**

**Estaturas en la celda de 48** (con el pelo):
- Adultos: de 41 a 46.
- Pelados: 36 y 38.
- Los atletas van de 40 a 44, y Sophie mide 38.

El juego pidió adultos de 44 a 48, pero también "del mismo tamaño que los atletas". Me quedé con lo segundo.

## Para aprobar (todo en esta carpeta)

- `tablero_npc.png`: las 9 tiras y la pelota, con cada animación y su vista.
- **Los NPC puestos en la Comuna 13 de E3a**, con Sophie y Alana pasando, y cada uno reacciona cuando alguien pasa a menos de 40 px:
  - `npc_subida.gif`: los tres bailarines en la subida reclaman cuando los atropellan, y el grafitero se voltea.
  - `npc_callejon.gif`: los pelados, la patada y la pelota que cruza el callejón.
  - `npc_estacion.gif`: el vendedor de paletas llamando y ofreciendo.
  - `npc_mirador.gif`: los músicos con el parlante, que se animan cuando pasan.

## Decisiones que tomé sin preguntar

1. **El grafitero pinta en 3/4 de espaldas** (`espalda_tres_cuartos`), no de frente. Su mural está detrás, en el muro de grafitis. De frente parecería que pinta el aire. Cuando mira, se voltea de frente. La vista se elige por animación en la configuración, así que el juego lo puede cambiar.
2. **El vendedor va en 3/4 hacia la calle,** porque llama a la gente que viene. Los demás van de frente.
3. **Los músicos son dos más el parlante,** no tres: el rapero y el percusionista con tambora. Un tercero no cabía bien y se encimaba con los otros dos.
4. **Los eventos van como en todo el kit,** `{ "tipo": "impacto", "cuadro": 2 }`, y no como `cuadro_patada`. Así el juego lee todos los eventos igual. Se lo explico en el mensaje.
5. **El molino es un giro completo del cuerpo** sobre los hombros, con las piernas en V. A 48 px y con cabeza chibi, el molino real (los hombros quietos y las piernas dando vueltas) no se lee: se ve como un bulto. Así se lee como "gira en el piso".
6. **Los pelados juegan con su pelota propia** de 8 x 8, no con el balón de goma de las armas del piso.

## Límites honestos

- **Los NPC solo traen las animaciones que se acordaron,** en su vista. No caminan ni se mueven en 8 direcciones. Si el juego los quiere mover de verdad (los bailarines en ronda ya los mueve), puede pedir `walk` en la configuración, porque sirve cualquier animación del motor.
- **El molino se lee como giro, no como molino de break de verdad** (ver arriba).
- **Los brazos chibi son cortos:** la tambora y el micrófono se leen, pero los golpes del tambor son sutiles a 48.
- **La capucha del grafitero deja asomar unas puntas del pelo** de la ficha base. Se lee como capucha con rayas.
- **Las estaturas** quedan de 41 a 46, no de 44 a 48 (ver Pruebas).

## Lo que necesita el siguiente lote

- **El juego:** la sección `npc` y las 9 fichas. Cambiar los monitos grises por las tiras, reacción a menos de 40 px y soltar la pelota en el `impacto`.
- **Siguiente lote del orden: E3b, la azotea de Caracas** (`caracas_azotea`). Necesita el estilo `venezuela_ciudad` y el helicóptero con reflector como vehículo nuevo.
- **Dependencia:** esta rama sale de D2 (https://github.com/Lothra2/pixel_forja/pull/20). Los GIF usan la Comuna 13 de E3a (https://github.com/Lothra2/pixel_forja/pull/22), pero el código no depende de ella.
