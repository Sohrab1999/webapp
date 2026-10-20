/**
 * Shared primitives for the content schema (roadmap task P3.1, schema v1).
 *
 * Conventions:
 * - `enTextSchema` fields hold English (LTR) learner-facing text; they reject
 *   Unicode bidi control characters so English blocks always render LTR-clean
 *   inside the Persian RTL shell (roadmap §2, RTL/LTR design rules).
 * - `faTextSchema` fields hold Persian text; bidi controls are allowed there
 *   because mixed Persian/English fragments can legitimately need them.
 * - All content identities are kebab-case ids (see `idSchema`). Canonical
 *   ownership is encoded in the ids themselves: a course's id IS its official
 *   book id (`vision-1`), and a lesson's id is namespaced under its course
 *   (`vision-1-l01`). Workbook / Teacher-Guide / third-party material attaches
 *   to those canonical identities via `provenance` — it never mints parallel
 *   identities.
 */

import { z } from "zod";

/** Content schema version (bumped only by an owner-approved roadmap task). */
export const CONTENT_SCHEMA_VERSION = 1 as const;

/** Kebab-case identifier for every content identity (grade, course, lesson, item). */
export const idSchema = z
  .string()
  .trim()
  .min(1, { message: "Content identifiers must not be empty." })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Content identifiers must be kebab-case (lowercase letters/digits joined by single hyphens), e.g. "vision-1-l01" or "word-library".',
  });

export type ContentId = z.infer<typeof idSchema>;

/**
 * Unicode bidirectional control characters (LRM/RLM and the explicit
 * embedding/isolate/override ranges). These must never appear in English
 * (LTR) content text — they are the usual cause of "invisible" direction
 * bugs when English strings are pasted from mixed-direction sources.
 */
const BIDI_CONTROL_RE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/;

/** English (LTR) text: non-empty, no bidi control characters. */
export const enTextSchema = z
  .string()
  .trim()
  .min(1, { message: "English text must not be empty or whitespace-only." })
  .refine((value) => !BIDI_CONTROL_RE.test(value), {
    message:
      "English text must not contain Unicode bidi control characters (U+200E, U+200F, U+202A–U+202E, U+2066–U+2069); English content is always rendered LTR.",
  });

/** Persian text: non-empty. Deliberately no bidi-control restriction. */
export const faTextSchema = z
  .string()
  .trim()
  .min(1, { message: "Persian text must not be empty or whitespace-only." });

export type EnText = z.infer<typeof enTextSchema>;
export type FaText = z.infer<typeof faTextSchema>;

/**
 * Reference to a repository-relative asset (audio file, image, …).
 * Kept deliberately loose in v1 — the lesson artifact bundle format is
 * defined later by roadmap task P3.4 — but absolute paths, `..` traversal
 * and backslashes are rejected already.
 */
export const assetRefSchema = z
  .string()
  .trim()
  .min(1, { message: "Asset references must not be empty." })
  .refine(
    (value) => !value.startsWith("/") && !value.split("/").includes("..") && !value.includes("\\"),
    {
      message:
        'Asset references must be repository-relative forward-slash paths (no leading "/", no ".." segments, no backslashes).',
    },
  );

export type AssetRef = z.infer<typeof assetRefSchema>;

/* ------------------------------------------------------------------ *
 * Curriculum scope: Iranian English curriculum, grades 7–12.
 * Grades 7–9 use the Prospect books (1–3); grades 10–12 use Vision (1–3).
 * ------------------------------------------------------------------ */

export const BOOK_IDS = [
  "prospect-1",
  "prospect-2",
  "prospect-3",
  "vision-1",
  "vision-2",
  "vision-3",
] as const;

export const bookIdSchema = z.enum(BOOK_IDS);
export type BookId = (typeof BOOK_IDS)[number];

export const GRADE_NUMBERS = [7, 8, 9, 10, 11, 12] as const;
export const gradeNumberSchema = z.literal(GRADE_NUMBERS);
export type GradeNumber = (typeof GRADE_NUMBERS)[number];

export const GRADE_LINES = ["prospect", "vision"] as const;
export const gradeLineSchema = z.enum(GRADE_LINES);
export type GradeLine = (typeof GRADE_LINES)[number];

/** Which grade each official book belongs to (roadmap §1.1, P4.2 mapping). */
export const BOOK_GRADE: Record<BookId, GradeNumber> = {
  "prospect-1": 7,
  "prospect-2": 8,
  "prospect-3": 9,
  "vision-1": 10,
  "vision-2": 11,
  "vision-3": 12,
};

/** Grades 7–9 = Prospect line, grades 10–12 = Vision line. */
export function lineForGrade(number: GradeNumber): GradeLine {
  return number <= 9 ? "prospect" : "vision";
}
