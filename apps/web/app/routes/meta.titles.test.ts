import type { MetaFunction } from "react-router";
import { describe, expect, it } from "vitest";
import { meta as dashboardMeta } from "./_index";
import { meta as accountsMeta } from "./app.accounts._index";
import { meta as budgetMeta } from "./app.budget";
import { meta as debtMeta } from "./app.debt";
import { meta as mortgageMeta } from "./app.mortgage";
import { meta as profileMeta } from "./app.profile";
import { meta as selfAssessmentMeta } from "./app.self-assessment";

const titleOf = (meta: MetaFunction) =>
  (meta({} as Parameters<MetaFunction>[0]) as { title?: string }[]).find((tag) => tag.title)?.title;

// Signed-in pages each name themselves in the browser tab (pre-release defect 11).
describe("signed-in page titles", () => {
  it.each([
    ["/", dashboardMeta, "Your money | Flump"],
    ["/app/accounts", accountsMeta, "Accounts | Flump"],
    ["/app/budget", budgetMeta, "Budget | Flump"],
    ["/app/debt", debtMeta, "Debt | Flump"],
    ["/app/mortgage", mortgageMeta, "Mortgage | Flump"],
    ["/app/profile", profileMeta, "Settings | Flump"],
    ["/app/self-assessment (and /app/tax)", selfAssessmentMeta, "Self Assessment | Flump"],
  ])("%s has a page-specific title", (_route, meta, title) => {
    expect(titleOf(meta as MetaFunction)).toBe(title);
  });
});
