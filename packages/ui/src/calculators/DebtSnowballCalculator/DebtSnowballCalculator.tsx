import {
  compareAvalancheAndSnowball,
  type DebtItem,
  type OnboardingSeedPayload,
  type PayoffResult,
  persistOnboardingSeed,
} from "@flump/finance-engine";
import { ArrowRight, Plus } from "lucide-react";
import type { FC } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProjectionNotice } from "../../patterns/ProjectionNotice/ProjectionNotice";
import { SimulatorSplitLayout } from "../../patterns/SimulatorSplitLayout/SimulatorSplitLayout";
import { Button } from "../../primitives/Button/Button";
import { CurrencyInput } from "../../primitives/CurrencyInput/CurrencyInput";
import { controlProps, FormField } from "../../primitives/FormField/FormField";
import { Icon } from "../../primitives/Icon";
import { KpiCard } from "../../primitives/KpiCard/KpiCard";
import { LiveRegion } from "../../primitives/LiveRegion/LiveRegion";
import { formatMoney, Money } from "../../primitives/Money/Money";
import { PercentInput } from "../../primitives/PercentInput/PercentInput";
import { SliderField } from "../../primitives/SliderField/SliderField";
import { ctaLabel } from "../ctaLabel";
import {
  debtAddButton,
  debtContent,
  debtControls,
  debtCta,
  debtExplainer,
  debtExplainerTitle,
  debtHeader,
  debtIntro,
  debtList,
  debtOutcomes,
  debtOutcomeText,
  debtRoot,
  debtRow,
  debtRowFields,
  debtRowLegend,
  debtRowRemove,
  debtTitle,
} from "./DebtSnowballCalculator.styles";

/** Every user-facing string, in one place (COPY-AUDIT, PR 10, debt snowball rows). */
export const DEBT_SNOWBALL_COPY = {
  title: "Debt payoff methods compared",
  intro:
    "Compare the estimated debt-free date and total interest when the extra payment goes to the highest rate first (avalanche) or the smallest balance first (snowball).",
  debtLegend: (n: number, kind?: string) => (kind ? `Debt ${n}: ${kind}` : `Debt ${n}`),
  balance: "Balance",
  rate: "Interest rate (APR)",
  minimum: "Minimum payment a month",
  remove: "Remove",
  removeLabel: (n: number) => `Remove debt ${n}`,
  add: "Add a debt",
  extra: "Extra payment a month",
  extraHelp: "Paid on top of every minimum payment.",
  kpiDate: "Estimated debt-free date",
  dateSame: "The same with either method.",
  dateBoth: (avalanche: string, snowball: string) =>
    `Highest rate first: ${avalanche}. Smallest balance first: ${snowball}.`,
  notPaidOff: "Not paid off at these payments",
  notPaidOffDetail: "The debts are not paid off at these payments.",
  kpiAvalanche: "Total interest, highest rate first (avalanche)",
  kpiSnowball: "Total interest, smallest balance first (snowball)",
  paidOffIn: (duration: string) => `Paid off in ${duration}.`,
  nothingOwed: "No balance to repay",
  nothingOwedDetail: "There is no debt balance to pay off.",
  nothingOwedInterest: "No interest, as there is no balance.",
  explainerTitle: "How the two methods differ",
  explainer:
    "Both methods pay every minimum and put the extra payment on one debt at a time. Highest rate first puts it on the debt with the highest interest rate; smallest balance first puts it on the smallest balance. When a debt is paid off, its payment moves to the next one.",
  controlsLabel: "Your debts",
  contentLabel: "Estimated payoff",
} as const;

export const DEBT_SNOWBALL_DEFAULT_CTA = "Continue to sign up";

/** Spoken after inputs settle (COPY-AUDIT rows for the live region): both methods, same fields. */
export const debtSnowballAnnouncement = (
  comparison: {
    avalanche: PayoffResult;
    snowball: PayoffResult;
  },
  nothingOwed = false,
): string => {
  const { avalanche, snowball } = comparison;
  if (nothingOwed) return "Illustration: there is no debt balance to pay off";
  if (!avalanche.payoffAchievable || !snowball.payoffAchievable) {
    return "Illustration: the debts are not paid off at these payments";
  }
  return `Illustration: highest rate first, estimated debt-free date ${avalanche.debtFreeDate}, total interest ${money(
    avalanche.totalInterest,
  )}. Smallest balance first, estimated debt-free date ${snowball.debtFreeDate}, total interest ${money(
    snowball.totalInterest,
  )}`;
};

const money = (n: number) => formatMoney(n).text;

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** Copy guide 4.3: durations over 24 months read as years and months. */
export const formatPayoffDuration = (months: number): string => {
  if (months <= 24) return plural(months, "month");
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? plural(years, "year") : `${plural(years, "year")} ${plural(rest, "month")}`;
};

const EXTRA_MAX = 1_000;
const RATE_MAX = 100;
const MAX_DEBTS = 6;

interface DebtRowState {
  id: string;
  /** Shown after "Debt n:" in the legend for the starting examples; a debt the visitor adds has none. */
  kind?: string;
  type: DebtItem["type"];
  balance: number | null;
  apr: number | null;
  minimum: number | null;
}

const STARTING_DEBTS: DebtRowState[] = [
  { id: "d1", kind: "credit card", type: "credit_card", balance: 3500, apr: 24.9, minimum: 90 },
  { id: "d2", kind: "personal loan", type: "loan", balance: 5000, apr: 8.5, minimum: 140 },
];

/** An empty field is "not set" in the UI and counts as nothing in the sums; negatives never pass. */
const amount = (n: number | null) => Math.max(0, n ?? 0);

/** What the button pre-fills for sign-up: only the total the visitor entered. */
export type DebtSnowballSeedPayload = OnboardingSeedPayload & {
  mode: "DEBT";
  totalUnsecuredDebt: number;
};

export interface DebtSnowballCalculatorProps {
  onSaveAndContinue?: (payload: DebtSnowballSeedPayload) => void;
  ctaText?: string;
  /** When false, entered figures are not written to the onboarding seed in local storage. Default true. */
  persistSeed?: boolean;
  /** Starting extra payment a month (an example, not anyone's saved figure). */
  initialExtraPayment?: number;
}

/**
 * Signed-out tool: highest rate first (avalanche) and smallest balance first (snowball) side by
 * side, with the same fields for each. Every figure comes from the engine's
 * `compareAvalancheAndSnowball`; this component only clamps inputs and formats results.
 */
export const DebtSnowballCalculator: FC<DebtSnowballCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = DEBT_SNOWBALL_DEFAULT_CTA,
  persistSeed = true,
  initialExtraPayment = 75,
}) => {
  const [debts, setDebts] = useState<DebtRowState[]>(STARTING_DEBTS);
  const [extraPayment, setExtraPayment] = useState(Math.max(0, initialExtraPayment));
  const nextId = useRef(STARTING_DEBTS.length + 1);
  // Keyboard focus follows the row that was added, or the row before one that was removed, so it
  // is never lost when a button unmounts.
  const rowRefs = useRef(new Map<string, HTMLFieldSetElement>());
  const focusRowId = useRef<string | null>(null);

  useEffect(() => {
    const id = focusRowId.current;
    if (!id) return;
    focusRowId.current = null;
    rowRefs.current.get(id)?.querySelector<HTMLInputElement>("input")?.focus();
  }, [debts]);

  const updateDebt = (id: string, patch: Partial<DebtRowState>) =>
    setDebts((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const addDebt = () => {
    if (debts.length >= MAX_DEBTS) return;
    const id = `d${nextId.current++}`;
    focusRowId.current = id;
    setDebts((rows) =>
      rows.length >= MAX_DEBTS
        ? rows
        : [...rows, { id, type: "other", balance: null, apr: null, minimum: null }],
    );
  };

  const removeDebt = (id: string) => {
    if (debts.length <= 1) return;
    const index = debts.findIndex((row) => row.id === id);
    const remaining = debts.filter((row) => row.id !== id);
    focusRowId.current = remaining[Math.max(0, index - 1)]?.id ?? null;
    setDebts((rows) => (rows.length > 1 ? rows.filter((row) => row.id !== id) : rows));
  };

  const engineDebts = useMemo<DebtItem[]>(
    () =>
      debts.map((row, index) => ({
        id: row.id,
        name: row.kind ?? `debt ${index + 1}`,
        balance: amount(row.balance),
        apr: Math.min(RATE_MAX, amount(row.apr)),
        minimumPayment: amount(row.minimum),
        type: row.type,
      })),
    [debts],
  );

  const comparison = useMemo(
    () => compareAvalancheAndSnowball(engineDebts, extraPayment),
    [engineDebts, extraPayment],
  );
  const { avalanche, snowball } = comparison;
  const bothPaidOff = avalanche.payoffAchievable && snowball.payoffAchievable;

  const totalDebt = engineDebts.reduce((sum, d) => sum + (d.balance ?? 0), 0);
  const nothingOwed = totalDebt <= 0;

  const handleSave = () => {
    const payload: DebtSnowballSeedPayload = {
      mode: "DEBT",
      totalUnsecuredDebt: totalDebt,
      inferredModules: ["accounts", "debt", "budget"],
      timestamp: Date.now(),
    };
    if (persistSeed) persistOnboardingSeed(payload);
    if (onSaveAndContinue) {
      onSaveAndContinue(payload);
    } else if (typeof window !== "undefined") {
      window.location.href = "/signup";
    }
  };

  // The earlier of the two dates (with the same total paid each month they are usually the same).
  const earliest = avalanche.months <= snowball.months ? avalanche : snowball;
  const dateValue = nothingOwed ? (
    <span className={debtOutcomeText()}>{DEBT_SNOWBALL_COPY.nothingOwed}</span>
  ) : bothPaidOff ? (
    earliest.debtFreeDate
  ) : (
    DEBT_SNOWBALL_COPY.notPaidOff
  );
  const dateSubtext = nothingOwed
    ? DEBT_SNOWBALL_COPY.nothingOwedDetail
    : !bothPaidOff
      ? DEBT_SNOWBALL_COPY.notPaidOffDetail
      : avalanche.debtFreeDate === snowball.debtFreeDate
        ? DEBT_SNOWBALL_COPY.dateSame
        : DEBT_SNOWBALL_COPY.dateBoth(avalanche.debtFreeDate, snowball.debtFreeDate);

  const methodCard = (label: string, result: PayoffResult) => (
    <KpiCard
      label={label}
      subtext={
        nothingOwed
          ? DEBT_SNOWBALL_COPY.nothingOwedInterest
          : result.payoffAchievable
            ? DEBT_SNOWBALL_COPY.paidOffIn(formatPayoffDuration(result.months))
            : DEBT_SNOWBALL_COPY.notPaidOffDetail
      }
      value={
        nothingOwed || result.payoffAchievable ? (
          <Money size="lg" value={result.totalInterest} />
        ) : (
          DEBT_SNOWBALL_COPY.notPaidOff
        )
      }
    />
  );

  const controls = (
    <div className={debtControls()}>
      <div className={debtList()}>
        {debts.map((row, index) => {
          const n = index + 1;
          return (
            <fieldset
              className={debtRow()}
              key={row.id}
              ref={(el) => {
                if (el) rowRefs.current.set(row.id, el);
                else rowRefs.current.delete(row.id);
              }}
            >
              {/* The legend stays the fieldset's first child so it names the group. */}
              <legend className={debtRowLegend()}>
                {DEBT_SNOWBALL_COPY.debtLegend(n, row.kind)}
              </legend>
              {debts.length > 1 ? (
                <Button
                  aria-label={DEBT_SNOWBALL_COPY.removeLabel(n)}
                  className={debtRowRemove()}
                  size="sm"
                  variant="ghost"
                  onClick={() => removeDebt(row.id)}
                >
                  {DEBT_SNOWBALL_COPY.remove}
                </Button>
              ) : null}
              <div className={debtRowFields()}>
                <FormField label={DEBT_SNOWBALL_COPY.balance}>
                  {(field) => (
                    <CurrencyInput
                      {...controlProps(field)}
                      min={0}
                      size="sm"
                      value={row.balance}
                      onValueChange={(v) =>
                        updateDebt(row.id, { balance: v === null ? null : Math.max(0, v) })
                      }
                    />
                  )}
                </FormField>
                <FormField label={DEBT_SNOWBALL_COPY.rate}>
                  {(field) => (
                    <PercentInput
                      {...controlProps(field)}
                      decimals={1}
                      max={RATE_MAX}
                      min={0}
                      size="sm"
                      value={row.apr}
                      onValueChange={(v) =>
                        updateDebt(row.id, {
                          apr: v === null ? null : Math.min(RATE_MAX, Math.max(0, v)),
                        })
                      }
                    />
                  )}
                </FormField>
                <FormField label={DEBT_SNOWBALL_COPY.minimum}>
                  {(field) => (
                    <CurrencyInput
                      {...controlProps(field)}
                      min={0}
                      size="sm"
                      value={row.minimum}
                      onValueChange={(v) =>
                        updateDebt(row.id, { minimum: v === null ? null : Math.max(0, v) })
                      }
                    />
                  )}
                </FormField>
              </div>
            </fieldset>
          );
        })}
      </div>

      {debts.length < MAX_DEBTS ? (
        <Button className={debtAddButton()} size="sm" variant="outline" onClick={addDebt}>
          <Icon icon={Plus} size="sm" /> {DEBT_SNOWBALL_COPY.add}
        </Button>
      ) : null}

      <SliderField
        format="currency"
        helperText={DEBT_SNOWBALL_COPY.extraHelp}
        label={DEBT_SNOWBALL_COPY.extra}
        max={EXTRA_MAX}
        min={0}
        step={10}
        value={extraPayment}
        onChange={(v) => setExtraPayment(Math.max(0, v))}
      />
    </div>
  );

  const content = (
    <div className={debtContent()}>
      {/* Illustration outcomes, not saved figures. One outcome, then the two methods with the
          same fields (COPY-AUDIT R1). */}
      <div className={debtOutcomes()} data-density="compact" data-testid="debt-snowball-outcomes">
        <KpiCard label={DEBT_SNOWBALL_COPY.kpiDate} subtext={dateSubtext} value={dateValue} />
        {methodCard(DEBT_SNOWBALL_COPY.kpiAvalanche, avalanche)}
        {methodCard(DEBT_SNOWBALL_COPY.kpiSnowball, snowball)}
      </div>

      <div className={debtExplainer()}>
        <h3 className={debtExplainerTitle()}>{DEBT_SNOWBALL_COPY.explainerTitle}</h3>
        <p>{DEBT_SNOWBALL_COPY.explainer}</p>
      </div>

      <ProjectionNotice />
      <LiveRegion
        debounceMs={1000}
        message={debtSnowballAnnouncement(comparison, nothingOwed)}
        visuallyHidden
      />
    </div>
  );

  return (
    <div className={debtRoot()} data-testid="debt-snowball-tool">
      <div className={debtHeader()}>
        <h2 className={debtTitle()}>{DEBT_SNOWBALL_COPY.title}</h2>
        <p className={debtIntro()}>{DEBT_SNOWBALL_COPY.intro}</p>
      </div>

      <SimulatorSplitLayout
        content={content}
        contentLabel={DEBT_SNOWBALL_COPY.contentLabel}
        controls={controls}
        controlsLabel={DEBT_SNOWBALL_COPY.controlsLabel}
      />

      <Button className={debtCta()} size="md" variant="primary" onClick={handleSave}>
        {ctaLabel(ctaText)} <Icon icon={ArrowRight} size="sm" />
      </Button>
    </div>
  );
};

export default DebtSnowballCalculator;
