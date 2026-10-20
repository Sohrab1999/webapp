/**
 * Tests for lesson activities: VocabItem, GrammarPoint, Dialogue, Reading
 * (P3.1) — all data synthetic (no textbook passages, no real names).
 */

import { describe, expect, it } from "vitest";

import { dialogueSchema, grammarPointSchema, readingSchema, vocabItemSchema } from "./activities";
import { omit } from "./test-utils";

const draftProv = {
  source: { kind: "author-created", note: "Synthetic practice content written for this app." },
  status: "ai-draft",
} as const;

const validVocab = {
  id: "word-library",
  term: "library",
  meaningFa: "کتابخانه",
  pos: "noun",
  example: "The library opens at eight.",
  exampleFa: "کتابخانه ساعت هشت باز می‌شود.",
  provenance: draftProv,
};

const validGrammar = {
  id: "grammar-present-simple",
  title: "Present simple",
  titleFa: "زمان حال ساده",
  explanation: "Use the present simple for habits and routines.",
  explanationFa: "زمان حال ساده برای عادت‌ها و کارهای روزمره به کار می‌رود.",
  examples: [
    { en: "I walk to school.", fa: "من به مدرسه پیاده می‌روم." },
  ],
  provenance: draftProv,
};

const validDialogue = {
  id: "dialogue-l01",
  title: "After class",
  titleFa: "بعد از کلاس",
  lines: [
    { speaker: "Student", en: "Excuse me, where is the lab?", fa: "ببخشید، آزمایشگاه کجاست؟" },
    { speaker: "Teacher", en: "It is upstairs, next to the library.", fa: "طبقه بالاست، کنار کتابخانه." },
  ],
  provenance: draftProv,
};

const validReading = {
  id: "reading-l01",
  title: "A busy morning",
  paragraphs: [
    "Sara gets up early every morning. She eats breakfast and walks to school.",
    "Her first class starts at eight. She likes English best.",
  ],
  provenance: draftProv,
};

describe("VocabItem", () => {
  it("accepts a valid item", () => {
    expect(vocabItemSchema.safeParse(validVocab).success).toBe(true);
  });

  it("accepts an item without optional fields", () => {
    const minimal = omit(validVocab, "pos");
    expect(vocabItemSchema.safeParse(omit(omit(minimal, "example"), "exampleFa")).success).toBe(true);
  });

  it("requires the Persian meaning", () => {
    const result = vocabItemSchema.safeParse(omit(validVocab, "meaningFa"));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join(".")).toBe("meaningFa");
    }
  });

  it("rejects an unknown part-of-speech tag", () => {
    expect(vocabItemSchema.safeParse({ ...validVocab, pos: "conjunction?" }).success).toBe(false);
  });

  it("rejects exampleFa without example", () => {
    expect(vocabItemSchema.safeParse(omit(validVocab, "example")).success).toBe(false);
  });

  it("rejects bidi control characters in the English term", () => {
    expect(vocabItemSchema.safeParse({ ...validVocab, term: "lib\u200Frary" }).success).toBe(false);
  });

  it("rejects missing provenance", () => {
    expect(vocabItemSchema.safeParse(omit(validVocab, "provenance")).success).toBe(false);
  });
});

describe("GrammarPoint", () => {
  it("accepts a valid point", () => {
    expect(grammarPointSchema.safeParse(validGrammar).success).toBe(true);
  });

  it("requires at least one example", () => {
    const result = grammarPointSchema.safeParse({ ...validGrammar, examples: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("example");
    }
  });

  it("requires an explanation", () => {
    expect(grammarPointSchema.safeParse(omit(validGrammar, "explanation")).success).toBe(false);
  });
});

describe("Dialogue", () => {
  it("accepts a valid dialogue", () => {
    expect(dialogueSchema.safeParse(validDialogue).success).toBe(true);
  });

  it("accepts lines with repository-relative audio references", () => {
    const result = dialogueSchema.safeParse({
      ...validDialogue,
      lines: validDialogue.lines.map((line, i) => ({ ...line, audio: `audio/vision-1/l01/line-${i + 1}.mp3` })),
    });
    expect(result.success).toBe(true);
  });

  it("requires at least two lines", () => {
    const result = dialogueSchema.safeParse({ ...validDialogue, lines: [validDialogue.lines[0]] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("two lines");
    }
  });

  it("requires the Persian translation on every line", () => {
    expect(
      dialogueSchema.safeParse({ ...validDialogue, lines: [omit(validDialogue.lines[0], "fa"), validDialogue.lines[1]] })
        .success,
    ).toBe(false);
  });

  it("rejects unsafe audio references", () => {
    for (const bad of ["/abs/path.mp3", "../outside.mp3", "audio\\win.mp3"]) {
      const result = dialogueSchema.safeParse({
        ...validDialogue,
        lines: [{ ...validDialogue.lines[0], audio: bad }, validDialogue.lines[1]],
      });
      expect(result.success, `audio "${bad}" should be rejected`).toBe(false);
    }
  });

  it("requires a speaker on every line", () => {
    const result = dialogueSchema.safeParse({
      ...validDialogue,
      lines: [{ en: "Hi.", fa: "سلام." }, validDialogue.lines[1]],
    });
    expect(result.success).toBe(false);
  });
});

describe("Reading", () => {
  it("accepts a reading without questions", () => {
    expect(readingSchema.safeParse(validReading).success).toBe(true);
  });

  it("accepts a reading with a question set (nested QuizItems)", () => {
    const result = readingSchema.safeParse({
      ...validReading,
      questions: [
        {
          kind: "truefalse",
          id: "reading-l01-q1",
          prompt: "True or false?",
          statement: "Sara walks to school.",
          answer: true,
          provenance: draftProv,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty question set", () => {
    expect(readingSchema.safeParse({ ...validReading, questions: [] }).success).toBe(false);
  });

  it("rejects invalid nested quiz items", () => {
    const result = readingSchema.safeParse({
      ...validReading,
      questions: [
        {
          kind: "truefalse",
          id: "reading-l01-q1",
          prompt: "True or false?",
          statement: "Sara walks to school.",
          answer: "maybe",
          provenance: draftProv,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one paragraph", () => {
    expect(readingSchema.safeParse({ ...validReading, paragraphs: [] }).success).toBe(false);
  });
});
