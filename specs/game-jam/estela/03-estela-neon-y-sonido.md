# ESTELA: portada propia, brillo neón y sonido (`estela`)

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07 (registro de juegos reales), game-jam/estela/01, game-jam/estela/02
> **Date:** 2026-11-25
> **Objective:** Dar a ESTELA identidad visual y sonora propias con la portada `cover-estela`, estelas con brillo neón, partículas de choque y efectos de sonido sintetizados que se pueden silenciar con `M`, sin cambiar las reglas ni la puntuación.

---

## Por qué existe este spec

Nace de la game jam con el tema «ESTELA — motos de luz que dejan un muro de neón» y pule el juego de `01-estela-juego-real.md` y `02-estela-sectores-y-turbo.md`. El tema pide literalmente un **muro de neón**: en el 01 las estelas son rectángulos planos y ESTELA comparte la portada `cover-duelo` con el mock `duelo-pixel`, así que en `/games` las dos tarjetas VERSUS se confunden. Este spec resuelve ambas cosas y añade la sensación de choque que la rejilla plana no transmite (partículas, destello y sonido).

Es el primer juego real con sonido: Arkanoid tenía `.mp3` en `references/` y se dejaron fuera (SPEC 08). Aquí no hay assets de audio: los efectos se **sintetizan con Web Audio** dentro del motor, sin ficheros en `public/`. La portada es una clase CSS nueva en `app/globals.css`, como el resto de `cover-*`. Las reglas, la puntuación y el ranking del 02 no cambian.

---

## Scope

**In:**

- **Portada `cover-estela`** en `app/globals.css`, diseñada con `/frontend-design` siguiendo el patrón de las demás portadas (fondo + `::after` con gradientes, sin imágenes): fondo `#05050f`, rejilla en perspectiva tenue y dos estelas, cyan y magenta, que giran en ángulo recto y se cortan, con brillo `drop-shadow`.
- **Migración** `supabase/migrations/20261125214000_update_game_estela_cover.sql` que cambia solo `cover` de la fila `estela` a `cover-estela`.
- **Brillo neón en el canvas:** capa de estelas fuera de pantalla con `shadowBlur`, pintada de forma incremental (solo las casillas nuevas de cada subpaso) y volcada con `drawImage` en cada frame; cabezas con brillo propio.
- **Partículas de choque:** 24 partículas del color de la moto por cada choque, y un destello de pantalla cuando choca el jugador.
- **Sonido sintetizado** (Web Audio API) para inicio de ronda, choque de rival, encierro, choque del jugador, sector superado, turbo, chispa y eliminación múltiple.
- **Silenciar:** tecla `M` (`event.code === "KeyM"`) alterna sonido sí/no; con el sonido silenciado se dibuja «SONIDO: NO» en la esquina inferior derecha del canvas.
- Cambios en `lib/games/estela/` (`constants.ts`, `entities.ts`, `engine.ts` y un nuevo `audio.ts`), `app/globals.css` y la migración. Sin cambios en `lib/games/registry.ts` ni en `components/game-player.tsx`.

**Out of scope (para specs futuros):**

- Cambios al esquema de `scores`, Auth, `user_id`, anti-trampas, rate limiting.
- Cambios de reglas, puntuación, velocidad o IA (son los del 02).
- Música de fondo, zumbido continuo del motor y ficheros de audio (`.mp3`, `.wav`).
- Persistir la preferencia de silencio entre partidas o páginas (`localStorage`, cookies).
- Botón de silencio en la UI de la plataforma (`game-player.tsx`) y un sistema de sonido común para todos los juegos.
- Controles táctiles (swipe), ratón, gamepad y vibración.
- Escalado con `devicePixelRatio` del canvas.
- Modificar o reemplazar otras entradas de `games` (incluida `duelo-pixel`, que conserva `cover-duelo`).
- Tests automatizados (no hay runner configurado).

---

## Data model

El contrato del motor **no cambia** (el del 01, con las ampliaciones internas del 02):

```ts
// lib/games/estela/types.ts (sin cambios respecto al 01 y al 02)
export type EstelaPhase = "ready" | "playing" | "roundover" | "gameover";

export interface EstelaSnapshot {
  score: number; // igual que en el 02: el pulido no da ni quita puntos
  lives: number; // motos restantes: 3 al empezar, 0 al perder la última
  level: number; // sector actual: 1 + rondas ganadas
  phase: EstelaPhase;
}

export interface EstelaCallbacks {
  /** Solo cuando cambia algún valor del snapshot. */
  onChange: (snapshot: EstelaSnapshot) => void;
  /** Una vez al terminar la partida (última moto perdida o botón FIN). */
  onGameOver: (finalScore: number) => void;
}

export interface EstelaEngine {
  start(): void; // además: crea la capa de estelas; el AudioContext se crea en la primera tecla
  pause(): void; // además: suspende el AudioContext
  resume(): void; // además: reanuda el AudioContext
  restart(): void; // además: vacía partículas; conserva el estado de silencio
  end(): void;
  destroy(): void; // además: cierra el AudioContext y libera la capa de estelas
}

export function createEstelaEngine(
  canvas: HTMLCanvasElement,
  callbacks: EstelaCallbacks,
): EstelaEngine;
```

Tipos internos nuevos:

```ts
// lib/games/estela/types.ts
export interface Particle {
  x: number;
  y: number;
  vx: number; // px/s
  vy: number; // px/s
  age: number; // ms
  color: string;
}
export type SoundId =
  | "roundStart"
  | "rivalCrash"
  | "trap"
  | "playerCrash"
  | "sectorClear"
  | "turbo"
  | "spark"
  | "multi";

// lib/games/estela/audio.ts
export interface EstelaAudio {
  play(id: SoundId): void; // no hace nada si está silenciado o sin AudioContext
  unlock(): void; // crea o reanuda el AudioContext (llamado desde keydown)
  setMuted(muted: boolean): void;
  suspend(): void;
  resume(): void;
  close(): void;
}
export function createEstelaAudio(): EstelaAudio;
```

Entrada del registro: sin cambios (`initialSnapshot: { score: 0, lives: 3, level: 1, phase: "ready" }`).

Migración de la portada (valores literales; solo toca la fila `estela` creada por el 01):

```sql
update public.games
set cover = 'cover-estela'
where id = 'estela';
```

Constantes nuevas (diseño de este spec):

- Capa de estelas: `HTMLCanvasElement` de 800×600 creado con `document.createElement("canvas")` dentro de `start()` (nunca en el render), limpiado en `initRound()`. Cada casilla nueva se pinta con el color de su moto a `globalAlpha = 0.7`, `shadowBlur = 12` y `shadowColor` = color de la moto. Los obstáculos del 02 se pintan sin brillo (`shadowBlur = 0`).
- Cabezas: dibujadas en el canvas principal en cada frame con `shadowBlur = 18`; núcleo `#e6e9ff` de 8×8 como en el 01.
- Estela de una moto eliminada: al chocar se repinta su estela en la capa a `globalAlpha = 0.2` sin brillo (una vez, no por frame).
- Partículas: `PARTICLES_PER_CRASH = 24`, velocidad aleatoria entre 60 y 180 px/s en dirección aleatoria, `PARTICLE_LIFE_MS = 600`, cuadrados de 3×3 px con opacidad `1 - age / 600`, máximo `MAX_PARTICLES = 96` (si se supera, se descartan las más antiguas). Se mueven con el `dt` del frame (limitado a 50 ms) y se congelan en pausa. Siguen animándose durante `roundover`.
- Destello al chocar el jugador: rectángulo 800×600 `#e6e9ff` con opacidad inicial 0,25 que baja a 0 en 200 ms.
- Audio: un `AudioContext` por motor, creado en la primera pulsación de una tecla de juego (política de autoplay), con un `GainNode` maestro a 0,25. Efectos (oscilador + envolvente de ganancia con ataque 5 ms y caída exponencial):

  | `SoundId`     | Cuándo                                      | Síntesis                                                     | Duración |
  | ------------- | ------------------------------------------- | ------------------------------------------------------------ | -------- |
  | `roundStart`  | `ready` → `playing`                         | `square` 440 Hz → 880 Hz                                     | 120 ms   |
  | `rivalCrash`  | un rival choca (sin encierro)               | ruido blanco con filtro paso bajo a 1 200 Hz                 | 180 ms   |
  | `trap`        | un rival choca contra la estela del jugador | `triangle` 523, 659 y 784 Hz, 70 ms cada nota                | 210 ms   |
  | `playerCrash` | el jugador choca                            | `sawtooth` 220 Hz → 55 Hz                                    | 400 ms   |
  | `sectorClear` | ronda ganada                                | `triangle` 523, 659, 784 y 1 047 Hz, 90 ms cada nota         | 360 ms   |
  | `turbo`       | se activa el turbo                          | `sawtooth` 200 Hz → 800 Hz                                   | 250 ms   |
  | `spark`       | el jugador recoge una chispa                | `sine` 1 320 Hz                                              | 80 ms    |
  | `multi`       | eliminación múltiple (×2 o ×3)              | `square` 880 Hz y 1 175 Hz alternos, 60 ms cada uno, 4 notas | 240 ms   |

- Si en el mismo paso coinciden varios efectos, suena como máximo uno por `SoundId` y `trap` sustituye a `rivalCrash`.
- Silencio: `muted` empieza en `false` en cada carga de la página, vive en la closure y se conserva en `restart()`; `M` funciona en cualquier fase excepto en pausa y no se ve afectado por el filtro de dirección. Indicador «SONIDO: NO» en `bold 14px monospace`, `#8a8fb5`, alineado a la derecha en `(788, 588)`.
- Portada `cover-estela` (propuesta para `/frontend-design`, ajustable): `background: #05050f`; `::before` con rejilla de líneas `rgba(0,245,255,0.12)` cada 16 px y `transform: perspective(200px) rotateX(55deg)` anclada abajo; `::after` con dos trazos de 6 px hechos con `linear-gradient`: cyan (`var(--cyan)`) de izquierda a centro que gira hacia arriba, y magenta (`var(--magenta)`) de derecha a centro que gira hacia abajo, con `filter: drop-shadow(0 0 6px rgba(0,245,255,0.5)) drop-shadow(0 0 6px rgba(255,0,110,0.5))`. Sin imágenes ni fuentes nuevas.

Convenciones (las del 01 y el 02, más):

- Sin estado global de módulo: capa de estelas, partículas, destello, `EstelaAudio` y `muted` viven en la closure de `createEstelaEngine`. `audio.ts` exporta solo la fábrica `createEstelaAudio`.
- Ni `AudioContext` ni `document.createElement` se ejecutan en el servidor ni en el render: el `AudioContext` en el primer `keydown` de juego y la capa en `start()`.
- `onChange` sigue emitiéndose solo ante cambios del snapshot; partículas, destello y silencio no lo emiten.
- `M` se lee por `event.code`, se ignora desde campos de formulario y con `Ctrl`/`Alt`/`Meta`, y hace `preventDefault` solo con la partida activa.
- `destroy()` cierra el `AudioContext` (`close()`), cancela el bucle y elimina listeners; si llega antes de la primera tecla no hay contexto que cerrar.
- La puntuación enviada sigue siendo un entero entre 1 y 9 999 999; el ranking ordena por `score` desc y `created_at` asc.

---

## Implementation plan

Antes del paso 1: leer en `node_modules/next/dist/docs/` la guía de Client Components y la de estilos/CSS global (Next.js 16), y la guía de `cacheComponents` para el paso 5 (la portada sale de la BD cacheada). La portada es UI nueva de la plataforma: **se diseña con `/frontend-design`** antes de escribir el CSS.

1. **Capa de estelas con brillo.** Crear la capa fuera de pantalla en `start()`, pintar solo las casillas nuevas de cada subpaso con `shadowBlur = 12`, repintar atenuada la estela de una moto al chocar y volcar la capa en cada frame; cabezas con `shadowBlur = 18`. Verificación: `npx tsc --noEmit` sin errores; en el sector 3 con 4 motos el frame se mantiene a 60 fps en la pestaña Rendimiento.
2. **Partículas y destello.** `Particle`, emisión al chocar, actualización con `dt`, tope de 96 y destello del jugador. Verificación: `npx tsc --noEmit` sin errores; cada choque muestra la explosión durante 600 ms.
3. **Audio sintetizado.** Crear `lib/games/estela/audio.ts` con `createEstelaAudio` y los 8 efectos de la tabla; `unlock()` en el primer `keydown` de juego; `suspend()`/`resume()` en pausa; `close()` en `destroy()`. Verificación: `npx tsc --noEmit` sin errores; cada evento de la tabla suena una vez.
4. **Silenciar.** Tecla `M`, estado en closure, indicador «SONIDO: NO». Verificación: con `M` no suena nada y vuelve a sonar al pulsarla otra vez.
5. **Portada y migración.** Diseñar `cover-estela` con `/frontend-design` y añadirla en `app/globals.css` junto a las demás `cover-*`; crear `supabase/migrations/20261125214000_update_game_estela_cover.sql` (el timestamp debe ser posterior al de la migración del 01) y aplicarla con `apply_migration`; regenerar `lib/supabase/database.types.ts` solo si cambia algo. Verificación: `/games` muestra la portada nueva en la tarjeta de `estela`, la de `duelo-pixel` sigue con `cover-duelo` y `get_advisors` (security) está limpio.
6. **Limpieza y responsive.** Sin `document.getElementById`, `Image`, `Audio` (elemento HTML) ni globales de módulo en `lib/games/estela/`; el canvas escala a 375 px sin scroll horizontal. `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores.

---

## Acceptance criteria

Comunes:

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos/estela/jugar` sigue mostrando el canvas sin HUD interno de puntuación, vidas ni sector.
- [ ] Las teclas del juego (`←` `↑` `→` `↓`, `W` `A` `S` `D`, `Espacio`, `M`) funcionan y la página no hace scroll al pulsarlas.
- [ ] El HUD (Puntuación, Vidas, Nivel) refleja el estado real del motor.
- [ ] «PAUSA» detiene el juego, las partículas y el sonido y muestra «EN PAUSA»; «REANUDAR» continúa desde el mismo estado.
- [ ] «FIN» abre el modal con el score acumulado; al terminar la partida se abre «FIN DEL JUEGO» con la puntuación real.
- [ ] «JUGAR DE NUEVO» reinicia el juego al estado inicial sin partículas en pantalla y conservando el silencio elegido.
- [ ] Escribir en el campo de iniciales (incluidas las letras `M`, `W`, `A`, `S`, `D` y un espacio) no silencia, no mueve ni reinicia el juego.
- [ ] «SALIR» vuelve a `/juegos/estela`, las teclas ya no producen errores ni movimiento y no queda ningún sonido sonando (`AudioContext` cerrado).
- [ ] Con React Strict Mode solo hay un bucle de animación, un conjunto de listeners y como mucho un `AudioContext` abierto.
- [ ] Escribir `abc`, guardar y ver «PUNTUACIÓN GUARDADA_» crea una fila en `scores` con `game_id = 'estela'`, `player_name = 'ABC'` y el score real.
- [ ] Doble clic en «GUARDAR PUNTUACIÓN» crea una sola fila; con fallo de red se muestra error y se puede reintentar.
- [ ] `/salon?juego=estela` y el detalle `/juegos/estela` muestran la puntuación guardada al recargar; `Partidas` = `COUNT` y `Mejor global` = `MAX` de `scores`.
- [ ] `estela` aparece en `/games` y en `/juegos/estela` con la portada `cover-estela` y color `cyan`; `duelo-pixel` conserva `cover-duelo`.
- [ ] `asteroides`, `tetris`, `arkanoid` y `snake` mantienen su comportamiento, sus portadas y su ranking sin cambios; `/juegos/duelo-pixel/jugar` sigue con la simulación actual.
- [ ] `list_migrations` muestra la migración de la portada; `get_advisors` (security) sin avisos nuevos.
- [ ] A 375 px `/juegos/estela/jugar` y `/games` no tienen scroll horizontal y el canvas conserva la proporción 4:3.
- [ ] Sin errores de hidratación en `/`, `/games`, `/salon`, `/juegos/estela`, `/juegos/estela/jugar`.
- [ ] `grep` de `document.getElementById`, `window.` (fuera de `engine.ts`), `SERVICE_ROLE` en `lib/games/estela/`, `app/`, `components/` no devuelve resultados.
- [ ] Solo la fila `estela` de `games` cambia (`cover`); el resto de columnas y de filas no tienen cambios.

Específicos del juego:

- [ ] Las estelas se ven con halo de su color (`shadowBlur = 12`) y las cabezas con un halo mayor; los obstáculos del 02 se ven sin halo.
- [ ] La estela de una moto eliminada pierde el halo y queda a opacidad 0,2.
- [ ] Con 4 motos en el sector 3, el canvas mantiene 60 fps en un equipo de escritorio (pestaña Rendimiento), porque solo se pintan con `shadowBlur` las casillas nuevas.
- [ ] Cada choque emite 24 partículas del color de la moto que se desvanecen en 600 ms; nunca hay más de 96 a la vez.
- [ ] Cuando choca el jugador, la pantalla destella en blanco (opacidad 0,25 → 0 en 200 ms).
- [ ] Antes de pulsar ninguna tecla no existe `AudioContext` y no suena nada; la primera tecla de juego lo crea sin avisos de autoplay en consola.
- [ ] Suenan, una vez cada uno, los 8 efectos de la tabla en su evento: inicio de ronda, choque de rival, encierro (en lugar del choque de rival), choque del jugador, sector superado, turbo, chispa y eliminación múltiple.
- [ ] `M` silencia todos los efectos y dibuja «SONIDO: NO» abajo a la derecha; otra pulsación de `M` los reactiva y quita el indicador.
- [ ] Al recargar la página el sonido vuelve a estar activado (no se persiste el silencio).
- [ ] La puntuación de una misma secuencia de jugadas es idéntica a la del 02: el pulido no suma ni resta puntos.
- [ ] No se descarga ningún fichero de audio ni imagen en `/juegos/estela/jugar` (pestaña de red) y la página se renderiza en servidor sin acceder a `AudioContext`, `document` ni `window`.

---

## Decisions

- **Sí:** portada propia `cover-estela` diseñada con `/frontend-design`, solo con CSS como las demás `cover-*`, para distinguir ESTELA de `duelo-pixel` en la categoría VERSUS (decisión del agente, pendiente de revisar).
- **Sí:** migración `update` sobre la fila `estela` para cambiar solo `cover`. Es la fila creada por el 01 de este paquete, no una entrada previa del catálogo; ninguna otra fila se toca (decisión del agente, pendiente de revisar).
- **Sí:** brillo con una capa fuera de pantalla pintada de forma incremental, no `shadowBlur` sobre las 1 200 casillas en cada frame, que es lo caro en canvas 2D (decisión del agente, pendiente de revisar).
- **Sí:** sonido sintetizado con Web Audio, sin ficheros: no hay assets de audio para este juego en `references/` y evita descargas (decisión del agente, pendiente de revisar).
- **Sí:** `AudioContext` creado en la primera tecla de juego para respetar la política de autoplay del navegador.
- **No:** música ni zumbido continuo del motor: con 4 motos se vuelve molesto y obligaría a mezclar volúmenes (decisión del agente, pendiente de revisar).
- **Sí:** tecla `M` para silenciar dentro del motor, sin botón en la plataforma: no cambia `game-player.tsx` ni el contrato común (decisión del agente, pendiente de revisar).
- **No:** persistir el silencio en `localStorage`: la plataforma no guarda preferencias en el cliente; un sistema de sonido común iría en otro spec (decisión del agente, pendiente de revisar).
- **Sí:** las reglas, la puntuación y la IA no cambian, así que el ranking del 02 sigue siendo comparable.
- **No:** controles táctiles ni vibración en este paquete: ningún juego real los tiene y exigirían UI nueva en el reproductor (decisión del agente, pendiente de revisar).

---

## Risks

| Riesgo                                                                      | Mitigación                                                                                                                  |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode deja bucles, listeners o `AudioContext` duplicados.             | `destroy()` cierra el contexto; criterio común específico.                                                                  |
| `M` escrita en el input de iniciales silencia el juego.                     | Mismo filtro de campos de formulario; criterio común.                                                                       |
| `setState` por frame degrada el reproductor.                                | Partículas, destello y silencio fuera del snapshot.                                                                         |
| `document`/`AudioContext` rompen el render en servidor.                     | Capa creada en `start()` y contexto en `keydown`; componente `"use client"` sin cambios.                                    |
| Puntuaciones falsificadas desde el cliente / insert público.                | Aceptado (SPEC 06): CHECKs de la BD y tope 9 999 999; anti-trampas en otro spec.                                            |
| Nombre de migración distinto a la versión registrada en Supabase.           | Comprobar con `list_migrations` y renombrar el archivo.                                                                     |
| `shadowBlur` hunde los fps en equipos modestos.                             | Pintado incremental en la capa; si aun así baja de 50 fps, reducir `shadowBlur` a 6 al implementar.                         |
| El navegador bloquea el audio o muestra avisos de autoplay.                 | Contexto creado y reanudado solo dentro de un `keydown`; `play()` no hace nada sin contexto.                                |
| Muchos efectos simultáneos saturan el sonido (3 rivales chocando a la vez). | Un efecto por `SoundId` y paso; ganancia maestra 0,25.                                                                      |
| La caché de `/games` sigue mostrando la portada antigua tras la migración.  | Las lecturas usan `cacheLife("hours")`: revalidar en el paso 5 (`npm run build` o esperar la caducidad) antes de verificar. |
| La portada nueva no encaja con las demás en tamaño o brillo.                | Diseño con `/frontend-design` comparando en `/games` junto a `cover-duelo` y `cover-snake`.                                 |
| El texto «SONIDO: NO» se ve pequeño a 375 px.                               | Se acepta en esta versión; escalado con `devicePixelRatio` en otro spec.                                                    |

---

## What is **not** in this spec

- Cambios al esquema de `scores`, Auth, anti-trampas.
- Cambios de reglas, puntuación, velocidad o IA.
- Música, zumbido de motor y ficheros de audio.
- Persistencia del silencio, botón de silencio en la plataforma y sistema de sonido común.
- Controles táctiles, ratón, gamepad y vibración.
- Escalado con `devicePixelRatio`.
- Portadas nuevas para otros juegos o cambios en `duelo-pixel`.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
