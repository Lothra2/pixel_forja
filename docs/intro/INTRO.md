# El intro cinematográfico (parte 4)

Lámina para aprobar: `intro_paneles_x2.png`, con los seis momentos en orden y a x2.

Reemplaza lo prestado del intro de hoy (fogatas, la postal de la arena, personajes a 48) por piezas pintadas para él.
Todo va en `manifest.intro` y en `intro/` dentro del kit.

## Reglas que siguen todas las piezas

- Paneles de 480 x 270 (el corte del abismo, 480 x 540) para agrandar x2 o x3 entero.
- La paleta es oscura y el fuego naranja y rojo es la única luz fuerte.
- La luz sale de abajo, del fuego. En la familia el fuego está detrás de ellas, así que ahí la luz es contraluz.
- Cada panel viene en capas (fondo, medio, frente) con su `paralaje` para que el juego las mueva y se sienta
  profundidad. Cada capa es una tira de cuadros.
- Nada de sangre ni caras de terror: los ojos son de dragón de cuento, cálidos.

## Las piezas

| Recurso | Capas y cuadros | Momento |
|---|---|---|
| `intro_bosque_noche` | fondo 1, medio 1, frente 4 a 6 fps | El Bosque de noche, tranquilo. Una grieta en el piso deja salir una luz roja tenue que pega en la parte de abajo de los árboles. Las copas del frente se mecen |
| `intro_corte_abismo` | fondo 1 y frente 1 (480 x 540) | El abismo en corte, como un hormiguero. Bosque, catedral, minas de cristal, mar oscuro, ciudad de piedra, fraguas y el corazón con fuego, unidos por un pozo. Cada caverna con su luz. El frente son raíces y roca de los bordes, para el paralaje. Las brasas las suma el juego |
| `intro_ojos` | 8 cuadros a 8 fps | Cerrados, se abren de a poco, miran, miran al costado, parpadean y vuelven a mirar. Brasas delante |
| `intro_guardianes` | fondo 1 y frente 4 a 6 fps | El Minotauro y el Guardián de la Campana en silueta, dibujados con el motor de los jefes y a contraluz del fuego. Las raíces rojas suben del piso y se aprietan en cada cuadro |
| `intro_familia` | fondo 1, medio 1 y frente 6 a 8 fps | Sophie y Alana de espaldas, con Thor adelante, frente al portal de fuego. Las sombras largas bajan hacia la cámara |
| `logo_fuego` | 16 cuadros a 12 fps, grilla de 4 x 4 | El logo de siempre al doble. Una lengua de fuego lo recorre de izquierda a derecha y saltan chispas |
| `fuego_pared` | 8 cuadros a 12 fps, 128 x 96 | Pared de llamas sin piedras. Pega de lado a lado y el cuadro 8 vuelve al 1 |
| `humo_grande` | 6 cuadros a 6 fps, 128 x 128 | Humo que cruza delante de todo y se desvanece |
| `musica_intro` | 27 s, sin bucle | Grave, con un coro sin palabras. Golpes en 9 s (los ojos), 13 s (los guardianes) y 23 s (el título), con medio segundo de silencio justo antes del título |
| `latido` | 1.2 s | Dos golpes sordos para el momento de los ojos |

## Lo que no es exacto y por qué

- **Thor gira el cuerpo, no solo la cabeza.** El motor de personajes no gira la cabeza por separado de espaldas. En
  los dos últimos cuadros Thor pasa a la vista de tres cuartos de atrás, así que se ve que mira hacia el costado y
  la cámara.
- **Las heroínas son las de siempre al doble**, de espaldas y a contraluz, no un dibujo nuevo a tamaño de pantalla.
  Se leen bien y son ellas, pero no tienen el detalle de una ilustración pintada a mano.
- **La música es sintetizada** como el resto del audio del kit. El coro es un colchón de voces y no lleva palabras,
  como pide el encargo.
