# Plantilla de spec de juego (Arcade Vault)

Referencia que consulta `/game-spec`. **No se copia literal**: los marcadores `<...>` se rellenan con datos reales del juego y los bloques fijos se conservan adaptando nombres. Estructura y tono idénticos a `specs/05` y `specs/06`.

Convenciones de nombres: `<id>` = slug (`tetris`), `<Pascal>` = `Tetris`, `<Title>` = `TETRIS`.

---

````markdown
# SPEC NN — <Title> como juego real (`<id>`)

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06[, SPEC XX (registro de juegos reales)]
> **Date:** <fecha de `date +%F`>
> **Objective:** Portar/crear <juego> como motor TypeScript con canvas, montarlo en `/juegos/<id>/jugar`, añadirlo al catálogo y guardar sus puntuaciones en el leaderboard real.

---

## Por qué existe este spec

<2-4 líneas: qué juego es, de dónde sale (carpeta de referencia o desde cero), qué lo hace distinto de Asteroides (vidas, canvas, assets…) y que reutiliza el patrón de SPEC 05/06.>

---

## Scope

**In:**

- Motor en TypeScript `lib/games/<id>/{types,constants,entities,engine}.ts` <portado de `references/started-games/NN-nombre/game.js` sin cambiar la jugabilidad | diseñado desde cero con las mecánicas de este spec>: <entidades, constantes, reglas, puntuación, niveles>.
- Canvas lógico <W>×<H>, escalado por CSS dentro de `.crt-screen`; HUD interno eliminado (lo muestra la plataforma). Estética <original | neón>.
- Controles: <teclas>. <Solo teclado | táctil>.
- Componente cliente `components/games/<id>-canvas.tsx`.
- <Si el registro NO existe> Registro de juegos reales `lib/games/registry.ts` y refactor de `components/game-player.tsx` para resolver el motor por `game.id` (Asteroides pasa a ser la primera entrada). <Si existe> Nueva entrada `<id>` en `lib/games/registry.ts`.
- Migración `supabase/migrations/<timestamp>_add_game_<id>.sql` que inserta en `games`: `id: "<id>"`, `title: "<Title>"`, `cat: "<CAT>"`, `cover: "<clase>"`, `color: "<color>"`, `sort_order: <N>`, `short`/`long`. Aplicada con el MCP de Supabase y tipos regenerados. No se modifica el esquema de `scores`.
- «GUARDAR PUNTUACIÓN» llama a `saveScore` (ya genérica) para `<id>`; aparece en `/salon?juego=<id>` y en el leaderboard del detalle con `best`/`plays` reales.
- Listeners de teclado registrados al montar y eliminados al desmontar; sin scroll de página con las teclas del juego.

**Out of scope (para specs futuros):**

- Cambios al esquema de `scores`, Auth, `user_id`, anti-trampas, rate limiting.
- <Táctil / gamepad>, <sonido>, <portada propia>, <reskin>, <otros juegos>.
- Modificar o reemplazar entradas existentes de `games`.
- Tests automatizados (no hay runner configurado).

---

## Data model

Contrato del motor (mismo patrón que SPEC 05):

```ts
// lib/games/<id>/types.ts
export type <Pascal>Phase = "playing" | "gameover"; // añadir fases propias si aplica

export interface <Pascal>Snapshot {
  score: number;
  lives: number; // <qué significa en este juego | 0 si no aplica>
  level: number; // <qué significa en este juego>
  phase: <Pascal>Phase;
}

export interface <Pascal>Callbacks {
  /** Solo cuando cambia algún valor del snapshot. */
  onChange: (snapshot: <Pascal>Snapshot) => void;
  /** Una vez al terminar la partida. */
  onGameOver: (finalScore: number) => void;
}

export interface <Pascal>Engine {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void; // estado inicial y vuelve a `playing`
  end(): void; // botón FIN: dispara onGameOver con el score actual
  destroy(): void; // cancela requestAnimationFrame y elimina listeners
}

// lib/games/<id>/engine.ts
export function create<Pascal>Engine(
  canvas: HTMLCanvasElement,
  callbacks: <Pascal>Callbacks,
): <Pascal>Engine;
```

<Si el registro no existe> Contrato común para el registro:

```ts
// lib/games/registry.ts
export interface GameSnapshot {
  score: number;
  lives: number;
  level: number;
  phase: string;
}
export interface GameEngine {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  end(): void;
  destroy(): void;
}
export interface GameCanvasProps {
  onReady: (engine: GameEngine) => void;
  onChange: (snapshot: GameSnapshot) => void;
  onGameOver: (finalScore: number) => void;
}
export const REAL_GAMES: Record<
  string,
  { Canvas: ComponentType<GameCanvasProps>; initialSnapshot: GameSnapshot }
>;
```

Fila de catálogo (migración, valores literales, textos confirmados):

```sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values ('<id>', '<Title>', '<short>', '<long>', '<CAT>', '<cover>', '<color>', <N>);
```

Constantes del juego: <listar con valores exactos del original: tamaño, velocidades, puntos, vidas…>.

Convenciones (fijas):

- Sin estado global de módulo: todo vive en la closure de `create<Pascal>Engine` (Strict Mode no comparte estado).
- `onChange` no se emite por frame, solo ante cambios reales del snapshot.
- Las entidades reciben `ctx` en `draw`; sin `document.getElementById`.
- El motor ignora `keydown` cuyo `target` sea `input`, `textarea` o `select`, y hace `preventDefault` de las teclas del juego.
- Tras `gameover` el motor no se reinicia con teclas: lo hace la plataforma con `restart()`.
- `dt` limitado (<ms>) y la pausa detiene la acumulación de tiempo.
- La puntuación enviada es un entero entre 1 y 9 999 999; el ranking ordena por `score` desc y `created_at` asc.

---

## Implementation plan

Antes del paso 1: leer en `node_modules/next/dist/docs/` la guía de Client Components y, si se toca caché, `"use cache"`/`cacheComponents` (Next.js 16). Usar `/frontend-design` solo si hay UI nueva.

1. **Tipos y constantes.** `types.ts` y `constants.ts`. Verificación: `npx tsc --noEmit`.
2. **Entidades.** `entities.ts` tipadas, sin `any`, con `draw(ctx)`. Verificación: `npx tsc --noEmit`.
3. **Motor.** `engine.ts` con estado en closure, bucle `requestAnimationFrame`, listeners, API completa. Verificación: `npx tsc --noEmit`.
4. **Componente de canvas.** `components/games/<id>-canvas.tsx` (`"use client"`, callbacks en refs, `useEffect` crea el motor y `destroy()` en cleanup). Verificación: `npx tsc --noEmit`.
5. **Registro y reproductor.** <Crear `lib/games/registry.ts` y refactorizar `game-player.tsx` (sustituir `REAL_ASTEROIDS_ID`/`AsteroidsCanvas` por lookup; Asteroides primera entrada) | Añadir la entrada de `<id>` al registro>. Verificación: `/juegos/asteroides/jugar` se comporta igual y el nuevo id usa su motor; `/juegos/caida/jugar` sigue simulado.
6. **Migración del catálogo.** Crear y aplicar `..._add_game_<id>.sql` con `apply_migration`; el nombre del archivo debe coincidir con la versión que registre Supabase (`list_migrations`). Regenerar `lib/supabase/database.types.ts`. Verificación: `list_tables` muestra el juego, `get_advisors` (security) limpio, `/juegos/<id>` responde 200.
7. **Guardado y leaderboard.** Comprobar que `saveScore` persiste para `<id>` y que `/salon?juego=<id>` y `/juegos/<id>` muestran la fila; `Partidas` y `Mejor global` se actualizan. Verificación: jugar, guardar `AAA` y confirmar la fila con `execute_sql`.
8. **Limpieza y responsive.** Sin `document.getElementById`/globales en `lib/games/<id>/`; canvas escala a 375 px sin scroll horizontal. `npm run lint` y `npm run build`.

---

## Acceptance criteria

Comunes:

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos/<id>/jugar` muestra el canvas del juego sin HUD interno.
- [ ] Las teclas del juego funcionan y la página no hace scroll al pulsarlas.
- [ ] El HUD (Puntuación, Vidas, Nivel) refleja el estado real del motor.
- [ ] «PAUSA» detiene el juego y muestra «EN PAUSA»; «REANUDAR» continúa desde el mismo estado.
- [ ] «FIN» abre el modal con el score acumulado; al terminar la partida se abre «FIN DEL JUEGO» con la puntuación real.
- [ ] «JUGAR DE NUEVO» reinicia el juego al estado inicial.
- [ ] Escribir en el campo de iniciales (incluido un espacio) no dispara ni reinicia el juego.
- [ ] «SALIR» vuelve a `/juegos/<id>` y las teclas ya no producen errores ni movimiento (listeners eliminados).
- [ ] Con React Strict Mode solo hay un bucle de animación y un conjunto de listeners.
- [ ] Escribir `abc`, guardar y ver «PUNTUACIÓN GUARDADA_» crea una fila en `scores` con `game_id = '<id>'`, `player_name = 'ABC'` y el score real.
- [ ] Doble clic en «GUARDAR PUNTUACIÓN» crea una sola fila; con fallo de red se muestra error y se puede reintentar.
- [ ] `/salon?juego=<id>` y el detalle `/juegos/<id>` muestran la puntuación guardada al recargar; `Partidas` = `COUNT` y `Mejor global` = `MAX` de `scores`.
- [ ] El juego aparece en la home/biblioteca según su `sort_order` con los textos, portada y color definidos.
- [ ] Los demás juegos y `asteroides` mantienen su comportamiento y su ranking sin cambios.
- [ ] `list_migrations` muestra la migración; `get_advisors` (security) sin avisos nuevos.
- [ ] A 375 px `/juegos/<id>/jugar` no tiene scroll horizontal y el canvas conserva su proporción.
- [ ] Sin errores de hidratación en `/`, `/games`, `/salon`, `/juegos/<id>`, `/juegos/<id>/jugar`.
- [ ] `grep` de `document.getElementById`, `window.` (fuera de `engine.ts`), `SERVICE_ROLE` en `lib/games/<id>/`, `app/`, `components/` no devuelve resultados.

Específicos del juego (booleanos y verificables, derivados del código de referencia):

- [ ] <regla de puntuación concreta con valores>
- [ ] <regla de nivel/dificultad>
- [ ] <condición exacta de fin de partida>
- [ ] <mecánicas propias>

---

## Decisions

- **Sí:** <id> como slug y <Title> como título; juego nuevo añadido al final del catálogo por migración.
- **Sí:** motor con ciclo de vida y callbacks; HUD y modal en React (patrón SPEC 05).
- **Sí:** estado en closure y `onChange` solo ante cambios.
- **Sí:** guardado vía `saveScore` ya existente; sin cambios al esquema de `scores` (SPEC 06).
- **Sí:** registro de juegos reales en lugar de un `if (game.id === ...)` por juego.
- **No:** persistir puntuaciones fuera de Supabase, ni `localStorage` para récords.
- **No:** modificar entradas existentes de `games`.
- <Decisiones propias del juego: canvas, assets, sonido, estética, mapeo de vidas/nivel, con su porqué.>

---

## Risks

| Riesgo                                                            | Mitigación                                                                       |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Strict Mode deja bucles o listeners duplicados.                   | `destroy()` y criterio de aceptación específico.                                 |
| Eventos de teclado desde el input de iniciales.                   | El motor ignora `keydown` de campos de formulario.                               |
| `setState` por frame degrada el reproductor.                      | `onChange` solo ante cambios y callbacks en refs.                                |
| `requestAnimationFrame`/`window` rompen el render en servidor.    | El motor solo se crea en `useEffect`; componente `"use client"`.                 |
| Puntuaciones falsificadas desde el cliente / insert público.      | Aceptado (SPEC 06): CHECKs de la BD y tope 9 999 999; anti-trampas en otro spec. |
| Nombre de migración distinto a la versión registrada en Supabase. | Comprobar con `list_migrations` y renombrar el archivo.                          |
| <Riesgos propios: assets, canvas no 4:3, rendimiento…>            | <mitigación>                                                                     |

---

## What is **not** in this spec

- Cambios al esquema de `scores`, Auth, anti-trampas.
- <Lista explícita de lo diferido: táctil, sonido, otros juegos, reskin…>
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
````

---

## Notas para quien rellena la plantilla

- Los criterios de aceptación específicos salen del `game.js`/README de referencia, nunca de suposiciones.
- Si el juego no tiene vidas o niveles, el spec debe decir qué muestra el HUD (valor fijo, mapeo o campo oculto) y cómo se refleja en `game-player.tsx`.
- Si hay assets (imágenes, audio), el spec define dónde viven (`public/games/<id>/`) y cómo se cargan sin acceder a `window`/`Image` durante el render en servidor.
- Un canvas que no sea 4:3 requiere una decisión explícita de encaje dentro de `.crt-screen` (barras laterales, escala `contain`, etc.).
