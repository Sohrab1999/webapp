# Interactive English Learning Web App

Persian-RTL interactive English-learning application for Iranian grades 7–12,
built on Next.js App Router with TypeScript (strict mode) and Tailwind CSS 4.

The authoritative plan lives in
[`roadmaps/interactive-english-learning-webapp.md`](roadmaps/interactive-english-learning-webapp.md);
the current state of the repository is the P2.1 application foundation plus the
P2.2 design-token/typography layer (no product features yet).

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
| `npm run test` | Vitest test runner (unit tests for the P2.4 scanners live in `scripts/*.test.mjs`) |
| `npm run e2e` | Playwright browser tests (P4.1 shell routes; Chromium + Firefox projects; spec files `e2e/*.e2e.ts`; after a fresh clone run `npx playwright install chromium firefox` once — `test-results/`/`playwright-report/` are git-ignored output) |
| `npm run content:check` | Build-time content validator (P3.3): schema + rights-register cross-check of everything under `content/` |
| `npm run artifact:check` | Lesson artifact contract checker (P3.4): bundle layout + `lesson.json` sidecar + engine byte-identity under `public/lessons/` |
| `npm run verify` | Canonical verification workflow (`scripts/verify.mjs`): typecheck → lint → tests → content:check → artifact:check → build → secret scan → forbidden-file scan; nonzero exit if any required check fails |
| `scripts/sync-papermorph.sh` | Sync the vendored Papermorph engine to the pinned upstream commit (`--dry-run` / `--check` modes; see `docs/architecture/PAPERMORPH_VENDORING.md`) |

## Project layout

- `src/app/layout.tsx` — root layout: Persian RTL shell (`lang="fa" dir="rtl"`) with skip link, page landmarks, and a preload for the Persian font
- `src/app/page.tsx` — minimal home page (English content belongs in explicit `dir="ltr"` containers)
- `src/app/tokens.css` — design tokens: the single source of truth for color roles, typography, spacing, layout widths, radius, motion
- `src/app/fonts.css` — `@font-face` declarations for the two self-hosted variable fonts
- `src/app/globals.css` — Tailwind CSS 4 entry + base layer (lang-driven font selection, heading defaults, focus ring, reduced motion)
- `src/app/tokens/page.tsx` — storybook-style demo of the token system (development artifact, not a product page)
- `src/content/schema/` — Zod content schema v1 (roadmap P3.1): runtime validators + inferred types for `Grade`, `Course`, `Lesson`, `VocabItem`, `GrammarPoint`, `Dialogue`, `Reading`, `QuizItem`; every entity carries a mandatory `provenance` block (`source` / `status` / `reviewer` / `edition`); rights decisions are never stored in content — third-party material references the rights register by record id
- `src/content/validator/` — P3.3 build-time content validator (register parser, core logic, CLI) reused by the artifact checker
- `src/content/artifact/` — P3.4 lesson artifact contract: `lesson.json` sidecar schema, pure checker logic, CLI; see `docs/architecture/LESSON_ARTIFACT_CONTRACT.md`
- `content/` — schema-validated content sources (lessons/courses/grades), walked by `npm run content:check`
- `public/lessons/` — lesson artifact bundles (the authoring pipeline's output, one folder per lesson); validated by `npm run artifact:check`; the committed `vision-1-l01/` bundle is the P3.4 hand-made demo
- `public/fonts/` — self-hosted font files with their verbatim license texts
- `scripts/` — project-owned tooling: `verify.mjs` (the `npm run verify` orchestrator), `content-check.mjs` + `artifact-check.mjs` (validator runners), `scan-secrets.mjs` + `scan-forbidden-files.mjs` (repository safety scanners, unit-tested in `scripts/*.test.mjs`), `sync-papermorph.sh` (vendored-engine sync), `lib/verify-common.mjs` (shared scanner helpers)
- `vendor/` — vendored Papermorph engine (`vendor/engine/` + `vendor/engine.py`, byte-identical to the pinned upstream commit; do not hand-edit — sync via the script above)
- `THIRD_PARTY_NOTICES.md` — license/attribution record for vendored third-party software
- `next.config.ts` — wires `@tailwindcss/turbopack` via `turbopack.rules` (no PostCSS config on this path)
- `roadmaps/`, `docs/`, `worklog.md` — roadmap, architecture/rights documentation, append-only work log

## Typography and fonts

| Family | Role | File | Size | License |
| --- | --- | --- | --- | --- |
| Vazirmatn (variable, 100–900) | Persian/Arabic default | `public/fonts/vazirmatn/Vazirmatn-Variable.woff2` | 111 KB | SIL OFL 1.1 (`OFL.txt` alongside) |
| Inter (variable, 100–900) | English/Latin in `lang="en"` containers | `public/fonts/inter/InterVariable.woff2` | 344 KB | SIL OFL 1.1 (`LICENSE.txt` alongside) |

Both files are byte-identical copies of the official release artifacts
(Vazirmatn v33.003, `rastikerdar/vazirmatn`; Inter v4.1, `rsms/inter` — SHA-256
recorded in `src/app/fonts.css` and the roadmap). No CDN, no runtime
third-party requests; the Persian font is preloaded, Inter loads on demand.

## Design tokens and RTL/LTR conventions

- **Tokens** live in `src/app/tokens.css` as CSS custom properties integrated
  with Tailwind CSS 4 via `@theme` / `@theme inline` (CSS-first — there is no
  `tailwind.config.*`). Runtime scheme switching (light/dark via
  `prefers-color-scheme`) works through the raw-property + `@theme inline`
  pattern.
- **Font selection is language-driven**: the document root is `lang="fa"` and
  gets Vazirmatn; any subtree marked `lang="en"` gets Inter through the
  `:lang(en)` base rule. The stacks (`--font-fa`, `--font-en`) are independent.
- **English content convention**: wrap English blocks in
  `<div dir="ltr" lang="en">` (or set the attributes on any suitable
  container). Nothing else is required — direction and font follow the
  attributes.
- **Logical properties**: use Tailwind's logical utilities (`ms-*`/`me-*`,
  `ps-*`/`pe-*`, `start-*`/`end-*`, `text-start`/`text-end`, `border-s-*`)
  instead of physical left/right in layout code. Physical properties are
  reserved for genuinely direction-irrelevant cases.
- **Live demo**: run `npm run dev` (or `npm run build && npm run start`) and
  open `/tokens` to see the token inventory rendered with Persian RTL and
  English LTR side by side.

## Repository hygiene

- `npm run verify` enforces repository safety on every run: a secret scan and a
  forbidden-file/hygiene scan check the git index (tracked + staged files) and
  non-ignored untracked files; git-ignored paths and git history are not scanned.
- Findings are reported as path + rule id + remediation only — matched secret
  values are never printed.
- Prohibited: `*.pdf`, anything under `books/`, `.env`/`.env.*` (except the
  `*.example` template), generated/build directories, temp/backup files, and
  files over 5 MiB (largest legitimate file today: the ~2.3 MiB vendored
  MathJax bundle).
- `.env` is ignored (`.env.example` is the placeholder template) — never commit real values.
- `upload/` and `books/` are ignored — copyrighted source PDFs and generated book artifacts must never be committed.
- `node_modules/`, `.next/`, `next-env.d.ts`, `*.tsbuildinfo` are generated locally and ignored.
