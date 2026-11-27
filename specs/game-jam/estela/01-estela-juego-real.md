# ESTELA como juego real (`estela`)

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07 (registro de juegos reales)
> **Date:** 2026-11-25
> **Objective:** Crear ESTELA, un duelo de motos de luz contra rivales CPU en una rejilla de 40×30, como motor TypeScript con canvas diseñado desde cero, montarlo en `/juegos/estela/jugar`, añadirlo al catálogo por migración y guardar sus puntuaciones en el leaderboard real.

---

## Por qué existe este spec

ESTELA nace de la game jam con el tema «ESTELA — motos de luz que dejan un muro de neón», a partir de la sugerencia ⭐ de `game-planner` en `references/game-suggestions-todo.md`. Es el quinto juego real de la plataforma y el **primero de la categoría VERSUS** (hoy los reales son SHOOTER, PUZZLE y dos ARCADE). Se diseña desde cero: no hay código ni assets de referencia en `references/started-games/` ni en `references/source-assets/` (solo hay frutas de Snake, que no aplican). Todo se dibuja con formas del canvas.

Toma de SNAKE (SPEC 09) la idea de rejilla, movimiento por pasos con acumulador de tiempo y cola de 2 direcciones, pero cambia el juego en tres puntos: hay **rivales CPU** que se mueven a la vez que el jugador, la estela **no se acorta nunca** (es un muro permanente durante la ronda) y la partida se divide en **rondas con 3 motos**. Reutiliza el motor con ciclo de vida del SPEC 05, el guardado/leaderboard del SPEC 06 y el registro `lib/games/registry.ts` del SPEC 07. El código de `lib/games/snake/` sirve de modelo, pero no se importa: cada juego tiene su propia carpeta.

Ya existe el mock `duelo-pixel` (VERSUS, `cover-duelo`, cyan, `sort_order` 8), un duelo de paletas. Es un juego distinto del catálogo y no se toca; ESTELA comparte su portada de forma provisional (la propia llega en el spec 03 de este paquete).

---

## Scope

**In:**

- Motor en TypeScript `lib/games/estela/{types,constants,entities,ai,engine}.ts` diseñado desde cero con las mecánicas de este spec: rejilla de 40×30 casillas, moto del jugador y de 1 a 3 rivales CPU que avanzan una casilla por paso de forma simultánea, estela permanente, colisiones con el borde, con cualquier estela y entre cabezas, rondas, 3 motos (vidas), sectores (niveles) con más rivales y más velocidad, y puntuación por supervivencia, eliminación, encierro y ronda ganada.
- IA de rivales en `ai.ts`: elige entre seguir recto, girar a la izquierda o a la derecha según el espacio libre alcanzable (flood-fill acotado), con una probabilidad de error que baja por sector.
- Canvas lógico 800×600 (4:3 exacto), escalado por CSS dentro de `.crt-screen`. Estética neón plana: fondo casi negro, rejilla tenue, estelas de color sólido. Sin HUD interno de puntuación, vidas ni nivel (lo muestra la plataforma); solo dos mensajes de ronda dibujados en el canvas («PULSA UNA DIRECCIÓN» y el resultado de la ronda).
- Controles: solo teclado. `←` `↑` `→` `↓` y `W` `A` `S` `D`. Sin táctil, ratón ni gamepad.
- Sin assets: no hay imágenes ni audio; no se crea ninguna `Image` ni `Audio`.
- Componente cliente `components/games/estela-canvas.tsx`.
- Nueva entrada `estela` en `lib/games/registry.ts` (`REAL_GAMES`), junto a `asteroides`, `tetris`, `arkanoid` y `snake`.
- Migración `supabase/migrations/20261125213500_add_game_estela.sql` que inserta en `games`: `id: "estela"`, `title: "ESTELA"`, `cat: "VERSUS"`, `cover: "cover-duelo"`, `color: "cyan"`, `sort_order: 13`, `short`/`long` (ver Data model). Aplicada con el MCP de Supabase y tipos regenerados. No se modifica el esquema de `scores`.
- «GUARDAR PUNTUACIÓN» llama a `saveScore` (ya genérica) para `estela`; aparece en `/salon?juego=estela` y en el leaderboard del detalle con `best`/`plays` reales.
- Listeners de teclado registrados al montar y eliminados al desmontar; sin scroll de página con las teclas del juego.

**Out of scope (para specs futuros):**

- Cambios al esquema de `scores`, Auth, `user_id`, anti-trampas, rate limiting.
- Turbo, chispas recogibles, rivales con personalidad distinta, sectores con obstáculos y bonus de eliminación múltiple: van en `02-estela-sectores-y-turbo.md`.
- Portada propia `cover-estela`, brillo neón (`shadowBlur`), partículas de choque y sonido con silenciar: van en `03-estela-neon-y-sonido.md`.
- Controles táctiles (swipe), ratón y gamepad.
- Modo de dos jugadores en el mismo teclado (el ranking es individual).
- Modificar o reemplazar entradas existentes de `games` (incluida `duelo-pixel`).
- Cambios en la home.
- Tests automatizados (no hay runner configurado).

---

## Data model

Contrato del motor (mismo patrón que SPEC 05, 07, 08 y 09):

```ts
// lib/games/estela/types.ts
export type EstelaPhase = "ready" | "playing" | "roundover" | "gameover";

export interface EstelaSnapshot {
  score: number; // supervivencia + eliminaciones + encierros + rondas ganadas
  lives: number; // motos restantes: 3 al empezar, 0 al perder la última
  level: number; // sector actual: 1 + rondas ganadas; fija rivales y velocidad
  phase: EstelaPhase;
}

export interface EstelaCallbacks {
  /** Solo cuando cambia algún valor del snapshot. */
  onChange: (snapshot: EstelaSnapshot) => void;
  /** Una vez al terminar la partida (última moto perdida o botón FIN). */
  onGameOver: (finalScore: number) => void;
}

export interface EstelaEngine {
  start(): void; // dibuja la primera ronda en `ready` y arranca el bucle
  pause(): void;
  resume(): void;
  restart(): void; // score=0, lives=3, level=1, ronda nueva en `ready`
  end(): void; // botón FIN: dispara onGameOver con el score actual
  destroy(): void; // cancela requestAnimationFrame y elimina listeners
}

// lib/games/estela/engine.ts
export function createEstelaEngine(
  canvas: HTMLCanvasElement,
  callbacks: EstelaCallbacks,
): EstelaEngine;
```

Tipos internos (no salen del motor):

```ts
// lib/games/estela/types.ts
export type Direction = "up" | "down" | "left" | "right";
export interface Cell {
  col: number;
  row: number;
}
export interface Bike {
  id: number; // 1 = jugador, 2..4 = rivales
  head: Cell;
  dir: Direction;
  alive: boolean;
  color: string;
}
/** Ocupación de la rejilla: 0 = libre, 1..4 = id de la moto dueña de la estela. */
export type Grid = Uint8Array; // longitud COLS * ROWS, índice row * COLS + col
```

Entrada del registro (sin cambios en el contrato común del SPEC 07):

```ts
// lib/games/registry.ts
estela: {
  Canvas: EstelaCanvas,
  initialSnapshot: { score: 0, lives: 3, level: 1, phase: "ready" },
},
```

Fila de catálogo (migración, valores literales). `sort_order = 13` es el siguiente libre: las migraciones de `supabase/migrations/` llegan hasta `sort_order` 12 (`snake`, `20261125014531_add_game_snake.sql`), comprobado leyendo `supabase/migrations/`; puede cambiar si se implementa otro juego antes. Los textos `short`/`long` son una **propuesta** de este spec, pendiente de confirmar al revisarlo:

```sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'estela',
  'ESTELA',
  'Deja un muro de neón y encierra a las motos rivales.',
  'Conduce una moto de luz por una rejilla de 40×30 que deja un muro de neón a su paso; chocar con el borde o con cualquier estela te cuesta una de tus 3 motos. Sé la última moto en pie para ganar la ronda y subir de sector, con más rivales y más velocidad. Si un rival se estrella contra tu estela lo has encerrado y vale 250 puntos por sector en lugar de 100.',
  'VERSUS',
  'cover-duelo',
  'cyan',
  13
);
```

Constantes del juego (diseño de este spec, no hay original):

- Canvas lógico `W = 800`, `H = 600`; `CELL = 20`; `COLS = 40`, `ROWS = 30` (1 200 casillas). El borde de la rejilla es el borde del canvas.
- Motos: `PLAYER_ID = 1`; rivales `2`, `3`, `4`.
- Posiciones y direcciones iniciales (la casilla inicial ya forma parte de la estela):

  | Moto    | `id` | Casilla inicial | Dirección | Color     | Aparece desde |
  | ------- | ---- | --------------- | --------- | --------- | ------------- |
  | Jugador | 1    | `(6, 15)`       | derecha   | `#00f5ff` | sector 1      |
  | Rival 1 | 2    | `(33, 14)`      | izquierda | `#ff006e` | sector 1      |
  | Rival 2 | 3    | `(20, 4)`       | abajo     | `#f5ff00` | sector 2      |
  | Rival 3 | 4    | `(19, 25)`      | arriba    | `#00ff88` | sector 3      |

- Rivales por sector: `rivalCount(level) = min(3, level)` → 1 en el sector 1, 2 en el 2, 3 desde el 3.
- Intervalo entre pasos: `tickMs(level) = max(60, 110 - (level - 1) * 5)` → 110 ms en el sector 1, 105 ms en el 2, 60 ms desde el sector 11. Todas las motos avanzan en el mismo paso.
- Error de la IA: `aiErrorChance(level) = max(0.02, 0.12 - (level - 1) * 0.02)` → 0,12 en el sector 1, 0,10 en el 2, 0,02 desde el sector 6.
- Flood-fill de la IA: `FLOOD_CAP = 300` casillas como máximo por opción evaluada.
- Vidas (motos): `INITIAL_LIVES = 3`.
- Puntos (todos enteros):
  - `SURVIVE_POINTS = 1` por cada paso de la fase `playing` en el que el jugador sigue vivo tras resolverlo.
  - `KILL_POINTS = 100` × sector por cada rival que choca con el borde, con su propia estela, con la de otro rival o con otra cabeza, siempre que el jugador siga vivo tras ese paso.
  - `TRAP_POINTS = 250` × sector (encierro) en lugar de `KILL_POINTS` si la casilla contra la que choca el rival pertenece a la estela del jugador (`grid = 1`).
  - `ROUND_POINTS = 500` × sector al ganar la ronda (el jugador vivo y ningún rival vivo).
  - `MAX_SCORE = 9 999 999`: la puntuación se limita con `min(score, MAX_SCORE)`. No hay máximo teórico por debajo de ese tope: el juego no tiene victoria final.
- Pausas de ronda: `ROUNDOVER_MS = 1500` (fase `roundover`, se mantiene la imagen del final de la ronda con su mensaje).
- Colores: fondo `#05050f`; líneas de rejilla `#12142a` de 1 px cada 20 px; estela de cada moto con su color a `globalAlpha = 0.55`; cabeza con su color a opacidad 1 y un cuadrado interior `#e6e9ff` de 8×8 centrado; estela de una moto eliminada a `globalAlpha = 0.2`; casilla del choque con una «X» `#e6e9ff` de 2 px durante `roundover`.
- Mensajes en el canvas (centrados, `bold 24px monospace`, `#e6e9ff`): en `ready`, «PULSA UNA DIRECCIÓN»; en `roundover` tras ganar, `SECTOR SUPERADO +` seguido de `500 × sector` (p. ej. «SECTOR SUPERADO +500» en el sector 1); en `roundover` tras perder una moto, «MOTO PERDIDA».
- `dt` limitado a 50 ms (como los demás motores). Como `tickMs ≥ 60 ms`, nunca se procesa más de un paso por frame.

Reglas del paso (se resuelve todo a la vez, en este orden):

1. El jugador consume una dirección de su cola (si la hay); cada rival vivo elige su dirección con la IA **mirando la rejilla antes del paso**.
2. Se calcula la casilla siguiente de cada moto viva.
3. Una moto choca si su casilla siguiente está fuera de `0..39` × `0..29`, si está ocupada en la rejilla (cualquier estela, incluidas las cabezas actuales) o si otra moto viva va a la misma casilla en ese paso (choque frontal: chocan las dos).
4. Las motos que no chocan marcan la casilla siguiente con su `id` y avanzan. Las que chocan pasan a `alive = false` y su estela se queda en la rejilla hasta el final de la ronda.
5. Si el jugador ha chocado: `lives -= 1`; no se suman puntos de ese paso. Con `lives > 0` la fase pasa a `roundover` («MOTO PERDIDA»); con `lives = 0` la fase pasa a `gameover` y se emite `onGameOver`.
6. Si el jugador sigue vivo: `+SURVIVE_POINTS`, y por cada rival que ha chocado en ese paso `+TRAP_POINTS × sector` o `+KILL_POINTS × sector`. Si ya no queda ningún rival vivo: `+ROUND_POINTS × sector`, `level += 1` y la fase pasa a `roundover` («SECTOR SUPERADO»).
7. Al terminar `ROUNDOVER_MS` empieza una ronda nueva en `ready` con el sector vigente: rejilla vacía, motos en sus casillas iniciales, cola de direcciones vacía.

IA de los rivales (`ai.ts`, función pura `chooseDirection(grid, bike, level, random)`):

- Opciones: seguir recto, girar a la izquierda o girar a la derecha (nunca 180°). Una opción es segura si su casilla siguiente está dentro de la rejilla y libre.
- Para cada opción segura se cuenta el área alcanzable con un flood-fill (BFS en 4 direcciones) desde la casilla siguiente, parando en `FLOOD_CAP` casillas.
- Con probabilidad `aiErrorChance(level)` el rival elige una opción segura al azar; si no, elige la de mayor área y, en empate, prefiere seguir recto y después el giro con menor índice en el orden izquierda, derecha.
- Si no hay ninguna opción segura, sigue recto (y choca).
- `random` se inyecta (`() => number`) para poder reproducir decisiones; el motor pasa `Math.random`.

Convenciones:

- Sin estado global de módulo: todo vive en la closure de `createEstelaEngine` (Strict Mode no comparte estado). La rejilla es un `Uint8Array` creado en `initRound()`.
- `onChange` no se emite por frame, solo ante cambios reales del snapshot (`score`, `lives`, `level` o `phase`). Durante `playing` el score cambia en cada paso (≥ 60 ms), nunca más de una vez por frame.
- Las funciones de dibujo de `entities.ts` reciben `ctx` y el estado como parámetros; sin `document.getElementById`.
- El motor lee `event.code` (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD`), ignora `keydown` cuyo `target` sea `input`, `textarea` o `select` y también las combinaciones con `Ctrl`, `Alt` o `Meta` (para no bloquear `Ctrl+W`, `Cmd+A`…). Hace `preventDefault` de las teclas de juego mientras la partida no está en `gameover` ni en pausa.
- No hay estado de «tecla mantenida»: solo la cola de direcciones, de **máximo 2** entradas. Cada pulsación se compara con la última dirección encolada (o con la actual si la cola está vacía) y se descarta si es igual o la contraria. Se consume una dirección por paso. La cola se vacía en `restart()`, al empezar cada ronda y al perder el foco de la ventana (`blur`), para que una pulsación hecha fuera del juego no gire la moto al volver.
- Fase `ready`: ninguna moto se mueve y el acumulador de tiempo no corre. La primera pulsación de una tecla de juego que no sea la contraria a la dirección inicial (`←`/`A`) pasa a `playing`; si es perpendicular (`↑`/`↓`/`W`/`S`), además se encola. La pulsación contraria se descarta.
- Movimiento por pasos con acumulador de tiempo: cada `tickMs(level)` se resuelve un paso. La pausa detiene la acumulación (también la de `ROUNDOVER_MS`); al reanudar se reinicia la referencia de tiempo para que `dt` no incluya el tiempo en pausa.
- Tras `gameover` el motor no se reinicia con teclas: lo hace la plataforma con `restart()`.
- `end()` (botón FIN) emite `onGameOver` con el score actual, pasa a `gameover` y no vuelve a emitirlo si la partida ya había terminado.
- La puntuación enviada es un entero entre 1 y 9 999 999; el ranking ordena por `score` desc y `created_at` asc.
- Los nombres, rutas y el timestamp de la migración son propuesta de este spec; pueden ajustarse al implementar si Next.js lo requiere.

---

## Implementation plan

Antes del paso 1: leer en `node_modules/next/dist/docs/` la guía de Client Components y, para el paso 6, la de `generateStaticParams`/`cacheComponents` (Next.js 16). El diseño de la plataforma no cambia (se reutilizan `.crt`, `.crt-screen`, `.player-hud` y `.modal`), por lo que no se invoca `/frontend-design`: no hay UI nueva de plataforma; el aspecto del canvas queda definido en las constantes de este spec.

1. **Tipos y constantes.** Crear `lib/games/estela/types.ts` y `constants.ts` con lo del Data model (incluidas la tabla de motos iniciales, `rivalCount`, `tickMs`, `aiErrorChance`, puntos y colores). Verificación: `npx tsc --noEmit` sin errores; `tickMs(1) === 110`, `tickMs(11) === 60`, `rivalCount(5) === 3`.
2. **Entidades e IA.** Crear `lib/games/estela/entities.ts` tipado y sin `any` (`createGrid`, `cellIndex`, `nextCell`, `isOpposite`, `resolveStep` puro que aplica las reglas del paso y devuelve qué motos chocan y contra qué dueño, y funciones de dibujo `drawGrid`, `drawTrails`, `drawCrash`, `drawMessage` que reciben `ctx`) y `lib/games/estela/ai.ts` con `floodArea` y `chooseDirection`. Verificación: `npx tsc --noEmit` sin errores.
3. **Motor.** Crear `lib/games/estela/engine.ts` con `createEstelaEngine`: estado en closure, `initRound`, cola de direcciones, fases `ready`/`playing`/`roundover`/`gameover`, `step` que llama a `resolveStep` y aplica la puntuación, bucle con `requestAnimationFrame` y acumulador, listeners `keydown` y `blur` en `window`, `preventDefault` en las teclas de juego y la API `start/pause/resume/restart/end/destroy`. Verificación: `npx tsc --noEmit` sin errores.
4. **Componente de canvas.** No hay assets que copiar a `public/`. Crear `components/games/estela-canvas.tsx` (`"use client"`): `<canvas width={800} height={600}>` con `width: 100%; height: 100%`, `useEffect` que crea el motor, llama `start()` y devuelve `destroy()` en el cleanup, callbacks en refs, tipado contra `GameCanvasProps`. Verificación: `npx tsc --noEmit` sin errores y el canvas muestra la rejilla y las dos motos del sector 1 en `ready`.
5. **Registro.** Añadir la entrada `estela` a `REAL_GAMES` en `lib/games/registry.ts`. `components/game-player.tsx` no necesita cambios (ya resuelve por registro y no depende del valor de `phase`). Verificación: `/juegos/asteroides/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` se comportan igual y `/juegos/duelo-pixel/jugar` sigue simulado.
6. **Migración del catálogo.** Crear `supabase/migrations/20261125213500_add_game_estela.sql` y aplicarla con `apply_migration`; el nombre del archivo debe coincidir con la versión que registre Supabase (`list_migrations`). Regenerar `lib/supabase/database.types.ts`. Verificación: `list_tables`/`execute_sql` muestran `estela` con `sort_order = 13` y `cat = 'VERSUS'`, `get_advisors` (security) limpio y `/juegos/estela` responde 200.
7. **Guardado y leaderboard.** Comprobar que `saveScore` persiste para `estela` y que `/salon?juego=estela` y `/juegos/estela` muestran la fila; `Partidas` y `Mejor global` se actualizan. Verificación: jugar, guardar `AAA` y confirmar la fila con `execute_sql`.
8. **Limpieza y responsive.** Sin `document.getElementById`, `Image`, `Audio` ni globales de módulo en `lib/games/estela/`; el canvas escala a 375 px sin scroll horizontal. Ejecutar `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores.

---

## Acceptance criteria

Comunes:

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos/estela/jugar` muestra el canvas del juego sin HUD interno de puntuación, vidas ni sector.
- [ ] Las teclas del juego (`←` `↑` `→` `↓`, `W` `A` `S` `D`) funcionan y la página no hace scroll al pulsarlas.
- [ ] El HUD (Puntuación, Vidas, Nivel) refleja el estado real del motor.
- [ ] «PAUSA» detiene el juego y muestra «EN PAUSA»; «REANUDAR» continúa desde el mismo estado.
- [ ] «FIN» abre el modal con el score acumulado; al terminar la partida se abre «FIN DEL JUEGO» con la puntuación real.
- [ ] «JUGAR DE NUEVO» reinicia el juego al estado inicial.
- [ ] Escribir en el campo de iniciales (incluido un espacio y las letras `W`, `A`, `S`, `D`) no mueve ni reinicia el juego.
- [ ] «SALIR» vuelve a `/juegos/estela` y las teclas ya no producen errores ni movimiento (listeners eliminados).
- [ ] Con React Strict Mode solo hay un bucle de animación y un conjunto de listeners.
- [ ] Escribir `abc`, guardar y ver «PUNTUACIÓN GUARDADA_» crea una fila en `scores` con `game_id = 'estela'`, `player_name = 'ABC'` y el score real.
- [ ] Doble clic en «GUARDAR PUNTUACIÓN» crea una sola fila; con fallo de red se muestra error y se puede reintentar.
- [ ] `/salon?juego=estela` y el detalle `/juegos/estela` muestran la puntuación guardada al recargar; `Partidas` = `COUNT` y `Mejor global` = `MAX` de `scores`.
- [ ] `estela` aparece en `/games` con su título, portada (`cover-duelo`) y color (`cyan`), y en el filtro de categoría VERSUS junto a `duelo-pixel`; no aparece en la home, que muestra solo los 6 primeros por `sort_order`.
- [ ] `asteroides`, `tetris`, `arkanoid` y `snake` mantienen su comportamiento y su ranking sin cambios; `/juegos/duelo-pixel/jugar`, `/juegos/serpentina/jugar` y `/juegos/caida/jugar` siguen con la simulación actual.
- [ ] `list_migrations` muestra la migración; `get_advisors` (security) sin avisos nuevos.
- [ ] A 375 px `/juegos/estela/jugar` no tiene scroll horizontal y el canvas conserva la proporción 4:3.
- [ ] Sin errores de hidratación en `/`, `/games`, `/salon`, `/juegos/estela`, `/juegos/estela/jugar`.
- [ ] `grep` de `document.getElementById`, `window.` (fuera de `engine.ts`), `SERVICE_ROLE` en `lib/games/estela/`, `app/`, `components/` no devuelve resultados.
- [ ] La fila `duelo-pixel` de `games` no tiene cambios (misma `id`, `title`, `short`, `long`, `cat`, `cover`, `color`, `sort_order`).

Específicos del juego (diseño de este spec, sin código de referencia):

- [ ] El canvas lógico es 800×600 con fondo `#05050f` y una rejilla de 40×30 casillas de 20 px con líneas `#12142a`.
- [ ] Al empezar, la fase es `ready`: se ven la moto del jugador (cyan, `(6, 15)`, mirando a la derecha) y un solo rival (magenta, `(33, 14)`, mirando a la izquierda), el mensaje «PULSA UNA DIRECCIÓN», y el HUD muestra Puntuación 0, Vidas «♥ ♥ ♥» y Nivel 01.
- [ ] En `ready` ninguna moto se mueve aunque pasen 10 s; la primera pulsación de `→`, `↑`, `↓` (o `D`, `W`, `S`) empieza la ronda y todas las motos avanzan una casilla cada 110 ms en el sector 1.
- [ ] Pulsar `←` o `A` como primera tecla en `ready` no empieza la ronda ni gira la moto.
- [ ] Las flechas y `W A S D` giran la moto; un giro de 180° se ignora y no provoca un choque; dos pulsaciones rápidas dentro del mismo paso se ejecutan en pasos consecutivos, nunca más de 2 en cola.
- [ ] Cada casilla por la que pasa una moto queda pintada con su color y bloquea el paso a todas las motos hasta el final de la ronda.
- [ ] Mientras el jugador sigue vivo, la puntuación sube 1 por cada paso (≈ 9 puntos por segundo en el sector 1).
- [ ] Si el rival choca con el borde, con su propia estela o con otra cabeza y el jugador sigue vivo, la puntuación sube 100 × sector (100 en el sector 1).
- [ ] Si el rival choca contra la estela del jugador, la puntuación sube 250 × sector (250 en el sector 1) en lugar de 100.
- [ ] Al eliminar al último rival vivo con el jugador vivo, la puntuación sube además 500 × sector, aparece «SECTOR SUPERADO +500» (sector 1) durante 1,5 s y empieza la ronda del sector 2 en `ready`, con la rejilla vacía y 2 rivales (magenta y amarillo); el HUD muestra Nivel 02 y conserva puntuación y vidas.
- [ ] En el sector 2 el intervalo entre pasos es 105 ms; desde el sector 3 hay 3 rivales (magenta, amarillo y verde); el intervalo nunca baja de 60 ms (sector 11 en adelante).
- [ ] Si el jugador sale de la rejilla por cualquiera de los 4 lados o entra en una casilla ocupada (su propia estela incluida), pierde una moto: el HUD muestra una vida menos, aparece «MOTO PERDIDA» y una «X» en la casilla del choque durante 1,5 s, y la ronda se repite en el mismo sector con la rejilla vacía, sin sumar puntos de ese paso.
- [ ] Si el jugador y un rival entran en la misma casilla en el mismo paso, chocan los dos: el jugador pierde una moto y no se suman puntos por ese rival.
- [ ] Al perder la tercera moto, `lives` pasa a 0 y el HUD muestra «—», la fase pasa a `gameover`, se emite `onGameOver` una sola vez con el score final, se abre «FIN DEL JUEGO» y las teclas no producen movimiento.
- [ ] Un rival con al menos una opción segura nunca elige una casilla ocupada o fuera de la rejilla salvo por la probabilidad de error del sector (12 % en el sector 1), y cuando yerra elige igualmente una opción segura.
- [ ] En el sector 1, con el jugador girando en círculos sin acercarse al rival, el rival termina chocando por sí solo en la mayoría de las rondas de menos de 60 s (la IA no es invencible).
- [ ] La estela de un rival eliminado se atenúa (opacidad 0,2) pero sigue bloqueando hasta el final de la ronda.
- [ ] Pausar en `playing` con una dirección en cola y reanudar mantiene la dirección y ninguna moto avanza más de un paso de golpe (`dt ≤ 50 ms`); pausar en `roundover` alarga el mensaje hasta reanudar.
- [ ] Cambiar de pestaña y volver no gira la moto con pulsaciones previas (cola vaciada en `blur`).
- [ ] Si la partida termina con 0 puntos (p. ej. FIN en `ready` de la primera ronda), el modal muestra 0 y «GUARDAR PUNTUACIÓN» muestra el error de puntuación mínima sin crear fila.
- [ ] `Ctrl+W` y `Ctrl+A` no son interceptadas por el juego.
- [ ] No se descarga ninguna imagen ni audio en `/juegos/estela/jugar` y la página se renderiza en servidor sin acceder a `Image`, `Audio` ni `window`.

---

## Decisions

- **Sí:** `estela` como slug y ESTELA como título, categoría VERSUS, color `cyan` y `cover-duelo` (datos de la sugerencia de `game-planner` aceptados por el usuario al lanzar la jam); juego nuevo añadido al final del catálogo por migración con `sort_order = 13`, el siguiente libre.
- **Sí:** convive con el mock `duelo-pixel`, que no se modifica ni se reemplaza; comparten categoría y portada provisional, pero son juegos distintos.
- **Sí:** motor con ciclo de vida y callbacks; HUD y modal en React (patrón SPEC 05).
- **Sí:** estado en closure y `onChange` solo ante cambios.
- **Sí:** guardado vía `saveScore` ya existente; sin cambios al esquema de `scores` (SPEC 06).
- **Sí:** entrada en el registro de juegos reales en lugar de un `if (game.id === ...)`.
- **No:** persistir puntuaciones fuera de Supabase, ni `localStorage` para récords.
- **No:** modificar entradas existentes de `games`.
- **Sí:** diseño original del género «motos de luz» contra CPU, sin nombres, personajes, arte ni niveles de ninguna franquicia (restricción de la jam).
- **Sí:** HUD con Vidas = motos restantes (3 → 0) y Nivel = sector (`1 + rondas ganadas`). Se mapea directo a `GameSnapshot`, `game-player.tsx` ya pinta «♥» y «—» y no hay flags por juego (decisión del agente, pendiente de revisar).
- **Sí:** 3 motos y no 1 como Snake: las rondas son cortas (10–30 s) y una sola vida haría que un choque frontal desafortunado en el sector 1 terminase la partida (decisión del agente, pendiente de revisar).
- **Sí:** rejilla 40×30 de 20 px. Da 800×600 exacto (4:3 sin barras), casillas legibles a 375 px y rondas cortas con 4 motos (unas 40 casillas/s ocupadas) (decisión del agente, pendiente de revisar).
- **Sí:** puntuación 1 por paso + 100/250 × sector por eliminación/encierro + 500 × sector por ronda. El encierro vale 2,5 veces más porque es la mecánica del tema; multiplicar por sector premia avanzar frente a alargar rondas (decisión del agente, pendiente de revisar).
- **Sí:** sin victoria final ni máximo teórico; partida infinita por sectores con tope `MAX_SCORE = 9 999 999`. Desde el sector 11 la dificultad deja de crecer en velocidad y desde el 6 en error de la IA, y la puntuación por ronda sigue creciendo con el sector (decisión del agente, pendiente de revisar).
- **No:** puntos por eliminaciones en el paso en que el jugador también choca; un choque frontal no puede dar puntos (decisión del agente, pendiente de revisar).
- **Sí:** la ronda espera la primera pulsación en `ready`, como Snake. Evita perder una moto antes de poner el foco en el juego (decisión del agente, pendiente de revisar).
- **Sí:** la estela de un rival eliminado se queda (atenuada) hasta el final de la ronda: mantiene la regla «el muro es permanente» y simplifica la rejilla. Borrarla queda descartado en este paquete (decisión del agente, pendiente de revisar).
- **Sí:** IA por flood-fill acotado a 300 casillas con probabilidad de error por sector. Es barata (≤ 3 rivales × 3 opciones × 300 casillas por paso) y su dificultad se gradúa con un solo número; las personalidades distintas van en el spec 02 (decisión del agente, pendiente de revisar).
- **Sí:** solo teclado con flechas y `W A S D` por `event.code`, ignorando `Ctrl`/`Alt`/`Meta`, como Snake.
- **No:** modo de dos jugadores en el mismo teclado: el ranking es individual y el juego se mide contra la CPU (decisión del agente, pendiente de revisar).
- **Sí:** sin assets: todo con formas del canvas. No hay sprites de motos en `references/` y la estética neón plana encaja con la plataforma.
- **Sí:** fase propia `ready` en `initialSnapshot` en lugar de `playing`: `game-player.tsx` no usa el valor de `phase`, así que no rompe nada y refleja el estado real (decisión del agente, pendiente de revisar).
- **Sí:** `dt` limitado a 50 ms, como los demás motores, y la pausa detiene los acumuladores de paso y de `roundover`.
- **Sí:** textos `short`/`long` propuestos por este spec a partir de las reglas definidas; **pendientes de confirmar** al revisar el borrador (decisión del agente, pendiente de revisar).
- **Sí:** timestamp de migración `20261125213500` (posterior a `20261125014531_add_game_snake.sql`); puede cambiar al implementar.

---

## Risks

| Riesgo                                                                                                 | Mitigación                                                                                                                              |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode deja bucles o listeners duplicados.                                                        | `destroy()` y criterio de aceptación específico.                                                                                        |
| Eventos de teclado desde el input de iniciales (`W A S D` son letras válidas allí).                    | El motor ignora `keydown` de campos de formulario; criterio de aceptación específico.                                                   |
| `setState` por frame degrada el reproductor.                                                           | `onChange` solo ante cambios y callbacks en refs; el score cambia como mucho una vez por paso (≥ 60 ms).                                |
| `requestAnimationFrame`/`window` rompen el render en servidor.                                         | El motor solo se crea en `useEffect`; componente `"use client"`; sin `Image` ni `Audio`.                                                |
| Puntuaciones falsificadas desde el cliente / insert público.                                           | Aceptado (SPEC 06): CHECKs de la BD y tope 9 999 999; anti-trampas en otro spec.                                                        |
| Nombre de migración distinto a la versión registrada en Supabase.                                      | Comprobar con `list_migrations` y renombrar el archivo.                                                                                 |
| La resolución simultánea del paso da resultados distintos según el orden en que se procesan las motos. | `resolveStep` calcula todas las casillas siguientes antes de marcar ninguna; choques frontales detectados por casilla destino repetida. |
| La IA es demasiado buena (el jugador no gana nunca) o demasiado torpe (rondas triviales).              | Error del 12 % en el sector 1 y flood-fill acotado; criterio de aceptación de que la IA choca sola; ajuste de constantes tras jugar.    |
| El flood-fill de 3 rivales en cada paso cuesta demasiado a 60 ms por paso.                             | Tope `FLOOD_CAP = 300`, BFS sobre `Uint8Array` con cola de enteros reutilizada; como máximo 9 BFS por paso.                             |
| Rondas eternas si el jugador y un rival se esquivan sin fin.                                           | Imposible: cada paso ocupa casillas nuevas de forma permanente y la rejilla tiene 1 200, así que una ronda dura como mucho 1 200 pasos. |
| Partidas infinitas inflan el ranking más allá de lo comparable.                                        | Tope 9 999 999 y dificultad máxima desde el sector 11; la puntuación sigue siendo comparable porque avanzar exige ganar rondas.         |
| `estela` y `duelo-pixel` comparten `cover-duelo` y se confunden en `/games`.                           | Títulos y textos distintos; portada propia `cover-estela` en el spec 03 de este paquete.                                                |
| El texto del canvas se ve borroso al escalar a 375 px.                                                 | Se acepta en esta versión, como en Tetris; ajustar con `devicePixelRatio` en un spec posterior si molesta.                              |
| `estela` no aparece en la home (solo los 6 primeros por `sort_order`).                                 | Esperado: se descubre en `/games` y `/salon`; cambiar la home queda fuera de alcance.                                                   |
| `generateStaticParams` de `/juegos/[id]` lee la BD y el juego nuevo no se prerrenderiza.               | Aplicar la migración antes de `npm run build`; leer la guía de `cacheComponents` antes del paso 6.                                      |
| Otro juego se implementa antes y ocupa el `sort_order` 13.                                             | Recalcular el máximo de `sort_order` al promover el spec y ajustar migración y criterios.                                               |

---

## What is **not** in this spec

- Cambios al esquema de `scores`, Auth, anti-trampas.
- Turbo, chispas, rivales con personalidad, sectores con obstáculos y bonus múltiple (spec 02 de este paquete).
- Portada propia `cover-estela`, brillo neón, partículas y sonido (spec 03 de este paquete).
- Controles táctiles (swipe), ratón o gamepad.
- Modo de dos jugadores en el mismo teclado.
- Resolver o retirar el mock `duelo-pixel`, y cambios en la home.
- Portar otros juegos.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
