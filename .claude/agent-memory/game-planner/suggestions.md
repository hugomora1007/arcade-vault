---
name: suggestions
description: Historial de sugerencias de juegos de game-planner con fecha, estado y respuesta del usuario; consultar antes de proponer para no repetir.
metadata:
  type: project
---

# Historial de sugerencias

Estado: `pendiente` / `en-spec` / `implementado` / `descartado`.

## Ronda 2026-11-25 (primera ronda)

Contexto: catálogo real = ARCADE 2 (arkanoid, snake), PUZZLE 1 (tetris), SHOOTER 1 (asteroides), VERSUS 0. Portadas sin juego real: `cover-invaders`, `cover-glot`, `cover-rana`, `cover-duelo`.

| Nombre               | Slug       | Cat     | Total /45 | Estado    | Notas                                                            |
| -------------------- | ---------- | ------- | --------- | --------- | ---------------------------------------------------------------- |
| ESTELA (recomendado) | `estela`   | VERSUS  | 42        | pendiente | Motos de luz vs CPU en rejilla 20x15; reutiliza patrón de Snake. |
| ENJAMBRE             | `enjambre` | SHOOTER | 41        | pendiente | Shooter de formaciones; solapa con el simulado `invasores`.      |
| ORBITAL              | `orbital`  | SHOOTER | 36        | pendiente | Nave en anillo disparando al núcleo; necesita cover nueva.       |

Ya implementados con motor real (no proponer): asteroides, tetris, arkanoid, snake.
Simulados existentes (evitar duplicar su concepto salvo como "versión real"): bloque-buster, caida, serpentina, gloton, invasores, rocas, ranaria, duelo-pixel.

## Ronda 2 — 2026-11-25 (4 instancias en paralelo, una por categoría)

Todas en estado `pendiente`. Totales /45 no calibrados entre instancias: cada una puntuó Equilibrio según su propia categoría, así que compara con cautela entre categorías.

| Nombre | Slug | Cat | Color | Cover | Total | Notas |
| --- | --- | --- | --- | --- | --- | --- |
| PERÍMETRO | `perimetro` | ARCADE | cyan | nueva | 37 | Captura de territorio; solapa con TERRITORIO. |
| PERFORA | `perfora` | ARCADE | yellow | nueva | 36 | Minero, rocas que caen, oxígeno. |
| TÚNEL | `tunel` | ARCADE | magenta | nueva | 36 | Cueva de un botón. |
| ASCENSO | `ascenso` | ARCADE | green | nueva | 35 | Salto vertical infinito. |
| ALUNIZA | `aluniza` | ARCADE | cyan | `cover-rocas` (prov.) | 35 | Alunizaje con combustible. |
| CIRCUITO | `circuito` | PUZZLE | yellow | nueva | 39 | Conductores 10x7 vs corriente, 3 fusibles. |
| ORBES | `orbes` | PUZZLE | magenta | nueva | 36 | Lanzador hexagonal, techo baja. |
| CHISPA | `chispa` | PUZZLE | green | `cover-tetro` | 36 | Alinear 3 en 8x8. |
| FUSIÓN | `fusion` | PUZZLE | cyan | nueva | 35 | Deslizar y fusionar 5x5. |
| PRISMA | `prisma` | PUZZLE | magenta | nueva | 32 | Espejos y láser. |
| NEXO | `nexo` | SHOOTER | magenta | nueva | 41 | Arena de dos ejes con combo. |
| BASTIÓN | `bastion` | SHOOTER | yellow | nueva | 39 | Defensa antiaérea, explosión en cadena. |
| MICELIO | `micelio` | SHOOTER | green | nueva | 39 | Criatura segmentada; solapa con un clásico concreto (riesgo de recreación). |
| CENTELLA | `centella` | SHOOTER | cyan | nueva | 38 | Vertical con patrones de balas y jefes. |
| SONDA | `sonda` | SHOOTER | magenta | nueva | 36 | Scroll horizontal con bombas y combustible. |
| DISCO NEÓN | `disco-neon` | VERSUS | magenta | `cover-duelo` | 43 | Hockey de mesa vs CPU; solapa con simulado `duelo-pixel`. |
| REBOTE | `rebote` | VERSUS | cyan | nueva | 42 | Tanques con balas que rebotan. |
| TERRITORIO | `territorio` | VERSUS | green | nueva | 42 | Pintar casillas 60 s; solapa con ESTELA y PERÍMETRO. |
| EMPUJÓN | `empujon` | VERSUS | yellow | nueva | 41 | Sumo de discos, arena que se encoge. |
| BALÍSTICA | `balistica` | VERSUS | cyan | nueva | 35 | Artillería por turnos. |

Total acumulado de sugerencias pendientes: 23 (3 de ronda 1 + 20 de ronda 2). No volver a proponer ninguna.
