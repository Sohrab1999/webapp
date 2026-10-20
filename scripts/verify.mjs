#!/usr/bin/env node
// Canonical verification workflow — roadmap task P2.4 (`npm run verify`).
//
// Runs, in this documented order (roadmap §5.4 + P3.3 + P3.4):
//   1. TypeScript type-checking        — `npm run typecheck` (tsc --noEmit)
//   2. ESLint                          — `npm run lint`
//   3. Automated tests                 — `npm run test` (Vitest) when test
//                                        files exist; otherwise the step is
//                                        reported as SKIPPED with an explicit
//                                        "no tests discovered" notice — it is
//                                        never reported as coverage, and the
//                                        distinction is visible in the summary.
//   4. Content validation              — `npm run content:check` (P3.3:
//                                        schema + rights-register cross-check
//                                        of everything under content/)
//   5. Artifact contract check         — `npm run artifact:check` (P3.4:
//                                        lesson bundle layout + sidecar +
//                                        engine byte-identity under
//                                        public/lessons/)
//   6. Production build                — `npm run build`
//   7. Repository secret scan          — `node scripts/scan-secrets.mjs`
//   8. Forbidden-file/hygiene scan     — `node scripts/scan-forbidden-files.mjs`
//
// Behavior:
// - Independent checks all run even after an earlier failure, so one run
//   yields full diagnostics; the final exit code is nonzero if any required
//   check failed.
// - Missing npm scripts or missing binaries fail their step with an
//   actionable message instead of being skipped silently.
// - Child output is passed through live (no pipes, no swallowed exit codes,
//   no --force, no --legacy-peer-deps).
// - No network calls; no working-tree mutation (the standard Next.js build
//   writes its own git-ignored .next/ output); deterministic order.
//
// Exit codes: 0 = all required checks passed, 1 = at least one failed,
// 2 = environment/usage error (verify itself could not run).

import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { EXIT, banner, isMain, repoRoot } from "./lib/verify-common.mjs";

const ROOT = repoRoot();
const PKG = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

/** Directories excluded from test discovery: git-ignored environment
 * material, generated output, and the vendored third-party tree (upstream
 * code is never run under this project's test conventions). */
const TEST_DISCOVERY_EXCLUDE = new Set([
  ".git", "node_modules", ".next", "out", "build", "dist", "coverage",
  "vendor", "skills", "tool-results", "upload", "books",
]);
const TEST_FILE_RE = /\.(?:test|spec)\.(?:js|mjs|cjs|ts|tsx|jsx|mts|cts)$/i;

function findTestFiles(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (e.isDirectory()) {
      if (!TEST_DISCOVERY_EXCLUDE.has(e.name)) {
        findTestFiles(join(dir, e.name), out);
      }
    } else if (e.isFile() && TEST_FILE_RE.test(e.name)) {
      out.push(join(dir, e.name));
    }
  }
  return out;
}

/** Run one step; returns true on success. Output passes through live. */
function runStep({ cmd, args, requiredScript }) {
  if (requiredScript && !(requiredScript in (PKG.scripts ?? {}))) {
    process.stdout.write(
      `    FAIL — \`npm run ${requiredScript}\` is not defined in package.json. ` +
        `Add the script or fix the verify workflow.\n`,
    );
    return false;
  }
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit" });
  if (res.error) {
    process.stdout.write(
      `    FAIL — could not execute \`${cmd}\` (${res.error.code}): ` +
        `is it installed and on PATH? (project requires Node.js >= 24 / npm >= 11)\n`,
    );
    return false;
  }
  if (res.status !== 0) {
    process.stdout.write(`    exit status: ${res.status}\n`);
    return false;
  }
  return true;
}

export function main() {
  banner("npm run verify — repository verification workflow");
  process.stdout.write(
    "Order: 1 typecheck → 2 lint → 3 tests → 4 content:check → 5 build → " +
      "6 secret scan → 7 forbidden-file scan.\n" +
      "Independent checks all run (one run = full diagnostics); the final " +
      "exit code is nonzero if any required check failed.\n",
  );

  const results = [];
  const step = (id, label, fn) => {
    process.stdout.write(`\n--- [${id}] ${label}\n`);
    const ok = fn();
    results.push({ id, label, ok });
    process.stdout.write(`    [${id}] ${ok ? "PASS" : "FAIL"}\n`);
  };

  // 1–4: existing npm scripts (pinned tooling, single source of truth).
  step("typecheck", "TypeScript type-check (npm run typecheck)", () =>
    runStep({
      cmd: "npm",
      args: ["run", "typecheck"],
      requiredScript: "typecheck",
    }),
  );

  step("lint", "ESLint (npm run lint)", () =>
    runStep({
      cmd: "npm",
      args: ["run", "lint"],
      requiredScript: "lint",
    }),
  );

  // 3: tests — honest distinction between "tests ran" and "none discovered".
  const testFiles = findTestFiles(ROOT);
  if (testFiles.length === 0) {
    results.push({ id: "tests", label: "tests", ok: null });
    process.stdout.write(
      "\n--- [tests] Automated tests (npm run test)\n" +
        "    SKIPPED — no test files discovered (patterns *.test.* / *.spec.* " +
        "outside generated/vendored dirs). This is a documented limitation, " +
        "NOT test coverage and NOT a pass.\n",
    );
  } else {
    step(
      "tests",
      `Automated tests (npm run test) — ${testFiles.length} test file(s) discovered`,
      () =>
        runStep({
          cmd: "npm",
          args: ["run", "test"],
          requiredScript: "test",
        }),
    );
  }

  // 4: content validation (P3.3) — schema + rights-register cross-check.
  step("content-check", "Content validation (npm run content:check)", () =>
    runStep({
      cmd: "npm",
      args: ["run", "content:check"],
      requiredScript: "content:check",
    }),
  );

  // 5: artifact contract (P3.4) — bundle layout + sidecar + engine byte-identity.
  step("artifact-check", "Lesson artifact contract check (npm run artifact:check)", () =>
    runStep({
      cmd: "npm",
      args: ["run", "artifact:check"],
      requiredScript: "artifact:check",
    }),
  );

  step("build", "Production build (npm run build)", () =>
    runStep({
      cmd: "npm",
      args: ["run", "build"],
      requiredScript: "build",
    }),
  );

  // 6–8: repository safety scans (project-owned, no extra dependencies).
  step("secret-scan", "Repository secret scan", () =>
    runStep({
      cmd: process.execPath,
      args: [join(ROOT, "scripts", "scan-secrets.mjs")],
    }),
  );

  step("forbidden-scan", "Forbidden-file & repository-hygiene scan", () =>
    runStep({
      cmd: process.execPath,
      args: [join(ROOT, "scripts", "scan-forbidden-files.mjs")],
    }),
  );

  // Summary + aggregate exit code.
  banner("verify summary");
  let failed = 0;
  let skipped = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const n = r.ok === null ? "SKIPPED" : r.ok ? "PASS" : "FAIL";
    if (r.ok === null) skipped++;
    else if (!r.ok) failed++;
    process.stdout.write(`  ${i + 1}. ${r.id.padEnd(15)} ${n}\n`);
  }
  const ran = results.length - skipped;
  if (failed > 0) {
    process.stdout.write(
      `\nRESULT: FAIL — ${failed} of ${ran} required check(s) failed` +
        (skipped ? `, ${skipped} skipped (no tests discovered)` : "") + ".\n",
    );
    return EXIT.FINDINGS;
  }
  process.stdout.write(
    `\nRESULT: PASS — ${ran} required check(s) passed` +
      (skipped
        ? `; tests SKIPPED because no test files exist (documented limitation — verify is NOT claiming test coverage)`
        : "") +
      ".\n",
  );
  return EXIT.OK;
}

if (isMain(import.meta.url)) {
  process.exitCode = main();
}
