# SPEC 02 — Home (landing page) y mudanza de la Biblioteca a `/games`

> **Status:** Borrador
> **Depends on:** SPEC 01
> **Date:** 2026-11-06
> **Objective:** Convertir `/` en la landing page del prototipo `references/templates/home-about/home.jsx` y mover la Biblioteca actual a `/games`.

---

## Por qué existe este spec

El SPEC 01 dejó la Biblioteca en `/` porque el prototipo original no tenía landing. El nuevo template `references/templates/home-about/` añade un Home de marketing (hero, features, juegos, stats, actividad, precios y CTA final) que debe ser la puerta de entrada. Eso obliga a liberar `/` y reubicar la Biblioteca, con el efecto en cadena sobre los enlaces y la nav.

---

## Scope

**In:**

- Nueva ruta `/` con la landing completa de `home.jsx`, en este orden:
  1. Hero: siluetas flotantes, eyebrow «INSERTA UNA MONEDA_», título de 3 líneas, subtítulo, CTAs y indicador «DESLIZA».
  2. `// 01 ¿POR QUÉ ARCADE VAULT?`: 4 tarjetas de features con icono pixel.
  3. `// 02 JUEGOS DISPONIBLES AHORA`: 6 mini-tarjetas y botón «VER TODOS LOS JUEGOS →».
  4. Banda de stats (3 bloques).
  5. `// 03 ACTIVIDAD EN VIVO`: «ÚLTIMAS PUNTUACIONES» (7 filas) y «TOP JUGADORES · HOY» (5 filas con barra).
  6. `// 04 PRECIOS`: tarjeta «JUGADOR VAULT $0» y 3 preguntas frecuentes.
  7. CTA final «¿LISTO PARA JUGAR?».
- Animación de entrada «reveal» al hacer scroll (clase `.reveal` + `IntersectionObserver`).
- Mover la Biblioteca actual a `/games` sin cambiar su comportamiento.
- Nav: añadir el enlace «Inicio» (`/`); «Biblioteca» pasa a apuntar a `/games` y se resalta en `/games` y `/juegos/*`.
- Actualizar todos los enlaces internos que hoy apuntan a `/` esperando la Biblioteca (ver plan, paso 6).
- Datos mock tipados para las secciones de actividad, top jugadores, stats, features y FAQ.
- Portar a `app/globals.css` los bloques `HOME PAGE` y relacionados (hero, features, mini-rail, stats, activity, pricing, final, `.reveal`, `@keyframes float`, `.lb-link`) de `references/templates/home-about/styles.css`.
- Metadata: se mantiene la actual de `app/layout.tsx`.

**Out of scope (para specs futuros):**

- Página «Acerca de» y formulario de contacto (`about.jsx`, ruta `/about`). Tampoco se añade el enlace «Acerca de» a la nav para no dejar un link roto.
- Datos reales de actividad, ranking o contadores (siguen siendo mock fijo).
- Renombrar `/juegos/[id]` y `/juegos/[id]/jugar` a `/games/...`; quedan como están.
- Auth real, sesión o usuario en la nav.
- Juegos jugables, persistencia, API o base de datos.
- Tests automatizados (no hay runner configurado).
- Internacionalización: la UI queda en español.

---

## Data model

Datos mock en TypeScript, sin persistencia. Las mini-tarjetas **no** introducen datos nuevos: salen de `GAMES.slice(0, 6)` (SPEC 01).

```ts
// lib/home.ts
export type NeonColor = "cyan" | "magenta" | "yellow" | "green";
export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export interface Feature {
  icon: FeatureIconKind;
  title: string;
  desc: string;
  color: NeonColor;
}

export interface Stat {
  n: string;   // "12+", "MILES", "GLOBAL"
  u: string;   // unidad
  s: string;   // subtítulo
}

export interface RecentScore {
  player: string;
  game: string;      // nombre mostrado, copiado del template
  score: number;
  ago: string;       // "hace 2 min"
  color: NeonColor;
}

export interface TopPlayer {
  rank: number;
  player: string;
  score: number;
}

export interface FaqItem {
  q: string;
  a: string;
}

export const FEATURES: Feature[];         // 4
export const STATS: Stat[];               // 3
export const RECENT_SCORES: RecentScore[]; // 7
export const TOP_PLAYERS: TopPlayer[];    // 5
export const PRICING_PERKS: string[];     // 6 viñetas
export const FAQ: FaqItem[];              // 3
```

Convenciones:

- El copy se copia tal cual de `home.jsx`, incluido «12+ JUEGOS» aunque `GAMES` tenga 8.
- Números formateados con `toLocaleString("es-ES")`.
- La barra de cada fila de «TOP JUGADORES» tiene ancho `100 - índice * 16` (%).
- Las filas 1, 2 y 3 del top llevan las clases `top1`, `top2`, `top3`.

---

## Implementation plan

Antes del paso 1 se debe leer en `node_modules/next/dist/docs/` la guía de App Router sobre layouts/páginas y componentes cliente (Next.js 16 con `cacheComponents`).

1. **Mover la Biblioteca a `/games`.** Crear `app/games/page.tsx` que renderiza `<Library />` (mismo contenido que hoy tiene `app/page.tsx`). Temporalmente `/` sigue sirviendo la Biblioteca. Verificación: `/games` muestra el hero de la Biblioteca y 8 tarjetas.
2. **Datos mock del Home.** Crear `lib/home.ts` con los tipos y constantes del Data model. Verificación: `npx tsc --noEmit` sin errores.
3. **Estilos del Home.** Portar a `app/globals.css` los bloques del Home desde `references/templates/home-about/styles.css` (aprox. líneas 930–1070 y 1600–1744: hero, siluetas, features, mini-rail, stats, activity/ticker/top, pricing/FAQ, final, `.reveal`, `@keyframes float`, `.lb-link` y sus `@media`). **No** portar `.about*` ni `.contact*`. Comparar con las clases ya existentes antes de duplicar. Verificación: `npm run dev` arranca sin errores de CSS y `/games` no cambia de aspecto.
4. **Componentes del Home.** Crear en `components/home/`: `floating-silhouettes.tsx`, `feature-icon.tsx`, `mini-card.tsx` (enlaza a `/juegos/[id]` con `<Link>`) y `reveal.tsx` (client; envuelve una sección, añade la clase `in` con `IntersectionObserver`, threshold 0.12). Verificación: `npx tsc --noEmit` sin errores.
5. **Página `/`.** Reemplazar `app/page.tsx` por la landing con las 7 secciones, usando `<Link>` en todos los botones: EXPLORAR JUEGOS, VER TODOS LOS JUEGOS e INSERTAR MONEDA → `/games`; CREAR CUENTA y EMPEZAR GRATIS → `/auth`; VER SALÓN → `/salon`. Verificación: las 7 secciones se ven y los botones navegan.
6. **Actualizar enlaces y nav.** En `components/nav.tsx` añadir «Inicio» (`/`) y apuntar «Biblioteca» a `/games` (barra y panel móvil); `sectionOf` pasa a: `/` → `home`, `/games` y `/juegos/*` → `biblioteca`. Cambiar `href="/"` → `/games` en `app/juegos/[id]/page.tsx` (VOLVER AL VAULT), `components/game-player.tsx` (SALIR del modal), `components/hall-of-fame.tsx` (volver a la biblioteca). Cambiar `router.push("/")` → `router.push("/games")` en `components/auth-form.tsx` (submit y «JUGAR COMO INVITADO»). El logo sigue apuntando a `/`. Verificación: buscar con grep que no queden `href="/"` ni `push("/")` esperando la Biblioteca.
7. **Responsive y lint.** Revisar la landing a 375 px (grids en 1 columna, hero legible) y ejecutar `npm run lint` y `npm run build`.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores de TypeScript ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] `/` muestra el título «EL ARCADE / CLÁSICO ESTÁ / DE VUELTA» y las 7 secciones en el orden del Alcance.
- [ ] La sección «¿POR QUÉ ARCADE VAULT?» muestra 4 tarjetas y «JUEGOS DISPONIBLES AHORA» muestra exactamente 6 mini-tarjetas.
- [ ] Pulsar una mini-tarjeta navega a `/juegos/<id>` del juego correspondiente.
- [ ] «EXPLORAR JUEGOS», «VER TODOS LOS JUEGOS →» e «INSERTAR MONEDA →» navegan a `/games`.
- [ ] «CREAR CUENTA» y «EMPEZAR GRATIS →» navegan a `/auth`; «VER SALÓN →» navega a `/salon`.
- [ ] «ÚLTIMAS PUNTUACIONES» muestra 7 filas y «TOP JUGADORES · HOY» muestra 5 filas, con la primera marcada como `top1`.
- [ ] Las secciones con clase `.reveal` empiezan ocultas y se muestran al entrar en el viewport al hacer scroll.
- [ ] `/games` muestra la Biblioteca con 8 tarjetas, el buscador y los chips funcionando igual que en el SPEC 01.
- [ ] La nav muestra «Inicio», «Biblioteca» y «Salón de la Fama»; resalta «Inicio» solo en `/`, «Biblioteca» en `/games` y `/juegos/*`, y «Salón de la Fama» en `/salon`.
- [ ] La nav no contiene el enlace «Acerca de».
- [ ] VOLVER AL VAULT (detalle), SALIR (reproductor tras fin de juego) y el botón de vuelta del Salón navegan a `/games`.
- [ ] Enviar el formulario de `/auth` o pulsar «JUGAR COMO INVITADO» navega a `/games`.
- [ ] A 375 px de ancho `/` no tiene scroll horizontal y las grids de features, actividad y precios se muestran en 1 columna.
- [ ] La consola del navegador no muestra errores de hidratación en `/`, `/games`, `/juegos/caida`, `/salon` y `/auth`.

---

## Decisions

- **Sí:** Home en `/` y Biblioteca en `/games`. Decisión del usuario: la landing es la puerta de entrada y el catálogo cuelga de ella.
- **No:** Home en `/inicio` manteniendo la Biblioteca en `/`. Una landing que no vive en la raíz no es lo esperable.
- **Sí:** las rutas de detalle y reproductor siguen en `/juegos/[id]` y `/juegos/[id]/jugar`. Solo se mudó la Biblioteca; renombrar el resto ampliaría el cambio. Queda una mezcla `/games` + `/juegos/*` que se puede unificar en un spec posterior.
- **Sí:** auth e invitado redirigen a `/games`. Decisión del usuario: quien entra a jugar va directo al catálogo.
- **Sí:** About y contacto en un spec aparte, sin enlace en la nav. Evita un link roto y mantiene este spec en una sola área.
- **Sí:** contenido mock con el copy tal cual del template (incluido «12+ JUEGOS»). Decisión del usuario; máxima fidelidad al diseño.
- **No:** omitir actividad en vivo y top jugadores hasta tener backend. Se descartó para conservar la landing completa.
- **Sí:** mini-tarjetas derivadas de `GAMES.slice(0, 6)`. No duplica datos de juegos.
- **Sí:** el efecto reveal se encapsula en un componente cliente `reveal.tsx`. La página `/` puede seguir siendo componente de servidor y solo la animación es cliente.
- **No:** reescribir el CSS con utilidades Tailwind. Mismo criterio que el SPEC 01: fidelidad al prototipo con menor riesgo.
- **Sí:** los nombres de archivos del plan son propuesta de este spec; pueden ajustarse al implementar si Next.js lo requiere.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Quedan enlaces a `/` que antes significaban «Biblioteca» y ahora llevan a la landing. | Paso 6 con grep de `href="/"` y `push("/")`; criterios de aceptación específicos por cada enlace. |
| Las secciones `.reveal` quedan invisibles si falla JavaScript o el observer. | El contenido sigue en el HTML; revisar que el componente `reveal.tsx` añade `in` y considerar `prefers-reduced-motion` mostrando todo sin animación. |
| Duplicar o sobrescribir clases de `globals.css` al portar el CSS (la referencia es un superset de 1744 líneas). | Portar solo los bloques del Home y comparar con las clases existentes; verificar que `/games`, `/salon` y `/auth` no cambian. |
| El hero usa `min-height: calc(100vh - 60px)` y varias animaciones: coste en móviles y posible salto de altura. | No añadir efectos nuevos; comprobar a 375 px en el paso 7. |
| `cacheComponents` en Next.js 16 puede exigir `Suspense` o cambiar el comportamiento de páginas. | Leer la guía en `node_modules/next/dist/docs/` antes del paso 1; la landing no usa datos dinámicos. |
| «12+ JUEGOS» no coincide con los 8 juegos reales. | Decisión consciente (copy del template); se corrige en un spec posterior cuando haya catálogo real. |

---

## What is **not** in this spec

- Página «Acerca de» ni formulario de contacto.
- Enlace «Acerca de» en la nav.
- Datos reales de actividad, ranking o estadísticas.
- Renombrar `/juegos/*` a `/games/*`.
- Autenticación real, usuario en la nav o persistencia.
- Juegos jugables, API, base de datos o tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
