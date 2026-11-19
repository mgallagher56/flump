import {
  DEBT_CATEGORY,
  type Figure,
  isFigureKnown,
  type MonthsOfCover,
  monthsOfCoverFor,
  PortfolioSnapshot,
} from "@flump/finance-engine";
import {
  CollapsibleDrawer,
  CurrencyInput,
  FormField,
  InfoTip,
  Money,
  ProjectionNotice,
  ResultBlock,
  ScenarioZone,
  Switch,
} from "@repo/ui";
import { type FC, useEffect, useMemo, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { BudgetEntry } from "~/types/budget";
import { toMonthly } from "~/types/budget";
import {
  breathingRoomPhrase,
  describeBreathingRoom,
  MONEY_TO_DRAW_ON_LABEL,
} from "~/utils/breathingRoom";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import type { RunwayScenario } from "~/utils/runwayStorage";
import {
  controlsStack,
  optionGroup,
  optionHint,
  optionItems,
  optionLegend,
  optionsStack,
  resultFigure,
  zoneSummary,
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
   * Breathing room from saved data (`monthsOfCover`), from the engine's financial picture (E23). The illustration
   * starts from it. The saved figure itself is shown by `BreathingRoom`, in its own section: this
   * zone never shows a saved figure (STYLE-GUIDE 12.5). Built from the props when not given.
   */
  baseline?: Figure<MonthsOfCover>;
  /**
   * Session-only scenario inputs (accounts counted, severance, cuts, dropped lines). Held by the
   * container so they survive tab switches and clear on reload. Never saved, never read by a
   * headline.
   */
  scenario?: RunwayScenario | null;
  onScenarioChange?: (scenario: RunwayScenario) => void;
  /**
   * Puts the zone inside a drawer that starts closed. Only for a page that shows the saved
   * Breathing room figure above it, so the page's figure stays in view while the zone is shut.
   */
  collapsible?: boolean;
}

interface OptionItem {
  id: string;
  name: string;
  amount: number;
  /** Shown after the amount: "a month" for budget lines, nothing for balances. */
  perMonth: boolean;
  checked: boolean;
  onToggle: () => void;
}

/** One group of switches inside "Accounts and spending to include": a plain label, no heading, no nested card. */
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

export const RunwayCalculator: FC<RunwayCalculatorProps> = ({
  entries,
  accounts,
  accountDetails,
  baseline: baselineProp,
  scenario,
  onScenarioChange,
  collapsible = false,
}) => {
  const { formatCurrency: formatGbp } = useFormatCurrency();
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

  // Take-home from the profile is the income that stops in this question, so it is never "kept".
  const nonPrimaryIncome = useMemo(
    () => entries.filter((e) => e.isIncome && !e.isPrimaryIncome && !e.linked),
    [entries],
  );

  // Spending and savings rows: an essential savings row counts in the saved figure (item 28).
  const expenseEntries = useMemo(() => entries.filter((e) => !e.isIncome), [entries]);

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
  // Which spending counts is each entry's saved Essential flag, switched in "What Breathing room
  // counts" beside the saved figure (owner item 32b), so this illustration follows it.
  const keptExpenses = defaultExpenses;
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
    !sameFlags(keptIncome, defaultIncome);

  const handleResetScenario = () => {
    setIncludedAccounts(defaultAccounts);
    setKeptIncome(defaultIncome);
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
  // The illustration starts from the saved figure's own two numbers and applies only what the
  // person changed, so an untouched zone shows exactly the saved figure and no second sum of the
  // rows exists in web to drift from it.
  const defaultPool = useMemo(
    () =>
      poolAccounts
        .filter((a) => defaultAccounts[a.id])
        .reduce((s, a) => s + Math.max(0, getLatestBalance(a.id)), 0),
    [poolAccounts, defaultAccounts, snapshot],
  );
  const defaultSelectedExpenses = useMemo(
    () => expenseEntries.filter((e) => defaultExpenses[e.id]).reduce((s, e) => s + toMonthly(e), 0),
    [expenseEntries, defaultExpenses],
  );
  const pool = saved
    ? Math.max(0, saved.liquidCash + (totalPool - defaultPool) + severanceLump)
    : totalPool + severanceLump;
  const monthlyBurn = Math.max(
    0,
    saved
      ? saved.monthlyEssentials +
          (totalSelectedExpenses - defaultSelectedExpenses) -
          totalKeptIncome -
          extraMonthlyCut
      : totalSelectedExpenses + debtNotInBudget - totalKeptIncome - extraMonthlyCut,
  );
  // The ratio and its rounding are the engine's, the same call the saved figure makes.
  const months = monthsOfCoverFor(pool, monthlyBurn);
  // Nothing to pay each month: with a saved figure the money has no end date in this illustration;
  // with none there is nothing to show yet. Never infinity.
  const wording = months === null ? null : describeBreathingRoom(months);
  const emptyLabel = saved ? "No end date" : "Not set";
  const coverLabel = months === null ? emptyLabel : breathingRoomPhrase(months);

  const controls = (
    <div className={controlsStack()}>
      {/* The note sits behind the tip and stays in the field's description (owner item 23). */}
      <FormField
        label="Redundancy pay or lump sum"
        labelAddon={
          <InfoTip descriptionId="runway-severance-detail" term="Redundancy pay or lump sum">
            Added to what you can draw on.
          </InfoTip>
        }
      >
        {(field) => (
          <CurrencyInput
            id={field.id}
            aria-describedby={[field.describedBy, "runway-severance-detail"]
              .filter(Boolean)
              .join(" ")}
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
  // below the outcome, so opening them never pushes it out of view on a phone. Which spending
  // counts is set beside the saved figure, on each entry's Essential flag (owner item 32b).
  const moreOptions = (
    <CollapsibleDrawer title="Accounts and income in this illustration" variant="quiet">
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
      </div>
    </CollapsibleDrawer>
  );

  // The zone's one result card (E17 5A): the illustrated figure and one supporting row.
  const result = (
    <ResultBlock
      emptyPrompt={emptyLabel}
      figure={
        wording ? (
          <span className={resultFigure()} data-testid="runway-outcome" id="runway-outcome">
            {wording.figure}
          </span>
        ) : null
      }
      id="runway-result"
      label="Breathing room in this illustration"
      leadIn={wording?.leadIn}
      row={{ label: MONEY_TO_DRAW_ON_LABEL, value: <Money size="sm" value={pool} /> }}
    />
  );

  const zone = (
    <ScenarioZone
      announcement={isScenarioModified ? `Breathing room, ${coverLabel}` : ""}
      // UX-GUIDELINES S5: every zone states the saved figures it starts from.
      basis={
        <span data-testid="runway-basis" id="runway-basis">
          {saved
            ? "Starting from your saved budget and accounts."
            : "Starting from your budget. Breathing room shows once it has essential spending."}
        </span>
      }
      extra={moreOptions}
      collapsible={collapsible}
      isModified={isScenarioModified}
      notice={<ProjectionNotice />}
      result={result}
      showLabel="Show what-if: redundancy pay, a spending cut"
      summary={
        <span className={zoneSummary()}>
          {isScenarioModified
            ? `Your illustration: Breathing room, ${coverLabel}.`
            : saved
              ? `Starts from your savings of ${formatGbp(saved.liquidCash)} and essentials of ${formatGbp(saved.monthlyEssentials)} a month.`
              : "Starts from your budget. Breathing room shows once it has essential spending."}
        </span>
      }
      title="Model a change to your budget"
      onReset={handleResetScenario}
    >
      {controls}
    </ScenarioZone>
  );

  // Collapsible below the saved figure (UX S11): closed, it keeps a one-line summary.
  return zone;
};
