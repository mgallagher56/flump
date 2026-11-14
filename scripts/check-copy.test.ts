import { describe, expect, test } from "bun:test";
import { copyOwner } from "./lib/copy-owners";
import { COPY_RULES, findCopyHits, isAllCaps, isTitleCase } from "./lib/copy-rules";
import { extractCopyStrings, extractJsonStrings, looksLikeProse } from "./lib/copy-strings";

const texts = (source: string, file = "x.tsx") =>
  extractCopyStrings(source, file).map((s) => s.text);
const rules = (source: string, file = "x.tsx") => findCopyHits(source, file).map((h) => h.rule);

describe("extractCopyStrings", () => {
  test("keeps JSX text, copy props and copy-shaped object values", () => {
    const source = `
      import { Thing } from "Some Module Path";
      const tool = { title: "Debt", slug: "debt-payoff", description: "See when a debt is paid off." };
      export const A = () => (
        <Thing label="Add account" className="Flex Row here" data-testid="Save Button here">
          Paid off in {months} months
        </Thing>
      );`;
    expect(texts(source)).toEqual([
      "Debt",
      "See when a debt is paid off.",
      "Add account",
      "Paid off in",
      "months",
    ]);
  });

  test("shows interpolations as a placeholder and reports the line", () => {
    const template = ["`You owe $", "{total} across $", "{n} debts`"].join("");
    const [s] = extractCopyStrings(`const a = 1;\nconst m = ${template};`);
    expect(s).toMatchObject({ line: 2, text: "You owe {…} across {…} debts" });
  });

  test("drops types, style calls, console output and thrown developer errors", () => {
    const source = `
      type Mode = "Some Mode Here" | "Other mode here";
      const c = css({ transition: "All 0.2s ease here" });
      console.log("Loaded the page for you");
      throw new Error("Loader data was missing here");`;
    expect(texts(source, "x.ts")).toEqual([]);
  });

  test("looksLikeProse rejects code values", () => {
    expect(looksLikeProse("1px solid red")).toBe(false);
    expect(looksLikeProse("flex-start")).toBe(false);
    expect(looksLikeProse("Add your first account")).toBe(true);
  });

  test("reads locale JSON values", () => {
    expect(extractJsonStrings('{\n  "a": "Net worth",\n  "b": "Say \\"hi\\""\n}')).toEqual([
      { line: 2, text: "Net worth", kind: "property" },
      { line: 3, text: 'Say "hi"', kind: "property" },
    ]);
  });
});

describe("copy rules", () => {
  test("every rule cites a guide section and a replacement", () => {
    for (const rule of COPY_RULES) {
      expect(rule.guide).toMatch(/^\d+\.\d+$/);
      expect(rule.use.length).toBeGreaterThan(0);
    }
    expect(new Set(COPY_RULES.map((r) => r.id)).size).toBe(COPY_RULES.length);
  });

  test("title case is flagged; sentence case and statutory names are not", () => {
    expect(isTitleCase("Full Repayment Schedule")).toBe(true);
    expect(isTitleCase("Mobile Bottom Navigation")).toBe(true);
    expect(isTitleCase("Add your first account")).toBe(false);
    expect(isTitleCase("Income Tax and National Insurance this year")).toBe(false);
    expect(isTitleCase("Budget saved. Add your next account")).toBe(false);
    expect(isTitleCase("Stocks and Shares ISA allowance")).toBe(false);
  });

  test("block capitals are flagged; acronyms and date formats are not", () => {
    expect(isAllCaps("HOW IT WORKS HERE")).toBe(true);
    expect(isAllCaps("HMRC and PAYE")).toBe(false);
    expect(isAllCaps("Use YYYY-MM")).toBe(false);
  });

  test.each([
    ["<p>Copied to clipboard!</p>", "exclamation"],
    ["<p>Total liabilities</p>", "liability"],
    ["<p>Show or hide widgets</p>", "module-widget"],
    ["<p>Discretionary allowance</p>", "discretionary"],
    ["<p>Something went wrong. Try again.</p>", "vague-error"],
    ["<p>Simply add your accounts</p>", "minimiser"],
    ["<p>You have only £200 saved</p>", "judgement"],
    ["<p>Escape the tax trap</p>", "tax-trap"],
    ["<p>Tax & NI this year</p>", "ampersand"],
    ["<p>Savings, e.g. a Cash ISA</p>", "latin"],
    ["<p>Your spending is categorized here</p>", "us-spelling"],
    ["<p>Supercharge your savings</p>", "hype"],
    ["<p>Net worth — this month</p>", "em-dash"],
  ])("%s -> %s", (jsx, rule) => {
    expect(rules(`export const A = () => ${jsx};`)).toContain(rule);
  });

  test("plain, neutral copy has no hits", () => {
    const source = `export const A = () => (
      <section aria-label="Your debts">
        <h2>What you owe</h2>
        <p>Estimate: paid off in Mar 2030, if payments stay at £320 a month.</p>
        <p>Easy access savings account at 4.1% AER</p>
        <button>Add debt</button>
      </section>);`;
    expect(rules(source)).toEqual([]);
  });
});

describe("copyOwner", () => {
  test.each([
    ["apps/web/app/features/dashboard/components/HomeDashboard/HomeDashboard.tsx", "PR 4"],
    ["apps/web/app/features/snapshot/components/MonthlyCheckInCard/MonthlyCheckInCard.tsx", "PR 4"],
    [
      "apps/web/app/features/snapshot/components/SnapshotHistoryPage/SnapshotHistoryPage.tsx",
      "PR 5",
    ],
    ["apps/web/app/containers/debt/DebtContainer.tsx", "PR 6"],
    ["apps/web/app/features/pension/components/PensionSummary/PensionSummary.tsx", "PR 7"],
    ["apps/web/app/routes/app.self-assessment.tsx", "PR 8"],
    ["apps/web/app/components/dialogs/addDebt/AddDebt.tsx", "PR 9"],
    ["packages/ui/src/calculators/Section24Calculator/Section24Calculator.tsx", "PR 10"],
    ["apps/web/app/routes/tools.$slug.tsx", "PR 11"],
    ["apps/marketing/src/pages/ToolsIndexPage.tsx", "PR 11"],
    ["apps/marketing/src/pages/HomePage.tsx", "PR 12"],
    ["packages/mcp/src/tools/read/listAccounts.ts", "shared"],
    ["packages/ui/src/patterns/ConfirmDialog/ConfirmDialog.tsx", "shared"],
  ])("%s -> %s", (file, owner) => {
    expect(copyOwner(file)).toBe(owner as ReturnType<typeof copyOwner>);
  });
});
