/**
 * Tests for the provenance block (P3.1) — all data synthetic.
 *
 * Key guarantees under test:
 * - provenance is mandatory and cannot be bypassed;
 * - invalid status/source values are rejected with actionable errors;
 * - reviewer is required exactly when status = "human-reviewed";
 * - no field can express or imply a permission grant (rights decisions
 *   live only in docs/content/RIGHTS_REGISTER.md).
 */

import { describe, expect, it } from "vitest";

import { provenanceSchema, sourceRefSchema } from "./provenance";

const officialSource = {
  kind: "official-textbook",
  component: "student-book",
  book: "vision-1",
  locator: "Lesson 1, p. 12",
} as const;

const authorSource = {
  kind: "author-created",
  note: "Practice drill written for this app by the authoring team.",
} as const;

const thirdPartySource = {
  kind: "third-party",
  registerId: "R-01",
  locator: "Story 3",
} as const;

const validDraft = {
  source: officialSource,
  status: "ai-draft",
} as const;

describe("provenance — valid shapes", () => {
  it("accepts a minimal ai-draft provenance with an official-textbook source", () => {
    const result = provenanceSchema.safeParse(validDraft);
    expect(result.success).toBe(true);
  });

  it("accepts human-reviewed provenance when a reviewer record is present", () => {
    const result = provenanceSchema.safeParse({
      ...validDraft,
      status: "human-reviewed",
      reviewer: { name: "Teacher One", reviewedAt: "2026-10-20" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts an optional edition string", () => {
    const result = provenanceSchema.safeParse({ ...validDraft, edition: "ed. 3, Mehr 1401" });
    expect(result.success).toBe(true);
  });

  it("accepts author-created and third-party sources", () => {
    expect(provenanceSchema.safeParse({ source: authorSource, status: "ai-draft" }).success).toBe(true);
    expect(provenanceSchema.safeParse({ source: thirdPartySource, status: "ai-draft" }).success).toBe(true);
  });

  it("accepts third-party sources without a locator", () => {
    const result = sourceRefSchema.safeParse({ kind: "third-party", registerId: "R-07" });
    expect(result.success).toBe(true);
  });
});

describe("provenance — mandatory and non-bypassable", () => {
  it("rejects a missing provenance object", () => {
    const result = provenanceSchema.safeParse(undefined);
    expect(result.success).toBe(false);
  });

  it("rejects provenance without a source", () => {
    const result = provenanceSchema.safeParse({ status: "ai-draft" });
    expect(result.success).toBe(false);
    const path = result.success === false ? result.error.issues[0].path.join(".") : "";
    expect(path).toBe("source");
  });

  it("rejects provenance without a status", () => {
    const result = provenanceSchema.safeParse({ source: officialSource });
    expect(result.success).toBe(false);
  });
});

describe("provenance — invalid values are rejected with actionable errors", () => {
  it("rejects an unknown status and names the allowed values", () => {
    const result = provenanceSchema.safeParse({ ...validDraft, status: "approved" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join(".")).toBe("status");
      expect(result.error.issues[0].message).toContain("ai-draft");
      expect(result.error.issues[0].message).toContain("human-reviewed");
    }
  });

  it("rejects an unknown source kind and names the allowed kinds", () => {
    const result = provenanceSchema.safeParse({
      source: { kind: "blog", url: "https://example.invalid/post" },
      status: "ai-draft",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("official-textbook");
    }
  });

  it("rejects an unknown textbook component", () => {
    const result = sourceRefSchema.safeParse({
      kind: "official-textbook",
      component: "answer-key",
      book: "vision-1",
      locator: "p. 5",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an official-textbook source without a locator", () => {
    const result = sourceRefSchema.safeParse({
      kind: "official-textbook",
      component: "workbook",
      book: "prospect-2",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path.join(".")).toContain("locator");
    }
  });

  it("rejects a book id outside the supported curriculum scope", () => {
    const result = sourceRefSchema.safeParse({
      kind: "official-textbook",
      component: "student-book",
      book: "mega-goal-1",
      locator: "p. 5",
    });
    expect(result.success).toBe(false);
  });

  it("rejects malformed register ids", () => {
    for (const bad of ["R1", "r-01", "X-01", "R-1", "R-001", ""]) {
      const result = sourceRefSchema.safeParse({ kind: "third-party", registerId: bad });
      expect(result.success, `registerId "${bad}" should be rejected`).toBe(false);
    }
  });

  it("validates register-id FORMAT only — existence is cross-checked against the register by the P3.3 validator", () => {
    // Documented boundary: a well-formed id that may not exist in the
    // register yet is not a schema-level error. Rights decisions are
    // resolved against docs/content/RIGHTS_REGISTER.md at build time.
    const result = sourceRefSchema.safeParse({ kind: "third-party", registerId: "R-99" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty edition string", () => {
    const result = provenanceSchema.safeParse({ ...validDraft, edition: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid review date", () => {
    const result = provenanceSchema.safeParse({
      ...validDraft,
      status: "human-reviewed",
      reviewer: { name: "Teacher One", reviewedAt: "20.10.2026" },
    });
    expect(result.success).toBe(false);
  });
});

describe("provenance — reviewer invariant", () => {
  it("rejects human-reviewed content without a reviewer, pointing at the reviewer field", () => {
    const result = provenanceSchema.safeParse({ ...validDraft, status: "human-reviewed" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.join(".") === "reviewer");
      expect(issue?.message).toContain("human-reviewed");
    }
  });

  it("rejects a reviewer with an empty name", () => {
    const result = provenanceSchema.safeParse({
      ...validDraft,
      status: "human-reviewed",
      reviewer: { name: "  ", reviewedAt: "2026-10-20" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects ai-draft content that claims a reviewer", () => {
    const result = provenanceSchema.safeParse({
      ...validDraft,
      reviewer: { name: "Teacher One", reviewedAt: "2026-10-20" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.join(".") === "reviewer");
      expect(issue?.message).toContain("ai-draft");
    }
  });
});

describe("provenance — rights fields cannot imply a permission grant", () => {
  it("rejects invented rights fields such as rights/permission/license", () => {
    // There is deliberately NO field in the schema that can carry a rights
    // decision; strict objects reject any attempt to add one.
    const attempts = [
      { ...validDraft, rights: "granted" },
      { ...validDraft, permission: "granted-by-author" },
      { ...validDraft, license: "CC-BY" },
      { source: { ...thirdPartySource, rightsDecision: "permission-granted" }, status: "ai-draft" },
    ];
    for (const attempt of attempts) {
      const result = provenanceSchema.safeParse(attempt);
      expect(result.success, `expected rejection of ${JSON.stringify(attempt)}`).toBe(false);
    }
  });

  it("rejects unknown extra fields on the reviewer record", () => {
    const result = provenanceSchema.safeParse({
      ...validDraft,
      status: "human-reviewed",
      reviewer: { name: "Teacher One", reviewedAt: "2026-10-20", approved: true },
    });
    expect(result.success).toBe(false);
  });
});
