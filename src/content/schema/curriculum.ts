/**
 * Curriculum entities: Grade and Course (roadmap task P3.1, schema v1).
 *
 * Canonical identity rules:
 * - A grade's id is exactly "grade-<number>" (six grades: 7–12).
 * - A course's id IS the official book id ("prospect-1" … "vision-3"): the
 *   Student Book is the primary owner of the canonical identity, so there
 *   is exactly one course per book and no parallel course identities.
 * - The grade/book mapping (prospect-1→grade-7 … vision-3→grade-12) is
 *   enforced so a course can never be attached to the wrong grade.
 *
 * Both entities carry mandatory provenance: curriculum structures are
 * either derived from the official books (`official-textbook`) or authored
 * for this app (`author-created`).
 */

import { z } from "zod";
import {
  BOOK_GRADE,
  bookIdSchema,
  enTextSchema,
  faTextSchema,
  gradeLineSchema,
  gradeNumberSchema,
  lineForGrade,
} from "./common";
import { provenanceSchema } from "./provenance";

/** The six canonical grade ids. */
export const GRADE_IDS = [
  "grade-7",
  "grade-8",
  "grade-9",
  "grade-10",
  "grade-11",
  "grade-12",
] as const;

export const gradeIdSchema = z.enum(GRADE_IDS);
export type GradeId = (typeof GRADE_IDS)[number];

export const gradeSchema = z
  .strictObject({
    id: gradeIdSchema,
    number: gradeNumberSchema,
    line: gradeLineSchema,
    provenance: provenanceSchema,
  })
  .refine((grade) => grade.id === `grade-${grade.number}`, {
    message: 'Grade ids must be "grade-<number>" and match the grade number (e.g. "grade-10" for number 10).',
    path: ["id"],
  })
  .refine((grade) => grade.line === lineForGrade(grade.number), {
    message: "Grades 7–9 belong to the Prospect line and grades 10–12 to the Vision line.",
    path: ["line"],
  });

export type Grade = z.infer<typeof gradeSchema>;

export const courseSchema = z
  .strictObject({
    id: bookIdSchema,
    gradeId: gradeIdSchema,
    title: enTextSchema,
    titleFa: faTextSchema.optional(),
    provenance: provenanceSchema,
  })
  .refine((course) => course.gradeId === `grade-${BOOK_GRADE[course.id]}`, {
    message: `Course grade does not match the official book (prospect-1→grade-7, prospect-2→grade-8, prospect-3→grade-9, vision-1→grade-10, vision-2→grade-11, vision-3→grade-12).`,
    path: ["gradeId"],
  });

export type Course = z.infer<typeof courseSchema>;
