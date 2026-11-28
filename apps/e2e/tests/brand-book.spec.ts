import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const BRAND_BOOK_URL = pathToFileURL(resolve(REPO_ROOT, "docs/brand/BRAND-BOOK.html")).href;

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const;

const THEMES = ["light", "dark"] as const;

interface TextCheckFailure {
  diagram: string;
  kind: "overlap" | "clip";
  detail: string;
}

test.describe("brand book", () => {
  test("inline SVG diagrams have no overlapping or clipped text at 390px and 1440px in light and dark", async ({
    page,
  }) => {
    const failures: TextCheckFailure[] = [];
    let diagramCount = 0;

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await page.goto(BRAND_BOOK_URL);
      await page.evaluate(() => document.fonts.ready);

      for (const theme of THEMES) {
        await page.locator(`[data-theme-choice="${theme}"]`).click();
        await page.evaluate(
          () =>
            new Promise<void>((resolveRaf) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolveRaf())),
            ),
        );

        const result = await page.evaluate(() => {
          const svgs = Array.from(document.querySelectorAll("main svg"));
          let checkedDiagrams = 0;
          const issues: Array<{ diagram: string; kind: "overlap" | "clip"; detail: string }> = [];

          for (const svg of svgs) {
            const svgRect = svg.getBoundingClientRect();
            if (svgRect.width <= 0 || svgRect.height <= 0) continue;

            const textEls = Array.from(svg.querySelectorAll("text"));
            if (textEls.length === 0) continue;

            const figure = svg.closest("[data-diagram]");
            const label =
              figure?.getAttribute("data-diagram") ??
              svg.getAttribute("aria-label") ??
              svg.querySelector("title")?.textContent?.trim() ??
              "inline-svg";

            if (figure) checkedDiagrams += 1;

            const boxes: Array<{
              text: string;
              rect: { left: number; right: number; top: number; bottom: number };
            }> = [];

            const vb = (svg as SVGSVGElement).viewBox?.baseVal;
            const hasVb = vb && vb.width > 0 && vb.height > 0;
            const scaleX = hasVb ? svgRect.width / vb.width : 1;
            const scaleY = hasVb ? svgRect.height / vb.height : 1;

            for (const textEl of textEls) {
              const r = textEl.getBoundingClientRect();
              if (r.width <= 0 || r.height <= 0) continue;
              const txt = (textEl.textContent ?? "").trim();
              boxes.push({
                text: txt,
                rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
              });

              if (
                r.left < svgRect.left - 1 ||
                r.right > svgRect.right + 1 ||
                r.top < svgRect.top - 1 ||
                r.bottom > svgRect.bottom + 1
              ) {
                issues.push({
                  diagram: label,
                  kind: "clip",
                  detail: `"${txt}" rect [${r.left.toFixed(1)}, ${r.top.toFixed(1)}, ${r.right.toFixed(1)}, ${r.bottom.toFixed(1)}] exceeds SVG [${svgRect.left.toFixed(1)}, ${svgRect.top.toFixed(1)}, ${svgRect.right.toFixed(1)}, ${svgRect.bottom.toFixed(1)}]`,
                });
              }

              if (hasVb) {
                const vx1 = vb.x + (r.left - svgRect.left) / scaleX;
                const vx2 = vb.x + (r.right - svgRect.left) / scaleX;
                const vy1 = vb.y + (r.top - svgRect.top) / scaleY;
                const vy2 = vb.y + (r.bottom - svgRect.top) / scaleY;
                if (
                  vx1 < vb.x - 1 ||
                  vx2 > vb.x + vb.width + 1 ||
                  vy1 < vb.y - 1 ||
                  vy2 > vb.y + vb.height + 1
                ) {
                  issues.push({
                    diagram: label,
                    kind: "clip",
                    detail: `"${txt}" viewBox coords [${vx1.toFixed(1)}, ${vy1.toFixed(1)}, ${vx2.toFixed(1)}, ${vy2.toFixed(1)}] exceed viewBox [${vb.x}, ${vb.y}, ${vb.x + vb.width}, ${vb.y + vb.height}]`,
                  });
                }
              }
            }

            if (figure) {
              for (let i = 0; i < boxes.length; i += 1) {
                const a = boxes[i];
                if (!a) continue;
                for (let j = i + 1; j < boxes.length; j += 1) {
                  const b = boxes[j];
                  if (!b) continue;
                  const overlaps =
                    a.rect.right > b.rect.left + 1 &&
                    a.rect.left < b.rect.right - 1 &&
                    a.rect.bottom > b.rect.top + 1 &&
                    a.rect.top < b.rect.bottom - 1;
                  if (overlaps) {
                    issues.push({
                      diagram: label,
                      kind: "overlap",
                      detail: `"${a.text}" [${a.rect.left.toFixed(1)}, ${a.rect.top.toFixed(1)}, ${a.rect.right.toFixed(1)}, ${a.rect.bottom.toFixed(1)}] overlaps "${b.text}" [${b.rect.left.toFixed(1)}, ${b.rect.top.toFixed(1)}, ${b.rect.right.toFixed(1)}, ${b.rect.bottom.toFixed(1)}]`,
                    });
                  }
                }
              }
            }
          }

          return { checkedDiagrams, issues };
        });

        diagramCount = Math.max(diagramCount, result.checkedDiagrams);
        for (const issue of result.issues) {
          failures.push({
            diagram: `${issue.diagram} (${viewport.width}px ${theme})`,
            kind: issue.kind,
            detail: issue.detail,
          });
        }
      }
    }

    expect(diagramCount).toBeGreaterThanOrEqual(9);
    expect(failures).toEqual([]);
  });

  test("makes zero network requests, has no console errors, no horizontal overflow at 390px and sticky bar clears chapters", async ({
    page,
  }) => {
    const externalRequests: string[] = [];
    const errors: string[] = [];

    page.on("request", (req) => {
      const url = req.url();
      if (!url.startsWith("file://") && !url.startsWith("data:") && !url.startsWith("blob:")) {
        externalRequests.push(url);
      }
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
    });
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BRAND_BOOK_URL);
    await page.evaluate(() => document.fonts.ready);

    for (const theme of THEMES) {
      await page.locator(`[data-theme-choice="${theme}"]`).click();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    }

    for (const chapterId of ["logo", "motion"]) {
      await page.locator(".toc-trigger").click();
      await page.locator(`.toc-list a[href="#${chapterId}"]`).click();
      await page.waitForTimeout(150);

      const clearance = await page.evaluate((id) => {
        const header = document.querySelector(".book-bar");
        const target = document.getElementById(id);
        if (!header || !target) return null;
        return {
          headerBottom: header.getBoundingClientRect().bottom,
          chapterTop: target.getBoundingClientRect().top,
        };
      }, chapterId);

      expect(clearance).not.toBeNull();
      expect(clearance?.chapterTop ?? 0).toBeGreaterThanOrEqual((clearance?.headerBottom ?? 0) - 2);
    }

    expect(externalRequests).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("theme switch and reduce motion control update state, animations, hover tilt and videos", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BRAND_BOOK_URL);
    await page.evaluate(() => document.fonts.ready);

    await page.locator('[data-theme-choice="dark"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('[data-theme-choice="dark"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await page.locator('[data-theme-choice="light"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(darkBg).not.toBe(lightBg);

    await page.locator('[data-theme-choice="system"]').click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    await expect(page.locator('[data-theme-choice="system"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const motionBtn = page.locator("[data-motion-toggle]");
    await motionBtn.click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    await expect(motionBtn).toHaveAttribute("aria-pressed", "true");

    const tiltCard = page.locator("[data-motion-tilt]").first();
    await tiltCard.scrollIntoViewIfNeeded();
    const tiltBox = await tiltCard.boundingBox();
    expect(tiltBox).not.toBeNull();
    if (tiltBox) {
      await page.mouse.move(tiltBox.x + tiltBox.width * 0.25, tiltBox.y + tiltBox.height * 0.25);
    }

    const reducedCheck = await page.evaluate(() => {
      const orbAnim = Array.from(
        document.querySelectorAll('[data-motion-demo="hero-orbs"] .glass-orb'),
      ).map((el) => getComputedStyle(el).animationName);
      const bubbleAnim = Array.from(
        document.querySelectorAll('[data-motion-demo="bubble-field"] .motion-bubble'),
      ).map((el) => getComputedStyle(el).animationName);
      const entranceOpacity = Array.from(
        document.querySelectorAll('[data-motion-demo="entrance"] .motion-entrance-item'),
      ).map((el) => getComputedStyle(el).opacity);
      const timingScales = Array.from(
        document.querySelectorAll('[data-motion-demo="timing-scale"] .motion-timing-fill'),
      ).map((el) => getComputedStyle(el).transform);
      const chartOffset = getComputedStyle(
        document.querySelector('[data-motion-demo="drawn-chart"] .motion-chart-line') as Element,
      ).strokeDashoffset;
      const countText = document
        .querySelector('[data-motion-demo="count-up"] [data-count-up]')
        ?.textContent?.trim();
      const gatherDisplay = getComputedStyle(
        document.querySelector(".motion-gather-layer") as Element,
      ).display;
      const tiltEl = document.querySelector("[data-motion-tilt]") as HTMLElement;
      const tiltLightAttr = tiltEl.getAttribute("data-tilt-light");
      const tiltTransform = getComputedStyle(tiltEl).transform;
      const videosPaused = Array.from(document.querySelectorAll("video[data-brand-video]")).map(
        (v) => (v as HTMLVideoElement).paused,
      );

      return {
        orbAnim,
        bubbleAnim,
        entranceOpacity,
        timingScales,
        chartOffset,
        countText,
        gatherDisplay,
        tiltLightAttr,
        tiltTransform,
        videosPaused,
      };
    });

    expect(reducedCheck.orbAnim.every((a) => a === "none")).toBe(true);
    expect(reducedCheck.bubbleAnim.every((a) => a === "none")).toBe(true);
    expect(reducedCheck.entranceOpacity.every((o) => o === "1")).toBe(true);
    expect(
      reducedCheck.timingScales.every((t) => t === "none" || t === "matrix(1, 0, 0, 1, 0, 0)"),
    ).toBe(true);
    expect(reducedCheck.chartOffset).toBe("0px");
    expect(reducedCheck.countText).toBe("£21,000");
    expect(reducedCheck.gatherDisplay).toBe("none");
    expect(reducedCheck.tiltLightAttr).toBe("on");
    expect(reducedCheck.tiltTransform).toBe("none");
    expect(reducedCheck.videosPaused).toEqual([true, true]);

    await motionBtn.click();
    await expect(page.locator("html")).not.toHaveAttribute("data-motion");
    await expect(motionBtn).toHaveAttribute("aria-pressed", "false");

    await tiltCard.scrollIntoViewIfNeeded();
    if (tiltBox) {
      await page.mouse.move(tiltBox.x + tiltBox.width * 0.8, tiltBox.y + tiltBox.height * 0.2);
      await page.waitForTimeout(100);
    }
    const activeTilt = await page.evaluate(() => {
      const tiltEl = document.querySelector("[data-motion-tilt]") as HTMLElement;
      return {
        light: tiltEl.getAttribute("data-tilt-light"),
        transform: getComputedStyle(tiltEl).transform,
      };
    });
    expect(activeTilt.light).toBe("on");
    expect(activeTilt.transform).not.toBe("none");
  });

  test("print media hides controls and videos, forces light theme and shows finished animation states", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BRAND_BOOK_URL);
    await page.evaluate(() => document.fonts.ready);

    await page.locator('[data-theme-choice="light"]').click();
    const lightCanvasBg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );

    await page.locator('[data-theme-choice="dark"]').click();
    const darkCanvasBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(darkCanvasBg).not.toBe(lightCanvasBg);

    await page.emulateMedia({ media: "print" });

    const printCheck = await page.evaluate(() => {
      const barDisplay = getComputedStyle(document.querySelector(".book-bar") as Element).display;
      const controlsDisplay = getComputedStyle(
        document.querySelector(".page-controls") as Element,
      ).display;
      const replayDisplays = Array.from(document.querySelectorAll(".motion-replay-btn")).map(
        (el) => getComputedStyle(el).display,
      );
      const videoDisplays = Array.from(document.querySelectorAll("video.history-video")).map(
        (el) => getComputedStyle(el).display,
      );
      const posterDisplays = Array.from(document.querySelectorAll("img.history-video-poster")).map(
        (el) => getComputedStyle(el).display,
      );
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      const entranceOpacity = Array.from(
        document.querySelectorAll('[data-motion-demo="entrance"] .motion-entrance-item'),
      ).map((el) => getComputedStyle(el).opacity);
      const chartOffset = getComputedStyle(
        document.querySelector('[data-motion-demo="drawn-chart"] .motion-chart-line') as Element,
      ).strokeDashoffset;
      const gatherDisplay = getComputedStyle(
        document.querySelector(".motion-gather-layer") as Element,
      ).display;
      const countText = document
        .querySelector('[data-motion-demo="count-up"] [data-count-up]')
        ?.textContent?.trim();

      return {
        barDisplay,
        controlsDisplay,
        replayDisplays,
        videoDisplays,
        posterDisplays,
        bodyBg,
        entranceOpacity,
        chartOffset,
        gatherDisplay,
        countText,
      };
    });

    expect(printCheck.barDisplay).toBe("none");
    expect(printCheck.controlsDisplay).toBe("none");
    expect(printCheck.replayDisplays.length).toBeGreaterThan(0);
    expect(printCheck.replayDisplays.every((d) => d === "none")).toBe(true);
    expect(printCheck.videoDisplays).toEqual(["none", "none"]);
    expect(printCheck.posterDisplays).toEqual(["block", "block"]);
    expect(printCheck.bodyBg).toBe(lightCanvasBg);
    expect(printCheck.entranceOpacity.every((o) => o === "1")).toBe(true);
    expect(printCheck.chartOffset).toBe("0px");
    expect(printCheck.gatherDisplay).toBe("none");
    expect(printCheck.countText).toBe("£21,000");
  });
});
