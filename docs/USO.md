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
- **Botín y legendarios:** ver la sección 4d.

Para un RPG tipo Diablo: héroes y enemigos en **Isométrica 8 direcciones**, poderes con los proyectiles en 8 direcciones
y los íconos de objetos en 32 px para el inventario (64 px si tu interfaz es grande).

## 4d. Botín: legendarios, armaduras que evolucionan, cofres, oro y Thor

Desde la portada, **Taller RPG > Botín y legendarios**. Todo se dibuja nativo a 32 o 64 px (no se escala).

- **Armas:** 27 tipos de Diablo 2, 3 y 4 y algo más (espada, cimitarra, katana, estoque, daga, kris, hacha, hacha
  arrojadiza, maza, lucero del alba, mangual, martillo de guerra, cetro, garrote, varita, garra, jabalina, mandoble,
  hacha doble, gran martillo, báculo, lanza, alabarda, guadaña, arco corto, arco largo, ballesta) y 9 de mano libre
  (4 escudos, broquel, orbe, tomo, cabeza reducida, carcaj). Cada una en 3 calidades: normal, excepcional y élite.
- **Mágicos y raros:** se tiran al azar con prefijo y sufijo (azul, 1 o 2 propiedades) o con nombre propio y 3 a 5
  propiedades (amarillo, con otro color de metal y gema). Misma semilla, mismo objeto.
- **Legendarios:** 40 con nombre propio, estadísticas y frase (naranja, animados 8 cuadros con barrido de brillo y
  destellos). Los nombres son originales: no se usan los de Blizzard.
- **Set Legado GG (verde):** Juramento de Rick, Escudo de la Casa GG, Báculo Estelar de Steph, Arco Celeste de Sophie,
  Varita en Flor de Alana y Collar de Thor, con bonos a 2, 3, 4 y 6 piezas.
- **Armaduras que evolucionan:** cuero, malla, placas y túnica en 5 niveles cada una, como en Diablo 3 y 4: al subir
  cambia el material, aparecen ribete, hombreras, capa, gema y al final runas que brillan. 7 piezas por nivel
  (casco, pecho, hombreras, guantes, cinturón, pantalón, botas). En Estilo, **Nivel de la armadura** se la pone a tu
  héroe con el casco del nivel (se puede quitar).
- **Equipar:** en el detalle de un objeto, *Equipar en mi héroe* pone la legendaria en la mano con sus colores o viste
  la pieza de armadura. La barda va en Thor.
- **Joyas y consumibles:** anillos, amuletos, talismanes, joyas, pociones en 6 tipos por 5 tamaños, pergaminos, llaves,
  oro, mineral, esencia, trofeo, mapa, 7 gemas en 5 grados y 12 runas.
- **Cofres y oro:** cofre de madera, reforzado, dorado y legendario (quieto con brillo y abriendo en 10 cuadros),
  moneda que gira, 4 montones de oro con brillo, lluvia de monedas, haz de luz por rareza y el objeto que cae girando.
- **Thor:** en Familia GG, sin y con armadura. Se ve en las 8 direcciones y trae el paquete *Mascota RPG*: morder,
  ladrar, aullar (le da el escudo a su dueño: efecto `escudo_de_thor`), recoger botín con la moneda en la boca, golpe y
  caer. Su barda tiene 5 niveles (arnés, peto tachonado, cota del guardián, placas del campeón, égida de Thor).

### Exportar el botín

*Exportar todo el botín* baja un zip con:

- `botin_iconos_32.png/json` y `botin_iconos_64.png/json`: atlas JSON Hash de Phaser. Cada ícono se llama por su id
  (`sword_3`, `armor_placas_chest_5`, `gem_ruby_perfect`, `hoja_del_vacio`). Los especiales traen 8 cuadros y su
  animación en `anims` (`hoja_del_vacio_0` ... `_7`).
- `botin_mundo.png/json`: `cofre_<nivel>_abrir`, `cofre_<nivel>_quieto`, `moneda_gira`, `oro_small` ... `oro_huge`,
  `lluvia_de_oro`, `haz_<rareza>`, `escudo_de_thor` y `cae_<id>` de cada especial. Cada animación dice su tamaño.
- `botin_catalogo.json`: por objeto, nombre en español e inglés, rareza, nivel, base, estadísticas (`damage`, `speed`,
  `defense`, `block`, `mods`) con su texto listo para el tooltip, frase, set y bonos del set.

```js
// en preload()
this.load.atlas('botin', 'botin_iconos_32.png', 'botin_iconos_32.json');
this.load.json('botinMeta', 'botin_iconos_32.json'); // el mismo json, para leer `anims`
this.load.json('catalogo', 'botin_catalogo.json');
// en create(): animaciones de los especiales
const j = this.cache.json.get('botinMeta');
for (const [name, a] of Object.entries(j.anims)) this.anims.create({ key: name, frames: j.animations[name].map((f) => ({ key: 'botin', frame: f })), frameRate: a.fps, repeat: a.loop ? -1 : 0 });
this.add.sprite(100, 100, 'botin').play('hoja_del_vacio');
```

## 5. Créditos

Si usas piezas dibujadas (LPC), cada exportación incluye `CREDITOS.txt`. Las licencias piden mostrar esos
créditos donde el jugador los pueda ver. Detalle completo en [`ARTE-LPC.md`](../ARTE-LPC.md).
