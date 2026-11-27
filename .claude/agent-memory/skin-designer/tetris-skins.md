---
name: tetris-skins
description: Paletas, contrastes y decisiones de los skins de tetris (3 skins validados 2026-11-26), incluida la rampa ámbar de 7 brillos para distinguir piezas en retro
metadata:
  type: project
---

`tetris` tiene clasico/neon/retro validados el 2026-11-26 (`lib/games/tetris/skins.ts`, `TetrisPalette`).

Contraste mínimo (pieza / texto en canvas): clásico 4.37 (T) / 14.14 · neón 4.65 (T) / 14.58 · retro 3.14 (Z) / 12.86. Rejilla: 1.18 / 1.11 / 1.11. Piezas medidas contra el fondo y contra el recuadro NEXT compuesto.

Paletas (orden I, O, T, S, Z, J, L):

- clasico: sin cambios respecto al original (fondo `#1a1a25`, texto `#e8e8f0`, piezas `#4dd0e1 #ffd54f #ba68c8 #81c784 #e57373 #90caf9 #ffb74d`, fantasma relleno α 0.2). J/L tienen la misma luminancia (1.01:1) pero se distinguen por tono, como el original.
- neon: fondo `#0a0a0f`, piezas `#00f5ff #f5ff00 #b14bff #00ff88 #ff006e #3d7bff #ffcf3a`, texto `#00f5ff`, contador `#f5ff00`, rejilla `rgba(0,245,255,0.07)`, glow 10, fantasma en contorno α 0.55.
- retro: fondo `#0c0700`, rampa ámbar `#ffe9b8 #ffc651 #a56800 #d98f00 #8e5600 #be7b00 #efa819` (7 niveles, ≥1.31:1 entre cualquier par; generada interpolando `#7a4600→#a86a00→#e89a00→#ffc44d→#ffe6b0→#fff4dc` por luminancia objetivo), borde interior del color de fondo, sin realce, glow 2, scanlines como asteroides, fantasma en contorno.

Problema resuelto: con la rampa a 3.0:1 la Z quedaba en 3.00 contra el recuadro NEXT; se subió el primer escalón a 3.3:1 vs fondo. La rejilla retro con α 0.07 daba 1.09 (<1.1) → α 0.08.

Decisiones (pendientes de revisar): violeta/azul fuera de los tokens para T/J en neón; fantasma en contorno en neón/retro; asignación de brillos retro (I más brillante, Z más oscura).

**Why:** registrar paletas y el método de la rampa para reutilizarlo en juegos con muchos tipos de entidad.
**How to apply:** si otro juego necesita >4 tonos retro, reutiliza esta rampa ámbar; ver [[paletas-comunes]].
