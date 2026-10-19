# Project Worklog — Interactive English Learning Web App

Shared multi-agent log. Append-only. Each section starts with `---`.

---
Task ID: 1 (Phase 0 + Phase 1 — initial run)
Agent: main agent (Z.ai / GLM)
Task: Inspect workspace and the actual Papermorph repository; write the assessment report and the P0–P11 roadmap; stop for approval before any implementation.

Work Log:
- Inspected workspace: /home/z/my-project is a git repo (branch `main`, 1 commit "Initial commit", NO remote configured); `.gitignore` ignores `skills/` and `node_modules/`; `upload/` holds 9 copyrighted PDFs (kept untracked); `.env` present.
- SECURITY FINDING: `git ls-files` shows `.env` IS tracked in the initial commit (contains DATABASE_URL). Flagged to user; remediation pending approval (history rewrite or ignore+revoke).
- Fetched and analyzed https://github.com/DozenTwelve/Papermorph (commit 45533ec, main): README, LICENSE (MIT), repo tree, SKILL.md (full), references/engine.md (full), scripts/tts.py, engine/check_i18n.py, engine/ + engine/vendor listings, .claude/skills/papermorph listings, GitHub metadata (790 stars, last commit 2026-10-19 SCORM-export merge).
- Verified key facts: pipeline PDF→style.json→storyboards→narration→animation+quizzes→static web book; chapter = 1600×900 SVG stage + player, beats = narration MP3 + timed actions (playback needs NO live model); engine.js 124KB vanilla JS synced per book via scripts/engine.py; quiz primitives choice/blanks/grid/tap/sorter/build(); localStorage progress key `animebook:progress:`; i18n matrix en/ru/zh/ja/de only — NO RTL/Persian; TTS = Edge TTS (network) or Kokoro (English-only word timings); ASCII-only mark names; README: "No image models, multilingual support, or BGM yet"; models tested: Opus 5.5, GPT-6.1-Sol, Sonnet 5.5 — GLM UNTESTED.
- Verified local toolchain: uv 0.13.0, ffmpeg/ffprobe 7.1.5, Python 3.12.15, Node v24.21.0, npm 11.19.0, git 2.47.3, Playwright importable — all Papermorph script prerequisites present.
- Rights review of uploads: جزوه Vision One/Two/Three (Jamal Ahmadi, 1401) and هفتم/هشتم/نهم (Dr. Hassan Lotfi, 1403) = author-copyrighted free distributions derived from Ministry-of-Education textbooks (Prospect/Vision); L.A. Hill Stories for Reproduction (OUP) = explicit all-rights-reserved → design reference only. Decisions recorded in assessment §7.
- Wrote docs/architecture/PAPERMORPH_ASSESSMENT.md (30 verified facts V1–V30, 9 limitations, reusable-component table, adaptations, R1–R8 risks, 3 integration options with trade-offs, Option C recommended, GO — conditional with gates C1–C5).
- Wrote roadmaps/interactive-english-learning-webapp.md (P0–P11, 30+ checkbox tasks each with acceptance criteria, global verification checklist, risk/fallback table, change log; P0 marked completed, everything else planned).
- Verified both files exist with expected sections (228 + 243 lines); secret-scanned docs (clean).

Stage Summary:
- Deliverables: docs/architecture/PAPERMORPH_ASSESSMENT.md (GO — conditional), roadmaps/interactive-english-learning-webapp.md.
- Decision: Option C hybrid — vendored MIT engine + iframe embed for animated chapters, app-native React activity layer (Zod schema), GLM-executed authoring playbook adapted from SKILL.md, dual localStorage progress bridge.
- Proposed first implementation task: P3.1 (lesson content schema, Zod) — alternative P2.1 (scaffold) if approver prefers.
- Open gates: C1 fa-IR TTS spike, C2 rights register, C3 engine sync hygiene, C4 mobile spike, C5 demo-review scope gate.
- Unresolved: outbound Edge-TTS network access in sandbox; fa-IR word timings; upstream fa/RTL contribution; Persian font pairing; deployment target.
- Status: STOPPED — awaiting explicit user approval before any implementation task.
