# SPEC 03 — Página «Acerca de» y formulario de contacto con Resend

> **Status:** Borrador
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-11-11
> **Objective:** Implementar la ruta `/about` idéntica al prototipo `references/templates/home-about/about.jsx` y hacer que su formulario de contacto envíe un correo real con Resend mediante una Server Action.

---

## Por qué existe este spec

El SPEC 02 dejó fuera `/about` y el formulario de contacto, y retiró el enlace «Acerca de» de la nav para no dejar un link roto. El prototipo `about.jsx` solo simula el envío (`setSent(name)`). Este spec porta la página con fidelidad visual y sustituye la simulación por un envío real, lo que introduce por primera vez código de servidor, una dependencia externa (`resend`) y variables de entorno secretas.

---

## Scope

**In:**

- Nueva ruta `/about` con, en este orden:
  1. Hero «ACERCA DE ARCADE VAULT»: kicker «▸ ACERCA DE», título, texto de misión y 3 `highlight` (HEART magenta, BROWSER cyan, PLANT green) con icono pixel.
  2. Divisor decorativo `about-divider` (2 barras y 24 píxeles animados), `aria-hidden`.
  3. Sección de contacto: intro (kicker «▸ CONTACTO», «CONTÁCTANOS», subtítulo y 3 `tip` con LED) y formulario NOMBRE / CORREO ELECTRÓNICO / MENSAJE con botón «▶  ENVIAR MENSAJE».
- Copy, clases y estructura copiados tal cual de `about.jsx`.
- Animación `.reveal` (componente `Reveal` del SPEC 02) en el divisor y en la sección de contacto.
- Estado de éxito «VAULT-OS // TERMINAL» con el mensaje «MENSAJE RECIBIDO… GRACIAS, {NOMBRE}.» y botón «ENVIAR OTRO MENSAJE», idéntico al template, mostrado **solo** cuando Resend confirma el envío.
- Efecto `shake` del formulario cuando falla la validación del cliente (campos vacíos), como en el template.
- Estado de envío: botón deshabilitado con texto «ENVIANDO…» mientras la Server Action está en curso.
- Estado de error en línea: si falla la validación del servidor o Resend devuelve error, se muestra un mensaje dentro del formulario y se conservan los valores escritos.
- Server Action de envío con Resend: revalida en servidor, comprueba honeypot y envía el correo.
- Nav: enlace «Acerca de» (`/about`) en la barra y en el panel móvil; `sectionOf` resalta «Acerca de» en `/about`.
- Variables de entorno `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` y archivo `.env.example`.
- Portar a `app/globals.css` los bloques `ABOUT` y `CONTACT` (about-hero, highlight-row, about-divider, contact-grid, contact-form, tips, terminal-success, `.shake`, caret) de `references/templates/home-about/styles.css`, con sus `@media`.
- Metadata de la página `/about` (título y descripción en español).

**Out of scope (para specs futuros):**

- Rate limiting por IP o captcha (solo honeypot).
- Dominio propio verificado en Resend; se usa el sandbox.
- Correo de confirmación automático al remitente.
- Plantilla de correo en HTML/React Email (el correo es texto plano).
- Guardar los mensajes en base de datos o mostrarlos en un panel.
- Datos reales en la página (es contenido estático).
- Tests automatizados (no hay runner configurado).
- Internacionalización: la UI queda en español.

---

## Data model

Contrato mínimo del formulario y de la respuesta de la Server Action. No hay persistencia.

```ts
// lib/contact.ts
export const CONTACT_LIMITS = {
  name: 80,
  email: 254,
  message: 2000,
} as const;

export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

export type ContactResult =
  | { ok: true; name: string }
  | { ok: false; error: string };

export function validateContact(input: ContactInput): string | null; // null = válido
```

```ts
// app/about/actions.ts  ("use server")
export async function sendContactMessage(
  prev: ContactResult | null,
  formData: FormData,
): Promise<ContactResult>;
```

Campos del `FormData`: `name`, `email`, `message` y el honeypot `website` (oculto, debe llegar vacío).

Variables de entorno (solo servidor, nunca `NEXT_PUBLIC_`):

```bash
RESEND_API_KEY=re_xxxxxxxxx
CONTACT_TO_EMAIL=hugomora34@hotmail.com
CONTACT_FROM_EMAIL=onboarding@resend.dev
```

Convenciones:

- Correo enviado con `resend.emails.send({ from, to, replyTo, subject, text })`: `replyTo` = correo del visitante; `subject` = `[Arcade Vault] Mensaje de {name}`; `text` con nombre, correo y mensaje. Se usa `text`, no `html`, para evitar inyección de HTML.
- `validateContact` recorta espacios (`trim`), exige los 3 campos no vacíos, formato de correo válido y longitudes ≤ `CONTACT_LIMITS`.
- Si el honeypot `website` trae contenido, la acción devuelve `{ ok: true, name }` sin enviar nada (no se avisa al bot).
- Los mensajes de error devueltos son texto genérico en español; nunca incluyen el error crudo de Resend ni la API key.

---

## Implementation plan

Antes del paso 1 se debe leer en `node_modules/next/dist/docs/` la guía de App Router sobre Server Actions / formularios y sobre variables de entorno (Next.js 16 con `cacheComponents`).

1. **Nav y ruta vacía.** Crear `app/about/page.tsx` con un `<h1>` provisional y metadata. En `components/nav.tsx` añadir «Acerca de» (`/about`) en la barra y en el panel móvil, y `sectionOf`: `/about` → `about` (ampliar el tipo `NavSection`). Verificación: el enlace navega a `/about` y se resalta.
2. **Estilos.** Portar a `app/globals.css` los bloques `ABOUT` y `CONTACT` de `references/templates/home-about/styles.css` (about, highlight, divider, contact-grid, form, tips, terminal-success, `.shake`, caret y sus `@media`). Comparar antes con las clases existentes (`.kicker`, `.field`, `.btn`, `.press`, `.fade-in`) para no duplicar. Verificación: `npm run dev` arranca sin errores de CSS y las demás rutas no cambian.
3. **Hero y divisor.** Crear `components/about/highlight-icon.tsx` (HEART, BROWSER, PLANT) y completar `app/about/page.tsx` con el hero y el divisor. Si `Reveal` no admite un `div`, ajustarlo de forma mínima y sin romper su uso en `/`. Verificación: hero, 3 highlights y divisor visibles y fieles al template.
4. **Dependencia y entorno.** Ejecutar `npm install resend`, crear `.env.example` con las 3 variables y confirmar que `.env.local` está ignorado por git. Verificación: `git status` no muestra secretos y `npx tsc --noEmit` sin errores.
5. **Validación compartida.** Crear `lib/contact.ts` con `CONTACT_LIMITS`, tipos y `validateContact`. Verificación: `npx tsc --noEmit` sin errores.
6. **Server Action.** Crear `app/about/actions.ts` con `sendContactMessage`: leer `FormData`, honeypot, `validateContact`, comprobar que existen las 3 variables de entorno, enviar con Resend y devolver `ContactResult`. Verificación manual con el formulario del paso 7 (o invocándola desde una página temporal que se elimina antes del commit).
7. **Formulario de contacto.** Crear `components/about/contact-section.tsx` (client, `useActionState` con `sendContactMessage`): intro, tips, campos controlados, honeypot oculto (`name="website"`, `tabIndex={-1}`, `autoComplete="off"`, fuera de pantalla y `aria-hidden`), `shake` en validación de cliente, botón «ENVIANDO…», mensaje de error en línea (con estilo `.contact-error` usando los tokens de color existentes) y terminal de éxito con «ENVIAR OTRO MENSAJE». Montarlo en `app/about/page.tsx` dentro de `Reveal`. Verificación: enviar un mensaje real y recibirlo en `CONTACT_TO_EMAIL`.
8. **Responsive y lint.** Revisar `/about` a 375 px (grid de contacto en 1 columna, sin scroll horizontal) y ejecutar `npm run lint` y `npm run build`.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores de TypeScript ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] `/about` muestra el título «ACERCA DE ARCADE VAULT», el texto de misión y 3 highlights (HEART, BROWSER, PLANT).
- [ ] `/about` muestra el divisor con 24 píxeles y la sección «CONTÁCTANOS» con 3 tips.
- [ ] El divisor y la sección de contacto empiezan ocultos y se muestran al entrar en el viewport.
- [ ] La nav muestra «Acerca de» en la barra y en el panel móvil, y lo resalta solo en `/about`.
- [ ] Enviar el formulario con algún campo vacío no llama a Resend y aplica el efecto `shake`.
- [ ] Enviar con datos válidos entrega un correo en `CONTACT_TO_EMAIL` con asunto `[Arcade Vault] Mensaje de <nombre>`, el nombre, el correo y el mensaje en el cuerpo, y `Reply-To` igual al correo del visitante.
- [ ] Tras un envío correcto se muestra la terminal «MENSAJE RECIBIDO… GRACIAS, <NOMBRE EN MAYÚSCULAS>.» y «ENVIAR OTRO MENSAJE» vuelve al formulario vacío.
- [ ] Durante el envío el botón está deshabilitado y muestra «ENVIANDO…».
- [ ] Con `RESEND_API_KEY` inválida o ausente se muestra un mensaje de error en el formulario, los campos conservan lo escrito y no aparece la terminal de éxito.
- [ ] Una petición con el honeypot `website` relleno no envía ningún correo.
- [ ] Un correo sin formato válido, un mensaje de más de 2000 caracteres o un nombre de más de 80 son rechazados por el servidor con mensaje de error.
- [ ] `RESEND_API_KEY` no aparece en el HTML, en el bundle del cliente ni en `git status`.
- [ ] A 375 px de ancho `/about` no tiene scroll horizontal y la grid de contacto se muestra en 1 columna.
- [ ] La consola del navegador no muestra errores de hidratación en `/about`, `/`, `/games` y `/salon`.

---

## Decisions

- **Sí:** Server Action para el envío. La API key queda en el servidor y no se crea un endpoint público adicional.
- **No:** Route Handler `POST /api/contact`. Más superficie pública y el SPEC 01 ya dejó los route handlers fuera de alcance.
- **Sí:** sandbox de Resend (`onboarding@resend.dev`) con destinatario en `CONTACT_TO_EMAIL`. Funciona sin dominio verificado; en sandbox Resend solo entrega al correo dueño de la cuenta.
- **No:** dominio propio verificado. No hay dominio definido; se hará al desplegar, cambiando solo `CONTACT_FROM_EMAIL`.
- **Sí:** revalidar en servidor y añadir honeypot. El cliente nunca es confiable y el honeypot frena bots básicos sin dependencias.
- **No:** rate limit por IP. Exige almacenamiento compartido (la memoria no sirve en serverless) y amplía el alcance.
- **Sí:** correo en texto plano (`text`) con `replyTo` del visitante. Evita inyección de HTML y permite responder directo desde el buzo.
- **No:** plantilla HTML / React Email ni confirmación al remitente. Innecesario para un MVP; va en otro spec si se necesita.
- **Sí:** la terminal de éxito aparece solo cuando Resend confirma. Mostrar «MENSAJE RECIBIDO» sin enviar sería engañoso.
- **Sí:** error en línea conservando los valores. El template no definía este estado; se añade el mínimo necesario.
- **Sí:** ruta `/about` y enlace «Acerca de» en la nav, tal como en `nav.jsx`. Revierte la exclusión temporal del SPEC 02.
- **Sí:** CSS portado del template, sin reescribir en Tailwind. Mismo criterio que los SPEC 01 y 02.
- **Sí:** los nombres de archivos del plan son propuesta de este spec; pueden ajustarse al implementar si Next.js lo requiere.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| En sandbox, Resend solo entrega al correo dueño de la cuenta; otro `CONTACT_TO_EMAIL` fallará. | Documentarlo en `.env.example` y usar como destinatario el correo de la cuenta de Resend. |
| La API key se filtra al cliente o al repositorio. | Variable sin prefijo `NEXT_PUBLIC_`, solo leída en `actions.ts`; `.env.local` ignorado y `.env.example` sin valores reales. |
| Spam o abuso del formulario. | Honeypot y límites de longitud; rate limit y captcha quedan para otro spec. |
| Fallo o caída de Resend. | La acción captura el error, devuelve mensaje genérico y el formulario conserva lo escrito. |
| `cacheComponents` en Next.js 16 cambia el comportamiento de páginas y Server Actions. | Leer la guía en `node_modules/next/dist/docs/` antes del paso 1; la página es estática y la acción solo se ejecuta bajo petición. |
| `Reveal` renderiza un `<section>` y el divisor del template es un `<div>`. | Ajuste mínimo en el paso 3 sin cambiar su uso en la landing. |
| Variables de entorno ausentes en despliegue. | La acción comprueba las 3 variables y devuelve el error genérico sin lanzar excepción. |

---

## What is **not** in this spec

- Rate limiting, captcha o cualquier protección anti-spam más allá del honeypot.
- Dominio propio verificado en Resend.
- Correo de confirmación al remitente ni plantillas HTML.
- Almacenar o listar mensajes recibidos.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
