export default function HomePage() {
  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-6">
      <h1 id="home-title" className="text-2xl font-bold leading-snug sm:text-3xl">
        پایهٔ اپلیکیشن آموزش تعاملی زبان انگلیسی
      </h1>
      <p className="max-w-2xl leading-7 sm:text-lg sm:leading-8">
        این صفحه پایهٔ فنی پروژه است: پوستهٔ فارسی و راست‌به‌چپ روی Next.js با
        TypeScript سخت‌گیرانه و Tailwind CSS. انتخاب پایه، فهرست درس‌ها و
        تجربهٔ درس‌ها در گام‌های بعدی نقشهٔ راه ساخته خواهند شد.
      </p>
      <div
        dir="ltr"
        lang="en"
        className="max-w-2xl rounded-xl border border-black/10 p-4 leading-7 dark:border-white/15 sm:p-6"
      >
        <p className="font-medium">English content lives in LTR containers.</p>
        <p className="opacity-80">
          Teaching material in English is rendered inside explicit{" "}
          <code
            dir="ltr"
            className="rounded bg-black/5 px-1 py-0.5 font-mono text-sm dark:bg-white/10"
          >
            dir=&quot;ltr&quot;
          </code>{" "}
          blocks like this one, so Persian (RTL) and English (LTR) text never
          mix directions.
        </p>
      </div>
      <p className="text-sm opacity-70">
        وضعیت: زیرساخت اولیه — هیچ ویژگی آموزشی هنوز پیاده‌سازی نشده است.
      </p>
    </section>
  );
}
