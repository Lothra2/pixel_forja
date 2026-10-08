# Usar los personajes en tus juegos

PixelForja exporta hojas de sprites listas para el motor. Aquí está cómo sacarlas y cómo cargarlas
en Phaser (web) y en React Native con Expo. Unity y Godot tienen su propio exportador.

## 1. Exportar

**Desde el estudio:** paso Exportar, formato "Hoja PNG + JSON". Elige paquetes de animaciones, vistas y tamaño.
- Para un juego de lado (como Fútbol Familia GG) basta la vista de lado.
- Para un RPG visto desde arriba marca las cuatro: de lado, de lado a la izquierda, de frente y de espalda.
  Las animaciones salen como `walk_right`, `walk_left`, `walk_down`, `walk_up`.
- Para React Native usa escala 4x.

**Por línea de comandos** (para exportar a toda la familia de una vez):

```bash
npm run forja -- render rick.ficha.json --out sprites/rick --sizes 48 --anims basic,football \
  --views side,left,front,back --export sheet --scale 1
```

Cada exportación trae:
- `nombre_48.png`: la hoja, 8 cuadros por fila, una animación por fila.
- `nombre_48.json`: atlas "JSON Hash" con `frames`, `animations` (lista de cuadros por animación) y `anims`
  (`start`, `frames`, `fps`, `loop` de cada una), más `cell` (tamaño del cuadro) y `pivot` (la planta del pie).
- `CREDITOS.txt` si el personaje usa piezas dibujadas de LPC. Ponlo en la pantalla de créditos del juego.

## 2. Phaser 3

Ejemplo completo y probado en [`ejemplos/phaser/index.html`](ejemplos/phaser/index.html): camina con las flechas
en cuatro direcciones y patea con espacio. Lo esencial:

```js
// preload
this.load.atlas('jugador', 'jugador_48.png', 'jugador_48.json');
this.load.json('jugador_meta', 'jugador_48.json');

// create
const meta = this.cache.json.get('jugador_meta');
for (const [name, a] of Object.entries(meta.anims)) {
  this.anims.create({
    key: name,
    frames: meta.animations[name].map((frame) => ({ key: 'jugador', frame })),
    frameRate: a.fps,
    repeat: a.loop ? -1 : 0,
  });
}
const [cw, ch] = meta.cell, [px, py] = meta.pivot;
const hero = this.add.sprite(240, 160, 'jugador').setOrigin(px / cw, py / ch);
hero.play('walk_down');
```

En la configuración del juego usa `pixelArt: true` para que no se suavicen los pixeles. Para probar el ejemplo:
`npx serve docs/ejemplos/phaser` (o cualquier servidor estático) y abre la página.

## 3. React Native con Expo

Componente sin dependencias en [`ejemplos/expo/PixelSprite.tsx`](ejemplos/expo/PixelSprite.tsx):

```tsx
import sheet from './assets/jugador_48_x4.json';
import { PixelSprite } from './PixelSprite';

<PixelSprite sheet={sheet} image={require('./assets/jugador_48_x4.png')} anim="walk_down" />
```

Exporta con escala 4x: el teléfono muestra la hoja a su tamaño, sin escalar, y los pixeles quedan nítidos.
Este componente no está probado en un teléfono todavía: está escrito para la API estándar de React Native.

## 4. Unity, Godot y Aseprite

- **Unity:** formato Unity. Trae la hoja y su `.meta` con filtro Point, sin compresión y un recorte por cuadro.
- **Godot 4:** formato Godot. Trae un `SpriteFrames` (`.tres`) con cada animación.
- **Aseprite:** el `.aseprite` con una etiqueta por animación, más el JSON que Phaser lee con `load.aseprite`.

## 5. Créditos

Si usas piezas dibujadas (LPC), cada exportación incluye `CREDITOS.txt`. Las licencias piden mostrar esos
créditos donde el jugador los pueda ver. Detalle completo en [`ARTE-LPC.md`](../ARTE-LPC.md).
