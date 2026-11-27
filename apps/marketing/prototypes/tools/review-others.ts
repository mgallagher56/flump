/**
 * Review run for the other pages (round one of OTHER-PAGES-PLAN), against a running dev server:
 * every page at 390, 1000 and 1440 wide, light and dark, scrolled top to bottom so every entrance
 * plays, then a full-page shot (dev panel hidden) and these checks:
 *
 * - console errors and page errors (the document's own 404 is expected: the server's route table
 *   does not know prototype paths);
 * - sideways overflow;
 * - visible text under 12 px;
 * - an orb or bubble over a heading or the hero's copy;
 * - an element still mid-entrance (opacity between 0.05 and 0.95) after the page has settled.
 *
 *   bun prototypes/tools/review-others.ts [base] [page] [level]
 *
 * The browser is launched with the GPU on (Metal through ANGLE). Plain headless Chromium draws
 * WebGL in software at a few frames a second, so the live scene falls back to its still orbs after
 * the stage's frame-rate check (under 28 fps): S1 and S2 then look like S0. That is the power
 * policy working, not a fault; capture with these flags to see the live scene.
 *
 * Shots go to prototypes/screenshots/others (gitignored with the rest).
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.resolve(import.meta.dir, "../../../e2e/package.json"));
const { chromium } = require("@playwright/test") as typeof import("@playwright/test");

const [base = "http://localhost:3001", onlyPage, onlyLevel] = process.argv.slice(2);
const PAGES = [
  "features",
  "pay",
  "debt",
  "pricing",
  "privacy",
  "ai",
  "preview",
  "security",
  "contact",
  "terms",
  "not-found",
].filter((p) => !onlyPage || onlyPage === "all" || p === onlyPage);
const WIDTHS = [390, 1000, 1440] as const;
const THEMES = ["light", "dark"] as const;
const outDir = path.resolve(import.meta.dir, "../screenshots/others");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});

type Finding = { page: string; width: number; theme: string; level: string; issue: string };
const findings: Finding[] = [];

for (const page of PAGES) {
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const level = onlyLevel ?? "default";
      const context = await browser.newContext({
        viewport: { width, height: width < 768 ? 844 : 900 },
        deviceScaleFactor: 1,
        isMobile: width < 768,
        hasTouch: width < 768,
        colorScheme: theme,
      });
      await context.addInitScript((t) => localStorage.setItem("flump-theme", t), theme);
      const tab = await context.newPage();
      const errors: string[] = [];
      tab.on("console", (m) => {
        if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text());
      });
      tab.on("pageerror", (e) => errors.push(e.message));
      const query = onlyLevel ? `?scene=${onlyLevel}` : "";
      await tab.goto(`${base}/prototypes/others/${page}${query}`, { waitUntil: "networkidle" });
      await tab.waitForTimeout(2500);
      // Scroll down in screen steps, pausing so each band's moment plays out.
      const height = await tab.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 500) {
        await tab.evaluate((top) => window.scrollTo(0, top), y);
        await tab.waitForTimeout(250);
      }
      await tab.waitForTimeout(3500);
      const result = await tab.evaluate(() => {
        const issues: string[] = [];
        if (document.documentElement.scrollWidth > window.innerWidth + 1)
          issues.push(
            `sideways overflow ${document.documentElement.scrollWidth - window.innerWidth}px`,
          );
        // Small text.
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const small = new Set<string>();
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const text = node.textContent?.trim();
          const el = node.parentElement;
          if (!text || !el || el.closest(".proto-panel, .o1-sr, .p11-sr")) continue;
          const style = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          if (
            r.width === 0 ||
            style.visibility === "hidden" ||
            el.closest("[aria-hidden='true'] .p11-sr")
          )
            continue;
          if (Number.parseFloat(style.fontSize) < 11.5)
            small.add(`${style.fontSize} "${text.slice(0, 30)}"`);
        }
        for (const s of small) issues.push(`small text ${s}`);
        // Orbs or bubbles over headings and hero copy.
        const orbs = [
          ...document.querySelectorAll<HTMLElement>(".o1-stage__orb, .proto-bubbles__bubble"),
        ].filter((o) => getComputedStyle(o.closest(".o1-stage__still") ?? o).opacity !== "0");
        const texts = [
          ...document.querySelectorAll<HTMLElement>(
            "main h1, main h2, main h3, .o1-hero__copy > *",
          ),
        ];
        for (const t of texts) {
          const range = document.createRange();
          range.selectNodeContents(t);
          for (const tr of range.getClientRects()) {
            for (const o of orbs) {
              const or = o.getBoundingClientRect();
              // Circle against rectangle.
              const cx = or.left + or.width / 2;
              const cy = or.top + or.height / 2;
              const rad = or.width / 2;
              const nx = Math.max(tr.left, Math.min(cx, tr.right));
              const ny = Math.max(tr.top, Math.min(cy, tr.bottom));
              if ((nx - cx) ** 2 + (ny - cy) ** 2 < rad * rad * 0.8)
                issues.push(`orb over "${t.textContent?.trim().slice(0, 30)}"`);
            }
          }
        }
        // Anything caught mid-entrance.
        for (const el of document.querySelectorAll<HTMLElement>("main *")) {
          const o = Number.parseFloat(getComputedStyle(el).opacity);
          if (
            o > 0.05 &&
            o < 0.95 &&
            !el.closest(".o1-stage, .proto-bubbles, [aria-hidden='true']")
          )
            issues.push(
              `mid-entrance opacity ${o.toFixed(2)} ${el.className.toString().slice(0, 40)}`,
            );
        }
        const scene =
          document.querySelector("[data-testid='o1-scene-note']")?.textContent ?? "no stage";
        return {
          issues: [...new Set(issues)],
          scene,
          level: document.querySelector(".o1")?.getAttribute("data-scene"),
        };
      });
      await tab.addStyleTag({ content: ".proto-panel { display: none !important; }" });
      const file = `${page}-${width}-${theme}-${result.level}.png`;
      await tab.screenshot({ path: path.join(outDir, file), fullPage: true });
      for (const issue of [...result.issues, ...errors.map((e) => `console: ${e}`)])
        findings.push({ page, width, theme, level: String(result.level), issue });
      console.log(`${file}  ${result.scene}  ${result.issues.length + errors.length} issue(s)`);
      await context.close();
    }
  }
}
await browser.close();
fs.writeFileSync(path.join(outDir, "findings.json"), `${JSON.stringify(findings, null, 2)}\n`);
for (const f of findings) console.log(`${f.page} ${f.width} ${f.theme} ${f.level}: ${f.issue}`);
console.log(`${findings.length} finding(s)`);
