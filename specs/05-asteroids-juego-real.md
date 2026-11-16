# SPEC 05 — Asteroids como primer juego real (`asteroides`)

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-11-15
> **Objective:** Portar el juego `references/started-games/02-asteroids` a un motor TypeScript con canvas y montarlo en `/juegos/asteroides/jugar`, reemplazando la simulación del reproductor para ese juego y alimentando el HUD y el modal de fin de partida de la plataforma con datos reales.

---

## Por qué existe este spec

El SPEC 01 dejó `components/game-player.tsx` como maqueta: el score sube con un temporizador falso, las vidas no cambian y el canvas es un dibujo CSS (`.game-arena`). Asteroids es el primer juego ya construido (`game.js`, ~510 líneas, JS plano con globales, `document.getElementById` y `window.addEventListener` a nivel de módulo). Ese código no se puede importar tal cual en Next.js: hay que encapsularlo en un motor con ciclo de vida (`start`, `pause`, `destroy`) y callbacks hacia React. Este spec fija ese patrón; los juegos siguientes (`references/started-games/03-tetris`, `04-arkanoid`) lo reutilizarán.

---

## Scope

**In:**

- Motor del juego en TypeScript, portado de `game.js` sin cambiar la jugabilidad: clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`; constantes `RADII`, `SPEEDS`, `POINTS`, `POWERUP_*`, `TRIPLE_SPREAD`; envolvimiento toroidal; colisiones; división de asteroides; power-up de disparo triple; invencibilidad al reaparecer; niveles con `3 + level` asteroides.
- Canvas fijo de 800×600 lógico, escalado por CSS al `.crt-screen` (4:3) con la estética vectorial blanca original; el HUD interno del canvas (SCORE, NIVEL, vidas, contador 3x) se elimina porque lo muestra la plataforma.
- Control solo por teclado, igual que el original: `←` `→` rotar, `↑` propulsar, `Espacio` disparar.
- Componente cliente que monta el canvas y expone el motor al reproductor.
- Nueva entrada en `GAMES` (`lib/games.ts`), añadida al final de la lista: `id: "asteroides"`, `title: "ASTEROIDES"`, `cat: "SHOOTER"`, `cover: "cover-rocas"` (se reutiliza el CSS existente, sin portada nueva), `color: "cyan"`, `best: 0`, `plays: "0"` y descripciones `short`/`long` redactadas a partir del README del juego original. Con ella aparecen `/juegos/asteroides` y `/juegos/asteroides/jugar` (vía `generateStaticParams`), la tarjeta en la biblioteca y la pestaña en `/salon`.
- La entrada mock `rocas` **no se modifica ni se reemplaza**: es un juego distinto del catálogo y sigue con la simulación.
- `components/game-player.tsx` usa el motor real cuando `game.id === "asteroides"`: el HUD (Puntuación, Vidas, Nivel) refleja el estado del motor; PAUSA/REANUDAR pausa el motor; FIN termina la partida; al quedarse sin vidas se abre el modal «FIN DEL JUEGO» con la puntuación real; JUGAR DE NUEVO reinicia el motor.
- El resto de ids (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) conservan la simulación actual sin cambios de comportamiento.
- Los listeners de teclado se registran al montar y se eliminan al desmontar; las flechas y el espacio no hacen scroll de la página mientras se juega.

**Out of scope (para specs futuros):**

- Persistir la puntuación (Supabase, `localStorage` u otro); «GUARDAR PUNTUACIÓN» sigue mostrando solo el feedback.
- Tablas `scores`, auth y ranking real; `/salon` y el leaderboard del detalle siguen con datos mock.
- Controles táctiles o gamepad.
- Reskin neón con los tokens de la plataforma; el canvas conserva el look blanco/vectorial.
- Sonido y música.
- OVNIs: el juego original no los tiene; no se añaden.
- Portada propia para `asteroides` (por ahora reutiliza `cover-rocas`) y `best`/`plays` reales.
- Actualizar `best` y `plays` de `lib/games.ts` con datos reales.
- Portar `03-tetris` y `04-arkanoid`.
- Tests automatizados (no hay runner configurado).

---

## Data model

Estado interno del motor (portado de las globales de `game.js`) y contrato con React. No hay persistencia.

```ts
// lib/games/asteroids/types.ts
export type AsteroidsPhase = "playing" | "dead" | "gameover";

export interface AsteroidsSnapshot {
  score: number;
  lives: number;
  level: number;
  phase: AsteroidsPhase;
}

export interface AsteroidsCallbacks {
  /** Se llama solo cuando cambia score, lives, level o phase. */
  onChange: (snapshot: AsteroidsSnapshot) => void;
  /** Se llama una vez cuando lives llega a 0. */
  onGameOver: (finalScore: number) => void;
}

export interface AsteroidsEngine {
  start(): void;
  pause(): void;
  resume(): void;
  /** Reinicia score=0, lives=3, level=1 y vuelve a `playing`. */
  restart(): void;
  /** Termina la partida en curso (botón FIN): dispara onGameOver con el score actual. */
  end(): void;
  /** Cancela el requestAnimationFrame y elimina los listeners. */
  destroy(): void;
}

// lib/games/asteroids/engine.ts
export function createAsteroidsEngine(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsEngine;
```

```tsx
// components/games/asteroids-canvas.tsx  ("use client")
export default function AsteroidsCanvas(props: {
  onReady: (engine: AsteroidsEngine) => void;
  onChange: AsteroidsCallbacks["onChange"];
  onGameOver: AsteroidsCallbacks["onGameOver"];
}): JSX.Element;
```

Convenciones:

- Constantes del juego sin cambios: `W = 800`, `H = 600`, `RADII = [0, 16, 30, 50]`, `SPEEDS = [0, 85, 55, 32]`, `POINTS = [0, 100, 50, 20]`, 3 vidas, 4 asteroides en el nivel 1, `dt` limitado a 50 ms.
- Sin estado global de módulo: todo el estado vive dentro de la closure de `createAsteroidsEngine`, de modo que montar dos veces (React Strict Mode) no comparte estado.
- `onChange` no se llama en cada frame, solo cuando algún valor del snapshot cambia, para no provocar un render de React por frame.
- `pressed('Space')` y las teclas en `justPressed` se resuelven dentro del motor; el motor ignora `keydown` cuyo `target` sea un `input`, `textarea` o `select`.
- Con la fase `gameover` el motor deja de reiniciar con `Espacio`: el reinicio lo dispara la plataforma con `restart()`.
- Ubicación propuesta: `lib/games/asteroids/` (motor, entidades, tipos) y `components/games/asteroids-canvas.tsx`.

---

## Implementation plan

Antes del paso 1 se debe leer en `node_modules/next/dist/docs/` la guía de App Router sobre Client Components (Next.js 16 con `cacheComponents`). El diseño visual no cambia: se reutilizan las clases `.crt`, `.crt-screen`, `.player-hud` y `.modal` existentes, por lo que no se invoca `/frontend-design`.

1. **Tipos y constantes.** Crear `lib/games/asteroids/types.ts` con los tipos del data model y `lib/games/asteroids/constants.ts` con `W`, `H`, `RADII`, `SPEEDS`, `POINTS` y `POWERUP_*`. Verificación: `npx tsc --noEmit` sin errores.
2. **Utilidades y entidades.** Crear `lib/games/asteroids/entities.ts` con `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle` tipadas (`update(dt)`, `draw(ctx)` y bandera `dead`), más `wrap`, `dist`, `rand`, `randInt`. Las clases reciben el contexto 2D en `draw` en vez de usar un `ctx` global. Verificación: `npx tsc --noEmit` sin errores y sin `any`.
3. **Motor.** Crear `lib/games/asteroids/engine.ts` con `createAsteroidsEngine`: estado en closure, `initGame`, `nextLevel`, `killShip`, `update`, `draw` sin HUD, bucle con `requestAnimationFrame`, listeners de teclado en `window`, `preventDefault` en `←` `→` `↑` y `Espacio` y la API `start/pause/resume/restart/end/destroy`. Verificación: `npx tsc --noEmit` sin errores.
4. **Componente de canvas.** Crear `components/games/asteroids-canvas.tsx`: `<canvas width={800} height={600}>` con estilo `width: 100%; height: 100%`, `useEffect` que crea el motor, llama `start()` y devuelve `destroy()` en el cleanup, y callbacks mantenidos en refs para no recrear el motor. Verificación: `npx tsc --noEmit` sin errores.
5. **Entrada en el catálogo.** Añadir `asteroides` al final de `GAMES` en `lib/games.ts` con los valores del Scope. Verificación: `/juegos/asteroides` muestra el detalle, aparece la tarjeta en `/games` y `/juegos/rocas` sigue igual. El reproductor aún usa la simulación para este id.
6. **Integración en el reproductor.** Modificar `components/game-player.tsx`: si `game.id === "asteroides"`, renderizar `AsteroidsCanvas` en lugar de `.game-arena`, derivar `score`, `lives` y `level` del snapshot del motor, enlazar PAUSA/REANUDAR con `pause()`/`resume()`, FIN con `end()`, abrir el modal desde `onGameOver` y JUGAR DE NUEVO con `restart()`. Para los demás ids se mantiene el temporizador falso. Verificación: en `/juegos/asteroides/jugar` se juega con el teclado y el HUD cambia; `/juegos/caida/jugar` se comporta como antes.
7. **Limpieza y responsive.** Verificar que el canvas escala dentro de `.crt-screen` a 375 px y a escritorio sin scroll horizontal, y que no quedan referencias a `document.getElementById` ni a globales en `lib/games/asteroids/`. Ejecutar `npm run lint` y `npm run build`. Verificación: ambos comandos terminan sin errores.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores de TypeScript ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] `/juegos/asteroides/jugar` muestra un canvas con la nave, asteroides en movimiento y sin el HUD interno del original.
- [ ] `←` y `→` rotan la nave, `↑` la propulsa y `Espacio` dispara; la página no hace scroll al pulsar esas teclas.
- [ ] Destruir un asteroide grande suma 20, uno mediano 50 y uno pequeño 100 puntos, y el valor aparece en «Puntuación» del HUD.
- [ ] Un asteroide grande se divide en medianos y uno mediano en pequeños; uno pequeño desaparece sin dividirse.
- [ ] Chocar con un asteroide resta una vida, el HUD muestra una vida menos y la nave reaparece tras 2 segundos con invencibilidad temporal.
- [ ] Al destruir todos los asteroides el «Nivel» del HUD sube en 1 y aparecen `3 + nivel` asteroides.
- [ ] Recoger el power-up activa el disparo triple (tres balas por disparo) durante 5 segundos.
- [ ] Al llegar a 0 vidas se abre el modal «FIN DEL JUEGO» con la puntuación real y el motor no responde a `Espacio`.
- [ ] «PAUSA» detiene asteroides y nave, muestra «EN PAUSA», y «REANUDAR» continúa desde el mismo estado.
- [ ] «FIN» abre el modal con el score acumulado hasta ese momento.
- [ ] «JUGAR DE NUEVO» reinicia con score 0, 3 vidas y nivel 1.
- [ ] Escribir un espacio en el campo de iniciales del modal no dispara ni reinicia el juego.
- [ ] «GUARDAR PUNTUACIÓN» muestra «PUNTUACIÓN GUARDADA_» y no realiza ninguna petición de red ni escribe en `localStorage`.
- [ ] «SALIR» vuelve a `/juegos/asteroides` y, tras salir, las teclas pulsadas ya no producen errores en la consola ni movimiento (listeners eliminados).
- [ ] Con React Strict Mode activo en desarrollo solo hay un bucle de animación y un conjunto de listeners activos.
- [ ] `GAMES` contiene una entrada con `id: "asteroides"` y título «ASTEROIDES», y `/juegos/asteroides` responde 200 con ese título.
- [ ] La biblioteca (`/games`) muestra la tarjeta «ASTEROIDES» además de «ROCAS».
- [ ] `/juegos/rocas/jugar`, `/juegos/caida/jugar` y `/juegos/gloton/jugar` mantienen la simulación actual (score falso, `.game-arena`).
- [ ] La entrada `rocas` de `lib/games.ts` no tiene cambios en el diff.
- [ ] A 375 px de ancho `/juegos/asteroides/jugar` no tiene scroll horizontal y el canvas conserva la proporción 4:3.
- [ ] La consola del navegador no muestra errores de hidratación en `/`, `/juegos/asteroides`, `/juegos/asteroides/jugar` y `/games`.
- [ ] `grep` de `document.getElementById` y `window.` fuera de `engine.ts` en `lib/games/asteroids/` no devuelve resultados.

---

## Decisions

- **Sí:** motor TypeScript con ciclo de vida y callbacks, HUD y modal en React. Reutiliza el HUD, la pausa y el modal ya diseñados en el SPEC 01 y establece el patrón para los siguientes juegos.
- **No:** canvas autónomo con HUD y overlay propios. PAUSA, FIN y el modal de la plataforma quedarían sin función con este juego.
- **No:** `iframe` con el `index.html` original. No hay forma limpia de leer el score ni pausar sin `postMessage`, y duplica el estilo de la página.
- **Sí:** estado dentro de la closure del motor y no en globales de módulo. Evita fugas de estado con Strict Mode y permite reutilizar el patrón en otros juegos.
- **Sí:** `onChange` solo ante cambios reales. Un render de React por frame sería innecesario.
- **Sí:** juego nuevo con id `asteroides` (slug en minúsculas, como el resto de ids) y título «ASTEROIDES». Es una decisión del usuario: no es el mock `rocas`, aunque se parezcan.
- **No:** reutilizar o reemplazar la entrada `rocas`. Es un juego distinto del catálogo; el parecido es casual. Se mantiene simulada.
- **Sí:** reutilizar la clase de portada `cover-rocas` para `asteroides`. Evita CSS nuevo en un spec centrado en el motor; la portada propia queda para después.
- **Sí:** añadir `asteroides` al final de `GAMES`. La home solo muestra `GAMES.slice(0, 6)`, así que su orden actual no cambia.
- **Sí:** el resto de juegos mock sigue simulado. Cada juego real llega con su spec.
- **No:** retirar del catálogo los juegos sin implementar. Cambiaría `lib/games.ts`, la home y el ranking mock sin aportar al objetivo.
- **Sí:** puntuación solo en el modal, sin persistir. El guardado real necesita tablas, RLS y auth (spec de puntuaciones); un almacenamiento temporal se descartaría después.
- **No:** `localStorage` para récord local. Sería un tercer sistema de persistencia sin uso futuro.
- **Sí:** solo teclado, como el original. Los controles táctiles implican UI y multi-touch propios; el detalle ya anuncia «TECLADO / TÁCTIL» y esa promesa queda pendiente para otro spec.
- **Sí:** conservar la estética vectorial blanca. La fidelidad al juego original pesa más que integrarlo con el color de la plataforma; el reskin neón es un cambio aislado para después.
- **Sí:** eliminar el HUD pintado en el canvas. Duplicaría la información que ya muestra `.player-hud`.
- **Sí:** el reinicio tras `gameover` lo controla la plataforma (JUGAR DE NUEVO) y no `Espacio`. Evita reiniciar por accidente mientras se escribe en el modal.
- **Sí:** el motor ignora `keydown` originados en campos de formulario, para que el input de iniciales funcione con normalidad.
- **Sí:** los nombres y rutas de archivos del plan son propuesta de este spec; pueden ajustarse al implementar si Next.js lo requiere.

---

## Risks

| Riesgo                                                                                               | Mitigación                                                                                                         |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Strict Mode monta el efecto dos veces y deja dos bucles o listeners duplicados.                      | `destroy()` cancela el `requestAnimationFrame` y elimina los listeners; criterio de aceptación específico.         |
| Los eventos de teclado llegan aunque el foco esté en el input de iniciales o en otro campo.          | El motor ignora `keydown` con `target` en `input`/`textarea`/`select`; criterio de aceptación específico.          |
| Un `setState` por frame degrada el rendimiento del reproductor.                                      | `onChange` solo se emite cuando cambia el snapshot y los callbacks viven en refs.                                  |
| `requestAnimationFrame` y `window` rompen el render en servidor con `cacheComponents`.               | El motor solo se crea dentro de `useEffect`; el componente es `"use client"` y no accede a `window` al renderizar. |
| El `dt` tras volver a la pestaña provoca saltos o tunelado de colisiones.                            | Se mantiene el límite de 50 ms del original y la pausa detiene la acumulación de tiempo.                           |
| El canvas escalado por CSS se ve borroso en pantallas de alta densidad.                              | Se acepta en esta versión; si molesta, ajustar la resolución con `devicePixelRatio` en un spec posterior.          |
| Las flechas y el espacio hacen scroll o activan el botón enfocado (PAUSA).                           | `preventDefault` sobre esas teclas mientras el motor está activo y la partida no ha terminado.                     |
| Dos juegos parecidos (`rocas` y `asteroides`) conviven en el catálogo y se confunden.                | La descripción de `asteroides` se redacta desde el README real; `rocas` no se toca y se resolverá en otro spec.    |
| El leaderboard y «Mejor global» de `asteroides` muestran datos mock/0 hasta el spec de puntuaciones. | Ya declarado fuera de alcance; `best: 0` evita inventar un récord.                                                 |

---

## What is **not** in this spec

- Modificar, reemplazar o eliminar el juego mock `rocas`.
- Persistencia de puntuaciones, tablas `scores` o auth.
- Ranking real en `/salon` o en el detalle del juego.
- Controles táctiles o gamepad.
- Reskin neón del canvas, sonido u OVNIs.
- Portar Tetris, Arkanoid ni ningún otro juego.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
