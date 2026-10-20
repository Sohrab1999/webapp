#!/usr/bin/env bash
# P1.3 verification battery — run AFTER npm install; results captured to tool-results/.
set -u
cd /home/z/my-project
OUT_DIR="/home/z/my-project/tool-results"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/p13_verification_$(date +%Y%m%d_%H%M%S).txt"

{
  echo "==============================================================="
  echo "P1.3 VERIFICATION — $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
  echo "==============================================================="

  echo ""
  echo "=== [V1] Runtime ==="
  node --version
  npm --version
  npm config get registry

  echo ""
  echo "=== [V2] Manifest (pinned direct deps) ==="
  node -e "const p=require('./package.json'); console.log(JSON.stringify({dependencies:p.dependencies, devDependencies:p.devDependencies, engines:p.engines, packageManager:p.packageManager}, null, 2))"

  echo ""
  echo "=== [V3] Lockfile header ==="
  node -e "const l=require('./package-lock.json'); console.log('lockfileVersion:', l.lockfileVersion, '| name:', l.name, '| manifest deps:', Object.keys(l.packages['']?.dependencies||{}).join(','), '| manifest devDeps:', Object.keys(l.packages['']?.devDependencies||{}).join(','))"

  echo ""
  echo "=== [V4] npm ls --all (full dependency tree; exit code recorded) ==="
  npm ls --all > "$OUT_DIR/p13_tree.txt" 2>&1
  echo "npm ls --all exit code: $?"
  echo "--- problem markers in tree output (UNMET/INVALID/peer warnings) ---"
  if rg -n "UNMET|INVALID|npm warn" "$OUT_DIR/p13_tree.txt" > "$OUT_DIR/p13_problems.txt" 2>/dev/null; then
    cat "$OUT_DIR/p13_problems.txt"
  else
    echo "NONE — no UNMET/INVALID/warning markers in full tree listing"
  fi

  echo ""
  echo "=== [V5] Resolved versions of pinned packages (npm ls depth=0) ==="
  npm ls --depth=0 2>&1

  echo ""
  echo "=== [V6] Engine satisfaction cross-check (declared engines vs runtime) ==="
  node -e "
  const fs=require('fs');
  const semverLt=(a,b)=>{const pa=a.split('.').map(Number),pb=b.split('.').map(Number);for(let i=0;i<3;i++){if((pa[i]||0)!==(pb[i]||0))return (pa[i]||0)<(pb[i]||0);}return false;};
  const nodeV=process.versions.node;
  console.log('runtime node:', nodeV);
  for(const name of ['next','react','react-dom','zod','typescript','tailwindcss','@tailwindcss/turbopack','eslint','eslint-config-next','vitest','vite','@playwright/test','@types/node','@types/react','@types/react-dom']){
    const pj=JSON.parse(fs.readFileSync('node_modules/'+name+'/package.json','utf8'));
    const eng=pj.engines&&pj.engines.node?pj.engines.node:'(none declared)';
    console.log(name.padEnd(24), pj.version.padEnd(10), 'engines.node:', eng);
  }
  "

  echo ""
  echo "=== [V7] Tool executables ==="
  ./node_modules/.bin/next --version
  ./node_modules/.bin/tsc --version
  ./node_modules/.bin/eslint --version
  ./node_modules/.bin/vitest --version
  ./node_modules/.bin/playwright --version

  echo ""
  echo "=== [V8] Empirical integration smoke: ESLint 10.13.0 flat engine + eslint-config-next 16.4.2 configs ==="
  node --input-type=module -e "
  import { Linter } from 'eslint';
  import nextVitals from 'eslint-config-next/core-web-vitals';
  import nextTs from 'eslint-config-next/typescript';
  const linter = new Linter({ configType: 'flat' });
  const cfg = [...nextVitals, ...nextTs];
  const messages = linter.verify('var x = 1\n', cfg, { filename: 'test.ts' });
  console.log('flat config entries:', cfg.length);
  console.log('linter.verify() executed; messages:', messages.length, JSON.stringify(messages.map(m=>m.ruleId).filter(Boolean).slice(0,5)));
  console.log('ESLint+eslint-config-next integration: OK');
  "

  echo ""
  echo "=== [V9] Empirical smoke: zod 4.6.7 runtime parse ==="
  node -e "
  const { z } = require('zod');
  const Schema = z.object({ id: z.string(), provenance: z.object({ status: z.enum(['ai-draft','human-reviewed']) }) });
  const ok = Schema.safeParse({ id: 'l1', provenance: { status: 'ai-draft' } });
  const bad = Schema.safeParse({ id: 'l1', provenance: { status: 'nope' } });
  console.log('zod version:', require('zod/package.json').version);
  console.log('valid input accepted:', ok.success, '| invalid input rejected:', !bad.success);
  "

  echo ""
  echo "=== [V10] unrs-resolver (postinstall gated by npm allowScripts) works from prebuilt binding ==="
  node -e "const r=require('unrs-resolver'); new r.ResolverFactory(); console.log('unrs-resolver loads OK with platform binding', require('unrs-resolver/package.json').version)"

  echo ""
  echo "=== [V11] npm ci — clean install strictly from package-lock.json (reproducibility proof) ==="
  rm -rf node_modules
  npm ci > "$OUT_DIR/p13_npm_ci.txt" 2>&1
  echo "npm ci exit code: $?"
  tail -4 "$OUT_DIR/p13_npm_ci.txt"

  echo ""
  echo "=== [V12] Post-ci tree re-verification (exit code) ==="
  npm ls --all > "$OUT_DIR/p13_tree_after_ci.txt" 2>&1
  echo "npm ls --all exit code after npm ci: $?"
  if rg -q "UNMET|INVALID" "$OUT_DIR/p13_tree_after_ci.txt"; then echo "PROBLEM MARKERS FOUND"; else echo "NONE — tree consistent after clean install"; fi

  echo ""
  echo "=== [V13] npm audit summary (documented, not auto-fixed) ==="
  npm audit 2>&1 | sed -n '1,12p'

  echo ""
  echo "=== [V14] Explicitly NOT run (no scaffold exists — P2.1 scope) ==="
  echo "next build / next dev / eslint (on project sources, needs eslint.config.mjs) / vitest run (no tests) / playwright test (no tests, no browsers): intentionally not executed; scripts declared in package.json only."
  echo "Playwright browser binaries: not downloaded (npx playwright install deferred to P5.x/P10.x when E2E specs exist)."
  echo "==============================================================="
  echo "P1.3 VERIFICATION COMPLETE — $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
  echo "==============================================================="
} > "$OUT" 2>&1

echo "VERIFICATION_WRITTEN: $OUT"
