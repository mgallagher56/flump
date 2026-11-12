import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useMemo, useState } from "react";
import { FaArrowRight, FaCheckCircle, FaInfoCircle, FaTimesCircle, FaUndo } from "react-icons/fa";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useResponsive } from "~/context/ResponsiveContext";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { BudgetEntry } from "~/types/budget";
import { CATEGORY_ICONS, CATEGORY_LABELS, toMonthly } from "~/types/budget";
import {
  loadRunwaySettings,
  type RunwaySavedSettings,
  saveRunwaySettings,
} from "~/utils/runwayStorage";

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
  savedSettings?: RunwaySavedSettings | null;
  onSaveSettings?: (settings: RunwaySavedSettings) => void;
}

const EXPENSE_CATEGORIES: BudgetEntry["category"][] = ["housing", "bills", "expenses"];

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
  critical: {
    colour: "var(--colors-destructive-500)",
    bg: "var(--colors-destructive-bg)",
    label: "Critical",
    emoji: "🔴",
  },
  caution: {
    colour: "var(--colors-warning-500)",
    bg: "var(--colors-warning-bg)",
    label: "Caution",
    emoji: "🟡",
  },
  moderate: {
    colour: "var(--colors-warning-600)",
    bg: "color-mix(in srgb, var(--colors-chart-warning) 08%, transparent)",
    label: "Moderate",
    emoji: "🟠",
  },
  healthy: {
    colour: "var(--colors-success-500)",
    bg: "var(--colors-success-bg)",
    label: "Healthy",
    emoji: "🟢",
  },
};

const THRESHOLDS = [
  { months: 3, label: "3 mo", colour: "var(--colors-destructive-500)" },
  { months: 6, label: "6 mo", colour: "var(--colors-warning-500)" },
  { months: 12, label: "12 mo", colour: "var(--colors-success-500)" },
];

const toggleBtnStyle = css({
  width: "40px",
  height: "22px",
  borderRadius: "full",
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
  boxShadow: "0 1px 3px color-mix(in srgb, var(--colors-surface-contrast) 30%, transparent)",
});

const smallInputStyle = css({
  width: "100%",
  padding: "5px 10px",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
  color: "text.primary",
  fontSize: "13px",
  outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  _focus: {
    borderColor: "primary",
    boxShadow: "0 0 0 2px color-mix(in srgb, var(--colors-primary) 20%, transparent)",
  },
});

const RunwayCalculator: FC<RunwayCalculatorProps> = ({
  entries,
  accounts,
  accountDetails,
  onNavigateToForecast,
  savedSettings,
  onSaveSettings,
}) => {
  const { isMobile } = useResponsive();
  const { formatCurrency } = useFormatCurrency();

  const fmt = (n: number | string | null | undefined) => {
    const val = Number(n);
    if (!Number.isFinite(val)) return formatCurrency(0);
    return formatCurrency(Math.abs(val));
  };

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

  const [includedAccounts, setIncludedAccounts] = useState<Record<string, boolean>>(() => {
    const stored = initialSettings?.includedAccounts;
    const initial: Record<string, boolean> = {};
    for (const a of savingsAccounts) {
      initial[a.id] = stored && stored[a.id] !== undefined ? !!stored[a.id] : true;
    }
    return initial;
  });

  const [keptIncome, setKeptIncome] = useState<Record<string, boolean>>(() => {
    const stored = initialSettings?.keptIncome;
    const initial: Record<string, boolean> = {};
    for (const e of nonPrimaryIncome) {
      initial[e.id] = stored && stored[e.id] !== undefined ? !!stored[e.id] : true;
    }
    return initial;
  });

  const [keptExpenses, setKeptExpenses] = useState<Record<string, boolean>>(() => {
    const stored = initialSettings?.keptExpenses;
    const initial: Record<string, boolean> = {};
    for (const e of expenseEntries) {
      initial[e.id] = stored && stored[e.id] !== undefined ? !!stored[e.id] : e.isEssential;
    }
    return initial;
  });

  const [severanceLump, setSeveranceLump] = useState<number>(
    () => initialSettings?.severanceLump ?? 0,
  );
  const [extraMonthlyCut, setExtraMonthlyCut] = useState<number>(
    () => initialSettings?.extraMonthlyCut ?? 0,
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

  // Persist helper
  const persistSettings = (
    newAccounts: Record<string, boolean>,
    newIncome: Record<string, boolean>,
    newExpenses: Record<string, boolean>,
    newSeverance: number,
    newExtraCut: number,
  ) => {
    const payload: RunwaySavedSettings = {
      includedAccounts: newAccounts,
      keptIncome: newIncome,
      keptExpenses: newExpenses,
      severanceLump: newSeverance,
      extraMonthlyCut: newExtraCut,
    };
    saveRunwaySettings(payload);
    onSaveSettings?.(payload);
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

  const handleClearWhatIf = () => {
    setSeveranceLump(0);
    setExtraMonthlyCut(0);
    persistSettings(includedAccounts, keptIncome, keptExpenses, 0, 0);
  };

  const handleResetToDefaults = () => {
    const defaultAccounts = Object.fromEntries(savingsAccounts.map((a) => [a.id, true]));
    const defaultIncome = Object.fromEntries(nonPrimaryIncome.map((e) => [e.id, true]));
    const defaultExpenses = Object.fromEntries(expenseEntries.map((e) => [e.id, e.isEssential]));
    setIncludedAccounts(defaultAccounts);
    setKeptIncome(defaultIncome);
    setKeptExpenses(defaultExpenses);
    setSeveranceLump(0);
    setExtraMonthlyCut(0);
    persistSettings(defaultAccounts, defaultIncome, defaultExpenses, 0, 0);
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
      {/* Header info & persistence bar */}
      <div
        className={css({
          padding: "16px 20px",
          borderRadius: "lg",
          backgroundColor: "color-mix(in srgb, var(--colors-primary) 6%, transparent)",
          border: "1px solid color-mix(in srgb, var(--colors-primary) 20%, transparent)",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: "12px",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
        })}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <FaInfoCircle
            style={{ color: "var(--colors-primary)", marginTop: "3px", flexShrink: 0 }}
          />
          <FLPText fontSize="sm" color="text.muted" style={{ lineHeight: "1.6" }}>
            Toggle the accounts you'd use, income you'd keep, and expenses you'd cut. All options
            are auto-saved so your custom runway scenario stays preserved. Primary salary is
            excluded.
          </FLPText>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--colors-status-positive-text)",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontWeight: 500,
              padding: "4px 8px",
              borderRadius: "6px",
              backgroundColor: "color-mix(in srgb, var(--colors-chart-wealth) 10%, transparent)",
            }}
          >
            <FaCheckCircle size={12} /> Auto-saved
          </span>
          <button
            type="button"
            onClick={handleResetToDefaults}
            title="Reset what-if scenario to default settings"
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              padding: "4px 10px",
              borderRadius: "md",
              border: "1px solid",
              borderColor: "border",
              backgroundColor: "surface",
              cursor: "pointer",
              color: "text.muted",
              transition: "all 0.2s",
              _hover: { borderColor: "primary", color: "primary" },
            })}
          >
            <FaUndo size={10} /> Reset
          </button>
        </div>
      </div>

      {/* Main 2-col layout */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : { base: "1fr", lg: "1fr 1fr" },
          gap: "20px",
          alignItems: "start",
        })}
      >
        {/* Left col — controls */}
        <div className={css({ display: "flex", flexDirection: "column", gap: "16px" })}>
          {/* Savings pool */}
          <FLPCard>
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
              })}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FLPHeading as="h3" size="sm">
                  💰 Savings Pool
                </FLPHeading>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    backgroundColor: "color-mix(in srgb, var(--colors-primary) 10%, transparent)",
                    color: "var(--colors-primary)",
                    fontWeight: 600,
                  }}
                >
                  {fmt(totalSavings)}
                </span>
              </div>
              {savingsAccounts.length > 0 && (
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
                    onClick={() => setAllAccounts(true)}
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
                      _hover: { borderColor: "destructive", color: "status.danger.text" },
                    })}
                    type="button"
                    onClick={() => setAllAccounts(false)}
                  >
                    None
                  </button>
                </div>
              )}
            </div>
            {savingsAccounts.length === 0 ? (
              <FLPText color="text.muted" fontSize="sm">
                No saving/current/investment accounts found. Connect accounts or add them manually.
              </FLPText>
            ) : (
              <div className={css({ display: "flex", flexDirection: "column", gap: "8px" })}>
                {savingsAccounts.map((acc) => {
                  const bal = getLatestBalance(acc.id, acc.balance);
                  const isIncluded = !!includedAccounts[acc.id];
                  return (
                    <div
                      key={acc.id}
                      className={css({
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: "md",
                        backgroundColor: isIncluded
                          ? "color-mix(in srgb, var(--colors-primary) 6%, transparent)"
                          : "background",
                        border: "1px solid",
                        borderColor: isIncluded
                          ? "color-mix(in srgb, var(--colors-primary) 40%, transparent)"
                          : "border",
                        transition: "all 0.2s",
                      })}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {isIncluded ? (
                          <FaCheckCircle
                            style={{
                              color: "var(--colors-primary)",
                              fontSize: "14px",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <FaTimesCircle
                            style={{
                              color: "var(--colors-chart-baseline)",
                              fontSize: "14px",
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <div>
                          <FLPText fontSize="sm" fontWeight={isIncluded ? "semibold" : "medium"}>
                            {acc.name}
                          </FLPText>
                          <FLPText color="text.muted" fontSize="xs">
                            <span>{acc.type}</span> ·{" "}
                            <span
                              style={{ color: isIncluded ? "var(--colors-primary)" : "inherit" }}
                            >
                              {isIncluded ? "included" : "excluded"}
                            </span>
                          </FLPText>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <FLPText
                          fontSize="sm"
                          fontWeight="semibold"
                          style={{
                            color: isIncluded
                              ? "var(--colors-status-positive-text)"
                              : "var(--colors-text-muted)",
                          }}
                        >
                          {fmt(bal)}
                        </FLPText>
                        <button
                          aria-checked={isIncluded}
                          aria-label={`Include ${acc.name} in savings pool`}
                          className={toggleBtnStyle}
                          style={{
                            backgroundColor: isIncluded
                              ? "var(--colors-primary)"
                              : "color-mix(in srgb, var(--colors-chart-baseline) 35%, transparent)",
                          }}
                          role="switch"
                          type="button"
                          onClick={() => toggleAccount(acc.id)}
                        >
                          <div style={knobStyle(isIncluded)} />
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
                  <FLPText
                    fontSize="sm"
                    fontWeight="bold"
                    style={{ color: "var(--colors-status-positive-text)" }}
                  >
                    {fmt(totalSavings)}
                  </FLPText>
                </div>
              </div>
            )}
          </FLPCard>

          {/* Income toggles */}
          {nonPrimaryIncome.length > 0 && (
            <FLPCard>
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                })}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FLPHeading as="h3" size="sm">
                    Income I'd keep
                  </FLPHeading>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      backgroundColor:
                        "color-mix(in srgb, var(--colors-chart-wealth) 12%, transparent)",
                      color: "var(--colors-status-positive-text)",
                      fontWeight: 600,
                    }}
                  >
                    +{fmt(totalKeptIncome)}/mo
                  </span>
                </div>
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
                      _hover: {
                        borderColor: "var(--colors-chart-wealth)",
                        color: "status.positive.text",
                      },
                    })}
                    type="button"
                    onClick={() => setAllIncome(true)}
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
                      _hover: { borderColor: "destructive", color: "status.danger.text" },
                    })}
                    type="button"
                    onClick={() => setAllIncome(false)}
                  >
                    None
                  </button>
                </div>
              </div>

              <div className={css({ display: "flex", flexDirection: "column", gap: "8px" })}>
                {nonPrimaryIncome.map((e) => {
                  const isKept = !!keptIncome[e.id];
                  return (
                    <div
                      key={e.id}
                      className={css({
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: "md",
                        backgroundColor: isKept
                          ? "color-mix(in srgb, var(--colors-chart-wealth) 6%, transparent)"
                          : "background",
                        border: "1px solid",
                        borderColor: isKept
                          ? "color-mix(in srgb, var(--colors-chart-wealth) 35%, transparent)"
                          : "border",
                        transition: "all 0.2s",
                      })}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {isKept ? (
                          <FaCheckCircle
                            style={{
                              color: "var(--colors-status-positive-text)",
                              fontSize: "14px",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <FaTimesCircle
                            style={{
                              color: "var(--colors-chart-baseline)",
                              fontSize: "14px",
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <div>
                          <FLPText fontSize="sm" fontWeight={isKept ? "semibold" : "normal"}>
                            {e.name}
                          </FLPText>
                          <FLPText fontSize="xs" color="text.muted">
                            <span
                              style={{
                                color: isKept ? "var(--colors-status-positive-text)" : "inherit",
                                fontWeight: isKept ? 600 : 400,
                              }}
                            >
                              +{fmt(toMonthly(e))}/mo
                            </span>{" "}
                            ·{" "}
                            <span
                              style={{
                                color: isKept ? "var(--colors-status-positive-text)" : "inherit",
                              }}
                            >
                              {isKept ? "kept" : "excluded"}
                            </span>
                          </FLPText>
                        </div>
                      </div>
                      <button
                        aria-checked={isKept}
                        aria-label={`Keep ${e.name} income`}
                        className={toggleBtnStyle}
                        style={{
                          backgroundColor: isKept
                            ? "var(--colors-chart-wealth)"
                            : "color-mix(in srgb, var(--colors-chart-baseline) 35%, transparent)",
                        }}
                        role="switch"
                        type="button"
                        onClick={() => toggleIncome(e.id)}
                      >
                        <div style={knobStyle(isKept)} />
                      </button>
                    </div>
                  );
                })}
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
                    onClick={() => setCategoryExpenses(catEntries, true)}
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
                      _hover: { borderColor: "destructive", color: "status.danger.text" },
                    })}
                    type="button"
                    onClick={() => setCategoryExpenses(catEntries, false)}
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
                      backgroundColor: keptExpenses[e.id]
                        ? "color-mix(in srgb, var(--colors-status-danger-text) 5%, transparent)"
                        : "background",
                      border: "1px solid",
                      borderColor: keptExpenses[e.id]
                        ? "color-mix(in srgb, var(--colors-status-danger-text) 30%, transparent)"
                        : "border",
                      transition: "all 0.2s",
                    })}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {keptExpenses[e.id] ? (
                        <FaTimesCircle
                          style={{ color: "var(--colors-status-danger-text)", fontSize: "12px" }}
                        />
                      ) : (
                        <FaCheckCircle
                          style={{ color: "var(--colors-chart-baseline)", fontSize: "12px" }}
                        />
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
                            <span style={{ color: "var(--colors-status-positive-text)" }}>
                              essential
                            </span>
                          ) : (
                            <span>discretionary</span>
                          )}
                        </FLPText>
                      </div>
                    </div>
                    <button
                      aria-checked={!!keptExpenses[e.id]}
                      aria-label={`Keep ${e.name} expense`}
                      className={toggleBtnStyle}
                      style={{
                        backgroundColor: keptExpenses[e.id]
                          ? "var(--colors-status-danger-text)"
                          : "color-mix(in srgb, var(--colors-chart-baseline) 35%, transparent)",
                      }}
                      role="switch"
                      type="button"
                      title={keptExpenses[e.id] ? "I'd keep this" : "I'd cut this"}
                      onClick={() => toggleExpense(e.id)}
                    >
                      <div style={knobStyle(keptExpenses[e.id])} />
                    </button>
                  </div>
                ))}
              </div>
            </FLPCard>
          ))}
        </div>

        {/* Right col — result panel (sticky on desktop) */}
        <div style={isMobile ? undefined : { position: "sticky", top: "24px" }}>
          <div
            className={css({
              borderRadius: "xl",
              overflow: "hidden",
              border: "1px solid",
              borderColor: "border",
              boxShadow:
                "0 8px 30px color-mix(in srgb, var(--colors-surface-contrast) 10%, transparent)",
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
                { label: "Savings pool", value: fmt(pool), colour: "var(--colors-chart-wealth)" },
                {
                  label: "Kept income / mo",
                  value: `+${fmt(totalKeptIncome)}`,
                  colour: "var(--colors-chart-wealth)",
                },
                {
                  label: "Kept expenses / mo",
                  value: `-${fmt(totalSelectedExpenses)}`,
                  colour: "var(--colors-status-danger-text)",
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                }}
              >
                <FLPText
                  fontSize="xs"
                  fontWeight="bold"
                  textTransform="uppercase"
                  color="text.muted"
                >
                  What-If Scenarios
                </FLPText>
                {(severanceLump > 0 || extraMonthlyCut > 0) && (
                  <button
                    type="button"
                    onClick={handleClearWhatIf}
                    className={css({
                      fontSize: "11px",
                      color: "text.muted",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px 6px",
                      borderRadius: "sm",
                      _hover: { color: "primary" },
                    })}
                  >
                    Clear scenarios
                  </button>
                )}
              </div>

              <div className={css({ display: "flex", flexDirection: "column", gap: "10px" })}>
                {/* Severance lump input */}
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  })}
                >
                  <label
                    htmlFor="runway-severance-input"
                    style={{ fontSize: "13px", fontWeight: 500, cursor: "pointer", flexShrink: 0 }}
                  >
                    Severance / lump sum
                  </label>
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      width: "130px",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        left: "9px",
                        color: "var(--colors-text-muted)",
                        fontWeight: "bold",
                        fontSize: "12px",
                        pointerEvents: "none",
                      }}
                    >
                      £
                    </span>
                    <input
                      id="runway-severance-input"
                      aria-label="Severance or lump sum"
                      className={smallInputStyle}
                      style={{ paddingLeft: "22px", textAlign: "right", paddingRight: "8px" }}
                      type="number"
                      min="0"
                      step="500"
                      placeholder="0"
                      value={severanceLump === 0 ? "" : severanceLump}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : Number(e.target.value);
                        handleSeveranceChange(val);
                      }}
                    />
                  </div>
                </div>

                {/* Extra monthly cut input */}
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  })}
                >
                  <label
                    htmlFor="runway-extra-cut-input"
                    style={{ fontSize: "13px", fontWeight: 500, cursor: "pointer", flexShrink: 0 }}
                  >
                    Extra monthly cut
                  </label>
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      width: "130px",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        left: "9px",
                        color: "var(--colors-text-muted)",
                        fontWeight: "bold",
                        fontSize: "12px",
                        pointerEvents: "none",
                      }}
                    >
                      £
                    </span>
                    <input
                      id="runway-extra-cut-input"
                      aria-label="Extra monthly spending cut"
                      className={smallInputStyle}
                      style={{ paddingLeft: "22px", textAlign: "right", paddingRight: "32px" }}
                      type="number"
                      min="0"
                      step="50"
                      placeholder="0"
                      value={extraMonthlyCut === 0 ? "" : extraMonthlyCut}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : Number(e.target.value);
                        handleExtraCutChange(val);
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        right: "8px",
                        color: "var(--colors-text-muted)",
                        fontSize: "11px",
                        pointerEvents: "none",
                      }}
                    >
                      /mo
                    </span>
                  </div>
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
