/**
 * Tests for the Lesson container (P3.1) — all data synthetic.
 *
 * Guarantees under test: a minimally complete lesson parses; ids are
 * namespaced under the course and unique across the whole lesson;
 * provenance is mandatory and its rules propagate; TypeScript inference
 * is usable without `any` escape hatches.
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import type { z } from "zod";

import {
  gradeSchema,
  courseSchema,
  lessonSchema,
  quizItemSchema,
  provenanceSchema,
  type Lesson,
  type Provenance,
  type QuizItem,
  type ChoiceItem,
} from "./index";
import { omit } from "./test-utils";

const studentBookSource = {
  kind: "official-textbook",
  component: "student-book",
  book: "vision-1",
  locator: "Lesson 1",
} as const;

const draftProv = {
  source: studentBookSource,
  status: "ai-draft",
} as const;

const vocabItem = {
  id: "word-library",
  term: "library",
  meaningFa: "کتابخانه",
  provenance: draftProv,
};

const grammarPoint = {
  id: "grammar-present-simple",
  title: "Present simple",
  explanation: "Use the present simple for habits.",
  examples: [{ en: "I walk to school." }],
  provenance: draftProv,
};

const dialogue = {
  id: "dialogue-l01",
  title: "After class",
  lines: [
    { speaker: "Student", en: "Where is the lab?", fa: "آزمایشگاه کجاست؟" },
    { speaker: "Teacher", en: "Upstairs, next to the library.", fa: "طبقه بالا، کنار کتابخانه." },
  ],
  provenance: draftProv,
};

const reading = {
  id: "reading-l01",
  title: "A busy morning",
  paragraphs: ["Sara gets up early every morning.", "She walks to school with her friend."],
  questions: [
    {
      kind: "truefalse" as const,
      id: "reading-l01-q1",
      prompt: "True or false?",
      statement: "Sara gets up early.",
      answer: true,
      provenance: draftProv,
    },
  ],
  provenance: draftProv,
};

const assessmentItem = {
  kind: "choice" as const,
  id: "q01-choose",
  prompt: "Choose the correct word: I ___ a book every night.",
  options: ["read", "reads"],
  answerIndex: 0,
  provenance: draftProv,
};

/** A minimally complete lesson: identity + provenance + empty sections. */
const minimalLesson = {
  id: "vision-1-l01",
  courseId: "vision-1",
  number: 1,
  title: "Lesson 1",
  vocab: [],
  grammar: [],
  assessment: [],
  provenance: draftProv,
};

const fullLesson = {
  ...minimalLesson,
  titleFa: "درس یک",
  objectives: ["Talk about daily routines"],
  vocab: [vocabItem],
  grammar: [grammarPoint],
  dialogue,
  reading,
  assessment: [assessmentItem],
};

describe("Lesson — valid shapes", () => {
  it("accepts a minimally complete lesson (empty sections allowed in v1)", () => {
    const result = lessonSchema.safeParse(minimalLesson);
    expect(result.success).toBe(true);
  });

  it("accepts a fully populated lesson", () => {
    const result = lessonSchema.safeParse(fullLesson);
    expect(result.success).toBe(true);
  });

  it("accepts provenance that marks the whole lesson human-reviewed", () => {
    const result = lessonSchema.safeParse({
      ...minimalLesson,
      provenance: {
        source: studentBookSource,
        status: "human-reviewed",
        reviewer: { name: "Reviewer Two", reviewedAt: "2026-10-20" },
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("Lesson — canonical identity rules", () => {
  it("rejects lesson ids that are not namespaced under the course id", () => {
    const result = lessonSchema.safeParse({ ...minimalLesson, id: "english-l01" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join(".")).toBe("id");
      expect(result.error.issues[0].message).toContain("namespaced");
    }
  });

  it("rejects a courseId outside the six canonical courses", () => {
    expect(lessonSchema.safeParse({ ...minimalLesson, courseId: "english-10" }).success).toBe(false);
  });

  it("rejects duplicate ids across sections", () => {
    const result = lessonSchema.safeParse({
      ...fullLesson,
      assessment: [{ ...assessmentItem, id: "word-library" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.message.includes("word-library"));
      expect(issue?.message).toContain("unique");
    }
  });

  it("rejects duplicate ids between assessment and reading questions", () => {
    const readingWithClash = {
      ...reading,
      questions: [
        { ...reading.questions[0], id: "q01-choose" },
      ],
    };
    const result = lessonSchema.safeParse({ ...fullLesson, reading: readingWithClash });
    expect(result.success).toBe(false);
  });

  it("rejects a duplicate id inside vocab itself", () => {
    const result = lessonSchema.safeParse({ ...fullLesson, vocab: [vocabItem, { ...vocabItem, term: "teacher" }] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join(".")).toContain("vocab");
    }
  });

  it("rejects a non-positive lesson number", () => {
    expect(lessonSchema.safeParse({ ...minimalLesson, number: 0 }).success).toBe(false);
  });
});

describe("Lesson — mandatory provenance", () => {
  it("rejects a lesson without provenance", () => {
    expect(lessonSchema.safeParse(omit(minimalLesson, "provenance")).success).toBe(false);
  });

  it("rejects lessons containing items without provenance", () => {
    const result = lessonSchema.safeParse({ ...fullLesson, vocab: [omit(vocabItem, "provenance")] });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid provenance value deep inside a nested item", () => {
    const result = lessonSchema.safeParse({
      ...fullLesson,
      assessment: [{ ...assessmentItem, provenance: { ...draftProv, status: "checked" } }],
    });
    expect(result.success).toBe(false);
  });
});

describe("Type inference — usable without any-based escape hatches", () => {
  it("infers the Lesson type from the schema", () => {
    expectTypeOf<Lesson["id"]>().toEqualTypeOf<string>();
    expectTypeOf<Lesson["courseId"]>().toEqualTypeOf<"prospect-1" | "prospect-2" | "prospect-3" | "vision-1" | "vision-2" | "vision-3">();
    expectTypeOf<Lesson["vocab"]>().toEqualTypeOf<Array<z.infer<typeof import("./activities").vocabItemSchema>>>();
  });

  it("infers the provenance contract", () => {
    expectTypeOf<Provenance["status"]>().toEqualTypeOf<"ai-draft" | "human-reviewed">();
    expectTypeOf<Provenance["reviewer"]>().toEqualTypeOf<{ name: string; reviewedAt: string } | undefined>();
    expectTypeOf<Provenance["source"]["kind"]>().toEqualTypeOf<"official-textbook" | "author-created" | "third-party">();
  });

  it("narrows the QuizItem union on the discriminant", () => {
    const parse = (data: unknown) => quizItemSchema.parse(data);
    const item: QuizItem = parse(assessmentItem);
    if (item.kind === "choice") {
      expectTypeOf(item).toEqualTypeOf<ChoiceItem>();
      expectTypeOf(item.answerIndex).toEqualTypeOf<number>();
      expectTypeOf(item.options).toEqualTypeOf<string[]>();
    }
    expectTypeOf<QuizItem["kind"]>().toEqualTypeOf<
      "choice" | "blanks" | "grid" | "tap" | "sorter" | "match" | "truefalse" | "text"
    >();
  });

  it("keeps parsed data assignable to the inferred types (no unknown/any leakage)", () => {
    const lesson: Lesson = lessonSchema.parse(fullLesson);
    const grade = gradeSchema.parse({
      id: "grade-10",
      number: 10,
      line: "vision",
      provenance: draftProv,
    });
    const course = courseSchema.parse({
      id: "vision-1",
      gradeId: "grade-10",
      title: "Vision 1",
      provenance: draftProv,
    });
    const prov: Provenance = provenanceSchema.parse(draftProv);
    expect(lesson.id).toBe("vision-1-l01");
    expect(grade.number).toBe(10);
    expect(course.id).toBe("vision-1");
    expect(prov.status).toBe("ai-draft");
  });
});
