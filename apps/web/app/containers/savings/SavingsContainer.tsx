import { PortfolioSnapshot } from "@flump/finance-engine";
import { ProjectionNotice } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaPiggyBank, FaPlus } from "react-icons/fa";
import { useLoaderData, useNavigate } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import AddSavingsAccountDialog from "~/components/savings/AddSavingsAccountDialog";
import AnnualAllowancePill from "~/components/savings/AnnualAllowancePill";
import SavingsAccountsList, {
  calculateOneYearCompoundInterest,
} from "~/components/savings/SavingsAccountsList";
import SavingsForecasterCard from "~/components/savings/SavingsForecasterCard";
import SavingsSummaryCards from "~/components/savings/SavingsSummaryCards";
import type { Account } from "~/containers/accounts/types";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.savings";
import { currentMonth, currentYear } from "~/utils/utils";

const containerStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  paddingBottom: "48px",
});

const headerContainerStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "16px",
  marginTop: "16px",
  marginBottom: "8px",
});

const segmentedControlStyle = css({
  display: "inline-flex",
  alignItems: "center",
  backgroundColor: "surface.sunken",
  padding: "4px",
  borderRadius: "xl",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.subtle",
  gap: "4px",
  maxWidth: "100%",
  overflowX: "auto",
  width: "fit-content",
});

const segmentedTabStyle = (active: boolean) =>
  css({
    padding: "8px 18px",
    minHeight: "38px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    whiteSpace: "nowrap",
    fontSize: "sm",
    fontWeight: active ? "semibold" : "medium",
    color: active ? "text.primary" : "text.muted",
    backgroundColor: active ? "surface" : "transparent",
    borderRadius: "lg",
    border: "none",
    cursor: "pointer",
    boxShadow: active ? "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)" : "none",
    transition: "all 0.15s ease",
    _hover: {
      color: "text.primary",
    },
  });

export const SavingsContainer: FC = () => {
  const { t } = useTranslation();
  const loaderData = useLoaderData<any>();
  const accounts: Account[] = loaderData?.accounts || [];
  const accountDetails: any[] = loaderData?.accountDetails || [];
  const userProfile = loaderData?.userProfile;

  const { profile, setProfile, markChecklistStep } = useUserProfile();

  useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile, setProfile]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"forecaster" | "accounts" | "allowance">("forecaster");
  // Monthly extra from the take-home calculator's "apply to forecast" (arrives as ?payRise=), added
  // to real contributions.
  const [payRiseMonthly, setPayRiseMonthly] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Take-home pay moved to its own page (T-IA-3): old #takehome links go there.
    if (window.location.hash === "#takehome") {
      navigate("/app/take-home", { replace: true });
      return;
    }
    const payRise = Number(new URLSearchParams(window.location.search).get("payRise"));
    if (Number.isFinite(payRise) && payRise > 0) setPayRiseMonthly(Math.round(payRise));
  }, [navigate]);
  const savingsAccounts = useMemo(() => {
    const snapshot = new PortfolioSnapshot(accounts, accountDetails);
    return accounts
      .filter((acc) => acc.type === "Saving" || acc.type === "Investment")
      .map((acc) => {
        const resolved = snapshot.getAccount(acc.id);
        return {
          ...acc,
          balance: resolved?.nominalBalance ?? (Number(acc.balance) || 0),
          interestRate:
            acc.interestRate !== undefined && acc.interestRate !== null
              ? Number(acc.interestRate)
              : 0,
          monthlyContribution:
            acc.monthlyContribution !== undefined && acc.monthlyContribution !== null
              ? Number(acc.monthlyContribution)
              : 0,
        };
      });
  }, [accounts, accountDetails]);

  // Mark setup checklist step as completed if accounts exist
  useEffect(() => {
    if (savingsAccounts.length > 0) {
      markChecklistStep("savings", true).catch(() => {});
    }
  }, [savingsAccounts.length, markChecklistStep]);

  // Calculations
  const totalSavingsBalance = useMemo(() => {
    return savingsAccounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
  }, [savingsAccounts]);

  const totalMonthlySavings = useMemo(() => {
    return savingsAccounts.reduce((sum, acc) => sum + (Number(acc.monthlyContribution) || 0), 0);
  }, [savingsAccounts]);

  const weightedInterestRate = useMemo(() => {
    const defaultRate = Number(profile.savingsDefaultInterestRate ?? 0);
    if (totalSavingsBalance <= 0) {
      if (savingsAccounts.length === 0) return defaultRate;
      const sumRates = savingsAccounts.reduce(
        (sum, acc) => sum + (Number(acc.interestRate) || 0),
        0,
      );
      const avg = sumRates / savingsAccounts.length;
      return Number.isFinite(avg) && avg > 0 ? Number(avg) : defaultRate;
    }

    let weightedSum = 0;
    savingsAccounts.forEach((acc) => {
      const bal = Number(acc.balance) || 0;
      const rate = Number(acc.interestRate) || 0;
      weightedSum += bal * rate;
    });

    const calculated = weightedSum / totalSavingsBalance;
    return Number.isFinite(calculated) ? Number(calculated) : defaultRate;
  }, [savingsAccounts, totalSavingsBalance, profile.savingsDefaultInterestRate]);

  const estimatedAnnualInterest = useMemo(() => {
    return savingsAccounts.reduce(
      (sum, acc) =>
        sum +
        calculateOneYearCompoundInterest(
          Number(acc.balance) || 0,
          Number(acc.interestRate) || 0,
          Number(acc.monthlyContribution) || 0,
        ),
      0,
    );
  }, [savingsAccounts]);

  // 10-year projection calculation for summary card (per-account compounding)
  const projectedTenYearBalance = useMemo(() => {
    if (savingsAccounts.length > 0) {
      return savingsAccounts.reduce((total, acc) => {
        let b = Number(acc.balance) || 0;
        const mRate = (Number(acc.interestRate) || 0) / 100 / 12;
        const mCont = Number(acc.monthlyContribution) || 0;
        for (let m = 0; m < 120; m++) {
          b = b * (1 + mRate) + mCont;
        }
        return total + b;
      }, 0);
    }

    const monthlyRate = (weightedInterestRate ?? 0) / 100 / 12;
    let b = totalSavingsBalance;
    for (let m = 0; m < 120; m++) {
      b = b * (1 + monthlyRate) + totalMonthlySavings;
    }
    return b;
  }, [savingsAccounts, totalSavingsBalance, weightedInterestRate, totalMonthlySavings]);

  return (
    <div className={containerStyle}>
      {/* Page Header */}
      <ProjectionNotice />
      <div className={headerContainerStyle}>
        <div>
          <FLPHeading as="h1" color="text.primary" size="2xl">
            Savings and compound growth
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
            Track balances across savings accounts, plan regular monthly contributions, and forecast
            your wealth with compound interest.
          </FLPText>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FLPButton size="sm" variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <FaPlus style={{ marginRight: "6px" }} /> Add account
          </FLPButton>
        </div>
      </div>

      {/* Key Metric Summary Cards (Single 4-column compact row) */}
      <SavingsSummaryCards
        accountCount={savingsAccounts.length}
        estimatedAnnualInterest={estimatedAnnualInterest}
        monthlyTakeHome={profile.monthlyTakeHome}
        projectedTenYearBalance={projectedTenYearBalance}
        totalMonthlySavings={totalMonthlySavings}
        totalSavingsBalance={totalSavingsBalance}
        weightedInterestRate={weightedInterestRate}
      />

      {/* Unified Segmented Workspace Tabs */}
      <div>
        <div className={segmentedControlStyle}>
          <button
            type="button"
            onClick={() => setActiveTab("forecaster")}
            className={segmentedTabStyle(activeTab === "forecaster")}
          >
            Growth Forecaster & Simulator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("accounts")}
            className={segmentedTabStyle(activeTab === "accounts")}
          >
            Savings & Investment Accounts ({savingsAccounts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("allowance")}
            className={segmentedTabStyle(activeTab === "allowance")}
          >
            Annual Allowances & Setup
          </button>
        </div>
      </div>

      {/* Tab 1: Compound Interest Forecaster with Scenarios */}
      <div
        style={
          activeTab === "forecaster"
            ? undefined
            : {
                height: 0,
                overflow: "hidden",
                opacity: 0,
                position: "absolute",
                pointerEvents: "none",
              }
        }
      >
        <SavingsForecasterCard
          accounts={savingsAccounts}
          monthlyContribution={totalMonthlySavings + payRiseMonthly}
          portfolioInterestRate={weightedInterestRate}
          startingBalance={totalSavingsBalance}
        />
      </div>

      {/* Tab 2: Accounts List & Management */}
      <div
        style={
          activeTab === "accounts"
            ? undefined
            : {
                height: 0,
                overflow: "hidden",
                opacity: 0,
                position: "absolute",
                pointerEvents: "none",
              }
        }
      >
        <SavingsAccountsList
          accounts={savingsAccounts}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />
      </div>

      {/* Tab 3: UK Annual ISA Allowance Pill */}
      <div
        style={
          activeTab === "allowance"
            ? { display: "flex", flexDirection: "column", gap: "20px" }
            : {
                height: 0,
                overflow: "hidden",
                opacity: 0,
                position: "absolute",
                pointerEvents: "none",
              }
        }
      >
        {/* UK Annual ISA Allowance Pill */}
        <AnnualAllowancePill
          type="isa"
          currentAmount={totalSavingsBalance}
          savingsInterest={estimatedAnnualInterest}
        />
      </div>

      {/* Modal Dialog for Adding Accounts */}
      <AddSavingsAccountDialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};

export default SavingsContainer;
