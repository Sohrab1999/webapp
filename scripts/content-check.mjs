#!/usr/bin/env node
// P3.3 build-time content validator — CLI runner (`npm run content:check`).
//
// Compiles `src/content/validator/cli.ts` with the repository's PINNED
// `tsc` into a fresh OS temp directory (CommonJS) and executes it,
// propagating its exit code:
//   0 = valid, 1 = findings, 2 = usage/environment error.
//
// Why the compile step: the P3.1 schema modules use extensionless relative
// imports (TypeScript `bundler` resolution), which Node's native TS runner
// cannot resolve, and adding a TS-runner dependency (tsx etc.) was
// deliberately rejected for P3.3 (zero new dependencies). The pinned
// TypeScript compiler resolves the same import graph and the emitted CJS
// runs on stock Node.
//
// The output directory is a FRESH per-run subdirectory under
// node_modules/.cache (git-ignored, excluded from the P2.4 scanners) so the
// compiled files resolve `zod` through the repository's node_modules by
// normal CJS upward resolution; it is removed in all cases — no working-tree
// mutation, nothing for the hygiene scanner to see.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TSC = join(ROOT, "node_modules", "typescript", "bin", "tsc");
const ENTRY = "src/content/validator/cli.ts";

function out(text) {
  process.stdout.write(`${text}\n`);
}

if (!existsSync(TSC)) {
  out(
    `FAIL — TypeScript compiler not found at node_modules/typescript (expected the pinned devDependency). ` +
      "Run `npm ci` to restore the dependency baseline; refusing to validate with unknown tooling.",
  );
  process.exitCode = 2;
} else {
  const cacheBase = join(ROOT, "node_modules", ".cache", "content-check");
  mkdirSync(cacheBase, { recursive: true });
  const tempDir = mkdtempSync(join(cacheBase, "run-"));
  try {
    const emit = spawnSync(
      process.execPath,
      [
        TSC,
        ENTRY,
        "--outDir", join(tempDir, "out"),
        "--rootDir", "src",
        "--module", "commonjs",
        "--moduleResolution", "node10",
        "--target", "es2022",
        "--lib", "es2022",
        "--types", "node",
        "--strict",
        "--skipLibCheck",
        "--esModuleInterop",
        "--noEmitOnError",
      ],
      { cwd: ROOT, stdio: "inherit" },
    );
    if (emit.error) {
      out(`FAIL — could not execute the TypeScript compiler (${emit.error.code}).`);
      process.exitCode = 2;
    } else if (emit.status !== 0) {
      out(`FAIL — the validator itself does not compile (tsc exit ${emit.status}). ` +
        "This is a code defect, not a content finding.");
      process.exitCode = 1;
    } else {
      // --rootDir src strips the "src/" prefix: src/content/validator/cli.ts
      // emits to <temp>/out/content/validator/cli.js.
      const cli = join(tempDir, "out", "content", "validator", "cli.js");
      const run = spawnSync(process.execPath, [cli], {
        cwd: ROOT,
        stdio: "inherit",
        env: { ...process.env, CONTENT_CHECK_ROOT: ROOT },
      });
      if (run.error) {
        out(`FAIL — could not execute the compiled validator (${run.error.code}).`);
        process.exitCode = 2;
      } else {
        process.exitCode = run.status ?? 1;
      }
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
