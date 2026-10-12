# Lote G1 fuentes: acentos del vietnamita
Estado: entregado
PR: (pendiente)
Fecha: 2026-10-12

## Qué se hizo

Las tres fuentes bitmap del motor ya escriben vietnamita: `fuente_ui` (8 px) y las de título, `fuente_titulo` y `fuente_titulo_plata` (16 px). Es capacidad general: sirve para cualquier juego y cualquier texto que use esas letras.

- **Las 146 letras del vietnamita:**
  - ă, â, ê, ô, ơ, ư.
  - đ y Đ.
  - Los 5 tonos (huyền, sắc, hỏi, ngã, nặng) sobre todas las vocales (a, ă, â, e, ê, i, o, ô, ơ, u, ư, y), en mayúscula y minúscula.
- **Cómo se arman:** Silkscreen no trae casi ninguna. El motor arma cada letra que falta pegando marcas dibujadas sobre la letra base (`composeGlyph` en `src/engine/ui/fonts.ts`), con el mismo trazo que los acentos que la fuente ya traía. Las pocas que la fuente sí trae (à, â, ã, ê, ô, õ, ì, ý) salen de la fuente.
- **Las reglas de las marcas:**
  - Van en las 2 filas de arriba de la letra, con una fila de aire.
  - Con circunflejo, el tono va a su derecha (ấ, ầ, ẩ), como se escribe en vietnamita.
  - La tilde sobre el circunflejo (ẫ) y los tonos sobre la breve (ắ, ặ...) van encima.
  - El nặng es un punto debajo. ơ y ư llevan un ganchito en el hombro derecho. đ y Đ llevan una barra que cruza el palo.
- **En el kit:** `--fuentes` (opción `fuentes`) pone las tres en `ui/fuentes/*.png + .fnt` (BMFont XML para Phaser), con la entrada `ui.fuentes` del manifiesto y el crédito de Silkscreen en `CREDITOS.txt`. El kit de GG Abyss ya las traía y ahora salen con vietnamita.
- **En el estudio:** Inicio, **Fuentes del juego**. Se escribe un texto, se ve en las tres fuentes a 1x, 2x o 3x, y se descargan las fuentes. En español e inglés.

## Cómo se usa (estudio y kit)

```bash
npm run deportes -- salida/kit --fuentes
```

En Phaser:

```js
this.load.bitmapFont('fuente_ui', kit + 'ui/fuentes/fuente_ui.png', kit + 'ui/fuentes/fuente_ui.fnt');
this.add.bitmapText(x, y, 'fuente_ui', 'Rồng Sài Gòn').setScale(2);
```

Detalles en [docs/KIT_DEPORTES.md](../../KIT_DEPORTES.md#fuentes---fuentes-opción-fuentes).

## Pruebas

`npm test` y `npm run e2e`: ver el PR. Las nuevas están en `src/engine/__tests__/fonts.test.ts` y en la prueba e2e "fuentes del juego".

| Qué se revisa | Resultado |
|---|---|
| Las tres fuentes traen las 146 letras | Sí |
| Las frases del pedido ("Rồng Sài Gòn", "Đá cầu", "Bà Hoa", "Tuấn", "Trời ơi") salen sin letras de más, a 8 px | Sí. Se ven en el tablero a tamaño real |
| Los 6 tonos de cada vocal se distinguen entre sí a 8 px | Las 12 vocales, cada una con sus 6 formas distintas |
| Ninguna letra pisa a la siguiente | El dibujo, con la sombra, termina antes del avance en las tres fuentes |
| `fuente_ui` sigue nítida | Solo pixeles enteros (alfa 0 o 255) |
| Kit con `--fuentes` | `ui/fuentes/` con las tres, `ui.fuentes` en el manifiesto y Silkscreen en los créditos. Sin la opción, el kit no cambia |
| Imagen dorada | `golden/fuentes_vietnamita.png`: las frases en las tres fuentes |
| Estudio (e2e) | Abre Fuentes del juego, cambia el texto y descarga `fuentes.zip`, en escritorio y teléfono |

Entregable en esta carpeta: `tablero_fuentes.png`. Trae las frases de la prueba en `fuente_ui` a 8 px reales, x2 y x3, y en las dos de título a 16 px reales y x2. También la tabla de las 12 vocales con sus 6 formas, en minúscula y mayúscula, y đ Đ.

## Decisiones que tomé sin preguntar

- **Componer en vez de cambiar de fuente.** El pedido lo permite. Otra fuente pixel con vietnamita cambiaría el estilo de todo lo que ya existe (GG Abyss, la arena). Así, las letras nuevas tienen el mismo trazo que los acentos de Silkscreen.
- **El tono a la derecha del circunflejo** (ấ, ầ, ẩ). Es como se escribe en vietnamita y cabe en las 2 filas de marcas. La letra avanza 2 pixeles de fuente más.
- **La tilde sobre el circunflejo (ẫ, ễ, ỗ) y los tonos sobre la breve (ắ, ằ, ẳ, ẵ, ặ) van apilados** y suben 2 pixeles de fuente por encima de la línea. No hay otra forma de que se lean.
- **Mayúscula y minúscula iguales:** Silkscreen no tiene minúsculas (todas son versalitas). Por eso ă y Ă se ven iguales.
- **La página "Fuentes del juego" en el estudio**, junto a las herramientas del taller. El pedido dice que todo lo nuevo se tiene que ver ahí.

## Límites honestos

- **Marcas que suben de la línea:** en un texto de varias líneas con el alto de línea de siempre (11 en `fuente_ui`), una ắ o una ẫ pueden tocar el punto del nặng de la línea de arriba si caen justo una encima de la otra. Pasa poco. Si molesta, el juego puede usar un alto de línea de 13 para el vietnamita.
- **El hỏi a 8 px** es un ganchito de 3 pixeles. Se distingue de los otros tonos, pero no es el signo de pregunta chiquito de la tipografía impresa.
- **ấ, ầ, ẩ son más anchas:** con el tono de lado, "Tuấn" o "cầu" tienen un poco más de aire después de esa letra.
- **ị** se ve como un signo de exclamación al revés, porque la i de Silkscreen es un palo. Es lo normal en fuentes pixel de 5 filas.

## Lo que necesita el siguiente lote

- **I inicial** (kit a medida): que la configuración pida las fuentes (`--fuentes`).
- **G1 resto** (caja de diálogo, logo, paneles, banners): ya puede escribir con estas fuentes, incluido el vietnamita.
- **C2** (equipos nacionales): Rick pidió que las caras del Instituto Nekketsu (Kenji, Ryu y Goro) tengan una expresión base más malandra, con cejas fruncidas y media sonrisa, sin tocar lo demás. Hace falta una expresión base en la ficha, que hoy no existe.
