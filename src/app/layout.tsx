import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "انگلیسی تعاملی | پایه هفتم تا دوازدهم",
  description:
    "پایهٔ اولیهٔ اپلیکیشن تعاملی آموزش زبان انگلیسی برای دانش‌آموزان ایرانی (پایه‌های ۷ تا ۱۲).",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className="h-full">
      <body className="flex min-h-screen flex-col antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:font-medium"
        >
          پرش به محتوای اصلی
        </a>
        <header className="border-b border-black/10 dark:border-white/15">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <p className="text-base font-semibold sm:text-lg">
              انگلیسی تعاملی{" "}
              <span
                dir="ltr"
                lang="en"
                className="text-sm font-normal opacity-70"
              >
                Interactive English
              </span>
            </p>
            <p className="text-xs opacity-70 sm:text-sm">پایه‌های ۷ تا ۱۲</p>
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12"
        >
          {children}
        </main>
        <footer className="border-t border-black/10 dark:border-white/15">
          <div className="mx-auto w-full max-w-5xl px-4 py-4 text-xs leading-6 opacity-70 sm:px-6 sm:text-sm">
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
