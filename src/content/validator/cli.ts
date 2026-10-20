/**
 * P3.3 build-time content validator — CLI entry point.
 *
 * Executed via `npm run content:check`. The runner
 * (`scripts/content-check.mjs`) compiles this file with the repository's
 * pinned `tsc` into a fresh OS temp directory (CommonJS) and executes it:
 * the P3.1 schema modules use extensionless relative imports (bundler
 * resolution) that Node's native TypeScript runner cannot resolve, and
 * adding a TS-runner dependency was deliberately rejected. The temp dir is
 * removed afterwards — no working-tree mutation.
 *
 * Deterministic by construction: fixed traversal order (sorted), no
 * network, no clock, no environment-dependent behavior. Exit codes:
 *   0 = all content structurally valid and register-consistent
 *       (warnings may be present — see below);
 *   1 = findings (schema/provenance/register-format errors);
 *   2 = usage or environment error (missing register/content directory).
 *
 * The validator enforces structural validity and register CONSISTENCY
 * only. It never establishes legal clearance — the rights register
 * (docs/content/RIGHTS_REGISTER.md) remains the single source of truth.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { validateContent, type ContentFile, type ContentIssue } from "./core";
import { parseRightsRegister } from "./register";

const EXIT = { OK: 0, FINDINGS: 1, USAGE: 2 } as const;
const REGISTER_REL = "docs/content/RIGHTS_REGISTER.md";
const CONTENT_DIR_REL = "content";
const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 } as const;

function out(text: string): void {
  process.stdout.write(`${text}\n`);
}

/** Walk content/ recursively; return repo-relative POSIX paths, sorted. */
function walkContentJsonFiles(contentDir: string, root: string): ContentFile[] {
  const files: ContentFile[] = [];
  const visit = (dir: string) => {
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : 1,
    );
    for (const entry of entries) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(abs);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push({
          path: relative(root, abs).split(sep).join("/"),
          raw: readFileSync(abs, "utf8"),
        });
      }
    }
  };
  visit(contentDir);
  return files;
}

export function main(): number {
  const root =
    process.env.CONTENT_CHECK_ROOT && process.env.CONTENT_CHECK_ROOT.trim() !== ""
      ? process.env.CONTENT_CHECK_ROOT
      : process.cwd();
  out("content:check — build-time content validator (roadmap task P3.3)");
  out(`root: ${root}`);

  const registerPath = join(root, ...REGISTER_REL.split("/"));
  if (!existsSync(registerPath)) {
    out(
      `FAIL — rights register not found at ${REGISTER_REL}: it is the authoritative record that every ` +
        "third-party provenance reference is checked against. Restore it (git checkout) before validating content.",
    );
    return EXIT.USAGE;
  }
  const register = parseRightsRegister(readFileSync(registerPath, "utf8"));
  out(
    `register: ${REGISTER_REL} — ${register.records.length} record(s) ` +
      `(${register.records.map((r) => r.id).join(", ") || "none"})`,
  );
  if (register.errors.length > 0) {
    for (const error of register.errors) {
      out(`ERROR ${REGISTER_REL}: ${error}`);
    }
    out(
      `RESULT: FAIL — the register could not be parsed reliably (${register.errors.length} format error(s)); ` +
        "fix the register format before trusting content cross-checks.",
    );
    return EXIT.FINDINGS;
  }

  const contentDir = join(root, CONTENT_DIR_REL);
  if (!existsSync(contentDir) || !statSync(contentDir).isDirectory()) {
    out(
      `FAIL — content directory not found at ${CONTENT_DIR_REL}/ (it is committed to the repository; ` +
        "a missing directory means a broken checkout — a usage error, not a validation pass).",
    );
    return EXIT.USAGE;
  }
  const files = walkContentJsonFiles(contentDir, root);
  if (files.length === 0) {
    out(
      "NOTICE — no JSON content files found under content/; nothing to validate. " +
        "Reported explicitly: this is NOT a validation pass over data.",
    );
    return EXIT.OK;
  }
  out(`scanning: ${files.length} JSON file(s) under content/`);

  const report = validateContent(files, register);
  const sorted = report.issues
    .map((issue, index) => ({ issue, index }))
    .sort(
      (a, b) => SEVERITY_ORDER[a.issue.severity] - SEVERITY_ORDER[b.issue.severity] || a.index - b.index,
    )
    .map((entry) => entry.issue);

  for (const issue of sorted as ContentIssue[]) {
    out(`${issue.severity.toUpperCase()} ${issue.file}: ${issue.message}`);
  }

  const errors = report.issues.filter((i) => i.severity === "error").length;
  const warnings = report.issues.filter((i) => i.severity === "warning").length;
  const infos = report.issues.filter((i) => i.severity === "info").length;
  out(
    `summary: files=${report.filesChecked} errors=${errors} warnings=${warnings} infos=${infos}`,
  );
  if (errors > 0) {
    out(`RESULT: FAIL — ${errors} error(s); see the messages above for file, location, and fix.`);
    return EXIT.FINDINGS;
  }
  out(
    `RESULT: PASS (with ${warnings} warning(s)) — content is schema-valid and register-consistent. ` +
      "Warnings are advisory: this check does NOT establish legal clearance; the rights register remains the single source of truth.",
  );
  return EXIT.OK;
}

/* Executed as the compiled entry point by scripts/content-check.mjs. */
if (typeof require !== "undefined" && require.main === module) {
  process.exitCode = main();
}
