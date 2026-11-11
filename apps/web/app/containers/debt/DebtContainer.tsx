import {
  calculateDebtSchedule,
  compareAvalancheAndSnowball,
  type DebtItem,
  evaluateFinancialStage,
  PortfolioSnapshot,
} from "@flump/finance-engine";
import { Button, EmptyState } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import { FaBookOpen, FaCalculator, FaCreditCard, FaExclamationTriangle } from "react-icons/fa";
import { Link, useLoaderData } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import AddDebtDialog from "~/components/debt/AddDebtDialog";
import DebtAccountsList from "~/components/debt/DebtAccountsList";
import DebtSummaryCards from "~/components/debt/DebtSummaryCards";
import DebtToWealthBridgeCard from "~/components/debt/DebtToWealthBridgeCard";
import PayoffStrategySwitcher from "~/components/debt/PayoffStrategySwitcher";
import UkDebtInstrumentsCard from "~/components/debt/UkDebtInstrumentsCard";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useUserProfile } from "~/hooks/useUserProfile";

const containerStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  paddingBottom: "64px",
});

const tabStyle = (active: boolean) =>
  css({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "md",
    fontSize: "13px",
    fontWeight: "semibold",
    cursor: "pointer",
    backgroundColor: active ? "card" : "transparent",
    color: active ? "text.primary" : "text.muted",
    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
    border: "1px solid",
    borderColor: active ? "border.subtle" : "transparent",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
    _hover: active ? {} : { color: "text.primary" },
  });

export const DebtContainer: FC = () => {
  const loaderData = useLoaderData<any>();
  const { formatCurrency } = useFormatCurrency();
  const { profile } = useUserProfile();

  const accounts = loaderData?.accounts || [];
  const debtInputs = loaderData?.debtInputs as
    | {
        monthlySurplus: number | null;
        liquidSavings: number;
        monthlyEssentialExpenses: number | null;
      }
    | undefined;
  const monthlySurplus = debtInputs?.monthlySurplus ?? null;
  const budgetSurplus = monthlySurplus ?? 0;

  // Tab state
  const [activeTab, setActiveTab] = useState<"simulator" | "accounts" | "instruments">("simulator");

  // Initialise debts from the user's real liability accounts only
  const [debts, setDebts] = useState<DebtItem[]>(() => {
    const snapshot = new PortfolioSnapshot(accounts, loaderData?.accountDetails || []);
    return snapshot.toDebtItems();
  });

  const [selectedStrategy, setSelectedStrategy] = useState<"avalanche" | "snowball">("avalanche");
  const [extraPayment, setExtraPayment] = useState<number>(50);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Financial stage evaluation
  const stageEval = useMemo(() => {
    return evaluateFinancialStage({
      debts,
      monthlySurplus: budgetSurplus,
      liquidSavings: debtInputs?.liquidSavings ?? 0,
      monthlyEssentialExpenses: debtInputs?.monthlyEssentialExpenses ?? 0,
    });
  }, [debts, budgetSurplus, debtInputs?.liquidSavings, debtInputs?.monthlyEssentialExpenses]);

  // Strategy comparison and promotional cliff detection
  const comparison = useMemo(() => {
    return compareAvalancheAndSnowball(debts, extraPayment);
  }, [debts, extraPayment]);

  const scheduleResult = useMemo(() => {
    return calculateDebtSchedule(
      debts,
      extraPayment,
      selectedStrategy.toUpperCase() as "AVALANCHE" | "SNOWBALL",
    );
  }, [debts, extraPayment, selectedStrategy]);

  const promoAlerts = scheduleResult.promoCliffAlerts.filter((a) => a.hasCliffRisk);

  const activeResult =
    selectedStrategy === "avalanche" ? comparison.avalanche : comparison.snowball;
  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalMin = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const hasDebts = debts.length > 0;

  const handleAddDebt = (newDebt: Omit<DebtItem, "id">) => {
    const item: DebtItem = {
      ...newDebt,
      id: `debt-${Date.now()}`,
    };
    setDebts((prev) => [...prev, item]);
  };

  const handleDeleteDebt = (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  };

  const handleUpdateDebt = (id: string, updates: Partial<DebtItem>) => {
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };

  return (
    <div className={containerStyle}>
      {/* 0% Promotional Cliff & Overdraft Warning Alerts */}
      {promoAlerts.length > 0 && (
        <div
          className={css({
            padding: "16px 20px",
            borderRadius: "xl",
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            border: "1px solid",
            borderColor: "rgba(239, 68, 68, 0.3)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          })}
        >
          <div className={css({ display: "flex", alignItems: "center", gap: "8px" })}>
            <FaExclamationTriangle
              className={css({ color: "destructive.500", fontSize: "18px" })}
            />
            <FLPHeading as="h4" size="sm" color="destructive.500">
              0% balance transfer promotional expiry alert
            </FLPHeading>
          </div>
          {promoAlerts.map((alert) => (
            <div
              key={alert.debtId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <FLPText fontSize="xs" color="text.primary">
                <strong>{alert.debtName}</strong> promotional 0% APR expires on{" "}
                <strong>{alert.promoExpiryDate}</strong>. At current repayment rates, £
                {alert.projectedBalanceAtExpiryGbp.toLocaleString()} will revert to{" "}
                <strong>{alert.revertApr}% APR</strong>.
              </FLPText>
              <FLPButton
                size="sm"
                variant="outline"
                onClick={() => setExtraPayment(alert.requiredMonthlyToClearBeforeCliff)}
              >
                Allocate £{alert.requiredMonthlyToClearBeforeCliff}/mo to clear
              </FLPButton>
            </div>
          ))}
        </div>
      )}

      {/* 1. Header & Stage Notification */}
      <div
        className={css({
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginTop: "16px",
          marginBottom: "8px",
        })}
      >
        <div>
          <FLPHeading as="h1" color="text.primary" size="2xl">
            Debt payoff and recovery
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
            Model mathematically optimal debt clearance, manage promotional 0% offers, and bridge
            your surplus into long-term wealth.
          </FLPText>
        </div>
      </div>

      {/* 2. Summary Metric Cards (Single compact 4-card row) */}
      {hasDebts ? (
        <DebtSummaryCards
          debtFreeDate={activeResult.debtFreeDate}
          extraPayment={extraPayment}
          highInterestDebt={stageEval.highInterestDebt}
          monthlyMinimumTotal={totalMin}
          monthsShaved={
            selectedStrategy === "avalanche"
              ? comparison.monthsShavedAvalancheVsMin
              : Math.max(0, comparison.minimumOnly.months - comparison.snowball.months)
          }
          strategy={selectedStrategy}
          totalDebt={totalDebt}
          totalInterestSaved={
            selectedStrategy === "avalanche"
              ? comparison.interestSavedAvalancheVsMin
              : Math.max(
                  0,
                  comparison.minimumOnly.totalInterest - comparison.snowball.totalInterest,
                )
          }
        />
      ) : null}

      {/* Tab Bar: Segmented Navigation */}
      <div
        className={css({
          display: "flex",
          backgroundColor: "surface.sunken",
          border: "1px solid",
          borderColor: "border.subtle",
          padding: "4px",
          borderRadius: "lg",
          gap: "4px",
          overflowX: "auto",
          maxWidth: "100%",
          WebkitOverflowScrolling: "touch",
        })}
      >
        {hasDebts ? null : (
          <button
            type="button"
            className={tabStyle(activeTab !== "instruments")}
            onClick={() => setActiveTab("simulator")}
          >
            <FaCreditCard size={13} style={{ marginRight: "6px" }} /> Your debts
          </button>
        )}
        {hasDebts ? (
          <>
            <button
              type="button"
              className={tabStyle(activeTab === "simulator")}
              onClick={() => setActiveTab("simulator")}
            >
              <FaCalculator size={13} style={{ marginRight: "6px" }} /> Strategy & Payoff Simulator
            </button>
            <button
              type="button"
              className={tabStyle(activeTab === "accounts")}
              onClick={() => setActiveTab("accounts")}
            >
              <FaCreditCard size={13} style={{ marginRight: "6px" }} /> Liability Accounts & Cards (
              {debts.length})
            </button>
          </>
        ) : null}
        <button
          type="button"
          className={tabStyle(activeTab === "instruments")}
          onClick={() => setActiveTab("instruments")}
        >
          <FaBookOpen size={13} style={{ marginRight: "6px" }} /> UK Debt Rules & Helplines
        </button>
      </div>

      {!hasDebts && activeTab !== "instruments" ? (
        <EmptyState
          title="No debts yet"
          description="Add your credit cards, loans and overdrafts to compare payoff plans."
          action={
            <Button type="button" onClick={() => setIsAddModalOpen(true)}>
              Add debt
            </Button>
          }
        />
      ) : null}

      {/* Tab 1: Strategy & Payoff Simulator */}
      {hasDebts ? (
        <>
          <div
            style={
              activeTab === "simulator"
                ? { display: "block" }
                : {
                    height: 0,
                    overflow: "hidden",
                    opacity: 0,
                    position: "absolute",
                    pointerEvents: "none",
                  }
            }
          >
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: { base: "1fr", lg: "repeat(12, 1fr)" },
                gap: "24px",
                alignItems: "start",
              })}
            >
              <div className={css({ gridColumn: { base: "span 1", lg: "span 5" } })}>
                {monthlySurplus === null ? (
                  <FLPText color="text.muted" fontSize="sm">
                    <Link
                      to="/app/budget"
                      className={css({
                        color: "primary",
                        textDecoration: "underline",
                        fontVariantNumeric: "tabular-nums",
                      })}
                    >
                      Set up your budget to see your monthly surplus
                    </Link>
                  </FLPText>
                ) : null}
                <PayoffStrategySwitcher
                  budgetSurplus={Math.max(0, budgetSurplus)}
                  comparison={comparison}
                  extraPayment={extraPayment}
                  selectedStrategy={selectedStrategy}
                  onChangeExtraPayment={setExtraPayment}
                  onSelectStrategy={setSelectedStrategy}
                />
              </div>
              <div className={css({ gridColumn: { base: "span 1", lg: "span 7" } })}>
                <DebtToWealthBridgeCard debts={debts} extraPayment={extraPayment} />
              </div>
            </div>
          </div>

          {/* Tab 2: Liability Accounts & Cards */}
          <div
            style={
              activeTab === "accounts"
                ? { display: "block" }
                : {
                    height: 0,
                    overflow: "hidden",
                    opacity: 0,
                    position: "absolute",
                    pointerEvents: "none",
                  }
            }
          >
            <DebtAccountsList
              debts={debts}
              onAddDebt={() => setIsAddModalOpen(true)}
              onDeleteDebt={handleDeleteDebt}
              onUpdateDebt={handleUpdateDebt}
            />
          </div>
        </>
      ) : null}

      {/* Tab 3: UK Specific Debt Instruments & Rules */}
      <div
        style={
          activeTab === "instruments"
            ? { display: "block" }
            : {
                height: 0,
                overflow: "hidden",
                opacity: 0,
                position: "absolute",
                pointerEvents: "none",
              }
        }
      >
        <UkDebtInstrumentsCard />
      </div>

      {/* Add Debt Modal */}
      <AddDebtDialog
        isOpen={isAddModalOpen}
        onAddDebt={handleAddDebt}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};

export default DebtContainer;
