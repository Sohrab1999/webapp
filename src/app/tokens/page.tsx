import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "توکن‌های طراحی | انگلیسی تعاملی",
  description:
    "صفحهٔ نمایش توکن‌های طراحی، تایپوگرافی و قراردادهای راست‌به‌چپ/چپ‌به‌راست — ابزار توسعه، نه بخشی از محصول.",
};

/*
 * Storybook-style token demo page (roadmap P2.2 AC): renders the design-token
 * inventory so typography, colors, spacing, motion and the RTL/LTR convention
 * can be verified visually. Development artifact only — not a product page.
 */

const colorTokens = [
  { token: "--background", fa: "پس‌زمینهٔ صفحه", className: "bg-background" },
  { token: "--surface", fa: "سطح", className: "bg-surface" },
  {
    token: "--surface-elevated",
    fa: "سطح برجسته",
    className: "bg-surface-elevated",
  },
  { token: "--primary", fa: "کنش اصلی", className: "bg-primary" },
  {
    token: "--primary-foreground",
    fa: "متن روی کنش اصلی",
    className: "bg-primary text-primary-foreground",
  },
  { token: "--border", fa: "خط جداکننده", className: "bg-border" },
  { token: "--focus-ring", fa: "حلقهٔ فوکوس", className: "bg-focus-ring" },
  { token: "--success", fa: "موفق", className: "bg-success" },
  { token: "--warning", fa: "هشدار", className: "bg-warning" },
  { token: "--error", fa: "خطا", className: "bg-error" },
] as const;

const textColorTokens = [
  { token: "--foreground", fa: "متن اصلی", className: "text-foreground" },
  {
    token: "--foreground-secondary",
    fa: "متن پشتیبان",
    className: "text-foreground-secondary",
  },
  {
    token: "--foreground-muted",
    fa: "متن کم‌رنگ",
    className: "text-foreground-muted",
  },
] as const;

const typeScale = [
  { token: "--text-xs", className: "text-xs" },
  { token: "--text-sm", className: "text-sm" },
  { token: "--text-base", className: "text-base" },
  { token: "--text-lg", className: "text-lg" },
  { token: "--text-xl", className: "text-xl" },
  { token: "--text-2xl", className: "text-2xl" },
  { token: "--text-3xl", className: "text-3xl" },
  { token: "--text-4xl", className: "text-4xl" },
] as const;

const radiusTokens = [
  { token: "--radius-sm", className: "rounded-sm" },
  { token: "--radius-md", className: "rounded-md" },
  { token: "--radius-lg", className: "rounded-lg" },
  { token: "--radius-xl", className: "rounded-xl" },
] as const;

const controlHeights = [
  { token: "--control-sm", className: "h-control-sm" },
  { token: "--control-md", className: "h-control-md" },
  { token: "--control-lg", className: "h-control-lg" },
] as const;

export default function TokensPage() {
  return (
    <section aria-labelledby="tokens-title" className="flex flex-col gap-12">
      <header className="flex flex-col gap-3">
        <h1 id="tokens-title">توکن‌های طراحی و تایپوگرافی</h1>
        <p className="max-w-reading text-foreground-secondary">
          این صفحه، توکن‌های پایهٔ ظاهری پروژه را نمایش می‌دهد: قلم‌ها، مقیاس
          تایپوگرافی، نقش‌های رنگی، فاصله‌ها، شعاع گوشه‌ها و حرکت. تمام
          مقادیر از فایل{" "}
          <code dir="ltr" className="font-mono text-sm">
            src/app/tokens.css
          </code>{" "}
          خوانده می‌شوند. این صفحه ابزار توسعه است و بخشی از محصول نیست.
        </p>
      </header>

      {/* Side-by-side Persian RTL / English LTR — the P2.2 acceptance check */}
      <section aria-labelledby="fonts-title" className="flex flex-col gap-4">
        <h2 id="fonts-title">
          قلم‌ها — فارسی (راست‌به‌چپ) و انگلیسی (چپ‌به‌راست)
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 text-start">
            <h3>وزیرمتن — قلم فارسی</h3>
            <p>
              زبان فارسی به‌صورت پیش‌فرض راست‌به‌چپ نمایش داده می‌شود و قلم
              وزیرمتن از داخل خود برنامه سرو می‌شود، نه از شبکهٔ خارجی.
            </p>
            <p>
              واژه‌های انگلیسی درون جملهٔ فارسی مثل{" "}
              <span dir="ltr">English</span> یا <span dir="ltr">Lesson 3</span>{" "}
              با قلمِ همین خانواده رندر می‌شوند تا خط پایه‌ها هماهنگ بماند.
            </p>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-normal">معتدل ۴۰۰</span>
              <span className="font-medium">متوسط ۵۰۰</span>
              <span className="font-semibold">نیمه‌ضخیم ۶۰۰</span>
              <span className="font-bold">ضخیم ۷۰۰</span>
            </div>
          </div>
          <div
            dir="ltr"
            lang="en"
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 text-start"
          >
            <h3>Inter — English font</h3>
            <p>
              English teaching content lives in explicit LTR containers marked
              with{" "}
              <code className="font-mono text-sm">dir=&quot;ltr&quot;</code> and{" "}
              <code className="font-mono text-sm">lang=&quot;en&quot;</code>. The{" "}
              <code className="font-mono text-sm">:lang(en)</code> rule then
              selects the Inter stack automatically.
            </p>
            <p>
              A Persian gloss inside an English block — like{" "}
              <span lang="fa" dir="rtl">
                کتاب درسی
              </span>{" "}
              — falls back to the Persian stack without breaking directionality.
            </p>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-normal">Regular 400</span>
              <span className="font-medium">Medium 500</span>
              <span className="font-semibold">Semibold 600</span>
              <span className="font-bold">Bold 700</span>
            </div>
          </div>
        </div>
      </section>

      {/* Type scale */}
      <section aria-labelledby="scale-title" className="flex flex-col gap-4">
        <h2 id="scale-title">مقیاس تایپوگرافی</h2>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5">
          {typeScale.map((item) => (
            <div
              key={item.token}
              className="flex flex-wrap items-baseline justify-between gap-x-4"
            >
              <span className={item.className}>آب می‌خورم — Sample</span>
              <code
                dir="ltr"
                className="font-mono text-xs text-foreground-muted"
              >
                {item.token}
              </code>
            </div>
          ))}
        </div>
        <p className="text-sm text-foreground-muted">
          ارتفاع خط بدنه{" "}
          <code dir="ltr" className="font-mono">
            --leading-body: 1.75
          </code>{" "}
          است تا متن فارسی نفس بکشد؛ عناوین از{" "}
          <code dir="ltr" className="font-mono">
            --leading-heading: 1.25
          </code>{" "}
          استفاده می‌کنند.
        </p>
      </section>

      {/* Colors */}
      <section aria-labelledby="colors-title" className="flex flex-col gap-4">
        <h2 id="colors-title">نقش‌های رنگی</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {colorTokens.map((item) => (
            <div
              key={item.token}
              className="flex flex-col gap-2 rounded-lg border border-border p-2"
            >
              <div
                className={`${item.className} h-10 rounded-md border border-border`}
              />
              <code
                dir="ltr"
                className="font-mono text-xs text-foreground-secondary"
              >
                {item.token}
              </code>
              <span className="text-xs text-foreground-muted">{item.fa}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5">
          {textColorTokens.map((item) => (
            <p key={item.token} className={item.className}>
              نمونهٔ متن فارسی با {item.fa} — <span dir="ltr">sample text</span>{" "}
              <code dir="ltr" className="font-mono text-xs">
                {item.token}
              </code>
            </p>
          ))}
        </div>
      </section>

      {/* Sizing, shape, elevation */}
      <section aria-labelledby="space-title" className="flex flex-col gap-4">
        <h2 id="space-title">فاصله‌ها، کنترل‌ها و شکل</h2>
        <div className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">حاشیهٔ محتوا (gutter)</p>
            <div className="flex items-center gap-3">
              <span className="h-4 w-gutter rounded-sm bg-primary" />
              <code dir="ltr" className="font-mono text-xs">
                --gutter = 1rem
              </code>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-4 w-gutter-wide rounded-sm bg-primary" />
              <code dir="ltr" className="font-mono text-xs">
                --gutter-wide = 1.5rem
              </code>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">ارتفاع کنترل‌ها</p>
            <div className="flex flex-wrap items-center gap-3">
              {controlHeights.map((item) => (
                <span
                  key={item.token}
                  className={`${item.className} rounded-md border border-border bg-surface-elevated px-3 leading-none`}
                >
                  <code dir="ltr" className="font-mono text-xs">
                    {item.token}
                  </code>
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">شعاع گوشه‌ها</p>
            <div className="flex flex-wrap gap-3">
              {radiusTokens.map((item) => (
                <span
                  key={item.token}
                  className={`${item.className} h-12 w-12 border-2 border-primary`}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">سطح برجسته با سایه</p>
            <div className="max-w-64 rounded-lg border border-border bg-surface-elevated p-4 shadow-elevated">
              <p className="text-sm">
                کارت نمونه با{" "}
                <code dir="ltr" className="font-mono text-xs">
                  shadow-elevated
                </code>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Logical properties + motion + focus */}
      <section aria-labelledby="behavior-title" className="flex flex-col gap-4">
        <h2 id="behavior-title">خواص منطقی، حرکت و فوکوس</h2>
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
          <div className="border-s-4 border-primary bg-background p-4">
            <p>
              این کادر از{" "}
              <code dir="ltr" className="font-mono text-sm">
                border-s-4
              </code>{" "}
              استفاده می‌کند (معادل منطقیِ border-left در RTL). در حالت
              راست‌به‌چپ خط روی «شروع» یعنی سمت راست قرار می‌گیرد.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              حلقهٔ فوکوس (با Tab امتحان کنید)
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="h-control-md rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors duration-180 hover:opacity-90"
              >
                دکمهٔ نمونه (عملکردی ندارد)
              </button>
              <span className="text-xs text-foreground-muted">
                حلقهٔ فوکوس از توکن‌های
                <code dir="ltr" className="mx-1 font-mono">
                  --focus-ring
                </code>
                می‌آید.
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">انتقال رنگ (hover)</p>
            <div className="h-control-sm max-w-64 rounded-md border border-border bg-background transition-colors duration-180 hover:bg-primary/15">
              <p className="flex h-full items-center justify-center text-sm">
                نشانگر را روی من ببرید
              </p>
            </div>
            <p className="text-xs text-foreground-muted">
              با فعال بودن{" "}
              <code dir="ltr" className="font-mono">
                prefers-reduced-motion
              </code>{" "}
              همهٔ انتقال‌ها تقریباً بی‌درنگ می‌شوند.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}
