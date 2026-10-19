/**
 * QuizItem — assessment/practice items (roadmap task P3.1, schema v1).
 *
 * A discriminated union on `kind`. Five kinds map to the vendored Papermorph
 * engine's built-in question primitives (assessment V11; engine.js
 * `choice/blanks/grid/tap/sorter`), three are app-native kinds for the
 * interactions the engine does not cover (assessment §2 limitation 9:
 * text-entry judging and language matching need app-native activities):
 *
 *   kind        engine primitive          app runner
 *   ----------  ------------------------  -------------------------------
 *   choice      choice(opts, right, ...)  option buttons
 *   blanks      blanks(rows)¹             fill-the-blank inputs
 *   grid        grid(rows, cols)          toggle-grid rows
 *   tap         tap(values, right)        number-line tap
 *   sorter      sorter(items)             drag chips into labeled regions
 *   match       —                         pair matching (term ↔ meaning)
 *   truefalse   —                         true/false statements
 *   text        —                         typed answer with accepted variants
 *
 * ¹ Engine `blanks` judges exact numeric/fraction answers; in this schema a
 * `blanks` item carries exact expected strings, so numeric items can be
 * rendered by the engine primitive 1:1 while text answers are judged by the
 * app-native runner.
 *
 * All kinds share the base fields: `id` (unique within the owning lesson —
 * the engine records first-attempt scores under the question id, `SCORE[id]`),
 * `prompt`, optional bilingual prompt/feedback, and MANDATORY `provenance`.
 */

import { z } from "zod";
import { enTextSchema, faTextSchema, idSchema } from "./common";
import { provenanceSchema } from "./provenance";

/** Bilingual feedback a runner may show after checking an item. */
const feedbackSchema = z.strictObject({
  correct: enTextSchema.optional(),
  correctFa: faTextSchema.optional(),
  wrong: enTextSchema.optional(),
  wrongFa: faTextSchema.optional(),
});

export type Feedback = z.infer<typeof feedbackSchema>;

/** Fields shared by every quiz item, independent of `kind`. */
const quizItemBase = {
  id: idSchema,
  prompt: enTextSchema,
  promptFa: faTextSchema.optional(),
  feedback: feedbackSchema.optional(),
  provenance: provenanceSchema,
};

/* ---------------------------- engine kinds ---------------------------- */

/**
 * Engine `choice`: option buttons, exactly one correct.
 * (Per-option wrong-feedback texts are an engine render detail; v1 keeps
 * item-level feedback only.)
 */
const choiceItemSchema = z
  .strictObject({
    kind: z.literal("choice"),
    ...quizItemBase,
    options: z.array(enTextSchema).min(2, { message: "A choice item needs at least two options." }),
    answerIndex: z.number().int().min(0, { message: "answerIndex must be a non-negative integer." }),
  })
  .refine((item) => item.answerIndex < item.options.length, {
    message: "answerIndex must point at one of the item's options.",
    path: ["answerIndex"],
  });

/**
 * Engine `blanks`: fill-in-the-blank with exact expected answers.
 * `text` must contain one "___" marker (3+ underscores) per answer.
 */
const blanksItemSchema = z
  .strictObject({
    kind: z.literal("blanks"),
    ...quizItemBase,
    text: enTextSchema,
    answers: z
      .array(z.string().trim().min(1, { message: "Blank answers must not be empty." }))
      .min(1, { message: "A blanks item needs at least one answer." }),
  })
  .refine((item) => (item.text.match(/_{3,}/g)?.length ?? 0) === item.answers.length, {
    message: 'The number of "___" markers in "text" must equal the number of "answers".',
    path: ["answers"],
  });

/** Engine `grid`: rows of toggleable columns; a row is right when its picked
 * key set equals `answerKeys`. At most 9 columns (single-key shortcuts). */
const gridItemSchema = z
  .strictObject({
    kind: z.literal("grid"),
    ...quizItemBase,
    columns: z
      .array(
        z.strictObject({
          key: z.string().trim().min(1, { message: "Grid column keys must not be empty." }),
          label: z.string().trim().min(1, { message: "Grid column labels must not be empty." }),
        }),
      )
      .min(2, { message: "A grid item needs at least two columns." })
      .max(9, { message: "A grid item supports at most 9 columns (single-key shortcuts)." }),
    rows: z
      .array(
        z.strictObject({
          statement: z.string().trim().min(1, { message: "Grid row statements must not be empty." }),
          answerKeys: z
            .array(z.string().trim().min(1))
            .min(1, { message: "Each grid row needs at least one answer key." }),
          why: z.string().trim().min(1).optional(),
        }),
      )
      .min(1, { message: "A grid item needs at least one row." }),
    multi: z.boolean().optional(),
  })
  .refine((item) => new Set(item.columns.map((c) => c.key)).size === item.columns.length, {
    message: "Grid column keys must be unique.",
    path: ["columns"],
  })
  .refine(
    (item) => {
      const keys = new Set(item.columns.map((c) => c.key));
      return item.rows.every((row) => row.answerKeys.every((k) => keys.has(k)));
    },
    { message: "Every grid row answer key must reference one of the item's column keys.", path: ["rows"] },
  );

/** Engine `tap`: tap the correct point on a number line. */
const tapItemSchema = z
  .strictObject({
    kind: z.literal("tap"),
    ...quizItemBase,
    values: z
      .array(z.number().finite({ message: "Number-line values must be finite numbers." }))
      .min(2, { message: "A tap item needs at least two number-line values." }),
    answer: z.number().finite({ message: "The tap answer must be a finite number." }),
  })
  .refine((item) => item.values.includes(item.answer), {
    message: "The tap answer must be one of the item's number-line values.",
    path: ["answer"],
  })
  .refine((item) => new Set(item.values).size === item.values.length, {
    message: "Number-line values must not repeat.",
    path: ["values"],
  });

/** Engine `sorter`: drag chips into labeled regions. */
const sorterItemSchema = z
  .strictObject({
    kind: z.literal("sorter"),
    ...quizItemBase,
    regions: z
      .array(
        z.strictObject({
          id: idSchema,
          label: z.string().trim().min(1, { message: "Sorter region labels must not be empty." }),
        }),
      )
      .min(2, { message: "A sorter item needs at least two regions." }),
    chips: z
      .array(
        z.strictObject({
          text: z.string().trim().min(1, { message: "Sorter chip texts must not be empty." }),
          answerRegionId: idSchema,
          why: z.string().trim().min(1).optional(),
        }),
      )
      .min(1, { message: "A sorter item needs at least one chip." }),
  })
  .refine((item) => new Set(item.regions.map((r) => r.id)).size === item.regions.length, {
    message: "Sorter region ids must be unique.",
    path: ["regions"],
  })
  .refine(
    (item) => {
      const regionIds = new Set(item.regions.map((r) => r.id));
      return item.chips.every((chip) => regionIds.has(chip.answerRegionId));
    },
    { message: "Every sorter chip must reference one of the item's region ids.", path: ["chips"] },
  );

/* -------------------------- app-native kinds -------------------------- */

/** App-native pair matching (e.g. English term ↔ Persian meaning). */
const matchItemSchema = z
  .strictObject({
    kind: z.literal("match"),
    ...quizItemBase,
    pairs: z
      .array(
        z.strictObject({
          left: z.string().trim().min(1, { message: "Match pair left sides must not be empty." }),
          right: z.string().trim().min(1, { message: "Match pair right sides must not be empty." }),
          why: z.string().trim().min(1).optional(),
        }),
      )
      .min(2, { message: "A matching item needs at least two pairs." }),
  })
  .refine(
    (item) => {
      const lefts = item.pairs.map((p) => p.left);
      return new Set(lefts).size === lefts.length;
    },
    { message: "Matching pairs must not repeat the left side.", path: ["pairs"] },
  );

/** App-native true/false statement. */
const trueFalseItemSchema = z.strictObject({
  kind: z.literal("truefalse"),
  ...quizItemBase,
  statement: z.string().trim().min(1, { message: "A true/false statement must not be empty." }),
  answer: z.boolean(),
});

/**
 * App-native typed answer with accepted variants (spelling variants,
 * Persian meaning entries — assessment §2 limitation 9).
 */
const textItemSchema = z.strictObject({
  kind: z.literal("text"),
  ...quizItemBase,
  accepted: z
    .array(z.string().trim().min(1, { message: "Accepted answers must not be empty." }))
    .min(1, { message: "A text item needs at least one accepted answer." }),
  caseSensitive: z.boolean().optional(),
});

/* ------------------------------- union -------------------------------- */

export const quizItemSchema = z.discriminatedUnion("kind", [
  choiceItemSchema,
  blanksItemSchema,
  gridItemSchema,
  tapItemSchema,
  sorterItemSchema,
  matchItemSchema,
  trueFalseItemSchema,
  textItemSchema,
]);

export type QuizItem = z.infer<typeof quizItemSchema>;

export type ChoiceItem = z.infer<typeof choiceItemSchema>;
export type BlanksItem = z.infer<typeof blanksItemSchema>;
export type GridItem = z.infer<typeof gridItemSchema>;
export type TapItem = z.infer<typeof tapItemSchema>;
export type SorterItem = z.infer<typeof sorterItemSchema>;
export type MatchItem = z.infer<typeof matchItemSchema>;
export type TrueFalseItem = z.infer<typeof trueFalseItemSchema>;
export type TextItem = z.infer<typeof textItemSchema>;
