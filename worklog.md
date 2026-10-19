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

---
Task ID: 2 (user-directed: GitHub setup, .env security remediation, verified push)
Agent: main agent (Z.ai / GLM)
Task: Connect the repo to GitHub (Sohrab1999/webapp) with a securely handled PAT; audit and remediate `.env` tracking; establish the mandatory commit-and-push policy; push verified commits; stop before any feature work (no P3.1, no scaffolding).

Work Log:
- Inspected git state: branch `main`, 3 commits (b913648 "Initial commit", 00fc28f "docs: Phase 0/1", 252fe4d = environment auto-checkpoint with UUID subject, 2026-10-19 15:53 UTC), NO remote, identity `Z User <z@container>`, working tree clean, no stash, no signing config.
- DISCREPANCY FOUND & INVESTIGATED: commit 252fe4d silently ADDED 9 copyrighted source PDFs (~64 MB total) to Git tracking, contradicting Task 1's record that upload/ was kept untracked. Confirmed via `git show --stat 252fe4d` (9 files, Bin 0 -> ...).
- SECURITY AUDIT of `.env` (key names/heuristics only — values never printed): single key `DATABASE_URL`, blob 769ebf2 unchanged since b913648; value is `file:` local SQLite path with NO user/password/host segment. VERDICT: no live credential ever committed → NO rotation required. Pattern scan: `github_pat_` occurrences across ALL history = 0; only env-like file ever committed = `.env`.
- Token handling: user-provided fine-grained PAT stored at `/home/z/.secrets/gh.pat` (0600, OUTSIDE any repo); git credential helper `/home/z/.secrets/git-credential-ghpat.sh` (0700) configured via `git config --global credential.helper <path>` (path only, no secret in config); curl bearer header at `/home/z/.secrets/gh.header` (0600). Token never appears in remote URL, git config, command output, diffs, commits, or reports.
- GitHub API verification (`scripts/gh_check.sh`): GET /user → login `Sohrab1999`; GET /repos/Sohrab1999/webapp → **private**, default_branch `main`, token perms {admin, maintain, push, triage, pull} (push OK); unauthenticated GET → 403 (confirms private). `git ls-remote` (pre-remote) exited 0 with zero refs → remote repo EMPTY → plain push safe, no force needed.
- Remediation commit `91c9e9f` (security): `git rm --cached .env` (local file preserved on disk), `.gitignore` += `.env`/`.env.*` with `!.env.example`, added placeholder-only `.env.example`. Verified: only `.env.example` tracked afterwards; `.env` still present locally.
- Remediation commit `b9a1fe3` (licensing): `git rm -r --cached upload/` (9 PDFs untracked, local copies preserved), `.gitignore` += `upload/`. Commit message documents affected works (Ahmadi Vision 1–3, Lotfi grades 7–9, OUP L.A. Hill — all rights reserved) and that historical blobs remain in 252fe4d; history rewrite NOT performed (requires explicit owner approval).
- Pre-push scan: `github_pat_` across all trees = 0; pushed tip tree = `.env.example`, `.gitignore`, docs/architecture/PAPERMORPH_ASSESSMENT.md, download/README.md, roadmaps/interactive-english-learning-webapp.md, worklog.md only.
- Remote configured: `origin = https://github.com/Sohrab1999/webapp.git` (clean URL, no credentials). Pushed `main` (new branch, no force, `-u` upstream set).
- PUSH VERIFIED INDEPENDENTLY: `git ls-remote origin refs/heads/main` → `b9a1fe3f6366ed800b77163ab8f626c0c4c85ef0` == local HEAD. Upstream tracking `main...origin/main` in sync.
- Updated roadmap: header date, §5.6 mandatory commit-and-push policy, P1.2 AC note (early tip-level untracking), §7 change log row, footer (next proposed task + standing notes). Appended this worklog section.
- Committed docs+tooling update (includes `scripts/gh_check.sh`, no secrets) and re-pushed; re-verified hash equality via ls-remote (final hash recorded in Stage Summary).

Stage Summary:
- Remote: https://github.com/Sohrab1999/webapp.git (PRIVATE) — branch `main`; the docs/tooling commit containing this log entry is the tip at report time; its hash is independently verified equal to remote `refs/heads/main` before reporting (see final report to owner).
- `.env` remediation: DONE — untracked, ignored, `.env.example` template committed. No credential rotation needed (no live credential existed; committed value is a non-secret local SQLite path).
- Copyrighted PDFs: untracked at tip, local copies preserved (upload/). Historical blobs remain in 252fe4d — optional history cleanup available ONLY as an owner-approved separate task. Recommendation: keep repo private until/if that decision is made.
- Workflow policy in force (roadmap §5.6): one task per approval cycle → verify → diff review → commit → push → ls-remote hash verification → report → STOP.
- Status: STOPPED — awaiting approval; recommended next task: P1.1 (ratify Option C + gates C1–C5), then P3.1 as first implementation task per approver's stated intent.

---
Task ID: 3 (P1.1 ratification — record decision, operationalize gates C1–C5, verify & push docs)
Agent: main agent (Z.ai / GLM)
Task: Owner ratified Option C subject to gates C1–C5. Convert every gate into explicit, testable acceptance criteria with documented pass/fail status; keep verified facts / assumptions / unresolved decisions distinct; update the existing roadmap + worklog IN PLACE (no duplicate documents); NO P3.1, no scaffolding, no product features; commit, push, verify remote hash; report and stop.

Work Log:
- Pre-flight: working tree clean; local HEAD == origin/main == 5eebb97b84e360ecee55e67af6b37feae24a57cf (verified before edits).
- Re-read assessment §9 (exact gate definitions), §7 (rights table), §10 (unresolved questions), and facts V9/V10/V13/V20/V21/V24/V25/V26/V27 to cite sources precisely.
- Roadmap updated IN PLACE (no new documents created):
  - §2: ratification banner — Option C adopted subject to C1–C5; gate failure triggers §6 fallback, not architecture redesign.
  - P1.1 checkbox → [x] with ratification evidence and pointer to §5.1.
  - NEW §5.1 (single source of truth for gate status): per-gate testable criteria — C1 0/6 UNTESTED; C2 1/5 PARTIAL (only criterion with executed evidence: tip-level zero-copyrighted-files, verified via 91c9e9f+b9a1fe3 pre-push `git ls-files` listing); C3 0/5 UNTESTED; C4 0/3 UNTESTED; C5 0/3 NOT REACHED. Rule encoded: no criterion PASS without recorded output/artifact; no gate passes with a PENDING criterion.
  - Per gate: verified-fact evidence (V-refs), assumptions (explicitly labelled unverified), unresolved questions (assessment §10.x), and the on-FAIL fallback (R2/R3/R6) kept as separate labelled lines.
  - §7 change log: P1.1 row added. Footer: next proposed task = P1.2; standing notes extended (gate statuses change only with recorded evidence).
- Explicitly NOT claimed (owner constraint honored): Persian TTS viability (no Edge TTS probe was run in this task — C1 untouched), mobile compatibility (C4 untouched), Papermorph/GLM authoring compatibility (V26: GLM absent upstream; V27 flagged UNVERIFIED-in-practice until the P9.4 experiment).
- No product code, no scaffolding, no P3.1, no new roadmap documents; only roadmaps/interactive-english-learning-webapp.md + worklog.md changed.
- Diff review + secret scan (token prefix + fragment) on staged changes: clean (0 matches).
- Commit `docs(P1.1): …` pushed to origin/main; VERIFIED via `git ls-remote origin refs/heads/main` == local HEAD (hash in final report to owner).

Stage Summary:
- P1.1 complete, verified, pushed. §5.1 is now the authoritative gate register; C2 advanced to PARTIAL (1/5) with cited evidence; all other gates untouched/untested.
- Unresolved items that FUTURE tasks must close (not blockers for this docs task): Edge TTS reachability + fa-IR word timings (C1, at P6.2); rights register + permission drafts + automated scan (C2, at P1.2/P2.4); vendor/sync execution + red-test (C3, at P2.3); mobile thresholds + measurement (C4, at P5.5); reviewer identity + checklist (C5, at P6.4/P6.5).
- Status: STOPPED — recommended next task: P1.2 (rights register + permission request drafts; advances C2; documentation only).
