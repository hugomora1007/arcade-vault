# SPEC 08 — Arkanoid como juego real (`arkanoid`)

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 06, SPEC 07 (registro de juegos reales)
> **Date:** 2026-11-22
> **Objective:** Portar `references/started-games/04-arkanoid` a un motor TypeScript con canvas, montarlo en `/juegos/arkanoid/jugar`, añadirlo al catálogo por migración y guardar sus puntuaciones en el leaderboard real.

---

## Por qué existe este spec

Arkanoid es el tercer juego real de la plataforma. Sale de `references/started-games/04-arkanoid` (`game.js` ~270 líneas, `levels.js` y `assets/spritesheet.js`, JS plano con globales, `document.getElementById`, `Audio` y `Image` a nivel de módulo). A diferencia de Asteroides y Tetris, usa un **spritesheet PNG** (hay que moverlo a `public/` y cargarlo sin tocar `Image` durante el render en servidor), tiene 5 niveles definidos por datos, una condición de **victoria** además de la derrota y un canvas 800×600 que ya es 4:3. Reutiliza el motor con ciclo de vida del SPEC 05, el guardado/leaderboard del SPEC 06 y el registro `lib/games/registry.ts` creado por el SPEC 07.

Ya existe el mock `bloque-buster` (ARCADE, `cover-bricks`) con temática de rompe-ladrillos. Es un juego distinto del catálogo y no se toca, igual que `rocas` frente a `asteroides` y `caida` frente a `tetris`.

---

## Scope

**In:**

- Motor en TypeScript `lib/games/arkanoid/{types,constants,levels,entities,engine}.ts` portado de `references/started-games/04-arkanoid/{game.js,levels.js,assets/spritesheet.js}` sin cambiar la jugabilidad: paleta, pelota, 5 niveles de bloques (`LEVELS`), colisión AABB pelota-bloque (un bloque por frame), rebotes en paredes y paleta, 3 vidas, 10 puntos por bloque, velocidad de pelota por nivel, animación de explosión de 4 frames al destruir un bloque y victoria al limpiar el nivel 5.
- Canvas lógico 800×600 (ya 4:3), escalado por CSS dentro de `.crt-screen`. Estética del original: fondo negro y sprites del spritesheet. El HUD interno (Score, Nivel, bolas de vida) y los overlays de GAME OVER, victoria y pausa del original se eliminan: los muestra la plataforma.
- Assets: `assets/spritesheet-breakout.png` se copia a `public/games/arkanoid/spritesheet-breakout.png`. El motor crea la `Image` dentro de `start()` (nunca en el render) y no arranca el bucle hasta que carga.
- Controles: solo teclado. `←` `→` mover la paleta. Sin ratón, sin táctil y sin las teclas `P`/`Escape` del original: la pausa es el botón PAUSA de la plataforma.
- Componente cliente `components/games/arkanoid-canvas.tsx`.
- Nueva entrada `arkanoid` en `lib/games/registry.ts` (`REAL_GAMES`), junto a `asteroides` y `tetris`.
- Migración `supabase/migrations/20261122120000_add_game_arkanoid.sql` que inserta en `games`: `id: "arkanoid"`, `title: "ARKANOID"`, `cat: "ARCADE"`, `cover: "cover-bricks"`, `color: "magenta"`, `sort_order: 11`, `short`/`long` (ver Data model). Aplicada con el MCP de Supabase y tipos regenerados. No se modifica el esquema de `scores`.
- «GUARDAR PUNTUACIÓN» llama a `saveScore` (ya genérica) para `arkanoid`; aparece en `/salon?juego=arkanoid` y en el leaderboard del detalle con `best`/`plays` reales.
- Listeners de teclado registrados al montar y eliminados al desmontar; sin scroll de página con las teclas del juego.

**Out of scope (para specs futuros):**

- Cambios al esquema de `scores`, Auth, `user_id`, anti-trampas, rate limiting.
- Sonido: `ball-bounce.mp3` y `break-sound.mp3` no se copian ni se reproducen.
- Control con ratón, controles táctiles o gamepad.
- El selector de nivel del overlay de pausa del original (permitiría saltarse niveles y distorsionar el ranking) y las teclas `P`/`Escape`.
- Ángulo de rebote según el punto de impacto en la paleta u otros cambios de jugabilidad.
- Portada propia de `arkanoid` (reutiliza `cover-bricks`) y reskin neón del canvas.
- Modificar o reemplazar entradas existentes de `games` (incluida `bloque-buster`).
- Tests automatizados (no hay runner configurado).

---

## Data model

Contrato del motor (mismo patrón que SPEC 05 y 07):

```ts
// lib/games/arkanoid/types.ts
export type ArkanoidPhase = "playing" | "won" | "gameover";

export interface ArkanoidSnapshot {
  score: number;
  lives: number; // vidas restantes: 3 al empezar, 0 al perder la última
  level: number; // nivel actual, 1..5
  phase: ArkanoidPhase;
}

export interface ArkanoidCallbacks {
  /** Solo cuando cambia algún valor del snapshot. */
  onChange: (snapshot: ArkanoidSnapshot) => void;
  /** Una vez al terminar la partida (derrota, victoria o botón FIN). */
  onGameOver: (finalScore: number) => void;
}

export interface ArkanoidEngine {
  start(): void; // crea la Image del spritesheet y arranca el bucle al cargar
  pause(): void;
  resume(): void;
  restart(): void; // score=0, lives=3, level=1, paleta centrada y vuelve a `playing`
  end(): void; // botón FIN: dispara onGameOver con el score actual
  destroy(): void; // cancela requestAnimationFrame y elimina listeners
}

// lib/games/arkanoid/engine.ts
export function createArkanoidEngine(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoidCallbacks,
): ArkanoidEngine;
```

Entrada del registro (sin cambios en el contrato común del SPEC 07):

```ts
// lib/games/registry.ts
arkanoid: {
  Canvas: ArkanoidCanvas,
  initialSnapshot: { score: 0, lives: 3, level: 1, phase: "playing" },
},
```

Fila de catálogo (migración, valores literales, textos confirmados). `sort_order = 11` es el siguiente libre: la tabla `games` tiene hoy `sort_order` 1..10 (comprobado con `execute_sql`; `tetris` es el 10):

```sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'arkanoid',
  'ARKANOID',
  'Rompe todos los bloques sin dejar caer la pelota.',
  'Mueve la paleta para rebotar la pelota y destruir los bloques de 5 niveles con patrones distintos. Cada bloque suma 10 puntos y la pelota se acelera un 10 % por nivel. Tienes 3 vidas: si la pelota cae por debajo de la paleta pierdes una.',
  'ARCADE',
  'cover-bricks',
  'magenta',
  11
);
```

Constantes del juego (valores exactos del original):

- Canvas lógico `W = 800`, `H = 600`.
- Paleta: `x` inicial `(800 - 81) / 2`, `y = 560`, `w = 81`, `h = 14` (el sprite `paddle` mide 162×14 y se dibuja escalado a 81×14, como en `game.js`), `PADDLE_SPEED = 400` px/s.
- Pelota: `w = h = 16`; posición inicial sobre la paleta: `x = paddle.x + (paddle.w - 16) / 2`, `y = paddle.y - 16`; velocidad `vx = 200 * speed`, `vy = -300 * speed` (`BASE_BALL_VX = 200`, `BASE_BALL_VY = -300`). Arranca sola, sin esperar tecla.
- Bloques: `BLOCK_COLS = 10`, `BLOCK_ROWS = 6`, `BLOCK_W = 64`, `BLOCK_H = 24`, origen `x = (800 - 10 * 64) / 2 = 80`, `y = 80`. Posición del bloque: `x = 80 + col * 64`, `y = 80 + row * 24`.
- Puntos: 10 por bloque.
- Vidas iniciales: 3.
- `LEVELS` (velocidad × patrón; `blocks[]` con `{ col, row, color }`), generados con la misma lógica de `levels.js`:

  | Nivel | `speed` | Patrón                                                                                                                                                  | Bloques |
  | ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
  | 1     | 1.00    | Parrilla completa 10×6, colores por fila `red, yellow, cyan, magenta, hotpink, green`                                                                   | 60      |
  | 2     | 1.10    | Pirámide: `colInicio = [4,3,2,1,0,0]`, `colFin = [5,6,7,8,9,9]`, colores por fila `gray, cyan, hotpink, yellow, magenta, green`                         | 40      |
  | 3     | 1.21    | Tablero de ajedrez: `(col + row) % 2 === 0`, `yellow` en filas 0–2 y `magenta` en 3–5                                                                   | 30      |
  | 4     | 1.33    | Filas con huecos: `[2,5,8]`, `[0,4,7,9]`, `[1,3,6]`, `[2,5,8,9]`, `[0,4,7]`, `[1,3,6,9]`; colores por fila `cyan, magenta, green, yellow, hotpink, red` | 39      |
  | 5     | 1.46    | Marco (col 0, col 9, fila 0, fila 5) + cruz (col 4 y fila 2); `cyan` en el marco, `hotpink` en la cruz interior                                         | 39      |

  Total 208 bloques: una partida perfecta suma 2 080 puntos.

- Sprites (recortes del spritesheet, `sx, sy, sw, sh`): `paddle 32,112,162,14`; `ball 32,32,16,16`; bloques de 32×16 en `sx = 32` con `sy`: `red 176`, `cyan 192`, `green 208`, `magenta 224`, `yellow 240`, `hotpink 256`, `gray 288`.
- Explosión: `EXPLOSION_DURATION = 150` ms, 4 frames de 32×16 en `sx = 256, 288, 320, 352` con `sy` por color: `red 176`, `cyan 192`, `green 208`, `magenta 224`, `yellow 240`, `hotpink 256`; `gray` reutiliza los frames de `red`. Frame mostrado: `min(floor(elapsed / 150 * 4), 3)`.
- `dt` limitado a 50 ms (el original no lo limita; divergencia deliberada, ver Decisions).

Convenciones:

- Sin estado global de módulo: todo vive en la closure de `createArkanoidEngine` (Strict Mode no comparte estado). La `Image` del spritesheet se crea en `start()` y se libera en `destroy()`.
- `onChange` no se emite por frame, solo ante cambios reales del snapshot (`score`, `lives`, `level` o `phase`).
- Las entidades reciben `ctx` en `draw`; sin `document.getElementById`.
- El motor ignora `keydown` cuyo `target` sea `input`, `textarea` o `select`, y hace `preventDefault` de `←` y `→` mientras la partida está activa.
- Las teclas pulsadas se vacían en `restart()`, al pausar y al perder el foco de la ventana, para que la paleta no quede «pegada» si se suelta una tecla fuera del juego.
- Tras `gameover` o `won` el motor no se reinicia con teclas: lo hace la plataforma con `restart()`.
- La pausa detiene la acumulación de tiempo: al reanudar se reinicia la referencia de tiempo para que `dt` no incluya el tiempo en pausa.
- Al limpiar un nivel (no el 5) se carga el siguiente: se regeneran los bloques, se vacían las explosiones y la pelota vuelve a la paleta con la velocidad del nuevo nivel; la paleta no se recoloca y no se pierde ninguna vida.
- La puntuación enviada es un entero entre 1 y 9 999 999; el ranking ordena por `score` desc y `created_at` asc. El máximo posible es 2 080.

---

## Implementation plan

Antes del paso 1: leer en `node_modules/next/dist/docs/` la guía de Client Components y, para el paso 6, la de `generateStaticParams`/`cacheComponents` (Next.js 16). El diseño de la plataforma no cambia (se reutilizan `.crt`, `.crt-screen`, `.player-hud` y `.modal`), por lo que no se invoca `/frontend-design`: no hay UI nueva.

1. **Tipos, constantes y niveles.** Crear `lib/games/arkanoid/types.ts`, `constants.ts` (incluidos `SPRITES`, `EXPLOSION_FRAMES` y `EXPLOSION_DURATION`) y `levels.ts` con `LEVELS` generado como en `levels.js`. Verificación: `npx tsc --noEmit` sin errores y `LEVELS.map(l => l.blocks.length)` igual a `[60, 40, 30, 39, 39]`.
2. **Entidades.** Crear `lib/games/arkanoid/entities.ts` tipado y sin `any`: `Paddle`, `Ball`, `Block`, `Explosion`, `collideAABB` y funciones de dibujo (`drawSprite`, `drawFrame`) que reciben `ctx` y la imagen como parámetros. Verificación: `npx tsc --noEmit` sin errores.
3. **Motor.** Crear `lib/games/arkanoid/engine.ts` con `createArkanoidEngine`: estado en closure, `initPaddle`, `initBall`, `loadLevel`, `update`, `draw` sin HUD ni overlays, carga de la `Image` en `start()`, bucle con `requestAnimationFrame`, listeners `keydown`/`keyup`/`blur` en `window`, `preventDefault` en `←` `→` y la API `start/pause/resume/restart/end/destroy`. Verificación: `npx tsc --noEmit` sin errores.
4. **Assets y componente de canvas.** Copiar `references/started-games/04-arkanoid/assets/spritesheet-breakout.png` a `public/games/arkanoid/spritesheet-breakout.png` (sin copiar los `.mp3`, `spritesheet.js` ni `.DS_Store`). Crear `components/games/arkanoid-canvas.tsx` (`"use client"`): `<canvas width={800} height={600}>` con `width: 100%; height: 100%`, `useEffect` que crea el motor, llama `start()` y devuelve `destroy()` en el cleanup, callbacks en refs, tipado contra `GameCanvasProps`. Verificación: `npx tsc --noEmit` sin errores y `/games/arkanoid/spritesheet-breakout.png` responde 200 en `next dev`. Si esa URL choca con la ruta `/games` de la biblioteca, mover el fichero a `public/arkanoid/` y ajustar la constante de URL del motor.
5. **Registro.** Añadir la entrada `arkanoid` a `REAL_GAMES` en `lib/games/registry.ts`. `components/game-player.tsx` no necesita cambios (ya resuelve por registro). Verificación: `/juegos/asteroides/jugar` y `/juegos/tetris/jugar` se comportan igual y `/juegos/caida/jugar` sigue simulado.
6. **Migración del catálogo.** Crear `supabase/migrations/20261122120000_add_game_arkanoid.sql` y aplicarla con `apply_migration`; el nombre del archivo debe coincidir con la versión que registre Supabase (`list_migrations`). Regenerar `lib/supabase/database.types.ts`. Verificación: `list_tables`/`execute_sql` muestran `arkanoid` con `sort_order = 11`, `get_advisors` (security) limpio y `/juegos/arkanoid` responde 200.
7. **Guardado y leaderboard.** Comprobar que `saveScore` persiste para `arkanoid` y que `/salon?juego=arkanoid` y `/juegos/arkanoid` muestran la fila; `Partidas` y `Mejor global` se actualizan. Verificación: jugar, guardar `AAA` y confirmar la fila con `execute_sql`.
8. **Limpieza y responsive.** Sin `document.getElementById`, `Audio` ni globales de módulo en `lib/games/arkanoid/`; el canvas escala a 375 px sin scroll horizontal. Ejecutar `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores.

---

## Acceptance criteria

Comunes:

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos/arkanoid/jugar` muestra el canvas del juego sin HUD interno de Score, Nivel ni vidas.
- [ ] `←` y `→` mueven la paleta y la página no hace scroll al pulsarlas.
- [ ] El HUD (Puntuación, Vidas, Nivel) refleja el estado real del motor.
- [ ] «PAUSA» detiene el juego y muestra «EN PAUSA»; «REANUDAR» continúa desde el mismo estado.
- [ ] «FIN» abre el modal con el score acumulado; al terminar la partida se abre «FIN DEL JUEGO» con la puntuación real.
- [ ] «JUGAR DE NUEVO» reinicia el juego al estado inicial.
- [ ] Escribir en el campo de iniciales (incluido un espacio) no dispara ni reinicia el juego.
- [ ] «SALIR» vuelve a `/juegos/arkanoid` y las teclas ya no producen errores ni movimiento (listeners eliminados).
- [ ] Con React Strict Mode solo hay un bucle de animación y un conjunto de listeners.
- [ ] Escribir `abc`, guardar y ver «PUNTUACIÓN GUARDADA_» crea una fila en `scores` con `game_id = 'arkanoid'`, `player_name = 'ABC'` y el score real.
- [ ] Doble clic en «GUARDAR PUNTUACIÓN» crea una sola fila; con fallo de red se muestra error y se puede reintentar.
- [ ] `/salon?juego=arkanoid` y el detalle `/juegos/arkanoid` muestran la puntuación guardada al recargar; `Partidas` = `COUNT` y `Mejor global` = `MAX` de `scores`.
- [ ] `arkanoid` aparece en `/games` con su título, portada (`cover-bricks`) y color (`magenta`); no aparece en la home, que muestra solo los 6 primeros por `sort_order`.
- [ ] `asteroides` y `tetris` mantienen su comportamiento y su ranking sin cambios; `/juegos/bloque-buster/jugar`, `/juegos/caida/jugar` y `/juegos/rocas/jugar` siguen con la simulación actual.
- [ ] `list_migrations` muestra la migración; `get_advisors` (security) sin avisos nuevos.
- [ ] A 375 px `/juegos/arkanoid/jugar` no tiene scroll horizontal y el canvas conserva la proporción 4:3.
- [ ] Sin errores de hidratación en `/`, `/games`, `/salon`, `/juegos/arkanoid`, `/juegos/arkanoid/jugar`.
- [ ] `grep` de `document.getElementById`, `window.` (fuera de `engine.ts`), `SERVICE_ROLE` en `lib/games/arkanoid/`, `app/`, `components/` no devuelve resultados.
- [ ] La fila `bloque-buster` de `games` no tiene cambios (misma `id`, `title`, `short`, `long`, `cat`, `cover`, `color`, `sort_order`).

Específicos del juego (derivados de `references/started-games/04-arkanoid/{game.js,levels.js,README.md}`):

- [ ] El canvas lógico es 800×600 con fondo negro; los bloques miden 64×24, están alineados a una rejilla de 10 columnas con origen en `x = 80`, `y = 80`, y la paleta está en `y = 560`.
- [ ] Al empezar se ve el nivel 1 (60 bloques en 6 filas con los colores `red, yellow, cyan, magenta, hotpink, green`), la paleta centrada y la pelota sobre ella que se mueve sola hacia arriba y a la derecha sin pulsar ninguna tecla.
- [ ] La paleta se mueve a 400 px/s con `←` y `→` y no sale del canvas (`0 ≤ x ≤ 800 - 81`); mantener las dos teclas a la vez no la desplaza más allá de sus límites.
- [ ] La pelota rebota en las paredes izquierda, derecha y techo, y no rebota en el borde inferior.
- [ ] Si la pelota baja sobre la paleta (`vy > 0`, solapamiento horizontal y su borde inferior entre `paddle.y` y `paddle.y + 14 + 8`), rebota hacia arriba (`vy = -|vy|`) y queda apoyada en `paddle.y - 16`.
- [ ] Al chocar con un bloque vivo, este desaparece, `vy` se invierte, la puntuación sube 10 y solo se procesa un bloque por frame.
- [ ] Al destruir un bloque se muestra una animación de 4 frames del spritesheet de 150 ms en su posición y desaparece al terminar.
- [ ] Si la pelota supera `y > 600` y quedan vidas, el HUD muestra una vida menos y la pelota reaparece sobre la paleta con la velocidad del nivel actual; la paleta no se recoloca, el nivel y los bloques restantes se conservan.
- [ ] Al perder la tercera vida, `lives` pasa a 0, se emite `onGameOver` una sola vez con el score final, se abre «FIN DEL JUEGO», el bucle se detiene y las teclas no producen movimiento.
- [ ] Al destruir el último bloque de un nivel del 1 al 4, el «Nivel» del HUD sube en 1, aparece el patrón del nivel siguiente (40, 30, 39 y 39 bloques para los niveles 2 a 5), la pelota vuelve a la paleta, el score y las vidas se conservan.
- [ ] La velocidad inicial de la pelota es `(200 × speed, -300 × speed)` con `speed` 1.00, 1.10, 1.21, 1.33 y 1.46 para los niveles 1 a 5.
- [ ] Al destruir el último bloque del nivel 5 la fase pasa a `won`, se emite `onGameOver` una sola vez con el score final, se abre «FIN DEL JUEGO» y el HUD conserva las vidas restantes.
- [ ] Una partida perfecta (los 208 bloques sin perder ninguna vida) termina con 2 080 puntos.
- [ ] Si la partida termina con 0 puntos, el modal muestra 0 y «GUARDAR PUNTUACIÓN» muestra el error de puntuación mínima sin crear fila.
- [ ] Las teclas `P` y `Escape` no pausan el juego; solo lo hace el botón PAUSA, y tras reanudar la pelota no avanza más de un frame de movimiento de golpe (`dt ≤ 50 ms`).
- [ ] No existe ningún selector de nivel ni control por ratón: mover el ratón sobre el canvas no desplaza la paleta.
- [ ] No se descarga ningún `.mp3` ni se crea ningún `Audio` en `/juegos/arkanoid/jugar` (pestaña de red y `grep` de `Audio` en `lib/games/arkanoid/`).
- [ ] El spritesheet se carga desde `public/games/arkanoid/` (200 en la pestaña de red) y la página se renderiza en servidor sin acceder a `Image`, `Audio` ni `window`.

---

## Decisions

- **Sí:** `arkanoid` como slug y ARKANOID como título; juego nuevo añadido al final del catálogo por migración con `sort_order = 11`, el siguiente libre.
- **Sí:** convive con el mock `bloque-buster`, que no se modifica ni se reemplaza. Es un juego distinto del catálogo y la skill prohíbe tocar entradas existentes; el parecido temático es casual, como `rocas` frente a `asteroides`.
- **Sí:** color `magenta` y `cover-bricks` reutilizada (decisión del usuario). Se distingue de `bloque-buster` (cyan) sin CSS nuevo; la portada propia queda para después.
- **Sí:** motor con ciclo de vida y callbacks; HUD y modal en React (patrón SPEC 05).
- **Sí:** estado en closure y `onChange` solo ante cambios.
- **Sí:** guardado vía `saveScore` ya existente; sin cambios al esquema de `scores` (SPEC 06).
- **Sí:** entrada en el registro de juegos reales creado por el SPEC 07 en lugar de un `if (game.id === ...)`.
- **No:** persistir puntuaciones fuera de Supabase, ni `localStorage` para récords.
- **No:** modificar entradas existentes de `games`.
- **Sí:** mapeo del HUD directo: Puntuación = score, Vidas = vidas restantes (3 → 0) y Nivel = nivel actual (1–5). El juego ya los tiene, no hay flags por juego ni UI nueva.
- **Sí:** victoria = fin de partida (decisión del usuario). Al limpiar el nivel 5 se emite `onGameOver` con el score final y la fase `won`, igual que perder las 3 vidas; mantiene la jugabilidad original y no necesita una vía distinta en la plataforma.
- **No:** bucle infinito tras el nivel 5. Cambiaría la jugabilidad original y obligaría a diseñar una curva de dificultad.
- **Sí:** solo teclado `←` `→` (decisión del usuario), coherente con Asteroides y Tetris y sin listeners de ratón sobre el canvas.
- **No:** ratón, `P`/`Escape` ni selector de nivel. La plataforma ya tiene PAUSA y mantener la tecla obligaría a sincronizar dos fuentes del estado de pausa; el selector permitiría saltar niveles y falsear el ranking.
- **Sí:** spritesheet en `public/games/arkanoid/` y usado por el motor (decisión del usuario). La fidelidad visual depende de él; la `Image` se crea dentro de `start()` para no tocar el DOM en el render del servidor.
- **No:** sonido en este spec (decisión del usuario). Los otros juegos no tienen sonido; implicaría autoplay, silenciar y volumen. Los mp3 se quedan en `references/`.
- **Sí:** estética original, fondo negro y sprites (decisión del usuario); fidelidad al juego, igual que Asteroides y Tetris. Se elimina el HUD y los overlays del canvas porque los muestra la plataforma.
- **Sí:** canvas 800×600 sin cambios: ya es 4:3 y encaja en `.crt-screen` sin barras.
- **Sí:** jugabilidad tal cual (decisión del usuario): física AABB, un bloque por frame, rebote de paleta sin ángulo, pelota que arranca sola y paleta de 81 px de ancho lógico con el sprite de 162 px escalado, como el original.
- **Sí:** `dt` limitado a 50 ms, como Asteroides y Tetris. Divergencia deliberada respecto al original (no lo limita): evita que la pelota atraviese bloques o la paleta tras volver a la pestaña.
- **Sí:** vaciar las teclas pulsadas al pausar, reiniciar o perder el foco. Sin ello una tecla soltada fuera del juego dejaría la paleta moviéndose.
- **Sí:** el ranking usa el score del original (10 por bloque, máximo 2 080); `FIN` dispara `onGameOver` con el score actual.
- **Sí:** textos `short`/`long` propuestos a partir del README y confirmados por el usuario.
- **Sí:** los nombres, rutas y la URL pública del spritesheet son propuesta de este spec; pueden ajustarse al implementar si Next.js lo requiere.

---

## Risks

| Riesgo                                                                                      | Mitigación                                                                                                                           |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Strict Mode deja bucles o listeners duplicados.                                             | `destroy()` y criterio de aceptación específico.                                                                                     |
| Eventos de teclado desde el input de iniciales.                                             | El motor ignora `keydown` de campos de formulario.                                                                                   |
| `setState` por frame degrada el reproductor.                                                | `onChange` solo ante cambios y callbacks en refs.                                                                                    |
| `requestAnimationFrame`/`window`/`Image` rompen el render en servidor.                      | El motor y la `Image` solo se crean en `useEffect`/`start()`; componente `"use client"`.                                             |
| Puntuaciones falsificadas desde el cliente / insert público.                                | Aceptado (SPEC 06): CHECKs de la BD y tope 9 999 999; anti-trampas en otro spec.                                                     |
| Nombre de migración distinto a la versión registrada en Supabase.                           | Comprobar con `list_migrations` y renombrar el archivo.                                                                              |
| El spritesheet tarda en cargar o falla y el canvas queda negro.                             | El bucle arranca al cargar la imagen; `onerror` registra el fallo en consola. Sin fallback visual en esta versión.                   |
| `destroy()` llega antes de que cargue la imagen y el `onload` arranca un bucle huérfano.    | `onload` comprueba una bandera `destroyed` antes de iniciar el bucle; criterio de Strict Mode.                                       |
| La URL `/games/arkanoid/...` de `public/` choca con la ruta de la biblioteca `/games`.      | `public/` solo sirve ficheros existentes; se verifica en el paso 4 y, si choca, se mueve a `public/arkanoid/`.                       |
| Tunelado de la pelota con `dt` grande o a velocidad ×1.46 (≈ 440 px/s).                     | `dt ≤ 50 ms` (≈ 22 px por frame, menor que el alto de bloque 24 px); la colisión AABB conserva el comportamiento original.           |
| Pelota atascada en un bucle horizontal sin ángulo de rebote (la física original no varía).  | Se acepta la jugabilidad original; el ángulo por punto de impacto queda para otro spec.                                              |
| Sin sonido, la experiencia es más pobre que la del original.                                | Declarado fuera de alcance; spec posterior de sonido para todos los juegos con silenciar.                                            |
| Dos juegos parecidos (`bloque-buster` y `arkanoid`) conviven en el catálogo y se confunden. | Color y textos distintos; `bloque-buster` se resolverá (retirar o revisar) en otro spec.                                             |
| El texto del canvas escalado a 375 px se ve borroso (sprites pixelados se suavizan).        | Se acepta en esta versión, como en Asteroides; ajustar `imageSmoothingEnabled` o `devicePixelRatio` en un spec posterior si molesta. |
| `arkanoid` no aparece en la home (solo los 6 primeros por `sort_order`).                    | Esperado: se descubre en `/games` y `/salon`; cambiar la home queda fuera de alcance.                                                |
| `generateStaticParams` de `/juegos/[id]` lee la BD y el juego nuevo no se prerrenderiza.    | Aplicar la migración antes de `npm run build`; leer la guía de `cacheComponents` antes del paso 6.                                   |

---

## What is **not** in this spec

- Cambios al esquema de `scores`, Auth, anti-trampas.
- Sonido y música (los mp3 del original no se copian).
- Control con ratón, controles táctiles o gamepad, teclas `P`/`Escape` y selector de nivel.
- Ángulo de rebote por punto de impacto y otros cambios de jugabilidad.
- Reskin neón y portada propia de `arkanoid`.
- Resolver o retirar el mock `bloque-buster`, y cambios en la home.
- Portar otros juegos.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
