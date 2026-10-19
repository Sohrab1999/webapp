/**
 * Content schema v1 (roadmap task P3.1) — public surface.
 *
 * Entities: Grade, Course, Lesson, VocabItem, GrammarPoint, Dialogue,
 * Reading, QuizItem — each with a mandatory `provenance` block.
 *
 * Zod schemas are the runtime validators; the `z.infer` types alongside
 * them are the compile-time contract (no `any`, no escape hatches).
 * P3.3 will wire these schemas into a build-time validator CLI; nothing
 * in this module touches the verification pipeline.
 */

export * from "./common";
export * from "./provenance";
export * from "./curriculum";
export * from "./quiz-item";
export * from "./activities";
export * from "./lesson";
