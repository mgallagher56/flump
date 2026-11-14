import {
  DEBT_CATEGORY,
  type Figure,
  isFigureKnown,
  type MonthsOfCover,
  PortfolioSnapshot,
} from "@flump/finance-engine";
import {
  CollapsibleDrawer,
  CurrencyInput,
  FormField,
  Money,
  ProjectionNotice,
  ScenarioZone,
  SimulatorSplitLayout,
  Switch,
} from "@repo/ui";
import { type FC, useEffect, useMemo, useState } from "react";
import { formatMonthsOfCover } from "~/features/dashboard/components/BudgetWidget";
import type { BudgetEntry } from "~/types/budget";
import { toMonthly } from "~/types/budget";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import type { RunwayScenario } from "~/utils/runwayStorage";
import {
  breakdownList,
  breakdownRow,
  controlsStack,
  introText,
  optionGroup,
  optionHint,
  optionItems,
  optionLegend,
  optionsStack,
  outcome,
  outcomeLabel,
  runwayRoot,
  scenarioValue,
} from "./RunwayCalculator.styles";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

interface AccountDetail {
  account_id: string;
  month: number;
  year: number;
  value: number;
}

export interface RunwayCalculatorProps {
  entries: BudgetEntry[];
  accounts: Account[];
  accountDetails: AccountDetail[];
  /**
   * Months of cover from saved data, from the engine's financial picture (E23). The headline and
   * the scenario's starting point read only this. Built from the props when not given.
   */
  baseline?: Figure<MonthsOfCover>;
  /**
   * Session-only scenario inputs (accounts counted, severance, cuts, dropped lines). Held by the
   * container so they survive tab switches and clear on reload. Never saved, never read by a
   * headline.
   */
  scenario?: RunwayScenario | null;
  onScenarioChange?: (scenario: RunwayScenario) => void;
}

const EXPENSE_CATEGORIES: BudgetEntry["category"][] = ["housing", "bills", "expenses"];

interface OptionItem {
  id: string;
  name: string;
  amount: number;
  /** Shown after the amount: "a month" for budget lines, nothing for balances. */
  perMonth: boolean;
  checked: boolean;
  onToggle: () => void;
}

/** One group of switches inside "More options": a plain label, no heading, no nested card. */
const OptionGroup: FC<{ label: string; items: OptionItem[] }> = ({ label, items }) =>
  items.length === 0 ? null : (
    <fieldset className={optionGroup()}>
      <legend className={optionLegend()}>{label}</legend>
      <div className={optionItems()}>
        {items.map((item) => (
          <Switch
            checked={item.checked}
            hint={
              <span className={optionHint()}>
                <Money size="sm" tone="muted" value={item.amount} />
                {item.perMonth ? " a month" : null}
              </span>
            }
            key={item.id}
            label={item.name}
            onChange={item.onToggle}
          />
        ))}
      </div>
    </fieldset>
  );

const describeCover = (pool: number, monthlyBurn: number) => ({
  label:
    monthlyBurn > 0
      ? formatMonthsOfCover(Math.round((pool / monthlyBurn) * 10) / 10)
      : "No end date",
});

export const RunwayCalculator: FC<RunwayCalculatorProps> = ({
  entries,
  accounts,
  accountDetails,
  baseline: baselineProp,
  scenario,
  onScenarioChange,
}) => {
  // The saved figure: the same engine selector the dashboard, Budget overview and MCP use.
  const baseline = useMemo(
    () =>
      baselineProp ??
      buildWorkspacePicture({ accounts, accountDetails, budgetEntries: entries }).monthsOfCover,
    [baselineProp, accounts, accountDetails, entries],
  );
  const saved = isFigureKnown(baseline) ? baseline.value : null;
  // Debt minimums the saved figure counts that are not budget rows, so an untouched illustration
  // starts from the saved commitments.
  const debtNotInBudget = saved
    ? Math.max(0, saved.commitments.debtCommitment - saved.commitments.budgetDebtPayments)
    : 0;

  // Balances and account categories come from the engine's snapshot, exactly as in the saved
  // figure. Current and savings start switched on; investments start off and can be switched on.
  const snapshot = useMemo(
    () => new PortfolioSnapshot(accounts as never, accountDetails as never),
    [accounts, accountDetails],
  );
  const categoryOf = (id: string) => snapshot.getAccount(id)?.category;
  const getLatestBalance = (accountId: string): number => snapshot.getLatestBalance(accountId);

  const poolAccounts = useMemo(
    () =>
      accounts.filter((a) => {
        const category = snapshot.getAccount(a.id)?.category;
        return category === "cash" || category === "savings" || category === "investments";
      }),
    [accounts, snapshot],
  );

  const nonPrimaryIncome = useMemo(
    () => entries.filter((e) => e.isIncome && !e.isPrimaryIncome),
    [entries],
  );

  const expenseEntries = useMemo(
    () => entries.filter((e) => !e.isIncome && e.category !== "savings"),
    [entries],
  );

  const initialScenario = scenario ?? null;

  const defaultAccounts = useMemo(
    () =>
      Object.fromEntries(
        poolAccounts.map((a) => {
          const category = categoryOf(a.id);
          return [a.id, category === "cash" || category === "savings"];
        }),
      ),
    [poolAccounts, snapshot],
  );
  // Income stopping is the question, so other income starts excluded; switch it on to keep it.
  const defaultIncome = useMemo(
    () => Object.fromEntries(nonPrimaryIncome.map((e) => [e.id, false])),
    [nonPrimaryIncome],
  );
  const defaultExpenses = useMemo(
    // Debt-payment rows always count in the saved figure, whatever their essential flag.
    () =>
      Object.fromEntries(
        expenseEntries.map((e) => [e.id, e.isEssential || e.category === DEBT_CATEGORY]),
      ),
    [expenseEntries],
  );

  const [includedAccounts, setIncludedAccounts] = useState<Record<string, boolean>>(() => ({
    ...defaultAccounts,
    ...(initialScenario?.includedAccounts ?? {}),
  }));
  const [keptIncome, setKeptIncome] = useState<Record<string, boolean>>(() => ({
    ...defaultIncome,
    ...(initialScenario?.keptIncome ?? {}),
  }));
  const [keptExpenses, setKeptExpenses] = useState<Record<string, boolean>>(() => ({
    ...defaultExpenses,
    ...(initialScenario?.keptExpenses ?? {}),
  }));
  const [severanceLump, setSeveranceLump] = useState<number>(
    () => initialScenario?.severanceLump ?? 0,
  );
  const [extraMonthlyCut, setExtraMonthlyCut] = useState<number>(
    () => initialScenario?.extraMonthlyCut ?? 0,
  );

  // New accounts or lines added while the page is open take their default.
  useEffect(() => {
    setIncludedAccounts((prev) => ({ ...defaultAccounts, ...prev }));
  }, [defaultAccounts]);
  useEffect(() => {
    setKeptIncome((prev) => ({ ...defaultIncome, ...prev }));
  }, [defaultIncome]);
  useEffect(() => {
    setKeptExpenses((prev) => ({ ...defaultExpenses, ...prev }));
  }, [defaultExpenses]);

  // Everything here is a scenario input: it goes to the container's session memory only.
  const emit = (next: Partial<RunwayScenario>) => {
    onScenarioChange?.({
      includedAccounts,
      keptIncome,
      keptExpenses,
      severanceLump,
      extraMonthlyCut,
      ...next,
    });
  };

  const toggleAccount = (accId: string) => {
    const next = { ...includedAccounts, [accId]: !includedAccounts[accId] };
    setIncludedAccounts(next);
    emit({ includedAccounts: next });
  };

  const toggleIncome = (incomeId: string) => {
    const next = { ...keptIncome, [incomeId]: !keptIncome[incomeId] };
    setKeptIncome(next);
    emit({ keptIncome: next });
  };

  const toggleExpense = (expenseId: string) => {
    const next = { ...keptExpenses, [expenseId]: !keptExpenses[expenseId] };
    setKeptExpenses(next);
    emit({ keptExpenses: next });
  };

  const handleSeveranceChange = (val: number) => {
    const clamped = Math.max(0, Math.min(100000, val));
    setSeveranceLump(clamped);
    emit({ severanceLump: clamped });
  };

  const handleExtraCutChange = (val: number) => {
    const clamped = Math.max(0, val);
    setExtraMonthlyCut(clamped);
    emit({ extraMonthlyCut: clamped });
  };

  const sameFlags = (current: Record<string, boolean>, defaults: Record<string, boolean>) =>
    Object.keys(defaults).every((id) => (current[id] ?? defaults[id]) === defaults[id]);
  const isScenarioModified =
    severanceLump !== 0 ||
    extraMonthlyCut !== 0 ||
    !sameFlags(includedAccounts, defaultAccounts) ||
    !sameFlags(keptIncome, defaultIncome) ||
    !sameFlags(keptExpenses, defaultExpenses);

  const handleResetScenario = () => {
    setIncludedAccounts(defaultAccounts);
    setKeptIncome(defaultIncome);
    setKeptExpenses(defaultExpenses);
    setSeveranceLump(0);
    setExtraMonthlyCut(0);
    onScenarioChange?.({
      includedAccounts: defaultAccounts,
      keptIncome: defaultIncome,
      keptExpenses: defaultExpenses,
      severanceLump: 0,
      extraMonthlyCut: 0,
    });
  };

  const totalPool = useMemo(
    () =>
      poolAccounts
        .filter((a) => includedAccounts[a.id])
        // An overdrawn account is debt, not negative cash (as in the saved figure).
        .reduce((s, a) => s + Math.max(0, getLatestBalance(a.id)), 0),
    [poolAccounts, includedAccounts, snapshot],
  );

  const totalKeptIncome = useMemo(
    () => nonPrimaryIncome.filter((e) => keptIncome[e.id]).reduce((s, e) => s + toMonthly(e), 0),
    [nonPrimaryIncome, keptIncome],
  );

  const totalSelectedExpenses = useMemo(
    () => expenseEntries.filter((e) => keptExpenses[e.id]).reduce((s, e) => s + toMonthly(e), 0),
    [expenseEntries, keptExpenses],
  );

  // ── Illustration ─────────────────────────────────────────────────────────
  const pool = totalPool + severanceLump;
  const monthlyBurn = Math.max(
    0,
    totalSelectedExpenses + debtNotInBudget - totalKeptIncome - extraMonthlyCut,
  );
  // With no saved figure and nothing to pay, there is nothing to show yet: "Not set", never infinity.
  const coverLabel =
    !saved && monthlyBurn === 0 ? "Not set" : describeCover(pool, monthlyBurn).label;

  const groupedExpenses = useMemo(() => {
    // Standard categories first, then debt and custom ones, so every counted row can be switched.
    const extra = expenseEntries
      .map((e) => e.category)
      .filter((c, i, all) => !EXPENSE_CATEGORIES.includes(c) && all.indexOf(c) === i);
    return [...EXPENSE_CATEGORIES, ...extra].flatMap((cat) =>
      expenseEntries.filter((e) => e.category === cat),
    );
  }, [expenseEntries]);

  const controls = (
    <div className={controlsStack()}>
      <FormField
        hint="A one-off payment added to what you can draw on"
        label="Redundancy pay or lump sum"
      >
        {(field) => (
          <CurrencyInput
            id={field.id}
            aria-describedby={field.describedBy}
            placeholder="0"
            value={severanceLump === 0 ? null : severanceLump}
            onValueChange={(v) => handleSeveranceChange(v ?? 0)}
          />
        )}
      </FormField>
      <FormField label="Spending you would cut each month">
        {(field) => (
          <CurrencyInput
            id={field.id}
            aria-describedby={field.describedBy}
            placeholder="0"
            value={extraMonthlyCut === 0 ? null : extraMonthlyCut}
            onValueChange={(v) => handleExtraCutChange(v ?? 0)}
          />
        )}
      </FormField>
    </div>
  );

  // Line-by-line switches stay one tap away, so the first view holds two inputs (P1.7). They sit
  // below the outcome, so opening them never pushes it out of view on a phone.
  const moreOptions = (
    <CollapsibleDrawer title="More options" variant="quiet">
      <div className={optionsStack()}>
        <OptionGroup
          items={poolAccounts.map((acc) => ({
            id: acc.id,
            name: acc.name,
            amount: getLatestBalance(acc.id),
            perMonth: false,
            checked: !!includedAccounts[acc.id],
            onToggle: () => toggleAccount(acc.id),
          }))}
          label="Accounts to draw on"
        />
        <OptionGroup
          items={nonPrimaryIncome.map((e) => ({
            id: e.id,
            name: e.name,
            amount: toMonthly(e),
            perMonth: true,
            checked: !!keptIncome[e.id],
            onToggle: () => toggleIncome(e.id),
          }))}
          label="Income you would keep"
        />
        <OptionGroup
          items={groupedExpenses.map((e) => ({
            id: e.id,
            name: e.name,
            amount: toMonthly(e),
            perMonth: true,
            checked: !!keptExpenses[e.id],
            onToggle: () => toggleExpense(e.id),
          }))}
          label="Spending you would keep"
        />
      </div>
    </CollapsibleDrawer>
  );

  // One outcome and two supporting figures (P1.7).
  const content = (
    <div className={outcome()}>
      {/* Untouched, this is the saved figure (its one place on the page); changed, an illustration. */}
      <p className={outcomeLabel()}>
        {isScenarioModified ? "Months of cover in this illustration" : "Months of cover"}
      </p>
      <p className={scenarioValue()} data-testid="runway-outcome" id="runway-outcome">
        {saved && !isScenarioModified ? (
          // Untouched, the outcome is the saved figure, so the consistency check can read it.
          <span data-figure="monthsOfCover">{coverLabel}</span>
        ) : (
          coverLabel
        )}
      </p>
      <p className={introText()}>
        An estimate of how long the money you can draw on would last if your income stopped,
        covering essential spending and minimum debt payments.
      </p>
      <dl className={breakdownList()}>
        <div className={breakdownRow()}>
          <dt>Money to draw on</dt>
          <dd>
            <Money size="sm" value={pool} />
          </dd>
        </div>
        <div className={breakdownRow()}>
          <dt>Essential spending to cover each month</dt>
          <dd>
            <Money size="sm" value={monthlyBurn} />
          </dd>
        </div>
      </dl>
    </div>
  );

  return (
    <div className={runwayRoot()}>
      <ScenarioZone
        announcement={isScenarioModified ? `${coverLabel} of cover` : ""}
        basis={
          <span data-testid="runway-basis" id="runway-basis">
            {saved
              ? "Starting from your saved budget and your current and savings accounts."
              : "Starting from your budget entries. Months of cover shows once your budget has essential spending."}
          </span>
        }
        isModified={isScenarioModified}
        notice={<ProjectionNotice />}
        title="Model a change to your budget"
        onReset={handleResetScenario}
      >
        <SimulatorSplitLayout
          content={content}
          contentLabel="Illustration results"
          controls={controls}
          controlsLabel="Months of cover illustration"
        />
        {moreOptions}
      </ScenarioZone>
    </div>
  );
};
