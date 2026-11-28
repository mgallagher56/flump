/**
 * Side-by-side captures for a marketing page slice (OTHER-PAGES-PLAN section 6): every route at
 * 390, 1000 and 1440 wide, light and dark, scrolled top to bottom first so every entrance has
 * played, then the top of the page, each band (each child of `main`) and the full page, with the
 * total page height and the scene state in `manifest.json`. Run it once against the approved
 * prototype and once against the production build, then open the two folders side by side.
 *
 *   bun apps/e2e/scripts/capture-marketing-pages.ts <base> <out-dir> <name=path> [name=path ...]
 *   CAPTURE_WIDTHS=920,960 bun apps/e2e/scripts/capture-marketing-pages.ts ...  (other widths)
 *
 * The browser starts with the GPU on (Metal through ANGLE on a Mac). Plain headless Chromium draws
 * WebGL in software, so a live scene falls back to its still orbs; `manifest.json` records which
 * one each capture shows.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const [base, outArg, ...routeArgs] = process.argv.slice(2);
if (!base || !outArg || routeArgs.length === 0) {
  console.error("usage: capture-marketing-pages.ts <base> <out-dir> <name=path> [...]");
  process.exit(1);
}
const outDir = path.resolve(outArg);
fs.mkdirSync(outDir, { recursive: true });
const routes = routeArgs.map((arg) => {
  const [name, route] = arg.split("=");
  if (!name || !route) throw new Error(`Bad route ${arg}`);
  return { name, route };
});

/** The plan's three widths; `CAPTURE_WIDTHS=920,960` captures others (a ruling between them). */
const WIDTHS = process.env.CAPTURE_WIDTHS
  ? process.env.CAPTURE_WIDTHS.split(",").map(Number)
  : [390, 1000, 1440];
const THEMES = ["light", "dark"] as const;
/** The prototype's dev panel is not part of the page. */
const HIDE = ".proto-panel { display: none !important; }";

const browser = await chromium.launch({
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});

type Entry = {
  route: string;
  width: number;
  theme: string;
  height: number;
  bands: number;
  scene: string;
  errors: string[];
};
const manifest: Entry[] = [];

for (const { name, route } of routes) {
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const phone = width < 768;
      const context = await browser.newContext({
        viewport: { width, height: phone ? 844 : 900 },
        deviceScaleFactor: 1,
        isMobile: phone,
        hasTouch: phone,
        colorScheme: theme,
      });
      await context.addInitScript((t) => localStorage.setItem("flump-theme", t), theme);
      const tab = await context.newPage();
      const errors: string[] = [];
      tab.on("console", (m) => {
        if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text());
      });
      tab.on("pageerror", (e) => errors.push(e.message));
      await tab.goto(`${base}${route}`, { waitUntil: "networkidle" });
      await tab.addStyleTag({ content: HIDE });
      await tab.waitForTimeout(2500);
      const scrollHeight = await tab.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < scrollHeight; y += 500) {
        await tab.evaluate((top) => window.scrollTo(0, top), y);
        await tab.waitForTimeout(250);
      }
      await tab.waitForTimeout(3500);
      await tab.evaluate(() => window.scrollTo(0, 0));
      await tab.waitForTimeout(800);
      const stem = `${name}-${width}-${theme}`;
      await tab.screenshot({ path: path.join(outDir, `${stem}-top.png`) });
      const bands = tab.locator("main > *");
      const count = await bands.count();
      for (let i = 0; i < count; i += 1) {
        const band = bands.nth(i);
        const box = await band.boundingBox();
        if (!box || box.height < 2) continue;
        await band.scrollIntoViewIfNeeded();
        await tab.waitForTimeout(400);
        await band.screenshot({
          path: path.join(outDir, `${stem}-band-${String(i + 1).padStart(2, "0")}.png`),
        });
      }
      await tab.screenshot({ path: path.join(outDir, `${stem}-full.png`), fullPage: true });
      const facts = await tab.evaluate(() => ({
        height: document.documentElement.scrollHeight,
        scene:
          // The prototype marks its stage `data-live`, production `data-scene` (SceneStage).
          [...document.querySelectorAll<HTMLElement>(".o1-stage[data-live], main [data-scene]")]
            .map((el) =>
              el.dataset.live === "true" || el.dataset.scene === "live" ? "live" : "still",
            )
            .join(",") || "none",
      }));
      manifest.push({ route, width, theme, bands: count, errors, ...facts });
      console.log(`${stem}: ${facts.height}px, ${count} bands, scene ${facts.scene}`);
      await context.close();
    }
  }
}
await browser.close();
fs.writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
