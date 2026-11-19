import { expect, type Locator, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";
import { MARKETING_URL } from "../support/env";
import { waitForHydration } from "../support/page";

/**
 * "Debt and borrowing" (owner ruling 2026-11-15) fits the navigation without truncation or
 * wrapping: the desktop top bar at 1024 and 1280 wide, the tablet menu at 768 and the phone drawer
 * at 320 wide. Every top bar link has at least 12px each side of its text (owner report
 * 2026-11-18), and "Home" is a nav item at every width (owner ruling).
 */
const LABEL = "Debt and borrowing";
/** The page inside the group is "Cards and loans" (owner wording, 18 November 2026). */
const PAGE_TITLE = "Cards and loans";

interface Fit {
  /** The text is on one line: its box is no taller than one and a half line heights. */
  lines: number;
  /** Nothing is cut off: the content is no wider than its box. */
  clipped: boolean;
  /** CSS that would hide an overflow with an ellipsis. */
  ellipsis: boolean;
  left: number;
  right: number;
}

const measure = (item: Locator): Promise<Fit> =>
  item.evaluate((el) => {
    // The innermost element that holds the label's own text.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let holder: Element = el;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if ((node.textContent ?? "").includes("Debt and borrowing") && node.parentElement) {
        holder = node.parentElement;
        break;
      }
    }
    const style = getComputedStyle(holder);
    const lineHeight =
      Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.5;
    const range = document.createRange();
    range.selectNodeContents(holder);
    const text = range.getBoundingClientRect();
    // The link, button or row that holds the label: an inline span has no width of its own to
    // overflow, so cut-off text is measured on its box.
    const control = el.closest("a, button, li") ?? el;
    const box = control.getBoundingClientRect();
    const controlStyle = getComputedStyle(control);
    const padding =
      Number.parseFloat(controlStyle.paddingLeft) + Number.parseFloat(controlStyle.paddingRight);
    return {
      lines: Math.round(text.height / lineHeight),
      // The text is wider than the room inside its control, or the control hides its overflow.
      clipped:
        text.width > box.width - padding + 1 || control.scrollWidth > control.clientWidth + 1,
      ellipsis:
        [style.textOverflow, controlStyle.textOverflow].includes("ellipsis") &&
        (holder.scrollWidth > holder.clientWidth || control.scrollWidth > control.clientWidth),
      left: box.left,
      right: box.right,
    };
  });

const expectNoPageOverflow = async (page: Page) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "horizontal page overflow").toBeLessThanOrEqual(0);
};

test.describe("the Debt and borrowing nav label fits", () => {
  test.use({ storageState: AUTH_STATE });

  for (const width of [1024, 1280]) {
    test(`top bar at ${width} wide: one line, not cut off, inside the header`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/app/debt");
      await waitForHydration(page);
      const header = page.locator("header").first();
      const item = header.getByText(LABEL, { exact: true }).first();
      await expect(item).toBeVisible();
      const fit = await measure(item);
      expect(fit.lines, "lines of text").toBe(1);
      expect(fit.clipped, "label cut off").toBe(false);
      expect(fit.ellipsis, "label truncated").toBe(false);
      expect(fit.left).toBeGreaterThanOrEqual(0);
      expect(fit.right).toBeLessThanOrEqual(width);
      // No nav item sits on top of another: every top-level item's box ends before the next starts.
      const boxes = await header
        .locator("nav")
        .first()
        .locator(":scope a, :scope button")
        .evaluateAll((els) =>
          els
            .map((el) => el.getBoundingClientRect())
            .filter((r) => r.width > 0 && r.height > 0)
            .map((r) => ({ left: r.left, right: r.right, top: r.top }))
            .sort((a, b) => a.left - b.left),
        );
      const tops = boxes.map((b) => b.top);
      expect(Math.max(...tops) - Math.min(...tops), "nav items on one row").toBeLessThan(8);
      for (let i = 1; i < boxes.length; i += 1) {
        expect(
          (boxes[i]?.left ?? 0) + 1,
          `nav item ${i} overlaps the one before it`,
        ).toBeGreaterThanOrEqual(boxes[i - 1]?.right ?? 0);
      }
      // The list fits inside the nav, so no item runs under the controls at the end of the bar.
      const spill = await header
        .locator("nav")
        .first()
        .evaluate((nav) => {
          const list = nav.querySelector("ul");
          const last = list?.lastElementChild?.getBoundingClientRect();
          return (last?.right ?? 0) - nav.getBoundingClientRect().right;
        });
      expect(spill, "nav list spills past the nav").toBeLessThanOrEqual(0.5);
      await expectNoPageOverflow(page);
      await expect(page.getByRole("heading", { level: 1, name: PAGE_TITLE })).toBeVisible();
    });
  }

  for (const width of [768, 1023, 1024, 1280]) {
    test(`top bar at ${width} wide: Home is a nav item and every link has room inside its fill`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await waitForHydration(page);
      const nav = page.locator("header").first().locator('nav[aria-label="Primary"]');
      const home = nav.getByRole("link", { name: "Home", exact: true });
      await expect(home).toBeVisible();
      await expect(home).toHaveAttribute("aria-current", "page");
      const paddings = await nav.locator(":scope li > :is(a, button)").evaluateAll((els) =>
        els
          .filter((el) => el.getBoundingClientRect().width > 0)
          .map((el) => {
            const style = getComputedStyle(el);
            return Math.min(
              Number.parseFloat(style.paddingLeft),
              Number.parseFloat(style.paddingRight),
            );
          }),
      );
      expect(paddings.length).toBeGreaterThan(0);
      expect(Math.min(...paddings), "link padding each side").toBeGreaterThanOrEqual(12);
      const clipped = await nav
        .locator(":scope li > :is(a, button)")
        .evaluateAll((els) =>
          els.some(
            (el) => el.getBoundingClientRect().width > 0 && el.scrollWidth > el.clientWidth + 1,
          ),
        );
      expect(clipped, "a label is cut off").toBe(false);
      // Nothing spills out of the nav into the controls at the end of the bar.
      const spill = await nav.evaluate((el) => {
        const last = el.querySelector("ul")?.lastElementChild?.getBoundingClientRect();
        return (last?.right ?? 0) - el.getBoundingClientRect().right;
      });
      expect(spill, "nav list spills past the nav").toBeLessThanOrEqual(0.5);
      await expectNoPageOverflow(page);
    });
  }

  test("tablet at 768 wide: Debt and borrowing sits in the menu, one line, not cut off", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 800 });
    await page.goto("/app/debt");
    await waitForHydration(page);
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    const drawer = page.locator('[data-testid="mobile-nav-drawer"]');
    await expect(drawer).toBeVisible();
    const row = drawer.getByText(LABEL, { exact: true }).first();
    await expect(row).toBeVisible();
    const fit = await measure(row);
    expect(fit.lines).toBe(1);
    expect(fit.clipped).toBe(false);
    expect(fit.ellipsis).toBe(false);
    // "Pay" and its pages are inline in the tablet bar, so the drawer does not list them again.
    await expect(drawer.getByText("Pay", { exact: true })).toBeHidden();
  });

  test.describe("phone", () => {
    test.use({ viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true });

    test("drawer at 320 wide: one line, not cut off", async ({ page }) => {
      await page.goto("/app/debt");
      await waitForHydration(page);
      await page
        .locator('nav[aria-label="Main navigation"]')
        .getByRole("button", { name: "More pages" })
        .tap();
      const drawer = page.locator('[data-testid="mobile-nav-drawer"]');
      await expect(drawer).toBeVisible();
      // The drawer slides in: measure once it has stopped moving.
      await expect
        .poll(async () => {
          const box = await drawer.boundingBox();
          return (box?.x ?? 0) + (box?.width ?? 0);
        })
        .toBeLessThanOrEqual(320.5);
      const rows = drawer.getByText(LABEL, { exact: true });
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i += 1) {
        const fit = await measure(rows.nth(i));
        expect(fit.lines, `drawer row ${i} lines`).toBe(1);
        expect(fit.clipped, `drawer row ${i} cut off`).toBe(false);
        expect(fit.ellipsis, `drawer row ${i} truncated`).toBe(false);
        expect(fit.right).toBeLessThanOrEqual(320);
      }
      await expectNoPageOverflow(page);
      // The page title fits too.
      await page.keyboard.press("Escape");
      const h1 = page.getByRole("heading", { level: 1, name: PAGE_TITLE });
      await expect(h1).toBeVisible();
      const box = await h1.boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
    });
  });

  // Every bottom-bar item, the "More" button included, takes the same box: width, height, icon
  // and label (owner report 2026-11-18: More was 30px wide beside 73px links).
  for (const width of [320, 375, 390, 430]) {
    test.describe(`bottom bar at ${width} wide`, () => {
      test.use({ viewport: { width, height: 800 }, hasTouch: true, isMobile: true });

      test("every item, More included, has the same box, icon, label and a 44px target", async ({
        page,
      }) => {
        await page.goto("/app/accounts");
        await waitForHydration(page);
        const items = await page
          .locator('nav[aria-label="Main navigation"] li > :is(a, button)')
          .evaluateAll((els) =>
            els.map((el) => {
              const box = el.getBoundingClientRect();
              const icon = el.querySelector("svg")?.getBoundingClientRect();
              const label = el.querySelector("[data-nav-label]");
              const labelStyle = label ? getComputedStyle(label) : null;
              const style = getComputedStyle(el);
              return {
                tag: el.tagName,
                left: box.left,
                right: box.right,
                width: box.width,
                height: box.height,
                icon: icon ? `${Math.round(icon.width)}x${Math.round(icon.height)}` : "none",
                label: labelStyle
                  ? `${labelStyle.fontFamily}|${labelStyle.fontSize}|${labelStyle.fontWeight}`
                  : "none",
                gap: style.rowGap,
              };
            }),
          );
        expect(items).toHaveLength(5);
        expect(items.at(-1)?.tag, "More is the last item").toBe("BUTTON");
        const widths = items.map((item) => item.width);
        expect(Math.max(...widths) - Math.min(...widths), "item widths").toBeLessThanOrEqual(1);
        for (const item of items) {
          expect(item.height, "touch target height").toBeGreaterThanOrEqual(44);
          expect(item.width, "touch target width").toBeGreaterThanOrEqual(44);
        }
        expect(new Set(items.map((item) => item.icon)).size, "icon sizes").toBe(1);
        expect(new Set(items.map((item) => item.label)).size, "label styles").toBe(1);
        expect(new Set(items.map((item) => item.gap)).size, "icon to label gap").toBe(1);
        // Evenly spaced: each item starts where the one before it ends.
        for (let i = 1; i < items.length; i += 1) {
          expect(
            Math.abs((items[i]?.left ?? 0) - (items[i - 1]?.right ?? 0)),
            `space before item ${i}`,
          ).toBeLessThanOrEqual(1);
        }
        await expectNoPageOverflow(page);
      });
    });
  }
});

test.describe("marketing top bar", () => {
  for (const width of [768, 1023, 1024, 1280]) {
    test(`at ${width} wide every link has room inside its fill and the bar fits`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`${MARKETING_URL}/`);
      const nav = page.locator("header").first().locator('nav[aria-label="Primary"]');
      await expect(nav).toBeVisible();
      const links = await nav.locator(":scope li > :is(a, button)").evaluateAll((els) =>
        els
          .filter((el) => el.getBoundingClientRect().width > 0)
          .map((el) => {
            const style = getComputedStyle(el);
            return {
              padding: Math.min(
                Number.parseFloat(style.paddingLeft),
                Number.parseFloat(style.paddingRight),
              ),
              clipped: el.scrollWidth > el.clientWidth + 1,
            };
          }),
      );
      expect(links.length).toBeGreaterThan(0);
      expect(Math.min(...links.map((l) => l.padding))).toBeGreaterThanOrEqual(12);
      expect(
        links.some((l) => l.clipped),
        "a label is cut off",
      ).toBe(false);
      const spill = await nav.evaluate((el) => {
        const last = el.querySelector("ul")?.lastElementChild?.getBoundingClientRect();
        return (last?.right ?? 0) - el.getBoundingClientRect().right;
      });
      expect(spill, "nav list spills past the nav").toBeLessThanOrEqual(0.5);
      await expectNoPageOverflow(page);
    });
  }
});
