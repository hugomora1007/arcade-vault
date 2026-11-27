# Juegos con temas (skins)

Mantenido por el subagente `skin-designer`. Última auditoría: pendiente (estado inicial 2026-11-26, sin sistema de skins).

| Juego        | CLÁSICO | NEÓN | RETRO | Contraste mín. (entidad / texto) | Notas                                              |
| ------------ | ------- | ---- | ----- | -------------------------------- | -------------------------------------------------- |
| `asteroides` | ❌      | ❌   | ❌    | —                                | Colores fijos en `entities.ts` / `engine.ts`.      |
| `tetris`     | ❌      | ❌   | ❌    | —                                | Colores fijos en `constants.ts` / `entities.ts`.   |
| `arkanoid`   | ❌      | ❌   | ❌    | —                                | Spritesheet; fondo fijo en `engine.ts`.            |
| `snake`      | ❌      | ❌   | ❌    | —                                | Tablero verde claro: falla la regla de fondo oscuro. |

Leyenda: ✅ implementado y validado · ⚠️ implementado pero falla una regla de modo oscuro · ❌ no existe.
