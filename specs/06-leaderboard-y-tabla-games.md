# SPEC 06 — Tabla `games`, puntuaciones reales y leaderboard

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 04, SPEC 05
> **Date:** 2026-11-17
> **Objective:** Crear en Supabase las tablas `games` y `scores`, convertir la BD en la fuente única del catálogo y del ranking, y permitir guardar de forma anónima (con iniciales) las puntuaciones de Asteroides para mostrarlas en `/salon` y en el detalle de cada juego.

---

## Por qué existe este spec

El SPEC 04 dejó Supabase conectado pero con el esquema `public` vacío, y el SPEC 05 dejó el primer juego real con «GUARDAR PUNTUACIÓN» sin persistir nada. Hoy el catálogo vive en el mock `lib/games.ts` (`GAMES`) y los rankings salen de `seededScores` en `lib/scores.ts`: nombres inventados y deterministas. Este spec cierra ese hueco: primeras tablas reales, primera escritura real y primer ranking real. Es la base para los siguientes juegos (Tetris, Arkanoid) y para un futuro spec de Auth.

---

## Scope

**In:**

- Migración versionada en `supabase/migrations/` (aplicada al proyecto remoto con el MCP de Supabase) que crea:
  - tabla `games` sembrada con los 9 juegos actuales de `lib/games.ts` (valores copiados literalmente, mismo orden);
  - tabla `scores`;
  - vista `game_stats` (`best` y `plays` derivados);
  - RLS en ambas tablas.
- Regenerar `lib/supabase/database.types.ts`.
- Capa de datos de lectura (`lib/db/games.ts`): lista de juegos con estadísticas, un juego por id y top de puntuaciones por juego.
- El catálogo deja de leerse de `GAMES`: home (`GAMES.slice(0, 6)` → primeros 6 por `sort_order`), biblioteca (`/games`), detalle (`/juegos/[id]`), reproductor (`/juegos/[id]/jugar`) y `/salon` leen de Supabase. Se elimina el array `GAMES` (se conservan los tipos `Game`, `Category`, `CoverColor` y la constante `CATS`).
- Server Action `saveScore` que valida e inserta una puntuación.
- `components/game-player.tsx`: para `game.id === "asteroides"`, «GUARDAR PUNTUACIÓN» llama a `saveScore` con las iniciales y la puntuación real, con estados guardando / guardado / error.
- `/salon`: ranking real del juego seleccionado (top 12), con podio y tabla, y estados vacío y de error.
- `/juegos/[id]`: leaderboard real (top 10), «Mejor global» y «Partidas» reales derivados de `game_stats`.
- Eliminar `seededScores` y el mock de puntuaciones de `lib/scores.ts`.

**Out of scope (para specs futuros):**

- Supabase Auth, `scores.user_id`, perfiles y nombres de usuario; las iniciales son anónimas y libres.
- Anti-trampas: la puntuación la envía el cliente y no se verifica en servidor; tampoco hay rate limiting ni captcha.
- `SUPABASE_SERVICE_ROLE_KEY` o cualquier clave con privilegios (la política de insert es pública, ver Riesgos).
- Guardar puntuaciones de los otros 8 juegos: siguen simulados y su «GUARDAR PUNTUACIÓN» conserva el feedback sin persistir.
- Mostrar la posición obtenida en el ranking tras guardar.
- Ranking por periodo (semanal, mensual) o con una sola fila por jugador.
- Paginación, buscador o filtros del ranking.
- Panel de administración para editar `games` (se edita con migraciones).
- Portada propia de `asteroides` y cualquier cambio visual de tarjetas, podio o tabla más allá de los estados vacío/error.
- Realtime (el ranking no se actualiza en vivo).
- Tests automatizados (no hay runner configurado).

---

## Data model

Migración `supabase/migrations/20261117000000_games_and_scores.sql`:

```sql
create table public.games (
  id          text primary key check (id ~ '^[a-z0-9-]+$'),   -- slug de la URL
  title       text not null,
  short       text not null,
  long        text not null,
  cat         text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover       text not null,                                   -- clase CSS, p. ej. 'cover-bricks'
  color       text not null check (color in ('cyan','magenta','green','yellow')),
  sort_order  integer not null unique,
  created_at  timestamptz not null default now()
);

create table public.scores (
  id           uuid primary key default gen_random_uuid(),
  game_id      text not null references public.games(id) on delete cascade,
  player_name  text not null check (player_name ~ '^[A-Z0-9]{3}$'),
  score        integer not null check (score > 0 and score <= 9999999),
  created_at   timestamptz not null default now()
);

create index scores_game_ranking_idx
  on public.scores (game_id, score desc, created_at asc);

create view public.game_stats with (security_invoker = true) as
  select g.id as game_id,
         coalesce(max(s.score), 0) as best,
         count(s.id)::integer      as plays
  from public.games g
  left join public.scores s on s.game_id = g.id
  group by g.id;

alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public"  on public.games  for select to anon, authenticated using (true);
create policy "scores_select_public" on public.scores for select to anon, authenticated using (true);
create policy "scores_insert_public" on public.scores for insert to anon, authenticated with check (true);
-- Sin políticas de update ni delete: las filas son inmutables desde la API.

-- insert into public.games (...) values (...)  -- 9 filas copiadas de lib/games.ts, sort_order 1..9
```

Tipos TypeScript y contrato (firmas, sin implementación):

```ts
// lib/games.ts — solo tipos y constantes; se elimina GAMES
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type CoverColor = "cyan" | "magenta" | "green" | "yellow";
export interface Game {
  /* igual que hoy; best: number; plays: number */
}
export const CATS: ["TODOS", ...Category[]];

// lib/scores.ts — sustituye al mock
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; /* "DD/MM/AAAA" */
}

// lib/db/games.ts
export async function getGames(): Promise<Game[]>; // ordenados por sort_order, con best y plays
export async function getGame(id: string): Promise<Game | null>;
export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]>;

// app/juegos/[id]/jugar/actions.ts  ("use server")
export type SaveScoreResult =
  { ok: true } | { ok: false; error: "INVALID" | "UNKNOWN_GAME" | "FAILED" };
export async function saveScore(
  gameId: string,
  playerName: string,
  score: number,
): Promise<SaveScoreResult>;
```

Convenciones:

- Orden del ranking: `score` descendente y, a igualdad, `created_at` ascendente (gana quien llegó antes). `rank` se calcula al leer (posición + 1), no se guarda.
- `playerName` se normaliza a mayúsculas y se recorta; debe cumplir `^[A-Z0-9]{3}$`. El input del modal limita a 3 caracteres y los pasa a mayúsculas.
- `score` debe ser un entero entre 1 y 9 999 999.
- Solo `asteroides` envía puntuaciones; `saveScore` rechaza con `UNKNOWN_GAME` un `game_id` que no exista en `games`.
- `plays` pasa de `string` ("12.4K") a `number`; el formato visible se resuelve en un helper de presentación.
- La fecha del ranking se formatea desde `created_at` como `DD/MM/AAAA`.
- Las lecturas públicas usan la publishable key (SPEC 04); no se añade ninguna clave nueva.
- Los nombres y rutas de archivos son propuesta de este spec; pueden ajustarse al implementar si Next.js lo requiere.

---

## Implementation plan

Antes del paso 1 se debe leer en `node_modules/next/dist/docs/` las guías de App Router sobre Server Actions, `"use cache"`/`cacheComponents`, `generateStaticParams` y `searchParams` (Next.js 16), y en el MCP de Supabase (`search_docs`) la guía de RLS y vistas con `security_invoker`. Se invoca `/frontend-design` solo para los estados vacío y de error del ranking y del modal; el diseño existente no cambia.

1. **Migración.** Crear `supabase/migrations/20261117000000_games_and_scores.sql` con el data model y la siembra de los 9 juegos (copiando literalmente `lib/games.ts`) y aplicarla con `apply_migration` del MCP. Verificación: `list_tables` muestra `games` (9 filas) y `scores` con RLS activo; `get_advisors` (security) no reporta tablas sin RLS ni la vista sin `security_invoker`.
2. **Tipos generados.** Regenerar `lib/supabase/database.types.ts` con `generate_typescript_types`. Verificación: `Database` incluye `games`, `scores` y `game_stats`; `npx tsc --noEmit` sin errores.
3. **Capa de datos.** Crear `lib/db/games.ts` (`getGames`, `getGame`, `getTopScores`) y ajustar `lib/scores.ts` y `lib/games.ts` a las firmas del data model sin eliminar aún `GAMES`. Si `generateStaticParams` necesita leer sin petición, añadir un cliente sin cookies (`lib/supabase/public.ts`) según indique la guía de `cacheComponents`. Verificación: `npx tsc --noEmit` sin errores; una consulta manual devuelve 9 juegos con `best = 0` y `plays = 0`.
4. **Catálogo desde la BD.** Migrar home, `/games`, `/juegos/[id]` y `/juegos/[id]/jugar` a `getGames`/`getGame` (las páginas son Server Components y pasan los datos como props a `library.tsx`, `game-card.tsx`, `mini-card.tsx` y `game-player.tsx`). Eliminar `GAMES` y el helper de `plays` formateado. Verificación: las cuatro rutas se ven igual que antes salvo `best`/`plays` en 0; `/juegos/inexistente` devuelve 404; `grep` de `GAMES` en `app/`, `components/` y `lib/` solo da resultados en comentarios o ninguno.
5. **Server Action `saveScore`.** Crear `app/juegos/[id]/jugar/actions.ts` con validación (nombre, score, existencia del juego) e `insert` en `scores`; ante error de Supabase devuelve `FAILED` sin exponer el detalle. Tras guardar, invalidar la caché del ranking y de `game_stats` del juego según la guía de `cacheComponents`. Verificación: `npx tsc --noEmit` sin errores.
6. **Modal de fin de partida.** Modificar `components/game-player.tsx`: para `asteroides`, «GUARDAR PUNTUACIÓN» llama a `saveScore` (botón deshabilitado mientras guarda, input con `maxLength={3}` y mayúsculas, mensaje de error si falla y se puede reintentar); al guardar muestra «PUNTUACIÓN GUARDADA_». Los demás ids conservan el comportamiento actual (solo feedback). Verificación: jugar Asteroides, guardar `AAA` y comprobar la fila con `execute_sql`.
7. **Leaderboard en `/salon`.** Reemplazar `seededScores` por `getTopScores(tab, 12)`. Las pestañas pasan a ser enlaces `?juego=<id>` (por defecto el primer juego por `sort_order`) para que el ranking se resuelva en servidor. Podio con huecos `---` cuando hay menos de 3 filas; estado vacío «SIN PUNTUACIONES TODAVÍA» y estado de error «NO SE PUDO CARGAR EL RANKING». Verificación: `/salon?juego=asteroides` muestra la fila guardada en el paso 6; los otros juegos muestran el estado vacío.
8. **Leaderboard y stats en el detalle.** En `/juegos/[id]`, `getTopScores(id, 10)` con los mismos estados vacío y de error; «Mejor global» y «Partidas» desde `game_stats`. Verificación: tras guardar una puntuación, `Partidas` y `Mejor global` de `asteroides` se actualizan.
9. **Limpieza, lint y build.** Eliminar `seededScores` y el resto del mock, regenerar tipos si algo cambió y ejecutar `npm run lint` y `npm run build`. Verificación: ambos terminan sin errores y `grep` de `seededScores` no devuelve resultados.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores de TypeScript ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] `supabase/migrations/20261117000000_games_and_scores.sql` existe y está aplicada: `list_migrations` la muestra.
- [ ] `list_tables` muestra `games` con 9 filas y `scores` con RLS activo en ambas tablas.
- [ ] `get_advisors` (security) no reporta tablas sin RLS ni vistas `SECURITY DEFINER` para `games`, `scores` y `game_stats`.
- [ ] Con la publishable key, un `update` o `delete` sobre `scores` desde la API no modifica ninguna fila.
- [ ] Un insert directo en `scores` con `player_name = 'ab'`, `score = 0` o `score = 10000000` es rechazado por la BD.
- [ ] `lib/supabase/database.types.ts` incluye `games`, `scores` y `game_stats`.
- [ ] `grep` de `seededScores` y de `GAMES` (como importación) en `app/`, `components/` y `lib/` no devuelve resultados.
- [ ] `grep` de `SERVICE_ROLE` y de `SUPABASE_DB_PASSWORD` en `app/`, `components/` y `lib/` no devuelve resultados.
- [ ] La home, `/games` y `/juegos/[id]` muestran los mismos 9 juegos, con los mismos textos, portadas y colores que antes de la migración.
- [ ] La home muestra los 6 primeros juegos por `sort_order`.
- [ ] `/juegos/inexistente` y `/juegos/inexistente/jugar` devuelven 404.
- [ ] En `/juegos/asteroides/jugar`, escribir `abc`, pulsar «GUARDAR PUNTUACIÓN» y ver «PUNTUACIÓN GUARDADA_» crea una fila en `scores` con `game_id = 'asteroides'`, `player_name = 'ABC'` y el score real de la partida.
- [ ] El input de iniciales no admite más de 3 caracteres y convierte a mayúsculas.
- [ ] Iniciales vacías o inválidas muestran un error en el modal y no crean ninguna fila.
- [ ] Pulsar «GUARDAR PUNTUACIÓN» dos veces seguidas crea una sola fila.
- [ ] Si `saveScore` falla (p. ej. sin red), el modal muestra un error y permite reintentar sin perder la puntuación.
- [ ] «GUARDAR PUNTUACIÓN» en `/juegos/caida/jugar` muestra solo el feedback y no crea filas en `scores`.
- [ ] `/salon?juego=asteroides` muestra la puntuación guardada con su fecha `DD/MM/AAAA`, ordenada de mayor a menor y, a igualdad, por antigüedad.
- [ ] `/salon` sin parámetro selecciona el primer juego por `sort_order`; un `?juego=` inexistente no rompe la página.
- [ ] `/salon?juego=caida` (sin puntuaciones) muestra «SIN PUNTUACIONES TODAVÍA» y no muestra nombres falsos.
- [ ] Con 1 o 2 puntuaciones, el podio muestra los huecos vacíos sin errores de render.
- [ ] `/salon` muestra como máximo 12 filas y `/juegos/[id]` como máximo 10.
- [ ] `/juegos/asteroides` muestra el mismo ranking que `/salon?juego=asteroides` (sus 10 primeras filas), «Partidas» igual al `COUNT` de `scores` y «Mejor global» igual al `MAX`.
- [ ] Una puntuación guardada aparece en `/salon` y en `/juegos/asteroides` al recargar, sin redeploy.
- [ ] Con las variables de Supabase inválidas, `/salon` y `/juegos/[id]` muestran «NO SE PUDO CARGAR EL RANKING» o equivalente y no responden 500.
- [ ] La consola del navegador no muestra errores de hidratación en `/`, `/games`, `/salon`, `/juegos/asteroides` y `/juegos/asteroides/jugar`.
- [ ] A 375 px de ancho `/salon` y `/juegos/asteroides` no tienen scroll horizontal.

---

## Decisions

- **Sí:** tabla `games` en Supabase como fuente única del catálogo (decisión del usuario). Es necesaria como FK de `scores` y evita dos fuentes de verdad.
- **No:** dejar `lib/games.ts` para presentación y la BD solo con id/título. Habría descripciones y portadas en código y en BD a la vez.
- **Sí:** `games.id` es el slug de la URL (`text`), no un `uuid`. Las rutas ya usan el slug y se evita un join o un mapeo.
- **Sí:** `sort_order` explícito en `games`. El orden del catálogo (y la home con los 6 primeros) hoy depende del orden del array; sin columna, la BD no lo garantiza.
- **Sí:** puntuaciones anónimas con 3 iniciales (decisión del usuario). Auth no existe y meterlo aquí duplicaría el tamaño del spec; `scores.user_id` se añade en el spec de Auth.
- **Sí:** iniciales de exactamente 3 caracteres `A–Z0–9`. Es la convención arcade, acota el abuso de texto libre y el input del modal ya existe.
- **Sí:** Server Action con validación previa al insert (decisión del usuario). Mantiene el contrato (nombre, score, juego) en un solo lugar de código y no expone lógica en el navegador.
- **No:** insert directo desde el navegador. Dejaría la validación solo en la BD y el modal acoplado al cliente de Supabase.
- **Sí:** CHECKs en la BD además de la validación de la Server Action. La BD es la última barrera si se llama a la API directamente.
- **Sí:** política de insert pública (`anon`) con `with check (true)` y las restricciones en CHECKs. Sin `service_role` (SPEC 04) no hay otra forma de que la Server Action inserte sin sesión; el riesgo se declara abajo.
- **No:** políticas de update/delete. Las puntuaciones son inmutables desde la API; las correcciones se hacen con SQL desde el MCP/dashboard.
- **Sí:** `best` y `plays` derivados de `scores` mediante la vista `game_stats` (decisión del usuario). Sin columnas ni triggers que se desincronicen. `plays` cuenta puntuaciones guardadas, no partidas jugadas.
- **No:** columnas `best`/`plays` mantenidas con trigger. Más piezas y más riesgo de inconsistencias sin necesidad a este volumen.
- **Sí:** el detalle `/juegos/[id]` también lee datos reales, top 10 (decisión del usuario). Si no, mostraría nombres falsos incoherentes con `/salon`. `/salon` mantiene top 12 como hoy.
- **Sí:** una fila por partida; un mismo jugador puede aparecer varias veces. Es lo más simple y lo coherente con jugadores anónimos que no se pueden identificar.
- **No:** mejor puntuación por iniciales. Sin identidad, «AAA» sería varias personas y la consulta agregada no aporta valor.
- **Sí:** los 8 juegos simulados quedan con ranking vacío y `best`/`plays` en 0 (decisión del usuario). No se siembran puntuaciones falsas: los datos mock desaparecen y cada juego los llenará al volverse real.
- **No:** sembrar puntuaciones mock en `scores`. Contaminaría la tabla real y habría que borrarlas después.
- **Sí:** las pestañas de `/salon` pasan a enlaces `?juego=<id>` con ranking resuelto en servidor. Evita cargar los 9 rankings al cliente o una API solo para cambiar de pestaña.
- **Sí:** estados vacío y de error explícitos. Con datos reales, «sin puntuaciones» es el estado normal de 8 de los 9 juegos.
- **No:** mostrar la posición obtenida tras guardar. Sería una consulta y UI extra; no pedida.
- **Sí:** el spec mantiene tabla, Server Action y UI en uno solo. Aunque toca varias áreas, comparten una sola migración y no se pueden verificar por separado: un ranking sin escritura o una escritura sin ranking no es verificable.
- **Sí:** los nombres de archivos y rutas del plan son propuesta; pueden ajustarse al implementar.

---

## Risks

| Riesgo                                                                                                           | Mitigación                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cualquiera puede insertar en `scores` directamente con la publishable key, saltándose la Server Action.          | CHECKs de formato y rango en la BD acotan el daño; sin update/delete no se pueden alterar filas existentes. Rate limiting, captcha o Auth llegan en un spec posterior; se acepta el riesgo para un ranking anónimo. |
| Puntuaciones falsificadas desde el cliente (el score lo envía el navegador).                                     | Fuera de alcance; el tope 9 999 999 evita valores absurdos. La verificación en servidor exigiría rediseñar el motor.                                                                                                |
| Contenido ofensivo en las iniciales.                                                                             | Solo 3 caracteres alfanuméricos; moderación y borrado manual con SQL si hace falta.                                                                                                                                 |
| `cacheComponents` hace dinámicas las rutas que leen datos y rompe `generateStaticParams` al leer la BD en build. | Leer las guías antes del paso 1; cliente sin cookies para lecturas públicas y límites `Suspense` en las secciones dinámicas.                                                                                        |
| El ranking aparece desactualizado tras guardar por la caché.                                                     | Invalidar tras `saveScore` (paso 5) y criterio de aceptación específico.                                                                                                                                            |
| Eliminar `GAMES` rompe componentes cliente que lo importan (`library.tsx`, `hall-of-fame.tsx`, home).            | Las páginas pasan los datos por props; `grep` en los criterios de aceptación y `npm run build` detectan referencias rotas.                                                                                          |
| Un fallo o pausa del proyecto Supabase (plan gratuito) deja sin catálogo a toda la app, no solo al ranking.      | Es la consecuencia directa de «BD fuente única»; el catálogo devuelve error controlado y se documenta. Reactivar el proyecto desde el dashboard.                                                                    |
| Los datos sembrados difieren de los de `lib/games.ts` por un error al copiarlos.                                 | Copiar literalmente antes de eliminar `GAMES`; criterio de aceptación de igualdad de textos, portadas y colores.                                                                                                    |
| Tipos generados obsoletos si se cambia el esquema.                                                               | Regenerar `database.types.ts` en el paso 2 y en el paso 9.                                                                                                                                                          |
| Pulsar «GUARDAR» varias veces crea filas duplicadas.                                                             | Botón deshabilitado mientras guarda y estado `saved`; criterio de aceptación específico.                                                                                                                            |
| `plays` ya no es el volumen real de partidas jugadas, solo guardadas.                                            | Documentado en Decisions; se renombra o se cuentan partidas en otro spec si hace falta.                                                                                                                             |

---

## What is **not** in this spec

- Auth, `user_id` en `scores` o perfiles de jugador.
- Anti-trampas, rate limiting o captcha.
- `SUPABASE_SERVICE_ROLE_KEY` y operaciones con privilegios.
- Guardar puntuaciones de los otros 8 juegos simulados.
- Posición obtenida tras guardar, rankings por periodo, mejor puntuación por jugador, paginación o filtros.
- Panel de administración de `games`.
- Realtime y rediseño visual del podio o la tabla.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
