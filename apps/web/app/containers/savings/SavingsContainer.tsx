import { PortfolioSnapshot } from "@flump/finance-engine";
import { Button, Icon, PageHeader, ProjectionNotice, SegmentedTabs } from "@repo/ui";
import { Plus } from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";

import type { Account } from "~/containers/accounts/types";
import { AddSavingsAccountDialog } from "~/features/savings/components/AddSavingsAccountDialog";
import { AnnualAllowancePill } from "~/features/savings/components/AnnualAllowancePill";
import { SavingsAccountsList } from "~/features/savings/components/SavingsAccountsList";
import { SavingsForecasterCard } from "~/features/savings/components/SavingsForecasterCard";
import { SavingsSummaryCards } from "~/features/savings/components/SavingsSummaryCards";
import { calculateOneYearCompoundInterest } from "~/features/savings/interest";
import { useUserProfile } from "~/hooks/useUserProfile";
import { pageRoot, tabPanel, tabsRoot } from "./SavingsContainer.styles";

/** Monthly pay rise handed over from Take-home pay as `?payRise=`; 0 when absent or invalid. */
export const parsePayRise = (search: string): number => {
  const value = Number(new URLSearchParams(search).get("payRise"));
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
};

export const SavingsContainer: FC = () => {
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
    const payRise = parsePayRise(window.location.search);
    if (payRise > 0) setPayRiseMonthly(payRise);
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

  const tabItems = [
    { value: "forecaster", label: "Forecast" },
    { value: "accounts", label: `Accounts (${savingsAccounts.length})` },
    { value: "allowance", label: "Allowances" },
  ];

  return (
    <div className={pageRoot()}>
      <ProjectionNotice />
      <PageHeader
        actions={
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Icon icon={Plus} size="sm" />
            Add account
          </Button>
        }
        subtitle="Your balances, what you save each month and where it could get to."
        title="Your savings"
      />

      <SavingsSummaryCards
        accountCount={savingsAccounts.length}
        estimatedAnnualInterest={estimatedAnnualInterest}
        monthlyTakeHome={profile.monthlyTakeHome}
        projectedTenYearBalance={projectedTenYearBalance}
        totalMonthlySavings={totalMonthlySavings}
        totalSavingsBalance={totalSavingsBalance}
        weightedInterestRate={weightedInterestRate}
      />

      <SegmentedTabs
        aria-label="Savings views"
        className={tabsRoot()}
        items={tabItems}
        panelClassName={tabPanel()}
        panels={{
          forecaster: (
            <SavingsForecasterCard
              accounts={savingsAccounts}
              monthlyContribution={totalMonthlySavings + payRiseMonthly}
              portfolioInterestRate={weightedInterestRate}
              startingBalance={totalSavingsBalance}
            />
          ),
          accounts: (
            <SavingsAccountsList
              accounts={savingsAccounts}
              onOpenAddModal={() => setIsAddModalOpen(true)}
            />
          ),
          allowance: (
            <AnnualAllowancePill
              currentAmount={totalSavingsBalance}
              savingsInterest={estimatedAnnualInterest}
              type="isa"
            />
          ),
        }}
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as typeof activeTab)}
      />

      <AddSavingsAccountDialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};

export default SavingsContainer;
