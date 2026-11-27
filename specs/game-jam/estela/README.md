# ESTELA — paquete de game jam (`estela`)

> **Status:** Borrador
> **Tema recibido:** «ESTELA — motos de luz que dejan un muro de neón»
> **Origen:** sugerencia ⭐ de `game-planner` en `references/game-suggestions-todo.md` (Pendientes)
> **Date:** 2026-11-25

---

## Pitch

Tu moto de luz cruza una rejilla de 40×30 casillas y deja detrás un muro de neón sólido. Rivales CPU hacen lo mismo: quien choca con un muro, con el borde o con una estela queda fuera. Gana la ronda el último en pie; si el rival se estrella contra **tu** estela, lo has encerrado y puntúa más. Cada ronda ganada sube de sector: más rivales, más velocidad y menos errores de la CPU, hasta que pierdes tus 3 motos.

Es el **primer VERSUS con motor real** de Arcade Vault (hoy 0 de 4 juegos reales; el único VERSUS del catálogo es el simulado `duelo-pixel`) y reutiliza la idea de rejilla, ticks y cola de direcciones de SNAKE (SPEC 09). Es un diseño original del género «motos de luz»: nombre, reglas, sectores y estética propios, sin personajes, arte ni niveles de ninguna franquicia.

---

## Identidad

| Campo        | Valor                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`         | `estela`                                                                                                                                                                                                                                                                                                                                                                                                   |
| `title`      | `ESTELA`                                                                                                                                                                                                                                                                                                                                                                                                   |
| `cat`        | `VERSUS`                                                                                                                                                                                                                                                                                                                                                                                                   |
| `color`      | `cyan`                                                                                                                                                                                                                                                                                                                                                                                                     |
| `cover`      | `cover-duelo` (existente; portada propia `cover-estela` en el spec 03)                                                                                                                                                                                                                                                                                                                                     |
| `sort_order` | `13` (máximo actual 12 = `snake`, comprobado leyendo `supabase/migrations/`; puede cambiar si se implementa otro juego antes)                                                                                                                                                                                                                                                                              |
| `short`      | `Deja un muro de neón y encierra a las motos rivales.`                                                                                                                                                                                                                                                                                                                                                     |
| `long`       | `Conduce una moto de luz por una rejilla de 40×30 que deja un muro de neón a su paso; chocar con el borde o con cualquier estela te cuesta una de tus 3 motos. Sé la última moto en pie para ganar la ronda y subir de sector, con más rivales y más velocidad. Si un rival se estrella contra tu estela lo has encerrado y vale 250 puntos por sector en lugar de 100.` (propuesta, pendiente de revisar) |

---

## Conceptos evaluados

Puntuación de 1 a 5 por criterio (máximo 50).

| Criterio      | **ESTELA** (elegido): motos de luz contra CPU por rondas | ESTELA FUGAZ: moto en solitario con estela que se desvanece | CERCO: moto que encierra zonas para capturarlas |
| ------------- | :------------------------------------------------------: | :---------------------------------------------------------: | :---------------------------------------------: |
| Tema          |                            5                             |                              3                              |                        4                        |
| Leaderboard   |                            5                             |                              4                              |                        4                        |
| HUD           |                            5                             |                              4                              |                        3                        |
| Pantalla      |                            5                             |                              5                              |                        5                        |
| Controles     |                            5                             |                              5                              |                        5                        |
| Estética      |                            5                             |                              5                              |                        4                        |
| Rejugabilidad |                            5                             |                              4                              |                        4                        |
| Viabilidad    |                            4                             |                              5                              |                        3                        |
| Equilibrio    |                            5                             |                              1                              |                        3                        |
| Reutilización |                            4                             |                              4                              |                        2                        |
| **Total**     |                          **48**                          |                           **40**                            |                     **37**                      |

- **ESTELA (elegido):** el muro de neón es la mecánica central (obstáculo propio y arma para encerrar), vidas = motos y nivel = sector se mapean sin forzar el `GameSnapshot`, y llena el hueco VERSUS. Viabilidad 4 y no 5 por la IA de los rivales (flood-fill acotado, ver 01).
- **ESTELA FUGAZ (descartado):** sin rivales no es VERSUS (Equilibrio 1) y se parece demasiado a SNAKE (sobrevivir sin chocar con tu propio rastro).
- **CERCO (descartado):** solapa con PERÍMETRO y TERRITORIO del ToDo, el «nivel» se apoya en un porcentaje de área poco natural para el HUD y el relleno de zonas encarece la implementación.

---

## Índice de specs

| Spec                                                             | Una línea                                                                                                                                                                              |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`01-estela-juego-real.md`](01-estela-juego-real.md)             | Núcleo jugable: rejilla 40×30, moto del jugador y 1–3 rivales CPU, rondas, 3 motos, puntuación por supervivencia/eliminación/encierro, migración `sort_order = 13` y leaderboard real. |
| [`02-estela-sectores-y-turbo.md`](02-estela-sectores-y-turbo.md) | Ampliación: turbo con `Espacio`, chispas recogibles, rivales con personalidad, sectores con obstáculos desde el nivel 4 y bonus de eliminación múltiple. Sin migración.                |
| [`03-estela-neon-y-sonido.md`](03-estela-neon-y-sonido.md)       | Pulido: portada propia `cover-estela`, brillo neón y partículas de choque en el canvas y sonido sintetizado con tecla `M` para silenciar.                                              |

Orden de implementación: **01 → 02 → 03**. El 01 es jugable y completo por sí solo; el 02 depende del 01; el 03 depende del 01 y del 02 (sonidos del turbo y de las chispas).

---

## Cómo se implementa

1. El usuario revisa y aprueba cada spec de esta carpeta, en especial las decisiones marcadas «(decisión del agente, pendiente de revisar)».
2. Promueve cada spec aprobado a `specs/` con el siguiente número global libre (hoy el último es `09`, así que serían `10-estela-juego-real.md`, `11-estela-sectores-y-turbo.md` y `12-estela-neon-y-sonido.md`), ajustando `Depends on` (las referencias `game-jam/estela/01` y `02` pasan a `SPEC 10` y `SPEC 11`), la fecha y, si otro juego entró antes, el `sort_order` y el timestamp de la migración.
3. Ejecuta `/spec-impl 10-estela-juego-real`, después `/spec-impl 11-estela-sectores-y-turbo` y por último `/spec-impl 12-estela-neon-y-sonido` (orden 01 → 02 → 03), una rama y un PR por spec.
4. Al implementarse el 01, mover ESTELA a «En spec / implementados» en `references/game-suggestions-todo.md` y añadirla a `references/implemented-games.md`.
