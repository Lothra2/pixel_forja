# GG Abyss: el final (Mundo 7 + celestial + cinemáticas)

Rama: `claude/abyss-final`. Sale de `claude/abyss-mundo7` (`d454c8c`) y trae `claude/abyss-celestial` (`15a6633`)
con un merge normal. Las dos ramas salen de `b684504` (Mundo 6).

## Tarea 1: el merge

Commit `7b29214`. Un solo archivo chocó: `src/engine/kit/gamekit.ts`, en tres lugares. Quedaron las dos partes:

- `KitOptions`: `sinMundo7` (del Mundo 7) junto a `sinCelestial` y `sinCine` (de la celestial).
- `fx`: primero los del Mundo 7 (rayo de hielo, lanzas, la cruz, todo lo del Diablo) y después los celestiales
  (`lanza_luz`, `impacto_luz`, `estela_alas`, `aura_celestial`).
- `ui.habilidades`: los íconos de siempre más `alas`, `lanza_luz` y `ciclo`, y el nombre del archivo sin tildes ni
  eñes como pide el Mundo 7 (`compañeras` > `companeras.png`). Los tres celestiales no tienen tildes, así que no cambian.

`docs/KIT_JUEGO.md`, `src/engine/ui/icons2.ts` y el resto se unieron solos. Ningún fx ni objeto quedó con nombre
repetido (el kit se niega a armarse si pasa).

Verificación:

- `npx tsc -b` limpio y `npm test` en verde: 46 archivos, 325 tests.
- Kit regenerado y comparado con el de `b684504`: los 2368 archivos de antes están todos, idénticos byte a byte. Solo
  cambia `manifest.json`, y en él lo único que cambia de lo que ya estaba es `mundos`, que suma `mundo7` al final (los
  seis de antes, iguales). Kit nuevo: 3028 archivos.
- Presente todo lo del Mundo 7 (`diablo`, `reina_escarcha`, `guardian_campana`, `corazon`, `luz_ojos`, sus fx como
  `nova_fuego_diablo`, `jaula_huesos_romper` y `gota_sangre_diablo`) y todo lo de la celestial (`cine_bajada`,
  `cine_fin`, capas `alas_detras`, `alas_delante` y `aura`, `volar`, `retrato_celestial`, `ui.habilidades` `alas`,
  `lanza_luz` y `ciclo`, `marco_ciclo`, `logo_ciclo`, `logo_hielo`, `logo_fin`, `nieve_frente`, sus fx y el audio
  `alas_vuelo`, `celestial_despierta`, `cine_rugido`, `cine_bajada_musica` y `cine_fin_musica`).

## Tarea 2: las alas del Diablo en las cinemáticas (pedido de Sophie)

El Diablo de las cinemáticas (`src/engine/cine/diablo.ts`) ahora lleva las mismas alas que el del juego. Hay un pintor
nuevo, `alaDiablo`, que repite el diseño de `src/engine/boss/diablo.ts`:

- enormes y rotas, piel rojo vino casi negro con arrugas de cuero y los mismos desgarrones del juego (la tabla
  `WING_TEARS`), con el borde festoneado
- espinas de hueso en todo el borde de adelante (el brazo del ala y el primer dedo) y más chicas en cada dedo
- garras curvas en la punta de cada dedo y una grande en el codo
- la sangre aparte (`sangreAlas`): hilos de `#4a0008` a `#8a0a12` que cuelgan de los desgarrones, de algunas espinas y
  de las garras, con la gota gorda al final, un pixel de brillo húmedo apenas y una gota que se suelta y cae

Por panel:

- `bajada_diablo`: las alas asoman detrás de la cara, a los dos lados, con un canto frío arriba y de brasa abajo para
  que se lean contra el fondo negro. La sangre gotea despacio: en los 8 cuadros la gota recorre medio camino.
- `fin_cae`: las alas se desploman con él. El codo baja, los dedos se abren sobre el hielo, la piel se raja con
  desgarrones nuevos y agujeros, se sueltan pedazos que caen al piso y al final se le parte un dedo, que queda tirado.
  Las gotas que llegan al hielo dejan una mancha chiquita. Las grietas de brasa ya no pasan por las alas.
- `fin_llama`: usa el mismo `diabloRodillas` del cierre, así que el Diablo sale con las alas ya rotas como quedaron en
  `fin_cae`. Lo dejé así para que sea el mismo Diablo de un panel al siguiente. Si Rick prefiere que este panel quede
  como estaba, es un parámetro (`caida = 0`).

Lo demás de las cinemáticas no cambia. Cambiaron las notas de `bajada_diablo`, `fin_cae` y la de `cine_bajada` en el
manifest, que antes decían "sin sangre". El resto del juego sigue sin sangre. Hay un test nuevo que revisa que ningún
panel de las heroínas o de Thor tenga los rojos de la sangre.

Láminas rehechas: `docs/entregas/cine_bajada.png` y `docs/entregas/cine_fin.png`.

Verificación: ver el final de este archivo.

## Créditos y fotos

No entró ninguna pieza LPC nueva (`CREDITOS.txt` del kit sale igual) y ninguna foto de la familia.
