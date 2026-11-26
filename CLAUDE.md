# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: a platform to play games online and compete for the highest score. UI text, code comments and specs are written in Spanish.

Current state: marketing home, about page with a real contact form, game library, game detail, player, hall of fame and a visual-only auth screen. Catalog and leaderboards live in Supabase. Some games have real canvas engines (e.g. Asteroides, Tetris, Arkanoid, Snake); the rest of the catalog still uses the simulated player. Full list of games (real and simulated): `references/implemented-games.md`.

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` / `npm run start` — production build / serve (the build fails if the Supabase catalog can't be read)
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, `eslint-config-next`; `references/**` is ignored)
- Prettier 3 with default config (`.prettierrc` is `{}`).

No test runner is configured. Verify changes in the running app (Playwright MCP screenshots/logs land in `.playwright-mcp/`).

## Next.js version warning

`AGENTS.md` states this is a Next.js (16.x) with breaking changes versus training data. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, ...) and heed deprecation notices. `next dev` rewrites the `nextjs-agent-rules` and `nextjs-agent-feedback` blocks in `AGENTS.md`; leave them intact.

## Workflow: Spec Driven Design

Every feature starts as a spec in `specs/NN-slug.md` (Spanish; header with `Status`, `Depends on`, `Date`, `Objective`). Specs 01–09 are all `Implementado`.

- `/spec <feature>` — designs a spec section by section (asks questions first). Writes only the `.md`.
- `/game-spec <folder in references/started-games | game idea>` — project skill (`.claude/skills/game-spec/`) that writes the spec to bring a game into the platform (canvas engine, `games` row via migration, real leaderboard), following specs 05–09.
- `/spec-impl <NN-spec-name>` — implements an approved spec: creates and switches to branch `spec-NN-slug` (`specs/.spec-config.yml` → `AutoCreateBranch: true`), works step by step, then the spec status is set to `Implementado`. Each spec is merged via PR.

`spec` and `spec-impl` come from `Klerith/fernando-skills` (`npx skills@latest add Klerith/fernando-skills`, pinned in `skills-lock.json`; copies in `.claude/skills/` and `.agents/skills/`).

## Skills

Usa siempre /frontend-design para diseñar las interfaces de usuario.

## Hooks

`.claude/settings.json` registers a `PostToolUse` hook on `Write|Edit` (`.claude/hooks/format-and-lint.mjs`) that, for every edited file outside `node_modules`, `.next`, `references`, etc.:

1. Removes blank lines in `.ts/.tsx/.js/.jsx/.mjs/.cjs/.css/.json` (kept inside template literals and in Markdown/HTML/YAML). Don't fight this: code in this repo has no blank lines by design.
2. Runs Prettier `--write`, then `eslint --fix` on JS/TS. A failure exits with code 2 and reports the problems back — fix them before moving on.

## Architecture

- App Router only (`app/`), React 19, TypeScript strict, path alias `@/*` → repo root.
- `next.config.ts` enables `cacheComponents` and `partialPrefetching`, plus `experimental.agentFeedback`. `cacheComponents` changes caching/dynamic-rendering semantics, so consult the docs before writing data fetching or dynamic code.
- Tailwind CSS v4, wired through a Turbopack rule (`@tailwindcss/turbopack` loader for `*.css`) rather than PostCSS. Theme tokens and the arcade/neon styles (cover classes like `cover-snake`) live in `app/globals.css`.
- `app/layout.tsx` uses the globally generated `LayoutProps<"/">` type (no import needed).
- UI prototype to port from: `references/templates/` (React via CDN). Original games/assets to port: `references/started-games/`, `references/source-assets/`. Reference code only — never imported.

### Routes

| Route                | Purpose                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `/`                  | Landing (`components/home/*`, mock data in `lib/home.ts`)                                                   |
| `/about`             | About + contact form → Server Action `app/about/actions.ts` (Resend, honeypot, `lib/contact.ts` validation) |
| `/games`             | Library with category filter (`components/library.tsx`, `game-card.tsx`)                                    |
| `/juegos/[id]`       | Game detail + top scores                                                                                    |
| `/juegos/[id]/jugar` | Player (`components/game-player.tsx`); score saving via `app/juegos/[id]/jugar/actions.ts`                  |
| `/salon`             | Hall of fame (`components/hall-of-fame.tsx`, `ranking-state.tsx`)                                           |
| `/auth`              | Visual only (`components/auth-form.tsx`); real auth is a future spec                                        |
| `/api/health`        | Checks the Supabase connection                                                                              |

`proxy.ts` (Next 16 replacement for middleware) matches `/juegos/:id` and `/juegos/:id/jugar` and rewrites unknown game ids to a real 404, because with `cacheComponents` `notFound()` would otherwise answer 200.

### Supabase

- Clients in `lib/supabase/`: `server.ts` (cookies), `client.ts` (browser), `public.ts` (no cookies — use it inside `"use cache"` and `generateStaticParams`), `env.ts` (validates `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; static `process.env.X` access only). Types in `database.types.ts` (regenerate after schema changes).
- Schema (`supabase/migrations/`): `games` (slug `id` `^[a-z0-9-]+$`, `cat`, `cover`, `color`, unique `sort_order`), `scores` (`player_name` = 3 chars `^[A-Z0-9]{3}$`, `score` 1..9 999 999), view `game_stats` (`best`, `plays`). RLS: public select on both, public insert on `scores`, no update/delete.
- The DB is the single source for catalog and rankings. `lib/games.ts` only keeps types (`Game`, `Category`, `CATS`); `lib/scores.ts` keeps `ScoreRow`.
- Reads: `lib/db/games.ts` (`getGames`, `getGame`, `getTopScores`, `getStaticGameParams`) use `"use cache"` + `cacheLife("hours")` + `cacheTag(SCORES_CACHE_TAG)`. `saveScore` validates at runtime, inserts and calls `updateTag(SCORES_CACHE_TAG)`.
- New catalog rows go in as a migration (`supabase/migrations/<timestamp>_add_game_<slug>.sql`). The Supabase MCP server is configured in `.mcp.json`.
- Env vars: see `specs/.env.template` (copy to `.env.local`). Resend vars (`RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`) are server-only — never prefix them with `NEXT_PUBLIC_`.

### Real games

- `lib/games/registry.ts` defines the shared contract (`GameEngine`: `start/pause/resume/restart/end/destroy`; `GameSnapshot`: `score/lives/level/phase`; `GameCanvasProps`: `onReady/onChange/onGameOver`) and `REAL_GAMES`, keyed by `game.id`. `game-player.tsx` uses the engine when the id is in `REAL_GAMES`, otherwise the simulation.
- Each game lives in `lib/games/<slug>/` (`constants.ts`, `types.ts`, `entities.ts` for pure logic/drawing, `engine.ts` for loop/input/lifecycle) plus `components/games/<slug>-canvas.tsx`. Sprites go in `public/games/<slug>/` and are loaded on the client only (no `Image` during SSR).
- Registered (examples): `asteroides`, `tetris`, `arkanoid` (spritesheet, 5 levels, win condition), `snake` (fruit atlas, built from scratch). For the complete list see `references/implemented-games.md`.
- Adding a game: `/game-spec` → approve → `/spec-impl` (engine + canvas + registry entry + migration + spec status).
