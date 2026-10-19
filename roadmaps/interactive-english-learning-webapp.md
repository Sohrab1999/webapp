# Roadmap — Interactive English Learning Web App (Papermorph + GLM)

| | |
|---|---|
| **Project** | Interactive English learning platform for Iranian grades 7–12 and general learners |
| **Status legend** | `[ ]` planned · `[~]` in progress · `[!]` blocked · `[x]` completed |
| **Companion report** | [`docs/architecture/PAPERMORPH_ASSESSMENT.md`](../docs/architecture/PAPERMORPH_ASSESSMENT.md) — verified facts (V1–V30), risks (R1–R8), integration decision |
| **Workflow** | Per the project mandate: tasks are implemented **one at a time**, only after explicit approval; the roadmap and change log are updated **only after verification** |
| **Last updated** | 2026-10-19 (P1.3 dependency baseline pinned and verified) |

---

## 1. Product scope

### 1.1 In scope (MVP)

- Persian-RTL shell with correctly rendered English-LTR teaching content (`dir` switching, logical CSS properties).
- Home page → grade selection (7–9 Prospect, 10–12 Vision) → lesson list → lesson experience.
- **One complete demonstration lesson** (from Grade 10 / Vision One, Lesson 1 candidate) combining: animated explanation (Papermorph chapter), interactive vocabulary and grammar activities, one dialogue or reading activity, and a short assessment with feedback.
- Local progress persistence (engine key + app-namespaced store), responsive layouts, and zero dependence on a live GLM request during playback.
- Teacher-visible provenance labels on every content item (official-textbook / supplementary / AI-draft / human-reviewed).

### 1.2 Explicit MVP exclusions

- Payments, leaderboards, social features, AI chatbot (mandate §12).
- Accounts, authentication, remote database, server-side progress sync (P11 designs, does not build).
- Bulk conversion of every textbook/grade (gated behind demonstration-lesson review — assessment condition C5).
- Native mobile apps; image-generated artwork (no image models upstream — assessment V24); background music.
- Live AI features of any kind in the learner path.
- Committing source PDFs or copyrighted assets to the repository (assessment §7).

---

## 2. Architecture and technology choices (with reasons)

> **Ratified (P1.1, 2026-10-19):** Option C is the adopted architecture, **subject to gates C1–C5** (criteria + status in §5.1). No gate has been tested yet; if a gate fails, the documented fallback in §6 applies by default — architecture redesign is not triggered by a gate failure.

| Choice | Reason |
|---|---|
| **Next.js (App Router) + TypeScript strict** | Candidate stack from the mandate; static lesson artifacts served from `public/`, app routes for shell/activities; strict mode enforces the typed-component mandate (#10). |
| **React + Tailwind CSS** | Small reusable components; RTL support via logical properties (`ps-`, `pe-`, `ms-`, `me-`) and explicit `dir` attributes — required for Persian/English mixing. |
| **Zod** | Runtime validation of the lesson content schema at build time and import time; provenance fields become enforced, not optional (assessment §4.3). |
| **Papermorph engine, vendored + synced (unmodified)** | Highest-value MIT asset: deterministic playback with pre-rendered MP3 + `timings.js` (no live model, V9), quiz primitives (`choice/blanks/grid/tap/sorter` + `build()`), captions, `?beat=N&t=S` deep links, `?review` mode, localStorage progress contract (V10–V13). Synced by `engine.py` tags; never hand-edited (C3). |
| **Papermorph authoring toolchain (Python scripts) driven by GLM** | Verified runnable in this environment (V20): `uv`, `ffmpeg`, Playwright all present. The skill is a Markdown playbook + model-agnostic scripts (V27); we port it into a GLM-executable internal playbook with lint/review gates. |
| **Vitest + Playwright** | Unit tests for schema/scoring logic; browser tests for critical learning flows (mandate §Technical decisions); Playwright doubles as the upstream perf-check harness (V19). |
| **localStorage only (MVP)** | Engine contract is already localStorage (V13) and defensive (V13 robustness note); no documented requirement justifies a remote DB (mandate). |
| **iframe embedding + postMessage bridge** | Keeps engine copies pristine and syncable; app reacts to `next-beat`/`finish` events for progress and navigation (assessment Option C). |

**Rejected:** rebuilding the engine in React (Option B — disproportionate risk, loses upstream sync); Papermorph-only product (no app-level activities → cannot meet MVP scope).

---

## 3. Repository assessment findings (summary)

- **GO — conditional** (C1–C5 in assessment §9). Verified: MIT license; vanilla-JS engine separate from the skill; playback model is offline-safe; i18n matrix covers `en,ru,zh,ja,de` only — **no RTL/Persian** (V22–V24); TTS is English-first (V25); **GLM is untested upstream** (V26); environment prerequisites present (V20).
- Full evidence trail: assessment §1 (V1–V30), §2 (limitations), §7 (content rights for the uploaded جزوه and Oxford PDFs).

---

## 4. Phase plan

Dependency order follows the mandated P0→P11 sequence. Tasks are small and checkboxed; each has acceptance criteria (AC). Every task must also satisfy the **global verification checklist** in §5 before being marked complete.

### P0 — Inspect Papermorph and the development environment

- [x] **P0.1 Inspect workspace & git state.** Branch `main`, 1 commit, no remote; `.gitignore` covers `skills/`, `node_modules/`; `upload/` untracked (copyrighted — keep untracked); `.env` present (never commit).
  - *AC:* findings recorded in assessment §1.6 (V29–V30). ✔ verified 2026-10-19.
- [x] **P0.2 Inspect the actual Papermorph repository** (README, LICENSE, SKILL.md, 9 references, 15 scripts, engine/ tree, i18n checker, tts.py, GitHub metadata).
  - *AC:* every claim sourced (V1–V28). ✔ verified 2026-10-19.
- [x] **P0.3 Verify local toolchain** (`uv 0.13.0`, `ffmpeg 7.1.5`, Python 3.12.15, Node 24.21, Playwright) and uploaded-content rights review (OUP all-rights-reserved; جزوه = author-copyrighted free distributions; textbook content = Ministry of Education).
  - *AC:* assessment §1 (V20), §7. ✔ verified 2026-10-19.
- [x] **P0.4 Write assessment report** at `docs/architecture/PAPERMORPH_ASSESSMENT.md` with go/no-go.
  - *AC:* contains verified facts w/ paths, limitations, reusable components, adaptations, risks, options w/ trade-offs, recommended architecture, explicit go/no-go. ✔ this document set.

### P1 — Decide the integration architecture

- [x] **P1.1 Ratify Option C (hybrid)** and the five gating conditions C1–C5 with the approver.
  - *AC:* approver confirms decision in chat; decision logged in §7 change log. ✔ **Ratified 2026-10-19** — owner approved "P1.1 as stated" and additionally directed that every gate be converted into explicit, testable acceptance criteria with honest pass/fail status → operationalized in **§5.1** (no gate is PASSED; statuses reflect only executed evidence).
- [x] **P1.2 Draft permission requests** for the two جزوه author groups (contacts `@JamalAhmadi1984`, Dr. Hassan Lotfi) stating intended interactive reuse; record status per source in `docs/content/RIGHTS_REGISTER.md`.
  - *AC:* register lists every uploaded source → decision (reference-only / pending-permission / permitted); zero copyrighted files tracked by git. *(Tip-level untracking already achieved early on 2026-10-19 via commit b9a1fe3 — historical blobs remain in local/auto-checkpoint history 252fe4d; history cleanup would be a separate owner-approved task.)*
  - ✔ **Completed 2026-10-19.** Register `docs/content/RIGHTS_REGISTER.md` created — all 9 uploaded sources recorded individually (R-01…R-09) with evidence-checked fields, decisions (6× permission required, 3× restricted design-reference-only), verified facts/assumptions/unresolved questions separated (UQ-1…UQ-5). Permission drafts (reviewable, **NOT sent**) at `docs/content/permissions/PERMISSION_REQUEST_jamal-ahmadi.md` (Draft A → `@JamalAhmadi1984`, materials R-01–R-03) and `docs/content/permissions/PERMISSION_REQUEST_hassan-lotfi.md` (Draft B → phone/Telegram/Instagram 09141842803 as published on the covers, materials R-04–R-06); draft paths added here per task instruction. No permission granted by anyone; OUP items hard-marked design-reference-only; zero copyrighted files tracked (re-verified via `git ls-files` pre-commit). Gate C2 advanced to PARTIAL 4/5 (§5.1).
- [x] **P1.3 Choose exact dependency versions** (Next.js, React, Tailwind, Zod, Vitest, Playwright) against this environment's Node 24/npm 11; pin in `package.json`.
  - *AC:* versions documented with install evidence; no undocumented constraint violated.
  - ✔ **Completed 2026-10-19.** Minimal `package.json` created (manifest only — no app code, no config files; those belong to P2.1) + `package-lock.json` (lockfileVersion 3). Exact pins, evidence = npm registry survey (dist-tags/engines/peerDeps, 2026-10-19) + inspection of the published `create-next-app@16.4.2` tarball (Next's own generated dependency spec): **deps** next 16.4.2 · react 19.3.1 · react-dom 19.3.1 · zod 4.6.7; **devDeps** typescript 5.9.3 · tailwindcss 4.3.3 + @tailwindcss/turbopack 4.3.3 · eslint 10.13.0 · eslint-config-next 16.4.2 · vitest 5.0.5 + vite 8.3.4 (required non-optional peer) · @playwright/test 1.64.1 · @types/node 24.19.2 · @types/react 19.3.0 · @types/react-dom 19.3.0. Documented deviations from create-next-app defaults (each evidence-backed): TS 5.x line (CNA installs `^5`; registry `latest` is TS 7.0.2 but zero Next-side validation evidence → excluded), eslint 10 (CNA still pins `^9` but registry marks eslint@9.39.5 EOL/deprecated; eslint-config-next peer `>=9.0.0` permits; integration empirically verified), @types/node 24.x (runtime is Node 24.21; vitest optional peer `^22||>=24`), react 19.3.1 (react-dom@19.3.1 peer `^19.3.1`; CNA freezes 19.3.0). Verification via `scripts/p13_verify.sh`: npm install clean (zero peer warnings) · `npm ci` exit 0 (clean lockfile reproducibility) · `npm ls --all` exit 1 caused solely by cross-platform `UNMET OPTIONAL` entries (zero non-optional/invalid/extraneous) · all 15 pins resolve exactly (`npm ls --depth=0`) · binaries run: Next.js v16.4.2, tsc 5.9.3, eslint v10.13.0, vitest 5.0.5, playwright 1.64.1 · ESLint 10 flat-engine smoke with eslint-config-next `core-web-vitals`+`typescript` configs fires expected rules (incl. `@typescript-eslint/no-unused-vars`) · zod parse smoke passes · declared `engines.node` of all 15 packages satisfied by Node 24.21.0. Known constraints + unresolved items recorded in §7. Still zero product code; P2.1 untouched.

### P2 — Scaffold the new application

- [ ] **P2.1 Create Next.js App Router app** (TS strict, Tailwind, ESLint), `src/` layout, base `README.md`, git commit hygiene (no secrets; `upload/`, `books/src/` ignored).
  - *Note (added at P1.3):* `package.json` + `package-lock.json` already exist (pinned baseline) — extend them in place; do not regenerate or replace. Config files to create at P2.1: `tsconfig.json` (strict), `eslint.config.mjs` (flat, `eslint-config-next/core-web-vitals` + `/typescript` per create-next-app@16.4.2 template), `next.config.ts` (with `turbopack.rules["*.css"]` → `@tailwindcss/turbopack`), `postcss.config.mjs` not needed on the default Turbopack path.
  - *AC:* `npm run build` passes; `git status` shows no copyrighted/untracked leakage; strict mode on.
- [ ] **P2.2 Implement RTL/LTR design tokens & fonts** (Vazirmatn or approved Persian font; English display font; logical-property utility classes).
  - *AC:* token file + storybook-style demo page renders Persian RTL and English LTR blocks side-by-side without overflow.
- [ ] **P2.3 Vendor the Papermorph engine** into `vendor/engine/` (or document fork + `engine.py --from`), with `THIRD_PARTY_NOTICES.md` (MIT attribution) and a sync script + upstream tag pin.
  - *AC:* `engine.py --check` reports clean copies; notice file committed; sync command documented.
- [ ] **P2.4 CI-lite verification script** (`npm run verify`): typecheck, lint, unit tests, build, secret scan (`*.env`, key patterns), forbidden-file scan (`*.pdf`, `books/*/pages/`).
  - *AC:* script runs green on scaffold; red when a fixture violation is injected.

### P3 — Define and validate the educational content schema

- [ ] **P3.1 Define Zod schema v1** for: `Grade`, `Course`, `Lesson`, `VocabItem`, `GrammarPoint`, `Dialogue`, `Reading`, `QuizItem` (types mapping to engine `choice/blanks/grid/tap/sorter` + app-native types), each with `provenance: {source, status: ai-draft|human-reviewed, reviewer?, edition?}`.
  - *AC:* schema compiles; invalid fixtures rejected with actionable errors; provenance field is mandatory.
- [ ] **P3.2 Create fixture content** for the demo lesson (Vision One L1 subset: ~10 vocab, 2 grammar points, 1 dialogue, 1 reading, 8 assessment items) marked `ai-draft`.
  - *AC:* fixtures validate; all English text LTR-safe; Persian glosses render RTL in a test harness.
- [ ] **P3.3 Build-time validator CLI** (`npm run content:check`) that walks `content/` and fails on schema/provenance violations; wire into `verify`.
  - *AC:* deliberately corrupted fixture fails CI with a human-readable message.
- [ ] **P3.4 Lesson artifact contract** — define the output bundle of the authoring pipeline (`index.html` + engine + audio + timings.js + `lesson.json` sidecar with schema ids, provenance, and engine progress key).
  - *AC:* contract documented; a hand-made minimal bundle satisfies a contract checker.

### P4 — Build the responsive RTL/LTR application shell

- [ ] **P4.1 Shell + routing** (`/`, `/grades/[grade]`, `/grades/[grade]/lessons/[lesson]`) with Persian default RTL, language toggle placeholder.
  - *AC:* routes render; `dir` switches correctly; keyboard focus order sane in RTL.
- [ ] **P4.2 Home + grade selection pages** (6 grades; Prospect 1–3 / Vision 1–3 mapping; disabled states for unpublished courses).
  - *AC:* responsive at 360/768/1280 px; no horizontal scroll; images/icons have alt text.
- [ ] **P4.3 Lesson list page** reading the content registry (schema-validated), showing lesson status + provenance badge.
  - *AC:* unreviewed (`ai-draft`) lessons display a visible "پیش‌نویس / draft — not verified textbook content" badge (mandate #6).
- [ ] **P4.4 A11y baseline pass** — landmarks, skip link, contrast ≥ 4.5:1, focus rings, `prefers-reduced-motion` respected in shell (engine has its own motion).
  - *AC:* axe scan on the three shell pages shows zero critical violations.

### P5 — Implement the lesson player and its interaction model

- [ ] **P5.1 Chapter iframe embed + postMessage bridge** (`ready`, `beat`, `finish` events; `?beat=N&t=S` deep links).
  - *AC:* shell receives finish event; deep-link reopens at the same beat.
- [ ] **P5.2 Progress bridge** — read engine's `animebook:progress:*` contract (V13) + app store `<app>:progress:v1` (activities); merge in dashboard; write only via documented APIs.
  - *AC:* completing a chapter + an activity reflects in the dashboard after reload; corrupted-storage fixture degrades gracefully (mirrors V13).
- [ ] **P5.3 App-native activity components** — vocabulary flashcard/drill, grammar item set, dialogue player (turn-by-turn audio + Persian translation toggle), reading pane with question set; all typed, RTL-aware, scoring via schema-defined keys.
  - *AC:* each component has unit tests (scoring, RTL rendering, keyboard operation); Playwright smoke for one flow each.
- [ ] **P5.4 Assessment runner with feedback** — item types from schema, first-attempt scoring parity with engine `SCORE[id]` semantics, end-of-assessment feedback summary.
  - *AC:* score math unit-tested incl. retry-does-not-improve-first-attempt rule; feedback renders bilingually.
- [ ] **P5.5 Mobile spike on engine stage** (assessment C4) — measure rAF frame times at beat transitions on mobile viewport (Playwright Firefox + Chromium, per engine.md §Performance); decide letterbox vs tap-through fallback.
  - *AC:* measurements recorded in `docs/testing/MOBILE_SPIKE.md`; decision documented; fallback chosen if thresholds missed.
- [ ] **P5.6 Persian UI strings for engine chrome** (`fa` added following `check_i18n.py` matrix) as a fork patch + RTL `book.css` overrides for embedded books.
  - *AC:* `check_i18n.py` extended matrix passes with `fa`; captions/cover/help/quiz labels render Persian; English content blocks stay LTR.

### P6 — Deliver one complete demonstration lesson

- [ ] **P6.1 Author the demo chapter via the GLM playbook** (adapted SKILL.md loop: intake → style.json → storyboard → narration → motion → lint/review gates) for Vision One L1 explanation segment.
  - *AC:* `lint.py` clean; storyboard sheet + review notes archived; narration built per C1 outcome (fa-IR TTS or English+Persian text fallback).
- [ ] **P6.2 fa-IR narration spike (C1 gate)** — Edge TTS `fa-IR` voices through `tts.py`; ASCII-mark convention for Persian text; timing quality report.
  - *AC:* spike report in `docs/testing/TTS_SPIKE.md`; go/fallback decision recorded; **blocked → demo uses English narration + Persian captions**.
- [ ] **P6.3 Assemble the full lesson route** — chapter embed + vocab + grammar + dialogue + reading + assessment wired in sequence, progress end-to-end.
  - *AC:* full flow completable on desktop Chrome/Firefox; reload restores progress; zero runtime calls to any model API (verify via network log).
- [ ] **P6.4 Teacher review package** — exported review notes (`?review` mode), storyboard, provenance sheet; run through `serve.py` preview.
  - *AC:* a human reviewer can complete the review checklist; lesson flagged `human-reviewed` only after sign-off.
- [ ] **P6.5 Demo review gate** — approver/user reviews the demonstration lesson.
  - *AC:* explicit approval recorded; only then do P7+ bulk-content tasks unlock (C5).

### P7 — Vocabulary, grammar, dialogue, reading, practice, assessment experiences

*(unlocked by P6.5)*

- [ ] **P7.1** Author Grade 10 Vision One L1 full activity set from fixtures → schema-validated JSON (`ai-draft`).
  - *AC:* `content:check` green; provenance complete.
- [ ] **P7.2** Extend activity components for full item variety (matching, cloze via `blanks`-style, reorder, true/false, listening items).
  - *AC:* each type unit-tested; keyboard-only operable.
- [ ] **P7.3** Lesson templates per grade (Prospect/Vision structure: Warm-up → Conversation → Reading → Practice) as content templates, not code forks.
  - *AC:* adding a lesson requires only content files + registry entry (no component changes).
- [ ] **P7.4** Second lesson (different grade, e.g. Grade 8 Prospect L1) to validate template generality.
  - *AC:* built purely from templates; review pass completed.

### P8 — Local progress tracking and content management foundations

- [ ] **P8.1 Progress dashboard** (per-lesson completion, activity scores, streak-free design — no leaderboards).
  - *AC:* data survives reload; export/import of progress JSON (user-owned data).
- [ ] **P8.2 Content registry & versioning** — `content/registry.json` with lesson versions, content schema version, provenance rollups; stale-artifact detection vs published bundles.
  - *AC:* bumping schema version flags stale lessons in build output.
- [ ] **P8.3 Teacher content-management view** (read-only in MVP): list lessons by provenance status, open review artifacts, filter drafts.
  - *AC:* no `ai-draft` lesson is reachable without the draft badge; reviewer recorded on `human-reviewed`.

### P9 — GLM-assisted authoring and validation workflow

- [ ] **P9.1 Port SKILL.md + references into internal playbook** (`/authoring/PLAYBOOK.md`) for GLM: chapter loop, storyboard-first, gates, provenance rules (mandate workflow #9; assessment §4.6).
  - *AC:* playbook reviewed; includes "stop and wait for approval" gates mirroring this roadmap.
- [ ] **P9.2 Authoring runner scripts** — one-command scaffold per lesson (folders, style.json inheritance, narration stubs), reusing upstream scripts (`outline.py`, `split_pages.py`, `tts.py`, `lint.py`).
  - *AC:* scaffolding a lesson requires only lesson id + source section; no manual path editing.
- [ ] **P9.3 Validation pipeline integration** — `verify` runs content schema check + engine lint + perf smoke on changed lessons; provenance gate: build fails if any shipped item lacks `human-reviewed` (or explicit draft-only flag for previews).
  - *AC:* pipeline red on fixture with missing reviewer; green on reviewed lesson.
- [ ] **P9.4 Quality experiment** — produce one lesson segment with GLM following the playbook; compare against upstream Opus-produced chapters for structural quality (lint/overlap/perf, storyboard adherence).
  - *AC:* findings recorded (closes assessment UNVERIFIED item V27); decision on scaling authoring.

### P10 — Accessibility, security, performance, browser testing

- [ ] **P10.1 Accessibility audit** — keyboard-only run-through of the demo lesson, screen-reader smoke (NVDA/VoiceOver as available), captions on by default for narration, contrast, reduced-motion.
  - *AC:* documented audit report; all critical/major issues fixed or ticketed with approver sign-off.
- [ ] **P10.2 Security review** — no secrets in client bundles (`npm run verify` scan), no `dangerouslySetInnerHTML` with unreviewed content, postMessage origin allow-list, storage keys namespaced, dependency audit (`npm audit`).
  - *AC:* report in `docs/testing/SECURITY.md`; zero high findings open.
- [ ] **P10.3 Performance budget** — Lighthouse (perf ≥ 85 shell; a11y ≥ 95), audio lazy-load per beat (upstream preloads next beat — V12), bundle budget for shell.
  - *AC:* budgets encoded in CI; report archived.
- [ ] **P10.4 Browser matrix** — Chrome, Firefox (upstream's slowest-common case, engine.md §Performance), Safari, Edge; desktop + mobile viewports 360/768/1280.
  - *AC:* demo lesson completes on all; issues logged with severity.

### P11 — Deployment and later commercial features

- [ ] **P11.1 Deployment pipeline** — static-first hosting for `public/books/` (audio-heavy), shell deploy, env hygiene (no secrets), preview deployments.
  - *AC:* deployed preview URL passes P10.4 matrix smoke.
- [ ] **P11.2 SCORM/MP4 export enablement** (upstream `scorm.py`, `export.py`) for school/LMS distribution — evaluated and documented.
  - *AC:* sample SCORM package builds from the demo lesson and opens in a test LMS OR documented blocker.
- [ ] **P11.3 Design note (not build):** accounts/progress-sync, teacher dashboards, payments — architecture sketch + cost/licensing implications only (mandate §12 keeps these out of MVP).
  - *AC:* note committed under `docs/architecture/FUTURE.md`; no MVP code changes.

---

## 5. Testing and verification requirements (global)

Every task, before being marked `[x]`, must satisfy:

1. **Run the relevant checks** and paste real command output into the task report (mandate workflow #7 — no claimed-but-unrun verification).
2. **Unit tests** for any new logic (schema, scoring, bridges) — Vitest.
3. **Browser check** for any UI change — Playwright minimum Chromium + Firefox.
4. **`npm run verify` green** — typecheck, lint, tests, build, secret scan, forbidden-file scan (P2.4).
5. **Roadmap + change log updated only after verification** (mandate #8), including files changed, commands executed, actual results, limitations, next proposed task (mandate #9).
6. **Git**: meaningful commit per approved task; verify hash + branch. **Mandatory commit-and-push policy (set 2026-10-19):** inspect working tree → implement only the approved task → run checks → review full diff (secrets/unintended changes) → update roadmap/log with verified results only → commit → push to `origin` (`https://github.com/Sohrab1999/webapp.git`, private) → **independently verify via `git ls-remote origin` that the remote ref equals the local HEAD** → report files, real check results, commit hash, push status → STOP for approval. Never force-push, reset, rebase, or amend published commits; never commit secrets or copyrighted assets; never accumulate uncommitted task batches; never claim a push without hash verification.

### 5.1 Architecture gates C1–C5 — testable acceptance criteria and status (added at P1.1 ratification, 2026-10-19)

Per the owner's P1.1 ratification, Option C is adopted **subject to** the gates below. **Rule:** a criterion may be marked PASS only with recorded command output or an archived report artifact; a criterion not yet executed is PENDING; a gate with any PENDING criterion cannot pass. Criterion status: **PASS** (executed and met) · **FAIL** (executed, not met) · **PENDING** (not executed). Gate status: **UNTESTED / PARTIAL / NOT REACHED / PASSED**.

**Summary (2026-10-19, after P1.2):** C1 **UNTESTED** (0/6) · C2 **PARTIAL** (4/5) · C3 **UNTESTED** (0/5) · C4 **UNTESTED** (0/3) · C5 **NOT REACHED** (0/3). **No gate is PASSED.**

**C1 — fa-IR narration viability** *(assessment §9.1; spike owned by P6.2, applies to P6.1)*
- Criteria (all must PASS):
  1. PENDING — Edge TTS endpoint reachable from this sandbox (probe of `speech.platform.bing.com` documented, no DNS/proxy failure).
  2. PENDING — at least one `fa-IR` voice synthesizes a Persian sample through the upstream `tts.py` unmodified; if Edge TTS is unreachable, the z-ai TTS alternative is evaluated in the same spike and the decision recorded.
  3. PENDING — output MP3 validated with `ffprobe` (duration > 0, sane vs. text length).
  4. PENDING — word-level timing data present and spot-checked usable for engine timed actions, **or** its absence is documented and a caption-driven fallback timing design recorded.
  5. PENDING — ASCII-mark convention for Persian text demonstrated with a round-trip test case (V25: mark names/beat IDs must be ASCII).
  6. PENDING — quality report archived at `docs/testing/TTS_SPIKE.md` with an explicit go/fallback decision.
- Verified-fact evidence: V25 (`tts.py` has no per-entry locale; Kokoro timings English-only; ASCII marks mandatory), V24 (upstream README: "No image models, multilingual support, or BGM yet"), V20 (toolchain prerequisites present).
- Assumptions (unverified): sandbox outbound HTTPS to the Edge TTS host; `fa-IR` voices exist upstream of the service; timing quality adequate for animation sync.
- Unresolved (assessment §10.1–10.2): Edge TTS reachability; reliability of `fa-IR` word-boundary events in `tts.py` streaming mode.
- On FAIL → fallback R2 (§6): English narration + Persian captions/text; decision recorded at P6.2.

**C2 — Content rights register & licensing hygiene** *(assessment §9.2, §7; owned by P1.2, enforced later by P2.4/P9.3)*
- Criteria:
  1. **PASS** (verified 2026-10-19, commits 91c9e9f + b9a1fe3) — zero copyrighted files tracked at the git tip: pre-push `git ls-files` showed only `.env.example`, `.gitignore`, docs/, roadmaps/, worklog.md, download/README.md; `upload/` untracked and ignored.
  2. **PASS** (verified 2026-10-19, P1.2) — `docs/content/RIGHTS_REGISTER.md` exists listing every uploaded source (9 PDFs, records R-01…R-09) with author/publisher where evidenced, rights finding + evidence, intended use (all 9 currently: local reference/curriculum-map only), permission status + date checked, local-only path (`upload/`, git-ignored).
  3. **PASS** (verified 2026-10-19, P1.2) — draft permission requests for both جزوه author groups written and reviewable by the owner: `docs/content/permissions/PERMISSION_REQUEST_jamal-ahmadi.md` (verified contact `@JamalAhmadi1984` from the booklet front matter) and `docs/content/permissions/PERMISSION_REQUEST_hassan-lotfi.md` (verified contact 09141842803, printed on the covers). Both labelled DRAFT — NOT SENT; both ask digitization/adaptation/hosting/distribution/commercial use + attribution/territory/duration/restrictions; both use verified contacts only, no invented emails. **Note:** drafting satisfies this criterion only — it is NOT a grant; permission status for all 6 جزوه records remains "not requested yet — draft prepared" until the owner actually sends and receives a written reply.
  4. **PASS** (verified 2026-10-19, P1.2) — OUP sources hard-marked "design reference only — never embed text, audio, or exercises" in the register (R-07/R-08/R-09; R-09 evidence: imprint OCR clause conditioning reproduction on OUP's prior permission).
  5. PENDING — automated enforcement (P2.4 `verify` forbidden-file scan: `*.pdf`, `books/*/pages/`) red on injected fixture, green on clean tree.
- Verified-fact evidence: assessment §7 rights table; **register VF-1…VF-6** (contact IDs published in Ahmadi front matter; Lotfi contact printed on covers; s3 imprint all-rights-reserved; s1/s2 scans contain content pages only — no imprint; no license text in any جزوه front matter; zero copyrighted files tracked at tip); V21 (upstream itself mandates keeping PDFs/page images out of version control).
- Assumptions (unverified): the published contact routes reach the named authors personally (AS-1); the authors decide reuse of their own original contributions (AS-2); the «رایگان» note is a distribution fact, not a license (AS-3).
- Unresolved ownership questions (register §4, UQ-1…UQ-5): original-vs-textbook-derived scope of the جزوه; MoE (Prospect/Vision) textbook rights not researched — author permission cannot cover them; OUP s1/s2 imprint absence (edition/ISBN unverifiable from scans); PDF metadata author-name discrepancies; Ahmadi channel ID is a broadcast route, not a personal contact.
- Standing note: historical PDF blobs remain in auto-checkpoint commit 252fe4d; cleanup is a separate owner-approved decision; repo stays private meanwhile.

**C3 — Engine vendor-sync hygiene** *(assessment §9.3; owned by P2.3, affects P5.6)*
- Criteria:
  1. PENDING — engine assets vendored from a pinned upstream commit into `vendor/engine/` byte-identical (`git diff` vs. reference empty).
  2. PENDING — upstream `engine.py --check` (or documented equivalent) reports clean copies.
  3. PENDING — `THIRD_PARTY_NOTICES.md` committed with MIT attribution + pinned upstream commit hash.
  4. PENDING — sync command documented, tag-pinned, re-runnable; a deliberately injected local edit is DETECTED (red test) by the check.
  5. PENDING — fork patches (e.g., P5.6 `fa`/RTL) applied as upstream-shaped patches, listed in the notices, re-appliable after upstream sync.
- Verified-fact evidence: V10 (engine assets at `engine/`, per-book sync via `scripts/engine.py`), V9 (playback deterministic/offline-safe — vendoring does not change runtime behavior).
- Assumptions (unverified): upstream repo/tag availability remains stable; MIT attribution suffices for our modification pattern.
- Unresolved (§10.3): whether upstream accepts a `fa`/RTL contribution — nice-to-have, non-blocking (we maintain a fork either way).

**C4 — Mobile playback quality spike** *(assessment §9.4; owned by P5.5, affects P10.4)*
- Criteria:
  1. PENDING — a real Papermorph chapter runs on Playwright mobile viewport(s) (Chromium + Firefox); rAF frame times sampled across beat transitions; median/p95 recorded in `docs/testing/MOBILE_SPIKE.md`.
  2. PENDING — decision vs. predefined thresholds recorded (letterbox if met; tap-through/card fallback if missed); thresholds are fixed when P5.5 starts.
  3. PENDING — touch operability (advance, quiz primitives) usable on the mobile viewport; any overlap/overflow logged with severity.
- Verified-fact evidence: upstream `references/engine.md` §Performance documents the measurement method (cited in assessment); V20 (Playwright importable in this environment).
- Assumptions (unverified): emulated mobile results are decision-grade for MVP; a real-device matrix is deferred to P10.4.
- On FAIL → fallback R3 (§6): letterbox scaling / tap-through card mode.

**C5 — Demonstration-lesson review (scope lock)** *(assessment §9.5; owned by P6.5, unlocks P7+)*
- Criteria:
  1. PENDING — demo lesson (Vision One L1 candidate) playable end-to-end (chapter + activities + assessment) in desktop Chrome + Firefox with progress restore (P6.3 ACs).
  2. PENDING — teacher review package delivered (storyboard, `?review` notes, provenance sheet) via `serve.py` preview.
  3. PENDING — human reviewer completes the checklist and records explicit approval; only then is any item flagged `human-reviewed` and P7+ unlocked.
- Verified-fact evidence: V13 (localStorage progress contract `animebook:progress:`), V9 (offline playback) — the technical basis for a reviewable static artifact.
- Assumptions (unverified): reviewer identity (owner vs. teacher) and checklist format — to be fixed at P6.4.
- On FAIL/BLOCKED → scope stays locked at one lesson; bulk conversion (P7+) remains prohibited (R6).

### Security / accessibility / provenance / licensing checklist (per release)

- [ ] No secrets or API keys in client code; `.env` untracked (R8).
- [ ] No source PDFs, page images, or extracted textbook text committed (V21, §7).
- [ ] Every content item carries provenance; drafts are visibly badged; `human-reviewed` requires a reviewer record (mandate #5–6).
- [ ] RTL/LTR correctness spot-checked on new surfaces (Persian chrome RTL, English blocks LTR).
- [ ] Keyboard operability + captions for any new narrated content.

---

## 6. Risks, dependencies, fallback strategies (task-level view)

| Risk (assessment ref) | Affects | Fallback |
|---|---|---|
| R1 GLM authoring quality | P6.1, P9.4 | Simpler app-native lesson format (no full animation) for early lessons; human-teacher authored content path. |
| R2 fa-IR TTS unusable | P6.2, P6.1 | English narration + Persian captions/text (pedagogically valid for L2); z-ai TTS skill; human audio + alignment. |
| R3 Mobile stage quality | P5.5, P10.4 | Letterbox scaling; tap-through card mode for mobile. |
| R4 Engine fork drift | P2.3, P5.6 | Tag-pinned sync via `engine.py --from`; changes as upstream-shaped patches; contribute `fa`/RTL upstream. |
| R5 Copyright exposure | P1.2, all content | Rights register gate in `verify`; OUP = reference-only; جزوه = permission or re-authoring. |
| R6 Scope explosion | P6.5 gate | Bulk conversion locked behind demo review (C5). |
| R7 localStorage limits | P5.2, P8.1 | Defensive parsing (mirror V13); JSON export/import; P11 sync design. |
| Missing tooling (uv/ffmpeg regression) | P6, P9 | Pin versions; Kokoro local fallback for TTS; document reinstall steps. |

---

## 7. Change log and implementation status

| Date | Task | Change | Status |
|---|---|---|---|
| 2026-10-19 | P0.1–P0.4 | Phase 0 executed: workspace + git inspected; actual Papermorph repo investigated (README, SKILL.md, references, scripts, engine, i18n, TTS); toolchain verified; uploaded sources rights-reviewed; assessment written with **GO — conditional**. | `[x]` completed & verified |
| 2026-10-19 | P1 (plan) | Roadmap created; integration Option C recommended (hybrid: vendored engine + app-native activity layer + GLM authoring playbook); first implementation task proposed: **P3.1** (schema), with P2 scaffolding as the alternative first step if approver prefers. | planned (awaiting approval) |
| 2026-10-19 | Git/GitHub setup + security remediation (user-directed, between P1 and P2/P3) | **Audit:** `.env` (blob 769ebf2, since b913648) contains only `DATABASE_URL=file:…/db/custom.db` — a local SQLite path, **no credential** → nothing to rotate; `github_pat_` pattern: 0 matches in all history. **Discrepancy found:** environment auto-checkpoint 252fe4d (UUID subject) had silently tracked 9 copyrighted PDFs (~64 MB) — investigated, documented. **Remediation:** `91c9e9f` untracks `.env` (local file kept), adds env-hygiene `.gitignore` rules + placeholder-only `.env.example`; `b9a1fe3` untracks `upload/` PDFs (local copies kept), ignores `upload/`. **Remote:** `origin = https://github.com/Sohrab1999/webapp.git` (verified via API: private, default branch `main`, token has push); PAT stored outside repo (`/home/z/.secrets/`, 0600) behind a git credential helper — absent from URLs/config/logs/commits. **Push verified:** `main` → `origin/main`, `git ls-remote` hash == local HEAD `b9a1fe3f6366ed800b77163ab8f626c0c4c85ef0`. Historical blobs (non-secret `.env` blob; PDF blobs) remain in earlier commits — history rewrite NOT performed (requires explicit owner approval). | `[x]` completed & verified |
| 2026-10-19 | P1.1 | **Option C ratified by owner** ("approved as stated"), subject to gates C1–C5. Gates operationalized into explicit, testable criteria with honest statuses in new §5.1: C1 UNTESTED (0/6) · C2 PARTIAL (1/5 — only the tip-level zero-copyrighted-files criterion has executed evidence: 91c9e9f + b9a1fe3 pre-push tree listing) · C3 UNTESTED (0/5) · C4 UNTESTED (0/3) · C5 NOT REACHED (0/3). **No gate PASSED.** Verified facts (V-refs), assumptions (labelled unverified), and unresolved questions (assessment §10) kept distinct per gate. §2 annotated with ratification banner. Explicitly NOT claimed (owner constraint): Persian TTS viability, mobile compatibility, Papermorph/GLM authoring compatibility — all untested. No product code, no scaffolding, no P3.1. | `[x]` completed & verified |
| 2026-10-19 | P1.2 | **Rights register + permission drafts created** (documentation only, no product code). New `docs/content/RIGHTS_REGISTER.md`: all 9 uploaded sources recorded individually (R-01…R-09) with source identifiers/exact titles, evidenced rights holders, evidence-checked license findings, intended use, permission status, permitted/prohibited uses, required clarifications, evidence sources + dates, and decisions — **6× permission required** (Ahmadi Vision 1–3, Lotfi grades 7–9), **3× restricted design-reference-only** (OUP s1–s3). New evidence gathered by local file inspection (`pdfinfo`/`pdftotext`/page-image rendering, 2026-10-19): Ahmadi covers verify author + ed. 3 Mehr 1401 + contacts `@JamalAhmadi1984`/`@PracticalEnglishInKonkour`; Lotfi covers verify author + ed. summer 1403 + contact 09141842803; **new finding: s1/s2 scans contain content pages only (no imprint/copyright pages)** — OUP attribution for s1/s2 recorded as series-based, not per-title-verified. Two permission drafts (DRAFT — NOT SENT, owner review only) at `docs/content/permissions/PERMISSION_REQUEST_jamal-ahmadi.md` + `PERMISSION_REQUEST_hassan-lotfi.md` (bilingual fa/en, placeholders for sender identity; verified contacts only; ask digitization/adaptation/hosting/distribution/commercial + attribution/territory/duration/restrictions; explicitly state no permission granted; ask the original-vs-textbook-derived boundary question). Verified facts (VF-1…6), assumptions (AS-1…3), unresolved questions (UQ-1…5) kept distinct. **No permission granted by anyone; nothing sent; no source cleared for commercial reuse.** C2 → PARTIAL 4/5 (criterion 5 — automated enforcement — remains PENDING, owned by P2.4). Zero copyrighted files tracked (re-verified via `git ls-files` pre-commit). | `[x]` completed & verified |
| 2026-10-19 | P1.3 | **Dependency baseline pinned and verified** (manifest + lockfile only — no scaffold, no app code, no config files; P2.1 untouched). New `package.json`: exact pins, `private: true`, `license: UNLICENSED`, engines `node >=24.0.0 / npm >=11.0.0`, `packageManager npm@11.19.0`, six scripts declared (dev/build/start/lint/test/e2e — declared but NOT executed: no scaffold exists). **deps:** next 16.4.2 · react 19.3.1 · react-dom 19.3.1 · zod 4.6.7. **devDeps:** typescript 5.9.3 · tailwindcss 4.3.3 · @tailwindcss/turbopack 4.3.3 · eslint 10.13.0 · eslint-config-next 16.4.2 · vitest 5.0.5 · vite 8.3.4 · @playwright/test 1.64.1 · @types/node 24.19.2 · @types/react 19.3.0 · @types/react-dom 19.3.0. **Evidence:** npm registry survey 2026-10-19 (dist-tags/engines/peerDependencies for all 15 candidates) + inspection of the published `create-next-app@16.4.2` tarball (Next's own generated spec: typescript `^5`, eslint `^9`, tailwindcss `^4` + `@tailwindcss/turbopack` on the default Turbopack bundler (postcss.config.mjs excluded, `turbopack.rules["*.css"]` injected), @types/node `^20`, @types/react `^19`, eslint-config-next version-locked to next, lint script = plain `eslint` CLI, flat config template). **Documented deviations from CNA defaults (each evidence-backed):** typescript 5.9.3 not 7.0.2 (registry latest is TS 7 but CNA installs `^5` — no Next-side TS-7 validation evidence exists); eslint 10.13.0 not 9.39.5 (npm deprecation: 9.x EOL; eslint-config-next peer `>=9.0.0` permits; eslint+eslint-config-next integration empirically verified); @types/node 24.19.2 not `^20` (runtime Node 24.21.0; vitest optional peer `^22||>=24`); react 19.3.1 not frozen 19.3.0 (react-dom@19.3.1 peer `^19.3.1`); vite 8.3.4 pinned explicitly (vitest 5 declares vite a REQUIRED non-optional peer, no longer bundled). **Verification (scripts/p13_verify.sh, output in tool-results/):** `npm install` clean — zero peer warnings; `npm ci` exit 0 (clean-room reproducibility from lockfile alone); `npm ls --all` exit 1 caused solely by cross-platform `UNMET OPTIONAL` entries (verified: zero INVALID, zero extraneous, zero non-optional UNMET); all 15 pins resolve exactly (`npm ls --depth=0`); binaries run: Next.js v16.4.2 / tsc 5.9.3 / eslint v10.13.0 / vitest 5.0.5 / playwright 1.64.1; ESLint 10 flat engine + eslint-config-next `core-web-vitals`+`typescript` smoke lints sample code (messages include `@typescript-eslint/no-unused-vars`); zod schema parse/reject smoke passes; engines cross-check — every declared `engines.node` among the 15 satisfied by Node 24.21.0. **Known constraints (documented, not concealed):** (1) `npm audit` 5× high = ONE dev-only chain braces GHSA-vfj7-8cjw-p6xm via eslint-config-next→@next/eslint-plugin-next→fast-glob→micromatch→braces; braces@3.0.3 (registry latest) itself is flagged — NO patched release exists; npm's only proposed fix = downgrade eslint-config-next to 14.2.35 (semver-major, breaks Next 16 pairing) → rejected; runtime deps (next/react/react-dom/zod) audit-clean; owned by P10.2, monitor upstream. (2) npm 11 `allowScripts` gates unrs-resolver postinstall — left gated (no-op: prebuilt @unrs/resolver-binding-linux-x64-gnu present and loads). (3) Playwright browser binaries NOT downloaded (deferred to P5.x/P10.x). (4) engines floor = verified runtime line (node >=24, npm >=11) — compat with node 20/22/26 claimed by peers but NOT verified here and not asserted. (5) eslint-plugin-next informational note "Pages directory cannot be found" during smoke — expected pre-scaffold. **Unresolved:** TS 7 vs Next 16 validation (future bump decision); webpack fallback would swap @tailwindcss/turbopack → @tailwindcss/postcss (same 4.3.3). | `[x]` completed & verified |

**Currently in progress:** none (workflow gate: P1.3 completed 2026-10-19; next task awaits owner approval).
**Blocked:** none (C1 becomes the first potentially blocked gate if the sandbox cannot reach Edge TTS — decision lands at P6.2).
**Next proposed task:** **P2.1 — Create the Next.js App Router scaffold** (TS strict, Tailwind, ESLint wiring, `src/` layout, base `README.md`, commit hygiene) — the pinned P1.3 baseline (`package.json` + lockfile) gets extended in place, `npm run build` must pass with zero product features; this is the natural continuation and first task that turns the verified baseline into a running application.
**Standing notes:** repo `Sohrab1999/webapp` is private — keep it private until any owner-approved history cleanup; PDF blobs and the non-secret `.env` blob remain in earlier history (252fe4d / b913648). Gate statuses live in §5.1 and change only with recorded evidence.
