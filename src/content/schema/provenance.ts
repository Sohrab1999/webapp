/**
 * Provenance (roadmap task P3.1, schema v1).
 *
 * Every content entity defined by P3.1 (Grade, Course, Lesson, VocabItem,
 * GrammarPoint, Dialogue, Reading, QuizItem) carries a MANDATORY
 * `provenance` field of this shape:
 *
 *   provenance: {
 *     source:   <where the content comes from — see `sourceRefSchema`>,
 *     status:   "ai-draft" | "human-reviewed",
 *     reviewer: { name, reviewedAt }   // required ⇔ status = "human-reviewed"
 *     edition?: string                 // e.g. "ed. 3, Mehr 1401"
 *   }
 *
 * Design rules (roadmap + rights register):
 * - Provenance is never optional, never defaulted, and cannot be bypassed:
 *   there is no permissive fallback anywhere in the schema.
 * - `status = "human-reviewed"` requires a recorded reviewer (roadmap P6.4,
 *   P8.3: "reviewer recorded on human-reviewed"); `status = "ai-draft"`
 *   forbids one, so the two states cannot be mixed.
 * - Rights decisions are NOT stored in content files. The single source of
 *   truth for rights status is `docs/content/RIGHTS_REGISTER.md`; content
 *   may only REFERENCE a register record by id. The schema therefore has no
 *   field that could express "permission granted" — a grant can never be
 *   implied or asserted from content data alone. (Build-time cross-checking
 *   of register ids against the register belongs to the P3.3 validator.)
 */

import { z } from "zod";
import { bookIdSchema, enTextSchema } from "./common";

/**
 * Reference to a record in the content rights register
 * (`docs/content/RIGHTS_REGISTER.md`, records R-01…R-09 at the time of
 * writing). Format-only validation: whether the referenced record exists
 * (and what it permits) is verified against the register itself, not here.
 */
export const registerIdSchema = z
  .string()
  .trim()
  .regex(/^R-\d{2}$/, {
    message:
      'Third-party sources must reference the content rights register by record id ("R-01" … "R-99"); see docs/content/RIGHTS_REGISTER.md.',
  });

export type RegisterId = z.infer<typeof registerIdSchema>;

/**
 * Where a piece of content comes from.
 *
 * - `official-textbook`: derived from the official MoE textbook line.
 *   `component` distinguishes the Student Book (the primary owner of
 *   canonical content identities), the Workbook and the Teacher Guide.
 *   `locator` cites where in the book the content originates (e.g.
 *   "Lesson 1, p. 12") — author-supplied, rendered for teachers.
 * - `author-created`: original material written for this app (curriculum
 *   maps, newly authored drills). `note` describes the origin in one line.
 * - `third-party`: material from an external source recorded in the rights
 *   register (`registerId`). Optional `locator` cites where inside the
 *   third-party material the content originates (e.g. "Story 3").
 */
export const sourceRefSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("official-textbook"),
    component: z.enum(["student-book", "workbook", "teacher-guide"]),
    book: bookIdSchema,
    locator: enTextSchema,
  }),
  z.strictObject({
    kind: z.literal("author-created"),
    note: z.string().trim().min(1, {
      message: 'Author-created sources must include a short "note" describing what was created and by whom.',
    }),
  }),
  z.strictObject({
    kind: z.literal("third-party"),
    registerId: registerIdSchema,
    locator: enTextSchema.optional(),
  }),
]);

export type ContentSource = z.infer<typeof sourceRefSchema>;

/** Review state of a content item (roadmap §1.1 provenance labels). */
export const reviewStatusSchema = z.enum(["ai-draft", "human-reviewed"]);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

/** A recorded human review (required exactly when status = "human-reviewed"). */
export const reviewerSchema = z.strictObject({
  name: z.string().trim().min(1, { message: "Reviewer name must not be empty." }),
  reviewedAt: z.iso.date(),
});

export type Reviewer = z.infer<typeof reviewerSchema>;

/**
 * Mandatory provenance block carried by every content entity.
 * See the file header for the design rules.
 */
export const provenanceSchema = z
  .strictObject({
    source: sourceRefSchema,
    status: reviewStatusSchema,
    reviewer: reviewerSchema.optional(),
    edition: z
      .string()
      .trim()
      .min(1, { message: 'Edition must not be empty when present (e.g. "ed. 3, Mehr 1401").' })
      .optional(),
  })
  .refine((prov) => !(prov.status === "human-reviewed" && prov.reviewer === undefined), {
    message:
      'Content marked "human-reviewed" must record a reviewer (name + review date). Review without sign-off evidence is not allowed.',
    path: ["reviewer"],
  })
  .refine((prov) => !(prov.status === "ai-draft" && prov.reviewer !== undefined), {
    message:
      'Content marked "ai-draft" is not reviewed yet; remove the reviewer record or change the status to "human-reviewed".',
    path: ["reviewer"],
  });

export type Provenance = z.infer<typeof provenanceSchema>;
