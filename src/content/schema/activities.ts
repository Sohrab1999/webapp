/**
 * Lesson activity entities: VocabItem, GrammarPoint, Dialogue, Reading
 * (roadmap task P3.1, schema v1).
 *
 * Naming carries direction: fields without a suffix hold English (LTR)
 * text (`enTextSchema`), `*Fa` fields hold Persian text (`faTextSchema`).
 * Persian glosses are mandatory where the product depends on them
 * (every vocabulary item and every dialogue line — the dialogue player
 * is "turn-by-turn audio + Persian translation toggle", roadmap P5.3).
 *
 * Items do not carry a `lessonId`: they are owned by the lesson that
 * contains them (containment = ownership), which is what keeps the Student
 * Book the single owner of canonical content identities. Workbook /
 * Teacher-Guide / third-party variants of the same content attach to the
 * same lesson identity and differ only in `provenance`.
 */

import { z } from "zod";
import { assetRefSchema, enTextSchema, faTextSchema, idSchema } from "./common";
import { provenanceSchema } from "./provenance";
import { quizItemSchema } from "./quiz-item";

/** Part-of-speech tag for vocabulary items (kept small and closed). */
export const partOfSpeechSchema = z.enum([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "preposition",
  "phrase",
  "other",
]);
export type PartOfSpeech = z.infer<typeof partOfSpeechSchema>;

export const vocabItemSchema = z
  .strictObject({
    id: idSchema,
    term: enTextSchema,
    meaningFa: faTextSchema,
    pos: partOfSpeechSchema.optional(),
    example: enTextSchema.optional(),
    exampleFa: faTextSchema.optional(),
    provenance: provenanceSchema,
  })
  .refine((item) => !(item.exampleFa !== undefined && item.example === undefined), {
    message: 'exampleFa can only be used together with its English "example".',
    path: ["exampleFa"],
  });

export type VocabItem = z.infer<typeof vocabItemSchema>;

export const grammarExampleSchema = z.strictObject({
  en: enTextSchema,
  fa: faTextSchema.optional(),
});
export type GrammarExample = z.infer<typeof grammarExampleSchema>;

export const grammarPointSchema = z.strictObject({
  id: idSchema,
  title: enTextSchema,
  titleFa: faTextSchema.optional(),
  explanation: enTextSchema,
  explanationFa: faTextSchema.optional(),
  examples: z
    .array(grammarExampleSchema)
    .min(1, { message: "A grammar point needs at least one example." }),
  provenance: provenanceSchema,
});

export type GrammarPoint = z.infer<typeof grammarPointSchema>;

/** One dialogue turn: speaker, English text, Persian translation, audio ref. */
export const dialogueLineSchema = z.strictObject({
  speaker: z.string().trim().min(1, { message: "Dialogue lines must name the speaker." }),
  en: enTextSchema,
  fa: faTextSchema,
  audio: assetRefSchema.optional(),
});
export type DialogueLine = z.infer<typeof dialogueLineSchema>;

export const dialogueSchema = z.strictObject({
  id: idSchema,
  title: enTextSchema,
  titleFa: faTextSchema.optional(),
  lines: z
    .array(dialogueLineSchema)
    .min(2, { message: "A dialogue needs at least two lines (one speaker cannot hold a conversation)." }),
  provenance: provenanceSchema,
});

export type Dialogue = z.infer<typeof dialogueSchema>;

/**
 * A reading passage with an optional question set. Paragraphs are English
 * (the passage itself is LTR content); questions reuse the QuizItem union.
 */
export const readingSchema = z.strictObject({
  id: idSchema,
  title: enTextSchema,
  titleFa: faTextSchema.optional(),
  paragraphs: z.array(enTextSchema).min(1, { message: "A reading needs at least one paragraph." }),
  questions: z
    .array(quizItemSchema)
    .min(1, { message: "When a reading has questions, it needs at least one." })
    .optional(),
  provenance: provenanceSchema,
});

export type Reading = z.infer<typeof readingSchema>;
