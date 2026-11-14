import {
  DEBT_CATEGORY,
  type Figure,
  isFigureKnown,
  type MonthsOfCover,
  PortfolioSnapshot,
} from "@flump/finance-engine";
import {
  Button,
  CurrencyInput,
  FormField,
  Icon,
  Money,
  ProgressBar,
  ProjectionNotice,
  ScenarioZone,
  SimulatorSplitLayout,
} from "@repo/ui";
import { ArrowRight } from "lucide-react";
import { type FC, type ReactNode, useEffect, useMemo, useState } from "react";
import { formatMonthsOfCover } from "~/features/dashboard/components/BudgetWidget";
import type { BudgetEntry } from "~/types/budget";
import { CATEGORY_LABELS, toMonthly } from "~/types/budget";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import type { RunwayScenario } from "~/utils/runwayStorage";
import {
  breakdownList,
  breakdownRow,
  bulkActions,
  cardHeader,
  cardTitle,
  cardTitleRow,
  ctaRow,
  introText,
  mutedNote,
  rowList,
  runwayRoot,
  scenarioValue,
  switchButton,
  toggleEnd,
  toggleInfo,
  toggleMeta,
  toggleName,
  toggleRow,
  toolGroup,
  totalRow,
  whatIfGrid,
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
  onNavigateToForecast: () => void;
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

interface ToggleItemProps {
  name: string;
  checked: boolean;
  switchLabel: string;
  switchTitle?: string;
  meta: ReactNode;
  amount?: ReactNode;
  onToggle: () => void;
}

const ToggleItem: FC<ToggleItemProps> = ({
  name,
  checked,
  switchLabel,
  switchTitle,
  meta,
  amount,
  onToggle,
}) => (
  <div className={toggleRow({ on: checked })}>
    <div className={toggleInfo()}>
      <p className={toggleName()}>{name}</p>
      <div className={toggleMeta()}>{meta}</div>
    </div>
    <div className={toggleEnd()}>
      {amount}
      <button
        aria-checked={checked}
        aria-label={switchLabel}
        className={switchButton()}
        role="switch"
        title={switchTitle}
        type="button"
        onClick={onToggle}
      />
    </div>
  </div>
);

interface BulkProps {
  onAll: () => void;
  onNone: () => void;
  label: string;
}

const BulkButtons: FC<BulkProps> = ({ onAll, onNone, label }) => (
  <div className={bulkActions()}>
    <Button aria-label={`Include all your ${label}`} size="sm" variant="ghost" onClick={onAll}>
      All
    </Button>
    <Button aria-label={`Include none of your ${label}`} size="sm" variant="ghost" onClick={onNone}>
      None
    </Button>
  </div>
);

const describeCover = (pool: number, monthlyBurn: number) => {
  const months = monthlyBurn > 0 ? pool / monthlyBurn : Number.POSITIVE_INFINITY;
  return {
    months,
    label: monthlyBurn > 0 ? formatMonthsOfCover(Math.round(months * 10) / 10) : "No end date",
  };
};

export const RunwayCalculator: FC<RunwayCalculatorProps> = ({
  entries,
  accounts,
  accountDetails,
  onNavigateToForecast,
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

  const setAllAccounts = (included: boolean) => {
    const next = Object.fromEntries(poolAccounts.map((a) => [a.id, included]));
    setIncludedAccounts(next);
    emit({ includedAccounts: next });
  };

  const toggleIncome = (incomeId: string) => {
    const next = { ...keptIncome, [incomeId]: !keptIncome[incomeId] };
    setKeptIncome(next);
    emit({ keptIncome: next });
  };

  const setAllIncome = (kept: boolean) => {
    const next = Object.fromEntries(nonPrimaryIncome.map((e) => [e.id, kept]));
    setKeptIncome(next);
    emit({ keptIncome: next });
  };

  const toggleExpense = (expenseId: string) => {
    const next = { ...keptExpenses, [expenseId]: !keptExpenses[expenseId] };
    setKeptExpenses(next);
    emit({ keptExpenses: next });
  };

  const setCategoryExpenses = (catEntries: BudgetEntry[], kept: boolean) => {
    const next = { ...keptExpenses, ...Object.fromEntries(catEntries.map((e) => [e.id, kept])) };
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
  const { months: coverMonths, label: coverLabel } = describeCover(pool, monthlyBurn);

  // Bar capped at 24 months for display. Neutral colour: Flump sets no target here.
  const displayMax = 24;
  const barPct = Math.min((coverMonths / displayMax) * 100, 100);

  const groupedExpenses = useMemo(() => {
    // Standard categories first, then debt and custom ones, so every counted row can be switched.
    const extra = expenseEntries
      .map((e) => e.category)
      .filter((c, i, all) => !EXPENSE_CATEGORIES.includes(c) && all.indexOf(c) === i);
    return [...EXPENSE_CATEGORIES, ...extra]
      .map((cat) => ({ cat, entries: expenseEntries.filter((e) => e.category === cat) }))
      .filter((g) => g.entries.length > 0);
  }, [expenseEntries]);

  const poolCard = (
    <div className={toolGroup()}>
      <div className={cardHeader()}>
        <div className={cardTitleRow()}>
          <h3 className={cardTitle()}>Money to draw on</h3>
        </div>
        {poolAccounts.length > 0 && (
          <BulkButtons
            label="accounts"
            onAll={() => setAllAccounts(true)}
            onNone={() => setAllAccounts(false)}
          />
        )}
      </div>
      <p className={mutedNote()}>
        Your saved figure counts current and savings accounts. Switch accounts on or off to see the
        difference.
      </p>
      {poolAccounts.length === 0 ? (
        <p className={mutedNote()}>No current, savings or investment accounts yet.</p>
      ) : (
        <div className={rowList()}>
          {poolAccounts.map((acc) => {
            const isIncluded = !!includedAccounts[acc.id];
            return (
              <ToggleItem
                key={acc.id}
                amount={<Money size="sm" value={getLatestBalance(acc.id)} />}
                checked={isIncluded}
                meta={
                  <>
                    <span>{acc.type}</span>
                    <span aria-hidden="true">·</span>
                    <span>{isIncluded ? "included" : "excluded"}</span>
                  </>
                }
                name={acc.name}
                switchLabel={`Include ${acc.name} in this illustration`}
                onToggle={() => toggleAccount(acc.id)}
              />
            );
          })}
          <div className={totalRow()}>
            <span>Total to draw on</span>
            <Money size="md" value={totalPool} />
          </div>
        </div>
      )}
    </div>
  );

  const controls = (
    <>
      {poolCard}
      <div className={toolGroup()}>
        <div className={cardHeader()}>
          <div className={cardTitleRow()}>
            <h3 className={cardTitle()}>What if</h3>
          </div>
        </div>
        <div className={whatIfGrid()}>
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
          <FormField label="Spending you would cut, a month">
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
      </div>
    </>
  );

  const content = (
    <>
      <div className={toolGroup()}>
        <p className={introText()}>
          Months of cover is how long your current and savings accounts would last if your income
          stopped. It counts essential spending and minimum debt payments. Changes you make in the
          illustration are not saved.
        </p>
        <h3 className={cardTitle()}>Months of cover in this illustration</h3>
        <p className={scenarioValue()}>{coverLabel}</p>
        <div className={breakdownList()}>
          <ProgressBar
            label="Months of cover, up to 24 months"
            max={displayMax}
            value={Number.isFinite(coverMonths) ? Math.min(coverMonths, displayMax) : displayMax}
            valueDisplay={
              barPct >= 100 ? "24+ months" : `${Math.floor(coverMonths)} of ${displayMax} months`
            }
            variant="primary"
          />
          <div className={breakdownRow()}>
            <span>Money to draw on</span>
            <Money size="sm" value={pool} />
          </div>
          <div className={breakdownRow()}>
            <span>Income you would keep, a month</span>
            <Money size="sm" value={totalKeptIncome} />
          </div>
          <div className={breakdownRow()}>
            <span>Spending you would keep, a month</span>
            <Money size="sm" value={totalSelectedExpenses} />
          </div>
          {debtNotInBudget > 0 && (
            <div className={breakdownRow()}>
              <span>Minimum debt payments not in your budget, a month</span>
              <Money size="sm" value={debtNotInBudget} />
            </div>
          )}
          <div className={breakdownRow()}>
            <strong>Monthly spending</strong>
            <Money size="md" value={monthlyBurn} />
          </div>
        </div>
        <div className={ctaRow()}>
          <Button variant="outline" onClick={onNavigateToForecast}>
            Open the savings page
            <Icon icon={ArrowRight} size="sm" />
          </Button>
        </div>
      </div>

      {nonPrimaryIncome.length > 0 && (
        <div className={toolGroup()}>
          <div className={cardHeader()}>
            <div className={cardTitleRow()}>
              <h3 className={cardTitle()}>Income you would keep</h3>
            </div>
            <BulkButtons
              label="income"
              onAll={() => setAllIncome(true)}
              onNone={() => setAllIncome(false)}
            />
          </div>
          <div className={rowList()}>
            {nonPrimaryIncome.map((e) => {
              const isKept = !!keptIncome[e.id];
              return (
                <ToggleItem
                  key={e.id}
                  checked={isKept}
                  meta={
                    <>
                      <Money size="sm" tone="muted" value={toMonthly(e)} />
                      <span>a month</span>
                      <span aria-hidden="true">·</span>
                      <span>{isKept ? "kept" : "excluded"}</span>
                    </>
                  }
                  name={e.name}
                  switchLabel={`Keep ${e.name} income`}
                  onToggle={() => toggleIncome(e.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {groupedExpenses.map(({ cat, entries: catEntries }) => (
        <div className={toolGroup()} key={cat}>
          <div className={cardHeader()}>
            <h3 className={cardTitle()}>{CATEGORY_LABELS[cat] ?? cat}</h3>
            <BulkButtons
              label={String(CATEGORY_LABELS[cat] ?? cat).toLowerCase()}
              onAll={() => setCategoryExpenses(catEntries, true)}
              onNone={() => setCategoryExpenses(catEntries, false)}
            />
          </div>
          <div className={rowList()}>
            {catEntries.map((e) => (
              <ToggleItem
                key={e.id}
                checked={!!keptExpenses[e.id]}
                meta={
                  <>
                    <Money size="sm" tone="muted" value={toMonthly(e)} />
                    <span>a month</span>
                    <span aria-hidden="true">·</span>
                    <span>{e.isEssential ? "essential" : "flexible"}</span>
                  </>
                }
                name={e.name}
                switchLabel={`Keep ${e.name} expense`}
                switchTitle={keptExpenses[e.id] ? "Keeping this" : "Cutting this"}
                onToggle={() => toggleExpense(e.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );

  const savedLabel = saved ? formatMonthsOfCover(saved.months) : null;

  return (
    <div className={runwayRoot()}>
      <ScenarioZone
        basis={
          // The saved figure, from saved data only: the illustration below never changes it.
          <span data-testid="runway-basis" id="runway-basis">
            {saved ? (
              <>
                Starting from your saved months of cover:{" "}
                <span data-figure="monthsOfCover">{savedLabel}</span>, from{" "}
                <Money size="sm" value={saved.liquidCash} /> in current and savings accounts
              </>
            ) : (
              "Starting from your budget entries. Months of cover shows once your budget has essential spending."
            )}
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
      </ScenarioZone>
    </div>
  );
};
