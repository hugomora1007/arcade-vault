# SPEC 01 — MVP visual de Arcade Vault (todas las pantallas)

> **Status:** Implementado
> **Depends on:** Ninguna (primer spec; parte del scaffold de `create-next-app`)
> **Date:** 2026-11-03
> **Objective:** Portar a Next.js (App Router) las cinco pantallas del prototipo `references/templates/` (Biblioteca, Detalle, Reproductor, Auth y Salón de la Fama) como maqueta visual con datos mock, sin implementar ningún juego.

---

## Por qué existe este spec

El prototipo en `references/templates/` es React por CDN con enrutado por hash y estado local. Este spec lo convierte en la base real del proyecto (rutas, tipos, estilos globales) para que los specs siguientes (juegos, auth real, ranking real) se apoyen en ella sin reescribir la UI.

---

## Scope

**In:**

- Rutas App Router: `/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/auth`, `/salon`.
- Layout compartido: `Nav` (con menú móvil) y footer, tal como en `nav.jsx` y `app.jsx`.
- Biblioteca: hero, búsqueda por nombre, chips de categoría, grilla de tarjetas con tilt, estado vacío «NO HAY RESULTADOS».
- Detalle de juego: portada, tags, descripción, strip de estadísticas, ranking top 10 y botones JUGAR AHORA / VOLVER AL VAULT.
- Reproductor (maqueta): HUD, pantalla CRT con arena decorativa, PAUSA/REANUDAR, FIN, SALIR, modal de fin de juego con campo de iniciales y feedback «PUNTUACIÓN GUARDADA_». La puntuación sube con un temporizador falso.
- Auth (solo visual): pestañas Iniciar sesión / Crear cuenta, formulario, «Jugar como invitado», botones sociales decorativos.
- Salón de la Fama: tabs por juego, podio top 3, tabla de 12 filas, botón de vuelta a la biblioteca.
- Datos mock tipados en TypeScript (8 juegos, categorías, `seededScores` determinista).
- Estilos portados de `references/templates/styles.css` a `app/globals.css`, con colores y fuentes expuestos como tokens en `@theme inline`.
- Metadata de la app (título y descripción) acorde a Arcade Vault.

**Out of scope (para specs futuros):**

- Implementación de cualquier juego (el CRT solo muestra una arena decorativa).
- Autenticación real, sesión, usuario en la nav o validación de formularios.
- Persistencia de usuario o de puntuaciones (ni `localStorage` ni backend).
- Fila «tu mejor marca» del Salón (requiere usuario).
- API, base de datos o route handlers.
- Login social funcional (Google/GitHub).
- Tests automatizados (no hay runner configurado).
- Internacionalización: la UI queda en español.

---

## Data model

Datos mock en TypeScript. No hay persistencia.

```ts
// lib/games.ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type CoverColor = "cyan" | "magenta" | "green" | "yellow";

export interface Game {
  id: string;          // slug usado en la URL, p. ej. "bloque-buster"
  title: string;
  short: string;       // descripción corta (tarjeta)
  long: string;        // descripción larga (detalle)
  cat: Category;
  cover: string;       // clase CSS de portada, p. ej. "cover-bricks"
  color: CoverColor;   // color del botón JUGAR
  best: number;        // mejor puntuación global (mock)
  plays: string;       // partidas formateadas, p. ej. "12.4K"
}

export const GAMES: Game[];                 // 8 juegos, los de data.jsx
export const CATS: ["TODOS", ...Category[]];
```

```ts
// lib/scores.ts
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;        // "DD/MM/2026"
}

export function seededScores(seed: number, count?: number): ScoreRow[]; // determinista
```

Convenciones:

- `seededScores` debe devolver el mismo resultado para la misma semilla (render de servidor y cliente coinciden, sin errores de hidratación).
- Semillas del prototipo: detalle `id.length * 17 + 3` con 10 filas; salón `id.length * 23 + 7` con 12 filas.
- Números formateados con `toLocaleString("es-ES")`.

---

## Implementation plan

1. **Datos y tipos.** Crear `lib/games.ts` y `lib/scores.ts` portando `data.jsx`. Verificación: `npx tsc --noEmit` sin errores.
2. **Estilos globales.** Copiar `references/templates/styles.css` a `app/globals.css` conservando clases y animaciones; mapear variables de color y fuentes a `@theme inline`. Mantener `@import "tailwindcss"`. Verificación: `npm run dev` arranca sin errores de CSS.
3. **Layout, Nav y footer.** Crear `components/nav.tsx` (client, menú móvil) y actualizar `app/layout.tsx` con `Nav`, `<main className="av-main">` y footer. Actualizar `metadata`. Usuario siempre ausente: botón «Iniciar Sesión» enlaza a `/auth`. Verificación: la nav aparece en todas las rutas y marca la ruta activa.
4. **Biblioteca (`/`).** Crear `components/game-card.tsx` y `components/library.tsx` (client: búsqueda + chips) y reemplazar `app/page.tsx`. Las tarjetas enlazan a `/juegos/[id]`. Verificación: filtrar por texto y categoría; estado vacío visible.
5. **Detalle (`/juegos/[id]`).** Crear `app/juegos/[id]/page.tsx` (con `generateStaticParams` y `notFound()` si el id no existe). JUGAR AHORA enlaza a `/juegos/[id]/jugar`. Verificación: abrir un id válido y uno inválido.
6. **Salón de la Fama (`/salon`).** Crear `app/salon/page.tsx` y `components/hall-of-fame.tsx` (client: tabs). Sin fila «tu mejor marca». Verificación: cambiar de juego cambia podio y tabla.
7. **Auth (`/auth`).** Crear `app/auth/page.tsx` y `components/auth-form.tsx` (client: pestañas). El submit (con `preventDefault`) y «Jugar como invitado» navegan a `/` con `router.push`. Verificación: ambas pestañas se alternan y redirigen.
8. **Reproductor (`/juegos/[id]/jugar`).** Crear `app/juegos/[id]/jugar/page.tsx` y `components/game-player.tsx` (client: score simulado, pausa, FIN, modal). Jugador siempre «INVITADO» editable en el modal. «GUARDAR PUNTUACIÓN» solo muestra el feedback. SALIR vuelve al detalle. Verificación: el score sube, la pausa lo detiene, FIN abre el modal.
9. **Revisión final de responsive y lint.** Ajustar breakpoints móviles heredados del prototipo y ejecutar `npm run lint` y `npm run build`.

Antes del paso 3 se debe leer la guía correspondiente en `node_modules/next/dist/docs/` (Next.js 16 con `cacheComponents`), en especial sobre `params` asíncrono y componentes cliente. Si `cacheComponents` obliga a envolver alguna página en `Suspense`, se resuelve en el paso donde aparezca.

---

## Acceptance criteria

- [X] `npm run build` termina sin errores de TypeScript ni de compilación.
- [X] `npm run lint` termina sin errores.
- [X] `/` muestra el hero «ARCADE VAULT» y 8 tarjetas de juego.
- [X] Escribir «caí» en el buscador deja solo la tarjeta CAÍDA.
- [X] Pulsar el chip «SHOOTER» muestra exactamente INVASORES y ROCAS.
- [X] Una búsqueda sin coincidencias muestra «NO HAY RESULTADOS».
- [X] Pulsar una tarjeta o su botón JUGAR navega a `/juegos/<id>`.
- [X] `/juegos/caida` muestra el título, la descripción larga, 3 estadísticas y un ranking de 10 filas.
- [X] `/juegos/no-existe` devuelve la página 404.
- [X] JUGAR AHORA en el detalle navega a `/juegos/<id>/jugar`; VOLVER AL VAULT navega a `/`.
- [X] En el reproductor la puntuación aumenta con el tiempo; PAUSA la detiene y muestra «EN PAUSA»; REANUDAR la continúa.
- [X] FIN abre el modal «FIN DEL JUEGO» con la puntuación final; GUARDAR PUNTUACIÓN muestra «PUNTUACIÓN GUARDADA_» y no escribe en `localStorage`.
- [X] JUGAR DE NUEVO reinicia puntuación, vidas y nivel; SALIR vuelve a `/juegos/<id>`.
- [X] `/salon` muestra podio top 3 y 12 filas; cambiar de tab cambia los datos; no existe la fila «tu mejor marca».
- [X] `/auth` alterna entre «INICIAR SESIÓN» y «CREAR CUENTA» (el campo de correo solo aparece en la segunda).
- [X] Enviar el formulario de `/auth` o pulsar «JUGAR COMO INVITADO» navega a `/`.
- [X] La nav aparece en las 5 rutas, resalta «Biblioteca» en `/`, `/juegos/*` y «Salón de la Fama» en `/salon`.
- [X] A 375 px de ancho la nav muestra el botón hamburguesa y el panel lateral abre y cierra.
- [X] La consola del navegador no muestra errores de hidratación en ninguna de las 5 rutas.

---

## Decisions

- **Sí:** rutas reales del App Router (`/juegos/[id]`, `/juegos/[id]/jugar`, `/auth`, `/salon`). URLs compartibles y aprovechan Next.js.
- **No:** una sola página con estado y hash como el prototipo. Desaprovecha el framework y se rehace en el siguiente spec.
- **Sí:** auth solo visual sin usuario. El MVP es solo la parte visual y no hay backend.
- **No:** sesión simulada con `localStorage` (`av_user`). Añade estado global que se tiraría al llegar la auth real.
- **Sí:** reproductor como maqueta con score simulado. Permite validar HUD, pausa y modal que usarán los juegos reales.
- **No:** persistir puntuaciones en `localStorage` (`av_scores`). Nada las lee y se reemplazarán por backend.
- **Sí:** datos mock tipados en `lib/`. Contrato claro (`Game`, `ScoreRow`) para sustituirlo por una API después.
- **No:** JSON con route handlers. Complejidad innecesaria para un MVP visual.
- **Sí:** CSS global fiel al prototipo con tokens en `@theme inline`. Máxima fidelidad visual con el menor riesgo.
- **No:** reescritura completa en utilidades Tailwind. Mucho trabajo y riesgo de divergir del diseño.
- **Sí:** los nombres de archivos de la sección Implementation plan son propuesta de este spec; pueden ajustarse al implementar si Next.js lo requiere.
- **Sí:** el contador «CRÉDITOS · 03» de la nav queda como texto fijo decorativo.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| `cacheComponents` en Next.js 16 cambia el comportamiento de páginas dinámicas y `params`. | Leer la guía en `node_modules/next/dist/docs/` antes de escribir rutas; usar `generateStaticParams` para los 8 ids. |
| Errores de hidratación por datos aleatorios (`Math.random`) o tilt en tarjetas. | `seededScores` es determinista; el azar solo vive en el temporizador del reproductor, dentro de `useEffect`. |
| `styles.css` usa variables y clases globales que pueden chocar con las de Tailwind v4 / `globals.css` actual. | Portar el CSS tras `@import "tailwindcss"` y revisar los tokens del `@theme inline` existentes antes de sobrescribirlos. |
| Fuentes del prototipo distintas a las cargadas en `app/layout.tsx`. | Comparar `font-family` de `styles.css` con las fuentes de `layout.tsx` en el paso 2 y alinear con `next/font/google`. |
| El prototipo trae efectos pesados (CRT, scanlines, flicker) con coste de rendimiento en móviles. | Respetar `prefers-reduced-motion` si el CSS lo contempla; no añadir efectos nuevos. |

---

## What is **not** in this spec

- Ningún juego jugable.
- Autenticación real ni usuario en sesión.
- Guardado de puntuaciones o ranking real.
- Fila «tu mejor marca» del Salón de la Fama.
- API, base de datos o route handlers.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
