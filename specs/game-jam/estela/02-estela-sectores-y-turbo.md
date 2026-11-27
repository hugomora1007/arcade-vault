# ESTELA: sectores, turbo y rivales con personalidad (`estela`)

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07 (registro de juegos reales), game-jam/estela/01
> **Date:** 2026-11-25
> **Objective:** Ampliar la jugabilidad de ESTELA con turbo, chispas recogibles, rivales con personalidad, sectores con obstáculos desde el sector 4 y bonus por eliminación múltiple, sin cambiar el contrato del motor ni el catálogo.

---

## Por qué existe este spec

Nace de la game jam con el tema «ESTELA — motos de luz que dejan un muro de neón» y amplía el núcleo jugable de `01-estela-juego-real.md`. Con el 01, a partir del sector 3 todas las rondas son iguales (3 rivales con la misma IA en una rejilla vacía) y la única decisión del jugador es girar. Este spec añade decisiones nuevas sin tocar la plataforma: **cuándo acelerar** (turbo para cortar el paso a un rival y encerrarlo), **qué arriesgar** (chispas que dan puntos y recargan el turbo), **a quién temer** (tres rivales con comportamientos reconocibles) y **dónde jugar** (cuatro sectores con obstáculos fijos que rotan desde el sector 4). También da un motivo más para encerrar: eliminar a varios rivales en el mismo paso multiplica los puntos.

Se diseña desde cero sobre el motor del 01; no reutiliza código ni assets de `references/`. Ningún juego real tiene hoy power-ups con tecla propia ni IA con personalidades. Convive con el mock `duelo-pixel`, que sigue sin cambios.

---

## Scope

**In:**

- **Subpasos:** la simulación pasa a resolverse en subpasos de `tickMs(level) / 2`. Los rivales avanzan cada 2 subpasos (igual que en el 01); el jugador también, salvo en turbo, donde avanza en cada subpaso.
- **Turbo:** `Espacio` activa el turbo del jugador durante 1 000 ms (velocidad doble). 3 cargas por ronda, que se restauran al empezar cada ronda. Indicador de cargas dibujado en el canvas.
- **Chispas:** cada 4 000 ms de fase `playing` aparece una chispa en una casilla libre (máximo 1 a la vez, dura 8 000 ms). Recogerla con el jugador suma 50 × sector y da +1 carga de turbo (máximo 3). Si un rival pasa por ella, desaparece sin efecto.
- **Personalidades de rivales** desde el sector 2: Rival 1 (magenta) CAZADOR, Rival 2 (amarillo) MURO, Rival 3 (verde) ERRÁTICO, sobre la IA por flood-fill del 01.
- **Sectores con obstáculos** desde el sector 4: cuatro trazados fijos (PILARES, CRUZ, CORREDORES, ANILLO) que rotan por sector. Chocar con un obstáculo cuenta como choque normal.
- **Eliminación múltiple:** si en un mismo paso caen 2 o 3 rivales con el jugador vivo, sus puntos de eliminación/encierro se multiplican por 2 o por 3, con mensaje «DOBLE ×2» o «TRIPLE ×3».
- Cambios solo en `lib/games/estela/` (`constants.ts`, `types.ts`, `entities.ts`, `ai.ts`, `engine.ts` y un nuevo `sectors.ts`). Sin cambios en `components/games/estela-canvas.tsx`, en `lib/games/registry.ts` ni en `components/game-player.tsx`.
- **Sin migración:** la fila de `games` del 01 no cambia. Los textos `short`/`long` siguen siendo correctos (no mencionan el turbo ni los obstáculos, pero no los contradicen).

**Out of scope (para specs futuros):**

- Cambios al esquema de `scores`, Auth, `user_id`, anti-trampas, rate limiting.
- Portada propia, brillo neón, partículas y sonido: van en `03-estela-neon-y-sonido.md`.
- Actualizar `short`/`long` para mencionar el turbo y los sectores (exigiría una migración sobre la fila `estela`).
- Turbo o chispas para los rivales, más de 3 rivales, rejillas de otro tamaño.
- Editor de sectores, selector de sector o sectores aleatorios (permitirían elegir dificultad y distorsionar el ranking).
- Controles táctiles, ratón, gamepad y modo de dos jugadores.
- Modificar o reemplazar entradas existentes de `games`.
- Tests automatizados (no hay runner configurado).

---

## Data model

El contrato del motor **no cambia** (`EstelaPhase`, `EstelaSnapshot`, `EstelaCallbacks`, `EstelaEngine` y `createEstelaEngine` son los del 01):

```ts
// lib/games/estela/types.ts (sin cambios respecto al 01)
export type EstelaPhase = "ready" | "playing" | "roundover" | "gameover";

export interface EstelaSnapshot {
  score: number; // supervivencia + eliminaciones/encierros (× multiplicador) + chispas + rondas
  lives: number; // motos restantes: 3 al empezar, 0 al perder la última
  level: number; // sector actual: 1 + rondas ganadas; fija rivales, velocidad y trazado
  phase: EstelaPhase;
}

export interface EstelaCallbacks {
  /** Solo cuando cambia algún valor del snapshot. */
  onChange: (snapshot: EstelaSnapshot) => void;
  /** Una vez al terminar la partida (última moto perdida o botón FIN). */
  onGameOver: (finalScore: number) => void;
}

export interface EstelaEngine {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void; // además: turbo a 3 cargas, sin chispa, trazado del sector 1
  end(): void;
  destroy(): void;
}

export function createEstelaEngine(
  canvas: HTMLCanvasElement,
  callbacks: EstelaCallbacks,
): EstelaEngine;
```

Tipos internos nuevos (no salen del motor):

```ts
// lib/games/estela/types.ts
export type Personality = "basico" | "cazador" | "muro" | "erratico";
export interface Spark {
  cell: Cell;
  bornAt: number; // ms de juego acumulados (sin pausa) al aparecer
}
export interface SectorLayout {
  name: "PILARES" | "CRUZ" | "CORREDORES" | "ANILLO";
  cells: readonly Cell[];
}
/** Ocupación de la rejilla: 0 = libre, 1..4 = id de la moto, 5 = obstáculo. */
export type Grid = Uint8Array;
```

Entrada del registro: sin cambios respecto al 01 (`initialSnapshot: { score: 0, lives: 3, level: 1, phase: "ready" }`).

Catálogo: sin migración ni cambios en la fila `estela` (`sort_order = 13` del 01).

Constantes nuevas (diseño de este spec):

- Subpaso: `subStepMs(level) = tickMs(level) / 2` → 55 ms en el sector 1, 30 ms desde el sector 11. Con `dt ≤ 50 ms` se procesan como mucho 2 subpasos por frame.
- Rivales y jugador sin turbo avanzan en los subpasos pares; el jugador con turbo avanza en todos. Un «paso» del 01 equivale a 2 subpasos.
- `SURVIVE_POINTS = 1` por paso completo (cada 2 subpasos), no por casilla avanzada: el turbo no da puntos de supervivencia extra.
- Turbo: `event.code === "Space"`, `TURBO_MS = 1000`, `TURBO_CHARGES = 3` por ronda. Se ignora con `e.repeat`, en `ready`, en `roundover`, con 0 cargas o si ya hay un turbo activo. El tiempo de turbo se descuenta con el tiempo de juego (la pausa lo congela). Al empezar cada ronda las cargas vuelven a 3 y el turbo activo se cancela.
- Indicador de turbo en el canvas: 3 rectángulos de 16×6 px en `x = 12, 32, 52`, `y = 12`; carga disponible rellena `#00f5ff`, gastada solo con borde `#4a4f70`; durante el turbo la estela nueva del jugador se pinta a `globalAlpha = 0.8` en lugar de 0,55.
- Chispas: `SPARK_INTERVAL_MS = 4000` de fase `playing`, `SPARK_LIFE_MS = 8000`, máximo 1 a la vez; aparece en una casilla libre elegida al azar entre las que están a distancia Manhattan ≥ 5 de todas las cabezas vivas (si no hay ninguna, ese intervalo no aparece). `SPARK_POINTS = 50` × sector y +1 carga de turbo (máximo 3). Dibujo: rombo `#e6e9ff` de 12 px centrado en la casilla, opacidad oscilando entre 0,6 y 1 con periodo 500 ms. La chispa no ocupa la rejilla: la moto que entra en su casilla la consume y deja su estela con normalidad. El temporizador de chispas se reinicia al empezar cada ronda.
- Personalidades (activas desde el sector 2; en el sector 1 el rival usa `"basico"`, la IA del 01). En todas se mantiene primero la probabilidad de error `aiErrorChance(level)` del 01, y las «candidatas» son las opciones seguras con área ≥ 80 % de la mejor área:
  - Rival 1, `cazador` (magenta): entre las candidatas, la que deja la casilla siguiente a menor distancia Manhattan de la casilla objetivo = cabeza del jugador + 4 casillas en su dirección actual (limitada a la rejilla). Empate: recto, izquierda, derecha.
  - Rival 2, `muro` (amarillo): entre las candidatas, la que deja la casilla siguiente con más vecinos ocupados o fuera de la rejilla (de 0 a 4). Empate: recto, izquierda, derecha.
  - Rival 3, `erratico` (verde): probabilidad de error `min(0.3, 2 × aiErrorChance(level))`; además, si seguir recto es seguro, con probabilidad `0.10` gira a una opción perpendicular segura elegida al azar; si no, se comporta como `basico`.
- Obstáculos: id de rejilla `OBSTACLE = 5`, color `#4a4f70` a opacidad 1, sin estela. Chocar con un obstáculo es un choque normal: para un rival da `KILL_POINTS`, nunca `TRAP_POINTS`. Sectores 1–3 sin obstáculos; desde el sector 4 el trazado es `LAYOUTS[(level - 4) % 4]`:

  | Índice | Nombre     | Casillas (col, row)                                                                                                                        | Total |
  | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
  | 0      | PILARES    | Cuatro bloques 2×2: cols 12–13 × rows 7–8; cols 26–27 × rows 7–8; cols 12–13 × rows 21–22; cols 26–27 × rows 21–22                         | 16    |
  | 1      | CRUZ       | Brazo vertical cols 19–20 × rows 11–18 y brazo horizontal rows 14–15 × cols 15–24 (los 4 cruces se cuentan una vez)                        | 32    |
  | 2      | CORREDORES | Fila 9 y fila 20, cols 8–31                                                                                                                | 48    |
  | 3      | ANILLO     | Perímetro del rectángulo cols 10–29 × rows 8–21, con huecos en las cols 18–21 de las filas 8 y 21, y en las rows 13–16 de las cols 10 y 29 | 48    |

  Ningún trazado ocupa las casillas iniciales de la tabla del 01 (`(6, 15)`, `(33, 14)`, `(20, 4)`, `(19, 25)`) ni las 3 casillas siguientes en su dirección inicial.

- Eliminación múltiple: en un paso en el que el jugador sigue vivo, si caen `n` rivales (`n` = 1, 2 o 3), la suma de sus `KILL_POINTS`/`TRAP_POINTS` × sector se multiplica por `n`. Con `n ≥ 2` se dibuja «DOBLE ×2» o «TRIPLE ×3» centrado en `y = 60` durante 800 ms. Los `ROUND_POINTS` no se multiplican.
- Curva de dificultad resultante (rivales y velocidad del 01, error del 01, personalidades y trazados de este spec):

  | Sector | Rivales | `tickMs` | Error IA | Personalidades | Trazado    |
  | ------ | ------- | -------- | -------- | -------------- | ---------- |
  | 1      | 1       | 110      | 0,12     | no             | vacío      |
  | 2      | 2       | 105      | 0,10     | sí             | vacío      |
  | 3      | 3       | 100      | 0,08     | sí             | vacío      |
  | 4      | 3       | 95       | 0,06     | sí             | PILARES    |
  | 5      | 3       | 90       | 0,04     | sí             | CRUZ       |
  | 6      | 3       | 85       | 0,02     | sí             | CORREDORES |
  | 7      | 3       | 80       | 0,02     | sí             | ANILLO     |
  | 8      | 3       | 75       | 0,02     | sí             | PILARES    |
  | 11     | 3       | 60       | 0,02     | sí             | ANILLO     |
  | 12+    | 3       | 60       | 0,02     | sí             | rota       |

- Puntuación: se mantiene el tope `MAX_SCORE = 9 999 999` del 01; sigue sin haber máximo teórico.

Reglas del subpaso (sustituyen al paso del 01; el orden es el mismo):

1. Se determinan las motos que se mueven en este subpaso (todas en los pares; solo el jugador con turbo en los impares).
2. Las que se mueven eligen dirección (jugador: cola; rivales: IA con su personalidad, mirando la rejilla antes del subpaso), calculan su casilla siguiente y se resuelven choques como en el 01 (borde, casilla ocupada por estela u obstáculo, misma casilla destino).
3. Si la casilla siguiente del jugador tiene la chispa, la recoge (+50 × sector, +1 carga). Si es de un rival, la chispa desaparece.
4. Puntuación y fin de ronda como en el 01, con el multiplicador de eliminación múltiple. `SURVIVE_POINTS` solo en los subpasos pares.

Convenciones (las del 01, más):

- Sin estado global de módulo: cargas de turbo, tiempo de turbo, chispa, temporizador de chispas y trazado viven en la closure de `createEstelaEngine`. Los trazados son constantes de `sectors.ts` (datos inmutables, no estado).
- `onChange` sigue emitiéndose solo ante cambios del snapshot; las cargas de turbo y la chispa no forman parte del snapshot y no lo emiten.
- `Espacio` se añade a las teclas con `preventDefault` mientras la partida no está en `gameover` ni en pausa (evita el scroll de página). Se ignora con `Ctrl`/`Alt`/`Meta` y desde campos de formulario, como el resto.
- El turbo es una pulsación, no una tecla mantenida: no hay estado de tecla pulsada que vaciar; `blur` sigue vaciando la cola de direcciones.
- `dt` limitado a 50 ms; la pausa congela subpasos, turbo, temporizador y vida de la chispa y el mensaje de eliminación múltiple.

---

## Implementation plan

Antes del paso 1: releer `01-estela-juego-real.md` (o el spec promovido) y la guía de Client Components en `node_modules/next/dist/docs/`. No hay UI nueva de plataforma (el indicador de turbo y los mensajes se dibujan en el canvas con las constantes de este spec), por lo que no se invoca `/frontend-design`.

1. **Constantes, tipos y trazados.** Añadir a `constants.ts` las constantes de turbo, chispas, `OBSTACLE`, `subStepMs` y el multiplicador; a `types.ts`, `Personality`, `Spark` y `SectorLayout`; crear `lib/games/estela/sectors.ts` con `LAYOUTS` y `layoutForLevel(level)`. Verificación: `npx tsc --noEmit` sin errores; `LAYOUTS.map(l => l.cells.length)` igual a `[16, 32, 48, 48]` y ninguna casilla de `LAYOUTS` coincide con las casillas iniciales ni con las 3 siguientes de cada moto.
2. **IA con personalidades.** Extender `chooseDirection` en `ai.ts` con el parámetro `personality` y la casilla objetivo del cazador; `basico` mantiene el comportamiento exacto del 01. Verificación: `npx tsc --noEmit` sin errores; en el sector 1 los rivales se comportan igual que antes del cambio.
3. **Subpasos y turbo.** Cambiar el acumulador del motor a `subStepMs`, mover rivales en los subpasos pares y al jugador según el turbo, añadir la tecla `Espacio`, las cargas por ronda y el indicador del canvas. Verificación: `npx tsc --noEmit` sin errores; sin turbo el juego avanza a la misma velocidad que en el 01 (9 casillas/s en el sector 1).
4. **Chispas.** Temporizador, aparición en casilla válida, caducidad, recogida por jugador o rival y dibujo. Verificación: `npx tsc --noEmit` sin errores; en una ronda de más de 4 s aparece una chispa.
5. **Sectores con obstáculos.** `initRound` pinta `layoutForLevel(level)` en la rejilla con `OBSTACLE` y el dibujo los muestra en `#4a4f70`. Verificación: al llegar al sector 4 se ven los 4 pilares.
6. **Eliminación múltiple.** Multiplicador por número de rivales caídos en el paso y mensaje de 800 ms. Verificación: `npx tsc --noEmit` sin errores.
7. **Limpieza y verificación.** Sin `document.getElementById`, `Image`, `Audio` ni globales de módulo en `lib/games/estela/`; `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores y los criterios comunes del 01 siguen cumpliéndose.

---

## Acceptance criteria

Comunes:

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos/estela/jugar` sigue mostrando el canvas sin HUD interno de puntuación, vidas ni sector (el indicador de turbo no es HUD de la plataforma).
- [ ] Las teclas del juego (`←` `↑` `→` `↓`, `W` `A` `S` `D`, `Espacio`) funcionan y la página no hace scroll al pulsarlas.
- [ ] El HUD (Puntuación, Vidas, Nivel) refleja el estado real del motor.
- [ ] «PAUSA» detiene el juego y muestra «EN PAUSA»; «REANUDAR» continúa desde el mismo estado.
- [ ] «FIN» abre el modal con el score acumulado; al terminar la partida se abre «FIN DEL JUEGO» con la puntuación real.
- [ ] «JUGAR DE NUEVO» reinicia el juego al estado inicial (sector 1 sin obstáculos, 3 cargas de turbo, sin chispa).
- [ ] Escribir en el campo de iniciales (incluido un espacio y las letras `W`, `A`, `S`, `D`) no mueve, no activa el turbo ni reinicia el juego.
- [ ] «SALIR» vuelve a `/juegos/estela` y las teclas ya no producen errores ni movimiento (listeners eliminados).
- [ ] Con React Strict Mode solo hay un bucle de animación y un conjunto de listeners.
- [ ] Escribir `abc`, guardar y ver «PUNTUACIÓN GUARDADA_» crea una fila en `scores` con `game_id = 'estela'`, `player_name = 'ABC'` y el score real.
- [ ] Doble clic en «GUARDAR PUNTUACIÓN» crea una sola fila; con fallo de red se muestra error y se puede reintentar.
- [ ] `/salon?juego=estela` y el detalle `/juegos/estela` muestran la puntuación guardada al recargar; `Partidas` = `COUNT` y `Mejor global` = `MAX` de `scores`.
- [ ] `estela` sigue en `/games` con su título, portada y color; la fila de `games` no cambia y `list_migrations` no muestra migraciones nuevas de este spec.
- [ ] `asteroides`, `tetris`, `arkanoid` y `snake` mantienen su comportamiento y su ranking sin cambios; `/juegos/duelo-pixel/jugar` sigue con la simulación actual.
- [ ] `get_advisors` (security) sin avisos nuevos.
- [ ] A 375 px `/juegos/estela/jugar` no tiene scroll horizontal y el canvas conserva la proporción 4:3.
- [ ] Sin errores de hidratación en `/`, `/games`, `/salon`, `/juegos/estela`, `/juegos/estela/jugar`.
- [ ] `grep` de `document.getElementById`, `window.` (fuera de `engine.ts`), `SERVICE_ROLE` en `lib/games/estela/`, `app/`, `components/` no devuelve resultados.

Específicos del juego:

- [ ] Al empezar cada ronda el indicador muestra 3 cargas de turbo rellenas en `#00f5ff` en la esquina superior izquierda.
- [ ] Pulsar `Espacio` en `playing` gasta una carga y durante 1 000 ms la moto del jugador avanza el doble de casillas (unas 18 en el sector 1 frente a 9 sin turbo); los rivales no se aceleran.
- [ ] Pulsar `Espacio` en `ready`, en `roundover`, con un turbo ya activo, con 0 cargas o mantenerlo pulsado (`e.repeat`) no gasta cargas ni empieza la ronda.
- [ ] Durante el turbo la puntuación de supervivencia sigue sumando 1 por paso completo (≈ 9 por segundo en el sector 1), no por casilla.
- [ ] Al perder una moto o ganar la ronda, la ronda siguiente empieza con 3 cargas aunque se hubieran gastado todas.
- [ ] Tras 4 s de `playing` aparece una chispa en una casilla libre a distancia Manhattan ≥ 5 de todas las cabezas; nunca hay más de una a la vez y desaparece a los 8 s si nadie la recoge.
- [ ] Recoger la chispa con el jugador suma 50 × sector (50 en el sector 1) y añade una carga de turbo sin pasar de 3; si la recoge un rival, desaparece sin sumar puntos.
- [ ] En el sector 1 el rival usa la IA del 01; desde el sector 2 el rival magenta tiende a cruzarse delante del jugador, el amarillo a pegarse a muros y estelas y el verde gira de forma más imprevisible.
- [ ] Ningún rival con personalidad elige una opción con menos del 80 % del área de la mejor opción segura, salvo por la probabilidad de error.
- [ ] Los sectores 1, 2 y 3 no tienen obstáculos; el 4 muestra PILARES (16 casillas), el 5 CRUZ (32), el 6 CORREDORES (48), el 7 ANILLO (48) y el 8 vuelve a PILARES, todos en `#4a4f70`.
- [ ] Ningún obstáculo ocupa la casilla inicial de una moto ni las 3 siguientes en su dirección inicial, así que nadie choca en los 3 primeros pasos de una ronda.
- [ ] Chocar el jugador con un obstáculo le cuesta una moto; un rival que choca con un obstáculo suma 100 × sector, nunca 250.
- [ ] Si dos rivales caen en el mismo paso con el jugador vivo (p. ej. dos encierros en el sector 3), la puntuación de esos choques se multiplica por 2 (2 × 250 × 3 × 2 = 3 000) y aparece «DOBLE ×2» durante 800 ms; con tres rivales, ×3 y «TRIPLE ×3». `ROUND_POINTS` no se multiplica.
- [ ] Pausar durante un turbo y reanudar conserva el tiempo de turbo restante; pausar no hace caducar la chispa ni adelanta su aparición.
- [ ] Si la partida termina con 0 puntos, el modal muestra 0 y «GUARDAR PUNTUACIÓN» muestra el error de puntuación mínima sin crear fila.
- [ ] `Ctrl+Espacio` y `Ctrl+W` no son interceptadas por el juego.

---

## Decisions

- **Sí:** el contrato del motor, la entrada del registro y la fila de `games` no cambian; todo vive dentro de `lib/games/estela/`.
- **No:** migración en este spec. Los textos del 01 no contradicen las reglas nuevas y reescribirlos obligaría a modificar la fila `estela` (decisión del agente, pendiente de revisar).
- **Sí:** turbo como pulsación de `Espacio` con 3 cargas por ronda y 1 000 ms. Es la herramienta para encerrar a propósito (adelantarse y cortar), que es la mecánica del tema (decisión del agente, pendiente de revisar).
- **Sí:** subpasos de `tickMs / 2` en lugar de un segundo bucle para el turbo: mantiene la resolución simultánea del 01 y una sola fuente de tiempo (decisión del agente, pendiente de revisar).
- **No:** puntos de supervivencia por casilla: el turbo duplicaría la supervivencia y premiaría gastarlo sin motivo (decisión del agente, pendiente de revisar).
- **Sí:** chispas que suman 50 × sector y recargan turbo, a ≥ 5 casillas de cualquier cabeza para que no se recojan sin querer (decisión del agente, pendiente de revisar).
- **No:** turbo ni chispas para los rivales: complicaría la IA y haría las muertes del jugador menos legibles (decisión del agente, pendiente de revisar).
- **Sí:** tres personalidades fijas por color (cazador, muro, errático), activas desde el sector 2, con el filtro de área ≥ 80 % para que ninguna sea suicida. El sector 1 se queda como aprendizaje con la IA básica (decisión del agente, pendiente de revisar).
- **Sí:** cuatro trazados fijos que rotan desde el sector 4, comprobados contra las casillas iniciales. Fijos y no aleatorios para que dos jugadores en el mismo sector compitan en el mismo terreno (decisión del agente, pendiente de revisar).
- **No:** selector de sector ni sectores aleatorios: permitirían elegir dificultad y distorsionar el ranking.
- **Sí:** multiplicador por eliminación múltiple (×2, ×3) solo sobre los puntos de eliminación, no sobre la ronda (decisión del agente, pendiente de revisar).
- **Sí:** indicador de turbo y mensajes dibujados en el canvas, no en el HUD de la plataforma: el `GameSnapshot` común no tiene campo para cargas y añadirlo exigiría cambiar `game-player.tsx` (decisión del agente, pendiente de revisar).

---

## Risks

| Riesgo                                                                                                  | Mitigación                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode deja bucles o listeners duplicados.                                                         | `destroy()` sin cambios respecto al 01; criterio común.                                                                                       |
| `Espacio` escrito en el input de iniciales activa el turbo o hace scroll.                               | Mismo filtro de campos de formulario del 01; `preventDefault` solo con la partida activa; criterio específico.                                |
| `setState` por frame degrada el reproductor.                                                            | Cargas y chispa fuera del snapshot; `onChange` solo ante cambios.                                                                             |
| Puntuaciones falsificadas desde el cliente / insert público.                                            | Aceptado (SPEC 06): CHECKs de la BD y tope 9 999 999; anti-trampas en otro spec.                                                              |
| Los subpasos cambian sin querer la velocidad base del 01.                                               | Paso 3 verifica 9 casillas/s en el sector 1 sin turbo; los rivales siguen moviéndose cada 2 subpasos.                                         |
| A 30 ms por subpaso, el turbo y los 3 flood-fill no caben en el frame.                                  | Los rivales solo deciden en subpasos pares (como mucho 9 BFS de 300 casillas cada 60 ms); el subpaso impar solo mueve al jugador.             |
| El cazador es demasiado letal y el sector 2 se vuelve injusto.                                          | Filtro de área ≥ 80 % y error del 10 % en el sector 2; ajuste de constantes tras jugar.                                                       |
| Un trazado deja a una moto sin salida al empezar.                                                       | Comprobación en el paso 1 de las casillas iniciales y las 3 siguientes; criterio específico.                                                  |
| La chispa aparece encima de una estela o fuera del alcance de todos.                                    | Solo casillas libres; si no hay ninguna válida se omite ese intervalo.                                                                        |
| El ranking del 01 y el del 02 dejan de ser comparables (el turbo y las chispas suben las puntuaciones). | Aceptado: el 02 se implementa antes de que haya muchas filas; si ya las hay, se decide al promover el spec si se limpia `scores` de `estela`. |
| El texto «DOBLE ×2» y el indicador de turbo se ven pequeños a 375 px.                                   | Se acepta en esta versión; el spec 03 revisa la legibilidad del canvas.                                                                       |

---

## What is **not** in this spec

- Cambios al esquema de `scores`, Auth, anti-trampas.
- Portada propia, brillo neón, partículas y sonido (spec 03 de este paquete).
- Nuevos textos `short`/`long` y cualquier migración.
- Turbo o chispas para rivales, más de 3 rivales, otros tamaños de rejilla.
- Editor, selector o generación aleatoria de sectores.
- Controles táctiles, ratón, gamepad y modo de dos jugadores.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
