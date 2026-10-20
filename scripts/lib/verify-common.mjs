// Shared helpers for the P2.4 verification workflow (roadmap task P2.4).
//
// Used by:
//   scripts/scan-secrets.mjs         — repository secret scan
//   scripts/scan-forbidden-files.mjs — forbidden-file / hygiene scan
//   scripts/verify.mjs               — orchestrator (`npm run verify`)
//
// Design constraints (roadmap §5.4, task P2.4 spec):
// - Git-aware file enumeration: only files that would actually be part of the
//   repository are inspected — the git index (tracked + staged additions) plus
//   non-ignored untracked files (commit candidates). Ignored files (.env,
//   upload/, books/, node_modules/, .next/, ...) are NOT scanned as if they
//   were project source.
// - No network access, no working-tree mutation, deterministic ordering.
// - Findings never print secret values — only path, rule id, line, remedy.
// - Exit codes: 0 = clean, 1 = findings/failure, 2 = environment/usage error.

import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

export const EXIT = { OK: 0, FINDINGS: 1, ENV: 2 };

/** Maximum file size (bytes) whose *content* is regex-scanned. Larger files
 * get filename/path rules only. Largest legitimate file in this repo is the
 * vendored MathJax bundle (~2.3 MiB); 8 MiB leaves generous headroom. */
export const CONTENT_SCAN_SIZE_CAP = 8 * 1024 * 1024;

/** Resolve the repository root independent of the caller's cwd. */
export function repoRoot() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url)); // scripts/lib
  const probe = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: scriptDir,
    encoding: "utf8",
  });
  if (probe.error || probe.status !== 0) {
    process.stderr.write(
      "verify: environment error — git is not available or this script is " +
        "not inside a git work tree. Run from a clone of the repository.\n",
    );
    process.exit(EXIT.ENV);
  }
  return probe.stdout.trim();
}

/**
 * Enumerate the files that would be included in the repository:
 *  - everything in the git index (tracked files AND staged additions, so a
 *    prohibited file cannot hide merely because it was `git add`ed), and
 *  - non-ignored untracked files (candidates for a future `git add .`).
 * Paths are repo-relative with forward slashes, deduplicated and sorted.
 */
export function listCommitCandidates(root) {
  const seen = new Set();
  for (const args of [
    ["ls-files", "-z"], // index: tracked + staged
    ["ls-files", "-z", "--others", "--exclude-standard"], // untracked, not ignored
  ]) {
    const res = spawnSync("git", args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
    if (res.error || res.status !== 0) {
      process.stderr.write(
        `verify: environment error — \`git ${args.join(" ")}\` failed: ` +
          String(res.stderr || res.error || "unknown error") +
          "\n",
      );
      process.exit(EXIT.ENV);
    }
    for (const entry of res.stdout.toString("utf8").split("\0")) {
      if (entry) seen.add(entry.split(path.sep).join("/"));
    }
  }
  return [...seen].sort();
}

/** True when a module is the process entry point (CLI usage vs. import). */
export function isMain(metaUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  try {
    return (
      path.resolve(fileURLToPath(metaUrl)) === path.resolve(argv1) ||
      fileURLToPath(metaUrl) === fileURLToPath(pathToFileURL(argv1).href)
    );
  } catch {
    return false;
  }
}

/** Print a stable, grep-able stage banner. */
export function banner(title) {
  process.stdout.write(`\n=== ${title} ===\n`);
}

/**
 * Print one finding WITHOUT any captured secret value:
 * <path>:<line> [RULE_ID] remediation
 */
export function printFinding({ path: filePath, line, rule, message }) {
  const where = line == null ? filePath : `${filePath}:${line}`;
  process.stdout.write(`  ${where} [${rule}] ${message}\n`);
}

export function printSummary(scanned, findings, label) {
  const n = findings.length;
  process.stdout.write(
    `\n${label} summary: ${scanned} file(s) checked, ${n} finding(s).\n`,
  );
  if (n === 0) {
    process.stdout.write(`${label}: PASS — no violations.\n`);
  } else {
    process.stdout.write(`${label}: FAIL — resolve the findings above.\n`);
  }
}
