# Papermorph Assessment — Interactive English Learning Web App

| | |
|---|---|
| **Document** | Repository investigation report (Phase 0, roadmap phase P0) |
| **Project** | Interactive English Learning Web App (Iranian grades 7–12 + general learners) |
| **Repo assessed** | https://github.com/DozenTwelve/Papermorph (branch `main`, commit `45533ec`, checked 2026-10-19) |
| **Assessment status** | **GO — conditional** (see §9 for the conditions that gate implementation) |
| **Upstream license** | MIT |

All file paths below refer to paths inside the Papermorph repository unless prefixed with `workspace:` (our repo at `/home/z/my-project`).

---

## 1. Verified facts (with sources)

Every claim in this section was verified against the live repository or the local environment on 2026-10-19. Claims that could not be verified are explicitly marked **[UNVERIFIED]** in §2–§5.

### 1.1 What Papermorph is

| # | Fact | Source |
|---|------|--------|
| V1 | Papermorph is *"A Skill that turns PDFs into animated interactive web books"* — an AI-agent skill that converts a reference PDF into a static, self-contained web book with animation, narration and quizzes. | `README.md` (intro + pipeline diagram) |
| V2 | Authoring pipeline: `PDF → a short conversation (style.json) → Storyboards → Narration → Animation & quizzes → Web book`. | `README.md` (Pipeline) |
| V3 | It is packaged as an agent skill in Claude Code format: `.claude/skills/papermorph/SKILL.md` (8.2 KB) plus `references/` (9 docs), `scripts/` (15 Python tools), `assets/` (templates). Install: `npx skills add DozenTwelve/Papermorph --skill papermorph --agent claude-code`. | repo tree; `SKILL.md` front-matter |
| V4 | Languages: HTML 48.1 %, JavaScript 43.7 %, CSS 5.3 %, Python 2.9 %. **No framework code** — the player is vanilla JS/SVG/CSS, the tooling is Python. | GitHub repo language stats |
| V5 | License: **MIT** (code reuse permitted with attribution; no copyleft obligations). | `LICENSE` |
| V6 | Repo activity: ~790 stars, 111 forks, last commit 2026-10-19 — *"Merge pull request #12 from titulartarantula/feat/scorm-export"*. SCORM export was just merged; README does not yet document it. | GitHub metadata; `scripts/scorm.py` (10.5 KB) |

### 1.2 The runtime output (what a learner actually plays)

| # | Fact | Source |
|---|------|--------|
| V7 | A chapter is **one 1600×900 SVG "stage" plus a player**; *beats* pair narration clips with timed actions. | `SKILL.md` (What the picture should be… technically a chapter…) |
| V8 | A chapter page loads the shared engine and its `audio/<lang>/timings.js`, defines a `CHAPTER` object (including a `language` field when different from `en`), drawing helpers, `BEATS` and questions, then calls `boot()`. | `references/engine.md` (§ The engine) |
| V9 | **Playback requires no live model call.** Narration is pre-rendered MP3 per beat + `timings.js` (duration, word marks, caption cues). Seeking/jumping rebuilds the scene deterministically. This matches our requirement that lesson playback must survive without GLM availability. | `SKILL.md` (chapter loop step 2); `engine.md` (Seeking replays) |
| V10 | Engine assets live in `engine/` at repo root: `engine.js` (124 KB), `engine.css` (17 KB), `contents.js/.css`, `units.js/.css`, `volume.js/.css`, `book.css`, `vendor/mathjax/` (optional LaTeX), plus self-check scripts `check_i18n.py`, `check_latex.py`, `check_volume.py`. Each book gets a **copy** in `site/<book>/lib/` via `scripts/engine.py` (`--check` / `--from OWNER/REPO@REF`); the copy is never hand-edited, fixes are made upstream and synced. Book-level overrides go in `lib/book.css` (`--math-font`, `--progress-key`). | `engine.md` §1; repo tree |
| V11 | Question/interaction primitives built into the engine: `quiz(position, …, done)` with positions `BAND / TOPR / RIGHT / SCREEN / SORT_SCREEN`; types `choice`, `blanks` (accepts exact numeric/fraction answers, `test()` custom judges), `grid`, `tap` (number-line), `tapEls`, `pickEls`, `pickPoint`, `sorter` (drag), and a custom-type escape hatch `build(body, api)` returning `{reveal, check?, lock?, key?, hint?}` with `api.grade(...)`. First-attempt scoring via `SCORE[id]`. | `engine.md` §Questions |
| V12 | Player UX already implemented: Space/←/→/Home, captions toggle (C), speed 0.75–1.5× (remembered), fullscreen (F), `?` help overlay, click-to-jump step segments, next-beat audio preloading, `?beat=N&t=S` deep links for review, a `?review` note-collection mode, and a finish card that opens `CHAPTER.next`. | `engine.md` §Player |
| V13 | Progress persistence is **localStorage** under the stable key `animebook:progress:` (deliberately kept for reader continuity; per-book override via `--progress-key`). The reader of malformed/`null` progress degrades to empty — an explicit robustness contract. Completion = array of positive integer chapter numbers. | `engine.md` §Player (progress paragraphs) |

### 1.3 The authoring toolchain (what GLM would run)

| # | Fact | Source |
|---|------|--------|
| V14 | PDF ingestion: `outline.py` (PyMuPDF bookmarks → `sections.json`), `split_pages.py` (page rendering + per-chapter text extraction into `books/<book>/pages/chNN/`). | `SKILL.md` §Pipeline step 1 |
| V15 | Style governance: an intake conversation produces `style.json` (palette + semantic color meanings, fonts, voice, cast, shared components, approved chapters). Every chapter is authored *against* it; recurring decisions are promoted back into it. | `SKILL.md` intro + step 2; `references/intake.md` |
| V16 | Narration: `tts.py` generates beat MP3s + `timings.js` using **Edge TTS (network)** or **Kokoro (local, Apache-2.0, ~330 MB model)**. Outputs per-beat MP3, marks, caption cues. | `scripts/tts.py` |
| V17 | Quality gates: `lint.py` (broken names, missing audio, stale narration — "under a second"), `overlap.py`, `check_blank.py`, `perf.py`, review captures `strip.py` / `shot.py` / `still.py`; engine-side `check_i18n.py`, `check_latex.py`, `check_volume.py`. | `scripts/` + `engine/` trees; `README.md` (Get started) |
| V18 | Delivery: static `site/<book>/` folder (cover + contents + chapters), previewed via `serve.py`; chapter → **MP4 1080p + SRT** via `export.py`; **SCORM** package via `scorm.py` (freshly merged). | `SKILL.md` §Pipeline step 5; `README.md` (Export to Video); PR #12 |
| V19 | Documented runtime requirements: `uv`, `ffmpeg`/`ffprobe`, Edge TTS network access (or local Kokoro), Playwright browsers (Chromium + Firefox for perf testing). | `SKILL.md` (Needs: …) |
| V20 | **Our environment satisfies the toolchain prerequisites**: `uv 0.13.0`, `ffmpeg/ffprobe 7.1.5`, Python 3.12.15, Node v24.21.0, npm 11.19.0, git 2.47.3, Playwright importable. | workspace check, executed 2026-10-19 |
| V21 | Source-provenance hygiene is built into the skill: *"keep source PDFs, page images and extracted text outside the static output folder and out of version control"* (`*.pdf`, `books/*/pages/` ignored). | `SKILL.md` (pipeline preamble) |

### 1.4 Multilingual / i18n / RTL status

| # | Fact | Source |
|---|------|--------|
| V22 | The engine has a **language placeholder mechanism** (`CHAPTER.language`, template substitution) and translated UI strings, but the i18n test matrix covers only **`en, ru, zh, ja, de` — all LTR**. | `engine/check_i18n.py` (`VARIANTS = {"base": ("en", True), "en": …, "ru": …, "zh": …, "ja": …, "de": …}`) |
| V23 | The i18n checker validates cover/contents strings, help & shortcuts, quiz labels/hints/feedback, progress/completion messages, number formatting (e.g. comma decimal separator in Russian) and plural fallbacks — i.e. **the UI-string surface that Persian would have to plug into is known and testable**. | `engine/check_i18n.py` |
| V24 | README states the current scope limitation verbatim: *"No image models, multilingual support, or BGM yet."* | `README.md` (Current status) |
| V25 | `tts.py` has **no per-entry locale field**; Kokoro word timings are English-only; mark names and beat IDs **must be ASCII** (they become filenames/JS keys). | `scripts/tts.py` |

### 1.5 Models / agent-runtime compatibility

| # | Fact | Source |
|---|------|--------|
| V26 | The skill is explicitly *"not tied to one model"*; documented runs: Opus 5.5 (most books incl. physics), GPT-6.1-Sol (*Elementary Mathematics* ch. 4–20), Sonnet 5.5 (ch. 21–22, "some rough edges"). **GLM is not mentioned anywhere** in README or SKILL.md. | `README.md` §Models |
| V27 | The skill is structurally portable: it is (a) a Markdown playbook (`SKILL.md` + 9 reference docs) and (b) model-agnostic Python/CLI scripts. Nothing in the scripts requires Claude-specific APIs. **[UNVERIFIED in practice]** — whether a GLM-driven agent can execute the full chapter loop at comparable quality is an experiment, not a documented capability. | `SKILL.md`, `references/team.md`; inference flagged |
| V28 | The skill supports subagent/team production of chapters (`references/team.md`: fresh worker per chapter-loop step, cheapest capable model) — conceptually compatible with our environment's subagent facilities. | `references/team.md` |

### 1.6 Workspace state (our repo)

| # | Fact | Source |
|---|------|--------|
| V29 | `workspace:/home/z/my-project` is a git repo, branch `main`, 1 commit ("Initial commit"), **no remote configured**. Untracked: `upload/` (9 PDFs, copyrighted — see §7). `.gitignore` ignores `skills/` and `node_modules/`. A `.env` exists containing `DATABASE_URL` (not read; must never be committed). | `git status`, `git remote -v`, `.gitignore` |
| V30 | No `docs/`, `roadmaps/`, or prior application code exists — the project starts from a clean slate apart from uploaded reference PDFs. | workspace listing |

---

## 2. Current limitations (upstream, as-found)

1. **No RTL / Persian support.** UI-string translations exist for five LTR languages only (V22); nothing in the engine, templates, or checks handles right-to-left layout, Persian typography (e.g. ZWNJ handling, numeral conversion), or RTL text in the HTML card layer (`#ui`), captions, or cover/contents templates. The SVG drawing layer itself is coordinate-based and direction-agnostic, but any text placed via `T()`/`M()` uses explicit anchors — Persian strings *render* but are not *designed for* (no shaping/font config, no RTL reading order in composed scenes).
2. **No official multilingual support** (V24) despite the language-placeholder plumbing; adding `fa` is an upstream-shaped but nontrivial extension (templates + checks + fonts + RTL CSS).
3. **TTS narration is English-first.** Kokoro is English-only for word timings (V25); Edge TTS *does* list Persian voices (`fa-IR-FaridNeural`, `fa-IR-DilaraNeural`) but their behaviour inside this pipeline (word-boundary events, `[[mark]]` anchors inside Persian text, retry behavior) is **[UNVERIFIED]**. ASCII-only mark names conflict with marks that must wrap Persian words — a workable convention (ASCII pseudo-marks adjacent to target words) needs a spike.
4. **Fixed 1600×900 desktop stage.** No documented mobile/touch behavior; quiz `BAND`/`TOPR` positions are desktop-coordinate based; README/SKILL.md mention no responsive strategy. SVG scales as a box, but touch ergonomics and question-card layout on phones are **[UNVERIFIED]**.
5. **Not a component library.** The engine is a self-contained vanilla-JS page asset intended to be copied into a static book (`lib/`), not an importable React module. Integration into a React/Next.js app is by embedding or forking, not by npm-install.
6. **Agent runtime assumptions.** Install path and docs assume Claude Code (V3); model coverage excludes GLM (V26). Running the *scripts* here is proven possible (V20), but the *authoring loop quality* under GLM is unproven.
7. **No image generation** (V24): illustrated scenes (tier 2) are hand-choreographed SVG; "picture books" tier is WIP. For our scope this is acceptable — English-teaching content needs diagrams, dialogues and text cards, not photoreal art.
8. **Audio weight.** One MP3 per beat means book folders grow quickly; no built-in CDN/upload story — relevant once we produce a full grade library.
9. **No answer-format flexibility for language quizzes out of the box.** `blanks()` targets numeric/fraction exact values; text-entry judging (e.g. spelling variants, Persian meaning matching) needs the `build()` escape hatch or app-native activities (see §6).

---

## 3. Reusable components (what we take, as-is or lightly adapted)

| Component | Path | License | Reuse decision |
|---|---|---|---|
| **Player engine** (`engine.js/css`, contents, units, volume, book.css, vendored MathJax) | `engine/` | MIT | **Reuse as vendored asset**, unmodified, synced via `scripts/engine.py` tags. This is the single highest-value asset: deterministic playback, quiz primitives, captions, progress, review mode. |
| **PDF sectioning tools** (`outline.py`, `split_pages.py`) | `.claude/skills/papermorph/scripts/` | MIT | **Reuse** for ingesting source PDFs at authoring time only (never in learner-facing build). |
| **Narration pipeline** (`tts.py`) | same | MIT | **Reuse after a fa-IR spike**; keep as authoring-time tool so audio is pre-generated (requirement #9). |
| **Quality gates** (`lint.py`, `overlap.py`, `check_blank.py`, `perf.py`, `check_volume.py`) | same | MIT | **Reuse** verbatim inside our authoring CI for lesson artifacts. |
| **Review/preview tooling** (`strip.py`, `shot.py`, `still.py`, `serve.py`) | same | MIT | **Reuse** for human content review (teachers) — the `?review` notes mode pairs well with teacher-review workflow (requirement #6). |
| **Exports** (`export.py` MP4+SRT, `scorm.py`) | same | MIT | **Reuse later** (P11) for school/LMS distribution — a genuine differentiator for Iranian schools. |
| **Authoring methodology** (`SKILL.md`, `references/*.md`, `style.json` intake pattern, storyboard→motion→review chapter loop) | `.claude/skills/papermorph/` | MIT | **Adapt**: re-express as our own GLM-executable authoring playbook (`/authoring/` docs + prompts), preserving the pipeline, gates, and provenance rules. |
| **Engine extension points** (`CHAPTER.language`, `--progress-key`, `lib/book.css` overrides, custom `build()` questions) | `engine.md` | MIT | **Extend**: `fa` UI strings, RTL book.css, per-lesson progress keys, Persian-friendly question types. |

**Not reusable / rejected:** the Claude-Code install wrapper (we drive GLM directly); any assumption that Papermorph alone *is* the product (it is an authoring skill + player, not an LMS — no course management, no grade taxonomy, no activity types beyond in-stage quizzes, no teacher dashboard).

---

## 4. Required adaptations

1. **Persian UI + RTL shell (app level).** The Next.js shell implements `dir="rtl"` for Persian chrome, `dir="ltr"` blocks for English teaching content, logical CSS properties throughout. Inside Papermorph books: add `fa` to UI-string templates (following `check_i18n.py`'s matrix), RTL overrides in `lib/book.css`, and Persian web fonts (e.g. Vazirmatn for UI, Noto Naskh Arabic for body) — never hardcode in `engine.css` (book copies must stay syncable).
2. **Persian narration spike.** Verify: (a) `fa-IR` Edge-TTS voices reachable from this environment; (b) word-boundary timing quality for Persian; (c) an ASCII `[[mark]]` convention (pseudo-tokens placed between Persian words) that survives `tts.py`; (d) fallback plan — our environment's own TTS skill or human-recorded audio with `timings.js` synthesized from transcript alignment.
3. **Content schema layer (new, app level).** Papermorph chapters are code + assets; we need a versioned, Zod-validated lesson schema covering: vocabulary items (word, phonetic, Persian meaning, example, audio ref), grammar points (explanation, examples, items), dialogues (turns, speakers, audio, translation), readings (passage, questions), practice/assessment (item types, scoring, feedback), and **provenance metadata** (`source: "textbook" | "supplementary" | "ai-draft" | "human-reviewed"`, reviewer, edition). Activities compile to either (a) Papermorph chapters (animated explanations) or (b) app-native interactive components (drills, flashcards, dialogues) — keeping rendering, assessment logic and authoring separate.
4. **Progress bridge.** Two-tier persistence: (a) engine-native per-book localStorage keys (documented contract, V13) read by the app for completion status; (b) an app-namespaced store (`<app>:progress:v1`) for app-level activities, merged in the progress dashboard. No server, no auth (per MVP exclusions).
5. **Embedding strategy.** Static books published under `public/books/<grade>/<lesson>/`; the app embeds chapters via iframe with a `postMessage` bridge (next-beat/finish events) — no engine modification, upstream sync stays clean.
6. **Authoring workflow for GLM.** Port `SKILL.md` + relevant references into an internal playbook with: per-lesson briefs, storyboard-first discipline, lint/review gates, and human-teacher sign-off before any lesson is flagged `human-reviewed` (requirement #6).
7. **Mobile adaptation spike.** Test an existing upstream-style chapter on mobile viewports (Playwright + real-device matrix in P10); if the fixed stage proves unusable, mitigation is an app-native "mobile mode" that plays beats as tap-through cards without the full stage, or letterboxed scaling with touch-adjusted quiz positions.

---

## 5. Risks and mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | GLM cannot produce Papermorph-quality chapters (engine API misuse, weak storyboarding) | Medium | High | The playbook enforces lint + storyboard-sheet + human review gates (V17, V21); pilot exactly one lesson (P6) before scaling; fallback = simpler app-native lesson format without full animation. |
| R2 | fa-IR TTS timings unusable → narration desync | Medium | High | P3 spike gates P5/P6; fallbacks: z-ai TTS skill, Kokoro for English-only narration (English L2 audio is actually desirable), or human audio + alignment. English word marks work regardless (V25). |
| R3 | Mobile experience of the 1600×900 stage is poor | Medium | High | P10 spike with measured frame times (engine.md §Performance methodology); fallback letterbox + app-native mobile activity mode. |
| R4 | Engine fork drift (we patch our copy, upstream fixes diverge) | Medium | Medium | Policy: never hand-edit `lib/engine.*` (V10); all engine changes as upstream-style patches in our fork of `engine/`, synced via `engine.py --from`; track upstream tags. |
| R5 | Copyright exposure from uploaded جزوه/OUP PDFs | **High** | High | See §7: OUP books never embedded; جزوه content used only with author permission or re-authored; official-textbook excerpts avoided until rights confirmed; AI-generated content watermarked as such until teacher-approved. Uploads stay untracked in git (V29). |
| R6 | Scope explosion (12 grades × 3 books × N lessons) | High | Medium | MVP = one demonstration lesson + one activity set per skill area (roadmap P6–P7); no bulk conversion before demo review (roadmap §Product scope). |
| R7 | localStorage fragility (cleared profiles, multi-device) | Low | Low | Accept for MVP (engine contract V13 is already defensive); P11 designs an optional sync path without auth in MVP. |
| R8 | Secrets leakage (workspace `.env` present) | Low | High | `.env` never committed; verification step in every task checklist; no API keys client-side (requirement #13). |

---

## 6. Integration options considered

### Option A — Embed Papermorph books as-is inside a Next.js shell
Ship each lesson as an upstream-format static book; the app provides home, grade/lesson selection, progress dashboard, RTL chrome; chapters play in iframes.
- **Pros:** fastest path; engine untouched → clean upstream sync; playback offline-safe; quiz UX proven.
- **Cons:** coarse integration (postMessage only); all non-animated activities would be force-fitted into the chapter format; RTL limited to `book.css` overrides; app-level activities (flashcards, dialogue players) would have no native home.

### Option B — Fork the engine into a React component library
Rebuild the player as typed React components; lessons become JSON consumed by the components.
- **Pros:** deepest integration, fully typed, testable.
- **Cons:** rebuild of a 124 KB battle-tested engine + quiz API = high cost/high risk; loses the upstream sync model (V10) and the already-ported authoring toolchain; violates the "reuse, don't rewrite" mandate.

### Option C — Hybrid content pipeline (recommended)
Papermorph remains the **animated-lesson engine and authoring toolchain** (books under `public/books/`, iframe-embedded, engine vendored + synced). The app adds an **app-native activity layer** for what Papermorph does not model — vocabulary drills/flashcards, grammar item sets, dialogue/reading players, assessments — driven by the Zod schema (§4.3) and rendered as small typed React components with RTL-aware styling. Progress is bridged per §4.4. The GLM authoring playbook (adapted SKILL.md) produces both chapter artifacts and schema-validated activity JSON, with lint gates and human review.
- **Pros:** plays to both systems' strengths; lesson playback never needs GLM (V9); provenance enforced at schema level; MVP-compatible; keeps upstream sync clean; leaves SCORM/MP4 exports open for P11.
- **Cons:** two presentation surfaces (iframe stage vs React activities) that must feel unified — mitigated by a shared design system and consistent shell.

**Decision: Option C.** Option A alone cannot deliver the MVP's interactive activities (vocab/grammar/dialogue/reading/assessment are first-class product requirements); Option B is disproportionate risk.

---

## 7. Content provenance and licensing (uploads reviewed)

Uploaded sources in `workspace:upload/` were inspected for this assessment:

| Source | Nature | Rights finding | Decision for this project |
|---|---|---|---|
| `جزوه جامع دهم/یازدهم/پایه دوازدهم…pdf` ("Vision One/Two/Three", Jamal Ahmadi, ed. 1401) | Teacher-authored free-distribution booklets compiling vocabulary, translations, tests; **derived from the official Iranian textbooks (Prospect/Vision series)** | Freely distributed but copyrighted by their authors; internal statement invites corrections, not redistribution rights. Underlying textbook content is owned by Iran's Ministry of Education. | **Do not commit to git; do not embed verbatim.** Use as *curriculum map* (lesson order, topic lists, grammar points are facts). Seek author permission (contact provided in the docs: Telegram `@JamalAhmadi1984`) before any verbatim reuse; otherwise author original equivalent content. |
| `جزوه هفتم/هشتم/نهم…pdf` (Dr. Hassan Lotfi, ed. 1403) | Same category for grades 7–9 (Prospect series) | Same as above (contact in docs) | Same as above. |
| `s1_Introductory.PDF`, `s2_Elementary.PDF`, `s3_Intermediate.PDF` (L. A. Hill, *Stories for Reproduction*, Oxford University Press) | Commercial graded readers | **Explicitly all-rights-reserved** (copyright page in s3: reproduction prohibited "without the prior permission of Oxford University Press") | **Design reference only.** Never embed text, audio, or exercises. Any reading-comprehension content in the app must be original or openly licensed. |

Applicable principle (user requirement #5/#6/#14 + upstream V21): official-textbook content, supplementary content, and AI-generated content must be **distinguishable at the data level**; nothing ships to learners flagged as verified textbook content without human review. The lesson schema (§4.3) carries provenance fields; the build fails if a lesson marked `human-reviewed` lacks a reviewer record.

---

## 8. Recommended architecture (summary)

```
┌──────────────────────────── Next.js App Router (TS strict, Tailwind, RTL-aware) ───────────────────────────┐
│  Shell: fa (RTL default) / en chrome · Home · Grade (7–12) · Lesson list · Progress dashboard · Teacher view │
│                                                                                                             │
│  Lesson Player route            App-native Activity Engine (typed React + Zod schema)                       │
│  ┌───────────────────────┐      ┌──────────────────────────────────────────────┐                            │
│  │ iframe → /public/books│      │ vocab flashcards/drills · grammar items      │                            │
│  │   /<grade>/<lesson>/  │      │ dialogue player · reading + questions        │                            │
│  │ (Papermorph chapter,  │◄────►│ assessment + feedback                        │                            │
│  │  vendored engine)     │ post │                                              │                            │
│  └───────────────────────┘ Msg  │ persistence: localStorage (namespaced)       │                            │
│         │  reads engine's       │ + engine's animebook:progress:* contract     │                            │
│         ▼  localStorage key    └──────────────────────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
           ▲ artifacts built ahead of time (never at runtime)                      ▲
           │                                                                       │
┌──────────┴──────────── GLM-assisted authoring pipeline (offline, CI-like) ────────┴──────────────┐
│ adapted Papermorph playbook: intake → style.json → storyboard → narration (tts.py) →             │
│ animation → lint/overlap/perf gates → teacher review → publish to public/books/                  │
│ + schema compiler: lesson.yaml/JSON → activity JSON (Zod-validated) + provenance registry        │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Stack candidates (P2 confirms versions): Next.js App Router, TypeScript strict, React, Tailwind CSS, Zod, Vitest + Playwright. No remote DB, no auth in MVP.

---

## 9. Go / No-Go decision

**GO — conditional.** The repository is real, actively maintained, MIT-licensed, and architecturally aligned with our hard requirement that lesson playback never depends on a live model (V9). The engine's quiz API, progress contract, i18n surface, and review/export tooling cover a large share of the MVP. The conditions that gate implementation:

1. **C1 (narration):** the fa-IR TTS spike (§4.2) must pass before any narrated lesson is built; otherwise ship the demo lesson with English narration + Persian text, which is pedagogically acceptable for L2 English.
2. **C2 (licensing):** no verbatim OUP or جزوه content in any commit or artifact (§7); permission requests drafted in P1.
3. **C3 (engine hygiene):** engine copies stay vendor-synced (V10); all custom styling via `lib/book.css`; RTL/i18n extensions proposed as upstream-style patches in our fork.
4. **C4 (mobile):** the mobile spike runs before the lesson-player task is marked complete (P5/P10); letterboxed fallback acceptable for MVP.
5. **C5 (scope):** one demonstration lesson is reviewed before any bulk conversion (P6 gate).

**First recommended implementation task:** roadmap task **P3.1 — Define the lesson content schema (Zod) and fixture examples**, because every later task (activities, player, authoring pipeline, provenance checks) consumes it, it is low-risk, and it forces the provenance model to become concrete early. (P2 scaffolding may run first if the approver prefers environment setup before schema; both are dependency-ordered in the roadmap.)

---

## 10. Unresolved compatibility questions (for the approver / next spike)

1. Does this sandbox have outbound network access for Edge TTS (`speech.platform.bing.com`) — and if not, is the local z-ai TTS skill acceptable as the narration source for Persian *and* English?
2. Does `fa-IR` Edge TTS emit reliable word-boundary events in `tts.py`'s streaming mode, and does the ASCII-mark convention hold for Persian sentences?
3. Will upstream accept a `fa` + RTL contribution (nice-to-have; not blocking, since we maintain a fork of `engine/` either way)?
4. Preferred font pairing for Persian UI vs English content blocks (Vazirmatn/Noto Naskh are candidates; needs design approval).
5. Is there an intended deployment target (Vercel/static host/school intranet) that constrains how `public/books/` audio assets are served?
6. Should teacher review tooling reuse the engine's `?review` notes mode as the canonical review artifact format?

---

*Report prepared in Phase 0. Implementation may not begin until the approver accepts the assessment and the roadmap at `roadmaps/interactive-english-learning-webapp.md`.*
