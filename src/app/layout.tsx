import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LanguageTogglePlaceholder } from "@/app/language-toggle";

import "./globals.css";

export const metadata: Metadata = {
  title: "انگلیسی تعاملی | پایه هفتم تا دوازدهم",
  description:
    "پایهٔ اولیهٔ اپلیکیشن تعاملی آموزش زبان انگلیسی برای دانش‌آموزان ایرانی (پایه‌های ۷ تا ۱۲).",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  // suppressHydrationWarning: the P4.1 language-toggle placeholder mutates
  // lang/dir on <html> after hydration (documented in language-toggle.tsx);
  // the attribute change is intentional client-side state, not a mismatch.
  return (
    <html
      lang="fa"
      dir="rtl"
      className="h-full"
      suppressHydrationWarning
    >
      {/* Primary Persian font — preloaded to shrink the fallback→swap window.
          Inter is not preloaded: it is needed only on pages with English
          containers and loads on demand (see src/app/fonts.css). */}
      <link
        rel="preload"
        href="/fonts/vazirmatn/Vazirmatn-Variable.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <body className="flex min-h-screen flex-col antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:font-medium"
        >
          پرش به محتوای اصلی
        </a>
        <header className="border-b border-border">
          <div className="mx-auto flex w-full max-w-content items-center justify-between gap-4 px-gutter py-3 sm:px-gutter-wide">
            <p
              data-testid="header-brand"
              className="text-base font-semibold sm:text-lg"
            >
              انگلیسی تعاملی{" "}
              <span
                dir="ltr"
                lang="en"
                className="text-sm font-normal text-foreground-muted"
              >
                Interactive English
              </span>
            </p>
            <div className="flex items-center gap-3">
              <LanguageTogglePlaceholder />
              <p className="text-xs text-foreground-muted sm:text-sm">
                پایه‌های ۷ تا ۱۲
              </p>
            </div>
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto w-full max-w-content flex-1 px-gutter py-8 sm:px-gutter-wide sm:py-12"
        >
          {children}
        </main>
        <footer className="border-t border-border">
          <div className="mx-auto w-full max-w-content px-gutter py-4 text-xs leading-6 text-foreground-muted sm:px-gutter-wide sm:text-sm">
            <p>
              اپلیکیشن آموزش تعاملی زبان انگلیسی — این صفحه تنها پایهٔ فنی
              پروژه است؛ امکانات آموزشی در گام‌های بعدی نقشهٔ راه اضافه
              می‌شوند.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
