# Piloto 0d: el pie de apoyo en las animaciones de hoy (premium chibi de GG Abyss)

Generado por `npx tsx scripts/forja2-piloto-0d.ts`. Un pie cuenta como apoyado si la pose lo marca y además está a nivel del piso (a 1 px del tobillo más bajo de la animación). whirlwind no se mide: gira por las 8 direcciones a propósito. La familia con su clase (como en el kit), celda 48, las 21 animaciones del kit. Patinazo: entre dos cuadros seguidos con el mismo pie apoyado, cuánto se corre ese pie en la hoja de más o de menos respecto de lo que el juego mueve el sprite (0 en las acciones en el sitio, el avance del ciclo en caminar y correr). Tope: 1 px. Las acciones en el sitio se miden en las 8 direcciones (columna peor vista); las que avanzan, de lado.

| personaje | animación | tipo | vistas | peor patinazo (px) | peor vista | pasos > 1 px | pasos medidos | |
|---|---|---|---|---|---|---|---|---|
| rick | idle | en el sitio | 8 | 0 | side | 0 | 64 | pasa |
| rick | walk | avanza | 1 | 0.2 | side | 0 | 6 | pasa |
| rick | run | avanza | 1 | 0.6 | side | 0 | 4 | pasa |
| rick | attack | en el sitio | 8 | 2.2 | sw | 4 | 34 | patina |
| rick | attack_heavy | en el sitio | 8 | 1.8 | left | 8 | 44 | patina |
| rick | attack_thrust | en el sitio | 8 | 4.2 | left | 16 | 40 | patina |
| rick | cast | en el sitio | 8 | 2 | left | 10 | 44 | patina |
| rick | nova | en el sitio | 8 | 2.4 | left | 6 | 32 | patina |
| rick | channel | en el sitio | 8 | 0 | side | 0 | 48 | pasa |
| rick | whirlwind | gira | - | - | - | - | - | no se mide |
| rick | leap | en el sitio | 8 | 1.8 | left | 2 | 14 | patina |
| rick | charge | se desliza | 8 | 2.8 | left | 22 | 30 | patina |
| rick | dodge | en el sitio | 8 | 2 | left | 6 | 8 | patina |
| rick | shoot_bow | en el sitio | 8 | 2.2 | left | 12 | 48 | patina |
| rick | summon | en el sitio | 8 | 1.1 | sw | 6 | 32 | patina |
| rick | warcry | en el sitio | 8 | 2.3 | left | 8 | 46 | patina |
| rick | block_shield | en el sitio | 8 | 1 | front | 0 | 48 | pasa |
| rick | use_item | en el sitio | 8 | 1.4 | left | 2 | 56 | patina |
| rick | throw | en el sitio | 8 | 1.5 | sw | 4 | 36 | patina |
| rick | hit | en el sitio | 8 | 3.4 | left | 12 | 40 | patina |
| rick | die | se desliza | 8 | 11.6 | front | 10 | 27 | patina |
| steph | idle | en el sitio | 8 | 0 | side | 0 | 64 | pasa |
| steph | walk | avanza | 1 | 0.2 | side | 0 | 6 | pasa |
| steph | run | avanza | 1 | 0.7 | side | 0 | 4 | pasa |
| steph | attack | en el sitio | 8 | 2.2 | sw | 4 | 34 | patina |
| steph | attack_heavy | en el sitio | 8 | 1.8 | left | 8 | 42 | patina |
| steph | attack_thrust | en el sitio | 8 | 4.2 | left | 16 | 40 | patina |
| steph | cast | en el sitio | 8 | 2 | left | 14 | 52 | patina |
| steph | nova | en el sitio | 8 | 2.4 | left | 6 | 30 | patina |
| steph | channel | en el sitio | 8 | 0 | side | 0 | 48 | pasa |
| steph | whirlwind | gira | - | - | - | - | - | no se mide |
| steph | leap | en el sitio | 8 | 0 | side | 0 | 4 | pasa |
| steph | charge | se desliza | 8 | 3.3 | left | 12 | 20 | patina |
| steph | dodge | en el sitio | 8 | 2 | left | 6 | 8 | patina |
| steph | shoot_bow | en el sitio | 8 | 2.2 | left | 12 | 48 | patina |
| steph | summon | en el sitio | 8 | 0 | side | 0 | 8 | pasa |
| steph | warcry | en el sitio | 8 | 2.3 | left | 6 | 44 | patina |
| steph | block_shield | en el sitio | 8 | 1 | front | 0 | 48 | pasa |
| steph | use_item | en el sitio | 8 | 1.4 | left | 2 | 56 | patina |
| steph | throw | en el sitio | 8 | 1.5 | sw | 4 | 36 | patina |
| steph | hit | en el sitio | 8 | 3.4 | left | 12 | 40 | patina |
| steph | die | se desliza | 8 | 1 | front | 0 | 6 | pasa |
| sophie | idle | en el sitio | 8 | 0 | side | 0 | 64 | pasa |
| sophie | walk | avanza | 1 | 0.2 | side | 0 | 6 | pasa |
| sophie | run | avanza | 1 | 0.6 | side | 0 | 4 | pasa |
| sophie | attack | en el sitio | 8 | 1.9 | sw | 2 | 30 | patina |
| sophie | attack_heavy | en el sitio | 8 | 1.6 | left | 8 | 44 | patina |
| sophie | attack_thrust | en el sitio | 8 | 3.2 | left | 12 | 40 | patina |
| sophie | cast | en el sitio | 8 | 1.6 | left | 10 | 52 | patina |
| sophie | nova | en el sitio | 8 | 1.8 | left | 6 | 32 | patina |
| sophie | channel | en el sitio | 8 | 0 | side | 0 | 48 | pasa |
| sophie | whirlwind | gira | - | - | - | - | - | no se mide |
| sophie | leap | en el sitio | 8 | 2 | nw | 6 | 20 | patina |
| sophie | charge | se desliza | 8 | 2.6 | left | 24 | 32 | patina |
| sophie | dodge | en el sitio | 8 | 1.4 | left | 2 | 8 | patina |
| sophie | shoot_bow | en el sitio | 8 | 1.5 | left | 12 | 48 | patina |
| sophie | summon | en el sitio | 8 | 0.8 | sw | 0 | 44 | pasa |
| sophie | warcry | en el sitio | 8 | 1.7 | left | 6 | 48 | patina |
| sophie | block_shield | en el sitio | 8 | 1 | front | 0 | 48 | pasa |
| sophie | use_item | en el sitio | 8 | 0.9 | left | 0 | 56 | pasa |
| sophie | throw | en el sitio | 8 | 1.1 | sw | 4 | 36 | patina |
| sophie | hit | en el sitio | 8 | 3.1 | left | 10 | 40 | patina |
| sophie | die | se desliza | 8 | 2.7 | back | 5 | 20 | patina |
| alana | idle | en el sitio | 8 | 0 | side | 0 | 64 | pasa |
| alana | walk | avanza | 1 | 0.1 | side | 0 | 6 | pasa |
| alana | run | avanza | 1 | 0.3 | side | 0 | 4 | pasa |
| alana | attack | en el sitio | 8 | 1 | front | 0 | 26 | pasa |
| alana | attack_heavy | en el sitio | 8 | 1.4 | sw | 8 | 44 | patina |
| alana | attack_thrust | en el sitio | 8 | 2 | left | 6 | 40 | patina |
| alana | cast | en el sitio | 8 | 1.1 | sw | 10 | 44 | patina |
| alana | nova | en el sitio | 8 | 1.1 | left | 2 | 32 | patina |
| alana | channel | en el sitio | 8 | 0 | side | 0 | 48 | pasa |
| alana | whirlwind | gira | - | - | - | - | - | no se mide |
| alana | leap | en el sitio | 8 | 1.2 | nw | 2 | 20 | patina |
| alana | charge | se desliza | 8 | 1.5 | left | 16 | 24 | patina |
| alana | dodge | en el sitio | 8 | 0.8 | left | 0 | 8 | pasa |
| alana | shoot_bow | en el sitio | 8 | 0.9 | left | 0 | 48 | pasa |
| alana | summon | en el sitio | 8 | 0.5 | sw | 0 | 44 | pasa |
| alana | warcry | en el sitio | 8 | 1 | left | 2 | 46 | pasa |
| alana | block_shield | en el sitio | 8 | 1 | front | 0 | 48 | pasa |
| alana | use_item | en el sitio | 8 | 0.5 | left | 0 | 56 | pasa |
| alana | throw | en el sitio | 8 | 0.6 | sw | 0 | 36 | pasa |
| alana | hit | en el sitio | 8 | 2.8 | left | 10 | 40 | patina |
| alana | die | se desliza | 8 | 2.5 | front | 7 | 22 | patina |

Patinan: 48 de 80. Pasos con más de 1 px: 400 de 2759.
Tiempo: 0.001 s por cuadro dibujado (4512 cuadros).
