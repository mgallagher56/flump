import { PortfolioSnapshot } from "@flump/finance-engine";
import { LiveRegion } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCalculator, FaChartLine } from "react-icons/fa";
import { useLoaderData } from "react-router";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import SavingsForecaster from "~/components/forecast/SavingsForecaster";
import UKTaxCalculator from "~/components/forecast/UKTaxCalculator";
import TaxTrapAlertBanner from "~/components/tax/TaxTrapAlertBanner";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.forecast";
import { useFinancialBaseline } from "~/state/baseline.store";
import { currentMonth, currentYear } from "~/utils/utils";

const ForecastContainer: FC = () => {
  const { t } = useTranslation();
  const { accounts = [], accountDetails = [], userProfile } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState<"forecaster" | "calculator">("forecaster");

  const { profile, setProfile, markChecklistStep } = useUserProfile();
  const { formatCurrency } = useFormatCurrency();
  const { baseline } = useFinancialBaseline();
  const effectiveSalary =
    baseline.annualGrossSalary > 0 ? baseline.annualGrossSalary : Number(profile.annualSalary || 0);

  // Sync profile from loader into atom
  useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
      if (!userProfile.setupChecklistCompletedSteps?.includes("forecast")) {
        markChecklistStep?.("forecast", true)?.catch?.(() => {});
      }
    }
  }, [userProfile, setProfile, markChecklistStep]);

  // Calculate total current savings assets
  const totalAssets = useMemo(() => {
    const snapshot = new PortfolioSnapshot(accounts, accountDetails);
    return snapshot.getTotalLiquidCash() + snapshot.getTotalInvestments();
  }, [accounts, accountDetails]);

  // Estimate average savings rate based on history
  const computedAverageSavingRate = useMemo(() => {
    const monthlyMap: { [key: string]: number } = {};
    accountDetails.forEach((d: any) => {
      const acc = accounts.find((a: any) => a.id === d.account_id);
      if (!acc || !["Current", "Saving", "Investment", "Owed"].includes(acc.type)) return;

      const key = `${d.year}-${d.month.toString().padStart(2, "0")}`;
      monthlyMap[key] = (monthlyMap[key] || 0) + d.value;
    });

    const sortedVals = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map((entry) => entry[1]);

    if (sortedVals.length < 2) return 250; // default

    let diffSum = 0;
    for (let i = 1; i < sortedVals.length; i++) {
      diffSum += sortedVals[i] - sortedVals[i - 1];
    }
    const avg = diffSum / (sortedVals.length - 1);
    return avg > 0 ? Math.round(avg) : 250;
  }, [accounts, accountDetails]);

  // Shared states for calculators
  const [startingBalance, setStartingBalance] = useState<number>(0);
  const [currentSavingRate, setCurrentSavingRate] = useState<number>(0);
  const [hypotheticalSavingRate, setHypotheticalSavingRate] = useState<number>(0);
  const [netSalaryIncrease, setNetSalaryIncrease] = useState<number>(0);

  // Projected 10-Yr estimate (starting balance + contributions compounding at 5% AER)
  const projected10Yr = useMemo(() => {
    let bal = startingBalance;
    for (let yr = 0; yr < 10; yr++) {
      bal = (bal + currentSavingRate * 12) * 1.05;
    }
    return Math.round(bal);
  }, [startingBalance, currentSavingRate]);

  // Pre-populate with user's actual data when loaded
  useEffect(() => {
    setStartingBalance(Math.round(totalAssets));
    setCurrentSavingRate(computedAverageSavingRate);
    setHypotheticalSavingRate(Math.round(computedAverageSavingRate * 1.5) || 500);
  }, [totalAssets, computedAverageSavingRate]);

  const applySalaryIncreaseToSavings = (monthlyIncrease: number) => {
    setNetSalaryIncrease(monthlyIncrease);
    setHypotheticalSavingRate((prev) => prev + Math.round(monthlyIncrease));
    setActiveTab("forecaster"); // Switch back to forecaster to see impact!
  };

  // Styles
  const containerStyle = css({
    paddingBottom: "48px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
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
    marginTop: "8px",
  });

  const segmentedTabStyle = (active: boolean) =>
    css({
      padding: "8px 18px",
      minHeight: "38px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
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

  // Headline outcome only; empty (nothing announced) until a balance or saving rate is known.
  const forecastHeadline =
    startingBalance > 0 || currentSavingRate > 0
      ? `Projected 10-year total ${formatCurrency(projected10Yr)}`
      : "";

  return (
    <div className={containerStyle}>
      {/* announceInitial stays at its default (off): the first headline comes from the load-time
          pre-population effect above, which should not be announced on every page load. The
          headline only starts empty for users with no balance or savings data; for them the first
          user-entered value is a silent baseline and later changes are announced (accepted). */}
      <LiveRegion debounceMs={1000} message={forecastHeadline} visuallyHidden />
      {/* Title */}
      <div style={{ marginTop: "16px", marginBottom: "8px" }}>
        <FLPHeading as="h1" color="text.primary" size="2xl">
          Forecast and tools
        </FLPHeading>
        <FLPText color="text.muted" fontSize="sm">
          Calculate your UK take-home salary and model your future savings potential.
        </FLPText>
      </div>

      {/* 4-KPI Overview Strip (Single horizontal row) */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          gap: "16px",
        })}
      >
        <FLPCard>
          <div style={{ padding: "16px 20px" }}>
            <FLPText
              color="text.muted"
              fontSize="xs"
              fontWeight="semibold"
              textTransform="uppercase"
            >
              Starting Savings Assets
            </FLPText>
            <FLPHeading as="h3" size="xl" className="tabular-nums" style={{ marginTop: "4px" }}>
              {formatCurrency(startingBalance)}
            </FLPHeading>
            <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
              Current liquid cash & investments
            </FLPText>
          </div>
        </FLPCard>

        <FLPCard>
          <div style={{ padding: "16px 20px" }}>
            <FLPText
              color="text.muted"
              fontSize="xs"
              fontWeight="semibold"
              textTransform="uppercase"
            >
              Current Monthly Savings
            </FLPText>
            <FLPHeading
              as="h3"
              size="xl"
              color="success.500"
              className="tabular-nums"
              style={{ marginTop: "4px" }}
            >
              {formatCurrency(currentSavingRate)}/mo
            </FLPHeading>
            <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
              Baseline regular contribution rate
            </FLPText>
          </div>
        </FLPCard>

        <FLPCard>
          <div style={{ padding: "16px 20px" }}>
            <FLPText
              color="text.muted"
              fontSize="xs"
              fontWeight="semibold"
              textTransform="uppercase"
            >
              Hypothetical Target
            </FLPText>
            <FLPHeading
              as="h3"
              size="xl"
              color="blue.500"
              className="tabular-nums"
              style={{ marginTop: "4px" }}
            >
              {formatCurrency(hypotheticalSavingRate)}/mo
            </FLPHeading>
            <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
              Accelerated savings comparison
            </FLPText>
          </div>
        </FLPCard>

        <FLPCard>
          <div style={{ padding: "16px 20px" }}>
            <FLPText
              color="text.muted"
              fontSize="xs"
              fontWeight="semibold"
              textTransform="uppercase"
            >
              Projected 10-Yr Total
            </FLPText>
            <FLPHeading
              as="h3"
              size="xl"
              color="purple.500"
              className="tabular-nums"
              style={{ marginTop: "4px" }}
            >
              {formatCurrency(projected10Yr)}
            </FLPHeading>
            <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
              At 5% annual compound return
            </FLPText>
          </div>
        </FLPCard>
      </div>

      {/* Tabs */}
      <div>
        <div className={segmentedControlStyle}>
          <button
            className={segmentedTabStyle(activeTab === "forecaster")}
            type="button"
            onClick={() => setActiveTab("forecaster")}
          >
            <FaChartLine size={14} />
            Savings forecaster
          </button>
          <button
            className={segmentedTabStyle(activeTab === "calculator")}
            type="button"
            onClick={() => setActiveTab("calculator")}
          >
            <FaCalculator size={14} />
            UK take-home pay calculator
          </button>
        </div>
      </div>

      {/* Contextual £100k-£125k Tax Trap Alert Banner */}
      {effectiveSalary >= 95000 && <TaxTrapAlertBanner grossIncome={effectiveSalary} />}

      {/* Render selected tab */}
      {activeTab === "forecaster" ? (
        <SavingsForecaster
          currentSavingRate={currentSavingRate}
          hypotheticalSavingRate={hypotheticalSavingRate}
          startingBalance={startingBalance}
          onCurrentRateChange={setCurrentSavingRate}
          onHypotheticalRateChange={setHypotheticalSavingRate}
          onStartingBalanceChange={setStartingBalance}
          salaryIncrease={netSalaryIncrease}
          onClearIncrease={() => setNetSalaryIncrease(0)}
        />
      ) : (
        <UKTaxCalculator
          initialSalary={effectiveSalary}
          onApplyIncrease={applySalaryIncreaseToSavings}
        />
      )}
    </div>
  );
};

export default ForecastContainer;
