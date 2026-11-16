# SPEC 04 — Cimientos de Supabase en Next.js

> **Status:** Implementado
> **Depends on:** SPEC 03
> **Date:** 2026-11-15
> **Objective:** Dejar Supabase integrado en la app (dependencias, clientes de servidor y navegador, variables de entorno, estructura `supabase/` y un endpoint `/api/health` que verifica la conexión) sin crear tablas, auth ni cambios de UI.

---

## Por qué existe este spec

La app solo usa datos mock (`lib/games.ts`, `lib/scores.ts`, `lib/home.ts`) y un `auth-form` visual. Antes de migrar auth, juegos o puntuaciones a Supabase hace falta una base común y verificada. Separar los cimientos evita mezclar en un mismo spec infraestructura, esquema y UI, y deja cada feature posterior (auth, puntuaciones) con un punto de partida estable.

El proyecto remoto ya existe (`project_ref` `xpyulpjkvydcihwhvrds`, configurado en `.mcp.json`) y `.env.local` ya contiene `SUPABASE_DB_PASSWORD`.

---

## Scope

**In:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Cliente de navegador (`lib/supabase/client.ts`) y cliente de servidor (`lib/supabase/server.ts`, basado en `cookies()` de `next/headers`).
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, añadidas a `.env.local` y documentadas en `specs/.env.template`.
- Validación de que ambas variables existen, con un error claro si faltan (`lib/supabase/env.ts`).
- Estructura `supabase/` en la raíz con `supabase/migrations/` (vacía, con `.gitkeep`) para las migraciones versionadas de specs futuros.
- Tipos TypeScript generados del esquema `public` en `lib/supabase/database.types.ts` y usados como genérico `Database` en ambos clientes.
- Route Handler `GET /api/health` que comprueba desde el servidor que la URL y la publishable key son válidas y devuelve `{ ok: true }` o `{ ok: false }`.

**Out of scope (para specs futuros):**

- Supabase Auth: registro, login, logout, sesión, conectar `auth-form.tsx` o mostrar usuario en la nav.
- `proxy.ts` (antes `middleware.ts`) para refrescar la sesión; llega con el spec de Auth.
- Tablas, políticas RLS, semillas o cualquier migración con contenido; cada tabla llega con su feature.
- Reemplazar los mocks (`lib/games.ts`, `lib/scores.ts`, `lib/home.ts`) por datos de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` ni ninguna clave con privilegios; la app solo usa la publishable key.
- Supabase local con CLI y Docker.
- Realtime, Storage y Edge Functions.
- Tests automatizados (no hay runner configurado).

---

## Data model

Este spec no introduce tablas ni estructuras de datos de negocio. Solo añade configuración y los tipos generados del esquema `public`, que en este momento está vacío.

Variables de entorno:

```bash
# Públicas por diseño: protegidas por RLS, nunca dan privilegios de administrador.
NEXT_PUBLIC_SUPABASE_URL=https://xpyulpjkvydcihwhvrds.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxx
```

Firmas esperadas (sin implementación):

```ts
// lib/supabase/env.ts
export function getSupabaseEnv(): { url: string; publishableKey: string };

// lib/supabase/client.ts
export function createClient(): SupabaseClient<Database>;

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient<Database>>;
```

```ts
// app/api/health/route.ts
export async function GET(): Promise<Response>; // 200 { ok: true } | 503 { ok: false }
```

Convenciones:

- Se crea un cliente nuevo por llamada; no hay singleton global en el servidor.
- El `project_ref` se obtiene con `get_project_url` y la publishable key con `get_publishable_keys` del MCP de Supabase; no se copian de otra fuente.
- `/api/health` no devuelve la URL, la key ni el error crudo de Supabase.
- Los archivos de `supabase/migrations/` seguirán el formato `YYYYMMDDHHMMSS_nombre.sql` cuando existan.

---

## Implementation plan

Antes del paso 1 se debe leer en `node_modules/next/dist/docs/` la guía de App Router sobre Route Handlers, variables de entorno y `cookies()` (Next.js 16 con `cacheComponents`), y en la documentación de Supabase la guía de `@supabase/ssr` para Next.js (`search_docs` del MCP).

1. **Dependencias.** Ejecutar `npm install @supabase/supabase-js @supabase/ssr`. Verificación: `npx tsc --noEmit` sin errores.
2. **Variables de entorno.** Obtener la URL y la publishable key con las herramientas `get_project_url` y `get_publishable_keys` del MCP. Añadirlas a `.env.local` y a `specs/.env.template` (con valores de ejemplo, sin la key real). Verificación: `git status` no muestra `.env.local` y la plantilla no contiene la key real.
3. **Validación de entorno.** Crear `lib/supabase/env.ts` con `getSupabaseEnv()`, que lanza un error en español indicando qué variable falta. Verificación: `npx tsc --noEmit` sin errores.
4. **Estructura de migraciones.** Crear `supabase/migrations/.gitkeep`. Verificación: la carpeta aparece en `git status`.
5. **Tipos generados.** Generar los tipos con `generate_typescript_types` del MCP y guardarlos en `lib/supabase/database.types.ts`. Verificación: el archivo exporta el tipo `Database` y `npx tsc --noEmit` pasa.
6. **Cliente de navegador.** Crear `lib/supabase/client.ts` con `createBrowserClient<Database>` usando `getSupabaseEnv()`. Verificación: `npx tsc --noEmit` sin errores.
7. **Cliente de servidor.** Crear `lib/supabase/server.ts` con `createServerClient<Database>` y el manejo de cookies mediante `await cookies()`; el `setAll` captura el error cuando se invoca desde un Server Component. Verificación: `npx tsc --noEmit` sin errores.
8. **Endpoint de salud.** Crear `app/api/health/route.ts`: `GET` que usa `getSupabaseEnv()` y consulta `{url}/auth/v1/settings` con la cabecera `apikey`; devuelve `200 { ok: true }` si responde 200 y `503 { ok: false }` ante cualquier fallo, sin exponer detalles. Verificación: con `npm run dev`, `curl http://localhost:3000/api/health` devuelve `{"ok":true}`.
9. **Lint y build.** Ejecutar `npm run lint` y `npm run build`; confirmar que `/`, `/games`, `/salon`, `/auth` y `/about` siguen sin cambios. Verificación: ambos comandos terminan sin errores.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores de TypeScript ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] `package.json` lista `@supabase/supabase-js` y `@supabase/ssr` como dependencias.
- [ ] `.env.local` define `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, y `git status` no lo muestra.
- [ ] `specs/.env.template` documenta ambas variables sin la key real.
- [ ] `grep` de `SERVICE_ROLE` y de `SUPABASE_DB_PASSWORD` en `app/`, `components/` y `lib/` no devuelve resultados.
- [ ] `GET /api/health` con las variables correctas responde 200 con el cuerpo `{"ok":true}`.
- [ ] `GET /api/health` con `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` inválida responde 503 con el cuerpo `{"ok":false}` y sin la URL ni la key en la respuesta.
- [ ] `GET /api/health` sin las variables definidas responde 503 y no lanza una excepción no capturada.
- [ ] `lib/supabase/database.types.ts` exporta el tipo `Database`.
- [ ] `lib/supabase/client.ts` y `lib/supabase/server.ts` están tipados con `Database` y compilan sin `any`.
- [ ] `supabase/migrations/` existe en el repositorio.
- [ ] La lista de tablas del esquema `public` (`list_tables` del MCP) sigue vacía.
- [ ] La consola del navegador no muestra errores de hidratación en `/`, `/games`, `/salon`, `/auth` y `/about`.

---

## Decisions

- **Sí:** spec limitado a cimientos. Auth, tablas y migración de mocks van en specs propios; cada uno toca un área distinta y juntos superarían el tamaño razonable de un spec.
- **No:** incluir Auth en este spec. Es una decisión del usuario; el `auth-form.tsx` sigue siendo solo visual.
- **Sí:** `@supabase/ssr` con cliente de servidor basado en cookies. Es la integración oficial para Next.js y deja listo el camino para la sesión sin rehacer los clientes.
- **Sí:** publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Es el formato actual de Supabase y es segura en el cliente gracias a RLS.
- **No:** claves legacy `anon` ni `SUPABASE_SERVICE_ROLE_KEY`. La service role evita RLS y no hay ningún caso que la necesite todavía.
- **Sí:** migraciones SQL versionadas en `supabase/migrations/`, aplicadas al proyecto remoto con el MCP o la CLI. Deja historial y tipos reproducibles.
- **No:** Supabase local con Docker. Añade requisitos de entorno sin necesidad actual.
- **No:** migración inicial con funciones base como `set_updated_at()`. Anticiparía tablas que aún no existen.
- **Sí:** Route Handler `/api/health` como verificación. Comprueba la conexión real desde Next.js. Es una excepción acotada a la regla del SPEC 01 de no tener route handlers, justificada por ser infraestructura de diagnóstico.
- **No:** tabla temporal `ping` ni script manual como verificación. La tabla ensucia el esquema y el script no ejercita Next.js.
- **Sí:** el endpoint consulta `/auth/v1/settings` con la `apikey`. Valida URL y key con una petición de red real sin necesitar tablas. Si al implementar resulta inadecuado, puede cambiarse por otra consulta equivalente.
- **No:** `proxy.ts` ahora. Sin sesiones no tiene función y añade código en cada petición; llega con el spec de Auth.
- **Sí:** documentar las variables en `specs/.env.template`, que es la plantilla de entorno existente en el repositorio.
- **Sí:** los nombres de archivos del plan son propuesta de este spec; pueden ajustarse al implementar si Next.js o `@supabase/ssr` lo requieren.

---

## Risks

| Riesgo                                                                                                | Mitigación                                                                                                           |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `cacheComponents` en Next.js 16 cambia el comportamiento de rutas y de `cookies()`.                   | Leer la guía en `node_modules/next/dist/docs/` antes del paso 1; `/api/health` es un handler dinámico bajo petición. |
| La API de `@supabase/ssr` cambia entre versiones (cookies `getAll`/`setAll`).                         | Consultar `search_docs` del MCP y usar la guía vigente en el paso 7.                                                 |
| `/api/health` es público y puede usarse para generar tráfico hacia Supabase.                          | Responde solo `ok` sin detalles; rate limiting y protección quedan para otro spec.                                   |
| La publishable key se confunde con una clave con privilegios o se copia una `service_role` por error. | Obtenerla con `get_publishable_keys` y verificar con `grep` en los criterios de aceptación.                          |
| El proyecto Supabase está pausado (plan gratuito) y `/api/health` falla.                              | El endpoint devuelve 503; reactivar el proyecto desde el dashboard antes de verificar.                               |
| Los tipos generados quedan obsoletos al añadir tablas.                                                | Cada spec con migraciones regenera `database.types.ts` como último paso.                                             |

---

## What is **not** in this spec

- Autenticación de ningún tipo ni `proxy.ts`.
- Tablas, RLS, semillas o migraciones con contenido.
- Sustituir los datos mock por datos de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` y cualquier operación con privilegios de administrador.
- Supabase local con Docker, Realtime, Storage y Edge Functions.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
