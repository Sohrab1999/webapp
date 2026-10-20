import Link from "next/link";

/**
 * App-wide not-found page (rendered inside the root layout, so it stays in
 * the Persian RTL shell instead of Next.js's default English 404).
 * Serves the shell routes' `notFound()` branches (unknown grade / malformed
 * lesson id) and any other unmatched URL.
 */
export default function NotFoundPage() {
  return (
    <section aria-labelledby="notfound-title" className="flex flex-col gap-4">
      <h1 id="notfound-title">صفحه پیدا نشد</h1>
      <p className="max-w-reading text-foreground-secondary">
        آدرسی که درخواست شده وجود ندارد یا نامعتبر است. اگر با پیوند داخل
        برنامه به اینجا رسیده‌اید، لطفاً به صفحهٔ اصلی بازگردید.
      </p>
      <p>
        <Link
          href="/"
          className="text-primary underline-offset-4 hover:underline"
        >
          بازگشت به صفحهٔ اصلی
        </Link>
      </p>
    </section>
  );
}
