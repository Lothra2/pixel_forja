# Lote F: efectos
Estado: entregado
PR: https://github.com/Lothra2/pixel_forja/pull/12
Fecha: 2026-10-12

## Qué se hizo

PixelForja tiene un **catálogo general de efectos**: 56 efectos en pixel art, dibujados con código, deterministas y sin piezas de nadie. Es todo lo que pide la sección 11 del pedido, y sirve para cualquier juego.

| Grupo | Efectos |
|---|---|
| Polvo | `polvo_correr`, `polvo_frenar`, `polvo_caer`, cada uno en `chico`, `medio` y `grande` |
| Golpe | `chispa_golpe_liviano`, `_medio`, `_pesado`, `estrellas_mareo` (estrellas y pajaritos), `nube_ko` |
| Reacciones de anime | `vena_enojo`, `gota_nervios`, `sonrojo`, `exclamacion`, `interrogacion`, `lagrima_comica`, `sudor` |
| Agua | `chapuzon_chico`, `chapuzon_grande`, `estela`, `ondas` |
| Fiesta | `confeti` (en mosaico), `serpentina`, `fuegos_artificiales` en rojo, azul, dorado y verde |
| Objetos | `bola_tama` (4 estados de daño), `bola_tama_explota` (se abre y cae el confeti), `bola_tama_cartel` (sin texto), `mecha_tejo`, `estela_chapa`, `ventana_rota` |
| Pantalla completa | `pantalla_rota`, `lineas_velocidad`, `marco_corte`, a la resolución del juego |
| Clima | `lluvia` (mosaico sin costuras), `salpicadura_piso`, `onda_charco`, `relampago`, `calor` |
| Técnicas | `rayo_catatumbo`, `onda_furro`, `rafaga_abanico`, `vapor_termo`, `aura_nekketsu` |
| Ambiente | `humo_moto`, `petalo_buganvilla`, `hoja`, `arena`, `brillo_record`, `huella_mojada` |

- **Cada efecto dice cómo se usa:**
  - `ancla`: el pixel que va sobre el punto del personaje.
  - `se_pega_a`: pies, cabeza, mano, agua, objeto, pantalla, mosaico o libre.
  - `capa`: delante o detrás.
  - Celda, cuadros, fps y bucle.
  - Para qué sirve, en español e inglés.
- **Cómo está hecho:**
  - `src/engine/fx/catalog.ts`: el catálogo.
  - `src/engine/fx/pix.ts`: un lápiz de pixel art con puntos, discos, anillos, líneas, contorno y desvanecido en granitos sueltos.
- **En el kit a medida (`"fx"`):**
  - Se piden todos (`true`), por id, por base (`polvo_correr` trae sus 3 tamaños) o por grupo (`reaccion`).
  - Sale `fx/<id>.png` con su entrada en `manifest.fx`.
- **En el estudio:** Inicio, **Efectos del juego**.
  - Todos animados, por grupo.
  - Fondo oscuro, claro o a cuadros.
  - Zoom x2 a x4.
  - Descarga de todo en `efectos.zip`.
  - En español e inglés.

**El pedido chico del juego, `audio` en el kit a medida:**
- Se aceptan `audio.sfx`, `audio.musica` y `audio.ambientes` con los sonidos que ya tiene el motor: 49 efectos, 4 músicas y 6 ambientes.
- Cada sección acepta `true` (todos) o la lista.
- Salen como WAV en `audio/sfx/`, `audio/musica/` y `audio/ambiente/`, con `archivo`, `duracion` y `bucle` en `manifest.audio`.
- Los nombres que todavía no existen (`silbato`, `marcha_nekketsu`) se saltan con aviso y quedan en `manifest.pendiente`. Así el juego puede dejar su puente sin esperar al lote H.

**De paso:**
- **Un sonido siempre sale igual:** los efectos de sonido y la música usaban una semilla compartida, así que el ruido de un sonido cambiaba según qué otros se pidieran antes. `renderSfx` y `renderMusic` arrancan siempre de la misma semilla.
- **Créditos:** el kit avisa en `CREDITOS.txt` que efectos y sonidos son de código propio.
- **Lote I en main:** el PR #11 seguía abierto en GitHub. Lo mezclé yo, porque ya estaba aprobado.

## Cómo se usa (estudio y kit)

```jsonc
// kit.config.json
"fx": true,                                          // o ["polvo", "golpe", "reaccion", "chapuzon_grande"]
"audio": { "sfx": ["golpe", "esquiva", "paso_tierra_0"], "ambientes": ["agua"] }
```

```bash
npm run kit-a-medida -- salida/kit --config kit.config.json
npm run kit-a-medida -- salida/kit --config kit.config.json --solo efectos,audio   # solo eso, en segundos
```

En Phaser, con el ancla:

```js
const e = m.fx.chispa_golpe_medio;
const [px, py] = anim.eventos.find((v) => v.tipo === 'impacto').punto[filaIdx];
scene.add.sprite(sprite.x + px, sprite.y + py, 'fx_chispa_golpe_medio')
  .setOrigin((e.ancla[0] + 0.5) / e.w, (e.ancla[1] + 0.5) / e.h).play('fx_chispa_golpe_medio');
```

Qué efecto va con qué evento (`paso`, `aterriza`, `impacto`, `dizzy`, `dive`...), el catálogo completo y más ejemplos: [docs/EFECTOS.md](../../EFECTOS.md). El audio: [docs/KIT_A_MEDIDA.md](../../KIT_A_MEDIDA.md#efectos-y-audio).

## Pruebas

- `npm test`: 216 de 216. Las nuevas están en `src/engine/__tests__/effects.test.ts`, y `custom.test.ts` revisa el kit completo con efectos y audio.
- `npm run e2e`: 42 de 42 en computadora y teléfono. La nueva es "efectos del juego". Esa prueba encontró un error en la página: el primer cuadro salía con un tiempo negativo y la animación se cortaba. Está arreglado, y las dos corridas de esa prueba pasan.
- `tsc -b`: limpio.

| Qué se revisa | Resultado |
|---|---|
| Está todo lo del pedido | Los 45 nombres de la sección 11, con los 3 tamaños, los 3 pesos y los 4 colores |
| Cada efecto con celda, cuadros y fps en el manifiesto (la aceptación del pedido) | Sí, más ancla, a qué se pega, capa, grupo y uso |
| Cuadros del tamaño de su celda, ancla adentro, pixeles nítidos (alfa 0 o 255) | Los 56 |
| Ningún cuadro vacío | Salvo los apagones del relámpago y la entrada del corte de anime, que son a propósito |
| Nada pasa de 4096 px | A 1280 x 720, `marco_corte` pasa a 3 columnas y mide 3840 x 1440 |
| Determinista | Dos veces, los mismos pixeles |
| Imagen dorada | `golden/efectos.png`: el cuadro del medio de cada efecto |
| Audio | WAV válidos con duración. Los sonidos no cambian según cuáles se pidan. `audio: { sfx: true }` trae los 49 |
| Errores de dedo y nombres futuros | `chispa_golpe_pesada` y `ladridoo` dan error con sugerencia. `golpe_1`, `aro` y `silbato`, del lote H, salen como aviso |
| Kit completo de Nekketsu | 56 efectos y 17 sonidos más, sin archivos de sobra ni que falten |
| Estudio (e2e) | Los efectos se animan, los grupos filtran (7 reacciones, 56 en total) y se descarga `efectos.zip` |

Entregables en esta carpeta:
- `tablero_efectos.png`: los 56 efectos cuadro a cuadro, a x2, por grupo. Los de pantalla completa van a 320 x 180.
- GIFs con el efecto puesto con su ancla sobre un atleta del kit:
  - `golpe_chispa.gif`: Rick, jab con la chispa en el punto del impacto.
  - `correr_polvo.gif`: Kenji corriendo, polvo en cada paso.
  - `mareo_estrellas.gif`: Steph mareada.
  - `aura_nekketsu.gif`: Goro con el aura detrás.

## Decisiones que tomé sin preguntar

- **Un catálogo nuevo, aparte de los Poderes RPG.** Los poderes (fuego, hielo...) son de GG Abyss y van aplastados para isométrico. Estos son para un beat 'em up de lado, con otra paleta y otros usos. En el estudio son dos páginas: **Poderes** y **Efectos del juego**.
- **Ids con sufijo** para tamaños, pesos y colores (`polvo_correr_medio`, `fuegos_artificiales_rojo`). La base o el grupo los trae todos juntos.
- **Tamaños del polvo:** `chico`, `medio` y `grande` son para personajes de 32, 48 y 64.
- **Sin mezcla de colores:** todo opaco o transparente, como el resto del kit. La lluvia y el calor se ven mejor con opacidad baja, y eso lo pone el juego.
- **Todo mira a la derecha,** como las filas del kit. Se espeja con `flipX`.
- **La bola del Tama-wari en estados:** 4 cuadros que el juego elige según el daño (fps 0), más la explosión y el cartel como efectos aparte con la misma ancla.
- **El aura es una llama entera detrás del personaje:** el cuerpo tapa el centro y se ve el borde. Un aura con hueco se veía como un arco de fuego.
- **Error o aviso en los nombres:**
  - Un nombre a 1 letra de uno que existe (2 en nombres largos) es error de dedo.
  - Uno que no se parece a ninguno es de un lote futuro y sale como aviso.
  - En nombres de 4 letras o menos no se adivina (`aro` no es `arco`), y `golpe_1` no es `golpe` mal escrito.
- **El kit de GG Abyss no cambia:** sigue generando su audio como antes. La semilla nueva solo la usa el kit a medida.
- **Mezclé el PR #11** (Lote I) porque seguía abierto y lo diste por aprobado. El Lote F sale de ese main.

## Límites honestos

- **Reacciones de tamaño fijo:** están pensadas para la cabeza de un personaje de 48. En 64 (Goro) se ven chicas: el juego las puede escalar x2.
- **Efectos de ambiente chiquitos:** pétalo, hoja y huella miden 6 a 8 px. Se leen en movimiento, no en una foto.
- **Líneas de velocidad solo blancas:** sobre un fondo claro, el juego las tiñe de negro (`setTint(0x000000)`).
- **El relámpago no ilumina la pantalla:** trae los cuadros apagados (2 y 5), y el destello lo hace el juego en los cuadros 1 y 3.
- **El audio es el que ya tenía el motor,** con sabor a GG Abyss (espadazo, jefe_rugido, legendario). Sirven golpe, esquiva, bloqueo, pasos, ladrido e interfaz. Los sonidos propios del juego (silbato, pistola, chancleta, marcha) llegan con H1.
- **No hubo "párate para aprobar" en este lote,** pero conviene que Rick mire el tablero. Pixel art hecho con código siempre tiene gusto, y cualquier efecto se ajusta fácil.

## Lo que necesita el siguiente lote

- **E1** (escenarios + `saigon_hem`): sigue esperando `data/stages/saigon_hem.layout.json` del juego.
- **G1 resto y H1** (interfaz y audio de la rebanada vertical): son los siguientes que no dependen de nada.
  - H1 llena los nombres que hoy quedan en `manifest.pendiente`: `silbato`, `pistola`, `marcha_nekketsu`...
  - Esos nombres se piden igual en `audio`, sin cambiar la configuración del juego.
- **Pedidos del juego anotados para los lotes de atletismo:**
  - `javelin_run`: carrerita en bucle con la jabalina al hombro.
  - `hurdle_clear`: el salto de valla sin la valla dibujada.
- **C2:** sigue pendiente la cara "malandra" del Instituto Nekketsu (Kenji, Ryu y Goro): cejas fruncidas y media sonrisa.
