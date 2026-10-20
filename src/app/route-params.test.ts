/**
 * Unit tests for the P4.1 shell-route parameter validation
 * (`src/app/route-params.ts`). Pure logic — no DOM, no Next.js runtime.
 *
 * The route pages turn a null result into `notFound()`, so every assertion
 * here is also a statement about which URLs the shell serves vs. 404s.
 */

import { describe, expect, expectTypeOf, it } from "vitest";

import {
  parseGradeParam,
  parseLessonParam,
} from "./route-params";
import type { GradeId } from "../content/schema/curriculum";

describe("parseGradeParam", () => {
  it("accepts all six canonical grade ids from the P3.1 schema", () => {
    for (const id of [
      "grade-7",
      "grade-8",
      "grade-9",
      "grade-10",
      "grade-11",
      "grade-12",
    ] as const) {
      expect(parseGradeParam(id)).toBe(id);
    }
  });

  it("returns a GradeId-typed value for a valid param", () => {
    expectTypeOf(parseGradeParam("grade-10")).toEqualTypeOf<GradeId | null>();
  });

  it("rejects out-of-range grade numbers", () => {
    expect(parseGradeParam("grade-6")).toBeNull();
    expect(parseGradeParam("grade-13")).toBeNull();
  });

  it("rejects non-canonical formats (bare number, uppercase, whitespace, garbage)", () => {
    expect(parseGradeParam("10")).toBeNull();
    expect(parseGradeParam("GRADE-10")).toBeNull();
    expect(parseGradeParam(" grade-10")).toBeNull();
    expect(parseGradeParam("grade-10 ")).toBeNull();
    expect(parseGradeParam("grade")).toBeNull();
    expect(parseGradeParam("grade-10x")).toBeNull();
    expect(parseGradeParam("")).toBeNull();
  });
});

describe("parseLessonParam", () => {
  it("accepts well-formed kebab-case content ids", () => {
    expect(parseLessonParam("vision-1-l01")).toBe("vision-1-l01");
    expect(parseLessonParam("prospect-1-l02")).toBe("prospect-1-l02");
    expect(parseLessonParam("word-library")).toBe("word-library");
  });

  it("rejects malformed ids (uppercase, underscores, leading/trailing hyphen, double hyphen, empty)", () => {
    expect(parseLessonParam("Vision-1-L01")).toBeNull();
    expect(parseLessonParam("vision_1_l01")).toBeNull();
    expect(parseLessonParam("-vision-1")).toBeNull();
    expect(parseLessonParam("vision-1-")).toBeNull();
    expect(parseLessonParam("vision--1")).toBeNull();
    expect(parseLessonParam("")).toBeNull();
  });

  it("trims surrounding whitespace before validating (idSchema semantics)", () => {
    expect(parseLessonParam("  vision-1-l01  ")).toBe("vision-1-l01");
  });

  it("does not validate registry existence or grade consistency (documented P4.3 scope)", () => {
    // A well-formed but unknown lesson id parses fine; the route renders the
    // structural placeholder. Registry checks belong to the P4.3 lesson list.
    expect(parseLessonParam("vision-9-l99")).toBe("vision-9-l99");
  });
});
