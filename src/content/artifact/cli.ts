/**
 * P3.4 lesson artifact contract checker — CLI entry point.
 *
 * Executed via `npm run artifact:check`. The runner
 * (`scripts/artifact-check.mjs`) compiles this file with the repository's
 * pinned `tsc` into a fresh per-run directory under git-ignored
 * `node_modules/.cache/` (CommonJS) and executes it — the same strategy as
 * the P3.3 content validator, because the schema modules use extensionless
 * relative imports that Node's native TypeScript runner cannot resolve and
 * adding a TS-runner dependency was deliberately rejected. The directory is
 * removed afterwards — no working-tree mutation.
 *
 * Deterministic by construction: sorted traversal, no network, no clock,
 * no environment-dependent behavior. Exit codes:
 *   0 = every committed bundle satisfies the artifact contract
 *       (warnings/infos may be present — see below);
 *   1 = findings (structure/sidecar/engine-identity/register errors);
 *   2 = usage or environment error (missing register, missing vendored
 *       engine, missing public/lessons root — all committed repository
 *       data whose absence means a broken checkout).
 *
 * The checker enforces the bundle CONTRACT only. It never runs a bundle in
 * a browser (playability is P5.1/P6.3 evidence), never decides legal
 * clearance (the rights register remains the single source of truth), and
 * never rewrites sidecar values.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  VENDOR_ENGINE_DIR,
  validateArtifactBundles,
  type ArtifactBundle,
  type ArtifactBundleFile,
  type EngineSourceFile,
} from "./core";
import { parseRightsRegister, type ParsedRegister } from "../validator/register";
import type { ContentIssue } from "../validator/core";

const EXIT = { OK: 0, FINDINGS: 1, USAGE: 2 } as const;
const REGISTER_REL = "docs/content/RIGHTS_REGISTER.md";
const BUNDLES_ROOT_REL = "public/lessons";
/** Bundle-relative engine copies and their vendored sources (byte-identity pairs). */
const ENGINE_PAIRS: readonly { bundleRelPath: string; vendorRelPath: string }[] = [
  { bundleRelPath: "lib/engine.js", vendorRelPath: "engine.js" },
  { bundleRelPath: "lib/engine.css", vendorRelPath: "engine.css" },
  { bundleRelPath: "lib/book.css", vendorRelPath: "book.css" },
];
const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 } as const;

function out(text: string): void {
  process.stdout.write(`${text}\n`);
}

/** Walk a bundle directory; return bundle-relative POSIX paths, sorted. */
function walkBundleFiles(bundleDir: string): ArtifactBundleFile[] {
  const files: ArtifactBundleFile[] = [];
  const visit = (current: string, prefix: string) => {
    const entries = readdirSync(current, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : 1,
    );
    for (const entry of entries) {
      const abs = join(current, entry.name);
      const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        visit(abs, rel);
      } else if (entry.isFile()) {
        files.push({ path: rel, raw: readFileSync(abs, "utf8") });
      }
    }
  };
  visit(bundleDir, "");
  return files.sort((a, b) => (a.path < b.path ? -1 : 1));
}

export function main(): number {
  const root =
    process.env.ARTIFACT_CHECK_ROOT && process.env.ARTIFACT_CHECK_ROOT.trim() !== ""
      ? process.env.ARTIFACT_CHECK_ROOT
      : process.cwd();
  out("artifact:check — lesson artifact contract checker (roadmap task P3.4)");
  out(`root: ${root}`);

  const registerPath = join(root, ...REGISTER_REL.split("/"));
  if (!existsSync(registerPath)) {
    out(
      `FAIL — rights register not found at ${REGISTER_REL}: third-party provenance in artifact sidecars is ` +
        "cross-checked against it. Restore it (git checkout) before checking bundles.",
    );
    return EXIT.USAGE;
  }
  const registerText = readFileSync(registerPath, "utf8");
  out(`rights register: ${REGISTER_REL} (authoritative for all clearance decisions)`);

  const vendorDir = join(root, ...VENDOR_ENGINE_DIR.split("/"));
  if (!existsSync(vendorDir) || !statSync(vendorDir).isDirectory()) {
    out(
      `FAIL — vendored engine not found at ${VENDOR_ENGINE_DIR}/ (it is committed and pinned; a missing ` +
        "vendor tree means a broken checkout — a usage error, not a validation pass).",
    );
    return EXIT.USAGE;
  }
  const engineSources: EngineSourceFile[] = [];
  for (const pair of ENGINE_PAIRS) {
    const vendorPath = join(vendorDir, ...pair.vendorRelPath.split("/"));
    if (!existsSync(vendorPath)) {
      out(
        `FAIL — vendored engine file missing: ${VENDOR_ENGINE_DIR}/${pair.vendorRelPath} (required for the ` +
          "byte-identity check of the bundle's lib/ engine copies). Restore the vendor tree (git checkout).",
      );
      return EXIT.USAGE;
    }
    engineSources.push({ ...pair, raw: readFileSync(vendorPath, "utf8") });
  }
  out(
    `engine integrity baseline: ${VENDOR_ENGINE_DIR}/ (${engineSources
      .map((source) => source.vendorRelPath)
      .join(", ")})`,
  );

  const bundlesRoot = join(root, ...BUNDLES_ROOT_REL.split("/"));
  if (!existsSync(bundlesRoot) || !statSync(bundlesRoot).isDirectory()) {
    out(
      `FAIL — bundle root not found at ${BUNDLES_ROOT_REL}/ (it is committed to the repository and holds the ` +
        "P3.4 demo bundle; a missing directory means a broken checkout — a usage error, not a validation pass).",
    );
    return EXIT.USAGE;
  }
  const bundleDirs = readdirSync(bundlesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (bundleDirs.length === 0) {
    out(
      "NOTICE — no bundle directories found under public/lessons/; nothing to check. " +
        "Reported explicitly: this is NOT a validation pass over data.",
    );
    return EXIT.OK;
  }
  const bundles: ArtifactBundle[] = bundleDirs.map((name) => ({
    dir: relative(root, join(bundlesRoot, name)).split(sep).join("/"),
    files: walkBundleFiles(join(bundlesRoot, name)),
  }));
  out(
    `scanning: ${bundles.length} bundle(s) under ${BUNDLES_ROOT_REL}/ — ` +
      bundles.map((bundle) => `${bundle.dir} (${bundle.files.length} file(s))`).join(", "),
  );

  const parsedRegister: ParsedRegister = parseRightsRegister(registerText);
  const report = validateArtifactBundles(bundles, engineSources, parsedRegister);

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
    `summary: bundles=${report.bundlesChecked} errors=${errors} warnings=${warnings} infos=${infos}`,
  );
  if (errors > 0) {
    out(`RESULT: FAIL — ${errors} error(s); see the messages above for file, location, and fix.`);
    return EXIT.FINDINGS;
  }
  out(
    `RESULT: PASS (with ${warnings} warning(s), ${infos} info(s)) — every bundle satisfies the ` +
      "artifact contract. This check does NOT establish legal clearance (the rights register decides) " +
      "and does NOT prove playability (browser evidence belongs to P5.1/P6.3).",
  );
  return EXIT.OK;
}

/* Executed as the compiled entry point by scripts/artifact-check.mjs. */
if (typeof require !== "undefined" && require.main === module) {
  process.exitCode = main();
}
