# SPEC 07 — Tetris como juego real (`tetris`)

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-11-20
> **Objective:** Portar `references/started-games/03-tetris` a un motor TypeScript con canvas, montarlo en `/juegos/tetris/jugar`, añadirlo al catálogo por migración y guardar sus puntuaciones en el leaderboard real.

---

## Por qué existe este spec

Tetris es el segundo juego real de la plataforma. Sale de `references/started-games/03-tetris` (`game.js`, ~330 líneas, JS plano con globales y `document.getElementById`). A diferencia de Asteroides solo tiene una vida (perderla es game over), el canvas del original es 300×600 (1:2, no 4:3), tiene una vista previa de la siguiente pieza y no usa assets ni sonido. Reutiliza el patrón de motor con ciclo de vida del SPEC 05 y el guardado/leaderboard del SPEC 06. Como `lib/games/registry.ts` aún no existe, este spec lo crea y refactoriza `components/game-player.tsx`, que hoy tiene `asteroides` cableado a mano (`REAL_ASTEROIDS_ID`).

Ya existe el mock `caida` (PUZZLE, `cover-tetro`) con temática de Tetris. Es un juego distinto del catálogo y no se toca, igual que `rocas` frente a `asteroides`.

---

## Scope

**In:**

- Motor en TypeScript `lib/games/tetris/{types,constants,entities,engine}.ts` portado de `references/started-games/03-tetris/game.js` sin cambiar la jugabilidad: tablero 10×20, 7 piezas (I, O, T, S, Z, J, L), rotación horaria con wall kicks, soft drop, hard drop, pieza fantasma, pieza siguiente, limpieza de líneas, puntuación por líneas × nivel, niveles cada 10 líneas y caída acelerada.
- Canvas lógico 800×600 (4:3), escalado por CSS dentro de `.crt-screen`. El tablero (300×600) se dibuja dentro del canvas y a su derecha un panel con la pieza siguiente (NEXT) y el contador de LÍNEAS, también dibujados en el canvas. El HUD de la plataforma muestra Puntuación, Vidas y Nivel. Estética del original: fondo `#1a1a25`, rejilla, bloques con realce y los 7 colores originales; sin el tema claro/oscuro ni el overlay HTML del original.
- Controles: solo teclado. `←` `→` mover, `↑` o `X` rotar, `↓` soft drop, `Espacio` hard drop. La tecla `P` del original no se porta: la pausa es el botón PAUSA de la plataforma. Sin táctil.
- Componente cliente `components/games/tetris-canvas.tsx`.
- Registro de juegos reales `lib/games/registry.ts` y refactor de `components/game-player.tsx` para resolver el motor por `game.id` (Asteroides pasa a ser la primera entrada, Tetris la segunda).
- Migración `supabase/migrations/20261120120000_add_game_tetris.sql` que inserta en `games`: `id: "tetris"`, `title: "TETRIS"`, `cat: "PUZZLE"`, `cover: "cover-tetro"`, `color: "cyan"`, `sort_order: 10`, `short`/`long` (ver Data model). Aplicada con el MCP de Supabase y tipos regenerados. No se modifica el esquema de `scores`.
- «GUARDAR PUNTUACIÓN» llama a `saveScore` (ya genérica) para `tetris`; aparece en `/salon?juego=tetris` y en el leaderboard del detalle con `best`/`plays` reales.
- Listeners de teclado registrados al montar y eliminados al desmontar; sin scroll de página con las teclas del juego.

**Out of scope (para specs futuros):**

- Cambios al esquema de `scores`, Auth, `user_id`, anti-trampas, rate limiting.
- Controles táctiles o gamepad.
- Sonido y música (el original no tiene).
- Portada propia de `tetris` (reutiliza `cover-tetro`) y reskin neón del canvas.
- La pieza «N» (tuerca) presente en el `game.js` original: no se porta; el juego usa las 7 piezas estándar del README.
- El selector de tema claro/oscuro y su `localStorage` (`tetris-theme`).
- Portar `04-arkanoid` u otros juegos.
- Modificar o reemplazar entradas existentes de `games` (incluida `caida`).
- Tests automatizados (no hay runner configurado).

---

## Data model

Contrato del motor (mismo patrón que SPEC 05):

```ts
// lib/games/tetris/types.ts
export type TetrisPhase = "playing" | "gameover";

export interface TetrisSnapshot {
  score: number;
  lives: number; // 1 mientras se juega (una sola vida); 0 al terminar la partida
  level: number; // floor(lines / 10) + 1
  phase: TetrisPhase;
}

export interface TetrisCallbacks {
  /** Solo cuando cambia algún valor del snapshot. */
  onChange: (snapshot: TetrisSnapshot) => void;
  /** Una vez al terminar la partida. */
  onGameOver: (finalScore: number) => void;
}

export interface TetrisEngine {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void; // score=0, lines=0, level=1, tablero vacío y vuelve a `playing`
  end(): void; // botón FIN: dispara onGameOver con el score actual
  destroy(): void; // cancela requestAnimationFrame y elimina listeners
}

// lib/games/tetris/engine.ts
export function createTetrisEngine(
  canvas: HTMLCanvasElement,
  callbacks: TetrisCallbacks,
): TetrisEngine;
```

Contrato común para el registro:

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
// asteroides: initialSnapshot { score: 0, lives: 3, level: 1, phase: "playing" }
// tetris:     initialSnapshot { score: 0, lives: 1, level: 1, phase: "playing" }
```

Fila de catálogo (migración, valores literales, textos confirmados). `sort_order = 10` es el siguiente libre: la tabla `games` tiene hoy `sort_order` 1..9 (comprobado con `execute_sql`):

```sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'tetris',
  'TETRIS',
  'Encaja piezas, completa líneas y aguanta la caída.',
  'Siete tetrominós descienden por un tablero de 10×20. Muévelos, rótalos y suéltalos para completar filas: 1, 2, 3 o 4 líneas a la vez puntúan cada vez más. Cada 10 líneas subes de nivel y la caída se acelera. Si una pieza nueva no cabe, la partida termina.',
  'PUZZLE',
  'cover-tetro',
  'cyan',
  10
);
```

Constantes del juego (valores exactos de `game.js`, sin la pieza N):

- Tablero: `COLS = 10`, `ROWS = 20`, `BLOCK = 30` px (300×600). Canvas lógico `W = 800`, `H = 600`.
- Disposición en el canvas (propuesta, ajustable al implementar): tablero en `x = 150`; panel derecho en `x = 490` con NEXT (4×4 celdas de 30 px = 120×120) y LÍNEAS debajo.
- `COLORS` (índice 1–7): `I #4dd0e1`, `O #ffd54f`, `T #ba68c8`, `S #81c784`, `Z #e57373`, `J #90caf9`, `L #ffb74d`.
- `PIECES`: `I [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]]`, `O [[2,2],[2,2]]`, `T [[0,3,0],[3,3,3],[0,0,0]]`, `S [[0,4,4],[4,4,0],[0,0,0]]`, `Z [[5,5,0],[0,5,5],[0,0,0]]`, `J [[6,0,0],[6,6,6],[0,0,0]]`, `L [[0,0,7],[7,7,7],[0,0,0]]`.
- `LINE_SCORES = [0, 100, 300, 500, 800]`.
- Posición de aparición: `x = floor(COLS / 2) - floor(ancho / 2)`, `y = 0`.
- Wall kicks de rotación: desplazamientos `[0, -1, 1, -2, 2]` en ese orden.
- Caída: `dropInterval = max(100, 1000 - (level - 1) * 90)` ms; `level = floor(lines / 10) + 1`.
- Pieza fantasma con `globalAlpha = 0.2`.
- `dt` limitado a 50 ms.

Convenciones:

- Sin estado global de módulo: todo vive en la closure de `createTetrisEngine` (Strict Mode no comparte estado). `lines`, el tablero y la pieza siguiente son estado interno; solo `score`, `level` y `phase` salen en el snapshot.
- `onChange` no se emite por frame, solo ante cambios reales del snapshot.
- Las entidades y utilidades de dibujo reciben `ctx`; sin `document.getElementById` ni `getComputedStyle` (el color de la rejilla es una constante).
- El motor ignora `keydown` cuyo `target` sea `input`, `textarea` o `select`, y hace `preventDefault` de `←` `→` `↑` `↓` y `Espacio` mientras la partida está activa.
- Tras `gameover` el motor no se reinicia con teclas: lo hace la plataforma con `restart()`.
- La pausa detiene la acumulación de tiempo de caída: al reanudar se reinicia la referencia de tiempo y la pieza no cae de golpe.
- La puntuación enviada es un entero entre 1 y 9 999 999; el ranking ordena por `score` desc y `created_at` asc. El ranking usa el score final (no las líneas).
- Los nombres y rutas de archivos son propuesta de este spec; pueden ajustarse al implementar si Next.js lo requiere.

---

## Implementation plan

Antes del paso 1: leer en `node_modules/next/dist/docs/` la guía de Client Components y, para el paso 6, la de `generateStaticParams`/`cacheComponents` (Next.js 16). El diseño de la plataforma no cambia (se reutilizan `.crt`, `.crt-screen`, `.player-hud` y `.modal`), por lo que no se invoca `/frontend-design`; el panel NEXT/LÍNEAS dibujado en el canvas sigue la estética original, no es UI nueva de la plataforma.

1. **Tipos y constantes.** Crear `lib/games/tetris/types.ts` y `lib/games/tetris/constants.ts` con lo del Data model. Verificación: `npx tsc --noEmit` sin errores.
2. **Entidades y utilidades.** Crear `lib/games/tetris/entities.ts` tipado y sin `any`: `createBoard`, `randomPiece` (uniforme sobre las 7 piezas), `collide`, `rotateCW`, `merge`, `drawBlock`, dibujo de rejilla, tablero, pieza fantasma, pieza actual y vista NEXT; todo recibe `ctx` y el estado como parámetros. Verificación: `npx tsc --noEmit` sin errores.
3. **Motor.** Crear `lib/games/tetris/engine.ts` con `createTetrisEngine`: estado en closure, `init`, `spawn`, `tryRotate`, `softDrop`, `hardDrop`, `lockPiece`, `clearLines`, bucle con `requestAnimationFrame`, listeners de teclado en `window`, dibujo del tablero y del panel NEXT/LÍNEAS en el canvas 800×600 y la API `start/pause/resume/restart/end/destroy`. Verificación: `npx tsc --noEmit` sin errores.
4. **Componente de canvas.** Crear `components/games/tetris-canvas.tsx` (`"use client"`): `<canvas width={800} height={600}>` con `width: 100%; height: 100%`, `useEffect` que crea el motor, llama `start()` y devuelve `destroy()` en el cleanup, callbacks en refs. Verificación: `npx tsc --noEmit` sin errores.
5. **Registro y reproductor.** Crear `lib/games/registry.ts` con `REAL_GAMES` (entradas `asteroides` y `tetris`). Ajustar los tipos de `components/games/asteroids-canvas.tsx` y `tetris-canvas.tsx` a `GameCanvasProps`. Refactorizar `components/game-player.tsx`: eliminar `REAL_ASTEROIDS_ID`, el import directo de `AsteroidsCanvas` y los tipos de Asteroides; `isReal = game.id in REAL_GAMES`, el snapshot inicial sale de `initialSnapshot` y el canvas se renderiza con `REAL_GAMES[game.id].Canvas`. El resto de ids conserva la simulación. Verificación: `/juegos/asteroides/jugar` se comporta igual que antes del refactor y `/juegos/caida/jugar` sigue simulado.
6. **Migración del catálogo.** Crear `supabase/migrations/20261120120000_add_game_tetris.sql` y aplicarla con `apply_migration`; el nombre del archivo debe coincidir con la versión que registre Supabase (`list_migrations`). Regenerar `lib/supabase/database.types.ts`. Verificación: `list_tables` muestra `tetris` con `sort_order = 10`, `get_advisors` (security) limpio y `/juegos/tetris` responde 200.
7. **Guardado y leaderboard.** Comprobar que `saveScore` persiste para `tetris` y que `/salon?juego=tetris` y `/juegos/tetris` muestran la fila; `Partidas` y `Mejor global` se actualizan. Verificación: jugar, guardar `AAA` y confirmar la fila con `execute_sql`.
8. **Limpieza y responsive.** Sin `document.getElementById`, `getComputedStyle` ni globales en `lib/games/tetris/`; el canvas escala a 375 px sin scroll horizontal. Ejecutar `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores.

---

## Acceptance criteria

Comunes:

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos/tetris/jugar` muestra el canvas del juego sin HUD interno de Puntuación ni Nivel.
- [ ] Las teclas del juego funcionan y la página no hace scroll al pulsarlas.
- [ ] El HUD (Puntuación, Vidas, Nivel) refleja el estado real del motor.
- [ ] «PAUSA» detiene el juego y muestra «EN PAUSA»; «REANUDAR» continúa desde el mismo estado.
- [ ] «FIN» abre el modal con el score acumulado; al terminar la partida se abre «FIN DEL JUEGO» con la puntuación real.
- [ ] «JUGAR DE NUEVO» reinicia el juego al estado inicial.
- [ ] Escribir en el campo de iniciales (incluido un espacio) no dispara ni reinicia el juego.
- [ ] «SALIR» vuelve a `/juegos/tetris` y las teclas ya no producen errores ni movimiento (listeners eliminados).
- [ ] Con React Strict Mode solo hay un bucle de animación y un conjunto de listeners.
- [ ] Escribir `abc`, guardar y ver «PUNTUACIÓN GUARDADA_» crea una fila en `scores` con `game_id = 'tetris'`, `player_name = 'ABC'` y el score real.
- [ ] Doble clic en «GUARDAR PUNTUACIÓN» crea una sola fila; con fallo de red se muestra error y se puede reintentar.
- [ ] `/salon?juego=tetris` y el detalle `/juegos/tetris` muestran la puntuación guardada al recargar; `Partidas` = `COUNT` y `Mejor global` = `MAX` de `scores`.
- [ ] `tetris` aparece en `/games` con su título, portada (`cover-tetro`) y color (`cyan`); no aparece en la home, que muestra solo los 6 primeros por `sort_order`.
- [ ] `asteroides` mantiene su comportamiento y su ranking sin cambios tras el refactor; `/juegos/caida/jugar`, `/juegos/rocas/jugar` y `/juegos/gloton/jugar` siguen con la simulación actual.
- [ ] `list_migrations` muestra la migración; `get_advisors` (security) sin avisos nuevos.
- [ ] A 375 px `/juegos/tetris/jugar` no tiene scroll horizontal y el canvas conserva la proporción 4:3.
- [ ] Sin errores de hidratación en `/`, `/games`, `/salon`, `/juegos/tetris`, `/juegos/tetris/jugar`.
- [ ] `grep` de `document.getElementById`, `window.` (fuera de `engine.ts`), `SERVICE_ROLE` en `lib/games/tetris/`, `app/`, `components/` no devuelve resultados.
- [ ] `lib/games/registry.ts` existe con `asteroides` y `tetris`; `components/game-player.tsx` no contiene `REAL_ASTEROIDS_ID` ni importa `AsteroidsCanvas`.
- [ ] La fila `caida` de `games` no tiene cambios (misma `id`, `title`, `short`, `long`, `cat`, `cover`, `color`, `sort_order`).

Específicos del juego (derivados de `references/started-games/03-tetris/game.js`):

- [ ] El tablero tiene 10 columnas × 20 filas de celdas de 30 px y el canvas lógico es 800×600 con el tablero a la izquierda del panel NEXT/LÍNEAS, sin solaparse con él.
- [ ] Solo aparecen las 7 piezas I, O, T, S, Z, J, L con las matrices y colores de Constantes; no existe ninguna pieza «N» y cada tipo tiene probabilidad 1/7.
- [ ] Cada pieza aparece en `y = 0` y `x = floor(10/2) - floor(ancho/2)` (I en x=3, O en x=4, T/S/Z/J/L en x=4).
- [ ] `←` y `→` desplazan la pieza una columna y no la mueven si colisiona con la pared o con bloques fijados.
- [ ] `↑` y `X` rotan la pieza en sentido horario; si la rotación colisiona se prueban los desplazamientos `0, -1, +1, -2, +2` en ese orden y, si ninguno cabe, la pieza no rota.
- [ ] `↓` baja la pieza una fila y suma 1 punto; si la pieza no puede bajar, la fija sin sumar puntos.
- [ ] `Espacio` deja caer la pieza hasta el fondo, suma 2 puntos por celda recorrida y la fija inmediatamente.
- [ ] La caída automática baja una fila cada `max(100, 1000 - (nivel - 1) * 90)` ms, no suma puntos y fija la pieza cuando no puede bajar.
- [ ] Una pieza fantasma al 20 % de opacidad se dibuja en la posición donde aterrizaría la pieza actual.
- [ ] Completar 1, 2, 3 o 4 filas a la vez suma 100, 300, 500 u 800 puntos multiplicados por el nivel vigente antes de recalcularlo; p. ej. 4 filas en el nivel 1 suman 800.
- [ ] Las filas completas desaparecen y las superiores bajan; el contador LÍNEAS del canvas aumenta en el número de filas eliminadas.
- [ ] El «Nivel» del HUD es `floor(líneas / 10) + 1` (sube al llegar a 10 líneas) y el intervalo de caída se acorta en consecuencia.
- [ ] El panel NEXT muestra la pieza que aparecerá a continuación y coincide con la siguiente que se genera.
- [ ] «Vidas» del HUD muestra una sola vida («♥») durante la partida y pasa a «—» (`lives = 0`) al llegar al game over; `restart()` vuelve a `lives = 1`.
- [ ] La partida termina cuando una pieza recién generada colisiona al aparecer: se emite `onGameOver` una sola vez con el score final, se abre «FIN DEL JUEGO», el bucle se detiene y las teclas no producen movimiento.
- [ ] La tecla `P` no pausa el juego; solo lo hace el botón PAUSA, y tras reanudar la pieza actual no cae más de una fila de golpe.
- [ ] Si la partida termina con 0 puntos, el modal muestra 0 y «GUARDAR PUNTUACIÓN» muestra el error de puntuación mínima sin crear fila.

---

## Decisions

- **Sí:** `tetris` como slug y TETRIS como título; juego nuevo añadido por migración con `sort_order = 10`, el siguiente libre.
- **Sí:** convive con el mock `caida`, que no se modifica ni se reemplaza (decisión del usuario). Es un juego distinto del catálogo y la skill prohíbe tocar entradas existentes; el parecido temático es casual, como `rocas` frente a `asteroides`.
- **Sí:** color `cyan` y `cover-tetro` reutilizada. Distingue la tarjeta de `caida` (magenta) sin CSS nuevo; la portada propia queda para después.
- **Sí:** motor con ciclo de vida y callbacks; HUD y modal en React (patrón SPEC 05).
- **Sí:** estado en closure y `onChange` solo ante cambios.
- **Sí:** guardado vía `saveScore` ya existente; sin cambios al esquema de `scores` (SPEC 06).
- **Sí:** registro de juegos reales en lugar de un `if (game.id === ...)` por juego; `lib/games/registry.ts` no existe y este spec lo crea con Asteroides como primera entrada.
- **No:** persistir puntuaciones fuera de Supabase, ni `localStorage` para récords (tampoco para el tema, que se elimina).
- **No:** modificar entradas existentes de `games`.
- **Sí:** Tetris tiene una sola vida (decisión del usuario): `lives = 1` mientras se juega y `0` al game over, como en Asteroides cuando se agotan las vidas. Todos los juegos de la plataforma tienen vidas y así el HUD es coherente; `game-player.tsx` ya pinta «♥» y «—», sin UI nueva ni flags por juego.
- **No:** mostrar las líneas en el hueco de «Vidas», ocultarlo o dejarlo fijo en «—»: exigiría etiquetas o flags por juego en el registro. Las líneas se ven en el panel del canvas.
- **Sí:** «Nivel» = `floor(líneas / 10) + 1`, igual que el original.
- **Sí:** canvas lógico 800×600 con tablero y panel NEXT/LÍNEAS dibujados dentro (decisión del usuario). Encaja en el 4:3 de `.crt-screen` sin barras y la plataforma no necesita conocer NEXT.
- **No:** canvas 300×600 con barras laterales, ni 400×600: dejarían bandas vacías en el CRT y NEXT quedaría sin sitio.
- **Sí:** siete piezas estándar; se descarta la pieza «N» de `game.js` (decisión del usuario). El README del original describe solo las 7 estándar y la «N» no está documentada; esta es una divergencia deliberada respecto al código de referencia.
- **Sí:** solo teclado y sin tecla `P` (decisión del usuario). La plataforma ya tiene PAUSA; mantener `P` obligaría a sincronizar dos fuentes del estado de pausa. Sin controles táctiles, como los demás juegos.
- **Sí:** conservar colores y estética del original (decisión del usuario); fidelidad al juego, igual que en Asteroides. Se elimina el tema claro/oscuro porque la plataforma ya fija su propio tema.
- **Sí:** el ranking usa el score final del original (líneas × nivel + soft/hard drop); `FIN` dispara `onGameOver` con el score actual (decisión del usuario).
- **Sí:** `dt` limitado a 50 ms, como Asteroides, para evitar saltos tras volver a la pestaña.
- **Sí:** textos `short`/`long` propuestos a partir del README y confirmados por el usuario.
- **Sí:** los nombres, rutas y coordenadas del panel del canvas son propuesta; pueden ajustarse al implementar.

---

## Risks

| Riesgo                                                                                   | Mitigación                                                                                                                |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode deja bucles o listeners duplicados.                                          | `destroy()` y criterio de aceptación específico.                                                                          |
| Eventos de teclado desde el input de iniciales.                                          | El motor ignora `keydown` de campos de formulario.                                                                        |
| `setState` por frame degrada el reproductor.                                             | `onChange` solo ante cambios y callbacks en refs.                                                                         |
| `requestAnimationFrame`/`window` rompen el render en servidor.                           | El motor solo se crea en `useEffect`; componente `"use client"`.                                                          |
| Puntuaciones falsificadas desde el cliente / insert público.                             | Aceptado (SPEC 06): CHECKs de la BD y tope 9 999 999; anti-trampas en otro spec.                                          |
| Nombre de migración distinto a la versión registrada en Supabase.                        | Comprobar con `list_migrations` y renombrar el archivo.                                                                   |
| El refactor del reproductor rompe Asteroides, que ya funciona y guarda puntuaciones.     | Criterio de aceptación explícito de que Asteroides se comporta igual; el paso 5 se verifica antes de añadir la migración. |
| Tipos distintos entre `AsteroidsCanvas` y `GameCanvasProps` (`phase` union vs string).   | Tipar ambos canvas contra `GameCanvasProps`; `npx tsc --noEmit` en el paso 5.                                             |
| El texto del panel (NEXT, LÍNEAS) dibujado en canvas se ve borroso al escalar a 375 px.  | Se acepta en esta versión, como en Asteroides; ajustar con `devicePixelRatio` en un spec posterior si molesta.            |
| Mantener repeticiones de teclado del original encadena hard drops al mantener `Espacio`. | Se conserva el comportamiento del original; si molesta se filtra `e.repeat` en un spec posterior.                         |
| `tetris` y `caida` conviven en el catálogo y se confunden.                               | Color y textos distintos; `caida` se resolverá (retirar o revisar) en otro spec.                                          |
| `tetris` no aparece en la home (solo los 6 primeros por `sort_order`).                   | Esperado: se descubre en `/games` y `/salon`; cambiar la home queda fuera de alcance.                                     |
| `generateStaticParams` de `/juegos/[id]` lee la BD y el juego nuevo no se prerrenderiza. | Aplicar la migración antes de `npm run build`; leer la guía de `cacheComponents` antes del paso 6.                        |

---

## What is **not** in this spec

- Cambios al esquema de `scores`, Auth, anti-trampas.
- Controles táctiles o gamepad, tecla `P`, sonido y música.
- Pieza «N» (tuerca), tema claro/oscuro y reskin neón.
- Portada propia de `tetris`.
- Resolver o retirar el mock `caida`, y cambios en la home.
- Portar Arkanoid u otros juegos.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
