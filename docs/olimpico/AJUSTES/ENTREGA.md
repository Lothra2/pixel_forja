# Lote ajustes: lo que no calzó del mapa, la intro y el VS
Estado: entregado, pendiente de Rick
PR: https://github.com/Lothra2/pixel_forja/pull/54
Fecha: 2026-10-15

## Qué se hizo

Antes de esto, #50 a #53 quedaron unidos en main, en orden. Cada uno llevó un merge de main con las uniones de las listas y los conteos. Main quedó en `abdff78` y con los cuatro juntos pasa 566 de 566.

**Los tres puntos que no calzaron, más el pelo de Rick:**

| Punto | Qué cambié |
|---|---|
| 1. La rosa de los vientos de `mapa_gira` quedaba tapada por la barra del pasaporte | Subió de y 297 a **y 235**, y el borde de abajo queda en 258. Sigue en el Pacífico, en (513, 235) del 800, lejos de la ruta. Sale en el manifiesto como `rosa: [x, y, radio]` |
| 2. `intro_maracaibo` no traía huecos | Ahora trae sus `huecos`: los 4 de la presentación, los mismos de Bogotá, con su fila de `nombres` |
| 3. Los retratos flotaban sobre la buseta y la baranda | Pieza nueva, **`intro_presentacion`**: una franja oscura con borde de oro y un marco dorado por hueco, que sirve para las dos ciudades.<br>• **El fondo del hueco es claro,** con rayos de manga, así la silueta oscura se lee y el retrato de color queda enmarcado.<br>• **Bajo cada hueco va una placa para el nombre.**<br>• **La posición:** los huecos subieron a y 132, y la franja va de y 116 a 268 |
| Rick con `parted2` | En `family.ts` Rick pasó de `swept_back` a `parted2`, igual que tu ficha. La imagen dorada de `brawl_rick_48` se regeneró por eso. La ficha de ejemplo `rick.ficha.json` la dejé en `swept_back`: lee por qué en las decisiones |

**Lo que no cambió:**
- **Los retratos:** el redibujado a 96 queda como estaba y no le metí más trabajo. Los tableros de esta carpeta usan los retratos de bloques que arma el juego: el chico de 40 recortado a 32 x 32 desde (4, 1) y agrandado x3. Los huecos de 96 les calzan exacto.
- **Bogotá y Maracaibo:** las escenas son las mismas. Solo cambian los `huecos` y sale la capa nueva.

## Cómo se usa (estudio y kit)

**En el kit:** nada nuevo en `kit.config.json`. `intro_presentacion` sale con la parte `intro`.

**Lo que tiene que conectar el juego:**
- **La toma de la ruta:** nada que cambiar. La rosa ya no choca con la barra.
- **Bogotá y Maracaibo:**
  - el orden de capas es: la escena, `ui_intro_presentacion`, los retratos en `huecos` (a 1, sin escalar) y, solo en Bogotá, `ui_intro_bogota_lluvia` encima;
  - los huecos son los mismos en las dos escenas;
  - el nombre va centrado en x = hueco + 48 y y = `nombres`, menos 80 en x como todo;
  - en la silueta, `setTintFill(0x14101e)`, que sobre el fondo claro se lee de una;
  - la placa del nombre mide 104: a 2 caben 8 letras. Para DON HERNANDO o ABUELA NERVA, ponlo a 1,5 como en las tarjetas, o usa el nombre corto.
- **Rick:** la Familia GG del motor ya sale con `parted2`. Tu ficha del juego manda en Nekketsu, así que ahí no cambia nada.

**El conteo:** es un PNG más en `ui.interfaz`, `intro_presentacion`. El artifact sigue en 500.

## Pruebas

- **Caso nuevo en `intro.test.ts`, el de la presentación:**
  - los huecos son los mismos en Bogotá y en Maracaibo;
  - cada marco cabe en la franja y en la parte de 640;
  - el fondo del hueco es claro y el borde del marco oscuro;
  - la placa del nombre es oscura;
  - fuera de la franja todo es transparente;
  - la franja tapa lo que hay entre los retratos.
- **En `gira.test.ts`:** la rosa termina en y 270 o antes, queda en la parte de 640 y lejos de cada punto de la ruta.
- **En `rpg.test.ts`:** Rick lleva `parted2`. La imagen dorada `brawl_rick_48.png` se regeneró por el pelo.
- **En el e2e de la Familia GG:** el creador abre a Rick con `parted2` marcado.
- **`custom.test.ts`:** el conteo de PNG sube 1.
- **La suite sin `custom.test.ts`:** 56 archivos, 552 de 552.
- **`custom.test.ts`: 15 de 15,** con el kit generado en 248 s, por debajo del límite de 300. Son 567 en total.
- **`tsc` limpio, `npm run build:sitio` limpio y e2e de Playwright 50 de 50.**

## Para aprobar (todo en esta carpeta)

- **`bogota_presentacion.png`:** los Rolos en silueta arriba y revelados abajo, con la lluvia encima.
- **`maracaibo_presentacion.png`:** los Maracuchos en silueta y revelados con la cara de burla.
- **`mapa_rosa.png`:** el mapa con la ruta y la barra del pasaporte desde y 311, como la arma la intro. Va a x2.
- **`rick_parted2.png`:** tu ficha de Rick con `parted2`, en retrato de bloques feliz y neutral, y el Rick de `family.ts` en sprite. Va a x2.

Qué mirar:
- que la presentación se sienta como presentación de rivales;
- que la rosa ya no choque con la barra.

## Decisiones que tomé sin preguntar

1. **Quité el arreglo de la boca de enojo a 96.** Lo tenía hecho, con la boca abierta, pero con tu aviso de que Rick prefiere los retratos de bloques ya no tiene sentido meterle trabajo al redibujo. El kit queda como estaba.
2. **La ficha de ejemplo de Rick sigue en `swept_back`.** La cambié a `parted2` y falló la prueba de siluetas de los equipos.
   - Esa prueba pide que dos compañeros no se parezcan más de 0,85 de silueta.
   - Con `parted2`, Rick y Steph de lado dan 0,86. Los dos quedan con el pelo pegado a la cabeza y el mismo largo.
   - No quise aflojar la regla. **Tu ficha del juego tiene ese parecido hoy.** Si te importa que se distingan de lado, a uno de los dos le toca otro peinado o un accesorio. Si no, dime y cambio la de ejemplo y subo la regla a 0,87.
3. **Una sola capa de presentación para las dos ciudades,** con los huecos iguales. Es un PNG en vez de dos y el juego arma igual las dos tomas.
4. **El fondo del hueco claro y no oscuro:** una silueta oscura sobre fondo oscuro no se ve.
5. **La rosa subió en el mismo Pacífico** y no se fue a la esquina de arriba a la derecha, que es tierra de Norteamérica. Subirla 62 px basta para salir de la barra, y no toca la ruta.
6. **En `family.ts` solo cambié el pelo.** Tu ficha de Rick en el juego trae además un `wardrobe` con la variante atleta. No lo copié porque no lo pediste.

## Límites honestos

- **La placa del nombre es de 104:** a 2 caben 8 letras. DON HERNANDO se sale, como se ve en el tablero. Ponlo a 1,5 o usa el nombre corto.
- **La franja de la presentación tapa la mitad de arriba de la escena,** porque la presentación manda en esa toma. Si la quieres más chica, hay que achicar los retratos, y a 96 no se pueden achicar sin emborronar.
- **El modo de bloques no está en el kit.** El kit sigue entregando el redibujo a 96 como `grande_*`. Si algún día lo dejo, será una opción con bloques por defecto, como dijiste. Hoy no lo toqué.

## Lo que necesita el siguiente lote

- **El juego:**
  - regenerar el kit después de unir este PR;
  - poner `ui_intro_presentacion` en Bogotá y Maracaibo;
  - apuntar el submódulo al commit nuevo.
- **Lo que queda del mensaje:** nada. C3 sigue en pausa.
