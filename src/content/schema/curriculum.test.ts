/**
 * Tests for Grade and Course (P3.1) — all data synthetic.
 *
 * Guarantees under test: canonical id rules (grade-<n>, course id = book id),
 * the grade↔line and book↔grade mappings, and mandatory provenance.
 */

import { describe, expect, it } from "vitest";

import { courseSchema, gradeSchema } from "./curriculum";
import { omit } from "./test-utils";

const draftProv = {
  source: { kind: "official-textbook", component: "student-book", book: "vision-1", locator: "front matter" },
  status: "ai-draft",
} as const;

const validGrade = {
  id: "grade-10",
  number: 10,
  line: "vision",
  provenance: draftProv,
};

const validCourse = {
  id: "vision-1",
  gradeId: "grade-10",
  title: "Vision 1",
  titleFa: "ویژن یک",
  provenance: draftProv,
};

describe("Grade", () => {
  it("accepts a valid grade", () => {
    expect(gradeSchema.safeParse(validGrade).success).toBe(true);
  });

  it("accepts each Prospect and Vision grade", () => {
    const lines = { 7: "prospect", 8: "prospect", 9: "prospect", 10: "vision", 11: "vision", 12: "vision" };
    for (const n of [7, 8, 9, 10, 11, 12]) {
      const result = gradeSchema.safeParse({
        id: `grade-${n}`,
        number: n,
        line: lines[n as keyof typeof lines],
        provenance: draftProv,
      });
      expect(result.success, `grade-${n} should parse`).toBe(true);
    }
  });

  it("rejects a grade number outside 7–12", () => {
    expect(gradeSchema.safeParse({ ...validGrade, id: "grade-6", number: 6 }).success).toBe(false);
    expect(gradeSchema.safeParse({ ...validGrade, id: "grade-13", number: 13 }).success).toBe(false);
  });

  it("rejects an id that does not match the grade number", () => {
    const result = gradeSchema.safeParse({ ...validGrade, id: "grade-9" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join(".")).toBe("id");
      expect(result.error.issues[0].message).toContain("grade-");
    }
  });

  it("rejects a line that contradicts the grade number", () => {
    const result = gradeSchema.safeParse({ ...validGrade, line: "prospect" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Prospect");
    }
  });

  it("rejects missing provenance", () => {
    expect(gradeSchema.safeParse(omit(validGrade, "provenance")).success).toBe(false);
  });
});

describe("Course", () => {
  it("accepts a valid course whose id is the official book id", () => {
    expect(courseSchema.safeParse(validCourse).success).toBe(true);
  });

  it("rejects a course id that is not an official book id", () => {
    const result = courseSchema.safeParse({ ...validCourse, id: "english-grade10" });
    expect(result.success).toBe(false);
  });

  it("rejects a course attached to the wrong grade (book↔grade mapping)", () => {
    const result = courseSchema.safeParse({ ...validCourse, gradeId: "grade-9" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join(".")).toBe("gradeId");
      expect(result.error.issues[0].message).toContain("vision-1");
    }
  });

  it("accepts Workbook-derived course provenance for the same canonical identity", () => {
    const result = courseSchema.safeParse({
      ...validCourse,
      provenance: {
        source: { kind: "official-textbook", component: "workbook", book: "vision-1", locator: "Unit 1" },
        status: "ai-draft",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(courseSchema.safeParse({ ...validCourse, title: "" }).success).toBe(false);
  });

  it("rejects missing provenance", () => {
    expect(courseSchema.safeParse(omit(validCourse, "provenance")).success).toBe(false);
  });
});
