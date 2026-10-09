# Legado GG: cómo arrancar el juego

Este archivo tiene cuatro cosas:

1. Los pasos para crear el repo del juego.
2. El prompt para que **Opus** arme el plan.
3. El prompt para que **Sonnet** ejecute el plan una fase a la vez.
4. El `CLAUDE.md` para el repo del juego.

## 1. Pasos

```bash
# en GitHub: crea el repo legado-gg como privado (es de la familia y las piezas LPC tienen licencia que comparte igual)
git clone https://github.com/Lothra2/legado-gg && cd legado-gg
git submodule add https://github.com/Lothra2/pixel_forja tools/pixel_forja
cd tools/pixel_forja && npm ci && npx tsx scripts/game-kit.ts ../../public/assets/kit && cd ../..
mkdir fichas   # aquí van los personajes que edites en el estudio (*.ficha.json)
```

Después de eso:

1. Copia el bloque de la sección 4 como `CLAUDE.md` en la raíz del repo.
2. Abre una sesión nueva de Claude Code en esa carpeta con **Opus**, en modo plan, y pega el prompt de la sección 2.
3. Revisa el `PLAN.md` que salga. Debatelo con Opus hasta que te guste.
4. Abre otra sesión con **Sonnet** y pega el prompt de la sección 3, una fase a la vez.

Siendo realista con "jugable hoy": la Fase 1 (caminar por el bosque con Thor tocando la pantalla) sí sale en una tarde. El juego completo con combate, botín, inventario y el minotauro son unas 5 fases. Cada una se puede enseñar a las niñas apenas termina.

---

## 2. Prompt para Opus (el plan)

````text
Eres el director técnico y diseñador de "Legado GG", un juego tipo Diablo para mis hijas. Tu trabajo en esta sesión es SOLO planificar: no escribas código del juego. Al final entregas un PLAN.md que otro modelo (Sonnet) va a ejecutar fase por fase sin poder preguntarte nada. Escríbelo para que no tenga que adivinar.

## Contexto

- Soy Rick. Mis hijas: Sophie (8 años, lee bien) y Alana (5 años, casi no lee). Mi esposa Steph. Nuestro perro Thor, un bóxer.
- Cada una juega SOLA, en su propia partida guardada. No hay cooperativo por ahora.
- Juegan en tablet (táctil, horizontal) y en compu (mouse y teclado).
- Repo: este (legado-gg). Phaser 3 + TypeScript + Vite. Despliegue en Netlify.
- TODOS los assets vienen de PixelForja, mi app de pixel art, que está como submódulo en tools/pixel_forja. Ya generó el kit en public/assets/kit con su manifest.json. Lee primero:
  - tools/pixel_forja/docs/KIT_JUEGO.md (formato del kit, cómo cargarlo en Phaser, convenciones)
  - public/assets/kit/manifest.json (qué hay de verdad)
  - public/assets/kit/mundo/mundo1_vista.png (cómo se ve el mapa)
  - public/assets/kit/ui/inventario.png y botin/catalogo.json
- Nada de IA en el juego. Nada sale del dispositivo. Ni fotos, ni datos.

## Visión

Un Diablo amable. Vista desde arriba tipo Stardew Valley (no isométrica), cuadros de 32 px, personajes de 48 px en 8 direcciones. Se siente Diablo por:
- orbes de vida y maná, cinturón de pociones, números de daño
- botín que cae con haz de luz según rareza, cofres y monedas
- inventario con muñeco de equipo y bolsa
- un jefe con ataques que se avisan en el piso
- un portal que se abre al vencerlo y lleva al siguiente mundo, hacia abajo

Pero NADIE PIERDE:
- Si la vida llega a 0, Thor la rescata: fundido, mensaje "¡Thor te salvó!", reaparece en la última fogata con vida llena y sin perder nada. El jefe NO se cura, así hasta Alana lo termina venciendo.
- Sin textos obligatorios para Alana: todo con íconos, colores y sonido.

## Personajes jugables (perfiles)

Pantalla de inicio con los retratos del kit. Cada perfil tiene su partida.

| Perfil | Clase | Arma | Ataque básico (anim) | Habilidad 1 | Habilidad 2 |
|---|---|---|---|---|---|
| Sophie | amazona | arco | shoot_bow, flecha | lluvia de flechas (3 flechas en abanico) | esquiva (dodge) |
| Alana | druida | varita | cast, proyectil veneno/naturaleza | llamar a Thor (Thor hace howl: escudo + mordida fuerte) | curar (fx curar) |
| Papá (Rick) | paladín | espada y escudo | attack | torbellino (whirlwind) | bloqueo (block_shield) |
| Mamá (Steph) | hechicera | báculo | cast, bola de fuego | nova de fuego (nova) | channel |

Papá y Mamá existen para que nosotros probemos y juguemos con ellas. Las anims ya están en el kit (21 por personaje). Usa solo las que existan en el manifest.

Modo peque (por perfil, activado por defecto en Alana): enemigos hacen 50% de daño y se mueven 20% más lento, avisos del jefe 50% más largos, apuntado automático al enemigo más cercano, botones más grandes.

## Thor, el ayudante

- Sigue a la heroína a un costado, nunca estorba el camino.
- Muerde al enemigo más cercano cada cierto tiempo (bite).
- Recoge solo las monedas cercanas (pickup) y suena moneda.
- Si la vida baja de 30%: aullido (howl) con fx escudo_de_thor, escudo por 5 s, recarga 20 s.
- De vez en cuando ladra (bark) y "desentierra" un objeto. Es el momento favorito garantizado de las niñas.
- Su armadura sube de nivel: el casillero "mascota" del inventario acepta los objetos de categoría pet (niveles 1 a 5) y cambia el sprite a thor_armaduraN.

## Controles

- Tocar/clic en el piso: camina hasta ahí por el camino más corto (A* sobre la capa colision, 8 direcciones), con marca_destino.
- Mantener presionado: camina hacia el dedo o el mouse.
- Tocar un enemigo: se acerca a su rango y ataca solo hasta que muera o reciba otra orden.
- Tocar cofre, objeto, rompible, cartel o portal: camina y lo usa.
- Botones grandes abajo a la derecha para las 2 habilidades. Cinturón de 4 pociones al centro. Orbe de vida a la izquierda, maná a la derecha, como Diablo.
- PC además: WASD o flechas para moverse, 1 a 4 pociones, Q y W habilidades, I inventario, Esc menú.
- En tablet vertical: aviso "gira la tablet" con ícono.

## Mundo 1: Bosque GG

El mapa ya existe (mundo/mundo1_bosque.json, Tiled). Capas suelo, colision, objetos, entidades. Las entidades dicen dónde va todo: jugador_inicio, thor_inicio, portal_llegada, enemigo (rata, calabaza, goblin_arquero), cofre (madera, reforzado, dorado y uno legendario tras_jefe), rompible, cartel, jefe y portal_jefe.

- Enemigos amables pero con reto. Las ratas, cerca del inicio, son las más fáciles. Las calabazas están en el medio. Los goblins arqueros, antes del jefe, disparan desde lejos.
- IA simple: quieto o paseando, persigue al ver a la heroína, ataca en rango, vuelve si se aleja mucho.
- Las fogatas son puntos de guardado y de reaparición.

## El jefe: Minotauro del Bosque

- La arena es un anillo de piedras. Al entrar, las piedras se encienden (piedra_arena "encendida"), cambia la música (musica_jefe), sale el estandarte con su nombre y la barra del jefe arriba.
- Fase 1 (100% a 60%): golpe fuerte (attack_heavy) cuerpo a cuerpo y carga (charge) en línea recta.
- Fase 2 (60% a 0%): pisotón con círculo de aviso (aviso_jefe) alrededor de él, salto (leap) a donde está la heroína con círculo de aviso que se llena, grito (warcry) que llama 2 ratas.
- Todo ataque grande se avisa en el piso 1.2 s antes (1.8 s en modo peque).
- Al vencerlo: musica_victoria, lluvia de oro, se abre portal_jefe (abrir y luego girar en loop) y aparece el cofre legendario. Ese cofre da el legendario personal de cada heroína: arco_de_sophie, varita_de_alana, juramento_de_rick, baculo_de_steph. Los ids están en catalogo.json, verifica que existan.
- Entrar al portal lleva a la pantalla "Continuará": estandarte, retrato, nivel, oro y objetos encontrados. Guarda la partida.

## Botín e inventario

- catalogo.json trae 393 objetos con rareza, nivel, stats y en qué atlas está su ícono (campo atlas). Úsalo tal cual, no inventes objetos.
- Tablas de botín por enemigo y por nivel de cofre, con RNG con semilla (para tests). Rarezas: normal, magic, rare, set, legendary. Los legendarios casi solo salen del jefe o de cofres dorados.
- Al caer: el objeto rebota, haz de luz del color de su rareza (haz_<rareza>), suena legendario si aplica.
- Inventario (ui/inventario.png + layout en el manifest): muñeco con 11 casilleros y bolsa de 7 x 4, un objeto por casilla (sin el tetris de Diablo, es para niñas).
- Tocar un objeto de la bolsa lo equipa si es equipable, si es poción la manda al cinturón. Mantener presionado muestra el tooltip. Al lado del tooltip, flecha verde o roja comparando con lo equipado.
- Stats simples visibles: daño, armadura, vida. Los mods del catálogo suman por debajo.
- Nivel máximo 10 en el Mundo 1. Al subir: fx aura_nivel, sonido subir_nivel, vida llena.

## Guardado

- localStorage, una clave por perfil: legadogg:v1:perfil:<id>. Guarda nivel, xp, oro, equipo, bolsa, cinturón, mundo, jefe vencido, cofres abiertos, última fogata y ajustes (volumen, modo peque).
- Con versión y migración. Autoguardado en fogata, cofre, subida de nivel, portal y cada 30 s.
- Borrar un perfil pide mantener presionado 3 s (para que las niñas no lo borren sin querer).

## Técnica (decisiones ya tomadas, no las cambies sin decir por qué)

- Resolución base 960 x 540, pixelArt true, roundPixels, Scale.FIT con autoCenter. Cámara sigue a la heroína con lerp y límites del mapa.
- Orden de profundidad por y (pies), usando el pivote de cada personaje y el apoyo de cada objeto.
- El agua del mapa se anima cambiando índices de tiles cada 260 ms (Phaser no lo hace solo).
- Un cargador genérico lee manifest.json y encola TODO lo que diga. Si mañana el kit trae un personaje nuevo, aparece sin tocar código. Tipos del manifest en src/kit/.
- Lógica pura en src/logic/ sin importar Phaser: combate, botín, inventario, stats, guardado, pathfinding, máquina de estados del jefe, IA. Todo eso con tests de Vitest.
- Escenas: Boot (carga y "toca para empezar", que también desbloquea el audio en tablets), Perfiles, Mundo, HUD (escena paralela), Inventario (encima), Continuará, Créditos.
- La escena de Créditos muestra CREDITOS.txt del kit. Es obligatorio por la licencia de las piezas LPC.
- Nunca se editan a mano archivos de public/assets/kit. Si falta un asset, se anota en ASSETS_PENDIENTES.md para que yo lo genere en PixelForja.
- Modo prueba: con ?test=1 el juego expone window.__LEGADO__ (estado, posición, teleport, semilla) para Playwright. Con ?seed=N el RNG es fijo.
- Playwright con dos vistas: escritorio 1280x720 y tablet 1180x820 táctil. Pruebas de humo por fase (cargar, elegir perfil, tocar para mover, abrir inventario, etc.) más una captura de pantalla.
- PWA (manifest e íconos) para que en la tablet abra en pantalla completa desde el inicio.

## Lo que quiero de ti

1. Revisa el kit y dime qué falta o qué está mal para este juego. Sé crítico.
2. Si algo de esta visión es mala idea, dilo y propón algo mejor. No me compres todo.
3. Hazme como máximo 5 preguntas, solo si cambian el plan. Si no, decide tú y deja la decisión escrita.
4. Escribe PLAN.md con:
   - Estructura de carpetas y módulos, con la responsabilidad de cada uno.
   - Fases cortas, en este orden aproximado, cada una jugable al terminar:
     - F0, base: Vite, TS, Phaser, Vitest, Playwright, Netlify, scripts kit/dev/build/test.
     - F1, caminar: cargador del kit, perfiles, mapa con objetos y agua, tocar para moverse con A*, 8 direcciones, cámara, Thor que sigue.
     - F2, combate: enemigos con IA, ataque y habilidades por clase, números de daño, orbes, XP, rescate de Thor.
     - F3, botín: drops, oro, cofres, rompibles, inventario, equipo, cinturón, guardado.
     - F4, el minotauro: arena, fases, avisos, victoria, portal, cofre legendario, Continuará.
     - F5, pulido: ajustes, modo peque, créditos, PWA, rendimiento en tablet, deploy.
   - Por fase: objetivo, lista de tareas concretas (archivos a crear o tocar), criterios de aceptación verificables, tests que deben existir y la demo que yo hago con las niñas al final.
   - Valores iniciales de balance en una tabla: vida y daño de cada enemigo y del jefe por modo, XP por nivel, probabilidades de botín, recargas. Que estén en un solo archivo de config.
   - Riesgos y cómo mitigarlos: rendimiento en tablet, audio en iOS, tamaño del kit, tacto vs clic.
   - Un bloque "Prompt para Sonnet, fase N" listo para copiar por cada fase.
5. No escribas código del juego. Solo PLAN.md y, si hace falta, ASSETS_PENDIENTES.md.
````

---

## 3. Prompt para Sonnet (ejecutar una fase)

Pégalo en una sesión nueva por cada fase, cambiando el número.

````text
Vas a ejecutar la FASE N de PLAN.md en este repo (legado-gg). Lee primero CLAUDE.md, PLAN.md completo y tools/pixel_forja/docs/KIT_JUEGO.md.

Reglas:
- Haz solo la fase N. Si ves algo de otra fase que hace falta, anótalo en PLAN.md bajo "Notas para después" y sigue.
- Antes de codear, escribe en 5 a 10 líneas cómo la vas a hacer. Si algo del plan no cuadra con el código o el kit real, dilo y propone el ajuste mínimo.
- La lógica va en src/logic/ con tests de Vitest. Lo de Phaser en src/scenes/ y src/game/.
- No edites nada en public/assets/kit ni en tools/pixel_forja. Si falta un asset, anótalo en ASSETS_PENDIENTES.md y usa un reemplazo temporal evidente.
- Commit por cada tarea que funcione, con mensaje claro en español. Al final de la fase: npm run typecheck, npm test, npm run build y npm run e2e en verde, y push.
- Cierra con un resumen corto:
  - qué se hizo
  - cómo probarlo con las niñas (qué tocar, qué debería pasar)
  - qué quedó pendiente
  - qué no pudiste verificar
- Nunca digas que algo funciona si no lo corriste.
````

---

## 4. CLAUDE.md para el repo del juego

````markdown
# Legado GG

Juego tipo Diablo para la familia GG (Sophie 8, Alana 5). Phaser 3 + TypeScript + Vite. Tablet y compu. Cada niña juega su propia partida.

## Reglas del proyecto
- Nadie pierde: al caer, Thor rescata a la heroína en la última fogata y no se pierde nada.
- Sin IA y sin red: todo corre en el dispositivo, la partida vive en localStorage.
- Los assets salen de PixelForja (tools/pixel_forja, submódulo). Nunca editar public/assets/kit a mano. Regenerar con `npm run kit`. Lo que falte va a ASSETS_PENDIENTES.md.
- Personajes editados en el estudio de PixelForja: exportar la ficha a fichas/<id>.ficha.json y correr `npm run kit`.
- Créditos LPC visibles en el juego (escena Créditos con CREDITOS.txt del kit).
- Repo privado. Ninguna foto de la familia entra al repo.

## Código
- src/logic/: reglas puras sin Phaser (combate, botín, inventario, stats, guardado, IA, pathfinding, jefe). Todo con tests.
- src/kit/: tipos y cargador del manifest. Lo que esté en el manifest se carga solo.
- src/scenes/ y src/game/: Phaser.
- Balance en un solo archivo de config.
- Textos para Alana con ícono y sonido. Textos en español.

## Comandos
- npm run dev | build | typecheck | test | e2e | kit
- ?test=1 expone window.__LEGADO__ para Playwright. ?seed=N fija el azar.

## Cómo trabajar
- Una fase de PLAN.md a la vez. Commit por tarea, push al final con todo en verde.
- Nunca decir que algo está probado si no se corrió.
- Escribir en español venezolano casual: sin em dash, sin punto y coma, pocas comillas y paréntesis. Directo.
````
