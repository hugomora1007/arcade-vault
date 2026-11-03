# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: a platform to play games online and compete for the highest score. The repo is currently a fresh `create-next-app` scaffold (single `app/page.tsx`, default metadata). The README says the project follows Spec Driven Design (`/spec` and `/spec-impl`) using skills from `Klerith/fernando-skills` (`npx skills@latest add Klerith/fernando-skills`). No `spec/` directory exists yet.

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` / `npm run start` — production build / serve
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, `eslint-config-next`)

No test runner is configured.

## Next.js version warning

`AGENTS.md` states this is a Next.js (16.x) with breaking changes versus training data. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, ...) and heed deprecation notices. `next dev` rewrites the `nextjs-agent-rules` block in `AGENTS.md`; leave it intact.

## Architecture

- App Router only (`app/`), React 19, TypeScript strict, path alias `@/*` → repo root.
- `next.config.ts` enables `cacheComponents` and `partialPrefetching`, plus `experimental.agentFeedback`. `cacheComponents` changes caching/dynamic-rendering semantics, so consult the docs before writing data fetching or dynamic code.
- Tailwind CSS v4, wired through a Turbopack rule (`@tailwindcss/turbopack` loader for `*.css`) rather than PostCSS. Theme tokens (`--background`, `--foreground`, fonts) are defined in `app/globals.css` via `@theme inline`, with dark mode via `prefers-color-scheme`.
- `app/layout.tsx` uses the globally generated `LayoutProps<"/">` type (no import needed) and loads Geist / Geist Mono through `next/font/google`.
