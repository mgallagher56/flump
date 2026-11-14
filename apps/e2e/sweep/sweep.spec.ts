import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type Browser, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";
import { WEB_URL } from "../support/env";
import { settle, syncBrowserClock } from "../support/page";
import { applyPersona } from "../support/personas";
import { readMetrics } from "./metrics";
import { SWEEP_SETS, type SweepPage, type SweepSet } from "./sets";

/**
 * Design sweep (E16 PR 13): every page of every set at 375x812 and 1280x800, light and dark, as a
 * full-page and a first-view JPEG, plus DOM metrics comparable with docs/design/e16-polish/before.
 * A local tool, not a CI job: `bun run e2e:sweep` (SWEEP_SETS=renter,dialogs runs a subset).
 */
const OUT = path.resolve(import.meta.dirname, "../../../docs/design/e16-polish/after");
const VARIANTS = [
  { width: 375, height: 812, theme: "light" },
  { width: 375, height: 812, theme: "dark" },
  { width: 1280, height: 800, theme: "light" },
  { width: 1280, height: 800, theme: "dark" },
] as const;
type Variant = (typeof VARIANTS)[number];

const only = process.env.SWEEP_SETS?.split(",").map((s) => s.trim());
const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

interface Shot {
  set: SweepSet;
  variant: Variant;
  page: Page;
  errors: string[];
  records: Record<string, unknown>[];
}

async function settleSafely(page: Page) {
  try {
    await settle(page);
  } catch {
    // A page that keeps the network busy is still shot; the metrics say what rendered.
  }
}

async function visit(shot: Shot, url: string): Promise<number | undefined> {
  shot.errors.length = 0;
  const response = await shot.page.goto(url);
  await settleSafely(shot.page);
  return response?.status();
}

async function capture(
  shot: Shot,
  name: string,
  url: string,
  status: number | undefined,
  extra = {},
) {
  const { set, variant, page } = shot;
  const base = path.join(OUT, set.name, `${name}-${variant.width}-${variant.theme}`);
  const jpeg = { type: "jpeg", quality: 60, animations: "disabled", caret: "hide" } as const;
  if (!set.viewportOnly) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ ...jpeg, path: `${base}.jpg`, fullPage: true });
  }
  await page.screenshot({ ...jpeg, path: set.viewportOnly ? `${base}.jpg` : `${base}-fold.jpg` });
  const current = new URL(page.url());
  const metrics = await readMetrics(page);
  shot.records.push({
    set: set.name,
    path: url.startsWith("http") ? new URL(url).pathname : url,
    width: variant.width,
    theme: variant.theme,
    status: status ?? null,
    url: current.origin === WEB_URL ? `${current.pathname}${current.search}` : current.href,
    errors: [...shot.errors],
    ...metrics,
    page: name,
    ...extra,
  });
}

async function sweepPage(shot: Shot, entry: SweepPage, unreachable: string[]) {
  const status = await visit(shot, entry.url);
  if (entry.optional && status === 404) {
    unreachable.push(`${entry.name}: 404, page does not exist`);
    return;
  }
  await capture(shot, entry.name, entry.url, status);
  if (!entry.tabs) return;

  const tabs = await shot.page.getByRole("tab").evaluateAll((els) =>
    els
      .filter((el) => (el as HTMLElement).checkVisibility?.())
      .map((el) => ({
        name: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
        selected: el.getAttribute("aria-selected") === "true",
      })),
  );
  for (const tab of tabs.filter((t) => !t.selected && t.name)) {
    try {
      await visit(shot, entry.url);
      await shot.page.getByRole("tab", { name: tab.name, exact: true }).first().click();
      await settleSafely(shot.page);
      await capture(shot, `${entry.name}--${slug(tab.name)}`, entry.url, status, { tab: tab.name });
    } catch (error) {
      unreachable.push(`${entry.name}--${slug(tab.name)}: ${String(error).split("\n")[0]}`);
    }
  }
}

async function sweepOnboarding(shot: Shot, unreachable: string[]) {
  const status = await visit(shot, "/app/onboarding");
  const heading = () =>
    shot.page
      .getByRole("heading", { level: 2 })
      .first()
      .textContent({ timeout: 5_000 })
      .catch(() => "");
  for (let step = 1; step <= 8; step++) {
    const title = (await heading()) ?? "";
    await capture(shot, `onboarding-${step}-${slug(title)}`, "/app/onboarding", status, {
      step: title,
    });
    const next = shot.page.getByRole("button", { name: /^next/i });
    if (!(await next.isVisible())) break;
    await next.click();
    await settleSafely(shot.page);
    if ((await heading()) === title) {
      unreachable.push(`onboarding step ${step + 1}: Next did not leave "${title}"`);
      break;
    }
  }
}

async function sweepDialogs(shot: Shot, unreachable: string[]) {
  for (const dialog of shot.set.dialogs ?? []) {
    if (dialog.width && dialog.width !== shot.variant.width) continue;
    const label = `${dialog.name} at ${shot.variant.width} ${shot.variant.theme}`;
    try {
      const status = await visit(shot, dialog.url);
      await dialog.open(shot.page);
      if (!dialog.inline)
        await shot.page
          .locator('[role="dialog"], [role="alertdialog"], [role="menu"]')
          .first()
          .waitFor({ state: "visible", timeout: 5_000 });
      await settleSafely(shot.page);
      await capture(shot, dialog.name, dialog.url, status, { dialog: dialog.name });
    } catch (error) {
      unreachable.push(`${label}: ${String(error).split("\n")[0]}`);
    }
  }
}

async function seed(browser: Browser, set: SweepSet) {
  if (!set.persona) return;
  const context = await browser.newContext({ baseURL: WEB_URL, storageState: AUTH_STATE });
  const page = await context.newPage();
  await page.goto("/healthz");
  await applyPersona(page, set.persona);
  await context.close();
}

test.describe.configure({ mode: "serial" });

for (const set of SWEEP_SETS) {
  test(`sweep ${set.name}`, async ({ browser }) => {
    test.skip(Boolean(only) && !only?.includes(set.name), "not in SWEEP_SETS");
    test.setTimeout(90 * 60_000);
    await seed(browser, set);
    rmSync(path.join(OUT, set.name), { recursive: true, force: true });
    mkdirSync(path.join(OUT, set.name), { recursive: true });

    const records: Record<string, unknown>[] = [];
    const unreachable: string[] = [];
    for (const variant of VARIANTS) {
      const context = await browser.newContext({
        baseURL: WEB_URL,
        viewport: { width: variant.width, height: variant.height },
        colorScheme: variant.theme,
        deviceScaleFactor: 1,
        locale: "en-GB",
        timezoneId: "Europe/London",
        reducedMotion: "reduce",
        storageState: set.persona ? AUTH_STATE : undefined,
      });
      context.setDefaultTimeout(15_000);
      const page = await context.newPage();
      const shot: Shot = { set, variant, page, errors: [], records };
      page.on("console", (message) => {
        if (message.type() === "error") shot.errors.push(message.text().slice(0, 300));
      });
      page.on("pageerror", (error) =>
        shot.errors.push(`pageerror: ${error.message.slice(0, 300)}`),
      );
      await syncBrowserClock(page);
      for (const entry of set.pages ?? []) {
        try {
          await sweepPage(shot, entry, unreachable);
        } catch (error) {
          unreachable.push(
            `${entry.name} at ${variant.width} ${variant.theme}: ${String(error).split("\n")[0]}`,
          );
        }
      }
      if (set.onboarding) await sweepOnboarding(shot, unreachable);
      if (set.dialogs) await sweepDialogs(shot, unreachable);
      await context.close();
    }

    const metrics = path.join(OUT, `metrics-${set.name}.json`);
    writeFileSync(metrics, `${JSON.stringify(records, null, 2)}\n`);
    const notes = path.join(OUT, `unreachable-${set.name}.json`);
    rmSync(notes, { force: true });
    if (unreachable.length > 0) {
      writeFileSync(notes, `${JSON.stringify([...new Set(unreachable)], null, 2)}\n`);
    }
    // Biome's JSON layout, so the repository's lint passes on the committed output.
    spawnSync("bunx", [
      "biome",
      "format",
      "--write",
      metrics,
      ...(unreachable.length ? [notes] : []),
    ]);
  });
}
