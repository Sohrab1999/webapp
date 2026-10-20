/**
 * Focused tests for the P3.4 lesson artifact contract checker.
 *
 * Cover the behavior matrix required by the roadmap AC ("a hand-made
 * minimal bundle satisfies a contract checker") plus the negative paths:
 * - the REAL committed demo bundle (public/lessons/vision-1-l01) satisfies
 *   the contract against the REAL vendored engine and the REAL register;
 * - valid synthetic bundles pass with zero issues;
 * - missing sidecar / required files / chapters, malformed JSON, version
 *   mismatches, and sidecar schema violations fail with actionable errors;
 * - engine byte-identity: a tampered lib/ copy fails (gate C3);
 * - timings.js must be in the canonical upstream form, with positive beat
 *   durations and one pre-rendered clip per beat;
 * - register references: unknown ids fail, restricted records fail, and an
 *   owner-reported grant with written evidence pending is reported as NOT
 *   finally cleared (warning) — never as verified permission;
 * - multiple defects are all reported; the report distinguishes severity
 *   and counts bundles (the CLI maps this to exit codes 0/1/2, verified by
 *   live command runs recorded in the worklog).
 *
 * Negative cases use SYNTHETIC in-memory fixtures and a SYNTHETIC register
 * text; the real bundle, vendor tree, and rights register are only ever
 * READ, never modified. No copyrighted material appears in test data.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";
import { CONTENT_SCHEMA_VERSION } from "../schema/index";
import { parseRightsRegister, type ParsedRegister } from "../validator/register";
import {
  validateArtifactBundles,
  type ArtifactBundle,
  type ArtifactBundleFile,
  type EngineSourceFile,
} from "./core";
import {
  ARTIFACT_CONTRACT_VERSION,
  defaultProgressKey,
  lessonArtifactSidecarSchema,
  type LessonArtifactSidecar,
} from "./sidecar";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const REAL_REGISTER_PATH = join(ROOT, "docs", "content", "RIGHTS_REGISTER.md");
const REAL_BUNDLE_DIR = join(ROOT, "public", "lessons", "vision-1-l01");
const REAL_VENDOR_DIR = join(ROOT, "vendor", "engine");

/** Synthetic register exercising every evidence class (checker tests only). */
const SYNTHETIC_REGISTER = `# Synthetic register (artifact checker tests only)

## 1. Records

### R-01 — Synthetic source A (documented allow)
- **Current decision:** **allowed — written reply archived in the register on 2026-01-15.**

### R-02 — Synthetic source B (owner-reported, evidence pending)
- **Current decision:** **allowed — owner-reported grant (2026-10-20), written evidence pending archival.**

### R-03 — Synthetic source C (restricted)
- **Current decision:** **restricted — design reference only.**

### R-04 — Synthetic source D (permission required)
- **Current decision:** **permission required.**
`;

function realRegister(): ParsedRegister {
  return parseRightsRegister(readFileSync(REAL_REGISTER_PATH, "utf8"));
}

function syntheticRegister(): ParsedRegister {
  return parseRightsRegister(SYNTHETIC_REGISTER);
}

/** Byte-exact vendored engine stand-ins for the byte-identity checks. */
const SYNTHETIC_ENGINE_SOURCES: EngineSourceFile[] = [
  { bundleRelPath: "lib/engine.js", vendorRelPath: "engine.js", raw: "/* synthetic engine.js bytes */\n" },
  { bundleRelPath: "lib/engine.css", vendorRelPath: "engine.css", raw: "/* synthetic engine.css bytes */\n" },
  { bundleRelPath: "lib/book.css", vendorRelPath: "book.css", raw: "/* synthetic book.css bytes */\n" },
];

const TIMINGS_CANONICAL = 'const TIMINGS = {"intro":{"dur":6,"marks":{},"cues":[]}}';
const TIMINGS_CANONICAL_SEMICOLON = 'const TIMINGS = {"intro":{"dur":6,"marks":{},"cues":[]}};\n';

/**
 * A valid synthetic sidecar (contract v1, schema v1, author-created,
 * ai-draft, default progress key for `bundleDirName`).
 */
function syntheticSidecarJson(bundleDirName: string, mutate?: (sidecar: Record<string, unknown>) => void): string {
  const sidecar: Record<string, unknown> = {
    contractVersion: ARTIFACT_CONTRACT_VERSION,
    lessonId: `${bundleDirName}`,
    courseId: "vision-1",
    contentSchemaVersion: CONTENT_SCHEMA_VERSION,
    provenance: {
      source: {
        kind: "author-created",
        note: "Synthetic bundle fixture authored for checker tests; not copied from any source.",
      },
      status: "ai-draft",
    },
    engine: { progressKey: defaultProgressKey(bundleDirName) },
  };
  mutate?.(sidecar);
  return JSON.stringify(sidecar, null, 2);
}

/** Files of a fully valid synthetic minimal bundle (one chapter, one beat). */
function syntheticBundleFiles(bundleDirName: string): Record<string, string> {
  return {
    "lesson.json": syntheticSidecarJson(bundleDirName),
    "index.html": "<!doctype html>\n<html lang=\"en\"><body>synthetic cover</body></html>\n",
    "lib/engine.js": SYNTHETIC_ENGINE_SOURCES[0].raw,
    "lib/engine.css": SYNTHETIC_ENGINE_SOURCES[1].raw,
    "lib/book.css": SYNTHETIC_ENGINE_SOURCES[2].raw,
    "ch01/index.html": "<!doctype html>\n<html lang=\"en\"><body>synthetic chapter</body></html>\n",
    "ch01/audio/en/timings.js": TIMINGS_CANONICAL,
    "ch01/audio/en/intro.mp3": "\u0000\u0001synthetic-clip-bytes",
  };
}

function bundle(dir: string, files: Record<string, string>): ArtifactBundle {
  const list: ArtifactBundleFile[] = Object.entries(files)
    .map(([path, raw]) => ({ path, raw }))
    .sort((a, b) => (a.path < b.path ? -1 : 1));
  return { dir, files: list };
}

function errorsOf(issues: { severity: string }[]): { severity: string; file: string; message: string }[] {
  return issues.filter((issue) => issue.severity === "error") as never;
}

/** Recursively read the real demo bundle (mirrors the CLI walk). */
function readRealBundle(): ArtifactBundle {
  const files: ArtifactBundleFile[] = [];
  const visit = (absolute: string, prefix: string) => {
    for (const entry of readdirSync(absolute, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const child = join(absolute, entry.name);
      const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) visit(child, rel);
      else files.push({ path: rel, raw: readFileSync(child, "utf8") });
    }
  };
  visit(REAL_BUNDLE_DIR, "");
  return { dir: "public/lessons/vision-1-l01", files };
}

function realEngineSources(): EngineSourceFile[] {
  return [
    { bundleRelPath: "lib/engine.js", vendorRelPath: "engine.js", raw: readFileSync(join(REAL_VENDOR_DIR, "engine.js"), "utf8") },
    { bundleRelPath: "lib/engine.css", vendorRelPath: "engine.css", raw: readFileSync(join(REAL_VENDOR_DIR, "engine.css"), "utf8") },
    { bundleRelPath: "lib/book.css", vendorRelPath: "book.css", raw: readFileSync(join(REAL_VENDOR_DIR, "book.css"), "utf8") },
  ];
}

describe("sidecar schema and helpers", () => {
  it("parses a valid synthetic sidecar into the typed shape", () => {
    const parsed = lessonArtifactSidecarSchema.safeParse(JSON.parse(syntheticSidecarJson("vision-1-t01")));
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("unreachable");
    const sidecar: LessonArtifactSidecar = parsed.data;
    expectTypeOf(sidecar.engine.progressKey).toMatchTypeOf<string>();
    expectTypeOf(sidecar.contractVersion).toEqualTypeOf<1>();
    expect(sidecar.engine.progressKey).toBe("animebook:progress:/lessons/vision-1-t01/");
  });

  it("rejects a progress key outside the engine's V13 namespace", () => {
    const parsed = lessonArtifactSidecarSchema.safeParse(
      JSON.parse(syntheticSidecarJson("vision-1-t01", (s) => {
        s.engine = { progressKey: "other-app:progress:x" };
      })),
    );
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error("unreachable");
    const at = parsed.error.issues.map((issue) => issue.path.map(String).join("."));
    expect(at).toContain("engine.progressKey");
  });

  it("defaultProgressKey mirrors the engine's URL-folder derivation (engine.js:2014)", () => {
    expect(defaultProgressKey("vision-1-l01")).toBe("animebook:progress:/lessons/vision-1-l01/");
  });
});

describe("validateArtifactBundles — acceptance", () => {
  it("the REAL committed demo bundle passes against the REAL vendor engine and REAL register", () => {
    const report = validateArtifactBundles([readRealBundle()], realEngineSources(), realRegister());
    expect(errorsOf(report.issues)).toEqual([]);
    expect(report.issues).toEqual([]);
    expect(report.bundlesChecked).toBe(1);
  });

  it("a valid synthetic minimal bundle produces zero issues of any severity", () => {
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", syntheticBundleFiles("vision-1-t01"))],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    expect(report.issues).toEqual([]);
    expect(report.bundlesChecked).toBe(1);
  });

  it("accepts both canonical timings spellings (with and without trailing semicolon)", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    files["ch01/audio/en/timings.js"] = TIMINGS_CANONICAL_SEMICOLON;
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    expect(report.issues).toEqual([]);
  });

  it("reports a deliberate progress-key override as info while staying valid", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    files["lesson.json"] = syntheticSidecarJson("vision-1-t01", (s) => {
      s.engine = { progressKey: "animebook:progress:custom-lesson-key" };
    });
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    expect(errorsOf(report.issues)).toEqual([]);
    const infos = report.issues.filter((issue) => issue.severity === "info");
    expect(infos).toHaveLength(1);
    expect(infos[0].message).toContain("custom engine progress key");
    expect(infos[0].message).toContain("animebook:progress:/lessons/vision-1-t01/");
  });
});

describe("validateArtifactBundles — structure failures", () => {
  it("fails a bundle without a lesson.json sidecar", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    delete files["lesson.json"];
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    const errors = errorsOf(report.issues);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('missing its "lesson.json" sidecar');
  });

  it("fails a malformed sidecar with a JSON diagnostic", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    files["lesson.json"] = "{ not json";
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    const errors = errorsOf(report.issues);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("malformed JSON");
    expect(errors[0].file).toBe("public/lessons/vision-1-t01/lesson.json");
  });

  it("fails a stale artifact contract version with an actionable message", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    files["lesson.json"] = syntheticSidecarJson("vision-1-t01", (s) => {
      s.contractVersion = 99;
    });
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    const errors = errorsOf(report.issues);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("artifact contract version mismatch");
  });

  it("fails a stale content schema version with an actionable message", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    files["lesson.json"] = syntheticSidecarJson("vision-1-t01", (s) => {
      s.contentSchemaVersion = 99;
    });
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    const errors = errorsOf(report.issues);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("content schema version mismatch");
  });

  it("fails a lessonId that is not namespaced under its courseId", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    files["lesson.json"] = syntheticSidecarJson("vision-1-t01", (s) => {
      s.lessonId = "prospect-1-l01";
    });
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    const errors = errorsOf(report.issues);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("namespaced under its courseId");
  });

  it("rejects an invented rights/permission field — clearance cannot be asserted in a sidecar", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    files["lesson.json"] = syntheticSidecarJson("vision-1-t01", (s) => {
      s.rights = "granted";
    });
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    const errors = errorsOf(report.issues);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some((error) => error.message.includes("rights"))).toBe(true);
  });

  it("fails when a required top-level file is missing", () => {
    for (const missing of ["index.html", "lib/engine.js", "lib/engine.css", "lib/book.css"]) {
      const files = syntheticBundleFiles("vision-1-t01");
      delete files[missing];
      const report = validateArtifactBundles(
        [bundle("public/lessons/vision-1-t01", files)],
        SYNTHETIC_ENGINE_SOURCES,
        syntheticRegister(),
      );
      const errors = errorsOf(report.issues);
      expect(errors.some((error) => error.message.includes(`"${missing}" is missing`)), missing).toBe(true);
    }
  });

  it("fails when a required file exists but is empty", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    files["lib/book.css"] = "";
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    const errors = errorsOf(report.issues);
    // The empty file also differs from its vendored source, so the
    // byte-identity check reports too — both diagnostics are expected.
    expect(errors.some((error) => error.message.includes("exists but is empty"))).toBe(true);
  });

  it("fails a bundle with no chapter folder", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    for (const key of Object.keys(files)) if (key.startsWith("ch01/")) delete files[key];
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    const errors = errorsOf(report.issues);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("no chapter folder");
  });

  it("fails a chapter page that is missing or empty", () => {
    const without = syntheticBundleFiles("vision-1-t01");
    delete without["ch01/index.html"];
    const empty = syntheticBundleFiles("vision-1-t01");
    empty["ch01/index.html"] = "   \n";
    for (const [label, files] of [["missing", without], ["empty", empty]] as const) {
      const report = validateArtifactBundles(
        [bundle("public/lessons/vision-1-t01", files)],
        SYNTHETIC_ENGINE_SOURCES,
        syntheticRegister(),
      );
      const errors = errorsOf(report.issues);
      expect(errors.some((error) => error.message.includes(`chapter page "ch01/index.html"`)), label).toBe(true);
    }
  });
});

describe("validateArtifactBundles — engine byte-identity (gate C3)", () => {
  it("fails a tampered lib/ engine copy", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    files["lib/engine.js"] = `${SYNTHETIC_ENGINE_SOURCES[0].raw}\n// tampered\n`;
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    const errors = errorsOf(report.issues);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("NOT byte-identical");
    expect(errors[0].message).toContain("vendor/engine/engine.js");
  });

  it("checks every engine pair, not just engine.js", () => {
    for (const path of ["lib/engine.js", "lib/engine.css", "lib/book.css"]) {
      const files = syntheticBundleFiles("vision-1-t01");
      files[path] = "different bytes";
      const report = validateArtifactBundles(
        [bundle("public/lessons/vision-1-t01", files)],
        SYNTHETIC_ENGINE_SOURCES,
        syntheticRegister(),
      );
      expect(errorsOf(report.issues).some((error) => error.message.includes("NOT byte-identical")), path).toBe(true);
    }
  });
});

describe("validateArtifactBundles — audio timings", () => {
  it("fails a chapter without audio/<lang>/timings.js", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    delete files["ch01/audio/en/timings.js"];
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    const errors = errorsOf(report.issues);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("no audio/<lang>/timings.js");
  });

  it("fails timings.js that is not in the canonical upstream form", () => {
    const cases: string[] = [
      "var TIMINGS = {\"intro\":{\"dur\":6}}",
      "const TIMINGS = ({intro: {dur: 6}})", // JS object literal, not JSON
      "const TIMINGS = [\"intro\"]",
      "TIMINGS = {\"intro\":{\"dur\":6}}",
    ];
    for (const [i, raw] of cases.entries()) {
      const files = syntheticBundleFiles("vision-1-t01");
      files["ch01/audio/en/timings.js"] = raw;
      const report = validateArtifactBundles(
        [bundle("public/lessons/vision-1-t01", files)],
        SYNTHETIC_ENGINE_SOURCES,
        syntheticRegister(),
      );
      const errors = errorsOf(report.issues);
      expect(errors.length, `case ${i}: ${raw}`).toBeGreaterThanOrEqual(1);
      expect(errors.some((error) => error.message.includes("canonical form")), `case ${i}`).toBe(true);
    }
  });

  it("fails timings with no beats", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    files["ch01/audio/en/timings.js"] = 'const TIMINGS = {}';
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    expect(errorsOf(report.issues).some((error) => error.message.includes("declares no beats"))).toBe(true);
  });

  it("fails beats with a missing or non-positive duration", () => {
    const zero = syntheticBundleFiles("vision-1-t01");
    zero["ch01/audio/en/timings.js"] = 'const TIMINGS = {"intro":{"dur":0}}';
    const missing = syntheticBundleFiles("vision-1-t01");
    missing["ch01/audio/en/timings.js"] = 'const TIMINGS = {"intro":{"marks":{}}}';
    const nonNumeric = syntheticBundleFiles("vision-1-t01");
    nonNumeric["ch01/audio/en/timings.js"] = 'const TIMINGS = {"intro":{"dur":"6"}}';
    for (const [label, files] of [["zero", zero], ["missing", missing], ["nonNumeric", nonNumeric]] as const) {
      const report = validateArtifactBundles(
        [bundle("public/lessons/vision-1-t01", files)],
        SYNTHETIC_ENGINE_SOURCES,
        syntheticRegister(),
      );
      expect(
        errorsOf(report.issues).some((error) => error.message.includes('beat "intro" has no numeric "dur"') || error.message.includes("durations must be positive")),
        label,
      ).toBe(true);
    }
  });

  it("fails a beat without its pre-rendered clip (engine loads audio/<lang>/<beatId>.mp3)", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    delete files["ch01/audio/en/intro.mp3"];
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    const errors = errorsOf(report.issues);
    expect(errors).toHaveLength(1);
    expect(errors[0].file).toBe("public/lessons/vision-1-t01/ch01/audio/en/intro.mp3");
    expect(errors[0].message).toContain("no audio clip");
  });

  it("fails an empty audio clip", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    files["ch01/audio/en/intro.mp3"] = "";
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    expect(errorsOf(report.issues).some((error) => error.message.includes("exists but is empty"))).toBe(true);
  });
});

describe("validateArtifactBundles — register consistency (shared with P3.3)", () => {
  it("fails an unresolved register reference", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    files["lesson.json"] = syntheticSidecarJson("vision-1-t01", (s) => {
      s.provenance = {
        source: { kind: "third-party", registerId: "R-99", locator: "probe" },
        status: "ai-draft",
      };
    });
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    const errors = errorsOf(report.issues);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('unresolved register reference "R-99"');
  });

  it("fails citations of restricted / permission-required records", () => {
    for (const id of ["R-03", "R-04"]) {
      const files = syntheticBundleFiles("vision-1-t01");
      files["lesson.json"] = syntheticSidecarJson("vision-1-t01", (s) => {
        s.provenance = { source: { kind: "third-party", registerId: id }, status: "ai-draft" };
      });
      const report = validateArtifactBundles(
        [bundle("public/lessons/vision-1-t01", files)],
        SYNTHETIC_ENGINE_SOURCES,
        syntheticRegister(),
      );
      const errors = errorsOf(report.issues);
      expect(errors, id).toHaveLength(1);
      expect(errors[0].message).toContain(`is recorded as "${id === "R-03" ? "restricted" : "permission required"}"`);
      expect(errors[0].message).toContain("may not cite it as a source");
    }
  });

  it("reports an owner-reported grant with evidence pending as a WARNING that is NOT finally cleared", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    files["lesson.json"] = syntheticSidecarJson("vision-1-t01", (s) => {
      s.provenance = { source: { kind: "third-party", registerId: "R-02" }, status: "ai-draft" };
    });
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    expect(errorsOf(report.issues)).toEqual([]);
    const warnings = report.issues.filter((issue) => issue.severity === "warning");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain("NOT independently verified and NOT finally cleared");
    // No-claim guard: the message must never read as verified permission.
    expect(warnings[0].message).not.toMatch(/is (finally )?cleared(?!.*NOT)/);
    expect(warnings[0].message).toContain("reverts to permission-required");
  });

  it("forwards register format errors as errors on the register path", () => {
    const broken = parseRightsRegister(`${SYNTHETIC_REGISTER}\n### R-01 — Duplicate record id\n- **Current decision:** **allowed.**\n`);
    expect(broken.errors.length).toBeGreaterThan(0);
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", syntheticBundleFiles("vision-1-t01"))],
      SYNTHETIC_ENGINE_SOURCES,
      broken,
    );
    const errors = errorsOf(report.issues);
    expect(errors.some((error) => error.file === "docs/content/RIGHTS_REGISTER.md")).toBe(true);
  });
});

describe("validateArtifactBundles — reporting contract", () => {
  it("reports multiple defects together and counts bundles", () => {
    const broken = syntheticBundleFiles("vision-1-t01");
    delete broken["lesson.json"];
    broken["lib/engine.js"] = "tampered";
    delete broken["ch01/audio/en/intro.mp3"];
    const report = validateArtifactBundles(
      [
        bundle("public/lessons/b-a", broken),
        bundle("public/lessons/b-b", syntheticBundleFiles("vision-1-t01")),
      ],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    expect(report.bundlesChecked).toBe(2);
    const errors = errorsOf(report.issues);
    // missing sidecar + non-identical engine copy + missing beat clip.
    expect(errors.length).toBeGreaterThanOrEqual(3);
    expect(errors.every((error) => error.file.startsWith("public/lessons/b-a"))).toBe(true);
  });

  it("warns (not errors) on a stray top-level file outside the documented layout", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    files["scratch-notes.txt"] = "not part of the bundle contract";
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    expect(errorsOf(report.issues)).toEqual([]);
    const warnings = report.issues.filter((issue) => issue.severity === "warning");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].file).toBe("public/lessons/vision-1-t01/scratch-notes.txt");
  });

  it("treats every non-lib top-level directory as a chapter (fail-loud, never skipped)", () => {
    const files = syntheticBundleFiles("vision-1-t01");
    files["extras/index.html"] = "<!doctype html><html><body>x</body></html>";
    const report = validateArtifactBundles(
      [bundle("public/lessons/vision-1-t01", files)],
      SYNTHETIC_ENGINE_SOURCES,
      syntheticRegister(),
    );
    const errors = errorsOf(report.issues);
    expect(errors.some((error) => error.message.includes('chapter "extras" has no audio'))).toBe(true);
  });
});
