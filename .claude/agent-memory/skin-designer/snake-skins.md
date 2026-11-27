---
name: snake-skins
description: Paletas, contrastes y decisiones de los skins de snake (3 skins validados 2026-11-26), incluido el truco del disco+filtro para el atlas de frutas
metadata:
  type: project
---

`snake` tiene clasico/neon/retro validados el 2026-11-26 (`lib/games/snake/skins.ts`, `SnakePalette`).

Contraste mínimo de entidades (no hay texto en canvas): clásico 3.36 · neón 4.63 · retro 3.47. Rejilla: 1.12 / 1.11 / 1.11.

Paletas (tokens clave):

- clasico: damero `#182509`/`#1f2f0c` (antes `#aad751`/`#a2d149`, L≈0.6, fallaba la regla de fondo), serpiente `#4674e9` sin cambios (cabeza = cuerpo; se distingue por los ojos `#fff`/`#000`, como el original), disco de fruta `#aad751` (el verde original reaparece ahí).
- neon: damero `#0a0a0f`/`#171722`, cuerpo `#00ff88`, cabeza `#00f5ff`, ojos `#0a0a0f` + pupila `#f5ff00`, anillo de fruta `#ff006e` con halo `rgba(255,0,110,0.1)`, filtro `brightness(1.35) saturate(1.15)`, glow 12.
- retro: damero `#0c0700`/`#201400`, cuerpo `#e89a00`, cabeza `#ffd98a` (1.72:1), anillo `#ffc44d`, halo `#1f1400`, filtro `grayscale(1) sepia(1) saturate(3) hue-rotate(-12deg) brightness(1.25)`, glow 2, scanlines como asteroides.

Problema resuelto: el atlas de frutas tiene sprites oscuros (uvas L media 0.102, berenjena 0.155) que no llegan a 3:1 sobre un tablero oscuro. Solución: disco + anillo detrás de la fruta (el anillo da la localización ≥3:1) y `ctx.filter` que sube la luminancia (uvas → 0.224 en neón, 0.151 en retro). Las luminancias se midieron en el navegador con `getImageData` sobre `/games/snake/fruits.png`.

Decisiones (pendientes de revisar por el usuario): el disco claro en clásico; cabeza = cuerpo en clásico y cian/verde (1.01:1 en luminancia) en neón, distinguibles por ojos y tono; filtro sepia en retro para que las frutas sean monocromas.

**Why:** dejar registrado qué es deliberado y cómo se resolvió el contraste de sprites, para reutilizarlo en otros juegos con sprites (arkanoid).
**How to apply:** en juegos con spritesheets, mide la luminancia real de los sprites antes de elegir fondo; usa [[paletas-comunes]].
