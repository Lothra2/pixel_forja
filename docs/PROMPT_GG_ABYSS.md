# GG Abyss: cómo arrancar el juego

GG Abyss es un juego tipo Diablo de la familia GG. Cada jefe vencido abre un portal que baja un piso más hacia el abismo.

Este archivo tiene cuatro cosas:

1. Los pasos para crear el repo del juego.
2. El prompt para que **Opus** arme el plan.
3. El prompt para que **Sonnet** ejecute una fase.
4. El `CLAUDE.md` del repo del juego.

## 1. Pasos

```bash
# en GitHub crea el repo gg-abyss como PRIVADO (es de la familia y las piezas LPC piden compartir igual)
git clone https://github.com/Lothra2/gg-abyss && cd gg-abyss

# PixelForja, el taller, entra como submódulo. OJO: el kit vive en esta rama, main todavía no lo tiene
git submodule add -b claude/perfeccionar-ejecucion-smh3ad https://github.com/Lothra2/pixel_forja tools/pixel_forja
cd tools/pixel_forja && npm ci && npx tsx scripts/game-kit.ts ../../public/assets/kit && cd ../..
mkdir fichas   # personajes editados en el estudio de PixelForja (*.ficha.json)
git add -A && git commit -m "PixelForja como taller y primer kit" && git push
```

Cuando la rama de PixelForja se mezcle a main:

```bash
git config -f .gitmodules submodule.tools/pixel_forja.branch main
git submodule sync
```

Después:

1. Copia la sección 4 como `CLAUDE.md` en la raíz de `gg-abyss`.
2. Sesión nueva de Claude Code en esa carpeta, con **Opus** en modo plan. Pega la sección 2.
3. Debate el `PLAN.md` con Opus hasta que te guste.
4. Sesión nueva con **Sonnet** por cada fase. Pega la sección 3 con el número de fase.
5. Lo que el juego pida y no exista queda en `ASSETS_PENDIENTES.md`. Me lo traes al chat de PixelForja, lo hago en el taller, y allá corres:
   ```bash
   git submodule update --remote tools/pixel_forja
   npm run kit
   ```

---

## 2. Prompt para Opus (el plan)

````text
Eres el director técnico, director de arte y diseñador de niveles de "GG Abyss", un juego tipo Diablo para mis hijas. En esta sesión SOLO planificas: no escribes código del juego. Entregas un PLAN.md que Sonnet va a ejecutar fase por fase sin poder preguntarte nada. Escríbelo para que no tenga que adivinar.

## Contexto

- Soy Rick. Mis hijas: Sophie (8 años, lee bien) y Alana (5, casi no lee). Mi esposa Steph. Nuestro perro Thor, un bóxer.
- Cada una juega SOLA, con su propia partida. Nada de cooperativo por ahora.
- Juegan en tablet (táctil, horizontal) y en compu (mouse y teclado).
- Repo: este (gg-abyss). Phaser 3, TypeScript, Vite. Deploy en Netlify. Repo privado.
- Nada de IA dentro del juego. Nada sale del dispositivo.

## El taller: PixelForja (regla dura)

TODO el arte y el audio del juego sale de PixelForja, mi taller de pixel art. Está como submódulo en tools/pixel_forja y ya generó el kit en public/assets/kit con su manifest.json.

- Prohibido: dibujar sprites en código, bajar assets de internet, usar placeholders de otro lado, generar arte con IA, editar a mano archivos de public/assets/kit.
- Permitido en código: texturas técnicas que no son arte (degradado radial para luces, ruido para sombras de nubes, un pixel blanco para partículas) y efectos (tint, alpha, blend, shaders, tweens, partículas) aplicados a sprites del kit.
- Si algo falta, se anota en ASSETS_PENDIENTES.md con especificación exacta: nombre, tamaño en px, animaciones y cuadros, punto de apoyo, si es sólido y para qué es. Yo lo fabrico en el taller y regenero el kit con npm run kit. Mientras tanto se usa el asset más parecido del kit, nunca uno inventado.
- El juego carga TODO desde manifest.json con un cargador genérico. Si mañana el kit trae un personaje, un objeto o un mundo nuevo, aparece sin tocar código.
- Personajes editados en el estudio de PixelForja: la ficha se exporta a fichas/<id>.ficha.json y npm run kit los mete en el kit. Una ficha con id nuevo entra como heroína nueva y debe aparecer sola en la selección de jugador.

Lee antes de planificar:
- tools/pixel_forja/docs/KIT_JUEGO.md: formato del kit, carga en Phaser, convenciones.
- public/assets/kit/manifest.json: lo que hay de verdad. No supongas nada que no esté ahí.
- public/assets/kit/mundo/mundo1_vista.png: el mapa actual del Mundo 1.
- public/assets/kit/ui/inventario.png y public/assets/kit/botin/catalogo.json.

## Visión

Un Diablo amable con vista desde arriba tipo Stardew Valley (no isométrica). Cuadros de 32 px, personajes de 48 px en 8 direcciones. Se siente Diablo por:
- orbes de vida y maná, cinturón de pociones, números de daño
- botín que cae con haz de luz según rareza, cofres y monedas
- inventario con muñeco de equipo y bolsa
- jefes con ataques avisados en el piso
- un portal que se abre al vencer al jefe y baja un piso más hacia el abismo

Pero NADIE PIERDE:
- Si la vida llega a 0, Thor la rescata. Fundido, "¡Thor te salvó!", reaparece en la última fogata con vida llena y sin perder nada.
- El jefe NO se cura, así hasta Alana lo termina venciendo.
- Nada depende de leer: para Alana todo va con íconos, colores y sonido.

## El mundo tiene que ser INCREÍBLE (la prioridad de arte del proyecto)

El primer contacto de mis hijas con el juego es caminar por el Bosque GG. Tiene que sentirse vivo, mágico, grande y explorable, al nivel de Stardew Valley o Eastward.

El taller YA hizo el Bosque GG grande. Míralo antes de planificar:
- public/assets/kit/mundo/mundo1_vista.png: el mapa entero, con puntos de colores para enemigos, cofres y fogatas.
- public/assets/kit/mundo/postales/*.png: 8 pantallas reales de 960 x 540 (llegada, abuelo_roble, cascada_y_vado, puente_del_trol, ruinas_y_estatua, anillo_de_hadas, arena_del_minotauro, colina_goblin).
- La sección "Mundo 1: el Bosque GG" de KIT_JUEGO.md: capas, orden de dibujo, zonas, luces y partículas.

Lo que ya trae:
- 120 x 90 cuadros (unas 22 pantallas), con el suelo pintado a mano por código. Hay mesetas con acantilado y escaleras, un río con cascada, vado y 3 puentes, lagos, ruinas y bosques cerrados con sendas.
- 13 zonas con nombre. Cada una trae música, sonido de ambiente, color de luz, oscuridad y partículas.
- Lugares memorables: el Abuelo Roble (un árbol gigante con cara), el Anillo de las Hadas, la estatua de Thor en las ruinas, la cascada, el Puente del Trol, el campamento goblin y la arena del minotauro con la cueva.
- 6 cofres secretos, 3 fogatas de guardado y un camino escondido al Claro Escondido.
- Objetos que emiten luz (fogata, antorchas, faroles, hongos, cristales, portal, cascada), 13 tipos de partículas, textura de luz y de nube, y 6 ambientes en bucle.

Tu trabajo como director de arte:
1. Crítica honesta del mundo actual mirando las postales. Qué se ve increíble, qué se ve pobre o repetido, y qué falta para que cada zona tenga su momento "wow".
2. Plan de atmósfera en código usando lo del kit. Que se sienta vivo, no un fondo quieto:
   - Luz cálida de tarde con el tinte de cada zona, viñeta suave y oscuridad en el Bosque Profundo.
   - Pozos de luz aditivos en cada objeto con `luz`, que parpadean o laten.
   - Partículas por zona con límite de cantidad: luciérnagas, hojas, mariposas, polen, brasas en la arena, humo en el campamento.
   - Pasto alto que se aparta al pasar. Copas que se mecen con un tween suave y se vuelven semitransparentes cuando la heroína pasa detrás.
   - Sombras de nubes cruzando el mapa. Agua animada.
   - Polvito y sonido de pasos. Sombra elíptica bajo cada personaje.
   - Ambiente sonoro por zona con fundido al cambiar.
   - Banner "¡Descubriste: Arroyo Cristalino!" la primera vez que entra a cada zona, y un contador de zonas descubiertas y secretos encontrados.
   - Cámara con seguimiento suave y anticipación. La primera vez, paneo de presentación desde el portal hasta la heroína.
3. Lo que falte para que sea increíble va a ASSETS_PENDIENTES.md, con especificación exacta y prioridad: imprescindible para F1 o mejora posterior. Si quieres cambiar el layout, da las zonas con coordenadas en cuadros y yo regenero el mapa en el taller.
4. Criterio de calidad verificable:
   - Playwright captura las mismas 8 postales en el juego (docs/capturas/), ya con luces, partículas y personajes.
   - Tienen que verse igual o mejor que las del kit. Yo las reviso.
   - 60 fps en un viewport de tablet con todos los efectos prendidos, con un medidor de fps en modo prueba.

## Selección de jugador (va en la Fase 1)

- Pantalla de título "GG Abyss": la entrada al abismo de fondo con su luz, música y "Toca para empezar". Ese toque también desbloquea el audio en tablets.
- Luego la selección de jugador: tarjetas grandes con cada heroína animada en idle, girando o caminando en el lugar, con su nombre y un ícono de su clase. Sale de los personajes tipo "heroe" del manifest: Sophie, Alana, Papá (Rick), Mamá (Steph) y cualquiera que venga del estudio.
- Tocar una tarjeta la elige: pequeña celebración, Thor corre a su lado, sonido.
  - Si ya tiene partida, "Continuar" con su nivel y oro.
  - Si no, crea la partida nueva.
- Cambiar de jugador desde el menú de pausa.
- Retratos y nombres sin depender de leer: la tarjeta de Alana se reconoce por su cara.

## Personajes y clases

| Jugador | Clase | Arma | Ataque básico | Habilidad 1 | Habilidad 2 |
|---|---|---|---|---|---|
| Sophie | amazona | arco | shoot_bow, flecha | lluvia de flechas (3 en abanico) | esquiva (dodge) |
| Alana | druida | varita | cast, proyectil de naturaleza | llamar a Thor (howl: escudo y mordida fuerte) | curar |
| Papá (Rick) | paladín | espada y escudo | attack | torbellino (whirlwind) | bloqueo (block_shield) |
| Mamá (Steph) | hechicera | báculo | cast, bola de fuego | nova de fuego | channel |

Usa solo animaciones que existan en el manifest.

Modo peque, por perfil y prendido por defecto en Alana:
- enemigos con 50% de daño y 20% más lentos
- avisos del jefe 50% más largos
- apuntado automático
- botones más grandes

## Thor, el ayudante

- Sigue a un costado sin estorbar.
- Muerde al enemigo más cercano cada cierto tiempo.
- Recoge las monedas cercanas.
- Con la vida bajo 30%: aullido con escudo_de_thor, 5 s de escudo y 20 s de recarga.
- A veces ladra y "desentierra" un objeto.
- El casillero "mascota" acepta las armaduras de Thor (cat pet, niveles 1 a 5) y cambia su sprite a thor_armaduraN.

## Controles

- Tocar o hacer clic en el piso: camina por el camino más corto (A* sobre la capa colision, 8 direcciones) y marca el destino con marca_destino.
- Mantener presionado: camina hacia el dedo.
- Tocar un enemigo: se acerca y ataca solo hasta que muera o reciba otra orden.
- Tocar cofre, objeto, rompible, cartel o portal: camina y lo usa.
- Pantalla:
  - 2 botones grandes de habilidad abajo a la derecha
  - cinturón de 4 pociones al centro
  - orbe de vida a la izquierda y de maná a la derecha
- PC: WASD o flechas, 1 a 4 pociones, Q y W habilidades, I inventario, Esc pausa.
- Con la tablet en vertical, aviso de girarla.

## Mundo 1 y el jefe

- Entidades del mapa: jugador_inicio, thor_inicio, portal_llegada, enemigo, cofre, rompible, cartel, jefe y portal_jefe.
- Enemigos:
  - ratas cerca del inicio
  - calabazas en el medio
  - goblins arqueros antes del jefe
- IA simple: pasear, perseguir, atacar y volver.
- Las fogatas son guardado y reaparición.

Minotauro del Bosque:
- Al entrar a la arena:
  - las piedras se encienden
  - suena musica_jefe
  - sale el estandarte con su nombre y la barra del jefe
- Fase 1 (100% a 60%): golpe fuerte y carga en línea.
- Fase 2 (60% a 0%):
  - pisotón con círculo de aviso
  - salto a la posición de la heroína con aviso que se llena
  - grito que llama 2 ratas
- Todo ataque grande se avisa 1.2 s antes (1.8 s en modo peque).
- Al vencerlo:
  - musica_victoria y lluvia de oro
  - se abre portal_jefe
  - aparece el cofre legendario con el arma personal de cada una: arco_de_sophie, varita_de_alana, juramento_de_rick, baculo_de_steph
- Al entrar al portal: pantalla "Continuará... más abajo en el abismo", con resumen. Se guarda la partida.

## Botín, inventario y guardado

Botín:
- catalogo.json trae 393 objetos con rareza, nivel, stats y atlas. Úsalo tal cual.
- Tablas de botín por enemigo y por nivel de cofre, con RNG con semilla.
- Al caer, el objeto rebota y sale un haz de luz del color de su rareza.

Inventario:
- ui/inventario.png más el layout del manifest: muñeco con 11 casilleros y bolsa de 7 x 4, un objeto por casilla.
- Tocar equipa. Las pociones van al cinturón.
- Mantener presionado muestra el tooltip, con flecha verde o roja comparando.
- Stats visibles: daño, armadura y vida.
- Nivel máximo 10 en el Mundo 1.

Guardado:
- localStorage, clave ggabyss:v1:perfil:<id>, con versión y migración.
- Autoguardado en fogata, cofre, subida de nivel, portal y cada 30 s.
- Borrar un perfil pide mantener presionado 3 s.

## Técnica (decidido, si lo cambias di por qué)

- Resolución y render:
  - resolución base 960 x 540
  - pixelArt, roundPixels, Scale.FIT y autoCenter
  - profundidad por y usando pivote y apoyo
- El agua se anima cambiando índices de tiles cada 260 ms.
- Código:
  - src/logic/: lógica pura sin Phaser, con tests de Vitest (combate, botín, inventario, stats, guardado, pathfinding, IA, jefe)
  - src/kit/: tipos y cargador del manifest
  - src/scenes/ y src/game/: Phaser
  - src/fx/: atmósfera (luces, partículas, nubes, viento), con un interruptor de calidad alta o baja
- Escenas: Boot, Titulo, SeleccionJugador, Mundo, HUD (en paralelo), Inventario (encima), Pausa, Continuara y Creditos.
- Créditos visibles con CREDITOS.txt del kit. Es obligatorio por la licencia LPC.
- Modo prueba:
  - ?test=1 expone window.__ABYSS__ (estado, posición, teleport, semilla, fps)
  - ?seed=N fija el azar
- Playwright con 2 vistas: escritorio 1280x720 y tablet 1180x820 táctil. Pruebas de humo por fase más las postales.
- PWA para pantalla completa en la tablet.

## Lo que quiero de ti

1. Revisa el kit y dime qué falta o está mal para este juego. Sé crítico, no me compres todo.
2. Hazme máximo 5 preguntas, solo si cambian el plan. Si no, decide y deja la decisión escrita.
3. Escribe PLAN.md con:
   - Estructura de carpetas y módulos.
   - Dirección de arte del mundo: paleta de luz, atmósfera por zona y las postales.
   - Fases cortas, cada una jugable al terminar:
     - F0, base: Vite, TS, Phaser, Vitest, Playwright, Netlify, cargador del manifest, comprobación de que el kit está y avisa claro si falta.
     - F1, elegir jugador y explorar un mundo increíble: título, selección de jugador, el Bosque GG entero con todas sus capas, atmósfera completa (luces, partículas, nubes, tinte por zona, ambientes), banners de descubrimiento, cofres secretos que se abren (sin botín todavía, solo la animación y una moneda), tocar para moverse con A*, 8 direcciones, cámara, Thor que sigue, guardado en fogatas. Sin combate: los enemigos todavía no están. Es la demo que les enseño a mis hijas.
     - F2, combate: enemigos, ataques y habilidades por clase, números de daño, orbes, XP, rescate de Thor.
     - F3, botín: drops, oro, cofres, rompibles, inventario, equipo, cinturón, guardado completo.
     - F4, el minotauro: arena, fases, avisos, victoria, portal, cofre legendario y Continuará.
     - F5, pulido y deploy: ajustes, modo peque, créditos, PWA, rendimiento en tablet, Netlify.
   - Por fase:
     - objetivo
     - tareas concretas (archivos a crear o tocar)
     - criterios de aceptación verificables
     - tests
     - postales a capturar
     - la demo que hago con mis hijas
   - Balance inicial en una tabla, en un solo archivo de config.
   - Riesgos y mitigación: rendimiento de efectos en tablet, audio en iOS, tamaño del kit, tacto contra clic.
   - ASSETS_PENDIENTES.md priorizado, con lo imprescindible para F1 arriba.
   - Un bloque "Prompt para Sonnet, fase N" listo para copiar por cada fase.
4. No escribas código del juego. Solo PLAN.md y ASSETS_PENDIENTES.md.
````

---

## 3. Prompt para Sonnet (una fase)

````text
Vas a ejecutar la FASE N de PLAN.md en este repo (gg-abyss). Lee primero CLAUDE.md, PLAN.md completo y tools/pixel_forja/docs/KIT_JUEGO.md.

Reglas:
- Solo la fase N. Lo que veas de otras fases va a PLAN.md bajo "Notas para después".
- Antes de codear, explica en 5 a 10 líneas cómo la vas a hacer. Si el plan no cuadra con el código o el kit real, dilo y propone el ajuste mínimo.
- Todo el arte y el audio sale del kit de PixelForja (public/assets/kit, vía manifest.json). No dibujes sprites en código, no bajes assets, no edites public/assets/kit ni tools/pixel_forja. Solo se permiten texturas técnicas: degradados para luces, ruido y un pixel para partículas. Si falta algo, anótalo en ASSETS_PENDIENTES.md con especificación exacta y usa el asset más parecido del kit.
- La lógica va en src/logic/ con tests de Vitest. Phaser en src/scenes/ y src/game/. Atmósfera en src/fx/.
- El mundo tiene que verse increíble: respeta la dirección de arte de PLAN.md y captura las postales de la fase en docs/capturas/.
- Commit por cada tarea que funcione, con mensaje claro en español. Al final: npm run typecheck, npm test, npm run build y npm run e2e en verde, y push.
- Cierra con un resumen corto:
  - qué se hizo
  - cómo probarlo con las niñas (qué tocar y qué debería pasar)
  - las postales
  - qué quedó pendiente
  - qué no pudiste verificar
- Nunca digas que algo funciona si no lo corriste.
````

---

## 4. CLAUDE.md del repo del juego

````markdown
# GG Abyss

Juego tipo Diablo de la familia GG (Sophie 8, Alana 5). Cada jefe abre un portal que baja un piso más hacia el abismo. Phaser 3 + TypeScript + Vite. Tablet y compu. Cada niña juega su propia partida.

## El taller: PixelForja
- Todo el arte y el audio sale de PixelForja (tools/pixel_forja, submódulo). El juego lo carga desde public/assets/kit/manifest.json.
- Nunca dibujar sprites en código, bajar assets ni editar public/assets/kit a mano. Solo se permiten texturas técnicas: degradados de luz, ruido y un pixel para partículas.
- Lo que falte va a ASSETS_PENDIENTES.md con especificación exacta (nombre, tamaño, animaciones, apoyo, sólido, para qué).
- Regenerar: `git submodule update --remote tools/pixel_forja && npm run kit`.
- Personajes editados en el estudio: exportar la ficha a fichas/<id>.ficha.json y correr `npm run kit`.

## Reglas del juego
- Nadie pierde: al caer, Thor rescata a la heroína en la última fogata y no se pierde nada. El jefe no se cura.
- Sin IA y sin red. La partida vive en localStorage (ggabyss:v1:perfil:<id>).
- Para Alana todo con ícono y sonido. Textos en español.
- El mundo tiene que verse increíble: dirección de arte en PLAN.md, postales en docs/capturas/.
- Créditos LPC visibles en el juego. Repo privado. Ninguna foto de la familia entra al repo.

## Código
- src/logic/: reglas puras sin Phaser, todo con tests.
- src/kit/: tipos y cargador del manifest. Lo que esté en el manifest se carga solo.
- src/scenes/, src/game/: Phaser. src/fx/: atmósfera con interruptor de calidad.
- Balance en un solo archivo de config.

## Comandos
- npm run dev | build | typecheck | test | e2e | kit
- ?test=1 expone window.__ABYSS__ para Playwright. ?seed=N fija el azar.

## Cómo trabajar
- Una fase de PLAN.md a la vez. Commit por tarea, push al final con todo en verde.
- Nunca decir que algo está probado si no se corrió.
- Escribir en español venezolano casual: sin em dash, sin punto y coma, pocos paréntesis. Directo.
````
