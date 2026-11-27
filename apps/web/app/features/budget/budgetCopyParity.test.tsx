// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  type BreathingRoomFixedReason,
  type BudgetRowLink,
  type LinkedBudgetSource,
  linkedBudgetSource,
} from "@flump/finance-engine";
import {
  MONEYHELPER_DEBT_ADVICE_URL,
  PROJECTION_NOTICE_TEXT,
  SCENARIO_ANNOUNCEMENT_PREFIX,
  SCENARIO_BADGE_TEXT,
  SCENARIO_HIDE_LABEL,
  SCENARIO_RESET_LABEL,
} from "@repo/ui";
import { describe, expect, it } from "vitest";
import { CONFLICT_MESSAGE } from "~/services/conflict";
import { getCategoryLabel } from "~/types/budget";
import {
  BREATHING_ROOM_DESCRIPTION,
  BREATHING_ROOM_DETAIL,
  BREATHING_ROOM_LABEL,
  MONEY_TO_DRAW_ON_LABEL,
} from "~/utils/breathingRoom";
import { housingTenureLabel } from "../housing/components/HousingDetails";
import { linkedSourceText } from "./linkedEntries";

/**
 * The mobile Budget tab says what web's Budget page says (E12 S10, plan 9.10b). The app keeps its
 * words in `apps/mobile/src/copy/budget.ts`; this test, run by web's suite so a web-only change
 * fails at once, pins them to web's own constants, functions and inline words. The mobile file sits
 * outside this project, so it is loaded by path (as `homeCopyParity.test.tsx`). Where a web link
 * opens a page the app does not have yet, the app's words are web's with "on the website".
 */
const MOBILE_SRC = new URL("../../../../mobile/src/", import.meta.url);

type Words = Record<string, string>;
interface MobileBudget {
  BUDGET: Words;
  EMPTY: Words;
  OVERVIEW: Words;
  CATEGORIES: Words;
  BREATHING_ROOM: Words;
  BASIS: Words;
  SCENARIO: Words;
  RUNWAY: Words;
  DEBT_HELP: Words;
  EDITOR: Words;
  FREQUENCY_OPTIONS: readonly { value: string; label: string }[];
  safeToSpendLine(monthly: number): string;
  equationSpoken(isShort: boolean): string;
  categoryLabel(category: string): string;
  housingTenureLabel(status: string | null): string | undefined;
  linkedSourceText(source: LinkedBudgetSource | null): string | undefined;
  breathingRoomSource(cash: number, essentials: number): string;
  basisSubtitle(accounts: number, counted: number, spending: number): string;
  spendingHint(category: string, monthly: number, reason: BreathingRoomFixedReason | null): string;
  runwaySummarySaved(cash: number, essentials: number): string;
  runwaySummaryModified(cover: string): string;
  runwayAnnouncement(cover: string): string;
  addToLabel(category: string): string;
  deleteTitle(name: string): string;
  deleteMessage(name: string, amount: number, frequency: string): string;
}

const load = async () =>
  (await import(
    /* @vite-ignore */ fileURLToPath(new URL("copy/budget.ts", MOBILE_SRC))
  )) as MobileBudget;

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const container = source("../../containers/budget/BudgetContainer.tsx");
const overview = source("./components/BudgetOverview/BudgetOverview.tsx");
const list = source("./components/BudgetCategoryList/BudgetCategoryList.tsx");
const breathing = source("./components/BreathingRoom/BreathingRoom.tsx");
const basis = source("./components/BreathingRoomBasis/BreathingRoomBasis.tsx");
const runway = source("./components/RunwayCalculator/RunwayCalculator.tsx");
const editor = source("./components/BudgetEditor/BudgetEditor.tsx");
const dialog = source("./components/BudgetEntryDialog/BudgetEntryDialog.tsx");
const debtHelp = readFileSync(
  new URL("../../../../../packages/ui/src/patterns/DebtHelpLink/DebtHelpLink.tsx", import.meta.url),
  "utf8",
);

describe("the mobile Budget tab says what web's Budget page says", () => {
  it("the page header and the empty budget", async () => {
    const { BUDGET, EMPTY } = await load();
    expect(container).toContain(`title="${BUDGET.title}"`);
    expect(container).toContain(`subtitle="${BUDGET.subtitle}"`);
    expect(container).toContain(`title="${EMPTY.title}"`);
    expect(container).toContain(`description="${EMPTY.description}"`);
    expect(container).toContain("Add common budget items\n");
    expect(EMPTY.action).toBe("Add common budget items on the website");
  });

  it("the overview's labels, prompts and sub-lines", async () => {
    const m = await load();
    const o = m.OVERVIEW;
    expect(overview).toContain(`label={isShort ? "${o.short}" : "${o.leftOver}"}`);
    expect(overview).toContain(`emptyPrompt={notSetPrompt ?? "${o.emptyPrompt}"}`);
    expect(overview).toContain(`${o.takeHomeNotSet}{" "}`);
    expect(overview).toContain(`"${o.housingNotSet} Add it in your housing details below."`);
    expect(overview).toContain(">\n          Add your salary\n");
    expect(o.addSalary).toBe("Add your salary on the website");
    expect(o.addSalaryLine).toBe(
      "Add your salary to see what you have each month after essential spending.",
    );
    expect(overview).toContain("to see what you have each month after essential spending.");
    expect(overview).toContain(`"${o.addEssentialsLine}"`);
    expect(overview).toContain(`label="${o.moneyIn}"`);
    expect(overview).toContain(`subtext="${o.moneyInCaption}"`);
    expect(overview).toContain(`label="${o.goingOut}"`);
    expect(overview).toContain(`subtext="${o.goingOutCaption}"`);
    expect(overview).toContain(`title: "${o.supportingPrompt}"`);
  });

  it("the safe-to-spend sentence and the equation line", async () => {
    const m = await load();
    // Web: "Safe to spend before flexible spending:{" "}" then the figure, then the rest.
    expect(overview).toContain('Safe to spend before flexible spending:{" "}');
    expect(overview).toContain("a month, after essential spending, debt payments and savings.");
    expect(m.safeToSpendLine(1234)).toBe(
      "Safe to spend before flexible spending: £1,234 a month, after essential spending, debt payments and savings.",
    );
    for (const term of ["Money in", "Going out"]) {
      expect(overview).toContain(`>${term}</span>`);
    }
    expect(overview).toContain('{isShort ? "Short" : "Left over"}');
    expect(overview).toContain("<VisuallyHidden> minus </VisuallyHidden>");
    expect(overview).toContain("<VisuallyHidden> equals </VisuallyHidden>");
    expect(m.equationSpoken(false)).toBe("Money in minus Going out equals Left over");
    expect(m.equationSpoken(true)).toBe("Money in minus Going out equals Short");
  });

  it("where your money goes: the heading, the labels, the tenure and the source lines", async () => {
    const m = await load();
    expect(list).toContain(`title="${m.CATEGORIES.title}"`);
    expect(list).toContain(`description="${m.CATEGORIES.description}"`);
    expect(list).toContain(`${m.CATEGORIES.editBudget}\n`);
    for (const category of ["housing", "bills", "expenses", "savings", "income", "debt", "pets"]) {
      expect(m.categoryLabel(category)).toBe(getCategoryLabel(category));
    }
    for (const status of ["renting", "mortgage", "own_outright", "living_with_family", null]) {
      expect(m.housingTenureLabel(status)).toBe(housingTenureLabel(status as never));
    }
    const accounts = [
      { id: "isa", name: "Stocks ISA", type: "Investment" },
      { id: "card", name: "Credit card", type: "Credit Card" },
    ];
    const entries: { linked: BudgetRowLink; linkAccountId?: string; notSet?: true }[] = [
      { linked: "housing", notSet: true },
      { linked: "take_home" },
      { linked: "savings", linkAccountId: "isa" },
      { linked: "savings", linkAccountId: "isa", notSet: true },
      { linked: "debt", linkAccountId: "card", notSet: true },
      { linked: "debt", linkAccountId: "gone" },
    ];
    for (const entry of entries) {
      expect(m.linkedSourceText(linkedBudgetSource(entry, accounts))).toBe(
        linkedSourceText(entry, accounts),
      );
    }
  });

  it("Breathing room and what it counts", async () => {
    const m = await load();
    expect(m.BREATHING_ROOM.label).toBe(BREATHING_ROOM_LABEL);
    expect(m.BREATHING_ROOM.description).toBe(BREATHING_ROOM_DESCRIPTION);
    expect(m.BREATHING_ROOM.detail).toBe(BREATHING_ROOM_DETAIL);
    expect(m.BREATHING_ROOM.moneyToDrawOn).toBe(MONEY_TO_DRAW_ON_LABEL);
    expect(breathing).toContain(`emptyPrompt="${m.BREATHING_ROOM.emptyPrompt}"`);
    expect(breathing).toContain(`sampleLabel="${m.BREATHING_ROOM.viewSavings}"`);
    expect(breathing).toContain('From your savings of{" "}');
    expect(breathing).toContain('and essentials of{" "}');
    expect(m.breathingRoomSource(4500, 1675)).toBe(
      "From your savings of £4,500 and essentials of £1,675 a month.",
    );
    const b = m.BASIS;
    expect(basis).toContain(`closedLabel="${b.closed}"`);
    expect(basis).toContain(`openLabel="${b.open}"`);
    expect(basis).toContain(`title="${b.title}"`);
    expect(basis.replace(/\s+/g, " ")).toContain(b.intro);
    for (const words of [
      b.accountsHeading,
      b.spendingHeading,
      b.noAccounts,
      b.noSpending,
      b.notCounted,
    ]) {
      expect(basis).toContain(words);
    }
    expect(basis).toContain(`sampleLabel="${b.viewOrUpdate}"`);
    expect(basis).toContain('housing: "From your housing details, always counted"');
    expect(basis).toContain('debt: "Debt payments are always counted"');
    expect(m.spendingHint("housing", 950, "housing")).toBe(
      "Housing, £950 a month. From your housing details, always counted",
    );
    expect(basis).toContain(
      '`${drawOn.length} ${drawOn.length === 1 ? "account" : "accounts"}, ${counted} of ${spending.length} spending entries`',
    );
    expect(m.basisSubtitle(1, 7, 11)).toBe("1 account, 7 of 11 spending entries");
    expect(m.basisSubtitle(2, 0, 0)).toBe("2 accounts, 0 of 0 spending entries");
    expect(m.spendingHint("bills", 115, null)).toBe("Bills, £115 a month");
    expect(m.spendingHint("debt", 60, "debt")).toBe(
      "Debt, £60 a month. Debt payments are always counted",
    );
  });

  it("the what-if zone, its notice and the debt help line", async () => {
    const m = await load();
    expect(m.SCENARIO.badge).toBe(SCENARIO_BADGE_TEXT);
    expect(m.SCENARIO.reset).toBe(SCENARIO_RESET_LABEL);
    expect(m.SCENARIO.announcementPrefix).toBe(SCENARIO_ANNOUNCEMENT_PREFIX);
    expect(m.SCENARIO.hide).toBe(SCENARIO_HIDE_LABEL);
    expect(m.SCENARIO.notice).toBe(PROJECTION_NOTICE_TEXT);
    const r = m.RUNWAY;
    expect(runway).toContain(`title="${r.title}"`);
    expect(runway).toContain(`showLabel="${r.show}"`);
    expect(runway).toContain(`"${r.basisSaved}"`);
    expect(runway).toContain(`"${r.basisUnsaved}"`);
    expect(runway).toContain(`"${r.summaryUnsaved}"`);
    expect(runway).toContain(`label="${r.lump}"`);
    expect(runway).toContain(`${r.lumpHint}\n`);
    expect(runway).toContain(`label="${r.cut}"`);
    expect(runway).toContain(`title="${r.options}"`);
    expect(runway).toContain(`label="${r.accounts}"`);
    expect(runway).toContain(`label="${r.income}"`);
    expect(runway).toContain(`label="${r.result}"`);
    expect(runway).toContain(`saved ? "${r.noEndDate}" : "${r.notSet}"`);
    expect(runway).toContain(
      "`Starts from your savings of ${formatGbp(saved.liquidCash)} and essentials of ${formatGbp(saved.monthlyEssentials)} a month.`",
    );
    expect(m.runwaySummarySaved(4500, 1675)).toBe(
      "Starts from your savings of £4,500 and essentials of £1,675 a month.",
    );
    expect(runway).toContain("`Your illustration: Breathing room, ${coverLabel}.`");
    expect(m.runwaySummaryModified("about 2 months")).toBe(
      "Your illustration: Breathing room, about 2 months.",
    );
    expect(runway).toContain("`Breathing room, ${coverLabel}`");
    expect(m.runwayAnnouncement("about 2 months")).toBe("Breathing room, about 2 months");
    expect(m.DEBT_HELP.url).toBe(MONEYHELPER_DEBT_ADVICE_URL);
    expect(debtHelp).toContain(`${m.DEBT_HELP.lead}{" "}`);
    expect(debtHelp).toContain(`aria-label="${m.DEBT_HELP.label}"`);
    expect(debtHelp).toContain(`${m.DEBT_HELP.link}\n`);
  });

  it("the editor's labels, buttons, confirmation and messages", async () => {
    const m = await load();
    const e = m.EDITOR;
    for (const label of [e.name, e.amount, e.frequency]) {
      expect(dialog).toContain(`label="${label}"`);
    }
    expect(dialog).toContain(`"${e.editTitle}"`);
    expect(dialog).toContain(`${e.essential}\n`);
    expect(dialog).toContain(`"${e.save}"`);
    expect(dialog).toContain(`${e.cancel}\n`);
    for (const { value, label } of m.FREQUENCY_OPTIONS) {
      expect(dialog).toContain(`<option value="${value}">${label}</option>`);
    }
    expect(editor).toContain(`${e.heading}\n`);
    expect(editor).toContain(`${e.finish}\n`);
    expect(editor).toContain(`INCOME ? "${e.moneyIn}"`);
    expect(editor).toContain(`${e.noEntries}</p>`);
    expect(editor).toContain(
      `category === INCOME ? "${e.addIncome}" : \`Add to \${label.toLowerCase()}\``,
    );
    expect(m.addToLabel("bills")).toBe("Add to bills");
    expect(m.addToLabel("income")).toBe("Add income");
    expect(editor).toContain(`confirmLabel="${e.deleteEntry}"`);
    expect(editor).toContain('title={`Delete ${toRemove?.name ?? "entry"}?`}');
    expect(m.deleteTitle("Rent")).toBe("Delete Rent?");
    expect(editor).toContain("will be deleted from your budget. This cannot be undone.");
    expect(editor).toContain('{ value: "monthly", label: "a month" }');
    expect(editor).toContain('{ value: "annual", label: "a year" }');
    expect(editor).toContain('{ value: "weekly", label: "a week" }');
    expect(m.deleteMessage("Rent", 950, "monthly")).toBe(
      "Rent, £950 a month, will be deleted from your budget. This cannot be undone.",
    );
    expect(m.deleteMessage("Insurance", 360, "annual")).toBe(
      "Insurance, £360 a year, will be deleted from your budget. This cannot be undone.",
    );
    expect(editor).toContain(`toast({ title: "${e.saved}" })`);
    expect(editor).toContain(`toast({ title: "${e.deleted}" })`);
    for (const message of [e.addFailed, e.saveFailed, e.deleteFailed]) {
      expect(container).toContain(`"${message}"`);
    }
    expect(e.conflict).toBe(CONFLICT_MESSAGE);
  });
});
