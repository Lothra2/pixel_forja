# Efectos del juego

El catálogo general de efectos de PixelForja: polvo, chispas de golpe, reacciones de anime, agua, fiesta, objetos, clima, técnicas, ambiente y efectos de pantalla completa. Son 63 efectos en pixel art, dibujados con código, deterministas y sin piezas de nadie. Sirven para cualquier juego.

- **En el estudio:** Inicio, **Efectos del juego**. Están todos animados, por grupo, sobre fondo oscuro, claro o a cuadros, y se descargan juntos (`efectos.zip`, con las hojas y `efectos.json`).
- **En el kit a medida:** con `"fx": true` salen todos. También se puede pedir una lista de ids (`chispa_golpe_pesado`), bases (`polvo_correr` trae sus 3 tamaños) o grupos (`reaccion`). Ver [KIT_A_MEDIDA.md](KIT_A_MEDIDA.md#efectos-y-audio).

## Qué sale

```
fx/<id>.png      los cuadros en fila (en varias filas si no caben en 4096 px: ver `columnas`)
```

```jsonc
"fx": {
  "chispa_golpe_pesado": { "archivo": "fx/chispa_golpe_pesado.png", "w": 32, "h": 32, "celda": 32, "cuadros": 6, "columnas": 6,
                           "fps": 18, "loop": false, "ancla": [16, 16], "se_pega_a": "mano", "capa": "frente", "grupo": "golpe",
                           "uso": "En el `punto` del evento `impacto`..." }
}
```

| Campo | Qué es |
|---|---|
| `w`, `h` | Tamaño de cada cuadro. `celda` cuando es cuadrado |
| `columnas` | Cuántos cuadros hay por fila de la hoja. El cuadro `k` está en `x = (k % columnas) * w`, `y = floor(k / columnas) * h` |
| `ancla` | El pixel del cuadro que va sobre el punto del personaje que dice `se_pega_a` |
| `se_pega_a` | `pies` (el pivote), `cabeza`, `mano` (el `punto` del evento o `manos`), `centro`, `agua` (la superficie, el dato `agua`), `objeto`, `pantalla` (encima de todo, en la cámara), `mosaico` (se repite: TileSprite) o `libre` |
| `capa` | `frente` va después del personaje, `detras` antes |
| `estados` | En `bola_tama`, cada cuadro es un estado de daño: el juego elige el cuadro, no se anima solo |

Los efectos miran a la derecha, como las filas del kit. Para la izquierda se usa `flipX` y se espeja el ancla: `x = w - 1 - ancla[0]`.

Los de pantalla completa (`pantalla_rota`, `lineas_velocidad`, `marco_corte`) toman la `resolucion` del kit. Sin resolución, salen a 640 x 360.

## Qué efecto va con qué evento

| Evento o momento | Efecto | Dónde |
|---|---|---|
| `paso` al correr | `polvo_correr_<tamaño>` | `pies` del cuadro, espejado si mira a la izquierda |
| Frenar en seco | `polvo_frenar_<tamaño>` | `pies` |
| `aterriza`, caer de espaldas (`land_flat`, `ko_bounce`) | `polvo_caer_<tamaño>` | `pies` |
| `impacto` | `chispa_golpe_liviano`, `medio` o `pesado` según el golpe | El `punto` del evento en esa fila |
| `dizzy` | `estrellas_mareo` | `cabeza` |
| Pelea de caricatura | `nube_ko` | Entre los dos, en el piso |
| `impacto` de `dive` | `chapuzon_grande` | `agua` |
| Nadar | `estela` detrás, `ondas` al flotar | `agua` |
| `fan_gust` | `rafaga_abanico` | `manos`, mano cercana |
| Cargar una técnica | `aura_nekketsu`, detrás del personaje | `pies` |
| Salir del agua | `huella_mojada` en cada `paso` por 2 s | `pies` |

El tamaño del polvo depende de la celda del personaje: `chico` para 32, `medio` para 48 y `grande` para 64 (Goro).

## En Phaser

```js
// cargar: una hoja por efecto
for (const [id, e] of Object.entries(m.fx))
  this.load.spritesheet(`fx_${id}`, KIT + e.archivo, { frameWidth: e.w, frameHeight: e.h });

// crear la animación (los de estados no se animan)
for (const [id, e] of Object.entries(m.fx)) if (e.fps)
  this.anims.create({ key: `fx_${id}`, frames: this.anims.generateFrameNumbers(`fx_${id}`, { start: 0, end: e.cuadros - 1 }), frameRate: e.fps, repeat: e.loop ? -1 : 0 });

// poner un efecto con su ancla sobre un punto (x, y) del mundo
function efecto(scene, id, x, y, flip = false) {
  const e = m.fx[id];
  const ax = flip ? e.w - 1 - e.ancla[0] : e.ancla[0];
  const s = scene.add.sprite(x, y, `fx_${id}`).setOrigin((ax + 0.5) / e.w, (e.ancla[1] + 0.5) / e.h).setFlipX(flip);
  if (!e.loop) s.once('animationcomplete', () => s.destroy());
  return s.play(`fx_${id}`);
}

// la chispa en el punto del impacto
const ev = anim.eventos.find((v) => v.tipo === 'impacto');
const [px, py] = ev.punto[filaIdx];
efecto(scene, 'chispa_golpe_medio', sprite.x + (sprite.flipX ? -px : px), sprite.y + py);

// mosaico: lluvia y confeti sobre toda la pantalla
// un TileSprite no se anima solo: se cambia el cuadro a mano al ritmo del fps
const lluvia = scene.add.tileSprite(0, 0, 640, 360, 'fx_lluvia', 0).setOrigin(0).setScrollFactor(0);
scene.time.addEvent({ delay: 1000 / m.fx.lluvia.fps, loop: true, callback: () => lluvia.setFrame((+lluvia.frame.name + 1) % m.fx.lluvia.cuadros) });

// la bola del Tama-wari: el cuadro es el estado
bola.setFrame(m.fx.bola_tama.estados.indexOf('agrietada'));
```

## El catálogo

### Polvo

| Id | Tamaño | Cuadros | fps | Bucle | Se pega a | Capa | Para qué |
|---|---|---|---|---|---|---|---|
| `polvo_correr_chico` | 16 x 16 | 6 | 14 | no | pies | frente | En cada evento `paso` al correr. Dibujado para quien mira a la derecha: la nube queda atrás. Espejar con flipX. |
| `polvo_correr_medio` | 24 x 24 | 6 | 14 | no | pies | frente | En cada evento `paso` al correr. Dibujado para quien mira a la derecha: la nube queda atrás. Espejar con flipX. |
| `polvo_correr_grande` | 32 x 32 | 6 | 14 | no | pies | frente | En cada evento `paso` al correr. Dibujado para quien mira a la derecha: la nube queda atrás. Espejar con flipX. |
| `polvo_frenar_chico` | 24 x 12 | 7 | 14 | no | pies | frente | Al frenar en seco o derrapar: el polvo y las piedritas salen hacia adelante. |
| `polvo_frenar_medio` | 36 x 18 | 7 | 14 | no | pies | frente | Al frenar en seco o derrapar: el polvo y las piedritas salen hacia adelante. |
| `polvo_frenar_grande` | 48 x 24 | 7 | 14 | no | pies | frente | Al frenar en seco o derrapar: el polvo y las piedritas salen hacia adelante. |
| `polvo_caer_chico` | 32 x 12 | 7 | 14 | no | pies | frente | En el evento `aterriza` y al caer de espaldas: polvo a los dos lados. |
| `polvo_caer_medio` | 48 x 18 | 7 | 14 | no | pies | frente | En el evento `aterriza` y al caer de espaldas: polvo a los dos lados. |
| `polvo_caer_grande` | 64 x 24 | 7 | 14 | no | pies | frente | En el evento `aterriza` y al caer de espaldas: polvo a los dos lados. |

### Golpe

| Id | Tamaño | Cuadros | fps | Bucle | Se pega a | Capa | Para qué |
|---|---|---|---|---|---|---|---|
| `chispa_golpe_liviano` | 16 x 16 | 4 | 18 | no | mano | frente | En el `punto` del evento `impacto`: jab y patada baja liviana, directo y patada media, golpe con arma o lanzado pesada. |
| `chispa_golpe_medio` | 24 x 24 | 5 | 18 | no | mano | frente | En el `punto` del evento `impacto`: jab y patada baja liviana, directo y patada media, golpe con arma o lanzado pesada. |
| `chispa_golpe_pesado` | 32 x 32 | 6 | 18 | no | mano | frente | En el `punto` del evento `impacto`: jab y patada baja liviana, directo y patada media, golpe con arma o lanzado pesada. |
| `estrellas_mareo` | 32 x 16 | 8 | 10 | sí | cabeza | frente | Mareado (`dizzy`): estrellas y pajaritos girando sobre la cabeza. Las de atrás salen más oscuras. |
| `nube_ko` | 64 x 48 | 6 | 12 | sí | pies | frente | La pelea de caricatura: tapa a los que pelean. Asoman un puño, un zapato y estrellas. |

### Reacciones de anime

| Id | Tamaño | Cuadros | fps | Bucle | Se pega a | Capa | Para qué |
|---|---|---|---|---|---|---|---|
| `vena_enojo` | 16 x 16 | 4 | 8 | sí | cabeza | frente | Enojo: late arriba a la derecha de la cabeza. |
| `gota_nervios` | 16 x 16 | 6 | 8 | sí | cabeza | frente | Nervios: la gotota que baja por la sien. |
| `sonrojo` | 20 x 6 | 4 | 6 | sí | cabeza | frente | Sonrojo en los cachetes. Va debajo del centro de la cabeza, en las filas de frente. |
| `exclamacion` | 16 x 16 | 6 | 14 | no | cabeza | frente | ¡Sorpresa! Salta y se queda en el último cuadro. |
| `interrogacion` | 16 x 16 | 6 | 14 | no | cabeza | frente | ¿Duda? Salta y se queda en el último cuadro. |
| `lagrima_comica` | 24 x 16 | 4 | 10 | sí | cabeza | frente | Llanto de caricatura: dos chorros desde los ojos. En las filas de frente. |
| `sudor` | 16 x 16 | 6 | 10 | sí | cabeza | frente | Cansancio o esfuerzo: gotitas que salen volando. |

### Agua

| Id | Tamaño | Cuadros | fps | Bucle | Se pega a | Capa | Para qué |
|---|---|---|---|---|---|---|---|
| `chapuzon_chico` | 32 x 32 | 7 | 14 | no | agua | frente | Algo chico cae al agua, o una brazada fuerte. |
| `chapuzon_grande` | 64 x 64 | 9 | 14 | no | agua | frente | El clavado (evento `impacto` de `dive`) o alguien que cae al agua. |
| `estela` | 32 x 16 | 4 | 12 | sí | agua | detras | Detrás del que nada, en la superficie. Mira a la derecha: espejar con flipX. |
| `ondas` | 48 x 24 | 8 | 10 | sí | agua | detras | Anillos en el agua alrededor de quien flota (`tread_water`). |

### Fiesta

| Id | Tamaño | Cuadros | fps | Bucle | Se pega a | Capa | Para qué |
|---|---|---|---|---|---|---|---|
| `confeti` | 64 x 64 | 8 | 10 | sí | mosaico | frente | Lluvia de confeti en mosaico: repetir sobre toda la pantalla (TileSprite). |
| `serpentina` | 32 x 48 | 8 | 14 | no | libre | frente | Una serpentina que se desenrolla hacia arriba a la derecha. |
| `fuegos_artificiales_rojo` | 64 x 64 | 12 | 12 | no | libre | detras | El cohete sube y revienta. El ancla es de donde sale. |
| `fuegos_artificiales_azul` | 64 x 64 | 12 | 12 | no | libre | detras | El cohete sube y revienta. El ancla es de donde sale. |
| `fuegos_artificiales_dorado` | 64 x 64 | 12 | 12 | no | libre | detras | El cohete sube y revienta. El ancla es de donde sale. |
| `fuegos_artificiales_verde` | 64 x 64 | 12 | 12 | no | libre | detras | El cohete sube y revienta. El ancla es de donde sale. |

### Objetos

| Id | Tamaño | Cuadros | fps | Bucle | Se pega a | Capa | Para qué |
|---|---|---|---|---|---|---|---|
| `bola_tama` | 32 x 32 | 4 | estados | no | objeto | frente | La bola del Tama-wari colgando. Cada cuadro es un estado de daño: el juego elige el cuadro. |
| `bola_tama_explota` | 64 x 64 | 10 | 14 | no | objeto | frente | La bola se abre en dos y cae el confeti. Misma ancla que la bola (el hilo). |
| `bola_tama_cartel` | 32 x 52 | 8 | 10 | no | objeto | frente | El cartel que se desenrolla de la bola abierta, sin texto: el juego escribe encima (16 px de ancho útil). |
| `mecha_tejo` | 48 x 48 | 10 | 14 | no | objeto | frente | El tejo pega en la mecha: estallido y humo. |
| `estela_chapa` | 32 x 8 | 4 | 14 | sí | objeto | detras | Detrás de la chapa en vuelo. Mira a la derecha: girar con el ángulo del vuelo. |
| `ventana_rota` | 48 x 48 | 8 | 14 | no | objeto | frente | Vidrios que saltan donde pegó algo. |

### Pelea de cómic (lote P1)

| Id | Tamaño | Cuadros | fps | Bucle | Se pega a | Capa | Para qué |
|---|---|---|---|---|---|---|---|
| `onomatopeya_pow` | 64 x 40 | 6 | 14 | no | mano | frente | ¡POW! con estallido de cómic: entra con rebote. En el `punto` del `impacto` de un golpe fuerte. |
| `onomatopeya_paf` | 64 x 40 | 6 | 14 | no | mano | frente | ¡PAF! para los golpes medianos y las cachetadas. |
| `onomatopeya_crack` | 80 x 40 | 6 | 14 | no | mano | frente | CRACK! para el codazo, el pisotón y lo que rompe. |
| `onomatopeya_nam` | 64 x 40 | 6 | 14 | no | cabeza | frente | ¡ÑAM! sobre la cabeza del que come (`eat`). |
| `ko_grande` | la resolución | 12 | 12 | no | pantalla | frente | El K.O. de pantalla completa: destello blanco, rayos, las letras que se estrellan una por una y astillas. Para el final con cámara lenta. |
| `bloqueo` | 24 x 32 | 5 | 18 | no | mano | frente | El destello azul de la guardia, delante de los brazos. |
| `agarre` | 24 x 24 | 4 | 10 | sí | mano | frente | Líneas de esfuerzo mientras se forcejea en el agarre. |

### Pantalla completa

| Id | Tamaño | Cuadros | fps | Bucle | Se pega a | Capa | Para qué |
|---|---|---|---|---|---|---|---|
| `pantalla_rota` | la resolución | 4 | 14 | no | pantalla | frente | El golpe que rompe la pantalla. Se queda en el último cuadro. |
| `lineas_velocidad` | la resolución | 4 | 12 | sí | pantalla | frente | Líneas de velocidad de manga para técnicas y sprints. |
| `marco_corte` | la resolución | 6 | 18 | no | pantalla | frente | El corte de anime: dos barras entran y dejan una franja inclinada para el primer plano. |

### Clima

| Id | Tamaño | Cuadros | fps | Bucle | Se pega a | Capa | Para qué |
|---|---|---|---|---|---|---|---|
| `lluvia` | 64 x 64 | 8 | 16 | sí | mosaico | frente | Lluvia en mosaico, sin costuras: TileSprite sobre la pantalla. |
| `salpicadura_piso` | 16 x 8 | 5 | 14 | no | libre | frente | Gota que pega en el piso. Ponerlas al azar con lluvia. |
| `onda_charco` | 24 x 12 | 8 | 10 | sí | libre | detras | Ondas en un charco, en el piso. |
| `relampago` | 48 x 160 | 6 | 20 | no | libre | detras | El rayo de fondo; parpadea dos veces. El juego aclara la pantalla en los cuadros 1 y 3. |
| `calor` | 64 x 64 | 8 | 8 | sí | mosaico | frente | Reverbero del calor en mosaico, con poca opacidad (0.3) sobre el piso. |

### Técnicas

| Id | Tamaño | Cuadros | fps | Bucle | Se pega a | Capa | Para qué |
|---|---|---|---|---|---|---|---|
| `rayo_catatumbo` | 128 x 32 | 4 | 16 | sí | mano | frente | Técnica: el rayo sale de la mano hacia la derecha. Espejar con flipX. |
| `rayo_cielo` | 48 x 256 | 8 | 16 | no | objeto | frente | Técnica: el rayo baja del cielo al punto del ancla (la punta de la jabalina, el aro). Pega en el cuadro 2. Para que siga cargando, repetir del 3 al 6. No se gira. |
| `onda_furro` | 48 x 48 | 8 | 12 | sí | objeto | frente | Técnica: ondas de sonido desde el furro. |
| `rafaga_abanico` | 64 x 32 | 6 | 14 | no | mano | frente | Con `fan_gust`: el viento sale del abanico hacia la derecha. |
| `vapor_termo` | 16 x 32 | 8 | 8 | sí | objeto | frente | Vapor que sube del termo de tinto. |
| `aura_nekketsu` | 64 x 64 | 8 | 12 | sí | pies | detras | El aura de fuego cuando se carga una técnica. Va detrás del personaje. |

### Ambiente

| Id | Tamaño | Cuadros | fps | Bucle | Se pega a | Capa | Para qué |
|---|---|---|---|---|---|---|---|
| `humo_moto` | 24 x 16 | 6 | 10 | no | objeto | detras | Humo del escape: el ancla es el tubo. Mira a la derecha. |
| `petalo_buganvilla` | 6 x 6 | 4 | 6 | sí | libre | frente | Pétalo que da vueltas: el juego lo hace caer con vaivén. |
| `hoja` | 6 x 6 | 4 | 6 | sí | libre | frente | Hoja que da vueltas, igual que el pétalo. |
| `arena` | 32 x 16 | 8 | 12 | sí | mosaico | frente | Arena que sopla a la derecha, en mosaico horizontal a ras del piso. |
| `brillo_record` | 16 x 16 | 6 | 12 | sí | libre | frente | Destello dorado para récords, medallas y trofeos. |
| `huella_mojada` | 8 x 8 | 6 | 3 | no | pies | detras | Huella mojada en el evento `paso` al salir del agua; se seca sola en 2 s. |

## Límites honestos

- **Sin mezcla:** todos los pixeles son opacos o transparentes, como el resto del kit. Para el reverbero (`calor`) o la lluvia suave, el juego baja la opacidad del sprite (0.3 a 0.6).
- **Mirando a la derecha:** los que tienen dirección (polvo, estela, rayo, ráfaga, humo) se espejan con `flipX`. La `estela_chapa` se gira con el ángulo del vuelo.
- **Tamaños fijos:** las reacciones están pensadas para la cabeza de un personaje de 48. En 32 se ven grandes y en 64 se ven chicas. El juego puede escalarlas x2 en 64.
- **El cartel del Tama-wari no trae texto:** el juego escribe encima con `fuente_ui`. Tiene 16 px de ancho útil.
