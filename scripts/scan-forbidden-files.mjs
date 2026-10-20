#!/usr/bin/env node
// Forbidden-file & repository-hygiene scanner — roadmap task P2.4
// (`npm run verify`, stage 6). This is the automated-enforcement check named
// by Gate C2 criterion 5: "P2.4 `verify` forbidden-file scan: `*.pdf`,
// `books/*/pages/`" — enforced here over the whole books/ tree, which
// subsumes `books/*/pages/`.
//
// Scope (per P2.4 spec §4): the files that would actually be included in the
// repository — the git index (tracked + staged additions, so a prohibited
// file cannot escape merely because it is already in the index) and
// non-ignored untracked files. Git history is NOT scanned; history cleanup is
// a separate, owner-approved concern.
//
// Prohibited patterns below are grounded in: this repository's .gitignore,
// the roadmap (P2.1/P2.4 + §5 security checklist), the content rights
// register (docs/content/RIGHTS_REGISTER.md — copyrighted PDFs are local
// reference only), the upstream Papermorph policy (V21 — keep PDFs and page
// images out of version control), and common generated-artifact hygiene.
//
// There are NO blanket allowlists. The only exceptions are the explicitly
// sanctioned environment template (.env.example / .env.*.example) and the
// size threshold rationale documented at FORB-006. Permitted font files and
// license files pass naturally (they match no rule); the approved Papermorph
// vendor tree passes naturally (largest file ~2.3 MiB < threshold, no
// prohibited paths inside it).
//
// The scanner never deletes anything — it fails with the offending path and
// remediation guidance.
//
// Exit codes: 0 = clean, 1 = findings, 2 = environment/usage error.

import { statSync } from "node:fs";
import { join } from "node:path";
import {
  EXIT,
  banner,
  isMain,
  listCommitCandidates,
  printFinding,
  printSummary,
  repoRoot,
} from "./lib/verify-common.mjs";

/** FORB-006 threshold. Rationale: the largest legitimately committed file in
 * this repository is the vendored MathJax bundle (~2.3 MiB, documented in
 * THIRD_PARTY_NOTICES.md / PAPERMORPH_VENDORING.md). 5 MiB leaves headroom
 * above every known legitimate asset while catching archives, media dumps,
 * database files and renamed PDFs. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

const PDF_RE = /\.pdf$/i;
const TEMP_RE = /(?:\.bak|\.orig|\.rej|\.tmp|\.swp|\.swo|~)$/i;
const OS_JUNK_RE = /(?:^|\/)(?:\.DS_Store|Thumbs\.db)$/i;
const GENERATED_DIR_RE =
  /^(?:node_modules|\.next|out|build|dist|coverage|\.turbo|\.vercel|\.cache|\.vitest)\//;
const BOOKS_RE = /^books\//;

/** Pure per-file check (used by CLI and unit tests). Returns a finding or
 * null. `relPath` is repo-relative with forward slashes; `size` in bytes. */
export function checkPath(relPath, size = 0) {
  if (PDF_RE.test(relPath)) {
    return {
      path: relPath,
      line: null,
      rule: "FORB-001",
      message:
        "PDF files are forbidden in the repository (copyrighted source " +
        "material lives only in the git-ignored upload/ directory — see " +
        "docs/content/RIGHTS_REGISTER.md). Remove from the index: " +
        "git rm --cached <path>",
    };
  }
  if (BOOKS_RE.test(relPath)) {
    return {
      path: relPath,
      line: null,
      rule: "FORB-002",
      message:
        "generated book artifacts (books/**, including books/*/pages/) are " +
        "never committed — they are produced per-book from the vendored " +
        "engine and stay git-ignored. Remove from the index: " +
        "git rm --cached <path>",
    };
  }
  const base = relPath.slice(relPath.lastIndexOf("/") + 1);
  const isEnvFile = base === ".env" || /^\.env\./.test(base);
  const isSanctionedTemplate = /\.example$/.test(base);
  if (isEnvFile && !isSanctionedTemplate) {
    return {
      path: relPath,
      line: null,
      rule: "FORB-003",
      message:
        "environment file with real/local configuration must not be " +
        "committed — only the placeholder template .env.example is allowed " +
        "(keep real values in the local, git-ignored .env)",
    };
  }
  if (GENERATED_DIR_RE.test(relPath)) {
    return {
      path: relPath,
      line: null,
      rule: "FORB-004",
      message:
        "generated/build artifact committed (defense-in-depth vs .gitignore " +
        "drift) — remove from the index and fix .gitignore: " +
        "git rm -r --cached <path>",
    };
  }
  if (TEMP_RE.test(base) || OS_JUNK_RE.test(relPath)) {
    return {
      path: relPath,
      line: null,
      rule: "FORB-005",
      message:
        "temporary/backup/editor-junk file must not be committed — delete it " +
        "or add a documented narrow exception if it is genuinely required",
    };
  }
  if (size > MAX_FILE_BYTES) {
    return {
      path: relPath,
      line: null,
      rule: "FORB-006",
      message:
        `file exceeds the ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MiB ` +
        "repository-size guard (largest legitimate file today: the ~2.3 MiB " +
        "vendored MathJax bundle) — do not commit large binaries; if a " +
        "larger asset is genuinely required, document an explicit narrow " +
        "allowlist in this scanner first",
    };
  }
  return null;
}

/** CLI main. */
export function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(
      "Usage: node scripts/scan-forbidden-files.mjs\n\n" +
        "Checks git index (tracked + staged) and non-ignored untracked files\n" +
        "against repository prohibitions. Never deletes files. Exit 0 clean /\n" +
        "1 findings / 2 environment error.\n\n" +
        "Rules:\n" +
        "  FORB-001  *.pdf anywhere (copyrighted source; upload/ is git-ignored)\n" +
        "  FORB-002  books/** generated book artifacts (subsumes books/*/pages/)\n" +
        "  FORB-003  .env / .env.* except the sanctioned *.example templates\n" +
        "  FORB-004  generated dirs (node_modules/.next/out/build/dist/coverage/...)\n" +
        "  FORB-005  temp/backup/OS-junk files (*.bak *.orig *.rej *.tmp *.swp *~ .DS_Store Thumbs.db)\n" +
        "  FORB-006  files > 5 MiB (size guard; largest legitimate file ~2.3 MiB)\n",
    );
    return EXIT.OK;
  }

  const root = repoRoot();
  banner("Forbidden-file & hygiene scan (scripts/scan-forbidden-files.mjs)");
  const candidates = listCommitCandidates(root);
  const findings = [];
  let checked = 0;

  for (const rel of candidates) {
    checked++;
    let size = 0;
    try {
      size = statSync(join(root, rel)).size;
    } catch {
      // In the index but absent from the work tree (staged deletion):
      // path rules still apply; the size rule cannot.
      size = 0;
    }
    const f = checkPath(rel, size);
    if (f) findings.push(f);
  }

  for (const f of findings) printFinding(f);
  printSummary(checked, findings, "forbidden-file-scan");
  return findings.length > 0 ? EXIT.FINDINGS : EXIT.OK;
}

if (isMain(import.meta.url)) {
  process.exitCode = main();
}
