# Lesson Artifact Contract (roadmap task P3.4, contract v1)

Status: **ACTIVE** — enforced by `npm run artifact:check` (wired into `npm run verify` as step 5).

This document defines the output bundle of the authoring pipeline (roadmap P3.4): one static,
self-contained folder per lesson that the app serves from `public/lessons/` and embeds in the
chapter iframe (P5.1). The contract has a machine-checkable part — the `lesson.json` sidecar,
defined by `src/content/artifact/sidecar.ts` — and a file-layout part, both enforced by the
contract checker (`src/content/artifact/`, runner `scripts/artifact-check.mjs`).

The contract is a *structural* agreement. It deliberately does NOT certify playability (that is
P5.1/P6.3 browser evidence), does NOT decide rights clearance (the rights register
`docs/content/RIGHTS_REGISTER.md` alone does), and does NOT track lesson versions or staleness
(P8.2 owns the content registry).

## 1. Bundle layout

One directory per lesson under `public/lessons/`, named by the lesson id:

```
public/lessons/<lessonId>/
├── lesson.json                  # sidecar — REQUIRED (see §2)
├── index.html                   # cover/contents page — REQUIRED, non-empty
├── lib/
│   ├── engine.js                # byte-identical copy of vendor/engine/engine.js — REQUIRED
│   ├── engine.css               # byte-identical copy of vendor/engine/engine.css — REQUIRED
│   └── book.css                 # byte-identical copy of vendor/engine/book.css — REQUIRED
│   (lib/vendor/mathjax/… optional — only books using LaTeX load it)
└── <chapter>/                   # one directory per chapter (e.g. ch01/) — at least one REQUIRED
    ├── index.html               # chapter page the player iframe loads — REQUIRED, non-empty
    └── audio/<lang>/
        ├── timings.js           # canonical form: const TIMINGS = {…} — REQUIRED (see §3)
        └── <beatId>.mp3         # one pre-rendered clip per TIMINGS beat — REQUIRED (V9)
```

Rules enforced by the checker:

- Every directory under `public/lessons/` is treated as a bundle and must carry `lesson.json`;
  a sidecar-less directory is an error, never silently skipped.
- Every top-level directory other than `lib/` is treated as a chapter and validated as such —
  an empty or malformed chapter fails the build rather than being ignored.
- A top-level *file* other than `index.html` / `lesson.json` produces a WARNING (it cannot
  invalidate the bundle, but the layout drift must stay visible).
- The `lib/` engine copies must be **byte-identical** to the vendored pinned engine
  (`vendor/engine/`, gate C3: the engine is never hand-edited). `.gitattributes` pins
  `public/lessons/**/lib/**` and `public/lessons/**/*.mp3` as `-text` so byte-identity holds
  on every OS and git configuration, mirroring the `vendor/` hygiene.
- Chapters follow the upstream Papermorph book shape (each chapter is its own page loading
  `../lib/engine.js`, with per-chapter `audio/<lang>/timings.js` + beat clips — the shape the
  upstream fixtures in `vendor/engine/check_latex.py` / `check_volume.py` exercise).

## 2. The `lesson.json` sidecar

Exact fields (strict object — any unknown field is rejected; no rights decision can be stored
here, mirroring the P3.1 content schema's rights design):

| Field | Type / constraints | Meaning |
| --- | --- | --- |
| `contractVersion` | literal `1` | Version of THIS bundle format (`ARTIFACT_CONTRACT_VERSION`). |
| `lessonId` | kebab-case id, namespaced under `courseId` | The P3.1 lesson id the bundle was built from (`vision-1-l01`). A bundle can never mint a parallel identity. |
| `courseId` | official book id (`prospect-1…3`, `vision-1…3`) | The owning course (the Student Book owns canonical identity). |
| `contentSchemaVersion` | literal `1` | The content schema version (`CONTENT_SCHEMA_VERSION`) the ids refer to. A mismatch fails loudly — stale sidecars are never reinterpreted. |
| `provenance` | P3.1 `provenanceSchema`, verbatim | Origin + review status of the BUNDLE (assembly of the engine copies and chapter pages). `ai-draft` forbids a reviewer; `human-reviewed` requires one. A `third-party` source carries `registerId` and is cross-checked against the rights register with the same code path as the P3.3 content validator: unknown id → error; record not `allowed` → error; `allowed` + owner-reported → WARNING stating the grant is **NOT independently verified and NOT finally cleared** (register rule 7); documented allow → info. |
| `engine.progressKey` | `animebook:progress:` + non-empty selector | The effective localStorage key the bundle's chapters share (V13). See §4. |

The sidecar records facts; it never asserts permissions. There is no field that could express
"permission granted" — rights decisions stay exclusively in the register.

## 3. `timings.js` canonical form

The checker requires the exact form the upstream tooling emits (`vendor/engine/check_volume.py`:
`"const TIMINGS = " + json.dumps(...)`):

```js
const TIMINGS = {"intro":{"dur":6,"marks":{},"cues":[]}}
```

- A single `const TIMINGS = {…}` assignment whose value is a JSON object; an optional trailing
  semicolon/whitespace is tolerated. Any other JS shape fails the build (a tooling drift must
  be visible, not guessed at).
- At least one beat; every entry must carry a finite, positive numeric `dur` (seconds).
- Every TIMINGS key must have a pre-rendered clip at `audio/<lang>/<beatId>.mp3` in the same
  chapter (the engine fetches exactly that path, V9; a missing clip is a build error, not a
  runtime surprise).

## 4. Engine progress key (V13)

The vendored engine derives the per-book localStorage key at `vendor/engine/engine.js:2014`:

```js
const BOOK_PROGRESS_KEY = bookSetting('--progress-key') || 'animebook:progress:' + new URL('../', location.href).pathname;
```

- Book settings are CSS custom properties read from the document root — the default key for a
  bundle served at `public/lessons/<lessonId>/` is therefore
  `animebook:progress:/lessons/<lessonId>/`, which is exactly what the demo sidecar declares.
- A bundle MAY override the key by setting `--progress-key` in its own page-level styles (the
  byte-identity requirement applies only to the three REQUIRED `lib/` files; book settings can
  live in a page `<style>` block or an additional authored CSS file). The sidecar must then
  declare the overridden key; the checker keeps the key inside the `animebook:progress:`
  namespace (so the P5.2 progress bridge can discover it) and reports any deviation from the
  location default as INFO — the declared value stays authoritative and is never rewritten.

## 5. The checker

- CLI: `npm run artifact:check` (runner `scripts/artifact-check.mjs`, same pinned-`tsc`
  compile strategy as `content:check`; zero new dependencies). Wired into `npm run verify`
  as step 5 of 8.
- Deterministic: sorted traversal, no network, no clock, no environment-dependent behavior.
- Exit codes: `0` = every bundle satisfies the contract (warnings/infos may be present);
  `1` = findings; `2` = usage/environment error (missing register, missing vendored engine,
  or missing `public/lessons/` root — committed repository data whose absence means a broken
  checkout).
- Diagnostics name the file and the fix: `<bundle>/<file>: <what is wrong> — <what to do>`,
  in the same format as the P3.3 content validator.
- Warnings are advisory; the PASS line always restates that the check does NOT establish
  legal clearance and does NOT prove playability.

## 6. Scope boundaries and extension policy

- **Playability** is validated by browser evidence in P5.1/P6.3, not here; the committed demo
  bundle is a structural stub by design.
- **Versioning / staleness** versus the content sources is the P8.2 registry's job; the
  sidecar carries the schema ids that registry will key on.
- **Legal clearance** stays in `docs/content/RIGHTS_REGISTER.md`; deployment of a bundle must
  also satisfy the release checklist (MIT attribution ships with the engine — see
  `THIRD_PARTY_NOTICES.md`; the release-time licensing checklist re-verifies it).
- Adding a required file, a sidecar field, or a new check = a contract change: bump
  `ARTIFACT_CONTRACT_VERSION` in `src/content/artifact/sidecar.ts` via an owner-approved
  roadmap task and re-emit affected sidecars. The checker fails old versions loudly instead
  of interpreting them with drifted semantics.

## 7. The committed demo bundle

`public/lessons/vision-1-l01/` is the hand-made minimal bundle required by the P3.4 AC: it
satisfies the checker with zero findings and serves as the executable documentation of the
layout. Its chapter page is an honest structural stub (single demo beat, silent 2-second clip
generated with `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 2 -b:a 32k`); it is marked
`ai-draft`, is not pedagogically approved, and is not rights-cleared for commercial
publication.
