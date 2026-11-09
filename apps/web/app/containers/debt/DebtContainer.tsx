import {
  calculateDebtSchedule,
  compareAvalancheAndSnowball,
  type DebtItem,
  evaluateFinancialStage,
  PortfolioSnapshot,
} from "@flump/finance-engine";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import { FaExclamationTriangle, FaFire, FaShieldAlt } from "react-icons/fa";
import { useLoaderData } from "react-router";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import AddDebtDialog from "~/components/debt/AddDebtDialog";
import DebtAccountsList from "~/components/debt/DebtAccountsList";
import DebtSummaryCards from "~/components/debt/DebtSummaryCards";
import DebtToWealthBridgeCard from "~/components/debt/DebtToWealthBridgeCard";
import PayoffStrategySwitcher from "~/components/debt/PayoffStrategySwitcher";
import UkDebtInstrumentsCard from "~/components/debt/UkDebtInstrumentsCard";
import GlobalBaselineScenarioBar from "~/components/navigation/GlobalBaselineScenarioBar";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useUserProfile } from "~/hooks/useUserProfile";

const containerStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  paddingBottom: "64px",
});

const stageBannerStyle = css({
  padding: "16px 20px",
  borderRadius: "xl",
  border: "1px solid",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "12px",
});

const defaultDebts: DebtItem[] = [
  {
    id: "debt-1",
    name: "Barclaycard Platinum",
    balance: 3200,
    apr: 24.9,
    minimumPayment: 80,
    type: "credit_card",
  },
  {
    id: "debt-2",
    name: "Klarna Pay in 3",
    balance: 450,
    apr: 18.9,
    minimumPayment: 60,
    type: "bnpl",
  },
  {
    id: "debt-3",
    name: "Lloyds Arranged Overdraft",
    balance: 1000,
    apr: 39.9,
    minimumPayment: 40,
    type: "overdraft",
  },
  {
    id: "debt-4",
    name: "Tesco Personal Loan",
    balance: 4500,
    apr: 7.9,
    minimumPayment: 135,
    type: "loan",
  },
];

export const DebtContainer: FC = () => {
  const loaderData = useLoaderData<any>();
  const { formatCurrency } = useFormatCurrency();
  const { profile } = useUserProfile();

  const accounts = loaderData?.accounts || [];
  const budgetData = loaderData?.budgetData;
  const budgetSurplus = budgetData?.monthlySurplus || 150;

  // Initialize debts from existing liability accounts or fallback to sensible baseline
  const [debts, setDebts] = useState<DebtItem[]>(() => {
    const snapshot = new PortfolioSnapshot(accounts, loaderData?.accountDetails || []);
    const items = snapshot.toDebtItems();
    return items.length > 0 ? items : defaultDebts;
  });

  const [selectedStrategy, setSelectedStrategy] = useState<"avalanche" | "snowball">("avalanche");
  const [extraPayment, setExtraPayment] = useState<number>(50);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Financial stage evaluation
  const stageEval = useMemo(() => {
    return evaluateFinancialStage({
      debts,
      monthlySurplus: budgetSurplus,
      liquidSavings: 800,
      monthlyEssentialExpenses: 1600,
    });
  }, [debts, budgetSurplus]);

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
      {/* Global Baseline & What-If Scenario Bar */}
      <GlobalBaselineScenarioBar />

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
            gap: "8px",
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
            <FLPText key={alert.debtId} fontSize="xs" color="text.primary">
              <strong>{alert.debtName}</strong> promotional 0% APR expires on{" "}
              <strong>{alert.promoExpiryDate}</strong>. At current repayment rates, £
              {alert.projectedBalanceAtExpiryGbp.toLocaleString()} will revert to{" "}
              <strong>{alert.revertApr}% APR</strong>. Allocate £
              {alert.requiredMonthlyToClearBeforeCliff}/mo to clear it before expiry.
            </FLPText>
          ))}
        </div>
      )}

      {/* 1. Header & Stage Notification */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div style={{ flex: "1 1 320px" }}>
          <FLPHeading as="h2" size="2xl">
            Debt payoff and recovery
          </FLPHeading>
          <FLPText color="text.muted" fontSize="md">
            Model mathematically optimal debt clearance, manage promotional 0% offers, and bridge
            your surplus into long-term wealth.
          </FLPText>
        </div>
      </div>

      {/* 2. Summary Metric Cards */}
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
            : Math.max(0, comparison.minimumOnly.totalInterest - comparison.snowball.totalInterest)
        }
      />

      {/* 3. Active Liability Accounts List */}
      <DebtAccountsList
        debts={debts}
        onAddDebt={() => setIsAddModalOpen(true)}
        onDeleteDebt={handleDeleteDebt}
        onUpdateDebt={handleUpdateDebt}
      />

      {/* 4 & 5. 2-Column Interactive Payoff Simulator & Wealth Bridge */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", lg: "repeat(12, 1fr)" },
          gap: "24px",
          alignItems: "start",
        })}
      >
        <div className={css({ gridColumn: { base: "span 1", lg: "span 5" } })}>
          <PayoffStrategySwitcher
            budgetSurplus={budgetSurplus}
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

      {/* 6. UK Specific Debt Instruments & Rules */}
      <UkDebtInstrumentsCard />

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
