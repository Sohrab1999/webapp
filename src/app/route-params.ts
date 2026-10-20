/**
 * Route-parameter validation for the P4.1 shell routes.
 *
 * The shell routes use the schema-canonical content identities directly in
 * their URLs (roadmap P4.1: `/grades/[grade]`, `/grades/[grade]/lessons/[lesson]`):
 *
 * - `grade` must be one of the six canonical grade ids (`grade-7` … `grade-12`)
 *   defined by the P3.1 schema — the same single source of truth the content
 *   registry uses, so a URL can never name a grade the schema does not know.
 * - `lesson` must be a well-formed kebab-case content id. Registry existence
 *   and lesson-to-grade consistency are deliberately NOT checked here — the
 *   content registry is read by the lesson list page (roadmap P4.3), not by
 *   the structural shell routes.
 *
 * Pure functions only: the pages call these, and the unit tests exercise
 * them without any DOM or Next.js runtime.
 */

// NOTE: relative (not "@/") imports — this module is unit-tested under
// Vitest, which does not resolve the tsconfig path alias (no vitest config
// exists; adding one is out of P4.1 scope). Next.js resolves relative
// imports identically, so the pages are unaffected.
import { gradeIdSchema, type GradeId } from "../content/schema/curriculum";
import { idSchema } from "../content/schema/common";

/** Validate a `/grades/[grade]` route param against the P3.1 grade ids. */
export function parseGradeParam(param: string): GradeId | null {
  const result = gradeIdSchema.safeParse(param);
  return result.success ? result.data : null;
}

/**
 * Validate a `/grades/[grade]/lessons/[lesson]` route param as a well-formed
 * content id (kebab-case). Returns the trimmed id, or null when malformed.
 */
export function parseLessonParam(param: string): string | null {
  const result = idSchema.safeParse(param);
  return result.success ? result.data : null;
}
