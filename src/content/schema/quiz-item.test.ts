/**
 * Tests for the QuizItem discriminated union (P3.1) — all data synthetic.
 *
 * Guarantees under test: each of the eight kinds parses when valid; every
 * cross-field constraint (answer indexes, marker counts, key references)
 * rejects with an actionable error; unknown discriminants are rejected;
 * provenance is mandatory on items; English fields reject bidi controls.
 */

import { describe, expect, it } from "vitest";

import { quizItemSchema } from "./quiz-item";
import { omit } from "./test-utils";

const draftProv = {
  source: { kind: "official-textbook", component: "student-book", book: "vision-1", locator: "Lesson 1, Word Bank" },
  status: "ai-draft",
} as const;

const choice = {
  kind: "choice",
  id: "q01-choose",
  prompt: "Choose the correct word: I ___ a book every night.",
  options: ["read", "reads", "reading"],
  answerIndex: 0,
  provenance: draftProv,
};

const blanks = {
  kind: "blanks",
  id: "q02-blanks",
  prompt: "Complete the sentence.",
  text: "She ___ to school by bus every day.",
  answers: ["goes"],
  provenance: draftProv,
};

const grid = {
  kind: "grid",
  id: "q03-grid",
  prompt: "Mark the correct column for each word.",
  columns: [
    { key: "count", label: "Countable" },
    { key: "uncount", label: "Uncountable" },
  ],
  rows: [{ statement: "apple", answerKeys: ["count"] }],
  provenance: draftProv,
};

const tap = {
  kind: "tap",
  id: "q04-tap",
  prompt: "Tap the number that answers the question.",
  values: [1, 2, 3, 4, 5],
  answer: 3,
  provenance: draftProv,
};

const sorter = {
  kind: "sorter",
  id: "q05-sorter",
  prompt: "Put each word into the right group.",
  regions: [
    { id: "food", label: "Food" },
    { id: "school", label: "School things" },
  ],
  chips: [{ text: "apple", answerRegionId: "food" }],
  provenance: draftProv,
};

const match = {
  kind: "match",
  id: "q06-match",
  prompt: "Match each word with its meaning.",
  pairs: [
    { left: "library", right: "کتابخانه" },
    { left: "teacher", right: "معلم" },
  ],
  provenance: draftProv,
};

const truefalse = {
  kind: "truefalse",
  id: "q07-tf",
  prompt: "True or false?",
  statement: "A library is a place where you borrow books.",
  answer: true,
  provenance: draftProv,
};

const text = {
  kind: "text",
  id: "q08-text",
  prompt: "Write the plural of 'child'.",
  accepted: ["children"],
  caseSensitive: false,
  provenance: draftProv,
};

describe("QuizItem — valid items of every kind parse", () => {
  it("parses all eight kinds", () => {
    for (const item of [choice, blanks, grid, tap, sorter, match, truefalse, text]) {
      const result = quizItemSchema.safeParse(item);
      expect(result.success, `${(item as { kind: string }).kind} should parse`).toBe(true);
    }
  });

  it("parses optional bilingual prompt and feedback fields", () => {
    const result = quizItemSchema.safeParse({
      ...choice,
      promptFa: "واژه درست را انتخاب کن.",
      feedback: { correct: "Well done!", correctFa: "آفرین!", wrong: "Try again.", wrongFa: "دوباره تلاش کن." },
    });
    expect(result.success).toBe(true);
  });
});

describe("QuizItem — discriminant", () => {
  it("rejects an unknown kind and names the allowed kinds", () => {
    const result = quizItemSchema.safeParse({ ...choice, kind: "cloze" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues[0].message;
      expect(message).toContain("choice");
      expect(message).toContain("sorter");
    }
  });

  it("rejects a missing kind", () => {
    expect(quizItemSchema.safeParse(omit(choice, "kind")).success).toBe(false);
  });
});

describe("QuizItem — choice", () => {
  it("rejects an answerIndex outside the options", () => {
    const result = quizItemSchema.safeParse({ ...choice, answerIndex: 3 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join(".")).toContain("answerIndex");
    }
  });

  it("rejects fewer than two options", () => {
    expect(quizItemSchema.safeParse({ ...choice, options: ["read"] }).success).toBe(false);
  });
});

describe("QuizItem — blanks", () => {
  it("rejects a marker/answer count mismatch", () => {
    const result = quizItemSchema.safeParse({ ...blanks, answers: ["goes", "went"] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("___");
    }
  });

  it("rejects text without any ___ marker", () => {
    expect(quizItemSchema.safeParse({ ...blanks, text: "She goes to school by bus." }).success).toBe(false);
  });

  it("treats a run of 3+ underscores as one marker", () => {
    expect(quizItemSchema.safeParse({ ...blanks, text: "She ____ to school." }).success).toBe(true);
  });
});

describe("QuizItem — grid", () => {
  it("rejects duplicate column keys", () => {
    const result = quizItemSchema.safeParse({
      ...grid,
      columns: [
        { key: "count", label: "Countable" },
        { key: "count", label: "Countable again" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects answer keys that reference unknown columns", () => {
    const result = quizItemSchema.safeParse({
      ...grid,
      rows: [{ statement: "apple", answerKeys: ["fruit"] }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("column");
    }
  });

  it("rejects fewer than two columns", () => {
    expect(
      quizItemSchema.safeParse({ ...grid, columns: [{ key: "count", label: "Countable" }] }).success,
    ).toBe(false);
  });
});

describe("QuizItem — tap", () => {
  it("rejects an answer that is not one of the values", () => {
    const result = quizItemSchema.safeParse({ ...tap, answer: 9 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join(".")).toContain("answer");
    }
  });

  it("rejects duplicate number-line values", () => {
    expect(quizItemSchema.safeParse({ ...tap, values: [1, 2, 2, 3] }).success).toBe(false);
  });
});

describe("QuizItem — sorter", () => {
  it("rejects chips that reference unknown regions", () => {
    const result = quizItemSchema.safeParse({
      ...sorter,
      chips: [{ text: "apple", answerRegionId: "kitchen" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate region ids", () => {
    expect(
      quizItemSchema.safeParse({
        ...sorter,
        regions: [
          { id: "food", label: "Food" },
          { id: "food", label: "Food again" },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("QuizItem — match / truefalse / text", () => {
  it("rejects a matching item with fewer than two pairs", () => {
    expect(
      quizItemSchema.safeParse({ ...match, pairs: [{ left: "library", right: "کتابخانه" }] }).success,
    ).toBe(false);
  });

  it("rejects repeated left sides in a matching item", () => {
    expect(
      quizItemSchema.safeParse({
        ...match,
        pairs: [
          { left: "library", right: "کتابخانه" },
          { left: "library", right: "کتاب" },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects a non-boolean truefalse answer", () => {
    expect(quizItemSchema.safeParse({ ...truefalse, answer: "yes" }).success).toBe(false);
  });

  it("rejects a text item with no accepted answers", () => {
    expect(quizItemSchema.safeParse({ ...text, accepted: [] }).success).toBe(false);
  });
});

describe("QuizItem — shared base fields", () => {
  it("requires provenance on every item kind", () => {
    const result = quizItemSchema.safeParse(omit(choice, "provenance"));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join(".").includes("provenance"))).toBe(true);
    }
  });

  it("propagates provenance rules into items (reviewer invariant)", () => {
    const result = quizItemSchema.safeParse({
      ...choice,
      provenance: { ...draftProv, status: "human-reviewed" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects bidi control characters in English prompts", () => {
    const result = quizItemSchema.safeParse({ ...choice, prompt: "Choose\u200F the word." });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("bidi");
    }
  });

  it("rejects empty identifiers and malformed ids", () => {
    expect(quizItemSchema.safeParse({ ...choice, id: "" }).success).toBe(false);
    expect(quizItemSchema.safeParse({ ...choice, id: "Q 01" }).success).toBe(false);
  });
});
