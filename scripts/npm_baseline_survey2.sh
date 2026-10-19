#!/usr/bin/env bash
# P1.3 evidence round 2 — Next-side evidence (create-next-app@16.4.2 template + deps),
# optional-peer metadata, vitest/vite relationship, max TS 5.x, max @types/node 24.x.
set -u
OUT_DIR="/home/z/my-project/tool-results"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/npm_survey2_$(date +%Y%m%d_%H%M%S).txt"
CNA_DIR="$OUT_DIR/cna_16.4.2"

{
  echo "=== create-next-app@16.4.2 dependencies (what Next's own scaffolder installs) ==="
  npm view create-next-app@16.4.2 dependencies --json 2>&1

  echo ""
  echo "=== next@16.4.2 peerDependenciesMeta (optional peers?) ==="
  npm view next@16.4.2 peerDependenciesMeta --json 2>&1

  echo ""
  echo "=== vitest@5.0.5 dependencies (is vite a direct dep?) ==="
  npm view vitest@5.0.5 dependencies --json 2>&1

  echo ""
  echo "=== vitest@5.0.5 peerDependenciesMeta ==="
  npm view vitest@5.0.5 peerDependenciesMeta --json 2>&1

  echo ""
  echo "=== max typescript 5.x ==="
  npm view 'typescript@>=5.0.0 <6.0.0' version --json 2>&1 | tail -8

  echo ""
  echo "=== max @types/node 24.x ==="
  npm view '@types/node@>=24.0.0 <25.0.0' version --json 2>&1 | tail -8

  echo ""
  echo "=== @types/node dist-tags ==="
  npm view @types/node dist-tags --json 2>&1

  echo ""
  echo "=== npm view next@16.4.2 dependencies (bundled deps incl. typescript?, postcss?) ==="
  npm view next@16.4.2 dependencies --json 2>&1
} >> "$OUT" 2>&1

# Pack create-next-app@16.4.2 and inspect its templates for the exact intended integration
rm -rf "$CNA_DIR" && mkdir -p "$CNA_DIR"
(
  cd "$CNA_DIR"
  echo "=== npm pack create-next-app@16.4.2 ===" >> "$OUT"
  npm pack create-next-app@16.4.2 --silent >> "$OUT" 2>&1
  TARBALL="$(ls | grep '^create-next-app-.*\.tgz$' | head -1)"
  if [ -n "$TARBALL" ]; then
    tar -xzf "$TARBALL"
    echo "" >> "$OUT"
    echo "=== template files of interest ===" >> "$OUT"
    find package/templates -type f \( -name 'package.json' -o -name 'eslint.config.mjs' -o -name 'tsconfig.json' -o -name 'postcss.config.mjs' \) 2>/dev/null | sort >> "$OUT" 2>&1
  fi
)

echo "SURVEY2_WRITTEN: $OUT"
