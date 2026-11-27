# Juegos con temas (skins)

Mantenido por el subagente `skin-designer`. Última auditoría: 2026-11-26 (`asteroides`).

| Juego        | CLÁSICO | NEÓN | RETRO | Contraste mín. (entidad / texto) | Notas                                              |
| ------------ | ------- | ---- | ----- | -------------------------------- | -------------------------------------------------- |
| `asteroides` | ✅      | ✅   | ✅    | 16.75 / 16.75 (clásico) · 5.15 / 14.73 (neón) · 8.66 / 12.67 (retro) | Paleta en `lib/games/asteroids/skins.ts`; selector en el reproductor. |
| `tetris`     | ❌      | ❌   | ❌    | —                                | Colores fijos en `constants.ts` / `entities.ts`.   |
| `arkanoid`   | ❌      | ❌   | ❌    | —                                | Spritesheet; fondo fijo en `engine.ts`.            |
| `snake`      | ❌      | ❌   | ❌    | —                                | Tablero verde claro: falla la regla de fondo oscuro. |

Leyenda: ✅ implementado y validado · ⚠️ implementado pero falla una regla de modo oscuro · ❌ no existe.
