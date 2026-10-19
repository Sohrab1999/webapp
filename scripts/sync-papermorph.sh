#!/usr/bin/env bash
#
# sync-papermorph.sh — synchronize the vendored Papermorph engine to the pinned upstream revision.
#
# Modes:
#   scripts/sync-papermorph.sh             Sync vendor/ to the pinned commit (online). Validates
#                                          everything before replacing anything.
#   scripts/sync-papermorph.sh --dry-run   Full fetch + validation + staging; reports what WOULD
#                                          change; touches nothing in the working tree.
#   scripts/sync-papermorph.sh --check     Offline: verify vendored files still match
#                                          vendor/engine.manifest (CI gate / drift detector).
#   scripts/sync-papermorph.sh --help      Show this help.
#
# Safety properties:
#   - The pin lives in vendor/papermorph.pin. The script NEVER updates the pin; bumping the
#     pin is a manual, reviewed edit of that file (see docs/architecture/PAPERMORPH_VENDORING.md).
#   - Fetches by full commit SHA over public HTTPS from the canonical upstream URL only.
#     No credentials, no tokens: git credential helpers are disabled for the fetch and
#     terminal prompting is switched off.
#   - Verifies, BEFORE any replacement: the fetched revision equals the pinned SHA; the
#     upstream LICENSE and engine.py hashes equal the anchors recorded in the pin file;
#     the documented engine layout (incl. the separately licensed MathJax bundle) is present.
#   - Stages everything in a temporary directory; the vendor tree is replaced only after ALL
#     validation passes. Cleanup happens on every exit path.
#   - Never executes code downloaded from upstream (files are copied, not run).
#   - Deletes exactly one directory — vendor/engine — after validating that the pin file
#     points there; writes nothing outside the repository or the temp directory.
#   - Idempotent: at an unchanged pin, a second successful run produces zero git diff.

set -euo pipefail
export LC_ALL=C

# --- repo root (script must live at <root>/scripts/) -------------------------
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
cd -- "$REPO_ROOT"

PIN_FILE="vendor/papermorph.pin"
REQUIRED_PIN_KEYS=(
  UPSTREAM_URL UPSTREAM_COMMIT VENDOR_DIR VENDOR_ENGINE_PY VENDOR_LICENSE VENDOR_MANIFEST
  LICENSE_SHA256 ENGINE_PY_SHA256
)
# The exact engine/ inventory at the pinned revision (guards against upstream layout drift).
EXPECTED_ENGINE_FILES=(
  engine/engine.js engine/engine.css
  engine/contents.js engine/contents.css
  engine/units.js engine/units.css
  engine/volume.js engine/volume.css
  engine/book.css
  engine/check_i18n.py engine/check_latex.py engine/check_volume.py
  engine/vendor/mathjax/tex-svg-full.js
  engine/vendor/mathjax/LICENSE
  engine/vendor/mathjax/README.md
)
UPSTREAM_ENGINE_PY=".claude/skills/papermorph/scripts/engine.py"

die() { printf 'error: %s\n' "$1" >&2; exit 1; }
info() { printf '%s\n' "$1"; }

usage() { sed -n '2,20p' "${BASH_SOURCE[0]}"; exit 0; }
[ "${1:-}" = "--help" ] && usage

MODE="sync"
case "${1:-}" in
  "")        MODE="sync" ;;
  --dry-run) MODE="dry-run" ;;
  --check)   MODE="check" ;;
  *) die "unknown option '${1}' (use --help)" ;;
esac
[ $# -le 1 ] || die "unexpected extra arguments (use --help)"

# --- pin file parsing ---------------------------------------------------------
[ -f "$PIN_FILE" ] || die "pin file not found: $PIN_FILE"

pin_value() { # pin_value KEY -> prints the value of KEY from the pin file
  local key="$1" value
  value="$(sed -n -E "s/^${key}=(.*)$/\1/p" "$PIN_FILE" | tail -n 1)"
  [ -n "$value" ] || die "pin file ${PIN_FILE} is missing required key ${key}"
  printf '%s\n' "$value"
}

UPSTREAM_URL="$(pin_value UPSTREAM_URL)"
UPSTREAM_COMMIT="$(pin_value UPSTREAM_COMMIT)"
VENDOR_DIR="$(pin_value VENDOR_DIR)"
VENDOR_ENGINE_PY="$(pin_value VENDOR_ENGINE_PY)"
VENDOR_LICENSE="$(pin_value VENDOR_LICENSE)"
VENDOR_MANIFEST="$(pin_value VENDOR_MANIFEST)"
LICENSE_SHA256="$(pin_value LICENSE_SHA256)"
ENGINE_PY_SHA256="$(pin_value ENGINE_PY_SHA256)"

# --- pin value validation (path-safety critical) ------------------------------
is_sha1()  { [[ "$1" =~ ^[0-9a-f]{40}$ ]]; }
is_sha256(){ [[ "$1" =~ ^[0-9a-f]{64}$ ]]; }

is_sha1 "$UPSTREAM_COMMIT" || die "UPSTREAM_COMMIT must be a 40-hex commit SHA, got '${UPSTREAM_COMMIT}'"
is_sha256 "$LICENSE_SHA256" || die "LICENSE_SHA256 must be a 64-hex sha256 digest"
is_sha256 "$ENGINE_PY_SHA256" || die "ENGINE_PY_SHA256 must be a 64-hex sha256 digest"
[[ "$UPSTREAM_URL" =~ ^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] \
  || die "UPSTREAM_URL must be a canonical https://github.com/OWNER/REPO URL, got '${UPSTREAM_URL}'"

# Hard path expectations: a tampered or mistaken pin must not redirect deletions/writes.
for path_spec in "$VENDOR_DIR:vendor/engine" "$VENDOR_ENGINE_PY:vendor/engine.py" \
                 "$VENDOR_LICENSE:vendor/LICENSE" "$VENDOR_MANIFEST:vendor/engine.manifest"; do
  path="${path_spec%%:*}"; expected="${path_spec##*:}"
  [ "$path" = "$expected" ] || die "pin key points to '${path}' but this script only operates on '${expected}'"
done
for path in "$VENDOR_DIR" "$VENDOR_ENGINE_PY" "$VENDOR_LICENSE" "$VENDOR_MANIFEST"; do
  case "$path" in
    /*|*..*|*" "*) die "unsafe vendor path in pin file: '${path}'" ;;
  esac
  real="$(realpath -m -- "$path")"
  case "$real" in
    "$REPO_ROOT"/*) ;;  # inside the repo: fine
    *) die "vendor path '${path}' resolves outside the repository (${real})" ;;
  esac
done

# --- manifest generation (shared by all modes) --------------------------------
# Output format is location-independent: engine files as ./<relpath>, engine.py
# and LICENSE as bare names — so staged trees compare equal to the committed
# manifest regardless of the temporary directory they were built in.
build_manifest() { # build_manifest ENGINE_DIR ENGINE_PY LICENSE -> prints manifest lines
  local engine_dir="$1" engine_py="$2" license="$3"
  ( cd -- "$engine_dir" && find . -type f -print0 | sort -z | xargs -0 sha256sum )
  ( cd -- "$(dirname -- "$engine_py")" && sha256sum -- "$(basename -- "$engine_py")" "$(basename -- "$license")" )
}

# --- mode: --check (offline drift detection) ----------------------------------
if [ "$MODE" = "check" ]; then
  [ -d "$VENDOR_DIR" ] || die "vendored engine directory not found: ${VENDOR_DIR} (run the sync first)"
  [ -f "$VENDOR_MANIFEST" ] || die "manifest not found: ${VENDOR_MANIFEST} (run the sync first)"

  current="$(build_manifest "$VENDOR_DIR" "$VENDOR_ENGINE_PY" "$VENDOR_LICENSE")" \
    || die "failed to hash the vendored tree"
  # The manifest stores engine.py/LICENSE relative to vendor/; normalize current output the same way.
  diff_out="$(printf '%s\n' "$current" | diff -u "$VENDOR_MANIFEST" - || true)"
  if [ -n "$diff_out" ]; then
    echo "$diff_out" >&2
    die "vendored tree does NOT match ${VENDOR_MANIFEST} — local drift detected (see diff above; run the sync to restore the pinned revision)"
  fi
  actual_license="$(sha256sum -- "$VENDOR_LICENSE" | cut -d' ' -f1)"
  actual_engine_py="$(sha256sum -- "$VENDOR_ENGINE_PY" | cut -d' ' -f1)"
  [ "$actual_license" = "$LICENSE_SHA256" ] || die "vendored LICENSE hash drifted from the pin anchor"
  [ "$actual_engine_py" = "$ENGINE_PY_SHA256" ] || die "vendored engine.py hash drifted from the pin anchor"
  info "ok: vendored Papermorph tree matches the manifest ($(wc -l < "$VENDOR_MANIFEST" | tr -d ' ') files) and the pin anchors (${UPSTREAM_COMMIT:0:12})"
  exit 0
fi

# --- modes: sync / dry-run (online) --------------------------------------------
TMP="$(mktemp -d "${TMPDIR:-/tmp}/papermorph-sync.XXXXXX")"
trap 'rm -rf -- "$TMP"' EXIT
UP="$TMP/up"
STAGE="$TMP/stage"
mkdir -p -- "$STAGE"

info "fetching ${UPSTREAM_URL} at pinned commit ${UPSTREAM_COMMIT} (no credentials, no prompts)…"
if ! git -c init.defaultBranch=main init --quiet -- "$UP"; then
  die "could not initialize a temporary git repository in ${TMP}"
fi
git -C "$UP" remote add origin "$UPSTREAM_URL"
GIT_TERMINAL_PROMPT=0
export GIT_TERMINAL_PROMPT
# `credential.helper=` (empty value) disables ALL credential helpers, including any configured
# in this environment: the pinned upstream is public and must be fetched anonymously.
if ! git -C "$UP" -c credential.helper= fetch --quiet --depth 1 --filter=blob:none origin "$UPSTREAM_COMMIT" 2>"$TMP/fetch.err"; then
  sed 's/^/  /' "$TMP/fetch.err" >&2
  die "could not fetch the pinned commit ${UPSTREAM_COMMIT} from ${UPSTREAM_URL} (network failure, or the commit is no longer reachable — do NOT change the pin without review)"
fi
resolved="$(git -C "$UP" rev-parse FETCH_HEAD)"
if [ "$resolved" != "$UPSTREAM_COMMIT" ]; then
  die "revision mismatch: upstream resolved to ${resolved} but the pin records ${UPSTREAM_COMMIT}"
fi
info "ok: fetched revision matches the pinned SHA"

if ! git -C "$UP" checkout --quiet FETCH_HEAD -- engine LICENSE "$UPSTREAM_ENGINE_PY" 2>"$TMP/checkout.err"; then
  sed 's/^/  /' "$TMP/checkout.err" >&2
  die "pinned commit ${UPSTREAM_COMMIT} does not contain the documented engine layout (engine/, LICENSE, ${UPSTREAM_ENGINE_PY}) — upstream structure changed; manual review required"
fi

# --- validation of the fetched content (before ANY replacement) ---------------
for rel in "${EXPECTED_ENGINE_FILES[@]}"; do
  [ -f "$UP/$rel" ] || die "expected engine file missing at the pinned revision: ${rel} — upstream layout changed; manual review required"
done

fetched_license_hash="$(sha256sum -- "$UP/LICENSE" | cut -d' ' -f1)"
[ "$fetched_license_hash" = "$LICENSE_SHA256" ] \
  || die "upstream LICENSE at the pinned revision hashes to ${fetched_license_hash}, but the pin records ${LICENSE_SHA256} — the license changed unexpectedly; manual review required"
fetched_engine_py_hash="$(sha256sum -- "$UP/$UPSTREAM_ENGINE_PY" | cut -d' ' -f1)"
[ "$fetched_engine_py_hash" = "$ENGINE_PY_SHA256" ] \
  || die "upstream engine.py at the pinned revision hashes to ${fetched_engine_py_hash}, but the pin records ${ENGINE_PY_SHA256} — stale pin anchors; manual review required"

if command -v python3 >/dev/null 2>&1; then
  # Compile-only sanity gate: py_compile translates to bytecode WITHOUT executing the file.
  python3 -m py_compile "$UP/$UPSTREAM_ENGINE_PY" 2>"$TMP/py.err" \
    || { sed 's/^/  /' "$TMP/py.err" >&2; die "upstream engine.py at the pinned revision does not compile; manual review required"; }
else
  info "note: python3 not found — skipped the compile sanity check for engine.py"
fi

# --- stage the candidate tree ---------------------------------------------------
cp -a -- "$UP/engine" "$STAGE/engine"
cp -a -- "$UP/$UPSTREAM_ENGINE_PY" "$STAGE/engine.py"
cp -a -- "$UP/LICENSE" "$STAGE/LICENSE"
staged_manifest="$(build_manifest "$STAGE/engine" "$STAGE/engine.py" "$STAGE/LICENSE")" \
  || die "failed to hash the staged tree"

# Compare the staged candidate against the CURRENT vendored tree — not the manifest.
# The manifest is the --check drift detector; the sync decision must reflect what
# would actually change on disk (e.g. a locally drifted vendor tree must be repaired
# even though the manifest still holds the original pinned hashes).
if [ -d "$VENDOR_DIR" ]; then
  current_manifest="$(build_manifest "$VENDOR_DIR" "$VENDOR_ENGINE_PY" "$VENDOR_LICENSE")" \
    || die "failed to hash the current vendored tree"
else
  current_manifest=""
fi
manifest_diff="$(printf '%s\n' "$staged_manifest" | diff -u <(printf '%s\n' "$current_manifest") - || true)"

if [ -z "$manifest_diff" ]; then
  info "ok: staged tree is identical to the currently vendored tree (pin ${UPSTREAM_COMMIT:0:12}) — nothing to do"
  exit 0
fi

changed="$(printf '%s\n' "$manifest_diff" | grep -cE '^[+-][[:space:]]*[0-9a-f]{64} ' || true)"
info "staged tree differs from the vendored tree in ${changed} manifest entry lines:"
printf '%s\n' "$manifest_diff" | grep -E '^[+-][[:space:]]*[0-9a-f]{64} ' | sed 's/^/  /' || true

if [ "$MODE" = "dry-run" ]; then
  info "dry-run complete: nothing was modified (validation succeeded; ${changed} file(s) would change on a real sync)"
  exit 0
fi

# --- destructive step (sync mode only, all validation passed) -------------------
rm -rf -- "$VENDOR_DIR"
cp -a -- "$STAGE/engine" "$VENDOR_DIR"
cp -a -- "$STAGE/engine.py" "$VENDOR_ENGINE_PY"
cp -a -- "$STAGE/LICENSE" "$VENDOR_LICENSE"
printf '%s\n' "$staged_manifest" > "$VENDOR_MANIFEST"

info "ok: vendored Papermorph synchronized to ${UPSTREAM_COMMIT:0:12} (${UPSTREAM_URL})"
info "next: review 'git diff vendor/' and commit the result; the pin file is never touched by this script"
