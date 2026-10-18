# Piloto 0d: después del pie clavado

Sale del renderer de hoy con el interruptor `pieClavado` de renderClip (apagado por defecto). Corre cada cuadro entero (pixeles enteros) para que el pie apoyado quede donde estaba en el cuadro anterior: no cambia ninguna pose, ningún tiempo ni qué cuadro es el impacto. Con los dos pies apoyados que se mueven distinto se corre al punto medio, así ningún paso queda peor. Se aplica a las acciones en el sitio, en las 8 direcciones. No se corrigen las que avanzan (caminar, correr: su avance por vista necesita la proyección de cada dirección), las que se deslizan a propósito (charge, die) ni el torbellino; quedan medidas en calidad_hoy.md. "pixeles perdidos": lo que al correr el cuadro quedó fuera de la celda.

| personaje | animación | antes (px) | después (px) | pasos > 1 px antes | después | pixeles perdidos | |
|---|---|---|---|---|---|---|---|
| rick | idle | 0 | 0 | 0 | 0 | 0 | pasa |
| rick | attack | 2.2 | 0.4 | 4 | 0 | 26 | pasa |
| rick | attack_heavy | 1.8 | 0.5 | 8 | 0 | 112 | pasa |
| rick | attack_thrust | 4.2 | 3.2 | 16 | 14 | 0 | patina |
| rick | cast | 2 | 0.2 | 10 | 0 | 0 | pasa |
| rick | nova | 2.4 | 1.5 | 6 | 4 | 0 | patina |
| rick | channel | 0 | 0 | 0 | 0 | 0 | pasa |
| rick | leap | 1.8 | 0.3 | 2 | 0 | 0 | pasa |
| rick | dodge | 2 | 2 | 6 | 6 | 0 | patina |
| rick | shoot_bow | 2.2 | 2.2 | 12 | 12 | 0 | patina |
| rick | summon | 1.1 | 1.1 | 6 | 6 | 0 | patina |
| rick | warcry | 2.3 | 1.5 | 8 | 4 | 0 | patina |
| rick | block_shield | 1 | 0.2 | 0 | 0 | 0 | pasa |
| rick | use_item | 1.4 | 1.4 | 2 | 2 | 0 | patina |
| rick | throw | 1.5 | 1.5 | 4 | 4 | 0 | patina |
| rick | hit | 3.4 | 1.2 | 12 | 2 | 0 | patina |
| steph | idle | 0 | 0 | 0 | 0 | 0 | pasa |
| steph | attack | 2.2 | 0.4 | 4 | 0 | 34 | pasa |
| steph | attack_heavy | 1.8 | 0.4 | 8 | 0 | 194 | pasa |
| steph | attack_thrust | 4.2 | 2.7 | 16 | 10 | 0 | patina |
| steph | cast | 2 | 0.3 | 14 | 0 | 0 | pasa |
| steph | nova | 2.4 | 1.5 | 6 | 4 | 0 | patina |
| steph | channel | 0 | 0 | 0 | 0 | 0 | pasa |
| steph | leap | 0 | 0 | 0 | 0 | 0 | pasa |
| steph | dodge | 2 | 2 | 6 | 6 | 0 | patina |
| steph | shoot_bow | 2.2 | 2.2 | 12 | 12 | 0 | patina |
| steph | summon | 0 | 0 | 0 | 0 | 0 | pasa |
| steph | warcry | 2.3 | 1.5 | 6 | 4 | 0 | patina |
| steph | block_shield | 1 | 0.2 | 0 | 0 | 0 | pasa |
| steph | use_item | 1.4 | 1.4 | 2 | 2 | 0 | patina |
| steph | throw | 1.5 | 1.5 | 4 | 4 | 0 | patina |
| steph | hit | 3.4 | 1.2 | 12 | 2 | 0 | patina |
| sophie | idle | 0 | 0 | 0 | 0 | 0 | pasa |
| sophie | attack | 1.9 | 0.5 | 2 | 0 | 0 | pasa |
| sophie | attack_heavy | 1.6 | 0.4 | 8 | 0 | 8 | pasa |
| sophie | attack_thrust | 3.2 | 2.3 | 12 | 10 | 0 | patina |
| sophie | cast | 1.6 | 0.5 | 10 | 0 | 0 | pasa |
| sophie | nova | 1.8 | 1.1 | 6 | 4 | 0 | patina |
| sophie | channel | 0 | 0 | 0 | 0 | 0 | pasa |
| sophie | leap | 2 | 1.1 | 6 | 4 | 0 | patina |
| sophie | dodge | 1.4 | 1.4 | 2 | 2 | 0 | patina |
| sophie | shoot_bow | 1.5 | 1.5 | 12 | 12 | 0 | patina |
| sophie | summon | 0.8 | 0.8 | 0 | 0 | 0 | pasa |
| sophie | warcry | 1.7 | 1.1 | 6 | 4 | 0 | patina |
| sophie | block_shield | 1 | 0.1 | 0 | 0 | 0 | pasa |
| sophie | use_item | 0.9 | 0.9 | 0 | 0 | 0 | pasa |
| sophie | throw | 1.1 | 1.1 | 4 | 4 | 0 | patina |
| sophie | hit | 3.1 | 0.8 | 10 | 0 | 0 | pasa |
| alana | idle | 0 | 0 | 0 | 0 | 0 | pasa |
| alana | attack | 1 | 0.3 | 0 | 0 | 0 | pasa |
| alana | attack_heavy | 1.4 | 0.4 | 8 | 0 | 0 | pasa |
| alana | attack_thrust | 2 | 1.6 | 6 | 6 | 0 | patina |
| alana | cast | 1.1 | 0.1 | 10 | 0 | 0 | pasa |
| alana | nova | 1.1 | 0.6 | 2 | 0 | 0 | pasa |
| alana | channel | 0 | 0 | 0 | 0 | 0 | pasa |
| alana | leap | 1.2 | 0.2 | 2 | 0 | 0 | pasa |
| alana | dodge | 0.8 | 0.8 | 0 | 0 | 0 | pasa |
| alana | shoot_bow | 0.9 | 0.9 | 0 | 0 | 0 | pasa |
| alana | summon | 0.5 | 0.5 | 0 | 0 | 0 | pasa |
| alana | warcry | 1 | 0.6 | 2 | 0 | 0 | pasa |
| alana | block_shield | 1 | 0.1 | 0 | 0 | 0 | pasa |
| alana | use_item | 0.5 | 0.5 | 0 | 0 | 0 | pasa |
| alana | throw | 0.6 | 0.6 | 0 | 0 | 0 | pasa |
| alana | hit | 2.8 | 0.4 | 10 | 0 | 0 | pasa |

En el sitio: patinaban 41 de 64; después patinan 25. Pasos con más de 1 px: 304 antes, 144 después.
