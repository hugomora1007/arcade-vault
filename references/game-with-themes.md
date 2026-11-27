# Juegos con temas (skins)

Mantenido por el subagente `skin-designer`. Última auditoría: 2026-11-26 (`asteroides`).

| Juego        | CLÁSICO | NEÓN | RETRO | Contraste mín. (entidad / texto) | Notas                                              |
| ------------ | ------- | ---- | ----- | -------------------------------- | -------------------------------------------------- |
| `asteroides` | ✅      | ✅   | ✅    | 16.75 / 16.75 (clásico) · 5.15 / 14.73 (neón) · 8.66 / 12.67 (retro) | Paleta en `lib/games/asteroids/skins.ts`; selector en el reproductor. |
| `tetris`     | ❌      | ❌   | ❌    | —                                | Colores fijos en `constants.ts` / `entities.ts`.   |
| `arkanoid`   | ✅      | ✅   | ✅    | 3.24 / — (clásico) · 5.15 / — (neón) · 4.52 / — (retro); sin texto en canvas | Auditado 2026-11-26. Paleta en `lib/games/arkanoid/skins.ts`. Spritesheet original recoloreado por bandas en un canvas fuera de pantalla (`buildSkinSheet`). Clásico: solo se aclara el ladrillo gris (`#323142` 1.65:1 → `#6a6982` 3.96:1). Retro: 4 brillos ámbar, vecinos ≥1.36:1. |
| `snake`      | ✅      | ✅   | ✅    | 3.36 / — (clásico) · 4.63 / — (neón) · 3.47 / — (retro); sin texto en canvas | Auditado 2026-11-26. Paleta en `lib/games/snake/skins.ts`. Clásico: damero oscurecido (`#182509`/`#1f2f0c`), el verde original pasa al disco de la fruta. Frutas con disco + anillo y `ctx.filter` en neón/retro. |

Leyenda: ✅ implementado y validado · ⚠️ implementado pero falla una regla de modo oscuro · ❌ no existe.
