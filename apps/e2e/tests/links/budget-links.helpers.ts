import type { Locator, Page } from "@playwright/test";

/**
 * Shared steps for the budget link tests (audit slice 5). Each test changes the one user's saved
 * data through the same-origin /api proxy, as the pages do, and puts it back in a finally block.
 */
export const api = (page: Page, path: string, method = "GET", body?: unknown) =>
  page.evaluate(
    async ({ path, method, body }) => {
      const response = await fetch(`/api${path}`, {
        method,
        headers: { "Content-Type": "application/json", "x-flump-request": "1" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`${method} ${path} ${response.status}`);
      return (await response.json()) as unknown;
    },
    { path, method, body },
  );

export type Account = { id: string; name: string; monthlyContribution?: number | null };
export type Entry = {
  id: string;
  name: string;
  category: string;
  amount: number;
  linkKind?: string | null;
  linkAccountId?: string | null;
  ownership?: string;
  sharePercent?: number | null;
};

export async function accountNamed(page: Page, name: string): Promise<Account> {
  const accounts = (await api(page, "/accounts")) as Account[];
  const account = accounts.find((a) => a.name === name);
  if (!account) throw new Error(`No account named ${name}`);
  return account;
}

export async function entryNamed(page: Page, name: string): Promise<Entry> {
  const entries = (await api(page, "/budget-entries")) as Entry[];
  const entry = entries.find((e) => e.name === name);
  if (!entry) throw new Error(`No budget entry named ${name}`);
  return entry;
}

/** Whole pounds in a figure's text, so "£3,512" reads 3512. */
export function pounds(text: string | null): number {
  const match = text?.match(/£([\d,]+)/);
  if (!match?.[1]) throw new Error(`No £ figure in "${text}"`);
  return Number(match[1].replace(/,/g, ""));
}

/**
 * The budget's left over as a signed figure: the hero shows a shortfall as a positive amount
 * under "Short each month", with `data-figure-sign="-1"`.
 */
export async function leftOver(page: Page): Promise<number> {
  const figure = page.locator('[data-figure="budget.surplus"]').first();
  const sign = (await figure.getAttribute("data-figure-sign")) === "-1" ? -1 : 1;
  return sign * pounds(await figure.textContent());
}

/** A KPI card by its label: the nearest element around the label that holds a £ figure. */
export const kpiCard = (page: Page, label: string): Locator =>
  page.getByText(label, { exact: true }).first().locator("xpath=ancestor::*[contains(., '£')][1]");
