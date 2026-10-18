# Piloto 0c: movimiento de Forja 2 sobre el cuerpo del premium chibi de hoy

Generado por `npx tsx scripts/forja2-piloto-0c.ts`. Mismo cuerpo, mismo pintor, misma celda (48), vista de lado. Topes: pivote 0 px, patina ≤ 1 px, altura ≤ 2 px (bucles), sueltos 0, salto de silueta ≤ 0,6, colores ≤ 48. ✗ = no pasa.

| movimiento | fila | cuadros | pivote | patina | altura | sueltos | salto | colores | pasa |
|---|---|---|---|---|---|---|---|---|---|
| guardia | hoy | 8 | 0 | 0 | 1 | 0 | 0.08 | 36 | sí |
| guardia | Forja 2 | 8 | 0 | 0 | 1 | 0 | 0.16 | 37 | sí |
| puño_fuerte | hoy | 8 | 0 | 2 ✗ | n/a | 0 | 0.62 ✗ | 42 | NO |
| puño_fuerte | Forja 2 | 9 | 0 | 1 | n/a | 0 | 0.52 | 42 | sí |
| patada_fuerte | hoy | 9 | 0 | 4 ✗ | n/a | 0 | 0.51 | 42 | NO |
| patada_fuerte | Forja 2 | 8 | 0 | 0 | n/a | 0 | 0.23 | 42 | sí |
| recibe_alto | hoy | 6 | 0 | 2 ✗ | n/a | 0 | 0.54 | 36 | NO |
| recibe_alto | Forja 2 | 5 | 0 | 0 | n/a | 0 | 0.47 | 37 | sí |

## El golpe, medido (pixeles de la celda de 48)

recogido: cuánto se va para atrás el puño o el pie antes del impacto. alcance: cuánto llega adelante. sobrepaso: cuánto sigue la cabeza después del impacto. arco: cuánto se aparta el camino de la línea recta.

| movimiento | fila | recogido | alcance | sobrepaso | arco |
|---|---|---|---|---|---|
| puño_fuerte | hoy | 2.44 | 6.74 | 0.61 | 1.23 |
| puño_fuerte | Forja 2 | 11.78 | 5.13 | 1.82 | 11.08 |
| patada_fuerte | hoy | 0 | 9.33 | 0 | 1.19 |
| patada_fuerte | Forja 2 | 0 | 10.7 | -0.61 | 2.31 |

## Tiempos

| fila | cuadros | ticks (60 por segundo) | segundos por cuadro |
|---|---|---|---|
| hoy guard | 8 | 60 | 0.005 |
| Forja 2 guardia | 8 | 32 | 0.005 |
| hoy punch | 8 | 34 | 0.002 |
| Forja 2 puño_fuerte | 9 | 22 | 0.004 |
| hoy kick_martial | 9 | 39 | 0.003 |
| Forja 2 patada_fuerte | 8 | 26 | 0.001 |
| hoy fight_hit | 6 | 30 | 0.002 |
| Forja 2 recibe_alto | 5 | 18 | 0.003 |
