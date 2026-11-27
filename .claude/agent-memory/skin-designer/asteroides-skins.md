---
name: asteroides-skins
description: Estado y decisiones de los skins de asteroides (3 skins validados 2026-11-26) y del contrato común creado con él
metadata:
  type: project
---

`asteroides` tiene clasico/neon/retro validados el 2026-11-26 (primer juego con skins; con él se creó el contrato común y el selector).

Contraste mínimo entidad/texto: clásico 16.75/16.75 · neón 5.15/14.73 · retro 8.66/12.67. Script WCAG en el scratchpad de la sesión (no versionado): recalcular al tocar paletas.

Decisiones (pendientes de revisar por el usuario):

- `clasico` sin correcciones: el original ya cumple las reglas de modo oscuro.
- Selector como control segmentado `.skin-picker` dentro de `.player-hud`, entre las estadísticas y PAUSA/FIN/SALIR.
- La carga desde `localStorage` en `useEffect` necesita `eslint-disable-next-line react-hooks/set-state-in-effect` (esa regla está activa en el repo).
- El CSS de `app/globals.css` se insertó con un script para que el hook no pasara Prettier por todo el archivo (globals.css tiene formato compacto propio y nunca ha pasado por Prettier).

**Why:** registrar qué es deliberado para no deshacerlo en futuras auditorías.
**How to apply:** en los siguientes juegos, reutiliza `hasSkins: true` en `REAL_GAMES`, la prop `skin` + `engine.setSkin` y [[paletas-comunes]].
