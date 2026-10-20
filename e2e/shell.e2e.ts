/**
 * P4.1 shell browser checks (roadmap §5 #3: Playwright, Chromium + Firefox).
 *
 * Coverage mapped to the P4.1 acceptance criteria:
 * - "routes render" — `/`, `/grades/grade-10`, `/grades/grade-10/lessons/vision-1-l01`
 *   render inside the Persian RTL shell; unknown/malformed params reach the
 *   Persian not-found page with a real 404 status.
 * - "`dir` switches correctly" — the document is fa/rtl by default; the
 *   language-toggle placeholder flips html lang/dir both ways, and the
 *   layout (logical properties) follows the flip.
 * - "keyboard focus order sane in RTL" — Tab order is skip link → header
 *   toggle → main content link (logical reading order), the skip link
 *   appears at the RTL start (right) edge when focused, and no element
 *   uses a positive tabindex.
 */

import { expect, test, type Page } from "@playwright/test";

const BASE = "http://127.0.0.1:3100";

/** Center-x of an element's bounding box (viewport-relative). */
async function centerX(page: Page, selector: string): Promise<number> {
  const box = await page.locator(selector).boundingBox();
  if (box === null) {
    throw new Error(`Element not visible for bounding box: ${selector}`);
  }
  return box.x + box.width / 2;
}

test.describe("P4.1 AC-1: routes render", () => {
  test("home renders inside the Persian RTL shell", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "fa");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // English teaching-content blocks stay inside explicit LTR containers.
    await expect(page.locator('main [dir="ltr"][lang="en"]').first()).toBeVisible();
  });

  test("grade route renders the grade placeholder", async ({ page }) => {
    await page.goto(`${BASE}/grades/grade-10`);
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "fa");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("دهم");
  });

  test("lesson route renders the lesson placeholder with an LTR id container", async ({ page }) => {
    await page.goto(`${BASE}/grades/grade-10/lessons/vision-1-l01`);
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "fa");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // The English lesson id is rendered inside an explicit LTR container.
    await expect(
      page.locator('h1 [dir="ltr"][lang="en"]', { hasText: "vision-1-l01" }),
    ).toBeVisible();
  });

  test("every canonical grade id renders (6 grades, structural shell)", async ({ page }) => {
    for (const grade of ["grade-7", "grade-8", "grade-9", "grade-10", "grade-11", "grade-12"]) {
      await page.goto(`${BASE}/grades/${grade}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    }
  });

  test("unknown grade reaches the Persian not-found page with HTTP 404", async ({ page }) => {
    const response = await page.goto(`${BASE}/grades/grade-99`);
    expect(response?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("پیدا نشد");
  });

  test("malformed lesson id reaches the Persian not-found page with HTTP 404", async ({ page }) => {
    const response = await page.goto(`${BASE}/grades/grade-10/lessons/Vision-1-L01`);
    expect(response?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("پیدا نشد");
  });
});

test.describe("P4.1 AC-2: dir switches correctly (language toggle placeholder)", () => {
  test("toggle flips html lang/dir both ways and the layout follows the flip", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const html = page.locator("html");
    const toggle = page.getByTestId("language-toggle");

    // Default: Persian RTL. Toggle label names the (placeholder) target.
    await expect(html).toHaveAttribute("lang", "fa");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(toggle).toHaveAccessibleName(/English|تغییر زبان/);

    // RTL: the toggle sits at the visual END (left) of the header, so its
    // center is LEFT of the brand's center (brand = start = right).
    const brandCenterRtl = await centerX(page, '[data-testid="header-brand"]');
    const toggleCenterRtl = await centerX(page, '[data-testid="language-toggle"]');
    expect(toggleCenterRtl).toBeLessThan(brandCenterRtl);

    await toggle.click();
    await expect(html).toHaveAttribute("lang", "en");
    await expect(html).toHaveAttribute("dir", "ltr");
    // LTR: start flips to the left edge → the toggle now sits RIGHT of the brand.
    const brandCenterLtr = await centerX(page, '[data-testid="header-brand"]');
    const toggleCenterLtr = await centerX(page, '[data-testid="language-toggle"]');
    expect(toggleCenterLtr).toBeGreaterThan(brandCenterLtr);

    // Toggle back to the Persian default.
    await toggle.click();
    await expect(html).toHaveAttribute("lang", "fa");
    await expect(html).toHaveAttribute("dir", "rtl");
  });

  test("direction flip survives client-side navigation between shell routes", async ({ page }) => {
    await page.goto(`${BASE}/grades/grade-10`);
    await page.getByTestId("language-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    // Navigate to another shell route; the placeholder's document state stays.
    await page.getByRole("link", { name: "خانه" }).click();
    await expect(page).toHaveURL(`${BASE}/`);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });
});

test.describe("P4.1 AC-3: keyboard focus order sane in RTL", () => {
  test("Tab order is skip link → header toggle → main link; no positive tabindex", async ({ page }) => {
    await page.goto(`${BASE}/`);

    // No element may hijack the natural order with a positive tabindex.
    const positiveTabindexes = await page
      .locator("[tabindex]")
      .evaluateAll((elements) =>
        elements.filter((el) => Number(el.getAttribute("tabindex")) > 0).length,
      );
    expect(positiveTabindexes).toBe(0);

    const skipLink = page.getByRole("link", { name: "پرش به محتوای اصلی" });
    const toggle = page.getByTestId("language-toggle");
    const contentLink = page.getByRole("link", { name: "نمایش توکن‌های طراحی و تایپوگرافی" });

    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(contentLink).toBeFocused();
  });

  test("focused skip link appears at the RTL start (right) edge", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "پرش به محتوای اصلی" });
    await expect(skipLink).toBeFocused();
    // `focus:start-4` = right edge in RTL → center must sit in the right half.
    const viewport = page.viewportSize();
    if (viewport === null) {
      throw new Error("viewport size unavailable");
    }
    const center = await centerX(page, 'a[href="#main-content"]');
    expect(center).toBeGreaterThan(viewport.width / 2);
  });
});
