# SPEC 09 — Snake como juego real (`snake`)

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 06, SPEC 07 (registro de juegos reales)
> **Date:** 2026-11-24
> **Objective:** Crear Snake como motor TypeScript con canvas diseñado desde cero (sin código de referencia), usando las frutas de `references/source-assets/snake-assets`, montarlo en `/juegos/snake/jugar`, añadirlo al catálogo por migración y guardar sus puntuaciones en el leaderboard real.

---

## Por qué existe este spec

Snake es el cuarto juego real de la plataforma. A diferencia de Asteroides, Tetris y Arkanoid **no hay código de referencia que portar**: solo existen los sprites de frutas en `references/source-assets/snake-assets/` (`fruits.png`, 3790×442, y `sprites.js` con el atlas `SPRITE_ATLAS`). El motor se diseña desde cero con las reglas de este spec (estilo Google Snake: rejilla, serpiente que crece al comer, muerte al chocar). Reutiliza el motor con ciclo de vida del SPEC 05, el guardado/leaderboard del SPEC 06 y el registro `lib/games/registry.ts` del SPEC 07.

Ya existe el mock `serpentina` (ARCADE, `cover-snake`, verde, `sort_order` 3). Es un juego distinto del catálogo y no se toca, igual que `rocas` frente a `asteroides`, `caida` frente a `tetris` y `bloque-buster` frente a `arkanoid`.

---

## Scope

**In:**

- Motor en TypeScript `lib/games/snake/{types,constants,entities,engine}.ts` diseñado desde cero con las mecánicas de este spec: rejilla de 20×15 casillas, serpiente que avanza por casillas a intervalos fijos, una fruta en pantalla, crecimiento al comer, aceleración por nivel, muerte al chocar con el muro o con la propia cola y victoria al llenar el tablero.
- Canvas lógico 800×600 (4:3 exacto), escalado por CSS dentro de `.crt-screen`. Estética tipo Google Snake: tablero a cuadros verdes, serpiente azul con ojos, frutas del spritesheet. No hay HUD interno (lo muestra la plataforma).
- Controles: solo teclado. `←` `↑` `→` `↓` y `W` `A` `S` `D`. Sin táctil ni gamepad.
- Assets: `references/source-assets/snake-assets/fruits.png` se copia a `public/games/snake/fruits.png`. El atlas de `sprites.js` (fila de 22 frutas, `y = 136`, `h = 160`) se traslada a `constants.ts` como `FRUIT_SPRITES`; `sprites.js` **no** se copia (usa `window`). El motor crea la `Image` dentro de `start()` (nunca en el render) y no arranca el bucle hasta que carga.
- Componente cliente `components/games/snake-canvas.tsx`.
- Nueva entrada `snake` en `lib/games/registry.ts` (`REAL_GAMES`), junto a `asteroides`, `tetris` y `arkanoid`.
- Migración `supabase/migrations/20261124210000_add_game_snake.sql` que inserta en `games`: `id: "snake"`, `title: "SNAKE"`, `cat: "ARCADE"`, `cover: "cover-snake"`, `color: "green"`, `sort_order: 12`, `short`/`long` (ver Data model). Aplicada con el MCP de Supabase y tipos regenerados. No se modifica el esquema de `scores`.
- «GUARDAR PUNTUACIÓN» llama a `saveScore` (ya genérica) para `snake`; aparece en `/salon?juego=snake` y en el leaderboard del detalle con `best`/`plays` reales.
- Listeners de teclado registrados al montar y eliminados al desmontar; sin scroll de página con las teclas del juego.

**Out of scope (para specs futuros):**

- Cambios al esquema de `scores`, Auth, `user_id`, anti-trampas, rate limiting.
- Sonido y música.
- Controles táctiles (swipe) y gamepad.
- Portada propia de `snake` (reutiliza `cover-snake`) y reskin neón del canvas.
- Modificar o reemplazar entradas existentes de `games` (incluida `serpentina`).
- Obstáculos, frutas especiales, modo con teletransporte en los muros u otras variantes.
- Las filas «plana» y «realista» de `fruits.png`: solo se usa la fila pixel que cubre `sprites.js`.
- Tests automatizados (no hay runner configurado).

---

## Data model

Contrato del motor (mismo patrón que SPEC 05, 07 y 08):

```ts
// lib/games/snake/types.ts
export type SnakePhase = "playing" | "won" | "gameover";

export interface SnakeSnapshot {
  score: number; // 10 por fruta
  lives: number; // siempre 1: una muerte termina la partida (como Tetris)
  level: number; // 1 + floor(frutas / 5): determina la velocidad
  phase: SnakePhase;
}

export interface SnakeCallbacks {
  /** Solo cuando cambia algún valor del snapshot. */
  onChange: (snapshot: SnakeSnapshot) => void;
  /** Una vez al terminar la partida (muerte, victoria o botón FIN). */
  onGameOver: (finalScore: number) => void;
}

export interface SnakeEngine {
  start(): void; // crea la Image de frutas y arranca el bucle al cargar
  pause(): void;
  resume(): void;
  restart(): void; // score=0, level=1, serpiente inicial y vuelve a `playing`
  end(): void; // botón FIN: dispara onGameOver con el score actual
  destroy(): void; // cancela requestAnimationFrame y elimina listeners
}

// lib/games/snake/engine.ts
export function createSnakeEngine(
  canvas: HTMLCanvasElement,
  callbacks: SnakeCallbacks,
): SnakeEngine;
```

Entrada del registro (sin cambios en el contrato común del SPEC 07):

```ts
// lib/games/registry.ts
snake: {
  Canvas: SnakeCanvas,
  initialSnapshot: { score: 0, lives: 1, level: 1, phase: "playing" },
},
```

Fila de catálogo (migración, valores literales). `sort_order = 12` es el siguiente libre: la tabla `games` tiene hoy `sort_order` 1..11 (comprobado con `execute_sql`; `arkanoid` es el 11). Los textos `short`/`long` son una **propuesta** de este spec, pendiente de confirmar al revisarlo:

```sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'snake',
  'SNAKE',
  'Come frutas, crece y no choques contigo misma.',
  'Guía a la serpiente por un tablero de 20×15 casillas y come las frutas que aparecen. Cada fruta suma 10 puntos y alarga a la serpiente; cada 5 frutas subes de nivel y ella se mueve más rápido. Si chocas con un muro o con tu propia cola, se acabó la partida.',
  'ARCADE',
  'cover-snake',
  'green',
  12
);
```

Constantes del juego (diseño de este spec, no hay original):

- Canvas lógico `W = 800`, `H = 600`; `CELL = 40`; `COLS = 20`, `ROWS = 15` (300 casillas).
- Serpiente inicial: longitud 3, cabeza en `(col 5, row 7)`, cuerpo en `(4, 7)` y `(3, 7)`, dirección inicial derecha.
- Intervalo entre pasos: `tickMs = max(70, 140 - (level - 1) * 10)` → 140 ms en el nivel 1, 70 ms desde el nivel 8.
- Nivel: `level = 1 + floor(frutas / 5)`, con `frutas = score / 10`.
- Puntos: 10 por fruta. Máximo posible: 297 frutas (300 casillas − 3 iniciales) = **2 970 puntos**.
- Frutas: `FRUIT_SPRITES` con las 22 entradas de `sprites.js` (por orden de `x`: `apple, banana, pineapple, grapes, pumpkin, garlic, eggplant, strawberry, cherry, carrot, mushroom, broccoli, watermelon, pepper, kiwi, lemon, orange, peach, peanut, radish, tomato, fruitbowl`; los nombres de `sprites.js` no coincidían con el dibujo y se corrigieron al verificar el paso 4), cada una `{ x, y, w, h }` con `y = 136`, `h = 160` y las `x`/`w` del atlas original. Fuente: `references/source-assets/snake-assets/sprites.js`.
- Dibujo de fruta: alto `36` px (90 % de la casilla), ancho proporcional a `w / h` y centrada en la casilla, con la imagen original reducida (suavizado activado).
- Colores del tablero: casillas alternas `#aad751` / `#a2d149`; serpiente `#4674e9`; ojos blancos con pupila negra en la cabeza, orientados hacia la dirección de avance.
- `dt` limitado a 50 ms (como los demás motores).

Convenciones:

- Sin estado global de módulo: todo vive en la closure de `createSnakeEngine` (Strict Mode no comparte estado). La `Image` se crea en `start()` y se libera en `destroy()`.
- `onChange` no se emite por frame, solo ante cambios reales del snapshot (`score`, `level` o `phase`).
- Las entidades reciben `ctx` en `draw`; sin `document.getElementById`.
- El motor lee `event.code` (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD`), ignora `keydown` cuyo `target` sea `input`, `textarea` o `select` y también las combinaciones con `Ctrl`, `Alt` o `Meta` (para no bloquear `Ctrl+W`, `Cmd+A`…). Hace `preventDefault` de las teclas de juego mientras la partida está activa.
- Movimiento por pasos con acumulador de tiempo: cada `tickMs` la serpiente avanza una casilla. La pausa detiene la acumulación; al reanudar se reinicia la referencia de tiempo para que `dt` no incluya el tiempo en pausa.
- Cola de direcciones de **máximo 2** entradas: cada pulsación se compara con la última dirección encolada (o con la actual si la cola está vacía) y se descarta si es igual o la contraria (giro de 180°). Se consume una dirección por paso.
- La serpiente **espera la primera pulsación válida** de dirección antes de empezar a moverse (el acumulador de tiempo no corre hasta entonces). La primera pulsación `←` (contraria a la dirección inicial) se descarta.
- Colisión en cada paso: la nueva cabeza fuera de `0..COLS-1` × `0..ROWS-1` mata. Chocar con el cuerpo mata, **excepto** con la casilla que la cola libera en ese mismo paso cuando no se come (la cola se mueve a la vez).
- Al comer: `score += 10`, la serpiente crece una casilla (la cola no se elimina en ese paso) y aparece una nueva fruta en una casilla libre elegida al azar con un sprite aleatorio de `FRUIT_SPRITES`. Si no quedan casillas libres, la fase pasa a `won`.
- Tras `gameover` o `won` el motor no se reinicia con teclas: lo hace la plataforma con `restart()`.
- La puntuación enviada es un entero entre 1 y 9 999 999; el ranking ordena por `score` desc y `created_at` asc. El máximo posible es 2 970.

---

## Implementation plan

Antes del paso 1: leer en `node_modules/next/dist/docs/` la guía de Client Components y, para el paso 6, la de `generateStaticParams`/`cacheComponents` (Next.js 16). El diseño de la plataforma no cambia (se reutilizan `.crt`, `.crt-screen`, `.player-hud` y `.modal`), por lo que no se invoca `/frontend-design`: no hay UI nueva de plataforma; el aspecto del canvas queda definido en las constantes de este spec.

1. **Tipos y constantes.** Crear `lib/games/snake/types.ts` y `constants.ts` (incluidos `FRUIT_SPRITES` trasladado de `sprites.js`, `tickMs` y colores). Verificación: `npx tsc --noEmit` sin errores y `Object.keys(FRUIT_SPRITES).length === 22`.
2. **Entidades.** Crear `lib/games/snake/entities.ts` tipado y sin `any`: `Snake` (segmentos, `step`, `grow`, `occupies`), `Fruit` y funciones de dibujo (`drawBoard`, `drawSnake`, `drawFruit`) que reciben `ctx` y la imagen como parámetros. Verificación: `npx tsc --noEmit` sin errores.
3. **Motor.** Crear `lib/games/snake/engine.ts` con `createSnakeEngine`: estado en closure, `init`, cola de direcciones, `step`, `spawnFruit`, `draw`, carga de la `Image` en `start()`, bucle con `requestAnimationFrame` y acumulador, listeners `keydown` en `window`, `preventDefault` en las teclas de juego y la API `start/pause/resume/restart/end/destroy`. Verificación: `npx tsc --noEmit` sin errores.
4. **Assets y componente de canvas.** Copiar `references/source-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png` (sin copiar `sprites.js`). Crear `components/games/snake-canvas.tsx` (`"use client"`): `<canvas width={800} height={600}>` con `width: 100%; height: 100%`, `useEffect` que crea el motor, llama `start()` y devuelve `destroy()` en el cleanup, callbacks en refs, tipado contra `GameCanvasProps`. Verificación: `npx tsc --noEmit` sin errores y `/games/snake/fruits.png` responde 200 en `next dev`. Comprobar visualmente que ninguna de las 22 frutas aparece recortada (el atlas se midió sobre la hoja original); si alguna lo está, ajustar su recorte en `FRUIT_SPRITES`. Si la URL choca con la ruta `/games` de la biblioteca, mover el fichero a `public/snake/` y ajustar la constante de URL (el SPEC 08 resolvió el mismo caso con `public/games/arkanoid/`).
5. **Registro.** Añadir la entrada `snake` a `REAL_GAMES` en `lib/games/registry.ts`. `components/game-player.tsx` no necesita cambios (ya resuelve por registro). Verificación: `/juegos/asteroides/jugar`, `/juegos/tetris/jugar` y `/juegos/arkanoid/jugar` se comportan igual y `/juegos/serpentina/jugar` sigue simulado.
6. **Migración del catálogo.** Crear `supabase/migrations/20261124210000_add_game_snake.sql` y aplicarla con `apply_migration`; el nombre del archivo debe coincidir con la versión que registre Supabase (`list_migrations`). Regenerar `lib/supabase/database.types.ts`. Verificación: `list_tables`/`execute_sql` muestran `snake` con `sort_order = 12`, `get_advisors` (security) limpio y `/juegos/snake` responde 200.
7. **Guardado y leaderboard.** Comprobar que `saveScore` persiste para `snake` y que `/salon?juego=snake` y `/juegos/snake` muestran la fila; `Partidas` y `Mejor global` se actualizan. Verificación: jugar, guardar `AAA` y confirmar la fila con `execute_sql`.
8. **Limpieza y responsive.** Sin `document.getElementById`, `Audio` ni globales de módulo en `lib/games/snake/`; el canvas escala a 375 px sin scroll horizontal. Ejecutar `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores.

---

## Acceptance criteria

Comunes:

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos/snake/jugar` muestra el canvas del juego sin HUD interno de puntuación ni nivel.
- [ ] Las teclas del juego (`←` `↑` `→` `↓`, `W` `A` `S` `D`) funcionan y la página no hace scroll al pulsarlas.
- [ ] El HUD (Puntuación, Vidas, Nivel) refleja el estado real del motor.
- [ ] «PAUSA» detiene el juego y muestra «EN PAUSA»; «REANUDAR» continúa desde el mismo estado.
- [ ] «FIN» abre el modal con el score acumulado; al terminar la partida se abre «FIN DEL JUEGO» con la puntuación real.
- [ ] «JUGAR DE NUEVO» reinicia el juego al estado inicial.
- [ ] Escribir en el campo de iniciales (incluido un espacio y las letras `W`, `A`, `S`, `D`) no mueve ni reinicia el juego.
- [ ] «SALIR» vuelve a `/juegos/snake` y las teclas ya no producen errores ni movimiento (listeners eliminados).
- [ ] Con React Strict Mode solo hay un bucle de animación y un conjunto de listeners.
- [ ] Escribir `abc`, guardar y ver «PUNTUACIÓN GUARDADA_» crea una fila en `scores` con `game_id = 'snake'`, `player_name = 'ABC'` y el score real.
- [ ] Doble clic en «GUARDAR PUNTUACIÓN» crea una sola fila; con fallo de red se muestra error y se puede reintentar.
- [ ] `/salon?juego=snake` y el detalle `/juegos/snake` muestran la puntuación guardada al recargar; `Partidas` = `COUNT` y `Mejor global` = `MAX` de `scores`.
- [ ] `snake` aparece en `/games` con su título, portada (`cover-snake`) y color (`green`); no aparece en la home, que muestra solo los 6 primeros por `sort_order`.
- [ ] `asteroides`, `tetris` y `arkanoid` mantienen su comportamiento y su ranking sin cambios; `/juegos/serpentina/jugar`, `/juegos/caida/jugar` y `/juegos/rocas/jugar` siguen con la simulación actual.
- [ ] `list_migrations` muestra la migración; `get_advisors` (security) sin avisos nuevos.
- [ ] A 375 px `/juegos/snake/jugar` no tiene scroll horizontal y el canvas conserva la proporción 4:3.
- [ ] Sin errores de hidratación en `/`, `/games`, `/salon`, `/juegos/snake`, `/juegos/snake/jugar`.
- [ ] `grep` de `document.getElementById`, `window.` (fuera de `engine.ts`), `SERVICE_ROLE` en `lib/games/snake/`, `app/`, `components/` no devuelve resultados.
- [ ] La fila `serpentina` de `games` no tiene cambios (misma `id`, `title`, `short`, `long`, `cat`, `cover`, `color`, `sort_order`).

Específicos del juego (diseño de este spec, sin código de referencia):

- [ ] El canvas lógico es 800×600 y se ve una rejilla de 20×15 casillas de 40 px con colores alternos `#aad751` / `#a2d149`.
- [ ] Al empezar hay una serpiente de 3 casillas (cabeza en la columna 5, fila 7, mirando a la derecha), una fruta en una casilla libre y el HUD muestra Puntuación 0, Vidas 1 y Nivel 1.
- [ ] La serpiente no se mueve hasta la primera pulsación de dirección válida; tras ella avanza una casilla cada 140 ms en el nivel 1.
- [ ] Pulsar `←` o `A` como primera tecla (contraria a la dirección inicial) no la mueve ni la mata.
- [ ] Las flechas y `W A S D` cambian la dirección; un giro de 180° (p. ej. `→` seguido de `←` sin paso intermedio) se ignora y no provoca una muerte.
- [ ] Dos pulsaciones rápidas dentro del mismo paso (p. ej. `↑` y luego `←` yendo a la derecha) se ejecutan en pasos consecutivos, nunca más de 2 en cola y sin perder la primera.
- [ ] Al llegar a la casilla de la fruta, la puntuación sube 10, la serpiente crece una casilla y aparece una nueva fruta en una casilla que no está ocupada por la serpiente.
- [ ] Cada fruta usa un sprite de `FRUIT_SPRITES` sin recortes visibles y centrado en su casilla.
- [ ] El nivel es `1 + floor(frutas / 5)`: pasa a 2 con la 5.ª fruta (50 puntos) y el intervalo entre pasos baja a 130 ms; el intervalo nunca baja de 70 ms.
- [ ] Salirse del tablero por cualquiera de los 4 lados termina la partida (`phase = gameover`).
- [ ] Chocar con el propio cuerpo termina la partida; moverse a la casilla que la cola libera en ese mismo paso (sin comer) **no** la termina.
- [ ] Al terminar por muerte se emite `onGameOver` una sola vez con el score final, se abre «FIN DEL JUEGO», el bucle deja de avanzar la serpiente y las teclas no producen movimiento.
- [ ] Si la serpiente ocupa las 300 casillas, la fase pasa a `won`, se emite `onGameOver` una sola vez con 2 970 puntos y se abre «FIN DEL JUEGO».
- [ ] Si la partida termina con 0 puntos, el modal muestra 0 y «GUARDAR PUNTUACIÓN» muestra el error de puntuación mínima sin crear fila.
- [ ] Pausar con una dirección en cola y reanudar mantiene la dirección y no hace avanzar la serpiente más de un paso de golpe (`dt ≤ 50 ms`).
- [ ] `Ctrl+W` y `Ctrl+A` no son interceptadas por el juego.
- [ ] El spritesheet se carga desde `public/games/snake/` (200 en la pestaña de red), no se descarga ningún audio y la página se renderiza en servidor sin acceder a `Image`, `Audio` ni `window`.

---

## Decisions

- **Sí:** `snake` como slug y SNAKE como título (decisión del usuario); juego nuevo añadido al final del catálogo por migración con `sort_order = 12`, el siguiente libre.
- **Sí:** convive con el mock `serpentina`, que no se modifica ni se reemplaza. Es un juego distinto del catálogo y la skill prohíbe tocar entradas existentes; el parecido temático es casual, como `rocas` frente a `asteroides`.
- **Sí:** color `green` y `cover-snake` reutilizada. Evita CSS nuevo; la portada propia queda para después.
- **Sí:** motor con ciclo de vida y callbacks; HUD y modal en React (patrón SPEC 05).
- **Sí:** estado en closure y `onChange` solo ante cambios.
- **Sí:** guardado vía `saveScore` ya existente; sin cambios al esquema de `scores` (SPEC 06).
- **Sí:** entrada en el registro de juegos reales en lugar de un `if (game.id === ...)`.
- **No:** persistir puntuaciones fuera de Supabase, ni `localStorage` para récords.
- **No:** modificar entradas existentes de `games`.
- **Sí:** juego diseñado desde cero, estilo Google Snake clásico (decisión del usuario): rejilla, muros letales, 10 puntos por fruta, una fruta a la vez, aceleración por nivel.
- **No:** muros que teletransportan al lado opuesto, obstáculos o frutas especiales. Cambiarían las reglas y el ranking; si se quieren, van en otro spec.
- **Sí:** HUD con `lives: 1` constante y `Nivel = 1 + floor(frutas / 5)` (decisión del usuario). Una muerte termina la partida, igual que Tetris; el nivel hace visible la velocidad.
- **No:** 3 vidas. Obligaría a definir el reaparecer y alteraría el cálculo del ranking.
- **Sí:** solo teclado con flechas y `W A S D` (decisión del usuario). `W A S D` va por `event.code`, así que funciona con cualquier distribución de teclado; se ignoran las combinaciones con `Ctrl`/`Alt`/`Meta`.
- **No:** táctil/swipe (fuera de alcance) y nada de ratón.
- **Sí:** cola de direcciones de 2 y descarte de giros de 180°. Es el comportamiento estándar del género y evita muertes por pulsar dos teclas rápido.
- **Sí:** la serpiente espera la primera pulsación para moverse (comportamiento de Google Snake). Evita morir antes de que el jugador haya puesto el foco en el juego. Decisión de diseño de este spec, no confirmada explícitamente por el usuario.
- **Sí:** victoria al llenar el tablero = fin de partida, con `onGameOver` y fase `won`, como en Arkanoid; no hay bucle infinito.
- **Sí:** copiar `fruits.png` a `public/games/snake/` y usar la fila pixel del atlas (decisión del usuario). El motor carga la `Image` dentro de `start()` para no tocar el DOM en el render del servidor. `sprites.js` no se copia porque depende de `window`; su atlas pasa a `constants.ts`.
- **Sí:** el cuerpo y la cabeza de la serpiente se dibujan con formas del canvas: los assets disponibles solo contienen frutas.
- **Sí:** canvas 800×600, rejilla 20×15 de 40 px y tablero verde estilo Google Snake (decisión del usuario). Ya es 4:3 y encaja en `.crt-screen` sin barras. Los 20×15 sustituyen a la rejilla 17×15 que sugería el texto de la pregunta: las casillas de 40 px dan exactamente 800×600.
- **Sí:** `dt` limitado a 50 ms, como los demás motores, y la pausa detiene el acumulador.
- **Sí:** sonido, táctil y modificar `serpentina` quedan fuera de alcance (decisión del usuario).
- **Sí:** textos `short`/`long` propuestos por este spec a partir de las reglas definidas; **pendientes de confirmar** al revisar el borrador.
- **Sí:** los nombres, rutas, el timestamp de la migración y la URL pública del spritesheet son propuesta de este spec; pueden ajustarse al implementar si Next.js lo requiere.

---

## Risks

| Riesgo                                                                                        | Mitigación                                                                                                                                   |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode deja bucles o listeners duplicados.                                               | `destroy()` y criterio de aceptación específico.                                                                                             |
| Eventos de teclado desde el input de iniciales (`W A S D` son letras válidas allí).           | El motor ignora `keydown` de campos de formulario; criterio de aceptación específico.                                                        |
| `setState` por frame degrada el reproductor.                                                  | `onChange` solo ante cambios y callbacks en refs.                                                                                            |
| `requestAnimationFrame`/`window`/`Image` rompen el render en servidor.                        | El motor y la `Image` solo se crean en `useEffect`/`start()`; componente `"use client"`.                                                     |
| Puntuaciones falsificadas desde el cliente / insert público.                                  | Aceptado (SPEC 06): CHECKs de la BD y tope 9 999 999; anti-trampas en otro spec.                                                             |
| Nombre de migración distinto a la versión registrada en Supabase.                             | Comprobar con `list_migrations` y renombrar el archivo.                                                                                      |
| Las coordenadas del atlas recortan mal alguna fruta o sus nombres no coinciden con la imagen. | Verificación visual de las 22 frutas en el paso 4; los nombres del atlas son solo identificadores y se pueden corregir sin afectar al juego. |
| `destroy()` llega antes de que cargue la imagen y el `onload` arranca un bucle huérfano.      | `onload` comprueba una bandera `destroyed` antes de iniciar el bucle; criterio de Strict Mode.                                               |
| La hoja `fruits.png` (3790×442, ~570 KB) tarda en cargar y el canvas queda sin frutas.        | El bucle arranca al cargar la imagen; `onerror` registra el fallo en consola. Sin fallback visual en esta versión.                           |
| La URL `/games/snake/...` de `public/` choca con la ruta de la biblioteca `/games`.           | `public/` solo sirve ficheros existentes; se verifica en el paso 4 y, si choca, se mueve a `public/snake/`.                                  |
| Dos pulsaciones muy rápidas giran la serpiente sobre sí misma y la matan.                     | Cola de 2 direcciones comparadas con la última encolada y descarte de 180°; criterios de aceptación específicos.                             |
| Elegir una casilla libre aleatoria con el tablero casi lleno es lento o no termina.           | Elegir un índice al azar entre la lista de casillas libres (nunca reintentar al azar); si la lista está vacía, victoria.                     |
| Sin sonido ni táctil, la experiencia es más pobre que la de un Snake comercial.               | Declarado fuera de alcance; specs posteriores.                                                                                               |
| Dos juegos parecidos (`serpentina` y `snake`) conviven en el catálogo y se confunden.         | Textos distintos; `serpentina` se resolverá (retirar o revisar) en otro spec.                                                                |
| `snake` no aparece en la home (solo los 6 primeros por `sort_order`).                         | Esperado: se descubre en `/games` y `/salon`; cambiar la home queda fuera de alcance.                                                        |
| `generateStaticParams` de `/juegos/[id]` lee la BD y el juego nuevo no se prerrenderiza.      | Aplicar la migración antes de `npm run build`; leer la guía de `cacheComponents` antes del paso 6.                                           |

---

## What is **not** in this spec

- Cambios al esquema de `scores`, Auth, anti-trampas.
- Sonido y música.
- Controles táctiles (swipe), ratón o gamepad.
- Variantes de reglas: muros con teletransporte, obstáculos, frutas especiales, 3 vidas.
- Reskin neón y portada propia de `snake`; las filas «plana» y «realista» de `fruits.png`.
- Resolver o retirar el mock `serpentina`, y cambios en la home.
- Portar otros juegos.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
