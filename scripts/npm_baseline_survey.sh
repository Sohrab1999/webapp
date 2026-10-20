#!/usr/bin/env bash
# P1.3 evidence gathering — query npm registry for actual latest stable versions,
# engines, and peerDependencies of candidate baseline packages.
# Output: /home/z/my-project/tool-results/npm_survey_<ts>.txt
set -u
OUT_DIR="/home/z/my-project/tool-results"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/npm_survey_$(date +%Y%m%d_%H%M%S).txt"

PKGS=(
  next
  react
  react-dom
  typescript
  tailwindcss
  @tailwindcss/postcss
  zod
  vitest
  @playwright/test
  eslint
  eslint-config-next
  @types/react
  @types/react-dom
)

{
  echo "=== npm/node runtime ==="
  node --version
  npm --version
  npm config get registry

  for p in "${PKGS[@]}"; do
    echo ""
    echo "=== $p ==="
    echo "--- dist-tags.latest ---"
    npm view "$p" version 2>&1
    echo "--- engines ---"
    npm view "$p" engines 2>&1
    echo "--- peerDependencies ---"
    npm view "$p" peerDependencies 2>&1
  done

  echo ""
  echo "=== next@latest cross-checks ==="
  NEXTV="$(npm view next version 2>/dev/null)"
  echo "next=$NEXTV"
  echo "--- next peerDependencies (full) ---"
  npm view "next@$NEXTV" peerDependencies --json 2>&1
  echo "--- eslint-config-next@$NEXTV peerDependencies + version match check ---"
  npm view "eslint-config-next@$NEXTV" version peerDependencies --json 2>&1
  echo "--- react dist-tags ---"
  npm view react dist-tags --json 2>&1
  echo "--- next dist-tags ---"
  npm view next dist-tags --json 2>&1
  echo "--- tailwindcss dist-tags ---"
  npm view tailwindcss dist-tags --json 2>&1
  echo "--- @tailwindcss/postcss@latest peerDependencies --json ---"
  npm view "@tailwindcss/postcss@latest" peerDependencies --json 2>&1
  echo "--- vitest dist-tags ---"
  npm view vitest dist-tags --json 2>&1
  echo "--- @playwright/test dist-tags ---"
  npm view @playwright/test dist-tags --json 2>&1
  echo "--- zod dist-tags ---"
  npm view zod dist-tags --json 2>&1
  echo "--- typescript dist-tags ---"
  npm view typescript dist-tags --json 2>&1
  echo "--- eslint dist-tags ---"
  npm view eslint dist-tags --json 2>&1
} >> "$OUT" 2>&1

echo "SURVEY_WRITTEN: $OUT"
