# Third-Party Notices

This file records the third-party software vendored into this repository, the
upstream revisions it was taken from, and the license notices those licenses
require to be reproduced. It is **not** a complete software bill of materials
for the whole dependency tree — the npm dependency baseline is documented in
`package.json` / `package-lock.json` (pinned at roadmap task P1.3), and
bundled webfonts are documented in `README.md` (SIL OFL 1.1, license texts
shipped alongside the font files).

## Papermorph engine

| | |
|---|---|
| **Project** | Papermorph — "A Skill that turns PDFs into animated interactive web books" (the lesson/player engine and its self-check scripts) |
| **Canonical upstream** | https://github.com/DozenTwelve/Papermorph |
| **Pinned revision** | No release tags exist upstream (verified 2026-10-20 via `git ls-remote` and the GitHub releases page); pinned therefore by immutable commit SHA |
| **Pinned commit** | `45533ecaf3e6b0b944499126434bd7f28cd39710` (2026-10-19, "Merge pull request #12 from titulartarantula/feat/scorm-export") |
| **Vendored path** | `vendor/engine/` (engine assets), `vendor/engine.py` (upstream sync/check tool, taken from `.claude/skills/papermorph/scripts/engine.py` at the same commit), `vendor/LICENSE` (copy of the upstream MIT license) |
| **License** | MIT (upstream root `LICENSE`, reproduced verbatim below and shipped verbatim at `vendor/LICENSE`) |
| **Copyright** | `Copyright (c) 2026 TedKaczynski` |
| **Local modifications** | None — files are byte-identical to the pinned upstream revision (enforced by `vendor/engine.manifest` + `scripts/sync-papermorph.sh --check`) |
| **Provenance record** | `docs/architecture/PAPERMORPH_VENDORING.md`; pin source of truth: `vendor/papermorph.pin` |

### Papermorph license text (verbatim from upstream `LICENSE` at the pinned commit)

```text
MIT License

Copyright (c) 2026 TedKaczynski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Separately licensed component inside the vendored scope

**MathJax** — vendored inside the engine at `vendor/engine/vendor/mathjax/`:

- Files: `tex-svg-full.js` (2,275,113 B), `LICENSE`, `README.md`.
- License: **Apache License 2.0** — *not* covered by the upstream MIT notice.
  The Apache-2.0 license text is shipped **verbatim** (unmodified, as
  distributed by upstream) at `vendor/engine/vendor/mathjax/LICENSE`
  (sha256 `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`).
- Upstream provenance: the unmodified `es5/tex-svg-full.js` from npm
  `mathjax@3.2.2`; upstream documents this (with checksums) in
  `vendor/engine/vendor/mathjax/README.md` at the pinned commit.
- Used only when a book requests LaTeX via the engine's `--latex` option;
  loading it is optional per book.

The engine's remaining files (`engine.js`, `engine.css`, `contents.js/.css`,
`units.js/.css`, `volume.js/.css`, `book.css`, `check_i18n.py`,
`check_latex.py`, `check_volume.py`) carry no separate license notices and are
covered by the MIT notice above.

## Application-owned code in the vendor area

These files live under `vendor/` for locality but are **project-owned**, not
upstream code:

- `vendor/papermorph.pin` — machine-readable pin record (single source of
  truth for the sync script).
- `vendor/engine.manifest` — sha256 manifest of the vendored files, used by
  `scripts/sync-papermorph.sh --check` to detect any local drift.

Project-specific wrappers and scripts (e.g. `scripts/sync-papermorph.sh`)
live outside the vendored upstream tree.
