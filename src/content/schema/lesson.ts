/**
 * Lesson — the canonical content container (roadmap task P3.1, schema v1).
 *
 * The lesson is the primary owner of canonical content identities: every
 * VocabItem, GrammarPoint, Dialogue, Reading and QuizItem in a lesson lives
 * inside that lesson (containment = ownership) and its `id` must be unique
 * across the whole lesson. Items derived from the Workbook or Teacher Guide
 * attach to the SAME lesson identity and differ only in `provenance` — the
 * schema forbids duplicate ids so parallel identities cannot creep in.
 *
 * Lesson ids are namespaced under their course id (`vision-1-l01` for
 * course `vision-1`), so an id alone shows which canonical course owns it.
 *
 * Cardinality is deliberately permissive in v1 (empty `vocab`/`grammar`/
 * `assessment` arrays parse): lessons are built up over several authoring
 * steps, and shipping requirements (complete sets, review status) are
 * enforced later by the P3.3 build-time validator and the P9.3 provenance
 * gate — not by the structural schema.
 */

import { z } from "zod";
import { bookIdSchema, enTextSchema, faTextSchema, idSchema } from "./common";
import { provenanceSchema } from "./provenance";
import { dialogueSchema, grammarPointSchema, readingSchema, vocabItemSchema } from "./activities";
import { quizItemSchema } from "./quiz-item";

export const lessonSchema = z
  .strictObject({
    id: idSchema,
    courseId: bookIdSchema,
    number: z.number().int().min(1, { message: "Lesson numbers must be positive integers." }),
    title: enTextSchema,
    titleFa: faTextSchema.optional(),
    objectives: z.array(enTextSchema).optional(),
    vocab: z.array(vocabItemSchema),
    grammar: z.array(grammarPointSchema),
    dialogue: dialogueSchema.optional(),
    reading: readingSchema.optional(),
    assessment: z.array(quizItemSchema),
    provenance: provenanceSchema,
  })
  .refine((lesson) => lesson.id.startsWith(`${lesson.courseId}-`), {
    message:
      'Lesson ids must be namespaced under their course id (e.g. "vision-1-l01" for course "vision-1") so canonical identities stay unique per course.',
    path: ["id"],
  })
  .superRefine((lesson, ctx) => {
    /** All item ids in a lesson share one namespace. */
    const seen = new Set<string>();
    const check = (id: string, path: (string | number)[]) => {
      if (seen.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate content id "${id}" — every vocab item, grammar point, dialogue, reading, and quiz item in a lesson must have a unique id (Workbook/Teacher-Guide variants attach to the same ids via provenance).`,
          path,
        });
      } else {
        seen.add(id);
      }
    };
    lesson.vocab.forEach((item, i) => check(item.id, ["vocab", i, "id"]));
    lesson.grammar.forEach((item, i) => check(item.id, ["grammar", i, "id"]));
    if (lesson.dialogue) check(lesson.dialogue.id, ["dialogue", "id"]);
    if (lesson.reading) {
      check(lesson.reading.id, ["reading", "id"]);
      lesson.reading.questions?.forEach((question, i) =>
        check(question.id, ["reading", "questions", i, "id"]),
      );
    }
    lesson.assessment.forEach((question, i) => check(question.id, ["assessment", i, "id"]));
  });

export type Lesson = z.infer<typeof lessonSchema>;
