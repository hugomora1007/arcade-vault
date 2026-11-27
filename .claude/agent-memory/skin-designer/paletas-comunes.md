---
name: paletas-comunes
description: Tokens de color compartidos por los skins neon y retro de todos los juegos (fijados al hacer asteroides, 2026-11-26)
metadata:
  type: project
---

Paletas de referencia para mantener coherencia entre juegos. Primer juego: `asteroides` (2026-11-26).

**neon** (tokens de `app/globals.css`): fondo `#0a0a0f` (--bg), jugador `#00f5ff` (--cyan), enemigos/rocas `#ff006e` (--magenta, 5.15:1 sobre --bg, el más justo), proyectiles `#f5ff00` (--yellow), power-ups `#00ff88` (--green), propulsor/acentos `#ffcf3a` (--gold). `glow` 12 (máx. 20).

**retro** (fósforo ámbar, sin degradados): fondo `#0c0700`, brillante `#ffd98a` (jugador), muy brillante `#ffe6b0` (proyectiles, áreas pequeñas), medio `#ffc44d` (power-ups/texto), base `#e89a00` (rocas/enemigos), tenue `#a86a00` (decoración). `glow` 2, scanlines `rgba(0,0,0,0.28)` cada 4 px de 1 px. Jugador/enemigo 1.72:1 por brillo.

**Selector**: el estado activo de RETRO en CSS usa `#ffb000` (no hay token ámbar en `:root`).

**Why:** el prompt pide mismo ámbar en todos los `retro` y mismos tokens en todos los `neon`.
**How to apply:** al diseñar tetris/arkanoid/snake, parte de estos hex; si un juego necesita más tonos (7 piezas de Tetris), interpola dentro del ámbar y valida ≥1.3:1 entre vecinos o usa borde.

Notas de `asteroides`: `clasico` = colores originales sin cambios (fondo `#000`, trazos `#fff` finos, power-up `#0ff`, llama `rgba(255,130,0,0.85)`); nave y rocas comparten blanco pero se distinguen por forma (vectorial), como el original. Ver [[asteroides-skins]].
