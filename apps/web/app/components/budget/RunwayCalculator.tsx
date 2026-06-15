import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import {
  FaArrowRight,
  FaCheckCircle,
  FaInfoCircle,
  FaMinus,
  FaPlus,
  FaTimesCircle,
} from "react-icons/fa";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import type { BudgetEntry } from "~/types/budget";
import { CATEGORY_ICONS, CATEGORY_LABELS, toMonthly } from "~/types/budget";

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

interface RunwayCalculatorProps {
  entries: BudgetEntry[];
  accounts: Account[];
  accountDetails: AccountDetail[];
  onNavigateToForecast: () => void;
}

const EXPENSE_CATEGORIES: BudgetEntry["category"][] = ["housing", "bills", "expenses", "savings"];

type RunwayStatus = "critical" | "caution" | "moderate" | "healthy";

function getRunwayStatus(months: number): RunwayStatus {
  if (months < 3) return "critical";
  if (months < 6) return "caution";
  if (months < 12) return "moderate";
  return "healthy";
}

const STATUS_CONFIG: Record<
  RunwayStatus,
  { colour: string; bg: string; label: string; emoji: string }
> = {
  critical: { colour: "#ef4444", bg: "rgba(239,68,68,0.08)", label: "Critical", emoji: "🔴" },
  caution: { colour: "#f59e0b", bg: "rgba(245,158,11,0.08)", label: "Caution", emoji: "🟡" },
  moderate: { colour: "#f97316", bg: "rgba(249,115,22,0.08)", label: "Moderate", emoji: "🟠" },
  healthy: { colour: "#10b981", bg: "rgba(16,185,129,0.08)", label: "Healthy", emoji: "🟢" },
};

const THRESHOLDS = [
  { months: 3, label: "3 mo", colour: "#ef4444" },
  { months: 6, label: "6 mo", colour: "#f59e0b" },
  { months: 12, label: "12 mo", colour: "#10b981" },
];

const toggleBtnStyle = (active: boolean, colour?: string) =>
  css({
    width: "40px",
    height: "22px",
    borderRadius: "full",
    backgroundColor: active ? (colour ?? "primary") : "border",
    border: "none",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.2s ease",
    flexShrink: 0,
  });

const knobStyle = (active: boolean) => ({
  position: "absolute" as const,
  top: "2px",
  left: active ? "20px" : "2px",
  width: "18px",
  height: "18px",
  borderRadius: "50%",
  backgroundColor: "white",
  transition: "left 0.2s ease",
  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
});

const fmt = (n: number) =>
  `£${Math.abs(n).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const RunwayCalculator: FC<RunwayCalculatorProps> = ({
  entries,
  accounts,
  accountDetails,
  onNavigateToForecast,
}) => {
  // ── Savings pool ────────────────────────────────────────────────────────
  const savingsAccounts = useMemo(
    () => accounts.filter((a) => ["Current", "Saving"].includes(a.type) && a.balance > 0),
    [accounts],
  );

  const [includedAccounts, setIncludedAccounts] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(savingsAccounts.map((a) => [a.id, true])),
  );

  const getLatestBalance = (accountId: string, fallback: number): number => {
    const details = accountDetails
      .filter((d) => d.account_id === accountId)
      .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month));
    return details.length > 0 ? details[0].value : fallback;
  };

  const totalSavings = useMemo(
    () =>
      savingsAccounts
        .filter((a) => includedAccounts[a.id])
        .reduce((s, a) => s + getLatestBalance(a.id, a.balance), 0),
    [savingsAccounts, includedAccounts, accountDetails],
  );

  // ── Income toggles (non-primary) ────────────────────────────────────────
  const nonPrimaryIncome = entries.filter((e) => e.isIncome && !e.isPrimaryIncome);
  const [keptIncome, setKeptIncome] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(nonPrimaryIncome.map((e) => [e.id, true])),
  );

  const totalKeptIncome = useMemo(
    () => nonPrimaryIncome.filter((e) => keptIncome[e.id]).reduce((s, e) => s + toMonthly(e), 0),
    [nonPrimaryIncome, keptIncome],
  );

  // ── Expense toggles ──────────────────────────────────────────────────────
  const expenseEntries = entries.filter((e) => !e.isIncome);
  const [keptExpenses, setKeptExpenses] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(expenseEntries.map((e) => [e.id, e.isEssential])),
  );

  const totalSelectedExpenses = useMemo(
    () => expenseEntries.filter((e) => keptExpenses[e.id]).reduce((s, e) => s + toMonthly(e), 0),
    [expenseEntries, keptExpenses],
  );

  // ── What-if sliders ──────────────────────────────────────────────────────
  const [severanceLump, setSeveranceLump] = useState(0);
  const [extraMonthlyCut, setExtraMonthlyCut] = useState(0);

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
  const statusCfg = STATUS_CONFIG[status];

  // Timeline bar — cap at 24 months for display purposes
  const displayMax = 24;
  const barPct = Math.min((runwayMonths / displayMax) * 100, 100);

  const groupedExpenses = useMemo(() => {
    return EXPENSE_CATEGORIES.map((cat) => ({
      cat,
      entries: expenseEntries.filter((e) => e.category === cat),
    })).filter((g) => g.entries.length > 0);
  }, [expenseEntries]);

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "24px" })}>
      {/* Header info */}
      <div
        className={css({
          padding: "16px",
          borderRadius: "lg",
          backgroundColor: "rgba(99,99,241,0.06)",
          border: "1px solid rgba(99,99,241,0.2)",
          display: "flex",
          gap: "12px",
          alignItems: "flex-start",
        })}
      >
        <FaInfoCircle style={{ color: "#6363f1", marginTop: "2px", flexShrink: 0 }} />
        <FLPText fontSize="sm" color="text.muted" style={{ lineHeight: "1.6" }}>
          Toggle the accounts you'd use, income you'd keep, and expenses you'd cut. The runway
          updates instantly. Your primary salary is excluded — that's the whole point.
        </FLPText>
      </div>

      {/* Main 2-col layout */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          alignItems: "start",
        })}
      >
        {/* Left col — controls */}
        <div className={css({ display: "flex", flexDirection: "column", gap: "16px" })}>
          {/* Savings pool */}
          <FLPCard>
            <FLPHeading as="h3" size="sm" style={{ marginBottom: "14px" }}>
              💰 Savings Pool
            </FLPHeading>
            {savingsAccounts.length === 0 ? (
              <FLPText color="text.muted" fontSize="sm">
                No saving/current accounts found. Connect accounts or add them manually.
              </FLPText>
            ) : (
              <div className={css({ display: "flex", flexDirection: "column", gap: "8px" })}>
                {savingsAccounts.map((acc) => {
                  const bal = getLatestBalance(acc.id, acc.balance);
                  return (
                    <div
                      key={acc.id}
                      className={css({
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: "md",
                        backgroundColor: includedAccounts[acc.id]
                          ? "rgba(99,99,241,0.05)"
                          : "background",
                        border: "1px solid",
                        borderColor: includedAccounts[acc.id] ? "primary" : "border",
                        transition: "all 0.2s",
                      })}
                    >
                      <div>
                        <FLPText fontSize="sm" fontWeight="medium">
                          {acc.name}
                        </FLPText>
                        <FLPText color="text.muted" fontSize="xs">
                          {acc.type}
                        </FLPText>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <FLPText fontSize="sm" fontWeight="semibold" style={{ color: "#10b981" }}>
                          {fmt(bal)}
                        </FLPText>
                        <button
                          className={toggleBtnStyle(includedAccounts[acc.id], "#6363f1")}
                          type="button"
                          onClick={() =>
                            setIncludedAccounts((prev) => ({
                              ...prev,
                              [acc.id]: !prev[acc.id],
                            }))
                          }
                        >
                          <div style={knobStyle(includedAccounts[acc.id])} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div
                  className={css({
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "md",
                    backgroundColor: "background",
                    fontSize: "sm",
                  })}
                >
                  <FLPText fontSize="sm" color="text.muted">
                    Total pool
                  </FLPText>
                  <FLPText fontSize="sm" fontWeight="bold" style={{ color: "#10b981" }}>
                    {fmt(totalSavings)}
                  </FLPText>
                </div>
              </div>
            )}
          </FLPCard>

          {/* Income toggles */}
          {nonPrimaryIncome.length > 0 && (
            <FLPCard>
              <FLPHeading as="h3" size="sm" style={{ marginBottom: "14px" }}>
                💼 Income I'd Keep
              </FLPHeading>
              <div className={css({ display: "flex", flexDirection: "column", gap: "8px" })}>
                {nonPrimaryIncome.map((e) => (
                  <div
                    key={e.id}
                    className={css({
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "md",
                      backgroundColor: "background",
                      border: "1px solid",
                      borderColor: "border",
                    })}
                  >
                    <div>
                      <FLPText fontSize="sm" fontWeight="medium">
                        {e.name}
                      </FLPText>
                      <FLPText fontSize="xs" color="text.muted">
                        {fmt(toMonthly(e))}/mo
                      </FLPText>
                    </div>
                    <button
                      className={toggleBtnStyle(keptIncome[e.id], "#10b981")}
                      type="button"
                      onClick={() => setKeptIncome((prev) => ({ ...prev, [e.id]: !prev[e.id] }))}
                    >
                      <div style={knobStyle(keptIncome[e.id])} />
                    </button>
                  </div>
                ))}
              </div>
            </FLPCard>
          )}

          {/* Expense toggles by category */}
          {groupedExpenses.map(({ cat, entries: catEntries }) => (
            <FLPCard key={cat}>
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                })}
              >
                <FLPHeading as="h3" size="sm">
                  {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
                </FLPHeading>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    className={css({
                      fontSize: "10px",
                      padding: "3px 8px",
                      borderRadius: "sm",
                      border: "1px solid",
                      borderColor: "border",
                      backgroundColor: "background",
                      cursor: "pointer",
                      color: "text.muted",
                      _hover: { borderColor: "primary", color: "primary" },
                    })}
                    type="button"
                    onClick={() =>
                      setKeptExpenses((prev) => ({
                        ...prev,
                        ...Object.fromEntries(catEntries.map((e) => [e.id, true])),
                      }))
                    }
                  >
                    All
                  </button>
                  <button
                    className={css({
                      fontSize: "10px",
                      padding: "3px 8px",
                      borderRadius: "sm",
                      border: "1px solid",
                      borderColor: "border",
                      backgroundColor: "background",
                      cursor: "pointer",
                      color: "text.muted",
                      _hover: { borderColor: "destructive", color: "destructive" },
                    })}
                    type="button"
                    onClick={() =>
                      setKeptExpenses((prev) => ({
                        ...prev,
                        ...Object.fromEntries(catEntries.map((e) => [e.id, false])),
                      }))
                    }
                  >
                    None
                  </button>
                </div>
              </div>
              <div className={css({ display: "flex", flexDirection: "column", gap: "6px" })}>
                {catEntries.map((e) => (
                  <div
                    key={e.id}
                    className={css({
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: "md",
                      backgroundColor: keptExpenses[e.id] ? "rgba(239,68,68,0.05)" : "background",
                      border: "1px solid",
                      borderColor: keptExpenses[e.id] ? "rgba(239,68,68,0.3)" : "border",
                      transition: "all 0.2s",
                    })}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {keptExpenses[e.id] ? (
                        <FaTimesCircle style={{ color: "#ef4444", fontSize: "12px" }} />
                      ) : (
                        <FaCheckCircle style={{ color: "#a1a1aa", fontSize: "12px" }} />
                      )}
                      <div>
                        <FLPText
                          fontSize="sm"
                          fontWeight={keptExpenses[e.id] ? "semibold" : "normal"}
                        >
                          {e.name}
                        </FLPText>
                        <FLPText fontSize="xs" color="text.muted">
                          {fmt(toMonthly(e))}/mo ·{" "}
                          {e.isEssential ? (
                            <span style={{ color: "#10b981" }}>essential</span>
                          ) : (
                            <span>discretionary</span>
                          )}
                        </FLPText>
                      </div>
                    </div>
                    <button
                      className={toggleBtnStyle(keptExpenses[e.id], "#ef4444")}
                      type="button"
                      title={keptExpenses[e.id] ? "I'd keep this" : "I'd cut this"}
                      onClick={() => setKeptExpenses((prev) => ({ ...prev, [e.id]: !prev[e.id] }))}
                    >
                      <div style={knobStyle(keptExpenses[e.id])} />
                    </button>
                  </div>
                ))}
              </div>
            </FLPCard>
          ))}
        </div>

        {/* Right col — result panel (sticky) */}
        <div style={{ position: "sticky", top: "24px" }}>
          <div
            className={css({
              borderRadius: "xl",
              overflow: "hidden",
              border: "1px solid",
              borderColor: "border",
              boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
            })}
          >
            {/* Status banner */}
            <div
              style={{
                backgroundColor: statusCfg.bg,
                padding: "20px 24px",
                borderBottom: "1px solid var(--colors-border)",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}
              >
                <span style={{ fontSize: "20px" }}>{statusCfg.emoji}</span>
                <FLPText
                  fontSize="xs"
                  fontWeight="semibold"
                  textTransform="uppercase"
                  style={{ color: statusCfg.colour }}
                >
                  {statusCfg.label}
                </FLPText>
              </div>
              <FLPHeading
                as="h2"
                size="2xl"
                style={{ color: statusCfg.colour, marginBottom: "4px" }}
              >
                {runwayLabel}
              </FLPHeading>
              <FLPText color="text.muted" fontSize="sm">
                {monthlyBurn > 0
                  ? `At a monthly burn of ${fmt(monthlyBurn)}`
                  : "Zero monthly expenses — infinite runway"}
              </FLPText>
            </div>

            {/* Timeline bar */}
            <div style={{ backgroundColor: "var(--colors-background)", padding: "20px 24px" }}>
              <div style={{ position: "relative", marginBottom: "8px" }}>
                <div
                  style={{
                    height: "10px",
                    borderRadius: "full",
                    backgroundColor: "var(--colors-border)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${barPct}%`,
                      backgroundColor: statusCfg.colour,
                      borderRadius: "full",
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
                {/* Threshold markers */}
                {THRESHOLDS.map((t) => (
                  <div
                    key={t.months}
                    style={{
                      position: "absolute",
                      top: "-4px",
                      left: `${(t.months / displayMax) * 100}%`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    <div
                      style={{
                        width: "2px",
                        height: "18px",
                        backgroundColor: t.colour,
                        opacity: 0.5,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <FLPText fontSize="xs" color="text.muted">
                  0 mo
                </FLPText>
                {THRESHOLDS.map((t) => (
                  <FLPText key={t.months} fontSize="xs" style={{ color: t.colour }}>
                    {t.label}
                  </FLPText>
                ))}
                <FLPText fontSize="xs" color="text.muted">
                  {displayMax}+ mo
                </FLPText>
              </div>
            </div>

            {/* Breakdown */}
            <div
              style={{
                backgroundColor: "var(--colors-surface)",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                borderTop: "1px solid var(--colors-border)",
              }}
            >
              {[
                { label: "Savings pool", value: fmt(pool), colour: "#10b981" },
                {
                  label: "Kept income / mo",
                  value: `+${fmt(totalKeptIncome)}`,
                  colour: "#10b981",
                },
                {
                  label: "Kept expenses / mo",
                  value: `-${fmt(totalSelectedExpenses)}`,
                  colour: "#ef4444",
                },
                {
                  label: "Monthly burn rate",
                  value: `${fmt(monthlyBurn)}/mo`,
                  colour: statusCfg.colour,
                  bold: true,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <FLPText fontSize="sm" color="text.muted">
                    {row.label}
                  </FLPText>
                  <FLPText
                    fontSize="sm"
                    fontWeight={row.bold ? "bold" : "semibold"}
                    style={{ color: row.colour }}
                  >
                    {row.value}
                  </FLPText>
                </div>
              ))}
            </div>

            {/* What-if sliders */}
            <div
              style={{
                backgroundColor: "var(--colors-background)",
                padding: "20px 24px",
                borderTop: "1px solid var(--colors-border)",
              }}
            >
              <FLPText
                fontSize="xs"
                fontWeight="semibold"
                textTransform="uppercase"
                color="text.muted"
                style={{ marginBottom: "14px" }}
              >
                What-if Scenarios
              </FLPText>

              {/* Severance lump */}
              <div style={{ marginBottom: "14px" }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}
                >
                  <FLPText fontSize="sm">Severance / lump sum</FLPText>
                  <FLPText fontSize="sm" fontWeight="semibold" style={{ color: "#10b981" }}>
                    +{fmt(severanceLump)}
                  </FLPText>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    className={css({
                      padding: "4px 8px",
                      borderRadius: "sm",
                      border: "1px solid",
                      borderColor: "border",
                      backgroundColor: "surface",
                      cursor: "pointer",
                      color: "text.muted",
                      _hover: { borderColor: "primary", color: "primary" },
                    })}
                    type="button"
                    onClick={() => setSeveranceLump((p) => Math.max(0, p - 1000))}
                  >
                    <FaMinus size={10} />
                  </button>
                  <input
                    style={{
                      flex: 1,
                      accentColor: "#6363f1",
                    }}
                    max={100000}
                    min={0}
                    step={500}
                    type="range"
                    value={severanceLump}
                    onChange={(e) => setSeveranceLump(Number(e.target.value))}
                  />
                  <button
                    className={css({
                      padding: "4px 8px",
                      borderRadius: "sm",
                      border: "1px solid",
                      borderColor: "border",
                      backgroundColor: "surface",
                      cursor: "pointer",
                      color: "text.muted",
                      _hover: { borderColor: "primary", color: "primary" },
                    })}
                    type="button"
                    onClick={() => setSeveranceLump((p) => Math.min(100000, p + 1000))}
                  >
                    <FaPlus size={10} />
                  </button>
                </div>
              </div>

              {/* Monthly burn reduction */}
              <div>
                <div
                  style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}
                >
                  <FLPText fontSize="sm">Extra monthly cut</FLPText>
                  <FLPText fontSize="sm" fontWeight="semibold" style={{ color: "#10b981" }}>
                    -{fmt(extraMonthlyCut)}/mo
                  </FLPText>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    className={css({
                      padding: "4px 8px",
                      borderRadius: "sm",
                      border: "1px solid",
                      borderColor: "border",
                      backgroundColor: "surface",
                      cursor: "pointer",
                      color: "text.muted",
                      _hover: { borderColor: "primary", color: "primary" },
                    })}
                    type="button"
                    onClick={() => setExtraMonthlyCut((p) => Math.max(0, p - 50))}
                  >
                    <FaMinus size={10} />
                  </button>
                  <input
                    style={{ flex: 1, accentColor: "#6363f1" }}
                    max={5000}
                    min={0}
                    step={50}
                    type="range"
                    value={extraMonthlyCut}
                    onChange={(e) => setExtraMonthlyCut(Number(e.target.value))}
                  />
                  <button
                    className={css({
                      padding: "4px 8px",
                      borderRadius: "sm",
                      border: "1px solid",
                      borderColor: "border",
                      backgroundColor: "surface",
                      cursor: "pointer",
                      color: "text.muted",
                      _hover: { borderColor: "primary", color: "primary" },
                    })}
                    type="button"
                    onClick={() => setExtraMonthlyCut((p) => Math.min(5000, p + 50))}
                  >
                    <FaPlus size={10} />
                  </button>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div
              style={{
                padding: "16px 24px",
                backgroundColor: "var(--colors-surface)",
                borderTop: "1px solid var(--colors-border)",
              }}
            >
              <FLPButton variant="outline" style={{ width: "100%" }} onClick={onNavigateToForecast}>
                <FaArrowRight style={{ marginRight: "8px" }} />
                Improve runway → Savings Forecast
              </FLPButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunwayCalculator;
