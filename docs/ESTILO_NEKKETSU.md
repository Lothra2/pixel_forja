# Estilo Nekketsu (NES)

El dibujo de Kunio-kun y Nintendo World Cup (Technos, NES): cabeza grande y casi cuadrada, ojos de rayita negra con cejas gruesas, torso corto y
ancho, manos grandes, piernas cortas, colores planos con una sombra y un contorno oscuro alrededor de toda la figura. Cuadros de 32 x 32 con los
pies en y = 30, cinco filas (`right`, `down_right`, `up_right`, `down`, `up`) y las de la izquierda por espejo, igual que las hojas de Phaser de la forja.

Todo es código (`src/engine/nes/`), sin IA y sin piezas LPC: los mismos pixeles en el navegador y en Node.

## Cómo se describe a alguien
En este estilo un personaje es un peinado, una piel y su uniforme (`NesLook`):

```json
{ "piel": "#e0a070", "pelo": "#241814", "peinado": "raya", "marcas": ["barba"], "camisa": "#d8202a", "short": "#ffffff", "medias": "#d8202a", "zapatos": "#181010", "talla": "grande" }
```

- `peinado`: corto, raya, largo, liso, colitas, despeinado, puntas, tazon, rapado, moño.
- `marcas`: barba, bigote, cintillo, ligas, lentes y las de las mascotas (cuernos, aleta, plumas, antifaz con orejas). `acento` es su color.
- `guantes` para el portero, `talla: "grande"` para un adulto ancho, `malandro` para la cara de malo.
- También sale de una ficha de la forja: `{ "ficha": "rick.ficha.json" }` toma la piel, el pelo y la ropa (`nesLookFromFicha`).

## Animaciones
Fútbol: idle, run, run_ball, shot, pass, chip, header, volley, chilena, slide, celebrate, dance, sad (manos en la cabeza), jump, throw_in y, para el
portero, keeper_ready, keeper_dive, keeper_catch, keeper_throw, keeper_punt. Pelea: punch, kick_hit, tackle, stagger, tumble, lie (K.O., ojos en X),
fall_getup y dizzy. El perro (Thor): idle, walk, run, jump, sit, celebrate, fetch, hurt, wag, pickup y lie.

## Generar
```bash
npx tsx scripts/nekketsu.ts docs/ejemplos/nekketsu_nes/familia_gg.json salida/nes --tablero salida/nes/tablero.png
```
Sale `<id>.png` + `<id>.json` por personaje (los de `porteros` con las animaciones de portero, los de `perros` como perro) y el tablero de muestra.
Pruebas: `src/engine/__tests__/nekketsu.test.ts` (filas completas, pies en el piso, altura de 24 a 30 px, contorno, como mucho 16 colores, determinista).
