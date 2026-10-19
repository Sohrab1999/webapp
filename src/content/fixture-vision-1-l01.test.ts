/**
 * Fixture validation for the Vision One L1 demo lesson (roadmap task P3.2).
 *
 * The fixture (`content/lessons/vision-1-l01.json`) is the first content
 * file validated against the P3.1 Content Schema v1. These tests cover the
 * three P3.2 acceptance criteria:
 *
 * 1. "fixtures validate" — the file on disk parses against `lessonSchema`.
 * 2. "all English text LTR-safe" — every English string is checked for
 *    bidi control characters (the schema-enforced rule) and, as a stricter
 *    fixture-level property, for RTL-script characters.
 * 3. "Persian glosses render RTL in a test harness" — a string-level render
 *    harness wraps every learner-facing string in the same explicit
 *    direction containers the app shell uses (`dir="ltr" lang="en"` /
 *    `dir="rtl" lang="fa"`, mirroring the P2.1/P2.2 shell conventions),
 *    then asserts every Persian gloss ends up inside an RTL container.
 *
 * The harness is deliberately string-based: the pinned baseline has no DOM
 * test dependency and adding one is outside P3.2's scope (dependency
 * changes are forbidden). Real DOM/browser rendering is owned by the P4/P5
 * shell/player tasks.
 *
 * The fixture itself is original synthetic content (`author-created`,
 * `ai-draft`); these tests also assert it never claims `official-textbook`
 * or `third-party` origin, never invents a reviewer/register id/audio
 * asset, and never smuggles in rights or permission fields. No copyrighted
 * textbook material is reproduced by or in these tests.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  BOOK_GRADE,
  CONTENT_SCHEMA_VERSION,
  lessonSchema,
  lineForGrade,
  type Lesson,
} from "./schema";

/* ------------------------------ fixture ------------------------------- */

const FIXTURE_PATH = fileURLToPath(
  new URL("../../content/lessons/vision-1-l01.json", import.meta.url),
);

const rawFixtureText = readFileSync(FIXTURE_PATH, "utf8");
const baseFixture: unknown = JSON.parse(rawFixtureText);

/** Returns a fresh deep copy of the raw fixture (JSON round-trip type). */
function freshRawFixture(): Record<string, unknown> {
  return structuredClone(baseFixture) as Record<string, unknown>;
}

function parseFixture() {
  return lessonSchema.safeParse(freshRawFixture());
}

/** Parses the fixture and returns the typed lesson, failing with the Zod
 * issue list (paths + messages) if validation fails. */
function expectValidFixture(): Lesson {
  const result = parseFixture();
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Fixture does not match lessonSchema:\n${issues}`);
  }
  return result.data;
}

/* ------------------------- direction safety ---------------------------- */

/** Bidi control characters — the exact set the schema's `enTextSchema`
 * rejects (U+200E, U+200F, U+202A–U+202E, U+2066–U+2069). */
const BIDI_CONTROL_RE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/;

/** RTL-script characters (Hebrew, Arabic and Persian blocks, and their
 * presentation forms). English fields must not contain any of them. */
const RTL_SCRIPT_RE =
  /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

/** Arabic/Persian script characters — Persian glosses must contain them. */
const PERSIAN_SCRIPT_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/* ------------------------- render test harness -------------------------
 * String-level harness mirroring the app shell's direction convention:
 * English renders inside an explicit LTR/en container, Persian inside an
 * explicit RTL/fa container. No DOM dependency involved.
 * ---------------------------------------------------------------------- */

function renderEnglish(text: string): string {
  return `<span dir="ltr" lang="en">${text}</span>`;
}

function renderPersian(text: string): string {
  return `<span dir="rtl" lang="fa">${text}</span>`;
}

/* --------------------- typed walkers over the lesson -------------------
 * The schema types every field's script (`enText` vs `faText`), except the
 * generic `match` pair sides, whose direction is a fixture-level rendering
 * decision: this fixture uses left = English term, right = Persian meaning.
 * The walkers below encode that policy once, type-safely.
 * ---------------------------------------------------------------------- */

type QuizItem = Lesson["assessment"][number];

/** Reading questions share the lesson-wide id namespace with assessment. */
function quizItems(lesson: Lesson): QuizItem[] {
  return [...(lesson.reading?.questions ?? []), ...lesson.assessment];
}

/** Every learner-facing English string except the lesson title. */
function englishTexts(lesson: Lesson): string[] {
  const texts: string[] = [...(lesson.objectives ?? [])];
  for (const item of lesson.vocab) {
    texts.push(item.term);
    if (item.example !== undefined) texts.push(item.example);
  }
  for (const point of lesson.grammar) {
    texts.push(point.title, point.explanation);
    for (const example of point.examples) texts.push(example.en);
  }
  if (lesson.dialogue) {
    texts.push(lesson.dialogue.title);
    for (const line of lesson.dialogue.lines) texts.push(line.en);
  }
  if (lesson.reading) {
    texts.push(lesson.reading.title, ...lesson.reading.paragraphs);
  }
  for (const item of quizItems(lesson)) texts.push(...englishTextsOfQuizItem(item));
  return texts;
}

function englishTextsOfQuizItem(item: QuizItem): string[] {
  const texts: string[] = [item.prompt];
  if (item.feedback) {
    if (item.feedback.correct !== undefined) texts.push(item.feedback.correct);
    if (item.feedback.wrong !== undefined) texts.push(item.feedback.wrong);
  }
  switch (item.kind) {
    case "choice":
      texts.push(...item.options);
      break;
    case "blanks":
      texts.push(item.text, ...item.answers);
      break;
    case "grid":
      texts.push(...item.columns.map((column) => column.label));
      for (const row of item.rows) {
        texts.push(row.statement);
        if (row.why !== undefined) texts.push(row.why);
      }
      break;
    case "tap":
      break; // number-line values are numeric, not learner-facing text
    case "sorter":
      texts.push(...item.regions.map((region) => region.label));
      for (const chip of item.chips) {
        texts.push(chip.text);
        if (chip.why !== undefined) texts.push(chip.why);
      }
      break;
    case "match":
      texts.push(...item.pairs.map((pair) => pair.left));
      break;
    case "truefalse":
      texts.push(item.statement);
      break;
    case "text":
      texts.push(...item.accepted);
      break;
  }
  return texts;
}

/** Every Persian gloss in the lesson. */
function persianTexts(lesson: Lesson): string[] {
  const texts: string[] = [];
  if (lesson.titleFa !== undefined) texts.push(lesson.titleFa);
  for (const item of lesson.vocab) {
    texts.push(item.meaningFa);
    if (item.exampleFa !== undefined) texts.push(item.exampleFa);
  }
  for (const point of lesson.grammar) {
    if (point.titleFa !== undefined) texts.push(point.titleFa);
    if (point.explanationFa !== undefined) texts.push(point.explanationFa);
    for (const example of point.examples) {
      if (example.fa !== undefined) texts.push(example.fa);
    }
  }
  if (lesson.dialogue) {
    if (lesson.dialogue.titleFa !== undefined) texts.push(lesson.dialogue.titleFa);
    for (const line of lesson.dialogue.lines) texts.push(line.fa);
  }
  if (lesson.reading && lesson.reading.titleFa !== undefined) {
    texts.push(lesson.reading.titleFa);
  }
  for (const item of quizItems(lesson)) texts.push(...persianTextsOfQuizItem(item));
  return texts;
}

function persianTextsOfQuizItem(item: QuizItem): string[] {
  const texts: string[] = [];
  if (item.promptFa !== undefined) texts.push(item.promptFa);
  if (item.feedback) {
    if (item.feedback.correctFa !== undefined) texts.push(item.feedback.correctFa);
    if (item.feedback.wrongFa !== undefined) texts.push(item.feedback.wrongFa);
  }
  if (item.kind === "match") {
    texts.push(...item.pairs.map((pair) => pair.right));
  }
  return texts;
}

/** Renders the whole lesson through the direction harness. `persianTexts`
 * already includes the lesson title's Persian gloss, so it is rendered
 * exactly once — via the walker. */
function renderLesson(lesson: Lesson): string {
  const parts: string[] = [renderEnglish(lesson.title), ...englishTexts(lesson).map(renderEnglish)];
  parts.push(...persianTexts(lesson).map(renderPersian));
  return parts.join("\n");
}

/* ------------------------------- tests -------------------------------- */

describe("Vision 1 L1 demo fixture — schema validation (P3.2 AC: fixtures validate)", () => {
  it("parses against the committed lessonSchema", () => {
    const result = parseFixture();
    expect(result.success).toBe(true);
  });

  it("yields a typed Lesson (no any escape hatch) with the intended canonical identity", () => {
    const lesson = expectValidFixture();
    expectTypeOf(lesson).toEqualTypeOf<Lesson>();
    expect(lesson.id).toBe("vision-1-l01");
    expect(lesson.courseId).toBe("vision-1");
    expect(lesson.number).toBe(1);
    expect(CONTENT_SCHEMA_VERSION).toBe(1);
  });

  it("sits in the real Vision 1 curriculum context (grade mapping from the committed schema)", () => {
    const lesson = expectValidFixture();
    expect(BOOK_GRADE[lesson.courseId]).toBe(10); // vision-1 is the grade-10 book
    expect(lineForGrade(BOOK_GRADE[lesson.courseId])).toBe("vision");
  });

  it("has the roadmap-required shape: 10 vocab, 2 grammar, 1 dialogue, 1 reading, 8 assessment", () => {
    const lesson = expectValidFixture();
    expect(lesson.vocab).toHaveLength(10);
    expect(lesson.grammar).toHaveLength(2);
    expect(lesson.dialogue).toBeDefined();
    expect(lesson.reading).toBeDefined();
    expect(lesson.assessment).toHaveLength(8);
    expect(lesson.reading?.questions).toHaveLength(2);
  });

  it("carries provenance on every entity — all author-created, all ai-draft, none reviewed", () => {
    const lesson = expectValidFixture();
    const blocks = [
      lesson.provenance,
      ...lesson.vocab.map((item) => item.provenance),
      ...lesson.grammar.map((point) => point.provenance),
      ...(lesson.dialogue ? [lesson.dialogue.provenance] : []),
      ...(lesson.reading ? [lesson.reading.provenance] : []),
      ...quizItems(lesson).map((item) => item.provenance),
    ];
    // 1 lesson + 10 vocab + 2 grammar + 1 dialogue + 1 reading + 2 reading
    // questions + 8 assessment = 25 provenance blocks.
    expect(blocks).toHaveLength(25);
    for (const block of blocks) {
      expect(block.status).toBe("ai-draft");
      expect(block.reviewer).toBeUndefined();
      expect(block.source.kind).toBe("author-created");
      if (block.source.kind === "author-created") {
        // Every note explicitly disclaims copying from the official book
        // (the lesson-level note phrases it as "no … is copied from", the
        // item-level notes as "not copied from").
        expect(block.source.note).toMatch(/copied from the official Vision 1 Student Book/);
      }
    }
  });

  it("never claims official-textbook or third-party origin, never invents reviewer/edition/register-id/audio or rights fields", () => {
    // The fixture is synthetic: it must not cite the official book (UQ-2:
    // textbook reuse is unresolved) or a register record (R-01 is
    // permission-required, not granted). Reviewer/edition are forbidden on
    // drafts; no media files exist, so no audio refs may be invented; and
    // strict objects leave no room for invented rights fields.
    expect(rawFixtureText).not.toContain('"official-textbook"');
    expect(rawFixtureText).not.toContain('"third-party"');
    expect(rawFixtureText).not.toContain('"registerId"');
    expect(rawFixtureText).not.toContain('"reviewer"');
    expect(rawFixtureText).not.toContain('"edition"');
    expect(rawFixtureText).not.toContain('"audio"');
    expect(rawFixtureText).not.toContain('"rights"');
    expect(rawFixtureText).not.toContain('"permission"');
    expect(rawFixtureText).not.toContain('"license"');
  });

  it("uses lesson-wide unique ids namespaced under the lesson id", () => {
    const lesson = expectValidFixture();
    const ids = [
      lesson.id,
      ...lesson.vocab.map((item) => item.id),
      ...lesson.grammar.map((point) => point.id),
      ...(lesson.dialogue ? [lesson.dialogue.id] : []),
      ...(lesson.reading ? [lesson.reading.id] : []),
      ...quizItems(lesson).map((item) => item.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      if (id !== lesson.id) expect(id).toMatch(/^vision-1-l01-/);
    }
  });
});

describe("Vision 1 L1 demo fixture — direction safety (P3.2 ACs: LTR-safe English, RTL glosses)", () => {
  it("keeps every English string LTR-safe: no bidi controls, no RTL-script characters", () => {
    const lesson = expectValidFixture();
    const texts = [lesson.title, ...englishTexts(lesson)];
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(BIDI_CONTROL_RE.test(text)).toBe(false);
      expect(RTL_SCRIPT_RE.test(text)).toBe(false);
    }
  });

  it("has Persian glosses wherever the schema requires them (vocab meanings, dialogue lines)", () => {
    const lesson = expectValidFixture();
    for (const item of lesson.vocab) {
      expect(PERSIAN_SCRIPT_RE.test(item.meaningFa)).toBe(true);
    }
    expect(lesson.dialogue?.lines.length).toBeGreaterThan(1);
    for (const line of lesson.dialogue?.lines ?? []) {
      expect(PERSIAN_SCRIPT_RE.test(line.fa)).toBe(true);
    }
    expect(persianTexts(lesson).length).toBeGreaterThan(20);
  });

  it("renders every Persian gloss inside an RTL container in the test harness", () => {
    const lesson = expectValidFixture();
    const glosses = persianTexts(lesson);
    expect(glosses.length).toBeGreaterThan(0);
    const html = renderLesson(lesson);
    for (const gloss of glosses) {
      expect(html).toContain(renderPersian(gloss));
      expect(html).not.toContain(renderEnglish(gloss));
    }
    const rtlContainers = html.split('<span dir="rtl" lang="fa">').length - 1;
    expect(rtlContainers).toBe(glosses.length);
  });

  it("renders every English string inside an LTR container in the test harness", () => {
    const lesson = expectValidFixture();
    const texts = [lesson.title, ...englishTexts(lesson)];
    const html = renderLesson(lesson);
    for (const text of texts) {
      expect(html).toContain(renderEnglish(text));
      expect(html).not.toContain(renderPersian(text));
    }
    const ltrContainers = html.split('<span dir="ltr" lang="en">').length - 1;
    expect(ltrContainers).toBe(texts.length);
  });
});

describe("Vision 1 L1 demo fixture — invalid mutations are rejected, not silently accepted", () => {
  /** Applies `mutate` to a fresh copy of the raw fixture and asserts the
   * copy no longer parses. */
  function expectRejected(mutate: (fixture: Record<string, unknown>) => void): void {
    const fixture = freshRawFixture();
    mutate(fixture);
    const result = lessonSchema.safeParse(fixture);
    if (result.success) {
      throw new Error("Expected the mutated fixture to be rejected by lessonSchema.");
    }
    expect(result.success).toBe(false);
  }

  it("rejects a duplicated lesson-wide item id", () => {
    expectRejected((fixture) => {
      const vocab = fixture.vocab as Array<Record<string, unknown>>;
      vocab[1]["id"] = vocab[0]["id"];
    });
  });

  it("rejects a missing provenance block on a nested item", () => {
    expectRejected((fixture) => {
      const vocab = fixture.vocab as Array<Record<string, unknown>>;
      delete vocab[0].provenance;
    });
  });

  it("rejects an empty Persian gloss", () => {
    expectRejected((fixture) => {
      const vocab = fixture.vocab as Array<Record<string, unknown>>;
      vocab[0]["meaningFa"] = "   ";
    });
  });

  it("rejects an out-of-range answerIndex (cross-field rule)", () => {
    expectRejected((fixture) => {
      const assessment = fixture.assessment as Array<Record<string, unknown>>;
      assessment[0]["answerIndex"] = 5;
    });
  });

  it("rejects a blanks item whose marker count does not match its answers (cross-field rule)", () => {
    expectRejected((fixture) => {
      const assessment = fixture.assessment as Array<Record<string, unknown>>;
      assessment[3]["answers"] = ["get up"];
    });
  });

  it("rejects an unknown quiz discriminant", () => {
    expectRejected((fixture) => {
      const assessment = fixture.assessment as Array<Record<string, unknown>>;
      assessment[0]["kind"] = "puzzle";
    });
  });

  it("rejects invented rights/permission fields (strictObject — a grant cannot be asserted)", () => {
    expectRejected((fixture) => {
      const vocab = fixture.vocab as Array<Record<string, unknown>>;
      vocab[0]["rights"] = { permission: "granted" };
    });
  });

  it("rejects a reviewer on ai-draft provenance (unreviewed content stays unreviewed)", () => {
    expectRejected((fixture) => {
      const provenance = fixture.provenance as Record<string, unknown>;
      provenance["reviewer"] = { name: "Synthetic Rejection Probe", reviewedAt: "2026-10-20" };
    });
  });
});
