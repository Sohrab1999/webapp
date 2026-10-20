"use client";

/**
 * Language toggle PLACEHOLDER (roadmap P4.1: "Persian default RTL, language
 * toggle placeholder").
 *
 * Scope of the placeholder — deliberate and documented:
 * - Persian is the default interface language and the document renders RTL
 *   (see layout.tsx: `<html lang="fa" dir="rtl">`).
 * - The toggle flips the document-level direction and language between
 *   `fa`/`rtl` and `en`/`ltr` so the direction-switching mechanism itself is
 *   real and testable (P4.1 AC: "`dir` switches correctly").
 * - It does NOT translate any interface or content strings — full i18n is a
 *   later roadmap concern; nothing here may grow into a parallel content
 *   pipeline. The visible label always names the target language.
 *
 * The attribute mutation on <html> happens after hydration; layout.tsx marks
 * <html> suppressHydrationWarning for exactly this reason. No persistence —
 * a reload returns to the Persian default by design.
 */

import { useState } from "react";

type ShellLocale = "fa" | "en";

const DIRECTION: Record<ShellLocale, "rtl" | "ltr"> = {
  fa: "rtl",
  en: "ltr",
};

export function LanguageTogglePlaceholder() {
  const [locale, setLocale] = useState<ShellLocale>("fa");

  const toggle = () => {
    const next: ShellLocale = locale === "fa" ? "en" : "fa";
    setLocale(next);
    const root = document.documentElement;
    root.lang = next;
    root.dir = DIRECTION[next];
  };

  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="language-toggle"
      aria-label="نمونهٔ اولیهٔ تغییر زبان رابط — فعلاً فقط جهت صفحه عوض می‌شود"
      title="نمونهٔ اولیهٔ تغییر زبان رابط — فعلاً فقط جهت صفحه عوض می‌شود"
      className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      {locale === "fa" ? (
        <span dir="ltr" lang="en">
          English
        </span>
      ) : (
        <span dir="rtl" lang="fa">
          فارسی
        </span>
      )}
    </button>
  );
}
