import {
  Button,
  Card,
  CurrencyInput,
  FormField,
  Icon,
  KpiCard,
  Money,
  ProgressBar,
  SimulatorSplitLayout,
  StatusBadge,
} from "@repo/ui";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { type FC, type ReactNode, useEffect, useMemo, useState } from "react";
import { ScenarioZone } from "~/features/scenario/components/ScenarioZone";
import type { BudgetEntry } from "~/types/budget";
import { CATEGORY_LABELS, toMonthly } from "~/types/budget";
import {
  loadRunwaySettings,
  type RunwaySavedSettings,
  type RunwayScenario,
  saveRunwaySettings,
} from "~/utils/runwayStorage";
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
  statusRow,
  switchButton,
  thresholds,
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
  /** Saved preference: which accounts count towards the pool. */
  savedSettings?: RunwaySavedSettings | null;
  onSaveSettings?: (settings: RunwaySavedSettings) => void;
  /**
   * Session-only scenario inputs (severance, extra cuts, dropped lines). Held by the container so
   * they survive tab switches and clear on reload. Never saved, never read by a headline.
   */
  scenario?: RunwayScenario | null;
  onScenarioChange?: (scenario: RunwayScenario) => void;
}

const EXPENSE_CATEGORIES: BudgetEntry["category"][] = ["housing", "bills", "expenses"];

type RunwayStatus = "critical" | "caution" | "moderate" | "healthy";

function getRunwayStatus(months: number): RunwayStatus {
  if (months < 3) return "critical";
  if (months < 6) return "caution";
  if (months < 12) return "moderate";
  return "healthy";
}

const STATUS_BADGE: Record<
  RunwayStatus,
  { variant: "danger" | "warning" | "info" | "positive"; label: string }
> = {
  critical: { variant: "danger", label: "Critical" },
  caution: { variant: "warning", label: "Caution" },
  moderate: { variant: "info", label: "Moderate" },
  healthy: { variant: "positive", label: "Healthy" },
};

const BAR_VARIANT: Record<RunwayStatus, "danger" | "warning" | "primary" | "positive"> = {
  critical: "danger",
  caution: "warning",
  moderate: "primary",
  healthy: "positive",
};

const THRESHOLDS = ["3 mo", "6 mo", "12 mo"];

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

const describeRunway = (pool: number, monthlyBurn: number) => {
  const months = monthlyBurn > 0 ? pool / monthlyBurn : Number.POSITIVE_INFINITY;
  const whole = Math.floor(months % 12);
  const years = Math.floor(months / 12);
  const label =
    monthlyBurn === 0
      ? "Indefinitely (no expenses)"
      : months > 120
        ? `${Math.floor(months / 12)}+ years`
        : years > 0
          ? `${years} yr${years !== 1 ? "s" : ""} ${whole} mo${whole !== 1 ? "s" : ""}`
          : `${Math.floor(months)} months`;
  return { months, label };
};

export const RunwayCalculator: FC<RunwayCalculatorProps> = ({
  entries,
  accounts,
  accountDetails,
  onNavigateToForecast,
  savedSettings,
  onSaveSettings,
  scenario,
  onScenarioChange,
}) => {
  const isSavingsOrInvestmentAccount = (type?: string) => {
    if (!type) return false;
    const t = type.toLowerCase().trim();
    return (
      t === "current" ||
      t === "saving" ||
      t === "savings" ||
      t === "investment" ||
      t === "investments"
    );
  };

  const getLatestBalance = (accountId: string, fallback: number): number => {
    const details = accountDetails
      .filter((d: any) => (d.account_id || d.accountId) === accountId)
      .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month));
    if (details.length > 0) {
      const val = Number(details[0].value);
      if (Number.isFinite(val) && val > 0) return val;
    }
    const bal = Number(fallback);
    if (Number.isFinite(bal) && bal > 0) return bal;
    if (details.length > 0) return Number(details[0].value) || 0;
    return bal || 0;
  };

  // ── Savings pool (includes Current, Saving, and Investment accounts) ─────
  const savingsAccounts = useMemo(
    () => accounts.filter((a) => isSavingsOrInvestmentAccount(a.type)),
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

  // Initial settings from props or localStorage
  const initialSettings = useMemo(() => {
    return savedSettings ?? loadRunwaySettings();
  }, [savedSettings]);
  // Scenario inputs start from the container's session memory, never from storage.
  const initialScenario = scenario ?? null;

  const [includedAccounts, setIncludedAccounts] = useState<Record<string, boolean>>(() => {
    const stored = initialSettings?.includedAccounts;
    const initial: Record<string, boolean> = {};
    for (const a of savingsAccounts) {
      initial[a.id] = stored && stored[a.id] !== undefined ? !!stored[a.id] : true;
    }
    return initial;
  });

  const [keptIncome, setKeptIncome] = useState<Record<string, boolean>>(() => {
    const stored = initialScenario?.keptIncome;
    const initial: Record<string, boolean> = {};
    for (const e of nonPrimaryIncome) {
      initial[e.id] = stored && stored[e.id] !== undefined ? !!stored[e.id] : true;
    }
    return initial;
  });

  const [keptExpenses, setKeptExpenses] = useState<Record<string, boolean>>(() => {
    const stored = initialScenario?.keptExpenses;
    const initial: Record<string, boolean> = {};
    for (const e of expenseEntries) {
      initial[e.id] = stored && stored[e.id] !== undefined ? !!stored[e.id] : e.isEssential;
    }
    return initial;
  });

  const [severanceLump, setSeveranceLump] = useState<number>(
    () => initialScenario?.severanceLump ?? 0,
  );
  const [extraMonthlyCut, setExtraMonthlyCut] = useState<number>(
    () => initialScenario?.extraMonthlyCut ?? 0,
  );

  // Sync state if new accounts/entries are added
  useEffect(() => {
    setIncludedAccounts((prev) => {
      let changed = false;
      const next = { ...prev };
      savingsAccounts.forEach((a) => {
        if (next[a.id] === undefined) {
          next[a.id] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [savingsAccounts]);

  useEffect(() => {
    setKeptIncome((prev) => {
      let changed = false;
      const next = { ...prev };
      nonPrimaryIncome.forEach((e) => {
        if (next[e.id] === undefined) {
          next[e.id] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [nonPrimaryIncome]);

  useEffect(() => {
    setKeptExpenses((prev) => {
      let changed = false;
      const next = { ...prev };
      expenseEntries.forEach((e) => {
        if (next[e.id] === undefined) {
          next[e.id] = e.isEssential;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [expenseEntries]);

  // Only the account preference is saved. Scenario inputs go to session memory (the container).
  const persistSettings = (
    newAccounts: Record<string, boolean>,
    newIncome: Record<string, boolean>,
    newExpenses: Record<string, boolean>,
    newSeverance: number,
    newExtraCut: number,
  ) => {
    if (newAccounts !== includedAccounts) {
      const payload: RunwaySavedSettings = { includedAccounts: newAccounts };
      saveRunwaySettings(payload);
      onSaveSettings?.(payload);
    }
    onScenarioChange?.({
      keptIncome: newIncome,
      keptExpenses: newExpenses,
      severanceLump: newSeverance,
      extraMonthlyCut: newExtraCut,
    });
  };

  // Toggle & change handlers
  const toggleAccount = (accId: string) => {
    setIncludedAccounts((prev) => {
      const next = { ...prev, [accId]: !prev[accId] };
      persistSettings(next, keptIncome, keptExpenses, severanceLump, extraMonthlyCut);
      return next;
    });
  };

  const setAllAccounts = (included: boolean) => {
    const next = Object.fromEntries(savingsAccounts.map((a) => [a.id, included]));
    setIncludedAccounts(next);
    persistSettings(next, keptIncome, keptExpenses, severanceLump, extraMonthlyCut);
  };

  const toggleIncome = (incomeId: string) => {
    setKeptIncome((prev) => {
      const next = { ...prev, [incomeId]: !prev[incomeId] };
      persistSettings(includedAccounts, next, keptExpenses, severanceLump, extraMonthlyCut);
      return next;
    });
  };

  const setAllIncome = (kept: boolean) => {
    const next = Object.fromEntries(nonPrimaryIncome.map((e) => [e.id, kept]));
    setKeptIncome(next);
    persistSettings(includedAccounts, next, keptExpenses, severanceLump, extraMonthlyCut);
  };

  const toggleExpense = (expenseId: string) => {
    setKeptExpenses((prev) => {
      const next = { ...prev, [expenseId]: !prev[expenseId] };
      persistSettings(includedAccounts, keptIncome, next, severanceLump, extraMonthlyCut);
      return next;
    });
  };

  const setCategoryExpenses = (catEntries: BudgetEntry[], kept: boolean) => {
    setKeptExpenses((prev) => {
      const next = {
        ...prev,
        ...Object.fromEntries(catEntries.map((e) => [e.id, kept])),
      };
      persistSettings(includedAccounts, keptIncome, next, severanceLump, extraMonthlyCut);
      return next;
    });
  };

  const handleSeveranceChange = (val: number) => {
    const clamped = Math.max(0, Math.min(100000, val));
    setSeveranceLump(clamped);
    persistSettings(includedAccounts, keptIncome, keptExpenses, clamped, extraMonthlyCut);
  };

  const handleExtraCutChange = (val: number) => {
    const clamped = Math.max(0, val);
    setExtraMonthlyCut(clamped);
    persistSettings(includedAccounts, keptIncome, keptExpenses, severanceLump, clamped);
  };

  const defaultIncome = useMemo(
    () => Object.fromEntries(nonPrimaryIncome.map((e) => [e.id, true])),
    [nonPrimaryIncome],
  );
  const defaultExpenses = useMemo(
    () => Object.fromEntries(expenseEntries.map((e) => [e.id, e.isEssential])),
    [expenseEntries],
  );
  const sameFlags = (current: Record<string, boolean>, defaults: Record<string, boolean>) =>
    Object.keys(defaults).every((id) => (current[id] ?? defaults[id]) === defaults[id]);
  const isScenarioModified =
    severanceLump !== 0 ||
    extraMonthlyCut !== 0 ||
    !sameFlags(keptIncome, defaultIncome) ||
    !sameFlags(keptExpenses, defaultExpenses);

  // Resets the illustration only. The saved account preference is left as it is.
  const handleResetScenario = () => {
    setKeptIncome(defaultIncome);
    setKeptExpenses(defaultExpenses);
    setSeveranceLump(0);
    setExtraMonthlyCut(0);
    persistSettings(includedAccounts, defaultIncome, defaultExpenses, 0, 0);
  };

  const totalSavings = useMemo(
    () =>
      savingsAccounts
        .filter((a) => includedAccounts[a.id])
        .reduce((s, a) => s + getLatestBalance(a.id, a.balance), 0),
    [savingsAccounts, includedAccounts, accountDetails],
  );

  const totalKeptIncome = useMemo(
    () => nonPrimaryIncome.filter((e) => keptIncome[e.id]).reduce((s, e) => s + toMonthly(e), 0),
    [nonPrimaryIncome, keptIncome],
  );

  const totalSelectedExpenses = useMemo(
    () => expenseEntries.filter((e) => keptExpenses[e.id]).reduce((s, e) => s + toMonthly(e), 0),
    [expenseEntries, keptExpenses],
  );

  // ── Calculation ──────────────────────────────────────────────────────────
  const pool = totalSavings + severanceLump;
  const monthlyBurn = Math.max(0, totalSelectedExpenses - totalKeptIncome - extraMonthlyCut);
  const runwayMonths = monthlyBurn > 0 ? pool / monthlyBurn : Number.POSITIVE_INFINITY;

  const years = Math.floor(runwayMonths / 12);
  const months = Math.floor(runwayMonths % 12);
  const runwayLabel =
    monthlyBurn === 0
      ? "Indefinitely (no expenses)"
      : runwayMonths > 120
        ? `${Math.floor(runwayMonths / 12)}+ years`
        : years > 0
          ? `${years} yr${years !== 1 ? "s" : ""} ${months} mo${months !== 1 ? "s" : ""}`
          : `${Math.floor(runwayMonths)} months`;

  const status = monthlyBurn === 0 ? "healthy" : getRunwayStatus(runwayMonths);

  // Timeline bar — cap at 24 months for display purposes
  const displayMax = 24;
  const barPct = Math.min((runwayMonths / displayMax) * 100, 100);

  const groupedExpenses = useMemo(() => {
    return EXPENSE_CATEGORIES.map((cat) => ({
      cat,
      entries: expenseEntries.filter((e) => e.category === cat),
    })).filter((g) => g.entries.length > 0);
  }, [expenseEntries]);

  const statusBadge = STATUS_BADGE[status];
  // Headline baseline: saved account preference and the default budget lines only. It never reads
  // the scenario inputs above.
  const baseline = useMemo(() => {
    const expenses = expenseEntries
      .filter((e) => e.isEssential)
      .reduce((sum, e) => sum + toMonthly(e), 0);
    const income = nonPrimaryIncome.reduce((sum, e) => sum + toMonthly(e), 0);
    const burn = Math.max(0, expenses - income);
    return { pool: totalSavings, monthlyBurn: burn, ...describeRunway(totalSavings, burn) };
  }, [expenseEntries, nonPrimaryIncome, totalSavings]);
  const resultsCopy =
    monthlyBurn > 0 ? (
      <span className={heroSubtext()}>
        <span>At a monthly burn of</span>
        <Money size="sm" value={monthlyBurn} />
      </span>
    ) : (
      "No monthly spending, so the runway has no end"
    );

  const savedPool = (
    <Card padding="lg">
      <div className={cardHeader()}>
        <div className={cardTitleRow()}>
          <h2 className={cardTitle()}>Savings pool</h2>
          <StatusBadge variant="brand">
            <Money size="sm" value={totalSavings} />
          </StatusBadge>
          <StatusBadge icon={<Icon icon={CheckCircle2} size="sm" />} variant="neutral">
            Saved preference
          </StatusBadge>
        </div>
        {savingsAccounts.length > 0 && (
          <BulkButtons
            label="accounts"
            onAll={() => setAllAccounts(true)}
            onNone={() => setAllAccounts(false)}
          />
        )}
      </div>
      <p className={mutedNote()}>Which accounts count towards your runway. Saved automatically.</p>
      {savingsAccounts.length === 0 ? (
        <p className={mutedNote()}>
          No saving, current or investment accounts found. Connect or add accounts first.
        </p>
      ) : (
        <div className={rowList()}>
          {savingsAccounts.map((acc) => {
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
                switchLabel={`Include ${acc.name} in savings pool`}
                onToggle={() => toggleAccount(acc.id)}
              />
            );
          })}
          <div className={totalRow()}>
            <span>Total pool</span>
            <Money size="md" value={totalSavings} />
          </div>
        </div>
      )}
    </Card>
  );

  const controls = (
    <>
      <Card padding="lg">
        <div className={cardHeader()}>
          <div className={cardTitleRow()}>
            <h2 className={cardTitle()}>What if</h2>
          </div>
        </div>
        <div className={whatIfGrid()}>
          <FormField hint="A one-off payment added to your pool" label="Severance or lump sum">
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
        <h2 className={cardTitle()}>Runway in this illustration</h2>
        <p className={scenarioValue()}>{runwayLabel}</p>
        <p className={statusCopy()}>{resultsCopy}</p>
        <div className={statusRow()}>
          <StatusBadge variant={statusBadge.variant}>{statusBadge.label}</StatusBadge>
          <p className={statusCopy()}>Based on the accounts and spending you have switched on.</p>
        </div>
        <div className={breakdownList()}>
          <ProgressBar
            label="Runway, up to 24 months"
            max={displayMax}
            value={Math.min(runwayMonths, displayMax)}
            valueDisplay={
              barPct >= 100 ? "24+ months" : `${Math.floor(runwayMonths)} of ${displayMax} months`
            }
            variant={BAR_VARIANT[status]}
          />
          <div className={thresholds()}>
            <span>0 mo</span>
            {THRESHOLDS.map((t) => (
              <span key={t}>{t}</span>
            ))}
            <span>{displayMax}+ mo</span>
          </div>
          <div className={breakdownRow()}>
            <span>Savings pool</span>
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
          <div className={breakdownRow()}>
            <strong>Monthly burn rate</strong>
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
              <StatusBadge variant="positive">
                <Money size="sm" value={totalKeptIncome} /> a month
              </StatusBadge>
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

  return (
    <div className={runwayRoot()}>
      <Card padding="md">
        <div className={introCard()}>
          <p className={introText()}>
            Your runway counts the accounts you switch on below, and that choice is saved. Anything
            you change under the illustration stays on this page for this visit and is not saved.
            Your main salary is left out.
          </p>
        </div>
      </Card>

      <KpiCard
        label="Your runway"
        subtext={
          baseline.monthlyBurn === 0 ? (
            "No monthly spending, so the runway has no end"
          ) : (
            <span className={heroSubtext()}>
              <span>At a monthly burn of</span>
              <Money size="sm" tone="onContrast" value={baseline.monthlyBurn} />
              <span>from a pool of</span>
              <Money size="sm" tone="onContrast" value={baseline.pool} />
            </span>
          )
        }
        tone="hero"
        value={<span className={heroValue()}>{baseline.label}</span>}
      />

      {savedPool}

      <ScenarioZone
        basis={
          <>
            {baseline.label} of runway, from a pool of <Money size="sm" value={baseline.pool} /> and
            a monthly burn of <Money size="sm" value={baseline.monthlyBurn} />
          </>
        }
        isModified={isScenarioModified}
        title="Model a change to your budget"
        onReset={handleResetScenario}
      >
        <SimulatorSplitLayout
          content={content}
          contentLabel="Illustration results"
          controls={controls}
          controlsLabel="Runway illustration"
        />
      </ScenarioZone>
    </div>
  );
};
