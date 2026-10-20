import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { parseGradeParam, parseLessonParam } from "@/app/route-params";
import { lineForGrade } from "@/content/schema/common";

/** Persian ordinal grade names for the six canonical grades (presentation only). */
const GRADE_NAME_FA: Record<string, string> = {
  "grade-7": "هفتم",
  "grade-8": "هشتم",
  "grade-9": "نهم",
  "grade-10": "دهم",
  "grade-11": "یازدهم",
  "grade-12": "دوازدهم",
};

export const metadata: Metadata = {
  title: "صفحهٔ درس | انگلیسی تعاملی",
};

export default async function LessonPage({
  params,
}: Readonly<{ params: Promise<{ grade: string; lesson: string }> }>) {
  const { grade, lesson } = await params;
  const gradeId = parseGradeParam(grade);
  const lessonId = parseLessonParam(lesson);
  if (gradeId === null || lessonId === null) {
    notFound();
  }

  const gradeNumber = Number(gradeId.slice("grade-".length)) as 7 | 8 | 9 | 10 | 11 | 12;
  const line = lineForGrade(gradeNumber);

  return (
    <section aria-labelledby="lesson-title" className="flex flex-col gap-4">
      <nav aria-label="مسیر صفحه" className="text-sm">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          خانه
        </Link>
        <span aria-hidden="true" className="mx-2 text-foreground-muted">
          /
        </span>
        <Link
          href={`/grades/${gradeId}`}
          className="text-primary underline-offset-4 hover:underline"
        >
          پایهٔ {GRADE_NAME_FA[gradeId]}
        </Link>
        <span aria-hidden="true" className="mx-2 text-foreground-muted">
          /
        </span>
        <span className="text-foreground-muted">
          درس{" "}
          <span dir="ltr" lang="en" className="font-mono text-xs">
            {lessonId}
          </span>
        </span>
      </nav>
      <h1 id="lesson-title">
        درس{" "}
        <span dir="ltr" lang="en" className="font-mono">
          {lessonId}
        </span>
      </h1>
      <p className="max-w-reading text-foreground-secondary">
        این پایه در خط کتاب‌های{" "}
        {line === "prospect" ? "پروسپکت" : "ویژن"} قرار دارد. تجربهٔ کامل درس —
        پخش فصل انیمیشنی، فعالیت‌های واژگان و دستور زبان، و آزمون کوتاه — در
        گام‌های بعدی نقشهٔ راه (پیاده‌ساز پخش‌کننده و درس نمایشی) به این صفحه
        اضافه می‌شود.
      </p>
      <p className="text-sm text-foreground-muted">
        وضعیت: مسیر ساختاری پوسته — شناسهٔ درس از نظر قالب معتبر است، اما هنوز
        به فهرست محتوای ثبت‌شده وصل نشده است.
      </p>
    </section>
  );
}
