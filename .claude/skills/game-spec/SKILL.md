---
name: game-spec
description: Genera el spec para integrar un juego (de references/started-games o uno nuevo) en Arcade Vault con motor canvas, fila en `games` y leaderboard real. Solo escribe el spec; implementar con /spec-impl.
disable-model-invocation: true
argument-hint: "<carpeta en references/started-games | nombre o idea del juego>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*)
---

# /game-spec — Spec de un juego para Arcade Vault

## Session context

Fecha de hoy (úsala en la cabecera del spec, nunca la adivines):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

Juegos de referencia disponibles:
!`ls references/started-games 2>/dev/null | grep -v __MACOSX || echo "Sin carpeta references/started-games"`

¿Existe ya el registro de juegos reales?
!`ls lib/games/registry.ts 2>/dev/null || echo "NO: lib/games/registry.ts no existe"`

---

Esta skill produce **un único spec** que lleva un juego a la plataforma: motor TypeScript con canvas, fila en la tabla `games`, guardado de puntuaciones y leaderboard real. Se basa en el patrón ya implementado en `specs/05-asteroids-juego-real.md` y `specs/06-leaderboard-y-tabla-games.md`.

**No escribes código ni tocas la BD.** Tu trabajo termina cuando el `.md` está guardado; el usuario lo revisa, lo marca como aprobado y ejecuta `/spec-impl`.

Responde en el idioma del prompt (los specs del repo están en español).

## Fase 1 — Contexto

1. Lee `CLAUDE.md` y `AGENTS.md`.
2. Lee **completos** `specs/05-asteroids-juego-real.md` y `specs/06-leaderboard-y-tabla-games.md` (fuente del patrón) y el spec más reciente para copiar estados, encabezados y tono.
3. Lee `game-spec-template.md` (junto a este archivo): contiene los bloques fijos que todo spec de juego debe llevar.
4. Verifica el estado real del código antes de afirmar nada en el spec: `components/game-player.tsx`, `app/juegos/[id]/jugar/actions.ts`, `lib/db/games.ts`, `lib/games/` y `supabase/migrations/`. Calcula el siguiente `sort_order` libre con `list_tables`/`execute_sql` del MCP de Supabase si está disponible; si no, léelo de las migraciones.
5. Resuelve el origen del juego con `$ARGUMENTS`:
   - **Con referencia** (`02-asteroids`, `references/started-games/03-tetris`, etc.): lee su `CLAUDE.md`, `README.md`, `index.html`, `game.js` y, si existen, `levels.js`, `style.css` y `assets/`. Extrae: constantes, entidades, estado global, HUD pintado en DOM o canvas, controles, sonido y assets, cómo termina la partida, puntuación y niveles, tamaño del canvas.
   - **Sin referencia** (una idea o nombre): no hay código que portar. Pide mecánica, controles, condición de derrota y puntuación; el spec incluirá diseñar el motor desde cero.
   - Si el juego ya está en `GAMES`/tabla `games` o ya tiene motor, avisa y pregunta si se trata de una revisión; no dupliques.
   - Si `$ARGUMENTS` está vacío, lista las carpetas de `references/started-games` y pregunta cuál (u otra idea).

Si el juego no cabe en una frase de objetivo, propón dividirlo en varios specs.

## Fase 2 — Preguntas

Bloques de 3 a 5 con `AskUserQuestion`, recomendación primero. No preguntes lo que ya puedas leer del código. Cubre siempre:

1. **Identidad:** `id` (slug minúsculas, `^[a-z0-9-]+$`), `title`, `cat` (`ARCADE`/`PUZZLE`/`SHOOTER`/`VERSUS`), `color` (`cyan`/`magenta`/`green`/`yellow`), `cover` (reutilizar una clase de `app/globals.css` o portada nueva), textos `short`/`long` (propón unos desde el README y deja que confirme).
2. **HUD de la plataforma:** el reproductor muestra Puntuación, Vidas y Nivel. ¿Qué significan en este juego? (p. ej. Tetris no tiene vidas: ¿líneas?, ¿se oculta?). Define el `Snapshot` y su mapeo.
3. **Controles:** solo teclado (como los demás) o también táctil; qué teclas bloquean scroll.
4. **Assets y sonido:** si el original usa spritesheet o audio (Arkanoid), ¿se mueven a `public/games/<id>/` y se usan, o el sonido queda fuera de alcance?
5. **Canvas y estética:** tamaño lógico (el `.crt-screen` es 4:3; un canvas 300×600 necesita decisión de encaje), conservar la estética original vs. reskin neón.
6. **Fin de partida:** qué dispara `onGameOver` y qué puntuación entra al ranking (siempre entero entre 1 y 9 999 999).
7. **Fuera de alcance:** confirma qué queda para otros specs.

Para si puedes responder sin suponer: qué archivos aparecen o cambian, cuál es el primer y el último paso, y cómo se verifica.

## Fase 3 — Redactar

Sigue `game-spec-template.md`. Si Fase 2 está completa, escribe el spec entero sin pedir confirmación por sección. Reglas:

- Rellena todos los marcadores `<...>` con datos reales del juego; no dejes ninguno sin resolver.
- Los bloques «fijos» de la plantilla se conservan, adaptando solo nombres. No los resumas.
- Si `lib/games/registry.ts` **no existe**, incluye el paso de crear el registro y refactorizar `components/game-player.tsx` (Asteroides pasa a ser la primera entrada). Si **existe**, incluye solo «añadir una entrada al registro».
- Las reglas específicas del juego (mecánicas, puntuación, niveles) van como criterios de aceptación booleanos y verificables, derivados del código de referencia.
- `Depends on`: SPEC 05, SPEC 06 y el spec que haya creado el registro, si ya existe. Verifica que cada uno existe en `specs/`.

## Fase 4 — Guardar

1. Número = mayor existente + 1, con dos dígitos. Slug kebab-case, p. ej. `tetris-juego-real`.
2. Escribe `specs/NN-slug.md` directamente, sin pedir permiso. Solo pregunta si el archivo ya existe.
3. Estado `Borrador` (o el equivalente usado en los specs existentes). Nunca `Aprobado`.
4. Si falta `specs/.spec-config.yml`, créalo con `AutoCreateBranch: true` y el comentario estándar de `/spec`; si existe, no lo toques.
5. Confirma: ruta del archivo, estado `Borrador`, que debe marcarlo como aprobado tras releerlo y que el siguiente paso es `/spec-impl NN-slug`. **Detente ahí.**

## Reglas duras

- Nunca escribas código fuente, migraciones ni cambies la BD; solo el `.md` del spec.
- Nunca propongas implementar tras guardar.
- No asumas decisiones que el usuario no confirmó; pregunta en Fase 2.
- No inventes datos del juego: todo sale del código de referencia o de las respuestas.
- No modifiques ni reemplaces entradas existentes de `games`; los juegos nuevos se añaden por migración con el siguiente `sort_order`.
- Si el usuario salta las preguntas, avísale del coste y, si insiste, anótalo en Decisiones («Definición rápida sin aclaraciones detalladas»).
