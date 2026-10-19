# Interactive English Learning Web App

Persian-RTL interactive English-learning application for Iranian grades 7–12,
built on Next.js App Router with TypeScript (strict mode) and Tailwind CSS 4.

The authoritative plan lives in
[`roadmaps/interactive-english-learning-webapp.md`](roadmaps/interactive-english-learning-webapp.md);
the current state of the repository is the P2.1 application foundation
(no product features yet).

## Prerequisites

- Node.js >= 24 (verified on v24.21.0)
- npm >= 11 (verified on 11.19.0; the manifest pins `packageManager: npm@11.19.0`)

## Installation

```bash
npm ci   # clean install from package-lock.json (recommended)
```

Dependency versions are pinned exactly (roadmap task P1.3). Do not upgrade
dependencies or regenerate the lockfile as part of feature tasks.

## Available commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server (Turbopack) at `http://localhost:3000` |
| `npm run build` | Production build (also generates `next-env.d.ts` and route types) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint flat config (`eslint-config-next/core-web-vitals` + `/typescript`) |
| `npm run typecheck` | `tsc --noEmit` with strict mode enabled |
| `npm run test` | Vitest test runner (no test files exist yet — tests arrive with the first logic task) |
| `npm run e2e` | Playwright test runner (browser binaries are not downloaded yet — deferred per roadmap) |

## Project layout

- `src/app/layout.tsx` — root layout: Persian RTL shell (`lang="fa" dir="rtl"`) with skip link and page landmarks
- `src/app/page.tsx` — minimal home page (English content belongs in explicit `dir="ltr"` containers)
- `src/app/globals.css` — Tailwind CSS 4 entry (`@import "tailwindcss"`) with light/dark background tokens
- `next.config.ts` — wires `@tailwindcss/turbopack` via `turbopack.rules` (no PostCSS config on this path)
- `roadmaps/`, `docs/`, `worklog.md` — roadmap, architecture/rights documentation, append-only work log

## Repository hygiene

- `.env` is ignored (`.env.example` is the placeholder template) — never commit real values.
- `upload/` and `books/` are ignored — copyrighted source PDFs and generated book artifacts must never be committed.
- `node_modules/`, `.next/`, `next-env.d.ts`, `*.tsbuildinfo` are generated locally and ignored.
