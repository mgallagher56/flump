import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { type Browser, type BrowserContext, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";
import { WEB_URL } from "../support/env";
import { settle, syncBrowserClock } from "../support/page";
import { applyPersona, clearToNewUser } from "../support/personas";
import { CLS_INIT, readHoverOnly, readOverlayMetrics, readPhoneMetrics } from "./phoneChecks";
import { PHONE_SETS, type PhoneOverlay, type PhonePage, type PhoneSet } from "./phoneSets";

/**
 * Phone audit sweep (docs/audit/phone-audit-2026-11): every journey at 320x568, 375x812, 390x844
 * and 430x932 in light and dark, with touch and mobile emulation, plus 812x375 landscape on the
 * main pages. Records measured phone checks (phoneChecks.ts), overlay checks, scroll position
 * after navigation, focus walks through forms, axe at phone size and a 200% text pass.
 *
 * A local tool, not a CI job: `bun run e2e:phone`. Screenshots and JSON go OUTSIDE the repository
 * (PHONE_OUT, default <tmpdir>/flump-phone-audit): the repo is public. PHONE_SETS=renter,mkt runs a
 * subset; PHONE_WIDTHS=375 narrows the widths.
 */
const OUT = path.resolve(process.env.PHONE_OUT ?? path.join(os.tmpdir(), "flump-phone-audit"));

interface Variant {
  width: number;
  height: number;
  theme: "light" | "dark";
  landscape?: boolean;
}
const widths = process.env.PHONE_WIDTHS?.split(",").map(Number);
const SIZES: Array<[number, number]> = [
  [320, 568],
  [375, 812],
  [390, 844],
  [430, 932],
];
const PORTRAIT: Variant[] = SIZES.filter(([w]) => !widths || widths.includes(w)).flatMap(
  ([width, height]) => (["light", "dark"] as const).map((theme) => ({ width, height, theme })),
);
const LANDSCAPE: Variant = { width: 812, height: 375, theme: "light", landscape: true };
const VARIANTS = widths && !widths.includes(812) ? PORTRAIT : [...PORTRAIT, LANDSCAPE];

const only = process.env.PHONE_SETS?.split(",").map((s) => s.trim());

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

interface Run {
  set: PhoneSet;
  variant: Variant;
  page: Page;
  errors: string[];
  records: Record<string, unknown>[];
  unreachable: string[];
}

const tag = (v: Variant) => `${v.width}x${v.height}-${v.theme}`;

async function settleSafely(page: Page) {
  try {
    await settle(page);
  } catch {
    // A page that keeps the network busy is still measured.
  }
}

async function visit(run: Run, url: string): Promise<number | undefined> {
  run.errors.length = 0;
  const response = await run.page.goto(url);
  await settleSafely(run.page);
  return response?.status();
}

function shotPath(run: Run, name: string, suffix = "") {
  return path.join(OUT, run.set.name, `${name}-${tag(run.variant)}${suffix}.jpg`);
}

async function shoot(run: Run, name: string, fullPage: boolean) {
  const jpeg = { type: "jpeg", quality: 55, animations: "disabled", caret: "hide" } as const;
  await run.page.screenshot({ ...jpeg, path: shotPath(run, name, "-fold") });
  if (fullPage) await run.page.screenshot({ ...jpeg, path: shotPath(run, name), fullPage: true });
}

function record(run: Run, kind: string, name: string, data: Record<string, unknown>) {
  const current = new URL(run.page.url());
  run.records.push({
    journey: run.set.id,
    set: run.set.name,
    kind,
    name,
    width: run.variant.width,
    height: run.variant.height,
    theme: run.variant.theme,
    url: current.origin === WEB_URL ? `${current.pathname}${current.search}` : current.href,
    errors: [...run.errors],
    ...data,
  });
}

/** Full-page shots at the two narrowest widths only: the fold shot is the one compared. */
const fullAt = (v: Variant) => !v.landscape && v.width <= 375;

async function measurePage(run: Run, entry: PhonePage) {
  const status = await visit(run, entry.url);
  if (entry.optional && status === 404) {
    run.unreachable.push(`${entry.name}: 404`);
    return;
  }
  await run.page.evaluate(() => window.scrollTo(0, 0));
  await shoot(run, entry.name, fullAt(run.variant));
  record(run, "page", entry.name, { status, ...(await readPhoneMetrics(run.page)) });
  if (!entry.tabs || run.variant.landscape || run.variant.width > 375) return;

  const tabs = await run.page.getByRole("tab").evaluateAll((els) =>
    els
      .filter((el) => (el as HTMLElement).checkVisibility?.())
      .map((el) => ({
        name: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
        selected: el.getAttribute("aria-selected") === "true",
      })),
  );
  for (const tab of tabs.filter((t) => !t.selected && t.name)) {
    const name = `${entry.name}--${slug(tab.name)}`;
    try {
      await visit(run, entry.url);
      await run.page.getByRole("tab", { name: tab.name, exact: true }).first().click();
      await settleSafely(run.page);
      await shoot(run, name, false);
      record(run, "tab", name, { tab: tab.name, ...(await readPhoneMetrics(run.page)) });
    } catch (error) {
      run.unreachable.push(`${name} at ${tag(run.variant)}: ${String(error).split("\n")[0]}`);
    }
  }
}

/** Tab through the open overlay's fields; any jump of the page or the panel is recorded. */
async function walkFields(page: Page) {
  return page.evaluate(async () => {
    const panels = [
      ...document.querySelectorAll('[role="dialog"], [role="alertdialog"], main'),
    ].filter((el) => (el as HTMLElement).checkVisibility?.());
    const panel = panels.find((el) => el.tagName !== "MAIN") ?? panels[0];
    if (!panel) return [];
    const scroller = (el: Element | null): Element => {
      for (let n = el; n; n = n.parentElement) {
        const oy = getComputedStyle(n).overflowY;
        if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight) return n;
      }
      return document.scrollingElement ?? document.documentElement;
    };
    const fields = [...panel.querySelectorAll("input, select, textarea")].filter(
      (el) =>
        (el as HTMLElement).checkVisibility?.() &&
        !["hidden", "range"].includes((el as HTMLInputElement).type),
    ) as HTMLElement[];
    const jumps: string[] = [];
    for (const field of fields.slice(0, 12)) {
      const box = scroller(field);
      const beforeWin = window.scrollY;
      const beforeBox = box.scrollTop;
      field.focus();
      await new Promise((r) => setTimeout(r, 120));
      const r = field.getBoundingClientRect();
      const dy = Math.round(window.scrollY - beforeWin);
      const db = Math.round(box.scrollTop - beforeBox);
      const offscreen = r.top < 0 || r.bottom > window.innerHeight;
      if (Math.abs(dy) > 40 || Math.abs(db) > 120 || offscreen) {
        const label =
          field.getAttribute("aria-label") ||
          (field.id ? document.querySelector(`label[for="${field.id}"]`)?.textContent : "") ||
          field.getAttribute("name") ||
          field.tagName;
        jumps.push(
          `${String(label).trim().slice(0, 30)}: window ${dy}px, panel ${db}px${offscreen ? ", field off screen" : ""}`,
        );
      }
    }
    return jumps;
  });
}

async function measureOverlay(run: Run, overlay: PhoneOverlay) {
  const label = `${overlay.name} at ${tag(run.variant)}`;
  try {
    await visit(run, overlay.url);
    // Scroll a little first, so the page's position after closing can be compared.
    const scrollable = await run.page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight + 400,
    );
    if (scrollable && !overlay.url.includes("checkIn")) {
      await run.page.evaluate(() => window.scrollTo(0, 240));
    }
    await overlay.open(run.page);
    if (!overlay.inline) {
      await run.page
        .locator('[role="dialog"], [role="alertdialog"], [role="menu"]')
        .first()
        .waitFor({ state: "visible", timeout: 5_000 });
    }
    await settleSafely(run.page);
    // The page's position with the overlay open (the click scrolls its trigger into view first).
    const before = await run.page.evaluate(() => Math.round(window.scrollY));
    const trigger = await run.page.evaluate(() => {
      const el = document.querySelector('[aria-expanded="true"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top) };
    });
    await shoot(run, overlay.name, false);
    const metrics = overlay.inline ? null : await readOverlayMetrics(run.page);
    const jumps = overlay.walkFields ? await walkFields(run.page) : [];
    let afterClose: Record<string, unknown> = {};
    if (!overlay.inline) {
      await run.page.keyboard.press("Escape");
      await run.page.waitForTimeout(400);
      afterClose = await run.page.evaluate(
        (start) => ({
          stillOpen: [
            ...document.querySelectorAll('[role="dialog"], [role="alertdialog"], [role="menu"]'),
          ].some((el) => (el as HTMLElement).checkVisibility?.()),
          scrollOpen: start,
          scrollAfter: Math.round(window.scrollY),
          focusAfter: (() => {
            const a = document.activeElement;
            if (!a || a === document.body) return "body";
            return `${a.tagName.toLowerCase()} "${(a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 30)}"`;
          })(),
        }),
        before,
      );
    }
    record(run, "overlay", overlay.name, {
      ...(metrics ?? {}),
      trigger,
      fieldJumps: jumps,
      ...afterClose,
    });
  } catch (error) {
    run.unreachable.push(`${label}: ${String(error).split("\n")[0]}`);
  }
}

async function measureOnboarding(run: Run) {
  await visit(run, "/app/onboarding");
  const heading = () =>
    run.page
      .getByRole("heading", { level: 2 })
      .first()
      .textContent({ timeout: 5_000 })
      .catch(() => "");
  for (let step = 1; step <= 10; step++) {
    const title = (await heading()) ?? "";
    const name = `onboarding-${step}-${slug(title)}`;
    await shoot(run, name, false);
    record(run, "onboarding", name, {
      step: title,
      ...(await readPhoneMetrics(run.page)),
      fieldJumps: await walkFields(run.page),
    });
    const next = run.page.getByRole("button", { name: /^next/i });
    if (!(await next.isVisible())) break;
    await next.click();
    await settleSafely(run.page);
    if ((await heading()) === title) {
      run.unreachable.push(`onboarding step ${step + 1}: Next did not leave "${title}"`);
      break;
    }
  }
}

/**
 * Scroll position after navigation (the owner's first named fault, owned by phone-nav-fixes, and
 * its relatives): scroll each page down, follow a bottom-bar link, read scrollY; then go back.
 */
async function measureNavigation(run: Run) {
  const pages = run.set.pages.filter((e) => e.url.startsWith("/"));
  for (const entry of pages) {
    try {
      await visit(run, entry.url);
      const bar = run.page.getByRole("navigation", { name: "Main navigation" });
      const links = await bar.getByRole("link").evaluateAll((els) =>
        els.map((el) => ({
          name: (el.getAttribute("aria-label") || el.textContent || "").trim(),
          href: el.getAttribute("href"),
          current: el.getAttribute("aria-current"),
          box: (() => {
            const r = el.getBoundingClientRect();
            return [Math.round(r.left), Math.round(r.width), Math.round(r.height)];
          })(),
        })),
      );
      const target =
        links.find((l) => l.href && l.href !== entry.url && l.href !== "/") ?? links[0];
      await run.page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight * 0.6),
      );
      const scrolled = await run.page.evaluate(() => Math.round(window.scrollY));
      let afterNav: number | null = null;
      let afterBack: number | null = null;
      if (target?.href) {
        await bar.getByRole("link", { name: target.name, exact: true }).first().click();
        await run.page.waitForURL((u) => u.pathname === target.href, { timeout: 10_000 });
        await settleSafely(run.page);
        afterNav = await run.page.evaluate(() => Math.round(window.scrollY));
        await run.page.goBack();
        await settleSafely(run.page);
        afterBack = await run.page.evaluate(() => Math.round(window.scrollY));
      }
      record(run, "navigation", entry.name, {
        bottomBar: links,
        scrolled,
        to: target?.href,
        afterNav,
        afterBack,
      });
    } catch (error) {
      run.unreachable.push(
        `nav from ${entry.name} at ${tag(run.variant)}: ${String(error).split("\n")[0]}`,
      );
    }
  }

  // Loading state: hold the next page's data and shoot what shows meanwhile.
  try {
    await visit(run, "/");
    await run.page.route("**/*.data*", async (route) => {
      await new Promise((r) => setTimeout(r, 2_500));
      await route.continue();
    });
    await run.page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link")
      .nth(1)
      .click();
    await run.page.waitForTimeout(600);
    await shoot(run, "state-loading", false);
    record(run, "state", "loading", { ...(await readPhoneMetrics(run.page)) });
    await run.page.unrouteAll({ behavior: "wait" });
    await settleSafely(run.page);
    // Error state: the next navigation's data request fails.
    await run.page.route("**/*.data*", (route) => route.abort());
    await run.page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link")
      .nth(2)
      .click();
    await run.page.waitForTimeout(1_500);
    await shoot(run, "state-error", false);
    record(run, "state", "error", { ...(await readPhoneMetrics(run.page)) });
    await run.page.unrouteAll({ behavior: "ignoreErrors" });
  } catch (error) {
    run.unreachable.push(
      `loading and error states at ${tag(run.variant)}: ${String(error).split("\n")[0]}`,
    );
  }
}

async function measureA11y(run: Run) {
  for (const entry of run.set.pages) {
    try {
      await visit(run, entry.url);
      const result = await new AxeBuilder({ page: run.page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      record(run, "axe", entry.name, {
        violations: result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
          sample: v.nodes.slice(0, 3).map((n) => n.target.join(" ").slice(0, 100)),
        })),
      });
      if (run.variant.theme === "light") {
        // 200% text: the root size doubles (rem-based tokens follow), as browser text zoom does.
        await run.page.evaluate(() => {
          document.documentElement.style.fontSize = "200%";
        });
        await run.page.waitForTimeout(300);
        await shoot(run, `${entry.name}-text200`, false);
        const m = await readPhoneMetrics(run.page);
        record(run, "text200", entry.name, {
          hscroll: m.hscroll,
          overflow: m.overflow,
          clipped: m.clipped,
          chromeTop: m.chromeTop,
          chromeBottom: m.chromeBottom,
        });
      }
    } catch (error) {
      run.unreachable.push(
        `axe ${entry.name} at ${tag(run.variant)}: ${String(error).split("\n")[0]}`,
      );
    }
  }
}

async function prepare(browser: Browser, set: PhoneSet) {
  if (!set.persona && !set.newUser) return;
  const context = await browser.newContext({ baseURL: WEB_URL, storageState: AUTH_STATE });
  const page = await context.newPage();
  await page.goto("/healthz");
  if (set.newUser) await clearToNewUser(page);
  else if (set.persona) await applyPersona(page, set.persona);
  await context.close();
}

async function openContext(browser: Browser, set: PhoneSet, v: Variant): Promise<BrowserContext> {
  const context = await browser.newContext({
    baseURL: WEB_URL,
    viewport: { width: v.width, height: v.height },
    screen: { width: v.width, height: v.height },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    colorScheme: v.theme,
    locale: "en-GB",
    timezoneId: "Europe/London",
    reducedMotion: "reduce",
    storageState: set.persona || set.newUser ? AUTH_STATE : undefined,
  });
  context.setDefaultTimeout(15_000);
  await context.addInitScript(CLS_INIT);
  return context;
}

// Not serial: one worker keeps the order, and a set that fails (a seed refused by the reset rate
// limit) must not skip the sets after it.
test.describe.configure({ mode: "default" });

// The new user empties the data, so it runs after every persona set.
// The homeowner goes first: global setup has just seeded it, so no reset is spent.
const rank = (set: PhoneSet) =>
  set.newUser ? 2 : set.persona === "homeowner" && set.name === "homeowner" ? 0 : 1;
const ORDERED = [...PHONE_SETS].sort((a, b) => rank(a) - rank(b));

for (const set of ORDERED) {
  test(`phone ${set.id} ${set.name}`, async ({ browser }) => {
    test.skip(Boolean(only) && !only?.includes(set.name), "not in PHONE_SETS");
    test.setTimeout(150 * 60_000);
    await prepare(browser, set);
    rmSync(path.join(OUT, set.name), { recursive: true, force: true });
    mkdirSync(path.join(OUT, set.name), { recursive: true });

    const records: Record<string, unknown>[] = [];
    const unreachable: string[] = [];
    for (const variant of VARIANTS) {
      const context = await openContext(browser, set, variant);
      const page = await context.newPage();
      const run: Run = { set, variant, page, errors: [], records, unreachable };
      page.on("console", (m) => {
        if (m.type() === "error") run.errors.push(m.text().slice(0, 200));
      });
      page.on("pageerror", (e) => run.errors.push(`pageerror: ${e.message.slice(0, 200)}`));
      // Name the failing resource: the console line alone does not say which URL.
      page.on("response", (res) => {
        if (res.status() >= 400)
          run.errors.push(`${res.status()} ${new URL(res.url()).pathname.slice(0, 120)}`);
      });
      if (set.persona || set.newUser) await syncBrowserClock(page);

      const pages = variant.landscape ? set.pages.filter((e) => e.main) : set.pages;
      for (const entry of pages) {
        try {
          await measurePage(run, entry);
        } catch (error) {
          unreachable.push(`${entry.name} at ${tag(variant)}: ${String(error).split("\n")[0]}`);
        }
      }
      if (variant.landscape) {
        await context.close();
        continue;
      }
      if (set.onboarding) await measureOnboarding(run);
      // Overlays at every width in light, and at 375 in dark.
      if (variant.theme === "light" || variant.width === 375) {
        for (const overlay of set.overlays ?? []) await measureOverlay(run, overlay);
      }
      if (set.navigation && variant.theme === "light") await measureNavigation(run);
      if (set.a11y && variant.width === 375) await measureA11y(run);
      if (variant.width === 375 && variant.theme === "light") {
        await visit(run, set.pages[0]?.url ?? "/");
        record(run, "hover-only", "stylesheets", { rules: await readHoverOnly(page) });
      }
      await context.close();
    }

    writeFileSync(
      path.join(OUT, `phone-${set.name}.json`),
      `${JSON.stringify(records, null, 1)}\n`,
    );
    writeFileSync(
      path.join(OUT, `unreachable-${set.name}.json`),
      `${JSON.stringify([...new Set(unreachable)], null, 1)}\n`,
    );
  });
}
