---
name: arkanoid-skins
description: Paletas, técnica de tinte del spritesheet y decisiones de los skins de arkanoid (3 skins validados 2026-11-26)
metadata:
  type: project
---

`arkanoid` tiene clasico/neon/retro validados el 2026-11-26. No hay texto en canvas (HUD en la página).

Técnica: el spritesheet se mantiene; `buildSkinSheet` (entities.ts) genera un canvas fuera de pantalla por skin recoloreando por bandas (pala, pelota, cada fila de ladrillo + sus 4 frames de explosión). El tono dominante del sprite pasa a ser el tinte exacto, sombras proporcionales y brillos hacia `highlight`. Así el contraste se mide con el hex del tinte. Se eligió en vez de `ctx.filter` por compatibilidad con Safari.

Tonos dominantes originales (muestreados con sharp): pala/pelota `#babac5`, red `#c02a3e`, yellow `#d9bd4c`, cyan(verde agua) `#4fc99c`, magenta(violeta) `#632ff4`, hotpink(naranja) `#fc7d1c`, green(azul) `#44aaf3`, gray `#323142`. Ojo: los nombres de `BlockColor` no coinciden con el color real del sprite.

Contraste mínimo entidad/fondo: clásico 3.24 (violeta) · neón 5.15 (magenta) · retro 4.52 (`#a86a00`).

Decisiones (pendientes de revisar por el usuario):

- `clasico`: solo el ladrillo gris se aclara a `#6a6982` (original 1.65:1 sobre negro).
- `neon`: red→`#ff006e`, yellow→`#f5ff00`, cyan→`#00ff88`, green→`#00f5ff`, hotpink→`#d97a3a` (--bronze), gray→`#8a8fb5` (--ink-dim), magenta→`#a86bff` (violeta fuera de tokens: no hay token violeta). Pala `#00f5ff`, pelota `#e6e9ff` con glow dorado. Glow 14 solo en pala y pelota (60 ladrillos con `shadowBlur` por frame sería caro).
- `retro`: 4 brillos para el 4-clique de vecinos (yellow, cyan, hotpink, magenta): `#a86a00` (red/magenta/gray), `#c98200` (cyan/green), `#e89a00` (hotpink), `#ffd98a` (yellow). Mínimo entre vecinos 1.36:1.

**Why:** registrar qué es deliberado para no deshacerlo en futuras auditorías.
**How to apply:** si cambian los niveles (`levels.ts`), recalcular los pares vecinos en retro. Ver [[paletas-comunes]].
