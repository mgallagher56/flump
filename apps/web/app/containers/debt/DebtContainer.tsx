import { compareAvalancheAndSnowball, type DebtItem, evaluateFinancialStage } from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import { FaFire, FaShieldAlt } from "react-icons/fa";
import { useLoaderData } from "react-router";
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
    const liabilityAccounts = accounts.filter(
      (a: any) =>
        a.type === "Credit Card" ||
        a.type === "Loan" ||
        a.type === "credit_card" ||
        a.type === "Owed" ||
        (Number(a.balance) < 0 && a.type === "Current"),
    );

    if (liabilityAccounts.length > 0) {
      return liabilityAccounts.map((a: any, idx: number) => {
        const bal = Math.abs(Number(a.balance) || 1000);
        const isOverdraft = a.type === "Current" && Number(a.balance) < 0;
        return {
          id: a.id || `acc-${idx}`,
          name: a.name || "Credit Account",
          balance: bal,
          apr: isOverdraft ? 39.9 : a.interestRate ? Number(a.interestRate) : 21.9,
          minimumPayment: Math.max(Math.round(bal * 0.025), 25),
          type: isOverdraft ? "overdraft" : a.type === "Loan" ? "loan" : "credit_card",
        };
      });
    }

    return defaultDebts;
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

  // Strategy comparison
  const comparison = useMemo(() => {
    return compareAvalancheAndSnowball(debts, extraPayment);
  }, [debts, extraPayment]);

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
      {/* 1. Header & Stage Notification */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <FLPHeading as="h2" size="2xl">
            Debt Crusher & Financial Recovery
          </FLPHeading>
          <FLPText color="text.muted" fontSize="md">
            Model mathematically optimal debt clearance, defuse promotional cliffs, and bridge your
            surplus into long-term wealth.
          </FLPText>
        </div>
      </div>

      {/* Adaptive Stage Banner */}
      <div
        className={stageBannerStyle}
        style={{
          backgroundColor:
            stageEval.stage === "stabilize"
              ? "rgba(239, 68, 68, 0.08)"
              : "rgba(16, 185, 129, 0.08)",
          borderColor:
            stageEval.stage === "stabilize" ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {stageEval.stage === "stabilize" ? (
            <FaFire color="#ef4444" size={24} />
          ) : (
            <FaShieldAlt color="#10b981" size={24} />
          )}
          <div>
            <FLPHeading as="h4" size="sm">
              {stageEval.headline}
            </FLPHeading>
            <FLPText color="text.muted" fontSize="xs">
              {stageEval.subline}
            </FLPText>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "full",
              fontSize: "12px",
              fontWeight: "bold",
              backgroundColor: stageEval.stage === "stabilize" ? "#ef4444" : "#10b981",
              color: "white",
            }}
          >
            {stageEval.stage === "stabilize" ? "Stage 1 Active" : "Stage 2/3 Unlocked"}
          </span>
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

      {/* 3. Avalanche vs Snowball Switcher & Extra £50 Slider */}
      <PayoffStrategySwitcher
        budgetSurplus={budgetSurplus}
        comparison={comparison}
        extraPayment={extraPayment}
        selectedStrategy={selectedStrategy}
        onChangeExtraPayment={setExtraPayment}
        onSelectStrategy={setSelectedStrategy}
      />

      {/* 4. The "Redirect Surplus to Wealth" Bridge Chart */}
      <DebtToWealthBridgeCard debts={debts} extraPayment={extraPayment} />

      {/* 5. UK Specific Debt Instruments & Rules */}
      <UkDebtInstrumentsCard />

      {/* 6. Active Debts Management List */}
      <DebtAccountsList
        debts={debts}
        onAddDebt={() => setIsAddModalOpen(true)}
        onDeleteDebt={handleDeleteDebt}
        onUpdateDebt={handleUpdateDebt}
      />

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
