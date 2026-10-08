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

## 4b. RPG isométrico de 8 direcciones (tipo Diablo)

En Exportar toca **Isométrica 8 direcciones** (o en la terminal `--views iso`). Cada animación sale ocho veces con estos nombres:

| dirección | sufijo |
|---|---|
| abajo | `_down` |
| abajo a la izquierda | `_down_left` |
| izquierda | `_left` |
| arriba a la izquierda | `_up_left` |
| arriba | `_up` |
| arriba a la derecha | `_up_right` |
| derecha | `_right` |
| abajo a la derecha | `_down_right` |

En Phaser, elige la animación según el ángulo del movimiento:

```js
const DIRS = ['right', 'down_right', 'down', 'down_left', 'left', 'up_left', 'up', 'up_right'];
function dirFrom(vx, vy) {
  const a = Math.atan2(vy, vx);                       // y crece hacia abajo
  return DIRS[(Math.round(a / (Math.PI / 4)) + 8) % 8];
}
player.anims.play(`walk_${dirFrom(vx, vy)}`, true);
```

Las diagonales son de verdad: piernas y brazos se proyectan en 3/4 y la cara se gira hacia donde mira.
Con piezas LPC la cabeza en diagonal es la de frente con los rasgos corridos (LPC no trae diagonales dibujadas).
Con el kit Volumen la cabeza se gira en 3/4 real.

## 4c. Taller RPG (héroes, enemigos, poderes y objetos)

Desde la portada, sección **Taller RPG**:

- **Héroe con clase:** arma tu personaje y vístelo con una clase de un toque (bárbaro, paladín, hechicera, amazona,
  nigromante, druida, asesina). En Estilo, el grupo **Equipo RPG** cambia armadura (cuero, malla, placas, túnica),
  capa, hombreras, cinturón, ribetes, arma (13) y mano libre (escudos, orbe, libro). El arma se ve en todas las
  animaciones de RPG, habilidades, caminar y correr.
- **Habilidades:** paquete *Habilidades* en Animar: hechizo, nova, canalizar, torbellino (gira por las 8 direcciones),
  salto de ataque, carga, esquivar, arco, invocar, grito de guerra, golpe pesado y estocada. Todas en el sitio: el juego
  mueve al personaje.
- **Enemigos:** 13 listos (esqueleto, esqueleto mago, zombi, orco, goblin arquero, vampiro, hombre lobo, minotauro,
  hombre lagarto, demonio, hombre rata, calabaza, trol), con animaciones de enemigo (caminar de zombi, zarpazo,
  embestida, levantarse del piso). El minotauro es jefe y va en celdas de 64 px.
- **Poderes:** 8 elementos por 10 tipos de efecto (proyectil en 8 direcciones, impacto, nova, aura, golpe del cielo,
  curación, escudo, círculo, mejora, tajo). Se exportan como hoja PNG + JSON con `anims`, igual que los personajes.
  En Phaser se cargan con `load.atlas` y se reproducen como cualquier animación, encima o debajo del personaje.
- **Objetos:** 45 íconos (pociones, anillos, amuletos, gemas, runas, pergaminos, llaves, oro, equipo) con rareza
  normal, mágica, rara, de set o única. Atlas PNG + JSON Hash con el nombre de cada ícono (`potion_health_large`,
  `gem_ruby_perfect`, `w_axe_unique`).

Para un RPG tipo Diablo: héroes y enemigos en **Isométrica 8 direcciones**, poderes con los proyectiles en 8 direcciones
y los íconos de objetos en 32 px para el inventario (64 px si tu interfaz es grande).

## 5. Créditos

Si usas piezas dibujadas (LPC), cada exportación incluye `CREDITOS.txt`. Las licencias piden mostrar esos
créditos donde el jugador los pueda ver. Detalle completo en [`ARTE-LPC.md`](../ARTE-LPC.md).
