# Papermorph Vendoring — Provenance and Sync Guide

| | |
|---|---|
| **Document** | Provenance record for the vendored Papermorph engine (roadmap task P2.3, gate C3) |
| **Upstream** | https://github.com/DozenTwelve/Papermorph |
| **Pinned commit** | `45533ecaf3e6b0b944499126434bd7f28cd39710` (2026-10-19, "Merge pull request #12 from titulartarantula/feat/scorm-export") |
| **License** | MIT (upstream root `LICENSE`); the bundled MathJax is separately licensed Apache-2.0 — see `THIRD_PARTY_NOTICES.md` |
| **Scope note** | P2.3 establishes the third-party source boundary **only**. Application integration (iframe embed, postMessage bridge, playback controller, lesson rendering) is out of scope and lands at P5.x. |

## 1. Why the engine is vendored

The approved architecture (Option C, `PAPERMORPH_ASSESSMENT.md` §8/§9) reuses Papermorph's
player engine — deterministic, offline-safe playback, quiz primitives, captions, progress,
review mode — as a **vendored, unmodified asset** (assessment V10). Vendoring keeps lesson
playback independent of any live network or GLM call, and preserves upstream's own sync
model: engine copies are never hand-edited; fixes happen upstream (or as upstream-shaped
patches in our fork) and are synced by tooling, not by humans (risk R4, gate C3).

## 2. What is vendored, and where

| Path | Origin at the pinned commit | Status |
|---|---|---|
| `vendor/engine/` (15 files: `engine.js/css`, `contents.js/css`, `units.js/css`, `volume.js/css`, `book.css`, `check_i18n.py`, `check_latex.py`, `check_volume.py`, `vendor/mathjax/{tex-svg-full.js,LICENSE,README.md}`) | upstream `engine/` | **Byte-identical**, unmodified |
| `vendor/engine.py` | upstream `.claude/skills/papermorph/scripts/engine.py` | **Byte-identical**, unmodified |
| `vendor/LICENSE` | upstream root `LICENSE` (MIT) | Verbatim copy |

Not vendored (deliberately): the `.claude/skills/` authoring playbook (adapted by a later
GLM-authoring task, P6.1), `site/` example books, `img/` README media, and everything else
in the upstream tree. MathJax (`engine/vendor/mathjax/`, 2,275,113 B `tex-svg-full.js`) **is**
part of the vendored engine distribution because excluding it would break byte-identity of
`vendor/engine/` against upstream; it is optional at runtime (only books that request LaTeX
load it) and carries its own Apache-2.0 license text verbatim inside the directory.

**Byte-identity is enforced, not assumed:** `.gitattributes` marks all vendored paths
`-text` (no line-ending conversion on any OS, mirroring upstream's own hygiene for
`engine/vendor/**`), and `vendor/engine.manifest` records the sha256 of every vendored file.

**Boundary rule:** inside `vendor/`, everything except `vendor/papermorph.pin` and
`vendor/engine.manifest` is unmodified upstream code. Project-owned wrappers live outside
(`scripts/sync-papermorph.sh`). Do not edit files under `vendor/engine/` or
`vendor/engine.py` by hand — ever.

## 3. Version pinning

`vendor/papermorph.pin` is the machine-readable single source of truth:

- `UPSTREAM_URL=https://github.com/DozenTwelve/Papermorph`
- `UPSTREAM_COMMIT=45533ecaf3e6b0b944499126434bd7f28cd39710` — the immutable revision the
  approved architecture assessment was verified against (assessment header, checked
  2026-10-19; still upstream `main` tip when pinned on 2026-10-20).
- `UPSTREAM_TAG=none` — upstream has **no release tags** (verified via `git ls-remote`:
  only `main`, `develop`, PR refs; the GitHub releases page shows none). A moving branch is
  never used as a pin; the commit SHA is the pin. If upstream starts publishing tags, a
  future pin update may record one **in addition to** the SHA.
- Integrity anchors: sha256 of upstream `LICENSE` and `engine.py` at the pin.

## 4. Synchronizing (the sync script)

```bash
scripts/sync-papermorph.sh             # sync vendor/ to the pinned commit (online)
scripts/sync-papermorph.sh --dry-run   # full fetch + validation, changes nothing
scripts/sync-papermorph.sh --check     # offline drift check: vendored tree vs manifest
```

The script fetches the pinned commit by full SHA from the canonical URL (anonymous
HTTPS; credential helpers disabled; no tokens), verifies the resolved revision, the
license/engine.py hash anchors, and the documented engine layout **before** replacing
anything, stages the candidate in a temp dir, and only then replaces `vendor/engine/`,
`vendor/engine.py`, `vendor/LICENSE` and rewrites the manifest. It never runs code from
upstream, never writes outside the repo, deletes exactly one validated directory, and
never updates the pin by itself. At an unchanged pin it is idempotent.

**Checking book copies** (the upstream tool's own job — used from P5.x onward, when books
exist under `public/books/`):

```bash
python3 vendor/engine.py --from vendor/engine public/books/<book> --check
```

`--from vendor/engine` is always passed explicitly so the tool never silently falls back
to its built-in default (`DozenTwelve/Papermorph@main`, a moving branch).

## 5. Reviewing upstream updates

1. Inspect the upstream history (`git ls-remote`, release notes, diff between commits).
   There are no tags, so compare candidate commit SHAs directly.
2. Verify licensing first: new files may carry separate notices (MathJax is the precedent).
3. Edit `vendor/papermorph.pin`: new `UPSTREAM_COMMIT` (+ date/subject), refreshed
   `LICENSE_SHA256` / `ENGINE_PY_SHA256` anchors. This diff **is** the review artifact.
4. Run `scripts/sync-papermorph.sh --dry-run`, review the reported manifest diff, then run
   the real sync and commit the result in one focused commit.
5. If any fork patches exist (see §6), confirm they still apply; update them and re-list
   them in `THIRD_PARTY_NOTICES.md`.

Changes that must be reviewed manually (the script hard-fails and asks for review):
license text/hash changes, missing engine files, upstream layout changes, unreachable
pinned commit, or a pin file that points outside the documented vendor paths.

## 6. Fork-patch policy (gate C3, exercised from P5.6)

When we need engine changes (e.g. Persian UI strings / RTL `book.css` overrides for
embedded books, roadmap P5.6), they are applied as **upstream-shaped patches** kept
outside `vendor/engine/`, listed in `THIRD_PARTY_NOTICES.md`, and re-appliable after
every sync. They are never merged into the vendored tree. At the P2.3 pin **no fork
patches exist yet**; this section records the policy that C3 criterion 5 will be checked
against when the first patch lands.

## 7. Verification performed at vendoring time (2026-10-20)

- Vendored files byte-identical to a full clone checked out at the pinned commit
  (`diff -r` clean) and to a sparse fetch-by-SHA (the mechanism the sync script uses).
- `scripts/sync-papermorph.sh --check` → exit 0 (17 files + pin anchors).
- `--dry-run` → fetch, revision match, "nothing to do", exit 0.
- Red test (project side): injected edit into `vendor/engine/engine.js` → `--check`
  exit 1 with the exact hash diff; real sync repaired it; two further syncs "nothing to
  do" (idempotent).
- Red test (upstream side): fixture book with an edited `lib/engine.js` →
  `python3 vendor/engine.py --from vendor/engine <book> --check` exit 1; re-sync repaired.
- Pin-tamper test: `VENDOR_DIR` pointed elsewhere → script refuses (exit 1).
- MathJax checksums cross-verified against upstream's own `vendor/mathjax/README.md`
  (`a4354ff9…` for `tex-svg-full.js`, `cfc7749b…` for its Apache-2.0 `LICENSE`).
