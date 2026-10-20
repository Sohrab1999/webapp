/**
 * Core validation logic for the P3.3 build-time content validator.
 *
 * Pure functions only (no fs, no process) so the CLI stays thin and every
 * rule is unit-testable. The Zod schemas are REUSED from the committed
 * P3.1 barrel (`../schema`) — this module never defines competing schemas
 * and never loosens validation (no `any`, no `z.any()`, no passthrough).
 *
 * Three concerns are kept strictly separate:
 * 1. Structural validation — JSON parses and matches the P3.1 schemas.
 * 2. Register consistency — every `third-party` provenance reference
 *    points at a register record whose RECORDED decision permits citation.
 * 3. Legal clearance — decided by the register alone (roadmap P1.2 / C2);
 *    this validator only reports what the register records. In particular
 *    an owner-reported grant with written evidence still pending is
 *    reported as a WARNING that is explicitly NOT finally cleared — it is
 *    never presented as verified permission.
 *
 * `checkRegisterRefs`, `schemaIssues` and the `ProvenanceRef` shape are
 * exported and REUSED by the P3.4 lesson artifact contract checker
 * (`src/content/artifact/`) so register-decision semantics have exactly
 * one implementation across all build-time validators.
 */

import {
  courseSchema,
  gradeSchema,
  lessonSchema,
  type ContentSource,
  type Course,
  type Grade,
  type Lesson,
} from "../schema/index";
import { findRecord, type ParsedRegister } from "./register";

export type Severity = "error" | "warning" | "info";

export interface ContentIssue {
  severity: Severity;
  /** Repo-relative POSIX path of the offending file (or document). */
  file: string;
  message: string;
}

export interface ContentFile {
  /** Repo-relative POSIX path, e.g. "content/lessons/vision-1-l01.json". */
  path: string;
  raw: string;
}

export interface ValidationReport {
  issues: ContentIssue[];
  filesChecked: number;
}

/** A `third-party` provenance reference found in parsed content. */
export interface ProvenanceRef {
  registerId: string;
  /** Location of the provenance block inside the file, e.g. "vocab[2].provenance". */
  at: string;
}

/** Max schema issues shown per file before summarizing the rest. */
const MAX_SCHEMA_ISSUES_PER_FILE = 8;

/**
 * Content kinds the validator knows, keyed by their directory under
 * `content/`. A JSON file in any other location fails loudly — files must
 * never sit outside a registered kind, or they would silently skip
 * validation. New content kinds extend this dispatch (P3.1 already ships
 * the course/grade schemas, so curriculum files validate automatically).
 */
function kindForPath(path: string): "lesson" | "course" | "grade" | undefined {
  const match = /^content\/(lessons|courses|grades)\/.+\.json$/.exec(path);
  if (!match) return undefined;
  if (match[1] === "lessons") return "lesson";
  if (match[1] === "courses") return "course";
  return "grade";
}

const EXPECTED_LOCATIONS = "content/{lessons,courses,grades}/<file>.json";

/** Validate a set of content files against the schemas and the register. */
export function validateContent(
  files: readonly ContentFile[],
  register: ParsedRegister,
): ValidationReport {
  const issues: ContentIssue[] = [];
  for (const message of register.errors) {
    issues.push({
      severity: "error",
      file: "docs/content/RIGHTS_REGISTER.md",
      message: `register format error — ${message}`,
    });
  }
  for (const file of files) {
    issues.push(...validateContentFile(file, register));
  }
  return { issues, filesChecked: files.length };
}

function validateContentFile(file: ContentFile, register: ParsedRegister): ContentIssue[] {
  const kind = kindForPath(file.path);
  if (!kind) {
    return [
      {
        severity: "error",
        file: file.path,
        message:
          `no registered content kind for this path — expected ${EXPECTED_LOCATIONS}. ` +
          "Move the file to a registered location or extend the validator dispatch so it is never silently unvalidated.",
      },
    ];
  }

  let data: unknown;
  try {
    data = JSON.parse(file.raw);
  } catch (error) {
    return [
      {
        severity: "error",
        file: file.path,
        message:
          `malformed JSON — ${(error as Error).message}. Fix the JSON syntax; ` +
          "the file cannot be schema-validated until it parses.",
      },
    ];
  }

  if (kind === "lesson") {
    const parsed = lessonSchema.safeParse(data);
    if (!parsed.success) return schemaIssues(file.path, parsed.error.issues);
    return checkRegisterRefs(file.path, collectLessonRefs(parsed.data), register);
  }
  if (kind === "course") {
    const parsed = courseSchema.safeParse(data);
    if (!parsed.success) return schemaIssues(file.path, parsed.error.issues);
    const course: Course = parsed.data;
    const ref = blockRef(course.provenance, "provenance");
    return ref ? checkRegisterRefs(file.path, [ref], register) : [];
  }
  const parsed = gradeSchema.safeParse(data);
  if (!parsed.success) return schemaIssues(file.path, parsed.error.issues);
  const grade: Grade = parsed.data;
  const ref = blockRef(grade.provenance, "provenance");
  return ref ? checkRegisterRefs(file.path, [ref], register) : [];
}

/**
 * Format Zod issues as one actionable error each (path + message).
 * Shared with the P3.4 artifact contract checker.
 */
export function schemaIssues(
  path: string,
  zodIssues: readonly { path: readonly PropertyKey[]; message: string }[],
): ContentIssue[] {
  const shown = zodIssues.slice(0, MAX_SCHEMA_ISSUES_PER_FILE).map((issue) => {
    const at = issue.path.length > 0 ? issue.path.map(String).join(".") : "(root)";
    return {
      severity: "error" as const,
      file: path,
      message: `schema validation failed at ${at} — ${issue.message}`,
    };
  });
  const rest = zodIssues.length - shown.length;
  if (rest > 0) {
    shown.push({
      severity: "error",
      file: path,
      message: `… ${rest} more schema issue(s) not shown — fix the ones above and re-run.`,
    });
  }
  return shown;
}

/** Extract a provenance reference from a provenance block, if third-party. */
function blockRef(
  provenance: { source: ContentSource },
  at: string,
): ProvenanceRef | undefined {
  const source = provenance.source;
  if (source.kind !== "third-party") return undefined;
  return { registerId: source.registerId, at };
}

/** Collect every third-party provenance reference in a parsed lesson. */
function collectLessonRefs(lesson: Lesson): ProvenanceRef[] {
  const refs: (ProvenanceRef | undefined)[] = [blockRef(lesson.provenance, "provenance")];
  lesson.vocab.forEach((item, i) => refs.push(blockRef(item.provenance, `vocab[${i}].provenance`)));
  lesson.grammar.forEach((point, i) =>
    refs.push(blockRef(point.provenance, `grammar[${i}].provenance`)),
  );
  if (lesson.dialogue) {
    refs.push(blockRef(lesson.dialogue.provenance, "dialogue.provenance"));
  }
  if (lesson.reading) {
    refs.push(blockRef(lesson.reading.provenance, "reading.provenance"));
    lesson.reading.questions?.forEach((question, i) =>
      refs.push(blockRef(question.provenance, `reading.questions[${i}].provenance`)),
    );
  }
  lesson.assessment.forEach((question, i) =>
    refs.push(blockRef(question.provenance, `assessment[${i}].provenance`)),
  );
  return refs.filter((ref): ref is ProvenanceRef => ref !== undefined);
}

/**
 * Cross-check third-party references against the register:
 * - unknown id → error (unresolved reference);
 * - record not "allowed" → error (the register's recorded decision does
 *   not permit citation — restricted / permission required / unresolved);
 * - "allowed" + owner-reported → WARNING, explicitly not finally cleared;
 * - "allowed" without owner-report qualifier → info.
 */
export function checkRegisterRefs(
  path: string,
  refs: readonly ProvenanceRef[],
  register: ParsedRegister,
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  for (const ref of refs) {
    const record = findRecord(register.records, ref.registerId);
    if (!record) {
      issues.push({
        severity: "error",
        file: path,
        message:
          `unresolved register reference "${ref.registerId}" at ${ref.at} — no record with this id ` +
          `exists in docs/content/RIGHTS_REGISTER.md (register contains: ` +
          `${register.records.map((r) => r.id).join(", ") || "none"}).`,
      });
      continue;
    }
    if (record.decision !== "allowed") {
      issues.push({
        severity: "error",
        file: path,
        message:
          `register record ${record.id} (cited at ${ref.at}) is recorded as "${record.decision}" — ` +
          `content may not cite it as a source; see docs/content/RIGHTS_REGISTER.md ("${record.rawDecision}").`,
      });
      continue;
    }
    if (record.ownerReported) {
      issues.push({
        severity: "warning",
        file: path,
        message:
          `register record ${record.id} (cited at ${ref.at}) is allowed as an OWNER-REPORTED grant` +
          `${record.writtenEvidencePending ? ", written evidence pending archival" : ""} — NOT ` +
          "independently verified and NOT finally cleared; reuse must stay within the recorded scope " +
          "and reverts to permission-required if written evidence is not archived.",
      });
    } else {
      issues.push({
        severity: "info",
        file: path,
        message:
          `register record ${record.id} (cited at ${ref.at}) is allowed per the register ` +
          `("${record.rawDecision}").`,
      });
    }
  }
  return issues;
}
