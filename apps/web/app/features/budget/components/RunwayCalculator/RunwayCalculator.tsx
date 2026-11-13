import { type Figure, isFigureKnown, type MonthsOfCover } from "@flump/finance-engine";
import {
  Button,
  Card,
  CurrencyInput,
  FormField,
  Icon,
  KpiCard,
  Money,
  ProgressBar,
  ScenarioZone,
  SimulatorSplitLayout,
} from "@repo/ui";
import { ArrowRight } from "lucide-react";
import { type FC, type ReactNode, useEffect, useMemo, useState } from "react";
import { formatMonthsOfCover } from "~/features/dashboard/components/BudgetWidget";
import type { BudgetEntry } from "~/types/budget";
import { CATEGORY_LABELS, toMonthly } from "~/types/budget";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import { isCashAccountType, type RunwayScenario } from "~/utils/runwayStorage";
import {
  breakdownList,
  breakdownRow,
  bulkActions,
  cardHeader,
  cardTitle,
  cardTitleRow,
  ctaRow,
  heroSubtext,
  heroValue,
  introCard,
  introText,
  mutedNote,
  rowList,
  runwayRoot,
  scenarioValue,
  statusCopy,
  switchButton,
  toggleEnd,
  toggleInfo,
  toggleMeta,
  toggleName,
  toggleRow,
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
const POOL_TYPES = new Set(["current", "saving", "savings", "investment", "investments"]);

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
    <Button aria-label={`Select all ${label}`} size="sm" variant="ghost" onClick={onAll}>
      All
    </Button>
    <Button aria-label={`Select none ${label}`} size="sm" variant="ghost" onClick={onNone}>
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

  const getLatestBalance = (accountId: string, fallback: number): number => {
    const details = accountDetails
      .filter((d: any) => (d.account_id || d.accountId) === accountId)
      .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month));
    if (details.length > 0) {
      const val = Number(details[0].value);
      if (Number.isFinite(val)) return val;
    }
    const bal = Number(fallback);
    return Number.isFinite(bal) ? bal : 0;
  };

  // Accounts that can be counted in the illustration. Current and savings start switched on (as
  // in the saved figure); investments start off and can be switched on to see the difference.
  const poolAccounts = useMemo(
    () =>
      accounts.filter((a) =>
        POOL_TYPES.has(
          String(a.type ?? "")
            .toLowerCase()
            .trim(),
        ),
      ),
    [accounts],
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
    () => Object.fromEntries(poolAccounts.map((a) => [a.id, isCashAccountType(a.type)])),
    [poolAccounts],
  );
  // Income stopping is the question, so other income starts excluded; switch it on to keep it.
  const defaultIncome = useMemo(
    () => Object.fromEntries(nonPrimaryIncome.map((e) => [e.id, false])),
    [nonPrimaryIncome],
  );
  const defaultExpenses = useMemo(
    () => Object.fromEntries(expenseEntries.map((e) => [e.id, e.isEssential])),
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
        .reduce((s, a) => s + Math.max(0, getLatestBalance(a.id, a.balance)), 0),
    [poolAccounts, includedAccounts, accountDetails],
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
    return EXPENSE_CATEGORIES.map((cat) => ({
      cat,
      entries: expenseEntries.filter((e) => e.category === cat),
    })).filter((g) => g.entries.length > 0);
  }, [expenseEntries]);

  const resultsCopy =
    monthlyBurn > 0 ? (
      <span className={heroSubtext()}>
        <span>Spending</span>
        <Money size="sm" value={monthlyBurn} />
        <span>a month</span>
      </span>
    ) : (
      "No monthly spending in this illustration, so there is no end date"
    );

  const poolCard = (
    <Card padding="lg">
      <div className={cardHeader()}>
        <div className={cardTitleRow()}>
          <h2 className={cardTitle()}>Money to draw on</h2>
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
                amount={<Money size="sm" value={getLatestBalance(acc.id, acc.balance)} />}
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
    </Card>
  );

  const controls = (
    <>
      {poolCard}
      <Card padding="lg">
        <div className={cardHeader()}>
          <div className={cardTitleRow()}>
            <h2 className={cardTitle()}>What if</h2>
          </div>
        </div>
        <div className={whatIfGrid()}>
          <FormField
            hint="A one-off payment added to what you can draw on"
            label="Severance or lump sum"
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
          <FormField hint="Spending you would cut each month" label="Extra monthly spending cut">
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
      </Card>
    </>
  );

  const content = (
    <>
      <Card padding="lg">
        <h2 className={cardTitle()}>Months of cover in this illustration</h2>
        <p className={scenarioValue()}>{coverLabel}</p>
        <p className={statusCopy()}>{resultsCopy}</p>
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
              <span>Debt minimums not in your budget, a month</span>
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
            See your Savings forecast
            <Icon icon={ArrowRight} size="sm" />
          </Button>
        </div>
      </Card>

      {nonPrimaryIncome.length > 0 && (
        <Card padding="lg">
          <div className={cardHeader()}>
            <div className={cardTitleRow()}>
              <h2 className={cardTitle()}>Income you would keep</h2>
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
        </Card>
      )}

      {groupedExpenses.map(({ cat, entries: catEntries }) => (
        <Card key={cat} padding="lg">
          <div className={cardHeader()}>
            <h2 className={cardTitle()}>{CATEGORY_LABELS[cat]}</h2>
            <BulkButtons
              label={String(CATEGORY_LABELS[cat]).toLowerCase()}
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
                    <span>{e.isEssential ? "essential" : "discretionary"}</span>
                  </>
                }
                name={e.name}
                switchLabel={`Keep ${e.name} expense`}
                switchTitle={keptExpenses[e.id] ? "Keeping this" : "Cutting this"}
                onToggle={() => toggleExpense(e.id)}
              />
            ))}
          </div>
        </Card>
      ))}
    </>
  );

  const savedLabel = saved ? formatMonthsOfCover(saved.months) : null;

  return (
    <div className={runwayRoot()}>
      <Card padding="md">
        <div className={introCard()}>
          <p className={introText()}>
            Months of cover is how long your current and savings accounts would cover your essential
            spending and debt minimums if your income stopped. Anything you change under the
            illustration stays on this page for this visit and is not saved.
          </p>
        </div>
      </Card>

      <KpiCard
        label="Your months of cover"
        notSetLabel="Not set"
        subtext={
          saved ? (
            <span className={heroSubtext()}>
              <Money size="sm" tone="onContrast" value={saved.liquidCash} />
              <span>in current and savings accounts, over</span>
              <Money size="sm" tone="onContrast" value={saved.monthlyEssentials} />
              <span>of essentials a month</span>
            </span>
          ) : (
            "Worked out once your budget has essential spending."
          )
        }
        tone="hero"
        value={
          savedLabel ? (
            <span className={heroValue()} data-figure="monthsOfCover">
              {savedLabel}
            </span>
          ) : null
        }
      />

      <ScenarioZone
        basis={
          saved ? (
            <>
              Starting from your figures: {savedLabel}, from{" "}
              <Money size="sm" value={saved.liquidCash} /> and essentials of{" "}
              <Money size="sm" value={saved.monthlyEssentials} /> a month
            </>
          ) : (
            "Starting from your budget lines"
          )
        }
        isModified={isScenarioModified}
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
