/**
 * Rights-register parser for the P3.3 build-time content validator.
 *
 * The authoritative rights record is `docs/content/RIGHTS_REGISTER.md`
 * (roadmap P1.2, gate C2). Content files may only REFERENCE register
 * records by id (`third-party` provenance, `registerId: "R-NN"`); whether
 * a reference is consistent with the register is checked at build time by
 * the P3.3 validator — the legal truth stays in the register itself.
 *
 * This module parses the register's committed Markdown structure with
 * fail-loud rules so a format change can never silently skip records:
 * - every `### R-NN — <title>` heading starts a record;
 * - every record MUST contain exactly one `**Current decision:**` line;
 * - decision values MUST be one of the register's rule-5 values
 *   (allowed | restricted | permission required | unresolved);
 * - duplicate ids, malformed record headings, records without decisions,
 *   orphan decision lines, unknown decision values, and a register with
 *   zero records are ALL reported as errors.
 *
 * Evidence classes are DESCRIPTIVE of the recorded text only. The
 * validator never upgrades an owner-reported grant to independently
 * verified evidence, never invents legal statuses, and never moves a
 * rights decision out of the register.
 */

/** A parsed register record (descriptive fields only — no legal opinion). */
export interface RegisterRecord {
  /** Record id, e.g. "R-01". */
  id: string;
  /** Heading title text (the part after the em dash). */
  title: string;
  /** Normalized decision value from the register's rule-5 set. */
  decision: RegisterDecision;
  /** The recorded decision text (trimmed, trailing period removed). */
  rawDecision: string;
  /** The recorded decision explicitly says "owner-reported" (register rule 7). */
  ownerReported: boolean;
  /** The recorded decision explicitly says "written evidence pending archival". */
  writtenEvidencePending: boolean;
}

/** The four decision values the register's own rule 5 defines. */
export const REGISTER_DECISIONS = [
  "allowed",
  "restricted",
  "permission required",
  "unresolved",
] as const;
export type RegisterDecision = (typeof REGISTER_DECISIONS)[number];

export interface ParsedRegister {
  records: RegisterRecord[];
  /** Register format problems — a non-empty list fails the validator. */
  errors: string[];
}

const RECORD_HEADING = /^###\s+(R-\d{2})\s+—\s*(.+?)\s*$/;
const MALFORMED_RECORD_HEADING = /^###\s+R-/;
const DECISION_LINE = /^-\s+\*\*Current decision:\*\*\s+\*\*(.+?)\*\*\s*$/;
const SECTION_HEADING = /^#{2,3}\s+/;

export function parseRightsRegister(markdown: string): ParsedRegister {
  const records: RegisterRecord[] = [];
  const errors: string[] = [];
  const seenIds = new Set<string>();
  let current: { id: string; title: string; decision?: string } | undefined;

  const closeCurrent = () => {
    if (!current) return;
    if (current.decision === undefined) {
      errors.push(
        `Register record ${current.id} has no "**Current decision:**" line — the register format requires ` +
          "exactly one per record (records without a parseable decision are never silently skipped).",
      );
    } else {
      const parsed = parseDecisionText(current.id, current.decision, errors);
      if (parsed) records.push({ id: current.id, title: current.title, ...parsed });
    }
    current = undefined;
  };

  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    const heading = RECORD_HEADING.exec(line);
    if (heading) {
      closeCurrent();
      const id = heading[1];
      if (seenIds.has(id)) {
        errors.push(`Duplicate register record heading "${id}" — record ids must be unique.`);
        continue;
      }
      seenIds.add(id);
      current = { id, title: heading[2] };
      continue;
    }
    if (MALFORMED_RECORD_HEADING.test(line)) {
      closeCurrent();
      errors.push(
        `Malformed register record heading at line ${index + 1}: "${line.trim().slice(0, 80)}" — ` +
          'expected "### R-NN — <title>".',
      );
      continue;
    }
    if (SECTION_HEADING.test(line)) {
      closeCurrent();
      continue;
    }
    const decision = DECISION_LINE.exec(line);
    if (decision) {
      if (!current) {
        errors.push(
          `"**Current decision:**" line outside any record at line ${index + 1} — register format drift.`,
        );
      } else if (current.decision !== undefined) {
        errors.push(
          `Register record ${current.id} has more than one "**Current decision:**" line (line ${index + 1}).`,
        );
      } else {
        current.decision = decision[1];
      }
    }
  }
  closeCurrent();

  if (records.length === 0 && errors.length === 0) {
    errors.push(
      'No register records ("### R-NN — <title>" headings) found — the register format may have changed.',
    );
  }
  return { records, errors };
}

function parseDecisionText(
  id: string,
  raw: string,
  errors: string[],
): Omit<RegisterRecord, "id" | "title"> | undefined {
  const text = raw.trim().replace(/\.$/, "");
  const decision = (text.split(/\s+—\s+/)[0] ?? "").trim().toLowerCase();
  if (!(REGISTER_DECISIONS as readonly string[]).includes(decision)) {
    errors.push(
      `Register record ${id} records unknown decision "${decision}" — allowed values (register rule 5): ` +
        `${REGISTER_DECISIONS.join(" | ")}.`,
    );
    return undefined;
  }
  return {
    decision: decision as RegisterDecision,
    rawDecision: text,
    ownerReported: /owner-reported/.test(text),
    writtenEvidencePending: /written evidence pending archival/.test(text),
  };
}

/**
 * Descriptive evidence class of a record, derived ONLY from the recorded
 * decision text. The validator uses it for reporting — an owner-reported
 * grant is never converted into verified clearance, whatever its decision
 * value says.
 */
export type EvidenceClass =
  | "allowed-documented"
  | "allowed-owner-reported-pending-archival"
  | "allowed-owner-reported"
  | "not-cleared-for-citation";

export function evidenceClass(record: RegisterRecord): EvidenceClass {
  if (record.decision !== "allowed") return "not-cleared-for-citation";
  if (record.ownerReported) {
    return record.writtenEvidencePending
      ? "allowed-owner-reported-pending-archival"
      : "allowed-owner-reported";
  }
  return "allowed-documented";
}

export function findRecord(
  records: readonly RegisterRecord[],
  id: string,
): RegisterRecord | undefined {
  return records.find((record) => record.id === id);
}
