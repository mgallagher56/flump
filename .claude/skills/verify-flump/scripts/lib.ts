/**
 * Journey harness for verify-flump. A journey is a Bun script that calls `journey()`; run it with
 * `verify-flump drive <name-or-path>` so the VERIFY_* variables point at a live run.
 *
 * Every `step()` saves a screenshot and an ARIA snapshot of the page after the step, and appends a
 * line to journal.jsonl. A failed step saves the same evidence with a FAILED prefix, records the
 * error and exits 1. Console errors and HTTP 5xx responses are kept in problems.jsonl.
 */
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type APIResponse, type Browser, chromium, expect, type Page } from "@playwright/test";
import { requireEnv as env, optionalEnv } from "./env.ts";

export { expect, optionalEnv };

export const WEB_URL = env("VERIFY_WEB_URL");
export const MARKETING_URL = env("VERIFY_MARKETING_URL");
export const STORAGE_STATE = join(env("VERIFY_STATE_DIR"), "storage-state.json");

export interface Journey {
  page: Page;
  /** This journey's evidence folder (kept after verify-flump down). */
  dir: string;
  /** Runs one user action and saves what the page looks like after it. */
  step(label: string, action: () => Promise<void>): Promise<void>;
  /** A second, read-only view of saved data through the web app's same-origin /api proxy. */
  api(path: string): Promise<unknown>;
  /** Saves text or JSON proof (a read-back, a figure) under the journey's folder. */
  save(name: string, data: unknown): void;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Waits for React to hydrate (root.tsx sets html[data-hydrated]); clicks before that are lost. */
export async function hydrated(page: Page): Promise<void> {
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
}

/** Opens an app path and waits for hydration. */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await hydrated(page);
}

export async function journey(
  name: string,
  body: (j: Journey) => Promise<void>,
  options: { signedIn?: boolean } = {},
): Promise<void> {
  const dir = join(
    env("VERIFY_EVIDENCE_DIR"),
    "journeys",
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${slug(name)}`,
  );
  mkdirSync(dir, { recursive: true });
  const journal = join(dir, "journal.jsonl");
  const problems = join(dir, "problems.jsonl");
  const note = (file: string, entry: object) =>
    appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);

  let browser: Browser | undefined;
  let n = 0;
  let failed = false;
  try {
    browser = await chromium.launch({ headless: optionalEnv("VERIFY_HEADED") !== "1" });
    const context = await browser.newContext({
      baseURL: WEB_URL,
      viewport: { width: 1280, height: 900 },
      storageState: options.signedIn === false ? undefined : STORAGE_STATE,
    });
    const page = await context.newPage();
    page.on("console", (m) => {
      if (m.type() === "error")
        note(problems, { kind: "console", text: m.text(), url: page.url() });
    });
    page.on("response", (r) => {
      if (r.status() >= 500) note(problems, { kind: "http", status: r.status(), url: r.url() });
    });

    const capture = async (prefix: string) => {
      await page.screenshot({ path: join(dir, `${prefix}.png`), fullPage: true });
      const aria = await page
        .locator("body")
        .ariaSnapshot()
        .catch((e: Error) => `aria snapshot failed: ${e.message}`);
      writeFileSync(join(dir, `${prefix}.aria.yml`), aria);
    };

    const j: Journey = {
      page,
      dir,
      async step(label, action) {
        n += 1;
        const prefix = `${String(n).padStart(2, "0")}-${slug(label)}`;
        try {
          await action();
        } catch (error) {
          failed = true;
          await capture(`FAILED-${prefix}`).catch(() => {});
          note(journal, {
            step: n,
            label,
            url: page.url(),
            ok: false,
            error: String((error as Error).message ?? error),
          });
          throw error;
        }
        await capture(prefix);
        note(journal, { step: n, label, url: page.url(), ok: true });
        console.log(`ok   ${n}. ${label}`);
      },
      async api(path) {
        const response: APIResponse = await page.request.get(`/api${path}`, {
          // The proxy refuses calls without the app's CSRF header (api-proxy.server.ts).
          headers: { "x-flump-request": "1" },
        });
        if (!response.ok()) throw new Error(`GET /api${path} returned ${response.status()}`);
        return response.json();
      },
      save(file, data) {
        writeFileSync(
          join(dir, file),
          typeof data === "string" ? data : JSON.stringify(data, null, 2),
        );
      },
    };

    await body(j);
    console.log(`PASS ${name}\nevidence: ${dir}`);
  } catch (error) {
    if (!failed)
      note(journal, { step: n, label: "(outside a step)", ok: false, error: String(error) });
    console.error(`FAIL ${name}: ${(error as Error).message ?? error}\nevidence: ${dir}`);
    process.exitCode = 1;
  } finally {
    await browser?.close();
  }
}
