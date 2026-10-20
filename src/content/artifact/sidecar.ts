/**
 * Lesson artifact sidecar schema (roadmap task P3.4, artifact contract v1).
 *
 * The authoring pipeline (P6.x) emits one static bundle per lesson — the
 * output the app serves from `public/lessons/<lessonId>/` and embeds in the
 * chapter iframe (P5.1). The bundle layout (`index.html` + `lib/` engine
 * copies + one folder per chapter with `audio/<lang>/timings.js` + beat
 * clips) is documented in `docs/architecture/LESSON_ARTIFACT_CONTRACT.md`;
 * this module defines the contract's machine-checkable part: the
 * `lesson.json` sidecar.
 *
 * The sidecar carries exactly what roadmap P3.4 requires — schema ids,
 * provenance, and the engine progress key — and NOTHING else:
 * - `lessonId` / `courseId` reuse the P3.1 id primitives so a bundle can
 *   never mint a parallel identity for content that already exists in
 *   `content/` (canonical ownership stays with the Student Book ids).
 * - `provenance` reuses the P3.1 provenance block verbatim. As in content
 *   files, it DESCRIBES origin and review state; it can never assert a
 *   permission grant — rights decisions stay in the rights register
 *   (`docs/content/RIGHTS_REGISTER.md`), and `third-party` sources carry a
 *   `registerId` reference that the P3.4 checker cross-validates with the
 *   same rules as the P3.3 content validator.
 * - `engine.progressKey` records the localStorage key the bundle's chapters
 *   will share (engine contract V13). The engine derives it from the
 *   `--progress-key` book setting or, by default, from the served URL
 *   folder (`animebook:progress:` + parent pathname, engine.js:2014); the
 *   sidecar states the effective key explicitly so the app's progress
 *   bridge (P5.2) can read it without re-deriving engine internals.
 *
 * Like the P3.1 schemas this is a strict object (unknown fields are
 * rejected) with no `any`, no `z.any()`, no passthrough — the sidecar
 * cannot become a side channel for unvalidated data.
 */

import { z } from "zod";
import {
  CONTENT_SCHEMA_VERSION,
  bookIdSchema,
  idSchema,
  provenanceSchema,
} from "../schema/index";

/**
 * Version of the lesson ARTIFACT contract (this bundle format). Independent
 * of `CONTENT_SCHEMA_VERSION` (which versions the lesson content itself):
 * a bundle may embed schema-v1 content while the bundle format evolves, and
 * vice versa. Bumped only by an owner-approved roadmap task.
 */
export const ARTIFACT_CONTRACT_VERSION = 1 as const;

/**
 * Namespace prefix of every engine progress key (V13: the engine persists
 * chapter completion under a stable `animebook:progress:` key). Bundles
 * must keep their progress under this namespace so the app's progress
 * bridge (P5.2) can discover engine-side completion deterministically.
 */
export const ENGINE_PROGRESS_KEY_PREFIX = "animebook:progress:";

/**
 * The effective progress key recorded in a sidecar: the V13 namespace
 * prefix followed by a non-empty, whitespace-free selector (the default
 * form is the served folder pathname, e.g. `/lessons/vision-1-l01/`).
 */
export const engineProgressKeySchema = z
  .string()
  .trim()
  .min(1, { message: "The engine progress key must not be empty." })
  .regex(/^animebook:progress:\S+$/, {
    message:
      'The engine progress key must stay inside the engine\'s V13 namespace — "animebook:progress:" followed by a non-empty selector (default: the served folder pathname, e.g. "animebook:progress:/lessons/vision-1-l01/").',
  });

/**
 * The `lesson.json` sidecar. `contractVersion` and `contentSchemaVersion`
 * are pinned to the versions this checker implements; stale sidecars fail
 * loudly instead of being interpreted with drifted semantics.
 */
export const lessonArtifactSidecarSchema = z
  .strictObject({
    contractVersion: z.literal(ARTIFACT_CONTRACT_VERSION),
    lessonId: idSchema,
    courseId: bookIdSchema,
    contentSchemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
    provenance: provenanceSchema,
    engine: z.strictObject({ progressKey: engineProgressKeySchema }),
  })
  .refine((sidecar) => sidecar.lessonId.startsWith(`${sidecar.courseId}-`), {
    message:
      'The sidecar lessonId must be namespaced under its courseId (e.g. "vision-1-l01" for course "vision-1"), exactly like the lesson content it was built from.',
    path: ["lessonId"],
  });

export type LessonArtifactSidecar = z.infer<typeof lessonArtifactSidecarSchema>;

/**
 * The engine's DEFAULT progress key for a bundle served at
 * `public/lessons/<dir>/` — engine.js:2014 derives
 * `animebook:progress:` + the chapter page's parent URL folder, i.e.
 * `/lessons/<dir>/`. The checker compares a sidecar's declared key against
 * this default and reports deliberate overrides as info (the value itself
 * stays authoritative — the checker never rewrites it).
 */
export function defaultProgressKey(bundleDirName: string): string {
  return `${ENGINE_PROGRESS_KEY_PREFIX}/lessons/${bundleDirName}/`;
}
