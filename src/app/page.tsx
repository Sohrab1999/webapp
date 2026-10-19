import Link from "next/link";

export default function HomePage() {
  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-6">
      <h1 id="home-title">پایهٔ اپلیکیشن آموزش تعاملی زبان انگلیسی</h1>
      <p className="max-w-reading sm:text-lg">
        این صفحه پایهٔ فنی پروژه است: پوستهٔ فارسی و راست‌به‌چپ روی Next.js با
        TypeScript سخت‌گیرانه و Tailwind CSS. انتخاب پایه، فهرست درس‌ها و
        تجربهٔ درس‌ها در گام‌های بعدی نقشهٔ راه ساخته خواهند شد.
      </p>
      <div
        dir="ltr"
        lang="en"
        className="max-w-reading rounded-xl border border-border bg-surface p-4 sm:p-6"
      >
        <p className="font-medium">English content lives in LTR containers.</p>
        <p className="text-foreground-secondary">
          Teaching material in English is rendered inside explicit{" "}
          <code
            dir="ltr"
            className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-sm"
          >
            dir=&quot;ltr&quot;
          </code>{" "}
          blocks like this one, so Persian (RTL) and English (LTR) text never
          mix directions.
        </p>
      </div>
      <p className="text-sm text-foreground-muted">
        وضعیت: زیرساخت اولیه — هیچ ویژگی آموزشی هنوز پیاده‌سازی نشده است.{" "}
        <Link
          href="/tokens"
          className="text-primary underline-offset-4 hover:underline"
        >
          نمایش توکن‌های طراحی و تایپوگرافی
        </Link>
      </p>
    </section>
  );
}
