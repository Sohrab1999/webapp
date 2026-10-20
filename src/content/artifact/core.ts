/**
 * Core validation logic for the P3.4 lesson artifact contract checker.
 *
 * Pure functions only (no fs, no process) so the CLI stays thin and every
 * rule is unit-testable, mirroring the P3.3 content validator's structure.
 *
 * What the checker verifies (see docs/architecture/LESSON_ARTIFACT_CONTRACT.md):
 * 1. Bundle structure — every directory under `public/lessons/` carries a
 *    `lesson.json` sidecar plus the required files (`index.html`, the
 *    `lib/` engine copies); every other top-level directory is a chapter
 *    and must contain a chapter page and valid per-beat audio timings.
 * 2. Sidecar validity — parsed against the P3.4 sidecar schema, which
 *    REUSES the P3.1 primitives (`idSchema`, `bookIdSchema`,
 *    `provenanceSchema`); version pins are cross-checked with actionable
 *    messages before the schema runs.
 * 3. Engine integrity — the `lib/` engine copies must be byte-identical to
 *    the vendored pinned engine (C3: the engine is never hand-edited).
 * 4. Register consistency — a `third-party` sidecar provenance reference
 *    is cross-checked against the rights register with the SAME rules and
 *    code path as the P3.3 content validator (exported from there); an
 *    owner-reported grant with evidence pending is reported as a warning
 *    that is explicitly NOT finally cleared, never as verified permission.
 *
 * What the checker deliberately does NOT do: it does not run the bundle in
 * a browser (playability is P5.1/P6.3 evidence), it does not decide legal
 * clearance (the register alone does), and it does not maintain a content
 * registry (P8.2). It also never rewrites sidecar values.
 */

import {
  checkRegisterRefs,
  schemaIssues,
  type ContentIssue,
} from "../validator/core";
import { CONTENT_SCHEMA_VERSION } from "../schema/index";
import type { ParsedRegister } from "../validator/register";
import {
  ARTIFACT_CONTRACT_VERSION,
  defaultProgressKey,
  lessonArtifactSidecarSchema,
  type LessonArtifactSidecar,
} from "./sidecar";

/** One file of a bundle, read as text. `path` is bundle-relative POSIX. */
export interface ArtifactBundleFile {
  path: string;
  raw: string;
}

/** One bundle directory. `dir` is repo-relative POSIX (e.g. "public/lessons/vision-1-l01"). */
export interface ArtifactBundle {
  dir: string;
  files: readonly ArtifactBundleFile[];
}

/**
 * A byte-exact source for the required engine copies, read from the
 * vendored pinned engine tree by the CLI. `vendorRelPath` is relative to
 * `vendor/engine/` (e.g. "engine.js" for the bundle's "lib/engine.js").
 */
export interface EngineSourceFile {
  bundleRelPath: string;
  vendorRelPath: string;
  raw: string;
}

export interface ArtifactReport {
  issues: ContentIssue[];
  bundlesChecked: number;
}

/** The sidecar every bundle must carry (roadmap P3.4). */
const SIDECAR_NAME = "lesson.json";
/** Top-level files every bundle must contain (documented bundle layout). */
const REQUIRED_FILES = ["index.html", "lib/engine.js", "lib/engine.css", "lib/book.css"] as const;
/** Repo-relative location of the vendored engine the copies are checked against. */
export const VENDOR_ENGINE_DIR = "vendor/engine";
/** Rights register — the single source of truth for third-party decisions. */
const REGISTER_PATH = "docs/content/RIGHTS_REGISTER.md";

/**
 * The canonical timings form the upstream tooling emits
 * (`check_volume.py`: `"const TIMINGS = " + json.dumps(...)`); the checker
 * requires exactly this form so a tooling drift fails the build instead of
 * being silently interpreted.
 */
const TIMINGS_RE = /^const TIMINGS = (\{[\s\S]*\});?\s*$/;

/* ------------------------------------------------------------------ *
 * Minimal JSON model — no `any`, no `unknown`: JSON.parse output is
 * captured once behind a recursive JsonValue type and narrowed with
 * plain type guards.
 * ------------------------------------------------------------------ */

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
interface JsonObject {
  [key: string]: JsonValue;
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parse text as a JSON object; undefined on syntax errors or non-object roots. */
function parseJsonObject(text: string): JsonObject | undefined {
  let parsed: JsonValue;
  try {
    // JSON.parse's declared return type is `any`; the immediate capture into
    // the JsonValue model is the boundary — nothing downstream sees `any`.
    parsed = JSON.parse(text) as JsonValue;
  } catch {
    return undefined;
  }
  return isJsonObject(parsed) ? parsed : undefined;
}

/* ------------------------------------------------------------------ *
 * Bundle validation
 * ------------------------------------------------------------------ */

/** Validate a set of artifact bundles against the P3.4 contract. */
export function validateArtifactBundles(
  bundles: readonly ArtifactBundle[],
  engineSources: readonly EngineSourceFile[],
  register: ParsedRegister,
): ArtifactReport {
  const issues: ContentIssue[] = [];
  for (const message of register.errors) {
    issues.push({
      severity: "error",
      file: REGISTER_PATH,
      message: `register format error — ${message}`,
    });
  }
  for (const bundle of bundles) {
    issues.push(...validateBundle(bundle, engineSources, register));
  }
  return { issues, bundlesChecked: bundles.length };
}

function validateBundle(
  bundle: ArtifactBundle,
  engineSources: readonly EngineSourceFile[],
  register: ParsedRegister,
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const files = new Map<string, string>();
  for (const file of bundle.files) {
    if (!files.has(file.path)) files.set(file.path, file.raw);
  }

  issues.push(...checkSidecar(bundle.dir, files, register));
  issues.push(...checkRequiredFiles(bundle.dir, files, engineSources));
  issues.push(...checkChapters(bundle.dir, files));
  issues.push(...checkStrayTopLevelFiles(bundle.dir, files));
  return issues;
}

/* ---------------------------- sidecar ----------------------------- */

function checkSidecar(
  dir: string,
  files: Map<string, string>,
  register: ParsedRegister,
): ContentIssue[] {
  const sidecarPath = `${dir}/${SIDECAR_NAME}`;
  const raw = files.get(SIDECAR_NAME);
  if (raw === undefined) {
    return [
      {
        severity: "error",
        file: dir,
        message:
          `bundle is missing its "${SIDECAR_NAME}" sidecar — every bundle under public/lessons/ must carry one ` +
          "(schema ids, provenance, engine progress key; see docs/architecture/LESSON_ARTIFACT_CONTRACT.md). " +
          "A bundle without a sidecar is not contract-checkable and not discoverable by the app's lesson registry.",
      },
    ];
  }

  const data = parseJsonObject(raw);
  if (!data) {
    return [
      {
        severity: "error",
        file: sidecarPath,
        message:
          "malformed JSON — the sidecar cannot be schema-validated until it parses. " +
          "Fix the JSON syntax (the file must be a single JSON object).",
      },
    ];
  }

  // Actionable version pre-checks before the schema runs: a version pin
  // mismatch changes the meaning of every other field, so it is reported
  // on its own instead of drowning in follow-on schema noise.
  const versionIssues: ContentIssue[] = [];
  if (data["contractVersion"] !== ARTIFACT_CONTRACT_VERSION) {
    versionIssues.push({
      severity: "error",
      file: sidecarPath,
      message:
        `artifact contract version mismatch — sidecar declares ${JSON.stringify(data["contractVersion"])}, ` +
        `this checker implements ${ARTIFACT_CONTRACT_VERSION}. Re-emit the sidecar for contract v` +
        `${ARTIFACT_CONTRACT_VERSION} (do not hand-edit generated artifacts); if the bundle format itself ` +
        "changed, that change requires an owner-approved roadmap task that bumps ARTIFACT_CONTRACT_VERSION.",
    });
  }
  if (data["contentSchemaVersion"] !== CONTENT_SCHEMA_VERSION) {
    versionIssues.push({
      severity: "error",
      file: sidecarPath,
      message:
        `content schema version mismatch — sidecar declares ${JSON.stringify(data["contentSchemaVersion"])}, ` +
        `but the schema the ids refer to is v${CONTENT_SCHEMA_VERSION} (CONTENT_SCHEMA_VERSION in ` +
        "src/content/schema/common.ts). Re-emit the sidecar from the current content so schema ids keep their meaning.",
    });
  }
  if (versionIssues.length > 0) return versionIssues;

  const parsed = lessonArtifactSidecarSchema.safeParse(data);
  if (!parsed.success) {
    return schemaIssues(sidecarPath, parsed.error.issues);
  }
  const sidecar: LessonArtifactSidecar = parsed.data;

  const issues: ContentIssue[] = [];

  // Register consistency for third-party provenance — same decision rules,
  // same messages, same code path as the P3.3 content validator.
  const source = sidecar.provenance.source;
  if (source.kind === "third-party") {
    issues.push(
      ...checkRegisterRefs(sidecarPath, [{ registerId: source.registerId, at: "provenance" }], register),
    );
  }

  // Transparency for progress-key overrides: the declared key stays
  // authoritative; a key that differs from the engine's location default
  // is surfaced so reviewers see that the app must read THAT key (P5.2).
  const dirName = dir.split("/").pop() ?? dir;
  const expected = defaultProgressKey(dirName);
  if (sidecar.engine.progressKey !== expected) {
    issues.push({
      severity: "info",
      file: sidecarPath,
      message:
        `sidecar declares a custom engine progress key "${sidecar.engine.progressKey}" — the engine's ` +
        `default for this bundle location would be "${expected}". This is a deliberate --progress-key ` +
        "override (V13): the bundle's book settings must set exactly this key, and the progress bridge (P5.2) reads it as recorded.",
    });
  }
  return issues;
}

/* ------------------------- required files ------------------------- */

function checkRequiredFiles(
  dir: string,
  files: Map<string, string>,
  engineSources: readonly EngineSourceFile[],
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  for (const relPath of REQUIRED_FILES) {
    const raw = files.get(relPath);
    if (raw === undefined) {
      issues.push({
        severity: "error",
        file: `${dir}/${relPath}`,
        message:
          `required bundle file "${relPath}" is missing — the documented bundle layout is index.html + ` +
          "lib/ engine copies + one folder per chapter + lesson.json (docs/architecture/LESSON_ARTIFACT_CONTRACT.md).",
      });
    } else if (raw.trim().length === 0) {
      issues.push({
        severity: "error",
        file: `${dir}/${relPath}`,
        message: `"${relPath}" exists but is empty — a required bundle file must have content.`,
      });
    }
  }

  // C3 integrity: served engine copies must be byte-identical to the
  // vendored pinned engine — a hand-edited bundle copy is exactly the
  // modification the vendoring gate forbids.
  for (const source of engineSources) {
    const bundleRaw = files.get(source.bundleRelPath);
    if (bundleRaw === undefined) continue; // missing → already reported above
    if (bundleRaw !== source.raw) {
      issues.push({
        severity: "error",
        file: `${dir}/${source.bundleRelPath}`,
        message:
          `bundle copy "${source.bundleRelPath}" is NOT byte-identical to the vendored engine source ` +
          `${VENDOR_ENGINE_DIR}/${source.vendorRelPath} — the engine is never hand-edited (gate C3); ` +
          "re-copy the file from the vendor tree (scripts/sync-papermorph.sh keeps vendor/ correct).",
      });
    }
  }
  return issues;
}

/* ----------------------------- chapters --------------------------- */

function checkChapters(dir: string, files: Map<string, string>): ContentIssue[] {
  const chapterNames = new Set<string>();
  for (const path of files.keys()) {
    const segments = path.split("/");
    if (segments.length > 1 && segments[0] !== "lib") chapterNames.add(segments[0]);
  }
  // Deterministic order regardless of how the CLI collected files.
  const chapters = [...chapterNames].sort();

  if (chapters.length === 0) {
    return [
      {
        severity: "error",
        file: dir,
        message:
          'bundle has no chapter folder — a lesson artifact must contain at least one chapter directory ' +
          "(e.g. ch01/ with index.html + audio/<lang>/timings.js + one audio clip per TIMINGS beat; " +
          "docs/architecture/LESSON_ARTIFACT_CONTRACT.md).",
      },
    ];
  }

  const issues: ContentIssue[] = [];
  for (const chapter of chapters) {
    issues.push(...checkChapter(dir, chapter, files));
  }
  return issues;
}

function checkChapter(
  dir: string,
  chapter: string,
  files: Map<string, string>,
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const prefix = `${chapter}/`;

  const pagePath = `${prefix}index.html`;
  const page = files.get(pagePath);
  if (page === undefined) {
    issues.push({
      severity: "error",
      file: `${dir}/${pagePath}`,
      message:
        `chapter page "${pagePath}" is missing — each chapter directory must contain the ` +
        "page the player iframe loads (P5.1 embeds <chapter>/).",
    });
  } else if (page.trim().length === 0) {
    issues.push({
      severity: "error",
      file: `${dir}/${pagePath}`,
      message: `chapter page "${pagePath}" exists but is empty.`,
    });
  }

  // Every audio/<lang>/timings.js in the chapter must be present, in the
  // canonical upstream form, with a positive duration per beat and one
  // pre-rendered clip per beat (V9: deterministic playback from MP3 +
  // timings; the engine fetches audio/<language>/<beatId>.mp3).
  const timingsPaths = [...files.keys()]
    .map((path) => path.slice(prefix.length))
    .filter((relPath) => /^audio\/[^/]+\/timings\.js$/.test(relPath))
    .sort();
  if (timingsPaths.length === 0) {
    issues.push({
      severity: "error",
      file: `${dir}/${prefix}`,
      message:
        `chapter "${chapter}" has no audio/<lang>/timings.js — the engine consumes "const TIMINGS = {...}" ` +
        "per chapter (V9: pre-rendered audio + timings; no live model).",
    });
  }
  for (const timingsPath of timingsPaths) {
    issues.push(...checkTimings(dir, chapter, timingsPath, files));
  }
  return issues;
}

function checkTimings(
  dir: string,
  chapter: string,
  timingsPath: string,
  files: Map<string, string>,
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const fullPath = `${dir}/${chapter}/${timingsPath}`;
  const raw = files.get(`${chapter}/${timingsPath}`);
  if (raw === undefined) {
    // Fail-loud, never silent: a timings path produced by the chapter scan
    // must exist in the file map; if it does not, the checker itself is
    // broken and must say so instead of skipping the file.
    return [
      {
        severity: "error",
        file: fullPath,
        message:
          `timings file "${chapter}/${timingsPath}" was enumerated but could not be read — internal ` +
          "checker error; report this failure rather than re-running until it disappears.",
      },
    ];
  }

  const match = TIMINGS_RE.exec(raw);
  if (!match) {
    return [
      {
        severity: "error",
        file: fullPath,
        message:
          'timings.js is not in the canonical form "const TIMINGS = {…}" — the upstream tooling emits a ' +
          "single JSON object assigned to TIMINGS (see docs/architecture/LESSON_ARTIFACT_CONTRACT.md); " +
          "other shapes cannot be checked deterministically, so they fail the build instead of being guessed at.",
      },
    ];
  }

  const timings = parseJsonObject(match[1]);
  if (!timings) {
    return [
      {
        severity: "error",
        file: fullPath,
        message:
          'timings.js is not in the canonical form "const TIMINGS = {…}" — the text after the assignment ' +
          "is not a JSON object; re-emit the timings with the authoring tooling.",
      },
    ];
  }

  const beats = Object.keys(timings).sort();
  if (beats.length === 0) {
    issues.push({
      severity: "error",
      file: fullPath,
      message:
        "timings.js declares no beats — a chapter must declare at least one beat (the engine plays the " +
        "chapter as a sequence of beats).",
    });
  }
  const lang = timingsPath.split("/")[1];
  for (const beat of beats) {
    const entry = timings[beat];
    if (!isJsonObject(entry) || typeof entry["dur"] !== "number" || !Number.isFinite(entry["dur"])) {
      issues.push({
        severity: "error",
        file: fullPath,
        message:
          `beat "${beat}" has no numeric "dur" — every TIMINGS entry must carry a finite duration in ` +
          "seconds (the engine schedules beats from it).",
      });
      continue;
    }
    if (entry["dur"] <= 0) {
      issues.push({
        severity: "error",
        file: fullPath,
        message: `beat "${beat}" has dur ${entry["dur"]} — beat durations must be positive.`,
      });
      continue;
    }
    const clipPath = `audio/${lang}/${beat}.mp3`;
    const clip = files.get(`${chapter}/${clipPath}`);
    if (clip === undefined) {
      issues.push({
        severity: "error",
        file: `${dir}/${chapter}/${clipPath}`,
        message:
          `beat "${beat}" has no audio clip — the engine loads audio/<language>/<beatId>.mp3 for every ` +
          `TIMINGS beat (V9); expected "${chapter}/${clipPath}". Add the pre-rendered clip or fix the timings key.`,
      });
    } else if (clip.length === 0) {
      issues.push({
        severity: "error",
        file: `${dir}/${chapter}/${clipPath}`,
        message: `audio clip "${chapter}/${clipPath}" exists but is empty.`,
      });
    }
  }
  return issues;
}

/* ------------------------ stray top-level files ------------------- */

/**
 * Top-level files other than the two known ones are not part of the
 * documented bundle contract. They are reported as WARNINGS (not errors):
 * unlike a missing chapter or sidecar they cannot silently invalidate the
 * bundle, but leaving them unmentioned would let the layout drift without
 * a trace. Top-level DIRECTORIES are strictly chapter candidates — they are
 * validated (or rejected) by checkChapters, never ignored.
 */
function checkStrayTopLevelFiles(dir: string, files: Map<string, string>): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const known = new Set<string>(["index.html", SIDECAR_NAME]);
  for (const path of [...files.keys()].sort()) {
    if (!path.includes("/") && !known.has(path)) {
      issues.push({
        severity: "warning",
        file: `${dir}/${path}`,
        message:
          "top-level file outside the documented bundle contract (index.html + lesson.json + lib/ + " +
          "chapter folders) — move it into the layout or extend the contract deliberately " +
          "(docs/architecture/LESSON_ARTIFACT_CONTRACT.md).",
      });
    }
  }
  return issues;
}
