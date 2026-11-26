/**
 * Screenshots and frame-rate runs for the motion prototypes, against a running dev server.
 * Uses the Playwright that apps/e2e already installs.
 *
 *   bun prototypes/tools/capture.ts shots http://localhost:3001
 *   bun prototypes/tools/capture.ts fps http://localhost:3001
 *
 * Shots go to apps/marketing/prototypes/screenshots. The frame-rate run scrolls each page from
 * top to bottom, a fixed distance every frame, and records every frame's duration in the page.
 * "Phone" is 375 by 812 at device scale 2 with the CPU slowed four times (the usual stand-in for a
 * mid-range Android phone); the GPU is the Mac's, so it flatters WebGL.
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.resolve(import.meta.dir, "../../../e2e/package.json"));
const { chromium } = require("@playwright/test") as typeof import("@playwright/test");

const [mode = "shots", base = "http://localhost:3001", only] = process.argv.slice(2);
/** Optional third argument: one prototype, such as "3". */
type Id = "1" | "1b" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10";
const IDS = (["1", "1b", "2", "3", "4", "5", "6", "7", "8", "9", "10"] as const).filter(
  (id) => !only || id === only,
);
/** Prototypes whose page loads a 3D scene after first paint (wait longer, report the scene). */
const HAS_SCENE = new Set<Id>(["3", "6", "7", "9", "10"]);
const outDir = path.resolve(import.meta.dir, "../screenshots");
fs.mkdirSync(outDir, { recursive: true });

type Theme = "light" | "dark";
const SIZES = {
  375: { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  1280: { width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
} as const;

const browser = await chromium.launch({
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});

async function open(
  id: Id,
  size: keyof typeof SIZES,
  theme: Theme,
  reducedMotion: "reduce" | "no-preference" = "no-preference",
) {
  const { width, height, ...rest } = SIZES[size];
  const context = await browser.newContext({
    viewport: { width, height },
    ...rest,
    colorScheme: theme,
    reducedMotion,
  });
  await context.addInitScript((t) => localStorage.setItem("flump-theme", t), theme);
  const page = await context.newPage();
  await page.goto(`${base}/prototypes/${id}`, { waitUntil: "networkidle" });
  // Hide the dev panel in screenshots; the frame-rate run keeps it.
  await page.waitForTimeout(HAS_SCENE.has(id) ? 3500 : 1500);
  return { context, page };
}

const scrollTo = async (page: import("@playwright/test").Page, y: number) => {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" as ScrollBehavior }), y);
  await page.waitForTimeout(900);
};

/** Scroll positions worth a picture, per prototype, as functions of the page. */
type Stop = { name: string; y: (p: import("@playwright/test").Page) => Promise<number> };

/**
 * Prototypes 1b and 4 to 7: one picture at each section stop and one half a screen past it, so
 * every half-screen step shows. Stops are the `data-proto-section` elements.
 */
async function sectionStops(page: import("@playwright/test").Page): Promise<Stop[]> {
  const tops = await page.evaluate(() => {
    const header = document.querySelector("header")?.offsetHeight ?? 0;
    return Array.from(document.querySelectorAll<HTMLElement>("[data-proto-section]")).map(
      (el, i) => ({
        name: `${String(i + 1).padStart(2, "0")}-${(el.dataset.protoName ?? "section").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        y: Math.max(0, el.getBoundingClientRect().top + window.scrollY - header),
      }),
    );
  });
  const half = await page.evaluate(() => window.innerHeight / 2);
  return tops.flatMap((t) => [
    { name: t.name, y: async () => t.y },
    { name: `${t.name}-half`, y: async () => t.y + half },
  ]);
}

const STOPS: Partial<Record<Id, Stop[]>> = {
  "1": [
    { name: "top", y: async () => 0 },
    {
      name: "features",
      y: (p) => p.evaluate(() => (document.getElementById("features")?.offsetTop ?? 0) - 40),
    },
    {
      name: "steps",
      y: (p) => p.evaluate(() => (document.getElementById("rough-figures")?.offsetTop ?? 0) - 200),
    },
  ],
  "2": [
    { name: "top", y: async () => 0 },
    {
      name: "fog-half",
      y: (p) =>
        p.evaluate(() => {
          const hero = document.querySelector<HTMLElement>(".p2-hero");
          if (!hero) return 0;
          return window.innerWidth >= 1024 ? hero.offsetHeight * 0.22 : 140;
        }),
    },
    {
      name: "clear",
      y: (p) =>
        p.evaluate(() => {
          const hero = document.querySelector<HTMLElement>(".p2-hero");
          if (!hero) return 0;
          return window.innerWidth >= 1024 ? hero.offsetHeight * 0.55 : 380;
        }),
    },
    {
      name: "stepper",
      y: (p) =>
        p.evaluate(() => {
          const s = document.querySelector<HTMLElement>(".p2-areas");
          if (!s) return 0;
          const top = s.getBoundingClientRect().top + window.scrollY;
          return top + window.innerHeight * 0.85 * 2.1;
        }),
    },
  ],
  "3": [
    { name: "top", y: async () => 0 },
    {
      name: "parting",
      y: (p) => p.evaluate(() => window.innerHeight * 0.45),
    },
    {
      name: "dashboard",
      y: (p) =>
        p.evaluate(() => {
          const hero = document.querySelector<HTMLElement>(".p3-hero");
          return hero ? hero.offsetHeight - window.innerHeight : 0;
        }),
    },
  ],
};

async function shots() {
  for (const id of IDS) {
    for (const size of [375, 1280] as const) {
      for (const theme of ["light", "dark"] as const) {
        const { context, page } = await open(id, size, theme);
        await page.addStyleTag({ content: ".proto-panel{display:none!important}" });
        const stops = STOPS[id] ?? (await sectionStops(page));
        for (const stop of stops) {
          await scrollTo(page, await stop.y(page));
          const file = path.join(outDir, `p${id}-${size}-${theme}-${stop.name}.png`);
          await page.screenshot({ path: file });
        }
        if (id === "3") {
          const note = await page.locator("[data-testid=p3-scene-note]").textContent();
          console.log(`p3 ${size} ${theme}: ${note}`);
        }
        await context.close();
      }
    }
    // The reduced motion state, at the top, for each prototype.
    const { context, page } = await open(id, 1280, "light", "reduce");
    await page.screenshot({ path: path.join(outDir, `p${id}-1280-light-reduced-top.png`) });
    await context.close();
  }
}

interface FrameStats {
  frames: number;
  avgFps: number;
  p95Ms: number;
  slowPct: number;
  scene?: string | null;
  gpu?: string;
}

async function fpsRun(
  id: 1 | 2 | 3,
  size: keyof typeof SIZES,
  throttle: number,
): Promise<FrameStats> {
  const { context, page } = await open(id, size, "light");
  if (throttle > 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
  }
  await page.waitForTimeout(1000);
  const stats = await page.evaluate(async () => {
    const deltas: number[] = [];
    const end = Math.min(document.documentElement.scrollHeight - window.innerHeight, 9000);
    await new Promise<void>((resolve) => {
      let last = 0;
      const step = (now: number) => {
        if (last) deltas.push(now - last);
        last = now;
        window.scrollBy(0, 14);
        if (window.scrollY >= end - 1) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    const sorted = [...deltas].sort((a, b) => a - b);
    const total = deltas.reduce((a, b) => a + b, 0);
    return {
      frames: deltas.length,
      avgFps: Math.round((deltas.length * 1000) / total),
      p95Ms: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
      slowPct: Math.round((deltas.filter((d) => d > 20).length / deltas.length) * 100),
    };
  });
  const result: FrameStats = { ...stats };
  if (HAS_SCENE.has(id)) {
    result.scene = await page
      .locator("[data-testid$=scene-note]")
      .first()
      .textContent()
      .catch(() => null);
    result.gpu = await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl");
      const info = gl?.getExtension("WEBGL_debug_renderer_info");
      return info && gl ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "unknown";
    });
  }
  await context.close();
  return result;
}

if (mode === "shots") {
  await shots();
} else {
  const file = path.join(outDir, "frame-rates.json");
  const rows: Record<string, FrameStats> = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : {};
  for (const id of IDS) {
    rows[`p${id} desktop 1280`] = await fpsRun(id, 1280, 1);
    rows[`p${id} phone 375, CPU 4x slower`] = await fpsRun(id, 375, 4);
  }
  console.table(rows);
  fs.writeFileSync(file, `${JSON.stringify(rows, null, 2)}\n`);
}
await browser.close();
