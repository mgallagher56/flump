import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaMagic, FaPiggyBank, FaPlus } from "react-icons/fa";
import { useLoaderData } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import AddSavingsAccountDialog from "~/components/savings/AddSavingsAccountDialog";
import SavingsAccountsList, {
  calculateOneYearCompoundInterest,
} from "~/components/savings/SavingsAccountsList";
import SavingsForecasterCard from "~/components/savings/SavingsForecasterCard";
import SavingsQuickStartWizard from "~/components/savings/SavingsQuickStartWizard";
import SavingsSummaryCards from "~/components/savings/SavingsSummaryCards";
import type { Account } from "~/containers/accounts/types";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.savings";
import { currentMonth, currentYear } from "~/utils/utils";

const containerStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "28px",
  paddingBottom: "64px",
});

const headerContainerStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: "16px",
  borderBottom: "1px solid",
  borderColor: "border",
  paddingBottom: "20px",
});

export const SavingsContainer: FC = () => {
  const { t } = useTranslation();
  const loaderData = useLoaderData<typeof loader>();
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
  const [showWizard, setShowWizard] = useState(false);

  // Filter savings and investment accounts and sync current balances
  const savingsAccounts = useMemo(() => {
    return accounts
      .filter((acc) => acc.type === "Saving" || acc.type === "Investment")
      .map((acc) => {
        const details = accountDetails.filter((d) => (d.account_id || d.accountId) === acc.id);
        const currentDetail = details.find(
          (d) => d.month === currentMonth && d.year === currentYear,
        );
        let balance = 0;
        if (acc.balance !== undefined && acc.balance !== null) {
          balance = Number(acc.balance);
        } else if (currentDetail) {
          balance = Number(currentDetail.value);
        } else if (details.length > 0) {
          balance = Number(details[details.length - 1].value);
        }

        return {
          ...acc,
          balance,
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

  // If user has no savings accounts, prompt the wizard by default
  useEffect(() => {
    if (savingsAccounts.length === 0) {
      setShowWizard(true);
    }
  }, [savingsAccounts.length]);

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
    const defaultRate = Number(profile.savingsDefaultInterestRate) || 5.0;
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

    const monthlyRate = (weightedInterestRate || 5.0) / 100 / 12;
    let b = totalSavingsBalance;
    for (let m = 0; m < 120; m++) {
      b = b * (1 + monthlyRate) + totalMonthlySavings;
    }
    return b;
  }, [savingsAccounts, totalSavingsBalance, weightedInterestRate, totalMonthlySavings]);

  return (
    <div className={containerStyle}>
      {/* Page Header */}
      <div className={headerContainerStyle}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FaPiggyBank style={{ color: "#10b981", fontSize: "28px" }} />
            <FLPHeading as="h2" size="xl">
              Savings & Compound Growth
            </FLPHeading>
          </div>
          <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
            Track balances across savings accounts, plan regular monthly contributions, and forecast
            your wealth with compound interest.
          </FLPText>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FLPButton size="sm" variant="outline" onClick={() => setShowWizard((prev) => !prev)}>
            <FaMagic style={{ marginRight: "6px" }} />
            {showWizard ? "Hide Wizard" : "Guided Setup"}
          </FLPButton>
          <FLPButton size="sm" variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <FaPlus style={{ marginRight: "6px" }} /> Add Account
          </FLPButton>
        </div>
      </div>

      {/* Guided Quick-Start Wizard */}
      {showWizard && (
        <SavingsQuickStartWizard
          onComplete={() => setShowWizard(false)}
          onDismiss={() => setShowWizard(false)}
        />
      )}

      {/* Key Metric Summary Cards */}
      <SavingsSummaryCards
        accountCount={savingsAccounts.length}
        estimatedAnnualInterest={estimatedAnnualInterest}
        monthlyTakeHome={profile.monthlyTakeHome}
        projectedTenYearBalance={projectedTenYearBalance}
        totalMonthlySavings={totalMonthlySavings}
        totalSavingsBalance={totalSavingsBalance}
        weightedInterestRate={weightedInterestRate}
      />

      {/* Accounts List & Management */}
      <SavingsAccountsList
        accounts={savingsAccounts}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {/* Compound Interest Forecaster with Scenarios */}
      <SavingsForecasterCard
        accounts={savingsAccounts}
        monthlyContribution={totalMonthlySavings}
        portfolioInterestRate={weightedInterestRate}
        startingBalance={totalSavingsBalance}
      />

      {/* Modal Dialog for Adding Accounts */}
      <AddSavingsAccountDialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};

export default SavingsContainer;
