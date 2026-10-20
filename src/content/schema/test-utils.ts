/**
 * Test-only helpers for the content-schema tests (P3.1).
 * Not part of the schema's public surface — never imported by app code.
 */

/**
 * Returns a shallow copy of `obj` without `key`.
 *
 * Used to build "field missing on purpose" fixtures (e.g. a lesson without
 * provenance) without lint-noisy unused-destructuring renames.
 */
export function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy = { ...obj } as Record<string, unknown>;
  delete copy[key as string];
  return copy as Omit<T, K>;
}
