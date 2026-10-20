import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { parseGradeParam } from "@/app/route-params";
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

const LINE_NAME_FA: Record<string, string> = {
  prospect: "پروسپکت",
  vision: "ویژن",
};

export const metadata: Metadata = {
  title: "صفحهٔ پایه | انگلیسی تعاملی",
};

export default async function GradePage({
  params,
}: Readonly<{ params: Promise<{ grade: string }> }>) {
  const { grade } = await params;
  const gradeId = parseGradeParam(grade);
  if (gradeId === null) {
    notFound();
  }

  const gradeNumber = Number(gradeId.slice("grade-".length)) as 7 | 8 | 9 | 10 | 11 | 12;
  const line = lineForGrade(gradeNumber);

  return (
    <section aria-labelledby="grade-title" className="flex flex-col gap-4">
      <nav aria-label="مسیر صفحه" className="text-sm">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          خانه
        </Link>
        <span aria-hidden="true" className="mx-2 text-foreground-muted">
          /
        </span>
        <span className="text-foreground-muted">پایهٔ {GRADE_NAME_FA[gradeId]}</span>
      </nav>
      <h1 id="grade-title">انگلیسی پایهٔ {GRADE_NAME_FA[gradeId]}</h1>
      <p className="max-w-reading text-foreground-secondary">
        این پایه در خط کتاب‌های {LINE_NAME_FA[line]} قرار دارد. فهرست کتاب‌ها و
        درس‌های این پایه (به‌همراه وضعیت انتشار هر کتاب) در گام‌های بعدی نقشهٔ
        راه به این صفحه اضافه می‌شود.
      </p>
      <p className="text-sm text-foreground-muted">
        وضعیت: مسیر ساختاری پوسته — محتوای آموزشی این صفحه هنوز پیاده‌سازی
        نشده است.
      </p>
    </section>
  );
}
