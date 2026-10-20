/**
 * Focused tests for the P3.3 build-time content validator.
 *
 * Cover the required behavior matrix:
 * - valid content (the real P3.2 fixture + the real register) passes;
 * - malformed JSON / schema-invalid content fail with useful diagnostics;
 * - register references: existing ids recognized, unknown ids fail,
 *   malformed ids fail, non-allowed records fail;
 * - an owner-reported grant with written evidence still pending is
 *   reported as NOT finally cleared (warning), never as verified;
 * - multiple errors are all reported; the report distinguishes
 *   success from failure (the CLI maps this to exit codes 0/1/2, which is
 *   verified by live command runs recorded in the worklog).
 *
 * Negative cases use SYNTHETIC in-memory fixtures and a SYNTHETIC register
 * text; the real P3.2 lesson fixture and the real rights register are only
 * ever READ, never modified. No copyrighted material appears in test data.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { courseSchema, lessonSchema, type ContentSource } from "../schema/index";
import { omit } from "../schema/test-utils";
import { validateContent, type ContentFile } from "./core";
import { evidenceClass, findRecord, parseRightsRegister, type ParsedRegister } from "./register";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const REAL_REGISTER_PATH = join(ROOT, "docs", "content", "RIGHTS_REGISTER.md");
const REAL_FIXTURE_PATH = join(ROOT, "content", "lessons", "vision-1-l01.json");

/** Synthetic register exercising every evidence class (validator tests only). */
const SYNTHETIC_REGISTER = `# Synthetic register (validator tests only)

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

const AUTHOR_CREATED_SOURCE = {
  kind: "author-created",
  note: "Synthetic fixture authored for validator tests; not copied from any source.",
} as const;

/** Minimal schema-valid lesson with one vocab item carrying `source`. */
function syntheticLesson(source: ContentSource = AUTHOR_CREATED_SOURCE) {
  return {
    id: "vision-1-t01",
    courseId: "vision-1",
    number: 1,
    title: "Validator test fixture",
    vocab: [
      {
        id: "vision-1-t01-vocab-01",
        term: "sample",
        meaningFa: "نمونه",
        pos: "noun",
        example: "This is a sample word for the validator.",
        exampleFa: "این یک واژهٔ نمونه برای اعتبارسنج است.",
        provenance: { source, status: "ai-draft" },
      },
    ],
    grammar: [],
    assessment: [],
    provenance: {
      source: {
        kind: "author-created",
        note: "Synthetic lesson fixture authored for validator tests; not copied from any source.",
      },
      status: "ai-draft",
    },
  };
}

function file(path: string, raw: string): ContentFile {
  return { path, raw };
}

function parse(md: string): ParsedRegister {
  const parsed = parseRightsRegister(md);
  return parsed;
}

describe("parseRightsRegister", () => {
  it("parses the real register: 9 records, no format errors", () => {
    const parsed = parse(readFileSync(REAL_REGISTER_PATH, "utf8"));
    expect(parsed.errors).toEqual([]);
    expect(parsed.records.map((record) => record.id)).toEqual([
      "R-01", "R-02", "R-03", "R-04", "R-05", "R-06", "R-07", "R-08", "R-09",
    ]);
  });

  it("classifies real records descriptively — R-01 owner-reported pending, R-07/R-09 not cleared", () => {
    const parsed = parse(readFileSync(REAL_REGISTER_PATH, "utf8"));
    const r01 = findRecord(parsed.records, "R-01");
    expect(r01).toBeDefined();
    if (!r01) throw new Error("unreachable");
    expect(r01.decision).toBe("allowed");
    expect(r01.ownerReported).toBe(true);
    expect(r01.writtenEvidencePending).toBe(true);
    expect(evidenceClass(r01)).toBe("allowed-owner-reported-pending-archival");

    for (const id of ["R-07", "R-08", "R-09"]) {
      const record = findRecord(parsed.records, id);
      expect(record, id).toBeDefined();
      if (!record) throw new Error("unreachable");
      expect(record.decision).toBe("restricted");
      expect(evidenceClass(record)).toBe("not-cleared-for-citation");
    }
  });

  it("fails loudly on register format drift (never silently skips records)", () => {
    const cases: [string, string][] = [
      ["record without a decision line", "### R-01 — Source\n- some other field\n"],
      ["duplicate record id", "### R-01 — Source\n- **Current decision:** **allowed.**\n### R-01 — Again\n- **Current decision:** **allowed.**\n"],
      ["malformed record heading", "### R-1 — Bad heading\n- **Current decision:** **allowed.**\n"],
      ["unknown decision value", "### R-01 — Source\n- **Current decision:** **permitted forever.**\n"],
      ["orphan decision line", "## 1. Section\n- **Current decision:** **allowed.**\n"],
    ];
    for (const [name, markdown] of cases) {
      const parsed = parse(markdown);
      expect(parsed.errors.length, `${name}: ${JSON.stringify(parsed)}`).toBeGreaterThan(0);
    }
    expect(parse("## 1. Empty register\n").errors.length).toBeGreaterThan(0);
  });
});

describe("validateContent — structural", () => {
  it("accepts the real fixture against the real register with zero errors", () => {
    const register = parse(readFileSync(REAL_REGISTER_PATH, "utf8"));
    const report = validateContent(
      [file("content/lessons/vision-1-l01.json", readFileSync(REAL_FIXTURE_PATH, "utf8"))],
      register,
    );
    const errors = report.issues.filter((issue) => issue.severity === "error");
    expect(errors).toEqual([]);
    expect(report.filesChecked).toBe(1);
    // Every R-01 citation is owner-reported pending archival → warnings, never silence.
    const warnings = report.issues.filter((issue) => issue.severity === "warning");
    expect(warnings.length).toBeGreaterThan(0);
    for (const warning of warnings) {
      expect(warning.message).toMatch(/OWNER-REPORTED/);
      expect(warning.message).toMatch(/NOT finally cleared/);
    }
  });

  it("rejects malformed JSON with the file path", () => {
    const register = parse(SYNTHETIC_REGISTER);
    const report = validateContent([file("content/lessons/broken.json", "{ definitely not json")], register);
    const errors = report.issues.filter((issue) => issue.severity === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].file).toBe("content/lessons/broken.json");
    expect(errors[0].message).toMatch(/malformed JSON/i);
  });

  it("rejects schema-invalid content with a useful diagnostic", () => {
    const register = parse(SYNTHETIC_REGISTER);
    const data = syntheticLesson();
    const vocabItem = omit(data.vocab[0], "meaningFa");
    const report = validateContent(
      [file("content/lessons/synthetic.json", JSON.stringify({ ...data, vocab: [vocabItem] }))],
      register,
    );
    const errors = report.issues.filter((issue) => issue.severity === "error");
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].message).toMatch(/vocab\.0\.meaningFa/);
  });

  it("rejects JSON files in unregistered content locations", () => {
    const register = parse(SYNTHETIC_REGISTER);
    const report = validateContent(
      [file("content/misc/thing.json", JSON.stringify(syntheticLesson()))],
      register,
    );
    const errors = report.issues.filter((issue) => issue.severity === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/no registered content kind/);
  });

  it("validates course files through the dispatch table", () => {
    const register = parse(SYNTHETIC_REGISTER);
    const course = {
      id: "vision-1",
      gradeId: "grade-10",
      title: "Vision One (synthetic validator fixture)",
      provenance: { source: AUTHOR_CREATED_SOURCE, status: "ai-draft" },
    };
    expect(courseSchema.safeParse(course).success, "test fixture must be schema-valid").toBe(true);
    const report = validateContent([file("content/courses/vision-1.json", JSON.stringify(course))], register);
    expect(report.issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });
});

describe("validateContent — register consistency", () => {
  it("recognizes an existing, documented register id as citable", () => {
    const register = parse(SYNTHETIC_REGISTER);
    const report = validateContent(
      [file("content/lessons/synthetic.json", JSON.stringify(syntheticLesson({
        kind: "third-party", registerId: "R-01",
      })))],
      register,
    );
    expect(report.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    const infos = report.issues.filter((issue) => issue.severity === "info");
    expect(infos).toHaveLength(1);
    expect(infos[0].message).toMatch(/R-01/);
    expect(infos[0].message).toMatch(/allowed per the register/);
  });

  it("fails on an unknown register id", () => {
    const register = parse(SYNTHETIC_REGISTER);
    const report = validateContent(
      [file("content/lessons/synthetic.json", JSON.stringify(syntheticLesson({
        kind: "third-party", registerId: "R-99",
      })))],
      register,
    );
    const errors = report.issues.filter((issue) => issue.severity === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/unresolved register reference "R-99"/);
    expect(errors[0].file).toBe("content/lessons/synthetic.json");
  });

  it("fails on a schema-malformed register reference", () => {
    const register = parse(SYNTHETIC_REGISTER);
    const report = validateContent(
      [file("content/lessons/synthetic.json", JSON.stringify(syntheticLesson({
        kind: "third-party", registerId: "R-1",
      })))],
      register,
    );
    const errors = report.issues.filter((issue) => issue.severity === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/vocab\.0\.provenance\.source\.registerId/);
    expect(errors[0].message).toMatch(/rights register/);
  });

  it("fails when the cited record's decision does not permit citation", () => {
    const register = parse(SYNTHETIC_REGISTER);
    const report = validateContent(
      [
        file("content/lessons/restricted.json", JSON.stringify(syntheticLesson({
          kind: "third-party", registerId: "R-03",
        }))),
        file("content/lessons/permission-required.json", JSON.stringify(syntheticLesson({
          kind: "third-party", registerId: "R-04",
        }))),
      ],
      register,
    );
    const errors = report.issues.filter((issue) => issue.severity === "error");
    expect(errors).toHaveLength(2);
    expect(errors[0].message).toMatch(/recorded as "restricted"/);
    expect(errors[1].message).toMatch(/recorded as "permission required"/);
  });

  it("reports an owner-reported, evidence-pending grant as a warning — never as cleared", () => {
    const register = parse(SYNTHETIC_REGISTER);
    const record = findRecord(register.records, "R-02");
    expect(record, "synthetic register must define R-02").toBeDefined();
    if (!record) throw new Error("unreachable");
    expect(evidenceClass(record)).toBe("allowed-owner-reported-pending-archival");

    const report = validateContent(
      [file("content/lessons/synthetic.json", JSON.stringify(syntheticLesson({
        kind: "third-party", registerId: "R-02",
      })))],
      register,
    );
    expect(report.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    const warnings = report.issues.filter((issue) => issue.severity === "warning");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toMatch(/OWNER-REPORTED/);
    expect(warnings[0].message).toMatch(/written evidence pending archival/);
    expect(warnings[0].message).toMatch(/NOT independently verified and NOT finally cleared/);
    // The validator must not emit any message that claims verified clearance.
    for (const issue of report.issues) {
      expect(issue.message).not.toMatch(/(?<!NOT )finally cleared(?!; reuse)/);
    }
  });

  it("reports multiple errors across files, all with file and cause", () => {
    const register = parse(SYNTHETIC_REGISTER);
    const report = validateContent(
      [
        file("content/lessons/broken.json", "{ not json"),
        file("content/lessons/unknown-ref.json", JSON.stringify(syntheticLesson({
          kind: "third-party", registerId: "R-99",
        }))),
        file("content/lessons/restricted-ref.json", JSON.stringify(syntheticLesson({
          kind: "third-party", registerId: "R-03",
        }))),
      ],
      register,
    );
    const errors = report.issues.filter((issue) => issue.severity === "error");
    expect(errors.length).toBe(3);
    expect(new Set(errors.map((error) => error.file)).size).toBe(3);
  });
});

describe("report contract", () => {
  it("distinguishes success from failure (the CLI maps this to exit codes 0/1)", () => {
    const register = parse(SYNTHETIC_REGISTER);
    const valid = validateContent(
      [file("content/lessons/ok.json", JSON.stringify(syntheticLesson()))],
      register,
    );
    const invalid = validateContent(
      [file("content/lessons/bad.json", "{ nope")],
      register,
    );
    expect(valid.issues.some((issue) => issue.severity === "error")).toBe(false);
    expect(invalid.issues.some((issue) => issue.severity === "error")).toBe(true);
    // The schema check on the synthetic lesson is itself part of the contract:
    expect(lessonSchema.safeParse(syntheticLesson()).success).toBe(true);
  });
});
